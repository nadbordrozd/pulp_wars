// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
} from "../../src/app/index";
import type {
  AchievementIdV7,
  MatchSetupV7,
  PlayerViewV7,
} from "../../src/engine/index";
import { ACHIEVEMENT_HELP_TIP_V7 } from "../../src/render/achievement-presentation-v7";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { setupV7 } from "../fixtures/v7-builders";

// Revision 21 (docs/product/RULESET_7_REVISION_21_ACHIEVEMENTS.md section 5):
// the Achievements screen, the completion notice, the Monument action, and
// the Help tip for Conqueror, Land Baron, Sea Dog, and Slayer.

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
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

interface Mounted {
  readonly source: Ruleset7BrowserController;
  readonly app: Ruleset7DomAppView;
  readonly host: CapturingBoardHost;
  readonly view: PlayerViewV7;
  readonly boundary: (value: Ruleset7AcceptedBoundary) => void;
}

async function mount(
  setup: MatchSetupV7,
  change: (
    snapshot: Ruleset7BrowserSnapshot,
    view: PlayerViewV7,
  ) => {
    readonly view: PlayerViewV7;
    readonly offeredCommands?: Ruleset7BrowserSnapshot["offeredCommands"];
  } = (_snapshot, view) => ({ view }),
): Promise<Mounted> {
  const source = new Ruleset7BrowserController();
  const launched = await source.launch(setup);
  if (!launched.ok) throw new Error(launched.diagnostic);
  const initial = source.snapshot();
  if (initial.view === null) throw new Error("public view missing");
  const changed = change(initial, initial.view);
  const snapshot: Ruleset7BrowserSnapshot = {
    ...initial,
    view: changed.view,
    offeredCommands: changed.offeredCommands ?? initial.offeredCommands,
  };
  let boundary: (value: Ruleset7AcceptedBoundary) => void = () => {};
  const port: Ruleset7ControllerPortV7 = {
    snapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
    subscribeAcceptedBoundary: (listener) => {
      boundary = listener;
      return () => {};
    },
    launch: source.launch.bind(source),
    resume: source.resume.bind(source),
    returnToMenu: source.returnToMenu.bind(source),
    dispatch: source.dispatch.bind(source),
    progressAiTurns: source.progressAiTurns.bind(source),
    restart: source.restart.bind(source),
    deleteStoredSave: source.deleteStoredSave.bind(source),
    setFastForward: source.setFastForward.bind(source),
    exportSafeLog: source.exportSafeLog.bind(source),
    exportDebugBundle: source.exportDebugBundle.bind(source),
  };
  const host = new CapturingBoardHost();
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  const app = new Ruleset7DomAppView(document, root, port, {
    boardHost: host,
    settingsStorage: null,
  });
  return {
    source,
    app,
    host,
    view: changed.view,
    boundary: (value) => boundary(value),
  };
}

function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function openMenuItem(action: string): void {
  if (document.querySelector(`[data-action="${action}"]`) === null)
    requiredButton('[data-action="compact-menu"]').click();
  requiredButton(`[data-action="${action}"]`).click();
}

function card(achievement: AchievementIdV7): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    `.v7-achievement[data-achievement="${achievement}"]`,
  );
  if (node === null) throw new Error(`Missing ${achievement} card`);
  return node;
}

function cardFacts(achievement: AchievementIdV7): {
  readonly state: string | undefined;
  readonly name: string | null | undefined;
  readonly goal: string | null | undefined;
  readonly status: string | null | undefined;
  readonly now: string | null | undefined;
  readonly max: string | null | undefined;
  readonly width: string | undefined;
} {
  const node = card(achievement);
  const meter = node.querySelector(".v7-achievement-meter");
  return {
    state: node.dataset.state,
    name: node.querySelector("h3")?.textContent,
    goal: node.querySelector(".v7-achievement-goal")?.textContent,
    status: node.querySelector(".v7-achievement-status")?.textContent,
    now: meter?.getAttribute("aria-valuenow"),
    max: meter?.getAttribute("aria-valuemax"),
    width: node.querySelector<HTMLElement>(".v7-achievement-fill")?.style.width,
  };
}

const pangea = (seed: number): MatchSetupV7 => ({
  ...setupV7(seed),
  mapType: "PANGEA",
});

describe("Ruleset 7 revision-21 achievements UI", () => {
  it("lists seven achievements with progress on a naval map", async () => {
    const { app, source } = await mount(pangea(2101));
    openMenuItem("achievements");
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-achievement")].map(
        (node) => node.dataset.achievement,
      ),
    ).toEqual([
      "EXPLORER",
      "ENGINEER",
      "MUSTER",
      "CONQUEROR",
      "LAND_BARON",
      "SEA_DOG",
      "SLAYER",
    ]);
    expect(document.querySelectorAll(".v7-achievement-meter")).toHaveLength(7);
    expect(
      document.querySelector(".v7-info-screen .v7-screen-lede")?.textContent,
    ).toBe(
      "Each achievement earns a free Monument: +3 population, one per city.",
    );
    // The revision-5 achievements still wait for their technology.
    expect(cardFacts("EXPLORER")).toMatchObject({
      state: "locked",
      name: "Explorer",
      status: "Needs Scouting",
    });
    expect(cardFacts("MUSTER")).toMatchObject({
      state: "locked",
      status: "Needs Drill",
    });
    // The revision-21 achievements need no technology.
    expect(cardFacts("CONQUEROR")).toEqual({
      state: "available",
      name: "Conqueror",
      goal: "Capture an enemy city.",
      status: "0 / 1",
      now: "0",
      max: "1",
      width: "0%",
    });
    expect(cardFacts("LAND_BARON")).toEqual({
      state: "available",
      name: "Land Baron",
      goal: "Own 5 cities at once.",
      status: "1 / 5",
      now: "1",
      max: "5",
      width: "20%",
    });
    expect(cardFacts("SEA_DOG")).toEqual({
      state: "available",
      name: "Sea Dog",
      goal: "Own 3 warships at once.",
      status: "0 / 3",
      now: "0",
      max: "3",
      width: "0%",
    });
    expect(cardFacts("SLAYER")).toEqual({
      state: "available",
      name: "Slayer",
      goal: "Get 5 kills with one unit.",
      status: "0 / 5",
      now: "0",
      max: "5",
      width: "0%",
    });
    for (const achievement of ["CONQUEROR", "SLAYER"] as const)
      expect(
        card(achievement).querySelector(
          '[data-symbol-id="ui-status-achievement-entitlement-locked"]',
        ),
      ).not.toBeNull();
    app.destroy();
    source.destroy();
  });

  it("omits Sea Dog on a Dry Land map", async () => {
    const { app, source } = await mount(setupV7(2102));
    openMenuItem("achievements");
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-achievement")].map(
        (node) => node.dataset.achievement,
      ),
    ).toEqual([
      "EXPLORER",
      "ENGINEER",
      "MUSTER",
      "CONQUEROR",
      "LAND_BARON",
      "SLAYER",
    ]);
    expect(document.body.textContent).not.toContain("Sea Dog");
    app.destroy();
    source.destroy();
  });

  it("shows partial, complete, and spent states", async () => {
    const { app, source } = await mount(pangea(2103), (_snapshot, view) => ({
      view: {
        ...view,
        viewer: {
          ...view.viewer,
          achievementEntitlements: view.viewer.achievementEntitlements.map(
            (entitlement) =>
              entitlement.achievement === "CONQUEROR"
                ? { ...entitlement, unlocked: true }
                : entitlement.achievement === "SLAYER"
                  ? { ...entitlement, unlocked: true, spent: true }
                  : entitlement,
          ),
        },
        achievementProgress: view.achievementProgress.map((entry) =>
          entry.achievement === "CONQUEROR"
            ? { ...entry, current: 1 }
            : entry.achievement === "LAND_BARON"
              ? { ...entry, current: 3 }
              : entry.achievement === "SLAYER"
                ? { ...entry, current: 7 }
                : entry,
        ),
      },
    }));
    openMenuItem("achievements");
    expect(cardFacts("CONQUEROR")).toMatchObject({
      state: "complete",
      status: "Done! Build your monument.",
      now: "1",
      width: "100%",
    });
    expect(
      card("CONQUEROR").querySelector(
        '[data-symbol-id="ui-status-achievement-entitlement-unlocked"]',
      ),
    ).not.toBeNull();
    expect(cardFacts("LAND_BARON")).toMatchObject({
      state: "available",
      status: "3 / 5",
      now: "3",
      max: "5",
      width: "60%",
    });
    // A count above the requirement is clamped in the meter.
    expect(cardFacts("SLAYER")).toMatchObject({
      state: "spent",
      status: "Monument built",
      now: "5",
      max: "5",
      width: "100%",
    });
    expect(
      card("SLAYER").querySelector(
        '[data-symbol-id="ui-status-achievement-entitlement-spent"]',
      ),
    ).not.toBeNull();
    app.destroy();
    source.destroy();
  });

  it("queues a completion notice per new achievement with its display name", async () => {
    const { app, source, view, boundary, host } = await mount(pangea(2104));
    boundary({
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
            achievement: "CONQUEROR",
          },
          {
            kind: "ACHIEVEMENT_UNLOCKED",
            playerId: view.viewer.id,
            achievement: "LAND_BARON",
          },
        ],
      },
    });
    const notice = () =>
      document.querySelector<HTMLElement>(
        '[data-v7-region="achievement-notice"]',
      );
    expect(notice()?.getAttribute("aria-label")).toBe(
      "Conqueror achievement complete",
    );
    expect(notice()?.querySelector("h2")?.textContent).toBe(
      "Conqueror achievement complete",
    );
    expect(notice()?.textContent).toContain(
      "You can now build a monument on one of your tiles.",
    );
    expect(host.model?.interactive).toBe(false);
    requiredButton('[data-action="dismiss-achievement"]').click();
    expect(notice()?.querySelector("h2")?.textContent).toBe(
      "Land Baron achievement complete",
    );
    requiredButton('[data-action="dismiss-achievement"]').click();
    expect(notice()).toBeNull();
    for (const achievement of ["SEA_DOG", "SLAYER"] as const) {
      boundary({
        actor: "HUMAN",
        beforeView: view,
        afterView: view,
        playerEvents: {
          format: "pulp-wars-player-events",
          version: 7,
          viewerId: view.viewer.id,
          commandIndex: view.commandIndex + 2,
          events: [
            {
              kind: "ACHIEVEMENT_UNLOCKED",
              playerId: view.viewer.id,
              achievement,
            },
          ],
        },
      });
      expect(notice()?.querySelector("h2")?.textContent).toBe(
        achievement === "SEA_DOG"
          ? "Sea Dog achievement complete"
          : "Slayer achievement complete",
      );
      requiredButton('[data-action="dismiss-achievement"]').click();
    }
    expect(notice()).toBeNull();
    app.destroy();
    source.destroy();
  });

  it("offers the Monument of a new achievement on an owned tile", async () => {
    let at = { x: 0, y: 0 };
    const { app, source, host } = await mount(
      pangea(2105),
      (snapshot, view) => {
        const city = view.cities.find(
          (candidate) => candidate.ownerId === view.viewer.id,
        );
        if (city === undefined) throw new Error("city missing");
        at = { x: city.at.x + 1, y: city.at.y };
        return {
          view: {
            ...view,
            viewer: {
              ...view.viewer,
              achievementEntitlements: view.viewer.achievementEntitlements.map(
                (entitlement) =>
                  entitlement.achievement === "LAND_BARON"
                    ? { ...entitlement, unlocked: true }
                    : entitlement,
              ),
            },
          },
          offeredCommands: [
            ...snapshot.offeredCommands,
            { kind: "BUILD_MONUMENT", achievement: "LAND_BARON", at },
          ],
        };
      },
    );
    host.callbacks?.onSelection({ kind: "TILE", at });
    const build = requiredButton(
      '[data-action="command-build_monument-land_baron"]',
    );
    expect(build.textContent).toContain("Monument");
    expect(build.getAttribute("aria-label")).toBe(
      "Monument · free · population +3",
    );
    expect(
      build.querySelector('[data-asset-id="building-square-monument"]'),
    ).not.toBeNull();
    app.destroy();
    source.destroy();
  });

  it("explains achievements in Help", async () => {
    const { app, source } = await mount(pangea(2106));
    openMenuItem("help");
    expect(
      [...document.querySelectorAll(".v7-help-tips li")].map(
        (node) => node.textContent,
      ),
    ).toContain(ACHIEVEMENT_HELP_TIP_V7);
    app.destroy();
    source.destroy();
  });
});
