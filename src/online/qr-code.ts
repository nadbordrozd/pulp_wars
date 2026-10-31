/**
 * A small QR code encoder for the lobby's join link (`pulp_wars-hyan`,
 * docs/MULTIPLAYER.md section 10.1): a friend on a phone scans the code to
 * open the `?join=CODE` link. It runs in the browser with no network
 * service and no dependency.
 *
 * It follows ISO/IEC 18004 for the one case the game needs: byte mode,
 * error correction level M (about 15% of the symbol can be damaged),
 * versions 1 to 10 (up to 213 bytes, far more than a share link). The
 * mask is the one with the lowest penalty score, as the standard says.
 * The structure follows Project Nayuki's reference QR Code generator
 * (MIT).
 */

/** An encoded symbol: `modules[y][x]` is true for a dark module. */
export interface QrCodeV7 {
  readonly text: string;
  readonly version: number;
  /** Modules per side, `version * 4 + 17`, without the quiet zone. */
  readonly size: number;
  readonly mask: number;
  readonly modules: readonly (readonly boolean[])[];
}

/** The light margin a scanner needs round a symbol, in modules. */
export const QR_QUIET_ZONE_V7 = 4;
/** The largest version this encoder makes. */
export const QR_MAX_VERSION_V7 = 10;

// Level M, indexed by version (index 0 unused).
const ECC_CODEWORDS_PER_BLOCK_M = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26,
] as const;
const ERROR_CORRECTION_BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5] as const;
// The format bits of level M are 00.
const FORMAT_BITS_M = 0;

/** The bytes a scanner reads back: the text as UTF-8. */
export function qrPayloadBytesV7(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Encodes `text` (UTF-8, byte mode, level M) as a QR symbol. */
export function encodeQrCodeV7(text: string): QrCodeV7 {
  const bytes = qrPayloadBytesV7(text);
  let version = 1;
  for (; version <= QR_MAX_VERSION_V7; version += 1) {
    const needed = 4 + countBits(version) + bytes.length * 8;
    if (needed <= dataCodewords(version) * 8) break;
  }
  if (version > QR_MAX_VERSION_V7)
    throw new Error(`Too long for a QR code: ${bytes.length} bytes.`);
  const capacity = dataCodewords(version) * 8;
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, countBits(version));
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11)
    appendBits(bits, pad, 8);
  const data: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1)
      byte = (byte << 1) | (bits[index + bit] ?? 0);
    data.push(byte);
  }

  const grid = new Grid(version);
  grid.drawFunctionPatterns();
  grid.drawCodewords(addErrorCorrection(version, data));
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    grid.applyMask(mask);
    grid.drawFormatBits(mask);
    const penalty = grid.penalty();
    if (penalty < bestPenalty) {
      bestMask = mask;
      bestPenalty = penalty;
    }
    grid.applyMask(mask); // XOR again undoes it.
  }
  grid.applyMask(bestMask);
  grid.drawFormatBits(bestMask);
  return {
    text,
    version,
    size: grid.size,
    mask: bestMask,
    modules: grid.modules.map((row) => [...row]),
  };
}

/**
 * The SVG path of a symbol's dark modules, one `h1v1` square each, offset
 * by the quiet zone; the viewBox is `size + 2 * QR_QUIET_ZONE_V7` square.
 */
export function qrSvgPathV7(code: QrCodeV7): string {
  const parts: string[] = [];
  code.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark)
        parts.push(`M${x + QR_QUIET_ZONE_V7} ${y + QR_QUIET_ZONE_V7}h1v1h-1z`);
    });
  });
  return parts.join("");
}

// ---------------------------------------------------------------------
// Capacity

function countBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignments = Math.floor(version / 7) + 2;
    result -= (25 * alignments - 10) * alignments - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    (ECC_CODEWORDS_PER_BLOCK_M[version] ?? 0) *
      (ERROR_CORRECTION_BLOCKS_M[version] ?? 0)
  );
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let bit = length - 1; bit >= 0; bit -= 1) bits.push((value >>> bit) & 1);
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const positions = [6];
  for (
    let position = version * 4 + 10;
    positions.length < count;
    position -= step
  )
    positions.splice(1, 0, position);
  return positions;
}

// ---------------------------------------------------------------------
// Reed-Solomon error correction over GF(2^8), polynomial 0x11D

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let bit = 7; bit >= 0; bit -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> bit) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    for (let term = 0; term < degree; term += 1) {
      result[term] = gfMultiply(result[term] ?? 0, root);
      if (term + 1 < degree)
        result[term] = (result[term] ?? 0) ^ (result[term + 1] ?? 0);
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(
  data: readonly number[],
  divisor: readonly number[],
): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] = (result[index] ?? 0) ^ gfMultiply(coefficient, factor);
    });
  }
  return result;
}

/** Splits the data into blocks, adds each block's ECC, interleaves. */
function addErrorCorrection(
  version: number,
  data: readonly number[],
): number[] {
  const blockCount = ERROR_CORRECTION_BLOCKS_M[version] ?? 1;
  const eccLength = ECC_CODEWORDS_PER_BLOCK_M[version] ?? 0;
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortLength = Math.floor(rawCodewords / blockCount);
  const divisor = reedSolomonDivisor(eccLength);
  const blocks: number[][] = [];
  for (let block = 0, offset = 0; block < blockCount; block += 1) {
    const length = shortLength - eccLength + (block < shortBlocks ? 0 : 1);
    const part = data.slice(offset, offset + length);
    offset += length;
    const ecc = reedSolomonRemainder(part, divisor);
    if (block < shortBlocks) part.push(0);
    blocks.push([...part, ...ecc]);
  }
  const result: number[] = [];
  const width = blocks[0]?.length ?? 0;
  for (let column = 0; column < width; column += 1)
    blocks.forEach((block, index) => {
      if (column !== shortLength - eccLength || index >= shortBlocks)
        result.push(block[column] ?? 0);
    });
  return result;
}

// ---------------------------------------------------------------------
// The module grid

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  readonly #function: boolean[][];
  readonly #version: number;

  constructor(version: number) {
    this.#version = version;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
    this.#function = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
  }

  #set(x: number, y: number, dark: boolean): void {
    const row = this.modules[y];
    const reserved = this.#function[y];
    if (row === undefined || reserved === undefined) return;
    if (x < 0 || x >= this.size) return;
    row[x] = dark;
    reserved[x] = true;
  }

  drawFunctionPatterns(): void {
    for (let index = 0; index < this.size; index += 1) {
      this.#set(6, index, index % 2 === 0);
      this.#set(index, 6, index % 2 === 0);
    }
    this.#finder(3, 3);
    this.#finder(this.size - 4, 3);
    this.#finder(3, this.size - 4);
    const positions = alignmentPositions(this.#version);
    const last = positions.length - 1;
    positions.forEach((x, i) => {
      positions.forEach((y, j) => {
        const corner =
          (i === 0 && j === 0) ||
          (i === 0 && j === last) ||
          (i === last && j === 0);
        if (!corner) this.#alignment(x, y);
      });
    });
    this.drawFormatBits(0);
    this.#versionBits();
  }

  #finder(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy += 1)
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const yy = y + dy;
        if (yy >= 0 && yy < this.size)
          this.#set(x + dx, yy, distance !== 2 && distance !== 4);
      }
  }

  #alignment(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy += 1)
      for (let dx = -2; dx <= 2; dx += 1)
        this.#set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  drawFormatBits(mask: number): void {
    const data = (FORMAT_BITS_M << 3) | mask;
    let remainder = data;
    for (let index = 0; index < 10; index += 1)
      remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;
    const bit = (index: number): boolean => ((bits >>> index) & 1) !== 0;
    for (let index = 0; index <= 5; index += 1) this.#set(8, index, bit(index));
    this.#set(8, 7, bit(6));
    this.#set(8, 8, bit(7));
    this.#set(7, 8, bit(8));
    for (let index = 9; index < 15; index += 1)
      this.#set(14 - index, 8, bit(index));
    for (let index = 0; index < 8; index += 1)
      this.#set(this.size - 1 - index, 8, bit(index));
    for (let index = 8; index < 15; index += 1)
      this.#set(8, this.size - 15 + index, bit(index));
    this.#set(8, this.size - 8, true);
  }

  #versionBits(): void {
    if (this.#version < 7) return;
    let remainder = this.#version;
    for (let index = 0; index < 12; index += 1)
      remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (this.#version << 12) | remainder;
    for (let index = 0; index < 18; index += 1) {
      const dark = ((bits >>> index) & 1) !== 0;
      const a = this.size - 11 + (index % 3);
      const b = Math.floor(index / 3);
      this.#set(a, b, dark);
      this.#set(b, a, dark);
    }
  }

  /** The codewords in the standard's two-column zigzag. */
  drawCodewords(codewords: readonly number[]): void {
    let bit = 0;
    const total = codewords.length * 8;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let step = 0; step < this.size; step += 1)
        for (let side = 0; side < 2; side += 1) {
          const x = right - side;
          const y = upward ? this.size - 1 - step : step;
          const row = this.modules[y];
          if (row === undefined || this.#function[y]?.[x] === true) continue;
          if (bit < total) {
            row[x] =
              (((codewords[bit >>> 3] ?? 0) >>> (7 - (bit & 7))) & 1) !== 0;
            bit += 1;
          }
        }
    }
  }

  /** XORs the mask over the data modules (applying it twice undoes it). */
  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y += 1)
      for (let x = 0; x < this.size; x += 1) {
        const row = this.modules[y];
        if (row === undefined || this.#function[y]?.[x] === true) continue;
        if (maskBit(mask, x, y)) row[x] = !(row[x] ?? false);
      }
  }

  /** The standard's penalty score: runs, 2x2 blocks, finder look-alikes, balance. */
  penalty(): number {
    const size = this.size;
    const at = (x: number, y: number): boolean => this.modules[y]?.[x] ?? false;
    let result = 0;
    const lines: boolean[][] = [];
    for (let y = 0; y < size; y += 1)
      lines.push(Array.from({ length: size }, (_, x) => at(x, y)));
    for (let x = 0; x < size; x += 1)
      lines.push(Array.from({ length: size }, (_, y) => at(x, y)));
    const finderA = [
      true,
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ];
    const finderB = [
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
      false,
      true,
    ];
    for (const line of lines) {
      let run = 1;
      for (let index = 1; index <= size; index += 1) {
        if (index < size && line[index] === line[index - 1]) run += 1;
        else {
          if (run >= 5) result += run - 2;
          run = 1;
        }
      }
      for (let index = 0; index + 11 <= size; index += 1) {
        const matches = (pattern: readonly boolean[]): boolean =>
          pattern.every((value, offset) => line[index + offset] === value);
        if (matches(finderA) || matches(finderB)) result += 40;
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1) {
        const color = at(x, y);
        if (color) dark += 1;
        if (
          x + 1 < size &&
          y + 1 < size &&
          color === at(x + 1, y) &&
          color === at(x, y + 1) &&
          color === at(x + 1, y + 1)
        )
          result += 3;
      }
    const total = size * size;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}
