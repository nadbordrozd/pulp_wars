// Whole-game simulations split out of
// ruleset-v7-monster-headless.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// Map curiosities, engine II (`pulp_wars-737.3`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.5): headless Normal
// matches with curiosities on. Split out of `ruleset-v7-monster.test.ts`
// and into one test per match (`pulp_wars-737.8`) so the three 25-round
// matches run beside that file's tests and the arena fuzz
// (`ruleset-v7-monster-fuzz.sim.test.ts`), each far from its timeout when
// `npm run check` runs on a busy machine.

describe("neutral-owner fuzz, headless matches (section 10.5)", () => {
  // `monsters` is the Giant Spiders the board draws: at least two of the
  // three matches play 25 rounds with one on the board. The seeds are those
  // of the village-density boards (`pulp_wars-ykw.2`, with the lair 4 from
  // a village and the wider reserve of `pulp_wars-ykw.7`), moved when the
  // round-2 kinds joined the kind draw (`pulp_wars-737.14`: 149 and 11
  // before).
  const matches: readonly {
    readonly seed: number;
    readonly mapType: MapTypeV7;
    readonly factions: readonly FactionIdV7[];
    readonly monsters: number;
  }[] = [
    {
      seed: 150,
      mapType: "PANGEA",
      factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
      monsters: 1,
    },
    {
      seed: 0,
      mapType: "LAKES",
      factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
      monsters: 1,
    },
    {
      seed: 7,
      mapType: "DRY_LAND",
      factions: ["MARTIAN", "ICE_FOLK", "DWARF"],
      monsters: 1,
    },
  ];

  for (const { seed, mapType, factions, monsters } of matches)
    it(`plays a headless Normal match with curiosities on at 16 x 16 without errors or stalls: ${mapType} seed ${seed}, ${factions.join(", ")}`, () => {
      const setup: MatchSetupV7 = {
        rulesetId: RULESET_7_ID,
        seed,
        width: 16,
        height: 16,
        aiCount: 2,
        aiDifficulty: "NORMAL",
        aiMode: "RIVAL",
        humanColor: "CORAL",
        factions: [...factions],
        mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
        curiosities: true,
      };
      const match = runAiMatchV7(setup, { maxRounds: 25 });
      expect(match.errors, `${seed} ${mapType}`).toEqual([]);
      expect(match.stalls, `${seed} ${mapType}`).toEqual([]);
      expect(match.metrics.monsters.placed).toBe(monsters);
    }, 600_000);
});
