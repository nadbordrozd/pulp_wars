import { NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN } from "../ai/index";

export interface AiTurnBudgetState {
  readonly playerId: number | null;
  readonly acceptedCommands: number;
}

export type AiTurnBudgetDecision =
  "POLICY" | "RESOLVE_PENDING_CHOICE" | "END_TURN" | "EXCEEDED";

export const EMPTY_AI_TURN_BUDGET: AiTurnBudgetState = {
  playerId: null,
  acceptedCommands: 0,
};

export function beginAiTurnBudget(
  state: AiTurnBudgetState,
  playerId: number,
): AiTurnBudgetState {
  return state.playerId === playerId
    ? state
    : { playerId, acceptedCommands: 0 };
}

export function decideAiTurnBudget(
  state: AiTurnBudgetState,
  hasPendingChoice: boolean,
): AiTurnBudgetDecision {
  if (state.acceptedCommands >= NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN) {
    return "EXCEEDED";
  }
  const reserveForEnd = hasPendingChoice ? 2 : 1;
  if (
    state.acceptedCommands >=
    NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN - reserveForEnd
  ) {
    return hasPendingChoice ? "RESOLVE_PENDING_CHOICE" : "END_TURN";
  }
  return "POLICY";
}

export function recordAcceptedAiCommand(
  state: AiTurnBudgetState,
  endedTurn: boolean,
): AiTurnBudgetState {
  return endedTurn
    ? EMPTY_AI_TURN_BUDGET
    : { ...state, acceptedCommands: state.acceptedCommands + 1 };
}
