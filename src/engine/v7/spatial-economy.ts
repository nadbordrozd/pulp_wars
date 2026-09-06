import type { CityId, PlayerId } from "../model/ids";
import type {
  BoardStateV7,
  CityStateV7,
  CoordV7,
  ImprovementIdV7,
  TileStateV7,
} from "./types";

export const ECONOMIC_FAMILY_ORDER_V7 = Object.freeze([
  "AGRICULTURE",
  "TIMBER",
  "METAL",
  "STONE",
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

type EconomyGraphV7 = {
  readonly board: BoardStateV7;
  readonly cities: readonly CityStateV7[];
};
const BASIC = ["FARM", "LUMBER_CAMP", "MINE", "QUARRY"] as const;
const PROCESSORS = ["WINDMILL", "SAWMILL", "FORGE", "STONEWORKS"] as const;
const AXES: readonly {
  readonly id: OppositePairAxisV7;
  readonly first: readonly [number, number];
  readonly second: readonly [number, number];
}[] = [
  { id: "NORTH_SOUTH", first: [0, -1], second: [0, 1] },
  { id: "EAST_WEST", first: [1, 0], second: [-1, 0] },
  { id: "NORTHEAST_SOUTHWEST", first: [1, -1], second: [-1, 1] },
  { id: "NORTHWEST_SOUTHEAST", first: [-1, -1], second: [1, 1] },
];

export function spatialContributionAtV7(
  graph: EconomyGraphV7,
  at: CoordV7,
  improvement: ImprovementIdV7,
): SpatialContributionV7 {
  const center = tileAtV7(graph.board, at);
  const city = graph.cities.find(
    (candidate) => candidate.id === center?.territoryCityId,
  );
  if (center === undefined || city === undefined) return result({});
  if (improvement === "FARM") return fixed(2, at, improvement);
  if (improvement === "LUMBER_CAMP") return fixed(1, at, improvement);
  if (improvement === "MINE") return fixed(4, at, improvement);
  if (improvement === "QUARRY") return fixed(3, at, improvement);
  if (improvement === "BARRACKS")
    return result({ capacity: 1, contributingTiles: [at], placementCount: 1 });
  if (improvement === "WINDMILL" || improvement === "SAWMILL") {
    const type = improvement === "WINDMILL" ? "FARM" : "LUMBER_CAMP";
    const contributors = connectedSameCityComponent(
      graph.board,
      at,
      city.id,
      type,
    );
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
      population: Math.min(18, contributors.length * 3),
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: contributors.length === 0 ? [] : ["MINE"],
      placementCount: contributors.length,
    });
  }
  if (improvement === "STONEWORKS") {
    const contributors = adjacentTilesV7(graph.board, at).filter(
      (tile) =>
        tile.territoryCityId === city.id && tile.improvement === "QUARRY",
    );
    const axes = AXES.filter(
      (axis) =>
        isSameCityImprovement(graph.board, at, axis.first, city.id, "QUARRY") &&
        isSameCityImprovement(graph.board, at, axis.second, city.id, "QUARRY"),
    ).map((axis) => axis.id);
    return result({
      population: Math.min(16, contributors.length * 2 + axes.length * 2),
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: contributors.length === 0 ? [] : ["QUARRY"],
      oppositePairAxes: axes,
      placementCount: contributors.length,
    });
  }
  if (improvement === "WORKSHOP") {
    const contributors = friendlyAdjacent(graph, at, city.ownerId, BASIC);
    const types = orderedTypes(contributors, BASIC);
    return result({
      population: types.length,
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: types,
      placementCount: types.length,
    });
  }
  if (improvement === "GRAND_WORKS") {
    const contributors = friendlyAdjacent(graph, at, city.ownerId, PROCESSORS);
    const types = orderedTypes(contributors, PROCESSORS);
    return result({
      population: types.length * 2,
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
    marketIncome: Math.min(5, families.length + (capitalRoadConnected ? 1 : 0)),
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
  while (queue.length > 0) {
    const at = queue.shift();
    if (at === undefined || connected.has(key(at))) continue;
    connected.add(key(at));
    for (const [dx, dy] of CARDINAL) {
      const next = { x: at.x + dx, y: at.y + dy };
      if (roadKeys.has(key(next)) && !connected.has(key(next)))
        queue.push(next);
    }
  }
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
  board: BoardStateV7,
  center: CoordV7,
  cityId: CityId,
  improvement: "FARM" | "LUMBER_CAMP",
): readonly CoordV7[] {
  const queue = adjacentTilesV7(board, center)
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === improvement,
    )
    .map((tile) => tile.at);
  const seen = new Set<string>();
  const result: CoordV7[] = [];
  while (queue.length > 0) {
    const at = queue.shift();
    if (at === undefined || seen.has(key(at))) continue;
    const tile = tileAtV7(board, at);
    if (tile?.territoryCityId !== cityId || tile.improvement !== improvement)
      continue;
    seen.add(key(at));
    result.push(at);
    queue.push(...CARDINAL.map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy })));
  }
  return result.sort(compareCoords);
}

function friendlyAdjacent<T extends ImprovementIdV7>(
  graph: EconomyGraphV7,
  at: CoordV7,
  ownerId: PlayerId,
  allowed: readonly T[],
): readonly TileStateV7[] {
  return adjacentTilesV7(graph.board, at).filter(
    (tile) =>
      tile.improvement !== null &&
      allowed.includes(tile.improvement as T) &&
      tileOwner(graph, tile) === ownerId,
  );
}
function orderedTypes<T extends ImprovementIdV7>(
  tiles: readonly TileStateV7[],
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
  if (value === "QUARRY" || value === "STONEWORKS") return "STONE";
  return null;
}
function tileOwner(graph: EconomyGraphV7, tile: TileStateV7): PlayerId | null {
  return tile.territoryCityId === null
    ? null
    : (graph.cities.find((city) => city.id === tile.territoryCityId)?.ownerId ??
        null);
}
function isSameCityImprovement(
  board: BoardStateV7,
  at: CoordV7,
  [dx, dy]: readonly [number, number],
  cityId: CityId,
  improvement: ImprovementIdV7,
): boolean {
  const tile = tileAtV7(board, { x: at.x + dx, y: at.y + dy });
  return tile?.territoryCityId === cityId && tile.improvement === improvement;
}
export function adjacentTilesV7(
  board: BoardStateV7,
  at: CoordV7,
): readonly TileStateV7[] {
  const values: TileStateV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0) {
        const tile = tileAtV7(board, { x: at.x + dx, y: at.y + dy });
        if (tile !== undefined) values.push(tile);
      }
  return values.sort((left, right) => compareCoords(left.at, right.at));
}
export function tileAtV7(
  board: BoardStateV7,
  at: CoordV7,
): TileStateV7 | undefined {
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
