import {
  effectiveRoleRuleV7,
  unitRoleRuleV7,
  type EffectiveRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { FactionIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Normal AI army play (tuning 5, `pulp_wars-w49.4`,
 * docs/product/RULESET_7_TUNING_HUMAN.md section 12): field an army and use
 * it. In four hand-played games the policy trained a unit every third turn,
 * bought economy technologies with enemies at its gates, walked its
 * garrison off walled centers, fed single units into pairs, and left its
 * ranged units where they had no shot.
 *
 * The rules (the hooks are in `src/ai/v7.ts`; this file holds the numbers
 * and the composition):
 *
 * - **Alert.** A seat is alert once an enemy city is known or a hostile
 *   land unit is visible within `ARMY_ALERT_RADIUS_V7` of an own center.
 * - **Units first.** While alert, a city with a free unit slot trains
 *   before any research and any construction, and the unit on its center
 *   steps beside it so that the city can train in the same turn (also
 *   with an enemy near: the trained unit takes the center, so a besieged
 *   city gains a defender instead of sitting on its Coins).
 * - **Composition.** What a city trains is the offered (so affordable)
 *   role whose class is furthest below its share of the army
 *   (`ARMY_SHARES_V7`), the dearer role first inside a class; never only
 *   defenders.
 * - **Research toward units.** While alert and a fighting role of the tree
 *   is not unlocked, the cheapest chain to one is researched before any
 *   other technology, and other research waits.
 * - **Combined kills.** Every visible hostile land unit is a target for the
 *   combined kill of `pulp_wars-9s0.8`: the units that can hit it this
 *   turn, moving in first where they must, attack when together they kill
 *   it; unanswered (ranged) hits go first.
 * - **Engage.** A unit that may attack after moving moves to where its
 *   attack is an acceptable exchange (a kill, or clearly more dealt than
 *   taken); a siege unit moves to where it will have a shot next turn and
 *   survives the turn between.
 * - **Approach.** A healthy fighting unit with no errand (a village, a
 *   chest, exploring) walks toward the nearest visible hostile land unit
 *   within `ARMY_APPROACH_RADIUS_V7`; a ranged unit stops at its range.
 * - **Together.** A routine Move does not take a melee unit alone into the
 *   heavy reach of more enemies than it has friends beside it, nor a
 *   ranged, siege, or support unit into lethal reach or into any reach
 *   without a melee unit of its own nearer to the enemy.
 * - **Garrison.** The unit on an own center stays while a hostile land unit
 *   is visible within `ARMY_GARRISON_RADIUS_V7`, except for that step
 *   beside the center; without the Coins for a unit it does not move.
 *
 * It applies to a Human, Undead, or Goblin seat in a match whose every
 * seat is one of those three (the pairings the tuning rounds play): a
 * match with any other faction keeps the policy of that faction's own
 * pass, on both sides. It is off while the seat's naval plan is active (it
 * must cross water to reach anyone) and while the opening growth harvest
 * is due. Everything is read from the public view and the public previews;
 * nothing draws from the PRNG or depends on elapsed time.
 */
export const ARMY_PLAY_FACTIONS_V7: readonly FactionIdV7[] = Object.freeze([
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
]);

export function armyPlayFactionV7(faction: FactionIdV7): boolean {
  return ARMY_PLAY_FACTIONS_V7.includes(faction);
}

/** A hostile land unit this close to an own center puts the seat on alert. */
export const ARMY_ALERT_RADIUS_V7 = 6;
/** The unit on an own center stays while a hostile land unit is this close. */
export const ARMY_GARRISON_RADIUS_V7 = 6;
/** Training while alert: above a city level (1210) and every construction. */
export const ARMY_TRAINING_PRIORITY_V7 = 1215;
/** Stepping off a center so that its city can train: just above training. */
export const ARMY_VACATE_PRIORITY_V7 = 1216;
/** Research toward a fighting role: above the best economic research (1160). */
export const ARMY_RESEARCH_PRIORITY_V7 = 1165;
/** Other research waits while the role chain costs at most this many turns. */
export const ARMY_RESEARCH_HOLD_TURNS_V7 = 4;
/**
 * A combined kill on an ordinary unit: the hunters' Moves and their hits
 * that do not kill yet. Below a direct kill (1180) and the Goblin Kaboom
 * and Gang Up ladders (1177 to 1185), above Pillage (1170).
 */
export const ARMY_HUNT_MOVE_PRIORITY_V7 = 1171;
export const ARMY_HUNT_ATTACK_PRIORITY_V7 = 1172;
/** A Move into an acceptable exchange: above chip attacks (900). */
export const ARMY_ENGAGE_PRIORITY_V7 = 950;
/** A siege unit's Move to a tile with a shot next turn: above routine Moves. */
export const ARMY_FIRING_POSITION_PRIORITY_V7 = 740;
/** A Move toward the nearest visible hostile land unit: a routine Move. */
export const ARMY_APPROACH_PRIORITY_V7 = 720;
/** A unit approaches a hostile land unit within this distance. */
export const ARMY_APPROACH_RADIUS_V7 = 5;
/** Hostile units counted around a destination, and own units beside it. */
export const ARMY_PRESSURE_RADIUS_V7 = 3;
export const ARMY_SUPPORT_RADIUS_V7 = 2;
/** Hunters of one combined kill (the limit of `pulp_wars-9s0.8`). */
export const ARMY_HUNT_REACH_V7 = 6;

/** The classes the composition counts; a naval or reward role has none. */
export type ArmyClassV7 =
  | "LINE"
  | "DEFENDER"
  | "RANGED"
  | "SIEGE"
  | "BREAKTHROUGH"
  | "SKIRMISHER"
  | "SUPPORT";

export const ARMY_CLASSES_V7: readonly ArmyClassV7[] = Object.freeze([
  "LINE",
  "DEFENDER",
  "RANGED",
  "SIEGE",
  "BREAKTHROUGH",
  "SKIRMISHER",
  "SUPPORT",
]);

export function armyClassV7(rule: EffectiveRoleRuleV7): ArmyClassV7 | null {
  return (ARMY_CLASSES_V7 as readonly string[]).includes(rule.tacticalRole)
    ? (rule.tacticalRole as ArmyClassV7)
    : null;
}

/**
 * The shares of the land army, in percent. `fragile` (two or more visible
 * hostile ranged, siege, or support units): more breakthrough units, which
 * exist to reach them.
 */
export const ARMY_SHARES_V7 = Object.freeze({
  standard: Object.freeze({
    LINE: 35,
    DEFENDER: 15,
    RANGED: 20,
    SIEGE: 15,
    BREAKTHROUGH: 15,
  }),
  fragile: Object.freeze({
    LINE: 30,
    DEFENDER: 10,
    RANGED: 20,
    SIEGE: 15,
    BREAKTHROUGH: 25,
  }),
});
/** One skirmisher once the army has this many units. */
export const ARMY_SKIRMISHER_ARMY_V7 = 5;
/** One support unit per this many army units, at most two. */
export const ARMY_SUPPORT_PER_UNITS_V7 = 4;
export const ARMY_SUPPORT_MAXIMUM_V7 = 2;
/** Visible hostile fragile units that switch the shares. */
export const ARMY_FRAGILE_HOSTILES_V7 = 2;

export interface ArmyCountsV7 {
  /** Own land-form units with a class. */
  readonly total: number;
  readonly byClass: Readonly<Record<ArmyClassV7, number>>;
  /** Visible hostile land units of a ranged, siege, or support class. */
  readonly hostileFragile: number;
}

export function armyCountsV7(
  view: PlayerViewV7,
  isHostile: (unit: PublicUnitV7) => boolean,
): ArmyCountsV7 {
  const byClass: Record<ArmyClassV7, number> = {
    LINE: 0,
    DEFENDER: 0,
    RANGED: 0,
    SIEGE: 0,
    BREAKTHROUGH: 0,
    SKIRMISHER: 0,
    SUPPORT: 0,
  };
  let total = 0;
  let hostileFragile = 0;
  for (const unit of view.units) {
    if (unit.form !== "LAND") continue;
    const unitClass = armyClassV7(unitRoleRuleV7(view, unit));
    if (unitClass === null) continue;
    if (unit.ownerId === view.viewer.id) {
      byClass[unitClass] += 1;
      total += 1;
    } else if (
      isHostile(unit) &&
      (unitClass === "RANGED" ||
        unitClass === "SIEGE" ||
        unitClass === "SUPPORT")
    )
      hostileFragile += 1;
  }
  return { total, byClass, hostileFragile };
}

/**
 * How much the army wants one more unit of `role`, in hundredths of a unit
 * of its class's deficit, plus the role's cost (the dearer role of a class
 * first, and the dearer class on a tie). `threatened`: the city is
 * threatened, so bodies come first and fragile units last.
 */
export function armyRoleScoreV7(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  counts: ArmyCountsV7,
  threatened: boolean,
): number {
  const rule = effectiveRoleRuleV7(role, faction);
  const unitClass = armyClassV7(rule);
  if (unitClass === null || rule.cost === null) return Number.NEGATIVE_INFINITY;
  const after = counts.total + 1;
  const have = counts.byClass[unitClass];
  let deficit: number;
  if (unitClass === "SKIRMISHER")
    deficit = 100 * (Number(counts.total >= ARMY_SKIRMISHER_ARMY_V7) - have);
  else if (unitClass === "SUPPORT")
    deficit =
      100 *
      (Math.min(
        ARMY_SUPPORT_MAXIMUM_V7,
        Math.floor(counts.total / ARMY_SUPPORT_PER_UNITS_V7),
      ) -
        have);
  else {
    const shares =
      counts.hostileFragile >= ARMY_FRAGILE_HOSTILES_V7
        ? ARMY_SHARES_V7.fragile
        : ARMY_SHARES_V7.standard;
    deficit = shares[unitClass] * after - 100 * have;
  }
  const defence = !threatened
    ? 0
    : unitClass === "DEFENDER"
      ? 200
      : unitClass === "LINE"
        ? 100
        : unitClass === "SIEGE" || unitClass === "SUPPORT"
          ? -200
          : 0;
  return deficit + defence + rule.cost;
}
