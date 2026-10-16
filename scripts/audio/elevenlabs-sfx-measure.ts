import { biquad, kWeighting } from "./encode-themes";
import type { SfxKindV1, SfxPromptV1 } from "./elevenlabs-sfx-data";
import { fft } from "./measure-stock-sounds";

/**
 * Measuring and judging the ElevenLabs takes (bead pulp_wars-2yc.51,
 * docs/audio/ELEVENLABS_SFX.md "How the takes were judged"). Nobody can
 * listen while they are chosen, so every take is measured, held to rules
 * for its kind of sound, and the best-measuring passing take is the
 * default. Pure functions over samples: no file, no service, no sound.
 */

const HOP_SECONDS = 0.005;
/** The trimmed sound runs from and to this far under its loudest hop. */
const TRIM_DB = -40;
/** The onset is the first hop within this of the loudest. */
const ONSET_DB = -10;
/** The tail starts after the last hop within this of the loudest. */
const TAIL_DB = -20;
/** A take whose peak is under this is silent. */
const SILENT_DBFS = -30;
/** Samples at or above this are clipped. */
const CLIP_LEVEL = 0.999;
/**
 * At most this share of samples may sit in flat runs of three or more at
 * full scale. ElevenLabs delivers its takes mastered hot: single samples
 * at full scale are common and harmless, runs of them are flat-topped
 * waves, which is audible distortion.
 */
const MAX_CLIPPED_RUN_SHARE = 0.001;
const CLIP_RUN = 3;
/** At most this share of the energy may lie past the sound's length. */
const MAX_ENERGY_PAST_LENGTH = 0.1;
/** At most this share of the energy may come before the attack. */
const MAX_LEAD_IN_SHARE = 0.1;
/** Two takes this alike are one sound twice. */
export const NEAR_DUPLICATE_SIMILARITY = 0.985;

export const db = (value: number): number =>
  value <= 1e-12 ? -240 : 20 * Math.log10(value);
const round = (value: number, digits = 3): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

/** The RMS level of each hop. */
function envelope(samples: Float32Array, rate: number): Float64Array {
  const hop = Math.max(1, Math.round(HOP_SECONDS * rate));
  const count = Math.ceil(samples.length / hop);
  const levels = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    let squares = 0;
    const end = Math.min(samples.length, (index + 1) * hop);
    for (let i = index * hop; i < end; i += 1)
      squares += (samples[i] ?? 0) ** 2;
    levels[index] = Math.sqrt(squares / Math.max(1, end - index * hop));
  }
  return levels;
}

/**
 * Loudness in LUFS of the loudest 400 ms (BS.1770 K-weighting, no gate):
 * the momentary loudness a short effect is heard at. A sound shorter
 * than 400 ms is measured whole.
 */
export function momentaryLufsV1(samples: Float32Array, rate: number): number {
  if (samples.length === 0) return -Infinity;
  const { shelf, highpass } = kWeighting(rate);
  const weighted = biquad(
    Float32Array.from(biquad(samples, shelf.b, shelf.a)),
    highpass.b,
    highpass.a,
  );
  const block = Math.min(weighted.length, Math.round(rate * 0.4));
  const step = Math.max(1, Math.round(rate * 0.05));
  let best = 0;
  for (let start = 0; start + block <= weighted.length; start += step) {
    let sum = 0;
    for (let i = start; i < start + block; i += 1)
      sum += (weighted[i] ?? 0) ** 2;
    best = Math.max(best, sum / block);
    if (start + block === weighted.length) break;
  }
  return best <= 0 ? -Infinity : -0.691 + 10 * Math.log10(best);
}

/** Band edges of the spectrum fingerprint, in Hz (log spaced). */
const BAND_EDGES: readonly number[] = Array.from(
  { length: 25 },
  (_, index) => 40 * Math.pow(16000 / 40, index / 24),
);

export interface SpectrumV1 {
  readonly centroidHz: number;
  /** Energy shares below 150 Hz, to 1 kHz, to 4 kHz, and above. */
  readonly bands: readonly [number, number, number, number];
  /** 24 log-spaced bands of the average power spectrum, in dB, for similarity. */
  readonly fingerprint: readonly number[];
}

/** The average power spectrum of the whole sound (2048-point frames). */
export function spectrumV1(samples: Float32Array, rate: number): SpectrumV1 {
  const size = 2048;
  const power = new Float64Array(size / 2);
  const hop = size / 2;
  let frames = 0;
  for (let start = 0; start < Math.max(1, samples.length - hop); start += hop) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let i = 0; i < size; i += 1)
      re[i] =
        (samples[start + i] ?? 0) *
        (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
    fft(re, im);
    for (let bin = 0; bin < size / 2; bin += 1)
      power[bin] =
        (power[bin] ?? 0) + (re[bin] ?? 0) ** 2 + (im[bin] ?? 0) ** 2;
    frames += 1;
  }
  let total = 0;
  let weighted = 0;
  const bands: [number, number, number, number] = [0, 0, 0, 0];
  const fine = new Float64Array(BAND_EDGES.length - 1);
  for (let bin = 1; bin < size / 2; bin += 1) {
    const hz = (bin * rate) / size;
    if (hz < 20 || hz > 20000) continue;
    const value = (power[bin] ?? 0) / Math.max(1, frames);
    total += value;
    weighted += value * hz;
    bands[hz < 150 ? 0 : hz < 1000 ? 1 : hz < 4000 ? 2 : 3] += value;
    for (let band = 0; band < fine.length; band += 1)
      if (hz >= (BAND_EDGES[band] ?? 0) && hz < (BAND_EDGES[band + 1] ?? 0))
        fine[band] = (fine[band] ?? 0) + value;
  }
  const share = (value: number): number =>
    total > 0 ? round(value / total, 3) : 0;
  return {
    centroidHz: total > 0 ? Math.round(weighted / total) : 0,
    bands: [share(bands[0]), share(bands[1]), share(bands[2]), share(bands[3])],
    fingerprint: [...fine].map((value) =>
      round(10 * Math.log10(value / Math.max(total, 1e-20) + 1e-9), 2),
    ),
  };
}

export interface TakeMeasurementV1 {
  /** The raw take. */
  readonly rawSeconds: number;
  readonly rawPeakDbfs: number;
  readonly clippedShare: number;
  /** Share of samples in flat runs of three or more at full scale. */
  readonly clippedRunShare: number;
  /** Silence before the sound starts in the raw take. */
  readonly leadMs: number;
  /**
   * Share of the energy before the attack that the clip leaves out (kinds
   * that start at the attack only).
   */
  readonly leadInShare: number;
  /** Where the trimmed sound starts and ends in the raw take. */
  readonly trimStartSeconds: number;
  readonly trimEndSeconds: number;
  /** Its length after trimming silence (no cut). */
  readonly trimmedSeconds: number;
  /** From the trimmed start to within 10 dB of the loudest moment. */
  readonly onsetMs: number;
  /** In the clip: from the last moment within 20 dB of its loudest to its end. */
  readonly tailMs: number;
  /** Share of the energy past the sound's longest length. */
  readonly energyPastLength: number;
  /** The clip as it will be stored: cut at the longest length when longer. */
  readonly clipSeconds: number;
  /** Momentary loudness of the clip at the stored peak (0.708). */
  readonly storedLufs: number;
  readonly crestDb: number;
  readonly centroidHz: number;
  readonly bands: readonly [number, number, number, number];
  readonly fingerprint: readonly number[];
  /** A coarse loudness shape: 16 steps across the clip, in dB under its peak. */
  readonly shape: readonly number[];
}

/** The peak every stored clip is scaled to (as the stock clips). */
export const STORED_PEAK = 0.708;

/**
 * Kinds whose clip starts at the attack: anything more than 10 ms before
 * the sound gets loud is dropped (a stray rustle before a click, a breath
 * before a hit). The others keep their swell.
 */
export const ATTACK_TRIM_KINDS: readonly SfxKindV1[] = [
  "ui",
  "ui-error",
  "step",
  "hit",
  "pop",
  "clang",
  "burst",
  "boom",
  "zap",
];
const ATTACK_LEAD_SECONDS = 0.01;

/** Measures a raw take as the clip it would become for its sound. */
export function measureTakeV1(
  samples: Float32Array,
  rate: number,
  sound: Pick<SfxPromptV1, "kind" | "maxSeconds">,
): TakeMeasurementV1 {
  let peak = 0;
  let clipped = 0;
  let inRuns = 0;
  let run = 0;
  for (let i = 0; i <= samples.length; i += 1) {
    const value = Math.abs(samples[i] ?? 0);
    peak = Math.max(peak, value);
    if (i < samples.length && value >= CLIP_LEVEL) {
      clipped += 1;
      run += 1;
    } else {
      if (run >= CLIP_RUN) inRuns += run;
      run = 0;
    }
  }
  const levels = envelope(samples, rate);
  let loudest = 0;
  let loudestAt = 0;
  levels.forEach((value, index) => {
    if (value > loudest) {
      loudest = value;
      loudestAt = index;
    }
  });
  const hop = Math.max(1, Math.round(HOP_SECONDS * rate));
  const floor = loudest * Math.pow(10, TRIM_DB / 20);
  let first = 0;
  while (first < levels.length && (levels[first] ?? 0) < floor) first += 1;
  let last = levels.length - 1;
  while (last > first && (levels[last] ?? 0) < floor) last -= 1;
  const onsetFloor = loudest * Math.pow(10, ONSET_DB / 20);
  let onset = first;
  while (onset < loudestAt && (levels[onset] ?? 0) < onsetFloor) onset += 1;
  const startHop = ATTACK_TRIM_KINDS.includes(sound.kind)
    ? Math.max(first, onset - Math.round(ATTACK_LEAD_SECONDS / HOP_SECONDS))
    : first;
  const trimStart = first * hop;
  const start = startHop * hop;
  const end = Math.min(samples.length, (last + 1) * hop);
  let total = 0;
  let lead = 0;
  let past = 0;
  const maxEnd = start + Math.round(sound.maxSeconds * rate);
  for (let i = trimStart; i < end; i += 1) {
    const energy = (samples[i] ?? 0) ** 2;
    total += energy;
    if (i < start) lead += energy;
    if (i >= maxEnd) past += energy;
  }
  const clip = cutClipV1(samples, rate, start, end, sound.maxSeconds);
  let clipPeak = 0;
  let squares = 0;
  for (const value of clip) {
    clipPeak = Math.max(clipPeak, Math.abs(value));
    squares += value * value;
  }
  const rms = Math.sqrt(squares / Math.max(1, clip.length));
  const stored = clip.map(
    (value) => (value * STORED_PEAK) / Math.max(clipPeak, 1e-9),
  );
  const spectrum = spectrumV1(clip, rate);
  const clipLevels = envelope(clip, rate);
  let clipLoudest = 0;
  for (const value of clipLevels) clipLoudest = Math.max(clipLoudest, value);
  const tailFloor = clipLoudest * Math.pow(10, TAIL_DB / 20);
  let tailStart = clipLevels.length - 1;
  while (tailStart > 0 && (clipLevels[tailStart] ?? 0) < tailFloor)
    tailStart -= 1;
  const shape = Array.from({ length: 16 }, (_, step) => {
    const a = Math.floor((clipLevels.length * step) / 16);
    const b = Math.max(
      a + 1,
      Math.floor((clipLevels.length * (step + 1)) / 16),
    );
    let level = 0;
    for (let i = a; i < b; i += 1) level = Math.max(level, clipLevels[i] ?? 0);
    return Math.max(-60, Math.round(db(level / Math.max(clipLoudest, 1e-12))));
  });
  return {
    rawSeconds: round(samples.length / rate),
    rawPeakDbfs: round(db(peak), 1),
    clippedShare: round(clipped / Math.max(1, samples.length), 5),
    clippedRunShare: round(inRuns / Math.max(1, samples.length), 5),
    leadMs: Math.round((trimStart / rate) * 1000),
    leadInShare: round(total > 0 ? lead / total : 0, 4),
    trimStartSeconds: round(start / rate),
    trimEndSeconds: round(end / rate),
    trimmedSeconds: round((end - start) / rate),
    onsetMs: Math.round(((onset - startHop) * hop * 1000) / rate),
    tailMs: Math.round(
      ((clipLevels.length - 1 - tailStart) * hop * 1000) / rate,
    ),
    energyPastLength: round(total > 0 ? past / total : 0, 4),
    clipSeconds: round(clip.length / rate),
    storedLufs: round(momentaryLufsV1(stored, rate), 1),
    crestDb: round(db(clipPeak / Math.max(rms, 1e-12)), 1),
    centroidHz: spectrum.centroidHz,
    bands: spectrum.bands,
    fingerprint: spectrum.fingerprint,
    shape,
  };
}

/** Fades in and out (raised cosine). */
function fade(
  samples: Float32Array,
  rate: number,
  inMs: number,
  outMs: number,
): void {
  const rise = Math.max(1, Math.round((inMs / 1000) * rate));
  const fall = Math.max(1, Math.round((outMs / 1000) * rate));
  const lastIndex = samples.length - 1;
  const shape = (share: number): number =>
    0.5 - 0.5 * Math.cos(Math.PI * share);
  for (let i = 0; i < samples.length; i += 1)
    samples[i] =
      (samples[i] ?? 0) *
      shape(Math.min(1, i / rise)) *
      shape(Math.min(1, (lastIndex - i) / fall));
}

/** Head room kept before the trimmed start, so the attack is whole. */
const HEAD_ROOM_SECONDS = 0.003;

/**
 * The clip a take becomes: its trimmed stretch, from just before the
 * sound starts, cut at the sound's longest length when it runs longer,
 * faded at both ends so it starts and ends silent. Not yet scaled.
 */
export function cutClipV1(
  samples: Float32Array,
  rate: number,
  start: number,
  end: number,
  maxSeconds: number,
): Float32Array {
  const from = Math.max(0, start - Math.round(HEAD_ROOM_SECONDS * rate));
  const to = Math.min(end, from + Math.round(maxSeconds * rate));
  const clip = Float32Array.from(samples.subarray(from, to));
  const cut = to < end;
  const length = clip.length / rate;
  // A sound cut short fades over a fifth of its length (at most 120 ms);
  // one that ended by itself only needs its last few milliseconds smoothed.
  fade(
    clip,
    rate,
    2,
    cut ? Math.min(120, length * 200) : Math.min(30, length * 100),
  );
  return clip;
}

/** The rules of a kind of sound. */
export interface SfxKindRulesV1 {
  /** The onset may take at most this long. */
  readonly onsetMs: number;
  readonly minCentroidHz?: number;
  readonly maxCentroidHz?: number;
  /** At least this share of the energy below 1 kHz. */
  readonly minLowShare?: number;
  /** At least this crest factor (peak over RMS). */
  readonly minCrestDb: number;
  /** The tail may be at most this share of the clip. */
  readonly maxTailShare: number;
  /** What the score prefers beyond the rules. */
  readonly prefer?: "bright" | "low" | "short";
}

export const ELEVENLABS_SFX_KIND_RULES: Readonly<
  Record<SfxKindV1, SfxKindRulesV1>
> = {
  ui: {
    onsetMs: 15,
    minCentroidHz: 1000,
    minCrestDb: 8,
    maxTailShare: 0.7,
    prefer: "short",
  },
  "ui-error": {
    onsetMs: 30,
    minCentroidHz: 200,
    maxCentroidHz: 3500,
    minCrestDb: 4,
    maxTailShare: 0.6,
  },
  step: {
    onsetMs: 25,
    maxCentroidHz: 4000,
    minCrestDb: 8,
    maxTailShare: 0.7,
    prefer: "short",
  },
  // A unit's move (bead pulp_wars-2yc.57): a short soft shuffle or a lap
  // of water that may swell a little, never bright and never deep: a
  // laptop plays little under about 150 Hz, and a take centred under
  // 200 Hz has most of its energy there (the old step's default was
  // centred near 25 Hz). Shorter is preferred.
  move: {
    onsetMs: 120,
    minCentroidHz: 200,
    maxCentroidHz: 4000,
    minCrestDb: 5,
    maxTailShare: 0.6,
    prefer: "short",
  },
  hit: { onsetMs: 30, minLowShare: 0.3, minCrestDb: 8, maxTailShare: 0.75 },
  pop: { onsetMs: 25, minCrestDb: 8, maxTailShare: 0.75 },
  clang: { onsetMs: 25, minCentroidHz: 800, minCrestDb: 8, maxTailShare: 0.8 },
  whoosh: { onsetMs: 150, minCrestDb: 4, maxTailShare: 0.7 },
  zap: { onsetMs: 40, minCentroidHz: 500, minCrestDb: 4, maxTailShare: 0.7 },
  burst: { onsetMs: 30, minCrestDb: 6, maxTailShare: 0.6 },
  heavy: {
    onsetMs: 80,
    minLowShare: 0.45,
    maxCentroidHz: 3500,
    minCrestDb: 6,
    maxTailShare: 0.75,
    prefer: "low",
  },
  boom: {
    onsetMs: 40,
    minLowShare: 0.5,
    maxCentroidHz: 3000,
    minCrestDb: 7,
    maxTailShare: 0.8,
    prefer: "low",
  },
  // A chime centred under 1 kHz is duller than the synthesised sounds it
  // replaces (their tones run from 0.5 to 1.6 kHz). 1.5 kHz was the first
  // round's bound; it failed bells pitched exactly where the synth's are.
  bright: {
    onsetMs: 60,
    minCentroidHz: 1000,
    minCrestDb: 5,
    maxTailShare: 0.8,
    prefer: "bright",
  },
  effect: { onsetMs: 150, minCrestDb: 4, maxTailShare: 0.7 },
  vocal: {
    onsetMs: 80,
    minCentroidHz: 150,
    maxCentroidHz: 3500,
    minCrestDb: 4,
    maxTailShare: 0.7,
  },
  stinger: { onsetMs: 80, minCrestDb: 4, maxTailShare: 0.6 },
};

/** Which rules a take broke; empty when it passes. */
export function takeFailuresV1(
  sound: Pick<SfxPromptV1, "kind" | "minSeconds" | "maxSeconds">,
  m: TakeMeasurementV1,
): string[] {
  const rules = ELEVENLABS_SFX_KIND_RULES[sound.kind];
  const failures: string[] = [];
  if (m.rawPeakDbfs < SILENT_DBFS)
    failures.push(`silent (peak ${m.rawPeakDbfs} dBFS)`);
  if (m.clippedRunShare > MAX_CLIPPED_RUN_SHARE)
    failures.push(
      `clipped (${(m.clippedRunShare * 100).toFixed(2)}% of samples flat at full scale)`,
    );
  if (m.trimmedSeconds < sound.minSeconds)
    failures.push(
      `too short (${m.trimmedSeconds} s, wants ${sound.minSeconds} s)`,
    );
  if (m.energyPastLength > MAX_ENERGY_PAST_LENGTH)
    failures.push(
      `too long (${(m.energyPastLength * 100).toFixed(0)}% of its energy after ${sound.maxSeconds} s)`,
    );
  if (m.leadInShare > MAX_LEAD_IN_SHARE)
    failures.push(
      `busy lead-in (${Math.round(m.leadInShare * 100)}% of its energy before the attack)`,
    );
  if (m.onsetMs > rules.onsetMs)
    failures.push(`slow onset (${m.onsetMs} ms, at most ${rules.onsetMs})`);
  if (
    m.tailMs / 1000 > rules.maxTailShare * Math.max(m.clipSeconds, 0.05) &&
    m.tailMs > 60
  )
    failures.push(
      `long tail (${m.tailMs} ms of ${Math.round(m.clipSeconds * 1000)})`,
    );
  if (rules.minCentroidHz !== undefined && m.centroidHz < rules.minCentroidHz)
    failures.push(
      `too dull (centroid ${m.centroidHz} Hz, at least ${rules.minCentroidHz})`,
    );
  if (rules.maxCentroidHz !== undefined && m.centroidHz > rules.maxCentroidHz)
    failures.push(
      `too bright (centroid ${m.centroidHz} Hz, at most ${rules.maxCentroidHz})`,
    );
  const hiss = m.bands[3];
  const maxHiss = sound.kind === "bright" ? 0.9 : 0.75;
  if (hiss > maxHiss)
    failures.push(
      `hissy (${Math.round(hiss * 100)}% of energy above 4 kHz, at most ${Math.round(maxHiss * 100)}%)`,
    );
  const low = m.bands[0] + m.bands[1];
  if (rules.minLowShare !== undefined && low < rules.minLowShare)
    failures.push(
      `too thin (${Math.round(low * 100)}% of energy under 1 kHz, at least ${Math.round(rules.minLowShare * 100)}%)`,
    );
  if (m.crestDb < rules.minCrestDb)
    failures.push(
      `squashed (crest ${m.crestDb} dB, at least ${rules.minCrestDb})`,
    );
  return failures;
}

/**
 * How well a passing take fits its sound; lower is better. Length near
 * the middle of its range, a quick onset, a short tail, and the kind's
 * own preference (brighter, lower or shorter).
 */
export function takeScoreV1(
  sound: Pick<SfxPromptV1, "kind" | "minSeconds" | "maxSeconds">,
  m: TakeMeasurementV1,
): number {
  const rules = ELEVENLABS_SFX_KIND_RULES[sound.kind];
  const target = (sound.minSeconds + sound.maxSeconds) / 2;
  const span = Math.max(0.05, sound.maxSeconds - sound.minSeconds);
  let score = Math.abs(m.clipSeconds - target) / span;
  score += 0.6 * (m.onsetMs / rules.onsetMs);
  score += 0.5 * (m.tailMs / 1000 / Math.max(m.clipSeconds, 0.05));
  score += 4 * m.energyPastLength + 4 * m.leadInShare;
  if (rules.prefer === "bright")
    score += 0.5 * Math.max(0, 1 - m.centroidHz / 5000);
  if (rules.prefer === "low") score += 0.5 * (1 - (m.bands[0] + m.bands[1]));
  if (rules.prefer === "short")
    score += 0.5 * (m.clipSeconds / sound.maxSeconds);
  return round(score, 3);
}

/**
 * How alike two takes are, 0 to 1: the cosine of their spectrum
 * fingerprints and loudness shapes (each centred), averaged.
 */
export function takeSimilarityV1(
  a: TakeMeasurementV1,
  b: TakeMeasurementV1,
): number {
  const cosine = (x: readonly number[], y: readonly number[]): number => {
    const mean = (values: readonly number[]): number =>
      values.reduce((sum, value) => sum + value, 0) /
      Math.max(1, values.length);
    const mx = mean(x);
    const my = mean(y);
    let dot = 0;
    let nx = 0;
    let ny = 0;
    for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
      const u = (x[i] ?? 0) - mx;
      const v = (y[i] ?? 0) - my;
      dot += u * v;
      nx += u * u;
      ny += v * v;
    }
    return nx > 0 && ny > 0 ? dot / Math.sqrt(nx * ny) : 1;
  };
  const lengthRatio =
    Math.min(a.clipSeconds, b.clipSeconds) /
    Math.max(a.clipSeconds, b.clipSeconds, 1e-6);
  return round(
    ((cosine(a.fingerprint, b.fingerprint) + cosine(a.shape, b.shape)) / 2) *
      lengthRatio,
    3,
  );
}
