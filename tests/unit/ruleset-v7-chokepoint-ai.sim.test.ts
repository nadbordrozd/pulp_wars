// Whole-game simulations split out of
// ruleset-v7-chokepoint-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { setChokepointPolicyOptionsV7 } from "../../src/ai/v7-chokepoint";
import { missionByIdV7, missionMatchSetupV7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { browserSetupV7 } from "../fixtures/v7-builders";

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

describe("ruleset-7 Normal AI siege of a single-file front (pulp_wars-68k.6)", () => {
  describe("matches", () => {
    it("decides an open board exactly as without the siege", () => {
      const setup = browserSetupV7(71);
      const on = runAiMatchV7(setup, { maxRounds: 12 });
      const previous = setChokepointPolicyOptionsV7({ siege: false });
      let off;
      try {
        off = runAiMatchV7(setup, { maxRounds: 12 });
      } finally {
        setChokepointPolicyOptionsV7(previous);
      }
      expect(on.metrics.commandHash).toBe(off.metrics.commandHash);
      expect(on.stateHash).toBe(off.stateHash);
    });

    it("plays the neck without a policy error or a stall", () => {
      const mission = required(missionByIdV7("TEST_NECK"));
      const result = runAiMatchV7(
        required(missionMatchSetupV7(mission, "ORIGINAL")),
        { maxRounds: 25 },
      );
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
    });
  });
});
