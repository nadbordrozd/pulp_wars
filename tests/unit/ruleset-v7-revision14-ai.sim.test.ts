// Whole-game simulations split out of
// ruleset-v7-revision14-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { RULESET_7_ID, type MatchSetupV7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// Seed-2 DRY_LAND two-seat revision-13 board (11 x 11): seat 0 capital (8, 8),
// seat 1 capital (2, 8); rows 0-4 west of x 6 are open neutral land. Every
// scenario is seat 0 to move with every technology and a full treasury.

describe("ruleset-7 revision-14 Normal AI: headless play", () => {
  it("trains a Lich and plagues in a deterministic mixed match", () => {
    // pulp_wars-1mc: the seed-3 Continents match used before now enters the
    // Human seat's endgame siege at round 9 (three cities against one) and
    // the Undead seat never reaches a Lich; seed 5 Pangea still did until the
    // revision-16 economy numbers, and seed 4 Pangea did with them. Under the
    // revision-18 movement rules seed 4 no longer reaches a Lich within 40
    // rounds; seed 8 Pangea did. With the revision-21 achievements
    // (`pulp_wars-9s0.4`) a match changes once a seat unlocks one (seed 8:
    // Conqueror and Land Baron in round 16) and seed 8 ends in round 23
    // with no Lich; seed 4 Pangea trained one and plagued again. With the
    // campaign plan (`pulp_wars-9s0.1`) seed 4 ends in round 18 before any
    // Lich; seed 16 Pangea trained one and plagued (4 of seeds 0-23 trained a
    // Lich within 40 rounds, as before). With the revision-20 section 6.3
    // Human HP (`pulp_wars-0hi.3`) every match with a Human seat changes:
    // seed 16 reaches the 40-round cap without a Lich; seed 8 Pangea trains
    // one and plagues (3 of seeds 0-23 train a Lich within 40 rounds: 8,
    // 12, and 15). The Pangea coast ring (`pulp_wars-9s0.2`) regenerates
    // every Pangea board: seed 8 now ends in round 24 with no Lich; seed 3
    // Pangea trains two and plagues (3 of seeds 0-23 train a Lich within 40
    // rounds: 3, 7, and 11; 3 and 7 also plague). The village density
    // (`pulp_wars-ykw.2`) regenerates every board again: of seeds 0-23 only
    // seed 21 Pangea trains a Lich and plagues within 40 rounds.
    // With 3 starting Coins (`pulp_wars-if6`) every opening changes: of
    // seeds 0-23 only seed 3 Pangea trains a Lich (two) and plagues within
    // 40 rounds. Many seats (`pulp_wars-ykw.3`) regenerates every board
    // again: seeds 1, 7, 9, and 13 Pangea train a Lich and plague within 40
    // rounds (seed 1: two Liches, seven Plague applications). With tuning 1
    // (`pulp_wars-w49.3`, 7r46) seed 1 trains none; seeds 4, 5, 7, and 9
    // Pangea do and plague (seed 5: three Liches, 13 Plague applications).
    // With tuning 4 (`pulp_wars-w49.3`: research is priced by the
    // technologies owned, so the Normal AI reaches Sawmilling later) only
    // seeds 2, 12, and 13 of 0-15 train a Lich within 40 rounds, and only
    // seed 2 plagues (one Lich, one Plague application, over in round 26).
    // With tuning 6 (`pulp_wars-w49.6`: each faction's own research order,
    // the Undead by Drill, Marksmanship, and Administration to Sawmilling;
    // research at 1 Coin a technology owned) seed 2 trains three Liches
    // and plagues, over in round 30.
    // With tuning 7 (`pulp_wars-w49.10`: the assault on a local position,
    // growth research at the unit limit, wartime spending) seed 2 is over
    // in round 18 without a Lich; seeds 10, 11, 13, and 14 of 0-15 train
    // one and plague (seed 14: four Liches, over in round 22).
    // With tuning 8 (`pulp_wars-w49.11`: research on a clock while at war,
    // the capture of a reached center) seed 14 is over in round 24 without
    // a Lich; seeds 0, 2, 10, and 13 of 0-15 train one and plague (seed 0:
    // six Liches, ten Plague applications, 40 rounds). With its correction
    // pass seed 0 trains two Liches that never plague; seeds 2 and 6 of
    // 0-15 train one and plague (seed 2: three Liches, 17 Plague
    // applications, 38 rounds). The Goblin pass, correction
    // (`pulp_wars-w49.12`: the Human seat researches the Swordsman third):
    // seed 2 trains two Liches that never plague; of seeds 0-6 only seed 6
    // trains one and plagues (three applications, 40 rounds). The Undead
    // pass's correction (`pulp_wars-w49.13`: a Lich plagues only with
    // Pestilence, which the Undead seat researches once it fields two
    // Liches): seed 6 trains one Lich that never plagues; of seeds 0-15,
    // seeds 0 and 9 plague (seed 0: two Liches, 13 applications). The
    // ninth unit (`pulp_wars-w49.17`, 7r55: the Wight's technologies in
    // the Undead order): the two Liches of seed 0 never plague; of seeds
    // 0-19, seeds 8 and 13 plague (seed 8: four Liches, 7 applications).
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56: the Zombie and
    // the Guard behind Fortification): the two Liches of seed 8 never
    // plague; of seeds 0-19, seeds 2, 10, and 13 plague (seed 10: three
    // Liches, 10 applications, over in round 37). Step two of the Undead
    // pass (`pulp_wars-w49.24`, 7r57: the Undead seat trains before it
    // researches while it is short of units): seed 10 trains no Lich; of
    // seeds 0-19, seeds 1 and 5 plague (seed 1: three Liches, 9
    // applications, 40 rounds).
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["UNDEAD", "ORIGINAL"],
      mapType: "PANGEA",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    };
    const first = runAiMatchV7(setup, { maxRounds: 40 });
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(first.metrics.factionRoles.UNDEAD.trained.CATAPULT).toBeGreaterThan(
      0,
    );
    expect(first.metrics.undead.plagueApplications).toBeGreaterThan(0);
    const again = runAiMatchV7(setup, { maxRounds: 40 });
    expect(again.stateHash).toBe(first.stateHash);
  }, 600_000);
});
