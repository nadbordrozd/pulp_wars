import type { CityId, PlayerId } from "../model/ids";
import { MONUMENT_POPULATION_V7 } from "../rules/ruleset-v7";
import type { CoordV7, ImprovementIdV7 } from "./types";

export const ECONOMIC_FAMILY_ORDER_V7 = Object.freeze([
  "AGRICULTURE",
  "TIMBER",
  "METAL",
] as const);
export type EconomicFamilyV7 = (typeof ECONOMIC_FAMILY_ORDER_V7)[number];
export const OPPOSITE_PAIR_AXIS_ORDER_V7 = Object.freeze([
  "NORTH_SOUTH",
  "EAST_WEST",
  "NORTHEAST_SOUTHWEST",
  "NORTHWEST_SOUTHEAST",
] as const);
export type OppositePairAxisV7 = (typeof OPPOSITE_PAIR_AXIS_ORDER_V7)[number];

export interface SpatialContributionV7 {
  readonly population: number;
  readonly marketIncome: number;
  readonly capacity: number;
  readonly contributingTiles: readonly CoordV7[];
  readonly distinctTypes: readonly ImprovementIdV7[];
  readonly distinctFamilies: readonly EconomicFamilyV7[];
  readonly oppositePairAxes: readonly OppositePairAxisV7[];
  readonly capitalRoadConnected: boolean;
  readonly placementCount: number;
}

export interface EconomyGraphTileV7 {
  readonly at: CoordV7;
  readonly improvement: ImprovementIdV7 | null;
  readonly road: boolean;
  readonly territoryCityId: CityId | null;
}
export interface EconomyGraphCityV7 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: CoordV7;
  readonly isCapital: boolean;
}

interface SpatialPlacementSupportV7 {
  readonly contributingTiles: readonly EconomyGraphTileV7[];
  readonly distinctTypes: readonly ImprovementIdV7[];
  readonly distinctFamilies: readonly EconomicFamilyV7[];
  readonly placementCount: number;
}
export interface EconomyGraphV7 {
  readonly board: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly EconomyGraphTileV7[];
  };
  readonly cities: readonly EconomyGraphCityV7[];
}

interface EconomyGraphIndexV7 {
  readonly cityById: ReadonlyMap<CityId, EconomyGraphCityV7>;
  readonly roadKeysByOwner: Map<PlayerId, ReadonlySet<string>>;
  readonly contributions: Map<string, SpatialContributionV7>;
}

const ECONOMY_GRAPH_INDEXES_V7 = new WeakMap<
  EconomyGraphV7,
  EconomyGraphIndexV7
>();

function economyGraphIndexV7(graph: EconomyGraphV7): EconomyGraphIndexV7 {
  const cached = ECONOMY_GRAPH_INDEXES_V7.get(graph);
  if (cached !== undefined) return cached;
  const index: EconomyGraphIndexV7 = {
    cityById: new Map(graph.cities.map((city) => [city.id, city])),
    roadKeysByOwner: new Map(),
    contributions: new Map(),
  };
  ECONOMY_GRAPH_INDEXES_V7.set(graph, index);
  return index;
}
const BASIC = ["FARM", "LUMBER_CAMP", "MINE"] as const;
const PROCESSORS = ["WINDMILL", "SAWMILL", "FORGE"] as const;

export function spatialContributionAtV7(
  graph: EconomyGraphV7,
  at: CoordV7,
  improvement: ImprovementIdV7,
): SpatialContributionV7 {
  const index = economyGraphIndexV7(graph);
  const cacheKey = `${improvement}:${key(at)}`;
  const cached = index.contributions.get(cacheKey);
  if (cached !== undefined) return cached;
  const contribution = calculateSpatialContributionAtV7(graph, at, improvement);
  index.contributions.set(cacheKey, contribution);
  return contribution;
}

function calculateSpatialContributionAtV7(
  graph: EconomyGraphV7,
  at: CoordV7,
  improvement: ImprovementIdV7,
): SpatialContributionV7 {
  const center = tileAtV7(graph.board, at);
  const city =
    center?.territoryCityId === null || center?.territoryCityId === undefined
      ? undefined
      : economyGraphIndexV7(graph).cityById.get(center.territoryCityId);
  if (center === undefined || city === undefined) return result({});
  if (improvement === "FARM") return fixed(2, at, improvement);
  if (improvement === "LUMBER_CAMP") return fixed(1, at, improvement);
  if (improvement === "MINE") return fixed(2, at, improvement);
  if (improvement === "MONUMENT")
    return fixed(MONUMENT_POPULATION_V7, at, improvement);
  if (
    improvement === "WINDMILL" ||
    improvement === "SAWMILL" ||
    improvement === "FORGE"
  ) {
    const support = spatialPlacementSupportV7(
      graph,
      at,
      improvement,
      economyGraphIndexV7(graph).cityById,
    );
    const cap = improvement === "FORGE" ? 6 : 8;
    return result({
      population: Math.min(cap, support.placementCount),
      contributingTiles: support.contributingTiles.map((tile) => tile.at),
      distinctTypes: support.distinctTypes,
      placementCount: support.placementCount,
    });
  }
  if (improvement === "WORKSHOP") {
    const support = spatialPlacementSupportV7(
      graph,
      at,
      improvement,
      economyGraphIndexV7(graph).cityById,
    );
    return result({
      population:
        support.distinctTypes.length === 0
          ? 0
          : 1 + support.distinctTypes.length,
      contributingTiles: support.contributingTiles.map((tile) => tile.at),
      distinctTypes: support.distinctTypes,
      placementCount: support.placementCount,
    });
  }
  if (improvement === "MARKET") {
    const support = spatialPlacementSupportV7(
      graph,
      at,
      improvement,
      economyGraphIndexV7(graph).cityById,
    );
    return result({
      marketIncome: 1 + support.distinctFamilies.length,
      contributingTiles: support.contributingTiles.map((tile) => tile.at),
      distinctTypes: support.distinctTypes,
      distinctFamilies: support.distinctFamilies,
      capitalRoadConnected: false,
      placementCount: support.placementCount,
    });
  }
  return result({});
}

/**
 * Shared bounded placement minimum for spatial buildings. The supplied city
 * index makes the work proportional only to the fixed eight-cell neighborhood.
 */
export function spatialPlacementCountV7(
  graph: EconomyGraphV7,
  at: CoordV7,
  improvement: ImprovementIdV7,
  cityById: ReadonlyMap<CityId, EconomyGraphCityV7>,
): number {
  return spatialPlacementSupportV7(graph, at, improvement, cityById)
    .placementCount;
}

function spatialPlacementSupportV7(
  graph: EconomyGraphV7,
  at: CoordV7,
  improvement: ImprovementIdV7,
  cityById: ReadonlyMap<CityId, EconomyGraphCityV7>,
): SpatialPlacementSupportV7 {
  const center = tileAtV7(graph.board, at);
  const city =
    center?.territoryCityId === null || center?.territoryCityId === undefined
      ? undefined
      : cityById.get(center.territoryCityId);
  if (center === undefined || city === undefined)
    return {
      contributingTiles: [],
      distinctTypes: [],
      distinctFamilies: [],
      placementCount: 0,
    };
  if (
    improvement === "WINDMILL" ||
    improvement === "SAWMILL" ||
    improvement === "FORGE"
  ) {
    const type =
      improvement === "WINDMILL"
        ? "FARM"
        : improvement === "SAWMILL"
          ? "LUMBER_CAMP"
          : "MINE";
    const contributors = friendlyAdjacent(
      graph,
      at,
      city.ownerId,
      [type],
      cityById,
    ).filter((tile) =>
      contributorServesV7(graph, tile, improvement, at, city, cityById),
    );
    return {
      contributingTiles: contributors,
      distinctTypes: contributors.length === 0 ? [] : [type],
      distinctFamilies: [],
      placementCount: contributors.length,
    };
  }
  if (improvement === "WORKSHOP") {
    const contributors = friendlyAdjacent(
      graph,
      at,
      city.ownerId,
      BASIC,
      cityById,
      city.id,
    );
    const types = orderedTypes(contributors, BASIC);
    return {
      contributingTiles: contributors,
      distinctTypes: types,
      distinctFamilies: [],
      placementCount: types.length,
    };
  }
  if (improvement === "MARKET") {
    const contributors = friendlyAdjacent(
      graph,
      at,
      city.ownerId,
      [...BASIC, ...PROCESSORS],
      cityById,
    ).filter((tile) =>
      contributorServesV7(graph, tile, improvement, at, city, cityById),
    );
    const families = ECONOMIC_FAMILY_ORDER_V7.filter((family) =>
      contributors.some((tile) => familyFor(tile.improvement) === family),
    );
    return {
      contributingTiles: contributors,
      distinctTypes: orderedTypes(contributors, [...BASIC, ...PROCESSORS]),
      distinctFamilies: families,
      placementCount: families.length,
    };
  }
  return {
    contributingTiles: [],
    distinctTypes: [],
    distinctFamilies: [],
    placementCount: 0,
  };
}

/**
 * Tuning 1 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`; current rules section
 * 8.3): one contributor counts for exactly one building of a kind. A Farm,
 * Lumber Camp, or Mine counts for one Windmill, Sawmill, or Forge, and each
 * Farm, Windmill, Lumber Camp, Sawmill, Mine, or Forge counts for one
 * Market (the two are independent: a Farm may count for a Windmill and for
 * a Market). Among the same-owner buildings of `consumer` kind on the eight
 * tiles around the contributor, it serves the one of its own city;
 * otherwise the first in (y, x) order. The tile `at` being evaluated always
 * takes part as a building of the consumer kind, placed or not, so the same
 * rule answers placement, previews, and live output.
 */
function contributorServesV7(
  graph: EconomyGraphV7,
  contributor: EconomyGraphTileV7,
  consumer: ImprovementIdV7,
  at: CoordV7,
  atCity: EconomyGraphCityV7,
  cityById: ReadonlyMap<CityId, EconomyGraphCityV7>,
): boolean {
  if (contributor.territoryCityId === atCity.id) return true;
  // `adjacentTilesV7` is in (y, x) order.
  for (const tile of adjacentTilesV7(graph.board, contributor.at)) {
    const here = tile.at.x === at.x && tile.at.y === at.y;
    if (
      !here &&
      (tile.improvement !== consumer ||
        tileOwner(tile, cityById) !== atCity.ownerId)
    )
      continue;
    if (!here && tile.territoryCityId === contributor.territoryCityId)
      return false;
  }
  for (const tile of adjacentTilesV7(graph.board, contributor.at)) {
    if (tile.at.x === at.x && tile.at.y === at.y) return true;
    if (
      tile.improvement === consumer &&
      tileOwner(tile, cityById) === atCity.ownerId
    )
      return false;
  }
  return false;
}

export function capitalConnectedRoadKeysV7(
  graph: EconomyGraphV7,
  playerId: PlayerId,
): ReadonlySet<string> {
  const index = economyGraphIndexV7(graph);
  const cached = index.roadKeysByOwner.get(playerId);
  if (cached !== undefined) return cached;
  const roadKeys = new Set(
    graph.board.tiles
      .filter(
        (tile) => tile.road && tileOwner(tile, index.cityById) === playerId,
      )
      .map((tile) => key(tile.at)),
  );
  const capitals = graph.cities.filter(
    (city) => city.ownerId === playerId && city.isCapital,
  );
  for (const city of graph.cities)
    if (
      city.ownerId === playerId &&
      tileAtV7(graph.board, city.at) !== undefined
    )
      roadKeys.add(key(city.at));
  const connected = new Set<string>();
  const queue: CoordV7[] = capitals.map((capital) => capital.at);
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const at = queue[queueIndex];
    if (at === undefined || !roadKeys.has(key(at)) || connected.has(key(at)))
      continue;
    connected.add(key(at));
    for (const [dx, dy] of ROAD_NEIGHBORS) {
      const next = { x: at.x + dx, y: at.y + dy };
      if (roadKeys.has(key(next)) && !connected.has(key(next)))
        queue.push(next);
    }
  }
  index.roadKeysByOwner.set(playerId, connected);
  return connected;
}

export function isCapitalConnectedRoadV7(
  graph: EconomyGraphV7,
  at: CoordV7,
  playerId: PlayerId,
): boolean {
  return capitalConnectedRoadKeysV7(graph, playerId).has(key(at));
}

function friendlyAdjacent<T extends ImprovementIdV7>(
  graph: EconomyGraphV7,
  at: CoordV7,
  ownerId: PlayerId,
  allowed: readonly T[],
  cityById: ReadonlyMap<CityId, EconomyGraphCityV7>,
  territoryCityId?: CityId,
): readonly EconomyGraphTileV7[] {
  return adjacentTilesV7(graph.board, at).filter(
    (tile) =>
      tile.improvement !== null &&
      allowed.includes(tile.improvement as T) &&
      tileOwner(tile, cityById) === ownerId &&
      (territoryCityId === undefined ||
        tile.territoryCityId === territoryCityId),
  );
}
function orderedTypes<T extends ImprovementIdV7>(
  tiles: readonly EconomyGraphTileV7[],
  order: readonly T[],
): readonly T[] {
  return order.filter((type) =>
    tiles.some((tile) => tile.improvement === type),
  );
}
function familyFor(value: ImprovementIdV7 | null): EconomicFamilyV7 | null {
  if (value === "FARM" || value === "WINDMILL") return "AGRICULTURE";
  if (value === "LUMBER_CAMP" || value === "SAWMILL") return "TIMBER";
  if (value === "MINE" || value === "FORGE") return "METAL";
  return null;
}
function tileOwner(
  tile: EconomyGraphTileV7,
  cityById: ReadonlyMap<CityId, EconomyGraphCityV7>,
): PlayerId | null {
  return tile.territoryCityId === null
    ? null
    : (cityById.get(tile.territoryCityId)?.ownerId ?? null);
}
type EconomyBoardV7<T extends EconomyGraphTileV7 = EconomyGraphTileV7> = {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly T[];
};

export function adjacentTilesV7<T extends EconomyGraphTileV7>(
  board: EconomyBoardV7<T>,
  at: CoordV7,
): readonly T[] {
  const values: T[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0) {
        const tile = tileAtV7(board, { x: at.x + dx, y: at.y + dy });
        if (tile !== undefined) values.push(tile);
      }
  return values.sort((left, right) => compareCoords(left.at, right.at));
}
export function tileAtV7<T extends EconomyGraphTileV7>(
  board: EconomyBoardV7<T>,
  at: CoordV7,
): T | undefined {
  if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height)
    return undefined;
  const tile = board.tiles[at.y * board.width + at.x];
  return tile?.at.x === at.x && tile.at.y === at.y ? tile : undefined;
}
function fixed(
  population: number,
  at: CoordV7,
  improvement: ImprovementIdV7,
): SpatialContributionV7 {
  return result({
    population,
    contributingTiles: [at],
    distinctTypes: [improvement],
    placementCount: 1,
  });
}
function result(input: Partial<SpatialContributionV7>): SpatialContributionV7 {
  return {
    population: input.population ?? 0,
    marketIncome: input.marketIncome ?? 0,
    capacity: input.capacity ?? 0,
    contributingTiles: [...(input.contributingTiles ?? [])].sort(compareCoords),
    distinctTypes: input.distinctTypes ?? [],
    distinctFamilies: input.distinctFamilies ?? [],
    oppositePairAxes: input.oppositePairAxes ?? [],
    capitalRoadConnected: input.capitalRoadConnected ?? false,
    placementCount: input.placementCount ?? 0,
  };
}
const CARDINAL = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
const key = (at: CoordV7): string => `${at.y},${at.x}`;
const compareCoords = (left: CoordV7, right: CoordV7): number =>
  left.y - right.y || left.x - right.x;

const ROAD_NEIGHBORS = [
  ...CARDINAL,
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;
