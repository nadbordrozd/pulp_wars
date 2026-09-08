export const RULESET7_BUILDING_ECONOMY_WORLD_IDS = [
  "building-square-barracks",
  "building-square-monument",
] as const;

export const RULESET7_BUILDING_ECONOMY_ACTION_IDS = [
  "ui-action-pillage",
  "ui-action-disband",
] as const;

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

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
  const selectedActions = recipes
    .map(({ id }) => id)
    .filter((id) =>
      RULESET7_BUILDING_ECONOMY_ACTION_IDS.includes(
        id as (typeof RULESET7_BUILDING_ECONOMY_ACTION_IDS)[number],
      ),
    );

  if (selectedWorlds.length > 0) {
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
    return;
  }

  if (selectedActions.length === 0) return;
  if (recipes.length !== selectedActions.length)
    throw new Error(
      "Do not mix Ruleset 7 conflict-economy icons with unrelated generation families",
    );
  const missingWorlds = RULESET7_BUILDING_ECONOMY_WORLD_IDS.filter(
    (id) => generated.records[id]?.status !== "ACCEPTED",
  );
  if (missingWorlds.length > 0)
    throw new Error(
      `Accept both Ruleset 7 world buildings before action icons: ${missingWorlds.join(", ")}`,
    );
  const initialPairRecorded = RULESET7_BUILDING_ECONOMY_ACTION_IDS.every(
    (id) => generated.records[id] !== undefined,
  );
  if (
    !initialPairRecorded &&
    (selectedActions.length !== RULESET7_BUILDING_ECONOMY_ACTION_IDS.length ||
      selectedActions.some(
        (id, index) => id !== RULESET7_BUILDING_ECONOMY_ACTION_IDS[index],
      ))
  )
    throw new Error(
      "The first conflict-economy icon request must select exactly Pillage and Disband in manifest order",
    );
}
