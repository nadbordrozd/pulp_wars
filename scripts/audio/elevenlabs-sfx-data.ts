import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The data files of the ElevenLabs sound effects (bead pulp_wars-2yc.51,
 * docs/audio/ELEVENLABS_SFX.md): the prompts, the record of every take
 * generated, and the measurements of each take. Shared by
 * `elevenlabs-sfx.ts` (generate, measure, encode, document) and its tests.
 */

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const ELEVENLABS_SFX_PROMPTS_PATH = join(
  ROOT,
  "docs/audio/elevenlabs-sfx-prompts.json",
);
export const ELEVENLABS_SFX_RECORDS_PATH = join(
  ROOT,
  "docs/audio/elevenlabs-sfx-records.json",
);
export const ELEVENLABS_SFX_MEASUREMENTS_PATH = join(
  ROOT,
  "docs/audio/elevenlabs-sfx-measurements.json",
);
export const ELEVENLABS_SFX_DOC_PATH = join(
  ROOT,
  "docs/audio/ELEVENLABS_SFX.md",
);
/** Every encoded take with its full provenance and levels (for the document). */
export const ELEVENLABS_SFX_CLIPS_PATH = join(
  ROOT,
  "docs/audio/elevenlabs-sfx-clips.json",
);
export const ELEVENLABS_SOUNDS_MANIFEST_PATH = join(
  ROOT,
  "src/audio/elevenlabs-sounds.json",
);
/**
 * Where the raw takes are kept: outside the repository. `--out` or the
 * `ELEVENLABS_SFX_RAW` environment variable moves it.
 */
export const ELEVENLABS_SFX_DEFAULT_RAW_FOLDER = join(
  tmpdir(),
  "pulp-wars-elevenlabs-sfx",
);

/**
 * How a sound is judged by measurement: each kind has its own rules for
 * the onset, the brightness and the spread of energy
 * (`ELEVENLABS_SFX_KIND_RULES` in elevenlabs-sfx.ts).
 */
export type SfxKindV1 =
  | "ui"
  | "ui-error"
  | "step"
  | "hit"
  | "pop"
  | "clang"
  | "whoosh"
  | "zap"
  | "burst"
  | "heavy"
  | "boom"
  | "bright"
  | "effect"
  | "vocal"
  | "stinger";

export type SfxSuffixV1 = "style" | "stinger" | "vocal";

/** A prompt revised after a round of measurement. */
export interface SfxRevisionV1 {
  readonly round: number;
  /** How many takes the round asks for. */
  readonly takes: number;
  readonly prompt: string;
  readonly durationSeconds?: number;
  readonly promptInfluence?: number;
  /** What failed in the round before, and what the revision changes. */
  readonly reason: string;
}

export interface SfxPromptV1 {
  readonly id: string;
  readonly kind: SfxKindV1;
  readonly suffix: SfxSuffixV1;
  /** What the sound is; the shared style suffix is added to it. */
  readonly prompt: string;
  /** The length asked of the service (0.5 to 30 s). */
  readonly durationSeconds: number;
  /** The length the trimmed sound should have, for its animation. */
  readonly minSeconds: number;
  readonly maxSeconds: number;
  readonly promptInfluence: number;
  readonly revisions?: readonly SfxRevisionV1[];
}

export interface SfxPromptsFileV1 {
  readonly bead: string;
  readonly model: string;
  /** Takes per sound in the first round. */
  readonly takes: number;
  readonly styleSuffix: string;
  readonly stingerSuffix: string;
  readonly vocalSuffix: string;
  readonly sounds: readonly SfxPromptV1[];
}

/** One generation request and what came back. */
export interface SfxTakeRecordV1 {
  readonly id: string;
  /** The candidate number the take is known by: 101, 102 and on. */
  readonly n: number;
  readonly round: number;
  readonly take: number;
  /** The whole text sent. */
  readonly prompt: string;
  readonly durationSeconds: number;
  readonly promptInfluence: number;
  readonly model: string;
  readonly outputFormat: string;
  /** The day it was generated (UTC). */
  readonly date: string;
  /** The raw file, relative to the raw folder. */
  readonly rawFile: string;
  readonly bytes: number;
  /** Cost headers the service sent, when any. */
  readonly cost?: Readonly<Record<string, string>>;
}

export interface SfxRecordsFileV1 {
  readonly bead: string;
  readonly provider: string;
  readonly endpoint: string;
  /** Account usage read before and after a run, when the key may read it. */
  readonly usage: readonly {
    readonly date: string;
    readonly note: string;
    readonly characterCount: number;
    readonly characterLimit: number;
  }[];
  readonly takes: readonly SfxTakeRecordV1[];
}

/** The first candidate number of an ElevenLabs take (stock ones are 1-4). */
export const ELEVENLABS_FIRST_CANDIDATE_V1 = 101;

export function readJsonV1<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Writes JSON through a temporary file, so a stopped run leaves no half file. */
export function writeJsonV1(path: string, value: unknown): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n");
  renameSync(temporary, path);
}

export function readPromptsV1(): SfxPromptsFileV1 {
  return JSON.parse(
    readFileSync(ELEVENLABS_SFX_PROMPTS_PATH, "utf8"),
  ) as SfxPromptsFileV1;
}

export function emptyRecordsV1(): SfxRecordsFileV1 {
  return {
    bead: "pulp_wars-2yc.51",
    provider: "ElevenLabs sound effects",
    endpoint: "POST https://api.elevenlabs.io/v1/sound-generation",
    usage: [],
    takes: [],
  };
}

export function readRecordsV1(): SfxRecordsFileV1 {
  return readJsonV1(ELEVENLABS_SFX_RECORDS_PATH, emptyRecordsV1());
}

/** The full text sent for a prompt: what it is, and the shared style. */
export function fullPromptV1(
  file: SfxPromptsFileV1,
  sound: SfxPromptV1,
  text: string = sound.prompt,
): string {
  const suffix =
    sound.suffix === "stinger"
      ? file.stingerSuffix
      : sound.suffix === "vocal"
        ? file.vocalSuffix
        : file.styleSuffix;
  return `${text} ${suffix}`;
}

/** The request of a round: the first prompt, or that round's revision. */
export interface SfxRoundRequestV1 {
  readonly round: number;
  readonly takes: number;
  readonly prompt: string;
  readonly durationSeconds: number;
  readonly promptInfluence: number;
}

export function roundRequestV1(
  file: SfxPromptsFileV1,
  sound: SfxPromptV1,
  round: number,
): SfxRoundRequestV1 | null {
  if (round === 1)
    return {
      round,
      takes: file.takes,
      prompt: fullPromptV1(file, sound),
      durationSeconds: sound.durationSeconds,
      promptInfluence: sound.promptInfluence,
    };
  const revision = sound.revisions?.find((entry) => entry.round === round);
  if (revision === undefined) return null;
  return {
    round,
    takes: revision.takes,
    prompt: fullPromptV1(file, sound, revision.prompt),
    durationSeconds: revision.durationSeconds ?? sound.durationSeconds,
    promptInfluence: revision.promptInfluence ?? sound.promptInfluence,
  };
}

/** A sound id as a file name part: "impact.hit" is "impact-hit". */
export function fileStemV1(id: string): string {
  return id.replace(/\./g, "-");
}
