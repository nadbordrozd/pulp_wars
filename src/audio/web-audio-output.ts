import type { SoundOutputV1, SoundStartV1, SoundStopV1 } from "./mixer";
import {
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  soundRecipeV1,
  type SoundIdV1,
} from "./sound-manifest";
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
 * sound is rendered once into an `AudioBuffer`, on first use; a manifest
 * entry that names a file is fetched and decoded after the unlock and takes
 * over from its fallback recipe when it is ready.
 *
 * Voices run through one master gain and a gentle limiter, so several
 * sounds at once cannot clip.
 */
export interface WebAudioOutputV1 extends SoundOutputV1 {
  /** True once a gesture has created the context. */
  readonly unlocked: boolean;
  /** Creates the context if needed and resumes it. Call from a gesture. */
  unlock(): void;
  /** Master volume, 0 to 1. */
  setVolume(volume: number): void;
  close(): void;
}

type AudioContextConstructor = new () => AudioContext;

/** Null where the browser (or a test's window) has no WebAudio. */
export function createWebAudioOutputV1(
  browser: (Window & typeof globalThis) | null,
): WebAudioOutputV1 | null {
  if (browser === null) return null;
  const constructor = (Reflect.get(browser, "AudioContext") ??
    Reflect.get(browser, "webkitAudioContext")) as
    AudioContextConstructor | undefined;
  if (typeof constructor !== "function") return null;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let volume = 1;
  let closed = false;
  const buffers = new Map<SoundIdV1, AudioBuffer>();
  const loadedFiles = new Set<SoundIdV1>();

  const bufferOf = (id: SoundIdV1): AudioBuffer | null => {
    if (context === null) return null;
    const cached = buffers.get(id);
    if (cached !== undefined) return cached;
    const recipe = soundRecipeV1(id);
    if (recipe === null) return null;
    const samples = renderSynthRecipeV1(recipe, SYNTH_SAMPLE_RATE_V1);
    const buffer = context.createBuffer(
      1,
      samples.length,
      SYNTH_SAMPLE_RATE_V1,
    );
    buffer.getChannelData(0).set(samples);
    buffers.set(id, buffer);
    return buffer;
  };

  const loadFiles = (target: AudioContext): void => {
    for (const id of SOUND_IDS_V1) {
      const source = SOUND_MANIFEST_V1[id].source;
      if (source.kind !== "FILE") continue;
      void browser
        .fetch(source.url)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((data) => target.decodeAudioData(data))
        .then((buffer) => {
          if (closed) return;
          buffers.set(id, buffer);
          loadedFiles.add(id);
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
          loadFiles(created);
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
      const buffer = bufferOf(request.id);
      if (buffer === null) return null;
      try {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = request.rate;
        const gain = context.createGain();
        gain.gain.value = request.gain;
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
    durationMs(id: SoundIdV1): number {
      if (loadedFiles.has(id)) return (buffers.get(id)?.duration ?? 0) * 1000;
      const recipe = soundRecipeV1(id);
      return recipe === null ? 0 : synthRecipeDurationMsV1(recipe);
    },
    close(): void {
      if (closed) return;
      closed = true;
      buffers.clear();
      const closing = context;
      context = null;
      master = null;
      if (closing !== null) void closing.close().catch(() => undefined);
    },
  };
}
