import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAssetProblemsV7,
  chibiOverflowV7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
import { VISUAL_DIRECTION_SAMPLE_SETS_V7 } from "../../src/render/canvas/visual-direction-samples-v7";
import {
  batchManifestProblems,
  layeredPrompt,
  type ChibiBatchManifest,
} from "../../scripts/art/chibi/batch-manifest";
import type { RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
} from "../../scripts/art/chibi/pipeline";
import {
  cropBands,
  cropRowsRaster,
  opaqueBounds,
  periodMismatch,
  seatedRaster,
} from "../../scripts/art/chibi/raster";
import { loadSubmissionReceipt } from "../../scripts/art/pixellab-recovery";

const ROOT = process.cwd();
const BATCH = "direction-human";

const HUMAN_ROLES = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
] as const;
const IMPROVEMENTS = [
  "FARM",
  "LUMBER_CAMP",
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "MARKET",
  "MONUMENT",
  "PORT",
  "SHIPYARD",
] as const;

/** A raster from rows of characters: "." is transparent, a letter opaque. */
function raster(rows: readonly string[]): RgbaRaster {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8Array(width * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((code, x) => {
      if (code === ".") return;
      const offset = (y * width + x) * 4;
      data[offset] = code.charCodeAt(0);
      data[offset + 1] = 120;
      data[offset + 2] = 40;
      data[offset + 3] = 255;
    }),
  );
  return { width, height: rows.length, data };
}

function picture(image: RgbaRaster): string[] {
  const rows: string[] = [];
  for (let y = 0; y < image.height; y += 1) {
    let row = "";
    for (let x = 0; x < image.width; x += 1)
      row +=
        (image.data[(y * image.width + x) * 4 + 3] ?? 0) >= 128 ? "#" : ".";
    rows.push(row);
  }
  return rows;
}

describe("production art of the new visual direction (pulp_wars-3tq.5)", () => {
  it("registers every Human unit and portrait, the shared improvements, City 1-3 and the Village", () => {
    const registry = chibiDirectionArtRegistryV7();
    const subjects: ArtSubjectV7[] = [
      ...HUMAN_ROLES.map((role) => `UNIT:${role}` as const),
      ...HUMAN_ROLES.map((role) => `PORTRAIT:${role}` as const),
      ...IMPROVEMENTS.map((id) => `IMPROVEMENT:${id}` as const),
      "CITY:1",
      "CITY:2",
      "CITY:3",
      "SITE:VILLAGE",
    ];
    for (const subject of subjects)
      expect(registry.variants(subject), subject).toHaveLength(1);
    expect(CHIBI_DIRECTION_ART_ASSETS_V7).toHaveLength(subjects.length);
    // One Farm: the vegetable beds the user chose (bead pulp_wars-9s0.7).
    expect(
      registry.variants("IMPROVEMENT:FARM").map((asset) => asset.id),
    ).toEqual(["chibi-direction-farm"]);
    // Ships are shared by every faction and are not converted; neither are
    // the other factions.
    for (const subject of [
      "UNIT:PATROL_BOAT",
      "UNIT:BATTLESHIP",
      "UNIT:EMBARKED_TRANSPORT",
      "UNIT:UNDEAD:FIGHTER",
      "UNIT:GOBLIN:FIGHTER",
      "UNIT:DINOSAUR:FIGHTER",
      "CITY:UNDEAD:1",
    ] as const)
      expect(registry.variants(subject), subject).toHaveLength(0);
  });

  it("keeps the default registry untouched: the direction art is a separate list", () => {
    const defaults = new Set(CHIBI_ART_ASSETS_V7.map((asset) => asset.id));
    for (const asset of CHIBI_DIRECTION_ART_ASSETS_V7) {
      expect(asset.id).toMatch(/^chibi-direction-/);
      expect(defaults.has(asset.id), asset.id).toBe(false);
    }
    expect(
      CHIBI_ART_ASSETS_V7.some((asset) => asset.id.includes("direction")),
    ).toBe(false);
    const registry = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    for (const role of HUMAN_ROLES) {
      const variants = registry.variants(`UNIT:${role}`);
      expect(variants.map((asset) => asset.id)).toEqual([
        `chibi-${role.toLowerCase()}`,
      ]);
      expect(variants[0]?.ownerMaskUrl).toBeDefined();
      expect(variants[0]?.fixedColours).toBeUndefined();
    }
    for (const level of [1, 2, 3] as const)
      expect(
        registry.variants(`CITY:${level}`).map((asset) => asset.id),
      ).toEqual([`chibi-city-${level}`]);
    // The benches can draw the production set by name.
    expect(VISUAL_DIRECTION_SAMPLE_SETS_V7.PRODUCTION).toBe(
      CHIBI_DIRECTION_ART_ASSETS_V7,
    );
  });

  it("matches the accepted records of the batch, with no owner mask anywhere", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets).filter(
      (record) => record.status === "ACCEPTED",
    );
    expect(accepted.map((record) => record.id).sort()).toEqual(
      CHIBI_DIRECTION_ART_ASSETS_V7.map((asset) => asset.id).sort(),
    );
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual(
      accepted.map((record) => record.id).sort(),
    );
    for (const entry of CHIBI_DIRECTION_ART_ASSETS_V7) {
      const record = records.assets[entry.id];
      const asset = manifest.assets.find((spec) => spec.id === entry.id);
      if (asset === undefined || record === undefined)
        throw new Error(`${entry.id}: not in the batch`);
      expect(record.mask, entry.id).toBeUndefined();
      expect(entry.ownerMaskUrl, entry.id).toBeUndefined();
      expect(
        entry.url.endsWith(record.master.path.replace(/^public\//, "")),
        entry.id,
      ).toBe(true);
      expect([entry.width, entry.height]).toEqual([
        record.master.width,
        record.master.height,
      ]);
      const owned = /^(UNIT|CITY|PORTRAIT):/.test(entry.subject);
      expect(entry.fixedColours, entry.id).toBe(owned ? true : undefined);
      // The registry line the pipeline prints is the entry that is checked in.
      const line = registryEntry(asset, record);
      expect(line.includes("fixedColours: true"), entry.id).toBe(owned);
      expect(line).not.toContain("ownerMaskUrl");
      // No mask file is written beside the master.
      await expect(
        readFile(
          path.join(ROOT, record.master.path.replace(/\.png$/, ".mask.png")),
        ),
      ).rejects.toThrow();
    }
  });

  it("keeps improvements at about 70% of the tile and cities inside their cell", () => {
    for (const asset of CHIBI_DIRECTION_ART_ASSETS_V7) {
      const overflow = chibiOverflowV7(asset);
      if (asset.subject.startsWith("IMPROVEMENT:")) {
        expect(overflow.up, asset.id).toBe(0);
        expect(asset.width, asset.id).toBeLessThanOrEqual(
          asset.subject === "IMPROVEMENT:FARM" ? 80 : 72,
        );
      }
      if (asset.subject.startsWith("CITY:"))
        expect(overflow.up, asset.id).toBeLessThanOrEqual(8);
    }
    const sizes = ([1, 2, 3] as const).map((level) => {
      const city = CHIBI_DIRECTION_ART_ASSETS_V7.find(
        (asset) => asset.subject === `CITY:${level}`,
      );
      return (city?.width ?? 0) * (city?.height ?? 0);
    });
    expect(sizes[0]).toBeLessThan(sizes[1] ?? 0);
    expect(sizes[1]).toBeLessThan(sizes[2] ?? 0);
  });

  it("records a pennant anchor inside the art of City 1-3, the Port and the Shipyard only", () => {
    const anchored = Object.keys(DIRECTION_FLAG_ANCHORS_V7).filter((id) =>
      id.startsWith("chibi-direction-"),
    );
    expect(anchored.sort()).toEqual([
      "chibi-direction-city-1",
      "chibi-direction-city-2",
      "chibi-direction-city-3",
      "chibi-direction-port",
      "chibi-direction-shipyard",
    ]);
    for (const id of anchored) {
      const asset = CHIBI_DIRECTION_ART_ASSETS_V7.find(
        (entry) => entry.id === id,
      );
      const anchor = DIRECTION_FLAG_ANCHORS_V7[id];
      if (asset === undefined || anchor === undefined)
        throw new Error(`${id}: no asset or anchor`);
      expect(anchor.x).toBeGreaterThan(0);
      expect(anchor.x).toBeLessThan(asset.width);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.y + anchor.pole).toBeLessThan(asset.height);
    }
  });

  it("the Farm tiles without a seam, with a gap on the centre line for a Road", async () => {
    // The vegetable beds the user chose (bead pulp_wars-9s0.7), the only
    // Farm: the comparison's lettuce and cabbage masters are gone.
    const farms = CHIBI_DIRECTION_ART_ASSETS_V7.filter(
      (asset) => asset.subject === "IMPROVEMENT:FARM",
    );
    expect(farms.map((asset) => asset.id)).toEqual(["chibi-direction-farm"]);
    for (const retired of ["lettuce", "cabbage", "veggies"])
      await expect(
        readFile(
          path.join(
            ROOT,
            `public/assets/chibi/buildings/chibi-direction-farm-${retired}.png`,
          ),
        ),
      ).rejects.toThrow();
    const farm = farms[0];
    if (farm === undefined) throw new Error("no Farm");
    expect([farm.width, farm.height]).toEqual([80, 80]);
    const master = await readRaster(
      path.join(ROOT, `public/assets/chibi/buildings/${farm.id}.png`),
    );
    // Top and bottom line of each run of crop lines. Three raised beds, kept
    // as the candidate drew them (21 to 24 px), at a pitch of 80 / 3 px and
    // moved down half a pitch: the first and last run are the two halves of
    // the bed that straddles the top and bottom edges.
    const bands = cropBands(master);
    expect(bands.map((band) => [band.top, band.bottom])).toEqual([
      [0, 11],
      [16, 36],
      [42, 63],
      [68, 79],
    ]);
    const opaque = (x: number, y: number): boolean =>
      (master.data[(y * master.width + x) * 4 + 3] ?? 0) >= 128;
    const filled = (y: number): number =>
      Array.from({ length: master.width }, (_, x) => opaque(x, y)).filter(
        Boolean,
      ).length;
    // The strip of soil under each bed runs unbroken from edge to edge: no
    // margin makes a seam between side-by-side Farms.
    for (const band of bands.slice(0, 3))
      for (let y = band.bottom - 2; y <= band.bottom; y += 1)
        expect(filled(y), `soil row ${y}`).toBe(80);
    // The bed on the edge continues in the Farm above and below, and the
    // tile repeats exactly.
    expect(filled(79)).toBeGreaterThan(0);
    expect(filled(0)).toBeGreaterThan(0);
    expect(periodMismatch(master, 80, 80)).toBe(0);
    // A gap of 5 px lies on the cell's centre line, where an east-west Road
    // runs; the other two gaps are 4 px.
    for (const y of [37, 38, 39, 40, 41, 12, 13, 14, 15, 64, 65, 66, 67])
      expect(filled(y), `row ${y}`).toBe(0);
    expect(opaqueBounds(master)?.left).toBe(0);
    expect(opaqueBounds(master)?.right).toBe(79);
    // No player or faction colour: greens and browns only, nothing blue or
    // violet (the darkest outline is a near-black teal).
    for (let index = 0; index < master.data.length; index += 4) {
      if ((master.data[index + 3] ?? 0) < 128) continue;
      const [r, g, b] = [
        master.data[index] ?? 0,
        master.data[index + 1] ?? 0,
        master.data[index + 2] ?? 0,
      ];
      expect(b, `pixel ${index / 4}`).toBeLessThanOrEqual(Math.max(r, g) + 16);
    }
  });
});

describe("pipeline support for the new visual direction (pulp_wars-3tq.5)", async () => {
  const fragments = await loadFragments(ROOT);
  const manifest = await loadBatchManifest(ROOT, BATCH);

  it("accepts the batch, and refuses unowned units without the fixed-colour flag", () => {
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    const { fixedFactionColours: _flag, ...withoutFlag } = manifest;
    void _flag;
    const problems = batchManifestProblems(
      withoutFlag as ChibiBatchManifest,
      fragments,
      BATCH,
    );
    expect(
      problems.some((problem) =>
        problem.includes("units and cities must carry owner colour"),
      ),
    ).toBe(true);
    // The runtime contract: a mask or fixed colours, never both or neither.
    const unit = {
      id: "chibi-x",
      subject: "UNIT:FIGHTER" as const,
      assetClass: "STANDARD_UNIT" as const,
      width: 56,
      height: 80,
      url: "x.png",
    };
    expect(chibiAssetProblemsV7(unit).join()).toContain("owner mask");
    expect(chibiAssetProblemsV7({ ...unit, fixedColours: true })).toEqual([]);
    expect(
      chibiAssetProblemsV7({ ...unit, fixedColours: true, ownerMaskUrl: "m" }),
    ).toHaveLength(1);
    expect(
      chibiAssetProblemsV7({
        ...unit,
        subject: "IMPROVEMENT:FARM",
        assetClass: "BUILDING",
        fixedColours: true,
      }),
    ).toHaveLength(1);
  });

  it("prompts a calm building with the calm style, the shared materials and no faction or owner layer", () => {
    const find = (subject: string) => {
      const asset = manifest.assets.find((entry) => entry.subject === subject);
      if (asset === undefined) throw new Error(`the batch lost ${subject}`);
      return asset;
    };
    const prompt = layeredPrompt(
      fragments,
      manifest,
      find("IMPROVEMENT:SAWMILL"),
      {},
    );
    expect(prompt.layers.map((layer) => layer.layer)).toEqual([
      "style",
      "camera",
      "class",
      "subject",
    ]);
    expect(prompt.layers[0]?.source).toContain("style-calm.txt");
    expect(prompt.prompt).toContain("terracotta");
    expect(prompt.prompt).toContain("saw blade");
    expect(prompt.prompt).not.toContain(fragments.style.text);
    expect(prompt.prompt).not.toContain(fragments.owner.text);
    expect(prompt.negativePrompt.split(", ")).toEqual(
      expect.arrayContaining(["flag", "banner", "black outline"]),
    );
    const city = layeredPrompt(fragments, manifest, find("CITY:3"), {});
    expect(city.prompt).toContain("sandstone");
    expect(city.prompt).toContain("no empty courtyard");
    expect(city.layers.some((layer) => layer.layer === "owner")).toBe(false);
    const farm = layeredPrompt(
      fragments,
      manifest,
      find("IMPROVEMENT:FARM"),
      {},
    );
    expect(farm.layers[0]?.source).toContain("style-crop.txt");
    expect(farm.layers[1]?.source).toContain("camera-crop-pattern.txt");
    // The chibi classes still use the chibi style.
    const fighter = {
      id: "chibi-f",
      subject: "UNIT:FIGHTER" as const,
      assetClass: "STANDARD_UNIT" as const,
      recipeClass: "unit" as const,
      canvas: { width: 56, height: 80 },
    };
    expect(
      layeredPrompt(fragments, { faction: "ORIGINAL" }, fighter, {}).layers[0]
        ?.source,
    ).toContain("fragments/style.txt");
  });

  it("seats a piece: centred, a margin above the bottom, cut to the master window", () => {
    const candidate = raster([
      "........",
      ".ab.....",
      ".cd.....",
      "........",
      "........",
      "........",
    ]);
    expect(
      picture(seatedRaster(candidate, { width: 8, height: 6 }, 1)),
    ).toEqual([
      "........",
      "........",
      "........",
      "...##...",
      "...##...",
      "........",
    ]);
    // A smaller master is the bottom-centred window of the seated candidate.
    expect(
      picture(seatedRaster(candidate, { width: 4, height: 4 }, 1)),
    ).toEqual(["....", ".##.", ".##.", "...."]);
    expect(() => seatedRaster(candidate, { width: 1, height: 4 }, 1)).toThrow(
      /does not fit/,
    );
    expect(() => seatedRaster(candidate, { width: 9, height: 6 }, 1)).toThrow(
      /cannot be larger/,
    );
    expect(() =>
      seatedRaster(raster(["....", "...."]), { width: 4, height: 2 }, 0),
    ).toThrow(/empty/);
  });

  it("stamps crop rows at a period that divides the tile", () => {
    const candidate = raster([
      "........",
      ".ab..c..",
      ".de..f..",
      "........",
      "gggggggg",
    ]);
    const spec = {
      rows: 2,
      band: 0,
      period: 4,
      stamps: [{ left: 1, width: 2, at: 0 }],
      saturation: 1,
      strawMix: 0,
    };
    const size = { width: 8, height: 8 };
    const tile = cropRowsRaster(candidate, size, spec);
    expect(picture(tile)).toEqual([
      "........",
      "##..##..",
      "##..##..",
      "........",
      "........",
      "##..##..",
      "##..##..",
      "........",
    ]);
    expect(periodMismatch(tile, 4, 4)).toBe(0);
    expect(periodMismatch(tile, 3, 4)).toBeGreaterThan(0);
    // Colours are kept when nothing is calmed.
    expect(tile.data[8 * 4]).toBe("a".charCodeAt(0));
    expect(() =>
      cropRowsRaster(candidate, size, { ...spec, period: 3 }),
    ).toThrow(/divide/);
    expect(() => cropRowsRaster(candidate, size, { ...spec, band: 5 })).toThrow(
      /no crop row/,
    );
    expect(() => cropRowsRaster(candidate, size, { ...spec, rows: 4 })).toThrow(
      /no gap/,
    );
    // A stamp may name its source row and its tile rows, and a tile row may
    // be shifted along itself, wrapping round the period.
    const varied = cropRowsRaster(candidate, size, {
      ...spec,
      stamps: [
        { left: 1, width: 2, at: 0, rows: [0] },
        { left: 0, width: 3, at: 0, band: 1, rows: [1] },
      ],
      rowOffsets: [3, 2],
    });
    expect(picture(varied)).toEqual([
      "........",
      "#..##..#",
      "#..##..#",
      "........",
      "........",
      "........",
      "#.###.##",
      "........",
    ]);
    expect(varied.data[(8 + 3) * 4]).toBe("a".charCodeAt(0));
    expect(varied.data[8 * 4]).toBe("b".charCodeAt(0));
    // trimBottom drops the bottom lines of the stamped row (thinner soil,
    // wider gaps), and the rows need not divide the tile height: three rows
    // on nine lines stand at a 3 px pitch, each centred in its third.
    expect(
      picture(
        cropRowsRaster(
          candidate,
          { width: 8, height: 9 },
          {
            ...spec,
            rows: 3,
            trimBottom: 1,
          },
        ),
      ),
    ).toEqual([
      "........",
      "##..##..",
      "........",
      "........",
      "##..##..",
      "........",
      "........",
      "##..##..",
      "........",
    ]);
    expect(() =>
      cropRowsRaster(candidate, size, { ...spec, trimBottom: 2 }),
    ).toThrow(/trimBottom/);
    // phase moves every row down by a share of the pitch, wrapping round
    // the tile height: half a pitch puts a gap on the centre line of three
    // rows and one row on the top and bottom edges.
    expect(
      picture(
        cropRowsRaster(
          candidate,
          { width: 8, height: 12 },
          { ...spec, rows: 3, phase: 0.5 },
        ),
      ),
    ).toEqual([
      "##..##..",
      "........",
      "........",
      "##..##..",
      "##..##..",
      "........",
      "........",
      "##..##..",
      "##..##..",
      "........",
      "........",
      "##..##..",
    ]);
    expect(() =>
      cropRowsRaster(candidate, size, { ...spec, phase: 1 }),
    ).toThrow(/phase/);
    // The batch manifest refuses a negative trim and a phase outside 0..1,
    // and accepts three rows.
    const farm = manifest.assets.find(
      (asset) => asset.id === "chibi-direction-farm",
    );
    expect(farm?.cropRows?.rows).toBe(3);
    expect(farm?.cropRows?.phase).toBe(0.5);
    expect(
      batchManifestProblems(
        {
          ...manifest,
          assets: manifest.assets.map((asset) =>
            asset.id === farm?.id && asset.cropRows !== undefined
              ? { ...asset, cropRows: { ...asset.cropRows, phase: 1.5 } }
              : asset,
          ),
        },
        fragments,
        BATCH,
      ).some((problem) => problem.includes("phase")),
    ).toBe(true);
    const broken = {
      ...manifest,
      assets: manifest.assets.map((asset) =>
        asset.id === farm?.id && asset.cropRows !== undefined
          ? { ...asset, cropRows: { ...asset.cropRows, trimBottom: -1 } }
          : asset,
      ),
    };
    expect(
      batchManifestProblems(broken, fragments, BATCH).some((problem) =>
        problem.includes("trimBottom"),
      ),
    ).toBe(true);
  });

  it("keeps an imported recipe as the exploration's request, with its receipt", async () => {
    const layout = productionLayout(ROOT, BATCH);
    const records = await loadRecords(layout, BATCH);
    const imported = Object.values(records.recipes).filter(
      (record) => record.importedFrom !== undefined,
    );
    expect(imported.length).toBeGreaterThan(0);
    for (const record of imported) {
      const from = record.importedFrom;
      if (from === undefined) throw new Error("not imported");
      const source = JSON.parse(
        await readFile(
          path.join(ROOT, from.exploration, "records.json"),
          "utf8",
        ),
      ) as {
        recipes: Record<
          string,
          { jobId: string; request: unknown; rawSheetSha256: string }
        >;
      };
      const original = source.recipes[from.recipe];
      expect(record.jobId, record.id).toBe(original?.jobId);
      expect(record.request, record.id).toEqual(original?.request);
      expect(record.rawSheetSha256, record.id).toBe(original?.rawSheetSha256);
      expect(record.rawSheet).toBe(
        `art/pixellab/chibi-raw/batch-${BATCH}/${record.id}.png`,
      );
      const receipt = await loadSubmissionReceipt<{
        readonly styleReference?: never;
      }>(layout.submissions, record.jobId);
      expect(receipt?.id, record.id).toBe(record.id);
    }
    // The style-anchor units are edits of the accepted production sprites.
    expect(
      records.recipes["fighter-heraldic-edit"]?.request.source,
    ).toMatchObject({ batch: "1", recipe: "fighter-h-edit" });
  });
});
