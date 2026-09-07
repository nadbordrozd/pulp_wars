import type { CityId, PlayerId, UnitId } from "../model/ids";
import type {
  AchievementIdV7,
  CoordV7,
  DefectionCancellationReasonV7,
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
  readonly breachApplied: boolean;
  readonly defenseBonusNumerator: number;
  readonly defenseBonusDenominator: number;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly retaliation: boolean;
  readonly noRetaliationReason: "DEFENDER_DIED" | "OUT_OF_RANGE" | null;
  readonly advances: boolean;
  readonly push: "WILL_PUSH" | "BLOCKED" | "UNKNOWN_BEHIND_FOG";
  readonly pursuitWillOpen: boolean;
}

export type DomainEventV7 =
  | {
      readonly kind: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly coins: number;
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
      readonly kind: "ECONOMIC_BUILDING_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly improvement: ImprovementIdV7;
      readonly cost: number;
      readonly populationContribution: number;
      readonly marketIncome: number;
      readonly capacityDelta: number;
    }
  | {
      readonly kind: "ECONOMIC_BUILDING_REMOVED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly improvement: ImprovementIdV7;
      readonly populationContributionRemoved: number;
      readonly marketIncomeRemoved: number;
      readonly capacityDelta: number;
      readonly resourceRestored: "FERTILE_GROUND" | "ORE" | "STONE" | null;
    }
  | {
      readonly kind: "FOREST_CLEARED" | "FOREST_REPLANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly coinDelta: number;
    }
  | {
      readonly kind: "ROAD_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly cost: 2;
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
      readonly kind: "UNIT_REWARD_GRANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly unitId: UnitId;
      readonly role: UnitRoleIdV7;
    }
  | {
      readonly kind: "UNIT_HEALED";
      readonly medicId: UnitId;
      readonly targetUnitId: UnitId;
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
      readonly kind: "UNIT_MOVED";
      readonly unitId: UnitId;
      readonly path: readonly CoordV7[];
    }
  | {
      readonly kind: "UNIT_PURSUED";
      readonly unitId: UnitId;
      readonly path: readonly CoordV7[];
      readonly from: CoordV7;
      readonly to: CoordV7;
    }
  | {
      readonly kind: "UNIT_MOVE_INTERRUPTED";
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly reason: "OCCUPIED" | "SURVEYING_REQUIRED" | "ZOC";
    }
  | {
      readonly kind: "TILES_REVEALED";
      readonly playerId: PlayerId;
      readonly tiles: readonly CoordV7[];
    }
  | { readonly kind: "COMBAT_RESOLVED"; readonly preview: CombatPreviewV7 }
  | {
      readonly kind: "PURSUIT_OPENED";
      readonly unitId: UnitId;
      readonly attacksUsed: 1 | 2;
      readonly attacksRemaining: 1 | 2;
    }
  | {
      readonly kind: "PURSUIT_ENDED";
      readonly unitId: UnitId;
      readonly attacksUsed: 1 | 2 | 3;
      readonly reason:
        | "NONLETHAL"
        | "THIRD_ATTACK"
        | "ATTACKER_DIED"
        | "EXPLICIT_END"
        | "STATE_CANCELLED";
    }
  | {
      readonly kind: "DEFECTION_OFFERED";
      readonly markId: number;
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly initiatingPlayerId: PlayerId;
      readonly targetOwnerId: PlayerId;
      readonly reservedHomeCityId: CityId;
      readonly offeredAtCommandIndex: number;
    }
  | {
      readonly kind: "DEFECTION_ARMED";
      readonly markId: number;
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly targetOwnerId: PlayerId;
    }
  | {
      readonly kind: "DEFECTION_CANCELLED";
      readonly markId: number;
      readonly reason: DefectionCancellationReasonV7;
    }
  | {
      readonly kind: "DEFECTION_RESOLVED";
      readonly markId: number;
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly fromPlayerId: PlayerId;
      readonly toPlayerId: PlayerId;
      readonly homeCityId: CityId;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "SABOTEUR_EXPOSED";
      readonly unitId: UnitId;
      readonly anchorPlayerId: PlayerId;
      readonly reason: "ATTACK" | "PILLAGE" | "BLACKOUT";
    }
  | {
      readonly kind: "BLACKOUT_PLANTED";
      readonly cityId: CityId;
      readonly sourceUnitId: UnitId;
      readonly sourceOwnerId: PlayerId;
      readonly targetOwnerId: PlayerId;
      readonly actionRound: number;
      readonly eligibleRound: number;
    }
  | {
      readonly kind: "BLACKOUT_ACTIVATED";
      readonly cityId: CityId;
      readonly ownerId: PlayerId;
      readonly suppressedCoins: number;
    }
  | {
      readonly kind: "BLACKOUT_RECOVERY_STARTED";
      readonly cityId: CityId;
      readonly ownerId: PlayerId;
      readonly reason: "AFFECTED_TURN_ENDED" | "CITY_CAPTURED";
    }
  | {
      readonly kind: "BLACKOUT_RECOVERY_COMPLETED";
      readonly cityId: CityId;
      readonly ownerId: PlayerId;
    }
  | {
      readonly kind: "IMPROVEMENT_PILLAGED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly improvement: ImprovementIdV7;
      readonly resourceRestored: "FERTILE_GROUND" | "ORE" | "STONE" | null;
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
      readonly kind: "UNIT_PROMOTED";
      readonly unitId: UnitId;
      readonly maxHp: number;
    }
  | {
      readonly kind: "UNIT_DIED";
      readonly unitId: UnitId;
      readonly cause: "ATTACK" | "RETALIATION" | "ELIMINATION";
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
      readonly requestedReward: "COINS" | "HEAVY";
      readonly grantedReward: "COINS" | "HEAVY";
      readonly coinDelta: 0 | 5;
      readonly heavyFallback: boolean;
      readonly spawnedUnitId: UnitId | null;
      readonly spawnedAt: CoordV7 | null;
      readonly homeCityId: CityId | null;
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
    }
  | {
      readonly kind: "DEFECTION_ENDPOINT_STATUS";
      readonly unitId: UnitId;
      readonly phase: "WAITING_FOR_REPLY" | "ARMED";
    };

export type ProjectedResourceRestorationEventV7 =
  | (Omit<
      Extract<DomainEventV7, { kind: "ECONOMIC_BUILDING_REMOVED" }>,
      "resourceRestored"
    > & {
      readonly resourceRestored:
        "FERTILE_GROUND" | "ORE" | "STONE" | "UNKNOWN_RESOURCE" | null;
    })
  | (Omit<
      Extract<DomainEventV7, { kind: "IMPROVEMENT_PILLAGED" }>,
      "resourceRestored"
    > & {
      readonly resourceRestored:
        "FERTILE_GROUND" | "ORE" | "STONE" | "UNKNOWN_RESOURCE" | null;
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
  | ProjectedResourceRestorationEventV7
  | ProjectedMonumentBuiltV7
  | PlayerPresentationEventV7;

export interface PlayerEventEnvelopeV7 {
  readonly format: "pulp-wars-player-events";
  readonly version: 7;
  readonly viewerId: PlayerId;
  readonly commandIndex: number;
  readonly events: readonly PlayerEventV7[];
}
