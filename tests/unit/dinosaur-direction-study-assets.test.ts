import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
} from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-undead-art-manifest";
import { readRaster } from "../../scripts/art/chibi/pipeline";
import { candidateCell, cropRaster } from "../../scripts/art/chibi/raster";
import {
  DINOSAUR_STUDY_ALTERNATIVES,
  DINOSAUR_STUDY_UNITS,
  DINOSAUR_VARIANTS,
  STEADY_DISTANCE,
  isHidePixel,
  steadinessOf,
  type Steadiness,
} from "../../scripts/art/dinosaur-direction/samples";

const ROOT = process.cwd();
const RUN = "art/explorations/dinosaur-direction-2026-10";

interface Sample {
  readonly id: string;
  readonly subject: string;
  readonly width: number;
  readonly height: number;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly url: string;
  readonly fixedColours: boolean;
  readonly role: "chosen" | "alternative";
  readonly unit: string;
  readonly variant?: string;
  readonly recipe: string;
  readonly candidate: number;
  readonly base?: { readonly recipe: string; readonly candidate: number };
  readonly steadiness?: Steadiness;
  readonly derivation: { readonly kind: string };
}

interface Record_ {
  readonly candidateCount?: number;
  readonly rawSheet?: string;
  readonly review?: { readonly verdict: string };
}

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(ROOT, file), "utf8")) as T;
}

async function candidate(
  records: { recipes: Record<string, Record_> },
  recipe: string,
  index: number,
  size: { width: number; height: number },
) {
  const record = records.recipes[recipe];
  expect(record?.rawSheet, recipe).toBeDefined();
  return cropRaster(await readRaster(path.join(ROOT, record?.rawSheet ?? "")), {
    ...candidateCell(index, record?.candidateCount ?? 1, size),
    ...size,
  });
}

describe("Dinosaur direction study (exploration, bead pulp_wars-3tq.14)", () => {
  it("tells hide from the other materials of the look", () => {
    // Slate, pale steel, deep blue and navy hides.
    for (const rgb of [
      [0x49, 0x58, 0x81],
      [0x85, 0xa3, 0xbf],
      [0x20, 0x57, 0x94],
      [0x26, 0x32, 0x53],
    ] as const)
      expect(isHidePixel(rgb[0], rgb[1], rgb[2])).toBe(true);
    // Amber, cream, tawny fur, the outline.
    for (const rgb of [
      [0xfe, 0x6d, 0x00],
      [0xf3, 0xdb, 0x9e],
      [0xce, 0x8f, 0x3c],
      [0x00, 0x00, 0x00],
    ] as const)
      expect(isHidePixel(rgb[0], rgb[1], rgb[2])).toBe(false);
  });

  it("measures how far an edit moved its base", () => {
    const pixel = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
    const raster = (pixels: number[][]) => ({
      width: pixels.length,
      height: 1,
      data: Uint8Array.from(pixels.flat()),
    });
    const base = raster([
      pixel(0x49, 0x58, 0x81),
      pixel(0x49, 0x58, 0x81),
      pixel(0xf3, 0xdb, 0x9e),
      pixel(0xf3, 0xdb, 0x9e),
      pixel(0, 0, 0, 0),
    ]);
    const edit = raster([
      pixel(0xfe, 0x6d, 0x00), // a stripe on hide
      pixel(0x4b, 0x5a, 0x80), // repainted, but the same tone
      pixel(0x20, 0x20, 0x20), // cream painted over
      pixel(0xf3, 0xdb, 0x9e),
      pixel(0, 0, 0, 255), // the silhouette grew
    ]);
    expect(STEADY_DISTANCE).toBeGreaterThan(8);
    expect(steadinessOf(base, edit)).toEqual({
      silhouettePixels: 1,
      hidePixels: 1,
      otherPixels: 1,
      repaintedPixels: 3,
      opaquePixels: 4,
    });
  });

  it("lists three units in six variants, cut from recorded candidates", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    const records = await json<{ recipes: Record<string, Record_> }>(
      `${RUN}/records.json`,
    );
    const chosen = assets.filter((asset) => asset.role === "chosen");
    expect(chosen.map((asset) => asset.id).sort()).toEqual(
      DINOSAUR_STUDY_UNITS.flatMap((unit) =>
        DINOSAUR_VARIANTS.map(
          (variant) => `chibi-study-dino-${unit.unit}-${variant.id}`,
        ),
      ).sort(),
    );
    expect(
      assets
        .filter((asset) => asset.role === "alternative")
        .map((asset) => asset.id)
        .sort(),
    ).toEqual(DINOSAUR_STUDY_ALTERNATIVES.map((entry) => entry.id).sort());
    for (const asset of assets) {
      expect(asset.fixedColours, asset.id).toBe(true);
      expect(asset.derivation.kind, asset.id).toBe("as-is");
      // A sample is never a rejected candidate.
      expect(records.recipes[asset.recipe]?.review?.verdict, asset.id).not.toBe(
        "REJECTED",
      );
      const size = { width: asset.width, height: asset.height };
      const source = await candidate(
        records,
        asset.recipe,
        asset.candidate,
        size,
      );
      const master = await readRaster(path.join(ROOT, asset.url.slice(1)));
      expect(
        Buffer.from(master.data).equals(Buffer.from(source.data)),
        asset.id,
      ).toBe(true);
      if (asset.base === undefined) continue;
      expect(asset.steadiness, asset.id).toEqual(
        steadinessOf(
          await candidate(
            records,
            asset.base.recipe,
            asset.base.candidate,
            size,
          ),
          master,
        ),
      );
    }
  });

  it("keeps each dinosaur's silhouette and non-hide parts under a pattern", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    const patterned = assets.filter(
      (asset) =>
        asset.role === "chosen" &&
        asset.unit !== "caveman" &&
        asset.steadiness !== undefined,
    );
    // Five pattern variants of two dinosaurs (D is the plain base).
    expect(patterned).toHaveLength(10);
    for (const asset of patterned) {
      const steadiness = asset.steadiness as Steadiness;
      // The pattern is there, and it is on the hide.
      expect(steadiness.hidePixels, asset.id).toBeGreaterThan(100);
      expect(steadiness.otherPixels, asset.id).toBeLessThan(
        steadiness.hidePixels / 2,
      );
      // The outline holds: under 4% of the sprite's pixels.
      expect(steadiness.silhouettePixels, asset.id).toBeLessThan(
        steadiness.opaquePixels * 0.04,
      );
    }
  });

  it("keeps the canvases and anchors of the accepted sprites", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    for (const asset of assets) {
      const live = CHIBI_ART_ASSETS_V7.find(
        (entry) =>
          entry.subject === asset.subject && entry.id.startsWith("chibi-dino"),
      );
      expect(live, asset.id).toBeDefined();
      expect([asset.width, asset.height], asset.id).toEqual([
        live?.width,
        live?.height,
      ]);
      expect(asset.anchor, asset.id).toEqual(live?.anchor);
    }
  });

  it("registers nothing as production art", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    const direction = [
      ...CHIBI_DIRECTION_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
    ];
    const live = new Set(
      [...CHIBI_ART_ASSETS_V7, ...direction].map((asset) => asset.id),
    );
    for (const asset of assets) {
      expect(live.has(asset.id), asset.id).toBe(false);
      expect(asset.url.startsWith(`/${RUN}/assets/`)).toBe(true);
    }
    // The Dinosaur faction is not converted: the live look still draws the
    // classic sprites for the three study subjects.
    for (const unit of DINOSAUR_STUDY_UNITS)
      expect(
        direction.some((asset) => asset.subject === unit.subject),
        unit.subject,
      ).toBe(false);
  });
});
