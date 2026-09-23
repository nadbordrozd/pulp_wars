// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7BrowserSnapshot,
  type Ruleset7PolicyWork,
} from "../../src/app/index";
import type { NormalAiDecisionV7 } from "../../src/ai/index";
import {
  queryPlayerCommandsV7,
  type CommandV7,
  type MapTypeV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type { StorageAdapter } from "../../src/persistence/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import { setupV7 } from "../fixtures/v7-builders";

const MAP_TYPES = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
] as const satisfies readonly MapTypeV7[];

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 naval browser controller", () => {
  it("offers all five real setup types with Continents selected by default", () => {
    const controller = new Ruleset7BrowserController();
    const app = new Ruleset7DomAppView(document, requiredRoot(), controller, {
      boardHost: new EmptyBoardHost(),
      settingsStorage: null,
    });
    const mapType = document.querySelector<HTMLSelectElement>("#v7-map-type");
    expect(mapType).not.toBeNull();
    expect(
      Array.from(mapType?.options ?? [], (option) => option.value),
    ).toEqual(MAP_TYPES);
    expect(mapType?.value).toBe("CONTINENTS");
    app.destroy();
    controller.destroy();
  });

  it.each(MAP_TYPES)(
    "launches and resumes the %s setup unchanged",
    async (mapType) => {
      const storage = new MemoryStorage();
      const controller = new Ruleset7BrowserController({ storage });
      const setup = { ...setupV7(9300), mapType };
      const launched = await controller.launch(setup);
      if (!launched.ok) throw new Error(launched.diagnostic);
      expect(launched.view.setup.mapType).toBe(mapType);
      expect(await controller.returnToMenu()).toBe(true);
      controller.destroy();

      const resumed = new Ruleset7BrowserController({ storage });
      expect(resumed.snapshot()).toMatchObject({
        phase: "RESUMABLE",
        view: { setup: { mapType } },
      });
      expect(await resumed.resume()).toBe(true);
      expect(resumed.snapshot()).toMatchObject({
        phase: "ACTIVE",
        view: { setup: { mapType } },
      });
      resumed.destroy();
    },
  );

  it("returns the public human boundary after a normal AI turn", async () => {
    const controller = new Ruleset7BrowserController({
      createAiPolicyWork: immediateEndTurnWork,
      aiProgressScheduler: (resume) => {
        queueMicrotask(resume);
      },
    });
    const launched = await controller.launch({
      ...setupV7(0, 1),
      mapType: "CONTINENTS",
    });
    if (!launched.ok) throw new Error(launched.diagnostic);
    const before = requireView(controller.snapshot());
    expect(before.turnOrder[before.activeSeatIndex]).not.toBe(
      before.humanPlayerId,
    );
    const progressed = await controller.progressAiTurns();
    if (!progressed.ok) throw new Error(progressed.diagnostic);
    const after = requireView(controller.snapshot());
    expect(after.viewer.id).toBe(after.humanPlayerId);
    expect(after.turnOrder[after.activeSeatIndex]).toBe(after.humanPlayerId);
    expect(controller.snapshot().offeredCommands.length).toBeGreaterThan(0);
    controller.destroy();
  });
});

function immediateEndTurnWork(view: PlayerViewV7): Ruleset7PolicyWork {
  const command = queryPlayerCommandsV7(view).find(
    (candidate) => candidate.kind === "END_TURN",
  );
  if (command === undefined) throw new Error("END_TURN missing");
  return { runSlice: () => decision(command) };
}

function decision(command: CommandV7): NormalAiDecisionV7 {
  return {
    difficulty: "NORMAL",
    candidates: [
      {
        command,
        score: {
          priority: 0,
          strategicValue: 0,
          immediateValue: 0,
          futureValue: 0,
          safetyValue: 0,
          objectiveValue: 0,
          deterministicTieBreak: [0, 0, 0, 0, 0],
        },
        tuple: [0],
      },
    ],
    command,
    prngDraws: 0,
  };
}

function requireView(snapshot: Ruleset7BrowserSnapshot): PlayerViewV7 {
  if (snapshot.view === null) throw new Error("view missing");
  return snapshot.view;
}

function requiredRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("root missing");
  return root;
}

class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
  removeItem(key: string): void {
    this.#values.delete(key);
  }
}

class EmptyBoardHost implements BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
    container.replaceChildren(container.ownerDocument.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    void model;
  }
  activate(): void {}
  resetInspectionCycle(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}
