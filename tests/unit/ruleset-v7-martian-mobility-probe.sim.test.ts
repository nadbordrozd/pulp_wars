// Whole-game simulations split out of
// ruleset-v7-martian-mobility-probe.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { RULESET_7_ID, type MatchSetupV7 } from "../../src/engine/index";
import { runMartianMobilityProbeMatchV7 } from "../../src/headless/martian-mobility-probe-match-v7";

// `MARTIAN_MOBILITY_PROBE` (`pulp_wars-1wy.2`,
// docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 8.2). Two-seat
// 11 x 11 field: seat 0 Martian (the viewer, capital (8, 8)), seat 1 Human
// (capital (2, 8)); villages (5, 5), (8, 5), (5, 8); every other land tile
// is open Grass. Roles: FIGHTER Grunt, MARKSMAN Ray Gunner, RAIDER Saucer,
// CAPTAIN Brain, KNIGHT Mothership.

describe("Martian mobility probe: headless match", () => {
  const setup = (factions: MatchSetupV7["factions"]): MatchSetupV7 => ({
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    seed: 3,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "DRY_LAND",
  });

  it("plays both seat orders without an error, a stall, or a rejection, deterministically", () => {
    for (const factions of [
      ["MARTIAN", "ORIGINAL"],
      ["ORIGINAL", "MARTIAN"],
    ] as const) {
      const options = { probe: true, maxRounds: 12 };
      const first = runMartianMobilityProbeMatchV7(setup(factions), options);
      expect(first.error).toBeNull();
      expect(first.termination).not.toBe("ERROR");
      expect(first.usage.turns).toBeGreaterThan(0);
      expect(runMartianMobilityProbeMatchV7(setup(factions), options)).toEqual(
        first,
      );
    }
  }, 120_000);

  it("the comparison run is the plain Normal AI: no probe command", () => {
    const game = runMartianMobilityProbeMatchV7(
      setup(["MARTIAN", "ORIGINAL"]),
      { probe: false, maxRounds: 8 },
    );
    expect(game.error).toBeNull();
    expect(Object.values(game.tools).every((count) => count === 0)).toBe(true);
  }, 120_000);
});
