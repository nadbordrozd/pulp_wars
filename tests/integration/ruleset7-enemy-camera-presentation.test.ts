// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  centerCameraOn,
  projectGrid,
  type CameraState,
} from "../../src/render/canvas/geometry";
import { enemyCameraFixtureV7 } from "../fixtures/ruleset7-enemy-camera";

afterEach(() => vi.restoreAllMocks());

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

  it.each(["NORMAL", "FAST"] as const)(
    "centers the moving enemy each frame, keeps zoom and releases the camera in %s mode",
    async (speed) => {
      const fixture = enemyCameraFixtureV7("visible-move");
      const rig = hostRig(fixture, "FULL", speed);
      rig.host.zoom("IN");
      const zoom = rig.camera().zoom;
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      expect(rig.camera()).toEqual(
        centerCameraOn(
          { ...rig.camera(), zoom },
          projectGrid({ x: 4, y: 4 }),
          rig.viewport,
        ),
      );
      await rig.frame(speed === "FAST" ? 67.5 : 135);
      // The existing movement easing reaches 87.5% at half duration.
      expect(rig.camera()).toEqual(
        centerCameraOn(
          { ...rig.camera(), zoom },
          projectGrid({ x: 6.625, y: 4 }),
          rig.viewport,
        ),
      );
      await rig.drain();
      await done;
      expect(rig.camera()).toEqual(
        centerCameraOn(
          { ...rig.camera(), zoom },
          projectGrid(fixture.at),
          rig.viewport,
        ),
      );
      rig.host.zoom("OUT");
      const manual = rig.camera();
      rig.host.update(rig.model);
      expect(rig.camera()).toEqual(manual);
      rig.host.destroy();
    },
  );

  it.each(["visible-build", "visible-move"] as const)(
    "frames %s once in reduced motion and settles cancellation",
    async (scenario) => {
      const fixture = enemyCameraFixtureV7(scenario);
      const rig = hostRig(fixture, "REDUCED");
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      await rig.frame(0);
      const framed = rig.camera();
      expect(framed).toEqual(
        centerCameraOn(framed, projectGrid(fixture.at), rig.viewport),
      );
      await rig.frame(50);
      expect(rig.camera()).toEqual(framed);
      rig.host.finishPresentations();
      await done;
      expect(rig.frames.size).toBe(0);
      rig.host.destroy();
    },
  );

  it("frames a visible improvement while the build crossfade runs", async () => {
    const fixture = enemyCameraFixtureV7("visible-build");
    const rig = hostRig(fixture);
    const initial = rig.camera();
    const done = rig.host.presentBoundary(
      fixture.before,
      fixture.after,
      fixture.events,
    );
    await rig.frame(90);
    expect(rig.camera()).not.toEqual(initial);
    expect(rig.camera()).toEqual(
      centerCameraOn(initial, projectGrid(fixture.at), rig.viewport),
    );
    expect(rig.frames.size).toBe(1);
    await rig.drain();
    await done;
    rig.host.destroy();
  });

  it.each(["drag", "wheel", "keyboard", "zoom-button"])(
    "honors %s camera input during tracking until the next action",
    async (input) => {
      const fixture = enemyCameraFixtureV7("visible-move");
      const rig = hostRig(fixture);
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      await rig.frame(30);
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
      const manual = rig.camera();
      await rig.drain();
      await done;
      expect(rig.camera()).toEqual(manual);
      const next = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      expect(rig.camera()).toEqual(
        centerCameraOn(manual, projectGrid({ x: 4, y: 4 }), rig.viewport),
      );
      rig.host.finishPresentations();
      await next;
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
      expect(steps.map((step) => step.durationMs)).toEqual(
        expected.map(() => 90),
      );
      const rig = hostRig(fixture);
      const done = rig.host.presentBoundary(
        fixture.before,
        fixture.after,
        fixture.events,
      );
      await rig.drain();
      await done;
      const finalX = expected.at(-1)?.at(-1);
      if (finalX === undefined) throw new Error("Missing expected endpoint");
      expect(rig.camera()).toEqual(
        centerCameraOn(
          rig.camera(),
          projectGrid({ x: finalX, y: 4 }),
          rig.viewport,
        ),
      );
      rig.host.destroy();
    },
  );

  it("does not track human moves or builds", async () => {
    for (const scenario of ["visible-move", "visible-build"] as const) {
      const fixture = enemyCameraFixtureV7(scenario);
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

function hostRig(
  fixture: ReturnType<typeof enemyCameraFixtureV7>,
  motion: BoardHostModelV7["motion"] = "FULL",
  speed: BoardHostModelV7["animationSpeed"] = "NORMAL",
) {
  let now = 0;
  let nextFrame = 1;
  let camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
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
  });
  const viewport = { width: 800, height: 600 };
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
    ...viewport,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
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
    frames,
    camera: () => camera,
    frame,
    drain: async () => {
      for (let index = 0; index < 20 && frames.size; index++) await frame(1000);
      expect(frames.size).toBe(0);
    },
  };
}
