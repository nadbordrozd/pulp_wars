// Whole-game simulations split out of
// ruleset-v7-mind-control.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import {
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  runReplayV7,
  viewForV7,
} from "../../src/engine/index";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md, engine
// step of `pulp_wars-b5f.3`): a mind-controlled unit keeps its type and
// abilities, fights for the Brain's owner, and goes back to its original
// owner when the Brain is lost.

describe("Mind Control revision: saves and replays (section 5.4)", () => {
  it("a Normal AI match replays and saves mid-control exactly", () => {
    // Martian against Ice Folk (seed 4 until the balance round,
    // `pulp_wars-1wy.3`, seed 9 until the Grunt's 8 HP, `pulp_wars-1wy.6`,
    // seed 13 until the village density, `pulp_wars-ykw.2`, seed 9 until the 3
    // starting Coins, `pulp_wars-if6`, seed 10 until the many-seats boards,
    // `pulp_wars-ykw.3`, seed 11 until tuning 1, `pulp_wars-w49.3`, after
    // which only seeds 24 and 32 of 0-40 did; seed 32 until tuning 2 (7r47,
    // no ranged unit advances), after which only seeds 11 and 24 of 0-60
    // did; seed 11 until tuning 3, after which seeds 4, 12, 25, 32, 58, and
    // 60 of 0-60 did; seed 12 until the economy rejig, `pulp_wars-w49.16`,
    // after which seeds 15, 24, 25, 30, 31, and 32 of 0-40 did; seed 15
    // until the ninth unit, `pulp_wars-w49.17`, after which seeds 4, 5,
    // 14, 24, 32, and 40 of 0-40 did; seed 14 until the Industry
    // reshuffle, `pulp_wars-w49.21`, 7r56, after which seeds 12, 15, 18,
    // 24, 25, 26, 32, and 37 of 0-40 did; seed 26 until step two of the
    // Ice Folk pass, `pulp_wars-w49.27`, 7r59, where both seats play the
    // army rules and the Ice Folk seat's Survey grants a Sled, after which
    // seeds 2, 7, 8, 9, 12, and 36 of 0-40 do; seed 36 now, at step 301):
    // the Normal AI
    // takes its first Mind Control within the 1,500 steps below. The
    // replay of the command log reaches the same state,
    // with the controlled unit, and a save of it loads back (the loader
    // replays the log, so a save needs a real match).
    const setup = goblinSetupV7(["MARTIAN", "ICE_FOLK"], 36);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    let perTurn = 0;
    for (
      let step = 0;
      step < 1500 && state.mindControlled.length === 0;
      step += 1
    ) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined || state.outcome !== null) break;
      const command = chooseNormalTurnCommandV7(
        viewForV7(state, actor),
        perTurn,
      ) ?? {
        kind: "END_TURN" as const,
      };
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      perTurn = command.kind === "END_TURN" ? 0 : perTurn + 1;
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    }
    expect(state.mindControlled).toHaveLength(1);
    const rerun = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(rerun.stateHash).toBe(canonicalHash(state));
    expect(rerun.state.mindControlled).toEqual(state.mindControlled);
    const loaded = parseSaveV7(
      JSON.stringify(
        createSaveEnvelopeV7({ state, replay }, "2026-10-03T12:00:00.000Z"),
      ),
    );
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind === "VALID")
      expect(canonicalHash(loaded.save.state)).toBe(canonicalHash(state));
  }, 600_000);
});
