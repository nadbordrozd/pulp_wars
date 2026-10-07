import type { CommandV7, PlayerViewV7 } from "../../engine/index";

/**
 * Bead pulp_wars-2yc.29: how one of the viewer's units stands in the
 * viewer's own turn, for the board's "yet to move" cue.
 *
 * - `FRESH`: it can still move (the engine offers it a Move and it is not
 *   handled): the bright pulsing ground ring and the bouncing chevron.
 * - `ACTIVE`: not handled, but it has no Move left (it may still attack,
 *   heal or use an ability): the thin still ring.
 * - `SPENT`: handled, nothing is left for it this turn: its sprite dims.
 *
 * Outside the viewer's turn, for other players' units and for an Egg (which
 * never acts) there is no state and the unit is drawn plainly.
 */
export type UnitTurnStateV7 = "FRESH" | "ACTIVE" | "SPENT";

const NO_STATES: ReadonlyMap<number, UnitTurnStateV7> = new Map();

export function unitTurnStatesV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): ReadonlyMap<number, UnitTurnStateV7> {
  if (
    view.outcome !== null ||
    view.viewer.id !== view.humanPlayerId ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id
  )
    return NO_STATES;
  const movers = new Set<number>();
  for (const command of commands)
    if (command.kind === "MOVE") movers.add(command.unitId);
  const states = new Map<number, UnitTurnStateV7>();
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.hp <= 0 || unit.form === "EGG")
      continue;
    states.set(
      unit.id,
      unit.activation.handled
        ? "SPENT"
        : movers.has(unit.id)
          ? "FRESH"
          : "ACTIVE",
    );
  }
  return states;
}
