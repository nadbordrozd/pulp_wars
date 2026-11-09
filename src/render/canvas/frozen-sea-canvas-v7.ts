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
 *   (LEGACY, a sheet still loading); then the melting cracks of its stage.
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

/** Crack lines per stage, and their width in world units. */
export const SEA_ICE_CRACKS_V7 = {
  lines: [0, 1, 2, 3],
  width: [0, 1.6, 2.2, 3.2],
  /** Each crack has this many segments. */
  segments: [0, 3, 4, 5],
} as const;

/** A stable hash of two integers and a salt, in [0, 1). */
function hash(a: number, b: number, salt: number): number {
  let value =
    Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + salt, 0xc2b2ae35);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 0x1_0000_0000;
}

/**
 * The cracks of one ice cell at a melting stage, as polylines in the cell's
 * unit square (0 to 1). Deterministic per cell: a later stage keeps the
 * earlier stage's cracks and lengthens them, so the ice is seen to give way
 * turn by turn.
 */
export function seaIceCracksV7(
  at: { readonly x: number; readonly y: number },
  stage: 0 | 1 | 2 | 3,
): readonly (readonly (readonly [number, number])[])[] {
  const cracks: (readonly [number, number])[][] = [];
  for (let line = 0; line < SEA_ICE_CRACKS_V7.lines[stage]; line += 1) {
    const salt = 101 + line * 37;
    let x = 0.2 + hash(at.x, at.y, salt) * 0.6;
    let y = 0.18 + hash(at.y, at.x, salt + 1) * 0.3;
    let angle = Math.PI * (0.25 + hash(at.x, at.y, salt + 2) * 0.5);
    const points: (readonly [number, number])[] = [[x, y]];
    const segments = SEA_ICE_CRACKS_V7.segments[stage];
    for (let segment = 0; segment < segments; segment += 1) {
      const length = 0.1 + hash(at.x + segment, at.y, salt + 3) * 0.08;
      angle += (hash(at.x, at.y + segment, salt + 4) - 0.5) * 1.5;
      x = Math.max(0.08, Math.min(0.92, x + Math.cos(angle) * length));
      y = Math.max(0.08, Math.min(0.92, y + Math.sin(angle) * length));
      points.push([x, y]);
    }
    cracks.push(points);
  }
  return cracks;
}

/**
 * One ice cell over its water. `tile` is the cut sheet (null draws the
 * code-drawn floe); `cell` is the cell's square in CSS px.
 */
export function drawSeaIceCellV7(
  context: CanvasRenderingContext2D,
  cell: Rect,
  at: { readonly x: number; readonly y: number },
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
    if (ice.permanent) {
      // Snow dusting: a few pale drifts.
      context.fillStyle = SEA_ICE_COLOURS_V7.snow;
      for (let drift = 0; drift < 3; drift += 1) {
        const cx = cell.x + (0.25 + hash(at.x, at.y, drift) * 0.5) * cell.width;
        const cy =
          cell.y + (0.25 + hash(at.y, at.x, drift + 9) * 0.5) * cell.height;
        context.beginPath();
        context.ellipse(cx, cy, 9 * zoom, 3.5 * zoom, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  if (ice.stage > 0) {
    const width = SEA_ICE_CRACKS_V7.width[ice.stage] * zoom;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.setLineDash([]);
    for (const [colour, scale, offset] of [
      [SEA_ICE_COLOURS_V7.crackLight, 1, 1.2 * zoom],
      [
        options.highContrast === true ? "#000000" : SEA_ICE_COLOURS_V7.crack,
        1,
        0,
      ],
    ] as const) {
      context.strokeStyle = colour;
      context.lineWidth = Math.max(1, width * scale);
      for (const crack of seaIceCracksV7(at, ice.stage)) {
        context.beginPath();
        crack.forEach(([px, py], index) => {
          const x = cell.x + px * cell.width + offset;
          const y = cell.y + py * cell.height + offset;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      }
    }
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
