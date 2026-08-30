import type { CityId, PlayerId, UnitId, WallId } from "../model/ids";
import type { CombatTargetRefV6 } from "./commands";
import type {
  CoordV6,
  EconomicImprovementId,
  MatchOutcomeV6,
  RewardIdV6,
  TechnologyId,
  UnitRoleId,
} from "./types";

export interface CityIncomeEntryV6 {
  readonly cityId: CityId;
  readonly coins: number;
}

export interface CombatPreviewV6 {
  readonly attackerId: UnitId;
  readonly target: CombatTargetRefV6;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly advances: boolean;
  readonly noRetaliationReason:
    | "DEFENDER_DIED"
    | "OUT_OF_RANGE"
    | "ATTACKER_UNEXPLORED"
    | "STRUCTURE"
    | null;
}

export type DomainEventV6 =
  | {
      readonly kind: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly coins: number;
    }
  | {
      readonly kind: "INCOME_AWARDED" | "INCOME_PREVIEWED";
      readonly playerId: PlayerId;
      readonly totalCoins: number;
      readonly cities: readonly CityIncomeEntryV6[];
    }
  | { readonly kind: "TURN_ENDED"; readonly playerId: PlayerId }
  | {
      readonly kind: "TECH_RESEARCHED";
      readonly playerId: PlayerId;
      readonly tech: TechnologyId;
      readonly cost: number;
    }
  | {
      readonly kind: "FRUIT_HARVESTED" | "GAME_HUNTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV6;
      readonly cost: number;
      readonly permanentPopulationAdded: 1;
    }
  | {
      readonly kind: "ECONOMIC_BUILDING_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV6;
      readonly improvement: EconomicImprovementId;
      readonly cost: number;
      readonly populationContribution: number;
      readonly marketIncome: number;
    }
  | {
      readonly kind: "ECONOMIC_BUILDING_REMOVED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV6;
      readonly improvement: EconomicImprovementId;
      readonly populationContributionRemoved: number;
      readonly marketIncomeRemoved: number;
    }
  | {
      readonly kind: "FOREST_CLEARED" | "FOREST_REPLANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV6;
      readonly coinDelta: number;
    }
  | {
      readonly kind: "ROAD_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: CoordV6;
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
      readonly candidates: readonly RewardIdV6[];
    }
  | {
      readonly kind: "CITY_REWARD_CHOSEN";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: RewardIdV6;
    }
  | {
      readonly kind: "CITY_TERRITORY_EXPANDED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly tiles: readonly CoordV6[];
    }
  | {
      readonly kind: "UNIT_TRAINED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly unitId: UnitId;
      readonly role: UnitRoleId;
      readonly cost: number;
      readonly at: CoordV6;
    }
  | {
      readonly kind: "UNIT_REWARD_GRANTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly unitId: UnitId;
      readonly role: UnitRoleId;
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
      readonly from: CoordV6;
      readonly to: CoordV6;
    }
  | {
      readonly kind: "UNIT_MOVED";
      readonly unitId: UnitId;
      readonly path: readonly CoordV6[];
    }
  | {
      readonly kind: "UNIT_MOVE_INTERRUPTED";
      readonly unitId: UnitId;
      readonly at: CoordV6;
      readonly reason: "OCCUPIED" | "SURVEYING_REQUIRED" | "ZOC";
    }
  | {
      readonly kind: "TILES_REVEALED";
      readonly playerId: PlayerId;
      readonly tiles: readonly CoordV6[];
    }
  | { readonly kind: "COMBAT_RESOLVED"; readonly preview: CombatPreviewV6 }
  | {
      readonly kind: "DONUT_ROLL_STEP";
      readonly unitId: UnitId;
      readonly at: CoordV6;
    }
  | {
      readonly kind: "ROLL_DAMAGE_RESOLVED";
      readonly sourceUnitId: UnitId;
      readonly target: CombatTargetRefV6;
      readonly at: CoordV6;
      readonly damage: number;
      readonly hpBefore: number;
      readonly hpAfter: number;
    }
  | {
      readonly kind: "CHOCOLATE_WALL_BUILT";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly wallId: WallId;
      readonly at: CoordV6;
      readonly cost: 1;
      readonly hp: 10;
    }
  | {
      readonly kind: "CHOCOLATE_WALL_DESTROYED";
      readonly wallId: WallId;
      readonly ownerId: PlayerId;
      readonly at: CoordV6;
      readonly cause: "ATTACK" | "KAMIKAZE_ROLL";
    }
  | {
      readonly kind: "CANDIFY_CITY_CHOICE_REQUIRED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    }
  | {
      readonly kind: "TILE_CANDIFIED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cityId: CityId;
      readonly at: CoordV6;
      readonly previousCityId: CityId | null;
      readonly previousOwnerId: PlayerId | null;
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
      readonly cause:
        | "ATTACK"
        | "RETALIATION"
        | "ELIMINATION"
        | "KAMIKAZE_ROLL"
        | "KAMIKAZE_ROLL_SELF"
        | "CANDIFY";
    }
  | {
      readonly kind: "CITY_CAPTURED";
      readonly cityId: CityId;
      readonly from: PlayerId | null;
      readonly to: PlayerId;
    }
  | { readonly kind: "PLAYER_ELIMINATED"; readonly playerId: PlayerId }
  | { readonly kind: "MATCH_ENDED"; readonly outcome: MatchOutcomeV6 };

export interface EventEnvelopeV6 {
  readonly format: "pulp-wars-events";
  readonly version: 6;
  readonly commandIndex: number;
  readonly events: readonly DomainEventV6[];
}
