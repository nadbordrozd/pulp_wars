export const RULESET7_ORIGINAL_WORLD_IDS = [
  "unit-original-envoy",
  "unit-original-lancer",
  "unit-original-saboteur",
] as const;

export const RULESET7_ORIGINAL_PORTRAIT_IDS = [
  "portrait-original-envoy",
  "portrait-original-lancer",
  "portrait-original-saboteur",
] as const;

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

export function assertRuleset7OriginalUnitOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const worldIds = RULESET7_ORIGINAL_WORLD_IDS;
  const portraitIds = RULESET7_ORIGINAL_PORTRAIT_IDS;
  const selectedWorldIds = recipes
    .map(({ id }) => id)
    .filter((id) => worldIds.includes(id as (typeof worldIds)[number]));
  const selectedPortraitIds = recipes
    .map(({ id }) => id)
    .filter((id) => portraitIds.includes(id as (typeof portraitIds)[number]));

  if (selectedWorldIds.length > 0) {
    if (recipes.length !== selectedWorldIds.length)
      throw new Error(
        "Do not mix Ruleset 7 Original world sprites with unrelated generation families",
      );
    const initialTrioRecorded = worldIds.every(
      (id) => generated.records[id] !== undefined,
    );
    if (
      !initialTrioRecorded &&
      (selectedWorldIds.length !== worldIds.length ||
        worldIds.some((id) => !selectedWorldIds.includes(id)))
    )
      throw new Error(
        "The first Ruleset 7 Original sample call must select exactly Envoy, Lancer, and Saboteur",
      );
    return;
  }

  if (selectedPortraitIds.length > 0) {
    if (recipes.length !== selectedPortraitIds.length)
      throw new Error(
        "Do not mix Ruleset 7 Original portraits with unrelated generation families",
      );
    const missingWorlds = worldIds.filter(
      (id) => generated.records[id]?.status !== "ACCEPTED",
    );
    if (missingWorlds.length > 0)
      throw new Error(
        `Accept the Ruleset 7 Original world-sprite trio before deriving portraits: ${missingWorlds.join(", ")}`,
      );
    const initialPortraitTrioRecorded = portraitIds.every(
      (id) => generated.records[id] !== undefined,
    );
    if (
      !initialPortraitTrioRecorded &&
      (selectedPortraitIds.length !== portraitIds.length ||
        portraitIds.some((id) => !selectedPortraitIds.includes(id)))
    )
      throw new Error(
        "The first Ruleset 7 Original portrait call must select exactly the Envoy, Lancer, and Saboteur portrait trio",
      );
  }
}
