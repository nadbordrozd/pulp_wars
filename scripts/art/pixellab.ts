import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";

type ArtClass = "units" | "terrain" | "buildings" | "ui";
type Stage = "sample" | "batch";
type ReviewStatus = "CANDIDATE" | "ACCEPTED" | "REJECTED" | "FAILED";

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly class: ArtClass;
  readonly stage: Stage;
  readonly endpoint: "generate-image-v2" | "generate-ui-v2";
  readonly seed: number;
  readonly requestSize: Size;
  readonly outputSize: Size;
  readonly transparent: boolean;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly output: string;
  readonly hardBounds: Bounds;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly projectileOrigin?: { readonly x: number; readonly y: number };
  readonly palette?: string;
  readonly preferredBounds?: Bounds;
  readonly fitBounds?: Bounds;
  readonly postprocess?:
    | "diamond-mask"
    | "diamond-mask-reference-edges"
    | "reference-rotate-180-diamond"
    | "preferred-low-marker-fit"
    | "compact-building-fit"
    | "lanczos3-resize";
  readonly includeFactionLanguage?: boolean;
  readonly requestNoBackground?: boolean;
  readonly styleReference?: string;
  readonly styleReferenceUsage?: string;
}

interface RequestSnapshot {
  readonly endpoint: Recipe["endpoint"];
  readonly model: string;
  readonly description: string;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly requestSize: Size;
  readonly outputSize: Size;
  readonly seed: number;
  readonly noBackground: boolean;
  readonly palette?: string;
  readonly postprocess?: Recipe["postprocess"];
  readonly groundContactY?: number;
  readonly styleReference?: {
    readonly id: string;
    readonly sha256?: string;
    readonly usageDescription?: string;
  };
}

interface SourceManifest {
  readonly schemaVersion: number;
  readonly provider: {
    readonly apiBaseUrl: string;
    readonly credentialEnvironmentVariable: string;
    readonly model: string;
  };
  readonly shared: {
    readonly style: string;
    readonly negativePrompt: string;
    readonly factionLanguage: string;
    readonly palette: string;
  };
  readonly aliases?: readonly {
    readonly id: string;
    readonly source: string;
    readonly semanticRole: string;
    readonly notes: string;
  }[];
  readonly recipes: readonly Recipe[];
}

interface AlphaBounds extends Bounds {
  readonly empty: boolean;
}

interface GenerationRecord {
  readonly id: string;
  readonly status: ReviewStatus;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly hasAlpha?: boolean;
  readonly alphaBounds?: AlphaBounds;
  readonly notes?: string;
  readonly reviewedAt?: string;
  readonly request?: RequestSnapshot;
  readonly reviewChecks?: {
    readonly source: boolean;
    readonly native: boolean;
    readonly enlarged: boolean;
    readonly minimumZoom: boolean;
    readonly composition: boolean;
  };
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly notes?: string;
    readonly reviewedAt?: string;
    readonly request?: RequestSnapshot;
  }[];
}

interface GeneratedManifest {
  readonly schemaVersion: 1;
  readonly sourceManifestSha256: string;
  readonly records: Readonly<Record<string, GenerationRecord>>;
}

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "scripts/art/pixellab-manifest.json");
const GENERATED_PATH = path.join(ROOT, "scripts/art/pixellab-generated.json");
const ROAD_MASK_MANIFEST_PATH = path.join(
  ROOT,
  "scripts/art/road-masks.generated.json",
);
const CANDIDATE_ROOT = path.join(ROOT, "art/pixellab/candidates");
const QUARANTINE_ROOT = path.join(ROOT, "art/pixellab/quarantine");
const REVIEW_ROOT = path.join(ROOT, "art/pixellab/reviews");
const RUNTIME_PATH = path.join(ROOT, "src/assets/generated-art-manifest.ts");
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 12 * 60_000;

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  const sourceText = await readFile(SOURCE_PATH, "utf8");
  const source = JSON.parse(sourceText) as SourceManifest;
  validateSourceManifest(source, sourceText);
  const generated = await loadGenerated(sha256(Buffer.from(sourceText)));

  if (command === "credentials") {
    const name = source.provider.credentialEnvironmentVariable;
    console.log(`${name}: ${process.env[name] ? "configured" : "missing"}`);
    return;
  }
  if (command === "snapshot") {
    for (const recipe of source.recipes) {
      const record = generated.records[recipe.id];
      if (record === undefined || record.request !== undefined) continue;
      (generated.records as Record<string, GenerationRecord>)[recipe.id] = {
        ...record,
        request: requestSnapshot(source, recipe),
      };
    }
    await saveGenerated(generated);
    console.log(
      "Recorded exact request snapshots for existing generation records.",
    );
    return;
  }
  if (command === "generate") {
    const stage = requiredOption("--stage") as Stage;
    if (stage !== "sample" && stage !== "batch")
      throw new Error("--stage must be sample or batch");
    if (stage === "batch") assertSampleGate(source, generated);
    const ids = optionalOption("--ids")?.split(",").filter(Boolean);
    const recipes = source.recipes.filter(
      (recipe) =>
        recipe.stage === stage &&
        (ids === undefined || ids.includes(recipe.id)),
    );
    if (recipes.length === 0) throw new Error("No recipes selected");
    if (stage === "batch") assertBuildingBatchOrder(recipes, generated);
    const concurrency = Number(optionalOption("--concurrency") ?? "3");
    await generateRecipes(source, generated, recipes, concurrency);
    await saveGenerated(generated);
    await syncRuntime(source, generated);
    return;
  }
  if (command === "review") {
    await reviewCandidate(source, generated);
    await saveGenerated(generated);
    await syncRuntime(source, generated);
    await createReviewSheets(source, generated);
    return;
  }
  if (command === "repair") {
    const ids = requiredOption("--ids").split(",").filter(Boolean);
    for (const id of ids) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      if (recipe === undefined) throw new Error(`Unknown recipe ${id}`);
      const candidate = path.join(CANDIDATE_ROOT, `${id}.png`);
      if (recipe.postprocess?.startsWith("diamond-mask"))
        await applyDiamondAlpha(candidate, recipe.outputSize);
      else await normalizeToHardBounds(candidate, recipe);
      if (
        recipe.postprocess === "diamond-mask-reference-edges" &&
        recipe.styleReference !== undefined
      ) {
        const referenceRecipe = source.recipes.find(
          (entry) => entry.id === recipe.styleReference,
        );
        if (referenceRecipe === undefined)
          throw new Error(`Unknown edge reference ${recipe.styleReference}`);
        await restoreDiamondReferenceEdges(
          candidate,
          path.join(ROOT, referenceRecipe.output),
          recipe.outputSize,
        );
      }
      const inspection = await inspectPng(candidate);
      assertTechnical(recipe, inspection);
      if (recipe.postprocess?.startsWith("diamond-mask"))
        await assertDiamondAlpha(candidate, recipe.outputSize);
      (generated.records as Record<string, GenerationRecord>)[id] = {
        ...generated.records[id],
        id,
        status: "CANDIDATE",
        candidate: path.relative(ROOT, candidate).replaceAll("\\", "/"),
        candidateSha256: inspection.sha256,
        width: inspection.width,
        height: inspection.height,
        hasAlpha: inspection.hasAlpha,
        alphaBounds: inspection.alphaBounds,
        notes: recipe.postprocess?.startsWith("diamond-mask")
          ? "Deterministic supersampled diamond alpha mask applied by checked-in pipeline."
          : "Deterministic hard-bounds normalization applied by checked-in pipeline.",
        request:
          generated.records[id]?.request ?? requestSnapshot(source, recipe),
      };
      console.log(
        `${id}: repaired candidate (${inspection.sha256.slice(0, 12)})`,
      );
    }
    await saveGenerated(generated);
    return;
  }
  if (command === "derive") {
    const id = requiredOption("--id");
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (recipe === undefined) throw new Error(`Unknown recipe ${id}`);
    if (
      recipe.postprocess !== "reference-rotate-180-diamond" ||
      recipe.styleReference === undefined
    )
      throw new Error(`${id} is not a reference-derived recipe`);
    const referenceRecipe = source.recipes.find(
      (candidate) => candidate.id === recipe.styleReference,
    );
    if (referenceRecipe === undefined)
      throw new Error(`Unknown style reference ${recipe.styleReference}`);
    const reference = await readFile(path.join(ROOT, referenceRecipe.output));
    const candidate = path.join(CANDIDATE_ROOT, `${recipe.id}.png`);
    await mkdir(path.dirname(candidate), { recursive: true });
    await deriveRotatedDiamond(reference, recipe, candidate);
    const inspection = await inspectPng(candidate);
    assertTechnical(recipe, inspection);
    (generated.records as Record<string, GenerationRecord>)[id] = {
      id,
      status: "CANDIDATE",
      candidate: path.relative(ROOT, candidate).replaceAll("\\", "/"),
      candidateSha256: inspection.sha256,
      width: inspection.width,
      height: inspection.height,
      hasAlpha: inspection.hasAlpha,
      alphaBounds: inspection.alphaBounds,
      notes:
        "Deterministic 180-degree decoration variant derived from an accepted PixelLab source.",
      request: {
        ...requestSnapshot(source, recipe),
        styleReference: {
          id: recipe.styleReference,
          sha256: sha256(reference),
        },
      },
    };
    await saveGenerated(generated);
    console.log(`${id}: derived candidate (${inspection.sha256.slice(0, 12)})`);
    return;
  }
  if (command === "review-sheets") {
    await createReviewSheets(source, generated);
    return;
  }
  if (command === "validate") {
    await validateOutputs(source, generated);
    await syncRuntime(source, generated);
    console.log(
      "PixelLab source, generated manifest, and accepted outputs are valid.",
    );
    return;
  }
  console.log(
    "Usage: pixellab.ts credentials | snapshot | generate --stage sample|batch [--ids a,b] [--concurrency 3] | repair --ids a,b | derive --id ID | review --id ID --accept|--reject --notes TEXT [--source-pass --native-pass --enlarged-pass --minimum-pass --composition-pass] | review-sheets | validate",
  );
}

function validateSourceManifest(
  source: SourceManifest,
  sourceText: string,
): void {
  if (source.schemaVersion !== 1)
    throw new Error("Unsupported source manifest schema");
  if (source.provider.credentialEnvironmentVariable !== "PIXELLAB_API_KEY")
    throw new Error("Unexpected credential environment variable");
  if (
    /bearer\s+[A-Za-z0-9._-]{12,}|api[_-]?key\s*[:=]\s*["'][^"']+/i.test(
      sourceText,
    )
  )
    throw new Error("Possible credential embedded in source manifest");
  const ids = new Set<string>();
  const outputs = new Set<string>();
  for (const recipe of source.recipes) {
    if (ids.has(recipe.id)) throw new Error(`Duplicate recipe id ${recipe.id}`);
    if (outputs.has(recipe.output))
      throw new Error(`Duplicate output ${recipe.output}`);
    ids.add(recipe.id);
    outputs.add(recipe.output);
    if (!recipe.output.startsWith("public/assets/pixellab/"))
      throw new Error(
        `Output must stay under public/assets/pixellab: ${recipe.id}`,
      );
    if (recipe.prompt.length === 0 || recipe.negativePrompt.length === 0)
      throw new Error(`Prompt contract missing for ${recipe.id}`);
    if (requestSnapshot(source, recipe).description.length > 2_000)
      throw new Error(
        `PixelLab description exceeds 2000 characters for ${recipe.id}`,
      );
    if (recipe.seed < 0 || !Number.isInteger(recipe.seed))
      throw new Error(`Invalid seed for ${recipe.id}`);
    if (
      recipe.groundContactY !== undefined &&
      (!Number.isInteger(recipe.groundContactY) ||
        recipe.groundContactY < recipe.hardBounds.top ||
        recipe.groundContactY > recipe.hardBounds.bottom)
    )
      throw new Error(`Invalid ground contact for ${recipe.id}`);
    if (
      recipe.styleReference !== undefined &&
      !source.recipes.some(
        (candidate) => candidate.id === recipe.styleReference,
      )
    )
      throw new Error(
        `Unknown style reference ${recipe.styleReference} for ${recipe.id}`,
      );
    if (
      recipe.styleReferenceUsage !== undefined &&
      recipe.styleReference === undefined
    )
      throw new Error(
        `Style reference usage requires a style reference for ${recipe.id}`,
      );
  }
  for (const alias of source.aliases ?? []) {
    if (ids.has(alias.id))
      throw new Error(`Alias collides with recipe ${alias.id}`);
    if (!source.recipes.some((recipe) => recipe.id === alias.source))
      throw new Error(`Unknown alias source ${alias.source} for ${alias.id}`);
    if (
      alias.id.length === 0 ||
      alias.semanticRole.length === 0 ||
      alias.notes.length === 0
    )
      throw new Error(`Incomplete alias contract for ${alias.id}`);
    ids.add(alias.id);
  }
  for (const artClass of ["units", "terrain", "buildings", "ui"] as const) {
    const samples = source.recipes.filter(
      (recipe) => recipe.class === artClass && recipe.stage === "sample",
    );
    if (samples.length < 3)
      throw new Error(`${artClass} needs at least three sample recipes`);
  }
  const grassSamples = source.recipes.filter(
    (recipe) =>
      recipe.stage === "sample" && recipe.id.startsWith("terrain-grass-"),
  );
  const mountainSamples = source.recipes.filter(
    (recipe) =>
      recipe.stage === "sample" && recipe.id.startsWith("terrain-mountain-"),
  );
  if (grassSamples.length < 3 || mountainSamples.length < 3)
    throw new Error(
      "Terrain sample gate requires three grass and three mountain assets",
    );
  const forestSamples = source.recipes.filter(
    (recipe) =>
      recipe.stage === "sample" && recipe.id.startsWith("terrain-forest-"),
  );
  if (forestSamples.length < 3)
    throw new Error("Forest sample gate requires three canopy recipes");
  const candyTerrainIds = [
    "terrain-candy-grass-1",
    "terrain-candy-grass-2",
    "terrain-candy-grass-3",
    "terrain-candy-grass-4",
    "terrain-candy-mountain-1",
    "terrain-candy-mountain-2",
    "terrain-candy-mountain-3",
    "terrain-candy-forest-1",
    "terrain-candy-forest-2",
    "terrain-candy-forest-3",
    "terrain-candy-forest-4",
    "terrain-candy-fruit",
    "terrain-candy-animal",
  ] as const;
  const candySamples = source.recipes.filter(
    (recipe) =>
      candyTerrainIds.includes(recipe.id as (typeof candyTerrainIds)[number]) &&
      recipe.stage === "sample",
  );
  if (candySamples.length < 3)
    throw new Error(
      "Candy terrain needs at least three representative samples",
    );
  for (const id of candyTerrainIds) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (recipe === undefined)
      throw new Error(`Candy terrain recipe missing: ${id}`);
    if (
      recipe.styleReference === undefined ||
      recipe.styleReferenceUsage === undefined
    )
      throw new Error(`Candy terrain reference role missing: ${id}`);
    const ground = id.startsWith("terrain-candy-grass-");
    if (
      recipe.outputSize.width !== 256 ||
      recipe.outputSize.height !== (ground ? 148 : 296) ||
      recipe.anchor?.x !== 128 ||
      recipe.anchor.y !== (ground ? 74 : 222)
    )
      throw new Error(`Candy terrain geometry mismatch: ${id}`);
  }
  const candyCityContracts = [
    {
      id: "building-candy-city-1",
      anchor: { x: 192, y: 236 },
      groundContactY: 337,
      styleReference: "building-city-1",
    },
    {
      id: "building-candy-city-2",
      anchor: { x: 192, y: 243 },
      groundContactY: 344,
      styleReference: "building-candy-city-1",
    },
    {
      id: "building-candy-city-3",
      anchor: { x: 192, y: 243 },
      groundContactY: 344,
      styleReference: "building-candy-city-2",
    },
  ] as const;
  for (const contract of candyCityContracts) {
    const recipe = source.recipes.find(
      (candidate) => candidate.id === contract.id,
    );
    if (recipe === undefined)
      throw new Error(`Candy city recipe missing: ${contract.id}`);
    if (
      recipe.stage !== "sample" ||
      recipe.requestSize.width !== 384 ||
      recipe.requestSize.height !== 384 ||
      recipe.outputSize.width !== 384 ||
      recipe.outputSize.height !== 384 ||
      recipe.anchor?.x !== contract.anchor.x ||
      recipe.anchor.y !== contract.anchor.y ||
      recipe.groundContactY !== contract.groundContactY ||
      recipe.hardBounds.left !== 8 ||
      recipe.hardBounds.top !== 4 ||
      recipe.hardBounds.right !== 376 ||
      recipe.hardBounds.bottom !== 344
    )
      throw new Error(`Candy city geometry mismatch: ${contract.id}`);
    if (
      recipe.styleReference !== contract.styleReference ||
      recipe.styleReferenceUsage === undefined
    )
      throw new Error(`Candy city reference role mismatch: ${contract.id}`);
  }
  assertRecipeGeometry(source, "terrain-animal", {
    requestSize: { width: 256, height: 296 },
    outputSize: { width: 256, height: 296 },
    anchor: { x: 128, y: 222 },
    hardBounds: { left: 24, top: 84, right: 232, bottom: 252 },
  });
  assertRecipeGeometry(source, "terrain-fertile-ground", {
    requestSize: { width: 256, height: 296 },
    outputSize: { width: 256, height: 296 },
    anchor: { x: 128, y: 222 },
    hardBounds: { left: 32, top: 112, right: 224, bottom: 246 },
  });
  assertRecipeGeometry(source, "terrain-stone", {
    requestSize: { width: 256, height: 296 },
    outputSize: { width: 256, height: 296 },
    anchor: { x: 128, y: 222 },
    hardBounds: { left: 32, top: 112, right: 224, bottom: 246 },
  });
  assertRecipeGeometry(source, "terrain-road-material", {
    requestSize: { width: 256, height: 148 },
    outputSize: { width: 256, height: 148 },
    anchor: { x: 128, y: 74 },
    hardBounds: { left: 0, top: 0, right: 256, bottom: 148 },
  });
  for (const id of ["terrain-fertile-ground", "terrain-stone"] as const) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.postprocess !== "preferred-low-marker-fit" ||
      JSON.stringify(recipe.preferredBounds) !==
        JSON.stringify({ left: 56, top: 142, right: 200, bottom: 230 })
    )
      throw new Error(`Preferred low-marker bounds mismatch for ${id}`);
  }
  const gameAlias = source.aliases?.find(
    (alias) => alias.id === "terrain-game",
  );
  if (
    gameAlias?.source !== "terrain-animal" ||
    gameAlias.semanticRole !== "GAME"
  )
    throw new Error("Ruleset 6 GAME must explicitly alias terrain-animal");
  const economyAliases = new Map(
    (source.aliases ?? []).map((alias) => [alias.id, alias]),
  );
  if (
    economyAliases.get("building-ruleset6-mine")?.source !== "building-mine" ||
    economyAliases.get("building-ruleset6-mine")?.semanticRole !== "MINE"
  )
    throw new Error("Ruleset 6 Mine alias must reuse building-mine");
  if (
    economyAliases.get("building-lumber-camp")?.source !==
      "building-lumber-mill" ||
    economyAliases.get("building-lumber-camp")?.semanticRole !== "LUMBER_CAMP"
  )
    throw new Error(
      "Ruleset 6 Lumber Camp alias must reuse building-lumber-mill",
    );
  const economyBuildings = [
    "building-farm",
    "building-quarry",
    "building-windmill",
    "building-sawmill",
    "building-forge",
    "building-stoneworks",
    "building-workshop",
    "building-grand-works",
    "building-market",
  ] as const;
  for (const [index, id] of economyBuildings.entries()) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (recipe === undefined)
      throw new Error(`Economy building missing: ${id}`);
    const low = index < 2;
    if (
      recipe.class !== "buildings" ||
      recipe.stage !== (index < 3 ? "sample" : "batch") ||
      recipe.requestSize.width !== (low ? 256 : 384) ||
      recipe.requestSize.height !== (low ? 296 : 384) ||
      recipe.outputSize.width !== recipe.requestSize.width ||
      recipe.outputSize.height !== recipe.requestSize.height ||
      recipe.anchor?.x !== (low ? 128 : 192) ||
      recipe.anchor.y !== (low ? 222 : 288) ||
      recipe.groundContactY !== (low ? 222 : 288) ||
      recipe.postprocess !== "compact-building-fit" ||
      recipe.fitBounds === undefined ||
      recipe.preferredBounds === undefined
    )
      throw new Error(`Economy building geometry mismatch: ${id}`);
    if (
      !low &&
      JSON.stringify(recipe.preferredBounds) !==
        JSON.stringify({ left: 24, top: 24, right: 360, bottom: 326 })
    )
      throw new Error(`Processor preferred bounds mismatch: ${id}`);
    if (
      !low &&
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify({ left: 8, top: 8, right: 376, bottom: 344 })
    )
      throw new Error(`Processor hard bounds mismatch: ${id}`);
  }
  assertRecipeGeometry(source, "terrain-fruit", {
    requestSize: { width: 256, height: 296 },
    outputSize: { width: 256, height: 296 },
    anchor: { x: 128, y: 222 },
    hardBounds: { left: 52, top: 150, right: 204, bottom: 222 },
  });
  assertRecipeGeometry(source, "building-lumber-mill", {
    requestSize: { width: 256, height: 296 },
    outputSize: { width: 256, height: 296 },
    anchor: { x: 128, y: 222 },
    hardBounds: { left: 20, top: 12, right: 236, bottom: 252 },
  });
  assertRecipeGeometry(source, "unit-catapult", {
    requestSize: { width: 384, height: 384 },
    outputSize: { width: 384, height: 384 },
    anchor: { x: 192, y: 288 },
    hardBounds: { left: 16, top: 8, right: 368, bottom: 336 },
  });
}

function assertRecipeGeometry(
  source: SourceManifest,
  id: string,
  expected: Pick<
    Recipe,
    "requestSize" | "outputSize" | "anchor" | "hardBounds"
  >,
): void {
  const recipe = source.recipes.find((candidate) => candidate.id === id);
  if (recipe === undefined) throw new Error(`Required recipe missing: ${id}`);
  if (
    JSON.stringify(recipe.requestSize) !== JSON.stringify(expected.requestSize)
  )
    throw new Error(`Wrong request geometry for ${id}`);
  if (JSON.stringify(recipe.outputSize) !== JSON.stringify(expected.outputSize))
    throw new Error(`Wrong output geometry for ${id}`);
  if (JSON.stringify(recipe.anchor) !== JSON.stringify(expected.anchor))
    throw new Error(`Wrong anchor for ${id}`);
  if (JSON.stringify(recipe.hardBounds) !== JSON.stringify(expected.hardBounds))
    throw new Error(`Wrong hard bounds for ${id}`);
}

async function loadGenerated(
  sourceManifestSha256: string,
): Promise<GeneratedManifest> {
  try {
    const parsed = JSON.parse(
      await readFile(GENERATED_PATH, "utf8"),
    ) as GeneratedManifest;
    return { ...parsed, sourceManifestSha256 };
  } catch {
    return { schemaVersion: 1, sourceManifestSha256, records: {} };
  }
}

async function saveGenerated(generated: GeneratedManifest): Promise<void> {
  await mkdir(path.dirname(GENERATED_PATH), { recursive: true });
  await writeFile(
    GENERATED_PATH,
    `${JSON.stringify(generated, null, 2)}\n`,
    "utf8",
  );
}

function assertSampleGate(
  source: SourceManifest,
  generated: GeneratedManifest,
): void {
  const pending = source.recipes
    .filter((recipe) => recipe.stage === "sample")
    .filter((recipe) => generated.records[recipe.id]?.status !== "ACCEPTED")
    .map((recipe) => recipe.id);
  if (pending.length > 0)
    throw new Error(
      `Batch gate closed; accept every sample first: ${pending.join(", ")}`,
    );
}

function assertBuildingBatchOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const first = [
    "building-sawmill",
    "building-forge",
    "building-stoneworks",
  ] as const;
  const second = [
    "building-workshop",
    "building-grand-works",
    "building-market",
  ] as const;
  const selected = recipes
    .map((recipe) => recipe.id)
    .filter((id) => [...first, ...second].includes(id as never));
  if (selected.length === 0) return;
  if (selected.length > 3)
    throw new Error(
      "Economy building batches may contain at most three assets",
    );
  const inFirst = selected.every((id) => first.includes(id as never));
  const inSecond = selected.every((id) => second.includes(id as never));
  if (!inFirst && !inSecond)
    throw new Error("Do not mix the two coherent economy building batches");
  if (
    inSecond &&
    first.some((id) => generated.records[id]?.status !== "ACCEPTED")
  )
    throw new Error("Accept Sawmill, Forge, and Stoneworks before batch two");
}

async function generateRecipes(
  source: SourceManifest,
  generated: GeneratedManifest,
  recipes: readonly Recipe[],
  concurrency: number,
): Promise<void> {
  const credentialName = source.provider.credentialEnvironmentVariable;
  const apiKey = process.env[credentialName];
  if (!apiKey) throw new Error(`${credentialName} is missing`);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error("--concurrency must be an integer from 1 to 4");
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, recipes.length) },
    async () => {
      while (cursor < recipes.length) {
        const recipe = recipes[cursor];
        cursor += 1;
        if (recipe === undefined) return;
        if (generated.records[recipe.id]?.status === "ACCEPTED") {
          console.log(`${recipe.id}: already accepted, skipped`);
          continue;
        }
        try {
          const record = await generateOne(source, recipe, apiKey);
          const previous = generated.records[recipe.id];
          const rejectedAttempts = rejectedAttemptsFrom(previous);
          (generated.records as Record<string, GenerationRecord>)[recipe.id] =
            rejectedAttempts.length === 0
              ? record
              : { ...record, rejectedAttempts };
          await saveGenerated(generated);
        } catch (error) {
          const notes = error instanceof Error ? error.message : String(error);
          const request = requestSnapshot(source, recipe);
          const rejectedAttempts = rejectedAttemptsFrom(
            generated.records[recipe.id],
          );
          const referenceSha256 =
            recipe.styleReference === undefined
              ? undefined
              : generated.records[recipe.styleReference]?.outputSha256;
          (generated.records as Record<string, GenerationRecord>)[recipe.id] = {
            id: recipe.id,
            status: "FAILED",
            notes,
            request:
              recipe.styleReference === undefined
                ? request
                : {
                    ...request,
                    styleReference: {
                      id: recipe.styleReference,
                      ...(referenceSha256 === undefined
                        ? {}
                        : { sha256: referenceSha256 }),
                      ...(recipe.styleReferenceUsage === undefined
                        ? {}
                        : {
                            usageDescription: recipe.styleReferenceUsage,
                          }),
                    },
                  },
            ...(rejectedAttempts.length === 0 ? {} : { rejectedAttempts }),
          };
          await saveGenerated(generated);
          console.error(`${recipe.id}: failed: ${notes}`);
        }
      }
    },
  );
  await Promise.all(workers);
}

function rejectedAttemptsFrom(
  previous: GenerationRecord | undefined,
): NonNullable<GenerationRecord["rejectedAttempts"]> {
  const retained = [...(previous?.rejectedAttempts ?? [])];
  if (previous?.status === "REJECTED" && previous.candidate !== undefined) {
    retained.push({
      candidate: previous.candidate,
      ...(previous.candidateSha256 === undefined
        ? {}
        : { candidateSha256: previous.candidateSha256 }),
      ...(previous.notes === undefined ? {} : { notes: previous.notes }),
      ...(previous.reviewedAt === undefined
        ? {}
        : { reviewedAt: previous.reviewedAt }),
      ...(previous.request === undefined ? {} : { request: previous.request }),
    });
  }
  return retained;
}

async function generateOne(
  source: SourceManifest,
  recipe: Recipe,
  apiKey: string,
): Promise<GenerationRecord> {
  const request = requestSnapshot(source, recipe);
  let resolvedRequest = request;
  const body: Record<string, unknown> = {
    description: request.description,
    image_size: recipe.requestSize,
    no_background: request.noBackground,
    seed: recipe.seed,
  };
  if (recipe.styleReference !== undefined) {
    const referenceRecipe = source.recipes.find(
      (candidate) => candidate.id === recipe.styleReference,
    );
    if (referenceRecipe === undefined)
      throw new Error(`Unknown style reference ${recipe.styleReference}`);
    const reference = await readFile(path.join(ROOT, referenceRecipe.output));
    const referenceSha256 = sha256(reference);
    const referenceImage = {
      image: {
        base64: `data:image/png;base64,${reference.toString("base64")}`,
      },
      size: referenceRecipe.outputSize,
    };
    if (recipe.endpoint === "generate-ui-v2") {
      body.concept_image = referenceImage;
    } else {
      body.style_image = {
        ...referenceImage,
        usage_description:
          recipe.styleReferenceUsage ??
          "Copy only palette, outline thickness, shading simplicity and detail level; create the newly described silhouette.",
      };
      body.style_options = {
        color_palette: true,
        outline: true,
        detail: true,
        shading: true,
      };
    }
    resolvedRequest = {
      ...request,
      styleReference: {
        id: recipe.styleReference,
        sha256: referenceSha256,
        ...(recipe.styleReferenceUsage === undefined
          ? {}
          : { usageDescription: recipe.styleReferenceUsage }),
      },
    };
  }
  if (recipe.endpoint === "generate-ui-v2")
    body.color_palette = recipe.palette ?? source.shared.palette;
  const response = await fetch(
    `${source.provider.apiBaseUrl}/${recipe.endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok)
    throw new Error(
      `PixelLab POST returned HTTP ${response.status}: ${await safeError(response)}`,
    );
  const start = (await response.json()) as unknown;
  const jobId = readStringProperty(start, "background_job_id");
  if (jobId === null)
    throw new Error("PixelLab response did not contain background_job_id");
  console.log(`${recipe.id}: submitted job ${jobId}`);
  const result = await pollJob(source.provider.apiBaseUrl, apiKey, jobId);
  const encoded = findBase64Image(result);
  if (encoded === null)
    throw new Error("Completed PixelLab job contained no base64 image");
  const input = decodeBase64Image(encoded);
  const candidate = path.join(CANDIDATE_ROOT, `${recipe.id}.png`);
  await mkdir(path.dirname(candidate), { recursive: true });
  await processCandidate(input, recipe, candidate, source);
  const inspection = await inspectPng(candidate);
  assertTechnical(recipe, inspection);
  console.log(
    `${recipe.id}: candidate ready (${inspection.sha256.slice(0, 12)})`,
  );
  return {
    id: recipe.id,
    status: "CANDIDATE",
    jobId,
    candidate: path.relative(ROOT, candidate).replaceAll("\\", "/"),
    candidateSha256: inspection.sha256,
    providerOutputSha256: sha256(input),
    width: inspection.width,
    height: inspection.height,
    hasAlpha: inspection.hasAlpha,
    alphaBounds: inspection.alphaBounds,
    request: resolvedRequest,
  };
}

function requestSnapshot(
  source: SourceManifest,
  recipe: Recipe,
): RequestSnapshot {
  const description = [
    source.shared.style,
    (recipe.includeFactionLanguage ??
    (recipe.class === "units" ||
      recipe.class === "buildings" ||
      recipe.id === "ui-faction-hero"))
      ? source.shared.factionLanguage
      : "",
    `Palette: ${recipe.palette ?? source.shared.palette}.`,
    recipe.prompt,
    `Must not include: ${source.shared.negativePrompt}; ${recipe.negativePrompt}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    endpoint: recipe.endpoint,
    model: source.provider.model,
    description,
    prompt: recipe.prompt,
    negativePrompt: `${source.shared.negativePrompt}; ${recipe.negativePrompt}`,
    requestSize: recipe.requestSize,
    outputSize: recipe.outputSize,
    seed: recipe.seed,
    noBackground: recipe.requestNoBackground ?? recipe.transparent,
    ...(recipe.palette === undefined ? {} : { palette: recipe.palette }),
    ...(recipe.postprocess === undefined
      ? {}
      : { postprocess: recipe.postprocess }),
    ...(recipe.groundContactY === undefined
      ? {}
      : { groundContactY: recipe.groundContactY }),
    ...(recipe.styleReference === undefined
      ? {}
      : {
          styleReference: {
            id: recipe.styleReference,
            ...(recipe.styleReferenceUsage === undefined
              ? {}
              : { usageDescription: recipe.styleReferenceUsage }),
          },
        }),
  };
}

async function safeError(response: Response): Promise<string> {
  const text = (await response.text())
    .replaceAll(/[\r\n]+/g, " ")
    .replaceAll(
      /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi,
      "[image data redacted]",
    )
    .replaceAll(
      /\b(remaining|balance|credits?|resources?)\b\s*[:=]?\s*-?\d+(?:\.\d+)?/gi,
      "$1 [numeric value redacted]",
    )
    .slice(0, 300);
  return text.replaceAll(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

async function pollJob(
  baseUrl: string,
  apiKey: string,
  jobId: string,
): Promise<unknown> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    const response = await fetch(
      `${baseUrl}/background-jobs/${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    if (!response.ok)
      throw new Error(`PixelLab poll returned HTTP ${response.status}`);
    const result = (await response.json()) as unknown;
    const status = readStringProperty(result, "status");
    if (status === "completed")
      return readProperty(result, "last_response") ?? result;
    if (status === "failed") throw new Error("PixelLab background job failed");
  }
  throw new Error(`PixelLab job timed out after ${MAX_POLL_MS / 1000} seconds`);
}

function findBase64Image(value: unknown): string | null {
  if (typeof value === "string" && value.includes("base64,")) return value;
  if (typeof value !== "object" || value === null) return null;
  const direct = Reflect.get(value, "base64");
  if (typeof direct === "string" && direct.length > 100) return direct;
  for (const nested of Object.values(value)) {
    const found = findBase64Image(nested);
    if (found !== null) return found;
  }
  return null;
}

function decodeBase64Image(encoded: string): Buffer {
  const payload = encoded.includes("base64,")
    ? encoded.slice(encoded.indexOf("base64,") + 7)
    : encoded;
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length < 16)
    throw new Error("PixelLab returned an invalid image payload");
  return buffer;
}

async function processCandidate(
  input: Buffer,
  recipe: Recipe,
  destination: string,
  source: SourceManifest,
): Promise<void> {
  let pipeline = sharp(input)
    .ensureAlpha()
    .resize(recipe.outputSize.width, recipe.outputSize.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  if (
    recipe.postprocess === "diamond-mask" ||
    recipe.postprocess === "diamond-mask-reference-edges"
  ) {
    const { width, height } = recipe.outputSize;
    const mask = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}" fill="white"/></svg>`,
    );
    pipeline = pipeline.composite([{ input: mask, blend: "dest-in" }]);
    if (recipe.postprocess === "diamond-mask-reference-edges") {
      if (recipe.styleReference === undefined)
        throw new Error(
          `${recipe.id} reference-edge mask needs styleReference`,
        );
      const referenceRecipe = source.recipes.find(
        (candidate) => candidate.id === recipe.styleReference,
      );
      if (referenceRecipe === undefined)
        throw new Error(`Unknown edge reference ${recipe.styleReference}`);
      const edgeMask = Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}" fill="none" stroke="white" stroke-width="8"/></svg>`,
      );
      const referenceEdges = await sharp(
        path.join(ROOT, referenceRecipe.output),
      )
        .ensureAlpha()
        .resize(width, height, { fit: "fill" })
        .composite([{ input: edgeMask, blend: "dest-in" }])
        .png()
        .toBuffer();
      pipeline = pipeline.composite([{ input: referenceEdges, blend: "over" }]);
    }
  }
  await pipeline
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
  if (recipe.postprocess?.startsWith("diamond-mask")) {
    await applyDiamondAlpha(destination, recipe.outputSize);
    if (
      recipe.postprocess === "diamond-mask-reference-edges" &&
      recipe.styleReference !== undefined
    ) {
      const referenceRecipe = source.recipes.find(
        (candidate) => candidate.id === recipe.styleReference,
      );
      if (referenceRecipe === undefined)
        throw new Error(`Unknown edge reference ${recipe.styleReference}`);
      await restoreDiamondReferenceEdges(
        destination,
        path.join(ROOT, referenceRecipe.output),
        recipe.outputSize,
      );
    }
    await assertDiamondAlpha(destination, recipe.outputSize);
  } else await normalizeToHardBounds(destination, recipe);
}

async function deriveRotatedDiamond(
  reference: Buffer,
  recipe: Recipe,
  destination: string,
): Promise<void> {
  const { width, height } = recipe.outputSize;
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}" fill="white"/></svg>`,
  );
  await sharp(reference)
    .ensureAlpha()
    .resize(width, height, { fit: "fill" })
    .rotate(180)
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
  await applyDiamondAlpha(destination, recipe.outputSize);
  await assertDiamondAlpha(destination, recipe.outputSize);
}

async function applyDiamondAlpha(
  destination: string,
  size: Size,
): Promise<void> {
  const { data, info } = await sharp(destination)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const samples = 4;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          if (
            Math.abs(px - size.width / 2) / (size.width / 2) +
              Math.abs(py - size.height / 2) / (size.height / 2) <=
            1
          )
            covered += 1;
        }
      }
      const alphaIndex = (y * info.width + x) * 4 + 3;
      const original = data[alphaIndex] ?? 0;
      data[alphaIndex] = Math.round((original * covered) / (samples * samples));
      if (covered === 0) {
        data[alphaIndex - 3] = 0;
        data[alphaIndex - 2] = 0;
        data[alphaIndex - 1] = 0;
      }
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
}

async function assertDiamondAlpha(file: string, size: Size): Promise<void> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (const [x, y] of [
    [0, 0],
    [size.width - 1, 0],
    [0, size.height - 1],
    [size.width - 1, size.height - 1],
  ] as const) {
    if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 0)
      throw new Error(`Diamond mask leaves opaque corner ${x},${y}`);
  }
}

async function restoreDiamondReferenceEdges(
  destination: string,
  reference: string,
  size: Size,
): Promise<void> {
  const target = await sharp(destination)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const referencePixels = await sharp(reference)
    .ensureAlpha()
    .resize(size.width, size.height, { fit: "fill" })
    .raw()
    .toBuffer();
  // A broad source-scale band replaces provider matte and antialias RGB with
  // the accepted seam pixels. Candy accents are constrained to the quiet
  // interior, so this never removes authored gameplay-readable decoration.
  const normalizedBand = 20 / (size.height / 2);
  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const distance =
        Math.abs(x + 0.5 - size.width / 2) / (size.width / 2) +
        Math.abs(y + 0.5 - size.height / 2) / (size.height / 2);
      if (distance < 1 - normalizedBand) continue;
      const offset = (y * size.width + x) * 4;
      referencePixels.copy(target.data, offset, offset, offset + 4);
    }
  }
  await sharp(target.data, {
    raw: { width: size.width, height: size.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
}

async function normalizeToHardBounds(
  destination: string,
  recipe: Recipe,
): Promise<void> {
  let inspection = await inspectPng(destination);
  const targetBounds =
    recipe.postprocess === "preferred-low-marker-fit"
      ? (recipe.preferredBounds ?? recipe.hardBounds)
      : recipe.postprocess === "compact-building-fit"
        ? (recipe.fitBounds ?? recipe.preferredBounds ?? recipe.hardBounds)
        : recipe.hardBounds;
  const fitBounds =
    recipe.groundContactY === undefined
      ? targetBounds
      : { ...targetBounds, bottom: recipe.groundContactY };
  const alphaWidth = inspection.alphaBounds.right - inspection.alphaBounds.left;
  const alphaHeight =
    inspection.alphaBounds.bottom - inspection.alphaBounds.top;
  const hardWidth = fitBounds.right - fitBounds.left;
  const hardHeight = fitBounds.bottom - fitBounds.top;
  if (
    recipe.postprocess === "preferred-low-marker-fit" ||
    recipe.postprocess === "compact-building-fit" ||
    alphaWidth > hardWidth ||
    alphaHeight > hardHeight
  ) {
    const contained = await sharp(await readFile(destination))
      .trim({ background: "#00000000" })
      .resize({
        width: hardWidth,
        height: hardHeight,
        fit: "inside",
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
    const metadata = await sharp(contained).metadata();
    const containedWidth = metadata.width ?? hardWidth;
    const containedHeight = metadata.height ?? hardHeight;
    const left = fitBounds.left + Math.floor((hardWidth - containedWidth) / 2);
    const top = fitBounds.top + Math.floor((hardHeight - containedHeight) / 2);
    const canvas = await sharp({
      create: {
        width: recipe.outputSize.width,
        height: recipe.outputSize.height,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite([{ input: contained, left, top }])
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
    await writeFile(destination, canvas);
    inspection = await inspectPng(destination);
  }
  const shift = shiftIntoBounds(inspection.alphaBounds, targetBounds);
  if (shift.x !== 0 || shift.y !== 0)
    await translatePng(
      destination,
      recipe.outputSize.width,
      recipe.outputSize.height,
      shift.x,
      shift.y,
    );
  if (recipe.groundContactY !== undefined) {
    inspection = await inspectPng(destination);
    const groundShift = recipe.groundContactY - inspection.alphaBounds.bottom;
    const shiftedTop = inspection.alphaBounds.top + groundShift;
    const shiftedBottom = inspection.alphaBounds.bottom + groundShift;
    if (
      shiftedTop < recipe.hardBounds.top ||
      shiftedBottom > recipe.hardBounds.bottom
    )
      throw new Error(
        `${recipe.id} cannot align ground contact to y${recipe.groundContactY} within hard bounds`,
      );
    if (groundShift !== 0)
      await translatePng(
        destination,
        recipe.outputSize.width,
        recipe.outputSize.height,
        0,
        groundShift,
      );
  }
}

function shiftIntoBounds(
  alpha: AlphaBounds,
  hard: Bounds,
): { readonly x: number; readonly y: number } {
  if (alpha.right - alpha.left > hard.right - hard.left)
    throw new Error("Generated alpha is wider than the permitted hard bounds");
  if (alpha.bottom - alpha.top > hard.bottom - hard.top)
    throw new Error("Generated alpha is taller than the permitted hard bounds");
  let x = 0;
  let y = 0;
  if (alpha.left < hard.left) x = hard.left - alpha.left;
  if (alpha.right + x > hard.right) x += hard.right - (alpha.right + x);
  if (alpha.top < hard.top) y = hard.top - alpha.top;
  if (alpha.bottom + y > hard.bottom) y += hard.bottom - (alpha.bottom + y);
  return { x, y };
}

async function translatePng(
  file: string,
  width: number,
  height: number,
  x: number,
  y: number,
): Promise<void> {
  const input = await readFile(file);
  const sourceLeft = Math.max(0, -x);
  const sourceTop = Math.max(0, -y);
  const extracted = await sharp(input)
    .extract({
      left: sourceLeft,
      top: sourceTop,
      width: width - Math.abs(x),
      height: height - Math.abs(y),
    })
    .png()
    .toBuffer();
  const translated = await sharp({
    create: { width, height, channels: 4, background: "#00000000" },
  })
    .composite([
      {
        input: extracted,
        left: Math.max(0, x),
        top: Math.max(0, y),
      },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  await writeFile(file, translated);
}

interface PngInspection {
  readonly width: number;
  readonly height: number;
  readonly hasAlpha: boolean;
  readonly alphaBounds: AlphaBounds;
  readonly sha256: string;
}

async function inspectPng(file: string): Promise<PngInspection> {
  const data = await readFile(file);
  const { data: pixels, info } = await sharp(data)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = pixels[(y * info.width + x) * 4 + 3] ?? 0;
      if (alpha === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  const empty = right < 0;
  return {
    width: info.width,
    height: info.height,
    hasAlpha: info.channels === 4,
    alphaBounds: empty
      ? { left: 0, top: 0, right: 0, bottom: 0, empty: true }
      : { left, top, right, bottom, empty: false },
    sha256: sha256(data),
  };
}

function assertTechnical(recipe: Recipe, inspection: PngInspection): void {
  if (
    inspection.width !== recipe.outputSize.width ||
    inspection.height !== recipe.outputSize.height
  )
    throw new Error(
      `Wrong dimensions for ${recipe.id}: ${inspection.width}x${inspection.height}`,
    );
  if (recipe.transparent && !inspection.hasAlpha)
    throw new Error(`${recipe.id} lacks alpha`);
  if (inspection.alphaBounds.empty)
    throw new Error(`${recipe.id} is fully transparent`);
  const alpha = inspection.alphaBounds;
  const hard = recipe.hardBounds;
  if (
    alpha.left < hard.left ||
    alpha.top < hard.top ||
    alpha.right > hard.right ||
    alpha.bottom > hard.bottom
  )
    throw new Error(
      `${recipe.id} alpha bounds ${alpha.left},${alpha.top}..${alpha.right},${alpha.bottom} exceed ${hard.left},${hard.top}..${hard.right},${hard.bottom}`,
    );
}

async function reviewCandidate(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  const id = requiredOption("--id");
  const accept = process.argv.includes("--accept");
  const reject = process.argv.includes("--reject");
  if (accept === reject)
    throw new Error("Choose exactly one of --accept or --reject");
  const notes = requiredOption("--notes");
  const recipe = source.recipes.find((candidate) => candidate.id === id);
  if (recipe === undefined) throw new Error(`Unknown recipe ${id}`);
  const previous = generated.records[id];
  if (previous?.candidate === undefined)
    throw new Error(`${id} has no candidate`);
  const candidate = path.join(ROOT, previous.candidate);
  const inspection = await inspectPng(candidate);
  assertTechnical(recipe, inspection);
  if (accept) {
    const reviewChecks = {
      source: process.argv.includes("--source-pass"),
      native: process.argv.includes("--native-pass"),
      enlarged: process.argv.includes("--enlarged-pass"),
      minimumZoom: process.argv.includes("--minimum-pass"),
      composition: process.argv.includes("--composition-pass"),
    };
    if (Object.values(reviewChecks).some((passed) => !passed))
      throw new Error(
        "Acceptance requires source, native, enlarged, minimum-zoom, and composition review passes",
      );
    if (
      (id === "terrain-animal" || id === "building-lumber-mill") &&
      [1, 2, 3].some(
        (variant) =>
          generated.records[`terrain-forest-${variant}`]?.status !== "ACCEPTED",
      )
    )
      throw new Error(`${id} review requires three accepted Forest samples`);
    if (
      id === "terrain-fruit" &&
      ["terrain-fruit-attempt-1", "terrain-fruit-attempt-2"].some(
        (attemptId) => generated.records[attemptId]?.status !== "REJECTED",
      )
    )
      throw new Error(
        `${id} review requires two documented rejected iterations`,
      );
    const output = path.join(ROOT, recipe.output);
    await mkdir(path.dirname(output), { recursive: true });
    await copyFile(candidate, output);
    (generated.records as Record<string, GenerationRecord>)[id] = {
      ...previous,
      status: "ACCEPTED",
      outputSha256: inspection.sha256,
      notes,
      reviewedAt: new Date().toISOString(),
      reviewChecks,
    };
    console.log(`${id}: accepted and wired to ${recipe.output}`);
  } else {
    await mkdir(QUARANTINE_ROOT, { recursive: true });
    const quarantine = path.join(
      QUARANTINE_ROOT,
      `${id}-${inspection.sha256.slice(0, 12)}.png`,
    );
    await rename(candidate, quarantine);
    (generated.records as Record<string, GenerationRecord>)[id] = {
      ...previous,
      status: "REJECTED",
      candidate: path.relative(ROOT, quarantine).replaceAll("\\", "/"),
      notes,
      reviewedAt: new Date().toISOString(),
    };
    console.log(`${id}: rejected and quarantined`);
  }
}

async function validateOutputs(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  for (const recipe of source.recipes) {
    const record = generated.records[recipe.id];
    if (record?.status !== "ACCEPTED") continue;
    const inspection = await inspectPng(path.join(ROOT, recipe.output));
    assertTechnical(recipe, inspection);
    if (
      recipe.postprocess?.startsWith("diamond-mask") ||
      recipe.postprocess === "reference-rotate-180-diamond"
    )
      await assertDiamondAlpha(
        path.join(ROOT, recipe.output),
        recipe.outputSize,
      );
    if (inspection.sha256 !== record.outputSha256)
      throw new Error(`Hash mismatch for ${recipe.id}`);
  }
  for (const record of Object.values(generated.records)) {
    if (record.status !== "REJECTED") continue;
    const recipe = source.recipes.find(
      (candidate) => candidate.id === record.id,
    );
    if (recipe === undefined) continue;
    try {
      await stat(path.join(ROOT, recipe.output));
      throw new Error(`Rejected asset is wired: ${record.id}`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Rejected asset is wired")
      )
        throw error;
    }
  }
  if (generated.records["terrain-road-material"]?.status === "ACCEPTED")
    await validateRoadMasks(generated.records["terrain-road-material"]);
}

async function validateRoadMasks(
  sourceRecord: GenerationRecord,
): Promise<void> {
  const parsed = JSON.parse(
    await readFile(ROAD_MASK_MANIFEST_PATH, "utf8"),
  ) as {
    readonly schemaVersion: number;
    readonly algorithm: string;
    readonly deterministicProcessing: {
      readonly sourceSha256: string;
      readonly directionBitOrder: readonly string[];
      readonly emptySemantics: string;
      readonly diagonalSemantics: string;
    };
    readonly records: readonly {
      readonly id: string;
      readonly mask: number;
      readonly bits: string;
      readonly output: string;
      readonly sha256: string;
      readonly width: number;
      readonly height: number;
      readonly accepted: boolean;
    }[];
  };
  if (
    parsed.schemaVersion !== 1 ||
    parsed.algorithm !== "orthogonal-road-mask-v1" ||
    parsed.records.length !== 16 ||
    parsed.deterministicProcessing.sourceSha256 !== sourceRecord.outputSha256 ||
    JSON.stringify(parsed.deterministicProcessing.directionBitOrder) !==
      JSON.stringify(["NORTH", "EAST", "SOUTH", "WEST"]) ||
    !parsed.deterministicProcessing.emptySemantics.includes("isolated") ||
    !parsed.deterministicProcessing.diagonalSemantics.includes("No diagonal")
  )
    throw new Error("Road-mask deterministic manifest contract mismatch");
  for (let mask = 0; mask < 16; mask += 1) {
    const record = parsed.records[mask];
    const bits = mask.toString(2).padStart(4, "0");
    if (
      record?.id !== `terrain-road-mask-${bits}` ||
      record.mask !== mask ||
      record.bits !== bits ||
      record.width !== 256 ||
      record.height !== 148 ||
      !record.accepted
    )
      throw new Error(`Road-mask record mismatch: ${bits}`);
    const output = await readFile(path.join(ROOT, record.output));
    if (sha256(output) !== record.sha256)
      throw new Error(`Road-mask hash mismatch: ${bits}`);
  }
}

async function syncRuntime(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  const accepted = source.recipes.filter(
    (recipe) => generated.records[recipe.id]?.status === "ACCEPTED",
  );
  const acceptedAliases = (source.aliases ?? []).filter(
    (alias) => generated.records[alias.source]?.status === "ACCEPTED",
  );
  const acceptedRoadMasks =
    generated.records["terrain-road-material"]?.status === "ACCEPTED"
      ? Array.from({ length: 16 }, (_, mask) => {
          const bits = mask.toString(2).padStart(4, "0");
          return {
            id: `terrain-road-mask-${bits}`,
            output: `public/assets/pixellab/terrain/road-masks/road-mask-${bits}.png`,
          };
        })
      : [];
  const entries = [
    ...accepted.map((recipe) => ({ id: recipe.id, output: recipe.output })),
    ...acceptedAliases.map((alias) => {
      const recipe = source.recipes.find((entry) => entry.id === alias.source);
      if (recipe === undefined)
        throw new Error(`Unknown alias source ${alias.source}`);
      return { id: alias.id, output: recipe.output };
    }),
    ...acceptedRoadMasks,
  ]
    .map((recipe) => {
      const publicPath = recipe.output.replace(/^public\//, "");
      return `  ${JSON.stringify(recipe.id)}: publicArtUrl(${JSON.stringify(publicPath)}),`;
    })
    .join("\n");
  const aliasEntries = acceptedAliases
    .map(
      (alias) =>
        `  ${JSON.stringify(alias.id)}: ${JSON.stringify(alias.source)},`,
    )
    .join("\n");
  const attachmentEntries = accepted
    .filter((recipe) => recipe.projectileOrigin !== undefined)
    .map((recipe) => {
      const origin = recipe.projectileOrigin;
      if (origin === undefined) throw new Error("Missing projectile origin");
      return `  ${JSON.stringify(recipe.id)}: { projectileOrigin: { x: ${origin.x}, y: ${origin.y} } },`;
    })
    .join("\n");
  const content = `// Generated by scripts/art/pixellab.ts. Do not edit by hand.\n/// <reference types="vite/client" />\n\nfunction publicArtUrl(path: string): string {\n  return \`${"${import.meta.env.BASE_URL}"}${"${path}"}\`;\n}\n\nexport const ACCEPTED_ART_URLS: Readonly<Record<string, string>> = {\n${entries}\n};\n\nexport const ACCEPTED_ART_ALIASES: Readonly<Record<string, string>> = {\n${aliasEntries}\n};\n\nexport interface AcceptedArtAttachment {\n  readonly projectileOrigin?: { readonly x: number; readonly y: number };\n}\n\nexport const ACCEPTED_ART_ATTACHMENTS: Readonly<\n  Record<string, AcceptedArtAttachment>\n> = {\n${attachmentEntries}\n};\n\nexport const FACTION_HERO_URL = ACCEPTED_ART_URLS["ui-faction-hero"] ?? null;\nexport const FACTION_HERO_URLS = Object.freeze({\n  ORIGINAL: ACCEPTED_ART_URLS["ui-faction-hero"] ?? null,\n  CANDY: ACCEPTED_ART_URLS["ui-faction-candy-hero"] ?? null,\n});\nexport const FACTION_BADGE_URLS = Object.freeze({\n  ORIGINAL: null,\n  CANDY: ACCEPTED_ART_URLS["ui-faction-candy-badge"] ?? null,\n});\nexport const CANDY_ACTION_ART_URLS = Object.freeze({\n  KAMIKAZE_ROLL: ACCEPTED_ART_URLS["ui-action-kamikaze-roll"] ?? null,\n  BUILD_CHOCOLATE_WALL: ACCEPTED_ART_URLS["ui-action-build-chocolate-wall"] ?? null,\n  CANDIFY: ACCEPTED_ART_URLS["ui-action-candify"] ?? null,\n  CHOOSE_CANDIFY_CITY: ACCEPTED_ART_URLS["ui-action-choose-candify-city"] ?? null,\n});\n`;
  await mkdir(path.dirname(RUNTIME_PATH), { recursive: true });
  await writeFile(
    RUNTIME_PATH,
    await format(content, { parser: "typescript" }),
    "utf8",
  );
}

async function createReviewSheets(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  await mkdir(REVIEW_ROOT, { recursive: true });
  for (const artClass of ["units", "terrain", "buildings", "ui"] as const) {
    const recipes = source.recipes.filter(
      (recipe) =>
        recipe.class === artClass &&
        (generated.records[recipe.id]?.status === "ACCEPTED" ||
          generated.records[recipe.id]?.status === "CANDIDATE"),
    );
    if (recipes.length === 0) continue;
    const cells: OverlayOptions[] = [];
    const cellWidth = 300;
    const cellHeight = 340;
    const columns = Math.min(4, recipes.length);
    for (const [index, recipe] of recipes.entries()) {
      const record = generated.records[recipe.id];
      const sourceFile =
        record?.status === "ACCEPTED"
          ? recipe.output
          : (record?.candidate ?? recipe.output);
      const image = await sharp(path.join(ROOT, sourceFile))
        .resize({ width: 240, height: 240, fit: "contain" })
        .png()
        .toBuffer();
      const left = (index % columns) * cellWidth + 30;
      const top = Math.floor(index / columns) * cellHeight + 44;
      cells.push({ input: image, left, top });
      cells.push({
        input: Buffer.from(
          `<svg width="${cellWidth}" height="40" xmlns="http://www.w3.org/2000/svg"><text x="${cellWidth / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#f5efe2">${escapeXml(recipe.id)}</text></svg>`,
        ),
        left: (index % columns) * cellWidth,
        top: Math.floor(index / columns) * cellHeight,
      });
    }
    const rows = Math.ceil(recipes.length / columns);
    await sharp({
      create: {
        width: columns * cellWidth,
        height: rows * cellHeight,
        channels: 4,
        background: "#283c3b",
      },
    })
      .composite(cells)
      .png()
      .toFile(path.join(REVIEW_ROOT, `${artClass}-contact-sheet.png`));
  }
  await createFruitIterationReview(generated);
  await createFruitRepetitionReview(generated);
  await createMapReviewPng(source, generated);
  await createMapReviewHtml(source, generated);
  await createReviewEvidenceIndex();
}

async function createReviewEvidenceIndex(): Promise<void> {
  const names = [
    "units-contact-sheet.png",
    "terrain-contact-sheet.png",
    "buildings-contact-sheet.png",
    "ui-contact-sheet.png",
    "fruit-iteration-review.png",
    "fruit-repetition-review.png",
    "map-review.png",
    "map-review.html",
  ];
  const evidence: Array<{
    readonly path: string;
    readonly sha256: string;
    readonly bytes: number;
  }> = [];
  for (const name of names) {
    const file = path.join(REVIEW_ROOT, name);
    try {
      const data = await readFile(file);
      evidence.push({
        path: path.relative(ROOT, file).replaceAll("\\", "/"),
        sha256: sha256(data),
        bytes: data.byteLength,
      });
    } catch {
      // A class with no accepted or candidate output has no evidence file yet.
    }
  }
  await writeFile(
    path.join(REVIEW_ROOT, "review-evidence.json"),
    `${JSON.stringify({ schemaVersion: 1, evidence }, null, 2)}\n`,
    "utf8",
  );
}

async function createFruitIterationReview(
  generated: GeneratedManifest,
): Promise<void> {
  const ids = [
    "terrain-fruit-attempt-1",
    "terrain-fruit-attempt-2",
    "terrain-fruit",
  ] as const;
  const records = ids
    .map((id) => generated.records[id])
    .filter(
      (record): record is GenerationRecord => record?.candidate !== undefined,
    );
  if (records.length === 0) return;
  const grass = await sharp(
    path.join(ROOT, "public/assets/pixellab/terrain/grass-1.png"),
  )
    .resize({ width: 128, height: 74, fit: "fill" })
    .png()
    .toBuffer();
  const overlays: OverlayOptions[] = [];
  const columnWidth = 420;
  for (const [index, record] of records.entries()) {
    if (record.candidate === undefined) continue;
    const source = await readFile(path.join(ROOT, record.candidate));
    const sourcePreview = await sharp(source)
      .resize({ width: 192, height: 222, fit: "fill" })
      .png()
      .toBuffer();
    const enlarged = await sharp(source)
      .trim({ background: "#00000000" })
      .resize({
        width: 260,
        height: 220,
        fit: "contain",
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer();
    const native = await sharp(source)
      .resize({ width: 128, height: 148, fit: "fill" })
      .png()
      .toBuffer();
    const minimum = await sharp(source)
      .resize({ width: 96, height: 111, fit: "fill" })
      .png()
      .toBuffer();
    const left = index * columnWidth;
    overlays.push({
      input: Buffer.from(
        `<svg width="${columnWidth}" height="56" xmlns="http://www.w3.org/2000/svg"><text x="${columnWidth / 2}" y="24" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#f5efe2">${escapeXml(record.id)}</text><text x="${columnWidth / 2}" y="46" text-anchor="middle" font-family="sans-serif" font-size="15" fill="${record.status === "REJECTED" ? "#ff9b91" : "#8ee8cb"}">${record.status} · ${escapeXml((record.candidateSha256 ?? "").slice(0, 12))}</text></svg>`,
      ),
      left,
      top: 8,
    });
    overlays.push({ input: sourcePreview, left: left + 18, top: 76 });
    overlays.push({ input: enlarged, left: left + 150, top: 76 });
    overlays.push({
      input: Buffer.from(
        `<svg width="${columnWidth}" height="28" xmlns="http://www.w3.org/2000/svg"><text x="114" y="20" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#d5e2dc">source canvas</text><text x="290" y="20" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#d5e2dc">enlarged alpha</text></svg>`,
      ),
      left,
      top: 300,
    });
    overlays.push({ input: grass, left: left + 40, top: 412 });
    overlays.push({ input: native, left: left + 40, top: 338 });
    overlays.push({
      input: await sharp(grass)
        .resize({ width: 96, height: 56, fit: "fill" })
        .png()
        .toBuffer(),
      left: left + 250,
      top: 421,
    });
    overlays.push({ input: minimum, left: left + 250, top: 366 });
    overlays.push({
      input: Buffer.from(
        `<svg width="${columnWidth}" height="42" xmlns="http://www.w3.org/2000/svg"><text x="104" y="18" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#d5e2dc">native 1×</text><text x="298" y="18" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#d5e2dc">minimum 0.75×</text></svg>`,
      ),
      left,
      top: 494,
    });
  }
  await sharp({
    create: {
      width: records.length * columnWidth,
      height: 548,
      channels: 4,
      background: "#283c3b",
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(REVIEW_ROOT, "fruit-iteration-review.png"));
}

async function createFruitRepetitionReview(
  generated: GeneratedManifest,
): Promise<void> {
  const fruit = generated.records["terrain-fruit"];
  if (fruit?.candidate === undefined) return;
  const grass = await sharp(
    path.join(ROOT, "public/assets/pixellab/terrain/grass-2.png"),
  )
    .resize({ width: 128, height: 74, fit: "fill" })
    .png()
    .toBuffer();
  const marker = await sharp(path.join(ROOT, fruit.candidate))
    .resize({ width: 128, height: 148, fit: "fill" })
    .png()
    .toBuffer();
  const grounds: OverlayOptions[] = [];
  const markers: Array<{
    readonly depth: number;
    readonly overlay: OverlayOptions;
  }> = [];
  const origin = { x: 512, y: 104 };
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const center = mapReviewCenter(origin, x, y);
      grounds.push({ input: grass, left: center.x - 64, top: center.y - 37 });
      if ((x * 3 + y * 5) % 4 !== 0) continue;
      markers.push({
        depth: x + y,
        overlay: { input: marker, left: center.x - 64, top: center.y - 111 },
      });
    }
  }
  markers.sort((left, right) => left.depth - right.depth);
  const title = Buffer.from(
    '<svg width="1024" height="60" xmlns="http://www.w3.org/2000/svg"><text x="512" y="34" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#f5efe2">Fruit · repeated-map anchor and visual-noise review</text></svg>',
  );
  await sharp({
    create: { width: 1024, height: 680, channels: 4, background: "#233b39" },
  })
    .composite([
      { input: title, left: 0, top: 0 },
      ...grounds,
      ...markers.map(({ overlay }) => overlay),
    ])
    .png()
    .toFile(path.join(REVIEW_ROOT, "fruit-repetition-review.png"));
}

async function createMapReviewPng(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  const accepted = new Map(
    source.recipes
      .filter((recipe) => generated.records[recipe.id]?.status === "ACCEPTED")
      .map((recipe) => [recipe.id, recipe] as const),
  );
  const displayImages = new Map<string, Buffer>();
  const displayImage = async (id: string): Promise<Buffer | null> => {
    const existing = displayImages.get(id);
    if (existing !== undefined) return existing;
    const recipe = accepted.get(id);
    if (recipe === undefined) return null;
    const geometry = mapReviewGeometry(id);
    const rendered = await sharp(path.join(ROOT, recipe.output))
      .resize({ width: geometry.width, height: geometry.height, fit: "fill" })
      .png()
      .toBuffer();
    displayImages.set(id, rendered);
    return rendered;
  };

  const width = 1152;
  const height = 820;
  const origin = { x: 576, y: 160 };
  const grounds: OverlayOptions[] = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const id = `terrain-grass-${((x + y * 3) % 4) + 1}`;
      const image = await displayImage(id);
      if (image === null) continue;
      const center = mapReviewCenter(origin, x, y);
      grounds.push({ input: image, left: center.x - 64, top: center.y - 37 });
    }
  }

  const placements = [
    [0, 0, "terrain-forest-1"],
    [2, 0, "terrain-forest-2"],
    [4, 0, "terrain-forest-3"],
    [6, 0, "terrain-forest-4"],
    [1, 2, "terrain-animal"],
    [1, 2, "terrain-forest-1"],
    [4, 2, "terrain-fruit"],
    [3, 2, "building-lumber-mill"],
    [3, 2, "terrain-forest-2"],
    [5, 2, "unit-catapult"],
    [7, 2, "terrain-mountain-1"],
    [0, 4, "building-village"],
    [2, 4, "building-city-1"],
    [2, 4, "unit-warrior"],
    [4, 4, "terrain-mountain-2"],
    [6, 4, "building-city-2"],
    [6, 4, "unit-archer"],
    [1, 6, "building-mine"],
    [3, 6, "unit-defender"],
    [3, 6, "terrain-fruit"],
    [5, 6, "terrain-mountain-3"],
    [7, 6, "building-city-3"],
    [7, 6, "unit-rider"],
  ] as const;
  const bodies: Array<{
    readonly depth: number;
    readonly tie: number;
    readonly overlay: OverlayOptions;
  }> = [];
  for (const [x, y, id] of placements) {
    const image = await displayImage(id);
    if (image === null) continue;
    const center = mapReviewCenter(origin, x, y);
    const geometry = mapReviewGeometry(id);
    const city = id.startsWith("building-city-");
    const unit = id.startsWith("unit-");
    const forestAnimal = id === "terrain-animal";
    const lowBuilding = id === "building-mine" || id === "building-lumber-mill";
    bodies.push({
      depth: x + y,
      tie: lowBuilding ? 15 : forestAnimal ? 25 : city ? 30 : unit ? 40 : 20,
      overlay: {
        input: image,
        left: center.x - geometry.anchorX,
        top: center.y - geometry.anchorY,
      },
    });
  }
  bodies.sort(
    (left, right) => left.depth - right.depth || left.tie - right.tie,
  );
  const title = Buffer.from(
    '<svg width="1152" height="70" xmlns="http://www.w3.org/2000/svg"><text x="576" y="38" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="#f5efe2">Accepted art — 8 × 8 adjacency, anchor, overhang and depth review</text></svg>',
  );
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#233b39",
    },
  })
    .composite([
      { input: title, left: 0, top: 0 },
      ...grounds,
      ...bodies.map(({ overlay }) => overlay),
    ])
    .png()
    .toFile(path.join(REVIEW_ROOT, "map-review.png"));
}

function mapReviewGeometry(id: string): {
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
} {
  if (id === "unit-catapult")
    return { width: 115, height: 115, anchorX: 58, anchorY: 86 };
  if (id.startsWith("unit-"))
    return { width: 90, height: 104, anchorX: 45, anchorY: 78 };
  if (id.startsWith("building-city-")) {
    const anchorY = id === "building-city-1" ? 71 : 73;
    return { width: 115, height: 115, anchorX: 58, anchorY };
  }
  if (id === "building-village")
    return { width: 128, height: 148, anchorX: 64, anchorY: 88 };
  if (id === "terrain-mountain-3")
    return { width: 102, height: 118, anchorX: 51, anchorY: 74 };
  if (id.startsWith("terrain-mountain-"))
    return { width: 108, height: 124, anchorX: 54, anchorY: 75 };
  if (id.startsWith("terrain-grass-"))
    return { width: 128, height: 74, anchorX: 64, anchorY: 37 };
  return { width: 128, height: 148, anchorX: 64, anchorY: 111 };
}

function mapReviewCenter(
  origin: { readonly x: number; readonly y: number },
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  return {
    x: origin.x + (x - y) * 64,
    y: origin.y + (x + y) * 37,
  };
}

async function createMapReviewHtml(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  const acceptedCount = source.recipes.filter(
    (recipe) => generated.records[recipe.id]?.status === "ACCEPTED",
  ).length;
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pulp Wars accepted-art review</title><style>body{margin:0;background:#233b39;color:white;font:16px system-ui;text-align:center}main{padding:20px}img{display:block;width:min(1152px,100%);height:auto;margin:auto}p{color:#d7dfda}</style><main><h1>Accepted PixelLab art review</h1><p>${acceptedCount} accepted assets · generated map sheet at exact nominal renderer scale</p><img src="./map-review.png" alt="Eight by eight isometric Pulp Wars art integration review"></main>`;
  await writeFile(path.join(REVIEW_ROOT, "map-review.html"), html, "utf8");
}

function readProperty(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function readStringProperty(value: unknown, key: string): string | null {
  const found = readProperty(value, key);
  return typeof found === "string" ? found : null;
}

function requiredOption(name: string): string {
  const found = optionalOption(name);
  if (found === undefined) throw new Error(`Missing ${name}`);
  return found;
}

function optionalOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
