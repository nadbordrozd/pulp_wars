// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  applyCommandV7,
  createPlayableGameV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
  type Ruleset7DispatchResult,
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
  cityGazetteerV7,
  cityNameV7,
} from "../../src/render/city-names-presentation-v7";

/**
 * City names in the browser interface (bead `pulp_wars-2yc.30`): the city
 * panel's title, the notice of a village taken, and no city id or tile in
 * any text the player reads.
 */

const SETUP: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 9,
  width: 16,
  height: 16,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "GOBLIN"],
  mapType: "PANGEA",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: false,
};

/** A new match with a ready Human unit standing on a neutral village. */
function stagedMatch(): {
  readonly state: GameStateV7;
  readonly unitId: number;
  readonly villageName: string;
} {
  const created = createPlayableGameV7(SETUP);
  if (!created.ok) throw new Error("city names fixture failed to generate");
  const base = created.state;
  const human = base.humanPlayerId;
  const village = base.board.tiles.find((tile) => tile.site === "VILLAGE");
  const unit = base.units.find((candidate) => candidate.ownerId === human);
  if (village === undefined || unit === undefined)
    throw new Error("city names fixture is missing a piece");
  const name = cityGazetteerV7(SETUP).get(`${village.at.x},${village.at.y}`);
  if (name === undefined) throw new Error("the village has no name");
  return {
    unitId: unit.id,
    villageName: name.name,
    state: {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human),
      players: base.players.map((player) =>
        player.id === human
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              at: village.at,
              captureEligible: true,
              activation: {
                ...candidate.activation,
                moved: false,
                attacked: false,
              },
            }
          : candidate,
      ),
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 city names in the interface", () => {
  it("titles the city panel with the name, with Capital under it", () => {
    const { state } = stagedMatch();
    const controller = new FixtureController(state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    const name = cityNameV7(view, capital);
    expect(name).toMatch(/^[A-Z][a-z]{3,9}$/);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(name);
    expect(
      requiredElement(".v7-selection-dock .v7-identity-kind").textContent,
    ).toBe("Capital");
    expect(dock.textContent).not.toMatch(/\bc\d+\b|\bcity \d/i);
    app.destroy();
  });

  it("announces a village taken by its name and titles the new city with it", async () => {
    const { state, unitId, villageName } = stagedMatch();
    const controller = new FixtureController(state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    host.callbacks?.onSelection({ kind: "UNIT", unitId });
    requiredElement<HTMLButtonElement>(
      '[data-action="command-capture"]',
    ).click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(() => document.querySelector("[data-toast-id]") !== null);
    const toast = requiredElement("[data-toast-id]").textContent ?? "";
    expect(toast.split(" · ")[0]).toBe(`${villageName} founded`);
    expect(toast).not.toMatch(/\bc\d+\b|\bcity \d|\d+\s*,\s*\d+/i);
    const view = required(controller.snapshot().view);
    const founded = required(
      view.cities.find((city) => cityNameV7(view, city) === villageName),
    );
    expect(founded.ownerId).toBe(view.viewer.id);
    host.callbacks?.onSelection({ kind: "CITY", cityId: founded.id });
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      villageName,
    );
    expect(
      requiredElement(".v7-selection-dock .v7-identity-kind").textContent,
    ).toBe("City");
    // The board model's cities carry the same names for the canvas.
    expect(host.lastModel?.view.cities.map((city) => city.id)).toContain(
      founded.id,
    );
    app.destroy();
  });
});

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
    diagnostic: "No launch in this fixture",
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

function requiredElement<T extends Element>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (result === null) throw new Error(`${selector} missing`);
  return result;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required city names fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
