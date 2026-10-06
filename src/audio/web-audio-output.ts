import type { SoundOutputV1, SoundStartV1, SoundStopV1 } from "./mixer";
import {
  playableRecipeV1,
  playableSoundIdsV1,
  playableSoundV1,
} from "./playable-sound";
import { soundFileBytesV1, type SoundFileFetchV1 } from "./sound-file-store";
import type { SoundKeyV1 } from "./sound-manifest";
import {
  isStockSoundChoiceV1,
  stockSoundChoiceV1,
  type StockSoundPicksV1,
} from "./stock-sound-picks";
import {
  STOCK_SOUND_GENERATED_CHOICE_V1,
  stockSoundCandidateV1,
  stockSoundUrlV1,
  stockSoundV1,
} from "./stock-sounds";
import {
  SYNTH_SAMPLE_RATE_V1,
  renderSynthRecipeV1,
  synthRecipeDurationMsV1,
} from "./synth";

/**
 * The WebAudio device behind the mixer (bead pulp_wars-2yc.10,
 * docs/ui/SOUND.md). Nothing is created when this module is imported or the
 * output is built: the `AudioContext` appears in `unlock`, which the app
 * calls from a user gesture (browser autoplay rules). Each synthesised
 * sound (an effect or a faction theme) is rendered once into an
 * `AudioBuffer`, on first use.
 *
 * A manifest entry that names a file (a recorded clip, bead
 * pulp_wars-2yc.20) is decoded after the unlock, from the bytes the game's
 * start already fetched (`sound-file-store.ts`) or from a fetch of its own.
 * Until it is decoded, and if it cannot be fetched or decoded, the entry's
 * synthesised fallback plays: a missing or broken file is never silence
 * and never an error. With `stockSounds` off no file that has a fallback
 * is fetched, and every such sound is synthesised.
 *
 * A sound with several recordings (bead pulp_wars-2yc.24) plays its
 * default one, or the one this browser picked (`setPick`); a pick of 0 is
 * the synthesised sound. Only that one recording is fetched when the
 * device opens. Another candidate is fetched when it is asked for
 * (`prepareCandidate`, the Gallery's numbered controls) or picked.
 *
 * Voices run through one master gain and a gentle limiter, so several
 * sounds at once cannot clip.
 */
export interface WebAudioOutputV1 extends SoundOutputV1 {
  /** True once a gesture has created the context. */
  readonly unlocked: boolean;
  /** Whether recorded clips replace the sounds that have one. */
  readonly stockSounds: boolean;
  /** Creates the context if needed and resumes it. Call from a gesture. */
  unlock(): void;
  /** Master volume, 0 to 1. */
  setVolume(volume: number): void;
  /**
   * What a play of this sound uses right now: its recording once that is
   * decoded, else the synthesiser. Null for a sound with neither.
   */
  soundSource(id: SoundKeyV1): "RECORDED" | "GENERATED" | null;
  /**
   * The recording a play of this sound uses right now, by its candidate
   * number: 0 while it plays the synthesised sound (by choice, or because
   * the recording is not decoded yet). Null for a sound without
   * recordings in the provenance manifest.
   */
  soundCandidate(id: SoundKeyV1): number | null;
  /**
   * This browser's choice for a sound: a candidate's number, 0 for the
   * synthesised sound, null for the sound's default. A choice the sound
   * does not have is ignored. The chosen recording is fetched if needed.
   */
  setPick(id: SoundKeyV1, pick: number | null): void;
  /**
   * Fetches and decodes one recording of a sound, so that it can be
   * played by its candidate number. Resolves to whether it is ready;
   * false before the device has opened and with recordings switched off.
   */
  prepareCandidate(id: SoundKeyV1, candidate: number): Promise<boolean>;
  close(): void;
}

export interface WebAudioOutputOptionsV1 {
  /** False plays every sound that has a synth recipe from it. Default true. */
  readonly stockSounds?: boolean;
  /** This browser's picks among the recordings; none by default. */
  readonly picks?: StockSoundPicksV1;
}

type AudioContextConstructor = new () => AudioContext;

/** Null where the browser (or a test's window) has no WebAudio. */
export function createWebAudioOutputV1(
  browser: (Window & typeof globalThis) | null,
  options: WebAudioOutputOptionsV1 = {},
): WebAudioOutputV1 | null {
  if (browser === null) return null;
  const constructor = (Reflect.get(browser, "AudioContext") ??
    Reflect.get(browser, "webkitAudioContext")) as
    AudioContextConstructor | undefined;
  if (typeof constructor !== "function") return null;
  const stockSounds = options.stockSounds ?? true;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let volume = 1;
  let closed = false;
  /** Rendered synth recipes. */
  const synthBuffers = new Map<SoundKeyV1, AudioBuffer>();
  /** Decoded files, by their URL. */
  const fileBuffers = new Map<string, AudioBuffer>();
  /** Files being fetched and decoded, by their URL. */
  const loading = new Map<string, Promise<boolean>>();
  const picks = new Map<string, number>();
  for (const [id, pick] of Object.entries(options.picks ?? {}))
    if (isStockSoundChoiceV1(id, pick)) picks.set(id, pick);

  interface FileChoice {
    readonly url: string;
    /** The level the decoded file is played at. */
    readonly gain: number;
    /** Its candidate number, for a sound of the provenance manifest. */
    readonly candidate: number | null;
  }

  const level = (gain: number | undefined): number => {
    const value = gain ?? 1;
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
  };

  /** One recording of a sound, by its candidate number. */
  const candidateChoice = (id: SoundKeyV1, n: number): FileChoice | null => {
    if (!stockSounds) return null;
    const candidate = stockSoundCandidateV1(id, n);
    return candidate === null
      ? null
      : {
          url: stockSoundUrlV1(candidate),
          gain: level(candidate.gain),
          candidate: n,
        };
  };

  /** The file a plain play of the sound uses; null for the synthesiser. */
  const choiceOf = (id: SoundKeyV1): FileChoice | null => {
    if (stockSoundV1(id) !== null) {
      if (!stockSounds) return null;
      const n = stockSoundChoiceV1(id, Object.fromEntries(picks));
      return n === null || n === STOCK_SOUND_GENERATED_CHOICE_V1
        ? null
        : candidateChoice(id, n);
    }
    const source = playableSoundV1(id)?.source;
    if (source?.kind !== "FILE") return null;
    if (!stockSounds && source.fallback !== undefined) return null;
    return { url: source.url, gain: level(source.gain), candidate: null };
  };

  const synthBufferOf = (id: SoundKeyV1): AudioBuffer | null => {
    if (context === null) return null;
    const cached = synthBuffers.get(id);
    if (cached !== undefined) return cached;
    const recipe = playableRecipeV1(id);
    if (recipe === null) return null;
    const samples = renderSynthRecipeV1(recipe, SYNTH_SAMPLE_RATE_V1);
    const buffer = context.createBuffer(
      1,
      samples.length,
      SYNTH_SAMPLE_RATE_V1,
    );
    buffer.getChannelData(0).set(samples);
    synthBuffers.set(id, buffer);
    return buffer;
  };

  /** Fetches and decodes a file once; resolves to whether it is ready. */
  const load = (target: AudioContext, url: string): Promise<boolean> => {
    if (fileBuffers.has(url)) return Promise.resolve(true);
    const known = loading.get(url);
    if (known !== undefined) return known;
    const fetchFile = Reflect.get(browser, "fetch") as unknown;
    if (typeof fetchFile !== "function") return Promise.resolve(false);
    const fetchBytes: SoundFileFetchV1 = (address) =>
      (fetchFile as typeof fetch).call(browser, address);
    const pending = soundFileBytesV1(url, fetchBytes)
      // Decoding takes the bytes away; the store keeps its own.
      .then((data) => target.decodeAudioData(data.slice(0)))
      .then((buffer) => {
        if (closed || context !== target) return false;
        fileBuffers.set(url, buffer);
        return true;
      })
      // The fallback recipe (or silence) stays in place.
      .catch(() => false)
      .finally(() => {
        // A file that failed can be asked for again.
        if (loading.get(url) === pending) loading.delete(url);
      });
    loading.set(url, pending);
    return pending;
  };

  /** What every sound plays by default or by this browser's pick. */
  const loadFiles = (target: AudioContext): void => {
    for (const id of playableSoundIdsV1()) {
      const choice = choiceOf(id);
      if (choice !== null) void load(target, choice.url);
    }
  };

  return {
    get unlocked(): boolean {
      return context !== null && !closed;
    },
    stockSounds,
    unlock(): void {
      if (closed) return;
      if (context === null) {
        try {
          const created = new constructor();
          const limiter = created.createDynamicsCompressor();
          limiter.threshold.value = -12;
          limiter.knee.value = 8;
          limiter.ratio.value = 8;
          limiter.attack.value = 0.003;
          limiter.release.value = 0.15;
          const gain = created.createGain();
          gain.gain.value = volume;
          gain.connect(limiter);
          limiter.connect(created.destination);
          context = created;
          master = gain;
          try {
            loadFiles(created);
          } catch {
            // Without its files the device still plays every synth sound.
          }
        } catch {
          context = null;
          master = null;
          return;
        }
      }
      if (context.state === "suspended")
        void context.resume().catch(() => undefined);
    },
    setVolume(next: number): void {
      volume = Math.min(1, Math.max(0, next));
      if (master !== null) master.gain.value = volume;
    },
    start(request: SoundStartV1): { readonly stop: SoundStopV1 } | null {
      if (context === null || master === null || closed) return null;
      // A context still waiting to resume would play everything at once
      // later; nothing is queued on it.
      if (context.state !== "running") return null;
      const choice =
        request.generated === true
          ? null
          : request.candidate === undefined
            ? choiceOf(request.id)
            : candidateChoice(request.id, request.candidate);
      const file = choice === null ? undefined : fileBuffers.get(choice.url);
      // A recording asked for by its number is that recording or nothing.
      if (request.candidate !== undefined && file === undefined) return null;
      const buffer = file ?? synthBufferOf(request.id);
      if (buffer === null) return null;
      try {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = request.rate;
        source.loop = request.loop === true;
        const gain = context.createGain();
        gain.gain.value =
          request.gain *
          (file === undefined || choice === null ? 1 : choice.gain);
        source.connect(gain);
        gain.connect(master);
        let stopped = false;
        const release = (): void => {
          if (stopped) return;
          stopped = true;
          try {
            source.stop();
          } catch {
            // Already ended.
          }
          source.disconnect();
          gain.disconnect();
        };
        source.onended = release;
        source.start(context.currentTime + Math.max(0, request.delaySeconds));
        return { stop: release };
      } catch {
        return null;
      }
    },
    durationMs(id: SoundKeyV1, generated = false, candidate?: number): number {
      const choice = generated
        ? null
        : candidate === undefined
          ? choiceOf(id)
          : candidateChoice(id, candidate);
      const file = choice === null ? undefined : fileBuffers.get(choice.url);
      if (file !== undefined) return file.duration * 1000;
      if (candidate !== undefined) return 0;
      const recipe = playableRecipeV1(id);
      return recipe === null ? 0 : synthRecipeDurationMsV1(recipe);
    },
    soundSource(id: SoundKeyV1): "RECORDED" | "GENERATED" | null {
      const choice = choiceOf(id);
      if (choice !== null && fileBuffers.has(choice.url)) return "RECORDED";
      return playableRecipeV1(id) === null ? null : "GENERATED";
    },
    soundCandidate(id: SoundKeyV1): number | null {
      if (stockSoundV1(id) === null) return null;
      const choice = choiceOf(id);
      return choice !== null && fileBuffers.has(choice.url)
        ? (choice.candidate ?? STOCK_SOUND_GENERATED_CHOICE_V1)
        : STOCK_SOUND_GENERATED_CHOICE_V1;
    },
    setPick(id: SoundKeyV1, pick: number | null): void {
      if (pick === null) picks.delete(id);
      else if (isStockSoundChoiceV1(id, pick)) picks.set(id, pick);
      else return;
      const choice = choiceOf(id);
      if (choice !== null && context !== null && !closed)
        void load(context, choice.url);
    },
    prepareCandidate(id: SoundKeyV1, candidate: number): Promise<boolean> {
      const choice = candidateChoice(id, candidate);
      if (choice === null || context === null || closed)
        return Promise.resolve(false);
      return load(context, choice.url);
    },
    close(): void {
      if (closed) return;
      closed = true;
      synthBuffers.clear();
      fileBuffers.clear();
      loading.clear();
      const closing = context;
      context = null;
      master = null;
      if (closing !== null) void closing.close().catch(() => undefined);
    },
  };
}
