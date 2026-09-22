// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardGlowCacheV7 } from "../../src/render/canvas/glow-cache-v7";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { drawBoardV7 } from "../../src/render/canvas/board-renderer-v7";
import { viewForV7 } from "../../src/engine/index";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function context(
  canvas: HTMLCanvasElement,
  drawImage = vi.fn(),
  pixelScale: () => number = () => 1,
) {
  const clearRect = vi.fn();
  const buffer = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === "canvas") return canvas;
        if (key === "drawImage") return drawImage;
        if (key === "clearRect") return clearRect;
        if (key === "getTransform")
          return () => ({
            a: pixelScale(),
            b: 0,
            c: 0,
            d: pixelScale(),
          });
        return vi.fn();
      },
    },
  ) as CanvasRenderingContext2D;
  return { buffer, clearRect, drawImage };
}

describe("Ruleset 7 presentation caches", () => {
  it("draws tall edge art and skips distant offscreen art", () => {
    const canvas = document.createElement("canvas");
    const drawn = context(canvas);
    const entry = {
      key: "terrain:0,0",
      kind: "TERRAIN" as const,
      at: { x: 0, y: 0 },
      layer: 1,
      assetId: "terrain-ruleset7-original-forest-1",
    };
    const common = {
      context: drawn.buffer,
      viewport: { width: 300, height: 300 },
      devicePixelRatio: 1,
      plan: { version: 7 as const, entries: [entry], targets: [] },
      images: { resolve: () => ({}) as CanvasImageSource },
    };
    drawBoardV7({
      ...common,
      camera: { offsetX: 100, offsetY: -50, zoom: 1 },
    });
    expect(drawn.drawImage).toHaveBeenCalledTimes(1);
    drawn.drawImage.mockClear();
    drawBoardV7({
      ...common,
      camera: { offsetX: 100, offsetY: -5_000, zoom: 1 },
    });
    expect(drawn.drawImage).not.toHaveBeenCalled();
  });

  it("reuses identical fractional glow rasters, evicts within budget, and disposes surfaces", () => {
    const destination = document.createElement("canvas");
    let dpr = 1;
    const main = context(destination, vi.fn(), () => dpr);
    const offscreen: HTMLCanvasElement[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement) {
        offscreen.push(this);
        return context(this).buffer;
      },
    );
    const cache = new BoardGlowCacheV7(document, 12_000);
    const image = {} as CanvasImageSource;
    const glow = { color: "#fff09a", alpha: 0.58, blur: 0 };
    const rect = { x: 10, y: 20, width: 20.1, height: 20.1 };
    cache.draw(main.buffer, image, "fighter", rect, glow);
    const firstSurface = offscreen[0];
    expect(firstSurface).toBeDefined();
    const firstBytes = cache.byteLength;
    cache.draw(main.buffer, image, "fighter", rect, glow);
    expect(offscreen).toHaveLength(1);
    expect(cache.byteLength).toBe(firstBytes);
    // Ceil gives the same backing dimensions, but fractional source sampling
    // differs and must therefore have a distinct cache key.
    cache.draw(main.buffer, image, "fighter", { ...rect, width: 20.2 }, glow);
    expect(offscreen).toHaveLength(2);
    dpr = 2;
    cache.draw(main.buffer, image, "fighter", rect, glow);
    expect(offscreen).toHaveLength(3);
    cache.draw(main.buffer, image, "fighter", rect, {
      ...glow,
      color: "#ffffff",
    });
    expect(offscreen).toHaveLength(4);
    dpr = 1;
    for (let n = 0; n < 20; n += 1)
      cache.draw(
        main.buffer,
        image,
        "fighter",
        { ...rect, width: rect.width + n },
        glow,
      );
    expect(cache.byteLength).toBeLessThanOrEqual(12_000);
    expect(firstSurface?.width).toBe(0);
    cache.clear();
    expect(cache.byteLength).toBe(0);
    expect(offscreen.every((canvas) => canvas.width === 0)).toBe(true);
    const beforeRecreate = offscreen.length;
    cache.draw(main.buffer, image, "fighter", rect, glow);
    expect(offscreen).toHaveLength(beforeRecreate + 1);
  });

  it("draws once for a selection callback and ignores unchanged resize observations", () => {
    let resize: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    let width = 800;
    const container = document.createElement("div");
    container.getBoundingClientRect = () =>
      ({
        width,
        height: 600,
        left: 0,
        top: 0,
        right: width,
        bottom: 600,
      }) as DOMRect;
    document.body.append(container);
    const canvas = document.createElement("canvas");
    const drawn = context(canvas);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      drawn.buffer,
    );
    const state = exploredAllV7(initialV7(1560));
    const view = viewForV7(state, state.humanPlayerId);
    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (unit === undefined) throw new Error("Owned unit missing");
    const host = new CanvasBoardHostV7(document);
    const model = {
      matchInstanceId: 1,
      view,
      offeredCommands: [],
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: true,
      motion: "REDUCED" as const,
      animationSpeed: "NORMAL" as const,
      presentationPaused: false,
      highContrast: false,
    };
    const commandTargets: { x: number; y: number }[] = [];
    host.mount(container, {
      onSelection: (selection) =>
        host.update({
          ...model,
          interaction: {
            ...model.interaction,
            selection,
            selectedUnitId:
              selection?.kind === "UNIT" ? selection.unitId : null,
          },
        }),
      onCommand: (target) => commandTargets.push(target.at),
    });
    host.update(model);
    const beforeSelection = drawn.clearRect.mock.calls.length;
    host.activate(unit.at);
    expect(drawn.clearRect.mock.calls.length - beforeSelection).toBe(1);
    const beforeResize = drawn.clearRect.mock.calls.length;
    resize?.();
    expect(drawn.clearRect.mock.calls.length).toBe(beforeResize);
    width = 900;
    resize?.();
    expect(drawn.clearRect.mock.calls.length).toBe(beforeResize + 1);
    expect(container.querySelector("canvas")?.width).toBe(900);

    const opponent = view.units.find(
      (candidate) => candidate.ownerId !== view.viewer.id,
    );
    if (opponent === undefined) throw new Error("Opponent unit missing");
    const empty = view.board.tiles
      .filter(
        (tile) =>
          tile.explored &&
          !view.units.some(
            (candidate) =>
              candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
          ),
      )
      .slice(0, 2);
    const first = empty[0]?.at;
    const second = empty[1]?.at;
    if (first === undefined || second === undefined)
      throw new Error("Empty cells missing");
    const commands = [
      {
        kind: "ATTACK" as const,
        unitId: unit.id,
        targetUnitId: opponent.id,
      },
    ];
    const selected = {
      selection: { kind: "UNIT" as const, unitId: unit.id },
      selectedUnitId: unit.id,
      selectedAchievement: null,
    };
    const at = (position: typeof first) => ({
      ...view,
      units: view.units.map((candidate) =>
        candidate.id === opponent.id
          ? { ...candidate, at: position }
          : candidate,
      ),
    });
    const firstView = at(first);
    host.update({
      ...model,
      view: firstView,
      offeredCommands: commands,
      interaction: selected,
    });
    host.activate(first);
    expect(commandTargets).toEqual([first]);
    const secondView = at(second);
    host.update({
      ...model,
      view: secondView,
      offeredCommands: commands,
      interaction: selected,
    });
    host.activate(first);
    expect(commandTargets).toEqual([first]);
    host.update({
      ...model,
      view: secondView,
      offeredCommands: commands,
      interaction: selected,
    });
    host.activate(second);
    expect(commandTargets).toEqual([first, second]);
    host.update({
      ...model,
      view: secondView,
      offeredCommands: [],
      interaction: selected,
    });
    host.activate(second);
    expect(commandTargets).toEqual([first, second]);
    host.update({
      ...model,
      view: secondView,
      offeredCommands: commands,
      interaction: { ...selected, selection: null, selectedUnitId: null },
    });
    host.activate(second);
    expect(commandTargets).toEqual([first, second]);
    host.destroy();
  });
});
