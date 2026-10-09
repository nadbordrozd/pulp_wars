// Helpers shared by ruleset7-browser-controller.test.ts and its
// whole-game simulations in ruleset7-browser-controller.sim.test.ts
// (`pulp_wars-bwry`).

import { type Ruleset7PolicyWork } from "../../src/app/index";
import type { NormalAiDecisionV7 } from "../../src/ai/index";
import {
  queryPlayerCommandsV7,
  type CommandV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { type StorageAdapter } from "../../src/persistence/index";

export function immediateEndTurnWork(view: PlayerViewV7): Ruleset7PolicyWork {
  return { runSlice: () => endTurnDecision(view) };
}

export function endTurnDecision(view: PlayerViewV7): NormalAiDecisionV7 {
  const command = queryPlayerCommandsV7(view).find(
    (candidate) => candidate.kind === "END_TURN",
  );
  if (command === undefined) throw new Error("END_TURN missing");
  return decisionV7(command);
}

export function decisionV7(command: CommandV7): NormalAiDecisionV7 {
  return {
    difficulty: "NORMAL",
    candidates: [
      {
        command,
        score: {
          priority: 0,
          strategicValue: 0,
          immediateValue: 0,
          futureValue: 0,
          safetyValue: 0,
          objectiveValue: 0,
          deterministicTieBreak: [0, 0, 0, 0, 0],
        },
        tuple: [0],
      },
    ],
    command,
    prngDraws: 0,
  };
}

export class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}
