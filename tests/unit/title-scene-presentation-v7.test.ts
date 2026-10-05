import { describe, expect, it } from "vitest";
import { assetInventoryV7 } from "../../src/assets/asset-inventory-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { chibiDirectionArtAssetsV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_FOREST_ART_SET_V7 } from "../../src/assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../../src/assets/chibi-mountain-ranges-manifest";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import { titleSceneScaleV7 } from "../../src/render/dom/title-scene-view-v7";
import {
  titleSceneRasterUrlsV7,
  titleSceneSubjectsV7,
  titleSceneV7,
} from "../../src/render/title-scene-v7";

/** The title scene's layout (bead pulp_wars-2yc.4). */
describe("title scene", () => {
  const units = (scene: ReturnType<typeof titleSceneV7>) =>
    scene.items.filter(
      (item) => item.kind === "SUBJECT" && item.unit?.afloat === false,
    );

  it("shows every faction's flagship and Fighter on a wide canvas", () => {
    const scene = titleSceneV7({ width: 900, height: 420 });
    expect([...scene.flagships].sort()).toEqual([...FACTION_IDS_V7].sort());
    expect([...scene.fighters].sort()).toEqual([...FACTION_IDS_V7].sort());
    const subjects = scene.items.flatMap((item) =>
      item.kind === "SUBJECT" ? [item.subject] : [],
    );
    expect(subjects).toContain("UNIT:JUGGERNAUT");
    expect(subjects).toContain("UNIT:UNDEAD:JUGGERNAUT");
    expect(subjects).toContain("UNIT:CANDY:FIGHTER");
    expect(subjects).toContain("CITY:3");
    expect(subjects).toContain("TERRAIN:DEEP_WATER");
    expect(subjects.some((subject) => subject.includes("BATTLESHIP"))).toBe(
      true,
    );
    expect(units(scene)).toHaveLength(16);
  });

  it("re-flows for a phone: fewer units and one column of sea, nothing off the canvas", () => {
    const wide = titleSceneV7({ width: 900, height: 420 });
    const phone = titleSceneV7({ width: 390, height: 300 });
    expect(phone.flagships.length).toBeLessThan(wide.flagships.length);
    expect(phone.flagships.length).toBeGreaterThanOrEqual(2);
    expect(phone.fighters.length).toBeGreaterThanOrEqual(3);
    // Several factions even at the smallest size.
    expect(
      new Set([...phone.flagships, ...phone.fighters]).size,
    ).toBeGreaterThanOrEqual(5);
    const subjects = (scene: typeof phone) =>
      scene.items.flatMap((item) =>
        item.kind === "SUBJECT" ? [item.subject] : [],
      );
    expect(subjects(phone)).not.toContain("TERRAIN:DEEP_WATER");
    expect(subjects(phone)).toContain("TERRAIN:SHALLOW_WATER");
    for (const scene of [
      wide,
      phone,
      titleSceneV7({ width: 640, height: 425 }),
      titleSceneV7({ width: 392, height: 450 }),
      titleSceneV7({ width: 200, height: 130 }),
    ]) {
      for (const item of units(scene))
        if (item.kind === "SUBJECT") {
          expect(item.cx).toBeGreaterThanOrEqual(20);
          expect(item.cx).toBeLessThanOrEqual(scene.width - 20);
          expect(item.cy).toBeLessThan(scene.height);
        }
      // Ground comes first, so everything stands on it.
      const firstPiece = scene.items.findIndex(
        (item) => item.kind === "RASTER",
      );
      expect(
        scene.items
          .slice(0, firstPiece)
          .every(
            (item) =>
              item.kind === "SUBJECT" && item.subject.startsWith("TERRAIN:"),
          ),
      ).toBe(true);
      expect(scene.clouds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("is the same picture every time (no randomness)", () => {
    expect(titleSceneV7({ width: 512, height: 300 })).toEqual(
      titleSceneV7({ width: 512, height: 300 }),
    );
  });

  it("draws at a whole number of screen pixels per art pixel", () => {
    expect(titleSceneScaleV7(390, 304)).toBe(1);
    expect(titleSceneScaleV7(640, 425)).toBe(1);
    expect(titleSceneScaleV7(784, 900)).toBe(2);
    expect(titleSceneScaleV7(1300, 1000)).toBe(3);
    expect(titleSceneScaleV7(2400, 380)).toBe(1);
  });

  it("uses only art the preloader loads, read from the manifests", () => {
    const preloaded = new Set(
      assetInventoryV7("LIVE").map((entry) => entry.url),
    );
    for (const url of titleSceneRasterUrlsV7())
      expect(preloaded.has(url), url).toBe(true);
    const registered = new Set(
      [...CHIBI_ART_ASSETS_V7, ...chibiDirectionArtAssetsV7()].map(
        (asset) => asset.subject,
      ),
    );
    for (const subject of titleSceneSubjectsV7())
      expect(registered.has(subject), subject).toBe(true);
    // Every piece a scene draws comes from the forest and massif sets.
    const pieces = new Set(
      [
        ...CHIBI_MOUNTAIN_ART_SET_V7.pieces,
        ...CHIBI_FOREST_ART_SET_V7.pieces,
      ].map((piece) => piece.url),
    );
    const scene = titleSceneV7({ width: 900, height: 420 });
    const drawn = scene.items.flatMap((item) =>
      item.kind === "RASTER" ? [item.url] : [],
    );
    expect(drawn.length).toBeGreaterThan(6);
    for (const url of drawn) expect(pieces.has(url), url).toBe(true);
    for (const item of scene.items)
      if (item.kind === "SUBJECT")
        expect(titleSceneSubjectsV7()).toContain(item.subject);
  });
});
