// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_DIRECTION_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  bootstrapRuleset7App,
  Ruleset7BrowserController,
  type Ruleset7BrowserSnapshot,
  type Ruleset7DispatchResult,
  type Ruleset7AcceptedBoundary,
} from "../../src/app/index";
import type {
  CityId,
  PlayerViewV7,
  PublicPopulationContributionV7,
} from "../../src/engine/index";
import { effectiveRoleRuleV7, UNIT_ROLE_IDS_V7 } from "../../src/engine/index";
import { RULESET7_UNIT_ART_IDS } from "../../src/assets/ruleset7-ui-art";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  cityIncomeForViewerV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { createTacticalSymbolV7 } from "../../src/render/dom/tactical-symbol-v7";
// pulp_wars-w5j.1: the browser launches only distinct factions.
import { browserSetupV7 } from "../fixtures/v7-builders";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 DOM shell", () => {
  it("queues personal achievement dialogs once and lets a mandatory reward take priority", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(browserSetupV7(1542));
    if (!launched.ok) throw new Error(launched.diagnostic);
    let snapshot = source.snapshot();
    const view = snapshot.view;
    if (view === null) throw new Error("public view missing");
    const callbacks: {
      snapshot?: (value: Ruleset7BrowserSnapshot) => void;
      boundary?: (value: Ruleset7AcceptedBoundary) => void;
    } = {};
    const port: Ruleset7ControllerPortV7 = {
      ...fixturePort(source, snapshot, source.dispatch.bind(source)),
      snapshot: () => snapshot,
      subscribe: (listener) => {
        callbacks.snapshot = listener;
        return () => {};
      },
      subscribeAcceptedBoundary: (listener) => {
        callbacks.boundary = listener;
        return () => {};
      },
    };
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(document, requiredRoot(), port, {
      boardHost: host,
      settingsStorage: null,
    });
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined) throw new Error("city missing");
    snapshot = {
      ...snapshot,
      view: {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: city.id,
            reachedLevel: 2,
            candidates: ["TREASURY"],
          },
        ],
      },
      offeredCommands: [
        {
          kind: "CHOOSE_CITY_REWARD",
          cityId: city.id,
          reachedLevel: 2,
          reward: "TREASURY",
        },
      ],
    };
    callbacks.snapshot?.(snapshot);
    callbacks.boundary?.({
      actor: "HUMAN",
      beforeView: view,
      afterView: view,
      playerEvents: {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: view.viewer.id,
        commandIndex: view.commandIndex + 1,
        events: [
          {
            kind: "ACHIEVEMENT_UNLOCKED",
            playerId: view.viewer.id,
            achievement: "EXPLORER",
          },
          {
            kind: "ACHIEVEMENT_UNLOCKED",
            playerId: view.viewer.id,
            achievement: "ENGINEER",
          },
        ],
      },
    });
    expect(
      document.querySelector('[data-v7-region="mandatory-reward"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-v7-region="achievement-notice"]'),
    ).toBeNull();
    snapshot = {
      ...snapshot,
      view,
      offeredCommands: source.snapshot().offeredCommands,
    };
    callbacks.snapshot?.(snapshot);
    expect(
      document.querySelector('[data-v7-region="achievement-notice"]')
        ?.textContent,
    ).toContain("Explorer achievement complete");
    expect(host.model?.interactive).toBe(false);
    host.callbacks?.onSelection({
      kind: "TILE",
      at: view.cities[0]?.at ?? { x: 0, y: 0 },
    });
    expect(
      document.querySelectorAll('[data-v7-region="achievement-notice"]'),
    ).toHaveLength(1);
    requiredButton('[data-action="dismiss-achievement"]').click();
    expect(
      document.querySelector('[data-v7-region="achievement-notice"]')
        ?.textContent,
    ).toContain("Engineer achievement complete");
    requiredButton('[data-action="dismiss-achievement"]').click();
    expect(
      document.querySelector('[data-v7-region="achievement-notice"]'),
    ).toBeNull();
    const completedView: PlayerViewV7 = {
      ...view,
      outcome: { kind: "VICTORY", winnerId: view.viewer.id },
    };
    snapshot = { ...snapshot, phase: "COMPLETE", view: completedView };
    callbacks.snapshot?.(snapshot);
    callbacks.boundary?.({
      actor: "HUMAN",
      beforeView: view,
      afterView: completedView,
      playerEvents: {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: view.viewer.id,
        commandIndex: view.commandIndex + 2,
        events: [
          {
            kind: "ACHIEVEMENT_UNLOCKED",
            playerId: view.viewer.id,
            achievement: "MUSTER",
          },
        ],
      },
    });
    expect(
      document.querySelector('[data-v7-region="achievement-notice"]')
        ?.textContent,
    ).toContain("Muster achievement complete");
    expect(document.querySelector('[data-v7-region="results"]')).toBeNull();
    requiredButton('[data-action="dismiss-achievement"]').click();
    expect(document.querySelector('[data-v7-region="results"]')).not.toBeNull();
    app.destroy();
    source.destroy();
  });
  it("keeps signed Treasury notices paired with the current gold coin", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(browserSetupV7(1541));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(document, requiredRoot(), source, {
      boardHost: host,
      settingsStorage: null,
      startupNotice: "Treasury automatically granted · +12 Coins.",
    });
    const icon = document.querySelector(
      "#v7-live [data-asset-id='ui-hud-gold-coin-v7']",
    );
    expect(icon).not.toBeNull();
    expect(document.querySelector("#v7-live")?.textContent).toBe(
      "Treasury automatically granted · +12 Coins.",
    );
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 0, y: 0 } });
    expect(
      document.querySelector("#v7-live [data-asset-id='ui-hud-gold-coin-v7']"),
    ).toBe(icon);
    app.destroy();
    source.destroy();
  });

  it("coalesces human movement notifications and installs the board before rebuilding the HUD", async () => {
    const source = new Ruleset7BrowserController();
    // Seed 1543: the human moves first on its revision-14 map.
    const launched = await source.launch(browserSetupV7(1543));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const host = new CapturingBoardHost();
    let finishSlide: (() => void) | undefined;
    const presentation = vi
      .spyOn(host, "presentBoundary")
      .mockImplementation(
        () => new Promise<void>((resolve) => (finishSlide = resolve)),
      );
    const updates = vi.spyOn(host, "update");
    const app = new Ruleset7DomAppView(document, requiredRoot(), source, {
      boardHost: host,
      settingsStorage: null,
    });
    const view = source.snapshot().view;
    if (view === null) throw new Error("Public view missing");
    const command = source
      .snapshot()
      .offeredCommands.find((candidate) => candidate.kind === "MOVE");
    if (command === undefined || command.kind !== "MOVE")
      throw new Error("Move command missing");
    const unit = view.units.find(
      (candidate) => candidate.id === command.unitId,
    );
    if (unit === undefined) throw new Error("Moving unit missing");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    const hud = document.querySelector(".v7-match-hud");
    const beforeUpdates = updates.mock.calls.length;
    const target = command.path.at(-1);
    if (target === undefined) throw new Error("Move path missing");
    host.callbacks?.onCommand({ at: target, family: "MOVE", command });
    await waitUntil(() => presentation.mock.calls.length === 1);
    expect(updates.mock.calls.length - beforeUpdates).toBe(1);
    expect(host.model?.view.commandIndex).toBeGreaterThan(view.commandIndex);
    expect(document.querySelector(".v7-match-hud")).toBe(hud);
    expect(document.querySelector(".v7-selection-dock")?.textContent).toBe(
      "Movement",
    );
    expect(
      document.querySelector(".v7-selection-dock")?.getAttribute("aria-busy"),
    ).toBe("true");
    finishSlide?.();
    await waitUntil(
      () =>
        document
          .querySelector(".v7-selection-dock")
          ?.getAttribute("aria-busy") === null,
    );
    expect(updates.mock.calls.length - beforeUpdates).toBe(2);
    expect(
      document.querySelector(".v7-selection-dock")?.getAttribute("aria-busy"),
    ).toBeNull();
    app.destroy();
    source.destroy();
  });

  it("keeps the two mandatory reward actions in one desktop row", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    expect(css).toMatch(
      /@media \(min-width: 801px\) \{[\s\S]*?\.v7-mandatory-choice\[data-v7-region="mandatory-reward"\] \{[\s\S]*?grid-template-columns: repeat\(2, 176px\);[\s\S]*?\.v7-mandatory-choice\[data-v7-region="mandatory-reward"\] > h2 \{[\s\S]*?grid-column: 1 \/ -1;/,
    );
  });

  it("sizes the selection dock against the full viewport width on phones", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    const dockRule =
      /\n\.v7-selection-dock \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    // A shrink-to-fit box measures its available width from its insets: the
    // old left: 50% capped the dock at half a 390 px phone and clipped the
    // stat chips. Inline insets of 0 with auto margins centre it instead.
    expect(dockRule).toMatch(/\n {2}inset-inline: 0;/);
    expect(dockRule).toMatch(/\n {2}margin-inline: auto;/);
    expect(dockRule).toMatch(/\n {2}width: fit-content;/);
    expect(dockRule).toMatch(
      /\n {2}max-width: min\(calc\(100% - 1\.2rem\), 90rem\);/,
    );
    expect(dockRule).not.toMatch(/\n {2}left:/);
    expect(dockRule).not.toMatch(/translateX/);
    // Where the stacked dock spans the map, the board host reserves its
    // height so a new match is framed above it.
    expect(css).toMatch(
      /@media \(max-width: 800px\) \{\s*\/\*[\s\S]*?\*\/\s*\.v7-board-host \{\s*scroll-padding-bottom: 16rem;\s*\}/,
    );
  });

  it("launches the complete board-first shell with semantic public overlays", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    expect(document.querySelector("h1")?.textContent).toBe("Pulp Wars");
    expect(document.body.textContent).not.toContain("ORIGINAL_BASELINE");
    requiredInput("v7-seed").value = "2";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    expect(document.querySelector(".board-canvas-v7")).not.toBeNull();
    expect(
      document.querySelector(".v7-coins")?.getAttribute("aria-label"),
    ).toContain("Coins");
    const current = app.controller.snapshot().view;
    if (current === null) throw new Error("Public view missing");
    const projectedIncome = current.cities
      .filter((city) => city.ownerId === current.viewer.id)
      .reduce(
        (sum, city) => sum + (cityIncomeForViewerV7(current, city.id) ?? 0),
        0,
      );
    expect(
      document.querySelectorAll(
        ".v7-coins [data-asset-id='ui-hud-gold-coin-v7']",
      ),
    ).toHaveLength(1);
    expect(document.querySelector(".v7-coins")?.textContent).toBe(
      `${current.viewer.coins}+${projectedIncome}`,
    );
    expect(document.querySelector(".v7-income-rate")?.textContent).toBe(
      `+${projectedIncome}`,
    );
    expect(document.querySelector(".v7-hud-round")?.textContent).toBe(
      `Turn ${current.round}`,
    );
    expect(document.querySelector(".v7-hud-message")).toBeNull();
    expect(document.body.textContent).not.toContain("CANDY");

    requiredButton('[data-action="tech"]').click();
    expect(document.querySelectorAll(".v7-tech-card")).toHaveLength(23);
    expect(document.querySelectorAll(".v7-tech-edge")).toHaveLength(18);
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
      '[data-tech-lane="INDUSTRY:DRILL"]',
    );
    if (lastBranch === null) throw new Error("Technology branch missing");
    const scrollIntoView = vi.fn();
    lastBranch.scrollIntoView = scrollIntoView;
    branchSelect.focus();
    branchSelect.value = "INDUSTRY:DRILL";
    branchSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(document.activeElement).toBe(branchSelect);
    expect(document.querySelectorAll(".v7-art-frame").length).toBeGreaterThan(
      20,
    );
    expect(document.body.textContent).toContain("Technology");
    requiredButton('[data-action="close-overlay"]').click();

    expect(document.querySelector('[data-action="achievements"]')).toBeNull();
    openMenuItem("achievements");
    expect(document.body.textContent).toContain("Engineer");
    expect(document.body.textContent).toContain("Muster");
    // Revision 21: seven achievements on a naval map (the new four are
    // covered by ruleset7-achievements-dom.test.ts).
    expect(document.body.textContent).toContain("Land Baron");
    expect(document.querySelectorAll(".v7-achievement")).toHaveLength(7);
    expect(document.querySelectorAll(".v7-achievement-meter")).toHaveLength(7);
    requiredButton('[data-action="close-overlay"]').click();
    openMenuItem("leaderboard");
    expect(document.querySelectorAll(".v7-leaderboard-row")).toHaveLength(
      current.leaderboard.length,
    );
    expect(document.body.textContent).toContain("(you)");
    expect(document.body.textContent).not.toContain("Opponent Coins");
    app.destroy();
  });

  it("renders the retained Blackout code-native registry primitive", () => {
    const symbol = createTacticalSymbolV7(
      document,
      "ui-status-blackout-active",
      "DARK",
    );
    expect(symbol.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(symbol.textContent).toBe("");
  });

  it("keeps settings route-scoped, exposes spoiler-safe export labels, and reports current save deletion", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    openMenuItem("settings");
    expect(requiredButton('[data-action="restart"]').textContent).toBe(
      "Restart game",
    );
    expect(requiredButton('[data-action="delete-save"]').textContent).toBe(
      "Delete save",
    );
    expect(
      requiredButton('[data-action="export-debug-with-spoilers"]').ariaLabel,
    ).toContain("hidden map and units");
    requiredButton('[data-action="delete-save"]').click();
    await waitUntil(
      () => document.querySelector("#v7-live")?.textContent === "Save deleted.",
    );
    expect(document.querySelector("#v7-live")?.textContent).toBe(
      "Save deleted.",
    );
    app.destroy();
  });

  it("returns a real accepted match boundary to Main menu and resumes it", async () => {
    const app = bootstrapRuleset7App(document);
    // pulp_wars-wwc: seed 4 opens with the human seat on revision-16 maps
    // (seed 1 now opens with the AI).
    requiredInput("v7-seed").value = "4";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const wait = app.controller
      .snapshot()
      .offeredCommands.find((command) => command.kind === "WAIT");
    if (wait === undefined) throw new Error("WAIT missing");
    expect((await app.controller.dispatch(wait)).accepted).toBe(true);
    const commandIndex = app.controller.snapshot().view?.commandIndex;
    // Revision 16 terrain help on a naval (default Continents) match.
    openMenuItem("help");
    expect(document.querySelector(".v7-help-tips")?.textContent).toContain(
      "Shallow Water: water that shares an edge with land. Water touching land only at a corner is Deep Water.",
    );
    requiredButton('[data-action="close-overlay"]').click();

    openMenuItem("main-menu");
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(document.querySelector(".v7-match-root")).toBeNull();
    expect(requiredButton('[data-action="resume"]').textContent).toBe("Resume");
    expect(app.controller.snapshot().view?.commandIndex).toBe(commandIndex);

    requiredButton('[data-action="resume"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    expect(app.controller.snapshot().view?.commandIndex).toBe(commandIndex);

    openMenuItem("main-menu");
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    requiredButton('[data-action="show-replace"]').click();
    requiredInput("v7-seed").value = "2";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    openMenuItem("main-menu");
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(requiredButton('[data-action="resume"]').textContent).toBe("Resume");
    app.destroy();
  });

  it("labels a completed match without leaving a stale AI thinking status", async () => {
    const source = new Ruleset7BrowserController({
      aiProgressScheduler: () => () => {},
    });
    const launched = await source.launch(browserSetupV7(2));
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
      "Game over",
    );
    expect(document.body.textContent).not.toContain("is playing");
    app.destroy();
    source.destroy();
  });

  it("researches only inside Tech, preserves card focus, and shows exact formulas", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    // pulp_wars-wwc: a human-first seed on revision-16 maps (was 1).
    requiredInput("v7-seed").value = "4";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector('[data-action^="research-"]')).toBeNull();
    requiredButton('[data-action="tech"]').click();
    const hunting = requiredButton('[data-action="tech-hunting"]');
    hunting.click();
    expect(document.body.textContent).toContain("Hunt game");
    expect(
      document.querySelectorAll(".v7-tech-unlocks > li").length,
    ).toBeGreaterThan(0);
    expect(
      document.querySelector(
        '.v7-tech-unlocks > li[data-effect-group="ACTIONS"]',
      )?.textContent,
    ).toBe("Hunt game");
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
    expect(document.querySelector(".v7-tech-detail")?.textContent).toContain(
      "Road-linked cities: +1 Coin",
    );
    // Revision 14 (E2): Commerce no longer doubles Markets.
    expect(document.querySelector(".v7-tech-detail")?.textContent).not.toMatch(
      /doubl|Markets earn/,
    );
    const income = Array.from(document.querySelectorAll("[aria-label]"))
      .map((node) => node.getAttribute("aria-label") ?? "")
      .find((label) => label.includes("Next income"));
    expect(income).toContain(
      // Revision 16 (economy deflation): the level term caps at 4.
      "Commerce earns trade. City income: Level (max 4) + capital + trade + Markets.",
    );
    expect(income).not.toContain("doubles Markets");
    requiredButton('[data-action="tech-drill"]').click();
    expect(document.querySelector(".v7-tech-detail")?.textContent).toContain(
      "Reveals Ore",
    );
    requiredButton('[data-action="tech-engineering"]').click();
    const engineering = document.querySelector(".v7-tech-detail")?.textContent;
    expect(engineering).toContain("Units can climb mountains");
    expect(engineering).toContain("+1 sight on mountains");
    requiredButton('[data-action="close-tech-detail"]').click();
    await Promise.resolve();
    expect(document.querySelector(".v7-tech-detail")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "tech-engineering",
    );
    app.destroy();
  });

  it("omits recruitment controls while a unit is stationed in the selected city", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(browserSetupV7(1538));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const snapshot = source.snapshot();
    if (snapshot.view === null) throw new Error("public view missing");
    const city = snapshot.view.cities.find(
      (candidate) => candidate.ownerId === snapshot.view?.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    expect(
      snapshot.view.units.some(
        (unit) => unit.at.x === city.at.x && unit.at.y === city.at.y,
      ),
    ).toBe(true);
    expect(
      snapshot.offeredCommands.some(
        (command) => command.kind === "TRAIN" && command.cityId === city.id,
      ),
    ).toBe(false);

    const occupiedHost = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(document, requiredRoot(), source, {
      boardHost: occupiedHost,
      settingsStorage: null,
    });
    occupiedHost.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    const dock = document.querySelector<HTMLElement>(
      '.v7-selection-dock[data-selection-kind="city"]',
    );
    expect(dock).not.toBeNull();
    expect(dock?.querySelector(".v7-train-action")).toBeNull();
    expect(dock?.querySelector('[data-action="command-train"]')).toBeNull();
    app.destroy();
    source.destroy();
  });

  it("opens inert train help without mutation, restores focus and scroll, then dispatches Train once", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(browserSetupV7(1539));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const initial = source.snapshot();
    if (initial.view === null) throw new Error("public view missing");
    const city = initial.view.cities.find(
      (candidate) => candidate.ownerId === initial.view?.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    const roles = UNIT_ROLE_IDS_V7.filter(
      (role) => effectiveRoleRuleV7(role, "ORIGINAL").cost !== null,
    );
    const snapshot: Ruleset7BrowserSnapshot = {
      ...initial,
      offeredCommands: roles.map((role) => ({
        kind: "TRAIN" as const,
        cityId: city.id,
        role,
      })),
    };
    const dispatch = vi.fn(async (): Promise<Ruleset7DispatchResult> => ({
      accepted: false,
      reason: "NOT_OFFERED",
    }));
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(
      document,
      requiredRoot(),
      fixturePort(source, snapshot, dispatch),
      { boardHost: host, settingsStorage: null },
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });

    expect(document.querySelectorAll(".v7-train-card")).toHaveLength(
      roles.length,
    );
    expect(document.querySelectorAll(".v7-train-help")).toHaveLength(
      roles.length,
    );
    for (const role of roles) {
      const rule = effectiveRoleRuleV7(role, "ORIGINAL");
      const help = requiredButton(
        `[data-action="train-help-${role.toLowerCase()}"]`,
      );
      expect(help.textContent).toBe("?");
      expect(help.getAttribute("aria-label")).toBe(`About ${rule.label}`);
      expect(help.parentElement?.classList.contains("v7-train-card")).toBe(
        true,
      );
      expect(
        help.parentElement?.querySelectorAll(":scope > button"),
      ).toHaveLength(2);
      expect(
        help.parentElement?.querySelector(".v7-train-action button"),
      ).toBeNull();
    }

    const beforeIndex = initial.view.commandIndex;
    const beforeCoins = initial.view.viewer.coins;
    const cityDock = document.querySelector<HTMLElement>(
      '.v7-selection-dock[data-selection-kind="city"]',
    );
    if (cityDock === null) throw new Error("city dock missing");
    cityDock.scrollTop = 123;
    const help = requiredButton('[data-action="train-help-knight"]');
    help.focus();
    help.click();
    await Promise.resolve();
    const modal = document.querySelector<HTMLElement>(".v7-recruit-help");
    if (modal === null) throw new Error("recruit help missing");
    expect(modal.getAttribute("aria-label")).toBe("Knight information");
    expect(modal.querySelector(".v7-dialog-header h2")?.textContent).toBe(
      "Knight",
    );
    expect(
      modal.querySelector<HTMLImageElement>(".v7-art-frame")?.dataset.assetId,
    ).toBe(RULESET7_UNIT_ART_IDS.KNIGHT);
    expect(modal.textContent).toContain("HP10");
    expect(modal.textContent).toContain("Range1");
    expect(modal.textContent).toContain(
      "After a kill, advances and can attack another adjacent enemy.",
    );
    expect(modal.textContent).toContain("Can't capture.");
    expect(modal.textContent).not.toContain("Needs action");
    expect(dispatch).not.toHaveBeenCalled();
    expect(initial.view.commandIndex).toBe(beforeIndex);
    expect(initial.view.viewer.coins).toBe(beforeCoins);
    expect(document.querySelector<HTMLElement>(".v7-board-host")?.inert).toBe(
      true,
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();
    expect(document.querySelector(".v7-recruit-help")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "train-help-knight",
    );
    const restoredDock = document.querySelector<HTMLElement>(
      '.v7-selection-dock[data-selection-kind="city"]',
    );
    expect(restoredDock).not.toBe(cityDock);
    expect(restoredDock?.scrollTop).toBe(123);

    requiredButton('[data-action="train-help-knight"]').click();
    await Promise.resolve();
    requiredButton('[data-action="close-recruit-help"]').click();
    await Promise.resolve();
    expect(document.querySelector(".v7-recruit-help")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "train-help-knight",
    );
    const dockAfterClose = document.querySelector<HTMLElement>(
      '.v7-selection-dock[data-selection-kind="city"]',
    );
    if (dockAfterClose === null) throw new Error("closed city dock missing");
    dockAfterClose.scrollTop = 37;
    requiredButton('[data-action="compact-menu"]').click();
    await Promise.resolve();
    expect(
      document.querySelector<HTMLElement>(
        '.v7-selection-dock[data-selection-kind="city"]',
      )?.scrollTop,
    ).toBe(37);

    const train = requiredButton(".v7-train-action");
    train.click();
    train.click();
    await waitUntil(() => dispatch.mock.calls.length === 1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "TRAIN", cityId: city.id }),
    );
    app.destroy();
    source.destroy();
  });

  it("keeps the dock scroll across re-renders of the same selection and resets it on a new selection", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(browserSetupV7(1539));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const initial = source.snapshot();
    const launchedView = initial.view;
    if (launchedView === null) throw new Error("public view missing");
    const city = launchedView.cities.find(
      (candidate) => candidate.ownerId === launchedView.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    // A second visible city, so the dock can switch between two cities.
    const otherCity = {
      ...city,
      id: (Math.max(...launchedView.cities.map((candidate) => candidate.id)) +
        1) as CityId,
    };
    const view: PlayerViewV7 = {
      ...launchedView,
      cities: [...launchedView.cities, otherCity],
    };
    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (unit === undefined) throw new Error("owned unit missing");
    const roles = UNIT_ROLE_IDS_V7.filter(
      (role) => effectiveRoleRuleV7(role, "ORIGINAL").cost !== null,
    );
    const snapshot: Ruleset7BrowserSnapshot = {
      ...initial,
      view,
      offeredCommands: roles.map((role) => ({
        kind: "TRAIN" as const,
        cityId: city.id,
        role,
      })),
    };
    let nextResult: Ruleset7DispatchResult = {
      accepted: true,
      beforeView: view,
      afterView: view,
      playerEvents: {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: view.viewer.id,
        commandIndex: view.commandIndex + 1,
        events: [],
      },
    };
    const dispatch = vi.fn(async () => nextResult);
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(
      document,
      requiredRoot(),
      fixturePort(source, snapshot, dispatch),
      { boardHost: host, settingsStorage: null },
    );
    const currentDock = (): HTMLElement => {
      const dock = document.querySelector<HTMLElement>(".v7-selection-dock");
      if (dock === null) throw new Error("selection dock missing");
      return dock;
    };

    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    const cityDock = currentDock();
    cityDock.scrollTop = 140;

    // An accepted command rebuilds the dock; the same city stays selected.
    requiredButton(".v7-train-action").click();
    await waitUntil(() => dispatch.mock.calls.length === 1);
    await flushMicrotasks();
    expect(currentDock()).not.toBe(cityDock);
    expect(currentDock().dataset.selectionKind).toBe("city");
    expect(currentDock().scrollTop).toBe(140);

    // A rejected command renders an error notice; the scroll still holds.
    nextResult = { accepted: false, reason: "NOT_OFFERED" };
    currentDock().scrollTop = 90;
    requiredButton(".v7-train-action").click();
    await waitUntil(() => dispatch.mock.calls.length === 2);
    await flushMicrotasks();
    expect(document.querySelector(".v7-toast-error")).not.toBeNull();
    expect(currentDock().scrollTop).toBe(90);

    // Selecting another city, then a unit, starts each dock at the top.
    host.callbacks?.onSelection({ kind: "CITY", cityId: otherCity.id });
    expect(currentDock().scrollTop).toBe(0);
    currentDock().scrollTop = 60;
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(currentDock().dataset.selectionKind).toBe("unit");
    expect(currentDock().scrollTop).toBe(0);

    // A visible move swaps the unit dock for a placeholder; the settled dock
    // returns to the scroll the player left.
    currentDock().scrollTop = 25;
    nextResult = {
      accepted: true,
      beforeView: view,
      afterView: view,
      playerEvents: {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: view.viewer.id,
        commandIndex: view.commandIndex + 1,
        events: [{ kind: "UNIT_MOVED", unitId: unit.id, path: [unit.at] }],
      },
    };
    // jsdom has no layout, so emulate the browser clamping the emptied
    // placeholder's scroll to the top.
    const clamp = new MutationObserver(() => {
      const busy = document.querySelector<HTMLElement>(
        '.v7-selection-dock[aria-busy="true"]',
      );
      if (busy !== null) busy.scrollTop = 0;
    });
    clamp.observe(requiredRoot(), {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-busy"],
    });
    host.callbacks?.onCommand({
      at: unit.at,
      family: "MOVE",
      command: { kind: "MOVE", unitId: unit.id, path: [unit.at] },
    });
    await waitUntil(() => dispatch.mock.calls.length === 3);
    await flushMicrotasks();
    clamp.disconnect();
    expect(currentDock().getAttribute("aria-busy")).toBeNull();
    expect(currentDock().dataset.selectionKind).toBe("unit");
    expect(currentDock().scrollTop).toBe(25);

    // Closing the dock and reselecting the same unit starts at the top.
    requiredButton('[data-action="close-dock"]').click();
    expect(document.querySelector(".v7-selection-dock")).toBeNull();
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(currentDock().scrollTop).toBe(0);
    app.destroy();
    source.destroy();
  });

  it("isolates modal input, traps focus and restores the opening control", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    chooseSeed();
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
    openMenuItem("settings");
    expect(requiredSelect("v7-motion")).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await Promise.resolve();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "compact-menu",
    );
    app.destroy();
  });

  it("persists shared motion, speed, scale and contrast settings", async () => {
    const first = bootstrapRuleset7App(document, { storage: null });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    openMenuItem("settings");
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
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => second.controller.snapshot().phase === "ACTIVE");
    openMenuItem("settings");
    expect(requiredSelect("v7-motion").value).toBe("REDUCED");
    expect(requiredSelect("v7-animation-speed").value).toBe("FAST");
    expect(requiredSelect("v7-ui-scale").value).toBe("1.5");
    expect(requiredButton('[data-action="high-contrast"]').ariaPressed).toBe(
      "true",
    );
    second.destroy();
  });

  it("offers developer saturation sliders that update the board live, persist and reset (pulp_wars-x6c)", async () => {
    const key = "pulpWars.ruleset7.boardSaturation.v1";
    const host = new CapturingBoardHost();
    const first = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    // The default is 100 percent for both groups: nothing is desaturated.
    expect(host.model?.saturation).toEqual({ building: 100, city: 100 });
    const savesBefore = first.controller.snapshot().view?.commandIndex;
    openMenuItem("settings");
    const tools = document.querySelector<HTMLDetailsElement>(
      ".v7-developer-tools",
    );
    if (tools === null) throw new Error("Developer tools missing");
    tools.open = true;
    const building = requiredInput("v7-building-saturation");
    const city = requiredInput("v7-city-saturation");
    for (const input of [building, city]) {
      expect(input.type).toBe("range");
      expect([input.min, input.max, input.step, input.value]).toEqual([
        "0",
        "100",
        "5",
        "100",
      ]);
      expect(input.getAttribute("aria-valuetext")).toBe("100%");
    }
    // Each slider is named by its label and paired with a live readout.
    expect(
      document.querySelector('label[for="v7-building-saturation"]')
        ?.textContent,
    ).toBe("Building saturation");
    expect(
      document.querySelector('label[for="v7-city-saturation"]')?.textContent,
    ).toBe("City saturation");
    const readout = (id: string): HTMLOutputElement => {
      const node = document.querySelector<HTMLOutputElement>(`#${id}-value`);
      if (node === null) throw new Error(`Missing readout for ${id}`);
      return node;
    };
    expect(readout("v7-building-saturation").tagName).toBe("OUTPUT");
    expect(readout("v7-building-saturation").htmlFor.value).toBe(
      "v7-building-saturation",
    );
    expect(readout("v7-building-saturation").textContent).toBe("100%");

    const drag = (input: HTMLInputElement, value: string): void => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    drag(building, "30");
    // The board model changes at once and the dialog is not rebuilt.
    expect(host.model?.saturation).toEqual({ building: 30, city: 100 });
    expect(requiredInput("v7-building-saturation")).toBe(building);
    expect(readout("v7-building-saturation").textContent).toBe("30%");
    expect(building.getAttribute("aria-valuetext")).toBe("30%");
    drag(city, "60");
    expect(host.model?.saturation).toEqual({ building: 30, city: 60 });
    expect(readout("v7-city-saturation").textContent).toBe("60%");
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toEqual({
      building: 30,
      city: 60,
    });
    // Presentation only: the shared settings envelope and the match are
    // untouched.
    expect(window.localStorage.getItem("pulpWars.settings.v1")).toBeNull();
    expect(first.controller.snapshot().view?.commandIndex).toBe(savesBefore);
    // Another setting re-renders the dialog; the section stays open.
    tools.dispatchEvent(new Event("toggle"));
    requiredButton('[data-action="high-contrast"]').click();
    expect(
      document.querySelector<HTMLDetailsElement>(".v7-developer-tools")?.open,
    ).toBe(true);
    expect(requiredInput("v7-building-saturation").value).toBe("30");
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const restoredHost = new CapturingBoardHost();
    const second = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: restoredHost,
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => second.controller.snapshot().phase === "ACTIVE");
    expect(restoredHost.model?.saturation).toEqual({ building: 30, city: 60 });
    openMenuItem("settings");
    expect(requiredInput("v7-building-saturation").value).toBe("30");
    expect(requiredInput("v7-city-saturation").value).toBe("60");
    requiredButton('[data-action="reset-board-saturation"]').click();
    expect(restoredHost.model?.saturation).toEqual({
      building: 100,
      city: 100,
    });
    expect(requiredInput("v7-building-saturation").value).toBe("100");
    expect(readout("v7-city-saturation").textContent).toBe("100%");
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toEqual({
      building: 100,
      city: 100,
    });
    second.destroy();

    // An invalid stored value is clamped; a malformed one falls back to 100.
    window.localStorage.setItem(key, '{"building":-40,"city":"grey"}');
    document.body.innerHTML = '<div id="app"></div>';
    const clampedHost = new CapturingBoardHost();
    const third = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: clampedHost,
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => third.controller.snapshot().phase === "ACTIVE");
    expect(clampedHost.model?.saturation).toEqual({ building: 0, city: 100 });
    third.destroy();
  });

  it("draws the new visual direction by default and offers a persistent Classic look developer option (pulp_wars-3tq.6)", async () => {
    const key = "pulpWars.ruleset7.boardClassicLook.v1";
    const retiredKey = "pulpWars.ruleset7.boardVisualDirection.v1";
    // Whatever the retired experiment stored never forces the classic look.
    window.localStorage.setItem(retiredKey, '{"recommended":false}');
    const host = new CapturingBoardHost();
    const first = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    // A fresh player gets the new look: plates, pennants, calm chrome, and
    // the direction's own art, loaded with the rest of the CHIBI set.
    expect(host.model?.artSet).toBe("CHIBI");
    expect(host.model?.visualDirection).toEqual(LIVE_DIRECTION_V7);
    expect(host.model?.visualDirection?.unit.base).toBe("PLATE");
    expect(host.model?.visualDirection?.chrome).toEqual({
      hp: "DAMAGED",
      hpPlacement: "BASE",
      badge: "NONE",
      ready: "BASE",
      roads: "CALM",
      borders: "SOLID",
    });
    expect(
      host.model?.visualDirectionArt?.variants("UNIT:FIGHTER")[0]?.id,
    ).toBe("chibi-direction-fighter");
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.localStorage.getItem(retiredKey)).toBeNull();
    openMenuItem("settings");
    expect(document.querySelector("#v7-visual-direction")).toBeNull();
    const toggle = requiredInput("v7-classic-look");
    expect(toggle.type).toBe("checkbox");
    expect(toggle.checked).toBe(false);
    expect(toggle.closest("label")?.textContent?.trim()).toBe(
      "Classic look (previous art)",
    );
    expect(
      toggle.closest("details")?.querySelector("summary")?.textContent,
    ).toBe("Developer tools");
    toggle.click();
    // The classic look carries no direction at all: the board host then
    // draws exactly the pre-direction frame.
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);
    expect(host.model !== null && "visualDirectionArt" in host.model).toBe(
      false,
    );
    expect(window.localStorage.getItem(key)).toBe('{"classic":true}');
    // Presentation only: the shared settings envelope is untouched.
    expect(window.localStorage.getItem("pulpWars.settings.v1")).toBeNull();
    requiredInput("v7-classic-look").click();
    expect(host.model?.visualDirection).toEqual(LIVE_DIRECTION_V7);
    expect(window.localStorage.getItem(key)).toBe('{"classic":false}');
    // The saturation sliders keep working with the new buildings: the model
    // carries both the direction and the saturation.
    const building = requiredInput("v7-building-saturation");
    building.value = "40";
    building.dispatchEvent(new Event("input", { bubbles: true }));
    expect(host.model?.saturation).toEqual({ building: 40, city: 100 });
    expect(host.model?.visualDirection).toEqual(LIVE_DIRECTION_V7);
    requiredInput("v7-classic-look").click();
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const restoredHost = new CapturingBoardHost();
    const second = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: restoredHost,
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => second.controller.snapshot().phase === "ACTIVE");
    expect(restoredHost.model).not.toBeNull();
    expect(
      restoredHost.model !== null && "visualDirection" in restoredHost.model,
    ).toBe(false);
    second.destroy();

    // The LEGACY art set never carries the direction.
    window.localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    const legacyHost = new CapturingBoardHost();
    const third = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: legacyHost,
      artSet: "LEGACY",
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => third.controller.snapshot().phase === "ACTIVE");
    expect(legacyHost.model?.artSet).toBe("LEGACY");
    expect(
      legacyHost.model !== null && "visualDirection" in legacyHost.model,
    ).toBe(false);
    third.destroy();
  });

  it("draws one Farm, has no Farm crop option and drops its stored key (pulp_wars-9s0.7)", async () => {
    const key = "pulpWars.ruleset7.boardFarmCrop.v1";
    window.localStorage.setItem(key, '{"crop":"LETTUCE"}');
    const host = new CapturingBoardHost();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    // The retired comparison setting is never read and is removed on load.
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(
      host.model?.visualDirectionArt
        ?.variants("IMPROVEMENT:FARM")
        .map((asset) => asset.id),
    ).toEqual(["chibi-direction-farm"]);
    openMenuItem("settings");
    expect(document.getElementById("v7-classic-look")).not.toBeNull();
    expect(document.getElementById("v7-farm-crop")).toBeNull();
    expect(
      Array.from(document.querySelectorAll("legend")).map(
        (legend) => legend.textContent,
      ),
    ).not.toContain("Farm crop");
    app.destroy();
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
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    openMenuItem("settings");
    expect(requiredSelect("v7-motion").value).toBe("FULL");
    expect(requiredSelect("v7-animation-speed").value).toBe("NORMAL");
    expect(requiredSelect("v7-ui-scale").value).toBe("1");
    app.destroy();
  });

  it("uses only public Monument provenance and places an unlocked entitlement in one map activation", async () => {
    const source = new Ruleset7BrowserController();
    const launched = await source.launch(browserSetupV7(1540));
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
    const oreAt = cells[2]?.at;
    const mineAt = cells[3]?.at;
    const forgeAt = cells[4]?.at;
    if (
      city === undefined ||
      monumentAt === undefined ||
      targetAt === undefined ||
      oreAt === undefined ||
      mineAt === undefined ||
      forgeAt === undefined
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
            : tile.explored && tile.at.x === oreAt.x && tile.at.y === oreAt.y
              ? {
                  ...tile,
                  biome: "HIGHLANDS",
                  terrain: "MOUNTAIN",
                  resource: "ORE",
                  improvement: null,
                }
              : tile.explored &&
                  tile.at.x === mineAt.x &&
                  tile.at.y === mineAt.y
                ? {
                    ...tile,
                    biome: "HIGHLANDS",
                    terrain: "MOUNTAIN",
                    resource: null,
                    improvement: "MINE",
                  }
                : tile.explored &&
                    tile.at.x === targetAt.x &&
                    tile.at.y === targetAt.y
                  ? {
                      ...tile,
                      biome: "PLAINS",
                      terrain: "MOUNTAIN",
                      resource: null,
                      improvement: null,
                    }
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
      unitStats: initial.view.unitStats.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              stats: entry.stats.map((stat) =>
                stat.id === "DEFENSE"
                  ? {
                      ...stat,
                      modifiers: [
                        {
                          value: { numerator: 1, denominator: 1 },
                          source: "CITY_FORTIFICATION" as const,
                          sourceLabel: "City fortification",
                          description:
                            "Prospecting adds 1 Defense on an owned city center.",
                        },
                      ],
                    }
                  : stat,
              ),
            }
          : entry,
      ),
    };
    const monumentCommand = {
      kind: "BUILD_MONUMENT" as const,
      achievement: "ENGINEER" as const,
      at: targetAt,
    };
    const trainableRoles = UNIT_ROLE_IDS_V7.filter(
      (role) => effectiveRoleRuleV7(role, "ORIGINAL").cost !== null,
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
        { kind: "BUILD_MINE", at: oreAt },
        { kind: "BUILD_FORGE", at: forgeAt },
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
    expect(document.body.textContent).toContain("Engineer monument");
    expect(
      document.querySelector(
        '[data-symbol-id="ui-status-achievement-source-current-owner"]',
      ),
    ).not.toBeNull();
    expect(document.body.textContent).toContain(
      "Save warning: synthetic autosave failure",
    );
    host.callbacks?.onSelection({ kind: "TILE", at: targetAt });
    expect(document.querySelector(".v7-identity h2")?.textContent).toBe(
      "Mountain",
    );
    expect(
      document.querySelector(".v7-selection-dock")?.textContent,
    ).not.toContain("Explored territory");
    expect(
      document.querySelector(".v7-context-actions")?.textContent,
    ).toContain("Monument");
    expect(
      document.querySelector(".v7-selection-dock")?.textContent,
    ).not.toContain("No direct action is currently offered");
    expect(
      document.querySelector(".v7-selection-dock")?.textContent,
    ).not.toContain("Ore");
    host.callbacks?.onSelection({ kind: "TILE", at: oreAt });
    expect(document.querySelector(".v7-identity h2")?.textContent).toBe("Ore");
    expect(document.querySelector(".v7-context-action")?.textContent).toContain(
      "Mine",
    );
    host.callbacks?.onSelection({ kind: "TILE", at: mineAt });
    expect(document.querySelector(".v7-identity h2")?.textContent).toBe("Mine");
    host.callbacks?.onSelection({ kind: "TILE", at: forgeAt });
    expect(document.querySelector(".v7-context-action")?.textContent).toContain(
      "Forge",
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    expect(document.querySelectorAll(".v7-city-stats")).toHaveLength(1);
    expect(document.querySelector(".v7-city-stats")?.textContent).toContain(
      "Population",
    );
    expect(document.querySelector(".v7-city-stats")?.textContent).toContain(
      "Units",
    );
    expect(
      document.querySelector('[data-stat="city-action"]')?.textContent,
    ).toContain("City actionReady");
    expect(
      document
        .querySelector(".v7-city-stats .v7-population-value img")
        ?.getAttribute("data-asset-id"),
    ).toBe("ui-hud-population");
    const populationPips = [
      ...document.querySelectorAll<HTMLElement>(".v7-population-pip"),
    ];
    expect(populationPips).toHaveLength(Math.max(1, city.level + 1));
    expect(populationPips.map((pip) => pip.dataset.state ?? "empty")).toEqual(
      Array.from({ length: Math.max(1, city.level + 1) }, (_, index) =>
        city.population > 0 && index < city.population ? "filled" : "empty",
      ),
    );
    expect(
      document
        .querySelector(".v7-city-stats .v7-city-income img")
        ?.getAttribute("data-asset-id"),
    ).toBe("ui-hud-gold-coin-v7");
    const trainCost = document.querySelector<HTMLElement>(
      ".v7-train-action .v7-command-economy",
    );
    expect(trainCost?.textContent).toMatch(/^\d+$/);
    expect(trainCost?.querySelector("img")?.getAttribute("data-asset-id")).toBe(
      "ui-hud-gold-coin-v7",
    );
    expect(document.querySelectorAll(".v7-train-action")).toHaveLength(
      trainableRoles.length,
    );
    const cityDock = document.querySelector<HTMLElement>(
      '.v7-selection-dock[data-selection-kind="city"]',
    );
    const cityActions = cityDock?.querySelector<HTMLElement>(
      ":scope > .v7-context-actions",
    );
    expect(cityDock).not.toBeNull();
    expect(cityActions).not.toBeNull();
    const statsWithModifier = view.unitStats.find((stats) =>
      stats.stats.some((stat) => stat.modifiers.length > 0),
    );
    if (statsWithModifier === undefined)
      throw new Error("Public modifier fixture missing");
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: statsWithModifier.unitId,
    });
    expect(
      document.querySelector(".v7-selection-dock > .v7-identity"),
    ).not.toBeNull();
    expect(
      document.querySelector(".v7-selection-dock > .v7-unit-stats"),
    ).not.toBeNull();
    expect(
      document.querySelector(".v7-selection-dock > .v7-abilities"),
    ).toBeNull();
    expect(requiredButton('[data-action="unit-help"]').textContent).toBe("?");
    expect(
      document
        .querySelector(".v7-identity-art")
        ?.getAttribute("data-frame-mode"),
    ).toBe("visible-alpha");
    const modifier = requiredButton(".v7-stat-modifier");
    const modifierSource = modifier.getAttribute("aria-label")?.split(":")[0];
    modifier.focus();
    modifier.click();
    await Promise.resolve();
    expect(
      requiredButton(".v7-stat-modifier").getAttribute("aria-expanded"),
    ).toBe("true");
    expect(requiredButton(".v7-stat-modifier").dataset.tooltip).toContain(
      modifierSource,
    );
    expect(document.activeElement?.classList.contains("v7-stat-modifier")).toBe(
      true,
    );
    requiredButton('[data-action="unit-help"]').click();
    expect(
      document.querySelector('[data-v7-region="unit-help"][aria-modal="true"]'),
    ).not.toBeNull();
    expect(
      document.querySelector(".v7-unit-help-dialog .v7-abilities")?.textContent
        ?.length,
    ).toBeGreaterThan(0);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await Promise.resolve();
    expect(document.querySelector(".v7-unit-help-dialog")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "unit-help",
    );
    host.callbacks?.onSelection({ kind: "TILE", at: monumentAt });
    openMenuItem("achievements");
    expect(
      document.querySelector('[data-action="monument-engineer"]'),
    ).toBeNull();
    requiredButton('[data-action="close-overlay"]').click();
    host.callbacks?.onSelection({ kind: "TILE", at: targetAt });
    const build = requiredButton(
      '[data-action="command-build_monument-engineer"]',
    );
    expect(
      build.querySelector('[data-asset-id="building-square-monument"]'),
    ).not.toBeNull();
    build.click();
    build.click();
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

function openMenuItem(action: string): void {
  if (document.querySelector(`[data-action="${action}"]`) === null)
    requiredButton('[data-action="compact-menu"]').click();
  requiredButton(`[data-action="${action}"]`).click();
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

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Setup defaults to "New map"; these launches need the fixed seed field. */
function chooseSeed(): void {
  document
    .querySelector<HTMLButtonElement>('[data-action="seed-mode-seed"]')
    ?.click();
}
