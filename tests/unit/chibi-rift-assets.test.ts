import { describe, expect, it } from "vitest";
import {
  batchManifestProblems,
  requestBody,
  requestSnapshot,
  type ChibiBatchManifest,
} from "../../scripts/art/chibi/batch-manifest";
import type { RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
} from "../../scripts/art/chibi/pipeline";
import {
  cropRaster,
  groundStripRaster,
  riftGuideRaster,
  riftPieceWindow,
  riftStripRaster,
  type RiftStripSpec,
} from "../../scripts/art/chibi/raster";

// The Rift pieces and the rift-strip derivation (bead pulp_wars-9s0.5,
// docs/art/CHIBI_PIPELINE.md "The Rift").

const ROOT = process.cwd();
const TERRAIN = "public/assets/chibi/terrain";

function solid(
  width: number,
  height: number,
  rgb: readonly [number, number, number],
): RgbaRaster {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    data.set([rgb[0], rgb[1], rgb[2], 255], index * 4);
  return { width, height, data };
}

const pixel = (raster: RgbaRaster, x: number, y: number) => [
  ...raster.data.subarray(
    (y * raster.width + x) * 4,
    (y * raster.width + x) * 4 + 4,
  ),
];

describe("the rift-strip derivation", () => {
  const spec: RiftStripSpec = {
    orientation: "HORIZONTAL",
    threshold: 40,
    minComponent: 12,
    dilate: 1,
    margin: 4,
  };

  it("lays three ground tiles side by side or stacked", () => {
    const tile = solid(4, 4, [10, 200, 10]);
    tile.data.set([255, 0, 0, 255], 0);
    const horizontal = groundStripRaster(tile, "HORIZONTAL");
    expect([horizontal.width, horizontal.height]).toEqual([12, 4]);
    expect(pixel(horizontal, 8, 0)).toEqual([255, 0, 0, 255]);
    const vertical = groundStripRaster(tile, "VERTICAL");
    expect([vertical.width, vertical.height]).toEqual([4, 12]);
    expect(pixel(vertical, 0, 4)).toEqual([255, 0, 0, 255]);
    expect(riftPieceWindow({ width: 80, height: 80 }, "VERTICAL", 2)).toEqual({
      left: 0,
      top: 160,
      width: 80,
      height: 80,
    });
  });

  it("keeps the crack and nothing else: specks dropped, holes filled, margin kept", () => {
    const ground = solid(60, 20, [130, 180, 90]);
    const candidate = solid(60, 20, [130, 180, 90]);
    const paint = (x: number, y: number, rgb: [number, number, number]) =>
      candidate.data.set([...rgb, 255], (y * 60 + x) * 4);
    // A 30 x 6 dark crack with a ground-coloured hole in it.
    for (let y = 7; y < 13; y += 1)
      for (let x = 15; x < 45; x += 1)
        if (!(x === 30 && y === 10)) paint(x, y, [15, 12, 12]);
    // A 2-pixel speck and a dark pixel inside the margin.
    paint(5, 5, [20, 20, 20]);
    paint(6, 5, [20, 20, 20]);
    paint(1, 10, [20, 20, 20]);
    // A small grass drift: not crack.
    paint(50, 15, [140, 185, 95]);
    const { raster, crackPixels } = riftStripRaster(candidate, ground, spec);
    expect(pixel(raster, 20, 10)).toEqual([15, 12, 12, 255]);
    // The enclosed hole is part of the crack (the candidate's colour).
    expect(pixel(raster, 30, 10)).toEqual([130, 180, 90, 255]);
    expect(pixel(raster, 5, 5)).toEqual([130, 180, 90, 255]);
    expect(pixel(raster, 1, 10)).toEqual([130, 180, 90, 255]);
    expect(pixel(raster, 50, 15)).toEqual([130, 180, 90, 255]);
    // The 30 x 6 crack grown by one ring: 32 x 8.
    expect(crackPixels).toBe(32 * 8);
  });

  it("rejects a candidate that is not the strip", () => {
    expect(() =>
      riftStripRaster(solid(10, 10, [0, 0, 0]), solid(12, 4, [0, 0, 0]), spec),
    ).toThrow(/not the 12x4 strip/);
  });

  it("draws the same guide crack for the same seed, inside the inset", () => {
    const strip = groundStripRaster(
      solid(80, 80, [130, 180, 90]),
      "HORIZONTAL",
    );
    const guide = { seed: 11, halfWidth: 9, inset: 18, wander: 3 };
    const first = riftGuideRaster(strip, "HORIZONTAL", guide);
    expect(riftGuideRaster(strip, "HORIZONTAL", guide).data).toEqual(
      first.data,
    );
    for (let y = 0; y < 80; y += 1) {
      expect(pixel(first, 17, y)).toEqual([130, 180, 90, 255]);
      expect(pixel(first, 240 - 18, y)).toEqual([130, 180, 90, 255]);
    }
    expect(pixel(first, 120, 40)).not.toEqual([130, 180, 90, 255]);
  });
});

describe("the accepted Rift pieces", async () => {
  const grass = await readRaster(`${TERRAIN}/chibi-grass-1.png`);
  const piece = (name: string) =>
    readRaster(`${TERRAIN}/chibi-rift-${name}.png`);

  it("join into one crack whose outer edges are the Grass tile's own", async () => {
    for (const [orientation, names] of [
      ["HORIZONTAL", ["h-west", "h-middle", "h-east"]],
      ["VERTICAL", ["v-north", "v-middle", "v-south"]],
    ] as const) {
      const pieces = await Promise.all(names.map(piece));
      pieces.forEach((raster, index) => {
        expect([raster.width, raster.height]).toEqual([80, 80]);
        // The 4-pixel margin along the strip's outer boundary is Grass.
        for (let t = 0; t < 80; t += 1)
          for (let d = 0; d < 4; d += 1) {
            const sides =
              orientation === "HORIZONTAL"
                ? [
                    [t, d],
                    [t, 79 - d],
                  ]
                : [
                    [d, t],
                    [79 - d, t],
                  ];
            if (index === 0)
              sides.push(orientation === "HORIZONTAL" ? [d, t] : [t, d]);
            if (index === 2)
              sides.push(
                orientation === "HORIZONTAL" ? [79 - d, t] : [t, 79 - d],
              );
            for (const [x, y] of sides as [number, number][])
              expect(pixel(raster, x, y)).toEqual(pixel(grass, x, y));
          }
      });
      // The middle piece holds crack pixels on both joined edges.
      const middle = pieces[1] as RgbaRaster;
      const darkOn = (x: number, y: number) => {
        const [r, g, b] = pixel(middle, x, y);
        return (r ?? 0) + (g ?? 0) + (b ?? 0) < 200;
      };
      const edge = Array.from({ length: 80 }, (_, t) => t);
      expect(
        edge.some((t) =>
          orientation === "HORIZONTAL" ? darkOn(0, t) : darkOn(t, 0),
        ),
      ).toBe(true);
      expect(
        edge.some((t) =>
          orientation === "HORIZONTAL" ? darkOn(79, t) : darkOn(t, 79),
        ),
      ).toBe(true);
    }
  });

  it("are the recorded strip cut in three", async () => {
    const records = await loadRecords(productionLayout(ROOT, "rift"), "rift");
    for (const [first, names] of [
      ["chibi-rift-h-west", ["h-west", "h-middle", "h-east"]],
      ["chibi-rift-v-north", ["v-north", "v-middle", "v-south"]],
    ] as const) {
      const record = records.assets[first];
      expect(record?.status).toBe("ACCEPTED");
      expect(record?.derivation.kind).toBe("rift-strip");
      expect(record?.derivation.ground?.asset).toBe("chibi-grass-1");
      for (const [index, name] of names.entries()) {
        const asset = records.assets[`chibi-rift-${name}`];
        expect(asset?.recipe).toBe(record?.recipe);
        expect(asset?.derivation.riftStrip?.piece).toBe(index);
      }
    }
    const strip = groundStripRaster(grass, "HORIZONTAL");
    expect(
      cropRaster(strip, riftPieceWindow(grass, "HORIZONTAL", 1)).data,
    ).toEqual(grass.data);
  });
});

describe("the rift recipe class", async () => {
  const fragments = await loadFragments(ROOT);
  const manifest = await loadBatchManifest(ROOT, "rift");

  it("the batch is valid and its edits send the ground strip", () => {
    expect(batchManifestProblems(manifest, fragments, "rift")).toEqual([]);
    const recipe = manifest.recipes.find(
      (entry) => entry.id === "rift-h-g1-dark",
    );
    if (recipe === undefined) throw new Error("recipe missing");
    const request = requestSnapshot(fragments, manifest, recipe);
    expect(request.groundStrip).toEqual(recipe.groundStrip);
    const body = requestBody(request, Buffer.from("png"));
    expect(body).toMatchObject({ width: 240, height: 80 });
  });

  it("refuses a rift piece without its strip settings or with a wrong size", () => {
    const broken: ChibiBatchManifest = {
      ...manifest,
      assets: manifest.assets.map((asset) =>
        asset.id === "chibi-rift-h-west"
          ? ({ ...asset, riftStrip: undefined } as unknown as typeof asset)
          : asset,
      ),
      recipes: manifest.recipes.map((recipe) =>
        recipe.id === "rift-v-g1-dark"
          ? { ...recipe, requestSize: { width: 240, height: 80 } }
          : recipe,
      ),
    };
    const problems = batchManifestProblems(broken, fragments, "rift");
    expect(problems.some((line) => line.includes("needs riftStrip"))).toBe(
      true,
    );
    expect(
      problems.some((line) => line.includes("must be the 80x240 strip")),
    ).toBe(true);
  });
});
