import { describe, expect, it } from "vitest";
import { hasExactKeysV7 } from "../../src/engine/v7/schema";

// Keep the previous sorted implementation here as a differential oracle.
function sortedExactKeys(input: unknown, expected: readonly string[]): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return false;
  const prototype = Object.getPrototypeOf(input) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return false;
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

describe("Ruleset 7 exact schema keys", () => {
  it("matches the sorted comparator for key multisets and property shapes", () => {
    const nullPrototype = Object.assign(Object.create(null) as object, {
      a: 1,
      b: 2,
    });
    const symbol = { a: 1, b: 2, [Symbol("extra")]: 3 };
    const nonEnumerable = { a: 1, b: 2 };
    Object.defineProperty(nonEnumerable, "b", { enumerable: false });
    const accessor = { a: 1, b: 2 };
    Object.defineProperty(accessor, "b", {
      enumerable: true,
      get: () => {
        throw new Error("key validation must not invoke getters");
      },
    });
    const nonWritable = { a: 1, b: 2 };
    Object.defineProperty(nonWritable, "b", { writable: false });
    const inherited = Object.create({ b: 2 }) as object;
    Object.assign(inherited, { a: 1 });
    const ownProtoKey = { constructor: 1, ["__proto__"]: 2 };
    expect(hasExactKeysV7(nullPrototype, ["b", "a"])).toBe(true);
    expect(hasExactKeysV7(ownProtoKey, ["constructor", "__proto__"])).toBe(
      true,
    );
    const cases: unknown[] = [
      null,
      1,
      "a",
      [],
      new Date(0),
      inherited,
      {},
      { a: 1 },
      { b: 2, a: 1 },
      { a: 1, b: 2, c: 3 },
      { 2: true, 1: true },
      { __proto__: null, a: 1, b: 2 },
      ownProtoKey,
      { "": 1, é: 2, "\ud83d\ude00": 3 },
      nullPrototype,
      symbol,
      nonEnumerable,
      accessor,
      nonWritable,
    ];
    const expectedLists = [
      [],
      ["a"],
      ["a", "b"],
      ["b", "a"],
      ["a", "a"],
      ["b", "b"],
      ["a", "b", "b"],
      ["a", "b", "c"],
      ["1", "2"],
      ["constructor", "__proto__"],
      ["😀", "", "é"],
    ];
    for (const input of cases) {
      for (const expected of expectedLists) {
        expect(hasExactKeysV7(input, expected)).toBe(
          sortedExactKeys(input, expected),
        );
      }
    }
  });

  it("rechecks mutable expected arrays and changed own properties on every call", () => {
    const expected = ["a", "b"];
    const input: Record<string, unknown> = { a: 1, b: 2 };
    const matches = () => {
      expect(hasExactKeysV7(input, expected)).toBe(
        sortedExactKeys(input, expected),
      );
    };
    matches();
    expected[1] = "a";
    matches();
    expected[1] = "b";
    matches();
    input.a = { changed: true };
    matches();
    Object.defineProperty(input, "b", { enumerable: false });
    matches();
    Object.defineProperty(input, "b", { enumerable: true });
    matches();
    input.extra = 3;
    matches();
    delete input.extra;
    matches();
  });
});
