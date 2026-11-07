import path from "node:path";
import { describe, expect, it } from "vitest";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
  ICE_FOLK_RETIRED_ART_IDS_V7,
} from "../../src/assets/chibi-direction-ice-folk-art-manifest";
import { ICE_FOLK_FLYER_PRESENTATION_V7 } from "../../src/assets/chibi-direction-ice-folk-presentation";
import { accentRaster, ACCENT_PRESETS } from "../../scripts/art/chibi/accent";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import { extractOwnerMask } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import {
  candidateCell,
  cropRaster,
  opaqueBounds,
  seatedRaster,
} from "../../scripts/art/chibi/raster";

/**
 * The Ice Folk rework art (bead pulp_wars-s55m.3, batch
 * `direction-ice-folk-rework`, docs/art/factions/ICE_FOLK.md "The rework
 * units"): the Frost Wyrm, the Walrus and the Snow Golem and their
 * portraits, replacing the Sabretooth, the Musk Ox and the Boulder Yeti
 * in their art slots. The roster bead (pulp_wars-s55m.4) registers them in
 * the live list and retires the old three from runtime use.
 */
const ROOT = process.cwd();
const BATCH = "direction-ice-folk-rework";
const SPEC = ACCENT_PRESETS["ice-folk-blue"];

/** Art slot, new unit, and the unit whose art it replaces. */
const UNITS = [
  ["KNIGHT", "frost-wyrm", "sabretooth"],
  ["SWORDSMAN", "walrus", "musk-ox"],
  ["CATAPULT", "snow-golem", "boulder-yeti"],
] as const;

const expectedAssets = (): [string, string][] =>
  UNITS.flatMap(([slot, name]) => [
    [`chibi-direction-ice-folk-${name}`, `UNIT:ICE_FOLK:${slot}`],
    [`chibi-direction-portrait-ice-folk-${name}`, `PORTRAIT:ICE_FOLK:${slot}`],
  ]);

describe("Ice Folk rework art (pulp_wars-s55m.3)", () => {
  it("is a valid fixed-colour Ice Folk batch with the three units and their portraits, all accepted", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    expect(
      batchManifestProblems(manifest, await loadFragments(ROOT), BATCH),
    ).toEqual([]);
    expect(manifest.faction).toBe("ICE_FOLK");
    expect(manifest.fixedFactionColours).toBe(true);
    const pairs = (list: [string, string][]): string[] =>
      list.map(([id, subject]) => `${id} ${subject}`).sort();
    expect(
      pairs(manifest.assets.map((asset) => [asset.id, asset.subject])),
    ).toEqual(pairs(expectedAssets()));
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    expect(
      pairs(
        Object.values(records.assets).map((record) => [
          record.id,
          record.subject,
        ]),
      ),
    ).toEqual(pairs(expectedAssets()));
    for (const record of Object.values(records.assets))
      expect(record.status, record.id).toBe("ACCEPTED");
  });

  it("matches its records, the canvas and anchor of the art it replaces, with no mask and no key-colour pixel", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    // The art it replaces, as its own batch (`direction-ice-folk`) keeps it.
    const replacedBatch = await loadBatchManifest(ROOT, "direction-ice-folk");
    const old = new Map(
      replacedBatch.assets.map((asset) => [
        asset.id,
        {
          subject: asset.subject,
          width: asset.canvas.width,
          height: asset.canvas.height,
          assetClass: asset.assetClass,
        },
      ]),
    );
    for (const [, name, replaced] of UNITS)
      for (const prefix of [
        "chibi-direction-ice-folk-",
        "chibi-direction-portrait-ice-folk-",
      ]) {
        const id = `${prefix}${name}`;
        const record = records.assets[id];
        const asset = manifest.assets.find((spec) => spec.id === id);
        const before = old.get(`${prefix}${replaced}`);
        if (record === undefined || asset === undefined || before === undefined)
          throw new Error(`${id}: missing`);
        expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
        expect(record.mask, id).toBeUndefined();
        expect(asset.ownerColour, id).toBe(false);
        expect(record.subject, id).toBe(before.subject);
        expect([asset.canvas.width, asset.canvas.height], id).toEqual([
          before.width,
          before.height,
        ]);
        expect(asset.assetClass, id).toBe(before.assetClass);
        const line = registryEntry(asset, record);
        expect(line, id).toContain("fixedColours: true");
        expect(line, id).not.toContain("ownerMaskUrl");
        const master = await readRaster(path.join(ROOT, record.master.path));
        expect([master.width, master.height], id).toEqual([
          before.width,
          before.height,
        ]);
        const mask = extractOwnerMask(master).mask;
        expect(
          mask.bits.reduce((sum, bit) => sum + bit, 0),
          `${id}: key-colour pixels`,
        ).toBe(0);
      }
  });

  it("re-derives every master from its recorded candidate through the ice-folk-blue accent step", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const record of Object.values(records.assets)) {
      const asset = manifest.assets.find((spec) => spec.id === record.id);
      const recipe = records.recipes[record.recipe];
      if (
        asset === undefined ||
        recipe?.rawSheet === undefined ||
        recipe.candidateSize === undefined
      )
        throw new Error(`${record.id}: no candidate`);
      expect(asset.accent, record.id).toBe("ice-folk-blue");
      expect(record.derivation.accent?.spec, record.id).toEqual(SPEC);
      const candidate = cropRaster(
        await readRaster(path.join(ROOT, recipe.rawSheet)),
        {
          ...candidateCell(
            record.candidate,
            recipe.candidateCount ?? 1,
            recipe.candidateSize,
          ),
          ...recipe.candidateSize,
        },
      );
      const base =
        record.derivation.kind === "seated"
          ? seatedRaster(
              candidate,
              asset.canvas,
              record.derivation.seat?.bottomMargin ?? 3,
            )
          : candidate;
      const derived = accentRaster(base, SPEC);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(
        Buffer.from(Uint8Array.from(derived.raster.data)).equals(
          Buffer.from(Uint8Array.from(master.data)),
        ),
        record.id,
      ).toBe(true);
      // Every piece carries the ice, and none is mostly ice.
      if (record.subject.startsWith("UNIT:"))
        expect(derived.accentPixels, record.id).toBeGreaterThanOrEqual(15);
      expect(derived.accentPixels, record.id).toBeGreaterThan(0);
      expect(
        derived.accentPixels / derived.opaquePixels,
        record.id,
      ).toBeLessThan(0.3);
    }
  });

  it("draws the Frost Wyrm airborne: a flyer's gap under it, like the Saucer, the Mothership and the Gyrocopter", async () => {
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const record = records.assets["chibi-direction-ice-folk-frost-wyrm"];
    if (record === undefined) throw new Error("no Frost Wyrm");
    expect(record.derivation.kind).toBe("seated");
    expect(record.derivation.seat?.bottomMargin).toBe(18);
    const box = opaqueBounds(
      await readRaster(path.join(ROOT, record.master.path)),
    );
    // A walker of the 88 px canvas stands on row 81 to 84; the flyers end
    // on row 69 to 71.
    expect(box?.bottom).toBe(69);
    // The walkers end low in their canvases.
    for (const id of [
      "chibi-direction-ice-folk-walrus",
      "chibi-direction-ice-folk-snow-golem",
    ]) {
      const walker = records.assets[id];
      if (walker === undefined) throw new Error(id);
      const raster = await readRaster(path.join(ROOT, walker.master.path));
      expect(opaqueBounds(raster)?.bottom, id).toBeGreaterThanOrEqual(
        raster.height - 12,
      );
    }
  });

  // Turned round by the roster bead (pulp_wars-s55m.4): the new art is in
  // the live list, exactly as the registry lines print it, and the old
  // three are retired from runtime use.
  it("is wired into the game: the live registry draws the new three, and the old three are retired", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    const live = chibiDirectionArtRegistryV7();
    for (const [slot, name, replaced] of UNITS) {
      expect(
        live.variants(`UNIT:ICE_FOLK:${slot}`).map((asset) => asset.id),
      ).toEqual([`chibi-direction-ice-folk-${name}`]);
      expect(
        live.variants(`PORTRAIT:ICE_FOLK:${slot}`).map((asset) => asset.id),
      ).toEqual([`chibi-direction-portrait-ice-folk-${name}`]);
      for (const prefix of [
        "chibi-direction-ice-folk-",
        "chibi-direction-portrait-ice-folk-",
      ]) {
        const id = `${prefix}${name}`;
        const entry = CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7.find(
          (asset) => asset.id === id,
        );
        const asset = manifest.assets.find((spec) => spec.id === id);
        const record = records.assets[id];
        if (entry === undefined || asset === undefined || record === undefined)
          throw new Error(`${id}: not live`);
        const line = registryEntry(asset, record);
        expect(line, id).toContain(`id: "${entry.id}"`);
        expect(line, id).toContain(`subject: "${entry.subject}"`);
        expect(line, id).toContain(`assetClass: "${entry.assetClass}"`);
        expect(line, id).toContain(`width: ${String(entry.width)}`);
        expect(line, id).toContain(`height: ${String(entry.height)}`);
        expect(entry.fixedColours, id).toBe(true);
        expect(
          entry.url.endsWith(record.master.path.replace(/^public\//, "")),
          id,
        ).toBe(true);
        const retired = `${prefix}${replaced}`;
        expect(ICE_FOLK_RETIRED_ART_IDS_V7, retired).toContain(retired);
        expect(
          CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7.some(
            (other) => other.id === retired,
          ),
          retired,
        ).toBe(false);
      }
    }
    // The Frost Wyrm flies: its presentation is the Gyrocopter's shape,
    // on the sprite's own lowest row.
    expect(
      ICE_FOLK_FLYER_PRESENTATION_V7["chibi-direction-ice-folk-frost-wyrm"],
    ).toEqual({
      hullBottom: 69,
      groundLine: 82,
      shadow: { x: 36, y: 81, radiusX: 18, radiusY: 4 },
    });
  });
});
