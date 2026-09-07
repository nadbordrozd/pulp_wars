import type { CityId, PlayerId, UnitId } from "../model/ids";

export const GAME_STATE_SCHEMA_VERSION_7 = 7 as const;
export const COMMAND_SCHEMA_VERSION_7 = 7 as const;
export const EVENT_SCHEMA_VERSION_7 = 7 as const;
export const SAVE_FORMAT_VERSION_7 = 7 as const;
export const REPLAY_FORMAT_VERSION_7 = 7 as const;
export const RULESET_7_ID = "pulp-wars-poc-7r2" as const;
export const SAVE_STORAGE_KEY_V7 = "pulpWars.save.v7r2.current" as const;
export const FACTION_IDS_V7 = Object.freeze(["ORIGINAL"] as const);
export const FACTION_TREE_IDS_V7 = Object.freeze([
  "ORIGINAL_BASELINE_V3",
] as const);
export const TERRAIN_IDS_V7 = Object.freeze([
  "GRASS",
  "FOREST",
  "MOUNTAIN",
] as const);
export const RESOURCE_IDS_V7 = Object.freeze([
  "FRUIT",
  "GAME",
  "FERTILE_GROUND",
  "ORE",
  "STONE",
] as const);
export const IMPROVEMENT_IDS_V7 = Object.freeze([
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
  "BARRACKS",
  "MONUMENT",
] as const);
export const ACHIEVEMENT_IDS_V7 = Object.freeze([
  "ENGINEER",
  "MUSTER",
] as const);
export const UNIT_ROLE_IDS_V7 = Object.freeze([
  "FIGHTER",
  "SCOUT",
  "ENVOY",
  "MARKSMAN",
  "GUARD",
  "RAIDER",
  "MEDIC",
  "CATAPULT",
  "SABOTEUR",
  "HEAVY",
  "LANCER",
  "BREACHER",
  "JUGGERNAUT",
] as const);
export const TECHNOLOGY_IDS_V7 = Object.freeze([
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
export const COMMAND_KIND_ORDER_V7 = Object.freeze([
  "MOVE",
  "PURSUE",
  "ATTACK",
  "OFFER_DEFECTION",
  "BLACKOUT_CITY",
  "HEAL_ADJACENT",
  "RECOVER",
  "CAPTURE",
  "PROMOTE",
  "PILLAGE",
  "DISBAND",
  "END_PURSUIT",
  "WAIT",
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
  "BUILD_BARRACKS",
  "BUILD_MONUMENT",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
  "TRAIN",
  "CHOOSE_CITY_REWARD",
  "END_TURN",
] as const);
export const REWARD_IDS_V7 = Object.freeze([
  "SURVEY",
  "STOCKPILE",
  "WALLS",
  "MILITIA",
  "EXPAND",
  "BOOM",
  "JUGGERNAUT",
  "TREASURY",
] as const);
export const CARDINAL_DIRECTION_ORDER_V7 = Object.freeze([
  "NORTH",
  "EAST",
  "SOUTH",
  "WEST",
] as const);
export const PURSUIT_PHASE_ORDER_V7 = Object.freeze([
  "NONE",
  "PURSUIT_READY",
  "PURSUIT_MOVED",
] as const);
export const DEFECTION_PHASE_ORDER_V7 = Object.freeze([
  "WAITING_FOR_REPLY",
  "ARMED",
] as const);
export const DEFECTION_CANCELLATION_REASON_ORDER_V7 = Object.freeze([
  "SOURCE_MISSING",
  "TARGET_MISSING",
  "SOURCE_OWNER_CHANGED",
  "TARGET_OWNER_CHANGED",
  "RELATIONSHIP_CHANGED",
  "OUT_OF_RANGE",
  "RESERVED_CITY_LOST",
  "CAPACITY_LOST",
  "INITIATOR_ELIMINATED",
  "TARGET_OWNER_ELIMINATED",
  "STATE_CANCELLED",
] as const);
export const BLACKOUT_PHASE_ORDER_V7 = Object.freeze([
  "PENDING",
  "ACTIVE",
  "RECOVERY",
] as const);
export const DOMAIN_EVENT_KIND_ORDER_V7 = Object.freeze([
  "TURN_STARTED",
  "INCOME_AWARDED",
  "INCOME_PREVIEWED",
  "TURN_ENDED",
  "TECH_RESEARCHED",
  "FRUIT_HARVESTED",
  "GAME_HUNTED",
  "ECONOMIC_BUILDING_BUILT",
  "ECONOMIC_BUILDING_REMOVED",
  "FOREST_CLEARED",
  "FOREST_REPLANTED",
  "ROAD_BUILT",
  "CITY_ECONOMY_CHANGED",
  "CITY_LEVELED_UP",
  "CITY_REWARD_QUEUED",
  "CITY_REWARD_CHOSEN",
  "CITY_REWARD_AUTOMATICALLY_GRANTED",
  "CITY_TERRITORY_EXPANDED",
  "ACHIEVEMENT_UNLOCKED",
  "MONUMENT_BUILT",
  "UNIT_TRAINED",
  "UNIT_REWARD_GRANTED",
  "UNIT_HEALED",
  "UNIT_PUSHED",
  "UNIT_MOVED",
  "UNIT_PURSUED",
  "UNIT_MOVE_INTERRUPTED",
  "TILES_REVEALED",
  "COMBAT_RESOLVED",
  "PURSUIT_OPENED",
  "PURSUIT_ENDED",
  "DEFECTION_OFFERED",
  "DEFECTION_ARMED",
  "DEFECTION_CANCELLED",
  "DEFECTION_RESOLVED",
  "SABOTEUR_EXPOSED",
  "BLACKOUT_PLANTED",
  "BLACKOUT_ACTIVATED",
  "BLACKOUT_RECOVERY_STARTED",
  "BLACKOUT_RECOVERY_COMPLETED",
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
  "UNIT_REVEALED",
  "UNIT_CONCEALED",
  "DEFECTION_ENDPOINT_STATUS",
] as const);

export type RulesetIdV7 = typeof RULESET_7_ID;
export type FactionIdV7 = (typeof FACTION_IDS_V7)[number];
export type FactionTreeIdV7 = (typeof FACTION_TREE_IDS_V7)[number];
export type TerrainIdV7 = (typeof TERRAIN_IDS_V7)[number];
export type ResourceIdV7 = (typeof RESOURCE_IDS_V7)[number];
export type ImprovementIdV7 = (typeof IMPROVEMENT_IDS_V7)[number];
export type AchievementIdV7 = (typeof ACHIEVEMENT_IDS_V7)[number];
export type UnitRoleIdV7 = (typeof UNIT_ROLE_IDS_V7)[number];
export type TechnologyIdV7 = (typeof TECHNOLOGY_IDS_V7)[number];
export type CommandKindV7 = (typeof COMMAND_KIND_ORDER_V7)[number];
export type RewardIdV7 = (typeof REWARD_IDS_V7)[number];
export type DomainEventKindV7 = (typeof DOMAIN_EVENT_KIND_ORDER_V7)[number];
export type DefectionCancellationReasonV7 =
  (typeof DEFECTION_CANCELLATION_REASON_ORDER_V7)[number];
export type BoardSizeV7 = 11 | 14 | 16 | 20 | 25;
export type AiCountV7 = 1 | 2 | 3;
export type PlayerColorV7 = "CORAL" | "TEAL" | "GOLD" | "VIOLET";

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
  readonly mapGenerationRevision: "SPATIAL_ECONOMY";
}

export interface RandomStateV7 {
  readonly algorithm: "MULBERRY32";
  readonly version: 1;
  readonly state: number;
}

export interface TileStateV7 {
  readonly at: CoordV7;
  readonly terrain: TerrainIdV7;
  readonly resource: ResourceIdV7 | null;
  readonly improvement: ImprovementIdV7 | null;
  readonly road: boolean;
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
  readonly factionTreeId: "ORIGINAL_BASELINE_V3";
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly coins: number;
  readonly researchedTechs: readonly TechnologyIdV7[];
  readonly explored: readonly CoordV7[];
  readonly spoilsClaimedCityIds: readonly CityId[];
  readonly achievementEntitlements: readonly AchievementEntitlementV7[];
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
  readonly attacksUsed: 0 | 1 | 2 | 3;
  readonly pursuitPhase: "NONE" | "PURSUIT_READY" | "PURSUIT_MOVED";
  readonly healed: boolean;
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
  readonly at: CoordV7;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivationV7;
  readonly blackoutEligibleRound: number | null;
}

export type CityBlackoutV7 =
  | {
      readonly phase: "PENDING";
      readonly sourceUnitId: UnitId;
      readonly sourceOwnerId: PlayerId;
      readonly plantedRound: number;
    }
  | {
      readonly phase: "ACTIVE";
      readonly sourceOwnerId: PlayerId;
      readonly suppressedCoins: number;
    }
  | {
      readonly phase: "RECOVERY";
      readonly recoveryOwnerId: PlayerId;
      readonly unaffectedTurnStarted: boolean;
    };

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
  readonly rewards: readonly CityRewardRecordV7[];
  readonly blackout: CityBlackoutV7 | null;
}

export interface DefectionMarkV7 {
  readonly id: number;
  readonly sourceUnitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly initiatingPlayerId: PlayerId;
  readonly recordedTargetOwnerId: PlayerId;
  readonly reservedHomeCityId: CityId;
  readonly offeredAtCommandIndex: number;
  readonly phase: "WAITING_FOR_REPLY" | "ARMED";
}

export interface SaboteurExposureV7 {
  readonly unitId: UnitId;
  readonly anchorPlayerId: PlayerId;
  readonly reason: "ATTACK" | "PILLAGE" | "BLACKOUT";
  readonly clearsAtAnchorNextEndTurn: true;
}

export type PopulationContributionSourceV7 =
  | {
      readonly kind: "RESOURCE_ACTION";
      readonly action: "HARVEST_FRUIT" | "HUNT_GAME";
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
  readonly defectionMarks: readonly DefectionMarkV7[];
  readonly saboteurExposures: readonly SaboteurExposureV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}
