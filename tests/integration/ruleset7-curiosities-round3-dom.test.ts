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
  FIND_LABEL_V7,
  STAKE_LABEL_V7,
} from "../../src/render/curiosity-presentation-v7";
import {
  ROUND3_UI_V7,
  round3UiFixtureV7,
} from "../fixtures/v7-curiosities-round3-ui";
import { classicLookStorageV7 } from "../fixtures/v7-board-art";

/**
 * Map curiosities round 3 in the DOM (bead pulp_wars-737.20,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12.1;
 * docs/ui/BOARD_TARGETING.md section 3.10), on one hand-built board (no
 * turn is ever ended, no AI runs): the Zap and Fire buttons arm their
 * aiming, the targets are picked on the board (a Zap's with its damage, a
 * landing as a Move), each new tile's dock names its state, and a Move
 * onto the Gold Claim or the Lost Expedition is labelled Stake or Find.
 */
const AT = ROUND3_UI_V7;
const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function mount(initial: GameStateV7, look: "CLASSIC" | "LIVE" = "LIVE") {
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
    settingsStorage: look === "CLASSIC" ? classicLookStorageV7() : null,
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
    callbacks: () => {
      if (callbacks === null) throw new Error("no board callbacks");
      return callbacks;
    },
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

function plan(app: ReturnType<typeof mount>) {
  const model = app.model();
  return buildBoardRenderPlanV7(
    model.view,
    model.offeredCommands,
    model.interaction,
  );
}

function pickOn(app: ReturnType<typeof mount>, at: CoordV7): void {
  const target = plan(app).targets.find((candidate) => same(candidate.at, at));
  if (target === undefined) throw new Error("no target there");
  app.callbacks().onCommand(target);
}

const zapButton = (app: ReturnType<typeof mount>) =>
  app
    .dock()
    ?.querySelector<HTMLButtonElement>('[data-action="curiosity-zap"]') ?? null;

describe("Ruleset 7 curiosities round three: the Tesla Tower's Zap", () => {
  for (const look of ["CLASSIC", "LIVE"] as const)
    it(`${look}: arms the Zap, shows its targets with their damage, and zaps one`, async () => {
      const app = mount(round3UiFixtureV7(), look);
      app.select(AT.gunner);
      const zap = zapButton(app);
      if (zap === null) throw new Error("no Zap button");
      expect(zap.textContent).toContain("Zap");
      expect(zap.getAttribute("aria-pressed")).toBe("false");
      expect(zap.title).toContain("never answered");
      // One button, whatever the number of targets: no generic per-command
      // button for the Zap.
      expect(
        app.dock()?.querySelectorAll('[data-action="curiosity-zap"]'),
      ).toHaveLength(1);
      expect(
        app.dock()?.querySelector('[data-action="command-zap"]'),
      ).toBeNull();
      // Not armed: the board shows no Zap targets yet.
      expect(plan(app).targets.some((target) => target.family === "ZAP")).toBe(
        false,
      );
      zap.click();
      const panel = app
        .dock()
        ?.querySelector<HTMLElement>("[data-v7-curiosity-pick]");
      expect(panel?.dataset.v7CuriosityPick).toBe("zap");
      expect(panel?.dataset.curiosityTargets).toBe("2");
      const zaps = plan(app).targets.filter(
        (target) => target.family === "ZAP",
      );
      expect(
        zaps.map((target) => `${target.at.x},${target.at.y}`).sort(),
      ).toEqual([AT.wounded, AT.guard].map((at) => `${at.x},${at.y}`).sort());
      expect(
        zaps.find((target) => same(target.at, AT.wounded))?.previewLabel,
      ).toBe("Zap −3 · KO");
      expect(
        zaps.find((target) => same(target.at, AT.guard))?.previewLabel,
      ).toMatch(/^Zap −\d+$/);
      // Zapping the wounded Fighter kills it, unanswered.
      const before = unitAt(app.state(), AT.gunner).hp;
      pickOn(app, AT.wounded);
      await settle();
      expect(app.state().units.some((unit) => same(unit.at, AT.wounded))).toBe(
        false,
      );
      expect(unitAt(app.state(), AT.gunner).hp).toBe(before);
      const text = document.body.textContent ?? "";
      expect(text).toContain("zapped");
      expect(COORDINATE.test(text)).toBe(false);
      // The Zap was the unit's action: no second Zap is offered.
      app.select(AT.gunner);
      expect(zapButton(app)).toBeNull();
      app.destroy();
    });

  it("cancels the aiming with its Cancel button and with Escape", () => {
    const app = mount(round3UiFixtureV7());
    app.select(AT.gunner);
    zapButton(app)?.click();
    expect(
      app.dock()?.querySelector("[data-v7-curiosity-pick]"),
    ).not.toBeNull();
    app
      .dock()
      ?.querySelector<HTMLButtonElement>(
        '[data-action="curiosity-pick-cancel"]',
      )
      ?.click();
    expect(app.dock()?.querySelector("[data-v7-curiosity-pick]")).toBeNull();
    expect(plan(app).targets.some((target) => target.family === "ZAP")).toBe(
      false,
    );
    zapButton(app)?.click();
    expect(
      app.dock()?.querySelector("[data-v7-curiosity-pick]"),
    ).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(app.dock()?.querySelector("[data-v7-curiosity-pick]")).toBeNull();
    app.destroy();
  });
});

describe("Ruleset 7 curiosities round three: the Moon Gun's Fire", () => {
  for (const look of ["CLASSIC", "LIVE"] as const)
    it(`${look}: arms the Fire, shows the landings, and fires the Knight`, async () => {
      const app = mount(round3UiFixtureV7(), look);
      app.select(AT.knight);
      const fire = app
        .dock()
        ?.querySelector<HTMLButtonElement>('[data-action="curiosity-fire"]');
      if (fire === null || fire === undefined) throw new Error("no Fire");
      expect(fire.textContent).toContain("Fire");
      // One Fire button, not one per landing.
      expect(
        app.dock()?.querySelectorAll('[data-action="curiosity-fire"]'),
      ).toHaveLength(1);
      expect(
        app.dock()?.querySelector('[data-action="command-fire_moon_gun"]'),
      ).toBeNull();
      fire.click();
      expect(
        app.dock()?.querySelector<HTMLElement>("[data-v7-curiosity-pick]")
          ?.dataset.v7CuriosityPick,
      ).toBe("fire");
      const landings = plan(app).targets.filter(
        (target) => target.family === "MOON_GUN",
      );
      const offered = app
        .model()
        .offeredCommands.filter((command) => command.kind === "FIRE_MOON_GUN");
      expect(landings.length).toBe(offered.length);
      expect(landings.length).toBeGreaterThan(20);
      // Every landing is an empty tile within 5 of the Gun.
      for (const landing of landings) {
        expect(
          Math.max(
            Math.abs(landing.at.x - AT.gun.x),
            Math.abs(landing.at.y - AT.gun.y),
          ),
        ).toBeLessThanOrEqual(5);
        expect(
          app.state().units.some((unit) => same(unit.at, landing.at)),
        ).toBe(false);
      }
      const knight = unitAt(app.state(), AT.knight);
      const far = { x: AT.gun.x + 4, y: AT.gun.y + 3 };
      pickOn(app, far);
      await settle();
      expect(
        app.state().units.find((unit) => unit.id === knight.id)?.at,
      ).toEqual(far);
      expect(document.body.textContent).toContain(
        "was fired from the Moon Gun",
      );
      // It reloads: the tile's dock says so.
      app.select(AT.gun, true);
      expect(
        app
          .dock()
          ?.querySelector<HTMLElement>('[data-curiosity-status="moon_gun"]')
          ?.textContent,
      ).toMatch(/^Reloading/);
      app.destroy();
    });
});

describe("Ruleset 7 curiosities round three: the tile docks and the Move labels", () => {
  it("names each new tile with its state line and icon", () => {
    for (const [at, kind, name, status] of [
      [AT.tower, "tesla_tower", "Tesla Tower", /^Stand a unit on it to zap/],
      [AT.gun, "moon_gun", "Moon Gun", /^Loaded · /],
      [AT.claim, "gold_claim", "Gold Claim", /· 18 Coins left$/],
      [
        AT.expedition,
        "lost_expedition",
        "Lost Expedition",
        /^The first to arrive gets a free technology\.$/,
      ],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const app = mount(round3UiFixtureV7());
      app.select(at, true);
      const info = app.dock()?.querySelector<HTMLElement>(".v7-curiosity-info");
      expect(info?.dataset.curiosity, name).toBe(kind);
      expect(info?.querySelector("strong")?.textContent).toBe(name);
      expect(info?.querySelector(".v7-curiosity-icon")).not.toBeNull();
      expect(
        info?.querySelector<HTMLElement>(`[data-curiosity-status="${kind}"]`)
          ?.textContent,
        name,
      ).toMatch(status);
      expect(COORDINATE.test(info?.textContent ?? "")).toBe(false);
      app.destroy();
    }
  });

  it("labels a Move onto the Gold Claim Stake and stakes it", async () => {
    const app = mount(round3UiFixtureV7());
    app.select(AT.prospector);
    const stake = plan(app).targets.find(
      (target) => target.family === "MOVE" && same(target.at, AT.claim),
    );
    expect(stake?.previewLabel).toBe(STAKE_LABEL_V7);
    expect(stake?.semanticLabel).toContain("staked for you");
    if (stake === undefined) throw new Error("no Stake Move");
    app.callbacks().onCommand(stake);
    await settle();
    expect(
      app
        .state()
        .curiosities.find((curiosity) => curiosity.kind === "GOLD_CLAIM"),
    ).toMatchObject({ ownerId: app.state().humanPlayerId, left: 18 });
    expect(document.body.textContent).toContain("Gold Claim staked");
    app.select(AT.claim, true);
    expect(
      app.dock()?.querySelector('[data-curiosity-status="gold_claim"]')
        ?.textContent,
    ).toBe("Yours · 18 Coins left");
    app.destroy();
  });

  it("labels a Move onto the Lost Expedition Find and finds its notes", async () => {
    const app = mount(round3UiFixtureV7());
    app.select(AT.explorer);
    const find = plan(app).targets.find(
      (target) => target.family === "MOVE" && same(target.at, AT.expedition),
    );
    expect(find?.previewLabel).toBe(FIND_LABEL_V7);
    if (find === undefined) throw new Error("no Find Move");
    app.callbacks().onCommand(find);
    await settle();
    expect(
      app
        .state()
        .curiosities.find((curiosity) => curiosity.kind === "LOST_EXPEDITION"),
    ).toMatchObject({ foundBy: app.state().humanPlayerId });
    expect(document.body.textContent).toContain(
      "Expedition notes: your next technology is free",
    );
    app.select(AT.expedition, true);
    expect(
      app.dock()?.querySelector('[data-curiosity-status="lost_expedition"]')
        ?.textContent,
    ).toBe("Notes taken by you: your next technology is free.");
    app.destroy();
  });
});
