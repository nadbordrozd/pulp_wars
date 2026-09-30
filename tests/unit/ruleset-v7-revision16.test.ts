import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import {
  NORMAL_GROWTH_OPENING_SCORE_V7,
  normalOpeningScoresV7,
  normalOpeningTechnologyV7,
} from "../../src/ai/v7-opening";
import {
  CAPITAL_GROWTH_MINIMUM_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SHALLOW_WATER_MINIMUM_SHARE_V7,
  applyCapitalGrowthFloorV7,
  applyCommandV7,
  capitalGrowthCountsV7,
  capitalGrowthReadyV7,
  createPlayableGameV7,
  createReplayV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  isShallowWaterV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  parseReplayJsonV7,
  runReplayV7,
  villageCountV7,
  viewForV7,
  type BiomeIdV7,
  type BoardStateV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type ResourceIdV7,
  type TerrainIdV7,
  type TileStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

// Revision 16a (`pulp_wars-wwc`): identity `pulp-wars-poc-7r16`, orthogonal
// Shallow Water with a 25% Shallow minimum, the capital growth floor and the
// `CAPITAL_GROWTH` invariant, and the Normal AI growth-first opening
// (docs/product/RULESET_7_REVISION_16.md sections 2-4 and 10.1).

const MAP_TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const CELLS = [
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
] as const;

describe("ruleset-7 revision-16 identity", () => {
  it("pins the r16 identity, cleans the r15 save key, and rejects r15", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r16");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r16.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r15.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    const setup = setupFor("CONTINENTS", 11, 1, 3);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r15" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: "pulp-wars-poc-7r15",
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
    expect(parseReplayFileV7(createReplayV7(setup)).kind).toBe("VALID");
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-30T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r15",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r15" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("ruleset-7 prior identities", () => {
  const revision = Number(/^pulp-wars-poc-7r(\d+)$/.exec(RULESET_7_ID)?.[1]);
  const expectedPrior = [
    "pulp-wars-poc-7",
    ...Array.from(
      { length: revision - 2 },
      (_, index) => `pulp-wars-poc-7r${String(index + 2)}`,
    ),
  ];

  it("lists every earlier Ruleset 7 identity exactly once, in order", () => {
    expect(revision).toBe(16);
    expect([...PRIOR_RULESET_7_IDS]).toEqual(expectedPrior);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
  });

  it("cleans the autosave key of every earlier Ruleset 7 identity", () => {
    expect([...OBSOLETE_SAVE_STORAGE_KEYS_V7]).toEqual(
      PRIOR_RULESET_7_IDS.map((id) =>
        id === "pulp-wars-poc-7"
          ? "pulpWars.save.v7.current"
          : `pulpWars.save.v7r${id.slice("pulp-wars-poc-7r".length)}.current`,
      ),
    );
  });

  it.each(expectedPrior)("reports a %s replay as INCOMPATIBLE_REPLAY", (id) => {
    const setup = { ...setupFor("CONTINENTS", 11, 1, 3), rulesetId: id };
    const replay = {
      format: "pulp-wars-replay",
      version: 7,
      setup,
      commands: [],
      checkpoints: [],
    };
    expect(parseReplayFileV7(replay)).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    expect(parseReplayJsonV7(JSON.stringify(replay))).toEqual({
      kind: "INCOMPATIBLE_REPLAY",
    });
    expect(() => runReplayV7(replay)).toThrow(
      expect.objectContaining({ code: "INCOMPATIBLE_REPLAY" }),
    );
  });

  it("still reports an unknown Ruleset 7 identity as INVALID_REPLAY", () => {
    for (const id of ["pulp-wars-poc-7r1", "pulp-wars-poc-7r17", "other"])
      expect(
        parseReplayFileV7({
          format: "pulp-wars-replay",
          version: 7,
          setup: { ...setupFor("CONTINENTS", 11, 1, 3), rulesetId: id },
          commands: [],
          checkpoints: [],
        }),
      ).toEqual({ kind: "INVALID_REPLAY" });
  });
});

describe("ruleset-7 revision-16 orthogonal Shallow Water", () => {
  it("classifies water by its four orthogonal on-board neighbours only", () => {
    const land = new Set(["5,5"]);
    const isLand = (at: CoordV7) => land.has(`${at.x},${at.y}`);
    // Orthogonal land contact: Shallow.
    for (const at of [
      { x: 5, y: 4 },
      { x: 6, y: 5 },
      { x: 5, y: 6 },
      { x: 4, y: 5 },
    ])
      expect(isShallowWaterV7(11, 11, at, isLand)).toBe(true);
    // Diagonal-only land contact: Deep.
    for (const at of [
      { x: 4, y: 4 },
      { x: 6, y: 4 },
      { x: 4, y: 6 },
      { x: 6, y: 6 },
    ])
      expect(isShallowWaterV7(11, 11, at, isLand)).toBe(false);
    // Board edges: off-board cells never count; on-board orthogonal land does.
    expect(isShallowWaterV7(11, 11, { x: 0, y: 0 }, () => false)).toBe(false);
    const corner = new Set(["1,1"]);
    const cornerLand = (at: CoordV7) => corner.has(`${at.x},${at.y}`);
    expect(isShallowWaterV7(11, 11, { x: 0, y: 0 }, cornerLand)).toBe(false);
    expect(isShallowWaterV7(11, 11, { x: 0, y: 1 }, cornerLand)).toBe(true);
    expect(isShallowWaterV7(11, 11, { x: 10, y: 10 }, () => true)).toBe(true);
  });

  it("generates only orthogonally classified water, never Fish on Deep, and at least 25% Shallow", () => {
    expect(SHALLOW_WATER_MINIMUM_SHARE_V7).toBe(0.25);
    for (const mapType of MAP_TYPES.slice(1))
      for (const [size, aiCount] of CELLS)
        for (let seed = 0; seed < 2; seed += 1) {
          const generated = generateInitialMapV7(
            setupFor(mapType, size, aiCount, seed),
          );
          if (!generated.ok) throw new Error(generated.error.code);
          const board = generated.map.board;
          const isLand = (at: CoordV7) =>
            board.tiles[at.y * board.width + at.x]?.biome !== null;
          const water = board.tiles.filter((tile) => tile.biome === null);
          for (const tile of water) {
            expect(tile.terrain).toBe(
              isShallowWaterV7(board.width, board.height, tile.at, isLand)
                ? "SHALLOW_WATER"
                : "DEEP_WATER",
            );
            if (tile.resource === "FISH")
              expect(tile.terrain).toBe("SHALLOW_WATER");
          }
          expect(
            water.filter((tile) => tile.terrain === "SHALLOW_WATER").length,
          ).toBeGreaterThanOrEqual(Math.ceil(water.length * 0.25));
        }
  }, 120_000);

  it("keeps the revision-15 eight-neighbour classification for parity fixtures only", () => {
    const setup = setupFor("ARCHIPELAGO", 14, 1, 0);
    const current = generateInitialMapV7(setup);
    const revision15 = generateInitialMapWithVillageCountV7(
      setup,
      villageCountV7(setup),
      "REVISION_15",
    );
    if (!current.ok || !revision15.ok) throw new Error("generation failed");
    const board = revision15.map.board;
    const diagonalOnly = board.tiles.filter(
      (tile) =>
        tile.terrain === "SHALLOW_WATER" &&
        !isShallowWaterV7(
          board.width,
          board.height,
          tile.at,
          (at) => board.tiles[at.y * board.width + at.x]?.biome !== null,
        ),
    );
    expect(diagonalOnly.length).toBeGreaterThan(0);
    expect(
      generateInitialMapWithVillageCountV7(setup, 3, "REVISION_14" as never),
    ).toEqual({ ok: false, error: { code: "INVALID_SETUP", params: {} } });
  });
});

describe("ruleset-7 revision-16 capital growth floor", () => {
  const CENTER: CoordV7 = { x: 5, y: 5 };
  const RING: readonly CoordV7[] = [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 4, y: 5 },
    { x: 6, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ];
  const rowMajor = (at: CoordV7) => at.y * 11 + at.x;

  it("is a no-op when one kind already has two", () => {
    for (const [terrain, resource, naval] of [
      ["GRASS", "FRUIT", false],
      ["FOREST", "GAME", false],
      ["SHALLOW_WATER", "FISH", true],
    ] as const) {
      const board = ringBoard("PLAINS", [
        [0, terrain, resource],
        [7, terrain, resource],
      ]);
      expect(capitalGrowthReadyV7(board, CENTER, naval)).toBe(true);
      expect(applyCapitalGrowthFloorV7(board, [CENTER], rowMajor, naval)).toBe(
        board,
      );
    }
  });

  it("counts Fish only on naval maps", () => {
    const board = ringBoard("PLAINS", [
      [0, "SHALLOW_WATER", "FISH"],
      [1, "SHALLOW_WATER", "FISH"],
    ]);
    expect(capitalGrowthCountsV7(board, CENTER, true)).toEqual({
      fruit: 0,
      game: 0,
      fish: 2,
    });
    expect(capitalGrowthCountsV7(board, CENTER, false).fish).toBe(0);
    const floored = applyCapitalGrowthFloorV7(board, [CENTER], rowMajor, false);
    expect(capitalGrowthCountsV7(floored, CENTER, false).fruit).toBe(2);
  });

  it("chooses the kind needing fewer additions", () => {
    // One Game already: one more Game (1 addition) beats two Fruit.
    const board = ringBoard("PLAINS", [
      [2, "FOREST", "GAME"],
      [3, "FOREST", null],
    ]);
    const floored = applyCapitalGrowthFloorV7(board, [CENTER], rowMajor, false);
    expect(capitalGrowthCountsV7(floored, CENTER, false)).toEqual({
      fruit: 0,
      game: 2,
      fish: 0,
    });
    expect(changedCells(board, floored)).toEqual([
      { at: RING[3], resource: "GAME" },
    ]);
  });

  it("breaks a tie with Game for a Woodland capital and Fruit otherwise", () => {
    const cells: RingPatch[] = [
      [1, "FOREST", null],
      [6, "FOREST", null],
    ];
    const woodland = ringBoard("WOODLAND", cells);
    const plains = ringBoard("PLAINS", cells);
    const highlands = ringBoard("HIGHLANDS", cells);
    expect(
      capitalGrowthCountsV7(
        applyCapitalGrowthFloorV7(woodland, [CENTER], rowMajor, false),
        CENTER,
        false,
      ),
    ).toEqual({ fruit: 0, game: 2, fish: 0 });
    for (const board of [plains, highlands])
      expect(
        capitalGrowthCountsV7(
          applyCapitalGrowthFloorV7(board, [CENTER], rowMajor, false),
          CENTER,
          false,
        ),
      ).toEqual({ fruit: 2, game: 0, fish: 0 });
  });

  it("places on eligible cells in ascending rank and leaves other cells untouched", () => {
    const board = ringBoard("PLAINS", [
      [0, "GRASS", "FERTILE_GROUND"],
      [1, "MOUNTAIN", "ORE"],
      [2, "FOREST", null],
    ]);
    const withImprovement = patchRing(board, 3, { improvement: "WINDMILL" });
    // Reverse row-major rank: the highest-coordinate empty Grass comes first.
    const reverse = (at: CoordV7) => -rowMajor(at);
    const floored = applyCapitalGrowthFloorV7(
      withImprovement,
      [CENTER],
      reverse,
      false,
    );
    expect(changedCells(withImprovement, floored)).toEqual([
      { at: RING[7], resource: "FRUIT" },
      { at: RING[6], resource: "FRUIT" },
    ]);
    // Fertile Ground, Ore, the improved cell, and terrain never change.
    for (const index of [0, 1, 2, 3])
      expect(tileAt(floored, RING[index] as CoordV7)).toEqual(
        tileAt(withImprovement, RING[index] as CoordV7),
      );
    expect(floored.tiles.map((tile) => tile.terrain)).toEqual(
      withImprovement.tiles.map((tile) => tile.terrain),
    );
  });

  it("changes nothing when neither kind is feasible", () => {
    const board = ringBoard(
      "PLAINS",
      RING.map((_, index): RingPatch => [index, "MOUNTAIN", null]).map(
        (patch, index): RingPatch =>
          index === 0 ? [0, "GRASS", "FRUIT"] : patch,
      ),
    );
    expect(applyCapitalGrowthFloorV7(board, [CENTER], rowMajor, false)).toBe(
      board,
    );
    expect(capitalGrowthReadyV7(board, CENTER, false)).toBe(false);
    expect(CAPITAL_GROWTH_MINIMUM_V7).toBe(2);
  });

  it("rejects candidates that stay short with CAPITAL_GROWTH and continues the stream", () => {
    // Seed 1, 16 x 16 three-AI Dry Land: four candidates fail CAPITAL_GROWTH.
    const generated = generateInitialMapV7(setupFor("DRY_LAND", 16, 3, 1));
    if (!generated.ok) throw new Error(generated.error.code);
    expect(
      generated.map.attempts
        .filter((attempt) => attempt.failures.includes("CAPITAL_GROWTH"))
        .map((attempt) => attempt.attempt),
    ).toEqual([2, 6, 9, 11]);
    expect(generated.map.attempt).toBe(13);
    for (const capital of generated.map.capitals)
      expect(capitalGrowthReadyV7(generated.map.board, capital, false)).toBe(
        true,
      );
  });

  it("evaluates capital fairness after the floor, never relaxing it", () => {
    // Candidates are PRNG-identical under revision-15 and revision-16 rules
    // (the floor draws nothing), so the same candidate compares directly.
    const compare = (seed: number, attempt: number) => {
      const setup = setupFor("DRY_LAND", 16, 3, seed);
      const count = villageCountV7(setup);
      const before = generateInitialMapWithVillageCountV7(
        setup,
        count,
        "REVISION_15",
      );
      const after = generateInitialMapWithVillageCountV7(
        setup,
        count,
        "REVISION_16",
      );
      if (!before.ok || !after.ok) throw new Error("generation failed");
      const old = before.map.attempts[attempt - 1];
      const now = after.map.attempts[attempt - 1];
      expect(now?.initialRandomState).toBe(old?.initialRandomState);
      expect(now?.finalRandomState).toBe(old?.finalRandomState);
      return { old: old?.failures, now: now?.failures };
    };
    // Seed 1 candidate 8 was accepted by revision 15; its floored Fruit or
    // Game pushes a capital out of the 6-17/spread-5 band.
    expect(compare(1, 8)).toEqual({ old: [], now: ["CAPITAL_SCORE"] });
    // Seed 0 candidate 11 failed the band before; the floor brings it in.
    expect(compare(0, 11)).toEqual({ old: ["CAPITAL_SCORE"], now: [] });
  });

  it("accepts every map of seeds 0-9 of all 60 cells with every capital growth-ready", () => {
    const attempts: Record<string, number> = {};
    for (const mapType of MAP_TYPES)
      for (const [size, aiCount] of CELLS)
        for (let seed = 0; seed < 10; seed += 1) {
          const generated = generateInitialMapV7(
            setupFor(mapType, size, aiCount, seed),
          );
          if (!generated.ok)
            throw new Error(
              `${mapType}/${size}/${aiCount}/${seed}: ${generated.error.code}`,
            );
          attempts[mapType] = Math.max(
            attempts[mapType] ?? 0,
            generated.map.attempt,
          );
          for (const capital of generated.map.capitals)
            expect(
              capitalGrowthReadyV7(
                generated.map.board,
                capital,
                mapType !== "DRY_LAND",
              ),
            ).toBe(true);
        }
    for (const worst of Object.values(attempts))
      expect(worst).toBeLessThanOrEqual(256);
  }, 120_000);
});

describe("ruleset-7 revision-16 level 2 on the first turn", () => {
  it.each(MAP_TYPES)(
    "reaches level 2 on turn 1 for every capital of seeds 0-19 of every 11/14/16 %s cell",
    (mapType) => {
      for (const [size, aiCount] of CELLS.filter(([size]) => size <= 16))
        for (let seed = 0; seed < 20; seed += 1) {
          const setup = setupFor(mapType, size, aiCount, seed);
          const created = createPlayableGameV7(setup);
          if (!created.ok) throw new Error(created.error.code);
          let state = created.state;
          for (let turn = 0; turn <= aiCount; turn += 1) {
            const actor = required(state.turnOrder[state.activeSeatIndex]);
            const player = required(
              state.players.find((item) => item.id === actor),
            );
            expect(player.coins).toBe(7);
            const capital = required(
              state.cities.find(
                (city) => city.id === player.originalCapitalCityId,
              ),
            );
            const plan = growthPlan(state, capital.at, mapType !== "DRY_LAND");
            const apply = (command: CommandV7) => {
              const result = applyCommandV7(state, actor, command);
              if (!result.accepted)
                throw new Error(
                  `${mapType}/${size}/${aiCount}/${seed} ${command.kind}: ${result.error.code}`,
                );
              state = result.state;
            };
            apply({ kind: "RESEARCH", tech: plan.tech });
            for (const at of plan.cells) apply({ kind: plan.command, at });
            expect(
              state.cities.find((city) => city.id === capital.id)?.level,
            ).toBe(2);
            apply({
              kind: "CHOOSE_CITY_REWARD",
              cityId: capital.id,
              reachedLevel: 2,
              reward: "STOCKPILE",
            });
            apply({ kind: "END_TURN" });
          }
        }
    },
    120_000,
  );
});

describe("ruleset-7 revision-16 Normal AI opening", () => {
  it("researches the growth technology with the most territory resources first", () => {
    // Two Game in the capital territory beat radius-2 Fruit (revision-12
    // Gathering 4 per Fruit) because rule 1 runs before the revision-12 scores.
    const view = territoryView([
      [0, "FOREST", "GAME"],
      [1, "FOREST", "GAME"],
    ]);
    expect(normalOpeningTechnologyV7(view)).toBe("HUNTING");
    expect(normalOpeningScoresV7(view)[0]).toEqual({
      tech: "HUNTING",
      score: NORMAL_GROWTH_OPENING_SCORE_V7 + 2,
    });
    // Most resources wins; ties follow technology order (Gathering first).
    expect(
      normalOpeningTechnologyV7(
        territoryView([
          [0, "FOREST", "GAME"],
          [1, "FOREST", "GAME"],
          [2, "GRASS", "FRUIT"],
          [3, "GRASS", "FRUIT"],
          [4, "GRASS", "FRUIT"],
        ]),
      ),
    ).toBe("GATHERING");
    expect(
      normalOpeningTechnologyV7(
        territoryView([
          [0, "FOREST", "GAME"],
          [1, "FOREST", "GAME"],
          [2, "GRASS", "FRUIT"],
          [3, "GRASS", "FRUIT"],
        ]),
      ),
    ).toBe("GATHERING");
    // One of a kind is not enough: the revision-12 scores apply unchanged.
    const single = territoryView([[0, "FOREST", "GAME"]]);
    expect(
      normalOpeningScoresV7(single).every((item) => item.score < 100),
    ).toBe(true);
  });

  it("harvests the growth resource before research, training, or construction", () => {
    const state = territoryState(
      [
        [0, "GRASS", "FRUIT"],
        [1, "GRASS", "FRUIT"],
        [2, "GRASS", "FRUIT"],
      ],
      { researchedTechs: ["GATHERING"], coins: 30 },
    );
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command?.kind).toBe("HARVEST_FRUIT");
    expect(decision.candidates[0]?.score.priority).toBe(1212);
    for (const candidate of decision.candidates)
      if (
        candidate.command.kind === "RESEARCH" ||
        candidate.command.kind === "TRAIN" ||
        candidate.command.kind.startsWith("BUILD_")
      )
        expect(candidate.score.priority).toBeLessThan(1212);
    // Once the capital is level 2 the harvest bonus stops.
    let levelled = state;
    const capital = required(
      state.cities.find((city) => city.ownerId === state.humanPlayerId),
    );
    const fruit = state.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === capital.id && tile.resource === "FRUIT",
      )
      .map((tile) => tile.at);
    expect(fruit).toHaveLength(3);
    for (const command of [
      { kind: "HARVEST_FRUIT", at: fruit[0] },
      { kind: "HARVEST_FRUIT", at: fruit[1] },
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: capital.id,
        reachedLevel: 2,
        reward: "STOCKPILE",
      },
    ] as CommandV7[]) {
      const result = applyCommandV7(levelled, levelled.humanPlayerId, command);
      if (!result.accepted) throw new Error(result.error.code);
      levelled = result.state;
    }
    expect(levelled.cities.find((city) => city.id === capital.id)?.level).toBe(
      2,
    );
    expect(
      scoreCommandV7(viewForV7(levelled, levelled.humanPlayerId), {
        kind: "HARVEST_FRUIT",
        at: required(fruit[2]),
      }).priority,
    ).toBeLessThan(1212);
  });

  it.each([
    ["ORIGINAL", "ORIGINAL"],
    ["ORIGINAL", "UNDEAD"],
    ["UNDEAD", "ORIGINAL"],
  ] as const)(
    "brings every capital to level 2 by its owner's second turn (%s vs %s, seeds 0-19, 11 and 14)",
    (first, second) => {
      for (const mapType of MAP_TYPES)
        for (const size of [11, 14] as const)
          for (let seed = 0; seed < 20; seed += 1) {
            const setup = setupFor(mapType, size, 1, seed, [first, second]);
            const match = runAiMatchV7(setup, {
              maxRounds: 2,
              recordCheckpointHashes: false,
            });
            expect(match.errors).toEqual([]);
            for (const player of match.state.players) {
              const capital = match.state.cities.find(
                (city) => city.id === player.originalCapitalCityId,
              );
              expect(
                capital !== undefined &&
                  capital.ownerId === player.id &&
                  capital.level >= 2,
                `${mapType}/${size}/${seed} seat ${player.seat}`,
              ).toBe(true);
            }
          }
    },
    120_000,
  );
});

type RingPatch = readonly [
  index: number,
  terrain: TerrainIdV7,
  resource: ResourceIdV7 | null,
];

function setupFor(
  mapType: MapTypeV7,
  size: 11 | 14 | 16 | 20 | 25,
  aiCount: 1 | 2 | 3,
  seed: number,
  factions?: readonly FactionIdV7[],
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [
      ...(factions ??
        Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const)),
    ],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

/** An 11 x 11 Grass board with a capital at (5, 5) and patched ring cells. */
function ringBoard(
  biome: BiomeIdV7,
  patches: readonly RingPatch[],
): BoardStateV7 {
  const ring = [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 4, y: 5 },
    { x: 6, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ];
  const tiles: TileStateV7[] = [];
  for (let y = 0; y < 11; y += 1)
    for (let x = 0; x < 11; x += 1) {
      const index = ring.findIndex((at) => at.x === x && at.y === y);
      const patch = patches.find((item) => item[0] === index);
      const water =
        patch?.[1] === "SHALLOW_WATER" || patch?.[1] === "DEEP_WATER";
      tiles.push({
        at: { x, y },
        biome: water ? null : biome,
        terrain: patch?.[1] ?? "GRASS",
        resource: patch?.[2] ?? null,
        improvement: null,
        road: false,
        fieldDefense: false,
        site: x === 5 && y === 5 ? "CAPITAL" : null,
        territoryCityId: null,
      });
    }
  return { width: 11, height: 11, tiles };
}

function patchRing(
  board: BoardStateV7,
  index: number,
  patch: Partial<TileStateV7>,
): BoardStateV7 {
  const ring = [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 4, y: 5 },
    { x: 6, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ];
  const at = ring[index] as CoordV7;
  return {
    ...board,
    tiles: board.tiles.map((tile) =>
      tile.at.x === at.x && tile.at.y === at.y ? { ...tile, ...patch } : tile,
    ),
  };
}

function tileAt(board: BoardStateV7, at: CoordV7): TileStateV7 | undefined {
  return board.tiles[at.y * board.width + at.x];
}

function changedCells(
  before: BoardStateV7,
  after: BoardStateV7,
): { at: CoordV7; resource: ResourceIdV7 | null }[] {
  return after.tiles
    .filter((tile, index) => tile !== before.tiles[index])
    .sort(
      (left, right) =>
        right.at.y * 11 + right.at.x - (left.at.y * 11 + left.at.x),
    )
    .map((tile) => ({ at: tile.at, resource: tile.resource }));
}

/** The guaranteed first-turn plan: the kind with two, its tech and cells. */
function growthPlan(
  state: GameStateV7,
  capital: CoordV7,
  naval: boolean,
): {
  readonly tech: "GATHERING" | "HUNTING" | "SHORECRAFT";
  readonly command: "HARVEST_FRUIT" | "HUNT_GAME" | "HARVEST_FISH";
  readonly cells: readonly CoordV7[];
} {
  const counts = capitalGrowthCountsV7(state.board, capital, naval);
  const kind =
    counts.fruit >= 2
      ? ({
          tech: "GATHERING",
          command: "HARVEST_FRUIT",
          resource: "FRUIT",
        } as const)
      : counts.game >= 2
        ? ({ tech: "HUNTING", command: "HUNT_GAME", resource: "GAME" } as const)
        : counts.fish >= 2
          ? ({
              tech: "SHORECRAFT",
              command: "HARVEST_FISH",
              resource: "FISH",
            } as const)
          : null;
  if (kind === null) throw new Error("capital is not growth-ready");
  const cells = state.board.tiles
    .filter(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - capital.x),
          Math.abs(tile.at.y - capital.y),
        ) === 1 && tile.resource === kind.resource,
    )
    .slice(0, 2)
    .map((tile) => tile.at);
  return { tech: kind.tech, command: kind.command, cells };
}

/**
 * The seed-71 revision-13 Dry Land board (human capital active, everything
 * explored) with the human capital's eight ring cells patched: listed cells
 * take the given terrain and resource, every other ring cell becomes empty
 * Grass. Radius-2 cells get Fruit so revision-12 Gathering would score high.
 */
function territoryState(
  patches: readonly RingPatch[],
  player: { researchedTechs?: readonly string[]; coins?: number } = {},
): GameStateV7 {
  const base = exploredAllV7(initialV7(71));
  const capital = required(
    base.cities.find((city) => city.ownerId === base.humanPlayerId),
  );
  const ring = base.board.tiles
    .filter(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - capital.at.x),
          Math.abs(tile.at.y - capital.at.y),
        ) === 1,
    )
    .map((tile) => tile.at);
  return checkedV7({
    ...base,
    players: base.players.map((item) =>
      item.id === base.humanPlayerId
        ? {
            ...item,
            researchedTechs: (player.researchedTechs ??
              item.researchedTechs) as typeof item.researchedTechs,
            coins: player.coins ?? item.coins,
          }
        : item,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const index = ring.findIndex(
          (at) => at.x === tile.at.x && at.y === tile.at.y,
        );
        const distance = Math.max(
          Math.abs(tile.at.x - capital.at.x),
          Math.abs(tile.at.y - capital.at.y),
        );
        if (index < 0)
          return distance === 2 &&
            tile.site === null &&
            tile.improvement === null &&
            tile.biome !== null &&
            !base.treasureChests.some(
              (chest) => chest.x === tile.at.x && chest.y === tile.at.y,
            )
            ? { ...tile, terrain: "GRASS" as const, resource: "FRUIT" as const }
            : tile;
        const patch = patches.find((item) => item[0] === index);
        return {
          ...tile,
          terrain: patch?.[1] ?? "GRASS",
          resource: patch?.[2] ?? null,
          improvement: null,
          road: false,
        };
      }),
    },
  });
}

function territoryView(patches: readonly RingPatch[]): PlayerViewV7 {
  const state = territoryState(patches);
  return viewForV7(state, state.humanPlayerId);
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("missing value");
  return value;
}
