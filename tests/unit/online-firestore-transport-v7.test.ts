import { afterEach, describe, expect, it, vi } from "vitest";
import { RULESET_7_ID } from "../../src/engine/v7/types";
import {
  FirebaseAnonymousAuthV7,
  ONLINE_AUTH_STORAGE_KEY_V7,
  type FetchV7,
} from "../../src/online/firebase-auth";
import {
  FIRESTORE_POLL_HIDDEN_MS_V7,
  FIRESTORE_POLL_VISIBLE_MS_V7,
  createFirestoreOnlineTransportV7,
  matchDocumentNameV7,
  moveDocumentNameV7,
} from "../../src/online/firestore-transport";
import { onlineOptionsJsonV7 } from "../../src/online/match";
import { onlineOptionsFixtureV7, sequenceRandomV7 } from "./online-v7.shared";

/**
 * The Firestore REST transport and the anonymous sign-in against a stubbed
 * `fetch` (`pulp_wars-eqc6.1`): nothing here reaches a network, and the
 * project is a made-up one.
 */
const CONFIG = { projectId: "test-project", apiKey: "test-key" } as const;
const DOCS = "projects/test-project/databases/(default)/documents";
const ROOT = `https://firestore.googleapis.com/v1/${DOCS}`;
const TIME = "2026-10-29T12:00:00.000000Z";
const HASH = "b".repeat(64);

interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

type Doc = { name: string; fields: Record<string, unknown> };

/**
 * A tiny stand-in for Identity Toolkit, Secure Token and Firestore: it
 * signs up, refreshes, reads documents, applies commits (with their
 * preconditions, masks and REQUEST_TIME transforms; no security rules)
 * and answers batchGets, recording every request.
 */
function fakeGoogle() {
  const calls: Call[] = [];
  const docs = new Map<string, Doc>();
  let tokens = 0;
  let unauthorizedOnce = false;
  const respond = (status: number, body: unknown) =>
    Promise.resolve({
      ok: status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  const fetch: FetchV7 = (url, init) => {
    const body =
      init?.body === undefined
        ? undefined
        : init.headers?.["Content-Type"] === "application/json"
          ? (JSON.parse(init.body) as unknown)
          : init.body;
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: init?.headers ?? {},
      body,
    });
    if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
      tokens += 1;
      return respond(200, {
        localId: "uid-1",
        idToken: `id-${tokens}`,
        refreshToken: `refresh-${tokens}`,
        expiresIn: "3600",
      });
    }
    if (url.startsWith("https://securetoken.googleapis.com/")) {
      tokens += 1;
      return respond(200, {
        id_token: `id-${tokens}`,
        refresh_token: `refresh-${tokens}`,
        expires_in: "3600",
        user_id: "uid-1",
      });
    }
    if (unauthorizedOnce) {
      unauthorizedOnce = false;
      return respond(401, { error: { status: "UNAUTHENTICATED" } });
    }
    const path = url.slice(ROOT.length).split("?")[0] ?? "";
    if ((init?.method ?? "GET") === "GET") {
      const doc = docs.get(`${DOCS}${path}`);
      return doc === undefined
        ? respond(404, { error: { status: "NOT_FOUND" } })
        : respond(200, doc);
    }
    if (path === ":commit") {
      const writes = (body as { writes: Record<string, unknown>[] }).writes;
      const next = new Map(docs);
      for (const write of writes) {
        const update = write.update as Doc;
        const exists = next.has(update.name);
        const want = (write.currentDocument as { exists?: boolean } | undefined)
          ?.exists;
        if (want !== undefined && want !== exists)
          return respond(want ? 404 : 409, {
            error: { status: want ? "NOT_FOUND" : "ALREADY_EXISTS" },
          });
        const mask = (write.updateMask as { fieldPaths: string[] } | undefined)
          ?.fieldPaths;
        const fields: Record<string, unknown> =
          mask === undefined
            ? { ...update.fields }
            : { ...(next.get(update.name)?.fields ?? {}) };
        if (mask !== undefined)
          for (const field of mask) fields[field] = update.fields[field];
        for (const transform of (write.updateTransforms ?? []) as {
          fieldPath: string;
        }[])
          fields[transform.fieldPath] = { timestampValue: TIME };
        next.set(update.name, { name: update.name, fields });
      }
      for (const [name, doc] of next) docs.set(name, doc);
      return respond(200, { commitTime: TIME, writeResults: [] });
    }
    if (path === ":batchGet") {
      const names = (body as { documents: string[] }).documents;
      return respond(
        200,
        [...names].reverse().map((name) => {
          const doc = docs.get(name);
          return doc === undefined ? { missing: name } : { found: doc };
        }),
      );
    }
    return respond(400, { error: { status: "INVALID_ARGUMENT" } });
  };
  return {
    fetch,
    calls,
    docs,
    unauthorizedNext: () => {
      unauthorizedOnce = true;
    },
  };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

function transportFor(
  google: ReturnType<typeof fakeGoogle>,
  random = sequenceRandomV7([0]),
  visible: () => boolean = () => true,
) {
  return createFirestoreOnlineTransportV7({
    fetch: google.fetch,
    storage: memoryStorage(),
    config: CONFIG,
    random,
    visible,
  });
}

const CREATE = {
  rulesetId: RULESET_7_ID,
  hostName: "Ada",
  hostPick: "ORIGINAL",
  optionsJson: onlineOptionsJsonV7(onlineOptionsFixtureV7()),
};

afterEach(() => {
  vi.useRealTimers();
});

describe("Firebase anonymous sign-in over REST", () => {
  it("signs up once, keeps the refresh token, and refreshes when stale", async () => {
    const google = fakeGoogle();
    const storage = memoryStorage();
    let now = 1_000_000;
    const auth = new FirebaseAnonymousAuthV7({
      apiKey: "test-key",
      fetch: google.fetch,
      storage,
      now: () => now,
    });
    const first = await auth.session();
    expect(first).toEqual({
      ok: true,
      session: { uid: "uid-1", idToken: "id-1" },
    });
    expect(google.calls[0]).toMatchObject({
      url: "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key",
      method: "POST",
      body: { returnSecureToken: true },
    });
    expect(
      JSON.parse(storage.map.get(ONLINE_AUTH_STORAGE_KEY_V7) ?? ""),
    ).toEqual({ uid: "uid-1", refreshToken: "refresh-1" });
    // Fresh: no request.
    await auth.session();
    expect(google.calls).toHaveLength(1);
    // An hour later the token is refreshed through Secure Token.
    now += 3600 * 1000;
    const refreshed = await auth.session();
    expect(refreshed.ok && refreshed.session.idToken).toBe("id-2");
    expect(google.calls[1]).toMatchObject({
      url: "https://securetoken.googleapis.com/v1/token?key=test-key",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=refresh_token&refresh_token=refresh-1",
    });
    // A new page keeps the same account: a refresh, not a sign-up.
    const again = new FirebaseAnonymousAuthV7({
      apiKey: "test-key",
      fetch: google.fetch,
      storage,
      now: () => now,
    });
    expect(again.uid).toBe("uid-1");
    await again.session();
    expect(google.calls[2]?.url).toContain("securetoken.googleapis.com");
  });

  it("reports a failed sign-up as a network problem", async () => {
    const auth = new FirebaseAnonymousAuthV7({
      apiKey: "k",
      fetch: () => Promise.reject(new Error("offline")),
    });
    expect(await auth.session()).toMatchObject({
      ok: false,
      reason: "NETWORK",
    });
  });
});

describe("the Firestore REST transport", () => {
  it("creates a lobby with one commit, drawing again on a taken code", async () => {
    const google = fakeGoogle();
    google.docs.set(`${DOCS}/matches/AAAAA`, {
      name: `${DOCS}/matches/AAAAA`,
      fields: {},
    });
    const transport = transportFor(
      google,
      sequenceRandomV7([0, 0, 0, 0, 0, 0.05, 0.05, 0.05, 0.05, 0.05]),
    );
    const created = await transport.createMatch(CREATE);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.value).toMatchObject({
      code: "BBBBB",
      status: "LOBBY",
      hostUid: "uid-1",
      createdAt: TIME,
    });
    const commits = google.calls.filter((call) => call.url.includes(":commit"));
    expect(commits).toHaveLength(2);
    const body = commits[1]?.body as { writes: Record<string, unknown>[] };
    expect(commits[1]?.url).toBe(`${ROOT}:commit?key=test-key`);
    expect(commits[1]?.headers.Authorization).toBe("Bearer id-1");
    expect(body.writes).toHaveLength(1);
    expect(body.writes[0]).toMatchObject({
      update: { name: `${DOCS}/matches/BBBBB` },
      currentDocument: { exists: false },
      updateTransforms: [
        { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
        { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
      ],
    });
    const fields = (body.writes[0]?.update as Doc).fields;
    expect(fields).toMatchObject({
      code: { stringValue: "BBBBB" },
      status: { stringValue: "LOBBY" },
      guestUid: { stringValue: "" },
      guestReady: { booleanValue: false },
      moveCount: { integerValue: "0" },
      driverUids: { arrayValue: {} },
    });
    expect(Object.keys(fields).sort()).toEqual(
      [
        "code",
        "driverUids",
        "guestName",
        "guestPick",
        "guestReady",
        "guestUid",
        "hostName",
        "hostPick",
        "hostUid",
        "moveCount",
        "optionsJson",
        "rulesetId",
        "setupJson",
        "status",
        "turnSeat",
      ].sort(),
    );
    // The stored document reads back as the same record.
    const read = await transport.getMatch("BBBBB");
    expect(read.ok && read.value).toEqual(created.value);
    expect(await transport.getMatch("CCCCC")).toEqual({
      ok: true,
      value: null,
    });
  });

  it("joins with an update mask of the guest's fields only", async () => {
    const google = fakeGoogle();
    const host = transportFor(google);
    const created = await host.createMatch(CREATE);
    if (!created.ok) throw new Error(created.error.code);
    // Pretend the stored lobby belongs to someone else, so uid-1 may join.
    const name = `${DOCS}/matches/${created.value.code}`;
    const doc = google.docs.get(name) as Doc;
    doc.fields.hostUid = { stringValue: "other-host" };
    const joined = await host.joinMatch(created.value.code, {
      name: "Bo",
      pick: "GOBLIN",
      ready: true,
    });
    expect(joined.ok && joined.value.guestUid).toBe("uid-1");
    const commit = google.calls.at(-1)?.body as {
      writes: Record<string, unknown>[];
    };
    expect(commit.writes[0]).toMatchObject({
      updateMask: {
        fieldPaths: ["guestUid", "guestName", "guestPick", "guestReady"],
      },
      currentDocument: { exists: true },
      updateTransforms: [
        { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
      ],
    });
    // A second join finds the seat taken without writing.
    const writes = google.calls.length;
    const again = await host.joinMatch(created.value.code, {
      name: "Cy",
      pick: "RANDOM",
      ready: true,
    });
    expect(!again.ok && again.error.code).toBe("SEAT_TAKEN");
    expect(
      google.calls.slice(writes).some((call) => call.url.includes(":commit")),
    ).toBe(false);
  });

  it("forfeits with an update mask of the status and the two forfeit fields (pulp_wars-eqc6.5)", async () => {
    const google = fakeGoogle();
    const host = transportFor(google);
    const created = await host.createMatch(CREATE);
    if (!created.ok) throw new Error(created.error.code);
    // A game in play: uid-1 hosts, someone else is seated.
    const name = `${DOCS}/matches/${created.value.code}`;
    const doc = google.docs.get(name) as Doc;
    doc.fields.status = { stringValue: "ACTIVE" };
    doc.fields.guestUid = { stringValue: "guest-uid" };
    doc.fields.guestName = { stringValue: "Bo" };
    const forfeited = await host.forfeitMatch(created.value.code);
    expect(forfeited.ok && forfeited.value).toMatchObject({
      status: "FINISHED",
      forfeitSeat: 0,
      forfeitUid: "uid-1",
    });
    const commit = google.calls.at(-1)?.body as {
      writes: Record<string, unknown>[];
    };
    expect(commit.writes).toHaveLength(1);
    expect(commit.writes[0]).toMatchObject({
      update: {
        fields: {
          status: { stringValue: "FINISHED" },
          forfeitSeat: { integerValue: "0" },
          forfeitUid: { stringValue: "uid-1" },
        },
      },
      updateMask: { fieldPaths: ["status", "forfeitSeat", "forfeitUid"] },
      currentDocument: { exists: true },
      updateTransforms: [
        { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
      ],
    });
    // Read back, the match carries the forfeit; a second one is refused
    // before any write.
    const read = await host.getMatch(created.value.code);
    expect(read.ok && read.value).toMatchObject({
      status: "FINISHED",
      forfeitSeat: 0,
      forfeitUid: "uid-1",
    });
    const writes = google.calls.length;
    const again = await host.forfeitMatch(created.value.code);
    expect(!again.ok && again.error.code).toBe("NOT_ACTIVE");
    expect(
      google.calls.slice(writes).some((call) => call.url.includes(":commit")),
    ).toBe(false);
    // Half a forfeit is a malformed document.
    const stored = google.docs.get(name) as Doc;
    delete stored.fields.forfeitUid;
    const broken = await host.getMatch(created.value.code);
    expect(broken.ok).toBe(false);
  });

  it("appends a move and bumps the count in one commit; a taken index is INDEX_TAKEN", async () => {
    const google = fakeGoogle();
    const transport = transportFor(google);
    const created = await transport.createMatch(CREATE);
    if (!created.ok) throw new Error(created.error.code);
    const code = created.value.code;
    const doc = google.docs.get(`${DOCS}/matches/${code}`) as Doc;
    doc.fields.status = { stringValue: "ACTIVE" };
    const move = {
      index: 0,
      seat: 0,
      commandJson: '{"kind":"END_TURN"}',
      stateHash: HASH,
      nextTurnSeat: 1,
      finished: false,
    };
    const appended = await transport.appendMove(code, move);
    expect(appended).toMatchObject({
      ok: true,
      value: { index: 0, uid: "uid-1", stateHash: HASH, createdAt: TIME },
    });
    const body = google.calls.at(-1)?.body as {
      writes: Record<string, unknown>[];
    };
    expect(body.writes).toEqual([
      {
        update: {
          name: moveDocumentNameV7(code, 0, "test-project"),
          fields: {
            index: { integerValue: "0" },
            seat: { integerValue: "0" },
            uid: { stringValue: "uid-1" },
            commandJson: { stringValue: '{"kind":"END_TURN"}' },
            stateHash: { stringValue: HASH },
          },
        },
        updateTransforms: [
          { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
        ],
        currentDocument: { exists: false },
      },
      {
        update: {
          name: matchDocumentNameV7(code, "test-project"),
          fields: {
            moveCount: { integerValue: "1" },
            turnSeat: { integerValue: "1" },
            status: { stringValue: "ACTIVE" },
          },
        },
        updateMask: { fieldPaths: ["moveCount", "turnSeat", "status"] },
        updateTransforms: [
          { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
        ],
        currentDocument: { exists: true },
      },
    ]);
    const read = await transport.getMatch(code);
    expect(read.ok && read.value?.moveCount).toBe(1);
    // The same index again: the move document exists, the commit fails,
    // and a read of the match tells why.
    const again = await transport.appendMove(code, move);
    expect(!again.ok && again.error.code).toBe("INDEX_TAKEN");
    // A malformed move never leaves the browser.
    const before = google.calls.length;
    const bad = await transport.appendMove(code, {
      ...move,
      index: 1,
      stateHash: "x",
    });
    expect(!bad.ok && bad.error.code).toBe("INVALID");
    expect(google.calls).toHaveLength(before);
  });

  it("reads moves with batchGet, in index order", async () => {
    const google = fakeGoogle();
    const transport = transportFor(google);
    const created = await transport.createMatch(CREATE);
    if (!created.ok) throw new Error(created.error.code);
    const code = created.value.code;
    const doc = google.docs.get(`${DOCS}/matches/${code}`) as Doc;
    doc.fields.status = { stringValue: "ACTIVE" };
    for (let index = 0; index < 3; index += 1) {
      const appended = await transport.appendMove(code, {
        index,
        seat: 0,
        commandJson: `{"kind":"END_TURN","n":${index}}`,
        stateHash: HASH,
        nextTurnSeat: 0,
        finished: false,
      });
      expect(appended.ok).toBe(true);
    }
    const moves = await transport.getMoves(code, 0, 5);
    expect(moves.ok && moves.value.map((move) => move.index)).toEqual([
      0, 1, 2,
    ]);
    const call = google.calls.at(-1);
    expect(call?.url).toBe(`${ROOT}:batchGet?key=test-key`);
    expect(call?.body).toEqual({
      documents: [0, 1, 2, 3, 4].map((index) =>
        moveDocumentNameV7(code, index, "test-project"),
      ),
    });
  });

  it("refreshes the token once on a 401 and retries", async () => {
    const google = fakeGoogle();
    const transport = transportFor(google);
    await transport.signIn();
    google.unauthorizedNext();
    expect(await transport.getMatch("ABCDE")).toEqual({
      ok: true,
      value: null,
    });
    expect(
      google.calls.filter((call) => call.url.includes("securetoken")),
    ).toHaveLength(1);
    expect(google.calls.at(-1)?.headers.Authorization).toBe("Bearer id-2");
  });

  it("polls the match every 2 s while visible and 15 s while hidden", async () => {
    vi.useFakeTimers();
    const google = fakeGoogle();
    let visible = true;
    const transport = transportFor(
      google,
      sequenceRandomV7([0]),
      () => visible,
    );
    const created = await transport.createMatch(CREATE);
    if (!created.ok) throw new Error(created.error.code);
    const seen: (string | null)[] = [];
    const stop = transport.watchMatch(created.value.code, (record) =>
      seen.push(record?.guestUid ?? null),
    );
    const reads = () =>
      google.calls.filter(
        (call) => call.method === "GET" && call.url.includes("/matches/"),
      ).length;
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toEqual([""]);
    const first = reads();
    await vi.advanceTimersByTimeAsync(FIRESTORE_POLL_VISIBLE_MS_V7);
    expect(reads()).toBe(first + 1);
    // Unchanged: no second callback.
    expect(seen).toEqual([""]);
    visible = false;
    await vi.advanceTimersByTimeAsync(FIRESTORE_POLL_VISIBLE_MS_V7);
    const hidden = reads();
    await vi.advanceTimersByTimeAsync(FIRESTORE_POLL_HIDDEN_MS_V7 - 1);
    expect(reads()).toBe(hidden);
    await vi.advanceTimersByTimeAsync(1);
    expect(reads()).toBe(hidden + 1);
    stop();
    await vi.advanceTimersByTimeAsync(FIRESTORE_POLL_HIDDEN_MS_V7 * 2);
    expect(reads()).toBe(hidden + 1);
  });
});
