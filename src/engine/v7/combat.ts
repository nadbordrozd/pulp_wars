import type { PlayerId, UnitId } from "../model/ids";
import {
  EGG_DEFENSE2_V7,
  NO_COVER_V7,
  coverBonusV7,
  ownerHasForestCoverV7,
  terrainGivesCoverV7,
  RAM_BONUS2_V7,
  armouredDamageV7,
  unitIsBlastProofV7,
  attackIgnoresCityWallsV7,
  attackPlaguesV7,
  rayOverheatsV7,
  attackIsChargeV7,
  attackIsRamV7,
  attackIsTorpedoV7,
  canEnterTerrainV7,
  chargeRunUpAttack2V7,
  factionRulesV7,
  flyerMayStandOnSiteV7,
  isIceAtV7,
  unitIsIceboundV7,
  halfPowerAttack2V7,
  ownerResearchedTechsV7,
  platedCapAppliesV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitGrowsV7,
  unitAlphaAttack2V7,
  unitCapacitySlotsV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  isRangedRoleRuleV7,
  unitRoleRuleV7,
  unitTakesCoverV7,
  type EffectiveRoleRuleV7,
  type FactionRosterV7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
} from "../rules/ruleset-v7";
import {
  afflictionCombatEffectsV7,
  unitIsConstructV7,
  unitTakesStatusV7,
} from "./afflictions";
import {
  attackAllowanceV7,
  attackIsUnflinchingV7,
  attackKnocksBackV7,
  cannonIgnoresFortificationV7,
  knockbackDestinationV7,
  roleRetaliatesV7,
  unitIsDugInV7,
} from "./dwarf";
import {
  attackGrantsEscapeV7,
  attackIsBouncedV7,
  attackSplatsV7,
  bounceDestinationV7,
  overrunKindV7,
  sugarRushAttack2V7,
  unitIsSplattedV7,
} from "./candy";
import {
  attack2AfterToothacheV7,
  candyExchangeStatusesV7,
  ricochetEntryV7,
  thumpEntriesV7,
  unitHasToothacheV7,
  unitThumpDamageV7,
} from "./candy-abilities";
import { arePlayersAlliedV7, arePlayersHostileV7 } from "./economy";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { CombatPreviewV7, CombatSplashEntryV7 } from "./events";
import {
  attackMaximumRangeV7,
  attackShattersV7,
  blizzardHalvedDamageV7,
  blizzardProtectsV7,
  isFrozenV7,
  isIceFolkLandUnitV7,
  isSnowV7,
  shatterThresholdV7,
  sweepFlankTilesV7,
  unitAvoidsForeignSitesV7,
  unitOwnerIsIceFolkV7,
  winterV7,
} from "./ice-folk";
import {
  absorbHitV7,
  forceFieldHoldsV7,
  pierceTileV7,
  rayPowerV7,
  shieldOfV7,
} from "./martian";
import {
  attackCracksV7,
  attackIsFrostbittenV7,
  crackedDefense2V7,
  shockFieldDamageV7,
  unitDefense2AtDistanceV7,
  unitIsCrackedV7,
  unitIsImmovableV7,
} from "./ninth-unit";
import { noRisingAtV7, riftAtV7 } from "./rift";
import { tileAtV7 } from "./spatial-economy";
import { tileOccupiedV7 } from "./units";
import { grownHpV7 } from "./growth";
import {
  attackFeastsV7,
  feastHealV7,
  unitIsTerrifiedV7,
} from "./vampire-banshee";
import {
  attackCrushDamageV7,
  attackSiegeHammerV7,
  crushBehindTileV7,
  crushStateV7,
  defenderCrushableV7,
  fixedSignatureHitV7,
  glacialSmashThresholdV7,
  siegeHammerRazedCityV7,
  swallowedByV7,
} from "./giants";
import {
  isAfloatFormV7,
  isNeutralOwnerV7,
  type CoordV7,
  type GameStateV7,
  type UnitStateV7,
} from "./types";

export interface DefenseBonusV7 {
  readonly numerator: 1 | 3 | 5;
  readonly denominator: 1 | 2 | 4;
}
const NO_BONUS: DefenseBonusV7 = NO_COVER_V7;

export function defenseBonusForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
  snowAt: (at: CoordV7) => boolean = (at) => isSnowV7(state, at),
): DefenseBonusV7 {
  // The Martian revision section 7.1: a walker or flyer never gets cover.
  if (!unitTakesCoverV7(state, unit)) return NO_BONUS;
  // The frozen sea (naval branch section 8.10): Glacier gives the Snow
  // cover on ice (never added to anything else).
  return coverBonusV7(
    terrainGivesCoverV7(
      tileAtV7(state.board, unit.at)?.terrain,
      ownerHasForestCoverV7(state, unit.ownerId),
    ),
    snowCoverAppliesV7(state, unit, snowAt) || iceCoverAppliesV7(state, unit),
  );
}

/**
 * The frozen sea (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.10):
 * Glacier's cover. A land-form unit of the Ice Folk kind standing on ice,
 * whose kind's capabilities under its owner have `iceCover` and whose own
 * fortification level is 0, has the Snow cover (`SNOW_COVER_V7`).
 */
export function iceCoverAppliesV7(
  state: GameStateV7,
  unit: UnitStateV7,
): boolean {
  return (
    state.ice.length > 0 &&
    unitTakesCoverV7(state, unit) &&
    unitOwnerIsIceFolkV7(state, unit) &&
    isIceAtV7(state, unit.at) &&
    unitCapabilitiesV7(state, unit, ownerResearchedTechsV7(state, unit.ownerId))
      .iceCover &&
    fortificationLevelForUnitV7(state, unit) === 0
  );
}

/**
 * The Ice Folk revision (section 6.2, 2; `pulp_wars-1wy.3`): Snow cover. A
 * land-form unit of an Ice Folk seat standing on Snow whose OWN
 * fortification level is 0 has cover `x 1.25` (`SNOW_COVER_V7`), unless it
 * stands on a Forest or Mountain, whose `x 1.5` applies instead (never
 * added). `snowAt` is the Snow the caller may read (canonical, or a
 * viewer's).
 */
export function snowCoverAppliesV7(
  state: GameStateV7,
  unit: UnitStateV7,
  snowAt: (at: CoordV7) => boolean = (at) => isSnowV7(state, at),
): boolean {
  return (
    unitTakesCoverV7(state, unit) &&
    unitOwnerIsIceFolkV7(state, unit) &&
    snowAt(unit.at) &&
    !terrainGivesCoverV7(
      tileAtV7(state.board, unit.at)?.terrain,
      ownerHasForestCoverV7(state, unit.ownerId),
    ) &&
    fortificationLevelForUnitV7(state, unit) === 0
  );
}

/** The fortification levels City Walls add to a unit on a Walled center. */
export const CITY_WALLS_FORTIFICATION_LEVELS_V7 = 2;

/**
 * A unit's fortification by source: the City Walls levels (0 or 2) and the
 * Field Defense level (0 or 1) of its tile in its owner's territory. The
 * Dwarf revision (section 8): a dug-in unit has one level in the Field
 * Defense part (`max`, never added to Field Defense), computed before the
 * territory checks, which gate Walls and Field Defense only.
 * `tileFieldDefense` says whether the tile's Field Defense counts.
 */
export function fortificationPartsForUnitV7(
  state: GameStateV7,
  unit: UnitStateV7,
): {
  readonly walls: number;
  readonly fieldDefense: number;
  readonly dugIn: boolean;
  readonly tileFieldDefense: boolean;
} {
  const none = {
    walls: 0,
    fieldDefense: 0,
    dugIn: false,
    tileFieldDefense: false,
  };
  // The Martian revision section 7.1: a walker or flyer is never fortified.
  if (!unitTakesCoverV7(state, unit)) return none;
  const dugIn = unitIsDugInV7(state, unit);
  const dug = { ...none, fieldDefense: dugIn ? 1 : 0, dugIn };
  const tile = tileAtV7(state.board, unit.at);
  if (tile === undefined || tile.territoryCityId === null) return dug;
  const territoryCity = state.cities.find(
    (city) => city.id === tile.territoryCityId,
  );
  if (territoryCity?.ownerId !== unit.ownerId) return dug;
  const city = state.cities.find(
    (candidate) =>
      candidate.id === tile.territoryCityId && same(candidate.at, unit.at),
  );
  return {
    // The giants' signatures (RULESET_7_GIANTS.md section 6.7): razed
    // Walls give nothing.
    walls:
      city !== undefined &&
      city.wallsRazed !== true &&
      city.rewards.some(
        (record) => record.reachedLevel === 3 && record.reward === "WALLS",
      )
        ? CITY_WALLS_FORTIFICATION_LEVELS_V7
        : 0,
    // Tuning 4 (`pulp_wars-w49.3`): a Field Defense is two levels (one
    // before); Dig In is still one, and the two are never added.
    fieldDefense: tile.fieldDefense
      ? FIELD_DEFENSE_FORTIFICATION_LEVELS_V7
      : dugIn
        ? 1
        : 0,
    dugIn,
    tileFieldDefense: tile.fieldDefense,
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
    /** The Ice Folk revision section 7.6: a Boulder Yeti's Boulders. */
    readonly boulders?: boolean;
    /**
     * The Dwarf revision section 10.1: a Steam Cannon with Blasting
     * Charges (Walls, Field Defense, and Dig In; cover stays).
     */
    readonly blasting?: boolean;
    /**
     * Tuning 1 Breach (`pulp_wars-w49.3`): a land-form attack from distance
     * 1 by an owner with Explosives (Walls, Field Defense, and Dig In; cover
     * stays).
     */
    readonly breach?: boolean;
    /**
     * The giants' signatures (RULESET_7_GIANTS.md section 6.7): a Brass
     * Titan's Siege Hammer (Walls, Field Defense, and Dig In; cover stays).
     */
    readonly siegeHammer?: boolean;
  },
): {
  readonly fortificationLevel: number;
  readonly fortificationIgnored: number;
} {
  if (attack.acid) return { fortificationLevel: 0, fortificationIgnored: 0 };
  const ignored =
    attack.charge ||
    attack.disintegrator === true ||
    attack.boulders === true ||
    attack.blasting === true ||
    attack.breach === true ||
    attack.siegeHammer === true
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
 * Revision 17 Gang Up (section 5.2): a land-form attacker whose kind (the
 * Mind Control revision: a body rule) has Gang Up gains +1 Attack for each
 * other unit its owner (its controller) has on
 * the eight cells around the target (any role and form; allies never count),
 * up to the faction maximum. The Goblin pass (`pulp_wars-w49.12`): a role
 * has its own `gangUpLimit` (the Bomb Chucker 0, the Rocket Cart 1). Own units are always visible to their owner, so
 * the public preview passes its visible units and is exact.
 *
 * The ninth unit (`pulp_wars-w49.17`, 7r55): Heavyweight. A helper counts
 * as its kind's role `gangUpWeight` units in land form (the Goblin Ogre 2,
 * so one Ogre gives the whole +2), and as 1 otherwise. A mind-controlled
 * Ogre is its controller's unit, so it helps no Goblin seat.
 */
export function gangUpBonusV7(
  roster: FactionRosterV7,
  units: readonly Pick<
    UnitStateV7,
    "id" | "ownerId" | "at" | "hp" | "role" | "form"
  >[],
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "form" | "role">,
  target: Pick<UnitStateV7, "id" | "at">,
): 0 | 1 | 2 {
  if (attacker.form !== "LAND") return 0;
  const maximum = factionRulesV7(unitFactionV7(roster, attacker)).gangUpMaximum;
  if (maximum === 0) return 0;
  // The Goblin pass (7r50): the role's own limit (a bomb 0, a rocket 1).
  const limit = unitRoleMechanicsV7(roster, attacker).gangUpLimit;
  if (limit === 0) return 0;
  const helpers = units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.ownerId === attacker.ownerId &&
        unit.id !== attacker.id &&
        unit.id !== target.id &&
        chebyshev(unit.at, target.at) === 1,
    )
    .reduce(
      (sum, unit) =>
        sum +
        (unit.form === "LAND"
          ? unitRoleMechanicsV7(roster, unit).gangUpWeight
          : 1),
      0,
    );
  return Math.min(maximum, limit, helpers) as 0 | 1 | 2;
}

/**
 * The Dinosaur pass (`pulp_wars-w49.15`, 7r53): Pack Hunt. The `attack2` a
 * land-form attacker whose role has `packHuntBonus2` (the Caveman) gains
 * against a target that stands next to a dinosaur (a land-form growing
 * unit) of the attacker's owner, or (the correction) that a dinosaur of
 * the active seat attacked this turn (`hunted`, the state's or the view's
 * `huntedThisTurn`; only the active seat attacks, so the list is always
 * its own). Own units are always visible to their owner and a hunted
 * target one can attack is visible, so the public preview is exact.
 */
export function packHuntAttack2V7(
  roster: FactionRosterV7,
  units: readonly Pick<
    UnitStateV7,
    "id" | "ownerId" | "at" | "hp" | "role" | "form"
  >[],
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "form" | "role">,
  target: Pick<UnitStateV7, "id" | "at">,
  hunted: readonly UnitId[],
): number {
  if (attacker.form !== "LAND") return 0;
  const bonus2 = unitRoleMechanicsV7(roster, attacker).packHuntBonus2;
  if (bonus2 === 0) return 0;
  if (hunted.includes(target.id)) return bonus2;
  return units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.ownerId === attacker.ownerId &&
      unit.id !== attacker.id &&
      unit.id !== target.id &&
      unit.form === "LAND" &&
      chebyshev(unit.at, target.at) === 1 &&
      unitGrowsV7(roster, unit),
  )
    ? bonus2
    : 0;
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
  options: CombatOptionsV7 = {},
): CombatPreviewV7 {
  const attacker = requireUnit(state, attackerId);
  const defender = requireUnit(state, targetUnitId);
  const attackerRule = unitRoleRuleV7(state, attacker);
  const defenderRule = unitRoleRuleV7(state, defender);
  const attackerMechanics = unitRoleMechanicsV7(state, attacker);
  const distance = chebyshev(attacker.at, defender.at);
  // The Dwarf revision section 7.1: a construct's attack uses its maximum
  // HP for its own force (Unflinching, on attack only).
  const unflinching = attackIsUnflinchingV7(state, attacker);
  // The Ice Folk revision (section 8, step 1): Rockfall, Planted, and Cold
  // Blood. Ice Folk Freeze (`pulp_wars-w49.37`): only a land-form unit is
  // Frozen.
  const attackerLand = attacker.form === "LAND";
  const defenderFrozen =
    defender.form === "LAND" &&
    (options.assumeTargetFrozen === true ||
      isFrozenV7(state.frozen, defender.id));
  const rockfallApplied =
    attackerLand && attackerMechanics.rockfallAttack2 > 0 && distance === 2;
  const plantedApplied =
    attackerLand &&
    attackerMechanics.plantedBonus2 > 0 &&
    !attacker.activation.moved &&
    (plannedPathLength ?? 0) === 0;
  const coldBloodApplied =
    attackerLand && attackerMechanics.coldBloodBonus2 > 0 && defenderFrozen;
  // The Undead pass, correction (`pulp_wars-w49.13`): Carrion, a Ghoul's
  // attack on a Bitten or Plagued unit.
  const carrionApplied =
    attackerLand &&
    attackerMechanics.carrionBonus2 > 0 &&
    (state.bitten.some((entry) => entry.unitId === defender.id) ||
      state.plagued.some((entry) => entry.unitId === defender.id));
  const chargeApplied =
    ownerResearchedTechsV7(state, attacker.ownerId).includes("RAIDING") &&
    attackerRule.abilities.includes("CHARGE") &&
    distance === 1 &&
    attacker.activation.moved &&
    attacker.activation.movedPathLength >= 2 &&
    attacker.activation.attacksUsed === 0;
  const inspiredApplied =
    attacker.activation.inspired && attacker.activation.attacksUsed === 0;
  const inspiredConsumed = attacker.activation.inspired;
  const gangUp = gangUpBonusV7(state, state.units, attacker, defender);
  // The Candy revision section 5.2: +1 Attack on a Rushed unit's first
  // attack, unless Charge or Inspired applies.
  const assumeRushed = options.assumeSugarRush === true;
  const sugarRush2 = sugarRushAttack2V7(state, attacker, {
    chargeApplied,
    inspiredApplied,
    assumeRushed,
  });
  // Revision 20 Charge!: +1 Attack per tile moved this turn (up to 2).
  const charge = attackIsChargeV7(state, attacker);
  const runUpAttack2 = chargeRunUpAttack2V7(
    state,
    attacker,
    ownerResearchedTechsV7(state, attacker.ownerId),
    plannedPathLength,
  );
  // The Dinosaur pass (7r53): Pack Hunt, a Caveman's attack on a unit next
  // to an own dinosaur.
  const packHunt2 = packHuntAttack2V7(
    state,
    state.units,
    attacker,
    defender,
    state.huntedThisTurn,
  );
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
      : rockfallApplied
        ? attackerMechanics.rockfallAttack2
        : attackerRule.attack2;
  // Revision 19: an Alpha adds 1 Attack to every attack it makes.
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1):
  // a Patrol Boat that moved this turn rams a target afloat (+1 Attack);
  // section 5.3: a Submarine's attack is a torpedo.
  const ram = attackIsRamV7(
    state,
    attacker,
    defender,
    distance,
    ownerResearchedTechsV7(state, attacker.ownerId),
    (plannedPathLength ?? 0) > 0,
  );
  const torpedo = attackIsTorpedoV7(state, attacker);
  // The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 6.2): the
  // attacker's own Toothache, after every other modifier (only on an
  // `ATTACK`: a Whirl passes `ignoreToothache`).
  const toothacheAttack =
    options.ignoreToothache !== true && unitHasToothacheV7(state, attacker.id);
  const attack2BeforeToothache =
    attacker.form === "EMBARKED"
      ? 0
      : baseAttack2 +
        (ram ? RAM_BONUS2_V7 : 0) +
        (chargeApplied ? 2 : 0) +
        (inspiredApplied ? 2 : 0) +
        sugarRush2 +
        gangUp * 2 +
        unitAlphaAttack2V7(state, attacker) +
        runUpAttack2 +
        (plantedApplied ? attackerMechanics.plantedBonus2 : 0) +
        (coldBloodApplied ? attackerMechanics.coldBloodBonus2 : 0) +
        (carrionApplied ? attackerMechanics.carrionBonus2 : 0) +
        packHunt2;
  const attack2 = attack2AfterToothacheV7(
    attack2BeforeToothache,
    toothacheAttack,
  );
  // Revision 19 Acid (section 8.1): a land-form Spitter's attack removes the
  // defender's cover and fortification from the whole exchange.
  const acid = attackHasAcidV7(attackerRule, attacker);
  // Tuning 1 Breach: a melee attack of an owner with Explosives.
  const breach = attackBreachesV7(
    state,
    attacker,
    distance,
    ownerResearchedTechsV7(state, attacker.ownerId),
  );
  // The giants' signatures (RULESET_7_GIANTS.md section 6.7): Siege Hammer.
  const siegeHammer = attackSiegeHammerV7(state, attacker, distance);
  // Revision 20: Charge! removes every fortification level and Wallbreaker
  // the City Walls levels, for the damage the defender takes.
  const fullParts = fortificationPartsForUnitV7(state, defender);
  const defenderParts =
    options.ignoreDigIn === true && fullParts.dugIn
      ? {
          ...fullParts,
          fieldDefense: fullParts.tileFieldDefense
            ? FIELD_DEFENSE_FORTIFICATION_LEVELS_V7
            : 0,
          dugIn: false,
        }
      : fullParts;
  const { fortificationLevel, fortificationIgnored } = attackFortificationV7(
    defenderParts,
    {
      acid,
      charge,
      ignoresCityWalls: attackIgnoresCityWallsV7(
        state,
        attacker,
        ownerResearchedTechsV7(state, attacker.ownerId),
      ),
      // The Martian revision section 6.5: the Disintegrator.
      disintegrator:
        rayPower !== "NONE" &&
        unitCapabilitiesV7(
          state,
          attacker,
          ownerResearchedTechsV7(state, attacker.ownerId),
        ).raysIgnoreFortification,
      // The Ice Folk revision section 7.6: Boulders.
      boulders: attackerLand && attackerMechanics.ignoresFortification,
      // The Dwarf revision section 10.1: a Blasting Steam Cannon.
      blasting: cannonIgnoresFortificationV7(
        state,
        attacker,
        ownerResearchedTechsV7(state, attacker.ownerId),
      ),
      breach,
      siegeHammer,
    },
  );
  // Revision 19 section 6.2: an Egg defends with a fixed 1, like an embarked
  // unit (no cover and no fortification: both helpers need land form).
  const defense2 =
    defender.form === "EMBARKED"
      ? 2
      : defender.form === "EGG"
        ? EGG_DEFENSE2_V7
        : // Tuning 5: the Human Guard is open to ranged attacks. The ninth
          // unit (7r55): a Cracked unit has 1 less Defense.
          unitDefense2AtDistanceV7(
            state,
            defender,
            defenderRule,
            unitRoleMechanicsV7(state, defender),
            distance,
          ) +
          fortificationLevel * 2;
  const breachApplied = breach && fortificationIgnored > 0;
  // The Ice Folk revision section 6.2: Snow cover (a telemetry option can
  // evaluate the exchange without it).
  const snowAt =
    options.ignoreSnowCover === true
      ? () => false
      : (at: CoordV7) => isSnowV7(state, at);
  const bonus = acid
    ? NO_BONUS
    : defenseBonusForUnitV7(state, defender, snowAt);
  const snowCover = !acid && snowCoverAppliesV7(state, defender, snowAt);
  const iceCover = !acid && iceCoverAppliesV7(state, defender);
  // The frozen sea (naval branch section 8.9): an icebound defender is
  // frozen solid and never retaliates.
  const defenderIcebound = unitIsIceboundV7(state, defender);

  const attackForceNumerator =
    BigInt(attack2) * BigInt(unflinching ? attacker.maxHp : attacker.hp);
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
  // Tuning 1 (`pulp_wars-w49.3`, 7r46): the retaliation is computed from
  // the defender's base Defense, without fortification and without cover.
  const rawAttackerDamage = retaliationDamageV7({
    attackForceNumerator,
    attackForceDenominator,
    // The ninth unit (7r55): a Cracked defender strikes back with 1 less
    // Defense too.
    defense2: unitIsCrackedV7(state, defender.id)
      ? crackedDefense2V7(defenderRule.defense2)
      : defenderRule.defense2,
    hp: defender.hp,
    maxHp: defender.maxHp,
  });
  // Revision 19 Armoured (section 8.2): the reduction applies before the cap
  // at current HP, and everything derived from damage uses the reduced value.
  // The Martian revision section 5.3: the hit is then taken from the
  // defender's Shield first; `damageToDefender` stays HP damage.
  // The Ice Folk revision section 6.3: a hit from distance 2 or more on a
  // land-form Ice Folk unit in a Blizzard of its own seat is halved (rounded
  // up) before Armoured and the Shield.
  const blizzardHalved =
    options.ignoreBlizzard !== true &&
    distance >= 2 &&
    blizzardProtectsV7(state, winterV7(state).witches, defender);
  const formulaDefenderDamage = blizzardHalved
    ? blizzardHalvedDamageV7(rawDefenderDamage)
    : rawDefenderDamage;
  const defenderShield = shieldOfV7(state.shields, defender.id);
  const plated = options.ignorePlated !== true;
  // The Martian pass, correction: a whole Force Field holds one attack.
  const defenderHit = absorbHitV7(
    defenderShield,
    defender.hp,
    armouredDamageV7(state, defender, formulaDefenderDamage, plated),
    forceFieldHoldsV7(state, defender, defenderShield),
  );
  // The Ice Folk revision section 5.5: Shatter reads the HP the hit leaves.
  // The giants' signatures (section 6.6): the Frost Giant's Glacial Smash
  // threshold replaces its owner's.
  const glacialThreshold = glacialSmashThresholdV7(state, attacker, distance);
  const shatters =
    options.ignoreShatter !== true &&
    attackShattersV7({
      attackerIceFolk: isIceFolkLandUnitV7(state, attacker),
      distance,
      defenderFrozen,
      defender,
      hpAfterHit: defender.hp - defenderHit.hpDamage,
      threshold: glacialThreshold ?? shatterThresholdV7(state, attacker),
    });
  const damageToDefender = shatters ? defender.hp : defenderHit.hpDamage;
  const defenderShieldDamage = defenderHit.shieldDamage;
  /** The whole hit on the primary target: splash and Pierce derive from it. */
  const hitOnDefender = defenderHit.hpDamage + defenderShieldDamage;
  const defenderArmoured =
    !forceFieldHoldsV7(state, defender, defenderShield) &&
    hitOnDefender <
      Math.min(defender.hp + defenderShield, formulaDefenderDamage);
  const defenderDies = damageToDefender >= defender.hp;
  // Revision 14 (V1): an UNANSWERED attacker (the Vampire) draws no
  // retaliation.
  // The naval branch section 5.3: so does a torpedo.
  const unanswered = attackerRule.abilities.includes("UNANSWERED") || torpedo;
  // Revision 19: an Egg never retaliates. The Dwarf revision section 6.1:
  // a Gyrocopter (`BOMB_RUN`, no `ATTACK`) retaliates too.
  // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen defender never
  // retaliates.
  const wouldRetaliate =
    !defenderDies &&
    !unanswered &&
    !defenderIcebound &&
    !defenderFrozen &&
    defender.form !== "EMBARKED" &&
    defender.form !== "EGG" &&
    roleRetaliatesV7(defenderRule) &&
    defenderRule.attack2 > 0 &&
    distance >= defenderRule.minimumRange &&
    distance <= defenderRule.range;
  // The Candy revision section 7: a Splatted unit does not strike back.
  const splatted = unitIsSplattedV7(state, defender.id);
  // The Vampire and Banshee rework (`pulp_wars-ty6i`): a unit a Banshee's
  // Wail terrified this turn does not strike back.
  const terrified = unitIsTerrifiedV7(state, defender.id);
  const retaliates = wouldRetaliate && !splatted && !terrified;
  const attackerShield = shieldOfV7(state.shields, attacker.id);
  const attackerHit = retaliates
    ? absorbHitV7(
        attackerShield,
        attacker.hp,
        armouredDamageV7(state, attacker, rawAttackerDamage, plated),
      )
    : { shieldDamage: 0, hpDamage: 0 };
  // The ninth unit (7r55): the Shock Field of a Shielded Shock Trooper
  // attacked from the next tile. It is decided by the Shield before the
  // hit, whatever the hit does; it follows the retaliation, is reduced by
  // Armoured and Plated, and is taken from the attacker's Shield first.
  const shockRaw = shockFieldDamageV7(
    state,
    defender,
    defenderShield,
    distance,
  );
  const shockHit =
    shockRaw > 0
      ? absorbHitV7(
          attackerShield - attackerHit.shieldDamage,
          attacker.hp - attackerHit.hpDamage,
          armouredDamageV7(state, attacker, shockRaw, plated),
        )
      : { shieldDamage: 0, hpDamage: 0 };
  const shockDamage = shockHit.hpDamage + shockHit.shieldDamage;
  const damageToAttacker = attackerHit.hpDamage + shockHit.hpDamage;
  const attackerShieldDamage = attackerHit.shieldDamage + shockHit.shieldDamage;
  const attackerArmoured =
    retaliates &&
    attackerHit.hpDamage + attackerHit.shieldDamage <
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
          // The Goblin pass (7r50): a Blast-proof unit is not splashed.
          !unitIsBlastProofV7(state, unit) &&
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
  // The Ice Folk revision section 7.5 Sweep: every hostile unit on the two
  // flank tiles takes the fixed Sweep damage (Armoured and Shields apply).
  const sweep = attackerLand && attackerMechanics.sweepDamage > 0;
  const sweepTiles = sweep ? sweepFlankTilesV7(attacker.at, defender.at) : [];
  const sweepVictims = sweep
    ? state.units.filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== defender.id &&
          unit.id !== attacker.id &&
          sweepTiles.some((at) => same(at, unit.at)) &&
          arePlayersHostileV7(state, attacker.ownerId, unit.ownerId),
      )
    : [];
  const splash = sweep
    ? sortedByPosition(sweepVictims).map((unit) =>
        sweepEntryV7(
          state,
          unit,
          shieldOfV7(state.shields, unit.id),
          attackerMechanics.sweepDamage,
        ),
      )
    : sortedByPosition([
        ...splashVictims,
        ...(pierced === undefined ? [] : [pierced]),
      ]).map(collateral);
  // Revision 14 Plague and Bitten (sections 3.1, 4.1, and 4.2).
  const afflictions = afflictionCombatEffectsV7({
    roster: state,
    attacker,
    defender,
    attackerRule,
    attackerPlagues: attackPlaguesV7(
      state,
      attacker,
      attackerRule,
      ownerResearchedTechsV7(state, attacker.ownerId),
    ),
    defenderRule,
    damageToDefender,
    damageToAttacker,
    defenderShieldDamage,
    attackerDies,
    defenderDies,
    attackerOnRift: noRisingAtV7(state.board, attacker.at),
    defenderOnRift: noRisingAtV7(state.board, defender.at),
    splash,
    splashUnit: (unitId) => state.units.find((unit) => unit.id === unitId),
    plaguedUnitIds: new Set(state.plagued.map((entry) => entry.unitId)),
    bittenUnitIds: new Set(state.bitten.map((entry) => entry.unitId)),
    eggUnitIds: new Set(
      state.units.filter((unit) => unit.form === "EGG").map((unit) => unit.id),
    ),
  });
  // The Dwarf revision section 10.1: a Steam Cannon's Knockback is the
  // Push step of a ranged attack.
  // The naval branch section 4.1: a ram's shove is the Push step of a Ram.
  const push = attackKnocksBackV7(state, attacker)
    ? knockbackStateV7(state, attacker, defender, !defenderDies)
    : ram
      ? ramShoveDestinationV7(state, attacker, defender) !== null &&
        !defenderDies
        ? "WILL_PUSH"
        : "BLOCKED"
      : pushState(state, attacker, defender, !defenderDies && distance === 1);
  // Revision 19 section 6.7: a melee attacker that destroys an Egg advances
  // onto its tile exactly as after killing a land unit. Revision 20: a
  // Charge! also follows a pushed target into the tile it vacated.
  const advances =
    ((defenderDies && !afflictions.defenderBittenRises) ||
      (charge && push === "WILL_PUSH")) &&
    !attackerDies &&
    distance === 1 &&
    attackerMechanics.advancesAfterKill &&
    // Tuning 2 (7r47): a ranged unit never advances, also from distance 1.
    !isRangedRoleRuleV7(attackerRule) &&
    attacker.form === "LAND" &&
    (defender.form === "LAND" || defender.form === "EGG") &&
    // The Rift (RULESET_7_RIFT.md section 4): no attacker advances onto a
    // Rift (only a flyer could stand there, and a flyer never advances).
    !riftAtV7(state.board, defender.at) &&
    // The Ice Folk revision section 7.7: a Sabretooth never advances onto a
    // settlement center it does not own.
    advanceSiteAllowedV7(
      state,
      attacker,
      tileAtV7(state.board, defender.at)?.site ?? null,
      state.cities.find((city) => same(city.at, defender.at))?.ownerId ?? null,
    ) &&
    // The giants' signatures (section 6.2): a dying Abomination's victim is
    // released on its tile, so nothing advances onto it.
    swallowedByV7(state.giants.swallowed, defender.id) === undefined;
  const nextAttacks = attacker.activation.attacksUsed + 1;
  // The Dwarf revision section 7.3: an unmoved Clockwork Gunner's first
  // shot leaves a second one.
  const twinShotLeft =
    !attackerDies && attackAllowanceV7(state, attacker) > nextAttacks;
  // The Vampire and Banshee rework (`pulp_wars-ty6i`): Feast. A kill heals
  // a surviving Vampire fully and, on its first attack, leaves one more.
  const frostbitten = attackIsFrostbittenV7(
    state,
    attacker,
    defender,
    distance,
    attackerDies,
  );
  const feast = attackFeastsV7(state, attacker, {
    defenderDies,
    attackerDies,
    frostbitten,
  });
  // The Candy revision section 8: the Bounce, read after the Push, the
  // advance, and the Charge! follow.
  const bounced = bounceStateV7(state, attacker, defender, {
    distance,
    attackerDies,
    defenderDies,
    advances,
    pushed: push === "WILL_PUSH",
  });
  const undead = undeadCombatEffectsV7({
    // Map curiosities (section 8.6): a neutral Monster never rises either.
    attacker: {
      ...attacker,
      construct:
        unitIsConstructV7(state, attacker) || !unitTakesStatusV7(attacker),
    },
    defender: {
      ...defender,
      construct:
        unitIsConstructV7(state, defender) || !unitTakesStatusV7(defender),
    },
    attackerRule,
    defenderRule,
    damageToDefender,
    damageToAttacker,
    attackerDies,
    defenderDies,
    attackerOnRift: noRisingAtV7(state.board, attacker.at),
    defenderOnRift: noRisingAtV7(state.board, defender.at),
  });
  return {
    attackerId,
    targetUnitId,
    attack2,
    defense2,
    minimumRange: attacker.form === "EMBARKED" ? 0 : attackerRule.minimumRange,
    maximumRange:
      attacker.form === "EMBARKED"
        ? 0
        : attackMaximumRangeV7(
            state,
            attacker,
            tileAtV7(state.board, attacker.at)?.terrain,
          ),
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
    noRetaliationReason: noRetaliationReasonV7({
      defenderDies,
      retaliates,
      unanswered,
      icebound: defenderIcebound,
      frozen: defenderFrozen,
      splatted: wouldRetaliate && splatted,
      terrified: wouldRetaliate && !splatted && terrified,
    }),
    advances,
    push,
    attacksUsed: nextAttacks,
    attacksRemaining: twinShotLeft || (feast && nextAttacks === 1) ? 1 : 0,
    // The Candy redesign (section 6.1): no Candy unit has Overrun.
    overrunAdvance: overrunKindV7(attackerRule) !== null && advances,
    overrunContinues: false,
    // The Candy redesign (section 6.1): no Candy unit has Escape. Ice Folk
    // Freeze (`pulp_wars-w49.37`): an attacker Frozen by Frostbite is not.
    escapeAvailable:
      attackGrantsEscapeV7(attacker, attackerRule) &&
      !attackerDies &&
      !frostbitten,
    splash,
    ...undead,
    // Feast heals to the maximum HP (its Lifesteal included).
    attackerHeal: feast
      ? feastHealV7(attacker, damageToAttacker)
      : undead.attackerHeal,
    feast,
    ...afflictions,
    runUp: runUpAttack2 / 2,
    fortificationIgnored,
    acid,
    defenderArmoured,
    attackerArmoured,
    rayPower,
    // The Martian pass (`pulp_wars-w49.14`, 7r52): not with Heat Sinks
    // (the Ray Gunner's ray then does not overheat).
    coolingApplied:
      rayPower === "FULL" &&
      rayOverheatsV7(
        state,
        attacker,
        ownerResearchedTechsV7(state, attacker.ownerId),
      ),
    defenderShieldDamage,
    attackerShieldDamage,
    shatters,
    coldBloodApplied,
    rockfallApplied,
    plantedApplied,
    blizzardHalved,
    snowCover,
    sweep,
    hiddenBlizzardPossible: false,
    dugIn: fullParts.dugIn,
    unflinchingApplied: unflinching,
    platedApplied:
      platedCapAppliesV7(state, defender, formulaDefenderDamage) ||
      (retaliates && platedCapAppliesV7(state, attacker, rawAttackerDamage)),
    sugarRushApplied: sugarRush2 > 0,
    splatApplied: attackSplatAppliesV7(state, attacker, defender, defenderDies),
    ...bounced,
    ram,
    torpedo,
    iceCover,
    icebound: defenderIcebound,
    shockDamage,
    crackApplied: attackCracksV7(state, attacker, defender, defenderDies),
    frostbiteApplied: frostbitten,
    ...crushPreviewV7(state, attacker, defender, distance, push, {
      defenderDies,
      // A Dinosaur defender that kills the attacker grows (and heals)
      // before the Push step.
      hpAfter: grownHpV7(
        state,
        defender,
        defender.kills,
        defender.kills + (attackerDies ? 1 : 0),
        defender.hp - damageToDefender + undead.defenderHeal,
      ),
      shieldAfter: defenderShield - defenderShieldDamage,
    }),
    siegeHammer,
    wallsDestroyed:
      siegeHammer &&
      siegeHammerRazedCityV7(
        state.cities,
        (ownerId) => arePlayersHostileV7(state, attacker.ownerId, ownerId),
        defender.at,
      ) !== undefined,
    glacialSmash: shatters && glacialThreshold !== null,
    ...candyAttackEffectsV7(state, attacker, defender, {
      distance,
      retaliates,
      attackerDies,
      defenderDies,
      hitOnDefender: damageToDefender + defenderShieldDamage,
      attackerAt: advances
        ? defender.at
        : bounced.bounce === "WILL_BOUNCE" && bounced.bounceTo !== null
          ? bounced.bounceTo
          : attacker.at,
      toothacheAttack,
    }),
  };
}

/**
 * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md sections
 * 6.2, 7.1, 7.3, 7.7, and 7.8): the canonical Candy part of a preview:
 * Stuck, Toothache, a Ricochet on the weakest hostile neighbour of the
 * target that the attacker's owner sees, and the Thump around the tile the
 * attacker stands on after its advance or Bounce. A unit that dies (or
 * rises as another unit) is not "on the board" for a status.
 */
function candyAttackEffectsV7(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  facts: {
    readonly distance: number;
    readonly retaliates: boolean;
    readonly attackerDies: boolean;
    readonly defenderDies: boolean;
    readonly hitOnDefender: number;
    readonly attackerAt: CoordV7;
    readonly toothacheAttack: boolean;
  },
): Pick<
  CombatPreviewV7,
  | "stuckApplied"
  | "toothacheApplied"
  | "toothacheAttack"
  | "ricochet"
  | "thump"
  | "thumpUncertain"
> {
  const statuses = candyExchangeStatusesV7(state, attacker, defender, {
    distance: facts.distance,
    retaliates: facts.retaliates,
    attackerRemains: !facts.attackerDies,
    defenderRemains: !facts.defenderDies,
  });
  const hostile = (unit: UnitStateV7): boolean =>
    unit.hp > 0 && arePlayersHostileV7(state, attacker.ownerId, unit.ownerId);
  const shieldOf = (unitId: UnitId): number =>
    shieldOfV7(state.shields, unitId);
  const ricochet =
    attacker.form === "LAND" &&
    facts.distance === 2 &&
    !isNeutralOwnerV7(attacker.ownerId)
      ? ricochetEntryV7(
          state,
          attacker,
          defender,
          facts.distance,
          facts.hitOnDefender,
          state.units.filter(
            (unit) =>
              hostile(unit) &&
              isUnitVisibleToPlayerV7(state, attacker.ownerId, unit),
          ),
          shieldOf,
        )
      : null;
  const thump =
    !facts.attackerDies && unitThumpDamageV7(state, attacker) > 0
      ? thumpEntriesV7(
          state,
          attacker,
          facts.attackerAt,
          defender.id,
          state.units.filter(hostile),
          shieldOf,
        )
      : [];
  return {
    ...statuses,
    toothacheAttack: facts.toothacheAttack,
    ricochet:
      ricochet === null
        ? null
        : {
            unitId: ricochet.unitId,
            damage: ricochet.damage,
            shieldDamage: ricochet.shieldDamage,
            dies: ricochet.dies,
          },
    thump: thump.map((entry) => ({
      unitId: entry.unitId,
      damage: entry.damage,
      shieldDamage: entry.shieldDamage,
      dies: entry.dies,
    })),
    thumpUncertain: false,
  };
}

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.1): the
 * Crushing Shove part of a canonical preview: the crush state (from the
 * Push preview), the crush on the target's HP after the exchange, and the
 * collision with a hostile unit behind it on the board (it may stand on a
 * tile the attacker has not explored; the canonical estimate knows it).
 */
function crushPreviewV7(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  distance: number,
  push: CombatPreviewV7["push"],
  after: {
    readonly defenderDies: boolean;
    readonly hpAfter: number;
    readonly shieldAfter: number;
  },
): Pick<CombatPreviewV7, "crush" | "crushDamage" | "collisionDamage"> {
  const damage = attackCrushDamageV7(state, attacker, distance);
  const crush = crushStateV7(
    damage,
    defenderCrushableV7(state, defender),
    after.defenderDies,
    push,
  );
  if (crush === "NONE") return { crush, crushDamage: 0, collisionDamage: 0 };
  const hit = fixedSignatureHitV7(
    state,
    { ...defender, hp: after.hpAfter },
    Math.max(0, after.shieldAfter),
    damage,
  );
  const behind = crushBehindTileV7(attacker.at, defender.at);
  const blocker = state.units.find(
    (unit) =>
      unit.hp > 0 &&
      unit.id !== defender.id &&
      unit.id !== attacker.id &&
      same(unit.at, behind) &&
      arePlayersHostileV7(state, attacker.ownerId, unit.ownerId),
  );
  const collision =
    blocker === undefined
      ? 0
      : fixedSignatureHitV7(
          state,
          blocker,
          shieldOfV7(state.shields, blocker.id),
          damage,
        ).damage;
  return { crush, crushDamage: hit.damage, collisionDamage: collision };
}

/**
 * Tuning 1 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`; current rules section
 * 13.2): the raw retaliation of a defender, before Armoured, Plated, and the
 * attacker's Shield. Fortification and cover make the defender take less;
 * they never make it hit harder, so the retaliation is the ordinary formula
 * with the defender's base role Defense (no fortification level) and cover 1:
 *
 *   retaliationForce = defense * hp / maxHp
 *   damage = roundHalfUp(retaliationForce / (attackForce + retaliationForce)
 *                        * defense * 4.5)
 *
 * `attackForceNumerator / attackForceDenominator` is the attacker's force of
 * the same exchange. Shared by canonical resolution and the public preview.
 */
export function retaliationDamageV7(input: {
  readonly attackForceNumerator: bigint;
  readonly attackForceDenominator: bigint;
  readonly defense2: number;
  readonly hp: number;
  readonly maxHp: number;
}): number {
  const forceNumerator = BigInt(input.defense2) * BigInt(input.hp);
  const forceDenominator = 2n * BigInt(input.maxHp);
  const attackOnCommon = input.attackForceNumerator * forceDenominator;
  const defenseOnCommon = forceNumerator * input.attackForceDenominator;
  const total = attackOnCommon + defenseOnCommon;
  if (total <= 0n) return 0;
  return roundHalfUp(defenseOnCommon * BigInt(input.defense2) * 9n, total * 4n);
}

/**
 * Tuning 1 Breach (`pulp_wars-w49.3`; current rules section 13.3): whether
 * an `ATTACK` breaches: a land-form attacker at distance 1 whose kind's
 * capabilities under its owner's research have `breach` (Explosives, under
 * its name in every tree). `techs` is the attacker's owner's research.
 */
export function attackBreachesV7(
  roster: FactionRosterV7,
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form">,
  distance: number,
  techs: Parameters<typeof unitCapabilitiesV7>[2],
): boolean {
  return (
    attacker.form === "LAND" &&
    distance === 1 &&
    unitCapabilitiesV7(roster, attacker, techs).breach
  );
}

/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1): the
 * tile a ram shoves its surviving target onto, or null when nothing moves.
 * The target goes one tile directly away from the boat, only onto a tile
 * that is on the board, explored by the attacker, water that is not a dock
 * (Port or Shipyard), holds no unit, and is Shallow Water, or Deep Water
 * only when the target stands on Deep Water (the Tractor Beam's public
 * rule: the target owner's Navigation is private).
 */
export function ramShoveDestinationV7(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
): CoordV7 | null {
  const destination = {
    x: defender.at.x + Math.sign(defender.at.x - attacker.at.x),
    y: defender.at.y + Math.sign(defender.at.y - attacker.at.y),
  };
  const tile = tileAtV7(state.board, destination);
  if (
    tile === undefined ||
    !requirePlayer(state, attacker.ownerId).explored.some((at) =>
      same(at, destination),
    ) ||
    !ramShoveTileOpenV7(
      tile,
      tileAtV7(state.board, defender.at)?.terrain,
      tileOccupiedV7(state, destination, defender.id),
      isIceAtV7(state, destination),
    )
  )
    return null;
  return destination;
}

/**
 * The tile part of the ram's shove (section 4.1), shared by resolution and
 * the public preview: open water that is not ice and not a dock, with no
 * unit on it, Shallow Water, or Deep Water only for a target standing on
 * Deep Water.
 */
export function ramShoveTileOpenV7(
  tile: { readonly terrain: string; readonly improvement: string | null },
  targetTerrain: string | undefined,
  occupied: boolean,
  ice: boolean,
): boolean {
  return (
    !occupied &&
    !ice &&
    tile.improvement !== "PORT" &&
    tile.improvement !== "SHIPYARD" &&
    (tile.terrain === "SHALLOW_WATER" ||
      (tile.terrain === "DEEP_WATER" && targetTerrain === "DEEP_WATER"))
  );
}

/**
 * The Candy revision (section 7): `noRetaliationReason` of an exchange.
 * `splatted` is whether the defender would have retaliated under the
 * ordinary rules but was Splatted; otherwise the ordinary reason applies.
 */
export function noRetaliationReasonV7(facts: {
  readonly defenderDies: boolean;
  readonly retaliates: boolean;
  readonly unanswered: boolean;
  /** The frozen sea (naval branch section 8.9): the defender is icebound. */
  readonly icebound: boolean;
  /** Ice Folk Freeze (`pulp_wars-w49.37`): the defender is Frozen. */
  readonly frozen: boolean;
  readonly splatted: boolean;
  /**
   * The Vampire and Banshee rework (`pulp_wars-ty6i`): the defender would
   * have retaliated but was terrified by a Wail this turn (Terror).
   */
  readonly terrified?: boolean;
}): CombatPreviewV7["noRetaliationReason"] {
  return facts.defenderDies
    ? "DEFENDER_DIED"
    : facts.retaliates
      ? null
      : facts.unanswered
        ? "UNANSWERED"
        : facts.icebound
          ? "ICEBOUND"
          : facts.frozen
            ? "FROZEN"
            : facts.splatted
              ? "SPLATTED"
              : facts.terrified === true
                ? "TERROR"
                : "OUT_OF_RANGE";
}

/**
 * The Candy revision (section 7): whether an `ATTACK` Splats its target: a
 * land-form attacker whose role has `SPLAT`, a target that survives the
 * attack, and never the neutral Monster (no status sticks to it).
 */
export function attackSplatAppliesV7(
  roster: FactionRosterV7,
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form">,
  defender: Pick<UnitStateV7, "ownerId">,
  defenderDies: boolean,
): boolean {
  return (
    !defenderDies &&
    !isNeutralOwnerV7(defender.ownerId) &&
    attackSplatsV7(roster, attacker)
  );
}

/**
 * The Candy revision (section 8): the Bounce of an exchange on canonical
 * state. The attacker and the defender are read after the Push (`pushed`),
 * the advance, and the Charge! follow (`advances`); the attacker is bounced
 * one tile directly away from the defender when that tile passes the Push
 * conditions for the attacker and holds no treasure chest.
 */
export function bounceStateV7(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  facts: {
    readonly distance: number;
    readonly attackerDies: boolean;
    readonly defenderDies: boolean;
    readonly advances: boolean;
    readonly pushed: boolean;
  },
): Pick<CombatPreviewV7, "bounce" | "bounceTo"> {
  if (!attackIsBouncedV7(state, attacker, defender, facts))
    return { bounce: "NONE", bounceTo: null };
  const defenderAt = facts.pushed
    ? (pushedDestinationV7(state, attacker, defender) ?? defender.at)
    : defender.at;
  const attackerAt = facts.advances ? defender.at : attacker.at;
  if (chebyshev(attackerAt, defenderAt) !== 1)
    return { bounce: "NONE", bounceTo: null };
  const destination = bounceDestinationV7(attackerAt, defenderAt);
  return displacementDestinationLegalV7(state, attacker, destination) &&
    !state.treasureChests.some((chest) => same(chest, destination))
    ? { bounce: "WILL_BOUNCE", bounceTo: destination }
    : { bounce: "BLOCKED", bounceTo: null };
}

/** Options of a combat preview or estimate (the Ice Folk revision). */
export interface CombatOptionsV7 {
  /**
   * Evaluates the attack as if the target were Frozen (Ice Folk Freeze,
   * `pulp_wars-w49.37`; the Normal AI's Bolas rule).
   */
  readonly assumeTargetFrozen?: boolean;
  /**
   * Telemetry only (section 16.2): the same exchange without the Blizzard's
   * halving, without Snow cover, or without Shatter, to measure what each
   * prevented. Never used by a rule or a public query.
   */
  readonly ignoreBlizzard?: boolean;
  readonly ignoreSnowCover?: boolean;
  readonly ignoreShatter?: boolean;
  /**
   * The Dwarf revision telemetry (section 19.2): the same exchange without
   * Dig In or without Plated, to measure what each prevented.
   */
  readonly ignoreDigIn?: boolean;
  readonly ignorePlated?: boolean;
  /**
   * The Candy revision (docs/product/RULESET_7_CANDY.md section 13):
   * estimates the attacker as Rushed (for the Normal AI and the Rush
   * preview); the bonus and the Rush perk then apply under the ordinary
   * first-attack conditions, for a unit that could Rush.
   */
  readonly assumeSugarRush?: boolean;
  /**
   * The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 6.2): evaluates
   * the hit without the attacker's Toothache (a Whirl is not an `ATTACK`).
   */
  readonly ignoreToothache?: boolean;
}

/**
 * The Ice Folk revision section 7.7: whether `attacker` may advance onto
 * `at` (a unit that avoids foreign sites never ends on a settlement center
 * it does not own).
 */
export function advanceSiteAllowedV7(
  roster: FactionRosterV7 & { readonly surfacedThisTurn?: readonly UnitId[] },
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form">,
  site: "CAPITAL" | "VILLAGE" | "CITY" | null,
  cityOwnerId: PlayerId | null,
): boolean {
  if (!unitAvoidsForeignSitesV7(roster, attacker)) return true;
  return flyerMayStandOnSiteV7(site, cityOwnerId, attacker.ownerId);
}

/**
 * The Ice Folk revision section 7.5: one Sweep flank entry: the fixed Sweep
 * damage, reduced by Armoured, taken from the victim's Shield first, capped
 * at its HP. `damage` is HP damage.
 */
export function sweepEntryV7(
  roster: FactionRosterV7,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form" | "at" | "hp">,
  shield: number,
  sweepDamage: number,
): CombatSplashEntryV7 {
  const hit = absorbHitV7(
    shield,
    unit.hp,
    armouredDamageV7(roster, unit, sweepDamage),
  );
  return {
    unitId: unit.id,
    at: unit.at,
    damage: hit.hpDamage,
    dies: hit.hpDamage >= unit.hp,
    shieldDamage: hit.shieldDamage,
  };
}

function sortedByPosition<
  U extends { readonly id: number; readonly at: CoordV7 },
>(units: readonly U[]): U[] {
  return [...units].sort(
    (left, right) =>
      left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
  );
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
  /** The Dwarf revision section 7.2: a construct never rises. */
  readonly construct?: boolean;
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
  /** The Rift (RULESET_7_RIFT.md section 4): nothing rises on a Rift. */
  readonly attackerOnRift: boolean;
  readonly defenderOnRift: boolean;
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
      input.attacker.construct !== true &&
      !input.attackerOnRift &&
      input.defenderRule.abilities.includes("INFECT"),
    defenderInfected:
      input.defenderDies &&
      input.defender.form === "LAND" &&
      input.defender.construct !== true &&
      !input.defenderOnRift &&
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
  // The Dwarf revision section 10.1: a Steam Cannon's Knockback.
  if (attackKnocksBackV7(state, attacker))
    return knockbackStateV7(state, attacker, defender, true) === "WILL_PUSH"
      ? knockbackDestinationV7(attacker.at, defender.at)
      : null;
  // The naval branch section 4.1: a ram's shove.
  if (
    attackIsRamV7(
      state,
      attacker,
      defender,
      chebyshev(attacker.at, defender.at),
      ownerResearchedTechsV7(state, attacker.ownerId),
    )
  )
    return ramShoveDestinationV7(state, attacker, defender);
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
  // Revision 19 section 6.2: an Egg cannot be pushed or displaced. Map
  // curiosities (section 8.6): nothing moves the neutral Monster.
  if (moved.form === "EGG" || isNeutralOwnerV7(moved.ownerId)) return false;
  // The ninth unit (7r55): Rock Hard, nothing moves a Jawbreaker.
  if (unitIsImmovableV7(state, moved)) return false;
  // The frozen sea (naval branch sections 8.3 and 8.9): no Push, Knockback,
  // or pull moves an icebound unit; a land-form unit may be moved onto ice
  // and a unit afloat never.
  if (unitIsIceboundV7(state, moved)) return false;
  const tile = tileAtV7(state.board, destination);
  if (tile === undefined || tile.site !== null) return false;
  const owner = requirePlayer(state, moved.ownerId);
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(state, moved),
      afloat: isAfloatFormV7(moved.form),
      ice: isIceAtV7(state, destination),
      engineering:
        technology?.engineering ??
        owner.researchedTechs.includes("ENGINEERING"),
      navigation:
        technology?.navigation ?? owner.researchedTechs.includes("NAVIGATION"),
      // The Ice Folk revision section 7.1: a Mountain-born unit may be
      // pushed or pulled onto a Mountain.
      mountainBorn: unitIsMountainBornV7(state, moved),
    }) ||
    // The Dwarf revision section 5.3: the occupancy predicate (no unit and
    // no mound).
    tileOccupiedV7(state, destination, moved.id)
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

/**
 * The Dwarf revision section 10.1: the Knockback of a Steam Cannon's attack
 * on a surviving target: one tile directly away from the Cannon under the
 * Push conditions (explored by the attacker, empty, not a settlement site,
 * the same land or water kind, enterable, not allied territory) and the
 * Tractor Beam's chest condition. A `JUGGERNAUT`-role unit, a two-slot
 * unit, and an Egg are never knocked back.
 */
export function knockbackStateV7(
  state: GameStateV7,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  survives: boolean,
): CombatPreviewV7["push"] {
  if (
    !survives ||
    defender.form === "EGG" ||
    defender.role === "JUGGERNAUT" ||
    // Map curiosities round 2 (section 31): Knockback never moves a
    // neutral unit.
    isNeutralOwnerV7(defender.ownerId) ||
    unitCapacitySlotsV7(state, defender) !== 1 ||
    // The ninth unit (7r55): Rock Hard.
    unitIsImmovableV7(state, defender)
  )
    return "BLOCKED";
  const destination = knockbackDestinationV7(attacker.at, defender.at);
  if (tileAtV7(state.board, destination) === undefined) return "BLOCKED";
  if (
    !requirePlayer(state, attacker.ownerId).explored.some((at) =>
      same(at, destination),
    )
  )
    return "UNKNOWN_BEHIND_FOG";
  return displacementDestinationLegalV7(state, defender, destination) &&
    !state.treasureChests.some((chest) => same(chest, destination))
    ? "WILL_PUSH"
    : "BLOCKED";
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
    // The ninth unit (7r55): Rock Hard.
    unitIsImmovableV7(state, defender) ||
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
