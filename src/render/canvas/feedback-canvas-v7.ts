import type { UnitTurnStateV7 } from "./unit-turn-state-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/**
 * Bead pulp_wars-2yc.29: the code-drawn parts of the feedback animations
 * (the ready ring and chevron, the Promotion marker, a population icon,
 * the rings and sparkles).
 * Every function draws one still frame from the numbers it is given.
 */
const INK = "#171722";
const CREAM = "#fff6cf";
const GOLD = "#ffc83d";
const GOLD_DEEP = "#c8861b";

/** The Promotion marker of one unit for a frame. */
export interface PromotionMarkerFrameV7 {
  /** The viewer's own unit: the gold rim and the bob. */
  readonly own: boolean;
  /** 0 to 1 (with a small overshoot) while the marker grows in. */
  readonly scale: number;
  /** The bob in nominal CSS px (negative is up); 0 when still. */
  readonly bobCssPx: number;
}

/**
 * What the feedback animations ask of the board for one frame. The
 * renderer reads it per piece; without it the board is drawn exactly as
 * before the bead.
 */
export interface BoardFeedbackFrameV7 {
  /** A city sprite's hop in nominal CSS px (negative is up), or 0. */
  cityHopCssPx(cityId: number): number;
  /** A unit sprite's hop in nominal CSS px (negative is up), or 0. */
  unitHopCssPx(unitId: number): number;
  /** The level and meter a city shows while its population is on its way. */
  cityMeter(
    cityId: number,
  ): { readonly level: number; readonly population: number } | null;
  /** The unit's state in the viewer's turn, or null for a plain unit. */
  turnState(unitId: number): UnitTurnStateV7 | null;
  promotionMarker(unitId: number): PromotionMarkerFrameV7 | null;
  /** The shared slow loop, 0 to 1 and back; 0 in reduced motion. */
  readonly pulse: number;
  /** The ready chevron's bounce in nominal CSS px (negative is up). */
  readonly chevronBounceCssPx: number;
}

export interface FeedbackEllipseV7 {
  readonly centreX: number;
  readonly centreY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/** What the board draws for one unit's turn state this frame. */
export interface ReadyCueFrameV7 {
  readonly state: UnitTurnStateV7;
  /** 0 to 1 and back on the shared slow loop; 0 in reduced motion. */
  readonly pulse: number;
  /** The viewer's colour: the glow under the ring. */
  readonly ownerColour: string | undefined;
  readonly highContrast: boolean;
}

/**
 * The ground cue of a unit that can still act. `ACTIVE` is the thin cream
 * ring on its soft dark casing (the look of the ready ring before this
 * bead). `FRESH` is the same ellipse made unmissable: a soft pool of the
 * viewer's colour inside it, a thick cream band on a dark casing with a
 * thin line of the viewer's colour outside, and a ripple that leaves the
 * ring and fades once per loop. It is still an ellipse at the feet, never a
 * tile outline, so it cannot be read as a Move, Attack, Help or Place mark.
 * Reduced motion draws the same ring without the ripple.
 */
export function drawReadyGroundCueV7(
  context: CanvasRenderingContext2D,
  ground: FeedbackEllipseV7,
  zoom: number,
  cue: ReadyCueFrameV7,
): void {
  if (cue.state === "SPENT") return;
  const ellipse = (grow: number): void => {
    context.beginPath();
    context.ellipse(
      ground.centreX,
      ground.centreY,
      Math.max(0.5, ground.radiusX + grow),
      Math.max(0.5, ground.radiusY + grow * 0.5),
      0,
      0,
      Math.PI * 2,
    );
  };
  const cream = cue.highContrast ? "#ffffff" : CREAM;
  context.save();
  const alpha = context.globalAlpha;
  if (cue.state === "ACTIVE") {
    ellipse(0);
    context.globalAlpha = alpha * 0.55;
    context.strokeStyle = INK;
    context.lineWidth = 4.5 * zoom;
    context.stroke();
    context.globalAlpha = alpha;
    context.strokeStyle = cream;
    context.lineWidth = 2.25 * zoom;
    context.stroke();
    context.restore();
    return;
  }
  const colour = cue.highContrast ? "#ffffff" : (cue.ownerColour ?? GOLD);
  // The pool of the viewer's colour inside the ring.
  ellipse(0);
  context.globalAlpha = alpha * (0.22 + 0.16 * cue.pulse);
  context.fillStyle = colour;
  context.fill();
  // The ripple: it leaves the ring and fades as the loop goes on.
  if (cue.pulse > 0) {
    ellipse(3 * zoom + 14 * zoom * cue.pulse);
    context.globalAlpha = alpha * 0.75 * (1 - cue.pulse);
    context.strokeStyle = cream;
    context.lineWidth = Math.max(1.5, 3 * zoom);
    context.stroke();
  }
  ellipse(0);
  context.globalAlpha = alpha * 0.8;
  context.strokeStyle = INK;
  context.lineWidth = Math.max(4.5, 10 * zoom);
  context.stroke();
  context.globalAlpha = alpha;
  context.strokeStyle = colour;
  context.lineWidth = Math.max(3.5, 7.5 * zoom);
  context.stroke();
  context.strokeStyle = cream;
  context.lineWidth = Math.max(2, 4.5 * zoom);
  context.stroke();
  context.restore();
}

/**
 * The chevron over a unit that can still move: a small cream arrowhead
 * pointing down at it, on a dark casing, `tipY` being the lowest point (a
 * gap above the head). Its bounce is the caller's.
 */
export function drawReadyChevronV7(
  context: CanvasRenderingContext2D,
  x: number,
  tipY: number,
  zoom: number,
  options: {
    readonly ownerColour?: string | undefined;
    readonly highContrast?: boolean;
  } = {},
): void {
  const half = Math.max(6, 15 * zoom);
  const height = Math.max(5.5, 13 * zoom);
  const notch = height * 0.42;
  const path = (): void => {
    context.beginPath();
    context.moveTo(x, tipY);
    context.lineTo(x + half, tipY - height);
    context.lineTo(x + half * 0.42, tipY - height - notch * 0.2);
    context.lineTo(x, tipY - height + notch);
    context.lineTo(x - half * 0.42, tipY - height - notch * 0.2);
    context.lineTo(x - half, tipY - height);
    context.closePath();
  };
  context.save();
  context.lineJoin = "round";
  path();
  context.strokeStyle = INK;
  context.lineWidth = Math.max(3.5, 7 * zoom);
  context.stroke();
  context.fillStyle =
    options.highContrast === true ? "#ffffff" : (options.ownerColour ?? CREAM);
  context.fill();
  context.restore();
}

/**
 * The marker's side in CSS px at this zoom: 38 nominal px for the viewer's
 * unit (a little under a third of its tile), 32 for another player's, and
 * never under 20 and 17.
 */
export function promotionMarkerSizeCssPxV7(zoom: number, own: boolean): number {
  return own ? Math.max(20, 38 * zoom) : Math.max(17, 32 * zoom);
}

/**
 * The marker over a unit that waits for its Promotion: the Promote button's
 * own icon (a military medal), centred on (`x`, `y`) in a square of `size`.
 * The icon has its own dark outline; a soft dark halo keeps it apart from
 * grass, snow, forest and ash alike, so it stands on no disc. Without the
 * icon's raster a gold star on a small dark disc stands in.
 */
export function drawPromotionMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  options: {
    readonly icon: CanvasImageSource | null;
    readonly own: boolean;
    readonly highContrast?: boolean;
    readonly alpha?: number;
  },
): void {
  if (!(size > 0)) return;
  context.save();
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  if (options.icon !== null) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.shadowColor = options.highContrast === true ? "#000000" : INK;
    context.shadowBlur = Math.max(2, size * 0.14);
    // Twice: the halo of one pass is too faint on pale ground.
    for (let pass = 0; pass < 2; pass += 1)
      context.drawImage(options.icon, x - size / 2, y - size / 2, size, size);
  } else {
    const radius = size * 0.36;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = "#1c2030";
    context.fill();
    context.strokeStyle = INK;
    context.lineWidth = Math.max(2, size * 0.1);
    context.stroke();
    drawStarV7(
      context,
      x,
      y,
      radius * 0.72,
      options.highContrast === true ? "#ffffff" : GOLD,
    );
  }
  context.restore();
}

function drawStarV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colour: string,
): void {
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const reach = point % 2 === 0 ? radius : radius * 0.45;
    const px = x + Math.cos(angle) * reach;
    const py = y + Math.sin(angle) * reach;
    if (point === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fillStyle = colour;
  context.fill();
}

/**
 * A ring opening from (`x`, `y`) and sparkles flying out of it: an earned
 * Promotion (`progress` 0 to 1). The ring thins and fades as it grows.
 */
export function drawSparkleBurstV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
  options: { readonly sparkles?: number; readonly colour?: string } = {},
): void {
  const t = Math.min(1, Math.max(0, progress));
  if (t <= 0 || t >= 1) return;
  const colour = options.colour ?? GOLD;
  const eased = 1 - (1 - t) * (1 - t);
  context.save();
  const alpha = context.globalAlpha;
  context.globalAlpha = alpha * (1 - t);
  context.beginPath();
  context.arc(x, y, radius * (0.35 + 0.75 * eased), 0, Math.PI * 2);
  context.strokeStyle = INK;
  context.lineWidth = Math.max(2, radius * 0.16 * (1 - t) + 2);
  context.stroke();
  context.strokeStyle = colour;
  context.lineWidth = Math.max(1, radius * 0.16 * (1 - t));
  context.stroke();
  const count = options.sparkles ?? 6;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count + 0.3;
    const reach = radius * (0.5 + 0.85 * eased);
    const size = radius * 0.2 * (1 - t * 0.6);
    const sx = x + Math.cos(angle) * reach;
    const sy = y + Math.sin(angle) * reach * 0.85 - radius * 0.25 * eased;
    context.globalAlpha = alpha * Math.min(1, (1 - t) * 1.6);
    // A four-pointed sparkle.
    context.beginPath();
    context.moveTo(sx, sy - size);
    context.quadraticCurveTo(sx, sy, sx + size, sy);
    context.quadraticCurveTo(sx, sy, sx, sy + size);
    context.quadraticCurveTo(sx, sy, sx - size, sy);
    context.quadraticCurveTo(sx, sy, sx, sy - size);
    context.closePath();
    context.fillStyle = CREAM;
    context.strokeStyle = GOLD_DEEP;
    context.lineWidth = Math.max(0.75, size * 0.18);
    context.fill();
    context.stroke();
  }
  context.restore();
}

/** A flat ring on the ground that widens and fades: a city's level-up. */
export function drawGroundRingV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
  colour: string = GOLD,
): void {
  const t = Math.min(1, Math.max(0, progress));
  if (t <= 0 || t >= 1) return;
  const eased = 1 - (1 - t) * (1 - t);
  context.save();
  context.globalAlpha *= 1 - t;
  context.beginPath();
  context.ellipse(
    x,
    y,
    radius * (0.4 + 0.9 * eased),
    radius * (0.4 + 0.9 * eased) * 0.5,
    0,
    0,
    Math.PI * 2,
  );
  context.strokeStyle = INK;
  context.lineWidth = Math.max(3, radius * 0.14);
  context.stroke();
  context.strokeStyle = colour;
  context.lineWidth = Math.max(1.5, radius * 0.09);
  context.stroke();
  context.restore();
}

/**
 * One population icon centred on (`x`, `y`): the game's population icon,
 * or a filled meter pip while it loads. An icon that carries several
 * points shows their number.
 */
export function drawPopulationIconV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  options: {
    readonly icon: CanvasImageSource | null;
    readonly value: number;
    readonly smoothing?: boolean;
  },
): void {
  if (!(size > 0)) return;
  context.save();
  if (options.icon !== null) {
    context.imageSmoothingEnabled = options.smoothing ?? true;
    context.drawImage(options.icon, x - size / 2, y - size / 2, size, size);
  } else {
    context.fillStyle = "#5fc2e8";
    context.strokeStyle = INK;
    context.lineWidth = Math.max(1, size * 0.1);
    context.fillRect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6);
    context.strokeRect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6);
  }
  if (options.value > 1) {
    const label = String(options.value);
    context.font = `800 ${Math.max(9, size * 0.55)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.strokeStyle = INK;
    context.lineWidth = Math.max(2.5, size * 0.16);
    context.strokeText(label, x + size * 0.42, y + size * 0.3);
    context.fillStyle = CREAM;
    context.fillText(label, x + size * 0.42, y + size * 0.3);
  }
  context.restore();
}
