import { vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { CHIBI_FOREST_ART_SET_V7 } from "../../src/assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../../src/assets/chibi-mountain-ranges-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "../../src/assets/faction-forest-pieces-manifest";
import { FACTION_GRASS_TILES_V7 } from "../../src/assets/faction-grass-manifest";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  createChibiForestArtV7,
  type ChibiForestRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-forest-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { createChibiMassifArtV7 } from "../../src/render/canvas/chibi-massif-v7";
import {
  createFactionForestArtV7,
  type FactionForestIdV7,
} from "../../src/render/canvas/faction-forests-v7";
import { createFactionGrassArtV7 } from "../../src/render/canvas/faction-grass-v7";
import { createFogArtV7 } from "../../src/render/canvas/fog-of-war-v7";
import type { TerrainGhostV7 } from "../../src/render/canvas/terrain-at-fog-v7";
import type { TileHopV7 } from "../../src/render/canvas/terrain-ripple-v7";
import { LIVE_DIRECTION_V7 } from "../../src/render/canvas/visual-direction-v7";

/**
 * A small board drawn by the real board renderer with the real forest,
 * massif, faction and fog code over fake rasters (bead pulp_wars-2yc.28):
 * the tests of terrain at the fog, of a wood changing hands and of the
 * territory ripple read what was painted where.
 */

export type TerrainEntry = BoardRenderPlanEntryV7;

export const CELL = 80;

const SUBJECTS: Readonly<Record<string, ArtSubjectV7>> = {
  M: "TERRAIN:MOUNTAIN",
  F: "TERRAIN:FOREST",
  g: "TERRAIN:GRASS",
  s: "TERRAIN:SHALLOW_WATER",
};
const ASSET_IDS: Readonly<Record<string, string>> = {
  M: "terrain-ruleset7-revision3-mountain-1",
  F: "terrain-ruleset7-original-forest-1",
  g: "terrain-ruleset7-original-grass-1",
  s: "terrain-ruleset7-water-shallow",
};

/**
 * The entries of a board from rows of marks: "M" Mountain, "F" Forest, "g"
 * Grass, "s" water, "?" fog, " " outside the map. `faction` puts every land
 * cell in that faction's territory.
 */
export function terrainBoard(
  rows: readonly string[],
  faction?: FactionForestIdV7,
): TerrainEntry[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): TerrainEntry[] => {
      if (mark === " ") return [];
      if (mark === "?")
        return [{ key: `fog:${x},${y}`, kind: "FOG", layer: 0, at: { x, y } }];
      const subject = SUBJECTS[mark];
      if (subject === undefined) throw new Error(`unknown mark ${mark}`);
      return [
        {
          key: `terrain:${x},${y}`,
          kind: "TERRAIN",
          layer: 1,
          at: { x, y },
          assetId: ASSET_IDS[mark] as string,
          artSubject: subject,
          // The Ice Folk have a forest and no grass of their own (Snow).
          ...(faction !== undefined && faction !== "ICE_FOLK" && mark !== "s"
            ? { factionGrass: faction }
            : {}),
          ...(faction !== undefined && mark === "F"
            ? { factionForest: faction }
            : {}),
        },
      ];
    }),
  );
}

/** `rows` with the cells `hidden` marks with "?" turned to fog. */
export function hide(
  rows: readonly string[],
  hidden: readonly string[],
): string[] {
  return rows.map((row, y) =>
    [...row].map((mark, x) => (hidden[y]?.[x] === "?" ? "?" : mark)).join(""),
  );
}

/** The ghosts of `rows` under `hidden`: its hidden Forest and Mountain. */
export function ghostsOf(
  rows: readonly string[],
  hidden: readonly string[],
  faction?: FactionForestIdV7,
): TerrainGhostV7[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): TerrainGhostV7[] =>
      hidden[y]?.[x] === "?" && (mark === "M" || mark === "F")
        ? [
            {
              key: `ghost:${x},${y}`,
              kind: "TERRAIN",
              layer: 1,
              at: { x, y },
              artSubject: mark === "M" ? "TERRAIN:MOUNTAIN" : "TERRAIN:FOREST",
              ...(faction !== undefined && mark === "F"
                ? { factionForest: faction }
                : {}),
              ghost: true,
            },
          ]
        : [],
    ),
  );
}

export interface FakeImage {
  readonly url?: string;
  readonly surface?: number;
  readonly of?: string;
  readonly width?: number;
  readonly height?: number;
}

/** A raster environment that settles at once and numbers its surfaces. */
export function fakeRasters(of: string): ChibiForestRasterEnvironmentV7 {
  let surfaces = 0;
  return {
    loadImage(url, settle) {
      settle(true);
      return { url, of } as unknown as CanvasImageSource;
    },
    readPixels: (_image, width, height) =>
      new Uint8ClampedArray(width * height * 4).fill(200),
    createSurface(_pixels, width, height) {
      surfaces += 1;
      return {
        surface: surfaces,
        of,
        width,
        height,
      } as unknown as CanvasImageSource;
    },
  };
}

const tall = (subject: ArtSubjectV7, id: string): ChibiArtAssetV7 => ({
  id,
  subject,
  assetClass: "TALL_TERRAIN",
  width: 80,
  height: 104,
  url: `/fixture/${id}.png`,
  layers: {
    bodyUrl: `/fixture/${id}.body.png`,
    groundUrl: "/fixture/ground.png",
  },
});
const flat = (subject: ArtSubjectV7, id: string): ChibiArtAssetV7 => ({
  id,
  subject,
  assetClass: "TERRAIN",
  width: 80,
  height: 80,
  url: `/fixture/${id}.png`,
});
const ASSETS: readonly ChibiArtAssetV7[] = [
  tall("TERRAIN:MOUNTAIN", "mountain"),
  tall("TERRAIN:FOREST", "forest"),
  flat("TERRAIN:GRASS", "grass"),
  flat("TERRAIN:SHALLOW_WATER", "shallow"),
  // The Rift's six pieces (pulp_wars-2yc.37).
  flat("TERRAIN:RIFT_H_WEST", "rift-h-west"),
  flat("TERRAIN:RIFT_H_MIDDLE", "rift-h-middle"),
  flat("TERRAIN:RIFT_H_EAST", "rift-h-east"),
  flat("TERRAIN:RIFT_V_NORTH", "rift-v-north"),
  flat("TERRAIN:RIFT_V_MIDDLE", "rift-v-middle"),
  flat("TERRAIN:RIFT_V_SOUTH", "rift-v-south"),
];

function fakeChibi(): ChibiBoardArtV7 {
  const layers = new Map<string, { ground: unknown; body: unknown }>();
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = ASSETS.find((item) => item.subject === request.subject);
      if (asset === undefined) return { kind: "MISSING" };
      let own = layers.get(asset.id);
      if (own === undefined) {
        own = {
          ground: { of: "ground", url: asset.id },
          body: { of: "clump", url: asset.id },
        };
        layers.set(asset.id, own);
      }
      return {
        kind: "READY",
        asset,
        image: { of: "master", url: asset.id } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
        ...("layers" in asset
          ? {
              layers: {
                ground: own.ground as CanvasImageSource,
                body: own.body as CanvasImageSource,
              },
            }
          : {}),
      };
    },
  };
}

/** The art objects of one board host: built once, used for every frame. */
export function terrainArt() {
  const forestBase = createChibiForestArtV7({
    environment: fakeRasters("forest"),
    redraw: vi.fn(),
    set: CHIBI_FOREST_ART_SET_V7,
  });
  return {
    chibi: fakeChibi(),
    forest: createFactionForestArtV7({
      environment: fakeRasters("faction-forest"),
      redraw: vi.fn(),
      base: forestBase,
      sets: FACTION_FOREST_ART_SETS_V7,
    }),
    mountain: createChibiMassifArtV7({
      environment: fakeRasters("massif"),
      redraw: vi.fn(),
      set: CHIBI_MOUNTAIN_ART_SET_V7,
    }),
    grass: createFactionGrassArtV7({
      environment: fakeRasters("grass"),
      redraw: vi.fn(),
      tiles: FACTION_GRASS_TILES_V7,
    }),
    fog: createFogArtV7(fakeRasters("fog")),
  };
}

export type TerrainArt = ReturnType<typeof terrainArt>;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One `drawImage`: what, where, and the clip it was drawn inside. */
export interface Paint {
  readonly image: FakeImage;
  readonly to: Rect;
  /** The clip's rectangles, or null when nothing clipped the draw. */
  readonly clip: readonly Rect[] | null;
  /** The vertical stretch and shift of the transform it was drawn under. */
  readonly scaleY: number;
  readonly shiftY: number;
}

/**
 * Draws a plan with the real board renderer (live look, the cloud fog) and
 * returns every image painted. The camera puts cell (x, y) at
 * (x * 80, y * 80).
 */
export function paintBoard(
  entries: readonly TerrainEntry[],
  options: {
    readonly art?: TerrainArt;
    readonly ghosts?: readonly TerrainGhostV7[];
    readonly tileHops?: readonly TileHopV7[];
    readonly fog?: boolean;
  } = {},
): Paint[] {
  const art = options.art ?? terrainArt();
  const paints: Paint[] = [];
  interface State {
    clip: Rect[] | null;
    scaleY: number;
    shiftY: number;
  }
  let state: State = { clip: null, scaleY: 1, shiftY: 0 };
  const stack: State[] = [];
  let path: Rect[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? (Reflect.get(target, key) as unknown)
            : (...args: unknown[]) => {
                const numbers = args as number[];
                if (key === "save") stack.push({ ...state });
                else if (key === "restore")
                  state = stack.pop() ?? {
                    clip: null,
                    scaleY: 1,
                    shiftY: 0,
                  };
                else if (key === "beginPath") path = [];
                else if (key === "rect")
                  path.push({
                    x: numbers[0] ?? 0,
                    y: numbers[1] ?? 0,
                    width: numbers[2] ?? 0,
                    height: numbers[3] ?? 0,
                  });
                else if (key === "clip") state.clip = [...path];
                else if (key === "translate")
                  state.shiftY += (numbers[1] ?? 0) * state.scaleY;
                else if (key === "scale") state.scaleY *= numbers[1] ?? 1;
                else if (key === "setTransform")
                  state = { ...state, scaleY: 1, shiftY: 0 };
                else if (key === "drawImage") {
                  const to = args.length === 5 ? args.slice(1) : args.slice(5);
                  paints.push({
                    image: args[0] as FakeImage,
                    to: {
                      x: to[0] as number,
                      y: to[1] as number,
                      width: to[2] as number,
                      height: to[3] as number,
                    },
                    clip: state.clip,
                    scaleY: state.scaleY,
                    shiftY: state.shiftY,
                  });
                }
              },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  ) as CanvasRenderingContext2D;
  const plan: BoardRenderPlanV7 = {
    version: 7,
    entries,
    targets: [],
    ...(options.ghosts === undefined ? {} : { ghosts: options.ghosts }),
  };
  drawBoardV7({
    context,
    viewport: { width: 2400, height: 2400 },
    devicePixelRatio: 1,
    camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(1) },
    plan,
    images: {
      resolve: (assetId: string) =>
        ({ of: "legacy", url: assetId }) as unknown as CanvasImageSource,
    },
    artSet: "CHIBI",
    chibiArt: art.chibi,
    direction: { spec: LIVE_DIRECTION_V7, art: art.chibi },
    forestArt: art.forest,
    mountainArt: art.mountain,
    factionGrassArt: art.grass,
    ...(options.fog === false ? {} : { fogArt: art.fog }),
    ...(options.tileHops === undefined ? {} : { tileHops: options.tileHops }),
  });
  return paints;
}

const overlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

const cut = (a: Rect, b: Rect): Rect => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.min(a.x + a.width, b.x + b.width) - x,
    height: Math.min(a.y + a.height, b.y + b.height) - y,
  };
};

/** The rectangles a paint really covers: its place cut by its clip. */
export function covered(paint: Paint): Rect[] {
  return (
    paint.clip === null ? [paint.to] : paint.clip.map((c) => cut(paint.to, c))
  ).filter((rect) => rect.width > 0 && rect.height > 0);
}

export const cellRect = (x: number, y: number): Rect => ({
  x: x * CELL,
  y: y * CELL,
  width: CELL,
  height: CELL,
});

/** Whether a paint puts anything on cell (x, y). */
export const paintsOn = (paint: Paint, x: number, y: number): boolean =>
  covered(paint).some((rect) => overlap(rect, cellRect(x, y)));

/** The cells of `rows` marked "?". */
export function fogCells(rows: readonly string[]): [number, number][] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): [number, number][] =>
      mark === "?" ? [[x, y]] : [],
    ),
  );
}
