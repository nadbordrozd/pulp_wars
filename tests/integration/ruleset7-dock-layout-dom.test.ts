// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
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
  AFFLICTION_SHOWCASE_V7,
  UNDEAD_SHOWCASE_V7,
  afflictionHumanFixtureV7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-3gf: the selection dock is a wide bottom bar. Its children
 * stay portrait, compact stat column, action area, close (so keyboard and
 * screen-reader order is unchanged), and the stylesheet gives the action
 * area the remaining width.
 */

const CSS = readFileSync("src/styles/v7.css", "utf8");

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Ruleset 7 selection dock layout", () => {
  it("lays a city out as portrait, stat column, one action area, then close", () => {
    // Free the capital's unit capacity so it offers every Train command.
    const state = withoutHomeCities(afflictionHumanFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(state, host);
    const capital = requiredValue(
      viewForV7(state, state.humanPlayerId).cities.find(
        (city) => city.ownerId === state.humanPlayerId && city.isCapital,
      ),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.getAttribute("aria-label")).toBe("Selected map object");
    expect(dock.dataset.selectionKind).toBe("city");
    expect(dock.dataset.hasActions).toBe("true");
    expect(regions(dock)).toEqual([
      "v7-identity",
      "v7-city-stats",
      "v7-context-actions",
      "close-button",
    ]);
    const stats = requiredElement<HTMLElement>(".v7-city-stats");
    expect(stats.tagName).toBe("DL");
    expect(
      [...stats.children].map((child) => child.getAttribute("data-stat")),
    ).toEqual(["level", "population", "units", "income", "city-action"]);
    const actions = requiredElement<HTMLElement>(
      ".v7-selection-dock > .v7-context-actions",
    );
    const trains = [...actions.querySelectorAll(".v7-train-action")];
    expect(trains.length).toBeGreaterThanOrEqual(7);
    expect(actions.querySelectorAll(":scope > .v7-train-card")).toHaveLength(
      trains.length,
    );
    for (const train of trains)
      expect(train.getAttribute("aria-label")).toMatch(
        /^Train [A-Z][a-z]+ for \d+ Coins$/,
      );
    // Keyboard order: each Train button, then its ?, and Close last.
    const order = [...dock.querySelectorAll("button")].map(
      (button) => button.dataset.action ?? "",
    );
    expect(order.at(-1)).toBe("close-dock");
    expect(order[0]).toBe("command-train");
    expect(order[1]).toMatch(/^train-help-/);
    app.destroy();
  });

  it("keeps unit stats in a compact column and all actions in the action area", () => {
    const humanState = afflictionHumanFixtureV7();
    const humanHost = new RecordingBoardHost();
    const humanApp = mount(humanState, humanHost);
    selectUnitAt(humanState, humanHost, AFFLICTION_SHOWCASE_V7.human.captain);
    let dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.dataset.selectionKind).toBe("unit");
    expect(dock.dataset.hasActions).toBe("true");
    expect(regions(dock)).toEqual([
      "v7-identity",
      "v7-unit-stats",
      "v7-context-actions",
      "close-button",
    ]);
    expect(dock.querySelectorAll(".v7-unit-stats > .v7-stat")).toHaveLength(6);
    expect(
      dock.querySelector(
        '.v7-context-actions [data-action="command-tend_wounded"] .v7-undead-preview-chip',
      ),
    ).not.toBeNull();

    // Plague and Bitten chips stay with the portrait, not in the action area.
    selectUnitAt(
      humanState,
      humanHost,
      AFFLICTION_SHOWCASE_V7.human.doublyAfflicted,
    );
    dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(
      [...dock.querySelectorAll(".v7-identity .v7-affliction-chip")].map(
        (chip) => chip.getAttribute("data-unit-status"),
      ),
    ).toEqual(["plague", "bitten"]);
    expect(
      dock
        .querySelector('.v7-context-actions [data-action="affliction-disband"]')
        ?.getAttribute("aria-disabled"),
    ).toBe("true");

    // An enemy unit has nothing to do: its dock stays information-only.
    selectUnitAt(humanState, humanHost, AFFLICTION_SHOWCASE_V7.human.zombie);
    dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.dataset.hasActions).toBe("false");
    expect(dock.querySelector(".v7-context-actions")).toBeNull();
    humanApp.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const undeadState = undeadShowcaseFixtureV7();
    const undeadHost = new RecordingBoardHost();
    const undeadApp = mount(undeadState, undeadHost);
    selectUnitAt(undeadState, undeadHost, UNDEAD_SHOWCASE_V7.necromancer);
    dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(regions(dock)).toEqual([
      "v7-identity",
      "v7-unit-stats",
      "v7-context-actions",
      "close-button",
    ]);
    expect(
      dock.querySelector('.v7-identity [data-unit-status="restless"]'),
    ).not.toBeNull();
    expect(
      [...dock.querySelectorAll(".v7-context-actions .v7-action-label")].map(
        (label) => label.textContent,
      ),
    ).toEqual(["Frenzy", "Raise Dead", "Disband", "Wait"]);
    selectUnitAt(undeadState, undeadHost, UNDEAD_SHOWCASE_V7.banshee);
    expect(
      document.querySelector(
        '.v7-context-actions [data-action="command-wail"] .v7-undead-preview-chip',
      )?.textContent,
    ).toBe("2 hit · 1 ✕");
    undeadApp.destroy();
  });

  it("widens a dock with actions into a capped bottom bar", () => {
    const dockRule = rule(".v7-selection-dock");
    expect(dockRule).toMatch(/\n {2}width: fit-content;/);
    expect(dockRule).toMatch(
      /\n {2}max-width: min\(calc\(100% - 1\.2rem\), 90rem\);/,
    );
    expect(rule('.v7-selection-dock[data-has-actions="true"]')).toMatch(
      /\n {2}width: 100%;/,
    );
  });

  it("stacks unit and city stats into a two-column stat column", () => {
    expect(rule(".v7-unit-stats")).toMatch(
      /\n {2}grid-template-columns: repeat\(2, max-content\);/,
    );
    const city = rule(".v7-city-stats");
    expect(city).toMatch(/\n {2}display: grid;/);
    expect(city).toMatch(
      /\n {2}grid-template-columns: repeat\(2, max-content\);/,
    );
    expect(city).not.toMatch(/max-width/);
    expect(CSS).toMatch(
      /\.v7-city-stats > \[data-stat="city-action"\],\n\.v7-city-stats > \[data-stat="siege"\],\n\.v7-city-stats > \[data-discount\] \{\n {2}grid-column: 1 \/ -1;\n\}/,
    );
  });

  it("wraps the action area instead of scrolling it sideways", () => {
    const actions = rule(".v7-context-actions");
    expect(actions).toMatch(/\n {2}flex-wrap: wrap;/);
    expect(actions).not.toMatch(/overflow-x/);
    expect(actions).not.toMatch(/touch-action/);
    // A long label or Undead preview widens its tile rather than spilling.
    expect(rule(".v7-context-action")).toMatch(/\n {2}max-width: 7\.5rem;/);
    expect(CSS).toMatch(
      /\.v7-context-action > \.v7-undead-preview-chip \{[^}]*white-space: normal;/,
    );
  });

  it("gives phones an equal-column action grid under the portrait and stats", () => {
    const phone = /@media \(max-width: 800px\) \{([\s\S]*?)\n\}/.exec(CSS)?.[1];
    expect(phone).toBeDefined();
    expect(phone).toMatch(
      /\.v7-selection-dock > \.v7-context-actions \{\n {4}display: grid;\n {4}grid-template-columns: repeat\(auto-fill, minmax\(4\.9rem, 1fr\)\);/,
    );
    expect(phone).toMatch(/margin-right: -2\.8rem;/);
    expect(phone).toMatch(
      /\.v7-city-stats \{\n {4}display: flex;\n {4}flex-wrap: wrap;/,
    );
    // The stacked unit dock keeps its height, so the start camera reserve
    // is unchanged.
    expect(phone).toMatch(/\.v7-board-host \{\s*scroll-padding-bottom: 16rem;/);
  });
});

/** The body of the first top-level rule with exactly this selector. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\n${escaped} \\{([\\s\\S]*?)\\n\\}`).exec(CSS);
  if (match?.[1] === undefined) throw new Error(`${selector} rule missing`);
  return match[1];
}

const REGION_CLASSES = [
  "v7-identity",
  "v7-unit-stats",
  "v7-city-stats",
  "v7-selection-summary",
  "v7-context-actions",
  "close-button",
] as const;

function regions(dock: HTMLElement): string[] {
  return [...dock.children].map(
    (child) =>
      REGION_CLASSES.find((name) => child.classList.contains(name)) ??
      child.className,
  );
}

function withoutHomeCities(state: GameStateV7): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit) => ({ ...unit, homeCityId: null })),
  };
}

class StaticController implements Ruleset7ControllerPortV7 {
  readonly #snapshot: Ruleset7BrowserSnapshot;
  constructor(state: GameStateV7) {
    const view = viewForV7(state, state.humanPlayerId);
    this.#snapshot = {
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
    subscriber(this.#snapshot);
    return () => undefined;
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
    diagnostic: "Static fixture",
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

function mount(state: GameStateV7, host: BoardHostV7): Ruleset7DomAppView {
  return new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    new StaticController(state),
    { boardHost: host, settingsStorage: null },
  );
}

function selectUnitAt(
  state: GameStateV7,
  host: RecordingBoardHost,
  at: CoordV7,
): void {
  const unit = requiredValue(
    viewForV7(state, state.humanPlayerId).units.find(
      (item) => item.at.x === at.x && item.at.y === at.y,
    ),
  );
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
}

function requiredElement<T extends Element>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (result === null) throw new Error(`${selector} missing`);
  return result;
}

function requiredValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required dock fixture value missing");
  return value;
}
