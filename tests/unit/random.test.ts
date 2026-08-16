import { describe, expect, it } from "vitest";
import {
  nextBounded,
  nextUint32,
  randomState,
  seedFromText,
} from "../../src/engine/index";

describe("deterministic random utilities", () => {
  it("converts normalized UTF-8 text with FNV-1a", () => {
    expect(seedFromText("")).toBe(2_166_136_261);
    expect(seedFromText("hello")).toBe(0x4f9f_2cab);
    expect(seedFromText("e\u0301")).toBe(seedFromText("é"));
  });

  it("advances exact Mulberry32 uint32 state", () => {
    let cursor = randomState(1);
    const values: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      const draw = nextUint32(cursor);
      values.push(draw.value);
      cursor = draw.random;
    }
    expect(values).toEqual([
      2_693_262_067, 11_749_833, 2_265_367_787, 4_213_581_821,
    ]);
    expect(cursor.state).toBe((1 + 4 * 0x6d2b_79f5) >>> 0);
  });

  it("uses rejection sampling for bounded draws", () => {
    const draw = nextBounded(randomState(0), 0x8000_0001);
    expect(draw.value).toBeGreaterThanOrEqual(0);
    expect(draw.value).toBeLessThan(0x8000_0001);
    expect(draw.random.state).not.toBe(0x6d2b_79f5);
  });

  it("supports the full uint32 range", () => {
    const unbounded = nextUint32(randomState(42));
    const bounded = nextBounded(randomState(42), 0x1_0000_0000);
    expect(bounded).toEqual(unbounded);
  });
});
