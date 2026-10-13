import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACTION_GRASS_TILES_V7,
  FACTION_GRASS_WORLDS_V7,
} from "../../src/assets/faction-grass-manifest";
import type { RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import { pixelSha256, readRaster } from "../../scripts/art/chibi/pipeline";
import {
  FACTION_GRASS_RECORD,
  WORLD_GROUND_IDS,
  factionGrassProblems,
  factionGrassTilePath,
  worldGroundLook,
  worldGroundPath,
  type FactionGrassRecord,
} from "../../scripts/art/faction-grass";
import {
  texturedGround,
  texturedLookFieldPath,
} from "../../scripts/art/textured-grounds/ground";
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
} from "../../scripts/art/textured-grounds/looks";
import {
  busyness,
  paint,
  paletteIndices,
  quilt,
  type QuiltSource,
} from "../../scripts/art/textured-grounds/quilt";

/**
 * Textured grounds (bead pulp_wars-2yc.48, docs/art/TEXTURED_GROUNDS.md):
 * one large texture a ground, quilted from PixelLab fields.
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
        if (field.flat !== undefined) {
          // A field of the flat grounds' run, with its own palette.
          expect(
            existsSync(path.join(ROOT, texturedLookFieldPath(field))),
          ).toBe(true);
          expect(field.flat.from.length).toBe(field.flat.to.length);
          continue;
        }
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

  it("have one chosen look a wired ground, baked as the manifest names it", async () => {
    expect(await factionGrassProblems(ROOT)).toEqual([]);
    expect([...WORLD_GROUND_IDS].sort()).toEqual(
      Object.keys(FACTION_GRASS_WORLDS_V7).sort(),
    );
    const record = JSON.parse(
      await readFile(path.join(ROOT, FACTION_GRASS_RECORD), "utf8"),
    ) as FactionGrassRecord;
    expect(record.worlds.map((world) => world.id)).toEqual([
      ...WORLD_GROUND_IDS,
    ]);
    for (const id of WORLD_GROUND_IDS) {
      const look = worldGroundLook(id);
      expect(look.mode).toBe("WORLD");
      const asset = FACTION_GRASS_TILES_V7.find((tile) => tile.id === id);
      const file = worldGroundPath(id);
      expect(asset?.url.endsWith(file.replace(/^public\//, ""))).toBe(true);
      expect(
        asset?.world?.swatchUrl?.endsWith(
          factionGrassTilePath(id, 0).replace(/^public\//, ""),
        ),
      ).toBe(true);
      // As many cells a side as the manifest says.
      expect([look.quilt.width, look.quilt.height]).toEqual([
        (asset?.world?.columns ?? 0) * 80,
        (asset?.world?.rows ?? 0) * 80,
      ]);
      const baked = await readRaster(path.join(ROOT, file));
      expect([baked.width, baked.height]).toEqual([
        look.quilt.width,
        look.quilt.height,
      ]);
      const ground = await texturedGround(ROOT, look);
      if (ground.world === undefined) throw new Error(look.id);
      // The file is what the look derives today.
      expect(pixelSha256(baked)).toBe(pixelSha256(ground.world));
      // The swatch is the texture's first cell.
      const swatch = await readRaster(
        path.join(ROOT, factionGrassTilePath(id, 0)),
      );
      expect([swatch.width, swatch.height]).toEqual([80, 80]);
      for (const [x, y] of [
        [0, 0],
        [79, 0],
        [40, 40],
        [79, 79],
      ] as const)
        for (let channel = 0; channel < 4; channel += 1)
          expect(swatch.data[(y * 80 + x) * 4 + channel]).toBe(
            baked.data[(y * baked.width + x) * 4 + channel],
          );
      // A background: opaque, and in a narrow band of lightness.
      let clear = 0;
      for (let at = 3; at < baked.data.length; at += 4)
        if (baked.data[at] !== 255) clear += 1;
      expect(clear).toBe(0);
      expect(ground.spread, look.id).toBeLessThan(7);
      // Periodic: the texture's last column continues into its first as
      // well as two neighbouring columns continue each other.
      const differ = (a: number, b: number): number => {
        let count = 0;
        for (let y = 0; y < baked.height; y += 1)
          for (let channel = 0; channel < 3; channel += 1)
            if (
              baked.data[(y * baked.width + a) * 4 + channel] !==
              baked.data[(y * baked.width + b) * 4 + channel]
            ) {
              count += 1;
              break;
            }
        return count / baked.height;
      };
      const inside = differ(200, 201);
      expect(differ(baked.width - 1, 0)).toBeLessThan(inside * 1.5 + 0.1);
    }
  });
});
