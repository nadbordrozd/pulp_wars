// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
  Ruleset7DispatchResult,
} from "../../src/app/index";
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
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  buildBoardRenderPlanV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  AT_SEA_MOVE_TEXT_V7,
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { goblinArenaV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  READY_ACTIVATION_V7,
  embarkedLandingV7,
} from "../fixtures/v7-naval-builders";

// Revision 16b (`pulp_wars-zsa`): the landing preview composes MOVE then
// DISEMBARK for a "Move 1, then land" cell, and never lands after an
// interrupted Move (docs/product/RULESET_7_REVISION_16.md section 5.4).

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 revision-16 landing preview in the DOM app", () => {
  it("shows the landing legend and at-sea text, and sends MOVE then DISEMBARK", async () => {
    const fixture = embarkedLandingV7();
    const port = new FixturePort(fixture.state);
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(document, requiredRoot(), port, {
      boardHost: host,
      settingsStorage: null,
    });
    host.callbacks?.onSelection({ kind: "UNIT", unitId: fixture.unitId });
    const legend = document.querySelector(".v7-landing-legend");
    expect(
      Array.from(
        legend?.querySelectorAll("[data-landing-marker]") ?? [],
        (item) => [
          (item as HTMLElement).dataset.landingMarker,
          item.textContent,
        ],
      ),
    ).toEqual([
      ["now", "Land now"],
      ["after-move", "Move 1, then land"],
    ]);
    expect(AT_SEA_MOVE_TEXT_V7).toBe("At sea: Move 2; landing uses 1 of it.");
    const target = landingTarget(port, fixture.unitId, fixture.afterMove);
    expect(target).toMatchObject({
      family: "LANDING_AFTER_MOVE",
      command: { kind: "MOVE", path: [fixture.water[0]] },
      followUp: { kind: "DISEMBARK", at: fixture.afterMove },
    });
    host.callbacks?.onCommand(target);
    await waitUntil(() => port.dispatched.length === 2);
    expect(port.dispatched).toEqual([target.command, target.followUp]);
    expect(
      port.state.units.find((unit) => unit.id === fixture.unitId),
    ).toMatchObject({ form: "LAND", at: fixture.afterMove });
    app.destroy();
  });

  it("does not send DISEMBARK when the Move is interrupted before its water cell", async () => {
    const fixture = embarkedLandingV7();
    // A hidden embarked hostile on the first water cell stops the Move at
    // once: the unit stays on its start cell with no step taken.
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (hostile === undefined) throw new Error("hostile unit missing");
    const state = checkedV7({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.state.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !same(at, fixture.water[0]),
              ),
            }
          : player,
      ),
      units: fixture.state.units.map((unit) =>
        unit.id === hostile.id
          ? {
              ...unit,
              role: "FIGHTER" as const,
              form: "EMBARKED" as const,
              at: fixture.water[0],
              hp: 10,
              maxHp: 10,
              activation: READY_ACTIVATION_V7,
            }
          : unit,
      ),
    });
    const port = new FixturePort(state);
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(document, requiredRoot(), port, {
      boardHost: host,
      settingsStorage: null,
    });
    host.callbacks?.onSelection({ kind: "UNIT", unitId: fixture.unitId });
    // The unexplored first water cell still offers the one-cell Move, so the
    // landing beyond it is previewed.
    const target = landingTarget(port, fixture.unitId, fixture.afterMove);
    host.callbacks?.onCommand(target);
    await waitUntil(() => port.dispatched.length === 1 && !port.busy);
    await settle();
    expect(port.dispatched).toEqual([target.command]);
    expect(
      port.state.units.find((unit) => unit.id === fixture.unitId),
    ).toMatchObject({ form: "EMBARKED", at: fixture.start });
    app.destroy();
  });
});

// Revisions 6 and 16 (`pulp_wars-0ao.15`): landing ends the activation, so
// the dock of a landed unit offers no action (and no map target).
describe("Ruleset 7 landed unit dock", () => {
  it("shows no actionable button for a landed Goblin next to an enemy", async () => {
    const water = [at(0, 0), at(0, 1), at(0, 2), at(1, 0)];
    const landing = at(1, 1);
    const arena = (form: "EMBARKED" | "LAND", where: CoordV7) =>
      goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: where, form },
          { seat: 1, role: "FIGHTER", at: at(2, 1) },
        ],
        { water },
      );
    const actionable = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".v7-selection-dock .v7-context-actions button",
        ),
      )
        .filter((item) => item.getAttribute("aria-disabled") !== "true")
        .map((item) => item.dataset.action);
    // Control: the same Goblin standing ready on the landing cell has
    // Kaboom and Wait buttons.
    const ready = arena("LAND", landing);
    const readyPort = new FixturePort(ready);
    const readyHost = new CapturingBoardHost();
    const readyApp = new Ruleset7DomAppView(
      document,
      requiredRoot(),
      readyPort,
      { boardHost: readyHost, settingsStorage: null },
    );
    readyHost.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAtV7(ready, landing).id,
    });
    expect(actionable()).toEqual(
      expect.arrayContaining(["command-kaboom", "command-wait"]),
    );
    readyApp.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const state = arena("EMBARKED", at(0, 1));
    const unitId = unitAtV7(state, at(0, 1)).id;
    const port = new FixturePort(state);
    const host = new CapturingBoardHost();
    const app = new Ruleset7DomAppView(document, requiredRoot(), port, {
      boardHost: host,
      settingsStorage: null,
    });
    host.callbacks?.onSelection({ kind: "UNIT", unitId });
    const result = await port.dispatch({
      kind: "DISEMBARK",
      unitId,
      at: landing,
    });
    expect(result.accepted).toBe(true);
    host.callbacks?.onSelection({ kind: "UNIT", unitId });
    expect(port.state.units.find((unit) => unit.id === unitId)).toMatchObject({
      form: "LAND",
      at: landing,
    });
    expect(actionable()).toEqual([]);
    expect(
      port
        .snapshot()
        .offeredCommands.filter(
          (command) => "unitId" in command && command.unitId === unitId,
        ),
    ).toEqual([]);
    app.destroy();
  });
});

function landingTarget(
  port: FixturePort,
  unitId: number,
  at: CoordV7,
): MapCommandTargetV7 {
  const snapshot = port.snapshot();
  if (snapshot.view === null) throw new Error("view missing");
  const plan = buildBoardRenderPlanV7(snapshot.view, snapshot.offeredCommands, {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
  });
  const target = plan.targets.find((candidate) => same(candidate.at, at));
  if (target === undefined) throw new Error("landing target missing");
  return target;
}

/** An in-memory human-turn controller over a fixed engine state. */
class FixturePort implements Ruleset7ControllerPortV7 {
  state: GameStateV7;
  busy = false;
  readonly dispatched: CommandV7[] = [];
  readonly #listeners = new Set<(snapshot: Ruleset7BrowserSnapshot) => void>();
  readonly #boundaries = new Set<(value: Ruleset7AcceptedBoundary) => void>();

  constructor(state: GameStateV7) {
    this.state = state;
  }

  snapshot(): Ruleset7BrowserSnapshot {
    const view = viewForV7(this.state, this.state.humanPlayerId);
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
  subscribe(listener: (snapshot: Ruleset7BrowserSnapshot) => void) {
    this.#listeners.add(listener);
    listener(this.snapshot());
    return () => this.#listeners.delete(listener);
  }
  subscribeAcceptedBoundary(
    listener: (value: Ruleset7AcceptedBoundary) => void,
  ) {
    this.#boundaries.add(listener);
    return () => this.#boundaries.delete(listener);
  }
  async dispatch(command: CommandV7): Promise<Ruleset7DispatchResult> {
    this.busy = true;
    this.dispatched.push(command);
    const before = this.state;
    const applied = applyCommandV7(before, before.humanPlayerId, command);
    if (!applied.accepted) {
      this.busy = false;
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: applied.error,
      };
    }
    this.state = applied.state;
    const beforeView = viewForV7(before, before.humanPlayerId);
    const afterView = viewForV7(this.state, this.state.humanPlayerId);
    const playerEvents = projectEventsV7(
      before,
      this.state,
      this.state.humanPlayerId,
      applied.events,
    );
    for (const listener of this.#boundaries)
      listener({ actor: "HUMAN", beforeView, afterView, playerEvents });
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
    this.busy = false;
    return { accepted: true, beforeView, afterView, playerEvents };
  }
  launch(): never {
    throw new Error("fixture launch unavailable");
  }
  async resume() {
    return true;
  }
  async returnToMenu() {
    return false;
  }
  async progressAiTurns() {
    const view = this.snapshot().view;
    if (view === null) throw new Error("view missing");
    return {
      ok: true as const,
      acceptedCommands: 0,
      playerEventBatches: [],
      view,
      policySlices: 0,
      maximumSliceMilliseconds: 0,
    };
  }
  restart(): never {
    throw new Error("fixture restart unavailable");
  }
  async deleteStoredSave() {
    return true;
  }
  setFastForward(): void {}
  exportSafeLog() {
    return { ok: true as const, filename: "fixture.json", source: "{}" };
  }
  exportDebugBundle() {
    return { ok: false as const, reason: "NO_ACTIVE_MATCH" as const };
  }
}

class CapturingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  model: BoardHostModelV7 | null = null;

  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    container.replaceChildren(canvas);
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  resetInspectionCycle(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {
    this.callbacks = null;
    this.model = null;
  }
}

function at(x: number, y: number): CoordV7 {
  return { x, y };
}

function requiredRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  return root;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
