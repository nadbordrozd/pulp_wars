import type { SoundKeyV1 } from "./sound-manifest";

/**
 * The music player (bead pulp_wars-2yc.27, docs/ui/SOUND.md "Theme
 * music"): one theme at a time, loaded when it is asked for.
 *
 * **Loading.** A theme is about 100 seconds of stereo sound: decoded it is
 * close to 40 MB, and nine of them would be more than 300 MB. So nothing
 * is loaded before a theme is wanted, and only the theme that plays is
 * kept: its file is fetched and decoded when it is first asked for, the
 * theme before it goes on playing until the new one is ready, and its
 * decoded sound is dropped as soon as the crossfade is over. At most two
 * decoded themes exist at once, for the length of one crossfade. A theme
 * asked for and replaced by another before it was ready is never heard:
 * its fetch is aborted, and if it was already being decoded the result is
 * dropped.
 *
 * A decoded buffer was chosen over a streaming `<audio>` element because a
 * buffer can be started on the audio clock to the sample, which is what a
 * loop that joins without a gap or a click needs; an element's loop leaves
 * a gap in AAC, and timing two elements against each other is only as good
 * as a timer.
 *
 * **Crossfade.** A new theme fades in while the old one fades out, both in
 * a straight line over the same time, so the two levels always add up to
 * at most one full theme. A theme already fading out when another starts
 * is cut at once.
 *
 * **Loop.** A pass of a looping theme is one buffer source. The next pass
 * is started `overlapSeconds` before the current one ends, on the audio
 * clock: the recordings end on a note that dies away, and the first bar
 * comes in under it. The ending pass is faded to nothing over that
 * overlap, so the join never clicks, whatever the last sample is. With no
 * overlap the next pass starts on the sample the current one ends on.
 *
 * It decides and schedules; the device gives it a context, a node to play
 * into and a way to load a theme. Tests pass a recording context.
 */

export interface MusicTrackV1 {
  readonly id: SoundKeyV1;
  /** Repeats until it is replaced or stopped. */
  readonly loop: boolean;
  /** The level it is played at: the mixer's music level and its own. */
  readonly gain: number;
  /** How far before its end the next pass of the loop starts. */
  readonly overlapSeconds: number;
  /**
   * Fetches and decodes it (or renders it). Rejects when it cannot.
   * `abandoned` is aborted when another theme was asked for meanwhile: a
   * load that has not started decoding by then should give up, so that
   * themes skipped through quickly are not all decoded.
   */
  load(abandoned?: AbortSignal): Promise<AudioBuffer>;
}

export interface MusicVoiceStateV1 {
  readonly id: SoundKeyV1;
  /** True while it fades out to make room for another theme. */
  readonly leaving: boolean;
  /** Buffer sources of this theme that have not ended (1, or 2 at a join). */
  readonly passes: number;
  /** When its passes started, on the audio clock (the last eight). */
  readonly passStarts: readonly number[];
  /** Seconds of decoded sound it holds. */
  readonly seconds: number;
}

export interface MusicPlayerStateV1 {
  /** The theme asked for; null for none. */
  readonly wanted: SoundKeyV1 | null;
  /** The theme that plays (not one that is fading out). */
  readonly playing: SoundKeyV1 | null;
  /** The theme being fetched and decoded. */
  readonly loading: SoundKeyV1 | null;
  readonly voices: readonly MusicVoiceStateV1[];
  /** Decoded themes held right now, and their size in bytes of samples. */
  readonly heldBuffers: number;
  readonly heldBytes: number;
  /** The most ever held at once since the player was made. */
  readonly peakHeldBuffers: number;
  /** Themes loaded since the player was made. */
  readonly loads: number;
  readonly paused: boolean;
}

export interface MusicPlayerOptionsV1 {
  readonly context: AudioContext;
  /** Where the themes play into (the music level's gain node). */
  readonly destination: AudioNode;
  /** What is needed to play a theme; null for an id that is not music. */
  readonly track: (id: SoundKeyV1) => MusicTrackV1 | null;
  /** A theme that does not loop ended, or a theme could not be loaded. */
  readonly onEnded?: (id: SoundKeyV1, reason: "ENDED" | "FAILED") => void;
  readonly setTimer?: (run: () => void, ms: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
}

/** The crossfade between two themes, in seconds. */
export const MUSIC_CROSSFADE_SECONDS_V1 = 0.8;
/** A theme that starts from silence fades in over this. */
export const MUSIC_FADE_IN_SECONDS_V1 = 0.4;
/** A theme that is stopped fades out over this. */
export const MUSIC_FADE_OUT_SECONDS_V1 = 0.4;
/** The next pass of a loop is handed to the audio clock this far ahead. */
const LOOP_LOOKAHEAD_SECONDS = 0.6;
/** A pass that comes in under the last one opens over this (no click). */
const PASS_ATTACK_SECONDS = 0.01;
/** A loop's overlap is never more than this share of its length. */
const MAX_OVERLAP_SHARE = 0.25;

interface PassV1 {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly startsAt: number;
  readonly endsAt: number;
}

interface VoiceV1 {
  readonly track: MusicTrackV1;
  buffer: AudioBuffer | null;
  readonly envelope: GainNode;
  passes: PassV1[];
  readonly passStarts: number[];
  /** When the next pass of the loop starts, on the audio clock. */
  nextStart: number;
  timer: unknown;
  leaving: boolean;
}

export class MusicPlayerV1 {
  readonly #context: AudioContext;
  readonly #destination: AudioNode;
  readonly #track: (id: SoundKeyV1) => MusicTrackV1 | null;
  readonly #onEnded: MusicPlayerOptionsV1["onEnded"];
  readonly #setTimer: (run: () => void, ms: number) => unknown;
  readonly #clearTimer: (timer: unknown) => void;
  #wanted: SoundKeyV1 | null = null;
  #loading: SoundKeyV1 | null = null;
  #loadToken = 0;
  #abandon: AbortController | null = null;
  #loads = 0;
  #current: VoiceV1 | null = null;
  #leaving: VoiceV1[] = [];
  #peakHeld = 0;
  #paused = false;
  #closed = false;

  constructor(options: MusicPlayerOptionsV1) {
    this.#context = options.context;
    this.#destination = options.destination;
    this.#track = options.track;
    this.#onEnded = options.onEnded;
    this.#setTimer =
      options.setTimer ?? ((run, ms) => globalThis.setTimeout(run, ms));
    this.#clearTimer =
      options.clearTimer ??
      ((timer) =>
        globalThis.clearTimeout(timer as ReturnType<typeof setTimeout>));
  }

  get state(): MusicPlayerStateV1 {
    const voices = [
      ...(this.#current === null ? [] : [this.#current]),
      ...this.#leaving,
    ];
    const now = this.#context.currentTime;
    let heldBytes = 0;
    for (const voice of voices)
      if (voice.buffer !== null)
        heldBytes +=
          voice.buffer.length * voice.buffer.numberOfChannels * 4 || 0;
    return {
      wanted: this.#wanted,
      playing: this.#current?.track.id ?? null,
      loading: this.#loading,
      voices: voices.map((voice) => ({
        id: voice.track.id,
        leaving: voice.leaving,
        passes: voice.passes.filter((pass) => pass.endsAt > now).length,
        passStarts: voice.passStarts.slice(-8),
        seconds: voice.buffer?.duration ?? 0,
      })),
      heldBuffers: voices.filter((voice) => voice.buffer !== null).length,
      heldBytes,
      peakHeldBuffers: this.#peakHeld,
      loads: this.#loads,
      paused: this.#paused,
    };
  }

  /**
   * Asks for a theme, or with null for silence. The theme that plays goes
   * on until the new one is ready, then the two cross over `fadeSeconds`.
   * Asking for the theme that is wanted already changes nothing.
   */
  set(
    id: SoundKeyV1 | null,
    fadeSeconds: number = MUSIC_CROSSFADE_SECONDS_V1,
  ): void {
    if (this.#closed || id === this.#wanted) return;
    this.#wanted = id;
    // Whatever was being loaded is no longer what is wanted.
    this.#loadToken += 1;
    this.#loading = null;
    this.#abandon?.abort();
    this.#abandon = null;
    if (id === null) {
      const voice = this.#current;
      this.#current = null;
      if (voice !== null)
        this.#leave(voice, Math.min(fadeSeconds, MUSIC_FADE_OUT_SECONDS_V1));
      return;
    }
    // Asked for again while its replacement was still loading: it stays.
    if (this.#current?.track.id === id) return;
    const track = this.#track(id);
    if (track === null) {
      this.#wanted = null;
      this.#onEnded?.(id, "FAILED");
      return;
    }
    const token = this.#loadToken;
    this.#loading = id;
    this.#loads += 1;
    const abandon =
      typeof AbortController === "function" ? new AbortController() : null;
    this.#abandon = abandon;
    let pending: Promise<AudioBuffer>;
    try {
      pending = track.load(abandon?.signal);
    } catch (error) {
      pending = Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    pending.then(
      (buffer) => {
        // Replaced while it loaded: dropped unheard.
        if (this.#closed || token !== this.#loadToken) return;
        this.#loading = null;
        this.#begin(track, buffer, fadeSeconds);
      },
      () => {
        if (this.#closed || token !== this.#loadToken) return;
        this.#loading = null;
        this.#wanted = this.#current?.track.id ?? null;
        this.#onEnded?.(id, "FAILED");
      },
    );
  }

  /** The tab is hidden: no pass is handed over while the clock stands. */
  pause(): void {
    if (this.#closed || this.#paused) return;
    this.#paused = true;
    // A crossfade is not carried over a pause.
    for (const voice of [...this.#leaving]) this.#kill(voice);
    const voice = this.#current;
    if (voice !== null && voice.timer !== null) {
      this.#clearTimer(voice.timer);
      voice.timer = null;
    }
  }

  resume(): void {
    if (this.#closed || !this.#paused) return;
    this.#paused = false;
    if (this.#current !== null) this.#arm(this.#current);
  }

  /** Stops everything at once and drops what was decoded. */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#wanted = null;
    this.#loading = null;
    this.#loadToken += 1;
    this.#abandon?.abort();
    this.#abandon = null;
    for (const voice of [...this.#leaving]) this.#kill(voice);
    if (this.#current !== null) this.#kill(this.#current);
    this.#current = null;
  }

  #begin(track: MusicTrackV1, buffer: AudioBuffer, fadeSeconds: number): void {
    const context = this.#context;
    const now = context.currentTime;
    // Never three at once: what was already fading out is cut.
    for (const voice of [...this.#leaving]) this.#kill(voice);
    const previous = this.#current;
    const fade =
      previous === null
        ? Math.min(fadeSeconds, MUSIC_FADE_IN_SECONDS_V1)
        : Math.max(0, fadeSeconds);
    if (previous !== null) this.#leave(previous, fade);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(fade > 0 ? 0 : track.gain, now);
    if (fade > 0) envelope.gain.linearRampToValueAtTime(track.gain, now + fade);
    envelope.connect(this.#destination);
    const voice: VoiceV1 = {
      track,
      buffer,
      envelope,
      passes: [],
      passStarts: [],
      nextStart: now,
      timer: null,
      leaving: false,
    };
    this.#current = voice;
    this.#peakHeld = Math.max(this.#peakHeld, 1 + this.#leaving.length);
    this.#startPass(voice, now, false);
  }

  /** One pass of the theme: a buffer source started at `at`. */
  #startPass(voice: VoiceV1, at: number, underLast: boolean): void {
    const context = this.#context;
    const buffer = voice.buffer;
    if (buffer === null || this.#closed) return;
    const { track } = voice;
    const length = buffer.duration;
    const overlap = track.loop
      ? Math.min(Math.max(0, track.overlapSeconds), length * MAX_OVERLAP_SHARE)
      : 0;
    // Passes that are over leave the graph.
    const live: PassV1[] = [];
    for (const pass of voice.passes)
      if (pass.endsAt > context.currentTime) live.push(pass);
      else release(pass);
    voice.passes = live;
    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      if (underLast && overlap > 0) {
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(1, at + PASS_ATTACK_SECONDS);
      } else gain.gain.setValueAtTime(1, at);
      if (overlap > 0) {
        // The dying note is taken down to nothing under the next pass.
        gain.gain.setValueAtTime(1, at + length - overlap);
        gain.gain.linearRampToValueAtTime(0, at + length);
      }
      source.connect(gain);
      gain.connect(voice.envelope);
      source.start(at);
      voice.passes.push({ source, gain, startsAt: at, endsAt: at + length });
      voice.passStarts.push(at);
    } catch {
      this.#fail(voice);
      return;
    }
    voice.nextStart = at + length - overlap;
    this.#arm(voice);
  }

  /** Sets the timer that hands the next pass (or the end) to the clock. */
  #arm(voice: VoiceV1): void {
    if (voice.timer !== null) this.#clearTimer(voice.timer);
    voice.timer = null;
    if (this.#paused || voice.leaving) return;
    const now = this.#context.currentTime;
    if (!voice.track.loop) {
      voice.timer = this.#setTimer(
        () => {
          voice.timer = null;
          if (this.#current !== voice) return;
          this.#current = null;
          this.#wanted = null;
          this.#kill(voice);
          this.#onEnded?.(voice.track.id, "ENDED");
        },
        Math.max(0, voice.nextStart - now) * 1000,
      );
      return;
    }
    voice.timer = this.#setTimer(
      () => {
        voice.timer = null;
        if (this.#current !== voice || this.#paused) return;
        // On time this is `nextStart`; a late timer starts it now.
        this.#startPass(
          voice,
          Math.max(voice.nextStart, this.#context.currentTime),
          true,
        );
      },
      Math.max(0, voice.nextStart - LOOP_LOOKAHEAD_SECONDS - now) * 1000,
    );
  }

  /** Fades a voice out and drops it when it is silent. */
  #leave(voice: VoiceV1, fadeSeconds: number): void {
    if (voice.timer !== null) this.#clearTimer(voice.timer);
    voice.timer = null;
    if (fadeSeconds <= 0 || this.#paused) {
      this.#kill(voice);
      return;
    }
    voice.leaving = true;
    this.#leaving.push(voice);
    const now = this.#context.currentTime;
    const level = voice.envelope.gain;
    // From wherever its own fade-in had got to, down to nothing.
    const from = level.value;
    level.cancelScheduledValues(now);
    level.setValueAtTime(from, now);
    level.linearRampToValueAtTime(0, now + fadeSeconds);
    voice.timer = this.#setTimer(
      () => {
        voice.timer = null;
        this.#kill(voice);
      },
      fadeSeconds * 1000 + 60,
    );
  }

  #fail(voice: VoiceV1): void {
    const id = voice.track.id;
    if (this.#current === voice) {
      this.#current = null;
      this.#wanted = null;
    }
    this.#kill(voice);
    this.#onEnded?.(id, "FAILED");
  }

  /** Stops a voice now and lets go of its decoded sound. */
  #kill(voice: VoiceV1): void {
    if (voice.timer !== null) this.#clearTimer(voice.timer);
    voice.timer = null;
    for (const pass of voice.passes) release(pass);
    voice.passes = [];
    voice.buffer = null;
    try {
      voice.envelope.disconnect();
    } catch {
      // Already out of the graph.
    }
    this.#leaving = this.#leaving.filter((other) => other !== voice);
  }
}

function release(pass: PassV1): void {
  try {
    pass.source.stop();
  } catch {
    // Already ended, or never started.
  }
  try {
    pass.source.disconnect();
    pass.gain.disconnect();
  } catch {
    // Already out of the graph.
  }
}
