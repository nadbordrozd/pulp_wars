import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import { navalArtRoleOfSubjectV7 } from "../../assets/chibi-art-v7";
import { DWARF_FLYER_PRESENTATION_V7 } from "../../assets/chibi-direction-dwarf-presentation";
import { MARTIAN_FLYER_PRESENTATION_V7 } from "../../assets/chibi-direction-martian-presentation";
import {
  UNIT_SHADOW_MEASUREMENTS_V7,
  type UnitShadowMeasurementV7,
} from "./unit-shadow-measurements-v7.generated";

/**
 * Per-unit ground shadows of the live look (bead pulp_wars-jg1).
 *
 * The SHADOW base and the GROUND ready ring used to sit at one place for
 * every sprite of a canvas size (an ellipse whose bottom edge touched the
 * canvas bottom, as wide as the canvas allowed). The masters do not all
 * stand there: a Yeti, a Sabretooth or the Steam Mole stand 13 to 19 px
 * above the canvas bottom, so the shadow showed below them and they looked
 * like they floated; a Goblin Warboss or a Skeleton stand on the very
 * bottom row, below the shadow; and the Juggernaut-role giants a city's level-up
 * gives stood on a shadow narrower than their legs.
 *
 * Each `UNIT:` subject now has an anchor derived from the measurement of
 * its master (unit-shadow-measurements-v7.generated.ts): the shadow is
 * centred on the lower body, its centre a little behind the contact line
 * so the feet stand in its front half, and its width follows the lower
 * body within the bounds of the size class. Flyers keep their own shadow
 * on their ground line (MARTIAN_FLYER_PRESENTATION_V7,
 * DWARF_FLYER_PRESENTATION_V7) and hovering units a deliberate gap. Ships
 * and the embarked transport stand on the water: no shadow, the ready ring
 * round the hull as before. The ready ring of every other unit follows the
 * same anchor as its shadow.
 *
 * All values are master pixels from the canvas's top-left corner; the board
 * scales them by the drawn size of the sprite (so a garrisoned, grown or
 * zoomed unit keeps its shadow under its feet).
 */

/** How a unit meets the ground. */
export type UnitShadowMotionV7 =
  /** Stands on the ground: the shadow sits under its feet. */
  | "GROUNDED"
  /** Floats just above the ground (a ghost): a small gap, a smaller shadow. */
  | "HOVER"
  /** Flies: the flyer presentation's shadow on the ground line, well below. */
  | "FLYER"
  /** Afloat (ships, the transport): no shadow, the ring round the hull. */
  | "AFLOAT";

/**
 * Shadow size class: SMALL is a short canvas (the Egg, the Dwarf mounds),
 * NORMAL the 56 x 80 standard unit, BIG the 72 x 88 large unit, GIANT the
 * 88 x 104 Juggernaut-role giant.
 */
export type UnitShadowSizeV7 = "SMALL" | "NORMAL" | "BIG" | "GIANT";

export interface UnitShadowEllipseV7 {
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

export interface UnitShadowAnchorV7 {
  readonly subject: ArtSubjectV7;
  /** The master the anchor was measured on; another raster falls back. */
  readonly assetId: string;
  readonly width: number;
  readonly height: number;
  readonly motion: UnitShadowMotionV7;
  readonly size: UnitShadowSizeV7;
  /** The ground shadow, or null afloat. A flyer's is drawn by the flyer code. */
  readonly shadow: UnitShadowEllipseV7 | null;
  /** The GROUND ready ring, or null afloat (the hull ring stays generic). */
  readonly ring: UnitShadowEllipseV7 | null;
}

/**
 * The flyers, each with the asset whose flyer presentation holds its
 * shadow: the Saucer, the Mothership and the Gyrocopter. Their sprites
 * have no feet; the gap to their shadow is deliberate.
 */
export const UNIT_SHADOW_FLYERS_V7: Readonly<
  Partial<Record<ArtSubjectV7, string>>
> = {
  "UNIT:MARTIAN:RAIDER": "chibi-direction-martian-saucer",
  "UNIT:MARTIAN:KNIGHT": "chibi-direction-martian-mothership",
  "UNIT:DWARF:RAIDER": "chibi-direction-dwarf-gyrocopter",
};

/**
 * Hovering units and their gap in master px between the lowest point of
 * the sprite and the shadow's centre: the Banshee (the Undead Marksman), a
 * ghost whose tail ends in a wisp.
 */
export const UNIT_SHADOW_HOVER_GAPS_V7: Readonly<
  Partial<Record<ArtSubjectV7, number>>
> = {
  "UNIT:UNDEAD:MARKSMAN": 0,
};

/**
 * Half-width bounds of the shadow per size class, in master px. The shadow
 * is UNIT_SHADOW_WIDTH_SHARE_V7 of the lower body's width, clamped to these.
 * NORMAL's and BIG's lower bounds are the old fixed shadows (28 x 0.78 and
 * 30.8 x 0.78), which read well on most units; GIANT's are larger.
 */
export const UNIT_SHADOW_RADIUS_BOUNDS_V7: Readonly<
  Record<Exclude<UnitShadowSizeV7, "SMALL">, readonly [number, number]>
> = {
  NORMAL: [21.84, 24],
  BIG: [24, 28],
  GIANT: [33, 38],
};
/** Shadow half-width as a share of the lower body's width (half x 0.84). */
export const UNIT_SHADOW_WIDTH_SHARE_V7 = 0.42;
/** SMALL: the shadow half-width as a share of the lower body's width. */
export const UNIT_SHADOW_SMALL_WIDTH_SHARE_V7 = 0.55;
/** Vertical radius as a share of the horizontal one (unchanged). */
export const UNIT_SHADOW_ASPECT_V7 = 0.34;
/**
 * How far the shadow's centre sits behind (above) the contact line, as a
 * share of its vertical radius: the feet stand in its front half, as they
 * did on the old shadow for a unit standing 5 px above the canvas bottom.
 */
export const UNIT_SHADOW_SINK_V7 = 0.7;
/** A hovering unit's shadow is this much smaller. */
export const UNIT_SHADOW_HOVER_SCALE_V7 = 0.85;
/**
 * The ready ring is the shadow grown by this margin in master px on each
 * side (28 - 21.84: a standard unit's ring is the old 28 px ring), so a
 * giant's ring still fits its cell.
 */
export const UNIT_READY_RING_MARGIN_V7 = 28 - 21.84;
/** Largest horizontal offset of the shadow from the canvas centre. */
export const UNIT_SHADOW_MAX_SHIFT_X_V7 = 6;
/** A foot band at least this wide centres the shadow; else the lower body. */
const FOOT_CENTRE_MIN_WIDTH = 12;

export function unitShadowSizeV7(
  measurement: UnitShadowMeasurementV7,
): UnitShadowSizeV7 {
  if (measurement.height < 80) return "SMALL";
  if (measurement.assetClass === "GIANT_UNIT") return "GIANT";
  if (measurement.assetClass === "LARGE_UNIT") return "BIG";
  return "NORMAL";
}

function motionOf(subject: ArtSubjectV7): UnitShadowMotionV7 {
  if (navalArtRoleOfSubjectV7(subject) !== null) return "AFLOAT";
  if (UNIT_SHADOW_FLYERS_V7[subject] !== undefined) return "FLYER";
  if (UNIT_SHADOW_HOVER_GAPS_V7[subject] !== undefined) return "HOVER";
  return "GROUNDED";
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

function flyerShadow(assetId: string): UnitShadowEllipseV7 | null {
  const presentation =
    assetId in MARTIAN_FLYER_PRESENTATION_V7
      ? MARTIAN_FLYER_PRESENTATION_V7[
          assetId as keyof typeof MARTIAN_FLYER_PRESENTATION_V7
        ]
      : assetId in DWARF_FLYER_PRESENTATION_V7
        ? DWARF_FLYER_PRESENTATION_V7[
            assetId as keyof typeof DWARF_FLYER_PRESENTATION_V7
          ]
        : null;
  return presentation === null ? null : { ...presentation.shadow };
}

const grown = (ellipse: UnitShadowEllipseV7): UnitShadowEllipseV7 => ({
  x: ellipse.x,
  y: ellipse.y,
  radiusX: ellipse.radiusX + UNIT_READY_RING_MARGIN_V7,
  radiusY: ellipse.radiusY + UNIT_READY_RING_MARGIN_V7 * UNIT_SHADOW_ASPECT_V7,
});

/** The anchor of one measured subject (see the module comment). */
export function deriveUnitShadowAnchorV7(
  subject: ArtSubjectV7,
  measurement: UnitShadowMeasurementV7,
): UnitShadowAnchorV7 {
  const motion = motionOf(subject);
  const size = unitShadowSizeV7(measurement);
  const common = {
    subject,
    assetId: measurement.assetId,
    width: measurement.width,
    height: measurement.height,
    motion,
    size,
  };
  if (motion === "AFLOAT") return { ...common, shadow: null, ring: null };
  if (motion === "FLYER") {
    const shadow = flyerShadow(UNIT_SHADOW_FLYERS_V7[subject] ?? "");
    if (shadow === null) throw new Error(`${subject}: no flyer presentation`);
    return { ...common, shadow, ring: grown(shadow) };
  }
  const baseWidth = measurement.baseRight - measurement.baseLeft;
  let radiusX =
    size === "SMALL"
      ? baseWidth * UNIT_SHADOW_SMALL_WIDTH_SHARE_V7
      : clamp(
          baseWidth * UNIT_SHADOW_WIDTH_SHARE_V7,
          ...UNIT_SHADOW_RADIUS_BOUNDS_V7[size],
        );
  if (motion === "HOVER") radiusX *= UNIT_SHADOW_HOVER_SCALE_V7;
  const radiusY = radiusX * UNIT_SHADOW_ASPECT_V7;
  const footWidth = measurement.footRight - measurement.footLeft;
  const centre =
    footWidth >= FOOT_CENTRE_MIN_WIDTH
      ? (measurement.footLeft +
          measurement.footRight +
          measurement.baseLeft +
          measurement.baseRight) /
        4
      : (measurement.baseLeft + measurement.baseRight) / 2;
  const middle = measurement.width / 2;
  const x = clamp(
    centre,
    middle - UNIT_SHADOW_MAX_SHIFT_X_V7,
    middle + UNIT_SHADOW_MAX_SHIFT_X_V7,
  );
  const y =
    motion === "HOVER"
      ? measurement.contactY + (UNIT_SHADOW_HOVER_GAPS_V7[subject] ?? 0)
      : measurement.contactY - radiusY * UNIT_SHADOW_SINK_V7;
  const shadow = { x, y, radiusX, radiusY };
  return { ...common, shadow, ring: grown(shadow) };
}

/** Every measured unit subject's anchor, keyed by art subject. */
export const UNIT_SHADOW_TABLE_V7: Readonly<
  Partial<Record<ArtSubjectV7, UnitShadowAnchorV7>>
> = Object.fromEntries(
  (
    Object.entries(UNIT_SHADOW_MEASUREMENTS_V7) as [
      ArtSubjectV7,
      UnitShadowMeasurementV7,
    ][]
  ).map(([subject, measurement]) => [
    subject,
    deriveUnitShadowAnchorV7(subject, measurement),
  ]),
);

/**
 * The anchor of a unit drawn with `assetId`, or null when the subject has
 * none or another raster stands in (a fallback while the live raster
 * loads), which keeps the generic shadow.
 */
export function unitShadowAnchorV7(
  subject: ArtSubjectV7 | undefined,
  assetId: string | undefined,
): UnitShadowAnchorV7 | null {
  if (subject === undefined || assetId === undefined) return null;
  const anchor = UNIT_SHADOW_TABLE_V7[subject];
  return anchor !== undefined && anchor.assetId === assetId ? anchor : null;
}
