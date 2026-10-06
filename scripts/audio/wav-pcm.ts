import { closeSync, openSync, readSync } from "node:fs";

/**
 * A small WAV reader and writer for the stock-sound tools (bead
 * pulp_wars-2yc.20, docs/ui/SOUND.md "Stock recordings"). It reads linear
 * PCM of 8, 16, 24 or 32 bits and 32- or 64-bit float, at any sample rate
 * and channel count, including WAVE_FORMAT_EXTENSIBLE, and reads a range of
 * frames without loading the rest of the file (library files run to
 * hundreds of megabytes). It writes 16-bit PCM. No dependencies.
 */

export interface WavInfoV1 {
  readonly path: string;
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  readonly float: boolean;
  readonly frames: number;
  readonly durationSeconds: number;
  /** Byte offset of the first sample in the file. */
  readonly dataOffset: number;
  readonly bytesPerFrame: number;
  /** Text found in the bext and LIST/INFO chunks, when the file has any. */
  readonly description: string;
}

const WAVE_FORMAT_PCM = 1;
const WAVE_FORMAT_IEEE_FLOAT = 3;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;

function readAt(fd: number, position: number, length: number): Buffer {
  const buffer = Buffer.alloc(length);
  const read = readSync(fd, buffer, 0, length, position);
  return read === length ? buffer : buffer.subarray(0, read);
}

function cleanText(buffer: Buffer): string {
  return buffer
    .toString("latin1")
    .replace(/\0+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reads the header of a WAV file. Throws on anything it cannot decode. */
export function readWavInfoV1(path: string): WavInfoV1 {
  const fd = openSync(path, "r");
  try {
    const head = readAt(fd, 0, 12);
    const riff = head.toString("latin1", 0, 4);
    if (
      (riff !== "RIFF" && riff !== "RF64") ||
      head.toString("latin1", 8, 12) !== "WAVE"
    )
      throw new Error(`Not a WAV file: ${path}`);
    let position = 12;
    let format: {
      tag: number;
      channels: number;
      sampleRate: number;
      bitsPerSample: number;
      blockAlign: number;
    } | null = null;
    let dataOffset = -1;
    let dataBytes = 0;
    let rf64DataBytes = -1;
    const texts: string[] = [];
    for (;;) {
      const chunk = readAt(fd, position, 8);
      if (chunk.length < 8) break;
      const id = chunk.toString("latin1", 0, 4);
      const size = chunk.readUInt32LE(4);
      const body = position + 8;
      if (id === "ds64") {
        const ds64 = readAt(fd, body, 16);
        rf64DataBytes = Number(ds64.readBigUInt64LE(8));
      } else if (id === "fmt ") {
        const fmt = readAt(fd, body, Math.min(size, 40));
        let tag = fmt.readUInt16LE(0);
        if (tag === WAVE_FORMAT_EXTENSIBLE && fmt.length >= 26)
          tag = fmt.readUInt16LE(24);
        format = {
          tag,
          channels: fmt.readUInt16LE(2),
          sampleRate: fmt.readUInt32LE(4),
          blockAlign: fmt.readUInt16LE(12),
          bitsPerSample: fmt.readUInt16LE(14),
        };
      } else if (id === "bext") {
        texts.push(cleanText(readAt(fd, body, Math.min(size, 256))));
      } else if (id === "LIST") {
        const list = readAt(fd, body, Math.min(size, 4096));
        if (list.toString("latin1", 0, 4) === "INFO") {
          let at = 4;
          while (at + 8 <= list.length) {
            const key = list.toString("latin1", at, at + 4);
            const length = list.readUInt32LE(at + 4);
            const value = cleanText(
              list.subarray(at + 8, Math.min(list.length, at + 8 + length)),
            );
            if (value !== "") texts.push(`${key}=${value}`);
            at += 8 + length + (length % 2);
          }
        }
      } else if (id === "data") {
        dataOffset = body;
        dataBytes =
          size === 0xffffffff && rf64DataBytes >= 0 ? rf64DataBytes : size;
        break;
      }
      position = body + size + (size % 2);
    }
    if (format === null || dataOffset < 0)
      throw new Error(`WAV file without fmt or data chunk: ${path}`);
    if (format.tag !== WAVE_FORMAT_PCM && format.tag !== WAVE_FORMAT_IEEE_FLOAT)
      throw new Error(`Unsupported WAV encoding ${format.tag}: ${path}`);
    const float = format.tag === WAVE_FORMAT_IEEE_FLOAT;
    const bytesPerFrame =
      format.blockAlign > 0
        ? format.blockAlign
        : (format.channels * format.bitsPerSample) / 8;
    const frames = Math.floor(dataBytes / bytesPerFrame);
    return {
      path,
      sampleRate: format.sampleRate,
      channels: format.channels,
      bitsPerSample: format.bitsPerSample,
      float,
      frames,
      durationSeconds: frames / format.sampleRate,
      dataOffset,
      bytesPerFrame,
      description: texts.filter((text) => text !== "").join(" | "),
    };
  } finally {
    closeSync(fd);
  }
}

/**
 * Reads frames [startFrame, startFrame + frameCount) as one Float32Array
 * per channel, in [-1, 1).
 */
export function readWavFramesV1(
  info: WavInfoV1,
  startFrame = 0,
  frameCount: number = info.frames,
): Float32Array[] {
  const first = Math.max(0, Math.min(info.frames, Math.floor(startFrame)));
  const count = Math.max(
    0,
    Math.min(info.frames - first, Math.floor(frameCount)),
  );
  const fd = openSync(info.path, "r");
  let bytes: Buffer;
  try {
    bytes = readAt(
      fd,
      info.dataOffset + first * info.bytesPerFrame,
      count * info.bytesPerFrame,
    );
  } finally {
    closeSync(fd);
  }
  const channels = Array.from(
    { length: info.channels },
    () => new Float32Array(count),
  );
  const width = info.bytesPerFrame / info.channels;
  const read = sampleReader(info, bytes);
  for (let frame = 0; frame < count; frame += 1) {
    const base = frame * info.bytesPerFrame;
    for (let channel = 0; channel < info.channels; channel += 1) {
      const target = channels[channel];
      if (target !== undefined) target[frame] = read(base + channel * width);
    }
  }
  return channels;
}

function sampleReader(
  info: WavInfoV1,
  bytes: Buffer,
): (offset: number) => number {
  if (info.float)
    return info.bitsPerSample === 64
      ? (offset) => bytes.readDoubleLE(offset)
      : (offset) => bytes.readFloatLE(offset);
  switch (info.bitsPerSample) {
    case 8:
      return (offset) => (bytes.readUInt8(offset) - 128) / 128;
    case 16:
      return (offset) => bytes.readInt16LE(offset) / 32768;
    case 24:
      return (offset) => bytes.readIntLE(offset, 3) / 8388608;
    case 32:
      return (offset) => bytes.readInt32LE(offset) / 2147483648;
    default:
      throw new Error(
        `Unsupported bit depth ${info.bitsPerSample}: ${info.path}`,
      );
  }
}

/** The mean of the channels. */
export function downmixV1(channels: readonly Float32Array[]): Float32Array {
  const first = channels[0];
  if (first === undefined) return new Float32Array(0);
  if (channels.length === 1) return Float32Array.from(first);
  const mono = new Float32Array(first.length);
  for (const channel of channels)
    for (let i = 0; i < mono.length; i += 1)
      mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / channels.length;
  return mono;
}

/**
 * Resamples by windowed-sinc interpolation (a Blackman window, 16 zero
 * crossings a side), with the cut-off lowered to the target's Nyquist when
 * the rate goes down, so nothing above it folds back.
 */
export function resampleV1(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return Float32Array.from(samples);
  const ratio = toRate / fromRate;
  const cutoff = Math.min(1, ratio) * 0.94;
  const zeroCrossings = 16;
  const reach = Math.ceil(zeroCrossings / cutoff);
  const length = Math.max(1, Math.floor(samples.length * ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const centre = i / ratio;
    const from = Math.max(0, Math.ceil(centre - reach));
    const to = Math.min(samples.length - 1, Math.floor(centre + reach));
    let sum = 0;
    for (let j = from; j <= to; j += 1) {
      const x = (j - centre) * cutoff;
      const w = (j - centre) / reach;
      const window =
        0.42 + 0.5 * Math.cos(Math.PI * w) + 0.08 * Math.cos(2 * Math.PI * w);
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      sum += (samples[j] ?? 0) * sinc * window * cutoff;
    }
    out[i] = sum;
  }
  return out;
}

/** A 16-bit PCM WAV file of one or more channels of equal length. */
export function encodeWav16V1(
  channels: readonly Float32Array[],
  sampleRate: number,
): Buffer {
  const frames = channels[0]?.length ?? 0;
  const blockAlign = channels.length * 2;
  const buffer = Buffer.alloc(44 + frames * blockAlign);
  buffer.write("RIFF", 0, "latin1");
  buffer.writeUInt32LE(36 + frames * blockAlign, 4);
  buffer.write("WAVEfmt ", 8, "latin1");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(WAVE_FORMAT_PCM, 20);
  buffer.writeUInt16LE(channels.length, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "latin1");
  buffer.writeUInt32LE(frames * blockAlign, 40);
  for (let frame = 0; frame < frames; frame += 1)
    channels.forEach((channel, index) => {
      const value = Math.max(-1, Math.min(1, channel[frame] ?? 0));
      buffer.writeInt16LE(
        Math.round(value < 0 ? value * 32768 : value * 32767),
        44 + frame * blockAlign + index * 2,
      );
    });
  return buffer;
}
