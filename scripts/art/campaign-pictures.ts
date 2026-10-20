/**
 * The campaign pictures (bead pulp_wars-hmyk.13, docs/art/CAMPAIGN_PICTURES.md):
 * one small opaque scene per campaign for the campaign map's plates and the
 * head of a campaign's mission list, in the spirit of the Heroes of Might
 * and Magic III campaign screen.
 *
 *   npx tsx scripts/art/campaign-pictures.ts plan
 *   npx tsx scripts/art/campaign-pictures.ts prompt <id>
 *   npx tsx scripts/art/campaign-pictures.ts generate <id>...
 *   npx tsx scripts/art/campaign-pictures.ts review <out.png> <id|file>...
 *   npx tsx scripts/art/campaign-pictures.ts bake
 *   npx tsx scripts/art/campaign-pictures.ts check
 *   npx tsx scripts/art/campaign-pictures.ts sheet <out.png>
 *
 * The chibi batch pipeline makes transparent board sprites at a class
 * canvas; a picture is an opaque scene, so it has this small pipeline with
 * the same rules: every request is a checked-in recipe
 * (scripts/art/campaign-pictures/recipes.json: endpoint, size, seed, the
 * chibi prompt fragments, the shared class text, the subject, the
 * reference images), `generate` never repeats a recorded recipe, records
 * keep the exact credential-free request, the job id and the hash of every
 * returned candidate, and raw candidates are kept losslessly under
 * art/pixellab/chibi-raw/campaign-pictures/. Only `generate` calls
 * PixelLab; the key is read from PIXELLAB_API_KEY and never printed.
 *
 * The `pictures` block of recipes.json names, per campaign, the candidate
 * that passed review. `bake` copies each one, pixel for pixel, to
 * public/assets/chibi/campaign/ and writes src/assets/campaign-pictures.json
 * (the runtime manifest's data and the derivation record). `check`, part of
 * `art:validate`, re-derives both and fails when anything differs
 * (`campaignPictureProblems`).
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { encodePng, pixelSha256, readRaster, sha256 } from "./chibi/pipeline";
import type { RgbaRaster } from "./chibi/owner-mask";
import { remapPreset, remapRaster, type RemapSpec } from "./chibi/remap";

const DIR = "scripts/art/campaign-pictures";
const RECIPES = `${DIR}/recipes.json`;
const RECORDS = `${DIR}/records.json`;
const RAW = "art/pixellab/chibi-raw/campaign-pictures";
const OUT = "public/assets/chibi/campaign";
const FRAGMENTS = "scripts/art/chibi/fragments";
export const CAMPAIGN_PICTURES_RECORD = "src/assets/campaign-pictures.json";
const API = "https://api.pixellab.ai/v2";
/** PixelLab refuses a longer description (CHIBI_PIPELINE.md). */
const MAX_DESCRIPTION = 2000;

type Endpoint = "generate-image-v2";

interface ImageReference {
  /** A checked-in file (a game sprite), or a recorded candidate. */
  readonly file?: string;
  readonly recipe?: string;
  readonly candidate?: number;
  /** What PixelLab should take from it. */
  readonly usage: string;
}

interface Recipe {
  readonly id: string;
  /** The campaign the recipe draws (CampaignIdV7). */
  readonly campaign: string;
  readonly endpoint: Endpoint;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly fragments?: readonly string[];
  /** The class text, usually "@klass" (the shared one). */
  readonly klass?: string;
  readonly subject: string;
  readonly negative?: string;
  /** Up to four subject references (`reference_images`). */
  readonly references?: readonly ImageReference[];
  /** A style image (`style_image`): an accepted picture of the set. */
  readonly styleImage?: ImageReference;
  /** The review verdict of each candidate, by index. */
  readonly review?: Readonly<Record<string, string>>;
  readonly notes?: string;
}

interface PictureSpec {
  readonly campaign: string;
  readonly recipe: string;
  readonly candidate: number;
  readonly subject: string;
  /**
   * A palette remap of the baked picture (scripts/art/chibi/remap.ts): the
   * Cult's scene follows the faction's palette 1 (bead pulp_wars-mch9.59).
   */
  readonly remap?: RemapSpec;
}

interface RecipeFile {
  readonly bead: string;
  readonly shared?: Readonly<Record<string, unknown>>;
  readonly recipes: readonly Recipe[];
  readonly pictures?: readonly PictureSpec[];
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

export interface CampaignPictureRecordV7 {
  readonly id: string;
  readonly campaign: string;
  readonly subject: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly pixelSha256: string;
  readonly source: {
    readonly recipe: string;
    readonly candidate: number;
    readonly sha256: string;
  };
  /** The palette remap the candidate went through, when it has one. */
  readonly remap?: RemapSpec;
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

/** The description: fragments, class, subject, then the negative terms. */
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
  source: ImageReference,
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
  const { text, layers } = await description(root, recipe);
  if (text.length > MAX_DESCRIPTION)
    throw new Error(
      `${recipe.id}: description is ${text.length} characters (max ${MAX_DESCRIPTION})`,
    );
  const body: Record<string, unknown> = {
    description: text,
    image_size: { width: recipe.width, height: recipe.height },
    no_background: false,
    seed: recipe.seed,
  };
  const snapshot: Record<string, unknown> = { ...body, layers };
  if ((recipe.references ?? []).length > 4)
    throw new Error(`${recipe.id}: at most four reference images`);
  if (recipe.references !== undefined && recipe.references.length > 0) {
    const images: Record<string, unknown>[] = [];
    const labels: Record<string, unknown>[] = [];
    for (const reference of recipe.references) {
      const image = await resolveImage(root, records, reference);
      const meta = await sharp(image.bytes).metadata();
      images.push({
        image: { base64: dataUrl(image.bytes) },
        size: { width: meta.width, height: meta.height },
        usage_description: reference.usage,
      });
      labels.push({ image: image.label, usage_description: reference.usage });
    }
    body.reference_images = images;
    snapshot.reference_images = labels;
  }
  if (recipe.styleImage !== undefined) {
    const style = await resolveImage(root, records, recipe.styleImage);
    const meta = await sharp(style.bytes).metadata();
    body.style_image = {
      image: { base64: dataUrl(style.bytes) },
      size: { width: meta.width, height: meta.height },
    };
    body.style_options = {
      color_palette: false,
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
    const used = (file.pictures ?? []).find(
      (picture) => picture.recipe === recipe.id,
    );
    const state =
      records[recipe.id] === undefined
        ? "PENDING"
        : used !== undefined
          ? `USED #${used.candidate}`
          : "GENERATED";
    const { text } = await description(root, recipe);
    console.log(
      `${state.padEnd(10)} ${recipe.id} (${recipe.campaign}, ${recipe.width}x${recipe.height} seed ${recipe.seed}, ${text.length} chars)`,
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
  const { text } = await description(root, recipeById(file, id));
  console.log(`${text}\n(${text.length} characters)`);
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

function label(text: string, width: number, size = 12): Buffer {
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return Buffer.from(
    `<svg width="${width}" height="${size + 8}"><text x="0" y="${size}" font-family="Helvetica" font-size="${size}" fill="#2a2018">${safe}</text></svg>`,
  );
}

/**
 * Candidates side by side: each at native size, at the phone plate's size
 * (smoothed, as the browser shows it) and enlarged 3x without smoothing.
 */
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
  const head = 22;
  let y = pad;
  let width = 600;
  const composites: OverlayOptions[] = [];
  for (const file of files) {
    const meta = await sharp(path.join(root, file)).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const phoneW = Math.round(w * 0.65);
    const phoneH = Math.round(h * 0.65);
    composites.push({
      input: label(`${path.basename(file)} (${w}x${h})`, 560),
      left: pad,
      top: y,
    });
    composites.push({ input: path.join(root, file), left: pad, top: y + head });
    composites.push({
      input: await sharp(path.join(root, file))
        .resize(phoneW, phoneH, { kernel: "lanczos3" })
        .toBuffer(),
      left: pad,
      top: y + head + h + 8,
    });
    composites.push({
      input: await sharp(path.join(root, file))
        .resize(w * 3, h * 3, { kernel: "nearest" })
        .toBuffer(),
      left: pad * 2 + w,
      top: y + head,
    });
    width = Math.max(width, pad * 3 + w * 4);
    y += head + h * 3 + pad;
  }
  await sharp({
    create: {
      width,
      height: y,
      channels: 4,
      background: { r: 246, g: 238, b: 220, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

/** Every accepted picture's master and the runtime record, derived. */
export async function deriveCampaignPictures(root: string): Promise<{
  record: { bead: string; pictures: CampaignPictureRecordV7[] };
  files: Map<string, Buffer>;
}> {
  const file = await loadRecipes(root);
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  const files = new Map<string, Buffer>();
  const pictures: CampaignPictureRecordV7[] = [];
  const seen = new Set<string>();
  for (const spec of file.pictures ?? []) {
    if (seen.has(spec.campaign))
      throw new Error(`campaign ${spec.campaign} has two pictures`);
    seen.add(spec.campaign);
    const recipe = recipeById(file, spec.recipe);
    if (recipe.campaign !== spec.campaign)
      throw new Error(
        `picture ${spec.campaign}: recipe ${recipe.id} draws ${recipe.campaign}`,
      );
    const candidate = records[spec.recipe]?.candidates[spec.candidate];
    if (candidate === undefined)
      throw new Error(
        `picture ${spec.campaign}: ${spec.recipe}#${spec.candidate} was not generated`,
      );
    const bytes = await readFile(path.join(root, candidate.file));
    if (sha256(bytes) !== candidate.sha256)
      throw new Error(`${candidate.file} changed since it was recorded`);
    const drawn = await readRaster(bytes);
    let raster: RgbaRaster = drawn;
    if (spec.remap !== undefined) {
      const palette = remapPreset(spec.remap.preset);
      if (palette === undefined)
        throw new Error(
          `picture ${spec.campaign}: unknown remap preset ${spec.remap.preset}`,
        );
      raster = remapRaster(drawn, palette, spec.remap.rules).raster;
    }
    if (raster.width !== recipe.width || raster.height !== recipe.height)
      throw new Error(
        `${candidate.file} is ${raster.width}x${raster.height}, not ${recipe.width}x${recipe.height}`,
      );
    // A picture is opaque: the plate draws no background behind it.
    for (let index = 3; index < raster.data.length; index += 4)
      if (raster.data[index] !== 255)
        throw new Error(`${candidate.file} is not opaque`);
    const id = `campaign-${spec.campaign.toLowerCase().replaceAll("_", "-")}`;
    const out = `${OUT}/${id}.png`;
    files.set(out, await encodePng(raster));
    pictures.push({
      id,
      campaign: spec.campaign,
      subject: spec.subject,
      path: out,
      width: raster.width,
      height: raster.height,
      pixelSha256: pixelSha256(raster),
      source: {
        recipe: spec.recipe,
        candidate: spec.candidate,
        sha256: candidate.sha256,
      },
      ...(spec.remap === undefined ? {} : { remap: spec.remap }),
    });
  }
  return { record: { bead: file.bead, pictures }, files };
}

/** `art:validate`: the masters and the record are what the sources derive. */
export async function campaignPictureProblems(root: string): Promise<string[]> {
  const problems: string[] = [];
  let derived;
  try {
    derived = await deriveCampaignPictures(root);
  } catch (error) {
    return [
      `campaign pictures: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  const records = await readJson<Records>(path.join(root, RECORDS), {});
  for (const record of Object.values(records))
    for (const candidate of record.candidates) {
      const bytes = await readFile(path.join(root, candidate.file)).catch(
        () => null,
      );
      if (bytes === null || sha256(bytes) !== candidate.sha256)
        problems.push(
          `campaign pictures: ${candidate.file} is missing or changed`,
        );
    }
  let recorded: string;
  try {
    recorded = await readFile(
      path.join(root, CAMPAIGN_PICTURES_RECORD),
      "utf8",
    );
  } catch {
    return [
      ...problems,
      `campaign pictures: ${CAMPAIGN_PICTURES_RECORD} is missing`,
    ];
  }
  if (JSON.stringify(JSON.parse(recorded)) !== JSON.stringify(derived.record))
    problems.push(
      `campaign pictures: ${CAMPAIGN_PICTURES_RECORD} is not what its sources derive (run the bake)`,
    );
  for (const [file, bytes] of derived.files) {
    const checkedIn = await readFile(path.join(root, file)).catch(() => null);
    if (checkedIn === null) {
      problems.push(`campaign pictures: ${file} is missing`);
      continue;
    }
    if (
      pixelSha256(await readRaster(checkedIn)) !==
      pixelSha256(await readRaster(bytes))
    )
      problems.push(`campaign pictures: ${file} is not its candidate`);
  }
  return problems;
}

async function bake(root: string): Promise<void> {
  const { record, files } = await deriveCampaignPictures(root);
  await mkdir(path.join(root, OUT), { recursive: true });
  for (const [file, bytes] of files)
    await writeFile(path.join(root, file), bytes);
  await writeFile(
    path.join(root, CAMPAIGN_PICTURES_RECORD),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  console.log(`baked ${files.size} picture(s) and ${CAMPAIGN_PICTURES_RECORD}`);
}

/**
 * The contact sheet of the accepted set: each picture at desktop plate
 * size (1x), at the phone plate's size (about 0.65x, smoothed as the
 * browser draws it), greyed as a locked plate shows it, and enlarged 3x.
 */
async function sheet(root: string, out: string): Promise<void> {
  const { record, files } = await deriveCampaignPictures(root);
  const pad = 16;
  const head = 22;
  const composites: OverlayOptions[] = [];
  let y = pad;
  let width = 0;
  for (const picture of record.pictures) {
    const bytes = files.get(picture.path);
    if (bytes === undefined) continue;
    const { width: w, height: h } = picture;
    const phoneW = Math.round(w * 0.65);
    const phoneH = Math.round(h * 0.65);
    composites.push({
      input: label(
        `${picture.campaign}: ${picture.subject} (${picture.source.recipe}#${picture.source.candidate})`,
        600,
      ),
      left: pad,
      top: y,
    });
    let x = pad;
    composites.push({ input: bytes, left: x, top: y + head });
    x += w + pad;
    composites.push({
      input: await sharp(bytes)
        .resize(phoneW, phoneH, { kernel: "lanczos3" })
        .toBuffer(),
      left: x,
      top: y + head,
    });
    composites.push({
      input: await sharp(bytes)
        .resize(phoneW, phoneH, { kernel: "lanczos3" })
        // grayscale(1) at opacity 0.55 over the plate's cream, as CSS does.
        .grayscale()
        .linear(0.55, 0.45 * 230)
        .toBuffer(),
      left: x,
      top: y + head + phoneH + 8,
    });
    x += phoneW + pad;
    composites.push({
      input: await sharp(bytes)
        .resize(w * 3, h * 3, { kernel: "nearest" })
        .toBuffer(),
      left: x,
      top: y + head,
    });
    x += w * 3 + pad;
    width = Math.max(width, x);
    y += head + h * 3 + pad;
  }
  await sharp({
    create: {
      width: Math.max(width, 600),
      height: y,
      channels: 4,
      background: { r: 246, g: 238, b: 220, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function main(): Promise<void> {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const [command, ...rest] = process.argv.slice(2);
  if (command === "plan") return plan(root);
  if (command === "prompt" && rest[0] !== undefined)
    return prompt(root, rest[0]);
  if (command === "generate") return generate(root, rest);
  if (command === "review" && rest[0] !== undefined)
    return review(root, rest[0], rest.slice(1));
  if (command === "bake") return bake(root);
  if (command === "sheet" && rest[0] !== undefined) return sheet(root, rest[0]);
  if (command === "check") {
    const problems = await campaignPictureProblems(root);
    for (const problem of problems) console.error(problem);
    if (problems.length > 0) process.exitCode = 1;
    else console.log("campaign pictures: valid");
    return;
  }
  console.log(
    "Usage: campaign-pictures.ts plan | prompt <id> | generate <id>... | review <out.png> <id|file>... | bake | check | sheet <out.png>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
