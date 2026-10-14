/**
 * PixelLab tilesets as grounds (beads pulp_wars-2yc.50 and 2yc.53,
 * docs/art/TEXTURED_GROUNDS.md, "PixelLab's tileset endpoint").
 *
 * A tileset recipe asks `POST /v2/create-tileset`
 * (scripts/art/chibi/tileset-client.ts) for a Wang set of two terrains of
 * one ground: dry grass (`lower`) and bare dry earth (`upper`). A world
 * texture is then laid from it in code: a torus of vertices, each "lower"
 * or "upper" by a seeded smooth noise, and each cell of the tile grid takes
 * the tile whose corners match its four vertices. So the patches of earth
 * meander over several board cells, and the texture's right edge continues
 * its left.
 *
 *   npx tsx scripts/art/textured-grounds.ts tileset-generate <recipe>
 *       (calls PixelLab; reads the key from PIXELLAB_API_KEY)
 *   npx tsx scripts/art/textured-grounds.ts tileset-world <recipe> <out.png>
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { RgbaRaster } from "../chibi/owner-mask";
import { encodePng, readRaster, sha256 } from "../chibi/pipeline";
import {
  awaitTileset,
  submitTileset,
  type TilesetCorner,
  type TilesetRequestBody,
} from "../chibi/tileset-client";
import { groundHash } from "../faction-grounds/derive";
import { TEXTURED_RUN, type TexturedFaction } from "./candidates";

export interface TilesetRecipe {
  readonly id: string;
  readonly faction: TexturedFaction;
  readonly label: string;
  readonly lower: string;
  readonly upper: string;
  readonly transition?: string;
  readonly mode: "standard" | "pro";
  readonly tileSize: 16 | 32 | 64;
  /** The forced palette sent as `color_image`. */
  readonly palette?: readonly string[];
  /** Further body fields (raggedness, boundary_amplitude, outline...). */
  readonly options?: Readonly<Record<string, string | number>>;
  readonly seed: number;
  readonly notes: string;
}

const DRY_GROUND = [
  "#d3c176",
  "#dbca83",
  "#c9b66b",
  "#bca859",
  "#e3d391",
  "#a8964a",
  "#c9a77a",
  "#b08d5e",
  "#8a6f45",
];

export const TILESET_RECIPES: readonly TilesetRecipe[] = [
  {
    id: "goblin-tileset-a",
    faction: "GOBLIN",
    label: "Standard Wang set, 32 px: dry grass and cracked earth",
    lower:
      "dry golden savannah grassland seen from above, pale straw-coloured dry grass with small dry tufts and fine blades",
    upper:
      "bare sun-baked tan earth seen from above with fine cracks and a few small pebbles",
    mode: "standard",
    tileSize: 32,
    palette: DRY_GROUND,
    options: {
      view: "high top-down",
      outline: "lineless",
      shading: "medium shading",
      detail: "medium detail",
    },
    seed: 53101,
    notes:
      "The endpoint's classic pipeline at its largest tile; lower is the grass, upper the earth patches.",
  },
  {
    id: "goblin-tileset-b",
    faction: "GOBLIN",
    label: "Pro Wang set, 64 px: dry grass and cracked earth, ragged border",
    lower:
      "dry golden savannah grassland seen from above, pale straw-coloured dry grass with dry tufts and golden seed heads",
    upper:
      "bare sun-baked tan earth seen from above with fine cracks and a few small pebbles",
    mode: "pro",
    tileSize: 64,
    palette: DRY_GROUND,
    options: {
      view: "high top-down",
      outline: "lineless",
      shading: "medium shading",
      detail: "medium detail",
      raggedness: 0.6,
      boundary_amplitude: 0.2,
      boundary_seed: 7,
    },
    seed: 53103,
    notes:
      "The experimental pro pipeline: richer painting, 64 px tiles, a meandering border.",
  },
];

export function tilesetDirectory(id: string): string {
  return `${TEXTURED_RUN}/tilesets/${id}`;
}

function hex(colour: string): readonly [number, number, number] {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as readonly [number, number, number];
}

async function palettePng(colours: readonly string[]): Promise<Buffer> {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const band = size / colours.length;
  for (let y = 0; y < size; y += 1) {
    const [r, g, b] = hex(
      colours[Math.min(colours.length - 1, Math.floor(y / band))] ?? "#000000",
    );
    for (let x = 0; x < size; x += 1)
      data.set([r, g, b, 255], (y * size + x) * 4);
  }
  return encodePng({ width: size, height: size, data });
}

function recipeOf(id: string): TilesetRecipe {
  const recipe = TILESET_RECIPES.find((entry) => entry.id === id);
  if (recipe === undefined) throw new Error(`no tileset recipe ${id}`);
  return recipe;
}

/** Submits a recipe, waits for it and writes its tiles and receipt. */
export async function generateTileset(root: string, id: string): Promise<void> {
  const recipe = recipeOf(id);
  const directory = path.join(root, tilesetDirectory(id));
  await mkdir(directory, { recursive: true });
  const palette =
    recipe.palette === undefined ? undefined : await palettePng(recipe.palette);
  const palettePath = `${tilesetDirectory(id)}/palette.png`;
  if (palette !== undefined)
    await writeFile(path.join(root, palettePath), palette);
  const body: TilesetRequestBody = {
    lower_description: recipe.lower,
    upper_description: recipe.upper,
    ...(recipe.transition === undefined
      ? {}
      : { transition_description: recipe.transition }),
    mode: recipe.mode,
    tile_size: { width: recipe.tileSize, height: recipe.tileSize },
    transition_size: 0,
    ...recipe.options,
    seed: recipe.seed,
    ...(palette === undefined
      ? {}
      : {
          color_image: {
            type: "base64" as const,
            base64: palette.toString("base64"),
            format: "png" as const,
          },
        }),
  };
  // The receipt: the body with the palette as a path, never the key.
  const shown: Record<string, unknown> = { ...body };
  delete shown.color_image;
  const receipt = {
    recipe: id,
    endpoint: "create-tileset",
    submittedAt: new Date().toISOString(),
    request: {
      ...shown,
      ...(palette === undefined
        ? {}
        : { color_image: { path: palettePath, sha256: sha256(palette) } }),
    },
  };
  const { jobId, tilesetId } = await submitTileset(body);
  const receiptPath = path.join(directory, "receipt.json");
  await writeFile(
    receiptPath,
    `${JSON.stringify({ ...receipt, jobId, tilesetId }, null, 2)}\n`,
  );
  console.log(`${id}: submitted, waiting`);
  const started = Date.now();
  const result = await awaitTileset(jobId, tilesetId);
  const tiles: unknown[] = [];
  for (const [index, tile] of result.tiles.entries()) {
    const file = `tile-${String(index).padStart(2, "0")}.png`;
    await writeFile(path.join(directory, file), tile.png);
    tiles.push({
      file,
      name: tile.name,
      corners: tile.corners,
      sha256: sha256(tile.png),
    });
  }
  await writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        ...receipt,
        jobId,
        tilesetId,
        seconds: Math.round((Date.now() - started) / 1000),
        ...(result.usageUsd === undefined ? {} : { usageUsd: result.usageUsd }),
        metadata: result.metadata,
        tiles,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`${id}: ${result.tiles.length} tiles written`);
}

interface StoredTile {
  readonly raster: RgbaRaster;
  readonly corners: Readonly<Record<"NW" | "NE" | "SW" | "SE", TilesetCorner>>;
}

async function storedTiles(root: string, id: string): Promise<StoredTile[]> {
  const directory = path.join(root, tilesetDirectory(id));
  const receipt = JSON.parse(
    await readFile(path.join(directory, "receipt.json"), "utf8"),
  ) as {
    tiles?: { file: string; corners: StoredTile["corners"] }[];
  };
  const tiles: StoredTile[] = [];
  for (const tile of receipt.tiles ?? [])
    tiles.push({
      raster: await readRaster(path.join(directory, tile.file)),
      corners: tile.corners,
    });
  return tiles;
}

/**
 * A smooth periodic field on an `n` x `n` torus of vertices: a sum of
 * cosines of whole frequencies, so it wraps.
 */
function torusNoise(n: number, seed: number): Float64Array {
  const values = new Float64Array(n * n);
  const waves = Array.from({ length: 7 }, (_, index) => {
    const pick = (salt: number, span: number): number =>
      groundHash(seed, index, salt, 0x71) % span;
    const u = pick(1, 5) - 2;
    const v = pick(2, 5) - 2;
    return {
      u: u === 0 && v === 0 ? 1 : u,
      v,
      phase: (pick(3, 1000) / 1000) * Math.PI * 2,
      weight: 1 / (1 + Math.hypot(u, v)),
    };
  });
  for (let j = 0; j < n; j += 1)
    for (let i = 0; i < n; i += 1) {
      let sum = 0;
      for (const wave of waves)
        sum +=
          wave.weight *
          Math.cos((2 * Math.PI * (wave.u * i + wave.v * j)) / n + wave.phase);
      values[j * n + i] = sum;
    }
  return values;
}

/**
 * The world texture of a tileset: `period` px a side, `upper` of the
 * vertices bare earth in soft patches.
 */
export async function tilesetWorld(
  root: string,
  id: string,
  period = 640,
  upper = 0.3,
  seed = 5311,
): Promise<RgbaRaster> {
  const recipe = recipeOf(id);
  const tiles = await storedTiles(root, id);
  const size = recipe.tileSize;
  if (period % size !== 0) throw new Error(`${period} is not whole tiles`);
  const n = period / size;
  const noise = torusNoise(n, seed);
  const sorted = [...noise].sort((a, b) => b - a);
  const threshold = sorted[Math.floor(upper * sorted.length)] ?? 0;
  const vertex = (i: number, j: number): TilesetCorner =>
    (noise[(((j % n) + n) % n) * n + (((i % n) + n) % n)] ?? 0) > threshold
      ? "upper"
      : "lower";
  const byCorners = new Map<string, RgbaRaster>();
  for (const tile of tiles) {
    const name = `${tile.corners.NW}${tile.corners.NE}${tile.corners.SW}${tile.corners.SE}`;
    if (!byCorners.has(name)) byCorners.set(name, tile.raster);
  }
  const world = {
    width: period,
    height: period,
    data: new Uint8Array(period * period * 4),
  };
  for (let j = 0; j < n; j += 1)
    for (let i = 0; i < n; i += 1) {
      const name = `${vertex(i, j)}${vertex(i + 1, j)}${vertex(i, j + 1)}${vertex(i + 1, j + 1)}`;
      const tile = byCorners.get(name);
      if (tile === undefined) throw new Error(`${id}: no tile ${name}`);
      for (let y = 0; y < size; y += 1)
        world.data.set(
          tile.data.subarray(y * size * 4, (y + 1) * size * 4),
          ((j * size + y) * period + i * size) * 4,
        );
    }
  return world;
}

/** The tiles of a recipe side by side, enlarged, for review. */
export async function tilesetContact(
  root: string,
  id: string,
  out: string,
): Promise<void> {
  const tiles = await storedTiles(root, id);
  const scale = 4;
  const recipe = recipeOf(id);
  const cell = recipe.tileSize * scale + 8;
  const columns = 8;
  const rows = Math.ceil(tiles.length / columns);
  const layers = await Promise.all(
    tiles.map(async (tile, index) => ({
      input: await sharp(Buffer.from(tile.raster.data), {
        raw: {
          width: tile.raster.width,
          height: tile.raster.height,
          channels: 4,
        },
      })
        .resize(tile.raster.width * scale, tile.raster.height * scale, {
          kernel: "nearest",
        })
        .png()
        .toBuffer(),
      left: (index % columns) * cell + 4,
      top: Math.floor(index / columns) * cell + 4,
    })),
  );
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await sharp({
    create: {
      width: columns * cell,
      height: rows * cell,
      channels: 4,
      background: { r: 22, g: 24, b: 28, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toFile(out);
}
