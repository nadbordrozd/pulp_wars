/**
 * The accent derivation of the Undead direction study (bead
 * pulp_wars-3tq.11): a deterministic remap of the accent pixels of a base
 * sprite, so that the violet, cyan and green options of one unit differ in
 * nothing but the accent colour.
 *
 * Every base sprite is generated with a magenta-violet accent (PixelLab's
 * "bright violet": hue 265 to 296, saturation above 0.55). No other
 * material of the look comes near that band (bone is hue 30 to 50, flesh
 * and iron are below saturation 0.2), so the accent pixels are found by
 * colour alone and no mask is drawn by hand.
 */
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";

/** The colour band of the generated accent. */
export const ACCENT_SOURCE_BAND = {
  hueFrom: 250,
  hueTo: 320,
  saturationMin: 0.4,
  valueMin: 0.2,
  /** The middle of the generated hues; `hueSpread` scales around it. */
  hueCentre: 285,
} as const;

export type UndeadAccentV7 = "violet" | "cyan" | "green";

export interface AccentRemap {
  /** Target hue in degrees for a source pixel at the band's centre. */
  readonly hue: number;
  /** How much of the source's hue variation (dark to light) is kept. */
  readonly hueSpread: number;
  /** Multiplier of the source saturation. */
  readonly saturation: number;
  /** Multiplier of the source value. */
  readonly value: number;
}

/**
 * The three options. Violet is moved from PixelLab's magenta (about 290
 * degrees) to a true violet; cyan and green keep less of the hue spread, so
 * the dark tones do not drift to blue or to yellow-green.
 */
export const ACCENT_REMAPS: Readonly<Record<UndeadAccentV7, AccentRemap>> = {
  violet: { hue: 274, hueSpread: 0.5, saturation: 1, value: 1 },
  cyan: { hue: 187, hueSpread: 0.3, saturation: 1, value: 1 },
  green: { hue: 128, hueSpread: 0.3, saturation: 1, value: 1 },
};

export function isAccentPixel(r: number, g: number, b: number): boolean {
  const { hue, saturation, value } = rgbToHsv(r, g, b);
  return (
    hue >= ACCENT_SOURCE_BAND.hueFrom &&
    hue <= ACCENT_SOURCE_BAND.hueTo &&
    saturation >= ACCENT_SOURCE_BAND.saturationMin &&
    value >= ACCENT_SOURCE_BAND.valueMin
  );
}

export function hsvToRgb(
  hue: number,
  saturation: number,
  value: number,
): readonly [number, number, number] {
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = value * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = value - c;
  const [r, g, b] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function remapAccentColour(
  rgb: readonly [number, number, number],
  remap: AccentRemap,
): readonly [number, number, number] {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return hsvToRgb(
    remap.hue + (hue - ACCENT_SOURCE_BAND.hueCentre) * remap.hueSpread,
    Math.min(1, saturation * remap.saturation),
    Math.min(1, value * remap.value),
  );
}

export interface AccentResult {
  readonly raster: RgbaRaster;
  /** Opaque pixels in the accent band. */
  readonly accentPixels: number;
  readonly opaquePixels: number;
}

/** Recolours the accent pixels of `base`; every other pixel is copied. */
export function remapAccent(
  base: RgbaRaster,
  remap: AccentRemap,
): AccentResult {
  const data = new Uint8Array(base.data);
  let accentPixels = 0;
  let opaquePixels = 0;
  for (let index = 0; index < base.width * base.height; index += 1) {
    const offset = index * 4;
    if ((data[offset + 3] ?? 0) < 128) continue;
    opaquePixels += 1;
    const rgb = [
      data[offset] ?? 0,
      data[offset + 1] ?? 0,
      data[offset + 2] ?? 0,
    ] as const;
    if (!isAccentPixel(rgb[0], rgb[1], rgb[2])) continue;
    accentPixels += 1;
    const out = remapAccentColour(rgb, remap);
    data[offset] = out[0];
    data[offset + 1] = out[1];
    data[offset + 2] = out[2];
  }
  return {
    raster: { width: base.width, height: base.height, data },
    accentPixels,
    opaquePixels,
  };
}
