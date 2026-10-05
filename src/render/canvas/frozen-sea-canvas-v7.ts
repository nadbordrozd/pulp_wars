import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_NORTH_V7,
  SEA_ICE_EDGE_SOUTH_V7,
  SEA_ICE_EDGE_WEST_V7,
} from "../../assets/sea-ice-v7";
import type {
  IceboundMarkerV7,
  SeaIceCellV7,
} from "./frozen-sea-board-plan-v7";

/**
 * The frozen sea on the canvas (bead pulp_wars-5ti.7, second part;
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 14.1 and 14.3):
 *
 * - **An ice cell** over its water: the cut sheet of `seaIceTileV7` (the
 *   live and the Classic look), or a code-drawn floe in the same colours
 *   (LEGACY, a sheet still loading); then the melting cracks of its stage.
 * - **A slide's arrow** from the tile a unit steps from, across the ice, to
 *   the tile it stops on.
 * - **An icebound ship:** the pack ice at the foot of its hull (the
 *   `OVERLAY:ICEBOUND` raster, or a code-drawn jagged strip) and a small
 *   pill with the crush it takes next.
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
  slide: "#d6f0ff",
  slideCasing: "#10131c",
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
 * A slide's arrow through `points` (canvas px, the tile the unit steps
 * from first): a dark line with a pale ice core, so it reads on the ice
 * and on open water alike, and an arrowhead on the tile it stops on. `prominent` (the focused
 * destination) draws it at full weight.
 */
export function drawSlideArrowV7(
  context: CanvasRenderingContext2D,
  points: readonly { readonly x: number; readonly y: number }[],
  zoom: number,
  options: {
    readonly prominent?: boolean;
    readonly highContrast?: boolean;
  } = {},
): void {
  const first = points[0];
  const last = points.at(-1);
  const before = points.at(-2);
  if (
    first === undefined ||
    last === undefined ||
    before === undefined ||
    points.length < 2
  )
    return;
  const prominent = options.prominent === true;
  const width = (prominent ? 12 : 9) * zoom;
  const length = Math.hypot(last.x - before.x, last.y - before.y) || 1;
  const ux = (last.x - before.x) / length;
  const uy = (last.y - before.y) / length;
  // The line stops short of the last tile's centre, where the head begins.
  const tip = { x: last.x + ux * 10 * zoom, y: last.y + uy * 10 * zoom };
  // The line leaves the unit's own tile a little past its centre.
  const second = points[1] ?? last;
  const firstLength = Math.hypot(second.x - first.x, second.y - first.y) || 1;
  const sx = first.x + ((second.x - first.x) / firstLength) * 34 * zoom;
  const sy = first.y + ((second.y - first.y) / firstLength) * 34 * zoom;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  context.globalAlpha *= prominent ? 1 : 0.85;
  const trace = (): void => {
    context.beginPath();
    context.moveTo(sx, sy);
    for (const point of points.slice(1, -1)) context.lineTo(point.x, point.y);
    context.lineTo(tip.x, tip.y);
    // The arrowhead.
    const head = 24 * zoom;
    const spread = 15 * zoom;
    context.moveTo(tip.x, tip.y);
    context.lineTo(
      tip.x - ux * head - uy * spread,
      tip.y - uy * head + ux * spread,
    );
    context.moveTo(tip.x, tip.y);
    context.lineTo(
      tip.x - ux * head + uy * spread,
      tip.y - uy * head - ux * spread,
    );
  };
  trace();
  context.strokeStyle = SEA_ICE_COLOURS_V7.slideCasing;
  context.lineWidth = width;
  context.stroke();
  trace();
  context.strokeStyle =
    options.highContrast === true ? "#ffffff" : SEA_ICE_COLOURS_V7.slide;
  context.lineWidth = width * 0.5;
  context.stroke();
  context.restore();
}

/** The crush pill's frame: world units from the tile's centre. */
export const ICEBOUND_MARKER_FRAME_V7 = {
  /** The pack ice: the lower half of the cell. */
  ice: { left: -64, top: 0, width: 128, height: 64 },
  /** The crush pill, under the boardable badge's slot. */
  crush: { x: 44, y: 8, halfWidth: 19, halfHeight: 9 },
} as const;

/**
 * An icebound ship's markers at its tile centre (`x`, `y`): the pack ice
 * over the foot of its hull and the crush pill ("−3 HP", "Sinks").
 */
export function drawIceboundMarkerV7(
  context: CanvasRenderingContext2D,
  marker: IceboundMarkerV7,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly overlay?: CanvasImageSource | null;
    readonly smoothing?: boolean;
    readonly highContrast?: boolean;
  } = {},
): void {
  const frame = ICEBOUND_MARKER_FRAME_V7;
  const highContrast = options.highContrast ?? false;
  context.save();
  const overlay = options.overlay ?? null;
  if (overlay !== null) {
    context.imageSmoothingEnabled = options.smoothing ?? true;
    context.drawImage(
      overlay,
      x + frame.ice.left * zoom,
      y + frame.ice.top * zoom,
      frame.ice.width * zoom,
      frame.ice.height * zoom,
    );
  } else {
    // A jagged strip of pack ice round the hull's foot.
    const left = x - 50 * zoom;
    const right = x + 50 * zoom;
    const base = y + 30 * zoom;
    context.fillStyle = SEA_ICE_COLOURS_V7.shallow;
    context.strokeStyle = SEA_ICE_COLOURS_V7.crack;
    context.lineWidth = Math.max(1, 1.6 * zoom);
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(left, base);
    const teeth = 7;
    for (let tooth = 0; tooth <= teeth; tooth += 1) {
      const tx = left + ((right - left) * tooth) / teeth;
      context.lineTo(
        tx - ((right - left) / teeth) * 0.5,
        base - (tooth % 2 === 0 ? 20 : 12) * zoom,
      );
      context.lineTo(tx, base - 6 * zoom);
    }
    context.lineTo(right, base);
    context.closePath();
    context.fill();
    context.stroke();
  }
  // The crush pill.
  const pill = frame.crush;
  const cx = x + pill.x * zoom;
  const cy = y + pill.y * zoom;
  const halfWidth = pill.halfWidth * zoom;
  const halfHeight = pill.halfHeight * zoom;
  context.fillStyle = highContrast ? "#000000" : SEA_ICE_COLOURS_V7.crushToken;
  context.strokeStyle = highContrast ? "#ffffff" : SEA_ICE_COLOURS_V7.crushRim;
  context.lineWidth = Math.max(1, 1.4 * zoom);
  context.beginPath();
  context.moveTo(cx - halfWidth + halfHeight, cy - halfHeight);
  context.lineTo(cx + halfWidth - halfHeight, cy - halfHeight);
  context.arc(
    cx + halfWidth - halfHeight,
    cy,
    halfHeight,
    -Math.PI / 2,
    Math.PI / 2,
  );
  context.lineTo(cx - halfWidth + halfHeight, cy + halfHeight);
  context.arc(
    cx - halfWidth + halfHeight,
    cy,
    halfHeight,
    Math.PI / 2,
    -Math.PI / 2,
  );
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle =
    marker.lethal && !highContrast
      ? SEA_ICE_COLOURS_V7.crushLethal
      : SEA_ICE_COLOURS_V7.crushText;
  context.font = `800 ${Math.max(8, 11.5 * zoom)}px system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(marker.crush.replace(" HP", ""), cx, cy + 0.5 * zoom);
  context.restore();
}
