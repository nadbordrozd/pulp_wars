import {
  ALPHA_ATTACK2_V7,
  EGG_DEFENSE2_V7,
  EMBARKED_MOVE_V7,
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  MIND_CONTROL_LIMIT_V7,
  PROMOTION_HP_V7,
  RUN_UP_MAXIMUM_TILES_V7,
  attackIsChargeV7,
  attackIsRayV7,
  chargeRunUpAttack2V7,
  halfPowerAttack2V7,
  isMindControlledV7,
  ownerResearchedTechsV7,
  rebakeHpV7,
  rebakePriceV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitAlphaAttack2V7,
  unitGrowthStageV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../rules/ruleset-v7";
import {
  defenseBonusForUnitV7,
  fortificationPartsForUnitV7,
  snowCoverAppliesV7,
} from "./combat";
import {
  attackSplatsV7,
  crumbsBiteV7,
  matchHasCandyV7,
  sugarRushAttack2V7,
  unitBouncesV7,
  unitIsCrashedV7,
  unitIsRushedV7,
  unitIsSplattedV7,
} from "./candy";
import { attackAllowanceV7, matchHasDwarvesV7, unitIsDugInV7 } from "./dwarf";
import {
  chillOfV7,
  isBlizzardV7,
  isSnowV7,
  shatterThresholdV7,
  unitGlidesV7,
  unitOwnerIsIceFolkV7,
} from "./ice-folk";
import {
  controlledByBrainV7,
  isCoolingV7,
  shieldOfV7,
  unitShieldMaximumV7,
} from "./martian";
import { tileAtV7 } from "./spatial-economy";
import type { GameStateV7, UnitStateV7 } from "./types";

export const UNIT_STAT_IDS_V7 = Object.freeze([
  "HP",
  // The Martian revision: present exactly for a unit with a Shield maximum.
  "SHIELD",
  "ATTACK",
  "DEFENSE",
  "MOVE",
  "RANGE",
  "SIGHT",
] as const);
export type UnitStatIdV7 = (typeof UNIT_STAT_IDS_V7)[number];
export type UnitStatModifierSourceV7 =
  | "PROMOTION"
  // Revision 19: growth HP of a Big or Alpha unit, and Alpha's +1 Attack.
  | "GROWTH"
  | "ALPHA"
  | "CHARGE"
  // Revision 20: the Charge! run-up of a Triceratops that moved this turn.
  | "RUN_UP"
  // The Martian revision: a heat ray at half power (moved or Cooling), and
  // the Shield a Force Field added above the unit's own maximum.
  | "HALF_POWER"
  | "FORCE_FIELD"
  | "INSPIRED"
  | "CITY_WALLS"
  | "CITY_FORTIFICATION"
  | "FIELD_DEFENSE"
  | "MOUNTAIN"
  | "FOREST"
  | "HIGH_GROUND"
  // The Ice Folk revision: Snow cover (Defense), and the Attack sources
  // Planted (a stat modifier), Rockfall, and Cold Blood (the latter two
  // depend on the target and are applied by the combat preview).
  | "SNOW"
  | "PLANTED"
  | "ROCKFALL"
  | "COLD_BLOOD"
  // The Dwarf revision: Dig In, one fortification level in the Field Defense
  // part (shown when the tile's Field Defense does not already count).
  | "DIG_IN"
  // The Candy revision: the Sugar Rush bonus on a Rushed unit's first attack
  // (never together with Charge or Inspired).
  | "SUGAR_RUSH";
export interface PublicUnitStatValueV7 {
  readonly numerator: number;
  readonly denominator: number;
}
export interface PublicUnitStatTermV7 {
  readonly value: PublicUnitStatValueV7;
  readonly source: "ROLE_BASE" | UnitStatModifierSourceV7;
  readonly sourceLabel: string;
  readonly description: string;
}
export interface PublicUnitStatBreakdownV7 {
  readonly id: UnitStatIdV7;
  readonly label: string;
  readonly current: number | null;
  readonly base: PublicUnitStatTermV7;
  readonly modifiers: readonly PublicUnitStatTermV7[];
  readonly total: PublicUnitStatValueV7;
  /** Omitted means the exact historical contract; BASE_ONLY redacts position. */
  readonly visibility?: "BASE_ONLY";
}
/**
 * Revision 17 Goblin role mechanics from the owner's registration: Kaboom
 * and death-blast damage (null when the role has none), the WAAAGH! radius
 * (0 without Rally), Start Turn regeneration, and whether the role may build
 * Field Defense.
 */
export interface PublicGoblinMechanicsV7 {
  readonly kaboomDamage: number | null;
  readonly deathBlastDamage: number | null;
  readonly rallyRadius: number;
  readonly regeneration: number;
  readonly buildsFieldDefense: boolean;
}
/**
 * Revision 19 Dinosaur role mechanics and growth from the owner's
 * registration: capacity slots, the growth stage (null for a role that does
 * not grow) and the kills still needed for the next stage (null at Alpha or
 * for a role that does not grow), the Armoured reduction, Acid, the Charge!
 * run-up bonus in whole Attack per tile moved and the most tiles that count
 * (revision 20; both 0 without Charge!), and the Egg countdown (null for a
 * unit that is not an Egg).
 */
export interface PublicDinosaurMechanicsV7 {
  readonly capacitySlots: number;
  readonly growthStage: 0 | 1 | 2 | null;
  readonly killsToNextStage: number | null;
  readonly armourReduction: number;
  readonly acid: boolean;
  readonly runUpBonus: number;
  readonly runUpMaximum: number;
  readonly egg: {
    readonly turnsRemaining: number;
    readonly hatchesAs: UnitStateV7["role"];
  } | null;
}
/**
 * The Martian revision (section 11): the Martian mechanics of a unit of the
 * Martian kind. `rayPower` is what an `ATTACK` made now would be (null for
 * a unit without a heat ray or afloat); `cooling` is whether its next ray
 * is halved by Cooling; `mindControl` is a Brain's cooldown entry
 * (`cooldown`: the remaining `turnsRemaining`, or null when ready), the
 * units it controls (the Mind Control revision: `controlled`), and the
 * limit (`controlLimit`). `capacitySlots` is 0 for a mind-controlled unit
 * (it has no home).
 */
export interface PublicMartianMechanicsV7 {
  readonly shield: number;
  readonly shieldMaximum: number;
  readonly capacitySlots: number;
  readonly movementMode: "GROUND" | "STRIDE" | "FLY";
  readonly rayPower: "FULL" | "HALF" | null;
  readonly cooling: boolean;
  readonly pierce: boolean;
  readonly forceField: boolean;
  readonly mindControl: {
    readonly cooldown: number | null;
    readonly controlled: number;
    readonly controlLimit: number;
  } | null;
}

/**
 * The Mind Control revision (section 6): the control of a mind-controlled
 * unit: its Brain (null in a view that cannot see it) and its original
 * owner (public).
 */
export interface PublicMindControlV7 {
  readonly brainUnitId: UnitStateV7["id"] | null;
  readonly originalOwnerId: UnitStateV7["ownerId"];
}
/**
 * The Ice Folk revision (section 11): the Ice Folk mechanics of a unit owned
 * by an Ice Folk seat, from the Snow the viewer knows.
 */
export interface PublicIceFolkMechanicsV7 {
  readonly onSnow: boolean;
  /** The unit's tile is in a Blizzard the viewer knows of. */
  readonly inBlizzard: boolean;
  /** Snow cover applies to the unit now (Snow and fortification 0). */
  readonly snowCover: boolean;
  readonly glides: boolean;
  readonly mountainBorn: boolean;
  /** The owner's Shatter threshold (public: it tells Brittle). */
  readonly shatterThreshold: number;
  /** A Yeti in land form standing on a Mountain (Rockfall reach). */
  readonly rockfall: boolean;
  /**
   * A Boulder Yeti's attack made now: true when Planted, false after a Move;
   * null for every other role and afloat.
   */
  readonly planted: boolean | null;
  readonly sweepDamage: number;
  /** A land-form Ice Witch (her Blizzard). */
  readonly blizzard: boolean;
}
/**
 * The Dwarf revision (section 14): the Dwarf mechanics of a unit owned by a
 * Dwarf seat. `dugIn` is the canonical Dig In (public: activations are
 * public and Dig In stores nothing); `shotsLeft` is what a Clockwork Gunner
 * may still fire (this turn on its owner's turn, otherwise on its owner's
 * next turn if it does not move), null for every other role;
 * `eruptionDamage` and `bombDamage` are the owner's (public: they tell
 * Blasting Charges and Dive); `burrowed` marks a mound's record.
 */
export interface PublicDwarfMechanicsV7 {
  readonly construct: boolean;
  readonly machine: boolean;
  readonly dugIn: boolean;
  readonly digsIn: boolean;
  readonly shotsLeft: number | null;
  readonly plated: number | null;
  readonly tunnelRange: number;
  readonly eruptionDamage: number;
  readonly bombDamage: number;
  readonly burrowed: boolean;
}
/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 13): the Candy
 * mechanics of a unit of the Candy kind. `sugarRush` is whether the unit's
 * role may Rush (every land role, in land form); `rebake` is the price and
 * HP of a Re-bake of its role (null for a role that leaves no Crumbs);
 * `homeSweetHome` is the owner's unit-level capability and `crumbsBite` the
 * owner's Peppermint Surprise damage (both public: they make every Candy
 * preview exact).
 */
export interface PublicCandyMechanicsV7 {
  readonly sugarRush: boolean;
  readonly rushPerk: "ESCAPE" | "SUGAR_FRENZY" | null;
  readonly bounces: boolean;
  readonly splats: boolean;
  readonly rebake: { readonly cost: number; readonly hp: number } | null;
  readonly homeSweetHome: boolean;
  readonly crumbsBite: number;
}
export interface PublicUnitStatsV7 {
  readonly unitId: UnitStateV7["id"];
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly stats: readonly PublicUnitStatBreakdownV7[];
  readonly abilities: readonly string[];
  readonly statuses: readonly string[];
  /**
   * Revision 17: present exactly for units of the Goblin kind (the Mind
   * Control revision: every faction block follows the unit's kind).
   */
  readonly goblin?: PublicGoblinMechanicsV7;
  /** Revision 19: present exactly for units of the Dinosaur kind. */
  readonly dinosaur?: PublicDinosaurMechanicsV7;
  /** The Martian revision: present exactly for units of the Martian kind. */
  readonly martian?: PublicMartianMechanicsV7;
  /**
   * The Mind Control revision: present for every unit exactly when the
   * match has a Martian seat; null unless the unit is mind-controlled.
   */
  readonly mindControl?: PublicMindControlV7 | null;
  /**
   * The Ice Folk revision: the unit's Chill entry (`null` without one);
   * present for every unit.
   */
  readonly chill: {
    readonly sluggish: boolean;
    readonly turnsLeft: number;
  } | null;
  /** The Ice Folk revision: present exactly for units of the Ice Folk kind. */
  readonly iceFolk?: PublicIceFolkMechanicsV7;
  /**
   * The Dwarf revision: present for every unit exactly when the match has a
   * Dwarf seat: the unit was bombed this turn, or surfaced this turn.
   */
  readonly bombedThisTurn?: boolean;
  readonly surfacedThisTurn?: boolean;
  /** The Dwarf revision: present exactly for units of the Dwarf kind. */
  readonly dwarf?: PublicDwarfMechanicsV7;
  /**
   * The Candy revision: present for every unit exactly when the match has a
   * Candy seat: the unit is Rushed, Crashed, Splatted this turn, or was
   * healed by a Sugar Toss this turn.
   */
  readonly rushed?: boolean;
  readonly crashed?: boolean;
  readonly splatted?: boolean;
  readonly tossedThisTurn?: boolean;
  /** The Candy revision: present exactly for units of the Candy kind. */
  readonly candy?: PublicCandyMechanicsV7;
}

/** The Snow and Blizzard a stats reader may know of (section 6.5). */
export interface WinterLookupV7 {
  readonly snowAt: (at: { readonly x: number; readonly y: number }) => boolean;
  readonly blizzardAt: (at: {
    readonly x: number;
    readonly y: number;
  }) => boolean;
}

/**
 * Public unit stats. `winter` is the Snow and Blizzard the caller may read:
 * the canonical ones by default, or (in a view) the ones the viewer knows
 * of, so that a hidden Witch's Blizzard never leaks through the stats.
 */
export function publicUnitStatsV7(
  state: GameStateV7,
  unit: UnitStateV7,
  winter: WinterLookupV7 = {
    snowAt: (at) => isSnowV7(state, at),
    blizzardAt: (at) => isBlizzardV7(state, at),
  },
): PublicUnitStatsV7 {
  const snowAt = winter.snowAt;
  const role = unitRoleRuleV7(state, unit);
  const embarked = unit.form === "EMBARKED";
  // Map curiosities (section 10.5): the controller's research, empty for
  // the neutral owner (it throws for any other unknown owner).
  const research = ownerResearchedTechsV7(state, unit.ownerId);
  const chillEntry = chillOfV7(state.chilled, unit.id);
  const chill =
    chillEntry === undefined
      ? null
      : { sluggish: chillEntry.sluggish, turnsLeft: chillEntry.turnsLeft };
  if (unit.form === "EGG") return eggStats(state, unit, role.label);
  // The Mind Control revision (section 2): the labels, stats, and faction
  // blocks follow the unit's kind; unit-level technology is the
  // controller's research through the kind's tree.
  const kind = unitFactionV7(state, unit);
  const capabilities = unitCapabilitiesV7(state, unit, research);
  // Revision 13: Undead support labels Rally as Frenzy and Inspired as Frenzied.
  const frenzied = kind === "UNDEAD";
  // Revision 17: Goblins label Rally as WAAAGH! and Overrun as Ram.
  const goblin = kind === "GOBLIN";
  // Revision 19: Dinosaurs label Rally as War Drums, Overrun as Rampage, and
  // Charge as Pounce.
  const dinosaur = kind === "DINOSAUR";
  // The Martian revision: Martians label Rally as Psychic Command and Charge
  // as Strafe.
  const martian = kind === "MARTIAN";
  const controlEntry =
    state.mindControlled.length === 0
      ? undefined
      : state.mindControlled.find((entry) => entry.unitId === unit.id);
  const controlled = isMindControlledV7(state, unit.id);
  const shieldMaximum = unitShieldMaximumV7(state, unit);
  const shield = shieldOfV7(state.shields, unit.id);
  const cooling = isCoolingV7(state.cooling, unit.id);
  // Section 6.1: half power while Cooling, or (during its owner's turn,
  // before the Start Turn reset) after it moved this turn.
  const rayPower: "FULL" | "HALF" | null = !attackIsRayV7(state, unit)
    ? null
    : cooling ||
        (state.turnOrder[state.activeSeatIndex] === unit.ownerId &&
          unit.activation.moved)
      ? "HALF"
      : "FULL";
  const mechanics = unitRoleMechanicsV7(state, unit);
  const growthStage = unitGrowthStageV7(state, unit);
  const alpha = embarked ? 0 : unitAlphaAttack2V7(state, unit);
  const promotion = unit.maxHp - role.maxHp;
  const charge =
    !embarked &&
    research.includes("RAIDING") &&
    role.abilities.includes("CHARGE") &&
    unit.activation.moved &&
    unit.activation.movedPathLength >= 2 &&
    unit.activation.attacksUsed === 0
      ? 2
      : 0;
  const inspired =
    !embarked && unit.activation.inspired && unit.activation.attacksUsed === 0
      ? 2
      : 0;
  // The Candy revision section 5.2: the Rush bonus of a Rushed unit's first
  // attack; it never adds to Charge or Inspired.
  const sugarRush2 = sugarRushAttack2V7(state, unit, {
    chargeApplied: charge > 0,
    inspiredApplied: inspired > 0,
  });
  const candy = kind === "CANDY";
  // Revision 20 Charge!: +1 Attack per tile moved this turn, up to 2, while
  // the unit can still attack (activations reset at the owner's Start Turn,
  // so a run-up left over from the owner's last turn is never shown).
  const runUp =
    state.turnOrder[state.activeSeatIndex] === unit.ownerId &&
    !unit.activation.attacked &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed
      ? chargeRunUpAttack2V7(state, unit)
      : 0;
  const linebreaker = attackIsChargeV7(state, unit);
  const defense = defenseBonusForUnitV7(state, unit, snowAt);
  // The Ice Folk revision section 6.2: the cover comes from Snow (the
  // Forest and Mountain cover are the same multiplier, never added).
  const snowCover = snowCoverAppliesV7(state, unit, snowAt);
  // Section 7.6 Planted: what an attack made now (or on the owner's next
  // turn, before any Move) would have.
  const iceFolk = unitOwnerIsIceFolkV7(state, unit);
  const planted =
    !embarked &&
    unit.form === "LAND" &&
    mechanics.plantedBonus2 > 0 &&
    !(
      state.turnOrder[state.activeSeatIndex] === unit.ownerId &&
      unit.activation.moved
    );
  const fortificationModifiers = fortificationTerms(state, unit);
  const fortifiedDefense2 =
    (embarked ? 2 : role.defense2) +
    fortificationModifiers.reduce(
      (sum, term) => sum + term.value.numerator * 2,
      0,
    );
  const terrainSource = defenseSourceAt(
    state,
    unit,
    defense.numerator,
    snowCover,
  );
  const defenseDelta = rational(
    fortifiedDefense2 * (defense.numerator - defense.denominator),
    2 * defense.denominator,
  );
  const highGround =
    tileAtV7(state.board, unit.at)?.terrain === "MOUNTAIN" &&
    capabilities.highGroundVisionRadiusBonus === 1;
  const sight = embarked
    ? 1
    : Math.max(role.sightRadius, capabilities.roleSightRadius[unit.role] ?? 0);
  const labelText = embarked ? "Embarked transport" : role.label;
  const halfPower2 =
    rayPower === "HALF" ? role.attack2 - halfPowerAttack2V7(role.attack2) : 0;
  return {
    unitId: unit.id,
    minimumRange: embarked ? 0 : role.minimumRange,
    maximumRange: embarked ? 0 : role.range,
    stats: [
      stat(
        "HP",
        "HP",
        unit.hp,
        base(labelText, "maximum HP", role.maxHp),
        promotion > 0
          ? [
              growthStage === null
                ? modifier(
                    promotion,
                    "PROMOTION",
                    "Promotion",
                    `Promotion adds ${PROMOTION_HP_V7} maximum HP and fully heals.`,
                  )
                : modifier(
                    promotion,
                    "GROWTH",
                    "Growth",
                    `Each growth stage adds ${GROWTH_HP_V7} maximum HP and fully heals.`,
                  ),
            ]
          : [],
      ),
      // The Martian revision: the Shield row follows the HP row.
      ...(shieldMaximum > 0
        ? [
            stat(
              "SHIELD",
              "Shield",
              shield,
              base(labelText, "Shield", shieldMaximum),
              shield > shieldMaximum
                ? [
                    modifier(
                      shield - shieldMaximum,
                      "FORCE_FIELD",
                      "Force Field",
                      "A unit that recharges next to a Shield Projector recharges to a higher Shield.",
                    ),
                  ]
                : [],
            ),
          ]
        : []),
      stat(
        "ATTACK",
        "Attack",
        null,
        base(labelText, "Attack", embarked ? 0 : role.attack2, 2),
        [
          ...(halfPower2 > 0
            ? [
                modifier(
                  -halfPower2,
                  "HALF_POWER",
                  "Half power",
                  cooling
                    ? "Cooling: the heat ray fires at half power until the end of its owner's next turn."
                    : "A heat ray fires at half power after the unit moved this turn.",
                  2,
                ),
              ]
            : []),
          ...(alpha > 0
            ? [
                modifier(
                  ALPHA_ATTACK2_V7,
                  "ALPHA",
                  "Alpha",
                  "An Alpha adds 1 Attack to every attack it makes.",
                  2,
                ),
              ]
            : []),
          ...(planted
            ? [
                modifier(
                  mechanics.plantedBonus2,
                  "PLANTED",
                  "Planted",
                  "A Boulder Yeti that has not moved this turn has +1 Attack.",
                  2,
                ),
              ]
            : []),
          ...(runUp > 0
            ? [
                modifier(
                  runUp,
                  "RUN_UP",
                  "Charge!",
                  `Charge! adds ${formatHalf(mechanics.runUpBonus2)} Attack per tile moved this turn (up to ${RUN_UP_MAXIMUM_TILES_V7} tiles).`,
                  2,
                ),
              ]
            : []),
          ...(charge > 0
            ? [
                modifier(
                  charge,
                  "CHARGE",
                  dinosaur ? "Pounce" : martian ? "Strafe" : "Charge",
                  dinosaur
                    ? "Pounce adds 1 Attack after an ordinary move of at least two cells."
                    : martian
                      ? "Strafe adds 1 Attack after a Move of at least two tiles."
                      : "Charge adds 1 Attack after an ordinary move of at least two cells.",
                  2,
                ),
              ]
            : []),
          ...(inspired > 0
            ? [
                modifier(
                  inspired,
                  "INSPIRED",
                  frenzied
                    ? "Frenzied"
                    : goblin
                      ? "WAAAGH!"
                      : dinosaur
                        ? "War Drums"
                        : martian
                          ? "Psychic Command"
                          : "Inspired",
                  frenzied
                    ? "Necromancer Frenzy adds 1 Attack to the next attack this turn."
                    : goblin
                      ? "Orc Warboss WAAAGH! adds 1 Attack to the next attack this turn."
                      : dinosaur
                        ? "Shaman War Drums add 1 Attack to the next attack this turn."
                        : martian
                          ? "Brain Psychic Command adds 1 Attack to the next attack this turn."
                          : "Captain Rally adds 1 Attack to the next attack this turn.",
                  2,
                ),
              ]
            : []),
          ...(sugarRush2 > 0
            ? [
                modifier(
                  sugarRush2,
                  "SUGAR_RUSH",
                  "Sugar Rush",
                  "Sugar Rush adds 1 Attack to the first attack this turn.",
                  2,
                ),
              ]
            : []),
        ],
      ),
      stat(
        "DEFENSE",
        "Defense",
        null,
        base(labelText, "Defense", embarked ? 2 : role.defense2, 2),
        [
          ...fortificationModifiers,
          ...(terrainSource === null
            ? []
            : [
                modifier(
                  defenseDelta.numerator,
                  terrainSource,
                  terrainSource === "SNOW"
                    ? "Snow cover"
                    : label(terrainSource),
                  terrainSource === "SNOW"
                    ? `Snow cover multiplies an unfortified Ice Folk unit's Defense by ${String(defense.numerator / defense.denominator)}.`
                    : `${label(terrainSource)} multiplies Defense by ${String(defense.numerator / defense.denominator)}.`,
                  defenseDelta.denominator,
                ),
              ]),
        ],
      ),
      stat(
        "MOVE",
        "Move",
        null,
        base(labelText, "Move", embarked ? EMBARKED_MOVE_V7 : role.move),
        [],
      ),
      stat(
        "RANGE",
        "Range",
        null,
        base(labelText, "Range", embarked ? 0 : role.range),
        [],
      ),
      stat(
        "SIGHT",
        "Sight",
        null,
        base(labelText, "Sight", sight),
        highGround
          ? [
              modifier(
                1,
                "HIGH_GROUND",
                "High ground",
                "Engineering adds 1 Sight while standing on a Mountain.",
              ),
            ]
          : [],
      ),
    ],
    abilities: embarked ? [] : role.abilities,
    statuses: [
      ...(unit.activation.inspired && unit.activation.attacksUsed === 0
        ? [
            frenzied
              ? "Frenzied: +1 next Attack"
              : goblin
                ? "WAAAGH!: +1 Attack on the next attack"
                : dinosaur
                  ? "War Drums: +1 Attack on the next attack"
                  : martian
                    ? "Psychic Command: +1 Attack on the next attack"
                    : "Inspired: +1 next Attack",
          ]
        : []),
      ...(runUp > 0 ? [`Charge! +${formatHalf(runUp)} Attack`] : []),
      ...(unit.activation.tendedThisTurn ? ["Tended this turn"] : []),
      ...(unit.activation.overrunActive
        ? [
            goblin
              ? "Ram: attack again"
              : dinosaur
                ? "Rampage: attack again"
                : candy
                  ? "Sugar Frenzy: attack again"
                  : "Overrun: attack again",
          ]
        : []),
      ...(unit.activation.escapeAvailable ? ["Escape: may move again"] : []),
    ],
    chill,
    ...(goblin
      ? {
          goblin: {
            kaboomDamage: mechanics.kaboomDamage,
            deathBlastDamage: mechanics.deathBlastDamage,
            rallyRadius: role.abilities.includes("RALLY")
              ? mechanics.rallyRadius
              : 0,
            regeneration: mechanics.regeneration,
            buildsFieldDefense: mechanics.buildsFieldDefense,
          },
        }
      : {}),
    ...(dinosaur
      ? {
          dinosaur: {
            capacitySlots: mechanics.capacitySlots,
            growthStage,
            killsToNextStage:
              growthStage === null || growthStage === 2
                ? null
                : GROWTH_KILLS_V7[growthStage] - unit.kills,
            armourReduction: mechanics.armourReduction,
            acid: role.abilities.includes("ACID"),
            runUpBonus: linebreaker ? mechanics.runUpBonus2 / 2 : 0,
            runUpMaximum: linebreaker ? RUN_UP_MAXIMUM_TILES_V7 : 0,
            egg: eggStatus(state, unit),
          },
        }
      : {}),
    ...(martian
      ? {
          martian: {
            shield,
            shieldMaximum,
            // A mind-controlled unit has no home and uses no slot.
            capacitySlots: controlled ? 0 : mechanics.capacitySlots,
            movementMode: mechanics.movementMode,
            rayPower,
            cooling,
            pierce: !embarked && role.abilities.includes("PIERCE"),
            forceField: !embarked && role.abilities.includes("FORCE_FIELD"),
            mindControl: role.abilities.includes("MIND_CONTROL")
              ? {
                  cooldown:
                    state.mindControlCooldowns.find(
                      (entry) => entry.unitId === unit.id,
                    )?.turnsRemaining ?? null,
                  controlled: controlledByBrainV7(state.mindControlled, unit.id)
                    .length,
                  controlLimit: MIND_CONTROL_LIMIT_V7,
                }
              : null,
          },
        }
      : {}),
    // The Mind Control revision (section 6): the control of every unit in a
    // match with a Martian seat (null when not controlled).
    ...(state.setup.factions.includes("MARTIAN")
      ? {
          mindControl:
            controlEntry === undefined
              ? null
              : {
                  brainUnitId: controlEntry.brainUnitId,
                  originalOwnerId: controlEntry.originalOwnerId,
                },
        }
      : {}),
    // The Dwarf revision (section 14): the public per-turn lists, and the
    // Dwarf block of a Dwarf unit.
    ...(matchHasDwarvesV7(state)
      ? {
          bombedThisTurn: state.bombedThisTurn.includes(unit.id),
          surfacedThisTurn: state.surfacedThisTurn.includes(unit.id),
        }
      : {}),
    ...(kind === "DWARF"
      ? {
          dwarf: {
            construct: mechanics.construct,
            machine: mechanics.repairsAsMachine,
            dugIn: unitIsDugInV7(state, unit),
            digsIn: mechanics.digsIn,
            shotsLeft:
              mechanics.unmovedShots > 1 && !embarked
                ? state.turnOrder[state.activeSeatIndex] === unit.ownerId
                  ? unit.activation.recovered ||
                    unit.activation.captured ||
                    unit.activation.specialActed
                    ? 0
                    : Math.max(
                        0,
                        attackAllowanceV7(state, unit) -
                          unit.activation.attacksUsed,
                      )
                  : mechanics.unmovedShots
                : null,
            plated: mechanics.plated,
            tunnelRange: mechanics.tunnelRange,
            eruptionDamage: capabilities.eruptionDamage,
            bombDamage: capabilities.bombDamage,
            burrowed: state.burrowed.some((entry) => entry.unit.id === unit.id),
          },
        }
      : {}),
    // The Candy revision (section 13): the public per-unit flags of a match
    // with a Candy seat, and the Candy block of a Candy unit.
    ...candyFlagsV7(state, unit),
    ...(candy
      ? {
          candy: {
            sugarRush:
              unit.form === "LAND" && role.abilities.includes("SUGAR_RUSH"),
            rushPerk: mechanics.rushPerk,
            bounces: unitBouncesV7(state, unit),
            splats: attackSplatsV7(state, unit),
            rebake: candyRebakeV7(unit.role),
            homeSweetHome: capabilities.homeSweetHome,
            crumbsBite: crumbsBiteV7(state, unit.ownerId),
          },
        }
      : {}),
    ...(iceFolk
      ? {
          iceFolk: {
            onSnow: snowAt(unit.at),
            inBlizzard: winter.blizzardAt(unit.at),
            snowCover,
            glides: unitGlidesV7(state, unit),
            mountainBorn: unit.form === "LAND" && mechanics.mountainBorn,
            shatterThreshold: shatterThresholdV7(state, unit),
            rockfall:
              unit.form === "LAND" &&
              mechanics.rockfallAttack2 > 0 &&
              tileAtV7(state.board, unit.at)?.terrain === "MOUNTAIN",
            planted:
              mechanics.plantedBonus2 > 0 && unit.form === "LAND"
                ? planted
                : null,
            sweepDamage: unit.form === "LAND" ? mechanics.sweepDamage : 0,
            blizzard:
              unit.form === "LAND" && role.abilities.includes("BLIZZARD"),
          },
        }
      : {}),
  };
}

/**
 * Revision 19 section 10: an Egg's public stats: its HP, Attack 0, Defense
 * 1, Move 0, Range 0, and Sight 0, with no terrain or fortification
 * modifier, no ability, and no status. The label is "{Unit} Egg".
 */
function eggStats(
  state: GameStateV7,
  unit: UnitStateV7,
  roleLabel: string,
): PublicUnitStatsV7 {
  const labelText = `${roleLabel} Egg`;
  const mechanics = unitRoleMechanicsV7(state, unit);
  return {
    unitId: unit.id,
    minimumRange: 0,
    maximumRange: 0,
    stats: [
      stat("HP", "HP", unit.hp, base(labelText, "maximum HP", unit.maxHp), []),
      stat("ATTACK", "Attack", null, base(labelText, "Attack", 0, 2), []),
      stat(
        "DEFENSE",
        "Defense",
        null,
        base(labelText, "Defense", EGG_DEFENSE2_V7, 2),
        [],
      ),
      stat("MOVE", "Move", null, base(labelText, "Move", 0), []),
      stat("RANGE", "Range", null, base(labelText, "Range", 0), []),
      stat("SIGHT", "Sight", null, base(labelText, "Sight", 0), []),
    ],
    abilities: [],
    statuses: [],
    chill: null,
    // The Dwarf revision: an Egg may be bombed (the public per-turn list).
    ...(matchHasDwarvesV7(state)
      ? {
          bombedThisTurn: state.bombedThisTurn.includes(unit.id),
          surfacedThisTurn: false,
        }
      : {}),
    // The Candy revision: an Egg may be Splatted (the public per-turn list).
    ...candyFlagsV7(state, unit),
    dinosaur: {
      capacitySlots: mechanics.capacitySlots,
      growthStage: null,
      killsToNextStage: null,
      armourReduction: 0,
      acid: false,
      runUpBonus: 0,
      runUpMaximum: 0,
      egg: eggStatus(state, unit),
    },
  };
}

/**
 * The Candy revision (section 13): the per-unit flags every unit has exactly
 * when the match has a Candy seat.
 */
function candyFlagsV7(
  state: GameStateV7,
  unit: UnitStateV7,
): Pick<
  PublicUnitStatsV7,
  "rushed" | "crashed" | "splatted" | "tossedThisTurn"
> {
  if (!matchHasCandyV7(state)) return {};
  return {
    rushed: unitIsRushedV7(state, unit.id),
    crashed: unitIsCrashedV7(state, unit.id),
    splatted: unitIsSplattedV7(state, unit.id),
    tossedThisTurn: state.tossedThisTurn.includes(unit.id),
  };
}

/** The Candy revision: the Re-bake price and HP of `role`, or null. */
function candyRebakeV7(
  role: UnitStateV7["role"],
): PublicCandyMechanicsV7["rebake"] {
  const cost = rebakePriceV7(role);
  return cost === null ? null : { cost, hp: rebakeHpV7(role) };
}

/** Revision 19: the public countdown of an Egg, or null for any other unit. */
function eggStatus(
  state: GameStateV7,
  unit: UnitStateV7,
): PublicDinosaurMechanicsV7["egg"] {
  if (unit.form !== "EGG") return null;
  const entry = state.eggs.find((candidate) => candidate.unitId === unit.id);
  return entry === undefined
    ? null
    : { turnsRemaining: entry.turnsRemaining, hatchesAs: unit.role };
}

function defenseSourceAt(
  state: GameStateV7,
  unit: UnitStateV7,
  numerator: number,
  snowCover: boolean,
): UnitStatModifierSourceV7 | null {
  if (numerator === 1) return null;
  // The Ice Folk revision: Snow cover is the source whenever it applies
  // (`pulp_wars-1wy.3`: never on a snowy Forest or Mountain, whose larger
  // terrain cover applies instead).
  if (snowCover) return "SNOW";
  const terrain = tileAtV7(state.board, unit.at)?.terrain;
  return terrain === "MOUNTAIN"
    ? "MOUNTAIN"
    : terrain === "FOREST"
      ? "FOREST"
      : null;
}
function fortificationTerms(
  state: GameStateV7,
  unit: UnitStateV7,
): readonly PublicUnitStatTermV7[] {
  const parts = fortificationPartsForUnitV7(state, unit);
  if (parts.walls + parts.fieldDefense === 0) return [];
  // The Dwarf revision section 8: Dig In is the Field Defense level of a
  // dug-in unit whose tile's Field Defense does not count.
  if (parts.dugIn && !parts.tileFieldDefense)
    return [
      ...(parts.walls > 0
        ? [modifier(2, "CITY_WALLS", "City Walls", "City Walls add 2 Defense.")]
        : []),
      modifier(
        1,
        "DIG_IN",
        "Dug in",
        "Dug in: a Hammerer or Steam Mole that has not moved, on or next to its own city center, adds 1 Defense.",
      ),
    ];
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && same(candidate.at, unit.at),
  );
  const terms: PublicUnitStatTermV7[] = [];
  if (
    city?.rewards.some(
      (reward) => reward.reachedLevel === 3 && reward.reward === "WALLS",
    )
  )
    terms.push(
      modifier(2, "CITY_WALLS", "City Walls", "City Walls add 2 Defense."),
    );
  if (tile?.fieldDefense)
    terms.push(
      modifier(
        1,
        "FIELD_DEFENSE",
        "Field defense",
        "Field defense adds 1 Defense.",
      ),
    );
  return terms;
}
/** A half-unit amount as whole units ("1", "0.5", "1.5"). */
function formatHalf(value2: number): string {
  return String(value2 / 2);
}
function stat(
  id: UnitStatIdV7,
  labelText: string,
  current: number | null,
  baseTerm: PublicUnitStatTermV7,
  modifiers: readonly PublicUnitStatTermV7[],
): PublicUnitStatBreakdownV7 {
  return {
    id,
    label: labelText,
    current,
    base: baseTerm,
    modifiers,
    total: modifiers.reduce(
      (sum, term) => add(sum, term.value),
      baseTerm.value,
    ),
  };
}
function base(
  role: string,
  name: string,
  numerator: number,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    value: rational(numerator, denominator),
    source: "ROLE_BASE",
    sourceLabel: `${role} base`,
    description: `${role} has this base ${name}.`,
  };
}
function modifier(
  numerator: number,
  source: UnitStatModifierSourceV7,
  sourceLabel: string,
  description: string,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    value: rational(numerator, denominator),
    source,
    sourceLabel,
    description,
  };
}
function rational(
  numerator: number,
  denominator: number,
): PublicUnitStatValueV7 {
  const divisor = gcd(Math.abs(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
function add(a: PublicUnitStatValueV7, b: PublicUnitStatValueV7) {
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}
function label(source: UnitStatModifierSourceV7): string {
  return source
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (value) => value.toUpperCase());
}
const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x === b.x && a.y === b.y;
