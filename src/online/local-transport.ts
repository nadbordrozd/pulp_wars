import type { StorageAdapter } from "../persistence/index";
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
 * The two-tab local transport (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md
 * section 6.2): two tabs of the same browser play each other with no
 * network. The records live in `localStorage` (shared by every tab of the
 * origin), a `BroadcastChannel` tells the other tabs of each write, and the
 * `storage` event and a slow poll back it up. Writes are serialized across
 * tabs with the Web Locks API where the browser has it. Each tab is its own
 * player: its uid lives in `sessionStorage`, which is per tab and survives a
 * reload. For developer testing and browser checks; it never leaves the
 * machine.
 */

export const LOCAL_ONLINE_PREFIX_V7 = "pulpWars.online.local.";
export const LOCAL_ONLINE_UID_KEY_V7 = `${LOCAL_ONLINE_PREFIX_V7}uid`;
export const LOCAL_ONLINE_CHANNEL_V7 = "pulpWars.online.local";
const LOCK_NAME_V7 = "pulpWars.online.local.lock";

/** What the transport needs of a broadcast channel (`BroadcastChannel`). */
export interface LocalChannelV7 {
  postMessage(message: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
}

export interface LocalOnlineTransportOptionsV7 {
  /** Shared by every tab: `window.localStorage`. */
  readonly storage: StorageAdapter;
  /** Per tab: `window.sessionStorage` (the tab's uid). */
  readonly sessionStorage?: StorageAdapter;
  /** A uid to use instead of the tab's stored one. */
  readonly uid?: string;
  /** `new BroadcastChannel(name)`; absent: the `storage` event and polling. */
  readonly channel?: LocalChannelV7 | null;
  /** `window`, for the `storage` event. */
  readonly eventTarget?: Pick<
    Window,
    "addEventListener" | "removeEventListener"
  > | null;
  /** `navigator.locks.request`; absent: writes run unlocked. */
  readonly locks?: {
    request<T>(name: string, body: () => Promise<T> | T): Promise<T>;
  } | null;
  readonly random?: () => number;
  readonly now?: () => string;
  /** The poll fallback, milliseconds (default 1500). */
  readonly pollMs?: number;
}

function matchKey(code: string): string {
  return `${LOCAL_ONLINE_PREFIX_V7}match.${code}`;
}
function moveKey(code: string, index: number): string {
  return `${LOCAL_ONLINE_PREFIX_V7}move.${code}.${index}`;
}

function readJson<T>(storage: StorageAdapter, key: string): T | null {
  try {
    const text = storage.getItem(key);
    return text === null ? null : (JSON.parse(text) as T);
  } catch {
    return null;
  }
}

/** This tab's uid: stored per tab, made up on first use. */
export function localOnlineUidV7(
  sessionStorage: StorageAdapter | undefined,
  random: () => number = cryptoRandomV7(),
): string {
  const fresh = `local-${Math.floor(random() * 0x1_0000_0000)
    .toString(16)
    .padStart(8, "0")}`;
  if (sessionStorage === undefined) return fresh;
  try {
    const stored = sessionStorage.getItem(LOCAL_ONLINE_UID_KEY_V7);
    if (stored !== null && /^local-[0-9a-f]{8}$/.test(stored)) return stored;
    sessionStorage.setItem(LOCAL_ONLINE_UID_KEY_V7, fresh);
  } catch {
    // A tab without session storage gets a uid for this page only.
  }
  return fresh;
}

export function createLocalOnlineTransportV7(
  options: LocalOnlineTransportOptionsV7,
): OnlineTransportV7 {
  const { storage } = options;
  const random = options.random ?? cryptoRandomV7();
  const uid = options.uid ?? localOnlineUidV7(options.sessionStorage, random);
  const local = new Map<string, Set<() => void>>();
  const fire = (code: string): void => {
    for (const listener of [...(local.get(code) ?? [])]) listener();
  };
  const store: OnlineRecordStoreV7 = {
    getMatch: (code) => readJson<OnlineMatchRecordV7>(storage, matchKey(code)),
    putMatch: (record) =>
      storage.setItem(matchKey(record.code), JSON.stringify(record)),
    getMove: (code, index) =>
      readJson<OnlineMoveRecordV7>(storage, moveKey(code, index)),
    putMove: (code, record) =>
      storage.setItem(moveKey(code, record.index), JSON.stringify(record)),
    lock: (body) =>
      options.locks
        ? options.locks.request(LOCK_NAME_V7, body)
        : Promise.resolve().then(body),
    notify(code) {
      options.channel?.postMessage({ kind: "MATCH_CHANGED", code });
      fire(code);
    },
    subscribe(code, listener) {
      let set = local.get(code);
      if (set === undefined) {
        set = new Set();
        local.set(code, set);
      }
      set.add(listener);
      const onMessage = (event: { readonly data: unknown }): void => {
        const data = event.data as { kind?: unknown; code?: unknown } | null;
        if (data?.kind === "MATCH_CHANGED" && data.code === code) listener();
      };
      const onStorage = (event: Event): void => {
        const key = (event as StorageEvent).key;
        if (key === null || key === undefined || key === matchKey(code))
          listener();
      };
      options.channel?.addEventListener("message", onMessage);
      options.eventTarget?.addEventListener("storage", onStorage);
      return () => {
        set.delete(listener);
        options.channel?.removeEventListener("message", onMessage);
        options.eventTarget?.removeEventListener("storage", onStorage);
      };
    },
  };
  return createStoreTransportV7({
    kind: "LOCAL",
    store,
    uid,
    random,
    now: options.now ?? (() => new Date().toISOString()),
    pollMs: options.pollMs ?? 1500,
  });
}

/** The local transport of this browser tab, or null outside a browser. */
export function browserLocalOnlineTransportV7(
  window: Window | undefined = globalThis.window,
): OnlineTransportV7 | null {
  if (window === undefined) return null;
  try {
    const Channel = (
      window as Window & {
        readonly BroadcastChannel?: new (name: string) => LocalChannelV7;
      }
    ).BroadcastChannel;
    const channel =
      typeof Channel === "function"
        ? new Channel(LOCAL_ONLINE_CHANNEL_V7)
        : null;
    const locks = (
      window.navigator as Navigator & {
        readonly locks?: {
          request<T>(name: string, body: () => Promise<T> | T): Promise<T>;
        };
      }
    ).locks;
    return createLocalOnlineTransportV7({
      storage: window.localStorage,
      sessionStorage: window.sessionStorage,
      channel,
      eventTarget: window,
      locks:
        locks === undefined
          ? null
          : { request: (name, body) => locks.request(name, body) },
    });
  } catch {
    return null;
  }
}
