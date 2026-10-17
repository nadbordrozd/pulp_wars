// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { viewForV7, type PlayerViewV7 } from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { FOG_LIFT_V7 } from "../../src/render/canvas/fog-lift-v7";
import { initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.83: a view that has explored more than the last one
 * drawn starts a lift on each new cell, drawn on the effects overlay; only
 * the overlay repaints while it plays (the board is not drawn again), it
 * asks for no frame once over, and reduced motion fades without a cloud.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function setUp(motion: "FULL" | "REDUCED") {
  let now = 0;
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  let nextFrame = 1;
  const frames = new Map<number, FrameRequestCallback>();
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrame;
      nextFrame += 1;
      frames.set(id, callback);
      return id;
    }),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: vi.fn((id: number) => frames.delete(id)),
  });
  /** Full clears of the board canvas (a board draw), and overlay drawImages. */
  const counts = { boardDraws: 0, overlayImages: 0 };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const { classList } = this;
      const target: Record<PropertyKey, unknown> = {
        fillStyle: "",
        strokeStyle: "",
        createImageData: (width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        }),
        clearRect: vi.fn(() => {
          if (classList.contains("board-canvas-v7")) counts.boardDraws += 1;
        }),
        drawImage: vi.fn(() => {
          if (classList.contains("board-effects-canvas-v7"))
            counts.overlayImages += 1;
        }),
      };
      const context = new Proxy(target, {
        get: (object, key) => (key in object ? object[key] : vi.fn()),
        set: (object, key, value) => {
          object[key] = value;
          return true;
        },
      });
      return context as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement["getContext"],
  );
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
  const state = initialV7(71);
  const after: PlayerViewV7 = viewForV7(state, state.humanPlayerId);
  const unit = after.units.find((u) => u.ownerId === after.viewer.id);
  if (unit === undefined) throw new Error("fixture needs a unit");
  // The view before: the explored cells two away from the unit are fog.
  const hide = (at: { x: number; y: number }): boolean =>
    Math.max(Math.abs(at.x - unit.at.x), Math.abs(at.y - unit.at.y)) === 2;
  const revealed = after.board.tiles.filter(
    (tile) => tile.explored && hide(tile.at),
  ).length;
  const before: PlayerViewV7 = {
    ...after,
    board: {
      ...after.board,
      tiles: after.board.tiles.map((tile) =>
        tile.explored && hide(tile.at) ? { ...tile, explored: false } : tile,
      ),
    },
  };
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const show = (view: PlayerViewV7) =>
    host.update({
      matchInstanceId: 1,
      view,
      offeredCommands: [],
      interactive: true,
      motion,
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
  show(before);
  const effects = container.querySelector<HTMLCanvasElement>(
    "canvas.board-effects-canvas-v7",
  );
  if (effects === null) throw new Error("no effects canvas");
  return {
    host,
    effects,
    frames,
    counts,
    revealed,
    reveal: () => show(after),
    hideAgain: () => show(before),
    step(time: number) {
      now = time;
      const waiting = [...frames.entries()];
      frames.clear();
      for (const [, callback] of waiting) callback(time);
    },
    setNow(time: number) {
      now = time;
    },
  };
}

describe("The fog lift on the board host", () => {
  it("starts a lift on every newly explored cell, on the overlay, then stops", () => {
    const scene = setUp("FULL");
    expect(scene.revealed).toBeGreaterThan(3);
    // The first view of the match lifts nothing.
    expect(scene.effects.dataset.fogLift).toBeUndefined();
    scene.setNow(1000);
    scene.reveal();
    expect(scene.effects.dataset.fogLift).toBe(String(scene.revealed));
    // Every cell holds its whole cloud (a cached frame on the overlay).
    expect(Number(scene.effects.dataset.fogLiftPuffs)).toBe(scene.revealed);
    expect(scene.frames.size).toBeGreaterThan(0);
    // While it plays only the overlay repaints.
    const boardDraws = scene.counts.boardDraws;
    const images = scene.counts.overlayImages;
    scene.step(1300);
    scene.step(1500);
    expect(scene.counts.boardDraws).toBe(boardDraws);
    expect(scene.counts.overlayImages).toBeGreaterThan(images);
    expect(scene.effects.dataset.fogLift).toBe(String(scene.revealed));
    // Over once the last ring is done; no frame is asked for after.
    const end =
      1000 + FOG_LIFT_V7.durationMs + FOG_LIFT_V7.maxRings * FOG_LIFT_V7.ringMs;
    scene.step(end);
    scene.step(end + 20);
    expect(scene.effects.dataset.fogLift).toBeUndefined();
    expect(scene.frames.size).toBe(0);
    scene.host.destroy();
  });

  it("drops the lift of a cell drawn as fog again", () => {
    const scene = setUp("FULL");
    scene.setNow(0);
    scene.reveal();
    expect(scene.effects.dataset.fogLift).toBe(String(scene.revealed));
    scene.hideAgain();
    expect(scene.effects.dataset.fogLift).toBeUndefined();
    scene.host.destroy();
  });

  it("fades without a cloud for reduced motion", () => {
    const scene = setUp("REDUCED");
    scene.setNow(0);
    scene.reveal();
    expect(scene.effects.dataset.fogLift).toBe(String(scene.revealed));
    expect(scene.effects.dataset.fogLiftPuffs).toBe("0");
    scene.step(FOG_LIFT_V7.reducedMs / 2);
    expect(scene.effects.dataset.fogLift).toBe(String(scene.revealed));
    scene.step(FOG_LIFT_V7.reducedMs);
    scene.step(FOG_LIFT_V7.reducedMs + 20);
    expect(scene.effects.dataset.fogLift).toBeUndefined();
    expect(scene.frames.size).toBe(0);
    scene.host.destroy();
  });

  it("holds a frame for review tooling with pinFogLift", () => {
    const scene = setUp("FULL");
    scene.setNow(0);
    scene.reveal();
    scene.host.pinFogLift(300);
    scene.step(5000);
    // Held: still drawn long after it would have ended.
    expect(scene.effects.dataset.fogLift).toBe(String(scene.revealed));
    scene.host.pinFogLift(null);
    scene.step(5020);
    expect(scene.effects.dataset.fogLift).toBeUndefined();
    scene.host.destroy();
  });
});
