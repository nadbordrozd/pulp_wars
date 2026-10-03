import type { CityId, PlayerId, UnitId } from "../model/ids";

export const GAME_STATE_SCHEMA_VERSION_7 = 7 as const;
export const COMMAND_SCHEMA_VERSION_7 = 7 as const;
export const EVENT_SCHEMA_VERSION_7 = 7 as const;
export const SAVE_FORMAT_VERSION_7 = 7 as const;
export const REPLAY_FORMAT_VERSION_7 = 7 as const;
export const RULESET_7_ID = "pulp-wars-poc-7r28" as const;
/**
 * Every earlier Ruleset 7 identity, oldest first. Readers report these as
 * incompatible (never invalid). An identity bump must append the outgoing
 * `RULESET_7_ID` here; a unit test pins that this list is gap-free.
 */
export const PRIOR_RULESET_7_IDS = Object.freeze([
  "pulp-wars-poc-7",
  "pulp-wars-poc-7r2",
  "pulp-wars-poc-7r3",
  "pulp-wars-poc-7r4",
  "pulp-wars-poc-7r5",
  "pulp-wars-poc-7r6",
  "pulp-wars-poc-7r7",
  "pulp-wars-poc-7r8",
  "pulp-wars-poc-7r9",
  "pulp-wars-poc-7r10",
  "pulp-wars-poc-7r11",
  "pulp-wars-poc-7r12",
  "pulp-wars-poc-7r13",
  "pulp-wars-poc-7r14",
  "pulp-wars-poc-7r15",
  "pulp-wars-poc-7r16",
  "pulp-wars-poc-7r17",
  "pulp-wars-poc-7r18",
  "pulp-wars-poc-7r19",
  "pulp-wars-poc-7r20",
  "pulp-wars-poc-7r21",
  "pulp-wars-poc-7r22",
  "pulp-wars-poc-7r23",
  "pulp-wars-poc-7r24",
  "pulp-wars-poc-7r25",
  "pulp-wars-poc-7r26",
  "pulp-wars-poc-7r27",
] as const);
export const SAVE_STORAGE_KEY_V7 = "pulpWars.save.v7r28.current" as const;
export const FACTION_IDS_V7 = Object.freeze([
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  // The Martian revision (docs/product/RULESET_7_MARTIANS.md).
  "MARTIAN",
  // The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md).
  "ICE_FOLK",
] as const);
export const FACTION_TREE_IDS_V7 = Object.freeze([
  "ORIGINAL_BASELINE_V5",
  "UNDEAD_BASELINE_V1",
  "GOBLIN_BASELINE_V1",
  "DINOSAUR_BASELINE_V1",
  "MARTIAN_BASELINE_V1",
  "ICE_FOLK_BASELINE_V1",
] as const);
export const TERRAIN_IDS_V7 = Object.freeze([
  "GRASS",
  "FOREST",
  "MOUNTAIN",
  "SHALLOW_WATER",
  "DEEP_WATER",
  // The Rift (docs/product/RULESET_7_RIFT.md): land that only flyers stand on.
  "RIFT",
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
  // Revision 21 (docs/product/RULESET_7_REVISION_21_ACHIEVEMENTS.md).
  "CONQUEROR",
  "LAND_BARON",
  "SEA_DOG",
  "SLAYER",
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
  "RAISE_DEAD",
  "DEVOUR",
  "WAIL",
  "KABOOM",
  "HATCH",
  // The Martian revision: Saucer, Brain, and Mothership primary actions.
  "BEAM_DOWN",
  "MIND_CONTROL",
  "TRACTOR_BEAM",
  // The Ice Folk revision: the Sled's Bolas and the Ice Witch's Cold Snap.
  "THROW_BOLAS",
  "COLD_SNAP",
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
  "LAY_EGG",
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
  "PLAGUE_DAMAGED",
  "PLAGUE_SPREAD",
  "PLAGUE_EXPIRED",
  "WINDMILL_HEALING_RESOLVED",
  "UNITS_REGENERATED",
  "SHIELDS_RECHARGED",
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
  "EGG_LAID",
  "EGG_HATCHED",
  "UNIT_EMBARKED",
  "UNIT_DISEMBARKED",
  "UNIT_BEAMED",
  "UNIT_REWARD_GRANTED",
  "UNIT_SPAWN_DISPLACED",
  "UNITS_RALLIED",
  // The Ice Folk revision: a Bolas, a Cold Snap, or a Cold Aura chilled units.
  "UNITS_CHILLED",
  "WOUNDED_TENDED",
  "DEAD_RAISED",
  "GRAVE_DEVOURED",
  "UNIT_PUSHED",
  "UNIT_PULLED",
  "UNIT_MOVED",
  "UNIT_MOVE_INTERRUPTED",
  "TILES_REVEALED",
  "COMBAT_RESOLVED",
  "WAIL_RESOLVED",
  "EXPLOSION_RESOLVED",
  "IMPROVEMENT_PILLAGED",
  "UNIT_DISBANDED",
  "SPOILS_AWARDED",
  "PLUNDER_AWARDED",
  "UNIT_RECOVERED",
  "UNIT_WAITED",
  "UNIT_PROMOTED",
  "UNIT_GREW",
  "UNIT_DIED",
  "UNIT_INFECTED",
  "UNIT_MIND_CONTROLLED",
  "GRAVE_CREATED",
  "BITTEN_UNIT_RISEN",
  "PLAGUE_CLEARED",
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
/**
 * The five generated map types, plus the revision-18 fixed `SHOWCASE` board
 * (16 x 16, three developed cities and one unit of every role per seat).
 */
export type MapTypeV7 =
  "DRY_LAND" | "PANGEA" | "CONTINENTS" | "ARCHIPELAGO" | "LAKES" | "SHOWCASE";

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
  readonly faction: FactionIdV7;
  readonly factionTreeId: FactionTreeIdV7;
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
  /** Revision 12 Raider Escape: one ordinary Move remains after an Attack. */
  readonly escapeAvailable: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly specialActed: boolean;
}

export type UnitFormV7 = "LAND" | "EMBARKED" | "NAVAL" | "EGG";

/**
 * Revision 19: whether a unit of this form is afloat (a naval unit or an
 * embarked land unit). An Egg stands on land, so "not `LAND`" no longer
 * means afloat; rules about water, docks, and blockades use this instead.
 */
export function isAfloatFormV7(form: UnitFormV7): boolean {
  return form === "NAVAL" || form === "EMBARKED";
}

export interface UnitStateV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  readonly role: UnitRoleIdV7;
  /**
   * Revision 19: `EGG` is a Dinosaur Egg (an immobile unit with a countdown
   * in `GameStateV7.eggs`). Eggs are laid from `pulp_wars-c87.3`; until then
   * no state holds one.
   */
  readonly form: UnitFormV7;
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
  readonly cityActionAvailable: boolean;
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
  /**
   * Revision 13 Grave markers, sorted by (y, x) without duplicates. Always
   * empty in a match whose setup has no UNDEAD seat.
   */
  readonly graves: readonly CoordV7[];
  /**
   * Revision 14 Plague: one entry per plagued unit, sorted by `unitId`. Always
   * empty in a match whose setup has no UNDEAD seat.
   */
  readonly plagued: readonly PlagueStatusV7[];
  /**
   * Revision 14 Bitten: one entry per bitten unit, sorted by `unitId`. Always
   * empty in a match whose setup has no UNDEAD seat.
   */
  readonly bitten: readonly BittenStatusV7[];
  /**
   * Revision 19 Eggs: one entry per unit of form `EGG`, sorted by `unitId`.
   * Always empty in a match whose setup has no DINOSAUR seat.
   */
  readonly eggs: readonly EggStatusV7[];
  /**
   * The Martian revision (section 5.1): the current Shield of every unit
   * whose Shield is at least 1, sorted by `unitId`. Always empty in a match
   * whose setup has no MARTIAN seat.
   */
  readonly shields: readonly ShieldStatusV7[];
  /**
   * The Martian revision (section 6.2): heat-ray Cooling entries, sorted by
   * `unitId`. Always empty in a match whose setup has no MARTIAN seat.
   */
  readonly cooling: readonly CoolingStatusV7[];
  /**
   * The Martian revision (section 8.3): one entry per Thrall, sorted by
   * `unitId`. Always empty in a match whose setup has no MARTIAN seat.
   */
  readonly thralls: readonly ThrallStatusV7[];
  /**
   * The Martian revision (section 8.2): Mind Control cooldowns of Brains,
   * sorted by `unitId`. Always empty in a match whose setup has no MARTIAN
   * seat.
   */
  readonly mindControlCooldowns: readonly MindControlCooldownV7[];
  /**
   * The Ice Folk revision (section 5.1): one Chill entry per frosted or
   * thawing unit, sorted by `unitId`. Always empty in a match whose setup
   * has no ICE_FOLK seat. It is the only stored Ice Folk state: Snow and the
   * Blizzard are derived on every read.
   */
  readonly chilled: readonly ChillStatusV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

/**
 * The Ice Folk revision (section 5.1): the Chill entry of `unitId`. The unit
 * is Chilled while `turnsLeft` is at least 1 and thawing at 0; it is
 * sluggish while `sluggish` is true (only with `turnsLeft` 2). The legal
 * combinations are `{ true, 2 }`, `{ false, 2 }`, `{ false, 1 }`, and
 * `{ false, 0 }`.
 */
export interface ChillStatusV7 {
  readonly unitId: UnitId;
  readonly sluggish: boolean;
  readonly turnsLeft: 0 | 1 | 2;
}

/** The Martian revision: the current Shield (at least 1) of `unitId`. */
export interface ShieldStatusV7 {
  readonly unitId: UnitId;
  readonly shield: number;
}

/**
 * The Martian revision: a heat-ray unit that fired at full power. It is
 * Cooling exactly while `firedThisTurn` is false (from the end of the turn
 * it fired in until the end of its owner's next turn).
 */
export interface CoolingStatusV7 {
  readonly unitId: UnitId;
  readonly firedThisTurn: boolean;
}

/** The Martian revision: the Thrall `unitId` is controlled by `brainUnitId`. */
export interface ThrallStatusV7 {
  readonly unitId: UnitId;
  readonly brainUnitId: UnitId;
}

/**
 * The Martian revision: the Brain `unitId` cannot use Mind Control while it
 * has an entry; `turnsRemaining` (0 to 2) counts its owner's Start Turns
 * before the entry is removed.
 */
export interface MindControlCooldownV7 {
  readonly unitId: UnitId;
  readonly turnsRemaining: number;
}

/**
 * Revision 14: a living unit plagued by the Lich `sourceUnitId`. Revision 15:
 * `turnsRemaining` is the number of its owner's Start Turn Plague steps still
 * to resolve (3 when applied; the entry expires when it reaches 0), and the
 * unit spreads Plague only on the step where it is still 3.
 */
export interface PlagueStatusV7 {
  readonly unitId: UnitId;
  readonly sourceUnitId: UnitId;
  readonly turnsRemaining: number;
}

/**
 * Revision 14: a living unit last damaged by the Zombie `biterUnitId` of
 * `biterPlayerId`. The Zombie may have died since; it only homes the rising.
 */
export interface BittenStatusV7 {
  readonly unitId: UnitId;
  readonly biterPlayerId: PlayerId;
  readonly biterUnitId: UnitId;
}

/**
 * Revision 19: the countdown of the Egg `unitId`. `turnsRemaining` is the
 * number of its owner's Start Turns still to come before it hatches (at least
 * 1); `laidThisTurn` is true from `LAY_EGG` until its owner's next Start Turn.
 */
export interface EggStatusV7 {
  readonly unitId: UnitId;
  readonly turnsRemaining: number;
  readonly laidThisTurn: boolean;
}
