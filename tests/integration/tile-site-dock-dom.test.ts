// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
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
  TREASURE_LINE_V7,
  VILLAGE_CAPTURE_LINE_V7,
  tileSiteDockV7,
} from "../../src/render/tile-site-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { fieldV7 } from "../fixtures/v7-revision20";

/**
 * Bead pulp_wars-2yc.89 (the user, 2026-10-17: "when clicking on a village
 * you get a description for 'grass'"): a tap on a neutral village opens a
 * village dock (its art, "Village" and one short line on capturing it), and
 * a treasure chest likewise; a unit standing on the village with Capture
 * still opens the unit's dock first.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

class Host implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  last: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.last = model;
  }
  activate(): void {}
  quietTap(): void {}
  releaseCursor(): void {}
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

function mount(state: GameStateV7) {
  const snapshot = snapshotOf(state);
  const host = new Host();
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  const app = new Ruleset7DomAppView(
    document,
    root,
    {
      snapshot: () => snapshot,
      subscribe: (listener: (value: Ruleset7BrowserSnapshot) => void) => {
        listener(snapshot);
        return () => undefined;
      },
      subscribeAcceptedBoundary: () => () => undefined,
    } as unknown as Ruleset7ControllerPortV7,
    { boardHost: host },
  );
  return { app, host };
}

const dock = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".v7-selection-dock");

/** The arena's first neutral village, on Grass, and an empty Grass tile. */
function arena(
  pieces: Parameters<typeof fieldV7>[0] = [],
  chest = false,
): { state: GameStateV7; village: CoordV7; empty: CoordV7 } {
  const probe = fieldV7([]);
  const village = probe.board.tiles.find((tile) => tile.site === "VILLAGE");
  if (village === undefined) throw new Error("no village in the arena");
  const base = fieldV7(pieces.length === 0 ? [] : pieces);
  const empty = base.board.tiles.find(
    (tile) =>
      tile.site === null &&
      tile.terrain === "GRASS" &&
      tile.territoryCityId === null &&
      !base.units.some((unit) => same(unit.at, tile.at)) &&
      !base.cities.some((city) => same(city.at, tile.at)),
  );
  if (empty === undefined) throw new Error("no empty tile");
  const state = checkedV7({
    ...base,
    treasureChests: chest ? [empty.at] : [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, village.at)
          ? { ...tile, terrain: "GRASS" as const, resource: null }
          : tile,
      ),
    },
  });
  return { state, village: village.at, empty: empty.at };
}

describe("the dock of a neutral village (2yc.89)", () => {
  it("shows the village, its art and the capture line, not Grass", () => {
    const { state, village } = arena();
    const { app, host } = mount(state);
    host.callbacks?.onSelection({ kind: "TILE", at: village });
    const shown = dock();
    expect(shown?.dataset.selectionKind).toBe("tile");
    expect(shown?.querySelector(".v7-identity h2")?.textContent).toBe(
      "Village",
    );
    expect(shown?.textContent).not.toMatch(/grass/i);
    const line = shown?.querySelector<HTMLElement>(".v7-tile-site-line");
    expect(line?.textContent).toBe(VILLAGE_CAPTURE_LINE_V7);
    expect(line?.dataset.tileSite).toBe("village");
    // The village's own picture, not the terrain's swatch.
    const art = shown?.querySelector<HTMLElement>(".v7-identity-art");
    expect(art?.innerHTML).toMatch(/village/i);
    // It is content: never the plain terrain dock a harvest lets go of.
    expect(shown?.dataset.plainTile).toBeUndefined();
    // The line is the main view: no "?" hides it.
    expect(shown?.querySelector(".v7-unit-help")).toBeNull();
    app.destroy();
  });

  it("keeps the unit's dock with Capture first when a unit stands on the village", () => {
    const probe = fieldV7([]);
    const village = probe.board.tiles.find((tile) => tile.site === "VILLAGE");
    if (village === undefined) throw new Error("no village in the arena");
    const { state } = arena([
      { seat: 0, role: "FIGHTER", at: village.at, captureEligible: true },
    ]);
    const unit = state.units.find((item) => same(item.at, village.at));
    if (unit === undefined) throw new Error("no unit");
    expect(
      queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)).some(
        (command) => command.kind === "CAPTURE" && command.unitId === unit.id,
      ),
    ).toBe(true);
    const { app, host } = mount(state);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(dock()?.dataset.selectionKind).toBe("unit");
    expect(
      [...(dock()?.querySelectorAll("button") ?? [])].some((item) =>
        /capture/i.test(item.textContent ?? ""),
      ),
    ).toBe(true);
    // The tile under it (the board's second tap) is the village's dock.
    host.callbacks?.onSelection({ kind: "TILE", at: village.at });
    expect(dock()?.querySelector(".v7-identity h2")?.textContent).toBe(
      "Village",
    );
    app.destroy();
  });

  it("a captured village is a city, not a village dock", () => {
    const { state, village } = arena();
    const view = viewForV7(state, state.humanPlayerId);
    expect(tileSiteDockV7(view, village)?.kind).toBe("VILLAGE");
    const captured = {
      ...view,
      cities: [
        ...view.cities,
        { ...(view.cities[0] as (typeof view.cities)[number]), at: village },
      ],
    };
    expect(tileSiteDockV7(captured, village)).toBeNull();
  });
});

describe("the dock of a treasure chest (2yc.89)", () => {
  it("shows Treasure and its line, not Grass", () => {
    const { state, empty } = arena([], true);
    const { app, host } = mount(state);
    host.callbacks?.onSelection({ kind: "TILE", at: empty });
    const shown = dock();
    expect(shown?.querySelector(".v7-identity h2")?.textContent).toBe(
      "Treasure",
    );
    expect(shown?.textContent).not.toMatch(/grass/i);
    expect(shown?.querySelector(".v7-tile-site-line")?.textContent).toBe(
      TREASURE_LINE_V7,
    );
    expect(shown?.dataset.plainTile).toBeUndefined();
    app.destroy();
  });

  it("an empty tile still reads as its terrain", () => {
    const { state, empty } = arena();
    const { app, host } = mount(state);
    host.callbacks?.onSelection({ kind: "TILE", at: empty });
    expect(dock()?.querySelector(".v7-identity h2")?.textContent).toBe("Grass");
    expect(dock()?.querySelector(".v7-tile-site-line")).toBeNull();
    app.destroy();
  });
});
