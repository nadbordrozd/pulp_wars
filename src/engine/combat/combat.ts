import type { CombatPreview } from "../events/types";
import { isExplored } from "../fog/exploration";
import type { UnitId } from "../model/ids";
import type { GameState, UnitState } from "../model/types";
import { movementDistance } from "../movement/movement";
import type { RationalBonus } from "../rules/economy";
import { friendlyCityDefenseBonus } from "../rules/economy";
import { requireRuleset } from "../rules/ruleset";

const NO_BONUS: RationalBonus = { numerator: 1, denominator: 1 };

export function roundHalfUp(numerator: number, denominator: number): number {
  if (
    !Number.isSafeInteger(numerator) ||
    numerator < 0 ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  ) {
    throw new RangeError("roundHalfUp requires a non-negative safe fraction");
  }
  const doubled = 2 * numerator;
  if (
    !Number.isSafeInteger(doubled + denominator) ||
    !Number.isSafeInteger(2 * denominator)
  ) {
    throw new RangeError(
      "roundHalfUp fraction exceeds safe integer arithmetic",
    );
  }
  return Math.floor((doubled + denominator) / (2 * denominator));
}

export function defenseBonusForUnit(
  state: GameState,
  unit: UnitState,
): RationalBonus {
  const rule = requireRuleset(state.rulesetId).units[unit.type];
  let best = NO_BONUS;
  if (rule.abilities.includes("FORTIFY")) {
    const city = friendlyCityDefenseBonus(state, unit);
    if (city !== null) best = greaterBonus(best, city);
  }
  const tile = state.board.tiles[unit.at.y * state.board.width + unit.at.x];
  if (tile?.terrain === "MOUNTAIN") {
    best = greaterBonus(best, requireRuleset(state.rulesetId).mountainDefense);
  }
  const owner = state.players.find((player) => player.id === unit.ownerId);
  if (
    tile?.terrain === "FOREST" &&
    owner?.researchedTechs.includes("ARCHERY")
  ) {
    best = greaterBonus(best, requireRuleset(state.rulesetId).forestDefense);
  }
  return best;
}

export function calculateCombatPreview(
  state: GameState,
  attackerId: UnitId,
  defenderId: UnitId,
): CombatPreview {
  const attacker = state.units.find((unit) => unit.id === attackerId);
  const defender = state.units.find((unit) => unit.id === defenderId);
  if (
    attacker === undefined ||
    defender === undefined ||
    attacker.hp <= 0 ||
    defender.hp <= 0
  ) {
    throw new RangeError("Combatant disappeared before preview");
  }
  const rules = requireRuleset(state.rulesetId);
  const attackerRule = rules.units[attacker.type];
  const defenderRule = rules.units[defender.type];
  const bonus = defenseBonusForUnit(state, defender);

  // Each force remains a rational. Cross multiplication forms their common
  // denominator, so no floating point enters either damage result.
  const attackForceNumerator = attackerRule.attack * attacker.hp;
  const attackForceDenominator = attacker.maxHp;
  const defenseForceNumerator =
    defenderRule.defense * defender.hp * bonus.numerator;
  const defenseForceDenominator = defender.maxHp * bonus.denominator;
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const totalOnCommon = attackOnCommon + defenseOnCommon;
  const rawDamageToDefender = roundHalfUp(
    attackOnCommon * attackerRule.attack * 9,
    totalOnCommon * 2,
  );
  const rawDamageToAttacker = roundHalfUp(
    defenseOnCommon * defenderRule.defense * 9,
    totalOnCommon * 2,
  );
  const damageToDefender = Math.min(defender.hp, rawDamageToDefender);
  const defenderDies = damageToDefender >= defender.hp;
  const defenderOwner = state.players.find(
    (player) => player.id === defender.ownerId,
  );
  if (defenderOwner === undefined)
    throw new RangeError("Defender owner disappeared");
  const distance = movementDistance(attacker.at, defender.at);
  const noRetaliationReason = defenderDies
    ? "DEFENDER_DIED"
    : distance > defenderRule.range
      ? "OUT_OF_RANGE"
      : !isExplored(defenderOwner.explored, attacker.at)
        ? "ATTACKER_UNEXPLORED"
        : null;
  const damageToAttacker =
    noRetaliationReason === null
      ? Math.min(attacker.hp, rawDamageToAttacker)
      : 0;
  const attackerDies = damageToAttacker >= attacker.hp;
  return {
    attackerId,
    defenderId,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    advances: defenderDies && !attackerDies && distance === 1,
    noRetaliationReason,
  };
}

function greaterBonus(
  left: RationalBonus,
  right: RationalBonus,
): RationalBonus {
  return left.numerator * right.denominator >=
    right.numerator * left.denominator
    ? left
    : right;
}
