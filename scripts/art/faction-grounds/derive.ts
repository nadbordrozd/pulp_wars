/**
 * Board tiles from PixelLab ground fields (bead pulp_wars-2yc.48,
 * docs/art/FACTION_GRASS.md, "Grounds from PixelLab fields").
 *
 * A field is one 160 x 160 Pixflux image forced to a small palette: a flat
 * base colour with small features on it (reed tufts, burnt twigs, embers,
 * pebbles, sprinkles). Pixflux does not draw a tile: it draws a field with
 * a band of moss through it or a rock in a corner, as dense as it likes.
 * So a tile is composed in code from the field's features, with no further
 * PixelLab call:
 *
 * 1. **Palette.** Every pixel of a field is snapped to the nearest colour
 *    of its forced palette. The base colour is the one most of the field
 *    has.
 * 2. **Motifs.** A feature is a connected group of pixels that are not the
 *    base colour and that does not touch the field's edge. A recipe's
 *    `kinds` sort the features of its fields by size and colour (a reed
 *    tuft, a glow speck, an ember): each kind's features, in the field's
 *    scan order, are that kind's motifs. Nothing is drawn by hand and no
 *    pixel of a motif is changed.
 * 3. **Placement.** A tile starts as the flat base colour. Each kind puts a
 *    seeded number of its motifs on free ground, at least `margin` pixels
 *    inside the tile and `gap` pixels from every other motif, so every
 *    edge pixel of every tile is the base colour: any variant joins any
 *    other, and any other ground's spill, without a seam. A kind may ask
 *    to lie `inside` an earlier kind's motif (a glint in a pool). A `blob`
 *    kind is the one shape cut in code: a flat patch of a second ground
 *    tone (a pool, a soot patch) for the motifs to lie on or beside.
 * 4. **Colours.** Each palette colour becomes its board colour, so hue,
 *    value and contrast are tuned here and never by another generation.
 */
import type { RgbaRaster } from "../chibi/owner-mask";

export const GROUND_CELL = 80;

type Rgb = readonly [number, number, number];

function hex(colour: string): Rgb {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as Rgb;
}

export function groundHash(a: number, b: number, c: number, d: number): number {
  let h =
    Math.imul(a | 0, 0x9e3779b1) ^
    Math.imul(b | 0, 0x85ebca6b) ^
    Math.imul(c | 0, 0xc2b2ae35) ^
    Math.imul(d | 0, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** The palette index of every pixel of a field. */
export function groundIndices(
  field: RgbaRaster,
  palette: readonly string[],
): Uint8Array {
  const colours = palette.map(hex);
  const indices = new Uint8Array(field.width * field.height);
  for (let at = 0; at < indices.length; at += 1) {
    const r = field.data[at * 4] ?? 0;
    const g = field.data[at * 4 + 1] ?? 0;
    const b = field.data[at * 4 + 2] ?? 0;
    let best = 0;
    let bestDistance = Infinity;
    for (const [index, colour] of colours.entries()) {
      const distance =
        (r - colour[0]) ** 2 + (g - colour[1]) ** 2 + (b - colour[2]) ** 2;
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    }
    indices[at] = best;
  }
  return indices;
}

/** The palette index most pixels have. */
export function groundBaseIndex(indices: Uint8Array, colours: number): number {
  const counts = new Array<number>(colours).fill(0);
  for (const index of indices) counts[index] = (counts[index] ?? 0) + 1;
  return counts.indexOf(Math.max(...counts));
}

/** A feature of a field: its pixels as palette indices, 255 for none. */
export interface GroundMotif {
  readonly field: number;
  /** Its place in the field (the top-left of its box). */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly area: number;
  /** `width * height` palette indices; 255 where the motif has no pixel. */
  readonly pixels: Uint8Array;
  /** The palette indices it holds. */
  readonly colours: readonly number[];
}

export interface GroundFieldSource {
  /** The field's forced palette. */
  readonly from: readonly string[];
  /** The board colour of each palette colour. */
  readonly to: readonly string[];
  /** The palette index of the ground itself. Default: the commonest. */
  readonly base?: number;
  /**
   * Palette indices that count as ground too when the features are cut
   * out (a second ground tone the field drew as a band or as blotches).
   */
  readonly ground?: readonly number[];
}

/** Every feature of a field that does not touch its edge, in scan order. */
export function groundMotifs(
  field: RgbaRaster,
  source: GroundFieldSource,
  fieldIndex = 0,
): GroundMotif[] {
  const { width, height } = field;
  const indices = groundIndices(field, source.from);
  const base = source.base ?? groundBaseIndex(indices, source.from.length);
  const ground = new Set<number>([base, ...(source.ground ?? [])]);
  const seen = new Uint8Array(width * height);
  const motifs: GroundMotif[] = [];
  for (let start = 0; start < indices.length; start += 1) {
    if (ground.has(indices[start] ?? 0) || seen[start] === 1) continue;
    const group: number[] = [];
    const stack = [start];
    seen[start] = 1;
    let atEdge = false;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (stack.length > 0) {
      const at = stack.pop() as number;
      group.push(at);
      const ax = at % width;
      const ay = Math.floor(at / width);
      if (ax === 0 || ay === 0 || ax === width - 1 || ay === height - 1)
        atEdge = true;
      minX = Math.min(minX, ax);
      minY = Math.min(minY, ay);
      maxX = Math.max(maxX, ax);
      maxY = Math.max(maxY, ay);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = ax + dx;
          const ny = ay + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const to = ny * width + nx;
          if (ground.has(indices[to] ?? 0) || seen[to] === 1) continue;
          seen[to] = 1;
          stack.push(to);
        }
    }
    if (atEdge) continue;
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const pixels = new Uint8Array(boxWidth * boxHeight).fill(255);
    const colours = new Set<number>();
    for (const at of group) {
      const index = indices[at] ?? 0;
      colours.add(index);
      pixels[(Math.floor(at / width) - minY) * boxWidth + (at % width) - minX] =
        index;
    }
    motifs.push({
      field: fieldIndex,
      left: minX,
      top: minY,
      width: boxWidth,
      height: boxHeight,
      area: group.length,
      pixels,
      colours: [...colours].sort((a, b) => a - b),
    });
  }
  return motifs;
}

export interface GroundKind {
  readonly id: string;
  /** Which of the recipe's fields its motifs come from. Default 0. */
  readonly field?: number;
  /** Pixels of a motif, least and most. */
  readonly area: readonly [number, number];
  /** The largest box of a motif. Default 40 x 40. */
  readonly box?: readonly [number, number];
  /** A motif holds at least one pixel of one of these palette indices. */
  readonly has?: readonly number[];
  /** A motif holds no pixel of these palette indices. */
  readonly lacks?: readonly number[];
  /** Only motifs whose box lies in this part of the field. */
  readonly region?: readonly [number, number, number, number];
  /** Motifs left out, by their place in the kind's list. */
  readonly skip?: readonly number[];
  /** How many a tile gets, least and most. */
  readonly count: readonly [number, number];
  /** Replaces the field's board colours for this kind, by palette index. */
  readonly to?: Readonly<Record<number, string>>;
  /** Every pixel of the motif lies on a motif of this earlier kind. */
  readonly inside?: string;
  /**
   * The motifs are turned upside down. A field's stones are lit from the
   * top left; upside down they are lit from the bottom left, as the board
   * is (docs/art/ART_DIRECTION.md, Light). Only for things that have no up
   * or down seen from above: a stone, never a tuft.
   */
  readonly flip?: true;
  /**
   * The colour of the ground a motif encloses: a ring the field drew on
   * its own base colour (a charred lump on soot) keeps that inside when it
   * lies on another ground.
   */
  readonly hollow?: string;
  /**
   * Not a motif of a field: a flat patch of a second ground tone (a pool,
   * soot, moss), an irregular ellipse cut by this module as the patches of
   * scripts/art/faction-grass.ts are. `area`, `has` and the other motif
   * filters do not apply. Later kinds may lie on it.
   */
  readonly blob?: {
    /** Its half-width, least and most; its half-height is 55% to 85%. */
    readonly radius: readonly [number, number];
    readonly fill: string;
    /** One pixel row along its lower (or, with `rimTop`, upper) edge. */
    readonly rim?: string;
    readonly rimTop?: string;
  };
}

export interface GroundTileRecipe {
  readonly fields: readonly GroundFieldSource[];
  /** The board colour of the ground. Default: field 0's base colour's. */
  readonly ground?: string;
  readonly kinds: readonly GroundKind[];
  /** How many tiles the ground has. */
  readonly variants: number;
  /** Clear pixels between a motif and the tile's edge. Default 2. */
  readonly margin?: number;
  /** Clear pixels between two motifs. Default 3. */
  readonly gap?: number;
  readonly seed: number;
}

/** The motifs of each kind of a recipe, in the order they are picked. */
export function groundKindMotifs(
  fields: readonly RgbaRaster[],
  recipe: GroundTileRecipe,
): GroundMotif[][] {
  const all = recipe.fields.map((source, index) => {
    const field = fields[index];
    if (field === undefined) throw new Error(`field ${index} is missing`);
    if (source.from.length !== source.to.length)
      throw new Error("a field maps each palette colour to one board colour");
    return groundMotifs(field, source, index);
  });
  return recipe.kinds.map((kind) => {
    if (kind.blob !== undefined) return [];
    const box = kind.box ?? [40, 40];
    const list = (all[kind.field ?? 0] ?? []).filter(
      (motif) =>
        motif.area >= kind.area[0] &&
        motif.area <= kind.area[1] &&
        motif.width <= box[0] &&
        motif.height <= box[1] &&
        (kind.has === undefined ||
          kind.has.some((index) => motif.colours.includes(index))) &&
        !(kind.lacks ?? []).some((index) => motif.colours.includes(index)) &&
        (kind.region === undefined ||
          (motif.left >= kind.region[0] &&
            motif.top >= kind.region[1] &&
            motif.left + motif.width <= kind.region[0] + kind.region[2] &&
            motif.top + motif.height <= kind.region[1] + kind.region[3])),
    );
    return list
      .filter((_, index) => !(kind.skip ?? []).includes(index))
      .map((motif) => (kind.hollow === undefined ? motif : hollowed(motif)))
      .map((motif) => (kind.flip === true ? flipped(motif) : motif));
  });
}

/** Marks the pixels a motif encloses (index 254). */
const HOLLOW = 254;
function hollowed(motif: GroundMotif): GroundMotif {
  const { width, height } = motif;
  const pixels = new Uint8Array(motif.pixels);
  const outside = new Uint8Array(width * height);
  const stack: number[] = [];
  const visit = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const at = y * width + x;
    if (outside[at] === 1 || pixels[at] !== 255) return;
    outside[at] = 1;
    stack.push(at);
  };
  for (let x = 0; x < width; x += 1) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    visit(0, y);
    visit(width - 1, y);
  }
  while (stack.length > 0) {
    const at = stack.pop() as number;
    const x = at % width;
    const y = Math.floor(at / width);
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
  for (let at = 0; at < pixels.length; at += 1)
    if (pixels[at] === 255 && outside[at] === 0) pixels[at] = HOLLOW;
  return { ...motif, pixels };
}

function flipped(motif: GroundMotif): GroundMotif {
  const pixels = new Uint8Array(motif.pixels.length);
  for (let y = 0; y < motif.height; y += 1)
    pixels.set(
      motif.pixels.subarray(y * motif.width, (y + 1) * motif.width),
      (motif.height - 1 - y) * motif.width,
    );
  return { ...motif, pixels };
}

export interface GroundTileStats {
  /** Motifs placed, by kind id. */
  readonly placed: Readonly<Record<string, number>>;
  /** Pixels off the ground colour, of 100. */
  readonly detail: number;
}

/** One board tile of a ground (`variant` is 0-based). */
export function deriveGroundTile(
  fields: readonly RgbaRaster[],
  recipe: GroundTileRecipe,
  variant: number,
  kindMotifs: GroundMotif[][] = groundKindMotifs(fields, recipe),
): { readonly raster: RgbaRaster; readonly stats: GroundTileStats } {
  const size = GROUND_CELL;
  const margin = recipe.margin ?? 2;
  const gap = recipe.gap ?? 3;
  const first = recipe.fields[0];
  if (first === undefined) throw new Error("a ground recipe needs a field");
  const firstField = fields[0];
  if (firstField === undefined) throw new Error("field 0 is missing");
  const ground = hex(
    recipe.ground ??
      first.to[
        first.base ??
          groundBaseIndex(
            groundIndices(firstField, first.from),
            first.from.length,
          )
      ] ??
      "#000000",
  );
  const data = new Uint8Array(size * size * 4);
  for (let at = 0; at < size * size; at += 1) {
    data[at * 4] = ground[0];
    data[at * 4 + 1] = ground[1];
    data[at * 4 + 2] = ground[2];
    data[at * 4 + 3] = 255;
  }
  // Which kind's motif holds a pixel (kind index + 1), and the pixels
  // within `gap` of a motif, which no other motif may take.
  const owner = new Uint8Array(size * size);
  const blocked = new Uint8Array(size * size);
  let roll = 0;
  const next = (): number => {
    roll += 1;
    return groundHash(recipe.seed, variant, roll, 0x48);
  };
  const placed: Record<string, number> = {};
  let detail = 0;
  for (const [kindIndex, kind] of recipe.kinds.entries()) {
    const motifs = kindMotifs[kindIndex] ?? [];
    placed[kind.id] = 0;
    if (kind.blob !== undefined) {
      const { radius, fill, rim, rimTop } = kind.blob;
      const blobs =
        kind.count[0] + (next() % (kind.count[1] - kind.count[0] + 1));
      for (let made = 0; made < blobs; made += 1) {
        const rx = radius[0] + (next() % (radius[1] - radius[0] + 1));
        const ry = Math.max(2, Math.round(rx * (0.55 + (next() % 31) / 100)));
        const reach = margin + 2;
        const cx = reach + rx + (next() % (size - 2 * (reach + rx)));
        const cy = reach + ry + (next() % (size - 2 * (reach + ry)));
        const p1 = (next() % 628) / 100;
        const p2 = (next() % 628) / 100;
        const within = (x: number, y: number): boolean => {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const angle = Math.atan2(dy, dx);
          return (
            Math.hypot(dx, dy) <
            1 + 0.2 * Math.sin(3 * angle + p1) + 0.12 * Math.sin(5 * angle + p2)
          );
        };
        for (let y = cy - ry - 2; y <= cy + ry + 2; y += 1)
          for (let x = cx - rx - 2; x <= cx + rx + 2; x += 1) {
            if (x < margin || y < margin || x >= size - margin) continue;
            if (y >= size - margin || !within(x, y)) continue;
            const at = y * size + x;
            const [r, g, b] = hex(
              rim !== undefined && !within(x, y + 1)
                ? rim
                : rimTop !== undefined && !within(x, y - 1)
                  ? rimTop
                  : fill,
            );
            data[at * 4] = r;
            data[at * 4 + 1] = g;
            data[at * 4 + 2] = b;
            if (owner[at] === 0) detail += 1;
            owner[at] = kindIndex + 1;
          }
        placed[kind.id] = (placed[kind.id] ?? 0) + 1;
      }
      continue;
    }
    if (motifs.length === 0) continue;
    const source = recipe.fields[kind.field ?? 0];
    if (source === undefined) continue;
    const insideOf =
      kind.inside === undefined
        ? 0
        : recipe.kinds.findIndex((other) => other.id === kind.inside) + 1;
    const count =
      kind.count[0] + (next() % (kind.count[1] - kind.count[0] + 1));
    for (let made = 0; made < count; made += 1) {
      const motif = motifs[next() % motifs.length];
      if (motif === undefined) continue;
      const spanX = size - 2 * margin - motif.width;
      const spanY = size - 2 * margin - motif.height;
      if (spanX < 0 || spanY < 0) continue;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const left = margin + (next() % (spanX + 1));
        const top = margin + (next() % (spanY + 1));
        let free = true;
        for (let y = 0; y < motif.height && free; y += 1)
          for (let x = 0; x < motif.width && free; x += 1) {
            if (motif.pixels[y * motif.width + x] === 255) continue;
            const at = (top + y) * size + left + x;
            if (insideOf > 0 ? owner[at] !== insideOf : blocked[at] === 1)
              free = false;
          }
        if (!free) continue;
        for (let y = 0; y < motif.height; y += 1)
          for (let x = 0; x < motif.width; x += 1) {
            const index = motif.pixels[y * motif.width + x] ?? 255;
            if (index === 255) continue;
            const at = (top + y) * size + left + x;
            const [r, g, b] = hex(
              index === HOLLOW
                ? (kind.hollow ?? "#000000")
                : (kind.to?.[index] ?? source.to[index] ?? "#000000"),
            );
            data[at * 4] = r;
            data[at * 4 + 1] = g;
            data[at * 4 + 2] = b;
            if (owner[at] === 0) detail += 1;
            owner[at] = kindIndex + 1;
            for (let dy = -gap; dy <= gap; dy += 1)
              for (let dx = -gap; dx <= gap; dx += 1) {
                const bx = left + x + dx;
                const by = top + y + dy;
                if (bx < 0 || by < 0 || bx >= size || by >= size) continue;
                blocked[by * size + bx] = 1;
              }
          }
        placed[kind.id] = (placed[kind.id] ?? 0) + 1;
        break;
      }
    }
  }
  return {
    raster: { width: size, height: size, data },
    stats: {
      placed,
      detail: Number(((detail / (size * size)) * 100).toFixed(1)),
    },
  };
}
