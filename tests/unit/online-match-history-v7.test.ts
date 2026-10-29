import { afterEach, describe, expect, it } from "vitest";
import {
  OnlineMatchControllerV7,
  type OnlineAiWorkV7,
} from "../../src/app/online-match-controller-v7";
import type { GameStateV7 } from "../../src/engine/v7/types";
import {
  createMemoryOnlineServerV7,
  hostOnlineMatchV7,
  joinOnlineMatchV7,
  ONLINE_HISTORY_LIMIT_V7,
  ONLINE_HISTORY_STORAGE_KEY_V7,
  onlineHistoryDateLabelV7,
  onlineHistoryResultV7,
  onlineHistorySummaryV7,
  OnlineLobbySessionV7,
  OnlineLockstepV7,
  OnlineMatchHistoryV7,
  startOnlineMatchV7,
  type MemoryOnlineServerV7,
  type OnlineHistoryEntryV7,
  type OnlineMatchV7,
  type OnlineTransportV7,
} from "../../src/online/index";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  onlineOptionsFixtureV7,
  onlineSetupFixtureV7,
  onlineStateFixtureV7,
  sequenceRandomV7,
} from "./online-v7.shared";

/**
 * The online track record (`pulp_wars-eqc6.6`): the stored list, the
 * results, the match screen recording a match from its start to its end,
 * and the Play online session settling and resuming entries. Hand-built
 * states and hand-made commands on the in-memory store; no match is
 * played.
 */

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const NOW = "2026-10-29T12:00:00.000Z";

function entry(
  code: string,
  overrides: Partial<OnlineHistoryEntryV7> = {},
): OnlineHistoryEntryV7 {
  return {
    code,
    uid: "uid-1",
    seat: 0,
    startedAt: NOW,
    updatedAt: NOW,
    opponent: "Bob",
    faction: "ORIGINAL",
    opponentFaction: "GOBLIN",
    aiSeats: 1,
    mapType: "CONTINENTS",
    width: 14,
    gameMode: "DOMINATION",
    turns: 3,
    result: "IN_PROGRESS",
    score: null,
    ...overrides,
  };
}

/** Five letters from a number (room codes for many entries). */
function codeOf(index: number): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  let value = index;
  for (let place = 0; place < 5; place += 1) {
    code += letters[value % letters.length];
    value = Math.floor(value / letters.length);
  }
  return code;
}

const controllers: OnlineMatchControllerV7[] = [];
const clients: OnlineLockstepV7[] = [];
const sessions: OnlineLobbySessionV7[] = [];
afterEach(() => {
  for (const controller of controllers.splice(0)) controller.destroy();
  for (const client of clients.splice(0)) client.stop();
  for (const session of sessions.splice(0)) {
    session.state.handoff?.client.stop();
    session.destroy();
  }
});

async function settle(...waiting: readonly OnlineLockstepV7[]): Promise<void> {
  for (let round = 0; round < 6; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.all(waiting.map((item) => item.settled()));
  }
}

interface Table {
  readonly server: MemoryOnlineServerV7;
  readonly host: OnlineTransportV7;
  readonly guest: OnlineTransportV7;
  readonly match: OnlineMatchV7;
}

async function startedTable(aiSeats = 0): Promise<Table> {
  const server = createMemoryOnlineServerV7();
  const host = server.transport("host-uid", {
    random: sequenceRandomV7([0.1, 0.2, 0.3, 0.4, 0.5]),
  });
  const guest = server.transport("guest-uid");
  const hosted = await hostOnlineMatchV7(host, {
    name: "Ada",
    pick: "ORIGINAL",
    options: onlineOptionsFixtureV7(11, aiSeats),
  });
  if (!hosted.ok) throw new Error(hosted.error.code);
  const joined = await joinOnlineMatchV7(guest, hosted.value.code, {
    name: "Bo",
    pick: "UNDEAD",
  });
  if (!joined.ok) throw new Error(joined.error.code);
  const started = await startOnlineMatchV7(host, joined.value);
  if (!started.ok) throw new Error(started.error.code);
  return { server, host, guest, match: started.value };
}

async function open(
  transport: OnlineTransportV7,
  code: string,
  uid: string,
): Promise<OnlineLockstepV7> {
  const result = await OnlineLockstepV7.open({
    transport,
    code,
    uid,
    retryDelaysMs: [0],
  });
  if (!result.ok) throw new Error(result.error.code);
  clients.push(result.value);
  return result.value;
}

function recorder(
  client: OnlineLockstepV7,
  history: OnlineMatchHistoryV7,
  now = (): string => NOW,
): OnlineMatchControllerV7 {
  const controller = new OnlineMatchControllerV7({
    client,
    history,
    now,
    aiProgressScheduler: (resume) => {
      const timer = setTimeout(resume, 0);
      return () => clearTimeout(timer);
    },
    createAiWork: (): OnlineAiWorkV7 => ({
      runSlice: () => ({ kind: "END_TURN" }),
    }),
  });
  controllers.push(controller);
  controller.start();
  return controller;
}

/** A finished hand-built game as a stub client (no store). */
function stubClient(
  state: GameStateV7,
  mySeat: number,
  status: "ACTIVE" | "FINISHED" | "ABANDONED",
): OnlineLockstepV7 {
  return {
    code: "ABCDE",
    uid: mySeat === 0 ? "host-uid" : "guest-uid",
    setup: state.setup,
    state,
    mySeat,
    match: {
      status,
      seats: [
        { seat: 0, name: "Ada" },
        { seat: 1, name: "Bo" },
      ],
    },
    desynced: false,
    forfeitedBy: null,
    pendingMoves: 0,
    canAct: false,
    aiTurn: false,
    activeSeat: 0,
    on: () => () => {},
    start: () => {},
    stop: () => {},
  } as unknown as OnlineLockstepV7;
}

describe("the stored track record (pulp_wars-eqc6.6)", () => {
  it("keeps one entry per match, newest first, its first start and its final result", () => {
    const storage = new MemoryStorage();
    const history = new OnlineMatchHistoryV7(storage, "FIRESTORE");
    expect(history.entries(null)).toEqual([]);
    history.record(entry("AAAAA", { startedAt: "2026-10-27T10:00:00.000Z" }));
    history.record(entry("BBBBB", { startedAt: "2026-10-28T10:00:00.000Z" }));
    expect(history.entries(null).map((item) => item.code)).toEqual([
      "BBBBB",
      "AAAAA",
    ]);
    // An update keeps the first start, takes the new turn and result.
    history.record(
      entry("AAAAA", {
        startedAt: "2026-10-29T09:00:00.000Z",
        updatedAt: "2026-10-29T09:00:00.000Z",
        turns: 9,
        result: "WON",
        score: 1240,
      }),
    );
    expect(history.entry(null, "AAAAA")).toMatchObject({
      startedAt: "2026-10-27T10:00:00.000Z",
      turns: 9,
      result: "WON",
      score: 1240,
    });
    // A final result is never taken back to In progress.
    history.record(entry("AAAAA", { result: "IN_PROGRESS", turns: 10 }));
    expect(history.entry(null, "AAAAA")).toMatchObject({
      result: "WON",
      turns: 10,
    });
    // On Firestore one browser is one player: one key for every uid.
    expect([...storage.values.keys()]).toEqual([ONLINE_HISTORY_STORAGE_KEY_V7]);
  });

  it("keeps a list per tab on the local transport", () => {
    const storage = new MemoryStorage();
    const history = new OnlineMatchHistoryV7(storage, "LOCAL");
    history.record(entry("AAAAA", { uid: "local-1" }));
    history.record(entry("AAAAA", { uid: "local-2", seat: 1 }));
    expect(history.entries("local-1")).toHaveLength(1);
    expect(history.entries("local-2")[0]?.seat).toBe(1);
    expect(history.entries(null)).toEqual([]);
    expect([...storage.values.keys()].sort()).toEqual([
      `${ONLINE_HISTORY_STORAGE_KEY_V7}.local-1`,
      `${ONLINE_HISTORY_STORAGE_KEY_V7}.local-2`,
    ]);
  });

  it(`caps the list at the newest ${ONLINE_HISTORY_LIMIT_V7}`, () => {
    const history = new OnlineMatchHistoryV7(new MemoryStorage());
    for (let index = 0; index < ONLINE_HISTORY_LIMIT_V7 + 5; index += 1) {
      const time = new Date(Date.UTC(2026, 0, 1) + index * 60_000)
        .toISOString()
        .replace(/\.\d+Z$/, ".000Z");
      history.record(
        entry(codeOf(index), { startedAt: time, updatedAt: time }),
      );
    }
    const entries = history.entries(null);
    expect(entries).toHaveLength(ONLINE_HISTORY_LIMIT_V7);
    expect(entries[0]?.code).toBe(codeOf(ONLINE_HISTORY_LIMIT_V7 + 4));
    expect(entries.some((item) => item.code === codeOf(0))).toBe(false);
  });

  it("survives malformed storage: unreadable text, a non-list, broken entries, a refusing store", () => {
    const storage = new MemoryStorage();
    const history = new OnlineMatchHistoryV7(storage);
    for (const text of ["{not json", '"text"', "{}", "null", "42"]) {
      storage.setItem(ONLINE_HISTORY_STORAGE_KEY_V7, text);
      expect(history.entries(null)).toEqual([]);
    }
    storage.setItem(
      ONLINE_HISTORY_STORAGE_KEY_V7,
      JSON.stringify([
        entry("GUUDA"),
        { ...entry("BADAA"), result: "MAYBE" },
        { ...entry("BADAB"), faction: "ELVES" },
        { ...entry("BADAC"), turns: -1 },
        { ...entry("BADAD"), startedAt: "yesterday" },
        { ...entry("BADAE"), score: "lots" },
        { ...entry("bad"), code: "toolong" },
        null,
        7,
        "x",
      ]),
    );
    expect(history.entries(null).map((item) => item.code)).toEqual(["GUUDA"]);
    // Recording over a broken list keeps the good entries.
    history.record(entry("NEWAA", { startedAt: "2026-10-30T10:00:00.000Z" }));
    expect(history.entries(null).map((item) => item.code)).toEqual([
      "NEWAA",
      "GUUDA",
    ]);
    // A store that throws reads as empty and records nothing, quietly.
    const refusing = new OnlineMatchHistoryV7({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {},
    });
    expect(refusing.entries(null)).toEqual([]);
    expect(refusing.record(entry("AAAAA"))).toBeNull();
    expect(new OnlineMatchHistoryV7(null).entries(null)).toEqual([]);
  });

  it("sums the record and labels the dates", () => {
    expect(
      onlineHistorySummaryV7([
        entry("AAAAA", { result: "WON" }),
        entry("BBBBB", { result: "WON_FORFEIT" }),
        entry("CCCCC", { result: "LOST" }),
        entry("DDDDD", { result: "LOST_FORFEIT" }),
        entry("EEEEE", { result: "LOST" }),
        entry("FFFFF", { result: "ABANDONED" }),
        entry("GGGGG", { result: "IN_PROGRESS" }),
      ]),
    ).toEqual({ won: 2, lost: 3, abandoned: 1, inProgress: 1 });
    const now = new Date(2026, 9, 29, 15, 0);
    const local = (day: number, year = 2026): string =>
      new Date(year, 9, day, 9, 30).toISOString();
    expect(onlineHistoryDateLabelV7(local(29), now)).toBe("Today");
    expect(onlineHistoryDateLabelV7(local(28), now)).toBe("Yesterday");
    expect(onlineHistoryDateLabelV7(local(3), now)).toBe("3 Oct");
    expect(onlineHistoryDateLabelV7(local(3, 2025), now)).toBe("3 Oct 2025");
    expect(onlineHistoryDateLabelV7("nope", now)).toBe("");
  });

  it("reads each player's result from the game and the match", () => {
    const setup = onlineSetupFixtureV7(11, 1);
    const state = onlineStateFixtureV7(setup);
    const facts = {
      state,
      setup,
      mySeat: 0,
      status: "ACTIVE" as const,
      forfeit: null,
    };
    expect(onlineHistoryResultV7(facts)).toBe("IN_PROGRESS");
    expect(onlineHistoryResultV7({ ...facts, status: "ABANDONED" })).toBe(
      "ABANDONED",
    );
    const won = {
      ...state,
      outcome: { kind: "VICTORY" as const, winnerId: 1 as never },
    };
    expect(onlineHistoryResultV7({ ...facts, state: won })).toBe("WON");
    expect(onlineHistoryResultV7({ ...facts, state: won, mySeat: 1 })).toBe(
      "LOST",
    );
    const forfeit = { seat: 1, uid: "guest-uid" };
    expect(onlineHistoryResultV7({ ...facts, forfeit })).toBe("WON_FORFEIT");
    expect(onlineHistoryResultV7({ ...facts, forfeit, mySeat: 1 })).toBe(
      "LOST_FORFEIT",
    );
    // Out of the game is a loss, while the others play on and after.
    const out = {
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
    };
    expect(onlineHistoryResultV7({ ...facts, state: out })).toBe("LOST");
    expect(
      onlineHistoryResultV7({ ...facts, state: out, status: "ABANDONED" }),
    ).toBe("LOST");
    expect(onlineHistoryResultV7({ ...facts, state: out, forfeit })).toBe(
      "LOST",
    );
  });
});

describe("the match screen records the match (pulp_wars-eqc6.6)", () => {
  it("records it when it opens and updates it on a forfeit, for both players", async () => {
    const table = await startedTable(1);
    const storage = new MemoryStorage();
    // Two browsers on the in-memory store: one storage each (the guest's
    // own list), as two devices would have.
    const guestStorage = new MemoryStorage();
    const hostHistory = new OnlineMatchHistoryV7(storage, "MEMORY");
    const guestHistory = new OnlineMatchHistoryV7(guestStorage, "MEMORY");
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    const hostScreen = recorder(host, hostHistory);
    recorder(guest, guestHistory);
    await settle(host, guest);
    const started = hostHistory.entry("host-uid", table.match.code);
    expect(started).toMatchObject({
      code: table.match.code,
      uid: "host-uid",
      seat: 0,
      opponent: "Bo",
      faction: "ORIGINAL",
      opponentFaction: "UNDEAD",
      aiSeats: 1,
      mapType: "DRY_LAND",
      width: 11,
      gameMode: "DOMINATION",
      result: "IN_PROGRESS",
      startedAt: NOW,
    });
    expect(started?.turns).toBeGreaterThanOrEqual(1);
    expect(guestHistory.entry("guest-uid", table.match.code)).toMatchObject({
      seat: 1,
      opponent: "Ada",
      faction: "UNDEAD",
      opponentFaction: "ORIGINAL",
      result: "IN_PROGRESS",
    });
    // The host forfeits: Lost by forfeit here, Won by forfeit there.
    expect(await hostScreen.forfeit()).toBe(true);
    await settle(host, guest);
    expect(hostHistory.entry("host-uid", table.match.code)?.result).toBe(
      "LOST_FORFEIT",
    );
    expect(guestHistory.entry("guest-uid", table.match.code)?.result).toBe(
      "WON_FORFEIT",
    );
  });

  it("records Abandoned when a player leaves", async () => {
    const table = await startedTable();
    const history = new OnlineMatchHistoryV7(new MemoryStorage(), "MEMORY");
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    recorder(host, history);
    await settle(host);
    expect((await guest.abandon()).ok).toBe(true);
    await settle(host, guest);
    expect(history.entry("host-uid", table.match.code)?.result).toBe(
      "ABANDONED",
    );
  });

  it("records a win and a loss from the game's own end, with the turn and the score", () => {
    const setup = onlineSetupFixtureV7(11);
    const state = {
      ...onlineStateFixtureV7(setup),
      round: 14,
      outcome: { kind: "VICTORY" as const, winnerId: 2 as never },
    };
    const history = new OnlineMatchHistoryV7(new MemoryStorage(), "MEMORY");
    recorder(stubClient(state, 0, "FINISHED"), history);
    recorder(stubClient(state, 1, "FINISHED"), history);
    expect(history.entry("host-uid", "ABCDE")).toMatchObject({
      result: "LOST",
      turns: 14,
      opponent: "Bo",
    });
    const won = history.entry("guest-uid", "ABCDE");
    expect(won).toMatchObject({ result: "WON", turns: 14, opponent: "Ada" });
    expect(typeof won?.score).toBe("number");
  });
});

describe("Play online settles and resumes the track record (pulp_wars-eqc6.6)", () => {
  function session(
    server: MemoryOnlineServerV7,
    uid: string,
    storage: MemoryStorage,
  ): OnlineLobbySessionV7 {
    const created = new OnlineLobbySessionV7({
      transport: server.transport(uid),
      storage,
      history: new OnlineMatchHistoryV7(storage, "MEMORY"),
      now: () => NOW,
    });
    sessions.push(created);
    return created;
  }

  it("settles In progress entries of matches that ended while away", async () => {
    // Three matches this browser (the guest) was in: one forfeited by the
    // host, one left, one still being played; and one gone from the store.
    const forfeited = await startedTable();
    const storage = new MemoryStorage();
    const history = new OnlineMatchHistoryV7(storage, "MEMORY");
    const record = (code: string): void =>
      void history.record(entry(code, { uid: "guest-uid", seat: 1 }));
    record(forfeited.match.code);
    const hostClient = await open(
      forfeited.host,
      forfeited.match.code,
      "host-uid",
    );
    expect((await hostClient.forfeit()).ok).toBe(true);
    // The other matches live on the same store.
    const server = forfeited.server;
    const left = await hostAnother(server, "ABANDON");
    record(left);
    await server.transport("host-uid").abandonMatch(left);
    const playing = await hostAnother(server, "PLAYING");
    record(playing);
    record("GXNEX");
    const play = session(server, "guest-uid", storage);
    await play.enter();
    await settle();
    const results = Object.fromEntries(
      play.state.history.map((item) => [item.code, item.result]),
    );
    expect(results).toEqual({
      [forfeited.match.code]: "WON_FORFEIT",
      [left]: "ABANDONED",
      [playing]: "IN_PROGRESS",
      GXNEX: "ABANDONED",
    });
  });

  it("resumes an In progress match from the list: the match screen's hand-off", async () => {
    const table = await startedTable();
    const storage = new MemoryStorage();
    new OnlineMatchHistoryV7(storage, "MEMORY").record(
      entry(table.match.code, { uid: "guest-uid", seat: 1 }),
    );
    const play = session(table.server, "guest-uid", storage);
    await play.enter();
    await settle();
    expect(play.state.screen).toBe("HOME");
    expect(play.state.history[0]?.result).toBe("IN_PROGRESS");
    await play.resume(table.match.code);
    await settle();
    expect(play.state.screen).toBe("STARTED");
    expect(play.state.handoff?.mySeat).toBe(1);
    expect(play.state.handoff?.code).toBe(table.match.code);
  });

  it("says a resumed match is over and settles its entry", async () => {
    const table = await startedTable();
    const storage = new MemoryStorage();
    new OnlineMatchHistoryV7(storage, "MEMORY").record(
      entry(table.match.code, { uid: "guest-uid", seat: 1 }),
    );
    const play = session(table.server, "guest-uid", storage);
    // Not settled yet when the list is shown (say, the forfeit came later).
    const hostClient = await open(table.host, table.match.code, "host-uid");
    expect((await hostClient.forfeit()).ok).toBe(true);
    await play.resume(table.match.code);
    await settle();
    expect(play.state.screen).toBe("HOME");
    expect(play.state.message?.text).toBe("That game is over.");
    expect(play.state.history[0]?.result).toBe("WON_FORFEIT");
  });
});

/** Another started match on the same store (host-uid and guest-uid). */
async function hostAnother(
  server: MemoryOnlineServerV7,
  label: string,
): Promise<string> {
  const host = server.transport("host-uid");
  const guest = server.transport("guest-uid");
  const hosted = await hostOnlineMatchV7(host, {
    name: "Ada",
    pick: "ORIGINAL",
    options: onlineOptionsFixtureV7(label.length + 20),
  });
  if (!hosted.ok) throw new Error(hosted.error.code);
  const joined = await joinOnlineMatchV7(guest, hosted.value.code, {
    name: "Bo",
    pick: "UNDEAD",
  });
  if (!joined.ok) throw new Error(joined.error.code);
  const started = await startOnlineMatchV7(host, joined.value);
  if (!started.ok) throw new Error(started.error.code);
  return started.value.code;
}
