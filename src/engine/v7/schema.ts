import {
  cityId,
  playerId,
  unitId,
  type CityId,
  type PlayerId,
  type UnitId,
} from "../model/ids";
import type { CoordV7 } from "./types";

export function isRecordV7(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return false;
  const prototype = Object.getPrototypeOf(input) as object | null;
  return prototype === Object.prototype || prototype === null;
}

export function hasExactKeysV7(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (!isRecordV7(input)) return false;
  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string")) return false;
  const actual = (keys as string[]).sort();
  const required = [...expected].sort();
  return (
    actual.length === required.length &&
    actual.every((key, index) => key === required[index]) &&
    actual.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      return descriptor?.enumerable === true && "value" in descriptor;
    })
  );
}

export function isDenseArrayV7(input: unknown): input is readonly unknown[] {
  if (
    !Array.isArray(input) ||
    Reflect.ownKeys(input).length !== input.length + 1
  )
    return false;
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (descriptor?.enumerable !== true || !("value" in descriptor))
      return false;
  }
  return true;
}

export function isSafeIntegerV7(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input);
}

export function isNonNegativeSafeIntegerV7(input: unknown): input is number {
  return isSafeIntegerV7(input) && input >= 0;
}

export function isPositiveSafeIntegerV7(input: unknown): input is number {
  return isSafeIntegerV7(input) && input >= 1;
}

export function isUint32V7(input: unknown): input is number {
  return isNonNegativeSafeIntegerV7(input) && input <= 0xffff_ffff;
}

export function parseCoordV7(input: unknown): CoordV7 | null {
  return hasExactKeysV7(input, ["x", "y"]) &&
    isSafeIntegerV7(input.x) &&
    isSafeIntegerV7(input.y)
    ? { x: input.x, y: input.y }
    : null;
}

function parseId<T>(input: unknown, brand: (value: number) => T): T | null {
  if (typeof input !== "number") return null;
  try {
    return brand(input);
  } catch {
    return null;
  }
}

export const parsePlayerIdV7 = (input: unknown): PlayerId | null =>
  parseId(input, playerId);
export const parseCityIdV7 = (input: unknown): CityId | null =>
  parseId(input, cityId);
export const parseUnitIdV7 = (input: unknown): UnitId | null =>
  parseId(input, unitId);

export function parseStrictlyAscendingIdsV7<T extends number>(
  input: unknown,
  parser: (value: unknown) => T | null,
): readonly T[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: T[] = [];
  for (const candidate of input) {
    const value = parser(candidate);
    if (value === null || (values.length > 0 && value <= (values.at(-1) as T)))
      return null;
    values.push(value);
  }
  return values;
}

export function parseOrderedStringsV7<T extends string>(
  input: unknown,
  order: readonly T[],
): readonly T[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: T[] = [];
  let prior = -1;
  for (const candidate of input) {
    const ordinal = order.indexOf(candidate as T);
    if (ordinal <= prior) return null;
    prior = ordinal;
    values.push(candidate as T);
  }
  return values;
}

export function compareCoordsV7(left: CoordV7, right: CoordV7): number {
  return left.y - right.y || left.x - right.x;
}

export function sameCoordV7(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
