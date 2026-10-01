/**
 * Chibi production pipeline I/O (bead pulp_wars-67q.2): fragment loading,
 * generation through PixelLab or a dry-run fixture provider, review verdicts,
 * master derivation, owner masks with QA and overrides, and validation for
 * `npm run art:validate`. See docs/art/CHIBI_PIPELINE.md.
 *
 * The API key is read from PIXELLAB_API_KEY only and is never printed,
 * logged or stored. Receipts store the resolved request snapshot, never the
 * authenticated payload or image bytes.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  loadSubmissionReceipt,
  saveSubmissionReceipt,
} from "../pixellab-recovery";
import {
  BATCH_ID_PATTERN,
  CHIBI_CLASS_RECIPES,
  assetOwned,
  assetPlacement,
  batchManifestProblems,
  findAsset,
  findRecipe,
  requestBody,
  requestSnapshot,
  type ChibiAssetSpec,
  type ChibiBatchManifest,
  type ChibiCamera,
  type ChibiRecipe,
  type ChibiRecipeClass,
  type ChibiRequestSnapshot,
  type Fragment,
  type FragmentLibrary,
  type Size,
} from "./batch-manifest";
import {
  OWNER_MASK_THRESHOLDS,
  extractOwnerMask,
  maskToRgba,
  ownerMaskQa,
  rgbaToMask,
  type BinaryMask,
  type MaskQaReport,
  type RgbaRaster,
} from "./owner-mask";
import {
  bestSeamlessWindow,
  candidateCell,
  cropRaster,
  groundComposite,
  offPalettePixels,
  paletteColours,
  paletteMapRaster,
  plateCheck,
  transparentPixels,
  type CropWindow,
  type PlateCheck,
} from "./raster";

export const CHIBI_API_BASE_URL = "https://api.pixellab.ai/v2";
export const CHIBI_CREDENTIAL_VARIABLE = "PIXELLAB_API_KEY";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 12 * 60_000;

export const CHIBI_PATHS = {
  fragments: "scripts/art/chibi/fragments",
  subjects: "scripts/art/chibi/subjects",
  batches: "scripts/art/chibi/batches",
  records: "scripts/art/chibi/records",
  factions: "docs/art/factions",
  raw: "art/pixellab/chibi-raw",
  submissions: "art/pixellab/submissions",
  publicRoot: "public",
  masters: "public/assets/chibi",
  reviews: "art/pixellab/reviews",
  explorations: "art/explorations",
} as const;

/**
 * Throwaway factions for exploration runs (for example the faction-layer dry
 * run): never a production faction, never under docs/art/factions.
 */
export const TEST_FACTION_PATTERN = /^TEST-[A-Z0-9-]+$/;

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Hash of the decoded pixels (size + RGBA), independent of PNG encoder
 * settings; overrides bind to it so a regenerated master voids them.
 */
export function pixelSha256(raster: RgbaRaster): string {
  return createHash("sha256")
    .update(`${raster.width}x${raster.height}:`)
    .update(raster.data)
    .digest("hex");
}

function posix(file: string): string {
  return file.replaceAll("\\", "/");
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- fragments

async function fragmentFile(
  root: string,
  name: string,
  withNegative: boolean,
): Promise<Fragment> {
  const source = posix(path.join(CHIBI_PATHS.fragments, `${name}.txt`));
  const text = (await readFile(path.join(root, source), "utf8")).trim();
  if (!withNegative) return { source, text };
  const negativeSource = posix(
    path.join(CHIBI_PATHS.fragments, `${name}.negative.txt`),
  );
  return {
    source,
    text,
    negativeSource,
    negative: (await readFile(path.join(root, negativeSource), "utf8")).trim(),
  };
}

/** The first ```text block under a `## <heading>` of a faction document. */
export function factionDocumentBlock(
  markdown: string,
  heading: string,
): string | null {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  if (start < 0) return null;
  const rest = markdown.slice(start + heading.length + 5);
  const end = rest.search(/\n## /);
  const section = end < 0 ? rest : rest.slice(0, end);
  const match = /```text\n([\s\S]*?)\n```/.exec(section);
  return match?.[1]?.trim() ?? null;
}

/**
 * Faction fragments come straight from docs/art/factions/<ID>.md, so the
 * user-approved faction document is the single source of layer 3.
 */
async function factionFragments(
  root: string,
): Promise<Record<string, Fragment>> {
  const directory = path.join(root, CHIBI_PATHS.factions);
  const result: Record<string, Fragment> = {};
  for (const file of (await readdir(directory)).sort()) {
    if (!/^[A-Z0-9_-]+\.md$/.test(file) || file === "FACTION_TEMPLATE.md")
      continue;
    if (file === "README.md") continue;
    const markdown = await readFile(path.join(directory, file), "utf8");
    const fragment = factionDocumentFragment(
      markdown,
      posix(path.join(CHIBI_PATHS.factions, file)),
    );
    if (fragment !== null) result[file.replace(/\.md$/, "")] = fragment;
  }
  return result;
}

/** Layer 3 of a faction document: its prompt and negative fragment blocks. */
export function factionDocumentFragment(
  markdown: string,
  source: string,
): Fragment | null {
  const text = factionDocumentBlock(markdown, "Prompt fragment");
  if (text === null) return null;
  const negative = factionDocumentBlock(markdown, "Negative fragment");
  return {
    source: `${source}#prompt-fragment`,
    text,
    ...(negative === null
      ? {}
      : { negativeSource: `${source}#negative-fragment`, negative }),
  };
}

export async function loadFragments(root: string): Promise<FragmentLibrary> {
  const classes = {} as Record<ChibiRecipeClass, Fragment>;
  for (const name of Object.keys(CHIBI_CLASS_RECIPES) as ChibiRecipeClass[])
    classes[name] = await fragmentFile(root, `class-${name}`, true);
  const camera = {} as Record<ChibiCamera, Fragment>;
  for (const name of [
    "three-quarter",
    "top-down",
    "portrait",
    "icon",
    "flat",
  ] as const)
    camera[name] = await fragmentFile(root, `camera-${name}`, false);
  const subjects: Record<string, Record<string, string>> = {};
  for (const file of (
    await readdir(path.join(root, CHIBI_PATHS.subjects))
  ).sort()) {
    if (!file.endsWith(".json")) continue;
    const parsed = JSON.parse(
      await readFile(path.join(root, CHIBI_PATHS.subjects, file), "utf8"),
    ) as { faction: string; subjects: Record<string, string> };
    subjects[parsed.faction] = parsed.subjects;
  }
  return {
    style: await fragmentFile(root, "style", true),
    camera,
    owner: await fragmentFile(root, "owner", false),
    classes,
    editRemoveGround: await fragmentFile(root, "edit-remove-ground", false),
    factions: await factionFragments(root),
    subjects,
  };
}

// ---------------------------------------------------------------- manifests

export function batchManifestPath(root: string, batch: string): string {
  if (!BATCH_ID_PATTERN.test(batch))
    throw new Error(`Invalid batch id ${JSON.stringify(batch)}`);
  return path.join(root, CHIBI_PATHS.batches, `batch-${batch}.json`);
}

export async function loadBatchManifest(
  root: string,
  batch: string,
): Promise<ChibiBatchManifest> {
  return JSON.parse(
    await readFile(batchManifestPath(root, batch), "utf8"),
  ) as ChibiBatchManifest;
}

export async function listBatches(root: string): Promise<string[]> {
  return (await readdir(path.join(root, CHIBI_PATHS.batches)))
    .map((file) => /^batch-([a-z0-9-]+)\.json$/.exec(file)?.[1])
    .filter((batch): batch is string => batch !== undefined)
    .sort();
}

// ---------------------------------------------------------------- records

export interface RecipeRecord {
  readonly id: string;
  readonly asset: string;
  readonly jobId: string;
  readonly request: ChibiRequestSnapshot;
  readonly submittedAt: string;
  readonly completedAt?: string;
  readonly usageUsd?: number;
  readonly candidateCount?: number;
  readonly candidateSize?: Size;
  readonly rawSheet?: string;
  readonly rawSheetSha256?: string;
  readonly fixture?: { readonly path: string; readonly provenance: string };
  /** Plate heuristic per candidate for transparent classes (a hint for review). */
  readonly plateHints?: readonly PlateCheck[];
  readonly review?: {
    readonly verdict: "ACCEPTED" | "REJECTED";
    readonly candidate: number | null;
    readonly notes: string;
    readonly reviewedAt: string;
  };
}

export interface ReviewChecks {
  /** 1:1 at zoom 1 and 0.75. */
  readonly native: boolean;
  /** x4 nearest-neighbour. */
  readonly enlarged: boolean;
  /** Owner A and owner B recolours both read. */
  readonly owners: boolean;
  /** Nothing is drawn under the piece. */
  readonly noPlate: boolean;
  /** South-east three-quarter camera (or top-down terrain). */
  readonly camera: boolean;
}

export interface MaskRecord {
  readonly path: string;
  readonly sha256: string;
  readonly source: "AUTO" | "OVERRIDE";
  readonly thresholds: typeof OWNER_MASK_THRESHOLDS;
  readonly speckleDropped?: number;
  readonly override?: {
    readonly path: string;
    readonly sha256: string;
    readonly reason: string;
    readonly waive: readonly string[];
  };
  readonly qa: MaskQaReport;
}

export interface AssetRecord {
  readonly id: string;
  readonly subject: string;
  readonly assetClass: string;
  /** MASK_REJECTED: review accepted the art but mask QA refused it. */
  readonly status: "ACCEPTED" | "MASK_REJECTED";
  readonly recipe: string;
  readonly candidate: number;
  readonly candidateSha256: string;
  readonly master: {
    readonly path: string;
    readonly sha256: string;
    readonly pixelSha256: string;
    readonly width: number;
    readonly height: number;
  };
  readonly derivation: {
    readonly kind:
      "as-is" | "seamless-crop" | "ground-composite" | "palette-map";
    readonly crop?: CropWindow;
    /** palette-map: the palette the master's colours were mapped to. */
    readonly palette?: { readonly path: string; readonly sha256: string };
    readonly ground?: {
      readonly asset: string;
      readonly sha256: string;
      /** Set when the ground tile was accepted in an earlier batch. */
      readonly batch?: string;
    };
  };
  readonly anchor: { readonly x: number; readonly y: number };
  readonly overflow: {
    readonly left: number;
    readonly right: number;
    readonly up: number;
    readonly down: number;
  };
  readonly plateCheck?: PlateCheck;
  readonly mask?: MaskRecord;
  readonly reviewChecks: ReviewChecks;
  readonly notes: string;
  readonly acceptedAt: string;
}

export interface BatchRecords {
  readonly schemaVersion: 1;
  readonly batch: string;
  readonly recipes: Record<string, RecipeRecord>;
  readonly assets: Record<string, AssetRecord>;
}

/** Where one pipeline run reads and writes. */
export interface PipelineLayout {
  readonly root: string;
  readonly records: string;
  readonly raw: string;
  readonly submissions: string;
  /** Directory of masters and masks; runtime URLs are relative to `public`. */
  readonly masters: string;
}

export function productionLayout(root: string, batch: string): PipelineLayout {
  return {
    root,
    records: path.join(root, CHIBI_PATHS.records, `batch-${batch}.json`),
    raw: path.join(root, CHIBI_PATHS.raw, `batch-${batch}`),
    submissions: path.join(root, CHIBI_PATHS.submissions),
    masters: path.join(root, CHIBI_PATHS.masters),
  };
}

export function reviewDirectory(root: string, batch: string): string {
  return path.join(root, CHIBI_PATHS.reviews, `chibi-batch-${batch}`);
}

/** Dry runs keep every output beside the batch evidence, never in production. */
export function dryRunLayout(root: string, batch: string): PipelineLayout {
  const base = path.join(reviewDirectory(root, batch), "dry-run");
  return {
    root,
    records: path.join(base, "records.json"),
    raw: path.join(base, "raw"),
    submissions: path.join(base, "submissions"),
    masters: path.join(base, "assets"),
  };
}

/**
 * Exploration runs keep their manifest (`batch.json`), throwaway faction
 * document (`faction.md`), subject texts (`subjects.json`), records,
 * receipts, raw candidates and masters together in one directory under
 * art/explorations/. Nothing there is production art or registered.
 */
export function explorationLayout(
  root: string,
  directory: string,
): PipelineLayout {
  const base = path.join(root, explorationDirectory(directory));
  return {
    root,
    records: path.join(base, "records.json"),
    raw: path.join(base, "raw"),
    submissions: path.join(base, "submissions"),
    masters: path.join(base, "assets"),
  };
}

/** The repository-relative exploration directory, or an error. */
export function explorationDirectory(directory: string): string {
  const relative = posix(path.normalize(directory)).replace(/\/$/, "");
  if (
    !relative.startsWith(`${CHIBI_PATHS.explorations}/`) ||
    relative.split("/").includes("..")
  )
    throw new Error(
      `exploration runs must live under ${CHIBI_PATHS.explorations}/, not ${directory}`,
    );
  return relative;
}

/**
 * An exploration run may try another style: a file in its own `fragments/`
 * directory replaces the production fragment of the same name for that run
 * only (`style.txt`, `owner.txt`, `camera-<name>.txt`, `class-<name>.txt`,
 * each `.negative.txt` beside its text). Records and receipts store every
 * layer's source and text, so such a request stays reproducible. Production
 * batches never read these files.
 */
async function explorationFragmentOverrides(
  root: string,
  relative: string,
  production: FragmentLibrary,
): Promise<FragmentLibrary> {
  const directory = `${relative}/fragments`;
  const read = async (name: string): Promise<string | null> => {
    const file = path.join(root, directory, name);
    return (await exists(file)) ? (await readFile(file, "utf8")).trim() : null;
  };
  const override = async (
    name: string,
    fragment: Fragment,
  ): Promise<Fragment> => {
    const text = await read(`${name}.txt`);
    const negative =
      fragment.negativeSource === undefined
        ? null
        : await read(`${name}.negative.txt`);
    return {
      ...fragment,
      ...(text === null ? {} : { source: `${directory}/${name}.txt`, text }),
      ...(negative === null
        ? {}
        : { negativeSource: `${directory}/${name}.negative.txt`, negative }),
    };
  };
  const camera = { ...production.camera };
  for (const name of Object.keys(camera) as ChibiCamera[])
    camera[name] = await override(`camera-${name}`, camera[name]);
  const classes = { ...production.classes };
  for (const name of Object.keys(classes) as ChibiRecipeClass[])
    classes[name] = await override(`class-${name}`, classes[name]);
  return {
    ...production,
    style: await override("style", production.style),
    owner: await override("owner", production.owner),
    camera,
    classes,
  };
}

/**
 * The manifest and fragment library of an exploration run: the production
 * fragments plus the run's TEST- faction and its subject texts. The faction
 * must not exist in docs/art/factions, so a test faction can never be
 * mistaken for, or shadow, a real one.
 */
export async function loadExploration(
  root: string,
  directory: string,
): Promise<{
  readonly directory: string;
  readonly manifest: ChibiBatchManifest;
  readonly fragments: FragmentLibrary;
}> {
  const relative = explorationDirectory(directory);
  const manifest = JSON.parse(
    await readFile(path.join(root, relative, "batch.json"), "utf8"),
  ) as ChibiBatchManifest;
  if (manifest.dryRun)
    throw new Error(`${relative}: exploration runs are not fixture dry runs`);
  if (!TEST_FACTION_PATTERN.test(manifest.faction))
    throw new Error(
      `${relative}: exploration faction ${JSON.stringify(manifest.faction)} must be TEST-<NAME>`,
    );
  const production = await loadFragments(root);
  if (production.factions[manifest.faction] !== undefined)
    throw new Error(
      `${relative}: faction ${manifest.faction} is a production faction`,
    );
  const factionSource = `${relative}/faction.md`;
  const fragment = factionDocumentFragment(
    await readFile(path.join(root, factionSource), "utf8"),
    factionSource,
  );
  if (fragment === null)
    throw new Error(`${factionSource} has no "Prompt fragment" text block`);
  const subjectsSource = `${relative}/subjects.json`;
  const subjects = JSON.parse(
    await readFile(path.join(root, subjectsSource), "utf8"),
  ) as { faction: string; subjects: Record<string, string> };
  if (subjects.faction !== manifest.faction)
    throw new Error(
      `${subjectsSource} is for ${subjects.faction}, not ${manifest.faction}`,
    );
  const styled = await explorationFragmentOverrides(root, relative, production);
  return {
    directory: relative,
    manifest,
    fragments: {
      ...styled,
      factions: { ...production.factions, [manifest.faction]: fragment },
      subjects: {
        ...production.subjects,
        [manifest.faction]: subjects.subjects,
      },
      subjectSources: {
        ...production.subjectSources,
        [manifest.faction]: subjectsSource,
      },
    },
  };
}

export async function loadRecords(
  layout: PipelineLayout,
  batch: string,
): Promise<BatchRecords> {
  if (!(await exists(layout.records)))
    return { schemaVersion: 1, batch, recipes: {}, assets: {} };
  return JSON.parse(await readFile(layout.records, "utf8")) as BatchRecords;
}

/**
 * Writes the records file as-is (sorted, two-space JSON). It replaces the
 * file atomically but takes no lock: pipeline steps write through
 * `updateRecords`, which merges with whatever another run wrote meanwhile.
 */
export async function saveRecords(
  layout: PipelineLayout,
  records: BatchRecords,
): Promise<void> {
  await mkdir(path.dirname(layout.records), { recursive: true });
  const sorted = {
    ...records,
    recipes: Object.fromEntries(
      Object.entries(records.recipes).sort(([a], [b]) => a.localeCompare(b)),
    ),
    assets: Object.fromEntries(
      Object.entries(records.assets).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  // Rename over the file so an unlocked reader never sees a partial write.
  const temporary = `${layout.records}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(sorted, null, 2)}\n`);
  try {
    await rename(temporary, layout.records);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

/** The lock beside a records file: `records/batch-N.json` -> `records/.batch-N.lock`. */
export function recordsLockPath(
  layout: Pick<PipelineLayout, "records">,
): string {
  return path.join(
    path.dirname(layout.records),
    `.${path.basename(layout.records, ".json")}.lock`,
  );
}

export interface RecordsLockOptions {
  /** How long to wait for another run's lock before failing (default 60 s). */
  readonly timeoutMs?: number;
  /** A lock older than this is stale whoever holds it (default 10 min). */
  readonly staleMs?: number;
}

const LOCK_TIMEOUT_MS = 60_000;
const LOCK_STALE_MS = 10 * 60_000;
const LOCK_RETRY_MS = 50;

interface LockOwner {
  readonly pid: number;
  readonly host: string;
  readonly acquiredAt: string;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Whether an existing lock may be broken: its owner is a dead process on
 * this host, or it is older than `staleMs`. Returns the text it judged, so
 * the caller only removes that exact lock.
 */
async function staleLock(
  file: string,
  staleMs: number,
): Promise<{ readonly stale: boolean; readonly text: string } | undefined> {
  let text: string;
  let age: number;
  try {
    [text, age] = await Promise.all([
      readFile(file, "utf8"),
      stat(file).then((info) => Date.now() - info.mtimeMs),
    ]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  if (age > staleMs) return { stale: true, text };
  try {
    const owner = JSON.parse(text) as LockOwner;
    return {
      stale:
        owner.host === hostname() &&
        Number.isInteger(owner.pid) &&
        !processAlive(owner.pid),
      text,
    };
  } catch {
    // Being written right now, or unreadable: wait for it to age out.
    return { stale: false, text };
  }
}

/**
 * Runs `task` holding the exclusive lock file of a records file, created
 * with O_EXCL. A lock left by a crashed run is broken when its process is
 * gone (same host) or it is older than `staleMs`; a live lock is waited
 * for up to `timeoutMs`, then the run fails naming the lock file.
 */
export async function withRecordsLock<T>(
  layout: Pick<PipelineLayout, "records">,
  task: () => Promise<T>,
  options: RecordsLockOptions = {},
): Promise<T> {
  const file = recordsLockPath(layout);
  const timeoutMs = options.timeoutMs ?? LOCK_TIMEOUT_MS;
  const staleMs = options.staleMs ?? LOCK_STALE_MS;
  await mkdir(path.dirname(file), { recursive: true });
  const owner: LockOwner = {
    pid: process.pid,
    host: hostname(),
    acquiredAt: new Date().toISOString(),
  };
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const handle = await open(file, "wx");
      try {
        await handle.writeFile(`${JSON.stringify(owner)}\n`);
      } finally {
        await handle.close();
      }
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const existing = await staleLock(file, staleMs);
    if (existing?.stale === true) {
      // Remove it only if it is still the lock judged stale.
      if ((await readFile(file, "utf8").catch(() => null)) === existing.text)
        await rm(file, { force: true });
      continue;
    }
    if (Date.now() > deadline)
      throw new Error(
        `${posix(file)} is held by another chibi pipeline run (${existing?.text.trim() ?? "unknown owner"}); wait for it to finish, or delete the lock if no run is active`,
      );
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }
  try {
    return await task();
  } finally {
    await rm(file, { force: true });
  }
}

/**
 * The one way pipeline steps write records: under the records lock, it
 * re-reads the file, lets `change` edit only its own entries in that fresh
 * copy, and writes the result. Entries written by another run since this
 * run last read the file (a verdict recorded while `generate` waited on
 * PixelLab, a recipe completed while `accept` ran) are kept. A throw from
 * `change` writes nothing.
 */
export async function updateRecords<T>(
  layout: PipelineLayout,
  batch: string,
  change: (records: BatchRecords) => Promise<T> | T,
  options?: RecordsLockOptions,
): Promise<T> {
  return withRecordsLock(
    layout,
    async () => {
      const records = await loadRecords(layout, batch);
      const result = await change(records);
      await saveRecords(layout, records);
      return result;
    },
    options,
  );
}

/** Key-order-independent JSON, to compare a stored entry with an expected one. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested: unknown) =>
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) => a.localeCompare(b)),
        )
      : nested,
  );
}

/**
 * Fails when another run changed the same entry this run is about to
 * write: the stored entry must still be the one this run started from
 * (`undefined` when it expects none). Nothing is overwritten.
 */
function assertUnchanged(
  label: string,
  stored: unknown,
  expected: unknown,
  layout: PipelineLayout,
): void {
  if (canonicalJson(stored) === canonicalJson(expected)) return;
  throw new Error(
    `${label} was changed by another chibi pipeline run while this one was in progress; nothing was overwritten. Check ${posix(path.relative(layout.root, layout.records))} and re-run.`,
  );
}

// ---------------------------------------------------------------- rasters

export async function readRaster(
  input: string | Buffer,
): Promise<RgbaRaster & { readonly data: Uint8Array }> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
}

export async function encodePng(raster: RgbaRaster): Promise<Buffer> {
  return sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

export async function readMask(file: string): Promise<BinaryMask> {
  return rgbaToMask(await readRaster(file));
}

export async function encodeMask(mask: BinaryMask): Promise<Buffer> {
  return encodePng({
    width: mask.width,
    height: mask.height,
    data: maskToRgba(mask),
  });
}

// ---------------------------------------------------------------- providers

export interface ProviderResult {
  readonly jobId: string;
  readonly images: readonly Buffer[];
  readonly usageUsd?: number;
}

export interface GenerationProvider {
  readonly kind: "PIXELLAB" | "FIXTURE";
  generate(
    recipe: ChibiRecipe,
    request: ChibiRequestSnapshot,
    sourceImage: Buffer | undefined,
    submitted: (jobId: string) => Promise<void>,
    colorImage?: Buffer,
  ): Promise<ProviderResult>;
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

function decodeImage(encoded: string): Buffer {
  const payload = encoded.includes("base64,")
    ? encoded.slice(encoded.indexOf("base64,") + 7)
    : encoded;
  return Buffer.from(payload, "base64");
}

async function safeError(response: Response): Promise<string> {
  const text = (await response.text())
    .replaceAll(/[\r\n]+/g, " ")
    .replaceAll(
      /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi,
      "[image data redacted]",
    )
    .replaceAll(
      /\b(remaining|balance|credits?|resources?)\b\s*[:=]?\s*-?\d+(?:\.\d+)?/gi,
      "$1 [numeric value redacted]",
    )
    .slice(0, 400);
  return text.replaceAll(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

/** Real PixelLab calls. Pixen and Pixflux answer synchronously; edits may poll. */
export function pixelLabProvider(): GenerationProvider {
  const key = process.env[CHIBI_CREDENTIAL_VARIABLE];
  if (!key)
    throw new Error(
      `${CHIBI_CREDENTIAL_VARIABLE} is missing from the environment`,
    );
  return {
    kind: "PIXELLAB",
    async generate(recipe, request, sourceImage, submitted, colorImage) {
      const response = await fetch(
        `${CHIBI_API_BASE_URL}/${request.endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody(request, sourceImage, colorImage)),
        },
      );
      if (!response.ok)
        throw new Error(
          `${recipe.id}: PixelLab POST returned HTTP ${response.status}: ${await safeError(response)}`,
        );
      const start = (await response.json()) as unknown;
      const asyncJobId = property(start, "background_job_id");
      const synchronous = typeof asyncJobId !== "string" || asyncJobId === "";
      if (synchronous && collectImages(start).length === 0)
        throw new Error(
          `${recipe.id}: response had neither a job nor an image`,
        );
      const jobId = synchronous ? `sync-${randomUUID()}` : asyncJobId;
      await submitted(jobId);
      let job = start;
      if (!synchronous) {
        const deadline = Date.now() + MAX_POLL_MS;
        for (;;) {
          if (Date.now() > deadline)
            throw new Error(`${recipe.id}: PixelLab job timed out`);
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          const poll = await fetch(
            `${CHIBI_API_BASE_URL}/background-jobs/${encodeURIComponent(jobId)}`,
            { headers: { Authorization: `Bearer ${key}` } },
          );
          if (!poll.ok)
            throw new Error(`PixelLab poll returned HTTP ${poll.status}`);
          job = (await poll.json()) as unknown;
          const status = property(job, "status");
          if (status === "failed")
            throw new Error(`${recipe.id}: PixelLab job failed`);
          if (status === "completed") break;
        }
      }
      const usage = property(property(job, "usage"), "usd");
      const images = collectImages(property(job, "last_response") ?? job).map(
        decodeImage,
      );
      return {
        jobId,
        images,
        ...(typeof usage === "number" ? { usageUsd: usage } : {}),
      };
    },
  };
}

/**
 * Dry-run provider: returns the checked-in fixture sheet's candidates after
 * the request body is fully built, so layering and body construction run
 * exactly as in production. It never touches the network.
 */
export function fixtureProvider(root: string): GenerationProvider {
  return {
    kind: "FIXTURE",
    async generate(recipe, request, sourceImage, submitted, colorImage) {
      const fixture = recipe.fixture;
      if (fixture === undefined)
        throw new Error(`${recipe.id}: dry-run recipe has no fixture`);
      // Build the body to prove it is well-formed; it is never sent.
      const body = requestBody(request, sourceImage, colorImage);
      if (typeof body !== "object") throw new Error("request body missing");
      const bytes = await readFile(path.join(root, fixture.path));
      if (sha256(bytes) !== fixture.sha256)
        throw new Error(`${recipe.id}: fixture ${fixture.path} changed`);
      const count = fixture.candidateCount ?? 1;
      const sheet = await readRaster(bytes);
      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      const size = {
        width: sheet.width / columns,
        height: sheet.height / rows,
      };
      if (
        size.width !== request.requestSize.width ||
        size.height !== request.requestSize.height
      )
        throw new Error(
          `${recipe.id}: fixture candidates are ${size.width}x${size.height}, request is ${request.requestSize.width}x${request.requestSize.height}`,
        );
      const images: Buffer[] = [];
      for (let index = 0; index < count; index += 1)
        images.push(
          await encodePng(
            cropRaster(sheet, {
              ...candidateCell(index, count, size),
              ...size,
            }),
          ),
        );
      const jobId = `dry-run-${recipe.id}`;
      await submitted(jobId);
      return { jobId, images };
    },
  };
}

// ---------------------------------------------------------------- context

export interface PipelineContext {
  readonly root: string;
  readonly manifest: ChibiBatchManifest;
  readonly fragments: FragmentLibrary;
  readonly layout: PipelineLayout;
  readonly provider: GenerationProvider;
  /** Injectable clock; dry runs use a fixed value so evidence is stable. */
  readonly now: () => string;
  readonly log: (line: string) => void;
}

export async function assertValidManifest(
  context: Pick<PipelineContext, "manifest" | "fragments">,
): Promise<void> {
  const problems = batchManifestProblems(
    context.manifest,
    context.fragments,
    context.manifest.batch,
  );
  if (problems.length > 0)
    throw new Error(`Invalid chibi batch manifest:\n${problems.join("\n")}`);
}

async function candidateBytes(
  context: PipelineContext,
  record: RecipeRecord,
  index: number,
): Promise<Buffer> {
  if (record.rawSheet === undefined || record.candidateSize === undefined)
    throw new Error(`${record.id}: no candidates stored`);
  const count = record.candidateCount ?? 1;
  const sheetBytes = await readFile(path.join(context.root, record.rawSheet));
  if (sha256(sheetBytes) !== record.rawSheetSha256)
    throw new Error(`${record.id}: raw candidate sheet changed`);
  const sheet = await readRaster(sheetBytes);
  return encodePng(
    cropRaster(sheet, {
      ...candidateCell(index, count, record.candidateSize),
      ...record.candidateSize,
    }),
  );
}

/** Stores every returned candidate losslessly in one grid sheet. */
async function storeCandidates(
  context: PipelineContext,
  recipeId: string,
  images: readonly Buffer[],
): Promise<
  Pick<
    RecipeRecord,
    "candidateCount" | "candidateSize" | "rawSheet" | "rawSheetSha256"
  >
> {
  if (images.length === 0)
    throw new Error(`${recipeId}: provider returned no image`);
  const rasters = await Promise.all(images.map((bytes) => readRaster(bytes)));
  const first = rasters[0];
  if (first === undefined) throw new Error(`${recipeId}: no candidates`);
  const { width, height } = first;
  if (
    rasters.some((raster) => raster.width !== width || raster.height !== height)
  )
    throw new Error(`${recipeId}: candidates have mixed sizes`);
  const columns = Math.ceil(Math.sqrt(rasters.length));
  const rows = Math.ceil(rasters.length / columns);
  const sheet = new Uint8Array(columns * width * rows * height * 4);
  rasters.forEach((raster, index) => {
    const cell = candidateCell(index, rasters.length, { width, height });
    for (let y = 0; y < height; y += 1)
      sheet.set(
        raster.data.subarray(y * width * 4, (y + 1) * width * 4),
        ((cell.top + y) * columns * width + cell.left) * 4,
      );
  });
  const bytes = await encodePng({
    width: columns * width,
    height: rows * height,
    data: sheet,
  });
  const file = path.join(context.layout.raw, `${recipeId}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return {
    candidateCount: rasters.length,
    candidateSize: { width, height },
    rawSheet: posix(path.relative(context.root, file)),
    rawSheetSha256: sha256(bytes),
  };
}

/** Submits one recipe and stores its candidates; never resubmits. */
export async function generateRecipe(
  context: PipelineContext,
  recipeId: string,
): Promise<void> {
  const recipe = findRecipe(context.manifest, recipeId);
  const records = await loadRecords(context.layout, context.manifest.batch);
  if (records.recipes[recipeId] !== undefined) {
    context.log(`${recipeId}: already generated`);
    return;
  }
  let request = requestSnapshot(context.fragments, context.manifest, recipe);
  let sourceImage: Buffer | undefined;
  if (recipe.source !== undefined) {
    const crossBatch =
      recipe.source.batch !== undefined &&
      recipe.source.batch !== context.manifest.batch;
    const sourceRecords =
      crossBatch && recipe.source.batch !== undefined
        ? await loadRecords(
            productionLayout(context.root, recipe.source.batch),
            recipe.source.batch,
          )
        : records;
    const source = sourceRecords.recipes[recipe.source.recipe];
    if (source === undefined)
      throw new Error(`${recipeId}: generate ${recipe.source.recipe} first`);
    if (
      crossBatch &&
      (source.candidateSize?.width !== recipe.requestSize.width ||
        source.candidateSize.height !== recipe.requestSize.height)
    )
      throw new Error(`${recipeId}: edit size must match its source`);
    sourceImage = await candidateBytes(
      context,
      source,
      recipe.source.candidate,
    );
    request = {
      ...request,
      source: { ...recipe.source, sha256: sha256(sourceImage) },
    };
  }
  let colorImage: Buffer | undefined;
  if (recipe.colorImage !== undefined) {
    colorImage = await readFile(
      path.join(context.root, recipe.colorImage.path),
    );
    if (sha256(colorImage) !== recipe.colorImage.sha256)
      throw new Error(
        `${recipeId}: forced palette ${recipe.colorImage.path} changed`,
      );
  }
  const submittedAt = context.now();
  // The record this run wrote at submission; completion expects it unchanged.
  let submission: RecipeRecord | undefined;
  const result = await context.provider.generate(
    recipe,
    request,
    sourceImage,
    async (jobId) => {
      // The receipt is written first, so a paid job survives a conflict below.
      await saveSubmissionReceipt(
        context.layout.submissions,
        recipeId,
        jobId,
        // Chibi requests carry no style or ground references to recover.
        request as ChibiRequestSnapshot & { readonly styleReference?: never },
      );
      const submitted: RecipeRecord = {
        id: recipeId,
        asset: recipe.asset,
        jobId,
        request,
        submittedAt,
        ...(recipe.fixture === undefined
          ? {}
          : {
              fixture: {
                path: recipe.fixture.path,
                provenance: recipe.fixture.provenance,
              },
            }),
      };
      await updateRecords(context.layout, context.manifest.batch, (fresh) => {
        assertUnchanged(
          `${recipeId} (submitted as job ${jobId}; its receipt is kept)`,
          fresh.recipes[recipeId],
          undefined,
          context.layout,
        );
        fresh.recipes[recipeId] = submitted;
      });
      submission = submitted;
      context.log(`${recipeId}: submitted job ${jobId}`);
    },
    colorImage,
  );
  if (submission === undefined) throw new Error(`${recipeId}: no submission`);
  const previous = submission;
  const stored = await storeCandidates(context, recipeId, result.images);
  const asset = findAsset(context.manifest, recipe.asset);
  const plateHints = CHIBI_CLASS_RECIPES[asset.recipeClass].noBackground
    ? await Promise.all(
        result.images.map(async (bytes) => plateCheck(await readRaster(bytes))),
      )
    : undefined;
  const completedAt = context.now();
  // Only this recipe's entry is written; verdicts and recipes recorded by
  // other runs while PixelLab worked are merged in from the file.
  await updateRecords(context.layout, context.manifest.batch, (fresh) => {
    assertUnchanged(
      `${recipeId} (job ${previous.jobId})`,
      fresh.recipes[recipeId],
      previous,
      context.layout,
    );
    fresh.recipes[recipeId] = {
      ...previous,
      ...stored,
      ...(plateHints === undefined ? {} : { plateHints }),
      completedAt,
      ...(result.usageUsd === undefined ? {} : { usageUsd: result.usageUsd }),
    };
  });
  const suspects = (plateHints ?? [])
    .map((hint, index) => (hint.suspect ? index : -1))
    .filter((index) => index >= 0);
  context.log(
    `${recipeId}: ${stored.candidateCount} candidate(s) at ${stored.candidateSize?.width}x${stored.candidateSize?.height}${suspects.length === 0 ? "" : `; plate suspected on candidate ${suspects.join(", ")}`}`,
  );
}

export async function rejectRecipe(
  context: PipelineContext,
  recipeId: string,
  notes: string,
): Promise<void> {
  if (notes.trim().length === 0) throw new Error("A review note is required");
  await updateRecords(context.layout, context.manifest.batch, (records) => {
    const record = records.recipes[recipeId];
    if (record?.rawSheet === undefined)
      throw new Error(`${recipeId}: nothing generated to review`);
    records.recipes[recipeId] = {
      ...record,
      review: {
        verdict: "REJECTED",
        candidate: null,
        notes,
        reviewedAt: context.now(),
      },
    };
  });
  context.log(`${recipeId}: REJECTED`);
}

const CLASS_DIRECTORY: Readonly<Record<string, string>> = {
  TERRAIN: "terrain",
  TALL_TERRAIN: "terrain",
  STANDARD_UNIT: "units",
  LARGE_UNIT: "units",
  GIANT_UNIT: "units",
  SETTLEMENT: "settlements",
  BUILDING: "buildings",
  RESOURCE: "resources",
  PORTRAIT: "portraits",
  ICON: "icons",
  STATUS: "status",
  EFFECT: "effects",
};

export function masterPaths(
  layout: PipelineLayout,
  asset: ChibiAssetSpec,
): { readonly master: string; readonly mask: string; readonly body: string } {
  const directory = path.join(
    layout.masters,
    CLASS_DIRECTORY[asset.assetClass] ?? "misc",
  );
  return {
    master: path.join(directory, `${asset.id}.png`),
    mask: path.join(directory, `${asset.id}.mask.png`),
    body: path.join(directory, `${asset.id}.body.png`),
  };
}

/**
 * The two layers of a ground-composite (tall terrain) master, as paths
 * relative to the repository root: the body is the accepted candidate
 * itself, saved beside the master as `<id>.body.png`, and the ground is the
 * accepted ground tile, which is terrain and so lives in the same directory.
 * The runtime draws ground, then Roads, then the body (pulp_wars-yyy).
 */
export function tallTerrainLayerPaths(
  record: Pick<AssetRecord, "master" | "derivation">,
): { readonly body: string; readonly ground: string } | null {
  const ground = record.derivation.ground;
  if (record.derivation.kind !== "ground-composite" || ground === undefined)
    return null;
  return {
    body: record.master.path.replace(/\.png$/, ".body.png"),
    ground: path.posix.join(
      path.posix.dirname(record.master.path),
      `${ground.asset}.png`,
    ),
  };
}

/**
 * Writes the body layer of every accepted ground-composite asset of a batch
 * from its recorded candidate (raw sheet crop, checked against the record's
 * candidate hash). Accepting tall terrain writes it too; this backfills
 * assets accepted before body layers existed. Returns the written paths.
 */
export async function writeTallTerrainBodies(
  context: PipelineContext,
): Promise<string[]> {
  const records = await loadRecords(context.layout, context.manifest.batch);
  const written: string[] = [];
  for (const record of Object.values(records.assets)) {
    const layers = tallTerrainLayerPaths(record);
    if (record.status !== "ACCEPTED" || layers === null) continue;
    const recipe = records.recipes[record.recipe];
    if (recipe === undefined)
      throw new Error(`${record.id}: recipe ${record.recipe} has no record`);
    const bytes = await candidateBytes(context, recipe, record.candidate);
    if (sha256(bytes) !== record.candidateSha256)
      throw new Error(`${record.id}: candidate differs from the record`);
    const file = path.join(context.root, layers.body);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    written.push(layers.body);
  }
  return written;
}

/**
 * The accepted ground tile under tall terrain: this batch's own record, or,
 * for a production batch, the same asset accepted in an earlier production
 * batch (the batch-3 Mine stands on batch 1's grass).
 */
async function acceptedGroundAsset(
  context: PipelineContext,
  records: BatchRecords,
  groundId: string,
): Promise<{ ground: AssetRecord; batch?: string } | undefined> {
  const own = records.assets[groundId];
  if (own?.status === "ACCEPTED") return { ground: own };
  const batch = context.manifest.batch;
  const production =
    !context.manifest.dryRun &&
    context.layout.records === productionLayout(context.root, batch).records;
  if (!production) return undefined;
  for (const earlier of await listBatches(context.root)) {
    if (earlier === batch || !/^[1-9][0-9]*$/.test(earlier)) continue;
    if (Number(earlier) >= Number(batch)) continue;
    const other = await loadRecords(
      productionLayout(context.root, earlier),
      earlier,
    );
    const ground = other.assets[groundId];
    if (ground?.status === "ACCEPTED") return { ground, batch: earlier };
  }
  return undefined;
}

async function deriveMaster(
  context: PipelineContext,
  records: BatchRecords,
  asset: ChibiAssetSpec,
  candidate: RgbaRaster,
): Promise<{ raster: RgbaRaster; derivation: AssetRecord["derivation"] }> {
  const kind = CHIBI_CLASS_RECIPES[asset.recipeClass].derivation;
  if (kind === "seamless-crop") {
    const region = asset.cropRegion ?? {
      left: 0,
      top: 0,
      width: candidate.width,
      height: candidate.height,
    };
    const found = bestSeamlessWindow(
      cropRaster(candidate, region),
      asset.canvas,
    );
    const crop = {
      ...found,
      left: found.left + region.left,
      top: found.top + region.top,
    };
    const raster = cropRaster(candidate, crop);
    const holes = transparentPixels(raster);
    if (holes > 0)
      throw new Error(
        `${asset.id}: terrain crop has ${holes} non-opaque pixels`,
      );
    return { raster, derivation: { kind, crop } };
  }
  if (
    candidate.width !== asset.canvas.width ||
    candidate.height !== asset.canvas.height
  )
    throw new Error(
      `${asset.id}: candidate ${candidate.width}x${candidate.height} is not the ${asset.canvas.width}x${asset.canvas.height} master`,
    );
  if (kind === "palette-map") {
    const palette = asset.palette;
    if (palette === undefined) throw new Error(`${asset.id}: no palette`);
    const bytes = await readFile(path.join(context.root, palette.path));
    if (sha256(bytes) !== palette.sha256)
      throw new Error(`${asset.id}: palette ${palette.path} changed`);
    return {
      raster: paletteMapRaster(
        candidate,
        paletteColours(await readRaster(bytes)),
      ),
      derivation: {
        kind,
        palette: { path: palette.path, sha256: palette.sha256 },
      },
    };
  }
  if (kind === "ground-composite") {
    const groundId = asset.groundAsset ?? "";
    const found = await acceptedGroundAsset(context, records, groundId);
    if (found === undefined)
      throw new Error(`${asset.id}: ground asset ${groundId} is not accepted`);
    const { ground, batch } = found;
    const bytes = await readFile(path.join(context.root, ground.master.path));
    if (sha256(bytes) !== ground.master.sha256)
      throw new Error(`${asset.id}: ground ${groundId} bytes changed`);
    return {
      raster: groundComposite(candidate, await readRaster(bytes)),
      derivation: {
        kind,
        ground: {
          asset: groundId,
          sha256: sha256(bytes),
          ...(batch === undefined ? {} : { batch }),
        },
      },
    };
  }
  return { raster: candidate, derivation: { kind } };
}

/** Automatic mask, or the checked-in override when the manifest names one. */
export async function resolveOwnerMask(
  root: string,
  asset: ChibiAssetSpec,
  master: RgbaRaster,
): Promise<{
  readonly mask: BinaryMask;
  readonly qa: MaskQaReport;
  readonly source: "AUTO" | "OVERRIDE";
  readonly speckleDropped?: number;
  readonly override?: MaskRecord["override"];
}> {
  const override = asset.maskOverride;
  if (override === undefined) {
    const { mask, speckleDropped } = extractOwnerMask(master);
    return {
      mask,
      speckleDropped,
      source: "AUTO",
      qa: ownerMaskQa(master, mask, { owned: true }),
    };
  }
  if (override.masterPixelSha256 !== pixelSha256(master))
    throw new Error(
      `${asset.id}: mask override ${override.path} was made for another master; redo the hand correction`,
    );
  const bytes = await readFile(path.join(root, override.path));
  const mask = rgbaToMask(await readRaster(bytes));
  return {
    mask,
    source: "OVERRIDE",
    override: {
      path: override.path,
      sha256: sha256(bytes),
      reason: override.reason,
      waive: override.waive ?? [],
    },
    qa: ownerMaskQa(master, mask, {
      owned: true,
      waive: override.waive ?? [],
    }),
  };
}

/**
 * Records a review verdict for one candidate, derives the DPR 1 master,
 * extracts the owner mask and runs mask QA. A mask QA failure keeps the art
 * out of the registry (status MASK_REJECTED) until the asset is regenerated
 * or a reviewed override is checked in.
 */
export async function acceptRecipe(
  context: PipelineContext,
  recipeId: string,
  candidate: number,
  notes: string,
  checks: ReviewChecks,
  /** A terrain variant cropped from this recipe's field (asset.fieldRecipe). */
  assetId?: string,
): Promise<AssetRecord> {
  if (notes.trim().length === 0) throw new Error("A review note is required");
  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0)
    throw new Error(
      `${recipeId}: every review check must pass before acceptance (${failed.join(", ")})`,
    );
  const recipe = findRecipe(context.manifest, recipeId);
  const asset = findAsset(context.manifest, assetId ?? recipe.asset);
  const sharedField = asset.id !== recipe.asset;
  if (sharedField && asset.fieldRecipe !== recipeId)
    throw new Error(
      `${asset.id}: its fieldRecipe is not ${recipeId}, so it cannot be cropped from it`,
    );
  // The lock is held from reading the records to writing them, so a verdict
  // or recipe written by another run is never lost and the master, mask and
  // records written here agree.
  const assetRecord = await updateRecords(
    context.layout,
    context.manifest.batch,
    async (records) => {
      const record = records.recipes[recipeId];
      if (record === undefined) throw new Error(`${recipeId}: not generated`);
      const candidatePng = await candidateBytes(context, record, candidate);
      const { raster, derivation } = await deriveMaster(
        context,
        records,
        asset,
        await readRaster(candidatePng),
      );
      const masterBytes = await encodePng(raster);
      const masterSha = sha256(masterBytes);
      const files = masterPaths(context.layout, asset);
      await mkdir(path.dirname(files.master), { recursive: true });
      await writeFile(files.master, masterBytes);
      // Tall terrain keeps its body (the candidate) beside the master, so the
      // runtime can draw a Road between the ground and the body.
      if (derivation.kind === "ground-composite")
        await writeFile(files.body, candidatePng);
      let mask: MaskRecord | undefined;
      if (assetOwned(asset)) {
        const resolved = await resolveOwnerMask(context.root, asset, raster);
        const maskBytes = await encodeMask(resolved.mask);
        await writeFile(files.mask, maskBytes);
        mask = {
          path: posix(path.relative(context.root, files.mask)),
          sha256: sha256(maskBytes),
          source: resolved.source,
          thresholds: OWNER_MASK_THRESHOLDS,
          ...(resolved.speckleDropped === undefined
            ? {}
            : { speckleDropped: resolved.speckleDropped }),
          ...(resolved.override === undefined
            ? {}
            : { override: resolved.override }),
          qa: resolved.qa,
        };
      }
      const placement = assetPlacement(asset);
      const transparentClass =
        CHIBI_CLASS_RECIPES[asset.recipeClass].noBackground;
      const accepted: AssetRecord = {
        id: asset.id,
        subject: asset.subject,
        assetClass: asset.assetClass,
        status: mask?.qa.status === "FAIL" ? "MASK_REJECTED" : "ACCEPTED",
        recipe: recipeId,
        candidate,
        candidateSha256: sha256(candidatePng),
        master: {
          path: posix(path.relative(context.root, files.master)),
          sha256: masterSha,
          pixelSha256: pixelSha256(raster),
          width: raster.width,
          height: raster.height,
        },
        derivation,
        anchor: placement.anchor,
        overflow: placement.overflow,
        ...(transparentClass && derivation.kind === "as-is"
          ? { plateCheck: plateCheck(raster) }
          : {}),
        ...(mask === undefined ? {} : { mask }),
        reviewChecks: checks,
        notes,
        acceptedAt: context.now(),
      };
      // Another recipe's earlier acceptance of the same asset is superseded.
      for (const other of Object.values(records.recipes))
        if (
          other.asset === asset.id &&
          other.id !== recipeId &&
          other.review?.verdict === "ACCEPTED"
        )
          records.recipes[other.id] = {
            ...other,
            review: {
              ...other.review,
              verdict: "REJECTED",
              notes: `${other.review.notes} Superseded by ${recipeId}.`,
            },
          };
      // A shared field keeps the review of the variant that owns the recipe.
      if (!sharedField || record.review?.verdict !== "ACCEPTED")
        records.recipes[recipeId] = {
          ...record,
          review: {
            verdict: "ACCEPTED",
            candidate,
            notes,
            reviewedAt: context.now(),
          },
        };
      records.assets[asset.id] = accepted;
      return accepted;
    },
  );
  const mask = assetRecord.mask;
  context.log(
    `${recipeId}: ${assetRecord.status} as ${asset.id}${mask === undefined ? "" : ` (mask ${mask.source}, coverage ${(mask.qa.coverage * 100).toFixed(1)}%, QA ${mask.qa.status}${mask.qa.failures.length === 0 ? "" : `: ${mask.qa.failures.map((issue) => issue.code).join(", ")}`})`}`,
  );
  return assetRecord;
}

/** Recomputes masks and QA for accepted assets and reports differences. */
export async function verifyAssetRecord(
  root: string,
  manifest: ChibiBatchManifest,
  record: AssetRecord,
): Promise<string[]> {
  const problems: string[] = [];
  const label = `batch ${manifest.batch} asset ${record.id}`;
  const asset = manifest.assets.find((entry) => entry.id === record.id);
  if (asset === undefined) return [`${label}: not in the batch manifest`];
  const masterFile = path.join(root, record.master.path);
  if (!(await exists(masterFile))) return [`${label}: master is missing`];
  const bytes = await readFile(masterFile);
  if (sha256(bytes) !== record.master.sha256)
    problems.push(`${label}: master bytes differ from the record`);
  const master = await readRaster(bytes);
  if (
    master.width !== asset.canvas.width ||
    master.height !== asset.canvas.height
  )
    problems.push(
      `${label}: master is not ${asset.canvas.width}x${asset.canvas.height}`,
    );
  if (assetOwned(asset)) {
    if (record.mask === undefined) return [...problems, `${label}: no mask`];
    const maskFile = path.join(root, record.mask.path);
    if (!(await exists(maskFile)))
      return [...problems, `${label}: mask missing`];
    const maskBytes = await readFile(maskFile);
    if (sha256(maskBytes) !== record.mask.sha256)
      problems.push(`${label}: mask bytes differ from the record`);
    const stored = rgbaToMask(await readRaster(maskBytes));
    const resolved = await resolveOwnerMask(root, asset, master);
    if (
      stored.width !== resolved.mask.width ||
      stored.height !== resolved.mask.height ||
      stored.bits.some((bit, index) => bit !== resolved.mask.bits[index])
    )
      problems.push(
        `${label}: stored mask differs from the deterministic ${resolved.source} mask`,
      );
    if (record.status === "ACCEPTED" && resolved.qa.status !== "PASS")
      problems.push(
        `${label}: accepted but mask QA fails: ${resolved.qa.failures.map((issue) => issue.code).join(", ")}`,
      );
  } else if (record.mask !== undefined)
    problems.push(`${label}: unowned asset has a mask`);
  if (record.status === "ACCEPTED")
    problems.push(...(await tallTerrainLayerProblems(root, record, master)));
  if (record.derivation.kind === "palette-map") {
    const palette = record.derivation.palette;
    const file = palette === undefined ? null : path.join(root, palette.path);
    if (palette === undefined || file === null || !(await exists(file)))
      problems.push(`${label}: palette is missing`);
    else {
      const paletteBytes = await readFile(file);
      if (sha256(paletteBytes) !== palette.sha256)
        problems.push(`${label}: palette ${palette.path} changed`);
      else if (
        asset.palette?.path !== palette.path ||
        asset.palette.sha256 !== palette.sha256
      )
        problems.push(`${label}: recorded palette is not the manifest's`);
      else {
        const off = offPalettePixels(
          master,
          paletteColours(await readRaster(paletteBytes)),
        );
        if (off > 0)
          problems.push(`${label}: ${off} master pixels are off the palette`);
      }
    }
  }
  return problems;
}

/**
 * A ground-composite master needs its body layer: the recorded candidate's
 * exact bytes, which composited over the recorded ground tile reproduce the
 * master pixel for pixel.
 */
async function tallTerrainLayerProblems(
  root: string,
  record: AssetRecord,
  master: RgbaRaster,
): Promise<string[]> {
  const layers = tallTerrainLayerPaths(record);
  if (layers === null) return [];
  const label = `asset ${record.id}`;
  const bodyFile = path.join(root, layers.body);
  const groundFile = path.join(root, layers.ground);
  if (!(await exists(bodyFile)))
    return [
      `${label}: body layer ${layers.body} is missing (npm run art:chibi -- bodies --batch N)`,
    ];
  if (!(await exists(groundFile)))
    return [`${label}: ground layer ${layers.ground} is missing`];
  const bodyBytes = await readFile(bodyFile);
  const groundBytes = await readFile(groundFile);
  const problems: string[] = [];
  if (sha256(bodyBytes) !== record.candidateSha256)
    problems.push(`${label}: body layer is not the accepted candidate`);
  if (sha256(groundBytes) !== record.derivation.ground?.sha256)
    problems.push(`${label}: ground layer differs from the recorded ground`);
  const body = await readRaster(bodyBytes);
  if (body.width !== master.width || body.height !== master.height)
    problems.push(`${label}: body layer is not the master's size`);
  else if (
    pixelSha256(groundComposite(body, await readRaster(groundBytes))) !==
    pixelSha256(master)
  )
    problems.push(`${label}: body over ground does not reproduce the master`);
  return problems;
}

/** A TEST- faction under docs/art/factions is a mistake: it is not real. */
export function productionFactionProblems(
  factions: readonly string[],
): string[] {
  return factions
    .filter((faction) => TEST_FACTION_PATTERN.test(faction))
    .map(
      (faction) =>
        `docs/art/factions/${faction}.md: TEST- factions belong in an exploration run under art/explorations/`,
    );
}

/** Static checks run by `npm run art:validate`. */
export async function validateChibiProduction(root: string): Promise<string[]> {
  const problems: string[] = [];
  const fragments = await loadFragments(root);
  if (fragments.factions.ORIGINAL === undefined)
    problems.push("docs/art/factions/ORIGINAL.md has no prompt fragment");
  problems.push(...productionFactionProblems(Object.keys(fragments.factions)));
  for (const batch of await listBatches(root)) {
    const manifest = await loadBatchManifest(root, batch);
    const manifestProblems = batchManifestProblems(manifest, fragments, batch);
    problems.push(...manifestProblems);
    if (manifestProblems.length > 0) continue;
    for (const recipe of manifest.recipes) {
      try {
        requestSnapshot(fragments, manifest, recipe);
      } catch (error) {
        problems.push(
          `batch ${batch} recipe ${recipe.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (recipe.colorImage !== undefined) {
        const file = path.join(root, recipe.colorImage.path);
        if (!(await exists(file)))
          problems.push(
            `batch ${batch} palette ${recipe.colorImage.path} is missing`,
          );
        else if (sha256(await readFile(file)) !== recipe.colorImage.sha256)
          problems.push(
            `batch ${batch} palette ${recipe.colorImage.path} changed`,
          );
      }
      if (recipe.fixture !== undefined) {
        const file = path.join(root, recipe.fixture.path);
        if (!(await exists(file)))
          problems.push(
            `batch ${batch} fixture ${recipe.fixture.path} is missing`,
          );
        else if (sha256(await readFile(file)) !== recipe.fixture.sha256)
          problems.push(
            `batch ${batch} fixture ${recipe.fixture.path} changed`,
          );
      }
    }
    for (const asset of manifest.assets) {
      if (
        asset.maskOverride !== undefined &&
        !(await exists(path.join(root, asset.maskOverride.path)))
      )
        problems.push(
          `batch ${batch} asset ${asset.id}: override ${asset.maskOverride.path} is missing`,
        );
      if (asset.palette !== undefined) {
        const file = path.join(root, asset.palette.path);
        if (!(await exists(file)))
          problems.push(
            `batch ${batch} asset ${asset.id}: palette ${asset.palette.path} is missing`,
          );
        else if (sha256(await readFile(file)) !== asset.palette.sha256)
          problems.push(
            `batch ${batch} asset ${asset.id}: palette ${asset.palette.path} changed`,
          );
      }
    }
    if (manifest.dryRun) continue;
    const layout = productionLayout(root, batch);
    const records = await loadRecords(layout, batch);
    for (const record of Object.values(records.recipes)) {
      const receipt = await loadSubmissionReceipt<{
        readonly styleReference?: never;
      }>(layout.submissions, record.jobId);
      if (receipt?.id !== record.id)
        problems.push(
          `batch ${batch} recipe ${record.id}: submission receipt is missing`,
        );
      if (record.rawSheet !== undefined) {
        const file = path.join(root, record.rawSheet);
        if (!(await exists(file)))
          problems.push(
            `batch ${batch} recipe ${record.id}: raw sheet missing`,
          );
        else if (sha256(await readFile(file)) !== record.rawSheetSha256)
          problems.push(
            `batch ${batch} recipe ${record.id}: raw sheet changed`,
          );
      }
    }
    for (const record of Object.values(records.assets))
      problems.push(...(await verifyAssetRecord(root, manifest, record)));
  }
  return problems;
}

/** The source line a batch bead adds to src/assets/chibi-art-manifest.ts. */
export function registryEntry(
  asset: ChibiAssetSpec,
  record: AssetRecord,
): string {
  const url = (file: string): string =>
    `chibiArtUrl(${JSON.stringify(posix(path.relative(CHIBI_PATHS.publicRoot, file)))})`;
  const layers = tallTerrainLayerPaths(record);
  const fields = [
    `id: ${JSON.stringify(asset.id)}`,
    `subject: ${JSON.stringify(asset.subject)}`,
    `assetClass: ${JSON.stringify(asset.assetClass)}`,
    `width: ${record.master.width}`,
    `height: ${record.master.height}`,
    `url: ${url(record.master.path)}`,
    ...(asset.anchor === undefined
      ? []
      : [`anchor: { x: ${asset.anchor.x}, y: ${asset.anchor.y} }`]),
    ...(record.mask === undefined
      ? []
      : [`ownerMaskUrl: ${url(record.mask.path)}`]),
    ...(layers === null
      ? []
      : [
          `layers: { bodyUrl: ${url(layers.body)}, groundUrl: ${url(layers.ground)} }`,
        ]),
  ];
  return `  { ${fields.join(", ")} },`;
}
