// Whole-game simulations split out of
// ruleset-v7-endgame-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { RULESET_7_ID, type MatchSetupV7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

describe("ruleset-7 Normal AI endgame siege (pulp_wars-1mc)", () => {
  it.each([
    // Round-capped (150) at c7b1849 in the revision-15 balance matrix.
    {
      factions: ["ORIGINAL", "ORIGINAL"],
      seed: 7,
      mapType: "ARCHIPELAGO",
      rounds: 60,
    },
    {
      factions: ["ORIGINAL", "ORIGINAL"],
      seed: 0,
      mapType: "PANGEA",
      rounds: 60,
    },
    // Revision 20 (`pulp_wars-0hi.2`): a Promotion fully heals, so this
    // match leaves its revision-19 course at its first Promotion of a
    // wounded unit and now ends by conquest in round 142 (was round 47). It
    // still finishes below the 150-round cap without a stall; eight other
    // Undead mirror seeds on this map stay within five rounds of revision 19.
    // With the revision-21 achievements it ended in round 55, and with the
    // campaign plan (`pulp_wars-9s0.1`) it ends in round 35.
    { factions: ["UNDEAD", "UNDEAD"], seed: 0, mapType: "PANGEA", rounds: 150 },
  ] as const)(
    "finishes a formerly stalled $factions $mapType seed $seed match",
    ({ factions, seed, mapType, rounds }) => {
      const match = runAiMatchV7(
        { ...setupWith(seed), factions: [...factions], mapType },
        { maxRounds: 150, recordCheckpointHashes: false },
      );
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(match.termination).toBe("OUTCOME");
      expect(match.rounds).toBeLessThan(rounds);
    },
    600_000,
  );
});

function setupWith(seed = 2): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL"],
    allowDuplicateFactions: true,
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}
