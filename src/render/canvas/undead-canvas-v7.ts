/**
 * Code-native revision-13 Undead placeholders (spec section 10.2): the Grave
 * marker, the Undead faction badge drawn over a Human sprite, and the ability
 * preview overlays. Sizes are world units (128 = one cell) scaled by zoom, so
 * both art sets share them.
 */

import {
  PREVIEW_TEXT_MIN_FONT_CSS_PX_V7,
  previewLabelVariantsV7,
  wrapPreviewTextV7,
  type PreviewLabelPlacerV7,
} from "./preview-label-layout-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

export type AbilityPreviewStyleV7 =
  | "WAIL"
  | "RAISE"
  | "DEVOUR"
  | "SPLASH"
  | "TEND"
  /** Bead pulp_wars-621: a unit a Rally would inspire (the Help green). */
  | "RALLY"
  /** Revision 17: a previewed blast area and the units it hits. */
  | "BLAST"
  /** Revision 17: an own or allied unit hit by a blast or bomb (warning). */
  | "BLAST_FRIENDLY"
  /** Revision 19: a legal nest tile of the Egg being laid. */
  | "NEST"
  /** Revision 19: an adjacent own Egg laid this turn (no Hatch yet). */
  | "HATCH_BLOCKED"
  /**
   * The Martian revision (bead pulp_wars-t6s.4): the Force Field tiles of a
   * selected Shield Projector, a Tractor Beam's pull destination and a
   * Pierce victim (the faction's magenta glow), and a Mind Control target
   * that cannot be taken (grey, with the reason).
   */
  | "FORCE_FIELD"
  | "PULL"
  | "PIERCE"
  | "MARTIAN_BLOCKED"
  /**
   * `pulp_wars-1wy.5`: the pick-up range of a Beam Down carrier, and a tile
   * a Tractor Beam's target only crosses on a two-tile pull.
   */
  | "BEAM_RANGE"
  | "PULL_STEP"
  /**
   * The Ice Folk revision (bead pulp_wars-7g3.6): a Sweep flank victim, a
   * unit a freeze would catch (FROZEN: a Frost Giant's Cold Aura, an
   * icebound ship), and the reach of a Cold Snap or Frost Bolt (the
   * faction's ice glow, ICE_FOLK_PALETTE_V7).
   */
  | "SWEEP"
  | "FROZEN"
  | "COLD_SNAP"
  /**
   * Ice Folk Freeze (bead pulp_wars-w49.38): the tiles a Mammoth's Stampede
   * charges through and the hits on its way (the tusk cream of the Ice
   * Folk bone), and the side tile a unit is shoved to.
   */
  | "STAMPEDE"
  | "STAMPEDE_SHOVE"
  /**
   * The Dwarf revision (bead pulp_wars-78i.6): a Mole's chosen destination,
   * an eruption ring and its victims "if they stay" (the earth tones of
   * DWARF_PALETTE_V7), a bomb's target (lit copper), and a hostile unit
   * already bombed this turn (grey).
   */
  | "TUNNEL"
  | "ERUPTION"
  | "BOMB"
  | "BOMBED"
  /**
   * Dwarf crowd control (`pulp_wars-w49.34`): the reach of an aimed Whirl,
   * the eight tiles round the Whirligig, in steam copper.
   */
  | "WHIRL"
  /**
   * Map curiosities (bead pulp_wars-737.6): a selected Giant Spider's area
   * (outlined only) and the tiles it could attack after one step (shaded),
   * in the neutral bone white and umber of its art.
   */
  | "MONSTER_AREA"
  | "MONSTER_REACH"
  /**
   * Map curiosities round 2 (bead pulp_wars-737.16): a selected saucer
   * guard's camp perimeter (the tiles within 2 of the saucer, outlined in
   * ochre), a gate's exit (pale gate light), the tile a gate's occupant is
   * shoved to, and a blocked exit (grey).
   */
  | "CAMP_PERIMETER"
  | "GATE_EXIT"
  | "GATE_SHOVE"
  | "GATE_BLOCKED"
  /**
   * The frozen sea (bead pulp_wars-5ti.7): the tiles a Freeze turns to ice
   * that are not picked themselves (a line's far tile, the Ice Witch's
   * ring), in the Place style's cream on an ice tint; FREEZE_FOCUS is the
   * ring while her button is hovered or focused.
   */
  | "FREEZE"
  | "FREEZE_FOCUS";

/** Legacy and CHIBI Undead badge frames, relative to the cell centre. */
export const UNDEAD_BADGE_FRAME_V7 = {
  legacy: { left: 12, top: 1, size: 23 },
  chibi: { left: -63, top: -63, size: 25 },
} as const;

const BONE = "#efe8cf";
const BADGE_FILL = "#231a2c";

/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55; first used by tuning 5 for the
 * Human Swordsman): the mark of a unit drawn with STAND-IN art (a new unit
 * drawn as another unit of its faction until its art exists): the letter
 * in a steel disc where the faction badges go, so the two units can be
 * told apart on the board.
 */
export function drawStandInBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
  letter: string,
): void {
  const frame = chibi
    ? UNDEAD_BADGE_FRAME_V7.chibi
    : UNDEAD_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  context.save();
  context.fillStyle = "#c9d2dc";
  context.strokeStyle = "#171722";
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#171722";
  context.font = `${800} ${Math.max(6, size * 0.62)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(letter, cx, cy + size * 0.04);
  context.restore();
}

/**
 * Grave corner marker frames, relative to the cell centre in world units
 * (128 = one cell). The marker sits in the bottom-right corner, which no
 * unit overlay uses: the seat badge and HP bar are on the left or below the
 * sprite, the faction badge, Field Defense and affliction markers on the
 * left or top, and status chips and the capital crown along the top. It is
 * 28.8 world units in both art sets, which is 18 CSS px on an 80 CSS px
 * cell (CHIBI zoom step 1, camera.zoom 0.625), and scales with zoom. `chibiBesideCity` keeps it left of the CHIBI population
 * column on a city tile.
 */
export const GRAVE_MARKER_FRAME_V7 = {
  legacy: { left: 34, top: 34, size: 28.8 },
  chibi: { left: 34, top: 34, size: 28.8 },
  chibiBesideCity: { left: 15, top: 34, size: 28.8 },
} as const;

/**
 * A small code-drawn tombstone: a pale round-topped headstone with a dark
 * outline and an engraved cross. It is drawn above units, so a Grave under a
 * unit stays visible, and shares no shape with the other corner markers.
 */
export function drawGraveCornerMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly chibi: boolean;
    /** The tile also holds a city (moves the CHIBI marker off its pips). */
    readonly besideCity: boolean;
    readonly highContrast: boolean;
    /**
     * The ninth unit (`pulp_wars-w49.17`, 7r55): the Grave a Wight will
     * climb out of: a pale blue stone inside a blue ring.
     */
    readonly wightGrave?: boolean;
  },
): void {
  const frame = !options.chibi
    ? GRAVE_MARKER_FRAME_V7.legacy
    : options.besideCity
      ? GRAVE_MARKER_FRAME_V7.chibiBesideCity
      : GRAVE_MARKER_FRAME_V7.chibi;
  const size = frame.size * zoom;
  const left = x + frame.left * zoom;
  const top = y + frame.top * zoom;
  // Headstone geometry on a unit square.
  const u = (value: number): number => value * size;
  const stoneLeft = left + u(0.2);
  const stoneRight = left + u(0.8);
  const shoulder = top + u(0.38);
  const base = top + u(0.9);
  const outline = Math.max(1, u(0.1));
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  // Ground line under the stone.
  context.strokeStyle = options.highContrast ? "#000000" : "#16130f";
  context.lineWidth = outline * 1.6;
  context.beginPath();
  context.moveTo(left + u(0.06), base);
  context.lineTo(left + u(0.94), base);
  context.stroke();
  if (options.wightGrave === true) {
    // The ring first, so the stone is drawn over it.
    context.save();
    context.strokeStyle = options.highContrast ? "#000000" : "#7fc8ff";
    context.lineWidth = Math.max(1, u(0.12));
    context.beginPath();
    context.arc(left + u(0.5), top + u(0.55), u(0.62), 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
  context.fillStyle = options.highContrast
    ? "#ffffff"
    : options.wightGrave === true
      ? "#bfe6ff"
      : "#d9dcd4";
  context.lineWidth = outline;
  context.beginPath();
  context.moveTo(stoneLeft, base);
  context.lineTo(stoneLeft, shoulder);
  context.arc(left + u(0.5), shoulder, u(0.3), Math.PI, 0);
  context.lineTo(stoneRight, base);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = options.highContrast ? "#000000" : "#3a4044";
  context.lineWidth = Math.max(1, u(0.09));
  context.beginPath();
  context.moveTo(left + u(0.5), top + u(0.28));
  context.lineTo(left + u(0.5), top + u(0.7));
  context.moveTo(left + u(0.36), top + u(0.42));
  context.lineTo(left + u(0.64), top + u(0.42));
  context.stroke();
  context.restore();
}

/**
 * The Undead faction cue: a bone-white skull on a near-black disc with a
 * bone outline. Its colours are distinct from every owner colour, and the
 * owner seat badge stays on the opposite corner.
 */
export function drawUndeadBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? UNDEAD_BADGE_FRAME_V7.chibi
    : UNDEAD_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  context.save();
  context.fillStyle = BADGE_FILL;
  context.strokeStyle = BONE;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = BONE;
  context.beginPath();
  context.arc(cx, cy - size * 0.07, size * 0.27, 0, Math.PI * 2);
  context.fill();
  context.fillRect(cx - size * 0.16, cy + size * 0.1, size * 0.32, size * 0.17);
  context.fillStyle = BADGE_FILL;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(
      cx + side * size * 0.11,
      cy - size * 0.06,
      size * 0.075,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillRect(
    cx - size * 0.015,
    cy + size * 0.12,
    Math.max(0.5, size * 0.03),
    size * 0.15,
  );
  context.restore();
}

/**
 * Revision 14 status markers (Plague and Bitten), public to every viewer.
 * The subject names the art slot: vkq.14 may register a raster for it, in
 * which case the renderer passes that image and the code-drawn glyph is
 * skipped. Slot 0 takes the first affliction, slot 1 the second.
 */
export type AfflictionSubjectV7 = "STATUS:PLAGUED" | "STATUS:BITTEN";

export function afflictionSubjectV7(
  affliction: "PLAGUE" | "BITTEN",
): AfflictionSubjectV7 {
  return affliction === "PLAGUE" ? "STATUS:PLAGUED" : "STATUS:BITTEN";
}

/**
 * Marker frames relative to the cell centre (world units, 128 = one cell),
 * stacked downwards. LEGACY: left of the sprite, between the Field Defense
 * symbol and the owner seat badge. CHIBI: just right of the unit's own
 * vertical HP bar, below the top-left Undead badge and Field Defense corner
 * and above the seat badge, so they read as the unit's own and never meet
 * another overlay.
 */
export const AFFLICTION_MARKER_FRAME_V7 = {
  legacy: [
    { left: -45, top: -31, size: 21 },
    { left: -45, top: -9, size: 21 },
  ],
  chibi: [
    { left: -52, top: -36, size: 26 },
    { left: -52, top: -8, size: 26 },
  ],
} as const;

/** Master size of a CHIBI marker raster (STATUS class, bead vkq.14). */
export const AFFLICTION_RASTER_MASTER_PX_V7 = 32;
/**
 * World units a CHIBI marker raster covers: 16 CSS px at zoom step 1
 * (camera.zoom 0.625), the frame's 26 rounded down to whole CSS pixels.
 */
export const AFFLICTION_RASTER_WORLD_SIZE_V7 = 25.6;

const MARKER_OUTLINE = "#0d0f0c";
/** Dark slate token behind a CHIBI marker raster. */
const MARKER_TOKEN = "#20242e";

const PLAGUE_COLORS = {
  disc: "#1b1e19",
  rim: "#d4dbc4",
  cloud: "#a4bb86",
  cloudShade: "#6b7c59",
  outline: "#10160c",
} as const;

const BITE_COLORS = {
  disc: "#4a1519",
  rim: "#f0d6c0",
  tooth: "#f7eddc",
  blood: "#e2434b",
} as const;

/** Draws one affliction marker (or its registered raster) in its slot. */
export function drawAfflictionMarkerV7(
  context: CanvasRenderingContext2D,
  subject: AfflictionSubjectV7,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly chibi: boolean;
    readonly slot: number;
    readonly highContrast: boolean;
    readonly raster?: CanvasImageSource | null;
    /** Snaps a raster to whole device pixels (default 1). */
    readonly devicePixelRatio?: number;
  },
): void {
  const frames = options.chibi
    ? AFFLICTION_MARKER_FRAME_V7.chibi
    : AFFLICTION_MARKER_FRAME_V7.legacy;
  const frame = frames[Math.min(options.slot, frames.length - 1)] ?? frames[0];
  const size = frame.size * zoom;
  const left = x + frame.left * zoom;
  const top = y + frame.top * zoom;
  context.save();
  if (options.raster !== undefined && options.raster !== null) {
    // A CHIBI marker is a 32 x 32 master drawn at 16 CSS px per zoom step
    // (AFFLICTION_RASTER_WORLD_SIZE_V7), centred in the frame and snapped
    // to device pixels: nearest-neighbour where that is 1:1 or a whole
    // upscale (DPR 2 at zoom 1), smoothed otherwise.
    const ratio =
      options.devicePixelRatio !== undefined && options.devicePixelRatio > 0
        ? options.devicePixelRatio
        : 1;
    const drawn = options.chibi ? AFFLICTION_RASTER_WORLD_SIZE_V7 * zoom : size;
    const snap = (value: number): number => Math.round(value * ratio) / ratio;
    const deviceScale = (drawn * ratio) / AFFLICTION_RASTER_MASTER_PX_V7;
    context.imageSmoothingEnabled = !(
      Math.abs(deviceScale - Math.round(deviceScale)) < 1e-6 &&
      Math.round(deviceScale) >= 1
    );
    if (options.chibi) {
      // A dark token with a bone rim, like the Undead badge, keeps the
      // small marker legible on grass, forest and water.
      context.fillStyle = MARKER_TOKEN;
      context.strokeStyle = BONE;
      context.lineWidth = Math.max(1, 1.2 * zoom);
      context.beginPath();
      context.arc(
        left + size / 2,
        top + size / 2,
        size / 2 + 0.6 * zoom,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    context.drawImage(
      options.raster,
      snap(left + (size - drawn) / 2),
      snap(top + (size - drawn) / 2),
      drawn,
      drawn,
    );
    context.restore();
    return;
  }
  const cx = left + size / 2;
  const cy = top + size / 2;
  const hc = options.highContrast;
  const plague = subject === "STATUS:PLAGUED";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = hc
    ? "#000000"
    : plague
      ? PLAGUE_COLORS.disc
      : BITE_COLORS.disc;
  context.strokeStyle = hc
    ? "#ffffff"
    : plague
      ? PLAGUE_COLORS.rim
      : BITE_COLORS.rim;
  // A dark outer ring keeps the disc readable on grass, sand and snow; the
  // light inner rim keeps it readable on dark forest and water.
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  const rim = context.strokeStyle;
  context.strokeStyle = hc ? "#000000" : MARKER_OUTLINE;
  context.lineWidth = Math.max(1.5, 3 * zoom);
  context.stroke();
  context.strokeStyle = rim;
  context.lineWidth = Math.max(1, 1.4 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2 - 1.2 * zoom, 0, Math.PI * 2);
  context.stroke();
  if (plague) drawPlagueCloud(context, cx, cy, size, zoom, hc);
  else drawBiteMark(context, cx, cy, size, hc);
  context.restore();
}

/** A green-grey miasma cloud with two falling drops. */
function drawPlagueCloud(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  zoom: number,
  hc: boolean,
): void {
  const s = size;
  const puffs: readonly (readonly [number, number, number])[] = [
    [-0.16, -0.02, 0.13],
    [0.0, -0.11, 0.16],
    [0.17, -0.01, 0.12],
    [0.02, 0.05, 0.14],
  ];
  context.fillStyle = hc ? "#ffffff" : PLAGUE_COLORS.cloud;
  context.strokeStyle = hc ? "#ffffff" : PLAGUE_COLORS.outline;
  context.lineWidth = Math.max(1, 1.2 * zoom);
  context.beginPath();
  for (const [dx, dy, r] of puffs) {
    context.moveTo(cx + dx * s + r * s, cy + dy * s);
    context.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
  }
  context.stroke();
  context.fill();
  if (!hc) {
    context.fillStyle = PLAGUE_COLORS.cloudShade;
    context.beginPath();
    context.ellipse(
      cx + 0.02 * s,
      cy + 0.14 * s,
      0.22 * s,
      0.06 * s,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillStyle = hc ? "#ffffff" : PLAGUE_COLORS.rim;
  for (const dx of [-0.12, 0.13]) {
    context.beginPath();
    context.arc(
      cx + dx * s,
      cy + 0.33 * s,
      Math.max(0.6, 0.055 * s),
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

/** Two opposing rows of teeth closing on a red wound. */
function drawBiteMark(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  hc: boolean,
): void {
  const s = size;
  if (!hc) {
    context.fillStyle = BITE_COLORS.blood;
    context.beginPath();
    context.ellipse(cx, cy, 0.27 * s, 0.09 * s, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = hc ? "#ffffff" : BITE_COLORS.tooth;
  const tooth = (tipX: number, baseY: number, tipY: number, half: number) => {
    context.beginPath();
    context.moveTo(tipX - half, baseY);
    context.lineTo(tipX, tipY);
    context.lineTo(tipX + half, baseY);
    context.closePath();
    context.fill();
  };
  // Upper jaw: four teeth pointing down along a shallow arc.
  for (const [dx, lift] of [
    [-0.24, 0.05],
    [-0.08, 0],
    [0.08, 0],
    [0.24, 0.05],
  ] as const)
    tooth(
      cx + dx * s,
      cy - (0.26 - lift) * s,
      cy - (0.02 - lift * 0.4) * s,
      0.075 * s,
    );
  // Lower jaw: three teeth pointing up, offset between the upper ones.
  for (const [dx, lift] of [
    [-0.16, 0.04],
    [0, 0],
    [0.16, 0.04],
  ] as const)
    tooth(
      cx + dx * s,
      cy + (0.26 - lift) * s,
      cy + (0.03 + lift * 0.4) * s,
      0.075 * s,
    );
}

const STYLE_COLORS: Readonly<
  Record<
    AbilityPreviewStyleV7,
    { readonly fill: string; readonly stroke: string }
  >
> = {
  WAIL: { fill: "rgba(176, 128, 255, 0.2)", stroke: "#c9a6ff" },
  RAISE: { fill: "rgba(120, 230, 150, 0.2)", stroke: "#8ff0a4" },
  DEVOUR: { fill: "rgba(255, 128, 104, 0.2)", stroke: "#ff9a84" },
  SPLASH: { fill: "rgba(255, 170, 70, 0.18)", stroke: "#ffb35c" },
  // Bead pulp_wars-621: the recipients of an area support wear the Help
  // ring, so their labels take its green (TARGET_HIGHLIGHTS_V7.SUPPORT).
  TEND: { fill: "rgba(182, 243, 106, 0.18)", stroke: "#b6f36a" },
  RALLY: { fill: "rgba(182, 243, 106, 0.18)", stroke: "#b6f36a" },
  // Revision 17: the blast is unowned (GOBLIN.md), so its preview uses the
  // pale spark cream; friendly fire adds yellow-and-charcoal hazard stripes.
  BLAST: { fill: "rgba(255, 248, 208, 0.24)", stroke: "#fff8d0" },
  BLAST_FRIENDLY: { fill: "rgba(255, 216, 74, 0.2)", stroke: "#ffd84a" },
  // Revision 19: unowned cream and grey cues (DINOSAUR.md).
  NEST: { fill: "rgba(255, 248, 208, 0.28)", stroke: "#fff8d0" },
  HATCH_BLOCKED: { fill: "rgba(174, 182, 194, 0.18)", stroke: "#aeb6c2" },
  // The Martian revision: MARTIAN_PALETTE_V7's glow and grey.
  FORCE_FIELD: { fill: "rgba(255, 143, 214, 0.12)", stroke: "#ff8fd6" },
  PULL: { fill: "rgba(255, 143, 214, 0.26)", stroke: "#ff8fd6" },
  PIERCE: { fill: "rgba(255, 47, 176, 0.18)", stroke: "#ff8fd6" },
  MARTIAN_BLOCKED: { fill: "rgba(170, 179, 192, 0.16)", stroke: "#aab3c0" },
  BEAM_RANGE: { fill: "rgba(255, 143, 214, 0.1)", stroke: "#ff8fd6" },
  PULL_STEP: { fill: "rgba(255, 143, 214, 0.14)", stroke: "#ff8fd6" },
  // The Ice Folk revision: ICE_FOLK_PALETTE_V7's ice glow and pale ice.
  SWEEP: { fill: "rgba(127, 203, 255, 0.2)", stroke: "#7fcbff" },
  FROZEN: { fill: "rgba(127, 203, 255, 0.24)", stroke: "#d6f0ff" },
  COLD_SNAP: { fill: "rgba(127, 203, 255, 0.1)", stroke: "#7fcbff" },
  STAMPEDE: { fill: "rgba(240, 220, 174, 0.24)", stroke: "#f0dcae" },
  STAMPEDE_SHOVE: { fill: "rgba(240, 220, 174, 0.1)", stroke: "#f0dcae" },
  FREEZE: { fill: "rgba(214, 240, 255, 0.2)", stroke: "#ffe7a3" },
  FREEZE_FOCUS: { fill: "rgba(214, 240, 255, 0.42)", stroke: "#ffe7a3" },
  // The Dwarf revision: DWARF_PALETTE_V7's light earth and lit copper.
  TUNNEL: { fill: "rgba(160, 122, 82, 0.3)", stroke: "#d8b58a" },
  ERUPTION: { fill: "rgba(160, 122, 82, 0.16)", stroke: "#c99a66" },
  BOMB: { fill: "rgba(222, 111, 42, 0.22)", stroke: "#f2a46a" },
  BOMBED: { fill: "rgba(170, 179, 192, 0.16)", stroke: "#aab3c0" },
  WHIRL: { fill: "rgba(194, 124, 58, 0.14)", stroke: "#f2b27a" },
  // Map curiosities: the Spider's bone white (area) and umber (reach).
  MONSTER_AREA: { fill: "rgba(239, 230, 208, 0)", stroke: "#efe6d0" },
  MONSTER_REACH: { fill: "rgba(138, 90, 51, 0.3)", stroke: "#efe6d0" },
  // Round 2: the saucer's "too close" line in ochre, the gate's pale light.
  CAMP_PERIMETER: { fill: "rgba(224, 150, 80, 0.1)", stroke: "#ffae42" },
  GATE_EXIT: { fill: "rgba(236, 232, 255, 0.24)", stroke: "#ece8ff" },
  GATE_SHOVE: { fill: "rgba(236, 232, 255, 0.12)", stroke: "#c9c0f2" },
  GATE_BLOCKED: { fill: "rgba(170, 179, 192, 0.24)", stroke: "#aab3c0" },
};

/** Dark stripes that turn the friendly-fire outline into a hazard band. */
const HAZARD_STRIPE = "#1b1b1f";

/** Faint fill of one previewed area cell (Wail radius or splash ring). */
export function drawAbilityAreaCellV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  style: AbilityPreviewStyleV7,
): void {
  const size = 128 * zoom;
  context.save();
  context.fillStyle = STYLE_COLORS[style].fill;
  context.fillRect(x - size / 2, y - size / 2, size, size);
  context.restore();
}

/**
 * The preview style as the look draws it (bead pulp_wars-3tq.12): with the
 * Undead violet accent a Raise Dead target takes the violet of the Wail
 * preview instead of the classic green, so the faction's magic is one
 * colour. Every other style, and the classic look, is unchanged.
 */
export function undeadPreviewStyleV7(
  style: AbilityPreviewStyleV7,
  violetAccent: boolean,
): AbilityPreviewStyleV7 {
  return violetAccent && style === "RAISE" ? "WAIL" : style;
}

/** Outline of one previewed area edge. */
export function abilityAreaStrokeV7(style: AbilityPreviewStyleV7): string {
  return STYLE_COLORS[style].stroke;
}

/**
 * A previewed ability target: a solid inner outline plus a short label such
 * as `−3`, `Rise` or `+4 HP`. Lethal damage uses a red label. With a
 * `placer`, the label box is clamped into the visible board band and nudged
 * off earlier preview boxes; the outline stays on its cell. With `defer`, the
 * label is queued so the board can draw every preview label above every
 * preview outline and area fill.
 */
export function drawAbilityTargetV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  style: AbilityPreviewStyleV7,
  label: string,
  lethal: boolean,
  placer?: PreviewLabelPlacerV7,
  defer?: (draw: () => void) => void,
  /**
   * Revision 17: with this, the label is placed when `defer` runs but
   * painted later, so a blast label keeps its cell and stays on top of an
   * attack's label stack placed after it.
   */
  paintLater?: (paint: () => void) => void,
  /**
   * Bead pulp_wars-621: false leaves the square outline out (the caller
   * drew the cell's own mark, an area support's Help ring).
   */
  outline = true,
): void {
  const size = 128 * zoom;
  context.save();
  context.strokeStyle = STYLE_COLORS[style].stroke;
  context.lineWidth = 3 * zoom;
  context.setLineDash([]);
  if (outline)
    context.strokeRect(
      x - size / 2 + 9 * zoom,
      y - size / 2 + 9 * zoom,
      size - 18 * zoom,
      size - 18 * zoom,
    );
  if (style === "BLAST_FRIENDLY") {
    context.strokeStyle = HAZARD_STRIPE;
    context.setLineDash([7 * zoom, 7 * zoom]);
    context.strokeRect(
      x - size / 2 + 9 * zoom,
      y - size / 2 + 9 * zoom,
      size - 18 * zoom,
      size - 18 * zoom,
    );
  }
  context.restore();
  const drawLabel = (): void => {
    context.save();
    // Labels stay legible at the smallest zoom: never below 11 CSS px.
    const font = Math.max(11, 15 * zoom);
    context.font = `${800} ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    context.textAlign = "center";
    // Fullest first; a crowded cell falls back to a shorter form, and a
    // label that fits nowhere is left out rather than covering another.
    const variants = (
      placer === undefined ? [label] : previewLabelVariantsV7(label)
    ).map((text) => {
      const width = Math.max(
        font * 2.6,
        context.measureText(text).width + font * 0.7,
      );
      return {
        text,
        left: x - width / 2,
        top: y - size / 2 + 2 * zoom,
        width,
        height: font * 1.4,
      };
    });
    context.restore();
    const first = variants[0];
    if (first === undefined) return;
    const placement =
      placer === undefined
        ? { left: first.left, top: first.top, variant: 0 }
        : placer.placeFirst(variants, {
            left: x - size / 2,
            top: y - size / 2,
            right: x + size / 2,
            bottom: y + size / 2,
          });
    const chosen = placement === null ? undefined : variants[placement.variant];
    if (placement === null || chosen === undefined) return;
    const { left, top } = placement;
    const { text, width, height } = chosen;
    const paint = (): void => {
      context.save();
      context.font = `${800} ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
      context.textAlign = "center";
      context.fillStyle = lethal
        ? "#8f1f22ee"
        : style === "BLAST_FRIENDLY"
          ? "#4d3500f2"
          : "#171722e6";
      context.fillRect(left, top, width, height);
      context.strokeStyle = STYLE_COLORS[style].stroke;
      context.lineWidth = Math.max(
        1,
        (style === "BLAST_FRIENDLY" ? 2.5 : 1.5) * zoom,
      );
      context.setLineDash([]);
      context.strokeRect(left, top, width, height);
      context.fillStyle = "#fff8df";
      context.fillText(text, left + width / 2, top + font * 1.05);
      context.restore();
    };
    if (paintLater === undefined) paint();
    else paintLater(paint);
  };
  if (defer === undefined) drawLabel();
  else defer(drawLabel);
}

/** One box of an attack or landing preview stacked under its target. */
export interface PreviewTextBoxV7 {
  readonly text: string;
  readonly fill: string;
  readonly color: string;
  /** Box height of one line, in fonts (a 10 px font in an 18 px box: 1.8). */
  readonly lineBox: number;
  /** First baseline below the box top, in fonts. */
  readonly baseline: number;
}

/**
 * Draws a target's preview label and optional note (Lifesteal, Infect,
 * Plague and Bitten outcomes) as one stack under the cell centre. At zoom 1
 * and above this matches the original layout (a 10 px label in a box at
 * least 90 px wide, widened only for a text that overflowed it)
 * at y + 39, the note right below it. Smaller zooms keep a
 * PREVIEW_TEXT_MIN_FONT_CSS_PX_V7 font and wrap a text wider than 1.5 cells
 * onto two lines; the placer keeps the stack inside the visible band.
 *
 * `variants` lists the stack's forms from the fullest to the most compact
 * (bead pulp_wars-0ao.12): the placer draws the first that fits without
 * overlapping an earlier preview box, and nothing when none does.
 */
export function drawPreviewTextStackV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  variants: readonly (readonly PreviewTextBoxV7[])[],
  placer?: PreviewLabelPlacerV7,
): void {
  const stacks = variants.filter((boxes) => boxes.length > 0);
  if (stacks.length === 0) return;
  const font = Math.max(PREVIEW_TEXT_MIN_FONT_CSS_PX_V7, 10 * zoom);
  const lineStep = font * 1.2;
  context.save();
  context.font = `${700} ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  const measure = (line: string): number => context.measureText(line).width;
  const cell = 128 * zoom;
  // One and a half cells: 192 px at zoom 1, so a label there keeps its line;
  // at the smallest zooms a long attack label wraps instead of spanning
  // three cells and colliding with its neighbours' labels.
  const wrapWidth = Math.max(90 * zoom, 1.5 * cell);
  const laidStacks = stacks.map((boxes) => {
    const laid = boxes.map((box) => {
      const lines = wrapPreviewTextV7(box.text, wrapWidth, measure);
      return {
        box,
        lines,
        width: Math.max(90 * zoom, Math.max(...lines.map(measure)) + font),
        height: font * box.lineBox + (lines.length - 1) * lineStep,
      };
    });
    const width = Math.max(...laid.map((entry) => entry.width));
    return {
      laid,
      left: x - width / 2,
      top: y + 39 * zoom,
      width,
      height: laid.reduce((sum, entry) => sum + entry.height, 0),
    };
  });
  const [natural] = laidStacks;
  const placed =
    placer === undefined || natural === undefined
      ? natural === undefined
        ? null
        : { left: natural.left, top: natural.top, variant: 0 }
      : placer.placeFirst(laidStacks, {
          left: x - cell / 2,
          top: y - cell / 2,
          right: x + cell / 2,
          bottom: y + cell / 2,
        });
  const stack = placed === null ? undefined : laidStacks[placed.variant];
  if (placed === null || stack === undefined) {
    context.restore();
    return;
  }
  const centre = placed.left + stack.width / 2;
  let top = placed.top;
  for (const entry of stack.laid) {
    context.fillStyle = entry.box.fill;
    context.fillRect(centre - entry.width / 2, top, entry.width, entry.height);
    context.fillStyle = entry.box.color;
    for (const [index, line] of entry.lines.entries())
      context.fillText(
        line,
        centre,
        top + font * entry.box.baseline + index * lineStep,
      );
    top += entry.height;
  }
  context.restore();
}
