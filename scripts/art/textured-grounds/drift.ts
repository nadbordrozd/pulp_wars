/**
 * Drifts (bead pulp_wars-2yc.53, docs/art/TEXTURED_GROUNDS.md): the slow
 * variation a quilt of a 160 px field does not have. A smooth periodic
 * field over the whole texture, a sum of cosines of whole frequencies (so
 * it wraps with the texture), splits the ground into soft reaches of a
 * lighter and a darker tone a few cells across. No pixel is blended: a
 * pixel takes its palette colour from the light, the plain or the dark
 * board palette, and the edge of a reach is a scatter of single pixels, as
 * a painter would dither it. The same field can make the things strewn on
 * the ground (compose.ts) gather in the darker reaches.
 */
import type { RgbaRaster } from "../chibi/owner-mask";
import { groundHash } from "../faction-grounds/derive";

export interface DriftRecipe {
  readonly seed: number;
  /** The board colour of each palette colour in a light reach. */
  readonly light: readonly string[];
  /** And in a dark one. */
  readonly dark: readonly string[];
  /** The share of the texture in light and in dark reaches, of 1. */
  readonly lightShare: number;
  readonly darkShare: number;
  /** The width of the dithered edge, in units of the field (0.05 to 0.2). */
  readonly dither: number;
  /** The highest frequency, in waves a period. Default 3. */
  readonly frequency?: number;
}

/** The drift field of a texture, 0 (lightest) to 1 (darkest), by pixel. */
export function driftField(
  width: number,
  height: number,
  recipe: Pick<DriftRecipe, "seed" | "frequency">,
): Float32Array {
  const top = recipe.frequency ?? 3;
  const span = 2 * top + 1;
  const waves = Array.from({ length: 9 }, (_, index) => {
    const pick = (salt: number, of: number): number =>
      groundHash(recipe.seed, index, salt, 0x6d) % of;
    let u = pick(1, span) - top;
    const v = pick(2, span) - top;
    if (u === 0 && v === 0) u = 1;
    return {
      u,
      v,
      phase: (pick(3, 1000) / 1000) * Math.PI * 2,
      weight: 1 / Math.hypot(u, v),
    };
  });
  const values = new Float32Array(width * height);
  let low = Infinity;
  let high = -Infinity;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (const wave of waves)
        sum +=
          wave.weight *
          Math.cos(
            2 * Math.PI * ((wave.u * x) / width + (wave.v * y) / height) +
              wave.phase,
          );
      values[y * width + x] = sum;
      low = Math.min(low, sum);
      high = Math.max(high, sum);
    }
  for (let at = 0; at < values.length; at += 1)
    values[at] = ((values[at] ?? 0) - low) / (high - low);
  return values;
}

function hex(colour: string): readonly [number, number, number] {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as readonly [number, number, number];
}

/** The quilt's palette indices painted with the drifts. */
export function paintDrifted(
  indices: Uint8Array,
  width: number,
  to: readonly string[],
  recipe: DriftRecipe,
): RgbaRaster {
  const height = indices.length / width;
  const field = driftField(width, height, recipe);
  const sorted = Float32Array.from(field).sort();
  const at = (share: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0;
  const lightBelow = at(recipe.lightShare);
  const darkAbove = at(1 - recipe.darkShare);
  const palettes = [recipe.light, to, recipe.dark].map((list) => list.map(hex));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      // A per-pixel jitter of the field makes a reach's edge a dither.
      const jitter =
        ((groundHash(recipe.seed, x, y, 0x64) % 1000) / 1000 - 0.5) *
        recipe.dither;
      const value = (field[pixel] ?? 0) + jitter;
      const palette =
        value < lightBelow ? 0 : value > darkAbove ? 2 : (1 as number);
      const [r, g, b] = palettes[palette]?.[indices[pixel] ?? 0] ?? [0, 0, 0];
      data.set([r, g, b, 255], pixel * 4);
    }
  return { width, height, data };
}
