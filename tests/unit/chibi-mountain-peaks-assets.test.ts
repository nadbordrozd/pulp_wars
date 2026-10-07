import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import record from "../../src/assets/chibi-mountain-ranges.json";
import {
  PEAK_FLAT_MAX,
  cutPeakProblem,
} from "../../scripts/art/chibi-mountain-ranges";
import { readRaster } from "../../scripts/art/chibi/pipeline";

/**
 * No mountain sprite has a cut-off peak (the user, 2026-10-07: two low 2x1
 * ridges were baked from candidates the generator had cut with the top edge
 * of its image, so their highest peak ended in a flat line 17 and 19 px
 * wide). Every baked piece comes to a point, has no paint on the top row of
 * its image, and is not sliced by its left or right edge either: the board
 * draws each piece whole and joins none of them at a vertical seam.
 */

const ROOT = path.resolve(import.meta.dirname, "../..");

async function raster(relative: string) {
  const read = await readRaster(await readFile(path.join(ROOT, relative)));
  return {
    width: read.width,
    height: read.height,
    data: new Uint8Array(read.data),
  };
}

/** The longest run of paint in the outermost painted column of a side. */
function sideRun(
  image: { width: number; height: number; data: Uint8Array },
  side: "LEFT" | "RIGHT",
): { column: number; run: number } {
  const { width, height, data } = image;
  for (let step = 0; step < width; step += 1) {
    const x = side === "LEFT" ? step : width - 1 - step;
    let widest = 0;
    let run = 0;
    for (let y = 0; y < height; y += 1) {
      run = (data[(y * width + x) * 4 + 3] ?? 0) >= 128 ? run + 1 : 0;
      widest = Math.max(widest, run);
    }
    if (widest > 0) return { column: x, run: widest };
  }
  throw new Error("empty raster");
}

const pieces = [...record.pieces, ...record.mines];

describe("mountain sprites keep their peaks", () => {
  it("covers every baked piece of the set", () => {
    expect(pieces.length).toBe(28);
  });

  it.each(pieces.map((piece) => [piece.id, piece.path] as const))(
    "%s comes to a point inside its image",
    async (_id, file) => {
      const image = await raster(file);
      expect(cutPeakProblem(image)).toBeNull();
      // Not sliced at a side: its outermost columns are a few pixels of
      // contour inside the image, not a straight vertical cut on its edge.
      for (const side of ["LEFT", "RIGHT"] as const) {
        const edge = sideRun(image, side);
        expect(edge.column).not.toBe(side === "LEFT" ? 0 : image.width - 1);
        expect(edge.run).toBeLessThan(12);
      }
    },
  );

  it("is made of raw candidates that are not cut by the top of their image", async () => {
    const sources = record.sources
      .map((source) => source.path)
      .filter((file) => file.startsWith("art/pixellab/chibi-raw/"));
    expect(sources.length).toBeGreaterThan(20);
    for (const file of sources)
      expect([file, cutPeakProblem(await raster(file))]).toEqual([file, null]);
  });

  it("recognises the cut candidates the two ridges were baked from", async () => {
    for (const candidate of [0, 3])
      expect(
        cutPeakProblem(
          await raster(
            `art/pixellab/chibi-raw/mountain-ranges/s20-low-ridge-b-${candidate}.png`,
          ),
        ),
      ).toMatch(/top row of the image/);
  });

  it("fails a peak sliced flat below the top of the image", () => {
    const peak = (flat: number) => {
      const width = 40;
      const height = 20;
      const data = new Uint8Array(width * height * 4);
      for (let y = 5; y < height; y += 1)
        for (let x = 0; x < width; x += 1)
          if (Math.abs(x - 20) <= flat / 2 + (y - 5))
            data[(y * width + x) * 4 + 3] = 255;
      return { width, height, data };
    };
    expect(cutPeakProblem(peak(2))).toBeNull();
    expect(cutPeakProblem(peak(PEAK_FLAT_MAX + 4))).toMatch(/cut flat/);
  });
});
