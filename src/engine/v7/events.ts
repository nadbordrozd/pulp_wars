import type { CityId, PlayerId, UnitId } from "../model/ids";
import type {
  AchievementIdV7,
  CoordV7,
  ImprovementIdV7,
  MatchOutcomeV7,
  NavalRoleIdV7,
  RewardIdV7,
  SummonedRoleIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "./types";

/**
 * The Cultists (`pulp_wars-mch9.4`, docs/product/RULESET_7_CULTISTS.md
 * section 3): what paid a Cult seat Favour, in the frozen order: a
 * Sacrifice, a Seizure, an Offering, a Chosen's Martyr, and (section 8.3,
 * `pulp_wars-mch9.6`) a bound daemon's kill. A consumption joins with the
 * Great Summoning (`pulp_wars-mch9.7`).
 */
export const FAVOUR_SOURCES_V7 = Object.freeze([
  "SACRIFICE",
  "SEIZE",
  "OFFERING",
  "MARTYR",
  "DAEMON_KILL",
] as const);
export type FavourSourceV7 = (typeof FAVOUR_SOURCES_V7)[number];

/**
 * The Cultists (`pulp_wars-mch9.5`, section 3): what a Cult seat spent
 * Favour on, in the frozen order: summoning a Horror. The Great Summoning
 * joins with the Herald (`pulp_wars-mch9.7`).
 */
export const FAVOUR_PURPOSES_V7 = Object.freeze(["SUMMON_HORROR"] as const);
export type FavourPurposeV7 = (typeof FAVOUR_PURPOSES_V7)[number];

/**
 * The Cultists (`pulp_wars-mch9.5`, section 6.2): how a cultist was
 * disrupted, in the frozen order: it lost Hit Points; it was moved by
 * anything but its own action; it got a status; it changed owner; it left
 * the board (a death, a Sacrifice, a Swallow, an embarkation). When several
 * happened in one command the first of this order is reported.
 */
export const DISRUPTION_CAUSES_V7 = Object.freeze([
  "HP_LOSS",
  "MOVED",
  "STATUS",
  "OWNER",
  "GONE",
] as const);
export type DisruptionCauseV7 = (typeof DISRUPTION_CAUSES_V7)[number];

/** One unit a Horror's Boo! reached (section 8.5). */
export interface ScaredUnitV7 {
  readonly unitId: UnitId;
  readonly from: CoordV7;
  /** Where it jumped to, or null when it could not jump and stayed. */
  readonly to: CoordV7 | null;
}

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
   * retaliation (the Vampire) and the defender survives. The Candy revision
   * (section 7): `SPLATTED` when the defender would have retaliated under
   * the ordinary rules but was Splatted this turn.
   */
  readonly noRetaliationReason:
    | "DEFENDER_DIED"
    | "OUT_OF_RANGE"
    | "UNANSWERED"
    | "SPLATTED"
    // The frozen sea (naval branch section 8.9): an icebound defender.
    | "ICEBOUND"
    // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen defender.
    | "FROZEN"
    // The Vampire and Banshee rework (`pulp_wars-ty6i`): a defender a
    // Banshee's Wail terrified this turn.
    | "TERROR"
    | null;
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
   * The Vampire and Banshee rework (`pulp_wars-ty6i`): Feast. The attack
   * kills, the attacker survives, and its role has `FEAST`: it heals to its
   * maximum HP (`attackerHeal`) and, after a first attack, may attack once
   * more (`attacksRemaining` 1).
   */
  readonly feast: boolean;
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
  /**
   * The Candy revision (docs/product/RULESET_7_CANDY.md section 13): the
   * attacker's Sugar Rush bonus (2 half-units) is in `attack2`.
   */
  readonly sugarRushApplied: boolean;
  /** The attack Splats its surviving target (a Pie Launcher's, section 7). */
  readonly splatApplied: boolean;
  /**
   * Section 8: the Bounce of the attacker off a Marshmallow or a Golem.
   * `UNKNOWN_BEHIND_FOG` only in an estimate by a viewer who has not
   * explored the tile.
   */
  readonly bounce: "NONE" | "WILL_BOUNCE" | "BLOCKED" | "UNKNOWN_BEHIND_FOG";
  /** The attacker's tile after the Bounce for `WILL_BOUNCE`, else null. */
  readonly bounceTo: CoordV7 | null;
  /**
   * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1):
   * the attack is a Patrol Boat's Ram. Its bonus (`RAM_BONUS2_V7`) is in
   * `attack2`, and `push` reports the shove of a surviving target.
   */
  readonly ram: boolean;
  /**
   * The naval branch (section 5.3): the attack is a Submarine's torpedo; it
   * draws no retaliation (`noRetaliationReason` is `UNANSWERED` when the
   * target survives).
   */
  readonly torpedo: boolean;
  /**
   * The frozen sea (section 8.10): the defender is an Ice Folk land unit on
   * ice with Glacier and no fortification of its own; its cover is the Snow
   * cover (`SNOW_COVER_V7`, in `defenseBonusNumerator` and
   * `defenseBonusDenominator`).
   */
  readonly iceCover: boolean;
  /**
   * The frozen sea (section 8.9): the defender is icebound and does not
   * retaliate (`noRetaliationReason` is `ICEBOUND` when it survives).
   */
  readonly icebound: boolean;
  /**
   * The ninth unit (`pulp_wars-w49.17`, 7r55): Shock Field. What the Shock
   * Field of a Shielded Shock Trooper attacked from the next tile took from
   * the attacker, HP and Shield together (0 without). It is included in
   * `damageToAttacker` and `attackerShieldDamage`, with or without a
   * retaliation, and may kill the attacker.
   */
  readonly shockDamage: number;
  /**
   * The ninth unit: the Thagomizer. The attack leaves its surviving target
   * Cracked (1 less Defense until the end of the attacker's owner's turn).
   */
  readonly crackApplied: boolean;
  /**
   * The ninth unit: Frostbite. The surviving attacker is Frozen for having
   * attacked a Musk Ox from the next tile (Ice Folk Freeze, w49.37).
   */
  readonly frostbiteApplied: boolean;
  /**
   * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.1):
   * Crushing Shove. `WILL_CRUSH` when the attacker crushes and its
   * surviving target is not pushed, `UNKNOWN_BEHIND_FOG` when `push` is
   * (the target is still crushed; only the blocker is unknown), otherwise
   * `NONE`. `crushDamage` is the HP the crush takes from the target and
   * `collisionDamage` the HP it takes from a hostile blocker behind it (0
   * without one, or when the blocker is unknown).
   */
  readonly crush: "NONE" | "WILL_CRUSH" | "UNKNOWN_BEHIND_FOG";
  readonly crushDamage: number;
  readonly collisionDamage: number;
  /**
   * Section 6.7: a Brass Titan's Siege Hammer (its removed levels are in
   * `fortificationIgnored`); `wallsDestroyed`, the target's city loses its
   * Walls.
   */
  readonly siegeHammer: boolean;
  readonly wallsDestroyed: boolean;
  /**
   * Section 6.6: the Frost Giant's Glacial Smash threshold (8) was the one
   * that shattered the target (`shatters` is true).
   */
  readonly glacialSmash: boolean;
  /**
   * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md section
   * 7.1): Sticky Toffee. `TARGET` when a Toffee Trooper's surviving target
   * is Stuck, `ATTACKER` when a Toffee Trooper struck back at a surviving
   * attacker, `BOTH` for a (mind-controlled) Trooper attacking a Trooper.
   */
  readonly stuckApplied: "NONE" | "TARGET" | "ATTACKER" | "BOTH";
  /**
   * Section 7.8: the surviving attacker gets Toothache for attacking a
   * Jawbreaker from distance 1.
   */
  readonly toothacheApplied: boolean;
  /**
   * Section 6.2: the attacker's own Toothache lowered this attack (its
   * `attack2` is 2 lower, never below 1) and is used up.
   */
  readonly toothacheAttack: boolean;
  /**
   * Section 7.3: a Gumball Gunner's Ricochet from distance 2: the unit the
   * gumball bounces to and its fixed hit, or null.
   */
  readonly ricochet: {
    readonly unitId: UnitId;
    readonly damage: number;
    readonly shieldDamage: number;
    readonly dies: boolean;
  } | null;
  /**
   * Section 7.7: a Chocolate Bunny's Thump on every other hostile unit
   * around the tile it stands on after the attack, sorted by unit ID.
   */
  readonly thump: readonly {
    readonly unitId: UnitId;
    readonly damage: number;
    readonly shieldDamage: number;
    readonly dies: boolean;
  }[];
  /**
   * Only in a public estimate: the Bunny's Bounce is `UNKNOWN_BEHIND_FOG`,
   * so `thump` lists the units around its unbounced tile.
   */
  readonly thumpUncertain: boolean;
}
/** One unit in a Stampede's way (`MAMMOTH_STAMPEDED`). */
export interface StampedeResultV7 {
  readonly unitId: UnitId;
  /** The unit's tile when the Mammoth reached it. */
  readonly at: CoordV7;
  readonly damage: number;
  readonly shieldDamage: number;
  readonly dies: boolean;
  /** The side tile it was shoved to; null when it died or stayed. */
  readonly shovedTo: CoordV7 | null;
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
      /**
       * The Candy revision (section 5.3): the Crash step of `playerId`'s End
       * Turn: the Rushed units that became Crashed and those Home Sweet Home
       * spared, each sorted by unit ID (at least one in all). A projection
       * keeps the units the viewer can see.
       */
      readonly kind: "UNITS_CRASHED";
      readonly playerId: PlayerId;
      readonly crashedUnitIds: readonly UnitId[];
      readonly sparedUnitIds: readonly UnitId[];
    }
  | {
      /**
       * The Candy revision (section 6.2): at `playerId`'s End Turn its
       * Crumbs on `tiles` (sorted by (y, x), at least one) went stale. A
       * projection keeps the tiles the viewer has explored.
       */
      readonly kind: "CRUMBS_STALE";
      readonly playerId: PlayerId;
      readonly tiles: readonly CoordV7[];
    }
  | {
      /**
       * The Candy revision (section 5.1): `unitId` of `playerId` went on a
       * Sugar Rush; `move` is its Rushed Move (its role's Move plus 1).
       */
      readonly kind: "UNIT_SUGAR_RUSHED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly move: number;
    }
  | {
      /**
       * The Candy revision (section 6.4): the Confectioner `unitId` of
       * `playerId` re-baked the Crumbs on `at` into `rebakedUnitId` of
       * `role`, homed to `cityId`, for `cost` Coins at `hp` HP.
       */
      readonly kind: "UNIT_REBAKED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly rebakedUnitId: UnitId;
      readonly role: UnitRoleIdV7;
      /**
       * The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 8.1): the
       * Crumbs were scooped from `from` (within 2 tiles) and the copy
       * appeared on `at`, next to the Confectioner.
       */
      readonly from: CoordV7;
      readonly at: CoordV7;
      readonly cityId: CityId;
      readonly cost: number;
      readonly hp: number;
    }
  | {
      /**
       * The Candy revision (section 9): the Gumball Gunner `unitId` of
       * `playerId` healed its own `targetUnitId` by `amount` to `hpAfter`.
       */
      readonly kind: "SUGAR_TOSSED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly amount: number;
      readonly hpAfter: number;
    }
  | {
      /**
       * The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 8.2): the
       * Confectioner `unitId` of `playerId` topped up its own adjacent
       * `targetUnitId`: `crashEnded` when it removed a Crash, a heal of
       * `amount` (0 to 2) to `hpAfter`, and `cured` when it cured Plague,
       * Bitten, Chill, Stuck, or Toothache.
       */
      readonly kind: "UNIT_TOPPED_UP";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly crashEnded: boolean;
      readonly amount: number;
      readonly hpAfter: number;
      readonly cured: boolean;
    }
  | {
      /**
       * The Candy redesign (section 7.1): the Toffee Trooper `sourceUnitId`
       * of `playerId` made `unitId` Stuck (a Move of one step) with
       * `endsLeft` 1 or 2.
       */
      readonly kind: "UNIT_STUCK";
      readonly playerId: PlayerId;
      readonly sourceUnitId: UnitId;
      readonly unitId: UnitId;
      readonly endsLeft: 1 | 2;
    }
  | {
      /**
       * The Candy redesign (section 7.8): the Jawbreaker `sourceUnitId` of
       * `playerId` gave the unit `unitId` that bit it Toothache (its next
       * attack 1 weaker) with `endsLeft` 1 or 2.
       */
      readonly kind: "TOOTHACHE_GIVEN";
      readonly playerId: PlayerId;
      readonly sourceUnitId: UnitId;
      readonly unitId: UnitId;
      readonly endsLeft: 1 | 2;
    }
  | {
      /**
       * The Candy redesign (section 7.2): the Donut Racer `unitId` of
       * `playerId` Glazed `tiles` (its start tile and the tiles its Move
       * passed, land only, sorted by (y, x)) for the rest of the turn.
       */
      readonly kind: "TILES_GLAZED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly tiles: readonly CoordV7[];
    }
  | {
      /**
       * The Candy redesign (section 7.3): the gumball of the Gumball Gunner
       * `unitId` of `playerId` ricocheted onto `targetUnitId` for `damage`
       * HP (`shieldDamage` absorbed).
       */
      readonly kind: "RICOCHETED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly damage: number;
      readonly shieldDamage: number;
      readonly dies: boolean;
    }
  | {
      /**
       * The Candy redesign (section 7.7): the Chocolate Bunny `unitId` of
       * `playerId` thumped every other hostile unit around it, sorted by
       * unit ID.
       */
      readonly kind: "THUMPED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly hits: readonly {
        readonly unitId: UnitId;
        readonly damage: number;
        readonly shieldDamage: number;
        readonly dies: boolean;
      }[];
    }
  | {
      /**
       * The Candy revision (section 6.3): `unitId` ended a Move or a landing
       * on the Crumbs of `role` that `playerId` (their owner) had on `at`
       * and ate them. With Peppermint Surprise it took `damage` HP and
       * `shieldDamage` on its Shield and `dies` says whether it died (0, 0,
       * and false without). In a projection to the Crumbs' owner that cannot
       * see the eater, `unitId`, `damage`, `shieldDamage`, and `dies` are
       * null.
       */
      readonly kind: "CRUMBS_EATEN";
      readonly playerId: PlayerId;
      readonly at: CoordV7;
      readonly role: UnitRoleIdV7;
      readonly unitId: UnitId;
      readonly damage: number;
      readonly shieldDamage: number;
      readonly dies: boolean;
    }
  | {
      /**
       * The Candy revision (section 6.1): a fallen unit of `role` left
       * Crumbs on `at` for its owner `playerId`, right after its `UNIT_DIED`
       * (and its `GRAVE_CREATED`). Any Crumbs on the tile are replaced.
       */
      readonly kind: "CRUMBS_LEFT";
      readonly playerId: PlayerId;
      readonly at: CoordV7;
      readonly role: UnitRoleIdV7;
    }
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
      /** 2 for an owner with Harbours (the naval branch section 5.4). */
      readonly populationAdded: 1 | 2;
    }
  | {
      readonly kind: "SHIPYARD_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 5;
      readonly populationAdded: 1;
      /** 3 for an owner with Harbours (the naval branch section 5.4). */
      readonly livePopulationTotal: 2 | 3;
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
      readonly kind: "FOREST_CULTIVATED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: number;
      readonly terrainBefore: "FOREST";
      readonly terrainAfter: "GRASS";
      readonly resourceBefore: null;
      /** Null for a viewer who cannot see Fertile Ground. */
      readonly resourceAfter: "FERTILE_GROUND" | null;
    }
  | {
      /**
       * Tuning 3 (`pulp_wars-w49.3`): `cityId` is the blasting player's
       * city whose territory holds `at` (it gains the population), or null
       * for a Mountain outside its territory, blasted next to one of its
       * units. The blast's `EXPLOSION_RESOLVED` (cause `BLAST`) follows.
       */
      readonly kind: "MOUNTAIN_BLASTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId | null;
      readonly at: CoordV7;
      readonly cost: number;
      readonly terrainBefore: "MOUNTAIN";
      readonly terrainAfter: "GRASS";
      readonly resourceBefore: null;
      readonly resourceAfter: null;
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
      /**
       * Dwarf crowd control (`pulp_wars-w49.33`): the Engineer `unitId` of
       * `playerId` built a Barricade on `at` for `cost` Coins.
       */
      readonly kind: "BARRICADE_BUILT";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly cost: number;
    }
  | {
      /**
       * Dwarf crowd control: the Engineer `unitId` of `playerId` repaired its
       * Barricade on `at` by `amount` to `hpAfter` (with a Repair).
       */
      readonly kind: "BARRICADE_REPAIRED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly amount: number;
      readonly hpAfter: number;
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
        | "UNDERMINED"
        /**
         * The giants' signatures (RULESET_7_GIANTS.md sections 6.4 and
         * 6.7): a Thunder Stomp smashes the Field Defense on the eight tiles
         * around the Brontosaurus; a Siege Hammer blow the one on its
         * target's tile.
         */
        | "STOMP"
        | "SIEGE_HAMMER";
    }
  | {
      readonly kind: "LAND_GRANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      /** Tuning 1 (7r46): 2 per explored claimed tile, at least 6. */
      readonly cost: number;
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
      readonly role: NavalRoleIdV7;
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
       * Ice Folk Freeze (`pulp_wars-w49.37`, RULESET_7_CURRENT.md section
       * 21.15): `sourceUnitId` of `playerId` (a Sled's Bolas, an Ice
       * Witch's Cold Snap or Frost Bolt, a Frost Giant's Cold Aura at the
       * end of its Move, a Musk Ox's Frostbite, or the shards of a unit a
       * Frost Giant shattered; null for Black Ice) froze every listed unit;
       * each result is its Frozen entry after the application, in unit-ID
       * order. A projection keeps the results the viewer can see (and a
       * target owner's own entries, with `sourceUnitId` null when the source
       * is hidden).
       */
      readonly kind: "UNITS_FROZEN";
      readonly playerId: PlayerId;
      readonly sourceUnitId: UnitId | null;
      readonly source:
        | "BOLAS"
        | "COLD_SNAP"
        | "FROST_BOLT"
        | "COLD_AURA"
        | "BLACK_ICE"
        | "FROSTBITE"
        | "SHARDS";
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly turnsLeft: 1 | 2;
      }[];
    }
  | {
      /**
       * The frozen sea (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4):
       * the unit `unitId` of `playerId` froze `tiles` (in (y, x) order; a
       * tile that was already ice is refreshed) and locked the afloat units
       * `icebound` (in unit-ID order) in the ice. A projection keeps the
       * tiles the viewer has explored and the units it can see, and is
       * dropped when no tile is left.
       */
      readonly kind: "WATER_FROZEN";
      readonly playerId: PlayerId;
      /** Null only in a projection to a viewer that cannot see the unit. */
      readonly unitId: UnitId | null;
      readonly tiles: readonly CoordV7[];
      readonly icebound: readonly UnitId[];
    }
  | {
      /**
       * The frozen sea (section 8.5): the ice on `tiles` (in (y, x) order)
       * melted at an End Turn, and the icebound units `freed` (in unit-ID
       * order) float free. Projected like `WATER_FROZEN`.
       */
      readonly kind: "ICE_MELTED";
      readonly tiles: readonly CoordV7[];
      readonly freed: readonly UnitId[];
    }
  | {
      /**
       * The frozen sea (section 8.9): at the Start Turn of `playerId` every
       * icebound unit on its ice took the crush, in unit-ID order: `damage`
       * is HP damage and `shieldDamage` what its Shield absorbed first.
       * Deaths follow as `UNIT_DIED` cause `CRUSHED`.
       */
      readonly kind: "UNITS_CRUSHED";
      readonly playerId: PlayerId;
      readonly results: readonly {
        readonly unitId: UnitId;
        readonly damage: number;
        readonly shieldDamage: number;
        readonly hpAfter: number;
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
         * Ice Folk Freeze (`pulp_wars-w49.37`): the tended unit was Frozen
         * and thawed.
         */
        readonly curedFrozen: boolean;
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
       * The Martian revision (section 8.4): the Saucer or Mothership
       * `sourceUnitId` pulled `targetUnitId` toward itself. `to` is the
       * final tile and `path` the tiles crossed in order (one, or two for
       * a Heavy Tractor Beam), ending with `to`.
       */
      readonly kind: "UNIT_PULLED";
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
      readonly path: readonly CoordV7[];
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
      /**
       * Map curiosities round 2 (section 28.3): the occupant `unitId` of an
       * exit gate was shoved from `from` (the gate) to `to` before a unit
       * came through.
       */
      readonly kind: "GATE_DISPLACED";
      readonly unitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      /**
       * Map curiosities round 2 (section 28.2): `unitId` of `playerId`
       * stepped onto the gate `from` and came out of its partner `to`.
       */
      readonly kind: "GATE_TRAVERSED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      /**
       * Map curiosities round 2 (section 28.3): the exit of the gate `at`
       * was occupied with no free tile around it, so `unitId` of `playerId`
       * stays on `at` with its Move spent.
       */
      readonly kind: "GATE_BLOCKED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
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
        | "MOUND"
        /**
         * Dwarf crowd control (`pulp_wars-w49.33`): the unit met a
         * Barricade on a tile it had not known before the command.
         */
        | "BARRICADE"
        /**
         * The frozen sea (naval branch section 8.7): a ground unit that
         * slips entered ice it had not known before the command and stopped
         * there.
         */
        | "ICE";
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
       * Dwarf crowd control (`pulp_wars-w49.33`): the Whirligig `unitId` on
       * `at` hit every target, in (y, x, id) order, with its ordinary attack
       * (`damage` is HP damage). Nothing struck back. Deaths follow as
       * `UNIT_DIED` cause `ATTACK`.
       */
      readonly kind: "WHIRL_RESOLVED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly results: readonly CombatSplashEntryV7[];
    }
  | {
      /**
       * Dwarf crowd control: the unit `unitId` of `playerId` attacked the
       * Barricade of `ownerId` on `at` for `damage`, leaving `hpAfter`;
       * `destroyed` when that is 0 (the Barricade is gone).
       */
      readonly kind: "BARRICADE_ATTACKED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly ownerId: PlayerId;
      readonly damage: number;
      readonly hpAfter: number;
      readonly destroyed: boolean;
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
      /**
       * The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror. The
       * results' units the Wail terrified (HP damage above 0, survived,
       * not neutral), sorted by unit ID; they do not strike back until the
       * end of the turn.
       */
      readonly terrified: readonly UnitId[];
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
      /**
       * Tuning 3 (`pulp_wars-w49.3`): `BLAST` is a Blast Mountain of
       * `playerId` on `at`; `unitId` is then the charge's fresh ID (no unit
       * has it) and `role` is `FIGHTER`.
       */
      readonly cause: "KABOOM" | "DEATH" | "BLAST";
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
      /** `PILLAGE_COINS_V7` (3 since tuning 4; 1 before). */
      readonly coinDelta: 3;
    }
  | {
      readonly kind: "UNIT_DISBANDED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly coinDelta: number;
    }
  | {
      /**
       * The Cultists (docs/product/RULESET_7_CULTISTS.md section 5.1): the
       * Summoner `unitId` of `playerId` sacrificed its own unit
       * `victimUnitId` (role `role`, on `at`) for `favour` Favour. The
       * victim's `UNIT_DIED` (cause `SACRIFICED`) and the seat's
       * `FAVOUR_GAINED` follow.
       */
      readonly kind: "UNIT_SACRIFICED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly victimUnitId: UnitId;
      readonly role: UnitRoleIdV7;
      readonly at: CoordV7;
      readonly favour: number;
    }
  | {
      /**
       * The Cultists (section 5.2): the Summoner `unitId` of `playerId`
       * seized the broken unit `victimUnitId` of `victimOwnerId` (role
       * `role`, on `at`), which its robed cultist `holderUnitId` held down,
       * for `favour` Favour (twice the victim's value). The victim's
       * `UNIT_DIED` (cause `SACRIFICED`) and the seat's `FAVOUR_GAINED`
       * follow.
       */
      readonly kind: "UNIT_SEIZED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly holderUnitId: UnitId;
      readonly victimUnitId: UnitId;
      readonly victimOwnerId: PlayerId;
      readonly role: UnitRoleIdV7;
      readonly at: CoordV7;
      readonly favour: number;
    }
  | {
      /**
       * The Cultists (section 5.3): the city `cityId` of `playerId` (its
       * center on `at`) gave up `population` population for `favour`
       * Favour. The city's `CITY_ECONOMY_CHANGED` and the seat's
       * `FAVOUR_GAINED` follow.
       */
      readonly kind: "OFFERING_MADE";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly population: 2;
      readonly favour: 3;
    }
  | {
      /**
       * The Cultists (section 3): the Cult seat `playerId` gained `amount`
       * Favour from `source` and has `favour` now. Favour is public, so the
       * event reaches every player; it names no unit and no tile.
       */
      readonly kind: "FAVOUR_GAINED";
      readonly playerId: PlayerId;
      readonly source: FavourSourceV7;
      readonly amount: number;
      readonly favour: number;
    }
  | {
      /**
       * The Cultists (`pulp_wars-mch9.5`, section 3): the Cult seat
       * `playerId` spent `amount` Favour on `purpose` and has `favour` left.
       * Public, like `FAVOUR_GAINED`; it names no unit and no tile.
       */
      readonly kind: "FAVOUR_SPENT";
      readonly playerId: PlayerId;
      readonly purpose: FavourPurposeV7;
      readonly amount: number;
      readonly favour: number;
    }
  | {
      /**
       * The Cultists (section 6.1): the Summoner `unitId` of `playerId` and
       * its helper `helperUnitId` summoned the daemon `daemonUnitId` (a
       * `role`) on `at`. The seat's `FAVOUR_SPENT` comes first; the two
       * `STRAND_FORMED` follow.
       */
      readonly kind: "DAEMON_SUMMONED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly helperUnitId: UnitId;
      readonly daemonUnitId: UnitId;
      readonly role: SummonedRoleIdV7;
      readonly at: CoordV7;
      readonly hp: number;
    }
  | {
      /**
       * The Cultists (section 6.2): the cultist `unitId` of `playerId`
       * holds a strand to the daemon `daemonUnitId` (a Channel, or a
       * summoning).
       */
      readonly kind: "STRAND_FORMED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly daemonUnitId: UnitId;
    }
  | {
      /**
       * The Cultists (section 6.2): the strand of the cultist `unitId` (of
       * `playerId` when it formed) to `daemonUnitId` broke: the cultist was
       * disrupted (`cause`).
       */
      readonly kind: "STRAND_BROKEN";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly daemonUnitId: UnitId;
      readonly cause: DisruptionCauseV7;
    }
  | {
      /** The Cultists (section 8.1): the Idol Bearer `unitId` raised its idol. */
      readonly kind: "IDOL_RAISED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
    }
  | {
      /**
       * The Cultists (section 8.1): the idol of `unitId` dropped: its
       * bearer was disrupted (`cause`), or it was lowered at the end of the
       * channel check of its owner's next Start Turn (`EXPIRED`).
       */
      readonly kind: "IDOL_DROPPED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cause: DisruptionCauseV7 | "EXPIRED";
    }
  | {
      /**
       * The Cultists (section 8.4): the Thing `unitId` of `playerId` grips
       * the channeller `cultistUnitId` beside it.
       */
      readonly kind: "ANCHOR_GRIPPED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cultistUnitId: UnitId;
    }
  | {
      /**
       * The Cultists (section 8.4): the grip of the Thing `unitId` on
       * `cultistUnitId` failed: the Thing was moved, given a status, taken,
       * or removed (`cause`; its own HP loss never matters). A grip whose
       * cultist was disrupted ends with that cultist's `STRAND_BROKEN`.
       */
      readonly kind: "ANCHOR_BROKEN";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cultistUnitId: UnitId;
      readonly cause: Exclude<DisruptionCauseV7, "HP_LOSS">;
    }
  | {
      /**
       * The Cultists (section 8.5): the Horror `unitId` of `playerId` Booed:
       * `results` lists every unit it reached, in the order they jumped.
       */
      readonly kind: "UNITS_SCARED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly results: readonly ScaredUnitV7[];
    }
  | {
      /**
       * The Cultists (sections 6.2 and 6.4): at the Start Turn check of
       * `summonerPlayerId` the daemon `unitId` had `strands` holding strands
       * against its `control`: it is Unbound. It belongs to nobody from
       * this event on; the events of its first rampage follow. Also sent,
       * with `strands` 0, for each bound daemon of a seat that is
       * eliminated (section 13.1): no rampage follows that one.
       */
      readonly kind: "DAEMON_UNBOUND";
      readonly unitId: UnitId;
      readonly summonerPlayerId: PlayerId;
      readonly strands: number;
      readonly control: number;
    }
  | {
      /**
       * The Cultists (section 6.5, `pulp_wars-mch9.6`): the strands of
       * `playerId` on the Unbound daemon `unitId` reached its `control`
       * (`strands` of them) in one turn: it is bound to that seat,
       * exhausted until its next turn.
       */
      readonly kind: "DAEMON_BOUND";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly strands: number;
      readonly control: number;
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
       * Map curiosities round 2 (section 30.2): `unitId` of `playerId` on
       * the Wishing Well at `at` tossed a Coin; `outcome` is the player's
       * draw, `coinsGained` 5 for `COINS` (else 0), and `hpAfter` the unit's
       * HP after the toss (full after a `HEAL`, unless a construct).
       */
      readonly kind: "COIN_TOSSED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly outcome: "SPLASH" | "COINS" | "HEAL" | "VISION";
      readonly coinsGained: number;
      readonly hpAfter: number;
    }
  | {
      /**
       * Map curiosities (section 8.5): the neutral turn of the wilds after
       * the last seat's turn of `round`, inside the `END_TURN` that ends the
       * round. Every Monster acts between the two events; public to every
       * viewer (they say only that the wilds took their turn).
       */
      readonly kind: "NEUTRAL_TURN_STARTED" | "NEUTRAL_TURN_ENDED";
      readonly round: number;
    }
  | {
      /**
       * Map curiosities (section 8.5): the Monster `unitId` regenerated
       * `amount` (1 to 4) to `hpAfter` at the end of the neutral turn.
       */
      readonly kind: "MONSTER_REGENERATED";
      readonly unitId: UnitId;
      readonly amount: number;
      readonly hpAfter: number;
    }
  | {
      /**
       * Map curiosities (section 8.7; round 2, sections 25.6 and 29.4):
       * `playerId` was credited with the death of the neutral unit `unitId`
       * and gained its breed's bounty `coins` (the Spider 10, a Grunt 3, a
       * Ray Gunner or Shield Projector 4, a Zombie 5, Bigfoot 12). Owner
       * only, like Plunder.
       */
      readonly kind: "MONSTER_BOUNTY_AWARDED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly coins: number;
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
        | "ERUPTION"
        /**
         * The Candy revision (section 6.3): an eater killed by the
         * Peppermint Surprise of the Crumbs it ate.
         */
        | "PEPPERMINT"
        /**
         * The frozen sea (naval branch section 8.9): an icebound unit
         * crushed by the ice (no credit, no Grave).
         */
        | "CRUSHED"
        /**
         * The giants' signatures (RULESET_7_GIANTS.md section 6.0, G5): a
         * Juggernaut's crush or collision, a Thunder Stomp, an Overstride's
         * trample (each like a splash death), and a swallowed unit digested
         * (nothing is left: no Grave, Crumbs, blast, or rising).
         */
        | "CRUSH"
        | "STOMP"
        | "TRAMPLE"
        | "DIGESTED"
        /**
         * Ice Folk Freeze (`pulp_wars-w49.37`): a Mammoth's Stampede (like
         * a splash death). The Candy redesign (RULESET_7_CANDY_REDESIGN.md
         * sections 7.3 and 7.7): a Gumball Gunner's Ricochet and a Chocolate
         * Bunny's Thump (each like a splash death).
         */
        | "STAMPEDE"
        | "RICOCHET"
        | "THUMP"
        /**
         * The Cultists (docs/product/RULESET_7_CULTISTS.md sections 5.1 and
         * 5.2): a unit a Summoner offered to the Ancient Ones, its own
         * (after `UNIT_SACRIFICED`: a removal, no kill) or a broken enemy
         * (after `UNIT_SEIZED`: a kill credited to the Summoner). Nothing
         * is left: no Grave, Crumbs, blast, or rising.
         */
        | "SACRIFICED";
    }
  | {
      /**
       * The giants' signatures (section 6.1): the Juggernaut `sourceUnitId`
       * of `playerId` crushed its target `targetUnitId`, which it could not
       * push, for `damage` HP (`shieldDamage` absorbed); a hostile unit on
       * the tile behind it (`blockerUnitId`, null without one or in a
       * projection to a viewer that cannot see it) took `blockerDamage`.
       */
      readonly kind: "UNIT_CRUSHED";
      readonly playerId: PlayerId;
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly damage: number;
      readonly shieldDamage: number;
      readonly dies: boolean;
      readonly blockerUnitId: UnitId | null;
      readonly blockerDamage: number;
      readonly blockerShieldDamage: number;
      readonly blockerDies: boolean;
    }
  | {
      /**
       * Section 6.2: the Abomination `unitId` of `playerId` swallowed the
       * unit `victimUnitId` of `victimOwnerId` (role `role`, `hp` HP).
       */
      readonly kind: "UNIT_SWALLOWED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly victimUnitId: UnitId;
      readonly victimOwnerId: PlayerId;
      readonly role: UnitRoleIdV7;
      readonly hp: number;
    }
  | {
      /**
       * Section 6.2: at `playerId`'s Start Turn its Abomination `unitId`
       * digested `amount` HP of its victim (`hpAfter` left, 0 when it died)
       * and healed `healed` HP.
       */
      readonly kind: "UNIT_DIGESTED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly victimUnitId: UnitId;
      readonly amount: number;
      readonly hpAfter: number;
      readonly healed: number;
    }
  | {
      /**
       * Section 6.2: the digested victim came back out of the Abomination
       * as the Zombie `zombieUnitId` on `at` (both null when no tile around
       * it was free).
       */
      readonly kind: "UNIT_REGURGITATED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly victimUnitId: UnitId;
      readonly zombieUnitId: UnitId | null;
      readonly at: CoordV7 | null;
    }
  | {
      /**
       * Section 6.2: the unit `unitId` of `playerId` that the Abomination
       * `holderUnitId` held stands on `at` again, with `hp` HP (its holder
       * died there, or the holder's owner was eliminated).
       */
      readonly kind: "SWALLOWED_UNIT_RELEASED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly holderUnitId: UnitId;
      readonly at: CoordV7;
      readonly hp: number;
    }
  | {
      /**
       * Section 6.3: the Troll `unitId` of `playerId` threw its Goblin
       * `passengerUnitId` from `from` onto `to`.
       */
      readonly kind: "GOBLIN_TOSSED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly passengerUnitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      /**
       * Section 6.4: the Brontosaurus `unitId` of `playerId` stamped: every
       * hostile ground unit around it took the fixed Stomp damage
       * (`results`, sorted by (y, x, unitId); a projection keeps the units
       * the viewer owns or could see), and the Field Defense on
       * `fieldDefenses` was smashed.
       */
      readonly kind: "THUNDER_STOMP";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly results: readonly CombatSplashEntryV7[];
      readonly fieldDefenses: readonly CoordV7[];
    }
  | {
      /**
       * Section 6.5: the Colossus `unitId` of `playerId` trampled the
       * hostile units it stepped over in its Move, in path order.
       */
      readonly kind: "UNITS_TRAMPLED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly results: readonly CombatSplashEntryV7[];
    }
  | {
      /**
       * Section 6.7: the Brass Titan `byUnitId` tore down the Walls of the
       * city `cityId` (public: Walls are).
       */
      readonly kind: "WALLS_DESTROYED";
      readonly cityId: CityId;
      readonly byUnitId: UnitId;
    }
  | {
      /**
       * Section 6.8 (as the user changed it on 2026-10-09): the Gingerbread
       * Giant `unitId` of `playerId` spent `BREAK_OFF_HP_V7` HP and made
       * the two Gingerbread Men `newUnitIds` on `tiles` (in the same order,
       * (y, x)), homed to `cityId`, each with `hp` HP.
       */
      readonly kind: "GIANT_BROKE_OFF";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly newUnitIds: readonly [UnitId, UnitId];
      readonly tiles: readonly [CoordV7, CoordV7];
      readonly cityId: CityId;
      readonly hp: number;
    }
  | {
      /**
       * Ice Folk Freeze (`pulp_wars-w49.37`, RULESET_7_CURRENT.md section
       * 21.18): the Mammoth `unitId` of `playerId` stampeded from `from`
       * along `path` (the tiles it entered, in order; empty when the first
       * tile was blocked) and stands on `to`. Each hostile unit in its way
       * is a result in path order: the fixed hit (`damage` HP, `shieldDamage`
       * absorbed, `dies`) and the tile it was shoved to (`shovedTo`, null
       * when it died or could not be shoved, which stopped the Mammoth). The
       * deaths follow as `UNIT_DIED` with the cause `STAMPEDE`. A projection
       * keeps the results the viewer can see.
       */
      readonly kind: "MAMMOTH_STAMPEDED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly from: CoordV7;
      readonly to: CoordV7;
      readonly path: readonly CoordV7[];
      readonly results: readonly StampedeResultV7[];
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
       * The ninth unit (`pulp_wars-w49.17`, 7r55): Rise Again. At the Start
       * Turn of `playerId` a Wight climbed out of its own Grave on `at` as
       * the new unit `unitId` with `hp`; the Grave is gone.
       */
      readonly kind: "WIGHT_RISEN";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly hp: number;
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
       * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section
       * 4.2): the ship `unitId` of `playerId` boarded the ship
       * `targetUnitId` of `fromPlayerId` on `at`. The prize now belongs to
       * `playerId` (its kind follows its new owner) and has `hp`.
       */
      readonly kind: "SHIP_BOARDED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly fromPlayerId: PlayerId;
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

/**
 * Damage to the viewer's own units from a source it cannot see: the splash
 * of a hidden attack and, since tuning 6 (`pulp_wars-w49.6`), the unit
 * that attack hit directly (the first entry). It names no attacker.
 */
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

/**
 * The Candy revision (section 12.14): `CRUMBS_EATEN` as seen by the Crumbs'
 * owner when it cannot see the eater: the eater and the bite are hidden.
 */
export type ProjectedCrumbsEatenV7 = Omit<
  Extract<DomainEventV7, { kind: "CRUMBS_EATEN" }>,
  "unitId" | "damage" | "shieldDamage" | "dies"
> & {
  readonly unitId: null;
  readonly damage: null;
  readonly shieldDamage: null;
  readonly dies: null;
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
  | ProjectedCrumbsEatenV7
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
