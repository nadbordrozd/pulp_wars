// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { viewForV7, type CoordV7 } from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { presentationFailureCountV7 } from "../../src/render/presentation-guard-v7";
import { combatJuiceFixtureV7 } from "../fixtures/v7-combat-juice-ui";

/**
 * Bead pulp_wars-2yc.93 (the mobile freeze): on the real board host, a
 * frame that throws is logged and survived. Before, the throw left a drag's
 * pointer bookkeeping behind (each move panned by the whole drag so far, so
 * a swipe raced), and a playback step waiting for its frames never ended.
 * Mounting again, or taking the board down, always removes the old
 * canvas's input listeners.
 */

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

interface Scene {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  breakFrames(): void;
  step(ms: number): Promise<void>;
}

function setUp(): Scene {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let now = 0;
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  let nextFrame = 1;
  const frames = new Map<number, FrameRequestCallback>();
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      const id = nextFrame;
      nextFrame += 1;
      frames.set(id, callback);
      return id;
    },
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => frames.delete(id),
  });
  let broken = false;
  const target: Record<PropertyKey, unknown> = {};
  const context = new Proxy(target, {
    get: (object, key) =>
      key in object
        ? object[key]
        : () => {
            if (broken) throw new Error("broken frame");
            return undefined;
          },
    set: (object, key, value) => {
      object[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
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
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const state = combatJuiceFixtureV7();
  host.update({
    matchInstanceId: 1,
    view: viewForV7(state, state.humanPlayerId),
    offeredCommands: [],
    interactive: true,
    motion: "FULL",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  const canvas = container.querySelector<HTMLCanvasElement>(
    "canvas.board-canvas-v7",
  );
  if (canvas === null) throw new Error("no board canvas");
  return {
    host,
    canvas,
    container,
    breakFrames: () => {
      broken = true;
    },
    async step(ms: number) {
      now += ms;
      const waiting = [...frames.values()];
      frames.clear();
      for (const callback of waiting) callback(now);
      for (let flush = 0; flush < 8; flush += 1) await Promise.resolve();
    },
  };
}

function pointer(
  type: string,
  x: number,
  y: number,
  pointerId = 1,
): PointerEvent {
  return new PointerEvent(type, {
    pointerId,
    pointerType: "touch",
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Zoomed in (so the camera has room), drags 6 moves of 5 px to the left;
 * how far a tile moved on screen.
 */
function drag(scene: Scene, at: CoordV7): number {
  for (let step = 0; step < 4; step += 1) scene.host.zoom("IN");
  const before = scene.host.cellCentreCssPx(at).x;
  scene.canvas.dispatchEvent(pointer("pointerdown", 400, 300));
  for (let move = 1; move <= 6; move += 1)
    scene.canvas.dispatchEvent(pointer("pointermove", 400 - move * 5, 300));
  scene.canvas.dispatchEvent(pointer("pointerup", 370, 300));
  return before - scene.host.cellCentreCssPx(at).x;
}

describe("The board host survives a failing frame (pulp_wars-2yc.93)", () => {
  it("pans a drag by the finger's own distance while every frame throws", () => {
    const working = setUp();
    const at = { x: 3, y: 3 };
    const healthy = drag(working, at);
    working.host.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    const scene = setUp();
    scene.breakFrames();
    const failuresBefore = presentationFailureCountV7();
    const broken = drag(scene, at);
    // The drag pans exactly as on a healthy board, never by the whole drag
    // so far at every move.
    expect(healthy).toBeGreaterThan(0);
    // The first 5 px are under the 6 px tap slop.
    expect(healthy).toBe(25);
    expect(broken).toBe(healthy);
    expect(presentationFailureCountV7()).toBeGreaterThan(failuresBefore);
    // Logged, not thrown at the page, and once per distinct failure.
    expect(
      vi
        .mocked(console.error)
        .mock.calls.filter((call) =>
          String(call[0]).includes("the board's frame"),
        ),
    ).toHaveLength(1);
  });

  it("ends a playback whose frames throw instead of waiting for ever", async () => {
    const scene = setUp();
    const state = combatJuiceFixtureV7();
    const before = viewForV7(state, state.humanPlayerId);
    const unit = state.units.find(
      (candidate) => candidate.ownerId === state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("no unit");
    // A unit that steps one tile: the playback slides it over frames.
    const moved = {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: unit.at.x, y: unit.at.y + 1 } }
          : candidate,
      ),
    };
    const after = viewForV7(moved, state.humanPlayerId);
    scene.breakFrames();
    let finished = false;
    void scene.host
      .presentBoundary(before, after, {
        format: "pulp-wars-player-events",
        version: 1,
        viewerId: state.humanPlayerId,
        events: [
          {
            kind: "UNIT_MOVED",
            unitId: unit.id,
            from: unit.at,
            to: { x: unit.at.x, y: unit.at.y + 1 },
            path: [{ x: unit.at.x, y: unit.at.y + 1 }],
          },
        ],
      } as never)
      .then(() => {
        finished = true;
      });
    for (let frame = 0; frame < 200 && !finished; frame += 1)
      await scene.step(16);
    expect(finished).toBe(true);
  });

  it("leaves one set of input listeners when mounted again, and none once taken down", () => {
    const scene = setUp();
    const removed = vi.spyOn(scene.canvas, "removeEventListener");
    const second = document.createElement("div");
    document.body.append(second);
    scene.host.mount(second, { onSelection: vi.fn(), onCommand: vi.fn() });
    const types = removed.mock.calls.map((call) => call[0]);
    for (const type of [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
    ])
      expect(types).toContain(type);
    const mounted = second.querySelector<HTMLCanvasElement>(
      "canvas.board-canvas-v7",
    );
    if (mounted === null) throw new Error("no second canvas");
    const removedLater = vi.spyOn(mounted, "removeEventListener");
    scene.breakFrames();
    // Taking the board down while its frames throw still removes them.
    expect(() => scene.host.destroy()).not.toThrow();
    expect(removedLater.mock.calls.map((call) => call[0])).toContain(
      "pointermove",
    );
  });
});
