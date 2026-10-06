import { describe, expect, it } from "vitest";
import { assetInventoryV7 } from "../../src/assets/asset-inventory-v7";
import { chibiVariantV7 } from "../../src/assets/chibi-art-v7";
import { CHIBI_FOREST_ART_SET_V7 } from "../../src/assets/chibi-forest-pieces-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "../../src/assets/faction-forest-pieces-manifest";
import { FACTION_FOREST_IDS_V7 } from "../../src/render/canvas/faction-forests-v7";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../../src/assets/chibi-mountain-ranges-manifest";
import { FACTION_GRASS_TILES_V7 } from "../../src/assets/faction-grass-manifest";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import {
  DEFAULT_GALLERY_FILTERS_V7,
  parseGalleryFiltersV7,
} from "../../src/render/gallery-presentation-v7";
import {
  GALLERY_TERRAIN_ROWS_V7,
  galleryTerrainCellV7,
  galleryTerrainDetailsV7,
  galleryTerrainLookV7,
  galleryTerrainPerFactionV7,
  galleryTerrainPiecesV7,
  galleryTerrainRasterUrlsV7,
  galleryTerrainVariantsV7,
} from "../../src/render/gallery-terrain-presentation-v7";
import {
  GALLERY_TERRAIN_PATCH_V7,
  buildGalleryTerrainSampleV7,
} from "../../src/render/gallery-terrain-sample-v7";

/** The Gallery's Terrain tab, pure part (bead pulp_wars-2yc.3). */
describe("Gallery terrain presentation", () => {
  it("gives Grass a column per faction and shared terrain one cell", () => {
    expect(GALLERY_TERRAIN_ROWS_V7).toEqual([
      "GRASS",
      "FOREST",
      "MOUNTAIN",
      "WATER",
      "ICE",
      "RIFT",
    ]);
    expect(galleryTerrainPerFactionV7("GRASS")).toBe(true);
    expect(galleryTerrainPerFactionV7("FOREST")).toBe(true);
    expect(galleryTerrainPerFactionV7("ICE")).toBe(true);
    for (const row of ["MOUNTAIN", "WATER", "RIFT"] as const) {
      expect(galleryTerrainPerFactionV7(row), row).toBe(false);
      const shared = galleryTerrainCellV7(row, null);
      expect(shared.kind).toBe("OWN");
    }
    // Every faction has ground of its own: baked grass tiles, the Undead
    // gloam, the Ice Folk Snow.
    for (const faction of FACTION_IDS_V7)
      expect(galleryTerrainLookV7("GRASS", faction), faction).toBe("OWN");
    const snow = galleryTerrainCellV7("GRASS", "ICE_FOLK");
    expect(snow.kind === "OWN" && snow.name).toBe("Snow");
    expect(
      snow.kind === "OWN" && snow.swatch.layers.map((layer) => layer.kind),
    ).toEqual(["SUBJECT", "SNOW"]);
    for (const tile of FACTION_GRASS_TILES_V7.filter(
      (entry) => entry.toned !== true,
    )) {
      const pieces = galleryTerrainPiecesV7("GRASS", tile.id);
      expect(pieces.flatMap(galleryTerrainRasterUrlsV7)).toContain(tile.url);
    }
  });

  it("marks a faction without its own forest plainly, and slots one in where it exists", () => {
    // Six factions have a forest of their own (pulp_wars-2yc.2); Ice Folk
    // territory is Snow, and its pines are the default ones under caps.
    expect(galleryTerrainCellV7("FOREST", "ICE_FOLK")).toEqual({
      kind: "SAME",
      row: "FOREST",
      faction: "ICE_FOLK",
    });
    for (const faction of FACTION_FOREST_IDS_V7) {
      expect(galleryTerrainCellV7("FOREST", faction).kind).toBe("OWN");
      const pieces = galleryTerrainPiecesV7("FOREST", faction);
      const set = FACTION_FOREST_ART_SETS_V7[faction];
      // A single piece on the faction's ground, then the whole set.
      expect(pieces[0]?.box.kind).toBe("TILE");
      expect(pieces[0]?.layers).toHaveLength(2);
      expect(pieces.length).toBe(1 + set.pieces.length + set.clumps.length);
      const urls = pieces.flatMap(galleryTerrainRasterUrlsV7);
      for (const piece of [...set.pieces, ...set.clumps])
        expect(urls, piece.id).toContain(piece.url);
      // Never a piece of the default Forest.
      for (const piece of CHIBI_FOREST_ART_SET_V7.pieces)
        expect(urls).not.toContain(piece.url);
    }
    // Sea ice is the Ice Folk's alone.
    for (const faction of FACTION_IDS_V7)
      expect(galleryTerrainLookV7("ICE", faction)).toBe(
        faction === "ICE_FOLK" ? "OWN" : "NONE",
      );
  });

  it("lists every piece of the manifests, whatever their number", () => {
    const forest = galleryTerrainPiecesV7("FOREST", "ORIGINAL");
    const forestUrls = forest.flatMap(galleryTerrainRasterUrlsV7);
    for (const piece of [
      ...CHIBI_FOREST_ART_SET_V7.pieces,
      ...CHIBI_FOREST_ART_SET_V7.clumps,
    ])
      expect(forestUrls, piece.id).toContain(piece.url);
    expect(forest.length).toBe(
      galleryTerrainVariantsV7("TERRAIN:FOREST").length +
        CHIBI_FOREST_ART_SET_V7.pieces.length +
        CHIBI_FOREST_ART_SET_V7.clumps.length,
    );
    const mountain = galleryTerrainPiecesV7("MOUNTAIN", null);
    const mountainUrls = mountain.flatMap(galleryTerrainRasterUrlsV7);
    for (const piece of CHIBI_MOUNTAIN_ART_SET_V7.pieces)
      expect(mountainUrls, piece.id).toContain(piece.url);
    // One mountain on Grass first (pulp_wars-2yc.1), then the whole set.
    expect(mountain[0]?.box.kind).toBe("TILE");
    expect(mountain.length).toBe(
      1 +
        CHIBI_MOUNTAIN_ART_SET_V7.pieces.length +
        CHIBI_MOUNTAIN_ART_SET_V7.mined.length,
    );
    // A multi-tile piece keeps its own size.
    const wide = CHIBI_MOUNTAIN_ART_SET_V7.pieces.find(
      (piece) => piece.columns === 2,
    );
    expect(mountain.find((piece) => piece.id === wide?.id)?.box).toEqual({
      kind: "PIECE",
      width: wide?.width,
      height: wide?.height,
    });
    // Each variant of a tile is shown once.
    const water = galleryTerrainPiecesV7("WATER", null);
    expect(new Set(water.map((piece) => piece.id)).size).toBe(water.length);
    expect(water.length).toBe(
      galleryTerrainVariantsV7("TERRAIN:SHALLOW_WATER").length +
        galleryTerrainVariantsV7("TERRAIN:DEEP_WATER").length +
        galleryTerrainVariantsV7("RESOURCE:FISH").length,
    );
    // Every Fish variant, each on Shallow Water (bead pulp_wars-2yc.16).
    const fish = water.filter((piece) => piece.id.startsWith("chibi-fish"));
    expect(fish.map((piece) => piece.id).sort()).toEqual([
      "chibi-fish",
      "chibi-fish-dive",
      "chibi-fish-pair",
      "chibi-fish-shoal",
    ]);
    for (const piece of fish) {
      expect(piece.box).toEqual({ kind: "TILE" });
      expect(piece.layers).toMatchObject([
        { kind: "SUBJECT", subject: "TERRAIN:SHALLOW_WATER" },
        { kind: "SUBJECT", subject: "RESOURCE:FISH" },
      ]);
      const [, top] = piece.layers;
      if (top?.kind !== "SUBJECT") throw new Error("no fish layer");
      // The layer's coordinate is one at which the board draws this fish.
      expect(
        chibiVariantV7(galleryTerrainVariantsV7("RESOURCE:FISH"), top.at)?.id,
      ).toBe(piece.id);
    }
    expect(galleryTerrainPiecesV7("RIFT", null)).toHaveLength(6);
    expect(galleryTerrainPiecesV7("ICE", "ICE_FOLK")).toHaveLength(4);
    expect(galleryTerrainDetailsV7("WATER", null)).toMatchObject({
      name: "Water",
      factionName: null,
      kicker: "Every faction",
    });
  });

  it("shows nothing the preloader does not load", () => {
    const preloaded = new Set(
      assetInventoryV7("LIVE").map((entry) => entry.url),
    );
    let checked = 0;
    for (const row of GALLERY_TERRAIN_ROWS_V7)
      for (const faction of [null, ...FACTION_IDS_V7])
        for (const piece of galleryTerrainPiecesV7(row, faction))
          for (const url of galleryTerrainRasterUrlsV7(piece)) {
            expect(preloaded.has(url), url).toBe(true);
            checked += 1;
          }
    expect(checked).toBeGreaterThan(50);
  });

  it("remembers the terrain rows with the other filters", () => {
    expect(DEFAULT_GALLERY_FILTERS_V7.terrainRows).toEqual(
      GALLERY_TERRAIN_ROWS_V7,
    );
    expect(
      parseGalleryFiltersV7(
        JSON.stringify({
          tab: "TERRAIN",
          terrainRows: ["RIFT", "LAVA", "GRASS"],
        }),
      ),
    ).toMatchObject({ tab: "TERRAIN", terrainRows: ["GRASS", "RIFT"] });
    // Filters stored before the tab existed show every terrain.
    expect(
      parseGalleryFiltersV7(JSON.stringify({ tab: "UNITS" })).terrainRows,
    ).toEqual(GALLERY_TERRAIN_ROWS_V7);
  });
});

describe("Gallery terrain sample boards", () => {
  const tileAt = (
    view: NonNullable<ReturnType<typeof buildGalleryTerrainSampleV7>>,
    x: number,
    y: number,
  ) => view.board.tiles.find((tile) => tile.at.x === x && tile.at.y === y);

  it("builds a real board for every cell: the terrain round a capital, a Fighter for scale", () => {
    for (const row of GALLERY_TERRAIN_ROWS_V7)
      for (const faction of [null, ...FACTION_IDS_V7]) {
        if (galleryTerrainCellV7(row, faction).kind !== "OWN") continue;
        const view = buildGalleryTerrainSampleV7(row, faction);
        expect(view, `${row}:${String(faction)}`).not.toBeNull();
        if (view === null) continue;
        expect(view.viewer.faction).toBe(faction ?? "ORIGINAL");
        const explored = view.board.tiles.filter((tile) => tile.explored);
        const patch = GALLERY_TERRAIN_PATCH_V7;
        expect(explored).toHaveLength(25);
        expect(
          explored.every(
            (tile) =>
              tile.at.x >= patch.x0 &&
              tile.at.x <= patch.x1 &&
              tile.at.y >= patch.y0 &&
              tile.at.y <= patch.y1,
          ),
        ).toBe(true);
        expect(
          view.cities.filter((city) => city.ownerId === view.viewer.id),
        ).toHaveLength(1);
        expect(
          view.units.filter((unit) => unit.ownerId === view.viewer.id),
        ).toHaveLength(1);
      }
  });

  it("lays out the row's terrain", () => {
    const terrain = (
      row: (typeof GALLERY_TERRAIN_ROWS_V7)[number],
      x: number,
      y: number,
    ) => {
      const view = buildGalleryTerrainSampleV7(
        row,
        row === "ICE" ? "ICE_FOLK" : null,
      );
      if (view === null) throw new Error(`${row} sample missing`);
      const tile = tileAt(view, x, y);
      return tile?.explored === true ? tile.terrain : undefined;
    };
    expect(terrain("GRASS", 5, 3)).toBe("GRASS");
    expect(terrain("FOREST", 5, 3)).toBe("FOREST");
    expect(terrain("MOUNTAIN", 6, 5)).toBe("MOUNTAIN");
    expect(terrain("WATER", 5, 3)).toBe("SHALLOW_WATER");
    expect(terrain("WATER", 6, 3)).toBe("DEEP_WATER");
    expect(terrain("RIFT", 3, 6)).toBe("RIFT");
    expect(terrain("RIFT", 6, 3)).toBe("RIFT");
    // The Water patch shows every Fish variant on its shallow column.
    const sea = buildGalleryTerrainSampleV7("WATER", null);
    if (sea === null) throw new Error("WATER sample missing");
    const fishCells = sea.board.tiles.flatMap((tile) =>
      tile.explored && tile.resource === "FISH" ? [tile] : [],
    );
    expect(fishCells.map((tile) => tile.terrain)).toEqual(
      fishCells.map(() => "SHALLOW_WATER"),
    );
    expect(
      new Set(
        fishCells.map(
          (tile) =>
            chibiVariantV7(galleryTerrainVariantsV7("RESOURCE:FISH"), tile.at)
              ?.id,
        ),
      ).size,
    ).toBe(galleryTerrainVariantsV7("RESOURCE:FISH").length);
    for (const other of ["GRASS", "FOREST", "MOUNTAIN", "RIFT"] as const)
      expect(
        buildGalleryTerrainSampleV7(other, null)?.board.tiles.some(
          (tile) => tile.explored && tile.resource !== null,
        ),
      ).toBe(false);
    const ice = buildGalleryTerrainSampleV7("ICE", "ICE_FOLK");
    expect(ice?.ice.length).toBeGreaterThan(0);
    // Ice inside the borders is permanent; beyond them it melts.
    expect(new Set(ice?.ice.map((tile) => tile.permanent))).toEqual(
      new Set([true, false]),
    );
  });
});
