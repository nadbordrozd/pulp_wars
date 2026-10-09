// Helpers shared by ruleset-v7-revision16.test.ts and its
// whole-game simulations in ruleset-v7-revision16.sim.test.ts
// (`pulp_wars-bwry`).

import {
  RULESET_7_ID,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

export const MAP_TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];

export function setupFor(
  mapType: MapTypeV7,
  size: 11 | 14 | 16 | 20 | 25,
  aiCount: 1 | 2 | 3,
  seed: number,
  factions?: readonly FactionIdV7[],
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [
      ...(factions ??
        Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const)),
    ],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    // pulp_wars-w5j.1: the test only mirror option for the all-Human cells.
    ...mirrorOptionV7(factions ?? ["ORIGINAL", "ORIGINAL"]),
  };
}
