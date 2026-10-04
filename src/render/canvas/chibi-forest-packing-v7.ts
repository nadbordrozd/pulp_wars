/**
 * Composed CHIBI forests (bead pulp_wars-maw.3, docs/art/COMPOSED_FORESTS.md):
 * the piece shapes and the block-anchored packing.
 *
 * The board is cut into fixed 2 x 2 blocks aligned at even coordinates. A
 * block's packable Forest cells form a 4-bit mask; its pieces are one exact
 * cover of that mask by the shapes below, chosen by a hash of the block and
 * the mask. `packForestBlockV7` reads nothing else, and every piece lies
 * inside its block, so a change to one cell (a Forest cleared or planted, a
 * cell explored, a Lumber Camp built) re-picks at most that cell's block.
 * The choice is a pure function of coordinates and terrain, so a map always
 * draws the same forest.
 */
export type ForestShapeV7 =
  "1x1" | "2x1" | "1x2" | "2x2" | "L-NW" | "L-NE" | "L-SW" | "L-SE";

/**
 * Footprints, rows north to south, "#" a covered cell. "2x1" is two cells
 * wide; "L-NE" is a 2 x 2 block without its north-east cell.
 */
export const FOREST_SHAPES_V7: Readonly<
  Record<ForestShapeV7, readonly string[]>
> = {
  "1x1": ["#"],
  "2x1": ["##"],
  "1x2": ["#", "#"],
  "2x2": ["##", "##"],
  "L-NW": [".#", "##"],
  "L-NE": ["#.", "##"],
  "L-SW": ["##", ".#"],
  "L-SE": ["##", "#."],
};

export const FOREST_SHAPE_IDS_V7 = Object.keys(
  FOREST_SHAPES_V7,
) as ForestShapeV7[];

export interface ForestPlacementV7 {
  readonly shape: ForestShapeV7;
  /** Top-left cell of the shape's bounding box. */
  readonly x: number;
  readonly y: number;
  readonly variant: number;
}

/** Piece variants available per shape; a shape with 0 is never placed. */
export type ForestVariantCountsV7 = Readonly<Record<ForestShapeV7, number>>;

/** Relative preference of each shape; a tiling's weight is their product. */
const SHAPE_WEIGHTS: Readonly<Record<ForestShapeV7, number>> = {
  "1x1": 1,
  "2x1": 2.4,
  "1x2": 2.4,
  "2x2": 9,
  "L-NW": 3,
  "L-NE": 3,
  "L-SW": 3,
  "L-SE": 3,
};

// Block bits: NW 1, NE 2, SW 4, SE 8.
interface BlockPlacement {
  readonly shape: ForestShapeV7;
  readonly mask: number;
  readonly dx: number;
  readonly dy: number;
}

const BLOCK_PLACEMENTS: readonly BlockPlacement[] = [
  { shape: "2x2", mask: 15, dx: 0, dy: 0 },
  { shape: "L-NW", mask: 14, dx: 0, dy: 0 },
  { shape: "L-NE", mask: 13, dx: 0, dy: 0 },
  { shape: "L-SW", mask: 11, dx: 0, dy: 0 },
  { shape: "L-SE", mask: 7, dx: 0, dy: 0 },
  { shape: "2x1", mask: 3, dx: 0, dy: 0 },
  { shape: "2x1", mask: 12, dx: 0, dy: 1 },
  { shape: "1x2", mask: 5, dx: 0, dy: 0 },
  { shape: "1x2", mask: 10, dx: 1, dy: 0 },
  { shape: "1x1", mask: 1, dx: 0, dy: 0 },
  { shape: "1x1", mask: 2, dx: 1, dy: 0 },
  { shape: "1x1", mask: 4, dx: 0, dy: 1 },
  { shape: "1x1", mask: 8, dx: 1, dy: 1 },
];

/** Every exact cover of `mask` by the available shapes. */
function tilings(
  mask: number,
  available: (shape: ForestShapeV7) => boolean,
): BlockPlacement[][] {
  if (mask === 0) return [[]];
  const lowest = mask & -mask;
  const result: BlockPlacement[][] = [];
  for (const placement of BLOCK_PLACEMENTS) {
    if (!available(placement.shape)) continue;
    if ((placement.mask & lowest) === 0) continue;
    if ((placement.mask & ~mask) !== 0) continue;
    for (const rest of tilings(mask & ~placement.mask, available))
      result.push([placement, ...rest]);
  }
  return result;
}

export function forestHashV7(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
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

/**
 * The pieces of block (bx, by): a pure function of the block, of which of
 * its four cells `packable` accepts, and of the variant counts.
 */
export function packForestBlockV7(
  packable: (x: number, y: number) => boolean,
  bx: number,
  by: number,
  variants: ForestVariantCountsV7,
): ForestPlacementV7[] {
  const mask =
    (packable(2 * bx, 2 * by) ? 1 : 0) |
    (packable(2 * bx + 1, 2 * by) ? 2 : 0) |
    (packable(2 * bx, 2 * by + 1) ? 4 : 0) |
    (packable(2 * bx + 1, 2 * by + 1) ? 8 : 0);
  if (mask === 0) return [];
  const options = tilings(mask, (shape) => variants[shape] > 0);
  const weights = options.map((option) =>
    option.reduce((product, p) => product * SHAPE_WEIGHTS[p.shape], 1),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = (forestHashV7(bx, by, mask, 0x51) / 0x1_0000_0000) * total;
  let chosen = options[options.length - 1] ?? [];
  for (const [index, option] of options.entries()) {
    roll -= weights[index] ?? 0;
    if (roll < 0) {
      chosen = option;
      break;
    }
  }
  return chosen.map((p) => ({
    shape: p.shape,
    x: 2 * bx + p.dx,
    y: 2 * by + p.dy,
    variant:
      forestHashV7(2 * bx + p.dx, 2 * by + p.dy, p.mask, 0x77) %
      Math.max(1, variants[p.shape]),
  }));
}

/** The cells a placement covers, in row-major order. */
export function forestPlacementCellsV7(
  placement: ForestPlacementV7,
): [number, number][] {
  const cells: [number, number][] = [];
  FOREST_SHAPES_V7[placement.shape].forEach((row, dy) =>
    [...row].forEach((mark, dx) => {
      if (mark === "#") cells.push([placement.x + dx, placement.y + dy]);
    }),
  );
  return cells;
}

/**
 * Rectangles of a shape's footprint in cells from its bounding box: one per
 * run of covered cells in a row, merged downwards when the next row has the
 * same run (a 2 x 2 is one rectangle, an L is two).
 */
export function forestShapeRectsV7(
  shape: ForestShapeV7,
): { x: number; y: number; w: number; h: number }[] {
  const rows = FOREST_SHAPES_V7[shape];
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  rows.forEach((row, y) => {
    const x = row.indexOf("#");
    const w = row.lastIndexOf("#") - x + 1;
    const above = rects[rects.length - 1];
    if (
      above !== undefined &&
      above.x === x &&
      above.w === w &&
      above.y + above.h === y
    )
      above.h += 1;
    else rects.push({ x, y, w, h: 1 });
  });
  return rects;
}
