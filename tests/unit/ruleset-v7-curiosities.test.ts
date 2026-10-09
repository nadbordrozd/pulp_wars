import { describe, expect, it } from "vitest";
import {
  FOUNTAIN_HEAL_V7,
  PROMOTION_HP_V7,
  WRECK_COINS_V7,
  applyCommandV7,
  canonicalHash,
  createInitialMapStateV7,
  curiosityRandomStateV7,
  curiosityTargetCountV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  validateMatchSetupV7,
  viewForV7,
  type CoordV7,
  type CuriosityV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { expectInitialScoreLedgerV7 } from "../fixtures/v7-score-ledger";
import { checkedV7 } from "../fixtures/v7-builders";
import { createRevision39MapStateV7 } from "../fixtures/v7-revision13-map";
import { CURIOSITY_MAP_TYPES_V7 } from "../fixtures/v7-curiosity-generation";
import {
  applyOkV7,
  goblinArenaV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  generatedSetup,
  normalizedInitialState,
} from "./ruleset-v7-curiosities.shared";

// Map curiosities, engine I (`pulp_wars-737.2`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 3 to 7, 10, and 13):
// the setup option, placement on its own stream after the Rifts, the
// byte-identical "off" parity with the 7r34 generator and matches, the
// Fountain of Youth, the Shrine, and the Sunken Wreck with their events,
// projection, view, and persistence. The on/off generation check of 150
// boards is in `ruleset-v7-curiosity-generation.test.ts`
// (`pulp_wars-737.8`).

const at = (x: number, y: number): CoordV7 => ({ x, y });
// The arena players have explored the whole board, so a Move unlocks
// Explorer; achievements are left out of the event kinds compared here.
const kinds = (events: readonly DomainEventV7[]) =>
  events
    .map((event) => event.kind)
    .filter((kind) => kind !== "ACHIEVEMENT_UNLOCKED");

const MAP_TYPES = CURIOSITY_MAP_TYPES_V7;

// --------------------------------------------------------- Arena ---
// The two-seat 11 x 11 revision-13 board of `goblinArenaV7`: capitals
// (8, 8) and (2, 8), villages (5, 5), (8, 5), and (5, 8). Every curiosity
// tile below is off the edge ring and 3 or more from every center.
const FOUNTAIN = at(2, 3);
const SHRINE = at(7, 2);
const WRECK = at(4, 1);
const WATER = [at(2, 1), at(3, 1), at(4, 1), at(5, 1), at(6, 1)];

/**
 * The arena with the option on and `curiosities` on their tiles (Grass for
 * a Fountain or Shrine, unless `forest`; Water tiles must be in `water`);
 * `grass` clears more tiles to plain Grass.
 */
function curiosityArena(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  curiosities: readonly CuriosityV7[],
  options: GoblinArenaOptionsV7 & { readonly grass?: readonly CoordV7[] } = {},
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, options);
  const same = (a: CoordV7, b: CoordV7) => a.x === b.x && a.y === b.y;
  const cleared = [
    ...curiosities
      .filter((curiosity) => curiosity.kind !== "WRECK")
      .map((curiosity) => curiosity.at),
    ...(options.grass ?? []),
  ];
  return checkedV7({
    ...base,
    setup: { ...base.setup, curiosities: true },
    curiosities: [...curiosities].sort(
      (a, b) => a.at.y - b.at.y || a.at.x - b.at.x,
    ),
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((where) => same(where, chest)),
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        cleared.some((where) => same(where, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
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
}

function playerOfSeat(state: GameStateV7, seat: number): PlayerId {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (player === undefined) throw new Error("seat missing");
  return player.id;
}

/** Ends seat 0's turn and then seat 1's; returns both batches. */
function aroundTheTable(state: GameStateV7): {
  readonly afterSeat0: GameStateV7;
  readonly seat1Start: readonly DomainEventV7[];
  readonly seat0Start: readonly DomainEventV7[];
  readonly state: GameStateV7;
} {
  const first = applyOkV7(state, playerOfSeat(state, 0), { kind: "END_TURN" });
  const second = applyOkV7(first.state, playerOfSeat(state, 1), {
    kind: "END_TURN",
  });
  return {
    afterSeat0: first.state,
    seat1Start: first.events,
    seat0Start: second.events,
    state: second.state,
  };
}

function move(
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  return applyOkV7(state, playerOfSeat(state, 0), {
    kind: "MOVE",
    unitId: unitAtV7(state, from).id,
    path: [...path],
  });
}

// --------------------------------------------------------- Setup ---

describe("the Curiosities setup option (section 3)", () => {
  it("is a required boolean key; missing, non-boolean, or extra keys are refused", () => {
    const setup = generatedSetup(1, "CONTINENTS", 16, 1, true);
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    expect(parseMatchSetupV7({ ...setup, curiosities: false })).toEqual({
      ...setup,
      curiosities: false,
    });
    const { curiosities: _omitted, ...missing } = setup;
    void _omitted;
    for (const bad of [
      missing,
      { ...setup, curiosities: "on" },
      { ...setup, curiosities: 1 },
      { ...setup, curiosities: null },
      { ...setup, monsters: true },
    ])
      expect(validateMatchSetupV7(bad)).toEqual({
        ok: false,
        error: { code: "INVALID_SETUP", params: {} },
      });
  });

  it("never gives the Showcase or a mission any curiosity; a mission setup is always `false`", () => {
    for (const curiosities of [true, false]) {
      const showcase = createInitialMapStateV7({
        ...generatedSetup(0, "SHOWCASE", 16, 3, curiosities),
      });
      if (!showcase.ok) throw new Error(showcase.error.code);
      expect(showcase.state.setup.curiosities).toBe(curiosities);
      expect(showcase.state.curiosities).toEqual([]);
    }
    const mission = missionByIdV7("TEST_GROUNDS");
    if (mission === null) throw new Error("TEST_GROUNDS missing");
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no mission setup");
    expect(setup.curiosities).toBe(false);
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    expect(validateMatchSetupV7({ ...setup, curiosities: true })).toEqual({
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    });
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.curiosities).toEqual([]);
  });
});

// ---------------------------------------------------- Generation ---

const PARITY_SETUPS: readonly (readonly [
  MatchSetupV7["width"],
  MatchSetupV7["aiCount"],
])[] = [
  [11, 1],
  [14, 1],
  [14, 2],
  [16, 1],
  [16, 2],
  [16, 3],
  [20, 1],
  [20, 2],
  [20, 3],
  [25, 1],
  [25, 2],
  [25, 3],
];

describe("generation (section 4)", () => {
  it("with the option off the 7r39 parity generator reproduces the 7r34 initial state of every map type and size, seeds 0-3 (pinned on main)", () => {
    // Computed on main at 7r34 (8540406a) with the same setups (no
    // `curiosities` key then): the canonical hash, per cell, of the initial
    // state without its identity, and the hash of that table. The village
    // density (`pulp_wars-ykw.2`, 7r40) regenerates every board; the parity
    // rules (`CURIOSITIES` with the 7r39 village table) still reproduce
    // these states byte for byte.
    const table: Record<string, string> = {};
    for (const mapType of MAP_TYPES)
      for (const [width, aiCount] of PARITY_SETUPS)
        for (let seed = 0; seed < 4; seed += 1) {
          const created = createRevision39MapStateV7(
            generatedSetup(seed, mapType, width, aiCount, false),
          );
          if (!created.ok) throw new Error(created.error.code);
          expect(created.state.curiosities).toEqual([]);
          expectInitialScoreLedgerV7(created.state);
          table[`state/${mapType}/${width}/${aiCount}/${seed}`] =
            normalizedInitialState(created.state);
        }
    expect(Object.keys(table)).toHaveLength(240);
    expect(canonicalHash(table)).toBe(
      "aaa493b50970e685a12765aa75fbfd64ea8756bc0fc17006ec325358f2d7c35d",
    );
  }, 300_000);

  it("draws the target count from its own stream (section 4.2)", () => {
    const tally = (width: number) => {
      const result = [0, 0, 0];
      for (let seed = 0; seed < 300; seed += 1) {
        const { count } = curiosityTargetCountV7(
          width,
          curiosityRandomStateV7(seed),
        );
        result[count] = (result[count] ?? 0) + 1;
      }
      return result;
    };
    const eleven = tally(11);
    expect(eleven[2]).toBe(0);
    expect((eleven[1] ?? 0) / 300).toBeGreaterThan(0.25);
    expect((eleven[1] ?? 0) / 300).toBeLessThan(0.42);
    const fourteen = tally(14);
    expect((fourteen[1] ?? 0) / 300).toBeGreaterThan(0.4);
    expect((fourteen[1] ?? 0) / 300).toBeLessThan(0.6);
    expect(tally(16)).toEqual([0, 300, 0]);
    const twenty = tally(20);
    expect(twenty[0]).toBe(0);
    expect((twenty[2] ?? 0) / 300).toBeGreaterThan(0.4);
    expect((twenty[2] ?? 0) / 300).toBeLessThan(0.6);
    expect(tally(25)).toEqual([0, 0, 300]);
  });
});

// ------------------------------------------------------ Headless ---

// ------------------------------------------------------ Fountain ---

describe("the Fountain of Youth (section 5)", () => {
  it("heals its owner's unit 12 at Start Turn, or to full", () => {
    const state = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "GUARD", at: FOUNTAIN, hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(9, 2) },
      ],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const round = aroundTheTable(state);
    const before = unitAtV7(round.afterSeat0, FOUNTAIN);
    expect(before.maxHp - before.hp).toBeGreaterThan(FOUNTAIN_HEAL_V7);
    const healed = round.seat0Start.filter(
      (event) => event.kind === "FOUNTAIN_HEALED",
    );
    expect(healed).toEqual([
      {
        kind: "FOUNTAIN_HEALED",
        playerId: playerOfSeat(state, 0),
        unitId: before.id,
        at: FOUNTAIN,
        amount: FOUNTAIN_HEAL_V7,
        hpAfter: before.hp + FOUNTAIN_HEAL_V7,
      },
    ]);
    expect(unitAtV7(round.state, FOUNTAIN).hp).toBe(
      before.hp + FOUNTAIN_HEAL_V7,
    );
    // A small wound heals to full; a full unit gets no event.
    const light = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "FIGHTER", at: FOUNTAIN, hp: 7 }],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const lightRound = aroundTheTable(light);
    const fighter = unitAtV7(lightRound.state, FOUNTAIN);
    expect(fighter.hp).toBe(fighter.maxHp);
    expect(kinds(lightRound.seat0Start)).toContain("FOUNTAIN_HEALED");
    const fresh = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "FIGHTER", at: FOUNTAIN }],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    expect(kinds(aroundTheTable(fresh).seat0Start)).not.toContain(
      "FOUNTAIN_HEALED",
    );
    // The Fountain stays (it is never claimed).
    expect(round.state.curiosities).toEqual([
      { kind: "FOUNTAIN", at: FOUNTAIN },
    ]);
  });

  it("heals only the active player's unit, never a construct, and only from Start Turn", () => {
    // An enemy unit on the Fountain heals at its own Start Turn only.
    const enemy = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 1, role: "FIGHTER", at: FOUNTAIN, hp: 3 }],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const round = aroundTheTable(enemy);
    expect(
      round.seat1Start.filter((event) => event.kind === "FOUNTAIN_HEALED"),
    ).toMatchObject([{ playerId: playerOfSeat(enemy, 1) }]);
    expect(kinds(round.seat0Start)).not.toContain("FOUNTAIN_HEALED");
    // The Dwarf Clockwork Gunner is a construct: no Fountain heal.
    const gunner = curiosityArena(
      ["DWARF", "ORIGINAL"],
      [{ seat: 0, role: "MARKSMAN", at: FOUNTAIN, hp: 3 }],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const gunnerRound = aroundTheTable(gunner);
    expect(kinds(gunnerRound.seat0Start)).not.toContain("FOUNTAIN_HEALED");
    // Moving onto the Fountain does nothing by itself.
    const walker = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "FIGHTER", at: at(2, 4), hp: 3 }],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const moved = move(walker, at(2, 4), [FOUNTAIN]);
    expect(kinds(moved.events)).toEqual(["UNIT_MOVED"]);
    expect(unitAtV7(moved.state, FOUNTAIN).hp).toBe(3);
  });

  it("follows Windmill healing and Plague and precedes Troll regeneration", () => {
    const troll = curiosityArena(
      ["GOBLIN", "ORIGINAL"],
      [{ seat: 0, role: "JUGGERNAUT", at: FOUNTAIN, hp: 10 }],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const trollKinds = kinds(aroundTheTable(troll).seat0Start);
    expect(trollKinds.indexOf("FOUNTAIN_HEALED")).toBeGreaterThan(
      trollKinds.indexOf("TURN_STARTED"),
    );
    expect(trollKinds.indexOf("FOUNTAIN_HEALED")).toBeLessThan(
      trollKinds.indexOf("UNITS_REGENERATED"),
    );
    // A plagued unit on the Fountain loses 2 first, then heals.
    const plagued = curiosityArena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: FOUNTAIN, hp: 8 },
        { seat: 1, role: "CATAPULT", at: at(9, 2) },
      ],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    const fighter = unitAtV7(plagued, FOUNTAIN);
    const lich = unitAtV7(plagued, at(9, 2));
    const sick = checkedV7({
      ...plagued,
      plagued: [
        { unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining: 2 },
      ],
    });
    const round = aroundTheTable(sick);
    const order = kinds(round.seat0Start);
    expect(order.indexOf("PLAGUE_DAMAGED")).toBeGreaterThan(-1);
    expect(order.indexOf("PLAGUE_DAMAGED")).toBeLessThan(
      order.indexOf("FOUNTAIN_HEALED"),
    );
    const heal = round.seat0Start.find(
      (event) => event.kind === "FOUNTAIN_HEALED",
    );
    expect(heal).toMatchObject({ hpAfter: fighter.maxHp });
    // Plague stays: the Fountain cures nothing.
    expect(round.state.plagued.map((entry) => entry.unitId)).toContain(
      fighter.id,
    );
  });
});

// -------------------------------------------------------- Shrine ---

describe("the Shrine (section 6)", () => {
  it("promotes the first eligible unit that ends a Move on it, and is gone", () => {
    const state = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "FIGHTER", at: at(7, 3), hp: 4 }],
      [{ kind: "SHRINE", at: SHRINE }],
    );
    const before = unitAtV7(state, at(7, 3));
    const result = move(state, at(7, 3), [SHRINE]);
    const unit = unitAtV7(result.state, SHRINE);
    expect(kinds(result.events)).toEqual([
      "UNIT_MOVED",
      "SHRINE_CLAIMED",
      "UNIT_PROMOTED",
    ]);
    expect(result.events.slice(1, 3)).toEqual([
      {
        kind: "SHRINE_CLAIMED",
        playerId: playerOfSeat(state, 0),
        unitId: before.id,
        at: SHRINE,
      },
      {
        kind: "UNIT_PROMOTED",
        unitId: before.id,
        maxHp: before.maxHp + PROMOTION_HP_V7,
      },
    ]);
    expect(unit).toMatchObject({
      veteran: true,
      maxHp: before.maxHp + PROMOTION_HP_V7,
      hp: before.maxHp + PROMOTION_HP_V7,
      kills: 0,
    });
    expect(unit.activation.moved).toBe(true);
    expect(result.state.curiosities).toEqual([]);
    // It can never Promote again.
    expect(
      queryPlayerCommandsV7(result.state, playerOfSeat(state, 0)).some(
        (command) => command.kind === "PROMOTE",
      ),
    ).toBe(false);
    expect(
      applyCommandV7(result.state, playerOfSeat(state, 0), {
        kind: "PROMOTE",
        unitId: unit.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "PROMOTION_NOT_ELIGIBLE" },
    });
    // A Shrine veteran with no kills persists. (Before tuning 4 such a
    // veteran did not parse without the option; a Barracks Drill promotes
    // without the kills too, in any match.)
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
  });

  it("is not claimed by a veteran, a growing Dinosaur, or a unit passing over it", () => {
    // A veteran stands on it and leaves it.
    const veteranState = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "FIGHTER", at: at(7, 3) }],
      [{ kind: "SHRINE", at: SHRINE }],
    );
    const fighter = unitAtV7(veteranState, at(7, 3));
    const veteran = checkedV7({
      ...veteranState,
      units: veteranState.units.map((unit) =>
        unit.id === fighter.id
          ? {
              ...unit,
              veteran: true,
              kills: 3,
              maxHp: unit.maxHp + PROMOTION_HP_V7,
              hp: unit.maxHp + PROMOTION_HP_V7,
            }
          : unit,
      ),
    });
    const stood = move(veteran, at(7, 3), [SHRINE]);
    expect(kinds(stood.events)).toEqual(["UNIT_MOVED"]);
    expect(stood.state.curiosities).toEqual([{ kind: "SHRINE", at: SHRINE }]);
    // A Raptor grows instead; a Caveman claims it.
    const dinosaurs = curiosityArena(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: at(7, 3) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
      ],
      [{ kind: "SHRINE", at: SHRINE }],
    );
    const raptor = move(dinosaurs, at(7, 3), [SHRINE]);
    expect(kinds(raptor.events)).not.toContain("SHRINE_CLAIMED");
    expect(unitAtV7(raptor.state, SHRINE).veteran).toBe(false);
    expect(raptor.state.curiosities).toEqual([{ kind: "SHRINE", at: SHRINE }]);
    const caveman = move(dinosaurs, at(6, 3), [SHRINE]);
    expect(kinds(caveman.events)).toContain("SHRINE_CLAIMED");
    expect(unitAtV7(caveman.state, SHRINE).veteran).toBe(true);
    // A Raider passing over the Shrine claims nothing.
    const passing = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "RAIDER", at: at(7, 3) }],
      [{ kind: "SHRINE", at: SHRINE }],
      { grass: [at(6, 2)] },
    );
    const passed = move(passing, at(7, 3), [SHRINE, at(6, 2)]);
    expect(kinds(passed.events)).toEqual(["UNIT_MOVED"]);
    expect(passed.state.curiosities).toEqual([{ kind: "SHRINE", at: SHRINE }]);
  });
});

// --------------------------------------------------------- Wreck ---

describe("the Sunken Wreck (section 7)", () => {
  const wreckArena = (
    factions: readonly FactionIdV7[],
    pieces: readonly GoblinPieceV7[],
  ) =>
    curiosityArena(factions, pieces, [{ kind: "WRECK", at: WRECK }], {
      water: WATER,
    });

  it("pays 8 Coins to the first afloat unit that ends a Move on it, and is gone", () => {
    for (const piece of [
      { seat: 0, role: "PATROL_BOAT", at: at(3, 1), form: "NAVAL" },
      { seat: 0, role: "FIGHTER", at: at(3, 1), form: "EMBARKED" },
    ] as const) {
      const state = wreckArena(["ORIGINAL", "GOBLIN"], [piece]);
      const unit = unitAtV7(state, at(3, 1));
      const coins = state.players.find((player) => player.seat === 0)
        ?.coins as number;
      const result = move(state, at(3, 1), [WRECK]);
      expect(kinds(result.events), piece.role).toEqual([
        "UNIT_MOVED",
        "WRECK_SALVAGED",
      ]);
      expect(result.events[1]).toEqual({
        kind: "WRECK_SALVAGED",
        playerId: playerOfSeat(state, 0),
        unitId: unit.id,
        at: WRECK,
        coins: WRECK_COINS_V7,
      });
      expect(
        result.state.players.find((player) => player.seat === 0)?.coins,
      ).toBe(coins + WRECK_COINS_V7);
      expect(result.state.curiosities).toEqual([]);
    }
  });

  it("is salvaged by a machine that self-launches onto it, not by a unit passing over it", () => {
    const saucer = wreckArena(
      ["MARTIAN", "ORIGINAL"],
      [{ seat: 0, role: "RAIDER", at: at(4, 2) }],
    );
    const launched = move(saucer, at(4, 2), [WRECK]);
    expect(kinds(launched.events)).toEqual([
      "UNIT_MOVED",
      "UNIT_EMBARKED",
      "WRECK_SALVAGED",
    ]);
    expect(unitAtV7(launched.state, WRECK).form).toBe("EMBARKED");
    const boat = wreckArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "PATROL_BOAT", at: at(3, 1), form: "NAVAL" }],
    );
    const passed = move(boat, at(3, 1), [WRECK, at(5, 1)]);
    expect(kinds(passed.events)).toEqual(["UNIT_MOVED"]);
    expect(passed.state.curiosities).toEqual([{ kind: "WRECK", at: WRECK }]);
  });
});

// ------------------------------------------- Projection and state ---

describe("public view, projection, events, and the state schema", () => {
  it("shows curiosities on explored tiles only and projects each event by its rule", () => {
    const fountain = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: FOUNTAIN, hp: 3 },
        { seat: 0, role: "FIGHTER", at: at(7, 3) },
        { seat: 0, role: "PATROL_BOAT", at: at(3, 1), form: "NAVAL" },
      ],
      [
        { kind: "WRECK", at: WRECK },
        { kind: "SHRINE", at: SHRINE },
        { kind: "FOUNTAIN", at: FOUNTAIN },
      ],
      { water: WATER },
    );
    const enemy = playerOfSeat(fountain, 1);
    const own = playerOfSeat(fountain, 0);
    expect(viewForV7(fountain, enemy).curiosities).toEqual(
      fountain.curiosities,
    );
    const hidden = (state: GameStateV7, tiles: readonly CoordV7[]) =>
      checkedV7({
        ...state,
        players: state.players.map((player) =>
          player.id === enemy
            ? {
                ...player,
                explored: player.explored.filter(
                  (where) =>
                    !tiles.some(
                      (tile) => tile.x === where.x && tile.y === where.y,
                    ),
                ),
              }
            : player,
        ),
      });
    const fogged = hidden(fountain, [FOUNTAIN, SHRINE, at(7, 3)]);
    expect(viewForV7(fogged, enemy).curiosities).toEqual([
      { kind: "WRECK", at: WRECK },
    ]);
    // The Fountain heal: the owner and a viewer that explored the tile.
    for (const [state, seen] of [
      [fountain, true],
      [fogged, false],
    ] as const) {
      const first = applyOkV7(state, own, { kind: "END_TURN" });
      const second = applyOkV7(first.state, enemy, { kind: "END_TURN" });
      const ownView = projectEventsV7(
        first.state,
        second.state,
        own,
        second.events,
      );
      const enemyView = projectEventsV7(
        first.state,
        second.state,
        enemy,
        second.events,
      );
      expect(kinds(ownView.events as DomainEventV7[])).toContain(
        "FOUNTAIN_HEALED",
      );
      expect(
        kinds(enemyView.events as DomainEventV7[]).includes("FOUNTAIN_HEALED"),
      ).toBe(seen);
    }
    // The Shrine claim and its Promotion: to every viewer that explored it.
    for (const [state, seen] of [
      [fountain, true],
      [fogged, false],
    ] as const) {
      const claimed = move(state, at(7, 3), [SHRINE]);
      const enemyKinds = kinds(
        projectEventsV7(state, claimed.state, enemy, claimed.events)
          .events as DomainEventV7[],
      );
      expect(enemyKinds.includes("SHRINE_CLAIMED")).toBe(seen);
      expect(enemyKinds.includes("UNIT_PROMOTED")).toBe(seen);
      expect(
        kinds(
          projectEventsV7(state, claimed.state, own, claimed.events)
            .events as DomainEventV7[],
        ),
      ).toEqual(["UNIT_MOVED", "SHRINE_CLAIMED", "UNIT_PROMOTED"]);
    }
    // The Wreck salvage pays Coins: its owner only, like a treasure chest.
    const salvaged = move(fountain, at(3, 1), [WRECK]);
    expect(
      kinds(
        projectEventsV7(fountain, salvaged.state, enemy, salvaged.events)
          .events as DomainEventV7[],
      ),
    ).not.toContain("WRECK_SALVAGED");
    expect(
      kinds(
        projectEventsV7(fountain, salvaged.state, own, salvaged.events)
          .events as DomainEventV7[],
      ),
    ).toContain("WRECK_SALVAGED");
    expect(viewForV7(salvaged.state, enemy).curiosities).toEqual([
      { kind: "SHRINE", at: SHRINE },
      { kind: "FOUNTAIN", at: FOUNTAIN },
    ]);
  });

  it("parses the three events strictly", () => {
    const events = [
      {
        kind: "FOUNTAIN_HEALED",
        playerId: 1,
        unitId: 4,
        at: at(2, 3),
        amount: 12,
        hpAfter: 16,
      },
      { kind: "SHRINE_CLAIMED", playerId: 1, unitId: 4, at: at(7, 2) },
      {
        kind: "WRECK_SALVAGED",
        playerId: 1,
        unitId: 4,
        at: at(4, 1),
        coins: 8,
      },
    ];
    for (const event of events) expect(parseEventV7(event).ok).toBe(true);
    for (const bad of [
      { ...events[0], amount: 13, hpAfter: 20 },
      { ...events[0], amount: 0 },
      { ...events[0], hpAfter: 12 },
      { ...events[1], extra: true },
      { ...events[2], coins: 5 },
    ])
      expect(parseEventV7(bad).ok).toBe(false);
  });

  it("refuses a curiosity list that breaks the option, order, tile, or distance rules", () => {
    const state = curiosityArena(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "FIGHTER", at: at(9, 9) }],
      [
        { kind: "SHRINE", at: SHRINE },
        { kind: "FOUNTAIN", at: FOUNTAIN },
      ],
    );
    expect(parseGameStateV7(state)).toEqual(state);
    const withList = (curiosities: unknown) =>
      parseGameStateV7({ ...state, curiosities });
    const [shrine, fountain] = state.curiosities as readonly CuriosityV7[];
    for (const bad of [
      // Unsorted and duplicate tiles.
      [fountain, shrine],
      [shrine, shrine],
      // Unknown kind, extra key, the Monster (never a tile marker).
      [{ kind: "MONSTER", at: SHRINE }],
      [{ ...shrine, claimed: false }],
      // Wrong terrain: a Wreck on land, a Fountain on water.
      [{ kind: "WRECK", at: SHRINE }],
      // On a settlement site, within 2 of a center, on the edge ring.
      [{ kind: "FOUNTAIN", at: at(5, 5) }],
      [{ kind: "FOUNTAIN", at: at(3, 3) }],
      [{ kind: "FOUNTAIN", at: at(2, 0) }],
    ])
      expect(withList(bad), JSON.stringify(bad)).toBeNull();
    // A Fountain on a resource or a Forest.
    const tileIndex = FOUNTAIN.y * state.board.width + FOUNTAIN.x;
    const patched = (patch: object) =>
      parseGameStateV7({
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile, index) =>
            index === tileIndex ? { ...tile, ...patch } : tile,
          ),
        },
      });
    expect(patched({ resource: "FRUIT" })).toBeNull();
    expect(patched({ terrain: "FOREST" })).toBeNull();
    // On a treasure chest.
    expect(
      parseGameStateV7({ ...state, treasureChests: [FOUNTAIN] }),
    ).toBeNull();
    // Any entry with the option off, and none at all on the Showcase.
    expect(
      parseGameStateV7({
        ...state,
        setup: { ...state.setup, curiosities: false },
      }),
    ).toBeNull();
    const showcase = createInitialMapStateV7(
      generatedSetup(0, "SHOWCASE", 16, 3, true),
    );
    if (!showcase.ok) throw new Error(showcase.error.code);
    expect(
      parseGameStateV7({
        ...showcase.state,
        curiosities: [{ kind: "FOUNTAIN", at: at(7, 7) }],
      }),
    ).toBeNull();
    // A state without the list is refused (no migration).
    const { curiosities: _list, ...without } = state;
    void _list;
    expect(parseGameStateV7(without)).toBeNull();
  });
});

// ---------------------------------------------- Saves and replays ---
