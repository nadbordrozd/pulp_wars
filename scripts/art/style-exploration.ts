/**
 * Art-style exploration (bead pulp_wars-73l.2). Nonproduction PixelLab study:
 * Fighter and city candidates generated natively at the exact device-pixel
 * sizes the square-grid renderer would display them at. Nothing here feeds
 * the production manifest, asset registry, art validation, or runtime.
 *
 * Commands:
 *   plan                                   list recipes and their review state
 *   generate <recipe-id...>                submit, poll and store new recipes
 *   recover <recipe-id>                    re-poll a submitted job from its receipt
 *   select <recipe-id> <n|-> <STATUS> <note>
 *                                          record the review verdict; n is the
 *                                          0-based candidate, STATUS is ACCEPTED
 *                                          or REJECTED
 *   inspect <recipe-id> <output.png> [k]   write a k-times nearest-neighbour
 *                                          contact sheet for visual review
 *
 * A leading `--manifest <path>` selects a sibling study manifest (for example
 * scripts/art/tile80-study-manifest.json, bead pulp_wars-305). Its optional
 * `studyRoot` keeps that study's records, receipts and outputs separate.
 *
 * The API key is read from PIXELLAB_API_KEY only and is never printed,
 * logged or stored. Receipts store the resolved request snapshot, never the
 * authenticated payload.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  loadSubmissionReceipt,
  resolveRecoveryRequest,
  saveSubmissionReceipt,
} from "./pixellab-recovery";

const ROOT = process.cwd();
let MANIFEST = path.join(ROOT, "scripts/art/style-exploration-manifest.json");
let STUDY_ROOT = path.join(ROOT, "art/explorations/style-study-2026-09");
/** One file per recipe so concurrent submissions never clobber each other. */
let RECORDS = path.join(STUDY_ROOT, "records");
/**
 * Study receipts stay beside the study, outside the production receipt
 * directory that the production asset tests enumerate as flat files.
 */
let SUBMISSION_ROOT = path.join(STUDY_ROOT, "submissions");
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 12 * 60_000;

type Subject = string;

/**
 * A subject is either a plain prompt (transparent sprite with the shared
 * camera, owner colour and negative prompt) or a spec that overrides them,
 * for example an opaque terrain tile with no owner colour.
 */
interface SubjectSpec {
  readonly prompt: string;
  /** Replaces the shared camera sentence. */
  readonly camera?: string;
  /** Defaults to true: append the shared owner-colour sentence. */
  readonly ownerColor?: boolean;
  /** Replaces the shared negative prompt. */
  readonly negativePrompt?: string;
  /** Defaults to true. */
  readonly noBackground?: boolean;
  /** Merged over the style options; null removes a style option. */
  readonly options?: Readonly<Record<string, string | null>>;
}
type Endpoint =
  | "generate-image-v2"
  | "create-image-pixen"
  | "create-image-pixflux"
  | "remove-background"
  | "edit-image-pixen";
type ReviewStatus = "ACCEPTED" | "REJECTED";

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Style {
  readonly id: string;
  readonly label: string;
  readonly endpoint: Endpoint;
  readonly stylePrompt: string;
  readonly negativePrompt: string;
  /** Extra endpoint options (Pixen outline/detail/view/direction). */
  readonly options?: Readonly<Record<string, string>>;
  /** Replaces stylePrompt for one subject (for example a terrain tile). */
  readonly subjectStylePrompts?: Readonly<Record<string, string>>;
}

interface Target {
  readonly id: string;
  readonly subject: Subject;
  readonly size: Size;
  readonly view: string;
}

interface Recipe {
  readonly id: string;
  readonly style: string;
  readonly subject: Subject;
  readonly target: string;
  readonly requestSize: Size;
  readonly seed: number;
  /** Appended after the shared subject prompt for an iteration. */
  readonly promptAddendum?: string;
  /** Accepted output of another recipe sent as the provider style image. */
  readonly styleReference?: string;
  /** Accepted output of another recipe sent as a subject reference image. */
  readonly subjectReference?: string;
  /** remove-background only: the provider candidate to clean up. */
  readonly sourceCandidate?: {
    readonly recipe: string;
    readonly candidate: number;
  };
  readonly notes?: string;
  /** Endpoint probe override; defaults to the style endpoint. */
  readonly endpoint?: Endpoint;
  /** edit-image-pixen only: the whole edit description sent to PixelLab. */
  readonly editInstruction?: string;
  /** Output subject name for an accepted candidate; defaults to subject. */
  readonly acceptAs?: string;
  /**
   * Opaque terrain only: on acceptance, cut the window of this size whose
   * wrap-around seams (right edge against left, bottom against top) differ
   * least. A pure crop: no pixel is resampled or repainted.
   */
  readonly seamlessCrop?: Size;
  /** Endpoint options merged over the style options; null removes one. */
  readonly options?: Readonly<Record<string, string | null>>;
}

interface Manifest {
  readonly schemaVersion: number;
  readonly provider: {
    readonly apiBaseUrl: string;
    readonly credentialEnvironmentVariable: string;
  };
  readonly camera: string;
  readonly ownerColor: string;
  readonly subjects: Readonly<Record<Subject, string | SubjectSpec>>;
  /** Repository-relative output folder; defaults to the 2026-09 study. */
  readonly studyRoot?: string;
  readonly sharedNegativePrompt: string;
  readonly targets: readonly Target[];
  readonly styles: readonly Style[];
  readonly recipes: readonly Recipe[];
}

interface RequestSnapshot {
  readonly endpoint: Endpoint;
  readonly model: Endpoint;
  readonly style: string;
  readonly subject: Subject;
  readonly target: string;
  readonly description: string;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly requestSize: Size;
  readonly seed: number;
  readonly noBackground: boolean;
  readonly options?: Readonly<Record<string, string>>;
  readonly editInstruction?: string;
  readonly styleReference?: Reference;
  readonly subjectReference?: Reference;
  readonly sourceCandidate?: {
    readonly recipe: string;
    readonly candidate: number;
    readonly sha256?: string;
  };
}

interface Reference {
  readonly id: string;
  readonly sha256?: string;
  readonly usageDescription: string;
}

interface GenerationRecord {
  readonly id: string;
  readonly jobId: string;
  readonly request: RequestSnapshot;
  readonly submittedAt: string;
  readonly completedAt?: string;
  readonly usageUsd?: number;
  readonly candidateCount?: number;
  readonly candidateSize?: Size;
  readonly rawSheet?: string;
  readonly rawSheetSha256?: string;
  readonly review?: {
    readonly status: ReviewStatus;
    readonly candidate: number | null;
    readonly note: string;
    readonly reviewedAt: string;
  };
  readonly output?: string;
  readonly outputSha256?: string;
  /** Present when the output is a seamless crop of the candidate. */
  readonly crop?: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    /** Mean absolute RGB difference across both wrap seams, 0–255. */
    readonly seamCost: number;
  };
}

interface Records {
  records: Record<string, GenerationRecord>;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function relative(file: string): string {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

async function loadManifest(): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as Manifest;
  if (manifest.studyRoot !== undefined) {
    STUDY_ROOT = path.join(ROOT, manifest.studyRoot);
    RECORDS = path.join(STUDY_ROOT, "records");
    SUBMISSION_ROOT = path.join(STUDY_ROOT, "submissions");
  }
  return manifest;
}

async function loadRecords(): Promise<Records> {
  const records: Record<string, GenerationRecord> = {};
  let files: string[] = [];
  try {
    files = await readdir(RECORDS);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const file of files.filter((name) => name.endsWith(".json")).sort()) {
    const record = JSON.parse(
      await readFile(path.join(RECORDS, file), "utf8"),
    ) as GenerationRecord;
    records[record.id] = record;
  }
  return { records };
}

async function saveRecords(
  records: Records,
  ids: readonly string[],
): Promise<void> {
  await mkdir(RECORDS, { recursive: true });
  for (const id of ids) {
    const record = records.records[id];
    if (record === undefined) continue;
    await writeFile(
      path.join(RECORDS, `${id}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
    );
  }
}

function find<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  kind: string,
): T {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`Unknown ${kind} ${id}`);
  return item;
}

function requestSnapshot(manifest: Manifest, recipe: Recipe): RequestSnapshot {
  const style = find(manifest.styles, recipe.style, "style");
  const target = manifest.targets.find(
    (candidate) =>
      candidate.id === recipe.target && candidate.subject === recipe.subject,
  );
  if (target === undefined)
    throw new Error(
      `${recipe.id}: no ${recipe.subject} target ${recipe.target}`,
    );
  const declared = manifest.subjects[recipe.subject];
  if (declared === undefined)
    throw new Error(`${recipe.id}: unknown subject ${recipe.subject}`);
  const subject: SubjectSpec =
    typeof declared === "string" ? { prompt: declared } : declared;
  const prompt = [
    style.subjectStylePrompts?.[recipe.subject] ?? style.stylePrompt,
    subject.prompt,
    subject.camera ?? manifest.camera,
    subject.ownerColor === false ? "" : manifest.ownerColor,
    recipe.promptAddendum ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const negativePrompt = `${subject.negativePrompt ?? manifest.sharedNegativePrompt}; ${style.negativePrompt}`;
  const hasOptions =
    style.options !== undefined ||
    subject.options !== undefined ||
    recipe.options !== undefined;
  const options = Object.fromEntries(
    Object.entries({
      ...style.options,
      ...subject.options,
      ...recipe.options,
    }).filter((entry): entry is [string, string] => entry[1] !== null),
  );
  return {
    endpoint: recipe.endpoint ?? style.endpoint,
    model: recipe.endpoint ?? style.endpoint,
    style: style.id,
    subject: recipe.subject,
    target: target.id,
    // PixelLab image endpoints have no negative-prompt field, so exclusions
    // are appended to the description exactly as the production client does.
    description: `${prompt} Must not include: ${negativePrompt}.`,
    prompt,
    negativePrompt,
    requestSize: recipe.requestSize,
    seed: recipe.seed,
    noBackground: subject.noBackground ?? true,
    ...(hasOptions ? { options } : {}),
    ...(recipe.editInstruction === undefined
      ? {}
      : { editInstruction: recipe.editInstruction }),
    ...(recipe.styleReference === undefined
      ? {}
      : {
          styleReference: {
            id: recipe.styleReference,
            usageDescription:
              "Same art style at a different display resolution: copy palette, outline, shading and detail level only; draw the newly described subject at the requested size.",
          },
        }),
    ...(recipe.sourceCandidate === undefined
      ? {}
      : { sourceCandidate: recipe.sourceCandidate }),
    ...(recipe.subjectReference === undefined
      ? {}
      : {
          subjectReference: {
            id: recipe.subjectReference,
            usageDescription:
              "The same unit design drawn at another display size: keep its costume, colours, proportions and pose, redrawn natively and legibly at the requested pixel size.",
          },
        }),
  };
}

async function referenceImage(
  records: Records,
  reference: Reference,
): Promise<{ reference: Reference; image: object }> {
  const source = records.records[reference.id];
  if (source?.review?.status !== "ACCEPTED" || source.output === undefined)
    throw new Error(`Reference ${reference.id} is not accepted`);
  const bytes = await readFile(path.join(ROOT, source.output));
  const metadata = await sharp(bytes).metadata();
  return {
    reference: { ...reference, sha256: sha256(bytes) },
    image: {
      image: { base64: `data:image/png;base64,${bytes.toString("base64")}` },
      size: { width: metadata.width, height: metadata.height },
      usage_description: reference.usageDescription,
    },
  };
}

interface ResolvedRequest {
  readonly request: RequestSnapshot;
  readonly sourceImage?: Buffer;
  readonly styleImage?: object;
  readonly subjectImage?: object;
}

async function resolveReferences(
  records: Records,
  request: RequestSnapshot,
): Promise<ResolvedRequest> {
  let resolved: ResolvedRequest = { request };
  if (request.sourceCandidate !== undefined) {
    const source = records.records[request.sourceCandidate.recipe];
    if (source === undefined)
      throw new Error(`Unknown source ${request.sourceCandidate.recipe}`);
    const bytes = await candidateImage(
      source,
      request.sourceCandidate.candidate,
    );
    resolved = {
      request: {
        ...request,
        sourceCandidate: { ...request.sourceCandidate, sha256: sha256(bytes) },
      },
      sourceImage: bytes,
    };
  }
  if (request.styleReference !== undefined) {
    const style = await referenceImage(records, request.styleReference);
    resolved = {
      ...resolved,
      request: { ...resolved.request, styleReference: style.reference },
      styleImage: style.image,
    };
  }
  if (request.subjectReference !== undefined) {
    const subject = await referenceImage(records, request.subjectReference);
    resolved = {
      ...resolved,
      request: { ...resolved.request, subjectReference: subject.reference },
      subjectImage: subject.image,
    };
  }
  return resolved;
}

function requestBody(resolved: ResolvedRequest): Record<string, unknown> {
  const { request } = resolved;
  if (request.endpoint === "remove-background") {
    if (resolved.sourceImage === undefined)
      throw new Error("remove-background needs a source candidate");
    return {
      image: {
        base64: `data:image/png;base64,${resolved.sourceImage.toString("base64")}`,
      },
      image_size: request.requestSize,
      background_removal_task: "remove_complex_background",
      text: request.prompt.slice(0, 500),
      seed: request.seed,
    };
  }
  if (request.endpoint === "edit-image-pixen") {
    if (
      resolved.sourceImage === undefined ||
      request.editInstruction === undefined
    )
      throw new Error("edit-image-pixen needs a source and an editInstruction");
    return {
      image: {
        base64: `data:image/png;base64,${resolved.sourceImage.toString("base64")}`,
      },
      description: request.editInstruction.slice(0, 500),
      width: request.requestSize.width,
      height: request.requestSize.height,
      seed: request.seed,
      no_background: request.noBackground,
    };
  }
  const body: Record<string, unknown> = {
    description: request.description,
    image_size: request.requestSize,
    no_background: request.noBackground,
    seed: request.seed,
    ...(request.options ?? {}),
  };
  if (resolved.styleImage !== undefined) {
    body.style_image = resolved.styleImage;
    body.style_options = {
      color_palette: true,
      outline: true,
      detail: true,
      shading: true,
    };
  }
  if (resolved.subjectImage !== undefined)
    body.reference_images = [resolved.subjectImage];
  return body;
}

function apiKey(manifest: Manifest): string {
  const key = process.env[manifest.provider.credentialEnvironmentVariable];
  if (!key)
    throw new Error(
      `${manifest.provider.credentialEnvironmentVariable} is missing from the environment`,
    );
  return key;
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

async function pollJob(
  manifest: Manifest,
  key: string,
  jobId: string,
): Promise<unknown> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await fetch(
      `${manifest.provider.apiBaseUrl}/background-jobs/${encodeURIComponent(jobId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!response.ok)
      throw new Error(`PixelLab poll returned HTTP ${response.status}`);
    const job = (await response.json()) as unknown;
    const status = property(job, "status");
    if (status === "failed") throw new Error("PixelLab background job failed");
    if (status === "completed") return job;
  }
  throw new Error(`PixelLab job timed out after ${MAX_POLL_MS / 1000} seconds`);
}

/** Store every returned candidate losslessly in one grid sheet, no padding. */
async function storeCandidates(
  recipeId: string,
  job: unknown,
): Promise<
  Pick<
    GenerationRecord,
    "candidateCount" | "candidateSize" | "rawSheet" | "rawSheetSha256"
  >
> {
  const images = collectImages(property(job, "last_response") ?? job).map(
    decode,
  );
  if (images.length === 0)
    throw new Error("Completed PixelLab job contained no image");
  const decoded = await Promise.all(
    images.map(async (bytes) => {
      const image = sharp(bytes).ensureAlpha();
      const metadata = await image.metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        png: await image.png().toBuffer(),
      };
    }),
  );
  const first = decoded[0];
  if (first === undefined) throw new Error(`${recipeId}: no candidates`);
  const { width, height } = first;
  if (decoded.some((image) => image.width !== width || image.height !== height))
    throw new Error(`${recipeId}: candidates have mixed sizes`);
  const columns = Math.ceil(Math.sqrt(decoded.length));
  const rows = Math.ceil(decoded.length / columns);
  const sheet = await sharp({
    create: {
      width: columns * width,
      height: rows * height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      decoded.map((image, index) => ({
        input: image.png,
        left: (index % columns) * width,
        top: Math.floor(index / columns) * height,
      })),
    )
    .png({ compressionLevel: 9 })
    .toBuffer();
  const file = path.join(STUDY_ROOT, "raw", `${recipeId}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, sheet);
  return {
    candidateCount: decoded.length,
    candidateSize: { width, height },
    rawSheet: relative(file),
    rawSheetSha256: sha256(sheet),
  };
}

async function generate(ids: readonly string[]): Promise<void> {
  const manifest = await loadManifest();
  const key = apiKey(manifest);
  for (const id of ids) {
    const records = await loadRecords();
    if (records.records[id] !== undefined) {
      console.log(`${id}: already submitted; use recover if incomplete`);
      continue;
    }
    const recipe = find(manifest.recipes, id, "recipe");
    const resolved = await resolveReferences(
      records,
      requestSnapshot(manifest, recipe),
    );
    const request = resolved.request;
    const response = await fetch(
      `${manifest.provider.apiBaseUrl}/${request.endpoint}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody(resolved)),
      },
    );
    if (!response.ok)
      throw new Error(
        `${id}: PixelLab POST returned HTTP ${response.status}: ${await safeError(response)}`,
      );
    const start = (await response.json()) as unknown;
    const asyncJobId = property(start, "background_job_id");
    // Pixen and Pixflux answer synchronously with the image; give those a
    // local receipt id so provenance is stored the same way.
    const synchronous = typeof asyncJobId !== "string" || asyncJobId === "";
    if (synchronous && collectImages(start).length === 0)
      throw new Error(`${id}: response contained neither a job nor an image`);
    const jobId = synchronous ? `sync-${randomUUID()}` : asyncJobId;
    await saveSubmissionReceipt(SUBMISSION_ROOT, id, jobId, request);
    records.records[id] = {
      id,
      jobId,
      request,
      submittedAt: new Date().toISOString(),
    };
    await saveRecords(records, [id]);
    console.log(`${id}: submitted job ${jobId}`);
    await complete(manifest, key, id, synchronous ? start : undefined);
  }
}

async function complete(
  manifest: Manifest,
  key: string,
  id: string,
  synchronousResult?: unknown,
): Promise<void> {
  const records = await loadRecords();
  const record = records.records[id];
  if (record === undefined) throw new Error(`${id}: never submitted`);
  if (synchronousResult === undefined && record.jobId.startsWith("sync-"))
    throw new Error(`${id}: synchronous result was not stored; resubmit`);
  const job = synchronousResult ?? (await pollJob(manifest, key, record.jobId));
  const usage = property(property(job, "usage"), "usd");
  const stored = await storeCandidates(id, job);
  records.records[id] = {
    ...record,
    ...stored,
    completedAt: new Date().toISOString(),
    ...(typeof usage === "number" ? { usageUsd: usage } : {}),
  };
  await saveRecords(records, [id]);
  console.log(
    `${id}: ${stored.candidateCount} candidates at ${stored.candidateSize?.width}x${stored.candidateSize?.height}`,
  );
}

async function recover(id: string): Promise<void> {
  const manifest = await loadManifest();
  const records = await loadRecords();
  let record = records.records[id];
  if (record === undefined) {
    // The record was lost after submission: rebuild it from the receipt.
    for (const file of await readdir(SUBMISSION_ROOT)) {
      const saved = JSON.parse(
        await readFile(path.join(SUBMISSION_ROOT, file), "utf8"),
      ) as { id: string; jobId: string; request: RequestSnapshot };
      if (saved.id === id)
        record = {
          id,
          jobId: saved.jobId,
          request: saved.request,
          submittedAt: "unknown (rebuilt from submission receipt)",
        };
    }
    if (record === undefined) throw new Error(`${id}: no receipt to recover`);
    records.records[id] = record;
    await saveRecords(records, [id]);
  }
  const receipt = await loadSubmissionReceipt<RequestSnapshot>(
    SUBMISSION_ROOT,
    record.jobId,
  );
  const current = (
    await resolveReferences(
      records,
      requestSnapshot(manifest, find(manifest.recipes, id, "recipe")),
    )
  ).request;
  resolveRecoveryRequest(id, record.jobId, current, undefined, receipt);
  await complete(manifest, apiKey(manifest), id);
}

async function candidateImage(
  record: GenerationRecord,
  index: number,
): Promise<Buffer> {
  if (record.rawSheet === undefined || record.candidateSize === undefined)
    throw new Error(`${record.id}: no candidates stored`);
  const count = record.candidateCount ?? 1;
  if (index < 0 || index >= count)
    throw new Error(`${record.id}: candidate ${index} out of range`);
  const columns = Math.ceil(Math.sqrt(count));
  const { width, height } = record.candidateSize;
  return sharp(path.join(ROOT, record.rawSheet))
    .extract({
      left: (index % columns) * width,
      top: Math.floor(index / columns) * height,
      width,
      height,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Exhaustive search for the crop whose wrap-around seams match best. */
async function bestSeamlessWindow(
  bytes: Buffer,
  size: Size,
): Promise<NonNullable<GenerationRecord["crop"]>> {
  const { data, info } = await sharp(bytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = size;
  if (w > info.width || h > info.height)
    throw new Error("seamlessCrop is larger than the candidate");
  const at = (x: number, y: number, c: number): number =>
    data[(y * info.width + x) * info.channels + c] ?? 0;
  const diff = (ax: number, ay: number, bx: number, by: number): number =>
    Math.abs(at(ax, ay, 0) - at(bx, by, 0)) +
    Math.abs(at(ax, ay, 1) - at(bx, by, 1)) +
    Math.abs(at(ax, ay, 2) - at(bx, by, 2));
  let best = { left: 0, top: 0, cost: Number.POSITIVE_INFINITY };
  for (let top = 0; top + h <= info.height; top += 1)
    for (let left = 0; left + w <= info.width; left += 1) {
      let cost = 0;
      // Tiled, the right column touches the left column and the bottom row
      // touches the top row: sum the colour step across both seams.
      for (let y = top; y < top + h; y += 1)
        cost += diff(left + w - 1, y, left, y);
      for (let x = left; x < left + w; x += 1)
        cost += diff(x, top + h - 1, x, top);
      if (cost < best.cost) best = { left, top, cost };
    }
  return {
    left: best.left,
    top: best.top,
    width: w,
    height: h,
    seamCost: Number((best.cost / (3 * (w + h))).toFixed(3)),
  };
}

async function select(
  id: string,
  candidate: string,
  status: string,
  note: string,
): Promise<void> {
  if (status !== "ACCEPTED" && status !== "REJECTED")
    throw new Error("STATUS must be ACCEPTED or REJECTED");
  if (!note) throw new Error("A review note is required");
  const records = await loadRecords();
  const record = records.records[id];
  if (record === undefined) throw new Error(`${id}: no record`);
  const index = candidate === "-" ? null : Number.parseInt(candidate, 10);
  if (status === "ACCEPTED" && index === null)
    throw new Error("An accepted verdict must name a candidate");
  let output: Pick<GenerationRecord, "output" | "outputSha256" | "crop"> = {};
  const superseded: string[] = [];
  if (status === "ACCEPTED" && index !== null) {
    const recipe = (await loadManifest()).recipes.find(
      (candidate) => candidate.id === id,
    );
    let bytes = await candidateImage(record, index);
    let crop: GenerationRecord["crop"];
    if (recipe?.seamlessCrop !== undefined) {
      crop = await bestSeamlessWindow(bytes, recipe.seamlessCrop);
      bytes = await sharp(bytes)
        .extract({
          left: crop.left,
          top: crop.top,
          width: crop.width,
          height: crop.height,
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
    }
    const file = path.join(
      STUDY_ROOT,
      "accepted",
      record.request.style,
      `${recipe?.acceptAs ?? record.request.subject}-${record.request.target}.png`,
    );
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    output = {
      output: relative(file),
      outputSha256: sha256(bytes),
      ...(crop === undefined ? {} : { crop }),
    };
    for (const other of Object.values(records.records)) {
      if (
        other.id !== id &&
        other.output === output.output &&
        other.review?.status === "ACCEPTED"
      ) {
        superseded.push(other.id);
        records.records[other.id] = {
          ...withoutOutput(other),
          review: {
            ...other.review,
            status: "REJECTED",
            note: `${other.review.note} Superseded by ${id}.`,
          },
        };
      }
    }
  }
  records.records[id] = {
    ...withoutOutput(record),
    ...output,
    review: {
      status,
      candidate: index,
      note,
      reviewedAt: new Date().toISOString(),
    },
  };
  await saveRecords(records, [id, ...superseded]);
  console.log(`${id}: ${status}${index === null ? "" : ` candidate ${index}`}`);
}

async function inspect(
  id: string,
  output: string,
  factor: number,
): Promise<void> {
  const records = await loadRecords();
  const record = records.records[id];
  if (record?.rawSheet === undefined) throw new Error(`${id}: no candidates`);
  const sheet = sharp(path.join(ROOT, record.rawSheet));
  const metadata = await sheet.metadata();
  // Checkerboard-free mid-grey backdrop shows both dark outlines and halos.
  await sharp({
    create: {
      width: metadata.width * factor,
      height: metadata.height * factor,
      channels: 4,
      background: { r: 150, g: 160, b: 150, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sheet
          .resize(metadata.width * factor, metadata.height * factor, {
            kernel: sharp.kernel.nearest,
          })
          .png()
          .toBuffer(),
      },
    ])
    .png()
    .toFile(path.resolve(output));
  console.log(`${id}: ${record.candidateCount} candidates -> ${output}`);
}

async function plan(): Promise<void> {
  const manifest = await loadManifest();
  const records = await loadRecords();
  for (const recipe of manifest.recipes) {
    const record = records.records[recipe.id];
    const state =
      record === undefined
        ? "PENDING"
        : (record.review?.status ??
          (record.rawSheet === undefined ? "SUBMITTED" : "TO-REVIEW"));
    console.log(
      `${state.padEnd(10)} ${recipe.id} (${recipe.requestSize.width}x${recipe.requestSize.height})`,
    );
  }
}

function withoutOutput(record: GenerationRecord): GenerationRecord {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => key !== "output" && key !== "outputSha256" && key !== "crop",
    ),
  ) as unknown as GenerationRecord;
}

async function main(): Promise<void> {
  let args = process.argv.slice(2);
  if (args[0] === "--manifest") {
    if (!args[1]) throw new Error("--manifest needs a path");
    MANIFEST = path.resolve(ROOT, args[1]);
    args = args.slice(2);
  }
  // Resolve the study root before any command touches records.
  await loadManifest();
  const [command, first = "", second = "", third = "", ...rest] = args;
  if (command === "plan") return plan();
  if (command === "generate" && first)
    return generate([first, second, third, ...rest].filter(Boolean));
  if (command === "recover" && first) return recover(first);
  if (command === "select" && third && rest.length > 0)
    return select(first, second, third, rest.join(" "));
  if (command === "inspect" && second)
    return inspect(first, second, Number(third || 4));
  throw new Error(
    "Usage: style-exploration.ts plan | generate <id...> | recover <id> | select <id> <n|-> <ACCEPTED|REJECTED> <note> | inspect <id> <out.png> [k]",
  );
}

main().catch((error: unknown) => {
  // Never print raw error objects: HTTP client errors can carry headers.
  console.error(
    error instanceof Error ? error.message : "Style exploration failed",
  );
  process.exitCode = 1;
});
