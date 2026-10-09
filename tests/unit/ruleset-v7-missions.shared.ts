// Helpers shared by ruleset-v7-missions.test.ts and its
// whole-game simulations in ruleset-v7-missions.sim.test.ts
// (`pulp_wars-bwry`).

import {
  missionByIdV7,
  missionMatchSetupV7,
  type FactionIdV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type TechnologyIdV7,
} from "../../src/engine/index";

// The naval branch (`pulp_wars-5ti.2`): five technologies.
export const NAVAL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

export function testGrounds(): MissionDefinitionV7 {
  const mission = missionByIdV7("TEST_GROUNDS");
  if (mission === null) throw new Error("TEST_GROUNDS is not registered");
  return mission;
}

export function groundsSetup(
  faction: FactionIdV7 = "ORIGINAL",
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  const setup = missionMatchSetupV7(testGrounds(), faction);
  if (setup === null) throw new Error("no TEST_GROUNDS setup");
  return { ...setup, ...overrides };
}
