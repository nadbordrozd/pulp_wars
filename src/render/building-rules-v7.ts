import {
  BASIC_ECONOMIC_ACTIONS_V7,
  dockPopulationV7,
  MARKET_INCOME_CAP_V7,
  MONUMENT_POPULATION_V7,
  resourceConsumedByBuildingV7,
  type CommandV7,
  type ConsumableResourceV7,
  type FactionIdV7,
  type ImprovementIdV7,
  type PlayerViewV7,
} from "../engine/index";
import { factionBuildingV7 } from "./faction-buildings-v7";

/**
 * Where each building may be built (bead pulp_wars-2yc.90; the user,
 * 2026-10-17: "workshop is never explained. There is nowhere in the game
 * explaining the rules where you can build a workshop"). One short line per
 * improvement, read from the engine's placement checks
 * (`applyBasic`, `applySpatial`, `applyPort`, `applyShipyard` and
 * `applyMonument` in src/engine/v7/reducer.ts; docs/product/
 * RULESET_7_CURRENT.md sections 8.2, 8.3 and 14): the terrain and resource
 * of a Farm, Lumber Camp and Mine, the one-per-city limit and the needed
 * neighbour of a mill, a Workshop and a Market, the water of a Port. The
 * technology card that unlocks a building shows the line under its "Build"
 * line, and the building's tile dock shows it behind its "?". A line stays
 * within the card's 92 characters; the finer gates every building shares
 * (no village or treasure on the tile; nothing but the Mine on a Mountain;
 * a Forest needs Forestry and is cleared; a resource under a building is
 * used up: `pulp_wars-h0xx`, 7r106) are left to the Help and the build
 * buttons, which are only offered where the engine allows them and say what
 * a build clears or uses up (`buildSiteNotesV7`).
 */

/** The longest technology card line (the naval card tests). */
export const TECHNOLOGY_CARD_LINE_LIMIT_V7 = 92;

/**
 * A mill's population cap: +1 for each contributor next to it, up to this
 * (`calculateSpatialContributionAtV7` in src/engine/v7/spatial-economy.ts;
 * a test checks these against the engine).
 */
export const MILL_POPULATION_CAPS_V7 = Object.freeze({
  WINDMILL: 8,
  SAWMILL: 8,
  FORGE: 6,
} as const);

const NAMES: Readonly<Record<ImprovementIdV7, string>> = {
  FARM: "Farm",
  LUMBER_CAMP: "Lumber Camp",
  MINE: "Mine",
  WINDMILL: "Windmill",
  SAWMILL: "Sawmill",
  FORGE: "Forge",
  WORKSHOP: "Workshop",
  MARKET: "Market",
  MONUMENT: "Monument",
  PORT: "Port",
  SHIPYARD: "Shipyard",
  FISHING_HOLE: "Fishing Hole",
};

/** "FERTILE_GROUND" as "Fertile Ground". */
function words(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.replace(/^./, (letter) => letter.toUpperCase()))
    .join(" ");
}

/** The faction's name of a building ("Graveyard"), else the shared one. */
function nameV7(
  improvement: ImprovementIdV7,
  faction: FactionIdV7 | null,
): string {
  return factionBuildingV7(improvement, faction)?.name ?? NAMES[improvement];
}

/**
 * The improvement a build command makes, or null for a command that builds
 * none (a Road, a Field Defense).
 */
export function buildCommandImprovementV7(
  command: string,
): ImprovementIdV7 | null {
  if (!command.startsWith("BUILD_")) return null;
  const improvement = command.slice("BUILD_".length);
  return Object.hasOwn(NAMES, improvement)
    ? (improvement as ImprovementIdV7)
    : null;
}

/**
 * The one line of where `improvement` may be built and what it gives, with
 * the faction's own names ("Graveyard: on Grass with Fertile Ground in your
 * borders; +2 population"). `faction` is the builder's: a tech card's
 * reader, or the faction that owns a tile's territory; null for the shared
 * names.
 */
export function buildingRuleTextV7(
  improvement: ImprovementIdV7,
  faction: FactionIdV7 | null,
): string {
  const name = nameV7(improvement, faction);
  const farm = nameV7("FARM", faction);
  const population = (amount: number): string => `+${amount} population`;
  // The frozen sea redesign (RULESET_7_ICE_REDESIGN.md section 2.6): the Ice
  // Folk build on their own ice too, and a Fishing Hole counts as a Farm.
  if (faction === "ICE_FOLK") {
    const ice = iceFolkBuildingRuleTextV7(improvement, name, farm);
    if (ice !== null) return ice;
  }
  switch (improvement) {
    case "FARM":
    case "LUMBER_CAMP":
    case "MINE": {
      const rule =
        BASIC_ECONOMIC_ACTIONS_V7[
          improvement === "FARM"
            ? "BUILD_FARM"
            : improvement === "LUMBER_CAMP"
              ? "BUILD_LUMBER_CAMP"
              : "BUILD_MINE"
        ];
      // Building placement (7r106): Game does not block a Lumber Camp.
      if (improvement === "LUMBER_CAMP")
        return `${name}: on ${words(rule.terrain)} in your borders, using up any Game; ${population(rule.population)}`;
      return `${name}: on ${words(rule.terrain)} with ${rule.resource === null ? "no resource" : words(rule.resource)} in your borders; ${population(rule.population)}`;
    }
    case "WINDMILL":
    case "SAWMILL":
    case "FORGE": {
      const feeder =
        improvement === "WINDMILL"
          ? farm
          : improvement === "SAWMILL"
            ? NAMES.LUMBER_CAMP
            : NAMES.MINE;
      return `${name}: one per city, next to your ${feeder}s; +1 population for each, max ${MILL_POPULATION_CAPS_V7[improvement]}`;
    }
    case "WORKSHOP":
      return `${name}: one per city, next to your ${farm}, ${NAMES.LUMBER_CAMP} or ${NAMES.MINE}`;
    case "MARKET":
      return `${name}: one per city, next to your ${farm}, ${NAMES.LUMBER_CAMP}, ${NAMES.MINE} or mill; 1–${MARKET_INCOME_CAP_V7} Coins`;
    case "MONUMENT":
      return `${name}: one per city, built with an achievement; ${population(MONUMENT_POPULATION_V7)}`;
    case "PORT":
      return `${name}: on Shallow Water in your borders, next to its city's land, not ice; ${population(dockPopulationV7("PORT", 0))}`;
    case "SHIPYARD":
      return `${name}: one per city, upgrades one of your active Ports; +${dockPopulationV7("SHIPYARD", 0) - dockPopulationV7("PORT", 0)} more population`;
    case "FISHING_HOLE":
      return `${name}: on your own ice in your borders; counts as a ${farm}; ${population(BASIC_ECONOMIC_ACTIONS_V7.BUILD_FISHING_HOLE.population)}`;
  }
}

/**
 * The Ice Folk lines of the buildings they may also put on their own ice
 * (the frozen sea redesign, section 2.6), or null for a building whose line
 * is the shared one.
 */
function iceFolkBuildingRuleTextV7(
  improvement: ImprovementIdV7,
  name: string,
  farm: string,
): string | null {
  const hole = NAMES.FISHING_HOLE;
  switch (improvement) {
    case "WINDMILL":
      return `${name}: one per city, land or ice, by your ${farm}s or ${hole}s; +1 each, max ${MILL_POPULATION_CAPS_V7.WINDMILL}`;
    case "SAWMILL":
    case "FORGE":
      return `${name}: one per city, land or ice, next to your ${improvement === "SAWMILL" ? NAMES.LUMBER_CAMP : NAMES.MINE}s; +1 each, max ${MILL_POPULATION_CAPS_V7[improvement]}`;
    case "WORKSHOP":
      return `${name}: one per city, land or ice, by a ${farm}, ${hole}, ${NAMES.LUMBER_CAMP} or ${NAMES.MINE}`;
    case "MARKET":
      return `${name}: one per city, land or ice, by a farm, ${hole}, camp, mine or mill; 1–${MARKET_INCOME_CAP_V7} Coins`;
    case "MONUMENT":
      return `${name}: one per city, on land or your ice, built with an achievement; +${MONUMENT_POPULATION_V7} population`;
    case "PORT":
      return `${name}: on your ice or Shallow Water (it freezes) by its city's land; +${dockPopulationV7("PORT", 0)} population`;
    case "SHIPYARD":
      return `${name}: one per city, upgrades one of your active ${nameV7("PORT", "ICE_FOLK")}s; +${dockPopulationV7("SHIPYARD", 0) - dockPopulationV7("PORT", 0)} more population`;
    default:
      return null;
  }
}

/**
 * Whether the line of `improvement` already says what it gives, so a
 * technology card leaves out the building's formula line (a Windmill's
 * "+1 per adjacent farm"). A Workshop's line has no room for its yield and
 * keeps its formula line.
 */
export function buildingRuleCoversYieldV7(
  improvement: ImprovementIdV7,
): boolean {
  return improvement !== "WORKSHOP";
}

/**
 * Building placement (`pulp_wars-h0xx`, 7r106): the short note on a build
 * button whose building stands on a Forest. The build clears the Forest
 * first, as Clear Forest does (and pays its Coin).
 */
export const BUILD_CLEARS_FOREST_NOTE_V7 = "Clears the forest";

/** "Uses up the Fruit": a building over a resource it does not keep. */
export function buildUsesUpNoteV7(resource: ConsumableResourceV7): string {
  return `Uses up the ${words(resource)}`;
}

/**
 * The notes a build button shows for its tile (7r106): that it clears the
 * Forest, and the visible resource it uses up. Empty for a command that
 * builds nothing, a Lumber Camp's Forest (it stays), and a plain tile.
 */
export function buildSiteNotesV7(
  view: PlayerViewV7,
  command: CommandV7,
): readonly string[] {
  if (!("at" in command)) return [];
  const improvement = buildCommandImprovementV7(command.kind);
  if (improvement === null) return [];
  const at = command.at;
  const tile = view.board.tiles.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (tile?.explored !== true) return [];
  const notes: string[] = [];
  if (tile.terrain === "FOREST" && improvement !== "LUMBER_CAMP")
    notes.push(BUILD_CLEARS_FOREST_NOTE_V7);
  const consumed = resourceConsumedByBuildingV7(improvement, tile.resource);
  if (consumed !== null) notes.push(buildUsesUpNoteV7(consumed));
  return notes;
}
