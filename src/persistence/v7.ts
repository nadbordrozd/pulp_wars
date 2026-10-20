import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  cachedAcceptedReplayStateHashV7,
  canonicalHash,
  canonicalJson,
  hasExactKeysV7,
  isDenseArrayV7,
  missionByIdV7,
  parseCommandV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  runReplayV7,
  validateMatchSetupV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
  type RandomStateV7,
  type ReplayFileV7,
} from "../engine/index";

export { SAVE_STORAGE_KEY_V7 };
export const MAX_SAVE_BYTES_V7 = 1_572_864;
/**
 * The diagnostic of a mission save whose `(id, revision)` is no longer
 * registered (docs/product/CAMPAIGN.md section 2.4); the save-recovery
 * screen shows it with the usual Delete action.
 */
export const STALE_MISSION_DIAGNOSTIC_V7 =
  "This mission was updated since the game was saved. Start it again from the campaign.";
/**
 * The diagnostic of a mission save whose mission is no longer in the game
 * at any revision (the retired prologue's `FRONTIER_*`, `pulp_wars-hmyk.22`).
 */
export const REMOVED_MISSION_DIAGNOSTIC_V7 =
  "This mission is no longer in the game. Delete the save and pick a campaign.";

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
  const stateInput = input.state;
  const replayInput = input.replay;
  const cachedStateHash = cachedAcceptedReplayStateHashV7(
    replayInput,
    stateInput,
  );
  const state =
    cachedStateHash === null ? parseGameStateV7(stateInput) : stateInput;
  const parsedReplay =
    cachedStateHash === null ? parseReplayFileV7(replayInput) : null;
  const replay =
    cachedStateHash === null
      ? parsedReplay?.kind === "VALID"
        ? parsedReplay.replay
        : null
      : replayInput;
  if (
    state === null ||
    replay === null ||
    replay.commands.length !== state.commandIndex ||
    canonicalJson(replay.setup) !== canonicalJson(state.setup) ||
    !iso(savedAt)
  )
    throw new RangeError("Invalid ruleset-7 save input");
  return {
    format: "pulp-wars-save",
    version: 7,
    rulesetId: RULESET_7_ID,
    setup: state.setup,
    state,
    randomState: state.random,
    acceptedCommands: [...replay.commands],
    commandIndex: state.commandIndex,
    stateHash: cachedStateHash ?? canonicalHash(state),
    savedAt,
  };
}

/**
 * How `parseSaveV7` treats the command log (bead `pulp_wars-2yc.95`):
 *
 * - `VERIFY` (the default; every tool, test and headless reader): the log is
 *   replayed from the setup and must rebuild exactly the stored state.
 * - `DEFER` (the browser's resume): the log is parsed but not replayed. The
 *   stored state still passes the full state schema and its invariants, the
 *   hash, the setup and PRNG checks; the caller checks the history
 *   afterwards with `verifySaveReplayV7`, off the main thread. Replaying a
 *   long game took 1 to 25 s on a desktop (more on a phone), all of it
 *   before the first frame.
 */
export type SaveReplayCheckV7 = "VERIFY" | "DEFER";

export interface ParseSaveOptionsV7 {
  readonly replay?: SaveReplayCheckV7;
}

export type SaveReplayVerificationV7 =
  { readonly ok: true } | { readonly ok: false; readonly diagnostic: string };

/** Pure v7 loader. It never mutates, normalizes, or migrates source bytes. */
export function parseSaveV7(
  source: string,
  options: ParseSaveOptionsV7 = {},
): SaveLoadResultV7 {
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
  // docs/product/CAMPAIGN.md section 2.4: a mission save whose mission was
  // revised (or removed) since it was saved is incompatible, not corrupt.
  const setupCheck = validateMatchSetupV7(input.setup);
  if (!setupCheck.ok && setupCheck.error.code === "UNKNOWN_MISSION")
    return {
      kind: "INCOMPATIBLE",
      diagnostic:
        missionByIdV7(setupCheck.error.params.id) === null
          ? REMOVED_MISSION_DIAGNOSTIC_V7
          : STALE_MISSION_DIAGNOSTIC_V7,
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
  const replay = {
    format: "pulp-wars-replay",
    version: 7,
    setup,
    commands,
    checkpoints: [{ index: commands.length, stateHash: input.stateHash }],
  } as const;
  const parsedReplay = parseReplayFileV7(replay);
  if (parsedReplay.kind !== "VALID")
    return corrupt("Saved command log is invalid.");
  const save: SaveEnvelopeV7 = {
    format: "pulp-wars-save",
    version: 7,
    rulesetId: RULESET_7_ID,
    setup,
    state,
    randomState: state.random,
    acceptedCommands: commands,
    commandIndex: input.commandIndex as number,
    // Equal to canonicalHash(state): checked above.
    stateHash: input.stateHash,
    savedAt: input.savedAt,
  };
  if ((options.replay ?? "VERIFY") === "VERIFY") {
    const verified = verifySaveReplayV7(save);
    if (!verified.ok) return corrupt(verified.diagnostic);
  }
  return { kind: "VALID", save };
}

/**
 * Replays a parsed save's command log from its setup and checks that it
 * rebuilds exactly the stored state (the log's last checkpoint is the
 * stored state hash). `parseSaveV7` runs it unless told to `DEFER`; the
 * browser runs it in a worker after a resume (`src/app/save-history-v7.ts`).
 */
export function verifySaveReplayV7(
  save: SaveEnvelopeV7,
): SaveReplayVerificationV7 {
  let reconstructed: ReturnType<typeof runReplayV7>;
  try {
    reconstructed = runReplayV7({
      format: "pulp-wars-replay",
      version: 7,
      setup: save.setup,
      commands: save.acceptedCommands,
      checkpoints: [{ index: save.commandIndex, stateHash: save.stateHash }],
    });
  } catch {
    return { ok: false, diagnostic: "Saved command replay validation failed." };
  }
  if (canonicalJson(reconstructed.state) !== canonicalJson(save.state))
    return {
      ok: false,
      diagnostic: "Saved state does not match replay reconstruction.",
    };
  return { ok: true };
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
