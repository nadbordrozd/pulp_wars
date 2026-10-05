import type { CityId, PlayerId, UnitId } from "../model/ids";

export const GAME_STATE_SCHEMA_VERSION_7 = 7 as const;
export const COMMAND_SCHEMA_VERSION_7 = 7 as const;
export const EVENT_SCHEMA_VERSION_7 = 7 as const;
export const SAVE_FORMAT_VERSION_7 = 7 as const;
export const REPLAY_FORMAT_VERSION_7 = 7 as const;
export const RULESET_7_ID = "pulp-wars-poc-7r40" as const;
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
  "pulp-wars-poc-7r28",
  "pulp-wars-poc-7r29",
  "pulp-wars-poc-7r30",
  "pulp-wars-poc-7r31",
  "pulp-wars-poc-7r32",
  "pulp-wars-poc-7r33",
  "pulp-wars-poc-7r34",
  "pulp-wars-poc-7r35",
  "pulp-wars-poc-7r36",
  "pulp-wars-poc-7r37",
  "pulp-wars-poc-7r38",
  "pulp-wars-poc-7r39",
] as const);
export const SAVE_STORAGE_KEY_V7 = "pulpWars.save.v7r40.current" as const;
/**
 * The map generator a setup names (docs/product/RULESET_7_MAP_SCALE.md
 * section 8.8, `pulp_wars-ykw.2`): `V3` is the village-density generator
 * (settlements per land tile, villages one tile from the edge, the wild
 * reserve). A setup naming any other revision is invalid.
 */
export const MAP_GENERATION_REVISION_V7 = "REGIONAL_BIOMES_NAVAL_V3" as const;
export type MapGenerationRevisionV7 = typeof MAP_GENERATION_REVISION_V7;
export const FACTION_IDS_V7 = Object.freeze([
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  // The Martian revision (docs/product/RULESET_7_MARTIANS.md).
  "MARTIAN",
  // The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md).
  "ICE_FOLK",
  // The Dwarf revision (docs/product/RULESET_7_DWARVES.md).
  "DWARF",
  // The Candy revision (docs/product/RULESET_7_CANDY.md).
  "CANDY",
] as const);
export const FACTION_TREE_IDS_V7 = Object.freeze([
  "ORIGINAL_BASELINE_V5",
  "UNDEAD_BASELINE_V1",
  "GOBLIN_BASELINE_V1",
  "DINOSAUR_BASELINE_V1",
  "MARTIAN_BASELINE_V1",
  "ICE_FOLK_BASELINE_V1",
  "DWARF_BASELINE_V1",
  "CANDY_BASELINE_V1",
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
  // The Dwarf revision: the Steam Mole's Tunnel, the Gyrocopter's bombing
  // run, and the Engineer's Assemble.
  "TUNNEL",
  "BOMB_RUN",
  "ASSEMBLE",
  // The Candy revision: Sugar Rush, the Confectioner's Re-bake, and the
  // Gumball Gunner's Sugar Toss.
  "SUGAR_RUSH",
  "REBAKE",
  "SUGAR_TOSS",
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
  // Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 5):
  // a unit standing on a Fountain of Youth healed at its owner's Start Turn.
  "FOUNTAIN_HEALED",
  "UNITS_REGENERATED",
  // Map curiosities (section 8.5): a Monster regenerated at the end of the
  // neutral turn.
  "MONSTER_REGENERATED",
  "SHIELDS_RECHARGED",
  "INCOME_AWARDED",
  // The Candy revision: the Crash step and the Crumbs countdown of an End
  // Turn.
  "UNITS_CRASHED",
  "CRUMBS_STALE",
  "INCOME_PREVIEWED",
  "TURN_ENDED",
  // Map curiosities (section 8.5): the neutral turn after the last seat's
  // turn of a round, inside the END_TURN that wraps the round.
  "NEUTRAL_TURN_STARTED",
  "NEUTRAL_TURN_ENDED",
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
  // The Dwarf revision: an Engineer assembled a Clockwork Gunner.
  "UNIT_ASSEMBLED",
  // The Candy revision: a Confectioner re-baked a unit from its Crumbs.
  "UNIT_REBAKED",
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
  // The Candy revision: a unit went on a Sugar Rush.
  "UNIT_SUGAR_RUSHED",
  "WOUNDED_TENDED",
  // The Candy revision: a Gumball Gunner's Sugar Toss.
  "SUGAR_TOSSED",
  "DEAD_RAISED",
  "GRAVE_DEVOURED",
  "UNIT_PUSHED",
  "UNIT_PULLED",
  // The Dwarf revision: a Steam Mole tunnelled; a burrowed Mole surfaced.
  "UNIT_TUNNELLED",
  "UNIT_SURFACED",
  "UNIT_MOVED",
  "UNIT_MOVE_INTERRUPTED",
  // The Candy revision: a hostile unit ended its Move on Crumbs.
  "CRUMBS_EATEN",
  "TILES_REVEALED",
  "COMBAT_RESOLVED",
  // The Dwarf revision: a Gyrocopter's bombing run.
  "UNIT_BOMBED",
  "WAIL_RESOLVED",
  "EXPLOSION_RESOLVED",
  "IMPROVEMENT_PILLAGED",
  "UNIT_DISBANDED",
  "SPOILS_AWARDED",
  "PLUNDER_AWARDED",
  // Map curiosities (section 8.7): the bounty for killing a Monster.
  "MONSTER_BOUNTY_AWARDED",
  "UNIT_RECOVERED",
  "UNIT_WAITED",
  // Map curiosities (section 6): a Move ended on a Shrine promoted the unit.
  "SHRINE_CLAIMED",
  "UNIT_PROMOTED",
  "UNIT_GREW",
  "UNIT_DIED",
  "UNIT_INFECTED",
  "UNIT_MIND_CONTROLLED",
  // The Mind Control revision (section 6).
  "UNIT_RELEASED",
  "GRAVE_CREATED",
  // The Candy revision: a fallen Candy unit left Crumbs.
  "CRUMBS_LEFT",
  "BITTEN_UNIT_RISEN",
  "PLAGUE_CLEARED",
  "CITY_CAPTURED",
  "TREASURE_CAPTURED",
  // Map curiosities (section 7): an afloat unit salvaged a Sunken Wreck.
  "WRECK_SALVAGED",
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
 * (16 x 16, three developed cities and one unit of every role per seat) and
 * the authored `MISSION` board (docs/product/CAMPAIGN.md section 2), built
 * from the registered mission that `MatchSetupV7.mission` names.
 */
export type MapTypeV7 =
  | "DRY_LAND"
  | "PANGEA"
  | "CONTINENTS"
  | "ARCHIPELAGO"
  | "LAKES"
  | "SHOWCASE"
  | "MISSION";

/**
 * The mission of a `MISSION` setup (docs/product/CAMPAIGN.md section 2.4):
 * a registered mission ID and its current revision.
 */
export interface MissionRefV7 {
  readonly id: string;
  readonly revision: number;
}

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
  readonly mapGenerationRevision: MapGenerationRevisionV7;
  /**
   * Headless and test only (docs/architecture/HEADLESS_SIMULATION.md): when
   * present (always `true`), two or more seats may play the same faction,
   * which the unique-factions rule otherwise refuses
   * (docs/product/RULESET_7_UNIQUE_FACTIONS.md). The browser never sets it
   * and refuses to launch or resume a setup that carries it.
   */
  readonly allowDuplicateFactions?: true;
  /**
   * Present exactly on a `MISSION` setup (docs/product/CAMPAIGN.md section
   * 2.4): the registered mission whose definition builds the board.
   */
  readonly mission?: MissionRefV7;
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 3):
   * whether map generation places the rare neutral curiosities. A required
   * key; the setup screen and the headless CLI default it to `true`. The
   * Showcase and mission boards never have curiosities, and a `MISSION`
   * setup always carries `false`.
   */
  readonly curiosities: boolean;
}

/**
 * The static map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md
 * sections 5 to 7), in the frozen kind order. The roaming Monster (section
 * 8, a later revision) is a unit with its own list, not a tile marker.
 */
export const CURIOSITY_KINDS_V7 = Object.freeze([
  "FOUNTAIN",
  "SHRINE",
  "WRECK",
] as const);
export type CuriosityKindV7 = (typeof CURIOSITY_KINDS_V7)[number];

/**
 * A curiosity on the board: a Fountain of Youth (Grass, permanent), a
 * Shrine (Grass or Forest, gone once claimed), or a Sunken Wreck (water,
 * gone once salvaged). It never changes its tile.
 */
export interface CuriosityV7 {
  readonly kind: CuriosityKindV7;
  readonly at: CoordV7;
}

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 8.1):
 * the reserved owner of the Giant Spider. It is never a seat (seats are 1
 * to 4), has no entry in `players`, no Coins, no technology, no cities, and
 * no exploration, is never eliminated, and is hostile to every player in
 * both AI modes. Only a unit listed in `GameStateV7.monsters` has it.
 */
export const NEUTRAL_OWNER_ID_V7 = 0 as PlayerId;

/** Whether `ownerId` is the reserved neutral owner (section 8.1). */
export function isNeutralOwnerV7(ownerId: PlayerId): boolean {
  return ownerId === NEUTRAL_OWNER_ID_V7;
}

/**
 * Map curiosities (section 10.2): a Giant Spider on the board. `home` is
 * its lair (the tile it was placed on); `provokedBy` lists, sorted, every
 * unit on the board that damaged it since its previous neutral turn.
 */
export interface MonsterStateV7 {
  readonly unitId: UnitId;
  readonly home: CoordV7;
  readonly provokedBy: readonly UnitId[];
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
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section
   * 10.2): the Fountains, Shrines, and Wrecks on the board, sorted by
   * (y, x). Always empty when `setup.curiosities` is false and on the
   * Showcase and mission boards.
   */
  readonly curiosities: readonly CuriosityV7[];
  /**
   * Map curiosities (section 10.2): one entry per Giant Spider on the board
   * (a unit owned by `NEUTRAL_OWNER_ID_V7`), sorted by `unitId`. Always
   * empty when `setup.curiosities` is false and on the Showcase and mission
   * boards.
   */
  readonly monsters: readonly MonsterStateV7[];
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
   * The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md
   * section 2.1): one entry per mind-controlled unit, sorted by `unitId`.
   * Always empty in a match whose setup has no MARTIAN seat.
   */
  readonly mindControlled: readonly MindControlledStatusV7[];
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
  /**
   * The Dwarf revision (section 5.2): the burrowed Steam Moles and their
   * riders, sorted by `unit.id`. A burrowed unit is off the board: it is not
   * in `units`, and `unit.at` is its mound tile. Always empty in a match
   * whose setup has no DWARF seat.
   */
  readonly burrowed: readonly BurrowedEntryV7[];
  /**
   * The Dwarf revision (section 5.4): the active player's units that
   * surfaced at its Start Turn, sorted. Emptied at its End Turn.
   */
  readonly surfacedThisTurn: readonly UnitId[];
  /**
   * The Dwarf revision (section 6.3): the units the active player's
   * Gyrocopters bombed this turn, sorted. Emptied at its End Turn.
   */
  readonly bombedThisTurn: readonly UnitId[];
  /**
   * The Martian balance revision (`pulp_wars-1wy.3`, Beam Down): the active
   * player's units that were beamed this turn, sorted. A listed unit is not
   * a Beam Down passenger again. Emptied at the End Turn. Always empty in a
   * match whose setup has no MARTIAN seat.
   */
  readonly beamedThisTurn: readonly UnitId[];
  /**
   * The Martian balance revision (`pulp_wars-1wy.3`, the Heavy Tractor
   * Beam): the active player's units that used their free Tractor Beam this
   * turn, sorted. Emptied at the End Turn. Always empty in a match whose
   * setup has no MARTIAN seat.
   */
  readonly tractorUsedThisTurn: readonly UnitId[];
  /**
   * The Candy revision (docs/product/RULESET_7_CANDY.md section 5.3): the
   * Rushed and Crashed units, sorted by `unitId`, at most one entry per
   * unit. Always empty in a match whose setup has no CANDY seat.
   */
  readonly sugarRush: readonly SugarRushStatusV7[];
  /**
   * The Candy revision (section 6.1): the Crumbs on the board, sorted by
   * (y, x), at most one entry per tile. Always empty in a match whose setup
   * has no CANDY seat.
   */
  readonly crumbs: readonly CrumbsV7[];
  /**
   * The Candy revision (section 7): the units Splatted during the active
   * seat's turn, sorted. Emptied at its End Turn. Always empty in a match
   * whose setup has no CANDY seat.
   */
  readonly splattedThisTurn: readonly UnitId[];
  /**
   * The Candy revision (section 9): the units healed by a Sugar Toss during
   * the active seat's turn, sorted. Emptied at its End Turn. Always empty in
   * a match whose setup has no CANDY seat.
   */
  readonly tossedThisTurn: readonly UnitId[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

/**
 * The Candy revision (section 5.3): the unit `unitId` is Rushed (for the
 * rest of its owner's turn) or Crashed (it cannot use a primary action).
 */
export interface SugarRushStatusV7 {
  readonly unitId: UnitId;
  readonly phase: "RUSHED" | "CRASHED";
}

/**
 * The Candy revision (section 6.1): the Crumbs a fallen Candy unit of
 * `role` left on `at` for the Candy seat `ownerId`; they go stale when
 * `turnsLeft` (1 to 3) reaches 0.
 */
export interface CrumbsV7 {
  readonly at: CoordV7;
  readonly role: UnitRoleIdV7;
  readonly ownerId: PlayerId;
  readonly turnsLeft: 1 | 2 | 3;
}

/**
 * The Dwarf revision (section 5.2): a burrowed unit. A Mole's entry has
 * `moleUnitId` null; a rider's names the burrowed Mole it rides with.
 */
export interface BurrowedEntryV7 {
  readonly unit: UnitStateV7;
  readonly moleUnitId: UnitId | null;
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

/**
 * The Mind Control revision (section 2.1): the unit `unitId` is controlled
 * by the Brain `brainUnitId` (its owner is the Brain's owner) and goes back
 * to `originalOwnerId` when it is released. Its kind is the faction of
 * `originalOwnerId` (`unitFactionV7`).
 */
export interface MindControlledStatusV7 {
  readonly unitId: UnitId;
  readonly brainUnitId: UnitId;
  readonly originalOwnerId: PlayerId;
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
