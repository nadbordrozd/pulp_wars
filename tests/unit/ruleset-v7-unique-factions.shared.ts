// Helpers shared by ruleset-v7-unique-factions.test.ts and its
// whole-game simulations in ruleset-v7-unique-factions.sim.test.ts
// (`pulp_wars-bwry`).

import {
  RULESET_7_ID,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";

export function setupOf(
  factions: readonly FactionIdV7[],
  mapType: MatchSetupV7["mapType"] = "DRY_LAND",
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size =
    mapType === "SHOWCASE" ? 16 : aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed: 5,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}
