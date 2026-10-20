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
  labOf,
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
 * remap.ts) and re-derived by `art:validate`. Bead pulp_wars-mch9.60
 * tweaked it (preset `cult-royal-teal`): the accent is the summons' teal,
 * the Familiar's body the summoned teal, the ships' hulls wood.
 */
const ROOT = process.cwd();
const PALETTE = REMAP_PRESETS[CULT_REMAP_PRESET];

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

const lab = (rgb: Rgb) => labOf(rgb);
/** CIE hue angle in degrees. */
const labHue = (rgb: Rgb): number => {
  const [, a, b] = lab(rgb);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};

describe("the Cult's palette 1 remap (pulp_wars-mch9.59, tweaked by pulp_wars-mch9.60)", () => {
  it("turns robe crimson purple, gold embroidery and green flames the summons' teal, and keeps blood, skin, steel and the summons' teal", () => {
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
      expect(hue(out[index] as Rgb)).toBeGreaterThanOrEqual(166);
      expect(hue(out[index] as Rgb)).toBeLessThanOrEqual(192);
    }
    for (const index of [3, 4, 5, 6])
      expect(out[index], String(index)).toEqual(source[index]);
  });

  it("turns lodge indigo purple and its lights teal, keeps the green where a rule says so and never touches a protected box", () => {
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
    expect(hue(lodge[2] as Rgb)).toBeGreaterThanOrEqual(166);
    expect(hue(lodge[2] as Rgb)).toBeLessThanOrEqual(192);
    expect(lodge[3]).toEqual(source[3]);
    const icon = remapped(source, { kind: "lodge", noGlow: true });
    expect(icon[2]).toEqual(source[2]);
  });

  it("puts the accent in the summons' hue: within 15 CIE hue degrees of the summoned teal at its lightness, and a lit line still lighter than the purple", () => {
    // The summons' body (#2c7e7d, L* 48, CIE hue 195) and lit side
    // (#59c8be, L* 74, hue 188), measured on the Imp, the Horror, the
    // Gibbering Mass, the Tentacle and the Thing.
    const summons: Rgb[] = [
      [0x2c, 0x7e, 0x7d],
      [0x31, 0x95, 0x98],
      [0x59, 0xc8, 0xbe],
    ];
    const summonHues = summons.map(labHue);
    for (const ramp of [PALETTE.trim, PALETTE.glow])
      for (const [at, hex] of ramp) {
        const rgb = [1, 3, 5].map((k) =>
          Number.parseInt(hex.slice(k, k + 2), 16),
        ) as unknown as Rgb;
        if (lab(rgb)[0] < 40 || lab(rgb)[0] > 85) continue;
        const nearest = Math.min(
          ...summonHues.map((h) => Math.abs(h - labHue(rgb))),
        );
        expect(nearest, `${at} ${hex}`).toBeLessThanOrEqual(15);
      }
    // The old mint (#4fe3c1, CIE hue 174) is not the summons' hue.
    expect(
      Math.min(
        ...summonHues.map((h) => Math.abs(h - labHue([0x4f, 0xe3, 0xc1]))),
      ),
    ).toBeGreaterThan(12);
    // Lit trim (from a gold of L* 60) is far lighter than the purple cloth
    // it sits on (the purple of the same source is under L* 50).
    const [trim, cloth] = remapped(
      [
        [0xed, 0x9f, 0x29],
        [0x92, 0x1d, 0x18],
      ],
      { kind: "robed" },
    );
    expect(lab(trim as Rgb)[0] - lab(cloth as Rgb)[0]).toBeGreaterThan(30);
  });

  it("gives the Familiar the summoned teal and the hulls wood, with no blue glint or green rim left", () => {
    const familiarBlue: Rgb[] = [
      [0x4b, 0x4a, 0xb6], // the Familiar's body (L* 37)
      [0x52, 0x5d, 0xcc], // its lit body (L* 44)
      [0x5b, 0xa9, 0xda], // its pale blue highlight (hue 203)
    ];
    const familiar = remapped(familiarBlue, {
      kind: "lodge",
      lodgeHue: [190, 268],
      body: "summon",
    });
    for (const rgb of familiar) {
      expect(hue(rgb)).toBeGreaterThanOrEqual(172);
      expect(hue(rgb)).toBeLessThanOrEqual(195);
    }
    // The body matches the Imp's (#2f9194 lit, #245e66 shade) within a
    // few L*: the same family, not a lookalike of the accent.
    expect(Math.abs(lab(familiar[1] as Rgb)[0] - 56)).toBeLessThan(5);
    // A hull: inside a wood box the indigo and its pale blue lights go to
    // wood (hue 12 to 32), outside it the sail's indigo goes purple, and a
    // steel grey is kept.
    const hull = remapped(
      [
        [0x4a, 0x43, 0xb5], // hull indigo
        [0x9e, 0xaa, 0xd2], // a pale blue light on the rail (saturation 0.25)
        [0x6e, 0x70, 0x78], // steel (saturation 0.08)
        [0x4a, 0x43, 0xb5], // sail indigo, outside the box
        [0x04, 0x59, 0x13], // a lantern's dark green rim (value 0.35)
      ],
      { kind: "lodge", wood: [{ x0: 0, y0: 0, x1: 2, y1: 0 }] },
    );
    for (const index of [0, 1]) {
      expect(hue(hull[index] as Rgb), String(index)).toBeGreaterThanOrEqual(12);
      expect(hue(hull[index] as Rgb), String(index)).toBeLessThanOrEqual(32);
    }
    expect(hull[2]).toEqual([0x6e, 0x70, 0x78]);
    expect(hue(hull[3] as Rgb)).toBeGreaterThanOrEqual(262);
    expect(hue(hull[4] as Rgb)).toBeGreaterThanOrEqual(166);
    expect(hue(hull[4] as Rgb)).toBeLessThanOrEqual(192);
  });

  it("never lands near a player colour of owner recolouring", () => {
    const players = Object.values(RULESET7_PLAYER_COLORS);
    expect([...PALETTE.avoid].sort()).toEqual([...players].sort());
    // Every lightness of every ramp, through crimson, gold and green.
    const source: Rgb[] = [];
    const indigo: Rgb[] = [];
    for (let v = 0.2; v <= 1.0001; v += 0.01) {
      const c = Math.round(255 * v);
      source.push([c, Math.round(c * 0.15), Math.round(c * 0.12)]);
      source.push([c, Math.round(c * 0.65), Math.round(c * 0.18)]);
      source.push([Math.round(c * 0.2), c, Math.round(c * 0.45)]);
      indigo.push([Math.round(c * 0.4), Math.round(c * 0.38), c]);
    }
    // And the lodge's indigo through the purple, the summoned teal (the
    // Familiar) and the wood (the hulls).
    const wood = { x0: 0, y0: 0, x1: indigo.length, y1: 0 };
    for (const rgb of [
      ...remapped(source, { kind: "robed" }),
      ...remapped(indigo, { kind: "lodge" }),
      ...remapped(indigo, { kind: "lodge", body: "summon" }),
      ...remapped(indigo, { kind: "lodge", wood: [wood] }),
    ])
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
