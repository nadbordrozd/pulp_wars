import type { CityId, PlayerId } from "../model/ids";
import type {
  CityState,
  Coord,
  GameState,
  TileState,
  UnitState,
} from "../model/types";

export function nearestViableCandifyCities(
  state: GameState,
  playerId: PlayerId,
  unit: UnitState,
): readonly CityState[] {
  const viable = state.cities
    .filter(
      (city) =>
        city.ownerId === playerId &&
        state.board.tiles.some(
          (tile) =>
            tile.territoryCityId === city.id &&
            chebyshev(tile.at, unit.at) === 1,
        ),
    )
    .map((city) => ({ city, distance: chebyshev(city.at, unit.at) }));
  const minimum = viable.reduce(
    (best, candidate) => Math.min(best, candidate.distance),
    Number.POSITIVE_INFINITY,
  );
  return viable
    .filter((candidate) => candidate.distance === minimum)
    .map((candidate) => candidate.city)
    .sort((left, right) => left.id - right.id);
}

export function removalWouldDisconnectCity(
  state: GameState,
  cityId: CityId,
  removedAt: Coord,
): boolean {
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return true;
  const remaining = state.board.tiles.filter(
    (tile) => tile.territoryCityId === cityId && !sameCoord(tile.at, removedAt),
  );
  return !territoryTilesAreConnected(city, remaining);
}

export function territoryTilesAreConnected(
  city: CityState,
  tiles: readonly Pick<TileState, "at">[],
): boolean {
  if (!tiles.some((tile) => sameCoord(tile.at, city.at))) return false;
  const keys = new Set(tiles.map((tile) => coordKey(tile.at)));
  const reached = new Set<string>([coordKey(city.at)]);
  const queue: Coord[] = [city.at];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (let y = current.y - 1; y <= current.y + 1; y += 1) {
      for (let x = current.x - 1; x <= current.x + 1; x += 1) {
        if (x === current.x && y === current.y) continue;
        const key = `${x},${y}`;
        if (keys.has(key) && !reached.has(key)) {
          reached.add(key);
          queue.push({ x, y });
        }
      }
    }
  }
  return reached.size === keys.size;
}

/**
 * Checks the normalized dynamic-territory representation as one atomic
 * invariant. Candify uses this after reduction so it can never commit a tile
 * assignment that points at a missing/wrong center or leaves any city islanded.
 */
export function dynamicTerritoryIsValid(state: GameState): boolean {
  return (
    state.board.tiles.every((tile) => {
      // Generated neutral-village footprints retain their settlement center
      // before a city entity exists, so only controlled tiles participate in
      // the dynamic city-assignment invariant.
      if (tile.territoryCityId === null) return true;
      const city = state.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      return (
        city !== undefined &&
        tile.territoryCenter !== null &&
        sameCoord(tile.territoryCenter, city.at)
      );
    }) &&
    state.cities.every((city) =>
      territoryTilesAreConnected(
        city,
        state.board.tiles.filter((tile) => tile.territoryCityId === city.id),
      ),
    )
  );
}

export function territoryOwnerId(
  state: GameState,
  cityId: CityId | null,
): PlayerId | null {
  return cityId === null
    ? null
    : (state.cities.find((city) => city.id === cityId)?.ownerId ?? null);
}

function chebyshev(left: Coord, right: Coord): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function coordKey(at: Coord): string {
  return `${at.x},${at.y}`;
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}
