import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalJson,
} from "../../src/engine/replay/canonical";
import type { CommandV7 } from "../../src/engine/v7/commands";
import type { GameStateV7 } from "../../src/engine/v7/types";
import {
  hostOnlineMatchV7,
  joinOnlineMatchV7,
  startOnlineMatchV7,
} from "../../src/online/lobby";
import {
  OnlineLockstepV7,
  replayOnlineLogV7,
  type LockstepEventV7,
  type OnlineLockstepOptionsV7,
} from "../../src/online/lockstep";
import type { OnlineMatchV7 } from "../../src/online/match";
import {
  createMemoryOnlineServerV7,
  type MemoryOnlineServerV7,
} from "../../src/online/memory-transport";
import type {
  OnlineMoveRecordV7,
  OnlineTransportV7,
} from "../../src/online/types";
import { onlineOptionsFixtureV7, sequenceRandomV7 } from "./online-v7.shared";

/** Lets watch callbacks run and every client finish its queued work. */
async function settle(...clients: readonly OnlineLockstepV7[]): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.all(clients.map((client) => client.settled()));
  }
}

/** The active seat's first unit Waits, else the turn ends. */
function nextCommand(state: GameStateV7, waited: Set<string>): CommandV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  const key = `${state.round}:${actor}`;
  const unit = state.units.find((item) => item.ownerId === actor);
  if (!waited.has(key) && unit !== undefined) {
    waited.add(key);
    return { kind: "WAIT", unitId: unit.id };
  }
  return { kind: "END_TURN" };
}

interface Table {
  readonly server: MemoryOnlineServerV7;
  readonly host: OnlineTransportV7;
  readonly guest: OnlineTransportV7;
  readonly match: OnlineMatchV7;
}

async function startedTable(aiSeats = 1): Promise<Table> {
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
    pick: "RANDOM",
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
  extra: Partial<OnlineLockstepOptionsV7> = {},
): Promise<OnlineLockstepV7> {
  const opened = await OnlineLockstepV7.open({
    transport,
    code,
    uid,
    retryDelaysMs: [0],
    ...extra,
  });
  if (!opened.ok) throw new Error(opened.error.code);
  return opened.value;
}

/** Plays `steps` commands, each by whichever client is to move. */
async function play(
  clients: readonly OnlineLockstepV7[],
  steps: number,
  waited = new Set<string>(),
): Promise<void> {
  for (let step = 0; step < steps; step += 1) {
    const mover = clients.find((client) => client.canAct);
    if (mover === undefined) throw new Error("nobody can move");
    const result = mover.submit(nextCommand(mover.state, waited));
    if (!result.accepted) throw new Error(result.reason);
    await settle(...clients);
  }
}

describe("the lockstep client (pulp_wars-eqc6.1)", () => {
  it("keeps two clients on identical states over the fake transport", async () => {
    const table = await startedTable(1);
    expect(table.match.status).toBe("ACTIVE");
    expect(table.match.setup?.humanSeats).toEqual([0, 1]);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    expect(host.mySeat).toBe(0);
    expect(guest.mySeat).toBe(1);
    expect(host.drivenSeats).toEqual([0, 2]);
    expect(guest.drivenSeats).toEqual([1]);
    const guestEvents: LockstepEventV7[] = [];
    guest.on((event) => guestEvents.push(event));
    host.start();
    guest.start();
    await settle(host, guest);
    // Exactly one client is to move, and the host also moves the AI seat.
    expect(Number(host.canAct) + Number(guest.canAct)).toBe(1);
    await play([host, guest], 9);
    expect(host.moveCount).toBe(9);
    expect(guest.moveCount).toBe(9);
    expect(canonicalHash(guest.state)).toBe(canonicalHash(host.state));
    expect(table.server.match(table.match.code)?.moveCount).toBe(9);
    expect(guest.waitingFor === null).toBe(guest.canAct);
    // The guest saw the host's commands as remote ones, and turn changes.
    const remote = guestEvents.filter(
      (event) => event.kind === "COMMAND_APPLIED" && !event.local,
    );
    expect(remote.length).toBeGreaterThan(0);
    expect(
      remote.every(
        (event) => event.kind === "COMMAND_APPLIED" && event.seat !== 1,
      ),
    ).toBe(true);
    expect(
      guestEvents.some((event) => event.kind === "TURN" && !event.mine),
    ).toBe(true);
    // The stored log replays to the same state (resume after a reload).
    const resumed = await open(table.guest, table.match.code, "guest-uid");
    expect(canonicalHash(resumed.state)).toBe(canonicalHash(host.state));
    host.stop();
    guest.stop();
  });

  it("marks AI turns for the host only", async () => {
    const table = await startedTable(1);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    host.start();
    guest.start();
    for (let step = 0; step < 12 && !host.aiTurn; step += 1)
      await play([host, guest], 1);
    expect(host.aiTurn).toBe(true);
    expect(host.activeSeat).toBe(2);
    expect(guest.aiTurn).toBe(false);
    expect(guest.waitingFor).toBe(2);
    expect(guest.submit({ kind: "END_TURN" })).toEqual({
      accepted: false,
      reason: "NOT_YOUR_TURN",
    });
    host.stop();
    guest.stop();
  });

  it("applies moves in order whatever order or how often they arrive", async () => {
    const table = await startedTable(0);
    let call = 0;
    // Deliveries reversed and doubled; the first one also drops its oldest
    // moves, leaving a gap the client must fetch.
    const scrambled: OnlineTransportV7 = {
      ...table.guest,
      async getMoves(code, from, to) {
        const real = await table.guest.getMoves(code, from, to);
        if (!real.ok) return real;
        call += 1;
        const moves = [...real.value].reverse();
        const delivered: OnlineMoveRecordV7[] =
          call === 2 && moves.length > 1
            ? moves.slice(0, 1)
            : [...moves, ...moves];
        return { ok: true, value: delivered };
      },
    };
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(scrambled, table.match.code, "guest-uid");
    host.start();
    // The host plays a whole turn, then the guest catches up at once.
    const waited = new Set<string>();
    for (let step = 0; step < 6; step += 1) {
      if (!host.canAct) break;
      host.submit(nextCommand(host.state, waited));
      await settle(host);
    }
    guest.start();
    await settle(host, guest);
    expect(guest.moveCount).toBe(host.moveCount);
    expect(canonicalHash(guest.state)).toBe(canonicalHash(host.state));
    expect(guest.desynced).toBe(false);
    host.stop();
    guest.stop();
  });

  it("refuses a move whose index another writer took, then resyncs", async () => {
    const table = await startedTable(1);
    // Two tabs of the host: both think it is their move.
    const tabA = await open(table.host, table.match.code, "host-uid");
    const tabB = await open(table.host, table.match.code, "host-uid");
    const events: LockstepEventV7[] = [];
    tabB.on((event) => events.push(event));
    // Play until the host is to move (the first seat may be the guest's).
    const guest = await open(table.guest, table.match.code, "guest-uid");
    guest.start();
    if (!tabA.canAct) {
      await play([guest], 0);
      while (guest.canAct) {
        guest.submit({ kind: "END_TURN" });
        await settle(guest);
      }
      await tabA.refresh();
      await tabB.refresh();
    }
    expect(tabA.canAct && tabB.canAct).toBe(true);
    const unit = tabA.state.units.find(
      (item) =>
        item.ownerId === tabA.state.turnOrder[tabA.state.activeSeatIndex],
    );
    if (unit === undefined) throw new Error("no unit");
    expect(tabA.submit({ kind: "WAIT", unitId: unit.id }).accepted).toBe(true);
    await settle(tabA);
    expect(tabB.submit({ kind: "END_TURN" }).accepted).toBe(true);
    await settle(tabB);
    const rejected = events.find((event) => event.kind === "MOVE_REJECTED");
    expect(rejected?.kind === "MOVE_REJECTED" && rejected.error.code).toBe(
      "INDEX_TAKEN",
    );
    expect(events.some((event) => event.kind === "RESYNCED")).toBe(true);
    expect(tabB.moveCount).toBe(tabA.moveCount);
    expect(canonicalHash(tabB.state)).toBe(canonicalHash(tabA.state));
    guest.stop();
  });

  it("recovers from a desync by replaying the log from the setup", async () => {
    const table = await startedTable(0);
    let lies = 1;
    // The guest's first hash is wrong once (a corrupted state, say).
    const flaky = (state: GameStateV7): string =>
      lies-- > 0 ? "f".repeat(64) : canonicalHash(state);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid", {
      hashState: flaky,
    });
    const events: LockstepEventV7[] = [];
    guest.on((event) => events.push(event));
    host.on((event) => events.push(event));
    host.start();
    guest.start();
    // The wrong hash is either the guest's check of a host move (the guest
    // repairs itself) or the hash of the guest's own move (the host blames
    // the guest, plays on, and trusts it again at its next good hash).
    await play([host, guest], 6);
    const desync = events.find((event) => event.kind === "DESYNC");
    expect(desync).toMatchObject({ kind: "DESYNC", recovered: true });
    expect(desync?.kind === "DESYNC" && desync.blame).toMatch(/LOCAL|AUTHOR/);
    expect(guest.desynced || host.desynced).toBe(false);
    expect(host.verified && guest.verified).toBe(true);
    expect(canonicalHash(guest.state)).toBe(canonicalHash(host.state));
    host.stop();
    guest.stop();
  });

  it("plays on the logged commands when an author logged a wrong hash", async () => {
    const table = await startedTable(0);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    host.start();
    guest.start();
    await play([host, guest], 2);
    const good = guest.moveCount;
    const mover = host.canAct ? host : guest;
    const watcher = mover === host ? guest : host;
    const events: LockstepEventV7[] = [];
    watcher.on((event) => events.push(event));
    const record = table.server.match(table.match.code);
    if (record === null) throw new Error("no match");
    // The mover's game was off: its End Turn is logged with a bad hash.
    table.server.forceMove(table.match.code, {
      index: good,
      seat: mover.activeSeat,
      uid: mover.uid,
      commandJson: canonicalJson({ kind: "END_TURN" }),
      stateHash: "0".repeat(64),
      createdAt: record.updatedAt,
    });
    table.server.forceMatch({
      ...record,
      moveCount: good + 1,
      turnSeat: watcher.mySeat ?? 0,
    });
    await settle(host, guest);
    expect(events.find((event) => event.kind === "DESYNC")).toMatchObject({
      index: good,
      reason: "HASH_MISMATCH",
      recovered: true,
      blame: "AUTHOR",
    });
    expect(watcher.desynced).toBe(false);
    expect(watcher.verified).toBe(false);
    expect(watcher.moveCount).toBe(good + 1);
    expect(watcher.canAct).toBe(true);
    host.stop();
    guest.stop();
  });

  it("stops at the last good move when the log's commands do not replay", async () => {
    const table = await startedTable(0);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    const events: LockstepEventV7[] = [];
    guest.on((event) => events.push(event));
    host.start();
    guest.start();
    await play([host, guest], 2);
    const good = guest.moveCount;
    // A move this build refuses (a unit that does not exist).
    const mover = host.canAct ? host : guest;
    const seat = mover.activeSeat;
    const record = table.server.match(table.match.code);
    if (record === null) throw new Error("no match");
    table.server.forceMove(table.match.code, {
      index: good,
      seat,
      uid: mover.uid,
      commandJson: canonicalJson({ kind: "WAIT", unitId: 9999 }),
      stateHash: "0".repeat(64),
      createdAt: record.updatedAt,
    });
    table.server.forceMatch({ ...record, moveCount: good + 1 });
    await settle(host, guest);
    const watcher = mover === host ? guest : host;
    expect(watcher.desynced).toBe(true);
    expect(watcher.moveCount).toBe(good);
    expect(watcher.canAct).toBe(false);
    expect(watcher.submit({ kind: "END_TURN" })).toEqual({
      accepted: false,
      reason: "DESYNCED",
    });
    if (watcher === guest)
      expect(events.find((event) => event.kind === "DESYNC")).toMatchObject({
        index: good,
        reason: "REJECTED",
        recovered: false,
        blame: null,
      });
    host.stop();
    guest.stop();
  });

  it("replays a log and finds the first bad move", async () => {
    const table = await startedTable(0);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    host.start();
    guest.start();
    await play([host, guest], 4);
    const setup = table.match.setup;
    if (setup === null) throw new Error("no setup");
    const moves = table.server.moves(table.match.code);
    expect(replayOnlineLogV7(setup, moves, canonicalHash, "LAST").ok).toBe(
      true,
    );
    const broken = moves.map((move, index) =>
      index === 1 ? { ...move, stateHash: "1".repeat(64) } : move,
    );
    expect(
      replayOnlineLogV7(setup, broken, canonicalHash, "ALL"),
    ).toMatchObject({ ok: false, index: 1, reason: "HASH_MISMATCH" });
    // Checking the last move only does not see it; a tolerant replay
    // notes it and plays on (the commands are the game).
    expect(replayOnlineLogV7(setup, broken, canonicalHash, "LAST").ok).toBe(
      true,
    );
    expect(
      replayOnlineLogV7(setup, broken, canonicalHash, "ALL", true),
    ).toMatchObject({ ok: true, mismatches: [1] });
    const wrongSeat = moves.map((move, index) =>
      index === 0 ? { ...move, seat: move.seat === 0 ? 1 : 0 } : move,
    );
    expect(replayOnlineLogV7(setup, wrongSeat)).toMatchObject({
      ok: false,
      index: 0,
      reason: "WRONG_SEAT",
    });
    host.stop();
    guest.stop();
  });

  it("tells everyone when a player abandons the match", async () => {
    const table = await startedTable(0);
    const host = await open(table.host, table.match.code, "host-uid");
    const guest = await open(table.guest, table.match.code, "guest-uid");
    const events: LockstepEventV7[] = [];
    host.on((event) => events.push(event));
    host.start();
    guest.start();
    await settle(host, guest);
    expect((await guest.abandon()).ok).toBe(true);
    await settle(host, guest);
    expect(events.some((event) => event.kind === "MATCH_ABANDONED")).toBe(true);
    expect(host.playable).toBe(false);
    expect(host.canAct).toBe(false);
    host.stop();
    guest.stop();
  });

  it("refuses to open a lobby, a missing match, or another build's match", async () => {
    const server = createMemoryOnlineServerV7();
    const host = server.transport("host-uid");
    const hosted = await hostOnlineMatchV7(host, {
      name: "Ada",
      pick: "RANDOM",
      options: onlineOptionsFixtureV7(),
    });
    if (!hosted.ok) throw new Error(hosted.error.code);
    const code = hosted.value.code;
    const lobby = await OnlineLockstepV7.open({
      transport: host,
      code,
      uid: "host-uid",
    });
    expect(!lobby.ok && lobby.error.code).toBe("NOT_ACTIVE");
    const missing = await OnlineLockstepV7.open({
      transport: host,
      code: "ZZZZZ",
      uid: "host-uid",
    });
    expect(!missing.ok && missing.error.code).toBe("NOT_FOUND");
    const record = server.match(code);
    if (record === null) throw new Error("no match");
    server.forceMatch({ ...record, rulesetId: "pulp-wars-poc-7r119" });
    const old = await OnlineLockstepV7.open({
      transport: host,
      code,
      uid: "host-uid",
    });
    expect(!old.ok && old.error.code).toBe("RULESET_MISMATCH");
    const guest = server.transport("guest-uid");
    const join = await joinOnlineMatchV7(guest, code, {
      name: "Bo",
      pick: "RANDOM",
    });
    expect(!join.ok && join.error.code).toBe("RULESET_MISMATCH");
  });

  it("lets the host and the seated guest reopen their match by code", async () => {
    const table = await startedTable(0);
    const again = await joinOnlineMatchV7(table.guest, table.match.code, {
      name: "Bo",
      pick: "RANDOM",
    });
    expect(again.ok && again.value.status).toBe("ACTIVE");
    const third = createMemoryOnlineServerV7();
    void third;
    const stranger = table.server.transport("stranger");
    const refused = await joinOnlineMatchV7(stranger, table.match.code, {
      name: "Cy",
      pick: "RANDOM",
    });
    expect(!refused.ok && refused.error.code).toBe("NOT_LOBBY");
  });
});
