import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNTAIN_HEAL_V7,
  PROMOTION_HP_V7,
  RULESET_7_ID,
  WRECK_COINS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  curiosityRandomStateV7,
  curiosityTargetCountV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayJsonV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  runReplayV7,
  validateMatchSetupV7,
  viewForV7,
  type CoordV7,
  type CuriosityV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { runAiBatchV7, runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { createRevision39MapStateV7 } from "../fixtures/v7-revision13-map";
import {
  CURIOSITY_MAP_TYPES_V7,
  curiosityGeneratedSetupV7,
} from "../fixtures/v7-curiosity-generation";
import {
  applyOkV7,
  goblinArenaV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

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
const generatedSetup = curiosityGeneratedSetupV7;

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

/** The 7r34 initial state, apart from the identity and the new keys. */
function normalizedInitialState(state: GameStateV7): string {
  // The Monster (`pulp_wars-737.3`) adds the `monsters` list, empty here.
  // The Martian balance round (`pulp_wars-1wy.3`) adds the per-turn lists
  // `beamedThisTurn` and `tractorUsedThisTurn`, empty in every initial
  // state.
  const {
    curiosities: _curiosities,
    monsters: _monsters,
    beamedThisTurn: _beamed,
    tractorUsedThisTurn: _tractor,
    // The Candy revision (`pulp_wars-jdb.3`) adds four lists, empty in
    // every initial state.
    sugarRush: _rush,
    crumbs: _crumbs,
    splattedThisTurn: _splatted,
    tossedThisTurn: _tossed,
    // The frozen sea (`pulp_wars-5ti.3`) adds the `ice` list, empty in every
    // generated initial state.
    ice: _ice,
    rulesetId: _rulesetId,
    setup,
    ...rest
  } = state;
  if (_rush.length + _crumbs.length + _splatted.length + _tossed.length !== 0)
    throw new Error("a Candy fact in an initial state");
  if (_monsters.length !== 0) throw new Error("a Monster with the option off");
  if (_ice.length !== 0) throw new Error("ice in an initial state");
  if (_beamed.length !== 0 || _tractor.length !== 0)
    throw new Error("a per-turn Martian fact in an initial state");
  const {
    curiosities: _option,
    rulesetId: _setupRulesetId,
    ...setupRest
  } = setup;
  void _curiosities;
  void _rulesetId;
  void _option;
  void _setupRulesetId;
  // The early economy tweak (`pulp_wars-if6`, 7r41) starts every seat with 3
  // Coins; the pins were taken with 5, so each player gets the 2 back.
  // The village density (`pulp_wars-ykw.2`, 7r40) renamed the map revision a
  // setup names; the pins hash the name they were taken with.
  return canonicalHash({
    ...rest,
    players: rest.players.map((player) => ({
      ...player,
      coins: player.coins + 2,
    })),
    setup: { ...setupRest, mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2" },
  });
}

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

describe("headless parity and the CLI flag", () => {
  it("with the option off plays the pinned matches command for command across map types and factions (recomputed at 7r42)", () => {
    // Computed on main at 7r34 (8540406a): runAiMatchV7 with
    // { maxCommands: 250, maxRounds: 40 }. The Martian and Ice Folk balance
    // round (`pulp_wars-1wy.3`, 7r37) changes, by design, every match with
    // a Martian or Ice Folk seat: the Human against Undead pin is still the
    // 7r34 one (no change without such a seat), and the command and event
    // hashes and rounds of the other four were recomputed at 7r37 (their
    // maps and PRNG ends are the 7r34 ones: generation is untouched). The
    // Martian mobility play (`pulp_wars-1wy.4`, a Normal AI change on 7r37)
    // moved the Pangea pin (its Martian seat buys and uses carriers); the
    // Archipelago pin with a Martian seat and the three pins without one
    // did not move. The Grunt's 8 HP (`pulp_wars-1wy.6`, 7r39) moved the
    // Pangea pin again (commands, events, and rounds; map and PRNG end as
    // before): the Goblin human seat now falls to the Dinosaurs in round
    // 14, after 248 commands, before the cap. The Archipelago pin with a
    // Martian seat did not move. The village density (`pulp_wars-ykw.2`, 7r40)
    // regenerates every board, so all five pins (maps, PRNG ends, commands,
    // events, and rounds) were recomputed at 7r40; the 7r34 boards
    // themselves are held by the parity test above.
    // The early economy tweak (`pulp_wars-if6`, 7r41: 3 starting Coins, tier
    // 3 technology base cost 9) changes every opening, so the command and
    // event hashes of all five pins were recomputed at 7r41, with the rounds
    // of the Pangea and Archipelago pins and the PRNG end of the Pangea pin;
    // the maps did not change.
    // Many seats (`pulp_wars-ykw.3`, 7r42) regenerates every board again
    // (capitals in domains, the long side lakes), so all five pins (maps,
    // PRNG ends, commands, events, and rounds) were recomputed at 7r42; the
    // 7r41 boards are held by the V3 parity rules
    // (tests/unit/ruleset-v7-map-scale.test.ts).
    // Tuning 1 (`pulp_wars-w49.3`, 7r46: retaliation, technology costs, the
    // reward and economy numbers) changes every match, so the command and
    // event hashes of all five pins were recomputed at 7r46 (the Archipelago
    // match keeps its commands and changes only its events), with the
    // rounds of the Dry Land pin (16, was 17); the maps and the PRNG ends
    // did not change. Tuning 2 (7r47: no ranged unit advances, the Human
    // Knight captures) moved the commands and events of the Pangea pin (the
    // only one with a Martian seat); the other four are unchanged. Tuning 3
    // (`pulp_wars-w49.3`: the Knight's Attack, Forest cover from Forestry,
    // land trade, Blast Mountain) recomputed the commands and events of
    // the pins it moved (the Dry Land one is back at 17 rounds).
    const pins: readonly {
      readonly mapType: MapTypeV7;
      readonly factions: readonly FactionIdV7[];
      readonly seed: number;
      readonly rounds: number;
      /** Fewer than the cap of 250 only when the match ended first. */
      readonly acceptedCommands?: number;
      readonly commandHash: string;
      readonly eventHash: string;
      readonly mapHash: string;
      readonly finalPrngHash: string;
    }[] = [
      {
        mapType: "DRY_LAND",
        factions: ["ORIGINAL", "UNDEAD"],
        seed: 3,
        // Tuning 4 (`pulp_wars-w49.3`): 18 rounds (17 before), recomputed.
        // Tuning 5 (`pulp_wars-w49.4`, the Normal AI's army play):
        // recomputed.
        // Tuning 6 (`pulp_wars-w49.6`: research at 1 Coin a technology
        // owned, the Normal AI's assault, expansion, and research order):
        // recomputed.
        // Tuning 7 (`pulp_wars-w49.10`: the Normal AI's local assault,
        // growth at the unit limit, wartime spending, and target choice):
        // 17 rounds (18 before), recomputed. The four pins below have a
        // seat outside the army play and are unchanged.
        // Tuning 8 (`pulp_wars-w49.11`: the capture of a reached center,
        // research on a clock while at war, group sizes): 15 rounds,
        // recomputed; the four pins below are unchanged again.
        // Its correction pass (the research clock under pressure, the
        // battery, the weak garrison): 16 rounds, recomputed (the final
        // PRNG state too: the match ends a round later).
        rounds: 16,
        commandHash:
          "33eee3593b76a684533e9def11d9ced08afe5f436a9e4f7c130f3110171281b7",
        eventHash:
          "5969a82c2e9b6640fd2f834cd1452bde0ca8a9de4c2335593c4358e61d601815",
        mapHash:
          "1f6ad08d476884229d6cb8a7319ea209b8667cf4e28e24cd07352ebafc3055de",
        finalPrngHash:
          "6ecdac89b46e4cbd434c0c8eec3723232d5419d7308165da635935e8d0fbcca1",
      },
      {
        mapType: "PANGEA",
        factions: ["GOBLIN", "DINOSAUR", "MARTIAN"],
        seed: 11,
        // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin a technology
        // owned for every faction, so every match changes at its third
        // technology: 14 rounds (15 before), recomputed. The same holds for
        // the three pins below.
        rounds: 14,
        commandHash:
          "06a0c1a46349f941e0b3a1f3ccb6fefeffe1872edef0e9a888a09c1cfe0ff4d9",
        eventHash:
          "ab6337c58f0a6b5b50b31a9578f6a938245d4095ab08bbec9ef2c65dfb0a10de",
        mapHash:
          "5b286bbe8cdb2f8a339cd7a74ba219bc2b57a4322370548442b3c8f26bef4ad9",
        finalPrngHash:
          "8cdb862599e395d0cae5c157a7ff48acd492cd2082bab7c6dfb32c3337c6c4df",
      },
      {
        mapType: "CONTINENTS",
        // The frozen sea (`pulp_wars-5ti.3`, 7r44): an Ice Folk seat has no
        // ships, so this match was recomputed at 7r44 (the same board; it
        // was 18 rounds, commands 2c1c37…d518, events bd9d09…7c62).
        factions: ["ICE_FOLK", "DWARF"],
        seed: 5,
        // Tuning 6: 20 rounds (22 before).
        rounds: 20,
        commandHash:
          "effa4bab89ee47c80ec5bad38fdea134ce496d6ea6d4d040bca60aa023dfd032",
        eventHash:
          "fd26a329a705c1bfc810a76a69f03aa580bfc6249085d1a97cec6bbaa4b1a5dc",
        mapHash:
          "2cbf36a1c5d03e70dd785be13a1ed7d5dd04fecdd54925baa1b483261d71c9be",
        finalPrngHash:
          "c42f592a01a3ffba7df73eb817e340aae85857fac4a465686a83fa4fd8d06f90",
      },
      {
        mapType: "ARCHIPELAGO",
        factions: ["MARTIAN", "ORIGINAL", "GOBLIN"],
        seed: 7,
        // Tuning 5 (`pulp_wars-w49.4`: the Human Guard open to ranged
        // attacks, Land Grant at 1 Coin a tile, the Swordsman): 14 rounds
        // (15 before), recomputed.
        rounds: 14,
        commandHash:
          "16273ba9aa1e144d6b521b40206dd01086c008591a624dd20feb846104febc71",
        eventHash:
          "900a2f19a29d70b731ac9f8f57b5dc7dfcbc77d3993ac4b3e284da34f8558b05",
        mapHash:
          "be112bd78cfeb3f5ae72a6b67f8f91bd45b81814c5d0cdad9abe7f31f221be5d",
        finalPrngHash:
          "93ed9f1c09f66acd0db8cdb2a0b2e1da51eaf630d4e7fa2a4769ecbbc50084a7",
      },
      {
        mapType: "LAKES",
        factions: ["DWARF", "UNDEAD", "ICE_FOLK", "DINOSAUR"],
        seed: 2,
        // Tuning 6: 10 rounds (11 before).
        rounds: 10,
        commandHash:
          "aa83281500e65b1181c2eb67e301484de85c245dea72df726ab8685262089bd8",
        eventHash:
          "818aa9efc91a8535406a290fbf99e27ddb56c261a4d1be7a00d7c89e07f99f48",
        mapHash:
          "70ff339440ce86f231bca6b2be56c748891436934f614f6ef66fa53933f3d5ab",
        finalPrngHash:
          "7b19df276523773e45ee21ddbff082d03424c46ae533dc4ded29b69103a8f124",
      },
    ];
    for (const pin of pins) {
      const aiCount = (pin.factions.length - 1) as 1 | 2 | 3;
      const width = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
      const result = runAiMatchV7(
        generatedSetup(
          pin.seed,
          pin.mapType,
          width,
          aiCount,
          false,
          pin.factions,
        ),
        { maxCommands: 250, maxRounds: 40 },
      );
      // The Candy revision (`pulp_wars-jdb.3`, 7r38) adds four combat
      // preview fields, neutral in every match without a Candy seat; with
      // them removed the events hash to the pins unchanged, so a match
      // without a Candy seat plays and reads exactly as at 7r37.
      expect(result.metrics.eventHash).toBe(canonicalHash(result.events));
      const eventsBeforeCandy = result.events.map((event) => {
        if (event.kind !== "COMBAT_RESOLVED") return event;
        const {
          sugarRushApplied,
          splatApplied,
          bounce,
          bounceTo,
          ram,
          torpedo,
          iceCover,
          icebound,
          ...preview
        } = event.preview;
        // The naval branch (`pulp_wars-5ti.2`, 7r43) adds two more, neutral
        // while no seat holds Seamanship or Submersibles.
        expect([ram, torpedo]).toEqual([false, false]);
        // The frozen sea (`pulp_wars-5ti.3`, 7r44) adds two more, neutral
        // while nothing is frozen.
        expect([iceCover, icebound]).toEqual([false, false]);
        expect([sugarRushApplied, splatApplied, bounce, bounceTo]).toEqual([
          false,
          false,
          "NONE",
          null,
        ]);
        return { ...event, preview };
      });
      expect(
        {
          acceptedCommands: result.acceptedCommands,
          rounds: result.rounds,
          commandHash: result.metrics.commandHash,
          eventHash: canonicalHash(eventsBeforeCandy),
          mapHash: result.metrics.mapHash,
          finalPrngHash: result.metrics.finalPrngHash,
          curiosityKinds: result.metrics.curiosityKinds,
        },
        pin.mapType,
      ).toEqual({
        acceptedCommands: pin.acceptedCommands ?? 250,
        rounds: pin.rounds,
        commandHash: pin.commandHash,
        eventHash: pin.eventHash,
        mapHash: pin.mapHash,
        finalPrngHash: pin.finalPrngHash,
        curiosityKinds: [],
      });
    }
  }, 600_000);

  it("a match with the option on that drew no curiosity plays exactly like the same match off", () => {
    // The first 11 x 11 seed whose stream's first draw aims for none.
    let seed = 0;
    while (curiosityTargetCountV7(11, curiosityRandomStateV7(seed)).count > 0)
      seed += 1;
    const on = generatedSetup(seed, "DRY_LAND", 11, 1, true);
    const withOption = runAiMatchV7(on, { maxCommands: 200 });
    const without = runAiMatchV7(
      { ...on, curiosities: false },
      { maxCommands: 200 },
    );
    expect(withOption.metrics.curiosityKinds).toEqual([]);
    expect(withOption.metrics.commandHash).toBe(without.metrics.commandHash);
    expect(withOption.metrics.eventHash).toBe(without.metrics.eventHash);
    expect(normalizedInitialState(withOption.state)).toBe(
      normalizedInitialState(without.state),
    );
  }, 600_000);

  it("records the option in every batch entry and the placed kinds in its metrics", async () => {
    const batch = await runAiBatchV7({
      seeds: [1],
      aiCounts: [1],
      boardSize: 16,
      mapTypes: ["DRY_LAND"],
      curiosities: true,
      maxCommands: 1,
    });
    const created = createInitialMapStateV7(
      generatedSetup(1, "DRY_LAND", 16, 1, true),
    );
    if (!created.ok) throw new Error(created.error.code);
    expect(batch.entries[0]).toMatchObject({
      curiosities: true,
      metrics: {
        curiosityKinds: created.state.curiosities.map((entry) => entry.kind),
      },
    });
    expect(created.state.curiosities.length).toBe(1);
    const off = await runAiBatchV7({
      seeds: [1],
      aiCounts: [1],
      boardSize: 16,
      mapTypes: ["DRY_LAND"],
      curiosities: false,
      maxCommands: 1,
    });
    expect(off.entries[0]).toMatchObject({
      curiosities: false,
      metrics: { curiosityKinds: [] },
    });
  }, 300_000);

  it("takes `--curiosities on|off` for match and batch, on by default, and refuses it for a mission", () => {
    const runCli = <T>(...args: readonly string[]): T =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            resolve("node_modules/tsx/dist/cli.mjs"),
            resolve("src/headless/cli.ts"),
            ...args,
          ],
          { encoding: "utf8", timeout: 30_000 },
        ),
      ) as T;
    const common = [
      "--ruleset",
      RULESET_7_ID,
      "--map-type",
      "dry_land",
      "--size",
      "16",
      "--seed",
      "1",
      "--max-commands",
      "1",
    ];
    type Summary = { readonly metrics: { readonly curiosityKinds: string[] } };
    expect(
      runCli<Summary>("match", ...common).metrics.curiosityKinds,
    ).toHaveLength(1);
    expect(
      runCli<Summary>("match", ...common, "--curiosities", "on").metrics
        .curiosityKinds,
    ).toHaveLength(1);
    expect(
      runCli<Summary>("match", ...common, "--curiosities", "off").metrics
        .curiosityKinds,
    ).toEqual([]);
    const batch = runCli<{
      readonly entries: readonly { readonly curiosities: boolean }[];
    }>(
      "batch",
      "--ruleset",
      RULESET_7_ID,
      "--seeds",
      "1",
      "--ai-counts",
      "1",
      "--max-commands",
      "1",
      "--curiosities",
      "off",
    );
    expect(batch.entries.map((entry) => entry.curiosities)).toEqual([false]);
    expect(() => runCli("match", ...common, "--curiosities", "maybe")).toThrow(
      /--curiosities must be on or off/,
    );
    expect(() =>
      runCli(
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--map-type",
        "mission",
        "--mission",
        "TEST_GROUNDS",
        "--curiosities",
        "off",
      ),
    ).toThrow(/--curiosities does not apply to --map-type mission/);
  }, 300_000);
});

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

describe("saves and replays", () => {
  it("round-trips a generated match with curiosities, a Shrine claimed by Normal, through the replay and the save", () => {
    // 16 x 16 Dry Land seed 12, Human v Goblin: one Shrine, which the
    // Normal AI claims inside 30 rounds (seed 10 until the Monster joined
    // the kind draw at 7r36; seed 4 since, also on the village-density
    // boards of `pulp_wars-ykw.2` and `pulp_wars-ykw.7`; seed 12 on the
    // many-seats boards of `pulp_wars-ykw.3`).
    const setup = generatedSetup(12, "DRY_LAND", 16, 1, true, [
      "ORIGINAL",
      "GOBLIN",
    ]);
    const match = runAiMatchV7(setup, { maxRounds: 30 });
    expect(match.errors).toEqual([]);
    expect(match.metrics.curiosityKinds).toEqual(["SHRINE"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.curiosities).toHaveLength(1);
    let state = created.state;
    let replay = createReplayV7(setup);
    const seen = new Set<string>();
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events) {
        expect(parseEventV7(event).ok).toBe(true);
        seen.add(event.kind);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(seen.has("SHRINE_CLAIMED")).toBe(true);
    expect(state.curiosities).toEqual([]);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.curiosities).toBe(true);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    const late = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(late))).toEqual({
      kind: "VALID",
      save: late,
    });
    // A save whose curiosity list was tampered with is not valid.
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: { curiosities: unknown };
    };
    tampered.state.curiosities = [];
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  }, 600_000);
});
