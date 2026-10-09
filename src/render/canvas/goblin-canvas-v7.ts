/**
 * Code-native revision-17 Goblin placeholder cue (spec section 11.4): the
 * Goblin faction badge, drawn over a Goblin unit shown with Human art (the
 * LEGACY art set, or CHIBI while a Goblin raster is missing), exactly where
 * the Undead badge goes. Sizes are world units scaled by zoom.
 */

import { STATUS_GLYPH_FRAME_V7 } from "./ice-folk-canvas-v7";
import { UNDEAD_BADGE_FRAME_V7 } from "./undead-canvas-v7";

/** Legacy and CHIBI Goblin badge frames: the Undead badge's corner. */
export const GOBLIN_BADGE_FRAME_V7 = UNDEAD_BADGE_FRAME_V7;

// docs/art/factions/GOBLIN.md palette: charcoal, cream, goblin olive.
const BADGE_FILL = "#33363d";
const RIM = "#efe6c8";
const SKIN = "#9aa83e";
const SKIN_SHADE = "#6c7a2a";

/**
 * The Goblin faction cue: an olive goblin head with long sideways ears on
 * a charcoal disc with a cream rim. Olive, charcoal and cream are off every
 * owner colour, and the ears keep it apart from the Undead skull badge.
 */
export function drawGoblinBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? GOBLIN_BADGE_FRAME_V7.chibi
    : GOBLIN_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  context.save();
  context.fillStyle = BADGE_FILL;
  context.strokeStyle = RIM;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // Sideways ears, wider than the head: the faction's signature.
  context.fillStyle = SKIN_SHADE;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(cx + side * size * 0.12, cy - size * 0.1);
    context.lineTo(cx + side * size * 0.43, cy - size * 0.2);
    context.lineTo(cx + side * size * 0.12, cy + size * 0.1);
    context.closePath();
    context.fill();
  }
  context.fillStyle = SKIN;
  context.beginPath();
  context.arc(cx, cy + size * 0.02, size * 0.22, 0, Math.PI * 2);
  context.fill();
  // Eyes and a grin.
  context.fillStyle = RIM;
  for (const side of [-1, 1])
    context.fillRect(
      cx + side * size * 0.09 - size * 0.04,
      cy - size * 0.06,
      size * 0.08,
      size * 0.08,
    );
  context.fillStyle = BADGE_FILL;
  context.fillRect(
    cx - size * 0.1,
    cy + size * 0.1,
    size * 0.2,
    Math.max(0.5, size * 0.04),
  );
  context.restore();
}

// ---------------------------------------------------------------------------
// Berserk (`pulp_wars-w49.36`): the status glyph of a Berserk unit and the
// mark of a Move tile only Berserk reaches. Code-drawn (no raster yet): a
// double chevron, "farther and past", in the Goblin blast orange.
// ---------------------------------------------------------------------------

/** The Berserk glyph's status slots: the Frozen glyph's column. */
export const BERSERK_GLYPH_FRAME_V7 = STATUS_GLYPH_FRAME_V7;

/** Berserk orange on the Goblin charcoal, with a cream edge. */
export const BERSERK_PALETTE_V7 = {
  disc: BADGE_FILL,
  rim: "#f06a3a",
  chevron: "#ff9a4a",
  edge: RIM,
  /** The hatch of a tile only Berserk reaches. */
  reach: "rgba(240, 106, 58, 0.42)",
} as const;

/** Two right-pointing chevrons centred on (cx, cy), `size` wide. */
function chevronsPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const half = size / 2;
  const depth = size * 0.28;
  const thick = size * 0.2;
  context.beginPath();
  for (const offset of [-size * 0.2, size * 0.2]) {
    const tip = cx + offset + depth / 2;
    context.moveTo(tip - depth, cy - half * 0.7);
    context.lineTo(tip, cy);
    context.lineTo(tip - depth, cy + half * 0.7);
    context.lineTo(tip - depth - thick, cy + half * 0.7);
    context.lineTo(tip - thick, cy);
    context.lineTo(tip - depth - thick, cy - half * 0.7);
    context.closePath();
  }
}

/**
 * The Berserk glyph in a unit's status column (after its afflictions and
 * frost): a charcoal disc with an orange rim and two orange chevrons; in
 * high contrast, white on black.
 */
export function drawBerserkGlyphV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly chibi: boolean;
    readonly slot: number;
    readonly highContrast?: boolean;
  },
): void {
  const frames = options.chibi
    ? BERSERK_GLYPH_FRAME_V7.chibi
    : BERSERK_GLYPH_FRAME_V7.legacy;
  const frame = frames[Math.min(options.slot, frames.length - 1)] ?? frames[0];
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  const highContrast = options.highContrast ?? false;
  context.save();
  context.fillStyle = highContrast ? "#000000" : BERSERK_PALETTE_V7.disc;
  context.strokeStyle = highContrast ? "#ffffff" : BERSERK_PALETTE_V7.rim;
  context.lineWidth = Math.max(1.2, 1.8 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2 + 0.6 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.lineJoin = "round";
  context.fillStyle = highContrast ? "#ffffff" : BERSERK_PALETTE_V7.chevron;
  context.strokeStyle = highContrast ? "#000000" : BERSERK_PALETTE_V7.disc;
  context.lineWidth = Math.max(0.6, 0.8 * zoom);
  chevronsPath(context, cx, cy, size * 0.62);
  context.fill();
  context.stroke();
  context.restore();
}

/**
 * A Move tile only Berserk reaches: diagonal orange hatching over the tile
 * (an overlay, never mistaken for a terrain tint) and the double chevron in
 * its top-right corner (white in high contrast, without the hatch).
 */
export function drawBerserkReachV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast = false,
): void {
  context.save();
  const half = 60 * zoom;
  if (!highContrast) {
    context.beginPath();
    context.rect(x - half, y - half, half * 2, half * 2);
    context.clip();
    context.strokeStyle = BERSERK_PALETTE_V7.reach;
    context.lineWidth = Math.max(1, 5 * zoom);
    context.beginPath();
    const step = 20 * zoom;
    for (let offset = -half * 2; offset <= half * 2; offset += step) {
      context.moveTo(x - half + offset, y + half);
      context.lineTo(x + half + offset, y - half);
    }
    context.stroke();
  }
  const size = 22 * zoom;
  const cx = x + 40 * zoom;
  const cy = y - 40 * zoom;
  context.lineJoin = "round";
  context.fillStyle = highContrast ? "#ffffff" : BERSERK_PALETTE_V7.chevron;
  context.strokeStyle = highContrast ? "#000000" : BERSERK_PALETTE_V7.disc;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  chevronsPath(context, cx, cy, size);
  context.stroke();
  context.fill();
  context.restore();
}
