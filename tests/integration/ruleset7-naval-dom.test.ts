// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  previewEconomicV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
  Ruleset7CampaignProgressV7,
  Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  BOARD_PICK_PANEL_MAX_BUTTONS_V7,
  targetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  BOARD_ALREADY_ACTED_V7,
  BOARD_NO_WEAK_SHIP_V7,
  NAVAL_HELP_RULES_V7,
  SUBMERGED_OUT_OF_REACH_V7,
} from "../../src/render/naval-presentation-v7";
import {
  NAVAL_ARENA_CAPITALS_V7,
  NAVAL_ARENA_PORTS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "../fixtures/v7-naval-branch";
import {
  NAVAL_UI_V7,
  navalBoardingUiFixtureV7,
  navalHarboursUiFixtureV7,
  navalRamUiFixtureV7,
  navalSubmarineUiFixtureV7,
} from "../fixtures/v7-naval-ui";

// The naval branch interface (bead pulp_wars-5ti.7, first part;
// docs/ui/BOARD_TARGETING.md section 3.4): Board picked on the board, the
// Bow Ram and torpedo previews, the Submarine's marker and reason, the
// Harbours numbers, and the technology cards and Help.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Board is picked on the board", () => {
  it("arms with one button, shows both prizes with the exact HP, and captures the picked one", async () => {
    const { controller, host, app, unitAt } = rig(navalBoardingUiFixtureV7());
    const boarder = unitAt(NAVAL_UI_V7.boarder);
    const prizes = NAVAL_UI_V7.prizes.map((at) => unitAt(at));
    host.callbacks?.onSelection({ kind: "UNIT", unitId: boarder.id });
    // One Board button, whatever the number of prizes; no per-target one.
    const board = requiredButton("naval-board");
    expect(
      document.querySelectorAll('[data-action="naval-board"]').length,
    ).toBe(1);
    expect(board.dataset.navalAbility).toBe("board");
    expect(board.getAttribute("aria-pressed")).toBe("false");
    expect(board.textContent).toBe("Board");
    expect(board.title).not.toMatch(COORDINATE);
    expect(document.querySelector('[data-action^="command-board"]')).toBeNull();
    // Unarmed, the prizes are plain attack targets.
    expect(
      boardPlan(host).targets.filter((target) => target.family === "BOARD"),
    ).toEqual([]);
    expect(
      boardPlan(host).targets.filter((target) => target.family === "ATTACK")
        .length,
    ).toBe(3);

    board.click();
    expect(host.lastModel?.interaction.navalPick).toEqual({
      kind: "BOARD",
      unitId: boarder.id,
    });
    const panel = requiredElement<HTMLElement>("[data-v7-naval-pick]");
    expect(panel.classList.contains("v7-board-pick")).toBe(true);
    expect(panel.dataset.boardTargets).toBe("2");
    const controls = [...panel.querySelectorAll("button")].map(
      (control) => control.dataset.action,
    );
    expect(controls).toEqual(["pick-info", "naval-pick-cancel"]);
    expect(controls.length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    // No button of the dock is named after a prize.
    for (const control of document.querySelectorAll<HTMLButtonElement>(
      ".v7-selection-dock button",
    ))
      for (const prize of prizes)
        expect(control.dataset.action ?? "").not.toMatch(
          new RegExp(`-${prize.id}$`),
        );
    const targets = boardPlan(host).targets;
    expect(targets.map((target) => target.family)).toEqual(["BOARD", "BOARD"]);
    for (const target of targets) {
      expect(targetHighlightStyleV7(target.family)).toBe("ATTACK");
      expect(target.previewLabel).toBe("Take · 4 HP");
    }

    // Escape disarms and returns to the button; nothing was sent.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.navalPick ?? null).toBeNull();
    expect(document.querySelector("[data-v7-naval-pick]")).toBeNull();
    expect(controller.accepted).toEqual([]);
    // Cancel does the same.
    requiredButton("naval-board").click();
    requiredButton("naval-pick-cancel").click();
    expect(host.lastModel?.interaction.navalPick ?? null).toBeNull();

    // Pick the second prize on the board.
    requiredButton("naval-board").click();
    const second = required(
      boardPlan(host).targets.find(
        (target) =>
          target.at.x === NAVAL_UI_V7.prizes[1].x &&
          target.at.y === NAVAL_UI_V7.prizes[1].y,
      ),
    );
    host.callbacks?.onCommand(second);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "BOARD",
      unitId: boarder.id,
      targetUnitId: required(prizes[1]).id,
    });
    const after = required(controller.snapshot().view);
    const prize = required(
      after.units.find((unit) => unit.id === required(prizes[1]).id),
    );
    expect(prize.ownerId).toBe(after.viewer.id);
    expect(prize.hp).toBe(4);
    await waitUntil(
      () =>
        document
          .querySelector("#v7-live")
          ?.textContent?.includes("You boarded Player 2's Patrol Boat") ===
        true,
    );
    expect(host.lastModel?.interaction.navalPick ?? null).toBeNull();
    app.destroy();
  });

  it("is disabled with the engine's reason beside a ship it cannot take, and absent elsewhere", () => {
    let state = navalBoardingUiFixtureV7();
    for (const at of NAVAL_UI_V7.prizes)
      state = patchNavalUnitV7(state, navalUnitAtV7(state, at).id, { hp: 10 });
    const { host, app, unitAt } = rig(state);
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.boarder).id,
    });
    const board = requiredButton("naval-board");
    expect(board.getAttribute("aria-disabled")).toBe("true");
    expect(board.dataset.disabledReason).toBe(BOARD_NO_WEAK_SHIP_V7);
    expect(board.getAttribute("aria-label")).toBe(
      `Board unavailable. ${BOARD_NO_WEAK_SHIP_V7}`,
    );
    board.click();
    expect(host.lastModel?.interaction.navalPick ?? null).toBeNull();
    expect(document.querySelector("#v7-live")?.textContent).toContain(
      BOARD_NO_WEAK_SHIP_V7,
    );
    app.destroy();

    // A boarder that already acted beside a prize.
    document.body.innerHTML = '<div id="app"></div>';
    let acted = navalBoardingUiFixtureV7();
    const boarderState = navalUnitAtV7(acted, NAVAL_UI_V7.boarder);
    acted = patchNavalUnitV7(acted, boarderState.id, {
      activation: {
        ...boarderState.activation,
        attacked: true,
        attacksUsed: 1,
      },
    });
    const second = rig(acted);
    second.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: second.unitAt(NAVAL_UI_V7.boarder).id,
    });
    expect(
      queryPlayerCommandsV7(required(second.controller.snapshot().view)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    expect(requiredButton("naval-board").dataset.disabledReason).toBe(
      BOARD_ALREADY_ACTED_V7,
    );
    second.app.destroy();

    // A ship with nothing afloat next to it has no Board button.
    document.body.innerHTML = '<div id="app"></div>';
    const third = rig(navalSubmarineUiFixtureV7());
    third.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: third.unitAt(NAVAL_UI_V7.farBattleship).id,
    });
    expect(document.querySelector('[data-action="naval-board"]')).toBeNull();
    third.app.destroy();
  });
});

describe("the Bow Ram preview", () => {
  it("shows the bonus and the shove at the target", () => {
    const { host, app, unitAt } = rig(navalRamUiFixtureV7());
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.rammer).id,
    });
    const attack = required(
      boardPlan(host).targets.find((target) => target.family === "ATTACK"),
    );
    expect(attack.previewNote).toBe("Bow Ram +1 · Shoves back");
    expect(attack.knockback).toEqual({
      to: NAVAL_UI_V7.shoveTo,
      blocked: false,
    });
    expect(attack.semanticLabel).not.toMatch(COORDINATE);
    app.destroy();
  });

  it("shows a blocked shove", () => {
    const { host, app, unitAt } = rig(navalRamUiFixtureV7(true));
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.rammer).id,
    });
    const attack = required(
      boardPlan(host).targets.find(
        (target) =>
          target.family === "ATTACK" &&
          target.at.x === NAVAL_UI_V7.rammed.x &&
          target.at.y === NAVAL_UI_V7.rammed.y,
      ),
    );
    expect(attack.previewNote).toBe("Bow Ram +1 · Shove blocked");
    expect(attack.knockback).toEqual({
      to: NAVAL_UI_V7.shoveTo,
      blocked: true,
    });
    app.destroy();
  });
});

describe("the Submarine", () => {
  it("shows Submerged in the dock of either side's Submarine and on the board", () => {
    const { host, app, unitAt } = rig(navalSubmarineUiFixtureV7());
    for (const at of [NAVAL_UI_V7.enemySubmarine, NAVAL_UI_V7.ownSubmarine]) {
      host.callbacks?.onSelection({ kind: "UNIT", unitId: unitAt(at).id });
      const chip = requiredElement<HTMLElement>(
        '.v7-selection-dock [data-unit-status="submerged"]',
      );
      expect(chip.textContent).toBe("Submerged");
      expect(chip.title).toBe(
        "Submerged: can only be attacked from an adjacent tile",
      );
      expect(chip.querySelector('[data-icon="periscope"]')).not.toBeNull();
    }
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.farBattleship).id,
    });
    expect(
      document.querySelector(
        '.v7-selection-dock [data-unit-status="submerged"]',
      ),
    ).toBeNull();
    expect(
      boardPlan(host)
        .entries.filter(
          (entry) => entry.kind === "UNIT" && entry.naval?.submerged === true,
        )
        .map((entry) => `${entry.at.x},${entry.at.y}`)
        .sort(),
    ).toEqual(["4,7", "5,5"]);
    app.destroy();
  });

  it("is offered only to an adjacent attacker; a far one sees the reason", () => {
    const { host, app, unitAt } = rig(navalSubmarineUiFixtureV7());
    const submarine = NAVAL_UI_V7.enemySubmarine;
    const onSubmarine = (target: { readonly at: CoordV7 }): boolean =>
      target.at.x === submarine.x && target.at.y === submarine.y;
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.adjacentBoat).id,
    });
    expect(
      boardPlan(host).targets.some(
        (target) => target.family === "ATTACK" && onSubmarine(target),
      ),
    ).toBe(true);
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.farBattleship).id,
    });
    const plan = boardPlan(host);
    expect(plan.targets.some(onSubmarine)).toBe(false);
    const reason = required(
      plan.entries.find((entry) =>
        entry.key.startsWith("ability-target:SUBMERGED:"),
      ),
    );
    expect(onSubmarine(reason)).toBe(true);
    expect(reason.label).toBe(SUBMERGED_OUT_OF_REACH_V7);
    app.destroy();
  });

  it("torpedoes only what is afloat, with no strike-back", () => {
    const { host, app, unitAt } = rig(navalSubmarineUiFixtureV7());
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(NAVAL_UI_V7.ownSubmarine).id,
    });
    const attacks = boardPlan(host).targets.filter(
      (target) => target.family === "ATTACK",
    );
    // The Fighter on the shore next to it is not offered.
    expect(attacks.map((target) => target.at)).toEqual([NAVAL_UI_V7.torpedoed]);
    expect(required(attacks[0]).previewLabel).toMatch(/^Deal \d+ · take 0$/);
    app.destroy();
  });
});

describe("Harbours", () => {
  it("shows the dock's population, the Harbours share and the city's row", () => {
    const { host, app, view } = rig(navalHarboursUiFixtureV7());
    host.callbacks?.onSelection({ kind: "TILE", at: NAVAL_ARENA_PORTS_V7[0] });
    const population = requiredElement<HTMLElement>(
      ".v7-selection-dock [data-dock-population]",
    );
    expect(population.dataset.dockPopulation).toBe("2");
    expect(population.textContent).toBe("+2");
    const share = requiredElement<HTMLElement>(
      ".v7-selection-dock [data-harbours]",
    );
    expect(share.dataset.harbours).toBe("1");
    expect(share.textContent).toBe("Harbours+1");
    const capital = required(
      view.cities.find(
        (city) =>
          city.at.x === NAVAL_ARENA_CAPITALS_V7[0].x &&
          city.at.y === NAVAL_ARENA_CAPITALS_V7[0].y,
      ),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const row = requiredElement<HTMLElement>('[data-stat="harbours"]');
    expect(row.querySelector("dt")?.textContent).toBe("Harbours");
    expect(row.querySelector("dd")?.textContent).toBe("+1");
    app.destroy();
  });

  it("shows neither without the technology", () => {
    const { host, app, view } = rig(
      navalHarboursUiFixtureV7({ harbours: false }),
    );
    host.callbacks?.onSelection({ kind: "TILE", at: NAVAL_ARENA_PORTS_V7[0] });
    expect(
      requiredElement<HTMLElement>(".v7-selection-dock [data-dock-population]")
        .dataset.dockPopulation,
    ).toBe("1");
    expect(
      document.querySelector(".v7-selection-dock [data-harbours]"),
    ).toBeNull();
    const capital = required(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    expect(document.querySelector('[data-stat="harbours"]')).toBeNull();
    app.destroy();
  });

  it("the Port's build button carries the engine preview's population", () => {
    for (const harbours of [true, false]) {
      document.body.innerHTML = '<div id="app"></div>';
      const { host, app, view } = rig(
        navalHarboursUiFixtureV7({ harbours, port: false }),
      );
      const at = NAVAL_ARENA_PORTS_V7[0];
      const preview = previewEconomicV7(view, { kind: "BUILD_PORT", at });
      if (!preview.ok) throw new Error("no Port preview");
      expect(preview.preview.resultingContribution).toBe(harbours ? 2 : 1);
      const delta = preview.preview.populationDeltaByCity.reduce(
        (total, change) => total + change.delta,
        0,
      );
      host.callbacks?.onSelection({ kind: "TILE", at });
      const build = requiredButton("command-build_port");
      expect(build.getAttribute("aria-label")).toContain(
        `population +${delta}`,
      );
      expect(build.dataset.harbours).toBe(harbours ? "1" : undefined);
      if (harbours) {
        expect(build.getAttribute("aria-label")).toContain(
          "Harbours +1 included",
        );
        expect(build.title).toBe("Harbours: +1 population (included)");
      }
      app.destroy();
    }
  });
});

describe("technology cards and Help", () => {
  const FACTIONS: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "DINOSAUR",
    "MARTIAN",
    "DWARF",
    "CANDY",
  ];

  for (const faction of FACTIONS)
    it(`${faction}: Seamanship, Submersibles and Shorecraft read plainly`, () => {
      const state = navalArenaV7({
        factions: [faction, faction === "UNDEAD" ? "ORIGINAL" : "UNDEAD"],
        technologies: [["SHORECRAFT"], ["SHORECRAFT"]],
        units: [],
      });
      const { app } = rig(state);
      requiredButton("tech").click();
      const seamanship = requiredButton("tech-seamanship");
      expect(seamanship.querySelector(".v7-tech-name")?.textContent).toBe(
        "Seamanship",
      );
      seamanship.click();
      const lines = (): string[] =>
        [
          ...requiredElement<HTMLElement>(".v7-tech-detail").querySelectorAll(
            ".v7-tech-unlocks li",
          ),
        ].map((item) => item.textContent ?? "");
      expect(lines()).toEqual([
        "Board: capture an adjacent enemy ship at a third of its HP or less",
        "Bow Ram: Patrol Boats that moved hit ships with +1 Attack and shove them back",
      ]);
      const submersibles = requiredButton("tech-submersibles");
      expect(submersibles.querySelector(".v7-tech-name")?.textContent).toBe(
        "Submersibles",
      );
      submersibles.click();
      const unlocks = lines();
      expect(unlocks.some((line) => /Submarine/.test(line))).toBe(true);
      expect(unlocks).toContain(
        "Harbours: +1 population from every active Port and Shipyard",
      );
      expect(unlocks).toContain(
        "Submarine: attacked only from an adjacent tile; its torpedo hits ships with no strike-back",
      );
      for (const line of unlocks) expect(line.length).toBeLessThanOrEqual(92);
      requiredButton("tech-shorecraft").click();
      expect(lines()).toContain("Units embark at active Ports");
      expect(lines().join(" ")).not.toContain("Board ships");
      app.destroy();
    });

  it("Help lists the naval rules", () => {
    const { app } = rig(navalBoardingUiFixtureV7());
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    const rules = [
      ...requiredElement<HTMLElement>(".v7-help-naval").querySelectorAll(
        ".v7-help-rule",
      ),
    ].map((item) => item.textContent ?? "");
    expect(rules).toEqual(
      NAVAL_HELP_RULES_V7.map(([name, sentence]) => `${name}: ${sentence}`),
    );
    for (const rule of rules) expect(rule).not.toMatch(COORDINATE);
    app.destroy();
  });

  it("Help has no naval rules where the Naval branch is forbidden", () => {
    // docs/product/CAMPAIGN.md section 2.3: the hidden fixture mission
    // TEST_GROUNDS forbids the Naval branch.
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7("TEST_GROUNDS"))),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { app } = rig(created.state);
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-tips")).not.toBeNull();
    expect(document.querySelector(".v7-help-naval")).toBeNull();
    app.destroy();
  });
});

function rig(state: GameStateV7) {
  const controller = new FixtureController(state);
  const host = new RecordingBoardHost();
  const app = mount(controller, host);
  const view = required(controller.snapshot().view);
  return {
    controller,
    host,
    app,
    view,
    unitAt: (at: CoordV7) =>
      required(
        view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y),
      ),
  };
}

function requiredButton(action: string): HTMLButtonElement {
  return requiredElement<HTMLButtonElement>(`[data-action="${action}"]`);
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing ${selector}`);
  return element;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

class FixtureController implements Ruleset7ControllerPortV7 {
  readonly accepted: CommandV7[] = [];
  readonly #snapshotSubscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  readonly #boundarySubscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  #state: GameStateV7;
  #snapshot: Ruleset7BrowserSnapshot;

  constructor(state: GameStateV7) {
    this.#state = state;
    this.#snapshot = activeSnapshot(state);
  }
  campaignProgress(): Ruleset7CampaignProgressV7 {
    return { status: "OK", completed: {}, lastWin: null, diagnostic: null };
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#snapshotSubscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#snapshotSubscribers.delete(subscriber);
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundarySubscribers.add(subscriber);
    return () => this.#boundarySubscribers.delete(subscriber);
  }
  readonly dispatch = async (
    command: CommandV7,
  ): Promise<Ruleset7DispatchResult> => {
    const beforeState = this.#state;
    const beforeView = viewForV7(beforeState, beforeState.humanPlayerId);
    const result = applyCommandV7(
      beforeState,
      beforeState.humanPlayerId,
      command,
    );
    if (!result.accepted)
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: result.error,
      };
    this.accepted.push(command);
    this.#state = result.state;
    const afterView = viewForV7(result.state, result.state.humanPlayerId);
    const playerEvents = projectEventsV7(
      beforeState,
      result.state,
      result.state.humanPlayerId,
      result.events,
    );
    this.#snapshot = activeSnapshot(result.state);
    const boundary = {
      actor: "HUMAN" as const,
      beforeView,
      afterView,
      playerEvents,
    };
    for (const subscriber of this.#boundarySubscribers) subscriber(boundary);
    for (const subscriber of this.#snapshotSubscribers)
      subscriber(this.#snapshot);
    return { accepted: true, beforeView, afterView, playerEvents };
  };
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "Not used",
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
  lastModel: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.lastModel = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function activeSnapshot(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view: PlayerViewV7 = viewForV7(state, state.humanPlayerId);
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

function mount(
  controller: Ruleset7ControllerPortV7,
  host: BoardHostV7,
): Ruleset7DomAppView {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  return new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
}

/** The board plan the real host would build from the last model. */
function boardPlan(
  host: RecordingBoardHost,
): ReturnType<typeof buildBoardRenderPlanV7> {
  const model = required(host.lastModel);
  return buildBoardRenderPlanV7(
    model.view,
    model.offeredCommands,
    model.interaction,
  );
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required fixture value missing");
  return value;
}
