import type { CityId, UnitId } from "../model/ids";
import type {
  CardinalDirection,
  CombatTargetRef,
  Coord,
  RewardId,
  TechId,
  UnitType,
} from "../model/types";

export type Command =
  | { readonly kind: "RESEARCH"; readonly tech: TechId }
  | { readonly kind: "HARVEST_FRUIT"; readonly at: Coord }
  | { readonly kind: "HUNT_ANIMAL"; readonly at: Coord }
  | { readonly kind: "BUILD_LUMBER_MILL"; readonly at: Coord }
  | { readonly kind: "BUILD_MINE"; readonly at: Coord }
  | { readonly kind: "TRAIN"; readonly cityId: CityId; readonly unit: UnitType }
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly target: CombatTargetRef;
    }
  | {
      readonly kind: "ESCAPE_MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | { readonly kind: "RECOVER"; readonly unitId: UnitId }
  | { readonly kind: "WAIT"; readonly unitId: UnitId }
  | { readonly kind: "PROMOTE"; readonly unitId: UnitId }
  | { readonly kind: "CAPTURE"; readonly unitId: UnitId }
  | {
      readonly kind: "KAMIKAZE_ROLL";
      readonly unitId: UnitId;
      readonly direction: CardinalDirection;
    }
  | {
      readonly kind: "BUILD_CHOCOLATE_WALL";
      readonly unitId: UnitId;
      readonly at: Coord;
    }
  | { readonly kind: "CANDIFY"; readonly unitId: UnitId }
  | {
      readonly kind: "CHOOSE_CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly cityId: CityId;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reward: RewardId;
    }
  | { readonly kind: "END_TURN" };

export interface CommandEnvelope {
  readonly format: "pulp-wars-command";
  readonly version: 5;
  readonly command: Command;
}

export interface CommandSummary {
  readonly kind: Command["kind"];
  readonly command: Command;
}
