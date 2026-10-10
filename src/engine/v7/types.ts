import type { CityId, PlayerId, UnitId } from "../model/ids";

export const GAME_STATE_SCHEMA_VERSION_7 = 7 as const;
export const COMMAND_SCHEMA_VERSION_7 = 7 as const;
export const EVENT_SCHEMA_VERSION_7 = 7 as const;
export const SAVE_FORMAT_VERSION_7 = 7 as const;
export const REPLAY_FORMAT_VERSION_7 = 7 as const;
export const RULESET_7_ID = "pulp-wars-poc-7r71" as const;
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
  "pulp-wars-poc-7r40",
  "pulp-wars-poc-7r41",
  "pulp-wars-poc-7r42",
  "pulp-wars-poc-7r43",
  "pulp-wars-poc-7r44",
  "pulp-wars-poc-7r45",
  "pulp-wars-poc-7r46",
  "pulp-wars-poc-7r47",
  "pulp-wars-poc-7r48",
  "pulp-wars-poc-7r49",
  "pulp-wars-poc-7r50",
  "pulp-wars-poc-7r51",
  "pulp-wars-poc-7r52",
  "pulp-wars-poc-7r53",
  "pulp-wars-poc-7r54",
  "pulp-wars-poc-7r55",
  "pulp-wars-poc-7r56",
  "pulp-wars-poc-7r57",
  "pulp-wars-poc-7r58",
  "pulp-wars-poc-7r59",
  "pulp-wars-poc-7r60",
  "pulp-wars-poc-7r61",
  "pulp-wars-poc-7r62",
  "pulp-wars-poc-7r63",
  "pulp-wars-poc-7r64",
  "pulp-wars-poc-7r65",
  "pulp-wars-poc-7r66",
  "pulp-wars-poc-7r67",
  "pulp-wars-poc-7r68",
  "pulp-wars-poc-7r69",
  "pulp-wars-poc-7r70",
] as const);
export const SAVE_STORAGE_KEY_V7 = "pulpWars.save.v7r71.current" as const;
/**
 * The map generator a setup names (docs/product/RULESET_7_MAP_SCALE.md
 * section 8.8): `V4` is the many-seats generator of `pulp_wars-ykw.3`
 * (capitals in domains, room and village balance, Continents and
 * Archipelago layouts for up to as many seats as there are factions) on top
 * of the village density of `V3` (`pulp_wars-ykw.2`). A setup naming any
 * other revision is invalid.
 */
export const MAP_GENERATION_REVISION_V7 = "REGIONAL_BIOMES_NAVAL_V4" as const;
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
  // The Cultists of the Ancient Ones (docs/product/RULESET_7_CULTISTS.md;
  // registered by `pulp_wars-mch9.3`). The ninth faction, last so that every
  // earlier faction keeps its ordinal. It is registered for headless and
  // test setups; the browser does not offer it yet
  // (`HIDDEN_FACTION_IDS_V7`).
  "CULT",
] as const);
/**
 * The Cultists (`pulp_wars-mch9.3`, docs/product/RULESET_7_CULTISTS.md
 * section 19): the registered factions the browser does not offer yet. A
 * hidden faction is a full engine registration: a headless or test setup may
 * name it, and a state that holds it loads, plays, saves, and is drawn (with
 * stand-in art). What leaves it out is everything a player picks or browses
 * factions from: the setup screen and its opponent counts, the tribe grid,
 * the campaign roster, the title scene, the Gallery, and the theme list.
 * Emptied by the bead that offers the Cult (`pulp_wars-mch9.20`), once its
 * AI, interface, and art beads are done.
 */
export const HIDDEN_FACTION_IDS_V7: readonly FactionIdV7[] = Object.freeze([
  "CULT",
] as const);
/**
 * The factions the browser offers, in registration order: every registered
 * faction that is not hidden ({@link HIDDEN_FACTION_IDS_V7}).
 */
export const OFFERED_FACTION_IDS_V7: readonly FactionIdV7[] = Object.freeze(
  FACTION_IDS_V7.filter((faction) => !HIDDEN_FACTION_IDS_V7.includes(faction)),
);
export const FACTION_TREE_IDS_V7 = Object.freeze([
  "ORIGINAL_BASELINE_V5",
  "UNDEAD_BASELINE_V1",
  "GOBLIN_BASELINE_V1",
  "DINOSAUR_BASELINE_V1",
  "MARTIAN_BASELINE_V1",
  "ICE_FOLK_BASELINE_V1",
  "DWARF_BASELINE_V1",
  "CANDY_BASELINE_V1",
  "CULT_BASELINE_V1",
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 5.1).
  "SUBMARINE",
  // Tuning 5 (`pulp_wars-w49.4`): the Human heavy line unit, last so that
  // every earlier role keeps its ordinal. Only the Human tree unlocks it.
  "SWORDSMAN",
] as const);
/**
 * The naval branch (section 6): the ship roles, in role order. A unit has
 * one of them exactly when its form is `NAVAL`; every rule that names
 * "naval units" covers all three.
 */
export const NAVAL_ROLE_IDS_V7 = Object.freeze([
  "PATROL_BOAT",
  "BATTLESHIP",
  "SUBMARINE",
] as const);
export type NavalRoleIdV7 = (typeof NAVAL_ROLE_IDS_V7)[number];
/** Whether `role` is a ship role ({@link NAVAL_ROLE_IDS_V7}). */
export function isNavalRoleV7(role: unknown): role is NavalRoleIdV7 {
  return NAVAL_ROLE_IDS_V7.includes(role as NavalRoleIdV7);
}
/**
 * The Cultists (`pulp_wars-mch9.3`, docs/product/RULESET_7_CULTISTS.md
 * section 4.2): the IDs of the Cult's summoned units, in the frozen order:
 * the Horror, the Herald, and the wild Tentacle. They are never trained,
 * hired, found, or rewarded, so they are **not** `UNIT_ROLE_IDS_V7` entries:
 * no faction's role table has a slot for them, no setup, Showcase, Gallery
 * role row, or training list reads them, and no unit in a state carries one
 * yet. Their numbers are registered in `CULT_SUMMONED_ROLE_RULES_V7`
 * (src/engine/rules/ruleset-v7.ts); the beads that put them on the board
 * (`pulp_wars-mch9.5`, `.6`, `.7`, `.8`) add the state that names a unit's
 * summoned role, as the neutral registration names a breed.
 */
export const SUMMONED_ROLE_IDS_V7 = Object.freeze([
  "HORROR",
  "HERALD",
  "TENTACLE",
] as const);
export type SummonedRoleIdV7 = (typeof SUMMONED_ROLE_IDS_V7)[number];
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 2).
  "SEAMANSHIP",
  "SUBMERSIBLES",
] as const);
export const COMMAND_KIND_ORDER_V7 = Object.freeze([
  "MOVE",
  "ATTACK",
  // The naval branch (section 4.2): a ship captures a crippled enemy ship.
  "BOARD",
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4):
  // an Ice Folk land unit turns the water next to it to ice.
  "FREEZE",
  // The Dwarf revision: the Steam Mole's Tunnel, the Gyrocopter's bombing
  // run, and the Engineer's Assemble.
  "TUNNEL",
  "BOMB_RUN",
  "ASSEMBLE",
  // Dwarf crowd control (`pulp_wars-w49.33`): the Whirligig's Whirl, the
  // Engineer's Barricade, and an attack on a Barricade (any faction).
  "WHIRL",
  "BUILD_BARRICADE",
  "ATTACK_BARRICADE",
  // The Candy revision: Sugar Rush, the Confectioner's Re-bake, and the
  // Gumball Gunner's Sugar Toss.
  "SUGAR_RUSH",
  "REBAKE",
  "SUGAR_TOSS",
  // Map curiosities round 2 (section 30.1): a unit on the Wishing Well
  // tosses a Coin.
  "TOSS_COIN",
  // The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md section
  // 8.2): the Confectioner's Top-Up, with the other Candy commands.
  "TOP_UP",
  "RECOVER",
  // The giants' signatures (docs/product/RULESET_7_GIANTS.md sections 6.2,
  // 6.3, 6.4, and 6.8): the Abomination's Swallow, the Troll's Goblin Toss,
  // the Brontosaurus's Thunder Stomp, and the Gingerbread Giant's Break Off
  // (after RECOVER, so no pinned neighbour of the earlier revisions moves).
  "SWALLOW",
  "TOSS",
  "STOMP",
  "BREAK_OFF",
  // Ice Folk Freeze (`pulp_wars-w49.37`): the Ice Witch's Frost Bolt and the
  // Mammoth's Stampede (after the giants' block, so no pinned neighbour of
  // the earlier revisions moves).
  "FROST_BOLT",
  "STAMPEDE",
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
  // Tuning 3 (`pulp_wars-w49.3`): Commerce, hiring at a Market.
  "HIRE",
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
  "TREASURY_6",
  "JUGGERNAUT",
  "TREASURY",
  // Tuning 4 (`pulp_wars-w49.3`): +1 unit capacity in the city. Last, so
  // the ordinals of the older rewards (AI tie-breaks) do not move. No
  // longer offered since the reward ladder rework (`pulp_wars-zypi`); a
  // record that holds it keeps its effect.
  "BARRACKS",
  // The reward ladder rework (`pulp_wars-zypi`): +1 Coin of the city's
  // income every turn, for good (a record that travels with the city).
  "ECONOMIC_MIRACLE",
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
  // Dwarf crowd control (`pulp_wars-w49.33`): an Engineer built or repaired
  // a Barricade.
  "BARRICADE_BUILT",
  "BARRICADE_REPAIRED",
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
  // Ice Folk Freeze (`pulp_wars-w49.37`): a Bolas, a Cold Snap, a Frost
  // Bolt, a Frost Giant, Black Ice, Frostbite, or shards froze units (the
  // Ice Folk revision's `UNITS_CHILLED`, in its place).
  "UNITS_FROZEN",
  // The naval branch (sections 8.4, 8.5, and 8.9): a Freeze made ice; ice
  // melted at an End Turn; icebound units were crushed at a Start Turn.
  "WATER_FROZEN",
  "ICE_MELTED",
  "UNITS_CRUSHED",
  // The Candy revision: a unit went on a Sugar Rush.
  "UNIT_SUGAR_RUSHED",
  "WOUNDED_TENDED",
  // The Candy revision: a Gumball Gunner's Sugar Toss.
  "SUGAR_TOSSED",
  // The Candy redesign (section 8.2): a Confectioner's Top-Up.
  "UNIT_TOPPED_UP",
  "DEAD_RAISED",
  "GRAVE_DEVOURED",
  "UNIT_PUSHED",
  "UNIT_PULLED",
  // The Dwarf revision: a Steam Mole tunnelled; a burrowed Mole surfaced.
  "UNIT_TUNNELLED",
  "UNIT_SURFACED",
  // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8),
  // in one block (no pinned neighbour moves): a Troll threw a Goblin; a
  // Juggernaut's crush; razed Walls; a Thunder Stomp; an Overstride's
  // trample; a Swallow, the Start Turn digest, the Zombie spat out, and a
  // held victim back on the board; a Break Off.
  "GOBLIN_TOSSED",
  "UNIT_CRUSHED",
  "WALLS_DESTROYED",
  "THUNDER_STOMP",
  "UNITS_TRAMPLED",
  "UNIT_SWALLOWED",
  "UNIT_DIGESTED",
  "UNIT_REGURGITATED",
  "SWALLOWED_UNIT_RELEASED",
  "GIANT_BROKE_OFF",
  // Ice Folk Freeze (`pulp_wars-w49.37`): a Mammoth's Stampede.
  "MAMMOTH_STAMPEDED",
  "UNIT_MOVED",
  // Map curiosities round 2 (section 28.4): a Dimensional Gate displaced an
  // occupant, carried a unit to its partner, or was blocked.
  "GATE_DISPLACED",
  "GATE_TRAVERSED",
  "GATE_BLOCKED",
  "UNIT_MOVE_INTERRUPTED",
  // The Candy revision: a hostile unit ended its Move on Crumbs.
  "CRUMBS_EATEN",
  // The Candy redesign (section 7.2): a Donut Racer's Glaze Trail.
  "TILES_GLAZED",
  "TILES_REVEALED",
  "COMBAT_RESOLVED",
  // The Dwarf revision: a Gyrocopter's bombing run.
  "UNIT_BOMBED",
  // Dwarf crowd control: a Whirligig's Whirl; an attack on a Barricade.
  "WHIRL_RESOLVED",
  "BARRICADE_ATTACKED",
  // The Candy redesign (sections 7.1, 7.3, 7.7, and 7.8): Sticky Toffee,
  // Toothache, a Gumball Gunner's Ricochet, and a Chocolate Bunny's Thump.
  "UNIT_STUCK",
  "TOOTHACHE_GIVEN",
  "RICOCHETED",
  "THUMPED",
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
  // Map curiosities round 2 (section 30.2): a Coin tossed into the Well.
  "COIN_TOSSED",
  // Map curiosities (section 6): a Move ended on a Shrine promoted the unit.
  "SHRINE_CLAIMED",
  "UNIT_PROMOTED",
  "UNIT_GREW",
  "UNIT_DIED",
  "UNIT_INFECTED",
  "UNIT_MIND_CONTROLLED",
  // The naval branch (section 4.2): a ship boarded an enemy ship.
  "SHIP_BOARDED",
  // The Mind Control revision (section 6).
  "UNIT_RELEASED",
  "GRAVE_CREATED",
  // The Candy revision: a fallen Candy unit left Crumbs.
  "CRUMBS_LEFT",
  "BITTEN_UNIT_RISEN",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): a Wight climbed out of its
  // own Grave at its owner's Start Turn.
  "WIGHT_RISEN",
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
/**
 * The AI seats of a match: 1 to `FACTION_IDS_V7.length - 1`
 * (docs/product/RULESET_7_MAP_SCALE.md section 6.1). The upper bound follows
 * the faction registry, so the type is a number and
 * `validateMatchSetupV7` holds the range.
 */
export type AiCountV7 = number;
/**
 * The seat colours (map scale section 8.6), stored and never shown: owner
 * colours are the factions'. The human seat takes the setup's colour and the
 * AI seats the others in this order. There are at least as many as
 * factions (a unit test holds it).
 */
export const PLAYER_COLORS_V7 = Object.freeze([
  "CORAL",
  "TEAL",
  "GOLD",
  "VIOLET",
  "SKY",
  "LIME",
  "ROSE",
  "SLATE",
  "AMBER",
] as const);
export type PlayerColorV7 = (typeof PLAYER_COLORS_V7)[number];
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
  /**
   * Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section 4.3):
   * `DOMINATION` (play until every rival is eliminated) or `PERFECTION`
   * (`PERFECTION_ROUNDS_V7` rounds, the highest score wins). Every new
   * setup the headless CLI and text play make writes it; a setup without
   * the key (a save, replay, mission, or fixture made before the modes) is
   * a `DOMINATION` setup and keeps its exact shape. A `SHOWCASE` or
   * `MISSION` setup is never `PERFECTION`. Read it with
   * {@link gameModeOfV7}.
   */
  readonly gameMode?: GameModeV7;
}

/** Score and modes (section 4): the two play modes, in display order. */
export const GAME_MODES_V7 = Object.freeze([
  "DOMINATION",
  "PERFECTION",
] as const);
export type GameModeV7 = (typeof GAME_MODES_V7)[number];
/** Score and modes (section 4.2): the rounds a Perfection match lasts. */
export const PERFECTION_ROUNDS_V7 = 30;
/** The play mode of a setup; a setup without the key is Domination. */
export function gameModeOfV7(
  setup: Pick<MatchSetupV7, "gameMode">,
): GameModeV7 {
  return setup.gameMode ?? "DOMINATION";
}

/**
 * Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section 3.3):
 * the counters a player's score needs that the rest of the state does not
 * hold. `killValue` (K), `lossValue` (X), and `hpLost` (H) are the
 * accumulated Coins of unit value and Hit Points of section 3.2;
 * `flawless` is true until the player lost a unit or a city (section 5.4);
 * `eliminatedBy` is the player whose capture took its last city and
 * `eliminatedAt` the command index of that capture (both null while it is
 * in the match; the command index orders eliminations for the Perfection
 * ranking, section 4.2); `peakScore` is the highest score at any round end
 * (the starting score at first); `round30` is the snapshot taken at the
 * round end of round 30 (section 5.1).
 */
export interface ScoreLedgerEntryV7 {
  readonly playerId: PlayerId;
  readonly killValue: number;
  readonly lossValue: number;
  readonly hpLost: number;
  readonly flawless: boolean;
  readonly eliminatedBy: PlayerId | null;
  readonly eliminatedAt: number | null;
  readonly peakScore: number;
  readonly round30: ScoreRound30SnapshotV7 | null;
}
export interface ScoreRound30SnapshotV7 {
  readonly score: number;
  readonly peakScore: number;
}

/**
 * The map curiosities that are tile markers
 * (docs/product/RULESET_7_MAP_CURIOSITIES.md sections 5 to 7 and, round 2,
 * sections 26 to 30), in the frozen kind order. The neutral units (the
 * Giant Spider, a camp's guards, Bigfoot) are units with their own list,
 * not tile markers; a camp centre (`DOWNED_SAUCER`, `GRAVEYARD`) is a tile
 * marker whose guards are listed in `monsters`.
 */
export const CURIOSITY_KINDS_V7 = Object.freeze([
  "FOUNTAIN",
  "SHRINE",
  "WRECK",
  // Round 2 (`pulp_wars-737.14`): the camp centres, a gate of a pair, and
  // the Wishing Well.
  "DOWNED_SAUCER",
  "GRAVEYARD",
  "GATE",
  "WISHING_WELL",
] as const);
export type CuriosityKindV7 = (typeof CURIOSITY_KINDS_V7)[number];
/** The tile markers that carry nothing but their kind and tile. */
export type PlainCuriosityKindV7 = Exclude<
  CuriosityKindV7,
  "GATE" | "WISHING_WELL"
>;

/**
 * A curiosity on the board: a Fountain of Youth (Grass, permanent), a
 * Shrine (Grass or Forest, gone once claimed), a Sunken Wreck (water, gone
 * once salvaged), a camp centre (round 2: a Downed Saucer or a Graveyard,
 * permanent scenery), a Dimensional Gate naming its `partner` (section 28),
 * or the Wishing Well with the seats that tossed a Coin (section 30). It
 * never changes its tile.
 */
export type CuriosityV7 =
  | {
      readonly kind: PlainCuriosityKindV7;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "GATE";
      readonly at: CoordV7;
      /** The other gate of the pair. */
      readonly partner: CoordV7;
    }
  | {
      readonly kind: "WISHING_WELL";
      readonly at: CoordV7;
      /** The seats that tossed a Coin, sorted (once per player per match). */
      readonly tossedBy: readonly PlayerId[];
    };

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 8.1):
 * the reserved owner of every neutral unit (the Giant Spider, a camp's
 * guards, Bigfoot). It is never a seat (seats are 1 to 4), has no entry in
 * `players`, no Coins, no technology, no cities, and no exploration, is
 * never eliminated, and is hostile to every player in both AI modes. Only a
 * unit listed in `GameStateV7.monsters` has it.
 */
export const NEUTRAL_OWNER_ID_V7 = 0 as PlayerId;

/** Whether `ownerId` is the reserved neutral owner (section 8.1). */
export function isNeutralOwnerV7(ownerId: PlayerId): boolean {
  return ownerId === NEUTRAL_OWNER_ID_V7;
}

/**
 * Round 2 (section 32.3): the breeds of the neutral registration, in the
 * frozen order: the Giant Spider, the Downed Saucer's guards, the
 * Graveyard's Zombies, and Bigfoot.
 */
export const NEUTRAL_BREEDS_V7 = Object.freeze([
  "GIANT_SPIDER",
  "GRUNT",
  "RAY_GUNNER",
  "SHIELD_PROJECTOR",
  "ZOMBIE",
  "BIGFOOT",
] as const);
export type NeutralBreedV7 = (typeof NEUTRAL_BREEDS_V7)[number];

/**
 * Map curiosities (section 10.2; round 2, section 32.2): a neutral unit on
 * the board. `breed` names its registration; `home` is the Spider's lair,
 * a guard's camp centre, or Bigfoot's home; `provokedBy` lists, sorted,
 * every unit on the board that damaged it since its previous neutral turn.
 */
export interface MonsterStateV7 {
  readonly unitId: UnitId;
  readonly breed: NeutralBreedV7;
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
  /**
   * The giants' signatures (`pulp_wars-w49.30`, Break Off as the user
   * changed it on 2026-10-09): `GINGERBREAD_MAN` on a Gingerbread Man, a
   * Candy `FIGHTER` that a Gingerbread Giant broke off. Presentation only:
   * in every rule it is a Toffee Trooper. Absent on every other unit.
   */
  readonly variant?: "GINGERBREAD_MAN";
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
  /**
   * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.7):
   * present (always `true`) once a Brass Titan's Siege Hammer has torn the
   * city's Walls down. The city keeps its `WALLS` reward record (the reward
   * is not offered again); it has Walls exactly when it holds the record and
   * this key is absent ({@link cityHasWallsV7}). It stays through a capture
   * and nothing rebuilds the Walls. Absent in every other city, so a state
   * without razed Walls is unchanged.
   */
  readonly wallsRazed?: true;
}

/**
 * The giants' signatures (section 6.7): whether a city has Walls: it took
 * the level-3 `WALLS` reward and its Walls were not razed. Every reader of
 * "has Walls" (fortification, the Tractor Beam hold, the AI, the panel)
 * asks this.
 */
export function cityHasWallsV7(city: {
  readonly rewards: readonly { readonly reward: RewardIdV7 }[];
  readonly wallsRazed?: true | undefined;
}): boolean {
  return (
    city.wallsRazed !== true &&
    city.rewards.some((record) => record.reward === "WALLS")
  );
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
      /** Tuning 1 (7r46): the permanent population of a Blast Mountain. */
      readonly kind: "RESOURCE_ACTION";
      readonly action: "BLAST_MOUNTAIN";
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
      /**
       * The faction of the player whose `BUILD_MONUMENT` placed it (bead
       * pulp_wars-eu3r.3, the user 2026-10-08): unlike every other
       * building, a Monument keeps its builder's look when another faction
       * captures its city, so a capture never changes this. Absent only in
       * a state written before the field existed, which draws the Monument
       * as before (the achievement's shared look).
       */
      readonly builderFaction?: FactionIdV7;
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

/**
 * Score and modes (section 4.2): a Perfection match decided at the round
 * end of round 30 carries `decidedBy: "SCORE"` and the final `ranking`
 * (every player, first to last); an elimination result has neither key, so
 * older outcomes parse unchanged.
 */
export type MatchOutcomeV7 =
  | {
      readonly kind: "VICTORY";
      readonly winnerId: PlayerId;
      readonly decidedBy?: "SCORE";
      readonly ranking?: readonly PlayerId[];
    }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
      readonly decidedBy?: "SCORE";
      readonly ranking?: readonly PlayerId[];
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
   * 10.2; round 2, section 32.2): the tile markers on the board, sorted by
   * (y, x). Always empty when `setup.curiosities` is false and on the
   * Showcase and mission boards.
   */
  readonly curiosities: readonly CuriosityV7[];
  /**
   * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.3):
   * the ice tiles, sorted by (y, x), at most one entry per tile. An ice
   * tile is a water tile (never a dock) with an entry; its terrain does not
   * change. Always empty in a match whose setup has no ICE_FOLK seat.
   */
  readonly ice: readonly IceTileV7[];
  /**
   * Map curiosities (section 10.2; round 2, section 32.2): one entry per
   * neutral unit on the board (a unit owned by `NEUTRAL_OWNER_ID_V7`),
   * sorted by `unitId`. Always
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
   * Ice Folk Freeze (`pulp_wars-w49.37`, docs/product/RULESET_7_CURRENT.md
   * section 21.2): one entry per Frozen unit, sorted by `unitId`. Always
   * empty in a match whose setup has no ICE_FOLK seat. It replaced the Ice
   * Folk revision's `chilled` list; Snow and the Blizzard are derived on
   * every read.
   */
  readonly frozen: readonly FrozenStatusV7[];
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
  /**
   * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md section
   * 6.2): the Stuck units (a Move of at most one step), sorted by `unitId`,
   * at most one entry per unit. Always empty in a match whose setup has no
   * CANDY seat.
   */
  readonly stuck: readonly CandyStatusEntryV7[];
  /**
   * The Candy redesign (section 6.2): the units with Toothache (their next
   * `ATTACK` is 1 weaker), sorted by `unitId`, at most one entry per unit.
   * Always empty in a match whose setup has no CANDY seat.
   */
  readonly toothache: readonly CandyStatusEntryV7[];
  /**
   * The Candy redesign (section 7.2): the land tiles a Donut Racer of the
   * active seat Glazed this turn, sorted by (y, x), without duplicates.
   * Emptied at its End Turn. Always empty in a match whose setup has no
   * CANDY seat.
   */
  readonly glazedThisTurn: readonly CoordV7[];
  /**
   * The Dinosaur pass, correction (`pulp_wars-w49.15`, 7r53): the units on
   * the board that a hatched dinosaur of the active seat attacked during
   * its turn and that survived, sorted. A Caveman's Pack Hunt applies
   * against them. Emptied at its End Turn. Always empty in a match whose
   * setup has no DINOSAUR seat.
   */
  readonly huntedThisTurn: readonly UnitId[];
  /**
   * Goblin explosions and Berserk (`pulp_wars-w49.35`): the units of the
   * active seat that an Orc Warboss's Berserk (`RALLY`) made Berserk this
   * turn, sorted: +1 Move and no stop in hostile zones of control. Emptied
   * at its End Turn; a unit that leaves the board leaves the list. Always
   * empty in a match whose setup has no GOBLIN seat.
   */
  readonly berserkThisTurn: readonly UnitId[];
  /**
   * The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror. The units on
   * the board that a Banshee's Wail of the active seat damaged this turn
   * (HP damage above 0) and that survived, sorted: they do not strike back
   * (`noRetaliationReason` `TERROR`). Never a unit of the active seat or a
   * neutral unit. Emptied at its End Turn; a unit that leaves the board or
   * comes to the active seat leaves the list. Always empty in a match whose
   * setup has no UNDEAD seat.
   */
  readonly terrorThisTurn: readonly UnitId[];
  /**
   * The Vampire and Banshee rework (`pulp_wars-ty6i`): Feast. The units of
   * the active seat whose attack killed this turn with Feast (a Vampire),
   * sorted: one that has attacked once and is not handled may attack once
   * more. Emptied at its End Turn; a unit that leaves the board or the
   * active seat leaves the list. Always empty in a match whose setup has
   * no UNDEAD seat.
   */
  readonly feastedThisTurn: readonly UnitId[];
  /**
   * The ninth unit (`pulp_wars-w49.17`, 7r55,
   * docs/product/RULESET_7_NINTH_UNIT.md): the stored state of the new
   * units' mechanics (Rise Again, the Thagomizer).
   */
  readonly ninthUnit: NinthUnitStateV7;
  /**
   * Dwarf crowd control (`pulp_wars-w49.33`): the standing Barricades,
   * sorted by (y, x), at most one per tile. Always empty in a match whose
   * setup has no DWARF seat.
   */
  readonly barricades: readonly BarricadeV7[];
  /**
   * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8):
   * the stored state of the giants' signatures (the Abomination's held
   * victims).
   */
  readonly giants: GiantsStateV7;
  /**
   * Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section
   * 3.3): one score ledger entry per player, in `players` order. A stored
   * state without the key (made before the score) loads with
   * {@link ScoreLedgerEntryV7} counters of 0, `flawless` false (its history
   * is unknown), and the current score as the peak.
   */
  readonly scoreLedger: readonly ScoreLedgerEntryV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

/**
 * The giants' signatures (section 6.2): the stored state. `swallowed` is
 * empty in a match without an Undead seat.
 */
export interface GiantsStateV7 {
  /**
   * Swallow: one entry per held victim, sorted by `holderUnitId`, at most
   * one per holder. The holder is a land-form unit on the board whose role,
   * under its kind, has `SWALLOW`. The victim is off the board: it is in no
   * other unit list, has no status entry, keeps its HP, kills, home city,
   * and veteran flag, has the exhausted activation, and its `at` is its
   * holder's tile (kept in step with the holder); it counts for its home
   * city's unit limit and for nothing else.
   */
  readonly swallowed: readonly SwallowedEntryV7[];
}
export interface SwallowedEntryV7 {
  readonly holderUnitId: UnitId;
  readonly unit: UnitStateV7;
}
/** The empty giants state (a new match, a mission, a fixture). */
export function emptyGiantsStateV7(): GiantsStateV7 {
  return { swallowed: [] };
}

/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55): the stored state of the new
 * units' mechanics. Every list is empty in a match without the faction
 * that makes its entries (Undead, Dinosaur, Dwarf).
 */
export interface NinthUnitStateV7 {
  /**
   * Rise Again: the Graves a Wight will climb out of, sorted by (y, x), at
   * most one per tile, each on a tile that has a Grave. `ownerId` is the
   * Undead seat the Wight returns for.
   */
  readonly wightGraves: readonly WightGraveV7[];
  /**
   * Rise Again: the units on the board that climbed out of a Grave (they do
   * not rise a second time), sorted.
   */
  readonly risenWights: readonly UnitId[];
  /**
   * The Thagomizer: the units Cracked during the active seat's turn,
   * sorted. Emptied at its End Turn.
   */
  readonly crackedThisTurn: readonly UnitId[];
}
export interface WightGraveV7 {
  readonly at: CoordV7;
  readonly ownerId: PlayerId;
}
/** The empty ninth-unit state (a new match, a mission, a fixture). */
export function emptyNinthUnitStateV7(): NinthUnitStateV7 {
  return {
    wightGraves: [],
    risenWights: [],
    crackedThisTurn: [],
  };
}

/**
 * Dwarf crowd control (`pulp_wars-w49.33`): a Barricade an Engineer of
 * `ownerId` built on the land tile `at`. It has `hp` of
 * `BARRICADE_HP_V7` (1 to 10), blocks every unit's Move through and onto
 * its tile, and stands until it is destroyed; it keeps its owner when the
 * territory changes hands.
 */
export interface BarricadeV7 {
  readonly at: CoordV7;
  readonly ownerId: PlayerId;
  readonly hp: number;
}

/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.3): one
 * ice tile. `ownerId` is the player whose unit froze it last; `turnsLeft`
 * (0 to 5) counts that owner's End Turns before it melts, and does not
 * count down while the tile is in its owner's territory.
 */
export interface IceTileV7 {
  readonly at: CoordV7;
  readonly ownerId: PlayerId;
  readonly turnsLeft: number;
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
 * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md section 6.2):
 * a Stuck or Toothache entry of `unitId`. At every End Turn of the unit's
 * owner `endsLeft` loses 1 and the entry goes at 0, so the status lasts
 * until the end of the victim's next turn that begins after the hit (1 when
 * applied during another seat's turn, 2 during its owner's own turn).
 */
export interface CandyStatusEntryV7 {
  readonly unitId: UnitId;
  readonly endsLeft: 1 | 2;
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
 * Ice Folk Freeze (`pulp_wars-w49.37`, RULESET_7_CURRENT.md section 21.2):
 * the unit `unitId` is Frozen. `turnsLeft` is the number of its owner's End
 * Turns until it thaws: 1 for a unit frozen outside its owner's turn (it
 * stays Frozen through that owner's next turn), 2 for one frozen during its
 * owner's own turn (Frostbite), which becomes 1 at that End Turn.
 */
export interface FrozenStatusV7 {
  readonly unitId: UnitId;
  readonly turnsLeft: 1 | 2;
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
