import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  REBAKE_OVER_CAPACITY_V7,
  REBAKE_REACH_V7,
  rebakePriceV7,
  unitFactionV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { matchHasCandyV7, unitIsCrashedV7 } from "../engine/v7/candy";
import { glazeStepAppliesV7 } from "../engine/v7/candy-abilities";
import { assignedUnitCountV7, cityUnitCapacityV7 } from "../engine/v7/economy";
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
  /** Sugar Tosses, with HP. */
  sugarTosses: number;
  sugarTossHp: number;
  /**
   * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md section
   * 15): Stuck and Toothache applied; Glaze steps used (a step onto a
   * Glazed tile at the Glaze's cost); Ricochet and Thump damage (HP and
   * Shield) and kills; Bunny hops; Top-Ups and the Crashes they ended;
   * Re-bakes by the distance scooped (0 to 2); and stale Crumbs by the
   * reason no Re-bake took them (no Confectioner within reach, its home
   * city full, the Coins, or the Confectioner busy elsewhere).
   */
  stuck: number;
  toothache: number;
  glazeSteps: number;
  ricochetDamage: number;
  ricochetKills: number;
  thumpDamage: number;
  thumpKills: number;
  hops: number;
  topUps: number;
  topUpCrashesEnded: number;
  readonly rebakesByDistance: [number, number, number];
  readonly staleCrumbsByReason: {
    noConfectioner: number;
    capacity: number;
    coins: number;
    busy: number;
  };
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
    stuck: 0,
    toothache: 0,
    glazeSteps: 0,
    ricochetDamage: 0,
    ricochetKills: 0,
    thumpDamage: 0,
    thumpKills: 0,
    hops: 0,
    topUps: 0,
    topUpCrashesEnded: 0,
    rebakesByDistance: [0, 0, 0],
    staleCrumbsByReason: { noConfectioner: 0, capacity: 0, coins: 0, busy: 0 },
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
  if (command.kind === "MOVE") {
    const unit = unitBefore(command.unitId);
    if (unit !== undefined) {
      let current = unit.at;
      let hopped = false;
      for (const step of command.path) {
        const distance = Math.max(
          Math.abs(step.x - current.x),
          Math.abs(step.y - current.y),
        );
        if (distance === 2) hopped = true;
        else if (glazeStepAppliesV7(before, unit, step))
          metrics.glazeSteps += 1;
        current = step;
      }
      if (hopped) metrics.hops += 1;
    }
  }
  if (command.kind === "REBAKE") {
    const unit = unitBefore(command.unitId);
    if (unit !== undefined) {
      const distance = Math.max(
        Math.abs(command.from.x - unit.at.x),
        Math.abs(command.from.y - unit.at.y),
      );
      if (distance <= 2) metrics.rebakesByDistance[distance as 0 | 1 | 2] += 1;
    }
  }
  for (const event of events) {
    if (event.kind === "UNITS_CRASHED") {
      metrics.crashed += event.crashedUnitIds.length;
      metrics.spared += event.sparedUnitIds.length;
    } else if (event.kind === "CRUMBS_LEFT") metrics.crumbsLeft += 1;
    else if (event.kind === "CRUMBS_STALE") {
      metrics.crumbsStale += event.tiles.length;
      for (const at of event.tiles) {
        const reason = staleCrumbsReasonV7(before, event.playerId, at);
        metrics.staleCrumbsByReason[reason] += 1;
      }
    } else if (event.kind === "UNIT_STUCK") metrics.stuck += 1;
    else if (event.kind === "TOOTHACHE_GIVEN") metrics.toothache += 1;
    else if (event.kind === "RICOCHETED") {
      metrics.ricochetDamage += event.damage + event.shieldDamage;
      if (event.dies) metrics.ricochetKills += 1;
    } else if (event.kind === "THUMPED") {
      for (const hit of event.hits) {
        metrics.thumpDamage += hit.damage + hit.shieldDamage;
        if (hit.dies) metrics.thumpKills += 1;
      }
    } else if (event.kind === "UNIT_TOPPED_UP") {
      metrics.topUps += 1;
      if (event.crashEnded) metrics.topUpCrashesEnded += 1;
    } else if (event.kind === "CRUMBS_EATEN") {
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
    }
  }
}

/**
 * The Candy redesign (section 15): why the Crumbs of `ownerId` on `at` went
 * stale at its End Turn, read from the state before it: no own
 * Confectioner within the Re-bake reach, each such Confectioner's home city
 * full (or none), the Coins, or else the Confectioner was busy.
 */
function staleCrumbsReasonV7(
  state: GameStateV7,
  ownerId: PlayerId,
  at: { readonly x: number; readonly y: number },
): keyof CandyMetricsV7["staleCrumbsByReason"] {
  const crumbs = state.crumbs.find(
    (entry) => entry.at.x === at.x && entry.at.y === at.y,
  );
  const confectioners = state.units.filter(
    (unit) =>
      unit.ownerId === ownerId &&
      unit.hp > 0 &&
      unit.form === "LAND" &&
      Math.max(Math.abs(unit.at.x - at.x), Math.abs(unit.at.y - at.y)) <=
        REBAKE_REACH_V7 &&
      unitRoleRuleV7(state, unit).abilities.includes("REBAKE"),
  );
  if (confectioners.length === 0) return "noConfectioner";
  const roomy = confectioners.some((unit) => {
    const home = state.cities.find(
      (city) => city.id === unit.homeCityId && city.ownerId === ownerId,
    );
    return (
      home !== undefined &&
      assignedUnitCountV7(state, home.id) <
        cityUnitCapacityV7(state, home) + REBAKE_OVER_CAPACITY_V7
    );
  });
  if (!roomy) return "capacity";
  const price = crumbs === undefined ? null : rebakePriceV7(crumbs.role);
  const coins = state.players.find((player) => player.id === ownerId)?.coins;
  if (price !== null && coins !== undefined && coins < price) return "coins";
  return "busy";
}
