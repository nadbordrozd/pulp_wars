/**
 * The Vampire and Banshee rework, interface (`pulp_wars-iqhp`,
 * RULESET_7_CURRENT.md section 17.12): the code-drawn board marks and cues.
 * There is no raster for any of them yet; each is a small vector shape in
 * the Undead violet of the Wail preview (UNDEAD.md's lightened trim), on
 * the near-black disc of the Undead badge, so they read as the faction's
 * magic and never as an owner colour. Sizes are world units (128 = one
 * cell) scaled by zoom; high contrast draws white on black.
 *
 * - The Terror glyph: a pale screaming face in a unit's status column.
 * - A Bat Escape landing: a bat in the tile's top-right corner and a faint
 *   violet tint (the dotted outline is the renderer's Move variant); the
 *   flight is an arc from the Vampire with an arrowhead and a bat.
 * - An Ethereal reach tile: the violet hatch and a ghost wisp, the way the
 *   Berserk reach is hatched in orange.
 * - The cues: the bat swirl of a Bat Escape, the Feast's blood ring and
 *   "+N", and the Terror shiver on each terrified unit.
 */

import { STATUS_GLYPH_FRAME_V7 } from "./ice-folk-canvas-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/** The Terror glyph's status slots: the Frozen and Berserk column. */
export const TERROR_GLYPH_FRAME_V7 = STATUS_GLYPH_FRAME_V7;

export const BAT_ESCAPE_PALETTE_V7 = {
  /** The Wail preview's violet: outlines, arcs and rims. */
  stroke: "#c9a6ff",
  /** The Undead badge's near-black disc. */
  disc: "#231a2c",
  /** The bat body. */
  bat: "#2b1d38",
  /** The pale bone edge of the bat and the scream. */
  edge: "#efe8cf",
  /** The faint tint of a flying-reach tile. */
  tint: "rgba(201, 166, 255, 0.14)",
  /** The hatch of a tile only Ethereal reaches. */
  hatch: "rgba(201, 166, 255, 0.4)",
  /** The Feast's blood red. */
  blood: "#d23a4e",
  bloodText: "#ffb3bf",
  bloodOutline: "#3a0d16",
} as const;

type Point = { readonly x: number; readonly y: number };

/**
 * A bat silhouette centred on (cx, cy), `width` from wing tip to wing tip:
 * a round body with two ears and two scalloped wings.
 */
function batPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  /** 0 wings level, 1 wings raised (the flap). */
  flap = 0,
): void {
  const half = width / 2;
  const lift = (0.18 - 0.42 * flap) * width;
  context.beginPath();
  // Left wing: from the body out to the tip, scalloped back underneath.
  context.moveTo(cx - width * 0.08, cy - width * 0.04);
  context.quadraticCurveTo(
    cx - half * 0.55,
    cy - lift - width * 0.12,
    cx - half,
    cy - lift,
  );
  context.quadraticCurveTo(
    cx - half * 0.82,
    cy + width * 0.02,
    cx - half * 0.66,
    cy + width * 0.1,
  );
  context.quadraticCurveTo(
    cx - half * 0.5,
    cy + width * 0.02,
    cx - half * 0.36,
    cy + width * 0.12,
  );
  context.quadraticCurveTo(
    cx - half * 0.22,
    cy + width * 0.04,
    cx - width * 0.06,
    cy + width * 0.1,
  );
  // Body and ears.
  context.lineTo(cx - width * 0.05, cy - width * 0.12);
  context.lineTo(cx - width * 0.07, cy - width * 0.22);
  context.lineTo(cx - width * 0.01, cy - width * 0.15);
  context.lineTo(cx + width * 0.01, cy - width * 0.15);
  context.lineTo(cx + width * 0.07, cy - width * 0.22);
  context.lineTo(cx + width * 0.05, cy - width * 0.12);
  context.lineTo(cx + width * 0.06, cy + width * 0.1);
  // Right wing, mirrored.
  context.quadraticCurveTo(
    cx + half * 0.22,
    cy + width * 0.04,
    cx + half * 0.36,
    cy + width * 0.12,
  );
  context.quadraticCurveTo(
    cx + half * 0.5,
    cy + width * 0.02,
    cx + half * 0.66,
    cy + width * 0.1,
  );
  context.quadraticCurveTo(
    cx + half * 0.82,
    cy + width * 0.02,
    cx + half,
    cy - lift,
  );
  context.quadraticCurveTo(
    cx + half * 0.55,
    cy - lift - width * 0.12,
    cx + width * 0.08,
    cy - width * 0.04,
  );
  context.closePath();
}

/** Fills and edges one bat. */
function drawBat(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  zoom: number,
  highContrast: boolean,
  flap = 0,
  /** On a dark token: a pale bone bat with a dark edge. */
  onToken = false,
): void {
  context.save();
  context.lineJoin = "round";
  const pale = highContrast ? "#ffffff" : BAT_ESCAPE_PALETTE_V7.edge;
  const dark = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.bat;
  context.fillStyle = onToken ? pale : dark;
  context.strokeStyle = onToken ? dark : pale;
  context.lineWidth = Math.max(1, 1.4 * zoom);
  // The wings are drawn half as deep again as the path, so a small bat
  // still reads as one.
  context.save();
  context.translate(cx, cy);
  context.scale(1, 1.5);
  batPath(context, 0, 0, width, flap);
  context.restore();
  context.fill();
  context.stroke();
  // Two red eyes (the token's dark, or white, in high contrast).
  context.fillStyle = highContrast
    ? onToken
      ? "#000000"
      : "#ffffff"
    : BAT_ESCAPE_PALETTE_V7.blood;
  const eye = Math.max(0.6, width * 0.025);
  for (const side of [-1, 1])
    context.fillRect(
      cx + side * width * 0.025 - eye / 2,
      cy - width * 0.08,
      eye,
      eye,
    );
  context.restore();
}

/**
 * A Bat Escape landing: a faint violet tint over the tile (not in high
 * contrast) and a bat on a dark disc in its top-right corner, where the
 * Berserk chevrons go.
 */
export function drawBatEscapeReachV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast = false,
): void {
  context.save();
  const half = 60 * zoom;
  if (!highContrast) {
    context.fillStyle = BAT_ESCAPE_PALETTE_V7.tint;
    context.fillRect(x - half, y - half, half * 2, half * 2);
  }
  const cx = x + 40 * zoom;
  const cy = y - 40 * zoom;
  context.fillStyle = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
  context.strokeStyle = highContrast ? "#ffffff" : BAT_ESCAPE_PALETTE_V7.stroke;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, 17 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
  drawBat(context, cx, cy + 2 * zoom, 30 * zoom, zoom, highContrast, 0, true);
}

/**
 * A wisp of a ghost: a rounded head with a wavy tail and two hollow eyes,
 * centred on (cx, cy), `size` tall.
 */
function wispPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const w = size * 0.36;
  const top = cy - size * 0.5;
  const bottom = cy + size * 0.42;
  context.beginPath();
  context.moveTo(cx - w, cy);
  context.arc(cx, top + w, w, Math.PI, 0);
  context.lineTo(cx + w, bottom - size * 0.1);
  for (let wave = 0; wave < 3; wave += 1) {
    const from = cx + w - (wave * 2 * w) / 3;
    const to = from - (2 * w) / 3;
    context.quadraticCurveTo(
      (from + to) / 2,
      wave % 2 === 0 ? bottom + size * 0.08 : bottom - size * 0.16,
      to,
      bottom - size * 0.1,
    );
  }
  context.closePath();
}

/**
 * A Move tile only Ethereal reaches (past an enemy zone of control):
 * diagonal violet hatching over the tile (not in high contrast) and a
 * ghost wisp in its top-right corner, the way the Berserk reach is marked.
 */
export function drawEtherealReachV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast = false,
): void {
  context.save();
  const half = 60 * zoom;
  if (!highContrast) {
    context.save();
    context.beginPath();
    context.rect(x - half, y - half, half * 2, half * 2);
    context.clip();
    context.strokeStyle = BAT_ESCAPE_PALETTE_V7.hatch;
    context.lineWidth = Math.max(1, 5 * zoom);
    context.beginPath();
    const step = 20 * zoom;
    // The opposite diagonal of the Berserk hatch, so the two never read as
    // one pattern where they meet.
    for (let offset = -half * 2; offset <= half * 2; offset += step) {
      context.moveTo(x - half + offset, y - half);
      context.lineTo(x + half + offset, y + half);
    }
    context.stroke();
    context.restore();
  }
  const cx = x + 40 * zoom;
  const cy = y - 40 * zoom;
  context.lineJoin = "round";
  context.fillStyle = highContrast ? "#ffffff" : BAT_ESCAPE_PALETTE_V7.edge;
  context.strokeStyle = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  wispPath(context, cx, cy, 26 * zoom);
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.ellipse(
      cx + side * 3.4 * zoom,
      cy - 5 * zoom,
      1.8 * zoom,
      2.6 * zoom,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

/** The point of the flight arc at share `t` (a raised quadratic curve). */
function arcPoint(from: Point, to: Point, apex: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * apex.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * apex.y + t * t * to.y,
  };
}

function arcApex(from: Point, to: Point, zoom: number): Point {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return {
    x: (from.x + to.x) / 2,
    // High enough that the flight's top (half way to this control point)
    // clears the heads of the units it passes over.
    y: (from.y + to.y) / 2 - distance * 0.55 - 50 * zoom,
  };
}

/**
 * A Bat Escape flight: a dashed violet arc raised over the tiles between
 * the Vampire (`from`) and its landing (`to`), with an arrowhead at the
 * landing. A prominent flight is bolder and carries a bat at its apex; a
 * faint one is thin and half transparent.
 */
export function drawBatFlightArcV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  options: {
    readonly zoom: number;
    readonly prominent: boolean;
    readonly highContrast?: boolean;
    /** The bat token at the top (default: a prominent flight has it). */
    readonly bat?: boolean;
  },
): void {
  const { zoom, prominent } = options;
  const highContrast = options.highContrast ?? false;
  const apex = arcApex(from, to, zoom);
  // The arc leaves from just above the Vampire and lands at the tile centre.
  const start = { x: from.x, y: from.y - 18 * zoom };
  const end = { x: to.x, y: to.y - 6 * zoom };
  context.save();
  context.globalAlpha = prominent ? 1 : 0.55;
  context.lineCap = "round";
  context.lineJoin = "round";
  const stroke = highContrast ? "#ffffff" : BAT_ESCAPE_PALETTE_V7.stroke;
  // A dark under-stroke keeps the arc readable on grass, sand and snow.
  for (const [colour, width] of [
    [highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc, prominent ? 7 : 4],
    [stroke, prominent ? 3.5 : 2],
  ] as const) {
    context.strokeStyle = colour;
    context.lineWidth = Math.max(1, width * zoom);
    context.setLineDash(
      colour === stroke ? [9 * zoom, 7 * zoom] : ([] as number[]),
    );
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(apex.x, apex.y, end.x, end.y);
    context.stroke();
  }
  context.setLineDash([]);
  // The arrowhead, along the curve's last tangent.
  const before = arcPoint(start, end, apex, 0.9);
  const angle = Math.atan2(end.y - before.y, end.x - before.x);
  const head = (prominent ? 14 : 9) * zoom;
  context.fillStyle = stroke;
  context.strokeStyle = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
  context.lineWidth = Math.max(1, 1.4 * zoom);
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - head * Math.cos(angle - 0.45),
    end.y - head * Math.sin(angle - 0.45),
  );
  context.lineTo(
    end.x - head * Math.cos(angle + 0.45),
    end.y - head * Math.sin(angle + 0.45),
  );
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
  if (options.bat ?? prominent) {
    // The bat rides the top of the flight on a dark violet-rimmed token, so
    // it reads over grass, sprites and plumes alike.
    const top = arcPoint(start, end, apex, 0.5);
    context.save();
    context.fillStyle = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
    context.strokeStyle = highContrast
      ? "#ffffff"
      : BAT_ESCAPE_PALETTE_V7.stroke;
    context.lineWidth = Math.max(1.2, 2 * zoom);
    context.beginPath();
    context.arc(top.x, top.y, 22 * zoom, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
    drawBat(
      context,
      top.x,
      top.y + 2 * zoom,
      38 * zoom,
      zoom,
      highContrast,
      0.6,
      true,
    );
  }
}

/**
 * The Terror glyph in a unit's status column: the near-black Undead disc
 * with a violet rim and a pale screaming face (an oval head, two dark eyes
 * and an open mouth); in high contrast, white on black.
 */
export function drawTerrorGlyphV7(
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
    ? TERROR_GLYPH_FRAME_V7.chibi
    : TERROR_GLYPH_FRAME_V7.legacy;
  const frame = frames[Math.min(options.slot, frames.length - 1)] ?? frames[0];
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  const highContrast = options.highContrast ?? false;
  context.save();
  context.fillStyle = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
  context.strokeStyle = highContrast ? "#ffffff" : BAT_ESCAPE_PALETTE_V7.stroke;
  context.lineWidth = Math.max(1.2, 1.8 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2 + 0.6 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawScreamFace(context, cx, cy, size, zoom, highContrast);
  context.restore();
}

/** A pale screaming face filling `size` around (cx, cy). */
function drawScreamFace(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  zoom: number,
  highContrast: boolean,
): void {
  const dark = highContrast ? "#000000" : BAT_ESCAPE_PALETTE_V7.disc;
  context.fillStyle = highContrast ? "#ffffff" : BAT_ESCAPE_PALETTE_V7.edge;
  context.strokeStyle = dark;
  context.lineWidth = Math.max(0.6, 0.8 * zoom);
  context.beginPath();
  context.ellipse(
    cx,
    cy + size * 0.02,
    size * 0.27,
    size * 0.36,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.stroke();
  context.fillStyle = dark;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.ellipse(
      cx + side * size * 0.1,
      cy - size * 0.1,
      size * 0.055,
      size * 0.09,
      side * 0.35,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  // The open, stretched mouth.
  context.beginPath();
  context.ellipse(
    cx,
    cy + size * 0.16,
    size * 0.07,
    size * 0.12,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
}

/**
 * The Bat Escape cue: bats swirl up round the Vampire (the first 60%),
 * then stream along the flight arc to the landing. Reduced motion holds it
 * at `progress` 0.5: the ring of bats and the arc, still.
 */
export function drawBatSwirlCueV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point | null,
  zoom: number,
  progress: number,
  fade: number,
): void {
  const bats = 5;
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, fade));
  if (to !== null)
    drawBatFlightArcV7(context, from, to, {
      zoom,
      prominent: true,
      bat: false,
    });
  for (let bat = 0; bat < bats; bat += 1) {
    const phase = bat / bats;
    // First half: a widening swirl round the Vampire; second half: along
    // the arc to the landing.
    // Reduced motion holds `progress` 0.5: the full ring of bats round
    // the Vampire, still.
    if (progress <= 0.6 || to === null) {
      const share = Math.min(1, progress / 0.6);
      const angle = (share * 1.5 + phase) * Math.PI * 2;
      const radius = (26 + 40 * share) * zoom;
      drawBat(
        context,
        from.x + Math.cos(angle) * radius,
        from.y - (16 + 22 * share) * zoom + Math.sin(angle) * radius * 0.6,
        (34 + 8 * share) * zoom,
        zoom,
        false,
        (Math.sin(angle * 3) + 1) / 2,
      );
    } else {
      const share = Math.min(1, (progress - 0.6) / 0.4 + phase * 0.25);
      const point = arcPoint(
        { x: from.x, y: from.y - 18 * zoom },
        { x: to.x, y: to.y - 6 * zoom },
        arcApex(from, to, zoom),
        share,
      );
      drawBat(
        context,
        point.x + Math.sin(phase * 7) * 8 * zoom,
        point.y + Math.cos(phase * 5) * 6 * zoom,
        38 * zoom,
        zoom,
        false,
        (Math.sin((share + phase) * 18) + 1) / 2,
      );
    }
  }
  context.restore();
}

/**
 * The Feast cue: a ring of blood drops closes on the Vampire and a red
 * "+N" (its whole heal) rises over its head, with "Feast!" under it while
 * it may attack again. Reduced motion holds it at its midpoint.
 */
export function drawFeastCueV7(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  progress: number,
  fade: number,
  amount: number | undefined,
): void {
  const drops = 8;
  const radius = (44 - 30 * progress) * zoom;
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, fade));
  context.strokeStyle = BAT_ESCAPE_PALETTE_V7.blood;
  context.lineWidth = Math.max(2, 3 * zoom);
  context.beginPath();
  context.arc(center.x, center.y - 5 * zoom, radius + 6 * zoom, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = BAT_ESCAPE_PALETTE_V7.blood;
  context.strokeStyle = BAT_ESCAPE_PALETTE_V7.bloodOutline;
  context.lineWidth = Math.max(1, 1 * zoom);
  for (let drop = 0; drop < drops; drop += 1) {
    const angle = (drop / drops) * Math.PI * 2 + progress * 1.2;
    const dx = center.x + Math.cos(angle) * radius;
    const dy = center.y - 5 * zoom + Math.sin(angle) * radius;
    const r = 7 * zoom;
    // A teardrop: its round end outward, its point at the Vampire.
    context.beginPath();
    context.arc(dx, dy, r, angle - Math.PI / 2, angle + Math.PI / 2, false);
    context.lineTo(
      dx - Math.cos(angle) * r * 2.4,
      dy - Math.sin(angle) * r * 2.4,
    );
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.restore();
  if (amount === undefined || amount <= 0) return;
  const font = Math.max(15, 24 * zoom);
  const y = center.y - (50 + 20 * progress) * zoom;
  context.save();
  context.globalAlpha = progress <= 0.5 ? 1 : Math.max(0, fade * 1.15);
  context.font = `900 ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = Math.max(3, font * 0.22);
  context.strokeStyle = BAT_ESCAPE_PALETTE_V7.bloodOutline;
  context.strokeText(`+${amount}`, center.x, y);
  context.fillStyle = BAT_ESCAPE_PALETTE_V7.bloodText;
  context.fillText(`+${amount}`, center.x, y);
  const small = Math.max(12, 14 * zoom);
  context.font = `900 ${small}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.lineWidth = Math.max(2.5, small * 0.22);
  context.strokeText("Feast!", center.x, y + font * 0.95);
  context.fillText("Feast!", center.x, y + font * 0.95);
  context.restore();
}

/**
 * The Terror cue on a terrified unit: the screaming face flickers up over
 * its head with violet shiver lines either side. Reduced motion holds it.
 */
export function drawTerrorCueV7(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  progress: number,
  fade: number,
): void {
  const size = 44 * zoom;
  const cx = center.x + Math.sin(progress * Math.PI * 10) * 2 * zoom;
  const cy = center.y - (42 + 10 * progress) * zoom;
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, fade));
  context.fillStyle = BAT_ESCAPE_PALETTE_V7.disc;
  context.strokeStyle = BAT_ESCAPE_PALETTE_V7.stroke;
  context.lineWidth = Math.max(1.2, 1.8 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawScreamFace(context, cx, cy, size, zoom, false);
  context.strokeStyle = BAT_ESCAPE_PALETTE_V7.stroke;
  context.lineWidth = Math.max(1.5, 2.5 * zoom);
  context.lineCap = "round";
  for (const side of [-1, 1])
    for (const row of [-1, 0, 1]) {
      const x0 = cx + side * (size / 2 + 5 * zoom);
      const y0 = cy + row * 7 * zoom;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x0 + side * 7 * zoom, y0 + row * 2 * zoom);
      context.stroke();
    }
  context.restore();
}
