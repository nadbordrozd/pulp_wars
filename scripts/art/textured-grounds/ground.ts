/**
 * A textured ground from its look (docs/art/TEXTURED_GROUNDS.md): the
 * ground quilted from its fields (quilt.ts), its things strewn over it
 * (compose.ts), painted in the look's board colours. A library: the bake
 * of scripts/art/faction-grass.ts and the review commands of
 * scripts/art/textured-grounds.ts both derive a ground here.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import { texturedFieldPath } from "./candidates";
import { scatter, scatterMotifs, type ScatterRecipe } from "./compose";
import { driftField, paintDrifted } from "./drift";
import { swapped, type TexturedField, type TexturedLook } from "./looks";
import {
  busyness,
  paint,
  paletteIndices,
  quilt,
  type QuiltSource,
} from "./quilt";

export interface TexturedGround {
  /** `WORLD`: the periodic texture. */
  readonly world?: RgbaRaster;
  /** `TILES`: the tiles. */
  readonly tiles?: readonly RgbaRaster[];
  /** The share of neighbouring pixel pairs that differ, of 100. */
  readonly busy: number;
  /** Mean luma and its spread, of 100. */
  readonly luma: number;
  readonly spread: number;
}

function tone(rasters: readonly RgbaRaster[]): {
  luma: number;
  spread: number;
} {
  let sum = 0;
  let squares = 0;
  let count = 0;
  for (const raster of rasters)
    for (let at = 0; at < raster.data.length; at += 4) {
      const value =
        0.299 * (raster.data[at] ?? 0) +
        0.587 * (raster.data[at + 1] ?? 0) +
        0.114 * (raster.data[at + 2] ?? 0);
      sum += value;
      squares += value * value;
      count += 1;
    }
  const mean = sum / count;
  return {
    luma: Number(((mean / 255) * 100).toFixed(1)),
    spread: Number(
      ((Math.sqrt(squares / count - mean * mean) / 255) * 100).toFixed(1),
    ),
  };
}

/** The file of a field: of this run, or of the flat grounds' run. */
export function texturedLookFieldPath(field: TexturedField): string {
  return field.flat === undefined
    ? texturedFieldPath(field.id)
    : `art/explorations/faction-grounds-2026-10/raw/${field.id}.png`;
}

async function fieldRaster(
  root: string,
  field: TexturedField,
): Promise<RgbaRaster> {
  return readRaster(
    await readFile(path.join(root, texturedLookFieldPath(field))),
  );
}

/** A look's ground: quilted from its fields, its things strewn over it. */
export async function texturedGround(
  root: string,
  look: TexturedLook,
): Promise<TexturedGround> {
  const sources: QuiltSource[] = [];
  for (const field of look.fields) {
    const raster = await fieldRaster(root, field);
    const indices = paletteIndices(raster, swapped(look.from, field.swap));
    if (process.env.TEXTURED_STATS !== undefined) {
      const counts = new Array<number>(look.from.length).fill(0);
      for (const index of indices) counts[index] = (counts[index] ?? 0) + 1;
      console.log(
        `  ${field.id}: ${counts.map((count, index) => `${index} ${((count / indices.length) * 100).toFixed(0)}%`).join(", ")}`,
      );
    }
    sources.push({
      indices,
      width: raster.width,
      height: raster.height,
      regions: field.regions,
    });
  }
  const things = look.things;
  // The drift field of a WORLD look with drifts, once it is quilted.
  let gatherField: Float32Array | undefined;
  const thingFields: RgbaRaster[] = [];
  for (const field of things?.fields ?? [])
    thingFields.push(await fieldRaster(root, field));
  const recipe = (margin?: number): ScatterRecipe | null =>
    things === undefined
      ? null
      : {
          fields: things.fields.map((field) => ({
            from:
              field.flat?.from ??
              field.palette?.from ??
              swapped(look.from, field.swap),
            to:
              field.flat?.to ??
              field.palette?.to ??
              swapped(look.to, field.swap),
            ...(field.base === undefined ? {} : { base: field.base }),
            ...(field.ground === undefined ? {} : { ground: field.ground }),
          })),
          kinds: things.kinds,
          seed: things.seed,
          ...(things.gap === undefined ? {} : { gap: things.gap }),
          ...(margin === undefined ? {} : { margin }),
          ...(things.whole === undefined || margin !== undefined
            ? {}
            : { whole: things.whole }),
          ...(gatherField === undefined ? {} : { gatherField }),
        };
  const strew = (
    canvas: RgbaRaster,
    variant: number,
    margin?: number,
  ): void => {
    const scatterRecipe = recipe(margin);
    if (scatterRecipe === null) return;
    const placed = scatter(canvas, thingFields, scatterRecipe, variant);
    if (process.env.TEXTURED_STATS !== undefined)
      console.log(
        `  placed: ${Object.entries(placed)
          .map(([kind, count]) => `${kind} ${count}`)
          .join(", ")}`,
      );
  };
  if (process.env.TEXTURED_STATS !== undefined && things !== undefined) {
    const scatterRecipe = recipe();
    if (scatterRecipe !== null)
      console.log(
        `  motifs: ${scatterMotifs(thingFields, scatterRecipe)
          .map((list, index) => `${things.kinds[index]?.id} ${list.length}`)
          .join(", ")}`,
      );
  }
  if (look.mode === "WORLD") {
    const indices = quilt(sources, look.from, look.quilt);
    const drift = look.drift;
    const world =
      drift === undefined
        ? paint(indices, look.quilt.width, look.to)
        : paintDrifted(indices, look.quilt.width, look.to, drift);
    gatherField =
      drift === undefined
        ? undefined
        : driftField(look.quilt.width, look.quilt.height, drift);
    strew(world, 0);
    return {
      world,
      busy: Number((busyness(indices, look.quilt.width) * 100).toFixed(1)),
      ...tone([world]),
    };
  }
  // TILES: one toroidal tile gives the band every tile shares; each tile is
  // quilted again inside that band with its own seed.
  const spec = look.tiles ?? { count: 6, band: 6 };
  const first = quilt(sources, look.from, look.quilt);
  const { width, height } = look.quilt;
  const band = new Uint8Array(width * height).fill(255);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if (
        x < spec.band ||
        y < spec.band ||
        x >= width - spec.band ||
        y >= height - spec.band
      )
        band[y * width + x] = first[y * width + x] ?? 0;
  const tiles: RgbaRaster[] = [];
  let busy = 0;
  for (let index = 0; index < spec.count; index += 1) {
    const indices = quilt(
      sources,
      look.from,
      { ...look.quilt, seed: look.quilt.seed + 31 * (index + 1) },
      band,
    );
    busy += busyness(indices, width);
    const tile = paint(indices, width, look.to);
    strew(tile, index, spec.band + 2);
    tiles.push(tile);
  }
  return {
    tiles,
    busy: Number(((busy / spec.count) * 100).toFixed(1)),
    ...tone(tiles),
  };
}
