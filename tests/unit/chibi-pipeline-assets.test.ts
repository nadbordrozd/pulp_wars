import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  batchManifestProblems,
  layeredPrompt,
  requestBody,
  requestSnapshot,
  type ChibiBatchManifest,
} from "../../scripts/art/chibi/batch-manifest";
import { runDryRun } from "../../scripts/art/chibi/dry-run";
import {
  OWNER_MASK_THRESHOLDS,
  extractOwnerMask,
  maskToRgba,
  ownerMaskQa,
  rgbaToMask,
  type BinaryMask,
  type RgbaRaster,
} from "../../scripts/art/chibi/owner-mask";
import {
  explorationDirectory,
  explorationLayout,
  factionDocumentBlock,
  loadBatchManifest,
  loadExploration,
  loadFragments,
  loadRecords,
  productionFactionProblems,
  productionLayout,
  readRaster,
  registryEntry,
  validateChibiProduction,
} from "../../scripts/art/chibi/pipeline";
import {
  bestSeamlessWindow,
  cropRaster,
  groundComposite,
  plateCheck,
} from "../../scripts/art/chibi/raster";

const ROOT = process.cwd();
const RAW = "art/explorations/tile80-study-2026-09/raw";
const KEY = [0xd8, 0x26, 0x2c] as const;
const KEY_SHADOW = [0x99, 0x0e, 0x25] as const; // hue 350, owner shadow tone
const RED_BROWN = [0x79, 0x27, 0x12] as const; // hue 12, a tile-80 shield rim
const STEEL = [0x80, 0x88, 0x90] as const;

type Rgb = readonly [number, number, number];

/** A raster from rows of single-character pixel codes. */
function raster(
  rows: readonly string[],
  palette: Record<string, Rgb>,
): RgbaRaster {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const data = new Uint8Array(width * height * 4);
  rows.forEach((row, y) =>
    [...row].forEach((code, x) => {
      const colour = palette[code];
      if (colour === undefined) return;
      const offset = (y * width + x) * 4;
      data.set([...colour, 255], offset);
    }),
  );
  return { width, height, data };
}

function maskFrom(rows: readonly string[]): BinaryMask {
  const width = rows[0]?.length ?? 0;
  const bits = new Uint8Array(width * rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((code, x) => {
      if (code === "#") bits[y * width + x] = 1;
    }),
  );
  return { width, height: rows.length, bits };
}

const PALETTE = { k: KEY, s: KEY_SHADOW, b: RED_BROWN, g: STEEL };

describe("chibi owner masks", () => {
  it("extracts only key-colour shades and drops speckle", () => {
    const master = raster(
      [
        "kkkkgggg",
        "ksskgggg",
        "kkkkgbbg",
        "ggggggkg", // an isolated key pixel is speckle
        "gggggggg",
      ],
      PALETTE,
    );
    const { mask, speckleDropped } = extractOwnerMask(master);
    expect(speckleDropped).toBe(1);
    const expected = maskFrom([
      "####....",
      "####....",
      "####....",
      "........",
      "........",
    ]);
    expect([...mask.bits]).toEqual([...expected.bits]);
  });

  it("never selects red-brown or dark near-red material", () => {
    const darkBrown: Rgb = [0x46, 0x15, 0x0e]; // hue 7.5, value 0.27
    const master = raster(["kkbd", "kkbd", "kkbd"], {
      ...PALETTE,
      d: darkBrown,
    });
    const { mask } = extractOwnerMask(master);
    expect([...mask.bits]).toEqual([
      ...maskFrom(["##..", "##..", "##.."]).bits,
    ]);
  });

  it("passes a clean mask and records coverage", () => {
    const master = raster(["kkgg", "kkgg", "gggg", "gggg"], PALETTE);
    const qa = ownerMaskQa(master, extractOwnerMask(master).mask, {
      owned: true,
    });
    expect(qa).toMatchObject({
      status: "PASS",
      opaquePixels: 16,
      ownerPixels: 4,
      coverage: 0.25,
      coverageOnTarget: true,
    });
  });

  it("rejects bleed onto red-brown and transparent pixels", () => {
    const master = raster(
      ["kkbbg", "kkbbg", "kkbbg", "ggggg", "gggg."],
      PALETTE,
    );
    const bleed = ownerMaskQa(
      master,
      maskFrom(["###..", "##...", "##...", ".....", "....#"]),
      { owned: true, waive: ["RED_BROWN_MATERIAL"] },
    );
    expect(bleed.status).toBe("FAIL");
    expect(bleed.maskOnRedBrown).toBe(1);
    expect(bleed.maskOnTransparent).toBe(1);
    expect(bleed.failures.map((issue) => issue.code)).toEqual([
      "MASK_ON_TRANSPARENT",
      "MASK_ON_RED_BROWN",
    ]);
  });

  it("rejects a key pixel embedded in red-brown material", () => {
    const master = raster(
      ["kkkkggg", "kkkkggg", "bbbbggg", "bkbbggg", "bbbbggg"],
      PALETTE,
    );
    const qa = ownerMaskQa(
      master,
      maskFrom(["####...", "####...", ".......", ".#.....", "......."]),
      { owned: true, waive: ["RED_BROWN_MATERIAL"] },
    );
    expect(qa.maskEmbeddedInRedBrown).toBe(1);
    expect(qa.failures.map((issue) => issue.code)).toEqual([
      "MASK_EMBEDDED_IN_RED_BROWN",
    ]);
  });

  it("rejects non-key pixels in a hand-corrected mask", () => {
    const master = raster(["kkg", "kkg", "ggg"], PALETTE);
    const qa = ownerMaskQa(master, maskFrom(["###", "##.", "..."]), {
      owned: true,
    });
    expect(qa.maskOnNonKey).toBe(1);
    expect(qa.status).toBe("FAIL");
  });

  it("flags red-brown material and lets only a reviewed override waive it", () => {
    const master = raster(["kkbg", "kkbg", "gggg", "gggg"], PALETTE);
    const mask = extractOwnerMask(master).mask;
    const strict = ownerMaskQa(master, mask, { owned: true });
    expect(strict.failures.map((issue) => issue.code)).toEqual([
      "RED_BROWN_MATERIAL",
    ]);
    const waived = ownerMaskQa(master, mask, {
      owned: true,
      waive: ["RED_BROWN_MATERIAL", "MASK_ON_RED_BROWN"],
    });
    expect(waived.status).toBe("PASS");
    expect(waived.warnings).toEqual([
      expect.objectContaining({ code: "RED_BROWN_MATERIAL", waived: true }),
    ]);
  });

  it("enforces coverage limits and size for owned assets only", () => {
    const low = raster(["kgggggggggg", "kgggggggggg", "kgggggggggg"], PALETTE);
    const lowMask = maskFrom(["#..........", "#..........", "#.........."]);
    expect(
      ownerMaskQa(low, lowMask, { owned: true }).failures.map((i) => i.code),
    ).toEqual(["COVERAGE_LOW"]);
    expect(ownerMaskQa(low, lowMask, { owned: false }).status).toBe("PASS");
    const high = raster(["kkk", "kkk", "kkg"], PALETTE);
    expect(
      ownerMaskQa(high, extractOwnerMask(high).mask, {
        owned: true,
      }).failures.map((i) => i.code),
    ).toEqual(["COVERAGE_HIGH"]);
    expect(
      ownerMaskQa(high, maskFrom(["##", "##"]), { owned: true }).failures[0]
        ?.code,
    ).toBe("MASK_SIZE_MISMATCH");
  });

  it("round-trips the runtime mask contract (alpha >= 128 = owner)", () => {
    const mask = maskFrom(["#.#", ".#."]);
    const rgba = maskToRgba(mask);
    expect([...rgba.slice(0, 4)]).toEqual([0xd8, 0x26, 0x2c, 255]);
    expect([...rgbaToMask({ width: 3, height: 2, data: rgba }).bits]).toEqual([
      ...mask.bits,
    ]);
    const half = new Uint8Array([0, 0, 0, 127, 0, 0, 0, 128]);
    expect([...rgbaToMask({ width: 2, height: 1, data: half }).bits]).toEqual([
      0, 1,
    ]);
  });

  it("reproduces the tile-80 findings on the real fixtures", async () => {
    const fighter = await readRaster(`${RAW}/bold-chibi-fighter-a.png`);
    const fighterQa = ownerMaskQa(fighter, extractOwnerMask(fighter).mask, {
      owned: true,
    });
    expect(fighterQa.failures.map((issue) => issue.code)).toEqual([
      "RED_BROWN_MATERIAL",
      "COVERAGE_LOW",
    ]);
    expect(fighterQa.maskOnRedBrown).toBe(0);
    const city = cropRaster(await readRaster(`${RAW}/bold-chibi-city-g.png`), {
      left: 0,
      top: 0,
      width: 72,
      height: 72,
    });
    const cityQa = ownerMaskQa(city, extractOwnerMask(city).mask, {
      owned: true,
    });
    expect(cityQa.status).toBe("PASS");
    expect(cityQa.coverage).toBeCloseTo(0.2518, 4);
    expect(OWNER_MASK_THRESHOLDS.owner.hue).toEqual({ from: 340, to: 5 });
  });
});

describe("chibi raster steps", () => {
  it("finds the deterministic seamless crop of the fixture meadow", async () => {
    const field = await readRaster(`${RAW}/flat-shaded-field-a.png`);
    // The same window the tile-80 test accepted.
    expect(bestSeamlessWindow(field, { width: 80, height: 80 })).toEqual({
      left: 33,
      top: 39,
      width: 80,
      height: 80,
      seamCost: 1.438,
    });
  });

  it("picks the first window whose wrap seams match", () => {
    // A key-coloured first row and column: every window touching them has a
    // seam; the first clean window in scan order is (1, 1).
    const rows = Array.from({ length: 8 }, (_, y) =>
      Array.from({ length: 8 }, (_, x) =>
        x === 0 || y === 0 ? "k" : "g",
      ).join(""),
    );
    expect(
      bestSeamlessWindow(raster(rows, PALETTE), { width: 4, height: 4 }),
    ).toEqual({ left: 1, top: 1, width: 4, height: 4, seamCost: 0 });
  });

  it("composites a tall-terrain body over its ground cell", () => {
    const body = raster([".k", "..", ".."], PALETTE);
    const ground = raster(["gg", "gg"], PALETTE);
    const out = groundComposite(body, ground);
    expect(out.height).toBe(3);
    expect([...out.data.slice(0, 4)]).toEqual([0, 0, 0, 0]);
    expect([...out.data.slice(4, 8)]).toEqual([...KEY, 255]);
    expect([...out.data.slice(8, 12)]).toEqual([...STEEL, 255]);
  });

  it("hints at plates under pieces", async () => {
    const plated = await readRaster(`${RAW}/bold-chibi-city-a.png`);
    const clean = cropRaster(await readRaster(`${RAW}/bold-chibi-city-g.png`), {
      left: 0,
      top: 0,
      width: 72,
      height: 72,
    });
    expect(plateCheck(plated).suspect).toBe(true);
    expect(plateCheck(clean).suspect).toBe(false);
  });
});

describe("chibi prompt layering and manifests", async () => {
  const fragments = await loadFragments(ROOT);
  const manifest = await loadBatchManifest(ROOT, "0");

  it("reads the faction fragment from the approved faction document", async () => {
    const markdown = await readFile("docs/art/factions/ORIGINAL.md", "utf8");
    expect(fragments.factions.ORIGINAL?.text).toBe(
      factionDocumentBlock(markdown, "Prompt fragment"),
    );
    expect(fragments.factions.ORIGINAL?.text).toMatch(/^Faction: /);
    expect(fragments.factions.ORIGINAL?.negative).toContain("musket");
    expect(fragments.factions.FACTION_TEMPLATE).toBeUndefined();
  });

  it("layers style, camera, faction, class, owner and subject in order", () => {
    const fighter = manifest.assets.find(
      (asset) => asset.subject === "UNIT:FIGHTER",
    );
    if (fighter === undefined) throw new Error("fixture asset missing");
    const prompt = layeredPrompt(fragments, manifest, fighter, {
      promptAddendum: "Extra words.",
      negativeAddendum: "pedestal, confetti",
    });
    expect(prompt.layers.map((layer) => layer.layer)).toEqual([
      "style",
      "camera",
      "faction",
      "class",
      "owner",
      "subject",
      "recipe",
    ]);
    expect(prompt.prompt).toBe(
      prompt.layers.map((layer) => layer.text).join(" "),
    );
    let at = -1;
    for (const layer of prompt.layers) {
      const next = prompt.prompt.indexOf(layer.text);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
    const terms = prompt.negativePrompt.split(", ");
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms.filter((term) => term === "pedestal")).toHaveLength(1);
    expect(terms.at(-1)).toBe("confetti");
    expect(prompt.description).toBe(
      `${prompt.prompt} Must not include: ${prompt.negativePrompt}.`,
    );
  });

  it("keeps terrain faction-neutral and unowned", () => {
    const grass = manifest.assets.find(
      (asset) => asset.subject === "TERRAIN:GRASS",
    );
    if (grass === undefined) throw new Error("fixture asset missing");
    const prompt = layeredPrompt(fragments, manifest, grass, {});
    expect(prompt.layers.map((layer) => layer.layer)).toEqual([
      "style",
      "camera",
      "class",
      "subject",
    ]);
    expect(prompt.layers[1]?.source).toContain("camera-top-down");
  });

  it("swapping the faction fragment changes only layer 3", () => {
    const fighter = manifest.assets.find(
      (asset) => asset.subject === "UNIT:FIGHTER",
    );
    if (fighter === undefined) throw new Error("fixture asset missing");
    const swapped = {
      ...fragments,
      factions: {
        ...fragments.factions,
        TEST: { source: "test", text: "Faction: clockwork test robots." },
      },
      subjects: {
        ...fragments.subjects,
        TEST: fragments.subjects.ORIGINAL ?? {},
      },
    };
    const human = layeredPrompt(swapped, manifest, fighter, {});
    const robot = layeredPrompt(swapped, { faction: "TEST" }, fighter, {});
    const differing = human.layers
      .map((layer, index) => [layer, robot.layers[index]] as const)
      .filter(([a, b]) => a.text !== b?.text || a.source !== b.source)
      .map(([layer]) => layer.layer);
    expect(differing).toEqual(["faction", "subject"]);
    expect(robot.layers[5]?.text).toBe(human.layers[5]?.text);
  });

  it("builds the proven PixelLab bodies", () => {
    const fighter = manifest.recipes.find(
      (recipe) => recipe.id === "dry-fighter-a",
    );
    const edit = manifest.recipes.find(
      (recipe) => recipe.id === "dry-city-a-edit",
    );
    if (fighter === undefined || edit === undefined)
      throw new Error("fixture recipe missing");
    const request = requestSnapshot(fragments, manifest, fighter);
    expect(requestBody(request)).toEqual({
      description: request.description,
      image_size: { width: 56, height: 80 },
      no_background: true,
      seed: 67204,
      outline: "single color black outline",
      detail: "low detail",
      view: "low top-down",
      direction: "south-east",
    });
    const editRequest = requestSnapshot(fragments, manifest, edit);
    expect(editRequest.editInstruction).toMatch(/^Remove all ground/);
    expect(editRequest.editInstruction?.length).toBeLessThanOrEqual(500);
    const body = requestBody(editRequest, Buffer.from("png"));
    expect(body).toMatchObject({ width: 72, height: 72, seed: 67203 });
    expect(() => requestBody(editRequest)).toThrow(/source image/);
  });

  it("accepts the checked-in batch manifests", async () => {
    expect(batchManifestProblems(manifest, fragments, "0")).toEqual([]);
    expect(await validateChibiProduction(ROOT)).toEqual([]);
  });

  it("rejects manifests that break the recipes or the runtime contract", () => {
    const [grass, city, fighter, marksman] = manifest.assets;
    const [field, cityA, cityEdit, fighterA] = manifest.recipes;
    if (
      !grass ||
      !city ||
      !fighter ||
      !marksman ||
      !field ||
      !cityA ||
      !cityEdit ||
      !fighterA
    )
      throw new Error("fixture manifest changed");
    const broken: ChibiBatchManifest = {
      ...manifest,
      dryRun: false,
      assets: [
        { ...grass, canvas: { width: 80, height: 72 } },
        { ...city, canvas: { width: 104, height: 112 } },
        { ...fighter, ownerColour: false },
        {
          ...marksman,
          maskOverride: {
            path: "x.png",
            masterPixelSha256: "nope",
            reason: "short",
            waive: ["MASK_ON_RED_BROWN"],
          },
        },
      ],
      recipes: [
        { ...field, requestSize: { width: 120, height: 120 } },
        { ...cityEdit, id: "edit-first" },
        { ...cityA, endpoint: "create-image-pixflux" },
        {
          ...fighterA,
          requestSize: { width: 58, height: 80 },
          options: { view: "isometric" },
        },
      ],
    };
    const problems = batchManifestProblems(broken, fragments, "0").join("\n");
    for (const expected of [
      "terrain tiles must be exactly 80 x 80",
      "exceeds 96 x 104",
      "units and cities must carry owner colour",
      "mask override needs the master pixel sha256",
      "mask override needs a written reason",
      "QA code MASK_ON_RED_BROWN cannot be waived",
      "terrain fields must be at least twice the tile",
      "edit source must be an earlier recipe",
      "settlement does not generate with create-image-pixflux",
      "Pixen sizes must be multiples of 4",
      'option view cannot be "isometric"',
      "never downscale",
      "production recipes cannot use fixtures",
    ])
      expect(problems).toContain(expected);
  });

  it("sends a checked-in forced palette and validates terrain variant windows", async () => {
    const batch1 = await loadBatchManifest(ROOT, "1");
    expect(batchManifestProblems(batch1, fragments, "1")).toEqual([]);
    const paletted = batch1.recipes.find((recipe) => recipe.id === "grass-1-a");
    if (paletted?.colorImage === undefined)
      throw new Error("batch 1 grass recipe lost its palette");
    const request = requestSnapshot(fragments, batch1, paletted);
    expect(request.colorImage).toEqual(paletted.colorImage);
    expect(() => requestBody(request)).toThrow(/colour image bytes/);
    const png = Buffer.from("palette");
    expect(requestBody(request, undefined, png)).toMatchObject({
      shading: "flat shading",
      color_image: {
        type: "base64",
        base64: png.toString("base64"),
        format: "png",
      },
    });
    const [grass, , fighter] = manifest.assets;
    const [field, , , fighterA] = manifest.recipes;
    if (!grass || !fighter || !field || !fighterA)
      throw new Error("fixture manifest changed");
    const palette = { path: "art/palette.png", sha256: "nope" };
    const broken: ChibiBatchManifest = {
      ...manifest,
      dryRun: false,
      assets: [
        { ...grass, cropRegion: { left: 100, top: 0, width: 80, height: 70 } },
        {
          ...grass,
          id: "chibi-dry-grass-2",
          fieldRecipe: "dry-fighter-a",
        },
        { ...fighter, cropRegion: { left: 0, top: 0, width: 80, height: 80 } },
      ],
      recipes: [
        {
          ...field,
          colorImage: palette,
        },
        {
          ...fighterA,
          colorImage: palette,
        },
      ],
    };
    const problems = batchManifestProblems(broken, fragments, "0").join("\n");
    for (const expected of [
      "cropRegion is smaller than the tile",
      "cropRegion falls outside recipe dry-grass-field-a's field",
      "a field recipe must be a terrain variant of the same subject",
      "a shared field needs its own cropRegion",
      "cropRegion is only for terrain crops",
      "only Pixflux takes a forced palette",
      "forced palettes are PNGs in scripts/art/chibi/palettes/",
      "forced palette needs a sha256",
    ])
      expect(problems).toContain(expected);
  });

  it("formats registry entries for src/assets/chibi-art-manifest.ts", async () => {
    const records = JSON.parse(
      await readFile(
        "art/pixellab/reviews/chibi-batch-0/dry-run/records.json",
        "utf8",
      ),
    ) as { assets: Record<string, Parameters<typeof registryEntry>[1]> };
    const city = manifest.assets.find(
      (asset) => asset.id === "chibi-dry-city-1",
    );
    const record = records.assets["chibi-dry-city-1"];
    if (city === undefined || record === undefined)
      throw new Error("dry-run evidence missing");
    const production = {
      ...record,
      master: {
        ...record.master,
        path: "public/assets/chibi/settlements/chibi-dry-city-1.png",
      },
      ...(record.mask === undefined
        ? {}
        : {
            mask: {
              ...record.mask,
              path: "public/assets/chibi/settlements/chibi-dry-city-1.mask.png",
            },
          }),
    };
    expect(registryEntry(city, production)).toBe(
      '  { id: "chibi-dry-city-1", subject: "CITY:1", assetClass: "SETTLEMENT", width: 72, height: 72, url: chibiArtUrl("assets/chibi/settlements/chibi-dry-city-1.png"), ownerMaskUrl: chibiArtUrl("assets/chibi/settlements/chibi-dry-city-1.mask.png") },',
    );
  });
});

describe("chibi dry run", () => {
  const temporary: string[] = [];
  afterAll(async () => {
    for (const directory of temporary)
      await rm(directory, { recursive: true, force: true });
  });

  it("reproduces the checked-in batch-0 evidence without PixelLab", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-dry-run-"));
    temporary.push(root);
    for (const directory of [
      "scripts/art/chibi/fragments",
      "scripts/art/chibi/subjects",
      "scripts/art/chibi/batches",
      "scripts/art/chibi/fixtures",
      "docs/art/factions",
      RAW,
    ])
      await cp(path.join(ROOT, directory), path.join(root, directory), {
        recursive: true,
      });
    const previousKey = process.env.PIXELLAB_API_KEY;
    delete process.env.PIXELLAB_API_KEY;
    try {
      const { records } = await runDryRun(root, "0");
      expect(
        Object.fromEntries(
          Object.values(records.assets).map((asset) => [
            asset.id,
            asset.status,
          ]),
        ),
      ).toEqual({
        "chibi-dry-city-1": "ACCEPTED",
        "chibi-dry-fighter": "MASK_REJECTED",
        "chibi-dry-grass": "ACCEPTED",
        "chibi-dry-marksman": "ACCEPTED",
      });
      expect(records.recipes["dry-city-a"]?.review?.verdict).toBe("REJECTED");
      expect(records.recipes["dry-city-a"]?.plateHints?.[0]?.suspect).toBe(
        true,
      );
      expect(records.assets["chibi-dry-marksman"]?.mask?.source).toBe(
        "OVERRIDE",
      );
      expect(records.assets["chibi-dry-grass"]?.mask).toBeUndefined();
      const checkedIn = await readFile(
        "art/pixellab/reviews/chibi-batch-0/dry-run/records.json",
        "utf8",
      );
      expect(
        await readFile(
          path.join(
            root,
            "art/pixellab/reviews/chibi-batch-0/dry-run/records.json",
          ),
          "utf8",
        ),
      ).toBe(checkedIn);
      // Dry-run receipts stay beside the evidence, never in production.
      expect(
        (
          await readdir(
            path.join(
              root,
              "art/pixellab/reviews/chibi-batch-0/dry-run/submissions",
            ),
          )
        ).length,
      ).toBe(5);
    } finally {
      if (previousKey !== undefined) process.env.PIXELLAB_API_KEY = previousKey;
    }
  }, 60_000);
});

describe("chibi exploration runs (faction-layer dry run)", () => {
  const RUN = "art/explorations/faction-layer-dry-run";
  const ARMS = [
    "bodies-in-fragment",
    "materials-only",
    "materials-motifs-only",
  ] as const;

  it("keeps exploration runs under art/explorations", () => {
    expect(explorationDirectory(`${RUN}/materials-motifs-only/`)).toBe(
      `${RUN}/materials-motifs-only`,
    );
    for (const outside of [
      "docs/art/factions",
      "public/assets/chibi",
      "art/pixellab/submissions",
      "art/explorations/../../public",
      "art/explorations",
    ])
      expect(() => explorationDirectory(outside), outside).toThrow(
        /art\/explorations/,
      );
    const layout = explorationLayout(ROOT, `${RUN}/materials-motifs-only`);
    for (const directory of [
      layout.records,
      layout.raw,
      layout.submissions,
      layout.masters,
    ])
      expect(
        path
          .relative(ROOT, directory)
          .startsWith(`${RUN}/materials-motifs-only`),
      ).toBe(true);
  });

  it("adds a TEST- faction for the run without making it a production faction", async () => {
    const production = await loadFragments(ROOT);
    expect(production.factions["TEST-CLOCKWORK"]).toBeUndefined();
    expect(productionFactionProblems(Object.keys(production.factions))).toEqual(
      [],
    );
    expect(productionFactionProblems(["ORIGINAL", "TEST-CLOCKWORK"])).toEqual([
      expect.stringContaining("TEST-CLOCKWORK"),
    ]);
    const run = await loadExploration(ROOT, `${RUN}/materials-motifs-only`);
    expect(run.manifest.faction).toBe("TEST-CLOCKWORK");
    expect(batchManifestProblems(run.manifest, run.fragments)).toEqual([]);
    const batch1 = await loadBatchManifest(ROOT, "1");
    const human = batch1.assets.find((asset) => asset.id === "chibi-fighter");
    const robot = run.manifest.assets.find(
      (asset) => asset.subject === "UNIT:FIGHTER",
    );
    if (human === undefined || robot === undefined)
      throw new Error("fighter assets missing");
    // Same class, canvas and geometry as the accepted Human Fighter.
    expect(robot.canvas).toEqual(human.canvas);
    expect(robot.assetClass).toBe(human.assetClass);
    const humanPrompt = layeredPrompt(run.fragments, batch1, human, {});
    const robotPrompt = layeredPrompt(run.fragments, run.manifest, robot, {});
    const changed = humanPrompt.layers
      .map((layer, index) => [layer, robotPrompt.layers[index]] as const)
      .filter(([a, b]) => a.text !== b?.text)
      .map(([layer]) => layer.layer);
    expect(changed).toEqual(["faction", "subject"]);
    expect(robotPrompt.layers[2]?.source).toContain(
      `${RUN}/materials-motifs-only/faction.md#prompt-fragment`,
    );
    expect(robotPrompt.layers[5]?.source).toBe(
      `${RUN}/materials-motifs-only/subjects.json`,
    );
  });

  it("refuses production factions and non-TEST ids in an exploration run", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-exploration-"));
    try {
      for (const directory of [
        "scripts/art/chibi/fragments",
        "scripts/art/chibi/subjects",
        "docs/art/factions",
        `${RUN}/materials-motifs-only`,
      ])
        await cp(path.join(ROOT, directory), path.join(root, directory), {
          recursive: true,
        });
      const file = path.join(root, RUN, "materials-motifs-only", "batch.json");
      const manifest = JSON.parse(await readFile(file, "utf8")) as {
        faction: string;
      };
      for (const faction of ["ORIGINAL", "CLOCKWORK"]) {
        await writeFile(file, JSON.stringify({ ...manifest, faction }));
        await expect(
          loadExploration(root, `${RUN}/materials-motifs-only`),
        ).rejects.toThrow(/TEST-<NAME>/);
      }
      // A TEST- faction checked into docs/art/factions is refused twice:
      // the run will not shadow it and art:validate flags it.
      await writeFile(file, JSON.stringify(manifest));
      await cp(
        path.join(root, RUN, "materials-motifs-only", "faction.md"),
        path.join(root, "docs/art/factions/TEST-CLOCKWORK.md"),
      );
      await expect(
        loadExploration(root, `${RUN}/materials-motifs-only`),
      ).rejects.toThrow(/is a production faction/);
      const leaked = await loadFragments(root);
      expect(productionFactionProblems(Object.keys(leaked.factions))).toEqual([
        expect.stringContaining("TEST-CLOCKWORK"),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stores every dry-run output, receipt and record inside the run, never registered", async () => {
    const registered = new Set(CHIBI_ART_ASSETS_V7.map((entry) => entry.id));
    for (const arm of ARMS) {
      const directory = `${RUN}/${arm}`;
      const run = await loadExploration(ROOT, directory);
      const records = await loadRecords(
        explorationLayout(ROOT, directory),
        run.manifest.batch,
      );
      const recipes = Object.values(records.recipes);
      expect(recipes.length, arm).toBeGreaterThan(0);
      expect(
        (await readdir(path.join(ROOT, directory, "submissions"))).length,
        arm,
      ).toBe(recipes.length);
      for (const record of recipes) {
        expect(
          record.rawSheet?.startsWith(`${directory}/raw/`),
          record.id,
        ).toBe(true);
        expect(record.request.faction).toBe("TEST-CLOCKWORK");
      }
      for (const asset of Object.values(records.assets)) {
        expect(registered.has(asset.id), asset.id).toBe(false);
        expect(asset.master.path.startsWith(`${directory}/assets/`)).toBe(true);
        expect(asset.mask?.path.startsWith(`${directory}/assets/`)).toBe(true);
      }
    }
  });
});

describe("chibi runtime registry", () => {
  it("registers only accepted, mask-checked production assets", async () => {
    const batches = (await readdir("scripts/art/chibi/batches"))
      .map((file) => /^batch-([a-z0-9-]+)\.json$/.exec(file)?.[1])
      .filter((batch): batch is string => batch !== undefined);
    const accepted = new Map<
      string,
      { path: string; mask?: string; width: number; height: number }
    >();
    for (const batch of batches) {
      const manifest = await loadBatchManifest(ROOT, batch);
      if (manifest.dryRun) continue;
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      for (const record of Object.values(records.assets))
        if (record.status === "ACCEPTED")
          accepted.set(record.id, {
            path: record.master.path,
            ...(record.mask === undefined ? {} : { mask: record.mask.path }),
            width: record.master.width,
            height: record.master.height,
          });
    }
    for (const entry of CHIBI_ART_ASSETS_V7) {
      const record = accepted.get(entry.id);
      expect(record, entry.id).toBeDefined();
      expect(
        entry.url.endsWith(record?.path.replace(/^public\//, "") ?? "?"),
        entry.id,
      ).toBe(true);
      expect({ width: entry.width, height: entry.height }).toEqual({
        width: record?.width,
        height: record?.height,
      });
      if (entry.ownerMaskUrl !== undefined)
        expect(
          entry.ownerMaskUrl.endsWith(
            record?.mask?.replace(/^public\//, "") ?? "?",
          ),
        ).toBe(true);
    }
  });
});
