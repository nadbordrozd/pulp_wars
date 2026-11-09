import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_NORTH_V7,
  SEA_ICE_EDGE_SOUTH_V7,
  SEA_ICE_EDGE_WEST_V7,
} from "../../assets/sea-ice-v7";
import type { SeaIceCellV7 } from "./frozen-sea-board-plan-v7";

/**
 * The frozen sea on the canvas (bead pulp_wars-5ti.7, second part;
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 14.1 and 14.3):
 *
 * - **An ice cell** over its water: the cut sheet of `seaIceTileV7` (the
 *   live and the Classic look), or a code-drawn floe in the same colours
 *   (LEGACY, a sheet still loading). (Thick ice's snow dusting and the
 *   cracks of cracked ice went with Glacier, `pulp_wars-tzk6`, 7r137.)
 *
 * (A slide's arrow across the ice went with `pulp_wars-ecnj`, 7r135: a Move
 * on ice is drawn as any Move. An icebound ship's pack ice and crush pill
 * went with Icebound, `pulp_wars-s55m.1`.)
 *
 * The marks never move, so the reduced-motion still is the mark itself.
 */

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const SEA_ICE_COLOURS_V7 = {
  /** The mean colours of the two sheets (docs/art/NAVAL_FACTIONS.md). */
  shallow: "#d3eff3",
  deep: "#a9c6e6",
  rim: "#f6fdff",
  snow: "#ffffff",
  crack: "#2f5d7e",
  crackLight: "#f6fdff",
  crushToken: "#10243a",
  crushRim: "#9fd8f2",
  crushText: "#ffffff",
  crushLethal: "#ff8a80",
} as const;

/**
 * One ice cell over its water. `tile` is the cut sheet (null draws the
 * code-drawn floe); `cell` is the cell's square in CSS px.
 */
export function drawSeaIceCellV7(
  context: CanvasRenderingContext2D,
  cell: Rect,
  _at: { readonly x: number; readonly y: number },
  ice: SeaIceCellV7,
  tile: CanvasImageSource | null,
  options: {
    readonly sceneAlpha?: number;
    readonly zoom: number;
    readonly smoothing?: boolean;
    readonly highContrast?: boolean;
  },
): void {
  const zoom = options.zoom;
  context.save();
  context.globalAlpha = options.sceneAlpha ?? 1;
  if (tile !== null) {
    context.imageSmoothingEnabled = options.smoothing ?? true;
    context.drawImage(tile, cell.x, cell.y, cell.width, cell.height);
  } else {
    // The code-drawn floe: the sheet's colour, held back from each side
    // that meets open water, with the pale rim of the cut sheet.
    const inset = cell.width * 0.05;
    const left =
      cell.x + ((ice.openWater & SEA_ICE_EDGE_WEST_V7) !== 0 ? inset : 0);
    const top =
      cell.y + ((ice.openWater & SEA_ICE_EDGE_NORTH_V7) !== 0 ? inset : 0);
    const right =
      cell.x +
      cell.width -
      ((ice.openWater & SEA_ICE_EDGE_EAST_V7) !== 0 ? inset : 0);
    const bottom =
      cell.y +
      cell.height -
      ((ice.openWater & SEA_ICE_EDGE_SOUTH_V7) !== 0 ? inset : 0);
    context.fillStyle =
      ice.depth === "SHALLOW"
        ? SEA_ICE_COLOURS_V7.shallow
        : SEA_ICE_COLOURS_V7.deep;
    context.fillRect(left, top, right - left, bottom - top);
    context.strokeStyle = SEA_ICE_COLOURS_V7.rim;
    context.lineWidth = Math.max(1, 2.4 * zoom);
    context.beginPath();
    if ((ice.openWater & SEA_ICE_EDGE_NORTH_V7) !== 0) {
      context.moveTo(left, top);
      context.lineTo(right, top);
    }
    if ((ice.openWater & SEA_ICE_EDGE_EAST_V7) !== 0) {
      context.moveTo(right, top);
      context.lineTo(right, bottom);
    }
    if ((ice.openWater & SEA_ICE_EDGE_SOUTH_V7) !== 0) {
      context.moveTo(right, bottom);
      context.lineTo(left, bottom);
    }
    if ((ice.openWater & SEA_ICE_EDGE_WEST_V7) !== 0) {
      context.moveTo(left, bottom);
      context.lineTo(left, top);
    }
    context.stroke();
  }
  context.restore();
}

/**
 * The packed-snow pad under a building on ice (the frozen sea redesign,
 * RULESET_7_ICE_REDESIGN.md section 4.1, bead pulp_wars-5ti.27): a flat
 * ellipse of snow with a blue-grey rim, so the building sits on the sheet
 * instead of floating over it. In world units of the 128-unit tile.
 */
export const ICE_BUILDING_PAD_V7 = {
  fill: "#eef4f7",
  rim: "#b9c9d3",
  /** Its shadow side (the light comes from the south-west). */
  shade: "#d5e1e8",
  radiusX: 52,
  radiusY: 26,
  /** Below the cell's centre, where a building's foot stands. */
  offsetY: 22,
  rimWidth: 3,
} as const;

/** The packed-snow pad of a building on ice, centred on the cell (x, y). */
export function drawIceBuildingPadV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: { readonly sceneAlpha?: number; readonly highContrast?: boolean },
): void {
  const pad = ICE_BUILDING_PAD_V7;
  const cx = x;
  const cy = y + pad.offsetY * zoom;
  const rx = pad.radiusX * zoom;
  const ry = pad.radiusY * zoom;
  context.save();
  context.globalAlpha = options.sceneAlpha ?? 1;
  context.setLineDash([]);
  context.fillStyle = pad.fill;
  context.beginPath();
  context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  context.fill();
  // The side away from the light (north-east) a shade darker.
  context.fillStyle = pad.shade;
  context.beginPath();
  context.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.25, Math.PI * 1.95);
  context.ellipse(
    cx + rx * 0.12,
    cy - ry * 0.12,
    rx * 0.82,
    ry * 0.72,
    0,
    Math.PI * 1.95,
    Math.PI * 1.25,
    true,
  );
  context.closePath();
  context.fill();
  context.strokeStyle = options.highContrast === true ? "#10131c" : pad.rim;
  context.lineWidth = Math.max(1, pad.rimWidth * zoom);
  context.beginPath();
  context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
