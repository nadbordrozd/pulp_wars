/**
 * Online multiplayer data model (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md
 * section 4): the match record, the move records, and the transport every
 * implementation (in-memory, two-tab local, Firestore REST) provides.
 *
 * Records are what the store holds: flat fields, with the lobby options,
 * the setup and each command as canonical JSON strings (so the Firestore
 * rules can bound their size and nothing is lost in a type mapping).
 * `parseOnlineMatchV7` (`src/online/match.ts`) turns a record into the
 * typed match the lobby and the lockstep client read.
 */

/** A match's life: the lobby, the game, and its two ends. */
export const ONLINE_MATCH_STATUSES_V7 = Object.freeze([
  "LOBBY",
  "ACTIVE",
  "FINISHED",
  "ABANDONED",
] as const);
export type OnlineMatchStatusV7 = (typeof ONLINE_MATCH_STATUSES_V7)[number];

/** The host's seat and the guest's seat. */
export const HOST_SEAT_V7 = 0;
export const GUEST_SEAT_V7 = 1;
/** The human seats of every online setup (`MatchSetupV7.humanSeats`). */
export const ONLINE_HUMAN_SEATS_V7: readonly number[] = Object.freeze([
  HOST_SEAT_V7,
  GUEST_SEAT_V7,
]);

/** Size limits (the Firestore rules hold the same numbers). */
export const ONLINE_OPTIONS_JSON_MAX_V7 = 2000;
export const ONLINE_SETUP_JSON_MAX_V7 = 8000;
export const ONLINE_COMMAND_JSON_MAX_V7 = 4000;
/** The most seats a setup has (nine factions). */
export const ONLINE_SEATS_MAX_V7 = 9;

/** The stored match: one document per room code. */
export interface OnlineMatchRecordV7 {
  /** The room code, also the document ID. */
  readonly code: string;
  /** The ruleset the match is locked to (`RULESET_7_ID` of the host). */
  readonly rulesetId: string;
  readonly status: OnlineMatchStatusV7;
  readonly hostUid: string;
  readonly hostName: string;
  /** A faction ID or `RANDOM`. */
  readonly hostPick: string;
  /** Empty while the guest seat is free. */
  readonly guestUid: string;
  readonly guestName: string;
  readonly guestPick: string;
  readonly guestReady: boolean;
  /** `OnlineMatchOptionsV7` as canonical JSON. */
  readonly optionsJson: string;
  /** The resolved `MatchSetupV7` as canonical JSON; empty in the lobby. */
  readonly setupJson: string;
  /**
   * Who appends each seat's moves, by seat: the host's uid for seat 0 and
   * every AI seat, the guest's for seat 1. Empty in the lobby.
   */
  readonly driverUids: readonly string[];
  /** The moves in the log; the next move's index. */
  readonly moveCount: number;
  /** The seat whose driver may append the next move. */
  readonly turnSeat: number;
  /** ISO times; the server's on Firestore. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** One move of the log, `matches/{code}/moves/{index}`. */
export interface OnlineMoveRecordV7 {
  readonly index: number;
  /** The seat that played it (the active seat at that index). */
  readonly seat: number;
  /** The uid that appended it (the seat's driver). */
  readonly uid: string;
  /** The `CommandV7` as canonical JSON. */
  readonly commandJson: string;
  /** `canonicalHash` of the state after the command. */
  readonly stateHash: string;
  readonly createdAt: string;
}

/** A move to append, with what the match record becomes. */
export interface OnlineAppendV7 {
  readonly index: number;
  readonly seat: number;
  readonly commandJson: string;
  readonly stateHash: string;
  /** The seat whose turn it is after the move. */
  readonly nextTurnSeat: number;
  /** True when the move ended the match (the status becomes FINISHED). */
  readonly finished: boolean;
}

export interface OnlineIdentityV7 {
  readonly uid: string;
}

export type OnlineErrorCodeV7 =
  /** No match has this code. */
  | "NOT_FOUND"
  /** The store refused the write (the rules, or not your seat). */
  | "FORBIDDEN"
  /** Someone else took the guest seat first. */
  | "SEAT_TAKEN"
  /** The move index was already taken: the log moved on. */
  | "INDEX_TAKEN"
  /** The match is not in its lobby any more. */
  | "NOT_LOBBY"
  /** The match is not being played (still a lobby, finished, abandoned). */
  | "NOT_ACTIVE"
  /** The match was made by another build of the game. */
  | "RULESET_MISMATCH"
  /** The request did not get through (retryable). */
  | "NETWORK"
  /** Anonymous sign-in failed. */
  | "AUTH"
  /** The input or a stored record is malformed. */
  | "INVALID"
  /** No free room code was found in a few tries. */
  | "CODE_EXHAUSTED";

export interface OnlineErrorV7 {
  readonly code: OnlineErrorCodeV7;
  readonly message: string;
}

export type OnlineResultV7<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: OnlineErrorV7 };

export function onlineOkV7<T>(value: T): OnlineResultV7<T> {
  return { ok: true, value };
}
export function onlineErrorV7<T>(
  code: OnlineErrorCodeV7,
  message: string = code,
): OnlineResultV7<T> {
  return { ok: false, error: { code, message } };
}

/** What the host writes to create a match (the code is the transport's). */
export interface OnlineCreateInputV7 {
  readonly rulesetId: string;
  readonly hostName: string;
  readonly hostPick: string;
  readonly optionsJson: string;
}

/** A guest taking the free seat. */
export interface OnlineJoinInputV7 {
  readonly name: string;
  readonly pick: string;
  readonly ready: boolean;
}

/**
 * A lobby edit. The host may change its name, pick and the options; the
 * guest its name, pick and ready flag, or leave the seat (`leaveSeat`).
 * Keys of the other side are refused.
 */
export interface OnlineLobbyPatchV7 {
  readonly hostName?: string;
  readonly hostPick?: string;
  readonly optionsJson?: string;
  readonly guestName?: string;
  readonly guestPick?: string;
  readonly guestReady?: boolean;
  readonly leaveSeat?: true;
}

/** The host starting the game. */
export interface OnlineStartInputV7 {
  readonly setupJson: string;
  readonly driverUids: readonly string[];
  readonly turnSeat: number;
}

/** How often a watch polls (a store that pushes ignores it). */
export interface OnlineWatchOptionsV7 {
  /** Milliseconds to the next poll; read before every poll. */
  readonly intervalMs?: () => number;
}

/**
 * The transport (docs/MULTIPLAYER.md section 6). Every call acts as the
 * signed-in identity (`signIn` first; the other calls sign in on demand).
 * Implementations enforce the same rules (`src/online/match-rules.ts`
 * mirrors `firebase/firestore.rules`).
 */
export interface OnlineTransportV7 {
  readonly kind: "MEMORY" | "LOCAL" | "FIRESTORE";
  signIn(): Promise<OnlineResultV7<OnlineIdentityV7>>;
  /** Creates a lobby under a fresh room code (collisions draw again). */
  createMatch(
    input: OnlineCreateInputV7,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7>>;
  /** The match of a code; `null` when there is none. */
  getMatch(code: string): Promise<OnlineResultV7<OnlineMatchRecordV7 | null>>;
  /** Takes the free guest seat (once: `SEAT_TAKEN` after that). */
  joinMatch(
    code: string,
    input: OnlineJoinInputV7,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7>>;
  updateLobby(
    code: string,
    patch: OnlineLobbyPatchV7,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7>>;
  /** The host: LOBBY to ACTIVE with the resolved setup. */
  startMatch(
    code: string,
    input: OnlineStartInputV7,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7>>;
  /**
   * Appends move `index` (which must equal `moveCount`) and moves the
   * match on, atomically; `INDEX_TAKEN` when the log already has it.
   */
  appendMove(
    code: string,
    move: OnlineAppendV7,
  ): Promise<OnlineResultV7<OnlineMoveRecordV7>>;
  /** Moves `from` (inclusive) to `to` (exclusive), in order. */
  getMoves(
    code: string,
    from: number,
    to: number,
  ): Promise<OnlineResultV7<readonly OnlineMoveRecordV7[]>>;
  /** A seated player gives up the match (or the host cancels the lobby). */
  abandonMatch(code: string): Promise<OnlineResultV7<OnlineMatchRecordV7>>;
  /**
   * Calls `listener` with the match now and whenever it changes (on
   * Firestore: polled, see {@link OnlineWatchOptionsV7}); `null` when the
   * match is gone. Returns the stop function.
   */
  watchMatch(
    code: string,
    listener: (
      record: OnlineMatchRecordV7 | null,
      error: OnlineErrorV7 | null,
    ) => void,
    options?: OnlineWatchOptionsV7,
  ): () => void;
}
