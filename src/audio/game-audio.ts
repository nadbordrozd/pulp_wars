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
  isStockSoundChoiceV1,
  loadStockSoundPicksV1,
  parseStockSoundPicksV1,
  stockSoundChoiceV1,
  storeStockSoundPicksV1,
  type StockSoundPicksV1,
} from "./stock-sound-picks";
import { stockSoundsEnabledV1 } from "./stock-sounds";
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
  readonly #pickListeners = new Set<(picks: StockSoundPicksV1) => void>();
  #settings: AudioSettingsV1;
  #picks: StockSoundPicksV1;
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
    // This browser's picks among the recordings; none with them off.
    this.#picks = this.stockSounds
      ? loadStockSoundPicksV1(options.storage)
      : {};
    for (const [id, pick] of Object.entries(this.#picks))
      this.#output?.setPick(id as SoundKeyV1, pick);
  }

  get settings(): AudioSettingsV1 {
    return this.#settings;
  }

  /** True once a gesture has opened the device. */
  get unlocked(): boolean {
    return this.#output?.unlocked === true;
  }

  /**
   * Whether recorded clips replace the sounds that have one (`false` with
   * `?stock-sounds=0`). Without a device it is the default, on.
   */
  get stockSounds(): boolean {
    return this.#output?.stockSounds ?? true;
  }

  /**
   * What a play of this sound uses right now: its recording once the device
   * has decoded it, else the synthesiser. Null without a device, and for a
   * sound with neither (a test, smoke and Gallery hook).
   */
  soundSource(id: SoundKeyV1): "RECORDED" | "GENERATED" | null {
    return this.#output?.soundSource(id) ?? null;
  }

  /**
   * This browser's picks among the recordings of a sound (bead
   * pulp_wars-2yc.24): sound id to candidate number, 0 for the generated
   * sound. Empty with the recordings switched off.
   */
  get picks(): StockSoundPicksV1 {
    return this.#picks;
  }

  /**
   * What a sound with recordings is set to play: this browser's pick, else
   * its default; 0 is the generated sound. Null for a sound without
   * recordings, and for every sound with the recordings switched off.
   */
  soundChoice(id: SoundKeyV1): number | null {
    return this.stockSounds ? stockSoundChoiceV1(id, this.#picks) : null;
  }

  /**
   * The recording a play of this sound uses right now (its candidate
   * number), 0 while that is the synthesised sound. Null without a device
   * and for a sound without recordings (a test and smoke hook).
   */
  soundCandidate(id: SoundKeyV1): number | null {
    return this.#output?.soundCandidate(id) ?? null;
  }

  /**
   * Picks one recording of a sound for this browser (0 for the generated
   * sound), or with null goes back to the sound's default. The game plays
   * it from now on and the pick is stored. Returns false when the pick is
   * not one the sound has, the recordings are off, or it was not stored.
   */
  setPick(id: SoundKeyV1, pick: number | null): boolean {
    if (this.#destroyed || !this.stockSounds) return false;
    if (pick !== null && !isStockSoundChoiceV1(id, pick)) return false;
    const next: Record<string, number> = Object.fromEntries(
      Object.entries(this.#picks).filter(([sound]) => sound !== id),
    );
    if (pick !== null) next[id] = pick;
    // In the manifest's order, whatever order they were picked in.
    this.#picks = parseStockSoundPicksV1(JSON.stringify(next));
    this.#output?.setPick(id, pick);
    const stored = storeStockSoundPicksV1(this.#storage, this.#picks);
    for (const listener of this.#pickListeners) listener(this.#picks);
    return stored;
  }

  /** Forgets every pick: each sound plays its default again. */
  clearPicks(): boolean {
    let stored = true;
    for (const id of Object.keys(this.#picks))
      stored = this.setPick(id as SoundKeyV1, null) && stored;
    return stored;
  }

  /** Called when a pick changes. Returns the unsubscribe. */
  subscribePicks(listener: (picks: StockSoundPicksV1) => void): () => void {
    this.#pickListeners.add(listener);
    return () => this.#pickListeners.delete(listener);
  }

  /**
   * Fetches and decodes one recording of a sound, so `play` can start it
   * by its candidate number. Resolves to whether it is ready (false until
   * a gesture has opened the device).
   */
  prepareCandidate(id: SoundKeyV1, candidate: number): Promise<boolean> {
    if (this.#destroyed || this.#output === null) return Promise.resolve(false);
    return this.#output.prepareCandidate(id, candidate);
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
    this.#pickListeners.clear();
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
    output: createWebAudioOutputV1(documentRoot.defaultView, {
      stockSounds: stockSoundsEnabledV1(
        documentRoot.defaultView?.location.search ?? "",
      ),
    }),
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
