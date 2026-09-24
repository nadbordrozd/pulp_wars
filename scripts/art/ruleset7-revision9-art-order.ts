export const RULESET7_REVISION9_SOURCE_IDS = [
  "unit-original-captain",
  "unit-original-knight",
  "building-ruleset7-shipyard",
  "ui-action-rally-v7r9",
  "ui-action-cultivate-forest-v7r9",
  "ui-action-blast-mountain-v7r9",
] as const;

export const RULESET7_REVISION9_PORTRAIT_IDS = [
  "portrait-original-captain",
  "portrait-original-knight",
] as const;

export const RULESET7_REVISION9_UI_SAMPLE_IDS = [
  "ui-hud-coin",
  "ui-action-redevelop",
  "ui-tech-fieldcraft",
] as const;

const individualIds = RULESET7_REVISION9_SOURCE_IDS.slice(0, 3);
const actionIds = RULESET7_REVISION9_SOURCE_IDS.slice(3);

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
  const selected = recipes.map(({ id }) => id);
  const revision9Ids = new Set<string>([
    ...RULESET7_REVISION9_SOURCE_IDS,
    ...RULESET7_REVISION9_PORTRAIT_IDS,
  ]);
  const selectedRevision9 = selected.filter((id) => revision9Ids.has(id));
  if (selectedRevision9.length === 0) return;
  if (selectedRevision9.length !== recipes.length)
    throw new Error(
      "Do not mix Ruleset 7 revision-9 art with unrelated generation families",
    );

  const selectedIndividual = selectedRevision9.filter((id) =>
    individualIds.includes(id as (typeof individualIds)[number]),
  );
  if (selectedIndividual.length > 0 && selectedRevision9.length !== 1)
    throw new Error(
      "Generate Captain, Knight, and Shipyard through separate individual gates",
    );

  for (const id of selectedIndividual) {
    const index = individualIds.indexOf(id as (typeof individualIds)[number]);
    const missing = individualIds
      .slice(0, index)
      .filter((requiredId) =>
        requiredId.startsWith("building-")
          ? false
          : generated.records[requiredId]?.status !== "ACCEPTED",
      );
    if (missing.length > 0)
      throw new Error(
        `${id} requires accepted revision-9 source first: ${missing.join(", ")}`,
      );
  }

  const selectedActions = selectedRevision9.filter((id) =>
    actionIds.includes(id as (typeof actionIds)[number]),
  );
  if (selectedActions.length > 0) {
    if (
      selectedActions.length !== actionIds.length ||
      selectedActions.some((id, index) => id !== actionIds[index])
    )
      throw new Error(
        "Generate the complete Rally, Cultivate Forest, and Blast Mountain UI family in manifest order",
      );
    const missingSamples = RULESET7_REVISION9_UI_SAMPLE_IDS.filter(
      (id) => generated.records[id]?.status !== "ACCEPTED",
    );
    if (missingSamples.length > 0)
      throw new Error(
        `Revision-9 UI family requires established accepted UI samples: ${missingSamples.join(", ")}`,
      );
  }

  for (const portraitId of selectedRevision9.filter((id) =>
    RULESET7_REVISION9_PORTRAIT_IDS.includes(
      id as (typeof RULESET7_REVISION9_PORTRAIT_IDS)[number],
    ),
  )) {
    if (selectedRevision9.length !== 1)
      throw new Error("Derive each revision-9 portrait individually");
    const sourceId =
      portraitId === "portrait-original-captain"
        ? "unit-original-captain"
        : "unit-original-knight";
    if (generated.records[sourceId]?.status !== "ACCEPTED")
      throw new Error(`Accept ${sourceId} before deriving ${portraitId}`);
  }
}
