import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { soundRecipeV1, type SoundIdV1 } from "../../src/audio/sound-manifest";
import {
  STOCK_SOUND_CLIPS_V1,
  STOCK_SOUND_OUTPUT_V1,
  type StockSoundClipV1,
} from "../../src/audio/stock-sounds";
import {
  measureSynthSamplesV1,
  renderSynthRecipeV1,
} from "../../src/audio/synth";
import { envelopeV1, spectrumSummaryV1 } from "./measure-stock-sounds";
import {
  downmixV1,
  encodeWav16V1,
  readWavFramesV1,
  readWavInfoV1,
  resampleV1,
} from "./wav-pcm";

/**
 * Cuts the game's recorded sound clips out of a sound library (bead
 * pulp_wars-2yc.20, docs/ui/SOUND.md "Stock recordings").
 *
 *   npx tsx scripts/audio/cut-stock-sounds.ts <library-folder> [--evidence <folder>]
 *   STOCK_SOUNDS_BUNDLE=<library-folder> npx tsx scripts/audio/cut-stock-sounds.ts
 *
 * The clips are listed in `src/audio/stock-sounds.json`: for each game
 * sound, the library file, the stretch to cut, the fades and the filter.
 * For each one this reads only that stretch of the library file, mixes it
 * to mono, filters, resamples, fades, scales its peak to a common level
 * and writes it under `public/assets/audio/` with the game's own name.
 *
 * The library folder is only read. It is not part of the repository and
 * the game does not need it: the clips written here are checked in. The
 * script needs macOS (`afconvert` encodes the AAC).
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AFCONVERT = "/usr/bin/afconvert";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** A two-pole Butterworth high-pass (removes rumble below `hz`). */
function highpass(samples: Float32Array, sampleRate: number, hz: number): void {
  const w = (2 * Math.PI * hz) / sampleRate;
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b0 = (1 + cos) / 2 / a0;
  const b1 = -(1 + cos) / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i] ?? 0;
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    samples[i] = y;
  }
}

/** Raised-cosine fades at both ends, so the clip starts and ends silent. */
function fade(
  samples: Float32Array,
  sampleRate: number,
  fadeInMs: number,
  fadeOutMs: number,
): void {
  const fadeIn = Math.max(1, Math.round((fadeInMs / 1000) * sampleRate));
  const fadeOut = Math.max(1, Math.round((fadeOutMs / 1000) * sampleRate));
  const last = samples.length - 1;
  for (let i = 0; i < samples.length; i += 1) {
    const rise = Math.min(1, i / fadeIn);
    const fall = Math.min(1, (last - i) / fadeOut);
    const shape = (share: number): number =>
      0.5 - 0.5 * Math.cos(Math.PI * share);
    samples[i] = (samples[i] ?? 0) * shape(rise) * shape(fall);
  }
}

/** Processes one clip to mono samples at the output rate. */
export function cutClipV1(
  library: string,
  clip: StockSoundClipV1,
): Float32Array {
  const path = join(library, clip.library, clip.originalFile);
  if (!existsSync(path)) fail(`Library file not found: ${path}`);
  const info = readWavInfoV1(path);
  if (clip.endSeconds > info.durationSeconds + 0.001)
    fail(`${clip.id}: the cut ends after the end of ${clip.originalFile}`);
  const first = Math.round(clip.startSeconds * info.sampleRate);
  const count = Math.round(
    (clip.endSeconds - clip.startSeconds) * info.sampleRate,
  );
  const mono = downmixV1(readWavFramesV1(info, first, count));
  // The mean of a short stretch is an offset; take it out before filtering.
  let mean = 0;
  for (const value of mono) mean += value / Math.max(1, mono.length);
  for (let i = 0; i < mono.length; i += 1) mono[i] = (mono[i] ?? 0) - mean;
  if (clip.highpassHz > 0) highpass(mono, info.sampleRate, clip.highpassHz);
  const samples = resampleV1(
    mono,
    info.sampleRate,
    STOCK_SOUND_OUTPUT_V1.sampleRate,
  );
  fade(
    samples,
    STOCK_SOUND_OUTPUT_V1.sampleRate,
    clip.fadeInMs,
    clip.fadeOutMs,
  );
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  if (peak <= 0) fail(`${clip.id}: the cut is silent`);
  const scale = STOCK_SOUND_OUTPUT_V1.peak / peak;
  for (let i = 0; i < samples.length; i += 1)
    samples[i] = (samples[i] ?? 0) * scale;
  return samples;
}

/**
 * Zeroes the creation and modification times in an MP4 file, so the same
 * cut always gives the same bytes.
 */
function clearMp4Times(file: Buffer, from = 0, to: number = file.length): void {
  let at = from;
  while (at + 8 <= to) {
    const size = file.readUInt32BE(at);
    const type = file.toString("latin1", at + 4, at + 8);
    if (size < 8 || at + size > to) return;
    if (type === "moov" || type === "trak" || type === "mdia")
      clearMp4Times(file, at + 8, at + size);
    else if (type === "mvhd" || type === "tkhd" || type === "mdhd")
      file.fill(0, at + 12, at + 12 + (file.readUInt8(at + 8) === 1 ? 16 : 8));
    at += size;
  }
}

function sparkline(samples: Float32Array, sampleRate: number): string {
  const envelope = envelopeV1(samples, sampleRate, 0.005);
  let peak = 0;
  for (const value of envelope) peak = Math.max(peak, value);
  const cells = 48;
  let text = "";
  for (let cell = 0; cell < cells; cell += 1) {
    const a = Math.floor((envelope.length * cell) / cells);
    const b = Math.max(
      a + 1,
      Math.floor((envelope.length * (cell + 1)) / cells),
    );
    let level = 0;
    for (let i = a; i < b; i += 1) level = Math.max(level, envelope[i] ?? 0);
    const steps =
      level <= 0 ? 0 : Math.round(8 + (20 * Math.log10(level / peak)) / 6);
    text += " ▁▂▃▄▅▆▇█"[Math.max(0, Math.min(8, steps))] ?? " ";
  }
  return text;
}

function main(): void {
  const args = process.argv.slice(2);
  const evidenceAt = args.indexOf("--evidence");
  const evidence = evidenceAt >= 0 ? args[evidenceAt + 1] : undefined;
  const library =
    args.find(
      (arg, index) =>
        !arg.startsWith("--") && (evidenceAt < 0 || index !== evidenceAt + 1),
    ) ?? process.env.STOCK_SOUNDS_BUNDLE;
  if (library === undefined || library === "")
    fail(
      "Usage: tsx scripts/audio/cut-stock-sounds.ts <library-folder> [--evidence <folder>]\n" +
        "(or set STOCK_SOUNDS_BUNDLE). The library folder is the unpacked sound bundle;\n" +
        "it is not in the repository. The game does not need it: the cut clips are checked in.",
    );
  if (!existsSync(library) || !statSync(library).isDirectory())
    fail(`Library folder not found: ${library}`);
  if (!existsSync(AFCONVERT))
    fail(`${AFCONVERT} not found: this script needs macOS to encode AAC.`);

  const out = join(ROOT, STOCK_SOUND_OUTPUT_V1.folder);
  mkdirSync(out, { recursive: true });
  if (evidence !== undefined) mkdirSync(evidence, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "stock-sounds-"));
  const rate = STOCK_SOUND_OUTPUT_V1.sampleRate;
  const lines: string[] = [];
  const records: Record<string, string | number>[] = [];
  let total = 0;
  try {
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      const samples = cutClipV1(library, clip);
      const wav = join(work, `${clip.file}.wav`);
      writeFileSync(wav, encodeWav16V1([samples], rate));
      const encoded = join(work, clip.file);
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
      writeFileSync(join(out, clip.file), bytes);
      total += bytes.length;
      // Decode it again, to see what a player gets back.
      const back = join(work, `${clip.file}.back.wav`);
      execFileSync(AFCONVERT, ["-f", "WAVE", "-d", "LEI16", encoded, back]);
      const decoded = downmixV1(readWavFramesV1(readWavInfoV1(back)));
      const measured = measureSynthSamplesV1(samples, rate);
      const spectrum = spectrumSummaryV1(samples, rate);
      const recipe = soundRecipeV1(clip.id as SoundIdV1);
      const synth =
        recipe === null
          ? null
          : measureSynthSamplesV1(renderSynthRecipeV1(recipe, rate), rate);
      let decodedPeak = 0;
      for (const value of decoded)
        decodedPeak = Math.max(decodedPeak, Math.abs(value));
      lines.push(
        `${clip.id}  ->  ${clip.file}  ${bytes.length} bytes`,
        `  from ${clip.library} / ${clip.originalFile}`,
        `  cut ${clip.startSeconds}-${clip.endSeconds} s, fades ${clip.fadeInMs}/${clip.fadeOutMs} ms, high-pass ${clip.highpassHz} Hz`,
        `  clip   ${Math.round(measured.durationMs)} ms  peak ${measured.peak.toFixed(3)}  rms ${measured.rms.toFixed(3)}  brightness ${Math.round(measured.brightnessHz)} Hz  centroid ${spectrum.centroidHz} Hz  bands ${spectrum.bands.join("/")}`,
        `  decoded ${decoded.length} frames (cut ${samples.length}), peak ${decodedPeak.toFixed(3)}`,
        synth === null
          ? "  synth  none"
          : `  synth  ${Math.round(synth.durationMs)} ms  peak ${synth.peak.toFixed(3)}  rms ${synth.rms.toFixed(3)}  brightness ${Math.round(synth.brightnessHz)} Hz`,
        `  gain ${clip.gain}: plays at peak ${(measured.peak * clip.gain).toFixed(3)}, rms ${(measured.rms * clip.gain).toFixed(3)}` +
          (synth === null
            ? ""
            : `  (equal rms would be gain ${(synth.rms / measured.rms).toFixed(2)})`),
        `  |${sparkline(samples, rate)}|`,
        "",
      );
      // The first sample at a tenth of the peak: where the sound begins.
      const onset = samples.findIndex(
        (value) => Math.abs(value) >= measured.peak / 10,
      );
      records.push({
        id: clip.id,
        file: clip.file,
        bytes: bytes.length,
        frames: samples.length,
        durationMs: Math.round(measured.durationMs),
        onsetMs: Math.round((onset / rate) * 10000) / 10,
        peak: Math.round(measured.peak * 1000) / 1000,
        rms: Math.round(measured.rms * 1000) / 1000,
        centroidHz: spectrum.centroidHz,
        gain: clip.gain,
      });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  lines.push(
    `${STOCK_SOUND_CLIPS_V1.length} clips, ${total} bytes in ${STOCK_SOUND_OUTPUT_V1.folder}`,
  );
  console.log(lines.join("\n"));
  if (evidence !== undefined) {
    writeFileSync(join(evidence, "clips.txt"), lines.join("\n") + "\n");
    writeFileSync(
      join(evidence, "clips.json"),
      JSON.stringify(records, null, 2) + "\n",
    );
  }
}

if (process.argv[1]?.endsWith("cut-stock-sounds.ts") === true) main();
