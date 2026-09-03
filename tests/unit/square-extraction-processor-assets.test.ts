import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";

const IDS = [
  "building-square-lumber-camp",
  "building-square-mine",
  "building-square-sawmill",
  "building-square-forge",
  "building-square-stoneworks",
] as const;
const HASHES = [
  "c3511299607d3524ba6fdd2828d4bef9c0ad50e9a35cd47d5abdf30d2d46479c",
  "a41a9f6819d2cd3b676661461942936d37fb532808854c87367260454faf1ed8",
  "bc51ef67bba41d32d23d6ea4a2965d46f05b96fa3351bba4033c2c723df84688",
  "010ddd99d7f399edd6b73441f2d2a9713e7664a5cc5e8ab39ccae127ea7ed96a",
  "47b1df228852d309078de50eb587a79be143251fa77d2b38d89d0b02d1d340eb",
] as const;
const ALPHA_BOUNDS = [
  { left: 86, top: 164, right: 170, bottom: 244, empty: false },
  { left: 88, top: 158, right: 167, bottom: 244, empty: false },
  { left: 86, top: 109, right: 298, bottom: 316, empty: false },
  { left: 90, top: 88, right: 294, bottom: 316, empty: false },
  { left: 88, top: 95, right: 296, bottom: 316, empty: false },
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

describe("square extraction and processor art", () => {
  it("defines exactly the ordered 2+3 PixelLab family with reproducible geometry", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter(({ id }) =>
      IDS.includes(id as (typeof IDS)[number]),
    );
    expect(recipes.map(({ id }) => id)).toEqual([...IDS]);
    expect(recipes.map(({ seed }) => seed)).toEqual([
      107201, 107202, 107203, 107204, 107205,
    ]);
    expect(recipes.every((recipe) => recipe.class === "buildings")).toBe(true);
    expect(recipes.every((recipe) => recipe.stage === "batch")).toBe(true);
    expect(recipes.map(({ requestSize }) => requestSize)).toEqual([
      { width: 256, height: 296 },
      { width: 256, height: 296 },
      { width: 384, height: 384 },
      { width: 384, height: 384 },
      { width: 384, height: 384 },
    ]);
    expect(recipes.map(({ anchor }) => anchor)).toEqual([
      { x: 128, y: 222 },
      { x: 128, y: 222 },
      { x: 192, y: 288 },
      { x: 192, y: 288 },
      { x: 192, y: 288 },
    ]);
    for (const recipe of recipes) {
      expect(recipe.postprocess, recipe.id).toBe("compact-building-fit");
      expect(recipe.styleReference, recipe.id).toBeTruthy();
      expect(recipe.styleReferenceUsage?.length, recipe.id).toBeGreaterThan(
        180,
      );
      expect(recipe.preferredBounds, recipe.id).toBeTruthy();
      expect(recipe.fitBounds, recipe.id).toBeTruthy();
      expect(recipe.groundContactY, recipe.id).toBeGreaterThan(0);
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(500);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(350);
      expect(recipe.output, recipe.id).toBe(
        `public/assets/pixellab/buildings-square/${recipe.id.replace("building-square-", "")}.png`,
      );
    }
    const pipeline = await readFile("scripts/art/pixellab.ts", "utf8");
    expect(pipeline).toContain(
      "Square extraction/processor generation must use exactly Lumber Camp + Mine or Sawmill + Forge + Stoneworks in manifest order",
    );
    expect(pipeline).toContain(
      "Accept the square extraction family before processors",
    );
  });

  it("records five accepted provider sources, exact requests and zero rejection history", async () => {
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
      const output = await readFile(recipe.output);
      expect(hash(output), id).toBe(HASHES[index]);
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/${recipe.output.replace(/^public\//, "")}`,
      );
    }
  });

  it("keeps every transparent source away from left, right and bottom overflow", async () => {
    for (const [index, id] of IDS.entries()) {
      const file = `public/assets/pixellab/buildings-square/${id.replace("building-square-", "")}.png`;
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width, id).toBe(index < 2 ? 256 : 384);
      expect(info.height, id).toBe(index < 2 ? 296 : 384);
      for (let x = 0; x < info.width; x += 1)
        expect(data[((info.height - 1) * info.width + x) * 4 + 3], id).toBe(0);
      for (let y = 0; y < info.height; y += 1) {
        expect(data[y * info.width * 4 + 3], id).toBe(0);
        expect(data[(y * info.width + info.width - 1) * 4 + 3], id).toBe(0);
      }
      expect(ALPHA_BOUNDS[index]?.bottom, id).toBeLessThan(info.height - 1);
    }
  });

  it("keeps runtime coverage deferred and hashes every deterministic review artifact and accepted unit", async () => {
    const [coverage, bindings, evidenceText] = await Promise.all([
      readFile("src/render/canvas/asset-coverage-v6.ts", "utf8"),
      readFile("src/render/canvas/pixellab-asset-bindings.ts", "utf8"),
      readFile(
        "art/pixellab/reviews/square-extraction-processors/review-evidence.json",
        "utf8",
      ),
    ]);
    for (const id of IDS) {
      expect(coverage, id).not.toContain(id);
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
      readonly processorContexts: {
        readonly contributors: readonly number[];
        readonly sawmillLiveLevelSquares: readonly number[];
        readonly forgeLiveLevelSquares: readonly number[];
        readonly stoneworksLiveLevelSquares: readonly number[];
        readonly stoneworksOppositePairsIncluded: boolean;
        readonly levelSquaresWrapAfter: number;
      };
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
      pixelLabFamilyRequests: 2,
      pixelLabSourceCalls: 5,
      acceptedSources: 5,
      rejectedSources: 0,
      providerRejections: [],
      runtimeCoverageSwitched: false,
    });
    expect(evidence.processorContexts).toEqual({
      factions: ["ORIGINAL", "CANDY"],
      contributors: [0, 1, 4, 8],
      sawmillLiveLevelSquares: [0, 1, 4, 8],
      forgeLiveLevelSquares: [0, 2, 8, 16],
      stoneworksLiveLevelSquares: [0, 1, 8, 16],
      stoneworksOppositePairsIncluded: true,
      marksAreCodeNative: true,
      levelSquaresWrapAfter: 8,
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
