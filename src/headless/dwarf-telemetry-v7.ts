import type { PlayerId, UnitId } from "../engine/model/ids";
import { unitRoleMechanicsV7 } from "../engine/rules/ruleset-v7";
import { calculateCombatPreviewV7 } from "../engine/v7/combat";
import type { CommandV7 } from "../engine/v7/commands";
import { matchHasDwarvesV7 } from "../engine/v7/dwarf";
import type { CombatPreviewV7, DomainEventV7 } from "../engine/v7/events";
import {
  UNIT_ROLE_IDS_V7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../engine/v7/types";
import { allOwnedUnitsV7 } from "../engine/v7/units";

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 19.2): match
 * totals of every Dwarf ability, read from the canonical events and the
 * states around each accepted command. All zero in a match without a Dwarf
 * seat. The balance bead (`pulp_wars-78i.7`) reads the same events per seat.
 */
export interface DwarfMetricsV7 {
  /** `TUNNEL` commands, those with a rider, and the destination distances. */
  tunnels: number;
  tunnelsWithRider: number;
  tunnelDistanceTotal: number;
  /** Surfacings (one per Mole), those whose eruption hit, and the hits. */
  surfacings: number;
  eruptionsWithHits: number;
  eruptionVictims: number;
  eruptionDamage: number;
  eruptionShieldAbsorbed: number;
  eruptionKills: number;
  eruptionEggDamage: number;
  eruptionEggsDestroyed: number;
  underminedFieldDefense: number;
  /** Surfaced Moles and riders lost before their owner's next Start Turn. */
  surfacedLostNextEnemyTurn: number;
  /** Bombing runs, their damage, Shield absorption, kills, and targets. */
  bombRuns: number;
  bombDamage: number;
  bombShieldAbsorbed: number;
  bombKills: number;
  readonly bombTargetsByRole: Record<UnitRoleIdV7, number>;
  /** Gyrocopters lost before their owner's next Start Turn after a bomb. */
  gyrocoptersLostAfterBomb: number;
  /** Clockwork Gunner shots: unmoved and moved, and second shots. */
  gunnerShotsUnmoved: number;
  gunnerShotsMoved: number;
  gunnerSecondShots: number;
  /** Attacks whose attacker was Unflinching (a construct). */
  unflinchingAttacks: number;
  assembles: number;
  assembleCoins: number;
  /** Repairs (Dwarf `TEND_WOUNDED`) and the HP they restored, by target. */
  repairs: number;
  repairOnConstructs: number;
  repairOnOtherMachines: number;
  repairOnOthers: number;
  /** Attacks on dug-in units, the HP Dig In prevented, dug-in units killed. */
  digInAttacks: number;
  digInDamagePrevented: number;
  dugInKilled: number;
  /** Steam Cannon Knockbacks, blocked ones, and centers emptied. */
  knockbacks: number;
  knockbacksBlocked: number;
  knockbackCentersEmptied: number;
  /** Hits a Plated unit took that the cap lowered, and the HP prevented. */
  platedHits: number;
  platedDamagePrevented: number;
}

export interface DwarfTelemetryStateV7 {
  /** Surfaced units and bombing Gyrocopters, by owner, until its Start Turn. */
  readonly surfacedWatch: Map<UnitId, PlayerId>;
  readonly bomberWatch: Map<UnitId, PlayerId>;
}

export function createDwarfMetricsV7(): DwarfMetricsV7 {
  return {
    tunnels: 0,
    tunnelsWithRider: 0,
    tunnelDistanceTotal: 0,
    surfacings: 0,
    eruptionsWithHits: 0,
    eruptionVictims: 0,
    eruptionDamage: 0,
    eruptionShieldAbsorbed: 0,
    eruptionKills: 0,
    eruptionEggDamage: 0,
    eruptionEggsDestroyed: 0,
    underminedFieldDefense: 0,
    surfacedLostNextEnemyTurn: 0,
    bombRuns: 0,
    bombDamage: 0,
    bombShieldAbsorbed: 0,
    bombKills: 0,
    bombTargetsByRole: Object.fromEntries(
      UNIT_ROLE_IDS_V7.map((role) => [role, 0]),
    ) as Record<UnitRoleIdV7, number>,
    gyrocoptersLostAfterBomb: 0,
    gunnerShotsUnmoved: 0,
    gunnerShotsMoved: 0,
    gunnerSecondShots: 0,
    unflinchingAttacks: 0,
    assembles: 0,
    assembleCoins: 0,
    repairs: 0,
    repairOnConstructs: 0,
    repairOnOtherMachines: 0,
    repairOnOthers: 0,
    digInAttacks: 0,
    digInDamagePrevented: 0,
    dugInKilled: 0,
    knockbacks: 0,
    knockbacksBlocked: 0,
    knockbackCentersEmptied: 0,
    platedHits: 0,
    platedDamagePrevented: 0,
  };
}

export function createDwarfTelemetryStateV7(): DwarfTelemetryStateV7 {
  return { surfacedWatch: new Map(), bomberWatch: new Map() };
}

/** Records one accepted command (with its events) of a match. */
export function recordDwarfV7(
  before: GameStateV7,
  after: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  events: readonly DomainEventV7[],
  metrics: DwarfMetricsV7,
  telemetry: DwarfTelemetryStateV7,
): void {
  if (!matchHasDwarvesV7(before)) return;
  const unitById = (state: GameStateV7, id: UnitId): UnitStateV7 | undefined =>
    allOwnedUnitsV7(state).find((unit) => unit.id === id);
  if (command.kind === "TUNNEL") {
    metrics.tunnels += 1;
    if (command.rider !== null) metrics.tunnelsWithRider += 1;
    const mole = unitById(before, command.unitId);
    if (mole !== undefined)
      metrics.tunnelDistanceTotal += Math.max(
        Math.abs(mole.at.x - command.to.x),
        Math.abs(mole.at.y - command.to.y),
      );
  }
  if (command.kind === "ATTACK") {
    const attacker = unitById(before, command.unitId);
    const combat = events.find((event) => event.kind === "COMBAT_RESOLVED");
    if (attacker !== undefined && combat?.kind === "COMBAT_RESOLVED") {
      const preview = combat.preview;
      if (
        attacker.form === "LAND" &&
        unitRoleMechanicsV7(before, attacker).unmovedShots > 1
      ) {
        if (attacker.activation.moved) metrics.gunnerShotsMoved += 1;
        else metrics.gunnerShotsUnmoved += 1;
        if (attacker.activation.attacksUsed >= 1)
          metrics.gunnerSecondShots += 1;
      }
      if (preview.unflinchingApplied) metrics.unflinchingAttacks += 1;
      recordExchangeV7(before, preview, metrics);
      if (unitRoleMechanicsV7(before, attacker).knockback) {
        const pushed = events.find((event) => event.kind === "UNIT_PUSHED");
        if (pushed?.kind === "UNIT_PUSHED") {
          metrics.knockbacks += 1;
          if (before.cities.some((city) => same(city.at, pushed.from)))
            metrics.knockbackCentersEmptied += 1;
        } else if (!preview.defenderDies) metrics.knockbacksBlocked += 1;
      }
    }
  }
  for (const event of events) {
    if (event.kind === "UNIT_SURFACED") {
      metrics.surfacings += 1;
      if (event.results.length > 0) metrics.eruptionsWithHits += 1;
      telemetry.surfacedWatch.set(event.unitId, event.playerId);
      if (event.riderUnitId !== null)
        telemetry.surfacedWatch.set(event.riderUnitId, event.playerId);
      for (const entry of event.results) {
        metrics.eruptionVictims += 1;
        metrics.eruptionDamage += entry.damage;
        metrics.eruptionShieldAbsorbed += entry.shieldDamage;
        if (entry.dies) metrics.eruptionKills += 1;
        if (unitById(before, entry.unitId)?.form === "EGG") {
          metrics.eruptionEggDamage += entry.damage;
          if (entry.dies) metrics.eruptionEggsDestroyed += 1;
        }
      }
    }
    if (
      event.kind === "FIELD_DEFENSE_DESTROYED" &&
      event.reason === "UNDERMINED"
    )
      metrics.underminedFieldDefense += 1;
    if (event.kind === "UNIT_BOMBED") {
      metrics.bombRuns += 1;
      metrics.bombDamage += event.damage;
      metrics.bombShieldAbsorbed += event.shieldDamage;
      if (event.killed) metrics.bombKills += 1;
      const target = unitById(before, event.targetUnitId);
      if (target !== undefined) metrics.bombTargetsByRole[target.role] += 1;
      telemetry.bomberWatch.set(event.unitId, event.playerId);
    }
    if (event.kind === "UNIT_ASSEMBLED") {
      metrics.assembles += 1;
      metrics.assembleCoins += event.cost;
    }
    if (event.kind === "WOUNDED_TENDED") {
      const healer = unitById(before, event.captainId);
      if (
        healer === undefined ||
        unitRoleMechanicsV7(before, healer).repairMachineHeal === null
      )
        continue;
      metrics.repairs += 1;
      for (const result of event.results) {
        const target = unitById(before, result.unitId);
        if (target === undefined) continue;
        const mechanics = unitRoleMechanicsV7(before, target);
        if (mechanics.construct) metrics.repairOnConstructs += result.amount;
        else if (mechanics.repairsAsMachine)
          metrics.repairOnOtherMachines += result.amount;
        else metrics.repairOnOthers += result.amount;
      }
    }
    if (event.kind === "UNIT_DIED") {
      const owner = telemetry.surfacedWatch.get(event.unitId);
      if (owner !== undefined) {
        metrics.surfacedLostNextEnemyTurn += 1;
        telemetry.surfacedWatch.delete(event.unitId);
      }
      if (telemetry.bomberWatch.has(event.unitId)) {
        metrics.gyrocoptersLostAfterBomb += 1;
        telemetry.bomberWatch.delete(event.unitId);
      }
    }
    // A watch ends at its owner's next Start Turn.
    if (event.kind === "TURN_STARTED") {
      for (const [unitId, owner] of [...telemetry.surfacedWatch])
        if (owner === event.playerId && !surfacedNow(events, unitId))
          telemetry.surfacedWatch.delete(unitId);
      for (const [unitId, owner] of [...telemetry.bomberWatch])
        if (owner === event.playerId) telemetry.bomberWatch.delete(unitId);
    }
  }
  void actorId;
  void after;
}

/** Whether `unitId` surfaced in this batch of events (its watch starts). */
function surfacedNow(
  events: readonly DomainEventV7[],
  unitId: UnitId,
): boolean {
  return events.some(
    (event) =>
      event.kind === "UNIT_SURFACED" &&
      (event.unitId === unitId || event.riderUnitId === unitId),
  );
}

/** Dig In and Plated measurements of one attack. */
function recordExchangeV7(
  before: GameStateV7,
  preview: CombatPreviewV7,
  metrics: DwarfMetricsV7,
): void {
  if (preview.dugIn) {
    metrics.digInAttacks += 1;
    if (preview.defenderDies) metrics.dugInKilled += 1;
    const without = safePreview(before, preview, { ignoreDigIn: true });
    if (without !== null)
      metrics.digInDamagePrevented += Math.max(
        0,
        without.damageToDefender - preview.damageToDefender,
      );
  }
  if (preview.platedApplied) {
    metrics.platedHits += 1;
    const without = safePreview(before, preview, { ignorePlated: true });
    if (without !== null)
      metrics.platedDamagePrevented += Math.max(
        0,
        without.damageToDefender -
          preview.damageToDefender +
          (without.damageToAttacker - preview.damageToAttacker),
      );
  }
}

function safePreview(
  before: GameStateV7,
  preview: CombatPreviewV7,
  options: { readonly ignoreDigIn?: boolean; readonly ignorePlated?: boolean },
): CombatPreviewV7 | null {
  try {
    return calculateCombatPreviewV7(
      before,
      preview.attackerId,
      preview.targetUnitId,
      undefined,
      options,
    );
  } catch {
    return null;
  }
}

const same = (
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean => left.x === right.x && left.y === right.y;
