import type { PlayerId } from "../engine/model/ids";
import {
  FACTION_IDS_V7,
  isHumanSeatV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../engine/v7/types";
import { viewForV7 } from "../engine/v7/view";
import type { StorageAdapter } from "../persistence/index";
import type { OnlineForfeitV7 } from "./match";
import { ROOM_CODE_PATTERN_V7 } from "./room-code";
import {
  GUEST_SEAT_V7,
  HOST_SEAT_V7,
  type OnlineMatchStatusV7,
  type OnlineTransportV7,
} from "./types";

/**
 * A player's online track record (`pulp_wars-eqc6.6`, docs/MULTIPLAYER.md
 * section 12): every online match this browser played, kept in its own
 * `localStorage`. There are no accounts (the anonymous uid lives in one
 * browser), so the record is "on this device", and the screens say so.
 *
 * A match is recorded when its match screen opens (In progress, so it can
 * be resumed from the list) and updated as it goes: the turn, the score,
 * and the result when it ends (Won, Lost, by forfeit, Abandoned). An entry
 * left In progress while the browser was away is settled from the store
 * the next time Play online opens (`OnlineLobbySessionV7`).
 *
 * The list is capped at {@link ONLINE_HISTORY_LIMIT_V7} matches, newest
 * first; anything malformed in storage is dropped, never thrown.
 */

export const ONLINE_HISTORY_STORAGE_KEY_V7 = "pulpWars.online.history.v1";
/** The most matches kept (the newest). */
export const ONLINE_HISTORY_LIMIT_V7 = 100;

export const ONLINE_HISTORY_RESULTS_V7 = Object.freeze([
  "IN_PROGRESS",
  "WON",
  "LOST",
  "WON_FORFEIT",
  "LOST_FORFEIT",
  "ABANDONED",
] as const);
export type OnlineHistoryResultV7 = (typeof ONLINE_HISTORY_RESULTS_V7)[number];

/** The result in words, as the list's chip shows it. */
export const ONLINE_HISTORY_RESULT_LABELS_V7: Readonly<
  Record<OnlineHistoryResultV7, string>
> = {
  IN_PROGRESS: "In progress",
  WON: "Won",
  LOST: "Lost",
  WON_FORFEIT: "Won by forfeit",
  LOST_FORFEIT: "Lost by forfeit",
  ABANDONED: "Abandoned",
};

/** One online match as this player saw it. */
export interface OnlineHistoryEntryV7 {
  /** The room code (one entry per code). */
  readonly code: string;
  /** This browser's uid in the match (the local transport: per tab). */
  readonly uid: string;
  /** 0 host, 1 guest. */
  readonly seat: number;
  /** ISO times: when this browser first opened the match, and last saw it. */
  readonly startedAt: string;
  readonly updatedAt: string;
  /** The other human's display name. */
  readonly opponent: string;
  readonly faction: FactionIdV7;
  readonly opponentFaction: FactionIdV7;
  readonly aiSeats: number;
  /** The map type (a generated map) and its width. */
  readonly mapType: string;
  readonly width: number;
  readonly gameMode: string;
  /** The round the match reached. */
  readonly turns: number;
  readonly result: OnlineHistoryResultV7;
  /** This player's score total, when known. */
  readonly score: number | null;
}

/** Wins and losses (forfeits included) and the rest. */
export interface OnlineHistorySummaryV7 {
  readonly won: number;
  readonly lost: number;
  readonly abandoned: number;
  readonly inProgress: number;
}

export function onlineHistorySummaryV7(
  entries: readonly OnlineHistoryEntryV7[],
): OnlineHistorySummaryV7 {
  let won = 0;
  let lost = 0;
  let abandoned = 0;
  let inProgress = 0;
  for (const entry of entries)
    if (entry.result === "WON" || entry.result === "WON_FORFEIT") won += 1;
    else if (entry.result === "LOST" || entry.result === "LOST_FORFEIT")
      lost += 1;
    else if (entry.result === "ABANDONED") abandoned += 1;
    else inProgress += 1;
  return { won, lost, abandoned, inProgress };
}

/** Whether a result is final (the match is over for this player). */
export function onlineHistoryFinalV7(result: OnlineHistoryResultV7): boolean {
  return result !== "IN_PROGRESS";
}

/** What decides a match's result for one player. */
export interface OnlineHistoryFactsV7 {
  readonly state: GameStateV7;
  readonly setup: MatchSetupV7;
  readonly mySeat: number;
  readonly status: OnlineMatchStatusV7;
  readonly forfeit: OnlineForfeitV7 | null;
}

/**
 * This player's result: a forfeit (Won or Lost by forfeit; an out player
 * whose friend gives up has already lost), the game's own end, out of the
 * game (Lost, even while the others play on), a left match (Abandoned),
 * else In progress.
 */
export function onlineHistoryResultV7(
  facts: OnlineHistoryFactsV7,
): OnlineHistoryResultV7 {
  const { state, mySeat, forfeit } = facts;
  const me = state.players.find((player) => player.seat === mySeat);
  const out = me?.status === "ELIMINATED";
  if (forfeit !== null)
    return forfeit.seat === mySeat
      ? "LOST_FORFEIT"
      : out
        ? "LOST"
        : "WON_FORFEIT";
  const outcome = state.outcome;
  if (outcome !== null)
    return outcome.kind !== "DEFEAT" && outcome.winnerId === me?.id
      ? "WON"
      : "LOST";
  if (out) return "LOST";
  if (facts.status === "ABANDONED") return "ABANDONED";
  return "IN_PROGRESS";
}

/** An entry for a match as it stands (`now`: the time of the record). */
export function onlineHistoryEntryV7(
  facts: OnlineHistoryFactsV7 & {
    readonly code: string;
    readonly uid: string;
    /** The other human's display name. */
    readonly opponent: string;
    readonly now: string;
  },
): OnlineHistoryEntryV7 {
  const { state, setup, mySeat } = facts;
  const otherSeat = mySeat === HOST_SEAT_V7 ? GUEST_SEAT_V7 : HOST_SEAT_V7;
  const factionOf = (seat: number): FactionIdV7 =>
    state.players.find((player) => player.seat === seat)?.faction ??
    setup.factions[seat] ??
    "ORIGINAL";
  let score: number | null;
  try {
    score =
      viewForV7(state, (mySeat + 1) as PlayerId).leaderboard.find(
        (entry) => entry.seat === mySeat,
      )?.score ?? null;
  } catch {
    score = null;
  }
  const aiSeats = state.players.filter(
    (player) => !isHumanSeatV7(setup, player.seat),
  ).length;
  return {
    code: facts.code,
    uid: facts.uid,
    seat: mySeat,
    startedAt: facts.now,
    updatedAt: facts.now,
    opponent: facts.opponent,
    faction: factionOf(mySeat),
    opponentFaction: factionOf(otherSeat),
    aiSeats,
    mapType: setup.mapType,
    width: setup.width,
    gameMode: setup.gameMode ?? "DOMINATION",
    turns: state.round,
    result: onlineHistoryResultV7(facts),
    score,
  };
}

const ISO_TIME_V7 = /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/;

/** An entry read from storage, or null when anything is off. */
export function parseOnlineHistoryEntryV7(
  value: unknown,
): OnlineHistoryEntryV7 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const item = value as Record<string, unknown>;
  const text = (key: string, max = 64): string | null => {
    const field = item[key];
    return typeof field === "string" && field.length <= max ? field : null;
  };
  const whole = (key: string, max: number): number | null => {
    const field = item[key];
    return typeof field === "number" &&
      Number.isSafeInteger(field) &&
      field >= 0 &&
      field <= max
      ? field
      : null;
  };
  const faction = (key: string): FactionIdV7 | null => {
    const field = item[key];
    return (FACTION_IDS_V7 as readonly unknown[]).includes(field)
      ? (field as FactionIdV7)
      : null;
  };
  const code = text("code", 5);
  const uid = text("uid", 128);
  const seat = whole("seat", 1);
  const startedAt = text("startedAt");
  const updatedAt = text("updatedAt");
  const opponent = text("opponent", 32);
  const mine = faction("faction");
  const theirs = faction("opponentFaction");
  const aiSeats = whole("aiSeats", 16);
  const mapType = text("mapType", 32);
  const width = whole("width", 1000);
  const gameMode = text("gameMode", 32);
  const turns = whole("turns", 100_000);
  const result = item.result;
  const score = item.score;
  if (
    code === null ||
    !ROOM_CODE_PATTERN_V7.test(code) ||
    uid === null ||
    seat === null ||
    startedAt === null ||
    !ISO_TIME_V7.test(startedAt) ||
    updatedAt === null ||
    !ISO_TIME_V7.test(updatedAt) ||
    opponent === null ||
    mine === null ||
    theirs === null ||
    aiSeats === null ||
    mapType === null ||
    width === null ||
    gameMode === null ||
    turns === null ||
    !(ONLINE_HISTORY_RESULTS_V7 as readonly unknown[]).includes(result) ||
    !(
      score === null ||
      (typeof score === "number" && Number.isSafeInteger(score))
    )
  )
    return null;
  return {
    code,
    uid,
    seat,
    startedAt,
    updatedAt,
    opponent,
    faction: mine,
    opponentFaction: theirs,
    aiSeats,
    mapType,
    width,
    gameMode,
    turns,
    result: result as OnlineHistoryResultV7,
    score: score as number | null,
  };
}

/** Newest first, one per code, at most the limit. */
function tidy(
  entries: readonly OnlineHistoryEntryV7[],
): OnlineHistoryEntryV7[] {
  const byCode = new Map<string, OnlineHistoryEntryV7>();
  for (const entry of entries) {
    const known = byCode.get(entry.code);
    if (known === undefined || known.updatedAt < entry.updatedAt)
      byCode.set(entry.code, entry);
  }
  return [...byCode.values()]
    .sort((left, right) =>
      left.startedAt === right.startedAt
        ? right.updatedAt.localeCompare(left.updatedAt)
        : right.startedAt.localeCompare(left.startedAt),
    )
    .slice(0, ONLINE_HISTORY_LIMIT_V7);
}

/**
 * The track record in storage. On Firestore one browser is one player
 * (one key); the two-tab local transport makes each tab its own player,
 * so each uid has its own key there (two tabs never write one list).
 */
export class OnlineMatchHistoryV7 {
  readonly #storage: StorageAdapter | null;
  readonly #kind: OnlineTransportV7["kind"];

  constructor(
    storage: StorageAdapter | null,
    kind: OnlineTransportV7["kind"] = "FIRESTORE",
  ) {
    this.#storage = storage;
    this.#kind = kind;
  }

  /** The storage key of a uid's list (null: unknown yet). */
  key(uid: string | null): string | null {
    if (this.#kind === "FIRESTORE") return ONLINE_HISTORY_STORAGE_KEY_V7;
    return uid === null || uid === ""
      ? null
      : `${ONLINE_HISTORY_STORAGE_KEY_V7}.${uid}`;
  }

  /** This player's matches, newest first (empty when unreadable). */
  entries(uid: string | null): readonly OnlineHistoryEntryV7[] {
    const key = this.key(uid);
    if (key === null || this.#storage === null) return [];
    let raw: unknown;
    try {
      const text = this.#storage.getItem(key);
      if (text === null) return [];
      raw = JSON.parse(text);
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    return tidy(
      raw.flatMap((item) => {
        const entry = parseOnlineHistoryEntryV7(item);
        return entry === null ? [] : [entry];
      }),
    );
  }

  /** One entry of this player's, or null. */
  entry(uid: string | null, code: string): OnlineHistoryEntryV7 | null {
    return this.entries(uid).find((item) => item.code === code) ?? null;
  }

  /**
   * Adds or updates the match's entry: its first `startedAt` is kept, and
   * a final result is never taken back to In progress. Returns the stored
   * entry (null when nothing could be stored).
   */
  record(entry: OnlineHistoryEntryV7): OnlineHistoryEntryV7 | null {
    const key = this.key(entry.uid);
    if (key === null || this.#storage === null) return null;
    const entries = this.entries(entry.uid);
    const known = entries.find((item) => item.code === entry.code);
    const next: OnlineHistoryEntryV7 =
      known === undefined
        ? entry
        : {
            ...entry,
            startedAt: known.startedAt,
            ...(onlineHistoryFinalV7(known.result) &&
            !onlineHistoryFinalV7(entry.result)
              ? { result: known.result }
              : {}),
          };
    try {
      this.#storage.setItem(
        key,
        JSON.stringify(
          tidy([next, ...entries.filter((item) => item.code !== entry.code)]),
        ),
      );
    } catch {
      return null;
    }
    return next;
  }
}

const MONTHS_V7 = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "Today", "Yesterday", "29 Oct", or "29 Oct 2025" for another year. */
export function onlineHistoryDateLabelV7(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = (value: Date): number =>
    Math.floor(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) /
        86_400_000,
    );
  const ago = day(now) - day(date);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  const label = `${date.getDate()} ${MONTHS_V7[date.getMonth()] ?? ""}`;
  return date.getFullYear() === now.getFullYear()
    ? label
    : `${label} ${date.getFullYear()}`;
}
