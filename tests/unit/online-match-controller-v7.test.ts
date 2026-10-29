import { afterEach, describe, expect, it } from "vitest";
import {
  OnlineMatchControllerV7,
  type OnlineAiWorkV7,
  type OnlineBrowserSnapshotV7,
} from "../../src/app/online-match-controller-v7";
import type { Ruleset7AcceptedBoundary } from "../../src/app/v7-controller";
import { canonicalHash } from "../../src/engine/replay/canonical";
import type { CommandV7 } from "../../src/engine/v7/commands";
import type { PlayerViewV7 } from "../../src/engine/v7/view";
import {
  hostOnlineMatchV7,
  joinOnlineMatchV7,
  startOnlineMatchV7,
} from "../../src/online/lobby";
import { OnlineLockstepV7 } from "../../src/online/lockstep";
import type { OnlineMatchV7 } from "../../src/online/match";
import {
  createMemoryOnlineServerV7,
  type MemoryOnlineServerV7,
} from "../../src/online/memory-transport";
import type { OnlineTransportV7 } from "../../src/online/types";
import { onlineOptionsFixtureV7, sequenceRandomV7 } from "./online-v7.shared";

/**
 * The online game's controller (`pulp_wars-eqc6.3`): two browsers over
 * the in-memory store, each with its lockstep client and controller. Only
 * hand-made commands (Wait, End turn) and a stubbed AI are played: no
 * match is simulated.
 */

interface Table {
  readonly server: MemoryOnlineServerV7;
  readonly host: OnlineTransportV7;
  readonly guest: OnlineTransportV7;
  readonly match: OnlineMatchV7;
}

const opened: OnlineMatchControllerV7[] = [];

afterEach(() => {
  for (const controller of opened.splice(0)) controller.destroy();
});

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

async function client(
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
  return result.value;
}

/** A controller that records its boundaries and snapshots. */
function controllerOf(
  lockstep: OnlineLockstepV7,
  createAiWork?: (view: PlayerViewV7, accepted: number) => OnlineAiWorkV7,
): {
  readonly controller: OnlineMatchControllerV7;
  readonly boundaries: Ruleset7AcceptedBoundary[];
} {
  const controller = new OnlineMatchControllerV7({
    client: lockstep,
    aiProgressScheduler: (resume) => {
      const timer = setTimeout(resume, 0);
      return () => clearTimeout(timer);
    },
    ...(createAiWork === undefined ? {} : { createAiWork }),
  });
  opened.push(controller);
  const boundaries: Ruleset7AcceptedBoundary[] = [];
  controller.subscribeAcceptedBoundary((boundary) => boundaries.push(boundary));
  controller.start();
  return { controller, boundaries };
}

async function settle(...clients: readonly OnlineLockstepV7[]): Promise<void> {
  for (let round = 0; round < 6; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.all(clients.map((item) => item.settled()));
  }
}

function snap(controller: OnlineMatchControllerV7): OnlineBrowserSnapshotV7 {
  return controller.snapshot();
}

function waitCommand(snapshot: OnlineBrowserSnapshotV7): CommandV7 {
  const command = snapshot.offeredCommands.find(
    (candidate) => candidate.kind === "WAIT",
  );
  if (command === undefined) throw new Error("No Wait offered");
  return command;
}

interface SideV7 {
  readonly name: string;
  readonly playerId: number;
  readonly client: OnlineLockstepV7;
  readonly controller: OnlineMatchControllerV7;
  readonly boundaries: Ruleset7AcceptedBoundary[];
}

/** Both browsers of a started table, the one to move first first. */
async function sides(
  table: Table,
  ai: {
    readonly host?: (view: PlayerViewV7, accepted: number) => OnlineAiWorkV7;
    readonly guest?: (view: PlayerViewV7, accepted: number) => OnlineAiWorkV7;
  } = {},
): Promise<{ readonly first: SideV7; readonly second: SideV7 }> {
  const hostClient = await client(table.host, table.match.code, "host-uid");
  const guestClient = await client(table.guest, table.match.code, "guest-uid");
  const host = {
    name: "Ada",
    playerId: 1,
    client: hostClient,
    ...controllerOf(hostClient, ai.host),
  };
  const guest = {
    name: "Bo",
    playerId: 2,
    client: guestClient,
    ...controllerOf(guestClient, ai.guest),
  };
  // The map decides who opens; with an AI seat first, the host's AI runs.
  await settle(hostClient, guestClient);
  return snap(guest.controller).offeredCommands.length > 0
    ? { first: guest, second: host }
    : { first: host, second: guest };
}

describe("the online match controller (pulp_wars-eqc6.3)", () => {
  it("draws each browser's own view and offers commands only on its turn", async () => {
    const { first, second } = await sides(await startedTable());
    const mine = snap(first.controller);
    const theirs = snap(second.controller);
    // The stored humanPlayerId is seat 0's; each screen draws its own.
    expect(mine.view?.viewer.id).toBe(first.playerId);
    expect(mine.view?.humanPlayerId).toBe(first.playerId);
    expect(theirs.view?.viewer.id).toBe(second.playerId);
    expect(theirs.view?.humanPlayerId).toBe(second.playerId);
    expect(mine.online.names).toEqual(["Ada", "Bo"]);
    // The opener moves; the other looks only, waiting for the opener.
    expect(mine.offeredCommands.length).toBeGreaterThan(0);
    expect(mine.ai.active).toBe(false);
    expect(theirs.offeredCommands).toEqual([]);
    expect(theirs.ai.active).toBe(true);
    expect(theirs.online.turn).toEqual({
      seat: first.playerId - 1,
      name: first.name,
      mine: false,
      ai: false,
    });
    expect(mine.online.turnCue).toBe(1);
    expect(theirs.online.turnCue).toBe(0);
    expect(
      await second.controller.dispatch({ kind: "END_TURN" }),
    ).toMatchObject({ accepted: false, reason: "NOT_HUMAN_TURN" });
  });

  it("sends my move and plays it back on the other side from its view", async () => {
    const { first, second } = await sides(await startedTable());
    const result = await first.controller.dispatch(
      waitCommand(snap(first.controller)),
    );
    expect(result.accepted).toBe(true);
    expect(first.boundaries.map((item) => item.actor)).toEqual(["HUMAN"]);
    await settle(first.client, second.client);
    // The other side presents the remote move as an AI move, from its view.
    expect(second.boundaries).toHaveLength(1);
    expect(second.boundaries[0]?.actor).toBe("AI");
    expect(second.boundaries[0]?.afterView.viewer.id).toBe(second.playerId);
    expect(snap(second.controller).view?.commandIndex).toBe(
      snap(first.controller).view?.commandIndex,
    );
    // End of turn: the other side's turn begins, with its cue.
    expect(
      (await first.controller.dispatch({ kind: "END_TURN" })).accepted,
    ).toBe(true);
    const waiting = first.controller.progressAiTurns();
    await settle(first.client, second.client);
    const theirTurn = snap(second.controller);
    expect(theirTurn.offeredCommands.length).toBeGreaterThan(0);
    expect(theirTurn.ai.active).toBe(false);
    expect(theirTurn.online.turnCue).toBe(1);
    const locked = snap(first.controller);
    expect(locked.offeredCommands).toEqual([]);
    expect(locked.ai.active).toBe(true);
    expect(locked.online.turn?.name).toBe(second.name);
    // The first player waits until its own turn comes back.
    let resolved = false;
    void waiting.then(() => {
      resolved = true;
    });
    await settle(first.client, second.client);
    expect(resolved).toBe(false);
    expect(
      (await second.controller.dispatch({ kind: "END_TURN" })).accepted,
    ).toBe(true);
    await settle(first.client, second.client);
    expect(resolved).toBe(true);
    expect(snap(first.controller).online.turnCue).toBe(2);
    expect(canonicalHash(first.client.state)).toBe(
      canonicalHash(second.client.state),
    );
  });

  it("holds remote moves while the board is behind (the pacing gate)", async () => {
    const { first, second } = await sides(await startedTable());
    let release: (() => void) | null = null;
    second.controller.setAiPacingGate(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await first.controller.dispatch(waitCommand(snap(first.controller)));
    await settle(first.client, second.client);
    expect(second.boundaries).toHaveLength(0);
    // Held back: the board still shows the game before the move.
    expect(snap(second.controller).view?.commandIndex).not.toBe(
      second.client.state.commandIndex,
    );
    expect(release).not.toBeNull();
    second.controller.setAiPacingGate(null);
    await settle(first.client, second.client);
    expect(second.boundaries).toHaveLength(1);
    expect(snap(second.controller).view?.commandIndex).toBe(
      second.client.state.commandIndex,
    );
  });

  it("lets only the host run an AI seat's turn and plays it back for the guest", async () => {
    const asked: number[] = [];
    // A stubbed AI: one Wait for its first unit, then End turn.
    const stub = (view: PlayerViewV7, accepted: number): OnlineAiWorkV7 => {
      asked.push(view.viewer.id);
      return {
        runSlice: () => {
          const unit = view.units.find(
            (item) => item.ownerId === view.viewer.id,
          );
          return accepted === 0 && unit !== undefined
            ? { kind: "WAIT", unitId: unit.id }
            : { kind: "END_TURN" };
        },
      };
    };
    const guestAsked: number[] = [];
    const { first, second } = await sides(await startedTable(1), {
      host: stub,
      guest: (view) => {
        guestAsked.push(view.viewer.id);
        return { runSlice: () => ({ kind: "END_TURN" }) };
      },
    });
    const host = first.playerId === 1 ? first : second;
    const guest = first.playerId === 1 ? second : first;
    expect(snap(host.controller).online.names).toEqual(["Ada", "Bo", "AI 1"]);
    // Both humans end a turn: the AI seat (player 3) has had its turn by
    // then, in the host's browser only.
    for (const side of [first, second]) {
      expect(
        (await side.controller.dispatch({ kind: "END_TURN" })).accepted,
      ).toBe(true);
      await settle(first.client, second.client);
    }
    await settle(first.client, second.client);
    expect(asked.length).toBeGreaterThanOrEqual(1);
    expect(new Set(asked)).toEqual(new Set([3]));
    expect(guestAsked).toEqual([]);
    // The guest saw the AI's End turn played back.
    const aiEnds = guest.boundaries.filter((boundary) =>
      boundary.playerEvents.events.some(
        (event) => event.kind === "TURN_ENDED" && event.playerId === 3,
      ),
    );
    expect(aiEnds.length).toBeGreaterThanOrEqual(1);
    expect(canonicalHash(host.client.state)).toBe(
      canonicalHash(guest.client.state),
    );
    // Someone human is to move again, and it is offered there.
    const toMove = [first, second].find(
      (side) => snap(side.controller).offeredCommands.length > 0,
    );
    expect(toMove).toBeDefined();
  });

  it("resumes from the log after a reload", async () => {
    const table = await startedTable();
    const { first, second } = await sides(table);
    await first.controller.dispatch(waitCommand(snap(first.controller)));
    await first.controller.dispatch({ kind: "END_TURN" });
    await settle(first.client, second.client);
    second.controller.destroy();
    // The second player's tab reloads: a new client replays the stored log.
    const reloaded = await client(
      second.playerId === 1 ? table.host : table.guest,
      table.match.code,
      second.playerId === 1 ? "host-uid" : "guest-uid",
    );
    const again = controllerOf(reloaded).controller;
    const resumed = snap(again);
    expect(resumed.view?.commandIndex).toBe(first.client.state.commandIndex);
    expect(resumed.online.turn?.mine).toBe(true);
    expect(resumed.offeredCommands.length).toBeGreaterThan(0);
    expect(resumed.online.turnCue).toBe(1);
  });

  it("tells the other player who left, and never offers moves after", async () => {
    const { first, second } = await sides(await startedTable());
    const waiting = second.controller.progressAiTurns();
    expect(await first.controller.abandon()).toBe(true);
    expect(snap(first.controller).online).toMatchObject({
      status: "ABANDONED",
      leftByMe: true,
      leftBy: null,
    });
    await settle(first.client, second.client);
    expect(snap(second.controller).online).toMatchObject({
      status: "ABANDONED",
      leftBy: first.name,
      leftByMe: false,
    });
    expect(snap(second.controller).offeredCommands).toEqual([]);
    expect(snap(second.controller).ai.active).toBe(false);
    expect(await waiting).toMatchObject({ ok: false, cancelled: true });
  });

  it("forfeits on my turn: Defeat for me, Victory for the friend, at once (pulp_wars-eqc6.5)", async () => {
    const table = await startedTable(1);
    // Stubbed AI seat: it only ends its turn.
    const endTurn = (): OnlineAiWorkV7 => ({
      runSlice: () => ({ kind: "END_TURN" }),
    });
    const { first, second } = await sides(table, {
      host: endTurn,
      guest: endTurn,
    });
    expect(snap(first.controller).online).toMatchObject({
      canForfeit: true,
      forfeitWinner: second.name,
      forfeit: null,
    });
    const waiting = second.controller.progressAiTurns();
    expect(await first.controller.forfeit()).toBe(true);
    const mine = snap(first.controller);
    expect(mine.phase).toBe("COMPLETE");
    expect(mine.offeredCommands).toEqual([]);
    expect(mine.view?.outcome).toEqual({
      kind: "VICTORY",
      winnerId: second.playerId,
    });
    expect(mine.online).toMatchObject({
      status: "FINISHED",
      canForfeit: false,
      forfeit: {
        byMe: true,
        by: first.name,
        winner: second.name,
        winnerIsMe: false,
      },
    });
    await settle(first.client, second.client);
    const theirs = snap(second.controller);
    expect(theirs.phase).toBe("COMPLETE");
    expect(theirs.view?.outcome).toEqual({
      kind: "VICTORY",
      winnerId: second.playerId,
    });
    expect(theirs.online.forfeit).toMatchObject({
      byMe: false,
      by: first.name,
      winnerIsMe: true,
    });
    expect(theirs.ai.active).toBe(false);
    expect(await waiting).toMatchObject({ ok: true });
    // Recorded in the match: FINISHED with the forfeiting seat and uid.
    expect(table.server.match(table.match.code)).toMatchObject({
      status: "FINISHED",
      forfeitSeat: first.playerId - 1,
      forfeitUid: first.playerId === 1 ? "host-uid" : "guest-uid",
    });
    // Nothing more can be played on either side.
    expect(
      (await second.controller.dispatch({ kind: "END_TURN" })).accepted,
    ).toBe(false);
    expect(await second.controller.forfeit()).toBe(false);
  });

  it("forfeits off-turn too, and a reload shows the same end (pulp_wars-eqc6.5)", async () => {
    const table = await startedTable();
    const { first, second } = await sides(table);
    // The second player, whose turn it is not, gives up.
    expect(snap(second.controller).online.turn?.mine).toBe(false);
    expect(snap(second.controller).online.canForfeit).toBe(true);
    expect(await second.controller.forfeit()).toBe(true);
    await settle(first.client, second.client);
    expect(snap(first.controller).online.forfeit).toMatchObject({
      byMe: false,
      by: second.name,
      winner: first.name,
      winnerIsMe: true,
    });
    expect(snap(first.controller).offeredCommands).toEqual([]);
    // Both tabs reload: the stored match says the same.
    for (const side of [first, second]) {
      side.controller.destroy();
      const reloaded = await client(
        side.playerId === 1 ? table.host : table.guest,
        table.match.code,
        side.playerId === 1 ? "host-uid" : "guest-uid",
      );
      expect(reloaded.forfeitedBy).toEqual({
        seat: second.playerId - 1,
        uid: second.playerId === 1 ? "host-uid" : "guest-uid",
      });
      const again = snap(controllerOf(reloaded).controller);
      expect(again.phase).toBe("COMPLETE");
      expect(again.view?.outcome).toEqual({
        kind: "VICTORY",
        winnerId: first.playerId,
      });
      expect(again.online.forfeit?.byMe).toBe(side === second);
    }
  });

  it("refuses the single-player lifecycle (no restart, no autosave)", async () => {
    const { first } = await sides(await startedTable());
    expect((await first.controller.restart()).ok).toBe(false);
    expect(await first.controller.deleteStoredSave()).toBe(false);
    expect(await first.controller.returnToMenu()).toBe(false);
    expect(snap(first.controller)).toMatchObject({
      savedAt: null,
      hasStoredSave: false,
      saveWarning: null,
    });
  });
});
