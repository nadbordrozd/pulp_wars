import { canonicalHash, canonicalJson } from "../replay/canonical";
import {
  hasExactKeysV6,
  isDenseArrayV6,
  isNonNegativeSafeIntegerV6,
  parseCommandV6,
  type CommandV6,
} from "./commands";
import { parseMatchSetupV6 } from "./setup";
import { parseGameStateV6 } from "./state-schema";
import type { GameStateV6, MatchSetupV6 } from "./types";

export interface ReplayCheckpointV6 {
  readonly index: number;
  readonly stateHash: string;
}

export interface ReplayFileV6 {
  readonly format: "pulp-wars-replay";
  readonly version: 6;
  readonly setup: MatchSetupV6;
  readonly commands: readonly CommandV6[];
  readonly checkpoints: readonly ReplayCheckpointV6[];
}

export type ReplayParseResultV6 =
  | { readonly kind: "VALID"; readonly replay: ReplayFileV6 }
  | { readonly kind: "INCOMPATIBLE_REPLAY" }
  | { readonly kind: "INVALID_REPLAY" };

export function createReplayV6(setup: MatchSetupV6): ReplayFileV6 {
  const parsed = parseMatchSetupV6(setup);
  if (parsed === null) throw new RangeError("INVALID_SETUP");
  return {
    format: "pulp-wars-replay",
    version: 6,
    setup: parsed,
    commands: [],
    checkpoints: [],
  };
}

export function appendReplayCommandV6(
  replay: ReplayFileV6,
  command: CommandV6,
  state: GameStateV6,
): ReplayFileV6 {
  const parsedReplay = parseReplayFileV6(replay);
  const parsedCommand = parseCommandV6(command);
  const parsedState = parseGameStateV6(state);
  if (
    parsedReplay.kind !== "VALID" ||
    !parsedCommand.ok ||
    parsedState === null ||
    parsedState.commandIndex !== parsedReplay.replay.commands.length + 1 ||
    canonicalJson(parsedState.setup) !==
      canonicalJson(parsedReplay.replay.setup)
  ) {
    throw new RangeError("INVALID_REPLAY");
  }
  return {
    ...parsedReplay.replay,
    commands: [...parsedReplay.replay.commands, parsedCommand.value],
    checkpoints: [
      ...parsedReplay.replay.checkpoints,
      {
        index: parsedState.commandIndex,
        stateHash: canonicalHash(parsedState),
      },
    ],
  };
}

export function parseReplayFileV6(input: unknown): ReplayParseResultV6 {
  if (
    hasExactFormatAndVersion(input, "pulp-wars-replay") &&
    isLegacyVersion(input.version)
  ) {
    return { kind: "INCOMPATIBLE_REPLAY" };
  }
  if (
    !hasExactKeysV6(input, [
      "checkpoints",
      "commands",
      "format",
      "setup",
      "version",
    ]) ||
    input.format !== "pulp-wars-replay" ||
    input.version !== 6 ||
    !isDenseArrayV6(input.commands) ||
    !isDenseArrayV6(input.checkpoints)
  ) {
    return { kind: "INVALID_REPLAY" };
  }
  const setup = parseMatchSetupV6(input.setup);
  if (setup === null) return { kind: "INVALID_REPLAY" };
  const commands: CommandV6[] = [];
  for (const candidate of input.commands) {
    const parsed = parseCommandV6(candidate);
    if (!parsed.ok) return { kind: "INVALID_REPLAY" };
    commands.push(parsed.value);
  }
  const checkpoints: ReplayCheckpointV6[] = [];
  let previousIndex = -1;
  for (const candidate of input.checkpoints) {
    if (
      !hasExactKeysV6(candidate, ["index", "stateHash"]) ||
      !isNonNegativeSafeIntegerV6(candidate.index) ||
      candidate.index > commands.length ||
      candidate.index <= previousIndex ||
      typeof candidate.stateHash !== "string" ||
      !/^[0-9a-f]{64}$/.test(candidate.stateHash)
    ) {
      return { kind: "INVALID_REPLAY" };
    }
    checkpoints.push({
      index: candidate.index,
      stateHash: candidate.stateHash,
    });
    previousIndex = candidate.index;
  }
  return {
    kind: "VALID",
    replay: {
      format: "pulp-wars-replay",
      version: 6,
      setup,
      commands,
      checkpoints,
    },
  };
}

export function parseReplayJsonV6(source: string): ReplayParseResultV6 {
  try {
    return parseReplayFileV6(JSON.parse(source) as unknown);
  } catch {
    return { kind: "INVALID_REPLAY" };
  }
}

function hasExactFormatAndVersion(
  input: unknown,
  format: string,
): input is { readonly format: string; readonly version: unknown } {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>).format === format &&
    Object.prototype.hasOwnProperty.call(input, "version")
  );
}

function isLegacyVersion(input: unknown): boolean {
  return (
    input === 1 || input === 2 || input === 3 || input === 4 || input === 5
  );
}
