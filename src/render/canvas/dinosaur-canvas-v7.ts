/**
 * Code-native revision-19 Dinosaur placeholder cue (spec section 12.4, bead
 * pulp_wars-c87.7): the Dinosaur faction badge, drawn over a Dinosaur unit
 * shown with Human art (the LEGACY art set, or CHIBI while a Dinosaur raster
 * is missing), exactly where the Undead and Goblin badges go. Sizes are
 * world units scaled by zoom.
 */

import { UNDEAD_BADGE_FRAME_V7 } from "./undead-canvas-v7";

/** Legacy and CHIBI Dinosaur badge frames: the Undead badge's corner. */
export const DINOSAUR_BADGE_FRAME_V7 = UNDEAD_BADGE_FRAME_V7;

// docs/art/factions/DINOSAUR.md palette: basalt charcoal, bone cream, and the
// pale dusty blue of the hide ramp (the Brontosaurus tone, so it reads on
// charcoal).
const BADGE_FILL = "#33363d";
const RIM = "#efe6c8";
const HIDE = "#7f9cc4";

/**
 * The Dinosaur faction cue: a three-toed footprint in dusty blue on a
 * charcoal disc with a cream rim. Blue, charcoal and cream are off every
 * owner colour, and the footprint shares no shape with the Undead skull or
 * the Goblin head.
 */
export function drawDinosaurBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? DINOSAUR_BADGE_FRAME_V7.chibi
    : DINOSAUR_BADGE_FRAME_V7.legacy;
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
  context.fillStyle = HIDE;
  // Heel pad.
  context.beginPath();
  context.ellipse(
    cx,
    cy + size * 0.16,
    size * 0.16,
    size * 0.14,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  // Three pointed toes fanning upward from the pad.
  for (const [tipX, tipY, spread] of [
    [-0.25, -0.2, -0.13],
    [0, -0.34, 0],
    [0.25, -0.2, 0.13],
  ] as const) {
    context.beginPath();
    context.moveTo(cx + tipX * size, cy + tipY * size);
    context.lineTo(cx + (spread - 0.07) * size, cy + size * 0.06);
    context.lineTo(cx + (spread + 0.07) * size, cy + size * 0.06);
    context.closePath();
    context.fill();
  }
  context.restore();
}
