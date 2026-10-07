import { chibiForestRectV7 } from "./chibi-forest-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { TILE_HEIGHT, TILE_WIDTH, type CameraState } from "./geometry";

/**
 * The fog of war (bead pulp_wars-2yc.17, docs/art/ATMOSPHERE.md). The user,
 * 2026-10-06: "make the fog of war look nicer too."
 *
 * In the live look of the CHIBI art set unexplored ground is a bank of
 * storybook cloud instead of flat dark squares with a grid:
 *
 * - every **unexplored cell** is filled with one continuous cloud texture
 *   (slate blue mist with round puffs, lit from the bottom left like the
 *   rest of the board), which repeats only every seven cells and has no cell
 *   grid;
 * - over it lies a faint layer of **wisps** that drifts slowly to the right
 *   (still for reduced motion);
 * - every cell beside the fog (explored ground, and the empty sky round
 *   the map) draws the cloud's **edge**: scalloped lobes that reach a few
 *   pixels out of the fog with a thin pale rim, then a short feather of
 *   mist, so the edge of the known world is not a line of squares.
 *
 * It never shows anything hidden. The texture is a function of board
 * pixels only, the fog fill is opaque, and a cell's edge depends only on
 * which of its eight neighbours are unexplored: the plan has no terrain,
 * unit or city for an unexplored cell, and nothing here reads one.
 *
 * The cloud comes in several palettes (bead pulp_wars-2yc.28; the user,
 * 2026-10-07: "change the color of the fog of war. this one is ugly").
 * `?fog-style=<name>` picks one of FOG_PALETTE_IDS_V7 for a look;
 * FOG_DEFAULT_PALETTE_V7 is the one in use.
 *
 * To turn it off: set FOG_STYLE_ENABLED_V7 to false, or open the game with
 * `?fog-style=0`. The classic look and the LEGACY art set never draw it.
 */

/** The master switch. False draws the fog exactly as before the bead. */
export const FOG_STYLE_ENABLED_V7 = true;

/**
 * `?fog-style=0` (or `off`, `false`) turns it off, `=1` on, and the name of
 * a palette (`?fog-style=dusk`) draws the cloud in that palette.
 */
export const FOG_STYLE_PARAMETER_V7 = "fog-style";

type Rgb = readonly [number, number, number];

/** The colours of a cloud bank. Its shapes are the same in every palette. */
export interface FogPaletteV7 {
  /** The mist between the puffs, from its darkest to its lightest. */
  readonly mistDark: Rgb;
  readonly mistLight: Rgb;
  /** A puff, its lit rim (bottom left) and its shaded rim (top right). */
  readonly puff: Rgb;
  readonly puffLit: Rgb;
  readonly puffShade: Rgb;
  /** The shadow a puff casts on the mist up and to the right of it. */
  readonly cast: Rgb;
  /** The thin rim of the cloud's edge over explored ground. */
  readonly rim: Rgb;
  /** The feather of mist (or the cloud's shadow) beyond the rim. */
  readonly shadow: Rgb;
  /** Alpha of the feather where it starts. */
  readonly featherAlpha: number;
  /** The flat fill used when a canvas has no patterns. */
  readonly flat: string;
  /** The wisps: their colour and strongest alpha. */
  readonly wisp: Rgb;
  readonly wispAlpha: number;
}

/**
 * The palettes, the one in use first. `slate` is the cloud of bead
 * pulp_wars-2yc.17, kept for comparison.
 */
export const FOG_PALETTE_IDS_V7 = [
  "dusk",
  "cumulus",
  "parchment",
  "midnight",
  "plum",
  "slate",
] as const;

export type FogPaletteIdV7 = (typeof FOG_PALETTE_IDS_V7)[number];

export const FOG_PALETTES_V7: Readonly<Record<FogPaletteIdV7, FogPaletteV7>> = {
  // Lavender-violet dusk clouds: the night sky round the map, lifted.
  dusk: {
    mistDark: [90, 86, 142],
    mistLight: [104, 100, 158],
    puff: [130, 126, 184],
    puffLit: [176, 170, 222],
    puffShade: [112, 108, 166],
    cast: [76, 72, 124],
    rim: [208, 200, 240],
    shadow: [54, 50, 100],
    featherAlpha: 0.42,
    flat: "#685f9c",
    wisp: [216, 204, 246],
    wispAlpha: 0.14,
  },
  // Pale cream cumulus with lilac shadows; it casts a shadow on the land.
  cumulus: {
    mistDark: [206, 200, 216],
    mistLight: [222, 217, 226],
    puff: [242, 238, 230],
    puffLit: [255, 252, 244],
    puffShade: [216, 209, 222],
    cast: [186, 180, 204],
    rim: [150, 142, 176],
    shadow: [52, 48, 86],
    featherAlpha: 0.34,
    flat: "#dcd7e2",
    wisp: [255, 255, 255],
    wispAlpha: 0.22,
  },
  // Warm sepia: the blank of an old map, with an inked edge.
  parchment: {
    mistDark: [184, 156, 112],
    mistLight: [200, 174, 128],
    puff: [218, 196, 150],
    puffLit: [238, 220, 178],
    puffShade: [194, 166, 120],
    cast: [164, 136, 96],
    rim: [112, 84, 54],
    shadow: [84, 60, 36],
    featherAlpha: 0.34,
    flat: "#c2a67a",
    wisp: [244, 230, 194],
    wispAlpha: 0.16,
  },
  // Deep teal-navy that melts into the starfield.
  midnight: {
    mistDark: [18, 30, 58],
    mistLight: [24, 40, 72],
    puff: [32, 56, 92],
    puffLit: [54, 88, 126],
    puffShade: [26, 44, 78],
    cast: [13, 21, 44],
    rim: [78, 118, 152],
    shadow: [13, 21, 44],
    featherAlpha: 0.5,
    flat: "#172646",
    wisp: [96, 152, 182],
    wispAlpha: 0.12,
  },
  // A muted plum.
  plum: {
    mistDark: [74, 50, 82],
    mistLight: [90, 62, 98],
    puff: [112, 80, 118],
    puffLit: [150, 114, 154],
    puffShade: [96, 68, 104],
    cast: [60, 40, 68],
    rim: [182, 146, 184],
    shadow: [50, 32, 58],
    featherAlpha: 0.46,
    flat: "#59405f",
    wisp: [204, 174, 208],
    wispAlpha: 0.13,
  },
  // The slate blue-grey of bead pulp_wars-2yc.17.
  slate: {
    mistDark: [38, 49, 62],
    mistLight: [47, 60, 74],
    puff: [58, 73, 89],
    puffLit: [78, 96, 113],
    puffShade: [49, 62, 77],
    cast: [32, 42, 54],
    rim: [96, 114, 130],
    shadow: [38, 49, 62],
    featherAlpha: 0.5,
    flat: "#2c3947",
    wisp: [150, 170, 186],
    wispAlpha: 0.13,
  },
};

/** The palette the game draws. */
export const FOG_DEFAULT_PALETTE_V7: FogPaletteIdV7 = "dusk";

/**
 * What the fog is drawn as: `"OFF"` (the flat fog of before bead
 * pulp_wars-2yc.17) or a palette of the cloud. The switch, unless the
 * page's query string overrides it; an unknown value is the default.
 */
export function fogStyleV7(search?: string): FogPaletteIdV7 | "OFF" {
  const standard = FOG_STYLE_ENABLED_V7 ? FOG_DEFAULT_PALETTE_V7 : "OFF";
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(FOG_STYLE_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return standard;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return "OFF";
  if (text === "1" || text === "on" || text === "true")
    return FOG_DEFAULT_PALETTE_V7;
  return (FOG_PALETTE_IDS_V7 as readonly string[]).includes(text)
    ? (text as FogPaletteIdV7)
    : standard;
}

export function fogStyleEnabledV7(search?: string): boolean {
  return fogStyleV7(search) !== "OFF";
}

const CELL = 80;
/** The texture and the edge's waves repeat every this many cells. */
export const FOG_PHASES_V7 = 7;
/** The side of the cloud texture, master px. */
export const FOG_TEXTURE_SIZE_V7 = CELL * FOG_PHASES_V7;

/** The cloud's shapes and motion, and the colours of the palette in use. */
export const FOG_STYLE_V7 = {
  ...FOG_PALETTES_V7[FOG_DEFAULT_PALETTE_V7],
  /** Puffs in the texture, and the range of a lobe's radius, px. */
  puffs: 46,
  lobeRadius: [7, 18],
  /** The wisps' drift in px a second. */
  drift: [3.2, -0.6],
  /** The edge: mean reach of the lobes out of the fog, px, and its waves. */
  reach: 6,
  scallop: 5.5,
  waves: [1.4, 0.7],
  /** Width of the rim and of the feather beyond the lobes, px. */
  rimWidth: 1.2,
  feather: 8,
} as const;

/** The most edge layers kept (each CELL x CELL, about 26 kB). */
export const FOG_EDGE_CACHE_LIMIT_V7 = 320;

/** The farthest the edge paints from the fog, px. */
export const FOG_EDGE_REACH_V7 = 20;

/** A deterministic hash of two integers and a salt, 0 to 1. */
export function fogHashV7(x: number, y: number, salt: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (salt | 0), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const modulo = (value: number, by: number): number => ((value % by) + by) % by;

/** Smooth value noise that repeats every `across` by `down` lattice cells. */
function tileNoise(
  x: number,
  y: number,
  across: number,
  down: number,
  salt: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (ix: number, iy: number): number =>
    fogHashV7(modulo(ix, across), modulo(iy, down), salt);
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

const mix = (a: Rgb, b: Rgb, t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const texturePixels = new Map<FogPaletteIdV7, Uint8ClampedArray>();

/**
 * The cloud texture: SIZE x SIZE opaque RGBA that tiles in both directions.
 * A function of nothing but the constants above and the palette.
 */
export function fogTexturePixelsV7(
  palette: FogPaletteIdV7 = FOG_DEFAULT_PALETTE_V7,
): Uint8ClampedArray {
  const known = texturePixels.get(palette);
  if (known !== undefined) return known;
  const size = FOG_TEXTURE_SIZE_V7;
  const spec = { ...FOG_STYLE_V7, ...FOG_PALETTES_V7[palette] };
  // The puffs: each a few overlapping round lobes.
  const lobes: { x: number; y: number; r: number }[] = [];
  const centres: { x: number; y: number }[] = [];
  const wrapped = (a: number, b: number): number => {
    const d = Math.abs(a - b) % size;
    return Math.min(d, size - d);
  };
  for (let puff = 0; puff < spec.puffs; puff += 1) {
    // Of a dozen candidate places the one farthest from the puffs already
    // placed, so the puffs are spread out without standing in rows.
    let best = { x: 0, y: 0 };
    let bestGap = -1;
    for (let candidate = 0; candidate < 12; candidate += 1) {
      const x = fogHashV7(puff, candidate, 11) * size;
      const y = fogHashV7(puff, candidate, 15) * size;
      let gap = Infinity;
      for (const other of centres)
        gap = Math.min(
          gap,
          Math.hypot(wrapped(x, other.x), 1.6 * wrapped(y, other.y)),
        );
      if (gap > bestGap) {
        bestGap = gap;
        best = { x, y };
      }
    }
    centres.push(best);
    // A few big clouds among smaller ones.
    const big = fogHashV7(puff, 3, 11) < 0.3;
    const count = (big ? 4 : 2) + Math.floor(fogHashV7(puff, 4, 11) * 3);
    for (let lobe = 0; lobe < count; lobe += 1) {
      const r =
        (spec.lobeRadius[0] +
          (spec.lobeRadius[1] - spec.lobeRadius[0]) *
            fogHashV7(puff, lobe, 12)) *
        (big ? 1 : 0.8);
      lobes.push({
        // Lobes line up sideways: a cloud is wider than it is tall, and
        // its lobes share a flat base.
        x:
          best.x +
          (lobe - (count - 1) / 2) * (big ? 13 : 9) +
          5 * (fogHashV7(puff, lobe, 13) - 0.5),
        y: best.y - r * 0.55,
        r,
      });
    }
  }
  // Height over the mist: above 0 inside a puff. Wrapped, so it tiles.
  const height = new Float32Array(size * size).fill(-1);
  for (const lobe of lobes) {
    const reach = Math.ceil(lobe.r) + 1;
    for (let dy = -reach; dy <= reach; dy += 1)
      for (let dx = -reach; dx <= reach; dx += 1) {
        const px = Math.floor(lobe.x) + dx;
        const py = Math.floor(lobe.y) + dy;
        const value =
          1 - Math.hypot(px + 0.5 - lobe.x, py + 0.5 - lobe.y) / lobe.r;
        const at = modulo(py, size) * size + modulo(px, size);
        if (value > (height[at] ?? -1)) height[at] = value;
      }
  }
  const heightAt = (x: number, y: number): number =>
    height[modulo(y, size) * size + modulo(x, size)] ?? -1;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const fx = x / size;
      const fy = y / size;
      // Broad, low-contrast mottling of the mist.
      const mottle =
        0.6 * tileNoise(fx * 6, fy * 6, 6, 6, 21) +
        0.28 * tileNoise(fx * 13, fy * 13, 13, 13, 22) +
        0.12 * tileNoise(fx * 31, fy * 31, 31, 31, 23);
      const here = heightAt(x, y);
      let colour: Rgb;
      if (here > 0) {
        // Light from the bottom left: the rim that faces it is pale, the
        // rim that faces away is shaded.
        const lit = heightAt(x - 2, y + 2) <= 0;
        const shaded = heightAt(x + 2, y - 2) <= 0;
        colour = lit ? spec.puffLit : shaded ? spec.puffShade : spec.puff;
      } else {
        const mist = mix(
          spec.mistDark,
          spec.mistLight,
          Math.min(1, Math.max(0, (mottle - 0.3) / 0.4)),
        );
        // A short cast shadow up and to the right of a puff.
        colour = heightAt(x - 3, y + 3) > 0 ? mix(mist, spec.cast, 0.7) : mist;
      }
      const at = (y * size + x) * 4;
      pixels[at] = colour[0];
      pixels[at + 1] = colour[1];
      pixels[at + 2] = colour[2];
      pixels[at + 3] = 255;
    }
  texturePixels.set(palette, pixels);
  return pixels;
}

const wispPixels = new Map<FogPaletteIdV7, Uint8ClampedArray>();

/** The drifting wisps: SIZE x SIZE translucent RGBA that tiles. */
export function fogWispPixelsV7(
  palette: FogPaletteIdV7 = FOG_DEFAULT_PALETTE_V7,
): Uint8ClampedArray {
  const known = wispPixels.get(palette);
  if (known !== undefined) return known;
  const size = FOG_TEXTURE_SIZE_V7;
  const spec = FOG_PALETTES_V7[palette];
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const fx = x / size;
      const fy = y / size;
      // Long and low: three times as many lattice cells down as across.
      const streak =
        0.65 * tileNoise(fx * 5, fy * 16, 5, 16, 31) +
        0.35 * tileNoise(fx * 11, fy * 33, 11, 33, 32);
      const share = Math.min(1, Math.max(0, (streak - 0.52) / 0.22));
      const at = (y * size + x) * 4;
      pixels[at] = spec.wisp[0];
      pixels[at + 1] = spec.wisp[1];
      pixels[at + 2] = spec.wisp[2];
      pixels[at + 3] = Math.round(
        255 * spec.wispAlpha * share * share * (3 - 2 * share),
      );
    }
  wispPixels.set(palette, pixels);
  return pixels;
}

/** Neighbour bits of an edge layer: where the fog lies. */
export const FOG_N = 1;
export const FOG_E = 2;
export const FOG_S = 4;
export const FOG_W = 8;
export const FOG_NE = 16;
export const FOG_SE = 32;
export const FOG_SW = 64;
export const FOG_NW = 128;

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [0, -1, FOG_N],
  [1, 0, FOG_E],
  [0, 1, FOG_S],
  [-1, 0, FOG_W],
  [1, -1, FOG_NE],
  [1, 1, FOG_SE],
  [-1, 1, FOG_SW],
  [-1, -1, FOG_NW],
];

/**
 * The pixels (RGBA, CELL x CELL) of the cloud's edge over a cell beside the
 * fog. `neighbours` are the unexplored cells around it; `phase` is the
 * cell's place in the PHASES x PHASES repeat.
 */
export function fogEdgePixelsV7(
  neighbours: number,
  phase: number,
  palette: FogPaletteIdV7 = FOG_DEFAULT_PALETTE_V7,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(CELL * CELL * 4);
  if (neighbours === 0) return pixels;
  const spec = { ...FOG_STYLE_V7, ...FOG_PALETTES_V7[palette] };
  const size = FOG_TEXTURE_SIZE_V7;
  const texture = fogTexturePixelsV7(palette);
  const originX = (phase % FOG_PHASES_V7) * CELL;
  const originY = Math.floor(phase / FOG_PHASES_V7) * CELL;
  const turn = (2 * Math.PI) / size;
  for (let y = 0; y < CELL; y += 1)
    for (let x = 0; x < CELL; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let distance = Infinity;
      if ((neighbours & FOG_N) !== 0) distance = Math.min(distance, py);
      if ((neighbours & FOG_S) !== 0) distance = Math.min(distance, CELL - py);
      if ((neighbours & FOG_W) !== 0) distance = Math.min(distance, px);
      if ((neighbours & FOG_E) !== 0) distance = Math.min(distance, CELL - px);
      if ((neighbours & FOG_NE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - px, py));
      if ((neighbours & FOG_SE) !== 0)
        distance = Math.min(distance, Math.hypot(CELL - px, CELL - py));
      if ((neighbours & FOG_SW) !== 0)
        distance = Math.min(distance, Math.hypot(px, CELL - py));
      if ((neighbours & FOG_NW) !== 0)
        distance = Math.min(distance, Math.hypot(px, py));
      if (distance > FOG_EDGE_REACH_V7) continue;
      const wx = originX + px;
      const wy = originY + py;
      // Round lobes (the absolute value of a wave), then two plain waves.
      const reach =
        spec.reach +
        spec.scallop *
          (Math.abs(Math.sin(turn * (8 * wx + 9 * wy) + 0.6)) - 0.64) +
        spec.waves[0] * Math.sin(turn * (18 * wy - 15 * wx) + 2.3) +
        spec.waves[1] * Math.sin(turn * (41 * wx + 33 * wy) + 4.4);
      const at = (y * CELL + x) * 4;
      const source = (Math.floor(wy) * size + Math.floor(wx)) * 4;
      let colour: Rgb = [
        texture[source] ?? 0,
        texture[source + 1] ?? 0,
        texture[source + 2] ?? 0,
      ];
      let alpha: number;
      if (distance < reach) {
        if (reach - distance < spec.rimWidth) colour = spec.rim;
        alpha = 1;
      } else {
        const fade = 1 - (distance - Math.max(reach, 0)) / spec.feather;
        if (fade <= 0) continue;
        colour = spec.shadow;
        alpha = spec.featherAlpha * fade * fade;
      }
      pixels[at] = colour[0];
      pixels[at + 1] = colour[1];
      pixels[at + 2] = colour[2];
      pixels[at + 3] = Math.round(255 * alpha);
    }
  return pixels;
}

// ------------------------------------------------------------------- cells

/**
 * What the fog reads of a board plan entry: its kind and its cell. Nothing
 * else, so nothing else can show.
 */
export interface FogEntryV7 {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
}

export interface FogEdgeCellV7 {
  readonly at: { readonly x: number; readonly y: number };
  readonly neighbours: number;
  readonly phase: number;
}

export interface FogCellsV7 {
  /** Rows of unexplored cells: `x0` to `x1` inclusive on row `y`. */
  readonly runs: readonly {
    readonly y: number;
    readonly x0: number;
    readonly x1: number;
  }[];
  /** Explored cells beside the fog, by "x,y". */
  readonly edges: ReadonlyMap<string, FogEdgeCellV7>;
  /** Cells outside the map beside the fog. */
  readonly outside: readonly FogEdgeCellV7[];
}

/**
 * The fog's shape. A pure function of which cells are FOG entries and
 * which are TERRAIN entries (explored); a cell with neither is outside the
 * map.
 */
export function fogCellsV7(entries: readonly FogEntryV7[]): FogCellsV7 {
  const fog = new Set<string>();
  const explored = new Set<string>();
  const cells: { x: number; y: number }[] = [];
  for (const entry of entries) {
    if (entry.kind === "FOG") {
      const key = `${entry.at.x},${entry.at.y}`;
      if (!fog.has(key)) cells.push({ x: entry.at.x, y: entry.at.y });
      fog.add(key);
    } else if (entry.kind === "TERRAIN")
      explored.add(`${entry.at.x},${entry.at.y}`);
  }
  cells.sort((a, b) => a.y - b.y || a.x - b.x);
  const runs: { y: number; x0: number; x1: number }[] = [];
  const beside = new Map<string, { x: number; y: number; bits: number }>();
  for (const cell of cells) {
    const last = runs[runs.length - 1];
    if (last !== undefined && last.y === cell.y && last.x1 === cell.x - 1)
      last.x1 = cell.x;
    else runs.push({ y: cell.y, x0: cell.x, x1: cell.x });
    for (const [dx, dy, bit] of NEIGHBOURS) {
      // The neighbour sees this fog cell in the opposite direction.
      const x = cell.x - dx;
      const y = cell.y - dy;
      const key = `${x},${y}`;
      if (fog.has(key)) continue;
      const known = beside.get(key);
      if (known === undefined) beside.set(key, { x, y, bits: bit });
      else known.bits |= bit;
    }
  }
  const edges = new Map<string, FogEdgeCellV7>();
  const outside: FogEdgeCellV7[] = [];
  for (const [key, cell] of beside) {
    const edge: FogEdgeCellV7 = {
      at: { x: cell.x, y: cell.y },
      neighbours: cell.bits,
      phase:
        modulo(cell.x, FOG_PHASES_V7) +
        FOG_PHASES_V7 * modulo(cell.y, FOG_PHASES_V7),
    };
    if (explored.has(key)) edges.set(key, edge);
    else outside.push(edge);
  }
  return { runs, edges, outside };
}

const cellsByEntries = new WeakMap<object, FogCellsV7>();

/** `fogCellsV7`, computed once per plan. */
export function fogCellsOfV7(entries: readonly FogEntryV7[]): FogCellsV7 {
  let cells = cellsByEntries.get(entries);
  if (cells === undefined) {
    cells = fogCellsV7(entries);
    cellsByEntries.set(entries, cells);
  }
  return cells;
}

// --------------------------------------------------------------------- art

export interface FogArtV7 {
  /** The palette the surfaces are painted in. */
  readonly palette: FogPaletteIdV7;
  texture(): CanvasImageSource | null;
  wisps(): CanvasImageSource | null;
  edge(neighbours: number, phase: number): CanvasImageSource | null;
}

/** The fog's surfaces in one palette, each built on first use and kept. */
export function createFogArtV7(
  environment: {
    createSurface(
      pixels: Uint8ClampedArray,
      width: number,
      height: number,
    ): CanvasImageSource | null;
  },
  palette: FogPaletteIdV7 = FOG_DEFAULT_PALETTE_V7,
): FogArtV7 {
  let texture: CanvasImageSource | null | undefined;
  let wisps: CanvasImageSource | null | undefined;
  const edges = new Map<number, CanvasImageSource | null>();
  const size = FOG_TEXTURE_SIZE_V7;
  return {
    palette,
    texture() {
      texture ??= environment.createSurface(
        fogTexturePixelsV7(palette),
        size,
        size,
      );
      return texture;
    },
    wisps() {
      wisps ??= environment.createSurface(fogWispPixelsV7(palette), size, size);
      return wisps;
    },
    edge(neighbours, phase) {
      const key = neighbours * FOG_PHASES_V7 * FOG_PHASES_V7 + phase;
      const known = edges.get(key);
      if (known !== undefined) {
        // Most recently used last.
        edges.delete(key);
        edges.set(key, known);
        return known;
      }
      const surface = environment.createSurface(
        fogEdgePixelsV7(neighbours, phase, palette),
        CELL,
        CELL,
      );
      edges.set(key, surface);
      // The frontier moves as the map is explored: keep the recent edges.
      if (edges.size > FOG_EDGE_CACHE_LIMIT_V7)
        for (const oldest of edges.keys()) {
          edges.delete(oldest);
          break;
        }
      return surface;
    },
  };
}

// ----------------------------------------------------------------- drawing

export interface FogFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly sceneAlpha: number;
  readonly viewport: { readonly width: number; readonly height: number };
  /** The wisps' clock in ms; 0 holds them still (reduced motion). */
  readonly timeMs: number;
}

/** The wisps' offset in master px after `timeMs`, inside one texture. */
export function fogDriftV7(timeMs: number): { x: number; y: number } {
  const seconds = Math.max(0, timeMs) / 1000;
  return {
    x: modulo(FOG_STYLE_V7.drift[0] * seconds, FOG_TEXTURE_SIZE_V7),
    y: modulo(FOG_STYLE_V7.drift[1] * seconds, FOG_TEXTURE_SIZE_V7),
  };
}

const patterns = new WeakMap<
  object,
  Map<CanvasImageSource, CanvasPattern | null>
>();

function patternOf(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
): CanvasPattern | null {
  if (image === null || typeof context.createPattern !== "function")
    return null;
  if (typeof DOMMatrix !== "function") return null;
  let ofContext = patterns.get(context);
  if (ofContext === undefined) {
    ofContext = new Map();
    patterns.set(context, ofContext);
  }
  let pattern = ofContext.get(image);
  if (pattern === undefined) {
    try {
      pattern = context.createPattern(image, "repeat") ?? null;
    } catch {
      pattern = null;
    }
    if (pattern !== null && typeof pattern.setTransform !== "function")
      pattern = null;
    ofContext.set(image, pattern);
  }
  return pattern;
}

function drawEdge(
  context: CanvasRenderingContext2D,
  frame: FogFrameV7,
  art: FogArtV7,
  cell: FogEdgeCellV7,
): void {
  const image = art.edge(cell.neighbours, cell.phase);
  if (image === null) return;
  const rect = chibiForestRectV7(frame, cell.at, {
    x: 0,
    y: 0,
    width: CELL,
    height: CELL,
  });
  if (
    rect.x > frame.viewport.width ||
    rect.y > frame.viewport.height ||
    rect.x + rect.width < 0 ||
    rect.y + rect.height < 0
  )
    return;
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

/**
 * Draws every unexplored cell (one fill of the cloud texture, one of the
 * wisps) and the cloud's edge over the sky round the map. Called once a
 * frame, before any ground.
 */
export function drawFogV7(
  context: CanvasRenderingContext2D,
  frame: FogFrameV7,
  art: FogArtV7,
  cells: FogCellsV7,
): void {
  if (cells.runs.length === 0) return;
  const { camera, viewport } = frame;
  const scale = chibiMasterScale(camera);
  const smoothing = !isWholeScale(scale * frame.devicePixelRatio);
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  context.imageSmoothingEnabled = smoothing;
  context.beginPath();
  let any = false;
  for (const run of cells.runs) {
    const first = chibiForestRectV7(
      frame,
      { x: run.x0, y: run.y },
      { x: 0, y: 0, width: CELL, height: CELL },
    );
    const last =
      run.x1 === run.x0
        ? first
        : chibiForestRectV7(
            frame,
            { x: run.x1, y: run.y },
            { x: 0, y: 0, width: CELL, height: CELL },
          );
    const right = last.x + last.width;
    if (
      first.x > viewport.width ||
      first.y > viewport.height ||
      right < 0 ||
      first.y + first.height < 0
    )
      continue;
    context.rect(first.x, first.y, right - first.x, first.height);
    any = true;
  }
  if (any) {
    // Board pixel (0, 0) is the top left of cell (0, 0).
    const originX = camera.offsetX - (TILE_WIDTH / 2) * camera.zoom;
    const originY = camera.offsetY - (TILE_HEIGHT / 2) * camera.zoom;
    const texture = patternOf(context, art.texture());
    if (texture === null) context.fillStyle = FOG_PALETTES_V7[art.palette].flat;
    else {
      texture.setTransform(
        new DOMMatrix([scale, 0, 0, scale, originX, originY]),
      );
      context.fillStyle = texture;
    }
    context.fill();
    const wisps = texture === null ? null : patternOf(context, art.wisps());
    if (wisps !== null) {
      const drift = fogDriftV7(frame.timeMs);
      wisps.setTransform(
        new DOMMatrix([
          scale,
          0,
          0,
          scale,
          originX + drift.x * scale,
          originY + drift.y * scale,
        ]),
      );
      context.fillStyle = wisps;
      context.fill();
    }
  }
  for (const cell of cells.outside) drawEdge(context, frame, art, cell);
  context.restore();
}

/** Draws the cloud's edge over an explored cell's ground. */
export function drawFogEdgeV7(
  context: CanvasRenderingContext2D,
  frame: FogFrameV7,
  art: FogArtV7 | null,
  entry: FogEntryV7,
  cells: FogCellsV7 | null,
): void {
  if (art === null || cells === null) return;
  const cell = cells.edges.get(`${entry.at.x},${entry.at.y}`);
  if (cell === undefined) return;
  context.save();
  context.globalAlpha = frame.sceneAlpha;
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  drawEdge(context, frame, art, cell);
  context.restore();
}
