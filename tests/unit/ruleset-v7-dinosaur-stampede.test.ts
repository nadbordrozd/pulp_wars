import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  canonicalHash,
  estimateCombatV7,
  factionTreeV7,
  parseEventV7,
  parseGameStateV7,
  previewStampedeV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryStampedeLanesV7,
  queryThreatenedTilesV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type StampedePreviewV7,
  type TechnologyIdV7,
  type TileStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cityOfV7,
  rewardStateV7,
  withEggsV7,
  withKillsV7,
  type EggPieceV7,
} from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.3`) Triceratops Stampede
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md section 7).
//
// Two-seat field: seat 0 capital (8, 8) with territory x 7-9, y 7-9; seat 1
// capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5), (8, 5),
// (5, 8). `field` turns every other tile into open Grass with no chest.

const kinds = (events: readonly DomainEventV7[]): readonly string[] =>
  events.map((event) => event.kind);

function without(...excluded: TechnologyIdV7[]): readonly TechnologyIdV7[] {
  const removed = new Set<TechnologyIdV7>(excluded);
  const nodes = factionTreeV7("DINOSAUR").nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (
        !removed.has(node.id) &&
        node.prerequisites.some((tech) => removed.has(tech))
      ) {
        removed.add(node.id);
        changed = true;
      }
  }
  return TECHNOLOGY_IDS_V7.filter((tech) => !removed.has(tech));
}

interface FieldOptionsV7 extends GoblinArenaOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly eggs?: readonly EggPieceV7[];
}

/** An arena whose land outside every territory and site is open Grass. */
function field(
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  const arena = goblinArenaV7(
    options.factions ?? ["DINOSAUR", "ORIGINAL"],
    pieces,
    options,
  );
  const water = options.water ?? [];
  const open = checkedV7({
    ...arena,
    treasureChests: [],
    players: arena.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.achievement === "EXPLORER" &&
        player.researchedTechs.includes("SCOUTING")
          ? { ...entry, unlocked: true }
          : entry,
      ),
    })),
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) =>
        tile.site === null && !water.some((at) => sameV7(at, tile.at))
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
  return options.eggs === undefined ? open : withEggsV7(open, options.eggs);
}

function patchTile(
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<TileStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameV7(tile.at, at) ? { ...tile, ...patch } : tile,
      ),
    },
  });
}

const forest = (state: GameStateV7, at: CoordV7): GameStateV7 =>
  patchTile(state, at, { terrain: "FOREST", biome: "WOODLAND" });
const mountain = (state: GameStateV7, at: CoordV7): GameStateV7 =>
  patchTile(state, at, { terrain: "MOUNTAIN", biome: "HIGHLANDS" });

function unexplore(
  state: GameStateV7,
  seat: number,
  hidden: readonly CoordV7[],
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.seat === seat
        ? {
            ...player,
            explored: player.explored.filter(
              (at) => !hidden.some((tile) => sameV7(tile, at)),
            ),
          }
        : player,
    ),
  });
}

function activeId(state: GameStateV7): GameStateV7["humanPlayerId"] {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("no active player");
  return id;
}

function command(state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 {
  return {
    kind: "STAMPEDE",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, to).id,
  };
}

function rejection(
  state: GameStateV7,
  stampede: CommandV7,
): { readonly code: string; readonly params: unknown } {
  const actor = activeId(state);
  const result = applyCommandV7(state, actor, stampede);
  if (result.accepted) throw new Error("STAMPEDE accepted");
  // Atomic, never offered, and never previewed.
  expect(result.state).toBe(state);
  expect(result.events).toEqual([]);
  expect(queryPlayerCommandsV7(state, actor)).not.toContainEqual(stampede);
  if (stampede.kind === "STAMPEDE")
    expect(
      previewStampedeV7(
        viewForV7(state, actor),
        stampede.unitId,
        stampede.targetUnitId,
      ),
    ).toBeNull();
  return result.error;
}

interface StampedeRunV7 {
  readonly before: GameStateV7;
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
  readonly preview: StampedePreviewV7;
  /** The Triceratops after the command, or undefined when it died. */
  readonly triceratops: GameStateV7["units"][number] | undefined;
  /** The target after the command, or undefined when it died. */
  readonly target: GameStateV7["units"][number] | undefined;
}

/**
 * Resolves an offered Stampede and checks that its public preview equals the
 * resolution: the hit, the Push, the Triceratops's final tile, the Field
 * Defense destroyed, and the death-blast chain.
 */
function stampede(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): StampedeRunV7 {
  const actor = activeId(state);
  const unit = unitAtV7(state, from);
  const target = unitAtV7(state, to);
  const order = command(state, from, to);
  const view = viewForV7(state, actor);
  expect(queryPlayerCommandsV7(view)).toContainEqual(order);
  const preview = previewStampedeV7(view, unit.id, target.id);
  if (preview === null) throw new Error("no Stampede preview");
  const result = applyOkV7(state, actor, order);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  const combat = result.events.find(
    (event) => event.kind === "COMBAT_RESOLVED",
  );
  if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  // The only fact a viewer cannot know is another player's Engineering, for
  // a Push onto a Mountain.
  const hiddenEngineering =
    preview.combat.push === "UNKNOWN_BEHIND_FOG" &&
    combat.preview.push !== "UNKNOWN_BEHIND_FOG";
  if (hiddenEngineering) {
    const stand = preview.standAt;
    const behind = {
      x: target.at.x * 2 - stand.x,
      y: target.at.y * 2 - stand.y,
    };
    expect(
      state.board.tiles.find((tile) => sameV7(tile.at, behind))?.terrain,
    ).toBe("MOUNTAIN");
    const { push: _push, advances: _advances, ...hit } = preview.combat;
    void _push;
    void _advances;
    expect(combat.preview).toMatchObject(hit);
  } else {
    expect(preview.combat).toEqual(combat.preview);
    const pushed = result.events.find((event) => event.kind === "UNIT_PUSHED");
    expect(preview.pushTo).toEqual(
      pushed?.kind === "UNIT_PUSHED" ? pushed.to : null,
    );
    const moves = result.events.filter(
      (event) => event.kind === "UNIT_MOVED" && event.unitId === unit.id,
    );
    const last = moves.at(-1);
    expect(preview.endsAt).toEqual(
      last?.kind === "UNIT_MOVED" ? last.path.at(-1) : undefined,
    );
  }
  const run = result.events[0];
  expect(run).toEqual({
    kind: "UNIT_MOVED",
    unitId: unit.id,
    path: preview.lane,
  });
  expect(preview).toMatchObject({
    unitId: unit.id,
    targetUnitId: target.id,
    from,
    standAt: preview.lane.at(-1),
    runTiles: preview.lane.length,
  });
  expect(preview.fieldDefenseDestroyed).toEqual(
    result.events.flatMap((event) =>
      event.kind === "FIELD_DEFENSE_DESTROYED" && event.reason !== "EXPLOSION"
        ? [event.at]
        : [],
    ),
  );
  if (!preview.explosions.touchesUnexplored)
    expect(
      preview.explosions.explosions.map((explosion) => ({
        unitId: explosion.unitId,
        at: explosion.at,
        wave: explosion.wave,
        damage: explosion.damage,
        results: explosion.results.map((entry) => ({
          unitId: entry.unitId,
          at: entry.at,
          damage: entry.damage,
          dies: entry.dies,
        })),
      })),
    ).toEqual(
      result.events.flatMap((event) =>
        event.kind === "EXPLOSION_RESOLVED"
          ? [
              {
                unitId: event.unitId,
                at: event.at,
                wave: event.wave,
                damage: event.damage,
                results: event.results,
              },
            ]
          : [],
      ),
    );
  // Deterministic: the same command on the same state gives the same result.
  const again = applyOkV7(state, actor, order);
  expect(again.events).toEqual(result.events);
  expect(canonicalHash(again.state)).toBe(canonicalHash(result.state));
  return {
    before: state,
    state: result.state,
    events: result.events,
    preview,
    triceratops: result.state.units.find(
      (candidate) => candidate.id === unit.id,
    ),
    target: result.state.units.find((candidate) => candidate.id === target.id),
  };
}

const T = { x: 3, y: 3 } as const;
const DIRECTIONS = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
] as const;
const step = (
  from: CoordV7,
  direction: CoordV7,
  distance: number,
): CoordV7 => ({
  x: from.x + direction.x * distance,
  y: from.y + direction.y * distance,
});

describe("ruleset-7 revision-19 Stampede lanes", () => {
  it("runs in all eight directions at distance 2 and 3", () => {
    for (const direction of DIRECTIONS)
      for (const distance of [2, 3] as const) {
        const to = step(T, direction, distance);
        const state = field([
          { seat: 0, role: "CATAPULT", at: T },
          { seat: 1, role: "GUARD", at: to },
        ]);
        const lane = Array.from({ length: distance - 1 }, (_, index) =>
          step(T, direction, index + 1),
        );
        expect(
          queryStampedeLanesV7(
            viewForV7(state, state.humanPlayerId),
            unitAtV7(state, T).id,
          ),
        ).toEqual([
          {
            targetUnitId: unitAtV7(state, to).id,
            lane,
            standAt: lane.at(-1),
          },
        ]);
        const run = stampede(state, T, to);
        expect(run.preview.lane).toEqual(lane);
        expect(run.preview.combat).toMatchObject({
          stampede: distance - 1,
          attack2: 6 + 2 * (distance - 1),
          retaliation: false,
        });
        // The Guard survives and is pushed one tile along the lane, and the
        // Triceratops follows onto its former tile, unless the tile behind
        // it is off the board (then both stay).
        const behind = step(T, direction, distance + 1);
        const onBoard = behind.x >= 0 && behind.y >= 0;
        expect(run.target?.at).toEqual(onBoard ? behind : to);
        expect(run.triceratops?.at).toEqual(onBoard ? to : lane.at(-1));
      }
  });

  it("rejects targets that are not exactly 2 or 3 tiles away in a straight line", () => {
    for (const to of [
      // Adjacent (an ordinary Attack), distance 4, and knight-move offsets.
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 7, y: 3 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 6 },
      { x: 1, y: 0 },
    ]) {
      const state = field([
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 1, role: "GUARD", at: to },
      ]);
      expect(
        rejection(state, command(state, T, to)),
        `${to.x},${to.y}`,
      ).toEqual({
        code: "STAMPEDE_NOT_LEGAL",
        params: { reason: "NOT_IN_LANE" },
      });
    }
    // An adjacent target is attacked with ATTACK instead.
    const adjacent = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "GUARD", at: { x: 4, y: 3 } },
    ]);
    expect(
      queryPlayerCommandsV7(adjacent, adjacent.humanPlayerId),
    ).toContainEqual({
      kind: "ATTACK",
      unitId: unitAtV7(adjacent, T).id,
      targetUnitId: unitAtV7(adjacent, { x: 4, y: 3 }).id,
    });
  });

  it("rejects afloat, own, allied, unseen, and unknown targets", () => {
    // Afloat: a Patrol Boat and an embarked unit two tiles away over land.
    for (const [role, form] of [
      ["PATROL_BOAT", "NAVAL"],
      ["FIGHTER", "EMBARKED"],
    ] as const) {
      const state = field(
        [
          { seat: 0, role: "CATAPULT", at: T },
          { seat: 1, role, form, at: { x: 5, y: 3 } },
        ],
        { water: [{ x: 5, y: 3 }] },
      );
      expect(rejection(state, command(state, T, { x: 5, y: 3 }))).toEqual({
        code: "STAMPEDE_NOT_LEGAL",
        params: { reason: "NOT_IN_LANE" },
      });
    }
    const own = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
    ]);
    expect(rejection(own, command(own, T, { x: 5, y: 3 })).code).toBe(
      "TARGET_ALLIED",
    );
    // Cooperative AIs: seat 1 (Dinosaur) and seat 2 are allied.
    const allied = field(
      [
        { seat: 1, role: "CATAPULT", at: { x: 5, y: 6 } },
        { seat: 2, role: "FIGHTER", at: { x: 7, y: 6 } },
      ],
      {
        factions: ["ORIGINAL", "DINOSAUR", "ORIGINAL"],
        aiMode: "COOPERATIVE",
        activeSeat: 1,
      },
    );
    expect(
      rejection(allied, command(allied, { x: 5, y: 6 }, { x: 7, y: 6 })).code,
    ).toBe("TARGET_ALLIED");
    // Unseen: the target stands on a tile the actor has not explored.
    const seen = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
    ]);
    const unseen = unexplore(seen, 0, [{ x: 5, y: 3 }]);
    const order = command(seen, T, { x: 5, y: 3 });
    expect(rejection(unseen, order)).toEqual({
      code: "TARGET_NOT_FOUND",
      params: { targetUnitId: unitAtV7(seen, { x: 5, y: 3 }).id },
    });
    expect(
      rejection(seen, { ...order, targetUnitId: 9999 } as CommandV7).code,
    ).toBe("TARGET_NOT_FOUND");
  });

  it("rejects a moved, landed, embarked, or already-acted unit, and a role without Stampede", () => {
    const target = { x: 5, y: 3 };
    const make = (
      piece: Partial<GoblinPieceV7>,
      options: FieldOptionsV7 = {},
    ): GameStateV7 =>
      field(
        [
          { seat: 0, role: "CATAPULT", at: T, ...piece },
          { seat: 1, role: "FIGHTER", at: target },
        ],
        options,
      );
    const moved = make({ activation: { moved: true, movedPathLength: 1 } });
    expect(rejection(moved, command(moved, T, target))).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "MOVED" },
    });
    // Landing ends the activation (the exhausted activation).
    const landed = make({
      activation: {
        moved: true,
        attacked: true,
        attacksUsed: 1,
        recovered: true,
        captured: true,
        specialActed: true,
        handled: true,
      },
    });
    expect(rejection(landed, command(landed, T, target))).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "MOVED" },
    });
    const acted = make({
      activation: { attacked: true, attacksUsed: 1, handled: true },
    });
    expect(rejection(acted, command(acted, T, target))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: unitAtV7(acted, T).id },
    });
    const embarked = make({ form: "EMBARKED" }, { water: [T] });
    expect(rejection(embarked, command(embarked, T, target))).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    for (const role of ["KNIGHT", "FIGHTER", "JUGGERNAUT"] as const) {
      const wrong = make({ role });
      expect(rejection(wrong, command(wrong, T, target))).toEqual({
        code: "UNIT_ROLE_INVALID",
        params: { role },
      });
    }
    // A Human Catapult has no Stampede.
    const human = field(
      [
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 1, role: "FIGHTER", at: target },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    expect(rejection(human, command(human, T, target)).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    // Unknown and foreign units keep the ordinary unit errors.
    const base = make({});
    expect(
      rejection(base, {
        ...command(base, T, target),
        unitId: 9999,
      } as CommandV7).code,
    ).toBe("UNIT_NOT_FOUND");
    expect(
      rejection(base, {
        kind: "STAMPEDE",
        unitId: unitAtV7(base, target).id,
        targetUnitId: unitAtV7(base, T).id,
      }).code,
    ).toBe("UNIT_NOT_OWNED");
  });

  it("needs every lane tile open: explored Grass or Forest, no allied territory, no chest, no blocking unit", () => {
    const far = { x: 6, y: 3 };
    const first = { x: 4, y: 3 };
    const stand = { x: 5, y: 3 };
    const base = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "GUARD", at: far },
    ]);
    const blocked = (state: GameStateV7, label: string): void =>
      expect(rejection(state, command(state, T, far)), label).toEqual({
        code: "STAMPEDE_NOT_LEGAL",
        params: { reason: "LANE_BLOCKED" },
      });
    for (const tile of [first, stand]) {
      blocked(unexplore(base, 0, [tile]), "unexplored");
      // pulp_wars-c87.8 (the section 15.1 fallback): a Forest lane tile is
      // open, the stand tile included; before, a Forest closed the lane.
      expect(
        stampede(forest(base, tile), T, far).preview.combat.stampede,
        "Forest",
      ).toBe(2);
      blocked(mountain(base, tile), "Mountain");
      blocked(checkedV7({ ...base, treasureChests: [tile] }), "chest");
      blocked(
        field(
          [
            { seat: 0, role: "CATAPULT", at: T },
            { seat: 1, role: "GUARD", at: far },
          ],
          { water: [tile] },
        ),
        "water",
      );
      // A hostile unit anywhere in the lane.
      blocked(
        field([
          { seat: 0, role: "CATAPULT", at: T },
          { seat: 1, role: "GUARD", at: far },
          { seat: 1, role: "FIGHTER", at: tile },
        ]),
        "hostile unit",
      );
    }
    // An own unit, or an own Egg, on the stand tile.
    blocked(
      field([
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 0, role: "FIGHTER", at: stand },
        { seat: 1, role: "GUARD", at: far },
      ]),
      "own unit on the stand tile",
    );
    // Even with Engineering a Mountain closes the lane: every technology is
    // researched here.
    expect(
      base.players.every((player) =>
        player.researchedTechs.includes("ENGINEERING"),
      ),
    ).toBe(true);
    // The open lane itself is legal.
    stampede(base, T, far);
  });

  it("is closed by territory allied to the actor and by an allied unit", () => {
    // Cooperative AIs on the three-seat board: seat 1 Dinosaur (capital
    // (11, 11)), seat 2 its ally (capital (11, 2), territory x 10-12, y 1-3).
    const options = {
      factions: ["ORIGINAL", "DINOSAUR", "ORIGINAL"],
      aiMode: "COOPERATIVE",
      activeSeat: 1,
    } as const;
    const territory = field(
      [
        { seat: 1, role: "CATAPULT", at: { x: 8, y: 3 } },
        { seat: 0, role: "GUARD", at: { x: 11, y: 3 } },
      ],
      options,
    );
    // Lane (9, 3), (10, 3): the stand tile is in the ally's territory.
    expect(
      rejection(territory, command(territory, { x: 8, y: 3 }, { x: 11, y: 3 })),
    ).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "LANE_BLOCKED" },
    });
    const unit = field(
      [
        { seat: 1, role: "CATAPULT", at: { x: 5, y: 6 } },
        { seat: 2, role: "FIGHTER", at: { x: 6, y: 6 } },
        { seat: 0, role: "GUARD", at: { x: 8, y: 6 } },
      ],
      options,
    );
    expect(
      rejection(unit, command(unit, { x: 5, y: 6 }, { x: 8, y: 6 })),
    ).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "LANE_BLOCKED" },
    });
    // Hostile territory and neutral ground do not close a lane.
    const hostile = field(
      [
        { seat: 1, role: "CATAPULT", at: { x: 5, y: 1 } },
        { seat: 0, role: "GUARD", at: { x: 2, y: 1 } },
      ],
      options,
    );
    expect(cityOfV7(hostile, 0).at).toEqual({ x: 2, y: 2 });
    stampede(hostile, { x: 5, y: 1 }, { x: 2, y: 1 });
  });

  it("passes own units and own Eggs on the first lane tile", () => {
    const passing = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
      { seat: 1, role: "GUARD", at: { x: 6, y: 3 } },
    ]);
    const run = stampede(passing, T, { x: 6, y: 3 });
    expect(run.preview.lane).toEqual([
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ]);
    expect(unitAtV7(run.state, { x: 4, y: 3 }).role).toBe("FIGHTER");
    // An own Egg on a nest tile: Triceratops (6, 7), Egg (7, 7), stand
    // (8, 7), target (9, 7), all in the Dinosaur's own territory.
    const egg = field(
      [
        { seat: 0, role: "CATAPULT", at: { x: 6, y: 7 } },
        { seat: 1, role: "GUARD", at: { x: 9, y: 7 } },
      ],
      { eggs: [{ seat: 0, role: "RAIDER", at: { x: 7, y: 7 } }] },
    );
    const through = stampede(egg, { x: 6, y: 7 }, { x: 9, y: 7 });
    expect(unitAtV7(through.state, { x: 7, y: 7 }).form).toBe("EGG");
    // The Guard has no free tile behind it (the board edge is at x = 10).
    expect(through.triceratops?.at).toEqual({ x: 9, y: 7 });
    expect(through.target?.at).toEqual({ x: 10, y: 7 });
    // An own Egg on the stand tile closes the lane.
    const onStand = field(
      [
        { seat: 0, role: "CATAPULT", at: { x: 5, y: 7 } },
        { seat: 1, role: "GUARD", at: { x: 8, y: 7 } },
      ],
      { eggs: [{ seat: 0, role: "RAIDER", at: { x: 7, y: 7 } }] },
    );
    expect(
      rejection(onStand, command(onStand, { x: 5, y: 7 }, { x: 8, y: 7 })),
    ).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "LANE_BLOCKED" },
    });
  });

  it("ignores hostile zone of control, Roads, Graves, improvements, and Field Defense in the lane", () => {
    const base = field(
      [
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 1, role: "GUARD", at: { x: 6, y: 3 } },
        // Hostile units next to both lane tiles project zone of control.
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 } },
      ],
      { factions: ["DINOSAUR", "UNDEAD"] },
    );
    const state = checkedV7({
      ...patchTile(base, { x: 4, y: 3 }, { road: true }),
      graves: [{ x: 5, y: 3 }],
    });
    // A Move along the same tiles is stopped by the zone of control.
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "MOVE",
        unitId: unitAtV7(state, T).id,
        path: [{ x: 4, y: 3 }],
      }).accepted,
    ).toBe(true);
    const run = stampede(state, T, { x: 6, y: 3 });
    expect(run.state.graves).toEqual([{ x: 5, y: 3 }]);
    expect(run.triceratops?.at).toEqual({ x: 6, y: 3 });
  });

  it("crosses and ends on empty settlement centers", () => {
    // Across the village at (5, 5): Triceratops (5, 4), target (5, 7).
    const across = field([
      { seat: 0, role: "CATAPULT", at: { x: 5, y: 4 } },
      { seat: 1, role: "GUARD", at: { x: 5, y: 7 } },
    ]);
    const crossed = stampede(across, { x: 5, y: 4 }, { x: 5, y: 7 });
    expect(crossed.preview.lane).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 6 },
    ]);
    // Ending on it: the stand tile is the village center.
    const ending = field([
      { seat: 0, role: "CATAPULT", at: { x: 5, y: 3 } },
      { seat: 1, role: "GUARD", at: { x: 5, y: 6 }, hp: 1 },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 7 } },
    ]);
    const ended = stampede(ending, { x: 5, y: 3 }, { x: 5, y: 6 });
    expect(ended.preview.standAt).toEqual({ x: 5, y: 5 });
    // Ending on the hostile capital (2, 8): the Triceratops stands on it
    // when the target cannot be pushed, besieging and never capturing.
    const capital = field([
      { seat: 0, role: "CATAPULT", at: { x: 2, y: 6 } },
      { seat: 1, role: "GUARD", at: { x: 2, y: 9 } },
    ]);
    const sieged = stampede(capital, { x: 2, y: 6 }, { x: 2, y: 9 });
    expect(sieged.preview.standAt).toEqual({ x: 2, y: 8 });
    // The Guard is pushed to (2, 10) and the Triceratops follows to (2, 9).
    expect(sieged.triceratops?.at).toEqual({ x: 2, y: 9 });
    // A unit on a center in the lane closes it.
    const held = field([
      { seat: 0, role: "CATAPULT", at: { x: 5, y: 3 } },
      { seat: 1, role: "GUARD", at: { x: 5, y: 6 } },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 5 } },
    ]);
    expect(
      rejection(held, command(held, { x: 5, y: 3 }, { x: 5, y: 6 })).params,
    ).toEqual({ reason: "LANE_BLOCKED" });
  });

  it("offers exactly the legal Stampedes, equal to queryStampedeLanesV7, all accepted", () => {
    // A Mountain on (1, 3) closes the lane to the Guard on (0, 3).
    const state = mountain(
      field([
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 6, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 0 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 5 } },
        { seat: 1, role: "GUARD", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 0, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 5, y: 5 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 3 } },
      ]),
      { x: 1, y: 3 },
    );
    const actor = state.humanPlayerId;
    const unit = unitAtV7(state, T);
    const offered = queryPlayerCommandsV7(state, actor).filter(
      (candidate) => candidate.kind === "STAMPEDE",
    );
    const targets = [
      { x: 3, y: 0 },
      { x: 3, y: 5 },
      { x: 1, y: 1 },
      { x: 5, y: 5 },
    ].map((at) => unitAtV7(state, at).id);
    expect(
      offered
        .map((candidate) =>
          candidate.kind === "STAMPEDE" ? candidate.targetUnitId : null,
        )
        .sort(),
    ).toEqual([...targets].sort());
    const lanes = queryStampedeLanesV7(viewForV7(state, actor), unit.id);
    expect(lanes.map((lane) => lane.targetUnitId)).toEqual(
      [...targets].sort((left, right) => left - right),
    );
    for (const candidate of offered)
      expect(applyCommandV7(state, actor, candidate).accepted).toBe(true);
    // Not this player's turn, or another unit: no lanes.
    expect(
      queryStampedeLanesV7(viewForV7(state, seatIdV7(state, 1)), unit.id),
    ).toEqual([]);
    expect(
      queryStampedeLanesV7(
        viewForV7(state, actor),
        unitAtV7(state, { x: 3, y: 2 }).id,
      ),
    ).toEqual([]);
  });
});

describe("ruleset-7 revision-19 Stampede hit", () => {
  it("reproduces every worked example of section 7.5", () => {
    // An ordinary adjacent Attack on a Fighter: Attack 3, damage 8, and the
    // Fighter retaliates for 4.
    const ordinary = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
    ]);
    expect(
      estimateCombatV7(
        ordinary,
        unitAtV7(ordinary, T).id,
        unitAtV7(ordinary, { x: 4, y: 3 }).id,
      ),
    ).toMatchObject({
      attack2: 6,
      stampede: 0,
      damageToDefender: 8,
      defenderDies: false,
      retaliation: true,
      damageToAttacker: 4,
    });
    const example = (role: UnitRoleIdV7, distance: 2 | 3): StampedeRunV7 => {
      const to = { x: T.x + distance, y: T.y };
      return stampede(
        field([
          { seat: 0, role: "CATAPULT", at: T },
          { seat: 1, role, at: to },
        ]),
        T,
        to,
      );
    };
    // Distance 2 on a Fighter: Attack 4, damage 10: it dies and the
    // Triceratops advances.
    const fighter = example("FIGHTER", 2);
    expect(fighter.preview.combat).toMatchObject({
      attack2: 8,
      damageToDefender: 10,
      defenderDies: true,
      advances: true,
      noRetaliationReason: "DEFENDER_DIED",
    });
    expect(fighter.target).toBeUndefined();
    expect(fighter.triceratops?.at).toEqual({ x: 5, y: 3 });
    // Distance 3 on a Guard (15 HP): Attack 5, damage 14: it survives at 1
    // and is pushed; no retort.
    const guard3 = example("GUARD", 3);
    expect(guard3.preview.combat).toMatchObject({
      attack2: 10,
      damageToDefender: 14,
      defenderDies: false,
      retaliation: false,
      noRetaliationReason: "STAMPEDE",
      damageToAttacker: 0,
      push: "WILL_PUSH",
    });
    expect(guard3.target).toMatchObject({ hp: 1, at: { x: 7, y: 3 } });
    expect(guard3.triceratops).toMatchObject({ hp: 18, at: { x: 6, y: 3 } });
    // Distance 2 on a Guard: Attack 4, damage 10: it survives at 5.
    const guard2 = example("GUARD", 2);
    expect(guard2.preview.combat).toMatchObject({
      attack2: 8,
      damageToDefender: 10,
    });
    expect(guard2.target).toMatchObject({ hp: 5, at: { x: 6, y: 3 } });
    // Distance 3 on a Juggernaut (40 HP): Attack 5, damage 13; pushed.
    const juggernaut = example("JUGGERNAUT", 3);
    expect(juggernaut.preview.combat).toMatchObject({
      attack2: 10,
      damageToDefender: 13,
      push: "WILL_PUSH",
    });
    expect(juggernaut.target).toMatchObject({ hp: 27, at: { x: 7, y: 3 } });
  });

  it("hits a Guard behind Walls for 11 from distance 3 and pushes it off the center (and a Catapult does 6)", () => {
    const walled = (faction: FactionIdV7): GameStateV7 => {
      const fixture = rewardStateV7(
        "JUGGERNAUT",
        "ORIGINAL",
        [{ role: "GUARD", at: { x: 8, y: 8 } }],
        { faction, pieces: [{ role: "CATAPULT", at: { x: 8, y: 5 } }] },
      );
      const chosen = applyOkV7(fixture.state, fixture.state.humanPlayerId, {
        ...fixture.command,
        reward: "TREASURY",
      }).state;
      return endTurnUntilV7(chosen, seatIdV7(chosen, 1)).state;
    };
    const state = walled("DINOSAUR");
    const run = stampede(state, { x: 8, y: 5 }, { x: 8, y: 8 });
    expect(run.preview.combat).toMatchObject({
      attack2: 10,
      defense2: 10,
      fortificationLevel: 2,
      damageToDefender: 11,
      defenderDies: false,
      push: "WILL_PUSH",
      advances: true,
    });
    // The Guard (15 HP) survives at 4 and is pushed off the center; the
    // Triceratops follows onto it, besieging the city without capturing.
    expect(run.target).toMatchObject({ hp: 4, at: { x: 8, y: 9 } });
    expect(run.triceratops?.at).toEqual({ x: 8, y: 8 });
    expect(kinds(run.events)).not.toContain("CITY_CAPTURED");
    expect(cityOfV7(run.state, 0).ownerId).toBe(seatIdV7(state, 0));
    expect(
      applyCommandV7(run.state, seatIdV7(state, 1), {
        kind: "CAPTURE",
        unitId: unitAtV7(run.state, { x: 8, y: 8 }).id,
      }),
    ).toMatchObject({ accepted: false });
    // The besieged city cannot train.
    const besieged = endTurnUntilV7(run.state, seatIdV7(state, 0)).state;
    expect(
      applyCommandV7(besieged, seatIdV7(state, 0), {
        kind: "TRAIN",
        cityId: cityOfV7(besieged, 0).id,
        role: "FIGHTER",
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_BESIEGED" } });
    // The Triceratops never becomes capture eligible on the center.
    const back = endTurnUntilV7(besieged, seatIdV7(state, 1)).state;
    expect(unitAtV7(back, { x: 8, y: 8 }).captureEligible).toBe(false);
    expect(
      queryPlayerCommandsV7(back, seatIdV7(state, 1)).some(
        (candidate) => candidate.kind === "CAPTURE",
      ),
    ).toBe(false);
    // For comparison: a Human Catapult (3.5) on the same Guard does 6.
    const human = walled("ORIGINAL");
    expect(
      estimateCombatV7(
        human,
        unitAtV7(human, { x: 8, y: 5 }).id,
        unitAtV7(human, { x: 8, y: 8 }).id,
      ),
    ).toMatchObject({ attack2: 7, damageToDefender: 6, defenderDies: false });
  });

  it("stacks the run bonus with Alpha", () => {
    for (const [distance, attack2] of [
      [2, 10],
      [3, 12],
    ] as const) {
      const to = { x: T.x + distance, y: T.y };
      const base = field([
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 1, role: "JUGGERNAUT", at: to },
      ]);
      const alpha = withKillsV7(base, T, 3);
      const run = stampede(alpha, T, to);
      expect(run.preview.combat).toMatchObject({
        attack2,
        stampede: distance - 1,
      });
    }
  });

  it("applies cover, Field Defense, and Armoured to the hit, with no Acid", () => {
    const to = { x: 5, y: 3 };
    const plain = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "GUARD", at: to },
    ]);
    // The target tile may be a Forest or a Mountain (only the lane must be
    // open): cover multiplies the Defense by 1.5.
    for (const cover of [forest, mountain]) {
      const run = stampede(cover(plain, to), T, to);
      expect(run.preview.combat).toMatchObject({
        acid: false,
        defenseBonusNumerator: 3,
        defenseBonusDenominator: 2,
        // 10 on open ground (section 7.5), 8 behind cover.
        damageToDefender: 8,
      });
    }
    // Field Defense in the defender's own territory: (3, 8) is seat 1's.
    const fortified = patchTile(
      field([
        { seat: 0, role: "CATAPULT", at: { x: 5, y: 6 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 8 } },
      ]),
      { x: 3, y: 8 },
      { fieldDefense: true },
    );
    const run = stampede(fortified, { x: 5, y: 6 }, { x: 3, y: 8 });
    expect(run.preview.combat).toMatchObject({
      fortificationLevel: 1,
      defense2: 8,
      damageToDefender: 9,
    });
    // An Ankylosaurus takes 1 less (Dinosaur against Dinosaur).
    const armoured = field(
      [
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 1, role: "GUARD", at: to },
      ],
      { factions: ["DINOSAUR", "DINOSAUR"] },
    );
    const hit = stampede(armoured, T, to);
    expect(hit.preview.combat).toMatchObject({ defenderArmoured: true });
    expect(hit.preview.combat.damageToDefender).toBe(
      queryCombatPreviewV7(
        field(
          [
            { seat: 0, role: "KNIGHT", at: { x: 4, y: 3 } },
            { seat: 1, role: "GUARD", at: to },
          ],
          { factions: ["DINOSAUR", "DINOSAUR"] },
        ),
        armoured.humanPlayerId,
        unitAtV7(armoured, T).id,
        unitAtV7(armoured, to).id,
      )?.damageToDefender ?? -1,
    );
  });

  it("draws no retaliation from melee, ranged, Zombie, or Vampire targets", () => {
    const to = { x: 5, y: 3 };
    for (const [faction, role] of [
      ["ORIGINAL", "JUGGERNAUT"],
      ["ORIGINAL", "MARKSMAN"],
      ["ORIGINAL", "BATTLESHIP"],
      ["UNDEAD", "GUARD"],
      ["UNDEAD", "KNIGHT"],
    ] as const) {
      if (role === "BATTLESHIP") continue;
      const hp = role === "MARKSMAN" || role === "KNIGHT" ? 10 : undefined;
      const state = field(
        [
          { seat: 0, role: "CATAPULT", at: T },
          {
            seat: 1,
            role,
            at: to,
            ...(hp === undefined ? {} : { hp }),
          },
          // Keep 10-HP targets alive with a weaker Triceratops.
        ].map((piece) =>
          piece.role === "CATAPULT" && hp !== undefined
            ? { ...piece, hp: 4 }
            : piece,
        ) as GoblinPieceV7[],
        { factions: ["DINOSAUR", faction] },
      );
      const run = stampede(state, T, to);
      expect(run.preview.combat, role).toMatchObject({
        defenderDies: false,
        retaliation: false,
        noRetaliationReason: "STAMPEDE",
        damageToAttacker: 0,
        attackerBitten: false,
        attackerInfected: false,
        defenderHeal: 0,
      });
      expect(run.triceratops?.hp).toBe(unitAtV7(state, T).hp);
      expect(run.state.bitten).toEqual([]);
      expect(run.target?.hp).toBe(
        unitAtV7(state, to).hp - run.preview.combat.damageToDefender,
      );
    }
  });

  it("destroys Field Defense on the target tile (CATAPULT) and on a hostile stand tile (OCCUPATION)", () => {
    // Stand tile (2, 7) and target tile (3, 8) are both in seat 1's
    // territory and both fortified; the Triceratops comes from (0, 5).
    const from = { x: 0, y: 5 };
    const stand = { x: 2, y: 7 };
    const to = { x: 3, y: 8 };
    for (const hp of [15, 1]) {
      const state = patchTile(
        patchTile(
          field([
            { seat: 0, role: "CATAPULT", at: from },
            { seat: 1, role: "GUARD", at: to, hp },
          ]),
          stand,
          { fieldDefense: true },
        ),
        to,
        { fieldDefense: true },
      );
      const run = stampede(state, from, to);
      expect(run.preview.fieldDefenseDestroyed).toEqual([stand, to]);
      expect(
        run.events.filter((event) => event.kind === "FIELD_DEFENSE_DESTROYED"),
      ).toEqual([
        { kind: "FIELD_DEFENSE_DESTROYED", at: stand, reason: "OCCUPATION" },
        { kind: "FIELD_DEFENSE_DESTROYED", at: to, reason: "CATAPULT" },
      ]);
      expect(run.state.board.tiles.filter((tile) => tile.fieldDefense)).toEqual(
        [],
      );
      // The Field Defense still counted in the hit.
      expect(run.preview.combat.fortificationLevel).toBe(1);
      expect(run.preview.combat.defenderDies).toBe(hp === 1);
    }
    // Field Defense on a stand tile in the actor's own territory stays, and
    // the target tile's falls whoever owns the tile: target (9, 7) in the
    // Dinosaur's own territory, stand (8, 7).
    const own = patchTile(
      patchTile(
        field([
          { seat: 0, role: "CATAPULT", at: { x: 6, y: 7 } },
          { seat: 1, role: "GUARD", at: { x: 9, y: 7 } },
        ]),
        { x: 8, y: 7 },
        { fieldDefense: true },
      ),
      { x: 9, y: 7 },
      { fieldDefense: true },
    );
    const run = stampede(own, { x: 6, y: 7 }, { x: 9, y: 7 });
    expect(run.preview.fieldDefenseDestroyed).toEqual([{ x: 9, y: 7 }]);
    expect(run.preview.combat.fortificationLevel).toBe(0);
    expect(
      run.state.board.tiles
        .filter((tile) => tile.fieldDefense)
        .map((tile) => tile.at),
    ).toEqual([{ x: 8, y: 7 }]);
  });

  it("leaves the Triceratops with its Move and primary action used", () => {
    const state = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "GUARD", at: { x: 6, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 6, y: 5 } },
    ]);
    const run = stampede(state, T, { x: 6, y: 3 });
    expect(run.triceratops?.activation).toMatchObject({
      moved: true,
      movedPathLength: 2,
      attacked: true,
      attacksUsed: 1,
      handled: true,
      overrunActive: false,
    });
    const id = run.triceratops?.id;
    expect(
      queryPlayerCommandsV7(run.state, state.humanPlayerId).filter(
        (candidate) => "unitId" in candidate && candidate.unitId === id,
      ),
    ).toEqual([]);
    // Ready again at the owner's next Start Turn.
    const next = endTurnUntilV7(run.state, state.humanPlayerId).state;
    expect(next.units.find((unit) => unit.id === id)?.activation).toMatchObject(
      { moved: false, attacked: false, handled: false },
    );
  });
});

describe("ruleset-7 revision-19 Stampede push and advance (section 7.3)", () => {
  const far = { x: 6, y: 3 } as const;
  const stand = { x: 5, y: 3 } as const;
  const behind = { x: 7, y: 3 } as const;
  const base = (
    extra: readonly GoblinPieceV7[] = [],
    options: FieldOptionsV7 = {},
    hp?: number,
  ): GameStateV7 =>
    field(
      [
        { seat: 0, role: "CATAPULT", at: T },
        {
          seat: 1,
          role: "GUARD",
          at: far,
          ...(hp === undefined ? {} : { hp }),
        },
        ...extra,
      ],
      options,
    );
  const stays = (run: StampedeRunV7): void => {
    expect(run.preview.pushTo).toBeNull();
    expect(run.preview.endsAt).toEqual(stand);
    expect(run.target?.at).toEqual(far);
    expect(run.triceratops?.at).toEqual(stand);
    expect(kinds(run.events)).not.toContain("UNIT_PUSHED");
    expect(
      run.events.filter((event) => event.kind === "UNIT_MOVED"),
    ).toHaveLength(1);
  };

  it("advances onto the tile of a target that dies, with or without a Grave", () => {
    const nothing = stampede(base([], {}, 1), T, far);
    expect(nothing.target).toBeUndefined();
    expect(nothing.triceratops?.at).toEqual(far);
    expect(nothing.state.graves).toEqual([]);
    const grave = stampede(
      base([], { factions: ["DINOSAUR", "UNDEAD"] }, 1),
      T,
      far,
    );
    expect(grave.state.graves).toEqual([far]);
    expect(grave.triceratops?.at).toEqual(far);
    expect(kinds(grave.events)).toEqual([
      "UNIT_MOVED",
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "GRAVE_CREATED",
      "UNIT_GREW",
      "UNIT_MOVED",
    ]);
  });

  it("stays on the stand tile when a Bitten target rises in place", () => {
    // Three seats: the Dinosaur (seat 0) kills a Human Guard (seat 1) that
    // an Undead Zombie (seat 2) had bitten.
    const arena = field(
      [
        { seat: 0, role: "CATAPULT", at: { x: 5, y: 6 } },
        { seat: 1, role: "GUARD", at: { x: 8, y: 6 }, hp: 1 },
        { seat: 2, role: "GUARD", at: { x: 9, y: 9 } },
      ],
      { factions: ["DINOSAUR", "ORIGINAL", "UNDEAD"] },
    );
    const zombie = unitAtV7(arena, { x: 9, y: 9 });
    const victim = unitAtV7(arena, { x: 8, y: 6 });
    const state = checkedV7({
      ...arena,
      bitten: [
        {
          unitId: victim.id,
          biterPlayerId: zombie.ownerId,
          biterUnitId: zombie.id,
        },
      ],
    });
    const run = stampede(state, { x: 5, y: 6 }, { x: 8, y: 6 });
    expect(run.preview.combat).toMatchObject({
      defenderDies: true,
      defenderBittenRises: true,
      advances: false,
    });
    expect(run.triceratops?.at).toEqual({ x: 7, y: 6 });
    expect(unitAtV7(run.state, { x: 8, y: 6 })).toMatchObject({
      ownerId: zombie.ownerId,
      role: "GUARD",
      hp: 10,
    });
    expect(kinds(run.events).slice(0, 5)).toEqual([
      "UNIT_MOVED",
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "BITTEN_UNIT_RISEN",
      "UNIT_GREW",
    ]);
    // The kill still counts for growth.
    expect(run.triceratops).toMatchObject({ kills: 1, maxHp: 22 });
  });

  it("stays on the stand tile when the target dies on a Mountain and the actor has no Engineering", () => {
    const peak = (techs: readonly TechnologyIdV7[]): GameStateV7 =>
      mountain(base([], { techs: { 0: techs } }, 1), far);
    const blocked = stampede(peak(without("ENGINEERING")), T, far);
    expect(blocked.preview.combat).toMatchObject({
      defenderDies: true,
      advances: false,
    });
    expect(blocked.target).toBeUndefined();
    expect(blocked.triceratops?.at).toEqual(stand);
    const climbs = stampede(peak(TECHNOLOGY_IDS_V7), T, far);
    expect(climbs.triceratops?.at).toEqual(far);
  });

  it("pushes a survivor one tile along the lane and follows", () => {
    const run = stampede(base(), T, far);
    expect(run.preview).toMatchObject({ pushTo: behind, endsAt: far });
    expect(run.target).toMatchObject({ at: behind, hp: 1 });
    expect(run.triceratops?.at).toEqual(far);
    expect(run.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: unitAtV7(run.before, T).id,
      targetUnitId: unitAtV7(run.before, far).id,
      from: far,
      to: behind,
    });
    // A pushed target keeps its activation; statuses stay with it.
    expect(run.target?.activation).toEqual(
      unitAtV7(run.before, far).activation,
    );
  });

  it("pushes a defender off a village center and stands on it", () => {
    // Triceratops (5, 2), stand (5, 4), target on the village (5, 5).
    const state = field([
      { seat: 0, role: "CATAPULT", at: { x: 5, y: 2 } },
      { seat: 1, role: "GUARD", at: { x: 5, y: 5 }, captureEligible: true },
    ]);
    const run = stampede(state, { x: 5, y: 2 }, { x: 5, y: 5 });
    expect(run.target).toMatchObject({
      at: { x: 5, y: 6 },
      captureEligible: false,
    });
    expect(run.triceratops).toMatchObject({
      at: { x: 5, y: 5 },
      captureEligible: false,
    });
    expect(kinds(run.events)).not.toContain("CITY_CAPTURED");
    expect(run.state.cities).toEqual(state.cities);
  });

  it("leaves the target in place when the tile behind it is off the board", () => {
    const edge = field([
      { seat: 0, role: "CATAPULT", at: { x: 3, y: 3 } },
      { seat: 1, role: "GUARD", at: { x: 0, y: 3 } },
    ]);
    const run = stampede(edge, { x: 3, y: 3 }, { x: 0, y: 3 });
    expect(run.preview.combat.push).toBe("BLOCKED");
    expect(run.target?.at).toEqual({ x: 0, y: 3 });
    expect(run.triceratops?.at).toEqual({ x: 1, y: 3 });
  });

  it("leaves the target in place when the tile behind it is water, occupied, or a settlement center", () => {
    stays(stampede(base([], { water: [behind] }), T, far));
    stays(stampede(base([{ seat: 1, role: "FIGHTER", at: behind }]), T, far));
    stays(stampede(base([{ seat: 0, role: "FIGHTER", at: behind }]), T, far));
    // An Egg behind the target: (7, 7) is a nest tile of the capital (8, 8).
    const egg = field(
      [
        { seat: 0, role: "CATAPULT", at: { x: 3, y: 7 } },
        { seat: 1, role: "GUARD", at: { x: 6, y: 7 } },
      ],
      { eggs: [{ seat: 0, role: "RAIDER", at: { x: 7, y: 7 } }] },
    );
    const blocked = stampede(egg, { x: 3, y: 7 }, { x: 6, y: 7 });
    expect(blocked.preview.combat.push).toBe("BLOCKED");
    expect(blocked.target?.at).toEqual({ x: 6, y: 7 });
    expect(blocked.triceratops?.at).toEqual({ x: 5, y: 7 });
    // A village center (8, 5), a capital (8, 8), behind the target.
    for (const [from, to] of [
      [
        { x: 4, y: 5 },
        { x: 7, y: 5 },
      ],
      [
        { x: 8, y: 4 },
        { x: 8, y: 7 },
      ],
    ] as const) {
      const site = field([
        { seat: 0, role: "CATAPULT", at: from },
        { seat: 1, role: "GUARD", at: to },
      ]);
      const run = stampede(site, from, to);
      expect(run.preview.combat.push).toBe("BLOCKED");
      expect(run.target?.at).toEqual(to);
      expect(kinds(run.events)).not.toContain("UNIT_PUSHED");
    }
  });

  it("pushes onto a Mountain only when the target's owner has Engineering", () => {
    const peak = (techs: readonly TechnologyIdV7[]): GameStateV7 =>
      mountain(base([], { techs: { 1: techs } }), behind);
    const noEngineering = peak(without("ENGINEERING"));
    const run = stampede(noEngineering, T, far);
    // The viewer cannot know the other player's Engineering.
    expect(run.preview.combat.push).toBe("UNKNOWN_BEHIND_FOG");
    expect(run.preview.pushTo).toBeNull();
    expect(
      estimateCombatV7(
        checkedV7({
          ...noEngineering,
          units: noEngineering.units.map((unit) =>
            sameV7(unit.at, T) ? { ...unit, at: stand } : unit,
          ),
        }),
        unitAtV7(noEngineering, T).id,
        unitAtV7(noEngineering, far).id,
      ),
    ).toMatchObject({ push: "BLOCKED" });
    expect(run.target?.at).toEqual(far);
    expect(run.triceratops?.at).toEqual(stand);
    expect(kinds(run.events)).not.toContain("UNIT_PUSHED");
    const engineered = stampede(peak(TECHNOLOGY_IDS_V7), T, far);
    expect(engineered.target?.at).toEqual(behind);
    expect(engineered.triceratops?.at).toEqual(far);
  });

  it("leaves the target in place when the tile behind it is unexplored by the actor", () => {
    const run = stampede(unexplore(base(), 0, [behind]), T, far);
    expect(run.preview.combat.push).toBe("UNKNOWN_BEHIND_FOG");
    stays(run);
  });

  it("leaves the target in place when the tile behind it is territory allied to the target", () => {
    // Cooperative AIs: the Human (seat 0, Dinosaur) hits seat 1's Guard at
    // (9, 3); behind it (10, 3) is the territory of seat 2, seat 1's ally.
    const state = field(
      [
        { seat: 0, role: "CATAPULT", at: { x: 6, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 9, y: 3 } },
      ],
      {
        factions: ["DINOSAUR", "ORIGINAL", "ORIGINAL"],
        aiMode: "COOPERATIVE",
      },
    );
    expect(
      state.board.tiles.find((tile) => sameV7(tile.at, { x: 10, y: 3 }))
        ?.territoryCityId,
    ).toBe(cityOfV7(state, 2).id);
    const run = stampede(state, { x: 6, y: 3 }, { x: 9, y: 3 });
    expect(run.preview.combat.push).toBe("BLOCKED");
    expect(run.target?.at).toEqual({ x: 9, y: 3 });
    expect(run.triceratops?.at).toEqual({ x: 8, y: 3 });
  });

  it("damages an Egg without pushing it, and advances when it destroys one", () => {
    // Seat 1 Dinosaur Eggs on nest tiles of its capital (2, 8).
    const make = (egg: Partial<EggPieceV7>): GameStateV7 =>
      field([{ seat: 0, role: "CATAPULT", at: { x: 6, y: 7 } }], {
        factions: ["DINOSAUR", "DINOSAUR"],
        eggs: [{ seat: 1, role: "KNIGHT", at: { x: 3, y: 7 }, ...egg }],
      });
    // A wounded Triceratops only cracks the Nesting Egg.
    const weak = checkedV7({
      ...make({ maxHp: 10 }),
      units: make({ maxHp: 10 }).units.map((unit) =>
        unit.role === "CATAPULT" ? { ...unit, hp: 2 } : unit,
      ),
    });
    const cracked = stampede(weak, { x: 6, y: 7 }, { x: 3, y: 7 });
    expect(cracked.preview.combat).toMatchObject({
      defense2: 2,
      defenderDies: false,
      push: "BLOCKED",
      advances: false,
      noRetaliationReason: "STAMPEDE",
    });
    expect(cracked.target).toMatchObject({ form: "EGG", at: { x: 3, y: 7 } });
    expect(cracked.target?.hp).toBeLessThan(10);
    expect(cracked.triceratops?.at).toEqual({ x: 4, y: 7 });
    expect(cracked.state.eggs).toHaveLength(1);
    const smashed = stampede(make({}), { x: 6, y: 7 }, { x: 3, y: 7 });
    expect(smashed.preview.combat).toMatchObject({
      defenderDies: true,
      advances: true,
    });
    expect(smashed.state.eggs).toEqual([]);
    expect(smashed.state.graves).toEqual([]);
    expect(smashed.triceratops).toMatchObject({
      at: { x: 3, y: 7 },
      kills: 1,
      maxHp: 22,
    });
  });

  it("pushes a survivor off a Mountain it cannot climb and stays on the stand tile", () => {
    const peak = (techs: readonly TechnologyIdV7[]): GameStateV7 =>
      mountain(base([], { techs: { 0: techs } }), far);
    const run = stampede(peak(without("ENGINEERING")), T, far);
    expect(run.preview.combat).toMatchObject({
      push: "WILL_PUSH",
      advances: false,
    });
    expect(run.preview).toMatchObject({ pushTo: behind, endsAt: stand });
    expect(run.target?.at).toEqual(behind);
    expect(run.triceratops?.at).toEqual(stand);
    const follows = stampede(peak(TECHNOLOGY_IDS_V7), T, far);
    expect(follows.triceratops?.at).toEqual(far);
  });
});

describe("ruleset-7 revision-19 Stampede events, chains, and growth", () => {
  it("emits the events in the section 7.4 order", () => {
    // Triceratops (0, 5) runs (1, 6), (2, 7) and hits a 1-HP Bomb Chucker at
    // (3, 8). Both seat-1 tiles are fortified. Its death blast (2) hits the
    // advanced Triceratops and kills a 1-HP Caveman next to it, which earns
    // the Goblin Plunder. (4, 9) is unexplored until the advance.
    const from = { x: 0, y: 5 };
    const stand = { x: 2, y: 7 };
    const to = { x: 3, y: 8 };
    const arena = field(
      [
        { seat: 0, role: "CATAPULT", at: from },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 7 }, hp: 1 },
        { seat: 1, role: "MARKSMAN", at: to, hp: 1 },
      ],
      { factions: ["DINOSAUR", "GOBLIN"], coins: 10 },
    );
    const state = unexplore(
      patchTile(patchTile(arena, stand, { fieldDefense: true }), to, {
        fieldDefense: true,
      }),
      0,
      [{ x: 4, y: 9 }],
    );
    const actor = state.humanPlayerId;
    const goblinId = seatIdV7(state, 1);
    const triceratops = unitAtV7(state, from);
    const chucker = unitAtV7(state, to);
    const caveman = unitAtV7(state, { x: 4, y: 7 });
    const run = stampede(state, from, to);
    expect(kinds(run.events)).toEqual([
      "UNIT_MOVED",
      "FIELD_DEFENSE_DESTROYED",
      "COMBAT_RESOLVED",
      "FIELD_DEFENSE_DESTROYED",
      "UNIT_DIED",
      "UNIT_GREW",
      "UNIT_MOVED",
      "EXPLOSION_RESOLVED",
      "UNIT_DIED",
      "PLUNDER_AWARDED",
      "TILES_REVEALED",
    ]);
    expect(run.events[0]).toEqual({
      kind: "UNIT_MOVED",
      unitId: triceratops.id,
      path: [{ x: 1, y: 6 }, stand],
    });
    expect(run.events[4]).toEqual({
      kind: "UNIT_DIED",
      unitId: chucker.id,
      cause: "ATTACK",
    });
    // Growth before the advance and the chain: Big, +4 HP.
    expect(run.events[5]).toEqual({
      kind: "UNIT_GREW",
      unitId: triceratops.id,
      stage: 1,
      maxHp: 22,
      hp: 22,
    });
    expect(run.events[6]).toEqual({
      kind: "UNIT_MOVED",
      unitId: triceratops.id,
      path: [to],
    });
    // The blast hits the Triceratops on the tile it advanced onto.
    expect(run.events[7]).toMatchObject({
      kind: "EXPLOSION_RESOLVED",
      unitId: chucker.id,
      at: to,
      damage: 2,
      results: [
        { unitId: caveman.id, damage: 1, dies: true },
        { unitId: triceratops.id, at: to, damage: 2, dies: false },
      ],
    });
    expect(run.events[8]).toEqual({
      kind: "UNIT_DIED",
      unitId: caveman.id,
      cause: "EXPLOSION",
    });
    expect(run.events[9]).toEqual({
      kind: "PLUNDER_AWARDED",
      playerId: goblinId,
      kills: 1,
      coins: 1,
    });
    expect(run.events[10]).toEqual({
      kind: "TILES_REVEALED",
      playerId: actor,
      tiles: [{ x: 4, y: 9 }],
    });
    expect(run.triceratops).toMatchObject({
      at: to,
      hp: 20,
      maxHp: 22,
      kills: 1,
    });
    expect(run.preview.explosions).toMatchObject({
      attackerId: triceratops.id,
      targetUnitId: chucker.id,
      touchesUnexplored: true,
      totals: { friendlyKills: 1, friendlyDamage: 3 },
    });
    // The other player sees the run, the hit, and the deaths.
    const seen = projectEventsV7(state, run.state, goblinId, run.events).events;
    const seenKinds = seen.map((event) => event.kind);
    expect(seenKinds).toContain("COMBAT_RESOLVED");
    expect(seenKinds).toContain("EXPLOSION_RESOLVED");
  });

  it("pushes a survivor without any chain", () => {
    // A Rocket Cart that survives is pushed; nothing explodes.
    const state = field(
      [
        { seat: 0, role: "CATAPULT", at: T, hp: 1 },
        { seat: 1, role: "KNIGHT", at: { x: 6, y: 3 } },
      ],
      { factions: ["DINOSAUR", "GOBLIN"] },
    );
    const run = stampede(state, T, { x: 6, y: 3 });
    expect(run.preview.combat.defenderDies).toBe(false);
    expect(run.preview.explosions.explosions).toEqual([]);
    expect(kinds(run.events)).toEqual([
      "UNIT_MOVED",
      "COMBAT_RESOLVED",
      "UNIT_PUSHED",
      "UNIT_MOVED",
    ]);
    expect(run.target?.at).toEqual({ x: 7, y: 3 });
  });

  it("can die in the death blast of the unit it kills", () => {
    const state = field(
      [
        { seat: 0, role: "CATAPULT", at: T, hp: 4 },
        { seat: 1, role: "KNIGHT", at: { x: 5, y: 3 }, hp: 1 },
      ],
      { factions: ["DINOSAUR", "GOBLIN"], coins: 10 },
    );
    const run = stampede(state, T, { x: 5, y: 3 });
    // Big (+4 HP) before the Scrap Buggy's blast of 4: it survives at 4.
    expect(run.triceratops).toMatchObject({ hp: 4, maxHp: 22 });
    const doomed = field(
      [
        { seat: 0, role: "CATAPULT", at: T, hp: 4 },
        { seat: 1, role: "KNIGHT", at: { x: 5, y: 3 }, hp: 1 },
      ],
      { factions: ["DINOSAUR", "GOBLIN"], coins: 10 },
    );
    const big = withKillsV7(doomed, T, 1, 4);
    const lost = stampede(big, T, { x: 5, y: 3 });
    expect(lost.triceratops).toBeUndefined();
    expect(lost.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(big, T).id,
      cause: "EXPLOSION",
    });
    expect(lost.events).toContainEqual({
      kind: "PLUNDER_AWARDED",
      playerId: seatIdV7(big, 1),
      kills: 1,
      coins: 1,
    });
  });

  it("grows from Stampede kills", () => {
    const state = withKillsV7(
      field([
        { seat: 0, role: "CATAPULT", at: T },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 }, hp: 3 },
      ]),
      T,
      2,
      10,
    );
    expect(unitAtV7(state, T)).toMatchObject({ kills: 2, maxHp: 22, hp: 10 });
    const run = stampede(state, T, { x: 5, y: 3 });
    expect(run.events).toContainEqual({
      kind: "UNIT_GREW",
      unitId: unitAtV7(state, T).id,
      stage: 2,
      maxHp: 26,
      hp: 14,
    });
    expect(run.triceratops).toMatchObject({ kills: 3, maxHp: 26, hp: 14 });
    // Never promoted.
    expect(
      queryPlayerCommandsV7(run.state, state.humanPlayerId).some(
        (candidate) => candidate.kind === "PROMOTE",
      ),
    ).toBe(false);
  });

  it("reveals the Triceratops's sight along the run and on its final tile", () => {
    const arena = field([
      { seat: 0, role: "CATAPULT", at: T },
      { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 }, hp: 1 },
    ]);
    const hidden = [
      { x: 4, y: 2 },
      { x: 6, y: 4 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
    ];
    const state = unexplore(arena, 0, hidden);
    const run = stampede(state, T, { x: 6, y: 3 });
    expect(
      run.events.filter((event) => event.kind === "TILES_REVEALED"),
    ).toEqual([
      {
        kind: "TILES_REVEALED",
        playerId: state.humanPlayerId,
        tiles: [...hidden].sort(
          (left, right) => left.y - right.y || left.x - right.x,
        ),
      },
    ]);
  });
});

describe("ruleset-7 revision-19 Stampede threat", () => {
  it("adds open lanes at distance 2 and 3 to the threatened tiles of an unmoved Triceratops", () => {
    const base = mountain(
      field(
        [
          { seat: 0, role: "CATAPULT", at: T },
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
          { seat: 1, role: "FIGHTER", at: { x: 2, y: 3 } },
          { seat: 1, role: "FIGHTER", at: { x: 9, y: 1 } },
        ],
        { activeSeat: 1 },
      ),
      { x: 3, y: 2 },
    );
    const viewer = seatIdV7(base, 1);
    const unit = unitAtV7(base, T);
    const threatened = queryThreatenedTilesV7(base, unit.id, viewer);
    const has = (at: CoordV7): boolean =>
      threatened.some((tile) => sameV7(tile, at));
    // East: an open lane at distance 2 and 3.
    expect(has({ x: 5, y: 3 })).toBe(true);
    expect(has({ x: 6, y: 3 })).toBe(true);
    // North: the first lane tile is a Mountain, so distance 3 is not reached
    // (distance 2 is inside the ordinary move-and-attack envelope).
    expect(has({ x: 3, y: 0 })).toBe(false);
    // West: a hostile unit (the viewer's) on the first lane tile.
    expect(has({ x: 0, y: 3 })).toBe(false);
    // South-east: its own unit on the first lane tile is passed at distance
    // 3 but is the stand tile at distance 2.
    expect(has({ x: 5, y: 5 })).toBe(false);
    expect(has({ x: 6, y: 6 })).toBe(true);
    // The ordinary melee reach is still there.
    expect(has({ x: 4, y: 3 })).toBe(true);
    // Unexplored lane tiles count as open for the viewer.
    const fogged = unexplore(base, 1, [
      { x: 3, y: 4 },
      { x: 3, y: 5 },
    ]);
    const foggy = queryThreatenedTilesV7(fogged, unit.id, viewer);
    expect(foggy.some((tile) => sameV7(tile, { x: 3, y: 6 }))).toBe(true);
    // A Triceratops seen to move this turn threatens no lane.
    const moved = checkedV7({
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(seatIdV7(base, 0)),
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: {
                ...candidate.activation,
                moved: true,
                movedPathLength: 1,
                handled: true,
              },
            }
          : candidate,
      ),
    });
    const after = queryThreatenedTilesV7(moved, unit.id, viewer);
    expect(after.some((tile) => sameV7(tile, { x: 6, y: 3 }))).toBe(false);
    // A Human Catapult has no lane threat beyond its range.
    expect(unitRoleRuleV7(base, unit).abilities).toContain("STAMPEDE");
  });
});

describe("ruleset-7 revision-19 Stampede previews on generated arenas", () => {
  it("previews every offered Stampede exactly and rejects every other target", () => {
    // A deterministic generator (a small LCG; no engine PRNG is involved).
    let seed = 20_261_001;
    const next = (bound: number): number => {
      seed = (Math.imul(seed, 1_103_515_245) + 12_345) >>> 0;
      return (seed >>> 8) % bound;
    };
    const roles = [
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "JUGGERNAUT",
    ] as const;
    const factions = ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"] as const;
    let offeredTotal = 0;
    let rejectedTotal = 0;
    const outcomes = new Set<string>();
    for (let arena = 0; arena < 60; arena += 1) {
      const opponent = factions[next(factions.length)] ?? "ORIGINAL";
      const used = new Set<string>();
      const free = (): CoordV7 => {
        for (;;) {
          const at = { x: next(11), y: next(7) };
          const key = `${at.x},${at.y}`;
          // Keep clear of the two village centers on rows 0-6.
          if (
            used.has(key) ||
            (at.x === 5 && at.y === 5) ||
            (at.x === 8 && at.y === 5)
          )
            continue;
          used.add(key);
          return at;
        }
      };
      const pieces: GoblinPieceV7[] = [];
      for (let index = 0; index < 2; index += 1)
        pieces.push({ seat: 0, role: "CATAPULT", at: free() });
      for (let index = 0; index < 2 + next(2); index += 1)
        pieces.push({
          seat: 0,
          role: roles[next(roles.length)] ?? "FIGHTER",
          at: free(),
        });
      for (let index = 0; index < 5 + next(4); index += 1) {
        const role = roles[next(roles.length)] ?? "FIGHTER";
        // Half of the targets are wounded, the others at full HP.
        pieces.push({
          seat: 1,
          role,
          at: free(),
          ...(next(2) === 0 ? { hp: 1 + next(6) } : {}),
        });
      }
      let state = field(pieces, {
        factions: ["DINOSAUR", opponent],
        techs: {
          0: next(2) === 0 ? TECHNOLOGY_IDS_V7 : without("ENGINEERING"),
          1: next(2) === 0 ? TECHNOLOGY_IDS_V7 : without("ENGINEERING"),
        },
      });
      // Random terrain and Field Defense on free tiles of rows 0-6.
      for (let index = 0; index < 10; index += 1) {
        const at = free();
        const kind = next(4);
        state =
          kind === 0
            ? forest(state, at)
            : kind === 1
              ? mountain(state, at)
              : kind === 2
                ? patchTile(state, at, { road: true })
                : state;
      }
      // Alpha, wounded, and Big Triceratopses.
      const [first, second] = state.units.filter(
        (unit) =>
          unit.role === "CATAPULT" && unit.ownerId === state.humanPlayerId,
      );
      if (first === undefined || second === undefined) throw new Error("setup");
      state = withKillsV7(state, first.at, next(4));
      state = checkedV7({
        ...state,
        units: state.units.map((unit) =>
          unit.id === second.id ? { ...unit, hp: 1 + next(unit.maxHp) } : unit,
        ),
      });
      // Hide a few tiles from the actor.
      state = unexplore(
        state,
        0,
        Array.from({ length: 4 }, () => ({ x: next(11), y: next(7) })).filter(
          (at) =>
            !state.units.some(
              (unit) =>
                unit.ownerId === state.humanPlayerId && sameV7(unit.at, at),
            ),
        ),
      );
      const actor = state.humanPlayerId;
      const offered = queryPlayerCommandsV7(state, actor).filter(
        (candidate) => candidate.kind === "STAMPEDE",
      );
      for (const unit of state.units.filter(
        (candidate) =>
          candidate.ownerId === actor && candidate.role === "CATAPULT",
      ))
        for (const target of state.units) {
          if (target.id === unit.id) continue;
          const order: CommandV7 = {
            kind: "STAMPEDE",
            unitId: unit.id,
            targetUnitId: target.id,
          };
          if (
            offered.some(
              (candidate) =>
                canonicalHash(candidate as never) ===
                canonicalHash(order as never),
            )
          ) {
            const run = stampede(state, unit.at, target.at);
            offeredTotal += 1;
            outcomes.add(
              run.preview.combat.defenderDies
                ? run.preview.combat.advances
                  ? "kill-advance"
                  : "kill-stay"
                : run.preview.combat.push === "WILL_PUSH"
                  ? run.preview.combat.advances
                    ? "push-follow"
                    : "push-stay"
                  : run.preview.combat.push,
            );
          } else {
            const result = applyCommandV7(state, actor, order);
            expect(result.accepted).toBe(false);
            expect(
              previewStampedeV7(viewForV7(state, actor), unit.id, target.id),
            ).toBeNull();
            rejectedTotal += 1;
          }
        }
    }
    expect(offeredTotal).toBeGreaterThan(40);
    expect(rejectedTotal).toBeGreaterThan(200);
    for (const outcome of ["kill-advance", "push-follow", "BLOCKED"])
      expect([...outcomes]).toContain(outcome);
  });
});
