// Helpers shared by ruleset-v7-revision18-showcase.test.ts and its
// whole-game simulations in ruleset-v7-revision18-showcase.sim.test.ts
// (`pulp_wars-bwry`).

import {
  RULESET_7_ID,
  type AiCountV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

export function showcaseSetup(
  factions: readonly FactionIdV7[],
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 618,
    width: 16,
    height: 16,
    aiCount: (factions.length - 1) as AiCountV7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    // pulp_wars-w5j.1: the test only mirror option for repeated factions.
    ...mirrorOptionV7(factions),
    ...overrides,
  };
}
