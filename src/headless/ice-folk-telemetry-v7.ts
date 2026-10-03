import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { calculateCombatPreviewV7 } from "../engine/v7/combat";
import type { CommandV7 } from "../engine/v7/commands";
import { arePlayersHostileV7 } from "../engine/v7/economy";
import type { DomainEventV7 } from "../engine/v7/events";
import { deathCreatesGraveV7 } from "../engine/v7/graves";
import {
  coldSnapTargetsV7,
  isIceFolkLandUnitV7,
  matchHasIceFolkV7,
  winterV7,
} from "../engine/v7/ice-folk";
import { isExplodingUnitV7 } from "../engine/v7/explosions";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import { isUnitVisibleToPlayerV7 } from "../engine/v7/observation";

/**
 * The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md section 16.2):
 * match totals of every Ice Folk mechanic, read from the canonical events
 * and the states around each accepted command. All zero in a match without
 * an Ice Folk seat. The per-seat balance matrix (`pulp_wars-7g3.7`) replays
 * the accepted command log and reads the same events.
 */
export interface IceFolkMetricsV7 {
  /** `UNITS_CHILLED` events and the units they chilled, by source. */
  readonly chillEvents: Record<ChillSourceV7, number>;
  readonly chillApplications: Record<ChillSourceV7, number>;
  /** Applications that were a new freeze (no prior entry) or a re-application. */
  newFreezes: number;
  reapplications: number;
  readonly chillTargetsByFaction: Record<FactionIdV7, number>;
  readonly chillTargetsByRole: Record<UnitRoleIdV7, number>;
  /** Owner turns that ended with a unit sluggish, and those without a primary action. */
  sluggishTurns: number;
  sluggishTurnsWithoutAction: number;
  /** Tend Wounded cures of Chill. */
  tendCures: number;
  shatters: number;
  readonly shattersByAttackerRole: Record<UnitRoleIdV7, number>;
  readonly shattersByVictimFaction: Record<FactionIdV7, number>;
  readonly shattersByVictimRole: Record<UnitRoleIdV7, number>;
  /** Which source last chilled the shattered unit. */
  readonly shattersByChillSource: Record<ChillSourceV7 | "UNKNOWN", number>;
  /** What brought the victim into the window (section 16.2). */
  readonly shattersBySetup: Record<ShatterSetupV7, number>;
  /** Retaliation the Shatter prevented (the exchange without the rule). */
  shatterRetaliationAvoided: number;
  shatterGravesDenied: number;
  shatterBlastsDenied: number;
  /** Bolas throws, by target role, and those shattered by the thrower's seat within its next turn. */
  bolasThrows: number;
  readonly bolasTargetsByRole: Record<UnitRoleIdV7, number>;
  bolasFollowedByShatter: number;
  /** Cold Snap casts and targets; Witch turns without a target or near allies. */
  coldSnapCasts: number;
  coldSnapTargets: number;
  witchTurnsWithoutTarget: number;
  witchTurnsNearAllies: number;
  witchDeaths: number;
  readonly witchDeathRounds: number[];
  readonly witchKillersByRole: Record<UnitRoleIdV7 | "OTHER", number>;
  sledDeaths: number;
  /** Sweep attacks by flank victims (0, 1, 2), flank damage and kills; trampled Field Defense. */
  sweepAttacks: number;
  readonly sweepAttacksByVictims: [number, number, number];
  sweepFlankDamage: number;
  sweepFlankKills: number;
  trampledFieldDefense: number;
  rockfallShots: number;
  rockfallDamage: number;
  rockfallKills: number;
  /** Moves of Mountain-born units onto, and through, a Mountain without Engineering. */
  mountainEntriesWithoutEngineering: number;
  mountainCrossings: number;
  /** Attacks halved by a Blizzard, the damage prevented, by attacker role. */
  blizzardHalvedAttacks: number;
  blizzardDamagePrevented: number;
  readonly blizzardHalvedByAttackerRole: Record<UnitRoleIdV7, number>;
  /** Attacks on an Ice Folk unit with Snow cover, and the damage it prevented. */
  snowCoverAttacks: number;
  snowCoverDamagePrevented: number;
  /** Moves longer than the unit's Move (Glide); other factions' Moves stopped on Snow. */
  glideMoves: number;
  deepSnowStoppedMoves: number;
  /** Snow tiles at each Ice Folk End Turn. */
  snowTilesAtEndTurnTotal: number;
  snowTilesAtEndTurnMaximum: number;
  boulderThrowsPlanted: number;
  boulderThrowsMoved: number;
  boulderDamage: number;
  boulderFortificationIgnored: number;
  boulderFieldDefenseDestroyed: number;
  /** Sabretooth Moves that entered a zone of control and continued; its kills by victim role. */
  prowlMovesThroughZoc: number;
  readonly sabretoothKillsByRole: Record<UnitRoleIdV7, number>;
}

export type ChillSourceV7 = "BOLAS" | "COLD_SNAP" | "COLD_AURA";
export type ShatterSetupV7 =
  | "CHARGE_AT_FULL_HP"
  | "SWEEP_FLANK"
  | "SNOW_HUNTER"
  | "BOULDER"
  | "YETI"
  | "OTHER_HIT"
  | "EARLIER_DAMAGE";

const CHILL_SOURCES_V7: readonly ChillSourceV7[] = [
  "BOLAS",
  "COLD_SNAP",
  "COLD_AURA",
];
const SHATTER_SETUPS_V7: readonly ShatterSetupV7[] = [
  "CHARGE_AT_FULL_HP",
  "SWEEP_FLANK",
  "SNOW_HUNTER",
  "BOULDER",
  "YETI",
  "OTHER_HIT",
  "EARLIER_DAMAGE",
];

export function createIceFolkMetricsV7(): IceFolkMetricsV7 {
  return {
    chillEvents: zero(CHILL_SOURCES_V7),
    chillApplications: zero(CHILL_SOURCES_V7),
    newFreezes: 0,
    reapplications: 0,
    chillTargetsByFaction: zero(FACTION_IDS_V7),
    chillTargetsByRole: zero(UNIT_ROLE_IDS_V7),
    sluggishTurns: 0,
    sluggishTurnsWithoutAction: 0,
    tendCures: 0,
    shatters: 0,
    shattersByAttackerRole: zero(UNIT_ROLE_IDS_V7),
    shattersByVictimFaction: zero(FACTION_IDS_V7),
    shattersByVictimRole: zero(UNIT_ROLE_IDS_V7),
    shattersByChillSource: zero([...CHILL_SOURCES_V7, "UNKNOWN"] as const),
    shattersBySetup: zero(SHATTER_SETUPS_V7),
    shatterRetaliationAvoided: 0,
    shatterGravesDenied: 0,
    shatterBlastsDenied: 0,
    bolasThrows: 0,
    bolasTargetsByRole: zero(UNIT_ROLE_IDS_V7),
    bolasFollowedByShatter: 0,
    coldSnapCasts: 0,
    coldSnapTargets: 0,
    witchTurnsWithoutTarget: 0,
    witchTurnsNearAllies: 0,
    witchDeaths: 0,
    witchDeathRounds: [],
    witchKillersByRole: zero([...UNIT_ROLE_IDS_V7, "OTHER"] as const),
    sledDeaths: 0,
    sweepAttacks: 0,
    sweepAttacksByVictims: [0, 0, 0],
    sweepFlankDamage: 0,
    sweepFlankKills: 0,
    trampledFieldDefense: 0,
    rockfallShots: 0,
    rockfallDamage: 0,
    rockfallKills: 0,
    mountainEntriesWithoutEngineering: 0,
    mountainCrossings: 0,
    blizzardHalvedAttacks: 0,
    blizzardDamagePrevented: 0,
    blizzardHalvedByAttackerRole: zero(UNIT_ROLE_IDS_V7),
    snowCoverAttacks: 0,
    snowCoverDamagePrevented: 0,
    glideMoves: 0,
    deepSnowStoppedMoves: 0,
    snowTilesAtEndTurnTotal: 0,
    snowTilesAtEndTurnMaximum: 0,
    boulderThrowsPlanted: 0,
    boulderThrowsMoved: 0,
    boulderDamage: 0,
    boulderFortificationIgnored: 0,
    boulderFieldDefenseDestroyed: 0,
    prowlMovesThroughZoc: 0,
    sabretoothKillsByRole: zero(UNIT_ROLE_IDS_V7),
  };
}

/** Telemetry state carried between commands. */
export interface IceFolkTelemetryStateV7 {
  /** The source that last chilled each unit. */
  readonly lastChillSource: Map<UnitId, ChillSourceV7>;
  /** The last Bolas on each unit: the throwing seat and the round. */
  readonly bolas: Map<
    UnitId,
    { readonly playerId: PlayerId; readonly round: number }
  >;
  /** What last hurt each unit during the current turn. */
  readonly hitThisTurn: Map<UnitId, ShatterSetupV7>;
}

export function createIceFolkTelemetryStateV7(): IceFolkTelemetryStateV7 {
  return {
    lastChillSource: new Map(),
    bolas: new Map(),
    hitThisTurn: new Map(),
  };
}

/** Records one accepted command (match totals; zero without an Ice Folk seat). */
export function recordIceFolkV7(
  before: GameStateV7,
  after: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  events: readonly DomainEventV7[],
  metrics: IceFolkMetricsV7,
  telemetry: IceFolkTelemetryStateV7,
): void {
  if (!matchHasIceFolkV7(before)) return;
  const unitById = (state: GameStateV7, id: UnitId | null) =>
    id === null ? undefined : state.units.find((unit) => unit.id === id);
  const faction = (state: GameStateV7, playerId: PlayerId): FactionIdV7 =>
    state.players.find((player) => player.id === playerId)?.faction ??
    "ORIGINAL";
  const actorUnit =
    "unitId" in command ? unitById(before, command.unitId) : undefined;

  // Moves: Glide, deep snow, Mountains, and Prowl.
  if (command.kind === "MOVE" && actorUnit !== undefined) {
    const moved = events.find((event) => event.kind === "UNIT_MOVED");
    const path = moved?.kind === "UNIT_MOVED" ? moved.path : [];
    const rule = unitRoleRuleV7(before, actorUnit);
    const mechanics = unitRoleMechanicsV7(before, actorUnit);
    const engineering =
      before.players
        .find((player) => player.id === actorId)
        ?.researchedTechs.includes("ENGINEERING") === true;
    if (isIceFolkLandUnitV7(before, actorUnit)) {
      if (path.length > rule.move) metrics.glideMoves += 1;
      if (mechanics.mountainBorn && !engineering) {
        const mountains = path.filter(
          (at) => tileAt(before, at)?.terrain === "MOUNTAIN",
        );
        if (mountains.length > 0)
          metrics.mountainEntriesWithoutEngineering += 1;
        if (
          path
            .slice(0, -1)
            .some((at) => tileAt(before, at)?.terrain === "MOUNTAIN")
        )
          metrics.mountainCrossings += 1;
      }
      if (
        mechanics.ignoresZocStops &&
        path
          .slice(0, -1)
          .some((at) =>
            before.units.some(
              (unit) =>
                unit.hp > 0 &&
                unit.form === "LAND" &&
                arePlayersHostileV7(before, actorId, unit.ownerId) &&
                chebyshev(unit.at, at) === 1,
            ),
          )
      )
        metrics.prowlMovesThroughZoc += 1;
    } else if (
      actorUnit.form === "LAND" &&
      mechanics.movementMode === "GROUND" &&
      path.length > 0 &&
      path.length < rule.move &&
      winterV7(before).snow.has(
        indexOf(before, path[path.length - 1] as CoordV7),
      )
    )
      metrics.deepSnowStoppedMoves += 1;
  }

  for (const event of events) {
    if (event.kind === "UNITS_CHILLED") {
      metrics.chillEvents[event.source] += 1;
      metrics.chillApplications[event.source] += event.results.length;
      if (event.source === "BOLAS") metrics.bolasThrows += 1;
      if (event.source === "COLD_SNAP") {
        metrics.coldSnapCasts += 1;
        metrics.coldSnapTargets += event.results.length;
      }
      for (const result of event.results) {
        const target = unitById(before, result.unitId);
        const prior = before.chilled.some(
          (entry) => entry.unitId === result.unitId,
        );
        if (prior) metrics.reapplications += 1;
        else metrics.newFreezes += 1;
        if (target !== undefined) {
          metrics.chillTargetsByFaction[faction(before, target.ownerId)] += 1;
          metrics.chillTargetsByRole[target.role] += 1;
          if (event.source === "BOLAS") {
            metrics.bolasTargetsByRole[target.role] += 1;
            telemetry.bolas.set(target.id, {
              playerId: event.playerId,
              round: before.round,
            });
          }
        }
        telemetry.lastChillSource.set(result.unitId, event.source);
      }
    }
    if (event.kind === "WOUNDED_TENDED")
      metrics.tendCures += event.results.filter(
        (result) => result.curedChill,
      ).length;
    if (event.kind === "FIELD_DEFENSE_DESTROYED" && event.reason === "TRAMPLE")
      metrics.trampledFieldDefense += 1;
    if (event.kind === "COMBAT_RESOLVED")
      recordCombat(before, actorId, event.preview, metrics, telemetry);
    if (event.kind === "UNIT_DIED") {
      const unit = unitById(before, event.unitId);
      if (unit === undefined || !isIceFolkLandUnitV7(before, unit)) continue;
      const rule = unitRoleRuleV7(before, unit);
      if (rule.abilities.includes("BLIZZARD")) {
        metrics.witchDeaths += 1;
        metrics.witchDeathRounds.push(before.round);
        const combat = events.find((item) => item.kind === "COMBAT_RESOLVED");
        const killer =
          combat?.kind === "COMBAT_RESOLVED"
            ? unitById(
                before,
                combat.preview.targetUnitId === unit.id
                  ? combat.preview.attackerId
                  : combat.preview.targetUnitId,
              )
            : undefined;
        metrics.witchKillersByRole[killer?.role ?? "OTHER"] += 1;
      }
      if (rule.abilities.includes("BOLAS")) metrics.sledDeaths += 1;
    }
  }

  if (command.kind === "END_TURN") {
    // Sluggish turns (the countdown runs at this End Turn).
    for (const entry of before.chilled) {
      const unit = unitById(before, entry.unitId);
      if (unit === undefined || unit.ownerId !== actorId || !entry.sluggish)
        continue;
      metrics.sluggishTurns += 1;
      if (
        !unit.activation.attacked &&
        !unit.activation.specialActed &&
        !unit.activation.recovered &&
        !unit.activation.captured
      )
        metrics.sluggishTurnsWithoutAction += 1;
    }
    if (faction(before, actorId) === "ICE_FOLK") {
      const snow = winterV7(before).snow.size;
      metrics.snowTilesAtEndTurnTotal += snow;
      metrics.snowTilesAtEndTurnMaximum = Math.max(
        metrics.snowTilesAtEndTurnMaximum,
        snow,
      );
      for (const witch of before.units) {
        if (
          witch.ownerId !== actorId ||
          witch.hp <= 0 ||
          witch.form !== "LAND" ||
          !unitRoleRuleV7(before, witch).abilities.includes("COLD_SNAP")
        )
          continue;
        if (
          !witch.activation.specialActed &&
          coldSnapTargetsV7(
            before,
            witch,
            before.units.filter((unit) =>
              isUnitVisibleToPlayerV7(before, actorId, unit),
            ),
          ).length === 0
        )
          metrics.witchTurnsWithoutTarget += 1;
        if (
          before.units.filter(
            (unit) =>
              unit.id !== witch.id &&
              unit.ownerId === actorId &&
              unit.form === "LAND" &&
              chebyshev(unit.at, witch.at) === 1,
          ).length >= 2
        )
          metrics.witchTurnsNearAllies += 1;
      }
    }
    telemetry.hitThisTurn.clear();
  }
  for (const unitId of [...telemetry.lastChillSource.keys()])
    if (!after.units.some((unit) => unit.id === unitId))
      telemetry.lastChillSource.delete(unitId);
}

function recordCombat(
  before: GameStateV7,
  actorId: PlayerId,
  preview: Extract<DomainEventV7, { kind: "COMBAT_RESOLVED" }>["preview"],
  metrics: IceFolkMetricsV7,
  telemetry: IceFolkTelemetryStateV7,
): void {
  const attacker = before.units.find((unit) => unit.id === preview.attackerId);
  const defender = before.units.find(
    (unit) => unit.id === preview.targetUnitId,
  );
  if (attacker === undefined || defender === undefined) return;
  const attackerRule = unitRoleRuleV7(before, attacker);
  const attackerMechanics = unitRoleMechanicsV7(before, attacker);
  const without = (options: {
    readonly ignoreBlizzard?: boolean;
    readonly ignoreSnowCover?: boolean;
    readonly ignoreShatter?: boolean;
  }) =>
    calculateCombatPreviewV7(
      before,
      attacker.id,
      defender.id,
      undefined,
      options,
    );
  if (preview.shatters) {
    metrics.shatters += 1;
    metrics.shattersByAttackerRole[attacker.role] += 1;
    metrics.shattersByVictimFaction[
      before.players.find((player) => player.id === defender.ownerId)
        ?.faction ?? "ORIGINAL"
    ] += 1;
    metrics.shattersByVictimRole[defender.role] += 1;
    metrics.shattersByChillSource[
      telemetry.lastChillSource.get(defender.id) ?? "UNKNOWN"
    ] += 1;
    metrics.shattersBySetup[
      preview.chargeApplied && defender.hp === defender.maxHp
        ? "CHARGE_AT_FULL_HP"
        : (telemetry.hitThisTurn.get(defender.id) ?? "EARLIER_DAMAGE")
    ] += 1;
    const plain = without({ ignoreShatter: true });
    metrics.shatterRetaliationAvoided +=
      plain.damageToAttacker + plain.attackerShieldDamage;
    if (
      !preview.defenderBittenRises &&
      deathCreatesGraveV7(before, before.graves, defender)
    )
      metrics.shatterGravesDenied += 1;
    if (isExplodingUnitV7(before, defender)) metrics.shatterBlastsDenied += 1;
    const throwBy = telemetry.bolas.get(defender.id);
    if (
      throwBy !== undefined &&
      throwBy.playerId === actorId &&
      before.round <= throwBy.round + 1
    )
      metrics.bolasFollowedByShatter += 1;
  }
  if (preview.sweep) {
    metrics.sweepAttacks += 1;
    const victims = Math.min(2, preview.splash.length) as 0 | 1 | 2;
    metrics.sweepAttacksByVictims[victims] += 1;
    for (const entry of preview.splash) {
      metrics.sweepFlankDamage += entry.damage;
      metrics.sweepFlankKills += Number(entry.dies);
      if (!entry.dies) telemetry.hitThisTurn.set(entry.unitId, "SWEEP_FLANK");
    }
  }
  if (preview.rockfallApplied) {
    metrics.rockfallShots += 1;
    metrics.rockfallDamage += preview.damageToDefender;
    metrics.rockfallKills += Number(preview.defenderDies);
  }
  if (attackerMechanics.ignoresFortification && attacker.form === "LAND") {
    if (preview.plantedApplied) metrics.boulderThrowsPlanted += 1;
    else metrics.boulderThrowsMoved += 1;
    metrics.boulderDamage += preview.damageToDefender;
    metrics.boulderFortificationIgnored += preview.fortificationIgnored;
    const tile = tileAt(before, defender.at);
    if (tile?.fieldDefense === true) metrics.boulderFieldDefenseDestroyed += 1;
  }
  if (preview.blizzardHalved) {
    metrics.blizzardHalvedAttacks += 1;
    metrics.blizzardHalvedByAttackerRole[attacker.role] += 1;
    const full = without({ ignoreBlizzard: true });
    metrics.blizzardDamagePrevented += Math.max(
      0,
      full.damageToDefender +
        full.defenderShieldDamage -
        preview.damageToDefender -
        preview.defenderShieldDamage,
    );
  }
  if (preview.snowCover) {
    metrics.snowCoverAttacks += 1;
    const open = without({ ignoreSnowCover: true });
    metrics.snowCoverDamagePrevented += Math.max(
      0,
      open.damageToDefender +
        open.defenderShieldDamage -
        preview.damageToDefender -
        preview.defenderShieldDamage,
    );
  }
  if (
    preview.defenderDies &&
    attackerRule.abilities.includes("PROWL") &&
    attacker.form === "LAND"
  )
    metrics.sabretoothKillsByRole[defender.role] += 1;
  // What this hit leaves for a later Shatter this turn.
  if (
    !preview.defenderDies &&
    preview.damageToDefender > 0 &&
    isIceFolkLandUnitV7(before, attacker)
  )
    telemetry.hitThisTurn.set(
      defender.id,
      attackerRule.abilities.includes("COLD_BLOOD")
        ? "SNOW_HUNTER"
        : attackerMechanics.ignoresFortification
          ? "BOULDER"
          : attackerRule.abilities.includes("ROCKFALL")
            ? "YETI"
            : "OTHER_HIT",
    );
}

function tileAt(state: GameStateV7, at: CoordV7) {
  return state.board.tiles[indexOf(state, at)];
}
function indexOf(state: GameStateV7, at: CoordV7): number {
  return at.y * state.board.width + at.x;
}
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
function zero<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<
    T,
    number
  >;
}
