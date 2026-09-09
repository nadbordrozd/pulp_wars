import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  chooseNormalTurnCommandV7,
  type NormalAiDecisionV7,
} from "../ai/index";
import {
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  canonicalJson,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  createSafeLiveLogV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  type ReplayFileV7,
  type RuleErrorV7,
} from "../engine/index";
import {
  BrowserPersistenceV7,
  type BrowserSaveLoadResultV7,
  type PersistenceScheduler,
  type SaveEnvelopeV7,
  type StorageAdapter,
} from "../persistence/index";
import {
  createRuleset7DebugBundle,
  ruleset7DebugBundleFilename,
  ruleset7SafeLogFilename,
  type Ruleset7DebugBundleV1,
} from "./v7-debug-export";

export type Ruleset7BrowserPhase =
  "EMPTY" | "RESUMABLE" | "ACTIVE" | "COMPLETE" | "RECOVERY" | "ERROR";

export interface Ruleset7SaveRecovery {
  readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
  readonly diagnostic: string;
}

export interface Ruleset7AiPresentationState {
  readonly active: boolean;
  readonly fastForward: boolean;
  readonly policySlices: number;
  readonly acceptedCommands: number;
  readonly lastSliceMilliseconds: number;
  readonly maximumSliceMilliseconds: number;
}

/** Public browser state: no canonical state, replay, hashes, or AI-seat view. */
export interface Ruleset7BrowserSnapshot {
  readonly phase: Ruleset7BrowserPhase;
  readonly view: PlayerViewV7 | null;
  readonly offeredCommands: readonly CommandV7[];
  readonly savedAt: string | null;
  readonly hasStoredSave: boolean;
  readonly recovery: Ruleset7SaveRecovery | null;
  readonly saveWarning: string | null;
  readonly diagnostic: string | null;
  readonly transitioning: boolean;
  readonly ai: Ruleset7AiPresentationState;
}

export interface Ruleset7AcceptedBoundary {
  readonly actor: "HUMAN" | "AI";
  readonly beforeView: PlayerViewV7;
  readonly afterView: PlayerViewV7;
  readonly playerEvents: PlayerEventEnvelopeV7;
}

export type Ruleset7LaunchResult =
  | {
      readonly ok: true;
      readonly view: PlayerViewV7;
      readonly playerEvents: PlayerEventEnvelopeV7;
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

export type Ruleset7DispatchResult =
  | {
      readonly accepted: true;
      readonly beforeView: PlayerViewV7;
      readonly afterView: PlayerViewV7;
      readonly playerEvents: PlayerEventEnvelopeV7;
    }
  | {
      readonly accepted: false;
      readonly reason:
        | "CONTROLLER_DESTROYED"
        | "NO_ACTIVE_MATCH"
        | "NOT_HUMAN_TURN"
        | "NOT_OFFERED"
        | "ENGINE_REJECTED";
      readonly error?: RuleErrorV7;
    };

export type Ruleset7AiProgressResult =
  | {
      readonly ok: true;
      readonly acceptedCommands: number;
      readonly playerEventBatches: readonly PlayerEventEnvelopeV7[];
      readonly view: PlayerViewV7;
      readonly policySlices: number;
      readonly maximumSliceMilliseconds: number;
    }
  | {
      readonly ok: false;
      readonly cancelled: boolean;
      readonly acceptedCommands: number;
      readonly diagnostic: string;
    };

export interface Ruleset7SafeLogExportResult {
  readonly ok: true;
  readonly filename: string;
  readonly source: string;
}

export type Ruleset7DebugExportResult =
  | {
      readonly ok: true;
      readonly bundle: Ruleset7DebugBundleV1;
      readonly filename: string;
      readonly source: string;
    }
  | { readonly ok: false; readonly reason: "NO_ACTIVE_MATCH" };

/** A host callback is cancellable so replaced matches cannot resume stale work. */
export type Ruleset7AiProgressScheduler = (
  resume: () => void,
) => (() => void) | undefined;

export interface Ruleset7PolicyWork {
  runSlice(maxMilliseconds: number): NormalAiDecisionV7 | null;
}

export interface Ruleset7BrowserControllerOptions {
  readonly storage?: StorageAdapter | null;
  readonly persistenceNow?: () => string;
  readonly persistenceScheduler?: PersistenceScheduler;
  readonly createAiPolicyWork?: (
    view: PlayerViewV7,
    acceptedCommandsThisTurn: number,
  ) => Ruleset7PolicyWork;
  readonly aiProgressScheduler?: Ruleset7AiProgressScheduler;
  readonly policySliceMilliseconds?: number;
  readonly policyReadClock?: () => number;
  readonly diagnosticNow?: () => string;
}

type SnapshotSubscriberV7 = (snapshot: Ruleset7BrowserSnapshot) => void;
type AcceptedBoundarySubscriberV7 = (
  boundary: Ruleset7AcceptedBoundary,
) => void;

interface AiRunV7 {
  readonly generation: number;
  readonly resolve: (result: Ruleset7AiProgressResult) => void;
  readonly playerEventBatches: PlayerEventEnvelopeV7[];
  acceptedCommands: number;
  acceptedThisTurn: number;
  currentAiId: number | null;
  policyView: PlayerViewV7 | null;
  policyWork: Ruleset7PolicyWork | null;
  policySlices: number;
  maximumSliceMilliseconds: number;
  cancelScheduled: (() => void) | null;
}

const defaultAiProgressSchedulerV7: Ruleset7AiProgressScheduler = (resume) => {
  const timer = setTimeout(resume, 0);
  return () => clearTimeout(timer);
};

const defaultReadClockV7 = (): number =>
  globalThis.performance?.now() ?? Date.now();

/**
 * DOM-free Ruleset-7 browser boundary. Authority stays in native #private
 * fields; every ordinary callback is projected for the stored human viewer.
 */
export class Ruleset7BrowserController {
  readonly #subscribers = new Set<SnapshotSubscriberV7>();
  readonly #acceptedBoundarySubscribers =
    new Set<AcceptedBoundarySubscriberV7>();
  readonly #persistence: BrowserPersistenceV7 | null;
  readonly #createAiPolicyWork: (
    view: PlayerViewV7,
    acceptedCommandsThisTurn: number,
  ) => Ruleset7PolicyWork;
  readonly #aiProgressScheduler: Ruleset7AiProgressScheduler;
  readonly #policySliceMilliseconds: number;
  readonly #readClock: () => number;
  readonly #diagnosticNow: () => string;
  #match: GameStateV7 | null = null;
  #replay: ReplayFileV7 | null = null;
  #humanViewCache: PlayerViewV7 | null = null;
  #safeEventBatches: PlayerEventEnvelopeV7[] = [];
  #phase: Ruleset7BrowserPhase = "EMPTY";
  #savedAt: string | null = null;
  #storedSavePresent = false;
  #recovery: Ruleset7SaveRecovery | null = null;
  #saveWarning: string | null = null;
  #diagnostic: string | null = null;
  #transitioning = false;
  #transitionTail: Promise<void> = Promise.resolve();
  #destroyed = false;
  #generation = 0;
  #activeAi: AiRunV7 | null = null;
  #fastForward = false;
  #lastAiAcceptedCommands = 0;
  #lastPolicySlices = 0;
  #lastSliceMilliseconds = 0;
  #maximumSliceMilliseconds = 0;

  constructor(options: Ruleset7BrowserControllerOptions = {}) {
    this.#readClock = options.policyReadClock ?? defaultReadClockV7;
    this.#policySliceMilliseconds = options.policySliceMilliseconds ?? 4;
    if (
      !Number.isFinite(this.#policySliceMilliseconds) ||
      this.#policySliceMilliseconds <= 0
    ) {
      throw new RangeError("policySliceMilliseconds must be positive");
    }
    this.#createAiPolicyWork =
      options.createAiPolicyWork ??
      ((view) => new NormalPolicyWorkV7(view, this.#readClock));
    this.#aiProgressScheduler =
      options.aiProgressScheduler ?? defaultAiProgressSchedulerV7;
    this.#diagnosticNow =
      options.diagnosticNow ?? (() => new Date().toISOString());
    this.#persistence =
      options.storage === undefined || options.storage === null
        ? null
        : new BrowserPersistenceV7(options.storage, {
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

  subscribe(subscriber: SnapshotSubscriberV7): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.snapshot());
    return () => this.#subscribers.delete(subscriber);
  }

  subscribeAcceptedBoundary(
    subscriber: AcceptedBoundarySubscriberV7,
  ): () => void {
    if (this.#destroyed) return () => {};
    this.#acceptedBoundarySubscribers.add(subscriber);
    return () => this.#acceptedBoundarySubscribers.delete(subscriber);
  }

  snapshot(): Ruleset7BrowserSnapshot {
    const view = this.#humanView();
    const activePlayerId =
      view === null ? undefined : view.turnOrder[view.activeSeatIndex];
    const offeredCommands =
      view === null ||
      this.#phase !== "ACTIVE" ||
      activePlayerId !== view.humanPlayerId
        ? []
        : queryPlayerCommandsV7(view);
    return freezeBrowserValueV7({
      phase: this.#phase,
      view,
      offeredCommands,
      savedAt: this.#savedAt,
      hasStoredSave: this.#storedSavePresent,
      recovery: this.#recovery,
      saveWarning: this.#saveWarning,
      diagnostic: this.#diagnostic,
      transitioning: this.#transitioning,
      ai: {
        active: this.#activeAi !== null,
        fastForward: this.#fastForward,
        policySlices: this.#activeAi?.policySlices ?? this.#lastPolicySlices,
        acceptedCommands:
          this.#activeAi?.acceptedCommands ?? this.#lastAiAcceptedCommands,
        lastSliceMilliseconds: this.#lastSliceMilliseconds,
        maximumSliceMilliseconds:
          this.#activeAi?.maximumSliceMilliseconds ??
          this.#maximumSliceMilliseconds,
      },
    });
  }

  launch(
    setup: MatchSetupV7,
    options: { readonly replaceStoredMatch?: boolean } = {},
  ): Promise<Ruleset7LaunchResult> {
    if (options.replaceStoredMatch === true) this.#cancelAiWork();
    return this.#serialize(async () => {
      if (this.#destroyed) return launchFailureV7("CONTROLLER_DESTROYED");
      if (this.#recovery !== null)
        return launchFailureV7("PRESERVED_SAVE_REQUIRES_DELETE");
      if (
        (this.#match !== null || this.#storedSavePresent) &&
        options.replaceStoredMatch !== true
      ) {
        return launchFailureV7("STORED_MATCH_REQUIRES_REPLACE");
      }
      const raw = createInitialMapStateV7(setup);
      const created = createPlayableGameV7(setup);
      if (!raw.ok || !created.ok) return launchFailureV7("INVALID_SETUP");
      if (
        canonicalJson(raw.state.setup) !== canonicalJson(created.state.setup) ||
        canonicalJson(raw.state.random) !== canonicalJson(created.state.random)
      ) {
        return launchFailureV7("INVALID_SETUP");
      }
      this.#persistence?.discardPendingSave();
      this.#installCreatedMatch(created.state);
      const playerEvents = projectEventsV7(
        raw.state,
        created.state,
        created.state.humanPlayerId,
        created.events,
      );
      this.#safeEventBatches = [playerEvents];
      this.#persistCurrent(true);
      this.#emit();
      return {
        ok: true,
        view: viewForV7(created.state, created.state.humanPlayerId),
        playerEvents,
      };
    });
  }

  resume(): Promise<boolean> {
    this.#cancelAiWork();
    return this.#serialize(async () => {
      if (this.#destroyed || this.#match === null) return false;
      this.#phase = this.#match.outcome === null ? "ACTIVE" : "COMPLETE";
      this.#diagnostic = null;
      this.#emit();
      return true;
    });
  }

  returnToMenu(): Promise<boolean> {
    this.#cancelAiWork();
    return this.#serialize(async () => {
      if (
        this.#destroyed ||
        this.#match === null ||
        this.#replay === null ||
        this.#phase !== "ACTIVE"
      )
        return false;
      const queued = this.#persistCurrent(false);
      if (!queued || !this.flushPersistence()) return false;
      this.#phase = "RESUMABLE";
      this.#diagnostic = null;
      this.#fastForward = false;
      this.#emit();
      return true;
    });
  }

  dispatch(command: CommandV7): Promise<Ruleset7DispatchResult> {
    return this.#serialize(async () => {
      if (this.#destroyed)
        return { accepted: false, reason: "CONTROLLER_DESTROYED" };
      const match = this.#match;
      if (match === null || this.#phase !== "ACTIVE")
        return { accepted: false, reason: "NO_ACTIVE_MATCH" };
      const actorId = match.turnOrder[match.activeSeatIndex];
      if (actorId !== match.humanPlayerId)
        return { accepted: false, reason: "NOT_HUMAN_TURN" };
      const view = viewForV7(match, match.humanPlayerId);
      if (!commandIsOfferedV7(view, command))
        return { accepted: false, reason: "NOT_OFFERED" };
      const result = this.#applyBoundary(actorId, command);
      if (!result.accepted) return result;
      this.#emit();
      return result;
    });
  }

  progressAiTurns(): Promise<Ruleset7AiProgressResult> {
    const requestedGeneration = this.#generation;
    return this.#serialize(async () => {
      if (requestedGeneration !== this.#generation)
        return aiFailureV7(0, true, "superseded before it started");
      if (this.#destroyed) return aiFailureV7(0, true, "destroyed");
      if (this.#match === null || this.#phase !== "ACTIVE")
        return aiFailureV7(0, false, "no active match");
      const actorId = this.#match.turnOrder[this.#match.activeSeatIndex];
      if (actorId === undefined)
        return aiFailureV7(0, false, "active player is missing");
      if (actorId === this.#match.humanPlayerId) {
        return {
          ok: true,
          acceptedCommands: 0,
          playerEventBatches: [],
          view:
            this.#humanViewCache ??
            viewForV7(this.#match, this.#match.humanPlayerId),
          policySlices: 0,
          maximumSliceMilliseconds: 0,
        };
      }
      return new Promise<Ruleset7AiProgressResult>((resolve) => {
        const acceptedThisTurn = commandsSinceLastEndTurnV7(this.#replay);
        const run: AiRunV7 = {
          generation: this.#generation,
          resolve,
          playerEventBatches: [],
          acceptedCommands: 0,
          acceptedThisTurn,
          currentAiId: actorId,
          policyView: null,
          policyWork: null,
          policySlices: 0,
          maximumSliceMilliseconds: 0,
          cancelScheduled: null,
        };
        this.#activeAi = run;
        this.#resetAiMeasurements();
        this.#emit();
        this.#scheduleAiCallback(run);
      });
    });
  }

  restart(): Promise<Ruleset7LaunchResult> {
    this.#cancelAiWork();
    return this.#serialize(async () => {
      if (this.#destroyed) return launchFailureV7("CONTROLLER_DESTROYED");
      if (this.#match === null) return launchFailureV7("INVALID_SETUP");
      const setup = this.#match.setup;
      const raw = createInitialMapStateV7(setup);
      const created = createPlayableGameV7(setup);
      if (!raw.ok || !created.ok) return launchFailureV7("INVALID_SETUP");
      this.#persistence?.discardPendingSave();
      this.#installCreatedMatch(created.state);
      const playerEvents = projectEventsV7(
        raw.state,
        created.state,
        created.state.humanPlayerId,
        created.events,
      );
      this.#safeEventBatches = [playerEvents];
      this.#persistCurrent(true);
      this.#emit();
      return {
        ok: true,
        view: viewForV7(created.state, created.state.humanPlayerId),
        playerEvents,
      };
    });
  }

  deleteStoredSave(): Promise<boolean> {
    this.#cancelAiWork();
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
      this.#humanViewCache = null;
      this.#safeEventBatches = [];
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

  setFastForward(active: boolean): void {
    if (this.#destroyed || this.#fastForward === active) return;
    this.#fastForward = active;
    this.#emit();
  }

  exportSafeLog(): Ruleset7SafeLogExportResult | null {
    const view = this.#humanView();
    if (view === null) return null;
    const exportedAt = this.#diagnosticNow();
    return freezeBrowserValueV7({
      ok: true,
      filename: ruleset7SafeLogFilename(exportedAt),
      source: JSON.stringify(
        {
          format: "pulp-wars-ruleset7-safe-live-log",
          version: 1,
          exportedAt,
          rulesetId: view.rulesetId,
          log: createSafeLiveLogV7(view, [...this.#safeEventBatches]),
          diagnostics: {
            phase: this.#phase,
            transitioning: this.#transitioning,
            saveWarning: this.#saveWarning,
            controllerDiagnostic: this.#diagnostic,
          },
        },
        null,
        2,
      ),
    });
  }

  exportDebugBundle(input: {
    readonly acknowledgeHiddenInformation: true;
  }): Ruleset7DebugExportResult {
    if (this.#match === null || this.#replay === null)
      return { ok: false, reason: "NO_ACTIVE_MATCH" };
    const exportedAt = this.#diagnosticNow();
    const stateHash = canonicalHash(this.#match);
    const bundle = createRuleset7DebugBundle({
      state: this.#match,
      replay: this.#replay,
      phase: this.#phase,
      diagnostic: this.#diagnostic,
      transitioning: this.#transitioning,
      exportedAt,
      acknowledgeHiddenInformation: input.acknowledgeHiddenInformation,
    });
    return freezeBrowserValueV7({
      ok: true,
      bundle,
      filename: ruleset7DebugBundleFilename(exportedAt, stateHash),
      source: JSON.stringify(bundle, null, 2),
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
    this.#cancelAiWork();
    this.#persistence?.destroy();
    this.#subscribers.clear();
    this.#acceptedBoundarySubscribers.clear();
  }

  #loadInitialSave(loaded: BrowserSaveLoadResultV7): void {
    if (loaded.kind === "NONE") return;
    this.#storedSavePresent = true;
    if (loaded.kind !== "VALID") {
      this.#phase = "RECOVERY";
      this.#recovery = { kind: loaded.kind, diagnostic: loaded.diagnostic };
      return;
    }
    try {
      const replay = replayFromSaveV7(loaded.save);
      // parseSaveV7 already performs strict schema/hash and full replay
      // reconstruction before returning VALID. Do not replay it a second time.
      this.#match = loaded.save.state;
      this.#replay = replay;
      this.#humanViewCache = viewForV7(
        loaded.save.state,
        loaded.save.state.humanPlayerId,
      );
      this.#savedAt = loaded.save.savedAt;
      this.#phase =
        loaded.save.state.outcome === null ? "RESUMABLE" : "COMPLETE";
    } catch (error) {
      this.#phase = "RECOVERY";
      this.#recovery = {
        kind: "CORRUPT",
        diagnostic: `Saved match failed deterministic replay validation: ${safeDiagnosticV7(error)}`,
      };
    }
  }

  #installCreatedMatch(state: GameStateV7): void {
    this.#match = state;
    this.#replay = createReplayV7(state.setup);
    this.#humanViewCache = viewForV7(state, state.humanPlayerId);
    this.#phase = state.outcome === null ? "ACTIVE" : "COMPLETE";
    this.#savedAt = null;
    this.#recovery = null;
    this.#saveWarning = null;
    this.#diagnostic = null;
    this.#fastForward = false;
    this.#resetAiMeasurements();
  }

  #applyBoundary(
    actorId: PlayerId,
    command: CommandV7,
  ): Ruleset7DispatchResult {
    const match = this.#match;
    const replay = this.#replay;
    if (match === null || replay === null)
      return { accepted: false, reason: "NO_ACTIVE_MATCH" };
    const applied = applyCommandV7(match, actorId, command);
    if (!applied.accepted)
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: applied.error,
      };
    let nextReplay: ReplayFileV7;
    try {
      nextReplay = appendReplayCommandV7(replay, command, applied.state);
    } catch (error) {
      this.#phase = "ERROR";
      this.#diagnostic = `Replay log update failed: ${safeDiagnosticV7(error)}`;
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: { code: "INVALID_STATE", params: {} },
      };
    }
    const humanId = match.humanPlayerId;
    const beforeView = this.#humanViewCache ?? viewForV7(match, humanId);
    const afterView = viewForV7(applied.state, humanId);
    const playerEvents = projectEventsV7(
      match,
      applied.state,
      humanId,
      applied.events,
    );
    this.#match = applied.state;
    this.#replay = nextReplay;
    this.#humanViewCache = afterView;
    this.#safeEventBatches = [...this.#safeEventBatches, playerEvents];
    if (applied.state.outcome !== null) this.#phase = "COMPLETE";
    this.#persistCurrent(
      command.kind === "END_TURN" || applied.state.outcome !== null,
    );
    const result = freezeBrowserValueV7({
      accepted: true as const,
      beforeView,
      afterView,
      playerEvents,
    });
    const boundary = freezeBrowserValueV7({
      actor: actorId === humanId ? ("HUMAN" as const) : ("AI" as const),
      beforeView,
      afterView,
      playerEvents,
    });
    for (const subscriber of this.#acceptedBoundarySubscribers) {
      try {
        subscriber(boundary);
      } catch {
        // Presentation observers cannot reject or perturb an accepted boundary.
      }
    }
    return result;
  }

  #scheduleAiCallback(run: AiRunV7): void {
    if (!this.#isCurrentRun(run)) return;
    try {
      const cancel = this.#aiProgressScheduler(() => {
        run.cancelScheduled = null;
        this.#runAiCallback(run);
      });
      run.cancelScheduled = typeof cancel === "function" ? cancel : null;
    } catch (error) {
      this.#failAiRun(run, safeDiagnosticV7(error));
    }
  }

  #runAiCallback(run: AiRunV7): void {
    if (!this.#isCurrentRun(run)) return;
    const started = this.#readClock();
    try {
      const match = this.#match;
      if (match === null || match.outcome !== null) {
        this.#finishAiRun(run);
        return;
      }
      const actorId = match.turnOrder[match.activeSeatIndex];
      if (actorId === undefined)
        throw new Error("The active player is missing.");
      if (actorId === match.humanPlayerId) {
        this.#fastForward = false;
        this.#finishAiRun(run);
        return;
      }
      if (actorId !== run.currentAiId) {
        run.currentAiId = actorId;
        run.acceptedThisTurn = 0;
        run.policyView = null;
        run.policyWork = null;
      }
      if (run.acceptedThisTurn >= NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7) {
        throw new Error("AI exceeded its 128-command turn budget.");
      }
      if (run.policyWork === null) {
        const aiView = viewForV7(match, actorId);
        run.policyView = aiView;
        run.policyWork = this.#createAiPolicyWork(aiView, run.acceptedThisTurn);
      }
      const decision = run.policyWork.runSlice(this.#policySliceMilliseconds);
      run.policySlices += 1;
      if (!this.#isCurrentRun(run)) return;
      if (decision === null) {
        this.#emit();
        this.#recordSlice(run, started);
        this.#scheduleAiCallback(run);
        return;
      }
      const aiView = run.policyView;
      if (aiView === null) throw new Error("AI policy view is missing.");
      const command = chooseNormalTurnCommandV7(
        aiView,
        run.acceptedThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        decision,
      );
      if (command === null || !commandIsOfferedV7(aiView, command))
        throw new Error("Normal AI produced no exact public command.");
      const result = this.#applyBoundary(actorId, command);
      if (!result.accepted) {
        throw new Error(
          result.reason === "ENGINE_REJECTED"
            ? `Normal AI command rejected: ${result.error?.code ?? "UNKNOWN"}.`
            : `Normal AI command rejected: ${result.reason}.`,
        );
      }
      run.acceptedCommands += 1;
      run.acceptedThisTurn += 1;
      run.playerEventBatches.push(result.playerEvents);
      run.policyView = null;
      run.policyWork = null;
      this.#emit();
      this.#recordSlice(run, started);
      if (this.#match?.outcome !== null) this.#finishAiRun(run);
      else this.#scheduleAiCallback(run);
    } catch (error) {
      this.#recordSlice(run, started);
      this.#failAiRun(run, safeDiagnosticV7(error));
    }
  }

  #recordSlice(run: AiRunV7, started: number): void {
    const elapsed = Math.max(0, this.#readClock() - started);
    this.#lastSliceMilliseconds = elapsed;
    run.maximumSliceMilliseconds = Math.max(
      run.maximumSliceMilliseconds,
      elapsed,
    );
    this.#maximumSliceMilliseconds = Math.max(
      this.#maximumSliceMilliseconds,
      elapsed,
    );
  }

  #finishAiRun(run: AiRunV7): void {
    if (!this.#isCurrentRun(run) || this.#match === null) return;
    this.#activeAi = null;
    this.#lastAiAcceptedCommands = run.acceptedCommands;
    this.#lastPolicySlices = run.policySlices;
    this.#maximumSliceMilliseconds = run.maximumSliceMilliseconds;
    this.#emit();
    run.resolve({
      ok: true,
      acceptedCommands: run.acceptedCommands,
      playerEventBatches: Object.freeze([...run.playerEventBatches]),
      view:
        this.#humanViewCache ??
        viewForV7(this.#match, this.#match.humanPlayerId),
      policySlices: run.policySlices,
      maximumSliceMilliseconds: run.maximumSliceMilliseconds,
    });
  }

  #failAiRun(run: AiRunV7, diagnostic: string): void {
    if (!this.#isCurrentRun(run)) return;
    this.#activeAi = null;
    this.#phase = "ERROR";
    this.#diagnostic = diagnostic;
    this.#lastAiAcceptedCommands = run.acceptedCommands;
    this.#lastPolicySlices = run.policySlices;
    this.#maximumSliceMilliseconds = run.maximumSliceMilliseconds;
    this.flushPersistence();
    this.#emit();
    run.resolve({
      ok: false,
      cancelled: false,
      acceptedCommands: run.acceptedCommands,
      diagnostic,
    });
  }

  #isCurrentRun(run: AiRunV7): boolean {
    return (
      !this.#destroyed &&
      this.#activeAi === run &&
      run.generation === this.#generation
    );
  }

  #cancelAiWork(): void {
    this.#generation += 1;
    const run = this.#activeAi;
    if (run === null) return;
    run.cancelScheduled?.();
    run.cancelScheduled = null;
    this.#activeAi = null;
    this.#lastAiAcceptedCommands = run.acceptedCommands;
    this.#lastPolicySlices = run.policySlices;
    run.resolve({
      ok: false,
      cancelled: true,
      acceptedCommands: run.acceptedCommands,
      diagnostic:
        "Ruleset 7 AI progression was cancelled by match lifecycle replacement.",
    });
  }

  #persistCurrent(immediate: boolean): boolean {
    if (
      this.#persistence === null ||
      this.#match === null ||
      this.#replay === null
    ) {
      return true;
    }
    try {
      this.#savedAt = this.#persistence.queueSave({
        state: this.#match,
        replay: this.#replay,
      });
      this.#storedSavePresent = true;
      this.#saveWarning = null;
      if (immediate) return this.flushPersistence();
      return true;
    } catch (error) {
      this.#saveWarning = `Autosave preparation failed: ${safeDiagnosticV7(error)}`;
      return false;
    }
  }

  #humanView(): PlayerViewV7 | null {
    return this.#humanViewCache;
  }

  #resetAiMeasurements(): void {
    this.#lastAiAcceptedCommands = 0;
    this.#lastPolicySlices = 0;
    this.#lastSliceMilliseconds = 0;
    this.#maximumSliceMilliseconds = 0;
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

function replayFromSaveV7(save: SaveEnvelopeV7): ReplayFileV7 {
  return {
    format: "pulp-wars-replay",
    version: 7,
    setup: save.setup,
    commands: [...save.acceptedCommands],
    checkpoints:
      save.commandIndex === 0
        ? []
        : [{ index: save.commandIndex, stateHash: save.stateHash }],
  };
}

function commandIsOfferedV7(view: PlayerViewV7, command: CommandV7): boolean {
  let encoded: string;
  try {
    encoded = canonicalJson(command);
  } catch {
    return false;
  }
  return queryPlayerCommandsV7(view).some(
    (candidate) => canonicalJson(candidate) === encoded,
  );
}

function commandsSinceLastEndTurnV7(replay: ReplayFileV7 | null): number {
  if (replay === null) return 0;
  let accepted = 0;
  for (let index = replay.commands.length - 1; index >= 0; index -= 1) {
    const command = replay.commands[index];
    if (command?.kind === "END_TURN") break;
    accepted += 1;
  }
  return accepted;
}

function launchFailureV7(
  code: Extract<Ruleset7LaunchResult, { readonly ok: false }>["code"],
): Extract<Ruleset7LaunchResult, { readonly ok: false }> {
  const diagnostic =
    code === "CONTROLLER_DESTROYED"
      ? "The Ruleset 7 browser controller was destroyed."
      : code === "PRESERVED_SAVE_REQUIRES_DELETE"
        ? "The preserved incompatible or corrupt Ruleset 7 save must be explicitly deleted before starting a new match."
        : code === "STORED_MATCH_REQUIRES_REPLACE"
          ? "Starting a new Ruleset 7 match requires explicit replacement of this route's stored match."
          : "Ruleset 7 match generation rejected the setup.";
  return { ok: false, code, diagnostic };
}

function aiFailureV7(
  acceptedCommands: number,
  cancelled: boolean,
  reason: string,
): Extract<Ruleset7AiProgressResult, { readonly ok: false }> {
  return {
    ok: false,
    cancelled,
    acceptedCommands,
    diagnostic: `Ruleset 7 AI progression stopped: ${reason}.`,
  };
}

function safeDiagnosticV7(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown controller error";
}

function freezeBrowserValueV7<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  for (const child of Object.values(value)) freezeBrowserValueV7(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}
