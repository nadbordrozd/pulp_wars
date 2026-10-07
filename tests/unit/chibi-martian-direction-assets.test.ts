import { access, readFile } from "node:fs/promises";
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
  CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
  MARTIAN_FLAG_ANCHORS_V7,
  MARTIAN_FLYER_PRESENTATION_V7,
  MARTIAN_PALETTE_V7,
} from "../../src/assets/chibi-direction-martian-art-manifest";
import {
  ACCENT_PRESETS,
  accentRaster,
  isAccentColour,
} from "../../scripts/art/chibi/accent";
import {
  batchManifestProblems,
  CHIBI_CLASS_RECIPES,
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
  seatedRaster,
} from "../../scripts/art/chibi/raster";
import {
  MARTIAN_MAGENTA_PALETTE,
  MARTIAN_MAGENTA_PALETTE_PATH,
  martianMagentaPalettePng,
} from "../../scripts/art/martian-direction/magenta-palette";

const ROOT = process.cwd();
const BATCH = "direction-martian";

/** Role, unit name, and the Human role whose canvas it takes. */
const UNITS = [
  ["FIGHTER", "grunt", "FIGHTER"],
  ["RAIDER", "saucer", "RAIDER"],
  ["MARKSMAN", "ray-gunner", "MARKSMAN"],
  ["GUARD", "shield-projector", "GUARD"],
  ["CAPTAIN", "brain", "CAPTAIN"],
  ["CATAPULT", "tripod", "CATAPULT"],
  ["KNIGHT", "mothership", "KNIGHT"],
  ["JUGGERNAUT", "colossus", "JUGGERNAUT"],
  // The ninth art slot (ruleset 7r55, bead pulp_wars-2yc.34): the Shock
  // Trooper, the heavy line unit.
  ["SWORDSMAN", "shock-trooper", "SWORDSMAN"],
] as const;
const ICONS = [
  ["ICON:ACTION:BEAM_DOWN", "action-beam-down"],
  ["ICON:ACTION:MIND_CONTROL", "action-mind-control"],
  ["ICON:ACTION:TRACTOR_BEAM", "action-tractor-beam"],
  ["ICON:ACTION:MARTIAN:RALLY", "action-martian-rally"],
  ["ICON:ACTION:FORCE_FIELD", "action-force-field"],
  ["ICON:STATUS:SHIELD", "status-shield"],
  ["ICON:STATUS:COOLING", "status-cooling"],
] as const;
const EFFECTS = [
  ["EFFECT:HEAT_RAY", "heat-ray"],
  ["EFFECT:SHIELD_FLARE", "shield-flare"],
  ["EFFECT:BEAM_DOWN", "beam-down"],
  ["EFFECT:TRACTOR_BEAM", "tractor-beam"],
  ["EFFECT:MIND_CONTROL", "mind-control"],
] as const;
const SPEC = ACCENT_PRESETS["martian-magenta"];

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

function opaqueBottom(raster: RgbaRaster): number {
  for (let y = raster.height - 1; y >= 0; y -= 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) return y;
  return -1;
}

describe("Martian production art (pulp_wars-t6s.6)", () => {
  const byId = new Map(
    CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("lists the nine units and portraits, seven icons, five effects and City 1-3", () => {
    const expected: [ArtSubjectV7, string][] = [
      ...UNITS.map(
        ([role, name]) =>
          [`UNIT:MARTIAN:${role}`, `chibi-direction-martian-${name}`] as [
            ArtSubjectV7,
            string,
          ],
      ),
      ...UNITS.map(
        ([role, name]) =>
          [
            `PORTRAIT:MARTIAN:${role}`,
            `chibi-direction-portrait-martian-${name}`,
          ] as [ArtSubjectV7, string],
      ),
      ...[1, 2, 3].map(
        (level) =>
          [
            `CITY:MARTIAN:${level}`,
            `chibi-direction-martian-city-${level}`,
          ] as [ArtSubjectV7, string],
      ),
      ...ICONS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-icon-${name}`] as [ArtSubjectV7, string],
      ),
      ...EFFECTS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-effect-martian-${name}`] as [
            ArtSubjectV7,
            string,
          ],
      ),
    ];
    const pairs = (list: readonly (readonly [string, string])[]): string[] =>
      list.map(([subject, id]) => `${subject} ${id}`).sort();
    expect(
      pairs(
        CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.map(
          (asset) => [asset.subject, asset.id] as const,
        ),
      ),
    ).toEqual(pairs(expected));
    const built = buildChibiArtRegistryV7(
      CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
    );
    expect(built.problems).toEqual([]);
    for (const [subject, id] of expected)
      expect(
        built.registry.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([id]);
  });

  // The Mind Control revision (bead pulp_wars-b5f.3): a controlled unit
  // keeps its own sprite, so the Thrall's sprite and portrait are retired;
  // their recipes stay in the batch as history, bound to the Grunt's assets.
  it("retires the Thrall sprite and portrait and keeps their recipes as history", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(ROOT, `scripts/art/chibi/batches/batch-${BATCH}.json`),
        "utf8",
      ),
    ) as {
      readonly assets: readonly { readonly id: string }[];
      readonly recipes: readonly { readonly id: string }[];
    };
    expect(
      manifest.assets.filter((asset) => asset.id.includes("thrall")),
    ).toEqual([]);
    expect(
      manifest.recipes.filter((recipe) => recipe.id.includes("thrall")),
    ).toHaveLength(4);
    for (const file of [
      "public/assets/chibi/units/chibi-direction-martian-thrall.png",
      "public/assets/chibi/portraits/chibi-direction-portrait-martian-thrall.png",
    ])
      await expect(access(path.join(ROOT, file))).rejects.toThrow();
  });

  // Turned round by the UI bead (pulp_wars-t6s.4, MARTIAN.md wiring step
  // 7): the art is live in the direction registry, and only there. The
  // default (classic) registry holds no Martian asset, so the classic look
  // and LEGACY draw the Human stand-in with the Martian badge.
  it("is wired into the live direction registry, and only there", () => {
    const live = chibiDirectionArtRegistryV7();
    for (const asset of CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7)
      expect(
        live.variants(asset.subject).map((entry) => entry.id),
        asset.subject,
      ).toEqual([asset.id]);
    const ids = new Set(
      [...CHIBI_ART_ASSETS_V7, ...CHIBI_DIRECTION_ART_ASSETS_V7].map(
        (asset) => asset.id,
      ),
    );
    for (const asset of CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7)
      expect(ids.has(asset.id), asset.id).toBe(false);
    for (const asset of [
      ...CHIBI_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ])
      expect(asset.subject.includes("MARTIAN"), asset.id).toBe(false);
  });

  it("matches the accepted records, with no owner mask and no key-colour pixel", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets);
    expect(accepted.every((record) => record.status === "ACCEPTED")).toBe(true);
    expect(accepted.map((record) => record.id).sort()).toEqual(
      CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.map((asset) => asset.id).sort(),
    );
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual(
      accepted.map((record) => record.id).sort(),
    );
    expect(manifest.fixedFactionColours).toBe(true);
    expect(manifest.faction).toBe("MARTIAN");
    for (const entry of CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7) {
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
      expect([entry.width, entry.height], entry.id).toEqual([
        asset.canvas.width,
        asset.canvas.height,
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
      // Nothing the runtime could recolour: no pixel is in the key-colour
      // band an owner mask is cut from (the magenta accent stays below it).
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
      expect(await verifyAssetRecord(ROOT, manifest, record), entry.id).toEqual(
        [],
      );
    }
  });

  it("follows the scale contract of the mechanical roles", () => {
    const human = buildChibiArtRegistryV7(
      CHIBI_DIRECTION_ART_ASSETS_V7,
    ).registry;
    for (const [role, name, humanRole] of UNITS) {
      const mine = byId.get(`chibi-direction-martian-${name}`);
      const theirs = human.variants(`UNIT:${humanRole}`)[0];
      if (mine === undefined || theirs === undefined)
        throw new Error(`${role}: missing`);
      expect([mine.width, mine.height, mine.assetClass], role).toEqual([
        theirs.width,
        theirs.height,
        theirs.assetClass,
      ]);
      expect(chibiAnchorV7(mine), role).toEqual(chibiAnchorV7(theirs));
      const portrait = byId.get(`chibi-direction-portrait-martian-${name}`);
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
      const mine = byId.get(`chibi-direction-martian-city-${level}`);
      const undead = chibiDirectionArtRegistryV7().variants(
        `CITY:UNDEAD:${level}` as ArtSubjectV7,
      )[0];
      if (mine === undefined || undead === undefined)
        throw new Error(`city ${level}: missing`);
      // The canvases of the Undead direction cities, and inside the cell
      // apart from at most 8 px over its top edge.
      expect([mine.width, mine.height], `city ${level}`).toEqual([
        undead.width,
        undead.height,
      ]);
      expect(chibiOverflowV7(mine).up, `city ${level}`).toBeLessThanOrEqual(8);
    }
  });

  it("records a pennant anchor on each city's own mast, and how the flyers fly", async () => {
    for (const level of [1, 2, 3]) {
      const id = `chibi-direction-martian-city-${level}`;
      const asset = byId.get(id);
      const anchor = MARTIAN_FLAG_ANCHORS_V7[id];
      if (asset === undefined || anchor === undefined)
        throw new Error(`${id}: missing`);
      expect(anchor.pole, id).toBe(0);
      const master = await readRaster(
        path.join(ROOT, "public", asset.url.replace(/^.*assets\//, "assets/")),
      );
      // The anchor is the top of the mast: opaque there, empty above it.
      const x = Math.floor(anchor.x);
      const alpha = (y: number): number =>
        master.data[(y * master.width + x) * 4 + 3] ?? 0;
      expect(alpha(anchor.y), id).toBeGreaterThanOrEqual(128);
      expect(alpha(anchor.y - 1), id).toBeLessThan(128);
      // The pennant (11 px to the right of the mast) stays in the canvas.
      expect(anchor.x, id).toBeLessThan(asset.width);
      expect(anchor.y, id).toBeGreaterThanOrEqual(9);
    }
    expect(Object.keys(MARTIAN_FLAG_ANCHORS_V7)).toHaveLength(3);
    const bottoms = new Map<string, number>();
    for (const [, name] of UNITS) {
      const id = `chibi-direction-martian-${name}`;
      bottoms.set(
        id,
        opaqueBottom(
          await readRaster(
            path.join(ROOT, "public/assets/chibi/units", `${id}.png`),
          ),
        ),
      );
    }
    // The Saucer and the Mothership hover: a gap of at least 8 rows over
    // the line a walker of the same canvas stands on. Nothing else does.
    expect(Object.keys(MARTIAN_FLYER_PRESENTATION_V7).sort()).toEqual([
      "chibi-direction-martian-mothership",
      "chibi-direction-martian-saucer",
    ]);
    for (const [id, flyer] of Object.entries(MARTIAN_FLYER_PRESENTATION_V7)) {
      expect(bottoms.get(id), id).toBe(flyer.hullBottom);
      expect(flyer.groundLine - flyer.hullBottom, id).toBeGreaterThanOrEqual(8);
      const asset = byId.get(id);
      expect(flyer.shadow.y + flyer.shadow.radiusY, id).toBeLessThan(
        asset?.height ?? 0,
      );
    }
    const tripod = bottoms.get("chibi-direction-martian-tripod") ?? 0;
    expect(tripod).toBeGreaterThanOrEqual(80);
    for (const colour of Object.values(MARTIAN_PALETTE_V7))
      expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("the Martian accent derivation (pulp_wars-t6s.6)", () => {
  it("re-derives every unit, portrait, icon and city from its recorded candidate, byte for byte", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const record of Object.values(records.assets)) {
      if (record.subject.startsWith("EFFECT:")) continue;
      const asset = manifest.assets.find((spec) => spec.id === record.id);
      if (asset === undefined) throw new Error(`${record.id}: no asset`);
      expect(asset.accent, record.id).toBe("martian-magenta");
      expect(record.derivation.accent?.preset, record.id).toBe(
        "martian-magenta",
      );
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
      // The accent is on every piece: small, but never absent.
      expect(first.accentPixels, record.id).toBeGreaterThanOrEqual(15);
      if (/^(UNIT|PORTRAIT):/.test(record.subject))
        expect(first.accentPixels / first.opaquePixels, record.id).toBeLessThan(
          0.35,
        );
      // Only accent pixels change, and each lands on the magenta hue, clear
      // of the Undead violet (274) and of the owner key red (340 to 5).
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
        expect(hsv.hue, record.id).toBeGreaterThanOrEqual(311);
        expect(hsv.hue, record.id).toBeLessThanOrEqual(332);
      }
    }
  });

  it("pulls PixelLab's pinks and purples to one magenta and leaves the materials alone", () => {
    const width = 4;
    const data = new Uint8Array(width * 4);
    // A purple magenta (hue 300), a pink red (hue 345), chrome, lavender skin.
    const pixels = [
      [0xff, 0x00, 0xff],
      [0xff, 0x20, 0x58],
      [0xd1, 0xdb, 0xe1],
      [0xb5, 0xb4, 0xd3],
    ];
    pixels.forEach((rgb, x) => data.set([...rgb, 255], x * 4));
    const { raster, accentPixels, trimPixels } = accentRaster(
      { width, height: 1, data },
      SPEC,
    );
    expect(accentPixels).toBe(2);
    expect(trimPixels).toBe(0);
    const hue = (x: number): number =>
      rgbToHsv(
        raster.data[x * 4] ?? 0,
        raster.data[x * 4 + 1] ?? 0,
        raster.data[x * 4 + 2] ?? 0,
      ).hue;
    expect(Math.round(hue(0))).toBe(318);
    expect(Math.round(hue(1))).toBe(327);
    expect([...raster.data.slice(8, 11)]).toEqual(pixels[2]);
    expect([...raster.data.slice(12, 15)]).toEqual(pixels[3]);
    // The brief's accent and its glow keep their hue.
    for (const hex of [
      MARTIAN_PALETTE_V7.magenta,
      MARTIAN_PALETTE_V7.magentaGlow,
    ]) {
      const rgb = [1, 3, 5].map((at) =>
        Number.parseInt(hex.slice(at, at + 2), 16),
      ) as [number, number, number];
      expect(isAccentColour(SPEC, ...rgb), hex).toBe(true);
      const hsv = rgbToHsv(...rgb);
      expect(hsv.hue, hex).toBeGreaterThanOrEqual(320);
      expect(hsv.hue, hex).toBeLessThanOrEqual(330);
    }
    // Chrome, gunmetal, glass, skin and the Undead violet are never accent.
    for (const rgb of [
      [0xd5, 0xdd, 0xe6],
      [0x4a, 0x52, 0x62],
      [0x8d, 0xb9, 0xcd],
      [0x8e, 0x8c, 0xb2],
      [0xa2, 0x21, 0xee],
    ] as const)
      expect(isAccentColour(SPEC, rgb[0], rgb[1], rgb[2])).toBe(false);
  });

  it("leaves the Undead preset exactly as it was", () => {
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
    // The Ice Folk bead (pulp_wars-7g3.5) adds `ice-folk-blue` beside them,
    // the Dwarf bead (pulp_wars-78i.5) `dwarf-copper`, the Goblin redesign
    // (pulp_wars-wrn.2) `goblin-hazard`, the Candy bead (pulp_wars-jdb.5)
    // `candy-pink`.
    expect(Object.keys(ACCENT_PRESETS).sort()).toEqual([
      "candy-pink",
      "dwarf-copper",
      "goblin-hazard",
      "ice-folk-blue",
      "martian-magenta",
      "undead-violet",
    ]);
  });
});

describe("the Martian effect sprites and pipeline pieces (pulp_wars-t6s.6)", () => {
  it("has a checked-in magenta palette, and every effect pixel is one of its colours", async () => {
    const png = await readFile(path.join(ROOT, MARTIAN_MAGENTA_PALETTE_PATH));
    expect(png.equals(await martianMagentaPalettePng())).toBe(true);
    const palette = paletteColours(await readRaster(png));
    const hex = (rgb: readonly number[]): string =>
      `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    expect(palette.map(hex)).toEqual(
      MARTIAN_MAGENTA_PALETTE.map((entry) => entry.to),
    );
    const allowed = new Set(palette.map(hex));
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const [, name] of EFFECTS) {
      const id = `chibi-direction-effect-martian-${name}`;
      const record = records.assets[id];
      const asset = manifest.assets.find((spec) => spec.id === id);
      if (record === undefined || asset === undefined)
        throw new Error(`${id}: missing`);
      expect(asset.palette?.path, id).toBe(MARTIAN_MAGENTA_PALETTE_PATH);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(
        sameBytes(
          master,
          paletteMapRaster(await candidateOf(records, record), palette),
        ),
        id,
      ).toBe(true);
      let magenta = 0;
      for (let index = 0; index < master.width * master.height; index += 1) {
        const o = index * 4;
        if ((master.data[o + 3] ?? 0) === 0) continue;
        expect(master.data[o + 3], id).toBe(255);
        const colour = hex([...master.data.slice(o, o + 3)]);
        expect(allowed.has(colour), `${id}: ${colour}`).toBe(true);
        if (colour === "#ff2fb0" || colour === "#ff8fd6") magenta += 1;
      }
      expect(magenta, id).toBeGreaterThan(30);
    }
  });

  it("keeps the manifest valid, with the machine class and sibling edits it added", async () => {
    const fragments = await loadFragments(ROOT);
    const manifest = await loadBatchManifest(ROOT, BATCH);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    expect(fragments.factions.MARTIAN?.text).toContain("hot magenta");
    // A machine has the unit sizes and options, and its own class text.
    expect(CHIBI_CLASS_RECIPES.machine).toEqual({
      ...CHIBI_CLASS_RECIPES.unit,
    });
    expect(fragments.classes.machine.text).toContain("machine");
    expect(fragments.classes.machine.text).not.toContain("feet");
    expect(fragments.classes.unit.text).toContain("both feet visible");
    // An in-batch edit of another asset's recipe needs `sibling`.
    const sibling = manifest.recipes.find(
      (recipe) => recipe.id === "ray-gunner-b",
    );
    expect(sibling?.source).toEqual({
      recipe: "grunt-a",
      candidate: 0,
      sibling: true,
    });
    const without: ChibiBatchManifest = {
      ...manifest,
      recipes: manifest.recipes.map((recipe) =>
        recipe.id === "ray-gunner-b" && recipe.source !== undefined
          ? {
              ...recipe,
              source: {
                recipe: recipe.source.recipe,
                candidate: recipe.source.candidate,
              },
            }
          : recipe,
      ),
    };
    expect(batchManifestProblems(without, fragments, BATCH).join()).toContain(
      "ray-gunner-b: edit source belongs to another asset",
    );
    // No Martian asset carries the owner colour.
    for (const asset of manifest.assets)
      if (/^(UNIT|CITY|PORTRAIT):/.test(asset.subject))
        expect(asset.ownerColour, asset.id).toBe(false);
  });
});
