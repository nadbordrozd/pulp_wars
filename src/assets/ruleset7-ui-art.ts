import type {
  CommandV7,
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
  ENVOY: "unit-original-envoy",
  MARKSMAN: "unit-original-marksman",
  GUARD: "unit-original-guard",
  RAIDER: "unit-original-raider",
  MEDIC: "unit-original-medic",
  CATAPULT: "unit-original-catapult",
  SABOTEUR: "unit-original-saboteur",
  HEAVY: "unit-original-heavy",
  LANCER: "unit-original-lancer",
  BREACHER: "unit-original-breacher",
  JUGGERNAUT: "unit-original-juggernaut",
} as const satisfies Readonly<Record<UnitRoleIdV7, string>>;

export const RULESET7_PORTRAIT_ART_IDS = {
  FIGHTER: "portrait-original-fighter",
  SCOUT: "portrait-original-scout",
  ENVOY: "portrait-original-envoy",
  MARKSMAN: "portrait-original-marksman",
  GUARD: "portrait-original-guard",
  RAIDER: "portrait-original-raider",
  MEDIC: "portrait-original-medic",
  CATAPULT: "portrait-original-catapult",
  SABOTEUR: "portrait-original-saboteur",
  HEAVY: "portrait-original-heavy",
  LANCER: "portrait-original-lancer",
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
  CRAFT: "building-square-workshop",
  GRAND_WORKS: "building-square-grand-works",
  HUNTING: "terrain-square-original-animal",
  FORESTRY: "building-square-lumber-camp",
  SAWMILLING: "building-square-sawmill",
  MARKSMANSHIP: "ui-tech-original-marksmanship",
  FIELDCRAFT: "ui-tech-original-fieldcraft",
  SURVEYING: "ui-tech-original-surveying",
  MINING: "building-square-mine",
  METALLURGY: "building-square-forge",
  QUARRYING: "building-square-quarry",
  MASONRY: "building-square-stoneworks",
  SCOUTING: "ui-tech-original-scouting",
  ROADS: "terrain-square-road-mask-0101",
  COMMERCE: "building-square-market",
  RAIDING: "ui-tech-original-raiding",
  MANEUVER: "unit-original-lancer",
  DRILL: "ui-tech-original-drill",
  FORTIFICATION: "ui-tech-original-fortification",
  EXPLOSIVES: "ui-tech-original-explosives",
  MEDICINE: "ui-tech-original-medicine",
  RECOVERY: "ui-tech-original-recovery",
} as const satisfies Readonly<Record<TechnologyIdV7, string>>;

export const RULESET7_IMPROVEMENT_ART_IDS = {
  FARM: RULESET7_FARM_ART_IDS.SINGLE,
  LUMBER_CAMP: "building-square-lumber-camp",
  MINE: "building-square-mine",
  QUARRY: "building-square-quarry",
  WINDMILL: "building-square-windmill",
  SAWMILL: "building-square-sawmill",
  FORGE: "building-square-forge",
  STONEWORKS: "building-square-stoneworks",
  WORKSHOP: "building-square-workshop",
  GRAND_WORKS: "building-square-grand-works",
  MARKET: "building-square-market",
  BARRACKS: "building-square-barracks",
  MONUMENT: "building-square-monument",
} as const satisfies Readonly<Record<ImprovementIdV7, string>>;

export const RULESET7_RESOURCE_ART_IDS = {
  FRUIT: "terrain-square-original-fruit",
  GAME: "terrain-square-original-animal",
  FERTILE_GROUND: "terrain-square-fertile-ground",
  ORE: "terrain-square-ore",
  STONE: "terrain-square-stone",
} as const satisfies Readonly<Record<ResourceIdV7, string>>;

export const RULESET7_TERRAIN_ART_IDS = {
  GRASS: "terrain-square-original-grass-1",
  FOREST: "terrain-square-original-forest-1",
  MOUNTAIN: "terrain-square-original-mountain-1",
} as const satisfies Readonly<Record<TerrainIdV7, string>>;

const STATIC_COMMAND_ART_IDS: Readonly<
  Partial<Record<CommandV7["kind"], string>>
> = {
  OFFER_DEFECTION: "ui-action-defection",
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
  BUILD_QUARRY: RULESET7_IMPROVEMENT_ART_IDS.QUARRY,
  BUILD_WINDMILL: RULESET7_IMPROVEMENT_ART_IDS.WINDMILL,
  BUILD_SAWMILL: RULESET7_IMPROVEMENT_ART_IDS.SAWMILL,
  BUILD_FORGE: RULESET7_IMPROVEMENT_ART_IDS.FORGE,
  BUILD_STONEWORKS: RULESET7_IMPROVEMENT_ART_IDS.STONEWORKS,
  BUILD_WORKSHOP: RULESET7_IMPROVEMENT_ART_IDS.WORKSHOP,
  BUILD_GRAND_WORKS: RULESET7_IMPROVEMENT_ART_IDS.GRAND_WORKS,
  BUILD_MARKET: RULESET7_IMPROVEMENT_ART_IDS.MARKET,
  BUILD_BARRACKS: RULESET7_IMPROVEMENT_ART_IDS.BARRACKS,
  BUILD_MONUMENT: RULESET7_IMPROVEMENT_ART_IDS.MONUMENT,
  CLEAR_FOREST: "ui-action-clear-forest",
  REPLANT_FOREST: "ui-action-replant-forest",
  BUILD_ROAD: "terrain-square-road-mask-0101",
  REDEVELOP: "ui-action-redevelop",
  END_TURN: "ui-action-end-turn",
};

/** Move, Pursue and Attack are deliberately map-targeted. */
export function commandArtIdV7(command: CommandV7): string | null {
  if (
    command.kind === "MOVE" ||
    command.kind === "PURSUE" ||
    command.kind === "ATTACK"
  )
    return null;
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
      return "ui-hud-coin";
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
