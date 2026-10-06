import type { CameraState } from "./geometry";

/**
 * The night sky outside the map (bead pulp_wars-2yc.17,
 * docs/art/ATMOSPHERE.md). The user, 2026-10-06: "make a nicer starry
 * parallax background outside of the map."
 *
 * In the live look of the CHIBI art set the canvas behind the board is a
 * dark night sky instead of a flat colour: a faint nebula tint and three
 * layers of stars. Each layer moves with the camera by a small share of the
 * pan (far stars least) and spreads a little with the zoom, so the board
 * seems to float in front of the sky. A few bright stars have a four-point
 * glint and twinkle slowly (still for reduced motion).
 *
 * The sky is a function of the camera and the clock only: it reads nothing
 * of the game. It is dark and sparse on purpose, so the edge tiles of the
 * map keep their contrast and the sky never competes with the board.
 *
 * To turn it off: set STARFIELD_ENABLED_V7 to false, or open the game with
 * `?starfield=0`. The classic look and the LEGACY art set never draw it.
 */

/** The master switch. False fills the canvas exactly as before the bead. */
export const STARFIELD_ENABLED_V7 = true;

/** `?starfield=0` (or `off`, `false`) turns it off, `=1` on. */
export const STARFIELD_PARAMETER_V7 = "starfield";

export function starfieldEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(STARFIELD_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return STARFIELD_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return STARFIELD_ENABLED_V7;
}

export interface StarLayerSpecV7 {
  /** Share of the camera's pan the layer moves by. */
  readonly pan: number;
  /** Share of the zoom's change the layer spreads by. */
  readonly spread: number;
  /** Stars in one tile of the layer. */
  readonly stars: number;
  /** Side of a star, CSS px. */
  readonly size: number;
  readonly colour: string;
  /** Alpha of the dim and of the clear stars of the layer. */
  readonly alphas: readonly [number, number];
}

export const STARFIELD_V7 = {
  /** The sky. */
  sky: "#0b1020",
  /** The layer's stars repeat over a tile of this size, CSS px. */
  tile: [960, 720],
  layers: [
    {
      pan: 0.03,
      spread: 0.04,
      stars: 110,
      size: 1,
      colour: "#aab6d6",
      alphas: [0.34, 0.6],
    },
    {
      pan: 0.07,
      spread: 0.09,
      stars: 60,
      size: 1.5,
      colour: "#cbd6ee",
      alphas: [0.5, 0.78],
    },
    {
      pan: 0.13,
      spread: 0.16,
      stars: 22,
      size: 2,
      colour: "#eef2fb",
      alphas: [0.7, 0.92],
    },
  ],
  /** Bright stars with a glint, in the nearest layer's tile. */
  bright: 7,
  brightColours: ["#fff4d6", "#dfeaff", "#ffe2ea"],
  /** A glint's arm, CSS px, and the twinkle's period, ms. */
  glint: 5,
  twinkleMs: 3400,
  /** How far a twinkle dims a bright star, 0 to 1. */
  twinkleDepth: 0.45,
  /** The nebula: wide soft tints, fixed behind the stars. */
  nebulae: [
    { at: [0.22, 0.26], radius: 0.55, colour: "88, 62, 150", alpha: 0.26 },
    { at: [0.8, 0.72], radius: 0.6, colour: "34, 96, 124", alpha: 0.22 },
    { at: [0.62, 0.12], radius: 0.35, colour: "150, 70, 110", alpha: 0.09 },
  ],
} as const satisfies {
  readonly layers: readonly StarLayerSpecV7[];
  readonly [key: string]: unknown;
};

/** A deterministic hash of two integers and a salt, 0 to 1. */
function hash(x: number, y: number, salt: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (salt | 0), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface StarV7 {
  /** Place in the layer's tile, CSS px. */
  readonly x: number;
  readonly y: number;
  /** Index into the layer's `alphas`. */
  readonly level: 0 | 1;
}

export interface BrightStarV7 {
  readonly x: number;
  readonly y: number;
  readonly colour: string;
  /** Where in its twinkle the star starts, 0 to 1. */
  readonly phase: number;
}

const layerStars = new Map<number, readonly StarV7[]>();

/** The stars of a layer: the same list every time. */
export function starLayerV7(layer: number): readonly StarV7[] {
  const known = layerStars.get(layer);
  if (known !== undefined) return known;
  const spec = STARFIELD_V7.layers[layer];
  const stars: StarV7[] = [];
  if (spec !== undefined)
    for (let index = 0; index < spec.stars; index += 1)
      stars.push({
        x: hash(index, layer, 101) * STARFIELD_V7.tile[0],
        y: hash(index, layer, 102) * STARFIELD_V7.tile[1],
        level: hash(index, layer, 103) < 0.62 ? 0 : 1,
      });
  layerStars.set(layer, stars);
  return stars;
}

let brightStars: readonly BrightStarV7[] | null = null;

/** The bright stars: the same list every time. */
export function brightStarsV7(): readonly BrightStarV7[] {
  if (brightStars !== null) return brightStars;
  const stars: BrightStarV7[] = [];
  const colours = STARFIELD_V7.brightColours;
  for (let index = 0; index < STARFIELD_V7.bright; index += 1)
    stars.push({
      x: hash(index, 7, 201) * STARFIELD_V7.tile[0],
      y: hash(index, 7, 202) * STARFIELD_V7.tile[1],
      colour:
        colours[Math.floor(hash(index, 7, 203) * colours.length)] ?? colours[0],
      phase: hash(index, 7, 204),
    });
  brightStars = stars;
  return stars;
}

export interface StarfieldFrameV7 {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly camera: CameraState;
  readonly devicePixelRatio: number;
  /** The twinkle's clock in ms; 0 holds the stars still (reduced motion). */
  readonly timeMs: number;
}

/**
 * Where a layer's tile lies for a camera: its size on screen and the
 * offset of its first copy (at or left of / above the viewport's origin).
 */
export function starLayerPlacementV7(
  layer: StarLayerSpecV7,
  camera: CameraState,
): { scale: number; x: number; y: number; width: number; height: number } {
  const scale = 1 + layer.spread * (camera.zoom - 1);
  const width = STARFIELD_V7.tile[0] * scale;
  const height = STARFIELD_V7.tile[1] * scale;
  const wrap = (value: number, by: number): number => ((value % by) + by) % by;
  return {
    scale,
    x: wrap(camera.offsetX * layer.pan, width) - width,
    y: wrap(camera.offsetY * layer.pan, height) - height,
    width,
    height,
  };
}

/** A bright star's alpha at a time: 1 when the clock is 0. */
export function twinkleAlphaV7(star: BrightStarV7, timeMs: number): number {
  if (timeMs <= 0) return 1;
  const turn = timeMs / STARFIELD_V7.twinkleMs + star.phase;
  return (
    1 - STARFIELD_V7.twinkleDepth * (0.5 - 0.5 * Math.cos(2 * Math.PI * turn))
  );
}

/** The sky's colour and the nebula's tints over a `width` x `height` area. */
function paintBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const spec = STARFIELD_V7;
  context.fillStyle = spec.sky;
  context.fillRect(0, 0, width, height);
  if (typeof context.createRadialGradient !== "function") return;
  const span = Math.max(width, height);
  for (const nebula of spec.nebulae) {
    const x = nebula.at[0] * width;
    const y = nebula.at[1] * height;
    const gradient = context.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      nebula.radius * span,
    );
    if (typeof gradient?.addColorStop !== "function") continue;
    gradient.addColorStop(0, `rgba(${nebula.colour}, ${nebula.alpha})`);
    gradient.addColorStop(
      0.55,
      `rgba(${nebula.colour}, ${nebula.alpha * 0.4})`,
    );
    gradient.addColorStop(1, `rgba(${nebula.colour}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
}

/** The backdrop is painted once at this share of the viewport's size. */
const BACKDROP_SCALE = 1 / 8;

const backdrops = new WeakMap<
  object,
  { width: number; height: number; canvas: HTMLCanvasElement | null }
>();

/**
 * The sky and its nebula as one small opaque surface per canvas and
 * viewport size: the tints are wide and soft, so they are painted once at
 * an eighth of the size and stretched, instead of three full-canvas
 * gradients a frame. Null where a canvas cannot be made (the sky is then
 * painted directly).
 */
function backdropOf(
  context: CanvasRenderingContext2D,
  viewport: { readonly width: number; readonly height: number },
): HTMLCanvasElement | null {
  const known = backdrops.get(context);
  if (
    known !== undefined &&
    known.width === viewport.width &&
    known.height === viewport.height
  )
    return known.canvas;
  let canvas: HTMLCanvasElement | null = null;
  try {
    const made = context.canvas?.ownerDocument?.createElement("canvas") ?? null;
    const width = Math.max(1, Math.ceil(viewport.width * BACKDROP_SCALE));
    const height = Math.max(1, Math.ceil(viewport.height * BACKDROP_SCALE));
    if (made !== null) {
      made.width = width;
      made.height = height;
      const surface = made.getContext("2d");
      if (surface !== null) {
        paintBackdrop(surface, width, height);
        canvas = made;
      }
    }
  } catch {
    canvas = null;
  }
  backdrops.set(context, {
    width: viewport.width,
    height: viewport.height,
    canvas,
  });
  return canvas;
}

/** Fills the whole canvas with the night sky. Replaces the flat fill. */
export function drawStarfieldV7(
  context: CanvasRenderingContext2D,
  frame: StarfieldFrameV7,
): void {
  const { viewport, camera } = frame;
  const spec = STARFIELD_V7;
  const ratio = frame.devicePixelRatio > 0 ? frame.devicePixelRatio : 1;
  const snap = (value: number): number => Math.round(value * ratio) / ratio;
  context.save();
  context.globalAlpha = 1;
  const backdrop = backdropOf(context, viewport);
  if (backdrop === null)
    paintBackdrop(context, viewport.width, viewport.height);
  else {
    context.imageSmoothingEnabled = true;
    context.drawImage(backdrop, 0, 0, viewport.width, viewport.height);
  }
  // The stars: one path per layer and brightness.
  spec.layers.forEach((layer, index) => {
    const place = starLayerPlacementV7(layer, camera);
    const stars = starLayerV7(index);
    const size = Math.max(1 / ratio, snap(layer.size));
    context.fillStyle = layer.colour;
    for (const level of [0, 1] as const) {
      context.globalAlpha = layer.alphas[level];
      context.beginPath();
      for (const star of stars) {
        if (star.level !== level) continue;
        for (
          let x = place.x + star.x * place.scale;
          x < viewport.width;
          x += place.width
        ) {
          if (x < -size) continue;
          for (
            let y = place.y + star.y * place.scale;
            y < viewport.height;
            y += place.height
          ) {
            if (y < -size) continue;
            context.rect(snap(x), snap(y), size, size);
          }
        }
      }
      context.fill();
    }
  });
  // The bright stars ride the nearest layer.
  const near = spec.layers[spec.layers.length - 1];
  if (near !== undefined) {
    const place = starLayerPlacementV7(near, camera);
    const arm = spec.glint;
    const dot = Math.max(1 / ratio, snap(2));
    const thin = Math.max(1 / ratio, snap(1));
    for (const star of brightStarsV7()) {
      const alpha = twinkleAlphaV7(star, frame.timeMs);
      context.fillStyle = star.colour;
      for (
        let x = place.x + star.x * place.scale;
        x < viewport.width + arm;
        x += place.width
      ) {
        if (x < -arm) continue;
        for (
          let y = place.y + star.y * place.scale;
          y < viewport.height + arm;
          y += place.height
        ) {
          if (y < -arm) continue;
          const cx = snap(x);
          const cy = snap(y);
          context.globalAlpha = 0.5 * alpha;
          context.fillRect(cx - arm, cy, 2 * arm + dot, thin);
          context.fillRect(cx, cy - arm, thin, 2 * arm + dot);
          context.globalAlpha = alpha;
          context.fillRect(cx - thin, cy - thin, dot + thin, dot + thin);
        }
      }
    }
  }
  context.restore();
}
