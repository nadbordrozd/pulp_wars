/**
 * The `accent` derivation step (bead pulp_wars-3tq.12, proven by the Undead
 * direction study of pulp_wars-3tq.11): a deterministic recolour of a
 * sprite's accent pixels, applied after the class derivation.
 *
 * Every Undead sprite of the new direction is generated with PixelLab's
 * "bright violet", which is a magenta (hue about 293). No other material of
 * the look comes near that colour band (bone is hue 30 to 55; flesh, iron
 * and cloth are below saturation 0.3), so the accent pixels are found by
 * colour alone and no mask is drawn by hand. The step moves them to the
 * faction's true violet and lightens thin trim that sits on dark cloth,
 * where the study measured too little contrast.
 *
 * The preset is named in the batch manifest (`accent`), stored whole in the
 * asset record, and `art:validate` re-derives the master from the recorded
 * candidate, so the master is never a hand-made file.
 */
import { rgbToHsv, type RgbaRaster } from "./owner-mask";

export interface AccentSpec {
  /** The colour band (HSV) of the generated accent. */
  readonly band: {
    readonly hueFrom: number;
    readonly hueTo: number;
    readonly saturationMin: number;
    readonly valueMin: number;
    /** The middle of the generated hues; `hueSpread` scales around it. */
    readonly hueCentre: number;
  };
  /** Target hue in degrees for a source pixel at the band's centre. */
  readonly hue: number;
  /** How much of the source's hue variation (dark to light) is kept. */
  readonly hueSpread: number;
  /**
   * Thin trim on dark cloth: an accent pixel with at most
   * `maxAccentNeighbours` accent pixels and at least `minDarkNeighbours`
   * dark opaque pixels (value at most `darkValueMax`) among its eight
   * neighbours is lightened: its saturation is capped and its value raised.
   */
  readonly trim?: {
    readonly maxAccentNeighbours: number;
    readonly minDarkNeighbours: number;
    readonly darkValueMax: number;
    readonly saturationMax: number;
    readonly valueMin: number;
  };
  /** Every accent pixel: a floor for the value, so no glow tone is darker. */
  readonly floor?: {
    readonly valueMin: number;
  };
  /**
   * Every accent pixel (bead pulp_wars-7g3.5): the saturation becomes
   * `min(max, saturation * scale + add)`, for an accent that PixelLab draws
   * too pale. Omitted, the saturation is kept, as in the earlier presets.
   */
  readonly saturation?: {
    readonly scale: number;
    readonly add: number;
    readonly max: number;
  };
}

/**
 * Presets by name. `undead-violet` is the accent the user chose on
 * 2026-10-02: hue 274 (lit `#a221ee`), with hems, hood edges and other
 * one-pixel trim on dark cloth lightened to about `#b55cf5`.
 */
export const ACCENT_PRESETS = {
  "undead-violet": {
    band: {
      hueFrom: 250,
      hueTo: 320,
      saturationMin: 0.4,
      valueMin: 0.2,
      hueCentre: 285,
    },
    hue: 274,
    hueSpread: 0.5,
    trim: {
      maxAccentNeighbours: 2,
      minDarkNeighbours: 3,
      darkValueMax: 0.3,
      saturationMax: 0.62,
      valueMin: 0.96,
    },
  },
  /**
   * The Martian accent (bead pulp_wars-t6s.6): hot magenta at hue 322 (lit
   * `#ff2fb0`). PixelLab draws "hot magenta pink" anywhere from a purple
   * magenta (hue 290) to a pink red (hue 345); the step pulls all of it to
   * 322 with a narrow spread (315 to 328), clear of the Undead violet (274)
   * and of the owner key red (340 to 5). Chrome, gunmetal, glass and the
   * lavender-grey skin are below saturation 0.4 and are never touched. No
   * trim rule: magenta on gunmetal already has a contrast above 4.
   */
  "martian-magenta": {
    band: {
      hueFrom: 285,
      hueTo: 350,
      saturationMin: 0.4,
      valueMin: 0.25,
      hueCentre: 320,
    },
    hue: 322,
    hueSpread: 0.2,
  },
  /**
   * The Ice Folk accent (bead pulp_wars-7g3.5, ICE_FOLK.md): a deep ice
   * blue at hue 205 (lit about `#36a5f5`). PixelLab draws "ice blue" as a
   * pale glacier cyan (hue 185 to 200, saturation about 0.3), which measures
   * 10 from Shallow Water and 2 from the Martian glass for a deuteranope; an
   * edit asking for a deeper blue drew a dark royal blue (`#0813af`). The
   * step finds the drawn ice by colour (hue 175 to 218, saturation at least
   * 0.2, value at least 0.62) and moves it to hue 205 with its saturation
   * raised. Fur, hide, bone, skin and the slate faces are below saturation
   * 0.2 or below value 0.62 (a few lit tones of a slate face are
   * caught and turn a little bluer); white highlights stay white; the Witch's navy
   * robe is darker and bluer (hue 225 and more) and is never touched.
   */
  "ice-folk-blue": {
    band: {
      hueFrom: 175,
      hueTo: 218,
      saturationMin: 0.2,
      valueMin: 0.62,
      hueCentre: 195,
    },
    hue: 205,
    hueSpread: 0.3,
    saturation: { scale: 1.4, add: 0.3, max: 0.95 },
  },
} as const satisfies Readonly<Record<string, AccentSpec>>;

export type AccentPresetName = keyof typeof ACCENT_PRESETS;

export function accentPreset(name: string): AccentSpec | undefined {
  return Object.hasOwn(ACCENT_PRESETS, name)
    ? ACCENT_PRESETS[name as AccentPresetName]
    : undefined;
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

export function isAccentColour(
  spec: AccentSpec,
  r: number,
  g: number,
  b: number,
): boolean {
  const { hue, saturation, value } = rgbToHsv(r, g, b);
  return (
    hue >= spec.band.hueFrom &&
    hue <= spec.band.hueTo &&
    saturation >= spec.band.saturationMin &&
    value >= spec.band.valueMin
  );
}

export interface AccentResult {
  readonly raster: RgbaRaster;
  /** Opaque pixels in the accent band. */
  readonly accentPixels: number;
  /** Accent pixels lightened as thin trim on dark cloth. */
  readonly trimPixels: number;
  readonly opaquePixels: number;
}

/** Recolours the accent pixels of `base`; every other pixel is copied. */
export function accentRaster(base: RgbaRaster, spec: AccentSpec): AccentResult {
  const { width, height } = base;
  const source = base.data;
  const data = new Uint8Array(source);
  const opaque = (index: number): boolean =>
    (source[index * 4 + 3] ?? 0) >= 128;
  const accent = new Uint8Array(width * height);
  const dark = new Uint8Array(width * height);
  let opaquePixels = 0;
  let accentPixels = 0;
  for (let index = 0; index < width * height; index += 1) {
    if (!opaque(index)) continue;
    opaquePixels += 1;
    const r = source[index * 4] ?? 0;
    const g = source[index * 4 + 1] ?? 0;
    const b = source[index * 4 + 2] ?? 0;
    if (isAccentColour(spec, r, g, b)) {
      accent[index] = 1;
      accentPixels += 1;
    } else if (
      spec.trim !== undefined &&
      Math.max(r, g, b) / 255 <= spec.trim.darkValueMax
    )
      dark[index] = 1;
  }
  let trimPixels = 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (accent[index] !== 1) continue;
      const offset = index * 4;
      const hsv = rgbToHsv(
        source[offset] ?? 0,
        source[offset + 1] ?? 0,
        source[offset + 2] ?? 0,
      );
      const hue =
        spec.hue + (hue360(hsv.hue) - spec.band.hueCentre) * spec.hueSpread;
      let { saturation, value } = hsv;
      if (spec.floor !== undefined && value < spec.floor.valueMin)
        value = spec.floor.valueMin;
      if (spec.saturation !== undefined)
        saturation = Math.min(
          spec.saturation.max,
          saturation * spec.saturation.scale + spec.saturation.add,
        );
      if (spec.trim !== undefined) {
        let accentNear = 0;
        let darkNear = 0;
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            accentNear += accent[ny * width + nx] ?? 0;
            darkNear += dark[ny * width + nx] ?? 0;
          }
        if (
          accentNear <= spec.trim.maxAccentNeighbours &&
          darkNear >= spec.trim.minDarkNeighbours
        ) {
          trimPixels += 1;
          saturation = Math.min(saturation, spec.trim.saturationMax);
          value = Math.max(value, spec.trim.valueMin);
        }
      }
      const out = hsvToRgb(hue, saturation, value);
      data[offset] = out[0];
      data[offset + 1] = out[1];
      data[offset + 2] = out[2];
    }
  return {
    raster: { width, height, data },
    accentPixels,
    trimPixels,
    opaquePixels,
  };
}

function hue360(hue: number): number {
  return ((hue % 360) + 360) % 360;
}
