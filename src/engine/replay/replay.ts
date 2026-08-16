import { parseCommand } from "../commands/schema";
import type { Command } from "../commands/types";
import type { DomainEvent } from "../events/types";
import type { GameState, MatchOutcome, MatchSetup } from "../model/types";
import { parseMatchSetup } from "../model/setup";
import { applyCommand, createGame } from "../simulation";
import { canonicalHash } from "./canonical";
import type { ReplayCheckpoint, ReplayFile } from "./types";

export type ReplayErrorCode =
  | "INCOMPATIBLE_REPLAY"
  | "INVALID_REPLAY"
  | "CREATE_REJECTED"
  | "COMMAND_REJECTED"
  | "CHECKPOINT_MISMATCH"
  | "COMMAND_AFTER_MATCH_END";

export class ReplayError extends Error {
  readonly code: ReplayErrorCode;
  readonly index: number | null;

  constructor(code: ReplayErrorCode, index: number | null = null) {
    super(index === null ? code : `${code} at command index ${index}`);
    this.name = "ReplayError";
    this.code = code;
    this.index = index;
  }
}

export interface ReplayRunResult {
  readonly outcome: MatchOutcome | null;
  readonly acceptedCommands: number;
  readonly state: GameState;
  readonly stateHash: string;
  readonly events: readonly DomainEvent[];
}

export function createReplay(setup: MatchSetup): ReplayFile {
  return {
    format: "pulp-wars-replay",
    version: 4,
    setup: { ...setup },
    commands: [],
    checkpoints: [],
  };
}

export function appendReplayCommand(
  replay: ReplayFile,
  command: Command,
  state: GameState,
): ReplayFile {
  if (state.commandIndex !== replay.commands.length + 1) {
    throw new ReplayError("INVALID_REPLAY", state.commandIndex);
  }
  return {
    ...replay,
    commands: [...replay.commands, command],
    checkpoints: [
      ...replay.checkpoints,
      { index: state.commandIndex, stateHash: canonicalHash(state) },
    ],
  };
}

export function runReplay(
  replay: ReplayFile,
  options: { readonly stopAfter?: number } = {},
): ReplayRunResult {
  const setup = validateReplay(replay);
  const stopAfter = options.stopAfter ?? replay.commands.length;
  if (!Number.isSafeInteger(stopAfter) || stopAfter < 0) {
    throw new ReplayError("INVALID_REPLAY");
  }

  const created = createGame(setup);
  if (!created.ok) {
    throw new ReplayError("CREATE_REJECTED");
  }
  let state = created.state;
  const events: DomainEvent[] = [...created.events];
  verifyCheckpoint(replay.checkpoints, 0, state);

  const commandLimit = Math.min(stopAfter, replay.commands.length);
  for (
    let commandOffset = 0;
    commandOffset < commandLimit;
    commandOffset += 1
  ) {
    if (state.outcome !== null) {
      throw new ReplayError("COMMAND_AFTER_MATCH_END", state.commandIndex + 1);
    }
    const command = replay.commands[commandOffset];
    if (command === undefined) {
      throw new ReplayError("INVALID_REPLAY", state.commandIndex + 1);
    }
    const applied = applyCommand(state, command);
    if (!applied.ok) {
      throw new ReplayError("COMMAND_REJECTED", state.commandIndex + 1);
    }
    state = applied.state;
    events.push(...applied.events);
    verifyCheckpoint(replay.checkpoints, state.commandIndex, state);
  }

  return {
    outcome: state.outcome,
    acceptedCommands: state.commandIndex,
    state,
    stateHash: canonicalHash(state),
    events,
  };
}

function validateReplay(replay: ReplayFile): MatchSetup {
  if (
    replay.format === "pulp-wars-replay" &&
    ((replay as { readonly version?: unknown }).version === 1 ||
      (replay as { readonly version?: unknown }).version === 2 ||
      (replay as { readonly version?: unknown }).version === 3)
  ) {
    throw new ReplayError("INCOMPATIBLE_REPLAY");
  }
  if (
    replay.format !== "pulp-wars-replay" ||
    replay.version !== 4 ||
    !Array.isArray(replay.commands) ||
    !Array.isArray(replay.checkpoints)
  ) {
    throw new ReplayError("INVALID_REPLAY");
  }
  const setup = parseMatchSetup(replay.setup);
  if (setup === null) throw new ReplayError("INVALID_REPLAY");
  for (const command of replay.commands) {
    if (!parseCommand(command).ok) {
      throw new ReplayError("INVALID_REPLAY");
    }
  }
  let previousIndex = -1;
  for (const checkpoint of replay.checkpoints) {
    if (
      !Number.isSafeInteger(checkpoint.index) ||
      checkpoint.index < 0 ||
      checkpoint.index > replay.commands.length ||
      checkpoint.index <= previousIndex ||
      !/^[0-9a-f]{64}$/.test(checkpoint.stateHash)
    ) {
      throw new ReplayError("INVALID_REPLAY");
    }
    previousIndex = checkpoint.index;
  }
  return setup;
}

function verifyCheckpoint(
  checkpoints: readonly ReplayCheckpoint[],
  index: number,
  state: GameState,
): void {
  const checkpoint = checkpoints.find((candidate) => candidate.index === index);
  if (
    checkpoint !== undefined &&
    checkpoint.stateHash !== canonicalHash(state)
  ) {
    throw new ReplayError("CHECKPOINT_MISMATCH", index);
  }
}
