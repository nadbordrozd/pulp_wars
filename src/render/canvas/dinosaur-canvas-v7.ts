/**
 * Code-native revision-19 Dinosaur board cues. The faction badge (spec
 * section 12.4, bead pulp_wars-c87.7) is drawn over a Dinosaur unit shown
 * with Human art (the LEGACY art set, or CHIBI while a Dinosaur raster is
 * missing), exactly where the Undead and Goblin badges go. Bead
 * pulp_wars-c87.4 adds the LEGACY Egg, the Egg countdown chip, and the
 * growth chevrons and CHIBI growth scale (docs/art/factions/DINOSAUR.md). Sizes are world units scaled by zoom.
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

/** Effect palette of DINOSAUR.md: unowned cream, greys and charcoal. */
export const DINOSAUR_CUE_COLORS_V7 = {
  white: "#ffffff",
  cream: "#efe6c8",
  lightGrey: "#aeb6c2",
  basalt: "#5b616c",
  charcoal: "#33363d",
} as const;

/**
 * The Egg countdown chip, relative to the cell centre (world units, 128 =
 * one cell): beside the Egg's upper right in both art sets, clear of the
 * seat badge, the HP bar and the Grave corner.
 */
export const EGG_COUNTDOWN_FRAME_V7 = {
  legacy: { cx: 31, cy: -18, radius: 14 },
  chibi: { cx: 38, cy: -12, radius: 15 },
} as const;

/** Smallest countdown chip radius in CSS px (a 10 px number). */
export const EGG_COUNTDOWN_MIN_RADIUS_CSS_PX_V7 = 8;

/**
 * Growth chevrons (DINOSAUR.md "Growth display"), relative to the cell
 * centre in world units: right of the HP bar in both art sets. `width` is
 * 10 CSS px at CHIBI zoom step 1; the chevrons stack upwards from `bottom`.
 */
export const GROWTH_MARKER_FRAME_V7 = {
  legacy: { left: 28, bottom: 34, width: 12 },
  chibi: { left: -51, bottom: 42, width: 16 },
} as const;

/** Smallest chevron width in CSS px. */
export const GROWTH_MARKER_MIN_WIDTH_CSS_PX_V7 = 8;

/** CHIBI growth sprite scales (Big, Alpha) and the drawn-width cap. */
export const GROWTH_SPRITE_SCALES_V7 = [1.125, 1.25] as const;
export const GROWTH_SPRITE_MAX_WIDTH_CSS_PX_V7 = 96;

/**
 * The CHIBI sprite scale of a grown unit whose master is `masterWidth` CSS
 * px wide at zoom step 1: x1.125 for Big and x1.25 for Alpha, capped so the
 * drawn width never exceeds 96 CSS px (the city side-overflow limit).
 */
export function growthSpriteScaleV7(
  stage: 0 | 1 | 2 | undefined,
  masterWidth: number,
): number {
  if (stage !== 1 && stage !== 2) return 1;
  const wanted = GROWTH_SPRITE_SCALES_V7[stage === 1 ? 0 : 1];
  return Math.max(
    1,
    Math.min(wanted, GROWTH_SPRITE_MAX_WIDTH_CSS_PX_V7 / masterWidth),
  );
}

/**
 * One upward rank chevron for Big, two stacked for Alpha: cream with a
 * black outline, so the shape (not a colour) carries the meaning for every
 * owner colour and in high contrast.
 */
export function drawGrowthChevronsV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  stage: 1 | 2,
  options: { readonly chibi: boolean; readonly highContrast: boolean },
): void {
  const frame = options.chibi
    ? GROWTH_MARKER_FRAME_V7.chibi
    : GROWTH_MARKER_FRAME_V7.legacy;
  const width = Math.max(GROWTH_MARKER_MIN_WIDTH_CSS_PX_V7, frame.width * zoom);
  const left = x + frame.left * zoom;
  const bottom = y + frame.bottom * zoom;
  const rise = width * 0.45;
  const pitch = width * 0.5;
  const line = Math.max(1.5, width * 0.2);
  context.save();
  context.lineJoin = "miter";
  context.lineCap = "butt";
  for (const [color, lineWidth] of [
    ["#000000", line + 2],
    [options.highContrast ? "#ffffff" : DINOSAUR_CUE_COLORS_V7.cream, line],
  ] as const) {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    for (let index = 0; index < stage; index += 1) {
      const base = bottom - line - index * pitch;
      context.beginPath();
      context.moveTo(left + line / 2, base);
      context.lineTo(left + width / 2, base - rise);
      context.lineTo(left + width - line / 2, base);
      context.stroke();
    }
  }
  context.restore();
}

/**
 * The code-drawn Egg of the LEGACY art set (and of CHIBI while its raster
 * is missing): a speckled cream egg with a painted owner-colour band in a
 * small bone nest, clearly smaller than any unit.
 */
export function drawCodeEggV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly ownerColor: string | undefined;
    readonly highContrast: boolean;
    /** Sprite scale about the nest (cues); 1 by default. */
    readonly scale?: number;
  },
): void {
  const scale = options.scale ?? 1;
  const u = zoom * scale;
  const baseY = y + 30 * zoom;
  const cx = x;
  const cy = baseY - 26 * u;
  const { cream, basalt, charcoal } = DINOSAUR_CUE_COLORS_V7;
  const ink = options.highContrast ? "#000000" : "#1d1a17";
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  // Nest: a dark bowl with pale bone sticks.
  context.fillStyle = options.highContrast ? "#000000" : charcoal;
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, 2 * u);
  context.beginPath();
  context.ellipse(cx, baseY - 4 * u, 27 * u, 9 * u, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.strokeStyle = options.highContrast ? "#ffffff" : cream;
  context.lineWidth = Math.max(1, 2.4 * u);
  for (const [fromX, toX, lift] of [
    [-25, -9, 3],
    [9, 25, 3],
    [-16, 16, -3],
  ] as const) {
    context.beginPath();
    context.moveTo(cx + fromX * u, baseY - (4 - lift) * u);
    context.lineTo(cx + toX * u, baseY - (4 + lift) * u);
    context.stroke();
  }
  // Shell.
  const shell = (): void => {
    context.beginPath();
    context.ellipse(cx, cy, 18 * u, 24 * u, 0, 0, Math.PI * 2);
  };
  context.fillStyle = options.highContrast ? "#ffffff" : cream;
  shell();
  context.fill();
  // Painted owner band and speckles, clipped to the shell.
  context.save();
  shell();
  context.clip();
  context.fillStyle = options.ownerColor ?? basalt;
  context.fillRect(cx - 19 * u, cy - 1 * u, 38 * u, 10 * u);
  if (!options.highContrast) {
    context.fillStyle = basalt;
    for (const [dx, dy, r] of [
      [-7, -12, 2.2],
      [6, -15, 1.8],
      [9, -6, 1.5],
      [-3, 16, 2],
      [8, 15, 1.6],
    ] as const) {
      context.beginPath();
      context.arc(cx + dx * u, cy + dy * u, r * u, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, 2.4 * u);
  shell();
  context.stroke();
  context.restore();
}

/**
 * The Egg's countdown: the owner Start Turns still to come, as a number in
 * a charcoal chip with an owner-colour ring.
 */
export function drawEggCountdownV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  turns: number,
  options: {
    readonly chibi: boolean;
    readonly ownerColor: string | undefined;
    readonly highContrast: boolean;
  },
): void {
  const frame = options.chibi
    ? EGG_COUNTDOWN_FRAME_V7.chibi
    : EGG_COUNTDOWN_FRAME_V7.legacy;
  const radius = Math.max(
    EGG_COUNTDOWN_MIN_RADIUS_CSS_PX_V7,
    frame.radius * zoom,
  );
  const cx = x + frame.cx * zoom;
  const cy = y + frame.cy * zoom;
  context.save();
  context.fillStyle = options.highContrast
    ? "#000000"
    : DINOSAUR_CUE_COLORS_V7.charcoal;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#000000";
  context.lineWidth = Math.max(2, radius * 0.34);
  context.stroke();
  context.strokeStyle = options.highContrast
    ? "#ffffff"
    : (options.ownerColor ?? DINOSAUR_CUE_COLORS_V7.cream);
  context.lineWidth = Math.max(1.2, radius * 0.2);
  context.stroke();
  context.fillStyle = options.highContrast
    ? "#ffffff"
    : DINOSAUR_CUE_COLORS_V7.cream;
  context.font = `800 ${Math.max(10, radius * 1.25)}px system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(turns), cx, cy + radius * 0.06);
  context.restore();
}
