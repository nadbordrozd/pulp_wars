// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
} from "../../src/app/index";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { tribePluralV7 } from "../../src/render/tribe-stars-presentation-v7";
import { scorePerfectionEndV7, scoreUiStateV7 } from "../fixtures/v7-score-ui";

/**
 * Players named by tribe, never "Player N" (bead pulp_wars-2yc.56), and a
 * leaderboard row of the same shape for every faction (bead
 * pulp_wars-mch9.28): the leaderboard, the results, the turn banner and the
 * turn strip, a toast and the live log, and the setup rows. Hand-built
 * states of tests/fixtures/v7-score-ui.ts; no match is played.
 */

const SEAT_NUMBER = /Player\s*\d|\(you\)/;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("players named by tribe", () => {
  it("names the leaderboard rows You and the rivals' tribes, with no faction chip or Favour", () => {
    const state = scoreUiStateV7("DOMINATION", 12);
    const view = viewForV7(state, state.humanPlayerId);
    const app = mount(snapshotOf(view));
    openLeaderboard();
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ];
    expect(rows.map((row) => name(row))).toEqual(
      view.leaderboard.map((entry) =>
        entry.isViewer ? "You" : tribePluralV7(entry.faction),
      ),
    );
    const list = required(".v7-leaderboard");
    expect(list.textContent).not.toMatch(SEAT_NUMBER);
    expect(list.querySelector(".v7-faction-chip")).toBeNull();
    expect(list.querySelector(".v7-favour-icon")).toBeNull();
    // Every row: the name, then the same stats, then the score.
    const shapes = rows.map((row) =>
      [...row.querySelectorAll<HTMLElement>(".v7-leaderboard-stat")]
        .map((stat) => stat.title)
        .join(","),
    );
    expect(new Set(shapes)).toEqual(new Set(["Cities,Units"]));
    app.destroy();
  });

  it("numbers two rival seats of one tribe, and only those", () => {
    const state = scoreUiStateV7("DOMINATION", 12);
    const view = viewForV7(state, state.humanPlayerId);
    const rivals = view.players.filter((p) => p.id !== view.viewer.id);
    const twin = rivals[0]?.faction ?? "GOBLIN";
    const doubled = sameFaction(view, rivals[1]?.id ?? -1, twin);
    const app = mount(snapshotOf(doubled));
    openLeaderboard();
    const names = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ].map((row) => name(row));
    const plural = tribePluralV7(twin);
    expect(names).toContain(`${plural} (1)`);
    expect(names).toContain(`${plural} (2)`);
    expect(names).toContain("You");
    expect(names.filter((entry) => entry === plural)).toEqual([]);
    app.destroy();
  });

  it("names the winner and every result row by tribe", () => {
    const state = scorePerfectionEndV7(false);
    const view = viewForV7(state, state.humanPlayerId);
    const app = mount({ ...snapshotOf(view), phase: "COMPLETE" });
    expect(required('[data-v7-region="score-verdict"]').textContent).toMatch(
      /^The Goblins win with /,
    );
    const names = [
      ...document.querySelectorAll<HTMLElement>(".v7-result-seat-name"),
    ].map((node) => node.textContent);
    expect(names).toContain("You");
    for (const entry of names) expect(entry).not.toMatch(/·|Player/);
    expect(required(".v7-results").textContent).not.toMatch(SEAT_NUMBER);
    app.destroy();
  });

  it("names the rival whose turn it is in the banner and the turn strip", () => {
    const state = scoreUiStateV7("DOMINATION", 12);
    const view = viewForV7(state, state.humanPlayerId);
    const index = view.turnOrder.findIndex((id) => id !== view.viewer.id);
    const playing = { ...view, activeSeatIndex: index };
    const rival = required_(
      view.players.find((p) => p.id === view.turnOrder[index]),
    );
    const app = mount({
      ...snapshotOf(playing),
      offeredCommands: [],
      ai: { ...idleAi(), active: true },
    });
    expect(required(".v7-turn-status").textContent).toMatch(
      new RegExp(`^The ${tribePluralV7(rival.faction)} are playing…`),
    );
    const chips = [...document.querySelectorAll<HTMLElement>(".v7-turn-chip")];
    expect(chips.map((chip) => chip.title)).toContain(
      `${tribePluralV7(rival.faction)}, playing now`,
    );
    expect(chips.map((chip) => chip.title)).toContain("You");
    for (const chip of chips) expect(chip.title).not.toMatch(SEAT_NUMBER);
    app.destroy();
  });

  it("toasts and logs a lost city as lost to the rival's tribe", async () => {
    const state = scoreUiStateV7("DOMINATION", 12);
    const view = viewForV7(state, state.humanPlayerId);
    const own = required_(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    const rival = required_(
      view.players.find((player) => player.id !== view.viewer.id),
    );
    const controller = new FixedController(snapshotOf(view));
    const app = new Ruleset7DomAppView(document, required("#app"), controller, {
      boardHost: new QuietBoardHost(),
      settingsStorage: null,
    });
    controller.emit({
      actor: "AI",
      beforeView: view,
      afterView: view,
      playerEvents: {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: view.viewer.id,
        commandIndex: 1,
        events: [
          {
            kind: "CITY_CAPTURED",
            cityId: own.id,
            from: view.viewer.id,
            to: rival.id,
          },
        ] as unknown as readonly PlayerEventV7[],
      },
    });
    const expected = `lost to the ${tribePluralV7(rival.faction)}`;
    await waitUntil(
      () => (document.querySelector(".v7-toast")?.textContent ?? "") !== "",
    );
    expect(required(".v7-toast").textContent).toContain(expected);
    expect(required("#v7-live").textContent).toContain(expected);
    expect(document.body.textContent).not.toMatch(SEAT_NUMBER);
    app.destroy();
  });

  it("labels the setup's opponent rows without seat numbers", () => {
    const app = new Ruleset7DomAppView(
      document,
      required("#app"),
      new FixedController(emptySnapshot()),
      { boardHost: new QuietBoardHost(), settingsStorage: null },
    );
    const count = document.querySelector<HTMLSelectElement>("#v7-ai-count");
    if (count !== null) {
      count.value = "3";
      count.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const labels = [
      ...document.querySelectorAll<HTMLLabelElement>(
        "[data-v7-factions] label",
      ),
    ].map((label) => label.firstChild?.textContent ?? "");
    expect(labels[0]).toBe("Your faction");
    expect(labels.slice(1)).toEqual(
      labels.slice(1).map((_, index) => `Opponent ${index + 1}`),
    );
    expect(labels.length).toBeGreaterThan(1);
    expect(labels.join(" ")).not.toMatch(SEAT_NUMBER);
    app.destroy();
  });
});

function name(row: HTMLElement): string {
  return row.querySelector(".v7-leaderboard-player")?.textContent ?? "";
}

/** The view with `playerId` playing `faction` (players and leaderboard). */
function sameFaction(
  view: PlayerViewV7,
  playerId: number,
  faction: FactionIdV7,
): PlayerViewV7 {
  return {
    ...view,
    players: view.players.map((player) =>
      player.id === playerId ? { ...player, faction } : player,
    ),
    leaderboard: view.leaderboard.map((entry) =>
      entry.playerId === playerId ? { ...entry, faction } : entry,
    ),
  };
}

function openLeaderboard(): void {
  required<HTMLButtonElement>('[data-action="compact-menu"]').click();
  required<HTMLButtonElement>('[data-action="leaderboard"]').click();
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

function snapshotOf(view: PlayerViewV7): Ruleset7BrowserSnapshot {
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

function emptySnapshot(): Ruleset7BrowserSnapshot {
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

function mount(snapshot: Ruleset7BrowserSnapshot): Ruleset7DomAppView {
  return new Ruleset7DomAppView(
    document,
    required("#app"),
    new FixedController(snapshot),
    { boardHost: new QuietBoardHost(), settingsStorage: null },
  );
}

/** One fixed snapshot; a test can hand the view an accepted boundary. */
class FixedController implements Ruleset7ControllerPortV7 {
  readonly #snapshot: Ruleset7BrowserSnapshot;
  readonly #boundaries = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  constructor(snapshot: Ruleset7BrowserSnapshot) {
    this.#snapshot = snapshot;
  }
  emit(boundary: Ruleset7AcceptedBoundary): void {
    for (const subscriber of this.#boundaries) subscriber(boundary);
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    // An AI turn starts from an idle snapshot, as in the real controller.
    if (this.#snapshot.ai.active)
      subscriber({ ...this.#snapshot, ai: idleAi() });
    subscriber(this.#snapshot);
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundaries.add(subscriber);
    return () => this.#boundaries.delete(subscriber);
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "No launch",
  });
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

class QuietBoardHost implements BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
    container.append(document.createElement("canvas"));
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function required_<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing value");
  return value;
}
