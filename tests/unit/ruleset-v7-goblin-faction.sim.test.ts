// Whole-game simulations split out of
// ruleset-v7-goblin-faction.test.ts (`pulp_wars-bwry`): they
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
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// Revision 17 (`pulp_wars-0ao.2`): identity, Goblin registration, roster,
// starting units, substitutions, Warrens, per-viewer technology text, and
// persistence (docs/product/RULESET_7_REVISION_17_GOBLINS.md sections 2-5, 8,
// 9, and 13).

describe("ruleset-7 Goblin persistence", () => {
  it("round-trips Goblin seats through save, replay, and checkpoint hashes", () => {
    const setup = goblinSetupV7(["GOBLIN", "UNDEAD"], 7);
    const match = runAiMatchV7(setup, { maxRounds: 8 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events)
        expect(parseEventV7(event).ok).toBe(true);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.factions).toEqual(["GOBLIN", "UNDEAD"]);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-30T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    const swapped = JSON.parse(JSON.stringify(save)) as {
      state: { players: { faction: string; factionTreeId: string }[] };
    };
    const goblinSeat = swapped.state.players[0];
    if (goblinSeat === undefined) throw new Error("seat missing");
    goblinSeat.faction = "ORIGINAL";
    goblinSeat.factionTreeId = "ORIGINAL_BASELINE_V5";
    expect(parseSaveV7(JSON.stringify(swapped)).kind).not.toBe("VALID");
  }, 600_000);

  it("finishes headless Goblin matches without errors or stalls", () => {
    for (const factions of [
      ["GOBLIN", "ORIGINAL"],
      ["UNDEAD", "GOBLIN"],
      ["GOBLIN", "GOBLIN"],
    ] as const) {
      const match = runAiMatchV7(
        { ...goblinSetupV7(factions, 1), mapType: "PANGEA" },
        { maxRounds: 60 },
      );
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"]).toContain(match.termination);
    }
  }, 600_000);
});
