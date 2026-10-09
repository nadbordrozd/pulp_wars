// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
  Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  ROUND2_UI_V7,
  round2GateBlockedUiFixtureV7,
  round2GraveyardUiFixtureV7,
  round2SaucerUiFixtureV7,
} from "../fixtures/v7-curiosities-round2-ui";

/**
 * Map curiosities round 2 in the DOM (bead pulp_wars-737.16,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 34.1), on hand-built
 * boards with one camp and the gates (no turn is ever ended, no AI runs):
 * a guard's and Bigfoot's dock (Neutral, Provoked or Alert, its stats, no
 * faction or owner) and "?" dialog, each new tile's dock, the Toss a Coin
 * command and its toast, a gate traversal with its displacement, and a
 * blocked gate, in the LEGACY art set and the live look; the board plan the
 * view hands to the board carries the camp threat and the gate preview.
 */
const AT = ROUND2_UI_V7;
const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function mount(initial: GameStateV7, artSet: "LEGACY" | "CHIBI" = "LEGACY") {
  let state = initial;
  const subscribers = new Set<(snapshot: Ruleset7BrowserSnapshot) => void>();
  const boundaries = new Set<(boundary: Ruleset7AcceptedBoundary) => void>();
  const snapshot = (): Ruleset7BrowserSnapshot => {
    const view = viewForV7(state, state.humanPlayerId);
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
  };
  const controller: Ruleset7ControllerPortV7 = {
    snapshot,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      subscriber(snapshot());
      return () => subscribers.delete(subscriber);
    },
    subscribeAcceptedBoundary(subscriber) {
      boundaries.add(subscriber);
      return () => boundaries.delete(subscriber);
    },
    async dispatch(command: CommandV7): Promise<Ruleset7DispatchResult> {
      const before = state;
      const beforeView = viewForV7(before, before.humanPlayerId);
      const applied = applyCommandV7(before, before.humanPlayerId, command);
      if (!applied.accepted)
        return {
          accepted: false,
          reason: "ENGINE_REJECTED",
          error: applied.error,
        };
      state = applied.state;
      const afterView = viewForV7(state, state.humanPlayerId);
      const playerEvents = projectEventsV7(
        before,
        state,
        state.humanPlayerId,
        applied.events,
      );
      for (const subscriber of boundaries)
        subscriber({ actor: "HUMAN", beforeView, afterView, playerEvents });
      const next = snapshot();
      for (const subscriber of subscribers) subscriber(next);
      return { accepted: true, beforeView, afterView, playerEvents };
    },
    async launch() {
      throw new Error("fixture launch unavailable");
    },
    async resume() {
      return true;
    },
    async returnToMenu() {
      return false;
    },
    async progressAiTurns() {
      return {
        ok: false,
        cancelled: true,
        acceptedCommands: 0,
        diagnostic: "fixture",
      };
    },
    async restart() {
      return {
        ok: false,
        code: "CONTROLLER_DESTROYED",
        diagnostic: "fixture",
      };
    },
    async deleteStoredSave() {
      return false;
    },
    setFastForward() {},
    exportSafeLog() {
      return null;
    },
    exportDebugBundle() {
      return { ok: false, reason: "NO_ACTIVE_MATCH" };
    },
  };
  let callbacks: BoardHostCallbacksV7 | null = null;
  let model: BoardHostModelV7 | null = null;
  const boardHost: BoardHostV7 = {
    mount(container, next) {
      callbacks = next;
      container.append(document.createElement("canvas"));
    },
    update(next) {
      model = next;
    },
    activate() {},
    zoom() {},
    focus() {},
    destroy() {},
  };
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("no root");
  const view = new Ruleset7DomAppView(document, root, controller, {
    boardHost,
    settingsStorage: null,
    artSet,
  });
  const select = (at: CoordV7, tile = false): void => {
    const unit = tile
      ? undefined
      : viewForV7(state, state.humanPlayerId).units.find(
          (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
        );
    callbacks?.onSelection(
      unit === undefined
        ? { kind: "TILE", at }
        : { kind: "UNIT", unitId: unit.id },
    );
  };
  return {
    view,
    controller,
    select,
    state: () => state,
    model: () => {
      if (model === null) throw new Error("no board model");
      return model;
    },
    dock: () => document.querySelector<HTMLElement>(".v7-selection-dock"),
    destroy: () => view.destroy(),
  };
}

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 8; turn += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

function unitAt(state: GameStateV7, at: CoordV7) {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("no unit there");
  return unit;
}

const chips = (dock: HTMLElement | null): readonly (string | null)[] =>
  [...(dock?.querySelectorAll("[data-unit-status]") ?? [])].map(
    (chip) => chip.textContent,
  );

describe("Ruleset 7 curiosities round two: a camp and Bigfoot in the dock", () => {
  for (const artSet of ["LEGACY", "CHIBI"] as const) {
    it(`${artSet}: shows a saucer guard as Neutral and Provoked, with no faction or owner`, () => {
      const app = mount(round2SaucerUiFixtureV7(), artSet);
      app.select(AT.guards[0]);
      const dock = app.dock();
      if (dock === null) throw new Error("no dock");
      expect(dock.querySelector("h2")?.textContent).toBe("Grunt");
      expect(chips(dock)).toEqual(
        expect.arrayContaining(["Neutral", "Provoked"]),
      );
      expect(dock.querySelector(".v7-faction-chip")).toBeNull();
      expect(dock.querySelector(".v7-identity-owner")).toBeNull();
      expect(dock.querySelector('[data-stat="hp"]')?.textContent).toContain(
        "10/10",
      );
      expect(dock.dataset.hasActions).toBe("false");
      dock
        .querySelector<HTMLButtonElement>('[data-action="unit-help"]')
        ?.click();
      const dialog = document.querySelector('[data-v7-region="unit-help"]');
      expect(
        [...(dialog?.querySelectorAll(".v7-unit-ability") ?? [])].map(
          (line) => (line as HTMLElement).dataset.glossary,
        ),
      ).toEqual(["neutral", "bounty", "provoked"]);
      expect(dialog?.textContent).toContain("crashed saucer");
      expect(dialog?.textContent).toContain(
        "Will attack your Fighter after this round.",
      );
      expect(COORDINATE.test(dialog?.textContent ?? "")).toBe(false);
      app.destroy();
    });

    it(`${artSet}: shows Bigfoot as Neutral and Alert, with its figure`, () => {
      const app = mount(round2SaucerUiFixtureV7(), artSet);
      app.select(AT.bigfoot);
      const dock = app.dock();
      expect(dock?.querySelector("h2")?.textContent).toBe("Bigfoot");
      expect(chips(dock)).toEqual(expect.arrayContaining(["Neutral", "Alert"]));
      expect(chips(dock)).not.toContain("Provoked");
      expect(dock?.querySelector(".v7-faction-chip")).toBeNull();
      const figure = dock?.querySelector(".v7-identity-art > *");
      if (artSet === "LEGACY")
        expect(figure?.getAttribute("data-asset-id")).toBe(
          "unit-neutral-bigfoot-code",
        );
      app.destroy();
    });
  }

  it("shows a Zombie of the Graveyard", () => {
    const app = mount(round2GraveyardUiFixtureV7());
    app.select(AT.guards[0]);
    const dock = app.dock();
    expect(dock?.querySelector("h2")?.textContent).toBe("Zombie");
    expect(chips(dock)).toEqual(
      expect.arrayContaining(["Neutral", "Provoked"]),
    );
    expect(dock?.querySelector('[data-stat="hp"]')?.textContent).toContain(
      "18/18",
    );
    app.destroy();
  });

  it("names each new curiosity tile, with its sentence and icon", () => {
    for (const [fixture, at, kind, name] of [
      [round2SaucerUiFixtureV7, AT.camp, "downed_saucer", "Downed Saucer"],
      [round2GraveyardUiFixtureV7, AT.camp, "graveyard", "Graveyard"],
      [round2SaucerUiFixtureV7, AT.gateA, "gate", "Dimensional Gate"],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const app = mount(fixture());
      app.select(at, true);
      const info = app.dock()?.querySelector<HTMLElement>(".v7-curiosity-info");
      expect(info?.dataset.curiosity, name).toBe(kind);
      expect(info?.querySelector("strong")?.textContent).toBe(name);
      expect(info?.querySelector("p")?.textContent?.endsWith(".")).toBe(true);
      expect(info?.querySelector(".v7-curiosity-icon")).not.toBeNull();
      expect(COORDINATE.test(info?.textContent ?? "")).toBe(false);
      app.destroy();
    }
  });

  it("hands the board a selected camp's threat and the gate preview", () => {
    const app = mount(round2SaucerUiFixtureV7());
    app.select(AT.guards[0]);
    let model = app.model();
    let plan = buildBoardRenderPlanV7(
      model.view,
      model.offeredCommands,
      model.interaction,
    );
    const styles = new Set(
      plan.entries.flatMap((entry) =>
        entry.kind === "ABILITY_AREA" && entry.abilityStyle !== undefined
          ? [entry.abilityStyle]
          : [],
      ),
    );
    expect([...styles].sort()).toEqual([
      "CAMP_PERIMETER",
      "MONSTER_AREA",
      "MONSTER_REACH",
    ]);
    app.select(AT.traveller);
    model = app.model();
    plan = buildBoardRenderPlanV7(
      model.view,
      model.offeredCommands,
      model.interaction,
    );
    expect(
      plan.targets.find((target) => target.gate !== undefined)?.gate,
    ).toEqual({
      exit: AT.gateB,
      displaceTo: AT.shoved,
      displaces: true,
      blocked: false,
    });
    app.destroy();
  });
});

describe("Ruleset 7 curiosities round two: the Well and the gates", () => {
  for (const artSet of ["LEGACY", "CHIBI"] as const)
    it(`${artSet}: tosses a Coin from the dock and toasts the outcome`, async () => {
      const app = mount(round2SaucerUiFixtureV7(), artSet);
      app.select(AT.pilgrim);
      const toss = app
        .dock()
        ?.querySelector<HTMLButtonElement>('[data-action="command-toss_coin"]');
      if (toss === null || toss === undefined) throw new Error("no toss");
      expect(toss.textContent).toContain("Toss a Coin");
      expect(toss.title).toContain("Once per match");
      // Its icon: the Well's raster in the live look, its glyph in LEGACY.
      expect(
        toss.querySelector(
          artSet === "LEGACY"
            ? '[data-asset-id="curiosity-wishing_well-code"]'
            : "img",
        ),
      ).not.toBeNull();
      toss.click();
      await settle();
      const text = document.body.textContent ?? "";
      expect(text).toContain("Wishing Well:");
      expect(
        app
          .state()
          .curiosities.find((curiosity) => curiosity.kind === "WISHING_WELL"),
      ).toMatchObject({ tossedBy: [app.state().humanPlayerId] });
      // No second toss is offered.
      app.select(AT.pilgrim);
      expect(
        app.dock()?.querySelector('[data-action="command-toss_coin"]'),
      ).toBeNull();
      app.select(AT.well, true);
      expect(app.dock()?.querySelector("[data-well-status]")?.textContent).toBe(
        "You have tossed your Coin.",
      );
      app.destroy();
    });

  it("logs a traversal and the occupant shoved aside", async () => {
    const app = mount(round2SaucerUiFixtureV7());
    const traveller = unitAt(app.state(), AT.traveller);
    const occupant = unitAt(app.state(), AT.occupant);
    const step = app
      .model()
      .offeredCommands.find(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" &&
          command.unitId === traveller.id &&
          command.path.at(-1)?.x === AT.gateA.x &&
          command.path.at(-1)?.y === AT.gateA.y,
      );
    if (step === undefined) throw new Error("no gate Move");
    await app.controller.dispatch(step);
    await settle();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Your Fighter stepped through the gate");
    expect(text).toContain("Player 2's Goblin was shoved aside");
    expect(COORDINATE.test(text)).toBe(false);
    expect(unitAt(app.state(), AT.gateB).id).toBe(traveller.id);
    expect(unitAt(app.state(), AT.shoved).id).toBe(occupant.id);
    app.destroy();
  });

  it("toasts a blocked gate", async () => {
    const app = mount(round2GateBlockedUiFixtureV7());
    const traveller = unitAt(app.state(), AT.traveller);
    const step = app
      .model()
      .offeredCommands.find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === traveller.id &&
          command.path.at(-1)?.x === AT.gateA.x &&
          command.path.at(-1)?.y === AT.gateA.y,
      );
    if (step === undefined) throw new Error("no gate Move");
    await app.controller.dispatch(step);
    await settle();
    expect(document.body.textContent).toContain(
      "Gate blocked: your Fighter stays put",
    );
    expect(unitAt(app.state(), AT.gateA).id).toBe(traveller.id);
    app.destroy();
  });
});
