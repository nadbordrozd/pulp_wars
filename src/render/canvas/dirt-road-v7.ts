import type { CoordV7 } from "../../engine/index";
import { forestHashV7 } from "./chibi-forest-packing-v7";
import { TILE_WIDTH } from "./geometry";

/**
 * Dirt-path Roads of the live look (bead pulp_wars-g6b5). The user,
 * 2026-10-09: roads "more brown dirt-coloured, and ever so slightly
 * irregular".
 *
 * A Road is drawn as one path per link between two road cells (cell centre
 * to cell centre, orthogonal or diagonal). Each link's shape is a pure
 * function of its two cells, taken in a fixed order, so the two cells it
 * crosses, and the corner joins of a diagonal link, draw the very same path,
 * each clipped to its own square. That is what keeps a path continuous
 * across tile edges, junctions, diagonals and city joins, and identical on
 * every redraw, zoom level and save/load: nothing is random per frame.
 *
 * - **Wobble:** the centreline leaves a cell centre straight towards the
 *   next centre and bends sideways by at most `wobble` world units in
 *   between (`dirtRoadPointV7`). The bend and its slope are zero at both
 *   centres, so a straight run has no kink where links meet.
 * - **Width:** casing and fill swell and narrow by at most `widthWobble`
 *   world units, independently, and are exactly their base width at both
 *   centres, where the links of a junction meet in a round hub.
 * - **Flecks:** a few darker rut dashes and pale pebbles inside the fill,
 *   kept well inside one cell so no fleck is cut by a cell edge.
 *
 * The LEGACY and BOLD road looks keep their straight strokes.
 */
export const DIRT_ROAD_V7 = {
  /** The dark trodden edge of the path. */
  casing: "#68432a",
  /** The path's dirt. */
  fill: "#ae7c4b",
  /** Wheel-rut dashes, a shade darker than the dirt. */
  rut: "#8c5e36",
  /** Small pale pebbles. */
  pebble: "#cfa877",
  /** Base widths in world units (a cell is 128). */
  casingWidth: 13,
  fillWidth: 9,
  /** The largest sideways bend of a link's centreline, world units. */
  wobble: 4,
  /** The largest change of either width along a link, world units. */
  widthWobble: 1.5,
} as const;

/** Points along each side of a link; enough for a smooth curve at zoom 1.75. */
const SAMPLES = 16;

export interface DirtRoadFleckV7 {
  readonly kind: "RUT" | "PEBBLE";
  /** Position along the link (0 at `from`, 1 at `to`). */
  readonly t: number;
  /** Sideways offset from the centreline, world units. */
  readonly offset: number;
  /** A rut's length, or a pebble's diameter, world units. */
  readonly size: number;
}

/**
 * The fixed shape of the link between two road cells. `from` and `to` are
 * the cells in canonical order (north first, then west), whichever cell
 * asks; all the coefficients come from a hash of that pair.
 */
export interface DirtRoadLinkV7 {
  readonly from: CoordV7;
  readonly to: CoordV7;
  /** Sideways bend coefficients (world units). */
  readonly bend: readonly [number, number];
  /** Width coefficients of the casing and the fill (world units). */
  readonly casingSwell: readonly [number, number];
  readonly fillSwell: readonly [number, number];
  readonly flecks: readonly DirtRoadFleckV7[];
}

export interface WorldPointV7 {
  readonly x: number;
  readonly y: number;
}

function canonical(a: CoordV7, b: CoordV7): readonly [CoordV7, CoordV7] {
  return a.y < b.y || (a.y === b.y && a.x <= b.x) ? [a, b] : [b, a];
}

/** The link between `a` and `b`, the same object whichever order. */
export function dirtRoadLinkV7(a: CoordV7, b: CoordV7): DirtRoadLinkV7 {
  const [from, to] = canonical(a, b);
  // A uniform number in [0, 1) per salt, from the ordered pair.
  const unit = (salt: number): number =>
    forestHashV7(from.x, from.y, to.x * 4099 + salt, to.y * 8191 - salt) /
    0x100000000;
  // A signed number in (-1, 1).
  const signed = (salt: number): number => unit(salt) * 2 - 1;
  const { wobble, widthWobble } = DIRT_ROAD_V7;
  const flecks: DirtRoadFleckV7[] = [];
  // Up to one fleck near each end, between 20 and 32 percent of the way
  // in: at least 25 world units from the centre and 15 from the cell's
  // edge, so a cell edge never cuts one.
  for (const [end, salt] of [
    [0, 20],
    [1, 30],
  ] as const) {
    const roll = unit(salt);
    if (roll < 0.25) continue;
    const along = 0.2 + unit(salt + 1) * 0.12;
    flecks.push({
      kind: roll < 0.7 ? "RUT" : "PEBBLE",
      t: end === 0 ? along : 1 - along,
      offset: signed(salt + 2) * 1.8,
      size: roll < 0.7 ? 6 + unit(salt + 3) * 4 : 2.2 + unit(salt + 3) * 0.8,
    });
  }
  return {
    from,
    to,
    // |p s^2 + q s^2 c| <= 0.65 W + 0.9 W * 0.385 < W.
    bend: [signed(1) * wobble * 0.65, signed(2) * wobble * 0.9],
    casingSwell: [signed(3) * widthWobble * 0.6, signed(4) * widthWobble * 0.6],
    fillSwell: [signed(5) * widthWobble * 0.6, signed(6) * widthWobble * 0.6],
    flecks,
  };
}

/** The unit normal of the straight line `from`-`to` (to its left). */
function normalOf(link: DirtRoadLinkV7): WorldPointV7 {
  const dx = link.to.x - link.from.x;
  const dy = link.to.y - link.from.y;
  const length = Math.hypot(dx, dy);
  return { x: -dy / length, y: dx / length };
}

/** The sideways bend at `t`: zero, with zero slope, at both ends. */
export function dirtRoadBendV7(link: DirtRoadLinkV7, t: number): number {
  const s = Math.sin(Math.PI * t);
  return s * s * (link.bend[0] + link.bend[1] * Math.cos(Math.PI * t));
}

/** The width of the casing or the fill at `t`: the base width at both ends. */
export function dirtRoadWidthV7(
  link: DirtRoadLinkV7,
  layer: "CASING" | "FILL",
  t: number,
): number {
  const [p, q] = layer === "CASING" ? link.casingSwell : link.fillSwell;
  const s = Math.sin(Math.PI * t);
  const base =
    layer === "CASING" ? DIRT_ROAD_V7.casingWidth : DIRT_ROAD_V7.fillWidth;
  return base + s * s * (p + q * Math.sin(2 * Math.PI * t));
}

/** The centreline point at `t`, plus `side` world units to the left. */
export function dirtRoadPointV7(
  link: DirtRoadLinkV7,
  t: number,
  side = 0,
): WorldPointV7 {
  const normal = normalOf(link);
  const offset = dirtRoadBendV7(link, t) + side;
  return {
    x:
      (link.from.x + (link.to.x - link.from.x) * t) * TILE_WIDTH +
      normal.x * offset,
    y:
      (link.from.y + (link.to.y - link.from.y) * t) * TILE_WIDTH +
      normal.y * offset,
  };
}

/**
 * The closed outline of one layer of a link, in world units: the left side
 * from `from` to `to`, a round cap round `to`, the right side back and a
 * round cap round `from`.
 */
export function dirtRoadOutlineV7(
  link: DirtRoadLinkV7,
  layer: "CASING" | "FILL",
): readonly WorldPointV7[] {
  const left: WorldPointV7[] = [];
  const right: WorldPointV7[] = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const t = index / SAMPLES;
    const half = dirtRoadWidthV7(link, layer, t) / 2;
    left.push(dirtRoadPointV7(link, t, half));
    right.push(dirtRoadPointV7(link, t, -half));
  }
  const radius =
    (layer === "CASING" ? DIRT_ROAD_V7.casingWidth : DIRT_ROAD_V7.fillWidth) /
    2;
  // Left is +normal. A cap turns from one side round the end to the other.
  const normal = normalOf(link);
  const normalAngle = Math.atan2(normal.y, normal.x);
  const cap = (centre: CoordV7, start: number): WorldPointV7[] => {
    const points: WorldPointV7[] = [];
    for (let step = 1; step < 8; step += 1) {
      const angle = start - (Math.PI * step) / 8;
      points.push({
        x: centre.x * TILE_WIDTH + Math.cos(angle) * radius,
        y: centre.y * TILE_WIDTH + Math.sin(angle) * radius,
      });
    }
    return points;
  };
  return [
    ...left,
    ...cap(link.to, normalAngle),
    ...right.reverse(),
    ...cap(link.from, normalAngle - Math.PI),
  ];
}

/** What one Road or corner-join entry asks to draw. */
export interface DirtRoadCellV7 {
  readonly at: CoordV7;
  /** Road cells linked to `at` (a Road entry). */
  readonly neighbours: readonly CoordV7[];
  /** Diagonal links passing the corner of `at` (a corner-join entry). */
  readonly joins: readonly (readonly [CoordV7, CoordV7])[];
  /** A Road with no linked neighbour: a short patch of dirt. */
  readonly isolated: boolean;
}

/** The world length of a link. */
function lengthOf(link: DirtRoadLinkV7): number {
  return (
    Math.hypot(link.to.x - link.from.x, link.to.y - link.from.y) * TILE_WIDTH
  );
}

/**
 * Draws one layer of a cell's Road links, clipped to the cell: CASING in
 * the casing pass (every casing on the board before any fill), FILL with
 * its flecks in the fill pass. `x`, `y` is the screen centre of `at`.
 */
export function drawDirtRoadV7(
  context: CanvasRenderingContext2D,
  cell: DirtRoadCellV7,
  x: number,
  y: number,
  zoom: number,
  layer: "CASING" | "FILL",
): void {
  const half = (TILE_WIDTH * zoom) / 2;
  const screenX = (world: number): number =>
    x + (world - cell.at.x * TILE_WIDTH) * zoom;
  const screenY = (world: number): number =>
    y + (world - cell.at.y * TILE_WIDTH) * zoom;
  const links = [
    ...cell.neighbours.map((neighbour) => dirtRoadLinkV7(cell.at, neighbour)),
    ...cell.joins.map(([from, to]) => dirtRoadLinkV7(from, to)),
  ];
  context.save();
  context.beginPath();
  context.rect(x - half, y - half, half * 2, half * 2);
  context.clip();
  context.fillStyle =
    layer === "CASING" ? DIRT_ROAD_V7.casing : DIRT_ROAD_V7.fill;
  for (const link of links) {
    context.beginPath();
    for (const [index, point] of dirtRoadOutlineV7(link, layer).entries())
      if (index === 0) context.moveTo(screenX(point.x), screenY(point.y));
      else context.lineTo(screenX(point.x), screenY(point.y));
    context.closePath();
    context.fill();
  }
  if (cell.isolated) {
    context.strokeStyle = context.fillStyle;
    context.lineCap = "round";
    context.lineWidth =
      (layer === "CASING" ? DIRT_ROAD_V7.casingWidth : DIRT_ROAD_V7.fillWidth) *
      zoom;
    context.beginPath();
    context.moveTo(x - 4 * zoom, y);
    context.lineTo(x + 4 * zoom, y);
    context.stroke();
  }
  if (layer === "FILL")
    for (const link of links)
      for (const fleck of link.flecks) {
        context.beginPath();
        if (fleck.kind === "PEBBLE") {
          const centre = dirtRoadPointV7(link, fleck.t, fleck.offset);
          context.fillStyle = DIRT_ROAD_V7.pebble;
          context.arc(
            screenX(centre.x),
            screenY(centre.y),
            (fleck.size / 2) * zoom,
            0,
            Math.PI * 2,
          );
          context.fill();
        } else {
          const reach = fleck.size / 2 / lengthOf(link);
          const start = dirtRoadPointV7(link, fleck.t - reach, fleck.offset);
          const end = dirtRoadPointV7(link, fleck.t + reach, fleck.offset);
          context.strokeStyle = DIRT_ROAD_V7.rut;
          context.lineCap = "round";
          context.lineWidth = 1.6 * zoom;
          context.moveTo(screenX(start.x), screenY(start.y));
          context.lineTo(screenX(end.x), screenY(end.y));
          context.stroke();
        }
      }
  context.restore();
}
