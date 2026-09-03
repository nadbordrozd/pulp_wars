import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import { improvementCoverageV6 } from "../../src/render/canvas/asset-coverage-v6";

const IDS = [
  "building-square-workshop",
  "building-square-grand-works",
  "building-square-market",
] as const;
const HASHES = [
  "6fb28673147cd9b0c875a6d10aaec4d7673ce577cf2edb3e7814b24ef265fbbb",
  "e5407270dc3c55eec4b9ee34c913afe7f79c0426a4ba8933ae82bfdd18bc50cf",
  "2351c318e26d7ca18b12ec8fa9db7907e5fcd518c9a1242afc1d3bc85f1f727b",
] as const;
const ALPHA_BOUNDS = [
  { left: 99, top: 104, right: 284, bottom: 316, empty: false },
  { left: 80, top: 80, right: 304, bottom: 316, empty: false },
  { left: 90, top: 92, right: 293, bottom: 316, empty: false },
] as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly empty?: boolean;
}

interface Recipe {
  readonly id: string;
  readonly class: string;
  readonly stage: string;
  readonly seed: number;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly fitBounds?: Bounds;
  readonly groundContactY?: number;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly styleReferenceUsage?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly notes?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly unknown[];
  readonly request?: {
    readonly seed: number;
    readonly requestSize: { readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly postprocess?: string;
    readonly groundContactY?: number;
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
  };
}

describe("square civic and commerce improvement art", () => {
  it("defines exactly one ordered Workshop, Grand Works and Market family", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter(({ id }) =>
      IDS.includes(id as (typeof IDS)[number]),
    );
    expect(recipes.map(({ id }) => id)).toEqual([...IDS]);
    expect(recipes.map(({ seed }) => seed)).toEqual([107301, 107302, 107303]);
    for (const recipe of recipes) {
      expect(recipe.class, recipe.id).toBe("buildings");
      expect(recipe.stage, recipe.id).toBe("batch");
      expect(recipe.requestSize, recipe.id).toEqual({
        width: 384,
        height: 384,
      });
      expect(recipe.outputSize, recipe.id).toEqual({ width: 384, height: 384 });
      expect(recipe.anchor, recipe.id).toEqual({ x: 192, y: 288 });
      expect(recipe.groundContactY, recipe.id).toBe(316);
      expect(recipe.hardBounds, recipe.id).toEqual({
        left: 8,
        top: 8,
        right: 376,
        bottom: 344,
      });
      expect(recipe.postprocess, recipe.id).toBe("compact-building-fit");
      expect(recipe.styleReference, recipe.id).toBeTruthy();
      expect(recipe.styleReferenceUsage?.length, recipe.id).toBeGreaterThan(
        180,
      );
      expect(recipe.preferredBounds, recipe.id).toBeTruthy();
      expect(recipe.fitBounds, recipe.id).toBeTruthy();
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(500);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(300);
      expect(recipe.output, recipe.id).toBe(
        `public/assets/pixellab/buildings-square/${recipe.id.replace("building-square-", "")}.png`,
      );
    }
    expect(await readFile("scripts/art/pixellab.ts", "utf8")).toContain(
      "Square civic/commerce generation must use exactly Workshop + Grand Works + Market in one manifest-ordered request",
    );
  });

  it("records three accepted provider sources with exact requests and no rejections", async () => {
    const [sourceText, generatedText] = await Promise.all([
      readFile("scripts/art/pixellab-manifest.json", "utf8"),
      readFile("scripts/art/pixellab-generated.json", "utf8"),
    ]);
    const source = JSON.parse(sourceText) as {
      readonly recipes: readonly Recipe[];
    };
    const generated = JSON.parse(generatedText) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    for (const [index, id] of IDS.entries()) {
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.jobId, id).toMatch(/^[a-f0-9-]{36}$/);
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.candidateSha256, id).toBe(HASHES[index]);
      expect(record?.outputSha256, id).toBe(HASHES[index]);
      expect(record?.alphaBounds, id).toEqual(ALPHA_BOUNDS[index]);
      expect(record?.rejectedAttempts ?? [], id).toEqual([]);
      expect(record?.request, id).toMatchObject({
        seed: recipe?.seed,
        requestSize: recipe?.requestSize,
        outputSize: recipe?.outputSize,
        postprocess: recipe?.postprocess,
        groundContactY: recipe?.groundContactY,
        styleReference: { id: recipe?.styleReference },
      });
      expect(record?.request?.styleReference?.sha256, id).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.notes?.length, id).toBeGreaterThan(500);
      if (recipe === undefined) continue;
      expect(hash(await readFile(recipe.output)), id).toBe(HASHES[index]);
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/${recipe.output.replace(/^public\//, "")}`,
      );
    }
  });

  it("keeps transparent alpha within upward-only square processor bounds", async () => {
    for (const [index, id] of IDS.entries()) {
      const file = `public/assets/pixellab/buildings-square/${id.replace("building-square-", "")}.png`;
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info).toMatchObject({ width: 384, height: 384, channels: 4 });
      for (let x = 0; x < info.width; x += 1)
        expect(data[((info.height - 1) * info.width + x) * 4 + 3], id).toBe(0);
      for (let y = 0; y < info.height; y += 1) {
        expect(data[y * info.width * 4 + 3], id).toBe(0);
        expect(data[(y * info.width + info.width - 1) * 4 + 3], id).toBe(0);
      }
      expect(ALPHA_BOUNDS[index]?.left, id).toBeGreaterThanOrEqual(80);
      expect(ALPHA_BOUNDS[index]?.right, id).toBeLessThanOrEqual(304);
      expect(ALPHA_BOUNDS[index]?.bottom, id).toBe(316);
    }
  });

  it("switches current runtime coverage and pins dense economy evidence plus unit bytes", async () => {
    const [bindings, evidenceText] = await Promise.all([
      readFile("src/render/canvas/pixellab-asset-bindings.ts", "utf8"),
      readFile(
        "art/pixellab/reviews/square-civic-commerce/review-evidence.json",
        "utf8",
      ),
    ]);
    const improvements = ["WORKSHOP", "GRAND_WORKS", "MARKET"] as const;
    for (const [index, id] of IDS.entries()) {
      expect(
        improvementCoverageV6(improvements[index] ?? "WORKSHOP"),
        id,
      ).toMatchObject({ assetId: id });
      expect(bindings, id).not.toContain(id);
    }
    const evidence = JSON.parse(evidenceText) as {
      readonly status: string;
      readonly pixelLabFamilyRequests: number;
      readonly pixelLabSourceCalls: number;
      readonly acceptedSources: number;
      readonly rejectedSources: number;
      readonly providerRejections: readonly unknown[];
      readonly runtimeCoverageSwitched: boolean;
      readonly economyContexts: Record<string, unknown>;
      readonly acceptedUnitByteHashes: Readonly<Record<string, string>>;
      readonly reviewCoverage: readonly string[];
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence).toMatchObject({
      status: "READY_FOR_ORCHESTRATOR_REVIEW",
      pixelLabFamilyRequests: 1,
      pixelLabSourceCalls: 3,
      acceptedSources: 3,
      rejectedSources: 0,
      providerRejections: [],
      runtimeCoverageSwitched: false,
    });
    expect(evidence.economyContexts).toEqual({
      factions: ["ORIGINAL", "CANDY"],
      workshopDistinctBasicContributors: [0, 1, 2, 3, 4],
      workshopPopulationSquares: [0, 1, 2, 3, 4],
      grandWorksAdvancedProcessorContributors: [3, 4],
      grandWorksPopulationSquares: [6, 8],
      marketDistinctFamilyContributors: [0, 1, 2, 3, 4],
      marketIncomeSquares: [0, 1, 2, 3, 4],
      marketCapitalRoadBonusSquares: 5,
      marksAreCodeNative: true,
    });
    expect(evidence.reviewCoverage).toHaveLength(8);
    expect(Object.keys(evidence.acceptedUnitByteHashes).length).toBeGreaterThan(
      15,
    );
    for (const [file, expected] of Object.entries(
      evidence.acceptedUnitByteHashes,
    ))
      expect(hash(await readFile(file)), file).toBe(expected);
    expect(evidence.artifacts).toHaveLength(6);
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(artifact.path);
      expect(bytes.byteLength, artifact.path).toBe(artifact.bytes);
      expect(hash(bytes), artifact.path).toBe(artifact.sha256);
    }
  }, 30_000);
});

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
