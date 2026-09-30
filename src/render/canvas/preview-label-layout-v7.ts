/**
 * Layout of the board's preview text boxes (attack preview labels and notes,
 * ability target labels) for both art sets (bead pulp_wars-nbl). All values
 * are CSS pixels: the board context is scaled by the device pixel ratio.
 *
 * A box is clamped inside the visible, unobscured part of the canvas (the
 * band the start-camera framing uses, between the HUD and the dock) and
 * nudged off boxes placed earlier in the same frame. Text never shrinks below
 * PREVIEW_TEXT_MIN_FONT_CSS_PX_V7; a text too wide for its cell wraps onto
 * two lines at its ` · ` separators instead.
 */

export interface PreviewRectV7 {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface PreviewBoxV7 {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Smallest preview label or note font, in CSS px, at every zoom. */
export const PREVIEW_TEXT_MIN_FONT_CSS_PX_V7 = 10;
/** Gap kept between a clamped box and the edge of the visible band. */
export const PREVIEW_EDGE_MARGIN_CSS_PX_V7 = 4;
/** Gap kept between two nudged boxes. */
const NUDGE_GAP_CSS_PX = 1;

const SEPARATOR = " · ";

/**
 * Splits a ` · `-separated preview text onto at most two lines when it is
 * wider than `maxWidth`, choosing the split with the narrowest widest line.
 * A text that fits, or has no separator, stays on one line.
 */
export function wrapPreviewTextV7(
  text: string,
  maxWidth: number,
  measure: (line: string) => number,
): readonly string[] {
  if (measure(text) <= maxWidth) return [text];
  const parts = text.split(SEPARATOR);
  if (parts.length < 2) return [text];
  let best: readonly string[] = [text];
  let bestWidth = Number.POSITIVE_INFINITY;
  for (let split = 1; split < parts.length; split += 1) {
    const lines = [
      parts.slice(0, split).join(SEPARATOR),
      parts.slice(split).join(SEPARATOR),
    ];
    const width = Math.max(...lines.map(measure));
    if (width < bestWidth) {
      best = lines;
      bestWidth = width;
    }
  }
  return best;
}

/**
 * Places preview boxes for one frame, in draw order. `safe` is the rectangle
 * boxes must stay inside (null disables clamping and nudging). A box whose
 * anchor cell is wholly outside `safe` keeps its natural position, so a label
 * is never pulled into view for a target the player cannot see.
 */
export class PreviewLabelPlacerV7 {
  readonly #safe: PreviewRectV7 | null;
  readonly #placed: PreviewRectV7[] = [];

  constructor(safe: PreviewRectV7 | null) {
    this.#safe =
      safe !== null && safe.right > safe.left && safe.bottom > safe.top
        ? safe
        : null;
  }

  /** Returns the box's final top-left corner and reserves its rectangle. */
  place(
    box: PreviewBoxV7,
    anchor: PreviewRectV7,
  ): { readonly left: number; readonly top: number } {
    const safe = this.#safe;
    // A hidden target's box stays put and reserves nothing.
    if (safe === null || !intersects(anchor, safe))
      return { left: box.left, top: box.top };
    const { left, top } = this.#nudge(
      {
        left: clampAxis(box.left, box.width, safe.left, safe.right),
        top: clampAxis(box.top, box.height, safe.top, safe.bottom),
        width: box.width,
        height: box.height,
      },
      safe,
      anchor,
    );
    this.#placed.push({
      left,
      top,
      right: left + box.width,
      bottom: top + box.height,
    });
    return { left, top };
  }

  /**
   * Moves a clamped box off every earlier box. A short sideways shift (at
   * most half a cell) is tried first, so neighbouring targets' boxes stay
   * under their own cells; otherwise the smaller of the downward and upward
   * shifts (down on a tie), at most one cell. A longer shift would detach the
   * box from its target, so the box then keeps its clamped position.
   */
  #nudge(
    box: PreviewBoxV7,
    safe: PreviewRectV7,
    anchor: PreviewRectV7,
  ): { readonly left: number; readonly top: number } {
    const collide = (left: number, top: number): PreviewRectV7 | undefined =>
      this.#placed.find((placed) =>
        intersects(
          { left, top, right: left + box.width, bottom: top + box.height },
          placed,
        ),
      );
    if (collide(box.left, box.top) === undefined) return box;
    // Follows collisions along one axis until the box is free; null when it
    // would leave the safe rectangle or move further than `limit`.
    const shifted = (
      axis: "x" | "y",
      direction: 1 | -1,
      limit: number,
    ): number | null => {
      const start = axis === "x" ? box.left : box.top;
      const size = axis === "x" ? box.width : box.height;
      const min = axis === "x" ? safe.left : safe.top;
      const max = axis === "x" ? safe.right : safe.bottom;
      let value = start;
      for (let step = 0; step <= this.#placed.length; step += 1) {
        const hit =
          axis === "x" ? collide(value, box.top) : collide(box.left, value);
        if (hit === undefined) return value;
        const low = axis === "x" ? hit.left : hit.top;
        const high = axis === "x" ? hit.right : hit.bottom;
        value =
          direction === 1
            ? high + NUDGE_GAP_CSS_PX
            : low - NUDGE_GAP_CSS_PX - size;
        if (
          value < min ||
          value + size > max ||
          Math.abs(value - start) > limit
        )
          return null;
      }
      return null;
    };
    const nearest = (axis: "x" | "y", limit: number): number | null => {
      const start = axis === "x" ? box.left : box.top;
      const forward = shifted(axis, 1, limit);
      const backward = shifted(axis, -1, limit);
      if (forward === null) return backward;
      if (backward === null) return forward;
      return Math.abs(backward - start) < Math.abs(forward - start)
        ? backward
        : forward;
    };
    const sideways = nearest("x", (anchor.right - anchor.left) / 2);
    if (sideways !== null) return { left: sideways, top: box.top };
    const vertical = nearest("y", anchor.bottom - anchor.top);
    return vertical === null ? box : { left: box.left, top: vertical };
  }
}

function clampAxis(
  start: number,
  size: number,
  min: number,
  max: number,
): number {
  if (size >= max - min) return min;
  return Math.min(Math.max(start, min), max - size);
}

function intersects(a: PreviewRectV7, b: PreviewRectV7): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}
