/**
 * The revision-9 world sprites that stay: Captain, then Knight. The
 * Shipyard, the three action icons and the two portraits this order also
 * gated are retired (bead pulp_wars-67q.15).
 */
export const RULESET7_REVISION9_SOURCE_IDS = [
  "unit-original-captain",
  "unit-original-knight",
] as const;

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

export function assertRuleset7Revision9ArtOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selected = recipes
    .map(({ id }) => id)
    .filter((id) =>
      RULESET7_REVISION9_SOURCE_IDS.includes(
        id as (typeof RULESET7_REVISION9_SOURCE_IDS)[number],
      ),
    );
  if (selected.length === 0) return;
  if (selected.length !== recipes.length)
    throw new Error(
      "Do not mix Ruleset 7 revision-9 art with unrelated generation families",
    );
  if (selected.length !== 1)
    throw new Error(
      "Generate Captain and Knight through separate individual gates",
    );
  const id = selected[0];
  const index = RULESET7_REVISION9_SOURCE_IDS.indexOf(
    id as (typeof RULESET7_REVISION9_SOURCE_IDS)[number],
  );
  const missing = RULESET7_REVISION9_SOURCE_IDS.slice(0, index).filter(
    (requiredId) => generated.records[requiredId]?.status !== "ACCEPTED",
  );
  if (missing.length > 0)
    throw new Error(
      `${id} requires accepted revision-9 source first: ${missing.join(", ")}`,
    );
}
