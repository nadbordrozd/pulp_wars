import type { ChibiRasterEnvironmentV7 } from "./chibi-art-resolver-v7";
import { parseHexColourV7 } from "./owner-recolour-v7";

/**
 * Developer experiment (bead pulp_wars-x6c): how saturated the board draws
 * its buildings and its cities, in whole percent. 100 means unchanged and
 * takes no desaturation path at all.
 */
export interface BoardSaturationV7 {
  /** Improvement art, the Mine on its mountain and Field Defense. */
  readonly building: number;
  /** City and neutral Village sprites. */
  readonly city: number;
}

export const SATURATION_STEP_V7 = 5;

export const DEFAULT_BOARD_SATURATION_V7: BoardSaturationV7 = {
  building: 100,
  city: 100,
};

/** Clamps to 0-100 on the slider's step; anything not a number is 100. */
export function clampSaturationPercentV7(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 100;
  const stepped = Math.round(value / SATURATION_STEP_V7) * SATURATION_STEP_V7;
  return Math.max(0, Math.min(100, stepped));
}

/** Rec. 601 luma weights. */
const luma = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Mixes every pixel toward its own luminance: 100 keeps the colour, 0 is
 * greyscale. Alpha is untouched, so the silhouette and edges are unchanged.
 */
export function desaturatePixelsV7(
  pixels: Uint8ClampedArray,
  percent: number,
): Uint8ClampedArray {
  const keep = clampSaturationPercentV7(percent) / 100;
  const output = new Uint8ClampedArray(pixels);
  if (keep === 1) return output;
  for (let index = 0; index + 3 < output.length; index += 4) {
    if (output[index + 3] === 0) continue;
    const r = output[index] ?? 0;
    const g = output[index + 1] ?? 0;
    const b = output[index + 2] ?? 0;
    const grey = luma(r, g, b);
    output[index] = Math.round(grey + (r - grey) * keep);
    output[index + 1] = Math.round(grey + (g - grey) * keep);
    output[index + 2] = Math.round(grey + (b - grey) * keep);
  }
  return output;
}

/** The same mix for a code-drawn `#rrggbb` colour; other strings pass through. */
export function desaturateHexColourV7(colour: string, percent: number): string {
  const keep = clampSaturationPercentV7(percent) / 100;
  const rgb = keep === 1 ? null : parseHexColourV7(colour);
  if (rgb === null) return colour;
  const grey = luma(rgb.r, rgb.g, rgb.b);
  const channel = (value: number): string =>
    Math.round(grey + (value - grey) * keep)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

export interface SpriteSaturationCacheV7 {
  /**
   * The sprite at `percent` saturation. 100, an unreadable raster or a
   * raster of unknown size returns the sprite itself.
   */
  resolve(image: CanvasImageSource, percent: number): CanvasImageSource;
}

function intrinsicSize(
  image: CanvasImageSource,
): { readonly width: number; readonly height: number } | null {
  const sized = image as {
    readonly naturalWidth?: unknown;
    readonly naturalHeight?: unknown;
    readonly width?: unknown;
    readonly height?: unknown;
  };
  const width =
    typeof sized.naturalWidth === "number" ? sized.naturalWidth : sized.width;
  const height =
    typeof sized.naturalHeight === "number"
      ? sized.naturalHeight
      : sized.height;
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}

/**
 * Desaturated copies of board sprites, built once per sprite and level by
 * reading its pixels (after any owner recolour, so the owner colour fades
 * too); no canvas filter is used, so every backend draws the same pixels.
 * Each sprite keeps only its latest level, and the copy is released with
 * the sprite, so dragging a slider replaces copies instead of piling them
 * up. Drawing a frame does no pixel work once the copies exist.
 */
export function createSpriteSaturationCacheV7(
  environment: Pick<ChibiRasterEnvironmentV7, "readPixels" | "createSurface">,
): SpriteSaturationCacheV7 {
  const copies = new WeakMap<
    object,
    { readonly percent: number; readonly surface: CanvasImageSource | null }
  >();
  return {
    resolve(image, percent) {
      const level = clampSaturationPercentV7(percent);
      if (level === 100) return image;
      const cached = copies.get(image);
      if (cached?.percent === level) return cached.surface ?? image;
      const size = intrinsicSize(image);
      const pixels =
        size === null
          ? null
          : environment.readPixels(image, size.width, size.height);
      const surface =
        size === null || pixels === null
          ? null
          : environment.createSurface(
              desaturatePixelsV7(pixels, level),
              size.width,
              size.height,
            );
      copies.set(image, { percent: level, surface });
      return surface ?? image;
    },
  };
}
