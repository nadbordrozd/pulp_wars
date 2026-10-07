// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
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
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  CURIOSITIES_UI_V7,
  curiositiesOffFixtureV7,
  curiositiesUiFixtureV7,
} from "../fixtures/v7-curiosities-ui";
import { monsterArenaV7, monsterOfV7 } from "../fixtures/v7-monster-arena";

/**
 * Map curiosities UI in the DOM (bead pulp_wars-737.6,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md sections 12.1 and 13.4): the
 * Giant Spider's dock ("Neutral", its stats, its lines, no faction badge
 * and no owner), a curiosity tile's dock, Help, the notices of a Shrine
 * claim and of the neutral turn, in the LEGACY art set and the live look;
 * and that the Spider can be selected and attacked in a match of every
 * faction (no presentation reader trips over the neutral owner).
 */
const AT = CURIOSITIES_UI_V7;
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

describe("Ruleset 7 curiosities in the dock, Help and the notices", () => {
  for (const artSet of ["LEGACY", "CHIBI"] as const)
    it(`${artSet}: shows the Spider as Neutral with its stats, lines and no faction or owner`, () => {
      const app = mount(curiositiesUiFixtureV7(), artSet);
      app.select(AT.spider);
      const dock = app.dock();
      if (dock === null) throw new Error("no dock");
      expect(dock.querySelector("h2")?.textContent).toBe("Giant Spider");
      expect(
        [...dock.querySelectorAll("[data-unit-status]")].map(
          (chip) => chip.textContent,
        ),
      ).toEqual(expect.arrayContaining(["Neutral", "Provoked"]));
      expect(dock.querySelector(".v7-faction-chip")).toBeNull();
      expect(dock.querySelector(".v7-identity-owner")).toBeNull();
      expect(dock.querySelector("[data-faction]")).toBeNull();
      expect(dock.textContent).not.toContain("Juggernaut");
      expect(dock.querySelector('[data-stat="hp"]')?.textContent).toContain(
        "24/24",
      );
      // No command of the Spider is ever offered.
      expect(dock.dataset.hasActions).toBe("false");
      // Its figure: the portrait in the live look, a code spider in LEGACY.
      const figure = dock.querySelector(".v7-identity-art > *");
      if (artSet === "LEGACY")
        expect(figure?.getAttribute("data-asset-id")).toBe(
          "unit-neutral-giant-spider-code",
        );
      // The lines are in the unit dialog.
      dock
        .querySelector<HTMLButtonElement>('[data-action="unit-help"]')
        ?.click();
      const dialog = document.querySelector('[data-v7-region="unit-help"]');
      // The unit glossary's three lines, then whom it will attack.
      expect(
        [...(dialog?.querySelectorAll(".v7-unit-ability") ?? [])].map(
          (line) => (line as HTMLElement).dataset.glossary,
        ),
      ).toEqual(["SPIDER", "SPIDER_REGENERATES", "SPIDER_BOUNTY", "provoked"]);
      expect(dialog?.textContent).toContain(
        "Will attack your Fighter after this round.",
      );
      expect(COORDINATE.test(dialog?.textContent ?? "")).toBe(false);
      app.destroy();
    });

  it("names a curiosity tile, with its one sentence and icon", () => {
    const app = mount(curiositiesUiFixtureV7());
    for (const [at, kind, name] of [
      [AT.shrine, "shrine", "Shrine"],
      [AT.wreck, "wreck", "Sunken Wreck"],
      [AT.fountain, "fountain", "Fountain of Youth"],
      [AT.lair, "web", "Spider's lair"],
    ] as const) {
      app.select(at, true);
      const info = app.dock()?.querySelector<HTMLElement>(".v7-curiosity-info");
      expect(info?.dataset.curiosity, name).toBe(kind);
      expect(info?.querySelector("strong")?.textContent).toBe(name);
      expect(info?.querySelector("p")?.textContent?.endsWith(".")).toBe(true);
      expect(info?.querySelector(".v7-curiosity-icon")).not.toBeNull();
    }
    // A plain tile has no curiosity section.
    app.select({ x: 8, y: 8 }, true);
    expect(app.dock()?.querySelector(".v7-curiosity-info")).toBeNull();
    app.destroy();
  });

  it("keeps the curiosities out of the short Help, with the option on or off", () => {
    // Bead pulp_wars-2yc.39: a curiosity explains itself in its tile's dock
    // and in the Gallery; Help is the same short text in every match.
    for (const fixture of [curiositiesUiFixtureV7, curiositiesOffFixtureV7]) {
      document.body.innerHTML = '<div id="app"></div>';
      const app = mount(fixture());
      document
        .querySelector<HTMLButtonElement>('[data-action="compact-menu"]')
        ?.click();
      document
        .querySelector<HTMLButtonElement>('[data-action="help"]')
        ?.click();
      const help = document.querySelector(".v7-help")?.textContent ?? "";
      expect(help).toContain("Capture every enemy city.");
      expect(document.querySelector(".v7-help-curiosities")).toBeNull();
      expect(help).not.toContain("Giant Spider");
      expect(COORDINATE.test(help)).toBe(false);
      app.destroy();
    }
  });

  it("logs a Shrine claim and the neutral turn, and passes the plan to the board", async () => {
    const app = mount(curiositiesUiFixtureV7());
    const plan = buildBoardRenderPlanV7(
      app.model().view,
      app.model().offeredCommands,
      app.model().interaction,
    );
    expect(
      plan.entries.filter((entry) => entry.kind === "CURIOSITY"),
    ).toHaveLength(4);
    const pilgrim = app
      .state()
      .units.find(
        (unit) => unit.at.x === AT.pilgrim.x && unit.at.y === AT.pilgrim.y,
      );
    const move = app
      .model()
      .offeredCommands.find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === pilgrim?.id &&
          command.path.at(-1)?.x === AT.shrine.x &&
          command.path.at(-1)?.y === AT.shrine.y,
      );
    if (move === undefined) throw new Error("Move to the Shrine not offered");
    await app.controller.dispatch(move);
    await settle();
    expect(document.body.textContent).toContain(
      "Shrine: your Fighter was Promoted",
    );
    await app.controller.dispatch({ kind: "END_TURN" });
    await settle();
    const text = document.body.textContent ?? "";
    expect(text).toContain("The wilds stir");
    expect(text).toContain("Giant Spider attacked your Fighter");
    expect(COORDINATE.test(text)).toBe(false);
    app.destroy();
  });
});

describe("the Spider in a match of every faction", () => {
  const FACTION_SETS: readonly (readonly FactionIdV7[])[] = [
    ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
    ["MARTIAN", "ICE_FOLK", "DWARF", "ORIGINAL"],
    ["DWARF", "MARTIAN", "UNDEAD", "ICE_FOLK"],
  ];
  for (const factions of FACTION_SETS)
    it(`${factions.join(", ")}: selects it, previews an attack on it and plays its turn`, async () => {
      const state = monsterArenaV7(
        [
          { seat: 0, role: "FIGHTER", at: { x: 8, y: 6 } },
          { seat: 0, role: "MARKSMAN", at: { x: 9, y: 9 } },
          { seat: 1, role: "FIGHTER", at: { x: 6, y: 8 } },
        ],
        {
          grass: [
            { x: 8, y: 7 },
            { x: 7, y: 8 },
          ],
        },
        factions,
      );
      const spider = monsterOfV7(state);
      for (const artSet of ["LEGACY", "CHIBI"] as const) {
        document.body.innerHTML = '<div id="app"></div>';
        const app = mount(state, artSet);
        app.select(spider.at);
        expect(app.dock()?.querySelector("h2")?.textContent).toBe(
          "Giant Spider",
        );
        // An own unit next to it: its attack preview and its Moves.
        app.select({ x: 8, y: 6 });
        const model = app.model();
        const plan = buildBoardRenderPlanV7(
          model.view,
          model.offeredCommands,
          model.interaction,
        );
        const labels = [
          ...plan.entries.map((entry) => entry.label ?? ""),
          ...plan.targets.flatMap((target) => [
            target.previewLabel ?? "",
            target.previewNote ?? "",
            target.semanticLabel ?? "",
          ]),
        ];
        for (const label of labels) expect(COORDINATE.test(label)).toBe(false);
        expect(
          plan.targets.some(
            (target) =>
              target.family === "ATTACK" &&
              target.at.x === spider.at.x &&
              target.at.y === spider.at.y,
          ),
        ).toBe(true);
        // Every seat ends its turn; the neutral turn is planned and logged.
        let current = state;
        for (let turn = 0; turn < 4; turn += 1) {
          const actor = current.turnOrder[current.activeSeatIndex];
          if (actor === undefined) throw new Error("no active seat");
          const applied = applyCommandV7(current, actor, { kind: "END_TURN" });
          if (!applied.accepted) throw new Error(applied.error.code);
          const before = viewForV7(current, state.humanPlayerId);
          const after = viewForV7(applied.state, state.humanPlayerId);
          const envelope = projectEventsV7(
            current,
            applied.state,
            state.humanPlayerId,
            applied.events,
          );
          expect(() =>
            corePresentationPlanV7(before, envelope, after),
          ).not.toThrow();
          current = applied.state;
        }
        app.destroy();
      }
    });
});
