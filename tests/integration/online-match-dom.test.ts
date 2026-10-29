// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import {
  OnlineMatchControllerV7,
  type OnlineAiWorkV7,
} from "../../src/app/online-match-controller-v7";
import { createPlayableGameV7 } from "../../src/engine/v7/reducer";
import type { GameStateV7 } from "../../src/engine/v7/types";
import {
  createMemoryOnlineServerV7,
  hostOnlineMatchV7,
  joinOnlineMatchV7,
  ONLINE_LOBBY_STORAGE_KEY_V7,
  OnlineLockstepV7,
  startOnlineMatchV7,
  type MemoryOnlineServerV7,
  type OnlineMatchHandoffV7,
  type OnlineMatchV7,
} from "../../src/online/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  onlineOptionsFixtureV7,
  sequenceRandomV7,
} from "../unit/online-v7.shared";

/**
 * The online game on the match screen (bead pulp_wars-eqc6.3). This
 * browser ("me", Ada, the host) runs the app; the friend (Bo) is a bare
 * lockstep client on the same in-memory store that plays hand-made
 * commands. A reload is a new app on the same store and address. No match
 * is simulated: only End turn, Wait and a stubbed AI are played.
 */
class Host implements BoardHostV7 {
  model: BoardHostModelV7 | null = null;
  mount(container: HTMLElement): void {
    container.replaceChildren(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

let app: BootstrappedRuleset7App | null = null;
const friends: OnlineLockstepV7[] = [];

interface Table {
  readonly server: MemoryOnlineServerV7;
  readonly match: OnlineMatchV7;
  readonly friend: OnlineLockstepV7;
}

async function table(aiSeats = 0): Promise<Table> {
  const server = createMemoryOnlineServerV7();
  const mine = server.transport("me", {
    random: sequenceRandomV7([0.1, 0.2, 0.3, 0.4, 0.5]),
  });
  const theirs = server.transport("friend");
  const hosted = await hostOnlineMatchV7(mine, {
    name: "Ada",
    pick: "ORIGINAL",
    options: onlineOptionsFixtureV7(11, aiSeats),
  });
  if (!hosted.ok) throw new Error(hosted.error.code);
  const joined = await joinOnlineMatchV7(theirs, hosted.value.code, {
    name: "Bo",
    pick: "UNDEAD",
  });
  if (!joined.ok) throw new Error(joined.error.code);
  const started = await startOnlineMatchV7(mine, joined.value);
  if (!started.ok) throw new Error(started.error.code);
  const opened = await OnlineLockstepV7.open({
    transport: theirs,
    code: started.value.code,
    uid: "friend",
    retryDelaysMs: [0],
  });
  if (!opened.ok) throw new Error(opened.error.code);
  const friend = opened.value;
  friend.start();
  friends.push(friend);
  return { server, match: started.value, friend };
}

/** The app of this browser, opened on the match's share link (a reload). */
async function boot(
  game: Table,
  extra: {
    readonly createOnlineMatchController?: (
      handoff: OnlineMatchHandoffV7,
    ) => OnlineMatchControllerV7;
    readonly boardHost?: BoardHostV7;
  } = {},
): Promise<void> {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  window.history.replaceState(null, "", `/?join=${game.match.code}`);
  window.localStorage.setItem(ONLINE_LOBBY_STORAGE_KEY_V7, game.match.code);
  app = bootstrapRuleset7App(document, {
    storage: null,
    boardHost: extra.boardHost ?? new Host(),
    randomSeed: () => 7,
    randomDraw: () => 0,
    online: game.server.transport("me"),
    aiProgressScheduler: (resume) => {
      const timer = setTimeout(resume, 0);
      return () => clearTimeout(timer);
    },
    ...extra,
  });
  await waitUntil(() => hud() !== null);
}

function hud(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-v7-region="hud"]');
}

function status(): string {
  return document.querySelector(".v7-turn-status")?.textContent ?? "";
}

/** The turn line's state: human, cue (Your turn, lit), other, done. */
function turnLine(): string | undefined {
  return document.querySelector<HTMLElement>(".v7-turn-status")?.dataset.turn;
}

function region(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-v7-region="${name}"]`);
}

function action(name: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`);
}

function press(name: string): void {
  const node = action(name);
  if (node === null) throw new Error(`Missing ${name}`);
  node.click();
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 600; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

/** The friend ends its turn whenever it is to move. */
async function friendEndsTurn(game: Table): Promise<void> {
  await waitUntil(() => game.friend.canAct);
  const result = game.friend.submit({ kind: "END_TURN" });
  if (!result.accepted) throw new Error(result.reason);
  await game.friend.settled();
}

/** Until it is this browser's turn on the screen. */
async function myTurn(game: Table): Promise<void> {
  if (action("end-turn") === null && game.friend.canAct)
    await friendEndsTurn(game);
  await waitUntil(() => action("end-turn") !== null);
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  app?.destroy();
  app = null;
  for (const friend of friends.splice(0)) friend.stop();
});

describe("an online game on the match screen (pulp_wars-eqc6.3)", () => {
  it("opens the started match, sends my moves and plays the friend's back", async () => {
    const game = await table();
    await boot(game);
    await myTurn(game);
    const shell = document.querySelector<HTMLElement>(".v7-app-shell");
    expect(shell).not.toBeNull();
    // No save is offered: the menu leaves the online game.
    press("compact-menu");
    expect(action("leave-online")?.textContent).toBe("Leave online game");
    expect(action("main-menu")).toBeNull();
    press("compact-menu");
    const before = game.friend.moveCount;
    press("end-turn");
    // The friend's client gets my End turn; my screen locks to look only.
    await waitUntil(() => game.friend.moveCount > before);
    await waitUntil(() => status() === "Bo is moving…");
    expect(action("end-turn")).toBeNull();
    expect(region("fast-forward")).toBeNull();
    // The friend ends its turn: mine again, with the cue.
    await friendEndsTurn(game);
    await waitUntil(() => action("end-turn") !== null);
    // The cue: the turn line lights up "Your turn" for a moment.
    await waitUntil(() => turnLine() === "cue");
    expect(status()).toBe("Your turn");
    // Nothing reached the single-player autosave.
    expect(
      Object.keys(window.localStorage).filter((key) =>
        key.toLowerCase().includes("save"),
      ),
    ).toEqual([]);
  });

  it("names the friend while the board plays its moves, then says Your turn", async () => {
    const game = await table();
    // A board whose playback ends only when the test says so.
    const held: (() => void)[] = [];
    class SlowHost extends Host {
      presentBoundary(): Promise<void> {
        return new Promise((resolve) => held.push(resolve));
      }
    }
    await boot(game, { boardHost: new SlowHost() });
    const release = async (): Promise<void> => {
      for (let round = 0; round < 50 && held.length > 0; round += 1) {
        for (const resolve of held.splice(0)) resolve();
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };
    if (game.friend.canAct) {
      await friendEndsTurn(game);
      await waitUntil(() => held.length > 0);
      await release();
    }
    await waitUntil(() => action("end-turn") !== null);
    press("end-turn");
    await waitUntil(() => held.length > 0);
    await release();
    await waitUntil(() => status() === "Bo is moving…");
    expect(turnLine()).toBe("other");
    await friendEndsTurn(game);
    // The game is at my turn, but the board still plays Bo's End turn: no
    // cue yet.
    await waitUntil(() => held.length > 0);
    expect(status()).toBe("Bo is moving…");
    expect(turnLine()).toBe("other");
    await release();
    await waitUntil(() => turnLine() === "cue");
    expect(status()).toBe("Your turn");
  });

  it("resumes the match after a reload", async () => {
    const game = await table();
    await boot(game);
    await myTurn(game);
    press("end-turn");
    await waitUntil(() => status() === "Bo is moving…");
    const moves = game.friend.moveCount;
    // The tab reloads: the remembered code and the address bring it back.
    await boot(game);
    await waitUntil(() => status() === "Bo is moving…");
    expect(game.friend.moveCount).toBe(moves);
    await friendEndsTurn(game);
    await waitUntil(() => action("end-turn") !== null);
  });

  it("leaves after a question: the friend's game is over, the code forgotten", async () => {
    const game = await table();
    await boot(game);
    press("compact-menu");
    press("leave-online");
    expect(region("online-leave-confirm")?.textContent).toContain(
      "The game ends for Bo too.",
    );
    // Stay keeps playing.
    press("online-leave-cancel");
    expect(region("online-leave-confirm")).toBeNull();
    press("compact-menu");
    press("leave-online");
    press("online-leave");
    await waitUntil(() => document.querySelector(".v7-main-menu") !== null);
    await game.friend.settled();
    await waitUntil(() => game.friend.match.status === "ABANDONED");
    expect(window.localStorage.getItem(ONLINE_LOBBY_STORAGE_KEY_V7)).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("tells me when the friend leaves, with a way back to the menu", async () => {
    const game = await table();
    await boot(game);
    const left = await game.friend.abandon();
    expect(left.ok).toBe(true);
    await waitUntil(() => region("online-left") !== null);
    expect(region("online-left")?.querySelector("h2")?.textContent).toBe(
      "Bo left the game",
    );
    expect(window.localStorage.getItem(ONLINE_LOBBY_STORAGE_KEY_V7)).toBeNull();
    press("online-left-menu");
    await waitUntil(() => document.querySelector(".v7-main-menu") !== null);
  });

  it("lets my browser drive the AI seat and shows whose turn it is", async () => {
    const game = await table(1);
    const asked: number[] = [];
    await boot(game, {
      createOnlineMatchController: (handoff) =>
        new OnlineMatchControllerV7({
          client: handoff.client,
          aiProgressScheduler: (resume) => {
            const timer = setTimeout(resume, 0);
            return () => clearTimeout(timer);
          },
          createAiWork: (view): OnlineAiWorkV7 => {
            asked.push(view.viewer.id);
            return { runSlice: () => ({ kind: "END_TURN" }) };
          },
        }),
    });
    // Two rounds of End turn by both humans: the AI seat moved in between,
    // computed here.
    for (let round = 0; round < 2; round += 1) {
      await myTurn(game);
      press("end-turn");
      await waitUntil(() => action("end-turn") === null);
    }
    await myTurn(game);
    expect(new Set(asked)).toEqual(new Set([3]));
    expect(game.friend.state.round).toBeGreaterThanOrEqual(2);
  });
});

/** A hand-built game (finished, or this player out) as a stub client. */
function finishedClient(
  state: GameStateV7,
  mySeat: number,
  abandoned: string[] = [],
): OnlineLockstepV7 {
  const stub = {
    code: "ABCDE",
    uid: mySeat === 0 ? "me" : "friend",
    setup: state.setup,
    state,
    mySeat,
    match: {
      status: state.outcome === null ? "ACTIVE" : "FINISHED",
      seats: [
        { seat: 0, name: "Ada" },
        { seat: 1, name: "Bo" },
      ],
    },
    desynced: false,
    pendingMoves: 0,
    canAct: false,
    aiTurn: false,
    activeSeat: 0,
    on: () => () => {},
    start: () => {},
    stop: () => {},
    abandon: async () => {
      abandoned.push("abandon");
      return { ok: false, error: { code: "NETWORK", message: "stub" } };
    },
  };
  return stub as unknown as OnlineLockstepV7;
}

describe("the end of an online game (pulp_wars-eqc6.3)", () => {
  async function endScreen(winnerId: 1 | 2): Promise<void> {
    const game = await table();
    const created = createPlayableGameV7(game.match.setup ?? game.friend.setup);
    if (!created.ok) throw new Error(created.error.code);
    const finished: GameStateV7 = {
      ...created.state,
      outcome: { kind: "VICTORY", winnerId: winnerId as never },
    };
    await boot(game, {
      createOnlineMatchController: (handoff) => {
        handoff.client.stop();
        return new OnlineMatchControllerV7({
          client: finishedClient(finished, 0),
        });
      },
    });
    await waitUntil(() => region("results") !== null);
  }

  it("shows Victory to the winner, with Play again to Play online and no leaderboard", async () => {
    await endScreen(1);
    const results = region("results");
    expect(results?.querySelector("h2")?.textContent).toBe("Victory");
    expect(region("online-result")?.textContent).toBe(
      "You won the online game.",
    );
    expect(results?.querySelector(".v7-board-submit")).toBeNull();
    expect(window.localStorage.getItem(ONLINE_LOBBY_STORAGE_KEY_V7)).toBeNull();
    press("restart");
    await waitUntil(
      () =>
        document.querySelector<HTMLElement>(".v7-online")?.dataset.screen ===
        "home",
    );
  });

  it("shows Defeat to the other player, naming the winner", async () => {
    await endScreen(2);
    expect(region("results")?.querySelector("h2")?.textContent).toBe("Defeat");
    expect(region("online-result")?.textContent).toBe(
      "Bo won the online game.",
    );
    press("results-menu");
    await waitUntil(() => document.querySelector(".v7-main-menu") !== null);
  });

  it("puts an eliminated player in a watching state with a way to leave", async () => {
    const game = await table();
    const created = createPlayableGameV7(game.match.setup ?? game.friend.setup);
    if (!created.ok) throw new Error(created.error.code);
    // I am out; Bo is to move against nobody else: a hand-built state.
    const out: GameStateV7 = {
      ...created.state,
      activeSeatIndex: created.state.turnOrder.indexOf(2 as never),
      players: created.state.players.map((player) =>
        player.id === 1 ? { ...player, status: "ELIMINATED" } : player,
      ),
    };
    const calls: string[] = [];
    await boot(game, {
      createOnlineMatchController: (handoff) => {
        handoff.client.stop();
        return new OnlineMatchControllerV7({
          client: finishedClient(out, 0, calls),
        });
      },
    });
    await waitUntil(() => region("online-out") !== null);
    expect(region("online-out")?.querySelector("h2")?.textContent).toBe(
      "You're out",
    );
    press("online-out-watch");
    expect(region("online-out")).toBeNull();
    expect(status()).toBe("You're out · Bo is moving…");
    press("compact-menu");
    expect(action("leave-online")?.textContent).toBe("Stop watching");
    press("leave-online");
    expect(region("online-leave-confirm")?.textContent).toContain(
      "Bo plays on without you.",
    );
    press("online-leave");
    await waitUntil(() => document.querySelector(".v7-main-menu") !== null);
    // An out guest only stops watching: nothing is abandoned.
    expect(calls).toEqual([]);
  });
});
