export const RULESET7_LOGISTICS_SOURCE_IDS = [
  "building-ruleset7-port-v7r11",
  "terrain-ruleset7-resource-fish-v7r11",
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
 * Revision 11 deliberately generates its two sources one at a time. Port is
 * reviewed first because Fish must later prove that it stays readable over
 * the accepted basin geometry.
 */
export function assertRuleset7LogisticsArtOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selected = recipes.map(({ id }) => id);
  const logisticsIds = new Set<string>(RULESET7_LOGISTICS_SOURCE_IDS);
  const selectedLogistics = selected.filter((id) => logisticsIds.has(id));
  if (selectedLogistics.length === 0) return;
  if (selectedLogistics.length !== recipes.length)
    throw new Error(
      "Do not mix Ruleset 7 revision-11 logistics art with unrelated generation families",
    );
  if (selectedLogistics.length !== 1)
    throw new Error("Generate and review each revision-11 source individually");

  if (
    selectedLogistics[0] === "terrain-ruleset7-resource-fish-v7r11" &&
    generated.records["building-ruleset7-port-v7r11"]?.status !== "ACCEPTED"
  )
    throw new Error(
      "Accept building-ruleset7-port-v7r11 before generating revision-11 Fish",
    );
}
