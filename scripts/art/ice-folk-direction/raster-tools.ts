/**
 * Small raster helpers for the Ice Folk review and study (bead
 * pulp_wars-7g3.5): blank canvases, alpha-over blits with an integer
 * nearest-neighbour scale, labelled PNG sheets, and reading a recorded
 * candidate of the batch straight from its raw sheet.
 */
import { writeFile } from "node:fs/promises";
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
import type { Rgb } from "./colour";

export const BATCH = "direction-ice-folk";

export interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export function blank(width: number, height: number, rgb: Rgb): Canvas {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    data.set([rgb[0], rgb[1], rgb[2], 255], index * 4);
  return { width, height, data };
}

/** Alpha-over blit with an integer nearest-neighbour scale. */
export function blit(
  target: Canvas,
  source: RgbaRaster | Canvas,
  left: number,
  top: number,
  scale = 1,
  opacity = 1,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = Math.round(left) + x;
      const ty = Math.round(top) + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s =
        (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const alpha = ((source.data[s + 3] ?? 0) / 255) * opacity;
      if (alpha === 0) continue;
      const t = (ty * target.width + tx) * 4;
      for (let channel = 0; channel < 3; channel += 1)
        target.data[t + channel] = Math.round(
          (source.data[s + channel] ?? 0) * alpha +
            (target.data[t + channel] ?? 0) * (1 - alpha),
        );
    }
}

export function fill(
  target: Canvas,
  left: number,
  top: number,
  width: number,
  height: number,
  rgb: Rgb,
): void {
  blit(target, blank(width, height, rgb), left, top);
}

export interface Label {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly size?: number;
  readonly fill?: string;
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function writeSheet(
  file: string,
  canvas: Canvas,
  labels: readonly Label[],
): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">${labels
    .map(
      (label) =>
        `<text x="${label.left}" y="${label.top + (label.size ?? 14)}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size ?? 14}" font-weight="700" fill="${label.fill ?? "#f4f1e8"}">${escapeXml(label.text)}</text>`,
    )
    .join("")}</svg>`;
  const png = await sharp(Buffer.from(canvas.data), {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, png);
}

export async function batchRecords(root: string): Promise<BatchRecords> {
  return loadRecords(productionLayout(root, BATCH), BATCH);
}

/** One recorded candidate of a recipe of the batch, from its raw sheet. */
export async function recordedCandidate(
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

/** Mean colour of the opaque pixels (optionally only the light ones). */
export function meanColour(raster: RgbaRaster, lightOnly = false): Rgb {
  const sum = [0, 0, 0];
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const rgb = [
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    ];
    if (lightOnly && Math.max(...rgb) / 255 < 0.7) continue;
    for (let channel = 0; channel < 3; channel += 1)
      sum[channel] = (sum[channel] ?? 0) + (rgb[channel] ?? 0);
    count += 1;
  }
  return [
    (sum[0] ?? 0) / Math.max(1, count),
    (sum[1] ?? 0) / Math.max(1, count),
    (sum[2] ?? 0) / Math.max(1, count),
  ];
}

/** Opaque pixels whose colour passes `test`, with their mean and tones. */
export function pixelsWhere(
  rasters: readonly RgbaRaster[],
  test: (rgb: Rgb, hue: number, saturation: number, value: number) => boolean,
): {
  readonly count: number;
  readonly opaque: number;
  readonly mean: Rgb;
  readonly tones: readonly [string, number][];
} {
  let count = 0;
  let opaque = 0;
  const sum = [0, 0, 0];
  const tones = new Map<string, number>();
  for (const raster of rasters)
    for (let index = 0; index < raster.width * raster.height; index += 1) {
      const o = index * 4;
      if ((raster.data[o + 3] ?? 0) < 128) continue;
      opaque += 1;
      const rgb: Rgb = [
        raster.data[o] ?? 0,
        raster.data[o + 1] ?? 0,
        raster.data[o + 2] ?? 0,
      ];
      const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      if (!test(rgb, hue, saturation, value)) continue;
      count += 1;
      for (let channel = 0; channel < 3; channel += 1)
        sum[channel] = (sum[channel] ?? 0) + (rgb[channel] ?? 0);
      const hex = `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      tones.set(hex, (tones.get(hex) ?? 0) + 1);
    }
  return {
    count,
    opaque,
    mean: [
      (sum[0] ?? 0) / Math.max(1, count),
      (sum[1] ?? 0) / Math.max(1, count),
      (sum[2] ?? 0) / Math.max(1, count),
    ],
    tones: [...tones.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Bounds of the opaque pixels. */
export function opaqueBounds(raster: RgbaRaster): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
} {
  let left = raster.width;
  let right = -1;
  let top = raster.height;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return {
    left,
    right,
    top,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}
