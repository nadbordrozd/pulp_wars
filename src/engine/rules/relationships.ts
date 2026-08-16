import type { PlayerId } from "../model/ids";
import type { AiMode } from "../model/types";

/** The v4 relationship graph is immutable and derives only from setup. */
export function arePlayersHostile(
  aiMode: AiMode,
  humanPlayerId: PlayerId,
  left: PlayerId,
  right: PlayerId,
): boolean {
  if (left === right) return false;
  return (
    aiMode === "RIVAL" || left === humanPlayerId || right === humanPlayerId
  );
}

export function arePlayersAllied(
  aiMode: AiMode,
  humanPlayerId: PlayerId,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return (
    left !== right && !arePlayersHostile(aiMode, humanPlayerId, left, right)
  );
}
