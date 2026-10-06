import type { StorageAdapter } from "../persistence/index";
import {
  clampAudioVolumeV1,
  loadAudioSettingsV1,
  storeAudioSettingsV1,
  type AudioSettingsV1,
} from "./audio-settings";
import {
  SoundMixerV1,
  type SoundPlayOptionsV1,
  type SoundPlayOutcomeV1,
} from "./mixer";
import type { SoundKeyV1 } from "./sound-manifest";
import type { SoundCueV1 } from "./sound-events-v7";
import {
  createWebAudioOutputV1,
  type WebAudioOutputV1,
} from "./web-audio-output";

/**
 * The game's sound (bead pulp_wars-2yc.10, docs/ui/SOUND.md): the one
 * object the interface talks to. It holds the preference (on or off,
 * volume), opens the audio device only after a user gesture, stays silent
 * while the tab is hidden, and keeps a short log of what was asked for, so
 * tests and the browser smoke can check the event mapping without a
 * loudspeaker.
 *
 * Without a device (tests, a browser without WebAudio) every request is
 * logged as LOCKED and nothing else happens.
 */

export type SoundRequestOutcomeV1 =
  | SoundPlayOutcomeV1
  /** Sound is switched off. */
  | "MUTED"
  /** The tab is hidden. */
  | "HIDDEN"
  /** No gesture has opened the device yet, or there is none. */
  | "LOCKED";

export interface SoundLogEntryV1 {
  readonly id: SoundKeyV1;
  readonly outcome: SoundRequestOutcomeV1;
}

export interface GameAudioOptionsV1 {
  readonly storage: StorageAdapter | null;
  /** The device; null is silence. */
  readonly output: WebAudioOutputV1 | null;
  /** Whether the document is hidden right now. */
  readonly isHidden?: () => boolean;
  readonly clock?: () => number;
  readonly random?: () => number;
  /** Runs once when the audio is destroyed (listener clean-up). */
  readonly onDestroy?: () => void;
}

const LOG_LIMIT = 64;

/** Slider percent to gain: a square law, so the low half is usable. */
export function audioVolumeGainV1(percent: number): number {
  const share = clampAudioVolumeV1(percent) / 100;
  return share * share;
}

export class GameAudioV1 {
  readonly #storage: StorageAdapter | null;
  readonly #output: WebAudioOutputV1 | null;
  readonly #mixer: SoundMixerV1 | null;
  readonly #isHidden: () => boolean;
  readonly #onDestroy: (() => void) | undefined;
  readonly #listeners = new Set<(settings: AudioSettingsV1) => void>();
  #settings: AudioSettingsV1;
  #log: SoundLogEntryV1[] = [];
  #destroyed = false;

  constructor(options: GameAudioOptionsV1) {
    this.#storage = options.storage;
    this.#output = options.output;
    this.#isHidden = options.isHidden ?? (() => false);
    this.#onDestroy = options.onDestroy;
    this.#settings = loadAudioSettingsV1(options.storage);
    this.#mixer =
      options.output === null
        ? null
        : new SoundMixerV1({
            output: options.output,
            clock: options.clock ?? (() => Date.now()),
            random: options.random ?? Math.random,
          });
    this.#output?.setVolume(audioVolumeGainV1(this.#settings.volume));
  }

  get settings(): AudioSettingsV1 {
    return this.#settings;
  }

  /** True once a gesture has opened the device. */
  get unlocked(): boolean {
    return this.#output?.unlocked === true;
  }

  /** The most recent requests, oldest first (a test and smoke hook). */
  get log(): readonly SoundLogEntryV1[] {
    return this.#log;
  }

  clearLog(): void {
    this.#log = [];
  }

  /** Called when the preference changes. Returns the unsubscribe. */
  subscribe(listener: (settings: AudioSettingsV1) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * A user gesture happened: open (or resume) the device. With sound off
   * nothing is opened until the player turns it on.
   */
  unlock(): void {
    if (this.#destroyed || !this.#settings.enabled) return;
    this.#output?.unlock();
  }

  /** Returns false when the preference could not be stored. */
  setEnabled(enabled: boolean): boolean {
    if (enabled === this.#settings.enabled) return true;
    return this.#update({ ...this.#settings, enabled });
  }

  /** Volume in percent (0 to 100). Returns false when it was not stored. */
  setVolume(volume: number): boolean {
    const next = clampAudioVolumeV1(volume);
    if (next === this.#settings.volume) return true;
    return this.#update({ ...this.#settings, volume: next });
  }

  #update(next: AudioSettingsV1): boolean {
    this.#settings = next;
    this.#output?.setVolume(audioVolumeGainV1(next.volume));
    // Turning sound on is itself a gesture; turning it off cuts what plays.
    if (next.enabled) this.unlock();
    else this.#mixer?.stopAll();
    const stored = storeAudioSettingsV1(this.#storage, next);
    for (const listener of this.#listeners) listener(next);
    return stored;
  }

  play(
    id: SoundKeyV1,
    options: SoundPlayOptionsV1 = {},
  ): SoundRequestOutcomeV1 {
    if (this.#destroyed) return "LOCKED";
    const outcome: SoundRequestOutcomeV1 = !this.#settings.enabled
      ? "MUTED"
      : this.#isHidden()
        ? "HIDDEN"
        : this.#mixer === null || !this.unlocked
          ? "LOCKED"
          : this.#mixer.play(id, options);
    this.#log.push({ id, outcome });
    if (this.#log.length > LOG_LIMIT)
      this.#log = this.#log.slice(this.#log.length - LOG_LIMIT);
    return outcome;
  }

  /** Plays cues; `timeScale` shrinks their delays with the animation. */
  playCues(cues: readonly SoundCueV1[], timeScale = 1): void {
    for (const cue of cues)
      this.play(cue.id, {
        delayMs: cue.delayMs * timeScale,
        ...(cue.gain === undefined ? {} : { gain: cue.gain }),
      });
  }

  /**
   * Stops one sound wherever it plays, so that it can start again at once
   * (the Gallery's "play again" and its stop control).
   */
  stop(id: SoundKeyV1): void {
    this.#mixer?.stop(id);
  }

  /**
   * Milliseconds until a sound that is playing is over: 0 when it is not
   * playing, Infinity while a looping sound plays.
   */
  remainingMs(id: SoundKeyV1): number {
    return this.#mixer?.remainingMs(id) ?? 0;
  }

  /** Cuts every sound, delayed ones included (the tab was hidden). */
  stopAll(): void {
    this.#mixer?.stopAll();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#listeners.clear();
    this.#mixer?.stopAll();
    this.#output?.close();
    this.#onDestroy?.();
  }
}

/** Gestures that satisfy the browsers' autoplay rules. */
const GESTURES = ["pointerup", "mousedown", "touchend", "keydown", "click"];

/**
 * The browser's game audio: the WebAudio device (when the browser has one),
 * opened by the first gesture anywhere in the document and silent while
 * the tab is hidden. `destroy` removes the listeners.
 */
export function createBrowserGameAudioV1(
  documentRoot: Document,
  storage: StorageAdapter | null,
): GameAudioV1 {
  const onGesture = (): void => audio.unlock();
  const onVisibility = (): void => {
    if (documentRoot.visibilityState === "hidden") audio.stopAll();
  };
  const audio = new GameAudioV1({
    storage,
    output: createWebAudioOutputV1(documentRoot.defaultView),
    isHidden: () => documentRoot.visibilityState === "hidden",
    onDestroy: () => {
      for (const gesture of GESTURES)
        documentRoot.removeEventListener(gesture, onGesture, { capture: true });
      documentRoot.removeEventListener("visibilitychange", onVisibility);
    },
  });
  for (const gesture of GESTURES)
    documentRoot.addEventListener(gesture, onGesture, {
      capture: true,
      passive: true,
    });
  documentRoot.addEventListener("visibilitychange", onVisibility);
  return audio;
}
