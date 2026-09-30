import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  factionRulesV7,
  playerFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { ExplosionChainPreviewV7 } from "../engine/v7/query";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Revision 17 Normal AI Goblin helpers (`pulp_wars-0ao.6`).
 *
 * Every function reads only the viewer's public view and the public
 * previews (`previewKaboomV7`, `previewAttackExplosionsV7`, the combat
 * preview). Nothing here draws from the PRNG, reads authoritative state, or
 * depends on elapsed time. The policy calls these helpers only in a match
 * with a Goblin seat, so Human and Undead decisions in every other match stay
 * byte-identical.
 */

/** A non-lethal Kaboom must be worth at least this much (strategic units). */
export const KABOOM_CHIP_MARGIN_V7 = 4;
/** A Kaboom that kills: just below an ordinary attack kill (1180). */
export const KABOOM_KILL_PRIORITY_V7 = 1178;
/**
 * A Kaboom that kills two or more: above an ordinary attack kill (1180), so
 * the exploder does not spend its action on a single kill instead.
 */
export const KABOOM_MULTI_KILL_PRIORITY_V7 = 1181;
/** A Kaboom that kills a unit threatening an own city. */
export const KABOOM_CITY_SAVE_PRIORITY_V7 = 1279;
/** A Kaboom that clears a hostile city center next to an own capturer. */
export const KABOOM_CAPTURE_PRIORITY_V7 = 1347;
/**
 * A net-positive Kaboom of a unit visible enemies would kill anyway: above
 * chip attacks (900) and a badly wounded unit's Recover (930).
 */
export const KABOOM_DOOMED_PRIORITY_V7 = 935;
/** A net-positive chip Kaboom: after chip attacks (900) soften the targets. */
export const KABOOM_CHIP_PRIORITY_V7 = 895;
/** A Move after which the unit's Kaboom kills (one wave, visible units). */
export const KABOOM_SETUP_PRIORITY_V7 = 1177;
/** A helper Move that turns another own attack into a kill (Gang Up). */
export const GANG_UP_KILL_SETUP_PRIORITY_V7 = 1185;
/** A helper Move that adds Gang Up damage to another own attack. */
export const GANG_UP_SETUP_PRIORITY_V7 = 905;
/**
 * A Move after which the mover's own Gang Up attack kills: after direct
 * kills (1180), before Kaboom kills (1178).
 */
export const GANG_UP_STRIKE_PRIORITY_V7 = 1179;
/** Clearing a hostile city center for an own capturer. */
export const KABOOM_CAPTURE_VALUE_V7 = 40;
/** Killing a unit that threatens an own city. */
export const KABOOM_CITY_SAVE_VALUE_V7 = 20;
/** One Coin is worth four strategic units (unit value is cost x 4 + HP). */
export const COIN_STRATEGIC_VALUE_V7 = 4;
/** Friendly fire costs this much more than equal hostile damage gains. */
export const FRIENDLY_FIRE_TRADE_FACTOR_V7 = 2;
/** The Goblin's training bias (preferred-role value and city utility). */
export const GOBLIN_TRAINING_BIAS_V7 = 4;
/**
 * The first four owned Goblins do not count against the preferred-role
 * choice (it charges 8 per owned unit of the role): the horde.
 */
export const GOBLIN_HORDE_TRAINING_BIAS_V7 = 8;
export const GOBLIN_HORDE_TRAINING_MAXIMUM_V7 = 4;

/** True when any seat is Goblin; every Goblin heuristic is gated on it. */
export function goblinMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "GOBLIN");
}

/** Fixed Kaboom damage of a goblin-crewed unit (0 without Kaboom). */
export function kaboomDamageV7(view: PlayerViewV7, unit: PublicUnitV7): number {
  if (!unitRoleRuleV7(view, unit).abilities.includes("KABOOM")) return 0;
  return unitRoleMechanicsV7(view, unit).kaboomDamage ?? 0;
}

/** Fixed death-blast damage of an exploding unit (0 for a non-exploder). */
export function deathBlastDamageV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return unitRoleMechanicsV7(view, unit).deathBlastDamage ?? 0;
}

/** Troll regeneration per Start Turn (0 for every other role). */
export function regenerationV7(view: PlayerViewV7, unit: PublicUnitV7): number {
  return unitRoleMechanicsV7(view, unit).regeneration;
}

/**
 * Gang Up (section 5.2) a land-form `attacker` would get against a target at
 * `targetAt`: other units of its owner on the eight cells around the target,
 * not counting `ignore` (the target, a unit that is moving away), up to the
 * owner's faction maximum. Own units are always visible to their owner, and
 * the viewer's estimate of a hostile Goblin uses the units it can see.
 */
export function gangUpForPolicyV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  targetAt: CoordV7,
  ignore: ReadonlySet<UnitId> = new Set(),
): number {
  const maximum = factionRulesV7(
    playerFactionV7(view, attacker.ownerId),
  ).gangUpMaximum;
  if (maximum === 0) return 0;
  let helpers = 0;
  for (const unit of view.units)
    if (
      unit.ownerId === attacker.ownerId &&
      unit.id !== attacker.id &&
      !ignore.has(unit.id) &&
      chebyshev(unit.at, targetAt) === 1
    )
      helpers += 1;
  return Math.min(maximum, helpers);
}

export interface ExplosionChainValueV7 {
  readonly hostileValue: number;
  readonly friendlyValue: number;
  readonly hostileDamage: number;
  readonly hostileKills: number;
  readonly friendlyDamage: number;
  readonly friendlyKills: number;
  /** Visible hostile units the chain kills (for city-save and capture tests). */
  readonly hostileKilledIds: readonly UnitId[];
  /** Visible own or allied units the chain kills. */
  readonly friendlyKilledIds: readonly UnitId[];
}

/**
 * Values a previewed chain from the viewer's side: hostile damage and kills
 * at `hostileValue`, own and allied damage and kills at `friendlyValue`
 * (neutral units and Zombies that rise during the chain are ignored).
 */
export function explosionChainValueV7(
  view: PlayerViewV7,
  chain: Pick<ExplosionChainPreviewV7, "explosions">,
  isHostile: (ownerId: PlayerId) => boolean,
  hostileValue: (unit: PublicUnitV7, damage: number, dies: boolean) => number,
  friendlyValue: (unit: PublicUnitV7, damage: number, dies: boolean) => number,
): ExplosionChainValueV7 {
  let hostile = 0;
  let friendly = 0;
  let hostileDamage = 0;
  let hostileKills = 0;
  let friendlyDamage = 0;
  let friendlyKills = 0;
  const hostileKilledIds: UnitId[] = [];
  const friendlyKilledIds: UnitId[] = [];
  for (const explosion of chain.explosions)
    for (const result of explosion.results) {
      if (result.unitId === null) continue;
      const unit = view.units.find((item) => item.id === result.unitId);
      if (unit === undefined) continue;
      if (result.friendly) {
        friendly += friendlyValue(unit, result.damage, result.dies);
        friendlyDamage += result.damage;
        if (result.dies) {
          friendlyKills += 1;
          friendlyKilledIds.push(unit.id);
        }
      } else if (isHostile(result.ownerId)) {
        hostile += hostileValue(unit, result.damage, result.dies);
        hostileDamage += result.damage;
        if (result.dies) {
          hostileKills += 1;
          hostileKilledIds.push(unit.id);
        }
      }
    }
  return {
    hostileValue: hostile,
    friendlyValue: friendly,
    hostileDamage,
    hostileKills,
    friendlyDamage,
    friendlyKills,
    hostileKilledIds,
    friendlyKilledIds,
  };
}

/** One hypothetical blast of fixed damage centred on `center`. */
export interface HypotheticalBlastV7 {
  readonly hostileValue: number;
  readonly friendlyValue: number;
  readonly hostileKills: number;
  readonly friendlyHits: number;
}

/**
 * A single-wave blast (no chain) of `damage` at `center` hitting every
 * visible unit within Chebyshev 1 except the exploder; `moved`, when given,
 * is counted at `moved.at` instead of where it stands. Values are from the
 * viewer's side, as in `explosionChainValueV7`.
 */
export function hypotheticalBlastV7(
  view: PlayerViewV7,
  center: CoordV7,
  damage: number,
  exploderId: UnitId,
  isHostile: (ownerId: PlayerId) => boolean,
  isFriendly: (ownerId: PlayerId) => boolean,
  hostileValue: (unit: PublicUnitV7, damage: number, dies: boolean) => number,
  friendlyValue: (unit: PublicUnitV7, damage: number, dies: boolean) => number,
  moved?: { readonly unit: PublicUnitV7; readonly at: CoordV7 },
): HypotheticalBlastV7 {
  let hostile = 0;
  let friendly = 0;
  let hostileKills = 0;
  let friendlyHits = 0;
  for (const original of view.units) {
    if (original.id === exploderId) continue;
    const at =
      moved !== undefined && moved.unit.id === original.id
        ? moved.at
        : original.at;
    if (chebyshev(at, center) > 1) continue;
    const hit = Math.min(damage, original.hp);
    const dies = hit >= original.hp;
    if (isFriendly(original.ownerId)) {
      friendly += friendlyValue(original, hit, dies);
      friendlyHits += 1;
    } else if (isHostile(original.ownerId)) {
      hostile += hostileValue(original, hit, dies);
      if (dies) hostileKills += 1;
    }
  }
  return {
    hostileValue: hostile,
    friendlyValue: friendly,
    hostileKills,
    friendlyHits,
  };
}

/** The best Kaboom a visible hostile goblin-crewed unit has against `at`. */
export interface KaboomExposureV7 {
  /** Value of the viewer's own and allied units the blast would hit. */
  readonly ownLoss: number;
  /** Own and allied units hit (the unit standing at `at` included). */
  readonly ownHits: number;
  /** The enemy's gain: our loss minus its own loss and its exploder's value. */
  readonly enemyNet: number;
}

const NO_KABOOM_EXPOSURE_V7: KaboomExposureV7 = Object.freeze({
  ownLoss: 0,
  ownHits: 0,
  enemyNet: Number.NEGATIVE_INFINITY,
});

/**
 * The most profitable Kaboom (for the enemy) that a visible hostile
 * goblin-crewed unit could set off next turn around `actor` standing at `at`:
 * the exploder steps (Move, or an embarked unit's landing) onto an empty land
 * cell next to `at` within its Move, or explodes where it stands, and its
 * blast hits every visible unit around that cell. A bounded public estimate
 * (Chebyshev reach, no terrain or zone of control), used to keep units out
 * of clumps a Kaboom would profit from.
 */
export function hostileKaboomExposureV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
  hostiles: readonly PublicUnitV7[],
  isFriendly: (ownerId: PlayerId) => boolean,
  cellOpen: (at: CoordV7) => boolean,
  unitsNear: (center: CoordV7) => readonly PublicUnitV7[],
  ownValue: (unit: PublicUnitV7, damage: number, dies: boolean) => number,
  enemyValue: (unit: PublicUnitV7, damage: number, dies: boolean) => number,
): KaboomExposureV7 {
  let best = NO_KABOOM_EXPOSURE_V7;
  for (const hostile of hostiles) {
    if (hostile.form === "NAVAL") continue;
    const damage = kaboomDamageV7(view, hostile);
    if (damage <= 0) continue;
    const reach =
      hostile.form === "EMBARKED" ? 2 : unitRoleRuleV7(view, hostile).move;
    if (chebyshev(hostile.at, at) > reach + 1) continue;
    for (let y = at.y - 1; y <= at.y + 1; y += 1)
      for (let x = at.x - 1; x <= at.x + 1; x += 1) {
        const center = { x, y };
        if (x === at.x && y === at.y) continue;
        if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
          continue;
        const standing = hostile.form === "LAND" && same(hostile.at, center);
        if (
          !standing &&
          (chebyshev(hostile.at, center) > reach || !cellOpen(center))
        )
          continue;
        // The actor is hit at `at` (next to every candidate center); every
        // other visible unit where it stands.
        let ownLoss = 0;
        let ownHits = 0;
        let enemyLoss = 0;
        const hits = [
          actor,
          ...unitsNear(center).filter(
            (unit) =>
              unit.id !== actor.id &&
              unit.id !== hostile.id &&
              chebyshev(unit.at, center) <= 1,
          ),
        ];
        for (const unit of hits) {
          const hit = Math.min(damage, unit.hp);
          const dies = hit >= unit.hp;
          if (isFriendly(unit.ownerId)) {
            ownLoss += ownValue(unit, hit, dies);
            ownHits += 1;
          } else enemyLoss += enemyValue(unit, hit, dies);
        }
        const enemyNet =
          ownLoss - enemyLoss - enemyValue(hostile, hostile.hp, true);
        if (enemyNet > best.enemyNet) best = { ownLoss, ownHits, enemyNet };
      }
  }
  return best;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

export function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
