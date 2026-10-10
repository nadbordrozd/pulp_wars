/**
 * Pure footprint measurement of a settlement sprite (bead pulp_wars-2yc.12):
 * where a city's or a village's buildings meet the ground, in master pixels
 * from the canvas's top-left corner. It reads RGBA bytes only, so the
 * generator (scripts/art/settlement-shadow-measure.ts) and the tests measure
 * the same way.
 *
 * A settlement is drawn from above and in front, so its footprint on the
 * ground shows as the sprite's LOWER OUTLINE: for every column, the lowest
 * opaque pixel. The outline runs from the left corner of the footprint down
 * to its front and up again to the right corner. The measurement is that
 * outline boiled down to an ellipse: its two ends, its lowest row, and how
 * full the outline is between them (a walled town's diamond is leaner than
 * a camp's round ground).
 */
import {
  FOOT_ALPHA_THRESHOLD_V7,
  FOOT_MIN_PIXELS_V7,
  type RgbaBytesV7,
} from "../unit-shadows/measure";

export interface SettlementFootprintV7 {
  /** One past the lowest row with at least FOOT_MIN_PIXELS opaque pixels. */
  readonly contactY: number;
  /** Left edge and one-past-right edge of the columns that count. */
  readonly left: number;
  readonly right: number;
  /**
   * The ground line at the footprint's left and right ends: the median
   * lower outline of the outer SETTLEMENT_EDGE_SHARE_V7 of the columns.
   */
  readonly leftY: number;
  readonly rightY: number;
  /**
   * How full the lower outline is, against the ellipse through the two
   * ends and the contact line: 1 is that ellipse (round ground), about 0.7
   * a diamond whose corners alone reach it. Two decimals.
   */
  readonly fullness: number;
}

/** Opaque pixels a column needs to count (a stray pixel does not). */
export const SETTLEMENT_MIN_COLUMN_PIXELS_V7 = FOOT_MIN_PIXELS_V7;
/** The share of the columns, at each end, whose outline gives the end's row. */
export const SETTLEMENT_EDGE_SHARE_V7 = 0.12;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function measureSettlementFootprintV7(
  raster: RgbaBytesV7,
): SettlementFootprintV7 {
  const { width, height, data } = raster;
  const opaque = (x: number, y: number): boolean =>
    (data[(y * width + x) * 4 + 3] ?? 0) >= FOOT_ALPHA_THRESHOLD_V7;
  let contactY = 0;
  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) if (opaque(x, y)) count += 1;
    if (count >= FOOT_MIN_PIXELS_V7) contactY = y + 1;
  }
  if (contactY === 0) throw new Error("the sprite has no opaque row");
  /** The lower outline: per counted column, one past its lowest opaque row. */
  const outline: { readonly x: number; readonly bottom: number }[] = [];
  for (let x = 0; x < width; x += 1) {
    let count = 0;
    let bottom = 0;
    for (let y = 0; y < contactY; y += 1)
      if (opaque(x, y)) {
        count += 1;
        bottom = y + 1;
      }
    if (count >= SETTLEMENT_MIN_COLUMN_PIXELS_V7) outline.push({ x, bottom });
  }
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (first === undefined || last === undefined)
    throw new Error("the sprite has no opaque column");
  const left = first.x;
  const right = last.x + 1;
  const edge = Math.max(
    2,
    Math.round((right - left) * SETTLEMENT_EDGE_SHARE_V7),
  );
  const leftY = median(
    outline.filter((column) => column.x < left + edge).map((c) => c.bottom),
  );
  const rightY = median(
    outline.filter((column) => column.x >= right - edge).map((c) => c.bottom),
  );
  const centreX = (left + right) / 2;
  const centreY = (leftY + rightY) / 2;
  const radiusX = (right - left) / 2;
  const radiusY = Math.max(1, contactY - centreY);
  // Each outline point below the centre line, as a share of the way from
  // the centre to that ellipse; their mean is the fullness.
  const shares = outline
    .filter((column) => column.bottom >= centreY)
    .map((column) =>
      Math.hypot(
        (column.x + 0.5 - centreX) / radiusX,
        (column.bottom - centreY) / radiusY,
      ),
    );
  const fullness =
    shares.length === 0
      ? 1
      : shares.reduce((sum, share) => sum + share, 0) / shares.length;
  return {
    contactY,
    left,
    right,
    leftY,
    rightY,
    fullness: Math.round(fullness * 100) / 100,
  };
}
