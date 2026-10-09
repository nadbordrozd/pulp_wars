// Whole-game simulations split out of
// ruleset-v7-curiosities-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7,
  setCuriosityPolicyOptionsV7,
} from "../../src/ai/v7-curiosities";
import {
  RULESET_7_ID,
  createPlayableGameV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// Map curiosities, the Normal AI (`pulp_wars-737.4`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 11 and 13.3).
//
// The Spider tests use the four-seat 16 x 16 arena of `monsterArenaV7`: the
// viewer (seat 0, player 1) has its capital on (4, 4); the Spider stands on
// its lair (7, 7). The other tests use the two-seat 11 x 11 arena: the
// viewer's capital on (8, 8), seat 1's on (2, 8), villages (5, 5), (8, 5),
// and (5, 8).

afterEach(() => {
  setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
});

describe("the gate and the switch (section 11, Gating)", () => {
  it("keeps the hash of headless matches without a curiosity", () => {
    const setup = (
      seed: number,
      mapType: MapTypeV7,
      factions: readonly FactionIdV7[],
      curiosities: boolean,
    ): MatchSetupV7 => ({
      rulesetId: RULESET_7_ID,
      seed,
      width: 16,
      height: 16,
      aiCount: (factions.length - 1) as MatchSetupV7["aiCount"],
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: [...factions],
      mapType,
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities,
    });
    // Seed 1 of the four-seat 16 x 16 Dry Land board has no legal curiosity
    // site (no tile is 5 from all four capitals, as on most such boards),
    // so the option on places none; the other match has it off.
    const cases = [
      setup(2, "PANGEA", ["ORIGINAL", "GOBLIN"], false),
      setup(1, "DRY_LAND", ["ORIGINAL", "GOBLIN", "UNDEAD", "DINOSAUR"], true),
    ];
    for (const match of cases) {
      const created = createPlayableGameV7(match);
      if (!created.ok) throw new Error(created.error.code);
      expect(created.state.curiosities).toEqual([]);
      expect(created.state.monsters).toEqual([]);
      const aware = runAiMatchV7(match, { maxRounds: 12 });
      setCuriosityPolicyOptionsV7({ curiosityPlay: false });
      const blind = runAiMatchV7(match, { maxRounds: 12 });
      setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
      expect(aware.errors).toEqual([]);
      expect(aware.stateHash).toBe(blind.stateHash);
      expect(aware.metrics.commandHash).toBe(blind.metrics.commandHash);
    }
  }, 300_000);
});
