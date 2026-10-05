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
  return SETTLEMENT_SHADOW_ENABLED_V7;
}

/**
 * The shadow as shares of the sprite's drawn rectangle (a settlement fills
 * its 80 px cell). The contact ellipse lies under the lower part of the
 * sprite, where the buildings meet the ground, and shows as a rim round
 * their feet; the cast one is the same ellipse moved up and to the right.
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

/** The two ellipses under a settlement drawn at `sprite`, cast first. */
export function settlementShadowEllipsesV7(
  sprite: SettlementShadowRectV7,
): readonly SettlementShadowEllipseV7[] {
  const spec = SETTLEMENT_SHADOW_V7;
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

/** Draws the shadow of a settlement entry under its sprite's rectangle. */
export function drawSettlementShadowV7(
  context: CanvasRenderingContext2D,
  entry: { readonly kind: string; readonly artSubject?: string },
  sprite: SettlementShadowRectV7,
  sceneAlpha = 1,
): void {
  if (!hasSettlementShadowV7(entry)) return;
  context.save();
  context.globalAlpha *= sceneAlpha;
  for (const ellipse of settlementShadowEllipsesV7(sprite)) {
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
