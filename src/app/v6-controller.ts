import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6,
  chooseNormalCommandV6,
  type NormalAiDecisionV6,
} from "../ai/index";
import {
  appendReplayCommandV6,
  applyCommandV6,
  canonicalHash,
  canonicalJson,
  createPlayableGameV6,
  createReplayV6,
  previewEconomicV6,
  queryCombatPreviewV6,
  queryHealPreviewV6,
  queryPlayerCommandsV6,
  runReplayV6,
  viewForV6,
  type CombatPreviewV6,
  type CombatTargetRefV6,
  type CommandV6,
  type DomainEventV6,
  type EconomicPreviewResultV6,
  type GameStateV6,
  type HealPreviewV6,
  type MatchSetupV6,
  type PlayerViewV6,
  type ReplayFileV6,
  type RuleErrorV6,
  type UnitId,
} from "../engine/index";
import {
  BrowserPersistenceV6,
  type BrowserSaveLoadResultV6,
  type PersistenceScheduler,
  type SaveEnvelopeV6,
  type StorageAdapter,
} from "../persistence/index";

export type Ruleset6BrowserPhase =
  "EMPTY" | "RESUMABLE" | "ACTIVE" | "COMPLETE" | "RECOVERY" | "ERROR";

export interface Ruleset6SaveRecovery {
  readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
  readonly diagnostic: string;
}

export interface Ruleset6BrowserSnapshot {
  readonly phase: Ruleset6BrowserPhase;
  readonly view: PlayerViewV6 | null;
  readonly offeredCommands: readonly CommandV6[];
  readonly commandIndex: number;
  readonly stateHash: string | null;
  readonly savedAt: string | null;
  readonly hasStoredSave: boolean;
  readonly recovery: Ruleset6SaveRecovery | null;
  readonly saveWarning: string | null;
  readonly diagnostic: string | null;
  readonly transitioning: boolean;
}

export type Ruleset6LaunchResult =
  | {
      readonly ok: true;
      readonly events: readonly DomainEventV6[];
      readonly stateHash: string;
    }
  | {
      readonly ok: false;
      readonly code:
        | "CONTROLLER_DESTROYED"
        | "INVALID_SETUP"
        | "PRESERVED_SAVE_REQUIRES_DELETE"
        | "STORED_MATCH_REQUIRES_REPLACE";
      readonly diagnostic: string;
    };

export type Ruleset6DispatchResult =
  | {
      readonly accepted: true;
      readonly command: CommandV6;
      readonly events: readonly DomainEventV6[];
      readonly stateHash: string;
      /** Public, transient render snapshots; never persisted or hashed. */
      readonly presentationBoundary: Ruleset6AcceptedBoundaryV6;
    }
  | {
      readonly accepted: false;
      readonly reason:
        | "CONTROLLER_DESTROYED"
        | "NO_ACTIVE_MATCH"
        | "NOT_HUMAN_TURN"
        | "NOT_OFFERED"
        | "ENGINE_REJECTED";
      readonly error?: RuleErrorV6;
    };

export type Ruleset6AiProgressResult =
  | {
      readonly ok: true;
      readonly acceptedCommands: number;
      readonly events: readonly DomainEventV6[];
      readonly stateHash: string;
      /** Accepted boundaries remain ordered even when AI transitions rapidly. */
      readonly presentationBoundaries: readonly Ruleset6AcceptedBoundaryV6[];
    }
  | {
      readonly ok: false;
      readonly acceptedCommands: number;
      readonly diagnostic: string;
    };

export interface Ruleset6AcceptedBoundaryV6 {
  readonly actorId: GameStateV6["humanPlayerId"];
  readonly command: CommandV6;
  readonly events: readonly DomainEventV6[];
  readonly beforeView: PlayerViewV6;
  readonly afterView: PlayerViewV6;
}

export interface Ruleset6BrowserControllerOptions {
  readonly storage?: StorageAdapter | null;
  readonly persistenceNow?: () => string;
  readonly persistenceScheduler?: PersistenceScheduler;
  readonly chooseAiCommand?: (
    view: PlayerViewV6,
  ) => NormalAiDecisionV6 | Promise<NormalAiDecisionV6>;
}

type SnapshotSubscriberV6 = (snapshot: Ruleset6BrowserSnapshot) => void;

/**
 * DOM-free ruleset-6 browser session boundary. All mutations are serialized,
 * AI receives only PlayerViewV6, and every accepted boundary is replayed and
 * queued for persistence before another transition may begin.
 */
export class Ruleset6BrowserController {
  readonly #subscribers = new Set<SnapshotSubscriberV6>();
  readonly #persistence: BrowserPersistenceV6 | null;
  readonly #chooseAiCommand: (
    view: PlayerViewV6,
  ) => NormalAiDecisionV6 | Promise<NormalAiDecisionV6>;
  #match: GameStateV6 | null = null;
  #replay: ReplayFileV6 | null = null;
  #phase: Ruleset6BrowserPhase = "EMPTY";
  #savedAt: string | null = null;
  #storedSavePresent = false;
  #recovery: Ruleset6SaveRecovery | null = null;
  #saveWarning: string | null = null;
  #diagnostic: string | null = null;
  #transitioning = false;
  #transitionTail: Promise<void> = Promise.resolve();
  #destroyed = false;

  constructor(options: Ruleset6BrowserControllerOptions = {}) {
    this.#chooseAiCommand = options.chooseAiCommand ?? chooseNormalCommandV6;
    this.#persistence =
      options.storage === undefined || options.storage === null
        ? null
        : new BrowserPersistenceV6(options.storage, {
            ...(options.persistenceNow === undefined
              ? {}
              : { now: options.persistenceNow }),
            ...(options.persistenceScheduler === undefined
              ? {}
              : { schedule: options.persistenceScheduler }),
            onAsyncFailure: (diagnostic) => {
              this.#saveWarning = diagnostic;
              this.#emit();
            },
          });
    const loaded = this.#persistence?.loadSave();
    if (loaded !== undefined) this.#loadInitialSave(loaded);
  }

  subscribe(subscriber: SnapshotSubscriberV6): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.snapshot());
    return () => this.#subscribers.delete(subscriber);
  }

  snapshot(): Ruleset6BrowserSnapshot {
    const view = this.#humanView();
    const offeredCommands = view === null ? [] : queryPlayerCommandsV6(view);
    return freezeBrowserValue({
      phase: this.#phase,
      view,
      offeredCommands,
      commandIndex: this.#match?.commandIndex ?? 0,
      stateHash: this.#match === null ? null : canonicalHash(this.#match),
      savedAt: this.#savedAt,
      hasStoredSave: this.#storedSavePresent,
      recovery: this.#recovery,
      saveWarning: this.#saveWarning,
      diagnostic: this.#diagnostic,
      transitioning: this.#transitioning,
    });
  }

  launch(
    setup: MatchSetupV6,
    options: { readonly replaceStoredMatch?: boolean } = {},
  ): Promise<Ruleset6LaunchResult> {
    return this.#serialize(async () => {
      if (this.#destroyed) return launchFailure("CONTROLLER_DESTROYED");
      if (this.#recovery !== null) {
        return launchFailure("PRESERVED_SAVE_REQUIRES_DELETE");
      }
      if (
        (this.#match !== null || this.#storedSavePresent) &&
        options.replaceStoredMatch !== true
      ) {
        return launchFailure("STORED_MATCH_REQUIRES_REPLACE");
      }
      const created = createPlayableGameV6(setup);
      if (!created.ok) return launchFailure("INVALID_SETUP");
      this.#installCreatedMatch(created.state);
      this.#persistCurrent(true);
      this.#emit();
      return {
        ok: true,
        events: created.events,
        stateHash: canonicalHash(created.state),
      };
    });
  }

  resume(): Promise<boolean> {
    return this.#serialize(async () => {
      if (this.#destroyed || this.#match === null) return false;
      this.#phase = this.#match.outcome === null ? "ACTIVE" : "COMPLETE";
      this.#diagnostic = null;
      this.#emit();
      return true;
    });
  }

  dispatch(command: CommandV6): Promise<Ruleset6DispatchResult> {
    return this.#serialize(async () => {
      if (this.#destroyed) {
        return { accepted: false, reason: "CONTROLLER_DESTROYED" };
      }
      const match = this.#match;
      if (match === null || this.#phase !== "ACTIVE") {
        return { accepted: false, reason: "NO_ACTIVE_MATCH" };
      }
      const actorId = match.turnOrder[match.activeSeatIndex];
      if (actorId !== match.humanPlayerId) {
        return { accepted: false, reason: "NOT_HUMAN_TURN" };
      }
      const view = viewForV6(match, match.humanPlayerId);
      if (!commandIsOffered(view, command)) {
        return { accepted: false, reason: "NOT_OFFERED" };
      }
      const result = this.#applyBoundary(actorId, command);
      if (!result.accepted) return result;
      this.#emit();
      return result;
    });
  }

  progressAiTurns(): Promise<Ruleset6AiProgressResult> {
    return this.#serialize(async () => {
      let acceptedCommands = 0;
      const events: DomainEventV6[] = [];
      const presentationBoundaries: Ruleset6AcceptedBoundaryV6[] = [];
      if (this.#destroyed) {
        return {
          ok: false,
          acceptedCommands,
          diagnostic: "The ruleset-6 browser controller was destroyed.",
        };
      }
      if (this.#match === null || this.#phase !== "ACTIVE") {
        return {
          ok: false,
          acceptedCommands,
          diagnostic: "No active ruleset-6 match is available.",
        };
      }
      let currentAiId: number | null = null;
      let acceptedThisTurn = 0;
      try {
        while (this.#match.outcome === null) {
          const actorId = this.#match.turnOrder[this.#match.activeSeatIndex];
          if (actorId === undefined) {
            throw new Error("The active player is missing.");
          }
          if (actorId === this.#match.humanPlayerId) break;
          if (actorId !== currentAiId) {
            currentAiId = actorId;
            acceptedThisTurn = 0;
          }
          if (acceptedThisTurn >= NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6) {
            throw new Error("AI exceeded its 128-command turn budget.");
          }
          const view = viewForV6(this.#match, actorId);
          const decision = await this.#chooseAiCommand(view);
          if (this.#destroyed) {
            throw new Error("The ruleset-6 browser controller was destroyed.");
          }
          const command = decision.command;
          if (command === null || !commandIsOffered(view, command)) {
            throw new Error("Normal AI produced no exact public command.");
          }
          const result = this.#applyBoundary(actorId, command);
          if (!result.accepted) {
            throw new Error(
              result.reason === "ENGINE_REJECTED"
                ? `Normal AI command rejected: ${result.error?.code ?? "UNKNOWN"}.`
                : `Normal AI command rejected: ${result.reason}.`,
            );
          }
          acceptedCommands += 1;
          acceptedThisTurn += 1;
          events.push(...result.events);
          presentationBoundaries.push(result.presentationBoundary);
          this.#emit();
        }
      } catch (error) {
        this.flushPersistence();
        this.#phase = "ERROR";
        this.#diagnostic = safeDiagnostic(error);
        this.#emit();
        return {
          ok: false,
          acceptedCommands,
          diagnostic: this.#diagnostic,
        };
      }
      return {
        ok: true,
        acceptedCommands,
        events,
        stateHash: canonicalHash(this.#match),
        presentationBoundaries: Object.freeze(presentationBoundaries),
      };
    });
  }

  restart(): Promise<Ruleset6LaunchResult> {
    return this.#serialize(async () => {
      if (this.#destroyed) return launchFailure("CONTROLLER_DESTROYED");
      if (this.#match === null) return launchFailure("INVALID_SETUP");
      const created = createPlayableGameV6(this.#match.setup);
      if (!created.ok) return launchFailure("INVALID_SETUP");
      this.#installCreatedMatch(created.state);
      this.#persistCurrent(true);
      this.#emit();
      return {
        ok: true,
        events: created.events,
        stateHash: canonicalHash(created.state),
      };
    });
  }

  deleteStoredSave(): Promise<boolean> {
    return this.#serialize(async () => {
      if (this.#destroyed) return false;
      const result = this.#persistence?.deleteSave() ?? { ok: true as const };
      if (!result.ok) {
        this.#saveWarning = result.diagnostic;
        this.#emit();
        return false;
      }
      this.#match = null;
      this.#replay = null;
      this.#phase = "EMPTY";
      this.#savedAt = null;
      this.#storedSavePresent = false;
      this.#recovery = null;
      this.#saveWarning = null;
      this.#diagnostic = null;
      this.#emit();
      return true;
    });
  }

  economicPreview(command: CommandV6): EconomicPreviewResultV6 {
    const view = this.#humanView();
    return view === null
      ? { ok: false, error: "NOT_OFFERED" }
      : previewEconomicV6(view, command);
  }

  combatPreview(
    attackerId: UnitId,
    target: CombatTargetRefV6,
  ): CombatPreviewV6 | null {
    const view = this.#humanView();
    return view === null
      ? null
      : queryCombatPreviewV6(view, attackerId, target);
  }

  healPreview(medicId: UnitId, targetUnitId: UnitId): HealPreviewV6 | null {
    const view = this.#humanView();
    return view === null
      ? null
      : queryHealPreviewV6(view, medicId, targetUnitId);
  }

  exportReplay(): ReplayFileV6 | null {
    if (this.#replay === null) return null;
    return freezeBrowserValue({
      ...this.#replay,
      commands: [...this.#replay.commands],
      checkpoints: [...this.#replay.checkpoints],
    });
  }

  flushPersistence(): boolean {
    const result = this.#persistence?.flushSave();
    if (result?.ok === false) {
      this.#saveWarning = result.diagnostic;
      this.#emit();
      return false;
    }
    return true;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.flushPersistence();
    this.#destroyed = true;
    this.#persistence?.destroy();
    this.#subscribers.clear();
  }

  #loadInitialSave(loaded: BrowserSaveLoadResultV6): void {
    if (loaded.kind === "NONE") return;
    this.#storedSavePresent = true;
    if (loaded.kind !== "VALID") {
      this.#phase = "RECOVERY";
      this.#recovery = {
        kind: loaded.kind,
        diagnostic: loaded.diagnostic,
      };
      return;
    }
    try {
      const replay = replayFromSaveV6(loaded.save);
      const replayed = runReplayV6(replay);
      if (
        replayed.acceptedCommands !== loaded.save.commandIndex ||
        replayed.stateHash !== loaded.save.stateHash ||
        canonicalJson(replayed.state) !== canonicalJson(loaded.save.state)
      ) {
        throw new Error("Saved match replay does not match its stored state.");
      }
      this.#match = loaded.save.state;
      this.#replay = replay;
      this.#savedAt = loaded.save.savedAt;
      this.#phase =
        loaded.save.state.outcome === null ? "RESUMABLE" : "COMPLETE";
    } catch (error) {
      this.#phase = "RECOVERY";
      this.#recovery = {
        kind: "CORRUPT",
        diagnostic: `Saved match failed deterministic replay validation: ${safeDiagnostic(error)}`,
      };
    }
  }

  #installCreatedMatch(state: GameStateV6): void {
    this.#match = state;
    this.#replay = createReplayV6(state.setup);
    this.#phase = state.outcome === null ? "ACTIVE" : "COMPLETE";
    this.#savedAt = null;
    this.#recovery = null;
    this.#saveWarning = null;
    this.#diagnostic = null;
  }

  #applyBoundary(
    actorId: GameStateV6["humanPlayerId"],
    command: CommandV6,
  ): Ruleset6DispatchResult {
    const match = this.#match;
    const replay = this.#replay;
    if (match === null || replay === null) {
      return { accepted: false, reason: "NO_ACTIVE_MATCH" };
    }
    const applied = applyCommandV6(match, actorId, command);
    if (!applied.accepted) {
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: applied.error,
      };
    }
    let nextReplay: ReplayFileV6;
    try {
      nextReplay = appendReplayCommandV6(replay, command, applied.state);
    } catch (error) {
      this.#phase = "ERROR";
      this.#diagnostic = `Replay log update failed: ${safeDiagnostic(error)}`;
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: { code: "INVALID_STATE", params: {} },
      };
    }
    const beforeView = viewForV6(match, match.humanPlayerId);
    this.#match = applied.state;
    this.#replay = nextReplay;
    if (applied.state.outcome !== null) this.#phase = "COMPLETE";
    this.#persistCurrent(
      command.kind === "END_TURN" || applied.state.outcome !== null,
    );
    return {
      accepted: true,
      command,
      events: applied.events,
      stateHash: canonicalHash(applied.state),
      presentationBoundary: freezeBrowserValue({
        actorId,
        command,
        events: applied.events,
        beforeView,
        afterView: viewForV6(applied.state, applied.state.humanPlayerId),
      }),
    };
  }

  #persistCurrent(immediate: boolean): void {
    if (
      this.#persistence === null ||
      this.#match === null ||
      this.#replay === null
    ) {
      return;
    }
    try {
      this.#savedAt = this.#persistence.queueSave({
        state: this.#match,
        replay: this.#replay,
      });
      this.#storedSavePresent = true;
      this.#saveWarning = null;
      if (immediate) this.flushPersistence();
    } catch (error) {
      this.#saveWarning = `Autosave preparation failed: ${safeDiagnostic(error)}`;
    }
  }

  #humanView(): PlayerViewV6 | null {
    return this.#match === null
      ? null
      : viewForV6(this.#match, this.#match.humanPlayerId);
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#transitionTail.then(async () => {
      this.#transitioning = true;
      this.#emit();
      try {
        return await operation();
      } finally {
        this.#transitioning = false;
        this.#emit();
      }
    });
    this.#transitionTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  #emit(): void {
    if (this.#subscribers.size === 0) return;
    const snapshot = this.snapshot();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}

function replayFromSaveV6(save: SaveEnvelopeV6): ReplayFileV6 {
  return {
    format: "pulp-wars-replay",
    version: 6,
    setup: save.setup,
    commands: [...save.acceptedCommands],
    checkpoints:
      save.commandIndex === 0
        ? []
        : [{ index: save.commandIndex, stateHash: save.stateHash }],
  };
}

function commandIsOffered(view: PlayerViewV6, command: CommandV6): boolean {
  let encoded: string;
  try {
    encoded = canonicalJson(command);
  } catch {
    return false;
  }
  return queryPlayerCommandsV6(view).some(
    (candidate) => canonicalJson(candidate) === encoded,
  );
}

function launchFailure(
  code: Extract<Ruleset6LaunchResult, { readonly ok: false }>["code"],
): Extract<Ruleset6LaunchResult, { readonly ok: false }> {
  const diagnostic =
    code === "CONTROLLER_DESTROYED"
      ? "The ruleset-6 browser controller was destroyed."
      : code === "PRESERVED_SAVE_REQUIRES_DELETE"
        ? "The preserved incompatible or corrupt save must be explicitly deleted before starting a new match."
        : code === "STORED_MATCH_REQUIRES_REPLACE"
          ? "Starting a new match requires explicit replacement of the stored match."
          : "Ruleset-6 match generation rejected the setup.";
  return { ok: false, code, diagnostic };
}

function safeDiagnostic(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown controller error";
}

function freezeBrowserValue<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  for (const child of Object.values(value)) freezeBrowserValue(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}
