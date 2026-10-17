import {
  ALPHA_ATTACK2_V7,
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  unitGrowthStageV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { queryCombatPreviewV7 } from "../engine/v7/query";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import { exchangeTenthsV7, type NavalToolsV7 } from "./v7-naval";

/**
 * Themed naval branches, Horned Prows and the Plesiosaur
 * (`pulp_wars-5ti.18`, docs/product/RULESET_7_NAVAL_FACTIONS.md section
 * 5.6): the Normal AI's use of the Dinosaur ships beyond
 * `src/ai/v7-naval.ts`, where the ram approach and the held plain attack
 * preview each offered Move with its real path length
 * (`navalMovePathLengthV7`), so a Dugout runs two tiles in for its Horned
 * Prow, and the threat estimate assumes a hostile Dugout's run-up.
 *
 * - A Plesiosaur's torpedo that sinks a ship and makes it grow (Big at its
 *   first kill, Alpha at its third) is fired first
 *   (`PLESIOSAUR_GROWTH_TORPEDO_PRIORITY_V7`, above the Battleship
 *   torpedo) when the kill and the growth are worth more than each of its
 *   other torpedoes and no other own Submarine follows on that target.
 *   Otherwise it plays as a Submarine (the training counter, the safety
 *   rules).
 * - Board never reaches a Plesiosaur: the engine never offers it.
 *
 * Every function reads only the viewer's public view and exact previews.
 */

/** A torpedo kill that makes a Plesiosaur grow: above the Battleship torpedo (1279). */
export const PLESIOSAUR_GROWTH_TORPEDO_PRIORITY_V7 = 1280;

/**
 * The worth, in tenths of a Coin, of the growth the next kill credited to
 * `unit` earns: 0 unless it grows and that kill reaches Big or Alpha.
 * Growing fully heals, so it is the HP restored (the HP missing at `hp`
 * plus the stage's `GROWTH_HP_V7`) as a share of the unit's cost over its
 * maximum HP, and at Alpha also its +1 Attack, as the same share of its
 * cost as the Attack it adds (`ALPHA_ATTACK2_V7` over the role's
 * `attack2`).
 */
export function growthKillTenthsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  hp: number = unit.hp,
): number {
  if (unitGrowthStageV7(view, unit) === null) return 0;
  const kills = unit.kills + 1;
  const alpha = kills === GROWTH_KILLS_V7[1];
  if (kills !== GROWTH_KILLS_V7[0] && !alpha) return 0;
  const rule = unitRoleRuleV7(view, unit);
  const cost10 = (rule.cost ?? 0) * 10;
  const restored = Math.max(0, unit.maxHp - hp) + GROWTH_HP_V7;
  const healed = Math.floor((cost10 * restored) / Math.max(1, unit.maxHp));
  const attack = alpha
    ? Math.floor((cost10 * ALPHA_ATTACK2_V7) / Math.max(1, rule.attack2))
    : 0;
  return healed + attack;
}

/**
 * The priority of an own Plesiosaur's torpedo whose preview sinks the
 * target and makes it grow, or null. It is the growth priority when the
 * kill (`exchangeTenthsV7`) and the growth (`growthKillTenthsV7`) are worth
 * more, in tenths of a Coin, than each other torpedo the same ship has on
 * offer (its exchange, and the growth if it also kills), and no other own
 * Submarine with its attack unspent has a torpedo on that other target
 * (the two would sink it together).
 */
export function plesiosaurGrowthTorpedoPriorityV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number | null {
  if (
    !preview.torpedo ||
    !preview.defenderDies ||
    preview.attackerDies ||
    actor.ownerId !== view.viewer.id
  )
    return null;
  const growth = growthKillTenthsV7(view, actor);
  if (growth <= 0) return null;
  const value = exchangeTenthsV7(view, actor, target, preview) + growth;
  for (const offered of tools.commands) {
    if (
      offered.kind !== "ATTACK" ||
      offered.unitId !== actor.id ||
      offered.targetUnitId === target.id
    )
      continue;
    const other = view.units.find((unit) => unit.id === offered.targetUnitId);
    const shot = queryCombatPreviewV7(view, actor.id, offered.targetUnitId);
    if (other === undefined || shot === null || !shot.torpedo) continue;
    const followed = tools.commands.some(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId !== actor.id &&
        command.targetUnitId === other.id &&
        queryCombatPreviewV7(view, command.unitId, other.id)?.torpedo === true,
    );
    if (followed) return null;
    const worth =
      exchangeTenthsV7(view, actor, other, shot) +
      (shot.defenderDies && !shot.attackerDies ? growth : 0);
    if (worth >= value) return null;
  }
  return PLESIOSAUR_GROWTH_TORPEDO_PRIORITY_V7;
}
