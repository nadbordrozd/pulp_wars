import type {
  CommandV7,
  CoordV7,
  ImprovementIdV7,
  ResourceIdV7,
  RewardIdV7,
  TechnologyIdV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../engine/index";

/**
 * Keys of the Ruleset 7 board plan and names of the interface stand-ins.
 *
 * A key says which subject a plan entry or an interface picture is. It is
 * never looked up as a file: the picture comes from the chibi art by the
 * entry's art subject, and a subject without a usable picture gets a
 * code-drawn figure or the lettered stand-in, whose letter is the first
 * letter of the key's last word (`missingArtLetterOfAssetV7`).
 *
 * The keys were the ids of the retired Ruleset 7 PixelLab rasters (bead
 * pulp_wars-67q.15). Those that named a retired raster now start with
 * `v7-` and end in the same word, so every stand-in keeps its letter. The
 * others still spell the id of a raster of the Ruleset 6 art, which is
 * retired too (bead pulp_wars-lky5); that is history, not a lookup.
 */

export const UNIT_ART_KEYS_V7 = {
  FIGHTER: "unit-original-fighter",
  RAIDER: "unit-original-raider",
  MARKSMAN: "unit-original-marksman",
  GUARD: "unit-original-guard",
  CAPTAIN: "unit-original-captain-v7r10",
  CATAPULT: "unit-original-catapult",
  KNIGHT: "unit-original-knight",
  JUGGERNAUT: "unit-original-juggernaut",
  PATROL_BOAT: "unit-original-patrol-boat",
  BATTLESHIP: "unit-original-battleship",
  // The Submarine and the Swordsman have no key of their own: they share
  // the Patrol Boat's and the Guard's (their pictures are their own art
  // subjects, beads pulp_wars-5ti.6 and pulp_wars-w49.9).
  SUBMARINE: "unit-original-patrol-boat",
  SWORDSMAN: "unit-original-guard",
} as const satisfies Readonly<Record<UnitRoleIdV7, string>>;

export const PORTRAIT_ART_KEYS_V7 = {
  FIGHTER: "portrait-original-fighter",
  RAIDER: "portrait-original-raider",
  MARKSMAN: "portrait-original-marksman",
  GUARD: "portrait-original-guard",
  CAPTAIN: "v7-portrait-captain",
  CATAPULT: "v7-portrait-catapult",
  KNIGHT: "v7-portrait-knight",
  JUGGERNAUT: "portrait-original-juggernaut",
  PATROL_BOAT: "unit-original-patrol-boat",
  BATTLESHIP: "unit-original-battleship",
  SUBMARINE: "unit-original-patrol-boat",
  SWORDSMAN: "portrait-original-guard",
} as const satisfies Readonly<Record<UnitRoleIdV7, string>>;

export const FARM_ART_KEYS_V7 = {
  SINGLE: "v7-farm-single",
  HORIZONTAL_PAIR: "v7-farm-pair-horizontal",
  VERTICAL_PAIR: "v7-farm-pair-vertical",
} as const;

/** The embarked form of any land unit. */
export const EMBARKED_UNIT_ART_KEY_V7 = "unit-shared-embarked-transport";

/** The actions whose key is not a Ruleset 6 raster id. */
export const ACTION_ART_KEYS_V7 = {
  RALLY: "v7-action-rally",
  CULTIVATE_FOREST: "v7-action-cultivate-forest",
  BLAST_MOUNTAIN: "v7-action-blast-mountain",
  PILLAGE: "v7-action-pillage",
  DISBAND: "v7-action-disband",
} as const;

export const IMPROVEMENT_ART_KEYS_V7 = {
  FARM: FARM_ART_KEYS_V7.SINGLE,
  LUMBER_CAMP: "v7-improvement-lumber-camp",
  MINE: "v7-terrain-mined-mountain-1",
  WINDMILL: "building-square-windmill",
  SAWMILL: "building-square-sawmill",
  FORGE: "building-square-forge",
  WORKSHOP: "building-square-workshop",
  MARKET: "building-square-market",
  MONUMENT: "building-square-monument",
  PORT: "v7-improvement-port",
  SHIPYARD: "v7-improvement-shipyard",
} as const satisfies Readonly<Record<ImprovementIdV7, string>>;

export const RESOURCE_ART_KEYS_V7 = {
  FRUIT: "terrain-square-original-fruit",
  GAME: "terrain-square-original-animal",
  FERTILE_GROUND: "v7-resource-fertile-ground",
  ORE: "terrain-square-ore",
  FISH: "v7-resource-fish",
  PEARLS: "v7-resource-pearls",
} as const satisfies Readonly<Record<ResourceIdV7, string>>;

/** The three looks of Fruit and of Game on the map, chosen by tile. */
export const FRUIT_MAP_ART_KEYS_V7 = [
  RESOURCE_ART_KEYS_V7.FRUIT,
  "v7-resource-fruit-pear",
  "v7-resource-fruit-plum",
] as const;

export const GAME_MAP_ART_KEYS_V7 = [
  RESOURCE_ART_KEYS_V7.GAME,
  "v7-resource-game-deer",
  "v7-resource-game-fox",
] as const;

export function resourceMapArtKeyV7(
  resource: ResourceIdV7,
  at: CoordV7,
): string {
  const index = (at.x * 31 + at.y * 17) % 3;
  return resource === "FRUIT"
    ? (FRUIT_MAP_ART_KEYS_V7[index] ?? RESOURCE_ART_KEYS_V7.FRUIT)
    : resource === "GAME"
      ? (GAME_MAP_ART_KEYS_V7[index] ?? RESOURCE_ART_KEYS_V7.GAME)
      : RESOURCE_ART_KEYS_V7[resource];
}

/** Grass has three map variants, Forest four, each kind of Mountain three. */
export type TerrainVariantKeyV7 =
  | `v7-terrain-grass-${number}`
  | `v7-terrain-forest-${number}`
  | `v7-terrain-mountain-${number}`
  | `v7-terrain-mined-mountain-${number}`
  | "v7-terrain-water-shallow"
  | "v7-terrain-water-deep";

export const FOREST_TERRAIN_KEY_PREFIX_V7 = "v7-terrain-forest-";

export const TERRAIN_ART_KEYS_V7 = {
  GRASS: "v7-terrain-grass-1",
  FOREST: "v7-terrain-forest-1",
  MOUNTAIN: "v7-terrain-mountain-1",
  SHALLOW_WATER: "v7-terrain-water-shallow",
  DEEP_WATER: "v7-terrain-water-deep",
  // The Rift (bead pulp_wars-9s0.5) is keyed as Grass: the board draws the
  // crack over the ground.
  RIFT: "v7-terrain-grass-1",
} as const satisfies Readonly<Record<TerrainIdV7, TerrainVariantKeyV7>>;

/** The key of a map tile's terrain; `variant` counts from 1. */
export function terrainMapArtKeyV7(
  terrain: TerrainIdV7,
  variant: number,
  mined = false,
): TerrainVariantKeyV7 {
  if (terrain === "GRASS" || terrain === "RIFT")
    return `v7-terrain-grass-${variant}`;
  if (terrain === "FOREST") return `v7-terrain-forest-${variant}`;
  if (terrain === "MOUNTAIN")
    return mined
      ? `v7-terrain-mined-mountain-${variant}`
      : `v7-terrain-mountain-${variant}`;
  return TERRAIN_ART_KEYS_V7[terrain];
}

export const TECH_ART_KEYS_V7 = {
  GATHERING: "terrain-square-original-fruit",
  FARMING: FARM_ART_KEYS_V7.SINGLE,
  MILLING: "building-square-windmill",
  ADMINISTRATION: PORTRAIT_ART_KEYS_V7.CAPTAIN,
  PLANNING: "ui-reward-expand",
  HUNTING: "terrain-square-original-animal",
  FORESTRY: IMPROVEMENT_ART_KEYS_V7.LUMBER_CAMP,
  SAWMILLING: "building-square-sawmill",
  MARKSMANSHIP: "ui-tech-original-marksmanship",
  FIELDCRAFT: "ui-tech-original-fieldcraft",
  SCOUTING: "portrait-original-raider",
  ROADS: "terrain-square-road-mask-0101",
  COMMERCE: "building-square-market",
  RAIDING: ACTION_ART_KEYS_V7.PILLAGE,
  CHIVALRY: UNIT_ART_KEYS_V7.KNIGHT,
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the root gives the
  // Workshop (the Guard is at Fortification).
  DRILL: IMPROVEMENT_ART_KEYS_V7.WORKSHOP,
  ENGINEERING: TERRAIN_ART_KEYS_V7.MOUNTAIN,
  METALLURGY: "building-square-forge",
  FORTIFICATION: "ui-tech-fortification",
  EXPLOSIVES: ACTION_ART_KEYS_V7.BLAST_MOUNTAIN,
  SHORECRAFT: IMPROVEMENT_ART_KEYS_V7.PORT,
  NAVIGATION: TERRAIN_ART_KEYS_V7.DEEP_WATER,
  NAVAL_ENGINEERING: UNIT_ART_KEYS_V7.BATTLESHIP,
  // The naval branch (bead pulp_wars-5ti.6): keyed as the Patrol Boat (the
  // rammer) and the Shipyard (Harbours).
  SEAMANSHIP: UNIT_ART_KEYS_V7.PATROL_BOAT,
  SUBMERSIBLES: IMPROVEMENT_ART_KEYS_V7.SHIPYARD,
} as const satisfies Readonly<Record<TechnologyIdV7, string>>;

const STATIC_COMMAND_ART_KEYS: Readonly<
  Partial<Record<CommandV7["kind"], string>>
> = {
  RALLY: ACTION_ART_KEYS_V7.RALLY,
  TEND_WOUNDED: "ui-action-heal",
  RECOVER: "ui-action-recover",
  CAPTURE: "building-village",
  PROMOTE: "ui-action-promote",
  PILLAGE: ACTION_ART_KEYS_V7.PILLAGE,
  DISBAND: ACTION_ART_KEYS_V7.DISBAND,
  WAIT: "ui-action-wait",
  HARVEST_FRUIT: RESOURCE_ART_KEYS_V7.FRUIT,
  HUNT_GAME: RESOURCE_ART_KEYS_V7.GAME,
  HARVEST_FISH: RESOURCE_ART_KEYS_V7.FISH,
  GATHER_PEARLS: RESOURCE_ART_KEYS_V7.PEARLS,
  BUILD_FARM: IMPROVEMENT_ART_KEYS_V7.FARM,
  BUILD_LUMBER_CAMP: IMPROVEMENT_ART_KEYS_V7.LUMBER_CAMP,
  BUILD_MINE: IMPROVEMENT_ART_KEYS_V7.MINE,
  BUILD_WINDMILL: IMPROVEMENT_ART_KEYS_V7.WINDMILL,
  BUILD_SAWMILL: IMPROVEMENT_ART_KEYS_V7.SAWMILL,
  BUILD_FORGE: IMPROVEMENT_ART_KEYS_V7.FORGE,
  BUILD_WORKSHOP: IMPROVEMENT_ART_KEYS_V7.WORKSHOP,
  BUILD_MARKET: IMPROVEMENT_ART_KEYS_V7.MARKET,
  BUILD_MONUMENT: IMPROVEMENT_ART_KEYS_V7.MONUMENT,
  BUILD_PORT: IMPROVEMENT_ART_KEYS_V7.PORT,
  BUILD_SHIPYARD: IMPROVEMENT_ART_KEYS_V7.SHIPYARD,
  DISEMBARK: EMBARKED_UNIT_ART_KEY_V7,
  CLEAR_FOREST: "ui-action-clear-forest",
  REPLANT_FOREST: "ui-action-replant-forest",
  CULTIVATE_FOREST: ACTION_ART_KEYS_V7.CULTIVATE_FOREST,
  BLAST_MOUNTAIN: ACTION_ART_KEYS_V7.BLAST_MOUNTAIN,
  BUILD_ROAD: "terrain-square-road-mask-0101",
  REDEVELOP: "ui-action-redevelop",
  LAND_GRANT: "ui-reward-expand",
  END_TURN: "ui-action-end-turn",
};

/** Move and Attack are deliberately map-targeted. */
export function commandArtKeyV7(command: CommandV7): string | null {
  if (command.kind === "MOVE" || command.kind === "ATTACK") return null;
  if (command.kind === "RESEARCH") return TECH_ART_KEYS_V7[command.tech];
  if (
    command.kind === "TRAIN" ||
    command.kind === "TRAIN_NAVAL" ||
    // Tuning 3: a hired unit is shown as the unit.
    command.kind === "HIRE"
  )
    return UNIT_ART_KEYS_V7[command.role];
  if (command.kind === "CHOOSE_CITY_REWARD")
    return rewardArtKeyV7(command.reward);
  return STATIC_COMMAND_ART_KEYS[command.kind] ?? null;
}

export function rewardArtKeyV7(reward: RewardIdV7): string {
  switch (reward) {
    case "SURVEY":
      return "ui-reward-survey";
    // `pulp_wars-zypi`: the Economic Miracle is keyed as the Coin rewards.
    case "STOCKPILE":
    case "TREASURY":
    case "TREASURY_6":
    case "ECONOMIC_MIRACLE":
      return "v7-hud-gold-coin";
    // Tuning 4: Barracks is keyed as the Walls.
    case "WALLS":
    case "BARRACKS":
      return "ui-reward-city-wall";
    case "MILITIA":
      return PORTRAIT_ART_KEYS_V7.FIGHTER;
    case "BOOM":
      return "ui-hud-population";
    case "JUGGERNAUT":
      return PORTRAIT_ART_KEYS_V7.JUGGERNAUT;
  }
}
