import type { PlayerId } from "../engine/model/ids";
import {
  factionRulesV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The ninth unit (`pulp_wars-w49.17`, `pulp-wars-poc-7r55`,
 * docs/product/RULESET_7_NINTH_UNIT.md): the Normal AI's use rules for the
 * mechanics of the units added to every roster. They are deliberately
 * small: one positional value per mechanic, so that a seat does not
 * misuse its new unit. None is tuned; the faction-by-faction playtests
 * own that.
 *
 * Every function reads only the viewer's public view. Nothing here draws
 * from the PRNG, reads authoritative state, or depends on elapsed time,
 * and each returns 0 (or false) at once for a unit without the mechanic,
 * so a match without the new units decides exactly as before.
 */

/** An Ogre beside a target another own unit can reach (Heavyweight). */
export const NINTH_HEAVYWEIGHT_VALUE_V7 = 6;
/** The Gang Up targets that count for one Ogre. */
export const NINTH_HEAVYWEIGHT_TARGETS_V7 = 2;
/** Another own unit this close to a target can attack it this turn or next. */
export const NINTH_HEAVYWEIGHT_SUPPORT_RADIUS_V7 = 2;
/** A Shielded Shock Trooper between an own unit and the enemy. */
export const NINTH_SHOCK_SCREEN_VALUE_V7 = 5;
/** The own units one Shock Trooper is counted as screening. */
export const NINTH_SHOCK_SCREEN_UNITS_V7 = 2;
/** Each weak target beyond the first next to a Whirligig's tile. */
export const NINTH_HAMMERS_TARGET_VALUE_V7 = 8;
/** A hostile unit at or below this HP is a weak target for a Whirligig. */
export const NINTH_HAMMERS_WEAK_HP_V7 = 8;
/** A healthy hostile melee unit next to a Whirligig's tile. */
export const NINTH_HAMMERS_HEALTHY_COST_V7 = 4;
/** Standing on the Grave a hostile Wight would climb out of. */
export const NINTH_GRAVE_DENIAL_VALUE_V7 = 12;
/** Standing on the Grave an own Wight would climb out of. */
export const NINTH_OWN_GRAVE_COST_V7 = 12;
/** A hostile unit this close to a Grave can stand on it before it rises. */
export const NINTH_GRAVE_DENIAL_RADIUS_V7 = 2;

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** Whether `ownerId` is hostile to the viewer, as the caller's policy reads it. */
export type NinthUnitHostileV7 = (ownerId: PlayerId) => boolean;

function hostileLandUnitsV7(
  view: PlayerViewV7,
  isHostile: NinthUnitHostileV7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) => unit.hp > 0 && unit.form === "LAND" && isHostile(unit.ownerId),
  );
}

function ownLandUnitsV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.form === "LAND" &&
      unit.ownerId === view.viewer.id &&
      unit.id !== actor.id,
  );
}

/**
 * Heavyweight: an Ogre stands beside Gang Up targets. Each visible hostile
 * land unit next to `to` that another own land unit stands within
 * `NINTH_HEAVYWEIGHT_SUPPORT_RADIUS_V7` of counts, at most
 * `NINTH_HEAVYWEIGHT_TARGETS_V7`. Only for a unit whose kind has Gang Up
 * and whose role counts as more than one unit.
 */
export function heavyweightMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  if (actor.form !== "LAND") return 0;
  if (unitRoleMechanicsV7(view, actor).gangUpWeight <= 1) return 0;
  const kind = unitFactionV7(view, actor);
  if (factionRulesV7(kind).gangUpMaximum === 0) return 0;
  const helpers = ownLandUnitsV7(view, actor);
  const targets = hostileLandUnitsV7(view, isHostile).filter(
    (target) =>
      chebyshev(target.at, to) === 1 &&
      helpers.some(
        (helper) =>
          chebyshev(helper.at, target.at) <=
          NINTH_HEAVYWEIGHT_SUPPORT_RADIUS_V7,
      ),
  ).length;
  return (
    Math.min(NINTH_HEAVYWEIGHT_TARGETS_V7, targets) * NINTH_HEAVYWEIGHT_VALUE_V7
  );
}

/**
 * Shock Field: a Shock Trooper whose Shield is up goes in front of the
 * line. Each own land unit next to `to` that is farther from the nearest
 * visible hostile land unit than `to` is counts (the Trooper stands
 * between it and the enemy), at most `NINTH_SHOCK_SCREEN_UNITS_V7`.
 */
export function shockScreenMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  if (actor.form !== "LAND") return 0;
  if (unitRoleMechanicsV7(view, actor).shockFieldDamage <= 0) return 0;
  const shield =
    view.shields.find((entry) => entry.unitId === actor.id)?.shield ?? 0;
  if (shield < 1) return 0;
  const hostiles = hostileLandUnitsV7(view, isHostile);
  if (hostiles.length === 0) return 0;
  const nearest = (at: CoordV7): number =>
    Math.min(...hostiles.map((unit) => chebyshev(unit.at, at)));
  const front = nearest(to);
  const screened = ownLandUnitsV7(view, actor).filter(
    (unit) => chebyshev(unit.at, to) === 1 && nearest(unit.at) > front,
  ).length;
  return (
    Math.min(NINTH_SHOCK_SCREEN_UNITS_V7, screened) *
    NINTH_SHOCK_SCREEN_VALUE_V7
  );
}

/**
 * Three Hammers: a Whirligig goes where several targets stand next to one
 * tile, and not into a healthy line. Each weak visible hostile land unit
 * next to `to` beyond the first counts (weak: at most
 * `NINTH_HAMMERS_WEAK_HP_V7` HP, or a ranged, siege, or support unit), up
 * to the unit's attacks; each healthy hostile melee unit next to `to`
 * costs `NINTH_HAMMERS_HEALTHY_COST_V7` (it strikes back).
 */
export function threeHammersMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  if (actor.form !== "LAND") return 0;
  const attacks = unitRoleMechanicsV7(view, actor).attacksPerTurn;
  if (attacks <= 1) return 0;
  let weak = 0;
  let healthy = 0;
  for (const unit of hostileLandUnitsV7(view, isHostile)) {
    if (chebyshev(unit.at, to) !== 1) continue;
    const rule = unitRoleRuleV7(view, unit);
    const fragile =
      rule.tacticalRole === "RANGED" ||
      rule.tacticalRole === "SIEGE" ||
      rule.tacticalRole === "SUPPORT";
    if (fragile || unit.hp <= NINTH_HAMMERS_WEAK_HP_V7) weak += 1;
    else if (rule.abilities.includes("ATTACK") && rule.minimumRange <= 1)
      healthy += 1;
  }
  return (
    Math.max(0, Math.min(attacks, weak) - 1) * NINTH_HAMMERS_TARGET_VALUE_V7 -
    healthy * NINTH_HAMMERS_HEALTHY_COST_V7
  );
}

/**
 * Rise Again, for every seat: a Move that ends on the marked Grave of a
 * hostile Wight keeps it from climbing out (`NINTH_GRAVE_DENIAL_VALUE_V7`),
 * and one that ends on the marked Grave of an own Wight keeps the own Wight
 * down (`-NINTH_OWN_GRAVE_COST_V7`). A flyer or an afloat unit stands on
 * no Grave tile that matters here: land form only.
 */
export function wightGraveMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  if (actor.form !== "LAND" || view.ninthUnit.wightGraves.length === 0)
    return 0;
  const grave = view.ninthUnit.wightGraves.find((entry) => same(entry.at, to));
  if (grave === undefined) return 0;
  if (grave.ownerId === view.viewer.id) return -NINTH_OWN_GRAVE_COST_V7;
  return isHostile(grave.ownerId) ? NINTH_GRAVE_DENIAL_VALUE_V7 : 0;
}

/**
 * What a land Move of `actor` to `to` is worth for the ninth-unit
 * mechanics, in strategic units: the sum of the four rules above. 0 for a
 * unit without a mechanic on a board without a marked Grave.
 */
export function ninthUnitMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  if (actor.form !== "LAND" || actor.ownerId !== view.viewer.id) return 0;
  return (
    heavyweightMoveValueV7(view, actor, to, isHostile) +
    shockScreenMoveValueV7(view, actor, to, isHostile) +
    threeHammersMoveValueV7(view, actor, to, isHostile) +
    wightGraveMoveValueV7(view, actor, to, isHostile)
  );
}

/**
 * Rise Again, for the Wight's own seat: whether a Raise Dead or a Devour
 * that would consume `graves` is held. It is held when one of the Graves
 * is marked for an own Wight and no visible hostile land unit stands
 * within `NINTH_GRAVE_DENIAL_RADIUS_V7` of that Grave: the Wight returns
 * by itself at the next Start Turn, at more HP than a raised Skeleton. With
 * an enemy that close the Grave would be stood on, so the Necromancer (or
 * the Ghoul) takes what it can get instead: the Grave is not left for the
 * enemy when a choice exists.
 */
export function ownWightGraveHeldV7(
  view: PlayerViewV7,
  graves: readonly CoordV7[],
  isHostile: NinthUnitHostileV7,
): boolean {
  const marked = view.ninthUnit.wightGraves.filter(
    (entry) =>
      entry.ownerId === view.viewer.id &&
      graves.some((grave) => same(grave, entry.at)),
  );
  if (marked.length === 0) return false;
  const hostiles = hostileLandUnitsV7(view, isHostile);
  return marked.some(
    (entry) =>
      !hostiles.some(
        (unit) => chebyshev(unit.at, entry.at) <= NINTH_GRAVE_DENIAL_RADIUS_V7,
      ),
  );
}
