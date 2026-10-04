/**
 * The composed CHIBI forest pieces as production masters (bead
 * pulp_wars-maw.3, docs/art/COMPOSED_FORESTS.md).
 *
 *   npx tsx scripts/art/chibi-forest-pieces.ts bake
 *   npx tsx scripts/art/chibi-forest-pieces.ts check
 *   npx tsx scripts/art/chibi-forest-pieces.ts stats
 *
 * No PixelLab call and no hand drawing: every piece is the accepted Forest
 * tree clumps (the body layers of `chibi-forest-1`, `-2`, `-4` and `-5`,
 * mirrored or not) stamped at 1:1 on a staggered lattice inside the piece's
 * footprint and painted north to south, so a piece has the tree size and
 * shapes of the single clump the board drew before. Nothing is resampled.
 * The stamped piece is then softened (SOFTEN below), and each clump is also
 * written alone, softened, as the board's seam clump.
 *
 * Piece geometry (shape footprints in chibi-forest-packing-v7.ts):
 *   canvas = cols x 80 wide, rows x 80 + 24 tall, drawn with its top-left
 *   24 px above the top-left of the piece's bounding box. Paint lies only
 *   over footprint cells, or in the 24 px band above the topmost covered
 *   cell of a column. In that band a column holds at most ONE clump, and
 *   that clump rises no higher than it does on its own 80 x 104 master, so
 *   a piece never covers more of the row above than the old Forest did.
 *
 * `bake` writes the masters and src/assets/chibi-forest-pieces.json (the
 * runtime manifest and the record: parameters, the hash of every source and
 * output, and each clump's trim box). `art:validate` re-derives every piece
 * from its sources and fails when the bytes differ (`forestPieceProblems`).
 * `stats` prints the saturation and value figures of the old clumps and the
 * pieces (docs/art/COMPOSED_FORESTS.md, "Softness").
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { encodePng, pixelSha256, readRaster, sha256 } from "./chibi/pipeline";
import {
  FOREST_SHAPES_V7,
  type ForestShapeV7,
} from "../../src/render/canvas/chibi-forest-packing-v7";

const CELL = 80;
const UP = 24;
const TERRAIN = "public/assets/chibi/terrain";
const OUT = "public/assets/chibi/forest";
export const FOREST_PIECES_RECORD = "src/assets/chibi-forest-pieces.json";

/** The accepted clumps the pieces are stamped from. */
const CLUMP_IDS = [
  "chibi-forest-1",
  "chibi-forest-2",
  "chibi-forest-4",
  "chibi-forest-5",
] as const;

const CLUMP_WEIGHTS: Readonly<Record<string, number>> = {
  "chibi-forest-1": 2,
  "chibi-forest-2": 2,
  "chibi-forest-4": 1,
  "chibi-forest-5": 1,
};

/** Variants per shape: three of the common ones, two of each L. */
const VARIANTS: Readonly<Record<ForestShapeV7, number>> = {
  "1x1": 3,
  "2x1": 3,
  "1x2": 3,
  "2x2": 3,
  "L-NW": 2,
  "L-NE": 2,
  "L-SW": 2,
  "L-SE": 2,
};

/**
 * The lattice: two base lines per cell row (38 and 78 px below the row's
 * top edge) and a clump about every 52 px along a line, alternate lines
 * staggered. This is the calm density of the research (about half the trees
 * of the first dense prototype).
 */
const LATTICE = { firstLine: 38, lineStep: 40, stampStep: 52, seedBase: 9100 };

/**
 * Softening (the review of bead pulp_wars-maw.3): a canopy of full-contrast
 * clumps reads much heavier at board scale than one clump on open Grass, so
 * the stamped piece is toned down before it is written:
 * - `gapSkip`: in pieces of three or four cells that share of the clumps is
 *   left out, so more ground shows between the trees;
 * - `outlineBlend`: a dark outline pixel inside the canopy (not on the
 *   piece's outer silhouette) moves that far towards the foliage around it;
 * - `tonePull`: every foliage pixel moves that far towards the mean foliage
 *   colour of the old clumps, which calms highlights and shadows;
 * - `lift`: and then that far towards the mean Grass colour.
 * The outer silhouette keeps its black outline, so trees still read as
 * chibi sprites. `stats` shows the result against the old Forest cell.
 */
const SOFTEN = { gapSkip: 0.18, outlineBlend: 0.6, tonePull: 0.2, lift: 0.16 };
/** Luma below which a pixel is outline. */
const OUTLINE_LUMA = 0.14;

interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

interface Clump {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
  /** The opaque box of the body on its 80 x 104 master. */
  readonly trim: { x: number; y: number; w: number; h: number };
  /** Rows the clump rises above its own cell on the master (0..24). */
  readonly up: number;
  readonly raster: Raster;
}

export interface ForestPiecesRecord {
  readonly schemaVersion: 1;
  readonly bead: string;
  readonly cellPx: number;
  readonly overflowPx: number;
  readonly lattice: typeof LATTICE;
  readonly soften: typeof SOFTEN;
  readonly clumps: readonly {
    readonly id: string;
    readonly path: string;
    readonly sha256: string;
    readonly trim: { x: number; y: number; w: number; h: number };
    readonly up: number;
    /** The clump alone, trimmed and softened: the board's seam clump. */
    readonly seam: {
      readonly path: string;
      readonly width: number;
      readonly height: number;
      readonly sha256: string;
      readonly pixelSha256: string;
    };
  }[];
  readonly pieces: readonly {
    readonly id: string;
    readonly shape: ForestShapeV7;
    readonly variant: number;
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly seed: number;
    readonly sha256: string;
    readonly pixelSha256: string;
  }[];
}

function crop(
  source: Raster,
  box: { x: number; y: number; w: number; h: number },
): Raster {
  const data = new Uint8Array(box.w * box.h * 4);
  for (let y = 0; y < box.h; y += 1)
    for (let x = 0; x < box.w; x += 1)
      for (let c = 0; c < 4; c += 1)
        data[(y * box.w + x) * 4 + c] =
          source.data[((box.y + y) * source.width + box.x + x) * 4 + c] ?? 0;
  return { width: box.w, height: box.h, data };
}

function flop(r: Raster): Raster {
  const data = new Uint8Array(r.data.length);
  for (let y = 0; y < r.height; y += 1)
    for (let x = 0; x < r.width; x += 1)
      for (let c = 0; c < 4; c += 1)
        data[(y * r.width + x) * 4 + c] =
          r.data[(y * r.width + (r.width - 1 - x)) * 4 + c] ?? 0;
  return { ...r, data };
}

function opaqueBox(r: Raster): { x: number; y: number; w: number; h: number } {
  let x0 = r.width;
  let y0 = r.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < r.height; y += 1)
    for (let x = 0; x < r.width; x += 1)
      if ((r.data[(y * r.width + x) * 4 + 3] ?? 0) > 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) throw new Error("empty clump body");
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

async function loadClumps(root: string): Promise<Clump[]> {
  const clumps: Clump[] = [];
  for (const id of CLUMP_IDS) {
    const file = `${TERRAIN}/${id}.body.png`;
    const bytes = await readFile(path.join(root, file));
    const read = await readRaster(bytes);
    const body: Raster = {
      width: read.width,
      height: read.height,
      data: new Uint8Array(read.data),
    };
    if (body.width !== CELL || body.height !== CELL + UP)
      throw new Error(`${file}: expected an 80 x 104 body layer`);
    const trim = opaqueBox(body);
    clumps.push({
      id,
      path: file,
      sha256: sha256(bytes),
      trim,
      up: Math.max(0, UP - trim.y),
      raster: crop(body, trim),
    });
  }
  return clumps;
}

function rng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

/** Source-over of an opaque stamp pixel (clump bodies have 0/255 alpha). */
function paint(target: Raster, stamp: Raster, left: number, top: number): void {
  for (let y = 0; y < stamp.height; y += 1)
    for (let x = 0; x < stamp.width; x += 1) {
      const tx = left + x;
      const ty = top + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s = (y * stamp.width + x) * 4;
      if ((stamp.data[s + 3] ?? 0) < 128) continue;
      const t = (ty * target.width + tx) * 4;
      for (let c = 0; c < 3; c += 1)
        target.data[t + c] = stamp.data[s + c] ?? 0;
      target.data[t + 3] = 255;
    }
}

/** Whether canvas pixel (px, py) of a piece may hold paint. */
export function forestPieceAllows(
  shape: ForestShapeV7,
  px: number,
  py: number,
): boolean {
  const rows = FOREST_SHAPES_V7[shape];
  const cx = Math.floor(px / CELL);
  const top = rows.findIndex((row) => row[cx] === "#");
  if (top < 0) return false;
  if (py >= top * CELL && py < top * CELL + UP) return true;
  return py >= UP && rows[Math.floor((py - UP) / CELL)]?.[cx] === "#";
}

function derivePiece(
  shape: ForestShapeV7,
  seed: number,
  clumps: readonly Clump[],
  soften: typeof SOFTEN | typeof NO_SOFTEN,
  tones: Tones,
): Raster {
  const rows = FOREST_SHAPES_V7[shape];
  const cellCount = rows.join("").replaceAll(".", "").length;
  const cols = rows[0]?.length ?? 1;
  const width = cols * CELL;
  const height = rows.length * CELL + UP;
  const canvas: Raster = {
    width,
    height,
    data: new Uint8Array(width * height * 4),
  };
  // The two original clumps are drawn twice as often as the two newer,
  // slightly more saturated ones, which keeps the pieces' mean saturation
  // inside the range of the old Forest clumps (`stats`).
  const sources = clumps.flatMap((clump) =>
    Array.from({ length: CLUMP_WEIGHTS[clump.id] ?? 1 }, () => [
      { clump, raster: clump.raster },
      { clump, raster: flop(clump.raster) },
    ]).flat(),
  );
  const random = rng(seed);
  const covered = (cx: number, cy: number): boolean => rows[cy]?.[cx] === "#";
  const topmost = (cx: number): number =>
    rows.findIndex((row) => row[cx] === "#");
  /** Columns whose 24 px band already holds a clump. */
  const bandUsed = new Set<number>();
  const stamps: { raster: Raster; left: number; top: number; base: number }[] =
    [];
  const bottom = UP + rows.length * CELL;
  let line = 0;
  for (
    let base = UP + LATTICE.firstLine;
    base <= bottom - 2;
    base += LATTICE.lineStep, line += 1
  ) {
    const cellY = Math.floor((base - 1 - UP) / CELL);
    for (let runLeft = 0; runLeft < cols; runLeft += 1) {
      if (!covered(runLeft, cellY) || covered(runLeft - 1, cellY)) continue;
      let runRight = runLeft;
      while (covered(runRight + 1, cellY)) runRight += 1;
      const spanLeft = runLeft * CELL;
      const spanRight = (runRight + 1) * CELL;
      const usable = spanRight - spanLeft - 60;
      const n = Math.max(1, Math.round(usable / LATTICE.stampStep) + 1);
      const count = line % 2 === 0 ? n : Math.max(1, n - 1);
      for (let i = 0; i < count; i += 1) {
        const t =
          count === 1
            ? 0.5
            : line % 2 === 0
              ? i / (count - 1)
              : (i + 0.5) / count;
        const centre = Math.round(
          spanLeft + 30 + usable * t + (random() - 0.5) * 10,
        );
        const wanted = Math.min(
          bottom - 1,
          base + Math.round((random() - 0.5) * 6),
        );
        const order = [...sources].sort(() => random() - 0.5);
        // Larger pieces leave some clumps out, never on the front line of
        // the bottom row (the forest's southern edge stays whole).
        const frontLine = base + LATTICE.lineStep > bottom - 2;
        if (cellCount >= 3 && !frontLine && random() < soften.gapSkip) continue;
        for (const { clump, raster } of order) {
          if (raster.width > spanRight - spanLeft) continue;
          const left = Math.max(
            spanLeft,
            Math.min(
              spanRight - raster.width,
              Math.round(centre - raster.width / 2),
            ),
          );
          const firstCol = Math.floor(left / CELL);
          const lastCol = Math.floor((left + raster.width - 1) / CELL);
          let cellTop = 0;
          let bandFree = true;
          for (let c = firstCol; c <= lastCol; c += 1) {
            cellTop = Math.max(cellTop, topmost(c) * CELL + UP);
            if (bandUsed.has(c)) bandFree = false;
          }
          // A clump may rise into the band as far as on its own master, and
          // only where no other clump of the piece already does.
          const allowedTop = cellTop - (bandFree ? clump.up : 0);
          // Too tall for its line: slide it down instead of dropping it.
          const stampBase = Math.max(wanted, allowedTop + raster.height);
          if (stampBase > bottom) continue;
          if (Math.floor((stampBase - 1 - UP) / CELL) !== cellY) continue;
          const top = stampBase - raster.height;
          if (top < cellTop)
            for (let c = firstCol; c <= lastCol; c += 1) bandUsed.add(c);
          stamps.push({ raster, left, top, base: stampBase });
          break;
        }
      }
    }
  }
  stamps.sort((a, b) => a.base - b.base || a.left - b.left);
  for (const stamp of stamps)
    paint(canvas, stamp.raster, stamp.left, stamp.top);
  for (let py = 0; py < height; py += 1)
    for (let px = 0; px < width; px += 1)
      if (
        (canvas.data[(py * width + px) * 4 + 3] ?? 0) > 0 &&
        !forestPieceAllows(shape, px, py)
      )
        throw new Error(`${shape} seed ${seed}: paint outside its footprint`);
  return softened(canvas, soften, tones);
}

/** The piece set as stamped, before any softening (for `stats`). */
const NO_SOFTEN = { gapSkip: 0, outlineBlend: 0, tonePull: 0, lift: 0 };

interface Tones {
  /** Mean colour of the foliage (non-outline pixels) of the old clumps. */
  readonly foliage: readonly [number, number, number];
  /** Mean colour of chibi-grass-1. */
  readonly grass: readonly [number, number, number];
}

const lumaOf = (r: number, g: number, b: number): number =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function softened(
  source: Raster,
  soften: typeof SOFTEN | typeof NO_SOFTEN,
  tones: Tones,
): Raster {
  if (soften.outlineBlend === 0 && soften.tonePull === 0 && soften.lift === 0)
    return source;
  const { width, height } = source;
  const data = new Uint8Array(source.data);
  const opaque = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    (source.data[(y * width + x) * 4 + 3] ?? 0) > 0;
  const isOutline = (x: number, y: number): boolean => {
    const i = (y * width + x) * 4;
    return (
      lumaOf(
        source.data[i] ?? 0,
        source.data[i + 1] ?? 0,
        source.data[i + 2] ?? 0,
      ) < OUTLINE_LUMA
    );
  };
  const mix = (from: number, to: number, share: number): number =>
    Math.round(from + (to - from) * share);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y)) continue;
      const i = (y * width + x) * 4;
      let colour: [number, number, number] = [
        source.data[i] ?? 0,
        source.data[i + 1] ?? 0,
        source.data[i + 2] ?? 0,
      ];
      if (isOutline(x, y)) {
        // The outer silhouette (an outline pixel within two pixels of
        // transparency) keeps its black line.
        let silhouette = false;
        for (let dy = -2; dy <= 2 && !silhouette; dy += 1)
          for (let dx = -2; dx <= 2 && !silhouette; dx += 1)
            if (!opaque(x + dx, y + dy)) silhouette = true;
        if (silhouette) continue;
        // Inside the canopy: towards the foliage around it.
        const sum = [0, 0, 0];
        let count = 0;
        for (let dy = -2; dy <= 2; dy += 1)
          for (let dx = -2; dx <= 2; dx += 1) {
            if (!opaque(x + dx, y + dy) || isOutline(x + dx, y + dy)) continue;
            const n = ((y + dy) * width + x + dx) * 4;
            for (let c = 0; c < 3; c += 1)
              sum[c] = (sum[c] ?? 0) + (source.data[n + c] ?? 0);
            count += 1;
          }
        const around =
          count === 0 ? tones.foliage : sum.map((channel) => channel / count);
        colour = [
          mix(colour[0], around[0] ?? 0, soften.outlineBlend),
          mix(colour[1], around[1] ?? 0, soften.outlineBlend),
          mix(colour[2], around[2] ?? 0, soften.outlineBlend),
        ];
      } else
        colour = [
          mix(colour[0], tones.foliage[0], soften.tonePull),
          mix(colour[1], tones.foliage[1], soften.tonePull),
          mix(colour[2], tones.foliage[2], soften.tonePull),
        ];
      for (let c = 0; c < 3; c += 1)
        data[i + c] = mix(colour[c] ?? 0, tones.grass[c] ?? 0, soften.lift);
    }
  return { width, height, data };
}

function meanColour(
  rasters: readonly Raster[],
  keep: (r: number, g: number, b: number) => boolean,
): [number, number, number] {
  const sum = [0, 0, 0];
  let count = 0;
  for (const raster of rasters)
    for (let i = 0; i < raster.data.length; i += 4) {
      if ((raster.data[i + 3] ?? 0) < 128) continue;
      const r = raster.data[i] ?? 0;
      const g = raster.data[i + 1] ?? 0;
      const b = raster.data[i + 2] ?? 0;
      if (!keep(r, g, b)) continue;
      sum[0] = (sum[0] ?? 0) + r;
      sum[1] = (sum[1] ?? 0) + g;
      sum[2] = (sum[2] ?? 0) + b;
      count += 1;
    }
  return [
    Math.round((sum[0] ?? 0) / count),
    Math.round((sum[1] ?? 0) / count),
    Math.round((sum[2] ?? 0) / count),
  ];
}

async function loadTones(
  root: string,
  clumps: readonly Clump[],
): Promise<Tones> {
  const grass = await readRaster(
    await readFile(path.join(root, `${TERRAIN}/chibi-grass-1.png`)),
  );
  return {
    foliage: meanColour(
      clumps.slice(0, 2).map((clump) => clump.raster),
      (r, g, b) => lumaOf(r, g, b) >= OUTLINE_LUMA,
    ),
    grass: meanColour(
      [
        {
          width: grass.width,
          height: grass.height,
          data: new Uint8Array(grass.data),
        },
      ],
      () => true,
    ),
  };
}

/** Every piece as its sources derive it today, with the record. */
export async function deriveForestPieces(
  root: string,
  soften: typeof SOFTEN | typeof NO_SOFTEN = SOFTEN,
): Promise<{
  readonly record: ForestPiecesRecord;
  readonly files: ReadonlyMap<string, Buffer>;
}> {
  const clumps = await loadClumps(root);
  const tones = await loadTones(root, clumps);
  // The seam clumps the board draws between pieces: each clump on its own,
  // softened like the pieces (its whole outline is silhouette).
  const seams: ForestPiecesRecord["clumps"][number]["seam"][] = [];
  const files = new Map<string, Buffer>();
  const pieces: ForestPiecesRecord["pieces"][number][] = [];
  for (const shape of Object.keys(VARIANTS) as ForestShapeV7[])
    for (let variant = 0; variant < VARIANTS[shape]; variant += 1) {
      const seed = LATTICE.seedBase + pieces.length * 7;
      const raster = derivePiece(shape, seed, clumps, soften, tones);
      const bytes = await encodePng(raster);
      const id = `chibi-forest-piece-${shape.toLowerCase()}-${String.fromCharCode(97 + variant)}`;
      const file = `${OUT}/${id}.png`;
      files.set(file, bytes);
      pieces.push({
        id,
        shape,
        variant,
        path: file,
        width: raster.width,
        height: raster.height,
        seed,
        sha256: sha256(bytes),
        pixelSha256: pixelSha256(raster),
      });
    }
  for (const clump of clumps) {
    const raster = softened(clump.raster, soften, tones);
    const bytes = await encodePng(raster);
    const file = `${OUT}/${clump.id.replace("chibi-forest-", "chibi-forest-seam-")}.png`;
    files.set(file, bytes);
    seams.push({
      path: file,
      width: raster.width,
      height: raster.height,
      sha256: sha256(bytes),
      pixelSha256: pixelSha256(raster),
    });
  }
  return {
    record: {
      schemaVersion: 1,
      bead: "pulp_wars-maw.3",
      cellPx: CELL,
      overflowPx: UP,
      lattice: LATTICE,
      soften: SOFTEN,
      clumps: clumps.map(
        ({ id, path: file, sha256: hash, trim, up }, index) => ({
          id,
          path: file,
          sha256: hash,
          trim,
          up,
          seam: seams[index] ?? {
            path: "",
            width: 0,
            height: 0,
            sha256: "",
            pixelSha256: "",
          },
        }),
      ),
      pieces,
    },
    files,
  };
}

/** Problems of the checked-in forest pieces; empty means valid. */
export async function forestPieceProblems(root: string): Promise<string[]> {
  const problems: string[] = [];
  let derived;
  try {
    derived = await deriveForestPieces(root);
  } catch (error) {
    return [
      `forest pieces: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  let recorded: string;
  try {
    recorded = await readFile(path.join(root, FOREST_PIECES_RECORD), "utf8");
  } catch {
    return [`forest pieces: ${FOREST_PIECES_RECORD} is missing`];
  }
  if (JSON.stringify(JSON.parse(recorded)) !== JSON.stringify(derived.record))
    problems.push(
      `forest pieces: ${FOREST_PIECES_RECORD} is not what its sources derive (a Forest body changed; run the bake)`,
    );
  for (const [file, bytes] of derived.files) {
    let checkedIn: Buffer;
    try {
      checkedIn = await readFile(path.join(root, file));
    } catch {
      problems.push(`forest pieces: ${file} is missing`);
      continue;
    }
    if (
      pixelSha256(await readRaster(checkedIn)) !==
      pixelSha256(await readRaster(bytes))
    )
      problems.push(`forest pieces: ${file} is not what its clumps derive`);
  }
  return problems;
}

/** Mean HSV saturation and value, and luma spread, of the opaque pixels. */
function tone(rasters: readonly Raster[]): {
  saturation: number;
  value: number;
  luma: number;
  lumaSpread: number;
  outline: number;
} {
  let n = 0;
  let s = 0;
  let v = 0;
  let l = 0;
  let l2 = 0;
  let dark = 0;
  for (const raster of rasters)
    for (let i = 0; i < raster.data.length; i += 4) {
      if ((raster.data[i + 3] ?? 0) < 128) continue;
      const r = (raster.data[i] ?? 0) / 255;
      const g = (raster.data[i + 1] ?? 0) / 255;
      const b = (raster.data[i + 2] ?? 0) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n += 1;
      s += max === 0 ? 0 : (max - min) / max;
      v += max;
      l += luma;
      l2 += luma * luma;
      if (luma < 0.12) dark += 1;
    }
  const mean = l / n;
  return {
    saturation: s / n,
    value: v / n,
    luma: mean,
    lumaSpread: Math.sqrt(Math.max(0, l2 / n - mean * mean)),
    outline: dark / n,
  };
}

/** The shade the board draws under a composed forest (chibi-forest-v7.ts). */
const SHADE = { rgb: [22, 58, 38], alpha: 32 / 255 } as const;

/**
 * The footprint cells of a piece as the board shows them: the piece over
 * chibi-grass-1 with the shade. The band above the footprint is left out.
 */
function overGround(
  piece: Raster,
  shape: ForestShapeV7,
  grass: Raster,
): Raster {
  const rows = FOREST_SHAPES_V7[shape];
  const data = new Uint8Array(piece.width * (piece.height - UP) * 4);
  for (let y = 0; y < piece.height - UP; y += 1)
    for (let x = 0; x < piece.width; x += 1) {
      const out = (y * piece.width + x) * 4;
      if (rows[Math.floor(y / CELL)]?.[Math.floor(x / CELL)] !== "#") continue;
      const p = ((y + UP) * piece.width + x) * 4;
      const g = ((y % CELL) * CELL + (x % CELL)) * 4;
      const tree = (piece.data[p + 3] ?? 0) >= 128;
      for (let c = 0; c < 3; c += 1)
        data[out + c] = tree
          ? (piece.data[p + c] ?? 0)
          : Math.round(
              (grass.data[g + c] ?? 0) * (1 - SHADE.alpha) +
                (SHADE.rgb[c] ?? 0) * SHADE.alpha,
            );
      data[out + 3] = 255;
    }
  return { width: piece.width, height: piece.height - UP, data };
}

async function stats(root: string): Promise<void> {
  const clumps = await loadClumps(root);
  const read = async (file: string): Promise<Raster> => {
    const raster = await readRaster(await readFile(path.join(root, file)));
    return {
      width: raster.width,
      height: raster.height,
      data: new Uint8Array(raster.data),
    };
  };
  const grass = await read(`${TERRAIN}/chibi-grass-1.png`);
  // The old Forest cell: the owning cell of the two old masters (the clump
  // on its Grass), without the band above it.
  const oldCells: Raster[] = [];
  for (const id of ["chibi-forest-1", "chibi-forest-2"]) {
    const master = await read(`${TERRAIN}/${id}.png`);
    oldCells.push(crop(master, { x: 0, y: UP, w: CELL, h: CELL }));
  }
  const cells = async (
    soften: typeof SOFTEN | typeof NO_SOFTEN,
    only?: ForestShapeV7,
  ): Promise<Raster[]> => {
    const { files, record } = await deriveForestPieces(root, soften);
    const result: Raster[] = [];
    for (const piece of record.pieces) {
      if (only !== undefined && piece.shape !== only) continue;
      const bytes = files.get(piece.path);
      if (bytes === undefined) continue;
      const raster = await readRaster(bytes);
      result.push(
        overGround(
          {
            width: raster.width,
            height: raster.height,
            data: new Uint8Array(raster.data),
          },
          piece.shape,
          grass,
        ),
      );
    }
    return result;
  };
  const old = tone(oldCells);
  const stamped = tone(await cells(NO_SOFTEN, "2x2"));
  const rows: [
    string,
    Pick<
      ReturnType<typeof tone>,
      "saturation" | "luma" | "lumaSpread" | "outline"
    >,
  ][] = [
    ["old Forest cell (clump on Grass)", old],
    ["2x2 piece as stamped, on ground", stamped],
    [
      "midpoint of the two (the target)",
      {
        saturation: (old.saturation + stamped.saturation) / 2,
        luma: (old.luma + stamped.luma) / 2,
        lumaSpread: (old.lumaSpread + stamped.lumaSpread) / 2,
        outline: (old.outline + stamped.outline) / 2,
      },
    ],
    ["2x2 piece softened, on ground", tone(await cells(SOFTEN, "2x2"))],
    ["all pieces softened, on ground", tone(await cells(SOFTEN))],
    [
      "old clumps alone (no ground)",
      tone(clumps.slice(0, 2).map((clump) => clump.raster)),
    ],
  ];
  const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
  for (const [name, t] of rows)
    console.log(
      `${name.padEnd(34)} luma ${percent(t.luma)}  saturation ${percent(t.saturation)}  luma spread ${percent(t.lumaSpread)}  outline share ${percent(t.outline)}`,
    );
}

/**
 * A contact sheet of the checked-in pieces over Grass cells, at native size
 * and (a second file, `-x3`) enlarged three times, for visual review.
 */
async function sheet(root: string, out: string): Promise<void> {
  const record = JSON.parse(
    await readFile(path.join(root, FOREST_PIECES_RECORD), "utf8"),
  ) as ForestPiecesRecord;
  const grass = await readFile(path.join(root, `${TERRAIN}/chibi-grass-1.png`));
  const pad = 16;
  const slotW = 2 * CELL + pad;
  const slotH = 2 * CELL + UP + pad;
  const perRow = 6;
  const width = perRow * slotW + pad;
  const height = Math.ceil(record.pieces.length / perRow) * slotH + pad;
  const composites: OverlayOptions[] = [];
  for (const [index, piece] of record.pieces.entries()) {
    const ox = pad + (index % perRow) * slotW;
    const oy = pad + Math.floor(index / perRow) * slotH + UP;
    FOREST_SHAPES_V7[piece.shape].forEach((row, dy) =>
      [...row].forEach((mark, dx) => {
        if (mark === "#")
          composites.push({
            input: grass,
            left: ox + dx * CELL,
            top: oy + dy * CELL,
          });
      }),
    );
    composites.push({
      input: path.join(root, piece.path),
      left: ox,
      top: oy - UP,
    });
  }
  const image = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 29, g: 35, b: 38, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  await writeFile(out, image);
  await sharp(image)
    .resize(width * 3, height * 3, { kernel: "nearest" })
    .toFile(out.replace(/\.png$/, "-x3.png"));
  console.log(`wrote ${out} and its x3 enlargement`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const command = process.argv[2] ?? "check";
  if (command === "bake") {
    const { record, files } = await deriveForestPieces(root);
    await mkdir(path.join(root, OUT), { recursive: true });
    for (const [file, bytes] of files) {
      await writeFile(path.join(root, file), bytes);
      console.log(`wrote ${file}`);
    }
    await writeFile(
      path.join(root, FOREST_PIECES_RECORD),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    console.log(`wrote ${FOREST_PIECES_RECORD}`);
    return;
  }
  if (command === "stats") {
    await stats(root);
    return;
  }
  if (command === "sheet") {
    const out = process.argv[3];
    if (out === undefined) throw new Error("usage: sheet <out.png>");
    await sheet(root, path.resolve(out));
    return;
  }
  const problems = await forestPieceProblems(root);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  console.log("The forest pieces are what their clumps derive.");
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
