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
import { encodeWav16V1, readWavFramesV1, readWavInfoV1 } from "./wav-pcm";

/**
 * Encodes the theme music (bead pulp_wars-2yc.27, docs/audio/THEME_MUSIC.md
 * "Records", docs/ui/SOUND.md "Theme music").
 *
 *   npx tsx scripts/audio/encode-themes.ts <folder> [--evidence <folder>]
 *
 * `<folder>` holds the masters: one WAV per theme, under the names of
 * `THEME_MASTERS_V1`. They are only read. They are not in the repository
 * and the game's build does not need them or this script: the encoded
 * files and the manifest this writes are checked in.
 *
 * For every master this trims the silence at both ends, measures its
 * loudness (ITU-R BS.1770 integrated, in LUFS) and where its last note
 * starts to die away, encodes it as AAC-LC in an MP4 file under
 * `public/assets/audio/themes/`, and writes what it found to
 * `src/audio/theme-music.json`: the level each theme is played at so that
 * all of them are equally loud, and how far before its end the next pass
 * of the loop starts. Nothing is baked into the audio except the trim.
 *
 * The script needs macOS (`afconvert` encodes the AAC).
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AFCONVERT = "/usr/bin/afconvert";

/** Where the encoded themes go, from the repository root. */
export const THEME_MUSIC_FOLDER_V1 = "public/assets/audio/themes";
/** The manifest this script writes. */
export const THEME_MUSIC_MANIFEST_PATH_V1 = "src/audio/theme-music.json";

/** AAC-LC, stereo. 112 kbit/s is about 1.4 MB for 100 seconds. */
export const THEME_MUSIC_BIT_RATE_V1 = 112_000;
export const THEME_MUSIC_SAMPLE_RATE_V1 = 44_100;
/**
 * Every theme is played at this loudness before the mixer's music level
 * and the player's Music slider (THEME_MUSIC.md "Tempo and mix").
 */
export const THEME_MUSIC_TARGET_LUFS_V1 = -16;
/** Below this level the end of a master is silence (-60 dBFS). */
const SILENCE = 0.001;
/** The first sound of a master is at least this loud (-50 dBFS). */
const HEAD_FLOOR = 0.00316;
/** The level is read in windows of this length for the trim. */
const TRIM_WINDOW_SECONDS = 0.01;
/** Kept before the first sound, so its attack is whole. */
const HEAD_ROOM_SECONDS = 0.005;
/** The window of the level curve the loop point is found on. */
const TAIL_WINDOW_SECONDS = 0.25;
/** The last note is dying once the level is this far under the track's. */
const TAIL_DROP_DB = 8;
/** The next pass never starts further than this before the end. */
const MAX_OVERLAP_SECONDS = 4;
const MIN_OVERLAP_SECONDS = 0.05;

export interface ThemeMasterV1 {
  /** The theme's id in the game. */
  readonly id: string;
  /** The faction it belongs to; null for the title theme. */
  readonly faction: string | null;
  /** The master's file name in the folder, as its author named it. */
  readonly master: string;
  /** The prompt it was generated from (docs/audio/theme-prompts.json). */
  readonly prompt: string;
  /**
   * Set to choose by ear how many seconds before its end the next pass of
   * the loop starts; without it the measured value is used.
   */
  readonly overlapSeconds?: number;
}

/** The nine masters the user generated with Suno on 2026-10-07. */
export const THEME_MASTERS_V1: readonly ThemeMasterV1[] = [
  {
    id: "theme.human",
    faction: "ORIGINAL",
    master: "humans.wav",
    prompt: "ORIGINAL@2+s1",
  },
  {
    id: "theme.undead",
    faction: "UNDEAD",
    master: "undead.wav",
    prompt: "UNDEAD@2+s1",
  },
  {
    id: "theme.goblin",
    faction: "GOBLIN",
    master: "goblins 4.wav",
    prompt: "GOBLIN@2+s1",
  },
  {
    id: "theme.dinosaur",
    faction: "DINOSAUR",
    master: "dino cavemen.wav",
    prompt: "DINOSAUR@2+s1",
  },
  {
    id: "theme.martian",
    faction: "MARTIAN",
    master: "martians.wav",
    prompt: "MARTIAN@2+s1",
  },
  {
    id: "theme.ice-folk",
    faction: "ICE_FOLK",
    master: "ice folk.wav",
    prompt: "ICE_FOLK@2+s1",
  },
  {
    id: "theme.dwarf",
    faction: "DWARF",
    master: "steampunk dwarfs.wav",
    prompt: "DWARF@2+s1",
  },
  {
    id: "theme.candy",
    faction: "CANDY",
    master: "candy christmassy.wav",
    prompt: "CANDY@2+s1",
  },
  {
    id: "theme.title",
    faction: null,
    master: "pulp wars title 2.wav",
    prompt: "theme.title@2+s1",
  },
];

/** The encoded file of a theme: "theme.ice-folk" is "theme-ice-folk.m4a". */
export function themeMusicFileV1(id: string): string {
  return `${id.replaceAll(".", "-")}.m4a`;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** A biquad filter in place (direct form I). */
function biquad(
  samples: Float32Array,
  b: readonly [number, number, number],
  a: readonly [number, number],
): Float64Array {
  const out = new Float64Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i] ?? 0;
    const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/** The two K-weighting filters of BS.1770 for a sample rate. */
function kWeighting(rate: number): {
  shelf: { b: [number, number, number]; a: [number, number] };
  highpass: { b: [number, number, number]; a: [number, number] };
} {
  // The filters as analogue prototypes, so any sample rate is right (the
  // standard prints the coefficients for 48 kHz only).
  const shelfHz = 1681.974450955533;
  const shelfGain = 3.999843853973347;
  const shelfQ = 0.7071752369554196;
  let k = Math.tan((Math.PI * shelfHz) / rate);
  const vh = Math.pow(10, shelfGain / 20);
  const vb = Math.pow(vh, 0.4996667741545416);
  let a0 = 1 + k / shelfQ + k * k;
  const shelf = {
    b: [
      (vh + (vb * k) / shelfQ + k * k) / a0,
      (2 * (k * k - vh)) / a0,
      (vh - (vb * k) / shelfQ + k * k) / a0,
    ] as [number, number, number],
    a: [(2 * (k * k - 1)) / a0, (1 - k / shelfQ + k * k) / a0] as [
      number,
      number,
    ],
  };
  const highHz = 38.13547087602444;
  const highQ = 0.5003270373238773;
  k = Math.tan((Math.PI * highHz) / rate);
  a0 = 1 + k / highQ + k * k;
  const highpass = {
    b: [1, -2, 1] as [number, number, number],
    a: [(2 * (k * k - 1)) / a0, (1 - k / highQ + k * k) / a0] as [
      number,
      number,
    ],
  };
  return { shelf, highpass };
}

/**
 * Integrated loudness in LUFS (ITU-R BS.1770-4): K-weighted, 400 ms blocks
 * overlapping by three quarters, gated at -70 LUFS and then at 10 LU under
 * the level of what is left. -Infinity for silence.
 */
export function integratedLufsV1(
  channels: readonly Float32Array[],
  rate: number,
): number {
  const { shelf, highpass } = kWeighting(rate);
  const weighted = channels.map((channel) => {
    const first = biquad(channel, shelf.b, shelf.a);
    return biquad(Float32Array.from(first), highpass.b, highpass.a);
  });
  const block = Math.round(rate * 0.4);
  const step = Math.round(rate * 0.1);
  const frames = channels[0]?.length ?? 0;
  const powers: number[] = [];
  for (let start = 0; start + block <= frames; start += step) {
    let power = 0;
    for (const channel of weighted) {
      let sum = 0;
      for (let i = start; i < start + block; i += 1)
        sum += (channel[i] ?? 0) ** 2;
      power += sum / block;
    }
    powers.push(power);
  }
  const loudness = (power: number): number =>
    power <= 0 ? -Infinity : -0.691 + 10 * Math.log10(power);
  const mean = (values: readonly number[]): number =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const absolute = powers.filter((power) => loudness(power) > -70);
  if (absolute.length === 0) return -Infinity;
  const relative = loudness(mean(absolute)) - 10;
  const gated = absolute.filter((power) => loudness(power) > relative);
  return gated.length === 0 ? -Infinity : loudness(mean(gated));
}

/** The loudest sample of any channel. */
export function peakV1(channels: readonly Float32Array[]): number {
  let peak = 0;
  for (const channel of channels)
    for (const value of channel) peak = Math.max(peak, Math.abs(value));
  return peak;
}

/**
 * The frames to keep: from just before the first hundredth of a second
 * that is louder than -50 dBFS and is followed by more sound (a master may
 * open with a stray click and a pause), to the end of the last hundredth
 * that is louder than -60 dBFS.
 */
export function trimPointsV1(
  channels: readonly Float32Array[],
  rate: number,
): { readonly start: number; readonly end: number } {
  const frames = channels[0]?.length ?? 0;
  const window = Math.max(1, Math.round(rate * TRIM_WINDOW_SECONDS));
  const count = Math.floor(frames / window);
  const levels: number[] = [];
  for (let index = 0; index < count; index += 1)
    levels.push(rms(channels, index * window, (index + 1) * window));
  // A tenth of a second of sound, not one click.
  const sustained = (index: number): boolean => {
    let loud = 0;
    for (let next = index; next < Math.min(count, index + 10); next += 1)
      if ((levels[next] ?? 0) >= SILENCE) loud += 1;
    return loud >= 8;
  };
  let first = 0;
  while (
    first < count &&
    !((levels[first] ?? 0) >= HEAD_FLOOR && sustained(first))
  )
    first += 1;
  if (first >= count) return { start: 0, end: frames };
  let last = count - 1;
  while (last > first && (levels[last] ?? 0) < SILENCE) last -= 1;
  return {
    start: Math.max(0, first * window - Math.round(rate * HEAD_ROOM_SECONDS)),
    end: Math.min(frames, (last + 1) * window),
  };
}

/** RMS of all channels over [from, to). */
function rms(
  channels: readonly Float32Array[],
  from: number,
  to: number,
): number {
  let sum = 0;
  let count = 0;
  for (const channel of channels)
    for (let i = Math.max(0, from); i < Math.min(channel.length, to); i += 1) {
      sum += (channel[i] ?? 0) ** 2;
      count += 1;
    }
  return count === 0 ? 0 : Math.sqrt(sum / count);
}

/**
 * How long the last note takes to die away, in seconds: the stretch after
 * the last quarter second that is within `TAIL_DROP_DB` of the track's
 * usual level. The next pass of the loop starts that far before the end,
 * under the dying note, so the loop has no gap and the note is not cut.
 */
export function tailSecondsV1(
  channels: readonly Float32Array[],
  rate: number,
): number {
  const frames = channels[0]?.length ?? 0;
  const window = Math.round(rate * TAIL_WINDOW_SECONDS);
  const levels: number[] = [];
  for (let start = 0; start + window <= frames; start += window)
    levels.push(rms(channels, start, start + window));
  if (levels.length === 0) return MIN_OVERLAP_SECONDS;
  const sorted = [...levels].sort((a, b) => a - b);
  const usual = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const floor = usual * Math.pow(10, -TAIL_DROP_DB / 20);
  let last = levels.length - 1;
  while (last > 0 && (levels[last] ?? 0) < floor) last -= 1;
  const tail = (frames - (last + 1) * window) / rate;
  return Math.min(MAX_OVERLAP_SECONDS, Math.max(MIN_OVERLAP_SECONDS, tail));
}

/**
 * Zeroes the creation and modification times in an MP4 file, so the same
 * master always gives the same bytes.
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

const round = (value: number, digits: number): number => {
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
};

const decibels = (value: number): number =>
  value <= 0 ? -Infinity : 20 * Math.log10(value);

export interface ThemeTrackRecordV1 {
  readonly id: string;
  readonly faction: string | null;
  /** The encoded file under the themes folder. */
  readonly file: string;
  /** The master it was encoded from, as its author named it. */
  readonly master: string;
  /** The prompt entry and version it was generated from. */
  readonly prompt: string;
  /** Length of the master, in seconds. */
  readonly masterSeconds: number;
  /** Silence cut from the start and the end, in seconds. */
  readonly headTrimSeconds: number;
  readonly tailTrimSeconds: number;
  /** Length of the encoded theme, in seconds. */
  readonly seconds: number;
  /** Integrated loudness and peak of the trimmed master. */
  readonly lufs: number;
  readonly peakDb: number;
  /** The level it is played at, so that it is at the target loudness. */
  readonly gain: number;
  /** How far before its end the next pass of the loop starts. */
  readonly loopOverlapSeconds: number;
  /** The level in the last 50 ms, in dBFS: how the master ends. */
  readonly endLevelDb: number;
  readonly bytes: number;
}

function main(): void {
  const args = process.argv.slice(2);
  let folder: string | undefined;
  let evidence: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "--evidence") evidence = args[(index += 1)];
    else if (arg.startsWith("--")) fail(`Unknown option: ${arg}`);
    else folder = arg;
  }
  if (folder === undefined)
    fail(
      "Usage: tsx scripts/audio/encode-themes.ts <folder> [--evidence <folder>]\n" +
        "<folder> holds the theme masters (WAV). They are not in the repository, and the\n" +
        "game does not need them: the encoded themes are checked in.",
    );
  if (!existsSync(folder) || !statSync(folder).isDirectory())
    fail(`Theme masters folder not found: ${folder}`);
  if (!existsSync(AFCONVERT))
    fail(`${AFCONVERT} not found: this script needs macOS to encode AAC.`);
  const missing = THEME_MASTERS_V1.filter(
    (entry) => !existsSync(join(folder, entry.master)),
  );
  if (missing.length > 0)
    fail(
      `Missing in ${folder}: ${missing.map((entry) => entry.master).join(", ")}`,
    );

  const out = join(ROOT, THEME_MUSIC_FOLDER_V1);
  mkdirSync(out, { recursive: true });
  if (evidence !== undefined) mkdirSync(evidence, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "theme-music-"));
  const tracks: ThemeTrackRecordV1[] = [];
  const decodedNotes: string[] = [];
  try {
    for (const entry of THEME_MASTERS_V1) {
      const info = readWavInfoV1(join(folder, entry.master));
      const all = readWavFramesV1(info);
      const rate = info.sampleRate;
      const { start, end } = trimPointsV1(all, rate);
      const channels = all.map((channel) => channel.subarray(start, end));
      const frames = end - start;
      const lufs = integratedLufsV1(channels, rate);
      const peak = peakV1(channels);
      const overlap = entry.overlapSeconds ?? tailSecondsV1(channels, rate);
      const gain = Math.pow(10, (THEME_MUSIC_TARGET_LUFS_V1 - lufs) / 20);
      const file = themeMusicFileV1(entry.id);
      const wav = join(work, `${file}.wav`);
      writeFileSync(wav, encodeWav16V1(channels, rate));
      const encoded = join(work, file);
      execFileSync(AFCONVERT, [
        "-f",
        "m4af",
        "-d",
        `aac@${THEME_MUSIC_SAMPLE_RATE_V1}`,
        "-b",
        String(THEME_MUSIC_BIT_RATE_V1),
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
      // Decode it again, to see what a player gets back.
      const back = join(work, `${file}.back.wav`);
      execFileSync(AFCONVERT, ["-f", "WAVE", "-d", "LEI16", encoded, back]);
      const backInfo = readWavInfoV1(back);
      const decoded = readWavFramesV1(backInfo);
      decodedNotes.push(
        `${entry.id}: decoded ${backInfo.channels} ch ${backInfo.sampleRate} Hz ${backInfo.durationSeconds.toFixed(3)} s (trimmed master ${(frames / rate).toFixed(3)} s), ${integratedLufsV1(decoded, backInfo.sampleRate).toFixed(2)} LUFS, peak ${decibels(peakV1(decoded)).toFixed(2)} dBFS`,
      );
      tracks.push({
        id: entry.id,
        faction: entry.faction,
        file,
        master: entry.master,
        prompt: entry.prompt,
        masterSeconds: round(info.durationSeconds, 3),
        headTrimSeconds: round(start / rate, 3),
        tailTrimSeconds: round((info.frames - end) / rate, 3),
        seconds: round(frames / rate, 3),
        lufs: round(lufs, 2),
        peakDb: round(decibels(peak), 2),
        gain: round(gain, 3),
        loopOverlapSeconds: round(overlap, 2),
        endLevelDb: round(
          decibels(rms(channels, frames - Math.round(rate * 0.05), frames)),
          1,
        ),
        bytes: bytes.length,
      });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  const manifest = {
    note: "Written by scripts/audio/encode-themes.ts from the theme masters; do not edit by hand.",
    folder: THEME_MUSIC_FOLDER_V1,
    codec: "AAC-LC",
    channels: 2,
    sampleRate: THEME_MUSIC_SAMPLE_RATE_V1,
    bitRate: THEME_MUSIC_BIT_RATE_V1,
    targetLufs: THEME_MUSIC_TARGET_LUFS_V1,
    tracks,
  };
  writeFileSync(
    join(ROOT, THEME_MUSIC_MANIFEST_PATH_V1),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const total = tracks.reduce((sum, track) => sum + track.bytes, 0);
  const lines = [
    "| Theme | Master | Master length | Head cut | Tail cut | Length | Loudness | Peak | Gain | After gain | Ends at | Loop overlap | Bytes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...tracks.map(
      (track) =>
        `| \`${track.id}\` | ${track.master} | ${track.masterSeconds} s | ${track.headTrimSeconds} s | ${track.tailTrimSeconds} s | ${track.seconds} s | ${track.lufs} LUFS | ${track.peakDb} dBFS | ${track.gain} | ${round(track.lufs + decibels(track.gain), 2)} LUFS, peak ${round(track.peakDb + decibels(track.gain), 2)} dBFS | ${track.endLevelDb} dBFS | ${track.loopOverlapSeconds} s | ${track.bytes} |`,
    ),
    "",
    `${tracks.length} themes, ${total} bytes in ${THEME_MUSIC_FOLDER_V1}; AAC-LC stereo ${THEME_MUSIC_SAMPLE_RATE_V1} Hz at ${THEME_MUSIC_BIT_RATE_V1 / 1000} kbit/s; target ${THEME_MUSIC_TARGET_LUFS_V1} LUFS.`,
    "",
    ...decodedNotes,
  ];
  console.log(lines.join("\n"));
  if (evidence !== undefined)
    writeFileSync(join(evidence, "tracks.md"), lines.join("\n") + "\n");
}

if (process.argv[1]?.endsWith("encode-themes.ts") === true) main();
