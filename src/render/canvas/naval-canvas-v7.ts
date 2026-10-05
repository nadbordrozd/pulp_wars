import type { NavalUnitMarkersV7 } from "./naval-board-plan-v7";

/**
 * The naval markers of a ship on the board (bead pulp_wars-5ti.7, first
 * part; docs/product/RULESET_7_NAVAL_BRANCH.md section 14.1), code-drawn so
 * they read the same in the live look, the Classic look and LEGACY:
 *
 * - **Submerged:** two wave lines washing over the hull (the boat sits low
 *   in the water, above its HP bar) and a periscope badge in the piece's
 *   upper right corner. In the live look the Submarine is drawn with its
 *   low-riding raster (bead pulp_wars-5ti.6: the hull sunk, foam at the
 *   waterline), so the board passes `wash: false` there and only the badge
 *   is drawn; the Classic look and LEGACY keep the wash.
 * - **Boardable:** a grappling-hook badge under it, on a ship of any owner
 *   at or below its boarding line.
 *
 * The marks never move, so the reduced-motion still is the mark itself.
 * All offsets are in world units from the tile's centre (a tile is 128).
 */
export const NAVAL_MARKER_FRAME_V7 = {
  /** Badge centres and radius. */
  submerged: { x: 46, y: -48, radius: 12 },
  boardable: { x: 46, y: -20, radius: 12 },
  /** The wash over the hull: two wave lines of this half-width. */
  wash: { halfWidth: 36, top: 2, gap: 10, amplitude: 3, period: 18 },
} as const;

export const NAVAL_MARKER_COLOURS_V7 = {
  token: "#10243a",
  rim: "#9fd8f2",
  wave: "#d6f1fb",
  waveCasing: "#17456a",
  hook: "#ffd98a",
} as const;

function badge(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  zoom: number,
  highContrast: boolean,
): void {
  context.fillStyle = highContrast ? "#000000" : NAVAL_MARKER_COLOURS_V7.token;
  context.strokeStyle = highContrast ? "#ffffff" : NAVAL_MARKER_COLOURS_V7.rim;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function wavePath(
  context: CanvasRenderingContext2D,
  left: number,
  right: number,
  y: number,
  amplitude: number,
  period: number,
): void {
  context.beginPath();
  context.moveTo(left, y);
  let up = true;
  for (let x = left; x < right; x += period / 2) {
    const next = Math.min(right, x + period / 2);
    context.quadraticCurveTo(
      (x + next) / 2,
      y + (up ? -amplitude : amplitude) * 2,
      next,
      y,
    );
    up = !up;
  }
}

/** Draws the naval markers of one unit at its tile centre (`x`, `y`). */
export function drawNavalUnitMarkersV7(
  context: CanvasRenderingContext2D,
  markers: NavalUnitMarkersV7,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly highContrast?: boolean;
    /** False when the sprite itself shows the waterline. Default true. */
    readonly wash?: boolean;
  } = {},
): void {
  const highContrast = options.highContrast ?? false;
  const washed = options.wash ?? true;
  const frame = NAVAL_MARKER_FRAME_V7;
  context.save();
  context.setLineDash([]);
  context.lineCap = "round";
  context.lineJoin = "round";
  if (markers.submerged) {
    // The wash over the hull's foot.
    const wash = frame.wash;
    for (const row of washed ? [0, 1] : []) {
      const waveY = y + (wash.top + row * wash.gap) * zoom;
      const inset = row * 8 * zoom;
      for (const [colour, width] of [
        [
          highContrast ? "#000000" : NAVAL_MARKER_COLOURS_V7.waveCasing,
          5 * zoom,
        ],
        [highContrast ? "#ffffff" : NAVAL_MARKER_COLOURS_V7.wave, 2.2 * zoom],
      ] as const) {
        context.strokeStyle = colour;
        context.lineWidth = Math.max(1, width);
        wavePath(
          context,
          x - wash.halfWidth * zoom + inset,
          x + wash.halfWidth * zoom - inset,
          waveY,
          wash.amplitude * zoom,
          wash.period * zoom,
        );
        context.stroke();
      }
    }
    // The periscope badge.
    const cx = x + frame.submerged.x * zoom;
    const cy = y + frame.submerged.y * zoom;
    const radius = frame.submerged.radius * zoom;
    badge(context, cx, cy, radius, zoom, highContrast);
    context.strokeStyle = highContrast
      ? "#ffffff"
      : NAVAL_MARKER_COLOURS_V7.wave;
    context.lineWidth = Math.max(1, 2.2 * zoom);
    context.beginPath();
    context.moveTo(cx - radius * 0.1, cy + radius * 0.25);
    context.lineTo(cx - radius * 0.1, cy - radius * 0.5);
    context.lineTo(cx + radius * 0.4, cy - radius * 0.5);
    context.stroke();
    wavePath(
      context,
      cx - radius * 0.62,
      cx + radius * 0.62,
      cy + radius * 0.42,
      radius * 0.14,
      radius * 0.62,
    );
    context.stroke();
  }
  if (markers.boardable) {
    // The grappling hook: a shank, a curved claw and its barb.
    const cx = x + frame.boardable.x * zoom;
    const cy = y + frame.boardable.y * zoom;
    const radius = frame.boardable.radius * zoom;
    badge(context, cx, cy, radius, zoom, highContrast);
    context.strokeStyle = highContrast
      ? "#ffffff"
      : NAVAL_MARKER_COLOURS_V7.hook;
    context.lineWidth = Math.max(1, 2.4 * zoom);
    context.beginPath();
    context.moveTo(cx + radius * 0.22, cy - radius * 0.58);
    context.lineTo(cx + radius * 0.22, cy + radius * 0.12);
    context.arc(
      cx - radius * 0.1,
      cy + radius * 0.12,
      radius * 0.32,
      0,
      Math.PI,
    );
    context.lineTo(cx - radius * 0.42, cy - radius * 0.12);
    context.stroke();
    // The ring the line is tied to.
    context.beginPath();
    context.arc(
      cx + radius * 0.22,
      cy - radius * 0.62,
      radius * 0.12,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.restore();
}
