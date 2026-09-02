import { describe, expect, it } from "vitest";
import {
  RESOURCE_IDS,
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  UNKNOWN_RESOURCE_V6,
  canonicalGameStateHashV6,
  canonicalMapRandomHashV6,
  createInitialMapStateV6,
  generateInitialMapV6,
  neutralVillageCountV6,
  parseGameStateV6,
  resourceForTerrainV6,
  resourceStreamEndsAfterV6,
  spatialEconomyMetricsV6,
  validateInitialCityTerritoriesV6,
  validateMapInvariantsV6,
  viewForV6,
  type AiCountV6,
  type BoardSizeV6,
  type GameStateV6,
  type MatchSetupV6,
  type PlayerStateV6,
  type ResourceId,
  type TechnologyId,
  type TileStateV6,
} from "../../src/engine/index";

const FIXED_HASHES = [
  [
    1,
    11,
    1,
    857_295_258,
    "557e70c11d8b3c4d1316a46ddc6a8c59c925c70d4ba470a430bec5ed47a83f8a",
  ],
  [
    2,
    14,
    1,
    3_745_556_220,
    "af84dd8f6c52c6931abb66872530e19bf97d9789336493456c0d0cb12fc560a2",
  ],
  [
    3,
    16,
    1,
    1_458_825_728,
    "912b50f7af8bccf4f0c1db4ba53344e6d583d38856f039bae97bf4463e1b4503",
  ],
  [
    3,
    20,
    1,
    4_267_992_893,
    "55ad0c9c7f83299f83c62af8d2d07ccf1fa4396a6ce34f373a315234c00e45f8",
  ],
  [
    3,
    25,
    2,
    4_014_644_196,
    "90907f4585f0c08b416479514500109b641ed115cfb1a8523d1fe87995075269",
  ],
] as const;

const LEGAL_COMBINATIONS = [
  [1, 11],
  [1, 14],
  [2, 14],
  [1, 16],
  [2, 16],
  [3, 16],
  [1, 20],
  [2, 20],
  [3, 20],
  [1, 25],
  [2, 25],
  [3, 25],
] as const;

describe("ruleset-6 spatial-economy map generation", () => {
  it.each(FIXED_HASHES)(
    "matches the fixed seed-zero %i-AI/%i map and post-generation PRNG hash",
    (aiCount, size, attempt, randomState, hash) => {
      const first = generateInitialMapV6(setup(aiCount, size, 0));
      const second = generateInitialMapV6(setup(aiCount, size, 0));
      if (!first.ok || !second.ok) throw new Error("Map generation failed");
      expect(first).toEqual(second);
      expect(first.map.attempt).toBe(attempt);
      expect(first.map.random.state).toBe(randomState);
      expect(canonicalMapRandomHashV6(first.map)).toBe(hash);
      expect(canonicalMapRandomHashV6(second.map)).toBe(hash);
    },
  );

  it.each([
    [1, 11, 3, 22, 29],
    [2, 14, 4, 35, 47],
    [3, 16, 6, 46, 61],
    [1, 20, 13, 72, 96],
    [2, 20, 12, 72, 96],
    [3, 20, 11, 72, 96],
    [1, 25, 20, 113, 150],
    [2, 25, 19, 113, 150],
    [3, 25, 18, 113, 150],
  ] as const)(
    "creates exact %i-AI/%i settlement and terrain targets",
    (aiCount, size, villages, mountains, forests) => {
      const result = generateInitialMapV6(setup(aiCount, size, 17));
      if (!result.ok) throw new Error(result.error.code);
      const { board } = result.map;
      expect(neutralVillageCountV6(setup(aiCount, size, 17))).toBe(villages);
      expect(
        board.tiles.filter((tile) => tile.site === "CAPITAL"),
      ).toHaveLength(aiCount + 1);
      expect(
        board.tiles.filter((tile) => tile.site === "VILLAGE"),
      ).toHaveLength(villages);
      expect(
        board.tiles.filter((tile) => tile.terrain === "MOUNTAIN"),
      ).toHaveLength(mountains);
      expect(
        board.tiles.filter((tile) => tile.terrain === "FOREST"),
      ).toHaveLength(forests);
      expect(validateMapInvariantsV6(board, aiCount + 1, villages)).toEqual([]);
      for (const resource of RESOURCE_IDS) {
        expect(board.tiles.some((tile) => tile.resource === resource)).toBe(
          true,
        );
      }
      expect(
        board.tiles
          .filter((tile) => tile.site !== null)
          .every(
            (tile) =>
              tile.terrain === "GRASS" &&
              tile.resource === null &&
              tile.improvement === null &&
              !tile.road,
          ),
      ).toBe(true);
    },
  );

  it("maps every exact uint32 threshold without using floating-point probabilities", () => {
    expect(
      [0, 0x1fff_ffff, 0x2000_0000, 0x7fff_ffff, 0x8000_0000].map((draw) =>
        resourceForTerrainV6("GRASS", draw),
      ),
    ).toEqual(["FRUIT", "FRUIT", "FERTILE_GROUND", "FERTILE_GROUND", null]);
    expect(
      [0, 0x4fff_ffff, 0x5000_0000].map((draw) =>
        resourceForTerrainV6("FOREST", draw),
      ),
    ).toEqual(["GAME", "GAME", null]);
    expect(
      [0, 0x2fff_ffff, 0x3000_0000, 0x8fff_ffff, 0x9000_0000, 0xffff_ffff].map(
        (draw) => resourceForTerrainV6("MOUNTAIN", draw),
      ),
    ).toEqual(["ORE", "ORE", "STONE", "STONE", null, null]);
  });

  it("consumes exactly one continued-stream resource draw per non-settlement", () => {
    const result = generateInitialMapV6(setup(3, 25, 0));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.map.attempt).toBe(2);
    for (const attempt of result.map.attempts) {
      expect(attempt.resourceDrawCount).toBe(625 - 22);
      expect(attempt.finalRandomState).toBe(
        resourceStreamEndsAfterV6(
          attempt.resourceRandomState,
          attempt.resourceDrawCount,
        ),
      );
    }
    expect(result.map.attempts[0]?.failures.length).toBeGreaterThan(0);
    expect(result.map.attempts[1]?.failures).toEqual([]);
    expect(result.map.attempts[1]?.initialRandomState).toBe(
      result.map.attempts[0]?.finalRandomState,
    );
  });

  it("fails at exactly 256 continued attempts without weakening constraints", () => {
    const impossible = setup(3, 11, 0) as MatchSetupV6;
    const first = generateInitialMapV6(impossible);
    const second = generateInitialMapV6(impossible);
    expect(first).toEqual(second);
    expect(first).toEqual({
      ok: false,
      error: {
        code: "MAP_GENERATION_FAILED",
        params: {
          seed: 0,
          width: 11,
          height: 11,
          attempts: 256,
          lastFailure: "SETTLEMENT_COUNT",
        },
      },
    });
  });

  it("builds a schema-valid staged map state with one disjoint 3x3 footprint per city", () => {
    const original = createInitialMapStateV6(setup(3, 16, 41));
    const candy = createInitialMapStateV6(
      setup(3, 16, 41, "COOPERATIVE", [
        "CANDY",
        "ORIGINAL",
        "CANDY",
        "ORIGINAL",
      ]),
    );
    if (!original.ok || !candy.ok) throw new Error("State creation failed");
    expect(parseGameStateV6(original.state)).toEqual(original.state);
    expect(canonicalGameStateHashV6(original.state)).toBe(
      canonicalGameStateHashV6(createState(setup(3, 16, 41))),
    );
    expect(
      validateInitialCityTerritoriesV6(
        original.state.board,
        original.state.cities,
      ),
    ).toBe(true);
    for (const city of original.state.cities) {
      expect(
        original.state.board.tiles.filter(
          (tile) => tile.territoryCityId === city.id,
        ),
      ).toHaveLength(9);
    }
    expect(
      original.state.board.tiles.filter(
        (tile) => tile.site === "VILLAGE" && tile.territoryCityId !== null,
      ),
    ).toEqual([]);
    expect(candy.state.board).toEqual(original.state.board);
    expect(candy.state.random).toEqual(original.state.random);
    expect(candy.state.turnOrder).toEqual(original.state.turnOrder);
    expect(candy.state.cities).toEqual(original.state.cities);
    expect(candy.state.units).toEqual(original.state.units);
  });

  it.each([
    [1, 11, 42, "maxFarmClusterSize", 5],
    [2, 20, 38, "maxMineAdjacency", 3],
    [1, 11, 17, "maxQuarryOppositePairs", 1],
    [1, 11, 146, "maxMixedFamilies", 4],
    [1, 11, 7, "viableLateGameSiteCount", 2],
  ] as const)(
    "keeps fixed jackpot-supporting layout %i-AI/%i seed %i (%s)",
    (aiCount, size, seed, metric, minimum) => {
      const result = generateInitialMapV6(setup(aiCount, size, seed));
      if (!result.ok) throw new Error(result.error.code);
      expect(
        spatialEconomyMetricsV6(result.map.board)[metric],
      ).toBeGreaterThanOrEqual(minimum);
    },
  );

  it("runs a bounded 120-map repeated corpus across every legal size/AI pair", () => {
    const failures: string[] = [];
    let retries = 0;
    let maxFarmCluster = 0;
    let maxMineAdjacency = 0;
    let maxQuarryPairs = 0;
    let maxMixedFamilies = 0;
    let viableLateGameSites = 0;
    const opportunityMixes = new Set<string>();

    for (const [aiCount, size] of LEGAL_COMBINATIONS) {
      for (let seed = 0; seed < 10; seed += 1) {
        const rivalSetup = setup(aiCount, size, seed);
        const rival = generateInitialMapV6(rivalSetup);
        const repeated = generateInitialMapV6(rivalSetup);
        const cooperative = generateInitialMapV6(
          setup(aiCount, size, seed, "COOPERATIVE"),
        );
        if (!rival.ok || !repeated.ok || !cooperative.ok) {
          failures.push(`${aiCount}/${size}/${seed}:create`);
          continue;
        }
        if (
          canonicalMapRandomHashV6(rival.map) !==
            canonicalMapRandomHashV6(repeated.map) ||
          canonicalMapRandomHashV6(rival.map) !==
            canonicalMapRandomHashV6(cooperative.map)
        ) {
          failures.push(`${aiCount}/${size}/${seed}:repeat-or-mode-hash`);
        }
        if (
          validateMapInvariantsV6(
            rival.map.board,
            aiCount + 1,
            neutralVillageCountV6(rivalSetup),
          ).length > 0
        ) {
          failures.push(`${aiCount}/${size}/${seed}:invariant`);
        }
        if (
          rival.map.attempts.some(
            (attempt) =>
              attempt.resourceDrawCount !==
                size * size -
                  (aiCount + 1 + neutralVillageCountV6(rivalSetup)) ||
              attempt.finalRandomState !==
                resourceStreamEndsAfterV6(
                  attempt.resourceRandomState,
                  attempt.resourceDrawCount,
                ),
          )
        ) {
          failures.push(`${aiCount}/${size}/${seed}:resource-stream`);
        }
        retries += rival.map.attempt - 1;
        const metrics = spatialEconomyMetricsV6(rival.map.board);
        maxFarmCluster = Math.max(maxFarmCluster, metrics.maxFarmClusterSize);
        maxMineAdjacency = Math.max(maxMineAdjacency, metrics.maxMineAdjacency);
        maxQuarryPairs = Math.max(
          maxQuarryPairs,
          metrics.maxQuarryOppositePairs,
        );
        maxMixedFamilies = Math.max(maxMixedFamilies, metrics.maxMixedFamilies);
        viableLateGameSites += metrics.viableLateGameSiteCount;
        opportunityMixes.add(
          [
            metrics.maxFarmClusterSize,
            metrics.maxMineAdjacency,
            metrics.maxQuarryOppositePairs,
            metrics.maxMixedFamilies,
            metrics.viableLateGameSiteCount,
          ].join(","),
        );
      }
    }

    expect(failures).toEqual([]);
    expect(retries).toBeGreaterThan(0);
    expect(opportunityMixes.size).toBeGreaterThan(20);
    expect(maxFarmCluster).toBeGreaterThanOrEqual(5);
    expect(maxMineAdjacency).toBeGreaterThanOrEqual(2);
    expect(maxQuarryPairs).toBeGreaterThanOrEqual(1);
    expect(maxMixedFamilies).toBe(4);
    expect(viableLateGameSites).toBeGreaterThan(0);
  }, 30_000);
});

describe("ruleset-6 fog-safe resource projection", () => {
  it.each(["ORIGINAL", "CANDY"] as const)(
    "shows explored Game from match start for %s without exposing it through fog",
    (faction) => {
      const other = faction === "ORIGINAL" ? "CANDY" : "ORIGINAL";
      const base = createState(setup(1, 11, 9, "RIVAL", [faction, other]));
      const forest = requireResourcePair(base, "FOREST", "GAME");
      const visible = withViewer(
        base,
        ["GATHERING"],
        [forest.present.at, forest.absent.at],
      );
      const withoutGame = replaceResource(visible, forest.present, null);

      expect(viewTile(visible, forest.present.at).resource).toBe("GAME");
      expect(viewTile(visible, forest.absent.at).resource).toBeNull();
      expect(viewForV6(visible, visible.humanPlayerId)).not.toEqual(
        viewForV6(withoutGame, withoutGame.humanPlayerId),
      );
      expect(
        viewForV6(base, base.humanPlayerId).board.tiles.find((tile) =>
          sameCoord(tile.at, forest.present.at),
        ),
      ).toEqual({ at: forest.present.at, explored: false });
    },
  );

  it("uses UNKNOWN_RESOURCE for identity and absence until each remaining reveal tech", () => {
    const base = createState(setup(1, 11, 9));
    const mountain = requireResourcePair(base, "MOUNTAIN", "ORE");

    const ore = withViewer(
      base,
      ["GATHERING"],
      [mountain.present.at, mountain.absent.at],
    );
    const noOre = replaceResource(ore, mountain.present, null);
    expect(viewForV6(ore, ore.humanPlayerId)).toEqual(
      viewForV6(noOre, noOre.humanPlayerId),
    );
    expect(viewTile(ore, mountain.present.at).resource).toBe(
      UNKNOWN_RESOURCE_V6,
    );
    const surveyed = withViewer(
      ore,
      ["GATHERING", "SURVEYING"],
      [mountain.present.at, mountain.absent.at],
    );
    expect(viewTile(surveyed, mountain.present.at).resource).toBe("ORE");
    expect(viewTile(surveyed, mountain.absent.at).resource).toBeNull();
  });

  it("reveals starting Gathering resources but no surrounding hidden content", () => {
    const base = createState(setup(1, 11, 12));
    const fruit = base.board.tiles.find((tile) => tile.resource === "FRUIT");
    const fertile = base.board.tiles.find(
      (tile) => tile.resource === "FERTILE_GROUND",
    );
    const hidden = base.board.tiles.find(
      (tile) =>
        tile.site === null &&
        tile.terrain === "MOUNTAIN" &&
        tile.resource !== null,
    );
    if (fruit === undefined || fertile === undefined || hidden === undefined) {
      throw new Error("Required resource fixture missing");
    }
    const state = withViewer(base, ["GATHERING"], [fruit.at, fertile.at]);
    expect(viewTile(state, fruit.at).resource).toBe("FRUIT");
    expect(viewTile(state, fertile.at).resource).toBe("FERTILE_GROUND");
    expect(
      viewForV6(state, state.humanPlayerId).board.tiles.find((tile) =>
        sameCoord(tile.at, hidden.at),
      ),
    ).toEqual({ at: hidden.at, explored: false });
  });

  it("keeps improvements, Roads, and territory ownership public on explored tiles", () => {
    const base = createState(setup(1, 11, 4));
    const forest = base.board.tiles.find(
      (tile) => tile.terrain === "FOREST" && tile.resource === null,
    );
    const enemyCity = base.cities.find(
      (city) => city.ownerId !== base.humanPlayerId,
    );
    if (forest === undefined || enemyCity === undefined) {
      throw new Error("Required public-view fixture missing");
    }
    const territoryEdge = base.board.tiles.find(
      (tile) =>
        tile.territoryCityId === enemyCity.id &&
        !sameCoord(tile.at, enemyCity.at),
    );
    if (territoryEdge === undefined) throw new Error("Missing territory edge");
    const developed: GameStateV6 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          sameCoord(tile.at, forest.at)
            ? { ...tile, improvement: "LUMBER_CAMP", road: true }
            : tile,
        ),
      },
    };
    const state = withViewer(
      developed,
      ["GATHERING"],
      [forest.at, territoryEdge.at],
    );
    expect(viewTile(state, forest.at)).toMatchObject({
      explored: true,
      resource: null,
      improvement: "LUMBER_CAMP",
      road: true,
    });
    expect(viewTile(state, territoryEdge.at)).toMatchObject({
      explored: true,
      territoryCityId: null,
      territoryOwnerId: enemyCity.ownerId,
    });
    expect(
      viewForV6(state, state.humanPlayerId).cities.some(
        (city) => city.id === enemyCity.id,
      ),
    ).toBe(false);
  });
});

function setup(
  aiCount: AiCountV6,
  size: BoardSizeV6,
  seed: number,
  aiMode: MatchSetupV6["aiMode"] = "RIVAL",
  factions: MatchSetupV6["factions"] = Array.from(
    { length: aiCount + 1 },
    () => "ORIGINAL" as const,
  ),
): MatchSetupV6 {
  return {
    rulesetId: RULESET_6_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions,
    mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
  };
}

function createState(matchSetup: MatchSetupV6): GameStateV6 {
  const created = createInitialMapStateV6(matchSetup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function withViewer(
  state: GameStateV6,
  researchedTechs: readonly TechnologyId[],
  explored: readonly TileStateV6["at"][],
): GameStateV6 {
  const ordered = [...researchedTechs].sort(
    (left, right) =>
      TECHNOLOGY_ORDER.indexOf(left) - TECHNOLOGY_ORDER.indexOf(right),
  );
  return {
    ...state,
    players: state.players.map((player): PlayerStateV6 =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            researchedTechs: ordered,
            explored: [...explored].sort(
              (left, right) => left.y - right.y || left.x - right.x,
            ),
          }
        : player,
    ),
  };
}

function replaceResource(
  state: GameStateV6,
  tile: TileStateV6,
  resource: ResourceId | null,
): GameStateV6 {
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        sameCoord(candidate.at, tile.at)
          ? { ...candidate, resource }
          : candidate,
      ),
    },
  };
}

function requireResourcePair(
  state: GameStateV6,
  terrain: TileStateV6["terrain"],
  resource: ResourceId,
): { readonly present: TileStateV6; readonly absent: TileStateV6 } {
  const present = state.board.tiles.find(
    (tile) => tile.terrain === terrain && tile.resource === resource,
  );
  const absent = state.board.tiles.find(
    (tile) => tile.terrain === terrain && tile.resource === null,
  );
  if (present === undefined || absent === undefined) {
    throw new Error(`Missing ${terrain}/${resource} resource pair`);
  }
  return { present, absent };
}

function viewTile(state: GameStateV6, at: TileStateV6["at"]) {
  const tile = viewForV6(state, state.humanPlayerId).board.tiles.find(
    (candidate) => sameCoord(candidate.at, at),
  );
  if (tile?.explored !== true) throw new Error("Expected explored tile");
  return tile;
}

function sameCoord(left: TileStateV6["at"], right: TileStateV6["at"]): boolean {
  return left.x === right.x && left.y === right.y;
}

const TECHNOLOGY_ORDER: readonly TechnologyId[] = [
  "GATHERING",
  "FARMING",
  "MILLING",
  "CRAFT",
  "GRAND_WORKS",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "FIELDCRAFT",
  "SURVEYING",
  "MINING",
  "METALLURGY",
  "QUARRYING",
  "MASONRY",
  "SCOUTING",
  "ROADS",
  "COMMERCE",
  "RAIDING",
  "MANEUVER",
  "DRILL",
  "FORTIFICATION",
  "EXPLOSIVES",
  "MEDICINE",
  "RECOVERY",
];
