import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  canonicalHash,
  canonicalJson,
  hasExactKeysV7,
  isDenseArrayV7,
  parseCommandV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  runReplayV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
  type RandomStateV7,
  type ReplayFileV7,
} from "../engine/index";

export { SAVE_STORAGE_KEY_V7 };
export const MAX_SAVE_BYTES_V7 = 1_572_864;

export interface SaveEnvelopeV7 {
  readonly format: "pulp-wars-save";
  readonly version: 7;
  readonly rulesetId: typeof RULESET_7_ID;
  readonly setup: MatchSetupV7;
  readonly state: GameStateV7;
  readonly randomState: RandomStateV7;
  readonly acceptedCommands: readonly CommandV7[];
  readonly commandIndex: number;
  readonly stateHash: string;
  readonly savedAt: string;
}
export interface SaveInputV7 {
  readonly state: GameStateV7;
  readonly replay: ReplayFileV7;
}
export type SaveLoadResultV7 =
  | { readonly kind: "VALID"; readonly save: SaveEnvelopeV7 }
  | { readonly kind: "CORRUPT" | "INCOMPATIBLE"; readonly diagnostic: string };

export function createSaveEnvelopeV7(
  input: SaveInputV7,
  savedAt: string,
): SaveEnvelopeV7 {
  const state = parseGameStateV7(input.state);
  const replay = parseReplayFileV7(input.replay);
  if (
    state === null ||
    replay.kind !== "VALID" ||
    replay.replay.commands.length !== state.commandIndex ||
    canonicalJson(replay.replay.setup) !== canonicalJson(state.setup) ||
    !iso(savedAt)
  )
    throw new RangeError("Invalid ruleset-7 save input");
  if (state.commandIndex !== 0)
    throw new RangeError("COMMAND_REPLAY_NOT_IMPLEMENTED");
  return {
    format: "pulp-wars-save",
    version: 7,
    rulesetId: RULESET_7_ID,
    setup: state.setup,
    state,
    randomState: state.random,
    acceptedCommands: [...replay.replay.commands],
    commandIndex: state.commandIndex,
    stateHash: canonicalHash(state),
    savedAt,
  };
}

/** Pure v7 loader. It never mutates, normalizes, or migrates source bytes. */
export function parseSaveV7(source: string): SaveLoadResultV7 {
  if (new TextEncoder().encode(source).byteLength > MAX_SAVE_BYTES_V7)
    return corrupt("Saved match exceeds the size limit.");
  let input: unknown;
  try {
    input = JSON.parse(source) as unknown;
  } catch {
    return corrupt("Saved match is not valid JSON.");
  }
  if (!record(input)) return corrupt("Saved match envelope is invalid.");
  if (input.format === "pulp-wars-save" && isPreV7(input.version))
    return {
      kind: "INCOMPATIBLE",
      diagnostic: `This ruleset-${String(input.version)} saved match is incompatible with ruleset 7 and was preserved unchanged.`,
    };
  if (input.format !== "pulp-wars-save" || input.version !== 7)
    return {
      kind: "INCOMPATIBLE",
      diagnostic: "This saved match uses an unsupported format or version.",
    };
  if (
    !hasExactKeysV7(input, [
      "acceptedCommands",
      "commandIndex",
      "format",
      "randomState",
      "rulesetId",
      "savedAt",
      "setup",
      "state",
      "stateHash",
      "version",
    ]) ||
    input.rulesetId !== RULESET_7_ID
  )
    return input.rulesetId === RULESET_7_ID
      ? corrupt("Saved match fields are invalid.")
      : {
          kind: "INCOMPATIBLE",
          diagnostic: "Saved match rules are incompatible.",
        };
  const setup = parseMatchSetupV7(input.setup);
  const state = parseGameStateV7(input.state);
  const commands = parseCommands(input.acceptedCommands);
  if (
    setup === null ||
    state === null ||
    commands === null ||
    !Number.isSafeInteger(input.commandIndex) ||
    (input.commandIndex as number) < 0 ||
    input.commandIndex !== commands.length ||
    input.commandIndex !== state.commandIndex ||
    typeof input.stateHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(input.stateHash) ||
    typeof input.savedAt !== "string" ||
    !iso(input.savedAt) ||
    canonicalJson(setup) !== canonicalJson(state.setup) ||
    safeCanonical(input.randomState) !== canonicalJson(state.random) ||
    input.stateHash !== canonicalHash(state)
  )
    return corrupt(
      "Saved match schema or deterministic integrity validation failed.",
    );
  if (commands.length !== 0)
    return corrupt(
      "Ruleset-7 command replay is not implemented by this foundation build.",
    );
  const replay = {
    format: "pulp-wars-replay",
    version: 7,
    setup,
    commands,
    checkpoints: [{ index: 0, stateHash: input.stateHash }],
  } as const;
  const parsedReplay = parseReplayFileV7(replay);
  if (parsedReplay.kind !== "VALID")
    return corrupt("Saved command log is invalid.");
  let reconstructed: ReturnType<typeof runReplayV7>;
  try {
    reconstructed = runReplayV7(parsedReplay.replay);
  } catch {
    return corrupt("Saved command replay validation failed.");
  }
  if (canonicalJson(reconstructed.state) !== canonicalJson(state))
    return corrupt("Saved state does not match replay reconstruction.");
  return {
    kind: "VALID",
    save: {
      format: "pulp-wars-save",
      version: 7,
      rulesetId: RULESET_7_ID,
      setup,
      state,
      randomState: state.random,
      acceptedCommands: commands,
      commandIndex: input.commandIndex as number,
      stateHash: canonicalHash(state),
      savedAt: input.savedAt,
    },
  };
}

function parseCommands(input: unknown): readonly CommandV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const commands: CommandV7[] = [];
  for (const item of input) {
    const parsed = parseCommandV7(item);
    if (!parsed.ok) return null;
    commands.push(parsed.value);
  }
  return commands;
}
function record(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function safeCanonical(input: unknown): string | null {
  try {
    return canonicalJson(input);
  } catch {
    return null;
  }
}
function iso(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
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
function corrupt(diagnostic: string): SaveLoadResultV7 {
  return { kind: "CORRUPT", diagnostic };
}
