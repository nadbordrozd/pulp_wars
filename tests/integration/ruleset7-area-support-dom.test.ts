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
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  AREA_SUPPORT_SCENES_V7,
  HUMAN_TEND_V7,
  humanTendFixtureV7,
} from "../fixtures/v7-area-support-ui";

/**
 * Bead pulp_wars-621 (docs/ui/BOARD_TARGETING.md section 2.1): an area
 * support has one button. Hovering or focusing it makes its recipients'
 * marks prominent on the board; the marked units are never targets and the
 * dock never lists them.
 */

const COORDINATE = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("area support buttons and their board marks", () => {
  for (const scene of AREA_SUPPORT_SCENES_V7)
    it(`${scene.name}: hover and focus make the recipients prominent; one button, no list`, async () => {
      const controller = new FixtureController(scene.state());
      const host = new RecordingBoardHost();
      const app = mount(controller, host);
      const actor = selectUnitAt(controller, host, scene.actor);
      const action = `command-${scene.kind.toLowerCase()}`;
      const button = requiredButton(action);
      expect(button.dataset.areaSupport).toBe("true");
      expect(
        document.querySelectorAll(`[data-action="${action}"]`).length,
      ).toBe(1);
      const marks = () =>
        boardPlan(host).entries.filter(
          (entry) => entry.areaSupport !== undefined,
        );
      // At rest: heals are marked quietly, a Rally not at all.
      expect(host.lastModel?.interaction.areaSupportFocus).toBeUndefined();
      const resting = marks();
      if (scene.kind === "TEND_WOUNDED") {
        expect(resting.length).toBeGreaterThan(0);
        for (const entry of resting) expect(entry.areaSupport).toBe("QUIET");
      } else
        expect(
          resting.filter((entry) => entry.abilityStyle === "RALLY"),
        ).toEqual([]);
      const dockBefore = dockActions();
      for (const [enter, leave] of [
        ["pointerenter", "pointerleave"],
        ["focus", "blur"],
      ] as const) {
        button.dispatchEvent(new Event(enter));
        expect(host.lastModel?.interaction.areaSupportFocus).toEqual({
          unitId: actor.id,
          kind: scene.kind,
        });
        const shown = marks();
        expect(shown.length).toBeGreaterThan(0);
        for (const entry of shown) {
          expect(entry.areaSupport).toBe("PROMINENT");
          expect(entry.abilityStyle).toBe(
            scene.kind === "RALLY" ? "RALLY" : "TEND",
          );
          expect(entry.label ?? "").not.toMatch(COORDINATE);
        }
        // The board changed; the dock did not, and it lists no recipient.
        expect(dockActions()).toEqual(dockBefore);
        expect(requiredButton(action)).toBe(button);
        button.dispatchEvent(new Event(leave));
        expect(host.lastModel?.interaction.areaSupportFocus).toBeUndefined();
        expect(marks()).toEqual(resting);
      }
      expect(
        dockBefore.filter((name) => /-\d+$/.test(name)),
        "no button per recipient",
      ).toEqual([]);
      // The marked units are not map targets.
      button.dispatchEvent(new Event("pointerenter"));
      const plan = boardPlan(host);
      for (const entry of marks())
        expect(
          plan.targets.some(
            (target) =>
              target.at.x === entry.at.x && target.at.y === entry.at.y,
          ),
        ).toBe(false);
      // The one button uses the ability on all of them.
      button.click();
      await waitUntil(() => controller.accepted.length === 1);
      expect(controller.accepted).toEqual([
        { kind: scene.kind, unitId: actor.id },
      ]);
      expect(host.lastModel?.interaction.areaSupportFocus).toBeUndefined();
      app.destroy();
    });

  it("a click on a marked unit selects it, as on any own unit: nothing is healed", () => {
    const controller = new FixtureController(humanTendFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const captain = selectUnitAt(controller, host, HUMAN_TEND_V7.captain);
    requiredButton("command-tend_wounded").dispatchEvent(
      new Event("pointerenter"),
    );
    expect(host.lastModel?.interaction.areaSupportFocus?.unitId).toBe(
      captain.id,
    );
    const fighter = selectUnitAt(
      controller,
      host,
      HUMAN_TEND_V7.woundedFighter,
    );
    expect(host.lastModel?.interaction.selectedUnitId).toBe(fighter.id);
    expect(host.lastModel?.interaction.areaSupportFocus).toBeUndefined();
    expect(controller.accepted).toEqual([]);
    expect(
      boardPlan(host).entries.filter(
        (entry) => entry.areaSupport !== undefined,
      ),
    ).toEqual([]);
    expect(document.querySelector('[data-action="command-tend_wounded"]')).toBe(
      null,
    );
    app.destroy();
  });
});

function dockActions(): string[] {
  return [
    ...requiredElement<HTMLElement>(".v7-selection-dock").querySelectorAll(
      "button",
    ),
  ].map((node) => node.dataset.action ?? "");
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
    throw new Error("Required area support DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
