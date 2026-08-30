import type { CityId, PlayerId, UnitId, WallId } from "../model/ids";

export const GAME_STATE_SCHEMA_VERSION_6 = 6 as const;
export const COMMAND_SCHEMA_VERSION_6 = 6 as const;
export const EVENT_SCHEMA_VERSION_6 = 6 as const;
export const SAVE_FORMAT_VERSION_6 = 6 as const;
export const REPLAY_FORMAT_VERSION_6 = 6 as const;
export const RULESET_6_ID = "pulp-wars-poc-6" as const;
export const SPATIAL_ECONOMY_REVISION = "SPATIAL_ECONOMY" as const;

export const FACTION_IDS_V6 = Object.freeze(["ORIGINAL", "CANDY"] as const);
export const FACTION_TREE_IDS = Object.freeze([
  "ORIGINAL_BASELINE",
  "CANDY_BASELINE_V1",
] as const);
export const TERRAIN_IDS_V6 = Object.freeze([
  "GRASS",
  "FOREST",
  "MOUNTAIN",
] as const);
export const RESOURCE_IDS = Object.freeze([
  "FRUIT",
  "GAME",
  "FERTILE_GROUND",
  "ORE",
  "STONE",
] as const);
export const ECONOMIC_IMPROVEMENT_IDS = Object.freeze([
  "FARM",
  "LUMBER_CAMP",
  "MINE",
  "QUARRY",
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "STONEWORKS",
  "WORKSHOP",
  "GRAND_WORKS",
  "MARKET",
] as const);
export const UNIT_ROLE_IDS = Object.freeze([
  "FIGHTER",
  "SCOUT",
  "MARKSMAN",
  "GUARD",
  "RAIDER",
  "MEDIC",
  "HEAVY",
  "BREACHER",
  "JUGGERNAUT",
] as const);
export const TECHNOLOGY_IDS = Object.freeze([
  "GATHERING",
  "FARMING",
  "MILLING",
  "CRAFT",
  "GRAND_WORKS",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "FIELDCRAFT",
  "SURVEYING",
  "MINING",
  "METALLURGY",
  "QUARRYING",
  "MASONRY",
  "SCOUTING",
  "ROADS",
  "COMMERCE",
  "RAIDING",
  "MANEUVER",
  "DRILL",
  "FORTIFICATION",
  "EXPLOSIVES",
  "MEDICINE",
  "RECOVERY",
] as const);
export const COMMAND_KIND_ORDER_V6 = Object.freeze([
  "MOVE",
  "ATTACK",
  "KAMIKAZE_ROLL",
  "HEAL_ADJACENT",
  "RECOVER",
  "CAPTURE",
  "PROMOTE",
  "WAIT",
  "BUILD_CHOCOLATE_WALL",
  "CANDIFY",
  "RESEARCH",
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
  "TRAIN",
  "CHOOSE_CANDIFY_CITY",
  "CHOOSE_CITY_REWARD",
  "END_TURN",
] as const);
export const CARDINAL_DIRECTION_ORDER_V6 = Object.freeze([
  "NORTH",
  "EAST",
  "SOUTH",
  "WEST",
] as const);
export const REWARD_IDS_V6 = Object.freeze([
  "SURVEY",
  "STOCKPILE",
  "WALLS",
  "MILITIA",
  "EXPAND",
  "BOOM",
  "JUGGERNAUT",
  "TREASURY",
] as const);

export type RulesetIdV6 = typeof RULESET_6_ID;
export type MapGenerationRevisionV6 = typeof SPATIAL_ECONOMY_REVISION;
export type FactionIdV6 = (typeof FACTION_IDS_V6)[number];
export type FactionTreeId = (typeof FACTION_TREE_IDS)[number];
export type TerrainIdV6 = (typeof TERRAIN_IDS_V6)[number];
export type ResourceId = (typeof RESOURCE_IDS)[number];
export type EconomicImprovementId = (typeof ECONOMIC_IMPROVEMENT_IDS)[number];
export type UnitRoleId = (typeof UNIT_ROLE_IDS)[number];
export type TechnologyId = (typeof TECHNOLOGY_IDS)[number];
export type TechIdV6 = TechnologyId;
export type CommandKindV6 = (typeof COMMAND_KIND_ORDER_V6)[number];
export type CardinalDirectionV6 = (typeof CARDINAL_DIRECTION_ORDER_V6)[number];
export type RewardIdV6 = (typeof REWARD_IDS_V6)[number];
export type BoardSizeV6 = 11 | 14 | 16 | 20 | 25;
export type AiCountV6 = 1 | 2 | 3;
export type AiModeV6 = "RIVAL" | "COOPERATIVE";
export type PlayerColorV6 = "CORAL" | "TEAL" | "GOLD" | "VIOLET";

export interface CoordV6 {
  readonly x: number;
  readonly y: number;
}

export interface MatchSetupV6 {
  readonly rulesetId: RulesetIdV6;
  readonly seed: number;
  readonly width: BoardSizeV6;
  readonly height: BoardSizeV6;
  readonly aiCount: AiCountV6;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: AiModeV6;
  readonly humanColor: PlayerColorV6;
  readonly factions: readonly FactionIdV6[];
  readonly mapGenerationRevision: MapGenerationRevisionV6;
}

export interface RandomStateV6 {
  readonly algorithm: "MULBERRY32";
  readonly version: 1;
  readonly state: number;
}

export interface TileStateV6 {
  readonly at: CoordV6;
  readonly terrain: TerrainIdV6;
  readonly resource: ResourceId | null;
  readonly improvement: EconomicImprovementId | null;
  readonly road: boolean;
  readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryCityId: CityId | null;
}

export interface BoardStateV6 {
  readonly width: BoardSizeV6;
  readonly height: BoardSizeV6;
  readonly tiles: readonly TileStateV6[];
}

export interface PlayerStateV6 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColorV6;
  readonly faction: FactionIdV6;
  readonly factionTreeId: FactionTreeId;
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly coins: number;
  readonly researchedTechs: readonly TechnologyId[];
  readonly explored: readonly CoordV6[];
}

export interface CityRewardRecordV6 {
  readonly reachedLevel: number;
  readonly reward: RewardIdV6;
}

export interface CityStateV6 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: CoordV6;
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number;
  readonly isCapital: boolean;
  readonly expanded: boolean;
  readonly rewards: readonly CityRewardRecordV6[];
}

export interface UnitActivationV6 {
  readonly moved: boolean;
  readonly movedPathLength: number;
  readonly attacked: boolean;
  readonly healed: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly specialActed: boolean;
}

export interface UnitStateV6 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  readonly role: UnitRoleId;
  readonly at: CoordV6;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly activation: UnitActivationV6;
}

export interface ChocolateWallStateV6 {
  readonly id: WallId;
  readonly ownerId: PlayerId;
  readonly at: CoordV6;
  readonly hp: number;
}

export type PendingChoiceV6 =
  | {
      readonly kind: "CITY_REWARD";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly candidates: readonly RewardIdV6[];
    }
  | {
      readonly kind: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    };

export type MatchOutcomeV6 =
  | { readonly kind: "VICTORY"; readonly winnerId: PlayerId }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
    }
  | { readonly kind: "HEADLESS_VICTORY"; readonly winnerId: PlayerId };

export interface GameStateV6 {
  readonly schemaVersion: typeof GAME_STATE_SCHEMA_VERSION_6;
  readonly rulesetId: RulesetIdV6;
  readonly setup: MatchSetupV6;
  readonly random: RandomStateV6;
  readonly humanPlayerId: PlayerId;
  readonly nextEntityId: number;
  readonly commandIndex: number;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly board: BoardStateV6;
  readonly players: readonly PlayerStateV6[];
  readonly cities: readonly CityStateV6[];
  readonly units: readonly UnitStateV6[];
  readonly chocolateWalls: readonly ChocolateWallStateV6[];
  readonly pendingChoices: readonly PendingChoiceV6[];
  readonly outcome: MatchOutcomeV6 | null;
}
