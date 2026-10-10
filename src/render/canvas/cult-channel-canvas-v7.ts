import type {
  CultLinkV7,
  CultUnitMarkersV7,
} from "./cult-channel-board-plan-v7";

/**
 * The Cult's channel on the board (bead `pulp_wars-mch9.18`;
 * docs/product/RULESET_7_CULTISTS.md section 14.3, docs/art/factions/CULT.md
 * "Code-drawn"): the strand from a channeller to its daemon, the Anchor
 * tentacle, a Boo!'s jump arrows, and the marks of a unit: the candle of a
 * Candlelit cultist, the Control pips under a daemon with the cracked
 * collar of one that is short, the broken collar of an Unbound daemon, the
 * steam of a Furious one, and the eye on the unit a loose daemon goes for.
 *
 * Everything is drawn in code so it reads the same in the live look, the
 * Classic look and LEGACY, and nothing moves: the reduced-motion still is
 * the mark itself. Each mark has a dark casing under its colour, so the
 * green of a strand reads on Grass and the cream of a candle on Snow.
 * Offsets are world units from the tile's centre (a tile is 128), scaled by
 * the zoom.
 */
export const CULT_PALETTE_V7 = {
  flame: "#00ff78",
  glow: "#80ffbc",
  dark: "#007336",
  indigo: "#372f8f",
  wax: "#f3e7c4",
  brass: "#c9a24a",
  teal: "#1f8f95",
  tealLit: "#2aa6a6",
  /** The red of a slack strand, a missing pip and an Unbound daemon's eyes. */
  red: "#e0281e",
  redLit: "#ff655f",
  /** The casing under every mark (the target highlights' own). */
  casing: "#10131c",
} as const;

/** Where each unit mark sits, from the tile's centre. */
export const CULT_MARKER_FRAME_V7 = {
  candle: { x: -42, y: -42, size: 32 },
  /** The pips' row: its centre, a pip's radius and the gap between pips. */
  pips: { x: 0, y: 55, radius: 6.5, gap: 4, extraRadius: 4.2 },
  /** Unbound, and the eye on a target: the piece's upper right corner. */
  badge: { x: 44, y: -46, radius: 13 },
  steam: { y: -60, spread: 18 },
} as const;

/** The most extra strands (past the Control) drawn as small pips. */
export const CULT_EXTRA_PIPS_V7 = 4;

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CultDrawOptionsV7 {
  readonly highContrast?: boolean;
}

function colours(highContrast: boolean) {
  return highContrast
    ? {
        casing: "#000000",
        line: "#ffffff",
        lineDark: "#ffffff",
        slack: "#ffffff",
        cream: "#ffffff",
      }
    : {
        casing: CULT_PALETTE_V7.casing,
        line: CULT_PALETTE_V7.glow,
        lineDark: CULT_PALETTE_V7.dark,
        slack: CULT_PALETTE_V7.redLit,
        cream: CULT_PALETTE_V7.wax,
      };
}

/** How far from its tile's centre each end of a strand starts. */
export const STRAND_ENDS_V7 = { cultist: 26, daemon: 40 } as const;

/** The sagging curve of a strand between two tile centres. */
function strandCurve(
  from: Point,
  to: Point,
  zoom: number,
): { readonly a: Point; readonly c: Point; readonly b: Point } {
  // From the channeller's side to the daemon's collar: each end stops short
  // of its piece, so the chain crosses no face.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.hypot(dx, dy) || 1;
  const ux = dx / span;
  const uy = dy / span;
  const a = {
    x: from.x + ux * STRAND_ENDS_V7.cultist * zoom,
    y: from.y + uy * STRAND_ENDS_V7.cultist * zoom - 12 * zoom,
  };
  const b = {
    x: to.x - ux * STRAND_ENDS_V7.daemon * zoom,
    y: to.y - uy * STRAND_ENDS_V7.daemon * zoom - 4 * zoom,
  };
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = Math.min(26 * zoom, length * 0.14);
  return { a, b, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag } };
}

function curvePoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/**
 * A strand: a thin green chain from the channeller (`from`) to its daemon
 * (`to`), tile centres in CSS px. A slack strand (its cultist out of reach:
 * it does not count at the check) is red, thinner and parted in the middle.
 * Three strokes at most: the casing, the dark green, and the lit links.
 */
export function drawCultStrandV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  zoom: number,
  holds: boolean,
  options: CultDrawOptionsV7 = {},
): void {
  const palette = colours(options.highContrast ?? false);
  const { a, b, c } = strandCurve(from, to, zoom);
  const path = (): void => {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.quadraticCurveTo(c.x, c.y, b.x, b.y);
  };
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  if (!holds) {
    // Parted in the middle: two halves that no longer meet.
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    context.setLineDash([length * 0.42, length * 0.2, length]);
  }
  path();
  context.globalAlpha = 0.85;
  context.strokeStyle = palette.casing;
  context.lineWidth = Math.max(3.5, 8.5 * zoom);
  context.stroke();
  context.globalAlpha = 1;
  path();
  context.strokeStyle = holds ? palette.lineDark : CULT_PALETTE_V7.red;
  context.lineWidth = Math.max(2.4, 5.4 * zoom);
  context.stroke();
  // The links: lit dashes along the chain.
  const link = Math.max(3, 7 * zoom);
  if (holds) context.setLineDash([link, link * 0.8]);
  path();
  context.strokeStyle = holds ? palette.line : palette.slack;
  context.lineWidth = Math.max(1.4, 3 * zoom);
  context.stroke();
  // A cream bead at each end: the hand that holds the chain and the ring
  // on the collar. The cream is what reads against Grass.
  context.setLineDash([]);
  context.fillStyle = palette.cream;
  context.strokeStyle = palette.casing;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  for (const end of [a, b]) {
    context.beginPath();
    context.arc(end.x, end.y, Math.max(2.2, 4.2 * zoom), 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}

/**
 * The Anchor grip: a teal tentacle from the Thing (`from`) that loops round
 * the gripped cultist's feet (`to`), with cream suckers. A grip that no
 * longer counts (the Thing stepped away) is drawn thin and pale.
 */
export function drawCultGripV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  zoom: number,
  holds: boolean,
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const palette = colours(highContrast);
  const a = { x: from.x, y: from.y + 22 * zoom };
  const b = { x: to.x, y: to.y + 34 * zoom };
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 22 * zoom };
  const loop = { rx: 24 * zoom, ry: 9 * zoom };
  const path = (): void => {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.quadraticCurveTo(c.x, c.y, b.x, b.y);
    context.ellipse(b.x, b.y, loop.rx, loop.ry, 0, Math.PI / 2, Math.PI * 2.5);
  };
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  context.globalAlpha = holds ? 1 : 0.6;
  path();
  context.strokeStyle = palette.casing;
  context.lineWidth = Math.max(4, (holds ? 11 : 7) * zoom);
  context.stroke();
  path();
  context.strokeStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.teal;
  context.lineWidth = Math.max(2.5, (holds ? 7.5 : 4) * zoom);
  context.stroke();
  if (holds && !highContrast) {
    // The suckers.
    context.fillStyle = palette.cream;
    for (const t of [0.25, 0.5, 0.75]) {
      const point = curvePoint(a, c, b, t);
      context.beginPath();
      context.arc(point.x, point.y, Math.max(1, 1.9 * zoom), 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

/**
 * Where a Boo! sends a unit: an arrow from its tile (`from`) to the tile it
 * jumps to. A unit that stays gets a short barred stub, one whose jump the
 * viewer cannot know a dashed arrow.
 */
export function drawCultBooJumpV7(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  zoom: number,
  outcome: "JUMPS" | "STAYS" | "UNKNOWN",
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const palette = colours(highContrast);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return;
  const ux = dx / length;
  const uy = dy / length;
  const stays = outcome === "STAYS";
  const start = { x: from.x + ux * 30 * zoom, y: from.y + uy * 30 * zoom };
  const reach = stays ? 52 * zoom : length - 26 * zoom;
  const end = { x: from.x + ux * reach, y: from.y + uy * reach };
  const head = Math.max(6, 13 * zoom);
  const shape = (): void => {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    if (stays) {
      // A bar across the stub: it cannot jump.
      context.moveTo(end.x - uy * head, end.y + ux * head);
      context.lineTo(end.x + uy * head, end.y - ux * head);
    } else {
      context.moveTo(
        end.x - ux * head - uy * head * 0.7,
        end.y - uy * head + ux * head * 0.7,
      );
      context.lineTo(end.x, end.y);
      context.lineTo(
        end.x - ux * head + uy * head * 0.7,
        end.y - uy * head - ux * head * 0.7,
      );
    }
  };
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  shape();
  context.globalAlpha = 0.85;
  context.strokeStyle = palette.casing;
  context.lineWidth = Math.max(4, 9 * zoom);
  context.stroke();
  context.globalAlpha = 1;
  if (outcome === "UNKNOWN") context.setLineDash([6 * zoom, 6 * zoom]);
  shape();
  context.strokeStyle = highContrast
    ? "#ffffff"
    : stays
      ? "#aab3c0"
      : CULT_PALETTE_V7.wax;
  context.lineWidth = Math.max(2, 4.5 * zoom);
  context.stroke();
  context.restore();
}

/** Draws one Cult link of the plan between two tile centres. */
export function drawCultLinkV7(
  context: CanvasRenderingContext2D,
  link: CultLinkV7,
  from: Point,
  to: Point,
  zoom: number,
  options: CultDrawOptionsV7 = {},
): void {
  if (link.kind === "STRAND")
    drawCultStrandV7(context, from, to, zoom, link.holds, options);
  else if (link.kind === "GRIP")
    drawCultGripV7(context, from, to, zoom, link.holds, options);
  else drawCultBooJumpV7(context, from, to, zoom, link.outcome, options);
}

/** The dark disc under a badge. */
function disc(
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
 * The dark halo under a candle, drawn or raster: what makes a small cream
 * stick and a green flame read on Grass and on Snow.
 */
function drawCandleHalo(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  highContrast: boolean,
): void {
  context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.globalAlpha *= 0.72;
  context.beginPath();
  context.arc(cx, cy, (12.5 * size) / 26, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha /= 0.72;
}

/** A lit candle in code: a cream stick and its green flame. */
function drawCodeCandle(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  highContrast: boolean,
): void {
  const u = size / 26;
  context.lineJoin = "round";
  // The stick.
  context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
  context.strokeStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.lineWidth = Math.max(0.8, 1.2 * u);
  context.beginPath();
  context.rect(cx - 3.2 * u, cy + 0.5 * u, 6.4 * u, 9 * u);
  context.fill();
  context.stroke();
  // The flame: a teardrop.
  context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.flame;
  context.beginPath();
  context.moveTo(cx, cy - 10 * u);
  context.quadraticCurveTo(cx + 5 * u, cy - 3.5 * u, cx, cy - 0.5 * u);
  context.quadraticCurveTo(cx - 5 * u, cy - 3.5 * u, cx, cy - 10 * u);
  context.fill();
  context.stroke();
  if (!highContrast) {
    context.fillStyle = CULT_PALETTE_V7.wax;
    context.beginPath();
    context.arc(cx, cy - 3.4 * u, 1.3 * u, 0, Math.PI * 2);
    context.fill();
  }
}

/** A brass collar ring with a gap and two crack lines. */
function drawCrackedCollar(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  highContrast: boolean,
): void {
  context.lineCap = "round";
  context.strokeStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.brass;
  context.lineWidth = Math.max(1.2, radius * 0.3);
  context.beginPath();
  context.arc(cx, cy, radius * 0.56, -Math.PI * 0.32, Math.PI * 1.3);
  context.stroke();
  // The crack, in the gap.
  context.strokeStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.redLit;
  context.lineWidth = Math.max(1, radius * 0.16);
  context.beginPath();
  context.moveTo(cx + radius * 0.1, cy - radius * 0.84);
  context.lineTo(cx + radius * 0.3, cy - radius * 0.5);
  context.lineTo(cx + radius * 0.08, cy - radius * 0.34);
  context.stroke();
}

/** An eye: a cream almond with a red iris (what a loose daemon looks at). */
function drawEye(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  highContrast: boolean,
): void {
  context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
  context.beginPath();
  context.moveTo(cx - radius * 0.78, cy);
  context.quadraticCurveTo(cx, cy - radius * 0.86, cx + radius * 0.78, cy);
  context.quadraticCurveTo(cx, cy + radius * 0.86, cx - radius * 0.78, cy);
  context.fill();
  context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.red;
  context.beginPath();
  context.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#000000";
  context.beginPath();
  context.arc(cx, cy, radius * 0.14, 0, Math.PI * 2);
  context.fill();
}

/** Rasters of the marks, each optional: without one the mark is code-drawn. */
export interface CultMarkerArtV7 {
  readonly candlelit?: CanvasImageSource | null;
  readonly unbound?: CanvasImageSource | null;
  readonly furious?: CanvasImageSource | null;
}

function drawRaster(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  cx: number,
  cy: number,
  size: number,
): void {
  context.drawImage(image, cx - size / 2, cy - size / 2, size, size);
}

/** What the row of pips under a daemon shows. */
export interface CultControlPipsV7 {
  /** One slot per strand the daemon needs (its Control). */
  readonly slots: number;
  /** The slots lit: holding strands, up to the Control. */
  readonly lit: number;
  /** Strands past the Control, drawn as small pips (at most four). */
  readonly extra: number;
  /** Fewer strands than the Control: the check would unbind it. */
  readonly short: boolean;
}

/** The pips of a daemon with `strands` holding strands against `control`. */
export function cultControlPipsV7(control: {
  readonly control: number;
  readonly strands: number;
}): CultControlPipsV7 {
  const slots = Math.max(0, control.control);
  const strands = Math.max(0, control.strands);
  return {
    slots,
    lit: Math.min(slots, strands),
    extra: Math.min(CULT_EXTRA_PIPS_V7, Math.max(0, strands - slots)),
    short: strands < slots,
  };
}

/**
 * The row of Control pips: one slot per strand the daemon needs, lit for a
 * holding strand and hollow, red-rimmed, for a missing one; strands past
 * the Control are small lit pips after the row (insurance the player can
 * count). A daemon that is short wears a cracked collar at the row's left.
 */
export function drawCultControlPipsV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  control: {
    readonly control: number;
    readonly strands: number;
    /** An Unbound daemon being bound: no red rim, no collar. */
    readonly binding?: true;
  },
  options: CultDrawOptionsV7 = {},
): void {
  const highContrast = options.highContrast ?? false;
  const frame = CULT_MARKER_FRAME_V7.pips;
  const pips = cultControlPipsV7(control);
  const { slots, lit, extra } = pips;
  // A binding that is not full yet is progress, not a warning.
  const short = pips.short && control.binding !== true;
  const missing =
    control.binding === true ? CULT_PALETTE_V7.wax : CULT_PALETTE_V7.redLit;
  if (slots === 0) return;
  const radius = Math.max(3, frame.radius * zoom);
  const gap = frame.gap * zoom;
  const extraRadius = Math.max(2, frame.extraRadius * zoom);
  const collar = short ? radius * 2 + gap : 0;
  const width =
    collar +
    slots * radius * 2 +
    (slots - 1) * gap +
    (extra === 0 ? 0 : gap * 1.5 + extra * extraRadius * 2 + (extra - 1) * gap);
  const cy = y + frame.y * zoom;
  let cx = x + frame.x * zoom - width / 2;
  context.save();
  context.setLineDash([]);
  // The plate: a dark pill, red-rimmed when the daemon would break.
  const pad = Math.max(2, 3 * zoom);
  const height = radius * 2 + pad * 2;
  context.fillStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
  context.globalAlpha *= 0.86;
  context.beginPath();
  context.roundRect(
    cx - pad * 1.6,
    cy - height / 2,
    width + pad * 3.2,
    height,
    height / 2,
  );
  context.fill();
  context.globalAlpha /= 0.86;
  if (short) {
    context.strokeStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.redLit;
    context.lineWidth = Math.max(1, 1.6 * zoom);
    context.stroke();
    drawCrackedCollar(context, cx + radius, cy, radius * 1.25, highContrast);
    cx += collar;
  }
  for (let index = 0; index < slots; index += 1) {
    const px = cx + radius + index * (radius * 2 + gap);
    context.beginPath();
    context.arc(px, cy, radius - Math.max(0.6, zoom), 0, Math.PI * 2);
    if (index < lit) {
      context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.flame;
      context.fill();
      context.strokeStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.wax;
      context.lineWidth = Math.max(0.8, 1.3 * zoom);
      context.stroke();
    } else {
      // Hollow: a strand it still needs.
      context.strokeStyle = highContrast ? "#ffffff" : missing;
      context.lineWidth = Math.max(1, 1.8 * zoom);
      context.stroke();
    }
  }
  let ex = cx + slots * radius * 2 + (slots - 1) * gap + gap * 1.5;
  for (let index = 0; index < extra; index += 1) {
    context.beginPath();
    context.arc(ex + extraRadius, cy, extraRadius, 0, Math.PI * 2);
    context.fillStyle = highContrast ? "#ffffff" : CULT_PALETTE_V7.glow;
    context.fill();
    ex += extraRadius * 2 + gap;
  }
  context.restore();
}

/** Draws the Cult marks of one unit at its tile centre (`x`, `y`). */
export function drawCultUnitMarkersV7(
  context: CanvasRenderingContext2D,
  markers: CultUnitMarkersV7,
  x: number,
  y: number,
  zoom: number,
  options: CultDrawOptionsV7 & { readonly art?: CultMarkerArtV7 } = {},
): void {
  const highContrast = options.highContrast ?? false;
  const frame = CULT_MARKER_FRAME_V7;
  context.save();
  context.setLineDash([]);
  if (markers.candle === true) {
    const cx = x + frame.candle.x * zoom;
    const cy = y + frame.candle.y * zoom;
    const size = Math.max(14, frame.candle.size * zoom);
    const image = options.art?.candlelit ?? null;
    drawCandleHalo(context, cx, cy, size, highContrast);
    if (image !== null) drawRaster(context, image, cx, cy, size * 0.86);
    else drawCodeCandle(context, cx, cy, size, highContrast);
  }
  if (markers.furious === true) {
    // Steam from the ears: two puffs over the head.
    const image = options.art?.furious ?? null;
    if (image !== null)
      drawRaster(
        context,
        image,
        x,
        y + frame.steam.y * zoom,
        Math.max(14, 26 * zoom),
      );
    else
      for (const side of [-1, 1]) {
        const px = x + side * frame.steam.spread * zoom;
        const py = y + frame.steam.y * zoom;
        context.fillStyle = "#ffffff";
        context.strokeStyle = highContrast ? "#000000" : CULT_PALETTE_V7.casing;
        context.lineWidth = Math.max(0.8, 1.2 * zoom);
        for (const [ox, oy, r] of [
          [0, 0, 5.5],
          [side * 5, -5, 4.4],
          [side * 2, -10.5, 3.4],
        ] as const) {
          context.beginPath();
          context.arc(
            px + ox * zoom,
            py + oy * zoom,
            Math.max(1.5, r * zoom),
            0,
            Math.PI * 2,
          );
          context.fill();
          context.stroke();
        }
      }
  }
  if (markers.unbound === true || markers.eye === true) {
    const cx = x + frame.badge.x * zoom;
    const cy = y + frame.badge.y * zoom;
    const radius = Math.max(7, frame.badge.radius * zoom);
    const image =
      markers.unbound === true ? (options.art?.unbound ?? null) : null;
    disc(context, cx, cy, radius, zoom, CULT_PALETTE_V7.redLit, highContrast);
    if (image !== null) drawRaster(context, image, cx, cy, radius * 1.7);
    else if (markers.unbound === true)
      drawCrackedCollar(context, cx, cy, radius, highContrast);
    else drawEye(context, cx, cy, radius, highContrast);
  }
  if (markers.control !== undefined)
    drawCultControlPipsV7(context, x, y, zoom, markers.control, options);
  context.restore();
}
