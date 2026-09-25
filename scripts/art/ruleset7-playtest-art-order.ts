export const RULESET7_PLAYTEST_CAPTAIN_ID =
  "unit-original-captain-v7r10" as const;

export const RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID =
  "portrait-original-captain-v7r10" as const;

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

export function assertRuleset7PlaytestArtOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selected = recipes
    .map(({ id }) => id)
    .filter(
      (id) =>
        id === RULESET7_PLAYTEST_CAPTAIN_ID ||
        id === RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
    );
  if (selected.length === 0) return;
  if (recipes.length !== 1)
    throw new Error(
      "Generate or derive each Ruleset 7 playtest Captain asset individually",
    );
  if (
    selected[0] === RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID &&
    generated.records[RULESET7_PLAYTEST_CAPTAIN_ID]?.status !== "ACCEPTED"
  )
    throw new Error(
      `Accept ${RULESET7_PLAYTEST_CAPTAIN_ID} before deriving ${RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID}`,
    );
}
