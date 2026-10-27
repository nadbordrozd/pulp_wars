import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  attackIsWhirlV7,
  factionRulesV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { whirlAttackPreviewV7, type WhirlPreviewV7 } from "../engine/v7/query";
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
/**
 * Each target beyond the first next to a Whirligig's tile (Dwarf crowd
 * control, `pulp_wars-w49.33`: its Whirl hits them all, unanswered).
 */
export const NINTH_WHIRL_TARGET_VALUE_V7 = 8;
/**
 * `pulp_wars-befg`: the Whirligig's attack (its Whirl) hits own and allied
 * units next to it too. Each own or allied unit next to a Whirligig's tile
 * costs it this much there (it goes into an enemy crowd away from its own
 * units).
 */
export const NINTH_WHIRL_FRIENDLY_COST_V7 = 12;
/**
 * `pulp_wars-befg`: another own unit that ends its Move next to an own
 * Whirligig with a hostile land unit within `NINTH_WHIRL_DANGER_RADIUS_V7`
 * of it (one that is about to whirl) pays this (it stops parking there).
 */
export const NINTH_WHIRL_NEIGHBOUR_COST_V7 = 10;
/** A Whirligig with a hostile land unit this close is about to whirl. */
export const NINTH_WHIRL_DANGER_RADIUS_V7 = 4;
/**
 * `pulp_wars-befg`: the scoring of a Whirligig's attack. Each HP an own or
 * allied unit loses costs `NINTH_WHIRL_FRIENDLY_DAMAGE_COST_V7` immediate
 * units (an enemy's HP is worth 10), each own death
 * `NINTH_WHIRL_FRIENDLY_DEATH_COST_V7` more and its strategic value.
 */
export const NINTH_WHIRL_FRIENDLY_DAMAGE_COST_V7 = 15;
export const NINTH_WHIRL_FRIENDLY_DEATH_COST_V7 = 60;
/**
 * A Whirl that hits own or allied units is made only when it kills at
 * least this many enemies and the Coins of the enemy units it kills (and
 * the share of their price it takes from the ones it only hurts) are at
 * least `NINTH_WHIRL_FRIENDLY_FIRE_RATIO_V7` times the share of the own
 * units' price it takes (a whole price for a death): "clearly worth it".
 */
export const NINTH_WHIRL_FRIENDLY_FIRE_KILLS_V7 = 2;
export const NINTH_WHIRL_FRIENDLY_FIRE_RATIO_V7 = 2;
/** The price counted for a unit without one (a reward unit). */
export const NINTH_WHIRL_PRICELESS_VALUE_V7 = 10;
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
 * Whirl (Dwarf crowd control, `pulp_wars-w49.33`, which replaced Three
 * Hammers): a Whirligig goes where several targets stand next to one tile.
 * Each visible hostile land unit next to `to` beyond the first counts
 * `NINTH_WHIRL_TARGET_VALUE_V7`; nothing strikes back at a Whirl, so a
 * healthy unit costs nothing here (the ordinary safety terms weigh the
 * enemy's next turn). Since `pulp_wars-befg` the Whirl (its attack) hits
 * own and allied units too: with a target there, each own or allied unit
 * next to `to` costs `NINTH_WHIRL_FRIENDLY_COST_V7`, and any other own
 * land unit pays the neighbour cost below. Not tuned.
 */
export function whirlMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  if (actor.form !== "LAND") return 0;
  if (!unitRoleMechanicsV7(view, actor).whirl)
    return whirlNeighbourMoveValueV7(view, actor, to, isHostile);
  const targets = hostileLandUnitsV7(view, isHostile).filter(
    (unit) => chebyshev(unit.at, to) === 1,
  ).length;
  // `pulp_wars-befg`: its Whirl hits the own and allied units there too.
  const friends = view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.id !== actor.id &&
      !isHostile(unit.ownerId) &&
      chebyshev(unit.at, to) === 1,
  ).length;
  return (
    Math.max(0, targets - 1) * NINTH_WHIRL_TARGET_VALUE_V7 -
    (targets > 0 ? friends * NINTH_WHIRL_FRIENDLY_COST_V7 : 0)
  );
}

/**
 * `pulp_wars-befg`: another own land unit does not park next to an own
 * Whirligig that is about to whirl (a hostile land unit within
 * `NINTH_WHIRL_DANGER_RADIUS_V7` of it): each such Whirligig next to `to`
 * costs `NINTH_WHIRL_NEIGHBOUR_COST_V7`. 0 without an own Whirligig.
 */
function whirlNeighbourMoveValueV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
  isHostile: NinthUnitHostileV7,
): number {
  const whirligigs = view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      chebyshev(unit.at, to) === 1 &&
      attackIsWhirlV7(view, unit),
  );
  if (whirligigs.length === 0) return 0;
  const hostiles = hostileLandUnitsV7(view, isHostile);
  return (
    0 -
    whirligigs.filter((whirligig) =>
      hostiles.some(
        (unit) =>
          chebyshev(unit.at, whirligig.at) <= NINTH_WHIRL_DANGER_RADIUS_V7,
      ),
    ).length *
      NINTH_WHIRL_NEIGHBOUR_COST_V7
  );
}

const WHIRL_PREVIEWS_V7 = new WeakMap<
  PlayerViewV7,
  Map<UnitId, WhirlPreviewV7 | null>
>();

/**
 * `pulp_wars-befg`: the Whirl preview of an own Whirligig with an offered
 * `ATTACK`, once per view (all its attacks share one hit set).
 */
export function whirlPreviewForScoringV7(
  view: PlayerViewV7,
  unitId: UnitId,
): WhirlPreviewV7 | null {
  let byUnit = WHIRL_PREVIEWS_V7.get(view);
  if (byUnit === undefined) {
    byUnit = new Map();
    WHIRL_PREVIEWS_V7.set(view, byUnit);
  }
  if (!byUnit.has(unitId))
    byUnit.set(unitId, whirlAttackPreviewV7(view, unitId));
  return byUnit.get(unitId) ?? null;
}

/** `pulp_wars-befg`: the Normal AI's score of a Whirligig's attack. */
export interface WhirlAttackScoreV7 {
  readonly priority: number;
  readonly immediate: number;
  readonly strategic: number;
}

/**
 * `pulp_wars-befg`: a Whirligig's attack is a Whirl, whichever enemy next
 * to it is the target, so every such `ATTACK` is scored on the whole hit
 * set: the enemy damage and kills (10 a HP, 20 a kill, and each kill's
 * strategic value) minus a heavy cost for each own or allied unit hit
 * (`NINTH_WHIRL_FRIENDLY_DAMAGE_COST_V7` a HP,
 * `NINTH_WHIRL_FRIENDLY_DEATH_COST_V7` and its strategic value a death).
 * null (no attack) without an enemy hit, and for friendly fire unless it
 * kills at least `NINTH_WHIRL_FRIENDLY_FIRE_KILLS_V7` enemies and the
 * Coins it takes from the enemy are at least
 * `NINTH_WHIRL_FRIENDLY_FIRE_RATIO_V7` times those it takes from its own
 * side. Not tuned.
 */
export function whirlAttackScoreV7(
  view: PlayerViewV7,
  whirl: WhirlPreviewV7,
  strategicValueOf: (unitId: UnitId) => number,
  threatening: (unitId: UnitId) => boolean,
): WhirlAttackScoreV7 | null {
  const enemies = whirl.targets.filter((target) => !target.friendly);
  if (enemies.length === 0) return null;
  const friends = whirl.targets.filter((target) => target.friendly);
  const immediate = enemies.reduce(
    (value, target) => value + 10 * target.damage + 20 * Number(target.dies),
    0,
  );
  const strategic = enemies.reduce(
    (value, target) =>
      target.dies ? value + strategicValueOf(target.unitId) : value,
    0,
  );
  const ownImmediate = friends.reduce(
    (value, target) =>
      value +
      NINTH_WHIRL_FRIENDLY_DAMAGE_COST_V7 * target.damage +
      (target.dies ? NINTH_WHIRL_FRIENDLY_DEATH_COST_V7 : 0),
    0,
  );
  const ownStrategic = friends.reduce(
    (value, target) =>
      target.dies ? value + strategicValueOf(target.unitId) : value,
    0,
  );
  if (
    friends.length > 0 &&
    (whirl.kills < NINTH_WHIRL_FRIENDLY_FIRE_KILLS_V7 ||
      whirlCoinsTakenV7(view, enemies) <
        NINTH_WHIRL_FRIENDLY_FIRE_RATIO_V7 * whirlCoinsTakenV7(view, friends))
  )
    return null;
  const threat = enemies.some((target) => threatening(target.unitId));
  return {
    priority: whirl.kills > 0 ? (threat ? 1280 : 1180) : threat ? 1240 : 900,
    immediate: immediate - ownImmediate,
    strategic: strategic - ownStrategic,
  };
}

/**
 * The Coins a Whirl takes from the units hit: each dead unit's price, and
 * each survivor's price times the share of its maximum HP it loses.
 */
function whirlCoinsTakenV7(
  view: PlayerViewV7,
  hits: WhirlPreviewV7["targets"],
): number {
  return hits.reduce((sum, hit) => {
    const unit = view.units.find((candidate) => candidate.id === hit.unitId);
    if (unit === undefined) return sum;
    const price =
      unitRoleRuleV7(view, unit).cost ?? NINTH_WHIRL_PRICELESS_VALUE_V7;
    return (
      sum + (hit.dies ? price : (price * hit.damage) / Math.max(1, unit.maxHp))
    );
  }, 0);
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
    whirlMoveValueV7(view, actor, to, isHostile) +
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
