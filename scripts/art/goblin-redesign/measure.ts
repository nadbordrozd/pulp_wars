/**
 * Value measurements of the Goblin redesign study (bead pulp_wars-wrn.1):
 * how dark a sprite is, how its pixels spread over lightness bands, how
 * much of it carries its faction colour, and how far it sits from the
 * ground. CIE L* (D65) throughout; ink is the near-black outline.
 */
import type { RgbaRaster } from "../chibi/owner-mask";
import { deltaE, lab, rgbOf, type Rgb } from "../ice-folk-direction/colour";
import { isInkRgb } from "./recolour";

export interface ValueMetricsV7 {
  readonly opaque: number;
  /** Share of opaque pixels that are pure-black outline ink. */
  readonly ink: number;
  /** Shares of the non-ink pixels per band of L*. */
  readonly dark: number; // L* < 35, ink excluded
  readonly mid: number; // 35 <= L* < 55
  readonly light: number; // 55 <= L* < 75
  readonly bright: number; // L* >= 75
  /** Mean, 10th and 90th percentile L* of the non-ink pixels. */
  readonly meanLightness: number;
  readonly p10: number;
  readonly p90: number;
  /** Mean chroma (C*ab) of the non-ink pixels. */
  readonly meanChroma: number;
  /** Share of opaque pixels within CIE76 25 of the faction colour. */
  readonly factionColour: number;
  /** Mean L* of the non-ink pixels minus the ground's L*. */
  readonly againstGround: number;
  /** Bounding box of the opaque pixels. */
  readonly width: number;
  readonly height: number;
  /** Lightness histogram, 10 bins of 10 L* each, of non-ink pixels. */
  readonly histogram: readonly number[];
}

const round = (value: number, places = 1): number =>
  Math.round(value * 10 ** places) / 10 ** places;

export function valueMetricsV7(
  raster: RgbaRaster,
  factionColour: string,
  ground: Rgb,
): ValueMetricsV7 {
  const faction = rgbOf(factionColour);
  const groundLightness = lab(ground)[0];
  const lightness: number[] = [];
  let opaque = 0;
  let ink = 0;
  let chroma = 0;
  let near = 0;
  let left = raster.width;
  let right = -1;
  let top = raster.height;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      const o = (y * raster.width + x) * 4;
      if ((raster.data[o + 3] ?? 0) < 128) continue;
      opaque += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      const rgb: Rgb = [
        raster.data[o] ?? 0,
        raster.data[o + 1] ?? 0,
        raster.data[o + 2] ?? 0,
      ];
      if (deltaE(rgb, faction) <= 25) near += 1;
      const [l, a, b] = lab(rgb);
      if (isInkRgb(rgb)) {
        ink += 1;
        continue;
      }
      lightness.push(l);
      chroma += Math.hypot(a, b);
    }
  const n = Math.max(1, lightness.length);
  const sorted = [...lightness].sort((a, b) => a - b);
  const share = (test: (l: number) => boolean): number =>
    round(lightness.filter(test).length / n, 3);
  const histogram = Array.from({ length: 10 }, (_, bin) =>
    round(
      lightness.filter((l) => Math.min(9, Math.floor(l / 10)) === bin).length /
        n,
      3,
    ),
  );
  const mean = lightness.reduce((sum, l) => sum + l, 0) / n;
  return {
    opaque,
    ink: round(ink / Math.max(1, opaque), 3),
    dark: share((l) => l < 35),
    mid: share((l) => l >= 35 && l < 55),
    light: share((l) => l >= 55 && l < 75),
    bright: share((l) => l >= 75),
    meanLightness: round(mean),
    p10: round(sorted[Math.floor(0.1 * (sorted.length - 1))] ?? 0),
    p90: round(sorted[Math.floor(0.9 * (sorted.length - 1))] ?? 0),
    meanChroma: round(chroma / n),
    factionColour: round(near / Math.max(1, opaque), 3),
    againstGround: round(mean - groundLightness),
    width: right - left + 1,
    height: bottom - top + 1,
    histogram,
  };
}

/** The mean of each numeric metric over several sprites. */
export function meanMetricsV7(
  metrics: readonly ValueMetricsV7[],
): Omit<ValueMetricsV7, "histogram" | "opaque" | "width" | "height"> {
  const mean = (pick: (m: ValueMetricsV7) => number, places = 1): number =>
    round(
      metrics.reduce((sum, m) => sum + pick(m), 0) /
        Math.max(1, metrics.length),
      places,
    );
  return {
    ink: mean((m) => m.ink, 3),
    dark: mean((m) => m.dark, 3),
    mid: mean((m) => m.mid, 3),
    light: mean((m) => m.light, 3),
    bright: mean((m) => m.bright, 3),
    meanLightness: mean((m) => m.meanLightness),
    p10: mean((m) => m.p10),
    p90: mean((m) => m.p90),
    meanChroma: mean((m) => m.meanChroma),
    factionColour: mean((m) => m.factionColour, 3),
    againstGround: mean((m) => m.againstGround),
  };
}
