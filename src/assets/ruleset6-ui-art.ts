import type {
  CommandV6,
  FactionIdV6,
  RewardIdV6,
  TechnologyId,
} from "../engine/index";

export const RULESET6_TECH_ART_IDS = {
  ORIGINAL: {
    GATHERING: "ui-tech-original-gathering",
    FARMING: "ui-tech-original-farming",
    MILLING: "ui-tech-original-milling",
    CRAFT: "ui-tech-original-craft",
    GRAND_WORKS: "ui-tech-original-grand-works",
    HUNTING: "ui-tech-original-hunting",
    FORESTRY: "ui-tech-original-forestry",
    SAWMILLING: "ui-tech-original-sawmilling",
    MARKSMANSHIP: "ui-tech-original-marksmanship",
    FIELDCRAFT: "ui-tech-original-fieldcraft",
    SURVEYING: "ui-tech-original-surveying",
    MINING: "ui-tech-original-mining",
    METALLURGY: "ui-tech-original-metallurgy",
    QUARRYING: "ui-tech-original-quarrying",
    MASONRY: "ui-tech-original-masonry",
    SCOUTING: "ui-tech-original-scouting",
    ROADS: "ui-tech-original-roads",
    COMMERCE: "ui-tech-original-commerce",
    RAIDING: "ui-tech-original-raiding",
    MANEUVER: "ui-tech-original-maneuver",
    DRILL: "ui-tech-original-drill",
    FORTIFICATION: "ui-tech-original-fortification",
    EXPLOSIVES: "ui-tech-original-explosives",
    MEDICINE: "ui-tech-original-medicine",
    RECOVERY: "ui-tech-original-recovery",
  },
  CANDY: {
    GATHERING: "ui-tech-candy-gathering",
    FARMING: "ui-tech-candy-farming",
    MILLING: "ui-tech-candy-milling",
    CRAFT: "ui-tech-candy-craft",
    GRAND_WORKS: "ui-tech-candy-grand-works",
    HUNTING: "ui-tech-candy-hunting",
    FORESTRY: "ui-tech-candy-forestry",
    SAWMILLING: "ui-tech-candy-sawmilling",
    MARKSMANSHIP: "ui-tech-candy-marksmanship",
    FIELDCRAFT: "ui-tech-candy-fieldcraft",
    SURVEYING: "ui-tech-candy-surveying",
    MINING: "ui-tech-candy-mining",
    METALLURGY: "ui-tech-candy-metallurgy",
    QUARRYING: "ui-tech-candy-quarrying",
    MASONRY: "ui-tech-candy-masonry",
    SCOUTING: "ui-tech-candy-scouting",
    ROADS: "ui-tech-candy-roads",
    COMMERCE: "ui-tech-candy-commerce",
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
  BUILD_FARM: "building-farm",
  BUILD_LUMBER_CAMP: "building-lumber-camp",
  BUILD_MINE: "building-ruleset6-mine",
  BUILD_QUARRY: "building-quarry",
  BUILD_WINDMILL: "building-windmill",
  BUILD_SAWMILL: "building-sawmill",
  BUILD_FORGE: "building-forge",
  BUILD_STONEWORKS: "building-stoneworks",
  BUILD_WORKSHOP: "building-workshop",
  BUILD_GRAND_WORKS: "building-grand-works",
  BUILD_MARKET: "building-market",
  CLEAR_FOREST: "ui-action-clear-forest",
  REPLANT_FOREST: "ui-action-replant-forest",
  BUILD_ROAD: "ui-hud-road",
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
    return faction === "CANDY" ? "terrain-candy-fruit" : "terrain-fruit";
  if (command.kind === "HUNT_GAME")
    return faction === "CANDY" ? "terrain-candy-animal" : "terrain-game";
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
