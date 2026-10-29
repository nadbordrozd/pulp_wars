import { cryptoRandomV7 } from "./room-code";
import {
  createStoreTransportV7,
  type OnlineRecordStoreV7,
} from "./store-transport";
import type {
  OnlineMatchRecordV7,
  OnlineMoveRecordV7,
  OnlineTransportV7,
} from "./types";

/**
 * The in-memory fake (`pulp_wars-eqc6.1`): one shared "server" in this
 * JavaScript realm, any number of client transports with their own uids.
 * Tests use it for two simulated clients; it applies the same rules as
 * Firestore (`src/online/match-rules.ts`). Watchers are told of every
 * change at once (after a microtask), never polled.
 */
export interface MemoryOnlineServerV7 {
  /** A client signed in as `uid`. */
  transport(
    uid: string,
    options?: { readonly random?: () => number; readonly now?: () => string },
  ): OnlineTransportV7;
  match(code: string): OnlineMatchRecordV7 | null;
  moves(code: string): readonly OnlineMoveRecordV7[];
  /** Tests only: stores a record as is, past the rules. */
  forceMatch(record: OnlineMatchRecordV7): void;
  /** Tests only: stores a move as is, past the rules. */
  forceMove(code: string, record: OnlineMoveRecordV7): void;
}

export function createMemoryOnlineServerV7(): MemoryOnlineServerV7 {
  const matches = new Map<string, OnlineMatchRecordV7>();
  const moves = new Map<string, Map<number, OnlineMoveRecordV7>>();
  const listeners = new Map<string, Set<() => void>>();
  const store: OnlineRecordStoreV7 = {
    getMatch: (code) => matches.get(code) ?? null,
    putMatch: (record) => void matches.set(record.code, record),
    getMove: (code, index) => moves.get(code)?.get(index) ?? null,
    putMove(code, record) {
      let log = moves.get(code);
      if (log === undefined) {
        log = new Map();
        moves.set(code, log);
      }
      log.set(record.index, record);
    },
    lock: (body) => Promise.resolve().then(body),
    notify(code) {
      for (const listener of [...(listeners.get(code) ?? [])]) listener();
    },
    subscribe(code, listener) {
      let set = listeners.get(code);
      if (set === undefined) {
        set = new Set();
        listeners.set(code, set);
      }
      set.add(listener);
      return () => void set.delete(listener);
    },
  };
  return {
    transport: (uid, options) =>
      createStoreTransportV7({
        kind: "MEMORY",
        store,
        uid,
        random: options?.random ?? cryptoRandomV7(),
        now: options?.now ?? (() => new Date().toISOString()),
      }),
    match: (code) => matches.get(code) ?? null,
    moves: (code) =>
      [...(moves.get(code)?.values() ?? [])].sort((a, b) => a.index - b.index),
    forceMatch(record) {
      store.putMatch(record);
      store.notify(record.code);
    },
    forceMove(code, record) {
      store.putMove(code, record);
    },
  };
}
