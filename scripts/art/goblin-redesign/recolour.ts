/**
 * Recolour mockups of the Goblin redesign study (bead pulp_wars-wrn.1):
 * a deterministic palette remap of the CURRENT production sprites onto a
 * direction of directions.ts, so a palette can be judged on real shapes
 * before any PixelLab call. It is a mockup only: the shapes stay the old
 * ones, and the redesign changes them too.
 *
 * Three steps:
 *
 * 1. Classify every opaque pixel by colour alone into ink (the black
 *    outline), skin (any green), leather, wood, rust, metal, light (cream)
 *    or the hazard accent; the fireworks' paper and the red tongues are left
 *    as they are ("keep").
 * 2. Re-rank each material's own shading onto the direction's five-step
 *    ramp: the pixels are sorted by lightness, and the darkest share of them
 *    takes the shadow step, the next share the mid step, and so on. The
 *    shading order of the sprite is kept, while the ramp's shares impose the
 *    value structure (at least half lit or lighter).
 * 3. Two line rules of the direction: an inner ink line (one with no
 *    transparent neighbour) takes the shadow step of the material around it,
 *    so only the silhouette is black; and a pixel just under the top edge of
 *    the silhouette moves one step lighter, a rim light that separates a big
 *    dark body from the ground.
 */
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import { lab, rgbOf, type Rgb } from "../ice-folk-direction/colour";
import type {
  GoblinDirectionV7,
  GoblinMaterialV7,
  GoblinRampV7,
  GoblinSkinKindV7,
} from "./directions";

export type PixelClassV7 = GoblinMaterialV7 | "ink" | "keep" | "clear";

/**
 * Outline ink: PixelLab draws the outline in pure black (`#000000`,
 * `#010004`); every channel at most 14. Near-black browns and greens
 * (`#1e0600`, `#20301c`) are material shadows, not ink.
 */
export const isInkRgb = (rgb: Rgb): boolean => Math.max(...rgb) <= 14;

export interface ClassifyOptionsV7 {
  /** Very dark browns: planks ("wood") or leather shadows ("leather"). */
  readonly darkBrown?: "wood" | "leather";
  /** Red-brown rust: its own material ("rust") or leather ("leather"). */
  readonly rust?: "rust" | "leather";
}

/** The material of one opaque pixel, by colour alone. */
export function classifyGoblinPixelV7(
  rgb: Rgb,
  options: ClassifyOptionsV7 = {},
): PixelClassV7 {
  if (isInkRgb(rgb)) return "ink";
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  // Hazard yellow and the yellow rocket: saturated, light, hue 38 to 56.
  if (hue >= 38 && hue < 56 && saturation >= 0.7 && value >= 0.75)
    return "accent";
  // The fireworks' paper (red, orange, blue) and tongues: very saturated.
  if (saturation >= 0.85 && value >= 0.55 && !(hue >= 56 && hue < 170))
    return "keep";
  if (saturation >= 0.6 && hue >= 180 && hue < 300) return "keep";
  // Cream: teeth, eyes, bandages, the rocket cones, pale tents.
  if (
    (value >= 0.72 && saturation < 0.42 && (hue < 70 || saturation < 0.12)) ||
    (value >= 0.9 && saturation < 0.55 && hue >= 30 && hue < 70)
  )
    return "light";
  // Greens: every skin, from olive (hue 60) to the Troll (hue 128).
  if (hue >= 56 && hue < 170 && saturation >= 0.16) return "skin";
  // Neutrals: gunmetal, the wolf's fur, the club's stone, helmets.
  if (saturation < 0.2 || (hue >= 170 && hue < 260 && saturation < 0.4))
    return "metal";
  // Warm browns and rust, hue 0 to 56 (and the reds above 330).
  if (hue < 56 || hue >= 330) {
    if (value < 0.34 && options.darkBrown !== "leather") return "wood";
    if (hue < 22 && saturation >= 0.55 && options.rust !== "leather")
      return "rust";
    return "leather";
  }
  return "metal";
}

const pixelRgb = (raster: RgbaRaster, index: number): Rgb => [
  raster.data[index * 4] ?? 0,
  raster.data[index * 4 + 1] ?? 0,
  raster.data[index * 4 + 2] ?? 0,
];

const opaqueAt = (raster: RgbaRaster, x: number, y: number): boolean =>
  x >= 0 &&
  y >= 0 &&
  x < raster.width &&
  y < raster.height &&
  (raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128;

/** The class of every pixel of a sprite ("clear" for transparent ones). */
export function classifyRaster(
  raster: RgbaRaster,
  options: ClassifyOptionsV7 = {},
): PixelClassV7[] {
  const classes: PixelClassV7[] = [];
  for (let index = 0; index < raster.width * raster.height; index += 1)
    classes.push(
      (raster.data[index * 4 + 3] ?? 0) < 128
        ? "clear"
        : classifyGoblinPixelV7(pixelRgb(raster, index), options),
    );
  return classes;
}

/** A flat false colour per class, for the classification evidence sheet. */
export const CLASS_COLOURS_V7: Readonly<Record<PixelClassV7, string>> = {
  ink: "#000000",
  skin: "#4cc34c",
  leather: "#c8843c",
  wood: "#6b3a14",
  rust: "#e0401a",
  metal: "#8fa0b4",
  light: "#fff4d0",
  accent: "#ffd400",
  keep: "#d040d0",
  clear: "#00000000",
};

export function classMap(
  raster: RgbaRaster,
  options: ClassifyOptionsV7 = {},
): RgbaRaster {
  const classes = classifyRaster(raster, options);
  const data = new Uint8Array(raster.width * raster.height * 4);
  classes.forEach((kind, index) => {
    if (kind === "clear") return;
    const rgb = rgbOf(CLASS_COLOURS_V7[kind]);
    data.set([rgb[0], rgb[1], rgb[2], 255], index * 4);
  });
  return { width: raster.width, height: raster.height, data };
}

/**
 * Step of each pixel of one material: unique source colours are ranked by
 * lightness, and a colour takes the step whose cumulative share holds the
 * middle of its own pixel range.
 */
function stepsForMaterial(
  pixels: readonly { readonly index: number; readonly rgb: Rgb }[],
  shares: GoblinRampV7["shares"],
): Map<number, number> {
  const byColour = new Map<string, { lightness: number; indices: number[] }>();
  for (const pixel of pixels) {
    const key = pixel.rgb.join(",");
    const entry = byColour.get(key);
    if (entry === undefined)
      byColour.set(key, {
        lightness: lab(pixel.rgb)[0],
        indices: [pixel.index],
      });
    else entry.indices.push(pixel.index);
  }
  const ordered = [...byColour.values()].sort(
    (a, b) => a.lightness - b.lightness,
  );
  const bounds: number[] = [];
  let running = 0;
  for (const share of shares) bounds.push((running += share));
  const steps = new Map<number, number>();
  let seen = 0;
  for (const colour of ordered) {
    const middle = (seen + colour.indices.length / 2) / pixels.length;
    seen += colour.indices.length;
    let step = bounds.findIndex((bound) => middle <= bound + 1e-9);
    if (step < 0) step = shares.length - 1;
    for (const index of colour.indices) steps.set(index, step);
  }
  return steps;
}

export interface RecolourOptionsV7 extends ClassifyOptionsV7 {
  readonly skin: GoblinSkinKindV7;
  /** Inner ink lines take the material's shadow step (default true). */
  readonly innerLines?: boolean;
  /** One step lighter just under the top edge of the silhouette (default true). */
  readonly rimLight?: boolean;
}

export interface RecolourResultV7 {
  readonly raster: RgbaRaster & { readonly data: Uint8Array };
  readonly classes: readonly PixelClassV7[];
  /** Opaque pixels per class. */
  readonly counts: Readonly<Partial<Record<PixelClassV7, number>>>;
  readonly innerLinePixels: number;
  readonly rimPixels: number;
}

export function recolourGoblinSpriteV7(
  source: RgbaRaster,
  direction: GoblinDirectionV7,
  options: RecolourOptionsV7,
): RecolourResultV7 {
  const { width, height } = source;
  const classes = classifyRaster(source, options);
  const rampOf = (kind: PixelClassV7): GoblinRampV7 | undefined =>
    kind === "skin"
      ? direction.skins[options.skin]
      : kind === "ink" || kind === "keep" || kind === "clear"
        ? undefined
        : direction.ramps[kind];
  const groups = new Map<PixelClassV7, { index: number; rgb: Rgb }[]>();
  classes.forEach((kind, index) => {
    const ramp = rampOf(kind);
    if (ramp === undefined) return;
    const list = groups.get(kind) ?? [];
    list.push({ index, rgb: pixelRgb(source, index) });
    groups.set(kind, list);
  });
  const step = new Map<number, number>();
  for (const [kind, pixels] of groups) {
    const ramp = rampOf(kind);
    if (ramp === undefined) continue;
    for (const [index, value] of stepsForMaterial(pixels, ramp.shares))
      step.set(index, value);
  }
  const data = new Uint8Array(source.data);
  const write = (index: number, hex: string): void => {
    const rgb = rgbOf(hex);
    data[index * 4] = rgb[0];
    data[index * 4 + 1] = rgb[1];
    data[index * 4 + 2] = rgb[2];
  };
  let rimPixels = 0;
  classes.forEach((kind, index) => {
    const ramp = rampOf(kind);
    if (ramp === undefined) {
      if (kind === "ink") write(index, direction.ink);
      return;
    }
    let value = step.get(index) ?? 2;
    if (options.rimLight !== false) {
      const x = index % width;
      const y = Math.floor(index / width);
      // Under the top edge: the outline above, open air two pixels up.
      const aboveIsEdge =
        classes[(y - 1) * width + x] === "ink" && !opaqueAt(source, x, y - 2);
      if (y >= 2 && aboveIsEdge && value < 4) {
        value += 1;
        rimPixels += 1;
      }
    }
    write(index, ramp.colours[value] ?? ramp.colours[2]);
  });
  let innerLinePixels = 0;
  if (options.innerLines !== false)
    classes.forEach((kind, index) => {
      if (kind !== "ink") return;
      const x = index % width;
      const y = Math.floor(index / width);
      const around: PixelClassV7[] = [];
      let open = false;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        if (!opaqueAt(source, x + dx, y + dy)) {
          open = true;
          break;
        }
        const neighbour = classes[(y + dy) * width + x + dx];
        if (neighbour !== undefined && rampOf(neighbour) !== undefined)
          around.push(neighbour);
      }
      if (open || around.length < 3) return;
      const tally = new Map<PixelClassV7, number>();
      for (const neighbour of around)
        tally.set(neighbour, (tally.get(neighbour) ?? 0) + 1);
      const [material] =
        [...tally.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
      const ramp = material === undefined ? undefined : rampOf(material);
      if (ramp === undefined) return;
      write(index, ramp.colours[0]);
      innerLinePixels += 1;
    });
  const counts: Partial<Record<PixelClassV7, number>> = {};
  for (const kind of classes)
    if (kind !== "clear") counts[kind] = (counts[kind] ?? 0) + 1;
  return {
    raster: { width, height, data },
    classes,
    counts,
    innerLinePixels,
    rimPixels,
  };
}
