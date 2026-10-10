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
import { lightVerdict, lightingOf } from "./lighting-qa";

const CELL = 80;
/** Rows above the footprint in a low piece's canvas (and a Mine's). */
const UP = 24;
/** Rows above the footprint in a tall piece's canvas (pulp_wars-2o7.1). */
const TALL_UP = 48;
const TERRAIN = "public/assets/chibi/terrain";
const OUT = "public/assets/chibi/mountains";
/**
 * An exploration run (bead pulp_wars-2yc.1): with MOUNTAIN_RANGES_RUN set to
 * a directory, `plan`, `generate` and `review` read that directory's
 * recipes.json and keep its records.json and raw candidates there, with the
 * same rules. The production commands refuse to run then.
 */
const RUN = process.env.MOUNTAIN_RANGES_RUN?.replace(/\/+$/, "") || undefined;
const DIR = RUN ?? "scripts/art/chibi/mountain-ranges";
const RECIPES = `${DIR}/recipes.json`;
const RECORDS = `${DIR}/records.json`;
const RAW =
  RUN === undefined ? "art/pixellab/chibi-raw/mountain-ranges" : `${RUN}/raw`;
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
const DERIVE = {
  bandLimit: 13,
  /**
   * A tall piece (bead pulp_wars-2o7.1) stands only under another plain
   * Mountain cell, so its peaks may rise this far over the row behind.
   */
  tallLimit: 48,
  baseInset: 3,
  outlineBlend: 0.45,
  /**
   * The foot cut of a raster the generator clipped at its image edge
   * (`footed`): the rock steps in 2 to 5 px from a clipped side and 0 to 3
   * px from a clipped bottom, in steps 3 to 6 px long, and the corner
   * between two cut edges is taken off over `footCorner` px.
   */
  /**
   * Calming (bead pulp_wars-2o7.1): the massif pieces cover two thirds of
   * their cells, so every rock and snow pixel (not the outline) moves this
   * far towards `calmTone`, a mid blue-grey. Less contrast between the lit
   * and the shaded faces keeps a mountain area behind the units.
   */
  calm: 0.14,
  calmTone: [146, 154, 168],
  footMin: 2,
  footMax: 5,
  footBottomMax: 3,
  footCorner: 7,
  /**
   * The restyle (bead pulp_wars-2yc.1, the user's choice "D - no new art"
   * of 2026-10-05): the black outline takes a dark slate tone of the rock,
   * the cool greys move `warm` of the way toward a warm grey-brown, the
   * snow `snowBlend` of the way toward cream, and the foot of the rock is
   * cut away in a ragged line `footRows` px high, so the cell's own ground
   * (Grass of any faction, Snow, the sand of a coast) shows at the foot
   * and the mountain grows out of it. A Mine's foot is cut the same way
   * (bead pulp_wars-2yc.41), but never its entrance, its cart or its dark
   * tunnel, which stand there.
   */
  restyle: {
    outline: [78, 68, 70],
    warm: 0.6,
    snow: [244, 236, 216],
    snowBlend: 0.5,
    snowLuma: 205,
    footRows: [5, 11],
    /** Only a column whose lowest paint is this near the bottom has a foot. */
    footBand: 30,
    /** A Mine: only pixels this grey are rock (timber and ore keep theirs). */
    mineRockChroma: 48,
  },
};
const OUTLINE_LUMA = 0.2;

type Endpoint = "create-image-pixen" | "edit-image-pixen" | "generate-image-v2";

interface ImageSource {
  readonly recipe?: string;
  readonly candidate?: number;
  readonly file?: string;
  /**
   * A style image made larger (bead pulp_wars-2o7.1): the source trimmed
   * to its opaque box, resized without smoothing to `width` x `height` and
   * stood at the bottom centre of a transparent `canvasWidth` x
   * `canvasHeight` canvas, 2 px above its edge. The generator copies the
   * scale of its style image, so this is how a small accepted mountain
   * becomes the pattern for one that fills its cell. Only a style image:
   * no master is ever resampled.
   */
  readonly enlarge?: {
    readonly width: number;
    readonly height: number;
    readonly canvasWidth: number;
    readonly canvasHeight: number;
  };
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

/** The canvas rows above a piece's footprint. */
const upOf = (spec: { readonly tall?: true }): number =>
  spec.tall === true ? TALL_UP : UP;

interface PieceSpec {
  readonly shape: ForestShapeV7;
  readonly variant: number;
  /**
   * A tall piece: drawn only where every cell above it is a plain Mountain,
   * its peaks rising up to `tallLimit` px over that row.
   */
  readonly tall?: true;
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
  if (source.enlarge !== undefined) {
    const { enlarge, ...plain } = source;
    const original = await resolveImage(root, records, plain);
    const box = await sharp(original.bytes).trim({ threshold: 0 }).toBuffer();
    const resized = await sharp(box)
      .resize(enlarge.width, enlarge.height, { kernel: "nearest", fit: "fill" })
      .toBuffer();
    const bytes = await sharp({
      create: {
        width: enlarge.canvasWidth,
        height: enlarge.canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resized,
          left: Math.round((enlarge.canvasWidth - enlarge.width) / 2),
          top: enlarge.canvasHeight - 2 - enlarge.height,
        },
      ])
      .png()
      .toBuffer();
    return {
      bytes,
      label: `${original.label} enlarged to ${enlarge.width}x${enlarge.height} on ${enlarge.canvasWidth}x${enlarge.canvasHeight}, pixels ${pixelSha256(await readRaster(bytes))}`,
    };
  }
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
/**
 * The restyle of a derived piece (DERIVE.restyle). `mine` recolours only
 * the outer outline and warms only grey pixels. Its foot is cut away like
 * any mountain's (bead pulp_wars-2yc.41), but only the rock: a column's cut
 * stops under the timber, the ore cart and the tunnel (`mineKept`), so the
 * entrance and the cart stand whole on the ground.
 */
export function restyled(source: Raster, mine: boolean): Raster {
  const spec = DERIVE.restyle;
  const { width, height } = source;
  const data = new Uint8Array(source.data);
  const clear = (x: number, y: number): boolean =>
    x < 0 ||
    y < 0 ||
    x >= width ||
    y >= height ||
    (source.data[(y * width + x) * 4 + 3] ?? 0) === 0;
  const kept = mine ? mineKept(source) : null;
  for (let x = 0; x < width; x += 1) {
    let bottom = -1;
    for (let y = height - 1; y >= 0; y -= 1)
      if ((source.data[(y * width + x) * 4 + 3] ?? 0) > 0) {
        bottom = y;
        break;
      }
    // A Mine: the lowest row of this column the cut must leave alone.
    let keptFrom = -1;
    if (kept !== null)
      for (let y = bottom; y >= 0; y -= 1)
        if (kept[y * width + x] === 1) {
          keptFrom = y;
          break;
        }
    const footLow = spec.footRows[0] ?? 0;
    const footHigh = spec.footRows[1] ?? footLow;
    const rows = Math.round(
      footLow +
        (footHigh - footLow) *
          (0.5 + 0.5 * Math.sin(x / 5.3) * Math.cos(x / 2.9)),
    );
    for (let y = 0; y < height; y += 1) {
      const offset = (y * width + x) * 4;
      if ((source.data[offset + 3] ?? 0) === 0) continue;
      const r = source.data[offset] ?? 0;
      const g = source.data[offset + 1] ?? 0;
      const b = source.data[offset + 2] ?? 0;
      if (
        bottom - y < rows &&
        bottom >= height - spec.footBand &&
        y > keptFrom
      ) {
        data[offset + 3] = 0;
        continue;
      }
      let colour: readonly [number, number, number] = [r, g, b];
      const max = Math.max(r, g, b);
      if (max <= 62) {
        const edge =
          clear(x - 1, y) ||
          clear(x + 1, y) ||
          clear(x, y - 1) ||
          clear(x, y + 1);
        if (!mine || edge) colour = spec.outline as [number, number, number];
      } else if (mine && max - Math.min(r, g, b) >= spec.mineRockChroma) {
        // Timber, ore and lamp light: not rock.
      } else if (0.299 * r + 0.587 * g + 0.114 * b > spec.snowLuma)
        colour = [
          Math.round(r + ((spec.snow[0] ?? 0) - r) * spec.snowBlend),
          Math.round(g + ((spec.snow[1] ?? 0) - g) * spec.snowBlend),
          Math.round(b + ((spec.snow[2] ?? 0) - b) * spec.snowBlend),
        ];
      else
        colour = [
          Math.min(255, Math.round(r + (r * 1.1 + 10 - r) * spec.warm)),
          Math.round(g + (g * 0.99 - g) * spec.warm),
          Math.round(b + (b * 0.8 - b) * spec.warm),
        ];
      data[offset] = colour[0];
      data[offset + 1] = colour[1];
      data[offset + 2] = colour[2];
    }
  }
  return { width, height, data };
}

/**
 * The pixels of a mined mountain its foot cut must not touch, as a mask
 * (1 kept): the timber and the ore (every pixel `mineRockChroma` or more
 * from grey), their outline (two pixels round them) and the tunnel (the
 * dark pixels that reach them without touching the silhouette).
 */
export function mineKept(source: Raster): Uint8Array {
  const { width, height } = source;
  const kept = new Uint8Array(width * height);
  const at = (x: number, y: number): number => (y * width + x) * 4;
  const opaque = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    (source.data[at(x, y) + 3] ?? 0) > 0;
  const dark = (x: number, y: number): boolean =>
    opaque(x, y) &&
    Math.max(
      source.data[at(x, y)] ?? 0,
      source.data[at(x, y) + 1] ?? 0,
      source.data[at(x, y) + 2] ?? 0,
    ) <= 62;
  const queue: number[] = [];
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y)) continue;
      const r = source.data[at(x, y)] ?? 0;
      const g = source.data[at(x, y) + 1] ?? 0;
      const b = source.data[at(x, y) + 2] ?? 0;
      if (
        Math.max(r, g, b) <= 62 ||
        Math.max(r, g, b) - Math.min(r, g, b) < DERIVE.restyle.mineRockChroma
      )
        continue;
      for (let dy = -2; dy <= 2; dy += 1)
        for (let dx = -2; dx <= 2; dx += 1)
          if (opaque(x + dx, y + dy) && kept[(y + dy) * width + x + dx] === 0) {
            kept[(y + dy) * width + x + dx] = 1;
            queue.push((y + dy) * width + x + dx);
          }
    }
  // The tunnel: dark pixels inside the rock, from the timber inward.
  const inside = (x: number, y: number): boolean =>
    opaque(x - 1, y) &&
    opaque(x + 1, y) &&
    opaque(x, y - 1) &&
    opaque(x, y + 1);
  while (queue.length > 0) {
    const index = queue.pop() as number;
    const x = index % width;
    const y = Math.floor(index / width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!dark(nx, ny) || !inside(nx, ny) || kept[ny * width + nx] === 1)
        continue;
      kept[ny * width + nx] = 1;
      queue.push(ny * width + nx);
    }
  }
  return kept;
}

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
  // Calming: rock and snow move towards the mid tone; the outline stays.
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y) || outline(x, y)) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const from = data[i + c] ?? 0;
        data[i + c] = Math.round(
          from + ((DERIVE.calmTone[c] ?? 0) - from) * DERIVE.calm,
        );
      }
    }
  return { width, height, data };
}

/** A stable hash of two integers and a salt, in [0, 1). */
function unit(a: number, b: number, salt: number): number {
  let value =
    Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + salt, 0xc2b2ae35);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 0x1_0000_0000;
}

/**
 * The foot of a clipped raster (bead pulp_wars-2o7.1). A generated mountain
 * that fills its image is cut by the image edge: its slopes end in a
 * straight vertical line and its foot in a straight horizontal one, with no
 * outline. On a trimmed raster such an edge is a long run of opaque pixels
 * in its first or last column or its last row. `footed` gives each clipped
 * edge a rocky contour instead: the rock steps back from the edge by a few
 * pixels in short steps, the corner between two cut edges is taken off, and
 * every rock pixel that now meets the open air gets the outline's colour.
 * A raster with its whole silhouette inside the image is returned as it is.
 */
export function footed(source: Raster, salt: number): Raster {
  const { width, height } = source;
  const opaqueAt = (data: Uint8Array, x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    (data[(y * width + x) * 4 + 3] ?? 0) >= 128;
  const column = (x: number): number => {
    let count = 0;
    for (let y = 0; y < height; y += 1)
      if (opaqueAt(source.data, x, y)) count += 1;
    return count;
  };
  let bottomRun = 0;
  for (let x = 0; x < width; x += 1)
    if (opaqueAt(source.data, x, height - 1)) bottomRun += 1;
  const clippedLeft = column(0) >= 12;
  const clippedRight = column(width - 1) >= 12;
  const clippedBottom = bottomRun >= width * 0.5;
  if (!clippedLeft && !clippedRight && !clippedBottom) return source;
  const data = new Uint8Array(source.data);
  /** A stepped inset along an edge: steps 3 to 6 px long. */
  const profile = (
    length: number,
    side: number,
    min: number,
    max: number,
  ): number[] => {
    const out: number[] = [];
    let step = 0;
    while (out.length < length) {
      const run = 3 + Math.floor(unit(step, side, salt) * 4);
      const inset =
        min + Math.floor(unit(step, side + 11, salt) * (max - min + 1));
      for (let i = 0; i < run && out.length < length; i += 1) out.push(inset);
      step += 1;
    }
    return out;
  };
  const left = profile(height, 1, DERIVE.footMin, DERIVE.footMax);
  const right = profile(height, 2, DERIVE.footMin, DERIVE.footMax);
  const bottom = profile(width, 3, 0, DERIVE.footBottomMax);
  const corner = DERIVE.footCorner;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const fromBottom = height - 1 - y;
      const cut =
        (clippedLeft && x < (left[y] ?? 0)) ||
        (clippedRight && width - 1 - x < (right[y] ?? 0)) ||
        (clippedBottom && fromBottom < (bottom[x] ?? 0)) ||
        (clippedBottom && clippedLeft && x + fromBottom < corner) ||
        (clippedBottom && clippedRight && width - 1 - x + fromBottom < corner);
      if (cut) data[(y * width + x) * 4 + 3] = 0;
    }
  // The darkest colour of the raster is its outline.
  let ink: [number, number, number] = [0, 0, 0];
  let darkest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < source.data.length; i += 4) {
    if ((source.data[i + 3] ?? 0) < 128) continue;
    const luma = lumaOf(
      source.data[i] ?? 0,
      source.data[i + 1] ?? 0,
      source.data[i + 2] ?? 0,
    );
    if (luma < darkest) {
      darkest = luma;
      ink = [
        source.data[i] ?? 0,
        source.data[i + 1] ?? 0,
        source.data[i + 2] ?? 0,
      ];
    }
  }
  const cutData = new Uint8Array(data);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!opaqueAt(cutData, x, y)) continue;
      // Only where the cut (not the original silhouette) opened the rock.
      const opened = (
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const
      ).some(
        ([dx, dy]) =>
          !opaqueAt(cutData, x + dx, y + dy) &&
          (opaqueAt(source.data, x + dx, y + dy) ||
            x + dx < 0 ||
            x + dx >= width ||
            y + dy >= height),
      );
      if (!opened) continue;
      const i = (y * width + x) * 4;
      data[i] = ink[0];
      data[i + 1] = ink[1];
      data[i + 2] = ink[2];
    }
  return trimmed({ width, height, data });
}

/** Whether canvas pixel (px, py) of a piece may hold paint. */
export function mountainPieceAllows(
  shape: ForestShapeV7,
  px: number,
  py: number,
  tall = false,
): boolean {
  const rows = FOREST_SHAPES_V7[shape];
  const up = tall ? TALL_UP : UP;
  const limit = tall ? DERIVE.tallLimit : DERIVE.bandLimit;
  const cx = Math.floor(px / CELL);
  const top = rows.findIndex((row) => row[cx] === "#");
  if (top < 0) return false;
  if (py >= top * CELL + up - limit && py < top * CELL + up) return true;
  return py >= up && rows[Math.floor((py - up) / CELL)]?.[cx] === "#";
}

/**
 * The widest a piece's topmost row of paint may be. A whole peak comes to a
 * point 1 to 7 px wide; a peak the generator cut with the top edge of its
 * image is a flat line 17 to 36 px wide (the two `s20` ridges, 2026-10-07).
 */
export const PEAK_FLAT_MAX = 10;

/**
 * Why a raster has a cut-off peak, or null: paint on the image's top row
 * (the generator, or a canvas, clipped it there), or a topmost row of paint
 * with a run wider than `PEAK_FLAT_MAX` (a peak sliced flat).
 */
export function cutPeakProblem(raster: Raster): string | null {
  const { width, height, data } = raster;
  for (let y = 0; y < height; y += 1) {
    let widest = 0;
    let run = 0;
    for (let x = 0; x < width; x += 1) {
      run = (data[(y * width + x) * 4 + 3] ?? 0) >= 128 ? run + 1 : 0;
      widest = Math.max(widest, run);
    }
    if (widest === 0) continue;
    if (y === 0) return "paint on the top row of the image: a peak is cut off";
    return widest > PEAK_FLAT_MAX
      ? `its top row of paint (y ${y}) is ${widest} px wide: a peak is cut flat`
      : null;
  }
  return null;
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
    /** A tall piece: 48 rows above its footprint, not 24. */
    readonly tall: boolean;
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly parts: readonly PiecePart[];
    /** The lighting QA of the piece's rock, in luma points (+ is left). */
    readonly light: { readonly thirds: number; readonly faces: number };
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
    const whole = await load(root, relative);
    // A candidate that fills its image is cut by its top edge: after the
    // trim that cut is a peak with a flat top, so it is refused here.
    const cut = part.single === undefined ? cutPeakProblem(whole) : null;
    if (cut !== null) throw new Error(`${relative}: ${cut}`);
    return trimmed(whole);
  };
  const pieces: DerivedRecord["pieces"][number][] = [];
  const mines: DerivedRecord["pieces"][number][] = [];
  const specs = [
    ...(file.pieces ?? []).map((spec) => ({ spec, mine: false })),
    ...(file.mines ?? []).map((spec) => ({ spec, mine: true })),
  ];
  for (const { spec, mine } of specs) {
    const rows = FOREST_SHAPES_V7[spec.shape];
    const up = upOf(spec);
    const tall = spec.tall === true;
    const width = (rows[0]?.length ?? 1) * CELL;
    const height = rows.length * CELL + up;
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
    for (const [index, part] of spec.parts.entries()) {
      // The sun is at the bottom left (the user, 2026-10-05): a mirrored
      // raster is lit from the other side, so nothing is mirrored.
      if (part.flip === true)
        throw new Error(
          `${spec.shape}${spec.tall === true ? " tall" : ""} ${spec.variant}: a mirrored part is lit from the right`,
        );
      const whole = await source(part);
      // A raster the generator clipped gets a rocky foot (`footed`).
      const raster = footed(
        whole,
        spec.variant * 31 + index * 7 + (tall ? 3 : 0) + (mine ? 5 : 0),
      );
      const row = part.row ?? rows.length - 1;
      const base = up + (row + 1) * CELL - DERIVE.baseInset + (part.dy ?? 0);
      placed.push({
        raster,
        left: Math.round((width - raster.width) / 2) + (part.dx ?? 0),
        top: base - raster.height,
        base,
      });
    }
    placed.sort((a, b) => a.base - b.base);
    const id = `chibi-mountain-range-${mine ? "mine" : spec.shape.toLowerCase()}${tall ? "-tall" : ""}-${String.fromCharCode(97 + spec.variant)}`;
    for (const part of placed) paint(canvas, part.raster, part.left, part.top);
    for (let py = 0; py < height; py += 1)
      for (let px = 0; px < width; px += 1)
        if (
          (canvas.data[(py * width + px) * 4 + 3] ?? 0) > 0 &&
          !mountainPieceAllows(spec.shape, px, py, tall)
        )
          throw new Error(
            `${id}: paint at ${px},${py} is outside its footprint or above the band limit`,
          );
    // A Mine is a building: its dark tunnel and beams are not softened.
    const raster = restyled(mine ? canvas : softened(canvas), mine);
    const cutPeak = cutPeakProblem(raster);
    if (cutPeak !== null) throw new Error(`${id}: ${cutPeak}`);
    // Lighting QA (scripts/art/lighting-qa.ts): the rock of every piece is
    // lit from the left.
    const light = lightingOf(raster, true);
    if (lightVerdict(light) === "RIGHT")
      throw new Error(
        `${id}: lit from the right (faces ${light.faces.toFixed(1)})`,
      );
    const bytes = await encodePng(raster);
    const relative = `${OUT}/${id}.png`;
    files.set(relative, bytes);
    if (mine) {
      // The master the art registry shows (interface and fallback): the
      // mined mountain on Grass, the ground a massif stands on.
      const ground = await load(root, `${TERRAIN}/chibi-grass-1.png`);
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
        `${TERRAIN}/chibi-grass-1.png`,
        sha256(await readFile(path.join(root, `${TERRAIN}/chibi-grass-1.png`))),
      );
    }
    (mine ? mines : pieces).push({
      id,
      shape: spec.shape,
      variant: spec.variant,
      tall,
      path: relative,
      width,
      height,
      parts: spec.parts,
      light: {
        thirds: Math.round(light.thirds * 10) / 10,
        faces: Math.round(light.faces * 10) / 10,
      },
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
    const raster = await readRaster(checkedIn);
    if (pixelSha256(raster) !== pixelSha256(await readRaster(bytes)))
      problems.push(`mountain ranges: ${file} is not what its parts derive`);
    // The checked-in sprite itself (a `.master.png` is a full ground tile).
    const cutPeak = file.endsWith(".master.png")
      ? null
      : cutPeakProblem({
          width: raster.width,
          height: raster.height,
          data: new Uint8Array(raster.data),
        });
    if (cutPeak !== null) problems.push(`mountain ranges: ${file}: ${cutPeak}`);
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
  // A massif stands on the cell's own ground: Grass here.
  const slopes = await load(root, `${TERRAIN}/chibi-grass-1.png`);
  const overGround = (
    piece: Raster,
    shape: ForestShapeV7,
    up: number = UP,
    under: Raster = ground,
  ): Raster => {
    const rows = FOREST_SHAPES_V7[shape];
    const data = new Uint8Array(piece.width * (piece.height - up) * 4);
    for (let y = 0; y < piece.height - up; y += 1)
      for (let x = 0; x < piece.width; x += 1) {
        if (rows[Math.floor(y / CELL)]?.[Math.floor(x / CELL)] !== "#")
          continue;
        const out = (y * piece.width + x) * 4;
        const from = ((y + up) * piece.width + x) * 4;
        const at = ((y % CELL) * CELL + (x % CELL)) * 4;
        const rock = (piece.data[from + 3] ?? 0) >= 128;
        for (let c = 0; c < 3; c += 1)
          data[out + c] = rock
            ? (piece.data[from + c] ?? 0)
            : (under.data[at + c] ?? 0);
        data[out + 3] = 255;
      }
    return { width: piece.width, height: piece.height - up, data };
  };
  /** Share of the footprint the rock covers (the rest is rocky ground). */
  const cover = (pieces: readonly DerivedRecord["pieces"][number][]) =>
    Promise.all(
      pieces.map(async (piece) => {
        const raster = await load(root, piece.path);
        const up = piece.tall ? TALL_UP : UP;
        let rock = 0;
        for (let y = up; y < raster.height; y += 1)
          for (let x = 0; x < raster.width; x += 1)
            if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128)
              rock += 1;
        return rock / (raster.width * (raster.height - up));
      }),
    );
  const old: Raster[] = [];
  for (const id of ["chibi-mountain-1", "chibi-mountain-3"])
    old.push(overGround(await load(root, `${TERRAIN}/${id}.body.png`), "1x1"));
  console.log(`old Mountain cell (single on ground)  ${tone(old)}`);
  const all: Raster[] = [];
  for (const shape of ["1x1", "2x1"] as const)
    for (const tall of [false, true]) {
      const pieces = record.pieces.filter(
        (piece) => piece.shape === shape && piece.tall === tall,
      );
      if (pieces.length === 0) continue;
      const cells: Raster[] = [];
      for (const piece of pieces)
        cells.push(
          overGround(
            await load(root, piece.path),
            shape,
            tall ? TALL_UP : UP,
            slopes,
          ),
        );
      all.push(...cells);
      const shares = await cover(pieces);
      const share =
        shares.reduce((sum, value) => sum + value, 0) / shares.length;
      console.log(
        `${`${shape}${tall ? " tall" : ""} pieces on their ground`.padEnd(37)} ${tone(cells)}  rock covers ${(share * 100).toFixed(0)}% of the footprint`,
      );
    }
  console.log(`${"all pieces on their ground".padEnd(37)} ${tone(all)}`);
}

/** A contact sheet of the checked-in pieces over the rocky ground. */
async function sheet(root: string, out: string): Promise<void> {
  const record = JSON.parse(
    await readFile(path.join(root, MOUNTAIN_RANGES_RECORD), "utf8"),
  ) as DerivedRecord;
  // A massif stands on the cell's own ground: Grass on this sheet.
  const ground = await readFile(
    path.join(root, `${TERRAIN}/chibi-grass-1.png`),
  );
  const pad = 16;
  const slotW = 2 * CELL + pad;
  const slotH = CELL + TALL_UP + pad + 14;
  const perRow = 6;
  const entries = [
    ...record.pieces.map((piece) => ({
      shape: piece.shape,
      path: piece.path,
      up: piece.tall ? TALL_UP : UP,
      light: piece.light,
    })),
    ...record.mines.map((piece) => ({
      shape: piece.shape,
      path: piece.path,
      up: UP,
      light: piece.light,
    })),
  ];
  const width = perRow * slotW + pad;
  const height = Math.ceil(entries.length / perRow) * slotH + pad;
  const composites: OverlayOptions[] = [];
  for (const [index, entry] of entries.entries()) {
    const ox = pad + (index % perRow) * slotW;
    const oy = pad + Math.floor(index / perRow) * slotH + TALL_UP;
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
      top: oy - entry.up,
    });
    // The lighting QA of the piece: + is lit from the left.
    composites.push({
      input: Buffer.from(
        `<svg width="${2 * CELL}" height="13"><text x="0" y="10" font-family="Helvetica" font-size="10" fill="#10210f">faces ${entry.light.faces >= 0 ? "+" : ""}${entry.light.faces.toFixed(1)}</text></svg>`,
      ),
      left: ox,
      top: oy + CELL + 1,
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
  if (RUN !== undefined)
    throw new Error(
      `MOUNTAIN_RANGES_RUN is set: only plan, generate and review work on an exploration run (${command ?? "check"} is a production command)`,
    );
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
