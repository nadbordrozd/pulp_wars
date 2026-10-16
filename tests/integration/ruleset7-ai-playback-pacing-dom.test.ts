// @vitest-environment jsdom

// Calm playback through the real wiring (bead pulp_wars-2yc.59): the real
// browser controller and the real DOM app view play one AI turn of a
// hand-scripted policy (each AI unit on the Showcase board steps once; no
// match is played) on a board host whose presentations end only when the
// test says so. The AI decides in no time, like the real Normal AI next to a
// 240 ms a tile walk, so without the pacing gate it ran ahead of the board:
// the queue grew past three (playback hurried towards 0.375) and past
// twelve (the queue was cut and the enemy's units jumped).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7AiProgressScheduler,
  type Ruleset7PolicyWork,
} from "../../src/app/index";
import {
  RULESET_7_ID,
  distinctFactionsV7,
  queryPlayerCommandsV7,
  type MatchSetupV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
  PresentBoundaryOptionsV7,
} from "../../src/render/canvas/board-host-v7";
import {
  AI_PACING_BACKLOG_V7,
  playbackDurationScaleV7,
} from "../../src/render/canvas/playback-pacing-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import { decisionV7 } from "./ruleset7-browser-controller.shared";

/** At most this many AI commands before the scripted AI ends its turn. */
const AI_MOVES = 16;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  Reflect.deleteProperty(document, "visibilityState");
});

describe("Ruleset 7 AI playback pacing", () => {
  it("holds the AI while the board is behind, so every AI command plays unhurried and the queue is never cut", async () => {
    const rig = await mountRig();
    await rig.endHumanTurn();
    let heldWhileBehind = 0;
    for (let round = 0; round < 200 && !rig.done(); round += 1) {
      await rig.runAiAsFastAsItCan();
      if (rig.controller.snapshot().ai.active && rig.host.playing() > 0)
        heldWhileBehind += 1;
      rig.host.finishOne();
      await flush();
    }
    expect(rig.done()).toBe(true);
    const aiAccepted = rig.accepted.filter((actor) => actor === "AI").length;
    // The scripted turn is longer than the queue cut.
    expect(aiAccepted).toBeGreaterThan(12);
    const aiPresented = rig.host.presented.filter((entry) => entry.ai);
    // Every AI command was played, none was cut.
    expect(aiPresented).toHaveLength(aiAccepted);
    expect(rig.host.finishes).toBe(rig.finishesBeforeTurn);
    // No AI command waited behind a backlog that hurries playback.
    expect(
      Math.max(...aiPresented.map((entry) => entry.upcoming)),
    ).toBeLessThan(AI_PACING_BACKLOG_V7);
    for (const entry of aiPresented)
      expect(playbackDurationScaleV7("NORMAL", entry.upcoming)).toBe(1);
    // The AI was really held, not merely slow.
    expect(heldWhileBehind).toBeGreaterThan(5);
    rig.destroy();
  });

  it("lets Fast Forward release a held AI at once", async () => {
    const rig = await mountRig();
    await rig.endHumanTurn();
    await rig.runAiAsFastAsItCan();
    // Held: the AI is mid-turn, nothing is scheduled and the board is behind.
    expect(rig.controller.snapshot().ai.active).toBe(true);
    expect(rig.scheduler.activeCount()).toBe(0);
    expect(rig.host.playing()).toBe(1);
    document
      .querySelector<HTMLButtonElement>('[data-action="fast-forward"]')
      ?.click();
    await flush();
    await rig.runAiAsFastAsItCan();
    // The turn finished without the board playing any more of it.
    expect(rig.controller.snapshot().ai.active).toBe(false);
    expect(
      rig.accepted.filter((actor) => actor === "AI").length,
    ).toBeGreaterThan(12);
    rig.destroy();
  });

  it("never holds the AI while the page is hidden", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    const rig = await mountRig();
    await rig.endHumanTurn();
    await rig.runAiAsFastAsItCan();
    // Nothing is drawn on a hidden page: the AI ends its turn regardless.
    expect(rig.controller.snapshot().ai.active).toBe(false);
    expect(
      rig.accepted.filter((actor) => actor === "AI").length,
    ).toBeGreaterThan(12);
    rig.destroy();
  });
});

interface Rig {
  readonly controller: Ruleset7BrowserController;
  readonly host: PacedBoardHost;
  readonly scheduler: ManualScheduler;
  readonly accepted: ("HUMAN" | "AI")[];
  finishesBeforeTurn: number;
  endHumanTurn(): Promise<void>;
  runAiAsFastAsItCan(): Promise<void>;
  done(): boolean;
  destroy(): void;
}

async function mountRig(): Promise<Rig> {
  const scheduler = manualScheduler();
  const controller = new Ruleset7BrowserController({
    aiProgressScheduler: scheduler.schedule,
    createAiPolicyWork: steppingWork,
  });
  const launched = await controller.launch(showcaseSetup());
  if (!launched.ok) throw new Error(launched.diagnostic);
  const accepted: ("HUMAN" | "AI")[] = [];
  controller.subscribeAcceptedBoundary((boundary) =>
    accepted.push(boundary.actor),
  );
  const host = new PacedBoardHost();
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  const view = new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
  const rig: Rig = {
    controller,
    host,
    scheduler,
    accepted,
    finishesBeforeTurn: 0,
    async endHumanTurn() {
      const end = document.querySelector<HTMLButtonElement>(
        '[data-action="end-turn"]',
      );
      if (end === null) throw new Error("End Turn missing");
      end.click();
      await flush();
      // The human's own End Turn plays first; the AI starts after it.
      expect(host.presented).toHaveLength(1);
      rig.finishesBeforeTurn = host.finishes;
      host.finishOne();
      await flush();
    },
    async runAiAsFastAsItCan() {
      for (let index = 0; index < 400; index += 1) {
        if (scheduler.activeCount() === 0) {
          await flush();
          if (scheduler.activeCount() === 0) return;
        }
        scheduler.runNext();
        await Promise.resolve();
      }
      throw new Error("The AI never stopped");
    },
    done() {
      return (
        !controller.snapshot().ai.active &&
        scheduler.activeCount() === 0 &&
        host.playing() === 0 &&
        accepted.length > 1
      );
    },
    destroy() {
      view.destroy();
      controller.destroy();
    },
  };
  return rig;
}

/** Each AI unit steps once, then the AI ends its turn. */
function steppingWork(
  view: PlayerViewV7,
  acceptedThisTurn: number,
): Ruleset7PolicyWork {
  const commands = queryPlayerCommandsV7(view);
  const command =
    (acceptedThisTurn < AI_MOVES
      ? commands.find((candidate) => candidate.kind === "MOVE")
      : undefined) ??
    commands.find((candidate) => candidate.kind === "END_TURN");
  if (command === undefined) throw new Error("No command for the AI");
  const decision = decisionV7(command);
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

/** A board whose presentations end when the test finishes them. */
class PacedBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  model: BoardHostModelV7 | null = null;
  readonly presented: { readonly ai: boolean; readonly upcoming: number }[] =
    [];
  finishes = 0;
  readonly #pending: (() => void)[] = [];

  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    container.replaceChildren(canvas);
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  resetInspectionCycle(): void {}
  zoom(): void {}
  focus(): void {}
  presentBoundary(
    before: PlayerViewV7,
    _after: PlayerViewV7,
    _events: unknown,
    options: PresentBoundaryOptionsV7 = {},
  ): Promise<void> {
    this.presented.push({
      ai: before.turnOrder[before.activeSeatIndex] !== before.viewer.id,
      upcoming: options.upcoming?.length ?? 0,
    });
    return new Promise<void>((resolve) => this.#pending.push(resolve));
  }
  /** Like the canvas host: a finished presentation ends at once. */
  finishPresentations(): void {
    this.finishes += 1;
    for (const resolve of this.#pending.splice(0)) resolve();
  }
  playing(): number {
    return this.#pending.length;
  }
  finishOne(): void {
    this.#pending.shift()?.();
  }
  destroy(): void {
    this.callbacks = null;
    this.model = null;
  }
}

interface ManualScheduler {
  readonly schedule: Ruleset7AiProgressScheduler;
  activeCount(): number;
  runNext(): void;
}

function manualScheduler(): ManualScheduler {
  const entries: { readonly task: () => void; cancelled: boolean }[] = [];
  return {
    schedule(task) {
      const entry = { task, cancelled: false };
      entries.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    activeCount: () => entries.filter((entry) => !entry.cancelled).length,
    runNext() {
      const entry = entries.find((candidate) => !candidate.cancelled);
      if (entry === undefined) throw new Error("scheduled callback missing");
      entry.cancelled = true;
      entry.task();
    },
  };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}
