// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
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
  FIRST_STEPS_STORAGE_KEY_V7,
  serializeFirstStepsProgressV7,
  setFirstStepsEnabledV7,
} from "../../src/render/first-steps-v7";
import { checkedV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.82 (UI review S1, V10), narrowed by pulp_wars-2yc.87:
 * a tap on the fog opens no dock and keeps no selection (the board gets a
 * quiet tap, its fog puff, instead); a tap on an explored plain tile opens
 * its small terrain dock and keeps the selection, with no quiet tap (no
 * dust puff); a tile that has something to show keeps its dock; a harvest
 * that empties the selected tile deselects it; End Turn glows with nothing
 * useful left, whether or not the coach runs.
 */

const STYLE = readFileSync("src/styles/v7.css", "utf8");

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

class Host implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  readonly quiet: CoordV7[] = [];
  last: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.last = model;
  }
  activate(): void {}
  quietTap(at: CoordV7): void {
    this.quiet.push(at);
  }
  readonly released: CoordV7[] = [];
  releaseCursor(at: CoordV7): void {
    this.released.push(at);
  }
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function snapshotOf(
  state: GameStateV7,
  commands?: readonly CommandV7[],
): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    phase: "ACTIVE",
    view,
    offeredCommands: commands ?? queryPlayerCommandsV7(view),
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
  first: Ruleset7BrowserSnapshot,
  options: { readonly coach?: boolean } = {},
) {
  let snapshot = first;
  const listeners: ((value: Ruleset7BrowserSnapshot) => void)[] = [];
  const host = new Host();
  const stored = new Map<string, string>();
  if (options.coach === false)
    stored.set(
      FIRST_STEPS_STORAGE_KEY_V7,
      serializeFirstStepsProgressV7(setFirstStepsEnabledV7(false)),
    );
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  const app = new Ruleset7DomAppView(
    document,
    root,
    {
      snapshot: () => snapshot,
      subscribe: (listener: (value: Ruleset7BrowserSnapshot) => void) => {
        listeners.push(listener);
        listener(snapshot);
        return () => undefined;
      },
      subscribeAcceptedBoundary: () => () => undefined,
    } as unknown as Ruleset7ControllerPortV7,
    {
      boardHost: host,
      settingsStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => void stored.set(key, value),
        removeItem: (key: string) => void stored.delete(key),
      } as unknown as Storage,
    },
  );
  return {
    app,
    host,
    publish(next: Ruleset7BrowserSnapshot) {
      snapshot = next;
      for (const listener of listeners) listener(next);
    },
  };
}

const dock = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".v7-selection-dock");

/** The fixture with a plain, an unexplored and a fruit tile to tap. */
function scene(): {
  state: GameStateV7;
  plain: CoordV7;
  fog: CoordV7;
  fruit: CoordV7;
} {
  const base = initialV7(71);
  const human = base.players.find((player) => player.id === base.humanPlayerId);
  if (human === undefined) throw new Error("no human");
  const capital = base.cities.find((city) => city.ownerId === human.id);
  if (capital === undefined) throw new Error("no capital");
  const busy = (at: CoordV7): boolean =>
    base.units.some((unit) => same(unit.at, at)) ||
    base.cities.some((city) => same(city.at, at));
  const explored = (at: CoordV7): boolean =>
    human.explored.some((cell) => same(cell, at));
  const land = (terrain: string): boolean =>
    terrain !== "SHALLOW_WATER" && terrain !== "DEEP_WATER";
  const own = base.board.tiles.filter(
    (tile) =>
      tile.territoryCityId === capital.id &&
      tile.site === null &&
      land(tile.terrain) &&
      !busy(tile.at),
  );
  const [plainTile, fruitTile] = own;
  const fog = base.board.tiles.find((tile) => !explored(tile.at));
  if (plainTile === undefined || fruitTile === undefined || fog === undefined)
    throw new Error("no room in the fixture");
  const state = checkedV7({
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, plainTile.at)
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : same(tile.at, fruitTile.at)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: "FRUIT" as const,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile,
      ),
    },
  });
  return { state, plain: plainTile.at, fog: fog.at, fruit: fruitTile.at };
}

describe("the dock of a tile with nothing to show (S1, 2yc.87)", () => {
  it("opens the terrain dock on a plain explored tile, keeps it selected and asks for no quiet tap", () => {
    const { state, plain } = scene();
    const view = viewForV7(state, state.humanPlayerId);
    // Nothing is offered on the plain tile (the fixture's own check).
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => "at" in command && same(command.at, plain),
      ),
    ).toBe(false);
    const { app, host, publish } = mount(snapshotOf(state));
    host.callbacks?.onSelection({ kind: "TILE", at: plain });
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(dock()?.textContent?.toLowerCase()).toContain("grass");
    expect(host.last?.interaction.selection).toEqual({
      kind: "TILE",
      at: plain,
    });
    expect(host.quiet).toEqual([]);
    expect(host.released).toEqual([]);
    // A later render (any accepted command) keeps the plain tile selected.
    publish(snapshotOf(state));
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(host.last?.interaction.selection).toEqual({
      kind: "TILE",
      at: plain,
    });
    expect(host.released).toEqual([]);
    app.destroy();
  });

  it("opens the terrain dock on an explored tile outside the borders", () => {
    const { state, plain } = scene();
    const human = state.players.find(
      (player) => player.id === state.humanPlayerId,
    );
    const outside = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === null &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        !same(tile.at, plain) &&
        !state.units.some((unit) => same(unit.at, tile.at)) &&
        human?.explored.some((cell) => same(cell, tile.at)) === true,
    );
    if (outside === undefined) throw new Error("no explored outside tile");
    const { app, host } = mount(snapshotOf(state));
    host.callbacks?.onSelection({ kind: "TILE", at: outside.at });
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(host.last?.interaction.selection).toEqual({
      kind: "TILE",
      at: outside.at,
    });
    expect(host.quiet).toEqual([]);
    app.destroy();
  });

  it("opens no dock on the fog either", () => {
    const { state, fog } = scene();
    const { app, host } = mount(snapshotOf(state));
    host.callbacks?.onSelection({ kind: "TILE", at: fog });
    expect(dock()).toBeNull();
    expect(host.last?.interaction.selection).toBeNull();
    expect(host.quiet).toEqual([fog]);
    app.destroy();
  });

  it("a tap on a plain tile moves the selection from a unit to the tile", () => {
    const { state, plain } = scene();
    const unit = state.units.find(
      (item) => item.ownerId === state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("no unit");
    const { app, host } = mount(snapshotOf(state));
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(dock()).not.toBeNull();
    host.callbacks?.onSelection({ kind: "TILE", at: plain });
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(host.last?.interaction.selection).toEqual({
      kind: "TILE",
      at: plain,
    });
    expect(host.quiet).toEqual([]);
    app.destroy();
  });

  it("keeps the dock of a tile with a resource, and deselects it once a harvest empties it", () => {
    const { state, fruit } = scene();
    const { app, host, publish } = mount(snapshotOf(state));
    host.callbacks?.onSelection({ kind: "TILE", at: fruit });
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(dock()?.textContent).toContain("Fruit");
    expect(host.last?.interaction.selection).toEqual({
      kind: "TILE",
      at: fruit,
    });
    expect(host.quiet).toEqual([]);
    // The harvest's accepted view: the fruit is gone from the tile.
    const harvested = checkedV7({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, fruit) ? { ...tile, resource: null } : tile,
        ),
      },
    });
    publish(snapshotOf(harvested));
    expect(dock()).toBeNull();
    expect(host.last?.interaction.selection).toBeNull();
    // Not a tap: the board plays no tap cue for it, but lets its cursor go.
    expect(host.quiet).toEqual([]);
    expect(host.released).toEqual([fruit]);
    // Tapped again, the emptied tile opens its plain terrain dock.
    host.callbacks?.onSelection({ kind: "TILE", at: fruit });
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(host.last?.interaction.selection).toEqual({
      kind: "TILE",
      at: fruit,
    });
    expect(host.quiet).toEqual([]);
    app.destroy();
  });
});

describe("the End Turn glow (V10)", () => {
  const endTurn = (): HTMLButtonElement | null =>
    document.querySelector<HTMLButtonElement>('[data-action="end-turn"]');
  const END: CommandV7 = { kind: "END_TURN" };

  it("glows with nothing useful left, the coach off", () => {
    const { state } = scene();
    const { app } = mount(snapshotOf(state, [END]), { coach: false });
    expect(endTurn()?.dataset.nothingLeft).toBe("true");
    expect(endTurn()?.dataset.firstStep).toBeUndefined();
    app.destroy();
  });

  it("stays dark while a unit can still move", () => {
    const { state } = scene();
    const commands = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    );
    expect(commands.some((command) => command.kind === "MOVE")).toBe(true);
    const { app } = mount(snapshotOf(state, commands), { coach: false });
    expect(endTurn()).not.toBeNull();
    expect(endTurn()?.dataset.nothingLeft).toBeUndefined();
    app.destroy();
  });

  it("leaves End Turn to the coach while the coach points at it", () => {
    const { state } = scene();
    const { app } = mount(snapshotOf(state, [END]));
    expect(endTurn()?.dataset.firstStep).toBe("pulse");
    expect(endTurn()?.dataset.nothingLeft).toBeUndefined();
    app.destroy();
  });

  it("uses the coach's ring and pulse, with the pulse only under full motion", () => {
    // The stylesheet: the same outline as the coach, the pulse gated.
    expect(STYLE).toMatch(
      /\.v7-hud-end-turn\[data-first-step\],\n\.v7-hud-end-turn\[data-nothing-left="true"\] \{\n {2}outline: var\(--pw-line-w\) solid var\(--pw-yellow\);/,
    );
    expect(STYLE).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{\n {2}\.v7-app-shell:not\(\[data-motion="reduced"\]\) \[data-first-step="pulse"\],\n {2}\.v7-app-shell:not\(\[data-motion="reduced"\]\)\n {4}\.v7-hud-end-turn\[data-nothing-left="true"\] \{\n {4}animation: v7-first-step-pulse/,
    );
  });
});
