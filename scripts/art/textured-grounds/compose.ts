/**
 * EXPERIMENT (bead pulp_wars-2yc.48, second round; docs/art/TEXTURED_GROUNDS.md):
 * the things that lie on a textured ground.
 *
 * A quilt of fields that hold both bare dust and rocks goes wrong: the
 * nearest window is always the emptiest one, and the texture ends as flat
 * dust with one pebble. So a textured ground has two layers. The ground
 * itself (dust, moss, peat) is quilted from the parts of the fields that
 * are only ground (quilt.ts). The things on it (rocks, stones, sedge) are
 * the fields' own features, cut out as the motifs of the flat grounds are
 * (scripts/art/faction-grounds/derive.ts) and strewn over the torus by a
 * seeded roll: so many of each kind per board cell, the large ones first,
 * no two closer than `gap`, each drawn whole. No pixel of a field is
 * redrawn; only where a thing lies is decided in code.
 */
import type { RgbaRaster } from "../chibi/owner-mask";
import {
  groundHash,
  groundKindMotifs,
  type GroundFieldSource,
  type GroundKind,
  type GroundMotif,
} from "../faction-grounds/derive";

export interface ScatterKind extends Omit<
  GroundKind,
  "count" | "blob" | "inside"
> {
  /** How many lie on a board cell (80 x 80), on average. */
  readonly perCell: number;
}

export interface ScatterRecipe {
  readonly fields: readonly GroundFieldSource[];
  readonly kinds: readonly ScatterKind[];
  /** Clear pixels between two things. Default 3. */
  readonly gap?: number;
  readonly seed: number;
  /**
   * For a single tile: things keep this far from its edge and do not wrap.
   * Without it the canvas is a torus.
   */
  readonly margin?: number;
}

function hex(colour: string): readonly [number, number, number] {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as readonly [number, number, number];
}

/** The motifs of every kind of a recipe, in the fields' scan order. */
export function scatterMotifs(
  fields: readonly RgbaRaster[],
  recipe: ScatterRecipe,
): GroundMotif[][] {
  return groundKindMotifs(fields, {
    fields: recipe.fields,
    kinds: recipe.kinds.map((kind) => ({ ...kind, count: [0, 0] as const })),
    variants: 1,
    seed: recipe.seed,
  });
}

/**
 * Strews the kinds over `canvas` (changed in place) and returns how many of
 * each were placed.
 */
export function scatter(
  canvas: RgbaRaster,
  fields: readonly RgbaRaster[],
  recipe: ScatterRecipe,
  variant = 0,
  motifs: GroundMotif[][] = scatterMotifs(fields, recipe),
): Record<string, number> {
  const { width, height } = canvas;
  const gap = recipe.gap ?? 3;
  const torus = recipe.margin === undefined;
  const margin = recipe.margin ?? 0;
  const blocked = new Uint8Array(width * height);
  const cells = (width * height) / 6400;
  const placed: Record<string, number> = {};
  let roll = 0;
  const next = (): number => {
    roll += 1;
    return groundHash(recipe.seed, variant, roll, 0x53);
  };
  const wrap = (value: number, by: number): number => ((value % by) + by) % by;
  for (const [kindIndex, kind] of recipe.kinds.entries()) {
    const list = motifs[kindIndex] ?? [];
    placed[kind.id] = 0;
    const source = recipe.fields[kind.field ?? 0];
    if (list.length === 0 || source === undefined) continue;
    const whole = Math.floor(kind.perCell * cells);
    const count =
      whole + (next() % 1000 < (kind.perCell * cells - whole) * 1000 ? 1 : 0);
    // Each motif in turn from a seeded start, so the kind's whole variety
    // is on the ground before one comes back.
    const start = next() % list.length;
    const stride = 1 + (next() % Math.max(1, list.length - 1));
    for (let made = 0; made < count; made += 1) {
      const motif = list[(start + made * stride) % list.length];
      if (motif === undefined) continue;
      const spanX = torus ? width : width - 2 * margin - motif.width + 1;
      const spanY = torus ? height : height - 2 * margin - motif.height + 1;
      if (spanX <= 0 || spanY <= 0) continue;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const left = (torus ? 0 : margin) + (next() % spanX);
        const top = (torus ? 0 : margin) + (next() % spanY);
        let free = true;
        for (let y = 0; y < motif.height && free; y += 1)
          for (let x = 0; x < motif.width && free; x += 1) {
            if (motif.pixels[y * motif.width + x] === 255) continue;
            if (
              blocked[wrap(top + y, height) * width + wrap(left + x, width)] ===
              1
            )
              free = false;
          }
        if (!free) continue;
        for (let y = 0; y < motif.height; y += 1)
          for (let x = 0; x < motif.width; x += 1) {
            const index = motif.pixels[y * motif.width + x] ?? 255;
            if (index === 255) continue;
            const at = wrap(top + y, height) * width + wrap(left + x, width);
            const [r, g, b] = hex(
              index === 254
                ? (kind.hollow ?? "#000000")
                : (kind.to?.[index] ?? source.to[index] ?? "#000000"),
            );
            canvas.data.set([r, g, b, 255], at * 4);
            for (let dy = -gap; dy <= gap; dy += 1)
              for (let dx = -gap; dx <= gap; dx += 1) {
                const bx = left + x + dx;
                const by = top + y + dy;
                if (!torus && (bx < 0 || by < 0 || bx >= width || by >= height))
                  continue;
                blocked[wrap(by, height) * width + wrap(bx, width)] = 1;
              }
          }
        placed[kind.id] = (placed[kind.id] ?? 0) + 1;
        break;
      }
    }
  }
  return placed;
}
