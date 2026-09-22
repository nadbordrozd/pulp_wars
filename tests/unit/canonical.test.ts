import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalJson,
  compareUnicodeCodePoints,
} from "../../src/engine/index";

describe("canonical JSON", () => {
  it("sorts keys by Unicode code-point order", () => {
    const value = { "\u{10000}": 1, "\ue000": 2, z: 3, a: 4 };
    expect(canonicalJson(value)).toBe('{"a":4,"z":3,"":2,"𐀀":1}');
    expect(compareUnicodeCodePoints("\ue000", "\u{10000}")).toBeLessThan(0);
  });

  it("is independent of object insertion order", () => {
    expect(canonicalJson({ b: 2, a: { y: 2, x: 1 } })).toBe(
      canonicalJson({ a: { x: 1, y: 2 }, b: 2 }),
    );
  });

  it("hashes canonical UTF-8 bytes with SHA-256", () => {
    const value = { greeting: "héllo 🌍", count: 3 };
    const canonical = canonicalJson(value);
    const expected = createHash("sha256")
      .update(canonical, "utf8")
      .digest("hex");
    expect(canonicalHash(value)).toBe(expected);
  });

  it("matches the original code-point comparator including unpaired surrogates and prefixes", () => {
    const symbols = [
      "a",
      "\u0000",
      "\ue000",
      "\ud800",
      "\udc00",
      "\u{10000}",
      "\u{10ffff}",
    ];
    const oldCompare = (left: string, right: string): number => {
      const leftPoints = [...left].map((symbol) => symbol.codePointAt(0) ?? 0);
      const rightPoints = [...right].map(
        (symbol) => symbol.codePointAt(0) ?? 0,
      );
      for (
        let index = 0;
        index < Math.min(leftPoints.length, rightPoints.length);
        index += 1
      ) {
        const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
        if (difference !== 0) return difference;
      }
      return leftPoints.length - rightPoints.length;
    };
    const keys = ["", ...symbols];
    for (const first of symbols) {
      for (const second of symbols) keys.push(first + second);
    }
    for (const left of keys) {
      for (const right of keys) {
        expect(compareUnicodeCodePoints(left, right)).toBe(
          oldCompare(left, right),
        );
      }
    }
    const uniqueKeys = [...new Set(keys)];
    const object = Object.fromEntries(
      uniqueKeys.map((key, index) => [key, index]),
    );
    const expected = `{${uniqueKeys
      .sort(oldCompare)
      .map((key) => `${JSON.stringify(key)}:${JSON.stringify(object[key])}`)
      .join(",")}}`;
    expect(canonicalJson(object)).toBe(expected);
  });

  it("matches Node SHA-256 at UTF-8 padding boundaries and over many blocks", () => {
    const values = [
      // JSON string quotes add two bytes to each ASCII payload.
      ...[0, 1, 53, 54, 55, 61, 62, 63, 117, 118, 119, 4096, 131072].map(
        (length) => "x".repeat(length),
      ),
      "\ud800",
      "\udc00",
      "a\ud800b\udc00c",
      "🌍".repeat(1000),
      { "\u{10000}": "\ud800", "\ue000": "🌍", zero: -0 },
    ];
    for (const value of values) {
      const json = canonicalJson(value);
      expect(canonicalHash(value)).toBe(
        createHash("sha256").update(json, "utf8").digest("hex"),
      );
    }
  });

  it("rehashes changed nested values even when the parent is frozen", () => {
    const nested = { value: 1 };
    const value = Object.freeze({ nested });
    const before = canonicalHash(value);
    nested.value = 2;
    expect(canonicalHash(value)).not.toBe(before);
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1.5,
    undefined,
    new Date(0),
    new Map(),
  ])("rejects non-canonical value %#", (value) => {
    expect(() => canonicalJson(value)).toThrow(TypeError);
  });

  it("rejects sparse arrays", () => {
    const sparse: unknown[] = [1, 2, 3];
    Reflect.deleteProperty(sparse, "1");
    expect(() => canonicalJson(sparse)).toThrow(/Sparse/);
  });

  it("rejects cycles", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(/Cyclic/);
  });

  it("retains rejection of non-data properties, symbols, and decorated arrays", () => {
    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => 1,
    });
    const hidden = Object.defineProperty({}, "value", { value: 1 });
    const symbol = { [Symbol("value")]: 1 };
    const decorated = Object.assign([1], { extra: 2 });
    for (const [value, message] of [
      [accessor, /Non-data JSON property/],
      [hidden, /Non-data JSON property/],
      [symbol, /Symbol key/],
      [decorated, /Array with extra properties/],
    ] as const) {
      expect(() => canonicalHash(value)).toThrow(message);
    }
  });
});
