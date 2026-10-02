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
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-undead-art-manifest";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  ACCENT_PRESETS,
  accentRaster,
  isAccentColour,
} from "../../scripts/art/chibi/accent";
import {
  batchManifestProblems,
  type ChibiBatchManifest,
} from "../../scripts/art/chibi/batch-manifest";
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
  paletteSwapRaster,
  seatedRaster,
} from "../../scripts/art/chibi/raster";
import {
  ACCENT_REMAPS,
  remapAccent,
} from "../../scripts/art/undead-direction/accent";
import {
  UNDEAD_VIOLET_PALETTE,
  UNDEAD_VIOLET_PALETTE_PATH,
  undeadVioletPalettePng,
} from "../../scripts/art/undead-direction/violet-palette";

const ROOT = process.cwd();
const BATCH = "direction-undead";
const EFFECTS_BATCH = "effects-undead";

/** Every Undead land unit of the registry: role and unit name. */
const UNITS = [
  ["FIGHTER", "skeleton"],
  ["RAIDER", "ghoul"],
  ["MARKSMAN", "banshee"],
  ["GUARD", "zombie"],
  ["CAPTAIN", "necromancer"],
  ["CATAPULT", "lich"],
  ["KNIGHT", "vampire"],
  ["JUGGERNAUT", "abomination"],
] as const;
const ICONS = [
  ["ICON:ACTION:RAISE_DEAD", "raise-dead"],
  ["ICON:ACTION:DEVOUR", "devour"],
  ["ICON:ACTION:WAIL", "wail"],
  ["ICON:ACTION:UNDEAD:RALLY", "undead-rally"],
] as const;
const EFFECTS = ["wail", "splash", "raise", "wisp"] as const;
const SPEC = ACCENT_PRESETS["undead-violet"];

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

function sameBytes(left: RgbaRaster, right: RgbaRaster): boolean {
  return (
    left.width === right.width &&
    left.height === right.height &&
    Buffer.from(left.data).equals(Buffer.from(right.data))
  );
}

describe("Undead production art of the new visual direction (pulp_wars-3tq.12)", () => {
  const registry = chibiDirectionArtRegistryV7();
  const byId = new Map(
    CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("registers every Undead land unit and portrait, the four command icons, City 1-3 and four effects", () => {
    const expected: [ArtSubjectV7, string][] = [
      ...UNITS.map(
        ([role, name]) =>
          [`UNIT:UNDEAD:${role}`, `chibi-direction-undead-${name}`] as [
            ArtSubjectV7,
            string,
          ],
      ),
      ...UNITS.map(
        ([role, name]) =>
          [
            `PORTRAIT:UNDEAD:${role}`,
            `chibi-direction-portrait-undead-${name}`,
          ] as [ArtSubjectV7, string],
      ),
      ...ICONS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-icon-action-${name}`] as [
            ArtSubjectV7,
            string,
          ],
      ),
      ...[1, 2, 3].map(
        (level) =>
          [`CITY:UNDEAD:${level}`, `chibi-direction-undead-city-${level}`] as [
            ArtSubjectV7,
            string,
          ],
      ),
      ...EFFECTS.map(
        (name) =>
          [
            `EFFECT:${name.toUpperCase()}`,
            `chibi-direction-effect-${name}`,
          ] as [ArtSubjectV7, string],
      ),
    ];
    for (const [subject, id] of expected)
      expect(
        registry.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([id]);
    expect(CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7).toHaveLength(expected.length);
    // Ships are shared and stay as they are; the Plague and Bitten markers,
    // the cure sparkle and the Grave are not converted; no other faction's
    // art is in this list.
    for (const subject of [
      "UNIT:PATROL_BOAT",
      "UNIT:BATTLESHIP",
      "UNIT:EMBARKED_TRANSPORT",
      "STATUS:PLAGUED",
      "STATUS:BITTEN",
      "EFFECT:CURE",
      "GRAVE",
    ] as const)
      expect(registry.variants(subject), subject).toHaveLength(0);
    for (const asset of CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7)
      expect(
        /^(UNIT|PORTRAIT|CITY):UNDEAD:|^ICON:ACTION:(RAISE_DEAD|DEVOUR|WAIL|UNDEAD:RALLY)$|^EFFECT:/.test(
          asset.subject,
        ),
        asset.id,
      ).toBe(true);
  });

  it("is a list of its own: the Human list and the default registry are untouched", () => {
    const ids = new Set(
      [...CHIBI_ART_ASSETS_V7, ...CHIBI_DIRECTION_ART_ASSETS_V7].map(
        (asset) => asset.id,
      ),
    );
    for (const asset of CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7)
      expect(ids.has(asset.id), asset.id).toBe(false);
    expect(
      buildChibiArtRegistryV7(CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7).problems,
    ).toEqual([]);
    // The classic Undead art is still the default registry's.
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    expect(classic.variants("UNIT:UNDEAD:FIGHTER")[0]?.id).toBe(
      "chibi-undead-skeleton",
    );
    expect(classic.variants("CITY:UNDEAD:2")[0]?.id).toBe(
      "chibi-undead-city-2",
    );
    expect(classic.variants("EFFECT:WAIL")[0]?.id).toBe("chibi-effect-wail");
  });

  it("matches the accepted records, with no owner mask and no key or player colour", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets).filter(
      (record) => record.status === "ACCEPTED",
    );
    const batchEntries = CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7.filter(
      (asset) => !asset.subject.startsWith("EFFECT:"),
    );
    expect(accepted.map((record) => record.id).sort()).toEqual(
      batchEntries.map((asset) => asset.id).sort(),
    );
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual(
      accepted.map((record) => record.id).sort(),
    );
    expect(manifest.fixedFactionColours).toBe(true);
    for (const entry of batchEntries) {
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
        record.master.width,
        record.master.height,
      ]);
      expect(chibiAnchorV7(entry), entry.id).toEqual(record.anchor);
      const owned = /^(UNIT|CITY|PORTRAIT):/.test(entry.subject);
      expect(entry.fixedColours, entry.id).toBe(owned ? true : undefined);
      const line = registryEntry(asset, record);
      expect(line.includes("fixedColours: true"), entry.id).toBe(owned);
      expect(line).not.toContain("ownerMaskUrl");
      await expect(
        readFile(
          path.join(ROOT, record.master.path.replace(/\.png$/, ".mask.png")),
        ),
      ).rejects.toThrow();
      // Fixed faction colours: nothing the runtime could recolour. No pixel
      // is in the key-colour band the owner mask is cut from.
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect([master.width, master.height], entry.id).toEqual([
        entry.width,
        entry.height,
      ]);
      const mask = extractOwnerMask(master).mask;
      expect(
        mask.bits.reduce((sum, bit) => sum + bit, 0),
        `${entry.id}: key-colour pixels`,
      ).toBe(0);
    }
  });

  it("keeps the classic footprints and anchors of the units, and the cities inside the Human canvases", () => {
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    for (const [role] of UNITS) {
      const before = classic.variants(`UNIT:UNDEAD:${role}`)[0];
      const after = registry.variants(`UNIT:UNDEAD:${role}`)[0];
      if (before === undefined || after === undefined)
        throw new Error(`${role}: missing`);
      expect([after.width, after.height, after.assetClass], role).toEqual([
        before.width,
        before.height,
        before.assetClass,
      ]);
      expect(chibiAnchorV7(after), role).toEqual(chibiAnchorV7(before));
    }
    for (const level of [1, 2, 3]) {
      const before = classic.variants(
        `CITY:UNDEAD:${level}` as ArtSubjectV7,
      )[0];
      const after = byId.get(`chibi-direction-undead-city-${level}`);
      if (before === undefined || after === undefined)
        throw new Error(`city ${level}: missing`);
      // Smaller than the classic necropolis, so it blocks less of the unit
      // on the cell above: at most 8 px over the cell's top edge.
      expect(after.height, `city ${level}`).toBeLessThan(before.height);
      expect(after.width, `city ${level}`).toBeLessThanOrEqual(before.width);
      expect(chibiOverflowV7(after).up, `city ${level}`).toBeLessThanOrEqual(8);
      // The pennant's pole stands on the art, inside the canvas.
      const anchor = DIRECTION_FLAG_ANCHORS_V7[after.id];
      expect(anchor, after.id).toBeDefined();
      expect(anchor?.x ?? -1, after.id).toBeGreaterThan(0);
      expect(anchor?.x ?? 999, after.id).toBeLessThan(after.width);
      expect(anchor?.y ?? -1, after.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("the Undead accent derivation (pulp_wars-3tq.12)", () => {
  it("re-derives every master from its recorded candidate, byte for byte", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const record of Object.values(records.assets)) {
      const asset = manifest.assets.find((spec) => spec.id === record.id);
      if (asset === undefined) throw new Error(`${record.id}: no asset`);
      expect(asset.accent, record.id).toBe("undead-violet");
      expect(record.derivation.accent?.preset, record.id).toBe("undead-violet");
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
      // Deterministic, and exactly the checked-in master.
      expect(sameBytes(first.raster, second.raster), record.id).toBe(true);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(sameBytes(first.raster, master), record.id).toBe(true);
      expect(first.accentPixels, record.id).toBe(
        record.derivation.accent?.accentPixels,
      );
      expect(first.trimPixels, record.id).toBe(
        record.derivation.accent?.trimPixels,
      );
      // Every unit and portrait carries the accent.
      if (/^(UNIT|PORTRAIT):/.test(record.subject))
        expect(first.accentPixels, record.id).toBeGreaterThan(20);
      // Only accent pixels change, and each lands on the violet hue.
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
        expect(hsv.hue, record.id).toBeGreaterThanOrEqual(255);
        expect(hsv.hue, record.id).toBeLessThanOrEqual(292);
      }
    }
  });

  it("moves PixelLab's magenta to the violet of the study, and lightens only thin trim on dark cloth", () => {
    // A 5 x 5 patch of dark cloth with a one-pixel violet line, and a 3 x 3
    // blob of the same colour on bone.
    const width = 9;
    const height = 5;
    const data = new Uint8Array(width * height * 4);
    const set = (x: number, y: number, rgb: readonly number[]): void => {
      data.set([...rgb, 255], (y * width + x) * 4);
    };
    const magenta = [0xd5, 0x21, 0xee];
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1)
        set(x, y, x < 5 ? [0x14, 0x18, 0x1a] : [0xe6, 0xe0, 0xc8]);
    for (let x = 0; x < 5; x += 1) set(x, 2, magenta);
    for (let y = 1; y < 4; y += 1)
      for (let x = 6; x < 9; x += 1) set(x, y, magenta);
    const { raster, accentPixels, trimPixels } = accentRaster(
      { width, height, data },
      SPEC,
    );
    expect(accentPixels).toBe(14);
    expect(trimPixels).toBe(5);
    const pixel = (x: number, y: number): number[] => [
      ...raster.data.slice((y * width + x) * 4, (y * width + x) * 4 + 3),
    ];
    const lit = pixel(7, 2);
    // The blob: the study's violet remap (hue 274, same saturation, value).
    const study = remapAccent(
      { width: 1, height: 1, data: new Uint8Array([...magenta, 255]) },
      ACCENT_REMAPS.violet,
    ).raster.data;
    expect(lit).toEqual([...study.slice(0, 3)]);
    expect(
      Math.round(rgbToHsv(lit[0] ?? 0, lit[1] ?? 0, lit[2] ?? 0).hue),
    ).toBe(278);
    // The trim: the same hue, paler and brighter.
    const trim = pixel(2, 2);
    const trimHsv = rgbToHsv(trim[0] ?? 0, trim[1] ?? 0, trim[2] ?? 0);
    expect(trimHsv.saturation).toBeLessThanOrEqual(0.63);
    expect(trimHsv.value).toBeGreaterThanOrEqual(0.95);
    // Cloth and bone are untouched.
    expect(pixel(0, 0)).toEqual([0x14, 0x18, 0x1a]);
    expect(pixel(5, 0)).toEqual([0xe6, 0xe0, 0xc8]);
    // Bone, flesh, cloth, iron and bronze are never accent pixels.
    for (const rgb of [
      [0xe6, 0xe0, 0xc8],
      [0x94, 0x88, 0x84],
      [0x31, 0x31, 0x35],
      [0x64, 0x71, 0x7e],
      [0x96, 0x6f, 0x40],
    ] as const)
      expect(isAccentColour(SPEC, rgb[0], rgb[1], rgb[2])).toBe(false);
  });

  it("is checked by the manifest and by validation", async () => {
    const fragments = await loadFragments(ROOT);
    const manifest = await loadBatchManifest(ROOT, BATCH);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    const withAsset = (
      change: (asset: ChibiBatchManifest["assets"][number]) => object,
    ): string[] =>
      batchManifestProblems(
        {
          ...manifest,
          assets: manifest.assets.map((asset, index) =>
            index === 0
              ? ({ ...asset, ...change(asset) } as typeof asset)
              : asset,
          ),
        },
        fragments,
        BATCH,
      );
    expect(withAsset(() => ({ accent: "undead-teal" })).join()).toContain(
      "unknown accent preset",
    );
    expect(withAsset(() => ({ ownerColour: true })).join()).toContain(
      "an accent is only for fixed-colour assets",
    );
    // A master whose manifest no longer names the accent fails validation.
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const record = records.assets["chibi-direction-undead-skeleton"];
    if (record === undefined) throw new Error("no Skeleton record");
    expect(await verifyAssetRecord(ROOT, manifest, record)).toEqual([]);
    const { accent: _accent, ...plain } = manifest.assets.find(
      (asset) => asset.id === record.id,
    ) ?? { accent: "" };
    void _accent;
    const problems = await verifyAssetRecord(
      ROOT,
      {
        ...manifest,
        assets: [plain as ChibiBatchManifest["assets"][number]],
      },
      record,
    );
    expect(problems.join()).toContain("recorded accent is not the manifest's");
  });
});

describe("the violet Undead effects (pulp_wars-3tq.12)", () => {
  it("has a violet palette with one colour for each colour of the frost palette", async () => {
    const violet = await readFile(path.join(ROOT, UNDEAD_VIOLET_PALETTE_PATH));
    expect(violet.equals(await undeadVioletPalettePng())).toBe(true);
    const hex = (colours: readonly (readonly number[])[]): string[] =>
      colours.map(
        (rgb) =>
          `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
      );
    expect(hex(paletteColours(await readRaster(violet)))).toEqual(
      UNDEAD_VIOLET_PALETTE.map((entry) => entry.to),
    );
    const frost = await readRaster(
      path.join(ROOT, "scripts/art/chibi/palettes/undead-frost.png"),
    );
    expect(hex(paletteColours(frost))).toEqual(
      UNDEAD_VIOLET_PALETTE.map((entry) => entry.from),
    );
  });

  it("is each accepted effect in the violet palette: the same shapes, swapped colour by colour", async () => {
    const manifest = await loadBatchManifest(ROOT, EFFECTS_BATCH);
    const records = await loadRecords(
      productionLayout(ROOT, EFFECTS_BATCH),
      EFFECTS_BATCH,
    );
    const palette = async (file: string) =>
      paletteColours(await readRaster(path.join(ROOT, file)));
    const frost = await palette("scripts/art/chibi/palettes/undead-frost.png");
    const violet = await palette(UNDEAD_VIOLET_PALETTE_PATH);
    for (const name of EFFECTS) {
      const classic = records.assets[`chibi-effect-${name}`];
      const record = records.assets[`chibi-direction-effect-${name}`];
      const asset = manifest.assets.find(
        (spec) => spec.id === `chibi-direction-effect-${name}`,
      );
      if (classic === undefined || record === undefined || asset === undefined)
        throw new Error(`${name}: missing`);
      // The same recipe and candidate as the classic sprite, which stays.
      expect([record.recipe, record.candidate], name).toEqual([
        classic.recipe,
        classic.candidate,
      ]);
      expect(asset.paletteRecipe, name).toBe(classic.recipe);
      expect(classic.status, name).toBe("ACCEPTED");
      expect(record.derivation.paletteFrom?.path, name).toBe(
        "scripts/art/chibi/palettes/undead-frost.png",
      );
      expect(record.derivation.palette?.path, name).toBe(
        UNDEAD_VIOLET_PALETTE_PATH,
      );
      const classicMaster = await readRaster(
        path.join(ROOT, classic.master.path),
      );
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(
        sameBytes(master, paletteSwapRaster(classicMaster, frost, violet)),
        name,
      ).toBe(true);
      expect(
        sameBytes(
          master,
          paletteSwapRaster(
            paletteMapRaster(await candidateOf(records, record), frost),
            frost,
            violet,
          ),
        ),
        name,
      ).toBe(true);
      expect(await verifyAssetRecord(ROOT, manifest, record), name).toEqual([]);
      expect(await verifyAssetRecord(ROOT, manifest, classic), name).toEqual(
        [],
      );
      const entry = CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7.find(
        (candidate) => candidate.id === record.id,
      );
      expect(
        entry?.url.endsWith(record.master.path.replace(/^public\//, "")),
        name,
      ).toBe(true);
      expect([entry?.width, entry?.height], name).toEqual([
        record.master.width,
        record.master.height,
      ]);
    }
    // A swap needs palettes of the same length and pixels on the palette.
    expect(() =>
      paletteSwapRaster(
        { width: 1, height: 1, data: new Uint8Array([1, 2, 3, 255]) },
        frost,
        violet,
      ),
    ).toThrow(/off the source palette/);
    expect(() =>
      paletteSwapRaster(
        { width: 1, height: 1, data: new Uint8Array(4) },
        frost,
        violet.slice(1),
      ),
    ).toThrow(/same length/);
  });
});
