/**
 * Code-drawn Martian board cues (docs/product/RULESET_7_MARTIANS.md section
 * 13.1, docs/art/factions/MARTIAN.md "Suggestions for the code-drawn
 * markers", bead pulp_wars-t6s.4): the faction badge over Human stand-in
 * art (LEGACY and the classic look), the segmented Shield bar, the Cooling
 * glyph, the Thrall collar and the Brain link, the flyers' ground shadow and
 * lift, and the ripples of a wading machine. Colours are
 * MARTIAN_PALETTE_V7. Sizes are world units (128 = one cell) scaled by zoom
 * unless a name says CSS px.
 */

import { DWARF_FLYER_PRESENTATION_V7 } from "../../assets/chibi-direction-dwarf-presentation";
import {
  MARTIAN_FLYER_PRESENTATION_V7,
  MARTIAN_PALETTE_V7,
} from "../../assets/chibi-direction-martian-presentation";
import { UNDEAD_BADGE_FRAME_V7 } from "./undead-canvas-v7";

/** The Martian badge sits in the Undead badge's corner, like every faction's. */
export const MARTIAN_BADGE_FRAME_V7 = UNDEAD_BADGE_FRAME_V7;

const INK = "#171722";

/**
 * What the board knows about a visible Martian unit (from the public view
 * lists and the `martian` block of the public unit stats).
 */
export interface MartianUnitMarkersV7 {
  /** Current Shield (0 to 4). */
  readonly shield: number;
  /** The Shield bar's segments: the maximum, 4 while a Force Field raised it. */
  readonly shieldSegments: number;
  /** The role's own Shield maximum; segments above it are Force Field ones. */
  readonly shieldMaximum: number;
  /** A ray unit that is Cooling (its next ray fires at half power). */
  readonly cooling: boolean;
  /** A Thrall (a unit controlled by a Brain). */
  readonly thrall: boolean;
  /** A flyer: the shadow and lift are drawn (land form or afloat). */
  readonly flyer: boolean;
  /** A machine afloat (self-launched): drawn as itself over the water. */
  readonly afloat: boolean;
}

/**
 * The faction cue over Human stand-in art: a small chrome saucer with a pale
 * glass dome and a magenta light, on a gunmetal disc with a chrome rim.
 */
export function drawMartianBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? MARTIAN_BADGE_FRAME_V7.chibi
    : MARTIAN_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  const { chrome, chromeShade, gunmetal, magenta } = MARTIAN_PALETTE_V7;
  context.save();
  context.fillStyle = gunmetal;
  context.strokeStyle = chrome;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // Glass dome, then the chrome disc across it.
  context.fillStyle = "#c7e7f5";
  context.beginPath();
  context.ellipse(
    cx,
    cy - size * 0.06,
    size * 0.17,
    size * 0.16,
    0,
    Math.PI,
    0,
  );
  context.fill();
  context.fillStyle = chrome;
  context.strokeStyle = chromeShade;
  context.lineWidth = Math.max(0.8, 0.9 * zoom);
  context.beginPath();
  context.ellipse(
    cx,
    cy + size * 0.04,
    size * 0.36,
    size * 0.11,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.stroke();
  context.fillStyle = magenta;
  context.beginPath();
  context.arc(cx, cy + size * 0.06, Math.max(0.8, size * 0.06), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/** Where the Shield bar is drawn: under the LEGACY HP bar, beside the
 * classic CHIBI side bar, or with the direction's HP bar on the base. */
export type ShieldBarPlacementV7 = "LEGACY" | "SIDE" | "BASE";

/**
 * Shield bar frames (world units from the cell centre). LEGACY: a row just
 * under the horizontal HP bar. SIDE (the classic CHIBI look): a column
 * right of the vertical HP bar, filling upward from its foot. BASE (the
 * live look): a row on the base, at the HP bar's line while HP is full and
 * directly above it while the HP bar shows.
 */
export const SHIELD_BAR_FRAME_V7 = {
  // LEGACY: directly under the HP bar (25 to 32), clear of the seat badge
  // and the faction badge, which sit just above it.
  legacy: { left: -25, top: 34, segment: 11, gap: 2.4, height: 5 },
  side: { left: -53, bottom: 40, segment: 8, gap: 2.4, width: 6 },
  base: { top: 50, raisedTop: 42, segment: 11, gap: 2.4, height: 7 },
} as const;

/**
 * The segmented Shield bar (section 13.1): one segment per point of the
 * current maximum, filled for the current Shield. Filled segments are
 * magenta with a pale top edge; Force Field segments (above the role's own
 * maximum) take the paler glow; empty ones are dark with a magenta rim.
 */
export function drawShieldBarV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  markers: Pick<
    MartianUnitMarkersV7,
    "shield" | "shieldSegments" | "shieldMaximum"
  >,
  options: {
    readonly placement: ShieldBarPlacementV7;
    /** BASE: the HP bar shows below, so the row moves up. */
    readonly hpShown?: boolean;
    /** BASE: a garrisoned unit's bar is shifted right like its HP bar. */
    readonly garrisoned?: boolean;
    readonly highContrast?: boolean;
  },
): void {
  const segments = Math.max(0, Math.min(6, markers.shieldSegments));
  if (segments === 0) return;
  const { magenta, magentaGlow, magentaPale, magentaDark } = MARTIAN_PALETTE_V7;
  const highContrast = options.highContrast ?? false;
  const filledFill = (index: number): string =>
    highContrast
      ? "#ffffff"
      : index >= markers.shieldMaximum
        ? magentaGlow
        : magenta;
  context.save();
  const drawSegment = (
    left: number,
    top: number,
    width: number,
    height: number,
    index: number,
  ): void => {
    const filled = index < markers.shield;
    // Each segment's dark casing reaches half-way into the gaps, so the
    // casings join into one dark bar (like the HP bar) that reads on any
    // plate colour, with the segments inside it.
    const padX = options.placement === "SIDE" ? zoom : zoom * 1.2;
    const padY = options.placement === "SIDE" ? zoom * 1.2 : zoom;
    context.fillStyle = INK;
    context.fillRect(
      left - padX,
      top - padY,
      width + 2 * padX,
      height + 2 * padY,
    );
    if (filled) {
      context.fillStyle = filledFill(index);
      context.fillRect(left, top, width, height);
      if (!highContrast) {
        context.fillStyle = magentaPale;
        context.fillRect(left, top, width, Math.max(0.75, zoom));
      }
    } else {
      context.fillStyle = "rgba(22, 10, 20, 0.6)";
      context.fillRect(left, top, width, height);
      context.strokeStyle = highContrast ? "#ffffff" : magentaDark;
      context.lineWidth = Math.max(0.75, zoom);
      context.strokeRect(
        left + zoom / 2,
        top + zoom / 2,
        width - zoom,
        height - zoom,
      );
    }
  };
  if (options.placement === "SIDE") {
    const frame = SHIELD_BAR_FRAME_V7.side;
    for (let index = 0; index < segments; index += 1)
      drawSegment(
        x + frame.left * zoom,
        y +
          (frame.bottom - (index + 1) * frame.segment - index * frame.gap) *
            zoom,
        frame.width * zoom,
        frame.segment * zoom,
        index,
      );
  } else {
    const frame =
      options.placement === "LEGACY"
        ? {
            top: SHIELD_BAR_FRAME_V7.legacy.top,
            segment: SHIELD_BAR_FRAME_V7.legacy.segment,
            gap: SHIELD_BAR_FRAME_V7.legacy.gap,
            height: SHIELD_BAR_FRAME_V7.legacy.height,
          }
        : {
            top:
              options.hpShown === true
                ? SHIELD_BAR_FRAME_V7.base.raisedTop
                : SHIELD_BAR_FRAME_V7.base.top,
            segment: SHIELD_BAR_FRAME_V7.base.segment,
            gap: SHIELD_BAR_FRAME_V7.base.gap,
            height: SHIELD_BAR_FRAME_V7.base.height,
          };
    const width = segments * frame.segment + (segments - 1) * frame.gap;
    const centre =
      options.placement === "BASE" && options.garrisoned === true ? 20 : 0;
    const left =
      options.placement === "LEGACY"
        ? SHIELD_BAR_FRAME_V7.legacy.left
        : centre - width / 2;
    for (let index = 0; index < segments; index += 1)
      drawSegment(
        x + (left + index * (frame.segment + frame.gap)) * zoom,
        y + frame.top * zoom,
        frame.segment * zoom,
        frame.height * zoom,
        index,
      );
  }
  context.restore();
}

/**
 * The status chip slot right of the sprite (Cooling or the Thrall collar;
 * a Thrall never has a ray), clear of the HP bar, the seat badge, the
 * affliction markers (left) and the Grave marker (bottom right).
 */
export const MARTIAN_STATUS_FRAME_V7 = {
  legacy: { cx: 33, cy: -14, radius: 12 },
  chibi: { cx: 50, cy: -22, radius: 13 },
} as const;

/** Smallest status chip radius in CSS px. */
export const MARTIAN_STATUS_MIN_RADIUS_CSS_PX_V7 = 7;

function statusChip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
  highContrast: boolean,
): { readonly cx: number; readonly cy: number; readonly r: number } {
  const frame = chibi
    ? MARTIAN_STATUS_FRAME_V7.chibi
    : MARTIAN_STATUS_FRAME_V7.legacy;
  const r = Math.max(MARTIAN_STATUS_MIN_RADIUS_CSS_PX_V7, frame.radius * zoom);
  const cx = x + frame.cx * zoom;
  const cy = y + frame.cy * zoom;
  context.fillStyle = highContrast ? "#000000" : MARTIAN_PALETTE_V7.gunmetal;
  context.strokeStyle = INK;
  context.lineWidth = Math.max(1.5, r * 0.22);
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  return { cx, cy, r };
}

/**
 * The Cooling glyph (section 13.1): three wavy heat lines rising, in a dull
 * grey on a gunmetal chip, with no magenta: "not glowing" reads as "not at
 * full power".
 */
export function drawCoolingGlyphV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: { readonly chibi: boolean; readonly highContrast?: boolean },
): void {
  const highContrast = options.highContrast ?? false;
  context.save();
  const { cx, cy, r } = statusChip(
    context,
    x,
    y,
    zoom,
    options.chibi,
    highContrast,
  );
  context.strokeStyle = highContrast ? "#ffffff" : MARTIAN_PALETTE_V7.cooling;
  context.lineWidth = Math.max(1.2, r * 0.17);
  context.lineCap = "round";
  for (const dx of [-0.42, 0, 0.42]) {
    const left = cx + dx * r;
    context.beginPath();
    context.moveTo(left, cy + r * 0.5);
    context.bezierCurveTo(
      left - r * 0.22,
      cy + r * 0.2,
      left + r * 0.22,
      cy - r * 0.05,
      left,
      cy - r * 0.25,
    );
    context.bezierCurveTo(
      left - r * 0.22,
      cy - r * 0.42,
      left + r * 0.12,
      cy - r * 0.55,
      left,
      cy - r * 0.6,
    );
    context.stroke();
  }
  context.restore();
}

/**
 * The Thrall collar (section 13.1): a chrome ring with one magenta light on
 * a gunmetal chip, beside the sprite's own control helmet. It reads on the
 * Thrall sprite and on the Human Fighter stand-in alike.
 */
export function drawThrallCollarV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: { readonly chibi: boolean; readonly highContrast?: boolean },
): void {
  const highContrast = options.highContrast ?? false;
  context.save();
  const { cx, cy, r } = statusChip(
    context,
    x,
    y,
    zoom,
    options.chibi,
    highContrast,
  );
  context.strokeStyle = highContrast ? "#ffffff" : MARTIAN_PALETTE_V7.chrome;
  context.lineWidth = Math.max(1.4, r * 0.24);
  context.beginPath();
  context.ellipse(cx, cy + r * 0.05, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = highContrast ? "#ffffff" : MARTIAN_PALETTE_V7.magenta;
  context.beginPath();
  context.arc(cx, cy + r * 0.45, Math.max(1.2, r * 0.2), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/** Extra lift of a flyer's sprite above its plate, in master px. */
export const FLYER_LIFT_MASTER_PX_V7 = 4;
/** LEGACY: lift of a flyer's stand-in sprite, in world units. */
export const FLYER_LIFT_LEGACY_V7 = 8;

/**
 * The flyer presentation of a sprite asset, or null for every other one:
 * the Martian flyers, and (bead pulp_wars-78i.6) the Dwarf Gyrocopter
 * (DWARF_FLYER_PRESENTATION_V7, the same shape).
 */
export function flyerPresentationV7(assetId: string): {
  readonly hullBottom: number;
  readonly groundLine: number;
  readonly shadow: {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
  };
} | null {
  if (assetId in MARTIAN_FLYER_PRESENTATION_V7)
    return MARTIAN_FLYER_PRESENTATION_V7[
      assetId as keyof typeof MARTIAN_FLYER_PRESENTATION_V7
    ];
  if (assetId in DWARF_FLYER_PRESENTATION_V7)
    return DWARF_FLYER_PRESENTATION_V7[
      assetId as keyof typeof DWARF_FLYER_PRESENTATION_V7
    ];
  return null;
}

/**
 * The ground shadow of a flyer (MARTIAN_FLYER_PRESENTATION_V7): an ellipse
 * on the sprite's ground line, `#10131a` at 35% alpha, drawn before the
 * sprite is lifted. `rect` is the unlifted sprite rectangle; `masterWidth`
 * its master width. A stand-in sprite without a presentation gets a shadow
 * on its bottom edge.
 */
export function drawFlyerShadowV7(
  context: CanvasRenderingContext2D,
  rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  assetId: string,
  masterWidth: number,
): void {
  const presentation = flyerPresentationV7(assetId);
  const scale = rect.width / Math.max(1, masterWidth);
  const shadow =
    presentation === null
      ? {
          x: masterWidth / 2,
          y: rect.height / scale - 6,
          radiusX: masterWidth * 0.32,
          radiusY: masterWidth * 0.07,
        }
      : presentation.shadow;
  context.save();
  context.globalAlpha *= 0.35;
  context.fillStyle = MARTIAN_PALETTE_V7.shadow;
  context.beginPath();
  context.ellipse(
    rect.x + shadow.x * scale,
    rect.y + shadow.y * scale,
    shadow.radiusX * scale,
    shadow.radiusY * scale,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

/**
 * A wading machine afloat (a Tripod or Colossus on water): two short white
 * ripple arcs at its feet. `rect` is the sprite rectangle.
 */
export function drawWadeRipplesV7(
  context: CanvasRenderingContext2D,
  rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  zoom: number,
): void {
  const cx = rect.x + rect.width / 2;
  const base = rect.y + rect.height - rect.height * 0.07;
  context.save();
  context.strokeStyle = "#ffffff";
  context.globalAlpha *= 0.85;
  context.lineWidth = Math.max(1, 2 * zoom);
  context.lineCap = "round";
  for (const [radius, dy] of [
    [rect.width * 0.36, 0],
    [rect.width * 0.24, rect.height * 0.035],
  ] as const) {
    context.beginPath();
    context.ellipse(
      cx,
      base + dy,
      radius,
      radius * 0.22,
      0,
      0.15 * Math.PI,
      0.85 * Math.PI,
    );
    context.stroke();
  }
  context.restore();
}

/**
 * The link from a selected Thrall to its Brain, or from a selected Brain to
 * its Thralls: a dashed glow line between the cell centres and a ring
 * round the far end.
 */
export function drawThrallLinkV7(
  context: CanvasRenderingContext2D,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  zoom: number,
  highContrast = false,
): void {
  context.save();
  context.lineCap = "round";
  context.strokeStyle = INK;
  context.lineWidth = Math.max(2, 6 * zoom);
  context.setLineDash([10 * zoom, 8 * zoom]);
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.strokeStyle = highContrast
    ? "#ffffff"
    : MARTIAN_PALETTE_V7.magentaGlow;
  context.lineWidth = Math.max(1, 3 * zoom);
  context.stroke();
  context.setLineDash([]);
  context.lineWidth = Math.max(1.5, 3.5 * zoom);
  context.beginPath();
  context.arc(to.x, to.y, 46 * zoom, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
