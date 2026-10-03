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
import { PLAGUE_DURATION_TURNS_V7 } from "../engine/v7/afflictions";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  publicWailLeavesGraveV7,
  publicWailTargetsV7,
} from "../engine/v7/wail";
import { policyUnitFactionV7 } from "./v7-martian";

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
/** A 10-HP Zombie rising (Infect or Bitten): Zombie cost 3 x 4 + 10 HP. */
export const BITTEN_RISING_VALUE_V7 = 22;

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
 * either faction) keep their revision-12 threat treatment. The Mind
 * Control revision (section 8): Undead by its kind, so a controlled Lich
 * is still a Lich.
 */
export function isLichV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    policyUnitFactionV7(view, unit) === "UNDEAD" &&
    unitRoleMechanicsV7(view, unit).splash
  );
}

/**
 * `pulp_wars-vkq.21`: a Lich in any form (land or embarked), for movement
 * safety afloat.
 */
export function isLichRoleV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form !== "NAVAL" &&
    policyUnitFactionV7(view, unit) === "UNDEAD" &&
    unitRoleMechanicsV7(view, unit).splash
  );
}

/**
 * `pulp_wars-vkq.21`: any unit whose attack splashes onto the primary
 * target's neighbours: the Lich and the Battleship of either faction.
 */
export function isSplashAttackerV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unit.form !== "EMBARKED" && unitRoleMechanicsV7(view, unit).splash;
}

/** The Vampire: its attacks draw no retaliation (revision 14 V1). */
export function isVampireV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes("UNANSWERED");
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

/** The Graves an offered Raise Dead raises (public preview), else none. */
export function raiseDeadGravesV7(
  view: PlayerViewV7,
  unitId: UnitId,
): readonly CoordV7[] {
  return previewRaiseDeadV7(view, unitId)?.graves ?? [];
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
      bittenRises: target.bittenRises,
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
      const bittenRises =
        target.dies &&
        unit !== undefined &&
        unit.form === "LAND" &&
        view.bitten.some((entry) => entry.unitId === unit.id);
      return {
        unitId: target.unitId,
        damage: target.damage,
        dies: target.dies,
        leavesGrave:
          target.dies &&
          !bittenRises &&
          unit !== undefined &&
          publicWailLeavesGraveV7(view, unit),
        bittenRises,
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
    readonly bittenRises: boolean;
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
    // Revision 14: a bitten victim rises as its biter's Zombie.
    if (
      target.bittenRises &&
      view.bitten.some(
        (entry) =>
          entry.unitId === target.unitId &&
          entry.biterPlayerId === view.viewer.id,
      )
    )
      value += BITTEN_RISING_VALUE_V7;
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

// ---------------------------------------------------------------------------
// Revision 14 (`pulp_wars-vkq.18`): Plague, Bitten, Tend cures.
//
// Every helper reads only the public statuses (`view.plagued`, whose source
// is named only for a Lich the viewer sees, and `view.bitten`) and visible
// units. The policy calls them only in a match with an Undead seat; without
// one both status lists are empty and every value below is 0.

/** Public Plague and Bitten statuses of the view, indexed once per decision. */
export interface PublicAfflictionsV7 {
  readonly plagued: ReadonlySet<UnitId>;
  /**
   * Revision 15: plagued units still on their first plagued turn, the only
   * ones that spread at their owner's next Start Turn.
   */
  readonly spreading: ReadonlySet<UnitId>;
  /** Revision 15: public remaining Plague turns (1–3) per plagued unit. */
  readonly turnsRemaining: ReadonlyMap<UnitId, number>;
  /**
   * Visible plagued units by their visible source Lich, only those with at
   * least two turns left (revision 15: curing a last turn saves just 2 HP).
   */
  readonly plaguedBySource: ReadonlyMap<UnitId, readonly UnitId[]>;
  /**
   * `pulp_wars-vkq.21`: every visible plagued unit by its visible source
   * Lich, whatever its remaining turns (the Lich is plaguing that owner).
   */
  readonly plagueSources: ReadonlyMap<UnitId, readonly UnitId[]>;
  /** Bitten units and the player their death would rise for. */
  readonly bitten: ReadonlyMap<UnitId, PlayerId>;
}

/** Revision 15 public Plague duration, re-exported for the policy. */
export { PLAGUE_DURATION_TURNS_V7 };

/** Revision 15: remaining Plague turns worth a cure or a Lich hunt. */
export const PLAGUE_TURNS_WORTH_CURING_V7 = 2;

export function publicAfflictionsV7(view: PlayerViewV7): PublicAfflictionsV7 {
  const plagued = new Set<UnitId>();
  const spreading = new Set<UnitId>();
  const turnsRemaining = new Map<UnitId, number>();
  const plaguedBySource = new Map<UnitId, UnitId[]>();
  const plagueSources = new Map<UnitId, UnitId[]>();
  for (const entry of view.plagued) {
    plagued.add(entry.unitId);
    turnsRemaining.set(entry.unitId, entry.turnsRemaining);
    if (entry.turnsRemaining >= PLAGUE_DURATION_TURNS_V7)
      spreading.add(entry.unitId);
    if (entry.sourceUnitId !== null) {
      const sourced = plagueSources.get(entry.sourceUnitId) ?? [];
      sourced.push(entry.unitId);
      plagueSources.set(entry.sourceUnitId, sourced);
    }
    if (
      entry.sourceUnitId === null ||
      entry.turnsRemaining < PLAGUE_TURNS_WORTH_CURING_V7
    )
      continue;
    const list = plaguedBySource.get(entry.sourceUnitId) ?? [];
    list.push(entry.unitId);
    plaguedBySource.set(entry.sourceUnitId, list);
  }
  const bitten = new Map<UnitId, PlayerId>();
  for (const entry of view.bitten)
    bitten.set(entry.unitId, entry.biterPlayerId);
  return {
    plagued,
    spreading,
    turnsRemaining,
    plaguedBySource,
    plagueSources,
    bitten,
  };
}

/**
 * One newly plagued hostile unit: 2 damage on each of its owner's next three
 * turns (revision 15), at most 6.
 */
export const PLAGUE_UNIT_VALUE_V7 = 8;
/** Each healthy living neighbour a new Plague may spread to next turn. */
export const PLAGUE_SPREAD_VALUE_V7 = 4;
/** A healthy own (or allied) living unit adjacent to a plagued unit. */
export const PLAGUE_EXPOSURE_COST_V7 = 12;
/** Each visible plagued living unit a Lich sources (killing it cures all). */
export const PLAGUE_SOURCE_TARGET_VALUE_V7 = 10;
/** A new bite on a hostile unit: its later death may rise as a Zombie. */
export const BITE_VALUE_V7 = 6;
/**
 * Tend Wounded cure values (in immediate-value units, 8 per HP). Revision 15:
 * a Plague cure is worth 10 per remaining Plague turn (30 for a fresh one).
 */
export const TEND_PLAGUE_CURE_VALUE_V7 = 30;
export const TEND_PLAGUE_TURN_CURE_VALUE_V7 =
  TEND_PLAGUE_CURE_VALUE_V7 / PLAGUE_DURATION_TURNS_V7;
export const TEND_BITTEN_CURE_VALUE_V7 = 14;

/**
 * Value of the Plague an attack newly applies (`preview.plagued`): each
 * hostile living victim is worth a few turns of damage plus its healthy
 * hostile living neighbours (spread next turn); spread onto the viewer's own
 * or allied living units (Cooperative allies) and plaguing a friendly unit
 * cost as much. Returns the value and the number of hostile victims.
 */
export function plagueApplicationValueV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
  newlyPlagued: readonly UnitId[],
  hostile: (ownerId: PlayerId) => boolean,
): { readonly value: number; readonly hostileVictims: number } {
  if (newlyPlagued.length === 0) return { value: 0, hostileVictims: 0 };
  const fresh = new Set(newlyPlagued);
  let value = 0;
  let hostileVictims = 0;
  for (const unitId of newlyPlagued) {
    const victim = view.units.find((unit) => unit.id === unitId);
    if (victim === undefined) continue;
    if (!hostile(victim.ownerId)) {
      value -= PLAGUE_UNIT_VALUE_V7 + PLAGUE_SPREAD_VALUE_V7;
      continue;
    }
    hostileVictims += 1;
    let hostileNeighbours = 0;
    let friendlyNeighbours = 0;
    for (const unit of view.units) {
      if (
        unit.id === victim.id ||
        chebyshev(unit.at, victim.at) !== 1 ||
        fresh.has(unit.id) ||
        afflictions.plagued.has(unit.id) ||
        !isLivingOwnerV7(view, unit.ownerId)
      )
        continue;
      if (hostile(unit.ownerId)) hostileNeighbours += 1;
      else friendlyNeighbours += 1;
    }
    value +=
      PLAGUE_UNIT_VALUE_V7 +
      PLAGUE_SPREAD_VALUE_V7 * Math.min(4, hostileNeighbours) -
      PLAGUE_EXPOSURE_COST_V7 * Math.min(4, friendlyNeighbours);
  }
  return { value, hostileVictims };
}

/**
 * Visible plagued units a Lich sources whose owner `counts` (for a living
 * viewer: its own and allied units; the Lich's death cures them all).
 * Revision 15: only victims with at least two Plague turns left count.
 */
export function plagueSourceVictimsV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
  lichId: UnitId,
  counts: (ownerId: PlayerId) => boolean,
): number {
  const victims = afflictions.plaguedBySource.get(lichId);
  if (victims === undefined) return 0;
  let total = 0;
  for (const unitId of victims) {
    const unit = view.units.find((item) => item.id === unitId);
    if (unit !== undefined && counts(unit.ownerId)) total += 1;
  }
  return total;
}

/**
 * Spreading plagued visible units adjacent to `at`, other than `excluded`. A
 * healthy living unit that ends its turn there is plagued at that plagued
 * unit's owner's next Start Turn (spread ignores ownership). Revision 15:
 * only a unit on its first plagued turn spreads, so older Plague is harmless
 * to stand next to.
 */
export function plaguedNeighboursV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
  at: CoordV7,
  excluded: UnitId,
): number {
  if (afflictions.spreading.size === 0) return 0;
  let total = 0;
  for (const unit of view.units)
    if (
      unit.id !== excluded &&
      afflictions.spreading.has(unit.id) &&
      chebyshev(unit.at, at) === 1
    )
      total += 1;
  return total;
}

/**
 * Healthy living units a plagued unit standing on `at` would spread to,
 * counting only units whose owner `counts` accepts.
 */
export function healthyLivingNeighboursV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
  at: CoordV7,
  excluded: UnitId,
  counts: (ownerId: PlayerId) => boolean,
): number {
  let total = 0;
  for (const unit of view.units)
    if (
      unit.id !== excluded &&
      chebyshev(unit.at, at) === 1 &&
      !afflictions.plagued.has(unit.id) &&
      isLivingOwnerV7(view, unit.ownerId) &&
      counts(unit.ownerId)
    )
      total += 1;
  return total;
}

/** A bite on `unitId` by `biterPlayerId` that is not already recorded. */
export function isNewBiteV7(
  afflictions: PublicAfflictionsV7,
  unitId: UnitId,
  biterPlayerId: PlayerId,
): boolean {
  return afflictions.bitten.get(unitId) !== biterPlayerId;
}

/** What an own Captain's Tend Wounded heals and cures. */
export interface TendValueV7 {
  readonly heal: number;
  readonly plagueCures: number;
  /** Revision 15: the remaining Plague turns those cures remove. */
  readonly plagueTurns: number;
  readonly bittenCures: number;
}

/**
 * Public Tend Wounded results of an own Captain standing on `at`, exactly as
 * `previewTendWoundedV7` computes them for the offered command (without
 * regenerating commands): adjacent own land units, other than the Captain
 * and not tended this turn, that are damaged, plagued, or bitten.
 */
export function publicTendValueV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
  captain: PublicUnitV7,
  at: CoordV7 = captain.at,
): TendValueV7 {
  let heal = 0;
  let plagueCures = 0;
  let plagueTurns = 0;
  let bittenCures = 0;
  for (const target of view.units) {
    if (
      target.ownerId !== captain.ownerId ||
      target.form !== "LAND" ||
      target.id === captain.id ||
      target.activation.tendedThisTurn ||
      chebyshev(target.at, at) !== 1
    )
      continue;
    const plagued = afflictions.plagued.has(target.id);
    const bitten = afflictions.bitten.has(target.id);
    if (target.hp >= target.maxHp && !plagued && !bitten) continue;
    heal += Math.min(2, target.maxHp - target.hp);
    plagueCures += Number(plagued);
    plagueTurns += afflictions.turnsRemaining.get(target.id) ?? 0;
    bittenCures += Number(bitten);
  }
  return { heal, plagueCures, plagueTurns, bittenCures };
}

// ---------------------------------------------------------------------------
// `pulp_wars-vkq.21`: hunting a plaguing Lich.

/** Hunters start within this many tiles of a firing position on the Lich. */
export const PLAGUE_HUNT_RADIUS_V7 = 6;

/**
 * Visible hostile Liches that source a visible plagued unit whose owner
 * `counts` (for a living viewer: its own and allied units), at any remaining
 * Plague turn: that Lich is plaguing the viewer's side.
 */
export function plaguingLichesV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
  hostile: (ownerId: PlayerId) => boolean,
  counts: (ownerId: PlayerId) => boolean,
): readonly PublicUnitV7[] {
  if (afflictions.plagueSources.size === 0) return [];
  return view.units.filter(
    (unit) =>
      hostile(unit.ownerId) &&
      isLichV7(view, unit) &&
      (afflictions.plagueSources.get(unit.id) ?? []).some((victimId) => {
        const victim = view.units.find((item) => item.id === victimId);
        return victim !== undefined && counts(victim.ownerId);
      }),
  );
}

/**
 * Tiles still to cover before a unit with attack range
 * `[minimumRange, maximumRange]` standing on `at` could fire at `target`:
 * 0 inside that band, else the Chebyshev distance to it.
 */
export function firingGapV7(
  at: CoordV7,
  target: CoordV7,
  minimumRange: number,
  maximumRange: number,
): number {
  const d = chebyshev(at, target);
  if (d > maximumRange) return d - maximumRange;
  if (d < minimumRange) return minimumRange - d;
  return 0;
}
