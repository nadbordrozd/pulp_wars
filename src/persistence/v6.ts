import {
  RULESET_6_ID,
  canonicalHash,
  canonicalJson,
  parseCommandV6,
  parseGameStateV6,
  parseMatchSetupV6,
  parseReplayFileV6,
  type CommandV6,
  type GameStateV6,
  type MatchSetupV6,
  type RandomStateV6,
  type ReplayFileV6,
} from "../engine/index";

export interface SaveEnvelopeV6 {
  readonly format: "pulp-wars-save";
  readonly version: 6;
  readonly rulesetId: typeof RULESET_6_ID;
  readonly setup: MatchSetupV6;
  readonly state: GameStateV6;
  readonly randomState: RandomStateV6;
  readonly acceptedCommands: readonly CommandV6[];
  readonly commandIndex: number;
  readonly stateHash: string;
  readonly savedAt: string;
}

export const MAX_SAVE_BYTES_V6 = 1_572_864;

export interface SaveInputV6 {
  readonly state: GameStateV6;
  readonly replay: ReplayFileV6;
}

export type SaveLoadResultV6 =
  | { readonly kind: "VALID"; readonly save: SaveEnvelopeV6 }
  | { readonly kind: "CORRUPT" | "INCOMPATIBLE"; readonly diagnostic: string };

export function createSaveEnvelopeV6(
  input: SaveInputV6,
  savedAt: string,
): SaveEnvelopeV6 {
  const state = parseGameStateV6(input.state);
  const replay = parseReplayFileV6(input.replay);
  if (
    state === null ||
    replay.kind !== "VALID" ||
    replay.replay.commands.length !== state.commandIndex ||
    canonicalJson(replay.replay.setup) !== canonicalJson(state.setup) ||
    !isIsoTimestampV6(savedAt)
  ) {
    throw new RangeError("Invalid ruleset-6 save input");
  }
  return {
    format: "pulp-wars-save",
    version: 6,
    rulesetId: RULESET_6_ID,
    setup: state.setup,
    state,
    randomState: state.random,
    acceptedCommands: [...replay.replay.commands],
    commandIndex: state.commandIndex,
    stateHash: canonicalHash(state),
    savedAt,
  };
}

/**
 * Pure, atomic v6 loader. Calling it never rewrites or removes source bytes;
 * recognized v1-v5 envelopes are classified before any v6 schema parsing.
 */
export function parseSaveV6(source: string): SaveLoadResultV6 {
  if (new TextEncoder().encode(source).byteLength > MAX_SAVE_BYTES_V6) {
    return corrupt("Saved match exceeds the size limit.");
  }
  let input: unknown;
  try {
    input = JSON.parse(source) as unknown;
  } catch {
    return corrupt("Saved match is not valid JSON.");
  }
  if (!isRecord(input)) return corrupt("Saved match envelope is invalid.");
  if (input.format === "pulp-wars-save" && isLegacyVersion(input.version)) {
    return {
      kind: "INCOMPATIBLE",
      diagnostic: `This ruleset-${String(input.version)} saved match is incompatible with ruleset 6 and was preserved unchanged.`,
    };
  }
  if (input.format !== "pulp-wars-save" || input.version !== 6) {
    return {
      kind: "INCOMPATIBLE",
      diagnostic: "This saved match uses an unsupported format or version.",
    };
  }
  if (
    !hasExactKeys(input, [
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
    input.rulesetId !== RULESET_6_ID
  ) {
    return input.rulesetId === RULESET_6_ID
      ? corrupt("Saved match fields are invalid.")
      : {
          kind: "INCOMPATIBLE",
          diagnostic: "Saved match rules are incompatible.",
        };
  }
  const setup = parseMatchSetupV6(input.setup);
  const parsedState = parsePersistedStateV6(input.state);
  const state = parsedState?.state ?? null;
  const commands = parseCommandsV6(input.acceptedCommands);
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
    !isIsoTimestampV6(input.savedAt) ||
    canonicalJson(setup) !== canonicalJson(state.setup) ||
    safeCanonicalJson(input.randomState) !== canonicalJson(state.random) ||
    parsedState === null ||
    parsedState.sourceHash !== input.stateHash
  ) {
    return corrupt(
      "Saved match schema or deterministic integrity validation failed.",
    );
  }
  return {
    kind: "VALID",
    save: {
      format: "pulp-wars-save",
      version: 6,
      rulesetId: RULESET_6_ID,
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

/**
 * Compatibility boundary for saves written before treasure state existed.
 * The source hash is checked against the untouched old payload, then the
 * in-memory state is normalized with an empty public chest collection.
 */
function parsePersistedStateV6(
  input: unknown,
): { readonly state: GameStateV6; readonly sourceHash: string } | null {
  const current = parseGameStateV6(input);
  if (current !== null)
    return { state: current, sourceHash: canonicalHash(current) };
  if (!isRecord(input) || Object.hasOwn(input, "treasureChests")) return null;
  const migrated = parseGameStateV6({ ...input, treasureChests: [] });
  if (migrated === null) return null;
  let sourceHash: string;
  try {
    sourceHash = canonicalHash(input);
  } catch {
    return null;
  }
  return { state: migrated, sourceHash };
}

function parseCommandsV6(input: unknown): readonly CommandV6[] | null {
  if (
    !Array.isArray(input) ||
    Reflect.ownKeys(input).length !== input.length + 1
  )
    return null;
  const commands: CommandV6[] = [];
  for (const candidate of input) {
    const command = parseCommandV6(candidate);
    if (!command.ok) return null;
    commands.push(command.value);
  }
  return commands;
}

function corrupt(diagnostic: string): SaveLoadResultV6 {
  return { kind: "CORRUPT", diagnostic };
}

function hasExactKeys(
  input: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(input).sort();
  const required = [...expected].sort();
  return (
    actual.length === required.length &&
    actual.every((key, index) => key === required[index])
  );
}

function safeCanonicalJson(input: unknown): string | null {
  try {
    return canonicalJson(input);
  } catch {
    return null;
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isLegacyVersion(input: unknown): boolean {
  return (
    input === 1 || input === 2 || input === 3 || input === 4 || input === 5
  );
}

function isIsoTimestampV6(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}
