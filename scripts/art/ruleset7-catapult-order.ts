export const RULESET7_CATAPULT_WORLD_ID = "unit-original-catapult";
export const RULESET7_CATAPULT_PORTRAIT_ID = "portrait-original-catapult";

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

export function assertRuleset7CatapultOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selectedCatapultIds = recipes
    .map(({ id }) => id)
    .filter(
      (id) =>
        id === RULESET7_CATAPULT_WORLD_ID ||
        id === RULESET7_CATAPULT_PORTRAIT_ID,
    );
  if (selectedCatapultIds.length === 0) return;
  if (selectedCatapultIds.length !== 1)
    throw new Error(
      "Generate or derive exactly one Ruleset 7 Catapult asset per call",
    );
  if (recipes.length !== 1)
    throw new Error(
      "Do not mix the Ruleset 7 Catapult gate with unrelated generation families",
    );
  if (
    selectedCatapultIds.includes(RULESET7_CATAPULT_PORTRAIT_ID) &&
    generated.records[RULESET7_CATAPULT_WORLD_ID]?.status !== "ACCEPTED"
  )
    throw new Error(
      "Accept the Ruleset 7 Catapult world sample before deriving its portrait",
    );
}
