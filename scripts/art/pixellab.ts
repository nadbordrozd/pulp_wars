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
  /** Deterministic source-canvas translation after fitting and ground alignment. */
  readonly fitOffsetX?: number;
  /** Deterministic downward translation of a tall terrain body before ground composition. */
  readonly bodyOffsetY?: number;
  /** Immutable accepted source used when reframing an already-produced body. */
  readonly reframeSource?: string;
  readonly reframeSourceSha256?: string;
  /** Exact owning square in source pixels for square-grid terrain recipes. */
  readonly squareFootprint?: Bounds;
  /** Accepted square ground composited beneath a tall terrain candidate. */
  readonly groundReference?: string;
  readonly postprocess?:
    | "diamond-mask"
    | "diamond-mask-reference-edges"
    | "reference-rotate-180-diamond"
    | "preferred-low-marker-fit"
    | "compact-building-fit"
    | "unit-fit"
    | "sprite-derived-portrait"
    | "lanczos3-resize"
    | "square-ground-fill"
    | "square-farm-fill"
    | "square-road-material"
    | "square-tall-ground-reference"
    | "square-mountain-ground-reference";
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
  readonly fitOffsetX?: number;
  readonly bodyOffsetY?: number;
  readonly styleReference?: {
    readonly id: string;
    readonly sha256?: string;
    readonly usageDescription?: string;
  };
  readonly squareFootprint?: Bounds;
  readonly groundReference?: {
    readonly id: string;
    readonly sha256?: string;
    readonly usageDescription: string;
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
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly disposition?: "REJECTED" | "SUPERSEDED_DUPLICATE";
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
const SQUARE_ROAD_MASK_MANIFEST_PATH = path.join(
  ROOT,
  "scripts/art/square-road-masks.generated.json",
);
const CANDIDATE_ROOT = path.join(ROOT, "art/pixellab/candidates");
const QUARANTINE_ROOT = path.join(ROOT, "art/pixellab/quarantine");
const REVIEW_ROOT = path.join(ROOT, "art/pixellab/reviews");
const RUNTIME_PATH = path.join(ROOT, "src/assets/generated-art-manifest.ts");
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 12 * 60_000;
let generatedSaveChain: Promise<void> = Promise.resolve();

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
    assertOriginalUnitOrder(recipes, generated);
    assertCandyUnitOrder(recipes, generated);
    assertRuleset6UiOrder(recipes, generated);
    assertSquareTerrainOrder(recipes, generated);
    assertSquareResourceRoadOrder(recipes, generated);
    assertSquareImprovementSampleGate(recipes);
    assertSquareImprovementExpansionOrder(recipes, generated);
    assertSquareCivicCommerceOrder(recipes, generated);
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
      if (
        recipe.postprocess === "square-mountain-ground-reference" &&
        recipe.reframeSource !== undefined
      ) {
        await reframeAcceptedSquareMountain(candidate, recipe, source);
      } else if (recipe.postprocess?.startsWith("diamond-mask"))
        await applyDiamondAlpha(candidate, recipe.outputSize);
      else if (recipe.postprocess === "square-ground-fill")
        await applySquareGroundFill(candidate, recipe);
      else if (recipe.postprocess === "square-farm-fill")
        await applySquareFarmFill(candidate, recipe);
      else if (recipe.postprocess === "square-road-material")
        await applySquareRoadMaterial(candidate, recipe);
      else if (
        recipe.postprocess === "square-tall-ground-reference" ||
        recipe.postprocess === "square-mountain-ground-reference"
      )
        await applySquareTallGroundReference(candidate, recipe, source);
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
      else if (
        recipe.postprocess === "square-ground-fill" ||
        recipe.postprocess === "square-farm-fill" ||
        recipe.postprocess === "square-road-material" ||
        recipe.postprocess === "square-tall-ground-reference" ||
        recipe.postprocess === "square-mountain-ground-reference"
      )
        await assertSquareTerrainAlpha(candidate, recipe);
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
        request: resolvedRepairRequestSnapshot(
          source,
          generated,
          recipe,
          generated.records[id]?.request,
        ),
      };
      console.log(
        `${id}: repaired candidate (${inspection.sha256.slice(0, 12)})`,
      );
    }
    await saveGenerated(generated);
    return;
  }
  if (command === "snapshot-reframe-sources") {
    const ids = requiredOption("--ids").split(",").filter(Boolean);
    for (const id of ids) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      if (
        recipe === undefined ||
        recipe.reframeSource === undefined ||
        recipe.reframeSourceSha256 === undefined
      )
        throw new Error(`${id}: immutable reframe source contract missing`);
      const input = await readFile(path.join(ROOT, recipe.output));
      if (sha256(input) !== recipe.reframeSourceSha256)
        throw new Error(`${id}: current output is not the declared source`);
      const destination = path.join(ROOT, recipe.reframeSource);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, input);
      console.log(`${id}: snapshotted immutable reframe source`);
    }
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
  if (command === "archive-job") {
    const id = requiredOption("--id");
    const jobId = requiredOption("--job-id");
    const notes = requiredOption("--notes");
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (recipe === undefined) throw new Error(`Unknown recipe ${id}`);
    const apiKey = process.env[source.provider.credentialEnvironmentVariable];
    if (apiKey === undefined || apiKey.length === 0)
      throw new Error(
        `${source.provider.credentialEnvironmentVariable} is missing`,
      );
    const result = await pollJob(source.provider.apiBaseUrl, apiKey, jobId);
    const encoded = findBase64Image(result);
    if (encoded === null)
      throw new Error("Completed PixelLab job contained no base64 image");
    const input = decodeBase64Image(encoded);
    const staging = path.join(
      CANDIDATE_ROOT,
      `${recipe.id}-archive-${jobId}.png`,
    );
    await mkdir(path.dirname(staging), { recursive: true });
    await processCandidate(input, recipe, staging, source);
    const inspection = await inspectPng(staging);
    assertTechnical(recipe, inspection);
    await mkdir(QUARANTINE_ROOT, { recursive: true });
    const quarantine = path.join(
      QUARANTINE_ROOT,
      `${id}-superseded-${inspection.sha256.slice(0, 12)}.png`,
    );
    await rename(staging, quarantine);
    const previous = generated.records[id];
    if (previous === undefined)
      throw new Error(`${id} needs a current record before archival`);
    const request = requestSnapshot(source, recipe);
    const referenceSha256 =
      recipe.styleReference === undefined
        ? undefined
        : generated.records[recipe.styleReference]?.outputSha256;
    const resolvedRequest =
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
                : { usageDescription: recipe.styleReferenceUsage }),
            },
          };
    (generated.records as Record<string, GenerationRecord>)[id] = {
      ...previous,
      rejectedAttempts: [
        ...(previous.rejectedAttempts ?? []),
        {
          candidate: path.relative(ROOT, quarantine).replaceAll("\\", "/"),
          candidateSha256: inspection.sha256,
          providerOutputSha256: sha256(input),
          jobId,
          disposition: "SUPERSEDED_DUPLICATE",
          notes,
          reviewedAt: new Date().toISOString(),
          request: resolvedRequest,
        },
      ],
    };
    await saveGenerated(generated);
    console.log(`${id}: archived superseded provider job ${jobId}`);
    return;
  }
  if (command === "resume-job") {
    const id = requiredOption("--id");
    const jobId = requiredOption("--job-id");
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (recipe === undefined) throw new Error(`Unknown recipe ${id}`);
    const apiKey = process.env[source.provider.credentialEnvironmentVariable];
    if (apiKey === undefined || apiKey.length === 0)
      throw new Error(
        `${source.provider.credentialEnvironmentVariable} is missing`,
      );
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
    const previous = generated.records[id];
    const currentRequest = requestSnapshot(source, recipe);
    const currentGroundSha256 =
      currentRequest.groundReference === undefined
        ? undefined
        : generated.records[currentRequest.groundReference.id]?.outputSha256;
    const currentGroundReference =
      currentRequest.groundReference === undefined
        ? undefined
        : currentGroundSha256 === undefined
          ? currentRequest.groundReference
          : {
              ...currentRequest.groundReference,
              sha256: currentGroundSha256,
            };
    (generated.records as Record<string, GenerationRecord>)[id] = {
      id,
      status: "CANDIDATE",
      jobId,
      candidate: path.relative(ROOT, candidate).replaceAll("\\", "/"),
      candidateSha256: inspection.sha256,
      providerOutputSha256: sha256(input),
      width: inspection.width,
      height: inspection.height,
      hasAlpha: inspection.hasAlpha,
      alphaBounds: inspection.alphaBounds,
      request:
        previous?.request === undefined
          ? currentRequest
          : currentGroundReference === undefined
            ? previous.request
            : {
                ...previous.request,
                groundReference: currentGroundReference,
              },
      ...(previous?.rejectedAttempts === undefined
        ? {}
        : { rejectedAttempts: previous.rejectedAttempts }),
    };
    await saveGenerated(generated);
    console.log(
      `${recipe.id}: resumed candidate ready (${inspection.sha256.slice(0, 12)})`,
    );
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
    "Usage: pixellab.ts credentials | snapshot | snapshot-reframe-sources --ids a,b | generate --stage sample|batch [--ids a,b] [--concurrency 3] | archive-job --id ID --job-id JOB --notes TEXT | resume-job --id ID --job-id JOB | repair --ids a,b | derive --id ID | review --id ID --accept|--reject --notes TEXT [--source-pass --native-pass --enlarged-pass --minimum-pass --composition-pass] | review-sheets | validate",
  );
}

function resolvedRepairRequestSnapshot(
  source: SourceManifest,
  generated: GeneratedManifest,
  recipe: Recipe,
  previous?: RequestSnapshot,
): RequestSnapshot {
  const request = requestSnapshot(source, recipe);
  const styleReference =
    request.styleReference !== undefined &&
    previous?.styleReference?.id === request.styleReference.id &&
    previous.styleReference.sha256 !== undefined
      ? {
          ...request.styleReference,
          sha256: previous.styleReference.sha256,
        }
      : request.styleReference;
  if (request.groundReference === undefined)
    return {
      ...request,
      ...(styleReference === undefined ? {} : { styleReference }),
    };
  const groundHash =
    generated.records[request.groundReference.id]?.outputSha256;
  return {
    ...request,
    ...(styleReference === undefined ? {} : { styleReference }),
    groundReference: {
      ...request.groundReference,
      ...(groundHash === undefined ? {} : { sha256: groundHash }),
    },
  };
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
    if (recipe.fitOffsetX !== undefined && !Number.isInteger(recipe.fitOffsetX))
      throw new Error(`Invalid deterministic fit offset for ${recipe.id}`);
    if (
      recipe.bodyOffsetY !== undefined &&
      (!Number.isInteger(recipe.bodyOffsetY) || recipe.bodyOffsetY < 0)
    )
      throw new Error(`Invalid deterministic body offset for ${recipe.id}`);
    if (
      (recipe.reframeSource === undefined) !==
      (recipe.reframeSourceSha256 === undefined)
    )
      throw new Error(`Incomplete immutable reframe source for ${recipe.id}`);
    if (
      recipe.reframeSource !== undefined &&
      !recipe.reframeSource.startsWith("art/pixellab/reframe-sources/")
    )
      throw new Error(`Invalid immutable reframe path for ${recipe.id}`);
    if (
      recipe.reframeSourceSha256 !== undefined &&
      !/^[a-f0-9]{64}$/.test(recipe.reframeSourceSha256)
    )
      throw new Error(`Invalid immutable reframe hash for ${recipe.id}`);
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
      recipe.groundReference !== undefined &&
      !source.recipes.some(
        (candidate) => candidate.id === recipe.groundReference,
      )
    )
      throw new Error(
        `Unknown ground reference ${recipe.groundReference} for ${recipe.id}`,
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
    if (
      !source.recipes.some((recipe) => recipe.id === alias.source) &&
      !isDerivedRoadMaskId(alias.source)
    )
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
  const squareTerrain = [
    {
      id: "terrain-square-original-grass-1",
      stage: "sample",
      size: { width: 256, height: 256 },
      footprint: { left: 0, top: 0, right: 256, bottom: 256 },
      anchor: { x: 128, y: 128 },
      postprocess: "square-ground-fill",
      groundReference: undefined,
    },
    {
      id: "terrain-square-original-forest-1",
      stage: "sample",
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-tall-ground-reference",
      groundReference: "terrain-square-original-grass-1",
    },
    {
      id: "terrain-square-original-mountain-1",
      stage: "sample",
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-mountain-ground-reference",
      groundReference: "terrain-square-original-grass-1",
    },
    ...([2, 3, 4] as const).map((variant) => ({
      id: `terrain-square-original-grass-${variant}`,
      stage: "batch" as const,
      size: { width: 256, height: 256 },
      footprint: { left: 0, top: 0, right: 256, bottom: 256 },
      anchor: { x: 128, y: 128 },
      postprocess: "square-ground-fill" as const,
      groundReference: undefined,
    })),
    ...([2, 3, 4] as const).map((variant) => ({
      id: `terrain-square-original-forest-${variant}`,
      stage: "batch" as const,
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-tall-ground-reference" as const,
      groundReference: "terrain-square-original-grass-1",
    })),
    ...([2, 3] as const).map((variant) => ({
      id: `terrain-square-original-mountain-${variant}`,
      stage: "batch" as const,
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-mountain-ground-reference" as const,
      groundReference: "terrain-square-original-grass-1",
    })),
    {
      id: "terrain-square-candy-grass-1",
      stage: "sample",
      size: { width: 256, height: 256 },
      footprint: { left: 0, top: 0, right: 256, bottom: 256 },
      anchor: { x: 128, y: 128 },
      postprocess: "square-ground-fill",
      groundReference: undefined,
    },
    {
      id: "terrain-square-candy-forest-1",
      stage: "sample",
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-tall-ground-reference",
      groundReference: "terrain-square-candy-grass-1",
    },
    {
      id: "terrain-square-candy-mountain-1",
      stage: "sample",
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-mountain-ground-reference",
      groundReference: "terrain-square-candy-grass-1",
    },
    ...([2, 3, 4] as const).map((variant) => ({
      id: `terrain-square-candy-grass-${variant}`,
      stage: "batch" as const,
      size: { width: 256, height: 256 },
      footprint: { left: 0, top: 0, right: 256, bottom: 256 },
      anchor: { x: 128, y: 128 },
      postprocess: "square-ground-fill" as const,
      groundReference: undefined,
    })),
    ...([2, 3, 4] as const).map((variant) => ({
      id: `terrain-square-candy-forest-${variant}`,
      stage: "batch" as const,
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-tall-ground-reference" as const,
      groundReference: "terrain-square-candy-grass-1",
    })),
    ...([2, 3] as const).map((variant) => ({
      id: `terrain-square-candy-mountain-${variant}`,
      stage: "batch" as const,
      size: { width: 256, height: 384 },
      footprint: { left: 0, top: 128, right: 256, bottom: 384 },
      anchor: { x: 128, y: 256 },
      postprocess: "square-mountain-ground-reference" as const,
      groundReference: "terrain-square-candy-grass-1",
    })),
  ] as const;
  for (const contract of squareTerrain) {
    const recipe = source.recipes.find(({ id }) => id === contract.id);
    if (
      recipe?.class !== "terrain" ||
      recipe.stage !== contract.stage ||
      JSON.stringify(recipe.requestSize) !== JSON.stringify(contract.size) ||
      JSON.stringify(recipe.outputSize) !== JSON.stringify(contract.size) ||
      JSON.stringify(recipe.squareFootprint) !==
        JSON.stringify(contract.footprint) ||
      JSON.stringify(recipe.anchor) !== JSON.stringify(contract.anchor) ||
      recipe.postprocess !== contract.postprocess ||
      recipe.groundReference !== contract.groundReference ||
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify({
          left: 0,
          top: 0,
          right: contract.size.width,
          bottom: contract.size.height,
        })
    )
      throw new Error(`Square terrain geometry mismatch: ${contract.id}`);
  }
  const squareResources = [
    "terrain-square-original-fruit",
    "terrain-square-candy-fruit",
    "terrain-square-original-animal",
    "terrain-square-candy-animal",
    "terrain-square-ore",
    "terrain-square-fertile-ground",
    "terrain-square-stone",
  ] as const;
  for (const id of squareResources) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.class !== "terrain" ||
      recipe.stage !== "batch" ||
      recipe.requestSize.width !== 256 ||
      recipe.requestSize.height !== 384 ||
      recipe.outputSize.width !== 256 ||
      recipe.outputSize.height !== 384 ||
      JSON.stringify(recipe.anchor) !== JSON.stringify({ x: 128, y: 256 }) ||
      JSON.stringify(recipe.squareFootprint) !==
        JSON.stringify({ left: 0, top: 128, right: 256, bottom: 384 }) ||
      recipe.postprocess !== "preferred-low-marker-fit" ||
      recipe.preferredBounds === undefined ||
      recipe.groundContactY === undefined ||
      recipe.hardBounds.left < 0 ||
      recipe.hardBounds.top < 128 ||
      recipe.hardBounds.right > 256 ||
      recipe.hardBounds.bottom > 384
    )
      throw new Error(`Square resource geometry mismatch: ${id}`);
  }
  const squareRoad = source.recipes.find(
    ({ id }) => id === "terrain-square-road-material",
  );
  if (
    squareRoad?.class !== "terrain" ||
    squareRoad.stage !== "batch" ||
    squareRoad.requestSize.width !== 256 ||
    squareRoad.requestSize.height !== 256 ||
    squareRoad.outputSize.width !== 256 ||
    squareRoad.outputSize.height !== 256 ||
    JSON.stringify(squareRoad.anchor) !== JSON.stringify({ x: 128, y: 128 }) ||
    JSON.stringify(squareRoad.squareFootprint) !==
      JSON.stringify({ left: 0, top: 0, right: 256, bottom: 256 }) ||
    squareRoad.postprocess !== "square-road-material"
  )
    throw new Error("Square Road material geometry mismatch");
  const squareImprovements = [
    {
      id: "building-square-farm",
      size: { width: 256, height: 256 },
      anchor: { x: 128, y: 128 },
      hardBounds: { left: 0, top: 0, right: 256, bottom: 256 },
      postprocess: "square-farm-fill",
    },
    {
      id: "building-square-quarry",
      size: { width: 256, height: 296 },
      anchor: { x: 128, y: 222 },
      hardBounds: { left: 20, top: 12, right: 236, bottom: 252 },
      postprocess: "compact-building-fit",
    },
    {
      id: "building-square-windmill",
      size: { width: 384, height: 384 },
      anchor: { x: 192, y: 288 },
      hardBounds: { left: 8, top: 8, right: 376, bottom: 344 },
      postprocess: "compact-building-fit",
    },
  ] as const;
  for (const contract of squareImprovements) {
    const recipe = source.recipes.find(({ id }) => id === contract.id);
    if (
      recipe?.class !== "buildings" ||
      recipe.stage !== "sample" ||
      JSON.stringify(recipe.requestSize) !== JSON.stringify(contract.size) ||
      JSON.stringify(recipe.outputSize) !== JSON.stringify(contract.size) ||
      JSON.stringify(recipe.anchor) !== JSON.stringify(contract.anchor) ||
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify(contract.hardBounds) ||
      recipe.postprocess !== contract.postprocess ||
      recipe.styleReference === undefined ||
      recipe.preferredBounds === undefined
    )
      throw new Error(`Square improvement geometry mismatch: ${contract.id}`);
  }
  const farm = source.recipes.find(({ id }) => id === "building-square-farm");
  if (
    JSON.stringify(farm?.squareFootprint) !==
    JSON.stringify({ left: 0, top: 0, right: 256, bottom: 256 })
  )
    throw new Error("Square Farm needs one complete opaque owning footprint");
  const squareImprovementExpansion = [
    {
      id: "building-square-lumber-camp",
      size: { width: 256, height: 296 },
      anchor: { x: 128, y: 222 },
      hardBounds: { left: 20, top: 12, right: 236, bottom: 252 },
    },
    {
      id: "building-square-mine",
      size: { width: 256, height: 296 },
      anchor: { x: 128, y: 222 },
      hardBounds: { left: 20, top: 12, right: 236, bottom: 252 },
    },
    ...[
      "building-square-sawmill",
      "building-square-forge",
      "building-square-stoneworks",
    ].map((id) => ({
      id,
      size: { width: 384, height: 384 },
      anchor: { x: 192, y: 288 },
      hardBounds: { left: 8, top: 8, right: 376, bottom: 344 },
    })),
  ] as const;
  for (const contract of squareImprovementExpansion) {
    const recipe = source.recipes.find(({ id }) => id === contract.id);
    if (
      recipe?.class !== "buildings" ||
      recipe.stage !== "batch" ||
      JSON.stringify(recipe.requestSize) !== JSON.stringify(contract.size) ||
      JSON.stringify(recipe.outputSize) !== JSON.stringify(contract.size) ||
      JSON.stringify(recipe.anchor) !== JSON.stringify(contract.anchor) ||
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify(contract.hardBounds) ||
      recipe.postprocess !== "compact-building-fit" ||
      recipe.styleReference === undefined ||
      recipe.styleReferenceUsage === undefined ||
      recipe.preferredBounds === undefined ||
      recipe.fitBounds === undefined ||
      recipe.groundContactY === undefined
    )
      throw new Error(
        `Square extraction/processor geometry mismatch: ${contract.id}`,
      );
  }
  const squareCivicCommerce = [
    "building-square-workshop",
    "building-square-grand-works",
    "building-square-market",
  ] as const;
  for (const id of squareCivicCommerce) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.class !== "buildings" ||
      recipe.stage !== "batch" ||
      JSON.stringify(recipe.requestSize) !==
        JSON.stringify({ width: 384, height: 384 }) ||
      JSON.stringify(recipe.outputSize) !==
        JSON.stringify({ width: 384, height: 384 }) ||
      JSON.stringify(recipe.anchor) !== JSON.stringify({ x: 192, y: 288 }) ||
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify({ left: 8, top: 8, right: 376, bottom: 344 }) ||
      recipe.postprocess !== "compact-building-fit" ||
      recipe.styleReference === undefined ||
      recipe.styleReferenceUsage === undefined ||
      recipe.preferredBounds === undefined ||
      recipe.fitBounds === undefined ||
      recipe.groundContactY !== 316
    )
      throw new Error(`Square civic/commerce geometry mismatch: ${id}`);
  }
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
  const originalAliases = new Map(
    (source.aliases ?? []).map((alias) => [alias.id, alias]),
  );
  for (const [id, aliasSource, semanticRole] of [
    ["unit-original-fighter", "unit-warrior", "ORIGINAL_FIGHTER"],
    ["unit-original-marksman", "unit-archer", "ORIGINAL_MARKSMAN"],
    ["unit-original-guard", "unit-defender", "ORIGINAL_GUARD"],
    ["unit-original-raider", "unit-rider", "ORIGINAL_RAIDER"],
  ] as const) {
    const alias = originalAliases.get(id);
    if (alias?.source !== aliasSource || alias.semanticRole !== semanticRole)
      throw new Error(`Ruleset 6 Original role alias mismatch: ${id}`);
  }
  const originalUnits = [
    ["unit-original-scout", "sample", 256, 296, 128, 222],
    ["unit-original-medic", "sample", 256, 296, 128, 222],
    ["unit-original-breacher", "sample", 384, 384, 192, 288],
    ["unit-original-heavy", "batch", 256, 296, 128, 222],
    ["unit-original-juggernaut", "batch", 384, 448, 192, 336],
  ] as const;
  for (const [id, stage, width, height, anchorX, anchorY] of originalUnits) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.class !== "units" ||
      recipe.stage !== stage ||
      recipe.requestSize.width !== width ||
      recipe.requestSize.height !== height ||
      recipe.outputSize.width !== width ||
      recipe.outputSize.height !== height ||
      recipe.anchor?.x !== anchorX ||
      recipe.anchor.y !== anchorY ||
      recipe.groundContactY !== anchorY ||
      recipe.postprocess !== "unit-fit" ||
      recipe.preferredBounds === undefined
    )
      throw new Error(`Original unit geometry mismatch: ${id}`);
  }
  const portraitSources = new Map([
    ["fighter", "unit-warrior"],
    ["scout", "unit-original-scout"],
    ["marksman", "unit-archer"],
    ["guard", "unit-defender"],
    ["raider", "unit-rider"],
    ["medic", "unit-original-medic"],
    ["heavy", "unit-original-heavy"],
    ["breacher", "unit-original-breacher"],
    ["juggernaut", "unit-original-juggernaut"],
  ]);
  for (const [role, portraitSource] of portraitSources) {
    const id = `portrait-original-${role}`;
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.class !== "ui" ||
      recipe.stage !== "batch" ||
      recipe.outputSize.width !== 256 ||
      recipe.outputSize.height !== 256 ||
      recipe.postprocess !== "sprite-derived-portrait" ||
      recipe.styleReference !== portraitSource ||
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify({ left: 20, top: 20, right: 236, bottom: 236 })
    )
      throw new Error(`Original portrait contract mismatch: ${id}`);
  }
  const candyAliases = new Map(
    (source.aliases ?? []).map((alias) => [alias.id, alias]),
  );
  for (const [id, aliasSource, semanticRole] of [
    ["unit-candy-fighter", "unit-candy-warrior", "CANDY_FIGHTER_CANDY_WARRIOR"],
    [
      "unit-candy-marksman",
      "unit-candy-gumball-guard",
      "CANDY_MARKSMAN_GUMBALL_GUARD",
    ],
    [
      "unit-candy-guard",
      "unit-candy-choco-engineer",
      "CANDY_GUARD_CHOCO_ENGINEER",
    ],
    ["unit-candy-raider", "unit-candy-donut", "CANDY_RAIDER_DONUT"],
  ] as const) {
    const alias = candyAliases.get(id);
    if (alias?.source !== aliasSource || alias.semanticRole !== semanticRole)
      throw new Error(`Ruleset 6 Candy role alias mismatch: ${id}`);
  }
  const candyUnits = [
    ["unit-candy-scout", "sample", 256, 296, 128, 222],
    ["unit-candy-medic", "sample", 256, 296, 128, 222],
    ["unit-candy-breacher", "sample", 384, 384, 192, 288],
    ["unit-candy-heavy", "batch", 256, 296, 128, 222],
    ["unit-candy-juggernaut", "batch", 384, 448, 192, 336],
  ] as const;
  for (const [id, stage, width, height, anchorX, anchorY] of candyUnits) {
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.class !== "units" ||
      recipe.stage !== stage ||
      recipe.requestSize.width !== width ||
      recipe.requestSize.height !== height ||
      recipe.outputSize.width !== width ||
      recipe.outputSize.height !== height ||
      recipe.anchor?.x !== anchorX ||
      recipe.anchor.y !== anchorY ||
      recipe.groundContactY !== anchorY ||
      recipe.postprocess !== "unit-fit" ||
      recipe.preferredBounds === undefined ||
      recipe.includeFactionLanguage !== false
    )
      throw new Error(`Candy unit geometry mismatch: ${id}`);
  }
  const candyPortraitSources = new Map([
    ["fighter", "unit-candy-warrior"],
    ["scout", "unit-candy-scout"],
    ["marksman", "unit-candy-gumball-guard"],
    ["guard", "unit-candy-choco-engineer"],
    ["raider", "unit-candy-donut"],
    ["medic", "unit-candy-medic"],
    ["heavy", "unit-candy-heavy"],
    ["breacher", "unit-candy-breacher"],
    ["juggernaut", "unit-candy-juggernaut"],
  ]);
  for (const [role, portraitSource] of candyPortraitSources) {
    const id = `portrait-candy-${role}`;
    const recipe = source.recipes.find((candidate) => candidate.id === id);
    if (
      recipe?.class !== "ui" ||
      recipe.stage !== "batch" ||
      recipe.outputSize.width !== 256 ||
      recipe.outputSize.height !== 256 ||
      recipe.postprocess !== "sprite-derived-portrait" ||
      recipe.styleReference !== portraitSource ||
      JSON.stringify(recipe.hardBounds) !==
        JSON.stringify({ left: 20, top: 20, right: 236, bottom: 236 })
    )
      throw new Error(`Candy portrait contract mismatch: ${id}`);
  }
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
  const serialized = `${JSON.stringify(generated, null, 2)}\n`;
  const pending = generatedSaveChain.then(async () => {
    await mkdir(path.dirname(GENERATED_PATH), { recursive: true });
    await writeFile(GENERATED_PATH, serialized, "utf8");
  });
  generatedSaveChain = pending.catch(() => undefined);
  await pending;
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

function assertOriginalUnitOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const samples = [
    "unit-original-scout",
    "unit-original-medic",
    "unit-original-breacher",
  ] as const;
  const selectedSamples = recipes.filter((recipe) =>
    samples.includes(recipe.id as (typeof samples)[number]),
  );
  if (selectedSamples.length > 0) {
    if (selectedSamples.length !== 1)
      throw new Error(
        "Original Scout, Medic, and Breacher must be generated as separate individual requests",
      );
    const selectedIndex = samples.indexOf(
      selectedSamples[0]?.id as (typeof samples)[number],
    );
    const missingEarlier = samples
      .slice(0, selectedIndex)
      .filter((id) => generated.records[id]?.status !== "ACCEPTED");
    if (missingEarlier.length > 0)
      throw new Error(
        `Original sample gate order requires acceptance first: ${missingEarlier.join(", ")}`,
      );
    return;
  }

  const generatedUnits = recipes
    .map((recipe) => recipe.id)
    .filter((id) => id.startsWith("unit-original-"));
  if (generatedUnits.length === 0) return;
  if (samples.some((id) => generated.records[id]?.status !== "ACCEPTED"))
    throw new Error(
      "Accept Scout, Medic, and Breacher before later Original units",
    );
  if (generatedUnits.includes("unit-original-heavy")) {
    if (generatedUnits.length !== 1)
      throw new Error(
        "Generate Original Heavy alone within the frontline family gate",
      );
    return;
  }
  if (generatedUnits.includes("unit-original-juggernaut")) {
    if (generatedUnits.length !== 1)
      throw new Error(
        "Generate Original Juggernaut as an individual giant gate",
      );
    if (generated.records["unit-original-heavy"]?.status !== "ACCEPTED")
      throw new Error("Accept the Original frontline family before Juggernaut");
  }
}

function assertCandyUnitOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const samples = [
    "unit-candy-scout",
    "unit-candy-medic",
    "unit-candy-breacher",
  ] as const;
  const selectedSamples = recipes.filter((recipe) =>
    samples.includes(recipe.id as (typeof samples)[number]),
  );
  if (selectedSamples.length > 0) {
    if (selectedSamples.length !== 1)
      throw new Error(
        "Jelly Scout, Marshmallow Medic, and Candy Crusher must be generated as separate individual requests",
      );
    const selectedIndex = samples.indexOf(
      selectedSamples[0]?.id as (typeof samples)[number],
    );
    const missingEarlier = samples
      .slice(0, selectedIndex)
      .filter((id) => generated.records[id]?.status !== "ACCEPTED");
    if (missingEarlier.length > 0)
      throw new Error(
        `Candy sample gate order requires acceptance first: ${missingEarlier.join(", ")}`,
      );
    return;
  }

  const selectedUnits = recipes
    .map((recipe) => recipe.id)
    .filter((id) => ["unit-candy-heavy", "unit-candy-juggernaut"].includes(id));
  if (selectedUnits.length === 0) return;
  if (samples.some((id) => generated.records[id]?.status !== "ACCEPTED"))
    throw new Error(
      "Accept Jelly Scout, Marshmallow Medic, and Candy Crusher before later Candy units",
    );
  if (selectedUnits.includes("unit-candy-heavy")) {
    if (selectedUnits.length !== 1)
      throw new Error(
        "Generate Jawbreaker alone within the Candy frontline family gate",
      );
    for (const id of ["unit-candy-warrior", "unit-candy-gumball-guard"])
      if (generated.records[id]?.status !== "ACCEPTED")
        throw new Error(`Candy frontline alias source is not accepted: ${id}`);
    return;
  }
  if (selectedUnits.includes("unit-candy-juggernaut")) {
    if (selectedUnits.length !== 1)
      throw new Error("Generate Sugar Titan as an individual giant gate");
    if (generated.records["unit-candy-heavy"]?.status !== "ACCEPTED")
      throw new Error("Accept the Candy frontline family before Sugar Titan");
    for (const id of ["unit-candy-choco-engineer", "unit-candy-donut"])
      if (generated.records[id]?.status !== "ACCEPTED")
        throw new Error(`Candy alias family source is not accepted: ${id}`);
  }
}

function assertRuleset6UiOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const samples = [
    "ui-hud-coin",
    "ui-action-redevelop",
    "ui-tech-fieldcraft",
  ] as const;
  const selectedSamples = recipes.filter((recipe) =>
    samples.includes(recipe.id as (typeof samples)[number]),
  );
  if (selectedSamples.length > 0) {
    if (selectedSamples.length !== 1)
      throw new Error(
        "Ruleset 6 Coin, Redevelop, and Fieldcraft samples must be generated as separate individual requests",
      );
    const selectedIndex = samples.indexOf(
      selectedSamples[0]?.id as (typeof samples)[number],
    );
    const missingEarlier = samples
      .slice(0, selectedIndex)
      .filter((id) => generated.records[id]?.status !== "ACCEPTED");
    if (missingEarlier.length > 0)
      throw new Error(
        `Ruleset 6 UI sample order requires acceptance first: ${missingEarlier.join(", ")}`,
      );
    return;
  }

  const selected = recipes.filter(
    (recipe) =>
      recipe.class === "ui" &&
      (recipe.id.startsWith("ui-hud-") ||
        recipe.id.startsWith("ui-action-") ||
        recipe.id.startsWith("ui-tech-") ||
        recipe.id.startsWith("ui-reward-")) &&
      recipe.seed >= 96100,
  );
  if (selected.length === 0) return;
  if (samples.some((id) => generated.records[id]?.status !== "ACCEPTED"))
    throw new Error(
      "Accept the Coin, Redevelop, and Fieldcraft samples before later ruleset-6 UI assets",
    );
  if (selected.length > 3)
    throw new Error("Ruleset 6 UI batches may contain at most three assets");
}

function assertSquareTerrainOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  assertSquareTerrainFamilyOrder(recipes, generated, "original");
  assertSquareTerrainFamilyOrder(recipes, generated, "candy");
}

function assertSquareResourceRoadOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const groups = [
    ["terrain-square-original-fruit", "terrain-square-candy-fruit"],
    ["terrain-square-original-animal", "terrain-square-candy-animal"],
    [
      "terrain-square-ore",
      "terrain-square-fertile-ground",
      "terrain-square-stone",
    ],
    ["terrain-square-road-material"],
  ] as const;
  const selected = recipes
    .map(({ id }) => id)
    .filter((id) => groups.some((group) => group.includes(id as never)));
  if (selected.length === 0) return;
  if (selected.length > 3)
    throw new Error(
      "Square resource and Road PixelLab requests may contain at most three assets",
    );
  const groupIndex = groups.findIndex((group) =>
    selected.every((id) => group.includes(id as never)),
  );
  if (groupIndex < 0)
    throw new Error(
      "Do not mix square Fruit, Animal, shared-low-resource, or Road material request families",
    );
  const missingBefore = groups
    .slice(0, groupIndex)
    .flat()
    .filter((id) => generated.records[id]?.status !== "ACCEPTED");
  if (missingBefore.length > 0)
    throw new Error(
      `Square resource request order requires acceptance first: ${missingBefore.join(", ")}`,
    );
}

function assertSquareImprovementSampleGate(recipes: readonly Recipe[]): void {
  const ids = [
    "building-square-farm",
    "building-square-quarry",
    "building-square-windmill",
  ] as const;
  const selected = recipes
    .map(({ id }) => id)
    .filter((id) => ids.includes(id as (typeof ids)[number]));
  if (selected.length === 0) return;
  if (
    selected.length !== ids.length ||
    selected.some((id, index) => id !== ids[index])
  )
    throw new Error(
      "Square improvement sample gate must generate exactly Farm, Quarry, and Windmill together in manifest order",
    );
}

function assertSquareImprovementExpansionOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const groups = [
    ["building-square-lumber-camp", "building-square-mine"],
    [
      "building-square-sawmill",
      "building-square-forge",
      "building-square-stoneworks",
    ],
  ] as const;
  const selected = recipes
    .map(({ id }) => id)
    .filter((id) => groups.some((group) => group.includes(id as never)));
  if (selected.length === 0) return;
  const groupIndex = groups.findIndex(
    (group) =>
      selected.length === group.length &&
      selected.every((id, index) => id === group[index]),
  );
  if (groupIndex < 0)
    throw new Error(
      "Square extraction/processor generation must use exactly Lumber Camp + Mine or Sawmill + Forge + Stoneworks in manifest order",
    );
  const missingBefore = groups
    .slice(0, groupIndex)
    .flat()
    .filter((id) => generated.records[id]?.status !== "ACCEPTED");
  if (missingBefore.length > 0)
    throw new Error(
      `Accept the square extraction family before processors: ${missingBefore.join(", ")}`,
    );
}

function assertSquareCivicCommerceOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
): void {
  const ids = [
    "building-square-workshop",
    "building-square-grand-works",
    "building-square-market",
  ] as const;
  const selected = recipes
    .map(({ id }) => id)
    .filter((id) => ids.includes(id as (typeof ids)[number]));
  if (selected.length === 0) return;
  if (
    selected.length !== ids.length ||
    selected.some((id, index) => id !== ids[index])
  )
    throw new Error(
      "Square civic/commerce generation must use exactly Workshop + Grand Works + Market in one manifest-ordered request",
    );
  const prerequisites = [
    "building-square-sawmill",
    "building-square-forge",
    "building-square-stoneworks",
  ] as const;
  const missing = prerequisites.filter(
    (id) => generated.records[id]?.status !== "ACCEPTED",
  );
  if (missing.length > 0)
    throw new Error(
      `Accept square processors before civic/commerce generation: ${missing.join(", ")}`,
    );
}

function assertSquareTerrainFamilyOrder(
  recipes: readonly Recipe[],
  generated: GeneratedManifest,
  faction: "original" | "candy",
): void {
  const factionLabel = faction === "original" ? "Original" : "Candy";
  const samples = [
    `terrain-square-${faction}-grass-1`,
    `terrain-square-${faction}-forest-1`,
    `terrain-square-${faction}-mountain-1`,
  ] as const;
  const selected = recipes.filter((recipe) =>
    samples.includes(recipe.id as (typeof samples)[number]),
  );
  if (selected.length > 0) {
    if (selected.length !== 1)
      throw new Error(
        `${factionLabel} square Grass, Forest, and Mountain samples must be generated as separate individual requests`,
      );
    const selectedIndex = samples.indexOf(
      selected[0]?.id as (typeof samples)[number],
    );
    const missingEarlier = samples
      .slice(0, selectedIndex)
      .filter((id) => generated.records[id]?.status !== "ACCEPTED");
    if (missingEarlier.length > 0)
      throw new Error(
        `Square terrain sample order requires acceptance first: ${missingEarlier.join(", ")}`,
      );
    return;
  }

  const families = [
    [
      `terrain-square-${faction}-grass-2`,
      `terrain-square-${faction}-grass-3`,
      `terrain-square-${faction}-grass-4`,
    ],
    [
      `terrain-square-${faction}-forest-2`,
      `terrain-square-${faction}-forest-3`,
      `terrain-square-${faction}-forest-4`,
    ],
    [
      `terrain-square-${faction}-mountain-2`,
      `terrain-square-${faction}-mountain-3`,
    ],
  ] as const;
  const selectedBatch = recipes
    .map(({ id }) => id)
    .filter((id) => families.some((family) => family.includes(id as never)));
  if (selectedBatch.length === 0) return;
  const batchLimitMessage =
    faction === "original"
      ? "Original square terrain batches may contain at most three assets"
      : "Candy square terrain batches may contain at most three assets";
  const mixedFamilyMessage =
    faction === "original"
      ? "Do not mix Original square terrain family batches"
      : "Do not mix Candy square terrain family batches";
  if (selectedBatch.length > 3) throw new Error(batchLimitMessage);
  const familyIndex = families.findIndex((family) =>
    selectedBatch.every((id) => family.includes(id as never)),
  );
  if (familyIndex < 0) throw new Error(mixedFamilyMessage);
  const requiredBefore = [...samples, ...families.slice(0, familyIndex).flat()];
  const missingBefore = requiredBefore.filter(
    (id) => generated.records[id]?.status !== "ACCEPTED",
  );
  if (missingBefore.length > 0)
    throw new Error(
      `${factionLabel} square terrain batch order requires acceptance first: ${missingBefore.join(", ")}`,
    );
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
          const record = await generateOne(source, recipe, apiKey, generated);
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
  generated: GeneratedManifest,
): Promise<GenerationRecord> {
  const request = requestSnapshot(source, recipe);
  if (recipe.postprocess === "sprite-derived-portrait") {
    if (recipe.styleReference === undefined)
      throw new Error(`${recipe.id}: derived portrait needs styleReference`);
    const referenceRecipe = source.recipes.find(
      (candidate) => candidate.id === recipe.styleReference,
    );
    if (referenceRecipe === undefined)
      throw new Error(`Unknown portrait source ${recipe.styleReference}`);
    const sourceRecord = generated.records[recipe.styleReference];
    if (sourceRecord?.status !== "ACCEPTED")
      throw new Error(`${recipe.id}: portrait source is not accepted`);
    const reference = await readFile(path.join(ROOT, referenceRecipe.output));
    const candidate = path.join(CANDIDATE_ROOT, `${recipe.id}.png`);
    await mkdir(path.dirname(candidate), { recursive: true });
    await deriveSpritePortrait(reference, recipe, candidate);
    const inspection = await inspectPng(candidate);
    assertTechnical(recipe, inspection);
    const referenceSha256 = sha256(reference);
    console.log(
      `${recipe.id}: deterministic portrait ready (${inspection.sha256.slice(0, 12)})`,
    );
    return {
      id: recipe.id,
      status: "CANDIDATE",
      candidate: path.relative(ROOT, candidate).replaceAll("\\", "/"),
      candidateSha256: inspection.sha256,
      providerOutputSha256: referenceSha256,
      width: inspection.width,
      height: inspection.height,
      hasAlpha: inspection.hasAlpha,
      alphaBounds: inspection.alphaBounds,
      notes: `Deterministically derived from ${recipe.styleReference} (${referenceSha256}).`,
      request: {
        ...request,
        styleReference: {
          id: recipe.styleReference,
          sha256: referenceSha256,
          usageDescription:
            "Deterministic full-silhouette fit into the 256x256 portrait safe area; no provider request.",
        },
      },
    };
  }
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
  if (recipe.groundReference !== undefined) {
    const groundRecipe = source.recipes.find(
      (candidate) => candidate.id === recipe.groundReference,
    );
    if (groundRecipe === undefined)
      throw new Error(`Unknown ground reference ${recipe.groundReference}`);
    const groundRecord = generated.records[recipe.groundReference];
    if (groundRecord?.status !== "ACCEPTED")
      throw new Error(`${recipe.id}: square ground reference is not accepted`);
    resolvedRequest = {
      ...resolvedRequest,
      groundReference: {
        id: recipe.groundReference,
        ...(groundRecord.outputSha256 === undefined
          ? {}
          : { sha256: groundRecord.outputSha256 }),
        usageDescription:
          "Deterministically composite the accepted full-square ground beneath the provider-authored tall terrain so the exact owning footprint is opaque and seam-safe.",
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
    ...(recipe.fitOffsetX === undefined
      ? {}
      : { fitOffsetX: recipe.fitOffsetX }),
    ...(recipe.bodyOffsetY === undefined
      ? {}
      : { bodyOffsetY: recipe.bodyOffsetY }),
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
    ...(recipe.squareFootprint === undefined
      ? {}
      : { squareFootprint: recipe.squareFootprint }),
    ...(recipe.groundReference === undefined
      ? {}
      : {
          groundReference: {
            id: recipe.groundReference,
            usageDescription:
              "Deterministically composite the accepted full-square ground beneath the provider-authored tall terrain so the exact owning footprint is opaque and seam-safe.",
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
  if (recipe.postprocess === "square-farm-fill") {
    const providerMetadata = await sharp(input).metadata();
    const providerWidth = providerMetadata.width ?? recipe.requestSize.width;
    const providerHeight = providerMetadata.height ?? recipe.requestSize.height;
    const presentationInset = Math.round(
      Math.min(providerWidth, providerHeight) / 16,
    );
    await sharp(input)
      .ensureAlpha()
      .extract({
        left: presentationInset,
        top: presentationInset,
        width: providerWidth - presentationInset * 2,
        height: providerHeight - presentationInset * 2,
      })
      .resize(recipe.outputSize.width, recipe.outputSize.height, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(destination);
    await applySquareFarmFill(destination, recipe);
    await assertSquareTerrainAlpha(destination, recipe);
    return;
  }
  if (recipe.postprocess === "square-ground-fill") {
    const providerMetadata = await sharp(input).metadata();
    const providerWidth = providerMetadata.width ?? recipe.requestSize.width;
    const providerHeight = providerMetadata.height ?? recipe.requestSize.height;
    const presentationInset = Math.round(
      Math.min(providerWidth, providerHeight) / 16,
    );
    await sharp(input)
      .ensureAlpha()
      .extract({
        left: presentationInset,
        top: presentationInset,
        width: providerWidth - presentationInset * 2,
        height: providerHeight - presentationInset * 2,
      })
      .resize(recipe.outputSize.width, recipe.outputSize.height, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      })
      .blur(24)
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(destination);
    await applySquareGroundFill(destination, recipe);
    await assertSquareTerrainAlpha(destination, recipe);
    return;
  }
  if (recipe.postprocess === "square-road-material") {
    const providerMetadata = await sharp(input).metadata();
    const providerWidth = providerMetadata.width ?? recipe.requestSize.width;
    const providerHeight = providerMetadata.height ?? recipe.requestSize.height;
    const presentationInset = Math.round(
      Math.min(providerWidth, providerHeight) / 16,
    );
    await sharp(input)
      .ensureAlpha()
      .extract({
        left: presentationInset,
        top: presentationInset,
        width: providerWidth - presentationInset * 2,
        height: providerHeight - presentationInset * 2,
      })
      .resize(recipe.outputSize.width, recipe.outputSize.height, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(destination);
    await applySquareRoadMaterial(destination, recipe);
    await assertSquareTerrainAlpha(destination, recipe);
    return;
  }
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
  } else if (
    recipe.postprocess === "square-tall-ground-reference" ||
    recipe.postprocess === "square-mountain-ground-reference"
  ) {
    await applySquareTallGroundReference(destination, recipe, source);
    await assertSquareTerrainAlpha(destination, recipe);
  } else await normalizeToHardBounds(destination, recipe);
}

async function applySquareFarmFill(
  destination: string,
  recipe: Recipe,
): Promise<void> {
  if (
    recipe.squareFootprint?.left !== 0 ||
    recipe.squareFootprint.top !== 0 ||
    recipe.squareFootprint.right !== recipe.outputSize.width ||
    recipe.squareFootprint.bottom !== recipe.outputSize.height
  )
    throw new Error(`${recipe.id}: invalid complete Farm footprint`);
  const provider = await sharp(await readFile(destination))
    .removeAlpha()
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const base = [0x9c, 0x73, 0x43] as const;
  const { width, height } = provider.info;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset3 = (y * width + x) * 3;
      const offset4 = (y * width + x) * 4;
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      const providerWeight = Math.min(0.32, Math.max(0, edge - 20) / 96);
      const edgeLightWeight = Math.min(1, Math.max(0, edge - 20) / 28);
      const light = Math.round(
        ((x + y) / (width + height) - 0.5) * -8 * edgeLightWeight,
      );
      const furrowPhase = Math.cos(
        (Math.PI * 2 * 4 * x) / Math.max(1, width - 1),
      );
      const furrow = Math.round(
        -12 * Math.max(0, furrowPhase) ** 5 +
          4 * Math.max(0, -furrowPhase) ** 5,
      );
      for (let channel = 0; channel < 3; channel += 1) {
        const fallback = base[channel] ?? 0;
        const authored = provider.data[offset3 + channel] ?? fallback;
        pixels[offset4 + channel] = Math.max(
          0,
          Math.min(
            255,
            Math.round(
              fallback * (1 - providerWeight) +
                authored * providerWeight +
                light +
                furrow,
            ),
          ),
        );
      }
      pixels[offset4 + 3] = 255;
    }
  }
  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
}

async function applySquareGroundFill(
  destination: string,
  recipe: Recipe,
): Promise<void> {
  if (
    recipe.squareFootprint?.left !== 0 ||
    recipe.squareFootprint.top !== 0 ||
    recipe.squareFootprint.right !== recipe.outputSize.width ||
    recipe.squareFootprint.bottom !== recipe.outputSize.height
  )
    throw new Error(`${recipe.id}: invalid full-square ground footprint`);
  const { data, info } = await sharp(await readFile(destination))
    .ensureAlpha()
    .flatten({ background: "#6f9255" })
    .ensureAlpha(1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const base = [0x6f, 0x92, 0x55] as const;
  const transition = 48;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const edgeDistance = Math.min(
        x,
        y,
        info.width - 1 - x,
        info.height - 1 - y,
      );
      const normalized = Math.min(1, edgeDistance / transition);
      const authoredWeight =
        0.04 * normalized * normalized * (3 - 2 * normalized);
      const offset = (y * info.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const baseColor = base[channel] ?? 0;
        data[offset + channel] = Math.round(
          baseColor * (1 - authoredWeight) +
            (data[offset + channel] ?? 0) * authoredWeight,
        );
      }
      data[offset + 3] = 255;
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
}

async function applySquareRoadMaterial(
  destination: string,
  recipe: Recipe,
): Promise<void> {
  if (
    recipe.outputSize.width !== 256 ||
    recipe.outputSize.height !== 256 ||
    recipe.squareFootprint?.left !== 0 ||
    recipe.squareFootprint.top !== 0 ||
    recipe.squareFootprint.right !== 256 ||
    recipe.squareFootprint.bottom !== 256
  )
    throw new Error(`${recipe.id}: invalid square Road material geometry`);
  const { data, info } = await sharp(await readFile(destination))
    .ensureAlpha()
    .flatten({ background: "#9f8a67" })
    .ensureAlpha(1)
    .blur(18)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const base = [0x9f, 0x8a, 0x67] as const;
  const transition = 24;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const edgeDistance = Math.min(
        x,
        y,
        info.width - 1 - x,
        info.height - 1 - y,
      );
      const normalized = Math.min(1, edgeDistance / transition);
      const authoredWeight =
        0.16 * normalized * normalized * (3 - 2 * normalized);
      const light = Math.round(
        2.5 * (1 - (x + y) / (info.width + info.height - 2)) - 1.25,
      );
      const offset = (y * info.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const baseColor = Math.max(
          0,
          Math.min(255, (base[channel] ?? 0) + light * normalized),
        );
        data[offset + channel] = Math.round(
          baseColor * (1 - authoredWeight) +
            (data[offset + channel] ?? 0) * authoredWeight,
        );
      }
      data[offset + 3] = 255;
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
}

async function applySquareTallGroundReference(
  destination: string,
  recipe: Recipe,
  source: SourceManifest,
): Promise<void> {
  const footprint = recipe.squareFootprint;
  if (
    footprint === undefined ||
    footprint.left !== 0 ||
    footprint.right !== recipe.outputSize.width ||
    footprint.bottom !== recipe.outputSize.height ||
    footprint.top <= 0 ||
    recipe.groundReference === undefined
  )
    throw new Error(`${recipe.id}: invalid tall square footprint contract`);
  const groundRecipe = source.recipes.find(
    ({ id }) => id === recipe.groundReference,
  );
  if (groundRecipe === undefined)
    throw new Error(
      `Unknown square ground reference ${recipe.groundReference}`,
    );
  const groundPipeline = sharp(path.join(ROOT, groundRecipe.output))
    .ensureAlpha()
    .resize(
      footprint.right - footprint.left,
      footprint.bottom - footprint.top,
      {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      },
    );
  const mountain = recipe.postprocess === "square-mountain-ground-reference";
  const ground = await (
    mountain ? groundPipeline.greyscale().tint("#718391") : groundPipeline
  )
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const provider = await sharp(await readFile(destination))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (mountain && (recipe.bodyOffsetY ?? 0) > 0) {
    provider.data.set(
      shiftRgbaDown(
        provider.data,
        provider.info.width,
        provider.info.height,
        recipe.bodyOffsetY ?? 0,
      ),
    );
  }
  const upperLateralSafety = 8;
  for (let y = 0; y < footprint.top; y += 1) {
    for (let x = 0; x < upperLateralSafety; x += 1) {
      const retained = x / upperLateralSafety;
      for (const safeX of [x, provider.info.width - 1 - x]) {
        const alpha = (y * provider.info.width + safeX) * 4 + 3;
        provider.data[alpha] = Math.round(
          (provider.data[alpha] ?? 0) * retained,
        );
      }
    }
  }
  let providerLayer: Buffer;
  if (mountain) {
    const fadeStart = 200 + (recipe.bodyOffsetY ?? 0);
    const fadeEnd = 304 + (recipe.bodyOffsetY ?? 0);
    for (let y = fadeStart; y < provider.info.height; y += 1) {
      const normalized = Math.min(1, (y - fadeStart) / (fadeEnd - fadeStart));
      const retained = 1 - normalized * normalized * (3 - 2 * normalized);
      for (let x = 0; x < provider.info.width; x += 1) {
        const alpha = (y * provider.info.width + x) * 4 + 3;
        provider.data[alpha] = Math.round(
          (provider.data[alpha] ?? 0) * retained,
        );
      }
    }
    providerLayer = await sharp(provider.data, {
      raw: {
        width: provider.info.width,
        height: provider.info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
  } else {
    providerLayer = await sharp(provider.data, {
      raw: {
        width: provider.info.width,
        height: provider.info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
  }
  await sharp({
    create: {
      width: recipe.outputSize.width,
      height: recipe.outputSize.height,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      { input: ground, left: footprint.left, top: footprint.top },
      { input: providerLayer, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
}

/**
 * Reframes the exact previously accepted PixelLab Mountain without asking the
 * provider to redraw its already-approved silhouette. The square ground is
 * reconstructed from its canonical reference, while pixels which differ from
 * that ground become a translated body layer. Immutable source bytes and their
 * hash are declared by the recipe, so this maintenance path is repeatable.
 */
async function reframeAcceptedSquareMountain(
  destination: string,
  recipe: Recipe,
  source: SourceManifest,
): Promise<void> {
  if (
    recipe.reframeSource === undefined ||
    recipe.reframeSourceSha256 === undefined ||
    recipe.groundReference === undefined ||
    recipe.squareFootprint === undefined ||
    recipe.bodyOffsetY === undefined
  )
    throw new Error(`${recipe.id}: incomplete Mountain reframe contract`);
  const sourceBytes = await readFile(path.join(ROOT, recipe.reframeSource));
  if (sha256(sourceBytes) !== recipe.reframeSourceSha256)
    throw new Error(`${recipe.id}: immutable reframe source hash mismatch`);
  const groundRecipe = source.recipes.find(
    ({ id }) => id === recipe.groundReference,
  );
  if (groundRecipe === undefined)
    throw new Error(
      `Unknown square ground reference ${recipe.groundReference}`,
    );
  const ground = await sharp(path.join(ROOT, groundRecipe.output))
    .ensureAlpha()
    .resize(recipe.outputSize.width, recipe.outputSize.width, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .greyscale()
    .tint("#718391")
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const groundRaw = await sharp(ground)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const accepted = await sharp(sourceBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const body = Buffer.alloc(accepted.data.length);
  const footprintTop = recipe.squareFootprint.top;
  for (let y = 0; y < accepted.info.height; y += 1) {
    for (let x = 0; x < accepted.info.width; x += 1) {
      const offset = (y * accepted.info.width + x) * 4;
      const sourceAlpha = accepted.data[offset + 3] ?? 0;
      let bodyAlpha = sourceAlpha;
      if (y >= footprintTop) {
        const groundOffset =
          ((y - footprintTop) * groundRaw.info.width + x) * 4;
        const difference = Math.max(
          Math.abs(
            (accepted.data[offset] ?? 0) - (groundRaw.data[groundOffset] ?? 0),
          ),
          Math.abs(
            (accepted.data[offset + 1] ?? 0) -
              (groundRaw.data[groundOffset + 1] ?? 0),
          ),
          Math.abs(
            (accepted.data[offset + 2] ?? 0) -
              (groundRaw.data[groundOffset + 2] ?? 0),
          ),
        );
        bodyAlpha = Math.max(0, Math.min(255, (difference - 5) * 28));
      }
      body[offset] = accepted.data[offset] ?? 0;
      body[offset + 1] = accepted.data[offset + 1] ?? 0;
      body[offset + 2] = accepted.data[offset + 2] ?? 0;
      body[offset + 3] = Math.min(sourceAlpha, bodyAlpha);
    }
  }
  const translatedBody = shiftRgbaDown(
    body,
    accepted.info.width,
    accepted.info.height,
    recipe.bodyOffsetY,
  );
  const bodyPng = await sharp(translatedBody, {
    raw: {
      width: accepted.info.width,
      height: accepted.info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  await sharp({
    create: {
      width: recipe.outputSize.width,
      height: recipe.outputSize.height,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      { input: ground, left: 0, top: footprintTop },
      { input: bodyPng, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
  await assertSquareTerrainAlpha(destination, recipe);
}

function shiftRgbaDown(
  input: Buffer,
  width: number,
  height: number,
  offsetY: number,
): Buffer {
  if (offsetY === 0) return Buffer.from(input);
  const shifted = Buffer.alloc(input.length);
  const copiedRows = Math.max(0, height - offsetY);
  input.copy(shifted, offsetY * width * 4, 0, copiedRows * width * 4);
  return shifted;
}

async function assertSquareTerrainAlpha(
  file: string,
  recipe: Recipe,
): Promise<void> {
  const footprint = recipe.squareFootprint;
  if (footprint === undefined)
    throw new Error(`${recipe.id}: square footprint missing`);
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = footprint.top; y < footprint.bottom; y += 1) {
    for (let x = footprint.left; x < footprint.right; x += 1) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 255)
        throw new Error(
          `${recipe.id}: square footprint has non-opaque pixel ${x},${y}`,
        );
    }
  }
  if (footprint.top > 0) {
    for (let y = 0; y < footprint.top; y += 1) {
      for (const x of [0, info.width - 1]) {
        if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 0)
          throw new Error(
            `${recipe.id}: upward overhang reaches lateral canvas edge ${x},${y}`,
          );
      }
    }
  }
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

async function deriveSpritePortrait(
  reference: Buffer,
  recipe: Recipe,
  destination: string,
): Promise<void> {
  const safe = recipe.hardBounds;
  const width = safe.right - safe.left;
  const height = safe.bottom - safe.top;
  const fitted = await sharp(reference)
    .trim({ background: "#00000000" })
    .resize({
      width,
      height,
      fit: "contain",
      background: "#00000000",
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const metadata = await sharp(fitted).metadata();
  const fittedWidth = metadata.width ?? width;
  const fittedHeight = metadata.height ?? height;
  await sharp({
    create: {
      width: recipe.outputSize.width,
      height: recipe.outputSize.height,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      {
        input: fitted,
        left: safe.left + Math.floor((width - fittedWidth) / 2),
        top: safe.top + Math.floor((height - fittedHeight) / 2),
      },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destination);
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
        : recipe.postprocess === "unit-fit"
          ? (recipe.preferredBounds ?? recipe.hardBounds)
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
    recipe.postprocess === "unit-fit" ||
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
  if (recipe.fitOffsetX !== undefined && recipe.fitOffsetX !== 0) {
    inspection = await inspectPng(destination);
    const shifted = {
      ...inspection.alphaBounds,
      left: inspection.alphaBounds.left + recipe.fitOffsetX,
      right: inspection.alphaBounds.right + recipe.fitOffsetX,
    };
    if (
      shifted.left < recipe.hardBounds.left ||
      shifted.right > recipe.hardBounds.right
    )
      throw new Error(
        `${recipe.id} deterministic x offset exceeds hard bounds`,
      );
    await translatePng(
      destination,
      recipe.outputSize.width,
      recipe.outputSize.height,
      recipe.fitOffsetX,
      0,
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
    if (
      recipe.reframeSource !== undefined &&
      recipe.reframeSourceSha256 !== undefined
    ) {
      const reframeSource = await readFile(
        path.join(ROOT, recipe.reframeSource),
      );
      if (sha256(reframeSource) !== recipe.reframeSourceSha256)
        throw new Error(`Reframe source hash mismatch for ${recipe.id}`);
    }
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
    if (
      recipe.postprocess === "square-ground-fill" ||
      recipe.postprocess === "square-farm-fill" ||
      recipe.postprocess === "square-road-material" ||
      recipe.postprocess === "square-tall-ground-reference" ||
      recipe.postprocess === "square-mountain-ground-reference"
    )
      await assertSquareTerrainAlpha(path.join(ROOT, recipe.output), recipe);
    if (inspection.sha256 !== record.outputSha256)
      throw new Error(`Hash mismatch for ${recipe.id}`);
    if (recipe.postprocess === "sprite-derived-portrait") {
      const sourceId = recipe.styleReference;
      if (
        sourceId === undefined ||
        generated.records[sourceId]?.status !== "ACCEPTED" ||
        record.request?.styleReference?.id !== sourceId ||
        record.request.styleReference.sha256 !==
          generated.records[sourceId]?.outputSha256
      )
        throw new Error(`Derived portrait provenance mismatch: ${recipe.id}`);
    }
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
  if (generated.records["terrain-square-road-material"]?.status === "ACCEPTED")
    await validateSquareRoadMasks(
      generated.records["terrain-square-road-material"],
    );
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

async function validateSquareRoadMasks(
  sourceRecord: GenerationRecord,
): Promise<void> {
  const parsed = JSON.parse(
    await readFile(SQUARE_ROAD_MASK_MANIFEST_PATH, "utf8"),
  ) as {
    readonly schemaVersion: number;
    readonly algorithm: string;
    readonly deterministicProcessing: {
      readonly sourceSha256: string;
      readonly directionBitOrder: readonly string[];
      readonly adjacencySemantics: string;
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
    parsed.algorithm !== "orthogonal-square-road-mask-v1" ||
    parsed.records.length !== 16 ||
    parsed.deterministicProcessing.sourceSha256 !== sourceRecord.outputSha256 ||
    JSON.stringify(parsed.deterministicProcessing.directionBitOrder) !==
      JSON.stringify(["NORTH", "EAST", "SOUTH", "WEST"]) ||
    !parsed.deterministicProcessing.adjacencySemantics.includes(
      "exact midpoint",
    ) ||
    !parsed.deterministicProcessing.diagonalSemantics.includes("No diagonal")
  )
    throw new Error("Square Road-mask deterministic manifest mismatch");
  for (let mask = 0; mask < 16; mask += 1) {
    const record = parsed.records[mask];
    const bits = mask.toString(2).padStart(4, "0");
    if (
      record?.id !== `terrain-square-road-mask-${bits}` ||
      record.mask !== mask ||
      record.bits !== bits ||
      record.width !== 256 ||
      record.height !== 256 ||
      !record.accepted
    )
      throw new Error(`Square Road-mask record mismatch: ${bits}`);
    const output = await readFile(path.join(ROOT, record.output));
    if (sha256(output) !== record.sha256)
      throw new Error(`Square Road-mask hash mismatch: ${bits}`);
  }
}

async function syncRuntime(
  source: SourceManifest,
  generated: GeneratedManifest,
): Promise<void> {
  const accepted = source.recipes.filter(
    (recipe) => generated.records[recipe.id]?.status === "ACCEPTED",
  );
  const roadMaskSourceAccepted =
    generated.records["terrain-road-material"]?.status === "ACCEPTED";
  const acceptedAliases = (source.aliases ?? []).filter(
    (alias) =>
      generated.records[alias.source]?.status === "ACCEPTED" ||
      (roadMaskSourceAccepted && isDerivedRoadMaskId(alias.source)),
  );
  const acceptedRoadMasks = roadMaskSourceAccepted
    ? Array.from({ length: 16 }, (_, mask) => {
        const bits = mask.toString(2).padStart(4, "0");
        return {
          id: `terrain-road-mask-${bits}`,
          output: `public/assets/pixellab/terrain/road-masks/road-mask-${bits}.png`,
        };
      })
    : [];
  const squareRoadMaskSourceAccepted =
    generated.records["terrain-square-road-material"]?.status === "ACCEPTED";
  const acceptedSquareRoadMasks = squareRoadMaskSourceAccepted
    ? Array.from({ length: 16 }, (_, mask) => {
        const bits = mask.toString(2).padStart(4, "0");
        return {
          id: `terrain-square-road-mask-${bits}`,
          output: `public/assets/pixellab/terrain-square/road-masks/road-mask-${bits}.png`,
        };
      })
    : [];
  const entries = [
    ...accepted.map((recipe) => ({ id: recipe.id, output: recipe.output })),
    ...acceptedAliases.map((alias) => {
      const recipe = source.recipes.find((entry) => entry.id === alias.source);
      if (recipe !== undefined) return { id: alias.id, output: recipe.output };
      if (isDerivedRoadMaskId(alias.source)) {
        const bits = alias.source.slice(-4);
        return {
          id: alias.id,
          output: `public/assets/pixellab/terrain/road-masks/road-mask-${bits}.png`,
        };
      }
      throw new Error(`Unknown alias source ${alias.source}`);
    }),
    ...acceptedRoadMasks,
    ...acceptedSquareRoadMasks,
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

function isDerivedRoadMaskId(id: string): boolean {
  return /^terrain-road-mask-[01]{4}$/.test(id);
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
        .resize({
          width: 240,
          height: 240,
          fit: "contain",
          background: "#00000000",
        })
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
