// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { viewForV7, type PlayerViewV7 } from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import { CANVAS_LOSS_SETTLE_MS_V7 } from "../../src/render/canvas/canvas-loss-v7";
import {
  CHIBI_RASTER_RETRY_MS_V7,
  browserChibiRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { liveBoardLookV7 } from "../../src/render/canvas/live-board-look-v7";
import { initialV7 } from "../fixtures/v7-builders";

/**
 * Bug pulp_wars-urs0: after a reload the map sometimes went blank under
 * its units. The live look draws every terrain tile, city and building
 * from a canvas copy it builds once (toned, recoloured, faded) and keeps;
 * the units are image elements. A lost GPU context (reproduced in Chrome
 * with `Browser.crashGpuProcess`: 800 canvases reported `contextlost` and
 * `contextrestored`, and the map stayed empty, its sky too) clears every
 * GPU-backed canvas, the kept copies among them, and the board drew those
 * cleared copies forever. The board now hears of the loss, throws its art
 * and every kept copy away, builds them again and redraws.
 */

type DrawInput = Parameters<typeof renderer.drawBoardV7>[0];

let lost = false;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  lost = false;
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: vi.fn(() => 1),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: vi.fn(),
  });
  // A 2D context that can hold pixels and can be lost.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const target: Record<PropertyKey, unknown> = {
        canvas: this,
        isContextLost: () => lost,
        createImageData: (width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        }),
        getImageData: (
          _x: number,
          _y: number,
          width: number,
          height: number,
        ) => ({
          data: new Uint8ClampedArray(width * height * 4).fill(255),
        }),
      };
      return new Proxy(target, {
        get: (object, key) => (key in object ? object[key] : vi.fn()),
        set: (object, key, value) => {
          object[key] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mounted() {
  const draws: DrawInput[] = [];
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    draws.push(input);
  });
  const container = document.createElement("div");
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
    }),
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document, { terrainSkeleton: () => null });
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const state = initialV7(71);
  const view: PlayerViewV7 = viewForV7(state, state.humanPlayerId);
  const model: BoardHostModelV7 = {
    matchInstanceId: 1,
    view,
    offeredCommands: [],
    interactive: false,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    ...liveBoardLookV7(),
  };
  host.update(model);
  const board = container.querySelector("canvas.board-canvas-v7");
  if (!(board instanceof HTMLCanvasElement)) throw new Error("no board");
  return { host, draws, board };
}

describe("the board after its canvases were cleared", () => {
  it("builds its art and kept copies again and redraws when the board's canvas is restored", async () => {
    const { host, draws, board } = mounted();
    const first = draws.at(-1);
    expect(first?.direction).toBeDefined();
    const count = draws.length;

    // The restores of one loss arrive over several tasks.
    board.dispatchEvent(new Event("contextrestored"));
    board.dispatchEvent(new Event("contextrestored"));
    expect(draws.length).toBe(count);
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7);
    // One redraw, with art built anew: no copy of before the loss is kept.
    expect(draws.length).toBe(count + 1);
    const after = draws.at(-1);
    expect(after?.chibiArt).not.toBe(first?.chibiArt);
    expect(after?.direction?.art).not.toBe(first?.direction?.art);
    expect(after?.saturation?.cache).not.toBe(first?.saturation?.cache);
    expect(after?.forestArt).not.toBe(first?.forestArt);
    expect(after?.mountainArt).not.toBe(first?.mountainArt);

    // Later frames keep the new art.
    host.zoom("IN");
    expect(draws.at(-1)?.chibiArt).toBe(after?.chibiArt);

    // A board taken down hears of no loss.
    host.destroy();
    const settled = draws.length;
    board.dispatchEvent(new Event("contextrestored"));
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7);
    expect(draws.length).toBe(settled);
  });

  it("rebuilds when one of its kept copies is cleared", async () => {
    const { host, draws } = mounted();
    const first = draws.at(-1);
    const environment = browserChibiRasterEnvironmentV7(document);
    const copy = environment.createSurface(new Uint8ClampedArray(16), 2, 2);
    expect(copy).toBeInstanceOf(HTMLCanvasElement);
    (copy as HTMLCanvasElement).dispatchEvent(new Event("contextrestored"));
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7);
    expect(draws.at(-1)?.chibiArt).not.toBe(first?.chibiArt);
    host.destroy();
  });

  it("makes no copy from, or on, a lost context", () => {
    const environment = browserChibiRasterEnvironmentV7(document);
    const image = document.createElement("canvas");
    expect(environment.readPixels(image, 2, 2)).not.toBeNull();
    expect(
      environment.createSurface(new Uint8ClampedArray(16), 2, 2),
    ).not.toBeNull();
    // A lost context reads back transparent pixels: a copy made from them
    // would be kept and drawn as nothing.
    lost = true;
    expect(environment.readPixels(image, 2, 2)).toBeNull();
    expect(
      environment.createSurface(new Uint8ClampedArray(16), 2, 2),
    ).toBeNull();
  });
});

describe("a raster that fails to load", () => {
  it("is asked for once more before its piece gives up", async () => {
    const environment = browserChibiRasterEnvironmentV7(document);
    const settled: boolean[] = [];
    const image = environment.loadImage("/assets/a.png", (ok) =>
      settled.push(ok),
    ) as HTMLImageElement;
    image.dispatchEvent(new Event("error"));
    expect(settled).toEqual([]);
    await vi.advanceTimersByTimeAsync(CHIBI_RASTER_RETRY_MS_V7);
    image.dispatchEvent(new Event("error"));
    expect(settled).toEqual([false]);

    // A retry that loads is a loaded raster.
    const again: boolean[] = [];
    const second = environment.loadImage("/assets/b.png", (ok) =>
      again.push(ok),
    ) as HTMLImageElement;
    second.dispatchEvent(new Event("error"));
    await vi.advanceTimersByTimeAsync(CHIBI_RASTER_RETRY_MS_V7);
    expect(second.getAttribute("src")).toBe("/assets/b.png");
    second.dispatchEvent(new Event("load"));
    expect(again).toEqual([true]);
  });
});
