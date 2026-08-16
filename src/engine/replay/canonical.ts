import { utf8Bytes } from "../encoding/utf8";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const SHA256_INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
] as const;

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  return serialize(value, ancestors, "$", true);
}

export function canonicalHash(value: unknown): string {
  return sha256Hex(utf8Bytes(canonicalJson(value)));
}

export function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = [...left].map((symbol) => symbol.codePointAt(0) ?? 0);
  const rightPoints = [...right].map((symbol) => symbol.codePointAt(0) ?? 0);
  const sharedLength = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return leftPoints.length - rightPoints.length;
}

function serialize(
  value: unknown,
  ancestors: Set<object>,
  path: string,
  isRoot: boolean,
): string {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new TypeError(`Non-safe-integer JSON number at ${path}`);
      }
      return Object.is(value, -0) ? "0" : String(value);
    case "object":
      break;
    default:
      throw new TypeError(
        `${isRoot ? "Root value" : `Value at ${path}`} is not JSON-compatible`,
      );
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Cyclic JSON value at ${path}`);
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      validateArray(value, path);
      return `[${value
        .map((item, index) =>
          serialize(item, ancestors, `${path}[${index}]`, false),
        )
        .join(",")}]`;
    }

    const prototype: object | null = Object.getPrototypeOf(value) as
      object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain JSON object at ${path}`);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) {
      throw new TypeError(`Symbol key at ${path}`);
    }
    const stringKeys = keys as string[];
    for (const key of stringKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw new TypeError(`Non-data JSON property at ${path}.${key}`);
      }
    }
    stringKeys.sort(compareUnicodeCodePoints);
    return `{${stringKeys
      .map((key) => {
        const item = (value as Record<string, unknown>)[key];
        return `${JSON.stringify(key)}:${serialize(item, ancestors, `${path}.${key}`, false)}`;
      })
      .join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function validateArray(value: readonly unknown[], path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new TypeError(`Sparse JSON array at ${path}[${index}]`);
    }
  }
  const keys = Reflect.ownKeys(value);
  const expectedKeyCount = value.length + 1;
  if (keys.length !== expectedKeyCount || !keys.includes("length")) {
    throw new TypeError(`Array with extra properties at ${path}`);
  }
}

function sha256Hex(input: readonly number[]): string {
  const padded = [...input, 0x80];
  while (padded.length % 64 !== 56) {
    padded.push(0);
  }
  const bitLength = input.length * 8;
  const high = Math.floor(bitLength / 0x1_0000_0000);
  const low = bitLength >>> 0;
  for (const shift of [24, 16, 8, 0]) {
    padded.push((high >>> shift) & 0xff);
  }
  for (const shift of [24, 16, 8, 0]) {
    padded.push((low >>> shift) & 0xff);
  }

  const hash: number[] = [...SHA256_INITIAL];
  const words = new Array<number>(64).fill(0);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const wordOffset = offset + index * 4;
      words[index] =
        (((padded[wordOffset] ?? 0) << 24) |
          ((padded[wordOffset + 1] ?? 0) << 16) |
          ((padded[wordOffset + 2] ?? 0) << 8) |
          (padded[wordOffset + 3] ?? 0)) >>>
        0;
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = words[index - 15] ?? 0;
      const previous2 = words[index - 2] ?? 0;
      const sigma0 =
        rotateRight(previous15, 7) ^
        rotateRight(previous15, 18) ^
        (previous15 >>> 3);
      const sigma1 =
        rotateRight(previous2, 17) ^
        rotateRight(previous2, 19) ^
        (previous2 >>> 10);
      words[index] =
        ((words[index - 16] ?? 0) +
          sigma0 +
          (words[index - 7] ?? 0) +
          sigma1) >>>
        0;
    }

    let [a, b, c, d, e, f, g, h] = hash as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h +
          sum1 +
          choice +
          (SHA256_CONSTANTS[index] ?? 0) +
          (words[index] ?? 0)) >>>
        0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    hash[0] = ((hash[0] ?? 0) + a) >>> 0;
    hash[1] = ((hash[1] ?? 0) + b) >>> 0;
    hash[2] = ((hash[2] ?? 0) + c) >>> 0;
    hash[3] = ((hash[3] ?? 0) + d) >>> 0;
    hash[4] = ((hash[4] ?? 0) + e) >>> 0;
    hash[5] = ((hash[5] ?? 0) + f) >>> 0;
    hash[6] = ((hash[6] ?? 0) + g) >>> 0;
    hash[7] = ((hash[7] ?? 0) + h) >>> 0;
  }

  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

function rotateRight(value: number, count: number): number {
  return (value >>> count) | (value << (32 - count));
}
