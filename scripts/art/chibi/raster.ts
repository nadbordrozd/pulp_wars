/**
 * Pure raster steps of the chibi pipeline: candidate-sheet layout, the
 * deterministic seamless terrain crop, the tall-terrain ground composite and
 * the plate (ground under a piece) check. No resampling anywhere: every step
 * copies whole pixels.
 */
import type { RgbaRaster } from "./owner-mask";
import { rgbToHsv } from "./owner-mask";

export interface CropWindow {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Mean absolute RGB step across both wrap seams, 0-255. */
  readonly seamCost: number;
}

/** Candidate `index` of a sheet laid out ceil(sqrt(count)) columns wide. */
export function candidateCell(
  index: number,
  count: number,
  size: { readonly width: number; readonly height: number },
): { readonly left: number; readonly top: number } {
  if (!Number.isInteger(index) || index < 0 || index >= count)
    throw new Error(`candidate ${index} is outside 0..${count - 1}`);
  const columns = Math.ceil(Math.sqrt(count));
  return {
    left: (index % columns) * size.width,
    top: Math.floor(index / columns) * size.height,
  };
}

export function cropRaster(
  raster: RgbaRaster,
  window: { left: number; top: number; width: number; height: number },
): RgbaRaster {
  const data = new Uint8Array(window.width * window.height * 4);
  for (let y = 0; y < window.height; y += 1) {
    const from = ((window.top + y) * raster.width + window.left) * 4;
    data.set(
      raster.data.subarray(from, from + window.width * 4),
      y * window.width * 4,
    );
  }
  return { width: window.width, height: window.height, data };
}

/**
 * Exhaustive search for the window whose wrap-around seams match best:
 * tiled, its right column touches its left column and its bottom row its top
 * row. Ties keep the first window in scan order, so the result is stable.
 */
export function bestSeamlessWindow(
  raster: RgbaRaster,
  size: { readonly width: number; readonly height: number },
): CropWindow {
  const { width: w, height: h } = size;
  if (w > raster.width || h > raster.height)
    throw new Error("seamless crop is larger than the candidate");
  const channel = (x: number, y: number, c: number): number =>
    raster.data[(y * raster.width + x) * 4 + c] ?? 0;
  const step = (ax: number, ay: number, bx: number, by: number): number =>
    Math.abs(channel(ax, ay, 0) - channel(bx, by, 0)) +
    Math.abs(channel(ax, ay, 1) - channel(bx, by, 1)) +
    Math.abs(channel(ax, ay, 2) - channel(bx, by, 2));
  let best = { left: 0, top: 0, cost: Number.POSITIVE_INFINITY };
  for (let top = 0; top + h <= raster.height; top += 1)
    for (let left = 0; left + w <= raster.width; left += 1) {
      let cost = 0;
      for (let y = top; y < top + h; y += 1)
        cost += step(left + w - 1, y, left, y);
      for (let x = left; x < left + w; x += 1)
        cost += step(x, top + h - 1, x, top);
      if (cost < best.cost) best = { left, top, cost };
    }
  return {
    left: best.left,
    top: best.top,
    width: w,
    height: h,
    seamCost: Number((best.cost / (3 * (w + h))).toFixed(3)),
  };
}

/** Largest alpha of any pixel; terrain tiles must be fully opaque. */
export function transparentPixels(raster: RgbaRaster): number {
  let count = 0;
  for (let index = 3; index < raster.data.length; index += 4)
    if ((raster.data[index] ?? 0) < 255) count += 1;
  return count;
}

/**
 * Tall terrain: the opaque ground tile fills the bottom 80 x 80 cell and the
 * transparent body is drawn over the whole canvas (source-over, alpha
 * blended exactly as Canvas would).
 */
export function groundComposite(
  body: RgbaRaster,
  ground: RgbaRaster,
): RgbaRaster {
  if (ground.width !== body.width || ground.height > body.height)
    throw new Error("ground tile must be as wide as the body and not taller");
  const data = new Uint8Array(body.width * body.height * 4);
  const groundTop = body.height - ground.height;
  data.set(ground.data, groundTop * body.width * 4);
  for (let index = 0; index < body.width * body.height; index += 1) {
    const offset = index * 4;
    const alpha = (body.data[offset + 3] ?? 0) / 255;
    if (alpha === 0) continue;
    const below = (data[offset + 3] ?? 0) / 255;
    const out = alpha + below * (1 - alpha);
    for (let c = 0; c < 3; c += 1)
      data[offset + c] = Math.round(
        ((body.data[offset + c] ?? 0) * alpha +
          (data[offset + c] ?? 0) * below * (1 - alpha)) /
          out,
      );
    data[offset + 3] = Math.round(out * 255);
  }
  return { width: body.width, height: body.height, data };
}

export type PaletteColour = readonly [number, number, number];

/** The distinct opaque colours of a checked-in palette PNG, in scan order. */
export function paletteColours(palette: RgbaRaster): PaletteColour[] {
  const colours: PaletteColour[] = [];
  const seen = new Set<number>();
  for (let offset = 0; offset < palette.data.length; offset += 4) {
    if ((palette.data[offset + 3] ?? 0) < 128) continue;
    const r = palette.data[offset] ?? 0;
    const g = palette.data[offset + 1] ?? 0;
    const b = palette.data[offset + 2] ?? 0;
    const key = (r << 16) | (g << 8) | b;
    if (seen.has(key)) continue;
    seen.add(key);
    colours.push([r, g, b]);
  }
  return colours;
}

/**
 * The palette-map derivation (bead pulp_wars-vkq.14): every pixel with
 * alpha >= 128 becomes the nearest palette colour, fully opaque, and every
 * other pixel fully transparent. Nearness is the "redmean" weighted RGB
 * distance; ties keep the earlier palette colour. It is what Pixflux's
 * forced palette does server-side, applied to a Pixen candidate whose shape
 * is right but whose colours drift towards the player colours.
 */
export function paletteMapRaster(
  raster: RgbaRaster,
  colours: readonly PaletteColour[],
): RgbaRaster {
  if (colours.length === 0) throw new Error("the palette has no colours");
  const data = new Uint8Array(raster.width * raster.height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    if ((raster.data[offset + 3] ?? 0) < 128) continue;
    const r = raster.data[offset] ?? 0;
    const g = raster.data[offset + 1] ?? 0;
    const b = raster.data[offset + 2] ?? 0;
    let best = colours[0] as PaletteColour;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const colour of colours) {
      const mean = (r + colour[0]) / 2;
      const dr = r - colour[0];
      const dg = g - colour[1];
      const db = b - colour[2];
      const distance =
        (2 + mean / 256) * dr * dr +
        4 * dg * dg +
        (2 + (255 - mean) / 256) * db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = colour;
      }
    }
    data[offset] = best[0];
    data[offset + 1] = best[1];
    data[offset + 2] = best[2];
    data[offset + 3] = 255;
  }
  return { width: raster.width, height: raster.height, data };
}

/** Pixels of a palette-mapped master that are not a palette colour or not crisp. */
export function offPalettePixels(
  raster: RgbaRaster,
  colours: readonly PaletteColour[],
): number {
  const allowed = new Set(colours.map(([r, g, b]) => (r << 16) | (g << 8) | b));
  let count = 0;
  for (let offset = 0; offset < raster.data.length; offset += 4) {
    const alpha = raster.data[offset + 3] ?? 0;
    if (alpha === 0) continue;
    const key =
      ((raster.data[offset] ?? 0) << 16) |
      ((raster.data[offset + 1] ?? 0) << 8) |
      (raster.data[offset + 2] ?? 0);
    if (alpha !== 255 || !allowed.has(key)) count += 1;
  }
  return count;
}

export interface PlateCheck {
  /** Rows of the bottom band of the opaque bounding box that were checked. */
  readonly bandRows: number;
  /** Share of opaque band pixels that look like ground (green or soil). */
  readonly groundShare: number;
  /** Opaque band width / bounding-box width on the widest band row. */
  readonly footprintWidthShare: number;
  readonly suspect: boolean;
}

/**
 * Heuristic hint for the "nothing under it" rule: a plate shows up as a
 * wide bottom band of green or soil-brown pixels. It never accepts or
 * rejects on its own; review does. Every text-to-image city in the tile-80
 * test had a plate, so a suspect result must be looked at.
 */
export function plateCheck(raster: RgbaRaster): PlateCheck {
  let minX = raster.width;
  let minY = raster.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxY < 0)
    return {
      bandRows: 0,
      groundShare: 0,
      footprintWidthShare: 0,
      suspect: false,
    };
  const boxWidth = maxX - minX + 1;
  const bandRows = Math.max(1, Math.round((maxY - minY + 1) * 0.2));
  let opaque = 0;
  let ground = 0;
  let widest = 0;
  for (let y = maxY - bandRows + 1; y <= maxY; y += 1) {
    let rowWidth = 0;
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * raster.width + x) * 4;
      if ((raster.data[offset + 3] ?? 0) < 128) continue;
      opaque += 1;
      rowWidth += 1;
      const colour = rgbToHsv(
        raster.data[offset] ?? 0,
        raster.data[offset + 1] ?? 0,
        raster.data[offset + 2] ?? 0,
      );
      const green =
        colour.hue >= 60 &&
        colour.hue <= 170 &&
        colour.saturation >= 0.25 &&
        colour.value >= 0.2;
      const soil =
        colour.hue > 15 &&
        colour.hue < 45 &&
        colour.saturation >= 0.3 &&
        colour.value >= 0.25 &&
        colour.value <= 0.75;
      if (green || soil) ground += 1;
    }
    widest = Math.max(widest, rowWidth);
  }
  const groundShare = opaque === 0 ? 0 : ground / opaque;
  const footprintWidthShare = widest / boxWidth;
  return {
    bandRows,
    groundShare: Number(groundShare.toFixed(4)),
    footprintWidthShare: Number(footprintWidthShare.toFixed(4)),
    suspect: groundShare >= 0.25 && footprintWidthShare >= 0.6,
  };
}
