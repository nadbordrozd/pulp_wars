import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import { rgbToHsv } from "../../scripts/art/chibi/owner-mask";
import {
  listBatches,
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import {
  REMAP_PRESETS,
  remapRaster,
  type RemapRules,
} from "../../scripts/art/chibi/remap";
import {
  CAMPAIGN_REMAP_RULES,
  CULT_REMAP_ASSETS,
  CULT_REMAP_PRESET,
} from "../../scripts/art/cult-palette-mch959/assets";
import { CULT_PALETTE_V7 } from "../../src/render/canvas/cult-channel-canvas-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";

/**
 * The Cult's palette 1 in production (bead pulp_wars-mch9.59): the user
 * chose the royal purple + aquamarine samples of bead pulp_wars-mch9.58,
 * applied in place by the pipeline's `remap` step (scripts/art/chibi/
 * remap.ts) and re-derived by `art:validate`.
 */
const ROOT = process.cwd();
const PALETTE = REMAP_PRESETS["cult-royal-aqua"];

type Rgb = readonly [number, number, number];

function strip(pixels: readonly Rgb[]) {
  const data = new Uint8Array(pixels.length * 4);
  pixels.forEach(([r, g, b], index) => data.set([r, g, b, 255], index * 4));
  return { width: pixels.length, height: 1, data };
}

function remapped(pixels: readonly Rgb[], rules: RemapRules): Rgb[] {
  const out = remapRaster(strip(pixels), PALETTE, rules).raster;
  return pixels.map((_, index) => [
    out.data[index * 4] ?? 0,
    out.data[index * 4 + 1] ?? 0,
    out.data[index * 4 + 2] ?? 0,
  ]);
}

const hue = (rgb: Rgb): number => rgbToHsv(rgb[0], rgb[1], rgb[2]).hue;

describe("the Cult's palette 1 remap (pulp_wars-mch9.59)", () => {
  it("turns robe crimson purple, gold embroidery and green flames aquamarine, and keeps blood, skin, steel and the summons' teal", () => {
    const source: Rgb[] = [
      [0x92, 0x1d, 0x18], // robe crimson
      [0xed, 0x9f, 0x29], // gold embroidery
      [0x3c, 0xd2, 0x77], // green flame
      [0xff, 0x00, 0x00], // fresh blood (saturation 1)
      [0xe1, 0x91, 0x76], // skin
      [0x9a, 0x9a, 0xa4], // steel
      [0x2c, 0x7e, 0x7d], // the summons' teal
    ];
    const out = remapped(source, { kind: "robed" });
    expect(hue(out[0] as Rgb)).toBeGreaterThanOrEqual(262);
    expect(hue(out[0] as Rgb)).toBeLessThanOrEqual(290);
    for (const index of [1, 2]) {
      expect(hue(out[index] as Rgb)).toBeGreaterThanOrEqual(155);
      expect(hue(out[index] as Rgb)).toBeLessThanOrEqual(178);
    }
    for (const index of [3, 4, 5, 6])
      expect(out[index], String(index)).toEqual(source[index]);
  });

  it("turns lodge indigo purple and its lights aquamarine, keeps the green where a rule says so and never touches a protected box", () => {
    const source: Rgb[] = [
      [0x4a, 0x43, 0xb5], // indigo, lit
      [0x23, 0x1d, 0x5e], // indigo, deepest fold
      [0x00, 0xff, 0x78], // a green window
      [0x4a, 0x43, 0xb5], // indigo in a protected box
    ];
    const lodge = remapped(source, {
      kind: "lodge",
      protect: [{ x0: 3, y0: 0, x1: 3, y1: 0 }],
    });
    expect(hue(lodge[0] as Rgb)).toBeGreaterThanOrEqual(262);
    expect(hue(lodge[1] as Rgb)).toBeGreaterThanOrEqual(262);
    // The source's lightness order is kept.
    expect(rgbToHsv(...(lodge[0] as Rgb)).value).toBeGreaterThan(
      rgbToHsv(...(lodge[1] as Rgb)).value,
    );
    expect(hue(lodge[2] as Rgb)).toBeGreaterThanOrEqual(155);
    expect(hue(lodge[2] as Rgb)).toBeLessThanOrEqual(178);
    expect(lodge[3]).toEqual(source[3]);
    const icon = remapped(source, { kind: "lodge", noGlow: true });
    expect(icon[2]).toEqual(source[2]);
  });

  it("never lands near a player colour of owner recolouring", () => {
    const players = Object.values(RULESET7_PLAYER_COLORS);
    expect([...PALETTE.avoid].sort()).toEqual([...players].sort());
    // Every lightness of every ramp, through crimson, gold and green.
    const source: Rgb[] = [];
    for (let v = 0.2; v <= 1.0001; v += 0.01) {
      const c = Math.round(255 * v);
      source.push([c, Math.round(c * 0.15), Math.round(c * 0.12)]);
      source.push([c, Math.round(c * 0.65), Math.round(c * 0.18)]);
      source.push([Math.round(c * 0.2), c, Math.round(c * 0.45)]);
    }
    for (const rgb of remapped(source, { kind: "robed" }))
      for (const hex of players) {
        const p = [1, 3, 5].map((at) =>
          Number.parseInt(hex.slice(at, at + 2), 16),
        );
        expect(
          Math.hypot(
            rgb[0] - (p[0] ?? 0),
            rgb[1] - (p[1] ?? 0),
            rgb[2] - (p[2] ?? 0),
          ),
          `${rgb.join(",")} near ${hex}`,
        ).toBeGreaterThanOrEqual(PALETTE.avoidDistance);
      }
  });

  it("records the remap on every asset of the production pass, which art:validate re-derives", async () => {
    const wanted = new Map(CULT_REMAP_ASSETS.map((asset) => [asset.id, asset]));
    const fragments = await loadFragments(ROOT);
    const seen = new Set<string>();
    for (const batch of await listBatches(ROOT)) {
      const manifest = await loadBatchManifest(ROOT, batch);
      const remapping = manifest.assets.filter(
        (asset) => asset.remap !== undefined,
      );
      if (remapping.length === 0) continue;
      expect(batchManifestProblems(manifest, fragments, batch)).toEqual([]);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      for (const asset of remapping) {
        const entry = wanted.get(asset.id);
        expect(entry, asset.id).toBeDefined();
        expect(asset.remap).toEqual({
          preset: CULT_REMAP_PRESET,
          rules: entry?.rules,
        });
        const record = records.assets[asset.id];
        if (record === undefined) throw new Error(asset.id);
        expect(record.derivation.remap?.palette, asset.id).toEqual(PALETTE);
        expect(
          await verifyAssetRecord(ROOT, manifest, record),
          asset.id,
        ).toEqual([]);
        seen.add(asset.id);
      }
    }
    expect([...seen].sort()).toEqual([...wanted.keys()].sort());
  });

  it("rejects an unknown remap preset in a manifest", async () => {
    const fragments = await loadFragments(ROOT);
    const manifest = await loadBatchManifest(ROOT, "cities-cult");
    const broken = {
      ...manifest,
      assets: manifest.assets.map((asset) => ({
        ...asset,
        remap: { preset: "no-such-preset", rules: { kind: "lodge" as const } },
      })),
    };
    expect(
      batchManifestProblems(broken, fragments, "cities-cult").some((problem) =>
        problem.includes("unknown remap preset no-such-preset"),
      ),
    ).toBe(true);
  });

  it("remaps the Cult campaign picture in its bake, and the code's lodge colour is the palette's purple", async () => {
    const record = JSON.parse(
      await readFile(
        path.join(ROOT, "src/assets/campaign-pictures.json"),
        "utf8",
      ),
    ) as { pictures: { campaign: string; remap?: unknown }[] };
    for (const picture of record.pictures)
      expect(picture.remap, picture.campaign).toEqual(
        picture.campaign === "CULT"
          ? { preset: CULT_REMAP_PRESET, rules: CAMPAIGN_REMAP_RULES }
          : undefined,
      );
    expect(CULT_PALETTE_V7.purple).toBe("#4b226a");
    expect(hue([0x4b, 0x22, 0x6a])).toBeGreaterThanOrEqual(262);
    // The territory border stays the eldritch green.
    expect(CULT_PALETTE_V7.flame).toBe("#00ff78");
  });
});
