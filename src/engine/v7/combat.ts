import type { PlayerId, UnitId } from "../model/ids";
import { effectiveRoleRuleV7 } from "../rules/ruleset-v7";
import { arePlayersAlliedV7, arePlayersHostileV7 } from "./economy";
import type { CombatPreviewV7 } from "./events";
import { tileAtV7 } from "./spatial-economy";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";

export interface DefenseBonusV7 {
  readonly numerator: 1 | 3 | 2 | 4;
  readonly denominator: 1 | 2;
}
const NO_BONUS: DefenseBonusV7 = { numerator: 1, denominator: 1 };

export function defenseBonusForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
): DefenseBonusV7 {
  if (unit.form !== "LAND") return NO_BONUS;
  const terrain = tileAtV7(state.board, unit.at)?.terrain;
  return terrain === "FOREST" || terrain === "MOUNTAIN"
    ? { numerator: 3, denominator: 2 }
    : NO_BONUS;
}

export function fortificationLevelForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
): number {
  if (unit.form !== "LAND") return 0;
  const tile = tileAtV7(state.board, unit.at);
  if (tile === undefined || tile.territoryCityId === null) return 0;
  const territoryCity = state.cities.find(
    (city) => city.id === tile.territoryCityId,
  );
  if (territoryCity?.ownerId !== unit.ownerId) return 0;
  const city = state.cities.find(
    (candidate) =>
      candidate.id === tile.territoryCityId && same(candidate.at, unit.at),
  );
  let level = tile.fieldDefense ? 1 : 0;
  if (city !== undefined) {
    if (
      city.rewards.some(
        (record) => record.reachedLevel === 3 && record.reward === "WALLS",
      )
    )
      level += 2;
  }
  return level;
}

/** Exact BigInt-backed v7 combat calculation used by resolution and queries. */
export function calculateCombatPreviewV7(
  state: GameStateV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
): CombatPreviewV7 {
  const attacker = requireUnit(state, attackerId);
  const defender = requireUnit(state, targetUnitId);
  const attackerRule = effectiveRoleRuleV7(attacker.role);
  const defenderRule = effectiveRoleRuleV7(defender.role);
  const distance = chebyshev(attacker.at, defender.at);
  const chargeApplied =
    requirePlayer(state, attacker.ownerId).researchedTechs.includes(
      "RAIDING",
    ) &&
    attackerRule.abilities.includes("CHARGE") &&
    distance === 1 &&
    attacker.activation.moved &&
    attacker.activation.movedPathLength >= 2 &&
    attacker.activation.attacksUsed === 0;
  const inspiredApplied =
    attacker.activation.inspired && attacker.activation.attacksUsed === 0;
  const inspiredConsumed = attacker.activation.inspired;
  const attack2 =
    attacker.form === "EMBARKED"
      ? 0
      : attackerRule.attack2 +
        (chargeApplied ? 2 : 0) +
        (inspiredApplied ? 2 : 0);
  const fortificationLevel = fortificationLevelForUnitV7(state, defender);
  const defense2 =
    defender.form === "EMBARKED"
      ? 2
      : defenderRule.defense2 + fortificationLevel * 2;
  const breachApplied = false;
  const bonus = defenseBonusForUnitV7(state, defender);

  const attackForceNumerator = BigInt(attack2) * BigInt(attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defense2) * BigInt(defender.hp) * BigInt(bonus.numerator);
  const defenseForceDenominator =
    2n * BigInt(defender.maxHp) * BigInt(bonus.denominator);
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const total = attackOnCommon + defenseOnCommon;
  if (total <= 0n) throw new RangeError("INVALID_STATE");
  const rawDefenderDamage = roundHalfUp(
    attackOnCommon * BigInt(attack2) * 9n,
    total * 4n,
  );
  const rawAttackerDamage = roundHalfUp(
    defenseOnCommon * BigInt(defense2) * 9n,
    total * 4n,
  );
  const damageToDefender = Math.min(defender.hp, rawDefenderDamage);
  const defenderDies = damageToDefender >= defender.hp;
  const retaliates =
    !defenderDies &&
    defender.form !== "EMBARKED" &&
    defenderRule.abilities.includes("ATTACK") &&
    defenderRule.attack2 > 0 &&
    distance >= defenderRule.minimumRange &&
    distance <= defenderRule.range;
  const damageToAttacker = retaliates
    ? Math.min(attacker.hp, rawAttackerDamage)
    : 0;
  const attackerDies = damageToAttacker >= attacker.hp;
  const advances =
    defenderDies &&
    !attackerDies &&
    distance === 1 &&
    attacker.role !== "CATAPULT" &&
    attacker.form === "LAND" &&
    defender.form === "LAND" &&
    !(attacker.role === "MARKSMAN" && distance > 1);
  const push = pushState(
    state,
    attacker,
    defender,
    !defenderDies && distance === 1,
  );
  const nextAttacks = attacker.activation.attacksUsed + 1;
  const splash =
    attacker.role === "BATTLESHIP"
      ? state.units
          .filter(
            (unit) =>
              unit.hp > 0 &&
              unit.id !== defender.id &&
              chebyshev(unit.at, defender.at) === 1 &&
              arePlayersHostileV7(state, attacker.ownerId, unit.ownerId),
          )
          .sort(
            (left, right) =>
              left.at.y - right.at.y ||
              left.at.x - right.at.x ||
              left.id - right.id,
          )
          .map((unit) => {
            const damage = Math.min(
              unit.hp,
              Math.max(1, Math.ceil(damageToDefender / 2)),
            );
            return {
              unitId: unit.id,
              at: unit.at,
              damage,
              dies: damage >= unit.hp,
            };
          })
      : [];
  return {
    attackerId,
    targetUnitId,
    attack2,
    defense2,
    minimumRange: attacker.form === "EMBARKED" ? 0 : attackerRule.minimumRange,
    maximumRange: attacker.form === "EMBARKED" ? 0 : attackerRule.range,
    chargeApplied,
    inspiredApplied,
    inspiredConsumed,
    breachApplied,
    defenseBonusNumerator: bonus.numerator,
    defenseBonusDenominator: bonus.denominator,
    fortificationLevel,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    retaliation: retaliates,
    noRetaliationReason: defenderDies
      ? "DEFENDER_DIED"
      : retaliates
        ? null
        : "OUT_OF_RANGE",
    advances,
    push,
    attacksUsed: nextAttacks,
    attacksRemaining: 0,
    overrunAdvance: attacker.role === "KNIGHT" && advances,
    overrunContinues: false,
    splash,
  };
}

export function pushedDestinationV7(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
): CoordV7 | null {
  const destination = {
    x: defender.at.x + defender.at.x - attacker.at.x,
    y: defender.at.y + defender.at.y - attacker.at.y,
  };
  const tile = tileAtV7(state.board, destination);
  if (tile === undefined || tile.site !== null) return null;
  const water = tile.biome === null;
  if (
    (defender.form === "LAND" && water) ||
    (defender.form !== "LAND" && !water)
  )
    return null;
  const attackerOwner = requirePlayer(state, attacker.ownerId);
  if (!attackerOwner.explored.some((at) => same(at, destination))) return null;
  const defenderOwner = requirePlayer(state, defender.ownerId);
  if (
    (tile.terrain === "MOUNTAIN" &&
      !defenderOwner.researchedTechs.includes("ENGINEERING")) ||
    (tile.terrain === "DEEP_WATER" &&
      !defenderOwner.researchedTechs.includes("NAVIGATION")) ||
    state.units.some(
      (unit) =>
        unit.id !== defender.id && unit.hp > 0 && same(unit.at, destination),
    )
  )
    return null;
  const territoryOwner =
    tile.territoryCityId === null
      ? null
      : (state.cities.find((city) => city.id === tile.territoryCityId)
          ?.ownerId ?? null);
  return territoryOwner !== null &&
    arePlayersAlliedV7(state, defender.ownerId, territoryOwner)
    ? null
    : destination;
}

function pushState(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  survivesMelee: boolean,
): CombatPreviewV7["push"] {
  if (
    !survivesMelee ||
    !effectiveRoleRuleV7(attacker.role).abilities.includes("PUSH")
  )
    return "BLOCKED";
  const behind = {
    x: defender.at.x + defender.at.x - attacker.at.x,
    y: defender.at.y + defender.at.y - attacker.at.y,
  };
  if (tileAtV7(state.board, behind) === undefined) return "BLOCKED";
  const owner = requirePlayer(state, attacker.ownerId);
  if (!owner.explored.some((at) => same(at, behind)))
    return "UNKNOWN_BEHIND_FOG";
  return pushedDestinationV7(state, attacker, defender) === null
    ? "BLOCKED"
    : "WILL_PUSH";
}

function roundHalfUp(numerator: bigint, denominator: bigint): number {
  if (numerator < 0n || denominator <= 0n)
    throw new RangeError("INVALID_STATE");
  const result = (2n * numerator + denominator) / (2n * denominator);
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("INTEGER_OVERFLOW");
  return Number(result);
}
function requireUnit(state: GameStateV7, id: UnitId): UnitStateV7 {
  const unit = state.units.find(
    (candidate) => candidate.id === id && candidate.hp > 0,
  );
  if (unit === undefined) throw new RangeError("INVALID_STATE");
  return unit;
}
function requirePlayer(state: GameStateV7, id: PlayerId) {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player;
}
const same = (a: CoordV7, b: CoordV7) => a.x === b.x && a.y === b.y;
const chebyshev = (a: CoordV7, b: CoordV7) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
