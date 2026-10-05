/**
 * The sound synthesiser (bead pulp_wars-2yc.10, docs/ui/SOUND.md). A recipe
 * is plain data: a few layers, each an oscillator or noise with a pitch
 * glide, an envelope and simple filters. `renderSynthRecipeV1` turns one
 * into mono samples with ordinary arithmetic only, so the same code runs in
 * the browser (the samples fill an `AudioBuffer`) and in a test (which
 * checks duration, level, offset and brightness without a sound card).
 *
 * Nothing here touches the DOM, WebAudio, a clock or `Math.random`: noise
 * comes from a seeded generator, so a recipe always renders the same
 * samples.
 */

export type SynthWaveV1 = "sine" | "triangle" | "square" | "saw" | "noise";

export interface SynthLayerV1 {
  readonly wave: SynthWaveV1;
  /** Start of the layer, in ms from the start of the sound (default 0). */
  readonly at?: number;
  /** Length of the layer in ms. */
  readonly ms: number;
  /**
   * Pitch in Hz at the start of the layer. For noise it is optional: the
   * rate of a sample-and-hold, which gives the grainy noise of old consoles.
   */
  readonly hz?: number;
  /** Pitch at the end of the layer (an exponential glide from `hz`). */
  readonly hzEnd?: number;
  /** Level of the layer relative to the others (default 1). */
  readonly gain?: number;
  /** Rise time in ms (default 4). */
  readonly attackMs?: number;
  /** Time held at full level after the rise, in ms (default 0). */
  readonly holdMs?: number;
  /** Shape of the fall to silence: 1 is a straight line, more is snappier. */
  readonly decay?: number;
  /** Low-pass cut-off in Hz, and where it glides to by the end. */
  readonly lowpassHz?: number;
  readonly lowpassEndHz?: number;
  /** High-pass cut-off in Hz. */
  readonly highpassHz?: number;
  /** Frequency modulation of a sine or triangle (bells, energy sounds). */
  readonly fm?: {
    readonly ratio: number;
    readonly index: number;
    readonly indexEnd?: number;
  };
  /** Pitch wobble: rate in Hz and depth in cents. */
  readonly vibrato?: { readonly hz: number; readonly cents: number };
  /** Pulse width of a square wave (default 0.5). */
  readonly duty?: number;
}

export interface SynthRecipeV1 {
  readonly layers: readonly SynthLayerV1[];
  /** Peak level of the rendered sound, 0 to 1 (kept well below clipping). */
  readonly peak: number;
}

/** The sample rate recipes are rendered at. */
export const SYNTH_SAMPLE_RATE_V1 = 44100;
/** Silence after the last layer, so the last filter settles. */
const TAIL_MS = 12;
const FADE_IN_MS = 1;
const FADE_OUT_MS = 5;

/** Length of a recipe in ms (its last layer's end, plus a short tail). */
export function synthRecipeDurationMsV1(recipe: SynthRecipeV1): number {
  let end = 0;
  for (const layer of recipe.layers)
    end = Math.max(end, (layer.at ?? 0) + layer.ms);
  return end + TAIL_MS;
}

/** Renders a recipe to mono samples in [-peak, peak]. */
export function renderSynthRecipeV1(
  recipe: SynthRecipeV1,
  sampleRate: number = SYNTH_SAMPLE_RATE_V1,
): Float32Array {
  const length = Math.max(
    1,
    Math.ceil((synthRecipeDurationMsV1(recipe) / 1000) * sampleRate),
  );
  const mix = new Float64Array(length);
  recipe.layers.forEach((layer, index) => {
    renderLayer(mix, layer, index, sampleRate);
  });
  // Remove any offset (a 25 Hz one-pole high-pass over the whole sound).
  const block = Math.exp((-2 * Math.PI * 25) / sampleRate);
  let previousIn = 0;
  let previousOut = 0;
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    const value = mix[i] ?? 0;
    const out = block * (previousOut + value - previousIn);
    previousIn = value;
    previousOut = out;
    mix[i] = out;
    peak = Math.max(peak, Math.abs(out));
  }
  const fadeIn = Math.max(1, Math.round((FADE_IN_MS / 1000) * sampleRate));
  const fadeOut = Math.max(1, Math.round((FADE_OUT_MS / 1000) * sampleRate));
  const scale = peak > 0 ? clamp(recipe.peak, 0, 1) / peak : 0;
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const edge = Math.min(1, i / fadeIn, (length - 1 - i) / fadeOut);
    samples[i] = (mix[i] ?? 0) * scale * edge;
  }
  return samples;
}

function renderLayer(
  mix: Float64Array,
  layer: SynthLayerV1,
  index: number,
  sampleRate: number,
): void {
  const start = Math.round(((layer.at ?? 0) / 1000) * sampleRate);
  const count = Math.max(1, Math.round((layer.ms / 1000) * sampleRate));
  const gain = layer.gain ?? 1;
  const attack = Math.max(1, ((layer.attackMs ?? 4) / 1000) * sampleRate);
  const hold = ((layer.holdMs ?? 0) / 1000) * sampleRate;
  const fall = Math.max(1, count - attack - hold);
  const decay = layer.decay ?? 2;
  const hz = layer.hz ?? 0;
  const hzEnd = layer.hzEnd ?? hz;
  const glide = hz > 0 && hzEnd > 0 ? hzEnd / hz : 1;
  const duty = clamp(layer.duty ?? 0.5, 0.05, 0.95);
  const random = seededNoise(0x9e3779b9 ^ ((index + 1) * 0x85ebca6b));
  let phase = 0;
  let modPhase = 0;
  let held = 0;
  let heldPhase = 1;
  let low1 = 0;
  let low2 = 0;
  let highIn = 0;
  let highOut = 0;
  const highpass =
    layer.highpassHz === undefined
      ? null
      : Math.exp((-2 * Math.PI * layer.highpassHz) / sampleRate);
  for (let i = 0; i < count; i += 1) {
    const target = start + i;
    if (target >= mix.length) break;
    const u = i / count;
    let frequency = hz * Math.pow(glide, u);
    if (layer.vibrato !== undefined)
      frequency *= Math.pow(
        2,
        (layer.vibrato.cents / 1200) *
          Math.sin((2 * Math.PI * layer.vibrato.hz * i) / sampleRate),
      );
    const step = frequency / sampleRate;
    let value: number;
    if (layer.wave === "noise") {
      if (hz > 0) {
        heldPhase += step;
        if (heldPhase >= 1) {
          heldPhase -= Math.floor(heldPhase);
          held = random();
        }
        value = held;
      } else value = random();
    } else {
      let offset = 0;
      if (layer.fm !== undefined) {
        const fmIndex =
          layer.fm.index +
          ((layer.fm.indexEnd ?? layer.fm.index) - layer.fm.index) * u;
        offset = (fmIndex * Math.sin(2 * Math.PI * modPhase)) / (2 * Math.PI);
        modPhase += step * layer.fm.ratio;
        modPhase -= Math.floor(modPhase);
      }
      const p = fraction(phase + offset);
      if (layer.wave === "sine") value = Math.sin(2 * Math.PI * p);
      else if (layer.wave === "triangle")
        value = p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
      else if (layer.wave === "saw") value = 2 * p - 1 - polyBlep(p, step);
      else
        value =
          (p < duty ? 1 : -1) +
          polyBlep(p, step) -
          polyBlep(fraction(p + 1 - duty), step) -
          // A pulse other than 50% has an offset; take it out at the source.
          (2 * duty - 1);
      phase += step;
      phase -= Math.floor(phase);
    }
    if (layer.lowpassHz !== undefined) {
      const cutoff =
        layer.lowpassHz *
        Math.pow((layer.lowpassEndHz ?? layer.lowpassHz) / layer.lowpassHz, u);
      const k =
        1 -
        Math.exp(
          (-2 * Math.PI * Math.min(cutoff, sampleRate / 2)) / sampleRate,
        );
      low1 += k * (value - low1);
      low2 += k * (low1 - low2);
      value = low2;
    }
    if (highpass !== null) {
      const out = highpass * (highOut + value - highIn);
      highIn = value;
      highOut = out;
      value = out;
    }
    const envelope =
      i < attack
        ? i / attack
        : i < attack + hold
          ? 1
          : Math.pow(Math.max(0, 1 - (i - attack - hold) / fall), decay);
    mix[target] = (mix[target] ?? 0) + value * envelope * gain;
  }
}

/** Band-limits the step of a saw or a pulse (less aliasing, less harsh). */
function polyBlep(p: number, step: number): number {
  if (step <= 0) return 0;
  if (p < step) {
    const x = p / step;
    return x + x - x * x - 1;
  }
  if (p > 1 - step) {
    const x = (p - 1) / step;
    return x * x + x + x + 1;
  }
  return 0;
}

function fraction(value: number): number {
  return value - Math.floor(value);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** A small deterministic generator of white noise in [-1, 1). */
function seededNoise(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x8000_0000 - 1;
  };
}

/** What a test and the recipe table measure of a rendered sound. */
export interface SynthMeasurementV1 {
  readonly durationMs: number;
  readonly peak: number;
  readonly rms: number;
  /** Mean of the samples: an offset would thump the loudspeaker. */
  readonly offset: number;
  /**
   * Brightness in Hz: the pitch of a pure tone whose sample-to-sample
   * change is as large as this sound's. High values sound harsh.
   */
  readonly brightnessHz: number;
  readonly finite: boolean;
  readonly firstSample: number;
  readonly lastSample: number;
}

export function measureSynthSamplesV1(
  samples: Float32Array,
  sampleRate: number = SYNTH_SAMPLE_RATE_V1,
): SynthMeasurementV1 {
  let peak = 0;
  let sum = 0;
  let squares = 0;
  let differences = 0;
  let finite = true;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i] ?? 0;
    if (!Number.isFinite(value)) finite = false;
    peak = Math.max(peak, Math.abs(value));
    sum += value;
    squares += value * value;
    if (i > 0) {
      const difference = value - (samples[i - 1] ?? 0);
      differences += difference * difference;
    }
  }
  const count = Math.max(1, samples.length);
  const ratio = squares > 0 ? Math.sqrt(differences / squares) : 0;
  return {
    durationMs: (samples.length / sampleRate) * 1000,
    peak,
    rms: Math.sqrt(squares / count),
    offset: sum / count,
    brightnessHz: (sampleRate / Math.PI) * Math.asin(Math.min(1, ratio / 2)),
    finite,
    firstSample: samples[0] ?? 0,
    lastSample: samples[samples.length - 1] ?? 0,
  };
}
