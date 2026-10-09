import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiOverflowV7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
  ICE_FOLK_FLAG_ANCHORS_V7,
} from "../../src/assets/chibi-direction-ice-folk-art-manifest";
import {
  ICE_FOLK_BLIZZARD_V7,
  ICE_FOLK_FROZEN_MARKER_V7,
  ICE_FOLK_PALETTE_V7,
  ICE_FOLK_SHATTER_TIMELINE_V7,
  ICE_FOLK_SNOW_OVERLAY_V7,
  iceFolkBlizzardFlakesV7,
  iceFolkFrozenCasingV7,
  iceFolkSnowCapsV7,
  iceFolkSnowTileV7,
  iceFolkSnowVariantV7,
} from "../../src/assets/chibi-direction-ice-folk-presentation";
import {
  ACCENT_PRESETS,
  accentRaster,
  isAccentColour,
} from "../../scripts/art/chibi/accent";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import {
  extractOwnerMask,
  rgbToHsv,
  type RgbaRaster,
} from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
  verifyAssetRecord,
  type AssetRecord,
  type BatchRecords,
} from "../../scripts/art/chibi/pipeline";
import {
  candidateCell,
  cropRaster,
  paletteColours,
  paletteMapRaster,
  seatedRaster,
} from "../../scripts/art/chibi/raster";
import {
  ICE_FOLK_FROST_PALETTE,
  ICE_FOLK_FROST_PALETTE_PATH,
  iceFolkFrostPalettePng,
} from "../../scripts/art/ice-folk-direction/frost-palette";

const ROOT = process.cwd();
const BATCH = "direction-ice-folk";

/** Role, unit name, and the Human role whose canvas it takes. */
const UNITS = [
  ["FIGHTER", "yeti"],
  ["RAIDER", "sled"],
  ["MARKSMAN", "snow-hunter"],
  ["GUARD", "mammoth"],
  ["CAPTAIN", "ice-witch"],
  ["CATAPULT", "boulder-yeti"],
  ["KNIGHT", "sabretooth"],
  ["JUGGERNAUT", "frost-giant"],
  // The ninth art slot (ruleset 7r55, bead pulp_wars-2yc.34): the Musk Ox,
  // a STANDARD_UNIT like the Human unit of the slot. The Mammoth keeps the
  // slot GUARD.
  ["SWORDSMAN", "musk-ox"],
] as const;
const ICONS = [
  ["ICON:ACTION:THROW_BOLAS", "action-throw-bolas"],
  ["ICON:ACTION:COLD_SNAP", "action-cold-snap"],
  ["ICON:ACTION:SHATTER", "action-shatter"],
  ["ICON:ACTION:SWEEP", "action-sweep"],
  ["ICON:ACTION:ROCKFALL", "action-rockfall"],
  ["ICON:ACTION:PROWL", "action-prowl"],
  ["ICON:TECH:ICE_FOLK:FORTIFICATION", "tech-deep-winter"],
  ["ICON:TECH:ICE_FOLK:EXPLOSIVES", "tech-brittle"],
  ["ICON:STATUS:CHILLED", "status-chilled"],
  ["ICON:STATUS:FROZEN", "status-frozen"],
] as const;
const EFFECTS = [
  ["EFFECT:SHATTER", "shatter"],
  ["EFFECT:SHATTER_SHARDS", "shatter-shards"],
  ["EFFECT:COLD_SNAP", "cold-snap"],
  ["EFFECT:BOLAS", "bolas"],
  ["EFFECT:FROST_HIT", "frost-hit"],
] as const;
const SPEC = ACCENT_PRESETS["ice-folk-blue"];

async function candidateOf(
  records: BatchRecords,
  record: AssetRecord,
): Promise<RgbaRaster> {
  const recipe = records.recipes[record.recipe];
  if (recipe?.rawSheet === undefined || recipe.candidateSize === undefined)
    throw new Error(`${record.id}: no raw sheet`);
  return cropRaster(await readRaster(path.join(ROOT, recipe.rawSheet)), {
    ...candidateCell(
      record.candidate,
      recipe.candidateCount ?? 1,
      recipe.candidateSize,
    ),
    ...recipe.candidateSize,
  });
}

function sameBytes(
  left: { width: number; height: number; data: ArrayLike<number> },
  right: { width: number; height: number; data: ArrayLike<number> },
): boolean {
  return (
    left.width === right.width &&
    left.height === right.height &&
    Buffer.from(Uint8Array.from(left.data)).equals(
      Buffer.from(Uint8Array.from(right.data)),
    )
  );
}

describe("Ice Folk production art (pulp_wars-7g3.5)", () => {
  const byId = new Map(
    CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("lists the nine units and portraits, ten icons, five effects and City 1-3", () => {
    const expected: [string, string][] = [
      ...UNITS.map(
        ([role, name]) =>
          [`UNIT:ICE_FOLK:${role}`, `chibi-direction-ice-folk-${name}`] as [
            string,
            string,
          ],
      ),
      ...UNITS.map(
        ([role, name]) =>
          [
            `PORTRAIT:ICE_FOLK:${role}`,
            `chibi-direction-portrait-ice-folk-${name}`,
          ] as [string, string],
      ),
      ...[1, 2, 3].map(
        (level) =>
          [
            `CITY:ICE_FOLK:${level}`,
            `chibi-direction-ice-folk-city-${level}`,
          ] as [string, string],
      ),
      ...ICONS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-icon-${name}`] as [string, string],
      ),
      ...EFFECTS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-effect-ice-folk-${name}`] as [
            string,
            string,
          ],
      ),
    ];
    const pairs = (list: readonly (readonly [string, string])[]): string[] =>
      list.map(([subject, id]) => `${subject} ${id}`).sort();
    expect(
      pairs(
        CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7.map(
          (asset) => [asset.subject, asset.id] as const,
        ),
      ),
    ).toEqual(pairs(expected));
    const built = buildChibiArtRegistryV7(
      CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
    );
    expect(built.problems).toEqual([]);
    for (const [subject, id] of expected)
      expect(
        built.registry
          .variants(subject as ArtSubjectV7)
          .map((asset) => asset.id),
        subject,
      ).toEqual([id]);
  });

  // Turned round by the UI bead (pulp_wars-7g3.6, ICE_FOLK.md wiring step
  // 5): the art is live in the direction registry, and only there. The
  // default (classic) registry holds no Ice Folk asset, so the classic look
  // and LEGACY draw the Human stand-in with the snow-capped peak badge.
  it("is wired into the live direction registry, and only there", () => {
    const live = chibiDirectionArtRegistryV7();
    for (const asset of CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7)
      expect(
        live.variants(asset.subject).map((entry) => entry.id),
        asset.subject,
      ).toEqual([asset.id]);
    const ids = new Set(
      [...CHIBI_ART_ASSETS_V7, ...CHIBI_DIRECTION_ART_ASSETS_V7].map(
        (asset) => asset.id,
      ),
    );
    for (const asset of CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7)
      expect(ids.has(asset.id), asset.id).toBe(false);
    for (const asset of [
      ...CHIBI_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ])
      expect(asset.subject.includes("ICE_FOLK"), asset.id).toBe(false);
  });

  it("matches the accepted records, with no owner mask and no key-colour pixel", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets);
    expect(accepted.every((record) => record.status === "ACCEPTED")).toBe(true);
    expect(accepted.map((record) => record.id).sort()).toEqual(
      CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7.map((asset) => asset.id).sort(),
    );
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual(
      accepted.map((record) => record.id).sort(),
    );
    expect(manifest.fixedFactionColours).toBe(true);
    expect(manifest.faction).toBe("ICE_FOLK");
    for (const entry of CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7) {
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
      expect([entry.width, entry.height], entry.id).toEqual([
        asset.canvas.width,
        asset.canvas.height,
      ]);
      expect(chibiAnchorV7(entry), entry.id).toEqual(record.anchor);
      const owned = /^(UNIT|CITY|PORTRAIT):/.test(entry.subject);
      expect(entry.fixedColours, entry.id).toBe(owned ? true : undefined);
      if (owned) expect(asset.ownerColour, entry.id).toBe(false);
      const line = registryEntry(asset, record);
      expect(line.includes("fixedColours: true"), entry.id).toBe(owned);
      expect(line).not.toContain("ownerMaskUrl");
      await expect(
        readFile(
          path.join(ROOT, record.master.path.replace(/\.png$/, ".mask.png")),
        ),
      ).rejects.toThrow();
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect([master.width, master.height], entry.id).toEqual([
        entry.width,
        entry.height,
      ]);
      // Nothing the runtime could recolour: no pixel is in the key-colour
      // band an owner mask is cut from.
      const mask = extractOwnerMask(master).mask;
      expect(
        mask.bits.reduce((sum, bit) => sum + bit, 0),
        `${entry.id}: key-colour pixels`,
      ).toBe(0);
      expect(await verifyAssetRecord(ROOT, manifest, record), entry.id).toEqual(
        [],
      );
    }
  });

  it("follows the scale contract of the mechanical roles", () => {
    const human = buildChibiArtRegistryV7(
      CHIBI_DIRECTION_ART_ASSETS_V7,
    ).registry;
    for (const [role, name] of UNITS) {
      const mine = byId.get(`chibi-direction-ice-folk-${name}`);
      const theirs = human.variants(`UNIT:${role}`)[0];
      if (mine === undefined || theirs === undefined)
        throw new Error(`${role}: missing`);
      expect([mine.width, mine.height, mine.assetClass], role).toEqual([
        theirs.width,
        theirs.height,
        theirs.assetClass,
      ]);
      expect(chibiAnchorV7(mine), role).toEqual(chibiAnchorV7(theirs));
      const portrait = byId.get(`chibi-direction-portrait-ice-folk-${name}`);
      expect([portrait?.width, portrait?.height], role).toEqual([48, 48]);
    }
    for (const [, name] of ICONS) {
      const icon = byId.get(`chibi-direction-icon-${name}`);
      expect([icon?.width, icon?.height, icon?.assetClass], name).toEqual([
        48,
        48,
        "ICON",
      ]);
    }
    for (const level of [1, 2, 3]) {
      const mine = byId.get(`chibi-direction-ice-folk-city-${level}`);
      const undead = chibiDirectionArtRegistryV7().variants(
        `CITY:UNDEAD:${level}` as ArtSubjectV7,
      )[0];
      if (mine === undefined || undead === undefined)
        throw new Error(`city ${level}: missing`);
      expect([mine.width, mine.height], `city ${level}`).toEqual([
        undead.width,
        undead.height,
      ]);
      expect(chibiOverflowV7(mine).up, `city ${level}`).toBeLessThanOrEqual(8);
    }
  });

  it("records a pennant anchor on each city's own bone pole", async () => {
    expect(Object.keys(ICE_FOLK_FLAG_ANCHORS_V7)).toHaveLength(3);
    for (const level of [1, 2, 3]) {
      const id = `chibi-direction-ice-folk-city-${level}`;
      const asset = byId.get(id);
      const anchor = ICE_FOLK_FLAG_ANCHORS_V7[id];
      if (asset === undefined || anchor === undefined)
        throw new Error(`${id}: missing`);
      expect(anchor.pole, id).toBe(0);
      const master = await readRaster(
        path.join(ROOT, "public", asset.url.replace(/^.*assets\//, "assets/")),
      );
      const x = Math.floor(anchor.x);
      const alpha = (y: number): number =>
        master.data[(y * master.width + x) * 4 + 3] ?? 0;
      expect(alpha(anchor.y), id).toBeGreaterThanOrEqual(128);
      expect(alpha(anchor.y - 1), id).toBeLessThan(128);
      expect(anchor.x, id).toBeLessThan(asset.width);
      expect(anchor.y, id).toBeGreaterThanOrEqual(9);
    }
  });
});

describe("the Ice Folk accent derivation (pulp_wars-7g3.5)", () => {
  it("re-derives every unit, portrait, icon and city from its recorded candidate, byte for byte", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const record of Object.values(records.assets)) {
      if (record.subject.startsWith("EFFECT:")) continue;
      const asset = manifest.assets.find((spec) => spec.id === record.id);
      if (asset === undefined) throw new Error(`${record.id}: no asset`);
      expect(asset.accent, record.id).toBe("ice-folk-blue");
      expect(record.derivation.accent?.preset, record.id).toBe("ice-folk-blue");
      expect(record.derivation.accent?.spec, record.id).toEqual(SPEC);
      const candidate = await candidateOf(records, record);
      const base =
        record.derivation.kind === "seated"
          ? seatedRaster(
              candidate,
              asset.canvas,
              record.derivation.seat?.bottomMargin ?? 3,
            )
          : candidate;
      const first = accentRaster(base, SPEC);
      const second = accentRaster(base, SPEC);
      expect(sameBytes(first.raster, second.raster), record.id).toBe(true);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(sameBytes(first.raster, master), record.id).toBe(true);
      expect(first.accentPixels, record.id).toBe(
        record.derivation.accent?.accentPixels,
      );
      expect(first.trimPixels, record.id).toBe(0);
      // Every unit carries the ice; no piece is mostly accent except the
      // Frost Giant's ice armour and the all-ice icons.
      if (record.subject.startsWith("UNIT:"))
        expect(first.accentPixels, record.id).toBeGreaterThanOrEqual(15);
      if (/^(UNIT|PORTRAIT):/.test(record.subject))
        expect(first.accentPixels / first.opaquePixels, record.id).toBeLessThan(
          0.3,
        );
      // Only accent pixels change, and each lands on the deep ice blue.
      for (let index = 0; index < base.width * base.height; index += 1) {
        const o = index * 4;
        const before = [base.data[o], base.data[o + 1], base.data[o + 2]].map(
          (value) => value ?? 0,
        ) as [number, number, number];
        const after = [
          master.data[o],
          master.data[o + 1],
          master.data[o + 2],
        ].map((value) => value ?? 0) as [number, number, number];
        expect(master.data[o + 3], record.id).toBe(base.data[o + 3]);
        if ((base.data[o + 3] ?? 0) < 128 || !isAccentColour(SPEC, ...before)) {
          expect(after, record.id).toEqual(before);
          continue;
        }
        const hsv = rgbToHsv(...after);
        expect(hsv.hue, record.id).toBeGreaterThanOrEqual(197);
        expect(hsv.hue, record.id).toBeLessThanOrEqual(213);
        expect(hsv.saturation, record.id).toBeGreaterThanOrEqual(0.5);
      }
    }
  });

  it("deepens PixelLab's pale glacier ice and leaves fur, slate, navy and white alone", () => {
    const pixels = [
      [0xa4, 0xf1, 0xfa], // glacier ice, lit (hue 186)
      [0x8d, 0xc9, 0xe1], // glacier ice, mean (hue 197)
      [0xdd, 0xd9, 0xc1], // fur, lit
      [0x8d, 0x82, 0x73], // fur, taupe shade
      [0x4a, 0x55, 0x68], // slate face
      [0x1c, 0x23, 0x3e], // navy robe
      [0xff, 0xff, 0xff], // white highlight
      [0x9a, 0xa6, 0xbd], // a blue-grey fur shade: low value, below the band
    ];
    const width = pixels.length;
    const data = new Uint8Array(width * 4);
    pixels.forEach((rgb, x) => data.set([...rgb, 255], x * 4));
    const { raster, accentPixels, trimPixels } = accentRaster(
      { width, height: 1, data },
      SPEC,
    );
    expect(accentPixels).toBe(2);
    expect(trimPixels).toBe(0);
    for (const x of [0, 1]) {
      const hsv = rgbToHsv(
        raster.data[x * 4] ?? 0,
        raster.data[x * 4 + 1] ?? 0,
        raster.data[x * 4 + 2] ?? 0,
      );
      expect(hsv.hue).toBeGreaterThanOrEqual(198);
      expect(hsv.hue).toBeLessThanOrEqual(206);
      expect(hsv.saturation).toBeGreaterThanOrEqual(0.7);
    }
    for (let x = 2; x < width; x += 1)
      expect([...raster.data.slice(x * 4, x * 4 + 3)]).toEqual(pixels[x]);
    // Deterministic, and the step's own output is in its band.
    const again = accentRaster({ width, height: 1, data }, SPEC);
    expect(sameBytes(again.raster, raster)).toBe(true);
    expect(isAccentColour(SPEC, 0x37, 0xb1, 0xfa)).toBe(true);
  });

  it("leaves the Undead and Martian presets exactly as they were", () => {
    expect(ACCENT_PRESETS["undead-violet"]).toEqual({
      band: {
        hueFrom: 250,
        hueTo: 320,
        saturationMin: 0.4,
        valueMin: 0.2,
        hueCentre: 285,
      },
      hue: 274,
      hueSpread: 0.5,
      trim: {
        maxAccentNeighbours: 2,
        minDarkNeighbours: 3,
        darkValueMax: 0.3,
        saturationMax: 0.62,
        valueMin: 0.96,
      },
    });
    expect(ACCENT_PRESETS["martian-magenta"]).toEqual({
      band: {
        hueFrom: 285,
        hueTo: 350,
        saturationMin: 0.4,
        valueMin: 0.25,
        hueCentre: 320,
      },
      hue: 322,
      hueSpread: 0.2,
    });
    // The saturation step is the Ice Folk preset's alone.
    expect("saturation" in ACCENT_PRESETS["undead-violet"]).toBe(false);
    expect("saturation" in ACCENT_PRESETS["martian-magenta"]).toBe(false);
  });
});

describe("the Ice Folk effects and pipeline pieces (pulp_wars-7g3.5)", () => {
  it("has a checked-in frost palette, and every effect pixel is one of its colours", async () => {
    const png = await readFile(path.join(ROOT, ICE_FOLK_FROST_PALETTE_PATH));
    expect(png.equals(await iceFolkFrostPalettePng())).toBe(true);
    const palette = paletteColours(await readRaster(png));
    const hex = (rgb: readonly number[]): string =>
      `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    expect(palette.map(hex)).toEqual(
      ICE_FOLK_FROST_PALETTE.map((entry) => entry.to),
    );
    const allowed = new Set(palette.map(hex));
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const [, name] of EFFECTS) {
      const id = `chibi-direction-effect-ice-folk-${name}`;
      const record = records.assets[id];
      const asset = manifest.assets.find((spec) => spec.id === id);
      if (record === undefined || asset === undefined)
        throw new Error(`${id}: missing`);
      expect(asset.palette?.path, id).toBe(ICE_FOLK_FROST_PALETTE_PATH);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(
        sameBytes(
          master,
          paletteMapRaster(await candidateOf(records, record), palette),
        ),
        id,
      ).toBe(true);
      let ice = 0;
      for (let index = 0; index < master.width * master.height; index += 1) {
        const o = index * 4;
        if ((master.data[o + 3] ?? 0) === 0) continue;
        expect(master.data[o + 3], id).toBe(255);
        const colour = hex([...master.data.slice(o, o + 3)]);
        expect(allowed.has(colour), `${id}: ${colour}`).toBe(true);
        if (colour === "#2f9be8" || colour === "#7fcbff") ice += 1;
      }
      expect(ice, id).toBeGreaterThan(30);
    }
  });

  it("keeps the manifest valid, with the faction's fragment and subjects", async () => {
    const fragments = await loadFragments(ROOT);
    const manifest = await loadBatchManifest(ROOT, BATCH);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    expect(fragments.factions.ICE_FOLK?.text).toContain("ice blue");
    expect(fragments.factions.ICE_FOLK?.text).toContain("never blue-grey");
    for (const asset of manifest.assets)
      if (/^(UNIT|CITY|PORTRAIT):/.test(asset.subject))
        expect(asset.ownerColour, asset.id).toBe(false);
  });
});

describe("the Ice Folk code-drawn pieces (pulp_wars-7g3.5)", () => {
  const NONE = { north: false, east: false, south: false, west: false };
  const alphaAt = (
    tile: { width: number; data: ArrayLike<number> },
    x: number,
    y: number,
  ): number => tile.data[(y * tile.width + x) * 4 + 3] ?? 0;

  it("draws the Snow overlay deterministically, seamless inside a field and cut at its edge", () => {
    const size = ICE_FOLK_SNOW_OVERLAY_V7.tile;
    for (
      let variant = 0;
      variant < ICE_FOLK_SNOW_OVERLAY_V7.variants;
      variant += 1
    ) {
      const tile = iceFolkSnowTileV7(NONE, variant);
      expect(sameBytes(tile, iceFolkSnowTileV7(NONE, variant))).toBe(true);
      expect([tile.width, tile.height]).toEqual([size, size]);
      // Every border pixel is the plain wash, so neighbours join with no seam.
      const wash = [...tile.data.slice(0, 4)];
      expect(wash[3]).toBe(
        Math.round(ICE_FOLK_SNOW_OVERLAY_V7.washAlpha * 255),
      );
      for (let k = 0; k < size; k += 1)
        for (const [x, y] of [
          [k, 0],
          [k, size - 1],
          [0, k],
          [size - 1, k],
        ] as const)
          expect([
            ...tile.data.slice((y * size + x) * 4, (y * size + x) * 4 + 4),
          ]).toEqual(wash);
    }
    // An exposed edge is cut: its outer rows are empty, the middle is not.
    const cut = iceFolkSnowTileV7({ ...NONE, north: true, west: true }, 1);
    for (let k = 0; k < size; k += 1) {
      expect(alphaAt(cut, k, 0)).toBe(0);
      expect(alphaAt(cut, 0, k)).toBe(0);
    }
    expect(alphaAt(cut, 40, 40)).toBeGreaterThan(0);
    expect(alphaAt(cut, size - 1, size - 1)).toBeGreaterThan(0);
    const variants = new Set(
      [...Array(64).keys()].map((n) =>
        iceFolkSnowVariantV7({ x: n % 8, y: Math.floor(n / 8) }),
      ),
    );
    expect(variants.size).toBe(ICE_FOLK_SNOW_OVERLAY_V7.variants);
  });

  it("caps tall bodies with snow on their top edge only", () => {
    // A 3 x 4 opaque block: the cap is its top `depth` rows.
    const width = 3;
    const height = 6;
    const data = new Uint8Array(width * height * 4);
    for (let y = 2; y < height; y += 1)
      for (let x = 0; x < width; x += 1)
        data.set([90, 140, 80, 255], (y * width + x) * 4);
    const caps = iceFolkSnowCapsV7({ width, height, data }, { depth: 1 });
    for (let x = 0; x < width; x += 1) {
      expect(alphaAt(caps, x, 1)).toBe(0);
      expect(alphaAt(caps, x, 2)).toBeGreaterThan(0);
      expect(alphaAt(caps, x, 3)).toBeGreaterThan(0);
      expect(alphaAt(caps, x, 4)).toBe(0);
    }
  });

  it("drops calm, deterministic Blizzard flakes inside each cell", () => {
    for (const time of [0, 1234, 98_765]) {
      const flakes = iceFolkBlizzardFlakesV7({ x: 3, y: 5 }, time);
      expect(flakes).toEqual(iceFolkBlizzardFlakesV7({ x: 3, y: 5 }, time));
      expect(flakes).toHaveLength(ICE_FOLK_BLIZZARD_V7.flakesPerTile);
      for (const flake of flakes) {
        expect(flake.x).toBeGreaterThanOrEqual(0);
        expect(flake.x).toBeLessThanOrEqual(80);
        expect(flake.y).toBeGreaterThanOrEqual(0);
        expect(flake.y).toBeLessThanOrEqual(80);
        expect(flake.alpha).toBeLessThanOrEqual(1);
      }
    }
    expect(iceFolkBlizzardFlakesV7({ x: 3, y: 5 }, 500)).not.toEqual(
      iceFolkBlizzardFlakesV7({ x: 3, y: 5 }, 0),
    );
  });

  it("cases a Frozen unit in ice to the waist, and nothing above it", async () => {
    const fighter = await readRaster(
      path.join(ROOT, "public/assets/chibi/units/chibi-direction-fighter.png"),
    );
    const casing = iceFolkFrozenCasingV7(fighter);
    const margin = (casing.width - fighter.width) / 2;
    let top = fighter.height;
    let bottom = -1;
    for (let y = 0; y < fighter.height; y += 1)
      for (let x = 0; x < fighter.width; x += 1)
        if ((fighter.data[(y * fighter.width + x) * 4 + 3] ?? 0) >= 128) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    const line =
      Math.round(
        bottom -
          (bottom - top + 1) * ICE_FOLK_FROZEN_MARKER_V7.frozen.heightShare,
      ) + margin;
    let below = 0;
    for (let y = 0; y < casing.height; y += 1)
      for (let x = 0; x < casing.width; x += 1) {
        const alpha = alphaAt(casing, x, y);
        if (y < line - 1) expect(alpha, `${x},${y}`).toBe(0);
        else if (alpha > 0) below += 1;
      }
    expect(below).toBeGreaterThan(400);
    expect(sameBytes(casing, iceFolkFrozenCasingV7(fighter))).toBe(true);
  });

  it("names its colours and timeline", () => {
    for (const colour of Object.values(ICE_FOLK_PALETTE_V7))
      expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(isAccentColour(SPEC, 0x37, 0xb1, 0xfa)).toBe(true);
    const steps = ICE_FOLK_SHATTER_TIMELINE_V7.map((entry) => entry.step);
    expect(steps).toEqual(["FREEZE", "CRACK", "BURST", "SHARDS"]);
    for (const entry of ICE_FOLK_SHATTER_TIMELINE_V7)
      expect(entry.toMs).toBeGreaterThan(entry.fromMs);
  });
});
