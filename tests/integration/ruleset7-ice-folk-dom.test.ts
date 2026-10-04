// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBolasV7,
  previewColdSnapV7,
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
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  recruitmentRolePresentationV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  BRITTLE_UNLOCK_TEXT_V7,
  COLD_SNAP_NO_TARGET_V7,
  DEEP_WINTER_UNLOCK_TEXT_V7,
  FROZEN_MOVED_V7,
  GLIDE_MOVE_LABEL_V7,
  ICE_FOLK_HELP_RULES_V7,
  SHATTERS_PREVIEW_V7,
  bolasPreviewLinesV7,
  chillChipV7,
  coldSnapSummaryV7,
  iceFolkRoleUnlockTextV7,
  snowChipTooltipV7,
  snowTooltipV7,
} from "../../src/render/ice-folk-presentation-v7";
import {
  ICE_FOLK_GLIDE_V7,
  ICE_FOLK_UI_V7,
  ICE_FOLK_VICTIM_V7,
  iceFolkGlideFixtureV7,
  iceFolkUiFieldV7,
  iceFolkUiFixtureV7,
  iceFolkVictimFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Every Ice Folk text and number expected below is read from the registry,
// the engine constants or a public preview of the same view: the balance
// bead (`pulp_wars-7g3.7`) may retune the faction.
const AT = ICE_FOLK_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "ICE_FOLK").label;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ice Folk setup", () => {
  it("offers Ice Folk for every seat and launches the chosen factions", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    for (const seat of [0, 1, 2, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      // The Dwarf UI (pulp_wars-78i.6) adds the seventh faction.
      expect([...field.options].map((option) => option.textContent)).toEqual([
        "Human",
        "Undead",
        "Goblin",
        "Dinosaur",
        "Martian",
        "Ice Folk",
        "Dwarf",
        "Candy",
      ]);
      // pulp_wars-w5j.1: distinct defaults (Human, Undead, Goblin, Dinosaur).
      expect(field.value).toBe(
        ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"][seat],
      );
    }
    for (const seat of [0, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      field.value = "ICE_FOLK";
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    // pulp_wars-w5j.1: a second Ice Folk seat is impossible; seat 3 takes
    // the first untaken faction (Human).
    expect(chosen.launched[0]?.factions).toEqual([
      "ICE_FOLK",
      "UNDEAD",
      "GOBLIN",
      "ORIGINAL",
    ]);
    app.destroy();
  });
});

describe("Ice Folk unit dock", () => {
  it("shows Frozen, Frosted and Thawing on enemy units, with their status", () => {
    const controller = new FixtureController(iceFolkUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    for (const at of [AT.frozenEnemy, AT.shatterTarget, AT.thawingEnemy]) {
      const unit = selectUnitAt(controller, host, at);
      const chip = required(chillChipV7(view, unit));
      const cue = requiredElement<HTMLElement>(
        '.v7-selection-dock [data-unit-status="chill"]',
      );
      expect(cue.textContent).toBe(chip.label);
      expect(cue.title).toBe(chip.status);
    }
    // An unchilled enemy has no chill chip.
    selectUnitAt(controller, host, AT.sweepTarget);
    expect(chipText("chill")).toBeNull();
    app.destroy();
  });

  it("names the Boulder Yeti's throw, the Witch's Blizzard and an Ice Folk unit's threshold", () => {
    const controller = new FixtureController(iceFolkUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    selectUnitAt(controller, host, AT.boulderYeti);
    const stats = required(
      view.unitStats.find(
        (entry) => entry.unitId === unitAt(controller, AT.boulderYeti).id,
      )?.iceFolk,
    );
    expect(chipText("planted")).toBe(
      stats.planted === true ? "Planted: Attack 3" : "Moved: Attack 2",
    );
    expect(
      requiredElement(".v7-selection-dock .v7-faction-chip").textContent,
    ).toBe("Ice Folk");
    selectUnitAt(controller, host, AT.witch);
    expect(chipText("blizzard")).toBe("Blizzard");
    requiredButton("unit-help").click();
    expect(
      requiredElement('[data-ice-folk-info="threshold"] strong').textContent,
    ).toBe(`Shatters at ${stats.shatterThreshold} HP or less`);
    app.destroy();
  });

  it("says why a Frozen unit that moved cannot act", () => {
    const controller = new FixtureController(iceFolkVictimFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, ICE_FOLK_VICTIM_V7.frozenFighter);
    const act = requiredButton("ice-folk-frozen");
    expect(act.getAttribute("aria-disabled")).toBe("true");
    expect(act.title).toBe(FROZEN_MOVED_V7);
    // The unit information says it too.
    requiredButton("unit-help").click();
    expect(requiredElement('[data-tactical-state="frozen"]').textContent).toBe(
      FROZEN_MOVED_V7,
    );
    // The engine offers it no primary action.
    expect(
      queryPlayerCommandsV7(required(controller.snapshot().view))
        .filter(
          (command) =>
            "unitId" in command &&
            command.unitId ===
              unitAt(controller, ICE_FOLK_VICTIM_V7.frozenFighter).id,
        )
        .map((command) => command.kind)
        .sort(),
    ).toEqual(["DISBAND", "WAIT"]);
    app.destroy();
  });

  it("names Snow and the Blizzard on a tile for the viewer's faction", () => {
    const controller = new FixtureController(iceFolkVictimFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    host.callbacks?.onSelection({
      kind: "TILE",
      at: { x: ICE_FOLK_VICTIM_V7.witch.x + 1, y: ICE_FOLK_VICTIM_V7.witch.y },
    });
    expect(requiredElement<HTMLElement>('[data-winter="snow"]').title).toBe(
      snowTooltipV7(view),
    );
    expect(
      requiredElement<HTMLElement>('[data-winter="blizzard"]').textContent,
    ).toBe("Blizzard");
    app.destroy();
  });

  it("counts an Ice Folk city in slots, one per unit", () => {
    const controller = new FixtureController(
      iceFolkUiFieldV7([{ seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } }]),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    expect(
      requiredElement<HTMLElement>('[data-stat="units"]').dataset.capacity,
    ).toBe("slots");
    expect(
      [...document.querySelectorAll('[data-egg-fact="slots"]')].every(
        (node) => node.textContent === "1 slot",
      ),
    ).toBe(true);
    app.destroy();
  });

  // The balance round's UI (bead `pulp_wars-1wy.5`, ruleset `7r37`).
  it('reads Snow cover as "+25%" and names the Glide tiles of a unit inside the Snow', () => {
    const controller = new FixtureController(iceFolkGlideFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, ICE_FOLK_GLIDE_V7.inside);
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    const snow = requiredElement<HTMLButtonElement>(
      '.v7-stat[data-stat="defense"] [data-modifier-source="snow"]',
    );
    expect(snow.textContent).toBe("+25%");
    expect(snow.getAttribute("aria-label")).toContain("Snow cover");
    // The product's fraction (a Yeti's 1.5 x 1.25 = 1.875) is never shown.
    expect(dock.textContent).not.toMatch(/1\.875|0\.375/);
    expect(
      requiredElement<HTMLElement>(
        '.v7-selection-dock [data-unit-status="snow"]',
      ).title,
    ).toBe(snowChipTooltipV7(true));
    // Its range reaches two tiles inside the Snow: the legend names the
    // pale-ice outlines, and the board marks them.
    expect(requiredElement('[data-landing-marker="glide"]').textContent).toBe(
      GLIDE_MOVE_LABEL_V7,
    );
    expect(
      boardPlan(host).targets.some((target) => target.glide === true),
    ).toBe(true);
    // A unit on open ground has neither.
    selectUnitAt(controller, host, ICE_FOLK_GLIDE_V7.outside);
    expect(document.querySelector('[data-landing-marker="glide"]')).toBeNull();
    expect(document.querySelector('[data-modifier-source="snow"]')).toBeNull();
    expect(
      boardPlan(host).targets.some((target) => target.glide === true),
    ).toBe(false);
    app.destroy();
  });
});

describe("Ice Folk abilities", () => {
  it("throws a Bolas: the button, the targets with their hints, then a target", async () => {
    const controller = new FixtureController(iceFolkUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const sled = selectUnitAt(controller, host, AT.sled);
    const target = unitAt(controller, AT.bolasTarget);
    const button = requiredButton("ice-folk-bolas");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.click();
    expect(host.lastModel?.interaction.iceFolkPick).toEqual({
      kind: "THROW_BOLAS",
      unitId: sled.id,
    });
    const view = required(controller.snapshot().view);
    const offered = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "THROW_BOLAS" && command.unitId === sled.id,
    );
    expect(boardPlan(host).targets.map((entry) => entry.family)).toEqual(
      offered.map(() => "THROW_BOLAS"),
    );
    const preview = required(previewBolasV7(view, sled.id, target.id));
    const choice = requiredButton(`bolas-${target.id}`);
    for (const line of bolasPreviewLinesV7(view, preview))
      expect(choice.getAttribute("aria-label")).toContain(line);
    // Escape leaves the aiming; the button aims again.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.iceFolkPick ?? null).toBe(null);
    requiredButton("ice-folk-bolas").click();
    requiredButton(`bolas-${target.id}`).click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "THROW_BOLAS",
      unitId: sled.id,
      targetUnitId: target.id,
    });
    await waitUntil(() =>
      (document.querySelector("#v7-live")?.textContent ?? "").includes(
        `Your ${label("RAIDER")} chilled a Fighter`,
      ),
    );
    expect(host.lastModel?.interaction.iceFolkPick ?? null).toBe(null);
    app.destroy();
  });

  it("casts a Cold Snap with one confirm, from the board or the dock", async () => {
    const controller = new FixtureController(iceFolkUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const witch = selectUnitAt(controller, host, AT.witch);
    requiredButton("ice-folk-cold-snap").click();
    const preview = required(
      previewColdSnapV7(required(controller.snapshot().view), witch.id),
    );
    // Bead pulp_wars-b5f.8: the panel shows the ability's name; the
    // summary is its accessible name, its "?" and the cast button's name.
    expect(
      requiredElement("[data-v7-ice-folk-pick] .v7-kaboom-summary").textContent,
    ).toBe("Cold Snap");
    expect(
      requiredElement("[data-v7-ice-folk-pick]").getAttribute("aria-label"),
    ).toBe(coldSnapSummaryV7(preview));
    expect(
      requiredButton("cold-snap-cast").getAttribute("aria-label"),
    ).toContain(coldSnapSummaryV7(preview));
    const targets = boardPlan(host).targets;
    expect(targets).toHaveLength(preview.targets.length);
    // Choosing any highlighted unit casts it.
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "COLD_SNAP",
      unitId: witch.id,
    });
    await waitUntil(() =>
      (document.querySelector("#v7-live")?.textContent ?? "").includes(
        `Your ${label("CAPTAIN")} chilled ${preview.targets.length} units`,
      ),
    );
    app.destroy();
  });

  it("names why a Witch without an enemy in reach cannot cast", () => {
    const controller = new FixtureController(
      iceFolkUiFieldV7([{ seat: 0, role: "CAPTAIN", at: { x: 5, y: 3 } }]),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, { x: 5, y: 3 });
    const button = requiredButton("ice-folk-cold-snap");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.dataset.disabledReason).toBe(COLD_SNAP_NO_TARGET_V7);
    app.destroy();
  });

  it("previews a Shatter and shatters on the attack", async () => {
    const controller = new FixtureController(iceFolkUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const yeti = selectUnitAt(controller, host, AT.yeti);
    const target = unitAt(controller, AT.shatterTarget);
    const attack = required(
      boardPlan(host).targets.find(
        (entry) =>
          entry.family === "ATTACK" &&
          entry.command.kind === "ATTACK" &&
          entry.command.targetUnitId === target.id,
      ),
    );
    expect(attack.previewLabel).toBe(SHATTERS_PREVIEW_V7);
    host.callbacks?.onCommand(attack);
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(() =>
      (document.querySelector("#v7-live")?.textContent ?? "").includes(
        `Your ${label("FIGHTER")} shattered a Fighter`,
      ),
    );
    expect(
      required(controller.snapshot().view).units.some(
        (unit) => unit.id === target.id,
      ),
    ).toBe(false);
    expect(yeti.id).toBeGreaterThan(0);
    app.destroy();
  });
});

describe("Ice Folk Help and technology", () => {
  it("lists the Ice Folk rules for every viewer of a match with an Ice Folk seat", () => {
    for (const fixture of [iceFolkUiFixtureV7, iceFolkVictimFixtureV7]) {
      document.body.innerHTML = '<div id="app"></div>';
      const controller = new FixtureController(fixture());
      const app = mount(controller, new RecordingBoardHost());
      requiredButton("compact-menu").click();
      requiredButton("help").click();
      expect(
        [...document.querySelectorAll(".v7-help-ice-folk li")].map(
          (node) => node.textContent,
        ),
      ).toEqual(
        ICE_FOLK_HELP_RULES_V7.map(
          ([name, sentence]) => `${name}: ${sentence}`,
        ),
      );
      app.destroy();
    }
    // A match without an Ice Folk seat has no Ice Folk Help.
    document.body.innerHTML = '<div id="app"></div>';
    const martian = new FixtureController(martianUiFixtureV7());
    const app = mount(martian, new RecordingBoardHost());
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-ice-folk")).toBe(null);
    app.destroy();
  });

  it("names Deep Winter, Brittle and the Ice Folk units in the technology tree", () => {
    const app = mount(
      new FixtureController(iceFolkUiFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("tech").click();
    const unlocks = (tech: string): (string | null)[] => {
      requiredButton(`tech-${tech}`).click();
      return [...document.querySelectorAll(".v7-tech-unlocks li")].map(
        (item) => item.textContent,
      );
    };
    expect(
      requiredButton("tech-fortification").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Deep Winter");
    expect(unlocks("fortification")).toEqual([DEEP_WINTER_UNLOCK_TEXT_V7]);
    expect(
      requiredButton("tech-explosives").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Brittle");
    expect(unlocks("explosives")).toEqual(
      expect.arrayContaining([BRITTLE_UNLOCK_TEXT_V7]),
    );
    expect(unlocks("administration")).toContain(
      iceFolkRoleUnlockTextV7("CAPTAIN"),
    );
    expect(unlocks("drill")).toContain(iceFolkRoleUnlockTextV7("GUARD"));
    app.destroy();
    const witch = recruitmentRolePresentationV7("CAPTAIN", "ICE_FOLK");
    expect(witch.label).toBe(label("CAPTAIN"));
    expect(witch.abilities.some((line) => line.startsWith("Cold Snap:"))).toBe(
      true,
    );
  });
});

function chipText(status: string): string | null {
  return (
    document.querySelector(
      `.v7-selection-dock .v7-identity [data-unit-status="${status}"]`,
    )?.textContent ?? null
  );
}

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

type PublicUnit = NonNullable<Ruleset7BrowserSnapshot["view"]>["units"][number];

function unitAt(controller: FixtureController, at: CoordV7): PublicUnit {
  return required(
    controller
      .snapshot()
      .view?.units.find((item) => item.at.x === at.x && item.at.y === at.y),
  );
}

function selectUnitAt(
  controller: FixtureController,
  host: RecordingBoardHost,
  at: CoordV7,
): PublicUnit {
  const unit = unitAt(controller, at);
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  return unit;
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
    throw new Error("Required Ice Folk DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
