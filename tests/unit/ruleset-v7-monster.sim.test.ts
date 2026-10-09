// Whole-game simulations split out of
// ruleset-v7-monster.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseEventV7,
  parseGameStateV7,
  parseReplayJsonV7,
  runReplayV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";

// Map curiosities, engine II (`pulp_wars-737.3`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 8 to 10 and 13.2): the
// Giant Spider, its neutral owner and registration, the neutral turn,
// provocation, the wander, the immunities, the bounty, the view, the
// previews, and persistence.

describe("parsing, saves, and replays (sections 10.2 and 8.9)", () => {
  it("round-trips a generated match with a Monster through the replay and the save", () => {
    // 16 x 16 Dry Land seed 8 with three seats draws a Monster (seed 7
    // before the village density, `pulp_wars-ykw.2`; seed 11 until the
    // round-2 kinds joined the kind draw, `pulp_wars-737.14`).
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 8,
      width: 16,
      height: 16,
      aiCount: 2,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: true,
    };
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.monsters).toHaveLength(1);
    const match = runAiMatchV7(setup, { maxRounds: 12 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    expect(match.metrics.monsters.placed).toBe(1);
    let state = created.state;
    let replay = createReplayV7(setup);
    let neutralTurns = 0;
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events) {
        expect(parseEventV7(event).ok).toBe(true);
        if (event.kind === "NEUTRAL_TURN_STARTED") neutralTurns += 1;
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(neutralTurns).toBeGreaterThanOrEqual(10);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);
});
