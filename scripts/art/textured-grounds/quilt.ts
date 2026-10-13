/**
 * EXPERIMENT (bead pulp_wars-2yc.48, second round; docs/art/TEXTURED_GROUNDS.md):
 * a large periodic ground texture quilted from PixelLab fields.
 *
 * Pixflux holds a painted texture at 160 x 160 and not at 400 x 400 (there
 * it draws a scene or a pattern), and a field is never periodic. So the
 * texture the board samples is synthesised from several fields by image
 * quilting (Efros and Freeman, 2001), done on palette indices so that no
 * pixel is blended and every pixel of the result is a pixel of a field:
 *
 * 1. The output is a torus of `width` x `height` pixels, laid with blocks
 *    of `block` pixels that overlap their neighbours by `overlap`; the last
 *    column overlaps the first and the last row the first row.
 * 2. For each block, a seeded draw of the `block` x `block` windows of the
 *    fields' allowed regions is scored by how far each is from what the
 *    output already holds under it, and one of the nearest is taken.
 * 3. In each overlap the new block and the old pixels are joined along the
 *    path where they differ least (a minimum-error boundary cut), so a join
 *    runs through dust or moss and round a stone, not across it.
 *
 * `prefill` is for the other mode this was tried in: tiles that all carry
 * one shared border band, so any of them joins any other.
 */
import type { RgbaRaster } from "../chibi/owner-mask";

type Rgb = readonly [number, number, number];

function hex(colour: string): Rgb {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as Rgb;
}

function hash(a: number, b: number, c: number, d: number): number {
  let h =
    Math.imul(a | 0, 0x9e3779b1) ^
    Math.imul(b | 0, 0x85ebca6b) ^
    Math.imul(c | 0, 0xc2b2ae35) ^
    Math.imul(d | 0, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** The palette index of every pixel of a field. */
export function paletteIndices(
  field: RgbaRaster,
  palette: readonly string[],
): Uint8Array {
  const colours = palette.map(hex);
  const indices = new Uint8Array(field.width * field.height);
  for (let at = 0; at < indices.length; at += 1) {
    const r = field.data[at * 4] ?? 0;
    const g = field.data[at * 4 + 1] ?? 0;
    const b = field.data[at * 4 + 2] ?? 0;
    let best = 0;
    let bestDistance = Infinity;
    for (const [index, colour] of colours.entries()) {
      const distance =
        (r - colour[0]) ** 2 + (g - colour[1]) ** 2 + (b - colour[2]) ** 2;
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    }
    indices[at] = best;
  }
  return indices;
}

export interface QuiltSource {
  readonly indices: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** The parts of the field windows are taken from: `[left, top, width, height]`. */
  readonly regions: readonly (readonly [number, number, number, number])[];
}

export interface QuiltRecipe {
  /** The period of the texture. Multiples of `block - overlap`. */
  readonly width: number;
  readonly height: number;
  readonly block: number;
  readonly overlap: number;
  readonly seed: number;
  /** Windows within this share above the best score may be taken. Default 0.1. */
  readonly tolerance?: number;
  /**
   * How many windows, drawn by the seed, a block chooses among. Default:
   * all of them, which makes the blandest texture the fields allow.
   */
  readonly sample?: number;
  /** Every this many pixels a window is tried. Default 2. */
  readonly stride?: number;
  /**
   * Where the first block starts. Default `-overlap / 2`, so the texture's
   * own edge lies in the middle of an overlap.
   */
  readonly origin?: number;
}

const EMPTY = 255;

/** A periodic texture of palette indices quilted from the sources. */
export function quilt(
  sources: readonly QuiltSource[],
  palette: readonly string[],
  recipe: QuiltRecipe,
  prefill?: Uint8Array,
): Uint8Array {
  const { width, height, block, overlap, seed } = recipe;
  const step = block - overlap;
  if (width % step !== 0 || height % step !== 0)
    throw new Error("the quilt's period is a multiple of block - overlap");
  if (overlap * 2 > block)
    throw new Error("the overlap is at most half a block");
  const colours = palette.map(hex);
  // The distance of two palette colours, by index.
  const distance = new Float64Array(palette.length * palette.length);
  for (const [a, left] of colours.entries())
    for (const [b, right] of colours.entries())
      distance[a * palette.length + b] =
        (left[0] - right[0]) ** 2 +
        (left[1] - right[1]) ** 2 +
        (left[2] - right[2]) ** 2;
  const cost = (a: number, b: number): number =>
    distance[a * palette.length + b] ?? 0;

  const windows: { source: number; left: number; top: number }[] = [];
  const stride = recipe.stride ?? 2;
  for (const [index, source] of sources.entries())
    for (const [left, top, w, h] of source.regions)
      for (
        let y = top;
        y + block <= top + h && y + block <= source.height;
        y += stride
      )
        for (
          let x = left;
          x + block <= left + w && x + block <= source.width;
          x += stride
        )
          windows.push({ source: index, left: x, top: y });
  if (windows.length === 0) throw new Error("no window fits the regions");

  const out =
    prefill === undefined
      ? new Uint8Array(width * height).fill(EMPTY)
      : new Uint8Array(prefill);
  const wrap = (value: number, by: number): number => ((value % by) + by) % by;
  const origin = recipe.origin ?? -overlap / 2;
  const tolerance = recipe.tolerance ?? 0.1;
  const columns = width / step;
  const rows = height / step;
  const existing = new Uint8Array(block * block);
  const keep = new Uint8Array(block * block);
  const error = new Float64Array(block * block);

  for (let j = 0; j < rows; j += 1)
    for (let i = 0; i < columns; i += 1) {
      const ox = origin + i * step;
      const oy = origin + j * step;
      // What the output holds under the block.
      const held: number[] = [];
      for (let dy = 0; dy < block; dy += 1)
        for (let dx = 0; dx < block; dx += 1) {
          const value =
            out[wrap(oy + dy, height) * width + wrap(ox + dx, width)] ?? EMPTY;
          existing[dy * block + dx] = value;
          if (value !== EMPTY) held.push(dy * block + dx);
        }
      // The nearest windows.
      let best = Infinity;
      const scores = new Float64Array(windows.length);
      // A seeded draw of the windows: scoring every window always ends on
      // the emptiest patch of dust, whose join costs nothing, and the
      // texture goes bland.
      const drawn =
        recipe.sample === undefined || recipe.sample >= windows.length
          ? null
          : new Set(
              Array.from(
                { length: recipe.sample },
                (_, k) => hash(seed, i * 977 + j, k, 0x2b) % windows.length,
              ),
            );
      for (const [index, window] of windows.entries()) {
        const source = sources[window.source];
        if (source === undefined) continue;
        if (drawn !== null && !drawn.has(index)) {
          scores[index] = Infinity;
          continue;
        }
        let score = 0;
        for (const at of held) {
          const dx = at % block;
          const dy = (at - dx) / block;
          score += cost(
            existing[at] ?? 0,
            source.indices[
              (window.top + dy) * source.width + window.left + dx
            ] ?? 0,
          );
          if (score > best * (1 + tolerance) + 1) break;
        }
        scores[index] = score;
        if (score < best) best = score;
      }
      const near: number[] = [];
      for (let index = 0; index < windows.length; index += 1)
        if ((scores[index] ?? Infinity) <= best * (1 + tolerance) + 1)
          near.push(index);
      const chosen = windows[near[hash(seed, i, j, 0x51) % near.length] ?? 0];
      const source = chosen === undefined ? undefined : sources[chosen.source];
      if (chosen === undefined || source === undefined) continue;
      const fresh = (dx: number, dy: number): number =>
        source.indices[(chosen.top + dy) * source.width + chosen.left + dx] ??
        0;

      // The error of the new block against the old pixels.
      keep.fill(0);
      for (let at = 0; at < block * block; at += 1) {
        const old = existing[at] ?? EMPTY;
        const dx = at % block;
        error[at] = old === EMPTY ? 0 : cost(old, fresh(dx, (at - dx) / block));
      }
      const anyHeld = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
      ): boolean => {
        for (let dy = y0; dy < y1; dy += 1)
          for (let dx = x0; dx < x1; dx += 1)
            if (existing[dy * block + dx] !== EMPTY) return true;
        return false;
      };
      /**
       * The cheapest path along a strip `overlap` wide: `across(t, s)` is
       * the block index of the strip's pixel at `t` along and `s` across.
       * Returns for each `t` the `s` the path passes.
       */
      const path = (across: (t: number, s: number) => number): Int32Array => {
        const total = new Float64Array(block * overlap);
        for (let s = 0; s < overlap; s += 1)
          total[s] = error[across(0, s)] ?? 0;
        for (let t = 1; t < block; t += 1)
          for (let s = 0; s < overlap; s += 1) {
            let least = total[(t - 1) * overlap + s] ?? 0;
            if (s > 0)
              least = Math.min(least, total[(t - 1) * overlap + s - 1] ?? 0);
            if (s < overlap - 1)
              least = Math.min(least, total[(t - 1) * overlap + s + 1] ?? 0);
            total[t * overlap + s] = (error[across(t, s)] ?? 0) + least;
          }
        const route = new Int32Array(block);
        let at = 0;
        for (let s = 1; s < overlap; s += 1)
          if (
            (total[(block - 1) * overlap + s] ?? 0) <
            (total[(block - 1) * overlap + at] ?? 0)
          )
            at = s;
        route[block - 1] = at;
        for (let t = block - 2; t >= 0; t -= 1) {
          let next = at;
          for (const s of [at - 1, at + 1])
            if (
              s >= 0 &&
              s < overlap &&
              (total[t * overlap + s] ?? 0) < (total[t * overlap + next] ?? 0)
            )
              next = s;
          at = next;
          route[t] = at;
        }
        return route;
      };
      // Left and right strips: the old pixels are kept outside the path.
      if (anyHeld(0, 0, overlap, block)) {
        const route = path((t, s) => t * block + s);
        for (let dy = 0; dy < block; dy += 1)
          for (let dx = 0; dx < (route[dy] ?? 0); dx += 1)
            keep[dy * block + dx] = 1;
      }
      if (anyHeld(block - overlap, 0, block, block)) {
        const route = path((t, s) => t * block + block - 1 - s);
        for (let dy = 0; dy < block; dy += 1)
          for (let s = 0; s < (route[dy] ?? 0); s += 1)
            keep[dy * block + block - 1 - s] = 1;
      }
      if (anyHeld(0, 0, block, overlap)) {
        const route = path((t, s) => s * block + t);
        for (let dx = 0; dx < block; dx += 1)
          for (let dy = 0; dy < (route[dx] ?? 0); dy += 1)
            keep[dy * block + dx] = 1;
      }
      if (anyHeld(0, block - overlap, block, block)) {
        const route = path((t, s) => (block - 1 - s) * block + t);
        for (let dx = 0; dx < block; dx += 1)
          for (let s = 0; s < (route[dx] ?? 0); s += 1)
            keep[(block - 1 - s) * block + dx] = 1;
      }
      for (let dy = 0; dy < block; dy += 1)
        for (let dx = 0; dx < block; dx += 1) {
          const at = dy * block + dx;
          if (keep[at] === 1 && existing[at] !== EMPTY) continue;
          out[wrap(oy + dy, height) * width + wrap(ox + dx, width)] = fresh(
            dx,
            dy,
          );
        }
    }
  return out;
}

/** The share of horizontally and vertically adjacent pixel pairs that differ. */
export function busyness(indices: Uint8Array, width: number): number {
  const height = indices.length / width;
  let differ = 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const at = indices[y * width + x];
      if (at !== indices[y * width + ((x + 1) % width)]) differ += 1;
      if (at !== indices[((y + 1) % height) * width + x]) differ += 1;
    }
  return differ / (2 * indices.length);
}

/** Indices as an opaque raster in the given colours. */
export function paint(
  indices: Uint8Array,
  width: number,
  colours: readonly string[],
): RgbaRaster {
  const rgb = colours.map(hex);
  const data = new Uint8Array(indices.length * 4);
  for (let at = 0; at < indices.length; at += 1) {
    const [r, g, b] = rgb[indices[at] ?? 0] ?? [0, 0, 0];
    data.set([r, g, b, 255], at * 4);
  }
  return { width, height: indices.length / width, data };
}
