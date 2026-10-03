import { describe, it } from "vitest";
import {
  SHOWCASE_HEADLESS_ROUNDS_V7,
  runShowcaseHeadlessMatchV7,
} from "../fixtures/v7-showcase-headless";

// The Dwarf revision (`pulp_wars-78i.3`): the Normal AI plays a Showcase with
// a Dwarf seat. Split out of ruleset-v7-dwarf-headless.test.ts and shortened
// from 15 rounds (`pulp_wars-9s0.13`) so it runs in parallel with that
// file's long matches and stays far from its timeout under load.

describe("headless Normal Showcase with a Dwarf seat", () => {
  it(`plays ${SHOWCASE_HEADLESS_ROUNDS_V7} rounds without errors`, () => {
    runShowcaseHeadlessMatchV7("DWARF");
  }, 600_000);
});
