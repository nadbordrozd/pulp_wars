import { describe, expect, it } from "vitest";
import {
  SHOWCASE_HEADLESS_ROUNDS_V7,
  runShowcaseHeadlessMatchV7,
} from "../fixtures/v7-showcase-headless";

// The Martian revision (`pulp_wars-t6s.2`): the Normal AI plays a Showcase
// with a Martian seat. Split out of ruleset-v7-martian-headless.test.ts and
// shortened from 20 rounds (`pulp_wars-9s0.13`) so it runs in parallel with
// that file's long matches and stays far from its timeout under load.

describe("headless Normal Showcase with a Martian seat", () => {
  it(`plays ${SHOWCASE_HEADLESS_ROUNDS_V7} rounds, where every Martian unit exists from the first turn`, () => {
    const martian = runShowcaseHeadlessMatchV7("MARTIAN").metrics.martian;
    // Ray units fire and Shields absorb from the first rounds.
    expect(martian.raysFull + martian.raysHalf).toBeGreaterThan(0);
    expect(martian.rechargeEvents).toBeGreaterThan(0);
  }, 600_000);
});
