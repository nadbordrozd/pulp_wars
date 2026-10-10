import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
import {
  CULT_PALETTE_V7,
  type CultDrawOptionsV7,
} from "./cult-channel-canvas-v7";
import type { CultUnitMarkersV7 } from "./cult-channel-board-plan-v7";
import type { CultMarkV7 } from "./cult-ritual-board-plan-v7";

/**
 * Rituals, hexes and tricks on the board (bead `pulp_wars-mch9.19`;
 * docs/product/RULESET_7_CULTISTS.md section 14.3, docs/art/factions/CULT.md
 * "Code-drawn"), in `CULT_PALETTE_V7`:
 *
 * - **On the ground** (under trees, rocks and pieces): the chalk ring under
 *   a ritual's leader and each chanter, and the chalk sign on the marked
 *   tile (a star for Star-fall, an eye in a circle for the Great
 *   Summoning).
 * - **Over the pieces:** the countdown on the marked tile, the banner of a
 *   Cowed city, the rite's badge on its leader, the frog and its pip on a
 *   hexed unit, the "ME!" bubble of a Chosen that shouted and the red
 *   tether to each unit it binds, a Tentacle's turns and the coil round
 *   the unit it holds, and the arrows of an aimed Switcheroo.
 *
 * Everything is drawn in code, so it reads the same in every look, and
 * nothing moves: the reduced-motion still is the mark itself. Each mark has
 * a dark casing under its colour. Offsets are world units from the tile's
 * centre (a tile is 128), scaled by the zoom.
 */
export const CULT_TRICK_FRAME_V7 = {
  /** The chalk ring under a participant: its centre below the tile's. */
  ring: { y: 34, leader: 52, chanter: 40, squash: 0.36 },
  /** The chalk sign of a marked tile. */
  sign: { radius: 40 },
  /**
   * The countdown: the marked tile's upper right corner, clear of the hit
   * label of a unit that stands on it.
   */
  countdown: { x: 46, y: -46, radius: 15 },
  /** The Cowed banner: over the city. */
  banner: { y: -62, height: 22 },
  /** The rite's badge on its leader: the piece's right side. */
  rite: { x: 46, y: -8, radius: 13 },
  /** The frog: the lower left of the unit's base, its pip beside it. */
  frog: { x: -38, y: 36, size: 34 },
  /** The "ME!" bubble: over the Chosen's head, to its right. */
  bubble: { x: 26, y: -64, width: 44, height: 24 },
  /** A Tentacle's turns: the row under it. */
  sinks: { y: 55, radius: 5.2, gap: 4 },
} as const;

/** The slots of a Tentacle's turns row (`TENTACLE_LIFETIME_V7`). */
export const TENTACLE_TURN_PIPS_V7 = 3;

interface Point {
  readonly x: number;
  readonly y: number;
}

function ink(highContrast: boolean) {
  return highContrast
    ? {
        casing: "#000000",
        chalk: "#ffffff",
        green: "#ffffff",
        red: "#ffffff",
        teal: "#ffffff",
      }
    : {
        casing: CULT_PALETTE_V7.casing,
        chalk: CULT_PALETTE_V7.wax,
        green: CULT_PALETTE_V7.flame,
        red: CULT_PALETTE_V7.redLit,
        teal: CULT_PALETTE_V7.tealLit,
      };
}

/** A stroke with its dark casing under it. */
function cased(
  context: CanvasRenderingContext2D,
  path: () => void,
  colour: string,
  width: number,
  casing: string,
  dash: readonly number[] = [],
): void {
  context.setLineDash([]);
  path();
  context.strokeStyle = casing;
  context.lineWidth = width * 2.1;
  context.stroke();
  context.setLineDash([...dash]);
  path();
  context.strokeStyle = colour;
  context.lineWidth = width;
  context.stroke();
  context.setLineDash([]);
}

/** A four-pointed star path centred on (`cx`, `cy`). */
function starPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  points = 4,
  inner = 0.4,
): void {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const reach = index % 2 === 0 ? radius : radius * inner;
    const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(angle) * reach;
    const py = cy + Math.sin(angle) * reach;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/** An almond eye path centred on (`cx`, `cy`). */
function eyePath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(cx - radius, cy);
  context.quadraticCurveTo(cx, cy - radius * 0.95, cx + radius, cy);
  context.quadraticCurveTo(cx, cy + radius * 0.95, cx - radius, cy);
  context.closePath();
}

/**
 * A mark on the ground at the tile centre (`x`, `y`): the chalk ring of a
 * ritual's participant, or the chalk sign of its marked tile. The board
 * draws these before trees, rocks and pieces.
 */
export function drawCultGroundMarkV7(
  context: CanvasRenderingContext2D,
  mark: CultMarkV7,
  x: number,
  y: number,
  zoom: number,
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const palette = ink(highContrast);
  const frame = CULT_TRICK_FRAME_V7;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  if (mark.kind === "RITUAL_RING") {
    // A circle of chalk round the feet; the leader's is wider and double.
    const cy = y + frame.ring.y * zoom;
    const radii = mark.leader
      ? [frame.ring.leader, frame.ring.leader - 10]
      : [frame.ring.chanter];
    for (const radius of radii)
      cased(
        context,
        () => {
          context.beginPath();
          context.ellipse(
            x,
            cy,
            radius * zoom,
            radius * frame.ring.squash * zoom,
            0,
            0,
            Math.PI * 2,
          );
        },
        palette.chalk,
        Math.max(1.2, 2.6 * zoom),
        palette.casing,
        [9 * zoom, 4 * zoom],
      );
  } else if (mark.kind === "RITUAL_MARK") {
    const radius = frame.sign.radius * zoom;
    const width = Math.max(1.4, 3 * zoom);
    const dash = mark.preview ? [7 * zoom, 5 * zoom] : [];
    if (mark.preview) context.globalAlpha *= 0.85;
    cased(
      context,
      () => {
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
      },
      palette.chalk,
      width,
      palette.casing,
      dash,
    );
    if (mark.ritual === "STARFALL") {
      // Where the star lands: an eight-pointed star in the circle.
      cased(
        context,
        () => starPath(context, x, y, radius * 0.78, 8, 0.46),
        palette.chalk,
        width,
        palette.casing,
        dash,
      );
    } else {
      // Where the Herald stands: the lodge's eye in the circle.
      cased(
        context,
        () => eyePath(context, x, y, radius * 0.72),
        palette.green,
        width,
        palette.casing,
        dash,
      );
      cased(
        context,
        () => {
          context.beginPath();
          context.arc(x, y, radius * 0.2, 0, Math.PI * 2);
        },
        palette.green,
        width,
        palette.casing,
      );
    }
  }
  context.restore();
}

/** The whole-pixel measures of the Cowed shutters at a height. */
function cowedShutters(size: number): {
  readonly height: number;
  readonly gap: number;
  readonly leaf: number;
  readonly line: number;
  readonly slats: number;
} {
  const height = Math.max(9, Math.round(size));
  return {
    height,
    gap: Math.max(1, Math.round(height * 0.1)),
    leaf: Math.max(4, Math.round(height * 0.42)),
    line: Math.max(1, Math.round(height * 0.09)),
    // Three louvres a leaf where they keep a clear pixel between them.
    slats: height >= 11 ? 3 : 2,
  };
}

/** How wide the Cowed shutters are drawn at the height `size`. */
export function cowedShuttersWidthV7(size: number): number {
  const { gap, leaf, line } = cowedShutters(size);
  return leaf * 2 + gap + line * 2;
}

/**
 * Two closed shutters, in code: the glyph of a Cowed city, `size` high. It
 * is drawn for the banner's 13 to 20 px (bead `pulp_wars-mch9.24`: the
 * 48 px raster of the round window was a dark dot there): a dark plate, on
 * it two cream leaves that fill the height with a dark gap between them,
 * and evenly spaced louvre slits across each leaf. Every edge is on a whole
 * pixel.
 */
export function drawCowedShuttersV7(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  highContrast: boolean,
): void {
  const { height, gap, leaf, line, slats } = cowedShutters(size);
  const top = Math.round(cy - height / 2);
  const left = Math.round(cx - leaf - gap / 2);
  const dark = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  // The frame: a dark plate one line larger than the two leaves.
  context.fillStyle = dark;
  context.fillRect(
    left - line,
    top - line,
    leaf * 2 + gap + line * 2,
    height + line * 2,
  );
  for (const side of [0, 1]) {
    const x = left + side * (leaf + gap);
    context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
    context.fillRect(x, top, leaf, height);
    // The louvres: dark slits, evenly spaced down the leaf.
    context.fillStyle = dark;
    for (let slat = 1; slat <= slats; slat += 1)
      context.fillRect(
        x + line,
        top + Math.round((height * slat) / (slats + 1) - line / 2),
        leaf - line * 2,
        line,
      );
  }
}

/** Rasters of the over-piece marks, each optional (code-drawn without). */
export interface CultTrickArtV7 {
  readonly frog?: CanvasImageSource | null;
  readonly starfall?: CanvasImageSource | null;
  readonly summoning?: CanvasImageSource | null;
}

/**
 * A mark over the pieces at the tile centre (`x`, `y`): the countdown of a
 * ritual on its marked tile (a ring and the turns left), or the banner of a
 * Cowed city (closed shutters and "KNEEL!").
 */
export function drawCultOverMarkV7(
  context: CanvasRenderingContext2D,
  mark: CultMarkV7,
  x: number,
  y: number,
  zoom: number,
  options: CultDrawOptionsV7 & {
    readonly art?: CultTrickArtV7;
    readonly banner?: string;
  } = {},
): void {
  const highContrast = options.highContrast ?? false;
  const palette = ink(highContrast);
  const frame = CULT_TRICK_FRAME_V7;
  context.save();
  context.setLineDash([]);
  context.lineCap = "round";
  if (mark.kind === "COUNTDOWN") {
    const cx = x + frame.countdown.x * zoom;
    const cy = y + frame.countdown.y * zoom;
    const radius = Math.max(8, frame.countdown.radius * zoom);
    context.fillStyle = palette.casing;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    // The ring of the turn left: closed but for a notch at the top.
    context.strokeStyle =
      mark.ritual === "STARFALL" ? palette.chalk : palette.green;
    context.lineWidth = Math.max(1.4, 2.6 * zoom);
    context.beginPath();
    context.arc(cx, cy, radius * 0.78, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.5);
    context.stroke();
    context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
    context.font = `800 ${Math.max(9, radius * 1.05)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(mark.turns), cx, cy + radius * 0.06);
  } else if (mark.kind === "COWED") {
    const text = options.banner ?? "KNEEL!";
    const height = Math.max(13, frame.banner.height * zoom);
    const font = Math.max(9, height * 0.62);
    context.font = `800 ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    // The shutters: two leaves, a little wider than they are high.
    const glyph = height * 0.62;
    const shutters = cowedShuttersWidthV7(glyph);
    const pad = height * 0.36;
    const width = pad * 2.6 + shutters + context.measureText(text).width;
    const left = x - width / 2;
    const top = y + frame.banner.y * zoom - height / 2;
    context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.indigo;
    context.strokeStyle = palette.casing;
    context.lineWidth = Math.max(1.2, 2.2 * zoom);
    context.beginPath();
    context.roundRect(left, top, width, height, height * 0.22);
    context.fill();
    context.stroke();
    const gx = left + pad + shutters / 2;
    const gy = top + height / 2;
    // Always the code-drawn leaves: the raster does not read this small.
    drawCowedShuttersV7(context, gx, gy, glyph, highContrast);
    context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(text, left + pad * 1.6 + shutters, gy + height * 0.04);
  }
  context.restore();
}

/**
 * A small frog in code, in the summoned palette of its raster (teal, never
 * a green frog lost on Grass): its body, two eye bumps and a wide mouth.
 */
function drawCodeFrog(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  highContrast: boolean,
): void {
  const u = size / 34;
  const body = highContrast ? "#ffffff" : CULT_PALETTE_V7.tealLit;
  const outline = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.lineJoin = "round";
  context.lineWidth = Math.max(1, 1.6 * u);
  context.strokeStyle = outline;
  // The hind legs, the body, then the eye bumps.
  context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.teal;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.ellipse(cx + side * 10 * u, cy + 6 * u, 6 * u, 4 * u, 0, 0, 7);
    context.fill();
    context.stroke();
  }
  context.fillStyle = body;
  context.beginPath();
  context.ellipse(cx, cy + 1 * u, 11 * u, 8.5 * u, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  for (const side of [-1, 1]) {
    context.fillStyle = body;
    context.beginPath();
    context.arc(cx + side * 5.5 * u, cy - 7 * u, 4.2 * u, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = highContrast ? "#000000" : "#ffd84a";
    context.beginPath();
    context.arc(cx + side * 5.5 * u, cy - 7.2 * u, 2.3 * u, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#000000";
    context.beginPath();
    context.arc(cx + side * 5.5 * u, cy - 7.2 * u, 1 * u, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.moveTo(cx - 6 * u, cy + 2 * u);
  context.quadraticCurveTo(cx, cy + 6 * u, cx + 6 * u, cy + 2 * u);
  context.stroke();
}

/** The dark disc under a badge, rimmed in `rim`. */
function badgeDisc(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  zoom: number,
  rim: string,
  highContrast: boolean,
): void {
  context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.strokeStyle = highContrast ? "#ffffff" : rim;
  context.lineWidth = Math.max(1, 1.8 * zoom);
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

/**
 * The trick marks of one unit at its tile centre (`x`, `y`): the rite's
 * badge of a ritual's leader, the frog and its pip, the "ME!" bubble, and a
 * Tentacle's turns. (The candle, the pips and the Unbound marks are the
 * channel's, `drawCultUnitMarkersV7`.)
 */
export function drawCultTrickUnitMarkersV7(
  context: CanvasRenderingContext2D,
  markers: CultUnitMarkersV7,
  x: number,
  y: number,
  zoom: number,
  options: CultDrawOptionsV7 & {
    readonly art?: CultTrickArtV7;
    readonly bubble?: string;
  } = {},
): void {
  const highContrast = options.highContrast ?? false;
  const palette = ink(highContrast);
  const frame = CULT_TRICK_FRAME_V7;
  context.save();
  context.setLineDash([]);
  if (markers.ritual !== undefined) {
    const cx = x + frame.rite.x * zoom;
    const cy = y + frame.rite.y * zoom;
    const radius = Math.max(7, frame.rite.radius * zoom);
    const star = markers.ritual === "STARFALL";
    badgeDisc(
      context,
      cx,
      cy,
      radius,
      zoom,
      star ? CULT_PALETTE_V7.wax : CULT_PALETTE_V7.flame,
      highContrast,
    );
    const image =
      (star ? options.art?.starfall : options.art?.summoning) ?? null;
    if (image !== null)
      context.drawImage(
        image,
        cx - radius * 0.85,
        cy - radius * 0.85,
        radius * 1.7,
        radius * 1.7,
      );
    else if (star) {
      context.fillStyle = palette.chalk;
      starPath(context, cx, cy, radius * 0.72, 4, 0.36);
      context.fill();
    } else {
      context.fillStyle = palette.green;
      eyePath(context, cx, cy, radius * 0.74);
      context.fill();
      context.fillStyle = "#000000";
      context.beginPath();
      context.arc(cx, cy, radius * 0.24, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (markers.frog === true) {
    const cx = x + frame.frog.x * zoom;
    const cy = y + frame.frog.y * zoom;
    const size = Math.max(16, frame.frog.size * zoom);
    const image = options.art?.frog ?? null;
    // A dark halo, so the frog reads on Grass.
    context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
    context.globalAlpha *= 0.7;
    context.beginPath();
    context.arc(cx, cy, size * 0.56, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha /= 0.7;
    if (image !== null)
      context.drawImage(image, cx - size / 2, cy - size / 2, size, size);
    else drawCodeFrog(context, cx, cy, size * 0.82, highContrast);
    // The pip of the turn it has left.
    const pip = Math.max(2.4, 4.4 * zoom);
    context.fillStyle = palette.chalk;
    context.strokeStyle = palette.casing;
    context.lineWidth = Math.max(1, 1.6 * zoom);
    context.beginPath();
    context.arc(cx + size * 0.62, cy + size * 0.3, pip, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  if (markers.taunt === true) {
    const text = options.bubble ?? "ME!";
    const height = Math.max(14, frame.bubble.height * zoom);
    const font = Math.max(9, height * 0.6);
    context.font = `800 ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    const width = Math.max(
      frame.bubble.width * zoom,
      context.measureText(text).width + height * 0.7,
    );
    const cx = x + frame.bubble.x * zoom;
    const cy = y + frame.bubble.y * zoom;
    const left = cx - width / 2;
    const top = cy - height / 2;
    context.lineJoin = "round";
    context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
    context.strokeStyle = palette.casing;
    // The fill covers the inner half of this outline.
    context.lineWidth = Math.max(2.4, 4 * zoom);
    // The bubble, with its tail down to the Chosen's head.
    context.beginPath();
    context.roundRect(left, top, width, height, height * 0.42);
    context.moveTo(left + width * 0.22, top + height - 1);
    context.lineTo(left + width * 0.08, top + height + height * 0.42);
    context.lineTo(left + width * 0.44, top + height - 1);
    context.stroke();
    context.fill();
    context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.red;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, cx, cy + height * 0.05);
  }
  if (markers.sinks !== undefined) {
    // One slot per neutral turn of its life: lit for the turns it has left.
    const radius = Math.max(2.6, frame.sinks.radius * zoom);
    const gap = frame.sinks.gap * zoom;
    const slots = TENTACLE_TURN_PIPS_V7;
    const width = slots * radius * 2 + (slots - 1) * gap;
    const cy = y + frame.sinks.y * zoom;
    const left = x - width / 2;
    const pad = Math.max(2, 3 * zoom);
    const height = radius * 2 + pad * 2;
    context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
    context.globalAlpha *= 0.86;
    context.beginPath();
    context.roundRect(
      left - pad * 1.6,
      cy - height / 2,
      width + pad * 3.2,
      height,
      height / 2,
    );
    context.fill();
    context.globalAlpha /= 0.86;
    for (let index = 0; index < slots; index += 1) {
      const px = left + radius + index * (radius * 2 + gap);
      context.beginPath();
      context.arc(px, cy, radius - Math.max(0.6, zoom), 0, Math.PI * 2);
      if (index < markers.sinks) {
        context.fillStyle = palette.teal;
        context.fill();
        context.strokeStyle = palette.chalk;
        context.lineWidth = Math.max(0.8, 1.2 * zoom);
        context.stroke();
      } else {
        context.strokeStyle = highContrast ? "#ffffff" : "#aab3c0";
        context.lineWidth = Math.max(1, 1.5 * zoom);
        context.stroke();
      }
    }
  }
  context.restore();
}

/**
 * A Tentacle's Grab: a teal arm from the Tentacle (`from`) that coils once
 * round the unit it holds (`to`), with cream suckers.
 */
export function drawCultGrabV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  zoom: number,
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const a = { x: from.x, y: from.y + 6 * zoom };
  const b = { x: to.x, y: to.y + 14 * zoom };
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 26 * zoom };
  const path = (): void => {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.quadraticCurveTo(c.x, c.y, b.x, b.y);
    context.ellipse(
      b.x,
      b.y,
      30 * zoom,
      11 * zoom,
      0,
      Math.PI / 2,
      Math.PI * 2.6,
    );
  };
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  path();
  context.strokeStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.lineWidth = Math.max(4.5, 12 * zoom);
  context.stroke();
  path();
  context.strokeStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.teal;
  context.lineWidth = Math.max(2.8, 8 * zoom);
  context.stroke();
  if (!highContrast) {
    // The lit edge (the light is from the lower left) and the suckers.
    path();
    context.strokeStyle = CULT_PALETTE_V7.tealLit;
    context.lineWidth = Math.max(1, 2.6 * zoom);
    context.stroke();
    context.fillStyle = CULT_PALETTE_V7.wax;
    for (const t of [0.3, 0.55, 0.8]) {
      const u = 1 - t;
      context.beginPath();
      context.arc(
        u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        u * u * a.y + 2 * u * t * c.y + t * t * b.y,
        Math.max(1, 2 * zoom),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  context.restore();
}

/**
 * Pick Me!: a red tether from a bound unit (`from`) to the Chosen it may
 * only attack (`to`). The tether of an offered shout is thinner and paler.
 */
export function drawCultTauntTetherV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  zoom: number,
  preview: boolean,
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return;
  const ux = dx / length;
  const uy = dy / length;
  const a = { x: from.x + ux * 28 * zoom, y: from.y + uy * 28 * zoom };
  const b = { x: to.x - ux * 30 * zoom, y: to.y - uy * 30 * zoom };
  const path = (): void => {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
  };
  context.save();
  context.lineCap = "round";
  if (preview) context.globalAlpha *= 0.8;
  cased(
    context,
    path,
    highContrast ? "#ffffff" : CULT_PALETTE_V7.redLit,
    Math.max(1.4, (preview ? 2.4 : 3.4) * zoom),
    highContrast ? "#000000" : CULT_PALETTE_V7.casing,
    [7 * zoom, 5 * zoom],
  );
  // The hook on the bound unit: a red bead with its casing.
  context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.red;
  context.strokeStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(a.x, a.y, Math.max(2.4, 4.6 * zoom), 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

/**
 * An aimed Switcheroo: two bowed arrows between the tiles that swap, one
 * each way.
 */
export function drawCultSwapArrowsV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  zoom: number,
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.max(6, 12 * zoom);
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const side of [-1, 1]) {
    // Each arrow bows to its own side and points the way its unit goes.
    const start = side === 1 ? from : to;
    const end = side === 1 ? to : from;
    const sx = side * ux;
    const sy = side * uy;
    const a = { x: start.x + sx * 30 * zoom, y: start.y + sy * 30 * zoom };
    const b = { x: end.x - sx * 30 * zoom, y: end.y - sy * 30 * zoom };
    const bow = Math.min(34 * zoom, length * 0.22);
    const c = {
      x: (a.x + b.x) / 2 - sy * bow,
      y: (a.y + b.y) / 2 + sx * bow,
    };
    const tx = b.x - c.x;
    const ty = b.y - c.y;
    const tangent = Math.hypot(tx, ty) || 1;
    const hx = tx / tangent;
    const hy = ty / tangent;
    cased(
      context,
      () => {
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.quadraticCurveTo(c.x, c.y, b.x, b.y);
        context.moveTo(
          b.x - hx * head - hy * head * 0.7,
          b.y - hy * head + hx * head * 0.7,
        );
        context.lineTo(b.x, b.y);
        context.lineTo(
          b.x - hx * head + hy * head * 0.7,
          b.y - hy * head - hx * head * 0.7,
        );
      },
      highContrast ? "#ffffff" : CULT_PALETTE_V7.glow,
      Math.max(1.8, 4 * zoom),
      highContrast ? "#000000" : CULT_PALETTE_V7.casing,
    );
  }
  context.restore();
}
