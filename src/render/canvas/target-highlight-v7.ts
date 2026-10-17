/**
 * The board's target highlight vocabulary (bead pulp_wars-9im;
 * docs/ui/BOARD_TARGETING.md). Every action that targets a tile, a unit or
 * a building is picked on the board, and every such target is drawn in one
 * of four styles. Bead pulp_wars-2yc.88: every mark is a frame of four
 * corner brackets drawn inside its own tile, never on the tile's edges, so
 * a tile that is not a target never looks like one (the old dashed Move
 * outline merged with its neighbours into a grid). A style is told apart by
 * its colour and by its weight and furniture (a Move's light brackets, an
 * Attack's heavy brackets in a solid frame, a Help's plus, a Place's corner
 * pips), so it survives colour blindness, the high-contrast setting and
 * every ground (grass, snow, Undead gloam, forest pieces, mountains): each
 * mark has a dark casing under its coloured stroke. The marks never move,
 * so the reduced-motion still is the mark itself.
 *
 * This module is presentation only: it reads no rules. Which targets exist
 * comes from the engine's offered commands and public previews.
 */

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

/**
 * The shape that tells a style apart without its colour. Every shape is
 * four corner brackets inside the tile; what differs is their weight and
 * what they carry.
 */
export type TargetHighlightShapeV7 =
  /** Light corner brackets alone. */
  | "BRACKETS"
  /** Heavy corner brackets inside a thin solid frame. */
  | "BRACKETS_FRAME"
  /** Corner brackets with a plus badge in the upper left corner. */
  | "BRACKETS_PLUS"
  /** Corner brackets with a square pip on each corner. */
  | "BRACKETS_PIPS";

export interface TargetHighlightSpecV7 {
  readonly style: TargetHighlightStyleV7;
  readonly shape: TargetHighlightShapeV7;
  /** The coloured stroke. */
  readonly stroke: string;
  /** The brackets' dash and gap in world units; empty is solid. */
  readonly dash: readonly number[];
  /** The bracket stroke width in world units: [normal, high contrast]. */
  readonly width: readonly [number, number];
  /** How far inside the tile's edge the brackets' corners sit (world units). */
  readonly inset: number;
  /** The length of each bracket arm (world units). */
  readonly arm: number;
  /** One word for legends and Help. */
  readonly name: string;
  /** How the mark looks, for Help and assistive text. */
  readonly look: string;
}

/** The dark casing drawn under every mark. */
export const TARGET_HIGHLIGHT_CASING_V7 = "#10131ccc";

/**
 * Bead pulp_wars-2yc.88: the four colours. Move keeps its teal and Attack
 * its red; Help moves from yellow-green to a lavender (the Cult's neon green
 * border sat beside the old green, docs/art/factions/CULT.md), the colour
 * of a cast spell; Place keeps its cream.
 */
export const TARGET_HIGHLIGHTS_V7: Readonly<
  Record<TargetHighlightStyleV7, TargetHighlightSpecV7>
> = {
  MOVE: {
    style: "MOVE",
    shape: "BRACKETS",
    stroke: "#64e6cf",
    dash: [],
    width: [3, 4.25],
    inset: 14,
    arm: 20,
    name: "Move",
    look: "light teal corner brackets",
  },
  ATTACK: {
    style: "ATTACK",
    shape: "BRACKETS_FRAME",
    stroke: "#ff655f",
    dash: [],
    width: [4.5, 5.5],
    inset: 12,
    arm: 26,
    name: "Attack",
    look: "heavy red corner brackets in a thin red frame",
  },
  SUPPORT: {
    style: "SUPPORT",
    shape: "BRACKETS_PLUS",
    stroke: "#c49bff",
    dash: [],
    width: [4, 5],
    inset: 12,
    arm: 24,
    name: "Help",
    look: "lavender corner brackets with a plus",
  },
  PLACE: {
    style: "PLACE",
    shape: "BRACKETS_PIPS",
    stroke: "#ffe7a3",
    dash: [],
    width: [3.5, 4.5],
    inset: 14,
    arm: 20,
    name: "Place",
    look: "cream corner brackets with square pips",
  },
};

/** One sentence for Help: the four marks in words. */
export const TARGET_HIGHLIGHT_HELP_TIP_V7 =
  "Pick targets on the map: teal corners are a move, heavy red corners in a red frame are an attack, lavender corners with a plus are a unit you can heal or help, and cream corners with square pips are a place to build or put a unit.";

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
  // Ice Folk Freeze (`pulp_wars-w49.38`): a Frost Bolt target, and the end
  // of a Stampede's line (the charge harms what stands in it).
  FROST_BOLT: "ATTACK",
  STAMPEDE: "ATTACK",
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
  // The Candy redesign: the Crumbs a Re-bake scoops (its first step) are a
  // place too; a unit to Top Up is helped.
  REBAKE_CRUMBS: "PLACE",
  TOP_UP: "SUPPORT",
  // The frozen sea: the tile a line role's Freeze starts on.
  FREEZE: "PLACE",
  // The giants' signatures (`pulp_wars-w49.32`): a victim to swallow and an
  // enemy a Stomp hits are harmed; a Goblin to throw is helped; a landing
  // tile and a Gingerbread Man's tile are places.
  SWALLOW: "ATTACK",
  STOMP: "ATTACK",
  TOSS_PASSENGER: "SUPPORT",
  TOSS: "PLACE",
  BREAK_OFF_FIRST: "PLACE",
  BREAK_OFF: "PLACE",
  // The Cultists (`pulp_wars-mch9.17`): an own unit a Summoner offers wears
  // the Help ring (it is the Cult's own, and it pays), a broken enemy it
  // Seizes the Attack mark.
  SACRIFICE: "SUPPORT",
  SEIZE: "ATTACK",
  // The channel (`pulp_wars-mch9.18`): the cultist that helps a summoning,
  // the daemon a cultist channels and the channeller a Thing grips are the
  // Cult's own units (the Help ring); the Horror's tile is a Place mark.
  SUMMON_HELPER: "SUPPORT",
  SUMMON: "PLACE",
  CHANNEL: "SUPPORT",
  ANCHOR: "SUPPORT",
  // Rituals, hexes and tricks (`pulp_wars-mch9.19`): a rite's mark, and a
  // Tentacle, are put on a tile (Place); a Proclaim and a Ribbit harm what
  // they pick (Attack). A Switcheroo says its own style for each target: an
  // own unit is helped, an enemy harmed.
  STARFALL: "PLACE",
  GREAT_SUMMONING: "PLACE",
  TENTACLE: "PLACE",
  PROCLAIM: "ATTACK",
  RIBBIT: "ATTACK",
  SWITCHEROO: "ATTACK",
  // The Cult redesign (`pulp_wars-mch9.34`): the Stargazer a cultist joins
  // in its chant is the Cult's own unit (the Help ring).
  JOIN_CHANT: "SUPPORT",
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
  /** A variant's own stroke (a Launch, a Glide, a two-step landing). */
  readonly stroke?: string;
  /** A variant's own bracket dash, in world units. */
  readonly dash?: readonly number[];
  /**
   * A thin solid frame inside the tile as well as the brackets: a chosen
   * Tunnel destination (an Attack mark always has it).
   */
  readonly frame?: boolean;
  /** Thicker strokes for the high-contrast setting. */
  readonly highContrast?: boolean;
  /**
   * The target under the pointer or the keyboard's focus (bead
   * pulp_wars-2yc.88): heavier brackets and a soft wash of its colour
   * inside the frame.
   */
  readonly emphasis?: boolean;
  /**
   * The Help ring of an area support's recipient (bead pulp_wars-621): a
   * broken ring, so it is not taken for a target that can be picked. QUIET
   * is thin with a smaller plus, PROMINENT the full weight with a soft
   * fill. Omitted, the mark is a pickable target's brackets.
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

/** The soft fill inside a prominent area support ring (the Help lavender). */
export const AREA_SUPPORT_FILL_V7 = "#c49bff30";

/** The area support ring's stroke widths in world units: [normal, high contrast]. */
export const TARGET_HIGHLIGHT_WIDTHS_V7 = {
  TARGET: [4, 5],
  QUIET: [3.25, 4.25],
} as const;

/**
 * The thin solid frame of an Attack mark (and a chosen Tunnel
 * destination): its inset from the tile's edge and its widths, in world
 * units.
 */
export const TARGET_HIGHLIGHT_FRAME_V7 = {
  inset: 5,
  width: [2, 3],
} as const;

/**
 * A hovered or focused target: its strokes this much heavier, and a wash
 * of its colour at this alpha (two hex digits) inside the frame.
 */
export const TARGET_HIGHLIGHT_EMPHASIS_V7 = {
  widthScale: 1.4,
  washAlpha: "33",
} as const;

/** The least width of a bracket stroke on screen, in CSS pixels. */
export const TARGET_HIGHLIGHT_LEAST_WIDTH_PX_V7 = 1.5;

const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

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
  /** A solid casing under a dashed colour (a variant's brackets). */
  solidCasing = false,
): void {
  context.setLineDash(solidCasing ? [] : [...dash]);
  path();
  context.strokeStyle = TARGET_HIGHLIGHT_CASING_V7;
  context.lineWidth = width * 1.9;
  context.stroke();
  if (solidCasing) context.setLineDash([...dash]);
  context.strokeStyle = stroke;
  context.lineWidth = width;
  context.stroke();
}

/** A filled disc with a dark plus, on the dark casing (the Help badge). */
function plusBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  zoom: number,
  fill: string,
  quiet: boolean,
): void {
  context.setLineDash([]);
  context.fillStyle = fill;
  context.strokeStyle = TARGET_HIGHLIGHT_CASING_V7;
  context.lineWidth = 2 * zoom;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.strokeStyle = "#10131c";
  context.lineWidth = (quiet ? 3 : 3.5) * zoom;
  const arm = radius * 0.55;
  context.beginPath();
  context.moveTo(x - arm, y);
  context.lineTo(x + arm, y);
  context.moveTo(x, y - arm);
  context.lineTo(x, y + arm);
  context.stroke();
}

/** The broken Help ring of an area support's recipient (bead pulp_wars-621). */
function drawAreaSupportRing(
  context: CanvasRenderingContext2D,
  cell: TargetHighlightCellV7,
  weight: AreaSupportWeightV7,
  highContrast: boolean,
): void {
  const { x, y, size, zoom } = cell;
  const stroke = TARGET_HIGHLIGHTS_V7.SUPPORT.stroke;
  const quiet = weight === "QUIET";
  const width =
    TARGET_HIGHLIGHT_WIDTHS_V7[quiet ? "QUIET" : "TARGET"][
      highContrast ? 1 : 0
    ] * zoom;
  const radius = size * 0.42;
  context.save();
  context.lineCap = "butt";
  if (weight === "PROMINENT") {
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
    AREA_SUPPORT_DASH_V7.map((part) => part * zoom),
  );
  // The plus badge on the ring's upper right.
  plusBadge(
    context,
    x + radius * Math.SQRT1_2,
    y - radius * Math.SQRT1_2,
    (quiet ? 9.5 : 11) * zoom,
    zoom,
    stroke,
    quiet,
  );
  context.restore();
}

/**
 * Draws one target's mark inside its own tile. The caller draws labels,
 * ghosts and badges; this is the mark alone, the same on every ground and
 * in reduced motion.
 */
export function drawTargetHighlightV7(
  context: CanvasRenderingContext2D,
  cell: TargetHighlightCellV7,
  style: TargetHighlightStyleV7,
  options: TargetHighlightOptionsV7 = {},
): void {
  const highContrast = options.highContrast === true;
  if (options.weight !== undefined) {
    drawAreaSupportRing(context, cell, options.weight, highContrast);
    return;
  }
  const spec = TARGET_HIGHLIGHTS_V7[style];
  const { x, y, size, zoom } = cell;
  const stroke = options.stroke ?? spec.stroke;
  const scale =
    options.emphasis === true ? TARGET_HIGHLIGHT_EMPHASIS_V7.widthScale : 1;
  const width = Math.max(
    TARGET_HIGHLIGHT_LEAST_WIDTH_PX_V7,
    spec.width[highContrast ? 1 : 0] * zoom,
  );
  const half = size / 2;
  const inset = half - spec.inset * zoom;
  const arm = spec.arm * zoom;
  context.save();
  context.lineCap = "butt";
  context.lineJoin = "miter";
  // A hovered or focused target: a soft wash of its colour first.
  const frameInset = TARGET_HIGHLIGHT_FRAME_V7.inset * zoom;
  if (options.emphasis === true) {
    context.fillStyle = `${stroke.slice(0, 7)}${TARGET_HIGHLIGHT_EMPHASIS_V7.washAlpha}`;
    context.fillRect(
      x - half + frameInset,
      y - half + frameInset,
      size - frameInset * 2,
      size - frameInset * 2,
    );
  }
  // An Attack's (or a chosen Tunnel destination's) thin solid frame,
  // inside the tile so a neighbour's never touches it.
  if (spec.shape === "BRACKETS_FRAME" || options.frame === true) {
    const frameWidth = Math.max(
      1,
      TARGET_HIGHLIGHT_FRAME_V7.width[highContrast ? 1 : 0] * zoom * scale,
    );
    casedStroke(
      context,
      () => {
        context.beginPath();
        context.rect(
          x - half + frameInset,
          y - half + frameInset,
          size - frameInset * 2,
          size - frameInset * 2,
        );
      },
      stroke,
      frameWidth,
      [],
    );
  }
  // The four corner brackets, as one path stroked once in each colour.
  casedStroke(
    context,
    () => {
      context.beginPath();
      for (const [sx, sy] of CORNERS) {
        const cx = x + sx * inset;
        const cy = y + sy * inset;
        context.moveTo(cx - sx * arm, cy);
        context.lineTo(cx, cy);
        context.lineTo(cx, cy - sy * arm);
      }
    },
    stroke,
    width * scale,
    (options.dash ?? spec.dash).map((part) => part * zoom),
    // A dashed variant (a Launch, a two-step landing) keeps a whole dark
    // bracket under its dashes, so it reads on pale water and on Snow.
    true,
  );
  if (spec.shape === "BRACKETS_PLUS")
    // The plus badge on the upper left corner (the tile's ability badges
    // stand down its right edge).
    plusBadge(
      context,
      x - inset,
      y - inset,
      Math.max(6, 10 * zoom),
      zoom,
      stroke,
      false,
    );
  else if (spec.shape === "BRACKETS_PIPS") {
    // A square pip on each corner of the brackets.
    const pip = Math.max(4, 10 * zoom);
    context.setLineDash([]);
    context.fillStyle = stroke;
    context.strokeStyle = TARGET_HIGHLIGHT_CASING_V7;
    context.lineWidth = 2 * zoom;
    for (const [sx, sy] of CORNERS) {
      const left = x + sx * inset - pip / 2;
      const top = y + sy * inset - pip / 2;
      context.fillRect(left, top, pip, pip);
      context.strokeRect(left, top, pip, pip);
    }
  }
  context.restore();
}
