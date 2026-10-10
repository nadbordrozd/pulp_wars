import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  type AchievementIdV7,
} from "../../src/engine/index";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiFallbackSubjectV7,
  chibiOverflowV7,
  monumentArtSubjectV7,
  type FactionMonumentArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { assetGroupOfSubjectV7 } from "../../src/assets/asset-inventory-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_FACTION_MONUMENT_ART_ASSETS_V7 } from "../../src/assets/chibi-faction-monuments-art-manifest";
import { CHIBI_MONUMENT_ART_ASSETS_V7 } from "../../src/assets/chibi-monuments-art-manifest";
import {
  commandSubjectV7,
  tileImprovementSubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { galleryBuildingSubjectV7 } from "../../src/render/gallery-presentation-v7";
import { extractOwnerMask } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import { opaqueBounds } from "../../scripts/art/chibi/raster";
import { lightVerdict, lightingOf } from "../../scripts/art/lighting-qa";

/**
 * Bead pulp_wars-eu3r.2 (the user, 2026-10-08): every achievement Monument
 * in every faction's style, plus one obelisk per faction for a viewer who
 * may not see the achievement. Today's seven Monuments are the Human ones.
 * The skin rule (bead pulp_wars-eu3r.3, tests/unit/ruleset-v7-monument-skin
 * .test.ts) asks for them in the builder's faction look.
 */

const ROOT = process.cwd();
const FACTIONS = [
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
  // Bead pulp_wars-mch9.16 (docs/art/factions/CULT.md, Monuments).
  "CULT",
] as const;
type Faction = (typeof FACTIONS)[number];

const slug = (value: string): string =>
  value.toLowerCase().replaceAll("_", "-");
const idOf = (faction: Faction, achievement: AchievementIdV7 | null): string =>
  `chibi-${slug(faction)}-monument${achievement === null ? "" : `-${slug(achievement)}`}`;
const subjectOf = (
  faction: Faction,
  achievement: AchievementIdV7 | null,
): FactionMonumentArtSubjectV7 =>
  achievement === null
    ? `IMPROVEMENT:MONUMENT:${faction}`
    : `IMPROVEMENT:MONUMENT:${faction}:${achievement}`;
const SLOTS = FACTIONS.flatMap((faction) =>
  [...ACHIEVEMENT_IDS_V7, null].map((achievement) => ({
    faction,
    achievement,
  })),
);

/**
 * Pieces whose faces measure reads a little negative though their stone is
 * lit from the left: the Dinosaur basalt is so dark that the measure counts
 * most of it as outline and weighs the pale shields, tusks and bones instead
 * (FACTION_BUILDINGS.md, "Faction Monuments", weak spots). Root-reviewed.
 */
const DARK_STONE_LIGHT_EXCEPTIONS: ReadonlySet<string> = new Set([
  "chibi-dinosaur-monument-muster",
  "chibi-dinosaur-monument-land-baron",
]);

describe("the faction Monuments", () => {
  it("are one batch per faction with the seven achievements and the obelisk", async () => {
    for (const faction of FACTIONS) {
      const batch = `monuments-${slug(faction)}`;
      const manifest = await loadBatchManifest(ROOT, batch);
      expect(manifest.faction, batch).toBe(faction);
      expect(manifest.assets.map((asset) => asset.id).sort(), batch).toEqual(
        [...ACHIEVEMENT_IDS_V7, null].map((a) => idOf(faction, a)).sort(),
      );
      for (const asset of manifest.assets) {
        expect(asset.recipeClass, asset.id).toBe("calm-feature");
        expect(asset.canvas, asset.id).toEqual({ width: 48, height: 72 });
        expect(asset.ownerColour, asset.id).toBe(false);
      }
    }
  });

  it("register every accepted master as recorded, and only accepted ones", async () => {
    const registered = new Map(
      CHIBI_FACTION_MONUMENT_ART_ASSETS_V7.map((entry) => [entry.id, entry]),
    );
    expect(registered.size).toBe(CHIBI_FACTION_MONUMENT_ART_ASSETS_V7.length);
    for (const faction of FACTIONS) {
      const batch = `monuments-${slug(faction)}`;
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      for (const asset of manifest.assets) {
        const record = records.assets[asset.id];
        const entry = registered.get(asset.id);
        if (record?.status !== "ACCEPTED") {
          expect(entry, `${asset.id} is registered but not accepted`).toBe(
            undefined,
          );
          continue;
        }
        if (entry === undefined) throw new Error(`${asset.id}: not registered`);
        expect(await verifyAssetRecord(ROOT, manifest, record)).toEqual([]);
        expect(record.derivation.kind, asset.id).toBe("seated");
        expect(record.mask, asset.id).toBeUndefined();
        expect(entry.subject, asset.id).toBe(asset.subject);
        expect(entry.ownerMaskUrl, asset.id).toBeUndefined();
        expect(chibiAssetProblemsV7(entry), asset.id).toEqual([]);
        expect(chibiAnchorV7(entry), asset.id).toEqual(record.anchor);
        const line = registryEntry(asset, record);
        expect(line).toContain(`id: ${JSON.stringify(entry.id)}`);
        expect(line).toContain(`subject: ${JSON.stringify(entry.subject)}`);
        const request = records.recipes[record.recipe]?.request;
        expect(request?.endpoint, asset.id).toBe("generate-image-v2");
        // The two redone recipes add a one-line recipe addendum, the
        // Dinosaur obelisk-b a negative one.
        expect(
          request?.layers
            .map((layer) => layer.layer)
            .filter((layer) => layer !== "recipe"),
          asset.id,
        ).toEqual(["style", "camera", "light", "class", "subject"]);
        registered.delete(asset.id);
      }
    }
    // Nothing registered outside the eight batches.
    expect([...registered.keys()]).toEqual([]);
  });

  it("take five obelisks from Explorer sheets and give the Dinosaur and Martian ones their own", async () => {
    // The US$5 limit stopped generation after 52 calls; five obelisks are
    // reviewed compass-free pieces of their faction's Explorer sheet
    // (fromRecipe). Bead pulp_wars-eu3r.10 generated the Martian obelisk
    // (obelisk-a) and replaced the Dinosaur one, whose tusks and spiral read
    // as an angry face, with obelisk-b (FACTION_BUILDINGS.md, section 15).
    const own = new Map<Faction, { recipe: string; candidate: number }>([
      ["DINOSAUR", { recipe: "obelisk-b", candidate: 5 }],
      ["MARTIAN", { recipe: "obelisk-a", candidate: 12 }],
      // The Cult obelisk has its own call (bead pulp_wars-mch9.16).
      ["CULT", { recipe: "obelisk-a", candidate: 13 }],
    ]);
    const reused = new Map<Faction, number>([
      ["UNDEAD", 13],
      ["GOBLIN", 14],
      ["ICE_FOLK", 9],
      ["DWARF", 2],
      ["CANDY", 2],
    ]);
    for (const faction of FACTIONS) {
      const batch = `monuments-${slug(faction)}`;
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      const obelisk = manifest.assets.find(
        (asset) => asset.id === idOf(faction, null),
      );
      if (obelisk === undefined) throw new Error(`${batch}: no obelisk`);
      // Every obelisk keeps its own recipe for a later generation.
      expect(
        manifest.recipes.some(
          (recipe) => recipe.id === "obelisk-a" && recipe.asset === obelisk.id,
        ),
        batch,
      ).toBe(true);
      const record = records.assets[obelisk.id];
      const candidate = reused.get(faction);
      if (candidate !== undefined) {
        expect(obelisk.fromRecipe, batch).toBe("explorer-a");
        expect(record?.status, batch).toBe("ACCEPTED");
        expect(record?.recipe, batch).toBe("explorer-a");
        expect(record?.candidate, batch).toBe(candidate);
        expect(records.recipes["obelisk-a"], batch).toBeUndefined();
        // The Explorer keeps its own verdict on the shared sheet.
        const explorer = records.assets[idOf(faction, "EXPLORER")];
        expect(explorer?.recipe, batch).toBe("explorer-a");
        expect(explorer?.candidate, batch).not.toBe(candidate);
        expect(records.recipes["explorer-a"]?.review?.candidate, batch).toBe(
          explorer?.candidate,
        );
      } else {
        const expected = own.get(faction);
        if (expected === undefined) throw new Error(`${batch}: no obelisk`);
        expect(obelisk.fromRecipe, batch).toBeUndefined();
        expect(record?.status, batch).toBe("ACCEPTED");
        expect(record?.recipe, batch).toBe(expected.recipe);
        expect(record?.candidate, batch).toBe(expected.candidate);
        expect(records.recipes[expected.recipe]?.review?.candidate, batch).toBe(
          expected.candidate,
        );
      }
    }
    // The Dinosaur obelisk-a sheet stays as history, rejected.
    const dinosaur = await loadRecords(
      productionLayout(ROOT, "monuments-dinosaur"),
      "monuments-dinosaur",
    );
    expect(dinosaur.recipes["obelisk-a"]?.review?.verdict).toBe("REJECTED");
    expect(CHIBI_FACTION_MONUMENT_ART_ASSETS_V7).toHaveLength(64);
  });

  it("stand on the shared Monument's footprint, in no owner colour, each one different", async () => {
    const shared = CHIBI_DIRECTION_ART_ASSETS_V7.find(
      (entry) => entry.subject === "IMPROVEMENT:MONUMENT",
    );
    if (shared === undefined) throw new Error("no shared Monument");
    const hashes = new Set<string>();
    for (const entry of [
      ...CHIBI_MONUMENT_ART_ASSETS_V7,
      ...CHIBI_FACTION_MONUMENT_ART_ASSETS_V7,
    ]) {
      const master = await readRaster(
        path.join(ROOT, "public", entry.url.replace(/^.*?assets\//, "assets/")),
      );
      hashes.add(Buffer.from(master.data).toString("base64"));
      if (!CHIBI_FACTION_MONUMENT_ART_ASSETS_V7.includes(entry)) continue;
      expect([entry.width, entry.height], entry.id).toEqual([48, 72]);
      expect([master.width, master.height], entry.id).toEqual([48, 72]);
      expect(chibiAnchorV7(entry), entry.id).toEqual(chibiAnchorV7(shared));
      expect(chibiOverflowV7(entry), entry.id).toEqual(chibiOverflowV7(shared));
      const box = opaqueBounds(master);
      if (box === null) throw new Error(`${entry.id}: empty`);
      // Seated 3 px above the bottom edge (less only for a piece that
      // fills the canvas), at least 56 px tall, inside the canvas.
      expect(box.bottom, entry.id).toBeGreaterThanOrEqual(68);
      expect(box.bottom - box.top + 1, entry.id).toBeGreaterThanOrEqual(56);
      expect(box.left, entry.id).toBeGreaterThanOrEqual(1);
      expect(box.right, entry.id).toBeLessThanOrEqual(46);
      const light = lightVerdict(lightingOf(master));
      if (!DARK_STONE_LIGHT_EXCEPTIONS.has(entry.id))
        expect(light, `${entry.id}: lit from the right`).not.toBe("RIGHT");
      expect(
        extractOwnerMask(master).mask.bits.reduce((sum, bit) => sum + bit, 0),
        `${entry.id}: key-colour pixels`,
      ).toBe(0);
    }
    expect(hashes.size).toBe(
      CHIBI_MONUMENT_ART_ASSETS_V7.length +
        CHIBI_FACTION_MONUMENT_ART_ASSETS_V7.length,
    );
  });

  it("are registered in the live look and asked for in the builder's look", () => {
    const live = chibiDirectionArtRegistryV7();
    for (const { faction, achievement } of SLOTS) {
      const subject = subjectOf(faction, achievement);
      const entry = CHIBI_FACTION_MONUMENT_ART_ASSETS_V7.find(
        (asset) => asset.subject === subject,
      );
      expect(live.variants(subject), subject).toEqual(
        entry === undefined ? [] : [entry],
      );
      // Without a raster (the Classic look, a missing obelisk) it is the
      // shared Monument; the preload fetches it with its faction's art.
      expect(chibiFallbackSubjectV7(subject)).toBe("IMPROVEMENT:MONUMENT");
      expect(assetGroupOfSubjectV7(subject)).toBe(faction);
    }
    // The skin rule (bead pulp_wars-eu3r.3): the board, the dock and the
    // build button ask for the builder's faction look (the territory
    // owner's faction is ignored for a Monument); the Gallery still shows
    // the achievement's (Human) look or the shared one, whatever the faction.
    for (const faction of FACTIONS) {
      expect(
        tileImprovementSubjectV7(
          { populationContributions: [] },
          { x: 1, y: 1 },
          "MONUMENT",
          faction,
        ),
      ).toBe("IMPROVEMENT:MONUMENT");
      expect(galleryBuildingSubjectV7("MONUMENT", faction)).toBe(
        "IMPROVEMENT:MONUMENT",
      );
      expect(monumentArtSubjectV7(null, faction)).toBe(
        subjectOf(faction, null),
      );
      for (const achievement of ACHIEVEMENT_IDS_V7) {
        expect(monumentArtSubjectV7(achievement)).toBe(
          `IMPROVEMENT:MONUMENT:${achievement}`,
        );
        expect(monumentArtSubjectV7(achievement, faction)).toBe(
          subjectOf(faction, achievement),
        );
        expect(
          commandSubjectV7(
            { kind: "BUILD_MONUMENT", achievement, at: { x: 1, y: 1 } },
            faction,
          ),
        ).toBe(subjectOf(faction, achievement));
        expect(
          galleryBuildingSubjectV7(`MONUMENT_${achievement}`, faction),
        ).toBe(`IMPROVEMENT:MONUMENT:${achievement}`);
      }
    }
    expect(
      buildChibiArtRegistryV7(CHIBI_FACTION_MONUMENT_ART_ASSETS_V7).problems,
    ).toEqual([]);
  });
});
