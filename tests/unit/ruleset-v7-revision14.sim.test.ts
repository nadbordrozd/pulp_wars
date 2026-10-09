// Whole-game simulations split out of
// ruleset-v7-revision14.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseEventV7,
  parseReplayJsonV7,
  runReplayV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { setupWith } from "./ruleset-v7-revision14.shared";

// Boards: the seed-2 DRY_LAND revision-13 boards the Undead tests use.
// - two seats (11 x 11): capitals (8, 8) and (2, 8); rows 0-4 west of x 6
//   are open neutral land.
// - three seats (14 x 14): capitals (2, 2), (11, 11), and (11, 2); the cells
//   used below (x 5-8, y 6-9, off the settlement lattice) are neutral.

describe("ruleset-7 revision-14 natural play and persistence", () => {
  it("round-trips Plague and Bitten from ordinary Normal AI play", () => {
    // Seed 5 on the many-seats boards (`pulp_wars-ykw.3`: 17 Plague
    // applications and 42 bites; seed 2 with 3 starting Coins,
    // `pulp_wars-if6`; seed 15 with the revision-16 economy numbers no
    // longer plagues, as seed 16 before it). With tuning 1
    // (`pulp_wars-w49.3`, 7r46) seed 5 trains no Lich; seed 12 has 33
    // Plague applications and 42 bites (of seeds 0-15, seeds 6, 7, 11, 12,
    // 13, and 15 plague). With tuning 3 (`pulp_wars-w49.3`) seed 12 trains
    // no Lich; seed 3 has 37 Plague applications and 62 bites (of seeds
    // 0-23, seeds 2, 3, 5, 8, 11, 18, 22, and 23 plague). With tuning 6
    // (`pulp_wars-w49.6`: the Undead research Drill first and a third of
    // their army is Zombies) seed 3 has 25 Plague applications and 15
    // bites. With tuning 8 (`pulp_wars-w49.11`: research on a clock while
    // at war) seed 3 is over in round 29 without a Lich; seed 15 has 19
    // Plague applications and 43 bites (of seeds 0-15, seeds 0, 2, 5, 6,
    // 8, 14, and 15 plague). With the Undead pass's correction
    // (`pulp_wars-w49.13`: a Lich plagues only with Pestilence, which the
    // Undead seat researches once it fields two Liches) seed 15 trains two
    // Liches that never plague; of seeds 0-16, seeds 0, 6, and 8 plague
    // (seed 8: three Liches, 7 Plague applications, 23 bites). With the
    // ninth unit (`pulp_wars-w49.17`, 7r55: the Wight's two technologies
    // in the Undead order) seed 8 never plagues; of seeds 0-23, seeds 10,
    // 18, and 23 plague (seed 23: 6 Plague applications, 20 bites).
    // With the Industry reshuffle (`pulp_wars-w49.21`, 7r56: the Zombie
    // and the Guard behind Fortification) of seeds 0-19, seeds 6, 9, 14,
    // and 15 plague (seed 9: two Liches, 25 Plague applications, 30
    // bites); eleven of the twenty matches are over by round 22.
    // With step two of the Human pass (`pulp_wars-w49.22`: what a Human
    // seat of the Normal AI trains) the Undead seat of seed 9 never
    // plagues; of seeds 0-19, seeds 6 and 15 plague (seed 6: 8 Plague
    // applications, 20 bites, over in round 35).
    // With step two of the Undead pass (`pulp_wars-w49.24`, 7r57: the
    // Undead seat trains before it researches while it is short of units)
    // the three Liches of seed 6 never plague; of seeds 0-19, seeds 0 and
    // 3 plague (seed 3: three Liches, 6 Plague applications, 51 bites,
    // over in round 39).
    const setup = setupWith(["UNDEAD", "ORIGINAL"], 3);
    const match = runAiMatchV7(setup, { maxRounds: 45 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const undead = match.metrics.undead;
    expect(undead.plagueApplications).toBeGreaterThan(0);
    expect(undead.bites).toBeGreaterThan(0);
    let applications = 0;
    let bites = 0;
    for (const event of match.events) {
      expect(parseEventV7(event).ok).toBe(true);
      if (event.kind === "COMBAT_RESOLVED") {
        applications += event.preview.plagued.length;
        bites +=
          Number(event.preview.attackerBitten) +
          Number(event.preview.defenderBitten);
      }
    }
    expect(undead.plagueApplications).toBe(applications);
    expect(undead.bites).toBe(bites);
    expect(undead.bittenRisings).toBe(
      match.metrics.eventsByKind.BITTEN_UNIT_RISEN ?? 0,
    );
    expect(undead.plaguedRemaining).toBe(match.state.plagued.length);
    expect(undead.bittenRemaining).toBe(match.state.bitten.length);

    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    const parsed = parseReplayJsonV7(JSON.stringify(replay));
    if (parsed.kind !== "VALID") throw new Error(parsed.kind);
    expect(runReplayV7(parsed.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);
});
