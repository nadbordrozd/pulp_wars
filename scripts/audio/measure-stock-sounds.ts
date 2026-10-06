import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { downmixV1, readWavFramesV1, readWavInfoV1 } from "./wav-pcm";

/**
 * Measures every WAV file of a sound library folder (beads pulp_wars-2yc.20
 * and pulp_wars-2yc.24, docs/ui/SOUND.md "Stock recordings"), for choosing
 * clips without listening: format, length, the separate events in the file
 * (found from the loudness envelope) and, for each event, its length,
 * level, attack, decay, where its energy lies in the spectrum and how its
 * pitch moves.
 *
 *   npx tsx scripts/audio/measure-stock-sounds.ts <library-folder> <out-folder>
 *
 * The folder is one unpacked part of the bundle, or the folder the parts
 * were unpacked in (every WAV file below it is measured). It only reads
 * the library folder. It writes `measurements.json` and
 * `measurements.txt` to the out folder, which must be outside the
 * repository (the measurements name library files).
 */

export interface StockEventMeasurementV1 {
  readonly index: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationMs: number;
  readonly peakDb: number;
  readonly rmsDb: number;
  /** From the start of the event to its loudest 5 ms. */
  readonly attackMs: number;
  /** From the loudest 5 ms until the level has fallen by 20 dB. */
  readonly decay20Ms: number;
  /** Spectral centroid in Hz over the first 0.7 s of the event. */
  readonly centroidHz: number;
  /** The strongest frequency in Hz. */
  readonly dominantHz: number;
  /** 0 is a pure tone, 1 is noise (spectral flatness, 100 Hz to 8 kHz). */
  readonly flatness: number;
  /** Shares of the energy below 150 Hz, to 1 kHz, to 4 kHz, and above. */
  readonly bands: readonly [number, number, number, number];
  /**
   * The pitch in Hz at six points of the event, 0 where there is no clear
   * pitch: a rising jingle reads low to high, a falling one high to low.
   */
  readonly pitch: readonly number[];
  /** The envelope of the event as 24 levels, 0 (silent) to 8 (its peak). */
  readonly shape: string;
}

export interface StockFileMeasurementV1 {
  readonly file: string;
  readonly description: string;
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  readonly durationSeconds: number;
  readonly bytes: number;
  /** Null for a file too long to be a source of short clips. */
  readonly peakDb: number | null;
  readonly headSilenceMs: number | null;
  readonly tailSilenceMs: number | null;
  readonly shape: string | null;
  readonly events: readonly StockEventMeasurementV1[];
}

export const MEASURE_HOP_SECONDS_V1 = 0.005;
/** Files longer than this are listed with their format only. */
const MAX_MEASURED_SECONDS = 120;
/** An event ends when the level stays this far below the file's peak... */
const EVENT_FLOOR_DB = -38;
/** ...for at least this long. */
const EVENT_GAP_SECONDS = 0.12;
const MIN_EVENT_SECONDS = 0.015;

const db = (value: number): number =>
  value <= 1e-9 ? -180 : 20 * Math.log10(value);
const round = (value: number, digits = 1): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

/** The RMS level of each hop of `hopSeconds`. */
export function envelopeV1(
  samples: Float32Array,
  sampleRate: number,
  hopSeconds: number = MEASURE_HOP_SECONDS_V1,
): Float32Array {
  const hop = Math.max(1, Math.round(hopSeconds * sampleRate));
  const count = Math.ceil(samples.length / hop);
  const envelope = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    let squares = 0;
    const end = Math.min(samples.length, (i + 1) * hop);
    for (let j = i * hop; j < end; j += 1)
      squares += (samples[j] ?? 0) * (samples[j] ?? 0);
    envelope[i] = Math.sqrt(squares / Math.max(1, end - i * hop));
  }
  return envelope;
}

/** Events as [first hop, hop after the last] pairs. */
export function findEventsV1(
  envelope: Float32Array,
  hopSeconds: number = MEASURE_HOP_SECONDS_V1,
  floorDb: number = EVENT_FLOOR_DB,
): [number, number][] {
  let peak = 0;
  for (const value of envelope) peak = Math.max(peak, value);
  if (peak <= 0) return [];
  const floor = Math.max(peak * 10 ** (floorDb / 20), 10 ** (-66 / 20));
  const gap = Math.round(EVENT_GAP_SECONDS / hopSeconds);
  const events: [number, number][] = [];
  let start = -1;
  let quiet = 0;
  for (let i = 0; i <= envelope.length; i += 1) {
    const loud = i < envelope.length && (envelope[i] ?? 0) > floor;
    if (loud) {
      if (start < 0) start = i;
      quiet = 0;
    } else if (start >= 0) {
      quiet += 1;
      if (quiet >= gap || i === envelope.length) {
        const end = i - quiet + 1;
        if ((end - start) * hopSeconds >= MIN_EVENT_SECONDS)
          events.push([start, end]);
        start = -1;
        quiet = 0;
      }
    }
  }
  return events;
}

function sparkline(
  envelope: Float32Array,
  from: number,
  to: number,
  cells: number,
): string {
  let peak = 0;
  for (let i = from; i < to; i += 1) peak = Math.max(peak, envelope[i] ?? 0);
  if (peak <= 0) return "0".repeat(cells);
  let text = "";
  for (let cell = 0; cell < cells; cell += 1) {
    const a = from + Math.floor(((to - from) * cell) / cells);
    const b = Math.max(
      a + 1,
      from + Math.floor(((to - from) * (cell + 1)) / cells),
    );
    let level = 0;
    for (let i = a; i < b && i < to; i += 1)
      level = Math.max(level, envelope[i] ?? 0);
    // 6 dB a step below the peak: 8 is the peak, 0 is 48 dB or more below.
    text += String(
      Math.max(0, Math.min(8, Math.round(8 + db(level / peak) / 6))),
    );
  }
  return text;
}

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] ?? 0;
      re[i] = re[j] ?? 0;
      re[j] = tr;
      const ti = im[i] ?? 0;
      im[i] = im[j] ?? 0;
      im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < size / 2; k += 1) {
        const a = start + k;
        const b = a + size / 2;
        const xr = (re[b] ?? 0) * cr - (im[b] ?? 0) * ci;
        const xi = (re[b] ?? 0) * ci + (im[b] ?? 0) * cr;
        re[b] = (re[a] ?? 0) - xr;
        im[b] = (im[a] ?? 0) - xi;
        re[a] = (re[a] ?? 0) + xr;
        im[a] = (im[a] ?? 0) + xi;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

export interface SpectrumSummaryV1 {
  readonly centroidHz: number;
  readonly dominantHz: number;
  readonly flatness: number;
  readonly bands: readonly [number, number, number, number];
}

/** The power spectrum of up to 0.7 s of samples, summarised. */
export function spectrumSummaryV1(
  samples: Float32Array,
  sampleRate: number,
): SpectrumSummaryV1 {
  const wanted = Math.min(samples.length, Math.round(0.7 * sampleRate));
  let size = 256;
  while (size < wanted && size < 131072) size <<= 1;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const used = Math.min(wanted, size);
  for (let i = 0; i < used; i += 1)
    re[i] =
      (samples[i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / used));
  fft(re, im);
  const bands: [number, number, number, number] = [0, 0, 0, 0];
  let total = 0;
  let weighted = 0;
  let best = 0;
  let dominant = 0;
  let logSum = 0;
  let linSum = 0;
  let flatBins = 0;
  for (let bin = 1; bin < size / 2; bin += 1) {
    const hz = (bin * sampleRate) / size;
    if (hz < 20 || hz > 20000) continue;
    const power = (re[bin] ?? 0) ** 2 + (im[bin] ?? 0) ** 2;
    total += power;
    weighted += power * hz;
    if (power > best) {
      best = power;
      dominant = hz;
    }
    bands[hz < 150 ? 0 : hz < 1000 ? 1 : hz < 4000 ? 2 : 3] += power;
    if (hz >= 100 && hz <= 8000) {
      logSum += Math.log(power + 1e-20);
      linSum += power;
      flatBins += 1;
    }
  }
  const share = (value: number): number =>
    total > 0 ? round(value / total, 2) : 0;
  return {
    centroidHz: total > 0 ? Math.round(weighted / total) : 0,
    dominantHz: Math.round(dominant),
    flatness:
      flatBins > 0 && linSum > 0
        ? round(Math.exp(logSum / flatBins) / (linSum / flatBins), 3)
        : 0,
    bands: [share(bands[0]), share(bands[1]), share(bands[2]), share(bands[3])],
  };
}

export interface PitchPointV1 {
  /** The pitch in Hz; 0 when none was found. */
  readonly hz: number;
  /** How periodic the stretch is: 1 is a pure tone, below 0.5 is noise. */
  readonly clarity: number;
}

/**
 * The pitch of a stretch of samples, from its autocorrelation (70 Hz to
 * 3 kHz). The stretch is averaged down to about 12 kHz first; the lags
 * before the correlation first falls are skipped, since a low sound
 * correlates with itself there whatever its pitch.
 */
export function pitchV1(
  samples: Float32Array,
  sampleRate: number,
): PitchPointV1 {
  const step = Math.max(1, Math.floor(sampleRate / 12000));
  const count = Math.floor(samples.length / step);
  if (count < 32) return { hz: 0, clarity: 0 };
  const values = new Float64Array(count);
  let mean = 0;
  for (let i = 0; i < count; i += 1) {
    let sum = 0;
    for (let j = 0; j < step; j += 1) sum += samples[i * step + j] ?? 0;
    values[i] = sum / step;
    mean += (values[i] ?? 0) / count;
  }
  for (let i = 0; i < count; i += 1) values[i] = (values[i] ?? 0) - mean;
  const rate = sampleRate / step;
  const minLag = Math.max(2, Math.floor(rate / 3000));
  const maxLag = Math.min(Math.floor(count / 2), Math.floor(rate / 70));
  let best = 0;
  let bestLag = 0;
  let dipped = false;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let product = 0;
    let left = 0;
    let right = 0;
    for (let i = 0; i + lag < count; i += 1) {
      const a = values[i] ?? 0;
      const b = values[i + lag] ?? 0;
      product += a * b;
      left += a * a;
      right += b * b;
    }
    const correlation = product / Math.sqrt(left * right + 1e-30);
    if (!dipped) {
      if (correlation < 0.2) dipped = true;
      continue;
    }
    if (correlation > best + 0.02) {
      best = correlation;
      bestLag = lag;
    }
  }
  return {
    hz: bestLag > 0 ? Math.round(rate / bestLag) : 0,
    clarity: round(best, 2),
  };
}

/** The pitch at `points` equal steps of the samples (at most 0.2 s each). */
export function pitchContourV1(
  samples: Float32Array,
  sampleRate: number,
  points: number,
): PitchPointV1[] {
  const contour: PitchPointV1[] = [];
  const span = Math.floor(samples.length / points);
  const window = Math.min(span, Math.round(0.2 * sampleRate));
  for (let point = 0; point < points; point += 1)
    contour.push(
      pitchV1(
        samples.subarray(point * span, point * span + window),
        sampleRate,
      ),
    );
  return contour;
}

export function measureMonoV1(
  mono: Float32Array,
  sampleRate: number,
): Pick<
  StockFileMeasurementV1,
  "peakDb" | "headSilenceMs" | "tailSilenceMs" | "shape" | "events"
> {
  const hop = MEASURE_HOP_SECONDS_V1;
  const envelope = envelopeV1(mono, sampleRate, hop);
  let peak = 0;
  for (const value of mono) peak = Math.max(peak, Math.abs(value));
  const spans = findEventsV1(envelope, hop);
  const events = spans.map(([from, to], index): StockEventMeasurementV1 => {
    let top = from;
    let squares = 0;
    let eventPeak = 0;
    for (let i = from; i < to; i += 1) {
      if ((envelope[i] ?? 0) > (envelope[top] ?? 0)) top = i;
      squares += (envelope[i] ?? 0) ** 2;
    }
    const firstSample = Math.round(from * hop * sampleRate);
    const lastSample = Math.min(mono.length, Math.round(to * hop * sampleRate));
    for (let i = firstSample; i < lastSample; i += 1)
      eventPeak = Math.max(eventPeak, Math.abs(mono[i] ?? 0));
    let fallen = to;
    for (let i = top; i < to; i += 1)
      if ((envelope[i] ?? 0) < (envelope[top] ?? 0) * 0.1) {
        fallen = i;
        break;
      }
    return {
      index,
      startSeconds: round(from * hop, 3),
      endSeconds: round(to * hop, 3),
      durationMs: Math.round((to - from) * hop * 1000),
      peakDb: round(db(eventPeak)),
      rmsDb: round(db(Math.sqrt(squares / Math.max(1, to - from)))),
      attackMs: Math.round((top - from) * hop * 1000),
      decay20Ms: Math.round((fallen - top) * hop * 1000),
      ...spectrumSummaryV1(mono.subarray(firstSample, lastSample), sampleRate),
      pitch: pitchContourV1(
        mono.subarray(firstSample, lastSample),
        sampleRate,
        6,
      ).map((point) => (point.clarity < 0.5 ? 0 : point.hz)),
      shape: sparkline(envelope, from, to, 24),
    };
  });
  const first = spans[0];
  const last = spans[spans.length - 1];
  return {
    peakDb: round(db(peak)),
    headSilenceMs:
      first === undefined ? null : Math.round(first[0] * hop * 1000),
    tailSilenceMs:
      last === undefined
        ? null
        : Math.round((envelope.length - last[1]) * hop * 1000),
    shape: sparkline(envelope, 0, envelope.length, 60),
    events,
  };
}

function wavFiles(folder: string): string[] {
  return readdirSync(folder, { recursive: true })
    .map((entry) => join(folder, String(entry)))
    .filter((path) => /\.wav$/i.test(path))
    .sort();
}

function main(): void {
  const [library, out] = process.argv.slice(2);
  if (library === undefined || out === undefined) {
    console.error(
      "Usage: tsx scripts/audio/measure-stock-sounds.ts <library-folder> <out-folder>",
    );
    process.exit(2);
  }
  let files: string[];
  try {
    files = wavFiles(library);
  } catch {
    console.error(`Library folder not found: ${library}`);
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  const rows: StockFileMeasurementV1[] = [];
  const text: string[] = [];
  for (const path of files) {
    const file = relative(library, path);
    try {
      const info = readWavInfoV1(path);
      const base = {
        file,
        description: info.description,
        sampleRate: info.sampleRate,
        channels: info.channels,
        bitsPerSample: info.bitsPerSample,
        durationSeconds: round(info.durationSeconds, 3),
        bytes: statSync(path).size,
      };
      const row: StockFileMeasurementV1 =
        info.durationSeconds > MAX_MEASURED_SECONDS
          ? {
              ...base,
              peakDb: null,
              headSilenceMs: null,
              tailSilenceMs: null,
              shape: null,
              events: [],
            }
          : {
              ...base,
              ...measureMonoV1(
                downmixV1(readWavFramesV1(info)),
                info.sampleRate,
              ),
            };
      rows.push(row);
      text.push(
        `\n${file}\n  ${row.channels} ch ${row.sampleRate} Hz ${row.bitsPerSample}-bit ${row.durationSeconds} s` +
          (row.peakDb === null
            ? " (too long, not measured)"
            : ` peak ${row.peakDb} dB head ${row.headSilenceMs} ms tail ${row.tailSilenceMs} ms events ${row.events.length}`) +
          (row.description === "" ? "" : `\n  text: ${row.description}`) +
          (row.shape === null ? "" : `\n  ${row.shape}`),
      );
      for (const event of row.events.slice(0, 40))
        text.push(
          `  #${event.index} ${event.startSeconds}-${event.endSeconds}s ${event.durationMs}ms peak ${event.peakDb} rms ${event.rmsDb} att ${event.attackMs} dec20 ${event.decay20Ms} cen ${event.centroidHz} dom ${event.dominantHz} flat ${event.flatness} bands ${event.bands.join("/")} pitch ${event.pitch.join(",")} ${event.shape}`,
        );
      if (row.events.length > 40)
        text.push(`  ... ${row.events.length - 40} more events`);
    } catch (error) {
      text.push(`\n${file}\n  ERROR ${String(error)}`);
    }
  }
  writeFileSync(join(out, "measurements.json"), JSON.stringify(rows, null, 1));
  writeFileSync(join(out, "measurements.txt"), text.join("\n") + "\n");
  console.log(`${rows.length} of ${files.length} files measured -> ${out}`);
}

if (process.argv[1]?.endsWith("measure-stock-sounds.ts") === true) main();
