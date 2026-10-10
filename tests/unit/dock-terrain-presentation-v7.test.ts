import { describe, expect, it } from "vitest";
import {
  CHIBI_MOUNTAIN_ART_SET_V7,
  CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7,
} from "../../src/assets/chibi-mountain-ranges-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "../../src/assets/faction-forest-pieces-manifest";
import { FACTION_GRASS_TILES_V7 } from "../../src/assets/faction-grass-manifest";
import { FACTION_IDS_V7, type FactionIdV7 } from "../../src/engine/index";
import { FACTION_FOREST_IDS_V7 } from "../../src/render/canvas/faction-forests-v7";
import {
  createGalleryTerrainArtV7,
  galleryTerrainBoxV7,
} from "../../src/render/canvas/gallery-terrain-v7";
import { createGalleryArtV7 } from "../../src/render/canvas/gallery-sprite-v7";
import {
  DOCK_FOREST_RISE_V7,
  DOCK_MOUNTAIN_RISE_V7,
  dockTerrainSwatchV7,
  type DockTerrainRequestV7,
} from "../../src/render/dock-terrain-presentation-v7";
import type { GalleryTerrainLayerV7 } from "../../src/render/gallery-terrain-presentation-v7";

/**
 * Bead pulp_wars-2yc.41: the tile dock showed the old single mountain for
 * every Mountain, and the default green clump on default Grass for a
 * Forest cell inside a faction's territory (with or without a Treasure, a
 * Grave or a Village on it). It shows what the board draws on the cell.
 */

const request = (
  terrain: string,
  faction: FactionIdV7 | null,
  more: Partial<DockTerrainRequestV7> = {},
): DockTerrainRequestV7 => ({
  terrain,
  mined: false,
  faction,
  snow: false,
  live: true,
  ...more,
});

const urls = (layers: readonly GalleryTerrainLayerV7[]): string[] =>
  layers.flatMap((layer) => (layer.kind === "RASTER" ? [layer.url] : []));

describe("the tile dock's terrain picture", () => {
  it("shows a Mountain as a low single mountain of the massif set on Grass", () => {
    const swatch = dockTerrainSwatchV7(request("MOUNTAIN", null));
    const single = CHIBI_MOUNTAIN_ART_SET_V7.pieces.find(
      (piece) => piece.columns === 1 && !piece.tall,
    );
    expect(single).toBeDefined();
    expect(swatch?.id).toBe(single?.id);
    expect(swatch?.box).toEqual({ kind: "CELL", rise: DOCK_MOUNTAIN_RISE_V7 });
    expect(swatch?.layers).toEqual([
      { kind: "SUBJECT", subject: "TERRAIN:GRASS", at: { x: 0, y: 0 } },
      {
        kind: "RASTER",
        url: single?.url,
        width: single?.width,
        height: single?.height,
      },
    ]);
    // The old master (the blue-grey mountain on rocky ground) is not asked.
    expect(JSON.stringify(swatch)).not.toContain("TERRAIN:MOUNTAIN");
    // The classic look draws the massifs too.
    expect(
      dockTerrainSwatchV7(request("MOUNTAIN", null, { live: false }))?.id,
    ).toBe(single?.id);
  });

  it("shows a Mine as the mined mountain of the massif set", () => {
    const swatch = dockTerrainSwatchV7(
      request("MOUNTAIN", "GOBLIN", { mined: true }),
    );
    const mine = CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7[0];
    expect(swatch?.id).toBe(mine?.id);
    // The mountain alone, not its master on default Grass.
    expect(urls(swatch?.layers ?? []).at(-1)).toBe(mine?.layers?.bodyUrl);
    expect(urls(swatch?.layers ?? [])).not.toContain(mine?.url);
  });

  it("stands a Mountain on the ground of its territory", () => {
    for (const faction of FACTION_IDS_V7) {
      const swatch = dockTerrainSwatchV7(request("MOUNTAIN", faction));
      const ground = swatch?.layers[0];
      const baked = FACTION_GRASS_TILES_V7.find(
        (tile) => tile.id === faction && tile.toned !== true,
      );
      if (baked !== undefined)
        expect(ground, faction).toEqual({
          kind: "RASTER",
          url: baked.url,
          width: 80,
          height: 80,
        });
      else
        expect(ground, faction).toEqual({
          kind: "SUBJECT",
          subject:
            faction === "UNDEAD" ? "TERRAIN:UNDEAD:GRASS" : "TERRAIN:GRASS",
          at: { x: 0, y: 0 },
        });
    }
    // Five factions have a baked ground of their own.
    expect(
      FACTION_IDS_V7.filter(
        (faction) =>
          dockTerrainSwatchV7(request("MOUNTAIN", faction))?.layers[0]?.kind ===
          "RASTER",
      ),
    ).toHaveLength(5);
    // Snow lies over the ground, under the mountain.
    const snowy = dockTerrainSwatchV7(
      request("MOUNTAIN", "ICE_FOLK", { snow: true }),
    );
    expect(snowy?.layers.map((layer) => layer.kind)).toEqual([
      "SUBJECT",
      "SNOW",
      "RASTER",
    ]);
    // The classic look has no faction grass.
    expect(
      dockTerrainSwatchV7(request("MOUNTAIN", "GOBLIN", { live: false }))
        ?.layers[0]?.kind,
    ).toBe("SUBJECT");
  });

  it("shows a Forest inside a faction's territory with that faction's own trees", () => {
    const seen = new Set<string>();
    for (const faction of FACTION_FOREST_IDS_V7) {
      const swatch = dockTerrainSwatchV7(request("FOREST", faction));
      const set = FACTION_FOREST_ART_SETS_V7[faction];
      const single = set.pieces.find((piece) => piece.shape === "1x1");
      expect(swatch, faction).not.toBeNull();
      expect(swatch?.id, faction).toBe(single?.id);
      expect(swatch?.box).toEqual({ kind: "CELL", rise: DOCK_FOREST_RISE_V7 });
      const trees = urls(swatch?.layers ?? []).at(-1) ?? "";
      expect(trees, faction).toBe(single?.url);
      expect(trees, faction).toContain(
        `/forest/${faction.toLowerCase().replace("_", "-")}/`,
      );
      seen.add(trees);
    }
    // Seven factions, seven forests: the Ice Folk tundra and the Candy
    // grove among them.
    expect(seen.size).toBe(7);
    expect(FACTION_FOREST_IDS_V7).toContain("ICE_FOLK");
    expect(FACTION_FOREST_IDS_V7).toContain("CANDY");
  });

  it("keeps the registered master for the default Forest and every other tile", () => {
    expect(dockTerrainSwatchV7(request("FOREST", null))).toBeNull();
    expect(dockTerrainSwatchV7(request("FOREST", "ORIGINAL"))).toBeNull();
    // The classic look draws every Forest as the default one.
    expect(
      dockTerrainSwatchV7(request("FOREST", "GOBLIN", { live: false })),
    ).toBeNull();
    for (const terrain of ["GRASS", "SHALLOW_WATER", "DEEP_WATER", "RIFT"])
      expect(dockTerrainSwatchV7(request(terrain, "GOBLIN"))).toBeNull();
  });

  it("draws the cell without the Gallery tile's margins, its art standing on the cell", () => {
    const swatch = dockTerrainSwatchV7(request("FOREST", "CANDY"));
    if (swatch === null) throw new Error("no swatch");
    expect(galleryTerrainBoxV7(swatch)).toEqual({
      width: 80,
      height: 80 + DOCK_FOREST_RISE_V7,
    });
    const environment = {
      loadImage(url: string, settle: (ok: boolean) => void) {
        settle(true);
        return { url } as unknown as CanvasImageSource;
      },
      readPixels: (_image: CanvasImageSource, width: number, height: number) =>
        new Uint8ClampedArray(width * height * 4).fill(255),
      createSurface: (
        pixels: Uint8ClampedArray,
        width: number,
        height: number,
      ) => ({ pixels, width, height }) as unknown as CanvasImageSource,
    };
    const art = createGalleryTerrainArtV7({
      environment,
      art: createGalleryArtV7(environment, () => undefined),
      redraw: () => undefined,
    });
    const drawn: { url: string; x: number; y: number; h: number }[] = [];
    let shift = { x: 0, y: 0 };
    const context = {
      setTransform: () => {
        shift = { x: 0, y: 0 };
      },
      translate: (x: number, y: number) => {
        shift = { x: shift.x + x, y: shift.y + y };
      },
      clearRect: () => undefined,
      drawImage: (
        image: { url: string },
        x: number,
        y: number,
        _w: number,
        h: number,
      ) => drawn.push({ url: image.url, x: x + shift.x, y: y + shift.y, h }),
      imageSmoothingEnabled: false,
    };
    const canvas = {
      style: {} as Record<string, string>,
      width: 0,
      height: 0,
      getContext: () => context,
    };
    expect(art.draw(canvas as unknown as HTMLCanvasElement, swatch, 1, 1)).toBe(
      "READY",
    );
    expect(canvas.width).toBe(80);
    expect(canvas.height).toBe(80 + DOCK_FOREST_RISE_V7);
    // The ground fills the cell under the rise; the trees end on its foot.
    expect(drawn).toHaveLength(2);
    expect(drawn[0]).toMatchObject({ x: 0, y: DOCK_FOREST_RISE_V7, h: 80 });
    expect(drawn[1]?.x).toBe(0);
    expect((drawn[1]?.y ?? 0) + (drawn[1]?.h ?? 0)).toBe(
      80 + DOCK_FOREST_RISE_V7,
    );
  });
});
