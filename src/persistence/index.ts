import type {
  Command,
  GameState,
  MatchSetup,
  ReplayFile,
} from "../engine/index";
import {
  RULESET_ID,
  canonicalHash,
  canonicalJson,
  parseMatchSetup,
  parseCommand,
  runReplay,
} from "../engine/index";
import type {
  MatchTallies,
  PlayerMatchTallies,
  UiSettings,
} from "../app/types";

export * from "./v6";

export const SAVE_STORAGE_KEY = "pulpWars.save.current";
export const SETTINGS_STORAGE_KEY = "pulpWars.settings.v1";
export const MAX_SAVE_BYTES = 1_572_864;
export const MAX_SETTINGS_BYTES = 16_384;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveEnvelopeV5 {
  readonly format: "pulp-wars-save";
  readonly version: 5;
  readonly rulesetId: typeof RULESET_ID;
  readonly setup: MatchSetup;
  readonly state: GameState;
  readonly randomState: GameState["random"];
  readonly acceptedCommands: readonly Command[];
  readonly commandIndex: number;
  readonly stateHash: string;
  readonly savedAt: string;
  readonly presentation: {
    readonly tallies: MatchTallies;
    readonly playerTallies: readonly PlayerMatchTallies[];
  };
}

export interface SettingsEnvelopeV1 {
  readonly format: "pulp-wars-settings";
  readonly version: 1;
  readonly settings: UiSettings;
}

export type SaveLoadResult =
  | { readonly kind: "NONE" }
  | { readonly kind: "VALID"; readonly save: SaveEnvelopeV5 }
  | {
      readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

export type SettingsLoadResult =
  | { readonly kind: "NONE" }
  | { readonly kind: "VALID"; readonly settings: UiSettings }
  | {
      readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

export interface SaveInput {
  readonly state: GameState;
  readonly replay: ReplayFile;
  readonly tallies: MatchTallies;
  readonly playerTallies: readonly PlayerMatchTallies[];
}

export type PersistenceWriteResult =
  { readonly ok: true } | { readonly ok: false; readonly diagnostic: string };

export type PersistenceScheduler = (task: () => void) => () => void;

const defaultScheduler: PersistenceScheduler = (task) => {
  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
};

/**
 * Single-key local persistence with a coalescing save queue. Building and
 * validating envelopes remains pure; only this adapter touches Storage/time.
 */
export class BrowserPersistence {
  readonly #storage: StorageAdapter;
  readonly #now: () => string;
  readonly #schedule: PersistenceScheduler;
  readonly #onAsyncFailure: (diagnostic: string) => void;
  #pendingSave: SaveEnvelopeV5 | null = null;
  #cancelScheduled: (() => void) | null = null;

  constructor(
    storage: StorageAdapter,
    options: {
      readonly now?: () => string;
      readonly schedule?: PersistenceScheduler;
      readonly onAsyncFailure?: (diagnostic: string) => void;
    } = {},
  ) {
    this.#storage = storage;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#schedule = options.schedule ?? defaultScheduler;
    this.#onAsyncFailure = options.onAsyncFailure ?? (() => undefined);
  }

  loadSave(): SaveLoadResult {
    let source: string | null;
    try {
      source = this.#storage.getItem(SAVE_STORAGE_KEY);
    } catch (error) {
      return {
        kind: "STORAGE_ERROR",
        diagnostic: diagnostic("Unable to read the saved match", error),
      };
    }
    if (source === null) return { kind: "NONE" };
    return parseSave(source);
  }

  loadSettings(): SettingsLoadResult {
    let source: string | null;
    try {
      source = this.#storage.getItem(SETTINGS_STORAGE_KEY);
    } catch (error) {
      return {
        kind: "STORAGE_ERROR",
        diagnostic: diagnostic("Unable to read settings", error),
      };
    }
    if (source === null) return { kind: "NONE" };
    return parseSettings(source);
  }

  queueSave(input: SaveInput): string {
    this.#pendingSave = createSaveEnvelope(input, this.#now());
    if (this.#cancelScheduled === null) {
      this.#cancelScheduled = this.#schedule(() => {
        this.#cancelScheduled = null;
        const result = this.flushSave();
        if (!result.ok) this.#onAsyncFailure(result.diagnostic);
      });
    }
    return this.#pendingSave.savedAt;
  }

  flushSave(): PersistenceWriteResult {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    const pending = this.#pendingSave;
    if (pending === null) return { ok: true };
    let serialized: string;
    try {
      serialized = JSON.stringify(pending);
      if (byteLength(serialized) > MAX_SAVE_BYTES) {
        return {
          ok: false,
          diagnostic: `Autosave exceeds the ${MAX_SAVE_BYTES}-byte POC limit.`,
        };
      }
      this.#storage.setItem(SAVE_STORAGE_KEY, serialized);
      this.#pendingSave = null;
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: diagnostic("Unable to write the saved match", error),
      };
    }
  }

  writeSettings(settings: UiSettings): PersistenceWriteResult {
    const envelope: SettingsEnvelopeV1 = {
      format: "pulp-wars-settings",
      version: 1,
      settings,
    };
    try {
      const serialized = JSON.stringify(envelope);
      if (byteLength(serialized) > MAX_SETTINGS_BYTES) {
        return {
          ok: false,
          diagnostic: `Settings exceed the ${MAX_SETTINGS_BYTES}-byte POC limit.`,
        };
      }
      this.#storage.setItem(SETTINGS_STORAGE_KEY, serialized);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: diagnostic("Unable to write settings", error),
      };
    }
  }

  deleteSave(): PersistenceWriteResult {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    this.#pendingSave = null;
    try {
      this.#storage.removeItem(SAVE_STORAGE_KEY);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: diagnostic("Unable to delete the saved match", error),
      };
    }
  }

  destroy(): void {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    this.#pendingSave = null;
  }
}

export function createSaveEnvelope(
  input: SaveInput,
  savedAt: string,
): SaveEnvelopeV5 {
  if (input.replay.commands.length !== input.state.commandIndex) {
    throw new Error(
      "Replay command log does not match the authoritative index",
    );
  }
  return {
    format: "pulp-wars-save",
    version: 5,
    rulesetId: RULESET_ID,
    setup: input.state.setup,
    state: input.state,
    randomState: input.state.random,
    acceptedCommands: input.replay.commands,
    commandIndex: input.state.commandIndex,
    stateHash: canonicalHash(input.state),
    savedAt,
    presentation: {
      tallies: input.tallies,
      playerTallies: input.playerTallies,
    },
  };
}

export function parseSave(source: string): SaveLoadResult {
  if (byteLength(source) > MAX_SAVE_BYTES) {
    return {
      kind: "CORRUPT",
      diagnostic: "Saved match exceeds the size limit.",
    };
  }
  let input: unknown;
  try {
    input = JSON.parse(source) as unknown;
  } catch {
    return { kind: "CORRUPT", diagnostic: "Saved match is not valid JSON." };
  }
  if (!isRecord(input)) {
    return { kind: "CORRUPT", diagnostic: "Saved match envelope is invalid." };
  }
  if (
    input.format === "pulp-wars-save" &&
    (input.version === 1 ||
      input.version === 2 ||
      input.version === 3 ||
      input.version === 4)
  ) {
    return {
      kind: "INCOMPATIBLE",
      diagnostic: `This ruleset-${input.version} saved match is incompatible with ruleset 5 and was preserved unchanged.`,
    };
  }
  if (input.format !== "pulp-wars-save" || input.version !== 5) {
    return {
      kind: "INCOMPATIBLE",
      diagnostic: "This saved match uses an unsupported format or version.",
    };
  }
  if (
    !hasExactKeys(input, [
      "format",
      "version",
      "rulesetId",
      "setup",
      "state",
      "randomState",
      "acceptedCommands",
      "commandIndex",
      "stateHash",
      "savedAt",
      "presentation",
    ]) ||
    input.rulesetId !== RULESET_ID
  ) {
    return {
      kind: input.rulesetId === RULESET_ID ? "CORRUPT" : "INCOMPATIBLE",
      diagnostic: "Saved match rules or fields are incompatible.",
    };
  }
  const setup = parseMatchSetup(input.setup);
  const commands = parseCommands(input.acceptedCommands);
  const presentation = parsePresentation(input.presentation);
  if (
    setup === null ||
    commands === null ||
    presentation === null ||
    typeof input.commandIndex !== "number" ||
    !Number.isSafeInteger(input.commandIndex) ||
    input.commandIndex < 0 ||
    input.commandIndex !== commands.length ||
    typeof input.stateHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(input.stateHash) ||
    typeof input.savedAt !== "string" ||
    !isIsoTimestamp(input.savedAt) ||
    !isRecord(input.state) ||
    !isRecord(input.randomState)
  ) {
    return {
      kind: "CORRUPT",
      diagnostic: "Saved match schema validation failed.",
    };
  }
  const replay: ReplayFile = {
    format: "pulp-wars-replay",
    version: 5,
    setup,
    commands,
    checkpoints: [],
  };
  try {
    const reconstructed = runReplay(replay);
    const storedCanonical = canonicalJson(input.state);
    const reconstructedCanonical = canonicalJson(reconstructed.state);
    const playerIds = reconstructed.state.players
      .map((player) => player.id)
      .sort((left, right) => left - right);
    const tallyIds = presentation.playerTallies
      .map((tally) => tally.playerId)
      .sort((left, right) => left - right);
    const humanId = reconstructed.state.players.find(
      (player) => player.controller === "HUMAN",
    )?.id;
    const humanTally = presentation.playerTallies.find(
      (tally) => tally.playerId === humanId,
    );
    if (
      reconstructed.acceptedCommands !== input.commandIndex ||
      reconstructed.stateHash !== input.stateHash ||
      canonicalHash(input.state) !== input.stateHash ||
      storedCanonical !== reconstructedCanonical ||
      canonicalJson(input.randomState) !==
        canonicalJson(reconstructed.state.random) ||
      canonicalJson(tallyIds) !== canonicalJson(playerIds) ||
      humanTally === undefined ||
      presentation.tallies.citiesCaptured !== humanTally.citiesCaptured ||
      presentation.tallies.unitsDefeated !== humanTally.kills ||
      presentation.tallies.unitsLost !== humanTally.losses
    ) {
      return {
        kind: "CORRUPT",
        diagnostic: "Saved match failed its deterministic integrity check.",
      };
    }
    return {
      kind: "VALID",
      save: {
        format: "pulp-wars-save",
        version: 5,
        rulesetId: RULESET_ID,
        setup,
        state: reconstructed.state,
        randomState: reconstructed.state.random,
        acceptedCommands: commands,
        commandIndex: input.commandIndex,
        stateHash: input.stateHash,
        savedAt: input.savedAt,
        presentation,
      },
    };
  } catch (error) {
    return {
      kind: "CORRUPT",
      diagnostic: diagnostic("Saved match replay validation failed", error),
    };
  }
}

export function parseSettings(source: string): SettingsLoadResult {
  if (byteLength(source) > MAX_SETTINGS_BYTES) {
    return { kind: "CORRUPT", diagnostic: "Settings exceed the size limit." };
  }
  let input: unknown;
  try {
    input = JSON.parse(source) as unknown;
  } catch {
    return { kind: "CORRUPT", diagnostic: "Settings are not valid JSON." };
  }
  if (!isRecord(input)) {
    return { kind: "CORRUPT", diagnostic: "Settings envelope is invalid." };
  }
  if (input.format !== "pulp-wars-settings" || input.version !== 1) {
    return {
      kind: "INCOMPATIBLE",
      diagnostic: "Settings use an unsupported format or version.",
    };
  }
  if (!hasExactKeys(input, ["format", "version", "settings"])) {
    return { kind: "CORRUPT", diagnostic: "Settings fields are invalid." };
  }
  const settings = parseUiSettings(input.settings);
  return settings === null
    ? { kind: "CORRUPT", diagnostic: "Settings schema validation failed." }
    : { kind: "VALID", settings };
}

function parseCommands(input: unknown): readonly Command[] | null {
  if (!Array.isArray(input)) return null;
  const commands: Command[] = [];
  for (const candidate of input) {
    const parsed = parseCommand(candidate);
    if (!parsed.ok) return null;
    commands.push(parsed.value);
  }
  return commands;
}

function parsePresentation(
  input: unknown,
): SaveEnvelopeV5["presentation"] | null {
  if (!hasExactKeys(input, ["tallies", "playerTallies"])) return null;
  const tallies = parseTallies(input.tallies);
  if (tallies === null || !Array.isArray(input.playerTallies)) return null;
  const playerTallies: PlayerMatchTallies[] = [];
  for (const candidate of input.playerTallies) {
    if (
      !hasExactKeys(candidate, [
        "playerId",
        "kills",
        "losses",
        "citiesCaptured",
      ]) ||
      !isNonNegativeInteger(candidate.playerId) ||
      !isNonNegativeInteger(candidate.kills) ||
      !isNonNegativeInteger(candidate.losses) ||
      !isNonNegativeInteger(candidate.citiesCaptured)
    )
      return null;
    playerTallies.push({
      playerId: candidate.playerId,
      kills: candidate.kills,
      losses: candidate.losses,
      citiesCaptured: candidate.citiesCaptured,
    });
  }
  return { tallies, playerTallies };
}

function parseTallies(input: unknown): MatchTallies | null {
  if (
    !hasExactKeys(input, ["citiesCaptured", "unitsDefeated", "unitsLost"]) ||
    !isNonNegativeInteger(input.citiesCaptured) ||
    !isNonNegativeInteger(input.unitsDefeated) ||
    !isNonNegativeInteger(input.unitsLost)
  )
    return null;
  return {
    citiesCaptured: input.citiesCaptured,
    unitsDefeated: input.unitsDefeated,
    unitsLost: input.unitsLost,
  };
}

function parseUiSettings(input: unknown): UiSettings | null {
  if (
    !hasExactKeys(input, [
      "uiScale",
      "motion",
      "animationSpeed",
      "highContrast",
    ]) ||
    (input.uiScale !== 1 &&
      input.uiScale !== 1.25 &&
      input.uiScale !== 1.5 &&
      input.uiScale !== 2) ||
    (input.motion !== "FULL" && input.motion !== "REDUCED") ||
    (input.animationSpeed !== "NORMAL" && input.animationSpeed !== "FAST") ||
    typeof input.highContrast !== "boolean"
  )
    return null;
  return {
    uiScale: input.uiScale,
    motion: input.motion,
    animationSpeed: input.animationSpeed,
    highContrast: input.highContrast,
  };
}

function hasExactKeys(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (!isRecord(input)) return false;
  const keys = Object.keys(input).sort();
  const required = [...expected].sort();
  return (
    keys.length === required.length &&
    keys.every((key, index) => key === required[index])
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function diagnostic(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : "unknown error"}`;
}
