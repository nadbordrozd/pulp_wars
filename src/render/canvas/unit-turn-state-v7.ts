import type { CommandV7, PlayerViewV7 } from "../../engine/index";
import { isAttackCommandV7 } from "../blocked-actions-v7";

/**
 * Bead pulp_wars-2yc.29: how one of the viewer's units stands in the
 * viewer's own turn, for the board's "yet to move" cue.
 *
 * - `FRESH`: it can still move (the engine offers it a Move and it is not
 *   handled): the bright pulsing ground ring and the bouncing chevron.
 * - `ACTIVE`: not handled and it has not acted, but it has no Move left (it
 *   may still attack, heal or use an ability): the thin still ring.
 * - `ATTACK` (bead pulp_wars-2yc.110, the user's test of 2026-10-26): it has
 *   already acted (it moved, was beamed down, or attacked with an Overrun, a
 *   Feast or a second shot pending) and the engine still offers it an attack
 *   ({@link isAttackCommandV7}, the dock's "Can attack · can't move"): the
 *   dashed red "can attack" ring.
 * - `SPENT`: handled, no attack is left for it this turn: no cue; it keeps
 *   its default look (the user's correction of 2026-10-07: dimming it was
 *   overkill).
 *
 * Outside the viewer's turn, for other players' units and for an Egg (which
 * never acts) there is no state and the unit is drawn plainly.
 */
export type UnitTurnStateV7 = "FRESH" | "ACTIVE" | "ATTACK" | "SPENT";

/**
 * Bead pulp_wars-2yc.110: the "can attack" ring is a test the user asked
 * for. False turns it off: a handled unit is `SPENT` again and an unhandled
 * one `ACTIVE`, exactly as before the bead.
 */
export const CAN_ATTACK_CUE_V7 = true;

const NO_STATES: ReadonlyMap<number, UnitTurnStateV7> = new Map();

/**
 * Every own unit's state, from the view and the engine's offer in one pass
 * over each (the feedback host asks once per view update, never per frame).
 */
export function unitTurnStatesV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  canAttackCue: boolean = CAN_ATTACK_CUE_V7,
): ReadonlyMap<number, UnitTurnStateV7> {
  if (
    view.outcome !== null ||
    view.viewer.id !== view.humanPlayerId ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id
  )
    return NO_STATES;
  const movers = new Set<number>();
  const attackers = new Set<number>();
  for (const command of commands)
    if (command.kind === "MOVE") movers.add(command.unitId);
    else if (canAttackCue && isAttackCommandV7(command) && "unitId" in command)
      attackers.add(command.unitId);
  const states = new Map<number, UnitTurnStateV7>();
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.hp <= 0 || unit.form === "EGG")
      continue;
    const activation = unit.activation;
    const handled = activation.handled;
    states.set(
      unit.id,
      !handled && movers.has(unit.id)
        ? "FRESH"
        : attackers.has(unit.id) &&
            (handled ||
              activation.moved ||
              activation.attacked ||
              activation.attacksUsed > 0)
          ? "ATTACK"
          : handled
            ? "SPENT"
            : "ACTIVE",
    );
  }
  return states;
}
