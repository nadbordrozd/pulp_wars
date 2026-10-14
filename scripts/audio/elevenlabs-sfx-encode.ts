import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { soundRecipeV1, type SoundIdV1 } from "../../src/audio/sound-manifest";
import {
  STOCK_SOUND_OUTPUT_V1,
  stockSoundCandidateV1,
  stockSoundV1,
} from "../../src/audio/stock-sounds";
import { renderSynthRecipeV1 } from "../../src/audio/synth";
import { clearMp4Times } from "./cut-stock-sounds";
import {
  ELEVENLABS_SFX_MEASUREMENTS_PATH,
  ELEVENLABS_SFX_CLIPS_PATH,
  ELEVENLABS_SOUNDS_MANIFEST_PATH,
  ROOT,
  fileStemV1,
  readJsonV1,
  readPromptsV1,
  readRecordsV1,
  writeJsonV1,
} from "./elevenlabs-sfx-data";
import {
  STORED_PEAK,
  cutClipV1,
  db,
  measureTakeV1,
  momentaryLufsV1,
} from "./elevenlabs-sfx-measure";
import { takeNoteV1 } from "./elevenlabs-sfx-select";
import {
  downmixV1,
  encodeWav16V1,
  readWavFramesV1,
  readWavInfoV1,
} from "./wav-pcm";

/**
 * Encodes the chosen ElevenLabs takes into the game's clips (bead
 * pulp_wars-2yc.51, docs/audio/ELEVENLABS_SFX.md "How a take becomes a
 * clip"), by the path the stock clips took: the take is trimmed to the
 * sound (from its attack, cut at the sound's longest length with a fade),
 * scaled to the common peak of 0.708, encoded as AAC-LC at 96 kbit/s with
 * `afconvert` and its timestamps zeroed, so the same take always gives
 * the same bytes. Its level (`gain`) is set so that it plays as loud as
 * the sound's previous default (the stock clip at its level, or the
 * synthesised sound), measured as the loudness of the loudest 400 ms.
 *
 * It writes `src/audio/elevenlabs-sounds.json`, the provenance manifest
 * of the takes the game can play, and removes ElevenLabs clips the
 * manifest no longer lists. Needs the raw takes and macOS.
 */

const AFCONVERT = "/usr/bin/afconvert";
const SAMPLE_RATE = 44_100;
/** A take plays at most this level, and at least this. */
const MAX_GAIN = 1;
const MIN_GAIN = 0.05;

export interface ElevenLabsTakeManifestV1 {
  readonly n: number;
  readonly file: string;
  /** The day the take was generated. */
  readonly generated: string;
  readonly round: number;
  readonly take: number;
  readonly model: string;
  readonly prompt: string;
  readonly durationSeconds: number;
  readonly promptInfluence: number;
  /** The stretch of the raw take that was kept. */
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly gain: number;
  /** Measured loudness of the clip as stored (LUFS, loudest 400 ms). */
  readonly lufs: number;
  readonly note: string;
  /** False for a take offered only because none passed (not the default). */
  readonly passed: boolean;
}

export interface ElevenLabsSoundManifestV1 {
  readonly id: string;
  /** The take the game plays; null when none passed (the old default stays). */
  readonly default: number | null;
  readonly confidence: "high" | "medium" | "low";
  readonly why: string;
  /** What the previous default was, and the level the takes were matched to. */
  readonly reference: {
    readonly source: string;
    readonly lufs: number;
  };
  readonly takes: readonly ElevenLabsTakeManifestV1[];
}

export interface ElevenLabsManifestV1 {
  readonly provider: string;
  readonly provenance: string;
  readonly bead: string;
  readonly output: typeof STOCK_SOUND_OUTPUT_V1;
  readonly sounds: readonly ElevenLabsSoundManifestV1[];
}

interface MeasuredSelectionV1 {
  readonly id: string;
  readonly kept: readonly number[];
  readonly offered: readonly number[];
  readonly confidence: "high" | "medium" | "low";
  readonly why: string;
}

function decode(file: string, work: string): Float32Array {
  const wav = join(work, `${basename(file)}.wav`);
  execFileSync(AFCONVERT, ["-f", "WAVE", "-d", "LEI16", file, wav]);
  return downmixV1(readWavFramesV1(readWavInfoV1(wav)));
}

/** The loudness the sound was played at before: its default's, at its level. */
function referenceOf(
  id: string,
  work: string,
): { readonly source: string; readonly lufs: number } {
  const stock = stockSoundV1(id);
  const clip =
    stock === null || stock.default === 0
      ? null
      : stockSoundCandidateV1(id, stock.default);
  if (clip !== null) {
    const samples = decode(
      join(ROOT, STOCK_SOUND_OUTPUT_V1.folder, clip.file),
      work,
    );
    return {
      source: `stock recording #${clip.n} (${clip.file}) at level ${clip.gain}`,
      lufs:
        Math.round(
          (momentaryLufsV1(samples, SAMPLE_RATE) + db(clip.gain)) * 10,
        ) / 10,
    };
  }
  const recipe = soundRecipeV1(id as SoundIdV1);
  if (recipe === null) throw new Error(`${id} has no synthesised sound`);
  return {
    source: "the synthesised sound",
    lufs:
      Math.round(
        momentaryLufsV1(renderSynthRecipeV1(recipe, SAMPLE_RATE), SAMPLE_RATE) *
          10,
      ) / 10,
  };
}

/** The prompt as written for the sound, without the shared style. */
function shortPrompt(
  prompt: string,
  prompts: ReturnType<typeof readPromptsV1>,
): string {
  for (const suffix of [
    prompts.styleSuffix,
    prompts.stingerSuffix,
    prompts.vocalSuffix,
  ])
    if (prompt.endsWith(` ${suffix}`))
      return prompt.slice(0, -suffix.length - 1);
  return prompt;
}

/**
 * What the game reads (`src/audio/elevenlabs-sounds.json`): for each sound
 * its default and, for each take, the clip, its level, its length, the
 * prompt and a line on its character. Everything else is in
 * `docs/audio/elevenlabs-sfx-clips.json` and the records.
 */
export function leanManifestV1(
  manifest: ElevenLabsManifestV1,
  prompts: ReturnType<typeof readPromptsV1>,
): unknown {
  return {
    provider: manifest.provider,
    provenance: manifest.provenance,
    bead: manifest.bead,
    model: prompts.model,
    sounds: manifest.sounds.map((sound) => ({
      id: sound.id,
      default: sound.default,
      confidence: sound.confidence,
      takes: sound.takes.map((take) => ({
        n: take.n,
        file: take.file,
        generated: take.generated,
        seconds:
          Math.round((take.endSeconds - take.startSeconds) * 1000) / 1000,
        gain: take.gain,
        passed: take.passed,
        prompt: shortPrompt(take.prompt, prompts),
        note: take.note,
      })),
    })),
  };
}

export function encodeElevenLabsSfxV1(rawFolder: string): string[] {
  if (!existsSync(AFCONVERT))
    throw new Error(`${AFCONVERT} not found: encoding needs macOS.`);
  const prompts = readPromptsV1();
  const records = readRecordsV1();
  const measured = readJsonV1<{ sounds: readonly MeasuredSelectionV1[] }>(
    ELEVENLABS_SFX_MEASUREMENTS_PATH,
    { sounds: [] },
  );
  const out = join(ROOT, STOCK_SOUND_OUTPUT_V1.folder);
  const work = mkdtempSync(join(tmpdir(), "elevenlabs-sfx-"));
  const lines: string[] = [];
  const sounds: ElevenLabsSoundManifestV1[] = [];
  const written = new Set<string>();
  let bytesTotal = 0;
  try {
    for (const sound of prompts.sounds) {
      const selection = measured.sounds.find((entry) => entry.id === sound.id);
      if (selection === undefined) continue;
      const reference = referenceOf(sound.id, work);
      const chosen = [
        ...selection.kept.map((n) => ({ n, passed: true })),
        ...selection.offered.map((n) => ({ n, passed: false })),
      ];
      const takes: ElevenLabsTakeManifestV1[] = [];
      for (const { n, passed } of chosen) {
        const record = records.takes.find(
          (take) => take.id === sound.id && take.n === n,
        );
        if (record === undefined)
          throw new Error(`${sound.id} #${n}: no record`);
        const raw = downmixV1(
          readWavFramesV1(readWavInfoV1(join(rawFolder, record.rawFile))),
        );
        const m = measureTakeV1(raw, SAMPLE_RATE, sound);
        const start = Math.round(m.trimStartSeconds * SAMPLE_RATE);
        const end = Math.round(m.trimEndSeconds * SAMPLE_RATE);
        const clip = cutClipV1(raw, SAMPLE_RATE, start, end, sound.maxSeconds);
        let peak = 0;
        for (const value of clip) peak = Math.max(peak, Math.abs(value));
        const scale = STORED_PEAK / peak;
        for (let i = 0; i < clip.length; i += 1)
          clip[i] = (clip[i] ?? 0) * scale;
        const lufs = Math.round(momentaryLufsV1(clip, SAMPLE_RATE) * 10) / 10;
        const gain =
          Math.round(
            Math.min(
              MAX_GAIN,
              Math.max(MIN_GAIN, Math.pow(10, (reference.lufs - lufs) / 20)),
            ) * 100,
          ) / 100;
        const file = `${fileStemV1(sound.id)}-${n}.m4a`;
        const wav = join(work, `${file}.wav`);
        writeFileSync(wav, encodeWav16V1([clip], SAMPLE_RATE));
        const encoded = join(work, file);
        execFileSync(AFCONVERT, [
          "-f",
          "m4af",
          "-d",
          "aac",
          "-b",
          String(STOCK_SOUND_OUTPUT_V1.bitRate),
          "-s",
          "0",
          "-q",
          "127",
          wav,
          encoded,
        ]);
        const bytes = readFileSync(encoded);
        clearMp4Times(bytes);
        writeFileSync(join(out, file), bytes);
        written.add(file);
        bytesTotal += bytes.length;
        const startSeconds =
          Math.round(Math.max(0, start / SAMPLE_RATE - 0.003) * 1000) / 1000;
        takes.push({
          n,
          file,
          generated: record.date,
          round: record.round,
          take: record.take,
          model: record.model,
          prompt: record.prompt,
          durationSeconds: record.durationSeconds,
          promptInfluence: record.promptInfluence,
          startSeconds,
          endSeconds:
            Math.round((startSeconds + clip.length / SAMPLE_RATE) * 1000) /
            1000,
          gain,
          lufs,
          note: takeNoteV1(m),
          passed,
        });
        lines.push(
          `${sound.id} #${n}${passed ? "" : " (offered)"} -> ${file} ${bytes.length} bytes, ` +
            `${(clip.length / SAMPLE_RATE).toFixed(3)} s, ${lufs} LUFS, gain ${gain} (reference ${reference.lufs} LUFS, ${reference.source})`,
        );
      }
      sounds.push({
        id: sound.id,
        default: selection.kept[0] ?? null,
        confidence: selection.confidence,
        why: selection.why,
        reference,
        takes,
      });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  // ElevenLabs clips (numbers from 101) the manifest no longer lists.
  for (const file of readdirSync(out).sort())
    if (/-1\d\d\.m4a$/.test(file) && !written.has(file)) {
      rmSync(join(out, file));
      lines.push(`${file} is no longer listed: removed`);
    }
  const manifest: ElevenLabsManifestV1 = {
    provider: "ElevenLabs sound effects",
    provenance: `ElevenLabs sound effects, generated ${
      [
        ...new Set(
          sounds.flatMap((sound) => sound.takes.map((take) => take.generated)),
        ),
      ]
        .sort()
        .join(", ") || "never"
    }`,
    bead: prompts.bead,
    output: STOCK_SOUND_OUTPUT_V1,
    sounds,
  };
  writeJsonV1(ELEVENLABS_SFX_CLIPS_PATH, manifest);
  writeJsonV1(
    ELEVENLABS_SOUNDS_MANIFEST_PATH,
    leanManifestV1(manifest, prompts),
  );
  lines.push(
    `${written.size} clips, ${bytesTotal} bytes; ` +
      `${sounds.filter((sound) => sound.default === null).length} sounds keep their old default`,
  );
  return lines;
}
