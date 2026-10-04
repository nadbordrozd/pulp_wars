// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import {
  CANDY_EFFECT_DURATIONS_V7,
  candyReducedMotionProgressV7,
} from "../../src/render/canvas/candy-effects-v7";
import { CANDY_UI_V7, candyUiFixtureV7 } from "../fixtures/v7-candy-ui";

/**
 * Bead pulp_wars-jdb.6: the Candy cues play on the board host's effects
 * overlay over the result of their command, and reduced motion holds one
 * still frame of each instead of animating it.
 */

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

function boundary(
  state: GameStateV7,
  command: (view: PlayerViewV7) => CommandV7,
) {
  const actor = state.humanPlayerId;
  const before = viewForV7(state, actor);
  const result = applyCommandV7(state, actor, command(before));
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before,
    after: viewForV7(result.state, actor),
    envelope: projectEventsV7(state, result.state, actor, result.events),
  };
}

function setUp(motion: "FULL" | "REDUCED", shot: ReturnType<typeof boundary>) {
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
  const target: Record<PropertyKey, unknown> = { fillStyle: "" };
  const context = new Proxy(target, {
    get: (object, key) => (key in object ? object[key] : vi.fn()),
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
  host.update({
    matchInstanceId: 1,
    view: shot.after,
    offeredCommands: [],
    interactive: false,
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
  return {
    host,
    effects,
    frames,
    /** Runs the next animation frame at `time` ms. */
    step(time: number) {
      const entry = frames.entries().next().value as
        readonly [number, FrameRequestCallback] | undefined;
      if (entry === undefined) throw new Error("animation frame missing");
      frames.delete(entry[0]);
      now = time;
      entry[1](time);
    },
  };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

const rush = () =>
  boundary(candyUiFixtureV7(), (view) => ({
    kind: "SUGAR_RUSH",
    unitId: unitAt(view, CANDY_UI_V7.gumdrop).id,
  }));
const rebake = () =>
  boundary(candyUiFixtureV7(), (view) => ({
    kind: "REBAKE",
    unitId: unitAt(view, CANDY_UI_V7.confectioner).id,
    at: CANDY_UI_V7.crumbsBear,
  }));

describe("Candy cues on the board host", () => {
  it("plays the Sugar Rush sparkle on the overlay, then clears it", async () => {
    const shot = rush();
    const scene = setUp("FULL", shot);
    const presentation = scene.host.presentBoundary(
      shot.before,
      shot.after,
      shot.envelope,
    );
    const duration = CANDY_EFFECT_DURATIONS_V7.RUSH;
    scene.step(duration * 0.25);
    expect(scene.effects.dataset.candyEffect).toBe("RUSH");
    // The cue advances with the (eased) animation clock.
    const early = Number(scene.effects.dataset.candyProgress);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(1);
    scene.step(duration * 0.8);
    const late = Number(scene.effects.dataset.candyProgress);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThanOrEqual(1);
    scene.step(duration);
    await waitUntil(() => scene.effects.dataset.candyEffect === undefined);
    scene.host.finishPresentations();
    await presentation;
    scene.host.destroy();
  });

  it("holds one still frame of each cue under reduced motion", async () => {
    for (const [shot, effect] of [
      [rush(), "RUSH"],
      [rebake(), "REBAKE"],
    ] as const) {
      const scene = setUp("REDUCED", shot);
      const presentation = scene.host.presentBoundary(
        shot.before,
        shot.after,
        shot.envelope,
      );
      // The frame is held at once, without a first animation step.
      expect(scene.effects.dataset.candyEffect).toBe(effect);
      expect(Number(scene.effects.dataset.candyProgress)).toBeCloseTo(
        candyReducedMotionProgressV7(effect),
        3,
      );
      scene.step(1_000);
      await waitUntil(() => scene.effects.dataset.candyEffect === undefined);
      scene.host.finishPresentations();
      await presentation;
      scene.host.destroy();
      vi.restoreAllMocks();
      document.body.innerHTML = "";
    }
  });
});
