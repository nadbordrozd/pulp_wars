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
  type MatchSetupV7,
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
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { knightOverrunPublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";
import {
  AFFLICTION_SHOWCASE_V7,
  UNDEAD_SHOWCASE_V7,
  afflictionHumanFixtureV7,
  undeadShowcaseFixtureV7,
  undeadUiArenaV7,
} from "../fixtures/v7-undead-ui";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Revision 13 Undead DOM", () => {
  it("offers per-seat faction choice in the default setup", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    expect(labelsIn("[data-v7-factions]")).toEqual([
      "Your faction",
      "Player 2 faction",
    ]);
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "2";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(labelsIn("[data-v7-factions]")).toHaveLength(3);
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement).not.toBe(null);
    expect(requiredElement("#v7-ai-count")).toBe(count);
    expect(labelsIn("[data-v7-factions]")).toEqual([
      "Your faction",
      "Player 2 faction",
      "Player 3 faction",
      "Player 4 faction",
    ]);
    for (const seat of [0, 2]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      expect([...field.options].map((option) => option.textContent)).toEqual([
        "Human",
        "Undead",
        "Goblin",
        "Dinosaur",
      ]);
      expect(field.value).toBe("ORIGINAL");
      field.value = "UNDEAD";
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]?.factions).toEqual([
      "UNDEAD",
      "ORIGINAL",
      "UNDEAD",
      "ORIGINAL",
    ]);
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const plain = new SetupController();
    const defaultApp = mount(plain, new RecordingBoardHost());
    // Untouched faction selects keep every seat Human.
    const plainCount = requiredElement<HTMLSelectElement>("#v7-ai-count");
    plainCount.value = "2";
    plainCount.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      [
        ...document.querySelectorAll<HTMLSelectElement>(
          "[data-v7-factions] select",
        ),
      ].map((field) => field.value),
    ).toEqual(["ORIGINAL", "ORIGINAL", "ORIGINAL"]);
    requiredButton("launch").click();
    await waitUntil(() => plain.launched.length === 1);
    expect(plain.launched[0]?.factions).toEqual([
      "ORIGINAL",
      "ORIGINAL",
      "ORIGINAL",
    ]);
    defaultApp.destroy();
  });

  it("labels Undead units, offers previewed Undead commands, and explains Restless", async () => {
    const controller = new FixtureController(undeadShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const at = UNDEAD_SHOWCASE_V7;

    selectUnitAt(controller, host, at.banshee);
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.querySelector("h2")?.textContent).toBe("Banshee");
    expect(
      dock.querySelector('.v7-faction-chip[data-faction="undead"]')
        ?.textContent,
    ).toBe("Undead");
    expect(dock.querySelector(".v7-identity-art .v7-undead-badge")).not.toBe(
      null,
    );
    expect(dock.querySelector('[data-stat="range"] dd')?.textContent).toBe("—");
    const wail = requiredButton("command-wail");
    expect(wail.querySelector(".v7-action-label")?.textContent).toBe("Wail");
    expect(wail.getAttribute("aria-label")).toBe(
      "Wail · Hits 2 enemies within 2 tiles, 1 dies: Guard −1, Fighter −1 (dies)",
    );
    expect(wail.querySelector(".v7-undead-preview-chip")?.textContent).toBe(
      "2 hit · 1 ✕",
    );
    expect(host.lastModel?.interaction.selectedUnitId).toBeDefined();

    selectUnitAt(controller, host, at.necromancer);
    expect(actionLabels()).toEqual(["Frenzy", "Raise Dead", "Disband", "Wait"]);
    expect(
      requiredButton("command-raise_dead").getAttribute("aria-label"),
    ).toBe("Raise Dead · 3 Skeletons rise from adjacent Graves at 5 HP");
    requiredButton("unit-help").click();
    const help = requiredElement<HTMLElement>(".v7-unit-help-dialog");
    expect(help.textContent).toContain("Frenzy");
    expect(help.textContent).toContain(
      "Raises a 5 HP Skeleton from every free Grave next to it.",
    );
    expect(help.textContent).not.toContain("Rally");
    requiredButton("close-unit-help").click();

    selectUnitAt(controller, host, at.ghoul);
    expect(requiredButton("command-devour").getAttribute("aria-label")).toBe(
      "Devour · Eats the Grave: heal +6 to 10 HP",
    );
    expect(
      document.querySelector('[data-unit-status="grave"]')?.textContent,
    ).toBe("On a Grave");

    selectUnitAt(controller, host, at.restlessSkeleton);
    expect(
      document
        .querySelector('[data-unit-status="restless"]')
        ?.getAttribute("aria-label"),
    ).toBe("Restless: Undead recover only inside your territory.");
    requiredButton("unit-help").click();
    expect(
      document.querySelector('[data-tactical-state="restless"]')?.textContent,
    ).toContain("Restless: no recovery here");
    requiredButton("close-unit-help").click();
    const recover = requiredButton("restless-recover");
    expect(recover.getAttribute("aria-disabled")).toBe("true");
    expect(recover.disabled).toBe(false);
    expect(recover.getAttribute("aria-label")).toBe(
      "Recover unavailable. Restless: Undead recover only inside your territory.",
    );
    recover.click();
    expect(controller.accepted).toEqual([]);

    selectUnitAt(controller, host, at.banshee);
    requiredButton("command-wail").click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "Banshee wailed: 2 hit, 1 fell · 1 Grave left",
    );
    expect(document.querySelector(".v7-toast")?.textContent).toBe(
      "Banshee wailed: 2 hit, 1 fell · 1 Grave left",
    );
    app.destroy();
  });

  it("uses the viewer's Undead registration for training, recruit help, technology and Help", () => {
    const controller = new FixtureController(
      undeadUiArenaV7([{ seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } }]),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find(
        (city) => city.ownerId === view.viewer.id && city.isCapital,
      ),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const trainLabels = [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-train-action"),
    ].map((button) => button.getAttribute("aria-label"));
    expect(trainLabels).toEqual(
      expect.arrayContaining([
        "Train Skeleton for 2 Coins",
        "Train Banshee for 3 Coins",
        "Train Necromancer for 5 Coins",
        "Train Lich for 8 Coins",
      ]),
    );
    expect(
      document.querySelector(".v7-train-action .v7-undead-badge"),
    ).not.toBe(null);
    requiredButton("train-help-marksman").click();
    const recruit = requiredElement<HTMLElement>(".v7-recruit-help");
    expect(recruit.querySelector("h2")?.textContent).toBe("Banshee");
    expect(recruit.textContent).toContain("Can't attack. Wails instead.");
    expect(recruit.textContent).toContain(
      "Restless: recovers only in your territory.",
    );
    requiredButton("close-recruit-help").click();

    requiredButton("tech").click();
    requiredButton("tech-administration").click();
    const detail = requiredElement<HTMLElement>(".v7-tech-detail");
    expect(detail.textContent).toContain("Train Necromancer");
    expect(detail.textContent).toContain(
      "Necromancers Frenzy nearby troops or Raise Dead",
    );
    requiredButton("close-overlay").click();

    requiredButton("compact-menu").click();
    requiredButton("help").click();
    const helpText =
      requiredElement<HTMLElement>(".v7-help-tips").textContent ?? "";
    expect(helpText).toContain(
      "Units that fall in battle on land leave Graves.",
    );
    expect(helpText).not.toContain("Raider");
    // Revision 16: the Shallow Water sentence is naval-only (Dry Land arena).
    expect(helpText).not.toContain("Shallow Water");
    requiredButton("close-overlay").click();

    requiredButton("compact-menu").click();
    requiredButton("leaderboard").click();
    expect(
      [...document.querySelectorAll(".v7-leaderboard .v7-faction-chip")]
        .map((chip) => chip.textContent)
        .sort(),
    ).toEqual(["Human", "Undead"]);
    app.destroy();
  });

  it("names each player's faction in the turn banner only in Undead matches", () => {
    const opponentTurn = (state: GameStateV7): GameStateV7 => ({
      ...state,
      activeSeatIndex: state.turnOrder.findIndex(
        (id) => id !== state.humanPlayerId,
      ),
    });
    const mixed = mount(
      new FixtureController(opponentTurn(undeadShowcaseFixtureV7())),
      new RecordingBoardHost(),
    );
    expect(document.querySelector(".v7-turn-status")?.textContent).toBe(
      "Player 2 (Human) is playing…",
    );
    mixed.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const human = mount(
      new FixtureController(opponentTurn(knightOverrunPublicFixtureV7().state)),
      new RecordingBoardHost(),
    );
    expect(document.querySelector(".v7-turn-status")?.textContent).toMatch(
      /^Player \d is playing…$/,
    );
    human.destroy();
  });

  it("shows public Plague and Bitten chips, explains Disband, and previews Tend cures", async () => {
    const controller = new FixtureController(afflictionHumanFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const at = AFFLICTION_SHOWCASE_V7.human;
    const plague =
      "Plague from Player 2's Lich: −2 HP at the start of each of its next 3 turns, then it ends; at the first it spreads to adjacent living units. It ends sooner if that Lich dies or a Captain tends it.";

    selectUnitAt(controller, host, at.plaguedWarrior);
    const chip = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="plague"]',
    );
    // Revision 15: the chip counts the remaining Plague turns.
    expect(chip.textContent).toBe("Plague · 3 turns");
    expect(chip.getAttribute("aria-label")).toBe(`Plague · 3 turns. ${plague}`);
    expect(chip.querySelector('svg[data-icon="plague"]')).not.toBeNull();
    expect(
      document.querySelector('.v7-selection-dock [data-unit-status="bitten"]'),
    ).toBeNull();
    const disband = requiredButton("affliction-disband");
    expect(disband.getAttribute("aria-disabled")).toBe("true");
    expect(disband.disabled).toBe(false);
    expect(disband.dataset.disabledReason).toBe("plagued");
    expect(disband.getAttribute("aria-label")).toBe(
      "Disband unavailable. Plagued units can't Disband.",
    );
    expect(document.querySelector('[data-action="command-disband"]')).toBe(
      null,
    );
    disband.click();
    expect(controller.accepted).toEqual([]);
    requiredButton("unit-help").click();
    expect(
      document.querySelector('[data-tactical-state="plague"]')?.textContent,
    ).toBe(`Plague · 3 turns${plague}`);
    requiredButton("close-unit-help").click();

    selectUnitAt(controller, host, at.bittenArcher);
    expect(
      document
        .querySelector('.v7-selection-dock [data-unit-status="bitten"]')
        ?.getAttribute("aria-label"),
    ).toBe(
      "Bitten. Bitten by Player 2's Zombie: if it dies it rises as Player 2's Zombie, unless a Captain tends it first.",
    );
    expect(requiredButton("affliction-disband").dataset.disabledReason).toBe(
      "bitten",
    );

    selectUnitAt(controller, host, at.doublyAfflicted);
    expect(
      Array.from(
        document.querySelectorAll(".v7-selection-dock .v7-affliction-chip"),
      ).map((node) => node.textContent),
    ).toEqual(["Plague · 3 turns", "Bitten"]);
    expect(requiredButton("affliction-disband").dataset.disabledReason).toBe(
      "plagued",
    );

    selectUnitAt(controller, host, at.knight);
    expect(document.querySelector(".v7-affliction-chip")).toBeNull();
    expect(document.querySelector('[data-action="affliction-disband"]')).toBe(
      null,
    );

    // The enemy Lich's and the Captain's ? details explain Plague and cures.
    selectUnitAt(controller, host, at.visibleLich);
    requiredButton("unit-help").click();
    expect(
      requiredElement<HTMLElement>(".v7-unit-help-dialog").textContent,
    ).toContain(
      "Living units its attacks hit are plagued for 3 turns: −2 HP each turn, spreading to neighbours on the first. It ends sooner if this Lich dies or a Captain tends them.",
    );
    requiredButton("close-unit-help").click();
    selectUnitAt(controller, host, at.captain);
    requiredButton("unit-help").click();
    expect(
      requiredElement<HTMLElement>(".v7-unit-help-dialog").textContent,
    ).toContain(
      "Heals nearby wounded troops by 2 and cures their Plague and bites.",
    );
    requiredButton("close-unit-help").click();
    const tend = requiredButton("command-tend_wounded");
    expect(tend.getAttribute("aria-label")).toBe(
      "Tend wounded · Tends 2 units: Fighter: cures Plague; Marksman: +2 HP, cures bite",
    );
    expect(tend.querySelector(".v7-undead-preview-chip")?.textContent).toBe(
      "+2 HP · 2 cures",
    );
    tend.click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "Tend cured Plague on 1 and a bite",
    );
    expect(controller.snapshot().view?.plagued).toHaveLength(1);
    selectUnitAt(controller, host, at.plaguedWarrior);
    expect(document.querySelector(".v7-affliction-chip")).toBeNull();

    host.callbacks?.onSelection(null);
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    const helpText =
      requiredElement<HTMLElement>(".v7-help-tips").textContent ?? "";
    expect(helpText).toContain(
      "Lich shots plague your units for 3 turns: −2 HP each turn, spreading to neighbours on the first. Killing the Lich or a Captain's Tend ends it sooner.",
    );
    expect(helpText).toContain(
      "Your units can't strike back at a Vampire's attack.",
    );
    app.destroy();
  });

  it("keeps Human-only docks, Help, and leaderboard free of Undead cues", () => {
    const fixture = knightOverrunPublicFixtureV7();
    const controller = new FixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    for (const unit of view.units) {
      host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
      expect(document.querySelector(".v7-faction-chip")).toBeNull();
      expect(document.querySelector(".v7-undead-badge")).toBeNull();
      expect(document.querySelector('[data-action="restless-recover"]')).toBe(
        null,
      );
      expect(document.body.textContent).not.toMatch(
        /Undead|Grave|Frenzy|Restless|Plague|Bitten|bites/,
      );
      expect(document.querySelector(".v7-affliction-chip")).toBeNull();
      expect(document.querySelector('[data-action="affliction-disband"]')).toBe(
        null,
      );
      expect(
        document
          .querySelector('[data-action="command-tend_wounded"]')
          ?.querySelector(".v7-undead-preview-chip") ?? null,
      ).toBeNull();
    }
    host.callbacks?.onSelection(null);
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    const helpText =
      requiredElement<HTMLElement>(".v7-help-tips").textContent ?? "";
    expect(helpText).toContain(
      "A Raider that survives an attack may move again (Escape).",
    );
    expect(helpText).not.toContain("Grave");
    requiredButton("close-overlay").click();
    requiredButton("compact-menu").click();
    requiredButton("leaderboard").click();
    expect(document.querySelector(".v7-faction-chip")).toBeNull();
    app.destroy();
  });
});

class SetupController implements Ruleset7ControllerPortV7 {
  readonly launched: MatchSetupV7[] = [];
  snapshot(): Ruleset7BrowserSnapshot {
    return {
      phase: "EMPTY",
      view: null,
      offeredCommands: [],
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
      ai: idleAi(),
    };
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    subscriber(this.snapshot());
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async (setup) => {
    this.launched.push(setup);
    return {
      ok: false,
      code: "INVALID_SETUP",
      diagnostic: "Setup recorded",
    };
  };
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

class FixtureController extends SetupController {
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
    super();
    this.#state = state;
    this.#snapshot = activeSnapshot(state);
  }
  override snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  override subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#snapshotSubscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#snapshotSubscribers.delete(subscriber);
  }
  override subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundarySubscribers.add(subscriber);
    return () => this.#boundarySubscribers.delete(subscriber);
  }
  override readonly dispatch = async (
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
    ai: idleAi(),
  };
}

function idleAi(): Ruleset7BrowserSnapshot["ai"] {
  return {
    active: false,
    fastForward: false,
    policySlices: 0,
    acceptedCommands: 0,
    lastSliceMilliseconds: 0,
    maximumSliceMilliseconds: 0,
  };
}

function mount(
  controller: Ruleset7ControllerPortV7,
  host: BoardHostV7,
): Ruleset7DomAppView {
  return new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: null },
  );
}

function selectUnitAt(
  controller: FixtureController,
  host: RecordingBoardHost,
  at: CoordV7,
): void {
  const unit = required(
    controller
      .snapshot()
      .view?.units.find((item) => item.at.x === at.x && item.at.y === at.y),
  );
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
}

function actionLabels(): (string | null)[] {
  return [
    ...document.querySelectorAll(".v7-selection-dock .v7-action-label"),
  ].map((node) => node.textContent);
}

function labelsIn(selector: string): string[] {
  return [
    ...document.querySelectorAll<HTMLLabelElement>(`${selector} label`),
  ].map((label) => label.firstChild?.textContent ?? "");
}

function requiredButton(action: string): HTMLButtonElement {
  return requiredElement<HTMLButtonElement>(`[data-action="${action}"]`);
}

function requiredElement<T extends Element>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (result === null) throw new Error(`${selector} missing`);
  return result;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required Undead DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
