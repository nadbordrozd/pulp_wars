import {
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  NEW_TUTORIAL_PROGRESS_V7,
  TUTORIAL_MISSION_ID_V7,
  TUTORIAL_STEPS_V7,
  TUTORIAL_STORAGE_KEY_V7,
  acknowledgeTutorialV7,
  advanceTutorialV7,
  serializeTutorialProgressV7,
  startTutorialV7,
  tutorialExpectedCommandV7,
  tutorialStepV7,
  type TutorialProgressV7,
  type TutorialStepIdV7,
} from "../../src/render/tutorial-v7";

/**
 * The tutorial (bead pulp_wars-0yxy) at one of its steps, for the DOM tests
 * and the phone review: the tutorial board with the script's commands
 * applied by the engine up to that step, and the browser record that says
 * the tutorial is running there. The opponent's turn between the player's
 * two is an End Turn with nothing done; no AI runs.
 */
export class TutorialStorageV7 implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

/** The tutorial board before any command. */
export function tutorialStartStateV7(): GameStateV7 {
  const mission = missionByIdV7(TUTORIAL_MISSION_ID_V7);
  const setup = mission === null ? null : missionMatchSetupV7(mission);
  if (setup === null) throw new Error("the tutorial mission is missing");
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

export interface TutorialFixtureV7 {
  readonly state: GameStateV7;
  readonly progress: TutorialProgressV7;
  /** Settings storage holding `progress` under the tutorial's key. */
  readonly storage: TutorialStorageV7;
}

/** The tutorial with every step before `at` done. */
export function tutorialFixtureV7(at: TutorialStepIdV7): TutorialFixtureV7 {
  let state = tutorialStartStateV7();
  let progress = startTutorialV7(NEW_TUTORIAL_PROGRESS_V7);
  for (const step of TUTORIAL_STEPS_V7) {
    if (step.id === at) break;
    if (tutorialStepV7(progress)?.id !== step.id)
      throw new Error(`the tutorial is not at ${step.id}`);
    if (step.expects === null) {
      progress = acknowledgeTutorialV7(progress);
      continue;
    }
    const view = viewForV7(state, state.humanPlayerId);
    const command = tutorialExpectedCommandV7(
      progress,
      view,
      queryPlayerCommandsV7(view),
    );
    if (command === null) throw new Error(`${step.id} is not offered`);
    const applied = applyCommandV7(state, state.humanPlayerId, command);
    if (!applied.accepted) throw new Error(applied.error.code);
    state = applied.state;
    progress = advanceTutorialV7(progress, view, command);
    if (command.kind === "END_TURN") {
      const opponent = state.turnOrder[state.activeSeatIndex];
      if (opponent === undefined) throw new Error("no active seat");
      const ended = applyCommandV7(state, opponent, { kind: "END_TURN" });
      if (!ended.accepted) throw new Error(ended.error.code);
      state = ended.state;
    }
  }
  const storage = new TutorialStorageV7();
  storage.setItem(
    TUTORIAL_STORAGE_KEY_V7,
    serializeTutorialProgressV7(progress),
  );
  return { state, progress, storage };
}
