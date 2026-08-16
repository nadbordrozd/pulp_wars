import type { CityId, PlayerId, UnitId } from "./ids";

export const GAME_STATE_SCHEMA_VERSION = 4 as const;
export const RULESET_ID = "pulp-wars-poc-4" as const;

export type RulesetId = typeof RULESET_ID;
export type BoardSize = 11 | 14 | 16 | 20 | 25;
export type AiCount = 1 | 2 | 3;
export type AiMode = "RIVAL" | "COOPERATIVE";
export type MatchScenario = "DEMO";
export type PlayerColor = "CORAL" | "TEAL" | "GOLD" | "VIOLET";
export type TechId =
  | "CLIMBING"
  | "RIDING"
  | "HUNTING"
  | "ORGANIZATION"
  | "MINING"
  | "FORESTRY"
  | "ARCHERY"
  | "STRATEGY"
  | "MATHEMATICS";
export type UnitType = "WARRIOR" | "ARCHER" | "DEFENDER" | "RIDER" | "CATAPULT";
export type RewardId = "WORKSHOP" | "SURVEY" | "RESOURCES" | "CITY_WALL";

export interface Coord {
  readonly x: number;
  readonly y: number;
}

export interface MatchSetup {
  readonly rulesetId: RulesetId;
  readonly seed: number;
  readonly width: BoardSize;
  readonly height: BoardSize;
  readonly aiCount: AiCount;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: AiMode;
  readonly humanColor: PlayerColor;
  /** Absent is the canonical standard match. */
  readonly scenario?: MatchScenario;
}

export interface RandomState {
  readonly algorithm: "MULBERRY32";
  readonly version: 1;
  readonly state: number;
}

export interface TileState {
  readonly at: Coord;
  readonly terrain: "GRASS" | "MOUNTAIN" | "FOREST";
  readonly resource: "FRUIT" | "ORE" | "ANIMAL" | null;
  readonly improvement: "MINE" | "LUMBER_MILL" | null;
  readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryCenter: Coord | null;
  readonly territoryCityId: CityId | null;
}

export interface BoardState {
  readonly width: BoardSize;
  readonly height: BoardSize;
  readonly tiles: readonly TileState[];
}

export interface PlayerState {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColor;
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly stars: number;
  readonly researchedTechs: readonly TechId[];
  readonly explored: readonly Coord[];
}

export interface CityState {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: Coord;
  readonly level: number;
  readonly population: number;
  readonly isCapital: boolean;
  readonly rewardLevel2: "WORKSHOP" | "SURVEY" | null;
  readonly rewardLevel3: "RESOURCES" | "CITY_WALL" | null;
}

export interface UnitActivation {
  readonly moved: boolean;
  readonly attacked: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  /** Durable per-turn attention state, distinct from action legality. */
  readonly handled: boolean;
  readonly escapeAvailable: boolean;
}

export interface UnitState {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  /** Founding units do not consume their assigned city's training limit. */
  readonly capacityExempt: boolean;
  readonly type: UnitType;
  readonly at: Coord;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly ready: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivation;
}

export interface PublicPlayerState {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColor;
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly stars: number;
  readonly researchedTechs: readonly TechId[];
}

export type PlayerTileView =
  | { readonly at: Coord; readonly explored: false }
  | {
      readonly at: Coord;
      readonly explored: false;
      readonly diplomaticBlock: "ALLIED_TERRITORY";
    }
  | ({ readonly explored: true } & TileState & {
        /** Relationship-only path boundary; prior tile knowledge remains. */
        readonly diplomaticBlock?: "ALLIED_TERRITORY";
      });

export interface PlayerBoardView {
  readonly width: BoardSize;
  readonly height: BoardSize;
  readonly tiles: readonly PlayerTileView[];
}

export interface PlayerView {
  readonly schemaVersion: typeof GAME_STATE_SCHEMA_VERSION;
  readonly rulesetId: RulesetId;
  /** Observation-safe accepted-command revision for ephemeral UI reset logic. */
  readonly commandIndex: number;
  readonly setup: MatchSetup;
  readonly humanPlayerId: PlayerId;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly viewer: PlayerState;
  readonly players: readonly PublicPlayerState[];
  readonly board: PlayerBoardView;
  readonly cities: readonly PlayerCityView[];
  readonly units: readonly PlayerUnitView[];
  readonly pendingChoice: PendingChoice | null;
  readonly outcome: MatchOutcome | null;
}

export type PlayerUnitView = Omit<UnitState, "capacityExempt"> & {
  /** Present only when this unit is owned by the viewer. */
  readonly capacityExempt?: boolean;
};

export type PlayerCityView = CityState & {
  /** Present only when this city is owned by the viewer. */
  readonly assignedCounted?: number;
  /** Present only when this city is owned by the viewer. */
  readonly assignedExempt?: number;
};

export type PendingChoice = {
  readonly kind: "CITY_REWARD";
  readonly cityId: CityId;
  readonly level: 2 | 3;
};

export type MatchOutcome =
  | { readonly kind: "VICTORY"; readonly winnerId: PlayerId }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
    }
  | { readonly kind: "HEADLESS_VICTORY"; readonly winnerId: PlayerId };

export interface GameState {
  readonly schemaVersion: typeof GAME_STATE_SCHEMA_VERSION;
  readonly rulesetId: RulesetId;
  readonly setup: MatchSetup;
  readonly random: RandomState;
  /** Immutable diplomatic role, independent of a headless policy controller. */
  readonly humanPlayerId: PlayerId;
  readonly nextEntityId: number;
  readonly commandIndex: number;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly board: BoardState;
  readonly players: readonly PlayerState[];
  readonly cities: readonly CityState[];
  readonly units: readonly UnitState[];
  readonly pendingChoice: PendingChoice | null;
  readonly outcome: MatchOutcome | null;
}
