import type { CityId, PlayerId } from "../model/ids";
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
  readonly connectedComponents: Map<string, readonly CoordV7[]>;
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
    connectedComponents: new Map(),
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
  if (improvement === "MONUMENT") return fixed(3, at, improvement);
  if (improvement === "WINDMILL" || improvement === "SAWMILL") {
    const type = improvement === "WINDMILL" ? "FARM" : "LUMBER_CAMP";
    const contributors = connectedSameCityComponent(graph, at, city.id, type);
    return result({
      population: Math.min(8, contributors.length),
      contributingTiles: contributors,
      distinctTypes: contributors.length === 0 ? [] : [type],
      placementCount: contributors.length,
    });
  }
  if (improvement === "FORGE") {
    const contributors = adjacentTilesV7(graph.board, at).filter(
      (tile) => tile.territoryCityId === city.id && tile.improvement === "MINE",
    );
    return result({
      population: Math.min(6, contributors.length),
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: contributors.length === 0 ? [] : ["MINE"],
      placementCount: contributors.length,
    });
  }
  if (improvement === "WORKSHOP") {
    const contributors = friendlyAdjacent(graph, at, city.ownerId, BASIC);
    const types = orderedTypes(contributors, BASIC);
    return result({
      population: types.length === 0 ? 0 : 1 + types.length,
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: types,
      placementCount: types.length,
    });
  }
  if (improvement === "GRAND_WORKS") {
    const contributors = friendlyAdjacent(
      graph,
      at,
      city.ownerId,
      PROCESSORS,
    ).filter(
      (tile) =>
        tile.improvement !== null &&
        spatialContributionAtV7(graph, tile.at, tile.improvement).population >
          0,
    );
    const types = orderedTypes(contributors, PROCESSORS);
    return result({
      population: types.length < 2 ? 0 : Math.min(10, 4 + types.length * 2),
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: types,
      placementCount: types.length,
    });
  }
  const contributors = friendlyAdjacent(graph, at, city.ownerId, [
    ...BASIC,
    ...PROCESSORS,
  ]);
  const families = ECONOMIC_FAMILY_ORDER_V7.filter((family) =>
    contributors.some((tile) => familyFor(tile.improvement) === family),
  );
  const connected = capitalConnectedRoadKeysV7(graph, city.ownerId);
  const capitalRoadConnected = adjacentTilesV7(graph.board, at).some(
    (tile) =>
      tile.road &&
      tileOwner(graph, tile) === city.ownerId &&
      connected.has(key(tile.at)),
  );
  return result({
    marketIncome: Math.min(4, families.length + (capitalRoadConnected ? 1 : 0)),
    contributingTiles: contributors.map((tile) => tile.at),
    distinctTypes: orderedTypes(contributors, [...BASIC, ...PROCESSORS]),
    distinctFamilies: families,
    capitalRoadConnected,
    placementCount: families.length,
  });
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
      .filter((tile) => tile.road && tileOwner(graph, tile) === playerId)
      .map((tile) => key(tile.at)),
  );
  const connected = new Set<string>();
  const queue: CoordV7[] = [];
  for (const capital of graph.cities.filter(
    (city) => city.ownerId === playerId && city.isCapital,
  ))
    for (const [dx, dy] of CARDINAL)
      if (roadKeys.has(key({ x: capital.at.x + dx, y: capital.at.y + dy })))
        queue.push({ x: capital.at.x + dx, y: capital.at.y + dy });
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const at = queue[queueIndex];
    if (at === undefined || connected.has(key(at))) continue;
    connected.add(key(at));
    for (const [dx, dy] of CARDINAL) {
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

function connectedSameCityComponent(
  graph: EconomyGraphV7,
  center: CoordV7,
  cityId: CityId,
  improvement: "FARM" | "LUMBER_CAMP",
): readonly CoordV7[] {
  const cacheKey = `${cityId}:${improvement}:${key(center)}`;
  const index = economyGraphIndexV7(graph);
  const cached = index.connectedComponents.get(cacheKey);
  if (cached !== undefined) return cached;
  const queue = adjacentTilesV7(graph.board, center)
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === improvement,
    )
    .map((tile) => tile.at);
  const seen = new Set<string>();
  const result: CoordV7[] = [];
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const at = queue[queueIndex];
    if (at === undefined || seen.has(key(at))) continue;
    const tile = tileAtV7(graph.board, at);
    if (tile?.territoryCityId !== cityId || tile.improvement !== improvement)
      continue;
    seen.add(key(at));
    result.push(at);
    queue.push(...CARDINAL.map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy })));
  }
  const sorted = result.sort(compareCoords);
  index.connectedComponents.set(cacheKey, sorted);
  return sorted;
}

function friendlyAdjacent<T extends ImprovementIdV7>(
  graph: EconomyGraphV7,
  at: CoordV7,
  ownerId: PlayerId,
  allowed: readonly T[],
): readonly EconomyGraphTileV7[] {
  return adjacentTilesV7(graph.board, at).filter(
    (tile) =>
      tile.improvement !== null &&
      allowed.includes(tile.improvement as T) &&
      tileOwner(graph, tile) === ownerId,
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
  graph: EconomyGraphV7,
  tile: EconomyGraphTileV7,
): PlayerId | null {
  return tile.territoryCityId === null
    ? null
    : (economyGraphIndexV7(graph).cityById.get(tile.territoryCityId)?.ownerId ??
        null);
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
