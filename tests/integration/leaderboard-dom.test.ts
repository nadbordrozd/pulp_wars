// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LEADERBOARD_NAME_STORAGE_KEY_V7,
  LeaderboardErrorV7,
  createGameLeaderboardV7,
  leaderboardPreviewEntriesV7,
  memoryLeaderboardBackendV7,
  type GameLeaderboardV7,
  type LeaderboardBackendV7,
  type LeaderboardEntryV7,
} from "../../src/app/leaderboard-v7";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
} from "../../src/app/index";
import { viewForV7, type GameStateV7 } from "../../src/engine/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  scoreDominationVictoryV7,
  scorePerfectionEndV7,
} from "../fixtures/v7-score-ui";

/**
 * The public leaderboard in the app (bead pulp_wars-2yc.104): the menu's
 * Leaderboard screen with its two tabs and its loading, empty, offline and
 * error states; and the end screen's submit, offered only after a won
 * Regular game, once per match. Every board is in memory or a stub: no
 * test reaches the real store. No match is played.
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

function idleAi(): Ruleset7BrowserSnapshot["ai"] {
  return {
    active: false,
    fastForward: false,
    policySlices: 0,
    acceptedCommands: 0,
    lastSliceMilliseconds: 0,
    maximumSliceMilliseconds: 0,
  };
}

/** A finished match; Main menu (deleteStoredSave) empties it. */
class FinishedController implements Ruleset7ControllerPortV7 {
  #snapshot: Ruleset7BrowserSnapshot;
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();

  constructor(finished: GameStateV7) {
    this.#snapshot = {
      phase: "COMPLETE",
      view: viewForV7(finished, finished.humanPlayerId),
      offeredCommands: [],
      savedAt: null,
      hasStoredSave: true,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
      ai: idleAi(),
    };
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#subscribers.delete(subscriber);
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "fixture",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = async () => ({
    accepted: false,
    reason: "NOT_OFFERED",
  });
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "No AI",
    });
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => ({
    ok: false,
    code: "CONTROLLER_DESTROYED",
    diagnostic: "No restart",
  });
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => {
      this.#snapshot = {
        ...this.#snapshot,
        phase: "EMPTY",
        view: null,
        hasStoredSave: false,
      };
      for (const subscriber of this.#subscribers) subscriber(this.#snapshot);
      return true;
    };
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
}

let app: BootstrappedRuleset7App | null = null;
let view: Ruleset7DomAppView | null = null;

function boot(leaderboard?: GameLeaderboardV7): BootstrappedRuleset7App {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage: null,
    boardHost: new Host(),
    randomSeed: () => 7,
    randomDraw: () => 0,
    ...(leaderboard === undefined ? {} : { leaderboard }),
  });
  return app;
}

function mountFinished(
  finished: GameStateV7,
  leaderboard: GameLeaderboardV7,
): void {
  view?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  view = new Ruleset7DomAppView(
    document,
    required("#app"),
    new FinishedController(finished),
    {
      boardHost: new Host(),
      settingsStorage: null,
      randomSeed: () => 7,
      randomDraw: () => 0,
      leaderboard,
    },
  );
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function press(action: string): void {
  required<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

const boardState = (): string | undefined =>
  document.querySelector<HTMLElement>(".v7-public-board")?.dataset.state;

const rows = (): string[][] =>
  [...document.querySelectorAll<HTMLElement>(".v7-public-board-row")].map(
    (row) => [
      row.querySelector(".v7-public-board-rank")?.textContent ?? "",
      row.querySelector<HTMLElement>(".v7-faction-emblem")?.dataset.faction ??
        "",
      row.querySelector(".v7-public-board-name")?.textContent ?? "",
      row.querySelector(".v7-public-board-score")?.textContent ?? "",
    ],
  );

function memoryBoard(
  seed: readonly LeaderboardEntryV7[] = leaderboardPreviewEntriesV7(),
  storage: StorageAdapter | null = null,
) {
  const backend = memoryLeaderboardBackendV7(seed);
  return {
    backend,
    board: createGameLeaderboardV7(backend, { storage, live: false }),
  };
}

/** A finished state recorded as a regular game (pulp_wars-2yc.103). */
function regular(state: GameStateV7): GameStateV7 {
  return { ...state, setup: { ...state.setup, gameKind: "REGULAR" } };
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
  view?.destroy();
  view = null;
});

describe("the Leaderboard screen", () => {
  it("is in the menu after Campaign only when the page has a board", () => {
    boot();
    expect(document.querySelector('[data-action="public-leaderboard"]')).toBe(
      null,
    );
    boot(memoryBoard().board);
    const actions = [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-main-menu button"),
    ].map((button) => button.dataset.action);
    expect(actions.indexOf("public-leaderboard")).toBe(
      actions.indexOf("campaign") + 1,
    );
    expect(
      required('[data-action="public-leaderboard"]').textContent,
    ).toContain("Leaderboard");
  });

  it("loads, then shows each tab's top scores as rank, emblem, name and score", async () => {
    boot(memoryBoard().board);
    press("public-leaderboard");
    expect(
      required('[data-v7-front="leaderboard"] .v7-front-title').textContent,
    ).toBe("Leaderboard");
    // The first draw asks the store.
    expect(boardState()).toBe("loading");
    expect(required(".v7-public-board-status").textContent).toContain(
      "Loading",
    );
    await waitUntil(() => boardState() === "ready");
    const tabs = [
      ...document.querySelectorAll<HTMLElement>('[role="tab"]'),
    ].map((tab) => [tab.textContent, tab.getAttribute("aria-selected")]);
    expect(tabs).toEqual([
      ["Domination", "true"],
      ["Perfection", "false"],
    ]);
    expect(rows().slice(0, 3)).toEqual([
      ["1", "MARTIAN", "Captain Nova", "1412"],
      ["2", "DWARF", "Grumblebeard", "1180"],
      ["3", "DINOSAUR", "Rex", "975"],
    ]);
    expect(rows()).toHaveLength(7);
    expect(required(".v7-public-board-note").textContent).toContain(
      "Practice board",
    );
    press("public-leaderboard-perfection");
    await waitUntil(
      () =>
        boardState() === "ready" &&
        required(".v7-public-board").dataset.mode === "perfection",
    );
    expect(rows()).toEqual([
      ["1", "CULT", "The Whisperer", "1033"],
      ["2", "ORIGINAL", "Doc Savage", "921"],
      ["3", "MARTIAN", "Zorg", "744"],
    ]);
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "public-leaderboard-perfection",
    );
    // The arrow keys move between the tabs.
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    await waitUntil(
      () => required(".v7-public-board").dataset.mode === "domination",
    );
    // Back to the menu, with the Leaderboard button focused.
    press("front-back");
    await waitUntil(
      () =>
        document.activeElement?.getAttribute("data-action") ===
        "public-leaderboard",
    );
  });

  it("shows each score's player count, and a dash for an old score without one", async () => {
    boot(memoryBoard().board);
    press("public-leaderboard");
    await waitUntil(() => boardState() === "ready");
    const chips = [
      ...document.querySelectorAll<HTMLElement>(".v7-public-board-row"),
    ].map((row) => {
      const chip = row.querySelector<HTMLElement>(".v7-public-board-players");
      return [
        row.querySelector(".v7-public-board-name")?.textContent,
        chip?.textContent,
        chip?.title,
        chip?.dataset.players ?? null,
      ];
    });
    expect(chips).toEqual([
      ["Captain Nova", "6P", "6 players", "6"],
      ["Grumblebeard", "5P", "5 players", "5"],
      ["Rex", "4P", "4 players", "4"],
      ["Lady Frost", "4P", "4 players", "4"],
      ["Sugar Plum", "3P", "3 players", "3"],
      ["Snaggletooth", "2P", "2 players", "2"],
      // The preview's old row, sent before the count was recorded.
      ["Count Dread", "—", "Players not recorded", null],
    ]);
    // Between the name and the score, read out in words.
    const first = required(".v7-public-board-row");
    const order = [...first.children].map((child) => child.className);
    expect(order.indexOf("v7-public-board-players")).toBeGreaterThan(
      order.indexOf("v7-public-board-name"),
    );
    expect(order.indexOf("v7-public-board-players")).toBeLessThan(
      order.indexOf("v7-public-board-score"),
    );
    expect(
      required(".v7-public-board-players").getAttribute("aria-hidden"),
    ).toBe("true");
    expect(first.textContent).toContain(", 6 players");
    const last = [
      ...document.querySelectorAll<HTMLElement>(".v7-public-board-row"),
    ].at(-1);
    expect(last?.textContent).toContain(", Players not recorded");
  });

  it("says when a board is empty", async () => {
    boot(memoryBoard([]).board);
    press("public-leaderboard");
    await waitUntil(() => boardState() === "empty");
    expect(required(".v7-public-board-status").textContent).toBe(
      "No scores yet. Win a game to be the first.",
    );
  });

  it("an offline or failed load shows a line and Try again", async () => {
    let failure: "OFFLINE" | "ERROR" | null = "OFFLINE";
    const backend: LeaderboardBackendV7 = {
      top: async () => {
        if (failure !== null) throw new LeaderboardErrorV7(failure);
        return leaderboardPreviewEntriesV7().slice(0, 2);
      },
      submit: async () => "id",
      countAbove: async () => 0,
    };
    boot(createGameLeaderboardV7(backend, { storage: null, live: true }));
    press("public-leaderboard");
    await waitUntil(() => boardState() === "offline");
    expect(required(".v7-public-board-status").textContent).toBe(
      "You're offline. The leaderboard needs the internet.",
    );
    // The live board has no practice note.
    expect(document.querySelector(".v7-public-board-note")).toBeNull();
    failure = "ERROR";
    press("public-leaderboard-retry");
    await waitUntil(() => boardState() === "error");
    expect(required(".v7-public-board-status").textContent).toBe(
      "Couldn't reach the leaderboard.",
    );
    failure = null;
    press("public-leaderboard-retry");
    await waitUntil(() => boardState() === "ready");
    expect(rows()).toHaveLength(2);
  });
});

describe("Submit to the leaderboard", () => {
  it("is offered after a Domination win and sends the name once", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LEADERBOARD_NAME_STORAGE_KEY_V7, "Old Name");
    const { backend, board } = memoryBoard(undefined, storage);
    const won = regular(scoreDominationVictoryV7());
    mountFinished(won, board);
    const panel = required('[data-v7-region="board-submit"]');
    expect(panel.closest(".v7-results")).not.toBeNull();
    expect(panel.dataset.state).toBe("idle");
    const score = viewForV7(won, won.humanPlayerId).score.summary?.grade.score;
    expect(required(".v7-board-submit-lede").textContent).toBe(
      `Score ${score} · Domination`,
    );
    const field = required<HTMLInputElement>("#v7-board-name");
    // The last name sent from this browser.
    expect(field.value).toBe("Old Name");
    expect(field.maxLength).toBe(16);
    // A rude name is refused here, and nothing is sent.
    field.value = "shit head";
    required<HTMLFormElement>(".v7-board-submit-form").requestSubmit();
    await waitUntil(
      () =>
        required(".v7-board-submit-message").textContent ===
        "Please pick another name.",
    );
    expect(backend.entries).toHaveLength(10);
    const retyped = required<HTMLInputElement>("#v7-board-name");
    expect(retyped.value).toBe("shit head");
    expect(retyped.getAttribute("aria-invalid")).toBe("true");
    retyped.value = "  Doc  Savage ";
    press("board-submit");
    await waitUntil(() => panel.dataset.state === "sent");
    expect(backend.entries.at(-1)).toMatchObject({
      name: "Doc Savage",
      mode: "DOMINATION",
      score,
      // The players of the match (pulp_wars-2yc.112).
      players: won.setup.aiCount + 1,
    });
    const rank =
      backend.entries.filter(
        (entry) => entry.mode === "DOMINATION" && entry.score > (score ?? 0),
      ).length + 1;
    expect(required(".v7-board-submit-result").textContent).toBe(
      `You're #${rank} on the Domination leaderboard with ${score}.`,
    );
    expect(document.querySelector("#v7-board-name")).toBeNull();
    expect(storage.getItem(LEADERBOARD_NAME_STORAGE_KEY_V7)).toBe("Doc Savage");
    // The same match shown again: already sent, no form.
    mountFinished(won, board);
    expect(required('[data-v7-region="board-submit"]').dataset.state).toBe(
      "sent",
    );
    expect(document.querySelector("#v7-board-name")).toBeNull();
    expect(backend.entries).toHaveLength(11);
    // See the leaderboard: the finished match closes, the board opens on
    // its tab with the new row marked.
    press("board-submit-open");
    await waitUntil(() => boardState() === "ready");
    expect(required(".v7-public-board").dataset.mode).toBe("domination");
    const own = required('.v7-public-board-row[data-own="true"]');
    expect(own.querySelector(".v7-public-board-name")?.textContent).toBe(
      "Doc Savage",
    );
    expect(own.dataset.rank).toBe(String(rank));
    expect(own.querySelector(".v7-public-board-players")?.textContent).toBe(
      `${won.setup.aiCount + 1}P`,
    );
  });

  it("a failed send says so and can be sent again", async () => {
    let fail = true;
    const backend: LeaderboardBackendV7 = {
      top: async () => [],
      submit: async () => {
        if (fail) throw new LeaderboardErrorV7("TIMEOUT");
        return "ok-1";
      },
      countAbove: async () => 0,
    };
    mountFinished(
      regular(scorePerfectionEndV7(true)),
      createGameLeaderboardV7(backend, { storage: null, live: true }),
    );
    expect(required(".v7-board-submit-lede").textContent).toContain(
      "Perfection",
    );
    required<HTMLInputElement>("#v7-board-name").value = "Zorg";
    press("board-submit");
    await waitUntil(
      () =>
        required('[data-v7-region="board-submit"]').dataset.state === "failed",
    );
    expect(required(".v7-board-submit-message").textContent).toBe(
      "The leaderboard didn't answer in time. Try again later.",
    );
    expect(required<HTMLInputElement>("#v7-board-name").value).toBe("Zorg");
    fail = false;
    press("board-submit");
    await waitUntil(
      () =>
        required('[data-v7-region="board-submit"]').dataset.state === "sent",
    );
    expect(required(".v7-board-submit-result").textContent).toContain(
      "#1 on the Perfection leaderboard",
    );
  });

  it("is not offered after a custom game's win", () => {
    const won = scoreDominationVictoryV7();
    mountFinished(
      { ...won, setup: { ...won.setup, gameKind: "CUSTOM" } },
      memoryBoard().board,
    );
    expect(required(".v7-results").dataset.outcome).toBe("victory");
    expect(document.querySelector('[data-v7-region="board-submit"]')).toBe(
      null,
    );
  });

  it("is not offered after a defeat, or without a board", () => {
    mountFinished(regular(scorePerfectionEndV7(false)), memoryBoard().board);
    expect(required(".v7-results").dataset.outcome).toBe("defeat");
    expect(document.querySelector('[data-v7-region="board-submit"]')).toBe(
      null,
    );
    view?.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    view = new Ruleset7DomAppView(
      document,
      required("#app"),
      new FinishedController(regular(scoreDominationVictoryV7())),
      { boardHost: new Host(), settingsStorage: null },
    );
    expect(required(".v7-results").dataset.outcome).toBe("victory");
    expect(document.querySelector('[data-v7-region="board-submit"]')).toBe(
      null,
    );
  });
});
