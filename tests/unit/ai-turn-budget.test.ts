import { describe, expect, it } from "vitest";
import {
  EMPTY_AI_TURN_BUDGET,
  beginAiTurnBudget,
  decideAiTurnBudget,
  recordAcceptedAiCommand,
  type AiTurnBudgetState,
} from "../../src/app/ai-turn-budget";

describe("browser AI turn budget", () => {
  it("resets cheaply across more than 128 later turns by the same player", () => {
    let state: AiTurnBudgetState = EMPTY_AI_TURN_BUDGET;
    for (let turn = 0; turn < 129; turn += 1) {
      state = beginAiTurnBudget(state, 2);
      expect(decideAiTurnBudget(state, false)).toBe("POLICY");
      state = recordAcceptedAiCommand(state, true);
      expect(state).toBe(EMPTY_AI_TURN_BUDGET);
    }
  });

  it("reserves a pending reward and the final End Turn within 128 commands", () => {
    let state = beginAiTurnBudget(EMPTY_AI_TURN_BUDGET, 3);
    for (let command = 0; command < 126; command += 1) {
      expect(decideAiTurnBudget(state, false)).toBe("POLICY");
      state = recordAcceptedAiCommand(state, false);
    }
    expect(decideAiTurnBudget(state, true)).toBe("RESOLVE_PENDING_CHOICE");
    state = recordAcceptedAiCommand(state, false);
    expect(decideAiTurnBudget(state, false)).toBe("END_TURN");
    state = recordAcceptedAiCommand(state, true);
    expect(state).toBe(EMPTY_AI_TURN_BUDGET);
  });

  it("reports an exceeded budget instead of selecting another command", () => {
    let state = beginAiTurnBudget(EMPTY_AI_TURN_BUDGET, 4);
    for (let command = 0; command < 128; command += 1) {
      state = recordAcceptedAiCommand(state, false);
    }
    expect(decideAiTurnBudget(state, false)).toBe("EXCEEDED");
    expect(decideAiTurnBudget(state, true)).toBe("EXCEEDED");
  });
});
