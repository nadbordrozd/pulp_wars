import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIREBASE_CONFIG_V7,
  LEADERBOARD_COLLECTION_V7,
  LEADERBOARD_NAME_PATTERN_V7,
  LEADERBOARD_NAME_STORAGE_KEY_V7,
  LEADERBOARD_SCORE_MAX_V7,
  LEADERBOARD_SUBMITTED_STORAGE_KEY_V7,
  LeaderboardErrorV7,
  NO_LEADERBOARD_V7,
  createGameLeaderboardV7,
  firestoreCreateBodyV7,
  firestoreLeaderboardBackendV7,
  firestoreRankQueryBodyV7,
  firestoreTopQueryBodyV7,
  firestoreUrlV7,
  leaderboardClaimV7,
  leaderboardDocumentIdV7,
  leaderboardFieldProblemsV7,
  leaderboardModeV7,
  leaderboardNameProblemV7,
  leaderboardRankV7,
  leaderboardRegularGameV7,
  memoryLeaderboardBackendV7,
  normalizeLeaderboardNameV7,
  parseFirestoreCountV7,
  parseFirestoreTopV7,
  rudeLeaderboardNameV7,
  type LeaderboardBackendV7,
  type LeaderboardClaimV7,
  type LeaderboardFetchV7,
  type LeaderboardSubmissionV7,
} from "../../src/app/leaderboard-v7";
import { FACTION_IDS_V7, RULESET_7_ID } from "../../src/engine/v7/types";
import { viewForV7, type GameStateV7 } from "../../src/engine/index";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  scoreDominationVictoryV7,
  scorePerfectionEndV7,
  scoreUiStateV7,
} from "../fixtures/v7-score-ui";

/**
 * The public leaderboard's logic (bead pulp_wars-2yc.104,
 * docs/LEADERBOARD.md): names and the rude-word filter, the claim of a won
 * match, the Firestore REST requests against a stubbed fetch (shapes,
 * errors, timeouts), the rank, once per match, the cache, the production
 * gate, and the security rules kept in step with the client. Nothing here
 * reaches the real project: every fetch is a stub.
 */

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  refuse = false;
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.refuse) throw new Error("QuotaExceededError");
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const ENTRY: LeaderboardSubmissionV7 = {
  name: "Captain Nova",
  faction: "MARTIAN",
  score: 812,
  mode: "DOMINATION",
  rounds: 24,
  version: RULESET_7_ID,
};

const CLAIM: LeaderboardClaimV7 = {
  matchKey: "m0001",
  faction: "MARTIAN",
  score: 812,
  mode: "DOMINATION",
  rounds: 24,
  version: RULESET_7_ID,
};

/** The view of a state, recorded as a regular game (pulp_wars-2yc.103). */
const view = (
  state: GameStateV7,
  kind: "REGULAR" | "CUSTOM" | null = "REGULAR",
) =>
  viewForV7(
    kind === null
      ? state
      : { ...state, setup: { ...state.setup, gameKind: kind } },
    state.humanPlayerId,
  );

interface Call {
  readonly url: string;
  readonly init: RequestInit;
  readonly body: Record<string, unknown>;
}

/** A fetch that records calls and answers from `answer`. */
function stubFetch(
  answer: (call: Call) => Promise<{ status: number; body: unknown }>,
): { fetch: LeaderboardFetchV7; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      const call = {
        url,
        init,
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      };
      calls.push(call);
      const { status, body } = await answer(call);
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      };
    },
  };
}

const firestoreDoc = (
  id: string,
  fields: Record<string, string | number>,
): unknown => ({
  document: {
    name: `projects/vibe-crawler/databases/(default)/documents/pulpWarsScores/${id}`,
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        typeof value === "number"
          ? { integerValue: String(value) }
          : key === "timestamp"
            ? { timestampValue: value }
            : { stringValue: value },
      ]),
    ),
  },
  readTime: "2026-10-19T10:00:00Z",
});

describe("leaderboard names", () => {
  it("trims, collapses spaces and checks length and characters", () => {
    expect(normalizeLeaderboardNameV7("  Doc   Savage \t")).toBe("Doc Savage");
    expect(leaderboardNameProblemV7("")).toBe("EMPTY");
    expect(leaderboardNameProblemV7("A")).toBeNull();
    expect(leaderboardNameProblemV7("x".repeat(16))).toBeNull();
    expect(leaderboardNameProblemV7("x".repeat(17))).toBe("TOO_LONG");
    for (const name of ["O'Brien", "Rex-2", "Hi, Mom!", "z_z", "Who?", "J.R."])
      expect(leaderboardNameProblemV7(name)).toBeNull();
    for (const name of ["<b>", "Zoë", "a/b", "名前", "x\ny", " lead", "tab\t"])
      expect(leaderboardNameProblemV7(name)).toBe("CHARACTERS");
  });

  it("refuses rude names, disguised too, and keeps innocent ones", () => {
    for (const name of [
      "fuck",
      "FuCk You",
      "f u c k",
      "Sh1t Lord",
      "a$$",
      "big dick",
      "Nazis",
      "b1tch",
    ])
      expect(rudeLeaderboardNameV7(name), name).toBe(true);
    for (const name of [
      "Assassin",
      "Classic",
      "Dickens",
      "Grumblebeard",
      "Count Dread",
      "Snaggletooth",
      "Passion",
      "Analyst",
      "Cocky Rooster".replace("Cocky ", "Lucky "),
    ])
      expect(rudeLeaderboardNameV7(name), name).toBe(false);
    expect(leaderboardNameProblemV7("shitake")).toBe("RUDE");
  });
});

describe("leaderboard field checks", () => {
  it("accepts a valid submission and names each bad field", () => {
    expect(leaderboardFieldProblemsV7(ENTRY)).toEqual([]);
    expect(
      leaderboardFieldProblemsV7({
        ...ENTRY,
        name: "",
        faction: "ELVES" as never,
        score: 1.5,
        mode: "BLITZ" as never,
        rounds: 0,
        version: "v7",
      }),
    ).toEqual(["name:EMPTY", "faction", "score", "mode", "rounds", "version"]);
    expect(
      leaderboardFieldProblemsV7({ ...ENTRY, score: LEADERBOARD_SCORE_MAX_V7 }),
    ).toEqual([]);
    expect(
      leaderboardFieldProblemsV7({
        ...ENTRY,
        score: LEADERBOARD_SCORE_MAX_V7 + 1,
      }),
    ).toEqual(["score"]);
    // Perfection ends at round 30.
    expect(
      leaderboardFieldProblemsV7({ ...ENTRY, mode: "PERFECTION", rounds: 31 }),
    ).toEqual(["rounds"]);
    expect(leaderboardFieldProblemsV7({ ...ENTRY, rounds: 31 })).toEqual([]);
  });

  it("ranks a score as one more than the scores strictly above it", () => {
    const rows = [{ score: 900 }, { score: 812 }, { score: 812 }, { score: 5 }];
    expect(leaderboardRankV7(rows, 1000)).toBe(1);
    expect(leaderboardRankV7(rows, 900)).toBe(1);
    expect(leaderboardRankV7(rows, 812)).toBe(2);
    expect(leaderboardRankV7(rows, 811)).toBe(4);
    expect(leaderboardRankV7([], 0)).toBe(1);
  });
});

describe("the claim of a finished match", () => {
  it("a Domination win submits the grade's score, rounds and faction", () => {
    const won = view(scoreDominationVictoryV7());
    const claim = leaderboardClaimV7(won);
    expect(claim).not.toBeNull();
    expect(claim?.mode).toBe("DOMINATION");
    expect(claim?.score).toBe(won.score.summary?.grade.score);
    expect(claim?.rounds).toBe(won.score.summary?.endRound);
    expect(claim?.faction).toBe(
      won.players.find((player) => player.id === won.humanPlayerId)?.faction,
    );
    expect(claim?.version).toBe(RULESET_7_ID);
    // The same match always has the same key; another does not.
    expect(leaderboardClaimV7(view(scoreDominationVictoryV7()))?.matchKey).toBe(
      claim?.matchKey,
    );
    expect(
      leaderboardClaimV7(
        view(scoreDominationVictoryV7(false, { extraKillValue: 10 })),
      )?.matchKey,
    ).not.toBe(claim?.matchKey);
  });

  it("a Perfection win ranked first submits; a defeat and a running match do not", () => {
    const claim = leaderboardClaimV7(view(scorePerfectionEndV7(true)));
    expect(claim?.mode).toBe("PERFECTION");
    expect(claim?.rounds).toBe(30);
    expect(leaderboardClaimV7(view(scorePerfectionEndV7(false)))).toBeNull();
    expect(
      leaderboardClaimV7(view(scoreUiStateV7("DOMINATION", 12))),
    ).toBeNull();
  });

  it("only a Regular game is submitted", () => {
    const won = view(scoreDominationVictoryV7());
    expect(leaderboardClaimV7(won)).not.toBeNull();
    expect(leaderboardClaimV7(won, () => false)).toBeNull();
    expect(leaderboardRegularGameV7(won.setup)).toBe(true);
    // A custom game (pulp_wars-2yc.103) never goes to the board: one
    // recorded as custom, and the fixture's Dry land 16 x 16 setup, which
    // is not a quick-start shape, with no recorded kind.
    expect(
      leaderboardClaimV7(view(scoreDominationVictoryV7(), "CUSTOM")),
    ).toBeNull();
    const unrecorded = scoreDominationVictoryV7();
    const { gameKind: _kind, ...bare } = unrecorded.setup;
    void _kind;
    expect(
      leaderboardClaimV7(view({ ...unrecorded, setup: bare }, null)),
    ).toBeNull();
    for (const changed of [
      { ...won.setup, mapType: "MISSION" as const },
      { ...won.setup, mapType: "SHOWCASE" as const },
      { ...won.setup, allowDuplicateFactions: true as const },
    ])
      expect(leaderboardRegularGameV7(changed)).toBe(false);
  });
});

describe("Firestore REST requests", () => {
  it("creates a score with commit, a server timestamp and exists: false", async () => {
    const { fetch, calls } = stubFetch(async () => ({
      status: 200,
      body: { writeResults: [{}], commitTime: "2026-10-19T10:00:00Z" },
    }));
    const backend = firestoreLeaderboardBackendV7({ fetch, random: () => 0 });
    const id = await backend.submit(ENTRY);
    expect(id).toBe("A".repeat(20));
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.url).toBe(
      `https://firestore.googleapis.com/v1/projects/vibe-crawler/databases/(default)/documents:commit?key=${FIREBASE_CONFIG_V7.apiKey}`,
    );
    expect(call?.init.method).toBe("POST");
    expect(call?.init.cache).toBe("no-store");
    expect(call?.init.credentials).toBe("omit");
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(call?.body).toEqual({
      writes: [
        {
          update: {
            name: `projects/vibe-crawler/databases/(default)/documents/${LEADERBOARD_COLLECTION_V7}/${id}`,
            fields: {
              name: { stringValue: "Captain Nova" },
              faction: { stringValue: "MARTIAN" },
              score: { integerValue: "812" },
              mode: { stringValue: "DOMINATION" },
              rounds: { integerValue: "24" },
              version: { stringValue: RULESET_7_ID },
            },
          },
          updateTransforms: [
            { fieldPath: "timestamp", setToServerValue: "REQUEST_TIME" },
          ],
          currentDocument: { exists: false },
        },
      ],
    });
    expect(firestoreCreateBodyV7(id, ENTRY)).toEqual(call?.body);
  });

  it("reads the top of a mode by score and parses the rows", async () => {
    const { fetch, calls } = stubFetch(async () => ({
      status: 200,
      body: [
        firestoreDoc("a1", {
          name: "Rex",
          faction: "DINOSAUR",
          score: 975,
          mode: "DOMINATION",
          rounds: 29,
          version: RULESET_7_ID,
          timestamp: "2026-10-18T09:00:00Z",
        }),
        // A malformed row (no faction) is left out.
        firestoreDoc("bad", {
          name: "Ghost",
          score: 5,
          mode: "DOMINATION",
          rounds: 2,
          version: RULESET_7_ID,
        }),
        { readTime: "2026-10-19T10:00:00Z" },
      ],
    }));
    const backend = firestoreLeaderboardBackendV7({ fetch });
    const rows = await backend.top("DOMINATION", 50);
    expect(calls[0]?.url).toBe(firestoreUrlV7("runQuery"));
    expect(calls[0]?.body).toEqual({
      structuredQuery: {
        from: [{ collectionId: "pulpWarsScores" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "mode" },
            op: "EQUAL",
            value: { stringValue: "DOMINATION" },
          },
        },
        orderBy: [{ field: { fieldPath: "score" }, direction: "DESCENDING" }],
        limit: 50,
      },
    });
    expect(firestoreTopQueryBodyV7("DOMINATION", 50)).toEqual(calls[0]?.body);
    expect(rows).toEqual([
      {
        id: "a1",
        name: "Rex",
        faction: "DINOSAUR",
        score: 975,
        mode: "DOMINATION",
        rounds: 29,
        version: RULESET_7_ID,
        timestamp: "2026-10-18T09:00:00Z",
      },
    ]);
    expect(parseFirestoreTopV7({ error: "x" })).toEqual([]);
  });

  it("counts the scores above with an aggregation query", async () => {
    const { fetch, calls } = stubFetch(async () => ({
      status: 200,
      body: [
        {
          result: { aggregateFields: { above: { integerValue: "6" } } },
          readTime: "2026-10-19T10:00:00Z",
        },
      ],
    }));
    const backend = firestoreLeaderboardBackendV7({ fetch });
    expect(await backend.countAbove("PERFECTION", 700)).toBe(6);
    expect(calls[0]?.url).toBe(firestoreUrlV7("runAggregationQuery"));
    expect(calls[0]?.body).toEqual(firestoreRankQueryBodyV7("PERFECTION", 700));
    const query = (
      calls[0]?.body.structuredAggregationQuery as {
        structuredQuery: { where: { compositeFilter: { filters: unknown[] } } };
      }
    ).structuredQuery;
    expect(query.where.compositeFilter.filters).toContainEqual({
      fieldFilter: {
        field: { fieldPath: "score" },
        op: "GREATER_THAN",
        value: { integerValue: "700" },
      },
    });
    expect(parseFirestoreCountV7([{ readTime: "x" }])).toBeNull();
  });

  it("turns refusals, failures, offline and timeouts into soft reasons", async () => {
    const reason = async (promise: Promise<unknown>): Promise<string> => {
      try {
        await promise;
        return "none";
      } catch (error) {
        return error instanceof LeaderboardErrorV7 ? error.reason : "thrown";
      }
    };
    const answering = (status: number) =>
      firestoreLeaderboardBackendV7({
        fetch: stubFetch(async () => ({ status, body: {} })).fetch,
      });
    expect(await reason(answering(403).submit(ENTRY))).toBe("REFUSED");
    expect(await reason(answering(400).top("DOMINATION", 5))).toBe("REFUSED");
    expect(await reason(answering(500).top("DOMINATION", 5))).toBe("ERROR");
    const failing = firestoreLeaderboardBackendV7({
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    expect(await reason(failing.top("DOMINATION", 5))).toBe("ERROR");
    let online = false;
    const offline = firestoreLeaderboardBackendV7({
      fetch: stubFetch(async () => ({ status: 200, body: [] })).fetch,
      online: () => online,
    });
    expect(await reason(offline.top("DOMINATION", 5))).toBe("OFFLINE");
    online = true;
    expect(await reason(offline.top("DOMINATION", 5))).toBe("none");
    // A request that never answers is given up, and its fetch aborted.
    let signal: AbortSignal | undefined;
    const hanging = firestoreLeaderboardBackendV7({
      fetch: (_url, init) => {
        signal = init.signal ?? undefined;
        return new Promise(() => undefined);
      },
      timeoutMs: 20,
    });
    expect(await reason(hanging.submit(ENTRY))).toBe("TIMEOUT");
    expect(signal?.aborted).toBe(true);
    // An answer whose body never ends is given up too.
    const slowBody = firestoreLeaderboardBackendV7({
      fetch: async () => ({
        ok: true,
        status: 200,
        json: () => new Promise(() => undefined),
      }),
      timeoutMs: 20,
    });
    expect(await reason(slowBody.top("PERFECTION", 5))).toBe("TIMEOUT");
  });

  it("draws 20-character document ids", () => {
    expect(leaderboardDocumentIdV7()).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(leaderboardDocumentIdV7(() => 0.999999)).toBe("9".repeat(20));
  });
});

describe("the game's leaderboard", () => {
  it("submits once per match, remembers the name and the rank", async () => {
    const storage = new MemoryStorage();
    const backend = memoryLeaderboardBackendV7([
      { ...ENTRY, id: "x1", name: "Zorg", score: 900, timestamp: null },
      { ...ENTRY, id: "x2", name: "Rex", score: 100, timestamp: null },
      {
        ...ENTRY,
        id: "x3",
        name: "Pip",
        score: 5_000,
        mode: "PERFECTION",
        rounds: 30,
        timestamp: null,
      },
    ]);
    const board = createGameLeaderboardV7(backend, { storage, live: false });
    expect(board.available).toBe(true);
    expect(board.lastName()).toBe("");
    expect(await board.submit(CLAIM, "  ")).toEqual({
      ok: false,
      reason: "NAME",
      problem: "EMPTY",
    });
    expect(await board.submit(CLAIM, "fuck it")).toMatchObject({
      reason: "NAME",
      problem: "RUDE",
    });
    expect(backend.entries).toHaveLength(3);
    const sent = await board.submit(CLAIM, "  Doc   Savage ");
    expect(sent).toEqual({
      ok: true,
      mode: "DOMINATION",
      id: "local-1",
      score: 812,
      rank: 2,
    });
    expect(backend.entries.at(-1)).toMatchObject({
      name: "Doc Savage",
      score: 812,
      mode: "DOMINATION",
      faction: "MARTIAN",
    });
    expect(board.lastName()).toBe("Doc Savage");
    expect(storage.values.get(LEADERBOARD_NAME_STORAGE_KEY_V7)).toBe(
      "Doc Savage",
    );
    // Again: nothing more is sent; the first answer is given back.
    expect(await board.submit(CLAIM, "Someone Else")).toEqual(sent);
    expect(backend.entries).toHaveLength(4);
    expect(board.sent(CLAIM.matchKey)).toEqual({
      mode: "DOMINATION",
      id: "local-1",
      score: 812,
      rank: 2,
    });
    expect(board.own("local-1")).toBe(true);
    expect(board.own("x1")).toBe(false);
    // A new visit remembers it too.
    const again = createGameLeaderboardV7(backend, { storage, live: false });
    expect(again.sent(CLAIM.matchKey)?.rank).toBe(2);
    expect(again.lastName()).toBe("Doc Savage");
    expect(await again.submit(CLAIM, "Doc Savage")).toMatchObject({ ok: true });
    expect(backend.entries).toHaveLength(4);
    expect(
      JSON.parse(
        storage.values.get(LEADERBOARD_SUBMITTED_STORAGE_KEY_V7) ?? "",
      ),
    ).toHaveLength(1);
  });

  it("refuses a second send while the first is out, and remembers without storage", async () => {
    let release: (() => void) | undefined;
    const slow: LeaderboardBackendV7 = {
      top: async () => [],
      submit: () =>
        new Promise((resolve) => {
          release = () => resolve("slow-1");
        }),
      countAbove: async () => 0,
    };
    const storage = new MemoryStorage();
    storage.refuse = true;
    const board = createGameLeaderboardV7(slow, { storage, live: false });
    const first = board.submit(CLAIM, "Doc");
    expect(await board.submit(CLAIM, "Doc")).toEqual({
      ok: false,
      reason: "BUSY",
    });
    release?.();
    expect(await first).toMatchObject({ ok: true, rank: 1 });
    expect(board.sent(CLAIM.matchKey)).not.toBeNull();
  });

  it("a failed send can be tried again; a failed rank still counts as sent", async () => {
    let fail = true;
    const backend: LeaderboardBackendV7 = {
      top: async () => [],
      submit: async () => {
        if (fail) throw new LeaderboardErrorV7("TIMEOUT");
        return "ok-1";
      },
      countAbove: async () => {
        throw new LeaderboardErrorV7("ERROR");
      },
    };
    const board = createGameLeaderboardV7(backend, {
      storage: null,
      live: true,
    });
    expect(await board.submit(CLAIM, "Doc")).toEqual({
      ok: false,
      reason: "TIMEOUT",
    });
    expect(board.sent(CLAIM.matchKey)).toBeNull();
    fail = false;
    expect(await board.submit(CLAIM, "Doc")).toEqual({
      ok: true,
      mode: "DOMINATION",
      id: "ok-1",
      score: 812,
      rank: null,
    });
  });

  it("caches a board briefly, refetches when asked, and fails softly", async () => {
    let now = 1_000;
    let calls = 0;
    let fail = false;
    const backend: LeaderboardBackendV7 = {
      top: async () => {
        calls += 1;
        if (fail) throw new LeaderboardErrorV7("OFFLINE");
        return [{ ...ENTRY, id: "a", timestamp: null }];
      },
      submit: async () => "id",
      countAbove: async () => 0,
    };
    const board = createGameLeaderboardV7(backend, {
      storage: null,
      live: true,
      now: () => now,
      cacheMs: 60_000,
    });
    expect(board.cached("DOMINATION")).toBeNull();
    const first = await board.load("DOMINATION");
    expect(first.ok).toBe(true);
    expect(board.cached("DOMINATION")).toEqual(first);
    now += 30_000;
    await board.load("DOMINATION");
    expect(calls).toBe(1);
    await board.load("DOMINATION", { fresh: true });
    expect(calls).toBe(2);
    now += 61_000;
    expect(board.cached("DOMINATION")).toBeNull();
    fail = true;
    expect(await board.load("DOMINATION")).toEqual({
      ok: false,
      reason: "OFFLINE",
    });
    // Two loads at once share one request.
    fail = false;
    await Promise.all([board.load("PERFECTION"), board.load("PERFECTION")]);
    expect(calls).toBe(4);
    // A send drops its board's cache, so the board shows the new row.
    await board.submit(CLAIM, "Doc");
    expect(board.cached("DOMINATION")).toBeNull();
  });

  it("no board: never available, never throws", async () => {
    expect(NO_LEADERBOARD_V7.available).toBe(false);
    expect(await NO_LEADERBOARD_V7.load("DOMINATION")).toMatchObject({
      ok: false,
    });
    expect(await NO_LEADERBOARD_V7.submit(CLAIM, "Doc")).toMatchObject({
      ok: false,
    });
  });
});

describe("where the real store is used", () => {
  const live = {
    production: true,
    hostname: "nadbordrozd.github.io",
    search: "",
    webdriver: false,
  };
  it("only the deployed site talks to Firestore", () => {
    expect(leaderboardModeV7(live)).toBe("LIVE");
    expect(leaderboardModeV7({ ...live, production: false })).toBe("STUB");
    expect(leaderboardModeV7({ ...live, hostname: "localhost" })).toBe("STUB");
    expect(leaderboardModeV7({ ...live, hostname: "127.0.0.1" })).toBe("STUB");
    expect(leaderboardModeV7({ ...live, hostname: "pulp.test" })).toBe("STUB");
    expect(leaderboardModeV7({ ...live, webdriver: true })).toBe("STUB");
    expect(leaderboardModeV7({ ...live, search: "?browser-smoke=1" })).toBe(
      "STUB",
    );
  });
});

describe("the security rules", () => {
  const rules = readFileSync("firebase/firestore.rules", "utf8");
  const crawl = rules.slice(
    rules.indexOf("// Leaderboard collection rules"),
    rules.indexOf("// ---- Pulp Wars"),
  );

  it("keep Vibe Crawler's leaderboard block and the catch-all deny", () => {
    expect(crawl).toContain("match /leaderboard/{scoreId} {");
    expect(crawl).toContain(
      "allow create: if isValidLeaderboardEntry(request.resource.data);",
    );
    expect(crawl).toContain("data.timestamp == request.time;");
    expect(rules).toMatch(
      /match \/\{document=\*\*\} \{\s+allow read, write: if false;/,
    );
    expect(rules).not.toMatch(/[ \t]+$/m);
  });

  it("check exactly the fields the client sends, the same way", () => {
    expect(rules).toContain("match /pulpWarsScores/{scoreId} {");
    expect(rules).toContain(
      "allow create: if isValidPulpWarsScore(request.resource.data);",
    );
    expect(rules).toMatch(/pulpWarsScores[\s\S]*allow update: if false;/);
    expect(rules).toMatch(/pulpWarsScores[\s\S]*allow delete: if false;/);
    const keys = Object.keys(firestoreCreateBodyV7("x", ENTRY)).length;
    expect(keys).toBe(1);
    const fields = [
      "name",
      "faction",
      "score",
      "mode",
      "rounds",
      "version",
      "timestamp",
    ];
    const list = `[${fields.map((field) => `'${field}'`).join(", ")}]`;
    expect(rules).toContain(`data.keys().hasAll(${list})`);
    expect(rules).toContain(`data.keys().hasOnly(${list})`);
    const factions = `[${FACTION_IDS_V7.map((id) => `'${id}'`).join(", ")}]`;
    expect(rules).toContain(`data.faction in ${factions}`);
    // The name pattern is the client's (RE2 has no non-capturing groups).
    const pattern = LEADERBOARD_NAME_PATTERN_V7.source.replace("(?:", "(");
    expect(rules).toContain(`data.name.matches("${pattern}")`);
    expect(rules).toContain(`data.score <= ${LEADERBOARD_SCORE_MAX_V7}`);
    expect(rules).toContain("data.score is int");
    expect(rules).toContain("data.rounds is int");
    expect(rules).toContain("(data.mode == 'DOMINATION' || data.rounds <= 30)");
    expect(rules).toContain(
      "data.version.matches('^pulp-wars-[a-z0-9-]{1,24}$')",
    );
    expect(RULESET_7_ID).toMatch(/^pulp-wars-[a-z0-9-]{1,24}$/);
    expect(rules).toMatch(
      /isValidPulpWarsScore[\s\S]*data\.timestamp == request\.time;/,
    );
  });
});
