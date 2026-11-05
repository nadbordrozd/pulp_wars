import { describe, expect, it } from "vitest";
import {
  PROMOTION_KILLS_V7,
  applyCommandV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { captureReadyUnitIdsV7 } from "../../src/render/canvas/unit-turn-state-v7";
import { unitHeadMarkerV7 } from "../../src/render/canvas/feedback-canvas-v7";
import { BoardFeedbackV7 } from "../../src/render/canvas/feedback-host-v7";
import {
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

/**
 * Bead pulp_wars-6ajn (the user's request of 2026-11-05): a flag over the
 * head of each of the viewer's units that may capture where it stands,
 * exactly when the engine offers it `CAPTURE`, in the Promotion marker's
 * slot and ahead of it. The arena (tests/fixtures/v7-goblin-arena.ts):
 * 11 x 11, seat 0 the viewer, a neutral village at (5, 5).
 */
const VILLAGE: CoordV7 = { x: 5, y: 5 };
const FAR: CoordV7 = { x: 1, y: 1 };

function arena(pieces: readonly GoblinPieceV7[], activeSeat = 0): GameStateV7 {
  return goblinArenaV7(["ORIGINAL", "ORIGINAL"], pieces, { activeSeat });
}

function ready(state: GameStateV7): ReadonlySet<number> {
  const view = viewForV7(state, state.humanPlayerId);
  return captureReadyUnitIdsV7(view, queryPlayerCommandsV7(view));
}

function enemyCity(state: GameStateV7): CoordV7 {
  const city = state.cities.find(
    (candidate) => candidate.ownerId === seatIdV7(state, 1),
  );
  if (city === undefined) throw new Error("fixture: no enemy city");
  return city.at;
}

describe("the Capture flag over a unit (pulp_wars-6ajn)", () => {
  it("marks a unit on a neutral village it may capture, and no other", () => {
    const state = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const capturer = unitAtV7(state, VILLAGE).id;
    expect(ready(state)).toEqual(new Set([capturer]));
  });

  it("marks a unit on an enemy city centre it may capture", () => {
    const base = arena([{ seat: 1, role: "FIGHTER", at: FAR }]);
    const centre = enemyCity(base);
    const state = arena([
      { seat: 0, role: "FIGHTER", at: centre, captureEligible: true },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const capturer = unitAtV7(state, centre).id;
    const view = viewForV7(state, state.humanPlayerId);
    expect(queryPlayerCommandsV7(view)).toContainEqual({
      kind: "CAPTURE",
      unitId: capturer,
    });
    expect(ready(state)).toEqual(new Set([capturer]));
  });

  it("shows nothing for a unit that is not yet capture-eligible", () => {
    // The unit surfaced or was set down on the village this turn.
    const state = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: false },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    expect(ready(state).size).toBe(0);
  });

  it("shows nothing for a unit that has just walked onto the village", () => {
    const from = { x: 4, y: 5 };
    const state = arena([
      { seat: 0, role: "FIGHTER", at: from },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const move = queryPlayerCommandsV7(state, state.humanPlayerId).find(
      (command) =>
        command.kind === "MOVE" &&
        command.path.at(-1)?.x === VILLAGE.x &&
        command.path.at(-1)?.y === VILLAGE.y,
    );
    if (move === undefined) throw new Error("fixture: no move to the village");
    const moved = applyCommandV7(state, state.humanPlayerId, move);
    if (!moved.accepted) throw new Error(moved.error.code);
    expect(unitAtV7(moved.state, VILLAGE).captureEligible).toBe(false);
    expect(ready(moved.state).size).toBe(0);
  });

  it("goes once the unit has captured, and for a unit that has acted", () => {
    const state = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const capturer = unitAtV7(state, VILLAGE).id;
    const captured = applyCommandV7(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: capturer,
    });
    if (!captured.accepted) throw new Error(captured.error.code);
    expect(ready(captured.state).size).toBe(0);
    // It attacks from the village, which handles it: no Capture is left.
    const beside = { x: 5, y: 6 };
    const armed = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
      { seat: 1, role: "FIGHTER", at: beside },
    ]);
    expect(ready(armed)).toEqual(new Set([unitAtV7(armed, VILLAGE).id]));
    const attacked = applyCommandV7(armed, armed.humanPlayerId, {
      kind: "ATTACK",
      unitId: unitAtV7(armed, VILLAGE).id,
      targetUnitId: unitAtV7(armed, beside).id,
    });
    if (!attacked.accepted) throw new Error(attacked.error.code);
    expect(unitAtV7(attacked.state, VILLAGE).activation.handled).toBe(true);
    expect(ready(attacked.state).size).toBe(0);
  });

  it("stays over a unit told to Wait, which the engine still lets capture", () => {
    const state = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const capturer = unitAtV7(state, VILLAGE).id;
    const waited = applyCommandV7(state, state.humanPlayerId, {
      kind: "WAIT",
      unitId: capturer,
    });
    if (!waited.accepted) throw new Error(waited.error.code);
    expect(ready(waited.state)).toEqual(new Set([capturer]));
  });

  it("shows nothing on another player's turn, nor for another player's unit", () => {
    const theirs = arena(
      [
        { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
        { seat: 1, role: "FIGHTER", at: FAR },
      ],
      1,
    );
    const view = viewForV7(theirs, theirs.humanPlayerId);
    expect(captureReadyUnitIdsV7(view, queryPlayerCommandsV7(view)).size).toBe(
      0,
    );
    // An enemy unit waiting on the village: the viewer is offered nothing.
    const enemy = arena([
      { seat: 0, role: "FIGHTER", at: FAR },
      { seat: 1, role: "FIGHTER", at: VILLAGE, captureEligible: true },
    ]);
    expect(ready(enemy).size).toBe(0);
  });

  it("takes the head slot ahead of the Promotion marker and the chevron", () => {
    const flag = { bobCssPx: 0 };
    const medal = { own: true, scale: 1, bobCssPx: 0 };
    expect(unitHeadMarkerV7(flag, medal, "FRESH")).toBe("CAPTURE");
    expect(unitHeadMarkerV7(flag, null, "SPENT")).toBe("CAPTURE");
    expect(unitHeadMarkerV7(null, medal, "FRESH")).toBe("PROMOTION");
    expect(unitHeadMarkerV7(null, null, "FRESH")).toBe("CHEVRON");
    expect(unitHeadMarkerV7(null, null, "ACTIVE")).toBeNull();
    expect(unitHeadMarkerV7(null, null, null)).toBeNull();
  });
});

describe("the feedback host's Capture flag (pulp_wars-6ajn)", () => {
  function host(state: GameStateV7, motion: "FULL" | "REDUCED" = "FULL") {
    const feedback = new BoardFeedbackV7({
      now: () => 1_400,
      draw: () => undefined,
      drawSerial: () => 0,
      browser: () => ({
        requestAnimationFrame: () => 1,
        cancelAnimationFrame: () => undefined,
      }),
      camera: () => ({ offsetX: 0, offsetY: 0, zoom: 1 }),
      canvasClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    });
    const view = viewForV7(state, state.humanPlayerId);
    feedback.sync({
      matchInstanceId: 1,
      view,
      offeredCommands: queryPlayerCommandsV7(view),
      interactive: true,
      motion,
      animationSpeed: "NORMAL",
      presentationPaused: false,
    });
    return { feedback, view };
  }

  it("gives the flag, bobbing, to the unit offered Capture, even a promotable one", () => {
    const base = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const state: GameStateV7 = {
      ...base,
      units: base.units.map((unit) =>
        unit.ownerId === base.humanPlayerId
          ? { ...unit, kills: PROMOTION_KILLS_V7 }
          : unit,
      ),
    };
    const { feedback, view } = host(state);
    const capturer = unitAtV7(state, VILLAGE).id;
    const other = unitAtV7(state, { x: 3, y: 3 }).id;
    const frame = feedback.boardFrame(view);
    expect(frame.captureMarker(capturer)?.bobCssPx).toBeLessThan(0);
    expect(frame.captureMarker(other)).toBeNull();
    // Both wait for their Promotion; the capturer shows the flag instead.
    expect(frame.promotionMarker(capturer)).not.toBeNull();
    expect(
      unitHeadMarkerV7(
        frame.captureMarker(capturer),
        frame.promotionMarker(capturer),
        frame.turnState(capturer),
      ),
    ).toBe("CAPTURE");
    expect(
      unitHeadMarkerV7(
        frame.captureMarker(other),
        frame.promotionMarker(other),
        frame.turnState(other),
      ),
    ).toBe("PROMOTION");
    expect(feedback.wantsAmbientFrames()).toBe(true);
  });

  it("holds the flag still in reduced motion and keeps no loop for it", () => {
    const state = arena([
      { seat: 0, role: "FIGHTER", at: VILLAGE, captureEligible: true },
      { seat: 1, role: "FIGHTER", at: FAR },
    ]);
    const { feedback, view } = host(state, "REDUCED");
    const capturer = unitAtV7(state, VILLAGE).id;
    expect(
      Math.abs(
        feedback.boardFrame(view).captureMarker(capturer)?.bobCssPx ?? 1,
      ),
    ).toBe(0);
    expect(feedback.wantsAmbientFrames()).toBe(false);
  });
});
