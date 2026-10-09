// Helpers shared by ruleset-v7-undead-ai.test.ts and its
// whole-game simulations in ruleset-v7-undead-ai.sim.test.ts
// (`pulp_wars-bwry`).

import {
  RULESET_7_ID,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

export function setupWith(
  factions: readonly FactionIdV7[],
  seed = 2,
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

export function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("fixture value missing");
  return value;
}
