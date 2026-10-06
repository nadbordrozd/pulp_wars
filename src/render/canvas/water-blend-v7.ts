import { chibiForestRectV7 } from "./chibi-forest-v7";
import type { CameraState } from "./geometry";

/**
 * The edge between shallow and deep water (bead pulp_wars-2yc.17,
 * docs/art/ATMOSPHERE.md). The user, 2026-10-06: "make the boundary between
 * shallow water and deep water less sharp. could be a gradient or could be a
 * more irregular boundary or both."
 *
 * In the live look of the CHIBI art set the two waters no longer meet along
 * the cells' straight edges. Each water cell with water of the other depth
 * beside it (or at a corner) draws, over its own tile, the other depth's
 * tile through a mask:
 *
 * - the **contour** between the two wanders up to about 6 px to either side
 *   of the cells' edge, as a sum of three waves over board pixels that
 *   repeats every three cells, so two cells meet without a step and a long
 *   edge does not repeat cell by cell;
 * - on the shallow side of that contour lies a **shelf**: a band about 7 px
 *   wide, of uneven width, where the water is half way between the two
 *   depths. The depth so changes in two soft steps, a gradient drawn the
 *   way the rest of the board is shaded (flat tones, no blur).
 *
 * Everything is cut from one distance field (the distance to the nearest
 * neighbouring cell of the other depth, corners included), read from the
 * explored cells only. More than a quarter of a cell from the edge a cell
 * is exactly its own tile, so shallow and deep still read at a glance.
 *
 * To turn it off: set WATER_BLEND_STYLE_V7 to "OFF", or open the game with
 * `?water-blend=0`. `?water-blend=gradient`, `contour` and `both` draw the
 * variants that were tried and not chosen. The classic look and the LEGACY
 * art set never draw it.
 */

/**
 * - `GRADIENT`: a straight edge, a soft gradient across it.
 * - `CONTOUR`: a wandering edge, hard.
 * - `BOTH`: the wandering edge with the soft gradient across it.
 * - `SHELF`: the wandering edge with a half-depth band beside it (the one
 *   in use).
 */
export type WaterBlendStyleV7 =
  "OFF" | "GRADIENT" | "CONTOUR" | "BOTH" | "SHELF";

/** The master switch. "OFF" draws the water exactly as before the bead. */
export const WATER_BLEND_STYLE_V7: WaterBlendStyleV7 = "SHELF";

/** `?water-blend=0` (or `off`, `false`) turns it off, `=1` on. */
export const WATER_BLEND_PARAMETER_V7 = "water-blend";

export function waterBlendStyleV7(search?: string): WaterBlendStyleV7 {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(WATER_BLEND_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return WATER_BLEND_STYLE_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return "OFF";
  if (text === "gradient") return "GRADIENT";
  if (text === "contour") return "CONTOUR";
  if (text === "both") return "BOTH";
  if (text === "shelf") return "SHELF";
  return WATER_BLEND_STYLE_V7;
}

const CELL = 80;
/** The contour's waves repeat every this many cells. */
export const WATER_BLEND_PHASES_V7 = 3;

/** Neighbour bits of a blend mask: where the other depth lies. */
export const WATER_N = 1;
export const WATER_E = 2;
export const WATER_S = 4;
export const WATER_W = 8;
export const WATER_NE = 16;
export const WATER_SE = 32;
export const WATER_SW = 64;
export const WATER_NW = 128;

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [0, -1, WATER_N],
  [1, 0, WATER_E],
  [0, 1, WATER_S],
  [-1, 0, WATER_W],
  [1, -1, WATER_NE],
  [1, 1, WATER_SE],
  [-1, 1, WATER_SW],
  [-1, -1, WATER_NW],
];

export const WATER_BLEND_V7 = {
  /** The contour's three waves, master px (their sum is at most 6.2). */
  waves: [3.6, 2, 0.6],
  /** Half the width of the gradient: GRADIENT alone, and BOTH. */
  gradientHalf: 15,
  bothHalf: 11,
  /** SHELF: the half-depth band's mean width, its wave, and its share. */
  shelfWidth: 7,
  shelfWave: 2.4,
  shelfDepth: 0.5,
  /** The soft edge of a hard step, and of the shelf's outer edge, px. */
  feather: 1,
  shelfFeather: 2,
} as const;

/** The farthest from the cells' edge that any style paints, px. */
export const WATER_BLEND_REACH_V7 = 27;

export type WaterDepthV7 = "SHALLOW" | "DEEP";

const smooth = (edge0: number, edge1: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * How deep the water is drawn at a point, 0 (shallow) to 1 (deep). `signed`
 * is the distance from the cells' edge in master px, positive on the
 * shallow side; `wx`, `wy` are board pixels.
 */
export function waterDepthShareV7(
  style: Exclude<WaterBlendStyleV7, "OFF">,
  signed: number,
  wx: number,
  wy: number,
): number {
  const spec = WATER_BLEND_V7;
  const turn = (2 * Math.PI) / (CELL * WATER_BLEND_PHASES_V7);
  const contour =
    style === "GRADIENT"
      ? 0
      : spec.waves[0] * Math.sin(turn * (4 * wx + 5 * wy) + 1.3) +
        spec.waves[1] * Math.sin(turn * (11 * wy - 13 * wx) + 0.4) +
        spec.waves[2] * Math.sin(turn * (17 * wx + 19 * wy) + 3.1);
  // Positive on the shallow side of the drawn contour.
  const across = signed - contour;
  if (style === "GRADIENT")
    return 1 - smooth(-spec.gradientHalf, spec.gradientHalf, across);
  if (style === "BOTH")
    return 1 - smooth(-spec.bothHalf, spec.bothHalf, across);
  const step = 1 - smooth(-spec.feather, spec.feather, across);
  if (style === "CONTOUR") return step;
  const shelf =
    spec.shelfWidth +
    spec.shelfWave * Math.sin(turn * (8 * wx - 7 * wy) + 2.2) +
    0.9 * Math.sin(turn * (20 * wx + 17 * wy) + 5.0);
  const band =
    1 - smooth(-spec.shelfFeather, spec.shelfFeather, across - shelf);
  return Math.max(step, spec.shelfDepth * band);
}

/**
 * The mask (CELL x CELL, 0 to 255) of the other depth's tile over a water
 * cell. `neighbours` are the cells of the other depth around it and `phase`
 * the cell's place in the PHASES x PHASES repeat.
 */
export function waterBlendMaskV7(
  style: Exclude<WaterBlendStyleV7, "OFF">,
  depth: WaterDepthV7,
  neighbours: number,
  phase: number,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(CELL * CELL);
  if (neighbours === 0) return mask;
  const originX = (phase % WATER_BLEND_PHASES_V7) * CELL;
  const originY = Math.floor(phase / WATER_BLEND_PHASES_V7) * CELL;
  for (let y = 0; y < CELL; y += 1)
    for (let x = 0; x < CELL; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let distance = Infinity;
      if ((neighbours & WATER_N) !== 0) distance = Math.min(distance, py);
      if ((neighbours & WATER_S) !== 0)
        distance = Math.min(distance, CELL - py);
      if ((neighbours & WATER_W) !== 0) distance = Math.min(distance, px);
      if ((neighbours & WATER_E) !== 0)
        distance = Math.min(distance, CELL - px);
      if ((neighbours & WATER_NE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - px, py));
      if ((neighbours & WATER_SE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - px, CELL - py));
      if ((neighbours & WATER_SW) !== 0)
        distance = Math.min(distance, Math.hypot(px, CELL - py));
      if ((neighbours & WATER_NW) !== 0)
        distance = Math.min(distance, Math.hypot(px, py));
      if (distance > WATER_BLEND_REACH_V7) continue;
      const share = waterDepthShareV7(
        style,
        depth === "SHALLOW" ? distance : -distance,
        originX + px,
        originY + py,
      );
      // A shallow cell is painted with deep water, a deep one with shallow.
      mask[y * CELL + x] = Math.round(
        255 * (depth === "SHALLOW" ? share : 1 - share),
      );
    }
  return mask;
}

// ------------------------------------------------------------------- cells

/** What the blend reads of a board plan entry. */
export interface WaterBlendEntryV7 {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject?: string;
}

export interface WaterBlendCellV7 {
  readonly depth: WaterDepthV7;
  readonly neighbours: number;
  readonly phase: number;
}

export const SHALLOW_WATER_SUBJECT_V7 = "TERRAIN:SHALLOW_WATER";
export const DEEP_WATER_SUBJECT_V7 = "TERRAIN:DEEP_WATER";

const modulo = (value: number, by: number): number => ((value % by) + by) % by;

/**
 * The blend of every explored water cell that has one. A pure function of
 * the plan's terrain entries: an unexplored neighbour has no depth, so the
 * blend never shows what the player has not seen.
 */
export function waterBlendCellsV7(
  entries: readonly WaterBlendEntryV7[],
): ReadonlyMap<string, WaterBlendCellV7> {
  const depths = new Map<string, WaterDepthV7>();
  const water: WaterBlendEntryV7[] = [];
  for (const entry of entries) {
    if (entry.kind !== "TERRAIN") continue;
    const depth =
      entry.artSubject === SHALLOW_WATER_SUBJECT_V7
        ? "SHALLOW"
        : entry.artSubject === DEEP_WATER_SUBJECT_V7
          ? "DEEP"
          : null;
    if (depth === null) continue;
    water.push(entry);
    depths.set(`${entry.at.x},${entry.at.y}`, depth);
  }
  const cells = new Map<string, WaterBlendCellV7>();
  for (const entry of water) {
    const { x, y } = entry.at;
    const depth = depths.get(`${x},${y}`);
    if (depth === undefined) continue;
    let neighbours = 0;
    for (const [dx, dy, bit] of NEIGHBOURS) {
      const other = depths.get(`${x + dx},${y + dy}`);
      if (other !== undefined && other !== depth) neighbours |= bit;
    }
    if (neighbours === 0) continue;
    cells.set(`${x},${y}`, {
      depth,
      neighbours,
      phase:
        modulo(x, WATER_BLEND_PHASES_V7) +
        WATER_BLEND_PHASES_V7 * modulo(y, WATER_BLEND_PHASES_V7),
    });
  }
  return cells;
}

const cellsByEntries = new WeakMap<
  object,
  ReadonlyMap<string, WaterBlendCellV7>
>();

/** `waterBlendCellsV7`, computed once per plan. */
export function waterBlendCellsOfV7(
  entries: readonly WaterBlendEntryV7[],
): ReadonlyMap<string, WaterBlendCellV7> {
  let cells = cellsByEntries.get(entries);
  if (cells === undefined) {
    cells = waterBlendCellsV7(entries);
    cellsByEntries.set(entries, cells);
  }
  return cells;
}

// --------------------------------------------------------------------- art

export interface WaterBlendArtV7 {
  readonly style: Exclude<WaterBlendStyleV7, "OFF">;
  /**
   * The other depth's tile `other` (a square raster `density` times the
   * master), cut to the cell's mask. Null when pixels cannot be read.
   */
  layer(
    cell: WaterBlendCellV7,
    other: CanvasImageSource,
    density: number,
  ): CanvasImageSource | null;
}

/** The masked tiles as surfaces, each built on first use and kept. */
export function createWaterBlendArtV7(
  style: Exclude<WaterBlendStyleV7, "OFF">,
  environment: {
    readPixels(
      image: CanvasImageSource,
      width: number,
      height: number,
    ): Uint8ClampedArray | null;
    createSurface(
      pixels: Uint8ClampedArray,
      width: number,
      height: number,
    ): CanvasImageSource | null;
  },
): WaterBlendArtV7 {
  const masks = new Map<string, Uint8ClampedArray>();
  const layers = new WeakMap<object, Map<string, CanvasImageSource | null>>();
  return {
    style,
    layer(cell, other, density) {
      let ofImage = layers.get(other);
      if (ofImage === undefined) {
        ofImage = new Map();
        layers.set(other, ofImage);
      }
      const key = `${cell.depth}:${cell.neighbours}:${cell.phase}`;
      const known = ofImage.get(key);
      if (known !== undefined) return known;
      let mask = masks.get(key);
      if (mask === undefined) {
        mask = waterBlendMaskV7(style, cell.depth, cell.neighbours, cell.phase);
        masks.set(key, mask);
      }
      const scale = density === 2 || density === 3 ? density : 1;
      const size = CELL * scale;
      const read = environment.readPixels(other, size, size);
      let surface: CanvasImageSource | null = null;
      if (read !== null && read.length === size * size * 4) {
        const pixels = new Uint8ClampedArray(read);
        for (let y = 0; y < size; y += 1)
          for (let x = 0; x < size; x += 1) {
            const share =
              (mask[Math.floor(y / scale) * CELL + Math.floor(x / scale)] ??
                0) / 255;
            const at = (y * size + x) * 4 + 3;
            pixels[at] = Math.round((pixels[at] ?? 0) * share);
          }
        surface = environment.createSurface(pixels, size, size);
      }
      ofImage.set(key, surface);
      return surface;
    },
  };
}

// ----------------------------------------------------------------- drawing

export interface WaterBlendFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly sceneAlpha: number;
}

/**
 * Draws a water cell's blend over its tile. `other` resolves the tile of
 * the other depth for this cell (null while it loads: nothing is drawn).
 */
export function drawWaterBlendV7(
  context: CanvasRenderingContext2D,
  frame: WaterBlendFrameV7,
  art: WaterBlendArtV7 | null,
  entry: WaterBlendEntryV7,
  cells: ReadonlyMap<string, WaterBlendCellV7> | null,
  other: (
    subject: typeof SHALLOW_WATER_SUBJECT_V7 | typeof DEEP_WATER_SUBJECT_V7,
  ) => {
    readonly image: CanvasImageSource;
    readonly density: number;
    readonly smoothing: boolean;
  } | null,
): void {
  if (art === null || cells === null) return;
  const cell = cells.get(`${entry.at.x},${entry.at.y}`);
  if (cell === undefined) return;
  const tile = other(
    cell.depth === "SHALLOW" ? DEEP_WATER_SUBJECT_V7 : SHALLOW_WATER_SUBJECT_V7,
  );
  if (tile === null) return;
  const image = art.layer(cell, tile.image, tile.density);
  if (image === null) return;
  const rect = chibiForestRectV7(frame, entry.at, {
    x: 0,
    y: 0,
    width: CELL,
    height: CELL,
  });
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  context.imageSmoothingEnabled = tile.smoothing;
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}
