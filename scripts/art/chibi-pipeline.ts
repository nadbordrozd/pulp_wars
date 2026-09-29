/**
 * Chibi production pipeline CLI (bead pulp_wars-67q.2). Usage:
 *
 *   npm run art:chibi -- plan --batch N
 *   npm run art:chibi -- prompts --batch N [--id RECIPE]
 *   npm run art:chibi -- generate --batch N --ids a,b      (PixelLab calls)
 *   npm run art:chibi -- accept --batch N --id RECIPE --candidate K
 *       --notes TEXT --native-pass --enlarged-pass --owners-pass
 *       --no-plate-pass --camera-pass
 *   npm run art:chibi -- reject --batch N --id RECIPE --notes TEXT
 *   npm run art:chibi -- registry --batch N
 *   npm run art:chibi -- dry-run --batch 0
 *
 * Only `generate` calls PixelLab. The key is read from PIXELLAB_API_KEY and
 * is never printed. See docs/art/CHIBI_PIPELINE.md.
 */
import process from "node:process";
import {
  batchManifestProblems,
  findAsset,
  requestSnapshot,
} from "./chibi/batch-manifest";
import { runDryRun } from "./chibi/dry-run";
import {
  acceptRecipe,
  assertValidManifest,
  loadBatchManifest,
  loadFragments,
  loadRecords,
  pixelLabProvider,
  productionLayout,
  registryEntry,
  rejectRecipe,
  generateRecipe,
  type PipelineContext,
} from "./chibi/pipeline";

const ROOT = process.cwd();

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function required(name: string): string {
  const value = option(name);
  if (value === undefined || value.startsWith("--"))
    throw new Error(`${name} is required`);
  return value;
}

async function productionContext(
  batch: string,
  withProvider: boolean,
): Promise<PipelineContext> {
  const manifest = await loadBatchManifest(ROOT, batch);
  if (manifest.dryRun)
    throw new Error(`batch ${batch} is a fixture dry run; use dry-run`);
  const fragments = await loadFragments(ROOT);
  const context: PipelineContext = {
    root: ROOT,
    manifest,
    fragments,
    layout: productionLayout(ROOT, batch),
    provider: withProvider
      ? pixelLabProvider()
      : {
          kind: "PIXELLAB",
          generate: () => Promise.reject(new Error("no provider")),
        },
    now: () => new Date().toISOString(),
    log: (line) => console.log(line),
  };
  await assertValidManifest(context);
  return context;
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  if (command === "dry-run") {
    const batch = required("--batch");
    const { records } = await runDryRun(ROOT, batch, (line) =>
      console.log(line),
    );
    console.log(
      `Dry run of batch ${batch} passed: ${Object.values(records.assets)
        .map((asset) => `${asset.id} ${asset.status}`)
        .join(", ")}`,
    );
    return;
  }
  if (command === "plan" || command === "prompts") {
    const batch = required("--batch");
    const manifest = await loadBatchManifest(ROOT, batch);
    const fragments = await loadFragments(ROOT);
    const problems = batchManifestProblems(manifest, fragments, batch);
    if (problems.length > 0) throw new Error(problems.join("\n"));
    const records = manifest.dryRun
      ? undefined
      : await loadRecords(productionLayout(ROOT, batch), batch);
    const only = option("--id");
    for (const recipe of manifest.recipes) {
      if (only !== undefined && recipe.id !== only) continue;
      const record = records?.recipes[recipe.id];
      const state =
        record === undefined
          ? "PENDING"
          : (record.review?.verdict ??
            (record.rawSheet === undefined ? "SUBMITTED" : "TO-REVIEW"));
      console.log(
        `${state.padEnd(10)} ${recipe.id} -> ${recipe.asset} (${recipe.endpoint} ${recipe.requestSize.width}x${recipe.requestSize.height} seed ${recipe.seed})`,
      );
      if (command === "prompts") {
        const request = requestSnapshot(fragments, manifest, recipe);
        for (const layer of request.layers)
          console.log(`  [${layer.layer}] ${layer.source}`);
        console.log(`  description: ${request.description}`);
        console.log(`  options: ${JSON.stringify(request.options)}`);
      }
    }
    return;
  }
  if (command === "generate") {
    const context = await productionContext(required("--batch"), true);
    const ids = required("--ids").split(",").filter(Boolean);
    for (const id of ids) await generateRecipe(context, id);
    return;
  }
  if (command === "accept") {
    const context = await productionContext(required("--batch"), false);
    await acceptRecipe(
      context,
      required("--id"),
      Number.parseInt(required("--candidate"), 10),
      required("--notes"),
      {
        native: process.argv.includes("--native-pass"),
        enlarged: process.argv.includes("--enlarged-pass"),
        owners: process.argv.includes("--owners-pass"),
        noPlate: process.argv.includes("--no-plate-pass"),
        camera: process.argv.includes("--camera-pass"),
      },
    );
    return;
  }
  if (command === "reject") {
    const context = await productionContext(required("--batch"), false);
    await rejectRecipe(context, required("--id"), required("--notes"));
    return;
  }
  if (command === "registry") {
    const batch = required("--batch");
    const context = await productionContext(batch, false);
    const records = await loadRecords(context.layout, batch);
    for (const record of Object.values(records.assets))
      if (record.status === "ACCEPTED")
        console.log(
          registryEntry(findAsset(context.manifest, record.id), record),
        );
    return;
  }
  console.log(
    "Usage: chibi-pipeline.ts plan|prompts --batch N [--id R] | generate --batch N --ids a,b | accept --batch N --id R --candidate K --notes TEXT --native-pass --enlarged-pass --owners-pass --no-plate-pass --camera-pass | reject --batch N --id R --notes TEXT | registry --batch N | dry-run --batch 0",
  );
}

main().catch((error: unknown) => {
  // Never print raw error objects: HTTP client errors can carry headers.
  console.error(
    error instanceof Error ? error.message : "Chibi pipeline failed",
  );
  process.exitCode = 1;
});
