// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapRuleset7App,
  Ruleset7BrowserController,
  type Ruleset7BrowserSnapshot,
  type Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  browserRandomSeedV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
// pulp_wars-w5j.1: the browser launches only distinct factions.
import { browserSetupV7 } from "../fixtures/v7-builders";

/**
 * Playtest round 3 UI fixes (pulp_wars-6gd.4): non-selectable chrome, the
 * "New map" / "Use seed" setup choice, and the popup scrim.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 non-selectable interface", () => {
  const css = readFileSync("src/styles/v7.css", "utf8");

  it("makes the root shell unselectable and lets text inputs opt back in", () => {
    const shell = /\.v7-app-shell \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(shell).toMatch(/(?<!-)user-select: none;/);
    expect(shell).toMatch(/-webkit-user-select: none;/);
    const optIn =
      /\.v7-app-shell input,[^{]*\{[^}]*\}/.exec(css)?.[0] ?? "missing";
    expect(optIn).toContain(".v7-app-shell textarea");
    // Deliberately copyable text: the map seed and the recovery diagnostic.
    expect(optIn).toContain(".v7-app-shell .v7-copyable");
    expect(optIn).toContain(".v7-app-shell .v7-recovery-details");
    expect(optIn).toMatch(/(?<!-)user-select: text;/);
    expect(optIn).toMatch(/-webkit-user-select: text;/);
    // Images and links never start a drag.
    expect(css).toMatch(
      /\.v7-app-shell img,[^{]*\{\s*-webkit-user-drag: none;\s*\}/,
    );
    // No later rule turns selection back on for chrome.
    const selectable = [...css.matchAll(/([^{}]*)\{[^}]*user-select: text/g)];
    expect(selectable).toHaveLength(1);
  });

  it("cancels drags that start on chrome but not on a text field", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const shell = document.querySelector<HTMLElement>(".v7-app-shell");
    if (shell === null) throw new Error("shell missing");
    const heading = document.querySelector("h1");
    const chromeDrag = new Event("dragstart", {
      bubbles: true,
      cancelable: true,
    });
    heading?.dispatchEvent(chromeDrag);
    expect(chromeDrag.defaultPrevented).toBe(true);
    const fieldDrag = new Event("dragstart", {
      bubbles: true,
      cancelable: true,
    });
    requiredInput("v7-seed").dispatchEvent(fieldDrag);
    expect(fieldDrag.defaultPrevented).toBe(false);
    app.destroy();
    const afterDestroy = new Event("dragstart", {
      bubbles: true,
      cancelable: true,
    });
    requiredRoot().dispatchEvent(afterDestroy);
    expect(afterDestroy.defaultPrevented).toBe(false);
  });
});

describe("Ruleset 7 setup seed choice", () => {
  it("defaults to New map and draws a fresh injected seed for each launch", async () => {
    const seeds = [123_456, 4_000_000_000];
    const randomSeed = vi.fn(() => seeds.shift() ?? 0);
    const app = bootstrapRuleset7App(document, { storage: null, randomSeed });
    const group = document.querySelector<HTMLElement>(".v7-seed-choice");
    expect(group?.getAttribute("role")).toBe("group");
    expect(group?.getAttribute("aria-label")).toBe("Map seed");
    expect(group?.dataset.seedMode).toBe("new");
    expect(
      requiredButton('[data-action="seed-mode-new"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(
      requiredButton('[data-action="seed-mode-seed"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("false");
    expect(requiredButton('[data-action="seed-mode-new"]').textContent).toBe(
      "New map",
    );
    expect(requiredButton('[data-action="seed-mode-seed"]').textContent).toBe(
      "Use seed",
    );
    // The seed field is hidden until "Use seed" is chosen.
    expect(requiredInput("v7-seed").closest("label")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>(".v7-seed-hint")?.hidden).toBe(
      false,
    );
    // Nothing is drawn before launch.
    expect(randomSeed).not.toHaveBeenCalled();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(randomSeed).toHaveBeenCalledTimes(1);
    expect(app.controller.snapshot().view?.setup.seed).toBe(123_456);

    // The match's seed is shown in Settings so the map can be replayed.
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="settings"]').click();
    const shown = document.querySelector<HTMLElement>("[data-v7-map-seed]");
    expect(shown?.textContent).toBe("Map seed: 123456");
    expect(shown?.dataset.v7MapSeed).toBe("123456");
    expect(shown?.querySelector(".v7-copyable")?.textContent).toBe("123456");

    // Restart keeps the match's own seed and draws nothing new.
    requiredButton('[data-action="restart"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    expect(randomSeed).toHaveBeenCalledTimes(1);
    expect(app.controller.snapshot().view?.setup.seed).toBe(123_456);
    app.destroy();

    // A second launch draws the next seed: every new game is a new map.
    document.body.innerHTML = '<div id="app"></div>';
    const next = bootstrapRuleset7App(document, { storage: null, randomSeed });
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => next.controller.snapshot().phase === "ACTIVE");
    expect(randomSeed).toHaveBeenCalledTimes(2);
    expect(next.controller.snapshot().view?.setup.seed).toBe(4_000_000_000);
    next.destroy();
  });

  it("reveals the validated seed field for Use seed and ignores the random source", async () => {
    const randomSeed = vi.fn(() => 99);
    const app = bootstrapRuleset7App(document, { storage: null, randomSeed });
    const launch = requiredButton('[data-action="launch"]');
    requiredButton('[data-action="seed-mode-seed"]').click();
    // Toggling updates the form in place: no control is replaced.
    expect(requiredButton('[data-action="launch"]')).toBe(launch);
    const field = requiredInput("v7-seed");
    expect(field.closest("label")?.hidden).toBe(false);
    expect(document.activeElement).toBe(field);
    expect(document.querySelector<HTMLElement>(".v7-seed-hint")?.hidden).toBe(
      true,
    );
    expect(
      document.querySelector<HTMLElement>(".v7-seed-choice")?.dataset.seedMode,
    ).toBe("seed");
    expect(
      requiredButton('[data-action="seed-mode-seed"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");

    // The existing validation still guards the field.
    field.value = "not a seed";
    launch.click();
    await Promise.resolve();
    expect(document.querySelector("#v7-alert")?.textContent).toBe(
      "Seed must be a whole number (0–4294967295).",
    );
    expect(app.controller.snapshot().phase).toBe("EMPTY");
    // The failed launch keeps "Use seed" selected and the typed text.
    expect(requiredInput("v7-seed").closest("label")?.hidden).toBe(false);
    expect(requiredInput("v7-seed").value).toBe("not a seed");

    // Switching to New map and back keeps the typed seed.
    requiredInput("v7-seed").value = "7";
    requiredButton('[data-action="seed-mode-new"]').click();
    expect(requiredInput("v7-seed").closest("label")?.hidden).toBe(true);
    requiredButton('[data-action="seed-mode-seed"]').click();
    expect(requiredInput("v7-seed").value).toBe("7");
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(app.controller.snapshot().view?.setup.seed).toBe(7);
    expect(randomSeed).not.toHaveBeenCalled();
    app.destroy();
  });

  it("offers New map by default when replacing a stored match", async () => {
    const randomSeed = vi.fn(() => 31_337);
    const app = bootstrapRuleset7App(document, { randomSeed });
    requiredButton('[data-action="seed-mode-seed"]').click();
    requiredInput("v7-seed").value = "5";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(app.controller.snapshot().view?.setup.seed).toBe(5);
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="main-menu"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    requiredButton('[data-action="new-game"]').click();
    // The replacement form remembers this session's choice.
    expect(
      document.querySelector<HTMLElement>(".v7-seed-choice")?.dataset.seedMode,
    ).toBe("seed");
    requiredButton('[data-action="seed-mode-new"]').click();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        app.controller.snapshot().view?.setup.seed === 31_337,
    );
    expect(randomSeed).toHaveBeenCalledTimes(1);
    app.destroy();
  });

  it("draws unsigned 32-bit browser seeds", () => {
    const values = [0xffff_ffff, 0, 17];
    const fake = {
      defaultView: {
        crypto: {
          getRandomValues: (array: Uint32Array) => {
            array[0] = values.shift() ?? 0;
            return array;
          },
        },
      },
    } as unknown as Document;
    expect(browserRandomSeedV7(fake)).toBe(0xffff_ffff);
    expect(browserRandomSeedV7(fake)).toBe(0);
    expect(browserRandomSeedV7(fake)).toBe(17);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.999_999_999_9);
    const seed = browserRandomSeedV7({ defaultView: null } as Document);
    random.mockRestore();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffff_ffff);
  });
});

describe("Ruleset 7 popup scrim", () => {
  const css = readFileSync("src/styles/v7.css", "utf8");

  it("dims behind the tech tree and Help, and a scrim click dismisses them with focus restored", async () => {
    const { app, host, source } = await mountMatch();
    expect(scrim()).toBeNull();
    const tech = requiredButton('[data-action="tech"]');
    tech.focus();
    tech.click();
    await Promise.resolve();
    const overlay = document.querySelector<HTMLElement>(
      '[data-v7-region="overlay-tech"]',
    );
    expect(overlay?.getAttribute("aria-modal")).toBe("true");
    const layer = scrim();
    if (layer === null) throw new Error("scrim missing");
    expect(layer.dataset.dismissable).toBe("true");
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    // The scrim takes clicks (it is never inert) while the board, HUD and
    // every other sibling are inert behind it.
    expect(layer.inert).not.toBe(true);
    expect(document.querySelector<HTMLElement>(".v7-board-host")?.inert).toBe(
      true,
    );
    expect(
      document.querySelector<HTMLElement>('[data-v7-region="hud"]')?.inert,
    ).toBe(true);
    // One consistent, prominent close button leads the popup.
    const close = overlay?.querySelector(":scope > .close-button");
    expect(close?.getAttribute("data-action")).toBe("close-overlay");
    expect(overlay?.firstElementChild).toBe(close);
    expect(document.activeElement).toBe(close);

    const selections = host.selections;
    layer.click();
    await Promise.resolve();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
    expect(scrim()).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe("tech");
    expect(document.querySelector<HTMLElement>(".v7-board-host")?.inert).toBe(
      false,
    );
    // The click did not reach the board.
    expect(host.selections).toBe(selections);

    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="help"]').click();
    await Promise.resolve();
    expect(
      document.querySelector('[data-v7-region="overlay-help"]'),
    ).not.toBeNull();
    expect(scrim()?.dataset.dismissable).toBe("true");
    scrim()?.click();
    await Promise.resolve();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "compact-menu",
    );

    // Escape still closes a popup and removes its scrim.
    requiredButton('[data-action="tech"]').click();
    await Promise.resolve();
    expect(scrim()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();
    expect(scrim()).toBeNull();
    app.destroy();
    source.destroy();
  });

  it("dismisses unit info and recruit help from the scrim and returns focus to their buttons", async () => {
    const { app, host, source, view } = await mountMatch((snapshot, city) => ({
      ...snapshot,
      offeredCommands: [{ kind: "TRAIN", cityId: city.id, role: "FIGHTER" }],
    }));
    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (unit === undefined || city === undefined)
      throw new Error("fixture pieces missing");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    requiredButton('[data-action="unit-help"]').click();
    await Promise.resolve();
    const info = document.querySelector<HTMLElement>(
      '[data-v7-region="unit-help"]',
    );
    expect(info?.getAttribute("aria-modal")).toBe("true");
    expect(info?.firstElementChild?.getAttribute("data-action")).toBe(
      "close-unit-help",
    );
    expect(scrim()?.dataset.dismissable).toBe("true");
    // The dock stays on screen, inert, under the scrim.
    expect(
      document.querySelector<HTMLElement>('[data-v7-region="dock"]')?.inert,
    ).toBe(true);
    scrim()?.click();
    await Promise.resolve();
    expect(document.querySelector('[data-v7-region="unit-help"]')).toBeNull();
    expect(scrim()).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "unit-help",
    );

    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    requiredButton('[data-action="train-help-fighter"]').click();
    await Promise.resolve();
    const recruit = document.querySelector<HTMLElement>(
      '[data-v7-region="recruit-help"]',
    );
    expect(recruit?.getAttribute("aria-modal")).toBe("true");
    expect(recruit?.firstElementChild?.getAttribute("data-action")).toBe(
      "close-recruit-help",
    );
    expect(scrim()?.dataset.dismissable).toBe("true");
    scrim()?.click();
    await Promise.resolve();
    expect(
      document.querySelector('[data-v7-region="recruit-help"]'),
    ).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "train-help-fighter",
    );
    app.destroy();
    source.destroy();
  });

  it("dims behind the mandatory reward but never dismisses it without a choice", async () => {
    const dispatch = vi.fn(async (): Promise<Ruleset7DispatchResult> => ({
      accepted: false,
      reason: "NOT_OFFERED",
    }));
    const { app, source } = await mountMatch(
      (snapshot, city) => ({
        ...snapshot,
        view:
          snapshot.view === null
            ? null
            : {
                ...snapshot.view,
                pendingChoices: [
                  {
                    kind: "CITY_REWARD",
                    cityId: city.id,
                    reachedLevel: 2,
                    candidates: ["TREASURY", "MILITIA"],
                  },
                ],
              },
        offeredCommands: (["TREASURY", "MILITIA"] as const).map((reward) => ({
          kind: "CHOOSE_CITY_REWARD" as const,
          cityId: city.id,
          reachedLevel: 2,
          reward,
        })),
      }),
      dispatch,
    );
    const reward = document.querySelector<HTMLElement>(
      '[data-v7-region="mandatory-reward"]',
    );
    expect(reward?.getAttribute("role")).toBe("alertdialog");
    expect(reward?.getAttribute("aria-modal")).toBe("true");
    expect(reward?.querySelector(".close-button")).toBeNull();
    expect(reward?.querySelector("[data-v7-mandatory-hint]")?.textContent).toBe(
      "Choose a reward to continue.",
    );
    const layer = scrim();
    expect(layer?.dataset.dismissable).toBe("false");
    layer?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();
    expect(
      document.querySelector('[data-v7-region="mandatory-reward"]'),
    ).not.toBeNull();
    expect(scrim()).not.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    // Choosing is the only way on.
    requiredButton('[data-action="reward-treasury"]').click();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledTimes(1);
    app.destroy();
    source.destroy();
  });

  it("styles the scrim under every popup and a prominent sticky close button", () => {
    const rule = /\.v7-scrim \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(rule).toContain("position: absolute;");
    expect(rule).toContain("inset: 0;");
    expect(rule).toMatch(/background: rgb\(\d+ \d+ \d+ \/ \d+%\);/);
    const scrimZ = Number(/z-index: (\d+);/.exec(rule)?.[1]);
    const dialogs =
      /\.v7-overlay,\s*\.v7-recruit-help,[^{]*\{[^}]*\}/.exec(css)?.[0] ?? "";
    const dialogZ = Number(/z-index: (\d+);/.exec(dialogs)?.[1]);
    // Above the HUD (10), docks and toasts, directly below the popups.
    expect(scrimZ).toBeGreaterThan(25);
    expect(dialogZ).toBeGreaterThan(scrimZ);
    const close =
      /\.v7-overlay > \.close-button,\s*\.v7-recruit-help > \.close-button,\s*\.v7-unit-help-dialog > \.close-button \{[^}]*\}/.exec(
        css,
      )?.[0] ?? "";
    expect(close).toContain("position: sticky;");
    expect(close).toContain("top: 0;");
    expect(close).toContain("justify-self: end;");
    expect(close).toContain("width: 2.75rem;");
    expect(close).toContain("background: var(--paper);");
    expect(close).toContain("color: var(--ink);");
  });
});

function scrim(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-v7-region="scrim"]');
}

async function mountMatch(
  adjust: (
    snapshot: Ruleset7BrowserSnapshot,
    city: NonNullable<Ruleset7BrowserSnapshot["view"]>["cities"][number],
  ) => Ruleset7BrowserSnapshot = (snapshot) => snapshot,
  dispatch?: Ruleset7ControllerPortV7["dispatch"],
) {
  const source = new Ruleset7BrowserController();
  const launched = await source.launch(browserSetupV7(1539));
  if (!launched.ok) throw new Error(launched.diagnostic);
  const initial = source.snapshot();
  const view = initial.view;
  if (view === null) throw new Error("public view missing");
  const city = view.cities.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  if (city === undefined) throw new Error("owned city missing");
  const snapshot = adjust(initial, city);
  const host = new CapturingBoardHost();
  const port: Ruleset7ControllerPortV7 = {
    snapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
    subscribeAcceptedBoundary: () => () => {},
    launch: source.launch.bind(source),
    resume: source.resume.bind(source),
    returnToMenu: source.returnToMenu.bind(source),
    dispatch: dispatch ?? source.dispatch.bind(source),
    progressAiTurns: source.progressAiTurns.bind(source),
    restart: source.restart.bind(source),
    deleteStoredSave: source.deleteStoredSave.bind(source),
    setFastForward: source.setFastForward.bind(source),
    exportSafeLog: source.exportSafeLog.bind(source),
    exportDebugBundle: source.exportDebugBundle.bind(source),
  };
  const app = new Ruleset7DomAppView(document, requiredRoot(), port, {
    boardHost: host,
    settingsStorage: null,
  });
  return { app, host, source, view };
}

class CapturingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  model: BoardHostModelV7 | null = null;
  /** Count of board activations (none may come from a scrim click). */
  selections = 0;

  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    canvas.addEventListener("click", () => {
      this.selections += 1;
    });
    container.addEventListener("click", () => {
      this.selections += 1;
    });
    container.replaceChildren(canvas);
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  resetInspectionCycle(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {
    this.callbacks = null;
    this.model = null;
  }
}

function requiredRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  return root;
}

function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function requiredInput(id: string): HTMLInputElement {
  const node = document.querySelector<HTMLInputElement>(`#${id}`);
  if (node === null) throw new Error(`Missing #${id}`);
  return node;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
