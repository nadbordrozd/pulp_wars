import {
  BASIC_ECONOMIC_ACTIONS_V7,
  GATHER_PEARLS_V7,
} from "../rules/ruleset-v7";
import type {
  ImprovementIdV7,
  ResourceIdV7,
  TechnologyIdV7,
  TerrainIdV7,
} from "./types";

/**
 * Building placement (`pulp_wars-h0xx`, `pulp-wars-poc-7r106`;
 * docs/product/RULESET_7_CURRENT.md section 8.1). The user, 2026-10-23:
 * "overall mountains should be the toughest - there should be fewest things
 * you can build on mountains. fertile ground or fruit should not be an
 * obstacle to building at all. building on a forest should be only
 * available after you have the tech to clear a forest and then building on
 * a forest implicitly clears the forest".
 *
 * - A **general building** (Windmill, Sawmill, Forge, Workshop, Market,
 *   Monument) stands on Grass, or on Forest once the builder has Forestry
 *   (the technology of Clear Forest): the build clears the Forest first,
 *   exactly as Clear Forest does (the tile becomes Grass and pays
 *   `CLEAR_FOREST_COINS_V7`). Never on a Mountain (only the Mine is built
 *   there) and never on a Rift. An Ice Folk seat's own ice is where it may
 *   stand on water (`iceBuildableV7`).
 * - **No resource blocks a building.** A building over Fruit, Fertile
 *   Ground, or Game, or on ice over Fish or Pearls, uses it up (the
 *   resource is gone); the Farm keeps the Fertile Ground it farms, the Mine
 *   the Ore it mines, and a Port or Shipyard its Fish or Pearls, as before.
 *
 * Every engine rule, public query, preview, planner, and the Normal AI read
 * these helpers, so the reducer and the offer cannot drift apart.
 */

/** The technology whose Clear Forest also lets a building clear a Forest. */
export const FOREST_CLEARING_TECH_V7 = "FORESTRY" as const;
/** The Coins Clear Forest pays, and so a build that clears a Forest. */
export const CLEAR_FOREST_COINS_V7 = 1 as const;

/**
 * Where a general building may stand on a land terrain:
 * - `OPEN`: Grass, built as it is;
 * - `CLEARS_FOREST`: Forest with Forestry, which the build clears;
 * - `NEEDS_FORESTRY`: Forest without Forestry (`TECH_REQUIRED`);
 * - `NEVER`: Mountain, Rift, or water (`INVALID_TILE`; ice has its own rule).
 */
export type GeneralBuildingTerrainV7 =
  "OPEN" | "CLEARS_FOREST" | "NEEDS_FORESTRY" | "NEVER";

export function generalBuildingTerrainV7(
  terrain: TerrainIdV7 | null | undefined,
  researchedTechs: readonly TechnologyIdV7[],
): GeneralBuildingTerrainV7 {
  if (terrain === "GRASS") return "OPEN";
  if (terrain === "FOREST")
    return researchedTechs.includes(FOREST_CLEARING_TECH_V7)
      ? "CLEARS_FOREST"
      : "NEEDS_FORESTRY";
  return "NEVER";
}

/** Whether a general building may be placed on this land terrain now. */
export function generalBuildingFitsTerrainV7(
  terrain: TerrainIdV7 | null | undefined,
  researchedTechs: readonly TechnologyIdV7[],
): boolean {
  const fit = generalBuildingTerrainV7(terrain, researchedTechs);
  return fit === "OPEN" || fit === "CLEARS_FOREST";
}

/**
 * Whether an improvement keeps the resource it is built over: the Farm its
 * Fertile Ground, the Mine its Ore, a Port or Shipyard its Fish or Pearls.
 * Every other building uses its tile's resource up.
 */
export function improvementKeepsResourceV7(
  improvement: ImprovementIdV7,
  resource: ResourceIdV7 | "UNKNOWN_RESOURCE" | null,
): boolean {
  if (resource === null) return false;
  if (improvement === "FARM") return resource === "FERTILE_GROUND";
  if (improvement === "MINE") return resource === "ORE";
  return improvement === "PORT" || improvement === "SHIPYARD";
}

/**
 * The resource left on a tile once `improvement` stands on it (null when
 * the building used it up).
 */
export function resourceUnderImprovementV7<
  R extends ResourceIdV7 | "UNKNOWN_RESOURCE" | null,
>(improvement: ImprovementIdV7, resource: R): R | null {
  return improvementKeepsResourceV7(improvement, resource) ? resource : null;
}

/**
 * The resource a building uses up, when the builder can see it (`resource`
 * is the tile's resource as the builder sees it): Fruit, Fertile Ground,
 * or Game on land, Fish or Pearls on ice, under a building that does not
 * keep it. Null otherwise.
 */
export function resourceConsumedByBuildingV7(
  improvement: ImprovementIdV7,
  resource: ResourceIdV7 | "UNKNOWN_RESOURCE" | null | undefined,
): ConsumableResourceV7 | null {
  if (
    resource === null ||
    resource === undefined ||
    resource === "UNKNOWN_RESOURCE" ||
    resource === "ORE"
  )
    return null;
  return improvementKeepsResourceV7(improvement, resource) ? null : resource;
}

/**
 * The resources a building may use up: Fruit, Fertile Ground, and Game on
 * land, Fish and Pearls on an Ice Folk seat's own ice (Ore only ever lies
 * under the Mine that keeps it).
 */
export type ConsumableResourceV7 = Exclude<ResourceIdV7, "ORE">;

/**
 * What a used-up resource would have given, in population, for the
 * planner's and the Normal AI's weighing of a build: a Farm's 2 for Fertile
 * Ground, a harvest's 1 for Fruit, Game, or Fish, and for Pearls their 10
 * Coins at the AI's 5 points a population, 2. 0 for none.
 */
export function consumedResourcePopulationV7(
  resource: ConsumableResourceV7 | null,
): number {
  switch (resource) {
    case null:
      return 0;
    case "FERTILE_GROUND":
      return BASIC_ECONOMIC_ACTIONS_V7.BUILD_FARM.population;
    case "PEARLS":
      return Math.floor(GATHER_PEARLS_V7.coinsReceived / 5);
    case "FISH":
      return BASIC_ECONOMIC_ACTIONS_V7.HARVEST_FISH.population;
    default:
      return BASIC_ECONOMIC_ACTIONS_V7.HARVEST_FRUIT.population;
  }
}

/**
 * The Lumber Camp stands on Forest, never clears it, and needs no other
 * technology than its own Forestry; Game on the Forest no longer blocks it
 * (the camp uses the Game up).
 */
export function lumberCampResourceFitsV7(
  resource: ResourceIdV7 | "UNKNOWN_RESOURCE" | null,
): boolean {
  return resource === null || resource === "GAME";
}
