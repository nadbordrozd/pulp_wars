import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  navalArtRoleOfSubjectV7,
  navalArtSubjectV7,
  navalSharedSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_DIRECTION_CANDY_ART_ASSETS_V7,
  CHIBI_DIRECTION_CANDY_NAVAL_ART_ASSETS_V7,
} from "../../src/assets/chibi-direction-candy-art-manifest";
import {
  CANDY_MARKERS_V7,
  CANDY_PALETTE_V7,
} from "../../src/assets/chibi-direction-candy-presentation";
import { CHIBI_NAVAL_FACTION_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-faction-art-manifest";
import { CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-submarine-art-manifest";
import type { FactionIdV7 } from "../../src/engine/index";
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
} from "../../scripts/art/chibi/raster";
import {
  CANDY_CHOCOLATE_PALETTE,
  CANDY_CHOCOLATE_PALETTE_PATH,
  CANDY_MINT_CHOCOLATE_PALETTE,
  CANDY_MINT_CHOCOLATE_PALETTE_PATH,
  CANDY_SUGAR_PALETTE,
  CANDY_SUGAR_PALETTE_PATH,
  candyPalettePng,
  candySugarPalettePng,
} from "../../scripts/art/candy-direction/sugar-palette";

const ROOT = process.cwd();
const BATCH = "direction-candy";
const NAVAL_BATCH = "naval-candy";

/** Role and unit name. */
const UNITS = [
  ["FIGHTER", "gumdrop"],
  ["RAIDER", "donut-racer"],
  ["MARKSMAN", "gumball-gunner"],
  ["GUARD", "marshmallow"],
  ["CAPTAIN", "confectioner"],
  ["CATAPULT", "pie-launcher"],
  ["KNIGHT", "gummy-bear"],
  ["JUGGERNAUT", "rock-candy-golem"],
  // The ninth art slot (ruleset 7r55, bead pulp_wars-2yc.34): the
  // Jawbreaker, the heavy line unit.
  ["SWORDSMAN", "jawbreaker"],
] as const;
const ICONS = [
  ["ICON:ACTION:SUGAR_RUSH", "icon-action-sugar-rush"],
  ["ICON:ACTION:REBAKE", "icon-action-rebake"],
  ["ICON:ACTION:SUGAR_TOSS", "icon-action-sugar-toss"],
  ["ICON:ACTION:CANDY:TEND_WOUNDED", "icon-action-frosting"],
  ["ICON:ACTION:SPLAT", "icon-action-splat"],
  ["ICON:ACTION:BOUNCE", "icon-action-bounce"],
  ["ICON:STATUS:RUSHED", "icon-status-rushed"],
  ["ICON:STATUS:CRASHED", "icon-status-crashed"],
  ["ICON:STATUS:SPLATTED", "icon-status-splatted"],
  ["ICON:TECH:CANDY:FORTIFICATION", "icon-tech-home-sweet-home"],
  ["ICON:TECH:CANDY:EXPLOSIVES", "icon-tech-peppermint-surprise"],
  ["ICON:HUD:CANDY:EMBLEM", "icon-candy-emblem"],
  // The Candy redesign (bead pulp_wars-jdb.14): Top-Up, Stuck, Toothache.
  ["ICON:ACTION:TOP_UP", "icon-action-top-up"],
  ["ICON:STATUS:STUCK", "icon-status-stuck"],
  ["ICON:STATUS:TOOTHACHE", "icon-status-toothache"],
] as const;
const EFFECTS = [
  ["EFFECT:GUMBALL_SHOT", "gumball-shot"],
  ["EFFECT:PIE", "pie"],
  ["EFFECT:SPLAT", "splat"],
  ["EFFECT:SUGAR_TOSS", "sugar-toss"],
  ["EFFECT:REBAKE_PUFF", "rebake-puff"],
  ["EFFECT:PEPPERMINT_POP", "peppermint-pop"],
  ["EFFECT:BOUNCE", "bounce"],
] as const;
const SPEC = ACCENT_PRESETS["candy-pink"];

const masterFile = (asset: { readonly url: string }): string =>
  path.join(ROOT, "public", asset.url.replace(/^.*?assets\//, "assets/"));

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

function opaqueRows(raster: RgbaRaster): { top: number; bottom: number } {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
        if (top < 0) top = y;
        bottom = y;
      }
  return { top, bottom };
}

/** Opaque pixels that pass `test` on their hue, saturation and value. */
function countPixels(
  raster: RgbaRaster,
  test: (hue: number, saturation: number, value: number) => boolean,
): { count: number; opaque: number } {
  let count = 0;
  let opaque = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    opaque += 1;
    const { hue, saturation, value } = rgbToHsv(
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    );
    if (test(hue, saturation, value)) count += 1;
  }
  return { count, opaque };
}

const asRegistered = (asset: { readonly subject: string }): ChibiArtAssetV7 =>
  asset as unknown as ChibiArtAssetV7;

const NAVAL_MASTERS = CHIBI_DIRECTION_CANDY_NAVAL_ART_ASSETS_V7.map((entry) =>
  asRegistered(entry.asset),
);
const ALL_MASTERS = [...CHIBI_DIRECTION_CANDY_ART_ASSETS_V7, ...NAVAL_MASTERS];
/**
 * The Candy Submarine and its portrait (bead pulp_wars-5ti.6): later
 * assets of the naval batch, listed with every faction's Submarine in
 * chibi-naval-submarine-art-manifest.ts and checked by the naval test.
 */
const SUBMARINE_MASTERS = CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7.filter(
  (entry) => entry.faction === "CANDY",
).map((entry) => asRegistered(entry.asset));

describe("Candy production art (pulp_wars-jdb.5)", () => {
  const byId = new Map(
    CHIBI_DIRECTION_CANDY_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("lists the nine units, the portraits, City 1-3, the Crumbs, fifteen icons and seven effects", () => {
    const expected: [string, string][] = [
      ...UNITS.map(
        ([role, name]) =>
          [`UNIT:CANDY:${role}`, `chibi-direction-candy-${name}`] as [
            string,
            string,
          ],
      ),
      ...UNITS.map(
        ([role, name]) =>
          [
            `PORTRAIT:CANDY:${role}`,
            `chibi-direction-portrait-candy-${name}`,
          ] as [string, string],
      ),
      ...[1, 2, 3].map(
        (level) =>
          [`CITY:CANDY:${level}`, `chibi-direction-candy-city-${level}`] as [
            string,
            string,
          ],
      ),
      ["CRUMBS", "chibi-direction-candy-crumbs"],
      ...ICONS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-${name}`] as [string, string],
      ),
      ...EFFECTS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-effect-candy-${name}`] as [string, string],
      ),
    ];
    const pairs = (list: readonly (readonly [string, string])[]): string[] =>
      list.map(([subject, id]) => `${subject} ${id}`).sort();
    expect(
      pairs(
        CHIBI_DIRECTION_CANDY_ART_ASSETS_V7.map(
          (asset) => [asset.subject, asset.id] as const,
        ),
      ),
    ).toEqual(pairs(expected));
    const built = buildChibiArtRegistryV7(CHIBI_DIRECTION_CANDY_ART_ASSETS_V7);
    expect(built.problems).toEqual([]);
    for (const [subject, id] of expected)
      expect(
        built.registry
          .variants(subject as ArtSubjectV7)
          .map((asset) => asset.id),
        subject,
      ).toEqual([id]);
    // The naval set: the shared ships' roles and portraits, Candy subjects.
    expect(
      CHIBI_DIRECTION_CANDY_NAVAL_ART_ASSETS_V7.map(
        (entry) => `${entry.kind}:${entry.role} ${entry.asset.subject}`,
      ),
    ).toEqual([
      "UNIT:PATROL_BOAT UNIT:CANDY:PATROL_BOAT",
      "UNIT:BATTLESHIP UNIT:CANDY:BATTLESHIP",
      "UNIT:EMBARKED_TRANSPORT UNIT:CANDY:EMBARKED_TRANSPORT",
      "PORTRAIT:PATROL_BOAT PORTRAIT:CANDY:PATROL_BOAT",
      "PORTRAIT:BATTLESHIP PORTRAIT:CANDY:BATTLESHIP",
    ]);
    // They are what the live generic naval wiring (pulp_wars-w5j.3) asks
    // for once CANDY is a faction, and fall back to the shared ships.
    for (const entry of CHIBI_DIRECTION_CANDY_NAVAL_ART_ASSETS_V7) {
      expect(entry.asset.subject).toBe(
        navalArtSubjectV7(
          "CANDY" as unknown as FactionIdV7,
          entry.kind,
          entry.role,
        ),
      );
      expect(navalArtRoleOfSubjectV7(asRegistered(entry.asset).subject)).toBe(
        entry.role,
      );
      expect(navalSharedSubjectV7(asRegistered(entry.asset).subject)).toBe(
        `${entry.kind}:${entry.role}`,
      );
    }
  });

  // Turned round by the Candy engine bead (pulp_wars-jdb.3), which registers
  // the faction and wires its unit sprites, portraits, cities and ships in;
  // the Candy UI bead (pulp_wars-jdb.6) draws the icons, the Crumbs marker
  // and the effects, which the registry already holds.
  it("is wired into the live direction registry, and only there", async () => {
    const ids = new Set(ALL_MASTERS.map((asset) => asset.id));
    for (const asset of [
      ...CHIBI_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ]) {
      expect(ids.has(asset.id), asset.id).toBe(false);
      expect(asset.subject.includes("CANDY"), asset.id).toBe(false);
    }
    const live = chibiDirectionArtRegistryV7();
    for (const asset of CHIBI_DIRECTION_CANDY_ART_ASSETS_V7)
      expect(
        live.variants(asset.subject).map((entry) => entry.id),
        asset.subject,
      ).toEqual([asset.id]);
    // The naval set is part of the generic naval list, on the subjects the
    // live naval wiring asks for.
    for (const entry of NAVAL_MASTERS) {
      expect(
        CHIBI_NAVAL_FACTION_ART_ASSETS_V7.some(
          (naval) => naval.asset.id === entry.id,
        ),
        entry.id,
      ).toBe(true);
      expect(
        live.variants(entry.subject).map((variant) => variant.id),
        entry.subject,
      ).toEqual([entry.id]);
    }
    // Only the two live registries import the manifest. The Candy UI (bead
    // pulp_wars-jdb.6) reads the presentation data (the palette and the
    // marker sizes and places) from its marker, cue and attack-cue modules.
    const files = (await readdir(path.join(ROOT, "src"), { recursive: true }))
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => !/chibi-direction-candy-/.test(file));
    const importers: string[] = [];
    const presentationReaders: string[] = [];
    for (const file of files) {
      const text = await readFile(path.join(ROOT, "src", file), "utf8");
      if (/from "[^"]*chibi-direction-candy-art-manifest/.test(text))
        importers.push(file);
      if (/from "[^"]*chibi-direction-candy-presentation/.test(text))
        presentationReaders.push(file);
    }
    expect(importers.sort()).toEqual([
      "assets/chibi-direction-art-manifest.ts",
      "assets/chibi-naval-faction-art-manifest.ts",
    ]);
    expect(presentationReaders.sort()).toEqual([
      "render/canvas/attack-effects-v7.ts",
      "render/canvas/candy-canvas-v7.ts",
      "render/canvas/candy-effects-v7.ts",
      // The giants' signatures (`pulp_wars-w49.32`): the Gingerbread
      // Giant's Break Off cue reads the palette.
      "render/canvas/giant-effects-v7.ts",
    ]);
    // It does not import the other factions' naval manifest either.
    const own = await readFile(
      path.join(ROOT, "src/assets/chibi-direction-candy-art-manifest.ts"),
      "utf8",
    );
    expect(own.includes('from "./chibi-naval-faction-art-manifest"')).toBe(
      false,
    );
  });

  it("matches the accepted records of both batches: no mask, no owner area", async () => {
    for (const [batch, entries] of [
      [BATCH, CHIBI_DIRECTION_CANDY_ART_ASSETS_V7],
      [NAVAL_BATCH, [...NAVAL_MASTERS, ...SUBMARINE_MASTERS]],
    ] as const) {
      const manifest = await loadBatchManifest(ROOT, batch);
      expect(
        batchManifestProblems(manifest, await loadFragments(ROOT)),
        batch,
      ).toEqual([]);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      const accepted = Object.values(records.assets);
      expect(accepted.every((record) => record.status === "ACCEPTED")).toBe(
        true,
      );
      expect(accepted.map((record) => record.id).sort(), batch).toEqual(
        entries.map((asset) => asset.id).sort(),
      );
      expect(manifest.assets.map((asset) => asset.id).sort(), batch).toEqual(
        entries.map((asset) => asset.id).sort(),
      );
      expect(manifest.fixedFactionColours, batch).toBe(true);
      expect(manifest.faction, batch).toBe("CANDY");
      expect(manifest.bead, batch).toBe("pulp_wars-jdb.5");
      // Every recipe that was generated has a verdict.
      for (const recipe of manifest.recipes)
        expect(
          ["ACCEPTED", "REJECTED"],
          `${batch} ${recipe.id}: ${records.recipes[recipe.id]?.review?.verdict}`,
        ).toContain(records.recipes[recipe.id]?.review?.verdict);
      for (const entry of entries) {
        const record = records.assets[entry.id];
        const asset = manifest.assets.find((spec) => spec.id === entry.id);
        if (asset === undefined || record === undefined)
          throw new Error(`${entry.id}: not in the batch`);
        expect(asset.subject, entry.id).toBe(entry.subject);
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
        expect(registryEntry(asset, record)).not.toContain("ownerMaskUrl");
        await expect(
          readFile(masterFile(entry).replace(/\.png$/, ".mask.png")),
        ).rejects.toThrow();
        const master = await readRaster(masterFile(entry));
        expect([master.width, master.height], entry.id).toEqual([
          entry.width,
          entry.height,
        ]);
        expect(
          await verifyAssetRecord(ROOT, manifest, record),
          entry.id,
        ).toEqual([]);
      }
    }
  });

  it("pins the pink through the candy-pink accent step on every piece but the effects", async () => {
    expect(SPEC).toEqual({
      band: {
        hueFrom: 310,
        hueTo: 356,
        saturationMin: 0.3,
        valueMin: 0.3,
        hueCentre: 340,
      },
      hue: 334,
      hueSpread: 0.25,
      saturation: { scale: 0.55, add: 0.08, max: 0.5 },
      value: { scale: 0.6, add: 0.42 },
    });
    // The value step lifts a wine shade and keeps the order of the tones.
    const pixel = (r: number, g: number, b: number): RgbaRaster => ({
      width: 1,
      height: 1,
      data: Uint8Array.from([r, g, b, 255]),
    });
    const lit = accentRaster(pixel(0xda, 0x56, 0x73), SPEC).raster.data;
    const shade = accentRaster(pixel(0x87, 0x1e, 0x4a), SPEC).raster.data;
    const value = (data: ArrayLike<number>): number =>
      rgbToHsv(data[0] ?? 0, data[1] ?? 0, data[2] ?? 0).value;
    expect(value(shade)).toBeGreaterThan(0.7);
    expect(value(lit)).toBeGreaterThan(value(shade));
    for (const data of [lit, shade]) {
      const hsv = rgbToHsv(data[0] ?? 0, data[1] ?? 0, data[2] ?? 0);
      expect(hsv.saturation).toBeLessThanOrEqual(0.51);
      expect(hsv.hue).toBeGreaterThan(325);
      expect(hsv.hue).toBeLessThan(342);
    }
    // Chocolate, caramel, cream, mint and the outline are never touched.
    for (const hex of ["#6d2415", "#c8783a", "#f0d7ba", "#8ddab3", "#040203"])
      expect(
        isAccentColour(
          SPEC,
          Number.parseInt(hex.slice(1, 3), 16),
          Number.parseInt(hex.slice(3, 5), 16),
          Number.parseInt(hex.slice(5, 7), 16),
        ),
        hex,
      ).toBe(false);
    for (const [batch, entries] of [
      [BATCH, CHIBI_DIRECTION_CANDY_ART_ASSETS_V7],
      [NAVAL_BATCH, NAVAL_MASTERS],
    ] as const) {
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      for (const entry of entries) {
        const asset = manifest.assets.find((spec) => spec.id === entry.id);
        const record = records.assets[entry.id];
        if (asset === undefined || record === undefined)
          throw new Error(`${entry.id}: not in the batch`);
        if (entry.assetClass === "EFFECT") {
          expect(asset.accent, entry.id).toBeUndefined();
          continue;
        }
        expect(asset.accent, entry.id).toBe("candy-pink");
        expect(record.derivation?.accent?.preset, entry.id).toBe("candy-pink");
        // As-is classes: the master is its candidate through the step.
        if (entry.assetClass === "SETTLEMENT") continue;
        const master = await readRaster(masterFile(entry));
        expect(
          sameBytes(
            master,
            accentRaster(await candidateOf(records, record), SPEC).raster,
          ),
          entry.id,
        ).toBe(true);
      }
    }
  });

  it("keeps every pink pale: nothing on the Martian magenta, the Human crimson or the owner key", async () => {
    for (const asset of ALL_MASTERS) {
      if (asset.assetClass === "EFFECT") continue;
      const master = await readRaster(masterFile(asset));
      // After the step no pink is more saturated than 0.5 (a rounding
      // margin), where the Martian magenta is 0.75 and the crimson 0.87.
      const hot = countPixels(
        master,
        (hue, saturation, value) =>
          hue >= 310 && hue <= 356 && saturation > 0.53 && value >= 0.3,
      );
      expect(hot.count, `${asset.id}: saturated pink pixels`).toBe(0);
      // A few chocolate shades lie at hue 356 to 5; none may form an owner
      // area a mask would find.
      const key = extractOwnerMask(master).mask.bits.reduce(
        (sum, bit) => sum + bit,
        0,
      );
      const { opaque } = countPixels(master, () => true);
      expect(key / opaque, `${asset.id}: key-colour share`).toBeLessThan(0.08);
    }
    // The Chocolatier look (bead pulp_wars-jdb.10, the user: "It needs a
    // darker color as accent. could be chocolate"): chocolate is on the
    // roster as its dark anchor and the pink is a cherry. No unit is more
    // than a tenth pink (the Confectioner's bow and the cheeks), the roster
    // as a whole under 5% (it was 46% at first, 15% after pulp_wars-2o7.3),
    // and chocolate brown is at least a tenth of every one of the nine
    // units (the Chocolate Bunny, the Gingerbread Giant and the Jawbreaker
    // included) and a fifth of the roster.
    let rosterPink = 0;
    let rosterChocolate = 0;
    let rosterOpaque = 0;
    for (const [, name] of UNITS) {
      const asset = byId.get(`chibi-direction-candy-${name}`);
      if (asset === undefined) throw new Error(name);
      const master = await readRaster(masterFile(asset));
      const pink = countPixels(
        master,
        (hue, saturation, value) =>
          hue >= 300 && hue <= 358 && saturation >= 0.12 && value >= 0.5,
      );
      const chocolate = countPixels(
        master,
        (hue, saturation, value) =>
          hue >= 5 &&
          hue <= 40 &&
          saturation >= 0.4 &&
          value >= 0.12 &&
          value <= 0.6,
      );
      rosterPink += pink.count;
      rosterChocolate += chocolate.count;
      rosterOpaque += pink.opaque;
      expect(pink.count / pink.opaque, `${name}: pink share`).toBeLessThan(0.1);
      expect(
        chocolate.count / chocolate.opaque,
        `${name}: chocolate share`,
      ).toBeGreaterThan(0.1);
    }
    expect(rosterPink / rosterOpaque, "roster pink share").toBeLessThan(0.05);
    expect(
      rosterChocolate / rosterOpaque,
      "roster chocolate share",
    ).toBeGreaterThan(0.2);
  });

  // Since the Chocolatier look (pulp_wars-jdb.10) each effect is its
  // accepted candidate mapped to the sugar palette and then swapped colour
  // for colour to a chocolate palette (`paletteFrom` and `palette`).
  it("has checked-in sugar and chocolate palettes, and every effect pixel is a colour of its chocolate palette", async () => {
    const png = await readFile(path.join(ROOT, CANDY_SUGAR_PALETTE_PATH));
    expect(png.equals(await candySugarPalettePng())).toBe(true);
    const colours = paletteColours(
      await readRaster(path.join(ROOT, CANDY_SUGAR_PALETTE_PATH)),
    );
    expect(
      colours.map(
        (colour) =>
          `#${colour.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
      ),
    ).toEqual(CANDY_SUGAR_PALETTE.map((entry) => entry.to));
    const swaps = [
      [CANDY_CHOCOLATE_PALETTE_PATH, CANDY_CHOCOLATE_PALETTE],
      [CANDY_MINT_CHOCOLATE_PALETTE_PATH, CANDY_MINT_CHOCOLATE_PALETTE],
    ] as const;
    const allowedOf = new Map<string, Set<number>>();
    for (const [file, palette] of swaps) {
      expect(
        (await readFile(path.join(ROOT, file))).equals(
          await candyPalettePng(palette),
        ),
        file,
      ).toBe(true);
      // Position for position the sugar palette, with no pink left.
      expect(palette.length, file).toBe(CANDY_SUGAR_PALETTE.length);
      for (const entry of palette) {
        const hsv = rgbToHsv(
          Number.parseInt(entry.to.slice(1, 3), 16),
          Number.parseInt(entry.to.slice(3, 5), 16),
          Number.parseInt(entry.to.slice(5, 7), 16),
        );
        expect(
          hsv.hue >= 300 &&
            hsv.hue <= 358 &&
            hsv.saturation >= 0.12 &&
            hsv.value >= 0.5,
          `${file} ${entry.to}`,
        ).toBe(false);
      }
      allowedOf.set(
        file,
        new Set(
          paletteColours(await readRaster(path.join(ROOT, file))).map(
            (colour) => (colour[0] << 16) | (colour[1] << 8) | colour[2],
          ),
        ),
      );
    }
    const manifest = await loadBatchManifest(ROOT, BATCH);
    for (const [, name] of EFFECTS) {
      const id = `chibi-direction-effect-candy-${name}`;
      const asset = manifest.assets.find((spec) => spec.id === id);
      expect(asset?.paletteFrom?.path, id).toBe(CANDY_SUGAR_PALETTE_PATH);
      expect(asset?.palette?.path, id).toBe(
        name === "peppermint-pop"
          ? CANDY_MINT_CHOCOLATE_PALETTE_PATH
          : CANDY_CHOCOLATE_PALETTE_PATH,
      );
      const allowed = allowedOf.get(asset?.palette?.path ?? "");
      if (allowed === undefined) throw new Error(id);
      const entry = byId.get(id);
      if (entry === undefined) throw new Error(id);
      const master = await readRaster(masterFile(entry));
      let opaque = 0;
      for (let index = 0; index < master.width * master.height; index += 1) {
        const o = index * 4;
        const alpha = master.data[o + 3] ?? 0;
        expect([0, 255], id).toContain(alpha);
        if (alpha === 0) continue;
        opaque += 1;
        expect(
          allowed.has(
            ((master.data[o] ?? 0) << 16) |
              ((master.data[o + 1] ?? 0) << 8) |
              (master.data[o + 2] ?? 0),
          ),
          id,
        ).toBe(true);
      }
      expect(opaque, id).toBeGreaterThan(80);
    }
  });

  it("uses the role canvases of the other factions and the shared ships' canvases", async () => {
    const sizes: Record<string, readonly [number, number, string]> = {
      gumdrop: [56, 80, "STANDARD_UNIT"],
      "gumball-gunner": [56, 80, "STANDARD_UNIT"],
      marshmallow: [56, 80, "STANDARD_UNIT"],
      confectioner: [56, 80, "STANDARD_UNIT"],
      jawbreaker: [56, 80, "STANDARD_UNIT"],
      "donut-racer": [72, 88, "LARGE_UNIT"],
      "pie-launcher": [72, 88, "LARGE_UNIT"],
      "gummy-bear": [72, 88, "LARGE_UNIT"],
      "rock-candy-golem": [88, 104, "GIANT_UNIT"],
    };
    for (const [name, [width, height, assetClass]] of Object.entries(sizes)) {
      const asset = byId.get(`chibi-direction-candy-${name}`);
      expect([asset?.width, asset?.height, asset?.assetClass], name).toEqual([
        width,
        height,
        assetClass,
      ]);
      if (asset === undefined) continue;
      // A unit fills at least half of its canvas height and stands within
      // 16 px of its bottom (the Toffee Trooper, a squat dome, is the smallest).
      const rows = opaqueRows(await readRaster(masterFile(asset)));
      expect(rows.bottom - rows.top + 1, name).toBeGreaterThanOrEqual(
        height * 0.55,
      );
      expect(height - 1 - rows.bottom, name).toBeLessThanOrEqual(16);
    }
    for (const entry of CHIBI_DIRECTION_CANDY_NAVAL_ART_ASSETS_V7) {
      const shared = CHIBI_NAVAL_FACTION_ART_ASSETS_V7.find(
        (other) =>
          other.faction === "DWARF" &&
          other.kind === entry.kind &&
          other.role === entry.role,
      );
      expect(
        [entry.asset.width, entry.asset.height, entry.asset.assetClass],
        entry.asset.id,
      ).toEqual([
        shared?.asset.width,
        shared?.asset.height,
        shared?.asset.assetClass,
      ]);
      if (entry.kind !== "UNIT" || shared === undefined) continue;
      // The hull's lowest row is within 4 rows of the Dwarf ship's, which
      // sits on the shared waterline.
      const mine = opaqueRows(
        await readRaster(masterFile(asRegistered(entry.asset))),
      );
      const theirs = opaqueRows(await readRaster(masterFile(shared.asset)));
      expect(
        Math.abs(mine.bottom - theirs.bottom),
        entry.asset.id,
      ).toBeLessThanOrEqual(4);
    }
  });

  it("names its code palette and its markers' rasters", () => {
    expect(CANDY_PALETTE_V7.faction).toBe("#ffb8d8");
    for (const [name, hex] of Object.entries(CANDY_PALETTE_V7)) {
      expect(hex, name).toMatch(/^#[0-9a-f]{6}$/);
      // Chocolatier (pulp_wars-jdb.10): only the border's identity colour
      // is pink; the code-drawn markers and cues use caramel and chocolate.
      if (name === "faction" || name === "outline") continue;
      const hsv = rgbToHsv(
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
      );
      expect(
        hsv.hue >= 300 && hsv.hue <= 358 && hsv.saturation >= 0.12,
        `${name} ${hex} is pink`,
      ).toBe(false);
    }
    expect(CANDY_PALETTE_V7.caramel).toBe("#e0a040");
    expect(CANDY_PALETTE_V7.chocolate).toBe("#4a2412");
    const subjects = new Set<string>(
      CHIBI_DIRECTION_CANDY_ART_ASSETS_V7.map((asset) => asset.subject),
    );
    for (const [name, marker] of Object.entries(CANDY_MARKERS_V7)) {
      expect(subjects.has(marker.subject), name).toBe(true);
      expect(marker.size, name).toBeGreaterThanOrEqual(16);
      expect(marker.size, name).toBeLessThanOrEqual(48);
    }
  });
});
