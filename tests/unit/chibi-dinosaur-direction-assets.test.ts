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
  CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-dinosaur-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-undead-art-manifest";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
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
  opaqueBounds,
} from "../../scripts/art/chibi/raster";

const ROOT = process.cwd();
const BATCH = "direction-dinosaur";

/** Every Dinosaur land unit of the registry: role and unit name. */
const UNITS = [
  ["FIGHTER", "caveman"],
  ["RAIDER", "raptor"],
  ["MARKSMAN", "spitter"],
  ["GUARD", "ankylosaurus"],
  ["CAPTAIN", "shaman"],
  ["CATAPULT", "triceratops"],
  ["KNIGHT", "t-rex"],
  ["JUGGERNAUT", "brontosaurus"],
] as const;
const ICONS = [
  ["ICON:ACTION:LAY_EGG", "lay-egg"],
  ["ICON:ACTION:HATCH", "hatch"],
  ["ICON:ACTION:STAMPEDE", "stampede"],
] as const;
/** The six dinosaurs: every one carries the blue hide and the accent. */
const DINOSAURS = [
  "raptor",
  "spitter",
  "ankylosaurus",
  "triceratops",
  "t-rex",
  "brontosaurus",
] as const;

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

/** Shares of the opaque pixels in the accent, hide and key-colour bands. */
function shares(raster: RgbaRaster): {
  readonly opaque: number;
  readonly accent: number;
  readonly accentHue: number;
  readonly blue: number;
} {
  let opaque = 0;
  let accent = 0;
  let blue = 0;
  const sum = [0, 0, 0];
  for (let offset = 0; offset < raster.data.length; offset += 4) {
    if ((raster.data[offset + 3] ?? 0) < 128) continue;
    opaque += 1;
    const rgb = [
      raster.data[offset] ?? 0,
      raster.data[offset + 1] ?? 0,
      raster.data[offset + 2] ?? 0,
    ] as const;
    const { hue, saturation, value } = rgbToHsv(...rgb);
    if (hue >= 8 && hue <= 45 && saturation >= 0.75 && value >= 0.55) {
      accent += 1;
      sum[0] = (sum[0] ?? 0) + rgb[0];
      sum[1] = (sum[1] ?? 0) + rgb[1];
      sum[2] = (sum[2] ?? 0) + rgb[2];
    } else if (hue >= 195 && hue <= 260 && saturation >= 0.35 && value >= 0.1)
      blue += 1;
  }
  return {
    opaque,
    accent: accent / Math.max(1, opaque),
    accentHue:
      accent === 0
        ? Number.NaN
        : rgbToHsv(
            (sum[0] ?? 0) / accent,
            (sum[1] ?? 0) / accent,
            (sum[2] ?? 0) / accent,
          ).hue,
    blue: blue / Math.max(1, opaque),
  };
}

describe("Dinosaur production art of the new visual direction (pulp_wars-3tq.13)", () => {
  const registry = chibiDirectionArtRegistryV7();
  const byId = new Map(
    CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("registers every Dinosaur land unit and portrait, the Egg, three command icons and City 1-3", () => {
    const expected: [ArtSubjectV7, string][] = [
      ...UNITS.map(
        ([role, name]) =>
          [`UNIT:DINOSAUR:${role}`, `chibi-direction-dinosaur-${name}`] as [
            ArtSubjectV7,
            string,
          ],
      ),
      ["UNIT:DINOSAUR:EGG", "chibi-direction-dinosaur-egg"],
      ...UNITS.map(
        ([role, name]) =>
          [
            `PORTRAIT:DINOSAUR:${role}`,
            `chibi-direction-portrait-dinosaur-${name}`,
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
          [
            `CITY:DINOSAUR:${level}`,
            `chibi-direction-dinosaur-city-${level}`,
          ] as [ArtSubjectV7, string],
      ),
    ];
    for (const [subject, id] of expected)
      expect(
        registry.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([id]);
    expect(CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7).toHaveLength(
      expected.length,
    );
    // Not converted: the War Drums icon, which shows no hide. The ships are
    // not in this list: since bead pulp_wars-w5j.3 every faction's ships,
    // the Dinosaurs' included, are the naval list's (bead pulp_wars-w5j.2).
    expect(registry.variants("ICON:ACTION:DINOSAUR:RALLY")).toHaveLength(0);
    for (const subject of [
      "UNIT:DINOSAUR:PATROL_BOAT",
      "UNIT:DINOSAUR:BATTLESHIP",
      "UNIT:DINOSAUR:EMBARKED_TRANSPORT",
    ] as const)
      expect(
        registry.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([
        expect.stringMatching(/^chibi-naval-dinosaur-/) as unknown as string,
      ]);
    for (const asset of CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7)
      expect(
        /^(UNIT|PORTRAIT|CITY):DINOSAUR:|^ICON:ACTION:(LAY_EGG|HATCH|STAMPEDE)$/.test(
          asset.subject,
        ),
        asset.id,
      ).toBe(true);
  });

  it("leaves no faction with a whole-garment player colour: every land unit, portrait and city of the four factions is fixed-colour", () => {
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    const owned = CHIBI_ART_ASSETS_V7.filter(
      (asset) =>
        asset.ownerMaskUrl !== undefined &&
        /^(UNIT|PORTRAIT|CITY):/.test(asset.subject),
    ).map((asset) => asset.subject);
    expect(owned.length).toBeGreaterThan(60);
    const notConverted = [...new Set(owned)]
      .filter((subject) => registry.variants(subject).length === 0)
      .sort();
    // None left: until bead pulp_wars-w5j.3 the shared boats, their
    // portraits and the embarked form were the only owned subjects without
    // a fixed-colour asset; the naval art of every faction converts them.
    expect(notConverted).toEqual([]);
    for (const subject of new Set(owned)) {
      const converted = registry.variants(subject)[0];
      if (converted === undefined) continue;
      expect(converted.fixedColours, subject).toBe(true);
      expect(converted.ownerMaskUrl, subject).toBeUndefined();
      expect(classic.variants(subject)[0]?.ownerMaskUrl, subject).toBeDefined();
    }
  });

  it("is a list of its own: the other lists and the default registry are untouched", () => {
    const ids = new Set(
      [
        ...CHIBI_ART_ASSETS_V7,
        ...CHIBI_DIRECTION_ART_ASSETS_V7,
        ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
        ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
      ].map((asset) => asset.id),
    );
    for (const asset of CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7)
      expect(ids.has(asset.id), asset.id).toBe(false);
    expect(
      buildChibiArtRegistryV7(CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7).problems,
    ).toEqual([]);
    // The classic Dinosaur art is still the default registry's.
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    expect(classic.variants("UNIT:DINOSAUR:FIGHTER")[0]?.id).toBe(
      "chibi-dinosaur-caveman",
    );
    expect(classic.variants("UNIT:DINOSAUR:EGG")[0]?.id).toBe(
      "chibi-dinosaur-egg",
    );
    expect(classic.variants("CITY:DINOSAUR:2")[0]?.id).toBe(
      "chibi-dinosaur-city-2",
    );
    expect(classic.variants("ICON:ACTION:LAY_EGG")[0]?.id).toBe(
      "chibi-icon-action-lay-egg",
    );
  });

  it("matches the accepted records as generated, with no owner mask and no player-colour area", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets).filter(
      (record) => record.status === "ACCEPTED",
    );
    expect(accepted.map((record) => record.id).sort()).toEqual(
      CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7.map((asset) => asset.id).sort(),
    );
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual(
      accepted.map((record) => record.id).sort(),
    );
    expect(manifest.fixedFactionColours).toBe(true);
    expect(manifest.faction).toBe("DINOSAUR");
    for (const entry of CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7) {
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
      // The accent is kept as PixelLab drew it: no accent step, so the
      // master is the recorded candidate, byte for byte.
      expect(asset.accent, entry.id).toBeUndefined();
      expect(record.derivation.kind, entry.id).toBe("as-is");
      expect(record.derivation.accent, entry.id).toBeUndefined();
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect([master.width, master.height], entry.id).toEqual([
        entry.width,
        entry.height,
      ]);
      const candidate = await candidateOf(records, record);
      expect(
        Buffer.from(master.data).equals(Buffer.from(candidate.data)),
        entry.id,
      ).toBe(true);
      expect(await verifyAssetRecord(ROOT, manifest, record), entry.id).toEqual(
        [],
      );
      // Fixed faction colours: nothing the runtime could recolour. Pixels
      // in the key-colour band the owner mask is cut from are a tongue, an
      // eye or the gums (under 2% of a sprite; an owned classic sprite has
      // 15% or more).
      const key = extractOwnerMask(master).mask.bits.reduce(
        (sum, bit) => sum + bit,
        0,
      );
      expect(
        key / shares(master).opaque,
        `${entry.id}: key colour`,
      ).toBeLessThan(0.02);
    }
  });

  it("imports the study's variant F for the Raptor and the T-Rex, and its spotted Caveman as a step", async () => {
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const study = "art/explorations/dinosaur-direction-2026-10";
    for (const [asset, recipe] of [
      ["chibi-direction-dinosaur-raptor", "raptor-deep-stripes-b"],
      ["chibi-direction-dinosaur-t-rex", "t-rex-deep-stripes-a"],
    ] as const) {
      expect(records.assets[asset]?.recipe, asset).toBe(recipe);
      expect(records.recipes[recipe]?.importedFrom?.exploration, recipe).toBe(
        study,
      );
      // The production master is the study's F sample, byte for byte.
      const master = await readRaster(
        path.join(ROOT, records.assets[asset]?.master.path ?? ""),
      );
      const sample = await readRaster(
        path.join(
          ROOT,
          study,
          "assets",
          `chibi-study-dino-${asset.replace("chibi-direction-dinosaur-", "")}-f.png`,
        ),
      );
      expect(
        Buffer.from(master.data).equals(Buffer.from(sample.data)),
        asset,
      ).toBe(true);
    }
    const imported = Object.values(records.recipes).filter(
      (recipe) => recipe.importedFrom !== undefined,
    );
    expect(imported.map((recipe) => recipe.id).sort()).toEqual([
      "caveman-fur-spots-a",
      "caveman-spots-skin-b",
      "raptor-base-a",
      "raptor-deep-stripes-b",
      "raptor-hide-c",
      "t-rex-base-b",
      "t-rex-deep-stripes-a",
      "t-rex-hide-a",
      "t-rex-hide-d",
    ]);
    // The Caveman's accepted sprite is a later edit of the study's.
    expect(records.assets["chibi-direction-dinosaur-caveman"]?.recipe).toBe(
      "caveman-pelt-edit-a",
    );
    // A job interrupted by a network failure stays recorded as submitted.
    expect(
      records.recipes["portrait-dinosaur-shaman-robe-edit"]?.completedAt,
    ).toBeUndefined();
    expect(
      records.recipes["portrait-dinosaur-shaman-robe-edit"]?.jobId,
    ).toBeDefined();
  });

  it("keeps the classic canvases, anchors and footprints of the units, the Egg and the cities", async () => {
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const subjects: ArtSubjectV7[] = [
      ...UNITS.map(([role]) => `UNIT:DINOSAUR:${role}` as const),
      "UNIT:DINOSAUR:EGG",
      ...UNITS.map(([role]) => `PORTRAIT:DINOSAUR:${role}` as const),
      "CITY:DINOSAUR:1",
      "CITY:DINOSAUR:2",
      "CITY:DINOSAUR:3",
    ];
    for (const subject of subjects) {
      const before = classic.variants(subject)[0];
      const after = registry.variants(subject)[0];
      if (before === undefined || after === undefined)
        throw new Error(`${subject}: missing`);
      expect([after.width, after.height, after.assetClass], subject).toEqual([
        before.width,
        before.height,
        before.assetClass,
      ]);
      expect(chibiAnchorV7(after), subject).toEqual(chibiAnchorV7(before));
      expect(chibiOverflowV7(after), subject).toEqual(chibiOverflowV7(before));
      if (!subject.startsWith("UNIT:")) continue;
      // Every recipe is an edit of the classic sprite: the feet stay where
      // they were (the bottom of the art within 2 px) and the sprite is no
      // more than 6 px wider.
      const record = records.assets[after.id];
      if (record === undefined) throw new Error(`${after.id}: no record`);
      const fresh = opaqueBounds(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      const old = opaqueBounds(
        await readRaster(
          path.join(
            ROOT,
            "public",
            before.url.replace(/^.*?assets\//, "assets/"),
          ),
        ),
      );
      if (fresh === null || old === null) throw new Error(`${subject}: empty`);
      expect(Math.abs(fresh.bottom - old.bottom), subject).toBeLessThanOrEqual(
        2,
      );
      expect(fresh.right - fresh.left, subject).toBeLessThanOrEqual(
        old.right - old.left + 6,
      );
    }
  });

  it("gives the six dinosaurs the blue hide and the red-orange accent as drawn, one hue for the faction", async () => {
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const hues: number[] = [];
    for (const name of DINOSAURS) {
      const record = records.assets[`chibi-direction-dinosaur-${name}`];
      if (record === undefined) throw new Error(`${name}: no record`);
      const measured = shares(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      // Blue hide and navy are the body; the accent is a pattern or a
      // part, never the whole sprite (a frill is not a solid accent disc).
      expect(measured.blue, name).toBeGreaterThan(0.3);
      expect(measured.accent, name).toBeGreaterThan(0.05);
      expect(measured.accent, name).toBeLessThan(0.26);
      hues.push(measured.accentHue);
    }
    for (const name of ["caveman", "shaman", "egg"] as const) {
      const record = records.assets[`chibi-direction-dinosaur-${name}`];
      if (record === undefined) throw new Error(`${name}: no record`);
      const measured = shares(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      // War paint, feathers, speckles: a small accent, and no blue.
      expect(measured.accent, name).toBeGreaterThan(0.005);
      expect(measured.accent, name).toBeLessThan(0.15);
      expect(measured.blue, name).toBeLessThan(0.02);
      hues.push(measured.accentHue);
    }
    // The study's red-orange (hue about 26), not remapped to amber (hue 31
    // and more for `#f08c1e`): within a few degrees on every sprite.
    expect(Math.min(...hues)).toBeGreaterThanOrEqual(18);
    expect(Math.max(...hues)).toBeLessThanOrEqual(34);
  });

  it("describes the look in /PRIMAL subject lines with no owner layer, and edits every piece", async () => {
    const fragments = await loadFragments(ROOT);
    const manifest = await loadBatchManifest(ROOT, BATCH);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    for (const asset of manifest.assets) {
      expect(asset.subjectKey, asset.id).toBe(`${asset.subject}/PRIMAL`);
      if (/^(UNIT|CITY|PORTRAIT):/.test(asset.subject))
        expect(asset.ownerColour, asset.id).toBe(false);
      expect(asset.maskOverride, asset.id).toBeUndefined();
    }
    for (const recipe of manifest.recipes) {
      expect(recipe.endpoint, recipe.id).toBe("edit-image-pixen");
      expect(
        recipe.editInstruction?.length ?? 0,
        recipe.id,
      ).toBeLessThanOrEqual(500);
    }
  });

  it("records a pennant anchor inside each Dinosaur city, clear of the cell", () => {
    for (const level of [1, 2, 3]) {
      const asset = byId.get(`chibi-direction-dinosaur-city-${level}`);
      if (asset === undefined) throw new Error(`city ${level}: missing`);
      const anchor = DIRECTION_FLAG_ANCHORS_V7[asset.id];
      expect(anchor, asset.id).toBeDefined();
      if (anchor === undefined) continue;
      expect(anchor.x, asset.id).toBeGreaterThan(0);
      // The pennant is 17 master px wide: it stays inside the canvas.
      expect(anchor.x + 17, asset.id).toBeLessThanOrEqual(asset.width);
      expect(anchor.y, asset.id).toBeGreaterThanOrEqual(0);
      expect(anchor.y + anchor.pole, asset.id).toBeLessThan(asset.height);
      // It flies in the part of the tall canvas above the city's own cell
      // (the classic camps flew their own flag there).
      expect(anchor.y + 11, asset.id).toBeLessThanOrEqual(
        chibiOverflowV7(asset).up + 8,
      );
    }
  });
});
