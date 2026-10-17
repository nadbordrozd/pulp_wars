// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { viewForV7, type PlayerViewV7 } from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { FOG_PUFF_V7 } from "../../src/render/canvas/fog-puff-v7";
import { initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.77: a tap on an unexplored tile plays the fog puff on
 * the effects overlay (it repaints alone), a new tap starts it again,
 * reduced motion holds one still frame, and an explored tile plays none.
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
  // Every context records what it is asked to draw.
  const drawn: { canvas: unknown; at: number }[] = [];
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
        drawImage: vi.fn((image: unknown) => {
          if (classList.contains("board-effects-canvas-v7"))
            drawn.push({ canvas: image, at: now });
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
  const view: PlayerViewV7 = viewForV7(state, state.humanPlayerId);
  const selections = vi.fn();
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: selections, onCommand: vi.fn() });
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
  const effects = container.querySelector<HTMLCanvasElement>(
    "canvas.board-effects-canvas-v7",
  );
  if (effects === null) throw new Error("no effects canvas");
  const fog = view.board.tiles.find((tile) => !tile.explored)?.at;
  const ground = view.board.tiles.find(
    (tile) =>
      tile.explored &&
      !view.units.some(
        (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
      ) &&
      !view.cities.some(
        (city) => city.at.x === tile.at.x && city.at.y === tile.at.y,
      ),
  )?.at;
  if (fog === undefined || ground === undefined)
    throw new Error("fixture needs fog and explored ground");
  return {
    host,
    effects,
    fog,
    ground,
    selections,
    drawn,
    frames,
    setNow(time: number) {
      now = time;
    },
    /** Runs every waiting animation frame at `time` ms. */
    step(time: number) {
      now = time;
      const waiting = [...frames.entries()];
      frames.clear();
      for (const [, callback] of waiting) callback(time);
    },
  };
}

describe("The fog puff on the board host", () => {
  it("plays on the overlay after a tap on the fog, then clears", () => {
    const scene = setUp("FULL");
    scene.setNow(1000);
    scene.host.activate(scene.fog);
    expect(scene.selections).toHaveBeenLastCalledWith({
      kind: "TILE",
      at: scene.fog,
    });
    expect(scene.effects.dataset.fogPuff).toBe("playing");
    scene.step(1400);
    expect(Number(scene.effects.dataset.fogPuffProgress)).toBeCloseTo(0.5, 2);
    // The puff's pixels were laid on the overlay.
    expect(scene.drawn.some((entry) => entry.at === 1400)).toBe(true);
    scene.step(1000 + FOG_PUFF_V7.durationMs + 1);
    expect(scene.effects.dataset.fogPuff).toBeUndefined();
    // No frame is asked for once it is over.
    expect(scene.frames.size).toBe(0);
    scene.host.destroy();
  });

  it("starts again on a second tap", () => {
    const scene = setUp("FULL");
    scene.setNow(0);
    scene.host.activate(scene.fog);
    scene.step(600);
    expect(Number(scene.effects.dataset.fogPuffProgress)).toBeCloseTo(0.75, 2);
    scene.host.activate(scene.fog);
    expect(Number(scene.effects.dataset.fogPuffProgress)).toBeCloseTo(0, 2);
    scene.step(680);
    expect(Number(scene.effects.dataset.fogPuffProgress)).toBeCloseTo(0.1, 2);
    scene.host.destroy();
  });

  it("plays nothing on explored ground", () => {
    const scene = setUp("FULL");
    scene.host.activate(scene.ground);
    expect(scene.selections).toHaveBeenLastCalledWith({
      kind: "TILE",
      at: scene.ground,
    });
    expect(scene.effects.dataset.fogPuff).toBeUndefined();
    scene.host.destroy();
  });

  it("holds one still frame with reduced motion, then clears", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const scene = setUp("REDUCED");
    scene.setNow(0);
    scene.host.activate(scene.fog);
    expect(scene.effects.dataset.fogPuff).toBe("still");
    expect(Number(scene.effects.dataset.fogPuffProgress)).toBeCloseTo(
      FOG_PUFF_V7.reducedProgress,
      3,
    );
    // Nothing moves: no animation frame is asked for the puff.
    expect(scene.frames.size).toBe(0);
    scene.setNow(FOG_PUFF_V7.reducedHoldMs);
    vi.advanceTimersByTime(FOG_PUFF_V7.reducedHoldMs);
    expect(scene.effects.dataset.fogPuff).toBeUndefined();
    scene.host.destroy();
  });
});
