import {
  FIREBASE_CONFIG_V7,
  firestoreDocumentsPathV7,
} from "../app/leaderboard-v7";
import type { StorageAdapter } from "../persistence/index";
import { FirebaseAnonymousAuthV7, type FetchV7 } from "./firebase-auth";
import {
  abandonMatchRecordV7,
  createMatchRecordV7,
  forfeitMatchRecordV7,
  joinMatchRecordV7,
  patchLobbyRecordV7,
  startMatchRecordV7,
} from "./match-rules";
import { cryptoRandomV7, generateRoomCodeV7 } from "./room-code";
import { ROOM_CODE_ATTEMPTS_V7 } from "./store-transport";
import {
  ONLINE_COMMAND_JSON_MAX_V7,
  ONLINE_MATCH_STATUSES_V7,
  onlineErrorV7,
  onlineOkV7,
  type OnlineAppendV7,
  type OnlineMatchRecordV7,
  type OnlineMatchStatusV7,
  type OnlineMoveRecordV7,
  type OnlineResultV7,
  type OnlineTransportV7,
} from "./types";

/**
 * The Firestore REST transport (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md
 * section 6.3): plain `fetch`, no Firebase SDK, like the leaderboard
 * (`src/app/leaderboard-v7.ts`, whose public web config it uses). Every
 * request carries the anonymous account's ID token
 * (`src/online/firebase-auth.ts`); `firebase/firestore.rules` decides what
 * each may do.
 *
 * - A match is `matches/{CODE}`, created with `documents:commit` and
 *   `exists: false`, its times `REQUEST_TIME` transforms.
 * - A move is one commit of two writes: `matches/{CODE}/moves/{index}`
 *   with `exists: false`, and the match's `moveCount` (index + 1),
 *   `turnSeat` and `status`. The rules allow it only for the next index and
 *   the seat's driver, so two writers can never both take an index.
 * - Live updates are polled: one read of the match every
 *   {@link FIRESTORE_POLL_VISIBLE_MS_V7} while the tab is visible,
 *   {@link FIRESTORE_POLL_HIDDEN_MS_V7} while it is hidden; the moves are
 *   read (`documents:batchGet`) only when `moveCount` grows.
 */

export const FIRESTORE_ROOT_URL_V7 = "https://firestore.googleapis.com/v1";
export const MATCHES_COLLECTION_V7 = "matches";
export const MOVES_COLLECTION_V7 = "moves";
export const FIRESTORE_POLL_VISIBLE_MS_V7 = 2_000;
export const FIRESTORE_POLL_HIDDEN_MS_V7 = 15_000;
export const FIRESTORE_TIMEOUT_MS_V7 = 10_000;
/** Moves read in one `batchGet`. */
export const MOVES_PER_BATCH_V7 = 100;

type FirestoreValueV7 =
  | { readonly stringValue: string }
  | { readonly integerValue: string }
  | { readonly booleanValue: boolean }
  | { readonly timestampValue: string }
  | {
      readonly arrayValue: { readonly values?: readonly FirestoreValueV7[] };
    };
type FirestoreFieldsV7 = Readonly<Record<string, FirestoreValueV7>>;

const text = (value: string): FirestoreValueV7 => ({ stringValue: value });
const integer = (value: number): FirestoreValueV7 => ({
  integerValue: String(value),
});
const flag = (value: boolean): FirestoreValueV7 => ({ booleanValue: value });

/** The full document name of a match. */
export function matchDocumentNameV7(
  code: string,
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): string {
  return `${firestoreDocumentsPathV7(projectId)}/${MATCHES_COLLECTION_V7}/${code}`;
}
/** The full document name of a move. */
export function moveDocumentNameV7(
  code: string,
  index: number,
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): string {
  return `${matchDocumentNameV7(code, projectId)}/${MOVES_COLLECTION_V7}/${index}`;
}

/** The stored fields of a match record (its two times are transforms). */
export function matchFieldsV7(
  record: OnlineMatchRecordV7,
): Record<string, FirestoreValueV7> {
  return {
    code: text(record.code),
    rulesetId: text(record.rulesetId),
    status: text(record.status),
    hostUid: text(record.hostUid),
    hostName: text(record.hostName),
    hostPick: text(record.hostPick),
    guestUid: text(record.guestUid),
    guestName: text(record.guestName),
    guestPick: text(record.guestPick),
    guestReady: flag(record.guestReady),
    optionsJson: text(record.optionsJson),
    setupJson: text(record.setupJson),
    driverUids: {
      arrayValue:
        record.driverUids.length === 0
          ? {}
          : { values: record.driverUids.map(text) },
    },
    moveCount: integer(record.moveCount),
    turnSeat: integer(record.turnSeat),
    // A forfeit's two fields exist only once written (pulp_wars-eqc6.5).
    ...(record.forfeitSeat === undefined
      ? {}
      : { forfeitSeat: integer(record.forfeitSeat) }),
    ...(record.forfeitUid === undefined
      ? {}
      : { forfeitUid: text(record.forfeitUid) }),
  };
}

function fieldString(fields: FirestoreFieldsV7, key: string): string | null {
  const value = fields[key];
  if (value !== undefined && "stringValue" in value) return value.stringValue;
  return null;
}
function fieldInteger(fields: FirestoreFieldsV7, key: string): number | null {
  const value = fields[key];
  if (value === undefined || !("integerValue" in value)) return null;
  const parsed = Number(value.integerValue);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
function fieldBoolean(fields: FirestoreFieldsV7, key: string): boolean | null {
  const value = fields[key];
  return value !== undefined && "booleanValue" in value
    ? value.booleanValue
    : null;
}
function fieldTime(fields: FirestoreFieldsV7, key: string): string | null {
  const value = fields[key];
  return value !== undefined && "timestampValue" in value
    ? value.timestampValue
    : null;
}
function fieldStrings(
  fields: FirestoreFieldsV7,
  key: string,
): readonly string[] | null {
  const value = fields[key];
  if (value === undefined || !("arrayValue" in value)) return null;
  const values = value.arrayValue.values ?? [];
  const strings = values.map((item) =>
    "stringValue" in item ? item.stringValue : null,
  );
  return strings.every((item): item is string => item !== null)
    ? strings
    : null;
}

function documentFields(document: unknown): FirestoreFieldsV7 | null {
  if (typeof document !== "object" || document === null) return null;
  const fields = (document as { readonly fields?: unknown }).fields;
  return typeof fields === "object" && fields !== null
    ? (fields as FirestoreFieldsV7)
    : null;
}

/** A match document as a record, or null when a field is missing. */
export function matchRecordFromDocumentV7(
  document: unknown,
): OnlineMatchRecordV7 | null {
  const fields = documentFields(document);
  if (fields === null) return null;
  const status = fieldString(fields, "status");
  const record = {
    code: fieldString(fields, "code"),
    rulesetId: fieldString(fields, "rulesetId"),
    status,
    hostUid: fieldString(fields, "hostUid"),
    hostName: fieldString(fields, "hostName"),
    hostPick: fieldString(fields, "hostPick"),
    guestUid: fieldString(fields, "guestUid"),
    guestName: fieldString(fields, "guestName"),
    guestPick: fieldString(fields, "guestPick"),
    guestReady: fieldBoolean(fields, "guestReady"),
    optionsJson: fieldString(fields, "optionsJson"),
    setupJson: fieldString(fields, "setupJson"),
    driverUids: fieldStrings(fields, "driverUids"),
    moveCount: fieldInteger(fields, "moveCount"),
    turnSeat: fieldInteger(fields, "turnSeat"),
    createdAt: fieldTime(fields, "createdAt"),
    updatedAt: fieldTime(fields, "updatedAt"),
  };
  if (
    Object.values(record).some((value) => value === null) ||
    !ONLINE_MATCH_STATUSES_V7.includes(status as OnlineMatchStatusV7)
  )
    return null;
  // A forfeit (pulp_wars-eqc6.5): both fields or neither.
  if (!("forfeitSeat" in fields) && !("forfeitUid" in fields))
    return record as OnlineMatchRecordV7;
  const forfeitSeat = fieldInteger(fields, "forfeitSeat");
  const forfeitUid = fieldString(fields, "forfeitUid");
  if (forfeitSeat === null || forfeitUid === null) return null;
  return { ...(record as OnlineMatchRecordV7), forfeitSeat, forfeitUid };
}

/** A move document as a record, or null when a field is missing. */
export function moveRecordFromDocumentV7(
  document: unknown,
): OnlineMoveRecordV7 | null {
  const fields = documentFields(document);
  if (fields === null) return null;
  const record = {
    index: fieldInteger(fields, "index"),
    seat: fieldInteger(fields, "seat"),
    uid: fieldString(fields, "uid"),
    commandJson: fieldString(fields, "commandJson"),
    stateHash: fieldString(fields, "stateHash"),
    createdAt: fieldTime(fields, "createdAt"),
  };
  return Object.values(record).some((value) => value === null)
    ? null
    : (record as OnlineMoveRecordV7);
}

const REQUEST_TIME = "REQUEST_TIME";

/** The commit that creates a lobby: `exists: false`, both times the server's. */
export function createMatchCommitBodyV7(
  record: OnlineMatchRecordV7,
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): object {
  return {
    writes: [
      {
        update: {
          name: matchDocumentNameV7(record.code, projectId),
          fields: matchFieldsV7(record),
        },
        updateTransforms: [
          { fieldPath: "createdAt", setToServerValue: REQUEST_TIME },
          { fieldPath: "updatedAt", setToServerValue: REQUEST_TIME },
        ],
        currentDocument: { exists: false },
      },
    ],
  };
}

/**
 * The commit that changes some fields of a match: an update mask of
 * exactly those fields, `updatedAt` the server's time, and the match must
 * exist.
 */
export function updateMatchCommitBodyV7(
  after: OnlineMatchRecordV7,
  fieldPaths: readonly string[],
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): object {
  const all = matchFieldsV7(after);
  const fields: Record<string, FirestoreValueV7> = {};
  for (const path of fieldPaths) {
    const value = all[path];
    if (value !== undefined) fields[path] = value;
  }
  return {
    writes: [
      {
        update: { name: matchDocumentNameV7(after.code, projectId), fields },
        updateMask: { fieldPaths: [...fieldPaths] },
        updateTransforms: [
          { fieldPath: "updatedAt", setToServerValue: REQUEST_TIME },
        ],
        currentDocument: { exists: true },
      },
    ],
  };
}

/**
 * The commit of one move: the move document (`exists: false`, so an index
 * is never written twice) and the match's `moveCount`, `turnSeat` and
 * `status`, atomically (docs/MULTIPLAYER.md section 4.3).
 */
export function appendMoveCommitBodyV7(
  code: string,
  uid: string,
  move: OnlineAppendV7,
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): object {
  return {
    writes: [
      {
        update: {
          name: moveDocumentNameV7(code, move.index, projectId),
          fields: {
            index: integer(move.index),
            seat: integer(move.seat),
            uid: text(uid),
            commandJson: text(move.commandJson),
            stateHash: text(move.stateHash),
          },
        },
        updateTransforms: [
          { fieldPath: "createdAt", setToServerValue: REQUEST_TIME },
        ],
        currentDocument: { exists: false },
      },
      {
        update: {
          name: matchDocumentNameV7(code, projectId),
          fields: {
            moveCount: integer(move.index + 1),
            turnSeat: integer(move.nextTurnSeat),
            status: text(move.finished ? "FINISHED" : "ACTIVE"),
          },
        },
        updateMask: { fieldPaths: ["moveCount", "turnSeat", "status"] },
        updateTransforms: [
          { fieldPath: "updatedAt", setToServerValue: REQUEST_TIME },
        ],
        currentDocument: { exists: true },
      },
    ],
  };
}

/** The `documents:batchGet` body for moves `from` to `to` (exclusive). */
export function movesBatchGetBodyV7(
  code: string,
  from: number,
  to: number,
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): object {
  const documents: string[] = [];
  for (let index = from; index < to; index += 1)
    documents.push(moveDocumentNameV7(code, index, projectId));
  return { documents };
}

/** The fields whose values differ (the times aside). */
function changedFields(
  before: OnlineMatchRecordV7,
  after: OnlineMatchRecordV7,
): string[] {
  return (Object.keys(after) as (keyof OnlineMatchRecordV7)[]).filter(
    (key) =>
      key !== "createdAt" &&
      key !== "updatedAt" &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

export interface FirestoreOnlineTransportOptionsV7 {
  readonly fetch: FetchV7;
  /** The anonymous account; made from `config` and `storage` when absent. */
  readonly auth?: FirebaseAnonymousAuthV7;
  /** Keeps the anonymous account (`window.localStorage`). */
  readonly storage?: StorageAdapter | null;
  readonly config?: { readonly projectId: string; readonly apiKey: string };
  readonly random?: () => number;
  /** Whether the tab is visible (`document.visibilityState`). */
  readonly visible?: () => boolean;
  readonly timeoutMs?: number;
}

interface HttpResultV7 {
  readonly status: number;
  readonly body: unknown;
}

export function createFirestoreOnlineTransportV7(
  options: FirestoreOnlineTransportOptionsV7,
): OnlineTransportV7 {
  const config = options.config ?? FIREBASE_CONFIG_V7;
  const auth =
    options.auth ??
    new FirebaseAnonymousAuthV7({
      apiKey: config.apiKey,
      fetch: options.fetch,
      storage: options.storage ?? null,
    });
  const random = options.random ?? cryptoRandomV7();
  const base = `${FIRESTORE_ROOT_URL_V7}/${firestoreDocumentsPathV7(config.projectId)}`;
  const key = `key=${encodeURIComponent(config.apiKey)}`;

  /** One authorized request; a 401 refreshes the token and retries once. */
  const request = async (
    method: "GET" | "POST",
    url: string,
    body?: object,
  ): Promise<OnlineResultV7<HttpResultV7>> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const session = await auth.session();
      if (!session.ok)
        return onlineErrorV7(
          session.reason === "NETWORK" ? "NETWORK" : "AUTH",
          session.message,
        );
      const controller =
        typeof AbortController === "function" ? new AbortController() : null;
      const timer =
        controller === null
          ? null
          : setTimeout(
              () => controller.abort(),
              options.timeoutMs ?? FIRESTORE_TIMEOUT_MS_V7,
            );
      let status: number;
      let parsed: unknown;
      try {
        const response = await options.fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${session.session.idToken}`,
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          ...(controller === null ? {} : { signal: controller.signal }),
        });
        status = response.status;
        parsed = await response.json().catch(() => null);
      } catch {
        return onlineErrorV7("NETWORK", "The request did not get through.");
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
      if (status === 401 && attempt === 0) {
        auth.invalidate();
        continue;
      }
      return onlineOkV7({ status, body: parsed });
    }
    return onlineErrorV7("AUTH", "Sign-in was refused.");
  };

  const failure = <T>(status: number): OnlineResultV7<T> =>
    status === 404
      ? onlineErrorV7("NOT_FOUND", "No such match.")
      : status === 401
        ? onlineErrorV7("AUTH", "Sign-in was refused.")
        : status === 429 || status >= 500
          ? onlineErrorV7("NETWORK", `The store is busy (${status}).`)
          : onlineErrorV7("FORBIDDEN", `The store refused (${status}).`);

  const getMatch = async (
    code: string,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7 | null>> => {
    const response = await request(
      "GET",
      `${base}/${MATCHES_COLLECTION_V7}/${encodeURIComponent(code)}?${key}`,
    );
    if (!response.ok) return response;
    if (response.value.status === 404) return onlineOkV7(null);
    if (response.value.status !== 200) return failure(response.value.status);
    const record = matchRecordFromDocumentV7(response.value.body);
    return record === null
      ? onlineErrorV7("INVALID", "The match is malformed.")
      : onlineOkV7(record);
  };

  const commit = (body: object): Promise<OnlineResultV7<HttpResultV7>> =>
    request("POST", `${base}:commit?${key}`, body);
  const commitTime = (response: HttpResultV7): string => {
    const time = (response.body as { readonly commitTime?: unknown } | null)
      ?.commitTime;
    return typeof time === "string" ? time : new Date().toISOString();
  };

  /** Reads the match, checks the change like the rules, commits it. */
  const changeMatch = async (
    code: string,
    change: (
      uid: string,
      before: OnlineMatchRecordV7,
      now: string,
    ) => OnlineResultV7<OnlineMatchRecordV7>,
  ): Promise<OnlineResultV7<OnlineMatchRecordV7>> => {
    const session = await auth.session();
    if (!session.ok)
      return onlineErrorV7(
        session.reason === "NETWORK" ? "NETWORK" : "AUTH",
        session.message,
      );
    const read = await getMatch(code);
    if (!read.ok) return read;
    if (read.value === null)
      return onlineErrorV7("NOT_FOUND", "No such match.");
    const before = read.value;
    const checked = change(session.session.uid, before, before.updatedAt);
    if (!checked.ok) return checked;
    const fields = changedFields(before, checked.value);
    const response = await commit(
      updateMatchCommitBodyV7(checked.value, fields, config.projectId),
    );
    if (!response.ok) return response;
    if (response.value.status !== 200) {
      // Refused: someone else changed the match first. Say why if we can.
      const again = await getMatch(code);
      if (again.ok && again.value !== null) {
        const retry = change(session.session.uid, again.value, "");
        if (!retry.ok) return retry;
      }
      return failure(response.value.status);
    }
    return onlineOkV7({
      ...checked.value,
      updatedAt: commitTime(response.value),
    });
  };

  return {
    kind: "FIRESTORE",
    async signIn() {
      const session = await auth.session();
      return session.ok
        ? onlineOkV7({ uid: session.session.uid })
        : onlineErrorV7(
            session.reason === "NETWORK" ? "NETWORK" : "AUTH",
            session.message,
          );
    },
    async createMatch(input) {
      const session = await auth.session();
      if (!session.ok)
        return onlineErrorV7(
          session.reason === "NETWORK" ? "NETWORK" : "AUTH",
          session.message,
        );
      for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS_V7; attempt += 1) {
        const code = generateRoomCodeV7(random);
        const created = createMatchRecordV7(
          session.session.uid,
          code,
          input,
          "",
        );
        if (!created.ok) return created;
        const response = await commit(
          createMatchCommitBodyV7(created.value, config.projectId),
        );
        if (!response.ok) return response;
        if (response.value.status === 200) {
          const time = commitTime(response.value);
          return onlineOkV7({
            ...created.value,
            createdAt: time,
            updatedAt: time,
          });
        }
        // A taken code is refused (by `exists: false` or by the rules,
        // which then judge the write as an update); look before retrying.
        const status = response.value.status;
        if (status !== 400 && status !== 403 && status !== 409)
          return failure(status);
        const taken = await getMatch(code);
        // A malformed document under the code is taken too.
        if (!taken.ok && taken.error.code !== "INVALID") return taken;
        if (taken.ok && taken.value === null) return failure(status);
      }
      return onlineErrorV7("CODE_EXHAUSTED", "No free room code was found.");
    },
    getMatch,
    joinMatch: (code, input) =>
      changeMatch(code, (uid, before, now) =>
        joinMatchRecordV7(uid, before, input, now),
      ),
    updateLobby: (code, patch) =>
      changeMatch(code, (uid, before, now) =>
        patchLobbyRecordV7(uid, before, patch, now),
      ),
    startMatch: (code, input) =>
      changeMatch(code, (uid, before, now) =>
        startMatchRecordV7(uid, before, input, now),
      ),
    abandonMatch: (code) =>
      changeMatch(code, (uid, before, now) =>
        abandonMatchRecordV7(uid, before, now),
      ),
    forfeitMatch: (code) =>
      changeMatch(code, (uid, before, now) =>
        forfeitMatchRecordV7(uid, before, now),
      ),
    async appendMove(code, move) {
      const session = await auth.session();
      if (!session.ok)
        return onlineErrorV7(
          session.reason === "NETWORK" ? "NETWORK" : "AUTH",
          session.message,
        );
      if (
        move.commandJson.length < 2 ||
        move.commandJson.length > ONLINE_COMMAND_JSON_MAX_V7 ||
        !/^[0-9a-f]{64}$/.test(move.stateHash)
      )
        return onlineErrorV7("INVALID", "The move is malformed.");
      const uid = session.session.uid;
      const response = await commit(
        appendMoveCommitBodyV7(code, uid, move, config.projectId),
      );
      if (!response.ok) return response;
      if (response.value.status === 200)
        return onlineOkV7({
          index: move.index,
          seat: move.seat,
          uid,
          commandJson: move.commandJson,
          stateHash: move.stateHash,
          createdAt: commitTime(response.value),
        });
      const status = response.value.status;
      if (status === 429 || status >= 500) return failure(status);
      // Refused: say whether the index was taken or the turn is not ours.
      const read = await getMatch(code);
      if (!read.ok) return read;
      if (read.value === null) return onlineErrorV7("NOT_FOUND");
      if (read.value.moveCount > move.index)
        return onlineErrorV7("INDEX_TAKEN", "That move was already played.");
      if (read.value.status !== "ACTIVE")
        return onlineErrorV7("NOT_ACTIVE", "The match is not being played.");
      return failure(status);
    },
    async getMoves(code, from, to) {
      const moves: OnlineMoveRecordV7[] = [];
      for (let start = Math.max(0, from); start < to;) {
        const end = Math.min(to, start + MOVES_PER_BATCH_V7);
        const response = await request(
          "POST",
          `${base}:batchGet?${key}`,
          movesBatchGetBodyV7(code, start, end, config.projectId),
        );
        if (!response.ok) return response;
        if (response.value.status !== 200)
          return failure(response.value.status);
        const items = Array.isArray(response.value.body)
          ? (response.value.body as readonly unknown[])
          : [];
        const found = new Map<number, OnlineMoveRecordV7>();
        for (const item of items) {
          const document = (item as { readonly found?: unknown } | null)?.found;
          const move =
            document === undefined ? null : moveRecordFromDocumentV7(document);
          if (move !== null) found.set(move.index, move);
        }
        for (let index = start; index < end; index += 1) {
          const move = found.get(index);
          if (move === undefined) return onlineOkV7(moves);
          moves.push(move);
        }
        start = end;
      }
      return onlineOkV7(moves);
    },
    watchMatch(code, listener, watchOptions) {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let last: string | null = null;
      let failing = false;
      const interval = (): number => {
        const visible = options.visible?.() ?? defaultVisibleV7();
        const base = visible
          ? FIRESTORE_POLL_VISIBLE_MS_V7
          : FIRESTORE_POLL_HIDDEN_MS_V7;
        const asked = watchOptions?.intervalMs?.();
        return visible ? (asked ?? base) : Math.max(asked ?? base, base);
      };
      const poll = async (): Promise<void> => {
        if (stopped) return;
        const read = await getMatch(code);
        if (stopped) return;
        if (!read.ok) {
          if (!failing) listener(null, read.error);
          failing = true;
        } else {
          failing = false;
          const seen = read.value === null ? "" : JSON.stringify(read.value);
          if (seen !== last) {
            last = seen;
            listener(read.value, null);
          }
        }
        timer = setTimeout(() => void poll(), interval());
      };
      void poll();
      return () => {
        stopped = true;
        if (timer !== null) clearTimeout(timer);
      };
    },
  };
}

function defaultVisibleV7(): boolean {
  const document = (
    globalThis as { readonly document?: { readonly visibilityState?: string } }
  ).document;
  return document?.visibilityState !== "hidden";
}
