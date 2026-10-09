// Whole-game simulations split out of
// ruleset-v7-undead-graves.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseGameStateV7,
  parseReplayJsonV7,
  runReplayV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-13 Graves: state, events, and persistence", () => {
  it("round-trips Graves through replay, checkpoints, save, and state hashes", () => {
    // Seed 6: thirty rounds with the revision-16 economy numbers included a
    // Raise Dead or Devour (pulp_wars-vkq.9); seed 4 did before them, seed 2
    // on its revision-13 map. pulp_wars-9s0.1: with the campaign plan seed 6
    // ends without one; seed 2 has two (and five Graves left). On the
    // many-seats boards (`pulp_wars-ykw.3`) seed 2 ends in round 19 with
    // none; seed 4 has five Raise Dead (seven Graves raised, four left).
    // With tuning 4 (`pulp_wars-w49.3`) seed 4 raises or devours all ten of
    // its Graves; seed 8 removes five of ten and ends with five. With the
    // Undead pass (`pulp_wars-w49.13`) seed 8 ends with twelve Graves and
    // none removed; seed 9 removes eleven and ends with nine.
    const setup = setupWith(["UNDEAD", "UNDEAD"], 9);
    const match = runAiMatchV7(setup, { maxRounds: 30 });
    expect(match.errors).toEqual([]);
    expect(match.state.graves.length).toBeGreaterThan(0);
    // Normal AI raises and devours Graves (pulp_wars-vkq.9): every created
    // Grave is still on the board unless a Raise Dead or Devour removed it.
    const removed = match.events.reduce(
      (total, event) =>
        total +
        (event.kind === "DEAD_RAISED"
          ? event.results.length
          : event.kind === "GRAVE_DEVOURED"
            ? 1
            : 0),
      0,
    );
    expect(removed).toBeGreaterThan(0);
    expect(match.metrics.eventsByKind.GRAVE_CREATED).toBe(
      match.state.graves.length + removed,
    );
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
    expect(state.graves).toEqual(match.state.graves);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    const replayed = runReplayV7(parsedReplay.replay);
    expect(replayed.stateHash).toBe(match.stateHash);
    expect(replayed.state.graves).toEqual(match.state.graves);

    const withoutGrave = { ...state, graves: state.graves.slice(1) };
    expect(parseGameStateV7(withoutGrave)).not.toBeNull();
    expect(canonicalHash(withoutGrave)).not.toBe(canonicalHash(state));

    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    if (loaded.kind !== "VALID") return;
    expect(loaded.save.state.graves).toEqual(state.graves);
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: { graves: unknown[] };
    };
    tampered.state.graves = tampered.state.graves.slice(1);
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  }, 600_000);
});

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}
