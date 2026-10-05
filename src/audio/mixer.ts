import {
  SOUND_MANIFEST_V1,
  type SoundCategoryV1,
  type SoundIdV1,
} from "./sound-manifest";

/**
 * The mixer's policy (bead pulp_wars-2yc.10, docs/ui/SOUND.md): which
 * requested sounds start, how loud and at what pitch. It keeps an AI turn
 * with many events from becoming a wall of noise: a sound asked for again
 * within `coalesceMs` is dropped, at most `maxVoices` sounds play at once
 * (a more important sound takes the voice of a lesser one), and each play
 * is detuned a little so repeats do not sound mechanical.
 *
 * It decides only; `SoundOutputV1` makes the sound. Tests pass a fake
 * output, clock and random source.
 */

export interface SoundStartV1 {
  readonly id: SoundIdV1;
  readonly category: SoundCategoryV1;
  /** Level of this play, 0 to 1 (the output applies master volume). */
  readonly gain: number;
  /** Playback rate: 1 is the recipe's own pitch. */
  readonly rate: number;
  /** Seconds from now until the sound starts. */
  readonly delaySeconds: number;
}

/** A started sound: stops it (also before a delayed start). */
export type SoundStopV1 = () => void;

export interface SoundOutputV1 {
  /** Starts a sound, or returns null when it cannot (no device yet). */
  start(request: SoundStartV1): { readonly stop: SoundStopV1 } | null;
  /** Length of a sound in ms at rate 1 (for voice counting). */
  durationMs(id: SoundIdV1): number;
}

export type SoundPlayOutcomeV1 =
  /** Handed to the output. */
  | "PLAYED"
  /** The same sound started within the coalescing window. */
  | "COALESCED"
  /** Every voice was busy with sounds at least as important. */
  | "DROPPED"
  /** The output could not start it. */
  | "UNAVAILABLE";

export const DEFAULT_CATEGORY_GAINS_V1: Readonly<
  Record<SoundCategoryV1, number>
> = {
  combat: 0.9,
  economy: 0.8,
  ui: 0.7,
  ambience: 0.5,
};

export interface SoundMixerOptionsV1 {
  readonly output: SoundOutputV1;
  /** Milliseconds; only differences matter. */
  readonly clock: () => number;
  /** Uniform in [0, 1). */
  readonly random: () => number;
  readonly maxVoices?: number;
  readonly coalesceMs?: number;
  readonly categoryGains?: Readonly<Record<SoundCategoryV1, number>>;
}

interface VoiceV1 {
  readonly id: SoundIdV1;
  readonly priority: number;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly stop: SoundStopV1;
}

export const DEFAULT_MAX_VOICES_V1 = 8;
export const DEFAULT_COALESCE_MS_V1 = 60;

export class SoundMixerV1 {
  readonly #output: SoundOutputV1;
  readonly #clock: () => number;
  readonly #random: () => number;
  readonly #maxVoices: number;
  readonly #coalesceMs: number;
  readonly #categoryGains: Readonly<Record<SoundCategoryV1, number>>;
  /** Per sound, the start times that can still coalesce a new request. */
  readonly #starts = new Map<SoundIdV1, number[]>();
  #voices: VoiceV1[] = [];

  constructor(options: SoundMixerOptionsV1) {
    this.#output = options.output;
    this.#clock = options.clock;
    this.#random = options.random;
    this.#maxVoices = Math.max(1, options.maxVoices ?? DEFAULT_MAX_VOICES_V1);
    this.#coalesceMs = Math.max(
      0,
      options.coalesceMs ?? DEFAULT_COALESCE_MS_V1,
    );
    this.#categoryGains = options.categoryGains ?? DEFAULT_CATEGORY_GAINS_V1;
  }

  /** Sounds started and not yet over (delayed ones included). */
  get activeVoices(): number {
    this.#expire(this.#clock());
    return this.#voices.length;
  }

  play(
    id: SoundIdV1,
    options: { readonly delayMs?: number; readonly gain?: number } = {},
  ): SoundPlayOutcomeV1 {
    const entry = SOUND_MANIFEST_V1[id];
    const now = this.#clock();
    const delayMs = Math.max(0, options.delayMs ?? 0);
    const startsAt = now + delayMs;
    // Starts already too far in the past to matter are forgotten.
    const starts = (this.#starts.get(id) ?? []).filter(
      (time) => time > now - this.#coalesceMs,
    );
    this.#starts.set(id, starts);
    if (starts.some((time) => Math.abs(startsAt - time) < this.#coalesceMs))
      return "COALESCED";
    this.#expire(now);
    if (this.#voices.length >= this.#maxVoices) {
      // The least important voice, the oldest of those, gives way.
      let weakest: VoiceV1 | undefined;
      for (const voice of this.#voices)
        if (
          weakest === undefined ||
          voice.priority < weakest.priority ||
          (voice.priority === weakest.priority &&
            voice.startsAt < weakest.startsAt)
        )
          weakest = voice;
      if (weakest === undefined || weakest.priority > entry.priority)
        return "DROPPED";
      weakest.stop();
      this.#voices = this.#voices.filter((voice) => voice !== weakest);
    }
    const cents = (this.#random() * 2 - 1) * entry.jitterCents;
    const rate = Math.pow(2, cents / 1200);
    // A crowded moment is turned down a little rather than stacked up.
    const crowd = this.#voices.length >= this.#maxVoices / 2 ? 0.75 : 1;
    const started = this.#output.start({
      id,
      category: entry.category,
      gain:
        clamp01(options.gain ?? 1) *
        this.#categoryGains[entry.category] *
        crowd,
      rate,
      delaySeconds: delayMs / 1000,
    });
    if (started === null) return "UNAVAILABLE";
    starts.push(startsAt);
    this.#voices.push({
      id,
      priority: entry.priority,
      startsAt,
      endsAt: startsAt + this.#output.durationMs(id) / rate,
      stop: started.stop,
    });
    return "PLAYED";
  }

  /** Stops everything, delayed starts included (tab hidden, sound off). */
  stopAll(): void {
    const voices = this.#voices;
    this.#voices = [];
    for (const voice of voices) voice.stop();
  }

  #expire(now: number): void {
    if (this.#voices.some((voice) => voice.endsAt <= now))
      this.#voices = this.#voices.filter((voice) => voice.endsAt > now);
  }
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
