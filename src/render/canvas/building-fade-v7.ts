import type { FactionGrassIdV7 } from "./faction-grass-v7";

/**
 * Faded tile buildings (bead pulp_wars-2yc.61, docs/art/BUILDING_FADE.md).
 * The user, 2026-10-16: the sawmills, workshops and such should be "a
 * teensy bit more faded" so they read as background, the way trees, fruit
 * and animals already do (cute and legible but subtly backgroundy), while
 * cities keep standing out.
 *
 * In the live look the board draws every tile improvement (Farm, Lumber
 * Camp, Windmill, Sawmill, Forge, Workshop, Market, Port, Shipyard and each
 * faction's version of them) from a cached copy of its raster: each pixel's
 * colour is pulled a little toward its own grey, then the whole sprite a
 * little toward the mean colour of the ground of the territory it stands
 * in, as distant things take on the colour of the air. The dark outline
 * softens with the rest, the light still falls from the bottom-left (the
 * change is the same for every pixel, so the shading keeps its order), and
 * the silhouette and transparency are unchanged. Cities, villages, units,
 * Monuments (achievements, kept bold), the Mine on its mountain (the
 * mountain must match its neighbours), the Field Defense badge (a tactical
 * marker) and the build buttons in the tile dock keep their full strength.
 *
 * Everything is set here: the strengths, the chosen one, the grounds and
 * the switch. To turn it off: set BUILDING_FADE_V7 to null, or open the
 * game with `?building-fade=0`; `?building-fade=light|medium|strong` tries
 * another strength. The classic look never draws it.
 */

/** One strength of the fade: fractions kept, 1 is unchanged. */
export interface BuildingFadeV7 {
  /** Colour kept after mixing each pixel toward its own grey (0-1). */
  readonly saturation: number;
  /** Distance kept from the ground colour after the grey mix (0-1). */
  readonly contrast: number;
}

/** The strengths tried in the review (docs/art/BUILDING_FADE.md). */
export const BUILDING_FADE_STRENGTHS_V7 = {
  light: { saturation: 0.92, contrast: 0.88 },
  medium: { saturation: 0.85, contrast: 0.8 },
  strong: { saturation: 0.75, contrast: 0.7 },
} as const satisfies Readonly<Record<string, BuildingFadeV7>>;

export type BuildingFadeStrengthV7 = keyof typeof BUILDING_FADE_STRENGTHS_V7;

/** The live strength; null draws buildings exactly as before the bead. */
export const BUILDING_FADE_V7: BuildingFadeV7 | null =
  BUILDING_FADE_STRENGTHS_V7.medium;

export const BUILDING_FADE_PARAMETER_V7 = "building-fade";

export interface FadeGroundV7 {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * The mean colour of each territory ground (its baked tile, measured over
 * the opaque pixels of `assets/chibi/terrain/faction-grass/world` and the
 * Cult and Candy faction grass), and of the default Grass for the Human
 * and Ice Folk territories and for an improvement outside every territory.
 */
export const BUILDING_FADE_GROUNDS_V7: Readonly<
  Record<FactionGrassIdV7 | "NEUTRAL", FadeGroundV7>
> = {
  NEUTRAL: { r: 139, g: 185, b: 94 },
  CANDY: { r: 165, g: 218, b: 189 },
  GOBLIN: { r: 204, g: 184, b: 111 },
  DWARF: { r: 132, g: 146, b: 112 },
  DINOSAUR: { r: 101, g: 162, b: 90 },
  MARTIAN: { r: 179, g: 106, b: 69 },
  CULT: { r: 117, g: 128, b: 90 },
  UNDEAD: { r: 121, g: 114, b: 107 },
};

/** The ground a faded building is pulled toward. */
export function buildingFadeGroundV7(
  ground: FactionGrassIdV7 | null | undefined,
): FadeGroundV7 {
  return BUILDING_FADE_GROUNDS_V7[ground ?? "NEUTRAL"];
}

/**
 * The fade the page asks for: `?building-fade=0` (or `off`, `false`) none,
 * a strength's name that strength, anything else (or nothing) the live one.
 */
export function buildingFadeFromSearchV7(
  search?: string,
): BuildingFadeV7 | null {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(BUILDING_FADE_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return BUILDING_FADE_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return null;
  return Object.hasOwn(BUILDING_FADE_STRENGTHS_V7, text)
    ? BUILDING_FADE_STRENGTHS_V7[text as BuildingFadeStrengthV7]
    : BUILDING_FADE_V7;
}

/** A fade at a strength toward a ground, as the sprite cache takes it. */
export interface BuildingFadeToneV7 {
  readonly strength: BuildingFadeV7;
  readonly ground: FadeGroundV7;
}

/** A stable cache key for a tone ("" for none). */
export function buildingFadeKeyV7(tone: BuildingFadeToneV7 | null): string {
  if (tone === null) return "";
  const { strength, ground } = tone;
  return `fade:${strength.saturation}/${strength.contrast}/${ground.r},${ground.g},${ground.b}`;
}

/** Rec. 601 luma weights, as the saturation sliders use. */
const luma = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Fades RGBA pixels in place: each opaque or partly opaque pixel is mixed
 * toward its own grey, then toward the ground. Alpha is untouched.
 */
export function fadeBuildingPixelsInPlaceV7(
  pixels: Uint8ClampedArray,
  tone: BuildingFadeToneV7,
): Uint8ClampedArray {
  const { saturation, contrast } = tone.strength;
  const { ground } = tone;
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const grey = luma(r, g, b);
    pixels[index] = Math.round(
      ground.r + (grey + (r - grey) * saturation - ground.r) * contrast,
    );
    pixels[index + 1] = Math.round(
      ground.g + (grey + (g - grey) * saturation - ground.g) * contrast,
    );
    pixels[index + 2] = Math.round(
      ground.b + (grey + (b - grey) * saturation - ground.b) * contrast,
    );
  }
  return pixels;
}

/** The faded copy of RGBA pixels; the input is never modified. */
export function fadeBuildingPixelsV7(
  pixels: Uint8ClampedArray,
  tone: BuildingFadeToneV7,
): Uint8ClampedArray {
  return fadeBuildingPixelsInPlaceV7(new Uint8ClampedArray(pixels), tone);
}
