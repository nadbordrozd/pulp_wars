import type { CoordV7 } from "../../engine/index";
import { chibiForestRectV7 } from "./chibi-forest-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import {
  FOG_DEFAULT_PALETTE_V7,
  FOG_PALETTES_V7,
  fogHashV7,
  type FogPaletteIdV7,
} from "./fog-of-war-v7";
import type { CameraState } from "./geometry";

/**
 * The fog puff (bead pulp_wars-2yc.77, docs/art/ATMOSPHERE.md). The user,
 * 2026-10-17: "in polytopia when you click on an unexplored tile, there is
 * a little animation, like the fog is sort of smoking. ... in pulp wars
 * right now when you click on a unexplored tile you get the square
 * selection box. that's inelegant."
 *
 * A tap on an unexplored tile draws no selection box. Instead the cloud on
 * that tile stirs: a few puffs of the fog's own colours swell out of the
 * cell, drift up and a little apart, and thin away, as if the fog smoked,
 * and the cloud settles. It lasts FOG_PUFF_V7.durationMs (shorter at the
 * fast animation speed); a new tap starts it again.
 *
 * The puffs are drawn like the cloud's: pixels at the fog's master scale
 * (80 to a cell), each puff a few round lobes with a pale rim towards the
 * light (bottom left) and a shaded rim away from it, no gradient. The
 * whole puff fades with one alpha. It is drawn on the effects overlay, so
 * only that canvas repaints while it plays.
 *
 * Reduced motion (the system's or the game's Motion setting): nothing
 * moves. One still frame of a faint stir is shown for
 * FOG_PUFF_V7.reducedHoldMs, then the overlay is clear again.
 *
 * It never shows anything hidden: it is drawn from the cell's coordinate
 * alone, in the fog's colours, over the fog.
 */

/** The master switch. False draws nothing on a tap on the fog. */
export const FOG_PUFF_ENABLED_V7 = true;

/** `?fog-puff=0` (or `off`, `false`) turns it off, `=1` on. */
export const FOG_PUFF_PARAMETER_V7 = "fog-puff";

export function fogPuffEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(FOG_PUFF_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return FOG_PUFF_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return FOG_PUFF_ENABLED_V7;
}

export const FOG_PUFF_V7 = {
  /** The whole puff, ms, at the normal and the fast animation speed. */
  durationMs: 800,
  fastDurationMs: 600,
  /** Reduced motion: how long the one still frame stays, ms. */
  reducedHoldMs: 260,
  /** The progress the still frame is taken at, and its alpha. */
  reducedProgress: 0.22,
  reducedAlpha: 0.5,
  /** How many puffs: the cell's own cloud bulging, and those that rise. */
  puffs: 5,
  /** The latest a rising puff starts, as a share of the whole. */
  stagger: 0.24,
  /** The puff is in by this share of the whole, and fades from this one. */
  appearUntil: 0.08,
  fadeFrom: 0.45,
  /** The cell's own cloud is at its fullest this far into its life. */
  bulgePeak: 0.35,
  /** A rising puff thins from this far into its life. */
  thinFrom: 0.7,
  /** The shadow a puff casts on the cloud, as a share of its alpha. */
  castAlpha: 0.5,
} as const;

export type FogPuffSpeedV7 = "NORMAL" | "FAST";

export function fogPuffDurationMsV7(speed: FogPuffSpeedV7): number {
  return speed === "FAST" ? FOG_PUFF_V7.fastDurationMs : FOG_PUFF_V7.durationMs;
}

/** The side of a cell in master px. */
const CELL = 80;

/**
 * The raster of a puff: master px round the cell, the cell's top left at
 * (FOG_PUFF_RASTER_V7.x, FOG_PUFF_RASTER_V7.y) inside it. Wider than the
 * cell, and taller above it, since the puffs drift up and out.
 */
export const FOG_PUFF_RASTER_V7 = {
  x: 56,
  y: 72,
  width: CELL + 112,
  height: CELL + 92,
} as const;

/** A round lobe of a puff, in master px from the cell's top left. */
export interface FogPuffLobeV7 {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** One puff at a moment: its lobes and its alpha. */
export interface FogPuffWispV7 {
  readonly lobes: readonly FogPuffLobeV7[];
  readonly alpha: number;
}

const easeOut = (value: number): number => 1 - (1 - value) * (1 - value);
const easeIn = (value: number): number => value * value;
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * The puffs `progress` (0 to 1) of the way through a puff on `at`. The
 * same for the same cell, progress and `variant` (the tap's count, so a
 * second tap stirs a little differently). Empty at 0 and at 1.
 */
export function fogPuffWispsV7(
  at: CoordV7,
  progress: number,
  variant = 0,
): FogPuffWispV7[] {
  if (!(progress > 0 && progress < 1)) return [];
  const spec = FOG_PUFF_V7;
  const salt = 700 + (variant % 4) * 10;
  const hash = (index: number, which: number): number =>
    fogHashV7(at.x * 31 + index, at.y * 17 + which, salt);
  const wisps: FogPuffWispV7[] = [];
  // Every puff fades together, so where they merge there is no seam: in
  // fast, held, then thinning away.
  const alpha = clamp01(
    progress < spec.appearUntil
      ? progress / spec.appearUntil
      : progress > spec.fadeFrom
        ? Math.pow(1 - (progress - spec.fadeFrom) / (1 - spec.fadeFrom), 1.2)
        : 1,
  );
  for (let index = 0; index < spec.puffs; index += 1) {
    // The first puff is the cell's own cloud bulging; the rest leave it.
    const bulge = index === 0;
    const start = bulge ? 0 : (spec.stagger * (index - 1)) / (spec.puffs - 2);
    const life = bulge ? 0.7 : 1 - start;
    const local = (progress - start) / life;
    if (local <= 0 || local >= 1) continue;
    const grow = easeOut(local);
    // Puffs leave the cell fanned out: left, right, left... from the
    // middle, and up.
    const side = bulge ? 0 : index % 2 === 1 ? -1 : 1;
    const fan = Math.ceil(index / 2);
    const x0 = 40 + side * (6 + 6 * fan) + 6 * (hash(index, 1) - 0.5);
    const y0 = 50 + 6 * (hash(index, 2) - 0.5) - (bulge ? 0 : 8 * fan);
    const driftX = bulge ? 0 : side * (10 + 10 * hash(index, 3)) * fan;
    const rise = bulge ? 6 : 34 + 16 * hash(index, 4) + 6 * fan;
    const x = x0 + driftX * grow;
    const y = y0 - rise * grow;
    const base = bulge ? 21 : 13 + 4 * hash(index, 5);
    // The cell's cloud swells and sinks back; a rising puff grows, then
    // thins as it goes.
    const swell = bulge
      ? local < spec.bulgePeak
        ? 0.6 + 0.5 * easeOut(local / spec.bulgePeak)
        : 1.1 - 0.8 * easeIn((local - spec.bulgePeak) / (1 - spec.bulgePeak))
      : (0.55 + 0.6 * grow) *
        (local > spec.thinFrom
          ? 1 - 0.45 * easeIn((local - spec.thinFrom) / (1 - spec.thinFrom))
          : 1);
    const radius = base * swell;
    // A cloud is wider than it is tall: two or three lobes side by side
    // on a shared base.
    const count = bulge ? 3 : hash(index, 6) < 0.5 ? 2 : 3;
    const lobes: FogPuffLobeV7[] = [];
    for (let lobe = 0; lobe < count; lobe += 1) {
      const offset = lobe - (count - 1) / 2;
      const r =
        radius * (offset === 0 ? 1 : 0.72 + 0.12 * hash(index, 7 + lobe));
      lobes.push({
        x: x + offset * radius * 0.95,
        y: y - r * 0.4 + radius * 0.35 * Math.abs(offset),
        r,
      });
    }
    wisps.push({ lobes, alpha });
  }
  return wisps;
}

type Rgb = readonly [number, number, number];

/** The colours a puff is drawn in. */
export interface FogPuffColoursV7 {
  readonly body: Rgb;
  readonly lit: Rgb;
  readonly shade: Rgb;
  /** The shadow cast up and to the right, on what lies under the puff. */
  readonly cast: Rgb;
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/**
 * The puff's colours in a fog palette: a puff of the cloud, a touch
 * lighter so the stir reads over the cloud it rises from. `"OFF"` (the
 * flat fog of the classic look) is a grey-teal of that fog.
 */
export function fogPuffColoursV7(
  palette: FogPaletteIdV7 | "OFF" = FOG_DEFAULT_PALETTE_V7,
): FogPuffColoursV7 {
  if (palette === "OFF")
    return {
      body: [62, 82, 88],
      lit: [104, 126, 130],
      shade: [44, 60, 66],
      cast: [16, 24, 28],
    };
  const spec = FOG_PALETTES_V7[palette];
  return {
    body: mix(spec.puff, spec.puffLit, 0.45),
    lit: mix(spec.puffLit, spec.rim, 0.6),
    shade: spec.puff,
    cast: spec.cast,
  };
}

/**
 * Bead pulp_wars-2yc.82 (UI review S1): a tap on a plain explored tile
 * (one that opens no dock) plays the same puff, lighter: a faint cream
 * dust, lit from the bottom left like the cloud, at GROUND_PUFF_ALPHA_V7
 * of the fog puff's alpha.
 */
export const GROUND_PUFF_COLOURS_V7: FogPuffColoursV7 = {
  body: [238, 230, 204],
  lit: [255, 251, 236],
  shade: [204, 192, 160],
  cast: [70, 62, 44],
};

export const GROUND_PUFF_ALPHA_V7 = 0.55;

/**
 * The puff's pixels: FOG_PUFF_RASTER_V7.width x height RGBA, transparent
 * but for the puffs. The puffs are one cloud: where they overlap they
 * merge, with one rim round all of them, and each pixel takes the alpha
 * of the strongest puff over it, scaled by `alphaScale`.
 */
export function fogPuffPixelsV7(
  wisps: readonly FogPuffWispV7[],
  colours: FogPuffColoursV7,
  alphaScale = 1,
): Uint8ClampedArray {
  const { width, height } = FOG_PUFF_RASTER_V7;
  const pixels = new Uint8ClampedArray(width * height * 4);
  // The alpha of the strongest puff over each pixel; 0 outside them all.
  const cover = new Float32Array(width * height);
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (const wisp of wisps) {
    const alpha = clamp01(wisp.alpha * alphaScale);
    if (alpha <= 0) continue;
    for (const lobe of wisp.lobes) {
      const lx = lobe.x + FOG_PUFF_RASTER_V7.x;
      const ly = lobe.y + FOG_PUFF_RASTER_V7.y;
      const x0 = Math.max(0, Math.floor(lx - lobe.r));
      const y0 = Math.max(0, Math.floor(ly - lobe.r));
      const x1 = Math.min(width, Math.ceil(lx + lobe.r) + 1);
      const y1 = Math.min(height, Math.ceil(ly + lobe.r) + 1);
      for (let py = y0; py < y1; py += 1)
        for (let px = x0; px < x1; px += 1) {
          if (Math.hypot(px + 0.5 - lx, py + 0.5 - ly) >= lobe.r) continue;
          const at = py * width + px;
          if (alpha > (cover[at] ?? 0)) cover[at] = alpha;
        }
      left = Math.min(left, x0);
      top = Math.min(top, y0);
      right = Math.max(right, x1);
      bottom = Math.max(bottom, y1);
    }
  }
  const inside = (px: number, py: number): boolean =>
    px >= 0 &&
    px < width &&
    py >= 0 &&
    py < height &&
    (cover[py * width + px] ?? 0) > 0;
  // The rims look two pixels away, and the shadow falls three away.
  left = Math.max(0, left - 3);
  top = Math.max(0, top - 3);
  right = Math.min(width, right + 3);
  bottom = Math.min(height, bottom + 3);
  for (let py = top; py < bottom; py += 1)
    for (let px = left; px < right; px += 1) {
      const at = py * width + px;
      let colour: Rgb;
      let alpha: number;
      if (inside(px, py)) {
        // Light from the bottom left, as on the cloud's own puffs.
        colour = !inside(px - 2, py + 2)
          ? colours.lit
          : !inside(px + 2, py - 2)
            ? colours.shade
            : colours.body;
        alpha = cover[at] ?? 0;
      } else if (inside(px - 3, py + 3)) {
        // A short shadow up and to the right, as the cloud's puffs cast.
        colour = colours.cast;
        alpha = (cover[(py + 3) * width + px - 3] ?? 0) * FOG_PUFF_V7.castAlpha;
      } else continue;
      pixels[at * 4] = colour[0];
      pixels[at * 4 + 1] = colour[1];
      pixels[at * 4 + 2] = colour[2];
      pixels[at * 4 + 3] = Math.round(alpha * 255);
    }
  return pixels;
}

/** A puff playing on a cell. */
export interface FogPuffV7 {
  readonly at: CoordV7;
  /** 0 to 1 through the puff (reduced motion: the still frame's). */
  readonly progress: number;
  readonly variant: number;
  /** 1, or FOG_PUFF_V7.reducedAlpha for the still frame. */
  readonly alphaScale: number;
}

export interface FogPuffDrawFrameV7 {
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  readonly viewport: { readonly width: number; readonly height: number };
}

/**
 * A scratch surface for the puff's pixels, made once per document. Null
 * where a canvas cannot take pixels (a test stand-in).
 */
export interface FogPuffSurfaceV7 {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly image: ImageData;
}

export function createFogPuffSurfaceV7(
  document: Document,
): FogPuffSurfaceV7 | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = FOG_PUFF_RASTER_V7.width;
    canvas.height = FOG_PUFF_RASTER_V7.height;
    const context = canvas.getContext("2d");
    if (
      context === null ||
      typeof context.putImageData !== "function" ||
      typeof context.createImageData !== "function"
    )
      return null;
    const image = context.createImageData(
      FOG_PUFF_RASTER_V7.width,
      FOG_PUFF_RASTER_V7.height,
    ) as ImageData | undefined;
    if (image?.data === undefined) return null;
    return { canvas, context, image };
  } catch {
    return null;
  }
}

/**
 * Draws a puff on `context` (CSS px, the overlay's transform set) with the
 * camera of the board. Its pixels are scaled up like the cloud's, smooth
 * only at a scale that is not whole.
 */
export function drawFogPuffV7(
  context: CanvasRenderingContext2D,
  frame: FogPuffDrawFrameV7,
  puff: FogPuffV7,
  colours: FogPuffColoursV7,
  surface: FogPuffSurfaceV7 | null,
): void {
  if (surface === null) return;
  const wisps = fogPuffWispsV7(puff.at, puff.progress, puff.variant);
  if (wisps.length === 0) return;
  const rect = chibiForestRectV7(frame, puff.at, {
    x: -FOG_PUFF_RASTER_V7.x,
    y: -FOG_PUFF_RASTER_V7.y,
    width: FOG_PUFF_RASTER_V7.width,
    height: FOG_PUFF_RASTER_V7.height,
  });
  if (
    rect.x > frame.viewport.width ||
    rect.y > frame.viewport.height ||
    rect.x + rect.width < 0 ||
    rect.y + rect.height < 0
  )
    return;
  surface.image.data.set(fogPuffPixelsV7(wisps, colours, puff.alphaScale));
  surface.context.putImageData(surface.image, 0, 0);
  context.save();
  context.imageSmoothingEnabled = !isWholeScale(
    chibiMasterScale(frame.camera) * frame.devicePixelRatio,
  );
  context.drawImage(surface.canvas, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

/** The clock of the puff: which cell, when it started, how many taps. */
export interface FogPuffClockV7 {
  /** Starts (or starts again) a puff on `at` at `nowMs`. */
  start(at: CoordV7, nowMs: number): void;
  /** The puff at `nowMs`, or null when none is playing. */
  frame(nowMs: number, durationMs: number, reduced: boolean): FogPuffV7 | null;
  /** Whether a puff still plays at `nowMs`. */
  active(nowMs: number, durationMs: number, reduced: boolean): boolean;
  reset(): void;
}

/** How long a puff shows, ms: the whole puff, or the still frame's hold. */
export function fogPuffLengthMsV7(
  durationMs: number,
  reduced: boolean,
): number {
  return reduced ? FOG_PUFF_V7.reducedHoldMs : durationMs;
}

/**
 * The puff on `at` `elapsedMs` after its tap, or null before it and once
 * it is over. Reduced motion holds one still, fainter frame.
 */
export function fogPuffAtV7(
  at: CoordV7,
  elapsedMs: number,
  durationMs: number,
  reduced: boolean,
  variant = 0,
): FogPuffV7 | null {
  const total = fogPuffLengthMsV7(durationMs, reduced);
  if (!(elapsedMs >= 0 && elapsedMs < total)) return null;
  return reduced
    ? {
        at,
        progress: FOG_PUFF_V7.reducedProgress,
        variant,
        alphaScale: FOG_PUFF_V7.reducedAlpha,
      }
    : { at, progress: elapsedMs / total, variant, alphaScale: 1 };
}

export function createFogPuffClockV7(): FogPuffClockV7 {
  let playing: { at: CoordV7; startedAt: number; variant: number } | null =
    null;
  let taps = 0;
  return {
    start(at, nowMs) {
      taps += 1;
      playing = { at: { x: at.x, y: at.y }, startedAt: nowMs, variant: taps };
    },
    frame(nowMs, durationMs, reduced) {
      if (playing === null) return null;
      return fogPuffAtV7(
        playing.at,
        nowMs - playing.startedAt,
        durationMs,
        reduced,
        playing.variant,
      );
    },
    active(nowMs, durationMs, reduced) {
      if (playing === null) return false;
      if (nowMs - playing.startedAt >= fogPuffLengthMsV7(durationMs, reduced)) {
        playing = null;
        return false;
      }
      return true;
    },
    reset() {
      playing = null;
    },
  };
}
