import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  accentRaster,
  isAccentColour,
  type AccentSpec,
} from "../../scripts/art/chibi/accent";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
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
  it("is a valid fixed-colour batch of the Initiate, the Horror and the Herald", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    expect(manifest.faction).toBe("CULT");
    expect(manifest.fixedFactionColours).toBe(true);
    expect(
      manifest.assets.map((asset) => [
        asset.id,
        asset.subject,
        asset.assetClass,
        asset.canvas.width,
        asset.canvas.height,
        asset.accent,
      ]),
    ).toEqual(SAMPLE.map((row) => [...row]));
    for (const asset of manifest.assets) expect(asset.ownerColour).toBe(false);
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
