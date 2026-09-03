import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const families = {
  grass: [1, 2, 3, 4].map(
    (variant) => `terrain-square-original-grass-${variant}`,
  ),
  forest: [1, 2, 3, 4].map(
    (variant) => `terrain-square-original-forest-${variant}`,
  ),
  mountain: [1, 2, 3].map(
    (variant) => `terrain-square-original-mountain-${variant}`,
  ),
} as const;
const ids = [...families.grass, ...families.forest, ...families.mountain];
const newIds = [
  ...families.grass.slice(1),
  ...families.forest.slice(1),
  ...families.mountain.slice(1),
];

describe("Original square terrain family", () => {
  it("defines exactly four Grass, four Forest and three Mountain recipes with bounded batches", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly recipes: readonly {
        readonly id: string;
        readonly stage: string;
        readonly output: string;
        readonly requestSize: {
          readonly width: number;
          readonly height: number;
        };
        readonly outputSize: {
          readonly width: number;
          readonly height: number;
        };
        readonly anchor?: { readonly x: number; readonly y: number };
        readonly squareFootprint?: {
          readonly left: number;
          readonly top: number;
          readonly right: number;
          readonly bottom: number;
        };
        readonly postprocess?: string;
        readonly groundReference?: string;
        readonly styleReference?: string;
        readonly seed: number;
      }[];
    };
    const square = source.recipes.filter(({ id }) =>
      id.startsWith("terrain-square-original-"),
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
      if (!grass)
        expect(recipe.groundReference, recipe.id).toBe(
          "terrain-square-original-grass-1",
        );
      expect(recipe.seed, recipe.id).toBeGreaterThan(100_000);
      expect(recipe.output, recipe.id).toBe(
        `public/assets/pixellab/terrain-square/${recipe.id.replace("terrain-square-", "")}.png`,
      );
    }
    for (const id of newIds) {
      const recipe = square.find((entry) => entry.id === id);
      expect(recipe?.styleReference, id).toMatch(
        /^terrain-square-original-(grass|forest|mountain)-[12]$/,
      );
    }

    const pipeline = await readFile("scripts/art/pixellab.ts", "utf8");
    expect(pipeline).toContain(
      "Original square terrain batches may contain at most three assets",
    );
    expect(pipeline).toContain(
      "Do not mix Original square terrain family batches",
    );
    expect(pipeline).toContain("upperLateralSafety = 8");
  });

  it("records accepted PixelLab provenance, rejection history and exact alpha contracts", async () => {
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
        readonly squareFootprint: {
          readonly left: number;
          readonly top: number;
          readonly right: number;
          readonly bottom: number;
        };
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
    const expectedRejections: Readonly<Record<string, number>> = {
      "terrain-square-original-forest-4": 2,
      "terrain-square-original-mountain-3": 1,
    };
    const hashes = new Set<string>();
    for (const id of ids) {
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
        expectedRejections[id] ??
          (id === "terrain-square-original-grass-1"
            ? 7
            : id === "terrain-square-original-mountain-1"
              ? 3
              : 0),
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
      const fileHash = hash(file);
      expect(fileHash).toBe(record?.outputSha256);
      expect(hashes.has(fileHash), id).toBe(false);
      hashes.add(fileHash);
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
        )
          if ((data[(y * info.width + x) * 4 + 3] ?? 0) !== 255)
            nonOpaqueFootprintPixels += 1;
      expect(nonOpaqueFootprintPixels, id).toBe(0);
      let upperLateralAlphaPixels = 0;
      for (let y = 0; y < recipe.squareFootprint.top; y += 1) {
        if ((data[y * info.width * 4 + 3] ?? 0) !== 0)
          upperLateralAlphaPixels += 1;
        if ((data[(y * info.width + info.width - 1) * 4 + 3] ?? 0) !== 0)
          upperLateralAlphaPixels += 1;
      }
      expect(upperLateralAlphaPixels, id).toBe(0);
      if (id.includes("-forest-") || id.includes("-mountain-")) {
        expect(record?.request?.groundReference?.id, id).toBe(
          "terrain-square-original-grass-1",
        );
        expect(record?.request?.groundReference?.sha256, id).toBe(
          generated.records["terrain-square-original-grass-1"]?.outputSha256,
        );
      }
    }
  }, 30_000);

  it("keeps every Grass edge exact and all authored variation quiet", async () => {
    const base = [0x6f, 0x92, 0x55, 0xff] as const;
    const hashes = new Set<string>();
    for (const id of families.grass) {
      const file = `public/assets/pixellab/terrain-square/${id.replace("terrain-square-", "")}.png`;
      const bytes = await readFile(file);
      hashes.add(hash(bytes));
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let x = 0; x < info.width; x += 1) {
        expect(pixel(data, info.width, x, 0), `${id} top`).toEqual(base);
        expect(
          pixel(data, info.width, x, info.height - 1),
          `${id} bottom`,
        ).toEqual(base);
      }
      for (let y = 0; y < info.height; y += 1) {
        expect(pixel(data, info.width, 0, y), `${id} left`).toEqual(base);
        expect(
          pixel(data, info.width, info.width - 1, y),
          `${id} right`,
        ).toEqual(base);
      }
      const ranges = [0, 1, 2].map((channel) => {
        const values = Array.from(
          { length: info.width * info.height },
          (_, index) => data[index * 4 + channel] ?? 0,
        );
        return Math.max(...values) - Math.min(...values);
      });
      expect(Math.max(...ranges), id).toBeLessThanOrEqual(3);
    }
    expect(hashes).toHaveLength(4);
  }, 20_000);

  it("preserves sample and unit bytes and leaves runtime coverage unswitched", async () => {
    const baselines: Readonly<Record<string, string>> = {
      "public/assets/pixellab/terrain-square/original-grass-1.png":
        "a20fbc91f4bcd6120fb8c9ce4bcd9ed9276fcdbd4f145d4153cc71c93bda6567",
      "public/assets/pixellab/terrain-square/original-forest-1.png":
        "ada147cc84e3b3dbd70cd0aa3e5f39a1a41dfe74be63833ad3c375fae316571f",
      "public/assets/pixellab/terrain-square/original-mountain-1.png":
        "b1c0435641bc80bc6f2814de3e49d45aeed88c875c3c87259bb307e8e92282b2",
      "public/assets/pixellab/units/archer.png":
        "deb62a8a84dc28ceecd58047a3f65abdb67c0616851337c817452d75a5b73bb2",
      "public/assets/pixellab/units/candy-choco-engineer.png":
        "020d0448b1db6be74b00aa3d468ca4f4aa7d9c2c700d63ae7c03a683ec314fcf",
      "public/assets/pixellab/units/candy-crusher.png":
        "d2fb335814ae4929cb47891bcb8561c8092a1bfc9fc53f98b9b4a32382898fca",
      "public/assets/pixellab/units/candy-donut.png":
        "041fd6defb9b46059e9036418c501cc287e8ac74180384594770e9d1d764a991",
      "public/assets/pixellab/units/candy-gumball-guard.png":
        "5a43d5f737bbf41f007c9bf8ee5f7fe5e0084bb13f9d243917d27c6f701f81b2",
      "public/assets/pixellab/units/candy-jawbreaker.png":
        "5897e7b0d7d8dd4746ff7ecadba4ba0b0d72266df4b33b25743fef33c5ee1455",
      "public/assets/pixellab/units/candy-jelly-scout.png":
        "c835c0a08cc24d5751c0dbc85365f638016029984162a6272387aa3efc2965a9",
      "public/assets/pixellab/units/candy-marshmallow-medic.png":
        "868b00e650c05e22bd085d72f093fd8c80554ba17a3357a2982833c617e98327",
      "public/assets/pixellab/units/candy-sugar-titan.png":
        "7d360ee7191644121f4397be91ac7ab42769883b44d6481d6c056ad7c5df76c9",
      "public/assets/pixellab/units/candy-warrior.png":
        "76456b060ba1701e75387285b4738d4c289c0617eb852f5552beadfe2eb1a2bc",
      "public/assets/pixellab/units/catapult.png":
        "cdf6ed34a67c1daf1bfd947b0b1af007b25d2a13ee88ee2df876bdb9f7ceec83",
      "public/assets/pixellab/units/defender.png":
        "930c31f9aa1bf5dacf0318484b31ac63504365482ae01a84a6a269d94de65e11",
      "public/assets/pixellab/units/original-breacher.png":
        "1e752161cd63bcb7bc0e5a0989557f61d2d7f2d3e3d9597ccc9360ed11fca2ad",
      "public/assets/pixellab/units/original-heavy.png":
        "8fe592d094ede939cf8a92119022c9606b6c12621ed4d6777b4056b8cadb3759",
      "public/assets/pixellab/units/original-juggernaut.png":
        "c905126dc7c38683b1ecba0aa930a4add45426a26fa3560a78e2df21ddaccc9a",
      "public/assets/pixellab/units/original-medic.png":
        "c30475f23be6a8ca9ee1957a327b3b764489e570d50cd69d5775006650af62c2",
      "public/assets/pixellab/units/original-scout.png":
        "8663c5c6f95ed69481123245a7f7c5e6acf2b55ebb9c52ebbc46979252e60343",
      "public/assets/pixellab/units/rider.png":
        "20bb28c79c28e262908e518124e776f30adf946254906e62245f0e9702606bb4",
      "public/assets/pixellab/units/warrior.png":
        "d606459210df2297706816957f4c62f3dea01f2324ba32641dc9fbbf3e9590a1",
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
    expect(coverage).not.toContain("terrain-square-original-");
    expect(bindings).not.toContain("terrain-square-original-");
  });

  it("checks in deterministic complete-family visual evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/square-original-terrain/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly generatedBy: string;
      readonly gate: string;
      readonly familyIds: typeof families;
      readonly statuses: Readonly<Record<string, string>>;
      readonly boundedProviderBatches: readonly (readonly string[])[];
      readonly displayChecks: {
        readonly footprintCssPixels: readonly number[];
        readonly zooms: readonly number[];
        readonly devicePixelRatios: readonly number[];
        readonly unitBytesChanged: boolean;
        readonly overlays: readonly string[];
      };
      readonly mechanicsIsolation: {
        readonly cosmeticVariantsOnly: boolean;
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
      "npm run art:square-original-terrain-review",
    );
    expect(evidence.gate).toBe("ORIGINAL_SQUARE_TERRAIN_FAMILY");
    expect(evidence.familyIds).toEqual(families);
    expect(evidence.statuses).toEqual(
      Object.fromEntries(ids.map((id) => [id, "ACCEPTED"])),
    );
    expect(
      evidence.boundedProviderBatches.map((batch) => batch.length),
    ).toEqual([3, 3, 2]);
    expect(evidence.displayChecks).toMatchObject({
      footprintCssPixels: [80, 128, 224],
      zooms: [0.625, 1, 1.75],
      devicePixelRatios: [1, 2],
      unitBytesChanged: false,
      overlays: [
        "OWNERSHIP",
        "SELECTION",
        "MOVEMENT_TARGET",
        "FOG_WITHHOLDING",
      ],
    });
    expect(evidence.mechanicsIsolation).toMatchObject({
      cosmeticVariantsOnly: true,
      runtimeCoverageChanged: false,
      simulationPrngRead: false,
    });
    expect(evidence.measurements).toHaveLength(11);
    expect(
      evidence.measurements.map(
        ({ nonOpaqueFootprintPixels }) => nonOpaqueFootprintPixels,
      ),
    ).toEqual(Array.from({ length: 11 }, () => 0));
    expect(
      evidence.measurements.map(
        ({ upperLateralAlphaPixels }) => upperLateralAlphaPixels,
      ),
    ).toEqual(Array.from({ length: 11 }, () => 0));
    for (const difference of evidence.familyDifferences.grass ?? []) {
      expect(difference.meanAbsoluteRgbDifference).toBeGreaterThan(0);
      expect(difference.meanAbsoluteRgbDifference).toBeLessThan(1);
    }
    for (const family of ["forest", "mountain"])
      for (const difference of evidence.familyDifferences[family] ?? [])
        expect(difference.meanAbsoluteRgbDifference, family).toBeGreaterThan(2);
    expect(evidence.generationSummary.rejectedAttempts).toEqual({
      "terrain-square-original-grass-2": 0,
      "terrain-square-original-grass-3": 0,
      "terrain-square-original-grass-4": 0,
      "terrain-square-original-forest-2": 0,
      "terrain-square-original-forest-3": 0,
      "terrain-square-original-forest-4": 2,
      "terrain-square-original-mountain-2": 0,
      "terrain-square-original-mountain-3": 1,
    });
    expect(evidence.visualReview.status).toBe(
      "ACCEPTED_ORIGINAL_SQUARE_TERRAIN_FAMILY",
    );
    expect(evidence.artifacts).toHaveLength(10);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength).toBe(artifact.bytes);
      expect(hash(data)).toBe(artifact.sha256);
      const metadata = await sharp(data).metadata();
      expect(metadata.width).toBe(artifact.width);
      expect(metadata.height).toBe(artifact.height);
    }
  }, 30_000);
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
