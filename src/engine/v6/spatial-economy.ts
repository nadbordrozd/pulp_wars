import type { CityId, PlayerId } from "../model/ids";
import type {
  BoardStateV6,
  CityStateV6,
  CoordV6,
  EconomicImprovementId,
  TileStateV6,
} from "./types";

export const ECONOMIC_FAMILY_ORDER_V6 = Object.freeze([
  "AGRICULTURE",
  "TIMBER",
  "METAL",
  "STONE",
] as const);
export type EconomicFamilyV6 = (typeof ECONOMIC_FAMILY_ORDER_V6)[number];

export const OPPOSITE_PAIR_AXIS_ORDER_V6 = Object.freeze([
  "NORTH_SOUTH",
  "EAST_WEST",
  "NORTHEAST_SOUTHWEST",
  "NORTHWEST_SOUTHEAST",
] as const);
export type OppositePairAxisV6 = (typeof OPPOSITE_PAIR_AXIS_ORDER_V6)[number];

export interface SpatialContributionV6 {
  readonly population: number;
  readonly marketIncome: number;
  readonly contributingTiles: readonly CoordV6[];
  readonly distinctTypes: readonly EconomicImprovementId[];
  readonly distinctFamilies: readonly EconomicFamilyV6[];
  readonly oppositePairAxes: readonly OppositePairAxisV6[];
  readonly capitalRoadConnected: boolean;
  /** Connected contributors for clusters, otherwise the distinct placement set. */
  readonly placementCount: number;
}

type EconomyGraphV6 = Pick<
  { readonly board: BoardStateV6; readonly cities: readonly CityStateV6[] },
  "board" | "cities"
>;

const BASIC_TYPES = Object.freeze([
  "FARM",
  "LUMBER_CAMP",
  "MINE",
  "QUARRY",
] as const);
const PROCESSOR_TYPES = Object.freeze([
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "STONEWORKS",
] as const);

const AXES: readonly {
  readonly id: OppositePairAxisV6;
  readonly first: readonly [number, number];
  readonly second: readonly [number, number];
}[] = [
  { id: "NORTH_SOUTH", first: [0, -1], second: [0, 1] },
  { id: "EAST_WEST", first: [1, 0], second: [-1, 0] },
  { id: "NORTHEAST_SOUTHWEST", first: [1, -1], second: [-1, 1] },
  { id: "NORTHWEST_SOUTHEAST", first: [-1, -1], second: [1, 1] },
];

/** Pure canonical calculation for one existing or hypothetical improvement. */
export function spatialContributionAtV6(
  graph: EconomyGraphV6,
  at: CoordV6,
  improvement: EconomicImprovementId,
): SpatialContributionV6 {
  const center = tileAt(graph.board, at);
  const city = graph.cities.find(
    (candidate) => candidate.id === center?.territoryCityId,
  );
  if (center === undefined || city === undefined) return emptyContribution();

  if (improvement === "FARM" || improvement === "MINE") {
    return fixedContribution(2, at, improvement);
  }
  if (improvement === "LUMBER_CAMP" || improvement === "QUARRY") {
    return fixedContribution(1, at, improvement);
  }
  if (improvement === "WINDMILL") {
    const contributors = connectedSameCityComponent(
      graph.board,
      at,
      city.id,
      "FARM",
    );
    return result({
      population: Math.min(8, contributors.length),
      contributingTiles: contributors,
      distinctTypes: contributors.length === 0 ? [] : ["FARM"],
      placementCount: contributors.length,
    });
  }
  if (improvement === "SAWMILL") {
    const contributors = connectedSameCityComponent(
      graph.board,
      at,
      city.id,
      "LUMBER_CAMP",
    );
    return result({
      population: Math.min(8, contributors.length),
      contributingTiles: contributors,
      distinctTypes: contributors.length === 0 ? [] : ["LUMBER_CAMP"],
      placementCount: contributors.length,
    });
  }
  if (improvement === "FORGE") {
    const contributors = adjacentTiles(graph.board, at).filter(
      (tile) => tile.territoryCityId === city.id && tile.improvement === "MINE",
    );
    return result({
      population: 2 * contributors.length,
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: contributors.length === 0 ? [] : ["MINE"],
      placementCount: contributors.length,
    });
  }
  if (improvement === "STONEWORKS") {
    const contributors = adjacentTiles(graph.board, at).filter(
      (tile) =>
        tile.territoryCityId === city.id && tile.improvement === "QUARRY",
    );
    const axes = AXES.filter(
      (axis) =>
        tileAtOffset(graph.board, at, axis.first)?.territoryCityId ===
          city.id &&
        tileAtOffset(graph.board, at, axis.first)?.improvement === "QUARRY" &&
        tileAtOffset(graph.board, at, axis.second)?.territoryCityId ===
          city.id &&
        tileAtOffset(graph.board, at, axis.second)?.improvement === "QUARRY",
    ).map((axis) => axis.id);
    return result({
      population: contributors.length + 2 * axes.length,
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: contributors.length === 0 ? [] : ["QUARRY"],
      oppositePairAxes: axes,
      placementCount: contributors.length,
    });
  }
  if (improvement === "WORKSHOP") {
    const contributors = friendlyAdjacentBuildings(
      graph,
      at,
      city.ownerId,
      BASIC_TYPES,
    );
    const types = orderedDistinctTypes(contributors, BASIC_TYPES);
    return result({
      population: types.length,
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: types,
      placementCount: types.length,
    });
  }
  if (improvement === "GRAND_WORKS") {
    const contributors = friendlyAdjacentBuildings(
      graph,
      at,
      city.ownerId,
      PROCESSOR_TYPES,
    );
    const types = orderedDistinctTypes(contributors, PROCESSOR_TYPES);
    return result({
      population: 2 * types.length,
      contributingTiles: contributors.map((tile) => tile.at),
      distinctTypes: types,
      placementCount: types.length,
    });
  }

  const contributors = friendlyAdjacentBuildings(graph, at, city.ownerId, [
    ...BASIC_TYPES,
    ...PROCESSOR_TYPES,
  ]);
  const families = ECONOMIC_FAMILY_ORDER_V6.filter((family) =>
    contributors.some((tile) => familyFor(tile.improvement) === family),
  );
  const connectedRoads = capitalConnectedRoadKeysV6(graph, city.ownerId);
  const capitalRoadConnected = adjacentTiles(graph.board, at).some(
    (tile) =>
      tile.road &&
      tileOwnerId(graph, tile) === city.ownerId &&
      connectedRoads.has(coordKey(tile.at)),
  );
  return result({
    marketIncome: Math.min(5, families.length + (capitalRoadConnected ? 1 : 0)),
    contributingTiles: contributors.map((tile) => tile.at),
    distinctTypes: orderedDistinctTypes(contributors, [
      ...BASIC_TYPES,
      ...PROCESSOR_TYPES,
    ]),
    distinctFamilies: families,
    capitalRoadConnected,
    placementCount: families.length,
  });
}

/** Canonical same-player Road components that touch an owned capital. */
export function capitalConnectedRoadKeysV6(
  graph: EconomyGraphV6,
  playerId: PlayerId,
): ReadonlySet<string> {
  const friendlyRoads = graph.board.tiles.filter(
    (tile) => tile.road && tileOwnerId(graph, tile) === playerId,
  );
  const roadKeys = new Set(friendlyRoads.map((tile) => coordKey(tile.at)));
  const connected = new Set<string>();
  const queue: CoordV6[] = [];
  for (const capital of graph.cities.filter(
    (city) => city.ownerId === playerId && city.isCapital,
  )) {
    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const at = { x: capital.at.x + dx, y: capital.at.y + dy };
      if (roadKeys.has(coordKey(at))) queue.push(at);
    }
  }
  while (queue.length > 0) {
    const at = queue.shift();
    if (at === undefined || connected.has(coordKey(at))) continue;
    connected.add(coordKey(at));
    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const next = { x: at.x + dx, y: at.y + dy };
      if (roadKeys.has(coordKey(next)) && !connected.has(coordKey(next))) {
        queue.push(next);
      }
    }
  }
  return connected;
}

export function isCapitalConnectedRoadV6(
  graph: EconomyGraphV6,
  at: CoordV6,
  playerId: PlayerId,
): boolean {
  return capitalConnectedRoadKeysV6(graph, playerId).has(coordKey(at));
}

function tileOwnerId(
  graph: EconomyGraphV6,
  tile: TileStateV6,
): PlayerId | null {
  if (tile.territoryCityId === null) return null;
  return (
    graph.cities.find((city) => city.id === tile.territoryCityId)?.ownerId ??
    null
  );
}

export function livePopulationAtV6(
  graph: EconomyGraphV6,
  at: CoordV6,
  improvement: EconomicImprovementId,
): number {
  return spatialContributionAtV6(graph, at, improvement).population;
}

function connectedSameCityComponent(
  board: BoardStateV6,
  center: CoordV6,
  cityId: CityId,
  improvement: "FARM" | "LUMBER_CAMP",
): readonly CoordV6[] {
  const queue = adjacentTiles(board, center)
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === improvement,
    )
    .map((tile) => tile.at);
  const seen = new Set<string>();
  const contributors: CoordV6[] = [];
  while (queue.length > 0) {
    const at = queue.shift();
    if (at === undefined || seen.has(coordKey(at))) continue;
    const tile = tileAt(board, at);
    if (
      tile === undefined ||
      tile.territoryCityId !== cityId ||
      tile.improvement !== improvement
    ) {
      continue;
    }
    seen.add(coordKey(at));
    contributors.push(at);
    queue.push(
      ...CARDINAL_OFFSETS.map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy })),
    );
  }
  return contributors.sort(compareCoords);
}

function friendlyAdjacentBuildings(
  graph: EconomyGraphV6,
  at: CoordV6,
  ownerId: PlayerId,
  allowed: readonly EconomicImprovementId[],
): readonly TileStateV6[] {
  const owners = new Map(
    graph.cities.map((city) => [city.id, city.ownerId] as const),
  );
  return adjacentTiles(graph.board, at).filter(
    (tile) =>
      tile.improvement !== null &&
      allowed.includes(tile.improvement) &&
      tile.territoryCityId !== null &&
      owners.get(tile.territoryCityId) === ownerId,
  );
}

function orderedDistinctTypes<T extends EconomicImprovementId>(
  tiles: readonly TileStateV6[],
  order: readonly T[],
): readonly T[] {
  return order.filter((type) =>
    tiles.some((tile) => tile.improvement === type),
  );
}

function familyFor(
  improvement: TileStateV6["improvement"],
): EconomicFamilyV6 | null {
  if (improvement === "FARM" || improvement === "WINDMILL") {
    return "AGRICULTURE";
  }
  if (improvement === "LUMBER_CAMP" || improvement === "SAWMILL") {
    return "TIMBER";
  }
  if (improvement === "MINE" || improvement === "FORGE") return "METAL";
  if (improvement === "QUARRY" || improvement === "STONEWORKS") {
    return "STONE";
  }
  return null;
}

const CARDINAL_OFFSETS = Object.freeze([
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const);

function adjacentTiles(
  board: BoardStateV6,
  at: CoordV6,
): readonly TileStateV6[] {
  const tiles: TileStateV6[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const tile = tileAt(board, { x: at.x + dx, y: at.y + dy });
      if (tile !== undefined) tiles.push(tile);
    }
  }
  return tiles.sort((left, right) => compareCoords(left.at, right.at));
}

function tileAtOffset(
  board: BoardStateV6,
  at: CoordV6,
  offset: readonly [number, number],
): TileStateV6 | undefined {
  return tileAt(board, { x: at.x + offset[0], y: at.y + offset[1] });
}

function tileAt(board: BoardStateV6, at: CoordV6): TileStateV6 | undefined {
  if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height) {
    return undefined;
  }
  const tile = board.tiles[at.y * board.width + at.x];
  return tile !== undefined && tile.at.x === at.x && tile.at.y === at.y
    ? tile
    : undefined;
}

function fixedContribution(
  population: number,
  at: CoordV6,
  improvement: EconomicImprovementId,
): SpatialContributionV6 {
  return result({
    population,
    contributingTiles: [at],
    distinctTypes: [improvement],
    placementCount: 1,
  });
}

function emptyContribution(): SpatialContributionV6 {
  return result({});
}

function result(input: Partial<SpatialContributionV6>): SpatialContributionV6 {
  return {
    population: input.population ?? 0,
    marketIncome: input.marketIncome ?? 0,
    contributingTiles: [...(input.contributingTiles ?? [])].sort(compareCoords),
    distinctTypes: input.distinctTypes ?? [],
    distinctFamilies: input.distinctFamilies ?? [],
    oppositePairAxes: input.oppositePairAxes ?? [],
    capitalRoadConnected: input.capitalRoadConnected ?? false,
    placementCount: input.placementCount ?? 0,
  };
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function compareCoords(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}
