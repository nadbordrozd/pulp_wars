// Whole-game simulations split out of
// ruleset-v7-many-seats-play.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// Many seats in play (`pulp_wars-ykw.3`, `pulp-wars-poc-7r42`,
// docs/product/RULESET_7_MAP_SCALE.md; current rules section 3): the rules
// of play never assumed four seats, and these tests hold that for eight:
// turn order, views, relationships, elimination and the outcome, save and
// replay, and the Normal AI issuing legal commands for every seat.

const SEATS = FACTION_IDS_V7.length;

function setup(overrides: Partial<MatchSetupV7> = {}): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 5,
    width: 11,
    aiCount: SEATS - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...FACTION_IDS_V7],
    mapType: "DRY_LAND",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
    ...overrides,
    height: overrides.width ?? 11,
  };
}

describe("ruleset-7 many seats in play (7r42)", () => {
  // Short capped matches only: they show that the Normal AI issues legal
  // commands for every one of eight seats without an error or a stall. They
  // measure neither strength nor time (`pulp_wars-ykw.4`).
  it.each([
    ["DRY_LAND", 11],
    ["ARCHIPELAGO", 14],
  ] as const)(
    "plays eight Normal seats on %s %i for a few rounds without an error or a stall",
    (mapType, width) => {
      const result = runAiMatchV7(setup({ mapType, width, seed: 2 }), {
        maxRounds: 4,
        maxCommands: 4000,
      });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      expect(["ROUND_CAP", "OUTCOME"]).toContain(result.termination);
      // Every seat that was still in play acted.
      const actors = new Set(result.commandLog.map((entry) => entry.playerId));
      expect(actors.size).toBeGreaterThanOrEqual(SEATS - 1);
    },
    600_000,
  );
});
