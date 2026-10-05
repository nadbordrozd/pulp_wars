import { chibiForestRectV7 } from "./chibi-forest-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import type { CameraState } from "./geometry";

/**
 * The shoreline (bead pulp_wars-2yc.5, docs/art/COAST_SAND.md). The user,
 * 2026-10-05: "make a nicer boundary between water and land. you could draw
 * a thin irregular line of sand."
 *
 * In the live look of the CHIBI art set every edge between land and water
 * gets a thin, wavering band of sand on the land side and a little surf on
 * the water side. It is drawn by code over the cells' ground (after Snow,
 * under Roads, buildings and units), from the explored terrain only:
 *
 * - a **land** cell (Grass of any faction, Forest, Mountain, a Rift) with
 *   water beside it or at a corner draws the sand: a band about 4 px wide
 *   that swells and thins and breaks here and there, with a paler wet edge
 *   at the water and a darker lip where the land begins;
 * - a **water** cell with land beside it draws the waterline: the sand
 *   runs up to 3 px out, unevenly, so the shore is not the cell's straight
 *   edge; then a faint pale line of surf and a few foam flecks. A cell
 *   under sea ice draws none: the ice keeps its own edge.
 *
 * Both are cut from one distance field (the distance to the nearest
 * neighbouring cell of the other kind, corners included), so the band runs
 * round inner and outer corners without a joint, and its width is a wave
 * over board pixels that repeats every three cells, so two cells meet
 * without a step and a long coast does not repeat cell by cell.
 *
 * To turn it off: set COAST_SAND_ENABLED_V7 to false, or open the game
 * with `?coast-sand=0`. The classic look and the LEGACY art set never draw
 * it.
 */

/** The master switch. False draws the coast exactly as before the bead. */
export const COAST_SAND_ENABLED_V7 = true;

/** `?coast-sand=0` (or `off`, `false`) turns it off, `=1` on. */
export const COAST_SAND_PARAMETER_V7 = "coast-sand";

export function coastSandEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(COAST_SAND_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return COAST_SAND_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return COAST_SAND_ENABLED_V7;
}

const CELL = 80;
/** The band's width wave repeats every this many cells. */
export const COAST_PHASES_V7 = 3;

/** Neighbour bits of a coast layer. */
export const COAST_N = 1;
export const COAST_E = 2;
export const COAST_S = 4;
export const COAST_W = 8;
export const COAST_NE = 16;
export const COAST_SE = 32;
export const COAST_SW = 64;
export const COAST_NW = 128;

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [0, -1, COAST_N],
  [1, 0, COAST_E],
  [0, 1, COAST_S],
  [-1, 0, COAST_W],
  [1, -1, COAST_NE],
  [1, 1, COAST_SE],
  [-1, 1, COAST_SW],
  [-1, -1, COAST_NW],
];

type Rgba = readonly [number, number, number, number];

export const COAST_SAND_V7 = {
  /** Mean width of the sand in master px, and the three waves added. */
  width: 4.4,
  waves: [2.2, 1.3, 0.8],
  /** The sand, its wet edge at the water and its lip at the land. */
  sand: [228, 210, 156, 255],
  wet: [208, 194, 146, 255],
  lip: [190, 170, 118, 255],
  /** Width of the wet edge and of the lip, px. */
  wetWidth: 1.4,
  lipWidth: 1.2,
  /** How far the sand runs out into the water cell, px, and its waves. */
  spill: 1.3,
  spillWaves: [1.3, 0.7],
  /** The surf: a pale line this wide at the shore, then foam flecks. */
  surf: [236, 246, 248, 84],
  surfWidth: 1.6,
  foam: [240, 248, 250, 224],
  /** Foam lies between these distances from the shore, px. */
  foamBand: [3, 6.5],
  /** How much of that band is foam, 0 to 1 (higher is less). */
  foamCut: 0.62,
} as const satisfies Record<string, unknown>;

export type CoastLayerKindV7 = "SAND" | "SURF";

/**
 * The pixels (RGBA, CELL x CELL) of a cell's coast layer. `neighbours` are
 * the cells of the other kind around it: water round a land cell for SAND,
 * land round a water cell for SURF. `phase` is the cell's place in the
 * PHASES x PHASES repeat.
 */
export function coastLayerPixelsV7(
  kind: CoastLayerKindV7,
  neighbours: number,
  phase: number,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(CELL * CELL * 4);
  if (neighbours === 0) return pixels;
  const spec = COAST_SAND_V7;
  const period = CELL * COAST_PHASES_V7;
  const originX = (phase % COAST_PHASES_V7) * CELL;
  const originY = Math.floor(phase / COAST_PHASES_V7) * CELL;
  const turn = (2 * Math.PI) / period;
  const put = (x: number, y: number, colour: Rgba): void => {
    pixels.set(colour, (y * CELL + x) * 4);
  };
  for (let y = 0; y < CELL; y += 1)
    for (let x = 0; x < CELL; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let distance = Infinity;
      if ((neighbours & COAST_N) !== 0) distance = Math.min(distance, py);
      if ((neighbours & COAST_S) !== 0)
        distance = Math.min(distance, CELL - py);
      if ((neighbours & COAST_W) !== 0) distance = Math.min(distance, px);
      if ((neighbours & COAST_E) !== 0)
        distance = Math.min(distance, CELL - px);
      if ((neighbours & COAST_NE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - px, py));
      if ((neighbours & COAST_SE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - px, CELL - py));
      if ((neighbours & COAST_SW) !== 0)
        distance = Math.min(distance, Math.hypot(px, CELL - py));
      if ((neighbours & COAST_NW) !== 0)
        distance = Math.min(distance, Math.hypot(px, py));
      if (distance > 12) continue;
      const wx = originX + px;
      const wy = originY + py;
      if (kind === "SAND") {
        const reach =
          spec.width +
          spec.waves[0] * Math.sin(turn * (5 * wx + 4 * wy) + 0.7) +
          spec.waves[1] * Math.sin(turn * (13 * wy - 11 * wx) + 2.1) +
          spec.waves[2] * Math.sin(turn * (29 * wx + 23 * wy) + 4.0);
        if (distance >= reach) continue;
        put(
          x,
          y,
          distance < spec.wetWidth
            ? spec.wet
            : reach - distance < spec.lipWidth && reach > 2.6
              ? spec.lip
              : spec.sand,
        );
        continue;
      }
      // The water side: the sand runs a little way out, unevenly, so the
      // waterline is not the cell's straight edge; then the surf.
      const spill =
        spec.spill +
        spec.spillWaves[0] * Math.sin(turn * (7 * wx - 6 * wy) + 1.9) +
        spec.spillWaves[1] * Math.sin(turn * (19 * wx + 17 * wy) + 0.2);
      if (distance < spill) put(x, y, spec.wet);
      else if (distance < Math.max(spill, 0) + spec.surfWidth)
        put(x, y, spec.surf);
      else if (distance >= spec.foamBand[0] && distance < spec.foamBand[1]) {
        // Flecks: short dashes that follow the shore, in loose groups.
        const along =
          Math.sin(turn * (17 * wx + 7 * wy) + 1.1) *
          Math.sin(turn * (9 * wy - 19 * wx) + 0.3);
        const ripple = Math.sin(distance * 1.9 + turn * 11 * (wx + wy));
        if (along > spec.foamCut && ripple > 0.2) put(x, y, spec.foam);
      }
    }
  return pixels;
}

// ------------------------------------------------------------------- cells

/** What the coast reads of a board plan entry. */
export interface CoastEntryV7 {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject?: string;
  /** Present on a water cell under sea ice. */
  readonly seaIce?: unknown;
}

export interface CoastCellV7 {
  readonly layer: CoastLayerKindV7;
  readonly neighbours: number;
  readonly phase: number;
}

const WATER: ReadonlySet<string> = new Set([
  "TERRAIN:SHALLOW_WATER",
  "TERRAIN:DEEP_WATER",
]);

const modulo = (value: number, by: number): number => ((value % by) + by) % by;

/**
 * The coast layer of every explored cell that has one. A pure function of
 * the plan's terrain entries: an unexplored neighbour is neither land nor
 * water, so the coast never shows what the player has not seen.
 */
export function coastCellsV7(
  entries: readonly CoastEntryV7[],
): ReadonlyMap<string, CoastCellV7> {
  const water = new Map<string, boolean>();
  const terrain: CoastEntryV7[] = [];
  for (const entry of entries) {
    if (entry.kind !== "TERRAIN" || entry.artSubject === undefined) continue;
    if (!entry.artSubject.startsWith("TERRAIN:")) continue;
    terrain.push(entry);
    water.set(`${entry.at.x},${entry.at.y}`, WATER.has(entry.artSubject));
  }
  const cells = new Map<string, CoastCellV7>();
  for (const entry of terrain) {
    const { x, y } = entry.at;
    const wet = water.get(`${x},${y}`) === true;
    if (wet && entry.seaIce !== undefined) continue;
    let neighbours = 0;
    for (const [dx, dy, bit] of NEIGHBOURS) {
      const other = water.get(`${x + dx},${y + dy}`);
      if (other !== undefined && other !== wet) neighbours |= bit;
    }
    if (neighbours === 0) continue;
    cells.set(`${x},${y}`, {
      layer: wet ? "SURF" : "SAND",
      neighbours,
      phase:
        modulo(x, COAST_PHASES_V7) +
        COAST_PHASES_V7 * modulo(y, COAST_PHASES_V7),
    });
  }
  return cells;
}

const cellsByEntries = new WeakMap<object, ReadonlyMap<string, CoastCellV7>>();

/** `coastCellsV7`, computed once per plan. */
export function coastCellsOfV7(
  entries: readonly CoastEntryV7[],
): ReadonlyMap<string, CoastCellV7> {
  let cells = cellsByEntries.get(entries);
  if (cells === undefined) {
    cells = coastCellsV7(entries);
    cellsByEntries.set(entries, cells);
  }
  return cells;
}

// --------------------------------------------------------------------- art

export interface CoastSandArtV7 {
  layer(
    kind: CoastLayerKindV7,
    neighbours: number,
    phase: number,
  ): CanvasImageSource | null;
}

/** The coast layers as surfaces, each built on first use and kept. */
export function createCoastSandArtV7(environment: {
  createSurface(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): CanvasImageSource | null;
}): CoastSandArtV7 {
  const layers = new Map<string, CanvasImageSource | null>();
  return {
    layer(kind, neighbours, phase) {
      const key = `${kind}:${neighbours}:${phase}`;
      const known = layers.get(key);
      if (known !== undefined) return known;
      const surface = environment.createSurface(
        coastLayerPixelsV7(kind, neighbours, phase),
        CELL,
        CELL,
      );
      layers.set(key, surface);
      return surface;
    },
  };
}

// ----------------------------------------------------------------- drawing

export interface CoastFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly sceneAlpha: number;
}

/** Draws a terrain entry's coast layer over its ground. */
export function drawCoastSandV7(
  context: CanvasRenderingContext2D,
  frame: CoastFrameV7,
  art: CoastSandArtV7 | null,
  entry: CoastEntryV7,
  cells: ReadonlyMap<string, CoastCellV7> | null,
): void {
  if (art === null || cells === null) return;
  const cell = cells.get(`${entry.at.x},${entry.at.y}`);
  if (cell === undefined) return;
  const image = art.layer(cell.layer, cell.neighbours, cell.phase);
  if (image === null) return;
  const rect = chibiForestRectV7(frame, entry.at, {
    x: 0,
    y: 0,
    width: CELL,
    height: CELL,
  });
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  // The live rule: smoothing only at a fractional device scale (zoom 0.75).
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}
