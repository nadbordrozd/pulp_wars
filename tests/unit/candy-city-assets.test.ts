import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import { PIXELLAB_BOARD_ART_IDS } from "../../src/render/canvas/pixellab-asset-bindings";

const CANDY_CITY_IDS = [
  "building-candy-city-1",
  "building-candy-city-2",
  "building-candy-city-3",
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
  readonly stage: "sample" | "batch";
  readonly seed: number;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly hardBounds: Bounds;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly styleReference?: string;
  readonly styleReferenceUsage?: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly hasAlpha?: boolean;
  readonly alphaBounds?: Bounds;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly unknown[];
  readonly request?: {
    readonly seed: number;
    readonly model: string;
    readonly groundContactY?: number;
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
}

describe("accepted Candy city PixelLab family", () => {
  it("publishes the three production URLs for renderer ownership selection", () => {
    for (const id of CANDY_CITY_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/assets/pixellab/buildings/${id.replace("building-", "")}.png`,
      );
    for (const id of CANDY_CITY_IDS)
      expect(PIXELLAB_BOARD_ART_IDS).toContain(id);
  });

  it("records the sequential sample gate and exact settlement geometry", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter((recipe) =>
      CANDY_CITY_IDS.includes(recipe.id as (typeof CANDY_CITY_IDS)[number]),
    );

    expect(recipes.map(({ id }) => id)).toEqual([...CANDY_CITY_IDS]);
    expect(recipes.map(({ stage }) => stage)).toEqual([
      "sample",
      "sample",
      "sample",
    ]);
    expect(recipes.map(({ styleReference }) => styleReference)).toEqual([
      "building-city-1",
      "building-candy-city-1",
      "building-candy-city-2",
    ]);
    expect(recipes.map(({ anchor }) => anchor)).toEqual([
      { x: 192, y: 236 },
      { x: 192, y: 243 },
      { x: 192, y: 243 },
    ]);
    expect(recipes.map(({ groundContactY }) => groundContactY)).toEqual([
      337, 344, 344,
    ]);
    for (const recipe of recipes) {
      expect(recipe.requestSize, recipe.id).toEqual({
        width: 384,
        height: 384,
      });
      expect(recipe.outputSize, recipe.id).toEqual(recipe.requestSize);
      expect(recipe.hardBounds, recipe.id).toEqual({
        left: 8,
        top: 4,
        right: 376,
        bottom: 344,
      });
      expect(recipe.seed, recipe.id).toBeGreaterThan(0);
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(200);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(100);
      expect(recipe.styleReferenceUsage, recipe.id).toMatch(
        /Input reference role/,
      );
    }
  });

  it("matches accepted hashes, alpha bounds, grounding and review status", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };

    for (const id of CANDY_CITY_IDS) {
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(recipe, id).toBeDefined();
      expect(record, id).toBeDefined();
      if (recipe === undefined || record === undefined) continue;
      const file = await readFile(recipe.output);
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const bounds = alphaBounds(data, info.width, info.height);
      expect(record.status, id).toBe("ACCEPTED");
      expect(record.width, id).toBe(384);
      expect(record.height, id).toBe(384);
      expect(record.hasAlpha, id).toBe(true);
      expect(record.outputSha256, id).toBe(
        createHash("sha256").update(file).digest("hex"),
      );
      expect(record.alphaBounds, id).toEqual({ ...bounds, empty: false });
      expect(bounds.bottom, id).toBe(recipe.groundContactY);
      expect(bounds.left, id).toBeGreaterThanOrEqual(recipe.hardBounds.left);
      expect(bounds.top, id).toBeGreaterThanOrEqual(recipe.hardBounds.top);
      expect(bounds.right, id).toBeLessThanOrEqual(recipe.hardBounds.right);
      expect(bounds.bottom, id).toBeLessThanOrEqual(recipe.hardBounds.bottom);
      expect(Object.values(record.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record.request?.seed, id).toBe(recipe.seed);
      expect(record.request?.model, id).toBe("generate-image-v2");
      expect(record.request?.groundContactY, id).toBe(recipe.groundContactY);
      expect(record.request?.styleReference?.id, id).toBe(
        recipe.styleReference,
      );
      expect(record.request?.styleReference?.sha256, id).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(record.request?.styleReference?.usageDescription, id).toBe(
        recipe.styleReferenceUsage,
      );
      expect(record.rejectedAttempts ?? [], id).toHaveLength(0);
    }
  });

  it("checks in hashed individual, progression, zoom and map evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/candy-cities/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.artifacts.map(({ path }) => path)).toEqual([
      "art/pixellab/reviews/candy-cities/README.md",
      "art/pixellab/reviews/candy-cities/individual-source-native-enlarged-minimum.png",
      "art/pixellab/reviews/candy-cities/progression-contact-sheet.png",
      "art/pixellab/reviews/candy-cities/zoom-dpr-review.png",
      "art/pixellab/reviews/candy-cities/desktop-mixed-map.png",
      "art/pixellab/reviews/candy-cities/mobile-mixed-map-dpr2.png",
    ]);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(artifact.bytes, artifact.path).toBe(data.byteLength);
      expect(artifact.sha256, artifact.path).toBe(
        createHash("sha256").update(data).digest("hex"),
      );
    }
  });
});

function alphaBounds(data: Buffer, width: number, height: number): Bounds {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  return { left, top, right, bottom };
}
