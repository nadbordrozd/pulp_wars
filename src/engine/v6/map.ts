import { canonicalHash } from "../replay/canonical";
import { deepFreeze } from "../model/freeze";
import {
  allocateCityId,
  allocateUnitId,
  playerId,
  type CityId,
} from "../model/ids";
import { nextBounded, nextUint32, randomState } from "../random/random";
import { factionTechnologyTreeV6 } from "../rules/ruleset-v6";
import { parseMatchSetupV6 } from "./setup";
import {
  GAME_STATE_SCHEMA_VERSION_6,
  RESOURCE_IDS,
  RULESET_6_ID,
  type AiCountV6,
  type BoardStateV6,
  type CityStateV6,
  type CoordV6,
  type GameStateV6,
  type MatchSetupV6,
  type PlayerColorV6,
  type PlayerStateV6,
  type RandomStateV6,
  type ResourceId,
  type TerrainIdV6,
  type TileStateV6,
  type UnitStateV6,
} from "./types";

export const MAX_MAP_GENERATION_ATTEMPTS_V6 = 256;

const PLAYER_COLORS_V6: readonly PlayerColorV6[] = [
  "CORAL",
  "TEAL",
  "GOLD",
  "VIOLET",
];

const MULBERRY_INCREMENT = 0x6d2b_79f5;

export type MapInvariantCodeV6 =
  | "TILE_LAYOUT"
  | "SETTLEMENT_COUNT"
  | "SETTLEMENT_EMPTY_GRASS"
  | "SETTLEMENT_SPACING"
  | "CAPITAL_SPACING"
  | "CAPITAL_GRASS_NEIGHBORS"
  | "CAPITALS_DISCONNECTED"
  | "MOUNTAIN_COUNT"
  | "FOREST_COUNT"
  | "RESOURCE_TERRAIN"
  | "RESOURCE_GLOBAL_PRESENCE"
  | "SETTLEMENT_OPPORTUNITY_MINIMUM"
  | "SETTLEMENT_FAMILY_MINIMUM";

export interface MapGenerationAttemptV6 {
  readonly attempt: number;
  readonly initialRandomState: number;
  readonly resourceRandomState: number;
  readonly finalRandomState: number;
  readonly resourceDrawCount: number;
  readonly failures: readonly MapInvariantCodeV6[];
}

export interface GeneratedMapV6 {
  readonly board: BoardStateV6;
  readonly capitals: readonly CoordV6[];
  readonly villages: readonly CoordV6[];
  /** Capital coordinate indexed by player seat. */
  readonly capitalAssignments: readonly CoordV6[];
  /** Player seat indices in turn order. */
  readonly turnOrderSeats: readonly number[];
  readonly random: RandomStateV6;
  readonly attempt: number;
  readonly attempts: readonly MapGenerationAttemptV6[];
}

export interface MapGenerationFailureV6 {
  readonly code: "MAP_GENERATION_FAILED";
  readonly params: Readonly<{
    seed: number;
    width: number;
    height: number;
    attempts: 256;
    lastFailure: MapInvariantCodeV6;
  }>;
}

export type GenerateMapResultV6 =
  | { readonly ok: true; readonly map: GeneratedMapV6 }
  | { readonly ok: false; readonly error: MapGenerationFailureV6 };

interface CandidateV6 {
  readonly board: BoardStateV6;
  readonly capitals: readonly CoordV6[];
  readonly villages: readonly CoordV6[];
  readonly capitalAssignments: readonly CoordV6[];
  readonly turnOrderSeats: readonly number[];
  readonly random: RandomStateV6;
  readonly resourceRandomState: number;
  readonly resourceDrawCount: number;
}

const STANDARD_NEUTRAL_VILLAGES: Readonly<Record<AiCountV6, number>> = {
  1: 3,
  2: 4,
  3: 6,
};

const LARGE_NEUTRAL_VILLAGES: Readonly<Record<AiCountV6, number>> = {
  1: 13,
  2: 12,
  3: 11,
};

const HUGE_NEUTRAL_VILLAGES: Readonly<Record<AiCountV6, number>> = {
  1: 20,
  2: 19,
  3: 18,
};

/**
 * Generates a ruleset-6 board from one continued Mulberry32 stream. A rejected
 * candidate never rewinds the stream, and attempt 256 is a hard failure.
 */
export function generateInitialMapV6(
  setup: MatchSetupV6,
  initialRandom: RandomStateV6 = randomState(setup.seed),
): GenerateMapResultV6 {
  let random = initialRandom;
  let lastFailure: MapInvariantCodeV6 = "TILE_LAYOUT";
  const attempts: MapGenerationAttemptV6[] = [];
  const villages = neutralVillageCountV6(setup);
  for (
    let attempt = 1;
    attempt <= MAX_MAP_GENERATION_ATTEMPTS_V6;
    attempt += 1
  ) {
    const initialRandomState = random.state;
    const candidate = generateCandidateV6(setup, random);
    random = candidate.random;
    const failures = validateMapInvariantsV6(
      candidate.board,
      setup.aiCount + 1,
      villages,
    );
    attempts.push({
      attempt,
      initialRandomState,
      resourceRandomState: candidate.resourceRandomState,
      finalRandomState: candidate.random.state,
      resourceDrawCount: candidate.resourceDrawCount,
      failures,
    });
    if (failures.length === 0) {
      return {
        ok: true,
        map: deepFreeze({
          board: candidate.board,
          capitals: candidate.capitals,
          villages: candidate.villages,
          capitalAssignments: candidate.capitalAssignments,
          turnOrderSeats: candidate.turnOrderSeats,
          random: candidate.random,
          attempt,
          attempts,
        }),
      };
    }
    lastFailure = failures[0] ?? "TILE_LAYOUT";
  }
  return {
    ok: false,
    error: {
      code: "MAP_GENERATION_FAILED",
      params: {
        seed: setup.seed,
        width: setup.width,
        height: setup.height,
        attempts: MAX_MAP_GENERATION_ATTEMPTS_V6,
        lastFailure,
      },
    },
  };
}

export function neutralVillageCountV6(setup: MatchSetupV6): number {
  return setup.width === 25
    ? HUGE_NEUTRAL_VILLAGES[setup.aiCount]
    : setup.width === 20
      ? LARGE_NEUTRAL_VILLAGES[setup.aiCount]
      : STANDARD_NEUTRAL_VILLAGES[setup.aiCount];
}

export function resourceForTerrainV6(
  terrain: TerrainIdV6,
  draw: number,
): ResourceId | null {
  if (!Number.isInteger(draw) || draw < 0 || draw > 0xffff_ffff) {
    throw new RangeError("resource draw must be a uint32");
  }
  if (terrain === "GRASS") {
    return draw < 0x2000_0000
      ? "FRUIT"
      : draw < 0x8000_0000
        ? "FERTILE_GROUND"
        : null;
  }
  if (terrain === "FOREST") return draw < 0x5000_0000 ? "GAME" : null;
  return draw < 0x3000_0000 ? "ORE" : draw < 0x9000_0000 ? "STONE" : null;
}

export function validateMapInvariantsV6(
  board: BoardStateV6,
  expectedCapitals: number,
  expectedVillages: number,
): readonly MapInvariantCodeV6[] {
  const failures: MapInvariantCodeV6[] = [];
  const expectedCells = board.width * board.height;
  if (
    board.tiles.length !== expectedCells ||
    board.tiles.some(
      (tile, index) =>
        tile.at.x !== index % board.width ||
        tile.at.y !== Math.floor(index / board.width) ||
        !onBoard(board, tile.at),
    )
  ) {
    failures.push("TILE_LAYOUT");
  }
  const capitals = board.tiles.filter((tile) => tile.site === "CAPITAL");
  const villages = board.tiles.filter((tile) => tile.site === "VILLAGE");
  const settlements = [...capitals, ...villages];
  if (
    capitals.length !== expectedCapitals ||
    villages.length !== expectedVillages
  ) {
    failures.push("SETTLEMENT_COUNT");
  }
  if (
    settlements.some(
      (tile) =>
        tile.terrain !== "GRASS" ||
        tile.resource !== null ||
        tile.improvement !== null ||
        tile.road ||
        tile.at.x < 2 ||
        tile.at.y < 2 ||
        tile.at.x >= board.width - 2 ||
        tile.at.y >= board.height - 2,
    )
  ) {
    failures.push("SETTLEMENT_EMPTY_GRASS");
  }
  if (
    hasPairCloserThan(
      settlements.map(({ at }) => at),
      3,
    )
  ) {
    failures.push("SETTLEMENT_SPACING");
  }
  if (
    hasPairCloserThan(
      capitals.map(({ at }) => at),
      Math.floor(board.width / 2),
    )
  ) {
    failures.push("CAPITAL_SPACING");
  }
  if (
    capitals.some(
      (capital) =>
        neighbors(board, capital.at).filter(
          (tile) => tile.terrain !== "MOUNTAIN",
        ).length < 4,
    )
  ) {
    failures.push("CAPITAL_GRASS_NEIGHBORS");
  }
  if (
    !capitalsConnected(
      board,
      capitals.map(({ at }) => at),
    )
  ) {
    failures.push("CAPITALS_DISCONNECTED");
  }
  if (
    board.tiles.filter((tile) => tile.terrain === "MOUNTAIN").length !==
    roundHalfUpPercent(expectedCells, 18)
  ) {
    failures.push("MOUNTAIN_COUNT");
  }
  if (
    board.tiles.filter((tile) => tile.terrain === "FOREST").length !==
    roundHalfUpPercent(expectedCells, 24)
  ) {
    failures.push("FOREST_COUNT");
  }
  if (
    board.tiles.some((tile) =>
      tile.resource === "FRUIT" || tile.resource === "FERTILE_GROUND"
        ? tile.terrain !== "GRASS"
        : tile.resource === "GAME"
          ? tile.terrain !== "FOREST"
          : tile.resource === "ORE" || tile.resource === "STONE"
            ? tile.terrain !== "MOUNTAIN"
            : false,
    )
  ) {
    failures.push("RESOURCE_TERRAIN");
  }
  if (
    RESOURCE_IDS.some(
      (resource) => !board.tiles.some((tile) => tile.resource === resource),
    )
  ) {
    failures.push("RESOURCE_GLOBAL_PRESENCE");
  }
  for (const settlement of settlements) {
    const surrounding = neighbors(board, settlement.at);
    const opportunities = surrounding.filter(isEconomicOpportunityV6);
    if (opportunities.length < 3) {
      failures.push("SETTLEMENT_OPPORTUNITY_MINIMUM");
      break;
    }
    const families = new Set(
      opportunities.map(economicFamilyV6).filter((family) => family !== null),
    );
    if (families.size < 2) {
      failures.push("SETTLEMENT_FAMILY_MINIMUM");
      break;
    }
  }
  return failures;
}

export function canonicalMapRandomHashV6(map: GeneratedMapV6): string {
  return canonicalHash({ board: map.board, random: map.random });
}

/** Assigns every supplied city's disjoint centered 3 x 3 initial footprint. */
export function assignInitialCityTerritoriesV6(
  board: BoardStateV6,
  cities: readonly Pick<CityStateV6, "id" | "at">[],
): BoardStateV6 {
  const assignments = new Map<string, CityId>();
  for (const city of [...cities].sort((left, right) => left.id - right.id)) {
    const center = tileAt(board, city.at);
    if (
      center === undefined ||
      (center.site !== "CAPITAL" && center.site !== "CITY")
    ) {
      throw new RangeError("City center must be a settlement tile");
    }
    for (const at of coordsInRadius(board.width, board.height, city.at, 1)) {
      const key = coordKey(at);
      if (assignments.has(key)) {
        throw new RangeError("Initial city territories overlap");
      }
      assignments.set(key, city.id);
    }
  }
  return deepFreeze({
    ...board,
    tiles: board.tiles.map((tile) => ({
      ...tile,
      territoryCityId: assignments.get(coordKey(tile.at)) ?? null,
    })),
  });
}

export function validateInitialCityTerritoriesV6(
  board: BoardStateV6,
  cities: readonly Pick<CityStateV6, "id" | "at">[],
): boolean {
  const cityIds = new Set(cities.map(({ id }) => id));
  return (
    cities.every((city) => {
      const footprint = coordsInRadius(board.width, board.height, city.at, 1);
      return (
        footprint.length === 9 &&
        board.tiles.filter((tile) => tile.territoryCityId === city.id)
          .length === 9 &&
        footprint.every((at) => tileAt(board, at)?.territoryCityId === city.id)
      );
    }) &&
    board.tiles.every(
      (tile) =>
        tile.territoryCityId === null || cityIds.has(tile.territoryCityId),
    )
  );
}

export interface SpatialEconomyMetricsV6 {
  readonly settlementCount: number;
  /** Index is the potential orthogonally connected Farm-cluster size. */
  readonly farmClusterSizeCounts: readonly number[];
  /** Index is adjacent potential Mine count for an empty processor site. */
  readonly mineAdjacencySiteCounts: readonly number[];
  /** Index is the number of opposite potential Quarry axes at a site. */
  readonly quarryOppositePairSiteCounts: readonly number[];
  /** Index is the number of distinct potential basic economic families. */
  readonly mixedFamilySiteCounts: readonly number[];
  readonly viableLateGameSiteCount: number;
  readonly maxFarmClusterSize: number;
  readonly maxMineAdjacency: number;
  readonly maxQuarryOppositePairs: number;
  readonly maxMixedFamilies: number;
}

/**
 * Measures raw-map support for later spatial buildings. These are diagnostics,
 * never generation constraints: an individual city is not promised a jackpot.
 */
export function spatialEconomyMetricsV6(
  board: BoardStateV6,
): SpatialEconomyMetricsV6 {
  const settlements = board.tiles.filter(
    (tile) => tile.site === "CAPITAL" || tile.site === "VILLAGE",
  );
  const farmClusterSizeCounts = Array.from({ length: 9 }, () => 0);
  const mineAdjacencySiteCounts = Array.from({ length: 9 }, () => 0);
  const quarryOppositePairSiteCounts = Array.from({ length: 5 }, () => 0);
  const mixedFamilySiteCounts = Array.from({ length: 5 }, () => 0);
  let viableLateGameSiteCount = 0;

  for (const settlement of settlements) {
    const territory = coordsInRadius(
      board.width,
      board.height,
      settlement.at,
      1,
    );
    const territoryKeys = new Set(territory.map(coordKey));
    const fertile = territory.filter(
      (at) => tileAt(board, at)?.resource === "FERTILE_GROUND",
    );
    const unseen = new Set(fertile.map(coordKey));
    while (unseen.size > 0) {
      const firstKey = unseen.values().next().value as string;
      const first = parseCoordKey(firstKey);
      const queue = [first];
      unseen.delete(firstKey);
      let size = 0;
      for (let index = 0; index < queue.length; index += 1) {
        const at = queue[index];
        if (at === undefined) continue;
        size += 1;
        for (const next of orthogonalCoords(at)) {
          const key = coordKey(next);
          if (territoryKeys.has(key) && unseen.delete(key)) queue.push(next);
        }
      }
      farmClusterSizeCounts[size] = (farmClusterSizeCounts[size] ?? 0) + 1;
    }

    const candidates = territory.filter((at) => {
      const tile = tileAt(board, at);
      return tile?.site === null && tile.resource === null;
    });
    const processorFamilies = new Map<string, readonly EconomicFamilyV6[]>();
    for (const at of candidates) {
      const adjacent = neighborsInKeys(board, at, territoryKeys);
      const mines = adjacent.filter((tile) => tile.resource === "ORE").length;
      mineAdjacencySiteCounts[mines] =
        (mineAdjacencySiteCounts[mines] ?? 0) + 1;
      const pairs = oppositeStonePairCount(board, at, territoryKeys);
      quarryOppositePairSiteCounts[pairs] =
        (quarryOppositePairSiteCounts[pairs] ?? 0) + 1;
      const families = potentialBasicFamilies(adjacent);
      mixedFamilySiteCounts[families.length] =
        (mixedFamilySiteCounts[families.length] ?? 0) + 1;
      processorFamilies.set(coordKey(at), potentialProcessorFamilies(adjacent));
    }
    for (const at of candidates) {
      const adjacentProcessorSites = neighborsInKeys(board, at, territoryKeys)
        .filter((tile) => processorFamilies.has(coordKey(tile.at)))
        .map((tile) => processorFamilies.get(coordKey(tile.at)) ?? []);
      if (maximumDistinctFamilyPlacements(adjacentProcessorSites) >= 3) {
        viableLateGameSiteCount += 1;
      }
    }
  }

  return deepFreeze({
    settlementCount: settlements.length,
    farmClusterSizeCounts,
    mineAdjacencySiteCounts,
    quarryOppositePairSiteCounts,
    mixedFamilySiteCounts,
    viableLateGameSiteCount,
    maxFarmClusterSize: highestNonzeroIndex(farmClusterSizeCounts),
    maxMineAdjacency: highestNonzeroIndex(mineAdjacencySiteCounts),
    maxQuarryOppositePairs: highestNonzeroIndex(quarryOppositePairSiteCounts),
    maxMixedFamilies: highestNonzeroIndex(mixedFamilySiteCounts),
  });
}

export type CreateInitialMapStateResultV6 =
  | {
      readonly ok: true;
      readonly state: GameStateV6;
      readonly mapAttempt: number;
    }
  | {
      readonly ok: false;
      readonly error:
        | {
            readonly code: "INVALID_SETUP";
            readonly params: Readonly<Record<string, never>>;
          }
        | MapGenerationFailureV6;
    };

/**
 * Staged state constructor for map/fog work. It intentionally does not run a
 * turn lifecycle or economy reducers; later delivery beads own those systems.
 */
export function createInitialMapStateV6(
  input: unknown,
): CreateInitialMapStateResultV6 {
  const setup = parseMatchSetupV6(input);
  if (setup === null) {
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  }
  const generated = generateInitialMapV6(setup, randomState(setup.seed));
  if (!generated.ok) return generated;
  const players = createPlayersV6(setup);
  const entities = createStartingEntitiesV6(
    players,
    generated.map.capitalAssignments,
  );
  const board = assignInitialCityTerritoriesV6(
    generated.map.board,
    entities.cities,
  );
  const exploredPlayers = players.map((player, seat) => {
    const at = generated.map.capitalAssignments[seat];
    if (at === undefined) throw new RangeError("Capital assignment missing");
    return {
      ...player,
      explored: coordsInRadius(board.width, board.height, at, 2),
    };
  });
  const turnOrder = generated.map.turnOrderSeats.map((seat) => {
    const player = exploredPlayers[seat];
    if (player === undefined) throw new RangeError("Turn-order seat missing");
    return player.id;
  });
  const state = deepFreeze<GameStateV6>({
    schemaVersion: GAME_STATE_SCHEMA_VERSION_6,
    rulesetId: RULESET_6_ID,
    setup,
    random: generated.map.random,
    humanPlayerId: exploredPlayers[0]?.id ?? playerId(1),
    nextEntityId: entities.nextEntityId,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder,
    board,
    players: exploredPlayers,
    cities: entities.cities,
    populationContributions: [],
    units: entities.units,
    chocolateWalls: [],
    pendingChoices: [],
    outcome: null,
  });
  return { ok: true, state, mapAttempt: generated.map.attempt };
}

function generateCandidateV6(
  setup: MatchSetupV6,
  initialRandom: RandomStateV6,
): CandidateV6 {
  let random = initialRandom;
  let offset = 0;
  if (setup.width === 16) {
    const draw = nextBounded(random, 3);
    offset = draw.value;
    random = draw.random;
  }
  const axis: number[] = [];
  for (
    let coordinate = 2 + offset;
    coordinate < setup.width - 2;
    coordinate += 3
  ) {
    axis.push(coordinate);
  }
  const low = axis[0];
  const high = axis.at(-1);
  if (low === undefined || high === undefined) {
    throw new RangeError("Supported board must contain settlement lattice");
  }
  const cornerShuffle = shuffleV6(
    [
      { x: low, y: low },
      { x: high, y: low },
      { x: low, y: high },
      { x: high, y: high },
    ],
    random,
  );
  random = cornerShuffle.random;
  const capitals = cornerShuffle.values.slice(0, setup.aiCount + 1);
  const capitalKeys = new Set(capitals.map(coordKey));
  const remainingSites = axis
    .flatMap((y) => axis.map((x) => ({ x, y })))
    .filter((at) => !capitalKeys.has(coordKey(at)))
    .sort(compareCoordsV6);
  const villageShuffle = shuffleV6(remainingSites, random);
  random = villageShuffle.random;
  const villages = villageShuffle.values.slice(0, neutralVillageCountV6(setup));
  const settlements = [...capitals, ...villages].sort(compareCoordsV6);

  const capitalAssignmentShuffle = shuffleV6(capitals, random);
  random = capitalAssignmentShuffle.random;
  const turnOrderShuffle = shuffleV6(
    Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
    random,
  );
  random = turnOrderShuffle.random;

  const settlementByKey = new Map<string, "CAPITAL" | "VILLAGE">();
  for (const at of capitals) settlementByKey.set(coordKey(at), "CAPITAL");
  for (const at of villages) settlementByKey.set(coordKey(at), "VILLAGE");
  const nonSettlements: CoordV6[] = [];
  for (let y = 0; y < setup.height; y += 1) {
    for (let x = 0; x < setup.width; x += 1) {
      const at = { x, y };
      if (!settlementByKey.has(coordKey(at))) nonSettlements.push(at);
    }
  }
  const terrainShuffle = shuffleV6(nonSettlements, random);
  random = terrainShuffle.random;
  const terrainRank = new Map(
    terrainShuffle.values.map((at, index) => [coordKey(at), index]),
  );

  // Two shuffled Forest neighbors give each settlement a timber baseline, but
  // the required third opportunity and second family still come from the exact
  // resource draws and therefore remain subject to bounded candidate rejection.
  const reservedForestKeys = new Set<string>();
  for (const settlement of settlements) {
    const rankedNeighbors = coordsInRadius(
      setup.width,
      setup.height,
      settlement,
      1,
    )
      .filter((at) => !sameCoord(at, settlement))
      .sort(
        (left, right) =>
          (terrainRank.get(coordKey(left)) ?? 0) -
          (terrainRank.get(coordKey(right)) ?? 0),
      );
    for (const at of rankedNeighbors.slice(0, 2)) {
      reservedForestKeys.add(coordKey(at));
    }
  }
  const mountainTarget = roundHalfUpPercent(setup.width * setup.height, 18);
  const forestTarget = roundHalfUpPercent(setup.width * setup.height, 24);
  if (reservedForestKeys.size > forestTarget) {
    throw new RangeError("Forest target cannot support settlement baseline");
  }
  const available = terrainShuffle.values.filter(
    (at) => !reservedForestKeys.has(coordKey(at)),
  );
  const mountainKeys = new Set(
    available.slice(0, mountainTarget).map(coordKey),
  );
  const forestKeys = new Set([
    ...reservedForestKeys,
    ...available
      .slice(
        mountainTarget,
        mountainTarget + forestTarget - reservedForestKeys.size,
      )
      .map(coordKey),
  ]);

  const resourceByKey = new Map<string, ResourceId | null>();
  const resourceRandomState = random.state;
  for (let y = 0; y < setup.height; y += 1) {
    for (let x = 0; x < setup.width; x += 1) {
      const at = { x, y };
      const key = coordKey(at);
      if (settlementByKey.has(key)) continue;
      const draw = nextUint32(random);
      random = draw.random;
      const terrain: TerrainIdV6 = mountainKeys.has(key)
        ? "MOUNTAIN"
        : forestKeys.has(key)
          ? "FOREST"
          : "GRASS";
      resourceByKey.set(key, resourceForTerrainV6(terrain, draw.value));
    }
  }

  const tiles: TileStateV6[] = [];
  for (let y = 0; y < setup.height; y += 1) {
    for (let x = 0; x < setup.width; x += 1) {
      const at = { x, y };
      const key = coordKey(at);
      const terrain: TerrainIdV6 = mountainKeys.has(key)
        ? "MOUNTAIN"
        : forestKeys.has(key)
          ? "FOREST"
          : "GRASS";
      tiles.push({
        at,
        terrain,
        resource: resourceByKey.get(key) ?? null,
        improvement: null,
        road: false,
        site: settlementByKey.get(key) ?? null,
        territoryCityId: null,
      });
    }
  }
  return {
    board: { width: setup.width, height: setup.height, tiles },
    capitals: [...capitals].sort(compareCoordsV6),
    villages: [...villages].sort(compareCoordsV6),
    capitalAssignments: capitalAssignmentShuffle.values,
    turnOrderSeats: turnOrderShuffle.values,
    random,
    resourceRandomState,
    resourceDrawCount: nonSettlements.length,
  };
}

function createPlayersV6(setup: MatchSetupV6): readonly PlayerStateV6[] {
  const aiColors = PLAYER_COLORS_V6.filter(
    (color) => color !== setup.humanColor,
  );
  return Array.from({ length: setup.aiCount + 1 }, (_, seat): PlayerStateV6 => {
    const faction = setup.factions[seat];
    const color = seat === 0 ? setup.humanColor : aiColors[seat - 1];
    if (faction === undefined || color === undefined) {
      throw new RangeError("Starting player assignment is incomplete");
    }
    return {
      id: playerId(seat + 1),
      seat,
      controller: seat === 0 ? "HUMAN" : "AI",
      color,
      faction,
      factionTreeId: factionTechnologyTreeV6(faction).id,
      status: "ACTIVE",
      coins: 5,
      researchedTechs: ["GATHERING"],
      explored: [],
    };
  });
}

function createStartingEntitiesV6(
  players: readonly PlayerStateV6[],
  capitals: readonly CoordV6[],
): {
  readonly cities: readonly CityStateV6[];
  readonly units: readonly UnitStateV6[];
  readonly nextEntityId: number;
} {
  const cities: CityStateV6[] = [];
  const units: UnitStateV6[] = [];
  let nextEntityId = 1;
  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    const at = capitals[index];
    if (player === undefined || at === undefined) {
      throw new RangeError("Starting entity assignment is incomplete");
    }
    const cityAllocation = allocateCityId(nextEntityId);
    nextEntityId = cityAllocation.nextEntityId;
    const city: CityStateV6 = {
      id: cityAllocation.id,
      ownerId: player.id,
      at,
      level: 1,
      permanentPopulation: 0,
      economicPopulation: 0,
      population: 0,
      isCapital: true,
      expanded: false,
      rewards: [],
    };
    cities.push(city);
    const unitAllocation = allocateUnitId(nextEntityId);
    nextEntityId = unitAllocation.nextEntityId;
    units.push({
      id: unitAllocation.id,
      ownerId: player.id,
      homeCityId: city.id,
      role: "FIGHTER",
      at,
      hp: 10,
      maxHp: 10,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: {
        moved: false,
        movedPathLength: 0,
        attacked: false,
        healed: false,
        recovered: false,
        captured: false,
        handled: false,
        specialActed: false,
      },
    });
  }
  return { cities, units, nextEntityId };
}

type EconomicFamilyV6 = "AGRICULTURE" | "TIMBER" | "METAL" | "STONE";

function isEconomicOpportunityV6(tile: TileStateV6): boolean {
  return tile.resource !== null || tile.terrain === "FOREST";
}

function economicFamilyV6(tile: TileStateV6): EconomicFamilyV6 | null {
  if (tile.resource === "FRUIT" || tile.resource === "FERTILE_GROUND") {
    return "AGRICULTURE";
  }
  if (tile.terrain === "FOREST") return "TIMBER";
  if (tile.resource === "ORE") return "METAL";
  if (tile.resource === "STONE") return "STONE";
  return null;
}

function potentialBasicFamilies(
  adjacent: readonly TileStateV6[],
): readonly EconomicFamilyV6[] {
  const values = new Set<EconomicFamilyV6>();
  for (const tile of adjacent) {
    if (tile.resource === "FERTILE_GROUND") values.add("AGRICULTURE");
    if (tile.terrain === "FOREST") values.add("TIMBER");
    if (tile.resource === "ORE") values.add("METAL");
    if (tile.resource === "STONE") values.add("STONE");
  }
  return [...values];
}

function potentialProcessorFamilies(
  adjacent: readonly TileStateV6[],
): readonly EconomicFamilyV6[] {
  return potentialBasicFamilies(adjacent);
}

function maximumDistinctFamilyPlacements(
  sites: readonly (readonly EconomicFamilyV6[])[],
): number {
  let best = 0;
  const visit = (index: number, used: ReadonlySet<EconomicFamilyV6>): void => {
    if (index >= sites.length) {
      best = Math.max(best, used.size);
      return;
    }
    visit(index + 1, used);
    for (const family of sites[index] ?? []) {
      if (used.has(family)) continue;
      visit(index + 1, new Set([...used, family]));
    }
  };
  visit(0, new Set());
  return best;
}

const OPPOSITE_AXES: readonly (readonly [CoordV6, CoordV6])[] = [
  [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ],
  [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ],
  [
    { x: 1, y: -1 },
    { x: -1, y: 1 },
  ],
  [
    { x: -1, y: -1 },
    { x: 1, y: 1 },
  ],
];

function oppositeStonePairCount(
  board: BoardStateV6,
  center: CoordV6,
  territoryKeys: ReadonlySet<string>,
): number {
  return OPPOSITE_AXES.filter(([left, right]) => {
    const leftAt = { x: center.x + left.x, y: center.y + left.y };
    const rightAt = { x: center.x + right.x, y: center.y + right.y };
    return (
      territoryKeys.has(coordKey(leftAt)) &&
      territoryKeys.has(coordKey(rightAt)) &&
      tileAt(board, leftAt)?.resource === "STONE" &&
      tileAt(board, rightAt)?.resource === "STONE"
    );
  }).length;
}

function neighborsInKeys(
  board: BoardStateV6,
  center: CoordV6,
  allowed: ReadonlySet<string>,
): readonly TileStateV6[] {
  return neighbors(board, center).filter((tile) =>
    allowed.has(coordKey(tile.at)),
  );
}

function shuffleV6<T>(
  values: readonly T[],
  initialRandom: RandomStateV6,
): { readonly values: readonly T[]; readonly random: RandomStateV6 } {
  const result = [...values];
  let random = initialRandom;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = nextBounded(random, index + 1);
    random = draw.random;
    const other = draw.value;
    const currentValue = result[index];
    const otherValue = result[other];
    if (currentValue === undefined || otherValue === undefined) {
      throw new RangeError("Shuffle index escaped collection");
    }
    result[index] = otherValue;
    result[other] = currentValue;
  }
  return { values: result, random };
}

function capitalsConnected(
  board: BoardStateV6,
  capitals: readonly CoordV6[],
): boolean {
  const first = capitals[0];
  if (first === undefined) return false;
  const visited = new Set([coordKey(first)]);
  const queue = [first];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) continue;
    for (const tile of neighbors(board, current)) {
      const key = coordKey(tile.at);
      if (tile.terrain !== "MOUNTAIN" && !visited.has(key)) {
        visited.add(key);
        queue.push(tile.at);
      }
    }
  }
  return capitals.every((at) => visited.has(coordKey(at)));
}

function hasPairCloserThan(
  values: readonly CoordV6[],
  minimum: number,
): boolean {
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const first = values[left];
      const second = values[right];
      if (
        first !== undefined &&
        second !== undefined &&
        Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y)) <
          minimum
      ) {
        return true;
      }
    }
  }
  return false;
}

function neighbors(
  board: BoardStateV6,
  center: CoordV6,
): readonly TileStateV6[] {
  return coordsInRadius(board.width, board.height, center, 1)
    .filter((at) => !sameCoord(at, center))
    .map((at) => tileAt(board, at))
    .filter((tile): tile is TileStateV6 => tile !== undefined);
}

function coordsInRadius(
  width: number,
  height: number,
  center: CoordV6,
  radius: number,
): readonly CoordV6[] {
  const coordinates: CoordV6[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(height - 1, center.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(width - 1, center.x + radius);
      x += 1
    ) {
      coordinates.push({ x, y });
    }
  }
  return coordinates;
}

function orthogonalCoords(center: CoordV6): readonly CoordV6[] {
  return [
    { x: center.x, y: center.y - 1 },
    { x: center.x + 1, y: center.y },
    { x: center.x, y: center.y + 1 },
    { x: center.x - 1, y: center.y },
  ];
}

function tileAt(board: BoardStateV6, at: CoordV6): TileStateV6 | undefined {
  if (!onBoard(board, at)) return undefined;
  return board.tiles[at.y * board.width + at.x];
}

function onBoard(board: BoardStateV6, at: CoordV6): boolean {
  return at.x >= 0 && at.y >= 0 && at.x < board.width && at.y < board.height;
}

function roundHalfUpPercent(value: number, percent: number): number {
  return Math.floor((value * percent + 50) / 100);
}

function highestNonzeroIndex(values: readonly number[]): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if ((values[index] ?? 0) > 0) return index;
  }
  return 0;
}

function expectedResourceFinalState(start: number, draws: number): number {
  return (start + Math.imul(MULBERRY_INCREMENT, draws)) >>> 0;
}

/** Used by validation to prove no hidden rejection sampling entered resources. */
export function resourceStreamEndsAfterV6(
  startState: number,
  drawCount: number,
): number {
  if (
    !Number.isInteger(startState) ||
    startState < 0 ||
    startState > 0xffff_ffff ||
    !Number.isSafeInteger(drawCount) ||
    drawCount < 0
  ) {
    throw new RangeError("Invalid resource stream interval");
  }
  return expectedResourceFinalState(startState, drawCount);
}

function compareCoordsV6(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function coordKey(at: CoordV6): string {
  return `${at.x},${at.y}`;
}

function parseCoordKey(key: string): CoordV6 {
  const [x, y] = key.split(",").map(Number);
  if (x === undefined || y === undefined)
    throw new RangeError("Invalid coord key");
  return { x, y };
}
