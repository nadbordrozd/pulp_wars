import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiOverflowV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_CURIOSITIES_ART_ASSETS_V7,
  GIANT_SPIDER_SHADOW_MEASUREMENT_V7,
} from "../../src/assets/chibi-curiosities-art-manifest";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { UNIT_SHADOW_MEASUREMENTS_V7 } from "../../src/render/canvas/unit-shadow-measurements-v7.generated";
import {
  batchManifestProblems,
  CHIBI_CLASS_RECIPES,
} from "../../scripts/art/chibi/batch-manifest";
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
import {
  paletteReport,
  visibleBesideUnit,
} from "../../scripts/art/curiosities-review";
import { measureUnitFootprintV7 } from "../../scripts/art/unit-shadows/measure";

const ROOT = process.cwd();
const BATCH = "curiosities";

/** Subject and asset id, in the order of the manifest module. */
const EXPECTED: readonly (readonly [string, string])[] = [
  ["UNIT:MONSTER_GIANT_SPIDER", "chibi-curiosity-giant-spider"],
  ["PORTRAIT:MONSTER_GIANT_SPIDER", "chibi-curiosity-portrait-giant-spider"],
  ["CURIOSITY:WEB", "chibi-curiosity-web"],
  ["CURIOSITY:FOUNTAIN", "chibi-curiosity-fountain"],
  ["CURIOSITY:SHRINE", "chibi-curiosity-shrine"],
  ["CURIOSITY:WRECK", "chibi-curiosity-wreck"],
  ["ICON:CURIOSITY:WEB", "chibi-curiosity-icon-web"],
  ["ICON:CURIOSITY:FOUNTAIN", "chibi-curiosity-icon-fountain"],
  ["ICON:CURIOSITY:SHRINE", "chibi-curiosity-icon-shrine"],
  ["ICON:CURIOSITY:WRECK", "chibi-curiosity-icon-wreck"],
  ["ICON:CURIOSITY:BOUNTY", "chibi-curiosity-icon-bounty"],
  ["EFFECT:FOUNTAIN_HEAL", "chibi-curiosity-effect-fountain-heal"],
  ["EFFECT:SHRINE_BLESSING", "chibi-curiosity-effect-shrine-blessing"],
  ["EFFECT:SALVAGE_COINS", "chibi-curiosity-effect-salvage-coins"],
  ["STATUS:PROVOKED", "chibi-curiosity-status-provoked"],
];
/** Coins are gold, the colour of the HUD coin (curiosities.md section 1). */
const GOLD = new Set([
  "chibi-curiosity-icon-bounty",
  "chibi-curiosity-effect-salvage-coins",
]);
const CLASSES = [
  "curiosity-monster",
  "curiosity-portrait",
  "curiosity-site",
  "curiosity-item",
] as const;

const masterFile = (asset: { readonly url: string }): string =>
  path.join(ROOT, "public", asset.url.replace(/^.*?assets\//, "assets/"));
const unitFile = (name: string): string =>
  path.join(ROOT, "public/assets/chibi/units", `${name}.png`);

describe("map curiosity art (pulp_wars-737.5)", () => {
  const byId = new Map(
    CHIBI_CURIOSITIES_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("lists the Spider, its portrait, four overlays, five icons, three effects and the marker", () => {
    expect(
      CHIBI_CURIOSITIES_ART_ASSETS_V7.map((asset) => [asset.subject, asset.id]),
    ).toEqual(EXPECTED);
    const { problems } = buildChibiArtRegistryV7(
      CHIBI_CURIOSITIES_ART_ASSETS_V7,
    );
    expect(problems).toEqual([]);
  });

  it("is registered in the live look only (pulp_wars-737.6); the classic look draws code markers", () => {
    const live = chibiDirectionArtRegistryV7();
    const classic = new Set(CHIBI_ART_ASSETS_V7.map((asset) => asset.id));
    for (const asset of CHIBI_CURIOSITIES_ART_ASSETS_V7) {
      expect(
        live.variants(asset.subject).map((variant) => variant.id),
        asset.id,
      ).toEqual([asset.id]);
      expect(classic.has(asset.id), asset.id).toBe(false);
    }
    // The board's shadow is anchored from the Spider's own measurement.
    expect(UNIT_SHADOW_MEASUREMENTS_V7["UNIT:MONSTER_GIANT_SPIDER"]).toEqual(
      GIANT_SPIDER_SHADOW_MEASUREMENT_V7,
    );
  });

  it("has a valid batch whose classes send no faction and no owner layer", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, BATCH)).toEqual([]);
    for (const name of CLASSES) {
      expect(CHIBI_CLASS_RECIPES[name].factionLayer, name).toBe(false);
      expect(CHIBI_CLASS_RECIPES[name].derivation, name).toBe("as-is");
    }
    expect(manifest.assets.map((asset) => asset.recipeClass).sort()).toEqual(
      [...manifest.assets.map((asset) => asset.recipeClass)]
        .filter((name) => (CLASSES as readonly string[]).includes(name))
        .sort(),
    );
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const recipe of Object.values(records.recipes))
      for (const layer of recipe.request.layers)
        expect(["faction", "owner"], recipe.id).not.toContain(layer.layer);
  });

  it("registers every accepted asset exactly as its record says", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const accepted = Object.values(records.assets).filter(
      (record) => record.status === "ACCEPTED",
    );
    expect(accepted.map((record) => record.id).sort()).toEqual(
      EXPECTED.map(([, id]) => id).sort(),
    );
    for (const record of accepted) {
      const entry = byId.get(record.id);
      const asset = manifest.assets.find((spec) => spec.id === record.id);
      if (entry === undefined || asset === undefined)
        throw new Error(`${record.id}: not registered`);
      const line = registryEntry(asset, record);
      expect(line, record.id).toContain(`subject: "${entry.subject}"`);
      expect(line, record.id).toContain(`width: ${entry.width}`);
      expect(line, record.id).toContain(`height: ${entry.height}`);
      expect(line.includes("fixedColours: true"), record.id).toBe(
        entry.fixedColours === true,
      );
      expect(entry.ownerMaskUrl, record.id).toBeUndefined();
      expect(masterFile(entry), record.id).toBe(
        path.join(ROOT, record.master.path),
      );
      const master = await readRaster(masterFile(entry));
      expect([master.width, master.height], record.id).toEqual([
        entry.width,
        entry.height,
      ]);
      expect(
        await verifyAssetRecord(ROOT, manifest, record),
        record.id,
      ).toEqual([]);
    }
  });

  it("draws each tile overlay on exactly one cell", () => {
    for (const asset of CHIBI_CURIOSITIES_ART_ASSETS_V7) {
      if (!asset.subject.startsWith("CURIOSITY:")) continue;
      expect([asset.width, asset.height], asset.id).toEqual([80, 80]);
      expect(chibiAnchorV7(asset), asset.id).toEqual({ x: 40, y: 40 });
      expect(chibiOverflowV7(asset), asset.id).toEqual({
        left: 0,
        right: 0,
        up: 0,
        down: 0,
      });
    }
  });

  it("keeps the faction colours out of every piece but the gold coins", async () => {
    for (const asset of CHIBI_CURIOSITIES_ART_ASSETS_V7) {
      const report = paletteReport(await readRaster(masterFile(asset)));
      if (GOLD.has(asset.id)) {
        // Gold sits between the Goblin yellow and the Dinosaur orange only.
        for (const faction of [
          "ORIGINAL",
          "UNDEAD",
          "MARTIAN",
          "ICE_FOLK",
          "DWARF",
        ])
          expect(report.nearFaction[faction], asset.id).toBe(0);
        continue;
      }
      expect(report.nearestFaction.share, asset.id).toBeLessThanOrEqual(0.05);
    }
  });

  it("makes the Spider as wide as a giant and measures its ground contact", async () => {
    const spider = byId.get("chibi-curiosity-giant-spider");
    if (spider === undefined) throw new Error("no Spider");
    const raster = await readRaster(masterFile(spider));
    const bounds = opaqueBounds(raster);
    const human = opaqueBounds(
      await readRaster(unitFile("chibi-direction-juggernaut")),
    );
    const fighter = opaqueBounds(
      await readRaster(unitFile("chibi-direction-fighter")),
    );
    if (bounds === null || human === null || fighter === null)
      throw new Error("empty sprite");
    const width = (box: { left: number; right: number }): number =>
      box.right - box.left + 1;
    expect(width(bounds)).toBeGreaterThanOrEqual(width(human));
    expect(width(bounds)).toBeGreaterThan(width(fighter) * 1.4);
    const footprint = measureUnitFootprintV7(raster);
    expect(GIANT_SPIDER_SHADOW_MEASUREMENT_V7).toEqual({
      assetId: spider.id,
      assetClass: spider.assetClass,
      width: spider.width,
      height: spider.height,
      contactY: footprint.contactY,
      footLeft: footprint.footLeft,
      footRight: footprint.footRight,
      baseLeft: footprint.baseLeft,
      baseRight: footprint.baseRight,
    });
  });

  it("leaves the Fountain and the web readable under a unit", async () => {
    const raster = async (id: string) => {
      const asset = byId.get(id);
      if (asset === undefined) throw new Error(`no ${id}`);
      return readRaster(masterFile(asset));
    };
    const fighter = await readRaster(unitFile("chibi-direction-fighter"));
    const fountain = await raster("chibi-curiosity-fountain");
    const web = await raster("chibi-curiosity-web");
    const spider = await raster("chibi-curiosity-giant-spider");
    expect(visibleBesideUnit(fountain, fighter).share).toBeGreaterThanOrEqual(
      0.3,
    );
    expect(visibleBesideUnit(web, fighter).share).toBeGreaterThanOrEqual(0.3);
    expect(visibleBesideUnit(web, spider).share).toBeGreaterThanOrEqual(0.25);
  });
});
