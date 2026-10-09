// Whole-game simulations split out of
// ruleset-v7-dinosaur-faction.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
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
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.2`): identity, Dinosaur registration, roster,
// technology text, starting units, substitutions, the Showcase, the declared
// Egg and Stampede shapes, and persistence
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md sections 2-4, 9.7, 9.8,
// 10, and 14). Slots, Grow, Wild, Acid, and Armoured are covered in
// tests/unit/ruleset-v7-dinosaur-rules.test.ts.

describe("ruleset-7 Dinosaur persistence and headless play", () => {
  it("round-trips Dinosaur seats through save, replay, and checkpoint hashes", () => {
    const setup: MatchSetupV7 = {
      // Seed 6 (was 7): since pulp_wars-c87.8 the 12-HP Cavemen of seed 7
      // win in ten rounds, before any Egg is laid. Seed 5 since the village
      // density (`pulp_wars-ykw.2`): on seed 6's new board no Egg hatches
      // within the 25 rounds.
      ...goblinSetupV7(["DINOSAUR", "UNDEAD"], 5),
      mapType: "PANGEA",
    };
    const match = runAiMatchV7(setup, { maxRounds: 25 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const kinds = new Set<string>();
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events) {
        expect(parseEventV7(event).ok).toBe(true);
        kinds.add(event.kind);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(kinds.has("UNIT_TRAINED")).toBe(true);
    // Eggs are laid, hatch, and round-trip through the replay and the save.
    expect(kinds.has("EGG_LAID")).toBe(true);
    expect(kinds.has("EGG_HATCHED")).toBe(true);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.factions).toEqual(["DINOSAUR", "UNDEAD"]);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-01T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    const swapped = JSON.parse(JSON.stringify(save)) as {
      state: { players: { faction: string; factionTreeId: string }[] };
    };
    const seat = swapped.state.players[0];
    if (seat === undefined) throw new Error("seat missing");
    seat.faction = "ORIGINAL";
    seat.factionTreeId = "ORIGINAL_BASELINE_V5";
    expect(parseSaveV7(JSON.stringify(swapped)).kind).not.toBe("VALID");
  }, 600_000);

  it("finishes headless Normal matches with Dinosaur seats without errors or stalls", () => {
    for (const [factions, mapType] of [
      [["DINOSAUR", "ORIGINAL"], "PANGEA"],
      [["UNDEAD", "DINOSAUR"], "CONTINENTS"],
      [["DINOSAUR", "GOBLIN"], "LAKES"],
      [["DINOSAUR", "DINOSAUR"], "DRY_LAND"],
    ] as const) {
      const setup: MatchSetupV7 = { ...goblinSetupV7(factions, 1), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 40 });
      expect(match.errors, factions.join()).toEqual([]);
      expect(match.stalls, factions.join()).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"]).toContain(match.termination);
      expect(parseGameStateV7(match.state)).not.toBeNull();
      // Deterministic.
      expect(runAiMatchV7(setup, { maxRounds: 40 }).stateHash).toBe(
        match.stateHash,
      );
    }
  }, 600_000);
});
