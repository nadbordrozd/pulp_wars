import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  accentRaster,
  isAccentColour,
  type AccentSpec,
} from "../../scripts/art/chibi/accent";
import {
  CHIBI_CLASS_RECIPES,
  batchManifestProblems,
} from "../../scripts/art/chibi/batch-manifest";
import { rgbToHsv, type RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import { candidateCell, cropRaster } from "../../scripts/art/chibi/raster";
import {
  CHIBI_DIRECTION_CULT_ART_ASSETS_V7,
  CHIBI_DIRECTION_CULT_NAVAL_ART_ASSETS_V7,
} from "../../src/assets/chibi-direction-cult-art-manifest";
import { chibiAnchorV7 } from "../../src/assets/chibi-art-v7";
import {
  CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7,
  SUBMARINE_ANCHOR_V7,
} from "../../src/assets/chibi-naval-submarine-art-manifest";

const ROOT = process.cwd();
const BATCH = "direction-cult";

/** The first sample of CULT.md: asset, subject, class, canvas, preset. */
const SAMPLE = [
  [
    "chibi-direction-cult-initiate",
    "UNIT:CULT:FIGHTER",
    "STANDARD_UNIT",
    56,
    80,
    "cult-lodge",
  ],
  [
    "chibi-direction-cult-horror",
    "UNIT:CULT:HORROR",
    "LARGE_UNIT",
    72,
    88,
    "cult-green",
  ],
  [
    "chibi-direction-cult-herald",
    "UNIT:CULT:HERALD",
    "GIANT_UNIT",
    88,
    104,
    "cult-lodge",
  ],
] as const;

const GREEN: AccentSpec = ACCENT_PRESETS["cult-green"];
const LODGE: AccentSpec = ACCENT_PRESETS["cult-lodge"];

function raster(pixels: readonly (readonly [number, number, number])[]) {
  const data = new Uint8Array(pixels.length * 4);
  pixels.forEach(([r, g, b], index) => data.set([r, g, b, 255], index * 4));
  return { width: pixels.length, height: 1, data };
}

function pixel(source: RgbaRaster, index: number): [number, number, number] {
  return [
    source.data[index * 4] ?? 0,
    source.data[index * 4 + 1] ?? 0,
    source.data[index * 4 + 2] ?? 0,
  ];
}

function hsvPixels(
  source: RgbaRaster,
): { hue: number; saturation: number; value: number }[] {
  const out = [];
  for (let index = 0; index < source.width * source.height; index += 1)
    if ((source.data[index * 4 + 3] ?? 0) >= 128)
      out.push(rgbToHsv(...pixel(source, index)));
  return out;
}

const master = (id: string): Promise<RgbaRaster> =>
  readRaster(path.join(ROOT, "public/assets/chibi/units", `${id}.png`));

describe("the Cultists' first art sample (pulp_wars-mch9.14)", () => {
  it("is a valid fixed-colour batch that starts with the Initiate, the Horror and the Herald", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    expect(manifest.faction).toBe("CULT");
    expect(manifest.fixedFactionColours).toBe(true);
    expect(
      manifest.assets
        .slice(0, SAMPLE.length)
        .map((asset) => [
          asset.id,
          asset.subject,
          asset.assetClass,
          asset.canvas.width,
          asset.canvas.height,
          asset.accent,
        ]),
    ).toEqual(SAMPLE.map((row) => [...row]));
    // Every unit says it has no owner colour; the frog is a marker.
    for (const asset of manifest.assets)
      expect(asset.ownerColour, asset.id).toBe(
        asset.subject === "FROG" ? undefined : false,
      );
  });

  it("keeps layer 3 free of figures and buildings, and the subjects of the sample", async () => {
    const fragments = await loadFragments(ROOT);
    const fragment = fragments.factions.CULT?.text ?? "";
    expect(fragment).toContain("midnight indigo");
    expect(fragment.split(/\s+/).length).toBeLessThanOrEqual(60);
    for (const word of ["cultist", "monk", "lodge", "tentacle", "monster"])
      expect(fragment.toLowerCase()).not.toContain(word);
    const subjects = JSON.parse(
      await readFile(
        path.join(ROOT, "scripts/art/chibi/subjects/CULT.json"),
        "utf8",
      ),
    ) as { faction: string; subjects: Record<string, string> };
    expect(subjects.faction).toBe("CULT");
    for (const [, subject] of SAMPLE)
      expect(subjects.subjects[subject], subject).toContain("Subject: ");
    // The summoned name their own colours: the fragment must not turn a
    // cultist teal.
    expect(subjects.subjects["UNIT:CULT:HORROR"]).toContain("deep-sea teal");
    expect(fragment).not.toContain("teal");
  });

  it("accepted each sprite with its accent, and the master re-derives from its candidate", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const [id, subject, , width, height, preset] of SAMPLE) {
      const record = records.assets[id];
      expect(record?.status, id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(record.subject).toBe(subject);
      expect(record.mask, id).toBeUndefined();
      expect(record.master.width).toBe(width);
      expect(record.master.height).toBe(height);
      expect(record.derivation.kind).toBe("as-is");
      expect(record.derivation.accent?.preset).toBe(preset);
      expect(record.derivation.accent?.spec).toEqual(ACCENT_PRESETS[preset]);
      expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
      const recipe = records.recipes[record.recipe];
      if (recipe?.rawSheet === undefined || recipe.candidateSize === undefined)
        throw new Error(`${id}: no raw sheet`);
      const candidate = cropRaster(
        await readRaster(path.join(ROOT, recipe.rawSheet)),
        {
          ...candidateCell(
            record.candidate,
            recipe.candidateCount ?? 1,
            recipe.candidateSize,
          ),
          ...recipe.candidateSize,
        },
      );
      const derived = accentRaster(candidate, ACCENT_PRESETS[preset]).raster;
      expect(
        Buffer.from(derived.data).equals(Buffer.from((await master(id)).data)),
        id,
      ).toBe(true);
    }
    // Every generated recipe has a verdict: nothing is left unreviewed.
    for (const recipe of manifest.recipes)
      expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
        /^(ACCEPTED|REJECTED)$/,
      );
  });

  it("wears one green at hue 148, indigo cloth that is not navy, and no red, violet or magenta", async () => {
    for (const [id] of SAMPLE) {
      const pixels = hsvPixels(await master(id));
      const greens = pixels.filter(
        (p) =>
          p.hue >= 80 && p.hue <= 152 && p.saturation >= 0.5 && p.value >= 0.45,
      );
      for (const green of greens) {
        expect(green.hue, id).toBeGreaterThanOrEqual(144);
        expect(green.hue, id).toBeLessThanOrEqual(152);
      }
      // "Green is at most about 8% of a lodge sprite" (CULT.md, Palette).
      expect(greens.length / pixels.length, id).toBeLessThanOrEqual(0.08);
      // Red means Unbound; violet and magenta are other factions' accents.
      expect(
        pixels.filter(
          (p) =>
            (p.hue >= 345 || p.hue <= 12) &&
            p.saturation >= 0.5 &&
            p.value >= 0.35,
        ).length,
        id,
      ).toBe(0);
      expect(
        pixels.filter(
          (p) =>
            p.hue >= 270 &&
            p.hue < 345 &&
            p.saturation >= 0.3 &&
            p.value >= 0.25,
        ).length,
        id,
      ).toBe(0);
    }
    for (const id of [
      "chibi-direction-cult-initiate",
      "chibi-direction-cult-herald",
    ]) {
      // The lodge's cloth: every saturated blue is a violet-leaning indigo
      // (hue 236 to 250) no darker than value 0.49, never a navy.
      const cloth = hsvPixels(await master(id)).filter(
        (p) =>
          p.hue >= 212 &&
          p.hue <= 266 &&
          p.saturation >= 0.45 &&
          p.value >= 0.14,
      );
      expect(cloth.length, id).toBeGreaterThan(400);
      for (const p of cloth) {
        expect(p.hue, id).toBeGreaterThanOrEqual(236);
        expect(p.hue, id).toBeLessThanOrEqual(250);
        expect(p.value, id).toBeGreaterThanOrEqual(0.48);
      }
    }
  });
});

describe("the Cult accent presets (pulp_wars-mch9.14)", () => {
  it("pins lime and emerald flames to the faction green and leaves the other materials alone", () => {
    // The flames PixelLab drew, an emerald, then materials that must stay:
    // wax cream, brass, the summoned eye, lit and dark teal, the outline.
    const source = raster([
      [0x8b, 0xf3, 0x6d],
      [0x85, 0xfa, 0x4f],
      [0x2f, 0xc8, 0x6a],
      [0xf3, 0xe7, 0xc4],
      [0xc9, 0xa2, 0x4a],
      [0xff, 0xe2, 0x7a],
      [0x78, 0xeb, 0xb6],
      [0x1f, 0x8f, 0x95],
      [0x0a, 0x0a, 0x0a],
    ]);
    const result = accentRaster(source, {
      band: GREEN.band,
      hue: GREEN.hue,
      hueSpread: GREEN.hueSpread,
    });
    expect(result.accentPixels).toBe(3);
    for (let index = 0; index < 3; index += 1) {
      const { hue } = rgbToHsv(...pixel(result.raster, index));
      expect(hue).toBeGreaterThanOrEqual(144);
      expect(hue).toBeLessThanOrEqual(152);
    }
    for (let index = 3; index < 9; index += 1)
      expect(pixel(result.raster, index)).toEqual(pixel(source, index));
    // The target itself is in the band and stays on its hue.
    expect(isAccentColour(GREEN, 0x00, 0xff, 0x78)).toBe(true);
  });

  it("lifts navy cloth shades into indigo for the lodge, in the order of their tones", () => {
    // The Initiate's drawn cloth: lit indigo, two navy shades, a near-black
    // navy; then the black inside of the hood and a teal, which must stay.
    const source = raster([
      [0x43, 0x42, 0xc6],
      [0x1a, 0x39, 0x9e],
      [0x0e, 0x11, 0x76],
      [0x0a, 0x0e, 0x42],
      [0x05, 0x05, 0x08],
      [0x2c, 0x7e, 0x75],
    ]);
    const result = accentRaster(source, LODGE).raster;
    const cloth = [0, 1, 2, 3].map((index) =>
      rgbToHsv(...pixel(result, index)),
    );
    for (const tone of cloth) {
      expect(tone.hue).toBeGreaterThanOrEqual(238);
      expect(tone.hue).toBeLessThanOrEqual(250);
      expect(tone.saturation).toBeLessThanOrEqual(0.61);
      expect(tone.value).toBeGreaterThanOrEqual(0.5);
    }
    for (let index = 1; index < cloth.length; index += 1)
      expect(cloth[index]?.value).toBeLessThan(cloth[index - 1]?.value ?? 0);
    expect(pixel(result, 4)).toEqual(pixel(source, 4));
    expect(pixel(result, 5)).toEqual(pixel(source, 5));
    // The summoned preset has no cloth band: a teal body's navy shade stays.
    const summoned = accentRaster(source, GREEN).raster;
    for (let index = 0; index < 6; index += 1)
      expect(pixel(summoned, index)).toEqual(pixel(source, index));
  });

  it("moves a summoned thing's purple shadow to navy, and a preset without a second band is unchanged", () => {
    const source = raster([
      [0x58, 0x34, 0x7f],
      [0x69, 0x42, 0x61],
      [0x1b, 0x2b, 0x5b],
    ]);
    const result = accentRaster(source, GREEN).raster;
    for (const index of [0, 1])
      expect(Math.round(rgbToHsv(...pixel(result, index)).hue)).toBe(228);
    expect(pixel(result, 2)).toEqual(pixel(source, 2));
    // The earlier presets name no second band, so their derivation is the
    // single pass it always was.
    for (const name of [
      "undead-violet",
      "martian-magenta",
      "ice-folk-blue",
      "dwarf-copper",
      "goblin-hazard",
      "candy-pink",
    ] as const)
      expect("then" in ACCENT_PRESETS[name], name).toBe(false);
  });
});

/**
 * The batches (bead pulp_wars-mch9.15): asset, subject, class, canvas,
 * recipe class, accent preset and the rows kept under a seated creation.
 */
const BATCHES = [
  [
    "idol-bearer",
    "UNIT:CULT:GUARD",
    "STANDARD_UNIT",
    56,
    80,
    "unit",
    "cult-lodge",
    null,
  ],
  [
    "familiar",
    "UNIT:CULT:RAIDER",
    "LARGE_UNIT",
    72,
    88,
    "creature",
    "cult-lodge",
    6,
  ],
  [
    "hexer",
    "UNIT:CULT:MARKSMAN",
    "STANDARD_UNIT",
    56,
    80,
    "unit",
    "cult-lodge",
    null,
  ],
  [
    "summoner",
    "UNIT:CULT:CAPTAIN",
    "STANDARD_UNIT",
    56,
    80,
    "unit",
    "cult-lodge",
    null,
  ],
  [
    "stargazer",
    "UNIT:CULT:CATAPULT",
    "LARGE_UNIT",
    72,
    88,
    "unit",
    "cult-lodge",
    6,
  ],
  ["caller", "UNIT:CULT:KNIGHT", "LARGE_UNIT", 72, 88, "unit", "cult-lodge", 6],
  [
    "chosen",
    "UNIT:CULT:SWORDSMAN",
    "STANDARD_UNIT",
    56,
    80,
    "unit",
    "cult-lodge",
    null,
  ],
  [
    "thing",
    "UNIT:CULT:JUGGERNAUT",
    "GIANT_UNIT",
    88,
    104,
    "creature",
    "cult-green",
    8,
  ],
  [
    "tentacle",
    "UNIT:CULT:TENTACLE",
    "STANDARD_UNIT",
    56,
    80,
    "creature",
    "cult-green",
    4,
  ],
  [
    "horror-unbound",
    "UNIT:CULT:HORROR_UNBOUND",
    "LARGE_UNIT",
    72,
    88,
    "unit",
    "cult-green",
    null,
  ],
  [
    "herald-unbound",
    "UNIT:CULT:HERALD_UNBOUND",
    "GIANT_UNIT",
    88,
    104,
    "machine",
    "cult-lodge",
    null,
  ],
  ["frog", "FROG", "RESOURCE", 40, 40, "creature", "cult-green", null],
] as const;

const SHIPS = [
  ["patrol-boat", "UNIT:CULT:PATROL_BOAT", "LARGE_UNIT", 72, 88],
  ["battleship", "UNIT:CULT:BATTLESHIP", "GIANT_UNIT", 88, 96],
  ["transport", "UNIT:CULT:EMBARKED_TRANSPORT", "LARGE_UNIT", 72, 72],
  ["submarine", "UNIT:CULT:SUBMARINE", "LARGE_UNIT", 72, 88],
] as const;

const isRed = (p: { hue: number; saturation: number; value: number }) =>
  (p.hue >= 345 || p.hue <= 12) && p.saturation >= 0.5 && p.value >= 0.35;
const isViolet = (p: { hue: number; saturation: number; value: number }) =>
  p.hue >= 270 && p.hue < 345 && p.saturation >= 0.3 && p.value >= 0.25;
const isGreen = (p: { hue: number; saturation: number; value: number }) =>
  p.hue >= 80 && p.hue <= 152 && p.saturation >= 0.5 && p.value >= 0.45;

describe("the Cultists' batches (pulp_wars-mch9.15)", () => {
  it("adds a creature class with no faction layer and the light stated", async () => {
    const creature = CHIBI_CLASS_RECIPES.creature;
    expect(creature.factionLayer).toBe(false);
    expect(creature.light).toBe(true);
    expect(creature.derivation).toBe("as-is");
    // PORTRAIT since bead pulp_wars-mch9.23 (the summoned things' portraits).
    expect(creature.assetClasses).toEqual([
      "STANDARD_UNIT",
      "LARGE_UNIT",
      "GIANT_UNIT",
      "RESOURCE",
      "PORTRAIT",
    ]);
    const fragments = await loadFragments(ROOT);
    const text = fragments.classes.creature.text.toLowerCase();
    // The class names no material, colour, cloth or flame: the subject does.
    for (const word of ["indigo", "cloth", "flame", "teal", "brass", "green"])
      expect(text, word).not.toContain(word);
    expect(fragments.classes.creature.negative).toContain("robe");
    // A creature recipe was sent without layer 3 (root decision 4).
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const recipe of ["thing-c", "tentacle-b", "familiar-a", "frog-a"]) {
      const layers = records.recipes[recipe]?.request.layers.map(
        (layer) => layer.layer,
      );
      expect(layers, recipe).toContain("light");
      expect(layers, recipe).not.toContain("faction");
      expect(layers, recipe).not.toContain("owner");
      const description = records.recipes[recipe]?.request.description ?? "";
      expect(description, recipe).not.toContain("secret society");
    }
    expect(
      records.recipes["caller-a"]?.request.layers.map((layer) => layer.layer),
    ).toContain("faction");
  });

  it("lists the rest of the roster after the sample, each accepted and re-derivable", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    expect(
      manifest.assets
        .slice(SAMPLE.length)
        .map((asset) => [
          asset.id,
          asset.subject,
          asset.assetClass,
          asset.canvas.width,
          asset.canvas.height,
          asset.recipeClass,
          asset.accent,
          asset.bottomMargin ?? null,
        ]),
    ).toEqual(
      BATCHES.map(([name, ...rest]) => [
        `chibi-direction-cult-${name}`,
        ...rest,
      ]),
    );
    for (const [name, subject, , width, height, , preset, margin] of BATCHES) {
      const id = `chibi-direction-cult-${name}`;
      const record = records.assets[id];
      expect(record?.status, id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(record.subject, id).toBe(subject);
      expect(record.mask, id).toBeUndefined();
      expect([record.master.width, record.master.height], id).toEqual([
        width,
        height,
      ]);
      // A fresh creation floats where Pixen drew it: it is seated on the
      // foot line of its class; an edit of an accepted sprite keeps its place.
      expect(record.derivation.kind, id).toBe(
        margin === null ? "as-is" : "seated",
      );
      expect(record.derivation.seat?.bottomMargin ?? null, id).toBe(margin);
      expect(record.derivation.accent?.preset, id).toBe(preset);
      expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
    }
    // The robed units of the batches are siblings of the accepted Initiate,
    // and the Unbound looks edits of the accepted bound sprites.
    const source = (recipe: string): string | undefined =>
      manifest.recipes.find((entry) => entry.id === recipe)?.source?.recipe;
    for (const recipe of ["hexer-s", "summoner-s", "chosen-s", "idol-bearer-s"])
      expect(source(recipe), recipe).toBe("initiate-a-indigo-flop");
    expect(source("horror-unbound-a")).toBe("horror-a-gums");
    expect(source("herald-unbound-a")).toBe("herald-e-tall-indigo");
  });

  it("registers every accepted sprite on its record's canvas, and nothing else", async () => {
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets).filter(
      (record) => record.status === "ACCEPTED",
    );
    expect(accepted).toHaveLength(SAMPLE.length + BATCHES.length);
    expect(
      CHIBI_DIRECTION_CULT_ART_ASSETS_V7.map((asset) => asset.id).sort(),
    ).toEqual(accepted.map((record) => record.id).sort());
    for (const asset of CHIBI_DIRECTION_CULT_ART_ASSETS_V7) {
      const record = records.assets[asset.id];
      if (record === undefined) throw new Error(asset.id);
      expect(asset.subject, asset.id).toBe(record.subject);
      expect([asset.width, asset.height], asset.id).toEqual([
        record.master.width,
        record.master.height,
      ]);
      expect(
        asset.url.endsWith(record.master.path.replace(/^public\//, "")),
        asset.id,
      ).toBe(true);
      expect(chibiAnchorV7(asset), asset.id).toEqual(record.anchor);
    }
  });

  it("keeps red for the Unbound looks, and violet and stray green off every piece", async () => {
    const unitsDir = (id: string): Promise<RgbaRaster> =>
      readRaster(
        path.join(
          ROOT,
          "public/assets/chibi",
          id.endsWith("-frog") ? "resources" : "units",
          `${id}.png`,
        ),
      );
    for (const [name] of BATCHES) {
      const id = `chibi-direction-cult-${name}`;
      const pixels = hsvPixels(await unitsDir(id));
      expect(pixels.filter(isViolet).length, id).toBe(0);
      const greens = pixels.filter(isGreen);
      expect(greens.length / pixels.length, id).toBeLessThanOrEqual(0.08);
      for (const green of greens) {
        expect(green.hue, id).toBeGreaterThanOrEqual(144);
        expect(green.hue, id).toBeLessThanOrEqual(152);
      }
      const red = pixels.filter(isRed).length;
      if (name.endsWith("-unbound"))
        // The Unbound cue: the eyes are red (CULT.md, "Red means broken").
        expect(red, id).toBeGreaterThanOrEqual(80);
      else if (name === "thing")
        // Six pixels of the party hat's stripe shadow (#c25e4a, hue 10) sit
        // at the edge of the band; no eye is red.
        expect(red, id).toBeLessThanOrEqual(6);
      else expect(red, id).toBe(0);
    }
    // The frog is teal, never a green frog lost on Grass.
    const frog = hsvPixels(await unitsDir("chibi-direction-cult-frog"));
    expect(
      frog.filter((p) => p.hue > 152 && p.hue <= 205 && p.saturation >= 0.35)
        .length / frog.length,
    ).toBeGreaterThan(0.2);
    // The robed units of the batches wear the lodge's indigo.
    for (const name of ["idol-bearer", "hexer", "summoner", "chosen"]) {
      const id = `chibi-direction-cult-${name}`;
      const cloth = hsvPixels(await unitsDir(id)).filter(
        (p) =>
          p.hue >= 212 &&
          p.hue <= 266 &&
          p.saturation >= 0.45 &&
          p.value >= 0.14,
      );
      expect(cloth.length, id).toBeGreaterThan(400);
      for (const p of cloth) {
        expect(p.hue, id).toBeGreaterThanOrEqual(236);
        expect(p.hue, id).toBeLessThanOrEqual(250);
      }
    }
  });

  it("makes the four ships as edits of the shared fleet in batch naval-cult", async () => {
    const batch = "naval-cult";
    const manifest = await loadBatchManifest(ROOT, batch);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, batch)).toEqual([]);
    expect(manifest.faction).toBe("CULT");
    expect(manifest.fixedFactionColours).toBe(true);
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    // The ships; the three ship portraits the batch also holds since bead
    // pulp_wars-mch9.23 are checked in chibi-cult-interface-assets.test.ts.
    const ships = manifest.assets.filter(
      (asset) => asset.assetClass !== "PORTRAIT",
    );
    expect(
      ships.map((asset) => [
        asset.id,
        asset.subject,
        asset.assetClass,
        asset.canvas.width,
        asset.canvas.height,
      ]),
    ).toEqual(
      SHIPS.map(([name, ...rest]) => [`chibi-naval-cult-${name}`, ...rest]),
    );
    const registered = [
      ...CHIBI_DIRECTION_CULT_NAVAL_ART_ASSETS_V7,
      ...CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7.filter(
        (entry) => entry.faction === "CULT",
      ),
    ]
      .filter((entry) => entry.kind === "UNIT")
      .map((entry) => entry.asset);
    expect(registered.map((asset) => asset.id)).toEqual(
      SHIPS.map(([name]) => `chibi-naval-cult-${name}`),
    );
    for (const asset of ships) {
      expect(asset.recipeClass, asset.id).toBe("ship");
      expect(asset.ownerColour, asset.id).toBe(false);
      expect(asset.accent, asset.id).toBe("cult-lodge");
      const record = records.assets[asset.id];
      expect(record?.status, asset.id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(record.mask, asset.id).toBeUndefined();
      expect(await verifyAssetRecord(ROOT, manifest, record), asset.id).toEqual(
        [],
      );
      const entry = registered.find((candidate) => candidate.id === asset.id);
      if (entry === undefined) throw new Error(asset.id);
      expect(chibiAnchorV7(entry), asset.id).toEqual(record.anchor);
      const pixels = hsvPixels(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      expect(pixels.filter(isRed).length, asset.id).toBe(0);
      expect(pixels.filter(isViolet).length, asset.id).toBe(0);
    }
    // The Submarine is a sibling of the accepted gondola, seated and
    // anchored like every other Submarine; the hulls are visibly blue.
    const submarine = manifest.assets.find(
      (asset) => asset.id === "chibi-naval-cult-submarine",
    );
    expect(submarine?.anchor).toEqual(SUBMARINE_ANCHOR_V7);
    expect(submarine?.bottomMargin).toBe(8);
    expect(
      manifest.recipes.find((recipe) => recipe.id === "cult-submarine-a")
        ?.source,
    ).toEqual({ recipe: "cult-patrol-boat-a", candidate: 0, sibling: true });
    for (const name of ["patrol-boat", "battleship", "transport"]) {
      const pixels = hsvPixels(await master(`chibi-naval-cult-${name}`));
      const indigo = pixels.filter(
        (p) => p.hue >= 236 && p.hue <= 250 && p.saturation >= 0.45,
      );
      expect(indigo.length / pixels.length, name).toBeGreaterThan(0.2);
    }
    for (const recipe of manifest.recipes)
      expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
        /^(ACCEPTED|REJECTED)$/,
      );
  });
});
