// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
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
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  blackoutPublicFixtureV7,
  horseArcherPublicFixtureV7,
} from "../fixtures/ruleset7-tactical-ui";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Ruleset 7 tactical DOM controls", () => {
  it("distinguishes unused from legal Horse Archer shots and explains the first-shot lock", async () => {
    const fixture = horseArcherPublicFixtureV7();
    const controller = new TacticalFixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const horseArcher = required(
      controller
        .snapshot()
        .view?.units.find(
          (unit) =>
            unit.ownerId === unitOwner(controller) &&
            unit.role === "HORSE_ARCHER",
        ),
    );
    host.callbacks?.onSelection({ kind: "UNIT", unitId: horseArcher.id });
    expect(document.body.textContent).toContain("Two-shot activation");
    expect(document.body.textContent).toContain(
      "0 attacks used · 2 unused · 2 currently legal",
    );

    const firstShot = required(
      controller
        .snapshot()
        .offeredCommands.find(
          (command) =>
            command.kind === "ATTACK" && command.unitId === horseArcher.id,
        ),
    );
    expect((await controller.dispatch(firstShot)).accepted).toBe(true);
    expect(document.body.textContent).toContain(
      "1 attacks used · 1 unused · 1 currently legal",
    );
    expect(document.body.textContent).toContain(
      "This unit cannot move or use another action; other units remain available.",
    );
    expect(
      controller
        .snapshot()
        .offeredCommands.some(
          (command) =>
            command.kind === "MOVE" && command.unitId === horseArcher.id,
        ),
    ).toBe(false);
    app.destroy();
  });

  it("dispatches a single legal Blackout city directly", async () => {
    const fixture = blackoutPublicFixtureV7();
    const controller = new TacticalFixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const saboteur = required(
      controller
        .snapshot()
        .view?.units.find((unit) => unit.role === "SABOTEUR"),
    );
    host.callbacks?.onSelection({ kind: "UNIT", unitId: saboteur.id });
    requiredButton("blackout").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]?.kind).toBe("BLACKOUT_CITY");
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
  return new Ruleset7DomAppView(
    document,
    required(document.querySelector<HTMLElement>("#app")),
    controller,
    { boardHost: host, settingsStorage: null },
  );
}

function requiredButton(action: string): HTMLButtonElement {
  const result = document.querySelector<HTMLButtonElement>(
    `[data-action="${action}"]`,
  );
  if (result === null) throw new Error(`Action ${action} missing`);
  return result;
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
