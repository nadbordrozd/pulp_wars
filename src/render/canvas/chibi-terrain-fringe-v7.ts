import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import type { Point } from "./geometry";

/**
 * CHIBI Mountain ground fringe (bead pulp_wars-6gd.7). A Mountain stands on
 * the square rocky ground tile; against Grass or Forest its straight edge
 * read as a grey box. Where a Mountain cell borders a non-Mountain land
 * cell, the rocky ground is cut back by a ragged, binary alpha edge with a
 * darker rim, convex corners are rounded, and a few loose stones stay on
 * the grass that shows through. Edges between two Mountain cells are never
 * cut, so a range stays one seamless rocky area; edges against water, fog
 * and the board edge stay straight, like the Grass tile's own edges there.
 *
 * Everything here is a pure function of the cell and its exposed edges, so
 * the result never flickers; the cut is made once per ground raster in
 * master pixels and drawn through the shared terrain part rect, so it
 * needs no geometry of its own at any zoom step or device pixel ratio.
 */

export const CHIBI_FRINGE_NORTH = 1;
export const CHIBI_FRINGE_EAST = 2;
export const CHIBI_FRINGE_SOUTH = 4;
export const CHIBI_FRINGE_WEST = 8;

/** Mask values: the ground pixel is cut, kept, or kept as the darker rim. */
export const CHIBI_FRINGE_CUT = 0;
export const CHIBI_FRINGE_KEEP = 1;
export const CHIBI_FRINGE_RIM = 2;

/** Ragged profiles per edge set; bounds the fringed ground raster cache. */
export const CHIBI_FRINGE_VARIANTS = 8;
/** Cut depth where an exposed edge meets a cell corner, in master px. */
export const CHIBI_FRINGE_END_DEPTH = 6;
/** Deepest straight-edge cut, in master px (rounded corners reach further). */
export const CHIBI_FRINGE_MAX_DEPTH = 14;
/** Largest radius of a rounded convex corner, in master px. */
export const CHIBI_FRINGE_MAX_CORNER = 30;

const NODE_SPACING = 8;
const RIM_SHADE = 0.66;

const SIDES = [
  [CHIBI_FRINGE_NORTH, 0, -1],
  [CHIBI_FRINGE_EAST, 1, 0],
  [CHIBI_FRINGE_SOUTH, 0, 1],
  [CHIBI_FRINGE_WEST, -1, 0],
] as const;

function isMountain(subject: ArtSubjectV7 | undefined): boolean {
  return subject === "TERRAIN:MOUNTAIN" || subject === "TERRAIN:MINED_MOUNTAIN";
}

function isLand(subject: ArtSubjectV7 | undefined): boolean {
  return (
    subject !== undefined &&
    subject.startsWith("TERRAIN:") &&
    subject !== "TERRAIN:SHALLOW_WATER" &&
    subject !== "TERRAIN:DEEP_WATER"
  );
}

/**
 * The exposed edges of a Mountain cell as a bit set: an edge is exposed
 * when the orthogonal neighbour is explored land that is not a Mountain.
 * `terrainAt` returns the neighbour's terrain subject, or undefined for
 * fog and cells off the board. A cell that is not a Mountain has none.
 */
export function chibiMountainFringeEdgesV7(
  subject: ArtSubjectV7 | undefined,
  at: Point,
  terrainAt: (at: Point) => ArtSubjectV7 | undefined,
): number {
  if (!isMountain(subject)) return 0;
  let edges = 0;
  for (const [bit, dx, dy] of SIDES) {
    const neighbour = terrainAt({ x: at.x + dx, y: at.y + dy });
    if (isLand(neighbour) && !isMountain(neighbour)) edges |= bit;
  }
  return edges;
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

/** The ragged profile a cell uses; cells with equal variants share rasters. */
export function chibiFringeVariantV7(at: Point): number {
  return hash(at.x, at.y, 17, 0) % CHIBI_FRINGE_VARIANTS;
}

/**
 * Cut depth along one exposed edge at offset `t` (0 at the edge's start).
 * Both ends are exactly CHIBI_FRINGE_END_DEPTH in every variant, so the
 * outline of a range continues across the boundary of two Mountain cells.
 */
function edgeDepth(
  variant: number,
  side: number,
  t: number,
  size: number,
): number {
  const last = Math.floor((size - 1) / NODE_SPACING);
  const node = (index: number): number =>
    index <= 0 || index >= last + 1
      ? CHIBI_FRINGE_END_DEPTH
      : 4 + (hash(variant, side, index, 1) % (CHIBI_FRINGE_MAX_DEPTH - 4));
  const position = (t / (size - 1)) * (last + 1);
  const index = Math.min(last, Math.floor(position));
  const blend = position - index;
  const depth = node(index) * (1 - blend) + node(index + 1) * blend;
  // One-pixel jags away from the ends keep the outline chunky, not smooth.
  const jag =
    t < 4 || t > size - 5 ? 0 : (hash(variant, side, t >> 1, 2) % 3) - 1;
  return Math.max(3, Math.min(CHIBI_FRINGE_MAX_DEPTH, Math.round(depth) + jag));
}

/**
 * The fringe mask of one ground tile, `size` x `size` master pixels, row
 * major: CHIBI_FRINGE_CUT, CHIBI_FRINGE_KEEP or CHIBI_FRINGE_RIM per pixel.
 */
export function chibiFringeMaskV7(
  variant: number,
  edges: number,
  size: number,
): Uint8Array {
  const mask = new Uint8Array(size * size).fill(CHIBI_FRINGE_KEEP);
  if (edges === 0) return mask;
  const exposed = (bit: number): boolean => (edges & bit) !== 0;
  // Distance of a pixel from each edge, and its offset along that edge.
  const distance = (bit: number, x: number, y: number): number =>
    bit === CHIBI_FRINGE_NORTH
      ? y
      : bit === CHIBI_FRINGE_SOUTH
        ? size - 1 - y
        : bit === CHIBI_FRINGE_WEST
          ? x
          : size - 1 - x;
  const along = (bit: number, x: number, y: number): number =>
    bit === CHIBI_FRINGE_NORTH || bit === CHIBI_FRINGE_SOUTH ? x : y;
  const depths = new Map<number, number[]>();
  for (const [bit] of SIDES)
    if (exposed(bit))
      depths.set(
        bit,
        Array.from({ length: size }, (_, t) =>
          edgeDepth(variant, bit, t, size),
        ),
      );
  const corners = (
    [
      [CHIBI_FRINGE_NORTH, CHIBI_FRINGE_WEST],
      [CHIBI_FRINGE_NORTH, CHIBI_FRINGE_EAST],
      [CHIBI_FRINGE_SOUTH, CHIBI_FRINGE_EAST],
      [CHIBI_FRINGE_SOUTH, CHIBI_FRINGE_WEST],
    ] as const
  )
    .filter(([a, b]) => exposed(a) && exposed(b))
    .map(([a, b], index) => ({
      a,
      b,
      radius: CHIBI_FRINGE_MAX_CORNER - (hash(variant, a | b, index, 3) % 7),
    }));
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      let cut = false;
      for (const [bit, values] of depths)
        if (distance(bit, x, y) < (values[along(bit, x, y)] ?? 0)) cut = true;
      for (const { a, b, radius } of corners) {
        const da = distance(a, x, y);
        const db = distance(b, x, y);
        if (da >= radius || db >= radius) continue;
        const inner = radius - CHIBI_FRINGE_END_DEPTH;
        if ((radius - da - 0.5) ** 2 + (radius - db - 0.5) ** 2 > inner * inner)
          cut = true;
      }
      if (cut) mask[y * size + x] = CHIBI_FRINGE_CUT;
    }
  // Loose stones: small blobs of ground kept just outside the cut edge.
  const cutOnly = mask.slice();
  const isCut = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < size &&
    y < size &&
    cutOnly[y * size + x] === CHIBI_FRINGE_CUT;
  for (let by = 0; by < size; by += 6)
    for (let bx = 0; bx < size; bx += 6) {
      const roll = hash(variant, bx, by, 4 + edges);
      if (roll % 5 !== 0) continue;
      const x0 = bx + 1 + ((roll >>> 8) % 3);
      const y0 = by + 1 + ((roll >>> 12) % 3);
      const wide = 2 + ((roll >>> 16) % 2);
      // A stone needs cut ground all around it, itself included.
      let free = true;
      for (let y = y0 - 1; y <= y0 + 2 && free; y += 1)
        for (let x = x0 - 1; x <= x0 + wide && free; x += 1)
          if (!isCut(x, y)) free = false;
      if (!free) continue;
      for (let y = y0; y < y0 + 2; y += 1)
        for (let x = x0; x < x0 + wide; x += 1)
          mask[y * size + x] = CHIBI_FRINGE_KEEP;
    }
  // Rim: kept ground touching cut ground is drawn darker, as an outline.
  const shaped = mask.slice();
  const cutAt = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < size &&
    y < size &&
    shaped[y * size + x] === CHIBI_FRINGE_CUT;
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1)
      if (
        shaped[y * size + x] === CHIBI_FRINGE_KEEP &&
        (cutAt(x - 1, y) ||
          cutAt(x + 1, y) ||
          cutAt(x, y - 1) ||
          cutAt(x, y + 1))
      )
        mask[y * size + x] = CHIBI_FRINGE_RIM;
  return mask;
}

/** Applies a fringe mask to RGBA ground pixels; returns a new buffer. */
export function applyChibiFringeMaskV7(
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels);
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4;
    const value = mask[index];
    if (value === CHIBI_FRINGE_CUT) result[offset + 3] = 0;
    else if (value === CHIBI_FRINGE_RIM)
      for (let channel = 0; channel < 3; channel += 1)
        result[offset + channel] = Math.round(
          (result[offset + channel] ?? 0) * RIM_SHADE,
        );
  }
  return result;
}
