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

// ------------------------------------------- new visual direction (3tq.5)

export interface OpaqueBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The bounding box of the pixels with alpha >= 128, or null when empty. */
export function opaqueBounds(raster: RgbaRaster): OpaqueBounds | null {
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
  return right < 0 ? null : { left, right, top, bottom };
}

/**
 * The `seated` derivation (bead pulp_wars-3tq.5, proven by the Human demo's
 * cut script): Pixen leaves an uneven margin round a building, so the art is
 * moved by whole pixels until its bounding box is centred and its lowest
 * opaque row sits `bottomMargin` pixels above the canvas bottom; alpha
 * becomes binary. The master is then the bottom-centred `size` window of the
 * result (a city is generated larger than it is drawn), which the art must
 * fit. Nothing is resampled.
 */
export function seatedRaster(
  raster: RgbaRaster,
  size: { readonly width: number; readonly height: number },
  bottomMargin: number,
): RgbaRaster {
  const box = opaqueBounds(raster);
  if (box === null) throw new Error("the candidate is empty");
  if (size.width > raster.width || size.height > raster.height)
    throw new Error("a seated master cannot be larger than its candidate");
  const dx =
    Math.floor((raster.width - (box.right - box.left + 1)) / 2) - box.left;
  const dy = Math.max(-box.top, raster.height - 1 - bottomMargin - box.bottom);
  const moved = new Uint8Array(raster.data.length);
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      const source = (y * raster.width + x) * 4;
      const nx = x + dx;
      const ny = y + dy;
      if (
        (raster.data[source + 3] ?? 0) < 128 ||
        nx < 0 ||
        ny < 0 ||
        nx >= raster.width ||
        ny >= raster.height
      )
        continue;
      const target = (ny * raster.width + nx) * 4;
      moved[target] = raster.data[source] ?? 0;
      moved[target + 1] = raster.data[source + 1] ?? 0;
      moved[target + 2] = raster.data[source + 2] ?? 0;
      moved[target + 3] = 255;
    }
  const window = {
    left: Math.floor((raster.width - size.width) / 2),
    top: raster.height - size.height,
    ...size,
  };
  const seated = { width: raster.width, height: raster.height, data: moved };
  const placed = opaqueBounds(seated);
  if (
    placed === null ||
    placed.left < window.left ||
    placed.right >= window.left + size.width ||
    placed.top < window.top
  )
    throw new Error(
      `the art (${box.right - box.left + 1} x ${box.bottom - box.top + 1}) does not fit the ${size.width} x ${size.height} master`,
    );
  return cropRaster(seated, window);
}

/** One piece of a crop row: candidate columns stamped at `at` in each period. */
export interface CropRowStamp {
  readonly left: number;
  readonly width: number;
  readonly at: number;
  /** The candidate's crop row this piece is cut from; default `spec.band`. */
  readonly band?: number;
  /** The tile rows (0 = top) this piece is stamped on; default every row. */
  readonly rows?: readonly number[];
}

export interface CropRowsSpec {
  /** Rows of crops in the tile, at an even pitch of height / rows. */
  readonly rows: number;
  /** The candidate's crop row (0 = top) the stamps are cut from. */
  readonly band: number;
  /** Horizontal period in pixels; it must divide the tile width. */
  readonly period: number;
  readonly stamps: readonly CropRowStamp[];
  /**
   * Pixels each tile row is shifted to the right, wrapping round the period
   * (one entry per row; default no shift), so the plants of neighbouring
   * rows need not stand in columns.
   */
  readonly rowOffsets?: readonly number[];
  /**
   * Lines dropped from the bottom of every stamped crop row (default 0): a
   * thinner strip of soil under the plants and a wider gap between rows.
   */
  readonly trimBottom?: number;
  /** Colour kept, 0..1 (1 = unchanged). */
  readonly saturation: number;
  /** Mix toward pale straw, 0..1. */
  readonly strawMix: number;
}

export const PALE_STRAW: PaletteColour = [238, 220, 160];

/** The crop rows of a candidate: runs of rows that hold an opaque pixel. */
export function cropBands(
  raster: RgbaRaster,
): { readonly top: number; readonly bottom: number }[] {
  const bands: { top: number; bottom: number }[] = [];
  for (let y = 0; y < raster.height; y += 1) {
    let filled = false;
    for (let x = 0; x < raster.width && !filled; x += 1)
      filled = (raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128;
    if (!filled) continue;
    const last = bands.at(-1);
    if (last?.bottom === y - 1) last.bottom = y;
    else bands.push({ top: y, bottom: y });
  }
  return bands;
}

/**
 * The `crop-rows` derivation (the Farm, beads pulp_wars-3tq.5 and
 * pulp_wars-9s0.3): a full-cell pattern of crop rows that tiles without a
 * seam. Pieces of the candidate's crop rows (`stamps`: a plant with the
 * strip of soil under it) are stamped at a horizontal period that divides
 * the tile width, on `rows` rows at an even vertical pitch, so the rows and
 * the gaps between them continue across cell boundaries in both directions;
 * the gaps fall on the cell's centre line and edges, where Roads run. A
 * stamp may name its own source row and the tile rows it goes on, and a
 * tile row may be shifted along itself (`rowOffsets`), so the rows can
 * differ. The crop is then calmed (lower saturation, mixed toward pale
 * straw). Whole pixels only.
 */
export function cropRowsRaster(
  raster: RgbaRaster,
  size: { readonly width: number; readonly height: number },
  spec: CropRowsSpec,
): RgbaRaster {
  const bands = cropBands(raster);
  if (bands[spec.band] === undefined)
    throw new Error(`the candidate has no crop row ${spec.band}`);
  if (
    !Number.isInteger(spec.period) ||
    spec.period <= 0 ||
    size.width % spec.period !== 0
  )
    throw new Error("the crop period must divide the tile width");
  if (!Number.isInteger(spec.rows) || spec.rows <= 0)
    throw new Error("crop rows must be a positive integer");
  const pitch = size.height / spec.rows;
  const data = new Uint8Array(size.width * size.height * 4);
  for (const stamp of spec.stamps) {
    const band = bands[stamp.band ?? spec.band];
    if (band === undefined)
      throw new Error(`the candidate has no crop row ${String(stamp.band)}`);
    const trim = spec.trimBottom ?? 0;
    const bandHeight = band.bottom - band.top + 1 - trim;
    if (!Number.isInteger(trim) || trim < 0 || bandHeight <= 0)
      throw new Error("trimBottom must leave a part of the crop row");
    if (bandHeight >= pitch)
      throw new Error("the crop row is taller than the row pitch: no gap left");
    if (
      stamp.left < 0 ||
      stamp.left + stamp.width > raster.width ||
      stamp.at < 0 ||
      stamp.at + stamp.width > spec.period
    )
      throw new Error("a crop stamp falls outside the candidate or the period");
    for (let row = 0; row < spec.rows; row += 1) {
      if (stamp.rows !== undefined && !stamp.rows.includes(row)) continue;
      const shift = spec.rowOffsets?.[row] ?? 0;
      const top = Math.round(pitch * (row + 0.5) - bandHeight / 2);
      for (let y = 0; y < bandHeight; y += 1)
        for (let x = 0; x < stamp.width; x += 1) {
          const source = ((band.top + y) * raster.width + stamp.left + x) * 4;
          if ((raster.data[source + 3] ?? 0) < 128) continue;
          const r = raster.data[source] ?? 0;
          const g = raster.data[source + 1] ?? 0;
          const b = raster.data[source + 2] ?? 0;
          const grey = 0.299 * r + 0.587 * g + 0.114 * b;
          const calm = [r, g, b].map((value, channel) => {
            const kept = grey + (value - grey) * spec.saturation;
            return Math.round(
              kept + ((PALE_STRAW[channel] ?? 0) - kept) * spec.strawMix,
            );
          });
          const first =
            (((stamp.at + x + shift) % spec.period) + spec.period) %
            spec.period;
          for (let offset = first; offset < size.width; offset += spec.period) {
            const target = ((top + y) * size.width + offset) * 4;
            data[target] = calm[0] ?? 0;
            data[target + 1] = calm[1] ?? 0;
            data[target + 2] = calm[2] ?? 0;
            data[target + 3] = 255;
          }
        }
    }
  }
  return { width: size.width, height: size.height, data };
}

/**
 * How many pixels of a tile differ from the pixel one period to the right
 * or one period below, wrapping round the tile. 0 means the pattern repeats
 * exactly at those periods, so side-by-side and stacked tiles continue it
 * without a seam (the periods must divide the tile).
 */
export function periodMismatch(
  raster: RgbaRaster,
  periodX: number,
  periodY: number,
): number {
  let count = 0;
  const same = (a: number, b: number): boolean => {
    for (let c = 0; c < 4; c += 1)
      if (raster.data[a + c] !== raster.data[b + c]) return false;
    return true;
  };
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      const here = (y * raster.width + x) * 4;
      const right = (y * raster.width + ((x + periodX) % raster.width)) * 4;
      const down = (((y + periodY) % raster.height) * raster.width + x) * 4;
      if (!same(here, right) || !same(here, down)) count += 1;
    }
  return count;
}
