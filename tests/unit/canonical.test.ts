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
});
