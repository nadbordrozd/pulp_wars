// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
} from "../../src/app/index";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { VICTORY_WAVE_V7 } from "../../src/render/canvas/victory-wave-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  scoreDominationVictoryV7,
  scorePerfectionEndV7,
  scoreUiStateV7,
} from "../fixtures/v7-score-ui";

/**
 * pulp_wars-556y (docs/art/VICTORY_WAVE.md): the Victory dialog waits for
 * the board's victory wave when the viewer has just won, and only then;
 * a click, a key or the time limit brings it at once. Hand-built finished
 * states only: no match is played.
 */

let app: Ruleset7DomAppView | null = null;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.useRealTimers();
});

const results = (): Element | null =>
  document.querySelector('[data-v7-region="results"]');

describe("the Victory dialog and the victory wave", () => {
  it("waits for the wave when the viewer wins, then shows", () => {
    const { controller, host } = rig(scoreUiStateV7());
    expect(results()).toBeNull();
    controller.emit(scoreDominationVictoryV7());
    expect(results()).toBeNull();
    expect(host.listener).not.toBeNull();
    host.land();
    expect(results()).not.toBeNull();
    expect(results()?.getAttribute("data-outcome")).toBe("victory");
    expect(host.listener).toBeNull();
  });

  it("waits for a Perfection win by the score too", () => {
    const { controller, host } = rig(scoreUiStateV7("PERFECTION", 30));
    controller.emit(scorePerfectionEndV7(true));
    expect(results()).toBeNull();
    host.land();
    expect(results()).not.toBeNull();
  });

  it("shows a defeat at once", () => {
    const { controller, host } = rig(scoreUiStateV7("PERFECTION", 30));
    controller.emit(scorePerfectionEndV7(false));
    expect(results()?.getAttribute("data-outcome")).toBe("defeat");
    expect(host.listener).toBeNull();
  });

  it("shows at once on a board that cannot play the wave", () => {
    const { controller, host } = rig(scoreUiStateV7(), false);
    controller.emit(scoreDominationVictoryV7());
    expect(results()).not.toBeNull();
    expect(host.listener).toBeNull();
  });

  it("shows a match loaded already won at once", () => {
    rig(scoreDominationVictoryV7());
    expect(results()).not.toBeNull();
  });

  it("comes at once on a key, never blocked by the wave", () => {
    const { controller, host } = rig(scoreUiStateV7());
    controller.emit(scoreDominationVictoryV7());
    expect(results()).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
    expect(results()).not.toBeNull();
    expect(host.listener).toBeNull();
    // The dialog's buttons work as ever.
    expect(
      document
        .querySelector('[data-action="restart"]')
        ?.hasAttribute("disabled"),
    ).toBe(false);
  });

  it("comes at once on a tap, which does not reach the board", () => {
    const { controller } = rig(scoreUiStateV7());
    controller.emit(scoreDominationVictoryV7());
    const canvas = document.querySelector("canvas");
    if (canvas === null) throw new Error("no board");
    let reached = 0;
    canvas.addEventListener("pointerdown", () => {
      reached += 1;
    });
    canvas.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(results()).not.toBeNull();
    expect(reached).toBe(0);
  });

  it("never waits longer than its limit", () => {
    vi.useFakeTimers();
    const { controller } = rig(scoreUiStateV7());
    controller.emit(scoreDominationVictoryV7());
    vi.advanceTimersByTime(VICTORY_WAVE_V7.dialogHoldLimitMs - 1);
    expect(results()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(results()).not.toBeNull();
  });
});

function snapshotOf(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    phase: state.outcome === null ? "ACTIVE" : "COMPLETE",
    view,
    offeredCommands: state.outcome === null ? queryPlayerCommandsV7(view) : [],
    savedAt: null,
    hasStoredSave: false,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: {
      active: false,
      fastForward: false,
      policySlices: 0,
      acceptedCommands: 0,
      lastSliceMilliseconds: 0,
      maximumSliceMilliseconds: 0,
    },
  };
}

function rig(state: GameStateV7, animates = true) {
  const controller = new EmittingController(snapshotOf(state));
  const host = new WaveBoardHost(animates);
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  app = new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
  return { controller, host };
}

class EmittingController implements Ruleset7ControllerPortV7 {
  #snapshot: Ruleset7BrowserSnapshot;
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  constructor(snapshot: Ruleset7BrowserSnapshot) {
    this.#snapshot = snapshot;
  }
  /** The match moves on to `state`, as after an accepted command. */
  emit(state: GameStateV7): void {
    this.#snapshot = snapshotOf(state);
    for (const subscriber of this.#subscribers) subscriber(this.#snapshot);
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
    diagnostic: "No launch",
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
    async () => false;
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
}

/** A board host that plays a victory wave when told it has landed. */
class WaveBoardHost implements BoardHostV7 {
  listener: (() => void) | null = null;
  readonly #animates: boolean;
  constructor(animates: boolean) {
    this.#animates = animates;
  }
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
    container.append(document.createElement("canvas"));
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
  victoryWaveAnimates(): boolean {
    return this.#animates;
  }
  setVictoryWaveListener(listener: (() => void) | null): void {
    this.listener = listener;
  }
  /** The wave lands. */
  land(): void {
    this.listener?.();
  }
}
