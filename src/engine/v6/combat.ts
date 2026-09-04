import type { PlayerId, UnitId } from "../model/ids";
import { effectiveRoleRuleV6 } from "../rules/ruleset-v6";
import type { CombatTargetRefV6 } from "./commands";
import { arePlayersAlliedV6 } from "./economy";
import type { CombatPreviewV6 } from "./events";
import type { CoordV6, GameStateV6, UnitStateV6 } from "./types";
import { unitChargeAttackBonus2V6, unitDefenseModifierV6 } from "./unit-stats";

export interface DefenseBonusV6 {
  readonly numerator: 1 | 3 | 2 | 4;
  readonly denominator: 1 | 2;
}

const NO_BONUS: DefenseBonusV6 = { numerator: 1, denominator: 1 };

/** Greatest-single v6 defense bonus, with Breach applied by the caller. */
export function defenseBonusForUnitV6(
  state: GameStateV6,
  unit: UnitStateV6,
): DefenseBonusV6 {
  const modifier = unitDefenseModifierV6(state, unit);
  return modifier === null
    ? NO_BONUS
    : { numerator: modifier.numerator, denominator: modifier.denominator };
}

/**
 * Pure BigInt-backed half-unit combat calculation shared by reducer and public
 * preview. It consumes no PRNG and never uses host floating point.
 */
export function calculateCombatPreviewV6(
  state: GameStateV6,
  attackerId: UnitId,
  target: CombatTargetRefV6,
): CombatPreviewV6 {
  const attacker = state.units.find(
    (unit) => unit.id === attackerId && unit.hp > 0,
  );
  const defender =
    target.kind === "UNIT"
      ? state.units.find((unit) => unit.id === target.unitId && unit.hp > 0)
      : undefined;
  const wall =
    target.kind === "CHOCOLATE_WALL"
      ? state.chocolateWalls.find(
          (candidate) => candidate.id === target.wallId && candidate.hp > 0,
        )
      : undefined;
  if (
    attacker === undefined ||
    (defender === undefined && wall === undefined)
  ) {
    throw new RangeError("Combatant disappeared before preview");
  }
  const attackerOwner = requirePlayer(state, attacker.ownerId);
  const attackerRule = effectiveRoleRuleV6(
    attackerOwner.faction,
    attacker.role,
  );
  const targetAt = defender?.at ?? wall?.at;
  const targetHp = defender?.hp ?? wall?.hp;
  if (targetAt === undefined || targetHp === undefined) {
    throw new RangeError("Combat target disappeared before preview");
  }
  const distance = chebyshev(attacker.at, targetAt);
  const chargeBonus2 = unitChargeAttackBonus2V6(attackerRule, attacker);
  const chargeApplied = distance === 1 && chargeBonus2 > 0;
  const attack2 = attackerRule.attack2 + (chargeApplied ? chargeBonus2 : 0);
  const breachApplied =
    defender !== undefined &&
    distance === 1 &&
    attackerRule.abilities.includes("BREACH");
  const ordinaryBonus =
    defender === undefined ? NO_BONUS : defenseBonusForUnitV6(state, defender);
  const bonus = breachApplied ? NO_BONUS : ordinaryBonus;
  const defenderRule =
    defender === undefined
      ? null
      : effectiveRoleRuleV6(
          requirePlayer(state, defender.ownerId).faction,
          defender.role,
        );

  // Forces omit their common factor 1/2. Cross multiplication keeps every
  // intermediate exact; damage's additional factor is attack2*9/4.
  const attackForceNumerator = BigInt(attack2) * BigInt(attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defenderRule?.defense2 ?? 0) *
    BigInt(targetHp) *
    BigInt(bonus.numerator);
  const defenseForceDenominator =
    2n * BigInt(defender?.maxHp ?? 10) * BigInt(bonus.denominator);
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const totalOnCommon = attackOnCommon + defenseOnCommon;
  if (totalOnCommon <= 0n) throw new RangeError("INVALID_STATE");
  const rawDefenderDamage = roundHalfUpBigInt(
    attackOnCommon * BigInt(attack2) * 9n,
    totalOnCommon * 4n,
  );
  const rawAttackerDamage =
    defenderRule === null
      ? 0
      : roundHalfUpBigInt(
          defenseOnCommon * BigInt(defenderRule.defense2) * 9n,
          totalOnCommon * 4n,
        );
  const damageToDefender = Math.min(targetHp, rawDefenderDamage);
  const defenderDies = damageToDefender >= targetHp;
  const noRetaliationReason: CombatPreviewV6["noRetaliationReason"] =
    wall !== undefined
      ? "STRUCTURE"
      : defenderDies
        ? "DEFENDER_DIED"
        : distance > (defenderRule?.range ?? 0)
          ? "OUT_OF_RANGE"
          : null;
  const damageToAttacker =
    noRetaliationReason === null ? Math.min(attacker.hp, rawAttackerDamage) : 0;
  const attackerDies = damageToAttacker >= attacker.hp;
  const advances =
    defenderDies &&
    !attackerDies &&
    distance === 1 &&
    (wall === undefined ||
      canEnterDestroyedWallCell(state, attacker, targetAt));
  const push = pushStateV6(
    state,
    attacker,
    defender,
    attackerRule.abilities.includes("PUSH") && distance === 1 && !defenderDies,
  );
  return {
    attackerId,
    target,
    attack2,
    chargeApplied,
    defenseBonusNumerator: bonus.numerator,
    defenseBonusDenominator: bonus.denominator,
    breachApplied,
    push,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    advances,
    noRetaliationReason,
  };
}

export function pushedDestinationV6(
  state: GameStateV6,
  attacker: UnitStateV6,
  defender: UnitStateV6,
): CoordV6 | null {
  const destination = {
    x: defender.at.x + (defender.at.x - attacker.at.x),
    y: defender.at.y + (defender.at.y - attacker.at.y),
  };
  const tile = tileAt(state, destination);
  if (tile === undefined) return null;
  const attackerOwner = requirePlayer(state, attacker.ownerId);
  if (!attackerOwner.explored.some((at) => sameCoord(at, destination))) {
    return null;
  }
  const defenderOwner = requirePlayer(state, defender.ownerId);
  if (
    tile.site !== null ||
    (tile.terrain === "MOUNTAIN" &&
      !defenderOwner.researchedTechs.includes("SURVEYING")) ||
    state.units.some(
      (unit) =>
        unit.id !== defender.id &&
        unit.hp > 0 &&
        sameCoord(unit.at, destination),
    ) ||
    state.chocolateWalls.some((wall) => sameCoord(wall.at, destination))
  ) {
    return null;
  }
  const territoryOwner =
    tile.territoryCityId === null
      ? null
      : (state.cities.find((city) => city.id === tile.territoryCityId)
          ?.ownerId ?? null);
  return territoryOwner !== null &&
    arePlayersAlliedV6(state, defender.ownerId, territoryOwner)
    ? null
    : destination;
}

function pushStateV6(
  state: GameStateV6,
  attacker: UnitStateV6,
  defender: UnitStateV6 | undefined,
  applicable: boolean,
): CombatPreviewV6["push"] {
  if (!applicable || defender === undefined) return "BLOCKED";
  const behind = {
    x: defender.at.x + (defender.at.x - attacker.at.x),
    y: defender.at.y + (defender.at.y - attacker.at.y),
  };
  if (tileAt(state, behind) === undefined) return "BLOCKED";
  const owner = requirePlayer(state, attacker.ownerId);
  if (!owner.explored.some((at) => sameCoord(at, behind))) {
    return "UNKNOWN_BEHIND_FOG";
  }
  return pushedDestinationV6(state, attacker, defender) === null
    ? "BLOCKED"
    : "WILL_PUSH";
}

function canEnterDestroyedWallCell(
  state: GameStateV6,
  attacker: UnitStateV6,
  at: CoordV6,
): boolean {
  const player = requirePlayer(state, attacker.ownerId);
  const tile = tileAt(state, at);
  if (
    tile === undefined ||
    (tile.terrain === "MOUNTAIN" &&
      !player.researchedTechs.includes("SURVEYING")) ||
    state.units.some(
      (unit) =>
        unit.id !== attacker.id && unit.hp > 0 && sameCoord(unit.at, at),
    )
  ) {
    return false;
  }
  const owner =
    tile.territoryCityId === null
      ? null
      : (state.cities.find((city) => city.id === tile.territoryCityId)
          ?.ownerId ?? null);
  return owner === null || !arePlayersAlliedV6(state, attacker.ownerId, owner);
}

function roundHalfUpBigInt(numerator: bigint, denominator: bigint): number {
  if (numerator < 0n || denominator <= 0n) {
    throw new RangeError("roundHalfUp requires a non-negative fraction");
  }
  const rounded = (2n * numerator + denominator) / (2n * denominator);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("INTEGER_OVERFLOW");
  }
  return Number(rounded);
}

function requirePlayer(state: GameStateV6, id: PlayerId) {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player;
}

function tileAt(state: GameStateV6, at: CoordV6) {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= state.board.width ||
    at.y >= state.board.height
  ) {
    return undefined;
  }
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return tile !== undefined && sameCoord(tile.at, at) ? tile : undefined;
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
