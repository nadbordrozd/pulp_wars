import type { PlayerId, UnitId } from "../engine/model/ids";
import { unitFactionV7 } from "../engine/rules/ruleset-v7";
import { matchHasCandyV7, unitIsCrashedV7 } from "../engine/v7/candy";
import type { CommandV7 } from "../engine/v7/commands";
import type { DomainEventV7 } from "../engine/v7/events";
import {
  UNIT_ROLE_IDS_V7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 19.2): match
 * totals of every Candy ability, read from the canonical events and the
 * states around each accepted command. All zero in a match without a Candy
 * seat. The balance bead (`pulp_wars-jdb.7`) reads the same events per seat.
 */
export interface CandyMetricsV7 {
  /** `SUGAR_RUSH` commands, by the role that Rushed. */
  rushes: number;
  readonly rushesByRole: Record<UnitRoleIdV7, number>;
  /** Attacks with the Rush bonus, and those among them that killed. */
  rushedAttacks: number;
  rushedAttackKills: number;
  /** Units the Crash step crashed, and those Home Sweet Home spared. */
  crashed: number;
  spared: number;
  /** Candy units that died while Crashed. */
  killedWhileCrashed: number;
  /** Crumbs left, eaten, gone stale, and re-baked (by role, with Coins). */
  crumbsLeft: number;
  crumbsEaten: number;
  crumbsStale: number;
  rebakes: number;
  rebakeCoins: number;
  readonly rebakesByRole: Record<UnitRoleIdV7, number>;
  /** Peppermint Surprise: HP and Shield damage dealt, and its kills. */
  peppermintDamage: number;
  peppermintKills: number;
  /** Attacks that Splatted their target, and strike-backs a Splat stopped. */
  splats: number;
  strikeBacksPrevented: number;
  /** Bounces, and Bounces a blocked tile prevented. */
  bounces: number;
  bouncesBlocked: number;
  /** Sugar Tosses and Frostings (a Candy unit's Tend Wounded), with HP. */
  sugarTosses: number;
  sugarTossHp: number;
  frostings: number;
  frostingHp: number;
  /** Sugar Frenzy: continuations granted, and the longest chain of attacks. */
  sugarFrenzyContinuations: number;
  sugarFrenzyLongestChain: number;
  /** Rushed Donut Racer attacks that granted Escape. */
  rushedEscapes: number;
}

export function createCandyMetricsV7(): CandyMetricsV7 {
  const byRole = (): Record<UnitRoleIdV7, number> =>
    Object.fromEntries(UNIT_ROLE_IDS_V7.map((role) => [role, 0])) as Record<
      UnitRoleIdV7,
      number
    >;
  return {
    rushes: 0,
    rushesByRole: byRole(),
    rushedAttacks: 0,
    rushedAttackKills: 0,
    crashed: 0,
    spared: 0,
    killedWhileCrashed: 0,
    crumbsLeft: 0,
    crumbsEaten: 0,
    crumbsStale: 0,
    rebakes: 0,
    rebakeCoins: 0,
    rebakesByRole: byRole(),
    peppermintDamage: 0,
    peppermintKills: 0,
    splats: 0,
    strikeBacksPrevented: 0,
    bounces: 0,
    bouncesBlocked: 0,
    sugarTosses: 0,
    sugarTossHp: 0,
    frostings: 0,
    frostingHp: 0,
    sugarFrenzyContinuations: 0,
    sugarFrenzyLongestChain: 0,
    rushedEscapes: 0,
  };
}

/** Records one accepted command (with its events) of a match. */
export function recordCandyV7(
  before: GameStateV7,
  _after: GameStateV7,
  _actorId: PlayerId,
  command: CommandV7,
  events: readonly DomainEventV7[],
  metrics: CandyMetricsV7,
): void {
  if (!matchHasCandyV7(before)) return;
  const unitBefore = (id: UnitId) =>
    before.units.find((unit) => unit.id === id);
  const isCandy = (id: UnitId): boolean => {
    const unit = unitBefore(id);
    return unit !== undefined && unitFactionV7(before, unit) === "CANDY";
  };
  if (command.kind === "SUGAR_RUSH") {
    const unit = unitBefore(command.unitId);
    metrics.rushes += 1;
    if (unit !== undefined) metrics.rushesByRole[unit.role] += 1;
  }
  for (const event of events) {
    if (event.kind === "UNITS_CRASHED") {
      metrics.crashed += event.crashedUnitIds.length;
      metrics.spared += event.sparedUnitIds.length;
    } else if (event.kind === "CRUMBS_LEFT") metrics.crumbsLeft += 1;
    else if (event.kind === "CRUMBS_STALE")
      metrics.crumbsStale += event.tiles.length;
    else if (event.kind === "CRUMBS_EATEN") {
      metrics.crumbsEaten += 1;
      metrics.peppermintDamage += event.damage + event.shieldDamage;
      if (event.dies) metrics.peppermintKills += 1;
    } else if (event.kind === "UNIT_REBAKED") {
      metrics.rebakes += 1;
      metrics.rebakeCoins += event.cost;
      metrics.rebakesByRole[event.role] += 1;
    } else if (event.kind === "SUGAR_TOSSED") {
      metrics.sugarTosses += 1;
      metrics.sugarTossHp += event.amount;
    } else if (event.kind === "WOUNDED_TENDED") {
      if (!isCandy(event.captainId)) continue;
      metrics.frostings += 1;
      metrics.frostingHp += event.results.reduce(
        (sum, result) => sum + result.amount,
        0,
      );
    } else if (event.kind === "UNIT_DIED") {
      if (isCandy(event.unitId) && unitIsCrashedV7(before, event.unitId))
        metrics.killedWhileCrashed += 1;
    } else if (event.kind === "COMBAT_RESOLVED") {
      const preview = event.preview;
      if (preview.sugarRushApplied) {
        metrics.rushedAttacks += 1;
        if (preview.defenderDies) metrics.rushedAttackKills += 1;
      }
      if (preview.splatApplied) metrics.splats += 1;
      if (preview.noRetaliationReason === "SPLATTED")
        metrics.strikeBacksPrevented += 1;
      if (preview.bounce === "WILL_BOUNCE") metrics.bounces += 1;
      else if (preview.bounce === "BLOCKED") metrics.bouncesBlocked += 1;
      if (isCandy(preview.attackerId)) {
        const attacker = unitBefore(preview.attackerId);
        if (attacker?.role === "KNIGHT" && preview.overrunAdvance) {
          if (preview.overrunContinues) metrics.sugarFrenzyContinuations += 1;
          metrics.sugarFrenzyLongestChain = Math.max(
            metrics.sugarFrenzyLongestChain,
            preview.attacksUsed,
          );
        }
        if (attacker?.role === "RAIDER" && preview.escapeAvailable)
          metrics.rushedEscapes += 1;
      }
    }
  }
}
