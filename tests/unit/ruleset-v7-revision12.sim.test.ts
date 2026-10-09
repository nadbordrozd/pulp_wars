// Whole-game simulations split out of
// ruleset-v7-revision12.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  runReplayV7,
  type GameStateV7,
  type ReplayFileV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { setupV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-12 Raider Escape", () => {
  it("round-trips a natural escape through replay and save", () => {
    // Revision 16 maps and openings differ (growth floor, growth-first AI
    // opening); seed 5 showed a natural escape within the same command cap
    // (seed 13 did on revision-14/15 maps, seed 3 on revision-13 maps).
    // pulp_wars-9s0.1: with the campaign plan the seed-5 Raider scouts
    // elsewhere; seed 1 shows a natural escape within the cap. On the
    // many-seats boards (`pulp_wars-ykw.3`) seed 2 does (of seeds 0-15:
    // 2, 8, 10, and 14). With tuning 1 (`pulp_wars-w49.3`, 7r46) seed 8
    // does (of seeds 0-15: 8, 10, and 14). With tuning 6
    // (`pulp_wars-w49.6`) seed 2 does (of seeds 0-15: 1, 2, 7, 9, 12, 13,
    // and 14).
    const setup = setupV7(2);
    const natural = runAiMatchV7(setup, { maxRounds: 40, maxCommands: 110 });
    const index = natural.commandLog.findIndex((entry) =>
      entry.events.some(
        (event) =>
          event.kind === "COMBAT_RESOLVED" && event.preview.escapeAvailable,
      ),
    );
    expect(index).toBeGreaterThanOrEqual(0);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay: ReplayFileV7 = createReplayV7(setup);
    for (const entry of natural.commandLog.slice(0, index + 1)) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("actor missing");
      const result = applyCommandV7(state, actor, entry.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, entry.command, state);
    }
    expect(state.units.some((item) => item.activation.escapeAvailable)).toBe(
      true,
    );
    expect(canonicalHash(runReplayV7(replay).state)).toBe(canonicalHash(state));
    const envelope = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-28T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") return;
    expect(canonicalHash(loaded.save.state)).toBe(canonicalHash(state));
  }, 600_000);
});
