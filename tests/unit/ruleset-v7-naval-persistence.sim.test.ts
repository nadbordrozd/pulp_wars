// Whole-game simulations split out of
// ruleset-v7-naval-persistence.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  runReplayV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import { setupV7 } from "../fixtures/v7-builders";

describe("ruleset-7 naval persistence schema", () => {
  it("round-trips a bounded AI naval match through save and replay", () => {
    const setup = { ...setupV7(0), mapType: "ARCHIPELAGO" as const };
    const match = runAiMatchV7(setup, { maxRounds: 10, maxCommands: 300 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active player missing");
      const applied = applyCommandV7(state, actor, record.command);
      if (!applied.accepted) throw new Error(applied.error.code);
      state = applied.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(state.pendingChoices).toEqual([]);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-23T00:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(runReplayV7(replay).state).toEqual(state);
  }, 600_000);
});
