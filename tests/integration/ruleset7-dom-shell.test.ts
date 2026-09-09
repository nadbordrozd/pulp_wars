// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapRuleset7App,
  Ruleset7BrowserController,
  type Ruleset7BrowserSnapshot,
  type Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  PlayerViewV7,
  PublicPopulationContributionV7,
} from "../../src/engine/index";
import { effectiveRoleRuleV7, UNIT_ROLE_IDS_V7 } from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { createTacticalSymbolV7 } from "../../src/render/dom/tactical-symbol-v7";
import { setupV7 } from "../fixtures/v7-builders";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 DOM shell", () => {
  it("launches the complete board-first shell with semantic public overlays", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    expect(document.body.textContent).toContain("Original-only local conquest");
    requiredInput("v7-seed").value = "2";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    expect(document.querySelector(".board-canvas-v7")).not.toBeNull();
    expect(document.body.textContent).toContain("Coins");
    expect(document.body.textContent).not.toContain("CANDY");

    requiredButton('[data-action="tech"]').click();
    expect(document.querySelectorAll(".v7-tech-card")).toHaveLength(25);
    expect(document.querySelectorAll(".v7-tech-edge")).toHaveLength(20);
    expect(document.querySelectorAll(".v7-tech-children.is-unary").length).toBe(
      10,
    );
    const branchSelect = document.querySelector<HTMLSelectElement>(
      ".v7-tech-branch-select",
    );
    if (branchSelect === null) throw new Error("Branch selector missing");
    expect(branchSelect.options).toHaveLength(5);
    const headings = [
      ...document.querySelectorAll<HTMLElement>(".v7-tech-branch > h3"),
    ];
    expect(headings).toHaveLength(5);
    expect(new Set(headings.map((heading) => heading.textContent)).size).toBe(
      5,
    );
    const lastBranch = document.querySelector<HTMLElement>(
      '[data-tech-branch="WARFARE"]',
    );
    if (lastBranch === null) throw new Error("Technology branch missing");
    const scrollIntoView = vi.fn();
    lastBranch.scrollIntoView = scrollIntoView;
    branchSelect.focus();
    branchSelect.value = "WARFARE";
    branchSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(document.activeElement).toBe(branchSelect);
    expect(document.querySelectorAll(".v7-art-frame").length).toBeGreaterThan(
      20,
    );
    expect(document.body.textContent).toContain("Technology");
    requiredButton('[data-action="close-overlay"]').click();

    requiredButton('[data-action="achievements"]').click();
    expect(document.body.textContent).toContain("Engineer");
    expect(document.body.textContent).toContain("Muster");
    expect(
      document.querySelectorAll(
        '[data-symbol-id="ui-status-achievement-progress"]',
      ),
    ).toHaveLength(2);
    requiredButton('[data-action="close-overlay"]').click();
    requiredButton('[data-action="stats"]').click();
    expect(document.body.textContent).toContain("Opponent totals are limited");
    expect(document.body.textContent).not.toContain("Opponent Coins");
    app.destroy();
  });

  it("renders the accepted End Pursuit code-native registry primitives", () => {
    const symbol = createTacticalSymbolV7(
      document,
      "ui-action-end-pursuit",
      "DARK",
    );
    expect(symbol.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(symbol.querySelectorAll("rect")).toHaveLength(1);
    expect(symbol.querySelectorAll("line")).toHaveLength(2);
    expect(symbol.textContent).toBe("");
  });

  it("keeps settings route-scoped and exposes spoiler-safe export labels", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="settings"]').click();
    expect(requiredButton('[data-action="restart"]').textContent).toContain(
      "Restart Same Match",
    );
    expect(requiredButton('[data-action="delete-save"]').textContent).toContain(
      "Delete Save",
    );
    expect(
      requiredButton('[data-action="export-debug-with-spoilers"]').ariaLabel,
    ).toContain("hidden map and units");
    app.destroy();
  });

  it("returns a real accepted match boundary to Main menu and resumes it", async () => {
    const app = bootstrapRuleset7App(document);
    requiredInput("v7-seed").value = "2";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const wait = app.controller
      .snapshot()
      .offeredCommands.find((command) => command.kind === "WAIT");
    if (wait === undefined) throw new Error("WAIT missing");
    expect((await app.controller.dispatch(wait)).accepted).toBe(true);
    const commandIndex = app.controller.snapshot().view?.commandIndex;

    requiredButton('[data-action="main-menu"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(document.querySelector(".v7-match-root")).toBeNull();
    expect(requiredButton('[data-action="resume"]').textContent).toBe("Resume");
    expect(app.controller.snapshot().view?.commandIndex).toBe(commandIndex);

    requiredButton('[data-action="resume"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    expect(app.controller.snapshot().view?.commandIndex).toBe(commandIndex);
    app.destroy();
  });

  it("labels a completed match without leaving a stale AI thinking status", async () => {
    const source = new Ruleset7BrowserController({
      aiProgressScheduler: () => () => {},
    });
    const launched = await source.launch(setupV7(2));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const initial = source.snapshot();
    if (initial.view === null) throw new Error("public view missing");
    const opponent = initial.view.players.find(
      (player) => player.id !== initial.view?.humanPlayerId,
    );
    if (opponent === undefined) throw new Error("opponent missing");
    const snapshot: Ruleset7BrowserSnapshot = {
      ...initial,
      phase: "COMPLETE",
      view: {
        ...initial.view,
        outcome: {
          kind: "DEFEAT",
          humanId: initial.view.humanPlayerId,
          defeatedByPlayerId: opponent.id,
        },
      },
      offeredCommands: [],
      ai: { ...initial.ai, active: false },
    };
    const app = new Ruleset7DomAppView(
      document,
      requiredRoot(),
      fixturePort(source, snapshot, async () => ({
        accepted: false,
        reason: "NOT_OFFERED",
      })),
      { boardHost: new CapturingBoardHost(), settingsStorage: null },
    );
    expect(document.querySelector(".v7-turn-status")?.textContent).toBe(
      "Match complete",
    );
    expect(document.body.textContent).not.toContain("is thinking");
    app.destroy();
    source.destroy();
  });

  it("researches only inside Tech, preserves card focus, and shows exact formulas", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    requiredInput("v7-seed").value = "2";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector('[data-action^="research-"]')).toBeNull();
    requiredButton('[data-action="tech"]').click();
    const hunting = requiredButton('[data-action="tech-hunting"]');
    hunting.click();
    expect(document.body.textContent).toContain("Hunt game");
    const research = requiredButton('[data-action="research-hunting"]');
    research.focus();
    research.click();
    await waitUntil(
      () =>
        app.controller
          .snapshot()
          .view?.viewer.researchedTechs.includes("HUNTING") === true,
    );
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "tech-hunting",
    );
    expect(
      requiredButton('[data-action="tech-hunting"]').textContent,
    ).not.toContain("Coins");
    requiredButton('[data-action="tech-commerce"]').click();
    expect(document.body.textContent).toContain(
      "capital-connected friendly Road",
    );
    app.destroy();
  });

  it("isolates modal input, traps focus and restores the opening control", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const before = app.controller.snapshot().view?.commandIndex;
    const trigger = requiredButton('[data-action="tech"]');
    trigger.focus();
    trigger.click();
    await Promise.resolve();
    const modal = document.querySelector<HTMLElement>('[aria-modal="true"]');
    if (modal === null) throw new Error("Tech modal missing");
    expect(document.querySelector<HTMLElement>(".v7-board-host")?.inert).toBe(
      true,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    await Promise.resolve();
    expect(app.controller.snapshot().view?.commandIndex).toBe(before);
    const controls = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    const first = controls[0];
    const last = controls.at(-1);
    if (first === undefined || last === undefined)
      throw new Error("Tech controls missing");
    last.focus();
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    expect(document.activeElement).toBe(first);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe("tech");
    expect(document.querySelector<HTMLElement>(".v7-board-host")?.inert).toBe(
      false,
    );
    const compactMenu = requiredButton('[data-action="compact-menu"]');
    compactMenu.click();
    await Promise.resolve();
    expect(
      requiredButton('[data-action="compact-menu"]').getAttribute(
        "aria-expanded",
      ),
    ).toBe("true");
    requiredButton('[data-action="settings"]').click();
    expect(requiredSelect("v7-motion")).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "settings",
    );
    app.destroy();
  });

  it("persists shared motion, speed, scale and contrast settings", async () => {
    const first = bootstrapRuleset7App(document, { storage: null });
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="settings"]').click();
    changeSelect("v7-motion", "REDUCED");
    changeSelect("v7-animation-speed", "FAST");
    changeSelect("v7-ui-scale", "1.5");
    requiredButton('[data-action="high-contrast"]').click();
    expect(window.localStorage.getItem("pulpWars.settings.v1")).toContain(
      '"highContrast":true',
    );
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const second = bootstrapRuleset7App(document, { storage: null });
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => second.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="settings"]').click();
    expect(requiredSelect("v7-motion").value).toBe("REDUCED");
    expect(requiredSelect("v7-animation-speed").value).toBe("FAST");
    expect(requiredSelect("v7-ui-scale").value).toBe("1.5");
    expect(requiredButton('[data-action="high-contrast"]').ariaPressed).toBe(
      "true",
    );
    second.destroy();
  });

  it("starts with defaults when the supplied settings adapter cannot be read", async () => {
    const app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: {
        getItem: () => {
          throw new Error("storage denied");
        },
        setItem: () => {
          throw new Error("storage denied");
        },
        removeItem: () => {
          throw new Error("storage denied");
        },
      },
    });
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="settings"]').click();
    expect(requiredSelect("v7-motion").value).toBe("FULL");
    expect(requiredSelect("v7-animation-speed").value).toBe("NORMAL");
    expect(requiredSelect("v7-ui-scale").value).toBe("1");
    app.destroy();
  });

  it("uses only public Monument provenance and places an unlocked entitlement in one map activation", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(setupV7(1540));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const initial = source.snapshot();
    if (initial.view === null) throw new Error("public view missing");
    const city = initial.view.cities.find(
      (candidate) => candidate.ownerId === initial.view?.viewer.id,
    );
    const cells = initial.view.board.tiles.filter(
      (tile) =>
        tile.explored &&
        tile.improvement === null &&
        tile.resource === null &&
        tile.site === null,
    );
    const monumentAt = cells[0]?.at;
    const targetAt = cells[1]?.at;
    if (
      city === undefined ||
      monumentAt === undefined ||
      targetAt === undefined
    )
      throw new Error("Monument fixture missing");
    const view: PlayerViewV7 = {
      ...initial.view,
      board: {
        ...initial.view.board,
        tiles: initial.view.board.tiles.map((tile) =>
          tile.explored &&
          tile.at.x === monumentAt.x &&
          tile.at.y === monumentAt.y
            ? { ...tile, improvement: "MONUMENT" }
            : tile,
        ),
      },
      viewer: {
        ...initial.view.viewer,
        achievementEntitlements:
          initial.view.viewer.achievementEntitlements.map((entitlement) =>
            entitlement.achievement === "ENGINEER"
              ? { ...entitlement, unlocked: true, spent: false }
              : entitlement,
          ),
      },
      improvementValues: [
        ...initial.view.improvementValues,
        {
          at: monumentAt,
          improvement: "MONUMENT",
          level: 3,
          measure: "POPULATION",
          contributingTiles: [],
        },
      ],
      populationContributions: [
        ...initial.view.populationContributions,
        {
          id: 99,
          cityId: city.id,
          category: "LIVE",
          amount: 3,
          source: {
            kind: "MONUMENT",
            visibility: "FULL",
            achievement: "ENGINEER",
            at: monumentAt,
          },
        },
      ],
    };
    const monumentCommand = {
      kind: "BUILD_MONUMENT" as const,
      achievement: "ENGINEER" as const,
      at: targetAt,
    };
    const trainableRoles = UNIT_ROLE_IDS_V7.filter(
      (role) => effectiveRoleRuleV7(role).cost !== null,
    );
    const snapshot: Ruleset7BrowserSnapshot = {
      ...initial,
      saveWarning: "synthetic autosave failure",
      view,
      offeredCommands: [
        ...initial.offeredCommands.filter(
          (command) => command.kind !== "TRAIN",
        ),
        ...trainableRoles.map((role) => ({
          kind: "TRAIN" as const,
          cityId: city.id,
          role,
        })),
        monumentCommand,
      ],
    };
    const dispatch = vi.fn();
    let resolveDispatch: (result: Ruleset7DispatchResult) => void = () => {};
    const dispatchResult = new Promise<Ruleset7DispatchResult>((resolve) => {
      resolveDispatch = resolve;
    });
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(
      document,
      requiredRoot(),
      fixturePort(source, snapshot, (command) => {
        dispatch(command);
        return dispatchResult;
      }),
      { boardHost: host, settingsStorage: null },
    );
    host.callbacks?.onSelection({ kind: "TILE", at: monumentAt });
    expect(document.body.textContent).toContain(
      "Engineer Monument · source visible to the current city owner",
    );
    expect(
      document.querySelector(
        '[data-symbol-id="ui-status-achievement-source-current-owner"]',
      ),
    ).not.toBeNull();
    expect(document.body.textContent).toContain(
      "Save warning: synthetic autosave failure",
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    expect(document.querySelectorAll(".v7-selection-details")).toHaveLength(1);
    expect(
      document.querySelector(".v7-selection-details")?.textContent,
    ).toContain("Population");
    expect(
      document.querySelector(".v7-selection-details")?.textContent,
    ).toContain("Assigned units");
    const trainCost = document.querySelector<HTMLElement>(
      ".v7-train-action .v7-command-economy",
    );
    expect(trainCost?.textContent).toMatch(/^\d+ Coins$/);
    expect(document.querySelectorAll(".v7-train-action")).toHaveLength(
      trainableRoles.length,
    );
    const statsWithModifier = view.unitStats.find((stats) =>
      stats.stats.some((stat) => stat.modifiers.length > 0),
    );
    if (statsWithModifier === undefined)
      throw new Error("Public modifier fixture missing");
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: statsWithModifier.unitId,
    });
    const modifier = requiredButton(".v7-stat-modifier");
    const modifierSource = modifier.getAttribute("aria-label")?.split(":")[0];
    modifier.focus();
    modifier.click();
    await Promise.resolve();
    expect(
      requiredButton(".v7-stat-modifier").getAttribute("aria-expanded"),
    ).toBe("true");
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
      modifierSource,
    );
    expect(document.activeElement?.classList.contains("v7-stat-modifier")).toBe(
      true,
    );
    host.callbacks?.onSelection({ kind: "TILE", at: monumentAt });
    requiredButton('[data-action="achievements"]').click();
    requiredButton('[data-action="monument-engineer"]').click();
    expect(host.model?.interaction.selectedAchievement).toBe("ENGINEER");
    host.callbacks?.onCommand({
      at: targetAt,
      family: "MONUMENT",
      command: monumentCommand,
    });
    host.callbacks?.onCommand({
      at: targetAt,
      family: "MONUMENT",
      command: monumentCommand,
    });
    await waitUntil(() => dispatch.mock.calls.length === 1);
    expect(dispatch).toHaveBeenCalledWith(monumentCommand);
    resolveDispatch({ accepted: false, reason: "NOT_OFFERED" });
    await Promise.resolve();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const concealedSnapshot: Ruleset7BrowserSnapshot = {
      ...snapshot,
      view: {
        ...view,
        populationContributions: view.populationContributions.map(
          (contribution): PublicPopulationContributionV7 =>
            contribution.source.kind === "MONUMENT" &&
            contribution.source.visibility === "FULL" &&
            contribution.source.at.x === monumentAt.x &&
            contribution.source.at.y === monumentAt.y
              ? ({
                  ...contribution,
                  category: "LIVE",
                  amount: 3,
                  source: {
                    kind: "MONUMENT",
                    visibility: "BUILDING_ONLY",
                    at: monumentAt,
                  },
                } satisfies PublicPopulationContributionV7)
              : contribution,
        ),
      },
    };
    const concealedHost = new CapturingBoardHost();
    const concealedApp = new Ruleset7DomAppView(
      document,
      requiredRoot(),
      fixturePort(source, concealedSnapshot, async () => ({
        accepted: false,
        reason: "NOT_OFFERED",
      })),
      { boardHost: concealedHost, settingsStorage: null },
    );
    concealedHost.callbacks?.onSelection({ kind: "TILE", at: monumentAt });
    expect(document.body.textContent).not.toContain("Engineer Monument");
    expect(
      document.querySelector(
        '[data-symbol-id="ui-status-achievement-source-current-owner"]',
      ),
    ).toBeNull();
    concealedApp.destroy();
    source.destroy();
  });
});

class CapturingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  model: BoardHostModelV7 | null = null;

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
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {
    this.callbacks = null;
    this.model = null;
  }
}

function fixturePort(
  source: Ruleset7BrowserController,
  snapshot: Ruleset7BrowserSnapshot,
  dispatch: (
    command: Parameters<Ruleset7ControllerPortV7["dispatch"]>[0],
  ) => Promise<Ruleset7DispatchResult>,
): Ruleset7ControllerPortV7 {
  return {
    snapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
    subscribeAcceptedBoundary: () => () => {},
    launch: source.launch.bind(source),
    resume: source.resume.bind(source),
    returnToMenu: source.returnToMenu.bind(source),
    dispatch,
    progressAiTurns: source.progressAiTurns.bind(source),
    restart: source.restart.bind(source),
    deleteStoredSave: source.deleteStoredSave.bind(source),
    setFastForward: source.setFastForward.bind(source),
    exportSafeLog: source.exportSafeLog.bind(source),
    exportDebugBundle: source.exportDebugBundle.bind(source),
  };
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
function requiredSelect(id: string): HTMLSelectElement {
  const node = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (node === null) throw new Error(`Missing #${id}`);
  return node;
}
function changeSelect(id: string, value: string): void {
  const select = requiredSelect(id);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
