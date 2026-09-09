// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
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
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  blackoutPublicFixtureV7,
  defectionPublicFixtureV7,
  pursuitPublicFixtureV7,
  pursuitRewardPublicFixtureV7,
} from "../fixtures/ruleset7-tactical-ui";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Ruleset 7 tactical DOM controls", () => {
  it("highlights one Defection target, traps ordered city choice, and dispatches once", async () => {
    const fixture = defectionPublicFixtureV7(true);
    const controller = new TacticalFixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const envoy = required(
      controller
        .snapshot()
        .view?.units.find(
          (unit) =>
            unit.role === "ENVOY" && unit.ownerId === unitOwner(controller),
        ),
    );
    host.callbacks?.onSelection({ kind: "UNIT", unitId: envoy.id });
    requiredButton("defection").click();
    const model = required(host.lastModel);
    expect(model.interaction.tacticalTargetMode).toEqual({
      kind: "DEFECTION",
      sourceUnitId: envoy.id,
    });
    const plan = buildBoardRenderPlanV7(
      model.view,
      model.offeredCommands,
      model.interaction,
    );
    const target = required(
      plan.targets.find((candidate) => candidate.family === "DEFECTION"),
    );
    expect(
      plan.targets.filter((candidate) => candidate.family === "DEFECTION"),
    ).toHaveLength(1);
    host.callbacks?.onCommand(target);
    await Promise.resolve();
    const modal = document.querySelector<HTMLElement>(
      '[data-v7-region="defection-home-city-choice"]',
    );
    expect(modal?.getAttribute("aria-modal")).toBe("true");
    const cityButtons = [
      ...(modal?.querySelectorAll<HTMLButtonElement>(
        '[data-action^="defection-city-"]',
      ) ?? []),
    ];
    expect(cityButtons.length).toBeGreaterThan(1);
    expect(cityButtons.map((button) => button.textContent)).toEqual(
      [...cityButtons]
        .sort(
          (left, right) =>
            Number(left.dataset.action?.split("-").at(-1)) -
            Number(right.dataset.action?.split("-").at(-1)),
        )
        .map((button) => button.textContent),
    );
    expect(cityButtons[0]?.textContent).toContain("capacity");
    expect(cityButtons[0]?.textContent).toContain("assigned");
    expect(cityButtons[0]?.textContent).toContain("reserved");
    expect(modal?.textContent).toContain("next accepted End Turn");
    expect(modal?.textContent).toContain("first later Start Turn");
    cityButtons[0]?.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({
      kind: "OFFER_DEFECTION",
      unitId: envoy.id,
    });
    expect(controller.snapshot().view?.defectionStatuses[0]).toMatchObject({
      visibility: "FULL",
      phase: "WAITING_FOR_REPLY",
    });
    app.destroy();
  });

  it("keeps targeting keyboard-first and traps chooser focus without duplicate dispatch", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const fixture = defectionPublicFixtureV7(true);
    const controller = new TacticalFixtureController(fixture.state);
    const host = new CanvasBoardHostV7(document);
    const app = mount(controller, host);
    const source = required(
      controller
        .snapshot()
        .view?.units.find(
          (unit) =>
            unit.role === "ENVOY" && unit.ownerId === unitOwner(controller),
        ),
    );
    host.activate(source.at);
    requiredButton("defection").click();
    await Promise.resolve();
    const canvas = required(
      document.querySelector<HTMLCanvasElement>("canvas"),
    );
    expect(document.activeElement).toBe(canvas);
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await Promise.resolve();
    const modal = required(
      document.querySelector<HTMLElement>(
        '[data-v7-region="defection-home-city-choice"]',
      ),
    );
    const cityButtons = [
      ...modal.querySelectorAll<HTMLButtonElement>(
        '[data-action^="defection-city-"]',
      ),
    ];
    const first = required(cityButtons[0]);
    const last = required(cityButtons.at(-1));
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    expect(document.activeElement).toBe(first);
    first.click();
    first.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted).toHaveLength(1);
    app.destroy();
  });

  it("dispatches the single Defection home city and single Blackout city directly", async () => {
    for (const fixture of [
      defectionPublicFixtureV7(false),
      blackoutPublicFixtureV7(),
    ]) {
      document.body.innerHTML = '<div id="app"></div>';
      const controller = new TacticalFixtureController(fixture.state);
      const host = new RecordingBoardHost();
      const app = mount(controller, host);
      const role = fixture.state.units[0]?.role;
      const source = required(
        controller.snapshot().view?.units.find((unit) => unit.role === role),
      );
      host.callbacks?.onSelection({ kind: "UNIT", unitId: source.id });
      const action = role === "ENVOY" ? "defection" : "blackout";
      requiredButton(action).click();
      if (role === "ENVOY") {
        const model = required(host.lastModel);
        const target = required(
          buildBoardRenderPlanV7(
            model.view,
            model.offeredCommands,
            model.interaction,
          ).targets.find((candidate) => candidate.family === "DEFECTION"),
        );
        host.callbacks?.onCommand(target);
      }
      await waitUntil(() => controller.accepted.length === 1);
      expect(document.querySelector(".v7-defection-choice")).toBeNull();
      expect(controller.accepted[0]?.kind).toBe(
        role === "ENVOY" ? "OFFER_DEFECTION" : "BLACKOUT_CITY",
      );
      app.destroy();
    }
  });

  it("auto-selects the engine-opened global Pursuit and leaves End Pursuit reachable", async () => {
    const fixture = pursuitPublicFixtureV7();
    const controller = new TacticalFixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const pursuit = controller
      .snapshot()
      .offeredCommands.find((command) => command.kind === "END_PURSUIT");
    if (pursuit?.kind !== "END_PURSUIT")
      throw new Error("Pursuit fixture missing global End Pursuit");
    expect(host.lastModel?.interaction.selectedUnitId).toBe(pursuit.unitId);
    expect(document.body.textContent).toContain("1 attacks used");
    expect(document.body.textContent).toContain("2 remaining of 3");
    requiredButton("command-end_pursuit").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]?.kind).toBe("END_PURSUIT");
    expect(
      controller
        .snapshot()
        .offeredCommands.some((command) => command.kind === "END_PURSUIT"),
    ).toBe(false);
    app.destroy();
  });

  it("keeps a mandatory city reward ahead of Pursuit, then resumes the open sequence", async () => {
    const fixture = pursuitRewardPublicFixtureV7();
    const controller = new TacticalFixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    expect(
      document.querySelector('[data-v7-region="mandatory-reward"]'),
    ).not.toBeNull();
    expect(host.lastModel?.interaction.selectedUnitId).toBeNull();
    expect(
      controller
        .snapshot()
        .offeredCommands.every(
          (command) => command.kind === "CHOOSE_CITY_REWARD",
        ),
    ).toBe(true);
    requiredButton("reward-survey").click();
    await waitUntil(
      () =>
        controller.accepted.length === 1 &&
        host.lastModel?.interaction.selectedUnitId !== null,
    );
    expect(controller.accepted[0]?.kind).toBe("CHOOSE_CITY_REWARD");
    expect(
      document.querySelector('[data-v7-region="mandatory-reward"]'),
    ).toBeNull();
    expect(
      controller
        .snapshot()
        .offeredCommands.some((command) => command.kind === "END_PURSUIT"),
    ).toBe(true);
    expect(document.body.textContent).toContain("2 remaining of 3");
    app.destroy();
  });
});

class TacticalFixtureController implements Ruleset7ControllerPortV7 {
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
    this.#snapshot = snapshotOf(state);
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

  async dispatch(command: CommandV7): Promise<Ruleset7DispatchResult> {
    if (
      !this.#snapshot.offeredCommands.some(
        (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
      )
    )
      return { accepted: false, reason: "NOT_OFFERED" };
    const beforeState = this.#state;
    const beforeView = required(this.#snapshot.view);
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
    this.#snapshot = snapshotOf(result.state);
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
  }

  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "Fixture is already launched",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "Fixture has no AI runner",
    });
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => ({
    ok: false,
    code: "CONTROLLER_DESTROYED",
    diagnostic: "Fixture restart disabled",
  });
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => false;
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({
      ok: false,
      reason: "NO_ACTIVE_MATCH",
    });
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

function snapshotOf(state: GameStateV7): Ruleset7BrowserSnapshot {
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
}

function mount(
  controller: TacticalFixtureController,
  host: BoardHostV7,
): Ruleset7DomAppView {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("App root missing");
  return new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
}

function requiredButton(action: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(
    `[data-action="${action}"]`,
  );
  if (button === null) throw new Error(`Action ${action} missing`);
  return button;
}

function unitOwner(controller: TacticalFixtureController): number {
  return required(controller.snapshot().view).viewer.id;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required tactical DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
