// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import type {
  Ruleset7BrowserSnapshot,
  Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  RESEARCH_PROMPT_UI_V7,
  researchPromptMatchV7,
} from "../fixtures/v7-research-prompt";

/**
 * Research prompts in the interface (bead pulp_wars-gl1,
 * docs/ui/SCREEN_FLOW.md "Research prompts"): a tile whose resource needs a
 * technology the viewer lacks offers a button that opens the technology
 * screen on that technology, and the tile's action is there on return.
 */
const {
  fruit: FRUIT,
  game: GAME,
  forest: FOREST,
  fertile: FERTILE,
  grass: GRASS,
  enemyFruit: ENEMY_FRUIT,
} = RESEARCH_PROMPT_UI_V7;
const match = researchPromptMatchV7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

function open(state: GameStateV7): {
  readonly app: Ruleset7DomAppView;
  readonly host: RecordingBoardHost;
  readonly controller: LiveController;
} {
  const host = new RecordingBoardHost();
  const controller = new LiveController(state);
  const app = new Ruleset7DomAppView(
    document,
    required<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: null },
  );
  return { app, host, controller };
}

const prompts = (): string[] =>
  [...document.querySelectorAll<HTMLElement>(".v7-research-prompt")].map(
    (node) => node.dataset.action ?? "",
  );
const focused = (): string | null =>
  document.activeElement?.getAttribute("data-action") ?? null;
const selectedTech = (): string | null =>
  document
    .querySelector('.v7-tech-card[data-selected="true"]')
    ?.getAttribute("data-action") ?? null;
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
};
const COORDINATES = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

describe("Ruleset 7 research prompts in the interface", () => {
  it("offers Gathering on a Fruit, opens Tech on it, and the Harvest is there on return", async () => {
    const { app, host, controller } = open(match());
    host.callbacks?.onSelection({ kind: "TILE", at: FRUIT });
    expect(required(".v7-selection-dock h2").textContent).toBe("Fruit");
    expect(prompts()).toEqual(["research-prompt-gathering"]);
    expect(
      document.querySelector('[data-action="command-harvest_fruit"]'),
    ).toBeNull();
    const prompt = required<HTMLButtonElement>(
      '[data-action="research-prompt-gathering"]',
    );
    // The technology's icon and name, and nothing else.
    expect(prompt.textContent).toBe("Research Gathering");
    expect(prompt.querySelector("img")).not.toBeNull();
    expect(prompt.getAttribute("aria-label")).toBe(
      "Research Gathering to unlock Harvest",
    );
    const dock = required(".v7-selection-dock");
    expect(dock.textContent).not.toMatch(COORDINATES);
    for (const node of dock.querySelectorAll("[aria-label], [title]"))
      expect(
        `${node.getAttribute("aria-label") ?? ""} ${node.getAttribute("title") ?? ""}`,
      ).not.toMatch(COORDINATES);

    prompt.click();
    await settle();
    expect(required('[data-v7-region="overlay-tech"]')).not.toBeNull();
    expect(selectedTech()).toBe("tech-gathering");
    expect(required(".v7-tech-detail").getAttribute("aria-label")).toBe(
      "Gathering details",
    );
    // The Research control is ready: it has the focus.
    expect(focused()).toBe("research-gathering");
    expect(
      required('[data-action="tech-gathering"]').getAttribute("data-goal"),
    ).toBe("true");
    // A render nobody asked a focus of (interface art settling) rebuilds
    // the screen; the Research control keeps the focus.
    controller.republish();
    await settle();
    expect(selectedTech()).toBe("tech-gathering");
    expect(focused()).toBe("research-gathering");

    required<HTMLButtonElement>('[data-action="research-gathering"]').click();
    await settle();
    expect(controller.snapshot().view?.viewer.researchedTechs).toEqual([
      "GATHERING",
    ]);
    expect(document.querySelector("[data-goal]")).toBeNull();

    // Escape closes the screen; the same tile is selected and its action
    // is on offer, with the focus.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(
      document.querySelector('[data-v7-region="overlay-tech"]'),
    ).toBeNull();
    expect(required(".v7-selection-dock h2").textContent).toBe("Fruit");
    expect(prompts()).toEqual([]);
    expect(required('[data-action="command-harvest_fruit"]')).not.toBeNull();
    expect(focused()).toBe("command-harvest_fruit");
    app.destroy();
  });

  it("selects the missing prerequisite first, then the technology itself", async () => {
    const { app, host, controller } = open(match());
    host.callbacks?.onSelection({ kind: "TILE", at: FOREST });
    expect(prompts()).toEqual(["research-prompt-forestry"]);
    const prompt = required<HTMLButtonElement>(
      '[data-action="research-prompt-forestry"]',
    );
    expect(prompt.textContent).toBe("Research Forestry");
    expect(prompt.dataset.selectTech).toBe("HUNTING");
    prompt.click();
    await settle();
    // Hunting is selected and ready; Forestry is marked as the goal.
    expect(selectedTech()).toBe("tech-hunting");
    expect(focused()).toBe("research-hunting");
    expect(
      required('[data-action="tech-forestry"]').getAttribute("data-goal"),
    ).toBe("true");
    expect(
      document.querySelector('[data-action="research-forestry"]'),
    ).toBeNull();

    required<HTMLButtonElement>('[data-action="research-hunting"]').click();
    await settle();
    // The next step is selected without another click.
    expect(selectedTech()).toBe("tech-forestry");
    expect(focused()).toBe("research-forestry");
    required<HTMLButtonElement>('[data-action="research-forestry"]').click();
    await settle();
    expect(controller.snapshot().view?.viewer.researchedTechs).toEqual([
      "HUNTING",
      "FORESTRY",
    ]);
    required<HTMLButtonElement>('[data-action="close-overlay"]').click();
    await settle();
    expect(required(".v7-selection-dock h2").textContent).toBe("Forest");
    expect(prompts()).toEqual([]);
    expect(
      required('[data-action="command-build_lumber_camp"]'),
    ).not.toBeNull();
    app.destroy();
  });

  it("returns to the prompt when the screen is closed without researching", async () => {
    const { app, host } = open(match());
    host.callbacks?.onSelection({ kind: "TILE", at: GAME });
    expect(prompts()).toEqual(["research-prompt-hunting"]);
    required<HTMLButtonElement>(
      '[data-action="research-prompt-hunting"]',
    ).click();
    await settle();
    expect(selectedTech()).toBe("tech-hunting");
    required<HTMLButtonElement>('[data-action="close-overlay"]').click();
    await settle();
    expect(required(".v7-selection-dock h2").textContent).toBe("Game");
    expect(focused()).toBe("research-prompt-hunting");
    // Opening Tech from the HUD afterwards selects and marks nothing.
    required<HTMLButtonElement>('[data-action="tech"]').click();
    await settle();
    expect(selectedTech()).toBeNull();
    expect(document.querySelector("[data-goal]")).toBeNull();
    app.destroy();
  });

  it("shows the screen's own reason when the technology is not affordable", async () => {
    // One technology is known, so Gathering is no longer free.
    const { app, host } = open(match({ researched: ["HUNTING"], coins: 0 }));
    host.callbacks?.onSelection({ kind: "TILE", at: FRUIT });
    expect(prompts()).toEqual(["research-prompt-gathering"]);
    required<HTMLButtonElement>(
      '[data-action="research-prompt-gathering"]',
    ).click();
    await settle();
    expect(selectedTech()).toBe("tech-gathering");
    expect(required(".v7-tech-detail .v7-tech-status").textContent).toMatch(
      /^Need \d+ Coins$/,
    );
    expect(
      document.querySelector('[data-action="research-gathering"]'),
    ).toBeNull();
    expect(focused()).toBe("tech-gathering");
    app.destroy();
  });

  it("has no prompt for a known technology, plain land or an enemy's tile", () => {
    const { app, host } = open(match({ researched: ["GATHERING"] }));
    host.callbacks?.onSelection({ kind: "TILE", at: FRUIT });
    expect(prompts()).toEqual([]);
    expect(required('[data-action="command-harvest_fruit"]')).not.toBeNull();
    host.callbacks?.onSelection({ kind: "TILE", at: GRASS });
    expect(prompts()).toEqual([]);
    host.callbacks?.onSelection({ kind: "TILE", at: ENEMY_FRUIT });
    expect(required(".v7-selection-dock h2").textContent).toBe("Fruit");
    expect(prompts()).toEqual([]);
    app.destroy();
  });

  it("names another faction's building in its prompt", () => {
    // An Undead Farm is a Graveyard; Fertile Ground shows with Gathering.
    const { app, host } = open(
      match({ viewer: "UNDEAD", researched: ["GATHERING"] }),
    );
    host.callbacks?.onSelection({ kind: "TILE", at: FERTILE });
    expect(prompts()).toEqual(["research-prompt-farming"]);
    const prompt = required<HTMLButtonElement>(
      '[data-action="research-prompt-farming"]',
    );
    expect(prompt.textContent).toBe("Research Farming");
    expect(prompt.dataset.selectTech).toBe("FARMING");
    expect(prompt.getAttribute("aria-label")).toBe(
      "Research Farming to unlock Graveyard",
    );
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    // A renamed technology reads as its faction has it on the screen the
    // prompt opens; a Dinosaur's Fruit still asks for Gathering.
    const dinosaur = open(match({ viewer: "DINOSAUR" }));
    dinosaur.host.callbacks?.onSelection({ kind: "TILE", at: FRUIT });
    expect(prompts()).toEqual(["research-prompt-gathering"]);
    dinosaur.app.destroy();
  });
});

class LiveController implements Ruleset7ControllerPortV7 {
  #state: GameStateV7;
  #snapshot: Ruleset7BrowserSnapshot;
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  constructor(state: GameStateV7) {
    this.#state = state;
    this.#snapshot = this.#project();
  }
  #project(): Ruleset7BrowserSnapshot {
    const view = viewForV7(this.#state, this.#state.humanPlayerId);
    return {
      phase: "ACTIVE",
      view,
      offeredCommands: queryPlayerCommandsV7(view),
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
  /** Publishes the unchanged snapshot again, which renders the view. */
  republish(): void {
    for (const subscriber of this.#subscribers) subscriber(this.#snapshot);
  }
  subscribeAcceptedBoundary(): () => void {
    return () => undefined;
  }
  readonly dispatch = async (
    command: CommandV7,
  ): Promise<Ruleset7DispatchResult> => {
    const before = this.#state;
    const applied = applyCommandV7(before, before.humanPlayerId, command);
    if (!applied.accepted)
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: applied.error,
      };
    const beforeView =
      this.#snapshot.view ?? viewForV7(before, before.humanPlayerId);
    this.#state = applied.state;
    this.#snapshot = this.#project();
    for (const subscriber of this.#subscribers) subscriber(this.#snapshot);
    return {
      accepted: true,
      beforeView,
      afterView: this.#snapshot.view ?? beforeView,
      playerEvents: projectEventsV7(
        before,
        applied.state,
        before.humanPlayerId,
        applied.events,
      ),
    };
  };
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "Fixture",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
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

class RecordingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}
