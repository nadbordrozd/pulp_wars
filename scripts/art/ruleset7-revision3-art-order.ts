export const RULESET7_REVISION3_HORSE_ARCHER_ID = "unit-original-horse-archer";
export const RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID =
  "portrait-original-horse-archer";

export const RULESET7_REVISION3_HORSE_ARCHER_GEOMETRY = Object.freeze({
  source: { width: 384, height: 384 },
  anchor: { x: 192, y: 288 },
  displayScale: 0.27,
  cosmeticOffsetY: 18,
});

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

/**
 * The revision-3 Horse Archer is generated alone and before its portrait.
 * The gravel ground and the Mountains this order also gated are retired
 * (bead pulp_wars-67q.15).
 */
export function assertRuleset7Revision3ArtOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selectedIds = recipes.map(({ id }) => id);
  const selectedRevision3 = selectedIds.filter(
    (id) =>
      id === RULESET7_REVISION3_HORSE_ARCHER_ID ||
      id === RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
  );
  if (selectedRevision3.length === 0) return;
  if (selectedRevision3.length !== recipes.length)
    throw new Error(
      "Do not mix Ruleset 7 revision-3 art with unrelated generation families",
    );
  if (selectedRevision3.length !== 1)
    throw new Error("Generate one revision-3 asset per call");
  if (
    selectedRevision3[0] === RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID &&
    generated.records[RULESET7_REVISION3_HORSE_ARCHER_ID]?.status !== "ACCEPTED"
  )
    throw new Error(
      "Accept the revision-3 Horse Archer world sprite before deriving its portrait",
    );
}

export function resolveRepairStyleReferenceHash(
  currentId: string,
  previous: { readonly id: string; readonly sha256?: string } | undefined,
  generatedHash: string | undefined,
): string | undefined {
  return previous?.id === currentId
    ? (previous.sha256 ?? generatedHash)
    : generatedHash;
}
