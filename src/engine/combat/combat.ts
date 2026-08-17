import type { CombatPreview } from "../events/types";
import { isAlliedTerritory, isExplored } from "../fog/exploration";
import type { UnitId } from "../model/ids";
import type { CombatTargetRef, GameState, UnitState } from "../model/types";
import { movementDistance } from "../movement/movement";
import type { RationalBonus } from "../rules/economy";
import { friendlyCityDefenseBonus } from "../rules/economy";
import { effectiveUnitRule, requireRuleset } from "../rules/ruleset";

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
  target: CombatTargetRef,
): CombatPreview {
  const attacker = state.units.find((unit) => unit.id === attackerId);
  const defender =
    target.kind === "UNIT"
      ? state.units.find((unit) => unit.id === target.unitId)
      : undefined;
  const wall =
    target.kind === "CHOCOLATE_WALL"
      ? state.chocolateWalls.find((candidate) => candidate.id === target.wallId)
      : undefined;
  if (
    attacker === undefined ||
    attacker.hp <= 0 ||
    (defender === undefined && wall === undefined)
  ) {
    throw new RangeError("Combatant disappeared before preview");
  }
  const attackerOwner = state.players.find(
    (player) => player.id === attacker.ownerId,
  );
  if (attackerOwner === undefined)
    throw new RangeError("Attacker owner disappeared");
  const attackerRule = effectiveUnitRule(
    state.rulesetId,
    attackerOwner.faction,
    attacker.type,
  );
  const targetHp = defender?.hp ?? wall?.hp ?? 0;
  const targetAt = defender?.at ?? wall?.at;
  if (targetAt === undefined || targetHp <= 0)
    throw new RangeError("Combatant disappeared before preview");
  const defenderOwnerForRule =
    defender === undefined
      ? undefined
      : state.players.find((player) => player.id === defender.ownerId);
  const defenderRule =
    defender === undefined
      ? null
      : effectiveUnitRule(
          state.rulesetId,
          defenderOwnerForRule?.faction ?? "ORIGINAL",
          defender.type,
        );
  const bonus =
    defender === undefined ? NO_BONUS : defenseBonusForUnit(state, defender);

  // Each force remains a rational. Cross multiplication forms their common
  // denominator, so no floating point enters either damage result.
  const attackForceNumerator = attackerRule.attack * attacker.hp;
  const attackForceDenominator = attacker.maxHp;
  const defenseForceNumerator =
    (defenderRule?.defense ?? 0) * targetHp * bonus.numerator;
  const defenseForceDenominator = (defender?.maxHp ?? 10) * bonus.denominator;
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const totalOnCommon = attackOnCommon + defenseOnCommon;
  const rawDamageToDefender = roundHalfUp(
    attackOnCommon * attackerRule.attack * 9,
    totalOnCommon * 2,
  );
  const rawDamageToAttacker =
    defenderRule === null
      ? 0
      : roundHalfUp(
          defenseOnCommon * defenderRule.defense * 9,
          totalOnCommon * 2,
        );
  const damageToDefender = Math.min(targetHp, rawDamageToDefender);
  const defenderDies = damageToDefender >= targetHp;
  const distance = movementDistance(attacker.at, targetAt);
  const defenderOwner =
    defender === undefined
      ? undefined
      : state.players.find((player) => player.id === defender.ownerId);
  if (defender !== undefined && defenderOwner === undefined)
    throw new RangeError("Defender owner disappeared");
  const noRetaliationReason =
    wall !== undefined
      ? "STRUCTURE"
      : defenderDies
        ? "DEFENDER_DIED"
        : distance > (defenderRule?.range ?? 0)
          ? "OUT_OF_RANGE"
          : !isExplored(defenderOwner?.explored ?? [], attacker.at)
            ? "ATTACKER_UNEXPLORED"
            : null;
  const damageToAttacker =
    noRetaliationReason === null
      ? Math.min(attacker.hp, rawDamageToAttacker)
      : 0;
  const attackerDies = damageToAttacker >= attacker.hp;
  return {
    attackerId,
    target,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    advances:
      defenderDies &&
      !attackerDies &&
      distance === 1 &&
      (wall === undefined ||
        canEnterDestroyedWallCell(state, attacker, targetAt)),
    noRetaliationReason,
  };
}

function canEnterDestroyedWallCell(
  state: GameState,
  attacker: UnitState,
  at: { readonly x: number; readonly y: number },
): boolean {
  const player = state.players.find(
    (candidate) => candidate.id === attacker.ownerId,
  );
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (player === undefined || tile === undefined) return false;
  if (
    tile.terrain === "MOUNTAIN" &&
    !player.researchedTechs.includes("CLIMBING")
  )
    return false;
  if (isAlliedTerritory(state, attacker.ownerId, at)) return false;
  return !state.units.some(
    (unit) =>
      unit.id !== attacker.id &&
      unit.hp > 0 &&
      unit.at.x === at.x &&
      unit.at.y === at.y,
  );
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
