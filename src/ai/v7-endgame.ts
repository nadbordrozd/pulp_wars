import type { CityId, PlayerId } from "../engine/model/ids";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicCityV7 } from "../engine/v7/view";

/**
 * Normal AI endgame siege helpers (`pulp_wars-1mc`).
 *
 * About 80% of round-capped Normal-vs-Normal games were last-city stalls:
 * the winning seat surrounded the losing seat's last city but never took
 * it. Endgame siege mode switches on when the public leaderboard shows a
 * hostile seat reduced to at most two cities while the viewer holds at least
 * three and at least twice as many, and at least as many living units. Every
 * input is public (leaderboard counts, visible cities and units, explored
 * tiles); nothing draws from the PRNG or depends on elapsed time, and every
 * helper is a bounded scan of the view.
 */

/** A hostile seat with at most this many cities is an endgame target. */
export const ENDGAME_MAXIMUM_TARGET_CITIES_V7 = 2;
/** The viewer needs at least this many cities to start an endgame siege. */
export const ENDGAME_MINIMUM_OWN_CITIES_V7 = 3;
/** Endgame approach and siege moves outrank routine moves (700–850). */
export const ENDGAME_APPROACH_PRIORITY_V7 = 1105;
/** A non-capturing squatter leaves a target center just before 1290. */
export const ENDGAME_VACATE_PRIORITY_V7 = 1291;

export interface EndgamePlanV7 {
  /** Visible cities of hostile seats that the viewer should finish off. */
  readonly targets: readonly PublicCityV7[];
  readonly targetCityIds: ReadonlySet<CityId>;
  /**
   * Steps from each explored, enterable, unoccupied land tile to the nearest
   * target center over such tiles (8-way). Occupied tiles are walls, so a
   * unit routes around a line of its own Catapults instead of stopping at
   * the Chebyshev minimum behind it. This is the field of a Move-1 unit,
   * which can never pass a unit: every step costs its whole budget.
   */
  readonly routeDistanceByKey: ReadonlyMap<string, number>;
  /**
   * Revision 18: the same field for a land unit with Move 2 or more, which
   * passes through the viewer's own units. Own-occupied tiles are part of
   * the field (passable) but are never end tiles: no offered Move ends on
   * one. Tiles held by another seat's units stay walls.
   */
  readonly passRouteDistanceByKey: ReadonlyMap<string, number>;
}

const key = (at: CoordV7) => `${at.y},${at.x}`;

/** Public endgame targets, or null outside the endgame. */
export function endgamePlanForPolicyV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): EndgamePlanV7 | null {
  const own = view.leaderboard.find((entry) => entry.isViewer);
  if (
    own === undefined ||
    own.status !== "ACTIVE" ||
    own.cityCount < ENDGAME_MINIMUM_OWN_CITIES_V7
  )
    return null;
  // Expansion comes first: while an own land unit can walk to an explored,
  // empty neutral village, the ordinary policy (which values villages) keeps
  // control. A village only reachable by sea, or one a unit already stands
  // on, does not hold the endgame back.
  const occupied = new Set(view.units.map((unit) => key(unit.at)));
  const villages = view.board.tiles.filter(
    (tile) =>
      tile.explored &&
      tile.site === "VILLAGE" &&
      tile.territoryOwnerId === null &&
      !occupied.has(key(tile.at)),
  );
  if (villages.length > 0) {
    const reachable = landReachableKeys(
      view,
      view.units
        .filter(
          (unit) => unit.ownerId === view.viewer.id && unit.form === "LAND",
        )
        .map((unit) => unit.at),
    );
    if (villages.some((tile) => reachable.has(key(tile.at)))) return null;
  }
  const targetOwners = new Set<PlayerId>();
  for (const entry of view.leaderboard)
    if (
      entry.status === "ACTIVE" &&
      isHostile(entry.playerId) &&
      entry.cityCount > 0 &&
      entry.cityCount <= ENDGAME_MAXIMUM_TARGET_CITIES_V7 &&
      own.cityCount >= entry.cityCount * 2 &&
      own.livingUnitCount >= entry.livingUnitCount
    )
      targetOwners.add(entry.playerId);
  if (targetOwners.size === 0) return null;
  const targets = view.cities.filter((city) => targetOwners.has(city.ownerId));
  const sources: CoordV7[] = targets.map((city) => city.at);
  // A target seat's city the viewer has never explored lies on an unexplored
  // tile within two of that seat's explored territory; head for those tiles
  // or, with no such territory known, for the edge of the explored map. Only
  // when every living hostile seat is a target (the game's last cities): a
  // search does not pull capturers away from other hostile seats.
  const lastHostiles = view.leaderboard.every(
    (entry) =>
      entry.status !== "ACTIVE" ||
      !isHostile(entry.playerId) ||
      targetOwners.has(entry.playerId),
  );
  const unseen =
    lastHostiles &&
    view.leaderboard.some(
      (entry) =>
        targetOwners.has(entry.playerId) &&
        targets.filter((city) => city.ownerId === entry.playerId).length <
          entry.cityCount,
    );
  if (unseen) {
    const territory = view.board.tiles.filter(
      (tile) =>
        tile.explored &&
        tile.territoryOwnerId !== null &&
        targetOwners.has(tile.territoryOwnerId),
    );
    const unexplored = view.board.tiles.filter((tile) => !tile.explored);
    const nearTerritory = unexplored.filter((tile) =>
      territory.some(
        (owned) =>
          Math.max(
            Math.abs(owned.at.x - tile.at.x),
            Math.abs(owned.at.y - tile.at.y),
          ) <= 2,
      ),
    );
    sources.push(
      ...(nearTerritory.length > 0 ? nearTerritory : unexplored).map(
        (tile) => tile.at,
      ),
    );
  }
  if (sources.length === 0) return null;
  return {
    targets,
    targetCityIds: new Set(targets.map((city) => city.id)),
    routeDistanceByKey: routeDistances(view, sources, false),
    passRouteDistanceByKey: routeDistances(view, sources, true),
  };
}

function enterableLand(view: PlayerViewV7, at: CoordV7): boolean {
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return (
    tile !== undefined &&
    tile.explored &&
    (tile.terrain === "GRASS" ||
      tile.terrain === "FOREST" ||
      (tile.terrain === "MOUNTAIN" &&
        view.viewer.researchedTechs.includes("ENGINEERING")))
  );
}

/** Explored enterable land connected to `starts` (units are not walls). */
function landReachableKeys(
  view: PlayerViewV7,
  starts: readonly CoordV7[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const queue: CoordV7[] = [];
  for (const at of starts)
    if (!seen.has(key(at))) {
      seen.add(key(at));
      queue.push(at);
    }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) break;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const at = { x: current.x + dx, y: current.y + dy };
        if (
          at.x < 0 ||
          at.y < 0 ||
          at.x >= view.board.width ||
          at.y >= view.board.height ||
          seen.has(key(at)) ||
          !enterableLand(view, at)
        )
          continue;
        seen.add(key(at));
        queue.push(at);
      }
  }
  return seen;
}

function routeDistances(
  view: PlayerViewV7,
  sources: readonly CoordV7[],
  passesOwnUnits: boolean,
): ReadonlyMap<string, number> {
  const { width, height } = view.board;
  const occupied = new Set(
    view.units
      .filter((unit) => !passesOwnUnits || unit.ownerId !== view.viewer.id)
      .map((unit) => key(unit.at)),
  );
  const distances = new Map<string, number>();
  const queue: CoordV7[] = [];
  for (const at of sources) {
    if (distances.has(key(at))) continue;
    distances.set(key(at), 0);
    queue.push(at);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) break;
    const next = (distances.get(key(current)) ?? 0) + 1;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const at = { x: current.x + dx, y: current.y + dy };
        const tileKey = key(at);
        if (
          at.x < 0 ||
          at.y < 0 ||
          at.x >= width ||
          at.y >= height ||
          distances.has(tileKey) ||
          occupied.has(tileKey) ||
          !enterableLand(view, at)
        )
          continue;
        distances.set(tileKey, next);
        queue.push(at);
      }
  }
  return distances;
}

/**
 * Route distance from `at` to the nearest target center. An occupied tile
 * outside the field (the unit's own) is one step more than its best
 * neighbour in the field. `passesOwnUnits` selects the revision-18 field of
 * a unit that can pass through the viewer's own units.
 */
export function endgameRouteDistanceV7(
  plan: EndgamePlanV7,
  view: PlayerViewV7,
  at: CoordV7,
  passesOwnUnits = false,
): number {
  const field = passesOwnUnits
    ? plan.passRouteDistanceByKey
    : plan.routeDistanceByKey;
  const direct = field.get(key(at));
  if (direct !== undefined) return direct;
  let best = Number.POSITIVE_INFINITY;
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = at.x + dx;
      const y = at.y + dy;
      if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
        continue;
      const value = field.get(key({ x, y }));
      if (value !== undefined) best = Math.min(best, value + 1);
    }
  return best;
}

/** The endgame target whose center is `at`, if any. */
export function endgameTargetAtV7(
  plan: EndgamePlanV7 | null,
  at: CoordV7 | null,
): PublicCityV7 | undefined {
  if (plan === null || at === null) return undefined;
  return plan.targets.find((city) => city.at.x === at.x && city.at.y === at.y);
}

/** Chebyshev distance from `at` to the nearest target center. */
export function endgameTargetDistanceV7(
  plan: EndgamePlanV7,
  at: CoordV7,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const city of plan.targets)
    best = Math.min(
      best,
      Math.max(Math.abs(city.at.x - at.x), Math.abs(city.at.y - at.y)),
    );
  return best;
}
