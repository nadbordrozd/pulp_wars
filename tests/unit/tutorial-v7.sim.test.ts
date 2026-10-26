import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import type { GameStateV7 } from "../../src/engine/index";
import {
  TUTORIAL_PLACES_V7,
  TUTORIAL_STEPS_V7,
} from "../../src/render/tutorial-v7";
import { apply, human, playTutorialV7 } from "../fixtures/v7-tutorial-play";

/**
 * The tutorial (bead pulp_wars-2yc.115) played through its eight turns
 * against the Normal AI's Goblins, as in the browser: the seat's `HOLD`
 * keeps it in its corner, so every step of the script stays legal, the
 * waves of round 7 arrive where the script needs them, and the Knight's
 * three kills come off. A simulation: the Normal AI plays seven turns of
 * the match, so it is in the sim tier (`npm run test:sim`).
 */
function aiTurn(start: GameStateV7): GameStateV7 {
  let state = start;
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined || actor === state.humanPlayerId)
    throw new Error("not an AI turn");
  for (let accepted = 0; accepted < 96; accepted += 1) {
    const view = human(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      96,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("the AI chose nothing");
    state = apply(state, actor, command);
    if (command.kind === "END_TURN") return state;
  }
  throw new Error("the AI turn did not end");
}

describe("the tutorial against the Normal AI", () => {
  it("every step is reached and done, and the Knight kills the three Goblins", () => {
    const play = playTutorialV7({ opponent: aiTurn });
    expect(play.visited).toEqual(TUTORIAL_STEPS_V7.map((step) => step.id));
    expect(play.progress).toEqual({ completed: true, step: null });
    expect(play.state.outcome).toBeNull();
    expect(play.state.round).toBe(8);
    const knight = play.state.units.find(
      (unit) =>
        unit.role === "KNIGHT" && unit.ownerId === play.state.humanPlayerId,
    );
    expect(knight?.kills).toBe(3);
    expect(knight?.at).toEqual(TUTORIAL_PLACES_V7.goblin3);
    // The Goblins kept to their corner: none of the player's units was hit.
    for (const unit of play.state.units.filter(
      (item) => item.ownerId === play.state.humanPlayerId,
    ))
      expect(unit.hp, unit.role).toBe(unit.maxHp);
  });
});
