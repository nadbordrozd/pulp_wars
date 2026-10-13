import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TEXTURED_GROUND_TILES_V7 } from "../../src/render/canvas/textured-grounds-experiment-v7";
import type { RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import { pixelSha256, readRaster } from "../../scripts/art/chibi/pipeline";
import { texturedGround } from "../../scripts/art/textured-grounds";
import {
  TEXTURED_CANDIDATES,
  TEXTURED_RUN,
  texturedFieldPath,
} from "../../scripts/art/textured-grounds/candidates";
import { scatter } from "../../scripts/art/textured-grounds/compose";
import {
  TEXTURED_LOOKS,
  compressed,
  swapped,
  texturedWorldPath,
} from "../../scripts/art/textured-grounds/looks";
import {
  busyness,
  paint,
  paletteIndices,
  quilt,
  type QuiltSource,
} from "../../scripts/art/textured-grounds/quilt";

/**
 * EXPERIMENT (bead pulp_wars-2yc.48, second round;
 * docs/art/TEXTURED_GROUNDS.md): textured grounds quilted from PixelLab
 * fields, as samples for review.
 */

const ROOT = process.cwd();
const PALETTE = ["#808080", "#202020", "#f0f0f0"];

/** A field of noise in two tones with a few light dots, seeded. */
function noise(size: number, seed: number): QuiltSource {
  const indices = new Uint8Array(size * size);
  let state = seed;
  for (let at = 0; at < indices.length; at += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    indices[at] = state % 97 === 0 ? 2 : state % 5 === 0 ? 1 : 0;
  }
  return { indices, width: size, height: size, regions: [[0, 0, size, size]] };
}

describe("a quilted ground texture", () => {
  const recipe = {
    width: 96,
    height: 96,
    block: 32,
    overlap: 8,
    seed: 5,
    sample: 12,
  } as const;
  const sources = [noise(64, 1), noise(64, 2)];

  it("is made only of pixels of the fields, with none left empty", () => {
    const out = quilt(sources, PALETTE, recipe);
    expect(out.length).toBe(96 * 96);
    for (const value of out) expect(value).toBeLessThan(PALETTE.length);
    // About the fields' own mix: no tone is lost and none takes over.
    const share = (index: number): number =>
      out.filter((value) => value === index).length / out.length;
    expect(share(0)).toBeGreaterThan(0.7);
    expect(share(1)).toBeGreaterThan(0.1);
    expect(share(2)).toBeGreaterThan(0.002);
  });

  it("is the same every time and another texture with another seed", () => {
    expect(quilt(sources, PALETTE, recipe)).toEqual(
      quilt(sources, PALETTE, recipe),
    );
    expect(quilt(sources, PALETTE, { ...recipe, seed: 6 })).not.toEqual(
      quilt(sources, PALETTE, recipe),
    );
  });

  it("takes windows only from the regions it is given", () => {
    // The left half of the field is all dark, the right all base: a
    // region on the right gives a texture with no dark pixel.
    const indices = new Uint8Array(64 * 64);
    for (let y = 0; y < 64; y += 1)
      for (let x = 0; x < 32; x += 1) indices[y * 64 + x] = 1;
    const out = quilt(
      [{ indices, width: 64, height: 64, regions: [[32, 0, 32, 64]] }],
      PALETTE,
      recipe,
    );
    expect(out.every((value) => value === 0)).toBe(true);
    expect(busyness(out, 96)).toBe(0);
  });

  it("refuses a period its blocks do not fill", () => {
    expect(() => quilt(sources, PALETTE, { ...recipe, width: 100 })).toThrow(
      /period/,
    );
  });

  it("snaps a field to its palette and paints indices in board colours", () => {
    const field: RgbaRaster = {
      width: 2,
      height: 1,
      data: new Uint8Array([130, 126, 128, 255, 20, 30, 40, 255]),
    };
    expect([...paletteIndices(field, PALETTE)]).toEqual([0, 1]);
    const painted = paint(new Uint8Array([0, 1]), 2, ["#112233", "#445566"]);
    expect([...painted.data]).toEqual([
      0x11, 0x22, 0x33, 255, 0x44, 0x55, 0x66, 255,
    ]);
  });
});

describe("the colours of a textured ground", () => {
  it("keeps a share of each colour's distance from the ground colour", () => {
    expect(compressed(["#808080", "#000000", "#ffffff"], 0.5)).toEqual([
      "#808080",
      "#404040",
      "#c0c0c0",
    ]);
    // Round another ground colour, and moved to another base.
    expect(compressed(["#000000", "#808080"], 0.5, 1)).toEqual([
      "#404040",
      "#808080",
    ]);
    expect(compressed(["#808080", "#a0a0a0"], 1, 0, "#606060")).toEqual([
      "#606060",
      "#808080",
    ]);
    expect(swapped(["a", "b", "c"], [[0, 2]])).toEqual(["c", "b", "a"]);
  });
});

describe("the things strewn over a textured ground", () => {
  // A field with one 3 x 2 stone, light over dark.
  const field: RgbaRaster = (() => {
    const size = 20;
    const data = new Uint8Array(size * size * 4);
    for (let at = 0; at < size * size; at += 1)
      data.set([0x80, 0x80, 0x80, 255], at * 4);
    for (const [x, y, colour] of [
      [8, 8, 0xf0],
      [9, 8, 0xf0],
      [10, 8, 0xf0],
      [8, 9, 0x20],
      [9, 9, 0x20],
      [10, 9, 0x20],
    ] as const)
      data.set([colour, colour, colour, 255], (y * size + x) * 4);
    return { width: size, height: size, data };
  })();
  const recipe = {
    fields: [{ from: PALETTE, to: ["#336633", "#111111", "#eeeeee"] }],
    kinds: [{ id: "stone", area: [6, 6], perCell: 3 }],
    seed: 9,
    gap: 2,
  } as const;
  const blank = (size: number): RgbaRaster => {
    const data = new Uint8Array(size * size * 4);
    for (let at = 0; at < size * size; at += 1)
      data.set([0x33, 0x66, 0x33, 255], at * 4);
    return { width: size, height: size, data };
  };

  it("lie whole on the torus, so many a cell, apart from each other", () => {
    const canvas = blank(160);
    // Four cells at three a cell.
    expect(scatter(canvas, [field], recipe)).toEqual({ stone: 12 });
    let light = 0;
    let dark = 0;
    for (let at = 0; at < 160 * 160; at += 1) {
      if (canvas.data[at * 4] === 0xee) light += 1;
      if (canvas.data[at * 4] === 0x11) dark += 1;
    }
    // Twelve whole stones: none overlaps another, none is cut.
    expect([light, dark]).toEqual([36, 36]);
    const again = blank(160);
    scatter(again, [field], recipe);
    expect(again.data).toEqual(canvas.data);
  });

  it("keep off a tile's edge when the canvas is one tile", () => {
    const canvas = blank(80);
    scatter(canvas, [field], { ...recipe, margin: 6 });
    for (let at = 0; at < 80; at += 1)
      for (const [x, y] of [
        [at, 0],
        [at, 5],
        [at, 79],
        [at, 74],
        [0, at],
        [5, at],
        [79, at],
        [74, at],
      ] as const)
        expect(canvas.data[(y * 80 + x) * 4]).toBe(0x33);
  });
});

describe("the textured ground samples", () => {
  it("are quilted from fields the run generated and did not reject", async () => {
    const records = JSON.parse(
      await readFile(path.join(ROOT, TEXTURED_RUN, "records.json"), "utf8"),
    ) as {
      recipes: Record<
        string,
        { rawSheet?: string; review?: { verdict: string } }
      >;
    };
    const known = new Set(TEXTURED_CANDIDATES.map((entry) => entry.id));
    for (const look of TEXTURED_LOOKS)
      for (const field of [...look.fields, ...(look.things?.fields ?? [])]) {
        expect(known.has(field.id), field.id).toBe(true);
        expect(records.recipes[field.id]?.rawSheet, field.id).toBe(
          texturedFieldPath(field.id),
        );
        expect(records.recipes[field.id]?.review?.verdict, field.id).not.toBe(
          "REJECTED",
        );
        expect(existsSync(path.join(ROOT, texturedFieldPath(field.id)))).toBe(
          true,
        );
      }
  });

  it("have one best look a faction, baked as the board's switch loads it", async () => {
    const best = TEXTURED_LOOKS.filter((look) => look.best === true);
    expect(best.map((look) => look.faction).sort()).toEqual([
      "CULT",
      "DWARF",
      "MARTIAN",
    ]);
    for (const look of best) {
      expect(look.mode).toBe("WORLD");
      const file = texturedWorldPath(look);
      const asset = TEXTURED_GROUND_TILES_V7.find(
        (tile) => tile.id === look.faction,
      );
      expect(asset?.url.endsWith(file.replace(/^public\//, ""))).toBe(true);
      // Six cells a side, as the switch's manifest says.
      expect([look.quilt.width, look.quilt.height]).toEqual([
        (asset?.world?.columns ?? 0) * 80,
        (asset?.world?.rows ?? 0) * 80,
      ]);
      const baked = await readRaster(path.join(ROOT, file));
      expect([baked.width, baked.height]).toEqual([480, 480]);
      const ground = await texturedGround(ROOT, look);
      if (ground.world === undefined) throw new Error(look.id);
      // The file is what the look derives today.
      expect(pixelSha256(baked)).toBe(pixelSha256(ground.world));
      // A background: opaque, and in a narrow band of lightness.
      for (let at = 3; at < baked.data.length; at += 4)
        expect(baked.data[at]).toBe(255);
      expect(ground.spread, look.id).toBeLessThan(6);
    }
  });
});
