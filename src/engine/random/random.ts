import type { RandomState } from "../model/types";
import { utf8Bytes } from "../encoding/utf8";

const UINT32_RANGE = 0x1_0000_0000;
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;
const MULBERRY_INCREMENT = 0x6d2b_79f5;

export interface RandomDraw {
  readonly value: number;
  readonly random: RandomState;
}

export function randomState(seed: number): RandomState {
  assertUint32(seed, "seed");
  return { algorithm: "MULBERRY32", version: 1, state: seed };
}

export function seedFromText(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of utf8Bytes(input.normalize("NFC"))) {
    hash = Math.imul(hash ^ byte, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

export function nextUint32(random: RandomState): RandomDraw {
  validateRandomState(random);
  const state = (random.state + MULBERRY_INCREMENT) >>> 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1) >>> 0;
  value ^= (value + Math.imul(value ^ (value >>> 7), value | 61)) >>> 0;
  value = (value ^ (value >>> 14)) >>> 0;
  return { value, random: { ...random, state } };
}

export function nextBounded(random: RandomState, bound: number): RandomDraw {
  if (!Number.isInteger(bound) || bound < 1 || bound > UINT32_RANGE) {
    throw new RangeError("bound must be an integer in [1, 2^32]");
  }

  const threshold = UINT32_RANGE % bound;
  let cursor = random;
  for (;;) {
    const draw = nextUint32(cursor);
    cursor = draw.random;
    if (draw.value >= threshold) {
      return { value: draw.value % bound, random: cursor };
    }
  }
}

export function validateRandomState(value: RandomState): void {
  if (value.algorithm !== "MULBERRY32" || value.version !== 1) {
    throw new TypeError("Unsupported random-state format");
  }
  assertUint32(value.state, "random state");
}

function assertUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
    throw new RangeError(`${label} must be a uint32`);
  }
}
