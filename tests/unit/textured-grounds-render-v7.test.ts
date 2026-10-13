import { describe, expect, it, vi } from "vitest";
import {
  FACTION_GRASS_TILE_COUNTS_V7,
  FACTION_GRASS_TILES_V7,
  FACTION_GRASS_WORLDS_V7,
  factionGrassSwatchUrlV7,
} from "../../src/assets/faction-grass-manifest";
import type { ChibiForestRasterEnvironmentV7 } from "../../src/render/canvas/chibi-forest-v7";
import {
  FACTION_GRASS_IDS_V7,
  GRASS_E,
  createFactionGrassArtV7,
  drawFactionGrassV7,
  factionGrassCellsV7,
  type FactionGrassEntryV7,
  type FactionGrassIdV7,
} from "../../src/render/canvas/faction-grass-v7";

/**
 * Textured grounds (bead pulp_wars-2yc.48, docs/art/TEXTURED_GROUNDS.md): a
 * ground drawn as one large texture sampled by a cell's place on the map.
 */

const WORLD_TILES = FACTION_GRASS_TILES_V7.filter(
  (tile) => tile.world !== undefined,
);

const CELL = 80;

function entry(
  x: number,
  y: number,
  factionGrass?: FactionGrassIdV7,
): FactionGrassEntryV7 {
  return {
    kind: "TERRAIN",
    at: { x, y },
    artSubject: "TERRAIN:GRASS",
    ...(factionGrass === undefined ? {} : { factionGrass }),
  };
}

function harness() {
  const reads: [number, number][] = [];
  let surfaces = 0;
  const environment: ChibiForestRasterEnvironmentV7 = {
    loadImage(url, settle) {
      settle(true);
      return { url } as unknown as CanvasImageSource;
    },
    readPixels(_image, width, height) {
      reads.push([width, height]);
      // Every pixel says where it is in its image: red its column of
      // cells, green its row of cells.
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y += 1)
        for (let x = 0; x < width; x += 1)
          pixels.set(
            [Math.floor(x / CELL), Math.floor(y / CELL), x % CELL, 255],
            (y * width + x) * 4,
          );
      return pixels;
    },
    createSurface(pixels) {
      surfaces += 1;
      return { pixels } as unknown as CanvasImageSource;
    },
  };
  const art = createFactionGrassArtV7({
    environment,
    redraw: vi.fn(),
    tiles: FACTION_GRASS_TILES_V7,
  }).resolve();
  if (art === null) throw new Error("no art");
  return { art, reads, surfaces: () => surfaces };
}

const pixelsOf = (image: CanvasImageSource | null): Uint8ClampedArray =>
  (image as unknown as { pixels: Uint8ClampedArray }).pixels;

describe("the textured grounds of the manifest", () => {
  it("are one texture of six or eight cells a side each, with a cell of it for the interface", () => {
    expect(WORLD_TILES.map((tile) => tile.id).sort()).toEqual(
      Object.keys(FACTION_GRASS_WORLDS_V7).sort(),
    );
    for (const tile of WORLD_TILES) {
      expect(tile.variant).toBe(0);
      const size = FACTION_GRASS_WORLDS_V7[tile.id];
      expect([tile.world?.columns, tile.world?.rows]).toEqual([
        size?.columns,
        size?.rows,
      ]);
      // Bare regolith has the longer period (a boulder every six cells
      // was a lattice on a large territory); the denser grounds have six.
      expect(size?.columns).toBe(tile.id === "MARTIAN" ? 8 : 6);
      expect(size?.rows).toBe(size?.columns);
      expect(tile.url).toContain(
        `faction-grass/world/chibi-${tile.id.toLowerCase()}-ground.png`,
      );
      // The swatch is the first tile's old name, so the Gallery, the tile
      // dock and the forest bake find it where the tile was.
      expect(factionGrassSwatchUrlV7(tile)).toContain(
        `faction-grass/chibi-${tile.id.toLowerCase()}-grass-1.png`,
      );
      // A textured ground has no tiles, and is the ground's only asset.
      expect(FACTION_GRASS_TILE_COUNTS_V7[tile.id]).toBe(0);
      expect(
        FACTION_GRASS_TILES_V7.filter((other) => other.id === tile.id),
      ).toEqual([tile]);
    }
    // A ground of tiles is its own swatch.
    const candy = FACTION_GRASS_TILES_V7.find((tile) => tile.id === "CANDY");
    if (candy === undefined) throw new Error("no Candy tile");
    expect(factionGrassSwatchUrlV7(candy)).toBe(candy.url);
    // Every ground has tiles or a texture.
    for (const id of FACTION_GRASS_IDS_V7)
      expect(
        FACTION_GRASS_TILE_COUNTS_V7[id] > 0 ||
          FACTION_GRASS_WORLDS_V7[id] !== undefined,
        id,
      ).toBe(true);
  });
});

describe("a ground sampled by map place", () => {
  it("reads its texture once and cuts it into its cells", () => {
    const { reads } = harness();
    for (const tile of WORLD_TILES)
      expect(
        reads.filter(
          ([width, height]) =>
            width === (tile.world?.columns ?? 0) * CELL &&
            height === (tile.world?.rows ?? 0) * CELL,
        ).length,
      ).toBeGreaterThanOrEqual(1);
    // One read a file: 80 x 80 for a tile, the whole texture otherwise.
    expect(reads).toHaveLength(FACTION_GRASS_TILES_V7.length);
    expect(WORLD_TILES.length).toBeGreaterThanOrEqual(2);
  });

  it("gives a cell the part of the texture at its own place, modulo the period", () => {
    const { art } = harness();
    for (const [x, y] of [
      [0, 0],
      [5, 2],
      [6, 0],
      [13, 9],
      [-1, -1],
    ] as const) {
      const tile = pixelsOf(art.tile("DWARF", 3, { x, y }));
      // The cell's column and row of the 6 x 6 texture, whatever the
      // variant the hash gave it.
      expect([tile[0], tile[1]]).toEqual([
        ((x % 6) + 6) % 6,
        ((y % 6) + 6) % 6,
      ]);
      expect(tile.length).toBe(CELL * CELL * 4);
    }
    // One period apart is the same surface: nothing is made per cell.
    expect(art.tile("DWARF", 0, { x: 1, y: 2 })).toBe(
      art.tile("DWARF", 5, { x: 7, y: 8 }),
    );
    // The regolith's period is eight cells.
    expect(art.tile("MARTIAN", 0, { x: 1, y: 2 })).toBe(
      art.tile("MARTIAN", 0, { x: 9, y: 10 }),
    );
    expect(art.tile("MARTIAN", 0, { x: 1, y: 2 })).not.toBe(
      art.tile("MARTIAN", 0, { x: 7, y: 8 }),
    );
    // A ground of tiles ignores the place.
    expect(art.tile("CANDY", 2, { x: 0, y: 0 })).toBe(
      art.tile("CANDY", 2, { x: 4, y: 9 }),
    );
  });

  it("continues across a cell's edge: neighbours are neighbours in the texture", () => {
    const { art } = harness();
    const left = pixelsOf(art.tile("DWARF", 0, { x: 2, y: 3 }));
    const right = pixelsOf(art.tile("DWARF", 0, { x: 3, y: 3 }));
    // The last column of one cell and the first of the next are adjacent
    // columns of the texture (the test texture counts columns in blue).
    expect([left[0], left[(CELL - 1) * 4 + 2]]).toEqual([2, CELL - 1]);
    expect([right[0], right[2]]).toEqual([3, 0]);
  });

  it("spills into a neighbour with the texture of the neighbour's own place", () => {
    const { art } = harness();
    const spill = art.spill("DWARF", 0, GRASS_E, 0, { x: 4, y: 1 });
    expect(spill).not.toBeNull();
    const cut = pixelsOf(spill);
    // Opaque at the shared edge, in the texture's cell (4, 1).
    const at = (40 * CELL + CELL - 1) * 4;
    expect([cut[at], cut[at + 1], cut[at + 3]]).toEqual([4, 1, 255]);
    expect(cut[40 * CELL * 4 + 3]).toBe(0);
    expect(art.spill("DWARF", 2, GRASS_E, 0, { x: 10, y: 7 })).toBe(spill);
    expect(art.spill("DWARF", 0, GRASS_E, 0, { x: 5, y: 1 })).not.toBe(spill);
  });

  it("costs the board what tiles cost: one image a cell, the same surfaces every frame", () => {
    for (const [id, textured] of [
      ["DINOSAUR", false],
      ["DWARF", true],
    ] as const) {
      const { art, surfaces } = harness();
      const entries: FactionGrassEntryV7[] = [];
      for (let y = 0; y < 12; y += 1)
        for (let x = 0; x < 12; x += 1) entries.push(entry(x, y, id));
      const cells = factionGrassCellsV7(entries);
      const drawn: CanvasImageSource[] = [];
      const context = {
        save() {},
        restore() {},
        drawImage(image: CanvasImageSource) {
          drawn.push(image);
        },
        globalAlpha: 1,
        imageSmoothingEnabled: false,
      } as unknown as CanvasRenderingContext2D;
      const frame = {
        camera: { zoom: 1, offsetX: 0, offsetY: 0 },
        devicePixelRatio: 1,
        sceneAlpha: 1,
      } as const;
      const draw = (): void => {
        for (const item of entries)
          drawFactionGrassV7(context, frame, art, item, cells, false);
      };
      draw();
      const made = surfaces();
      expect(drawn).toHaveLength(144);
      draw();
      // The second frame makes no surface: every cell is cached.
      expect(surfaces()).toBe(made);
      expect(drawn).toHaveLength(288);
      expect(drawn.slice(144)).toEqual(drawn.slice(0, 144));
      // 36 different parts of the texture, where tiles have three.
      expect(new Set(drawn).size).toBe(textured ? 36 : 3);
    }
  });
});
