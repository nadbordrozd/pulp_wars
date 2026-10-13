import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { resolveUnitFitOffset } from "../../scripts/art/unit-fit-offset";

// The Catapult's portrait was retired with bead pulp_wars-67q.15 and its
// world sprite with the rest of the legacy art (bead pulp_wars-lky5).
const RULESET7_CATAPULT_WORLD_ID = "unit-original-catapult";
const RULESET7_CATAPULT_PORTRAIT_ID = "portrait-original-catapult";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly class: string;
  readonly stage: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly output: string;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly postprocess?: string;
  readonly fitOffsetX?: number;
  readonly fitOffsetY?: number;
  readonly styleReference?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

describe("Ruleset 7 Original Catapult production art", () => {
  it("applies bounded integer fit offsets and preserves the no-offset default", () => {
    const bounds = { left: 72, top: 64, right: 311, bottom: 288 };
    const hard = { left: 16, top: 8, right: 368, bottom: 336 };
    expect(resolveUnitFitOffset(bounds, hard)).toEqual({
      x: 0,
      y: 0,
      shiftedBounds: bounds,
    });
    expect(resolveUnitFitOffset(bounds, hard, 50, 21)).toEqual({
      x: 50,
      y: 21,
      shiftedBounds: { left: 122, top: 85, right: 361, bottom: 309 },
    });
    expect(() => resolveUnitFitOffset(bounds, hard, 58, 21)).toThrow(
      "exceeds hard bounds",
    );
    expect(() => resolveUnitFitOffset(bounds, hard, 50, 49)).toThrow(
      "exceeds hard bounds",
    );
    expect(() => resolveUnitFitOffset(bounds, hard, 0, 1.5)).toThrow(
      "finite integer",
    );
    expect(() => resolveUnitFitOffset(bounds, hard, Number.NaN, 0)).toThrow(
      "finite integer",
    );
    expect(() =>
      resolveUnitFitOffset(bounds, hard, 0, Number.POSITIVE_INFINITY),
    ).toThrow("finite integer");
  });

  it("retires the world sprite and the portrait with their hashes on record", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly recipes: readonly Recipe[];
      readonly retired: readonly {
        readonly id: string;
        readonly output: string;
        readonly outputSha256?: string;
      }[];
    };
    expect(
      source.recipes.some(({ id }) => id === RULESET7_CATAPULT_PORTRAIT_ID),
    ).toBe(false);
    expect(
      source.retired.find(({ id }) => id === RULESET7_CATAPULT_PORTRAIT_ID),
    ).toMatchObject({
      output: "public/assets/pixellab/ui/portrait-original-catapult.png",
      outputSha256:
        "18e928c5584fc31bd9e451601c55f7fc5b5d08a264f562b77c556c394e00dd4c",
    });
    expect(
      source.recipes.some(({ id }) => id === RULESET7_CATAPULT_WORLD_ID),
    ).toBe(false);
    expect(
      source.retired.find(({ id }) => id === RULESET7_CATAPULT_WORLD_ID),
    ).toMatchObject({
      output: "public/assets/pixellab/units/original-catapult.png",
      outputSha256:
        "67e7f8cb6fc9a36b385eed9aecc2a12fb2884701cb7661d5503f8dbcf373c360",
    });
  });
});
