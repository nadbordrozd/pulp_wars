/**
 * The composed CHIBI mountain ranges (bead pulp_wars-e9f,
 * docs/art/COMPOSED_TERRAIN.md): multi-tile range pieces generated with
 * PixelLab and derived into production masters.
 *
 *   npx tsx scripts/art/chibi-mountain-ranges.ts plan
 *   npx tsx --env-file=<file> scripts/art/chibi-mountain-ranges.ts generate <id>...
 *   npx tsx scripts/art/chibi-mountain-ranges.ts review <out.png> <id>...
 *   npx tsx scripts/art/chibi-mountain-ranges.ts bake
 *   npx tsx scripts/art/chibi-mountain-ranges.ts check
 *   npx tsx scripts/art/chibi-mountain-ranges.ts stats
 *   npx tsx scripts/art/chibi-mountain-ranges.ts sheet <out.png>
 *
 * The chibi batch pipeline generates at an asset class's own canvas (80 x
 * 104 for tall terrain) and has no reference-image endpoint, so the range
 * pieces have their own small pipeline here, with the same rules: every
 * request is a checked-in recipe (scripts/art/chibi/mountain-ranges/
 * recipes.json: endpoint, size, seed, the chibi prompt fragments, the
 * subject, the style image), `generate` never repeats a recorded recipe,
 * records keep the exact credential-free request, the job id and the hash of
 * every returned candidate, and raw candidates are kept losslessly under
 * art/pixellab/chibi-raw/mountain-ranges/. Only `generate` calls PixelLab;
 * the key is read from PIXELLAB_API_KEY and never printed.
 *
 * A recipe's `accept` block names the candidate that passed review and the
 * piece it becomes; `reject` records why a recipe was dropped. `bake`
 * derives every accepted candidate into its master (see `derive`) and
 * writes src/assets/chibi-mountain-ranges.json, the runtime manifest and
 * derivation record. `art:validate` re-derives every master from the raw
 * candidates and fails when the bytes differ (`mountainRangeProblems`).
 */
import { randomUUID } from "node:crypto";
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
const OUT = "public/assets/chibi/mountains";
const DIR = "scripts/art/chibi/mountain-ranges";
const RECIPES = `${DIR}/recipes.json`;
const RECORDS = `${DIR}/records.json`;
const RAW = "art/pixellab/chibi-raw/mountain-ranges";
const FRAGMENTS = "scripts/art/chibi/fragments";
export const MOUNTAIN_RANGES_RECORD = "src/assets/chibi-mountain-ranges.json";
const API = "https://api.pixellab.ai/v2";

/** Single mountains drawn between two ranges to close seams: none. */
const SEAM_IDS: readonly string[] = [];
void SEAM_IDS;

/**
 * Derivation parameters (see `derive`).
 * - `bandLimit`: a range rises at most this far above its top row, the most
 *   an old single mountain does (chibi-mountain-3: 13 px).
 * - `baseInset`: empty rows kept under the foot of a range.
 * - `outlineBlend`: how far a dark outline pixel inside a range (not on its
 *   outer silhouette) moves towards the rock around it, as the composed
 *   forests do, so a range sits behind units and buildings.
 */
const DERIVE = { bandLimit: 13, baseInset: 3, outlineBlend: 0.45 };
const OUTLINE_LUMA = 0.2;

type Endpoint = "create-image-pixen" | "edit-image-pixen" | "generate-image-v2";

interface ImageSource {
  readonly recipe?: string;
  readonly candidate?: number;
  readonly file?: string;
}

interface Recipe {
  readonly id: string;
  readonly endpoint: Endpoint;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly fragments?: readonly string[];
  readonly klass?: string;
  readonly subject?: string;
  readonly negative?: string;
  readonly instruction?: string;
  readonly source?: ImageSource;
  readonly styleImage?: ImageSource;
  readonly options?: Readonly<Record<string, unknown>>;
  /** Why the whole recipe was dropped after review. */
  readonly reject?: string;
  /** The review of its candidates (which were used, which not and why). */
  readonly review?: string;
  readonly notes?: string;
}

/** One reviewed raster placed in a piece. */
interface PiecePart {
  /** A raw candidate of a recipe, or an accepted single mountain body. */
  readonly recipe?: string;
  readonly candidate?: number;
  readonly single?: string;
  /** The footprint row its foot stands in (default: the bottom row). */
  readonly row?: number;
  /** Offsets in px from "centred, foot `baseInset` above the row's edge". */
  readonly dx?: number;
  readonly dy?: number;
  /** Mirror the raster left to right. */
  readonly flip?: true;
}

interface PieceSpec {
  readonly shape: ForestShapeV7;
  readonly variant: number;
  readonly parts: readonly PiecePart[];
  readonly notes?: string;
}

interface RecipeFile {
  readonly bead: string;
  readonly shared?: Readonly<Record<string, unknown>>;
  readonly recipes: readonly Recipe[];
  /** The accepted pieces: which reviewed rasters make each one. */
  readonly pieces?: readonly PieceSpec[];
  /**
   * Mined mountains (bead pulp_wars-6kn): 1 x 1 pieces, each a range-style
   * single mountain with a Mine dug into it, drawn on a Mine's cell.
   */
  readonly mines?: readonly PieceSpec[];
  /**
   * Join pieces: low foothills the board draws on the edge between two
   * range pieces, under both, so two ranges read as one.
   */
  readonly joins?: readonly PiecePart[];
}

interface RecordEntry {
  readonly id: string;
  readonly jobId: string;
  readonly at: string;
  readonly request: Readonly<Record<string, unknown>>;
  readonly usageUsd?: number;
  readonly candidates: readonly { file: string; sha256: string }[];
}

type Records = Record<string, RecordEntry>;

interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function expand(file: RecipeFile, recipe: Recipe): Recipe {
  return Object.fromEntries(
    Object.entries(recipe).map(([key, value]) => {
      if (typeof value !== "string" || !value.startsWith("@"))
        return [key, value];
      const shared = file.shared?.[value.slice(1)];
      if (shared === undefined)
        throw new Error(`${recipe.id}: no shared ${value}`);
      return [key, shared];
    }),
  ) as unknown as Recipe;
}

async function fragment(
  root: string,
  name: string,
): Promise<{ text: string; negative: string }> {
  const text = (
    await readFile(path.join(root, FRAGMENTS, `${name}.txt`), "utf8")
  ).trim();
  const negative = await readFile(
    path.join(root, FRAGMENTS, `${name}.negative.txt`),
    "utf8",
  ).then(
    (value) => value.trim(),
    () => "",
  );
  return { text, negative };
}

/** The description, layered exactly as the chibi pipeline does. */
async function description(
  root: string,
  recipe: Recipe,
): Promise<{ text: string; layers: { source: string; text: string }[] }> {
  const layers: { source: string; text: string }[] = [];
  const negatives: string[] = [];
  for (const name of recipe.fragments ?? []) {
    const { text, negative } = await fragment(root, name);
    layers.push({ source: `${FRAGMENTS}/${name}.txt`, text });
    if (negative) negatives.push(negative);
  }
  if (recipe.klass)
    layers.push({ source: "recipes.json klass", text: recipe.klass });
  if (recipe.subject)
    layers.push({ source: "recipes.json subject", text: recipe.subject });
  if (recipe.negative) negatives.push(recipe.negative);
  const terms = [
    ...new Set(
      negatives
        .join(", ")
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  ];
  const text = `${layers.map((layer) => layer.text).join(" ")}${
    terms.length > 0 ? ` Must not include: ${terms.join(", ")}.` : ""
  }`;
  return { text, layers };
}

async function resolveImage(
  root: string,
  records: Records,
  source: ImageSource,
): Promise<{ bytes: Buffer; label: string }> {
  if (source.recipe !== undefined) {
    const candidate = records[source.recipe]?.candidates[source.candidate ?? 0];
    if (candidate === undefined)
      throw new Error(`source ${source.recipe} has no candidate`);
    const bytes = await readFile(path.join(root, candidate.file));
    return {
      bytes,
      label: `recipe ${source.recipe}#${source.candidate ?? 0} sha256 ${sha256(bytes)}`,
    };
  }
  if (source.file !== undefined) {
    const bytes = await readFile(path.join(root, source.file));
    return { bytes, label: `file ${source.file} sha256 ${sha256(bytes)}` };
  }
  throw new Error("empty image source");
}

const dataUrl = (bytes: Buffer): string =>
  `data:image/png;base64,${bytes.toString("base64")}`;

async function requestFor(
  root: string,
  records: Records,
  recipe: Recipe,
): Promise<{
  body: Record<string, unknown>;
  snapshot: Record<string, unknown>;
}> {
  if (recipe.endpoint === "edit-image-pixen") {
    if (recipe.source === undefined || recipe.instruction === undefined)
      throw new Error(
        `${recipe.id}: an edit needs a source and an instruction`,
      );
    if (recipe.instruction.length > 500)
      throw new Error(`${recipe.id}: edit instruction exceeds 500 characters`);
    const source = await resolveImage(root, records, recipe.source);
    const body = {
      image: { base64: dataUrl(source.bytes) },
      description: recipe.instruction,
      width: recipe.width,
      height: recipe.height,
      seed: recipe.seed,
      no_background: true,
    };
    return { body, snapshot: { ...body, image: source.label } };
  }
  const { text, layers } = await description(root, recipe);
  const body: Record<string, unknown> = {
    description: text,
    image_size: { width: recipe.width, height: recipe.height },
    no_background: true,
    seed: recipe.seed,
    ...(recipe.options ?? {}),
  };
  const snapshot: Record<string, unknown> = { ...body, layers };
  if (recipe.styleImage !== undefined) {
    const style = await resolveImage(root, records, recipe.styleImage);
    const meta = await sharp(style.bytes).metadata();
    body.style_image = {
      image: { base64: dataUrl(style.bytes) },
      size: { width: meta.width, height: meta.height },
    };
    body.style_options = {
      color_palette: true,
      outline: true,
      detail: true,
      shading: true,
    };
    snapshot.style_image = style.label;
    snapshot.style_options = body.style_options;
  }
  return { body, snapshot };
}

function property(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function collectImages(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) found.push(value);
    return found;
  }
  if (typeof value !== "object" || value === null) return found;
  const direct = property(value, "base64");
  if (typeof direct === "string" && direct.length > 100) {
    found.push(direct);
    return found;
  }
  for (const nested of Object.values(value)) collectImages(nested, found);
  return found;
}

function decode(encoded: string): Buffer {
  const at = encoded.indexOf("base64,");
  return Buffer.from(at >= 0 ? encoded.slice(at + 7) : encoded, "base64");
}

async function safeError(response: Response): Promise<string> {
  return (await response.text())
    .replaceAll(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "[image]")
    .replaceAll(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 400);
}

async function call(
  endpoint: Endpoint,
  body: Record<string, unknown>,
): Promise<{ jobId: string; images: Buffer[]; usageUsd?: number }> {
  const key = process.env.PIXELLAB_API_KEY;
  if (!key) throw new Error("PIXELLAB_API_KEY is missing from the environment");
  const response = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${endpoint}: HTTP ${response.status}: ${await safeError(response)}`,
    );
  let job = (await response.json()) as unknown;
  const asyncId = property(job, "background_job_id");
  const isAsync = typeof asyncId === "string" && asyncId !== "";
  const jobId = isAsync ? asyncId : `sync-${randomUUID()}`;
  if (isAsync) {
    const deadline = Date.now() + 12 * 60_000;
    for (;;) {
      if (Date.now() > deadline) throw new Error(`${endpoint}: job timed out`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const poll = await fetch(
        `${API}/background-jobs/${encodeURIComponent(jobId)}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
      if (!poll.ok) throw new Error(`poll HTTP ${poll.status}`);
      job = (await poll.json()) as unknown;
      const status = property(job, "status");
      if (status === "failed") throw new Error(`${endpoint}: job failed`);
      if (status === "completed") break;
    }
  }
  const usage = property(property(job, "usage"), "usd");
  const images = collectImages(property(job, "last_response") ?? job).map(
    decode,
  );
  if (images.length === 0) throw new Error(`${endpoint}: no image returned`);
  return {
    jobId,
    images,
    ...(typeof usage === "number" ? { usageUsd: usage } : {}),
  };
}

async function loadRecipes(root: string): Promise<RecipeFile> {
  return readJson<RecipeFile>(path.join(root, RECIPES), {
    bead: "",
    recipes: [],
  });
}

function recipeById(file: RecipeFile, id: string): Recipe {
  const found = file.recipes.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`unknown recipe ${id}`);
  return expand(file, found);
}

async function plan(root: string): Promise<void> {
  const file = await loadRecipes(root);
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  for (const found of file.recipes) {
    const recipe = recipeById(file, found.id);
    const state =
      records[recipe.id] === undefined
        ? "PENDING"
        : recipe.reject !== undefined
          ? "REJECTED"
          : (file.pieces ?? []).some((piece) =>
                piece.parts.some((part) => part.recipe === recipe.id),
              )
            ? "USED"
            : "GENERATED";
    console.log(
      `${state.padEnd(22)} ${recipe.id} (${recipe.endpoint} ${recipe.width}x${recipe.height} seed ${recipe.seed})`,
    );
  }
  console.log(`${Object.keys(records).length} PixelLab call(s) recorded`);
}

async function generate(root: string, ids: readonly string[]): Promise<void> {
  const file = await loadRecipes(root);
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  await mkdir(path.join(root, RAW), { recursive: true });
  for (const id of ids) {
    const recipe = recipeById(file, id);
    if (records[id] !== undefined) {
      console.log(`${id}: already generated, skipped (no call)`);
      continue;
    }
    if (recipe.width % 4 !== 0 || recipe.height % 4 !== 0)
      throw new Error(`${id}: sides must be multiples of 4`);
    const { body, snapshot } = await requestFor(root, records, recipe);
    console.log(
      `${id}: POST ${recipe.endpoint} ${recipe.width}x${recipe.height} seed ${recipe.seed}`,
    );
    const result = await call(recipe.endpoint, body);
    const candidates: { file: string; sha256: string }[] = [];
    for (const [index, bytes] of result.images.entries()) {
      const relative = `${RAW}/${id}-${index}.png`;
      await writeFile(path.join(root, relative), bytes);
      candidates.push({ file: relative, sha256: sha256(bytes) });
    }
    records[id] = {
      id,
      jobId: result.jobId,
      at: new Date().toISOString(),
      request: { endpoint: recipe.endpoint, ...snapshot },
      ...(result.usageUsd === undefined ? {} : { usageUsd: result.usageUsd }),
      candidates,
    };
    await writeFile(
      path.join(root, RECORDS),
      `${JSON.stringify(records, null, 2)}\n`,
    );
    console.log(`${id}: ${candidates.length} candidate(s) saved`);
  }
}

/** Raw candidates of recipes on the Grass green, native and enlarged 3x. */
async function review(
  root: string,
  out: string,
  ids: readonly string[],
): Promise<void> {
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  const files = ids.flatMap((id) =>
    id.endsWith(".png")
      ? [id]
      : (records[id]?.candidates.map((candidate) => candidate.file) ?? []),
  );
  const pad = 16;
  const label = 22;
  let y = pad;
  let width = 950;
  const composites: OverlayOptions[] = [];
  for (const file of files) {
    const meta = await sharp(path.join(root, file)).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    composites.push({
      input: Buffer.from(
        `<svg width="900" height="${label}"><text x="0" y="16" font-family="Helvetica" font-size="14" fill="#10210f">${path.basename(file)} (${w}x${h})</text></svg>`,
      ),
      left: pad,
      top: y,
    });
    composites.push({
      input: path.join(root, file),
      left: pad,
      top: y + label,
    });
    composites.push({
      input: await sharp(path.join(root, file))
        .resize(w * 3, h * 3, { kernel: "nearest" })
        .toBuffer(),
      left: pad * 2 + w,
      top: y + label,
    });
    width = Math.max(width, pad * 3 + w * 4);
    y += label + h * 3 + pad;
  }
  await sharp({
    create: {
      width,
      height: y,
      channels: 4,
      background: { r: 132, g: 184, b: 92, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

// ------------------------------------------------------------ derivation

function opaqueBox(r: Raster): { x: number; y: number; w: number; h: number } {
  let x0 = r.width;
  let y0 = r.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < r.height; y += 1)
    for (let x = 0; x < r.width; x += 1)
      if ((r.data[(y * r.width + x) * 4 + 3] ?? 0) >= 128) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) throw new Error("empty raster");
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** The opaque box of a raster as its own raster, alpha made 0 or 255. */
function trimmed(source: Raster): Raster {
  const box = opaqueBox(source);
  const data = new Uint8Array(box.w * box.h * 4);
  for (let y = 0; y < box.h; y += 1)
    for (let x = 0; x < box.w; x += 1) {
      const from = ((box.y + y) * source.width + box.x + x) * 4;
      const to = (y * box.w + x) * 4;
      if ((source.data[from + 3] ?? 0) < 128) continue;
      for (let c = 0; c < 3; c += 1) data[to + c] = source.data[from + c] ?? 0;
      data[to + 3] = 255;
    }
  return { width: box.w, height: box.h, data };
}

function flopped(r: Raster): Raster {
  const data = new Uint8Array(r.data.length);
  for (let y = 0; y < r.height; y += 1)
    for (let x = 0; x < r.width; x += 1)
      for (let c = 0; c < 4; c += 1)
        data[(y * r.width + x) * 4 + c] =
          r.data[(y * r.width + (r.width - 1 - x)) * 4 + c] ?? 0;
  return { ...r, data };
}

function paint(target: Raster, stamp: Raster, left: number, top: number): void {
  for (let y = 0; y < stamp.height; y += 1)
    for (let x = 0; x < stamp.width; x += 1) {
      const tx = left + x;
      const ty = top + y;
      const from = (y * stamp.width + x) * 4;
      if ((stamp.data[from + 3] ?? 0) < 128) continue;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        throw new Error("a part reaches outside its piece canvas");
      const to = (ty * target.width + tx) * 4;
      for (let c = 0; c < 3; c += 1)
        target.data[to + c] = stamp.data[from + c] ?? 0;
      target.data[to + 3] = 255;
    }
}

const lumaOf = (r: number, g: number, b: number): number =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * Softening, as the composed forests: a dark outline pixel inside the rock
 * (not within two pixels of transparency, the outer silhouette) moves
 * `outlineBlend` of the way to the rock around it. The silhouette keeps its
 * black line.
 */
function softened(source: Raster): Raster {
  const { width, height } = source;
  const data = new Uint8Array(source.data);
  const opaque = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    (source.data[(y * width + x) * 4 + 3] ?? 0) > 0;
  const outline = (x: number, y: number): boolean => {
    const i = (y * width + x) * 4;
    return (
      lumaOf(
        source.data[i] ?? 0,
        source.data[i + 1] ?? 0,
        source.data[i + 2] ?? 0,
      ) < OUTLINE_LUMA
    );
  };
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y) || !outline(x, y)) continue;
      let silhouette = false;
      for (let dy = -2; dy <= 2 && !silhouette; dy += 1)
        for (let dx = -2; dx <= 2 && !silhouette; dx += 1)
          if (!opaque(x + dx, y + dy)) silhouette = true;
      if (silhouette) continue;
      const sum = [0, 0, 0];
      let count = 0;
      for (let dy = -2; dy <= 2; dy += 1)
        for (let dx = -2; dx <= 2; dx += 1) {
          if (!opaque(x + dx, y + dy) || outline(x + dx, y + dy)) continue;
          const n = ((y + dy) * width + x + dx) * 4;
          for (let c = 0; c < 3; c += 1)
            sum[c] = (sum[c] ?? 0) + (source.data[n + c] ?? 0);
          count += 1;
        }
      if (count === 0) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const from = source.data[i + c] ?? 0;
        data[i + c] = Math.round(
          from + ((sum[c] ?? 0) / count - from) * DERIVE.outlineBlend,
        );
      }
    }
  return { width, height, data };
}

/** Whether canvas pixel (px, py) of a piece may hold paint. */
export function mountainPieceAllows(
  shape: ForestShapeV7,
  px: number,
  py: number,
): boolean {
  const rows = FOREST_SHAPES_V7[shape];
  const cx = Math.floor(px / CELL);
  const top = rows.findIndex((row) => row[cx] === "#");
  if (top < 0) return false;
  if (py >= top * CELL + UP - DERIVE.bandLimit && py < top * CELL + UP)
    return true;
  return py >= UP && rows[Math.floor((py - UP) / CELL)]?.[cx] === "#";
}

interface DerivedRecord {
  readonly schemaVersion: 1;
  readonly bead: string;
  readonly cellPx: number;
  readonly overflowPx: number;
  readonly derive: typeof DERIVE;
  readonly sources: readonly {
    readonly path: string;
    readonly sha256: string;
  }[];
  readonly seams: readonly {
    readonly id: string;
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly sha256: string;
    readonly pixelSha256: string;
  }[];
  /** Mined mountains: 1 x 1 pieces drawn on a Mountain cell with a Mine. */
  readonly mines: DerivedRecord["pieces"];
  readonly pieces: readonly {
    readonly id: string;
    readonly shape: ForestShapeV7;
    readonly variant: number;
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly parts: readonly PiecePart[];
    readonly sha256: string;
    readonly pixelSha256: string;
  }[];
}

async function load(root: string, file: string): Promise<Raster> {
  const raster = await readRaster(await readFile(path.join(root, file)));
  return {
    width: raster.width,
    height: raster.height,
    data: new Uint8Array(raster.data),
  };
}

/**
 * Every master as its sources derive it today. A piece is its parts (raw
 * PixelLab candidates or accepted single mountains), each trimmed to its
 * opaque box, centred in the piece and stood with its foot `baseInset` px
 * above the bottom edge of its row (plus the part's dx, dy), painted north
 * to south, then softened. Paint must stay over the footprint or within
 * `bandLimit` px above the topmost covered cell of its column, or the bake
 * fails. The seams are the single mountains alone, trimmed and softened.
 */
export async function deriveMountainRanges(root: string): Promise<{
  readonly record: DerivedRecord;
  readonly files: ReadonlyMap<string, Buffer>;
}> {
  const file = await loadRecipes(root);
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  const files = new Map<string, Buffer>();
  const sources = new Map<string, string>();
  const source = async (part: PiecePart): Promise<Raster> => {
    let relative: string;
    if (part.single !== undefined)
      relative = `${TERRAIN}/${part.single}.body.png`;
    else {
      const candidate =
        records[part.recipe ?? ""]?.candidates[part.candidate ?? 0];
      if (candidate === undefined)
        throw new Error(`no candidate ${part.recipe}#${part.candidate ?? 0}`);
      const bytes = await readFile(path.join(root, candidate.file));
      if (sha256(bytes) !== candidate.sha256)
        throw new Error(`${candidate.file} is not the recorded candidate`);
      relative = candidate.file;
    }
    sources.set(relative, sha256(await readFile(path.join(root, relative))));
    return trimmed(await load(root, relative));
  };
  const pieces: DerivedRecord["pieces"][number][] = [];
  const mines: DerivedRecord["pieces"][number][] = [];
  const specs = [
    ...(file.pieces ?? []).map((spec) => ({ spec, mine: false })),
    ...(file.mines ?? []).map((spec) => ({ spec, mine: true })),
  ];
  for (const { spec, mine } of specs) {
    const rows = FOREST_SHAPES_V7[spec.shape];
    const width = (rows[0]?.length ?? 1) * CELL;
    const height = rows.length * CELL + UP;
    const canvas: Raster = {
      width,
      height,
      data: new Uint8Array(width * height * 4),
    };
    const placed: {
      raster: Raster;
      left: number;
      top: number;
      base: number;
    }[] = [];
    for (const part of spec.parts) {
      const raster =
        part.flip === true ? flopped(await source(part)) : await source(part);
      const row = part.row ?? rows.length - 1;
      const base = UP + (row + 1) * CELL - DERIVE.baseInset + (part.dy ?? 0);
      placed.push({
        raster,
        left: Math.round((width - raster.width) / 2) + (part.dx ?? 0),
        top: base - raster.height,
        base,
      });
    }
    placed.sort((a, b) => a.base - b.base);
    const id = `chibi-mountain-range-${mine ? "mine" : spec.shape.toLowerCase()}-${String.fromCharCode(97 + spec.variant)}`;
    for (const part of placed) paint(canvas, part.raster, part.left, part.top);
    for (let py = 0; py < height; py += 1)
      for (let px = 0; px < width; px += 1)
        if (
          (canvas.data[(py * width + px) * 4 + 3] ?? 0) > 0 &&
          !mountainPieceAllows(spec.shape, px, py)
        )
          throw new Error(
            `${id}: paint at ${px},${py} is outside its footprint or above the band limit`,
          );
    // A Mine is a building: its dark tunnel and beams are not softened.
    const raster = mine ? canvas : softened(canvas);
    const bytes = await encodePng(raster);
    const relative = `${OUT}/${id}.png`;
    files.set(relative, bytes);
    if (mine) {
      // The master the art registry shows (interface and fallback): the
      // mined mountain over the rocky ground of its cell.
      const ground = await load(root, `${TERRAIN}/chibi-mountain-ground-1.png`);
      const master: Raster = {
        width,
        height,
        data: new Uint8Array(raster.data),
      };
      for (let y = 0; y < CELL; y += 1)
        for (let x = 0; x < CELL; x += 1) {
          const to = ((y + UP) * width + x) * 4;
          if ((master.data[to + 3] ?? 0) >= 128) continue;
          const from = (y * CELL + x) * 4;
          for (let c = 0; c < 4; c += 1)
            master.data[to + c] = ground.data[from + c] ?? 0;
        }
      files.set(`${OUT}/${id}.master.png`, await encodePng(master));
      sources.set(
        `${TERRAIN}/chibi-mountain-ground-1.png`,
        sha256(
          await readFile(
            path.join(root, `${TERRAIN}/chibi-mountain-ground-1.png`),
          ),
        ),
      );
    }
    (mine ? mines : pieces).push({
      id,
      shape: spec.shape,
      variant: spec.variant,
      path: relative,
      width,
      height,
      parts: spec.parts,
      sha256: sha256(bytes),
      pixelSha256: pixelSha256(raster),
    });
  }
  const seams: DerivedRecord["seams"][number][] = [];
  // The joins: low foothills, not mountains. A single mountain between
  // two ranges made the board a crowd of small rocks (the first review).
  for (const [index, part] of (file.joins ?? []).entries()) {
    const raster = softened(await source(part));
    const bytes = await encodePng(raster);
    const id = `chibi-mountain-join-${String.fromCharCode(97 + index)}`;
    const relative = `${OUT}/${id}.png`;
    files.set(relative, bytes);
    seams.push({
      id,
      path: relative,
      width: raster.width,
      height: raster.height,
      sha256: sha256(bytes),
      pixelSha256: pixelSha256(raster),
    });
  }
  return {
    record: {
      schemaVersion: 1,
      bead: file.bead,
      cellPx: CELL,
      overflowPx: UP,
      derive: DERIVE,
      sources: [...sources.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file2, hash]) => ({ path: file2, sha256: hash })),
      seams,
      pieces,
      mines,
    },
    files,
  };
}

/** Problems of the checked-in mountain ranges; empty means valid. */
export async function mountainRangeProblems(root: string): Promise<string[]> {
  const problems: string[] = [];
  let derived;
  try {
    derived = await deriveMountainRanges(root);
  } catch (error) {
    return [
      `mountain ranges: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  // Every recorded candidate is still the returned bytes.
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  for (const record of Object.values(records))
    for (const candidate of record.candidates) {
      const bytes = await readFile(path.join(root, candidate.file)).catch(
        () => null,
      );
      if (bytes === null || sha256(bytes) !== candidate.sha256)
        problems.push(
          `mountain ranges: ${candidate.file} is missing or changed`,
        );
    }
  let recorded: string;
  try {
    recorded = await readFile(path.join(root, MOUNTAIN_RANGES_RECORD), "utf8");
  } catch {
    return [
      ...problems,
      `mountain ranges: ${MOUNTAIN_RANGES_RECORD} is missing`,
    ];
  }
  if (JSON.stringify(JSON.parse(recorded)) !== JSON.stringify(derived.record))
    problems.push(
      `mountain ranges: ${MOUNTAIN_RANGES_RECORD} is not what its sources derive (run the bake)`,
    );
  for (const [file, bytes] of derived.files) {
    const checkedIn = await readFile(path.join(root, file)).catch(() => null);
    if (checkedIn === null) {
      problems.push(`mountain ranges: ${file} is missing`);
      continue;
    }
    if (
      pixelSha256(await readRaster(checkedIn)) !==
      pixelSha256(await readRaster(bytes))
    )
      problems.push(`mountain ranges: ${file} is not what its parts derive`);
  }
  return problems;
}

async function bake(root: string): Promise<void> {
  const { record, files } = await deriveMountainRanges(root);
  await mkdir(path.join(root, OUT), { recursive: true });
  for (const [file, bytes] of files) {
    await writeFile(path.join(root, file), bytes);
    console.log(`wrote ${file}`);
  }
  await writeFile(
    path.join(root, MOUNTAIN_RANGES_RECORD),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  console.log(`wrote ${MOUNTAIN_RANGES_RECORD}`);
}

/**
 * Tone of the old Mountain cell (the single mountain on its rocky ground)
 * against the range pieces over the same ground: mean luma and HSV
 * saturation, luma spread (contrast inside the cell) and the share of
 * outline-dark pixels, over the footprint cells.
 */
async function stats(root: string): Promise<void> {
  const record = JSON.parse(
    await readFile(path.join(root, MOUNTAIN_RANGES_RECORD), "utf8"),
  ) as DerivedRecord;
  const ground = await load(root, `${TERRAIN}/chibi-mountain-ground-1.png`);
  const tone = (cells: readonly Raster[]): string => {
    let n = 0;
    let sat = 0;
    let l = 0;
    let l2 = 0;
    let dark = 0;
    for (const cell of cells)
      for (let i = 0; i < cell.data.length; i += 4) {
        if ((cell.data[i + 3] ?? 0) < 128) continue;
        const r = (cell.data[i] ?? 0) / 255;
        const g = (cell.data[i + 1] ?? 0) / 255;
        const b = (cell.data[i + 2] ?? 0) / 255;
        const max = Math.max(r, g, b);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        n += 1;
        sat += max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
        l += luma;
        l2 += luma * luma;
        if (luma < OUTLINE_LUMA) dark += 1;
      }
    const mean = l / n;
    const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
    return `luma ${percent(mean)}  saturation ${percent(sat / n)}  luma spread ${percent(Math.sqrt(Math.max(0, l2 / n - mean * mean)))}  outline share ${percent(dark / n)}`;
  };
  /** The footprint cells of a piece (or an 80 x 104 body) over the ground. */
  const overGround = (piece: Raster, shape: ForestShapeV7): Raster => {
    const rows = FOREST_SHAPES_V7[shape];
    const data = new Uint8Array(piece.width * (piece.height - UP) * 4);
    for (let y = 0; y < piece.height - UP; y += 1)
      for (let x = 0; x < piece.width; x += 1) {
        if (rows[Math.floor(y / CELL)]?.[Math.floor(x / CELL)] !== "#")
          continue;
        const out = (y * piece.width + x) * 4;
        const from = ((y + UP) * piece.width + x) * 4;
        const under = ((y % CELL) * CELL + (x % CELL)) * 4;
        const rock = (piece.data[from + 3] ?? 0) >= 128;
        for (let c = 0; c < 3; c += 1)
          data[out + c] = rock
            ? (piece.data[from + c] ?? 0)
            : (ground.data[under + c] ?? 0);
        data[out + 3] = 255;
      }
    return { width: piece.width, height: piece.height - UP, data };
  };
  const old: Raster[] = [];
  for (const id of ["chibi-mountain-1", "chibi-mountain-3"])
    old.push(overGround(await load(root, `${TERRAIN}/${id}.body.png`), "1x1"));
  console.log(`old Mountain cell (single on ground)  ${tone(old)}`);
  const all: Raster[] = [];
  for (const shape of ["1x1", "2x1", "1x2", "2x2"] as const) {
    const cells: Raster[] = [];
    for (const piece of record.pieces)
      if (piece.shape === shape)
        cells.push(overGround(await load(root, piece.path), shape));
    all.push(...cells);
    console.log(`${`${shape} pieces on ground`.padEnd(37)} ${tone(cells)}`);
  }
  console.log(`${"all pieces on ground".padEnd(37)} ${tone(all)}`);
}

/** A contact sheet of the checked-in pieces over the rocky ground. */
async function sheet(root: string, out: string): Promise<void> {
  const record = JSON.parse(
    await readFile(path.join(root, MOUNTAIN_RANGES_RECORD), "utf8"),
  ) as DerivedRecord;
  const ground = await readFile(
    path.join(root, `${TERRAIN}/chibi-mountain-ground-1.png`),
  );
  const pad = 16;
  const slotW = 2 * CELL + pad;
  const slotH = 2 * CELL + UP + pad;
  const perRow = 6;
  const entries = [
    ...record.pieces.map((piece) => ({ shape: piece.shape, path: piece.path })),
    ...record.mines.map((piece) => ({ shape: piece.shape, path: piece.path })),
    ...record.seams.map((seam) => ({ shape: "1x1" as const, path: seam.path })),
  ];
  const width = perRow * slotW + pad;
  const height = Math.ceil(entries.length / perRow) * slotH + pad;
  const composites: OverlayOptions[] = [];
  for (const [index, entry] of entries.entries()) {
    const ox = pad + (index % perRow) * slotW;
    const oy = pad + Math.floor(index / perRow) * slotH + UP;
    FOREST_SHAPES_V7[entry.shape].forEach((row, dy) =>
      [...row].forEach((mark, dx) => {
        if (mark === "#")
          composites.push({
            input: ground,
            left: ox + dx * CELL,
            top: oy + dy * CELL,
          });
      }),
    );
    composites.push({
      input: path.join(root, entry.path),
      left: ox,
      top: oy - (entry.path.includes("join") ? 0 : UP),
    });
  }
  const image = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 132, g: 184, b: 92, alpha: 1 },
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
  const [command, ...rest] = process.argv.slice(2);
  if (command === "plan") return plan(root);
  if (command === "generate") return generate(root, rest);
  if (command === "review" && rest[0] !== undefined)
    return review(root, path.resolve(rest[0]), rest.slice(1));
  if (command === "bake") return bake(root);
  if (command === "stats") return stats(root);
  if (command === "sheet" && rest[0] !== undefined)
    return sheet(root, path.resolve(rest[0]));
  if (command === "check" || command === undefined) {
    const problems = await mountainRangeProblems(root);
    if (problems.length > 0) throw new Error(problems.join("\n"));
    console.log("The mountain ranges are what their sources derive.");
    return;
  }
  throw new Error(
    "usage: chibi-mountain-ranges.ts plan | generate <id>... | review <out.png> <id>... | bake | check | sheet <out.png>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
