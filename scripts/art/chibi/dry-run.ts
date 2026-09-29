/**
 * Fixture dry run of the chibi production pipeline. Every step runs exactly
 * as in production (prompt layering, request body, receipts, candidate
 * sheets, review verdicts, master derivation, owner masks, QA, overrides)
 * except that the provider returns checked-in fixture sheets instead of
 * calling PixelLab. Outputs stay under art/pixellab/reviews/chibi-batch-N/dry-run/.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  acceptRecipe,
  assertValidManifest,
  dryRunLayout,
  fixtureProvider,
  generateRecipe,
  loadBatchManifest,
  loadFragments,
  loadRecords,
  rejectRecipe,
  type BatchRecords,
  type PipelineContext,
} from "./pipeline";

export const DRY_RUN_TIMESTAMP = "dry-run";

export async function runDryRun(
  root: string,
  batch: string,
  log: (line: string) => void = () => undefined,
): Promise<{
  readonly context: PipelineContext;
  readonly records: BatchRecords;
}> {
  const manifest = await loadBatchManifest(root, batch);
  if (!manifest.dryRun)
    throw new Error(`batch ${batch} is a production batch, not a dry run`);
  const fragments = await loadFragments(root);
  const layout = dryRunLayout(root, batch);
  const context: PipelineContext = {
    root,
    manifest,
    fragments,
    layout,
    provider: fixtureProvider(root),
    now: () => DRY_RUN_TIMESTAMP,
    log,
  };
  await assertValidManifest(context);
  // Start clean so the evidence is a pure function of the checked-in inputs.
  await rm(path.dirname(layout.records), { recursive: true, force: true });
  const mismatches: string[] = [];
  for (const recipe of manifest.recipes) {
    await generateRecipe(context, recipe.id);
    const review = recipe.dryRunReview;
    if (review === undefined) continue;
    if (review.verdict === "REJECT") {
      await rejectRecipe(context, recipe.id, review.notes);
      continue;
    }
    const record = await acceptRecipe(
      context,
      recipe.id,
      review.candidate ?? 0,
      review.notes,
      {
        native: true,
        enlarged: true,
        owners: true,
        noPlate: true,
        camera: true,
      },
    );
    if (review.expect !== undefined && record.status !== review.expect)
      mismatches.push(
        `${recipe.id}: expected ${review.expect}, got ${record.status}`,
      );
  }
  if (mismatches.length > 0)
    throw new Error(`Dry run outcomes differ:\n${mismatches.join("\n")}`);
  return { context, records: await loadRecords(layout, batch) };
}
