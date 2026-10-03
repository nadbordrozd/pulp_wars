import type { CityId, PlayerId, UnitId } from "../model/ids";
import type {
  AchievementIdV7,
  CoordV7,
  ImprovementIdV7,
  MatchOutcomeV7,
  RewardIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "./types";

export interface CityIncomeEntryV7 {
  readonly cityId: CityId;
  readonly coins: number;
}
export interface CombatPreviewV7 {
  readonly attackerId: UnitId;
  readonly targetUnitId: UnitId;
  readonly attack2: number;
  readonly defense2: number;
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly chargeApplied: boolean;
  readonly inspiredApplied: boolean;
  readonly inspiredConsumed: boolean;
  /**
   * Revision 17 Gang Up: whole Attack (0, 1, or 2) a Goblin land-form
   * attacker gains from other own units adjacent to the target; included in
   * `attack2`. Always 0 for every non-Goblin or naval attacker.
   */
  readonly gangUp: 0 | 1 | 2;
  readonly breachApplied: boolean;
  readonly defenseBonusNumerator: number;
  readonly defenseBonusDenominator: number;
  readonly fortificationLevel: number;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly retaliation: boolean;
  /**
   * Revision 14: `UNANSWERED` when the attacker's attacks receive no
   * retaliation (the Vampire) and the defender survives.
   */
  readonly noRetaliationReason:
    "DEFENDER_DIED" | "OUT_OF_RANGE" | "UNANSWERED" | null;
  readonly advances: boolean;
  readonly push: "WILL_PUSH" | "BLOCKED" | "UNKNOWN_BEHIND_FOG";
  readonly attacksUsed: number;
  readonly attacksRemaining: number;
  readonly overrunAdvance: boolean;
  readonly overrunContinues: boolean;
  /** Revision 12: a surviving Raider may make one ordinary escape Move. */
  readonly escapeAvailable: boolean;
  readonly splash: readonly CombatSplashEntryV7[];
  /**
   * Revision 13 Lifesteal: HP a surviving Vampire attacker or retaliating
   * Vampire defender heals after both damages (0 when not applicable).
   */
  readonly attackerHeal: number;
  readonly defenderHeal: number;
  /**
   * Revision 13 Infect: the corresponding land-form death is converted into a
   * Zombie rising by the killing Zombie (false when not applicable).
   */
  readonly attackerInfected: boolean;
  readonly defenderInfected: boolean;
  /**
   * Revision 14 Plague: the units this Lich attack newly plagues (the
   * defender first when it qualifies, then splash targets in splash order).
   * Empty unless the attacker has `PLAGUE` and survives.
   */
  readonly plagued: readonly UnitId[];
  /**
   * Revision 14 Bitten: the corresponding surviving living land-form unit
   * took Zombie damage and becomes (or stays) Bitten by the Zombie.
   */
  readonly attackerBitten: boolean;
  readonly defenderBitten: boolean;
  /**
   * Revision 14 Bitten: the corresponding death rises as a Zombie of the
   * recorded biter instead of leaving a Grave (Infect takes precedence).
   */
  readonly attackerBittenRises: boolean;
  readonly defenderBittenRises: boolean;
  /**
   * Revision 20 Charge!: whole Attack from the run-up (0, 1, or 2); included
   * in `attack2`. Always 0 for an attacker without `LINEBREAKER`.
   */
  readonly runUp: number;
  /**
   * Revision 20: fortification levels removed from the defender by Charge!
   * (0-3) or Wallbreaker (0 or 2). 0 for Acid, which keeps `acid`.
   * `fortificationLevel` is the level that was applied.
   */
  readonly fortificationIgnored: number;
  /**
   * Revision 19 Acid: the attacker (a Spitter) removed the defender's cover
   * and fortification (`fortificationLevel` 0 and a defense bonus of 1/1).
   */
  readonly acid: boolean;
  /** Revision 19 Armoured: the reduction lowered `damageToDefender`. */
  readonly defenderArmoured: boolean;
  /** Revision 19 Armoured: the reduction lowered `damageToAttacker`. */
  readonly attackerArmoured: boolean;
  /**
   * The Martian revision (section 6.1): `FULL` or `HALF` for a heat ray,
   * otherwise `NONE`; `attack2` includes the halving.
   */
  readonly rayPower: "FULL" | "HALF" | "NONE";
  /** The attack is a full-power ray and leaves the attacker Cooling. */
  readonly coolingApplied: boolean;
  /**
   * The Martian revision (section 5.3): what the defender's Shield absorbs
   * of the hit. `damageToDefender` stays HP damage; the whole hit is the sum.
   */
  readonly defenderShieldDamage: number;
  /** What the attacker's Shield absorbs of the retaliation. */
  readonly attackerShieldDamage: number;
  /**
   * The Ice Folk revision (section 5.5): the defender shatters. Then
   * `damageToDefender` is its whole remaining HP, `defenderDies` is true,
   * and there is no retaliation (`DEFENDER_DIED`).
   */
  readonly shatters: boolean;
  /** Section 7.4: the Snow Hunter's Cold Blood is in `attack2`. */
  readonly coldBloodApplied: boolean;
  /**
   * Section 7.2: the attack is a Yeti's Rockfall from distance 2; `attack2`
   * is the Rockfall value.
   */
  readonly rockfallApplied: boolean;
  /** Section 7.6: the Boulder Yeti's Planted bonus is in `attack2`. */
  readonly plantedApplied: boolean;
  /**
   * Section 6.3: the hit on the defender was halved by a Blizzard;
   * `damageToDefender` is the halved value.
   */
  readonly blizzardHalved: boolean;
  /** Section 6.2: the defender's cover comes from Snow. */
  readonly snowCover: boolean;
  /** Section 7.5: a Mammoth's Sweep; its flank victims are `splash`. */
  readonly sweep: boolean;
  /**
   * Section 10.10: only in a public preview, an unexplored tile lies within
   * 1 of an Ice Folk defender, so a hidden Witch may change the result.
   */
  readonly hiddenBlizzardPossible: boolean;
  /**
   * The Dwarf revision (section 14): the defender is dug in (its level is
   * in `fortificationLevel`, or in `fortificationIgnored` when the attack
   * ignores fortification).
   */
  readonly dugIn: boolean;
  /** The attacker is a construct and its force used its maximum HP. */
  readonly unflinchingApplied: boolean;
  /**
   * A hit on a Plated unit was capped; `damageToDefender` and
   * `damageToAttacker` are the capped values.
   */
  readonly platedApplied: boolean;
}
export interface CombatSplashEntryV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  /** HP damage. */
  readonly damage: number;
  readonly dies: boolean;
  /**
   * The Martian revision (section 5.3): what the victim's Shield absorbed
   * (0 when none). Splash, Pierce, Wail, and explosion entries carry it.
   */
  readonly shieldDamage: number;
}
/**
 * A Plague damage entry: Plague bypasses Shields (section 5.3), so it keeps
 * the pre-Martian shape without `shieldDamage`.
 */
export type PlagueDamageEntryV7 = Omit<CombatSplashEntryV7, "shieldDamage">;

export type DomainEventV7 =
  | {
      readonly kind: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly coins: number;
    }
  | {
      /**
       * Revision 14 Plague damage at the start of `playerId`'s turn: every
       * plagued unit it owns, sorted by (y, x, id). Deaths follow as
       * `UNIT_DIED` cause `PLAGUE`.
       */
      readonly kind: "PLAGUE_DAMAGED";
      readonly playerId: PlayerId;
      readonly results: readonly PlagueDamageEntryV7[];
    }
  | {
      /**
       * Revision 14 Plague spread at the start of `playerId`'s turn: every
       * newly plagued unit (of any owner), sorted by (y, x, id).
       */
      readonly kind: "PLAGUE_SPREAD";
      readonly playerId: PlayerId;
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly at: CoordV7;
      }[];
    }
  | {
      /**
       * Revision 15: at the start of `playerId`'s turn these of its units
       * (sorted IDs) survived their third and last Plague damage, so their
       * Plague ended. They may be plagued again later.
       */
      readonly kind: "PLAGUE_EXPIRED";
      readonly playerId: PlayerId;
      readonly unitIds: readonly UnitId[];
    }
  | {
      readonly kind: "WINDMILL_HEALING_RESOLVED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly amount: number;
        readonly hpAfter: number;
      }[];
    }
  | {
      /**
       * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section
       * 5): at `playerId`'s Start Turn, after Windmill healing, its unit
       * standing on the Fountain of Youth at `at` healed `amount` (at least
       * 1, at most 12) to `hpAfter`.
       */
      readonly kind: "FOUNTAIN_HEALED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly amount: number;
      readonly hpAfter: number;
    }
  | {
      /**
       * Revision 17: Trolls of `playerId` regenerated at its Start Turn,
       * after Windmill healing; only Trolls that healed, in unit-ID order.
       */
      readonly kind: "UNITS_REGENERATED";
      readonly playerId: PlayerId;
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly amount: number;
        readonly hpAfter: number;
      }[];
    }
  | {
      /**
       * The Martian revision (section 5.2): the Shields of `playerId` that a
       * recharge changed (Start Turn, or End Turn with Force Fields), in
       * unit-ID order, each with its Shield afterwards.
       */
      readonly kind: "SHIELDS_RECHARGED";
      readonly playerId: PlayerId;
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly shield: number;
      }[];
    }
  | {
      readonly kind: "INCOME_AWARDED" | "INCOME_PREVIEWED";
      readonly playerId: PlayerId;
      readonly totalCoins: number;
      readonly cities: readonly CityIncomeEntryV7[];
    }
  | { readonly kind: "TURN_ENDED"; readonly playerId: PlayerId }
  | {
      readonly kind: "TECH_RESEARCHED";
      readonly playerId: PlayerId;
      readonly tech: TechnologyIdV7;
      readonly cost: number;
    }
  | {
      readonly kind: "FRUIT_HARVESTED" | "GAME_HUNTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 2;
      readonly permanentPopulationAdded: 1;
    }
  | {
      readonly kind: "FISH_HARVESTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 2;
      readonly permanentPopulationAdded: 1;
    }
  | {
      readonly kind: "PEARLS_GATHERED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 2;
      readonly coinsReceived: 4;
      readonly coinDelta: 2;
    }
  | {
      readonly kind: "PORT_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 4;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "SHIPYARD_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 5;
      readonly populationAdded: 1;
      readonly livePopulationTotal: 2;
    }
  | {
      readonly kind: "PORT_BLOCKADE_CHANGED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly activeBefore: boolean | null;
      readonly activeAfter: boolean | null;
    }
  | {
      readonly kind: "SEA_NETWORK_CHANGED";
      readonly playerId: PlayerId;
      readonly networkCityIdsBefore: readonly CityId[];
      readonly networkCityIdsAfter: readonly CityId[];
      readonly tradeCityIdsBefore: readonly CityId[];
      readonly tradeCityIdsAfter: readonly CityId[];
    }
  | {
      readonly kind: "ECONOMIC_BUILDING_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly improvement: ImprovementIdV7;
      readonly cost: number;
      readonly populationContribution: number;
      readonly marketIncome: number;
    }
  | {
      readonly kind: "ECONOMIC_BUILDING_REMOVED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly improvement: ImprovementIdV7;
      readonly populationContributionRemoved: number;
      readonly marketIncomeRemoved: number;
      readonly resourceRestored: "FERTILE_GROUND" | "ORE" | null;
    }
  | {
      readonly kind: "FOREST_CLEARED" | "FOREST_REPLANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly coinDelta: number;
    }
  | {
      readonly kind: "FOREST_CULTIVATED" | "MOUNTAIN_BLASTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: number;
      readonly terrainBefore: "FOREST" | "MOUNTAIN";
      readonly terrainAfter: "GRASS";
      readonly resourceBefore: null;
      readonly resourceAfter: "FERTILE_GROUND" | null;
    }
  | {
      readonly kind: "ROAD_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId | null;
      readonly at: CoordV7;
      readonly cost: 2;
    }
  | {
      readonly kind: "FIELD_DEFENSE_BUILT";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly cost: 3;
    }
  | {
      readonly kind: "FIELD_DEFENSE_DESTROYED";
      readonly at: CoordV7;
      readonly reason:
        | "CATAPULT"
        | "INSPIRED"
        | "EXPLOSIVES"
        | "OCCUPATION"
        /** Revision 17: every explosion clears its whole 3 × 3 blast area. */
        | "EXPLOSION"
        /** The Ice Folk revision: a Mammoth attack (section 7.5). */
        | "TRAMPLE"
        /**
         * The Dwarf revision (section 5.4): a surfacing Steam Mole destroys
         * Field Defense on its tile and the eight around it.
         */
        | "UNDERMINED";
    }
  | {
      readonly kind: "LAND_GRANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly cost: 6;
      readonly tiles: readonly CoordV7[];
    }
  | {
      readonly kind: "CITY_ECONOMY_CHANGED";
      readonly cityId: CityId;
      readonly economicBefore: number;
      readonly economicAfter: number;
      readonly populationBefore: number;
      readonly populationAfter: number;
      readonly marketBefore: number;
      readonly marketAfter: number;
    }
  | {
      readonly kind: "CITY_LEVELED_UP";
      readonly cityId: CityId;
      readonly level: number;
    }
  | {
      readonly kind: "CITY_REWARD_QUEUED";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly candidates: readonly RewardIdV7[];
    }
  | {
      readonly kind: "CITY_REWARD_CHOSEN";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: RewardIdV7;
      readonly coinDelta: number;
    }
  | {
      readonly kind: "CITY_REWARD_AUTOMATICALLY_GRANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: "TREASURY";
      readonly coins: 12;
    }
  | {
      readonly kind: "CITY_TERRITORY_EXPANDED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly tiles: readonly CoordV7[];
    }
  | {
      readonly kind: "ACHIEVEMENT_UNLOCKED";
      readonly playerId: PlayerId;
      readonly achievement: AchievementIdV7;
    }
  | {
      readonly kind: "MONUMENT_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly achievement: AchievementIdV7;
      readonly at: CoordV7;
      readonly populationAdded: 3;
    }
  | {
      readonly kind: "UNIT_TRAINED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly cost: number;
      readonly at: CoordV7;
    }
  | {
      /**
       * The Dwarf revision (section 9.2): the Engineer `unitId` assembled
       * the Clockwork Gunner `assembledUnitId` on `at`, homed to `cityId`.
       */
      readonly kind: "UNIT_ASSEMBLED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly assembledUnitId: UnitId;
      readonly at: CoordV7;
      readonly cityId: CityId;
      readonly cost: number;
    }
  | {
      readonly kind: "NAVAL_UNIT_TRAINED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly unitId: UnitId;
      readonly role: "PATROL_BOAT" | "BATTLESHIP";
      readonly cost: number;
      readonly at: CoordV7;
      readonly dock: "PORT" | "SHIPYARD";
      readonly discountSource: "SHIPYARD" | null;
    }
  | {
      /**
       * Revision 19: `cityId` laid an Egg of `role` on `at` (the Egg is the
       * unit `unitId`). Emitted from `pulp_wars-c87.3`.
       */
      readonly kind: "EGG_LAID";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly cost: number;
      readonly at: CoordV7;
      readonly hp: number;
      readonly turnsRemaining: number;
    }
  | {
      /**
       * Revision 19: the Egg `unitId` hatched in place, by its countdown
       * (`TIME`) or by the Shaman `sourceUnitId` (`SHAMAN`). Emitted from
       * `pulp_wars-c87.3`.
       */
      readonly kind: "EGG_HATCHED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly at: CoordV7;
      readonly cause: "TIME" | "SHAMAN";
      readonly sourceUnitId: UnitId | null;
    }
  | {
      readonly kind: "UNIT_EMBARKED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly passengerRole: UnitRoleIdV7;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      readonly kind: "UNIT_DISEMBARKED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly passengerRole: UnitRoleIdV7;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      /**
       * The Martian revision (section 8.1): the Saucer `unitId` beamed its
       * owner's `passengerUnitId` from `from` to `to`.
       */
      readonly kind: "UNIT_BEAMED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly passengerUnitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      readonly kind: "UNIT_REWARD_GRANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
    }
  | {
      readonly kind: "UNIT_SPAWN_DISPLACED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly spawnedUnitId: UnitId;
      readonly displacedUnitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7 | null;
    }
  | {
      readonly kind: "UNITS_RALLIED";
      readonly captainId: UnitId;
      readonly unitIds: readonly UnitId[];
    }
  | {
      /**
       * The Ice Folk revision (section 11): `sourceUnitId` of `playerId`
       * (a Sled's Bolas, an Ice Witch's Cold Snap, or a Frost Giant's Cold
       * Aura) chilled every listed unit; each result is its Chill entry
       * after the application, in unit-ID order. A projection keeps the
       * results the viewer can see (and a target owner's own entries, with
       * `sourceUnitId` null when the source is hidden).
       */
      readonly kind: "UNITS_CHILLED";
      readonly playerId: PlayerId;
      readonly sourceUnitId: UnitId | null;
      readonly source: "BOLAS" | "COLD_SNAP" | "COLD_AURA";
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly sluggish: boolean;
        readonly turnsLeft: 0 | 1 | 2;
      }[];
    }
  | {
      readonly kind: "WOUNDED_TENDED";
      readonly captainId: UnitId;
      readonly results: readonly {
        readonly unitId: UnitId;
        /** 0 to 2; revision 14 may tend a full-HP unit only to cure it. */
        readonly amount: number;
        readonly hpAfter: number;
        /** Revision 14: the tended unit was plagued and is cured. */
        readonly curedPlague: boolean;
        /** Revision 14: the tended unit was bitten and is cured. */
        readonly curedBitten: boolean;
        /**
         * The Ice Folk revision (section 10.5): the tended unit was Chilled
         * and its entry is now thawing.
         */
        readonly curedChill: boolean;
      }[];
    }
  | {
      /**
       * Revision 13 Raise Dead: the raising Necromancer and each new Skeleton
       * with its former Grave, in (y, x) order with consecutive unit IDs.
       * A projection keeps only the Skeletons visible to the viewer.
       */
      readonly kind: "DEAD_RAISED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly at: CoordV7;
      }[];
    }
  | {
      /** Revision 13 Devour: `amount` may be 0 (Grave denial at full HP). */
      readonly kind: "GRAVE_DEVOURED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly amount: number;
      readonly hpAfter: number;
    }
  | {
      readonly kind: "UNIT_PUSHED";
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      /**
       * The Martian revision (section 8.4): the Mothership `sourceUnitId`
       * pulled `targetUnitId` one tile toward itself.
       */
      readonly kind: "UNIT_PULLED";
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      /**
       * The Dwarf revision (section 5.1): the Steam Mole `unitId` tunnelled
       * from `from` to its mound tile `to`, with its rider (null fields
       * without one). A projection hides the tiles a viewer has not
       * explored (null).
       */
      readonly kind: "UNIT_TUNNELLED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
      readonly riderUnitId: UnitId | null;
      readonly riderFrom: CoordV7 | null;
      readonly riderTo: CoordV7 | null;
    }
  | {
      /**
       * The Dwarf revision (section 5.4): the burrowed Mole `unitId` and
       * its rider surfaced at their owner's Start Turn; the eruption hit
       * every listed unit, in (y, x, id) order (`damage` is HP damage).
       */
      readonly kind: "UNIT_SURFACED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly riderUnitId: UnitId | null;
      readonly riderAt: CoordV7 | null;
      readonly eruptionDamage: number;
      readonly results: readonly CombatSplashEntryV7[];
    }
  | {
      readonly kind: "UNIT_MOVED";
      readonly unitId: UnitId;
      readonly path: readonly CoordV7[];
    }
  | {
      readonly kind: "UNIT_MOVE_INTERRUPTED";
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly reason:
        | "OCCUPIED"
        | "ENGINEERING_REQUIRED"
        | "ZOC"
        /**
         * The Martian revision: a flyer entered an unexplored cell that is
         * a settlement center it cannot stand on.
         */
        | "SETTLEMENT_FORBIDDEN"
        /**
         * The Ice Folk revision (section 6.5): the unit entered Snow it could
         * not know about (a hidden Ice Witch's Blizzard) and stopped there.
         */
        | "SNOW"
        /**
         * The Dwarf revision (section 5.3): the unit met a mound on a tile it
         * had not explored, on the last tile of its Move.
         */
        | "MOUND";
    }
  | {
      readonly kind: "TILES_REVEALED";
      readonly playerId: PlayerId;
      readonly tiles: readonly CoordV7[];
    }
  | { readonly kind: "COMBAT_RESOLVED"; readonly preview: CombatPreviewV7 }
  | {
      /**
       * The Dwarf revision (section 6.3): the Gyrocopter `unitId` flew from
       * `from` to `to` and bombed `targetUnitId` on `at` (`damage` is HP
       * damage, `shieldDamage` what its Shield absorbed).
       */
      readonly kind: "UNIT_BOMBED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
      readonly targetUnitId: UnitId;
      readonly at: CoordV7;
      readonly damage: number;
      readonly shieldDamage: number;
      readonly killed: boolean;
    }
  | {
      /**
       * Revision 13 Wail: every target in (y, x, id) order with its damage,
       * which may be 0. Deaths follow as `UNIT_DIED` cause `WAIL`.
       */
      readonly kind: "WAIL_RESOLVED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly results: readonly CombatSplashEntryV7[];
    }
  | {
      /**
       * Revision 17 explosion (section 6): the exploding unit of `playerId`
       * died on `at` and dealt its fixed `damage` to every other unit in the
       * 3 × 3 blast area, in (y, x, id) order (possibly empty). `cause` is
       * `KABOOM` for a Kaboom and `DEATH` for a death blast; `wave` is the
       * 1-based chain wave. Deaths follow as `UNIT_DIED` cause `EXPLOSION`.
       */
      readonly kind: "EXPLOSION_RESOLVED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly at: CoordV7;
      readonly cause: "KABOOM" | "DEATH";
      readonly wave: number;
      readonly damage: number;
      readonly results: readonly CombatSplashEntryV7[];
    }
  | {
      readonly kind: "IMPROVEMENT_PILLAGED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly improvement: ImprovementIdV7;
      readonly resourceRestored: "FERTILE_GROUND" | "ORE" | null;
      readonly coinDelta: 1;
    }
  | {
      readonly kind: "UNIT_DISBANDED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly coinDelta: number;
    }
  | {
      readonly kind: "SPOILS_AWARDED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly coins: 2;
    }
  | {
      /**
       * Revision 17 Plunder: Coins `playerId` gained for `kills` credited
       * hostile kills in one command or Start Turn. Owner-only, no victims.
       */
      readonly kind: "PLUNDER_AWARDED";
      readonly playerId: PlayerId;
      readonly kills: number;
      readonly coins: number;
    }
  | {
      readonly kind: "UNIT_RECOVERED";
      readonly unitId: UnitId;
      readonly amount: number;
      readonly automatic: boolean;
    }
  | {
      readonly kind: "UNIT_WAITED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
    }
  | {
      /**
       * Map curiosities (section 6): `unitId` of `playerId` ended a Move on
       * the Shrine at `at` and claimed it; the `UNIT_PROMOTED` of its
       * Promotion follows, and the Shrine is gone.
       */
      readonly kind: "SHRINE_CLAIMED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "UNIT_PROMOTED";
      readonly unitId: UnitId;
      readonly maxHp: number;
    }
  | {
      /**
       * Revision 19 Grow: a Dinosaur unit reached `stage` (1 Big, 2 Alpha)
       * from a credited kill; `maxHp` and `hp` are its values afterwards. One
       * event per stage reached.
       */
      readonly kind: "UNIT_GREW";
      readonly unitId: UnitId;
      readonly stage: 1 | 2;
      readonly maxHp: number;
      readonly hp: number;
    }
  | {
      readonly kind: "UNIT_DIED";
      readonly unitId: UnitId;
      readonly cause:
        | "ATTACK"
        | "SPLASH"
        | "RETALIATION"
        | "ELIMINATION"
        | "WAIL"
        | "PLAGUE"
        /** Revision 17: the Kaboom unit itself. */
        | "KABOOM"
        /** Revision 17: killed by an explosion. */
        | "EXPLOSION"
        /** Revision 19: an Egg destroyed because its home city was captured. */
        | "CITY_CAPTURED"
        /**
         * The Mind Control revision (section 4.2): a controlled unit lost
         * with its Brain because its original owner was eliminated.
         */
        | "BRAIN_LOST"
        /**
         * The Ice Folk revision (section 5.5): a shattered unit (no Grave,
         * no death blast; a Bitten one still rises).
         */
        | "SHATTER"
        /** The Dwarf revision: a Gyrocopter's bomb (section 6.3). */
        | "BOMB"
        /** The Dwarf revision: a surfacing Mole's eruption (section 5.4). */
        | "ERUPTION";
    }
  | {
      /** Revision 13: a Zombie's land-form victim rose as a Zombie. */
      readonly kind: "UNIT_INFECTED";
      readonly playerId: PlayerId;
      readonly sourceUnitId: UnitId;
      readonly victimUnitId: UnitId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly homeCityId: CityId | null;
    }
  | {
      /**
       * Revision 14: a bitten land-form victim rose as a Zombie of the
       * player whose Zombie last bit it.
       */
      readonly kind: "BITTEN_UNIT_RISEN";
      readonly playerId: PlayerId;
      readonly victimUnitId: UnitId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly homeCityId: CityId | null;
    }
  | {
      /**
       * The Mind Control revision (section 3): the Brain `unitId` of
       * `playerId` took control of `targetUnitId` of `targetOwnerId`, which
       * keeps its ID, role, and kind and stands on `at` with `hp`.
       */
      readonly kind: "UNIT_MIND_CONTROLLED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly targetOwnerId: PlayerId;
      readonly targetRole: UnitRoleIdV7;
      readonly at: CoordV7;
      readonly hp: number;
    }
  | {
      /**
       * The Mind Control revision (section 4.2): the Brain `brainUnitId`
       * was lost, so the controlled unit `unitId` on `at` went back from
       * `fromPlayerId` (the controller) to its original owner
       * `toPlayerId`.
       */
      readonly kind: "UNIT_RELEASED";
      readonly unitId: UnitId;
      readonly brainUnitId: UnitId;
      readonly fromPlayerId: PlayerId;
      readonly toPlayerId: PlayerId;
      readonly at: CoordV7;
    }
  | { readonly kind: "GRAVE_CREATED"; readonly at: CoordV7 }
  | {
      /**
       * Revision 14: the source Lich died, so every unit it plagued is cured
       * at once (sorted unit IDs of the surviving plagued units).
       */
      readonly kind: "PLAGUE_CLEARED";
      readonly unitIds: readonly UnitId[];
    }
  | {
      readonly kind: "CITY_CAPTURED";
      readonly cityId: CityId;
      readonly from: PlayerId | null;
      readonly to: PlayerId;
    }
  | {
      readonly kind: "TREASURE_CAPTURED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly requestedReward: "COINS" | "KNIGHT";
      readonly grantedReward: "COINS" | "KNIGHT";
      readonly coinDelta: 0 | 5;
      readonly knightFallback: boolean;
      readonly spawnedUnitId: UnitId | null;
      readonly spawnedAt: CoordV7 | null;
      readonly homeCityId: CityId | null;
    }
  | {
      /**
       * Map curiosities (section 7): the afloat `unitId` of `playerId` ended
       * a Move on the Sunken Wreck at `at`; its owner gained `coins` (8) and
       * the Wreck is gone.
       */
      readonly kind: "WRECK_SALVAGED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly coins: 8;
    }
  | { readonly kind: "PLAYER_ELIMINATED"; readonly playerId: PlayerId }
  | { readonly kind: "MATCH_ENDED"; readonly outcome: MatchOutcomeV7 };

export interface EventEnvelopeV7 {
  readonly format: "pulp-wars-events";
  readonly version: 7;
  readonly commandIndex: number;
  readonly events: readonly DomainEventV7[];
}

export type PlayerPresentationEventV7 =
  | {
      readonly kind: "UNIT_REVEALED";
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly reason: string;
    }
  | {
      readonly kind: "UNIT_CONCEALED";
      readonly unitId: UnitId;
      readonly lastSeenAt: CoordV7;
    };

export type ProjectedResourceRestorationEventV7 =
  | (Omit<
      Extract<DomainEventV7, { kind: "ECONOMIC_BUILDING_REMOVED" }>,
      "resourceRestored"
    > & {
      readonly resourceRestored:
        "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null;
    })
  | (Omit<
      Extract<DomainEventV7, { kind: "IMPROVEMENT_PILLAGED" }>,
      "resourceRestored"
    > & {
      readonly resourceRestored:
        "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null;
    });

export type ProjectedMonumentBuiltV7 =
  | {
      readonly kind: "MONUMENT_BUILT";
      readonly visibility: "FULL";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly achievement: AchievementIdV7;
      readonly at: CoordV7;
      readonly populationAdded: 3;
    }
  | {
      readonly kind: "MONUMENT_BUILT";
      readonly visibility: "BUILDING_ONLY";
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly populationAdded: 3;
    };

/**
 * Revision 19: `EGG_LAID` as seen by a viewer other than the Egg's owner;
 * Coins are owner-private, so the cost is hidden.
 */
export type ProjectedEggLaidV7 = Omit<
  Extract<DomainEventV7, { kind: "EGG_LAID" }>,
  "cost"
> & { readonly cost: null };

export interface ProjectedCombatSplashDamageV7 {
  readonly kind: "COMBAT_SPLASH_DAMAGE";
  readonly splash: readonly CombatSplashEntryV7[];
}

/**
 * The Dwarf revision (section 13.11): `UNIT_TUNNELLED` as seen by a viewer
 * that has not explored every tile it names (those tiles are null).
 */
export type ProjectedUnitTunnelledV7 = Omit<
  Extract<DomainEventV7, { kind: "UNIT_TUNNELLED" }>,
  "from" | "to"
> & {
  readonly from: CoordV7 | null;
  readonly to: CoordV7 | null;
};

/**
 * The Dwarf revision (section 13.11): `UNIT_SURFACED` as seen by a viewer
 * that owns an eruption victim but cannot see the Mole: its own entries
 * only, with the Mole and its tiles hidden (null).
 */
export type ProjectedUnitSurfacedV7 = Omit<
  Extract<DomainEventV7, { kind: "UNIT_SURFACED" }>,
  "unitId" | "at"
> & {
  readonly unitId: UnitId | null;
  readonly at: CoordV7 | null;
};

export type PlayerEventV7 =
  | Exclude<
      DomainEventV7,
      {
        kind:
          | "ECONOMIC_BUILDING_REMOVED"
          | "IMPROVEMENT_PILLAGED"
          | "MONUMENT_BUILT";
      }
    >
  | ProjectedUnitTunnelledV7
  | ProjectedUnitSurfacedV7
  | ProjectedResourceRestorationEventV7
  | ProjectedMonumentBuiltV7
  | ProjectedEggLaidV7
  | ProjectedCombatSplashDamageV7
  | PlayerPresentationEventV7;

export interface PlayerEventEnvelopeV7 {
  readonly format: "pulp-wars-player-events";
  readonly version: 7;
  readonly viewerId: PlayerId;
  readonly commandIndex: number;
  readonly events: readonly PlayerEventV7[];
}
