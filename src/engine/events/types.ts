import type { CityId, PlayerId, UnitId } from "../model/ids";
import type {
  Coord,
  MatchOutcome,
  RewardId,
  TechId,
  UnitType,
} from "../model/types";

export interface CombatPreview {
  readonly attackerId: UnitId;
  readonly defenderId: UnitId;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly advances: boolean;
  readonly noRetaliationReason:
    "DEFENDER_DIED" | "OUT_OF_RANGE" | "ATTACKER_UNEXPLORED" | null;
}

export interface CityIncomeEntry {
  readonly cityId: CityId;
  readonly amount: number;
}

export type DomainEvent =
  | {
      readonly kind: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly income: number;
    }
  | {
      readonly kind: "INCOME_AWARDED" | "INCOME_PREVIEWED";
      readonly playerId: PlayerId;
      readonly total: number;
      readonly cities: readonly CityIncomeEntry[];
    }
  | { readonly kind: "TURN_ENDED"; readonly playerId: PlayerId }
  | {
      readonly kind: "TECH_RESEARCHED";
      readonly playerId: PlayerId;
      readonly tech: TechId;
      readonly cost: number;
    }
  | {
      readonly kind: "FRUIT_HARVESTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 2;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "ANIMAL_HUNTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 2;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "LUMBER_MILL_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 3;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "MINE_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 5;
      readonly populationAdded: 2;
    }
  | {
      readonly kind: "CITY_LEVELED_UP";
      readonly cityId: CityId;
      readonly level: number;
    }
  | {
      readonly kind: "CITY_REWARD_CHOSEN";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly level: 2 | 3;
      readonly reward: RewardId;
      readonly starsAwarded: number;
    }
  | {
      readonly kind: "UNIT_MOVED";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "UNIT_MOVE_INTERRUPTED";
      readonly unitId: UnitId;
      readonly at: Coord;
      readonly reason: "OCCUPIED" | "CLIMBING_REQUIRED" | "ZOC";
    }
  | {
      readonly kind: "UNIT_TRAINED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly unitId: UnitId;
      readonly unit: UnitType;
      readonly cost: number;
      readonly at: Coord;
    }
  | {
      readonly kind: "TILES_REVEALED";
      readonly playerId: PlayerId;
      readonly tiles: readonly Coord[];
    }
  | { readonly kind: "COMBAT_RESOLVED"; readonly preview: CombatPreview }
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
  | { readonly kind: "PLAYER_ELIMINATED"; readonly playerId: PlayerId }
  | { readonly kind: "MATCH_ENDED"; readonly outcome: MatchOutcome };

export interface EventEnvelope {
  readonly format: "pulp-wars-events";
  readonly version: 5;
  readonly commandIndex: number;
  readonly events: readonly DomainEvent[];
}
