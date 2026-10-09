// Whole-game simulations split out of
// ruleset-v7-revision16-naval.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  runReplayV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import { setupV7 } from "../fixtures/v7-builders";

// Revision 16b (`pulp_wars-zsa`): Patrol Boats and embarked units have Move 2,
// and DISEMBARK spends one of those points (legal while the Move this turn
// spent at most one), docs/product/RULESET_7_REVISION_16.md sections 5 and
// 10.2.

describe("ruleset-7 revision-16 Normal AI landings", () => {
  it.each([
    ["ARCHIPELAGO", "ORIGINAL"],
    ["CONTINENTS", "UNDEAD"],
  ] as const)(
    "never issues a rejected DISEMBARK and lands only with a point left (%s, %s human seat)",
    (mapType, faction) => {
      const setup: MatchSetupV7 = {
        ...setupV7(3, 1),
        width: 14,
        height: 14,
        mapType,
        factions: [faction, "ORIGINAL"],
      };
      const match = runAiMatchV7(setup, {
        maxRounds: 40,
        recordCheckpointHashes: false,
      });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      const spentByUnit = new Map<number, number>();
      for (const entry of match.commandLog) {
        const command = entry.command;
        if (command.kind === "END_TURN") spentByUnit.clear();
        // The points a Move spent are the tiles it traversed: an interrupted
        // Move stops short of its commanded path.
        if (command.kind === "MOVE") {
          const moved = entry.events.find(
            (event) =>
              event.kind === "UNIT_MOVED" && event.unitId === command.unitId,
          );
          spentByUnit.set(
            command.unitId,
            moved?.kind === "UNIT_MOVED"
              ? moved.path.length
              : command.path.length,
          );
        }
        if (command.kind === "DISEMBARK")
          expect(spentByUnit.get(command.unitId) ?? 0).toBeLessThanOrEqual(1);
      }
    },
    600_000,
  );
});

describe("ruleset-7 revision-16 move-then-land persistence", () => {
  it("round-trips saves and replays through AI move-then-land turns", () => {
    const { setup, match, landingIndexes } = moveThenLandMatch();
    expect(landingIndexes.length).toBeGreaterThan(0);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const last = Math.max(...landingIndexes);
    for (const [index, record] of match.commandLog.entries()) {
      if (index > last) break;
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active player missing");
      const applied = applyCommandV7(state, actor, record.command);
      if (!applied.accepted) throw new Error(applied.error.code);
      state = applied.state;
      replay = appendReplayCommandV7(replay, record.command, state);
      if (!landingIndexes.includes(index)) continue;
      expect(record.command.kind).toBe("DISEMBARK");
      const save = createSaveEnvelopeV7(
        { state, replay },
        "2026-09-30T00:00:00.000Z",
      );
      const parsed = parseSaveV7(JSON.stringify(save));
      expect(parsed).toMatchObject({ kind: "VALID" });
      if (parsed.kind === "VALID") expect(parsed.save.state).toEqual(state);
      expect(runReplayV7(replay).state).toEqual(state);
    }
  }, 600_000);
});

/**
 * The first seed (from 0) whose 14 x 14 one-AI Archipelago Normal match has
 * a one-cell embarked Move immediately followed by that unit's landing.
 */
function moveThenLandMatch(): {
  readonly setup: MatchSetupV7;
  readonly match: ReturnType<typeof runAiMatchV7>;
  readonly landingIndexes: readonly number[];
} {
  for (let seed = 0; seed < 40; seed += 1) {
    const setup: MatchSetupV7 = {
      ...setupV7(seed, 1),
      width: 14,
      height: 14,
      mapType: "ARCHIPELAGO",
    };
    const match = runAiMatchV7(setup, {
      maxRounds: 40,
      recordCheckpointHashes: false,
    });
    const landingIndexes = match.commandLog.flatMap((entry, index) => {
      const previous = match.commandLog[index - 1]?.command;
      return entry.command.kind === "DISEMBARK" &&
        previous?.kind === "MOVE" &&
        previous.unitId === entry.command.unitId &&
        previous.path.length === 1
        ? [index]
        : [];
    });
    if (landingIndexes.length > 0) return { setup, match, landingIndexes };
  }
  throw new Error("no move-then-land match in seeds 0-39");
}
