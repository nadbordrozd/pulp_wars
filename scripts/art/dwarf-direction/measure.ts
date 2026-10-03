/**
 * Measurements of the Steampunk Dwarf art (bead pulp_wars-78i.5,
 * docs/art/factions/DWARF.md): the 32 px lineup of the spec (section
 * 16.4) and the readability table of the review. Colour differences are
 * CIE76 (about 10 is clear at a glance, 20 and more are different colours),
 * with the Machado 2009 colour-vision simulations of the Ice Folk study, so
 * every faction review measures alike.
 */
import path from "node:path";
import sharp from "sharp";
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import {
  loadRecords,
  productionLayout,
  readRaster,
  type BatchRecords,
} from "../chibi/pipeline";
import { candidateCell, cropRaster } from "../chibi/raster";
import {
  deltaE,
  hexOf,
  lab,
  simulateColour,
  type Rgb,
} from "../ice-folk-direction/colour";

export const DWARF_BATCH = "direction-dwarf";

export const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Opaque pixels darker than this are the outline and its near-black tones. */
export const OUTLINE_VALUE = 0.14;

export interface Swatch {
  readonly rgb: Rgb;
  readonly share: number;
}

export interface SwatchSet {
  readonly opaque: number;
  readonly body: number;
  readonly outline: number;
  readonly swatches: readonly Swatch[];
  readonly mean: Rgb;
}

/**
 * The colours of a sprite's body (opaque, not outline), binned to 4 bits a
 * channel and averaged per bin; the bins covering 90% of the body, largest
 * first (the naval review's measure).
 */
export function swatches(raster: RgbaRaster): SwatchSet {
  const bins = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >();
  let body = 0;
  let outline = 0;
  const sum = [0, 0, 0];
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const r = raster.data[o] ?? 0;
    const g = raster.data[o + 1] ?? 0;
    const b = raster.data[o + 2] ?? 0;
    if (rgbToHsv(r, g, b).value < OUTLINE_VALUE) {
      outline += 1;
      continue;
    }
    body += 1;
    sum[0] = (sum[0] ?? 0) + r;
    sum[1] = (sum[1] ?? 0) + g;
    sum[2] = (sum[2] ?? 0) + b;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
  const kept: Swatch[] = [];
  let covered = 0;
  for (const bin of sorted) {
    if (covered >= 0.9 * body) break;
    covered += bin.n;
    kept.push({
      rgb: [bin.r / bin.n, bin.g / bin.n, bin.b / bin.n],
      share: bin.n / Math.max(1, body),
    });
  }
  return {
    opaque: body + outline,
    body,
    outline,
    swatches: kept,
    mean: [
      (sum[0] ?? 0) / Math.max(1, body),
      (sum[1] ?? 0) / Math.max(1, body),
      (sum[2] ?? 0) / Math.max(1, body),
    ],
  };
}

export type View = "normal" | "deuteranopia" | "protanopia" | "grey";

/** The colour as a viewer sees it; `grey` keeps only the L* lightness. */
export function viewColour(rgb: Rgb, view: View): Rgb {
  if (view === "normal") return rgb;
  if (view === "grey") {
    const l = lab(rgb)[0];
    // A neutral grey of the same L*: compare lightness only.
    const y = l > 8 ? ((l + 16) / 116) ** 3 : l / 903.3;
    const s = y <= 0.0031308 ? y * 12.92 : 1.055 * y ** (1 / 2.4) - 0.055;
    const v = Math.round(Math.max(0, Math.min(1, s)) * 255);
    return [v, v, v];
  }
  return simulateColour(rgb, view);
}

/**
 * How far apart two sprites' colours are: each swatch of one to its
 * nearest swatch of the other, weighted by area, both ways, averaged.
 */
export function paletteDistance(
  a: readonly Swatch[],
  b: readonly Swatch[],
  view: View = "normal",
): number {
  const one = (from: readonly Swatch[], to: readonly Swatch[]): number => {
    const total = from.reduce((sum, swatch) => sum + swatch.share, 0);
    return (
      from.reduce(
        (sum, swatch) =>
          sum +
          swatch.share *
            Math.min(
              ...to.map((other) =>
                deltaE(
                  viewColour(swatch.rgb, view),
                  viewColour(other.rgb, view),
                ),
              ),
            ),
        0,
      ) / Math.max(total, 1e-9)
    );
  };
  return (one(a, b) + one(b, a)) / 2;
}

/**
 * Lightness distribution of the whole opaque sprite (outline included) in
 * ten L* bins, as shares.
 */
export function lightnessHistogram(raster: RgbaRaster): readonly number[] {
  const bins = Array.from({ length: 10 }, () => 0);
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const l = lab([
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    ])[0];
    const bin = Math.min(9, Math.max(0, Math.floor(l / 10)));
    bins[bin] = (bins[bin] ?? 0) + 1;
    count += 1;
  }
  return bins.map((value) => value / Math.max(1, count));
}

/**
 * Earth mover's distance between two lightness histograms, in L* units:
 * how much lightness must move to turn one greyscale sprite into the
 * other's distribution (0 the same, 10 one whole band apart everywhere).
 */
export function lightnessDistance(
  a: readonly number[],
  b: readonly number[],
): number {
  let carried = 0;
  let total = 0;
  for (let index = 0; index < a.length; index += 1) {
    carried += (a[index] ?? 0) - (b[index] ?? 0);
    total += Math.abs(carried);
  }
  return total * 10;
}

/** Mean L* of the opaque pixels. */
export function meanLightness(raster: RgbaRaster): number {
  let sum = 0;
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    sum += lab([
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    ])[0];
    count += 1;
  }
  return sum / Math.max(1, count);
}

/**
 * Silhouette overlap: the opaque masks bottom-centred on one canvas,
 * intersection over union (1 the same shape, 0 nothing shared).
 */
export function silhouetteOverlap(a: RgbaRaster, b: RgbaRaster): number {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const at = (raster: RgbaRaster, x: number, y: number): boolean => {
    const sx = x - Math.floor((width - raster.width) / 2);
    const sy = y - (height - raster.height);
    if (sx < 0 || sy < 0 || sx >= raster.width || sy >= raster.height)
      return false;
    return (raster.data[(sy * raster.width + sx) * 4 + 3] ?? 0) >= 128;
  };
  let both = 0;
  let either = 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const left = at(a, x, y);
      const right = at(b, x, y);
      if (left && right) both += 1;
      if (left || right) either += 1;
    }
  return both / Math.max(1, either);
}

export interface PairMeasure {
  readonly palette: number;
  readonly deuteranopia: number;
  readonly protanopia: number;
  readonly greyPalette: number;
  readonly lightness: number;
  readonly meanLightness: readonly [number, number];
  readonly silhouette: number;
  readonly distinct: boolean;
  readonly reasons: readonly string[];
}

/**
 * Thresholds of the lineup verdict (DWARF.md, "The 32 px lineup"): a pair
 * is told apart in colour when its palette distance reaches `palette` for
 * normal vision and `simulated` for both colour-vision simulations, and in
 * greyscale when its lightness distributions differ by at least
 * `lightness` L* or its silhouettes overlap by at most `silhouette`. The
 * lineup calibrates them on the accepted factions (lineup.ts). The
 * measure weighs every pixel alike, so a small unique colour (a beard, a
 * lamp) barely moves it: it is a conservative test.
 */
export interface LineupThresholds {
  readonly palette: number;
  readonly simulated: number;
  readonly lightness: number;
  readonly silhouette: number;
}

export function measurePair(
  a: RgbaRaster,
  b: RgbaRaster,
  thresholds: LineupThresholds,
): PairMeasure {
  const left = swatches(a).swatches;
  const right = swatches(b).swatches;
  const palette = paletteDistance(left, right);
  const deuteranopia = paletteDistance(left, right, "deuteranopia");
  const protanopia = paletteDistance(left, right, "protanopia");
  const greyPalette = paletteDistance(left, right, "grey");
  const lightness = lightnessDistance(
    lightnessHistogram(a),
    lightnessHistogram(b),
  );
  const silhouette = silhouetteOverlap(a, b);
  const reasons: string[] = [];
  const colour =
    palette >= thresholds.palette &&
    Math.min(deuteranopia, protanopia) >= thresholds.simulated;
  if (!colour) reasons.push("colour too close");
  const grey =
    lightness >= thresholds.lightness || silhouette <= thresholds.silhouette;
  if (!grey) reasons.push("greyscale too close");
  return {
    palette: round1(palette),
    deuteranopia: round1(deuteranopia),
    protanopia: round1(protanopia),
    greyPalette: round1(greyPalette),
    lightness: round1(lightness),
    meanLightness: [round1(meanLightness(a)), round1(meanLightness(b))],
    silhouette: Math.round(silhouette * 100) / 100,
    distinct: colour && grey,
    reasons,
  };
}

/** The sprite resampled by `factor` as the board does at a lower zoom. */
export async function resampled(
  raster: RgbaRaster,
  factor: number,
): Promise<RgbaRaster> {
  const width = Math.max(1, Math.round(raster.width * factor));
  const height = Math.max(1, Math.round(raster.height * factor));
  const { data } = await sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .resize(width, height, { kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width, height, data: new Uint8Array(data) };
}

/** The sprite in greyscale (L* kept), alpha unchanged. */
export function greyscale(raster: RgbaRaster): RgbaRaster {
  const data = new Uint8Array(raster.data);
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    const grey = viewColour(
      [data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0],
      "grey",
    );
    data[o] = grey[0];
    data[o + 1] = grey[1];
    data[o + 2] = grey[2];
  }
  return { width: raster.width, height: raster.height, data };
}

export async function dwarfRecords(
  root: string,
  batch = DWARF_BATCH,
): Promise<BatchRecords> {
  return loadRecords(productionLayout(root, batch), batch);
}

/** One recorded candidate of a recipe, from its raw sheet. */
export async function candidateOfRecipe(
  root: string,
  records: BatchRecords,
  recipeId: string,
  candidate = 0,
): Promise<RgbaRaster> {
  const recipe = records.recipes[recipeId];
  if (recipe?.rawSheet === undefined || recipe.candidateSize === undefined)
    throw new Error(`${recipeId}: no raw sheet`);
  return cropRaster(await readRaster(path.join(root, recipe.rawSheet)), {
    ...candidateCell(
      candidate,
      recipe.candidateCount ?? 1,
      recipe.candidateSize,
    ),
    ...recipe.candidateSize,
  });
}

export const swatchText = (swatch: Swatch): string =>
  `${hexOf(swatch.rgb)} ${round1(swatch.share * 100)}%`;
