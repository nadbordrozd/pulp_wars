/**
 * Chibi production pipeline CLI (bead pulp_wars-67q.2). Usage:
 *
 *   npm run art:chibi -- plan --batch N
 *   npm run art:chibi -- prompts --batch N [--id RECIPE]
 *   npm run art:chibi -- generate --batch N --ids a,b      (PixelLab calls)
 *   npm run art:chibi -- accept --batch N --id RECIPE --candidate K
 *       --notes TEXT --native-pass --enlarged-pass --owners-pass
 *       --no-plate-pass --camera-pass [--asset VARIANT]
 *   npm run art:chibi -- reject --batch N --id RECIPE --notes TEXT
 *   npm run art:chibi -- registry --batch N
 *   npm run art:chibi -- bodies --batch N      (tall-terrain body layers)
 *   npm run art:chibi -- dry-run --batch 0
 *
 * Every command except `registry` and `dry-run` also takes
 * `--exploration art/explorations/<run>` in place of `--batch N`: an
 * exploration run (for example a TEST- faction) that keeps its manifest,
 * faction document, subjects, records, receipts and outputs in that
 * directory and never registers anything.
 *
 * Only `generate` calls PixelLab. The key is read from PIXELLAB_API_KEY and
 * is never printed. See docs/art/CHIBI_PIPELINE.md.
 */
import process from "node:process";
import {
  batchManifestProblems,
  findAsset,
  promptLayerChanges,
  requestSnapshot,
} from "./chibi/batch-manifest";
import { runDryRun } from "./chibi/dry-run";
import {
  acceptRecipe,
  assertValidManifest,
  explorationLayout,
  loadBatchManifest,
  loadExploration,
  loadFragments,
  loadRecords,
  pixelLabProvider,
  productionLayout,
  registryEntry,
  rejectRecipe,
  generateRecipe,
  writeTallTerrainBodies,
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

/** A production batch (--batch N) or an exploration run (--exploration DIR). */
async function runContext(withProvider: boolean): Promise<PipelineContext> {
  const exploration = option("--exploration");
  let run: Pick<PipelineContext, "manifest" | "fragments" | "layout">;
  if (exploration !== undefined && !exploration.startsWith("--")) {
    const loaded = await loadExploration(ROOT, exploration);
    run = {
      manifest: loaded.manifest,
      fragments: loaded.fragments,
      layout: explorationLayout(ROOT, loaded.directory),
    };
  } else {
    const batch = required("--batch");
    const manifest = await loadBatchManifest(ROOT, batch);
    if (manifest.dryRun)
      throw new Error(`batch ${batch} is a fixture dry run; use dry-run`);
    run = {
      manifest,
      fragments: await loadFragments(ROOT),
      layout: productionLayout(ROOT, batch),
    };
  }
  const context: PipelineContext = {
    root: ROOT,
    ...run,
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
    let manifest;
    let fragments;
    let records;
    if (option("--exploration") === undefined) {
      const batch = required("--batch");
      manifest = await loadBatchManifest(ROOT, batch);
      fragments = await loadFragments(ROOT);
      const problems = batchManifestProblems(manifest, fragments, batch);
      if (problems.length > 0) throw new Error(problems.join("\n"));
      records = manifest.dryRun
        ? undefined
        : await loadRecords(productionLayout(ROOT, batch), batch);
    } else {
      const context = await runContext(false);
      ({ manifest, fragments } = context);
      records = await loadRecords(context.layout, manifest.batch);
    }
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
        // A generated recipe shows the request it was generated with; the
        // live fragments apply only to recipes not yet generated.
        const live = requestSnapshot(fragments, manifest, recipe);
        const request = record?.request ?? live;
        for (const layer of request.layers)
          console.log(`  [${layer.layer}] ${layer.source}`);
        console.log(
          `  ${record === undefined ? "description" : "recorded description"}: ${request.description}`,
        );
        console.log(`  options: ${JSON.stringify(request.options)}`);
        if (record !== undefined) {
          const changed = promptLayerChanges(record.request, live);
          if (changed.length > 0)
            console.log(
              `  live fragments changed since generation: ${changed.join(", ")}`,
            );
        }
      }
    }
    return;
  }
  if (command === "generate") {
    const context = await runContext(true);
    const ids = required("--ids").split(",").filter(Boolean);
    for (const id of ids) await generateRecipe(context, id);
    return;
  }
  if (command === "accept") {
    const context = await runContext(false);
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
      option("--asset"),
    );
    return;
  }
  if (command === "reject") {
    const context = await runContext(false);
    await rejectRecipe(context, required("--id"), required("--notes"));
    return;
  }
  if (command === "bodies") {
    const context = await runContext(false);
    for (const file of await writeTallTerrainBodies(context))
      console.log(`wrote ${file}`);
    return;
  }
  if (command === "registry") {
    const batch = required("--batch");
    if (option("--exploration") !== undefined)
      throw new Error("exploration runs are never registered");
    const context = await runContext(false);
    const records = await loadRecords(context.layout, batch);
    for (const record of Object.values(records.assets))
      if (record.status === "ACCEPTED")
        console.log(
          registryEntry(findAsset(context.manifest, record.id), record),
        );
    return;
  }
  console.log(
    "Usage: chibi-pipeline.ts plan|prompts --batch N [--id R] | generate --batch N --ids a,b | accept --batch N --id R --candidate K --notes TEXT --native-pass --enlarged-pass --owners-pass --no-plate-pass --camera-pass | reject --batch N --id R --notes TEXT | registry --batch N | bodies --batch N | dry-run --batch 0; --exploration art/explorations/<run> replaces --batch N except for registry and dry-run",
  );
}

main().catch((error: unknown) => {
  // Never print raw error objects: HTTP client errors can carry headers.
  console.error(
    error instanceof Error ? error.message : "Chibi pipeline failed",
  );
  process.exitCode = 1;
});
