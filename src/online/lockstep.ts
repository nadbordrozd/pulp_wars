import type { PlayerId } from "../engine/model/ids";
import { canonicalHash, canonicalJson } from "../engine/replay/canonical";
import { parseCommandV7, type CommandV7 } from "../engine/v7/commands";
import type { DomainEventV7 } from "../engine/v7/events";
import {
  applyCommandV7,
  createPlayableGameV7,
  type RuleErrorV7,
} from "../engine/v7/reducer";
import {
  isHumanSeatV7,
  type GameStateV7,
  type MatchOutcomeV7,
  type MatchSetupV7,
} from "../engine/v7/types";
import { FIRESTORE_POLL_VISIBLE_MS_V7 } from "./firestore-transport";
import {
  drivenSeatsOfUidV7,
  onlineSeatOfUidV7,
  parseOnlineMatchV7,
  type OnlineMatchV7,
} from "./match";
import {
  onlineErrorV7,
  onlineOkV7,
  type OnlineAppendV7,
  type OnlineErrorV7,
  type OnlineMatchRecordV7,
  type OnlineMoveRecordV7,
  type OnlineResultV7,
  type OnlineTransportV7,
} from "./types";

/**
 * The lockstep client (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md section 7).
 * A match is its setup plus the ordered move log, as a replay is
 * (`src/engine/v7/replay.ts`); every browser runs the reducer. The client
 *
 * - replays the log from the setup when it opens (resume after a reload);
 * - applies its own seats' commands at once (`submit`) and appends them in
 *   order, each with the hash of the state after it;
 * - applies every other seat's moves through `applyCommandV7`, in index
 *   order, whatever order or how often the transport delivers them, and
 *   checks each one's hash;
 * - on a mismatch (a desync) refetches the whole log and replays it from
 *   the setup, checking every hash; if the replay still disagrees the
 *   match is stuck at the last good move and says so.
 *
 * It drives the seats whose driver is this uid: its own human seat, and,
 * for the host, every AI seat. Computing the AI's commands is the in-match
 * screen's (`pulp_wars-eqc6.3`): on a `TURN` event with `mine && ai` it
 * runs the AI and `submit`s each command like a person's.
 */

export type LockstepEventV7 =
  /** A command was applied; `local` for this client's own submits. */
  | {
      readonly kind: "COMMAND_APPLIED";
      readonly index: number;
      readonly seat: number;
      readonly command: CommandV7;
      readonly events: readonly DomainEventV7[];
      readonly state: GameStateV7;
      readonly local: boolean;
    }
  /**
   * Whose turn it is changed (and once on `start`). `mine`: this client
   * drives the seat; `ai`: an AI seat. Not mine: "waiting for seat X".
   */
  | {
      readonly kind: "TURN";
      readonly seat: number;
      readonly playerId: PlayerId;
      readonly mine: boolean;
      readonly ai: boolean;
    }
  /** The store refused one of this client's moves; it resynchronizes. */
  | {
      readonly kind: "MOVE_REJECTED";
      readonly index: number;
      readonly error: OnlineErrorV7;
    }
  /**
   * A move did not reproduce (wrong hash, refused command, wrong seat) and
   * the client replayed the whole log from the setup. `recovered`: play
   * goes on, on the log's commands; `blame` says whose state was off:
   * `LOCAL` (this client's, now repaired) or `AUTHOR` (the move's author
   * logged a hash the replay does not give: its game may be off until it
   * repairs itself; its later moves are applied unchecked meanwhile, see
   * `verified`). Not `recovered`: the log's commands do not replay; the
   * match is stuck at `index` (`desynced`).
   */
  | {
      readonly kind: "DESYNC";
      readonly index: number;
      readonly reason: LockstepFaultV7;
      readonly recovered: boolean;
      readonly blame: "LOCAL" | "AUTHOR" | null;
    }
  /** The log was refetched and replayed from the setup. */
  | { readonly kind: "RESYNCED"; readonly moveCount: number }
  | { readonly kind: "MATCH_FINISHED"; readonly outcome: MatchOutcomeV7 }
  | { readonly kind: "MATCH_ABANDONED" }
  /** The stored match changed (seats, status, move count). */
  | { readonly kind: "MATCH_UPDATED"; readonly match: OnlineMatchV7 }
  /** Requests failing (`ok: false`, retrying) or working again. */
  | {
      readonly kind: "CONNECTION";
      readonly ok: boolean;
      readonly error: OnlineErrorV7 | null;
    };

export type LockstepFaultV7 =
  "HASH_MISMATCH" | "REJECTED" | "WRONG_SEAT" | "BAD_COMMAND" | "CONFLICT";

export type LockstepSubmitResultV7 =
  | {
      readonly accepted: true;
      readonly index: number;
      readonly state: GameStateV7;
      readonly events: readonly DomainEventV7[];
    }
  | {
      readonly accepted: false;
      readonly reason:
        "NOT_YOUR_TURN" | "NOT_ACTIVE" | "DESYNCED" | "MATCH_OVER" | "REJECTED";
      readonly error?: RuleErrorV7;
    };

export interface OnlineLockstepOptionsV7 {
  readonly transport: OnlineTransportV7;
  readonly code: string;
  /** This browser's uid (`transport.signIn()`). */
  readonly uid: string;
  /** The state hash; `canonicalHash`. Tests inject another to desync. */
  readonly hashState?: (state: GameStateV7) => string;
  /** Waits between append retries after a network failure, ms. */
  readonly retryDelaysMs?: readonly number[];
  /** Poll interval while this client is to move (nothing else can). */
  readonly ownTurnPollMs?: number;
  /** Poll interval while waiting for someone else. */
  readonly waitingPollMs?: number;
}

export const LOCKSTEP_RETRY_DELAYS_MS_V7 = Object.freeze([
  1_000, 2_000, 4_000, 8_000, 15_000,
]);
export const LOCKSTEP_OWN_TURN_POLL_MS_V7 = 10_000;

/** One move applied to a state. */
export type OnlineMoveApplicationV7 =
  | {
      readonly ok: true;
      readonly state: GameStateV7;
      readonly events: readonly DomainEventV7[];
      readonly command: CommandV7;
      readonly hash: string | null;
    }
  | { readonly ok: false; readonly reason: LockstepFaultV7 };

/** The seat of the player whose turn it is. */
export function activeSeatOfStateV7(state: GameStateV7): number {
  const active = state.turnOrder[state.activeSeatIndex];
  const player = state.players.find((item) => item.id === active);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player.seat;
}

/**
 * Applies one logged move: it must be the active seat's, parse, be
 * accepted, and (when `verify`) reproduce the logged hash.
 */
export function applyOnlineMoveV7(
  state: GameStateV7,
  move: OnlineMoveRecordV7,
  hashState: (state: GameStateV7) => string,
  verify: boolean,
): OnlineMoveApplicationV7 {
  if (move.seat !== activeSeatOfStateV7(state))
    return { ok: false, reason: "WRONG_SEAT" };
  let raw: unknown;
  try {
    raw = JSON.parse(move.commandJson);
  } catch {
    return { ok: false, reason: "BAD_COMMAND" };
  }
  const parsed = parseCommandV7(raw);
  if (!parsed.ok) return { ok: false, reason: "BAD_COMMAND" };
  const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
  const result = applyCommandV7(state, actor, parsed.value);
  if (!result.accepted) return { ok: false, reason: "REJECTED" };
  const hash = verify ? hashState(result.state) : null;
  if (hash !== null && hash !== move.stateHash)
    return { ok: false, reason: "HASH_MISMATCH" };
  return {
    ok: true,
    state: result.state,
    events: result.events,
    command: parsed.value,
    hash,
  };
}

export type OnlineReplayResultV7 =
  | {
      readonly ok: true;
      readonly state: GameStateV7;
      /** The logged hash of each applied move. */
      readonly hashes: readonly string[];
      /** Checked moves whose logged hash this replay did not reproduce. */
      readonly mismatches: readonly number[];
    }
  | {
      readonly ok: false;
      /** The first move that did not reproduce. */
      readonly index: number;
      readonly reason: LockstepFaultV7 | "CREATE_FAILED";
      /** The state before that move (null when the setup does not start). */
      readonly state: GameStateV7 | null;
      readonly hashes: readonly string[];
      readonly mismatches: readonly number[];
    };

/** Which moves a replay hashes: every one, the last, or these indices. */
export type OnlineReplayCheckV7 = "ALL" | "LAST" | readonly number[];

/**
 * Replays a log from its setup, hashing the moves `check` names. Strict
 * (the default) stops at the first hash that does not reproduce; tolerant
 * notes it in `mismatches` and plays on, since the commands, not the
 * hashes, are the match: a client whose own state went wrong logs wrong
 * hashes for its moves, and every other client still rebuilds the true
 * game from the commands. A command that is refused, out of turn, or
 * unreadable always stops it.
 */
export function replayOnlineLogV7(
  setup: MatchSetupV7,
  moves: readonly OnlineMoveRecordV7[],
  hashState: (state: GameStateV7) => string = canonicalHash,
  check: OnlineReplayCheckV7 = "ALL",
  tolerant = false,
): OnlineReplayResultV7 {
  const created = createPlayableGameV7(setup);
  if (!created.ok)
    return {
      ok: false,
      index: 0,
      reason: "CREATE_FAILED",
      state: null,
      hashes: [],
      mismatches: [],
    };
  let state = created.state;
  const hashes: string[] = [];
  const mismatches: number[] = [];
  for (const [index, move] of moves.entries()) {
    const checked =
      check === "ALL" ||
      (check === "LAST" ? index === moves.length - 1 : check.includes(index));
    const applied =
      move.index === index
        ? applyOnlineMoveV7(state, move, hashState, false)
        : ({ ok: false, reason: "CONFLICT" } as const);
    if (!applied.ok)
      return {
        ok: false,
        index,
        reason: applied.reason,
        state,
        hashes,
        mismatches,
      };
    const hash = checked ? hashState(applied.state) : null;
    if (hash !== null && hash !== move.stateHash) {
      if (!tolerant)
        return {
          ok: false,
          index,
          reason: "HASH_MISMATCH",
          state,
          hashes,
          mismatches: [index],
        };
      mismatches.push(index);
    }
    state = applied.state;
    hashes.push(move.stateHash);
  }
  return { ok: true, state, hashes, mismatches };
}

export class OnlineLockstepV7 {
  readonly code: string;
  readonly uid: string;
  readonly setup: MatchSetupV7;
  readonly #transport: OnlineTransportV7;
  readonly #hashState: (state: GameStateV7) => string;
  readonly #retryDelays: readonly number[];
  readonly #ownTurnPollMs: number;
  readonly #waitingPollMs: number;
  #match: OnlineMatchV7;
  #state: GameStateV7;
  #hashes: string[];
  #outbox: OnlineAppendV7[] = [];
  #desyncedAt: number | null;
  /** Drivers whose logged hashes the replay did not reproduce. */
  #untrusted = new Set<string>();
  #listeners = new Set<(event: LockstepEventV7) => void>();
  #stopWatch: (() => void) | null = null;
  #flushing: Promise<void> | null = null;
  #work: Promise<void> = Promise.resolve();
  #lastTurn: string | null = null;
  #finishedSent = false;
  #abandonedSent = false;
  #failing = false;
  #stopped = false;

  private constructor(
    options: OnlineLockstepOptionsV7,
    match: OnlineMatchV7,
    setup: MatchSetupV7,
    replay: OnlineReplayResultV7 & { readonly state: GameStateV7 },
    untrusted: readonly string[],
  ) {
    this.code = options.code;
    this.uid = options.uid;
    this.setup = setup;
    this.#transport = options.transport;
    this.#hashState = options.hashState ?? canonicalHash;
    this.#retryDelays = options.retryDelaysMs ?? LOCKSTEP_RETRY_DELAYS_MS_V7;
    this.#ownTurnPollMs = options.ownTurnPollMs ?? LOCKSTEP_OWN_TURN_POLL_MS_V7;
    this.#waitingPollMs = options.waitingPollMs ?? FIRESTORE_POLL_VISIBLE_MS_V7;
    this.#match = match;
    this.#state = replay.state;
    this.#hashes = [...replay.hashes];
    this.#desyncedAt = replay.ok ? null : replay.index;
    for (const uid of untrusted) this.#untrusted.add(uid);
  }

  /**
   * Opens a started match: reads it, refuses another build's
   * (`RULESET_MISMATCH`) or a lobby (`NOT_ACTIVE`), and replays its log.
   * Only the last move's hash is checked (a long log opens fast); if it
   * does not reproduce, the game is still the commands' and that move's
   * author is unverified. A log whose commands do not replay opens
   * `desynced` at its last good move. Call {@link start} to follow it live.
   */
  static async open(
    options: OnlineLockstepOptionsV7,
  ): Promise<OnlineResultV7<OnlineLockstepV7>> {
    const read = await options.transport.getMatch(options.code);
    if (!read.ok) return read;
    if (read.value === null)
      return onlineErrorV7("NOT_FOUND", "No such match.");
    const match = parseOnlineMatchV7(read.value);
    if (!match.compatible)
      return onlineErrorV7(
        "RULESET_MISMATCH",
        `The match was made by another version (${match.rulesetId}).`,
      );
    if (match.status === "LOBBY")
      return onlineErrorV7("NOT_ACTIVE", "The match has not started yet.");
    if (match.setup === null)
      return onlineErrorV7("INVALID", "The match's setup is unreadable.");
    const moves = await options.transport.getMoves(
      options.code,
      0,
      match.moveCount,
    );
    if (!moves.ok) return moves;
    const replay = replayOnlineLogV7(
      match.setup,
      moves.value,
      options.hashState ?? canonicalHash,
      "LAST",
      true,
    );
    if (replay.state === null)
      return onlineErrorV7("INVALID", "The match's setup does not start.");
    const untrusted = replay.mismatches.flatMap(
      (index) => moves.value[index]?.uid ?? [],
    );
    return onlineOkV7(
      new OnlineLockstepV7(
        options,
        match,
        match.setup,
        { ...replay, state: replay.state },
        untrusted,
      ),
    );
  }

  /** The latest stored match. */
  get match(): OnlineMatchV7 {
    return this.#match;
  }
  /** The game as this client has applied it. */
  get state(): GameStateV7 {
    return this.#state;
  }
  /** Moves applied here (this client's unsent ones included). */
  get moveCount(): number {
    return this.#hashes.length;
  }
  /** This client's moves not yet stored. */
  get pendingMoves(): number {
    return this.#outbox.length;
  }
  /** This uid's human seat (0 host, 1 guest), or null for a spectator. */
  get mySeat(): number | null {
    return onlineSeatOfUidV7(this.#match, this.uid);
  }
  /** The player of {@link mySeat} (seat + 1), or null. */
  get myPlayerId(): PlayerId | null {
    const seat = this.mySeat;
    return seat === null ? null : ((seat + 1) as PlayerId);
  }
  /** The seats this client appends for: its own, and the AI's for the host. */
  get drivenSeats(): readonly number[] {
    return drivenSeatsOfUidV7(this.#match, this.uid);
  }
  get activeSeat(): number {
    return activeSeatOfStateV7(this.#state);
  }
  /**
   * False while some driver's logged hashes disagree with this client's
   * replay of the log (a `DESYNC` blamed on its `AUTHOR`): their moves
   * are applied unchecked until one of their hashes agrees again. The
   * screen may show "out of sync" meanwhile.
   */
  get verified(): boolean {
    return this.#untrusted.size === 0;
  }
  /** True after an unrecoverable desync (the log does not reproduce). */
  get desynced(): boolean {
    return this.#desyncedAt !== null;
  }
  /** Whether the game can still be played (started, not over, not stuck). */
  get playable(): boolean {
    return (
      this.#state.outcome === null &&
      this.#desyncedAt === null &&
      this.#match.status === "ACTIVE"
    );
  }
  /** Whether this client is to move now. */
  get canAct(): boolean {
    return this.playable && this.drivenSeats.includes(this.activeSeat);
  }
  /** Whether this client is to move an AI seat now (the host's job). */
  get aiTurn(): boolean {
    return this.canAct && !isHumanSeatV7(this.setup, this.activeSeat);
  }
  /** The seat everyone waits for when this client is not to move, else null. */
  get waitingFor(): number | null {
    return this.playable && !this.canAct ? this.activeSeat : null;
  }

  on(listener: (event: LockstepEventV7) => void): () => void {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }

  /** Follows the match live (the transport's watch). */
  start(): void {
    if (this.#stopWatch !== null || this.#stopped) return;
    this.#emitTurn(true);
    // A match that is already over says so once, to the first listeners.
    this.#finish();
    this.#stopWatch = this.#transport.watchMatch(
      this.code,
      (record, error) => {
        if (record === null) {
          if (error !== null) this.#connection(false, error);
          return;
        }
        this.#connection(true, null);
        this.#enqueue(() => this.#onRecord(record));
      },
      {
        intervalMs: () =>
          this.canAct ? this.#ownTurnPollMs : this.#waitingPollMs,
      },
    );
  }

  /**
   * Stops following, for good (the screen is closing): no more polls, and
   * appends still failing stop retrying. Open the match again to resume.
   */
  stop(): void {
    this.#stopped = true;
    this.#stopWatch?.();
    this.#stopWatch = null;
  }

  /** Reads the match once (as a watch tick would) and applies new moves. */
  refresh(): Promise<void> {
    return this.#enqueue(async () => {
      const read = await this.#transport.getMatch(this.code);
      if (!read.ok) {
        this.#connection(false, read.error);
        return;
      }
      if (read.value !== null) await this.#onRecord(read.value);
    });
  }

  /** Resolves when every queued pull, apply and append has finished. */
  async settled(): Promise<void> {
    for (;;) {
      const work = this.#work;
      const flushing = this.#flushing;
      await work;
      await flushing;
      if (work === this.#work && flushing === this.#flushing) return;
    }
  }

  /**
   * Plays a command for the seat to move, when this client drives it: it
   * is applied here at once (the result returned for the screen to play
   * back) and appended to the log in the background. A refused append
   * (`MOVE_REJECTED`) resynchronizes from the log.
   */
  submit(command: CommandV7): LockstepSubmitResultV7 {
    if (this.#desyncedAt !== null)
      return { accepted: false, reason: "DESYNCED" };
    if (this.#state.outcome !== null)
      return { accepted: false, reason: "MATCH_OVER" };
    if (!this.playable) return { accepted: false, reason: "NOT_ACTIVE" };
    if (!this.canAct) return { accepted: false, reason: "NOT_YOUR_TURN" };
    const seat = this.activeSeat;
    const actor = this.#state.turnOrder[
      this.#state.activeSeatIndex
    ] as PlayerId;
    const result = applyCommandV7(this.#state, actor, command);
    if (!result.accepted)
      return { accepted: false, reason: "REJECTED", error: result.error };
    const index = this.#hashes.length;
    const stateHash = this.#hashState(result.state);
    this.#state = result.state;
    this.#hashes.push(stateHash);
    this.#outbox.push({
      index,
      seat,
      commandJson: canonicalJson(command),
      stateHash,
      nextTurnSeat: activeSeatOfStateV7(result.state),
      finished: result.state.outcome !== null,
    });
    this.#emit({
      kind: "COMMAND_APPLIED",
      index,
      seat,
      command,
      events: result.events,
      state: result.state,
      local: true,
    });
    this.#afterChange();
    void this.#flush();
    return {
      accepted: true,
      index,
      state: result.state,
      events: result.events,
    };
  }

  /** Refetches the whole log and replays it from the setup. */
  resync(): Promise<boolean> {
    let ok = false;
    return this.#enqueue(async () => {
      ok = (await this.#resync())?.ok === true;
    }).then(() => ok);
  }

  /** Gives the match up for everyone (`ABANDONED`). */
  async abandon(): Promise<OnlineResultV7<OnlineMatchV7>> {
    const result = await this.#transport.abandonMatch(this.code);
    if (!result.ok) return result;
    this.#enqueue(() => this.#onRecord(result.value));
    return onlineOkV7(parseOnlineMatchV7(result.value));
  }

  // -------------------------------------------------------------------

  #enqueue(task: () => Promise<void> | void): Promise<void> {
    const next = this.#work.then(task).catch(() => undefined);
    this.#work = next;
    return next;
  }

  #emit(event: LockstepEventV7): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(event);
      } catch {
        // A screen's listener never stops the client.
      }
    }
  }

  #connection(ok: boolean, error: OnlineErrorV7 | null): void {
    if (ok === !this.#failing) return;
    this.#failing = !ok;
    this.#emit({ kind: "CONNECTION", ok, error });
  }

  #emitTurn(force = false): void {
    if (this.#state.outcome !== null) return;
    const seat = this.activeSeat;
    const mine = this.drivenSeats.includes(seat);
    const key = `${this.#state.round}:${seat}:${mine}`;
    if (!force && key === this.#lastTurn) return;
    this.#lastTurn = key;
    this.#emit({
      kind: "TURN",
      seat,
      playerId: (seat + 1) as PlayerId,
      mine,
      ai: !isHumanSeatV7(this.setup, seat),
    });
  }

  #finish(): void {
    const outcome = this.#state.outcome;
    if (outcome === null || this.#finishedSent) return;
    this.#finishedSent = true;
    this.#emit({ kind: "MATCH_FINISHED", outcome });
  }

  #afterChange(): void {
    this.#emitTurn();
    this.#finish();
  }

  async #onRecord(record: OnlineMatchRecordV7): Promise<void> {
    const before = this.#match;
    const match = parseOnlineMatchV7(record);
    this.#match = match;
    if (before.record !== record) this.#emit({ kind: "MATCH_UPDATED", match });
    if (match.status === "ABANDONED" && !this.#abandonedSent) {
      this.#abandonedSent = true;
      this.#emit({ kind: "MATCH_ABANDONED" });
    }
    if (before.driverUids.join() !== match.driverUids.join()) this.#emitTurn();
    // While this client's own moves are being appended, only they can
    // change the log; a conflict shows up as a refused append.
    if (this.#outbox.length > 0 || this.#desyncedAt !== null) return;
    if (match.moveCount > this.#hashes.length) {
      const moves = await this.#transport.getMoves(
        this.code,
        this.#hashes.length,
        match.moveCount,
      );
      if (!moves.ok) {
        this.#connection(false, moves.error);
        return;
      }
      await this.#ingest(moves.value);
    } else if (match.moveCount < this.#hashes.length) {
      // The store has fewer moves than this client applied with nothing
      // left to send: this state is not the log's.
      await this.#recover(match.moveCount, "CONFLICT");
    }
  }

  /** Applies delivered moves in index order (duplicates and gaps allowed). */
  async #ingest(delivered: readonly OnlineMoveRecordV7[]): Promise<void> {
    const byIndex = new Map<number, OnlineMoveRecordV7>();
    for (const move of delivered) {
      const known = byIndex.get(move.index);
      if (known !== undefined && known.stateHash !== move.stateHash) {
        await this.#recover(move.index, "CONFLICT");
        return;
      }
      byIndex.set(move.index, move);
    }
    for (const move of byIndex.values())
      if (
        move.index < this.#hashes.length &&
        this.#hashes[move.index] !== move.stateHash
      ) {
        await this.#recover(move.index, "CONFLICT");
        return;
      }
    const highest = Math.max(-1, ...byIndex.keys());
    if (highest >= this.#hashes.length && !byIndex.has(this.#hashes.length)) {
      // A gap: fetch the missing moves in order.
      const fetched = await this.#transport.getMoves(
        this.code,
        this.#hashes.length,
        highest + 1,
      );
      if (!fetched.ok) {
        this.#connection(false, fetched.error);
        return;
      }
      for (const move of fetched.value)
        if (!byIndex.has(move.index)) byIndex.set(move.index, move);
    }
    for (;;) {
      const index = this.#hashes.length;
      const move = byIndex.get(index);
      if (move === undefined) break;
      // A driver whose hashes went wrong is applied unchecked until one of
      // its hashes agrees again.
      const trusted = !this.#untrusted.has(move.uid);
      const applied = applyOnlineMoveV7(
        this.#state,
        move,
        this.#hashState,
        trusted,
      );
      if (!applied.ok) {
        await this.#recover(index, applied.reason, move);
        return;
      }
      if (!trusted && this.#hashState(applied.state) === move.stateHash)
        this.#untrusted.delete(move.uid);
      this.#state = applied.state;
      this.#hashes.push(move.stateHash);
      this.#emit({
        kind: "COMMAND_APPLIED",
        index,
        seat: move.seat,
        command: applied.command,
        events: applied.events,
        state: applied.state,
        local: false,
      });
      this.#afterChange();
    }
  }

  /**
   * Replays the whole log after a fault at `index`, checking that move.
   * Its hash reproduced: this client's state was off (`LOCAL`). It did
   * not: its author's was (`AUTHOR`), and the author is unverified.
   */
  async #recover(
    index: number,
    reason: LockstepFaultV7,
    move: OnlineMoveRecordV7 | null = null,
  ): Promise<void> {
    const replay = await this.#resync([index]);
    if (replay === null) return;
    if (!replay.ok) {
      this.#emit({
        kind: "DESYNC",
        index,
        reason,
        recovered: false,
        blame: null,
      });
      return;
    }
    const author = replay.mismatches.includes(index);
    if (author && move !== null) this.#untrusted.add(move.uid);
    this.#emit({
      kind: "DESYNC",
      index,
      reason,
      recovered: true,
      blame: author ? "AUTHOR" : "LOCAL",
    });
  }

  /**
   * Refetches the match and its log and replays it from the setup, hashing
   * the moves `check` names (tolerant: the commands are the game). Null
   * when the store could not be read (nothing changed).
   */
  async #resync(
    check: OnlineReplayCheckV7 = "LAST",
  ): Promise<OnlineReplayResultV7 | null> {
    const read = await this.#transport.getMatch(this.code);
    if (!read.ok || read.value === null) {
      if (!read.ok) this.#connection(false, read.error);
      return null;
    }
    this.#match = parseOnlineMatchV7(read.value);
    const moves = await this.#transport.getMoves(
      this.code,
      0,
      this.#match.moveCount,
    );
    if (!moves.ok) {
      this.#connection(false, moves.error);
      return null;
    }
    const replay = replayOnlineLogV7(
      this.setup,
      moves.value,
      this.#hashState,
      check,
      true,
    );
    this.#outbox = [];
    if (replay.state !== null) this.#state = replay.state;
    this.#hashes = [...replay.hashes];
    this.#desyncedAt = replay.ok ? null : replay.index;
    this.#emit({ kind: "RESYNCED", moveCount: this.#hashes.length });
    this.#afterChange();
    return replay;
  }

  #flush(): Promise<void> {
    this.#flushing ??= this.#drain().finally(() => {
      this.#flushing = null;
    });
    return this.#flushing;
  }

  async #drain(): Promise<void> {
    let failures = 0;
    for (;;) {
      const move = this.#outbox[0];
      if (move === undefined) return;
      const result = await this.#transport.appendMove(this.code, move);
      if (this.#outbox[0] !== move) continue;
      if (result.ok) {
        this.#outbox.shift();
        failures = 0;
        this.#connection(true, null);
        continue;
      }
      if (result.error.code === "NETWORK" || result.error.code === "AUTH") {
        this.#connection(false, result.error);
        if (this.#stopped) return;
        const delays = this.#retryDelays;
        const wait = delays[Math.min(failures, delays.length - 1)] ?? 1_000;
        failures += 1;
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      if (result.error.code === "INDEX_TAKEN" && (await this.#landed(move))) {
        // An earlier try did reach the store before its answer was lost.
        this.#outbox.shift();
        continue;
      }
      this.#outbox = [];
      this.#emit({
        kind: "MOVE_REJECTED",
        index: move.index,
        error: result.error,
      });
      await this.#enqueue(async () => {
        await this.#resync();
      });
      return;
    }
  }

  /** Whether the log already holds exactly this move. */
  async #landed(move: OnlineAppendV7): Promise<boolean> {
    const stored = await this.#transport.getMoves(
      this.code,
      move.index,
      move.index + 1,
    );
    const found = stored.ok ? stored.value[0] : undefined;
    return (
      found !== undefined &&
      found.uid === this.uid &&
      found.commandJson === move.commandJson &&
      found.stateHash === move.stateHash
    );
  }
}
