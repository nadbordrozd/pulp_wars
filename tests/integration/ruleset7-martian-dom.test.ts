// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBeamDownV7,
  previewMindControlV7,
  previewTractorBeamV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
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
  BEAM_DOWN_MOVED_V7,
  DISINTEGRATOR_UNLOCK_TEXT_V7,
  FORCE_FIELDS_UNLOCK_TEXT_V7,
  MARTIAN_HELP_RULES_V7,
  THRALL_INFO_V7,
  brainThrallsTextV7,
  martianRoleUnlockTextV7,
  mindControlPreviewLinesV7,
  mindControlReadyInV7,
  shieldTextV7,
} from "../../src/render/martian-presentation-v7";
import {
  MARTIAN_UI_V7,
  martianUiFieldV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";

// Every Martian number expected below is read from the registry or from a
// public preview of the same view: the balance bead (`pulp_wars-t6s.5`) may
// retune Shields, Attack, slots and the abilities.
const AT = MARTIAN_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "MARTIAN").label;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Martian setup", () => {
  it("offers Martian for every seat and launches the chosen factions", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    for (const seat of [0, 1, 2, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      // The Ice Folk UI (pulp_wars-7g3.6) adds the sixth faction.
      expect([...field.options].map((option) => option.textContent)).toEqual([
        "Human",
        "Undead",
        "Goblin",
        "Dinosaur",
        "Martian",
        "Ice Folk",
      ]);
      // pulp_wars-w5j.1: distinct defaults (Human, Undead, Goblin, Dinosaur).
      expect(field.value).toBe(
        ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"][seat],
      );
    }
    for (const seat of [0, 2]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      field.value = "MARTIAN";
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    // pulp_wars-w5j.1: a second Martian seat is impossible; seat 2 takes
    // the first untaken faction (Human).
    expect(chosen.launched[0]?.factions).toEqual([
      "MARTIAN",
      "UNDEAD",
      "ORIGINAL",
      "DINOSAUR",
    ]);
    app.destroy();
  });
});

describe("Martian unit dock", () => {
  it("shows the Shield, the ray's power, Cooling, a Thrall and a Brain's Thralls", () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const stats = (at: CoordV7) =>
      required(
        view.unitStats.find(
          (entry) => entry.unitId === unitAt(controller, at).id,
        )?.martian,
      );
    selectUnitAt(controller, host, AT.dentedGrunt);
    expect(chipText("shield")).toBe(shieldTextV7(stats(AT.dentedGrunt)));
    // The Shield stat row: current / maximum.
    expect(
      requiredElement('.v7-selection-dock [data-stat="shield"] .v7-stat-value')
        .textContent,
    ).toBe(
      `${stats(AT.dentedGrunt).shield}/${stats(AT.dentedGrunt).shieldMaximum}`,
    );
    expect(
      requiredElement(".v7-selection-dock .v7-faction-chip").textContent,
    ).toBe("Martian");
    selectUnitAt(controller, host, AT.rayGunner);
    expect(chipText("ray-power")).toBe("Full power");
    selectUnitAt(controller, host, AT.coolingGunner);
    expect(chipText("cooling")).toBe("Cooling");
    expect(chipText("ray-power")).toBeNull();
    selectUnitAt(controller, host, AT.thrall);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe("Thrall");
    expect(chipText("thrall")).toBe("Thrall");
    expect(
      requiredElement<HTMLElement>(
        '.v7-selection-dock [data-unit-status="thrall"]',
      ).title,
    ).toContain(THRALL_INFO_V7);
    expect(chipText("shield")).toBeNull();
    // A Thrall cannot be disbanded; its Brain's link is on the board.
    expect(document.querySelector('[data-action="command-disband"]')).toBe(
      null,
    );
    expect(
      boardPlan(host).entries.some(
        (entry) => entry.kind === "LINK" && entry.label === "THRALL_LINK",
      ),
    ).toBe(true);
    selectUnitAt(controller, host, AT.brain);
    const brain = required(stats(AT.brain).mindControl);
    expect(chipText("thralls")).toBe(brainThrallsTextV7(brain));
    // Psychic Command is the Brain's Rally.
    expect(actionLabels()).toContain("Psychic Command");
    // A machine afloat says so, and is no transport.
    selectUnitAt(controller, host, AT.tripodAfloat);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      `${label("CATAPULT")} (afloat)`,
    );
    app.destroy();
  });

  it("counts a Martian city in slots", () => {
    const controller = new FixtureController(
      martianUiFieldV7(
        [
          { seat: 0, role: "KNIGHT", at: { x: 8, y: 7 } },
          { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
        ],
        {
          homed: [
            { x: 8, y: 7 },
            { x: 7, y: 7 },
          ],
        },
      ),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const used =
      roleMechanicsV7("KNIGHT", "MARTIAN").capacitySlots +
      roleMechanicsV7("FIGHTER", "MARTIAN").capacitySlots;
    expect(
      requiredElement<HTMLElement>('[data-stat="units"]').dataset.capacity,
    ).toBe("slots");
    expect(requiredElement(".v7-city-units").textContent).toMatch(
      new RegExp(`^${used}/\\d+ slots$`),
    );
    app.destroy();
    // With room to train, every production row names its slots (a
    // Mothership takes two).
    document.body.innerHTML = '<div id="app"></div>';
    const roomy = new FixtureController(
      martianUiFieldV7([{ seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } }]),
    );
    const roomyHost = new RecordingBoardHost();
    const second = mount(roomy, roomyHost);
    const roomyView = required(roomy.snapshot().view);
    const roomyCapital = required(
      roomyView.cities.find((city) => city.ownerId === roomyView.viewer.id),
    );
    roomyHost.callbacks?.onSelection({ kind: "CITY", cityId: roomyCapital.id });
    const trained = roomy
      .snapshot()
      .offeredCommands.filter((command) => command.kind === "TRAIN");
    expect(trained.length).toBeGreaterThan(0);
    expect(
      [...document.querySelectorAll<HTMLElement>("[data-slots]")].map((fact) =>
        Number(fact.dataset.slots),
      ),
    ).toEqual(
      trained.map((command) =>
        command.kind === "TRAIN"
          ? roleMechanicsV7(command.role, "MARTIAN").capacitySlots
          : 0,
      ),
    );
    second.destroy();
  });
});

describe("Martian abilities", () => {
  it("beams a unit down: the button, the passenger, then the tile", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const saucer = selectUnitAt(controller, host, AT.saucer);
    const passenger = unitAt(controller, AT.capitalGrunt);
    const button = requiredButton("martian-beam-down");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.click();
    expect(host.lastModel?.interaction.martianPick).toEqual({
      kind: "BEAM_DOWN",
      unitId: saucer.id,
      passengerUnitId: null,
    });
    // The board's only targets are the passengers; the actions step aside.
    const passengers = boardPlan(host).targets;
    expect(passengers.map((target) => target.family)).toEqual([
      "BEAM_DOWN_PASSENGER",
    ]);
    expect(document.querySelector('[data-action="command-disband"]')).toBe(
      null,
    );
    host.callbacks?.onCommand(required(passengers[0]));
    await waitUntil(
      () =>
        host.lastModel?.interaction.martianPick?.kind === "BEAM_DOWN" &&
        host.lastModel.interaction.martianPick.passengerUnitId === passenger.id,
    );
    const preview = required(
      previewBeamDownV7(
        required(controller.snapshot().view),
        saucer.id,
        passenger.id,
      ),
    );
    expect(boardPlan(host).targets.map((target) => target.at)).toEqual(
      preview.destinations,
    );
    expect(
      [...document.querySelectorAll('[data-action^="beam-tile-"]')].map(
        (node) => node.textContent,
      ),
    ).toEqual(preview.destinations.map((at) => `${at.x}, ${at.y}`));
    // Escape steps back to the passenger, then a second one leaves.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.martianPick).toEqual({
      kind: "BEAM_DOWN",
      unitId: saucer.id,
      passengerUnitId: null,
    });
    requiredButton(`beam-passenger-${passenger.id}`).click();
    const first = required(preview.destinations[0]);
    requiredButton(`beam-tile-${first.x}-${first.y}`).click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "BEAM_DOWN",
      unitId: saucer.id,
      passengerUnitId: passenger.id,
      to: first,
    });
    await waitUntil(() =>
      (document.querySelector("#v7-live")?.textContent ?? "").includes(
        `Your ${label("RAIDER")} beamed down a ${label("FIGHTER")}`,
      ),
    );
    expect(host.lastModel?.interaction.martianPick ?? null).toBe(null);
    app.destroy();
  });

  it("takes a weakened enemy with Mind Control, and names why the others cannot be taken", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const brain = selectUnitAt(controller, host, AT.brain);
    const weak = unitAt(controller, AT.weakTarget);
    requiredButton("martian-mind-control").click();
    const preview = required(
      previewMindControlV7(
        required(controller.snapshot().view),
        brain.id,
        weak.id,
      ),
    );
    const choice = requiredButton(`mind-control-${weak.id}`);
    expect(choice.getAttribute("aria-label")).toContain(
      mindControlPreviewLinesV7(
        required(controller.snapshot().view),
        preview,
      )[0],
    );
    expect(
      boardPlan(host).entries.some(
        (entry) =>
          entry.kind === "ABILITY_TARGET" &&
          entry.abilityStyle === "MARTIAN_BLOCKED" &&
          entry.label ===
            `Too healthy (${unitAt(controller, AT.healthyTarget).hp} HP)`,
      ),
    ).toBe(true);
    choice.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "MIND_CONTROL",
      unitId: brain.id,
      targetUnitId: weak.id,
    });
    // The Thrall stands where its victim stood.
    selectUnitAt(controller, host, AT.weakTarget);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe("Thrall");
    // The Brain now recovers: its button is disabled with the reason.
    selectUnitAt(controller, host, AT.brain);
    const view = required(controller.snapshot().view);
    const cooldown = required(
      view.mindControlCooldowns.find((entry) => entry.unitId === brain.id),
    ).turnsRemaining;
    expect(chipText("mind-control-cooldown")).toBe(
      `Recovering: ready in ${mindControlReadyInV7(cooldown)} turns`,
    );
    app.destroy();
  });

  it("pulls a unit with the Tractor Beam from its board target", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const mothership = selectUnitAt(controller, host, AT.mothership);
    const raider = unitAt(controller, AT.pullTarget);
    requiredButton("martian-tractor-beam").click();
    const target = required(
      boardPlan(host).targets.find(
        (candidate) =>
          candidate.at.x === AT.pullTarget.x &&
          candidate.at.y === AT.pullTarget.y,
      ),
    );
    const preview = required(
      previewTractorBeamV7(
        required(controller.snapshot().view),
        mothership.id,
        raider.id,
      ),
    );
    expect(target.pullTo).toEqual(preview.to);
    host.callbacks?.onCommand(target);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "TRACTOR_BEAM",
      unitId: mothership.id,
      targetUnitId: raider.id,
    });
    expect(unitAt(controller, preview.to).id).toBe(raider.id);
    app.destroy();
  });

  it("names why a moved Saucer cannot Beam Down", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const saucer = unitAt(controller, AT.saucer);
    const move = required(
      controller
        .snapshot()
        .offeredCommands.find(
          (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
            command.kind === "MOVE" &&
            command.unitId === saucer.id &&
            command.path.length === 1,
        ),
    );
    await controller.dispatch(move);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: saucer.id });
    const beam = requiredButton("martian-beam-down");
    expect(beam.getAttribute("aria-disabled")).toBe("true");
    expect(beam.getAttribute("aria-label")).toBe(
      `Beam Down unavailable. ${BEAM_DOWN_MOVED_V7}`,
    );
    app.destroy();
  });
});

describe("Martian Help and technology", () => {
  it("lists the Martian rules for every viewer of a match with a Martian seat", () => {
    const rules = () =>
      [...document.querySelectorAll(".v7-help-martian li")].map(
        (item) => item.textContent,
      );
    const app = mount(
      new FixtureController(martianUiFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(rules()).toEqual(
      MARTIAN_HELP_RULES_V7.map(([name, sentence]) => `${name}: ${sentence}`),
    );
    // A Saucer has no Escape, so a Martian viewer is not told of it.
    expect(
      [...document.querySelectorAll(".v7-help-tips li")].some(
        (item) =>
          item.textContent ===
          "A Raider that survives an attack may move again (Escape).",
      ),
    ).toBe(false);
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const goblin = mount(
      new FixtureController(goblinShowcaseFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-martian")).toBe(null);
    goblin.destroy();
  });

  it("names Force Fields, the Disintegrator and the Martian units in the technology tree", () => {
    const app = mount(
      new FixtureController(martianUiFixtureV7()),
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
    ).toBe("Force Fields");
    expect(unlocks("fortification")).toEqual([FORCE_FIELDS_UNLOCK_TEXT_V7]);
    expect(
      requiredButton("tech-explosives").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Disintegrator");
    expect(unlocks("explosives")).toEqual(
      expect.arrayContaining([DISINTEGRATOR_UNLOCK_TEXT_V7]),
    );
    expect(unlocks("sawmilling")).toContain(
      martianRoleUnlockTextV7("CATAPULT"),
    );
    expect(unlocks("scouting")).toContain(martianRoleUnlockTextV7("RAIDER"));
    // The recruit help of a Mothership names its Shield and slots.
    const knight = recruitmentRolePresentationV7("KNIGHT", "MARTIAN");
    expect(knight.label).toBe(label("KNIGHT"));
    expect(knight.restrictions).toContain(
      `Shield ${roleMechanicsV7("KNIGHT", "MARTIAN").shield}: takes damage before HP and recharges at the start of your turn.`,
    );
    app.destroy();
  });
});

function chipText(status: string): string | null {
  return (
    document.querySelector(
      `.v7-selection-dock .v7-identity [data-unit-status="${status}"]`,
    )?.textContent ?? null
  );
}

function actionLabels(): (string | null)[] {
  return [
    ...document.querySelectorAll(".v7-selection-dock .v7-action-label"),
  ].map((node) => node.textContent);
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
    throw new Error("Required Martian DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
