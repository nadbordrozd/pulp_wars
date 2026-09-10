export const RULESET7_REVISION3_HORSE_ARCHER_ID = "unit-original-horse-archer";
export const RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID =
  "portrait-original-horse-archer";
export const RULESET7_REVISION3_GRAVEL_ID = "terrain-ruleset7-revision3-gravel";

export const RULESET7_REVISION3_HORSE_ARCHER_GEOMETRY = Object.freeze({
  source: { width: 384, height: 384 },
  anchor: { x: 192, y: 288 },
  displayScale: 0.27,
  cosmeticOffsetY: 18,
});

export const RULESET7_REVISION3_MOUNTAIN_IDS = [1, 2, 3].map(
  (variant) => `terrain-ruleset7-revision3-mountain-${variant}`,
) as readonly string[];

export const RULESET7_REVISION3_MINED_MOUNTAIN_IDS = [1, 2, 3].map(
  (variant) => `terrain-ruleset7-revision3-mined-mountain-${variant}`,
) as readonly string[];

export const RULESET7_REVISION3_MOUNTAIN_RESTORATION = Object.freeze(
  Object.fromEntries(
    RULESET7_REVISION3_MOUNTAIN_IDS.map((mountainId, index) => [
      mountainId,
      RULESET7_REVISION3_MINED_MOUNTAIN_IDS[index],
    ]),
  ) as Readonly<Record<string, string>>,
);

interface SelectedRecipe {
  readonly id: string;
}

interface GenerationState {
  readonly records: Readonly<
    Record<string, { readonly status: string } | undefined>
  >;
}

export function assertRuleset7Revision3ArtOrder(
  recipes: readonly SelectedRecipe[],
  generated: GenerationState,
): void {
  const selectedIds = recipes.map(({ id }) => id);
  const revision3Ids = new Set([
    RULESET7_REVISION3_HORSE_ARCHER_ID,
    RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
    RULESET7_REVISION3_GRAVEL_ID,
    ...RULESET7_REVISION3_MOUNTAIN_IDS,
    ...RULESET7_REVISION3_MINED_MOUNTAIN_IDS,
  ]);
  const selectedRevision3 = selectedIds.filter((id) => revision3Ids.has(id));
  if (selectedRevision3.length === 0) return;
  if (selectedRevision3.length !== recipes.length)
    throw new Error(
      "Do not mix Ruleset 7 revision-3 art with unrelated generation families",
    );
  const boundedMinedPair =
    selectedRevision3.length === 2 &&
    selectedRevision3[0] === RULESET7_REVISION3_MINED_MOUNTAIN_IDS[1] &&
    selectedRevision3[1] === RULESET7_REVISION3_MINED_MOUNTAIN_IDS[2] &&
    generated.records[RULESET7_REVISION3_MINED_MOUNTAIN_IDS[0] ?? ""]
      ?.status === "ACCEPTED";
  if (selectedRevision3.length !== 1 && !boundedMinedPair)
    throw new Error(
      "Generate one revision-3 asset per call, except the guarded Mine 2 + Mine 3 pair",
    );

  const id = selectedRevision3[0] ?? "";
  if (RULESET7_REVISION3_MOUNTAIN_IDS.includes(id))
    throw new Error(
      `${id} is deterministic accepted-body derivation; use pixellab repair`,
    );
  if (
    id === RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID &&
    generated.records[RULESET7_REVISION3_HORSE_ARCHER_ID]?.status !== "ACCEPTED"
  )
    throw new Error(
      "Accept the revision-3 Horse Archer world sprite before deriving its portrait",
    );
  for (const minedId of selectedRevision3.filter((selectedId) =>
    RULESET7_REVISION3_MINED_MOUNTAIN_IDS.includes(selectedId),
  )) {
    const ordinal = RULESET7_REVISION3_MINED_MOUNTAIN_IDS.indexOf(minedId);
    const mountainId = RULESET7_REVISION3_MOUNTAIN_IDS[ordinal];
    if (
      generated.records[RULESET7_REVISION3_GRAVEL_ID]?.status !== "ACCEPTED" ||
      mountainId === undefined ||
      generated.records[mountainId]?.status !== "ACCEPTED"
    )
      throw new Error(
        `${minedId} requires its accepted revision-3 gravel and Mountain ${ordinal + 1} reference`,
      );
  }
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
