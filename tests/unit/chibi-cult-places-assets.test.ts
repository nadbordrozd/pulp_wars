import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACCENT_PRESETS } from "../../scripts/art/chibi/accent";
import {
  CHIBI_CLASS_RECIPES,
  batchManifestProblems,
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
} from "../../scripts/art/chibi/pipeline";
import { opaqueBounds } from "../../scripts/art/chibi/raster";
import { lightVerdict, lightingOf } from "../../scripts/art/lighting-qa";
import {
  FACTION_IMPROVEMENT_LOOKS_V7,
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiFallbackSubjectV7,
  chibiOverflowV7,
  cityArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_CULT_CITY_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-cult-art-manifest";
import { CHIBI_FACTION_BUILDING_ART_ASSETS_V7 } from "../../src/assets/chibi-faction-buildings-art-manifest";
import { CHIBI_FACTION_MONUMENT_ART_ASSETS_V7 } from "../../src/assets/chibi-faction-monuments-art-manifest";
import { tileImprovementSubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import { HIDDEN_FACTION_IDS_V7 } from "../../src/engine/index";
import { SETTLEMENT_SHADOW_MEASUREMENTS_V7 } from "../../src/render/canvas/settlement-shadow-measurements-v7.generated";

/**
 * The Cult's places (bead pulp_wars-mch9.16, docs/art/factions/CULT.md):
 * City 1 to 3 (batch `cities-cult`), the seven buildings (`buildings-cult`)
 * and the seven Monuments and the obelisk (`monuments-cult`). What the
 * other factions' tests check of a building and a Monument
 * (chibi-faction-buildings-assets, chibi-faction-monuments-assets) holds
 * for the Cult's too; this file checks the cities and the Cult's colours.
 */

const ROOT = process.cwd();
const CITIES = [
  [1, 80, 80],
  [2, 88, 88],
  [3, 96, 88],
] as const;

const hsvPixels = (
  source: RgbaRaster,
): { hue: number; saturation: number; value: number }[] => {
  const out = [];
  for (let index = 0; index < source.width * source.height; index += 1)
    if ((source.data[index * 4 + 3] ?? 0) >= 128)
      out.push(
        rgbToHsv(
          source.data[index * 4] ?? 0,
          source.data[index * 4 + 1] ?? 0,
          source.data[index * 4 + 2] ?? 0,
        ),
      );
  return out;
};
const masterOf = (url: string): Promise<RgbaRaster> =>
  readRaster(path.join(ROOT, "public", url.replace(/^.*?assets\//, "assets/")));
const isGreen = (p: { hue: number; saturation: number; value: number }) =>
  p.hue >= 80 && p.hue <= 152 && p.saturation >= 0.5 && p.value >= 0.45;
const isBlue = (p: { hue: number; saturation: number; value: number }) =>
  // The cloth band of the cult-lodge accent preset.
  p.hue >= 212 && p.hue <= 262 && p.saturation >= 0.45 && p.value >= 0.14;

const cultBuildings = CHIBI_FACTION_BUILDING_ART_ASSETS_V7.filter((entry) =>
  entry.subject.startsWith("IMPROVEMENT:CULT:"),
);
const cultMonuments = CHIBI_FACTION_MONUMENT_ART_ASSETS_V7.filter((entry) =>
  entry.subject.startsWith("IMPROVEMENT:MONUMENT:CULT"),
);

describe("the Cult's cities (pulp_wars-mch9.16)", () => {
  it("are a valid fixed-colour batch of three settlements in the class of the Cult buildings", async () => {
    const manifest = await loadBatchManifest(ROOT, "cities-cult");
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, "cities-cult")).toEqual(
      [],
    );
    expect(manifest.faction).toBe("CULT");
    expect(manifest.fixedFactionColours).toBe(true);
    // The feature class makes a settlement since this bead.
    expect(CHIBI_CLASS_RECIPES["calm-feature"]?.assetClasses).toContain(
      "SETTLEMENT",
    );
    expect(
      manifest.assets.map((asset) => [
        asset.id,
        asset.subject,
        asset.assetClass,
        asset.recipeClass,
        asset.canvas.width,
        asset.canvas.height,
        asset.ownerColour,
        asset.accent,
      ]),
    ).toEqual(
      CITIES.map(([level, width, height]) => [
        `chibi-direction-cult-city-${level}`,
        `CITY:CULT:${level}`,
        "SETTLEMENT",
        "calm-feature",
        width,
        height,
        false,
        "cult-lodge",
      ]),
    );
  });

  it("register the accepted masters, seated, with no mask, on the other direction cities' canvases", async () => {
    const manifest = await loadBatchManifest(ROOT, "cities-cult");
    const records = await loadRecords(
      productionLayout(ROOT, "cities-cult"),
      "cities-cult",
    );
    const live = chibiDirectionArtRegistryV7();
    expect(CHIBI_DIRECTION_CULT_CITY_ART_ASSETS_V7).toHaveLength(3);
    const widths: number[] = [];
    for (const [level, width, height] of CITIES) {
      const id = `chibi-direction-cult-city-${level}`;
      const entry = CHIBI_DIRECTION_CULT_CITY_ART_ASSETS_V7[level - 1];
      const asset = manifest.assets.find((spec) => spec.id === id);
      const record = records.assets[id];
      if (entry === undefined || asset === undefined || record === undefined)
        throw new Error(`${id}: missing`);
      expect(record.status, id).toBe("ACCEPTED");
      expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
      expect(record.derivation.kind, id).toBe("seated");
      expect(record.derivation.accent?.preset, id).toBe("cult-lodge");
      expect(record.derivation.accent?.spec, id).toEqual(
        ACCENT_PRESETS["cult-lodge"],
      );
      expect(record.mask, id).toBeUndefined();
      expect(records.recipes[record.recipe]?.request.endpoint, id).toBe(
        "generate-image-v2",
      );
      expect(entry).toMatchObject({
        id,
        subject: `CITY:CULT:${level}`,
        assetClass: "SETTLEMENT",
        width,
        height,
        fixedColours: true,
      });
      expect(entry.ownerMaskUrl, id).toBeUndefined();
      expect(chibiAssetProblemsV7(entry), id).toEqual([]);
      expect(chibiAnchorV7(entry), id).toEqual(record.anchor);
      expect(registryEntry(asset, record)).toContain("fixedColours: true");
      // Placed like the Dwarf city of its level: same canvas, same overflow.
      const dwarf = live.variants(`CITY:DWARF:${level}`)[0];
      if (dwarf === undefined) throw new Error("no Dwarf city");
      expect([entry.width, entry.height], id).toEqual([
        dwarf.width,
        dwarf.height,
      ]);
      expect(chibiOverflowV7(entry), id).toEqual(chibiOverflowV7(dwarf));
      // The board asks for it and gets it; elsewhere it is the shared city.
      const subject = cityArtSubjectV7({ artLevel: level, faction: "CULT" });
      expect(live.variants(subject), id).toEqual([entry]);
      expect(chibiFallbackSubjectV7(subject)).toBe(`CITY:${level}`);
      const master = await masterOf(entry.url);
      expect([master.width, master.height], id).toEqual([width, height]);
      const box = opaqueBounds(master);
      if (box === null) throw new Error(`${id}: empty`);
      // Seated 3 px above the bottom edge, clear of the side edges.
      expect(master.height - 1 - box.bottom, id).toBe(3);
      expect(box.left, id).toBeGreaterThanOrEqual(1);
      expect(box.right, id).toBeLessThanOrEqual(width - 2);
      widths.push(box.right - box.left + 1);
      // Its own fitted ground shadow (npm run art:settlement-shadows-measure).
      expect(SETTLEMENT_SHADOW_MEASUREMENTS_V7[id], id).toMatchObject({
        subject,
        width,
        height,
        contactY: box.bottom + 1,
      });
    }
    // A bigger town at each level, and never smaller than a building.
    expect(widths[0]).toBeGreaterThanOrEqual(58);
    expect(widths[1]).toBeGreaterThan(widths[0] ?? 0);
    expect(widths[2]).toBeGreaterThan(widths[1] ?? 0);
    // Every generated recipe has a verdict.
    for (const recipe of manifest.recipes)
      expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
        /^(ACCEPTED|REJECTED)$/,
      );
  });
});

describe("the Cult's colours on its places (pulp_wars-mch9.16)", () => {
  it("covers three cities, seven buildings, seven Monuments and the obelisk", () => {
    expect(cultBuildings.map((entry) => entry.subject).sort()).toEqual(
      (FACTION_IMPROVEMENT_LOOKS_V7.CULT ?? [])
        .map((improvement) => `IMPROVEMENT:CULT:${improvement}`)
        .sort(),
    );
    expect(cultBuildings).toHaveLength(7);
    expect(cultMonuments).toHaveLength(8);
    // The faction stays hidden: its art is wired, not offered.
    expect(HIDDEN_FACTION_IDS_V7).toContain("CULT");
  });

  it("records the cult-lodge accent on every building and Monument", async () => {
    for (const batch of ["buildings-cult", "monuments-cult"] as const) {
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      for (const asset of manifest.assets) {
        expect(asset.accent, asset.id).toBe("cult-lodge");
        expect(records.assets[asset.id]?.derivation.accent?.spec).toEqual(
          ACCENT_PRESETS["cult-lodge"],
        );
      }
      for (const recipe of manifest.recipes)
        expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
          /^(ACCEPTED|REJECTED)$/,
        );
    }
  });

  it("wears indigo roofs that are no navy, one small green at hue 148, and no red, violet or key colour", async () => {
    const roofed = new Set([
      ...CHIBI_DIRECTION_CULT_CITY_ART_ASSETS_V7.map((entry) => entry.id),
      "chibi-cult-sawmill",
      "chibi-cult-forge",
      "chibi-cult-workshop",
      "chibi-cult-port",
      "chibi-cult-shipyard",
      "chibi-cult-market",
    ]);
    for (const entry of [
      ...CHIBI_DIRECTION_CULT_CITY_ART_ASSETS_V7,
      ...cultBuildings,
      ...cultMonuments,
    ]) {
      const master = await masterOf(entry.url);
      const pixels = hsvPixels(master);
      const greens = pixels.filter(isGreen);
      for (const green of greens) {
        expect(green.hue, entry.id).toBeGreaterThanOrEqual(144);
        expect(green.hue, entry.id).toBeLessThanOrEqual(152);
      }
      // "Green is at most about 8% of a lodge sprite" (CULT.md, Palette).
      expect(greens.length / pixels.length, entry.id).toBeLessThanOrEqual(0.08);
      // Red means broken; violet and magenta are other factions' accents.
      expect(
        pixels.filter(
          (p) =>
            (p.hue >= 345 || p.hue <= 12) &&
            p.saturation >= 0.5 &&
            p.value >= 0.35,
        ).length,
        `${entry.id}: red`,
      ).toBe(0);
      expect(
        pixels.filter(
          (p) =>
            p.hue >= 270 &&
            p.hue < 345 &&
            p.saturation >= 0.3 &&
            p.value >= 0.25,
        ).length,
        `${entry.id}: violet`,
      ).toBe(0);
      expect(
        extractOwnerMask(master).mask.bits.reduce((sum, bit) => sum + bit, 0),
        `${entry.id}: key-colour pixels`,
      ).toBe(0);
      const blues = pixels.filter(isBlue);
      for (const blue of blues) {
        // Every saturated blue is the lodge's indigo, lifted out of navy.
        expect(blue.hue, entry.id).toBeGreaterThanOrEqual(236);
        expect(blue.hue, entry.id).toBeLessThanOrEqual(250);
        expect(blue.value, entry.id).toBeGreaterThanOrEqual(0.48);
      }
      // A roofed piece is a pale shape under a blue roof, not a dark blob:
      // the roof is a clear share of it (City 1 and the Shipyard the most,
      // 55% and 53%) and never all of it.
      if (roofed.has(entry.id)) {
        expect(blues.length / pixels.length, entry.id).toBeGreaterThan(0.08);
        expect(blues.length / pixels.length, entry.id).toBeLessThan(0.6);
      }
      // The light measure is asked of the bare stone pieces only. A dark
      // roof over the left half of a pale house reads as "lit from the
      // right" whatever its walls do (the Port, the Forge, City 2, and the
      // Dwarf and Undead City 2 measure so); those are judged by eye on
      // places-x4.png (CULT.md, "The places").
      if (!roofed.has(entry.id) && entry.id !== "chibi-cult-lumber-camp")
        expect(lightVerdict(lightingOf(master)), `${entry.id}: light`).not.toBe(
          "RIGHT",
        );
    }
  });

  it("draws a Cult building by the territory's owner and a Cult Monument by its builder", () => {
    // A Sawmill in Cult territory is the Cult's; the Farm stays shared.
    expect(
      tileImprovementSubjectV7(
        { populationContributions: [] },
        { x: 1, y: 1 },
        "SAWMILL",
        "CULT",
      ),
    ).toBe("IMPROVEMENT:CULT:SAWMILL");
    expect(
      tileImprovementSubjectV7(
        { populationContributions: [] },
        { x: 1, y: 1 },
        "FARM",
        "CULT",
      ),
    ).toBe("IMPROVEMENT:FARM");
    // The same Sawmill after a Human capture is the shared one.
    expect(
      tileImprovementSubjectV7(
        { populationContributions: [] },
        { x: 1, y: 1 },
        "SAWMILL",
        "ORIGINAL",
      ),
    ).toBe("IMPROVEMENT:SAWMILL");
    // A Monument the Cult built keeps the Cult's look in Human territory:
    // its achievement for the owner, the Cult obelisk for everyone else.
    const at = { x: 1, y: 1 };
    const monument = (visibility: "FULL" | "BUILDING_ONLY") =>
      tileImprovementSubjectV7(
        {
          populationContributions: [
            {
              source:
                visibility === "FULL"
                  ? {
                      kind: "MONUMENT",
                      visibility,
                      achievement: "SEA_DOG",
                      at,
                      builderFaction: "CULT",
                    }
                  : {
                      kind: "MONUMENT",
                      visibility,
                      at,
                      builderFaction: "CULT",
                    },
            },
          ] as never,
        },
        at,
        "MONUMENT",
        "ORIGINAL",
      );
    expect(monument("FULL")).toBe("IMPROVEMENT:MONUMENT:CULT:SEA_DOG");
    expect(monument("BUILDING_ONLY")).toBe("IMPROVEMENT:MONUMENT:CULT");
  });
});
