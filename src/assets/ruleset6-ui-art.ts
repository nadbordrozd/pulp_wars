import type {
  CommandV6,
  FactionIdV6,
  RewardIdV6,
  TechnologyId,
} from "../engine/index";

export const RULESET6_TECH_ART_IDS = {
  ORIGINAL: {
    GATHERING: "terrain-square-original-fruit",
    FARMING: "building-square-farm",
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
    MANEUVER: "ui-tech-original-maneuver",
    DRILL: "ui-tech-original-drill",
    FORTIFICATION: "ui-tech-original-fortification",
    EXPLOSIVES: "ui-tech-original-explosives",
    MEDICINE: "ui-tech-original-medicine",
    RECOVERY: "ui-tech-original-recovery",
  },
  CANDY: {
    GATHERING: "terrain-square-candy-fruit",
    FARMING: "building-square-farm",
    MILLING: "building-square-windmill",
    CRAFT: "building-square-workshop",
    GRAND_WORKS: "building-square-grand-works",
    HUNTING: "terrain-square-candy-animal",
    FORESTRY: "building-square-lumber-camp",
    SAWMILLING: "building-square-sawmill",
    MARKSMANSHIP: "ui-tech-candy-marksmanship",
    FIELDCRAFT: "ui-tech-candy-fieldcraft",
    SURVEYING: "ui-tech-candy-surveying",
    MINING: "building-square-mine",
    METALLURGY: "building-square-forge",
    QUARRYING: "building-square-quarry",
    MASONRY: "building-square-stoneworks",
    SCOUTING: "ui-tech-candy-scouting",
    ROADS: "terrain-square-road-mask-0101",
    COMMERCE: "building-square-market",
    RAIDING: "ui-tech-candy-raiding",
    MANEUVER: "ui-tech-candy-maneuver",
    DRILL: "ui-tech-candy-drill",
    FORTIFICATION: "ui-tech-candy-fortification",
    EXPLOSIVES: "ui-tech-candy-explosives",
    MEDICINE: "ui-tech-candy-medicine",
    RECOVERY: "ui-tech-candy-recovery",
  },
} as const satisfies Readonly<
  Record<FactionIdV6, Readonly<Record<TechnologyId, string>>>
>;

export const RULESET6_HUD_ART_IDS = {
  COIN: "ui-hud-coin",
  INCOME: "ui-hud-income",
  POPULATION: "ui-hud-population",
  NEGATIVE_POPULATION: "ui-hud-negative-population",
  CAPACITY: "ui-hud-capacity",
  ROAD: "ui-hud-road",
} as const;

const STATIC_COMMAND_ART_IDS: Readonly<
  Partial<Record<CommandV6["kind"], string>>
> = {
  KAMIKAZE_ROLL: "ui-action-kamikaze-roll",
  HEAL_ADJACENT: "ui-action-heal",
  RECOVER: "ui-action-recover",
  CAPTURE: "building-village",
  PROMOTE: "ui-action-promote",
  WAIT: "ui-action-wait",
  BUILD_CHOCOLATE_WALL: "ui-action-build-chocolate-wall",
  CANDIFY: "ui-action-candify",
  CHOOSE_CANDIFY_CITY: "ui-action-choose-candify-city",
  BUILD_FARM: "building-square-farm",
  BUILD_LUMBER_CAMP: "building-square-lumber-camp",
  BUILD_MINE: "building-square-mine",
  BUILD_QUARRY: "building-square-quarry",
  BUILD_WINDMILL: "building-square-windmill",
  BUILD_SAWMILL: "building-square-sawmill",
  BUILD_FORGE: "building-square-forge",
  BUILD_STONEWORKS: "building-square-stoneworks",
  BUILD_WORKSHOP: "building-square-workshop",
  BUILD_GRAND_WORKS: "building-square-grand-works",
  BUILD_MARKET: "building-square-market",
  CLEAR_FOREST: "ui-action-clear-forest",
  REPLANT_FOREST: "ui-action-replant-forest",
  BUILD_ROAD: "terrain-square-road-mask-0101",
  REDEVELOP: "ui-action-redevelop",
  END_TURN: "ui-action-end-turn",
};

export function technologyArtIdV6(
  faction: FactionIdV6,
  technology: TechnologyId,
): string {
  return RULESET6_TECH_ART_IDS[faction][technology];
}

/** Move and Attack intentionally return null because they remain map-targeted. */
export function commandArtIdV6(
  command: CommandV6,
  faction: FactionIdV6,
): string | null {
  if (command.kind === "MOVE" || command.kind === "ATTACK") return null;
  if (command.kind === "HARVEST_FRUIT")
    return `terrain-square-${faction === "CANDY" ? "candy" : "original"}-fruit`;
  if (command.kind === "HUNT_GAME")
    return `terrain-square-${faction === "CANDY" ? "candy" : "original"}-animal`;
  if (command.kind === "RESEARCH")
    return technologyArtIdV6(faction, command.tech);
  if (command.kind === "TRAIN")
    return `unit-${faction.toLowerCase()}-${command.role.toLowerCase()}`;
  if (command.kind === "CHOOSE_CITY_REWARD")
    return rewardArtIdV6(faction, command.reward);
  return STATIC_COMMAND_ART_IDS[command.kind] ?? null;
}

export function rewardArtIdV6(
  faction: FactionIdV6,
  reward: RewardIdV6,
): string {
  switch (reward) {
    case "SURVEY":
      return "ui-reward-survey";
    case "STOCKPILE":
    case "TREASURY":
      return RULESET6_HUD_ART_IDS.COIN;
    case "WALLS":
      return "ui-reward-city-wall";
    case "MILITIA":
      return `portrait-${faction.toLowerCase()}-fighter`;
    case "EXPAND":
      return "ui-reward-expand";
    case "BOOM":
      return RULESET6_HUD_ART_IDS.POPULATION;
    case "JUGGERNAUT":
      return `portrait-${faction.toLowerCase()}-juggernaut`;
  }
}
