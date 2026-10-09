// Whole-game simulations split out of
// ruleset-v7-revision18-showcase.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { parseGameStateV7, type FactionIdV7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { showcaseSetup } from "./ruleset-v7-revision18-showcase.shared";

/**
 * Revision 18 section 5 (`pulp_wars-6gd.3`): the fixed `SHOWCASE` setup.
 * Every number of the section 5.3 ledger and income is recomputed here from
 * the engine's own ledger rules, not only compared with the built state.
 */

describe("ruleset-7 revision-18 Showcase play", () => {
  // Every faction plays as a Normal seat in a two-seat and a four-seat match.
  it.each<readonly [readonly FactionIdV7[]]>([
    [["ORIGINAL", "UNDEAD"]],
    [["GOBLIN", "GOBLIN"]],
    [["UNDEAD", "GOBLIN", "ORIGINAL", "GOBLIN"]],
  ])(
    "plays Normal against Normal %j for 20 rounds with no policy error",
    { timeout: 600_000 },
    (factions) => {
      const result = runAiMatchV7(showcaseSetup(factions), { maxRounds: 20 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"]).toContain(result.termination);
      expect(
        result.termination === "ROUND_CAP" ? result.rounds : 20,
      ).toBeGreaterThanOrEqual(20);
      expect(result.acceptedCommands).toBeGreaterThan(40);
      expect(parseGameStateV7(result.state)).not.toBeNull();
    },
  );
});
