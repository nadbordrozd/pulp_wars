import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  viewForV7,
  type AchievementIdV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiFallbackSubjectV7,
  chibiOverflowV7,
  monumentArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_MONUMENT_ART_ASSETS_V7 } from "../../src/assets/chibi-monuments-art-manifest";
import {
  commandSubjectV7,
  tileImprovementSubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  GALLERY_BUILDING_ROWS_V7,
  galleryBuildingDetailsV7,
  galleryBuildingNameV7,
  galleryBuildingPerFactionV7,
  galleryBuildingSubjectV7,
  galleryMonumentAchievementV7,
} from "../../src/render/gallery-presentation-v7";
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
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.15 (the user, 2026-10-06): "generate a separate
 * monument sprite for each achievement" and "regenerate the fertile ground
 * sprite. right now it's a bunch of wheat stalks. make it look like actually
 * the ground." The batch `monuments`, the Fertile Ground of batch 3, and the
 * wiring that shows a Monument in its achievement's look.
 */

const ROOT = process.cwd();
const BATCH = "monuments";

const slug = (achievement: AchievementIdV7): string =>
  achievement.toLowerCase().replaceAll("_", "-");

describe("the achievement Monuments", () => {
  it("are one accepted master per achievement, registered as recorded", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    expect(manifest.assets.map((asset) => asset.subject).sort()).toEqual(
      ACHIEVEMENT_IDS_V7.map(
        (achievement) => `IMPROVEMENT:MONUMENT:${achievement}`,
      ).sort(),
    );
    expect(CHIBI_MONUMENT_ART_ASSETS_V7.map((entry) => entry.id)).toEqual(
      ACHIEVEMENT_IDS_V7.map(
        (achievement) => `chibi-monument-${slug(achievement)}`,
      ),
    );
    for (const entry of CHIBI_MONUMENT_ART_ASSETS_V7) {
      const asset = manifest.assets.find((spec) => spec.id === entry.id);
      const record = records.assets[entry.id];
      if (asset === undefined || record === undefined)
        throw new Error(`${entry.id}: not in the batch`);
      expect(record.status, entry.id).toBe("ACCEPTED");
      expect(await verifyAssetRecord(ROOT, manifest, record)).toEqual([]);
      expect(asset.recipeClass, entry.id).toBe("calm-feature");
      expect(record.derivation.kind, entry.id).toBe("seated");
      expect(entry.subject, entry.id).toBe(asset.subject);
      expect(entry.assetClass, entry.id).toBe("BUILDING");
      expect(chibiAssetProblemsV7(entry), entry.id).toEqual([]);
      expect(chibiAnchorV7(entry), entry.id).toEqual(record.anchor);
      expect(record.mask, entry.id).toBeUndefined();
      expect(entry.ownerMaskUrl, entry.id).toBeUndefined();
      const line = registryEntry(asset, record);
      expect(line).toContain(`id: ${JSON.stringify(entry.id)}`);
      expect(line).toContain(`subject: ${JSON.stringify(entry.subject)}`);
      // Generated with the light stated, by the free-standing generator.
      const request = records.recipes[record.recipe]?.request;
      expect(request?.endpoint, entry.id).toBe("generate-image-v2");
      expect(
        request?.layers.map((layer) => layer.layer),
        entry.id,
      ).toEqual(["style", "camera", "light", "class", "subject"]);
    }
  });

  it("stand on the shared Monument's footprint, lit from the bottom left, in no owner colour", async () => {
    const shared = CHIBI_DIRECTION_ART_ASSETS_V7.find(
      (entry) => entry.subject === "IMPROVEMENT:MONUMENT",
    );
    if (shared === undefined) throw new Error("no shared Monument");
    const hashes = new Set<string>();
    for (const entry of CHIBI_MONUMENT_ART_ASSETS_V7) {
      expect([entry.width, entry.height], entry.id).toEqual([
        shared.width,
        shared.height,
      ]);
      expect(chibiAnchorV7(entry), entry.id).toEqual(chibiAnchorV7(shared));
      expect(chibiOverflowV7(entry), entry.id).toEqual(chibiOverflowV7(shared));
      const master = await readRaster(
        path.join(ROOT, "public", entry.url.replace(/^.*?assets\//, "assets/")),
      );
      expect([master.width, master.height], entry.id).toEqual([48, 72]);
      const box = opaqueBounds(master);
      if (box === null) throw new Error(`${entry.id}: empty`);
      // A tall piece seated like the shared Monument: 3 px above the
      // bottom edge (2 for the 70 px Slayer, which fills the canvas), at
      // least 60 px tall, inside the canvas.
      expect(box.bottom, entry.id).toBe(entry.id.endsWith("slayer") ? 69 : 68);
      expect(box.bottom - box.top + 1, entry.id).toBeGreaterThanOrEqual(60);
      expect(box.left, entry.id).toBeGreaterThanOrEqual(1);
      expect(box.right, entry.id).toBeLessThanOrEqual(46);
      expect(lightVerdict(lightingOf(master)), entry.id).toBe("LEFT");
      expect(
        extractOwnerMask(master).mask.bits.reduce((sum, bit) => sum + bit, 0),
        `${entry.id}: key-colour pixels`,
      ).toBe(0);
      hashes.add(Buffer.from(master.data).toString("base64"));
    }
    // Seven different sprites.
    expect(hashes.size).toBe(ACHIEVEMENT_IDS_V7.length);
  });

  it("resolve in the live look and fall back to the shared Monument elsewhere", () => {
    const live = chibiDirectionArtRegistryV7();
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      const subject = monumentArtSubjectV7(achievement);
      expect(subject).toBe(`IMPROVEMENT:MONUMENT:${achievement}`);
      expect(live.variants(subject).map((entry) => entry.id)).toEqual([
        `chibi-monument-${slug(achievement)}`,
      ]);
      expect(chibiFallbackSubjectV7(subject)).toBe("IMPROVEMENT:MONUMENT");
      expect(
        CHIBI_ART_ASSETS_V7.some((entry) => entry.subject === subject),
      ).toBe(false);
    }
    expect(monumentArtSubjectV7(null)).toBe("IMPROVEMENT:MONUMENT");
    expect(live.variants("IMPROVEMENT:MONUMENT")).toHaveLength(1);
  });
});

describe("a Monument on the board", () => {
  type Tile = PlayerViewV7["board"]["tiles"][number];

  /** A view with one Monument of `achievement`, seen as its owner or not. */
  function monumentView(
    achievement: AchievementIdV7,
    visibility: "FULL" | "BUILDING_ONLY",
  ): { readonly view: PlayerViewV7; readonly at: Tile["at"] } {
    const state = exploredAllV7(initialV7(1516));
    const live = viewForV7(state, state.humanPlayerId);
    const city = live.cities[0];
    if (city === undefined) throw new Error("no city");
    const target = live.board.tiles.find(
      (tile) =>
        tile.explored &&
        tile.terrain === "GRASS" &&
        tile.improvement === null &&
        tile.site === null &&
        !live.cities.some(
          (other) => other.at.x === tile.at.x && other.at.y === tile.at.y,
        ),
    );
    if (target === undefined) throw new Error("no grass");
    const at = target.at;
    return {
      at,
      view: {
        ...live,
        board: {
          ...live.board,
          tiles: live.board.tiles.map((tile): Tile =>
            tile === target && tile.explored
              ? {
                  ...tile,
                  resource: null,
                  improvement: "MONUMENT",
                  territoryOwnerId: live.viewer.id,
                }
              : tile,
          ),
        },
        populationContributions: [
          ...live.populationContributions,
          {
            id: 9001,
            cityId: city.id,
            category: "LIVE",
            amount: 3,
            source:
              visibility === "FULL"
                ? { kind: "MONUMENT", visibility, achievement, at }
                : { kind: "MONUMENT", visibility, at },
          },
        ],
      },
    };
  }

  const boardSubject = (view: PlayerViewV7, at: Tile["at"]) =>
    buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.find(
      (entry) =>
        entry.kind === "IMPROVEMENT" &&
        entry.at.x === at.x &&
        entry.at.y === at.y,
    )?.artSubject;

  it("is drawn in the look of its achievement for the player who may see it", () => {
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      const { view, at } = monumentView(achievement, "FULL");
      expect(boardSubject(view, at), achievement).toBe(
        `IMPROVEMENT:MONUMENT:${achievement}`,
      );
      expect(tileImprovementSubjectV7(view, at, "MONUMENT", "UNDEAD")).toBe(
        `IMPROVEMENT:MONUMENT:${achievement}`,
      );
    }
  });

  it("stays the shared Monument when the view hides its achievement", () => {
    // The source achievement of a Monument is owner-only
    // (docs/product/RULESET_7.md): another player's Monument is projected
    // BUILDING_ONLY, so its sprite must not tell.
    const { view, at } = monumentView("SLAYER", "BUILDING_ONLY");
    expect(boardSubject(view, at)).toBe("IMPROVEMENT:MONUMENT");
    // A Monument with no contribution in the view at all.
    expect(
      tileImprovementSubjectV7(
        { populationContributions: [] },
        at,
        "MONUMENT",
        null,
      ),
    ).toBe("IMPROVEMENT:MONUMENT");
    // Every other improvement is untouched.
    expect(tileImprovementSubjectV7(view, at, "FARM", "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:FARM",
    );
    expect(tileImprovementSubjectV7(view, at, "FORGE", "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:FORGE",
    );
  });

  it("shows the achievement's Monument on its build button", () => {
    for (const achievement of ACHIEVEMENT_IDS_V7)
      expect(
        commandSubjectV7(
          { kind: "BUILD_MONUMENT", achievement, at: { x: 1, y: 1 } },
          "ORIGINAL",
        ),
      ).toBe(`IMPROVEMENT:MONUMENT:${achievement}`);
  });
});

describe("the Gallery's Monuments", () => {
  it("lists the shared Monument and one row per achievement, each one shared cell", () => {
    const at = GALLERY_BUILDING_ROWS_V7.indexOf("MONUMENT");
    expect(
      GALLERY_BUILDING_ROWS_V7.slice(at, at + 1 + ACHIEVEMENT_IDS_V7.length),
    ).toEqual([
      "MONUMENT",
      ...ACHIEVEMENT_IDS_V7.map((achievement) => `MONUMENT_${achievement}`),
    ]);
    expect(galleryMonumentAchievementV7("MONUMENT")).toBeNull();
    expect(galleryBuildingSubjectV7("MONUMENT", "UNDEAD")).toBe(
      "IMPROVEMENT:MONUMENT",
    );
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      const row = `MONUMENT_${achievement}` as const;
      expect(galleryMonumentAchievementV7(row)).toBe(achievement);
      expect(galleryBuildingPerFactionV7(row), row).toBe(false);
      expect(galleryBuildingSubjectV7(row, "ORIGINAL")).toBe(
        `IMPROVEMENT:MONUMENT:${achievement}`,
      );
    }
    expect(galleryBuildingNameV7("MONUMENT_LAND_BARON", null)).toBe(
      "Land Baron Monument",
    );
    expect(galleryBuildingDetailsV7("MONUMENT_SEA_DOG", null)).toEqual({
      name: "Sea Dog Monument",
      factionName: null,
      description:
        "The Monument of the Sea Dog achievement: Own 5 warships at once. Each achievement earns a free Monument: +3 population, one per city. It keeps its builder's look when its city is captured.",
      effects: [],
      cost: null,
      technology: null,
    });
  });
});

describe("the Fertile Ground", () => {
  it("is a patch of dark tilled soil, not a tuft of wheat", async () => {
    const records = await loadRecords(productionLayout(ROOT, "3"), "3");
    const manifest = await loadBatchManifest(ROOT, "3");
    const record = records.assets["chibi-fertile-ground"];
    if (record === undefined) throw new Error("no record");
    expect(record.recipe).toBe("fertile-soil-b");
    expect(record.derivation.kind).toBe("seated");
    expect(await verifyAssetRecord(ROOT, manifest, record)).toEqual([]);
    // The wheat stays in the batch as history.
    expect(records.recipes["fertile-ground-a"]?.rawSheet).toBeDefined();
    const entry = CHIBI_ART_ASSETS_V7.find(
      (asset) => asset.id === "chibi-fertile-ground",
    );
    if (entry === undefined) throw new Error("not registered");
    expect([entry.width, entry.height, entry.assetClass]).toEqual([
      48,
      48,
      "RESOURCE",
    ]);
    const master = await readRaster(
      path.join(ROOT, "public/assets/chibi/resources/chibi-fertile-ground.png"),
    );
    const box = opaqueBounds(master);
    if (box === null) throw new Error("empty");
    const width = box.right - box.left + 1;
    const height = box.bottom - box.top + 1;
    // Ground lies down: wide and low, centred in its 48 x 48 canvas.
    expect(width).toBeGreaterThanOrEqual(40);
    expect(height).toBeLessThan(width);
    expect(Math.abs(box.top - (47 - box.bottom))).toBeLessThanOrEqual(1);
    let soil = 0;
    let straw = 0;
    let sprout = 0;
    let paint = 0;
    for (let offset = 0; offset < master.data.length; offset += 4) {
      if ((master.data[offset + 3] ?? 0) < 128) continue;
      paint += 1;
      const r = master.data[offset] ?? 0;
      const g = master.data[offset + 1] ?? 0;
      const b = master.data[offset + 2] ?? 0;
      if (g > r && g > b) sprout += 1;
      else if (r > 170 && g > 130) straw += 1;
      else if (r >= g && g >= b && r < 170) soil += 1;
    }
    // Nearly all of it is brown earth; a few green sprouts; no straw gold.
    expect(soil / paint).toBeGreaterThan(0.85);
    expect(sprout).toBeGreaterThan(4);
    expect(sprout / paint).toBeLessThan(0.1);
    expect(straw).toBe(0);
    expect(
      extractOwnerMask(master).mask.bits.reduce((sum, bit) => sum + bit, 0),
    ).toBe(0);
  });
});
