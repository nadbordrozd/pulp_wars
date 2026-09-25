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
import {
  RULESET7_REVISION9_ACTION_ART_IDS,
  RULESET7_REVISION9_IMPROVEMENT_ART_IDS,
  RULESET7_REVISION9_PORTRAIT_ART_IDS,
  RULESET7_REVISION9_UNIT_ART_IDS,
} from "./ruleset7-revision9-art";
import {
  RULESET7_PLAYTEST_PORTRAIT_ART_IDS,
  RULESET7_PLAYTEST_TECH_ART_IDS,
  RULESET7_PLAYTEST_UNIT_ART_IDS,
} from "./ruleset7-playtest-art";
import { RULESET7_LOGISTICS_ART_IDS } from "./ruleset7-logistics-art";

export const RULESET7_UNIT_ART_IDS = {
  FIGHTER: "unit-original-fighter",
  RAIDER: "unit-original-raider",
  MARKSMAN: "unit-original-marksman",
  GUARD: "unit-original-guard",
  CAPTAIN: RULESET7_PLAYTEST_UNIT_ART_IDS.CAPTAIN,
  CATAPULT: "unit-original-catapult",
  KNIGHT: RULESET7_REVISION9_UNIT_ART_IDS.KNIGHT,
  JUGGERNAUT: "unit-original-juggernaut",
  PATROL_BOAT: "unit-original-patrol-boat",
  BATTLESHIP: "unit-original-battleship",
} as const satisfies Readonly<Record<UnitRoleIdV7, string>>;

export const RULESET7_PORTRAIT_ART_IDS = {
  FIGHTER: "portrait-original-fighter",
  RAIDER: "portrait-original-raider",
  MARKSMAN: "portrait-original-marksman",
  GUARD: "portrait-original-guard",
  CAPTAIN: RULESET7_PLAYTEST_PORTRAIT_ART_IDS.CAPTAIN,
  CATAPULT: "portrait-original-catapult",
  KNIGHT: RULESET7_REVISION9_PORTRAIT_ART_IDS.KNIGHT,
  JUGGERNAUT: "portrait-original-juggernaut",
  PATROL_BOAT: "unit-original-patrol-boat",
  BATTLESHIP: "unit-original-battleship",
} as const satisfies Readonly<Record<UnitRoleIdV7, string>>;

export const RULESET7_FARM_ART_IDS = {
  SINGLE: "building-ruleset7-farm-single",
  HORIZONTAL_PAIR: "building-ruleset7-farm-pair-horizontal",
  VERTICAL_PAIR: "building-ruleset7-farm-pair-vertical",
} as const;

export const RULESET7_TECH_ART_IDS = {
  GATHERING: "terrain-square-original-fruit",
  FARMING: RULESET7_FARM_ART_IDS.SINGLE,
  MILLING: "building-square-windmill",
  ADMINISTRATION: RULESET7_PLAYTEST_PORTRAIT_ART_IDS.CAPTAIN,
  PLANNING: "ui-reward-expand",
  HUNTING: "terrain-square-original-animal",
  FORESTRY: "building-ruleset7-resource-lumber-camp",
  SAWMILLING: "building-square-sawmill",
  MARKSMANSHIP: "ui-tech-original-marksmanship",
  FIELDCRAFT: "ui-tech-original-fieldcraft",
  SCOUTING: RULESET7_PLAYTEST_TECH_ART_IDS.SCOUTING,
  ROADS: "terrain-square-road-mask-0101",
  COMMERCE: "building-square-market",
  RAIDING: RULESET7_PLAYTEST_TECH_ART_IDS.RAIDING,
  CHIVALRY: RULESET7_REVISION9_UNIT_ART_IDS.KNIGHT,
  DRILL: "unit-original-guard",
  ENGINEERING: "terrain-ruleset7-revision3-mountain-1",
  METALLURGY: "building-square-forge",
  FORTIFICATION: "ui-tech-fortification",
  EXPLOSIVES: RULESET7_REVISION9_ACTION_ART_IDS.BLAST_MOUNTAIN,
  SHORECRAFT: RULESET7_LOGISTICS_ART_IDS.PORT,
  NAVIGATION: "terrain-ruleset7-water-deep",
  NAVAL_ENGINEERING: "unit-original-battleship",
} as const satisfies Readonly<Record<TechnologyIdV7, string>>;

export const RULESET7_IMPROVEMENT_ART_IDS = {
  FARM: RULESET7_FARM_ART_IDS.SINGLE,
  LUMBER_CAMP: "building-ruleset7-resource-lumber-camp",
  MINE: "terrain-ruleset7-revision3-mined-mountain-1",
  WINDMILL: "building-square-windmill",
  SAWMILL: "building-square-sawmill",
  FORGE: "building-square-forge",
  WORKSHOP: "building-square-workshop",
  MARKET: "building-square-market",
  MONUMENT: "building-square-monument",
  PORT: RULESET7_LOGISTICS_ART_IDS.PORT,
  SHIPYARD: RULESET7_REVISION9_IMPROVEMENT_ART_IDS.SHIPYARD,
} as const satisfies Readonly<Record<ImprovementIdV7, string>>;

export const RULESET7_RESOURCE_ART_IDS = {
  FRUIT: "terrain-square-original-fruit",
  GAME: "terrain-square-original-animal",
  FERTILE_GROUND: "terrain-ruleset7-resource-fertile-ground",
  ORE: "terrain-square-ore",
  FISH: RULESET7_LOGISTICS_ART_IDS.FISH,
  PEARLS: "terrain-ruleset7-resource-pearls",
} as const satisfies Readonly<Record<ResourceIdV7, string>>;

/** Cosmetic map and selected-tile families. Technology and action art use canonical IDs. */
export const RULESET7_FRUIT_MAP_ART_IDS = [
  RULESET7_RESOURCE_ART_IDS.FRUIT,
  "terrain-ruleset7-original-fruit-pear",
  "terrain-ruleset7-original-fruit-plum",
] as const;

export const RULESET7_GAME_MAP_ART_IDS = [
  RULESET7_RESOURCE_ART_IDS.GAME,
  "terrain-ruleset7-original-game-deer",
  "terrain-ruleset7-original-game-fox",
] as const;

export function resourceMapArtIdV7(
  resource: ResourceIdV7,
  at: CoordV7,
): string {
  const index = (at.x * 31 + at.y * 17) % 3;
  return resource === "FRUIT"
    ? (RULESET7_FRUIT_MAP_ART_IDS[index] ?? RULESET7_RESOURCE_ART_IDS.FRUIT)
    : resource === "GAME"
      ? (RULESET7_GAME_MAP_ART_IDS[index] ?? RULESET7_RESOURCE_ART_IDS.GAME)
      : RULESET7_RESOURCE_ART_IDS[resource];
}

export const RULESET7_TERRAIN_ART_IDS = {
  GRASS: "terrain-ruleset7-original-grass-1",
  FOREST: "terrain-ruleset7-original-forest-1",
  MOUNTAIN: "terrain-ruleset7-revision3-mountain-1",
  SHALLOW_WATER: "terrain-ruleset7-water-shallow",
  DEEP_WATER: "terrain-ruleset7-water-deep",
} as const satisfies Readonly<Record<TerrainIdV7, string>>;

const STATIC_COMMAND_ART_IDS: Readonly<
  Partial<Record<CommandV7["kind"], string>>
> = {
  RALLY: RULESET7_REVISION9_ACTION_ART_IDS.RALLY,
  TEND_WOUNDED: "ui-action-heal",
  RECOVER: "ui-action-recover",
  CAPTURE: "building-village",
  PROMOTE: "ui-action-promote",
  PILLAGE: "ui-action-pillage",
  DISBAND: "ui-action-disband",
  WAIT: "ui-action-wait",
  HARVEST_FRUIT: RULESET7_RESOURCE_ART_IDS.FRUIT,
  HUNT_GAME: RULESET7_RESOURCE_ART_IDS.GAME,
  HARVEST_FISH: RULESET7_RESOURCE_ART_IDS.FISH,
  GATHER_PEARLS: RULESET7_RESOURCE_ART_IDS.PEARLS,
  BUILD_FARM: RULESET7_IMPROVEMENT_ART_IDS.FARM,
  BUILD_LUMBER_CAMP: RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP,
  BUILD_MINE: RULESET7_IMPROVEMENT_ART_IDS.MINE,
  BUILD_WINDMILL: RULESET7_IMPROVEMENT_ART_IDS.WINDMILL,
  BUILD_SAWMILL: RULESET7_IMPROVEMENT_ART_IDS.SAWMILL,
  BUILD_FORGE: RULESET7_IMPROVEMENT_ART_IDS.FORGE,
  BUILD_WORKSHOP: RULESET7_IMPROVEMENT_ART_IDS.WORKSHOP,
  BUILD_MARKET: RULESET7_IMPROVEMENT_ART_IDS.MARKET,
  BUILD_MONUMENT: RULESET7_IMPROVEMENT_ART_IDS.MONUMENT,
  BUILD_PORT: RULESET7_IMPROVEMENT_ART_IDS.PORT,
  BUILD_SHIPYARD: RULESET7_IMPROVEMENT_ART_IDS.SHIPYARD,
  DISEMBARK: "unit-shared-embarked-transport",
  CLEAR_FOREST: "ui-action-clear-forest",
  REPLANT_FOREST: "ui-action-replant-forest",
  CULTIVATE_FOREST: RULESET7_REVISION9_ACTION_ART_IDS.CULTIVATE_FOREST,
  BLAST_MOUNTAIN: RULESET7_REVISION9_ACTION_ART_IDS.BLAST_MOUNTAIN,
  BUILD_ROAD: "terrain-square-road-mask-0101",
  REDEVELOP: "ui-action-redevelop",
  LAND_GRANT: "ui-reward-expand",
  END_TURN: "ui-action-end-turn",
};

/** Move and Attack are deliberately map-targeted. */
export function commandArtIdV7(command: CommandV7): string | null {
  if (command.kind === "MOVE" || command.kind === "ATTACK") return null;
  if (command.kind === "RESEARCH") return RULESET7_TECH_ART_IDS[command.tech];
  if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL")
    return RULESET7_UNIT_ART_IDS[command.role];
  if (command.kind === "CHOOSE_CITY_REWARD")
    return rewardArtIdV7(command.reward);
  return STATIC_COMMAND_ART_IDS[command.kind] ?? null;
}

export function rewardArtIdV7(reward: RewardIdV7): string {
  switch (reward) {
    case "SURVEY":
      return "ui-reward-survey";
    case "STOCKPILE":
    case "TREASURY":
    case "TREASURY_8":
      return "ui-hud-gold-coin-v7";
    case "WALLS":
      return "ui-reward-city-wall";
    case "MILITIA":
      return RULESET7_PORTRAIT_ART_IDS.FIGHTER;
    case "BOOM":
      return "ui-hud-population";
    case "JUGGERNAUT":
      return RULESET7_PORTRAIT_ART_IDS.JUGGERNAUT;
  }
}
