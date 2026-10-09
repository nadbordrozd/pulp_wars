// Helpers shared by ruleset-v6-ai-headless.test.ts and its
// whole-game simulations in ruleset-v6-ai-headless.sim.test.ts
// (`pulp_wars-bwry`).

import { createPlayableGameV6 } from "../../src/engine/v6/reducer";
import type {
  FactionIdV6,
  GameStateV6,
  MatchSetupV6,
} from "../../src/engine/v6/types";

export function setupV6(overrides: Partial<MatchSetupV6> = {}): MatchSetupV6 {
  const aiCount = overrides.aiCount ?? 1;
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 0,
    width: aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16,
    height: aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, (_, index): FactionIdV6 =>
      index % 2 === 0 ? "ORIGINAL" : "CANDY",
    ),
    ...overrides,
  };
}

export function createdState(setup: MatchSetupV6 = setupV6()): GameStateV6 {
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}
