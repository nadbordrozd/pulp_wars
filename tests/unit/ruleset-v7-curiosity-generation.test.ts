import { describe, expect, it } from "vitest";
import {
  CURIOSITY_KINDS_V7,
  generateInitialMapV7,
  type CuriosityKindV7,
} from "../../src/engine/index";
import {
  CURIOSITY_MAP_TYPES_V7,
  CURIOSITY_ON_OFF_SEEDS_V7,
  CURIOSITY_ON_OFF_SIZES_V7,
  checkCuriosityOnOffBoardV7,
  curiosityGeneratedSetupV7,
} from "../fixtures/v7-curiosity-generation";

// Map curiosities (`pulp_wars-737.2`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md section 4): the on/off check of
// every map type, five sizes, and seeds 0 to 5. Split out of
// `ruleset-v7-curiosities.test.ts` and into one test per map type
// (`pulp_wars-737.8`): the 150 boards took one 120 s test past its timeout
// when `npm run check` ran on a busy machine. The same boards and
// assertions run here beside that file, each part far from its timeout.

describe("generation, option on against off (section 4)", () => {
  for (const mapType of CURIOSITY_MAP_TYPES_V7)
    it(`on and off generate the same board, cities, units, entity IDs, chests, turn order, and PRNG; placement obeys section 4: ${mapType}`, () => {
      let boards = 0;
      for (const [width, aiCount] of CURIOSITY_ON_OFF_SIZES_V7)
        for (let seed = 0; seed < CURIOSITY_ON_OFF_SEEDS_V7; seed += 1) {
          checkCuriosityOnOffBoardV7(mapType, width, aiCount, seed);
          boards += 1;
        }
      expect(boards).toBe(30);
    }, 600_000);

  it("places every kind somewhere, usually none on a small board and at most two on a large one (section 4.2)", () => {
    // The same 150 boards, generated once each with the option on.
    const seen = new Set<CuriosityKindV7 | "MONSTER">();
    const counts: Record<number, number[]> = {};
    for (const mapType of CURIOSITY_MAP_TYPES_V7)
      for (const [width, aiCount] of CURIOSITY_ON_OFF_SIZES_V7)
        for (let seed = 0; seed < CURIOSITY_ON_OFF_SEEDS_V7; seed += 1) {
          const generated = generateInitialMapV7(
            curiosityGeneratedSetupV7(seed, mapType, width, aiCount, true),
          );
          if (!generated.ok) throw new Error("map");
          const { curiosities, monsterHome } = generated.map;
          for (const curiosity of curiosities) seen.add(curiosity.kind);
          if (monsterHome !== null) seen.add("MONSTER");
          (counts[width] ??= []).push(
            curiosities.length + (monsterHome === null ? 0 : 1),
          );
        }
    expect([...seen].sort()).toEqual(["MONSTER", ...CURIOSITY_KINDS_V7].sort());
    const mean = (values: readonly number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(counts[11]).toHaveLength(30);
    expect(Math.max(...(counts[11] ?? []))).toBeLessThanOrEqual(1);
    expect(mean(counts[11] ?? [])).toBeLessThan(0.5);
    expect(Math.max(...(counts[16] ?? []))).toBeLessThanOrEqual(1);
    expect(Math.max(...(counts[25] ?? []))).toBeLessThanOrEqual(2);
    expect(mean(counts[25] ?? [])).toBeGreaterThan(mean(counts[11] ?? []));
  }, 600_000);
});
