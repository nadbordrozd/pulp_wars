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

export const RULESET7_UNIT_ART_IDS = {
  FIGHTER: "unit-original-fighter",
  SCOUT: "unit-original-scout",
  MARKSMAN: "unit-original-marksman",
  GUARD: "unit-original-guard",
  RAIDER: "unit-original-raider",
  MEDIC: "unit-original-medic",
  CATAPULT: "unit-original-catapult",
  SABOTEUR: "unit-original-saboteur",
  HEAVY: "unit-original-heavy",
  HORSE_ARCHER: "unit-original-horse-archer",
  BREACHER: "unit-original-breacher",
  JUGGERNAUT: "unit-original-juggernaut",
} as const satisfies Readonly<Record<UnitRoleIdV7, string>>;

export const RULESET7_PORTRAIT_ART_IDS = {
  FIGHTER: "portrait-original-fighter",
  SCOUT: "portrait-original-scout",
  MARKSMAN: "portrait-original-marksman",
  GUARD: "portrait-original-guard",
  RAIDER: "portrait-original-raider",
  MEDIC: "portrait-original-medic",
  CATAPULT: "portrait-original-catapult",
  SABOTEUR: "portrait-original-saboteur",
  HEAVY: "portrait-original-heavy",
  HORSE_ARCHER: "portrait-original-horse-archer",
  BREACHER: "portrait-original-breacher",
  JUGGERNAUT: "portrait-original-juggernaut",
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
  MEDICINE: "ui-tech-original-medicine",
  RECOVERY: "ui-tech-original-recovery",
  HUNTING: "terrain-square-original-animal",
  FORESTRY: "building-ruleset7-resource-lumber-camp",
  SAWMILLING: "building-square-sawmill",
  MARKSMANSHIP: "ui-tech-original-marksmanship",
  FIELDCRAFT: "ui-tech-original-fieldcraft",
  SCOUTING: "ui-tech-original-scouting",
  ROADS: "terrain-square-road-mask-0101",
  COMMERCE: "building-square-market",
  RAIDING: "ui-tech-original-raiding",
  MOUNTED_ARCHERY: "unit-original-horse-archer",
  DRILL: "ui-tech-original-drill",
  FORTIFICATION: "ui-tech-original-fortification",
  EXPLOSIVES: "ui-tech-original-explosives",
  ENGINEERING: "terrain-ruleset7-revision3-mountain-1",
  METALLURGY: "building-square-forge",
  GRAND_WORKS: "building-square-grand-works",
} as const satisfies Readonly<Record<TechnologyIdV7, string>>;

export const RULESET7_IMPROVEMENT_ART_IDS = {
  FARM: RULESET7_FARM_ART_IDS.SINGLE,
  LUMBER_CAMP: "building-ruleset7-resource-lumber-camp",
  MINE: "terrain-ruleset7-revision3-mined-mountain-1",
  WINDMILL: "building-square-windmill",
  SAWMILL: "building-square-sawmill",
  FORGE: "building-square-forge",
  WORKSHOP: "building-square-workshop",
  GRAND_WORKS: "building-square-grand-works",
  MARKET: "building-square-market",
  MONUMENT: "building-square-monument",
} as const satisfies Readonly<Record<ImprovementIdV7, string>>;

export const RULESET7_RESOURCE_ART_IDS = {
  FRUIT: "terrain-square-original-fruit",
  GAME: "terrain-square-original-animal",
  FERTILE_GROUND: "terrain-ruleset7-resource-fertile-ground",
  ORE: "terrain-square-ore",
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
} as const satisfies Readonly<Record<TerrainIdV7, string>>;

const STATIC_COMMAND_ART_IDS: Readonly<
  Partial<Record<CommandV7["kind"], string>>
> = {
  BLACKOUT_CITY: "ui-action-blackout",
  HEAL_ADJACENT: "ui-action-heal",
  RECOVER: "ui-action-recover",
  CAPTURE: "building-village",
  PROMOTE: "ui-action-promote",
  PILLAGE: "ui-action-pillage",
  DISBAND: "ui-action-disband",
  WAIT: "ui-action-wait",
  HARVEST_FRUIT: RULESET7_RESOURCE_ART_IDS.FRUIT,
  HUNT_GAME: RULESET7_RESOURCE_ART_IDS.GAME,
  BUILD_FARM: RULESET7_IMPROVEMENT_ART_IDS.FARM,
  BUILD_LUMBER_CAMP: RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP,
  BUILD_MINE: RULESET7_IMPROVEMENT_ART_IDS.MINE,
  BUILD_WINDMILL: RULESET7_IMPROVEMENT_ART_IDS.WINDMILL,
  BUILD_SAWMILL: RULESET7_IMPROVEMENT_ART_IDS.SAWMILL,
  BUILD_FORGE: RULESET7_IMPROVEMENT_ART_IDS.FORGE,
  BUILD_WORKSHOP: RULESET7_IMPROVEMENT_ART_IDS.WORKSHOP,
  BUILD_GRAND_WORKS: RULESET7_IMPROVEMENT_ART_IDS.GRAND_WORKS,
  BUILD_MARKET: RULESET7_IMPROVEMENT_ART_IDS.MARKET,
  BUILD_MONUMENT: RULESET7_IMPROVEMENT_ART_IDS.MONUMENT,
  CLEAR_FOREST: "ui-action-clear-forest",
  REPLANT_FOREST: "ui-action-replant-forest",
  BUILD_ROAD: "terrain-square-road-mask-0101",
  REDEVELOP: "ui-action-redevelop",
  END_TURN: "ui-action-end-turn",
};

/** Move and Attack are deliberately map-targeted. */
export function commandArtIdV7(command: CommandV7): string | null {
  if (command.kind === "MOVE" || command.kind === "ATTACK") return null;
  if (command.kind === "RESEARCH") return RULESET7_TECH_ART_IDS[command.tech];
  if (command.kind === "TRAIN") return RULESET7_UNIT_ART_IDS[command.role];
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
      return "ui-hud-gold-coin-v7";
    case "WALLS":
      return "ui-reward-city-wall";
    case "MILITIA":
      return RULESET7_PORTRAIT_ART_IDS.FIGHTER;
    case "EXPAND":
      return "ui-reward-expand";
    case "BOOM":
      return "ui-hud-population";
    case "JUGGERNAUT":
      return RULESET7_PORTRAIT_ART_IDS.JUGGERNAUT;
  }
}
