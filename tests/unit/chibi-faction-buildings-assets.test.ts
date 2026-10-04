import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACTION_IMPROVEMENT_LOOKS_V7,
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiOverflowV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_FACTION_BUILDING_ART_ASSETS_V7,
  CHIBI_UNDEAD_GROUND_ART_ASSETS_V7,
} from "../../src/assets/chibi-faction-buildings-art-manifest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { extractOwnerMask } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import {
  GLOAM_GRASS_RECORD,
  GLOAM_MASTERS,
  deriveGloamGrass,
  gloamGrassProblems,
  type GloamGrassRecord,
} from "../../scripts/art/faction-buildings/gloam-grass";

/**
 * The production art of the faction building looks (bead pulp_wars-xdh.2,
 * docs/art/FACTION_BUILDINGS.md): the batches `buildings-<faction>` and the
 * Undead territory ground.
 */

const ROOT = process.cwd();
const BATCHES = {
  UNDEAD: "buildings-undead",
  MARTIAN: "buildings-martian",
  DINOSAUR: "buildings-dinosaur",
  ICE_FOLK: "buildings-ice-folk",
  DWARF: "buildings-dwarf",
} as const;

describe("faction building batches", () => {
  it("registers exactly the accepted masters of the five batches", async () => {
    const byId = new Map(
      CHIBI_FACTION_BUILDING_ART_ASSETS_V7.map((entry) => [entry.id, entry]),
    );
    const seen = new Set<string>();
    for (const [faction, batch] of Object.entries(BATCHES)) {
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      expect(manifest.faction, batch).toBe(faction);
      const accepted = Object.values(records.assets).filter(
        (record) => record.status === "ACCEPTED",
      );
      expect(accepted.map((record) => record.id).sort(), batch).toEqual(
        manifest.assets.map((asset) => asset.id).sort(),
      );
      for (const record of accepted) {
        const asset = manifest.assets.find((spec) => spec.id === record.id);
        const entry = byId.get(record.id);
        if (asset === undefined || entry === undefined)
          throw new Error(`${record.id}: not registered`);
        seen.add(record.id);
        expect(await verifyAssetRecord(ROOT, manifest, record)).toEqual([]);
        expect(entry.subject, entry.id).toBe(asset.subject);
        expect(entry.subject.startsWith(`IMPROVEMENT:${faction}:`)).toBe(true);
        expect(entry.assetClass, entry.id).toBe("BUILDING");
        expect(
          entry.url.endsWith(record.master.path.replace(/^public\//, "")),
          entry.id,
        ).toBe(true);
        expect([entry.width, entry.height], entry.id).toEqual([
          record.master.width,
          record.master.height,
        ]);
        expect(chibiAnchorV7(entry), entry.id).toEqual(record.anchor);
        // No owner colour: no mask, nothing the runtime could recolour.
        expect(record.mask, entry.id).toBeUndefined();
        expect(entry.ownerMaskUrl, entry.id).toBeUndefined();
        const line = registryEntry(asset, record);
        expect(line).toContain(`id: ${JSON.stringify(entry.id)}`);
        expect(line).toContain(`subject: ${JSON.stringify(entry.subject)}`);
        expect(line).not.toContain("ownerMaskUrl");
        const master = await readRaster(path.join(ROOT, record.master.path));
        expect([master.width, master.height], entry.id).toEqual([
          entry.width,
          entry.height,
        ]);
        expect(
          extractOwnerMask(master).mask.bits.reduce((sum, bit) => sum + bit, 0),
          `${entry.id}: key-colour pixels`,
        ).toBe(0);
      }
    }
    expect([...seen].sort()).toEqual([...byId.keys()].sort());
  });

  it("covers every look of FACTION_IMPROVEMENT_LOOKS_V7 on the shared building's footprint", () => {
    const shared = buildChibiArtRegistryV7(
      CHIBI_DIRECTION_ART_ASSETS_V7,
    ).registry;
    const subjects = CHIBI_FACTION_BUILDING_ART_ASSETS_V7.map(
      (entry) => entry.subject,
    ).sort();
    expect(subjects).toEqual(
      Object.entries(FACTION_IMPROVEMENT_LOOKS_V7)
        .flatMap(([faction, improvements]) =>
          improvements.map(
            (improvement) => `IMPROVEMENT:${faction}:${improvement}`,
          ),
        )
        .sort(),
    );
    for (const entry of CHIBI_FACTION_BUILDING_ART_ASSETS_V7) {
      expect(chibiAssetProblemsV7(entry), entry.id).toEqual([]);
      const improvement = entry.subject.split(":")[2];
      const today = shared.variants(`IMPROVEMENT:${improvement}` as never)[0];
      if (today === undefined) throw new Error(`${entry.subject}: no shared`);
      // Same role, same placement: inside its own cell like the shared one.
      expect(chibiOverflowV7(entry), entry.id).toEqual(chibiOverflowV7(today));
      expect(entry.width, entry.id).toBeLessThanOrEqual(80);
      expect(entry.height, entry.id).toBeLessThanOrEqual(80);
      // A Farm replacement is a seamless 80 x 80 field like the Farm.
      if (improvement === "FARM")
        expect([entry.width, entry.height], entry.id).toEqual([
          today.width,
          today.height,
        ]);
    }
    // All of it resolves through the live direction registry, and none of
    // it is in the classic registry.
    const live = chibiDirectionArtRegistryV7();
    for (const entry of [
      ...CHIBI_FACTION_BUILDING_ART_ASSETS_V7,
      ...CHIBI_UNDEAD_GROUND_ART_ASSETS_V7,
    ]) {
      expect(live.variants(entry.subject).map((item) => item.id)).toContain(
        entry.id,
      );
      expect(
        CHIBI_ART_ASSETS_V7.some((item) => item.subject === entry.subject),
        entry.id,
      ).toBe(false);
    }
  });

  it("keeps the redone Bone Mill's tower, roofs and sails apart", async () => {
    const records = await loadRecords(
      productionLayout(ROOT, BATCHES.UNDEAD),
      BATCHES.UNDEAD,
    );
    expect(records.assets["chibi-undead-bone-mill"]?.recipe).toBe(
      "bone-mill-edit-d",
    );
    expect(records.recipes["bone-mill-edit-b"]?.review?.verdict).toBe(
      "REJECTED",
    );
    const mill = await readRaster(
      path.join(
        ROOT,
        "public/assets/chibi/buildings/chibi-undead-bone-mill.png",
      ),
    );
    // Three tones: near-black roofs, mid-grey sails, a light slate tower.
    let dark = 0;
    let mid = 0;
    let light = 0;
    for (let offset = 0; offset < mill.data.length; offset += 4) {
      if ((mill.data[offset + 3] ?? 0) < 128) continue;
      const r = mill.data[offset] ?? 0;
      const g = mill.data[offset + 1] ?? 0;
      const b = mill.data[offset + 2] ?? 0;
      // Greys and slate blues only (not the wood or the violet windows).
      if (Math.max(r, g, b) - Math.min(r, g, b) > 40) continue;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma < 55) dark += 1;
      else if (luma < 115) mid += 1;
      else light += 1;
    }
    expect(dark).toBeGreaterThan(100);
    expect(mid).toBeGreaterThan(100);
    expect(light).toBeGreaterThan(100);
  });
});

describe("the Undead territory ground masters", () => {
  it("are the gloam recolour of the Grass masters, pixel for pixel", async () => {
    expect(await gloamGrassProblems(ROOT)).toEqual([]);
    const recorded = JSON.parse(
      await readFile(path.join(ROOT, GLOAM_GRASS_RECORD), "utf8"),
    ) as GloamGrassRecord;
    expect(recorded.variant).toBe("gloam");
    expect(recorded.colours["#8ab85c"]).toBe("#749b76");
    expect(recorded.masters.map((master) => master.id)).toEqual(
      GLOAM_MASTERS.map((master) => master.id),
    );
    expect(recorded.masters.map((master) => master.id)).toEqual(
      CHIBI_UNDEAD_GROUND_ART_ASSETS_V7.map((entry) => entry.id),
    );
    const derived = await deriveGloamGrass(ROOT);
    for (const master of recorded.masters) {
      const entry = CHIBI_UNDEAD_GROUND_ART_ASSETS_V7.find(
        (item) => item.id === master.id,
      );
      if (entry === undefined) throw new Error(master.id);
      expect(chibiAssetProblemsV7(entry), entry.id).toEqual([]);
      expect([entry.width, entry.height], entry.id).toEqual([
        master.width,
        master.height,
      ]);
      expect(entry.url.endsWith(master.path.replace(/^public\//, ""))).toBe(
        true,
      );
      expect(derived.files.has(master.path)).toBe(true);
    }
  });

  it("keeps the texture of each Grass tile: only the four colours change", async () => {
    for (const index of [1, 2, 3]) {
      const before = await readRaster(
        path.join(ROOT, `public/assets/chibi/terrain/chibi-grass-${index}.png`),
      );
      const after = await readRaster(
        path.join(
          ROOT,
          `public/assets/chibi/terrain/chibi-undead-grass-${index}.png`,
        ),
      );
      expect([after.width, after.height]).toEqual([80, 80]);
      const map = new Map<string, string>();
      for (let offset = 0; offset < before.data.length; offset += 4) {
        const key = (data: Uint8Array) =>
          `${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`;
        const from = key(before.data);
        const to = key(after.data);
        // One colour in, one colour out, everywhere: the same tufts.
        expect(map.get(from) ?? to).toBe(to);
        map.set(from, to);
      }
      expect(map.size).toBeLessThanOrEqual(5);
      expect(new Set(map.values()).size).toBe(map.size);
    }
  });
});
