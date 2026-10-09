import { CRUMBS_TURNS_V7 } from "../../engine/index";
import {
  CANDY_MARKERS_V7,
  CANDY_PALETTE_V7,
} from "../../assets/chibi-direction-candy-presentation";
import type {
  CandyCrumbsMarkerV7,
  CandyUnitMarkersV7,
} from "./candy-board-plan-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/**
 * The Candy board markers (bead pulp_wars-jdb.6, docs/art/factions/CANDY.md
 * "Markers"): the Crumbs pile of a tile with its pips and the unit it would
 * bake back, and a unit's Rushed chip, Crashed swirl, Splatted pie, Home
 * Sweet Home house and Sugar Frenzy pips. Each marker draws its raster of
 * the Candy art at the size and place of `CANDY_MARKERS_V7`; without a
 * loaded raster (LEGACY, the classic look, high contrast, still loading) it
 * is code-drawn alone. Every marker is still: nothing here moves, so
 * reduced motion draws the same frame.
 */

/** World units per master pixel (a 128-unit cell is an 80 px master tile). */
const MASTER = 1.6;

const {
  // The Chocolatier accents (bead pulp_wars-jdb.10): the Rush path and
  // sparkles are caramel gold, not the faction's pink border colour.
  caramel,
  milkChocolate,
  white,
  cream,
  biscuit,
  chocolate,
  mint,
  outline,
} = CANDY_PALETTE_V7;

/** The percent of its colour a Crashed unit's sprite keeps (droopy tint). */
export const CRASHED_SPRITE_SATURATION_V7 = 45;

/** The share of its strength a Crashed unit's sprite is drawn at. */
export const CRASHED_SPRITE_ALPHA_V7 = 0.86;

export interface CandyMarkerOptionsV7 {
  readonly highContrast?: boolean;
  readonly devicePixelRatio?: number;
}

function snapper(ratio: number | undefined): (value: number) => number {
  const scale = ratio !== undefined && ratio > 0 ? ratio : 1;
  return (value) => Math.round(value * scale) / scale;
}

/** The pixel size of a raster, or null while it has none. */
function intrinsicSize(
  image: CanvasImageSource,
): { readonly width: number; readonly height: number } | null {
  const sized = image as {
    readonly naturalWidth?: unknown;
    readonly naturalHeight?: unknown;
    readonly width?: unknown;
    readonly height?: unknown;
  };
  const width =
    typeof sized.naturalWidth === "number" ? sized.naturalWidth : sized.width;
  const height =
    typeof sized.naturalHeight === "number"
      ? sized.naturalHeight
      : sized.height;
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}

/** Draws a square raster centred on a point. */
function raster(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  cx: number,
  cy: number,
  size: number,
  ratio: number | undefined,
): void {
  const snap = snapper(ratio);
  context.imageSmoothingEnabled = true;
  context.drawImage(
    image,
    snap(cx - size / 2),
    snap(cy - size / 2),
    size,
    size,
  );
}

/** A row of pips: `left` filled of `of`, centred on a point. */
export function drawCandyPipsV7(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  pips: { readonly left: number; readonly of: number },
  options: CandyMarkerOptionsV7 & { readonly fill?: string } = {},
): void {
  const radius = 3 * MASTER * zoom;
  const step = radius * 2.7;
  const highContrast = options.highContrast ?? false;
  context.save();
  // A dark pill behind the pips, so they read on any sprite and ground.
  const half = ((pips.of - 1) * step) / 2 + radius * 1.9;
  context.beginPath();
  context.moveTo(cx - half + radius * 1.7, cy - radius * 1.7);
  context.arcTo(
    cx + half,
    cy - radius * 1.7,
    cx + half,
    cy + radius * 1.7,
    radius * 1.7,
  );
  context.arcTo(
    cx + half,
    cy + radius * 1.7,
    cx - half,
    cy + radius * 1.7,
    radius * 1.7,
  );
  context.arcTo(
    cx - half,
    cy + radius * 1.7,
    cx - half,
    cy - radius * 1.7,
    radius * 1.7,
  );
  context.arcTo(
    cx - half,
    cy - radius * 1.7,
    cx + half,
    cy - radius * 1.7,
    radius * 1.7,
  );
  context.closePath();
  context.fillStyle = highContrast ? "#000000" : `${outline}d9`;
  context.fill();
  context.lineWidth = Math.max(1, 0.9 * MASTER * zoom);
  context.strokeStyle = highContrast ? "#ffffff" : outline;
  for (let index = 0; index < pips.of; index += 1) {
    const x = cx + (index - (pips.of - 1) / 2) * step;
    context.beginPath();
    context.arc(x, cy, radius, 0, Math.PI * 2);
    context.fillStyle =
      index < pips.left
        ? highContrast
          ? "#ffffff"
          : (options.fill ?? white)
        : highContrast
          ? "#000000"
          : "#6a5360";
    context.fill();
    context.stroke();
  }
  context.restore();
}

/**
 * The Crumbs of a tile (section 15.1): the pile standing on the tile, up
 * to three pips for the turns left, the unit it would bake back in a small
 * token, and a peppermint dot when an enemy that eats them is hurt.
 * `x`, `y` is the cell's centre.
 */
export function drawCandyCrumbsV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  marker: CandyCrumbsMarkerV7,
  options: CandyMarkerOptionsV7 & {
    /** The `CRUMBS` raster. */
    readonly pile?: CanvasImageSource | null;
    /** The board sprite of the fallen unit's role (its head is shown). */
    readonly unit?: CanvasImageSource | null;
    /**
     * Where the sprite's head is, as shares of its canvas (the top row and
     * the head's middle); omitted, the top middle of the canvas.
     */
    readonly unitHead?: {
      readonly top: number;
      readonly centre: number;
    } | null;
    /** The first letter of the role's name, for the code-drawn token. */
    readonly initial?: string;
  } = {},
): void {
  const px = (value: number): number => value * MASTER * zoom;
  const highContrast = options.highContrast ?? false;
  const frame = CANDY_MARKERS_V7.crumbs;
  const size = px(frame.size);
  const bottom = y + px(40 - frame.lift);
  const cy = bottom - size / 2;
  context.save();
  const pile = highContrast ? null : (options.pile ?? null);
  if (pile !== null)
    raster(context, pile, x, cy, size, options.devicePixelRatio);
  else {
    // A code-drawn pile: three biscuit crumbs and a few sprinkles.
    context.lineWidth = Math.max(1, px(1.2));
    context.strokeStyle = highContrast ? "#ffffff" : outline;
    for (const [dx, dy, r, colour] of [
      [-7, 6, 6, biscuit],
      [6, 7, 5, cream],
      [0, 0, 7, biscuit],
    ] as const) {
      context.beginPath();
      context.arc(x + px(dx), cy + px(dy + 4), px(r), 0, Math.PI * 2);
      context.fillStyle = highContrast ? "#000000" : colour;
      context.fill();
      context.stroke();
    }
    if (!highContrast)
      for (const [dx, dy, colour] of [
        [-3, 1, caramel],
        [4, 5, mint],
        [-8, 8, white],
      ] as const) {
        context.fillStyle = colour;
        context.fillRect(x + px(dx), cy + px(dy + 3), px(2.4), px(1.4));
      }
  }
  // The unit the Crumbs would bake back: a small round token.
  const tokenR = px(11);
  const tx = x + px(17);
  const ty = cy - px(7);
  context.beginPath();
  context.arc(tx, ty, tokenR, 0, Math.PI * 2);
  context.fillStyle = highContrast ? "#000000" : white;
  context.fill();
  const unit = highContrast ? null : (options.unit ?? null);
  const sprite = unit === null ? null : intrinsicSize(unit);
  if (unit !== null && sprite !== null) {
    // The head of the unit's own sprite: a square two thirds of its
    // canvas wide, from its top row.
    const side = Math.min(sprite.width, sprite.height) * 0.66;
    const head = options.unitHead ?? { top: 0.1, centre: 0.5 };
    const sx = Math.max(
      0,
      Math.min(sprite.width - side, head.centre * sprite.width - side / 2),
    );
    const sy = Math.max(
      0,
      Math.min(sprite.height - side, head.top * sprite.height - side * 0.06),
    );
    const snap = snapper(options.devicePixelRatio);
    context.save();
    context.beginPath();
    context.arc(tx, ty, tokenR - px(0.6), 0, Math.PI * 2);
    context.clip();
    context.imageSmoothingEnabled = true;
    context.drawImage(
      unit,
      sx,
      sy,
      side,
      side,
      snap(tx - tokenR),
      snap(ty - tokenR),
      tokenR * 2,
      tokenR * 2,
    );
    context.restore();
  } else if (options.initial !== undefined) {
    context.fillStyle = highContrast ? "#ffffff" : chocolate;
    context.font = `700 ${Math.max(7, px(10))}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(options.initial, tx, ty + px(0.5));
  }
  context.beginPath();
  context.arc(tx, ty, tokenR, 0, Math.PI * 2);
  context.lineWidth = Math.max(1, px(1.4));
  context.strokeStyle = highContrast ? "#ffffff" : milkChocolate;
  context.stroke();
  // Peppermint Surprise: a red-and-white swirl dot on the pile's left.
  if (marker.bite) {
    const bx = x - px(15);
    const by = cy - px(4);
    const br = px(5);
    context.beginPath();
    context.arc(bx, by, br, 0, Math.PI * 2);
    context.fillStyle = highContrast ? "#ffffff" : white;
    context.fill();
    context.lineWidth = Math.max(1, px(1.6));
    context.strokeStyle = highContrast ? "#000000" : "#3fa878";
    for (let arm = 0; arm < 3; arm += 1) {
      const start = (arm * Math.PI * 2) / 3;
      context.beginPath();
      context.arc(bx, by, br * 0.55, start, start + Math.PI / 2.4);
      context.stroke();
    }
    context.beginPath();
    context.arc(bx, by, br, 0, Math.PI * 2);
    context.lineWidth = Math.max(1, px(1));
    context.strokeStyle = highContrast ? "#000000" : outline;
    context.stroke();
  }
  context.restore();
  drawCandyPipsV7(
    context,
    x,
    bottom + px(4),
    zoom,
    {
      left: Math.max(0, Math.min(CRUMBS_TURNS_V7, marker.turnsLeft)),
      of: CRUMBS_TURNS_V7,
    },
    { ...options, fill: cream },
  );
}

/** Where a unit's markers hang: its head and its body, in CSS pixels. */
export interface CandyUnitAnchorV7 {
  /** The middle of the head. */
  readonly x: number;
  /** The top row of the sprite. */
  readonly top: number;
  /** The bottom of the sprite. */
  readonly bottom: number;
}

/** The places of a unit's markers, as their centres in CSS pixels. */
export function candyMarkerPlacesV7(
  anchor: CandyUnitAnchorV7,
  zoom: number,
): {
  readonly crashed: { readonly x: number; readonly y: number };
  readonly rushed: { readonly x: number; readonly y: number };
  readonly splatted: { readonly x: number; readonly y: number };
  readonly home: { readonly x: number; readonly y: number };
} {
  const px = (value: number): number => value * MASTER * zoom;
  const rushedX = anchor.x + px(CANDY_MARKERS_V7.rushed.shift);
  const rushedY = anchor.top + px(2);
  return {
    crashed: { x: anchor.x, y: anchor.top },
    rushed: { x: rushedX, y: rushedY },
    splatted: {
      x: anchor.x,
      y: anchor.top + (anchor.bottom - anchor.top) / 3,
    },
    home: { x: rushedX, y: rushedY + px(15) },
  };
}

/** A dark token under a small status raster, so it reads on any ground. */
function token(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  highContrast: boolean,
  rim: string,
): void {
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = highContrast ? "#000000" : outline;
  context.fill();
  context.lineWidth = Math.max(1, radius * 0.16);
  context.strokeStyle = highContrast ? "#ffffff" : rim;
  context.stroke();
}

/**
 * The Candy markers of one unit (section 15.1), over its sprite: the
 * Crashed swirl over its head, the Rushed chip beside its head (with the
 * Home Sweet Home house or the Sugar Frenzy pips under it) and the
 * Splatted pie on its face.
 */
export function drawCandyUnitMarkersV7(
  context: CanvasRenderingContext2D,
  markers: CandyUnitMarkersV7,
  anchor: CandyUnitAnchorV7,
  zoom: number,
  options: CandyMarkerOptionsV7 & {
    readonly rushed?: CanvasImageSource | null;
    readonly crashed?: CanvasImageSource | null;
    readonly splatted?: CanvasImageSource | null;
    readonly home?: CanvasImageSource | null;
  } = {},
): void {
  const px = (value: number): number => value * MASTER * zoom;
  const highContrast = options.highContrast ?? false;
  const places = candyMarkerPlacesV7(anchor, zoom);
  const image = (
    source: CanvasImageSource | null | undefined,
  ): CanvasImageSource | null => (highContrast ? null : (source ?? null));
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  if (markers.splatted) {
    const size = px(CANDY_MARKERS_V7.splatted.size);
    const { x, y } = places.splatted;
    const pie = image(options.splatted);
    if (pie !== null)
      raster(context, pie, x, y, size, options.devicePixelRatio);
    else {
      // A cream pie: a biscuit rim, whipped cream, drips.
      context.lineWidth = Math.max(1, px(1.4));
      context.strokeStyle = highContrast ? "#ffffff" : outline;
      context.fillStyle = highContrast ? "#000000" : biscuit;
      context.beginPath();
      context.arc(x, y, size * 0.42, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = highContrast ? "#ffffff" : white;
      context.beginPath();
      context.arc(x, y, size * 0.3, 0, Math.PI * 2);
      context.fill();
      for (const dx of [-0.2, 0.05, 0.24]) {
        context.beginPath();
        context.arc(
          x + size * dx,
          y + size * 0.36,
          size * 0.09,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
  }
  if (markers.crashed) {
    const size = px(CANDY_MARKERS_V7.crashed.size);
    const { x, y } = places.crashed;
    const swirl = image(options.crashed);
    if (swirl !== null)
      raster(context, swirl, x, y, size, options.devicePixelRatio);
    else {
      // A dizzy swirl: a caramel spiral in a dark casing.
      const spiral = (width: number, colour: string): void => {
        context.lineWidth = width;
        context.strokeStyle = colour;
        context.beginPath();
        for (let step = 0; step <= 40; step += 1) {
          const t = step / 40;
          const angle = t * Math.PI * 3.5;
          const r = size * 0.42 * t;
          const sx = x + Math.cos(angle) * r;
          const sy = y + Math.sin(angle) * r * 0.55;
          if (step === 0) context.moveTo(sx, sy);
          else context.lineTo(sx, sy);
        }
        context.stroke();
      };
      spiral(Math.max(2, px(4.2)), highContrast ? "#000000" : outline);
      spiral(Math.max(1, px(2.2)), highContrast ? "#ffffff" : caramel);
    }
  }
  if (markers.rushed) {
    const size = px(CANDY_MARKERS_V7.rushed.size);
    const { x, y } = places.rushed;
    token(context, x, y, size * 0.62, highContrast, caramel);
    const bolt = image(options.rushed);
    if (bolt !== null)
      raster(context, bolt, x, y, size, options.devicePixelRatio);
    else {
      // A lightning bolt.
      const u = size / 16;
      context.fillStyle = highContrast ? "#ffffff" : caramel;
      context.beginPath();
      context.moveTo(x + 2 * u, y - 7 * u);
      context.lineTo(x - 4 * u, y + 1 * u);
      context.lineTo(x - 0.5 * u, y + 1 * u);
      context.lineTo(x - 2 * u, y + 7 * u);
      context.lineTo(x + 4 * u, y - 1.5 * u);
      context.lineTo(x + 0.5 * u, y - 1.5 * u);
      context.closePath();
      context.fill();
    }
    if (markers.home) {
      const { x: hx, y: hy } = places.home;
      const hs = px(13);
      token(context, hx, hy, hs * 0.62, highContrast, mint);
      const house = image(options.home);
      if (house !== null)
        raster(context, house, hx, hy, hs, options.devicePixelRatio);
      else {
        // A small house: a roof and a body.
        const u = hs / 13;
        context.fillStyle = highContrast ? "#ffffff" : cream;
        context.beginPath();
        context.moveTo(hx, hy - 5 * u);
        context.lineTo(hx + 5 * u, hy - 0.5 * u);
        context.lineTo(hx + 3.5 * u, hy - 0.5 * u);
        context.lineTo(hx + 3.5 * u, hy + 4.5 * u);
        context.lineTo(hx - 3.5 * u, hy + 4.5 * u);
        context.lineTo(hx - 3.5 * u, hy - 0.5 * u);
        context.lineTo(hx - 5 * u, hy - 0.5 * u);
        context.closePath();
        context.fill();
      }
    }
  }
  context.restore();
}

/**
 * The Bounce of a focused attack (section 15.1): an arrow from the attacker
 * to the tile it springs back to, or a short arrow ending in a cross when
 * the Bounce is blocked. The points are cell centres in CSS pixels.
 */
export function drawCandyBounceArrowV7(
  context: CanvasRenderingContext2D,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number } | null,
  /** Away from the defender: the direction of a blocked Bounce. */
  away: { readonly x: number; readonly y: number },
  zoom: number,
  highContrast = false,
): void {
  const blocked = to === null;
  const dx = blocked ? away.x : to.x - from.x;
  const dy = blocked ? away.y : to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const reach = blocked ? 52 * zoom : Math.max(30 * zoom, length - 24 * zoom);
  const startX = from.x + ux * 26 * zoom;
  const startY = from.y + uy * 26 * zoom;
  const tipX = from.x + ux * Math.max(30 * zoom, reach);
  const tipY = from.y + uy * Math.max(30 * zoom, reach);
  const path = (): void => {
    // A springy arrow: a small zigzag, then the head or a cross.
    context.beginPath();
    context.moveTo(startX, startY);
    const coils = 4;
    for (let index = 1; index <= coils; index += 1) {
      const t = index / (coils + 1);
      const side = (index % 2 === 0 ? 1 : -1) * 5 * zoom;
      context.lineTo(
        startX + (tipX - startX) * t - uy * side,
        startY + (tipY - startY) * t + ux * side,
      );
    }
    context.lineTo(tipX, tipY);
    if (blocked) {
      const s = 8 * zoom;
      context.moveTo(tipX - s, tipY - s);
      context.lineTo(tipX + s, tipY + s);
      context.moveTo(tipX + s, tipY - s);
      context.lineTo(tipX - s, tipY + s);
    } else {
      context.moveTo(tipX, tipY);
      context.lineTo(
        tipX - ux * 14 * zoom - uy * 10 * zoom,
        tipY - uy * 14 * zoom + ux * 10 * zoom,
      );
      context.moveTo(tipX, tipY);
      context.lineTo(
        tipX - ux * 14 * zoom + uy * 10 * zoom,
        tipY - uy * 14 * zoom - ux * 10 * zoom,
      );
    }
  };
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  context.lineWidth = 7 * zoom;
  context.strokeStyle = highContrast ? "#000000" : outline;
  path();
  context.stroke();
  context.lineWidth = 3.5 * zoom;
  context.strokeStyle = highContrast ? "#ffffff" : blocked ? cream : caramel;
  path();
  context.stroke();
  context.restore();
}

/** The sparkles of a tile only the Rush reaches (section 15.1). */
export function drawCandyRushSparklesV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast = false,
): void {
  context.save();
  context.fillStyle = highContrast ? "#ffffff" : `${caramel}38`;
  const half = 60 * zoom;
  if (!highContrast) context.fillRect(x - half, y - half, half * 2, half * 2);
  context.fillStyle = highContrast ? "#ffffff" : white;
  context.strokeStyle = highContrast ? "#000000" : milkChocolate;
  context.lineWidth = Math.max(0.8, 1 * zoom);
  for (const [dx, dy, r] of [
    [-34, -30, 7],
    [32, -22, 5],
    [-26, 30, 5],
    [36, 32, 7],
  ] as const) {
    const cx = x + dx * zoom;
    const cy = y + dy * zoom;
    const radius = r * zoom;
    context.beginPath();
    for (let point = 0; point < 8; point += 1) {
      const angle = (point * Math.PI) / 4;
      const reach = point % 2 === 0 ? radius : radius * 0.34;
      const sx = cx + Math.cos(angle) * reach;
      const sy = cy + Math.sin(angle) * reach;
      if (point === 0) context.moveTo(sx, sy);
      else context.lineTo(sx, sy);
    }
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.restore();
}
