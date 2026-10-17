/**
 * The tile action badges (bead pulp_wars-2yc.60; docs/ui/BOARD_TARGETING.md
 * section 1.1): a small round icon on each tile where the selected unit has
 * an action other than a lone Move or Attack. Each badge is a dark disc
 * rimmed in the colour of the mark its target wears (red for a harm, lavender
 * for a help, cream for a place, teal for a Move) with the action's glyph
 * (the dock's own icon) in cream, or the action's registered icon where it
 * has one (the Cult's join icon), in the order the tile's chooser lists
 * them. On a tile with a unit or a city they stand in a column down the
 * tile's right edge from its upper right corner, so what stands there stays
 * visible; on an empty tile they sit in its middle, so a badge is never
 * read as its neighbour's. A tile with more actions than fit shows the
 * first ones and "+N".
 *
 * They do not move or pulse: the reduced-motion still is the badge itself.
 * No badge names a tile or a coordinate.
 */
import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import { uiIconShapesV7 } from "../dom/ui-icons-v7";
import { TILE_HEIGHT, TILE_WIDTH, type CameraState } from "./geometry";
import {
  TARGET_HIGHLIGHT_CASING_V7,
  TARGET_HIGHLIGHTS_V7,
} from "./target-highlight-v7";
import type { TileActionPlanV7, TileActionV7 } from "./tile-actions-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/** The badge's measures (CSS px are the canvas's own, before the DPR). */
export const TILE_ACTION_BADGE_V7 = {
  /** Radius as a share of the tile's width, and its least size on screen. */
  radius: 0.15,
  minRadiusCssPx: 11,
  /** With more than TILE_ACTION_FULL_SIZE_TILES_V7 tiles badged. */
  compactRadius: 0.115,
  compactMinRadiusCssPx: 9,
  /** Badges on one tile before the last becomes "+N". */
  maxPerTile: 3,
  /** The disc and its ink. */
  fill: "#171722",
  ink: "#fff8df",
  /** The gap between badges, in radii. */
  gap: 0.2,
  /** How far inside the tile's edges a badge's centre is, in radii. */
  edgeInset: 1.05,
  /** The glyph's width in radii, and its strokes' weight over the SVG's. */
  glyph: 1.4,
  glyphWeight: 1.35,
  /** A registered icon's square across the disc, in radii. */
  raster: 1.75,
} as const;

/** One badge as drawn: its centre, radius, and what it shows. */
export interface TileActionBadgeV7 {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** The action, or null for the "+N" of the actions that do not fit. */
  readonly action: TileActionV7 | null;
  readonly more: number;
}

/**
 * Where each badge of a plan is drawn under a camera: on a tile a unit or
 * a city stands on, a column down the tile's right edge from its upper
 * right corner, inside the tile (rim included); on an empty
 * tile, a row across its middle. Pure, for the drawing and its tests.
 */
export function tileActionBadgeLayoutV7(
  plan: TileActionPlanV7,
  camera: CameraState,
): readonly TileActionBadgeV7[] {
  const size = TILE_WIDTH * camera.zoom;
  const spec = TILE_ACTION_BADGE_V7;
  const radius = plan.compact
    ? Math.max(spec.compactMinRadiusCssPx, spec.compactRadius * size)
    : Math.max(spec.minRadiusCssPx, spec.radius * size);
  const step = radius * (2 + spec.gap);
  const badges: TileActionBadgeV7[] = [];
  for (const tile of plan.tiles) {
    const centreX = camera.offsetX + tile.at.x * size;
    const centreY = camera.offsetY + tile.at.y * TILE_HEIGHT * camera.zoom;
    const overflow = tile.actions.length > spec.maxPerTile;
    const shown: readonly (TileActionV7 | null)[] = overflow
      ? [...tile.actions.slice(0, spec.maxPerTile - 1), null]
      : tile.actions;
    // An occupied tile: a column down its right edge. An empty one: a row
    // across its middle.
    const place = (index: number): { x: number; y: number } =>
      tile.occupied
        ? {
            x: centreX + size / 2 - radius * spec.edgeInset,
            y: centreY - size / 2 + radius * spec.edgeInset + index * step,
          }
        : {
            x: centreX + (index - (shown.length - 1) / 2) * step,
            y: centreY,
          };
    shown.forEach((action, index) =>
      badges.push({
        ...place(index),
        radius,
        action,
        more: action === null ? tile.actions.length - index : 0,
      }),
    );
  }
  return badges;
}

/**
 * Draws the badges of a plan. `context` must draw in CSS px (the board's
 * device-pixel transform). High contrast draws a thicker rim.
 */
export function drawTileActionBadgesV7(
  context: CanvasRenderingContext2D,
  plan: TileActionPlanV7,
  camera: CameraState,
  options: {
    readonly highContrast?: boolean;
    /**
     * The loaded raster of an action's `raster` subject, or null while it
     * loads (and in a look without it): the badge then draws its glyph.
     */
    readonly raster?: (subject: ArtSubjectV7) => CanvasImageSource | null;
  } = {},
): void {
  const spec = TILE_ACTION_BADGE_V7;
  for (const badge of tileActionBadgeLayoutV7(plan, camera)) {
    const { x, y, radius } = badge;
    const rim =
      badge.action === null
        ? spec.ink
        : TARGET_HIGHLIGHTS_V7[badge.action.style].stroke;
    context.save();
    context.setLineDash([]);
    // The dark casing, then the disc and its coloured rim.
    context.beginPath();
    context.arc(x, y, radius + 1.5, 0, Math.PI * 2);
    context.fillStyle = TARGET_HIGHLIGHT_CASING_V7;
    context.fill();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = spec.fill;
    context.fill();
    context.lineWidth = radius * (options.highContrast === true ? 0.3 : 0.2);
    context.strokeStyle = rim;
    context.stroke();
    if (badge.action === null) {
      context.fillStyle = spec.ink;
      context.font = `800 ${Math.round(radius * 0.95)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(`+${badge.more}`, x, y + radius * 0.05);
    } else {
      const subject = badge.action.raster;
      const image =
        subject === undefined ? null : (options.raster?.(subject) ?? null);
      // A registered icon fills the disc (the Cult's join icon, bead
      // pulp_wars-mch9.43); pixel art keeps its hard edges.
      if (image !== null) {
        const size = radius * spec.raster;
        context.imageSmoothingEnabled = false;
        context.drawImage(image, x - size / 2, y - size / 2, size, size);
      } else drawGlyph(context, badge.action, x, y, radius * spec.glyph);
    }
    context.restore();
  }
}

/** The action's glyph, `size` CSS px across, centred on (x, y). */
function drawGlyph(
  context: CanvasRenderingContext2D,
  action: TileActionV7,
  x: number,
  y: number,
  size: number,
): void {
  // A canvas without Path2D (a test double) draws the disc alone.
  if (typeof Path2D !== "function") return;
  const scale = size / 24;
  context.translate(x - size / 2, y - size / 2);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const part of uiIconShapesV7(action.icon)) {
    const path = new Path2D(part.d);
    const colour = (value: string): string =>
      value === "currentColor" ? TILE_ACTION_BADGE_V7.ink : value;
    if (part.fill !== "none") {
      context.fillStyle = colour(part.fill);
      context.fill(path, "evenodd");
    }
    if (part.stroke !== "none" && part.width > 0) {
      context.strokeStyle = colour(part.stroke);
      context.lineWidth = part.width * TILE_ACTION_BADGE_V7.glyphWeight;
      context.stroke(path);
    }
  }
}
