import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";

const CANDY_TERRAIN_IDS = [
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
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly hardBounds: Bounds;
  readonly anchor?: { readonly x: number; readonly y: number };
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
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
}

describe("accepted Candy terrain PixelLab family", () => {
  it("publishes exactly the requested URLs without wiring ownership behavior", () => {
    for (const id of CANDY_TERRAIN_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/assets/pixellab/terrain/${id.replace("terrain-", "")}.png`,
      );
  });

  it("records reproducible reference roles and the four-sample gate", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter((recipe) =>
      CANDY_TERRAIN_IDS.includes(
        recipe.id as (typeof CANDY_TERRAIN_IDS)[number],
      ),
    );

    expect(recipes.map(({ id }) => id)).toEqual([...CANDY_TERRAIN_IDS]);
    expect(
      recipes.filter(({ stage }) => stage === "sample").map(({ id }) => id),
    ).toEqual([
      "terrain-candy-grass-1",
      "terrain-candy-mountain-1",
      "terrain-candy-forest-1",
      "terrain-candy-fruit",
    ]);
    for (const recipe of recipes) {
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(80);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(30);
      expect(recipe.styleReference, recipe.id).toBeTruthy();
      expect(recipe.styleReferenceUsage, recipe.id).toMatch(
        /(?:Input reference role|Deterministic source role)/,
      );
      const ground = recipe.id.startsWith("terrain-candy-grass-");
      expect(recipe.requestSize, recipe.id).toEqual({
        width: 256,
        height: ground ? 148 : 296,
      });
      expect(recipe.outputSize, recipe.id).toEqual(recipe.requestSize);
      expect(recipe.anchor, recipe.id).toEqual({
        x: 128,
        y: ground ? 74 : 222,
      });
    }
  });

  it("matches accepted hashes, dimensions, alpha bounds and review status", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };

    for (const id of CANDY_TERRAIN_IDS) {
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
      expect(record.width, id).toBe(info.width);
      expect(record.height, id).toBe(info.height);
      expect(record.hasAlpha, id).toBe(true);
      expect(record.outputSha256, id).toBe(
        createHash("sha256").update(file).digest("hex"),
      );
      expect(record.alphaBounds, id).toEqual({ ...bounds, empty: false });
      expect(Object.values(record.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(bounds.left, id).toBeGreaterThanOrEqual(recipe.hardBounds.left);
      expect(bounds.top, id).toBeGreaterThanOrEqual(recipe.hardBounds.top);
      expect(bounds.right, id).toBeLessThanOrEqual(recipe.hardBounds.right);
      expect(bounds.bottom, id).toBeLessThanOrEqual(recipe.hardBounds.bottom);

      if (!id.startsWith("terrain-candy-grass-")) continue;
      for (const [x, y] of [
        [0, 0],
        [255, 0],
        [0, 147],
        [255, 147],
      ] as const)
        expect(alphaAt(data, info.width, x, y), `${id} corner ${x},${y}`).toBe(
          0,
        );
      let outsideMaskOpaquePixelCount = 0;
      const outsideMaskOpaquePixelExamples: string[] = [];
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const normalized =
            Math.abs(x + 0.5 - 128) / 128 + Math.abs(y + 0.5 - 74) / 74;
          if (normalized > 1.02 && alphaAt(data, info.width, x, y) !== 0) {
            outsideMaskOpaquePixelCount += 1;
            if (outsideMaskOpaquePixelExamples.length < 8)
              outsideMaskOpaquePixelExamples.push(`${x},${y}`);
          }
        }
      }
      expect(
        outsideMaskOpaquePixelCount,
        `${id} opaque outside-mask pixels (first eight): ${outsideMaskOpaquePixelExamples.join("; ")}`,
      ).toBe(0);
    }

    expect(
      generated.records["terrain-candy-grass-2"]?.rejectedAttempts,
    ).toHaveLength(1);
    expect(
      generated.records["terrain-candy-forest-3"]?.rejectedAttempts,
    ).toHaveLength(1);
  });
});

function alphaBounds(data: Buffer, width: number, height: number): Bounds {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alphaAt(data, width, x, y) === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  return { left, top, right, bottom };
}

function alphaAt(data: Buffer, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3] ?? 0;
}
