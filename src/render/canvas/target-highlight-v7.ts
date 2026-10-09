/**
 * The board's target highlight vocabulary (bead pulp_wars-9im;
 * docs/ui/BOARD_TARGETING.md). Every action that targets a tile, a unit or
 * a building is picked on the board, and every such target is drawn in one
 * of four styles. A style is told apart by its shape first and its colour
 * second, so it survives colour blindness, the high-contrast setting and
 * every ground (grass, snow, Undead gloam, forest pieces, mountains): each
 * mark has a dark casing under its coloured stroke. The marks never move,
 * so the reduced-motion still is the mark itself.
 *
 * This module is presentation only: it reads no rules. Which targets exist
 * comes from the engine's offered commands and public previews.
 */
import type { TileEdge } from "./geometry";

/** What choosing a highlighted target does. */
export type TargetHighlightStyleV7 =
  /** A tile the selected unit goes to. */
  | "MOVE"
  /** A unit the selected unit harms (attack or hostile ability). */
  | "ATTACK"
  /** An own unit the selected unit heals, hatches, carries or helps. */
  | "SUPPORT"
  /** A tile where something is put: a building, an Egg, a new unit. */
  | "PLACE";

export const TARGET_HIGHLIGHT_STYLES_V7 = [
  "MOVE",
  "ATTACK",
  "SUPPORT",
  "PLACE",
] as const satisfies readonly TargetHighlightStyleV7[];

/** The shape that tells a style apart without its colour. */
export type TargetHighlightShapeV7 =
  /** A dashed outline on the tile's edges. */
  | "DASHED_TILE"
  /** A solid outline with an aiming bracket in each corner. */
  | "BRACKET_TILE"
  /** A round ring inside the tile with a plus badge. */
  | "RING_PLUS"
  /** A dotted outline with a square pip in each corner. */
  | "DOTTED_PIPS";

export interface TargetHighlightSpecV7 {
  readonly style: TargetHighlightStyleV7;
  readonly shape: TargetHighlightShapeV7;
  /** The coloured stroke. */
  readonly stroke: string;
  /** Dash and gap in world units (multiplied by the zoom); empty is solid. */
  readonly dash: readonly number[];
  /** Whether the outline follows the tile's edges (and merges with neighbours). */
  readonly onEdges: boolean;
  /** One word for legends and Help. */
  readonly name: string;
  /** How the mark looks, for Help and assistive text. */
  readonly look: string;
}

/** The dark casing drawn under every mark. */
export const TARGET_HIGHLIGHT_CASING_V7 = "#10131ccc";

export const TARGET_HIGHLIGHTS_V7: Readonly<
  Record<TargetHighlightStyleV7, TargetHighlightSpecV7>
> = {
  MOVE: {
    style: "MOVE",
    shape: "DASHED_TILE",
    stroke: "#64e6cf",
    dash: [9, 5],
    onEdges: true,
    name: "Move",
    look: "dashed teal tile",
  },
  ATTACK: {
    style: "ATTACK",
    shape: "BRACKET_TILE",
    stroke: "#ff655f",
    dash: [],
    onEdges: true,
    name: "Attack",
    look: "solid red tile with corner brackets",
  },
  SUPPORT: {
    style: "SUPPORT",
    shape: "RING_PLUS",
    stroke: "#b6f36a",
    dash: [],
    onEdges: false,
    name: "Help",
    look: "green ring with a plus",
  },
  PLACE: {
    style: "PLACE",
    shape: "DOTTED_PIPS",
    stroke: "#ffe7a3",
    dash: [2, 7],
    onEdges: true,
    name: "Place",
    look: "dotted cream tile with corner pips",
  },
};

/** One sentence for Help: the four marks in words. */
export const TARGET_HIGHLIGHT_HELP_TIP_V7 =
  "Pick targets on the map: a dashed teal tile is a move, a red tile with corner brackets is an attack, a green ring with a plus is a unit you can heal or help, and a dotted cream tile is a place to build or put a unit.";

/**
 * The families of map targets (`MapCommandTargetV7["family"]`), each in
 * exactly one style. A string type keeps this module free of the renderer.
 */
const FAMILY_STYLES_V7: Readonly<Record<string, TargetHighlightStyleV7>> = {
  MOVE: "MOVE",
  DISEMBARK: "MOVE",
  LANDING_AFTER_MOVE: "MOVE",
  TUNNEL: "MOVE",
  TUNNEL_DESTINATION: "MOVE",
  TUNNEL_RIDER: "MOVE",
  BOMB_RUN: "MOVE",
  SUGAR_RUSH: "MOVE",
  ATTACK: "ATTACK",
  MIND_CONTROL: "ATTACK",
  TRACTOR_BEAM: "ATTACK",
  THROW_BOLAS: "ATTACK",
  COLD_SNAP: "ATTACK",
  BOMB_TARGET: "ATTACK",
  // Dwarf crowd control: an enemy an aimed Whirl hits.
  WHIRL: "ATTACK",
  // The naval branch interface: a ship to capture, while Board is aimed.
  BOARD: "ATTACK",
  HATCH: "SUPPORT",
  SUGAR_TOSS: "SUPPORT",
  BEAM_DOWN_PASSENGER: "SUPPORT",
  TUNNEL_PASSENGER: "SUPPORT",
  LAY_EGG: "PLACE",
  BEAM_DOWN: "PLACE",
  ASSEMBLE: "PLACE",
  // Dwarf crowd control: a tile an Engineer may put a Barricade on.
  BARRICADE: "PLACE",
  REBAKE: "PLACE",
  // The frozen sea: the tile a line role's Freeze starts on.
  FREEZE: "PLACE",
};

/** Every family the vocabulary knows, for the audit and its tests. */
export const TARGET_HIGHLIGHT_FAMILIES_V7: readonly string[] =
  Object.keys(FAMILY_STYLES_V7);

/** The style of a map target family (an unknown family is a Move). */
export function targetHighlightStyleV7(
  family: string | undefined,
  /** A target may say its own style (a Tractor Beam on an own unit). */
  override?: TargetHighlightStyleV7,
): TargetHighlightStyleV7 {
  if (override !== undefined) return override;
  return (
    (family === undefined ? undefined : FAMILY_STYLES_V7[family]) ?? "MOVE"
  );
}

/**
 * Which style wins a tile edge shared by two targets: an attack over a
 * place over a move. A ring is inside its tile and never takes an edge.
 */
export function targetHighlightEdgeRankV7(
  style: TargetHighlightStyleV7,
): number {
  return style === "ATTACK"
    ? 3
    : style === "PLACE"
      ? 2
      : style === "MOVE"
        ? 1
        : 0;
}

/**
 * The families whose targets a selected unit shows without arming, each
 * picked by a click on its own tile: no two of them can claim one tile (a
 * Move ends on a free tile, an Attack is on a hostile unit, a Hatch or a
 * Sugar Toss is on an own unit).
 */
export const UNARMED_TARGET_FAMILIES_V7: readonly string[] = [
  "MOVE",
  "ATTACK",
  "DISEMBARK",
  "LANDING_AFTER_MOVE",
  "HATCH",
  "SUGAR_TOSS",
];

/**
 * The most buttons an aiming panel of the dock may hold, whatever the
 * number of targets: the "?" info, one toggle or confirmation of the
 * ability (Alone, Tunnel, Cast), Back and Cancel. A panel never lists its
 * targets; the guard test fails on a panel that outgrows this.
 */
export const BOARD_PICK_PANEL_MAX_BUTTONS_V7 = 5;

/**
 * Whether a family's target is a unit (or a place chosen for one), which
 * the keyboard steps through with Tab; plain Move tiles are reached with
 * the arrow keys.
 */
export function targetIsSteppedV7(family: string): boolean {
  return (
    family !== "MOVE" &&
    family !== "DISEMBARK" &&
    family !== "LANDING_AFTER_MOVE"
  );
}

export interface TargetHighlightCellV7 {
  /** The tile's centre, in canvas pixels. */
  readonly x: number;
  readonly y: number;
  /** The tile's width in canvas pixels. */
  readonly size: number;
  readonly zoom: number;
}

export interface TargetHighlightOptionsV7 {
  /** The tile edges this target owns (default: all four). */
  readonly edges?: readonly TileEdge[];
  /** A variant's own stroke (a Launch, a Glide, a two-step landing). */
  readonly stroke?: string;
  /** A variant's own dash, in world units. */
  readonly dash?: readonly number[];
  /** Thicker strokes for the high-contrast setting. */
  readonly highContrast?: boolean;
  /**
   * The Help ring of an area support's recipient (bead pulp_wars-621): a
   * broken ring, so it is not taken for a target that can be picked. QUIET
   * is thin with a smaller plus, PROMINENT the full weight with a soft
   * fill. Omitted, the mark is a pickable target's whole ring.
   */
  readonly weight?: AreaSupportWeightV7;
}

/** Dash and gap of a recipient's broken ring, in world units. */
export const AREA_SUPPORT_DASH_V7: readonly number[] = [16, 7];

/**
 * How strongly an area support's recipient is marked: quiet while its
 * healer is merely selected, prominent while the one button that helps
 * them all is hovered or focused.
 */
export type AreaSupportWeightV7 = "QUIET" | "PROMINENT";

/** The soft fill inside a prominent area support ring. */
export const AREA_SUPPORT_FILL_V7 = "#b6f36a30";

/** Stroke widths in world units: [normal, high contrast]. */
export const TARGET_HIGHLIGHT_WIDTHS_V7 = {
  TARGET: [4, 5],
  QUIET: [3.25, 4.25],
} as const;

const ALL_EDGES: readonly TileEdge[] = ["NORTH", "EAST", "SOUTH", "WEST"];

function edgeEndpoints(
  cell: TargetHighlightCellV7,
  edge: TileEdge,
): readonly [number, number, number, number] {
  const half = cell.size / 2;
  const { x, y } = cell;
  if (edge === "NORTH") return [x - half, y - half, x + half, y - half];
  if (edge === "EAST") return [x + half, y - half, x + half, y + half];
  if (edge === "SOUTH") return [x + half, y + half, x - half, y + half];
  return [x - half, y + half, x - half, y - half];
}

/**
 * Traces `path` once and strokes it twice: the dark casing, then the
 * colour over it.
 */
function casedStroke(
  context: CanvasRenderingContext2D,
  path: () => void,
  stroke: string,
  width: number,
  dash: readonly number[],
): void {
  context.setLineDash([...dash]);
  path();
  context.strokeStyle = TARGET_HIGHLIGHT_CASING_V7;
  context.lineWidth = width * 1.9;
  context.stroke();
  context.strokeStyle = stroke;
  context.lineWidth = width;
  context.stroke();
}

/**
 * Draws one target's mark. The caller draws labels, ghosts and badges; this
 * is the mark alone, the same on every ground and in reduced motion.
 */
export function drawTargetHighlightV7(
  context: CanvasRenderingContext2D,
  cell: TargetHighlightCellV7,
  style: TargetHighlightStyleV7,
  options: TargetHighlightOptionsV7 = {},
): void {
  const spec = TARGET_HIGHLIGHTS_V7[style];
  const { x, y, size, zoom } = cell;
  const stroke = options.stroke ?? spec.stroke;
  const quiet = options.weight === "QUIET";
  const width =
    TARGET_HIGHLIGHT_WIDTHS_V7[quiet ? "QUIET" : "TARGET"][
      options.highContrast === true ? 1 : 0
    ] * zoom;
  const dash = (options.dash ?? spec.dash).map((part) => part * zoom);
  context.save();
  context.lineCap = spec.shape === "DOTTED_PIPS" ? "round" : "butt";
  if (spec.shape === "RING_PLUS") {
    const radius = size * 0.42;
    if (options.weight === "PROMINENT") {
      context.fillStyle = AREA_SUPPORT_FILL_V7;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    casedStroke(
      context,
      () => {
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
      },
      stroke,
      width,
      // A pickable Help target's ring is whole; a recipient's is broken.
      options.weight === undefined
        ? []
        : AREA_SUPPORT_DASH_V7.map((part) => part * zoom),
    );
    // The plus badge on the ring's upper right.
    const badgeX = x + radius * Math.SQRT1_2;
    const badgeY = y - radius * Math.SQRT1_2;
    const badge = (quiet ? 9.5 : 11) * zoom;
    context.setLineDash([]);
    context.fillStyle = stroke;
    context.strokeStyle = TARGET_HIGHLIGHT_CASING_V7;
    context.lineWidth = 2 * zoom;
    context.beginPath();
    context.arc(badgeX, badgeY, badge, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = "#10131c";
    context.lineWidth = (quiet ? 3 : 3.5) * zoom;
    const arm = badge * 0.55;
    context.beginPath();
    context.moveTo(badgeX - arm, badgeY);
    context.lineTo(badgeX + arm, badgeY);
    context.moveTo(badgeX, badgeY - arm);
    context.lineTo(badgeX, badgeY + arm);
    context.stroke();
    context.restore();
    return;
  }
  // The tile's own edges as one path, stroked once in each colour.
  const edges = options.edges ?? ALL_EDGES;
  if (edges.length > 0)
    casedStroke(
      context,
      () => {
        context.beginPath();
        for (const edge of edges) {
          const [fromX, fromY, toX, toY] = edgeEndpoints(cell, edge);
          context.moveTo(fromX, fromY);
          context.lineTo(toX, toY);
        }
      },
      stroke,
      width,
      dash,
    );
  const inset = size / 2 - 11 * zoom;
  if (spec.shape === "BRACKET_TILE") {
    // An aiming bracket in each corner, inside the outline.
    const arm = 20 * zoom;
    casedStroke(
      context,
      () => {
        context.beginPath();
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          const cx = x + sx * inset;
          const cy = y + sy * inset;
          context.moveTo(cx - sx * arm, cy);
          context.lineTo(cx, cy);
          context.lineTo(cx, cy - sy * arm);
        }
      },
      stroke,
      width,
      [],
    );
  } else if (spec.shape === "DOTTED_PIPS") {
    // A square pip in each corner, inside the outline.
    const pip = 9 * zoom;
    context.setLineDash([]);
    context.fillStyle = stroke;
    context.strokeStyle = TARGET_HIGHLIGHT_CASING_V7;
    context.lineWidth = 2 * zoom;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const left = x + sx * inset - pip / 2;
      const top = y + sy * inset - pip / 2;
      context.fillRect(left, top, pip, pip);
      context.strokeRect(left, top, pip, pip);
    }
  }
  context.restore();
}
