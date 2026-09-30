/**
 * Code-native revision-17 Goblin placeholder cue (spec section 11.4): the
 * Goblin faction badge, drawn over a Goblin unit shown with Human art (the
 * LEGACY art set, or CHIBI while a Goblin raster is missing), exactly where
 * the Undead badge goes. Sizes are world units scaled by zoom.
 */

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
