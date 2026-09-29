import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  factionRulesV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import {
  previewDevourV7,
  previewRaiseDeadV7,
  previewWailV7,
} from "../engine/v7/query";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  publicWailLeavesGraveV7,
  publicWailTargetsV7,
} from "../engine/v7/wail";

/**
 * Revision 13 Normal AI Undead helpers (`pulp_wars-vkq.9`).
 *
 * Every function reads only the viewer's public view and the public
 * previews. Nothing here draws from the PRNG, reads authoritative state, or
 * depends on elapsed time. The policy calls these helpers only in a match
 * with an Undead seat, so all-Human decisions stay byte-identical.
 */

/** Raised Skeletons are worth this much each (strategic units). */
export const RAISE_DEAD_SKELETON_VALUE_V7 = 14;
/** A hostile Necromancer within this Chebyshev distance can use a Grave. */
export const NECROMANCER_GRAVE_REACH_V7 = 3;
/** Devour heals at least this much before a Ghoul spends its action on it. */
export const DEVOUR_MINIMUM_HEAL_V7 = 3;

/** True when any seat is Undead; every Undead heuristic is gated on it. */
export function undeadMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "UNDEAD");
}

export function ownerIsUndeadV7(
  view: PlayerViewV7,
  ownerId: PlayerId,
): boolean {
  return (
    view.players.find((player) => player.id === ownerId)?.faction === "UNDEAD"
  );
}

/** Restless (section 5.3): the owner's land units recover only at home. */
export function ownerIsRestlessV7(
  view: PlayerViewV7,
  ownerId: PlayerId,
): boolean {
  const faction = view.players.find((player) => player.id === ownerId)?.faction;
  return faction !== undefined && factionRulesV7(faction).restless;
}

/** Public own-territory test for a tile and an owner. */
export function inOwnTerritoryForPolicyV7(
  view: PlayerViewV7,
  ownerId: PlayerId,
  at: CoordV7,
): boolean {
  const tile = publicTile(view, at);
  return tile?.explored === true && tile.territoryOwnerId === ownerId;
}

/**
 * Idle recovery a land unit of `ownerId` expects on `at` next turn, from the
 * public territory owner: 4 at home, 2 elsewhere, 0 elsewhere when Restless.
 */
export function publicIdleRecoveryV7(
  view: PlayerViewV7,
  ownerId: PlayerId,
  at: CoordV7,
): number {
  if (inOwnTerritoryForPolicyV7(view, ownerId, at)) return 4;
  return ownerIsRestlessV7(view, ownerId) ? 0 : 2;
}

export function isNecromancerV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes("RAISE_DEAD");
}

export function isZombieV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes("INFECT");
}

export function isBansheeV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes("WAIL");
}

export function isGhoulV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes("DEVOUR");
}

/**
 * The Lich: an Undead land unit with the splash mechanic. Battleships (of
 * either faction) keep their revision-12 threat treatment.
 */
export function isLichV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    ownerIsUndeadV7(view, unit.ownerId) &&
    unitRoleMechanicsV7(view, unit).splash
  );
}

/** Wail damages only living units (section 2.3): owner not Undead. */
export function isLivingOwnerV7(
  view: PlayerViewV7,
  ownerId: PlayerId,
): boolean {
  return !ownerIsUndeadV7(view, ownerId);
}

/** Whether any active hostile seat is living (a Wail can ever matter). */
export function hasLivingHostileSeatV7(
  view: PlayerViewV7,
  hostile: (ownerId: PlayerId) => boolean,
): boolean {
  return view.players.some(
    (player) =>
      player.status === "ACTIVE" &&
      player.faction !== "UNDEAD" &&
      hostile(player.id),
  );
}

export function isPrimaryUnusedV7(unit: PublicUnitV7): boolean {
  return (
    !unit.activation.attacked &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed &&
    !unit.activation.handled
  );
}

export function isGraveAtV7(view: PlayerViewV7, at: CoordV7): boolean {
  return view.graves.some((grave) => same(grave, at));
}

/**
 * Graves a Necromancer standing on `at` could raise: every explored Grave on
 * the eight neighbours with no visible unit on it. `movingUnitId` is ignored
 * as an occupant (it is the Necromancer that moves to `at`).
 */
export function raisableGravesAtV7(
  view: PlayerViewV7,
  at: CoordV7,
  movingUnitId: UnitId | null = null,
): readonly CoordV7[] {
  return view.graves.filter(
    (grave) =>
      chebyshev(grave, at) === 1 &&
      !view.units.some(
        (unit) => unit.id !== movingUnitId && same(unit.at, grave),
      ),
  );
}

/** Exact number of Skeletons an offered Raise Dead creates (public preview). */
export function raiseDeadCountV7(view: PlayerViewV7, unitId: UnitId): number {
  return previewRaiseDeadV7(view, unitId)?.graves.length ?? 0;
}

/** Exact Devour heal (public preview), or null when Devour is not offered. */
export function devourHealV7(
  view: PlayerViewV7,
  unitId: UnitId,
): number | null {
  return previewDevourV7(view, unitId)?.amount ?? null;
}

/** Visible Necromancers hostile to the viewer within reach of `at`. */
export function hostileNecromancersNearV7(
  view: PlayerViewV7,
  at: CoordV7,
  hostile: (ownerId: PlayerId) => boolean,
  reach = NECROMANCER_GRAVE_REACH_V7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      hostile(unit.ownerId) &&
      chebyshev(unit.at, at) <= reach &&
      isNecromancerV7(view, unit),
  );
}

/** Own Necromancers (other than `excluded`) within reach of `at`. */
export function ownNecromancersNearV7(
  view: PlayerViewV7,
  at: CoordV7,
  reach = NECROMANCER_GRAVE_REACH_V7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      chebyshev(unit.at, at) <= reach &&
      isNecromancerV7(view, unit),
  );
}

/**
 * Whether a land death on `unit`'s tile would leave a Grave (section 5.1),
 * judged from the public tile. Infect conversion is the caller's concern.
 */
export function publicDeathLeavesGraveV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "form" | "at">,
): boolean {
  return publicWailLeavesGraveV7(view, unit);
}

export interface WailSummaryV7 {
  readonly targets: number;
  readonly damage: number;
  readonly kills: number;
  readonly graves: number;
  /** Summed damage/kill/Grave value plus realized target value. */
  readonly value: number;
}

const NO_WAIL_V7: WailSummaryV7 = Object.freeze({
  targets: 0,
  damage: 0,
  kills: 0,
  graves: 0,
  value: 0,
});

/**
 * Exact Wail value for the offered Wail of `bansheeId` (public preview):
 * summed visible damage, kills, and Graves created.
 */
export function offeredWailSummaryV7(
  view: PlayerViewV7,
  bansheeId: UnitId,
  unitValue: (unit: PublicUnitV7) => number,
): WailSummaryV7 {
  const preview = previewWailV7(view, bansheeId);
  if (preview === null) return NO_WAIL_V7;
  return summarizeWail(
    view,
    preview.targets.map((target) => ({
      unitId: target.unitId,
      damage: target.damage,
      dies: target.dies,
      leavesGrave: target.leavesGrave,
    })),
    unitValue,
  );
}

/**
 * Public Wail value if `banshee` stood on `at` (its visible targets are
 * exactly the view's hostile living units within radius 2, as in the
 * preview), used to choose a Wail position before moving.
 */
export function projectedWailSummaryV7(
  view: PlayerViewV7,
  banshee: PublicUnitV7,
  at: CoordV7,
  unitValue: (unit: PublicUnitV7) => number,
): WailSummaryV7 {
  const moved = { ...banshee, at };
  return summarizeWail(
    view,
    publicWailTargetsV7(view, moved).map((target) => {
      const unit = view.units.find((item) => item.id === target.unitId);
      return {
        unitId: target.unitId,
        damage: target.damage,
        dies: target.dies,
        leavesGrave:
          target.dies &&
          unit !== undefined &&
          publicWailLeavesGraveV7(view, unit),
      };
    }),
    unitValue,
  );
}

function summarizeWail(
  view: PlayerViewV7,
  targets: readonly {
    readonly unitId: UnitId;
    readonly damage: number;
    readonly dies: boolean;
    readonly leavesGrave: boolean;
  }[],
  unitValue: (unit: PublicUnitV7) => number,
): WailSummaryV7 {
  let damage = 0;
  let kills = 0;
  let graves = 0;
  let value = 0;
  for (const target of targets) {
    const unit = view.units.find((item) => item.id === target.unitId);
    damage += target.damage;
    kills += Number(target.dies);
    graves += Number(target.leavesGrave);
    value += 10 * target.damage + 20 * Number(target.dies);
    value += 4 * Number(target.leavesGrave);
    if (unit !== undefined && unit.hp > 0)
      value += target.dies
        ? unitValue(unit)
        : Math.floor((unitValue(unit) * target.damage) / unit.hp);
  }
  return { targets: targets.length, damage, kills, graves, value };
}

/** Wail priority bands: kills, broad damage, chip damage, never a waste. */
export function wailPriorityV7(summary: WailSummaryV7): number {
  if (summary.targets === 0 || summary.damage <= 0) return -1;
  if (summary.kills > 0) return 1250;
  if (summary.damage >= 4 || summary.targets >= 2) return 1245;
  return 905;
}

function publicTile(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["board"]["tiles"][number] | undefined {
  const indexed = view.board.tiles[at.y * view.board.width + at.x];
  if (indexed !== undefined && same(indexed.at, at)) return indexed;
  return view.board.tiles.find((tile) => same(tile.at, at));
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
