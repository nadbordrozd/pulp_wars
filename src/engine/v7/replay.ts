import { canonicalHash, canonicalJson } from "../replay/canonical";
import { deepFreeze } from "../model/freeze";
import { parseCommandV7, type CommandV7 } from "./commands";
import {
  applyCommandV7,
  createPlayableGameV7,
  isAcceptedStateCertificateV7,
} from "./reducer";
import {
  hasExactKeysV7,
  isDenseArrayV7,
  isNonNegativeSafeIntegerV7,
} from "./schema";
import { parseMatchSetupV7 } from "./setup";
import { parseGameStateV7 } from "./state-schema";
import type { GameStateV7, MatchSetupV7 } from "./types";

export interface ReplayCheckpointV7 {
  readonly index: number;
  readonly stateHash: string;
}
export interface ReplayFileV7 {
  readonly format: "pulp-wars-replay";
  readonly version: 7;
  readonly setup: MatchSetupV7;
  readonly commands: readonly CommandV7[];
  readonly checkpoints: readonly ReplayCheckpointV7[];
}
export type ReplayParseResultV7 =
  | { readonly kind: "VALID"; readonly replay: ReplayFileV7 }
  | { readonly kind: "INCOMPATIBLE_REPLAY" }
  | { readonly kind: "INVALID_REPLAY" };
export type ReplayErrorCodeV7 =
  | "INCOMPATIBLE_REPLAY"
  | "INVALID_REPLAY"
  | "CREATE_REJECTED"
  | "COMMAND_REJECTED"
  | "CHECKPOINT_MISMATCH";

export class ReplayErrorV7 extends Error {
  readonly code: ReplayErrorCodeV7;
  readonly index: number | null;
  constructor(code: ReplayErrorCodeV7, index: number | null = null) {
    super(index === null ? code : `${code} at command index ${index}`);
    this.name = "ReplayErrorV7";
    this.code = code;
    this.index = index;
  }
}

export interface ReplayRunResultV7 {
  readonly acceptedCommands: number;
  readonly state: GameStateV7;
  readonly stateHash: string;
}

interface AcceptedReplayBoundaryCertificateV7 {
  readonly state: GameStateV7;
  readonly stateHash: string;
}

const internalReplayCertificatesV7 = new WeakSet<ReplayFileV7>();
const acceptedReplayBoundaryCertificatesV7 = new WeakMap<
  ReplayFileV7,
  AcceptedReplayBoundaryCertificateV7
>();

/**
 * Returns the already-computed checkpoint hash only for the exact immutable
 * state/replay pair produced by appendReplayCommandV7. Structurally equal,
 * cloned, shallow-frozen, or mismatched external values never qualify.
 */
export function cachedAcceptedReplayStateHashV7(
  replay: ReplayFileV7,
  state: GameStateV7,
): string | null {
  const certificate = acceptedReplayBoundaryCertificatesV7.get(replay);
  return certificate?.state === state ? certificate.stateHash : null;
}

export function createReplayV7(input: unknown): ReplayFileV7 {
  const setup = parseMatchSetupV7(input);
  if (setup === null) throw new RangeError("INVALID_SETUP");
  const replay = deepFreeze({
    format: "pulp-wars-replay",
    version: 7,
    setup,
    commands: [],
    checkpoints: [],
  } as const);
  internalReplayCertificatesV7.add(replay);
  return replay;
}

export function appendReplayCommandV7(
  replayInput: unknown,
  commandInput: unknown,
  stateInput: unknown,
): ReplayFileV7 {
  const certifiedReplay = internalReplayCertificatesV7.has(
    replayInput as ReplayFileV7,
  )
    ? (replayInput as ReplayFileV7)
    : null;
  const parsedReplay =
    certifiedReplay === null ? parseReplayFileV7(replayInput) : null;
  const command = parseCommandV7(commandInput);
  const state = isAcceptedStateCertificateV7(stateInput as GameStateV7)
    ? (stateInput as GameStateV7)
    : parseGameStateV7(stateInput);
  const replay =
    certifiedReplay ??
    (parsedReplay?.kind === "VALID" ? parsedReplay.replay : null);
  if (
    replay === null ||
    !command.ok ||
    state === null ||
    state.commandIndex !== replay.commands.length + 1 ||
    canonicalJson(state.setup) !== canonicalJson(replay.setup)
  )
    throw new RangeError("INVALID_REPLAY");
  const stateHash = canonicalHash(state);
  const nextReplay = deepFreeze({
    ...replay,
    commands: [...replay.commands, command.value],
    checkpoints: [
      ...replay.checkpoints,
      { index: state.commandIndex, stateHash },
    ],
  });
  internalReplayCertificatesV7.add(nextReplay);
  acceptedReplayBoundaryCertificatesV7.set(nextReplay, { state, stateHash });
  return nextReplay;
}

export function parseReplayFileV7(input: unknown): ReplayParseResultV7 {
  if (hasFormatVersion(input, "pulp-wars-replay") && isPreV7(input.version))
    return { kind: "INCOMPATIBLE_REPLAY" };
  if (
    hasFormatVersion(input, "pulp-wars-replay") &&
    input.version === 7 &&
    hasRulesetSetup(input, "pulp-wars-poc-7")
  )
    return { kind: "INCOMPATIBLE_REPLAY" };
  if (
    !hasExactKeysV7(input, [
      "checkpoints",
      "commands",
      "format",
      "setup",
      "version",
    ]) ||
    input.format !== "pulp-wars-replay" ||
    input.version !== 7 ||
    !isDenseArrayV7(input.commands) ||
    !isDenseArrayV7(input.checkpoints)
  )
    return { kind: "INVALID_REPLAY" };
  const setup = parseMatchSetupV7(input.setup);
  if (setup === null) return { kind: "INVALID_REPLAY" };
  const commands: CommandV7[] = [];
  for (const item of input.commands) {
    const parsed = parseCommandV7(item);
    if (!parsed.ok) return { kind: "INVALID_REPLAY" };
    commands.push(parsed.value);
  }
  const checkpoints: ReplayCheckpointV7[] = [];
  let prior = -1;
  for (const item of input.checkpoints) {
    if (
      !hasExactKeysV7(item, ["index", "stateHash"]) ||
      !isNonNegativeSafeIntegerV7(item.index) ||
      item.index > commands.length ||
      item.index <= prior ||
      typeof item.stateHash !== "string" ||
      !/^[0-9a-f]{64}$/.test(item.stateHash)
    )
      return { kind: "INVALID_REPLAY" };
    checkpoints.push({ index: item.index, stateHash: item.stateHash });
    prior = item.index;
  }
  return {
    kind: "VALID",
    replay: {
      format: "pulp-wars-replay",
      version: 7,
      setup,
      commands,
      checkpoints,
    },
  };
}

export function parseReplayJsonV7(source: string): ReplayParseResultV7 {
  try {
    return parseReplayFileV7(JSON.parse(source) as unknown);
  } catch {
    return { kind: "INVALID_REPLAY" };
  }
}

export function runReplayV7(input: unknown): ReplayRunResultV7 {
  const parsed = parseReplayFileV7(input);
  if (parsed.kind === "INCOMPATIBLE_REPLAY")
    throw new ReplayErrorV7("INCOMPATIBLE_REPLAY");
  if (parsed.kind !== "VALID") throw new ReplayErrorV7("INVALID_REPLAY");
  // Replay begins at the canonical playable boundary: raw setup gives every
  // seat five Coins, then exactly one command-index-zero Start Turn awards the
  // first active seat's income. Hydration never runs that boundary again.
  const created = createPlayableGameV7(parsed.replay.setup);
  if (!created.ok) throw new ReplayErrorV7("CREATE_REJECTED");
  let state = created.state;
  let hash = canonicalHash(state);
  const checkpoint = parsed.replay.checkpoints.find((item) => item.index === 0);
  if (checkpoint !== undefined && checkpoint.stateHash !== hash)
    throw new ReplayErrorV7("CHECKPOINT_MISMATCH", 0);
  for (let index = 0; index < parsed.replay.commands.length; index += 1) {
    const command = parsed.replay.commands[index];
    if (command === undefined) throw new ReplayErrorV7("INVALID_REPLAY");
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined)
      throw new ReplayErrorV7("COMMAND_REJECTED", index + 1);
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted)
      throw new ReplayErrorV7("COMMAND_REJECTED", index + 1);
    state = result.state;
    hash = canonicalHash(state);
    const expected = parsed.replay.checkpoints.find(
      (item) => item.index === index + 1,
    );
    if (expected !== undefined && expected.stateHash !== hash)
      throw new ReplayErrorV7("CHECKPOINT_MISMATCH", index + 1);
  }
  return {
    acceptedCommands: parsed.replay.commands.length,
    state,
    stateHash: hash,
  };
}

function hasFormatVersion(
  input: unknown,
  format: string,
): input is { format: string; version: unknown } {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>).format === format &&
    Object.hasOwn(input, "version")
  );
}
function hasRulesetSetup(
  input: { format: string; version: unknown },
  rulesetId: string,
): boolean {
  const setup = (input as Record<string, unknown>).setup;
  return (
    typeof setup === "object" &&
    setup !== null &&
    !Array.isArray(setup) &&
    (setup as Record<string, unknown>).rulesetId === rulesetId
  );
}
function isPreV7(input: unknown): boolean {
  return (
    input === 1 ||
    input === 2 ||
    input === 3 ||
    input === 4 ||
    input === 5 ||
    input === 6
  );
}
