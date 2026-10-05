/**
 * The Ice Folk sea ice as pixels (bead pulp_wars-5ti.6,
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.3 and 14.3). An ice
 * tile is a layer over a water tile: the board draws the water, then the
 * ice tile of that water's depth (`TERRAIN:ICE_SHALLOW` or
 * `TERRAIN:ICE_DEEP`, src/assets/chibi-art-manifest.ts). The two rasters
 * are full, seamless 80 x 80 sheets, so ice next to ice needs nothing. What
 * a sheet cannot carry is its edge: where the ice ends at open water it
 * must not stop on the tile's straight side like a second kind of water.
 *
 * `seaIceTileV7` cuts that edge: on every side named in `openWater` the
 * sheet stops a few ragged pixels short of the tile's side (the water under
 * it shows there) behind a pale rim with a darker line under it, and where
 * two such sides meet the corner is rounded. A side that meets more ice or
 * land is left whole, so ice joins ice without a seam and reaches the shore.
 * `permanent` dusts the sheet with snow, a faint wash with a few small
 * drifts and sparkles (ice inside its owner's territory never melts;
 * melting ice shows cracks instead, which the board draws).
 *
 * Pure and deterministic, like the Snow tiles of the Ice Folk
 * (iceFolkSnowTileV7): the same sheet, sides and variant always give the
 * same pixels, so a board can cache one surface per combination (16 side
 * sets x 2 variants x 2 depths x 2 states). The board draws it since the
 * frozen-sea interface (bead pulp_wars-5ti.7, `IceFolkBoardArtV7.seaIce`);
 * the review `npm run art:naval-branch-ice-review` draws its mock map
 * with it.
 */

export interface SeaIceRasterV7 {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Bits of `openWater`: the sides of the tile where the ice meets open water. */
export const SEA_ICE_EDGE_NORTH_V7 = 1;
export const SEA_ICE_EDGE_EAST_V7 = 2;
export const SEA_ICE_EDGE_SOUTH_V7 = 4;
export const SEA_ICE_EDGE_WEST_V7 = 8;

export const SEA_ICE_EDGE_V7 = {
  /** The water strip left at an open side: 2 to 6 pixels, wavy. */
  minInset: 2,
  maxInset: 6,
  /** The inset at both ends of a side, so two tiles in a row line up. */
  endInset: 4,
  /** The pale rim of the floe and the darker line inside it. */
  rimWidth: 2,
  rim: { r: 0xf6, g: 0xfd, b: 0xff },
  /** The line under the rim: the sheet's own colour, this much darker. */
  shade: 0.86,
  /** Radius of the rounded corner between two open sides. */
  cornerRadius: 12,
} as const;

export const SEA_ICE_SNOW_V7 = {
  /** Snow drifts on a permanent sheet: small pale mounds. */
  drifts: 4,
  /** A drift's half width and half height, in pixels. */
  minHalfWidth: 5,
  maxHalfWidth: 8,
  halfHeight: 2.4,
  /** Drifts and sparkles keep this far from the tile's sides (seamless). */
  margin: 9,
  colour: { r: 0xff, g: 0xff, b: 0xff },
  /** The line under a drift: the sheet's own colour, this much darker. */
  shade: 0.88,
  /** Single white sparkle pixels between the drifts. */
  sparkles: 9,
  /** How far the whole sheet is lifted towards white under the snow. */
  wash: 0.1,
} as const;

/** A stable hash of two integers and a salt, in [0, 1). */
function hash(a: number, b: number, salt: number): number {
  let value =
    Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + salt, 0xc2b2ae35);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 0x1_0000_0000;
}

/**
 * The ragged inset of an open side at `along` pixels from its start: a
 * smooth wave of three hashed sines between `minInset` and `maxInset`,
 * pinned to `endInset` at both ends (the Snow cut's rule), so the floe edge
 * runs on from one tile to the next.
 */
export function seaIceInsetV7(
  side: number,
  along: number,
  length: number,
  variant: number,
): number {
  const { minInset, maxInset, endInset } = SEA_ICE_EDGE_V7;
  const t = along / (length - 1);
  const ends = Math.sin(Math.PI * t);
  let wave = 0;
  for (let k = 1; k <= 3; k += 1)
    wave +=
      Math.sin(2 * Math.PI * k * t + hash(k, side, 31 + variant * 7) * 6.283) /
      k;
  const amplitude = Math.min(maxInset - endInset, endInset - minInset);
  return Math.max(
    minInset,
    Math.min(maxInset, Math.round(endInset + ends * wave * amplitude * 1.1)),
  );
}

/**
 * The ice sheet of one tile: `sheet` (the 80 x 80 raster of the tile's
 * depth and variant) cut at its open-water sides and, when `permanent`,
 * dusted with snow.
 */
export function seaIceTileV7(
  sheet: SeaIceRasterV7,
  openWater: number,
  variant: number,
  permanent = false,
): SeaIceRasterV7 {
  const { width, height } = sheet;
  const data = new Uint8ClampedArray(sheet.data);
  const edge = SEA_ICE_EDGE_V7;
  const north = (openWater & SEA_ICE_EDGE_NORTH_V7) !== 0;
  const east = (openWater & SEA_ICE_EDGE_EAST_V7) !== 0;
  const south = (openWater & SEA_ICE_EDGE_SOUTH_V7) !== 0;
  const west = (openWater & SEA_ICE_EDGE_WEST_V7) !== 0;
  if (permanent) {
    const snow = SEA_ICE_SNOW_V7;
    const paint = (
      x: number,
      y: number,
      colour: { readonly r: number; readonly g: number; readonly b: number },
      amount: number,
    ): void => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const o = (y * width + x) * 4;
      data[o] = Math.round((data[o] ?? 0) * (1 - amount) + colour.r * amount);
      data[o + 1] = Math.round(
        (data[o + 1] ?? 0) * (1 - amount) + colour.g * amount,
      );
      data[o + 2] = Math.round(
        (data[o + 2] ?? 0) * (1 - amount) + colour.b * amount,
      );
    };
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) paint(x, y, snow.colour, snow.wash);
    const spanX = width - 2 * snow.margin;
    const spanY = height - 2 * snow.margin;
    for (let index = 0; index < snow.drifts; index += 1) {
      // One drift in each quarter of the tile, so they never pile up.
      const salt = 53 + variant * 17;
      const half =
        snow.minHalfWidth +
        Math.floor(
          hash(index, 1, salt) * (snow.maxHalfWidth - snow.minHalfWidth + 1),
        );
      const cx = Math.round(
        snow.margin +
          half +
          ((index % 2) + hash(index, 2, salt) * 0.8) * ((spanX - 2 * half) / 2),
      );
      const cy = Math.round(
        snow.margin +
          3 +
          (Math.floor(index / 2) + hash(index, 3, salt) * 0.8) *
            ((spanY - 6) / 2),
      );
      for (let dy = -3; dy <= 3; dy += 1)
        for (let dx = -half; dx <= half; dx += 1) {
          const inside = (py: number): boolean =>
            (dx / half) ** 2 + (py / snow.halfHeight) ** 2 <= 1;
          if (inside(dy)) paint(cx + dx, cy + dy, snow.colour, 1);
          // The darker line hugging the drift's lower edge.
          else if (dy > 0 && inside(dy - 1)) {
            const o = ((cy + dy) * width + cx + dx) * 4;
            data[o] = Math.round((data[o] ?? 0) * snow.shade);
            data[o + 1] = Math.round((data[o + 1] ?? 0) * snow.shade);
            data[o + 2] = Math.round((data[o + 2] ?? 0) * snow.shade);
          }
        }
    }
    for (let index = 0; index < snow.sparkles; index += 1)
      paint(
        snow.margin + Math.floor(hash(index, 5, 71 + variant * 3) * spanX),
        snow.margin + Math.floor(hash(index, 6, 71 + variant * 3) * spanY),
        snow.colour,
        1,
      );
  }
  if (openWater === 0) return { width, height, data };
  /**
   * How far inside the floe a pixel is: its distance past the ragged edge
   * of the nearest open side (negative: in the water strip).
   */
  const depth = (x: number, y: number): number => {
    let inside = Number.POSITIVE_INFINITY;
    const sides: (readonly [boolean, number, number, number, number])[] = [
      [north, SEA_ICE_EDGE_NORTH_V7, y, x, width],
      [east, SEA_ICE_EDGE_EAST_V7, width - 1 - x, y, height],
      [south, SEA_ICE_EDGE_SOUTH_V7, height - 1 - y, x, width],
      [west, SEA_ICE_EDGE_WEST_V7, x, y, height],
    ];
    for (const [open, side, distance, along, length] of sides)
      if (open)
        inside = Math.min(
          inside,
          distance - seaIceInsetV7(side, along, length, variant),
        );
    // A rounded corner where two open sides meet.
    const r = edge.cornerRadius;
    const corners: (readonly [boolean, number, number])[] = [
      [north && west, x, y],
      [north && east, width - 1 - x, y],
      [south && east, width - 1 - x, height - 1 - y],
      [south && west, x, height - 1 - y],
    ];
    for (const [open, dx, dy] of corners)
      if (open && dx < r && dy < r)
        inside = Math.min(
          inside,
          r - edge.endInset - Math.hypot(r - dx, r - dy),
        );
    return inside;
  };
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const inside = depth(x, y);
      if (inside === Number.POSITIVE_INFINITY) continue;
      const o = (y * width + x) * 4;
      if (inside < 0) {
        data[o + 3] = 0;
      } else if (inside < edge.rimWidth) {
        data[o] = edge.rim.r;
        data[o + 1] = edge.rim.g;
        data[o + 2] = edge.rim.b;
      } else if (inside < edge.rimWidth + 1) {
        data[o] = Math.round((data[o] ?? 0) * edge.shade);
        data[o + 1] = Math.round((data[o + 1] ?? 0) * edge.shade);
        data[o + 2] = Math.round((data[o + 2] ?? 0) * edge.shade);
      }
    }
  return { width, height, data };
}
