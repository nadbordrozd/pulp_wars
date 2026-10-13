import { describe, expect, it, vi } from "vitest";
import { FACTION_GRASS_TILES_V7 } from "../../src/assets/faction-grass-manifest";
import type { ChibiForestRasterEnvironmentV7 } from "../../src/render/canvas/chibi-forest-v7";
import {
  GRASS_E,
  TEXTURED_GROUNDS_ENABLED_V7,
  createFactionGrassArtV7,
  drawFactionGrassV7,
  factionGrassCellsV7,
  texturedGroundsEnabledV7,
  type FactionGrassEntryV7,
  type FactionGrassIdV7,
} from "../../src/render/canvas/faction-grass-v7";
import {
  TEXTURED_GROUND_TILES_V7,
  factionGrassTilesV7,
} from "../../src/render/canvas/textured-grounds-experiment-v7";

/**
 * EXPERIMENT (bead pulp_wars-2yc.48, second round;
 * docs/art/TEXTURED_GROUNDS.md): a ground drawn as one large texture
 * sampled by a cell's place on the map. Off unless `?textured-grounds=1`.
 */

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

function harness(textured: boolean) {
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
    tiles: factionGrassTilesV7(textured),
  }).resolve();
  if (art === null) throw new Error("no art");
  return { art, reads, surfaces: () => surfaces };
}

const pixelsOf = (image: CanvasImageSource | null): Uint8ClampedArray =>
  (image as unknown as { pixels: Uint8ClampedArray }).pixels;

describe("the textured grounds switch", () => {
  it("is off, and on only by the query parameter", () => {
    expect(TEXTURED_GROUNDS_ENABLED_V7).toBe(false);
    expect(texturedGroundsEnabledV7("")).toBe(false);
    expect(texturedGroundsEnabledV7("?faction-grass=1")).toBe(false);
    expect(texturedGroundsEnabledV7("?textured-grounds=1")).toBe(true);
    expect(texturedGroundsEnabledV7("?textured-grounds=0")).toBe(false);
    expect(texturedGroundsEnabledV7("?textured-grounds=maybe")).toBe(false);
  });

  it("leaves the tiles as they are when off", () => {
    expect(factionGrassTilesV7(false)).toBe(FACTION_GRASS_TILES_V7);
    // On: one texture each for the grounds that have one, in place of
    // their tiles; every other ground keeps its tiles.
    const on = factionGrassTilesV7(true);
    for (const world of TEXTURED_GROUND_TILES_V7) {
      expect(world.world).toEqual({ columns: 6, rows: 6 });
      expect(on.filter((tile) => tile.id === world.id)).toEqual([world]);
    }
    expect(on.filter((tile) => tile.id === "CANDY")).toEqual(
      FACTION_GRASS_TILES_V7.filter((tile) => tile.id === "CANDY"),
    );
    // Samples: no asset manifest lists them, so nothing preloads them.
    for (const world of TEXTURED_GROUND_TILES_V7)
      expect(
        FACTION_GRASS_TILES_V7.some((tile) => tile.url === world.url),
      ).toBe(false);
  });
});

describe("a ground sampled by map place", () => {
  it("reads its texture once and cuts it into its cells", () => {
    const { reads } = harness(true);
    expect(
      reads.filter(([width, height]) => width === 480 && height === 480),
    ).toHaveLength(TEXTURED_GROUND_TILES_V7.length);
  });

  it("gives a cell the part of the texture at its own place, modulo the period", () => {
    const { art } = harness(true);
    for (const [x, y] of [
      [0, 0],
      [5, 2],
      [6, 0],
      [13, 9],
      [-1, -1],
    ] as const) {
      const tile = pixelsOf(art.tile("MARTIAN", 3, { x, y }));
      // The cell's column and row of the 6 x 6 texture, whatever the
      // variant the hash gave it.
      expect([tile[0], tile[1]]).toEqual([
        ((x % 6) + 6) % 6,
        ((y % 6) + 6) % 6,
      ]);
      expect(tile.length).toBe(CELL * CELL * 4);
    }
    // One period apart is the same surface: nothing is made per cell.
    expect(art.tile("MARTIAN", 0, { x: 1, y: 2 })).toBe(
      art.tile("MARTIAN", 5, { x: 7, y: 8 }),
    );
    // A ground of tiles ignores the place.
    expect(art.tile("CANDY", 2, { x: 0, y: 0 })).toBe(
      art.tile("CANDY", 2, { x: 4, y: 9 }),
    );
  });

  it("continues across a cell's edge: neighbours are neighbours in the texture", () => {
    const { art } = harness(true);
    const left = pixelsOf(art.tile("DWARF", 0, { x: 2, y: 3 }));
    const right = pixelsOf(art.tile("DWARF", 0, { x: 3, y: 3 }));
    // The last column of one cell and the first of the next are adjacent
    // columns of the texture (the test texture counts columns in blue).
    expect([left[0], left[(CELL - 1) * 4 + 2]]).toEqual([2, CELL - 1]);
    expect([right[0], right[2]]).toEqual([3, 0]);
  });

  it("spills into a neighbour with the texture of the neighbour's own place", () => {
    const { art } = harness(true);
    const spill = art.spill("MARTIAN", 0, GRASS_E, 0, { x: 4, y: 1 });
    expect(spill).not.toBeNull();
    const cut = pixelsOf(spill);
    // Opaque at the shared edge, in the texture's cell (4, 1).
    const at = (40 * CELL + CELL - 1) * 4;
    expect([cut[at], cut[at + 1], cut[at + 3]]).toEqual([4, 1, 255]);
    expect(cut[40 * CELL * 4 + 3]).toBe(0);
    expect(art.spill("MARTIAN", 2, GRASS_E, 0, { x: 10, y: 7 })).toBe(spill);
    expect(art.spill("MARTIAN", 0, GRASS_E, 0, { x: 5, y: 1 })).not.toBe(spill);
  });

  it("costs the board what tiles cost: one image a cell, the same surfaces every frame", () => {
    for (const textured of [false, true]) {
      const { art, surfaces } = harness(textured);
      const entries: FactionGrassEntryV7[] = [];
      for (let y = 0; y < 12; y += 1)
        for (let x = 0; x < 12; x += 1) entries.push(entry(x, y, "MARTIAN"));
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
