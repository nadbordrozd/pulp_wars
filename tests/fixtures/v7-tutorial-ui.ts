import type { GameStateV7 } from "../../src/engine/index";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  TUTORIAL_STORAGE_KEY_V7,
  serializeTutorialProgressV7,
  type TutorialProgressV7,
  type TutorialStepIdV7,
} from "../../src/render/tutorial-v7";
import {
  idleTurn,
  playTutorialV7,
  quietRewardV7,
  tutorialState,
  unitRewardV7,
} from "./v7-tutorial-play";

/**
 * The tutorial (beads pulp_wars-0yxy and pulp_wars-2yc.115) at one of its
 * steps, for the DOM tests, the phone review and the screenshots: the
 * tutorial board with the script's commands applied by the engine up to
 * that step (v7-tutorial-play.ts), and the browser record that says the
 * tutorial is running there. The opponent's turns are an End Turn with
 * nothing done; no AI runs.
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
  return tutorialState();
}

export interface TutorialFixtureV7 {
  readonly state: GameStateV7;
  readonly progress: TutorialProgressV7;
  /** Settings storage holding `progress` under the tutorial's key. */
  readonly storage: TutorialStorageV7;
}

/**
 * The tutorial with every step before `at` done. `rewards`: the cities'
 * picks of the real reward panel (bead pulp_wars-2yc.119), by default the
 * ones that place no unit; `UNITS`, the Scouts, the Militia and the giant.
 */
export function tutorialFixtureV7(
  at: TutorialStepIdV7,
  rewards: "QUIET" | "UNITS" = "QUIET",
): TutorialFixtureV7 {
  const play = playTutorialV7({
    opponent: idleTurn,
    stopAt: at,
    reward: rewards === "UNITS" ? unitRewardV7 : quietRewardV7,
  });
  if (play.progress.step === null)
    throw new Error(`the tutorial ended before ${at}`);
  const storage = new TutorialStorageV7();
  storage.setItem(
    TUTORIAL_STORAGE_KEY_V7,
    serializeTutorialProgressV7(play.progress),
  );
  return { state: play.state, progress: play.progress, storage };
}
