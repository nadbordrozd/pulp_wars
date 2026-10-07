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
  BLOCKED_ACTIONS_UI_V7,
  blockedActionsMatchV7,
} from "../fixtures/v7-blocked-actions";

/**
 * Blocked actions in the interface (bead pulp_wars-2yc.36,
 * docs/ui/SCREEN_FLOW.md "Blocked actions"): an action the player could
 * take but for Coins, and a unit a full city could train, keep their
 * control in the dock; it cannot be pressed and says why.
 */
const AT = BLOCKED_ACTIONS_UI_V7;
const match = blockedActionsMatchV7;
const COORDINATES = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

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

const capitalId = (state: GameStateV7): number => {
  const city = viewForV7(state, state.humanPlayerId).cities.find(
    (candidate) => candidate.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("No capital");
  return city.id;
};
const unitIdAt = (state: GameStateV7, at: { x: number; y: number }): number => {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("No unit");
  return unit.id;
};
const cards = (): { role: string; blocked: string | null }[] =>
  [...document.querySelectorAll<HTMLElement>(".v7-train-card")].map((card) => {
    const action = card.querySelector<HTMLElement>(".v7-train-action");
    return {
      role: action?.querySelector(".v7-action-label")?.textContent ?? "",
      blocked: action?.dataset.disabledReason ?? null,
    };
  });
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("Ruleset 7 blocked actions in the interface", () => {
  it("keeps the Harvest of a Fruit the player cannot pay for, with its price and the shortfall", async () => {
    const { app, host, controller } = open(
      match({ researched: ["GATHERING"], coins: 1 }),
    );
    host.callbacks?.onSelection({ kind: "TILE", at: AT.fruit });
    expect(required(".v7-selection-dock h2").textContent).toBe("Fruit");
    const harvest = required<HTMLButtonElement>(
      '[data-action="command-harvest_fruit"]',
    );
    // The same icon and name as the open button; the price in the loss
    // colour; nothing else is written on it.
    expect(harvest.querySelector(".v7-action-label")?.textContent).toBe(
      "Harvest",
    );
    expect(harvest.querySelector("img")).not.toBeNull();
    const price = required<HTMLElement>(
      '[data-action="command-harvest_fruit"] .v7-economy-chip.is-cost',
    );
    expect(price.textContent).toBe("2");
    expect(price.classList.contains("is-short")).toBe(true);
    expect(harvest.querySelector(".v7-blocked-reason")).toBeNull();
    // Focusable, announced as unavailable with its reason, never disabled.
    expect(harvest.classList.contains("is-blocked")).toBe(true);
    expect(harvest.getAttribute("aria-disabled")).toBe("true");
    expect(harvest.disabled).toBe(false);
    expect(harvest.dataset.disabledReason).toBe("coins");
    expect(harvest.dataset.shortfall).toBe("1");
    expect(harvest.title).toBe("Need 1 more Coin");
    expect(harvest.getAttribute("aria-label")).toMatch(
      /^Harvest · .*\. Unavailable: Need 1 more Coin$/,
    );
    const dock = required(".v7-selection-dock");
    expect(dock.dataset.hasActions).toBe("true");
    expect(dock.textContent).not.toMatch(COORDINATES);
    for (const node of dock.querySelectorAll("[aria-label], [title]"))
      expect(
        `${node.getAttribute("aria-label") ?? ""} ${node.getAttribute("title") ?? ""}`,
      ).not.toMatch(COORDINATES);

    // Pressing it sends no command: it says what is missing.
    harvest.click();
    await settle();
    expect(controller.dispatched).toEqual([]);
    expect(required(".v7-toast").textContent).toBe("Need 1 more Coin.");
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "command-harvest_fruit",
    );
    app.destroy();
  });

  it("opens the same button once the player can pay", async () => {
    const { app, host, controller } = open(
      match({ researched: ["GATHERING"], coins: 2 }),
    );
    host.callbacks?.onSelection({ kind: "TILE", at: AT.fruit });
    const harvest = required<HTMLButtonElement>(
      '[data-action="command-harvest_fruit"]',
    );
    expect(harvest.getAttribute("aria-disabled")).toBeNull();
    expect(harvest.classList.contains("is-blocked")).toBe(false);
    expect(harvest.querySelector(".is-short")).toBeNull();
    harvest.click();
    await settle();
    expect(controller.dispatched.map((command) => command.kind)).toEqual([
      "HARVEST_FRUIT",
    ]);
    app.destroy();
  });

  it("blocks every paid action of a tile and leaves the free one open", () => {
    const { app, host } = open(match({ coins: 1 }));
    host.callbacks?.onSelection({ kind: "TILE", at: AT.forest });
    const state = (action: string): string | null =>
      required<HTMLElement>(`[data-action="${action}"]`).dataset
        .disabledReason ?? null;
    expect(state("command-build_lumber_camp")).toBe("coins");
    expect(state("command-cultivate_forest")).toBe("coins");
    expect(state("command-clear_forest")).toBeNull();
    expect(
      required<HTMLElement>('[data-action="command-build_lumber_camp"]').dataset
        .shortfall,
    ).toBe("2");
    host.callbacks?.onSelection({ kind: "TILE", at: AT.fertile });
    expect(state("command-build_farm")).toBe("coins");
    expect(
      required<HTMLElement>('[data-action="command-build_farm"]').title,
    ).toBe("Need 4 more Coins");
    app.destroy();
  });

  it("shows every unit the city could train, the unaffordable ones blocked", async () => {
    const state = match({ coins: 3 });
    const { app, host, controller } = open(state);
    host.callbacks?.onSelection({ kind: "CITY", cityId: capitalId(state) });
    expect(cards()).toEqual([
      { role: "Fighter", blocked: null },
      { role: "Raider", blocked: "coins" },
      { role: "Marksman", blocked: "coins" },
      { role: "Guard", blocked: null },
      { role: "Captain", blocked: "coins" },
      { role: "Catapult", blocked: "coins" },
      { role: "Knight", blocked: "coins" },
      { role: "Champion", blocked: "coins" },
    ]);
    const blocked = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '.v7-train-action[aria-disabled="true"]',
      ),
    ];
    expect(blocked).toHaveLength(6);
    for (const action of blocked) {
      expect(action.disabled).toBe(false);
      expect(action.title).toMatch(/^Need \d+ more Coins?$/);
      expect(action.getAttribute("aria-label")).toMatch(
        /^Train .+ for \d+ Coins\. Unavailable: Need \d+ more Coins?$/,
      );
      expect(action.querySelector(".v7-economy-chip.is-short")).not.toBeNull();
    }
    // Pressing a blocked card trains nothing, and that card (not the open
    // one before it) keeps the focus.
    blocked[1]?.click();
    await settle();
    expect(controller.dispatched).toEqual([]);
    expect(required(".v7-toast").textContent).toBe("Need 1 more Coin.");
    const actions = [
      ...document.querySelectorAll<HTMLElement>(".v7-train-action"),
    ];
    expect(actions.indexOf(document.activeElement as HTMLElement)).toBe(2);
    expect(
      document.activeElement?.querySelector(".v7-action-label")?.textContent,
    ).toBe("Marksman");
    // The "?" of a blocked card still opens the unit's page.
    expect(
      [...document.querySelectorAll<HTMLButtonElement>(".v7-train-help")].every(
        (help) => !help.disabled,
      ),
    ).toBe(true);
    app.destroy();
  });

  it("adds no card for a unit whose technology is missing", () => {
    const state = match({ researched: [], coins: 0 });
    const { app, host } = open(state);
    host.callbacks?.onSelection({ kind: "CITY", cityId: capitalId(state) });
    expect(cards()).toEqual([{ role: "Fighter", blocked: "coins" }]);
    app.destroy();
  });

  it("says a full city is full on each card, in two words", () => {
    const state = match({ garrison: 3 });
    const { app, host } = open(state);
    host.callbacks?.onSelection({ kind: "CITY", cityId: capitalId(state) });
    const shown = cards();
    expect(shown).toHaveLength(8);
    expect(shown.every((card) => card.blocked === "slots")).toBe(true);
    const first = required<HTMLButtonElement>(".v7-train-action");
    expect(first.getAttribute("aria-disabled")).toBe("true");
    expect(first.querySelector(".v7-blocked-reason")?.textContent).toBe(
      "City full",
    );
    expect(first.title).toBe("City full");
    expect(first.getAttribute("aria-label")).toMatch(
      /^Train Fighter for \d+ Coins\. Unavailable: City full$/,
    );
    // The price is not what is missing: it is not marked.
    expect(first.querySelector(".is-short")).toBeNull();
    app.destroy();
  });

  it("marks a unit with nothing left to do, and blocks a Fortify it cannot pay for", () => {
    const state = match({ garrison: 3, exhausted: true, coins: 1 });
    const { app, host } = open(state);
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitIdAt(state, AT.unit) as never,
    });
    const done = required<HTMLElement>('[data-unit-status="done"]');
    expect(done.textContent).toBe("Done this turn");
    expect(done.getAttribute("aria-label")).toBe(
      "Done this turn. This unit has acted. It is ready again next turn",
    );
    expect(required(".v7-selection-dock").dataset.handled).toBe("true");
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitIdAt(state, AT.second) as never,
    });
    expect(document.querySelector('[data-unit-status="done"]')).toBeNull();
    const fortify = required<HTMLButtonElement>(
      '[data-action="command-build_field_defense"]',
    );
    expect(fortify.getAttribute("aria-disabled")).toBe("true");
    expect(fortify.dataset.shortfall).toBe("2");
    expect(fortify.getAttribute("aria-label")).toMatch(
      /^Build Field Defense for 3 Coins .*\. Unavailable: Need 2 more Coins$/,
    );
    app.destroy();
  });

  it("says a resource on land that is not the player's is outside the borders", () => {
    const { app, host } = open(match({ coins: 0 }));
    for (const at of [AT.neutralFruit, AT.enemyFruit]) {
      host.callbacks?.onSelection({ kind: "TILE", at });
      expect(required(".v7-selection-dock h2").textContent).toBe("Fruit");
      expect(
        required('[data-disabled-reason="outside-borders"]').textContent,
      ).toBe("Outside your borders");
      expect(
        document.querySelector('[data-action="command-harvest_fruit"]'),
      ).toBeNull();
    }
    host.callbacks?.onSelection({ kind: "TILE", at: AT.fruit });
    expect(
      document.querySelector('[data-disabled-reason="outside-borders"]'),
    ).toBeNull();
    app.destroy();
  });

  it("marks the price of an Egg the player cannot pay for", () => {
    const state = match({ viewer: "DINOSAUR", coins: 3 });
    const { app, host } = open(state);
    host.callbacks?.onSelection({ kind: "CITY", cityId: capitalId(state) });
    const eggs = [
      ...document.querySelectorAll<HTMLElement>(
        '.v7-lay-egg-action[data-disabled-reason="insufficient_coins"]',
      ),
    ];
    expect(eggs.length).toBeGreaterThan(0);
    for (const egg of eggs) {
      expect(egg.querySelector(".v7-economy-chip.is-short")).not.toBeNull();
      expect(Number(egg.dataset.shortfall)).toBeGreaterThan(0);
    }
    // The trained Dinosaur units follow the same rule as everyone's.
    expect(cards().filter((card) => card.blocked === "coins")).toEqual([
      { role: expect.any(String) as string, blocked: "coins" },
    ]);
    app.destroy();
  });
});

class LiveController implements Ruleset7ControllerPortV7 {
  #state: GameStateV7;
  #snapshot: Ruleset7BrowserSnapshot;
  readonly dispatched: CommandV7[] = [];
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
  subscribeAcceptedBoundary(): () => void {
    return () => undefined;
  }
  readonly dispatch = async (
    command: CommandV7,
  ): Promise<Ruleset7DispatchResult> => {
    this.dispatched.push(command);
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
