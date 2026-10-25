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
import type { CityId, PlayerViewV7 } from "../../src/engine/index";
import { effectiveRoleRuleV7, UNIT_ROLE_IDS_V7 } from "../../src/engine/index";
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
import { TECHNOLOGY_WIDE_TREE_MEDIA_V7 } from "../../src/render/dom/technology-tree-layout-v7";
// pulp_wars-w5j.1: the browser launches only distinct factions.
import { browserSetupV7 } from "../fixtures/v7-builders";
import {
  closeDetailsV7,
  openDockDetailsV7,
} from "../fixtures/v7-unit-card-dom";
import {
  cardModifiersV7,
  statSumTextV7,
  statusModifierSourcesV7,
} from "../../src/render/unit-card-presentation-v7";
import { HELP_SECTIONS_V7 } from "../../src/render/help-text-v7";
import {
  GROUND_MODIFIER_SOURCES_V7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";

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
    // Bead pulp_wars-2yc.84: the notices wait for the boundary's playback.
    await new Promise((resolve) => setTimeout(resolve, 0));
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
    await new Promise((resolve) => setTimeout(resolve, 0));
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
      "#v7-live .v7-economy-icon[data-asset-id='ui-hud-coin']",
    );
    expect(icon).not.toBeNull();
    expect(document.querySelector("#v7-live")?.textContent).toBe(
      "Treasury automatically granted · +12 Coins.",
    );
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 0, y: 0 } });
    expect(
      document.querySelector(
        "#v7-live .v7-economy-icon[data-asset-id='ui-hud-coin']",
      ),
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
        ".v7-coins .v7-economy-icon[data-asset-id='ui-hud-coin']",
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
    expect(document.querySelectorAll(".v7-tech-card")).toHaveLength(25);
    expect(document.querySelectorAll(".v7-tech-edge")).toHaveLength(20);
    expect(
      document.querySelectorAll('.v7-tech-card[data-branch-root="true"]'),
    ).toHaveLength(5);
    const graph = document.querySelector<HTMLElement>(
      ".v7-tech-graph[role='region']",
    );
    if (graph === null) throw new Error("Technology graph missing");
    // The radial tree (bead pulp_wars-2yc.58): the faction's emblem at the
    // hub, five tinted branch wedges and spokes, every badge on a ring.
    expect(Number(graph.dataset.techGraphWidth)).toBeCloseTo(705.97);
    expect(Number(graph.dataset.techGraphHeight)).toBeCloseTo(675.92);
    // No media query to ask (a phone, or here jsdom): the round tree.
    expect(graph.dataset.techGraphShape).toBe("compact");
    expect(
      graph.querySelectorAll(".v7-tech-centre .v7-faction-emblem"),
    ).toHaveLength(1);
    expect(graph.querySelectorAll(".v7-tech-wedge")).toHaveLength(5);
    expect(graph.querySelectorAll(".v7-tech-spoke")).toHaveLength(5);
    expect(
      [...graph.querySelectorAll<HTMLElement>(".v7-tech-node")].map(
        (node) => node.dataset.ring,
      ),
    ).toEqual(
      Array.from({ length: 5 }, () => ["1", "2", "3", "2", "3"]).flat(),
    );
    // At the start every branch root is available and free, the rest locked.
    expect(
      graph.querySelectorAll(
        '.v7-tech-card.state-available[data-free="true"] .v7-tech-cost[data-free="true"]',
      ),
    ).toHaveLength(5);
    expect(
      [...graph.querySelectorAll<SVGElement>(".v7-tech-spoke")].map(
        (spoke) => spoke.dataset.state,
      ),
    ).toEqual([
      "available",
      "available",
      "available",
      "available",
      "available",
    ]);
    expect(
      graph.querySelectorAll('.v7-tech-edge[data-state="locked"]').length +
        graph.querySelectorAll('.v7-tech-edge[data-state="disabled"]').length,
    ).toBe(20);
    // The art is the whole raster, fitted by CSS rather than a fixed box.
    for (const image of graph.querySelectorAll<HTMLElement>(
      ".v7-tech-art > img.v7-chibi-art",
    )) {
      expect(image.style.width).toBe("");
      expect(image.style.height).toBe("");
    }
    expect(requiredButton('[data-action="tech-fit"]').textContent).toBe("Fit");
    expect(requiredButton('[data-action="tech-zoom-in"]')).not.toBeNull();
    expect(requiredButton('[data-action="tech-zoom-out"]')).not.toBeNull();
    expect(
      new Set(
        [...document.querySelectorAll<HTMLElement>(".v7-tech-node")].map(
          (node) => node.dataset.techBranch,
        ),
      ).size,
    ).toBe(5);
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
    expect(
      document.querySelector(
        '.v7-leaderboard-row[data-viewer="true"] .v7-leaderboard-player',
      )?.textContent,
    ).toBe("You");
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

  it("shows each technology's state on its radial badge and docks the detail away from it", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    requiredInput("v7-seed").value = "3";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="tech"]').click();
    await flushMicrotasks();
    const gathering = requiredButton('[data-action="tech-gathering"]');
    expect(gathering.classList.contains("state-available")).toBe(true);
    expect(gathering.dataset.free).toBe("true");
    expect(gathering.querySelector(".v7-tech-name")?.textContent).toBe(
      "Gathering",
    );
    // The name, chip and badge sit on their node's side away from the hub.
    const node = gathering.closest<HTMLElement>(".v7-tech-node");
    expect(node?.dataset.labelSide).toBe("above");
    expect(node?.dataset.ring).toBe("1");

    gathering.click();
    await flushMicrotasks();
    const detail = document.querySelector<HTMLElement>(".v7-tech-detail");
    if (detail === null) throw new Error("Technology detail missing");
    expect(["top", "bottom", "left", "right"]).toContain(detail.dataset.dock);
    expect(
      document
        .querySelector('.v7-tech-card[data-selected="true"]')
        ?.getAttribute("data-action"),
    ).toBe("tech-gathering");
    requiredButton('[data-action="research-gathering"]').click();
    await waitUntil(
      () =>
        document
          .querySelector('[data-action="tech-gathering"]')
          ?.classList.contains("state-owned") === true,
    );
    const owned = requiredButton('[data-action="tech-gathering"]');
    expect(owned.querySelector(".v7-tech-check")).not.toBeNull();
    expect(owned.querySelector(".v7-tech-cost")).toBeNull();
    expect(owned.getAttribute("aria-label")).toContain("researched");
    expect(
      document.querySelector<SVGElement>(
        '.v7-tech-spoke[data-child-tech="GATHERING"]',
      )?.dataset.state,
    ).toBe("owned");
    // Its two children are now available; their lines light up.
    expect(
      [
        ...document.querySelectorAll<SVGElement>(
          '.v7-tech-edge[data-parent-tech="GATHERING"]',
        ),
      ].map((edge) => edge.dataset.state),
    ).toEqual(["available", "available"]);
    // The free first technology is spent: the other roots have a price,
    // and one the Coins do not cover is marked short.
    const hunting = requiredButton('[data-action="tech-hunting"]');
    expect(hunting.dataset.free).toBeUndefined();
    const coins = app.controller.snapshot().view?.viewer.coins ?? 0;
    const price = Number(hunting.querySelector(".v7-tech-cost")?.textContent);
    expect(price).toBeGreaterThan(0);
    expect(hunting.dataset.affordable).toBe(String(price <= coins));
    app.destroy();
  });

  it("keeps the compact technology camera through detail focus, Escape, and resize", async () => {
    let graphWidth = 320;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph")
          ? domRect(graphWidth, 470)
          : domRect(0, 0);
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph") ? graphWidth : 0;
      });
    const clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph") ? 470 : 0;
      });
    const app = bootstrapRuleset7App(document, { storage: null });
    requiredInput("v7-seed").value = "3";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="tech"]').click();
    await flushMicrotasks();
    const fitted = document.querySelector<HTMLElement>(".v7-tech-stage");
    if (fitted === null) throw new Error("Technology stage missing");
    // (320 - 2 x 6) / the radial tree's 705.97 width.
    expect(fitted.style.transform).toContain("scale(0.43627");
    expect(
      document.querySelector<HTMLElement>(".v7-tech-graph")?.dataset.zoom,
    ).toBe("1");

    requiredButton('[data-action="tech-zoom-in"]').click();
    const zoomedTransform = fitted.style.transform;
    expect(zoomedTransform).toContain("scale(0.53226");
    requiredButton('[data-action="tech-hunting"]').click();
    await flushMicrotasks();
    const detail = document.querySelector<HTMLElement>(".v7-tech-detail");
    if (detail === null) throw new Error("Technology detail missing");
    expect(detail.getAttribute("role")).toBe("dialog");
    // Bead pulp_wars-2yc.78: the detail floats over a live tree, so it is
    // not modal and the graph under it is not inert.
    expect(detail.hasAttribute("aria-modal")).toBe(false);
    expect(
      document.querySelector<HTMLElement>(".v7-tech-graph")?.inert,
    ).not.toBe(true);

    graphWidth = 300;
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await flushMicrotasks();
    expect(document.querySelector(".v7-tech-detail")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "tech-hunting",
    );
    const resized = document.querySelector<HTMLElement>(".v7-tech-stage");
    expect(resized?.dataset.zoom).toBe("1.22");
    expect(resized?.style.transform).not.toBe(zoomedTransform);
    requiredButton('[data-action="tech-fit"]').click();
    expect(
      document.querySelector<HTMLElement>(".v7-tech-graph")?.dataset.zoom,
    ).toBe("1");
    // Bead pulp_wars-2yc.72: the detail lives outside the zoomed stage and
    // graph, in screen space, and a pinch on the tree's shell zooms the
    // tree and not the detail.
    requiredButton('[data-action="tech-hunting"]').click();
    await flushMicrotasks();
    const reopened = document.querySelector<HTMLElement>(".v7-tech-detail");
    if (reopened === null) throw new Error("Technology detail missing");
    expect(reopened.closest(".v7-tech-stage, .v7-tech-graph")).toBeNull();
    const graphShell = reopened.closest<HTMLElement>(".v7-tech-graph-shell");
    if (graphShell === null) throw new Error("Technology graph shell missing");
    const zoomBefore = Number(
      document.querySelector<HTMLElement>(".v7-tech-graph")?.dataset.zoom,
    );
    const shellPointer = (
      type: string,
      pointerId: number,
      clientX: number,
    ): void => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        pointerType: { value: "touch" },
        button: { value: 0 },
        clientX: { value: clientX },
        clientY: { value: 100 },
      });
      graphShell.dispatchEvent(event);
    };
    shellPointer("pointerdown", 41, 100);
    shellPointer("pointerdown", 42, 200);
    shellPointer("pointermove", 42, 260);
    shellPointer("pointerup", 41, 100);
    shellPointer("pointerup", 42, 260);
    expect(
      Number(
        document.querySelector<HTMLElement>(".v7-tech-graph")?.dataset.zoom,
      ),
    ).toBeGreaterThan(zoomBefore);
    expect(reopened.isConnected).toBe(true);
    expect(reopened.style.transform).toBe("");
    rectSpy.mockRestore();
    clientWidthSpy.mockRestore();
    clientHeightSpy.mockRestore();
    app.destroy();
  });

  it("floats the technology detail over a still tree: another badge switches it, a drag or pinch keeps it, a tap outside or Escape closes it", async () => {
    // Bead pulp_wars-2yc.78.
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph")
          ? domRect(1200, 700)
          : domRect(0, 0);
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph") ? 1200 : 0;
      });
    const clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph") ? 700 : 0;
      });
    const app = bootstrapRuleset7App(document, { storage: null });
    requiredInput("v7-seed").value = "3";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    requiredButton('[data-action="tech"]').click();
    await flushMicrotasks();
    const stage = (): HTMLElement => {
      const found = document.querySelector<HTMLElement>(".v7-tech-stage");
      if (found === null) throw new Error("Technology stage missing");
      return found;
    };
    const graph = (): HTMLElement => {
      const found = document.querySelector<HTMLElement>(".v7-tech-graph");
      if (found === null) throw new Error("Technology graph missing");
      return found;
    };
    const detail = (): HTMLElement | null =>
      document.querySelector<HTMLElement>(".v7-tech-detail");
    const header = (): Element => {
      const found = document.querySelector(
        ".v7-tech-screen > .v7-screen-header",
      );
      if (found === null) throw new Error("Technology header missing");
      return found;
    };
    const pointer = (
      target: Element,
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ): void => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        pointerType: { value: "touch" },
        button: { value: 0 },
        clientX: { value: clientX },
        clientY: { value: clientY },
      });
      target.dispatchEvent(event);
    };
    const click = (target: Element): void => {
      target.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
      );
    };
    const tap = (target: Element, x: number, y: number): void => {
      pointer(target, "pointerdown", 1, x, y);
      pointer(target, "pointerup", 1, x, y);
      click(target);
    };
    const fitted = stage().style.transform;

    // Choosing a technology leaves the tree where it is.
    tap(requiredButton('[data-action="tech-hunting"]'), 600, 300);
    await flushMicrotasks();
    expect(detail()?.getAttribute("aria-label")).toBe("Hunting details");
    expect(stage().style.transform).toBe(fitted);
    expect(graph().inert).not.toBe(true);
    expect(
      document.querySelector<HTMLElement>(".v7-tech-graph-controls")?.inert,
    ).not.toBe(true);

    // Another badge switches the detail to it; the tree still does not move.
    tap(requiredButton('[data-action="tech-gathering"]'), 640, 260);
    await flushMicrotasks();
    expect(detail()?.getAttribute("aria-label")).toBe("Gathering details");
    expect(
      document
        .querySelector('.v7-tech-card[data-selected="true"]')
        ?.getAttribute("data-action"),
    ).toBe("tech-gathering");
    expect(stage().style.transform).toBe(fitted);

    // A drag on the tree pans it and keeps the detail.
    pointer(graph(), "pointerdown", 2, 100, 100);
    pointer(graph(), "pointermove", 2, 160, 130);
    pointer(graph(), "pointerup", 2, 160, 130);
    click(graph());
    await flushMicrotasks();
    expect(detail()).not.toBeNull();
    expect(stage().style.transform).not.toBe(fitted);

    // A drag that starts outside the tree (the header) is not a tap either.
    pointer(header(), "pointerdown", 3, 40, 20);
    pointer(header(), "pointermove", 3, 90, 60);
    pointer(header(), "pointerup", 3, 90, 60);
    click(header());
    await flushMicrotasks();
    expect(detail()).not.toBeNull();

    // A pinch zooms the tree and keeps the detail.
    const zoomBefore = Number(graph().dataset.zoom);
    pointer(graph(), "pointerdown", 4, 300, 300);
    pointer(graph(), "pointerdown", 5, 400, 300);
    pointer(graph(), "pointermove", 5, 460, 300);
    pointer(graph(), "pointerup", 4, 300, 300);
    pointer(graph(), "pointerup", 5, 460, 300);
    click(graph());
    await flushMicrotasks();
    expect(Number(graph().dataset.zoom)).toBeGreaterThan(zoomBefore);
    expect(detail()).not.toBeNull();

    // The zoom buttons work with the detail open and do not close it.
    const zoomed = Number(graph().dataset.zoom);
    requiredButton('[data-action="tech-zoom-out"]').click();
    expect(Number(graph().dataset.zoom)).toBeLessThan(zoomed);
    expect(detail()).not.toBeNull();

    // A tap inside the detail keeps it.
    const inside = detail()?.querySelector(".v7-identity");
    if (inside === null || inside === undefined)
      throw new Error("Technology detail identity missing");
    tap(inside, 900, 500);
    await flushMicrotasks();
    expect(detail()).not.toBeNull();

    // A tap on the bare tree closes it, and the tree stays where it was.
    const before = stage().style.transform;
    tap(graph(), 20, 20);
    await flushMicrotasks();
    expect(detail()).toBeNull();
    expect(stage().style.transform).toBe(before);

    // So does a tap on the header, and Escape; the screen stays open.
    tap(requiredButton('[data-action="tech-hunting"]'), 600, 300);
    await flushMicrotasks();
    expect(detail()).not.toBeNull();
    tap(header(), 40, 20);
    await flushMicrotasks();
    expect(detail()).toBeNull();
    expect(document.querySelector(".v7-overlay")).not.toBeNull();
    tap(requiredButton('[data-action="tech-hunting"]'), 600, 300);
    await flushMicrotasks();
    expect(detail()).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await flushMicrotasks();
    expect(detail()).toBeNull();
    expect(document.querySelector(".v7-overlay")).not.toBeNull();
    // The X still closes it.
    tap(requiredButton('[data-action="tech-hunting"]'), 600, 300);
    await flushMicrotasks();
    requiredButton('[data-action="close-tech-detail"]').click();
    await flushMicrotasks();
    expect(detail()).toBeNull();
    rectSpy.mockRestore();
    clientWidthSpy.mockRestore();
    clientHeightSpy.mockRestore();
    app.destroy();
  });

  it("gives a desktop the whole window and the wide tree with every name at Fit, and a turned screen its other shape", async () => {
    // Bead pulp_wars-2yc.66. The panel: the whole window less a thin
    // margin beyond a phone; a phone keeps its own full-screen rule.
    const css = readFileSync("src/styles/v7.css", "utf8");
    expect(TECHNOLOGY_WIDE_TREE_MEDIA_V7).toContain("(min-width: 600px)");
    const desktopPanel =
      /@media \(min-width: 600px\) \{\n {2}\.v7-overlay\[data-screen="tech"\] \{([\s\S]*?)\n {2}\}/.exec(
        css,
      )?.[1] ?? "";
    expect(desktopPanel).toMatch(/inset: max\(0\.5rem, env/);
    expect(desktopPanel).toMatch(/\n {4}width: auto;/);
    expect(desktopPanel).toMatch(/\n {4}height: auto;/);
    expect(desktopPanel).toMatch(/\n {4}max-height: none;/);
    expect(desktopPanel).toMatch(/\n {4}transform: none;/);
    expect(css).toMatch(
      /@media \(max-width: 599px\) \{[\s\S]*?\.v7-overlay\[data-screen="tech"\] \{\n {4}width: auto;\n {4}height: auto;\n {4}padding: 0\.75rem;\n {2}\}/,
    );
    // The old cap (52rem tall, 84rem wide) is gone from the desktop.
    expect(css).not.toContain("height: min(52rem, calc(100dvh - 1.5rem));");

    // A landscape window: the media query matches, and the graph is the
    // size Chrome measures in a 1440 x 900 window.
    let wide = true;
    const listeners: (() => void)[] = [];
    const matchMedia = vi.fn((query: string) => ({
      get matches() {
        return query === TECHNOLOGY_WIDE_TREE_MEDIA_V7 && wide;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => {
        if (query === TECHNOLOGY_WIDE_TREE_MEDIA_V7) listeners.push(listener);
      },
      removeEventListener: () => {},
    }));
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: matchMedia,
    });
    let graphWidth = 1388;
    let graphHeight = 805;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph")
          ? domRect(graphWidth, graphHeight)
          : domRect(0, 0);
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph") ? graphWidth : 0;
      });
    const clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("v7-tech-graph") ? graphHeight : 0;
      });
    try {
      const app = bootstrapRuleset7App(document, { storage: null });
      requiredInput("v7-seed").value = "3";
      chooseSeed();
      requiredButton('[data-action="launch"]').click();
      await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
      requiredButton('[data-action="tech"]').click();
      await flushMicrotasks();
      const graph = () => {
        const element = document.querySelector<HTMLElement>(".v7-tech-graph");
        if (element === null) throw new Error("Technology graph missing");
        return element;
      };
      const stage = () => {
        const element = document.querySelector<HTMLElement>(".v7-tech-stage");
        if (element === null) throw new Error("Technology stage missing");
        return element;
      };
      const outerSides = () =>
        [
          ...document.querySelectorAll<HTMLElement>(
            '.v7-tech-node[data-ring="3"]',
          ),
        ].map((node) => node.dataset.labelSide);
      expect(graph().dataset.techGraphShape).toBe("wide");
      expect(Number(graph().dataset.techGraphWidth)).toBeCloseTo(798.06);
      expect(Number(graph().dataset.techGraphHeight)).toBeCloseTo(675.92);
      // (805 - 2 x 6) / 675.92: the badges are 84 px across, and every
      // name and price shows at Fit.
      expect(stage().style.transform).toContain("scale(1.1732");
      expect(stage().dataset.labels).toBe("show");
      expect(graph().dataset.zoom).toBe("1");
      expect(new Set(outerSides())).toEqual(new Set(["left", "right"]));
      expect(document.querySelectorAll(".v7-tech-card")).toHaveLength(25);

      requiredButton('[data-action="tech-zoom-in"]').click();
      expect(graph().dataset.zoom).toBe("1.22");
      // Turned to portrait: the phone's round tree, the zoom kept, and the
      // names hidden again at the phone's smaller scale.
      wide = false;
      graphWidth = 354;
      graphHeight = 762;
      for (const listener of listeners) listener();
      await flushMicrotasks();
      expect(graph().dataset.techGraphShape).toBe("compact");
      expect(Number(graph().dataset.techGraphWidth)).toBeCloseTo(705.97);
      expect(graph().dataset.zoom).toBe("1.22");
      expect(stage().dataset.labels).toBe("hidden");
      expect(new Set(outerSides())).toEqual(new Set(["above", "below"]));
      app.destroy();
    } finally {
      rectSpy.mockRestore();
      clientWidthSpy.mockRestore();
      clientHeightSpy.mockRestore();
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  it("keeps settings route-scoped, exposes spoiler-safe export labels, and reports current save deletion", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    // A skirmish's match menu has no Retry mission (bead pulp_wars-hmyk.24).
    requiredButton('[data-action="compact-menu"]').click();
    expect(document.querySelector('[data-action="main-menu"]')).not.toBeNull();
    expect(
      document.querySelector('[data-action="menu-mission-retry"]'),
    ).toBeNull();
    openMenuItem("settings");
    expect(requiredButton('[data-action="restart"]').textContent).toBe(
      "Restart match",
    );
    // A skirmish has no Retry mission (bead pulp_wars-hmyk.24).
    expect(
      document.querySelector('[data-action="settings-mission-retry"]'),
    ).toBeNull();
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
    // pulp_wars-ykw.2: seed 3 opens with the human seat on village-density
    // maps (seed 4 did on revision-16 maps).
    requiredInput("v7-seed").value = "3";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const wait = app.controller
      .snapshot()
      .offeredCommands.find((command) => command.kind === "WAIT");
    if (wait === undefined) throw new Error("WAIT missing");
    expect((await app.controller.dispatch(wait)).accepted).toBe(true);
    const commandIndex = app.controller.snapshot().view?.commandIndex;
    // Help is the short "How to play" (bead pulp_wars-2yc.39).
    openMenuItem("help");
    expect(
      [...document.querySelectorAll(".v7-help h3")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(HELP_SECTIONS_V7.map((section) => section.title));
    expect(document.querySelector(".v7-help")?.textContent).not.toContain(
      "Shallow Water:",
    );
    requiredButton('[data-action="close-overlay"]').click();

    openMenuItem("main-menu");
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(document.querySelector(".v7-match-root")).toBeNull();
    expect(
      requiredButton('[data-action="resume"]').querySelector(
        ".v7-menu-button-label",
      )?.textContent,
    ).toBe("Continue");
    expect(app.controller.snapshot().view?.commandIndex).toBe(commandIndex);

    requiredButton('[data-action="resume"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    expect(app.controller.snapshot().view?.commandIndex).toBe(commandIndex);

    openMenuItem("main-menu");
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    requiredButton('[data-action="new-game"]').click();
    requiredInput("v7-seed").value = "2";
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    openMenuItem("main-menu");
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(
      requiredButton('[data-action="resume"]').querySelector(
        ".v7-menu-button-label",
      )?.textContent,
    ).toBe("Continue");
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
    // pulp_wars-ykw.2: a human-first seed on village-density maps (4 on
    // revision-16 maps).
    requiredInput("v7-seed").value = "3";
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
      "Each city linked by Road or Port to another of your cities: +1 Coin each turn",
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
      modal.querySelector<HTMLElement>(".v7-art-frame")?.dataset.chibiSubject,
    ).toBe("PORTRAIT:KNIGHT");
    expect(modal.textContent).toContain("HP13");
    expect(modal.textContent).toContain("Range1");
    // The unit glossary's lines (bead pulp_wars-2yc.39). Tuning 2 (7r47):
    // the Human Knight captures.
    expect(
      [...modal.querySelectorAll<HTMLElement>(".v7-unit-ability")].map(
        (line) => [
          line.dataset.glossary,
          line.querySelector("strong")?.textContent,
          line.querySelector("span")?.textContent,
        ],
      ),
    ).toEqual(
      roleGlossaryV7("KNIGHT", "ORIGINAL").map((entry) => [
        entry.id,
        entry.name,
        entry.text,
      ]),
    );
    expect(
      roleGlossaryV7("KNIGHT", "ORIGINAL").map((entry) => entry.id),
    ).toEqual(["OVERRUN"]);
    // The terms of the card are folded away until asked for.
    const terms = modal.querySelector<HTMLDetailsElement>(".v7-glossary-terms");
    expect(terms?.open).toBe(false);
    expect(terms?.querySelector("summary")?.textContent).toBe(
      "What the numbers mean",
    );
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

  it("says farms join into one field only where they are drawn joined: the Classic look (pulp_wars-2o7.5)", async () => {
    const line = "Neighboring farms join into one field";
    const farmingUnlocks = (): string[] => {
      if (document.querySelector('[data-action="tech-farming"]') === null)
        requiredButton('[data-action="tech"]').click();
      requiredButton('[data-action="tech-farming"]').click();
      return [...document.querySelectorAll(".v7-tech-unlocks > li")].map(
        (item) => item.textContent ?? "",
      );
    };
    const app = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: new CapturingBoardHost(),
    });
    chooseSeed();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    // The current look draws every Farm as a whole sprite of its own: the
    // card lists the Farm and its rule, and makes no claim about joining.
    const current = farmingUnlocks();
    expect(current.length).toBeGreaterThan(0);
    expect(current.join("\n")).toContain("Build farm");
    expect(current).not.toContain(line);
    expect(document.body.textContent).not.toContain(line);
    // The Classic look still pairs neighbouring Farms into one field.
    openMenuItem("settings");
    requiredInput("v7-classic-look").click();
    const classic = farmingUnlocks();
    expect(classic).toContain(line);
    expect(classic.filter((item) => item !== line)).toEqual(current);
    openMenuItem("settings");
    requiredInput("v7-classic-look").click();
    expect(farmingUnlocks()).toEqual(current);
    app.destroy();
    window.localStorage.clear();
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
    // A fresh player gets the new look: no plates (a neutral shadow, since
    // bead pulp_wars-w5j.3), pennants, calm chrome with the ground ready
    // ring, and the direction's own art, loaded with the rest of the art.
    expect(host.model?.visualDirection).toEqual(LIVE_DIRECTION_V7);
    expect(host.model?.visualDirection?.unit.base).toBe("SHADOW");
    expect(host.model?.visualDirection?.chrome).toEqual({
      hp: "DAMAGED",
      hpPlacement: "BASE",
      badge: "NONE",
      ready: "GROUND",
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
    // Seed 1: the human moves first on the many-seats board, so its city
    // action is ready (seed 1546 did on the earlier boards).
    const launched = await source.launch(browserSetupV7(1));
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
            achievement: "ENGINEER",
            at: monumentAt,
            builderFaction: "ORIGINAL",
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
                      // Bead pulp_wars-2yc.63: a term of the unit's own
                      // (a city's fortification is the city dock's now).
                      modifiers: [
                        {
                          value: { numerator: 1, denominator: 1 },
                          source: "DIG_IN" as const,
                          sourceLabel: "Dug in",
                          description:
                            "Dug in: a unit that has not moved, on or next to its own city center, adds 1 Defense.",
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
    // Bead pulp_wars-2yc.86: a ready city action is in the city's details.
    expect(document.querySelector('[data-stat="city-action"]')).toBeNull();
    expect(
      openDockDetailsV7().querySelector('[data-stat="city-action"]')
        ?.textContent,
    ).toContain("City actionReady");
    closeDetailsV7();
    expect(
      document
        .querySelector(".v7-city-stats .v7-population-value .v7-economy-icon")
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
        .querySelector(".v7-city-stats .v7-city-income .v7-economy-icon")
        ?.getAttribute("data-asset-id"),
    ).toBe("ui-hud-coin");
    const trainCost = document.querySelector<HTMLElement>(
      ".v7-train-action .v7-command-economy",
    );
    expect(trainCost?.textContent).toMatch(/^\d+$/);
    expect(
      trainCost
        ?.querySelector(".v7-economy-icon")
        ?.getAttribute("data-asset-id"),
    ).toBe("ui-hud-coin");
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
    // Bead pulp_wars-2yc.63: a term of the unit itself (the tile's cover,
    // Walls and Field Defense are shown on the tile's dock instead).
    const statsWithModifier = view.unitStats.find((stats) =>
      stats.stats.some((stat) =>
        stat.modifiers.some(
          (modifier) => !GROUND_MODIFIER_SOURCES_V7.includes(modifier.source),
        ),
      ),
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
    // Bead pulp_wars-2yc.86: the six stats are in the details.
    expect(
      document.querySelector(".v7-selection-dock .v7-unit-stats"),
    ).toBeNull();
    expect(
      document.querySelector(".v7-selection-dock > .v7-abilities"),
    ).toBeNull();
    expect(requiredButton('[data-action="unit-help"]').textContent).toBe("?");
    expect(
      document.querySelector(".v7-identity-art")?.getAttribute("data-art-set"),
    ).toBe("chibi");
    // The unit's own term has a status chip; a tap opens its popover with
    // the change and the stat's exact sum, and the chip keeps the focus.
    const modifiedStat = statsWithModifier.stats.find(
      (stat) => cardModifiersV7(stat).length > 0,
    );
    const sum = modifiedStat === undefined ? null : statSumTextV7(modifiedStat);
    if (modifiedStat === undefined || sum === null)
      throw new Error("Card term missing");
    const sources: readonly string[] = cardModifiersV7(modifiedStat).map(
      (term) => term.source,
    );
    const chip = [
      ...document.querySelectorAll<HTMLElement>(
        '.v7-unit-status-cues [role="button"]',
      ),
    ].find((candidate) =>
      statusModifierSourcesV7(candidate.dataset.unitStatus ?? "").some(
        (source) => sources.includes(source),
      ),
    );
    if (chip === undefined) throw new Error("Status chip missing");
    const status = chip.dataset.unitStatus ?? "";
    chip.focus();
    chip.click();
    await Promise.resolve();
    expect(
      document
        .querySelector(`.v7-unit-status-cues [data-unit-status="${status}"]`)
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
    expect(document.querySelector(".v7-status-popover")?.textContent).toContain(
      sum,
    );
    expect(
      (document.activeElement as HTMLElement | null)?.dataset.unitStatus,
    ).toBe(status);
    requiredButton('[data-action="unit-help"]').click();
    expect(
      document.querySelector('[data-v7-region="unit-help"][aria-modal="true"]'),
    ).not.toBeNull();
    // Bead pulp_wars-2yc.63: a plain Fighter has no line of its own (every
    // land unit captures), so its dialog is the card terms alone.
    expect(
      document.querySelector(".v7-unit-help-dialog .v7-glossary-terms"),
    ).not.toBeNull();
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
      build.querySelector('[data-chibi-subject*="MONUMENT"]'),
    ).not.toBeNull();
    build.click();
    build.click();
    await waitUntil(() => dispatch.mock.calls.length === 1);
    expect(dispatch).toHaveBeenCalledWith(monumentCommand);
    resolveDispatch({ accepted: false, reason: "NOT_OFFERED" });
    await Promise.resolve();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    app.destroy();
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

function domRect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    width,
    height,
    toJSON: () => ({}),
  };
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
