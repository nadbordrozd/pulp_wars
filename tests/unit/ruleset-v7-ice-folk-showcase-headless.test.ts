import { describe, expect, it } from "vitest";
import {
  SHOWCASE_HEADLESS_ROUNDS_V7,
  runShowcaseHeadlessMatchV7,
} from "../fixtures/v7-showcase-headless";

// The Ice Folk revision (`pulp_wars-7g3.3`): the Normal AI plays a Showcase
// with an Ice Folk seat. Split out of ruleset-v7-ice-folk-headless.test.ts
// and shortened from 20 rounds (`pulp_wars-9s0.13`) so it runs in parallel
// with that file's long matches and stays far from its timeout under load.

describe("headless Normal Showcase with an Ice Folk seat", () => {
  it(`plays ${SHOWCASE_HEADLESS_ROUNDS_V7} rounds; the Frost Giant's aura chills from the first rounds`, () => {
    const match = runShowcaseHeadlessMatchV7("ICE_FOLK");
    expect(match.metrics.iceFolk.snowTilesAtEndTurnMaximum).toBeGreaterThan(0);
  }, 600_000);
});
