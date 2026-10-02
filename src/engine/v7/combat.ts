import type { PlayerId, UnitId } from "../model/ids";
import {
  EGG_DEFENSE2_V7,
  armouredDamageV7,
  attackIgnoresCityWallsV7,
  attackIsChargeV7,
  canEnterTerrainV7,
  chargeRunUpAttack2V7,
  factionRulesV7,
  halfPowerAttack2V7,
  playerFactionV7,
  technologyCapabilitiesV7,
  unitAlphaAttack2V7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  unitTakesCoverV7,
  type EffectiveRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { afflictionCombatEffectsV7 } from "./afflictions";
import { arePlayersAlliedV7, arePlayersHostileV7 } from "./economy";
import type { CombatPreviewV7, CombatSplashEntryV7 } from "./events";
import { absorbHitV7, pierceTileV7, rayPowerV7, shieldOfV7 } from "./martian";
import { tileAtV7 } from "./spatial-economy";
import {
  isAfloatFormV7,
  type CoordV7,
  type GameStateV7,
  type UnitStateV7,
} from "./types";

export interface DefenseBonusV7 {
  readonly numerator: 1 | 3 | 2 | 4;
  readonly denominator: 1 | 2;
}
const NO_BONUS: DefenseBonusV7 = { numerator: 1, denominator: 1 };

export function defenseBonusForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
): DefenseBonusV7 {
  // The Martian revision section 7.1: a walker or flyer never gets cover.
  if (!unitTakesCoverV7(state, unit)) return NO_BONUS;
  const terrain = tileAtV7(state.board, unit.at)?.terrain;
  return terrain === "FOREST" || terrain === "MOUNTAIN"
    ? { numerator: 3, denominator: 2 }
    : NO_BONUS;
}

/** The fortification levels City Walls add to a unit on a Walled center. */
export const CITY_WALLS_FORTIFICATION_LEVELS_V7 = 2;

/**
 * A unit's fortification by source: the City Walls levels (0 or 2) and the
 * Field Defense level (0 or 1) of its tile in its owner's territory.
 */
export function fortificationPartsForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
): { readonly walls: number; readonly fieldDefense: number } {
  const none = { walls: 0, fieldDefense: 0 };
  // The Martian revision section 7.1: a walker or flyer is never fortified.
  if (!unitTakesCoverV7(state, unit)) return none;
  const tile = tileAtV7(state.board, unit.at);
  if (tile === undefined || tile.territoryCityId === null) return none;
  const territoryCity = state.cities.find(
    (city) => city.id === tile.territoryCityId,
  );
  if (territoryCity?.ownerId !== unit.ownerId) return none;
  const city = state.cities.find(
    (candidate) =>
      candidate.id === tile.territoryCityId && same(candidate.at, unit.at),
  );
  return {
    walls:
      city !== undefined &&
      city.rewards.some(
        (record) => record.reachedLevel === 3 && record.reward === "WALLS",
      )
        ? CITY_WALLS_FORTIFICATION_LEVELS_V7
        : 0,
    fieldDefense: tile.fieldDefense ? 1 : 0,
  };
}

export function fortificationLevelForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
): number {
  const parts = fortificationPartsForUnitV7(state, unit);
  return parts.walls + parts.fieldDefense;
}

/**
 * Revision 20: the fortification an attack applies and the levels it
 * removes. Acid removes everything and reports no ignored levels (it keeps
 * its own `acid` flag); Charge! removes every level; Wallbreaker removes the
 * City Walls levels and keeps Field Defense. The Martian revision (section
 * 6.5): a heat ray of an owner with the Disintegrator (`disintegrator`)
 * removes every level, like Charge!.
 */
export function attackFortificationV7(
  parts: { readonly walls: number; readonly fieldDefense: number },
  attack: {
    readonly acid: boolean;
    readonly charge: boolean;
    readonly ignoresCityWalls: boolean;
    readonly disintegrator?: boolean;
  },
): {
  readonly fortificationLevel: number;
  readonly fortificationIgnored: number;
} {
  if (attack.acid) return { fortificationLevel: 0, fortificationIgnored: 0 };
  const ignored =
    attack.charge || attack.disintegrator === true
      ? parts.walls + parts.fieldDefense
      : attack.ignoresCityWalls
        ? parts.walls
        : 0;
  return {
    fortificationLevel: parts.walls + parts.fieldDefense - ignored,
    fortificationIgnored: ignored,
  };
}

/**
 * Revision 17 Gang Up (section 5.2): a land-form attacker whose owner's
 * faction has Gang Up gains +1 Attack for each other unit its owner has on
 * the eight cells around the target (any role and form; allies never count),
 * up to the faction maximum. Own units are always visible to their owner, so
 * the public preview passes its visible units and is exact.
 */
export function gangUpBonusV7(
  roster: FactionRosterV7,
  units: readonly Pick<UnitStateV7, "id" | "ownerId" | "at" | "hp">[],
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "form">,
  target: Pick<UnitStateV7, "id" | "at">,
): 0 | 1 | 2 {
  if (attacker.form !== "LAND") return 0;
  const maximum = factionRulesV7(
    playerFactionV7(roster, attacker.ownerId),
  ).gangUpMaximum;
  if (maximum === 0) return 0;
  const helpers = units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.ownerId === attacker.ownerId &&
      unit.id !== attacker.id &&
      unit.id !== target.id &&
      chebyshev(unit.at, target.at) === 1,
  ).length;
  return Math.min(maximum, helpers) as 0 | 1 | 2;
}

/**
 * Exact BigInt-backed v7 combat calculation used by resolution and queries.
 * Revision 20 Charge! (a land-form `LINEBREAKER` attacker): the run-up is
 * added to the Attack, the defender's fortification is ignored for the whole
 * exchange, a survivor is pushed under the ordinary Push conditions, and
 * `advances` covers both the advance after a kill and the follow after a
 * Push. `plannedPathLength` is the run-up of an estimate for an attack after
 * a planned Move; resolution never passes it.
 */
export function calculateCombatPreviewV7(
  state: GameStateV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  plannedPathLength?: number,
): CombatPreviewV7 {
  const attacker = requireUnit(state, attackerId);
  const defender = requireUnit(state, targetUnitId);
  const attackerRule = unitRoleRuleV7(state, attacker);
  const defenderRule = unitRoleRuleV7(state, defender);
  const attackerMechanics = unitRoleMechanicsV7(state, attacker);
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
  const gangUp = gangUpBonusV7(state, state.units, attacker, defender);
  // Revision 20 Charge!: +1 Attack per tile moved this turn (up to 2).
  const charge = attackIsChargeV7(state, attacker);
  const runUpAttack2 = chargeRunUpAttack2V7(state, attacker, plannedPathLength);
  // The Martian revision section 6.1: a heat ray fires at full power only
  // from a unit that has not moved this turn and is not Cooling; otherwise
  // the role's Attack is halved (rounded down) before every bonus. An
  // estimate for an attack after a planned Move uses half power.
  const rayPower = rayPowerV7(
    state,
    state.cooling,
    attacker,
    attacker.activation.moved || (plannedPathLength ?? 0) > 0,
  );
  const baseAttack2 =
    rayPower === "HALF"
      ? halfPowerAttack2V7(attackerRule.attack2)
      : attackerRule.attack2;
  // Revision 19: an Alpha adds 1 Attack to every attack it makes.
  const attack2 =
    attacker.form === "EMBARKED"
      ? 0
      : baseAttack2 +
        (chargeApplied ? 2 : 0) +
        (inspiredApplied ? 2 : 0) +
        gangUp * 2 +
        unitAlphaAttack2V7(state, attacker) +
        runUpAttack2;
  // Revision 19 Acid (section 8.1): a land-form Spitter's attack removes the
  // defender's cover and fortification from the whole exchange.
  const acid = attackHasAcidV7(attackerRule, attacker);
  // Revision 20: Charge! removes every fortification level and Wallbreaker
  // the City Walls levels, for the damage and for the retaliation.
  const { fortificationLevel, fortificationIgnored } = attackFortificationV7(
    fortificationPartsForUnitV7(state, defender),
    {
      acid,
      charge,
      ignoresCityWalls: attackIgnoresCityWallsV7(
        state,
        attacker,
        requirePlayer(state, attacker.ownerId).researchedTechs,
      ),
      // The Martian revision section 6.5: the Disintegrator.
      disintegrator:
        rayPower !== "NONE" &&
        technologyCapabilitiesV7(
          requirePlayer(state, attacker.ownerId).researchedTechs,
          playerFactionV7(state, attacker.ownerId),
        ).raysIgnoreFortification,
    },
  );
  // Revision 19 section 6.2: an Egg defends with a fixed 1, like an embarked
  // unit (no cover and no fortification: both helpers need land form).
  const defense2 =
    defender.form === "EMBARKED"
      ? 2
      : defender.form === "EGG"
        ? EGG_DEFENSE2_V7
        : defenderRule.defense2 + fortificationLevel * 2;
  const breachApplied = false;
  const bonus = acid ? NO_BONUS : defenseBonusForUnitV7(state, defender);

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
  // Revision 19 Armoured (section 8.2): the reduction applies before the cap
  // at current HP, and everything derived from damage uses the reduced value.
  // The Martian revision section 5.3: the hit is then taken from the
  // defender's Shield first; `damageToDefender` stays HP damage.
  const defenderShield = shieldOfV7(state.shields, defender.id);
  const defenderHit = absorbHitV7(
    defenderShield,
    defender.hp,
    armouredDamageV7(state, defender, rawDefenderDamage),
  );
  const damageToDefender = defenderHit.hpDamage;
  const defenderShieldDamage = defenderHit.shieldDamage;
  /** The whole hit on the primary target: splash and Pierce derive from it. */
  const hitOnDefender = damageToDefender + defenderShieldDamage;
  const defenderArmoured =
    hitOnDefender < Math.min(defender.hp + defenderShield, rawDefenderDamage);
  const defenderDies = damageToDefender >= defender.hp;
  // Revision 14 (V1): an UNANSWERED attacker (the Vampire) draws no
  // retaliation.
  const unanswered = attackerRule.abilities.includes("UNANSWERED");
  // Revision 19: an Egg never retaliates.
  const retaliates =
    !defenderDies &&
    !unanswered &&
    defender.form !== "EMBARKED" &&
    defender.form !== "EGG" &&
    defenderRule.abilities.includes("ATTACK") &&
    defenderRule.attack2 > 0 &&
    distance >= defenderRule.minimumRange &&
    distance <= defenderRule.range;
  const attackerShield = shieldOfV7(state.shields, attacker.id);
  const attackerHit = retaliates
    ? absorbHitV7(
        attackerShield,
        attacker.hp,
        armouredDamageV7(state, attacker, rawAttackerDamage),
      )
    : { shieldDamage: 0, hpDamage: 0 };
  const damageToAttacker = attackerHit.hpDamage;
  const attackerShieldDamage = attackerHit.shieldDamage;
  const attackerArmoured =
    retaliates &&
    damageToAttacker + attackerShieldDamage <
      Math.min(attacker.hp + attackerShield, rawAttackerDamage);
  const attackerDies = damageToAttacker >= attacker.hp;
  // Revision 17: splash target mode `ALL` (the Goblin Bomb Chucker's bomb)
  // also hits own and allied units; Battleship and Lich splash stay hostile.
  // The Martian revision section 5.3: splash is computed from the whole hit
  // on the primary target, and each victim's own Shield absorbs its share.
  const collateral = (unit: UnitStateV7): CombatSplashEntryV7 =>
    collateralEntryV7(
      state,
      unit,
      shieldOfV7(state.shields, unit.id),
      hitOnDefender,
    );
  const splashVictims = attackerMechanics.splash
    ? state.units.filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== defender.id &&
          unit.id !== attacker.id &&
          chebyshev(unit.at, defender.at) === 1 &&
          (attackerMechanics.splashTargets === "ALL" ||
            arePlayersHostileV7(state, attacker.ownerId, unit.ownerId)),
      )
    : [];
  // The Martian revision section 6.4 Pierce: a Tripod's ray also hits ANY
  // unit on the tile directly behind the target (own, allied, hostile,
  // hidden or visible, of any form), with the splash rules.
  const pierceAt = attackHasPierceV7(attackerRule, attacker)
    ? pierceTileV7(attacker.at, defender.at)
    : null;
  const pierced =
    pierceAt === null
      ? undefined
      : state.units.find(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== attacker.id &&
            unit.id !== defender.id &&
            same(unit.at, pierceAt) &&
            !splashVictims.some((victim) => victim.id === unit.id),
        );
  const splash = [...splashVictims, ...(pierced === undefined ? [] : [pierced])]
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    )
    .map(collateral);
  // Revision 14 Plague and Bitten (sections 3.1, 4.1, and 4.2).
  const afflictions = afflictionCombatEffectsV7({
    roster: state,
    attacker,
    defender,
    attackerRule,
    defenderRule,
    damageToDefender,
    damageToAttacker,
    defenderShieldDamage,
    attackerDies,
    defenderDies,
    splash,
    splashOwner: (unitId) =>
      state.units.find((unit) => unit.id === unitId)?.ownerId,
    plaguedUnitIds: new Set(state.plagued.map((entry) => entry.unitId)),
    bittenUnitIds: new Set(state.bitten.map((entry) => entry.unitId)),
    eggUnitIds: new Set(
      state.units.filter((unit) => unit.form === "EGG").map((unit) => unit.id),
    ),
  });
  const push = pushState(
    state,
    attacker,
    defender,
    !defenderDies && distance === 1,
  );
  // Revision 19 section 6.7: a melee attacker that destroys an Egg advances
  // onto its tile exactly as after killing a land unit. Revision 20: a
  // Charge! also follows a pushed target into the tile it vacated.
  const advances =
    ((defenderDies && !afflictions.defenderBittenRises) ||
      (charge && push === "WILL_PUSH")) &&
    !attackerDies &&
    distance === 1 &&
    attackerMechanics.advancesAfterKill &&
    attacker.form === "LAND" &&
    (defender.form === "LAND" || defender.form === "EGG");
  const nextAttacks = attacker.activation.attacksUsed + 1;
  const undead = undeadCombatEffectsV7({
    attacker,
    defender,
    attackerRule,
    defenderRule,
    damageToDefender,
    damageToAttacker,
    attackerDies,
    defenderDies,
  });
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
    gangUp,
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
        : unanswered
          ? "UNANSWERED"
          : "OUT_OF_RANGE",
    advances,
    push,
    attacksUsed: nextAttacks,
    attacksRemaining: 0,
    overrunAdvance: attackerRule.abilities.includes("OVERRUN") && advances,
    overrunContinues: false,
    escapeAvailable:
      attacker.form === "LAND" &&
      attackerRule.abilities.includes("ESCAPE") &&
      !attackerDies,
    splash,
    ...undead,
    ...afflictions,
    runUp: runUpAttack2 / 2,
    fortificationIgnored,
    acid,
    defenderArmoured,
    attackerArmoured,
    rayPower,
    coolingApplied: rayPower === "FULL",
    defenderShieldDamage,
    attackerShieldDamage,
  };
}

/**
 * The Martian revision section 6.4: whether an `ATTACK` by this attacker
 * pierces (a land-form unit whose role has `PIERCE`; every such attack is a
 * ray, at full or half power).
 */
export function attackHasPierceV7(
  attackerRule: EffectiveRoleRuleV7,
  attacker: Pick<UnitStateV7, "form">,
): boolean {
  return attacker.form === "LAND" && attackerRule.abilities.includes("PIERCE");
}

/**
 * One splash or Pierce entry (sections 5.3 and 6.4): `max(1, ceil(whole hit
 * on the primary target / 2))`, reduced by Armoured, then taken from the
 * victim's own Shield first. `damage` is HP damage.
 */
export function collateralEntryV7(
  roster: FactionRosterV7,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form" | "at" | "hp">,
  shield: number,
  hitOnPrimaryTarget: number,
): CombatSplashEntryV7 {
  const hit = absorbHitV7(
    shield,
    unit.hp,
    armouredDamageV7(
      roster,
      unit,
      Math.max(1, Math.ceil(hitOnPrimaryTarget / 2)),
    ),
  );
  return {
    unitId: unit.id,
    at: unit.at,
    damage: hit.hpDamage,
    dies: hit.hpDamage >= unit.hp,
    shieldDamage: hit.shieldDamage,
  };
}

/**
 * Revision 19 Acid: whether an `ATTACK` by this attacker ignores the
 * defender's cover and fortification (a land-form unit with `ACID`).
 */
export function attackHasAcidV7(
  attackerRule: EffectiveRoleRuleV7,
  attacker: Pick<UnitStateV7, "form">,
): boolean {
  return attacker.form === "LAND" && attackerRule.abilities.includes("ACID");
}

/**
 * The Martian revision section 8.4: the technology a Tractor Beam assumes
 * for its target. The actor's own unit uses the actor's technologies. A unit
 * of another player uses only what its tile shows publicly, because that
 * player's technologies are private and the command must be exact from the
 * actor's view: Engineering when it stands on a Mountain, Navigation when
 * it stands on Deep Water.
 */
export function tractorBeamTargetTechnologyV7(
  actorOwnsTarget: boolean,
  actorTechs: readonly string[],
  targetTerrain: string | undefined,
): { readonly engineering: boolean; readonly navigation: boolean } {
  return actorOwnsTarget
    ? {
        engineering: actorTechs.includes("ENGINEERING"),
        navigation: actorTechs.includes("NAVIGATION"),
      }
    : {
        engineering: targetTerrain === "MOUNTAIN",
        navigation: targetTerrain === "DEEP_WATER",
      };
}

/** The unit facts the revision-13 Lifesteal and Infect effects read. */
interface UndeadCombatantV7 {
  readonly hp: number;
  readonly maxHp: number;
  readonly form: UnitStateV7["form"];
}

/**
 * Revision 13 sections 6.4 and 6.5, shared by canonical resolution and the
 * public preview. Lifesteal heals a surviving Vampire by the applied damage
 * it dealt, after both damages, capped at its maximum HP. Infect converts a
 * land-form victim killed by a Zombie (by its attack or its retaliation).
 */
export function undeadCombatEffectsV7(input: {
  readonly attacker: UndeadCombatantV7;
  readonly defender: UndeadCombatantV7;
  readonly attackerRule: EffectiveRoleRuleV7;
  readonly defenderRule: EffectiveRoleRuleV7;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly attackerDies: boolean;
  readonly defenderDies: boolean;
}): Pick<
  CombatPreviewV7,
  "attackerHeal" | "defenderHeal" | "attackerInfected" | "defenderInfected"
> {
  return {
    attackerHeal: lifestealHeal(
      input.attacker,
      input.attackerRule,
      input.damageToAttacker,
      input.damageToDefender,
      input.attackerDies,
    ),
    defenderHeal: lifestealHeal(
      input.defender,
      input.defenderRule,
      input.damageToDefender,
      input.damageToAttacker,
      input.defenderDies,
    ),
    attackerInfected:
      input.attackerDies &&
      input.attacker.form === "LAND" &&
      input.defenderRule.abilities.includes("INFECT"),
    defenderInfected:
      input.defenderDies &&
      input.defender.form === "LAND" &&
      input.attackerRule.abilities.includes("INFECT"),
  };
}

function lifestealHeal(
  unit: UndeadCombatantV7,
  rule: EffectiveRoleRuleV7,
  damageTaken: number,
  damageDealt: number,
  dies: boolean,
): number {
  if (dies || damageDealt <= 0 || !rule.abilities.includes("LIFESTEAL"))
    return 0;
  return Math.max(
    0,
    Math.min(damageDealt, unit.maxHp - (unit.hp - damageTaken)),
  );
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
  const attackerOwner = requirePlayer(state, attacker.ownerId);
  if (!attackerOwner.explored.some((at) => same(at, destination))) return null;
  return displacementDestinationLegalV7(state, defender, destination)
    ? destination
    : null;
}

/**
 * The Push conditions (current rules section 13.4), shared by Push, the
 * Charge! push, and the Martian Tractor Beam (section 8.4): the moved unit
 * is not an Egg and `destination` is on the board, not a settlement site,
 * of the same land or water kind as the unit's form, enterable by the unit
 * (the shared `canEnterTerrainV7` with its owner's technologies and its
 * movement mode), empty, and not in territory allied to the unit.
 */
export function displacementDestinationLegalV7(
  state: GameStateV7,
  moved: UnitStateV7,
  destination: CoordV7,
  technology?: { readonly engineering: boolean; readonly navigation: boolean },
): boolean {
  // Revision 19 section 6.2: an Egg cannot be pushed or displaced.
  if (moved.form === "EGG") return false;
  const tile = tileAtV7(state.board, destination);
  if (tile === undefined || tile.site !== null) return false;
  const owner = requirePlayer(state, moved.ownerId);
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(state, moved),
      afloat: isAfloatFormV7(moved.form),
      engineering:
        technology?.engineering ??
        owner.researchedTechs.includes("ENGINEERING"),
      navigation:
        technology?.navigation ?? owner.researchedTechs.includes("NAVIGATION"),
    }) ||
    state.units.some(
      (unit) =>
        unit.id !== moved.id && unit.hp > 0 && same(unit.at, destination),
    )
  )
    return false;
  const territoryOwner =
    tile.territoryCityId === null
      ? null
      : (state.cities.find((city) => city.id === tile.territoryCityId)
          ?.ownerId ?? null);
  return !(
    territoryOwner !== null &&
    arePlayersAlliedV7(state, moved.ownerId, territoryOwner)
  );
}

function pushState(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  survivesMelee: boolean,
): CombatPreviewV7["push"] {
  // Revision 20: a Charge! pushes like a `PUSH` attacker.
  if (
    !survivesMelee ||
    defender.form === "EGG" ||
    (!unitRoleRuleV7(state, attacker).abilities.includes("PUSH") &&
      !attackIsChargeV7(state, attacker))
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
