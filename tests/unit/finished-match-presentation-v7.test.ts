import { describe, expect, it } from "vitest";
import { viewForV7, type PlayerViewV7 } from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
import {
  finishedMatchSnapshotV7,
  finishedMatchViewV7,
} from "../../src/render/finished-match-v7";
import { rewardStateV7 } from "../fixtures/v7-dinosaur-arena";

/**
 * Bead pulp_wars-2ha0: the interface presents a finished match without
 * the city reward its winning capture may have queued. A hand-built state
 * with a pending reward, marked won; no match is played.
 */
function snapshotOf(
  view: PlayerViewV7,
  phase: Ruleset7BrowserSnapshot["phase"],
): Ruleset7BrowserSnapshot {
  return {
    phase,
    view,
    offeredCommands: [],
    savedAt: null,
    hasStoredSave: true,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: {
      active: false,
      fastForward: false,
      policySlices: 0,
      acceptedCommands: 0,
      lastSliceMilliseconds: 0,
      maximumSliceMilliseconds: 0,
    },
  };
}

function viewsV7(): {
  readonly live: PlayerViewV7;
  readonly won: PlayerViewV7;
} {
  const { state } = rewardStateV7("MILITIA", "DINOSAUR");
  const won = {
    ...state,
    outcome: { kind: "VICTORY" as const, winnerId: state.humanPlayerId },
  };
  return {
    live: viewForV7(state, state.humanPlayerId),
    won: viewForV7(won, won.humanPlayerId),
  };
}

describe("a finished match's presentation", () => {
  it("drops the pending choices of a won match, keeping one view identity", () => {
    const { won } = viewsV7();
    expect(won.pendingChoices).toHaveLength(1);
    const presented = finishedMatchViewV7(won);
    expect(presented.pendingChoices).toEqual([]);
    expect(presented.outcome).toEqual(won.outcome);
    expect(presented.cities).toBe(won.cities);
    expect(finishedMatchViewV7(won)).toBe(presented);
    // The engine's view is left as it was.
    expect(won.pendingChoices).toHaveLength(1);
  });

  it("leaves a match still on, and a finished match without choices, alone", () => {
    const { live } = viewsV7();
    expect(finishedMatchViewV7(live)).toBe(live);
    const active = snapshotOf(live, "ACTIVE");
    expect(finishedMatchSnapshotV7(active)).toBe(active);
    const empty = snapshotOf(live, "EMPTY");
    expect(finishedMatchSnapshotV7({ ...empty, view: null }).view).toBeNull();
  });

  it("gives a COMPLETE snapshot the presented view", () => {
    const { won } = viewsV7();
    const complete = snapshotOf(won, "COMPLETE");
    const presented = finishedMatchSnapshotV7(complete);
    expect(presented.view?.pendingChoices).toEqual([]);
    expect(presented.phase).toBe("COMPLETE");
    expect(complete.view?.pendingChoices).toHaveLength(1);
  });
});
