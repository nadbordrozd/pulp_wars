/**
 * Pure footprint measurement of a unit sprite (bead pulp_wars-jg1): where
 * the unit touches the ground and how wide it is there, in master pixels
 * from the canvas's top-left corner. It reads RGBA bytes only, so the
 * generator (scripts/art/unit-shadow-measure.ts) and the tests measure the
 * same way.
 */

export interface RgbaBytesV7 {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface UnitFootprintV7 {
  /**
   * The contact line: one past the lowest row with at least
   * FOOT_MIN_PIXELS opaque pixels (the bottom edge of the feet, wheels or
   * hull). A stray single pixel below it does not count.
   */
  readonly contactY: number;
  /** Left edge and one-past-right edge of the opaque pixels in the foot band. */
  readonly footLeft: number;
  readonly footRight: number;
  /** Left edge and one-past-right edge of the opaque pixels in the base band. */
  readonly baseLeft: number;
  readonly baseRight: number;
  /** Opaque bounding box of the whole sprite. */
  readonly top: number;
  readonly left: number;
  readonly right: number;
}

/** A pixel counts as opaque from this alpha (the owner-mask threshold). */
export const FOOT_ALPHA_THRESHOLD_V7 = 128;
/** Opaque pixels a row needs to count as the contact row. */
export const FOOT_MIN_PIXELS_V7 = 2;
/** Rows above the contact line that make the foot band (the feet themselves). */
export const FOOT_BAND_ROWS_V7 = 4;
/**
 * Rows above the contact line that make the base band: the lower body whose
 * width the shadow should match (legs, wheels, a tail on the ground).
 */
export const BASE_BAND_ROWS_V7 = 14;

export function measureUnitFootprintV7(raster: RgbaBytesV7): UnitFootprintV7 {
  const { width, height, data } = raster;
  const opaque = (x: number, y: number): boolean =>
    (data[(y * width + x) * 4 + 3] ?? 0) >= FOOT_ALPHA_THRESHOLD_V7;
  let top = height;
  let left = width;
  let right = 0;
  let contactY = 0;
  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y)) continue;
      count += 1;
      top = Math.min(top, y);
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
    }
    if (count >= FOOT_MIN_PIXELS_V7) contactY = y + 1;
  }
  if (contactY === 0) throw new Error("the sprite has no opaque row");
  const band = (rows: number): readonly [number, number] => {
    let bandLeft = width;
    let bandRight = 0;
    for (let y = Math.max(0, contactY - rows); y < contactY; y += 1)
      for (let x = 0; x < width; x += 1)
        if (opaque(x, y)) {
          bandLeft = Math.min(bandLeft, x);
          bandRight = Math.max(bandRight, x + 1);
        }
    return [bandLeft, bandRight];
  };
  const [footLeft, footRight] = band(FOOT_BAND_ROWS_V7);
  const [baseLeft, baseRight] = band(BASE_BAND_ROWS_V7);
  return {
    contactY,
    footLeft,
    footRight,
    baseLeft,
    baseRight,
    top,
    left,
    right,
  };
}
