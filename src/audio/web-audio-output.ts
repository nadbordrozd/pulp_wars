import type { SoundOutputV1, SoundStartV1, SoundStopV1 } from "./mixer";
import {
  playableRecipeV1,
  playableSoundIdsV1,
  playableSoundV1,
} from "./playable-sound";
import { soundFileBytesV1, type SoundFileFetchV1 } from "./sound-file-store";
import type { SoundKeyV1 } from "./sound-manifest";
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
  close(): void;
}

export interface WebAudioOutputOptionsV1 {
  /** False plays every sound that has a synth recipe from it. Default true. */
  readonly stockSounds?: boolean;
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
  /** Decoded files. */
  const fileBuffers = new Map<SoundKeyV1, AudioBuffer>();

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

  /** The level a decoded file is played at (its manifest gain). */
  const fileGainOf = (id: SoundKeyV1): number => {
    const source = playableSoundV1(id)?.source;
    const gain = source?.kind === "FILE" ? (source.gain ?? 1) : 1;
    return Number.isFinite(gain) ? Math.min(1, Math.max(0, gain)) : 1;
  };

  const loadFiles = (target: AudioContext): void => {
    const fetchFile = Reflect.get(browser, "fetch") as unknown;
    if (typeof fetchFile !== "function") return;
    const fetchBytes: SoundFileFetchV1 = (url) =>
      (fetchFile as typeof fetch).call(browser, url);
    for (const id of playableSoundIdsV1()) {
      const source = playableSoundV1(id)?.source;
      if (source?.kind !== "FILE") continue;
      if (!stockSounds && source.fallback !== undefined) continue;
      void soundFileBytesV1(source.url, fetchBytes)
        // Decoding takes the bytes away; the store keeps its own.
        .then((data) => target.decodeAudioData(data.slice(0)))
        .then((buffer) => {
          if (closed || context !== target) return;
          fileBuffers.set(id, buffer);
        })
        .catch(() => {
          // The fallback recipe (or silence) stays in place.
        });
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
      const file =
        request.generated === true ? undefined : fileBuffers.get(request.id);
      const buffer = file ?? synthBufferOf(request.id);
      if (buffer === null) return null;
      try {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = request.rate;
        source.loop = request.loop === true;
        const gain = context.createGain();
        gain.gain.value =
          request.gain * (file === undefined ? 1 : fileGainOf(request.id));
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
    durationMs(id: SoundKeyV1, generated = false): number {
      const file = generated ? undefined : fileBuffers.get(id);
      if (file !== undefined) return file.duration * 1000;
      const recipe = playableRecipeV1(id);
      return recipe === null ? 0 : synthRecipeDurationMsV1(recipe);
    },
    soundSource(id: SoundKeyV1): "RECORDED" | "GENERATED" | null {
      if (fileBuffers.has(id)) return "RECORDED";
      return playableRecipeV1(id) === null ? null : "GENERATED";
    },
    close(): void {
      if (closed) return;
      closed = true;
      synthBuffers.clear();
      fileBuffers.clear();
      const closing = context;
      context = null;
      master = null;
      if (closing !== null) void closing.close().catch(() => undefined);
    },
  };
}
