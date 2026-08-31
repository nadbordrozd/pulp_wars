import type { CityId, PlayerId } from "../model/ids";
import { SPATIAL_ECONOMIC_ACTIONS_V6 } from "../rules/ruleset-v6";
import type {
  CityStateV6,
  CoordV6,
  EconomicImprovementId,
  GameStateV6,
  TileStateV6,
  UnitStateV6,
} from "./types";

interface CandifyImprovementTileV6 {
  readonly at: CoordV6;
  readonly territoryCityId?: CityId | null;
  readonly improvement?: EconomicImprovementId | null;
}

const ONE_PER_CITY_IMPROVEMENTS_V6 = new Set<EconomicImprovementId>(
  Object.values(SPATIAL_ECONOMIC_ACTIONS_V6).map((rule) => rule.improvement),
);

/** Shared public/authoritative one-per-city viability for Candify transfers. */
export function candifyWouldDuplicateSpecializedImprovementV6(
  tiles: readonly CandifyImprovementTileV6[],
  destinationCityId: CityId,
  transferredImprovement: EconomicImprovementId | null,
): boolean {
  return (
    transferredImprovement !== null &&
    ONE_PER_CITY_IMPROVEMENTS_V6.has(transferredImprovement) &&
    tiles.some(
      (tile) =>
        tile.territoryCityId === destinationCityId &&
        tile.improvement === transferredImprovement,
    )
  );
}

/** Candidate cities for a bounded v6 Candify, in deterministic nearest/ID order. */
export function nearestViableCandifyCitiesV6(
  state: Pick<GameStateV6, "board" | "cities">,
  playerId: PlayerId,
  unit: Pick<UnitStateV6, "at">,
): readonly CityStateV6[] {
  const target = state.board.tiles.find((tile) => sameCoord(tile.at, unit.at));
  const transferredImprovement = target?.improvement ?? null;
  const viable = state.cities
    .filter(
      (city) =>
        city.ownerId === playerId &&
        cityFootprintContainsV6(city, unit.at) &&
        !candifyWouldDuplicateSpecializedImprovementV6(
          state.board.tiles,
          city.id,
          transferredImprovement,
        ) &&
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

export function cityFootprintContainsV6(
  city: Pick<CityStateV6, "at" | "expanded">,
  at: CoordV6,
): boolean {
  return chebyshev(city.at, at) <= (city.expanded ? 2 : 1);
}

export function removalWouldDisconnectCityV6(
  state: Pick<GameStateV6, "board" | "cities">,
  cityId: CityId,
  removedAt: CoordV6,
): boolean {
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return true;
  return !territoryTilesAreConnectedV6(
    city,
    state.board.tiles.filter(
      (tile) =>
        tile.territoryCityId === cityId && !sameCoord(tile.at, removedAt),
    ),
  );
}

export function territoryTilesAreConnectedV6(
  city: Pick<CityStateV6, "at">,
  tiles: readonly Pick<TileStateV6, "at">[],
): boolean {
  if (!tiles.some((tile) => sameCoord(tile.at, city.at))) return false;
  const keys = new Set(tiles.map((tile) => coordKey(tile.at)));
  const reached = new Set<string>([coordKey(city.at)]);
  const queue: CoordV6[] = [city.at];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (let y = current.y - 1; y <= current.y + 1; y += 1) {
      for (let x = current.x - 1; x <= current.x + 1; x += 1) {
        if (x === current.x && y === current.y) continue;
        const at = { x, y };
        const key = coordKey(at);
        if (keys.has(key) && !reached.has(key)) {
          reached.add(key);
          queue.push(at);
        }
      }
    }
  }
  return reached.size === keys.size;
}

export function territoryOwnerIdV6(
  state: Pick<GameStateV6, "cities">,
  cityId: CityId | null,
): PlayerId | null {
  return cityId === null
    ? null
    : (state.cities.find((city) => city.id === cityId)?.ownerId ?? null);
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
