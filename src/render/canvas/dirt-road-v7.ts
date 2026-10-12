import type { CoordV7 } from "../../engine/index";
import { CHIBI_TILE_CSS_PX } from "../../assets/chibi-art-v7";
import { forestHashV7 } from "./chibi-forest-packing-v7";
import { TILE_WIDTH } from "./geometry";

/**
 * Dirt-track Roads of the live look (beads pulp_wars-g6b5 and
 * pulp_wars-2yc.43). The designer, 2026-10-10: "the roads should have more
 * of a uneven dirt texture and the edges of the road should be rough as
 * well, now they're straight lines."
 *
 * A Road cell is painted as pixel art on the terrain's own grid: one cell
 * is `DIRT_ROAD_GRID_V7` (80) art pixels a side, like a ground tile. Every
 * pixel is decided by a pure function of its place in the world and of the
 * links that cross its cell (`dirtRoadPixelsV7`):
 *
 * - **Links:** one path per pair of linked road cells, cell centre to cell
 *   centre, orthogonal or diagonal, with a slight sideways bend that is a
 *   pure function of the two cells (`dirtRoadLinkV7`). Both cells of a link
 *   and the corner cells of a diagonal use the same curve.
 * - **Rough edge:** the track's half-width at a pixel is a base width plus
 *   a noise read at that pixel's place in the world, so the outline has
 *   bites and bulges a few pixels long. The dark edge line is one pixel,
 *   two tones, with gaps; stray crumbs of dirt lie just outside it.
 * - **Uneven fill:** patches of lighter and darker earth, a shaded rim
 *   under the south-west bank and a lit one under the north-east bank (the
 *   light comes from the south-west), dashed wheel ruts along each link,
 *   and pebbles with a small shadow.
 *
 * Because the noise belongs to the world and not to a cell, a path meets
 * itself exactly across a cell edge, and a link looks the same whatever
 * other links its cells have: adding a neighbour only adds dirt. Nothing
 * depends on the frame, the camera or the zoom.
 *
 * The pixels of a cell are computed once and kept as two small sprites
 * (the dark underlay and the dirt), so a frame costs two image draws for
 * each road cell (`drawDirtRoadV7`).
 *
 * The LEGACY and BOLD road looks keep their straight strokes.
 */
export const DIRT_ROAD_V7 = {
  /** The dark trodden edge of the track. */
  casing: "#573620",
  /** The lighter of the two edge tones. */
  casingSoft: "#74492b",
  /** The track's dirt. */
  fill: "#9c6a3b",
  /** Patches of darker and lighter earth. */
  fillDark: "#875931",
  fillLight: "#b37f49",
  /** Wheel ruts and pebble shadows, darker than any dirt. */
  rut: "#6b4425",
  /** Small pale pebbles. */
  pebble: "#d8bb8b",
  /** Stray crumbs of dirt outside the edge. */
  crumb: "#7d5433",
  /** The dirt's half-width, in art pixels, before the edge noise. */
  halfWidth: 4.5,
  /** The most the edge noise adds to or takes from the half-width. */
  roughness: 1.9,
  /** The largest sideways bend of a link's centreline, world units. */
  wobble: 4,
} as const;

/**
 * The wooden link from a shore to a dock (bead pulp_wars-2yc.47). The user,
 * 2026-10-12: a Road drawn from a city onto its Port "looks weird though
 * because the road appears to go over water. let's find a more subtle cue
 * that the things are connected."
 *
 * The dirt of a link between a land cell (a city centre or a Road) and a
 * dock (a Port or a Shipyard) is painted only on the land cell, and ends in
 * a round cap short of the shore. From there a narrow plank gangway on
 * posts follows the same curve over the beach and the water and stops
 * short of the dock cell's centre, under the dock's sprite.
 */
export const DOCK_LINK_V7 = {
  /** The gangway's side rails, plank gaps and post shadows. */
  edge: "#4d2f1c",
  /** The dark line between two planks. */
  gap: "#7a5231",
  /** The planks, in two tones of weathered wood. */
  plank: "#b98a55",
  plankLight: "#d4a973",
  /** The posts the gangway stands on, and their lit south-west face. */
  post: "#5e3b23",
  postLit: "#93653c",
  /**
   * The gangway's shadow on the water, the sand or the ice, to its
   * north-east (the light comes from the south-west).
   */
  shadow: "rgba(16, 44, 62, 0.3)",
  /** The planks' half-width, in art pixels; a rail of one pixel beside. */
  halfWidth: 2.5,
  /** A plank and its gap are this many art pixels along the gangway. */
  plankPitch: 3,
  /** A pair of posts stands every this many art pixels. */
  postPitch: 9,
  /**
   * The dirt's round cap is centred this far short of the shore, so the
   * whole cap and its edge line lie on the land cell: [orthogonal,
   * diagonal] links, in art pixels.
   */
  dirtShort: [8, 11],
  /** The gangway starts this far short of the shore, on the land. */
  lead: [10, 14],
  /** The gangway stops this far from the dock cell's centre. */
  dockShort: 4,
} as const;

/** Art pixels along one side of a cell: the ground tiles' own size. */
export const DIRT_ROAD_GRID_V7 = CHIBI_TILE_CSS_PX;
/** World units in one art pixel. */
const UNIT = TILE_WIDTH / DIRT_ROAD_GRID_V7;

/** What a pixel of a Road cell shows. `CLEAR` is the ground. */
export const DIRT_ROAD_PIXEL_V7 = {
  CLEAR: 0,
  EDGE: 1,
  EDGE_SOFT: 2,
  CRUMB: 3,
  DIRT: 4,
  DIRT_DARK: 5,
  DIRT_LIGHT: 6,
  RUT: 7,
  PEBBLE: 8,
  /** The gangway of a dock link (`DOCK_LINK_V7`): its shadow, then wood. */
  WOOD_SHADOW: 9,
  WOOD_EDGE: 10,
  WOOD_GAP: 11,
  PLANK: 12,
  PLANK_LIGHT: 13,
  POST: 14,
  POST_LIT: 15,
} as const;

const PIXEL_COLOURS: readonly string[] = [
  "",
  DIRT_ROAD_V7.casing,
  DIRT_ROAD_V7.casingSoft,
  DIRT_ROAD_V7.crumb,
  DIRT_ROAD_V7.fill,
  DIRT_ROAD_V7.fillDark,
  DIRT_ROAD_V7.fillLight,
  DIRT_ROAD_V7.rut,
  DIRT_ROAD_V7.pebble,
  DOCK_LINK_V7.shadow,
  DOCK_LINK_V7.edge,
  DOCK_LINK_V7.gap,
  DOCK_LINK_V7.plank,
  DOCK_LINK_V7.plankLight,
  DOCK_LINK_V7.post,
  DOCK_LINK_V7.postLit,
];

/**
 * The fixed shape of the link between two road cells. `from` and `to` are
 * the cells in canonical order (north first, then west), whichever cell
 * asks; the bend comes from a hash of that pair.
 */
export interface DirtRoadLinkV7 {
  readonly from: CoordV7;
  readonly to: CoordV7;
  /** Sideways bend coefficients (world units). */
  readonly bend: readonly [number, number];
}

export interface WorldPointV7 {
  readonly x: number;
  readonly y: number;
}

function canonical(a: CoordV7, b: CoordV7): readonly [CoordV7, CoordV7] {
  return a.y < b.y || (a.y === b.y && a.x <= b.x) ? [a, b] : [b, a];
}

/** The link between `a` and `b`, the same shape whichever order. */
export function dirtRoadLinkV7(a: CoordV7, b: CoordV7): DirtRoadLinkV7 {
  const [from, to] = canonical(a, b);
  // A signed number in (-1, 1) per salt, from the ordered pair.
  const signed = (salt: number): number =>
    (forestHashV7(from.x, from.y, to.x * 4099 + salt, to.y * 8191 - salt) /
      0x100000000) *
      2 -
    1;
  const { wobble } = DIRT_ROAD_V7;
  return {
    from,
    to,
    // |p s^2 + q s^2 c| <= 0.65 W + 0.9 W * 0.385 < W.
    bend: [signed(1) * wobble * 0.65, signed(2) * wobble * 0.9],
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
 * A link between a land cell of the Road network (a city centre or a Road)
 * and a dock beside it (a Port or a Shipyard), orthogonal or diagonal.
 */
export interface DockLinkV7 {
  readonly land: CoordV7;
  readonly dock: CoordV7;
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
  /**
   * Dock links that cross `at`: those of the land cell `at`, those of the
   * dock `at`, and diagonal ones passing a corner of `at`. Only the land
   * cell paints the link's dirt; every cell paints its part of the gangway.
   */
  readonly docks?: readonly DockLinkV7[];
}

/** A uniform number in [0, 1) for a place in the world's pixel grid. */
function speck(gx: number, gy: number, salt: number): number {
  return forestHashV7(gx, gy, salt, 0x51ed) / 0x100000000;
}

/** A signed number in [-1, 1) for a corner of a noise lattice. */
function latticeValue(x: number, y: number, salt: number): number {
  return (forestHashV7(x, y, salt, 0x7a3d) / 0x100000000) * 2 - 1;
}

/**
 * Smooth noise in (-1, 1) over the world's pixel grid, with features about
 * `spacing` art pixels across. A function of the place alone.
 */
function drift(gx: number, gy: number, spacing: number, salt: number): number {
  const fx = gx / spacing;
  const fy = gy / spacing;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const ux = tx * tx * (3 - 2 * tx);
  const uy = ty * ty * (3 - 2 * ty);
  const top =
    latticeValue(x0, y0, salt) * (1 - ux) + latticeValue(x0 + 1, y0, salt) * ux;
  const bottom =
    latticeValue(x0, y0 + 1, salt) * (1 - ux) +
    latticeValue(x0 + 1, y0 + 1, salt) * ux;
  return top * (1 - uy) + bottom * uy;
}

/**
 * How much wider (positive) or narrower the dirt is at a place, in art
 * pixels: never more than `DIRT_ROAD_V7.roughness` either way.
 */
export function dirtRoadEdgeNoiseV7(gx: number, gy: number): number {
  return (
    DIRT_ROAD_V7.roughness *
    (0.68 * drift(gx, gy, 7, 11) + 0.32 * drift(gx, gy, 2.6, 12))
  );
}

/** A link in the art pixels of one cell. */
interface Trace {
  readonly link: DirtRoadLinkV7;
  /** The `from` cell's centre. */
  readonly ax: number;
  readonly ay: number;
  /** The straight line to the `to` cell's centre, and its length. */
  readonly cx: number;
  readonly cy: number;
  readonly length: number;
  /** The unit normal the bend is measured along. */
  readonly nx: number;
  readonly ny: number;
  /**
   * The part of the link that is dirt, as `t` from and to: the whole link,
   * or from the land cell's centre to the cap short of the shore for a dock
   * link.
   */
  readonly t0: number;
  readonly t1: number;
}

/** Ruts lie this far to each side of the centreline, in art pixels. */
const RUT_OFFSET = 1.9;
/** A rut is drawn in dashes of this many art pixels. */
const RUT_DASH = 9;
/** No rut within this many art pixels of a cell centre. */
const RUT_HUB = 9;
/** The edge line's thickness, in art pixels. */
const EDGE = 1.15;
/** Crumbs of dirt lie at most this far outside the edge line. */
const CRUMB_REACH = 3.2;
/**
 * Nothing of a link is painted further than this from its centreline, in
 * art pixels.
 */
export const DIRT_ROAD_REACH_V7 =
  DIRT_ROAD_V7.halfWidth + DIRT_ROAD_V7.roughness + EDGE + CRUMB_REACH;

function traceOf(link: DirtRoadLinkV7, at: CoordV7, t0 = 0, t1 = 1): Trace {
  const half = DIRT_ROAD_GRID_V7 / 2;
  const normal = normalOf(link);
  const cx = (link.to.x - link.from.x) * DIRT_ROAD_GRID_V7;
  const cy = (link.to.y - link.from.y) * DIRT_ROAD_GRID_V7;
  return {
    link,
    ax: (link.from.x - at.x) * DIRT_ROAD_GRID_V7 + half,
    ay: (link.from.y - at.y) * DIRT_ROAD_GRID_V7 + half,
    cx,
    cy,
    length: Math.sqrt(cx * cx + cy * cy),
    nx: normal.x,
    ny: normal.y,
    t0,
    t1,
  };
}

/** A dock link in the art pixels of one cell. */
interface DockTrace {
  readonly trace: Trace;
  /** Whether the land cell is the link's `from` end. */
  readonly landFirst: boolean;
  /** Where the gangway starts and stops, in art pixels from the land centre. */
  readonly start: number;
  readonly end: number;
}

function dockTraceOf(dock: DockLinkV7, at: CoordV7): DockTrace {
  const link = dirtRoadLinkV7(dock.land, dock.dock);
  const landFirst = link.from.x === dock.land.x && link.from.y === dock.land.y;
  const diagonal =
    dock.land.x !== dock.dock.x && dock.land.y !== dock.dock.y ? 1 : 0;
  const length = DIRT_ROAD_GRID_V7 * (diagonal === 1 ? Math.SQRT2 : 1);
  const share = (length / 2 - DOCK_LINK_V7.dirtShort[diagonal]) / length;
  return {
    trace: landFirst
      ? traceOf(link, at, 0, share)
      : traceOf(link, at, 1 - share, 1),
    landFirst,
    start: length / 2 - DOCK_LINK_V7.lead[diagonal],
    end: length - DOCK_LINK_V7.dockShort,
  };
}

/**
 * What the gangway of a dock link shows at a place (`px`, `py` in the art
 * pixels of the trace's cell): a wood value of `DIRT_ROAD_PIXEL_V7`, or
 * `CLEAR` off the gangway. A function of the link and the place alone, so
 * the cells a gangway crosses paint one gangway.
 */
function gangwayAt(dock: DockTrace, px: number, py: number): number {
  const P = DIRT_ROAD_PIXEL_V7;
  const { trace } = dock;
  const rx = px - trace.ax;
  const ry = py - trace.ay;
  const t = (rx * trace.cx + ry * trace.cy) / (trace.length * trace.length);
  if (t <= 0 || t >= 1) return P.CLEAR;
  const along = (dock.landFirst ? t : 1 - t) * trace.length - dock.start;
  const span = dock.end - dock.start;
  if (along < 0 || along > span) return P.CLEAR;
  const side =
    rx * trace.nx + ry * trace.ny - dirtRoadBendV7(trace.link, t) / UNIT;
  const off = Math.abs(side);
  const { halfWidth, plankPitch, postPitch } = DOCK_LINK_V7;
  const link = trace.link;
  // Posts in pairs, a little proud of the rails; the lit face is the one
  // towards the south-west.
  const post = along - Math.floor(along / postPitch) * postPitch;
  if (
    off > halfWidth + 0.4 &&
    off <= halfWidth + 2.4 &&
    post >= 1 &&
    post < 3 &&
    along < span - 1
  )
    return side * (trace.ny - trace.nx) > 0 && post < 2 ? P.POST_LIT : P.POST;
  if (off > halfWidth + 1) return P.CLEAR;
  // The rails along both sides and a dark end board at each end.
  if (off > halfWidth || along < 1 || along > span - 1) return P.WOOD_EDGE;
  const plank = Math.floor(along / plankPitch);
  if (along - plank * plankPitch < 1) return P.WOOD_GAP;
  return forestHashV7(
    link.from.x * 131 + link.to.x,
    link.from.y * 137 + link.to.y,
    plank,
    0x90c,
  ) /
    0x100000000 <
    0.45
    ? P.PLANK_LIGHT
    : P.PLANK;
}

/**
 * The pixels of one Road or corner-join entry: `DIRT_ROAD_GRID_V7` squared
 * values of `DIRT_ROAD_PIXEL_V7`, row by row from the cell's top-left. A
 * pure function of the cell, its links and the world's pixel grid.
 */
export function dirtRoadPixelsV7(cell: DirtRoadCellV7): Uint8Array {
  const size = DIRT_ROAD_GRID_V7;
  const pixels = new Uint8Array(size * size);
  const dockLinks = cell.docks ?? [];
  const docks = dockLinks.map((dock) => dockTraceOf(dock, cell.at));
  const traces = [
    ...[
      ...cell.neighbours.map((neighbour) => dirtRoadLinkV7(cell.at, neighbour)),
      ...cell.joins.map(([from, to]) => dirtRoadLinkV7(from, to)),
    ].map((link) => traceOf(link, cell.at)),
    // The dirt of a dock link lies on its land cell only.
    ...docks
      .filter((_, which) => {
        const land = dockLinks[which]?.land;
        return land?.x === cell.at.x && land.y === cell.at.y;
      })
      .map((dock) => dock.trace),
  ];
  if (traces.length === 0 && docks.length === 0 && !cell.isolated)
    return pixels;
  const { halfWidth } = DIRT_ROAD_V7;
  const P = DIRT_ROAD_PIXEL_V7;
  const bendReach = DIRT_ROAD_V7.wobble / UNIT + DIRT_ROAD_REACH_V7;
  // How far inside the dirt each pixel is (art pixels), for the pebbles.
  const depth = new Float32Array(size * size).fill(-1);
  for (let row = 0; row < size; row += 1)
    for (let column = 0; column < size; column += 1) {
      const px = column + 0.5;
      const py = row + 0.5;
      let nearest = Number.POSITIVE_INFINITY;
      // Which side of the nearest centreline: positive to its south-west.
      let southWest = 0;
      let rut = false;
      for (let which = 0; which < traces.length; which += 1) {
        const trace = traces[which] as Trace;
        // Where the pixel lies along the straight line between the two
        // cell centres, and how far to its side.
        const rx = px - trace.ax;
        const ry = py - trace.ay;
        const t =
          (rx * trace.cx + ry * trace.cy) / (trace.length * trace.length);
        const lateral = rx * trace.nx + ry * trace.ny;
        if (
          lateral > bendReach ||
          lateral < -bendReach ||
          t * trace.length < -DIRT_ROAD_REACH_V7 ||
          (t - 1) * trace.length > DIRT_ROAD_REACH_V7
        )
          continue;
        let best: number;
        let bestSide = 0;
        let bestSouthWest: number;
        const bestAlong = Math.max(0, Math.min(1, t)) * trace.length;
        if (t <= 0 || t >= 1) {
          // Past an end: round the cell centre the link ends at.
          const ex = t <= 0 ? rx : rx - trace.cx;
          const ey = t <= 0 ? ry : ry - trace.cy;
          best = Math.sqrt(ex * ex + ey * ey);
          bestSouthWest = ey - ex;
        } else if (t < trace.t0 || t > trace.t1) {
          // Past the cap of a dock link's dirt: round the curve's point
          // there, short of the shore.
          const cap = t < trace.t0 ? trace.t0 : trace.t1;
          const bend = dirtRoadBendV7(trace.link, cap) / UNIT;
          const ex = rx - trace.cx * cap - trace.nx * bend;
          const ey = ry - trace.cy * cap - trace.ny * bend;
          best = Math.sqrt(ex * ex + ey * ey);
          bestSouthWest = ey - ex;
        } else {
          // Beside the link: the bend is slight (its slope stays under
          // 0.1), so the distance to the curve is the sideways distance to
          // the curve's point at the same `t`, to within half a percent.
          bestSide = lateral - dirtRoadBendV7(trace.link, t) / UNIT;
          best = Math.abs(bestSide);
          bestSouthWest = bestSide * (trace.ny - trace.nx);
        }
        if (best < nearest) {
          nearest = best;
          southWest = bestSouthWest;
        }
        // A wheel rut: one-pixel dashes to each side of this link.
        if (Math.abs(best - RUT_OFFSET) < 0.5) {
          const dash = Math.floor(bestAlong / RUT_DASH);
          const within = bestAlong / RUT_DASH - dash;
          if (
            bestAlong > RUT_HUB &&
            bestAlong < trace.length - RUT_HUB &&
            t >= trace.t0 &&
            t <= trace.t1 &&
            within > 0.1 &&
            within < 0.9 &&
            forestHashV7(
              trace.link.from.x * 131 + trace.link.to.x,
              trace.link.from.y * 137 + trace.link.to.y,
              dash,
              bestSide < 0 ? 3 : 7,
            ) /
              0x100000000 <
              0.5
          )
            rut = true;
        }
      }
      if (cell.isolated) {
        // A short patch of dirt across the cell centre.
        const reach = 4 / UNIT;
        const ox =
          px - Math.max(size / 2 - reach, Math.min(size / 2 + reach, px));
        const oy = py - size / 2;
        const distance = Math.sqrt(ox * ox + oy * oy);
        if (distance < nearest) {
          nearest = distance;
          southWest = oy - ox;
        }
      }
      const index = row * size + column;
      // The gangways lie over the dirt; their shadow falls to the
      // north-east, on whatever is not wood.
      let wood: number = P.CLEAR;
      let shaded = false;
      for (const dock of docks) {
        const here = gangwayAt(dock, px, py);
        if (here !== P.CLEAR) wood = here;
        else if (
          gangwayAt(dock, px - 1, py + 1) !== P.CLEAR ||
          gangwayAt(dock, px - 2, py + 2) !== P.CLEAR
        )
          shaded = true;
      }
      if (wood !== P.CLEAR) {
        pixels[index] = wood;
        continue;
      }
      if (nearest > DIRT_ROAD_REACH_V7) {
        if (shaded) pixels[index] = P.WOOD_SHADOW;
        continue;
      }
      const gx = cell.at.x * size + column;
      const gy = cell.at.y * size + row;
      const half = halfWidth + dirtRoadEdgeNoiseV7(gx, gy);
      if (nearest < half) {
        const inside = half - nearest;
        depth[index] = inside;
        const tone = drift(gx, gy, 7, 21) * 0.8 + drift(gx, gy, 3.2, 22) * 0.4;
        // The sunk track's rim: shaded under its south-west bank, lit
        // under its north-east one (the light comes from the south-west).
        const rim = inside < 1.25 && Math.abs(southWest) > 0.8;
        pixels[index] =
          rut && inside > 1.3
            ? P.RUT
            : rim && southWest > 0 && tone < 0.3
              ? P.DIRT_DARK
              : rim && southWest < 0 && tone > -0.3
                ? P.DIRT_LIGHT
                : tone > 0.3
                  ? P.DIRT_LIGHT
                  : tone < -0.3
                    ? P.DIRT_DARK
                    : P.DIRT;
      } else if (nearest < half + EDGE) {
        // The edge line: two tones, with a few gaps the ground shows in.
        const gap = speck(gx, gy, 1);
        pixels[index] =
          gap < 0.07
            ? P.CLEAR
            : drift(gx, gy, 3.5, 31) > 0.25
              ? P.EDGE_SOFT
              : P.EDGE;
      } else if (
        nearest < half + EDGE + CRUMB_REACH &&
        speck(gx, gy, 3) < 0.085 &&
        drift(gx, gy, 4.5, 41) > 0.15
      ) {
        // Crumbs of dirt, in small scatters rather than an even spray.
        pixels[index] = P.CRUMB;
      } else if (shaded) pixels[index] = P.WOOD_SHADOW;
    }
  // Pebbles well inside the dirt, each with a shadow to its upper right
  // (the light comes from the bottom-left).
  for (let row = 1; row < size; row += 1)
    for (let column = 0; column < size - 1; column += 1) {
      const index = row * size + column;
      if ((depth[index] as number) < 1.7) continue;
      const gx = cell.at.x * size + column;
      const gy = cell.at.y * size + row;
      if (speck(gx, gy, 2) >= 0.02) continue;
      pixels[index] = P.PEBBLE;
      const shadow = (row - 1) * size + column + 1;
      if ((depth[shadow] as number) > 0) pixels[shadow] = P.RUT;
    }
  return pixels;
}

/**
 * One horizontal run of a layer: `length` pixels of one colour from
 * (`x`, `y`), in art pixels from the cell's top-left.
 */
export interface DirtRoadRunV7 {
  readonly colour: string;
  readonly x: number;
  readonly y: number;
  readonly length: number;
}

/**
 * The colour of a pixel in a layer, or "" where the layer is clear. The
 * CASING layer is the dark underlay of the whole track (edge colours, dirt
 * crumbs, and the edge colour under the dirt, so that the dirt of another
 * entry never leaves a hole); the FILL layer is the dirt and its texture.
 * Every CASING layer on the board is drawn before any FILL layer.
 */
function layerColour(value: number, layer: "CASING" | "FILL"): string {
  const P = DIRT_ROAD_PIXEL_V7;
  if (value === P.CLEAR) return "";
  // A gangway's shadow lies with the underlays, its wood with the dirt.
  if (value === P.WOOD_SHADOW)
    return layer === "CASING" ? DOCK_LINK_V7.shadow : "";
  if (value > P.WOOD_SHADOW)
    return layer === "FILL" ? (PIXEL_COLOURS[value] as string) : "";
  if (layer === "FILL")
    return value >= P.DIRT ? (PIXEL_COLOURS[value] as string) : "";
  return value >= P.DIRT
    ? DIRT_ROAD_V7.casing
    : (PIXEL_COLOURS[value] as string);
}

/** The runs of one layer of a cell, row by row. */
export function dirtRoadRunsV7(
  cell: DirtRoadCellV7,
  layer: "CASING" | "FILL",
): readonly DirtRoadRunV7[] {
  return runsOf(dirtRoadPixelsV7(cell), layer);
}

function runsOf(
  pixels: Uint8Array,
  layer: "CASING" | "FILL",
): readonly DirtRoadRunV7[] {
  const size = DIRT_ROAD_GRID_V7;
  const runs: DirtRoadRunV7[] = [];
  for (let row = 0; row < size; row += 1) {
    let start = 0;
    let colour = "";
    for (let column = 0; column <= size; column += 1) {
      const next =
        column === size
          ? ""
          : layerColour(pixels[row * size + column] as number, layer);
      if (next === colour) continue;
      if (colour !== "")
        runs.push({ colour, x: start, y: row, length: column - start });
      start = column;
      colour = next;
    }
  }
  return runs;
}

/** A layer of a cell painted once into a small canvas. */
interface Sprite {
  readonly canvas: HTMLCanvasElement;
  /** The sprite's place in the cell, in art pixels. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface CachedCell {
  readonly runs: {
    readonly CASING: readonly DirtRoadRunV7[];
    readonly FILL: readonly DirtRoadRunV7[];
  };
  /** Painted on first use; `null` when the layer is empty. */
  sprites: { CASING: Sprite | null; FILL: Sprite | null } | undefined;
}

/**
 * Painted cells, most recently used last. A 25 x 25 map has 625 cells, so
 * the bound is reached only by several large maps in one session.
 */
const CACHE_LIMIT = 1500;
const cache = new Map<string, CachedCell>();

const coordText = (at: CoordV7): string => `${at.x},${at.y}`;

function cellKey(cell: DirtRoadCellV7): string {
  return [
    coordText(cell.at),
    cell.neighbours.map(coordText).join(";"),
    cell.joins.map(([a, b]) => `${coordText(a)}:${coordText(b)}`).join(";"),
    cell.isolated ? "i" : "",
    (cell.docks ?? [])
      .map((dock) => `${coordText(dock.land)}>${coordText(dock.dock)}`)
      .join(";"),
  ].join("|");
}

function cachedCell(cell: DirtRoadCellV7): CachedCell {
  const key = cellKey(cell);
  const found = cache.get(key);
  if (found !== undefined) {
    cache.delete(key);
    cache.set(key, found);
    return found;
  }
  const pixels = dirtRoadPixelsV7(cell);
  const made: CachedCell = {
    runs: { CASING: runsOf(pixels, "CASING"), FILL: runsOf(pixels, "FILL") },
    sprites: undefined,
  };
  cache.set(key, made);
  if (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value as string;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    for (const sprite of [oldest?.sprites?.CASING, oldest?.sprites?.FILL])
      if (sprite !== null && sprite !== undefined) {
        sprite.canvas.width = 0;
        sprite.canvas.height = 0;
      }
  }
  return made;
}

/** Forgets every painted cell (tests, and a host that is torn down). */
export function clearDirtRoadCacheV7(): void {
  for (const cell of cache.values())
    for (const sprite of [cell.sprites?.CASING, cell.sprites?.FILL])
      if (sprite !== null && sprite !== undefined) {
        sprite.canvas.width = 0;
        sprite.canvas.height = 0;
      }
  cache.clear();
}

/**
 * Sprites are cut to the painted pixels, out to a multiple of four art
 * pixels: four art pixels are a whole number of screen pixels at every zoom
 * step (3, 4, 6 or 8), so a sprite's edges never land between pixels.
 */
const SPRITE_ALIGN = 4;

function paintSprite(
  documentRoot: Document,
  runs: readonly DirtRoadRunV7[],
): Sprite | null {
  if (runs.length === 0) return null;
  let left = DIRT_ROAD_GRID_V7;
  let top = DIRT_ROAD_GRID_V7;
  let right = 0;
  let bottom = 0;
  for (const run of runs) {
    left = Math.min(left, run.x);
    right = Math.max(right, run.x + run.length);
    top = Math.min(top, run.y);
    bottom = Math.max(bottom, run.y + 1);
  }
  left = Math.floor(left / SPRITE_ALIGN) * SPRITE_ALIGN;
  top = Math.floor(top / SPRITE_ALIGN) * SPRITE_ALIGN;
  right = Math.ceil(right / SPRITE_ALIGN) * SPRITE_ALIGN;
  bottom = Math.ceil(bottom / SPRITE_ALIGN) * SPRITE_ALIGN;
  const canvas = documentRoot.createElement("canvas");
  canvas.width = right - left;
  canvas.height = bottom - top;
  const buffer = canvas.getContext("2d");
  if (buffer === null) return null;
  for (const run of runs) {
    buffer.fillStyle = run.colour;
    buffer.fillRect(run.x - left, run.y - top, run.length, 1);
  }
  return {
    canvas,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Draws one layer of a cell's Road: CASING in the casing pass (every casing
 * on the board before any fill), FILL in the fill pass. `x`, `y` is the
 * screen centre of `at`. The cell's square is snapped edge by edge to whole
 * device pixels, like its ground tile, so neighbouring cells meet exactly.
 *
 * On a canvas of a document the layer is one cached sprite, scaled without
 * smoothing at a whole number of device pixels to the art pixel and with
 * smoothing otherwise, like the ground. Without a document (a recording
 * context in a test) the same pixels are filled run by run.
 */
export function drawDirtRoadV7(
  context: CanvasRenderingContext2D,
  cell: DirtRoadCellV7,
  x: number,
  y: number,
  zoom: number,
  layer: "CASING" | "FILL",
  devicePixelRatio = 1,
): void {
  const cached = cachedCell(cell);
  const runs = cached.runs[layer];
  if (runs.length === 0) return;
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const half = (TILE_WIDTH * zoom) / 2;
  const left = Math.round((x - half) * ratio) / ratio;
  const top = Math.round((y - half) * ratio) / ratio;
  const scaleX =
    (Math.round((x + half) * ratio) / ratio - left) / DIRT_ROAD_GRID_V7;
  const scaleY =
    (Math.round((y + half) * ratio) / ratio - top) / DIRT_ROAD_GRID_V7;
  const documentRoot = (context.canvas as HTMLCanvasElement | undefined)
    ?.ownerDocument as Document | undefined;
  if (documentRoot === undefined) {
    for (const run of runs) {
      context.fillStyle = run.colour;
      context.fillRect(
        left + run.x * scaleX,
        top + run.y * scaleY,
        run.length * scaleX,
        scaleY,
      );
    }
    return;
  }
  cached.sprites ??= {
    CASING: paintSprite(documentRoot, cached.runs.CASING),
    FILL: paintSprite(documentRoot, cached.runs.FILL),
  };
  const sprite = cached.sprites[layer];
  if (sprite === null) return;
  const deviceScale = scaleX * ratio;
  const smoothing = context.imageSmoothingEnabled;
  context.imageSmoothingEnabled =
    Math.abs(deviceScale - Math.round(deviceScale)) > 1e-6;
  context.drawImage(
    sprite.canvas,
    left + sprite.x * scaleX,
    top + sprite.y * scaleY,
    sprite.width * scaleX,
    sprite.height * scaleY,
  );
  context.imageSmoothingEnabled = smoothing;
}
