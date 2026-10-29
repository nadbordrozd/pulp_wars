/**
 * The game's favicon (bead pulp_wars-beh7): a small chibi mascot for the
 * browser tab, the bookmark list and the home screen.
 *
 *   npx tsx scripts/art/favicon.ts plan
 *   npx tsx scripts/art/favicon.ts prompt <id>
 *   npx tsx scripts/art/favicon.ts generate --raw <dir> <id>...
 *   npx tsx scripts/art/favicon.ts review <out.png> --raw <dir> <id>...
 *   npx tsx scripts/art/favicon.ts bake --raw <dir>
 *   npx tsx scripts/art/favicon.ts check
 *   npx tsx scripts/art/favicon.ts sheet <out.png> [--raw <dir>]
 *
 * Like the campaign pictures (scripts/art/campaign-pictures.ts), every
 * request is a checked-in recipe (scripts/art/favicon/recipes.json:
 * endpoint options, size, seed, the chibi prompt fragments, the class
 * text, the subject), `generate` never repeats a recorded recipe, and the
 * records (scripts/art/favicon/records.json) keep the exact credential-free
 * request, the job id and the hash of every returned candidate. Raw takes
 * are written to a folder outside the repository (`--raw`); only the takes
 * that passed review enter it, as the masters under art/favicon/, and the
 * check proves each master is its recorded candidate byte for byte. Only
 * `generate` calls PixelLab; the key is read from PIXELLAB_API_KEY and never
 * printed.
 *
 * The `favicon` block of recipes.json names the accepted takes and the
 * deterministic derivation of every served size: the 48 and 32 px tab
 * icons are generated at their size ("generate at the display size"), the
 * 16 px one is an area downscale of the 32 px take with recorded hand
 * edits, and the 180 px apple-touch icon is a whole-pixel enlargement on
 * an opaque plate. `bake` writes them under public/ (favicon.ico holds the
 * 16, 32 and 48 px images) and `check`, part of `art:validate`, derives
 * them again and fails when anything differs (`faviconProblems`).
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { encodePng, pixelSha256, readRaster, sha256 } from "./chibi/pipeline";
import type { RgbaRaster } from "./chibi/owner-mask";

const DIR = "scripts/art/favicon";
const RECIPES = `${DIR}/recipes.json`;
const RECORDS = `${DIR}/records.json`;
/** The accepted takes, the only PixelLab output that enters the repo. */
const MASTERS = "art/favicon";
const FRAGMENTS = "scripts/art/chibi/fragments";
const API = "https://api.pixellab.ai/v2";
const ENDPOINT = "create-image-pixen";
const DEFAULT_FRAGMENTS = ["style", "light-south-west"] as const;
const MAX_DESCRIPTION = 2000;

/** The served files, relative to public/ (the site's base). */
export const FAVICON_FILES = {
  ico: "favicon.ico",
  png16: "favicon-16.png",
  png32: "favicon-32.png",
  png48: "favicon-48.png",
  appleTouch: "apple-touch-icon.png",
} as const;

interface Recipe {
  readonly id: string;
  readonly concept: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly fragments?: readonly string[];
  readonly klass?: string;
  readonly subject: string;
  readonly negative?: string;
  readonly options: Readonly<Record<string, string>>;
  /** The review verdict of each candidate, by index. */
  readonly review?: Readonly<Record<string, string>>;
}

interface TakeRef {
  readonly recipe: string;
  readonly candidate: number;
}

/** A hand edit of one pixel: `#rrggbb`, `#rrggbbaa` or `transparent`. */
type PixelEdit = readonly [x: number, y: number, colour: string];

interface FaviconSpec {
  /** The 48 px take: favicon-48.png, the ICO's 48 entry, the apple icon. */
  readonly large: TakeRef;
  /** The 32 px take: favicon-32.png and the ICO's 32 entry. */
  readonly small: TakeRef;
  /** The 16 px icon: an area downscale of `small`, then hand edits. */
  readonly tiny: {
    /** Optional crop of the 32 px take before halving (x, y, size). */
    readonly crop?: readonly [x: number, y: number, size: number];
    readonly edits?: readonly PixelEdit[];
  };
  /** The apple-touch icon: `large` enlarged by a whole factor on a plate. */
  readonly appleTouch: {
    readonly size: number;
    readonly scale: number;
    readonly background: string;
  };
}

interface RecipeFile {
  readonly bead: string;
  readonly shared?: Readonly<Record<string, unknown>>;
  readonly recipes: readonly Recipe[];
  readonly favicon?: FaviconSpec;
}

interface RecordEntry {
  readonly id: string;
  readonly jobId: string;
  readonly at: string;
  readonly request: Readonly<Record<string, unknown>>;
  readonly usageUsd?: number;
  /** Candidate file names inside the raw folder, with their hashes. */
  readonly candidates: readonly { file: string; sha256: string }[];
}

type Records = Record<string, RecordEntry>;

type Raster = RgbaRaster & { readonly data: Uint8Array };

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

/** Fragments, class, subject, then the negative terms (Pixen has no field). */
async function description(
  root: string,
  file: RecipeFile,
  recipe: Recipe,
): Promise<{ text: string; layers: { source: string; text: string }[] }> {
  const layers: { source: string; text: string }[] = [];
  const negatives: string[] = [];
  for (const name of recipe.fragments ?? DEFAULT_FRAGMENTS) {
    const { text, negative } = await fragment(root, name);
    layers.push({ source: `${FRAGMENTS}/${name}.txt`, text });
    if (negative) negatives.push(negative);
  }
  const klass = recipe.klass ?? file.shared?.klass;
  if (typeof klass === "string")
    layers.push({ source: "recipes.json klass", text: klass });
  layers.push({ source: "recipes.json subject", text: recipe.subject });
  const shared = file.shared?.negative;
  if (typeof shared === "string") negatives.push(shared);
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
  body: Record<string, unknown>,
): Promise<{ jobId: string; images: Buffer[]; usageUsd?: number }> {
  const key = process.env.PIXELLAB_API_KEY;
  if (!key) throw new Error("PIXELLAB_API_KEY is missing from the environment");
  const response = await fetch(`${API}/${ENDPOINT}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${ENDPOINT}: HTTP ${response.status}: ${await safeError(response)}`,
    );
  let job = (await response.json()) as unknown;
  const asyncId = property(job, "background_job_id");
  const isAsync = typeof asyncId === "string" && asyncId !== "";
  const jobId = isAsync ? asyncId : `sync-${randomUUID()}`;
  if (isAsync) {
    const deadline = Date.now() + 12 * 60_000;
    for (;;) {
      if (Date.now() > deadline) throw new Error(`${ENDPOINT}: job timed out`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const poll = await fetch(
        `${API}/background-jobs/${encodeURIComponent(jobId)}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
      if (!poll.ok) throw new Error(`poll HTTP ${poll.status}`);
      job = (await poll.json()) as unknown;
      const status = property(job, "status");
      if (status === "failed") throw new Error(`${ENDPOINT}: job failed`);
      if (status === "completed") break;
    }
  }
  const usage = property(property(job, "usage"), "usd");
  const images = collectImages(property(job, "last_response") ?? job).map(
    decode,
  );
  if (images.length === 0) throw new Error(`${ENDPOINT}: no image returned`);
  return {
    jobId,
    images,
    ...(typeof usage === "number" ? { usageUsd: usage } : {}),
  };
}

async function plan(root: string): Promise<void> {
  const file = await loadRecipes(root);
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  const used = new Set(
    file.favicon === undefined
      ? []
      : [file.favicon.large.recipe, file.favicon.small.recipe],
  );
  for (const found of file.recipes) {
    const recipe = recipeById(file, found.id);
    const state =
      records[recipe.id] === undefined
        ? "PENDING"
        : used.has(recipe.id)
          ? "USED"
          : "GENERATED";
    const { text } = await description(root, file, recipe);
    console.log(
      `${state.padEnd(10)} ${recipe.id} (${recipe.concept}, ${recipe.width}x${recipe.height} seed ${recipe.seed}, ${text.length} chars)`,
    );
  }
  const usd = Object.values(records).reduce(
    (sum, record) => sum + (record.usageUsd ?? 0),
    0,
  );
  console.log(
    `${Object.keys(records).length} PixelLab call(s) recorded, US$${usd.toFixed(3)}`,
  );
}

async function prompt(root: string, id: string): Promise<void> {
  const file = await loadRecipes(root);
  const { text } = await description(root, file, recipeById(file, id));
  console.log(`${text}\n(${text.length} characters)`);
}

async function generate(
  root: string,
  raw: string,
  ids: readonly string[],
): Promise<void> {
  const file = await loadRecipes(root);
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  await mkdir(raw, { recursive: true });
  for (const id of ids) {
    const recipe = recipeById(file, id);
    if (records[id] !== undefined) {
      console.log(`${id}: already generated, skipped (no call)`);
      continue;
    }
    if (recipe.width % 4 !== 0 || recipe.height % 4 !== 0)
      throw new Error(`${id}: Pixen sides must be multiples of 4`);
    const { text, layers } = await description(root, file, recipe);
    if (text.length > MAX_DESCRIPTION)
      throw new Error(`${id}: description is ${text.length} characters`);
    const body: Record<string, unknown> = {
      description: text,
      image_size: { width: recipe.width, height: recipe.height },
      no_background: true,
      seed: recipe.seed,
      ...recipe.options,
    };
    console.log(
      `${id}: POST ${ENDPOINT} ${recipe.width}x${recipe.height} seed ${recipe.seed}`,
    );
    const result = await call(body);
    const candidates: { file: string; sha256: string }[] = [];
    for (const [index, bytes] of result.images.entries()) {
      const name = `${id}-${index}.png`;
      await writeFile(path.join(raw, name), bytes);
      candidates.push({ file: name, sha256: sha256(bytes) });
    }
    records[id] = {
      id,
      jobId: result.jobId,
      at: new Date().toISOString(),
      request: { endpoint: ENDPOINT, ...body, layers },
      ...(result.usageUsd === undefined ? {} : { usageUsd: result.usageUsd }),
      candidates,
    };
    await writeFile(
      path.join(root, RECORDS),
      `${JSON.stringify(records, null, 2)}\n`,
    );
    console.log(`${id}: ${candidates.length} candidate(s) saved to ${raw}`);
  }
}

// ---------------------------------------------------------------- raster

function blank(width: number, height: number): Raster {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

function parseColour(
  colour: string,
): readonly [number, number, number, number] {
  if (colour === "transparent") return [0, 0, 0, 0];
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(colour);
  if (match === null) throw new Error(`bad colour ${colour}`);
  const value = Number.parseInt(match[1] ?? "", 16);
  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
    match[2] === undefined ? 255 : Number.parseInt(match[2], 16),
  ];
}

function crop(source: Raster, x: number, y: number, size: number): Raster {
  if (x < 0 || y < 0 || x + size > source.width || y + size > source.height)
    throw new Error(`crop ${x},${y} ${size} leaves the image`);
  const out = blank(size, size);
  for (let row = 0; row < size; row += 1) {
    const from = ((y + row) * source.width + x) * 4;
    out.data.set(source.data.subarray(from, from + size * 4), row * size * 4);
  }
  return out;
}

/**
 * Halves a pixel-art raster: each 2 x 2 block becomes its alpha-weighted
 * mean colour, kept only when at least two of its four pixels are opaque
 * enough, so the outline stays a hard edge instead of a grey fringe.
 */
function halve(source: Raster): Raster {
  if (source.width % 2 !== 0 || source.height % 2 !== 0)
    throw new Error("halve needs even sides");
  const out = blank(source.width / 2, source.height / 2);
  for (let y = 0; y < out.height; y += 1)
    for (let x = 0; x < out.width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let weight = 0;
      let covered = 0;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const at = ((y * 2 + dy) * source.width + x * 2 + dx) * 4;
        const alpha = source.data[at + 3] ?? 0;
        if (alpha >= 128) covered += 1;
        r += (source.data[at] ?? 0) * alpha;
        g += (source.data[at + 1] ?? 0) * alpha;
        b += (source.data[at + 2] ?? 0) * alpha;
        weight += alpha;
      }
      if (covered < 2 || weight === 0) continue;
      const at = (y * out.width + x) * 4;
      out.data[at] = Math.round(r / weight);
      out.data[at + 1] = Math.round(g / weight);
      out.data[at + 2] = Math.round(b / weight);
      out.data[at + 3] = 255;
    }
  return out;
}

function applyEdits(source: Raster, edits: readonly PixelEdit[]): Raster {
  const out: Raster = { ...source, data: new Uint8Array(source.data) };
  for (const [x, y, colour] of edits) {
    if (x < 0 || y < 0 || x >= out.width || y >= out.height)
      throw new Error(`edit ${x},${y} leaves the image`);
    out.data.set(parseColour(colour), (y * out.width + x) * 4);
  }
  return out;
}

/** `source` enlarged `scale` times (nearest) and centred on an opaque plate. */
function plate(
  source: Raster,
  size: number,
  scale: number,
  background: string,
): Raster {
  const [br, bg, bb] = parseColour(background);
  const out = blank(size, size);
  for (let at = 0; at < out.data.length; at += 4)
    out.data.set([br, bg, bb, 255], at);
  const inner = source.width * scale;
  const offset = Math.floor((size - inner) / 2);
  if (offset < 0) throw new Error("the enlarged icon does not fit its plate");
  for (let y = 0; y < inner; y += 1)
    for (let x = 0; x < inner; x += 1) {
      const from =
        (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const alpha = (source.data[from + 3] ?? 0) / 255;
      const to = ((y + offset) * size + x + offset) * 4;
      for (let channel = 0; channel < 3; channel += 1)
        out.data[to + channel] = Math.round(
          (source.data[from + channel] ?? 0) * alpha +
            (out.data[to + channel] ?? 0) * (1 - alpha),
        );
    }
  return out;
}

/** A Windows icon holding PNG images (every current browser reads it). */
function encodeIco(images: readonly { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  for (const [index, image] of images.entries()) {
    const at = 6 + index * 16;
    header.writeUInt8(image.size >= 256 ? 0 : image.size, at);
    header.writeUInt8(image.size >= 256 ? 0 : image.size, at + 1);
    header.writeUInt8(0, at + 2);
    header.writeUInt8(0, at + 3);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(image.png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += image.png.length;
  }
  return Buffer.concat([header, ...images.map((image) => image.png)]);
}

/** The PNG images of an icon written by `encodeIco`. */
export function decodeIco(bytes: Buffer): { size: number; png: Buffer }[] {
  if (bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1)
    throw new Error("not an icon file");
  const count = bytes.readUInt16LE(4);
  const images: { size: number; png: Buffer }[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = 6 + index * 16;
    const width = bytes.readUInt8(at);
    const length = bytes.readUInt32LE(at + 8);
    const offset = bytes.readUInt32LE(at + 12);
    images.push({
      size: width === 0 ? 256 : width,
      png: bytes.subarray(offset, offset + length),
    });
  }
  return images;
}

// ---------------------------------------------------------------- derive

function masterPath(take: TakeRef): string {
  return `${MASTERS}/${take.recipe}-${take.candidate}.png`;
}

function recordedCandidate(
  records: Records,
  take: TakeRef,
): { file: string; sha256: string } {
  const candidate = records[take.recipe]?.candidates[take.candidate];
  if (candidate === undefined)
    throw new Error(`${take.recipe}#${take.candidate} was not generated`);
  return candidate;
}

export interface FaviconDerivation {
  /** Served files by path under public/, with their rasters. */
  readonly rasters: ReadonlyMap<string, Raster>;
  /** favicon.ico's images, smallest first. */
  readonly ico: readonly Raster[];
}

/** Every served favicon file, derived from the checked-in masters. */
export async function deriveFavicon(root: string): Promise<FaviconDerivation> {
  const file = await loadRecipes(root);
  const spec = file.favicon;
  if (spec === undefined) throw new Error("recipes.json has no favicon block");
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  const master = async (take: TakeRef, size: number): Promise<Raster> => {
    const recipe = recipeById(file, take.recipe);
    if (recipe.width !== size || recipe.height !== size)
      throw new Error(`${take.recipe} is not a ${size} px recipe`);
    const candidate = recordedCandidate(records, take);
    const bytes = await readFile(path.join(root, masterPath(take)));
    if (sha256(bytes) !== candidate.sha256)
      throw new Error(`${masterPath(take)} is not its recorded candidate`);
    const raster = await readRaster(bytes);
    if (raster.width !== size || raster.height !== size)
      throw new Error(`${masterPath(take)} is not ${size} x ${size}`);
    return raster;
  };
  const large = await master(spec.large, 48);
  const small = await master(spec.small, 32);
  const [cx, cy, cs] = spec.tiny.crop ?? [0, 0, 32];
  const cropped = crop(small, cx, cy, cs);
  if (cs !== 32) throw new Error("the 16 px crop must stay 32 px (halved)");
  const tiny = applyEdits(halve(cropped), spec.tiny.edits ?? []);
  const apple = plate(
    large,
    spec.appleTouch.size,
    spec.appleTouch.scale,
    spec.appleTouch.background,
  );
  const rasters = new Map<string, Raster>([
    [FAVICON_FILES.png16, tiny],
    [FAVICON_FILES.png32, small],
    [FAVICON_FILES.png48, large],
    [FAVICON_FILES.appleTouch, apple],
  ]);
  return { rasters, ico: [tiny, small, large] };
}

/** `art:validate`: the served favicon files are what the masters derive. */
export async function faviconProblems(root: string): Promise<string[]> {
  let derived: FaviconDerivation;
  try {
    derived = await deriveFavicon(root);
  } catch (error) {
    return [
      `favicon: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  const problems: string[] = [];
  for (const [file, raster] of derived.rasters) {
    const bytes = await readFile(path.join(root, "public", file)).catch(
      () => null,
    );
    if (bytes === null) {
      problems.push(`favicon: public/${file} is missing`);
      continue;
    }
    if (pixelSha256(await readRaster(bytes)) !== pixelSha256(raster))
      problems.push(`favicon: public/${file} is not what its master derives`);
  }
  const ico = await readFile(
    path.join(root, "public", FAVICON_FILES.ico),
  ).catch(() => null);
  if (ico === null)
    return [...problems, "favicon: public/favicon.ico is missing"];
  try {
    const images = decodeIco(ico);
    if (images.length !== derived.ico.length)
      problems.push("favicon: favicon.ico has the wrong number of images");
    for (const [index, raster] of derived.ico.entries()) {
      const image = images[index];
      if (
        image === undefined ||
        image.size !== raster.width ||
        pixelSha256(await readRaster(image.png)) !== pixelSha256(raster)
      )
        problems.push(
          `favicon: favicon.ico image ${index} is not its ${raster.width} px icon`,
        );
    }
  } catch (error) {
    problems.push(
      `favicon: favicon.ico: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return problems;
}

async function bake(root: string, raw: string): Promise<void> {
  const file = await loadRecipes(root);
  const spec = file.favicon;
  if (spec === undefined) throw new Error("recipes.json has no favicon block");
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  await mkdir(path.join(root, MASTERS), { recursive: true });
  for (const take of [spec.large, spec.small]) {
    const candidate = recordedCandidate(records, take);
    const bytes = await readFile(path.join(raw, candidate.file));
    if (sha256(bytes) !== candidate.sha256)
      throw new Error(`${candidate.file} changed since it was recorded`);
    await writeFile(path.join(root, masterPath(take)), bytes);
  }
  const derived = await deriveFavicon(root);
  for (const [name, raster] of derived.rasters)
    await writeFile(path.join(root, "public", name), await encodePng(raster));
  const ico = encodeIco(
    await Promise.all(
      derived.ico.map(async (raster) => ({
        size: raster.width,
        png: await encodePng(raster),
      })),
    ),
  );
  await writeFile(path.join(root, "public", FAVICON_FILES.ico), ico);
  console.log(
    `baked ${derived.rasters.size + 1} favicon file(s) under public/ from ${MASTERS}/`,
  );
}

// ---------------------------------------------------------------- sheets

/** Browser tab strips: light and dark chrome. */
const TAB_BACKGROUNDS = [
  { name: "light tab", r: 241, g: 243, b: 244 },
  { name: "dark tab", r: 53, g: 54, b: 58 },
] as const;

function label(text: string, width: number, size = 12): Buffer {
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return Buffer.from(
    `<svg width="${width}" height="${size + 8}"><text x="0" y="${size}" font-family="Helvetica" font-size="${size}" fill="#2a2018">${safe}</text></svg>`,
  );
}

async function pngOf(raster: Raster): Promise<Buffer> {
  return encodePng(raster);
}

async function enlarge(raster: Raster, scale: number): Promise<Buffer> {
  return sharp(await pngOf(raster))
    .resize(raster.width * scale, raster.height * scale, { kernel: "nearest" })
    .toBuffer();
}

/** A tab-coloured tile with `raster` at native size in its centre. */
async function onTab(
  raster: Raster,
  background: { r: number; g: number; b: number },
  pad = 6,
): Promise<Buffer> {
  return sharp({
    create: {
      width: raster.width + pad * 2,
      height: raster.height + pad * 2,
      channels: 4,
      background: {
        r: background.r,
        g: background.g,
        b: background.b,
        alpha: 1,
      },
    },
  })
    .composite([{ input: await pngOf(raster), left: pad, top: pad }])
    .png()
    .toBuffer();
}

/**
 * One row per image: native size on both tab colours, the browser's own
 * downscale to 32 and 16 px (what a 48 px take would look like if the
 * browser picked it for a smaller slot), and the image enlarged.
 */
async function rowFor(
  title: string,
  raster: Raster,
  scale: number,
): Promise<{ composites: OverlayOptions[]; width: number; height: number }> {
  const composites: OverlayOptions[] = [];
  const head = 20;
  composites.push({ input: label(title, 520), left: 0, top: 0 });
  let x = 0;
  let tallest = 0;
  const sizes = [raster.width, 32, 16].filter(
    (size, index, all) => size <= raster.width && all.indexOf(size) === index,
  );
  for (const background of TAB_BACKGROUNDS)
    for (const size of sizes) {
      const scaled =
        size === raster.width
          ? raster
          : await readRaster(
              await sharp(await pngOf(raster))
                .resize(size, size, { kernel: "lanczos3" })
                .png()
                .toBuffer(),
            );
      const tile = await onTab(scaled, background);
      composites.push({ input: tile, left: x, top: head });
      x += size + 12 + 6;
      tallest = Math.max(tallest, size + 12);
    }
  composites.push({
    input: await enlarge(raster, scale),
    left: x + 6,
    top: head,
  });
  x += 6 + raster.width * scale;
  tallest = Math.max(tallest, raster.height * scale);
  return { composites, width: x, height: head + tallest + 12 };
}

async function writeSheet(
  out: string,
  rows: readonly { title: string; raster: Raster; scale: number }[],
): Promise<void> {
  const pad = 16;
  let y = pad;
  let width = 600;
  const composites: OverlayOptions[] = [];
  for (const row of rows) {
    const built = await rowFor(row.title, row.raster, row.scale);
    for (const composite of built.composites)
      composites.push({
        ...composite,
        left: (composite.left ?? 0) + pad,
        top: (composite.top ?? 0) + y,
      });
    width = Math.max(width, built.width + pad * 2);
    y += built.height;
  }
  await sharp({
    create: {
      width,
      height: y + pad,
      channels: 4,
      background: { r: 246, g: 238, b: 220, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function review(
  root: string,
  out: string,
  raw: string,
  ids: readonly string[],
): Promise<void> {
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  const rows: { title: string; raster: Raster; scale: number }[] = [];
  for (const id of ids)
    for (const candidate of records[id]?.candidates ?? []) {
      const raster = await readRaster(
        await readFile(path.join(raw, candidate.file)),
      );
      rows.push({ title: candidate.file, raster, scale: 6 });
    }
  await writeSheet(out, rows);
}

/** The concepts (when `raw` is given) and the final icon at every size. */
async function sheet(root: string, out: string, raw?: string): Promise<void> {
  const rows: { title: string; raster: Raster; scale: number }[] = [];
  if (raw !== undefined) {
    const records = await readJson<Records>(path.join(root, RECORDS), {});
    for (const record of Object.values(records))
      for (const candidate of record.candidates) {
        const bytes = await readFile(path.join(raw, candidate.file)).catch(
          () => null,
        );
        if (bytes === null) continue;
        rows.push({
          title: `concept take ${candidate.file}`,
          raster: await readRaster(bytes),
          scale: 4,
        });
      }
  }
  const derived = await deriveFavicon(root);
  for (const [name, raster] of derived.rasters)
    rows.push({
      title: `final public/${name} (${raster.width} x ${raster.height})`,
      raster,
      scale: raster.width >= 180 ? 1 : raster.width >= 48 ? 6 : 10,
    });
  await writeSheet(out, rows);
}

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
}

async function main(): Promise<void> {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const [command, ...rest] = process.argv.slice(2);
  const raw = option(rest, "--raw");
  if (command === "plan") return plan(root);
  if (command === "prompt" && rest[0] !== undefined)
    return prompt(root, rest[0]);
  if (command === "generate" && raw !== undefined)
    return generate(root, path.resolve(raw), rest);
  if (command === "review" && rest[0] !== undefined && raw !== undefined)
    return review(root, rest[0], path.resolve(raw), rest.slice(1));
  if (command === "bake" && raw !== undefined)
    return bake(root, path.resolve(raw));
  if (command === "sheet" && rest[0] !== undefined)
    return sheet(
      root,
      rest[0],
      raw === undefined ? undefined : path.resolve(raw),
    );
  if (command === "check") {
    const problems = await faviconProblems(root);
    for (const problem of problems) console.error(problem);
    if (problems.length > 0) process.exitCode = 1;
    else console.log("favicon: valid");
    return;
  }
  console.log(
    "Usage: favicon.ts plan | prompt <id> | generate --raw <dir> <id>... | review <out.png> --raw <dir> <id>... | bake --raw <dir> | check | sheet <out.png> [--raw <dir>]",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
