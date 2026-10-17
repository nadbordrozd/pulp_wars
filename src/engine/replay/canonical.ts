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

// The pure engine build omits DOM types, while both supported runtimes expose
// the same native UTF-8 encoder on globalThis.
const UTF8_ENCODER = new (
  globalThis as typeof globalThis & {
    readonly TextEncoder: new () => { encode(value: string): Uint8Array };
  }
).TextEncoder();

export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  return serialize(value, ancestors, null, null);
}

export function canonicalHash(value: unknown): string {
  return sha256Hex(UTF8_ENCODER.encode(canonicalJson(value)));
}

export function compareUnicodeCodePoints(left: string, right: string): number {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex) ?? 0;
    const rightPoint = right.codePointAt(rightIndex) ?? 0;
    const difference = leftPoint - rightPoint;
    if (difference !== 0) {
      return difference;
    }
    leftIndex += leftPoint > 0xffff ? 2 : 1;
    rightIndex += rightPoint > 0xffff ? 2 : 1;
  }
  return (
    remainingCodePoints(left, leftIndex) -
    remainingCodePoints(right, rightIndex)
  );
}

function remainingCodePoints(value: string, start: number): number {
  let count = 0;
  for (let index = start; index < value.length; count += 1) {
    index += (value.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
  }
  return count;
}

/**
 * Where a value sits in the serialized root, for the error messages only
 * (`pulp_wars-2yc.79`: the path text is built when an error is thrown,
 * never for a value that serializes): the parent's place and this value's
 * array index or object key; the root has neither.
 */
interface CanonicalPlaceV7 {
  readonly parent: CanonicalPlaceV7 | null;
  readonly segment: string | number | null;
}

/** `$`, then `[index]` for an array item and `.key` for a property. */
function pathText(
  parent: CanonicalPlaceV7 | null,
  segment: string | number | null,
): string {
  const segments: (string | number)[] = [];
  if (segment !== null) segments.push(segment);
  for (let place = parent; place !== null; place = place.parent)
    if (place.segment !== null) segments.push(place.segment);
  let path = "$";
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const item = segments[index];
    path += typeof item === "number" ? `[${item}]` : `.${String(item)}`;
  }
  return path;
}

/** A key with a UTF-16 surrogate, whose code point order may differ. */
const SURROGATE = /[\uD800-\uDFFF]/;

function serialize(
  value: unknown,
  ancestors: Set<object>,
  parent: CanonicalPlaceV7 | null,
  segment: string | number | null,
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
        throw new TypeError(
          `Non-safe-integer JSON number at ${pathText(parent, segment)}`,
        );
      }
      return Object.is(value, -0) ? "0" : String(value);
    case "object":
      break;
    default:
      throw new TypeError(
        `${parent === null && segment === null ? "Root value" : `Value at ${pathText(parent, segment)}`} is not JSON-compatible`,
      );
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Cyclic JSON value at ${pathText(parent, segment)}`);
  }
  ancestors.add(value);
  try {
    const place: CanonicalPlaceV7 = { parent, segment };
    if (Array.isArray(value)) {
      validateArray(value, place);
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1)
        items.push(serialize(value[index], ancestors, place, index));
      return `[${items.join(",")}]`;
    }

    const prototype: object | null = Object.getPrototypeOf(value) as
      object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(
        `Non-plain JSON object at ${pathText(parent, segment)}`,
      );
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) {
      throw new TypeError(`Symbol key at ${pathText(parent, segment)}`);
    }
    const stringKeys = keys as string[];
    let surrogates = false;
    for (const key of stringKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw new TypeError(
          `Non-data JSON property at ${pathText(parent, segment)}.${key}`,
        );
      }
      if (!surrogates && SURROGATE.test(key)) surrogates = true;
    }
    // Without a surrogate, UTF-16 code unit order (the default sort) is
    // code point order; keys are distinct, so the order is the same.
    if (surrogates) stringKeys.sort(compareUnicodeCodePoints);
    else stringKeys.sort();
    const items: string[] = [];
    for (const key of stringKeys) {
      const item = (value as Record<string, unknown>)[key];
      items.push(
        `${JSON.stringify(key)}:${serialize(item, ancestors, place, key)}`,
      );
    }
    return `{${items.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function validateArray(
  value: readonly unknown[],
  place: CanonicalPlaceV7,
): void {
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new TypeError(
        `Sparse JSON array at ${pathText(place.parent, place.segment)}[${index}]`,
      );
    }
  }
  const keys = Reflect.ownKeys(value);
  const expectedKeyCount = value.length + 1;
  if (keys.length !== expectedKeyCount || !keys.includes("length")) {
    throw new TypeError(
      `Array with extra properties at ${pathText(place.parent, place.segment)}`,
    );
  }
}

const SHA256_K = Int32Array.from(SHA256_CONSTANTS);

/**
 * SHA-256 (FIPS 180-4) of the bytes, as lowercase hex. `pulp_wars-2yc.79`:
 * the same digest as before, computed in 32-bit integer registers (the
 * message words read through a big-endian DataView, every sum taken with
 * `| 0`, the rotations written out), with no per-block allocation.
 */
function sha256Hex(input: Uint8Array): string {
  const padded = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  padded.set(input);
  padded[input.length] = 0x80;
  const bitLength = input.length * 8;
  const high = Math.floor(bitLength / 0x1_0000_0000);
  const low = bitLength >>> 0;
  const data = new DataView(padded.buffer);
  data.setUint32(padded.length - 8, high);
  data.setUint32(padded.length - 4, low);

  const words = new Int32Array(64);
  const k = SHA256_K;
  let h0 = SHA256_INITIAL[0] | 0;
  let h1 = SHA256_INITIAL[1] | 0;
  let h2 = SHA256_INITIAL[2] | 0;
  let h3 = SHA256_INITIAL[3] | 0;
  let h4 = SHA256_INITIAL[4] | 0;
  let h5 = SHA256_INITIAL[5] | 0;
  let h6 = SHA256_INITIAL[6] | 0;
  let h7 = SHA256_INITIAL[7] | 0;
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1)
      words[index] = data.getInt32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const w15 = words[index - 15] ?? 0;
      const w2 = words[index - 2] ?? 0;
      const sigma0 =
        ((w15 >>> 7) | (w15 << 25)) ^
        ((w15 >>> 18) | (w15 << 14)) ^
        (w15 >>> 3);
      const sigma1 =
        ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      words[index] =
        ((words[index - 16] ?? 0) + sigma0 + (words[index - 7] ?? 0) + sigma1) |
        0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const sum1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h + sum1 + choice + (k[index] ?? 0) + (words[index] ?? 0)) | 0;
      const sum0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) | 0;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => (word >>> 0).toString(16).padStart(8, "0"))
    .join("");
}
