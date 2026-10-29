import {
  abandonMatchRecordV7,
  appendMoveRecordV7,
  createMatchRecordV7,
  joinMatchRecordV7,
  patchLobbyRecordV7,
  startMatchRecordV7,
} from "./match-rules";
import { generateRoomCodeV7 } from "./room-code";
import {
  onlineErrorV7,
  onlineOkV7,
  type OnlineErrorV7,
  type OnlineMatchRecordV7,
  type OnlineMoveRecordV7,
  type OnlineResultV7,
  type OnlineTransportV7,
  type OnlineWatchOptionsV7,
} from "./types";

/**
 * A transport over a simple record store (`pulp_wars-eqc6.1`): the
 * in-memory fake and the two-tab local transport share it. Every write
 * runs inside `lock` and goes through the TypeScript mirror of the
 * Firestore rules (`src/online/match-rules.ts`), so these stores refuse
 * exactly what Firestore would.
 */
export interface OnlineRecordStoreV7 {
  getMatch(code: string): OnlineMatchRecordV7 | null;
  putMatch(record: OnlineMatchRecordV7): void;
  getMove(code: string, index: number): OnlineMoveRecordV7 | null;
  putMove(code: string, record: OnlineMoveRecordV7): void;
  /** Runs `body` alone against the store (no other writer between). */
  lock<T>(body: () => T): Promise<T>;
  /** Tells every watcher of `code` that the match changed. */
  notify(code: string): void;
  /** Calls `listener` whenever `code` may have changed; returns the stop. */
  subscribe(code: string, listener: () => void): () => void;
}

export interface StoreTransportOptionsV7 {
  readonly kind: "MEMORY" | "LOCAL";
  readonly store: OnlineRecordStoreV7;
  readonly uid: string;
  /** `[0, 1)` source for room codes. */
  readonly random: () => number;
  /** ISO time. */
  readonly now: () => string;
  /** Polling fallback of a watch, milliseconds; 0 for none. */
  readonly pollMs?: number;
}

/** How many codes a create tries before giving up. */
export const ROOM_CODE_ATTEMPTS_V7 = 8;

export function createStoreTransportV7(
  options: StoreTransportOptionsV7,
): OnlineTransportV7 {
  const { store, uid, now } = options;
  const write = async <T>(
    code: string,
    body: () => OnlineResultV7<T>,
  ): Promise<OnlineResultV7<T>> => {
    const result = await store.lock(body);
    if (result.ok) store.notify(code);
    return result;
  };
  const existing = (
    code: string,
    body: (before: OnlineMatchRecordV7) => OnlineResultV7<OnlineMatchRecordV7>,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7>> =>
    write(code, () => {
      const before = store.getMatch(code);
      if (before === null) return onlineErrorV7("NOT_FOUND", "No such match.");
      const after = body(before);
      if (after.ok) store.putMatch(after.value);
      return after;
    });
  return {
    kind: options.kind,
    signIn: () => Promise.resolve(onlineOkV7({ uid })),
    async createMatch(input) {
      for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS_V7; attempt += 1) {
        const code = generateRoomCodeV7(options.random);
        const result = await write(code, () => {
          if (store.getMatch(code) !== null)
            return onlineErrorV7<OnlineMatchRecordV7>("SEAT_TAKEN");
          const created = createMatchRecordV7(uid, code, input, now());
          if (created.ok) store.putMatch(created.value);
          return created;
        });
        if (result.ok || result.error.code !== "SEAT_TAKEN") return result;
      }
      return onlineErrorV7("CODE_EXHAUSTED", "No free room code was found.");
    },
    getMatch: (code) => Promise.resolve(onlineOkV7(store.getMatch(code))),
    joinMatch: (code, input) =>
      existing(code, (before) => joinMatchRecordV7(uid, before, input, now())),
    updateLobby: (code, patch) =>
      existing(code, (before) => patchLobbyRecordV7(uid, before, patch, now())),
    startMatch: (code, input) =>
      existing(code, (before) => startMatchRecordV7(uid, before, input, now())),
    abandonMatch: (code) =>
      existing(code, (before) => abandonMatchRecordV7(uid, before, now())),
    appendMove: (code, move) =>
      write(code, () => {
        const before = store.getMatch(code);
        if (before === null)
          return onlineErrorV7("NOT_FOUND", "No such match.");
        const result = appendMoveRecordV7(
          uid,
          before,
          move,
          store.getMove(code, move.index) !== null,
          now(),
        );
        if (!result.ok) return result;
        store.putMove(code, result.value.move);
        store.putMatch(result.value.match);
        return onlineOkV7(result.value.move);
      }),
    getMoves(code, from, to) {
      const moves: OnlineMoveRecordV7[] = [];
      for (let index = Math.max(0, from); index < to; index += 1) {
        const move = store.getMove(code, index);
        if (move === null) break;
        moves.push(move);
      }
      return Promise.resolve(onlineOkV7(moves));
    },
    watchMatch(code, listener, watchOptions?: OnlineWatchOptionsV7) {
      let stopped = false;
      let last: string | null = null;
      const deliver = (): void => {
        if (stopped) return;
        let record: OnlineMatchRecordV7 | null;
        let error: OnlineErrorV7 | null = null;
        try {
          record = store.getMatch(code);
        } catch {
          record = null;
          error = { code: "NETWORK", message: "The store could not be read." };
        }
        const key = record === null ? "" : JSON.stringify(record);
        if (key === last && error === null) return;
        last = key;
        listener(record, error);
      };
      const unsubscribe = store.subscribe(code, () => queueMicrotask(deliver));
      queueMicrotask(deliver);
      const pollMs = options.pollMs ?? 0;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const poll = (): void => {
        if (stopped) return;
        deliver();
        timer = setTimeout(poll, watchOptions?.intervalMs?.() ?? pollMs);
      };
      if (pollMs > 0) timer = setTimeout(poll, pollMs);
      return () => {
        stopped = true;
        unsubscribe();
        if (timer !== null) clearTimeout(timer);
      };
    },
  };
}
