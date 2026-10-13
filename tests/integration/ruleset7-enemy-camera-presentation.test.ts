// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import {
  corePresentationPlanV7,
  type PresentationStepCueV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { chibiBoardWorldBounds } from "../../src/render/canvas/chibi-geometry-v7";
import {
  TILE_HEIGHT,
  type CameraState,
} from "../../src/render/canvas/geometry";
import {
  CAMERA_GLIDE_MAX_MS_V7,
  CAMERA_GLIDE_MIN_MS_V7,
  cellsOffscreenV7,
  playbackCameraTargetV7,
} from "../../src/render/canvas/playback-camera-v7";
import { MOVE_TILE_MS_V7 } from "../../src/render/canvas/playback-pacing-v7";
import { enemyCameraFixtureV7 } from "../fixtures/ruleset7-enemy-camera";

afterEach(() => vi.restoreAllMocks());

type FixtureV7 = ReturnType<typeof enemyCameraFixtureV7>;

/**
 * The same boundary played `dy` rows away (a hand-built event list: the
 * fixture's unit and its Move, shifted on the fully explored board). The
 * fixture's own Move runs along row 4, inside the comfort zone of the
 * fitted camera; rows 0 and 9 are in view but outside the zone.
 */
function shifted(fixture: FixtureV7, dy: number, unitId?: number): FixtureV7 {
  const shift = (at: CoordV7): CoordV7 => ({ x: at.x, y: at.y + dy });
  const own = fixture.before.units[0];
  if (own === undefined) throw new Error("Missing the fixture unit");
  const id = (unitId ?? own.id) as typeof own.id;
  const units = (view: FixtureV7["before"]): FixtureV7["before"] => ({
    ...view,
    units: view.units.map((unit) => ({ ...unit, id, at: shift(unit.at) })),
  });
  return {
    ...fixture,
    before: units(fixture.before),
    after: units(fixture.after),
    events: {
      ...fixture.events,
      events: fixture.events.events.map((event) =>
        event.kind === "UNIT_MOVED"
          ? { ...event, unitId: id, path: event.path.map(shift) }
          : event,
      ),
    },
    at: shift(fixture.at),
  };
}

/** The fixture's boundary as another seat's (a third player's) playback. */
function otherSeat(fixture: FixtureV7): FixtureV7 {
  return {
    ...fixture,
    before: {
      ...fixture.before,
      turnOrder: [
        ...fixture.before.turnOrder,
        99 as (typeof fixture.before.turnOrder)[number],
      ],
      activeSeatIndex: fixture.before.turnOrder.length,
    },
  };
}

const path = (fixture: FixtureV7): readonly CoordV7[] =>
  [4, 5, 6, 7].map((x) => ({ x, y: fixture.at.y }));

describe("Enemy action camera presentation through public observations", () => {
  it.each(["FULL", "REDUCED"] as const)(
    "keeps hidden moves and hidden builds stationary with no animation delay in %s motion",
    async (motion) => {
      for (const scenario of ["hidden-move", "hidden-build"] as const) {
        const fixture = enemyCameraFixtureV7(scenario);
        const rig = hostRig(fixture, motion);
        const camera = rig.camera();
        await rig.host.presentBoundary(
          fixture.before,
          fixture.after,
          fixture.events,
        );
        expect(rig.camera()).toEqual(camera);
        expect(rig.frames.size).toBe(0);
        rig.host.destroy();
      }
    },
  );

  // Bead pulp_wars-2yc.49: the camera used to cut to the unit and then
  // re-centre on it every frame of its walk. Now a move in view plays on a
  // still map.
  it.each([
    ["NORMAL", 1],
    ["FAST", 0.5],
  ] as const)(
    "holds the camera still for a move inside the comfort zone, at %s speed",
    async (speed, scale) => {
      const fixture = enemyCameraFixtureV7("visible-move");
      const rig = hostRig(fixture, "FULL", speed);
      const initial = rig.camera();
      expect(rig.target(path(fixture))).toBeNull();
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      const duration = 3 * MOVE_TILE_MS_V7 * scale;
      // The unit starts at once, eased in: an eighth of the way through
      // its time it has covered well under an eighth of the path.
      await rig.frame(0);
      await rig.frame(duration / 8);
      const early = rig.unitAt(fixture);
      expect(early?.x).toBeGreaterThan(4);
      expect(early?.x).toBeLessThan(4 + 3 / 8);
      await rig.frame(duration * (3 / 8));
      expect(rig.unitAt(fixture)?.x).toBeCloseTo(5.5);
      // It is still walking just before its time is up, and done at it.
      await rig.frame(duration / 2 - 1);
      expect(rig.frames.size).toBe(1);
      await rig.frame(1);
      await done;
      expect(rig.frames.size).toBe(0);
      expect(rig.cameras.every((camera) => same(camera, initial))).toBe(true);
      rig.host.destroy();
    },
  );

  it("plays a cluster of moves in view without moving the camera once", async () => {
    const fixture = enemyCameraFixtureV7("visible-move");
    const rig = hostRig(fixture);
    const initial = rig.camera();
    // Six units walk rows 3 to 6, all inside the comfort zone.
    for (const [index, dy] of [0, 1, -1, 2, 0, 1].entries()) {
      const boundary = shifted(fixture, dy, 100 + index);
      const done = rig.host.presentBoundary(
        boundary.before,
        boundary.after,
        boundary.events,
      );
      await rig.drain();
      await done;
    }
    expect(rig.cameras.length).toBeGreaterThan(6);
    expect(rig.cameras.every((camera) => same(camera, initial))).toBe(true);
    rig.host.destroy();
  });

  it("glides once to a move outside the comfort zone, and the unit starts when the camera rests", async () => {
    const fixture = shifted(enemyCameraFixtureV7("visible-move"), 5);
    const rig = hostRig(fixture);
    const initial = rig.camera();
    const target = rig.target(path(fixture));
    if (target === null) throw new Error("Row 9 is inside the comfort zone");
    const heard: PresentationStepCueV7[] = [];
    rig.host.setPresentationStepListener((cue) => heard.push(cue));
    const done = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    // No cut: the first frame is where the camera was, the unit waiting.
    await rig.frame(0);
    expect(rig.camera()).toEqual(initial);
    expect(rig.unitAt(fixture)).toEqual({ x: 4, y: 9 });
    let previous = initial.offsetY;
    let elapsed = 0;
    while (!same(rig.camera(), target)) {
      await rig.frame(16);
      elapsed += 16;
      // Straight towards the target, never past it; the unit has not left
      // its first tile and its step has not been announced.
      expect(rig.camera().offsetY).toBeLessThanOrEqual(previous);
      expect(rig.camera().offsetY).toBeGreaterThanOrEqual(target.offsetY);
      expect(rig.camera().offsetX).toBeGreaterThanOrEqual(
        Math.min(initial.offsetX, target.offsetX),
      );
      expect(rig.camera().offsetX).toBeLessThanOrEqual(
        Math.max(initial.offsetX, target.offsetX),
      );
      expect(rig.camera().zoom).toBe(initial.zoom);
      expect(rig.unitAt(fixture)).toEqual({ x: 4, y: 9 });
      if (!same(rig.camera(), target)) expect(heard).toEqual([]);
      previous = rig.camera().offsetY;
      if (elapsed > 2000) throw new Error("The glide never settled");
    }
    expect(elapsed).toBeGreaterThanOrEqual(CAMERA_GLIDE_MIN_MS_V7);
    expect(elapsed).toBeLessThanOrEqual(CAMERA_GLIDE_MAX_MS_V7 + 16);
    // The event is framed: every tile of it is on the canvas (the board's
    // edge keeps it out of the middle), and asked again the camera holds.
    expect(cellsOffscreenV7(target, path(fixture), rig.viewport)).toBe(false);
    for (const cell of path(fixture)) {
      const y = target.offsetY + cell.y * TILE_HEIGHT * target.zoom;
      expect(y - (TILE_HEIGHT * target.zoom) / 2).toBeGreaterThanOrEqual(0);
      expect(y + (TILE_HEIGHT * target.zoom) / 2).toBeLessThanOrEqual(600);
    }
    expect(rig.target(path(fixture))).toBeNull();
    // Then the unit walks, on a camera that no longer moves.
    const settledAt = rig.cameras.length;
    await rig.frame(0);
    await rig.frame(MOVE_TILE_MS_V7);
    expect(heard.map((cue) => cue.step.kind)).toEqual(["MOVE"]);
    expect(rig.unitAt(fixture)?.x).toBeGreaterThan(4);
    await rig.drain();
    await done;
    expect(
      rig.cameras.slice(settledAt).every((camera) => same(camera, target)),
    ).toBe(true);
    // A second move in the same place: the camera holds.
    const again = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    await rig.drain();
    await again;
    expect(rig.camera()).toEqual(target);
    rig.host.destroy();
  });

  it("frames the move with a queued move near it, and hurries a long queue", async () => {
    const fixture = shifted(enemyCameraFixtureV7("visible-move"), 5);
    const near = shifted(enemyCameraFixtureV7("visible-move"), 2, 77);
    // A small canvas, so the board is much larger than the view.
    const rig = hostRig(fixture, "FULL", "NORMAL", { width: 400, height: 320 });
    const queued = {
      before: near.before,
      after: near.after,
      events: near.events,
    };
    const alone = rig.target(path(fixture));
    const together = rig.target(path(fixture), [path(near)]);
    if (alone === null || together === null)
      throw new Error("Row 9 is inside the comfort zone");
    expect(together).not.toEqual(alone);
    const done = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
      { upcoming: [queued] },
    );
    await rig.drain();
    await done;
    expect(rig.camera()).toEqual(together);
    // The queued move then plays without a camera move.
    const next = rig.host.presentBoundary(near.before, near.after, near.events);
    await rig.drain();
    await next;
    expect(rig.camera()).toEqual(together);
    // Eight boundaries waiting: the walk takes 90 ms a tile, as it used to.
    const hurried = rig.host.presentBoundary(
      near.before,
      near.after,
      near.events,
      { upcoming: Array.from({ length: 8 }, () => queued) },
    );
    await rig.frame(0);
    await rig.frame(3 * 90 - 1);
    expect(rig.frames.size).toBe(1);
    await rig.frame(1);
    await hurried;
    expect(rig.frames.size).toBe(0);
    rig.host.destroy();
  });

  it("waits a beat before the next unit walks in the same view", async () => {
    const fixture = enemyCameraFixtureV7("visible-move");
    const second = shifted(fixture, 1, 55);
    const rig = hostRig(fixture);
    const first = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    await rig.drain();
    await first;
    // 40 ms later the next unit's boundary arrives: it waits the other 80.
    rig.advance(40);
    const done = rig.host.presentBoundary(
      second.before,
      second.after,
      second.events,
    );
    await rig.frame(0);
    await rig.frame(79);
    expect(rig.unitAt(second)).toEqual({ x: 4, y: 5 });
    await rig.frame(1);
    await rig.frame(0);
    await rig.frame(MOVE_TILE_MS_V7);
    expect(rig.unitAt(second)?.x).toBeGreaterThan(4);
    await rig.drain();
    await done;
    // The same unit moving again does not wait.
    const again = rig.host.presentBoundary(
      second.before,
      second.after,
      second.events,
    );
    await rig.frame(0);
    await rig.frame(MOVE_TILE_MS_V7);
    expect(rig.unitAt(second)?.x).toBeGreaterThan(4);
    rig.host.finishPresentations();
    await again;
    rig.host.destroy();
  });

  it.each(["inside", "outside"] as const)(
    "cuts in reduced motion only for a move %s the comfort zone",
    async (where) => {
      const base = enemyCameraFixtureV7("visible-move");
      const fixture = where === "inside" ? base : shifted(base, 5);
      const rig = hostRig(fixture, "REDUCED");
      const initial = rig.camera();
      const target = rig.target(path(fixture));
      expect(target === null).toBe(where === "inside");
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      // No travel: the very next frame is the framed camera, or the old one.
      await rig.frame(0);
      const framed = rig.camera();
      expect(framed).toEqual(target ?? initial);
      await rig.frame(50);
      expect(rig.camera()).toEqual(framed);
      rig.host.finishPresentations();
      await done;
      expect(rig.frames.size).toBe(0);
      expect(
        rig.cameras.every(
          (camera) => same(camera, initial) || same(camera, framed),
        ),
      ).toBe(true);
      rig.host.destroy();
    },
  );

  it("glides to a visible improvement outside the comfort zone, then holds for the next one", async () => {
    const fixture = enemyCameraFixtureV7("visible-build");
    const rig = hostRig(fixture);
    const initial = rig.camera();
    const target = rig.target([fixture.at]);
    if (target === null) throw new Error("The build is in the comfort zone");
    const done = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    await rig.frame(0);
    await rig.frame(90);
    // Part of the way: a glide, not the cut it used to be.
    expect(rig.camera()).not.toEqual(initial);
    expect(rig.camera()).not.toEqual(target);
    expect(rig.frames.size).toBe(1);
    await rig.drain();
    await done;
    expect(rig.camera()).toEqual(target);
    const again = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    await rig.drain();
    await again;
    expect(rig.cameras.at(-1)).toEqual(target);
    rig.host.destroy();
  });

  it("puts the camera on its target when the presentation is finished mid-glide", async () => {
    const fixture = shifted(enemyCameraFixtureV7("visible-move"), 5);
    const rig = hostRig(fixture);
    const target = rig.target(path(fixture));
    const done = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    await rig.frame(0);
    await rig.frame(48);
    expect(rig.camera()).not.toEqual(target);
    rig.host.finishPresentations();
    await done;
    expect(rig.camera()).toEqual(target);
    expect(rig.frames.size).toBe(0);
    rig.host.destroy();
  });

  it.each(["drag", "wheel", "keyboard", "zoom-button"])(
    "lets %s input take the camera for the rest of that seat's playback",
    async (input) => {
      const fixture = shifted(enemyCameraFixtureV7("visible-move"), 5);
      const rig = hostRig(fixture);
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      // Mid-glide.
      await rig.frame(0);
      await rig.frame(48);
      if (input === "zoom-button") rig.host.zoom("IN");
      else if (input === "wheel")
        rig.canvas.dispatchEvent(
          new WheelEvent("wheel", { deltaY: -20, clientX: 200, clientY: 200 }),
        );
      else if (input === "keyboard")
        rig.canvas.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowLeft" }),
        );
      else {
        const pointer = (type: string, x: number) => {
          const event = new MouseEvent(type, { clientX: x, clientY: 200 });
          Object.defineProperty(event, "pointerId", { value: 1 });
          rig.canvas.dispatchEvent(event);
        };
        pointer("pointerdown", 200);
        pointer("pointermove", 280);
        pointer("pointerup", 280);
      }
      // The glide stops where the player left the camera.
      await rig.frame(0);
      const manual = rig.camera();
      await rig.drain();
      await done;
      expect(rig.camera()).toEqual(manual);
      // The same seat's next event, on the far edge, does not move it.
      const far = shifted(enemyCameraFixtureV7("visible-move"), -4);
      const next = rig.host.presentBoundary(far.before, far.after, far.events);
      await rig.drain();
      await next;
      expect(rig.camera()).toEqual(manual);
      // Another seat's playback is followed again.
      const other = otherSeat(far);
      const followed = rig.host.presentBoundary(
        other.before,
        other.after,
        other.events,
      );
      await rig.drain();
      await followed;
      expect(rig.camera()).not.toEqual(manual);
      expect(rig.target(path(far))).toBeNull();
      rig.host.destroy();
    },
  );

  it.each([
    ["mixed-move", [[4, 5], [7]]],
    ["entering-move", [[6, 7]]],
    ["leaving-move", [[4, 5]]],
  ] as const)(
    "splits %s into public stretches without a hidden origin, endpoint or duration",
    async (scenario, expected) => {
      const fixture = enemyCameraFixtureV7(scenario);
      const steps = corePresentationPlanV7(
        fixture.before,
        fixture.events,
        fixture.after,
      ).filter((step) => step.kind === "MOVE");
      expect(steps.map((step) => step.path.map((at) => at.x))).toEqual(
        expected,
      );
      // Bead pulp_wars-2yc.49: a stretch of one tile takes 240 ms (was 90).
      expect(steps.map((step) => step.durationMs)).toEqual(
        expected.map(() => MOVE_TILE_MS_V7),
      );
      const rig = hostRig(fixture);
      const initial = rig.camera();
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      await rig.drain();
      await done;
      // Every public stretch is in view: the camera never moved.
      expect(rig.cameras.every((camera) => same(camera, initial))).toBe(true);
      rig.host.destroy();
    },
  );

  it("does not track human moves or builds", async () => {
    for (const scenario of ["visible-move", "visible-build"] as const) {
      const base = enemyCameraFixtureV7(scenario);
      // Out of the comfort zone, where another player's move is framed.
      const fixture = scenario === "visible-move" ? shifted(base, 5) : base;
      const humanBefore = {
        ...fixture.before,
        activeSeatIndex: fixture.before.turnOrder.indexOf(
          fixture.before.viewer.id,
        ),
      };
      const rig = hostRig(fixture);
      const initial = rig.camera();
      const done = rig.host.presentBoundary(
        humanBefore,
        fixture.after,
        fixture.events,
      );
      await rig.drain();
      await done;
      expect(rig.camera()).toEqual(initial);
      rig.host.destroy();
    }
  });
});

function same(left: CameraState, right: CameraState): boolean {
  return (
    left.offsetX === right.offsetX &&
    left.offsetY === right.offsetY &&
    left.zoom === right.zoom
  );
}

function hostRig(
  fixture: FixtureV7,
  motion: BoardHostModelV7["motion"] = "FULL",
  speed: BoardHostModelV7["animationSpeed"] = "NORMAL",
  viewport = { width: 800, height: 600 },
) {
  let now = 0;
  let nextFrame = 1;
  let camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  let units = new Map<string, CoordV7>();
  const cameras: CameraState[] = [];
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    camera = input.camera;
    cameras.push(input.camera);
    units = new Map(
      input.plan.entries
        .filter((entry) => entry.kind === "UNIT")
        .map((entry) => [entry.key, entry.at]),
    );
  });
  const band = { top: 0, bottom: viewport.height };
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
    ...viewport,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: viewport.width,
    bottom: viewport.height,
    toJSON: () => ({}),
  });
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const model: BoardHostModelV7 = {
    matchInstanceId: 1,
    view: fixture.after,
    offeredCommands: [],
    interactive: false,
    motion,
    animationSpeed: speed,
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  };
  host.update(model);
  const canvas = container.querySelector("canvas");
  if (canvas === null) throw new Error("Missing camera fixture canvas");
  const frame = async (milliseconds: number) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
    for (let index = 0; index < 6; index++) await Promise.resolve();
  };
  return {
    host,
    model,
    canvas,
    viewport,
    band,
    frames,
    /** Every camera a board frame was drawn with, in order. */
    cameras,
    camera: () => camera,
    /** Where the last frame drew the boundary's unit. */
    unitAt: (boundary: FixtureV7) =>
      units.get(`unit:${boundary.before.units[0]?.id ?? -1}`),
    /** The comfort-zone rule for `cells` under the camera last drawn. */
    target: (
      cells: readonly CoordV7[],
      upcoming: readonly (readonly CoordV7[])[] = [],
    ) =>
      playbackCameraTargetV7({
        camera,
        viewport,
        band,
        cells,
        upcoming,
        board: chibiBoardWorldBounds(fixture.before.board),
      }),
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
    frame,
    drain: async () => {
      for (let index = 0; index < 20 && frames.size; index++) await frame(1000);
      expect(frames.size).toBe(0);
    },
  };
}
