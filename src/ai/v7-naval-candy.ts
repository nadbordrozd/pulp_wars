import {
  SUGAR_RUSH_ATTACK2_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { sugarRushPhaseV7 } from "../engine/v7/candy";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Themed naval branches, Sugar Sails (`pulp_wars-5ti.21`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 8.6): the Normal AI's
 * reading of Candy ships beyond `src/ai/v7-candy.ts`'s Rush and Pie-first
 * rules (which now take a ship's Rush and the Pie Galleon's Splat too).
 *
 * - **Against Sugar Sails.** Another seat's Sugar Sails is private, so every
 *   visible hostile Candy ship whose role may Rush and that is neither
 *   Rushed nor Crashed is assumed to Rush on its next turn, as a hostile
 *   boat is assumed to Ram: its threat reach counts one more tile of Move
 *   (`navalSugarRushMoveBonusV7`) and its attack one more Attack
 *   (`navalSugarRushAttack2V7`). A Crashed one is no threat on its next turn
 *   (the Candy policy's existing reading of the Crash).
 *
 * Every function reads only the viewer's public view.
 */

/**
 * Whether a visible ship of another seat is assumed to Sugar Rush on its
 * next turn: it is afloat, its role has `SUGAR_RUSH` (the Candy ships), and
 * it has no `sugarRush` entry (a Crashed ship cannot Rush, and a Rushed one
 * already shows the bonus in its public stats).
 */
export function navalSugarRushAssumedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form === "NAVAL" &&
    unit.ownerId !== view.viewer.id &&
    sugarRushPhaseV7(view, unit.id) === null &&
    unitRoleRuleV7(view, unit).abilities.includes("SUGAR_RUSH")
  );
}

/** The Move a hostile Candy ship's assumed Rush adds to its threat reach. */
export function navalSugarRushMoveBonusV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return navalSugarRushAssumedV7(view, unit) ? SUGAR_RUSH_MOVE_BONUS_V7 : 0;
}

/** The `attack2` a hostile Candy ship's assumed Rush adds to its attack. */
export function navalSugarRushAttack2V7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return navalSugarRushAssumedV7(view, unit) ? SUGAR_RUSH_ATTACK2_V7 : 0;
}
