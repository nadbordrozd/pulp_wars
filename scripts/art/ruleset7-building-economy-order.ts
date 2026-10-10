export const RULESET7_BUILDING_ECONOMY_WORLD_IDS = [
  "building-square-barracks",
  "building-square-monument",
] as const;

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

/**
 * Barracks and Monument are generated one request at a time, Barracks
 * first. The Pillage and Disband icons this order once closed with are
 * retired (bead pulp_wars-67q.15).
 */
export function assertRuleset7BuildingEconomyOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selectedWorlds = recipes
    .map(({ id }) => id)
    .filter((id) =>
      RULESET7_BUILDING_ECONOMY_WORLD_IDS.includes(
        id as (typeof RULESET7_BUILDING_ECONOMY_WORLD_IDS)[number],
      ),
    );
  if (selectedWorlds.length === 0) return;
  if (recipes.length !== 1 || selectedWorlds.length !== 1)
    throw new Error(
      "Generate exactly one Ruleset 7 Barracks or Monument world asset per request",
    );
  if (
    selectedWorlds[0] === "building-square-monument" &&
    generated.records["building-square-barracks"] === undefined
  )
    throw new Error(
      "Record the Ruleset 7 Barracks request before generating Monument",
    );
}
