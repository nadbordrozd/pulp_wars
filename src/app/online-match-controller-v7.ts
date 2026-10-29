import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  chooseNormalTurnCommandV7,
  scaleDecisionViewV7,
} from "../ai/index";
import {
  isHumanSeatV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type PlayerViewV7,
} from "../engine/index";
import type { LockstepEventV7, OnlineLockstepV7 } from "../online/lockstep";
import {
  commandIsOfferedV7,
  type Ruleset7AcceptedBoundary,
  type Ruleset7AiPacingGateV7,
  type Ruleset7AiProgressResult,
  type Ruleset7AiProgressScheduler,
  type Ruleset7BrowserSnapshot,
  type Ruleset7DebugExportResult,
  type Ruleset7DispatchResult,
  type Ruleset7LaunchResult,
  type Ruleset7SafeLogExportResult,
} from "./v7-controller";

/**
 * The in-match controller of an online game (`pulp_wars-eqc6.3`,
 * docs/MULTIPLAYER.md section 11). It stands in for the single-player
 * controller behind the same port, so the match screen, its input, its
 * playback and its pacing are the ones a single-player match uses; the
 * game itself is the lockstep client's.
 *
 * - **Drawn for this player**: every view is `viewForV7(state,
 *   myPlayerId)` with `humanPlayerId` set to this player, so "you",
 *   the fog, the turn and the end screen are this player's (the stored
 *   `humanPlayerId` is always seat 0).
 * - **My turn**: the offered commands are this player's; `dispatch`
 *   applies one through `client.submit` and presents it as the human's.
 * - **Everyone else's turn**: no command is offered (look only), the AI
 *   flag is up (the "is moving…" line), and each remote move is presented
 *   as an AI move is, one at a time through the board's pacing gate, so
 *   the board never runs ahead of what the player sees.
 * - **Host-run AI**: on an AI seat's turn the host computes it with the
 *   Normal AI on that seat's view, in slices on the same scheduler as
 *   single player, and submits each command; the guest only plays them
 *   back.
 * - Nothing is autosaved: the match is the stored log. `launch`,
 *   `restart`, `resume`, `returnToMenu` and `deleteStoredSave` refuse.
 */

/** One AI decision in slices: null until the command is chosen. */
export interface OnlineAiWorkV7 {
  runSlice(maxMilliseconds: number): CommandV7 | null;
}

export type OnlineMatchStatusV7 =
  /** The match is being played and this player is in it. */
  | "PLAYING"
  /** This player is out; the others play on. */
  | "WATCHING"
  | "FINISHED"
  | "ABANDONED"
  /** The log does not replay here: the match cannot go on in this tab. */
  | "DESYNCED";

/** What the match screen shows of the online game. */
export interface OnlineMatchSnapshotV7 {
  readonly code: string;
  readonly mySeat: number;
  readonly myPlayerId: PlayerId;
  readonly host: boolean;
  /** By seat: the humans' names, then "AI 1", "AI 2"... */
  readonly names: readonly string[];
  readonly status: OnlineMatchStatusV7;
  /** The seat to move as presented here (null once the match is over). */
  readonly turn: {
    readonly seat: number;
    readonly name: string;
    readonly mine: boolean;
    readonly ai: boolean;
  } | null;
  /** Requests are failing and being retried. */
  readonly reconnecting: boolean;
  /** This player's moves not yet stored. */
  readonly pendingMoves: number;
  /** The other human's name when they left the game, else null. */
  readonly leftBy: string | null;
  /** True when this player left (abandoned) the game. */
  readonly leftByMe: boolean;
  /**
   * A line for a toast; `id` grows with each new one. `dev`: shown only
   * in developer mode (a recovered desync).
   */
  readonly notice: {
    readonly id: number;
    readonly text: string;
    readonly dev: boolean;
  } | null;
  /** Grows each time this player's turn begins (the "Your turn" cue). */
  readonly turnCue: number;
  /**
   * Leaving abandons the game for everyone; false for an out guest, who
   * only stops watching.
   */
  readonly leaveEndsGame: boolean;
}

/** A controller snapshot with the online game's part. */
export type OnlineBrowserSnapshotV7 = Ruleset7BrowserSnapshot & {
  readonly online: OnlineMatchSnapshotV7;
};

export interface OnlineMatchControllerOptionsV7 {
  readonly client: OnlineLockstepV7;
  /** The AI of an AI seat (the host's); the Normal AI by default. */
  readonly createAiWork?: (
    view: PlayerViewV7,
    acceptedThisTurn: number,
  ) => OnlineAiWorkV7;
  /** Yields between AI slices; `setTimeout(0)` by default. */
  readonly aiProgressScheduler?: Ruleset7AiProgressScheduler;
  readonly policySliceMilliseconds?: number;
  readonly readClock?: () => number;
  /** Told what a subscriber threw (the controller swallows it). */
  readonly onSubscriberFailure?: (where: string, error: unknown) => void;
}

/** The Normal AI for one command, as the single-player controller runs it. */
export function normalOnlineAiWorkV7(
  view: PlayerViewV7,
  acceptedThisTurn: number,
  readClock: () => number = defaultReadClockV7,
): OnlineAiWorkV7 {
  const work = new NormalPolicyWorkV7(view, readClock);
  return {
    runSlice(maxMilliseconds) {
      const decision = work.runSlice(maxMilliseconds);
      if (decision === null) return null;
      const command = chooseNormalTurnCommandV7(
        view,
        acceptedThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        decision,
      );
      if (
        command === null ||
        !commandIsOfferedV7(scaleDecisionViewV7(decision) ?? view, command)
      )
        throw new Error("Normal AI produced no exact public command.");
      return command;
    },
  };
}

/** The display name of each seat: the humans', then "AI 1", "AI 2"... */
export function onlineSeatNamesV7(client: OnlineLockstepV7): string[] {
  const seats = client.state.players.map((player) => player.seat);
  const count = Math.max(0, ...seats) + 1;
  return Array.from({ length: count }, (_, seat) =>
    isHumanSeatV7(client.setup, seat)
      ? client.match.seats[seat === 0 ? 0 : 1].name || `Player ${seat + 1}`
      : `AI ${seat - 1}`,
  );
}

interface RemoteMoveV7 {
  readonly before: GameStateV7;
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
}

interface AiRunV7 {
  seat: number;
  round: number;
  accepted: number;
  work: OnlineAiWorkV7 | null;
  cancel: (() => void) | null;
  done: boolean;
}

type ProgressWaiterV7 = (result: Ruleset7AiProgressResult) => void;

const defaultSchedulerV7: Ruleset7AiProgressScheduler = (resume) => {
  const timer = setTimeout(resume, 0);
  return () => clearTimeout(timer);
};

const defaultReadClockV7 = (): number =>
  globalThis.performance?.now() ?? Date.now();

export class OnlineMatchControllerV7 {
  readonly #client: OnlineLockstepV7;
  readonly #viewerId: PlayerId;
  readonly #mySeat: number;
  readonly #createAiWork: (
    view: PlayerViewV7,
    acceptedThisTurn: number,
  ) => OnlineAiWorkV7;
  readonly #scheduler: Ruleset7AiProgressScheduler;
  readonly #sliceMilliseconds: number;
  readonly #onSubscriberFailure:
    ((where: string, error: unknown) => void) | null;
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  readonly #boundarySubscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  readonly #views = new WeakMap<GameStateV7, PlayerViewV7>();
  readonly #unlisten: () => void;
  /** The game as presented here; it lags the client by `#queue`. */
  #state: GameStateV7;
  #queue: RemoteMoveV7[] = [];
  #names: readonly string[];
  #gate: Ruleset7AiPacingGateV7 | null = null;
  /** A remote move held by the pacing gate. */
  #gateWait: { resume: () => void } | null = null;
  #fastForward = false;
  #ai: AiRunV7 | null = null;
  #waiters: ProgressWaiterV7[] = [];
  #reconnecting = false;
  #abandoned = false;
  #leftByMe = false;
  #fatal = false;
  #notice: OnlineMatchSnapshotV7["notice"] = null;
  #turnCue = 0;
  #lastMyTurnKey: string | null = null;
  #diagnostic: string | null = null;
  #destroyed = false;

  constructor(options: OnlineMatchControllerOptionsV7) {
    const client = options.client;
    const seat = client.mySeat;
    if (seat === null) throw new RangeError("Not seated in this match.");
    this.#client = client;
    this.#mySeat = seat;
    this.#viewerId = (seat + 1) as PlayerId;
    const readClock = options.readClock ?? defaultReadClockV7;
    this.#createAiWork =
      options.createAiWork ??
      ((view, accepted) => normalOnlineAiWorkV7(view, accepted, readClock));
    this.#scheduler = options.aiProgressScheduler ?? defaultSchedulerV7;
    this.#sliceMilliseconds = options.policySliceMilliseconds ?? 4;
    this.#onSubscriberFailure = options.onSubscriberFailure ?? null;
    this.#state = client.state;
    this.#names = onlineSeatNamesV7(client);
    this.#fatal = client.desynced;
    this.#abandoned = client.match.status === "ABANDONED";
    this.#unlisten = client.on((event) => this.#onEvent(event));
    this.#noteMyTurn();
  }

  /** The lockstep client's code (the room code). */
  get code(): string {
    return this.#client.code;
  }

  /** Follows the match live and starts whatever is due (the host's AI). */
  start(): void {
    if (this.#destroyed) return;
    this.#client.start();
    this.#pump();
  }

  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.snapshot());
    return () => this.#subscribers.delete(subscriber);
  }

  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    if (this.#destroyed) return () => {};
    this.#boundarySubscribers.add(subscriber);
    return () => this.#boundarySubscribers.delete(subscriber);
  }

  snapshot(): OnlineBrowserSnapshotV7 {
    const view = this.#viewOf(this.#state);
    const myTurn = this.#myHumanTurn();
    const over = this.#state.outcome !== null;
    const stopped = this.#abandoned || this.#fatal;
    const offeredCommands =
      myTurn && !over && !stopped ? queryPlayerCommandsV7(view) : [];
    return Object.freeze({
      phase: over ? ("COMPLETE" as const) : ("ACTIVE" as const),
      view,
      offeredCommands,
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: this.#diagnostic,
      transitioning: false,
      ai: Object.freeze({
        active: !over && !stopped && !myTurn,
        fastForward: this.#fastForward,
        policySlices: 0,
        acceptedCommands: 0,
        lastSliceMilliseconds: 0,
        maximumSliceMilliseconds: 0,
      }),
      online: this.#onlineSnapshot(),
    });
  }

  dispatch(command: CommandV7): Promise<Ruleset7DispatchResult> {
    if (this.#destroyed)
      return Promise.resolve({
        accepted: false,
        reason: "CONTROLLER_DESTROYED",
      });
    if (
      this.#state.outcome !== null ||
      this.#abandoned ||
      this.#fatal ||
      !this.#caughtUp()
    )
      return Promise.resolve({ accepted: false, reason: "NO_ACTIVE_MATCH" });
    if (!this.#myHumanTurn())
      return Promise.resolve({ accepted: false, reason: "NOT_HUMAN_TURN" });
    const beforeView = this.#viewOf(this.#state);
    if (!commandIsOfferedV7(beforeView, command))
      return Promise.resolve({ accepted: false, reason: "NOT_OFFERED" });
    const before = this.#state;
    const result = this.#client.submit(command);
    if (!result.accepted)
      return Promise.resolve({
        accepted: false,
        reason: "ENGINE_REJECTED",
        ...(result.error === undefined ? {} : { error: result.error }),
      });
    const boundary = this.#present(
      before,
      result.state,
      result.events,
      "HUMAN",
    );
    this.#emit();
    this.#pump();
    return Promise.resolve(
      Object.freeze({
        accepted: true as const,
        beforeView: boundary.beforeView,
        afterView: boundary.afterView,
        playerEvents: boundary.playerEvents,
      }),
    );
  }

  /**
   * Resolves when it is this player's turn again (or the match ends, is
   * left, or cannot go on). Remote moves and the host's AI are presented
   * meanwhile; the AI runs by itself, so this only waits.
   */
  progressAiTurns(): Promise<Ruleset7AiProgressResult> {
    if (this.#destroyed)
      return Promise.resolve(progressFailureV7(true, "destroyed"));
    const done = this.#progressResult();
    if (done !== null) return Promise.resolve(done);
    return new Promise((resolve) => {
      this.#waiters.push(resolve);
      this.#pump();
    });
  }

  setFastForward(active: boolean): void {
    if (this.#destroyed || this.#fastForward === active) return;
    this.#fastForward = active;
    if (active) this.#gateWait?.resume();
    this.#emit();
  }

  setAiPacingGate(gate: Ruleset7AiPacingGateV7 | null): void {
    this.#gate = gate;
    if (gate === null) this.#gateWait?.resume();
  }

  /** Gives the game up for everyone (`ABANDONED`); false when it failed. */
  async abandon(): Promise<boolean> {
    if (this.#destroyed) return false;
    const result = await this.#client.abandon();
    if (!result.ok) return false;
    this.#leftByMe = true;
    this.#abandoned = true;
    this.#stopAi();
    this.#settleWaiters();
    this.#emit();
    return true;
  }

  /** Reloading is the way out of a fatal desync; this only says so. */
  get desynced(): boolean {
    return this.#fatal;
  }

  launch(): Promise<Ruleset7LaunchResult> {
    return Promise.resolve({
      ok: false,
      code: "STORED_MATCH_REQUIRES_REPLACE",
      diagnostic: "An online game is open.",
    });
  }

  restart(): Promise<Ruleset7LaunchResult> {
    return this.launch();
  }

  resume(): Promise<boolean> {
    return Promise.resolve(false);
  }

  returnToMenu(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /** An online game is never in the autosave slot: nothing is deleted. */
  deleteStoredSave(): Promise<boolean> {
    return Promise.resolve(false);
  }

  exportSafeLog(): Ruleset7SafeLogExportResult | null {
    return null;
  }

  exportDebugBundle(): Ruleset7DebugExportResult {
    return { ok: false, reason: "NO_ACTIVE_MATCH" };
  }

  /** Stops following the match (the screen is closing). */
  destroy(): void {
    if (this.#destroyed) return;
    this.#stopAi();
    const waiters = this.#waiters;
    this.#waiters = [];
    this.#destroyed = true;
    for (const resolve of waiters) resolve(progressFailureV7(true, "closed"));
    this.#gateWait = null;
    this.#unlisten();
    this.#client.stop();
    this.#subscribers.clear();
    this.#boundarySubscribers.clear();
  }

  // -------------------------------------------------------------------

  #onEvent(event: LockstepEventV7): void {
    if (this.#destroyed) return;
    switch (event.kind) {
      case "COMMAND_APPLIED": {
        // Own submits are presented where they are made.
        if (event.local) return;
        const before = this.#queue.at(-1)?.state ?? this.#state;
        this.#queue.push({ before, state: event.state, events: event.events });
        this.#pump();
        return;
      }
      case "TURN":
        this.#pump();
        return;
      case "MOVE_REJECTED":
        this.#say("That move didn't reach the game. Back in step now.");
        return;
      case "RESYNCED":
        // The log was replayed from the setup: what is queued is stale.
        this.#queue = [];
        this.#gateWait = null;
        this.#stopAi();
        this.#state = this.#client.state;
        this.#fatal = this.#client.desynced;
        this.#emit();
        this.#pump();
        return;
      case "DESYNC":
        if (!event.recovered) {
          this.#fatal = true;
          this.#stopAi();
          this.#settleWaiters();
          this.#emit();
        } else
          this.#say(
            `Resynced at move ${event.index} (${event.reason}, ${event.blame ?? "?"}).`,
            true,
          );
        return;
      case "MATCH_ABANDONED":
        this.#abandoned = true;
        this.#stopAi();
        this.#settleWaiters();
        this.#emit();
        return;
      case "CONNECTION":
        if (this.#reconnecting === !event.ok) return;
        this.#reconnecting = !event.ok;
        this.#emit();
        return;
      case "MATCH_UPDATED":
        this.#names = onlineSeatNamesV7(this.#client);
        return;
      case "MATCH_FINISHED":
        // Presented when its move is (the state's outcome).
        return;
    }
  }

  /**
   * Moves the presentation on: the next held remote move (through the
   * pacing gate), then, caught up, whatever is due: the host's AI, or the
   * waiters when it is this player's turn.
   */
  #pump(): void {
    while (!this.#destroyed && this.#gateWait === null) {
      const next = this.#queue[0];
      if (next !== undefined) {
        const wait =
          this.#fastForward || this.#gate === null
            ? null
            : safeGate(this.#gate);
        if (wait !== null) {
          let settled = false;
          const resume = (): void => {
            if (settled) return;
            settled = true;
            if (this.#gateWait === holder) this.#gateWait = null;
            this.#pump();
          };
          const holder = { resume };
          this.#gateWait = holder;
          wait.then(resume, resume);
          return;
        }
        this.#queue.shift();
        this.#present(next.before, next.state, next.events, "AI");
        this.#emit();
        continue;
      }
      if (this.#state !== this.#client.state) {
        // Nothing queued yet not the client's game: take it as it is.
        this.#state = this.#client.state;
        this.#emit();
      }
      this.#noteMyTurn();
      if (this.#client.aiTurn && !this.#abandoned && !this.#fatal) {
        this.#startAi();
        return;
      }
      this.#settleWaiters();
      return;
    }
  }

  #caughtUp(): boolean {
    return this.#queue.length === 0 && this.#state === this.#client.state;
  }

  #myHumanTurn(): boolean {
    return (
      this.#caughtUp() &&
      this.#client.canAct &&
      !this.#client.aiTurn &&
      !this.#abandoned &&
      !this.#fatal
    );
  }

  #progressResult(): Ruleset7AiProgressResult | null {
    if (this.#abandoned || this.#fatal)
      return progressFailureV7(true, "the match stopped");
    if (!this.#caughtUp()) return null;
    if (this.#state.outcome !== null || this.#myHumanTurn())
      return {
        ok: true,
        acceptedCommands: 0,
        playerEventBatches: [],
        view: this.#viewOf(this.#state),
        policySlices: 0,
        maximumSliceMilliseconds: 0,
      };
    return null;
  }

  #settleWaiters(): void {
    if (this.#waiters.length === 0) return;
    const result = this.#progressResult();
    if (result === null) return;
    if (result.ok) this.#fastForward = false;
    const waiters = this.#waiters;
    this.#waiters = [];
    for (const resolve of waiters) resolve(result);
    this.#emit();
  }

  /** Counts the start of each of this player's turns (the cue). */
  #noteMyTurn(): void {
    if (!this.#myHumanTurn() || this.#state.outcome !== null) return;
    const key = `${this.#state.round}:${this.#client.activeSeat}`;
    if (key === this.#lastMyTurnKey) return;
    this.#lastMyTurnKey = key;
    this.#turnCue += 1;
  }

  #startAi(): void {
    if (this.#ai !== null && !this.#ai.done) return;
    const run: AiRunV7 = {
      seat: this.#client.activeSeat,
      round: this.#state.round,
      accepted: 0,
      work: null,
      cancel: null,
      done: false,
    };
    this.#ai = run;
    this.#emit();
    this.#scheduleAi(run);
  }

  #stopAi(): void {
    const run = this.#ai;
    if (run === null) return;
    run.done = true;
    run.cancel?.();
    run.cancel = null;
    this.#ai = null;
  }

  #scheduleAi(run: AiRunV7): void {
    if (run.done || this.#destroyed) return;
    // Calm playback: before each new command the AI waits while the board
    // is behind, as in single player.
    if (run.work === null && !this.#fastForward && this.#gate !== null) {
      const wait = safeGate(this.#gate);
      if (wait !== null) {
        let settled = false;
        const resume = (): void => {
          if (settled) return;
          settled = true;
          if (this.#gateWait === holder) this.#gateWait = null;
          run.cancel = null;
          this.#scheduleSlice(run);
        };
        const holder = { resume };
        this.#gateWait = holder;
        run.cancel = () => {
          settled = true;
          if (this.#gateWait === holder) this.#gateWait = null;
        };
        wait.then(resume, resume);
        return;
      }
    }
    this.#scheduleSlice(run);
  }

  #scheduleSlice(run: AiRunV7): void {
    if (run.done || this.#destroyed) return;
    try {
      const cancel = this.#scheduler(() => {
        run.cancel = null;
        this.#runAiSlice(run);
      });
      run.cancel = typeof cancel === "function" ? cancel : null;
    } catch (error) {
      this.#failAi(run, error);
    }
  }

  #runAiSlice(run: AiRunV7): void {
    if (run.done || this.#destroyed || this.#ai !== run) return;
    if (
      !this.#client.aiTurn ||
      !this.#caughtUp() ||
      this.#abandoned ||
      this.#fatal
    ) {
      run.done = true;
      this.#ai = null;
      this.#pump();
      return;
    }
    const seat = this.#client.activeSeat;
    if (seat !== run.seat || this.#state.round !== run.round) {
      run.seat = seat;
      run.round = this.#state.round;
      run.accepted = 0;
      run.work = null;
    }
    try {
      if (run.accepted >= NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7)
        throw new Error("AI exceeded its 128-command turn budget.");
      if (run.work === null) {
        const actor = this.#state.turnOrder[this.#state.activeSeatIndex];
        if (actor === undefined)
          throw new Error("The active player is missing.");
        run.work = this.#createAiWork(
          viewForV7(this.#state, actor),
          run.accepted,
        );
      }
      const command = run.work.runSlice(this.#sliceMilliseconds);
      if (command === null) {
        this.#scheduleSlice(run);
        return;
      }
      this.#submitAi(run, command);
    } catch (error) {
      this.#failAi(run, error);
    }
  }

  #submitAi(run: AiRunV7, command: CommandV7): void {
    const before = this.#state;
    const result = this.#client.submit(command);
    if (!result.accepted)
      throw new Error(
        `Normal AI command rejected: ${result.error?.code ?? result.reason}.`,
      );
    run.accepted += 1;
    run.work = null;
    this.#present(before, result.state, result.events, "AI");
    this.#emit();
    if (this.#state.outcome !== null || !this.#client.aiTurn) {
      run.done = true;
      this.#ai = null;
      this.#pump();
      return;
    }
    this.#scheduleAi(run);
  }

  /**
   * An AI that cannot go on ends its seat's turn rather than stall both
   * players; if even that is refused, the screen shows the failure.
   */
  #failAi(run: AiRunV7, error: unknown): void {
    if (run.done) return;
    const diagnostic = error instanceof Error ? error.message : String(error);
    run.work = null;
    if (this.#client.aiTurn && this.#caughtUp()) {
      const before = this.#state;
      const ended = this.#client.submit({ kind: "END_TURN" });
      if (ended.accepted) {
        this.#present(before, ended.state, ended.events, "AI");
        this.#say("An AI player got stuck and ended its turn.", true);
        this.#emit();
        if (this.#client.aiTurn && this.#state.outcome === null) {
          run.accepted = 0;
          this.#scheduleAi(run);
          return;
        }
        run.done = true;
        this.#ai = null;
        this.#pump();
        return;
      }
    }
    run.done = true;
    this.#ai = null;
    this.#diagnostic = diagnostic;
    this.#emit();
  }

  /** Makes `after` the presented game and tells the boundary's subscribers. */
  #present(
    before: GameStateV7,
    after: GameStateV7,
    events: readonly DomainEventV7[],
    actor: "HUMAN" | "AI",
  ): Ruleset7AcceptedBoundary {
    const boundary: Ruleset7AcceptedBoundary = Object.freeze({
      actor,
      beforeView: this.#viewOf(before),
      afterView: this.#viewOf(after),
      playerEvents: projectEventsV7(before, after, this.#viewerId, events),
    });
    this.#state = after;
    for (const subscriber of [...this.#boundarySubscribers]) {
      try {
        subscriber(boundary);
      } catch (error) {
        this.#report("a boundary subscriber", error);
      }
    }
    return boundary;
  }

  /** The view of this player, with `humanPlayerId` this player. */
  #viewOf(state: GameStateV7): PlayerViewV7 {
    const cached = this.#views.get(state);
    if (cached !== undefined) return cached;
    const base = viewForV7(state, this.#viewerId);
    const view =
      base.humanPlayerId === this.#viewerId
        ? base
        : Object.freeze({ ...base, humanPlayerId: this.#viewerId });
    this.#views.set(state, view);
    return view;
  }

  #onlineSnapshot(): OnlineMatchSnapshotV7 {
    const state = this.#state;
    const me = state.players.find((player) => player.id === this.#viewerId);
    const over = state.outcome !== null;
    const status: OnlineMatchStatusV7 = this.#fatal
      ? "DESYNCED"
      : over
        ? "FINISHED"
        : this.#abandoned
          ? "ABANDONED"
          : me?.status === "ELIMINATED"
            ? "WATCHING"
            : "PLAYING";
    const activeId = state.turnOrder[state.activeSeatIndex];
    const active = state.players.find((player) => player.id === activeId);
    const otherHuman = this.#names[this.#mySeat === 0 ? 1 : 0] ?? "Your friend";
    const host = this.#mySeat === 0;
    const aiLeft = state.players.some(
      (player) =>
        player.status !== "ELIMINATED" &&
        !isHumanSeatV7(this.#client.setup, player.seat),
    );
    return Object.freeze({
      code: this.#client.code,
      mySeat: this.#mySeat,
      myPlayerId: this.#viewerId,
      host,
      names: this.#names,
      status,
      turn:
        over || active === undefined
          ? null
          : Object.freeze({
              seat: active.seat,
              name: this.#names[active.seat] ?? `Player ${active.seat + 1}`,
              mine: active.id === this.#viewerId,
              ai: !isHumanSeatV7(this.#client.setup, active.seat),
            }),
      reconnecting: this.#reconnecting,
      pendingMoves: this.#client.pendingMoves,
      leftBy: this.#abandoned && !this.#leftByMe ? otherHuman : null,
      leftByMe: this.#leftByMe,
      notice: this.#notice,
      turnCue: this.#turnCue,
      // An out guest only stops watching; anyone else ends the game (the
      // host also runs the AI seats).
      leaveEndsGame: status !== "WATCHING" || (host && aiLeft),
    });
  }

  #say(text: string, dev = false): void {
    this.#notice = Object.freeze({
      id: (this.#notice?.id ?? 0) + 1,
      text,
      dev,
    });
    this.#emit();
  }

  #report(where: string, error: unknown): void {
    try {
      this.#onSubscriberFailure?.(where, error);
    } catch {
      // Reporting never disturbs the controller.
    }
  }

  #emit(): void {
    if (this.#destroyed) return;
    this.#noteMyTurn();
    if (this.#subscribers.size === 0) return;
    const snapshot = this.snapshot();
    for (const subscriber of [...this.#subscribers]) {
      try {
        subscriber(snapshot);
      } catch (error) {
        this.#report("a game update subscriber", error);
      }
    }
  }
}

function safeGate(gate: Ruleset7AiPacingGateV7): PromiseLike<void> | null {
  try {
    return gate();
  } catch {
    return null;
  }
}

function progressFailureV7(
  cancelled: boolean,
  reason: string,
): Extract<Ruleset7AiProgressResult, { readonly ok: false }> {
  return {
    ok: false,
    cancelled,
    acceptedCommands: 0,
    diagnostic: `Online play stopped: ${reason}.`,
  };
}
