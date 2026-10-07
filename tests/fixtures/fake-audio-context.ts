/**
 * A stand-in for the browser's `AudioContext` that records what reaches the
 * device (bead pulp_wars-2yc.19): every buffer source started, with its
 * rate, level and loop flag, whether it was stopped, and the master volume.
 * jsdom has no WebAudio; `installFakeAudioContext` puts this on a window
 * and `uninstallFakeAudioContext` takes it away again.
 *
 * For the music (bead pulp_wars-2yc.27) it also keeps time: a gain can be
 * scheduled (`setValueAtTime`, `linearRampToValueAtTime`) and read at any
 * moment, a source records when it starts and through which gains it
 * plays, the clock moves when a test says so (`advance`) and stands still
 * while the context is suspended.
 */

/** A gain's value over time: what was set and the ramps scheduled. */
export class FakeAudioParamV1 {
  readonly #now: () => number;
  #base: number;
  #events: { ramp: boolean; time: number; value: number }[] = [];

  constructor(now: () => number, value = 1) {
    this.#now = now;
    this.#base = value;
  }

  get value(): number {
    return this.valueAt(this.#now());
  }

  set value(next: number) {
    this.#base = next;
    this.#events = [];
  }

  setValueAtTime(value: number, time: number): void {
    this.#events.push({ ramp: false, time, value });
    this.#events.sort((a, b) => a.time - b.time);
  }

  linearRampToValueAtTime(value: number, time: number): void {
    this.#events.push({ ramp: true, time, value });
    this.#events.sort((a, b) => a.time - b.time);
  }

  cancelScheduledValues(time: number): void {
    this.#events = this.#events.filter((event) => event.time < time);
  }

  /** The value at a moment of the context's clock. */
  valueAt(time: number): number {
    let value = this.#base;
    let since = 0;
    for (const event of this.#events) {
      if (event.time <= time) {
        value = event.value;
        since = event.time;
        continue;
      }
      if (!event.ramp) break;
      const span = event.time - since;
      return span <= 0
        ? event.value
        : value + ((event.value - value) * (time - since)) / span;
    }
    return value;
  }
}

export interface FakeAudioNodeV1 {
  connected: FakeAudioNodeV1 | null;
  readonly gain: FakeAudioParamV1;
  connect(target: FakeAudioNodeV1): void;
  disconnect(): void;
}

export interface FakeAudioSourceV1 {
  /** Playback rate at the start. */
  readonly rate: number;
  /** The play's own level (the gain node between source and master). */
  readonly gain: number;
  readonly loop: boolean;
  /** Seconds of the buffer it played. */
  readonly seconds: number;
  /** When it starts, on the context's clock. */
  readonly at: number;
  /** The gain node it plays into; null when it was connected to none. */
  readonly node: FakeAudioNodeV1 | null;
  stopped: boolean;
  /**
   * Its level at a moment: the product of every gain from the source to
   * the device. 0 before it starts, after its buffer ends, from the
   * moment it was stopped, and when it does not reach the device.
   */
  levelAt(time: number): number;
}

export interface FakeAudioDeviceV1 {
  readonly contexts: () => number;
  readonly sources: readonly FakeAudioSourceV1[];
  /** The master gain, set from the Sound slider. */
  readonly masterGain: () => number;
  /** The music's gain (the second gain node made), set from Music. */
  readonly musicGain: () => number;
  /** The clock of the (last) context. */
  readonly now: () => number;
  /** "running" or "suspended"; "none" before a context exists. */
  readonly state: () => string;
  /** Moves the clock of every running context. */
  advance(seconds: number): void;
  /** Files handed to `decodeAudioData` so far. */
  readonly decodes: () => number;
}

export interface FakeAudioContextOptionsV1 {
  /**
   * Decodes a sound file (bead pulp_wars-2yc.20): the length in seconds of
   * the buffer the bytes become, or a throw for bytes that are not sound.
   * Without it the device decodes nothing, like jsdom.
   */
  readonly decode?: (data: ArrayBuffer) => number;
}

/** The sample rate the stand-in decodes at. */
const DECODED_RATE = 48_000;

export function installFakeAudioContext(
  target: Window & typeof globalThis,
  options: FakeAudioContextOptionsV1 = {},
): FakeAudioDeviceV1 {
  let contexts = 0;
  let decodes = 0;
  let master: FakeAudioNodeV1 | null = null;
  let music: FakeAudioNodeV1 | null = null;
  const sources: FakeAudioSourceV1[] = [];
  const live: { state: string; currentTime: number }[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination: FakeAudioNodeV1;
    constructor() {
      contexts += 1;
      live.push(this);
      this.destination = this.#node();
    }
    #node(): FakeAudioNodeV1 {
      return {
        connected: null,
        gain: new FakeAudioParamV1(() => this.currentTime),
        connect(next) {
          this.connected = next;
        },
        disconnect() {
          this.connected = null;
        },
      };
    }
    createGain(): FakeAudioNodeV1 {
      const node = this.#node();
      // The first gain node of a context is the effects' master, the
      // second the music's.
      if (master === null) master = node;
      else music ??= node;
      return node;
    }
    createDynamicsCompressor(): unknown {
      return {
        ...this.#node(),
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 1 },
        attack: { value: 0 },
        release: { value: 0 },
      };
    }
    createBuffer(_channels: number, length: number, rate: number): unknown {
      const data = new Float32Array(length);
      return {
        duration: length / rate,
        length,
        numberOfChannels: 1,
        getChannelData: () => data,
      };
    }
    decodeAudioData(data: ArrayBuffer): Promise<unknown> {
      const decode = options.decode;
      if (decode === undefined)
        return Promise.reject(new Error("This device decodes nothing"));
      try {
        decodes += 1;
        const duration = decode(data);
        return Promise.resolve({
          duration,
          length: Math.round(duration * DECODED_RATE),
          numberOfChannels: 2,
          getChannelData: () => new Float32Array(1),
        });
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    createBufferSource(): unknown {
      const destination = this.destination;
      let level: FakeAudioNodeV1 | null = null;
      let record: FakeAudioSourceV1 | null = null;
      let stoppedAt = Infinity;
      const source = {
        buffer: null as { readonly duration: number } | null,
        playbackRate: { value: 1 },
        loop: false,
        onended: null as (() => void) | null,
        connect(node: FakeAudioNodeV1): void {
          level = node;
        },
        disconnect(): void {
          level = null;
        },
        start: (when?: number): void => {
          const at = Math.max(when ?? 0, this.currentTime);
          const seconds = source.buffer?.duration ?? 0;
          const node = level;
          const loop = source.loop;
          // The gains it plays through, as the graph is when it starts
          // (the limiter and the device itself have a gain of one).
          const path: FakeAudioNodeV1[] = [];
          let reaches = false;
          let hop: FakeAudioNodeV1 | null = node;
          for (let hops = 0; hop !== null && hops < 16; hops += 1) {
            if (hop === destination) {
              reaches = true;
              break;
            }
            path.push(hop);
            hop = hop.connected;
          }
          const made: FakeAudioSourceV1 = {
            rate: source.playbackRate.value,
            gain: level?.gain.value ?? 1,
            loop,
            seconds,
            at,
            node,
            stopped: false,
            levelAt(time: number): number {
              if (!reaches || time >= stoppedAt || time < at) return 0;
              if (!loop && time >= at + seconds) return 0;
              let product = 1;
              for (const gain of path) product *= gain.gain.valueAt(time);
              return product;
            },
          };
          record = made;
          sources.push(made);
        },
        stop: (): void => {
          if (record === null || record.stopped) return;
          record.stopped = true;
          stoppedAt = this.currentTime;
        },
      };
      return source;
    }
    suspend = async (): Promise<void> => {
      this.state = "suspended";
    };
    resume = async (): Promise<void> => {
      this.state = "running";
    };
    close = async (): Promise<void> => undefined;
  }
  Object.defineProperty(target, "AudioContext", {
    configurable: true,
    writable: true,
    value: FakeAudioContext,
  });
  return {
    contexts: () => contexts,
    sources,
    masterGain: () => master?.gain.value ?? -1,
    musicGain: () => music?.gain.value ?? -1,
    now: () => live.at(-1)?.currentTime ?? 0,
    state: () => live.at(-1)?.state ?? "none",
    advance(seconds: number): void {
      for (const context of live)
        if (context.state === "running") context.currentTime += seconds;
    },
    decodes: () => decodes,
  };
}

export function uninstallFakeAudioContext(
  target: Window & typeof globalThis,
): void {
  Reflect.deleteProperty(target, "AudioContext");
}
