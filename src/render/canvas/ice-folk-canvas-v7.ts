/**
 * Code-drawn Ice Folk board cues (docs/product/RULESET_7_ICE_FOLK.md section
 * 13.1, docs/art/factions/ICE_FOLK.md "Code-drawn pieces", bead
 * pulp_wars-7g3.6): the snow-capped peak badge over Human stand-in art (LEGACY and
 * the classic look), the Snow overlay and its snow caps, the Blizzard veil,
 * flakes and the Witch's outline, the Frozen casing and its ice-cube glyph
 * (Ice Folk Freeze, bead pulp_wars-w49.38), the rime of an icebound ship,
 * the Shatter window on the HP bar and the cracks of a Shatter. The rasters come from the pure functions of
 * chibi-direction-ice-folk-presentation.ts and are built once per input and
 * cached (IceFolkBoardArtV7). Sizes are world units (128 = one cell) scaled
 * by zoom unless a name says CSS px or master px.
 */

import {
  ICE_FOLK_BLIZZARD_V7,
  ICE_FOLK_FROZEN_MARKER_V7,
  ICE_FOLK_PALETTE_V7,
  ICE_FOLK_SNOW_OVERLAY_V7,
  iceFolkBlizzardFlakesV7,
  iceFolkFrozenCasingV7,
  iceFolkSnowCapsV7,
  iceFolkSnowTileV7,
  type IceFolkRasterV7,
} from "../../assets/chibi-direction-ice-folk-presentation";
import { seaIceTileV7 } from "../../assets/sea-ice-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
import type { ChibiRasterEnvironmentV7 } from "./chibi-art-resolver-v7";
import {
  SNOW_EDGE_EAST_V7,
  SNOW_EDGE_NORTH_V7,
  SNOW_EDGE_SOUTH_V7,
  SNOW_EDGE_WEST_V7,
} from "./ice-folk-board-plan-v7";
import { UNDEAD_BADGE_FRAME_V7 } from "./undead-canvas-v7";

/** The Ice Folk badge sits in the Undead badge's corner, like every faction's. */
export const ICE_FOLK_BADGE_FRAME_V7 = UNDEAD_BADGE_FRAME_V7;

const INK = "#171722";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The Ice Folk faction cue over Human stand-in art: a snow-capped ice-blue
 * peak (the things from the peaks) on a navy disc with a pale ice rim. Navy,
 * ice and white are off every owner colour; the peak shares no shape with
 * the other factions' badges, nor with the Frozen ice-cube glyph that
 * sits on the other side of a unit.
 */
export function drawIceFolkBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? ICE_FOLK_BADGE_FRAME_V7.chibi
    : ICE_FOLK_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  const { navy, icePale, ice } = ICE_FOLK_PALETTE_V7;
  context.save();
  context.fillStyle = navy;
  context.strokeStyle = icePale;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // The peak: an ice-blue triangle on the disc's lower half, and a white
  // snow cap with a ragged lower edge over its top third.
  const s = size;
  const peak = { x: cx, y: cy - s * 0.27 };
  const left = { x: cx - s * 0.32, y: cy + s * 0.22 };
  const right = { x: cx + s * 0.32, y: cy + s * 0.22 };
  context.lineJoin = "round";
  context.fillStyle = ice;
  context.strokeStyle = ICE_FOLK_PALETTE_V7.iceDark;
  context.lineWidth = Math.max(0.8, s * 0.05);
  context.beginPath();
  context.moveTo(peak.x, peak.y);
  context.lineTo(right.x, right.y);
  context.lineTo(left.x, left.y);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(peak.x, peak.y);
  context.lineTo(cx + s * 0.13, cy - s * 0.07);
  context.lineTo(cx + s * 0.05, cy - s * 0.02);
  context.lineTo(cx - s * 0.02, cy - s * 0.08);
  context.lineTo(cx - s * 0.08, cy - s * 0.02);
  context.lineTo(cx - s * 0.13, cy - s * 0.07);
  context.closePath();
  context.fill();
  context.restore();
}

// ------------------------------------------------------------ raster cache

/**
 * The Ice Folk rasters of the board, each built once and cached: the Snow
 * overlay tile of an (edges, variant) pair (64 at most), the snow caps or
 * rime of a body or sprite image, and the Frozen casing of a sprite image
 * (keyed by the image object, which the art resolvers keep stable). A
 * raster that cannot be read back is null, and the board then draws a
 * simple code-drawn stand-in.
 */
export interface IceFolkBoardArtV7 {
  snowTile(edges: number, variant: number): CanvasImageSource | null;
  caps(
    image: CanvasImageSource,
    kind: "SNOW" | "RIME",
  ): CanvasImageSource | null;
  casing(
    image: CanvasImageSource,
    heightShare: number,
  ): { readonly image: CanvasImageSource; readonly margin: number } | null;
  /**
   * The frozen sea (bead pulp_wars-5ti.7): the ice sheet `sheet` (the
   * loaded `TERRAIN:ICE_SHALLOW` or `TERRAIN:ICE_DEEP` master) cut at its
   * open-water sides and, when `permanent`, dusted with snow
   * (`seaIceTileV7`). One surface per sheet, side set, variant and state.
   */
  seaIce(
    sheet: CanvasImageSource,
    openWater: number,
    variant: number,
    permanent: boolean,
  ): CanvasImageSource | null;
}

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
    typeof sized.naturalWidth === "number" && sized.naturalWidth > 0
      ? sized.naturalWidth
      : sized.width;
  const height =
    typeof sized.naturalHeight === "number" && sized.naturalHeight > 0
      ? sized.naturalHeight
      : sized.height;
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}

export function createIceFolkBoardArtV7(
  environment: ChibiRasterEnvironmentV7,
): IceFolkBoardArtV7 {
  const tiles = new Map<string, CanvasImageSource | null>();
  const derived = new WeakMap<object, Map<string, unknown>>();
  const surface = (raster: IceFolkRasterV7): CanvasImageSource | null =>
    environment.createSurface(raster.data, raster.width, raster.height);
  const fromImage = <T>(
    image: CanvasImageSource,
    cacheKey: string,
    build: (pixels: {
      readonly width: number;
      readonly height: number;
      readonly data: Uint8ClampedArray;
    }) => T | null,
  ): T | null => {
    const owner = image as unknown as object;
    let cache = derived.get(owner);
    if (cache === undefined) {
      cache = new Map();
      derived.set(owner, cache);
    }
    if (cache.has(cacheKey)) return cache.get(cacheKey) as T | null;
    const size = intrinsicSize(image);
    // An image that is still loading is not cached, so it is read again.
    if (size === null) return null;
    const data = environment.readPixels(image, size.width, size.height);
    const result = data === null ? null : build({ ...size, data });
    cache.set(cacheKey, result);
    return result;
  };
  return {
    snowTile(edges, variant) {
      const cacheKey = `${edges}|${variant}`;
      const cached = tiles.get(cacheKey);
      if (cached !== undefined) return cached;
      const tile = surface(
        iceFolkSnowTileV7(
          {
            north: (edges & SNOW_EDGE_NORTH_V7) !== 0,
            east: (edges & SNOW_EDGE_EAST_V7) !== 0,
            south: (edges & SNOW_EDGE_SOUTH_V7) !== 0,
            west: (edges & SNOW_EDGE_WEST_V7) !== 0,
          },
          variant,
        ),
      );
      tiles.set(cacheKey, tile);
      return tile;
    },
    caps(image, kind) {
      return fromImage(image, `caps:${kind}`, (pixels) =>
        surface(
          kind === "SNOW"
            ? iceFolkSnowCapsV7(pixels)
            : iceFolkSnowCapsV7(pixels, {
                depth: ICE_FOLK_FROZEN_MARKER_V7.rime.depth,
                colour: ICE_FOLK_PALETTE_V7.icePale,
                alpha: ICE_FOLK_FROZEN_MARKER_V7.rime.alpha,
              }),
        ),
      );
    },
    seaIce(sheet, openWater, variant, permanent) {
      return fromImage(
        sheet,
        `sea-ice:${openWater}|${variant}|${permanent ? 1 : 0}`,
        (pixels) =>
          surface(seaIceTileV7(pixels, openWater, variant, permanent)),
      );
    },
    casing(image, heightShare) {
      return fromImage(image, `casing:${heightShare}`, (pixels) => {
        const casing = iceFolkFrozenCasingV7(pixels, heightShare);
        const drawn = surface(casing);
        return drawn === null
          ? null
          : {
              image: drawn,
              margin: (casing.width - pixels.width) / 2,
            };
      });
    },
  };
}

// ------------------------------------------------------------ Snow overlay

/**
 * One Snow cell over its terrain ground (and under Roads, bodies and
 * units): the cached overlay tile drawn into the cell, or, without one, the
 * plain wash.
 */
export function drawSnowCellV7(
  context: CanvasRenderingContext2D,
  art: IceFolkBoardArtV7 | undefined,
  cell: Rect,
  snow: { readonly edges: number; readonly variant: number },
  sceneAlpha: number,
): void {
  const tile = art?.snowTile(snow.edges, snow.variant) ?? null;
  context.save();
  context.globalAlpha = sceneAlpha;
  if (tile !== null) {
    // The wash is soft, so a smoothed scale never shows a seam.
    context.imageSmoothingEnabled = true;
    context.drawImage(tile, cell.x, cell.y, cell.width, cell.height);
  } else {
    context.globalAlpha = sceneAlpha * ICE_FOLK_SNOW_OVERLAY_V7.washAlpha;
    context.fillStyle = ICE_FOLK_PALETTE_V7.snow;
    context.fillRect(cell.x, cell.y, cell.width, cell.height);
  }
  context.restore();
}

/** Snow caps over a tall terrain body drawn at `rect` (the same raster). */
export function drawSnowCapsV7(
  context: CanvasRenderingContext2D,
  art: IceFolkBoardArtV7 | undefined,
  body: CanvasImageSource,
  rect: Rect,
  source: Rect | null,
  sceneAlpha: number,
): void {
  const caps = art?.caps(body, "SNOW") ?? null;
  if (caps === null) return;
  context.save();
  context.globalAlpha = sceneAlpha;
  if (source === null)
    context.drawImage(caps, rect.x, rect.y, rect.width, rect.height);
  else
    context.drawImage(
      caps,
      source.x,
      source.y,
      source.width,
      source.height,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  context.restore();
}

// --------------------------------------------------------------- Blizzard

/**
 * One Blizzard cell (water included): the faint white veil and the calm,
 * deterministic flakes of `timeMs` (0 for reduced motion). `cell` is the
 * cell's square in CSS px.
 */
export function drawBlizzardCellV7(
  context: CanvasRenderingContext2D,
  at: { readonly x: number; readonly y: number },
  cell: Rect,
  timeMs: number,
  sceneAlpha: number,
): void {
  const spec = ICE_FOLK_BLIZZARD_V7;
  const scale = cell.width / ICE_FOLK_SNOW_OVERLAY_V7.tile;
  context.save();
  context.globalAlpha = sceneAlpha * spec.veilAlpha;
  context.fillStyle = "#ffffff";
  context.fillRect(cell.x, cell.y, cell.width, cell.height);
  for (const flake of iceFolkBlizzardFlakesV7(at, timeMs)) {
    const px = Math.round(cell.x + flake.x * scale);
    const py = Math.round(cell.y + flake.y * scale);
    const size = Math.max(1, flake.size * scale);
    context.globalAlpha = sceneAlpha * flake.alpha;
    if (flake.size === 2) {
      context.fillStyle = ICE_FOLK_PALETTE_V7.snowShade;
      context.fillRect(px, py + size * 0.5, size, size * 0.5);
    }
    context.fillStyle = "#ffffff";
    context.fillRect(px, py, size, flake.size === 2 ? size * 0.5 + 0.5 : size);
  }
  context.restore();
}

/**
 * The outline of a selected or hovered Witch's nine tiles: a white dashed
 * rounded rectangle, inset from the outer edges (ICE_FOLK_BLIZZARD_V7.ring
 * in master px, scaled with the cell).
 */
export function drawBlizzardRingV7(
  context: CanvasRenderingContext2D,
  centre: { readonly x: number; readonly y: number },
  cellCssPx: number,
  highContrast = false,
): void {
  const ring = ICE_FOLK_BLIZZARD_V7.ring;
  const scale = cellCssPx / ICE_FOLK_SNOW_OVERLAY_V7.tile;
  const inset = ring.insetPx * scale;
  const half = cellCssPx * 1.5 - inset;
  const radius = ring.radiusPx * scale;
  const left = centre.x - half;
  const top = centre.y - half;
  const size = half * 2;
  context.save();
  context.beginPath();
  context.moveTo(left + radius, top);
  context.arcTo(left + size, top, left + size, top + size, radius);
  context.arcTo(left + size, top + size, left, top + size, radius);
  context.arcTo(left, top + size, left, top, radius);
  context.arcTo(left, top, left + size, top, radius);
  context.closePath();
  context.lineWidth = Math.max(1, (ring.widthPx + 2) * scale);
  context.strokeStyle = "rgba(14, 28, 48, 0.35)";
  context.stroke();
  context.setLineDash([ring.dashPx * scale, ring.gapPx * scale]);
  context.globalAlpha *= highContrast ? 1 : ring.alpha;
  context.lineWidth = Math.max(1, ring.widthPx * scale);
  context.strokeStyle = "#ffffff";
  context.stroke();
  context.restore();
}

// ----------------------------------------------------------- Frozen marker

/**
 * The Frozen casing over a sprite drawn at `rect` (heightShare 0.45 for a
 * Frozen unit, 1 for a Shatter's freeze). Without a readable sprite, a
 * translucent ice block stands in over the same share of the rectangle.
 */
export function drawFrozenCasingV7(
  context: CanvasRenderingContext2D,
  art: IceFolkBoardArtV7 | undefined,
  sprite: CanvasImageSource,
  rect: Rect,
  heightShare: number = ICE_FOLK_FROZEN_MARKER_V7.frozen.heightShare,
  alpha = 1,
): void {
  const casing = art?.casing(sprite, heightShare) ?? null;
  const size = intrinsicSize(sprite);
  context.save();
  context.globalAlpha *= alpha;
  if (casing !== null && size !== null) {
    const sx = rect.width / size.width;
    const sy = rect.height / size.height;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      casing.image,
      rect.x - casing.margin * sx,
      rect.y - casing.margin * sy,
      rect.width + 2 * casing.margin * sx,
      rect.height + 2 * casing.margin * sy,
    );
  } else {
    const height = rect.height * heightShare * 0.85;
    const top = rect.y + rect.height - height;
    context.fillStyle = "rgba(127, 203, 255, 0.5)";
    context.strokeStyle = ICE_FOLK_PALETTE_V7.iceDark;
    context.lineWidth = Math.max(1, rect.width * 0.03);
    context.fillRect(
      rect.x + rect.width * 0.18,
      top,
      rect.width * 0.64,
      height,
    );
    context.strokeRect(
      rect.x + rect.width * 0.18,
      top,
      rect.width * 0.64,
      height,
    );
  }
  context.restore();
}

/** The rime: a thin pale line on a sprite's top edges (an icebound ship). */
export function drawRimeV7(
  context: CanvasRenderingContext2D,
  art: IceFolkBoardArtV7 | undefined,
  sprite: CanvasImageSource,
  rect: Rect,
): void {
  const rime = art?.caps(sprite, "RIME") ?? null;
  if (rime === null) return;
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(rime, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

/**
 * The status glyph's frames (world units from the cell centre): the slots
 * of the Plague and Bitten markers, and a third one under them. The
 * Frozen glyph and the Berserk glyph share them.
 */
export const STATUS_GLYPH_FRAME_V7 = {
  legacy: [
    { left: -45, top: -31, size: 21 },
    { left: -45, top: -9, size: 21 },
    { left: -45, top: 13, size: 21 },
  ],
  chibi: [
    { left: -52, top: -36, size: 26 },
    { left: -52, top: -8, size: 26 },
    { left: -52, top: 20, size: 26 },
  ],
} as const;

/** World units the 48 px status icon covers in CHIBI (16 CSS px at step 1). */
export const FROZEN_GLYPH_WORLD_SIZE_V7 = 25.6;

/** A code-drawn ice cube: the stand-in of `ICON:STATUS:FROZEN`. */
function iceCubePath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const half = size * 0.3;
  const lift = size * 0.14;
  context.beginPath();
  // Top face, then the two side faces below it.
  context.moveTo(cx, cy - half - lift);
  context.lineTo(cx + half, cy - half);
  context.lineTo(cx, cy - half + lift);
  context.lineTo(cx - half, cy - half);
  context.closePath();
  context.moveTo(cx - half, cy - half);
  context.lineTo(cx, cy - half + lift);
  context.lineTo(cx, cy + half + lift * 0.4);
  context.lineTo(cx - half, cy + half - lift * 0.6);
  context.closePath();
  context.moveTo(cx + half, cy - half);
  context.lineTo(cx, cy - half + lift);
  context.lineTo(cx, cy + half + lift * 0.4);
  context.lineTo(cx + half, cy + half - lift * 0.6);
  context.closePath();
}

/**
 * The Frozen glyph in its status slot: the `ICON:STATUS:FROZEN` ice cube on
 * a dark token (CHIBI), or a code-drawn cube (LEGACY, high contrast, the
 * raster still loading). With `turnsLeft` above 1 a small count sits on the
 * token's lower right: the unit stays Frozen through that many of its
 * owner's turns.
 */
export function drawFrozenGlyphV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly chibi: boolean;
    readonly slot: number;
    readonly turnsLeft: number;
    readonly raster?: CanvasImageSource | null;
    readonly highContrast?: boolean;
    readonly devicePixelRatio?: number;
  },
): void {
  const frames = options.chibi
    ? STATUS_GLYPH_FRAME_V7.chibi
    : STATUS_GLYPH_FRAME_V7.legacy;
  const frame = frames[Math.min(options.slot, frames.length - 1)] ?? frames[0];
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  const highContrast = options.highContrast ?? false;
  context.save();
  context.fillStyle = highContrast ? "#000000" : ICE_FOLK_PALETTE_V7.outline;
  context.strokeStyle = highContrast ? "#ffffff" : ICE_FOLK_PALETTE_V7.icePale;
  context.lineWidth = Math.max(1, 1.2 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2 + 0.6 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  const raster = highContrast ? null : (options.raster ?? null);
  if (raster !== null) {
    const ratio =
      options.devicePixelRatio !== undefined && options.devicePixelRatio > 0
        ? options.devicePixelRatio
        : 1;
    const drawn = options.chibi ? FROZEN_GLYPH_WORLD_SIZE_V7 * zoom : size;
    const snap = (value: number): number => Math.round(value * ratio) / ratio;
    context.imageSmoothingEnabled = true;
    context.drawImage(
      raster,
      snap(cx - drawn / 2),
      snap(cy - drawn / 2),
      drawn,
      drawn,
    );
  } else {
    context.lineJoin = "round";
    context.fillStyle = highContrast ? "#ffffff" : ICE_FOLK_PALETTE_V7.ice;
    context.strokeStyle = highContrast
      ? "#000000"
      : ICE_FOLK_PALETTE_V7.icePale;
    context.lineWidth = Math.max(1, size * 0.07);
    iceCubePath(context, cx, cy, size);
    context.fill();
    context.stroke();
  }
  if (options.turnsLeft > 1) {
    // The count: a small white disc with the number, on the lower right.
    const radius = Math.max(5, size * 0.3);
    const px = cx + size * 0.42;
    const py = cy + size * 0.38;
    context.fillStyle = "#ffffff";
    context.strokeStyle = highContrast
      ? "#000000"
      : ICE_FOLK_PALETTE_V7.iceDark;
    context.lineWidth = Math.max(1, zoom);
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = highContrast ? "#000000" : ICE_FOLK_PALETTE_V7.outline;
    context.font = `800 ${Math.max(8, radius * 1.5)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(options.turnsLeft), px, py + radius * 0.08);
  }
  context.restore();
}

/** Where a unit's HP bar was drawn, for its Shatter window. */
export interface HpBarGeometryV7 {
  /** The inner (filled) area of the bar, CSS px. */
  readonly inner: Rect;
  /** A vertical bar fills from its foot; a horizontal one from its left. */
  readonly vertical: boolean;
}

/**
 * The Shatter window on a Frozen unit's HP bar (section 13.1): its lowest
 * `threshold` HP in ice glow with a 1 px white divider at the threshold.
 * Where the bar is filled the window is solid; above the current HP it is
 * a faint ice tint, so the window shows at any HP.
 */
export function drawShatterWindowV7(
  context: CanvasRenderingContext2D,
  bar: HpBarGeometryV7,
  hp: number,
  maxHp: number,
  threshold: number,
  highContrast = false,
): void {
  if (maxHp <= 0 || threshold <= 0) return;
  const windowShare = Math.min(1, threshold / maxHp);
  const filledShare = Math.max(0, Math.min(1, hp / maxHp));
  const solidShare = Math.min(windowShare, filledShare);
  const { colour, edge } = ICE_FOLK_FROZEN_MARKER_V7.shatterWindow;
  const { inner } = bar;
  context.save();
  const part = (from: number, to: number): Rect =>
    bar.vertical
      ? {
          x: inner.x,
          y: inner.y + inner.height * (1 - to),
          width: inner.width,
          height: inner.height * (to - from),
        }
      : {
          x: inner.x + inner.width * from,
          y: inner.y,
          width: inner.width * (to - from),
          height: inner.height,
        };
  if (windowShare > solidShare) {
    const faint = part(solidShare, windowShare);
    context.fillStyle = highContrast
      ? "rgba(255, 255, 255, 0.35)"
      : "rgba(127, 203, 255, 0.35)";
    context.fillRect(faint.x, faint.y, faint.width, faint.height);
  }
  if (solidShare > 0) {
    const solid = part(0, solidShare);
    context.fillStyle = highContrast ? "#ffffff" : colour;
    context.fillRect(solid.x, solid.y, solid.width, solid.height);
  }
  if (windowShare < 1) {
    context.fillStyle = highContrast ? INK : edge;
    if (bar.vertical)
      context.fillRect(
        inner.x,
        Math.round(inner.y + inner.height * (1 - windowShare)) - 0.5,
        inner.width,
        1,
      );
    else
      context.fillRect(
        Math.round(inner.x + inner.width * windowShare) - 0.5,
        inner.y,
        1,
        inner.height,
      );
  }
  context.restore();
}

/**
 * The three white cracks that run over a Shatter's ice casing (ICE_FOLK.md
 * Shatter timeline, 140 to 220 ms): `progress` 0 to 1 grows them from the
 * centre of the casing.
 */
export function drawShatterCracksV7(
  context: CanvasRenderingContext2D,
  rect: Rect,
  progress: number,
): void {
  const grow = Math.max(0, Math.min(1, progress));
  if (grow <= 0) return;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height * 0.62;
  const reach = Math.min(rect.width, rect.height) * 0.42 * grow;
  context.save();
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(1, rect.width * 0.025);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const [angle, kink] of [
    [-2.2, 0.5],
    [-0.5, -0.45],
    [1.4, 0.4],
  ] as const) {
    const mx = cx + Math.cos(angle) * reach * 0.5;
    const my = cy + Math.sin(angle) * reach * 0.5;
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(mx, my);
    context.lineTo(
      mx + Math.cos(angle + kink) * reach * 0.5,
      my + Math.sin(angle + kink) * reach * 0.5,
    );
    context.stroke();
  }
  context.restore();
}

// ---------------------------------------------------------------- Stampede

/** The tusk cream of a Stampede preview, on the ink outline. */
export const STAMPEDE_PREVIEW_CREAM_V7 = "#f0dcae";

/**
 * Ice Folk Freeze (bead pulp_wars-w49.38): the arrows of a previewed
 * Stampede, over its tile fills. A broad cream arrow runs from the
 * Mammoth's tile to the tile it ends on; each shoved unit gets a short
 * cream arrow from its tile to its side tile; where the charge stops
 * before the end of its line, a bar crosses the line at the stop. Points
 * are tile centres in CSS px.
 */
export function drawStampedeArrowsV7(
  context: CanvasRenderingContext2D,
  zoom: number,
  arrows: {
    readonly from: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number } | null;
    readonly shoves: readonly {
      readonly from: { readonly x: number; readonly y: number };
      readonly to: { readonly x: number; readonly y: number };
    }[];
    /** The stop: the centre of the first tile it does not enter. */
    readonly stop: { readonly x: number; readonly y: number } | null;
    /** The last tile it stands on before the stop (or its own tile). */
    readonly stopFrom: { readonly x: number; readonly y: number } | null;
  },
  highContrast = false,
): void {
  const cream = highContrast ? "#ffffff" : STAMPEDE_PREVIEW_CREAM_V7;
  const ink = highContrast ? "#000000" : "rgba(23, 23, 34, 0.85)";
  const arrow = (
    from: { readonly x: number; readonly y: number },
    to: { readonly x: number; readonly y: number },
    width: number,
    startInset: number,
    endInset: number,
    head: number,
  ): void => {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length <= startInset + endInset) return;
    const ux = (to.x - from.x) / length;
    const uy = (to.y - from.y) / length;
    const sx = from.x + ux * startInset;
    const sy = from.y + uy * startInset;
    const tx = to.x - ux * endInset;
    const ty = to.y - uy * endInset;
    const bx = tx - ux * head;
    const by = ty - uy * head;
    const wing = head * 0.75;
    for (const [colour, extra] of [
      [ink, 3 * zoom],
      [cream, 0],
    ] as const) {
      context.strokeStyle = colour;
      context.fillStyle = colour;
      context.lineWidth = width + extra;
      context.beginPath();
      context.moveTo(sx, sy);
      context.lineTo(bx, by);
      context.stroke();
      context.beginPath();
      context.moveTo(tx + ux * extra * 0.6, ty + uy * extra * 0.6);
      context.lineTo(bx - uy * (wing + extra), by + ux * (wing + extra));
      context.lineTo(bx + uy * (wing + extra), by - ux * (wing + extra));
      context.closePath();
      context.fill();
    }
  };
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  if (arrows.end !== null)
    arrow(
      arrows.from,
      arrows.end,
      Math.max(3, 9 * zoom),
      34 * zoom,
      30 * zoom,
      Math.max(8, 24 * zoom),
    );
  for (const shove of arrows.shoves)
    arrow(
      shove.from,
      shove.to,
      Math.max(3, 7 * zoom),
      18 * zoom,
      22 * zoom,
      Math.max(8, 20 * zoom),
    );
  if (arrows.stop !== null && arrows.stopFrom !== null) {
    // A bar across the line, just inside the last tile it enters (clear
    // of the hit label at the top of the blocker's tile).
    const mx = arrows.stopFrom.x + (arrows.stop.x - arrows.stopFrom.x) * 0.36;
    const my = arrows.stopFrom.y + (arrows.stop.y - arrows.stopFrom.y) * 0.36;
    const length =
      Math.hypot(
        arrows.stop.x - arrows.stopFrom.x,
        arrows.stop.y - arrows.stopFrom.y,
      ) || 1;
    const ux = (arrows.stop.x - arrows.stopFrom.x) / length;
    const uy = (arrows.stop.y - arrows.stopFrom.y) / length;
    const half = 54 * zoom;
    for (const [colour, width] of [
      [ink, 16 * zoom],
      [highContrast ? "#ffffff" : "#ff9a7a", 10 * zoom],
    ] as const) {
      context.strokeStyle = colour;
      context.lineWidth = Math.max(2, width);
      context.beginPath();
      context.moveTo(mx - uy * half, my + ux * half);
      context.lineTo(mx + uy * half, my - ux * half);
      context.stroke();
    }
  }
  context.restore();
}

// ----------------------------------------------------------------- Glacier

/**
 * Ice Folk Freeze (bead pulp_wars-w49.38): a Move tile only Glacier's +1
 * Move across ice reaches: a faint ice tint over the tile and a small
 * "+1" token in its top-right corner (the outline is the Move mark's,
 * dotted in pale ice). `x`, `y` are the tile centre in CSS px.
 */
export function drawGlacierReachV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  bonus: number,
  highContrast = false,
): void {
  const half = 60 * zoom;
  context.save();
  if (!highContrast) {
    context.fillStyle = "rgba(214, 240, 255, 0.22)";
    context.fillRect(x - half, y - half, half * 2, half * 2);
  }
  const radius = Math.max(7, 15 * zoom);
  const cx = x + 40 * zoom;
  const cy = y - 40 * zoom;
  context.fillStyle = highContrast ? "#ffffff" : ICE_FOLK_PALETTE_V7.icePale;
  context.strokeStyle = highContrast ? "#000000" : ICE_FOLK_PALETTE_V7.iceDark;
  context.lineWidth = Math.max(1, 2 * zoom);
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : ICE_FOLK_PALETTE_V7.outline;
  context.font = `800 ${Math.max(8, radius * 1.05)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`+${bonus}`, cx, cy + radius * 0.06);
  context.restore();
}
