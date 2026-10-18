// @vitest-environment jsdom

// The mobile freeze (bead pulp_wars-2yc.93) through the real wiring: the
// real browser controller and the real DOM app view on the Showcase board
// (no match is played: the human sends a Move or two and ends the turn, a
// scripted AI ends its own) with a board host whose playback throws. Before
// the guard, one throw left the playback chain rejected: the interface was
// busy for good (End Turn disabled, every command refused) while a unit
// could still be selected, and with a board that kept throwing Save & quit
// failed on the way to the menu.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7AiProgressScheduler,
  type Ruleset7PolicyWork,
} from "../../src/app/index";
import {
  RULESET_7_ID,
  distinctFactionsV7,
  queryPlayerCommandsV7,
  type CommandV7,
  type MatchSetupV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  PLAYBACK_WATCHDOG_MS_V7,
  Ruleset7DomAppView,
} from "../../src/render/dom/app-view-v7";
import type { StorageAdapter } from "../../src/persistence/index";
import { decisionV7 } from "./ruleset7-browser-controller.shared";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("A failing playback never locks the interface (pulp_wars-2yc.93)", () => {
  it("keeps commands, End Turn and the AI going after one boundary's playback throws", async () => {
    const rig = await mountRig(new FlakyBoardHost(1));
    const first = rig.humanMove();
    expect(await rig.view.dispatchForReview(first)).toBe(true);
    await flush();
    expect(rig.host.presented).toBe(1);
    expect(rig.view.busyStateForReview().presentationActive).toBe(false);
    expect(rig.endTurn()?.disabled).toBe(false);
    // The next command is accepted and played.
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    expect(rig.host.presented).toBe(2);
    // End Turn passes the turn and the AI plays its own back to the human.
    rig.endTurn()?.click();
    await rig.runAi();
    const snapshot = rig.controller.snapshot();
    expect(snapshot.view?.round).toBe(2);
    expect(
      snapshot.view?.turnOrder[snapshot.view.activeSeatIndex] ===
        snapshot.view?.humanPlayerId,
    ).toBe(true);
    expect(rig.endTurn()?.disabled).toBe(false);
    expect(console.error).toHaveBeenCalled();
    rig.destroy();
  });

  it("plays a command whose first render throws and releases its lock", async () => {
    const host = new FlakyBoardHost(0);
    const rig = await mountRig(host);
    // A command that is not a visible Move renders at once after it is
    // accepted; that render throws.
    const train = rig.controller
      .snapshot()
      .offeredCommands.find(
        (command) => command.kind !== "MOVE" && command.kind !== "END_TURN",
      );
    if (train === undefined) throw new Error("no command besides Move");
    host.failNextUpdate = true;
    expect(await rig.view.dispatchForReview(train)).toBe(false);
    await flush();
    // The boundary still played and the interface is free again.
    expect(host.presented).toBe(1);
    expect(rig.view.busyStateForReview().presentationActive).toBe(false);
    expect(rig.endTurn()?.disabled).toBe(false);
    rig.destroy();
  });

  it("finishes a playback that never ends after the watchdog's wait", async () => {
    const host = new FlakyBoardHost(0);
    host.hang = true;
    const rig = await mountRig(host);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const sent = rig.view.dispatchForReview(rig.humanMove());
      await vi.advanceTimersByTimeAsync(PLAYBACK_WATCHDOG_MS_V7 - 1_000);
      // Still playing: the interface waits for the board, as it should.
      expect(rig.view.busyStateForReview().presentationActive).toBe(true);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(await sent).toBe(true);
      expect(host.finished).toBe(1);
      expect(rig.view.busyStateForReview().presentationActive).toBe(false);
      expect(rig.endTurn()?.disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    rig.destroy();
  });

  it("shows a Save & quit that could not save and keeps the game going", async () => {
    let failing = false;
    const store = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        if (failing) throw new Error("QuotaExceededError");
        store.set(key, value);
      },
      removeItem: (key) => void store.delete(key),
    };
    const rig = await mountRig(new FlakyBoardHost(0), { storage });
    failing = true;
    click('[data-action="compact-menu"]');
    click('[data-action="main-menu"]');
    await flush();
    expect(rig.controller.snapshot().phase).toBe("ACTIVE");
    // The match's alert line is for screen readers; the failure also
    // shows as the error toast.
    expect(document.querySelector(".v7-toast-error")?.textContent).toContain(
      "saved match",
    );
    // The game goes on.
    expect(rig.endTurn()?.disabled).toBe(false);
    rig.destroy();
  });

  it("never leaves a failed AI turn as a dead end: Main menu saves and leaves, Try again plays on", async () => {
    let fail = true;
    const rig = await mountRig(new FlakyBoardHost(0), {
      aiWork: (view) => {
        if (fail) throw new Error("AI crashed");
        return endingWork(view);
      },
    });
    rig.endTurn()?.click();
    await rig.runAi();
    expect(rig.controller.snapshot().phase).toBe("ERROR");
    expect(document.querySelector('[data-v7-region="error"]')).not.toBeNull();
    // Try again: the AI plays its turn from where it stopped.
    fail = false;
    click('[data-action="error-retry"]');
    await rig.runAi();
    expect(rig.controller.snapshot().phase).toBe("ACTIVE");
    expect(rig.controller.snapshot().view?.round).toBe(2);
    // Main menu, from a second failure.
    fail = true;
    rig.endTurn()?.click();
    await rig.runAi();
    expect(rig.controller.snapshot().phase).toBe("ERROR");
    click('[data-action="error-main-menu"]');
    await flush();
    expect(rig.controller.snapshot().phase).toBe("RESUMABLE");
    expect(document.querySelector('[data-action="resume"]')).not.toBeNull();
    rig.destroy();
  });

  it("still saves and quits to the menu when the board throws at everything", async () => {
    const rig = await mountRig(new FlakyBoardHost(Infinity, true));
    await rig.view.dispatchForReview(rig.humanMove());
    await flush();
    expect(rig.view.busyStateForReview().presentationActive).toBe(false);
    expect(rig.endTurn()?.disabled).toBe(false);
    click('[data-action="compact-menu"]');
    click('[data-action="main-menu"]');
    await flush();
    expect(rig.controller.snapshot().phase).toBe("RESUMABLE");
    expect(document.querySelector('[data-action="resume"]')).not.toBeNull();
    expect(document.querySelector('[data-v7-region="hud"]')).toBeNull();
    rig.destroy();
  });
});

function click(selector: string): void {
  const target = document.querySelector<HTMLButtonElement>(selector);
  if (target === null) throw new Error(`missing ${selector}`);
  target.click();
}

interface Rig {
  readonly controller: Ruleset7BrowserController;
  readonly view: Ruleset7DomAppView;
  readonly host: FlakyBoardHost;
  humanMove(): CommandV7;
  endTurn(): HTMLButtonElement | null;
  runAi(): Promise<void>;
  destroy(): void;
}

interface RigOptions {
  readonly storage?: StorageAdapter | null;
  readonly aiWork?: (view: PlayerViewV7) => Ruleset7PolicyWork;
}

async function mountRig(
  host: FlakyBoardHost,
  options: RigOptions = {},
): Promise<Rig> {
  const scheduled: (() => void)[] = [];
  const schedule: Ruleset7AiProgressScheduler = (task) => {
    scheduled.push(task);
    return () => {
      const index = scheduled.indexOf(task);
      if (index >= 0) scheduled.splice(index, 1);
    };
  };
  const controller = new Ruleset7BrowserController({
    aiProgressScheduler: schedule,
    createAiPolicyWork: options.aiWork ?? endingWork,
    ...(options.storage === undefined ? {} : { storage: options.storage }),
  });
  const launched = await controller.launch(showcaseSetup());
  if (!launched.ok) throw new Error(launched.diagnostic);
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  const view = new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
  await flush();
  return {
    controller,
    view,
    host,
    humanMove() {
      const move = controller
        .snapshot()
        .offeredCommands.find((command) => command.kind === "MOVE");
      if (move === undefined) throw new Error("no Move offered");
      return move;
    },
    endTurn: () =>
      document.querySelector<HTMLButtonElement>('[data-action="end-turn"]'),
    async runAi() {
      for (let index = 0; index < 200; index += 1) {
        await flush();
        const next = scheduled.shift();
        if (next === undefined) {
          await flush();
          if (scheduled.length === 0) return;
          continue;
        }
        next();
      }
      throw new Error("The AI never stopped");
    },
    destroy() {
      view.destroy();
      controller.destroy();
    },
  };
}

/** The scripted AI ends its turn at once. */
function endingWork(view: PlayerViewV7): Ruleset7PolicyWork {
  const end = queryPlayerCommandsV7(view).find(
    (candidate) => candidate.kind === "END_TURN",
  );
  if (end === undefined) throw new Error("No End Turn for the AI");
  const decision = decisionV7(end);
  return { runSlice: () => decision };
}

/** The Showcase board: every seat starts with its whole roster. */
function showcaseSetup(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 0,
    width: 16,
    height: 16,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: distinctFactionsV7(2),
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * A board whose first `failures` playbacks throw; with `everything`, so do
 * finishing a playback and taking the board down (a board whose every
 * frame throws).
 */
class FlakyBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  model: BoardHostModelV7 | null = null;
  presented = 0;
  readonly #failures: number;
  readonly #everything: boolean;

  constructor(failures: number, everything = false) {
    this.#failures = failures;
    this.#everything = everything;
  }

  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    container.replaceChildren(canvas);
  }
  /** The next update throws (a render that fails once). */
  failNextUpdate = false;
  update(model: BoardHostModelV7): void {
    if (this.failNextUpdate) {
      this.failNextUpdate = false;
      throw new Error("render failed");
    }
    this.model = model;
  }
  activate(): void {}
  resetInspectionCycle(): void {}
  zoom(): void {}
  focus(): void {}
  /** A playback whose frames stopped: it ends only when finished. */
  hang = false;
  finished = 0;
  readonly #hanging: (() => void)[] = [];
  async presentBoundary(): Promise<void> {
    this.presented += 1;
    if (this.presented <= this.#failures)
      throw new Error("playback step failed");
    if (this.hang)
      await new Promise<void>((resolve) => this.#hanging.push(resolve));
  }
  finishPresentations(): void {
    if (this.#everything) throw new Error("finish failed");
    if (this.#hanging.length > 0) this.finished += 1;
    for (const resolve of this.#hanging.splice(0)) resolve();
  }
  destroy(): void {
    if (this.#everything) throw new Error("destroy failed");
    this.callbacks = null;
  }
}

async function flush(): Promise<void> {
  for (let index = 0; index < 8; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}
