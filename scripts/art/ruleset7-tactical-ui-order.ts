export const RULESET7_TACTICAL_UI_ACTION_IDS = [
  "ui-action-defection",
  "ui-action-blackout",
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
 * Keeps the initial tactical request an exact pair while allowing a rejected
 * member to be retried alone without regenerating its accepted peer.
 */
export function assertRuleset7TacticalUiOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selected = recipes
    .map(({ id }) => id)
    .filter((id) =>
      RULESET7_TACTICAL_UI_ACTION_IDS.includes(
        id as (typeof RULESET7_TACTICAL_UI_ACTION_IDS)[number],
      ),
    );
  if (selected.length === 0) return;
  if (selected.length !== recipes.length)
    throw new Error(
      "Do not mix Ruleset 7 tactical action icons with unrelated generation families",
    );

  const initialPairRecorded = RULESET7_TACTICAL_UI_ACTION_IDS.every(
    (id) => generated.records[id] !== undefined,
  );
  if (!initialPairRecorded) {
    if (
      selected.length !== RULESET7_TACTICAL_UI_ACTION_IDS.length ||
      selected.some(
        (id, index) => id !== RULESET7_TACTICAL_UI_ACTION_IDS[index],
      )
    )
      throw new Error(
        "The first tactical action request must select exactly Defection and Blackout in manifest order",
      );
    return;
  }

  for (const id of selected) {
    if (generated.records[id]?.status === "ACCEPTED")
      throw new Error(`Do not regenerate accepted tactical action icon: ${id}`);
  }
}
