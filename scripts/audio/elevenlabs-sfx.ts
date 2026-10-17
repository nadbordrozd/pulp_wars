import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  ELEVENLABS_FIRST_CANDIDATE_V1,
  ELEVENLABS_SFX_DEFAULT_RAW_FOLDER,
  ELEVENLABS_SFX_DOC_PATH,
  ELEVENLABS_SFX_MEASUREMENTS_PATH,
  ELEVENLABS_SFX_RECORDS_PATH,
  fileStemV1,
  readPromptsV1,
  readJsonV1,
  readRecordsV1,
  roundRequestV1,
  writeJsonV1,
  type SfxRecordsFileV1,
  type SfxTakeRecordV1,
} from "./elevenlabs-sfx-data";
import { renderElevenLabsSfxDocV1 } from "./elevenlabs-sfx-doc";
import { encodeElevenLabsSfxV1 } from "./elevenlabs-sfx-encode";
import { selectTakesV1, type SoundSelectionV1 } from "./elevenlabs-sfx-select";
import {
  measureTakeV1,
  type TakeMeasurementV1,
} from "./elevenlabs-sfx-measure";
import {
  downmixV1,
  encodeWav16V1,
  readWavFramesV1,
  readWavInfoV1,
  resampleV1,
} from "./wav-pcm";

/**
 * The game's sound effects from ElevenLabs (bead pulp_wars-2yc.51,
 * docs/audio/ELEVENLABS_SFX.md).
 *
 *   npm run audio:elevenlabs-sfx -- generate [--round <n>] [--only <id>] [--group <prefix>] [--out <folder>]
 *   npm run audio:elevenlabs-sfx -- import --from <folder> [--only <id>] [--out <folder>]
 *   npm run audio:elevenlabs-sfx -- measure [--only <id>] [--out <folder>]
 *   npm run audio:elevenlabs-sfx -- encode [--only <id>] [--out <folder>]
 *   npm run audio:elevenlabs-sfx -- doc
 *   npm run audio:elevenlabs-sfx -- usage
 *
 * `generate` asks the sound-generation endpoint for every take of a round
 * that is not on record yet: the first round is `takes` takes of each
 * prompt of `docs/audio/elevenlabs-sfx-prompts.json`, a later round the
 * takes of a sound's revision for that round. It is resumable: a take
 * whose record and raw file exist is skipped, so a stopped run is started
 * again with the same command. Each take is recorded at once in
 * `docs/audio/elevenlabs-sfx-records.json` (prompt, length, prompt
 * influence, model, date, the raw file and any cost header).
 *
 * The raw takes (16-bit WAV at 44.1 kHz) are kept outside the repository,
 * in `--out`, `ELEVENLABS_SFX_RAW` or the system's temporary folder. Only
 * the trimmed, loudness-matched and compressed clips of `encode` are
 * checked in.
 *
 * The key is read from the environment (`ELEVENLAB_API_KEY`) and never
 * written anywhere. Nothing here plays a sound.
 */

const API = "https://api.elevenlabs.io/v1";
/** Raw 16-bit PCM, mono, 44.1 kHz: measured without a decoder. */
const OUTPUT_FORMAT = "pcm_44100";
const SAMPLE_RATE = 44_100;
const CONCURRENCY = 3;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function apiKey(): string {
  const key = process.env.ELEVENLAB_API_KEY ?? process.env.ELEVENLABS_API_KEY;
  if (key === undefined || key.trim() === "")
    fail(
      "ELEVENLAB_API_KEY is not set: the generator reads the key from the environment only.",
    );
  return key.trim();
}

interface ArgumentsV1 {
  readonly command: string;
  readonly round: number;
  readonly only: string | undefined;
  readonly group: string | undefined;
  readonly out: string;
  /** `import`: the folder the supplied files are in. */
  readonly from: string | undefined;
}

function readArguments(args: readonly string[]): ArgumentsV1 {
  let round = 1;
  let only: string | undefined;
  let group: string | undefined;
  let from: string | undefined;
  let out = process.env.ELEVENLABS_SFX_RAW ?? ELEVENLABS_SFX_DEFAULT_RAW_FOLDER;
  const rest: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "--round") round = Number(args[(index += 1)]);
    else if (arg === "--only") only = args[(index += 1)];
    else if (arg === "--group") group = args[(index += 1)];
    else if (arg === "--out") out = args[(index += 1)] ?? out;
    else if (arg === "--from") from = args[(index += 1)];
    else if (arg.startsWith("--")) fail(`Unknown option: ${arg}`);
    else rest.push(arg);
  }
  if (!Number.isInteger(round) || round < 1) fail("--round wants 1, 2, ...");
  return { command: rest[0] ?? "", round, only, group, out, from };
}

/**
 * Brings the sound files the user handed over (a prompt's `supplied`) in
 * as takes: each is read from `--from`, mixed to mono, resampled to 44.1
 * kHz and written to the raw folder like a generated take, and recorded
 * as round 0 with the file's name, its maker and its day. The user's
 * files are only read; nothing calls the service.
 */
function importSupplied(args: ArgumentsV1): void {
  if (args.from === undefined) fail("import wants --from <folder>");
  const prompts = readPromptsV1();
  mkdirSync(args.out, { recursive: true });
  let count = 0;
  for (const sound of prompts.sounds) {
    if (args.only !== undefined && sound.id !== args.only) continue;
    for (const [index, supplied] of (sound.supplied ?? []).entries()) {
      const path = join(args.from, supplied.file);
      if (!existsSync(path)) fail(`${sound.id}: ${path} not found`);
      const info = readWavInfoV1(path);
      const mono = downmixV1(readWavFramesV1(info));
      const samples = resampleV1(mono, info.sampleRate, SAMPLE_RATE);
      const n = ELEVENLABS_FIRST_CANDIDATE_V1 + index;
      const rawFile = `${fileStemV1(sound.id)}-${n}.wav`;
      writeFileSync(
        join(args.out, rawFile),
        encodeWav16V1([samples], SAMPLE_RATE),
      );
      const record: SfxTakeRecordV1 = {
        id: sound.id,
        n,
        round: 0,
        take: index + 1,
        prompt: `${supplied.by}: ${supplied.file}`,
        durationSeconds: Math.round(info.durationSeconds * 1000) / 1000,
        promptInfluence: null,
        model: "not recorded (made by the user)",
        outputFormat: `wav ${info.sampleRate} Hz, ${info.channels} channels, ${info.bitsPerSample}-bit; mixed to mono and resampled to ${SAMPLE_RATE} Hz`,
        date: supplied.date,
        rawFile,
        bytes: statSync(path).size,
        supplied: { file: supplied.file, by: supplied.by },
      };
      const records = readRecordsV1();
      writeJsonV1(ELEVENLABS_SFX_RECORDS_PATH, {
        ...records,
        takes: [
          ...records.takes.filter(
            (take) => !(take.id === record.id && take.n === record.n),
          ),
          record,
        ].sort((a, b) => a.id.localeCompare(b.id) || a.n - b.n),
      } satisfies SfxRecordsFileV1);
      count += 1;
      console.log(
        `${sound.id} #${n}: ${supplied.file} (${info.sampleRate} Hz, ${info.channels} ch, ${info.durationSeconds.toFixed(3)} s) -> ${rawFile}`,
      );
    }
  }
  console.log(`${count} supplied files imported`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The cost headers of a response, without anything that could be a key. */
function costHeaders(headers: Headers): Record<string, string> {
  const cost: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (/key|auth|cookie/i.test(name)) return;
    if (/cost|character|credit|request-id/i.test(name)) cost[name] = value;
  });
  return cost;
}

async function usage(key: string): Promise<{
  characterCount: number;
  characterLimit: number;
} | null> {
  const response = await fetch(`${API}/user/subscription`, {
    headers: { "xi-api-key": key },
  });
  if (!response.ok) {
    console.log(
      `usage: HTTP ${response.status} (the key may not read the subscription)`,
    );
    return null;
  }
  const body = (await response.json()) as {
    character_count?: number;
    character_limit?: number;
  };
  return {
    characterCount: body.character_count ?? 0,
    characterLimit: body.character_limit ?? 0,
  };
}

async function recordUsage(key: string, note: string): Promise<void> {
  const value = await usage(key);
  if (value === null) return;
  const records = readRecordsV1();
  writeJsonV1(ELEVENLABS_SFX_RECORDS_PATH, {
    ...records,
    usage: [
      ...records.usage,
      { date: new Date().toISOString(), note, ...value },
    ],
  } satisfies SfxRecordsFileV1);
  console.log(
    `usage ${note}: ${value.characterCount} of ${value.characterLimit} credits used`,
  );
}

/** PCM 16-bit little-endian mono to samples. */
function pcmToSamples(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < samples.length; i += 1)
    samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}

interface PendingTakeV1 {
  readonly record: Omit<
    SfxTakeRecordV1,
    "bytes" | "cost" | "date" | "promptInfluence" | "supplied"
  > & { readonly promptInfluence: number };
}

async function generateTake(
  key: string,
  out: string,
  pending: PendingTakeV1,
): Promise<SfxTakeRecordV1> {
  const { record } = pending;
  const body = {
    text: record.prompt,
    duration_seconds: record.durationSeconds,
    prompt_influence: record.promptInfluence,
    loop: false,
    model_id: record.model,
  };
  let lastError = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(
      `${API}/sound-generation?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const samples = pcmToSamples(bytes);
      writeFileSync(
        join(out, record.rawFile),
        encodeWav16V1([samples], SAMPLE_RATE),
      );
      return {
        ...record,
        date: today(),
        bytes: bytes.byteLength,
        cost: costHeaders(response.headers),
      };
    }
    const text = (await response.text()).slice(0, 300);
    lastError = `HTTP ${response.status}: ${text}`;
    if (response.status !== 429 && response.status < 500) break;
    await new Promise((done) => setTimeout(done, 2000 * attempt));
  }
  throw new Error(`${record.id} take ${record.n}: ${lastError}`);
}

async function generate(args: ArgumentsV1): Promise<void> {
  const key = apiKey();
  const prompts = readPromptsV1();
  mkdirSync(args.out, { recursive: true });
  const sounds = prompts.sounds.filter(
    (sound) =>
      (args.only === undefined || sound.id === args.only) &&
      (args.group === undefined || sound.id.startsWith(`${args.group}.`)),
  );
  if (sounds.length === 0) fail("No sound matches --only/--group.");
  const known = readRecordsV1().takes;
  const pending: PendingTakeV1[] = [];
  for (const sound of sounds) {
    const request = roundRequestV1(prompts, sound, args.round);
    if (request === null) continue;
    const ofSound = known.filter((take) => take.id === sound.id);
    for (let take = 1; take <= request.takes; take += 1) {
      const done = ofSound.find(
        (entry) => entry.round === args.round && entry.take === take,
      );
      if (done !== undefined && existsSync(join(args.out, done.rawFile)))
        continue;
      // A take keeps its number when only its raw file is missing.
      const n =
        done?.n ??
        Math.max(
          ELEVENLABS_FIRST_CANDIDATE_V1 - 1,
          ...ofSound.map((entry) => entry.n),
          ...pending
            .filter((entry) => entry.record.id === sound.id)
            .map((entry) => entry.record.n),
        ) + 1;
      pending.push({
        record: {
          id: sound.id,
          n,
          round: args.round,
          take,
          prompt: request.prompt,
          durationSeconds: request.durationSeconds,
          promptInfluence: request.promptInfluence,
          model: prompts.model,
          outputFormat: OUTPUT_FORMAT,
          rawFile: `${fileStemV1(sound.id)}-${n}.wav`,
        },
      });
    }
  }
  console.log(`${pending.length} takes to generate into ${args.out}`);
  if (pending.length === 0) return;
  await recordUsage(
    key,
    `before round ${args.round} ${args.only ?? args.group ?? "all"}`,
  );
  let failures = 0;
  const queue = [...pending];
  const worker = async (): Promise<void> => {
    for (;;) {
      const next = queue.shift();
      if (next === undefined) return;
      try {
        const done = await generateTake(key, args.out, next);
        // Read and write the records per take: another take may have landed.
        const records = readRecordsV1();
        writeJsonV1(ELEVENLABS_SFX_RECORDS_PATH, {
          ...records,
          takes: [
            ...records.takes.filter(
              (take) => !(take.id === done.id && take.n === done.n),
            ),
            done,
          ].sort((a, b) => a.id.localeCompare(b.id) || a.n - b.n),
        } satisfies SfxRecordsFileV1);
        console.log(
          `${done.id} #${done.n} (round ${done.round}, take ${done.take}): ${done.bytes} bytes${
            Object.keys(done.cost ?? {}).length > 0
              ? ` ${JSON.stringify(done.cost)}`
              : ""
          }`,
        );
      } catch (error) {
        failures += 1;
        console.log(`FAILED ${String(error)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await recordUsage(
    key,
    `after round ${args.round} ${args.only ?? args.group ?? "all"}`,
  );
  console.log(
    `done: ${pending.length - failures} generated, ${failures} failed`,
  );
  if (failures > 0) process.exitCode = 1;
}

/** What `measure` writes: every take measured and judged, and the picks. */
export interface SfxMeasurementsFileV1 {
  readonly bead: string;
  readonly sounds: readonly (SoundSelectionV1 & {
    readonly kind: string;
    readonly minSeconds: number;
    readonly maxSeconds: number;
  })[];
}

function readRaw(path: string): Float32Array {
  const info = readWavInfoV1(path);
  if (info.sampleRate !== SAMPLE_RATE)
    fail(`${path}: ${info.sampleRate} Hz, expected ${SAMPLE_RATE}`);
  return downmixV1(readWavFramesV1(info));
}

function measure(args: ArgumentsV1): void {
  const prompts = readPromptsV1();
  const records = readRecordsV1();
  // Bead pulp_wars-5ti.18: with `--only` (sound ids joined by commas) only
  // those sounds are measured again; every other sound keeps its recorded
  // measurement, so a new sound can be measured without the raw takes of
  // the earlier rounds at hand.
  const onlyIds = args.only?.split(",").filter((id) => id !== "");
  const previous = readJsonV1<SfxMeasurementsFileV1>(
    ELEVENLABS_SFX_MEASUREMENTS_PATH,
    { bead: prompts.bead, sounds: [] },
  );
  const sounds: SfxMeasurementsFileV1["sounds"][number][] = [];
  const lines: string[] = [];
  let passed = 0;
  let total = 0;
  for (const sound of prompts.sounds) {
    if (onlyIds !== undefined && !onlyIds.includes(sound.id)) {
      const kept = previous.sounds.find((entry) => entry.id === sound.id);
      if (kept !== undefined) sounds.push(kept);
      continue;
    }
    const takes = records.takes
      .filter((take) => take.id === sound.id)
      .filter((take) => existsSync(join(args.out, take.rawFile)));
    if (takes.length === 0) continue;
    const measured = takes.map((take) => ({
      n: take.n,
      round: take.round,
      take: take.take,
      measured: measureTakeV1(
        readRaw(join(args.out, take.rawFile)),
        SAMPLE_RATE,
        sound,
      ) as TakeMeasurementV1,
    }));
    const selection = selectTakesV1(
      sound,
      measured,
      takes.filter((take) => take.supplied !== undefined).map((take) => take.n),
    );
    sounds.push({
      ...selection,
      kind: sound.kind,
      minSeconds: sound.minSeconds,
      maxSeconds: sound.maxSeconds,
    });
    lines.push(
      `${sound.id} [${sound.kind} ${sound.minSeconds}-${sound.maxSeconds} s] kept ${selection.kept.join(", ") || "none"} (${selection.confidence})`,
    );
    for (const take of selection.takes) {
      total += 1;
      if (take.pass) passed += 1;
      const m = take.measured;
      lines.push(
        `  #${take.n} r${take.round} ${take.pass ? "pass" : "FAIL"} score ${take.score}  raw ${m.rawSeconds}s lead ${m.leadMs}ms leadIn ${m.leadInShare} trimmed ${m.trimmedSeconds}s clip ${m.clipSeconds}s onset ${m.onsetMs}ms tail ${m.tailMs}ms past ${m.energyPastLength} peak ${m.rawPeakDbfs}dB clip% ${m.clippedShare}/${m.clippedRunShare} lufs ${m.storedLufs} crest ${m.crestDb} centroid ${m.centroidHz} bands ${m.bands.join("/")} shape ${m.shape.join(",")}` +
          (take.failures.length > 0
            ? `\n      ${take.failures.join("; ")}`
            : ""),
      );
    }
  }
  writeJsonV1(ELEVENLABS_SFX_MEASUREMENTS_PATH, {
    bead: prompts.bead,
    sounds: sounds.map((sound) => ({
      ...sound,
      takes: sound.takes.map((take) => ({
        ...take,
        measured: { ...take.measured, fingerprint: undefined },
      })),
    })),
  });
  lines.push(
    `${sounds.length} sounds, ${total} takes, ${passed} kept; ` +
      `${sounds.filter((sound) => sound.kept.length === 0).length} sounds with no passing take`,
  );
  console.log(lines.join("\n"));
}

async function main(): Promise<void> {
  const args = readArguments(process.argv.slice(2));
  if (args.command === "generate") return generate(args);
  if (args.command === "import") return importSupplied(args);
  if (args.command === "measure") return measure(args);
  if (args.command === "doc") {
    writeFileSync(ELEVENLABS_SFX_DOC_PATH, await renderElevenLabsSfxDocV1());
    console.log(`Wrote ${ELEVENLABS_SFX_DOC_PATH}`);
    return;
  }
  if (args.command === "encode") {
    console.log(encodeElevenLabsSfxV1(args.out, args.only).join("\n"));
    return;
  }
  if (args.command === "usage") {
    await recordUsage(apiKey(), "usage check");
    return;
  }
  fail(
    "Usage: tsx scripts/audio/elevenlabs-sfx.ts generate|import|measure|encode|doc|usage [--round <n>] [--only <id>] [--group <prefix>] [--from <folder>] [--out <folder>]",
  );
}

if (process.argv[1]?.endsWith("elevenlabs-sfx.ts") === true) void main();
