import { describe, expect, it } from "vitest";
import {
  endgamePlanForPolicyV7,
  endgameRouteDistanceV7,
} from "../../src/ai/v7-endgame";
import {
  inspectNormalTacticalFactsV7,
  publicThreatenedTilesForPolicyV7,
} from "../../src/ai/index";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  arePlayersAlliedV7,
  createPlayableGameV7,
  createReplayV7,
  movementStepCost2V7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  queryThreatenedTilesV7,
  reachableMovementPathsV7,
  reachablePlayerMovementPathsV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MovementPathResultV7,
  type TileStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
  type StorageAdapter,
} from "../../src/persistence/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  OWN_UNIT_PASS_THROUGH_TEXT_V7,
  ROAD_MOVEMENT_TEXT_V7,
  technologyEffectGroupsV7,
} from "../../src/render/dom/app-view-v7";
import { PRE_NAVAL_BRANCH_TECHS_V7, checkedV7 } from "../fixtures/v7-builders";
import {
  goblinArenaV7,
  goblinSetupV7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 18 (`pulp_wars-6gd.2`): identity `pulp-wars-poc-7r18`, friendly
// pass-through, and the Road half cost by origin
// (docs/product/RULESET_7_REVISION_18.md sections 2-4, 6, 7, and 9.1).

const at = (x: number, y: number): CoordV7 => ({ x, y });

type TilePatch = Partial<Omit<TileStateV7, "at" | "territoryCityId">>;

interface BandOptions extends GoblinArenaOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly tiles?: readonly (readonly [CoordV7, TilePatch])[];
  /** Tiles each seat has not explored. */
  readonly hidden?: Readonly<Record<number, readonly CoordV7[]>>;
  readonly chests?: readonly CoordV7[];
}

/**
 * The Goblin arena with a neutral, featureless Grass band: rows 0-3 on the
 * two-seat board (capitals (8, 8) and (2, 8)), and rows 11-13 with x <= 8 on
 * the three-seat board. `tiles` patches are applied after the band is
 * cleared, anywhere on the board.
 */
function band(
  pieces: readonly GoblinPieceV7[],
  options: BandOptions = {},
): GameStateV7 {
  const factions = options.factions ?? ["ORIGINAL", "ORIGINAL"];
  // Without Fieldcraft: its Forest march (tuning 4) would lift the Forest
  // stop these revision-18 movement cases are written against.
  const base = goblinArenaV7(factions, pieces, {
    techs: Object.fromEntries(
      factions.map((_, seat) => [
        seat,
        PRE_NAVAL_BRANCH_TECHS_V7.filter((tech) => tech !== "FIELDCRAFT"),
      ]),
    ),
    ...options,
  });
  const water = options.water ?? [];
  const inBand = (where: CoordV7) =>
    factions.length === 2 ? where.y <= 3 : where.y >= 11 && where.x <= 8;
  const patchFor = (where: CoordV7) =>
    (options.tiles ?? []).find(([target]) => sameV7(target, where))?.[1];
  return checkedV7({
    ...base,
    treasureChests: [
      ...base.treasureChests.filter((chest) => !inBand(chest)),
      ...(options.chests ?? []),
    ].sort((left, right) => left.y - right.y || left.x - right.x),
    players: base.players.map((player) => {
      const hidden = options.hidden?.[player.seat] ?? [];
      return {
        ...player,
        explored: player.explored.filter(
          (where) => !hidden.some((target) => sameV7(target, where)),
        ),
      };
    }),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const cleared: TileStateV7 =
          inBand(tile.at) &&
          tile.site === null &&
          !water.some((where) => sameV7(where, tile.at))
            ? {
                ...tile,
                biome: tile.biome ?? "PLAINS",
                terrain: "GRASS",
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile;
        return { ...cleared, ...patchFor(tile.at) };
      }),
    },
  });
}

/** A straight line of tiles `T0 T1 ...` on row 1 from x = 0. */
const line = (index: number): CoordV7 => at(index, 1);
const row = (y: number, from: number, to: number): CoordV7[] =>
  Array.from({ length: to - from + 1 }, (_, index) => at(from + index, y));
const road: TilePatch = { road: true };
const grass: TilePatch = {
  biome: "PLAINS",
  terrain: "GRASS",
  resource: null,
  improvement: null,
  road: false,
  fieldDefense: false,
};
const grassRoad: TilePatch = { ...grass, road: true };

function engine(
  state: GameStateV7,
  mover: CoordV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  return validateMovementPathV7(state, unitAtV7(state, mover), path);
}

function publicly(
  state: GameStateV7,
  mover: CoordV7,
  path: readonly CoordV7[],
): MovementPathResultV7 {
  const unit = unitAtV7(state, mover);
  const view = viewForV7(state, unit.ownerId);
  const publicUnit = view.units.find((item) => item.id === unit.id);
  if (publicUnit === undefined) throw new Error("public unit missing");
  return validatePlayerMovementPathV7(view, publicUnit, path);
}

/** The engine and the owner's public validator agree; returns the summary. */
function both(state: GameStateV7, mover: CoordV7, path: readonly CoordV7[]) {
  const summary = (result: MovementPathResultV7) =>
    result.legal
      ? {
          legal: true as const,
          destination: result.destination,
          spentPoints2: result.spentPoints2,
          stopped: result.stopped,
        }
      : { legal: false as const, reason: result.reason };
  const authoritative = summary(engine(state, mover, path));
  expect(summary(publicly(state, mover, path))).toEqual(authoritative);
  return authoritative;
}

function reach(state: GameStateV7, mover: CoordV7) {
  const unit = unitAtV7(state, mover);
  const view = viewForV7(state, unit.ownerId);
  const publicUnit = view.units.find((item) => item.id === unit.id);
  if (publicUnit === undefined) throw new Error("public unit missing");
  const authoritative = reachableMovementPathsV7(state, unit);
  const published = reachablePlayerMovementPathsV7(view, publicUnit);
  expect(published).toEqual(authoritative);
  return authoritative;
}

function offeredMoves(state: GameStateV7, mover: CoordV7): readonly CoordV7[] {
  const unit = unitAtV7(state, mover);
  return queryPlayerCommandsV7(viewForV7(state, unit.ownerId)).flatMap(
    (command) => {
      const end =
        command.kind === "MOVE" && command.unitId === unit.id
          ? command.path.at(-1)
          : undefined;
      return end === undefined ? [] : [end];
    },
  );
}

function offeredPaths(
  state: GameStateV7,
  mover: CoordV7,
): readonly (readonly CoordV7[])[] {
  const unit = unitAtV7(state, mover);
  return queryPlayerCommandsV7(viewForV7(state, unit.ownerId)).flatMap(
    (command) =>
      command.kind === "MOVE" && command.unitId === unit.id
        ? [command.path]
        : [],
  );
}

/** Event kinds without the achievement bookkeeping of a full-tech arena. */
function kinds(events: readonly DomainEventV7[]): readonly string[] {
  return events
    .map((event) => event.kind)
    .filter((kind) => kind !== "ACHIEVEMENT_UNLOCKED");
}

function preview(state: GameStateV7, attacker: CoordV7, target: CoordV7) {
  const unit = unitAtV7(state, attacker);
  return queryCombatPreviewV7(
    state,
    unit.ownerId,
    unit.id,
    unitAtV7(state, target).id,
  );
}

function apply(state: GameStateV7, mover: CoordV7, command: CommandV7) {
  return applyCommandV7(state, unitAtV7(state, mover).ownerId, command);
}

function move(state: GameStateV7, mover: CoordV7, path: readonly CoordV7[]) {
  const unit = unitAtV7(state, mover);
  const result = applyCommandV7(state, unit.ownerId, {
    kind: "MOVE",
    unitId: unit.id,
    path: [...path],
  });
  if (!result.accepted) throw new Error(`MOVE rejected: ${result.error.code}`);
  const moved = result.state.units.find((item) => item.id === unit.id);
  if (moved === undefined) throw new Error("mover missing");
  return { ...result, unit: moved, unitId: unit.id };
}

const has = (tiles: readonly CoordV7[], where: CoordV7) =>
  tiles.some((tile) => sameV7(tile, where));

const MOVER_BY_MOVE: Readonly<Record<1 | 2 | 3, UnitRoleIdV7>> = {
  1: "FIGHTER",
  2: "RAIDER",
  3: "KNIGHT",
};

describe("ruleset-7 revision-18 identity", () => {
  it("keeps r17 and r18 among the gap-free prior identities after the r50 identity and cleans their keys", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r50");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r50.current");
    expect([...PRIOR_RULESET_7_IDS]).toEqual([
      "pulp-wars-poc-7",
      ...Array.from(
        { length: 48 },
        (_, index) => `pulp-wars-poc-7r${index + 2}`,
      ),
    ]);
    expect(PRIOR_RULESET_7_IDS.at(-33)).toBe("pulp-wars-poc-7r17");
    expect(PRIOR_RULESET_7_IDS.at(-32)).toBe("pulp-wars-poc-7r18");
    expect([...OBSOLETE_SAVE_STORAGE_KEYS_V7]).toEqual([
      "pulpWars.save.v7.current",
      ...Array.from(
        { length: 48 },
        (_, index) => `pulpWars.save.v7r${index + 2}.current`,
      ),
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r16.current", "r16"],
      ["pulpWars.save.v7r17.current", "r17"],
      ["pulpWars.save.v7r18.current", "r18"],
      [SAVE_STORAGE_KEY_V7, "r20"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.artSet.v1", "art"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r16.current",
        "pulpWars.save.v7r17.current",
        "pulpWars.save.v7r18.current",
      ],
      removedCount: 3,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.artSet.v1",
      "pulpWars.unrelated",
    ]);
  });

  it("rejects r17 setups, states, replays, and saves without migration", () => {
    const setup = goblinSetupV7(["GOBLIN", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.rulesetId).toBe("pulp-wars-poc-7r50");
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r17" };
    expect(parseMatchSetupV7(setup)).not.toBeNull();
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: "pulp-wars-poc-7r17",
        setup: oldSetup,
      }),
    ).toBeNull();
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-10-01T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r17",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r17" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
    // `pulp_wars-6gd.3` added the Showcase map type under the same identity
    // (its rules are covered in ruleset-v7-revision18-showcase.test.ts).
    expect(
      parseMatchSetupV7({
        ...setup,
        mapType: "SHOWCASE",
        width: 16,
        height: 16,
      }),
    ).toMatchObject({ mapType: "SHOWCASE", width: 16, height: 16 });
    expect(parseMatchSetupV7({ ...setup, mapType: "SHOWCASE" })).toBeNull();
  });
});

describe("ruleset-7 revision-18 friendly pass-through", () => {
  // A one-tile-wide land corridor on row 1: rows 0 and 2 are water.
  const corridor = [...row(0, 0, 7), ...row(2, 0, 7)];

  it("lets a Move-2 unit pass one own unit and end beyond it, never on it", () => {
    const state = band(
      [
        { seat: 0, role: "RAIDER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      { water: corridor },
    );
    expect(both(state, line(1), [line(2), line(3)])).toEqual({
      legal: true,
      destination: line(3),
      spentPoints2: 4,
      stopped: false,
    });
    expect(both(state, line(1), [line(2)])).toEqual({
      legal: false,
      reason: "OCCUPIED",
    });
    // The enumerations expand through the own unit and never offer its tile.
    expect(reach(state, line(1))).toEqual([
      { destination: line(0), path: [line(0)], spentPoints2: 2 },
      { destination: line(3), path: [line(2), line(3)], spentPoints2: 4 },
    ]);
    expect(offeredMoves(state, line(1))).toEqual([line(0), line(3)]);
    const blocker = unitAtV7(state, line(2));
    const rejected = apply(state, line(1), {
      kind: "MOVE",
      unitId: unitAtV7(state, line(1)).id,
      path: [line(2)],
    });
    expect(rejected).toMatchObject({
      accepted: false,
      state,
      events: [],
      error: { code: "MOVEMENT_ILLEGAL", params: { reason: "OCCUPIED" } },
    });
    const moved = move(state, line(1), [line(2), line(3)]);
    expect(moved.unit).toMatchObject({
      at: line(3),
      activation: { moved: true, movedPathLength: 2 },
    });
    expect(moved.events).toContainEqual({
      kind: "UNIT_MOVED",
      unitId: moved.unitId,
      path: [line(2), line(3)],
    });
    expect(
      moved.events.some((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
    ).toBe(false);
    expect(moved.state.units.find((unit) => unit.id === blocker.id)).toEqual(
      blocker,
    );
  });

  it("keeps a Move-1 unit behind an own unit: the passed tile costs a full step", () => {
    const state = band(
      [
        { seat: 0, role: "FIGHTER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      { water: corridor },
    );
    expect(both(state, line(1), [line(2), line(3)])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(reach(state, line(1)).map((item) => item.destination)).toEqual([
      line(0),
    ]);
  });

  it("blocks on a visible allied unit and on a visible hostile unit as intermediates", () => {
    const factions = ["ORIGINAL", "ORIGINAL", "ORIGINAL"] as const;
    for (const blockerSeat of [2, 0]) {
      const state = band(
        [
          { seat: 1, role: "RAIDER", at: at(1, 12) },
          { seat: blockerSeat, role: "FIGHTER", at: at(2, 12) },
        ],
        { factions, aiMode: "COOPERATIVE", activeSeat: 1 },
      );
      expect(
        arePlayersAlliedV7(
          state,
          seatIdV7(state, 1),
          seatIdV7(state, blockerSeat),
        ),
      ).toBe(blockerSeat === 2);
      for (const path of [[at(2, 12), at(3, 12)], [at(2, 12)]])
        expect(both(state, at(1, 12), path)).toEqual({
          legal: false,
          reason: "OCCUPIED",
        });
      expect(has(offeredMoves(state, at(1, 12)), at(2, 12))).toBe(false);
    }
  });

  it("cannot pass an own unit on a tile where the Move would stop", () => {
    // Roadless Forest and Mountain.
    for (const [terrain, reason] of [
      ["FOREST", "FOREST_STOPS_MOVE"],
      ["MOUNTAIN", "MOUNTAIN_STOPS_MOVE"],
    ] as const) {
      const state = band(
        [
          { seat: 0, role: "KNIGHT", at: line(1) },
          { seat: 0, role: "FIGHTER", at: line(2) },
        ],
        { water: corridor, tiles: [[line(2), { terrain }]] },
      );
      expect(both(state, line(1), [line(2), line(3)])).toEqual({
        legal: false,
        reason,
      });
      expect(reach(state, line(1)).map((item) => item.destination)).toEqual([
        line(0),
      ]);
    }
    // Visible hostile zone of control on the own-occupied tile.
    const zoc = band([
      { seat: 0, role: "KNIGHT", at: line(1) },
      { seat: 0, role: "FIGHTER", at: line(2) },
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
    ]);
    expect(both(zoc, line(1), [line(2), at(3, 0)])).toEqual({
      legal: false,
      reason: "ZOC_STOPS_MOVE",
    });
    expect(offeredPaths(zoc, line(1)).length).toBeGreaterThan(0);
    expect(offeredPaths(zoc, line(1)).some((path) => has(path, line(2)))).toBe(
      false,
    );
    // An unexplored own-occupied tile ends the Move too.
    const unexplored = band(
      [
        { seat: 0, role: "KNIGHT", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(3) },
      ],
      { hidden: { 0: [line(2)] } },
    );
    expect(both(unexplored, line(1), [line(2), line(3)])).toEqual({
      legal: false,
      reason: "UNEXPLORED_INTERMEDIATE",
    });
  });

  it("passes an own unit in a Forest with Fieldcraft freedom or on a Road edge", () => {
    const fieldcraft = band(
      [
        { seat: 0, role: "RAIDER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      {
        water: corridor,
        tiles: [[line(2), { terrain: "FOREST" }]],
        techs: { 0: TECHNOLOGY_IDS_V7 },
      },
    );
    expect(both(fieldcraft, line(1), [line(2), line(3)])).toEqual({
      legal: true,
      destination: line(3),
      spentPoints2: 4,
      stopped: false,
    });
    const withoutFieldcraft = band(
      [
        { seat: 0, role: "RAIDER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      {
        water: corridor,
        tiles: [[line(2), { terrain: "FOREST" }]],
        techs: { 0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "FIELDCRAFT") },
      },
    );
    expect(both(withoutFieldcraft, line(1), [line(2), line(3)])).toEqual({
      legal: false,
      reason: "FOREST_STOPS_MOVE",
    });
    for (const terrain of ["FOREST", "MOUNTAIN"] as const) {
      const roadEdge = band(
        [
          { seat: 0, role: "KNIGHT", at: line(1) },
          { seat: 0, role: "FIGHTER", at: line(2) },
        ],
        {
          water: corridor,
          tiles: [
            [line(1), road],
            [line(2), { terrain, road: true }],
          ],
        },
      );
      expect(both(roadEdge, line(1), [line(2), line(3), line(4)])).toEqual({
        legal: true,
        destination: line(4),
        spentPoints2: 4,
        stopped: false,
      });
      expect(has(offeredMoves(roadEdge, line(1)), line(2))).toBe(false);
    }
  });

  it("passes an own boat at sea and an own embarked unit", () => {
    const water = row(1, 0, 5);
    const naval = band(
      [
        { seat: 0, role: "PATROL_BOAT", at: line(1), form: "NAVAL" },
        { seat: 0, role: "BATTLESHIP", at: line(2), form: "NAVAL" },
      ],
      { water },
    );
    expect(both(naval, line(1), [line(2), line(3)])).toEqual({
      legal: true,
      destination: line(3),
      spentPoints2: 4,
      stopped: false,
    });
    expect(both(naval, line(1), [line(2)])).toEqual({
      legal: false,
      reason: "OCCUPIED",
    });
    expect(reach(naval, line(1)).map((item) => item.destination)).toEqual([
      line(0),
      line(3),
    ]);
    const embarked = band(
      [
        { seat: 0, role: "FIGHTER", at: line(1), form: "EMBARKED" },
        { seat: 0, role: "CATAPULT", at: line(2), form: "EMBARKED" },
      ],
      { water },
    );
    expect(both(embarked, line(1), [line(2), line(3)])).toEqual({
      legal: true,
      destination: line(3),
      spentPoints2: 4,
      stopped: false,
    });
    const moved = move(embarked, line(1), [line(2), line(3)]);
    expect(moved.unit).toMatchObject({
      at: line(3),
      form: "EMBARKED",
      activation: { moved: true, movedPathLength: 2 },
    });
    // A hostile boat still blocks.
    const hostile = band(
      [
        { seat: 0, role: "PATROL_BOAT", at: line(1), form: "NAVAL" },
        { seat: 1, role: "PATROL_BOAT", at: line(2), form: "NAVAL" },
      ],
      { water },
    );
    expect(both(hostile, line(1), [line(2), line(3)])).toEqual({
      legal: false,
      reason: "OCCUPIED",
    });
  });

  it("passes a land unit through its own garrisoned city center without touching the city", () => {
    const state = band([
      { seat: 0, role: "RAIDER", at: at(7, 8) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
    ]);
    // The step leaving the own city center costs half (section 4.1).
    expect(both(state, at(7, 8), [at(8, 8), at(9, 8)])).toEqual({
      legal: true,
      destination: at(9, 8),
      spentPoints2: 3,
      stopped: false,
    });
    const moved = move(state, at(7, 8), [at(8, 8), at(9, 8)]);
    expect(moved.state.cities).toEqual(state.cities);
    expect(kinds(moved.events)).toEqual(["UNIT_MOVED"]);
  });

  it("lets the Raider's escape Move pass an own unit", () => {
    const state = band(
      [
        {
          seat: 0,
          role: "RAIDER",
          at: line(1),
          activation: {
            moved: true,
            movedPathLength: 1,
            attacked: true,
            attacksUsed: 1,
            escapeAvailable: true,
          },
        },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      { water: corridor },
    );
    expect(offeredMoves(state, line(1))).toEqual([line(0), line(3)]);
    const moved = move(state, line(1), [line(2), line(3)]);
    expect(moved.unit).toMatchObject({
      at: line(3),
      activation: { escapeAvailable: false, handled: true },
    });
  });
});

describe("ruleset-7 revision-18 pass-through interactions", () => {
  function portState(pieces: readonly GoblinPieceV7[]): GameStateV7 {
    const dock = at(9, 8);
    const base = band(pieces, { water: [dock] });
    const built = applyCommandV7(base, seatIdV7(base, 0), {
      kind: "BUILD_PORT",
      at: dock,
    });
    if (!built.accepted) throw new Error(`port rejected: ${built.error.code}`);
    return built.state;
  }

  it("rejects embarking onto a dock that holds an own unit", () => {
    const dock = at(9, 8);
    const free = portState([{ seat: 0, role: "FIGHTER", at: at(8, 8) }]);
    expect(both(free, at(8, 8), [dock])).toMatchObject({
      legal: true,
      destination: dock,
    });
    expect(has(offeredMoves(free, at(8, 8)), dock)).toBe(true);
    const held = portState([
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 0, role: "PATROL_BOAT", at: dock, form: "NAVAL" },
    ]);
    expect(both(held, at(8, 8), [dock])).toEqual({
      legal: false,
      reason: "OCCUPIED",
    });
    expect(has(offeredMoves(held, at(8, 8)), dock)).toBe(false);
    expect(
      apply(held, at(8, 8), {
        kind: "MOVE",
        unitId: unitAtV7(held, at(8, 8)).id,
        path: [dock],
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "MOVEMENT_ILLEGAL", params: { reason: "OCCUPIED" } },
    });
  });

  it("leaves DISEMBARK offers unchanged by an own unit on the adjacent water cell", () => {
    const water = row(1, 0, 4);
    const landings = (state: GameStateV7) =>
      queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, 0))).filter(
        (command) => command.kind === "DISEMBARK",
      );
    const alone = band(
      [{ seat: 0, role: "FIGHTER", at: line(1), form: "EMBARKED" }],
      { water },
    );
    const escorted = band(
      [
        { seat: 0, role: "FIGHTER", at: line(1), form: "EMBARKED" },
        { seat: 0, role: "PATROL_BOAT", at: line(2), form: "NAVAL" },
      ],
      { water },
    );
    expect(landings(alone).length).toBeGreaterThan(0);
    expect(landings(escorted)).toEqual(landings(alone));
    // The transport may sail past the boat but not stop on it.
    expect(offeredMoves(alone, line(1))).toEqual([line(0), line(2), line(3)]);
    expect(offeredMoves(escorted, line(1))).toEqual([line(0), line(3)]);
  });

  it("keeps Push and the advance on an empty cell only", () => {
    // The Fighter on (4, 0) only keeps (3, 1) under the attacker's detection.
    const pushed = (state: GameStateV7) => {
      const result = apply(state, line(1), {
        kind: "ATTACK",
        unitId: unitAtV7(state, line(1)).id,
        targetUnitId: unitAtV7(state, line(2)).id,
      });
      if (!result.accepted) throw new Error(result.error.code);
      return result.events.some((event) => event.kind === "UNIT_PUSHED");
    };
    for (const behindSeat of [0, 1]) {
      const state = band([
        { seat: 0, role: "JUGGERNAUT", at: line(1) },
        { seat: 1, role: "GUARD", at: line(2) },
        { seat: behindSeat, role: "FIGHTER", at: line(3) },
        { seat: 0, role: "FIGHTER", at: at(4, 0) },
      ]);
      expect(preview(state, line(1), line(2))?.push).toBe("BLOCKED");
      expect(pushed(state)).toBe(false);
    }
    const open = band([
      { seat: 0, role: "JUGGERNAUT", at: line(1) },
      { seat: 1, role: "GUARD", at: line(2) },
      { seat: 0, role: "FIGHTER", at: at(4, 0) },
    ]);
    expect(preview(open, line(1), line(2))?.push).toBe("WILL_PUSH");
    expect(pushed(open)).toBe(true);
    // An advance enters the cell the dead defender left; it is not a Move.
    const kill = band([
      { seat: 0, role: "KNIGHT", at: line(1) },
      { seat: 1, role: "FIGHTER", at: line(2), hp: 1 },
      { seat: 0, role: "FIGHTER", at: line(3) },
    ]);
    const knight = unitAtV7(kill, line(1));
    const result = apply(kill, line(1), {
      kind: "ATTACK",
      unitId: knight.id,
      targetUnitId: unitAtV7(kill, line(2)).id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.state.units.find((unit) => unit.id === knight.id)?.at,
    ).toEqual(line(2));
    expect(unitAtV7(result.state, line(3)).role).toBe("FIGHTER");
  });

  it("leaves treasure and hostile Field Defense on a passed tile untouched", () => {
    const chest = band([{ seat: 0, role: "RAIDER", at: line(1) }], {
      chests: [line(2)],
    });
    const overChest = move(chest, line(1), [line(2), line(3)]);
    expect(overChest.state.treasureChests).toEqual(chest.treasureChests);
    expect(kinds(overChest.events)).toEqual(["UNIT_MOVED"]);
    // (1, 7) is in seat 1's capital territory and holds an own Fighter.
    const defended = band(
      [
        { seat: 0, role: "RAIDER", at: at(0, 7) },
        { seat: 0, role: "FIGHTER", at: at(1, 7) },
      ],
      {
        tiles: [
          [at(0, 7), grass],
          [at(1, 7), { ...grass, fieldDefense: true }],
          [at(2, 7), grass],
        ],
      },
    );
    const overDefense = move(defended, at(0, 7), [at(1, 7), at(2, 7)]);
    expect(overDefense.unit.at).toEqual(at(2, 7));
    expect(
      overDefense.state.board.tiles.find((tile) => sameV7(tile.at, at(1, 7)))
        ?.fieldDefense,
    ).toBe(true);
    expect(
      overDefense.events.some(
        (event) => event.kind === "FIELD_DEFENSE_DESTROYED",
      ),
    ).toBe(false);
  });

  it("counts a passed cell toward Charge", () => {
    const state = band(
      [
        { seat: 0, role: "RAIDER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
        { seat: 1, role: "FIGHTER", at: line(4) },
      ],
      { water: [...row(0, 0, 7), ...row(2, 0, 7)] },
    );
    const moved = move(state, line(1), [line(2), line(3)]);
    expect(moved.unit.activation.movedPathLength).toBe(2);
    expect(preview(moved.state, line(3), line(4))?.chargeApplied).toBe(true);
    // The same Raider after a one-cell Move has no Charge.
    const short = band(
      [
        { seat: 0, role: "RAIDER", at: line(2) },
        { seat: 1, role: "FIGHTER", at: line(4) },
      ],
      { water: [...row(0, 0, 7), ...row(2, 0, 7)] },
    );
    const stepped = move(short, line(2), [line(3)]);
    expect(preview(stepped.state, line(3), line(4))?.chargeApplied).toBe(false);
  });
});

describe("ruleset-7 revision-18 interrupted moves", () => {
  // Column 3 is unexplored by the mover's owner before the command.
  const column = (y: number) => [at(3, y - 1), at(3, y), at(3, y + 1)];

  interface Case {
    readonly name: string;
    readonly reason: "OCCUPIED" | "ENGINEERING_REQUIRED" | "ZOC";
    /** Builds the state for a mover of `role` on row tile `start`. */
    readonly build: (role: UnitRoleIdV7, start: number) => GameStateV7;
    readonly y: number;
    /** The last path step (the path is start + 1 ... 2, then this). */
    readonly last: CoordV7;
    readonly interruptedAt: CoordV7;
  }
  const cases: readonly Case[] = [
    {
      name: "a hidden unit on the next step (OCCUPIED)",
      reason: "OCCUPIED",
      y: 12,
      last: at(3, 12),
      interruptedAt: at(3, 12),
      // A hidden allied unit projects no zone of control.
      build: (role, start) =>
        band(
          [
            { seat: 1, role, at: at(start, 12) },
            { seat: 1, role: "FIGHTER", at: at(2, 12) },
            { seat: 2, role: "FIGHTER", at: at(3, 12) },
          ],
          {
            factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL"],
            aiMode: "COOPERATIVE",
            activeSeat: 1,
            hidden: { 1: column(12) },
          },
        ),
    },
    {
      name: "unexplored impassable terrain on the next step (ENGINEERING_REQUIRED)",
      reason: "ENGINEERING_REQUIRED",
      y: 1,
      last: at(3, 1),
      interruptedAt: at(3, 1),
      build: (role, start) =>
        band(
          [
            { seat: 0, role, at: at(start, 1) },
            { seat: 0, role: "FIGHTER", at: at(2, 1) },
          ],
          { water: [at(3, 1)], hidden: { 0: column(1) } },
        ),
    },
    {
      name: "hostile zone of control first seen from the passed tile (ZOC)",
      reason: "ZOC",
      y: 1,
      last: at(3, 0),
      interruptedAt: at(2, 1),
      build: (role, start) =>
        band(
          [
            { seat: 0, role, at: at(start, 1) },
            { seat: 0, role: "FIGHTER", at: at(2, 1) },
            { seat: 1, role: "FIGHTER", at: at(3, 2) },
          ],
          { hidden: { 0: column(1) } },
        ),
    },
  ];

  for (const item of cases) {
    it(`falls back to the last free tile after ${item.name}`, () => {
      // A Knight enters a free tile, then the own-occupied tile.
      const state = item.build("KNIGHT", 0);
      const start = at(0, item.y);
      const free = at(1, item.y);
      const own = at(2, item.y);
      const owner = unitAtV7(state, start).ownerId;
      const before = state.players.find((player) => player.id === owner);
      for (const where of column(item.y))
        expect(has(before?.explored ?? [], where)).toBe(false);
      const moved = move(state, start, [free, own, item.last]);
      expect(moved.unit).toMatchObject({
        at: free,
        activation: { moved: true, movedPathLength: 1 },
      });
      expect(
        moved.events.filter(
          (event) =>
            event.kind === "UNIT_MOVED" ||
            event.kind === "UNIT_MOVE_INTERRUPTED",
        ),
      ).toEqual([
        { kind: "UNIT_MOVED", unitId: moved.unitId, path: [free] },
        {
          kind: "UNIT_MOVE_INTERRUPTED",
          unitId: moved.unitId,
          at: item.interruptedAt,
          reason: item.reason,
        },
      ]);
      // Sight from the passed tile is kept although the mover fell back.
      const after = moved.state.players.find((player) => player.id === owner);
      for (const where of column(item.y))
        expect(has(after?.explored ?? [], where)).toBe(true);
      expect(moved.events).toContainEqual({
        kind: "TILES_REVEALED",
        playerId: owner,
        tiles: column(item.y),
      });
      // The own unit that was passed has not moved.
      expect(unitAtV7(moved.state, own).role).toBe("FIGHTER");
      expect(
        moved.state.units.filter((unit) => sameV7(unit.at, own)),
      ).toHaveLength(1);
    });

    it(`falls back to the starting tile after ${item.name}`, () => {
      // A Raider starts next to the own-occupied tile: no free tile entered
      // (a Knight for the zone of control, which a Human Raider ignores
      // since tuning 4).
      const state = item.build(item.reason === "ZOC" ? "KNIGHT" : "RAIDER", 1);
      const start = at(1, item.y);
      const own = at(2, item.y);
      const owner = unitAtV7(state, start).ownerId;
      const moved = move(state, start, [own, item.last]);
      expect(moved.unit).toMatchObject({
        at: start,
        activation: { moved: true, movedPathLength: 0 },
      });
      expect(moved.events.some((event) => event.kind === "UNIT_MOVED")).toBe(
        false,
      );
      expect(moved.events).toContainEqual({
        kind: "UNIT_MOVE_INTERRUPTED",
        unitId: moved.unitId,
        at: item.interruptedAt,
        reason: item.reason,
      });
      const after = moved.state.players.find((player) => player.id === owner);
      for (const where of column(item.y))
        expect(has(after?.explored ?? [], where)).toBe(true);
      expect(
        moved.state.units.filter((unit) => sameV7(unit.at, own)),
      ).toHaveLength(1);
      // The unit has moved: it is offered no second Move.
      expect(offeredMoves(moved.state, start)).toEqual([]);
    });
  }
});

describe("ruleset-7 revision-18 Road cost by origin", () => {
  /** `R` is a usable neutral Road tile, `-` open Grass, from T0 on row 1. */
  function lineState(
    move: 1 | 2 | 3,
    pattern: string,
    options: BandOptions = {},
  ): GameStateV7 {
    return band([{ seat: 0, role: MOVER_BY_MOVE[move], at: line(0) }], {
      ...options,
      tiles: [...pattern].flatMap((symbol, index) =>
        symbol === "R" ? [[line(index), road] as const] : [],
      ),
    });
  }

  it.each([
    [1, "RR-", 2, [1, 1]],
    [1, "R--", 1, [1]],
    [1, "-RR", 1, [2]],
    [1, "RRR-", 2, [1, 1]],
    [2, "RR---", 3, [1, 1, 2]],
    [2, "R---", 2, [1, 2]],
    [2, "-RR--", 3, [2, 1, 1]],
    [2, "RRRR--", 4, [1, 1, 1, 1]],
    [3, "RR----", 4, [1, 1, 2, 2]],
    [3, "RRRRRR--", 6, [1, 1, 1, 1, 1, 1]],
  ] as const)(
    "Move %i on %s reaches T%i (section 4.3)",
    (budget, pattern, farthest, costs) => {
      const state = lineState(budget, pattern);
      const player = state.players.find(
        (item) => item.id === seatIdV7(state, 0),
      );
      if (player === undefined) throw new Error("player missing");
      costs.forEach((cost, index) =>
        expect(
          movementStepCost2V7(state, player, line(index), line(index + 1)),
        ).toBe(cost),
      );
      const path = row(1, 1, farthest);
      expect(both(state, line(0), path)).toEqual({
        legal: true,
        destination: line(farthest),
        spentPoints2: costs.reduce((sum: number, cost) => sum + cost, 0),
        stopped: false,
      });
      expect(both(state, line(0), [...path, line(farthest + 1)])).toEqual({
        legal: false,
        reason: "BUDGET_EXCEEDED",
      });
      const reached = reach(state, line(0));
      expect(Math.max(...reached.map((item) => item.destination.x))).toBe(
        farthest,
      );
      expect(has(offeredMoves(state, line(0)), line(farthest))).toBe(true);
    },
  );

  it("charges 2 to enter a Road tile from a roadless tile and to leave water", () => {
    const state = lineState(1, "-RR");
    expect(both(state, line(0), [line(1), line(2)])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    const boat = band(
      [{ seat: 0, role: "PATROL_BOAT", at: line(0), form: "NAVAL" }],
      { water: row(1, 0, 4) },
    );
    expect(both(boat, line(0), [line(1), line(2)])).toMatchObject({
      legal: true,
      spentPoints2: 4,
    });
    expect(both(boat, line(0), [line(1), line(2), line(3)])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
  });

  it("charges 2 on another player's Road and without the Roads technology", () => {
    // (1, 7) and (2, 7) lie in seat 1's capital territory.
    const foreign = band(
      [
        { seat: 0, role: "FIGHTER", at: at(1, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 9) },
      ],
      {
        tiles: [
          [at(1, 7), grassRoad],
          [at(2, 7), grassRoad],
          [at(3, 7), grass],
          [at(1, 9), grassRoad],
          [at(0, 9), grass],
          [at(0, 10), grass],
        ],
      },
    );
    const players = (seat: number) => {
      const found = foreign.players.find((item) => item.seat === seat);
      if (found === undefined) throw new Error("player missing");
      return found;
    };
    expect(movementStepCost2V7(foreign, players(0), at(1, 7), at(2, 7))).toBe(
      2,
    );
    expect(movementStepCost2V7(foreign, players(1), at(1, 7), at(2, 7))).toBe(
      1,
    );
    expect(both(foreign, at(1, 7), [at(2, 7), at(3, 7)])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    // The territory owner leaves its own Road tile at half cost.
    expect(both(foreign, at(1, 9), [at(0, 9), at(0, 10)])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(both(foreign, at(1, 9), [at(0, 9)])).toMatchObject({
      legal: true,
      spentPoints2: 1,
    });
    const noRoads = lineState(1, "RR-", {
      techs: { 0: [] },
    });
    const player = noRoads.players.find((item) => item.seat === 0);
    if (player === undefined) throw new Error("player missing");
    expect(movementStepCost2V7(noRoads, player, line(0), line(1))).toBe(2);
    expect(both(noRoads, line(0), [line(1), line(2)])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(both(noRoads, line(0), [line(1)])).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
  });

  it("stops on a roadless Forest after a Road tile and not on a Road Forest", () => {
    for (const terrain of ["FOREST", "MOUNTAIN"] as const) {
      const roadless = band([{ seat: 0, role: "KNIGHT", at: line(0) }], {
        tiles: [
          [line(0), road],
          [line(1), { terrain }],
        ],
      });
      expect(both(roadless, line(0), [line(1)])).toEqual({
        legal: true,
        destination: line(1),
        spentPoints2: 1,
        stopped: true,
      });
      expect(both(roadless, line(0), [line(1), line(2)])).toEqual({
        legal: false,
        reason:
          terrain === "FOREST" ? "FOREST_STOPS_MOVE" : "MOUNTAIN_STOPS_MOVE",
      });
      const paved = band([{ seat: 0, role: "KNIGHT", at: line(0) }], {
        tiles: [
          [line(0), road],
          [line(1), { terrain, road: true }],
        ],
      });
      expect(both(paved, line(0), [line(1), line(2)])).toEqual({
        legal: true,
        destination: line(2),
        spentPoints2: 2,
        stopped: false,
      });
    }
  });

  it("embarks in one Move from a Road tile through the own city center (1 + 1)", () => {
    const dock = at(9, 8);
    const base = band([{ seat: 0, role: "FIGHTER", at: at(7, 8) }], {
      water: [dock],
      tiles: [[at(7, 8), road]],
    });
    const built = applyCommandV7(base, seatIdV7(base, 0), {
      kind: "BUILD_PORT",
      at: dock,
    });
    if (!built.accepted) throw new Error(built.error.code);
    const state = built.state;
    expect(both(state, at(7, 8), [at(8, 8), dock])).toMatchObject({
      legal: true,
      destination: dock,
      spentPoints2: 2,
    });
    const moved = move(state, at(7, 8), [at(8, 8), dock]);
    expect(moved.unit).toMatchObject({ at: dock, form: "EMBARKED" });
    expect(moved.events.map((event) => event.kind)).toContain("UNIT_EMBARKED");
    // Without the Road under the unit the same Move costs 2 + 1.
    const roadless = applyCommandV7(
      band([{ seat: 0, role: "FIGHTER", at: at(7, 8) }], { water: [dock] }),
      seatIdV7(base, 0),
      { kind: "BUILD_PORT", at: dock },
    );
    if (!roadless.accepted) throw new Error(roadless.error.code);
    expect(both(roadless.state, at(7, 8), [at(8, 8), dock])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
  });

  it("enters an unexplored tile from a Road tile at half cost", () => {
    // T1 is still unexplored when the unit steps onto it: the Move ends.
    const next = lineState(1, "R-", {
      hidden: { 0: [at(1, 0), at(1, 1), at(1, 2)] },
    });
    expect(both(next, line(0), [line(1)])).toEqual({
      legal: true,
      destination: line(1),
      spentPoints2: 1,
      stopped: true,
    });
    expect(both(next, line(0), [line(1), line(2)])).toEqual({
      legal: false,
      reason: "UNEXPLORED_INTERMEDIATE",
    });
    // T2 is unexplored before the command (revision 17 charged 2 for it).
    const state = lineState(1, "RR-", {
      hidden: { 0: [at(2, 0), at(2, 1), at(2, 2)] },
    });
    for (const result of [
      engine(state, line(0), [line(1), line(2)]),
      publicly(state, line(0), [line(1), line(2)]),
    ])
      expect(result).toMatchObject({
        legal: true,
        destination: line(2),
        spentPoints2: 2,
      });
    expect(has(offeredMoves(state, line(0)), line(2))).toBe(true);
    const moved = move(state, line(0), [line(1), line(2)]);
    expect(moved.unit.at).toEqual(line(2));
  });
});

describe("ruleset-7 revision-18 public and engine parity", () => {
  const totals = { passThroughMoves: 0, roadOriginMoves: 0, conservative: 0 };
  it.each([
    // Tuning 6 (`pulp_wars-w49.6`): the Normal AI of these three factions
    // researches toward its army first, so Roads come late and none of the
    // three matches had a step off a Road within 26 rounds; the Human
    // Pangea match is seed 7 (seed 0 before), which has ten (of seeds 0-9
    // the only one).
    { factions: ["ORIGINAL", "ORIGINAL"], mapType: "PANGEA", seed: 7 },
    { factions: ["UNDEAD", "GOBLIN"], mapType: "CONTINENTS", seed: 5 },
    { factions: ["GOBLIN", "ORIGINAL"], mapType: "LAKES", seed: 8 },
  ] as const)(
    "offers exactly the engine's moves in sampled $factions $mapType states",
    ({ factions, mapType, seed }) => {
      const setup: MatchSetupV7 = {
        ...goblinSetupV7([...factions], seed),
        mapType,
      };
      const match = runAiMatchV7(setup, {
        maxRounds: 26,
        recordCheckpointHashes: false,
      });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      let state = created.state;
      let sampled = 0;
      let conservative = 0;
      let passThroughMoves = 0;
      let roadOriginMoves = 0;
      match.commandLog.forEach((record, index) => {
        if (record.command.kind === "MOVE") {
          const command = record.command;
          const mover = state.units.find((unit) => unit.id === command.unitId);
          if (mover === undefined) throw new Error("mover missing");
          if (
            command.path
              .slice(0, -1)
              .some((step) =>
                state.units.some(
                  (unit) =>
                    unit.ownerId === mover.ownerId && sameV7(unit.at, step),
                ),
              )
          )
            passThroughMoves += 1;
          const owner = state.players.find(
            (player) => player.id === mover.ownerId,
          );
          if (owner === undefined) throw new Error("owner missing");
          // A half-cost step onto a tile that is not a usable Road node.
          const before = state;
          command.path.forEach((step, stepIndex) => {
            const from = command.path[stepIndex - 1] ?? mover.at;
            if (
              movementStepCost2V7(before, owner, from, step) === 1 &&
              movementStepCost2V7(before, owner, step, from) === 2
            )
              roadOriginMoves += 1;
          });
        }
        if (index % 4 === 0) {
          const actor = state.turnOrder[state.activeSeatIndex];
          if (actor === undefined) throw new Error("actor missing");
          const view = viewForV7(state, actor);
          for (const unit of state.units.filter(
            (item) => item.ownerId === actor,
          )) {
            const publicUnit = view.units.find((item) => item.id === unit.id);
            if (publicUnit === undefined) throw new Error("unit missing");
            const authoritative = reachableMovementPathsV7(state, unit);
            const published = reachablePlayerMovementPathsV7(view, publicUnit);
            // A public path into unexplored ground may be interrupted by a
            // fact the owner cannot see; every other one is the engine's.
            const uninterrupted = published.filter((item) => {
              const result = validateMovementPathV7(state, unit, item.path);
              expect(result.legal).toBe(true);
              return (
                result.legal &&
                result.interruption === null &&
                result.traversedPath.length === item.path.length
              );
            });
            const engineByKey = new Map(
              authoritative.map((item) => [
                `${item.destination.y},${item.destination.x}`,
                item,
              ]),
            );
            for (const item of uninterrupted)
              expect(
                engineByKey.get(`${item.destination.y},${item.destination.x}`)
                  ?.spentPoints2,
              ).toBe(item.spentPoints2);
            // The engine reaches further only where the public rule must be
            // conservative: a tile unexplored before the Move, or zone of
            // control the owner cannot rule out (a hostile boat's reach into
            // Deep Water depends on its owner's hidden technology).
            for (const item of authoritative) {
              if (
                uninterrupted.some((other) =>
                  sameV7(other.destination, item.destination),
                )
              )
                continue;
              // The public rule may publish this destination by another path
              // of the same cost that a unit the owner cannot see interrupts
              // (zone of control); the engine's own path is then legal by
              // the public rule too. Seen on the village-density Lakes board
              // of seed 8 (`pulp_wars-ykw.2`): a Scrap Buggy reaches (7, 3)
              // by (6, 4), and the published path by (6, 2) stops there.
              if (
                published.some((other) =>
                  sameV7(other.destination, item.destination),
                )
              ) {
                conservative += 1;
                continue;
              }
              const result = validatePlayerMovementPathV7(
                view,
                publicUnit,
                item.path,
              );
              expect(result.legal).toBe(false);
              expect(["ZOC_STOPS_MOVE", "UNEXPLORED_INTERMEDIATE"]).toContain(
                result.legal ? null : result.reason,
              );
              conservative += 1;
            }
            // No destination holds a unit the owner can see.
            for (const item of published)
              expect(
                view.units.some((other) => sameV7(other.at, item.destination)),
              ).toBe(false);
          }
          for (const command of queryPlayerCommandsV7(view))
            if (command.kind === "MOVE")
              expect(applyCommandV7(state, actor, command).accepted).toBe(true);
          sampled += 1;
        }
        const result = applyCommandV7(state, record.playerId, record.command);
        if (!result.accepted) throw new Error("replay rejected");
        state = result.state;
      });
      expect(sampled).toBeGreaterThan(20);
      totals.passThroughMoves += passThroughMoves;
      totals.roadOriginMoves += roadOriginMoves;
      totals.conservative += conservative;
    },
    600_000,
  );

  it("sees the Normal AI use both rules in those matches", () => {
    // The Normal AI moves only through offered commands, so it passes its
    // own units and takes half-cost steps onto roadless tiles.
    expect(totals.passThroughMoves).toBeGreaterThan(0);
    expect(totals.roadOriginMoves).toBeGreaterThan(0);
  });
});

describe("ruleset-7 revision-18 Normal AI route estimates", () => {
  it("finds a replacement defender through an own-occupied Road corridor", () => {
    // The Guard on (6, 8) reaches the capital center only through the own
    // unit on (7, 8): 1 + 1 over Road nodes; every detour costs 3.
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "GUARD", at: at(8, 8) },
      { seat: 0, role: "GUARD", at: at(6, 8) },
      {
        seat: 0,
        role: "CATAPULT",
        at: at(7, 8),
        activation: { moved: true, movedPathLength: 1, handled: true },
      },
      { seat: 1, role: "FIGHTER", at: at(9, 8), hp: 1 },
      { seat: 1, role: "MARKSMAN", at: at(10, 8) },
    ];
    const keys = (tiles: BandOptions["tiles"]) => {
      const state = band(pieces, tiles === undefined ? {} : { tiles });
      const view = viewForV7(state, seatIdV7(state, 0));
      const defender = unitAtV7(state, at(8, 8));
      const actions = queryPlayerCommandsV7(view).filter(
        (command) =>
          (command.kind === "MOVE" || command.kind === "ATTACK") &&
          command.unitId === defender.id,
      );
      expect(actions.length).toBeGreaterThan(0);
      const facts = inspectNormalTacticalFactsV7(view);
      return actions.filter((command) =>
        facts.defenderReplacementActionKeys.includes(JSON.stringify(command)),
      );
    };
    expect(
      keys([
        [at(6, 8), road],
        [at(7, 8), road],
      ]).length,
    ).toBeGreaterThan(0);
    // Without the Road the Guard cannot pay for two steps.
    expect(keys(undefined)).toEqual([]);
  });

  it("estimates a hostile unit's reach through its own units and by Road origin", () => {
    const corridor = [...row(0, 0, 7), ...row(2, 0, 7)];
    const threatened = (state: GameStateV7, unitAt: CoordV7) => {
      const viewer = seatIdV7(state, 0);
      const view = viewForV7(state, viewer);
      const unit = unitAtV7(state, unitAt);
      const publicUnit = view.units.find((item) => item.id === unit.id);
      if (publicUnit === undefined) throw new Error("unit missing");
      const policy = publicThreatenedTilesForPolicyV7(view, publicUnit);
      // The private estimate never exceeds the public threat query.
      const published = queryThreatenedTilesV7(state, unit.id, viewer);
      for (const where of policy) expect(has(published, where)).toBe(true);
      return policy;
    };
    // A hostile Raider behind its own Fighter reaches (3, 1), so it
    // threatens (4, 1); behind the viewer's unit it reaches nothing.
    const through = band(
      [
        { seat: 1, role: "RAIDER", at: line(1) },
        { seat: 1, role: "FIGHTER", at: line(2) },
      ],
      { water: corridor },
    );
    expect(has(threatened(through, line(1)), line(4))).toBe(true);
    expect(has(threatened(through, line(1)), line(5))).toBe(false);
    const blocked = band(
      [
        { seat: 1, role: "RAIDER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      { water: corridor },
    );
    expect(has(threatened(blocked, line(1)), line(4))).toBe(false);
    // A hostile Fighter on a neutral Road pair reaches the roadless T2.
    const byOrigin = band([{ seat: 1, role: "FIGHTER", at: line(0) }], {
      water: corridor,
      tiles: [
        [line(0), road],
        [line(1), road],
      ],
    });
    expect(has(threatened(byOrigin, line(0)), line(3))).toBe(true);
    const roadless = band([{ seat: 1, role: "FIGHTER", at: line(0) }], {
      water: corridor,
    });
    expect(has(threatened(roadless, line(0)), line(3))).toBe(false);
  });

  it("routes a Move-2+ unit's endgame field through own units and keeps walls for Move 1", () => {
    // A one-tile land corridor runs north from the target capital (2, 8):
    // (2, 6) holds an own Catapult and (2, 4) an own Raider; water lies on
    // both sides of (2, 4) ... (2, 6).
    const water = [
      ...[4, 5, 6].map((y) => at(1, y)),
      ...[4, 5, 6].map((y) => at(3, y)),
    ];
    const cleared: [CoordV7, TilePatch][] = [];
    for (let y = 2; y <= 7; y += 1)
      for (let x = 0; x <= 4; x += 1)
        if (!has(water, at(x, y))) cleared.push([at(x, y), grass]);
    const state = band(
      [
        { seat: 0, role: "CATAPULT", at: at(2, 6) },
        { seat: 0, role: "RAIDER", at: at(2, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 7) },
      ],
      { water, tiles: cleared },
    );
    const base = viewForV7(state, seatIdV7(state, 0));
    const target = seatIdV7(state, 1);
    const view = {
      ...base,
      leaderboard: base.leaderboard.map((entry) =>
        entry.isViewer
          ? { ...entry, cityCount: 4, livingUnitCount: 6 }
          : { ...entry, cityCount: 1, livingUnitCount: 1 },
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.explored && tile.site === "VILLAGE"
            ? { ...tile, site: null }
            : tile,
        ),
      },
    };
    const plan = endgamePlanForPolicyV7(view, (owner) => owner === target);
    if (plan === null) throw new Error("endgame plan missing");
    expect(plan.targets.map((city) => city.at)).toEqual([at(2, 8)]);
    // Own-occupied tiles are in the pass-through field only.
    expect(plan.routeDistanceByKey.has("6,2")).toBe(false);
    expect(plan.passRouteDistanceByKey.get("6,2")).toBe(2);
    expect(plan.passRouteDistanceByKey.get("5,2")).toBe(3);
    expect(plan.passRouteDistanceByKey.get("4,2")).toBe(4);
    // A Move-1 unit walks around the water: (0, 6), (0, 5), (0, 4), (1, 3).
    expect(plan.routeDistanceByKey.get("3,1")).toBe(5);
    // (2, 5) is cut off between the two own units for a Move-1 unit.
    expect(plan.routeDistanceByKey.has("5,2")).toBe(false);
    // Another seat's unit is a wall in both fields.
    expect(plan.routeDistanceByKey.has("7,4")).toBe(false);
    expect(plan.passRouteDistanceByKey.has("7,4")).toBe(false);
    expect(endgameRouteDistanceV7(plan, view, at(2, 4), true)).toBe(4);
    expect(endgameRouteDistanceV7(plan, view, at(2, 4), false)).toBe(6);
  });

  it.each([
    { factions: ["ORIGINAL", "UNDEAD"], mapType: "PANGEA" },
    { factions: ["GOBLIN", "UNDEAD"], mapType: "ARCHIPELAGO" },
    { factions: ["ORIGINAL", "GOBLIN", "UNDEAD"], mapType: "CONTINENTS" },
  ] as const)(
    "plays a headless Normal $factions $mapType sample without a policy error",
    ({ factions, mapType }) => {
      const setup: MatchSetupV7 = {
        ...goblinSetupV7([...factions], 11),
        mapType,
      };
      const first = runAiMatchV7(setup, {
        maxRounds: 24,
        recordCheckpointHashes: false,
      });
      expect(first.errors).toEqual([]);
      expect(first.stalls).toEqual([]);
      const second = runAiMatchV7(setup, {
        maxRounds: 24,
        recordCheckpointHashes: false,
      });
      expect(second.stateHash).toBe(first.stateHash);
    },
    600_000,
  );
});

describe("ruleset-7 revision-18 move previews and texts", () => {
  it("highlights only legal destinations, including ones beyond an own unit", () => {
    const state = band(
      [
        { seat: 0, role: "RAIDER", at: line(1) },
        { seat: 0, role: "FIGHTER", at: line(2) },
      ],
      { water: [...row(0, 0, 7), ...row(2, 0, 7)] },
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const raider = unitAtV7(state, line(1));
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "UNIT", unitId: raider.id },
      selectedUnitId: raider.id,
      selectedAchievement: null,
    });
    const moves = plan.targets.filter((target) => target.family === "MOVE");
    expect(moves.map((target) => target.at)).toEqual([line(0), line(3)]);
    expect(moves[1]?.command).toEqual({
      kind: "MOVE",
      unitId: raider.id,
      path: [line(2), line(3)],
    });
    expect(plan.targets.some((target) => sameV7(target.at, line(2)))).toBe(
      false,
    );
  });

  it("states both rules in the help and technology text", () => {
    expect(OWN_UNIT_PASS_THROUGH_TEXT_V7).toBe(
      "Units can move through your own units but cannot stop on them.",
    );
    expect(ROAD_MOVEMENT_TEXT_V7).toBe(
      "Leaving a Road tile costs half a move; the tile you move onto needs no Road.",
    );
    const state = band([{ seat: 0, role: "FIGHTER", at: line(1) }]);
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 0));
    const roads = tree.nodes.find((node) => node.id === "ROADS");
    if (roads === undefined) throw new Error("Roads node missing");
    expect(
      technologyEffectGroupsV7(roads.effects, tree.faction).flatMap(
        (group) => group.items,
      ),
    ).toContain(ROAD_MOVEMENT_TEXT_V7);
  });
});

class MemoryStorage implements StorageAdapter {
  readonly values: Map<string, string>;
  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.values = new Map(entries);
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}
