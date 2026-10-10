// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type TileStateV7,
} from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import type { ChibiDomEnvironmentV7 } from "../../src/render/dom/chibi-dom-art-v7";
import type { ArtSetV7 } from "../../src/assets/chibi-art-v7";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";

/**
 * Bead pulp_wars-2yc.41: the tile dock of a selected Forest or Mountain
 * cell shows what the board draws there. A Forest inside a faction's
 * territory showed the default green clump, whatever stood on it, and a
 * Mountain the old single mountain.
 */

function environment(): ChibiDomEnvironmentV7 {
  return {
    loadImage(url, settle) {
      settle(true);
      return { url } as unknown as CanvasImageSource;
    },
    readPixels: (_image, width, height) =>
      new Uint8ClampedArray(width * height * 4).fill(255),
    createSurface: (pixels, width, height) =>
      ({ pixels, width, height }) as unknown as CanvasImageSource,
    encode: () => "data:image/test;0",
  };
}

class Host implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("div"));
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

/**
 * The Goblin showcase with three free cells of the viewer's territory made
 * a Forest, a Forest with a Treasure and a Mountain, and a Forest outside
 * every territory.
 */
function scene(): {
  state: GameStateV7;
  forest: CoordV7;
  treasure: CoordV7;
  mountain: CoordV7;
  wild: CoordV7;
} {
  const state = goblinShowcaseFixtureV7();
  const capital = state.cities.find(
    (city) => city.ownerId === state.humanPlayerId,
  );
  if (capital === undefined) throw new Error("no capital");
  const busy = new Set([
    ...state.units.map((unit) => `${unit.at.x},${unit.at.y}`),
    ...state.cities.map((city) => `${city.at.x},${city.at.y}`),
  ]);
  const free = (tile: TileStateV7): boolean =>
    tile.site === null &&
    tile.terrain !== "SHALLOW_WATER" &&
    tile.terrain !== "DEEP_WATER" &&
    !busy.has(`${tile.at.x},${tile.at.y}`);
  const own = state.board.tiles.filter(
    (tile) => tile.territoryCityId === capital.id && free(tile),
  );
  const outside = state.board.tiles.find(
    (tile) => tile.territoryCityId === null && free(tile),
  );
  const [forest, treasure, mountain] = own;
  if (
    forest === undefined ||
    treasure === undefined ||
    mountain === undefined ||
    outside === undefined
  )
    throw new Error("no room in the fixture");
  const is = (tile: TileStateV7, other: TileStateV7): boolean =>
    tile.at.x === other.at.x && tile.at.y === other.at.y;
  const plain = {
    resource: null,
    improvement: null,
    road: false,
    fieldDefense: false,
  };
  return {
    state: {
      ...state,
      treasureChests: [treasure.at],
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          is(tile, forest) || is(tile, treasure) || is(tile, outside)
            ? { ...tile, ...plain, terrain: "FOREST" as const }
            : is(tile, mountain)
              ? { ...tile, ...plain, terrain: "MOUNTAIN" as const }
              : tile,
        ),
      },
    },
    forest: forest.at,
    treasure: treasure.at,
    mountain: mountain.at,
    wild: outside.at,
  };
}

function mount(state: GameStateV7, artSet: ArtSetV7) {
  const view = viewForV7(state, state.humanPlayerId);
  const snapshot = {
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
    },
  } as unknown as Ruleset7BrowserSnapshot;
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  const host = new Host();
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
    {
      boardHost: host,
      settingsStorage: null,
      artSet,
      chibiDomEnvironment: environment(),
    },
  );
  /** The dock's picture of a cell: the canvas's swatch, or the image's art. */
  const dockArt = (at: CoordV7): string => {
    host.callbacks?.onSelection({ kind: "TILE", at });
    const art = document.querySelector<HTMLElement>(
      ".v7-selection-dock .v7-identity-art > .v7-art-frame",
    );
    if (art === null) throw new Error("no dock art");
    return art instanceof HTMLCanvasElement
      ? `canvas:${art.dataset.dockTerrain ?? ""}:${art.dataset.chibiSubject ?? ""}`
      : `image:${art.dataset.chibiAssetId ?? art.dataset.assetId ?? ""}`;
  };
  return { app, dockArt };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the tile dock's Forest and Mountain pictures", () => {
  const drawable = (): void => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          setTransform: () => undefined,
          translate: () => undefined,
          clearRect: () => undefined,
          drawImage: () => undefined,
          imageSmoothingEnabled: false,
        }) as unknown as CanvasRenderingContext2D,
    );
  };

  it("shows the faction's own trees for a Forest in its territory, with or without a Treasure on it", () => {
    drawable();
    const { state, forest, treasure, wild } = scene();
    const { app, dockArt } = mount(state, "CHIBI");
    expect(dockArt(forest)).toBe(
      "canvas:chibi-forest-goblin-piece-1x1-a:TERRAIN:FOREST",
    );
    expect(dockArt(treasure)).toBe(dockArt(forest));
    // Outside every territory: the default Forest, as before.
    expect(dockArt(wild)).toMatch(/^image:chibi-forest-/);
    expect(dockArt(wild)).not.toContain("goblin");
    app.destroy();
  });

  it("shows a Mountain as the massif's mountain, not the old single one", () => {
    drawable();
    const { state, mountain } = scene();
    const { app, dockArt } = mount(state, "CHIBI");
    expect(dockArt(mountain)).toMatch(
      /^canvas:chibi-mountain-range-1x1-[a-z]:TERRAIN:MOUNTAIN$/,
    );
    app.destroy();
  });

  it("keeps the registered master where a canvas cannot be drawn, and the LEGACY set as it was", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => null,
    );
    const { state, forest, mountain } = scene();
    const chibi = mount(state, "CHIBI");
    expect(chibi.dockArt(forest)).toMatch(/^image:chibi-forest-/);
    expect(chibi.dockArt(mountain)).toMatch(/^image:chibi-mountain-/);
    chibi.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const legacy = mount(state, "LEGACY");
    expect(legacy.dockArt(forest)).toMatch(/^image:terrain-/);
    expect(legacy.dockArt(mountain)).toMatch(/^image:terrain-/);
    expect(document.querySelector(".v7-selection-dock canvas")).toBeNull();
    legacy.app.destroy();
  });
});
