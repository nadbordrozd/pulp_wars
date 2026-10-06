import { describe, expect, it } from "vitest";
import type { ChibiArtAssetV7 } from "../../src/assets/chibi-art-v7";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  FOG_E,
  FOG_EDGE_CACHE_LIMIT_V7,
  FOG_EDGE_REACH_V7,
  FOG_N,
  FOG_NW,
  FOG_PHASES_V7,
  FOG_S,
  FOG_STYLE_ENABLED_V7,
  FOG_STYLE_V7,
  FOG_TEXTURE_SIZE_V7,
  FOG_W,
  createFogArtV7,
  drawFogEdgeV7,
  drawFogV7,
  fogCellsV7,
  fogDriftV7,
  fogEdgePixelsV7,
  fogStyleEnabledV7,
  fogTexturePixelsV7,
  fogWispPixelsV7,
  type FogEntryV7,
} from "../../src/render/canvas/fog-of-war-v7";
import {
  STARFIELD_ENABLED_V7,
  STARFIELD_V7,
  brightStarsV7,
  drawStarfieldV7,
  starLayerPlacementV7,
  starLayerV7,
  starfieldEnabledV7,
  twinkleAlphaV7,
} from "../../src/render/canvas/starfield-v7";
import { LIVE_DIRECTION_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  WATER_BLEND_PHASES_V7,
  WATER_BLEND_REACH_V7,
  WATER_BLEND_STYLE_V7,
  WATER_E,
  WATER_N,
  WATER_NE,
  WATER_S,
  WATER_W,
  createWaterBlendArtV7,
  drawWaterBlendV7,
  waterBlendCellsV7,
  waterBlendMaskV7,
  waterBlendStyleV7,
  waterDepthShareV7,
  type WaterBlendEntryV7,
} from "../../src/render/canvas/water-blend-v7";

/**
 * pulp_wars-2yc.17 (docs/art/ATMOSPHERE.md): the soft edge between shallow
 * and deep water, the cloud fog of war and the night sky behind the board,
 * each in the live look only and each behind a switch.
 */

const CELL = 80;

/** "g" Grass, "s" Shallow, "d" Deep, "?" fog, " " outside the map. */
function board(rows: readonly string[]): BoardRenderPlanEntryV7[] {
  const subjects = {
    g: "TERRAIN:GRASS",
    s: "TERRAIN:SHALLOW_WATER",
    d: "TERRAIN:DEEP_WATER",
  } as const;
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): BoardRenderPlanEntryV7[] =>
      mark === " "
        ? []
        : mark === "?"
          ? [{ key: `fog:${x},${y}`, kind: "FOG", layer: 0, at: { x, y } }]
          : [
              {
                key: `terrain:${x},${y}`,
                kind: "TERRAIN",
                layer: 0,
                at: { x, y },
                artSubject: subjects[mark as keyof typeof subjects],
              },
            ],
    ),
  );
}

type LogEntry = [string, ...unknown[]];

/**
 * A recording 2D context: every call is logged with the fill style of the
 * moment after its arguments, every change of alpha is logged, and every
 * property is kept.
 */
function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? (Reflect.get(target, key) as unknown)
            : (...args: unknown[]) => {
                log.push([String(key), ...args, Reflect.get(target, "style")]);
              },
      set: (target, key, value) => {
        if (key === "fillStyle") Reflect.set(target, "style", value);
        if (key === "globalAlpha") log.push(["globalAlpha", value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

const surfaces = {
  readPixels: (_image: CanvasImageSource, width: number, height: number) =>
    new Uint8ClampedArray(width * height * 4).fill(255),
  createSurface: (pixels: Uint8ClampedArray, width: number, height: number) =>
    ({ pixels, width, height }) as unknown as CanvasImageSource,
};

const frame = {
  camera: { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 },
  devicePixelRatio: 1,
  sceneAlpha: 1,
  viewport: { width: 800, height: 600 },
  timeMs: 0,
};

// ------------------------------------------------------------------ water

describe("the water blend switch", () => {
  it("is on by default and the query string overrides it", () => {
    expect(WATER_BLEND_STYLE_V7).toBe("SHELF");
    expect(waterBlendStyleV7("")).toBe("SHELF");
    expect(waterBlendStyleV7()).toBe("SHELF");
    for (const off of ["0", "off", "false"])
      expect(waterBlendStyleV7(`?art=chibi&water-blend=${off}`)).toBe("OFF");
    expect(waterBlendStyleV7("?water-blend=1")).toBe("SHELF");
    expect(waterBlendStyleV7("?water-blend=gradient")).toBe("GRADIENT");
    expect(waterBlendStyleV7("?water-blend=contour")).toBe("CONTOUR");
    expect(waterBlendStyleV7("?water-blend=both")).toBe("BOTH");
    expect(waterBlendStyleV7("?water-blend=what")).toBe("SHELF");
  });
});

describe("the water blend cells", () => {
  it("marks water beside water of the other depth, corners included", () => {
    const cells = waterBlendCellsV7(board(["ssd", "sss", "ggg"]));
    expect(cells.get("1,0")).toMatchObject({
      depth: "SHALLOW",
      neighbours: WATER_E,
    });
    expect(cells.get("2,0")?.depth).toBe("DEEP");
    expect((cells.get("2,0")?.neighbours ?? 0) & WATER_W).toBe(WATER_W);
    expect(cells.get("1,1")).toMatchObject({ neighbours: WATER_NE });
    // Away from the other depth, and on land: nothing.
    expect(cells.has("0,0")).toBe(false);
    expect(cells.has("1,2")).toBe(false);
    for (const cell of cells.values())
      expect(cell.phase).toBeLessThan(WATER_BLEND_PHASES_V7 ** 2);
  });

  it("reads explored cells only: fog has no depth", () => {
    expect(waterBlendCellsV7(board(["s?d"])).size).toBe(0);
    expect(waterBlendCellsV7(board(["s?", "?d"])).size).toBe(2);
    // The hidden cell's depth cannot change what is drawn: there is none.
    const entries: WaterBlendEntryV7[] = board(["s?"]);
    expect(waterBlendCellsV7(entries).size).toBe(0);
  });
});

describe("the water blend masks", () => {
  const styles = ["GRADIENT", "CONTOUR", "BOTH", "SHELF"] as const;

  it("are empty without a neighbour and stay near the edge", () => {
    for (const style of styles) {
      expect(
        waterBlendMaskV7(style, "SHALLOW", 0, 0).some((value) => value > 0),
      ).toBe(false);
      for (const depth of ["SHALLOW", "DEEP"] as const) {
        const mask = waterBlendMaskV7(style, depth, WATER_N, 4);
        let painted = 0;
        for (let y = 0; y < CELL; y += 1)
          for (let x = 0; x < CELL; x += 1) {
            if ((mask[y * CELL + x] ?? 0) === 0) continue;
            painted += 1;
            expect(y).toBeLessThan(WATER_BLEND_REACH_V7);
          }
        expect(painted).toBeGreaterThan(80);
      }
    }
    // Shallow and deep still read at a glance: most of a cell with the
    // other depth along one whole edge is untouched.
    const mask = waterBlendMaskV7("SHELF", "SHALLOW", WATER_N, 0);
    expect(mask.filter((value) => value > 0).length).toBeLessThan(
      CELL * CELL * 0.25,
    );
  });

  it("agree across the cells' edge, so there is no seam", () => {
    for (const style of ["GRADIENT", "BOTH"] as const)
      for (let x = 0; x < 3 * CELL; x += 7) {
        // Just inside the shallow cell and just inside the deep one.
        const above = waterDepthShareV7(style, 0.5, x + 0.5, 79.5);
        const below = waterDepthShareV7(style, -0.5, x + 0.5, 80.5);
        expect(Math.abs(above - below)).toBeLessThan(0.2);
      }
    // The mask of a shallow cell and of the deep cell under it add up to
    // the same depth along their shared edge.
    const shallow = waterBlendMaskV7("BOTH", "SHALLOW", WATER_S, 0);
    const deep = waterBlendMaskV7("BOTH", "DEEP", WATER_N, 3);
    for (let x = 0; x < CELL; x += 1) {
      const depthAbove = (shallow[(CELL - 1) * CELL + x] ?? 0) / 255;
      const depthBelow = 1 - (deep[x] ?? 0) / 255;
      expect(Math.abs(depthAbove - depthBelow)).toBeLessThan(0.2);
    }
  });

  it("wander: the contour is not the cells' straight edge", () => {
    const mask = waterBlendMaskV7("CONTOUR", "SHALLOW", WATER_N, 0);
    const depths = new Set<number>();
    for (let x = 0; x < CELL; x += 1) {
      let y = 0;
      while (y < CELL && (mask[y * CELL + x] ?? 0) > 127) y += 1;
      depths.add(y);
    }
    expect(depths.size).toBeGreaterThan(3);
    expect(Math.max(...depths)).toBeLessThanOrEqual(7);
    // The straight gradient is the same in every column.
    const straight = waterBlendMaskV7("GRADIENT", "SHALLOW", WATER_N, 0);
    for (let x = 1; x < CELL; x += 1)
      expect(straight[5 * CELL + x]).toBe(straight[5 * CELL]);
  });

  it("are deterministic", () => {
    for (const style of styles)
      expect(waterBlendMaskV7(style, "DEEP", WATER_W | WATER_S, 5)).toEqual(
        waterBlendMaskV7(style, "DEEP", WATER_W | WATER_S, 5),
      );
    expect(waterBlendMaskV7("SHELF", "DEEP", WATER_W, 4)).not.toEqual(
      waterBlendMaskV7("SHELF", "DEEP", WATER_W, 5),
    );
  });
});

describe("the water blend art and drawing", () => {
  it("cuts the other depth's tile once and draws it over the cell", () => {
    let built = 0;
    const art = createWaterBlendArtV7("SHELF", {
      readPixels: surfaces.readPixels,
      createSurface(pixels, width, height) {
        built += 1;
        return surfaces.createSurface(pixels, width, height);
      },
    });
    const entries = board(["sd", "ss"]);
    const cells = waterBlendCellsV7(entries);
    const deepTile = { tile: "deep" } as unknown as CanvasImageSource;
    const shallowTile = { tile: "shallow" } as unknown as CanvasImageSource;
    const asked: string[] = [];
    const other = (subject: string) => {
      asked.push(subject);
      return {
        image: subject === "TERRAIN:DEEP_WATER" ? deepTile : shallowTile,
        density: 1,
        smoothing: false,
      };
    };
    const { context, log } = recordingContext();
    for (const entry of entries)
      drawWaterBlendV7(context, frame, art, entry, cells, other);
    for (const entry of entries)
      drawWaterBlendV7(context, frame, art, entry, cells, other);
    const drawn = log.filter((call) => call[0] === "drawImage");
    // All four cells touch the other depth (one only at a corner).
    expect(drawn).toHaveLength(8);
    expect(built).toBe(4);
    expect(asked.slice(0, 2)).toEqual([
      "TERRAIN:DEEP_WATER",
      "TERRAIN:SHALLOW_WATER",
    ]);
    // The layer keeps the tile's colour and takes the mask as its alpha.
    const layer = drawn[0]?.[1] as { pixels: Uint8ClampedArray };
    expect(layer.pixels[0]).toBe(255);
    expect(layer.pixels.filter((_, at) => at % 4 === 3)).toEqual(
      waterBlendMaskV7("SHELF", "SHALLOW", WATER_E, 0),
    );
    // No art (the switch off), no cells, or a tile still loading: nothing.
    const quiet = recordingContext();
    const [first] = entries;
    if (first === undefined) throw new Error("no entry");
    drawWaterBlendV7(quiet.context, frame, null, first, cells, other);
    drawWaterBlendV7(quiet.context, frame, art, first, null, other);
    drawWaterBlendV7(quiet.context, frame, art, first, cells, () => null);
    expect(quiet.log).toHaveLength(0);
  });
});

// -------------------------------------------------------------------- fog

describe("the fog switch", () => {
  it("is on by default and the query string overrides it", () => {
    expect(FOG_STYLE_ENABLED_V7).toBe(true);
    expect(fogStyleEnabledV7("")).toBe(true);
    expect(fogStyleEnabledV7()).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(fogStyleEnabledV7(`?art=chibi&fog-style=${off}`)).toBe(false);
    expect(fogStyleEnabledV7("?fog-style=1")).toBe(true);
    expect(fogStyleEnabledV7("?fog-style=what")).toBe(true);
  });
});

describe("the fog's shape", () => {
  it("merges unexplored cells into rows and finds the cells beside them", () => {
    const cells = fogCellsV7(board(["??g", "?gg", "ggg"]));
    expect(cells.runs).toEqual([
      { y: 0, x0: 0, x1: 1 },
      { y: 1, x0: 0, x1: 0 },
    ]);
    expect(cells.edges.get("2,0")).toMatchObject({ neighbours: FOG_W });
    expect(cells.edges.get("1,1")).toMatchObject({
      neighbours: FOG_N | FOG_W | FOG_NW,
    });
    expect(cells.edges.get("2,1")).toMatchObject({ neighbours: FOG_NW });
    expect(cells.edges.has("2,2")).toBe(false);
    // The sky round the map gets the cloud's edge too.
    expect(cells.outside.map((cell) => `${cell.at.x},${cell.at.y}`)).toEqual(
      expect.arrayContaining(["-1,0", "0,-1", "-1,-1", "-1,2", "2,-1"]),
    );
    for (const cell of [...cells.edges.values(), ...cells.outside])
      expect(cell.phase).toBeLessThan(FOG_PHASES_V7 ** 2);
    expect(fogCellsV7(board(["gg", "gg"]))).toEqual({
      runs: [],
      edges: new Map(),
      outside: [],
    });
  });

  it("never depends on what an unexplored cell hides", () => {
    // The plan has only a FOG entry for an unexplored cell. Whatever else
    // the entries carry, the fog reads their kind and their place alone.
    const plain = board(["?g", "??"]);
    const loaded = plain.map((entry): FogEntryV7 =>
      entry.kind === "FOG"
        ? ({
            ...entry,
            artSubject: "TERRAIN:MOUNTAIN",
            assetId: "secret-city",
            ownerColor: "#ff0000",
          } as FogEntryV7)
        : entry,
    );
    expect(fogCellsV7(loaded)).toEqual(fogCellsV7(plain));
    // What the explored neighbour is does not matter either.
    expect(fogCellsV7(board(["?s", "??"]))).toEqual(fogCellsV7(plain));
  });
});

describe("the fog's pixels", () => {
  it("is an opaque texture that tiles and is the same every time", () => {
    const size = FOG_TEXTURE_SIZE_V7;
    const texture = fogTexturePixelsV7();
    expect(texture).toHaveLength(size * size * 4);
    expect(fogTexturePixelsV7()).toBe(texture);
    const colours = new Set<number>();
    let faintest = 255;
    for (let at = 0; at < texture.length; at += 4) {
      faintest = Math.min(faintest, texture[at + 3] ?? 0);
      colours.add(
        ((texture[at] ?? 0) << 16) |
          ((texture[at + 1] ?? 0) << 8) |
          (texture[at + 2] ?? 0),
      );
    }
    expect(faintest).toBe(255);
    // Mist, puffs and their rims; and it stays dark (the board is brighter).
    expect(colours.size).toBeGreaterThan(8);
    for (const colour of colours) expect((colour >> 8) & 255).toBeLessThan(110);
    // The left and right columns, and the top and bottom rows, are as alike
    // as neighbouring columns and rows inside the texture.
    const step = (a: number, b: number): number =>
      Math.abs((texture[a + 1] ?? 0) - (texture[b + 1] ?? 0));
    let seam = 0;
    let inside = 0;
    for (let i = 0; i < size; i += 1) {
      seam += step((i * size + size - 1) * 4, i * size * 4);
      seam += step(((size - 1) * size + i) * 4, i * 4);
      inside += step((i * size + 200) * 4, (i * size + 201) * 4);
      inside += step((200 * size + i) * 4, (201 * size + i) * 4);
    }
    expect(seam).toBeLessThan(inside * 3 + 200);
    const wisps = fogWispPixelsV7();
    expect(fogWispPixelsV7()).toBe(wisps);
    let strongest = 0;
    for (let at = 3; at < wisps.length; at += 4)
      strongest = Math.max(strongest, wisps[at] ?? 0);
    expect(strongest).toBeGreaterThan(0);
    expect(strongest).toBeLessThanOrEqual(
      Math.round(255 * FOG_STYLE_V7.wispAlpha),
    );
  });

  it("draws an edge that is irregular, feathered and close to the fog", () => {
    expect(fogEdgePixelsV7(0, 0).some((value) => value > 0)).toBe(false);
    const depths = new Set<number>();
    let soft = 0;
    for (let phase = 0; phase < FOG_PHASES_V7; phase += 1) {
      const pixels = fogEdgePixelsV7(FOG_N, phase);
      for (let x = 0; x < CELL; x += 1) {
        let depth = 0;
        while (
          depth < CELL &&
          (pixels[(depth * CELL + x) * 4 + 3] ?? 0) === 255
        )
          depth += 1;
        depths.add(depth);
        for (let y = 0; y < CELL; y += 1) {
          const alpha = pixels[(y * CELL + x) * 4 + 3] ?? 0;
          if (alpha > 0 && alpha < 255) soft += 1;
          // Explored ground keeps its edge: nothing far from the fog.
          if (alpha > 0) expect(y).toBeLessThan(FOG_EDGE_REACH_V7);
        }
      }
    }
    expect(depths.size).toBeGreaterThan(5);
    expect(Math.max(...depths)).toBeLessThanOrEqual(12);
    expect(soft).toBeGreaterThan(500);
    expect(fogEdgePixelsV7(FOG_E | FOG_S, 9)).toEqual(
      fogEdgePixelsV7(FOG_E | FOG_S, 9),
    );
  });

  it("meets the next cell's edge without a step", () => {
    const reach = (pixels: Uint8ClampedArray, x: number): number => {
      let y = 0;
      while (y < CELL && (pixels[(y * CELL + x) * 4 + 3] ?? 0) > 0) y += 1;
      return y;
    };
    for (let phase = 0; phase < FOG_PHASES_V7; phase += 1) {
      const left = fogEdgePixelsV7(FOG_N, phase);
      const right = fogEdgePixelsV7(FOG_N, (phase + 1) % FOG_PHASES_V7);
      expect(
        Math.abs(reach(left, CELL - 1) - reach(right, 0)),
      ).toBeLessThanOrEqual(2);
    }
  });
});

describe("the fog's art and drawing", () => {
  it("builds each surface once and keeps a bounded number of edges", () => {
    let built = 0;
    const art = createFogArtV7({
      createSurface(pixels, width, height) {
        built += 1;
        return surfaces.createSurface(pixels, width, height);
      },
    });
    const texture = art.texture();
    expect(art.texture()).toBe(texture);
    expect(art.wisps()).not.toBe(texture);
    const edge = art.edge(FOG_W, 3);
    expect(art.edge(FOG_W, 3)).toBe(edge);
    expect(built).toBe(3);
    for (let mask = 1; mask <= FOG_EDGE_CACHE_LIMIT_V7 / 2 + 8; mask += 1) {
      art.edge(mask % 256, 0);
      art.edge(mask % 256, 1);
    }
    const before = built;
    // The oldest edge was dropped and is rebuilt; a recent one is kept.
    art.edge(FOG_W, 3);
    expect(built).toBe(before + 1);
    art.edge(40, 1);
    expect(built).toBe(before + 1);
  });

  it("fills every unexplored cell in one path and nothing else", () => {
    const art = createFogArtV7(surfaces);
    const entries = board(["??g", "?gg"]);
    const cells = fogCellsV7(entries);
    const { context, log } = recordingContext();
    drawFogV7(context, frame, art, cells);
    const rects = log.filter((call) => call[0] === "rect");
    // One rectangle a row of fog: 2 cells of 80 px, then 1.
    expect(rects.map((call) => call.slice(1, 5))).toEqual([
      [0, 0, 160, 80],
      [0, 80, 80, 80],
    ]);
    // Without patterns (this fake) the fill is the flat fog colour.
    const fills = log.filter((call) => call[0] === "fill");
    expect(fills).toHaveLength(1);
    expect(fills[0]?.[1]).toBe(FOG_STYLE_V7.flat);
    // The cloud's edge over the sky round the map.
    expect(log.filter((call) => call[0] === "drawImage")).toHaveLength(
      cells.outside.length,
    );
    // The same frame draws the same calls.
    const again = recordingContext();
    drawFogV7(again.context, frame, art, cells);
    expect(again.log).toEqual(log);
    // No fog, no calls.
    const clear = recordingContext();
    drawFogV7(clear.context, frame, art, fogCellsV7(board(["gg"])));
    expect(clear.log).toHaveLength(0);
  });

  it("draws the edge over an explored cell beside the fog only", () => {
    const art = createFogArtV7(surfaces);
    const entries = board(["?gg"]);
    const cells = fogCellsV7(entries);
    const [, beside, far] = entries;
    if (beside === undefined || far === undefined) throw new Error("no entry");
    const { context, log } = recordingContext();
    drawFogEdgeV7(context, frame, art, beside, cells);
    const drawn = log.filter((call) => call[0] === "drawImage");
    expect(drawn).toHaveLength(1);
    expect(drawn[0]?.[1]).toBe(art.edge(FOG_W, 1));
    expect(drawn[0]?.slice(2, 6)).toEqual([80, 0, 80, 80]);
    const quiet = recordingContext();
    drawFogEdgeV7(quiet.context, frame, art, far, cells);
    drawFogEdgeV7(quiet.context, frame, null, beside, cells);
    drawFogEdgeV7(quiet.context, frame, art, beside, null);
    expect(quiet.log.filter((call) => call[0] === "drawImage")).toHaveLength(0);
  });

  it("holds the wisps still at time 0 and drifts them inside one tile", () => {
    expect(fogDriftV7(0)).toEqual({ x: 0, y: 0 });
    const later = fogDriftV7(10_000);
    expect(later.x).toBeCloseTo(10 * FOG_STYLE_V7.drift[0]);
    for (const time of [1, 1e6, 1e9]) {
      const drift = fogDriftV7(time);
      expect(drift.x).toBeGreaterThanOrEqual(0);
      expect(drift.x).toBeLessThan(FOG_TEXTURE_SIZE_V7);
      expect(drift.y).toBeGreaterThanOrEqual(0);
      expect(drift.y).toBeLessThan(FOG_TEXTURE_SIZE_V7);
    }
  });
});

// ------------------------------------------------------------------- stars

describe("the starfield switch", () => {
  it("is on by default and the query string overrides it", () => {
    expect(STARFIELD_ENABLED_V7).toBe(true);
    expect(starfieldEnabledV7("")).toBe(true);
    expect(starfieldEnabledV7()).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(starfieldEnabledV7(`?art=chibi&starfield=${off}`)).toBe(false);
    expect(starfieldEnabledV7("?starfield=1")).toBe(true);
    expect(starfieldEnabledV7("?starfield=what")).toBe(true);
  });
});

describe("the stars", () => {
  it("are the same list every time, inside the tile", () => {
    STARFIELD_V7.layers.forEach((layer, index) => {
      const stars = starLayerV7(index);
      expect(stars).toHaveLength(layer.stars);
      expect(starLayerV7(index)).toBe(stars);
      for (const star of stars) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThan(STARFIELD_V7.tile[0]);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThan(STARFIELD_V7.tile[1]);
      }
    });
    expect(starLayerV7(0)).not.toEqual(starLayerV7(1).slice(0, 110));
    expect(brightStarsV7()).toHaveLength(STARFIELD_V7.bright);
    expect(brightStarsV7()).toBe(brightStarsV7());
  });

  it("move with the camera by a small share, far layers least", () => {
    const shifts = STARFIELD_V7.layers.map((layer) => {
      const here = starLayerPlacementV7(layer, {
        zoom: 1,
        offsetX: 100,
        offsetY: 100,
      });
      const there = starLayerPlacementV7(layer, {
        zoom: 1,
        offsetX: 200,
        offsetY: 100,
      });
      expect(there.y).toBe(here.y);
      return there.x - here.x;
    });
    expect(shifts[0]).toBeGreaterThan(0);
    expect(shifts[1]).toBeGreaterThan(shifts[0] ?? 0);
    expect(shifts[2]).toBeGreaterThan(shifts[1] ?? 0);
    // Far less than the board, which moves by the whole 100 px.
    expect(shifts[2]).toBeLessThan(20);
    // Zoom spreads a layer a little; the nearest layer most.
    const scales = STARFIELD_V7.layers.map(
      (layer) =>
        starLayerPlacementV7(layer, { zoom: 2, offsetX: 0, offsetY: 0 }).scale,
    );
    expect(scales[0]).toBeGreaterThan(1);
    expect(scales[2]).toBeGreaterThan(scales[0] ?? 0);
    expect(scales[2]).toBeLessThan(1.25);
    // A layer's first tile always starts at or before the canvas's origin.
    for (const offset of [-5000, -1, 0, 1, 7777]) {
      const place = starLayerPlacementV7(STARFIELD_V7.layers[2], {
        zoom: 0.75,
        offsetX: offset,
        offsetY: -offset,
      });
      expect(place.x).toBeLessThanOrEqual(0);
      expect(place.x).toBeGreaterThan(-place.width - 1e-6);
      expect(place.y).toBeLessThanOrEqual(0);
    }
  });

  it("twinkle only with a running clock", () => {
    for (const star of brightStarsV7()) {
      expect(twinkleAlphaV7(star, 0)).toBe(1);
      for (const time of [1, 800, 1700, 5000]) {
        const alpha = twinkleAlphaV7(star, time);
        expect(alpha).toBeLessThanOrEqual(1);
        expect(alpha).toBeGreaterThanOrEqual(
          1 - STARFIELD_V7.twinkleDepth - 1e-9,
        );
      }
    }
  });

  it("fills the whole canvas with the sky first, the same way every time", () => {
    const sky = {
      viewport: { width: 1440, height: 900 },
      camera: { zoom: 1, offsetX: 312, offsetY: -80 },
      devicePixelRatio: 2,
      timeMs: 0,
    };
    const { context, log } = recordingContext();
    drawStarfieldV7(context, sky);
    expect(log[0]?.[0]).toBe("save");
    expect(log.find((call) => call[0] === "fillRect")).toEqual([
      "fillRect",
      0,
      0,
      1440,
      900,
      STARFIELD_V7.sky,
    ]);
    expect(log[log.length - 1]?.[0]).toBe("restore");
    const rects = log.filter((call) => call[0] === "rect");
    // Sparse: a few hundred small stars on a 1440 x 900 canvas.
    expect(rects.length).toBeGreaterThan(150);
    expect(rects.length).toBeLessThan(900);
    for (const rect of rects) {
      expect(rect[3]).toBeLessThanOrEqual(2);
      // Whole device pixels at a ratio of 2.
      expect(Number.isInteger((rect[1] as number) * 2)).toBe(true);
    }
    const again = recordingContext();
    drawStarfieldV7(again.context, sky);
    expect(again.log).toEqual(log);
    // A pan moves the stars.
    const panned = recordingContext();
    drawStarfieldV7(panned.context, {
      ...sky,
      camera: { ...sky.camera, offsetX: 512 },
    });
    expect(panned.log).not.toEqual(log);
  });
});

// --------------------------------------------------------------- the board

const tile = (id: string, subject: string): ChibiArtAssetV7 =>
  ({
    id,
    subject,
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: `/fixture/${id}.png`,
  }) as ChibiArtAssetV7;

const TILES = [
  tile("grass", "TERRAIN:GRASS"),
  tile("shallow", "TERRAIN:SHALLOW_WATER"),
  tile("deep", "TERRAIN:DEEP_WATER"),
];

function fakeChibi(): ChibiBoardArtV7 {
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = TILES.find((item) => item.subject === request.subject);
      if (asset === undefined) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset,
        image: { chibi: asset.id } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
      };
    },
  };
}

const legacyImages = {
  resolve: (assetId: string) =>
    ({ legacy: assetId }) as unknown as CanvasImageSource,
};

function drawBoard(options: {
  readonly live: boolean;
  readonly atmosphere: boolean;
  readonly reducedMotion?: boolean;
  readonly timeMs?: number;
}): LogEntry[] {
  const { context, log } = recordingContext();
  const plan: BoardRenderPlanV7 = {
    version: 7,
    entries: board(["?sd", "?gs"]),
    targets: [],
  };
  const chibiArt = fakeChibi();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 },
    plan,
    images: legacyImages,
    artSet: "CHIBI",
    chibiArt,
    ...(options.live
      ? { direction: { spec: LIVE_DIRECTION_V7, art: chibiArt } }
      : {}),
    ...(options.reducedMotion === undefined
      ? {}
      : { reducedMotion: options.reducedMotion }),
    ...(options.timeMs === undefined
      ? {}
      : { atmosphereTimeMs: options.timeMs }),
    ...(options.atmosphere
      ? {
          waterBlendArt: createWaterBlendArtV7("SHELF", surfaces),
          fogArt: createFogArtV7(surfaces),
          starfield: true,
        }
      : {}),
  });
  return log;
}

const size = (image: unknown): number | undefined =>
  (image as { width?: number } | undefined)?.width;

describe("the atmosphere on the board", () => {
  it("draws the old board when the three are not given (the switches off)", () => {
    const log = drawBoard({ live: true, atmosphere: false });
    // The flat background and the flat fog squares with their grid.
    expect(log).toContainEqual(["fillRect", 0, 0, 800, 600, "#173632"]);
    const fog = log.filter(
      (call) => call[0] === "fillRect" && call[5] === "#1c2a2e",
    );
    expect(fog).toHaveLength(2);
    expect(log.filter((call) => call[0] === "strokeRect")).toHaveLength(2);
    // Nothing of the new look: no path of stars or fog, no cut surface.
    expect(log.some((call) => call[0] === "rect")).toBe(false);
    expect(
      log.some(
        (call) => call[0] === "drawImage" && size(call[1]) !== undefined,
      ),
    ).toBe(false);
  });

  it("draws the old board outside the live look even when they are given", () => {
    const off = drawBoard({ live: false, atmosphere: false });
    const given = drawBoard({ live: false, atmosphere: true });
    expect(given).toEqual(off);
  });

  it("draws the sky, the cloud fog and the water's edge in the live look", () => {
    const log = drawBoard({ live: true, atmosphere: true });
    expect(log).not.toContainEqual(["fillRect", 0, 0, 800, 600, "#173632"]);
    expect(log).toContainEqual(["fillRect", 0, 0, 800, 600, STARFIELD_V7.sky]);
    // The fog: no squares, no grid; its two cells in one filled path.
    expect(
      log.some((call) => call[0] === "fillRect" && call[5] === "#1c2a2e"),
    ).toBe(false);
    expect(log.some((call) => call[0] === "strokeRect")).toBe(false);
    expect(
      log
        .filter((call) => call[0] === "rect" && call[3] === 80)
        .map((call) => call.slice(1, 5)),
    ).toEqual([
      [0, 0, 80, 80],
      [0, 80, 80, 80],
    ]);
    const fills = log.filter(
      (call) => call[0] === "fill" && call[1] === FOG_STYLE_V7.flat,
    );
    expect(fills).toHaveLength(1);
    // Cut surfaces (80 px): the water's blend on the three water cells
    // (each touches the other depth), the fog's edge on the two explored
    // cells beside it and on the sky cells round it.
    const cut = log.filter(
      (call) => call[0] === "drawImage" && size(call[1]) === 80,
    );
    const outside = fogCellsV7(board(["?sd", "?gs"])).outside.length;
    expect(cut).toHaveLength(3 + 2 + outside);
    // The sky is drawn before the fog, and the fog before any ground.
    const firstGround = log.findIndex(
      (call) =>
        call[0] === "drawImage" &&
        (call[1] as { chibi?: string }).chibi !== undefined,
    );
    const fogFill = log.findIndex(
      (call) => call[0] === "fill" && call[1] === FOG_STYLE_V7.flat,
    );
    const sky = log.findIndex(
      (call) => call[0] === "fillRect" && call[5] === STARFIELD_V7.sky,
    );
    expect(sky).toBeLessThan(fogFill);
    expect(fogFill).toBeLessThan(firstGround);
  });

  it("is the same picture for the same state, view and clock", () => {
    const first = drawBoard({ live: true, atmosphere: true, timeMs: 1234 });
    const second = drawBoard({ live: true, atmosphere: true, timeMs: 1234 });
    expect(second).toEqual(first);
    const later = drawBoard({ live: true, atmosphere: true, timeMs: 3000 });
    expect(later).not.toEqual(first);
  });

  it("holds everything still for reduced motion", () => {
    const still = drawBoard({ live: true, atmosphere: true, timeMs: 0 });
    for (const timeMs of [1234, 99_999])
      expect(
        drawBoard({
          live: true,
          atmosphere: true,
          reducedMotion: true,
          timeMs,
        }),
      ).toEqual(still);
  });
});
