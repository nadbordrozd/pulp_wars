import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const families = {
  grass: [1, 2, 3, 4].map((variant) => `terrain-square-candy-grass-${variant}`),
  forest: [1, 2, 3, 4].map(
    (variant) => `terrain-square-candy-forest-${variant}`,
  ),
  mountain: [1, 2, 3].map(
    (variant) => `terrain-square-candy-mountain-${variant}`,
  ),
} as const;
const ids = [...families.grass, ...families.forest, ...families.mountain];

interface Recipe {
  readonly id: string;
  readonly stage: string;
  readonly seed: number;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly squareFootprint?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly groundReference?: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly request?: {
    readonly seed: number;
    readonly squareFootprint?: unknown;
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
    readonly groundReference?: {
      readonly id: string;
      readonly sha256?: string;
    };
  };
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly notes?: string;
  }[];
}

describe("Candy square terrain family", () => {
  it("defines the exact 4/4/3 inventory and six bounded provider groups", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const square = source.recipes.filter(({ id }) =>
      id.startsWith("terrain-square-candy-"),
    );
    expect(square.map(({ id }) => id)).toEqual([
      families.grass[0],
      families.forest[0],
      families.mountain[0],
      ...families.grass.slice(1),
      ...families.forest.slice(1),
      ...families.mountain.slice(1),
    ]);
    expect(square.filter(({ stage }) => stage === "sample")).toHaveLength(3);
    expect(square.filter(({ stage }) => stage === "batch")).toHaveLength(8);
    for (const recipe of square) {
      const grass = recipe.id.includes("-grass-");
      const size = grass
        ? { width: 256, height: 256 }
        : { width: 256, height: 384 };
      const footprint = grass
        ? { left: 0, top: 0, right: 256, bottom: 256 }
        : { left: 0, top: 128, right: 256, bottom: 384 };
      expect(recipe.requestSize, recipe.id).toEqual(size);
      expect(recipe.outputSize, recipe.id).toEqual(size);
      expect(recipe.anchor, recipe.id).toEqual(
        grass ? { x: 128, y: 128 } : { x: 128, y: 256 },
      );
      expect(recipe.squareFootprint, recipe.id).toEqual(footprint);
      expect(recipe.postprocess, recipe.id).toBe(
        grass
          ? "square-ground-fill"
          : recipe.id.includes("-forest-")
            ? "square-tall-ground-reference"
            : "square-mountain-ground-reference",
      );
      expect(recipe.seed, recipe.id).toBeGreaterThan(105_000);
      expect(recipe.output, recipe.id).toBe(
        `public/assets/pixellab/terrain-square/${recipe.id.replace("terrain-square-", "")}.png`,
      );
      if (!grass)
        expect(recipe.groundReference, recipe.id).toBe(
          "terrain-square-candy-grass-1",
        );
      expect(recipe.styleReference, recipe.id).toBeDefined();
    }
    const pipeline = await readFile("scripts/art/pixellab.ts", "utf8");
    expect(pipeline).toContain(
      "Candy square terrain batches may contain at most three assets",
    );
    expect(pipeline).toContain(
      "Do not mix Candy square terrain family batches",
    );
    expect(pipeline).toContain("generatedSaveChain");
  });

  it("records accepted PixelLab outputs, exact provenance, alpha and rejection history", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    const expectedRejections: Readonly<Record<string, number>> = {
      "terrain-square-candy-forest-1": 1,
      "terrain-square-candy-forest-3": 2,
      "terrain-square-candy-mountain-2": 1,
    };
    const hashes = new Set<string>();
    for (const id of ids) {
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(recipe, id).toBeDefined();
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.request?.seed, id).toBe(recipe?.seed);
      expect(record?.request?.squareFootprint, id).toEqual(
        recipe?.squareFootprint,
      );
      expect(record?.rejectedAttempts ?? [], id).toHaveLength(
        expectedRejections[id] ?? 0,
      );
      for (const rejected of record?.rejectedAttempts ?? []) {
        expect(rejected.candidate).toMatch(/^art\/pixellab\/quarantine\//);
        expect(rejected.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(rejected.notes?.length).toBeGreaterThan(100);
        expect(hash(await readFile(rejected.candidate))).toBe(
          rejected.candidateSha256,
        );
      }
      if (recipe === undefined) throw new Error(`Recipe missing: ${id}`);
      const bytes = await readFile(recipe.output);
      expect(hash(bytes), id).toBe(record?.outputSha256);
      expect(hashes.has(hash(bytes)), id).toBe(false);
      hashes.add(hash(bytes));
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect({ width: info.width, height: info.height }, id).toEqual(
        recipe.outputSize,
      );
      const footprint = recipe.squareFootprint;
      if (footprint === undefined) throw new Error(`Footprint missing: ${id}`);
      let nonOpaqueFootprintPixels = 0;
      for (let y = footprint.top; y < footprint.bottom; y += 1)
        for (let x = footprint.left; x < footprint.right; x += 1)
          if (data[(y * info.width + x) * 4 + 3] !== 255)
            nonOpaqueFootprintPixels += 1;
      expect(nonOpaqueFootprintPixels, id).toBe(0);
      let upperLateralAlphaPixels = 0;
      for (let y = 0; y < footprint.top; y += 1) {
        if (data[y * info.width * 4 + 3] !== 0) upperLateralAlphaPixels += 1;
        if (data[(y * info.width + info.width - 1) * 4 + 3] !== 0)
          upperLateralAlphaPixels += 1;
      }
      expect(upperLateralAlphaPixels, id).toBe(0);
      if (!id.includes("-grass-")) {
        expect(record?.request?.groundReference?.id, id).toBe(
          "terrain-square-candy-grass-1",
        );
        expect(record?.request?.groundReference?.sha256, id).toBe(
          generated.records["terrain-square-candy-grass-1"]?.outputSha256,
        );
      }
    }
  }, 60_000);

  it("keeps every Grass edge exact, opaque and terrain-quiet", async () => {
    const edge = [0x6f, 0x92, 0x55, 0xff] as const;
    const hashes = new Set<string>();
    for (const id of families.grass) {
      const bytes = await readFile(
        `public/assets/pixellab/terrain-square/${id.replace("terrain-square-", "")}.png`,
      );
      hashes.add(hash(bytes));
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let mismatchedEdgePixels = 0;
      for (let x = 0; x < info.width; x += 1) {
        if (!samePixel(pixel(data, info.width, x, 0), edge))
          mismatchedEdgePixels += 1;
        if (!samePixel(pixel(data, info.width, x, info.height - 1), edge))
          mismatchedEdgePixels += 1;
      }
      for (let y = 0; y < info.height; y += 1) {
        if (!samePixel(pixel(data, info.width, 0, y), edge))
          mismatchedEdgePixels += 1;
        if (!samePixel(pixel(data, info.width, info.width - 1, y), edge))
          mismatchedEdgePixels += 1;
      }
      expect(mismatchedEdgePixels, id).toBe(0);
      const minima = [255, 255, 255];
      const maxima = [0, 0, 0];
      for (let index = 0; index < info.width * info.height; index += 1)
        for (let channel = 0; channel < 3; channel += 1) {
          const value = data[index * 4 + channel] ?? 0;
          minima[channel] = Math.min(minima[channel] ?? 255, value);
          maxima[channel] = Math.max(maxima[channel] ?? 0, value);
        }
      const ranges = maxima.map(
        (maximum, channel) => maximum - (minima[channel] ?? 0),
      );
      expect(Math.max(...ranges), id).toBeLessThanOrEqual(5);
    }
    expect(hashes).toHaveLength(4);
  }, 30_000);

  it("preserves diamond Candy terrain and both representative unit rasters", async () => {
    const baselines: Readonly<Record<string, string>> = {
      "public/assets/pixellab/terrain/candy-grass-1.png":
        "3efa473e2c67f746fac9371dfaafb4e36e4ac0f53143db9ce36950ea3a912ba2",
      "public/assets/pixellab/terrain/candy-grass-2.png":
        "2d011f22093d6ba51b2e240b85e2128869b3ba2ba2c338a2b76e6d4326a2c6db",
      "public/assets/pixellab/terrain/candy-grass-3.png":
        "55d3607fa679de5bb240cc319cd2974f784798331ccc398e5be2d27641dbbd17",
      "public/assets/pixellab/terrain/candy-grass-4.png":
        "f41a7529506eb0a8e274fe6f085daddd0dd63fd7d31e95bff01aaccf9eb78bed",
      "public/assets/pixellab/terrain/candy-forest-1.png":
        "03ffe1474c446cdebd00b762614569e4122e60a082116b5cbd1aefbd4c0d4589",
      "public/assets/pixellab/terrain/candy-forest-2.png":
        "2a3338d0e7339cc9449d902bf89340f212a183e1c813b0104623ea32795b31f1",
      "public/assets/pixellab/terrain/candy-forest-3.png":
        "29474ad6e3839c379bd940242bd541dda5179811e1cd143042de9fad1134ffcc",
      "public/assets/pixellab/terrain/candy-forest-4.png":
        "0615474a05c5cb6e9ab9ef030fa408e1fa9e383f0add9478ed424af80d3d3e79",
      "public/assets/pixellab/terrain/candy-mountain-1.png":
        "9c3c0592d92cee0cde21ec064734c175357cf9dfa9b29023bc21d24c668124af",
      "public/assets/pixellab/terrain/candy-mountain-2.png":
        "67b9bbea25b4f474de34695e3c98cf37412e2166bfd211b10d68d9101c654af2",
      "public/assets/pixellab/terrain/candy-mountain-3.png":
        "4c6921bb9edfd152a1f5243962779e38ed851e177fa84a9e4216c9c9c4567ee1",
      "public/assets/pixellab/units/warrior.png":
        "d606459210df2297706816957f4c62f3dea01f2324ba32641dc9fbbf3e9590a1",
      "public/assets/pixellab/units/candy-warrior.png":
        "76456b060ba1701e75387285b4738d4c289c0617eb852f5552beadfe2eb1a2bc",
    };
    for (const [file, expected] of Object.entries(baselines))
      expect(hash(await readFile(file)), file).toBe(expected);
    const coverage = await readFile(
      "src/render/canvas/asset-coverage-v6.ts",
      "utf8",
    );
    const bindings = await readFile(
      "src/render/canvas/pixellab-asset-bindings.ts",
      "utf8",
    );
    expect(coverage).not.toContain("terrain-square-candy-");
    expect(bindings).not.toContain("terrain-square-candy-");
  });

  it("checks in complete deterministic comparison and gameplay evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/square-candy-terrain/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly generatedBy: string;
      readonly gate: string;
      readonly statuses: Readonly<Record<string, string>>;
      readonly boundedProviderBatches: readonly (readonly string[])[];
      readonly displayChecks: {
        readonly footprintCssPixels: readonly number[];
        readonly zooms: readonly number[];
        readonly devicePixelRatios: readonly number[];
        readonly unitSources: readonly string[];
        readonly unitBytesChanged: boolean;
        readonly overlays: readonly string[];
      };
      readonly mechanicsIsolation: {
        readonly runtimeCoverageChanged: boolean;
        readonly simulationPrngRead: boolean;
      };
      readonly measurements: readonly {
        readonly nonOpaqueFootprintPixels: number;
        readonly upperLateralAlphaPixels: number;
      }[];
      readonly familyDifferences: Readonly<
        Record<
          string,
          readonly { readonly meanAbsoluteRgbDifference: number }[]
        >
      >;
      readonly generationSummary: {
        readonly providerCalls: Readonly<Record<string, number>>;
        readonly rejectedAttempts: Readonly<Record<string, number>>;
      };
      readonly visualReview: { readonly status: string };
      readonly artifacts: readonly {
        readonly path: string;
        readonly bytes: number;
        readonly width: number;
        readonly height: number;
        readonly sha256: string;
      }[];
    };
    expect(evidence.generatedBy).toBe(
      "npm run art:square-candy-terrain-review",
    );
    expect(evidence.gate).toBe("CANDY_SQUARE_TERRAIN_FAMILY");
    expect(evidence.statuses).toEqual(
      Object.fromEntries(ids.map((id) => [id, "ACCEPTED"])),
    );
    expect(
      evidence.boundedProviderBatches.map((batch) => batch.length),
    ).toEqual([1, 1, 1, 3, 3, 2]);
    expect(evidence.displayChecks).toMatchObject({
      footprintCssPixels: [80, 128, 224],
      zooms: [0.625, 1, 1.75],
      devicePixelRatios: [1, 2],
      unitSources: ["unit-warrior", "unit-candy-warrior"],
      unitBytesChanged: false,
      overlays: [
        "OWNERSHIP",
        "SELECTION",
        "MOVEMENT_TARGET",
        "FOG_WITHHOLDING",
      ],
    });
    expect(evidence.mechanicsIsolation).toMatchObject({
      runtimeCoverageChanged: false,
      simulationPrngRead: false,
    });
    expect(evidence.measurements).toHaveLength(11);
    for (const measurement of evidence.measurements) {
      expect(measurement.nonOpaqueFootprintPixels).toBe(0);
      expect(measurement.upperLateralAlphaPixels).toBe(0);
    }
    for (const difference of evidence.familyDifferences.grass ?? []) {
      expect(difference.meanAbsoluteRgbDifference).toBeGreaterThan(0);
      expect(difference.meanAbsoluteRgbDifference).toBeLessThan(1);
    }
    for (const family of ["forest", "mountain"])
      for (const difference of evidence.familyDifferences[family] ?? [])
        expect(difference.meanAbsoluteRgbDifference, family).toBeGreaterThan(2);
    expect(evidence.generationSummary.rejectedAttempts).toEqual({
      "terrain-square-candy-grass-1": 0,
      "terrain-square-candy-grass-2": 0,
      "terrain-square-candy-grass-3": 0,
      "terrain-square-candy-grass-4": 0,
      "terrain-square-candy-forest-1": 1,
      "terrain-square-candy-forest-2": 0,
      "terrain-square-candy-forest-3": 2,
      "terrain-square-candy-forest-4": 0,
      "terrain-square-candy-mountain-1": 0,
      "terrain-square-candy-mountain-2": 1,
      "terrain-square-candy-mountain-3": 0,
    });
    expect(evidence.generationSummary.providerCalls).toEqual({
      "terrain-square-candy-grass-1": 1,
      "terrain-square-candy-grass-2": 1,
      "terrain-square-candy-grass-3": 1,
      "terrain-square-candy-grass-4": 1,
      "terrain-square-candy-forest-1": 2,
      "terrain-square-candy-forest-2": 1,
      "terrain-square-candy-forest-3": 3,
      "terrain-square-candy-forest-4": 1,
      "terrain-square-candy-mountain-1": 1,
      "terrain-square-candy-mountain-2": 2,
      "terrain-square-candy-mountain-3": 1,
    });
    expect(evidence.visualReview.status).toBe(
      "ACCEPTED_CANDY_SQUARE_TERRAIN_FAMILY",
    );
    expect(evidence.artifacts).toHaveLength(12);
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(artifact.path);
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(hash(bytes)).toBe(artifact.sha256);
      const metadata = await sharp(bytes).metadata();
      expect(metadata.width).toBe(artifact.width);
      expect(metadata.height).toBe(artifact.height);
    }
  }, 60_000);
});

function hash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function pixel(
  data: Buffer,
  width: number,
  x: number,
  y: number,
): readonly number[] {
  const offset = (y * width + x) * 4;
  return [
    data[offset] ?? 0,
    data[offset + 1] ?? 0,
    data[offset + 2] ?? 0,
    data[offset + 3] ?? 0,
  ];
}

function samePixel(
  actual: readonly number[],
  expected: readonly number[],
): boolean {
  return actual.every((value, index) => value === expected[index]);
}
