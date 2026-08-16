import type { CityId, UnitId } from "../model/ids";
import type { Coord, GameState, UnitState } from "../model/types";
import { arePlayersHostile } from "../rules/relationships";

export type CapturableTarget =
  | { readonly kind: "NEUTRAL_VILLAGE"; readonly at: Coord }
  | {
      readonly kind: "ENEMY_CITY";
      readonly cityId: CityId;
      readonly at: Coord;
    };

export type CaptureEligibility =
  | { readonly eligible: true; readonly target: CapturableTarget }
  | {
      readonly eligible: false;
      readonly reason:
        | "UNIT_NOT_FOUND"
        | "NOT_ACTIVE_PLAYER"
        | "NOT_OCCUPYING_TARGET"
        | "TARGET_OCCUPIED"
        | "NOT_MARKED_AT_TURN_START"
        | "UNIT_NOT_READY";
      readonly target: CapturableTarget | null;
    };

export function capturableTargetForUnit(
  state: GameState,
  unit: UnitState,
): CapturableTarget | null {
  if (unit.hp <= 0) return null;
  const city = state.cities.find((candidate) =>
    sameCoord(candidate.at, unit.at),
  );
  if (city !== undefined) {
    return !arePlayersHostile(
      state.setup.aiMode,
      state.humanPlayerId,
      unit.ownerId,
      city.ownerId,
    )
      ? null
      : { kind: "ENEMY_CITY", cityId: city.id, at: city.at };
  }
  const tile = state.board.tiles[unit.at.y * state.board.width + unit.at.x];
  return tile?.site === "VILLAGE" && sameCoord(tile.at, unit.at)
    ? { kind: "NEUTRAL_VILLAGE", at: tile.at }
    : null;
}

export function captureEligibility(
  state: GameState,
  unitId: UnitId,
): CaptureEligibility {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) {
    return { eligible: false, reason: "UNIT_NOT_FOUND", target: null };
  }
  const target = capturableTargetForUnit(state, unit);
  const activePlayerId = state.turnOrder[state.activeSeatIndex];
  if (activePlayerId !== unit.ownerId) {
    return { eligible: false, reason: "NOT_ACTIVE_PLAYER", target };
  }
  if (target === null) {
    return { eligible: false, reason: "NOT_OCCUPYING_TARGET", target: null };
  }
  if (
    state.units.some(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.hp > 0 &&
        sameCoord(candidate.at, unit.at),
    )
  ) {
    return { eligible: false, reason: "TARGET_OCCUPIED", target };
  }
  if (!unit.captureEligible) {
    return { eligible: false, reason: "NOT_MARKED_AT_TURN_START", target };
  }
  if (!unit.ready) {
    return { eligible: false, reason: "UNIT_NOT_READY", target };
  }
  return { eligible: true, target };
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}
