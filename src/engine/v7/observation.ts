import type { PlayerId } from "../model/ids";
import { arePlayersAlliedV7 } from "./economy";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";

/**
 * The players whose pieces and cities contribute detector coverage to a
 * viewer. Cooperative AI allies share Saboteur detection, but not fog.
 */
export function detectionSidePlayerIdsV7(
  state: GameStateV7,
  viewerId: PlayerId,
): readonly PlayerId[] {
  return state.players
    .filter(
      (player) =>
        player.status === "ACTIVE" &&
        (player.id === viewerId ||
          arePlayersAlliedV7(state, viewerId, player.id)),
    )
    .map((player) => player.id);
}

/** True when ordinary unit/city detector geometry covers a coordinate. */
export function detectionCoversCoordV7(
  state: GameStateV7,
  viewerId: PlayerId,
  at: CoordV7,
): boolean {
  const side = new Set(detectionSidePlayerIdsV7(state, viewerId));
  return (
    state.cities.some(
      (city) => side.has(city.ownerId) && chebyshev(city.at, at) <= 1,
    ) ||
    state.units.some(
      (unit) =>
        unit.hp > 0 &&
        side.has(unit.ownerId) &&
        chebyshev(unit.at, at) <= (unit.role === "SCOUT" ? 2 : 1),
    )
  );
}

/**
 * Viewer-relative unit visibility. Detection and explicit reveals expose the
 * entity and coordinate only; they deliberately do not mutate exploration.
 */
export function isUnitVisibleToPlayerV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unit: UnitStateV7,
): boolean {
  return (
    isUnitVisibleWithoutDefectionV7(state, viewerId, unit) ||
    state.defectionMarks.some((mark) =>
      unitExplicitlyRevealedByDefectionV7(state, viewerId, unit, mark),
    )
  );
}

/** Independent visibility used when deciding whether a third party sees a link. */
export function isUnitVisibleWithoutDefectionV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unit: UnitStateV7,
): boolean {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined) throw new RangeError("Unknown viewer");
  if (unit.ownerId === viewerId) return true;
  const explored = viewer.explored.some((at) => same(at, unit.at));
  if (unit.role !== "SABOTEUR") return explored;
  if (arePlayersAlliedV7(state, viewerId, unit.ownerId)) return explored;
  return (
    detectionCoversCoordV7(state, viewerId, unit.at) ||
    state.saboteurExposures.some(
      (exposure) =>
        exposure.unitId === unit.id &&
        (exposure.anchorPlayerId === viewerId ||
          arePlayersAlliedV7(state, viewerId, exposure.anchorPlayerId)),
    )
  );
}

export function visibleUnitIdsV7(
  state: GameStateV7,
  viewerId: PlayerId,
): ReadonlySet<number> {
  return new Set(
    state.units
      .filter((unit) => isUnitVisibleToPlayerV7(state, viewerId, unit))
      .map((unit) => unit.id),
  );
}

export function unitExplicitlyRevealedByDefectionV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unit: UnitStateV7,
  mark: GameStateV7["defectionMarks"][number],
): boolean {
  if (unit.id === mark.sourceUnitId)
    return (
      viewerId === mark.initiatingPlayerId ||
      viewerId === mark.recordedTargetOwnerId ||
      arePlayersAlliedV7(state, viewerId, mark.recordedTargetOwnerId)
    );
  return unit.id === mark.targetUnitId && viewerId === mark.initiatingPlayerId;
}

export function withUnitAtForObservationV7(
  state: GameStateV7,
  unitId: number,
  at: CoordV7,
): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId ? { ...unit, at } : unit,
    ),
  };
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
