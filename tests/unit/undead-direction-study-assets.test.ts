import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { CHIBI_DIRECTION_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-art-manifest";
import { rgbToHsv } from "../../scripts/art/chibi/owner-mask";
import { readRaster } from "../../scripts/art/chibi/pipeline";
import { candidateCell, cropRaster } from "../../scripts/art/chibi/raster";
import {
  ACCENT_REMAPS,
  ACCENT_SOURCE_BAND,
  isAccentPixel,
  remapAccent,
  remapAccentColour,
  type UndeadAccentV7,
} from "../../scripts/art/undead-direction/accent";

const ROOT = process.cwd();
const RUN = "art/explorations/undead-direction-2026-10";
const ACCENTS: readonly UndeadAccentV7[] = ["violet", "cyan", "green"];
const UNITS = ["skeleton", "zombie", "necromancer"] as const;

interface Sample {
  readonly id: string;
  readonly subject: string;
  readonly width: number;
  readonly height: number;
  readonly url: string;
  readonly fixedColours: boolean;
  readonly role: "chosen" | "alternative";
  readonly unit?: string;
  readonly accent?: UndeadAccentV7;
  readonly recipe: string;
  readonly candidate: number;
  readonly derivation: {
    readonly kind: string;
    readonly accentPixels?: number;
    readonly remap?: unknown;
    readonly sourceBand?: unknown;
  };
}

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(ROOT, file), "utf8")) as T;
}

describe("Undead direction study (exploration, bead pulp_wars-3tq.11)", () => {
  it("remaps accent colours to the option's hue and leaves the rest", () => {
    const lit = [0xd5, 0x21, 0xee] as const;
    expect(isAccentPixel(...lit)).toBe(true);
    // Bone, pallid flesh, dark cloth, iron and the zombie's navy hair.
    for (const rgb of [
      [0xe6, 0xe0, 0xc8],
      [0x94, 0x88, 0x84],
      [0x31, 0x31, 0x35],
      [0x64, 0x71, 0x7e],
      [0x19, 0x1f, 0x35],
    ] as const)
      expect(isAccentPixel(rgb[0], rgb[1], rgb[2])).toBe(false);
    for (const accent of ACCENTS) {
      const out = remapAccentColour(lit, ACCENT_REMAPS[accent]);
      const before = rgbToHsv(...lit);
      const after = rgbToHsv(out[0], out[1], out[2]);
      expect(Math.abs(after.hue - ACCENT_REMAPS[accent].hue)).toBeLessThan(8);
      expect(after.saturation).toBeCloseTo(before.saturation, 1);
      expect(after.value).toBeCloseTo(before.value, 1);
    }
  });

  it("lists nine chosen sprites: three units in three accents", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    const chosen = assets.filter((asset) => asset.role === "chosen");
    expect(chosen.map((asset) => asset.id).sort()).toEqual(
      UNITS.flatMap((unit) =>
        ACCENTS.map((accent) => `chibi-study-${unit}-${accent}`),
      ).sort(),
    );
    for (const asset of chosen) {
      expect(asset.fixedColours).toBe(true);
      expect(asset.derivation.kind).toBe("accent-hue-remap");
      expect(asset.derivation.remap).toEqual(
        ACCENT_REMAPS[asset.accent as UndeadAccentV7],
      );
      expect(asset.derivation.sourceBand).toEqual(ACCENT_SOURCE_BAND);
      // Small, but present on every unit.
      expect(asset.derivation.accentPixels).toBeGreaterThan(40);
    }
  });

  it("derives every option from its recorded candidate, changing only accent pixels", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    const records = await json<{
      recipes: Record<string, { candidateCount?: number; rawSheet?: string }>;
    }>(`${RUN}/records.json`);
    for (const asset of assets.filter((entry) => entry.role === "chosen")) {
      const record = records.recipes[asset.recipe];
      expect(record?.rawSheet, asset.recipe).toBeDefined();
      const size = { width: asset.width, height: asset.height };
      const base = cropRaster(
        await readRaster(path.join(ROOT, record?.rawSheet ?? "")),
        {
          ...candidateCell(asset.candidate, record?.candidateCount ?? 1, size),
          ...size,
        },
      );
      const master = await readRaster(path.join(ROOT, asset.url.slice(1)));
      const expected = remapAccent(
        base,
        ACCENT_REMAPS[asset.accent as UndeadAccentV7],
      );
      expect(expected.accentPixels).toBe(asset.derivation.accentPixels);
      expect(
        Buffer.from(master.data).equals(Buffer.from(expected.raster.data)),
      ).toBe(true);
      let changedOutsideAccent = 0;
      for (let index = 0; index < base.width * base.height; index += 1) {
        const o = index * 4;
        const same =
          base.data[o] === master.data[o] &&
          base.data[o + 1] === master.data[o + 1] &&
          base.data[o + 2] === master.data[o + 2] &&
          base.data[o + 3] === master.data[o + 3];
        if (
          !same &&
          !isAccentPixel(
            base.data[o] ?? 0,
            base.data[o + 1] ?? 0,
            base.data[o + 2] ?? 0,
          )
        )
          changedOutsideAccent += 1;
      }
      expect(changedOutsideAccent, asset.id).toBe(0);
    }
  });

  it("registers nothing as production art", async () => {
    const { assets } = await json<{ assets: Sample[] }>(`${RUN}/samples.json`);
    const live = new Set(
      [...CHIBI_ART_ASSETS_V7, ...CHIBI_DIRECTION_ART_ASSETS_V7].map(
        (asset) => asset.id,
      ),
    );
    for (const asset of assets) {
      expect(live.has(asset.id), asset.id).toBe(false);
      expect(asset.url.startsWith(`/${RUN}/assets/`)).toBe(true);
    }
  });
});
