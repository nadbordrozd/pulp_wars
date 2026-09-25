import type { CityId, PlayerId, UnitId } from "../model/ids";

export const GAME_STATE_SCHEMA_VERSION_7 = 7 as const;
export const COMMAND_SCHEMA_VERSION_7 = 7 as const;
export const EVENT_SCHEMA_VERSION_7 = 7 as const;
export const SAVE_FORMAT_VERSION_7 = 7 as const;
export const REPLAY_FORMAT_VERSION_7 = 7 as const;
export const RULESET_7_ID = "pulp-wars-poc-7r10" as const;
export const SAVE_STORAGE_KEY_V7 = "pulpWars.save.v7r10.current" as const;
export const FACTION_IDS_V7 = Object.freeze(["ORIGINAL"] as const);
export const FACTION_TREE_IDS_V7 = Object.freeze([
  "ORIGINAL_BASELINE_V5",
] as const);
export const TERRAIN_IDS_V7 = Object.freeze([
  "GRASS",
  "FOREST",
  "MOUNTAIN",
  "SHALLOW_WATER",
  "DEEP_WATER",
] as const);
export const BIOME_IDS_V7 = Object.freeze([
  "PLAINS",
  "WOODLAND",
  "HIGHLANDS",
] as const);
export const RESOURCE_IDS_V7 = Object.freeze([
  "FRUIT",
  "FERTILE_GROUND",
  "GAME",
  "ORE",
  "FISH",
  "PEARLS",
] as const);
export const IMPROVEMENT_IDS_V7 = Object.freeze([
  "FARM",
  "LUMBER_CAMP",
  "MINE",
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "MARKET",
  "MONUMENT",
  "PORT",
  "SHIPYARD",
] as const);
export const ACHIEVEMENT_IDS_V7 = Object.freeze([
  "EXPLORER",
  "ENGINEER",
  "MUSTER",
] as const);
export const UNIT_ROLE_IDS_V7 = Object.freeze([
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
  "PATROL_BOAT",
  "BATTLESHIP",
] as const);
export const TECHNOLOGY_IDS_V7 = Object.freeze([
  "GATHERING",
  "FARMING",
  "MILLING",
  "ADMINISTRATION",
  "PLANNING",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "FIELDCRAFT",
  "SCOUTING",
  "ROADS",
  "COMMERCE",
  "RAIDING",
  "CHIVALRY",
  "DRILL",
  "ENGINEERING",
  "METALLURGY",
  "FORTIFICATION",
  "EXPLOSIVES",
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
] as const);
export const COMMAND_KIND_ORDER_V7 = Object.freeze([
  "MOVE",
  "ATTACK",
  "RALLY",
  "TEND_WOUNDED",
  "RECOVER",
  "CAPTURE",
  "PROMOTE",
  "PILLAGE",
  "DISBAND",
  "WAIT",
  "RESEARCH",
  "HARVEST_FISH",
  "GATHER_PEARLS",
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_WORKSHOP",
  "BUILD_MARKET",
  "BUILD_MONUMENT",
  "BUILD_PORT",
  "BUILD_SHIPYARD",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "CULTIVATE_FOREST",
  "BLAST_MOUNTAIN",
  "BUILD_ROAD",
  "REDEVELOP",
  "LAND_GRANT",
  "TRAIN",
  "TRAIN_NAVAL",
  "BUILD_FIELD_DEFENSE",
  "DISEMBARK",
  "CHOOSE_CITY_REWARD",
  "END_TURN",
] as const);
export const REWARD_IDS_V7 = Object.freeze([
  "SURVEY",
  "STOCKPILE",
  "WALLS",
  "MILITIA",
  "BOOM",
  "TREASURY_8",
  "JUGGERNAUT",
  "TREASURY",
] as const);
export const CARDINAL_DIRECTION_ORDER_V7 = Object.freeze([
  "NORTH",
  "EAST",
  "SOUTH",
  "WEST",
] as const);
export const DOMAIN_EVENT_KIND_ORDER_V7 = Object.freeze([
  "TURN_STARTED",
  "INCOME_AWARDED",
  "INCOME_PREVIEWED",
  "TURN_ENDED",
  "TECH_RESEARCHED",
  "FISH_HARVESTED",
  "PEARLS_GATHERED",
  "PORT_BUILT",
  "SHIPYARD_BUILT",
  "PORT_BLOCKADE_CHANGED",
  "SEA_NETWORK_CHANGED",
  "FRUIT_HARVESTED",
  "GAME_HUNTED",
  "ECONOMIC_BUILDING_BUILT",
  "ECONOMIC_BUILDING_REMOVED",
  "FOREST_CLEARED",
  "FOREST_REPLANTED",
  "FOREST_CULTIVATED",
  "MOUNTAIN_BLASTED",
  "ROAD_BUILT",
  "FIELD_DEFENSE_BUILT",
  "FIELD_DEFENSE_DESTROYED",
  "LAND_GRANTED",
  "CITY_ECONOMY_CHANGED",
  "CITY_LEVELED_UP",
  "CITY_REWARD_QUEUED",
  "CITY_REWARD_CHOSEN",
  "CITY_REWARD_AUTOMATICALLY_GRANTED",
  "CITY_TERRITORY_EXPANDED",
  "ACHIEVEMENT_UNLOCKED",
  "MONUMENT_BUILT",
  "UNIT_TRAINED",
  "NAVAL_UNIT_TRAINED",
  "UNIT_EMBARKED",
  "UNIT_DISEMBARKED",
  "UNIT_REWARD_GRANTED",
  "UNIT_SPAWN_DISPLACED",
  "UNITS_RALLIED",
  "WOUNDED_TENDED",
  "UNIT_PUSHED",
  "UNIT_MOVED",
  "UNIT_MOVE_INTERRUPTED",
  "TILES_REVEALED",
  "COMBAT_RESOLVED",
  "IMPROVEMENT_PILLAGED",
  "UNIT_DISBANDED",
  "SPOILS_AWARDED",
  "UNIT_RECOVERED",
  "UNIT_WAITED",
  "UNIT_PROMOTED",
  "UNIT_DIED",
  "CITY_CAPTURED",
  "TREASURE_CAPTURED",
  "PLAYER_ELIMINATED",
  "MATCH_ENDED",
] as const);
export const PLAYER_EVENT_KIND_ORDER_V7 = Object.freeze([
  ...DOMAIN_EVENT_KIND_ORDER_V7,
  "COMBAT_SPLASH_DAMAGE",
  "UNIT_REVEALED",
  "UNIT_CONCEALED",
] as const);

export type RulesetIdV7 = typeof RULESET_7_ID;
export type FactionIdV7 = (typeof FACTION_IDS_V7)[number];
export type FactionTreeIdV7 = (typeof FACTION_TREE_IDS_V7)[number];
export type TerrainIdV7 = (typeof TERRAIN_IDS_V7)[number];
export type BiomeIdV7 = (typeof BIOME_IDS_V7)[number];
export type ResourceIdV7 = (typeof RESOURCE_IDS_V7)[number];
export type ImprovementIdV7 = (typeof IMPROVEMENT_IDS_V7)[number];
export type AchievementIdV7 = (typeof ACHIEVEMENT_IDS_V7)[number];
export type UnitRoleIdV7 = (typeof UNIT_ROLE_IDS_V7)[number];
export type TechnologyIdV7 = (typeof TECHNOLOGY_IDS_V7)[number];
export type CommandKindV7 = (typeof COMMAND_KIND_ORDER_V7)[number];
export type RewardIdV7 = (typeof REWARD_IDS_V7)[number];
export type DomainEventKindV7 = (typeof DOMAIN_EVENT_KIND_ORDER_V7)[number];
export type BoardSizeV7 = 11 | 14 | 16 | 20 | 25;
export type AiCountV7 = 1 | 2 | 3;
export type PlayerColorV7 = "CORAL" | "TEAL" | "GOLD" | "VIOLET";
export type MapTypeV7 =
  "DRY_LAND" | "PANGEA" | "CONTINENTS" | "ARCHIPELAGO" | "LAKES";

export interface CoordV7 {
  readonly x: number;
  readonly y: number;
}

export interface MatchSetupV7 {
  readonly rulesetId: RulesetIdV7;
  readonly seed: number;
  readonly width: BoardSizeV7;
  readonly height: BoardSizeV7;
  readonly aiCount: AiCountV7;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: PlayerColorV7;
  readonly factions: readonly FactionIdV7[];
  readonly mapType: MapTypeV7;
  readonly mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2";
}

export interface RandomStateV7 {
  readonly algorithm: "MULBERRY32";
  readonly version: 1;
  readonly state: number;
}

export interface TileStateV7 {
  readonly at: CoordV7;
  readonly biome: BiomeIdV7 | null;
  readonly terrain: TerrainIdV7;
  readonly resource: ResourceIdV7 | null;
  readonly improvement: ImprovementIdV7 | null;
  readonly road: boolean;
  readonly fieldDefense: boolean;
  readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryCityId: CityId | null;
}

export interface BoardStateV7 {
  readonly width: BoardSizeV7;
  readonly height: BoardSizeV7;
  readonly tiles: readonly TileStateV7[];
}

export interface PlayerStateV7 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColorV7;
  readonly faction: "ORIGINAL";
  readonly factionTreeId: "ORIGINAL_BASELINE_V5";
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly coins: number;
  readonly researchedTechs: readonly TechnologyIdV7[];
  readonly explored: readonly CoordV7[];
  readonly spoilsClaimedCityIds: readonly CityId[];
  readonly achievementEntitlements: readonly AchievementEntitlementV7[];
  readonly originalCapitalCityId: CityId;
}

export interface AchievementEntitlementV7 {
  readonly achievement: AchievementIdV7;
  readonly unlocked: boolean;
  readonly spent: boolean;
}

export interface UnitActivationV7 {
  readonly moved: boolean;
  readonly movedPathLength: number;
  readonly attacked: boolean;
  readonly attacksUsed: number;
  readonly tendedThisTurn: boolean;
  readonly inspired: boolean;
  readonly overrunActive: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly specialActed: boolean;
}

export interface UnitStateV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  readonly role: UnitRoleIdV7;
  readonly form: "LAND" | "EMBARKED" | "NAVAL";
  readonly at: CoordV7;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivationV7;
}

export interface CityRewardRecordV7 {
  readonly reachedLevel: number;
  readonly reward: RewardIdV7;
}

export interface CityStateV7 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: CoordV7;
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number;
  readonly isCapital: boolean;
  readonly expanded: boolean;
  readonly landGrantUsed: boolean;
  readonly rewards: readonly CityRewardRecordV7[];
}

export type PopulationContributionSourceV7 =
  | {
      readonly kind: "RESOURCE_ACTION";
      readonly action: "HARVEST_FRUIT" | "HUNT_GAME";
      readonly at: CoordV7;
    }
  | {
      readonly kind: "RESOURCE_ACTION";
      readonly action: "HARVEST_FISH";
      readonly at: CoordV7;
    }
  | {
      readonly kind: "IMPROVEMENT";
      readonly improvement: ImprovementIdV7;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "CITY_REWARD";
      readonly reward: "BOOM";
      readonly reachedLevel: 4;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "MONUMENT";
      readonly achievement: AchievementIdV7;
      readonly at: CoordV7;
    };

export interface PopulationContributionV7 {
  readonly id: number;
  readonly cityId: CityId;
  readonly category: "PERMANENT" | "LIVE";
  readonly amount: number;
  readonly source: PopulationContributionSourceV7;
}

export interface PendingChoiceV7 {
  readonly kind: "CITY_REWARD";
  readonly cityId: CityId;
  readonly reachedLevel: number;
  readonly candidates: readonly RewardIdV7[];
}

export type MatchOutcomeV7 =
  | { readonly kind: "VICTORY"; readonly winnerId: PlayerId }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
    }
  | { readonly kind: "HEADLESS_VICTORY"; readonly winnerId: PlayerId };

export interface GameStateV7 {
  readonly schemaVersion: 7;
  readonly rulesetId: RulesetIdV7;
  readonly setup: MatchSetupV7;
  readonly random: RandomStateV7;
  readonly humanPlayerId: PlayerId;
  readonly nextEntityId: number;
  readonly commandIndex: number;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly board: BoardStateV7;
  readonly players: readonly PlayerStateV7[];
  readonly cities: readonly CityStateV7[];
  readonly populationContributions: readonly PopulationContributionV7[];
  readonly units: readonly UnitStateV7[];
  readonly treasureChests: readonly CoordV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}
