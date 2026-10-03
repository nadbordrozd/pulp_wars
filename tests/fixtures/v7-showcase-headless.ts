import { expect } from "vitest";
import {
  RULESET_7_ID,
  parseGameStateV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7, type AiMatchResultV7 } from "../../src/headless/v7";

/**
 * The rounds a faction's headless Showcase match plays (`pulp_wars-9s0.13`).
 * Every seat starts with every role and every technology, so the faction
 * mechanics the tests check (Snow, Rays, Shield recharges) already appear
 * within three rounds. Eight rounds keep a margin past that at about half the
 * cost of the former 20 (the opening rounds are the most expensive).
 */
export const SHOWCASE_HEADLESS_ROUNDS_V7 = 8;

/**
 * A Normal AI Showcase match with `faction` in the first seat against
 * Human, Undead, and Goblin seats, checked to end at the round cap (or an
 * outcome) without a policy error, a stall, or an invalid state.
 */
export function runShowcaseHeadlessMatchV7(
  faction: FactionIdV7,
): AiMatchResultV7 {
  const setup: MatchSetupV7 = {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: 16,
    height: 16,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, "ORIGINAL", "UNDEAD", "GOBLIN"],
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
  const match = runAiMatchV7(setup, {
    maxRounds: SHOWCASE_HEADLESS_ROUNDS_V7,
  });
  expect(match.errors).toEqual([]);
  expect(match.stalls).toEqual([]);
  expect(["OUTCOME", "ROUND_CAP"]).toContain(match.termination);
  expect(parseGameStateV7(match.state)).not.toBeNull();
  return match;
}
