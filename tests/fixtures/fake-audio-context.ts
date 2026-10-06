/**
 * A stand-in for the browser's `AudioContext` that records what reaches the
 * device (bead pulp_wars-2yc.19): every buffer source started, with its
 * rate, level and loop flag, whether it was stopped, and the master volume.
 * jsdom has no WebAudio; `installFakeAudioContext` puts this on a window
 * and `uninstallFakeAudioContext` takes it away again.
 */

export interface FakeAudioSourceV1 {
  /** Playback rate at the start. */
  readonly rate: number;
  /** The play's own level (the gain node between source and master). */
  readonly gain: number;
  readonly loop: boolean;
  /** Seconds of the buffer it played. */
  readonly seconds: number;
  stopped: boolean;
}

export interface FakeAudioDeviceV1 {
  readonly contexts: () => number;
  readonly sources: readonly FakeAudioSourceV1[];
  /** The master gain, set from the volume slider. */
  readonly masterGain: () => number;
}

interface FakeNode {
  connected: FakeNode | null;
  readonly gain: { value: number };
  connect(target: FakeNode): void;
  disconnect(): void;
}

function gainNode(): FakeNode {
  return {
    connected: null,
    gain: { value: 1 },
    connect(target) {
      this.connected = target;
    },
    disconnect() {
      this.connected = null;
    },
  };
}

export interface FakeAudioContextOptionsV1 {
  /**
   * Decodes a sound file (bead pulp_wars-2yc.20): the length in seconds of
   * the buffer the bytes become, or a throw for bytes that are not sound.
   * Without it the device decodes nothing, like jsdom.
   */
  readonly decode?: (data: ArrayBuffer) => number;
}

export function installFakeAudioContext(
  target: Window & typeof globalThis,
  options: FakeAudioContextOptionsV1 = {},
): FakeAudioDeviceV1 {
  let contexts = 0;
  let master: FakeNode | null = null;
  const sources: FakeAudioSourceV1[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = gainNode();
    constructor() {
      contexts += 1;
    }
    createGain(): FakeNode {
      const node = gainNode();
      // The first gain node of a context is the master.
      master ??= node;
      return node;
    }
    createDynamicsCompressor(): unknown {
      return {
        ...gainNode(),
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 1 },
        attack: { value: 0 },
        release: { value: 0 },
      };
    }
    createBuffer(_channels: number, length: number, rate: number): unknown {
      const data = new Float32Array(length);
      return { duration: length / rate, getChannelData: () => data };
    }
    decodeAudioData(data: ArrayBuffer): Promise<unknown> {
      const decode = options.decode;
      if (decode === undefined)
        return Promise.reject(new Error("This device decodes nothing"));
      try {
        const duration = decode(data);
        return Promise.resolve({
          duration,
          getChannelData: () => new Float32Array(1),
        });
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    createBufferSource(): unknown {
      let level: FakeNode | null = null;
      let record: FakeAudioSourceV1 | null = null;
      const source = {
        buffer: null as { readonly duration: number } | null,
        playbackRate: { value: 1 },
        loop: false,
        onended: null as (() => void) | null,
        connect(node: FakeNode): void {
          level = node;
        },
        disconnect(): void {
          level = null;
        },
        start(): void {
          record = {
            rate: source.playbackRate.value,
            gain: level?.gain.value ?? 1,
            loop: source.loop,
            seconds: source.buffer?.duration ?? 0,
            stopped: false,
          };
          sources.push(record);
        },
        stop(): void {
          if (record !== null) record.stopped = true;
        },
      };
      return source;
    }
    resume = async (): Promise<void> => undefined;
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
  };
}

export function uninstallFakeAudioContext(
  target: Window & typeof globalThis,
): void {
  Reflect.deleteProperty(target, "AudioContext");
}
