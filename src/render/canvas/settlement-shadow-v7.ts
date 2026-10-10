/**
 * A TRY (bead pulp_wars-2yc.8, docs/art/SETTLEMENT_SHADOW.md). The user,
 * 2026-10-05: "try to add a drop shadow to city sprites so they are less
 * floaty."
 *
 * In the live look of the CHIBI art set a city or a village stands on a
 * soft ground shadow, drawn under its sprite on whatever ground the cell
 * has (Grass of any faction, Snow, a coast). It is the units' ground
 * shadow grown to a settlement: the same colour, a flat ellipse under the
 * buildings' footprint (the contact), and a second, fainter ellipse a
 * little up and to the right of it (the cast), because the sun is at the
 * bottom left. Both are short: the shadow says "this stands on the
 * ground", it does not draw a second shape.
 *
 * To turn it off: set SETTLEMENT_SHADOW_ENABLED_V7 to false, or open the
 * game with `?city-shadow=0`. The classic look and the LEGACY art set
 * never draw it.
 */

import {
  SETTLEMENT_SHADOW_MEASUREMENTS_V7,
  type SettlementShadowMeasurementV7,
} from "./settlement-shadow-measurements-v7.generated";

/** The master switch. False draws settlements exactly as before the bead. */
export const SETTLEMENT_SHADOW_ENABLED_V7 = true;

/** `?city-shadow=0` (or `off`, `false`) turns it off, `=1` on. */
export const SETTLEMENT_SHADOW_PARAMETER_V7 = "city-shadow";

export function settlementShadowEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(SETTLEMENT_SHADOW_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return SETTLEMENT_SHADOW_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  if (text === SETTLEMENT_SHADOW_PLAIN_VALUE_V7) return true;
  return SETTLEMENT_SHADOW_ENABLED_V7;
}

/**
 * `?city-shadow=plain` draws the one shape every settlement had before
 * the shadows were fitted to each raster (bead pulp_wars-2yc.12): the
 * "before" of the review.
 */
export const SETTLEMENT_SHADOW_PLAIN_VALUE_V7 = "plain";

export function settlementShadowPlainV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  try {
    return (
      new URLSearchParams(query)
        .get(SETTLEMENT_SHADOW_PARAMETER_V7)
        ?.trim()
        .toLowerCase() === SETTLEMENT_SHADOW_PLAIN_VALUE_V7
    );
  } catch {
    return false;
  }
}

/**
 * The shadow of a settlement whose raster was not measured (a stand-in
 * raster while the live one loads), as shares of the sprite's drawn
 * rectangle: the one shape every city had before bead pulp_wars-2yc.12.
 * The contact ellipse lies under the lower part of the sprite and the cast
 * one is the same ellipse moved up and to the right. The two colours are
 * every settlement's.
 */
export const SETTLEMENT_SHADOW_V7 = {
  /** Centre of the contact ellipse: right of the middle, above the bottom. */
  centreX: 0.52,
  centreY: 0.74,
  radiusX: 0.47,
  radiusY: 0.22,
  /** The cast ellipse: this far up and right, and this much smaller. */
  castX: 0.07,
  castY: -0.06,
  castScale: 0.96,
  /** The units' ground shadow colour, and the fainter cast. */
  contact: "rgba(18, 22, 30, 0.24)",
  cast: "rgba(18, 22, 30, 0.12)",
} as const;

/**
 * How a measured settlement's shadow follows its footprint (bead
 * pulp_wars-2yc.12). The measurement gives the footprint's two ends, the
 * ground line there and the contact line in front
 * (settlement-shadow-measurements-v7.generated.ts); the ellipse through
 * them is the footprint's outer bound, and the sprite's lower outline
 * fills only `fullness` of it. The contact shadow is that ellipse shrunk
 * to the outline and grown by a rim, so what shows is a thin dark edge
 * round the feet of this city's own buildings. The cast is the contact
 * moved up and to the right (the sun is at the bottom left) and stretched,
 * so it shows past the buildings' right-hand end.
 *
 * Lengths are master pixels; the board scales them with the sprite.
 */
export const SETTLEMENT_SHADOW_FIT_V7 = {
  /** The rim of the contact shadow outside the fitted outline. */
  rim: 2.5,
  /** Fullness is trusted within these bounds. */
  fullness: [0.7, 1],
  /** Depth of the footprint (front to centre) as a share of its half-width. */
  depth: [0.3, 0.58],
  /** The cast: moved by these shares of the half-width, and this much wider. */
  castX: 0.2,
  castY: -0.1,
  castStretchX: 1.06,
  castStretchY: 1,
} as const;

export interface SettlementShadowRectV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SettlementShadowEllipseV7 {
  readonly centreX: number;
  readonly centreY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly fill: string;
}

/** True for the plan entries that stand on the shadow. */
export function hasSettlementShadowV7(entry: {
  readonly kind: string;
  readonly artSubject?: string;
}): boolean {
  return (
    entry.kind === "CITY" ||
    (entry.kind === "SITE" && entry.artSubject === "SITE:VILLAGE")
  );
}

/** An ellipse in master pixels from the raster's top-left corner. */
export interface SettlementShadowMasterEllipseV7 {
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/** The contact and cast ellipses of a measured raster. */
export interface SettlementShadowAnchorV7 {
  readonly assetId: string;
  readonly width: number;
  readonly height: number;
  readonly contact: SettlementShadowMasterEllipseV7;
  readonly cast: SettlementShadowMasterEllipseV7;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** The anchor of one measured raster (see SETTLEMENT_SHADOW_FIT_V7). */
export function deriveSettlementShadowAnchorV7(
  assetId: string,
  measurement: SettlementShadowMeasurementV7,
): SettlementShadowAnchorV7 {
  const fit = SETTLEMENT_SHADOW_FIT_V7;
  const half = (measurement.right - measurement.left) / 2;
  const x = (measurement.left + measurement.right) / 2;
  // The ends of a footprint lie on one ground row. Where they differ, the
  // higher end is a roof, a banner or a mast hanging over the edge: the
  // lower one is the ground.
  const groundY = Math.max(measurement.leftY, measurement.rightY);
  const depth = clamp(
    measurement.contactY - groundY,
    half * fit.depth[0],
    half * fit.depth[1],
  );
  const y = measurement.contactY - depth;
  const fullness = clamp(
    measurement.fullness,
    fit.fullness[0],
    fit.fullness[1],
  );
  const contact = {
    x,
    y,
    radiusX: half * fullness + fit.rim,
    radiusY: depth * fullness + fit.rim,
  };
  return {
    assetId,
    width: measurement.width,
    height: measurement.height,
    contact,
    cast: {
      x: x + half * fit.castX,
      y: y + half * fit.castY,
      radiusX: contact.radiusX * fit.castStretchX,
      radiusY: contact.radiusY * fit.castStretchY,
    },
  };
}

/** Every measured settlement raster's anchor, keyed by asset id. */
export const SETTLEMENT_SHADOW_TABLE_V7: Readonly<
  Record<string, SettlementShadowAnchorV7>
> = Object.fromEntries(
  Object.entries(SETTLEMENT_SHADOW_MEASUREMENTS_V7).map(
    ([assetId, measurement]) => [
      assetId,
      deriveSettlementShadowAnchorV7(assetId, measurement),
    ],
  ),
);

/**
 * The two ellipses under a settlement drawn at `sprite` with the raster
 * `assetId`, cast first: fitted to that raster's own footprint, or the one
 * generic shape when the raster was not measured.
 */
export function settlementShadowEllipsesV7(
  sprite: SettlementShadowRectV7,
  assetId?: string,
): readonly SettlementShadowEllipseV7[] {
  const spec = SETTLEMENT_SHADOW_V7;
  const anchor =
    assetId === undefined ? undefined : SETTLEMENT_SHADOW_TABLE_V7[assetId];
  if (anchor !== undefined) {
    const scaleX = sprite.width / anchor.width;
    const scaleY = sprite.height / anchor.height;
    const placed = (
      ellipse: SettlementShadowMasterEllipseV7,
      fill: string,
    ): SettlementShadowEllipseV7 => ({
      centreX: sprite.x + ellipse.x * scaleX,
      centreY: sprite.y + ellipse.y * scaleY,
      radiusX: ellipse.radiusX * scaleX,
      radiusY: ellipse.radiusY * scaleY,
      fill,
    });
    return [
      placed(anchor.cast, spec.cast),
      placed(anchor.contact, spec.contact),
    ];
  }
  const centreX = sprite.x + sprite.width * spec.centreX;
  const centreY = sprite.y + sprite.height * spec.centreY;
  const radiusX = sprite.width * spec.radiusX;
  const radiusY = sprite.width * spec.radiusY;
  return [
    {
      centreX: centreX + sprite.width * spec.castX,
      centreY: centreY + sprite.height * spec.castY,
      radiusX: radiusX * spec.castScale,
      radiusY: radiusY * spec.castScale,
      fill: spec.cast,
    },
    { centreX, centreY, radiusX, radiusY, fill: spec.contact },
  ];
}

/**
 * Draws the shadow of a settlement entry under its sprite's rectangle;
 * `assetId` is the raster the sprite is drawn with.
 */
export function drawSettlementShadowV7(
  context: CanvasRenderingContext2D,
  entry: { readonly kind: string; readonly artSubject?: string },
  sprite: SettlementShadowRectV7,
  sceneAlpha = 1,
  assetId?: string,
): void {
  if (!hasSettlementShadowV7(entry)) return;
  context.save();
  context.globalAlpha *= sceneAlpha;
  for (const ellipse of settlementShadowEllipsesV7(sprite, assetId)) {
    context.beginPath();
    context.ellipse(
      ellipse.centreX,
      ellipse.centreY,
      ellipse.radiusX,
      ellipse.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = ellipse.fill;
    context.fill();
  }
  context.restore();
}
