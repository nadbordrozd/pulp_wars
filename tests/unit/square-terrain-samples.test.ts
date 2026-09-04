import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const ids = [
  "terrain-square-original-grass-1",
  "terrain-square-original-forest-1",
  "terrain-square-original-mountain-1",
] as const;

describe("square terrain sample gate", () => {
  it("keeps exactly three new square sample recipes separate from diamond art", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly recipes: readonly Record<string, unknown>[];
    };
    const square = source.recipes.filter(
      ({ id, stage }) =>
        typeof id === "string" &&
        id.startsWith("terrain-square-original-") &&
        stage === "sample",
    );
    expect(square.map(({ id }) => id)).toEqual(ids);
    expect(square.map(({ output }) => output)).toEqual([
      "public/assets/pixellab/terrain-square/original-grass-1.png",
      "public/assets/pixellab/terrain-square/original-forest-1.png",
      "public/assets/pixellab/terrain-square/original-mountain-1.png",
    ]);

    const legacyHashes = {
      "public/assets/pixellab/terrain/grass-1.png":
        "2458b996dcaaa4168a4bf9504bc6a68352cfe780b8e4bf4d83ccaec259849a3b",
      "public/assets/pixellab/terrain/forest-1.png":
        "e03c9e39ad7e57e407bbb393b83721b7e10f0b9c9fc07f152abecb7325bdbca5",
      "public/assets/pixellab/terrain/mountain-1.png":
        "725afbf8ac29069ae7c9cc2c7a9474f14b261b7cd8c48bb43c732ba363d84c05",
      "public/assets/pixellab/units/warrior.png":
        "d606459210df2297706816957f4c62f3dea01f2324ba32641dc9fbbf3e9590a1",
    } as const;
    for (const [file, expected] of Object.entries(legacyHashes))
      expect(hash(await readFile(file)), file).toBe(expected);
  });

  it("records accepted generation provenance, serial iterations and exact geometry", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly recipes: readonly {
        readonly id: string;
        readonly output: string;
        readonly outputSize: {
          readonly width: number;
          readonly height: number;
        };
        readonly anchor: { readonly x: number; readonly y: number };
        readonly squareFootprint: {
          readonly left: number;
          readonly top: number;
          readonly right: number;
          readonly bottom: number;
        };
        readonly postprocess: string;
      }[];
    };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<
        Record<
          string,
          {
            readonly status: string;
            readonly outputSha256?: string;
            readonly providerOutputSha256?: string;
            readonly request?: {
              readonly seed: number;
              readonly squareFootprint?: unknown;
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
        >
      >;
    };
    const expectedRejections = [7, 0, 3] as const;
    for (const [index, id] of ids.entries()) {
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(recipe, id).toBeDefined();
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.request?.seed, id).toBeGreaterThan(100_000);
      expect(record?.request?.squareFootprint, id).toEqual(
        recipe?.squareFootprint,
      );
      expect(record?.rejectedAttempts ?? [], id).toHaveLength(
        expectedRejections[index] ?? -1,
      );
      for (const rejected of record?.rejectedAttempts ?? []) {
        expect(rejected.candidate).toMatch(/^art\/pixellab\/quarantine\//);
        expect(rejected.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(rejected.notes?.length).toBeGreaterThan(100);
        expect(hash(await readFile(rejected.candidate))).toBe(
          rejected.candidateSha256,
        );
      }
      if (!recipe) throw new Error(`Recipe missing: ${id}`);
      const file = await readFile(recipe.output);
      expect(hash(file)).toBe(record?.outputSha256);
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect({ width: info.width, height: info.height }).toEqual(
        recipe.outputSize,
      );
      let nonOpaqueFootprintPixels = 0;
      for (
        let y = recipe.squareFootprint.top;
        y < recipe.squareFootprint.bottom;
        y += 1
      )
        for (
          let x = recipe.squareFootprint.left;
          x < recipe.squareFootprint.right;
          x += 1
        ) {
          if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 255)
            nonOpaqueFootprintPixels += 1;
        }
      expect(nonOpaqueFootprintPixels, id).toBe(0);
      let upperLateralAlphaPixels = 0;
      if (recipe.squareFootprint.top > 0) {
        for (let y = 0; y < recipe.squareFootprint.top; y += 1)
          for (const x of [0, info.width - 1])
            if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 0)
              upperLateralAlphaPixels += 1;
      }
      expect(upperLateralAlphaPixels, id).toBe(0);
    }
    expect(generated.records[ids[1]]?.request?.groundReference?.id).toBe(
      ids[0],
    );
    expect(generated.records[ids[2]]?.request?.groundReference?.id).toBe(
      ids[0],
    );
    expect(generated.records[ids[1]]?.request?.groundReference?.sha256).toBe(
      generated.records[ids[0]]?.outputSha256,
    );
    expect(generated.records[ids[2]]?.request?.groundReference?.sha256).toBe(
      generated.records[ids[0]]?.outputSha256,
    );
  }, 20_000);

  it("keeps Grass edges exact and authored variation below repetition salience", async () => {
    const { data, info } = await sharp(
      "public/assets/pixellab/terrain-square/original-grass-1.png",
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const base = [0x6f, 0x92, 0x55, 0xff] as const;
    for (let x = 0; x < info.width; x += 1) {
      expect(pixel(data, info.width, x, 0)).toEqual(base);
      expect(pixel(data, info.width, x, info.height - 1)).toEqual(base);
    }
    for (let y = 0; y < info.height; y += 1) {
      expect(pixel(data, info.width, 0, y)).toEqual(base);
      expect(pixel(data, info.width, info.width - 1, y)).toEqual(base);
    }
    const ranges = [0, 1, 2].map((channel) => {
      const values = Array.from(
        { length: info.width * info.height },
        (_, index) => data[index * 4 + channel] ?? 0,
      );
      return Math.max(...values) - Math.min(...values);
    });
    expect(ranges).toEqual([3, 2, 1]);
  });

  it("reframes every accepted Mountain body downward without moving its square ground", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly recipes: readonly {
        readonly id: string;
        readonly output: string;
        readonly outputSize: {
          readonly width: number;
          readonly height: number;
        };
        readonly groundReference?: string;
        readonly squareFootprint?: { readonly top: number };
        readonly bodyOffsetY?: number;
        readonly reframeSource?: string;
        readonly reframeSourceSha256?: string;
      }[];
    };
    const mountains = source.recipes.filter(
      ({ id }) => id.startsWith("terrain-square-") && id.includes("-mountain-"),
    );
    expect(mountains).toHaveLength(6);

    for (const recipe of mountains) {
      expect(recipe.bodyOffsetY, recipe.id).toBe(40);
      expect(recipe.reframeSource, recipe.id).toMatch(
        /^art\/pixellab\/reframe-sources\/.+\.png$/,
      );
      if (
        recipe.reframeSource === undefined ||
        recipe.reframeSourceSha256 === undefined ||
        recipe.groundReference === undefined ||
        recipe.squareFootprint === undefined
      )
        throw new Error(`Incomplete Mountain reframe fixture: ${recipe.id}`);
      const groundRecipe = source.recipes.find(
        ({ id }) => id === recipe.groundReference,
      );
      if (groundRecipe === undefined)
        throw new Error(`Missing ground fixture: ${recipe.groundReference}`);

      const immutableSource = await readFile(recipe.reframeSource);
      expect(hash(immutableSource), recipe.id).toBe(recipe.reframeSourceSha256);
      const groundPng = await sharp(groundRecipe.output)
        .ensureAlpha()
        .resize(recipe.outputSize.width, recipe.outputSize.width, {
          fit: "fill",
          kernel: sharp.kernel.lanczos3,
        })
        .greyscale()
        .tint("#718391")
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toBuffer();
      const [before, after] = await Promise.all([
        mountainBodyBounds(
          immutableSource,
          groundPng,
          recipe.squareFootprint.top,
        ),
        mountainBodyBounds(
          await readFile(recipe.output),
          groundPng,
          recipe.squareFootprint.top,
        ),
      ]);
      expect(after.minY - before.minY, recipe.id).toBe(40);
      expect(after.maxY - before.maxY, recipe.id).toBe(40);
      expect(after.minY, recipe.id).toBeGreaterThanOrEqual(121);
      expect(after.maxY, recipe.id).toBeLessThanOrEqual(320);
    }
  }, 20_000);

  it("checks in complete deterministic visual-review evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/square-terrain-samples/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly generatedBy: string;
      readonly gate: string;
      readonly sampleIds: readonly string[];
      readonly displayChecks: {
        readonly footprintCssPixels: readonly number[];
        readonly zooms: readonly number[];
        readonly devicePixelRatios: readonly number[];
        readonly unitSourceSha256: string;
        readonly unitBytesChanged: boolean;
        readonly overlays: readonly string[];
      };
      readonly measurements: readonly {
        readonly id: string;
        readonly nonOpaqueFootprintPixels: number;
        readonly upperLateralAlphaPixels: number;
      }[];
      readonly generationSummary: {
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
      "npm run art:square-terrain-sample-review",
    );
    expect(evidence.gate).toBe("THREE_INDIVIDUAL_SQUARE_TERRAIN_SAMPLES");
    expect(evidence.sampleIds).toEqual(ids);
    expect(evidence.displayChecks).toMatchObject({
      footprintCssPixels: [80, 128, 224],
      zooms: [0.625, 1, 1.75],
      devicePixelRatios: [1, 2],
      unitBytesChanged: false,
      overlays: ["OWNERSHIP", "SELECTION", "FOG_WITHHOLDING"],
    });
    expect(evidence.displayChecks.unitSourceSha256).toBe(
      "d606459210df2297706816957f4c62f3dea01f2324ba32641dc9fbbf3e9590a1",
    );
    expect(
      evidence.measurements.map(
        ({ nonOpaqueFootprintPixels }) => nonOpaqueFootprintPixels,
      ),
    ).toEqual([0, 0, 0]);
    expect(
      evidence.measurements.map(
        ({ upperLateralAlphaPixels }) => upperLateralAlphaPixels,
      ),
    ).toEqual([0, 0, 0]);
    expect(evidence.generationSummary.rejectedAttempts).toEqual({
      [ids[0]]: 7,
      [ids[1]]: 0,
      [ids[2]]: 3,
    });
    expect(evidence.visualReview.status).toBe("ACCEPTED_SAMPLE_GATE");
    expect(evidence.artifacts).toHaveLength(5);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength).toBe(artifact.bytes);
      expect(hash(data)).toBe(artifact.sha256);
      const metadata = await sharp(data).metadata();
      expect(metadata.width).toBe(artifact.width);
      expect(metadata.height).toBe(artifact.height);
    }
  }, 20_000);
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

async function mountainBodyBounds(
  source: Buffer,
  groundPng: Buffer,
  footprintTop: number,
): Promise<{ readonly minY: number; readonly maxY: number }> {
  const image = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ground = await sharp(groundPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minY = image.info.height;
  let maxY = -1;
  for (let y = 0; y < image.info.height; y += 1) {
    for (let x = 0; x < image.info.width; x += 1) {
      const offset = (y * image.info.width + x) * 4;
      const difference =
        y < footprintTop
          ? (image.data[offset + 3] ?? 0)
          : Math.max(
              Math.abs(
                (image.data[offset] ?? 0) -
                  (ground.data[
                    ((y - footprintTop) * ground.info.width + x) * 4
                  ] ?? 0),
              ),
              Math.abs(
                (image.data[offset + 1] ?? 0) -
                  (ground.data[
                    ((y - footprintTop) * ground.info.width + x) * 4 + 1
                  ] ?? 0),
              ),
              Math.abs(
                (image.data[offset + 2] ?? 0) -
                  (ground.data[
                    ((y - footprintTop) * ground.info.width + x) * 4 + 2
                  ] ?? 0),
              ),
            );
      if (difference <= 15) continue;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxY < 0) throw new Error("Mountain body fixture contains no pixels");
  return { minY, maxY };
}
