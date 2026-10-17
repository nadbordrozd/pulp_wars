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
  /** How many cursor boxes (dotted white) the board has stroked. */
  const cursors = { count: 0 };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const { classList } = this;
      const target: Record<PropertyKey, unknown> = {
        fillStyle: "",
        strokeStyle: "",
        strokeRect: vi.fn(() => {
          if (target.strokeStyle === "#ffffff") cursors.count += 1;
        }),
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
  const board = container.querySelector<HTMLCanvasElement>(
    "canvas:not(.board-effects-canvas-v7)",
  );
  if (board === null) throw new Error("no board canvas");
  Object.defineProperty(board, "getBoundingClientRect", {
    value: () => ({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
    }),
  });
  return {
    host,
    board,
    effects,
    fog,
    ground,
    selections,
    drawn,
    frames,
    cursors,
    /** A pointer tap (down and up in place) on the centre of `at`. */
    tap(at: { readonly x: number; readonly y: number }) {
      const centre = host.cellCentreCssPx(at);
      for (const kind of ["pointerdown", "pointerup"]) {
        const event = new MouseEvent(kind, {
          bubbles: true,
          clientX: centre.x,
          clientY: centre.y,
        });
        Object.defineProperty(event, "pointerId", { value: 1 });
        Object.defineProperty(event, "pointerType", { value: "touch" });
        board.dispatchEvent(event);
      }
    },
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

/**
 * Bead pulp_wars-2yc.82 (UI review S1): the app asks for a quiet tap when
 * the tapped tile opens no dock. On explored ground the same puff plays in
 * the faint dust colours; on the fog the fog's own puff stays; after a
 * pointer tap no cursor box is drawn on the tile, while the keyboard keeps
 * its cursor.
 */
describe("The quiet tap on a plain tile", () => {
  it("plays the puff in dust on explored ground", () => {
    const scene = setUp("FULL");
    scene.setNow(0);
    scene.host.activate(scene.ground);
    scene.host.quietTap(scene.ground);
    expect(scene.effects.dataset.fogPuff).toBe("playing");
    expect(scene.effects.dataset.fogPuffGround).toBe("true");
    scene.step(FOG_PUFF_V7.durationMs + 1);
    expect(scene.effects.dataset.fogPuff).toBeUndefined();
    scene.host.destroy();
  });

  it("keeps the fog's own puff on the fog", () => {
    const scene = setUp("FULL");
    scene.setNow(0);
    scene.host.activate(scene.fog);
    scene.host.quietTap(scene.fog);
    expect(scene.effects.dataset.fogPuff).toBe("playing");
    expect(scene.effects.dataset.fogPuffGround).toBeUndefined();
    scene.host.destroy();
  });

  it("draws no cursor box on a plain tile tapped by pointer, until the keyboard moves", () => {
    const scene = setUp("REDUCED");
    // A tap the app keeps selected draws the cursor box as before.
    scene.cursors.count = 0;
    scene.tap(scene.ground);
    expect(scene.cursors.count).toBeGreaterThan(0);
    // The app answers a tap on a tile with no dock with a quiet tap.
    scene.selections.mockImplementation(() =>
      scene.host.quietTap(scene.ground),
    );
    scene.cursors.count = 0;
    scene.tap(scene.ground);
    expect(scene.selections).toHaveBeenLastCalledWith({
      kind: "TILE",
      at: scene.ground,
    });
    expect(scene.cursors.count).toBe(0);
    // The keyboard shows its cursor again.
    scene.board.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(scene.cursors.count).toBeGreaterThan(0);
    scene.host.destroy();
  });

  it("lets the cursor box go from a tapped tile a harvest has emptied", () => {
    const scene = setUp("REDUCED");
    scene.tap(scene.ground);
    // The app lets the tile go (its harvest emptied it); the next draw has
    // no cursor box there and plays no puff.
    scene.host.releaseCursor(scene.ground);
    scene.cursors.count = 0;
    scene.host.update({
      matchInstanceId: 1,
      view: viewForV7(initialV7(71), initialV7(71).humanPlayerId),
      offeredCommands: [],
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    expect(scene.cursors.count).toBe(0);
    expect(scene.effects.dataset.fogPuff).toBeUndefined();
    scene.host.destroy();
  });

  it("keeps the cursor box when the keyboard activates the tile", () => {
    const scene = setUp("REDUCED");
    scene.selections.mockImplementation(() =>
      scene.host.quietTap(scene.ground),
    );
    scene.cursors.count = 0;
    scene.host.activate(scene.ground);
    expect(scene.cursors.count).toBeGreaterThan(0);
    scene.host.destroy();
  });
});
