// @vitest-environment jsdom

// Long AI turns hurry (bead pulp_wars-2yc.114), through the real canvas
// board host on hand-built boundaries (engine-applied commands on a small
// fully explored board; no match is played): the ramp after a seat's first
// twelve seen boundaries, the instant playback of what does not matter and
// plays off the canvas, the beat an attack on the viewer keeps, and the
// board drawn at most once a frame.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoordV7, PlayerViewV7 } from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import type { CameraState } from "../../src/render/canvas/geometry";
import { chibiBoardWorldBounds } from "../../src/render/canvas/chibi-geometry-v7";
import {
  cellsOffscreenV7,
  playbackCameraTargetV7,
  playbackStepCellsV7,
} from "../../src/render/canvas/playback-camera-v7";
import {
  HURRY_CALM_BOUNDARIES_V7,
  HURRY_RUSH_BOUNDARIES_V7,
  HURRY_RUSH_SCALE_V7,
  hurryScaleCapV7,
} from "../../src/render/canvas/playback-hurry-v7";
import { MIN_DURATION_SCALE_V7 } from "../../src/render/canvas/playback-pacing-v7";
import {
  corePresentationPlanV7,
  type PresentationStepCueV7,
} from "../../src/render/canvas/presentation-plan-v7";
import {
  asOwn,
  hurryBaseStateV7 as base,
  rivalAttack,
  rivalMove,
  type BoundaryV7,
} from "../fixtures/ruleset7-ai-hurry";

afterEach(() => vi.restoreAllMocks());

const cellsOf = (boundary: BoundaryV7): readonly CoordV7[] =>
  corePresentationPlanV7(
    boundary.before,
    boundary.events,
    boundary.after,
  ).flatMap((step) => playbackStepCellsV7(step));

describe("Long AI turns hurry (pulp_wars-2yc.114)", () => {
  it("plays a seat's first twelve seen boundaries calm, then ramps down to the rush scale", async () => {
    const boundary = rivalMove({ x: 4, y: 4 });
    for (const speed of ["NORMAL", "FAST"] as const) {
      const rig = hostRig(boundary.after, speed);
      const scales: (number | null)[] = [];
      for (let index = 0; index < HURRY_RUSH_BOUNDARIES_V7 + 3; index++)
        scales.push(await rig.play(boundary));
      const calm = speed === "FAST" ? 0.5 : 1;
      expect(scales.slice(0, HURRY_CALM_BOUNDARIES_V7)).toEqual(
        Array(HURRY_CALM_BOUNDARIES_V7).fill(calm),
      );
      scales.forEach((scale, played) =>
        expect(scale).toBeCloseTo(Math.min(calm, hurryScaleCapV7(played))),
      );
      expect(scales.at(-1)).toBe(HURRY_RUSH_SCALE_V7);
      // The seat's next turn starts calm again.
      expect(await rig.play(rivalMove({ x: 4, y: 4 }, base.round + 1))).toBe(
        calm,
      );
      rig.host.destroy();
    }
  });

  it("never hurries the viewer's own boundaries", async () => {
    const own = asOwn(rivalMove({ x: 4, y: 4 }));
    const rig = hostRig(own.after);
    for (let index = 0; index < HURRY_RUSH_BOUNDARIES_V7 + 3; index++)
      expect(await rig.play(own)).toBe(1);
    rig.host.destroy();
  });

  it("shows at once a hurried boundary that does not matter and plays off the canvas", async () => {
    const near = rivalMove({ x: 4, y: 4 });
    const far = rivalMove({ x: 0, y: 10 });
    const rig = hostRig(near.after);
    rig.zoomIn();
    expect(cellsOffscreenV7(rig.camera(), cellsOf(far), rig.viewport)).toBe(
      true,
    );
    for (let index = 0; index < HURRY_CALM_BOUNDARIES_V7; index++)
      await rig.play(near);
    const camera = rig.camera();
    const cues = rig.cues.length;
    const draws = rig.draws();
    // No frame is needed: the boundary is over as soon as it starts.
    let over = false;
    void rig.host
      .presentBoundary(far.before, far.after, far.events)
      .then(() => (over = true));
    await rig.settle();
    expect(over).toBe(true);
    expect(rig.cues).toHaveLength(cues);
    expect(rig.draws()).toBe(draws);
    // The next frame draws the result once, where the camera was.
    await rig.frame(16);
    expect(rig.draws()).toBe(draws + 1);
    expect(rig.camera()).toEqual(camera);
    expect(rig.frames.size).toBe(0);
    rig.host.destroy();
  });

  it("plays a hurried boundary that does not matter where it is, without moving the camera", async () => {
    const near = rivalMove({ x: 4, y: 4 });
    const rig = hostRig(near.after);
    rig.zoomIn();
    for (let index = 0; index < HURRY_CALM_BOUNDARIES_V7; index++)
      await rig.play(near);
    const camera = rig.camera();
    // A move on the canvas but outside the comfort zone, which a calm turn
    // would glide to.
    const edge = base.board.tiles
      .map((tile) => {
        try {
          return rivalMove(tile.at);
        } catch {
          return null;
        }
      })
      .find(
        (boundary) =>
          boundary !== null &&
          !cellsOffscreenV7(camera, cellsOf(boundary), rig.viewport) &&
          playbackCameraTargetV7({
            camera,
            viewport: rig.viewport,
            band: { top: 0, bottom: rig.viewport.height },
            cells: cellsOf(boundary),
            board: chibiBoardWorldBounds(base.board),
          }) !== null,
      );
    if (edge === undefined || edge === null)
      throw new Error("No move at the edge of the canvas");
    // It plays (announced, animated), on a still map.
    expect(await rig.play(edge)).not.toBeNull();
    expect(rig.camera()).toEqual(camera);
    rig.host.destroy();
  });

  it("still frames an off-canvas boundary while the turn is calm", async () => {
    const near = rivalMove({ x: 4, y: 4 });
    const far = rivalMove({ x: 0, y: 10 });
    const rig = hostRig(near.after);
    rig.zoomIn();
    const camera = rig.camera();
    await rig.play(far);
    expect(rig.camera()).not.toEqual(camera);
    expect(rig.cues.some((cue) => cue.step.kind === "MOVE")).toBe(true);
    rig.host.destroy();
  });

  it("keeps a readable beat for an attack on the viewer's unit and frames it, late in a long turn", async () => {
    const far = rivalMove({ x: 0, y: 10 });
    const attack = rivalAttack();
    const rig = hostRig(far.after);
    rig.zoomIn();
    // The calm opening frames the far corner; the attack is off the canvas.
    for (let index = 0; index < HURRY_RUSH_BOUNDARIES_V7 + 2; index++)
      await rig.play(far);
    expect(cellsOffscreenV7(rig.camera(), cellsOf(attack), rig.viewport)).toBe(
      true,
    );
    const camera = rig.camera();
    const scale = await rig.play(attack);
    // Played, at the floor (the old Normal pace), not at the rush scale.
    expect(scale).toBe(MIN_DURATION_SCALE_V7);
    expect(
      rig.cues.some(
        (cue) => cue.step.kind === "MELEE" || cue.step.kind === "RANGED",
      ),
    ).toBe(true);
    // The camera came to it.
    expect(rig.camera()).not.toEqual(camera);
    rig.host.destroy();
  });

  it("draws the board at most once a frame while a boundary plays", async () => {
    const boundary = rivalMove({ x: 4, y: 4 });
    const rig = hostRig(boundary.after);
    const done = rig.host.presentBoundary(
      boundary.before,
      boundary.after,
      boundary.events,
    );
    await rig.frame(16);
    const draws = rig.draws();
    // Game updates (one for every AI command) while it plays draw nothing
    // at once.
    for (let index = 0; index < 5; index++) rig.host.update(rig.model);
    expect(rig.draws()).toBe(draws);
    await rig.frame(16);
    expect(rig.draws()).toBe(draws + 1);
    await rig.drain();
    await done;
    rig.host.destroy();
  });

  it("draws a run of instant boundaries once, with the next frame", async () => {
    const near = rivalMove({ x: 4, y: 4 });
    const far = rivalMove({ x: 0, y: 10 });
    const rig = hostRig(near.after);
    rig.zoomIn();
    for (let index = 0; index < HURRY_CALM_BOUNDARIES_V7; index++)
      await rig.play(near);
    const draws = rig.draws();
    for (let index = 0; index < 5; index++) {
      // The queue holds each result while the next waits, like the app.
      await rig.host.presentBoundary(far.before, far.after, far.events, {
        holdResult: () => index < 4,
      });
      rig.host.update(rig.model);
    }
    await rig.frame(16);
    expect(rig.draws()).toBe(draws + 1);
    await rig.frame(16);
    expect(rig.draws()).toBe(draws + 1);
    rig.host.destroy();
  });

  it("reuses the terrain packing of a plan for every frame of a walk", async () => {
    const boundary = rivalMove({ x: 4, y: 4 });
    const rig = hostRig(boundary.after);
    const done = rig.host.presentBoundary(
      boundary.before,
      boundary.after,
      boundary.events,
    );
    for (let index = 0; index < 4; index++) await rig.frame(40);
    await rig.drain();
    await done;
    const walking = rig.inputs.filter(
      (input) => input.terrainPlan !== undefined,
    );
    expect(walking.length).toBeGreaterThan(2);
    // One terrain plan for the walk; a plan of its own for every frame.
    expect(new Set(walking.map((input) => input.terrainPlan)).size).toBe(1);
    expect(new Set(walking.map((input) => input.plan)).size).toBe(
      walking.length,
    );
    const terrain = walking[0]?.terrainPlan;
    for (const input of walking)
      expect(
        input.plan.entries.filter(
          (entry) => entry.kind !== "UNIT" && entry.kind !== "SELECTION",
        ),
      ).toEqual(
        terrain?.entries.filter(
          (entry) => entry.kind !== "UNIT" && entry.kind !== "SELECTION",
        ),
      );
    rig.host.destroy();
  });
});

type DrawInputV7 = Parameters<typeof renderer.drawBoardV7>[0];

function hostRig(
  view: PlayerViewV7,
  speed: BoardHostModelV7["animationSpeed"] = "NORMAL",
) {
  const viewport = { width: 480, height: 360 };
  let now = 0;
  let nextFrame = 1;
  let camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  const inputs: DrawInputV7[] = [];
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
    inputs.push(input);
  });
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
  const cues: PresentationStepCueV7[] = [];
  host.setPresentationStepListener((cue) => cues.push(cue));
  const model: BoardHostModelV7 = {
    matchInstanceId: 1,
    view,
    offeredCommands: [],
    interactive: false,
    motion: "FULL",
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
  const settle = async () => {
    for (let index = 0; index < 6; index++) await Promise.resolve();
  };
  const frame = async (milliseconds: number) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
    await settle();
  };
  const drain = async () => {
    for (let index = 0; index < 40 && frames.size; index++) await frame(250);
    expect(frames.size).toBe(0);
  };
  return {
    host,
    model,
    viewport,
    frames,
    cues,
    inputs,
    camera: () => camera,
    draws: () => inputs.length,
    frame,
    settle,
    drain,
    /**
     * Two zoom steps in, taken while the viewer's own turn shows (a zoom
     * during another seat's playback takes the camera from that seat).
     */
    zoomIn() {
      const own = {
        ...model,
        view: {
          ...view,
          activeSeatIndex: view.turnOrder.indexOf(view.viewer.id),
        },
      };
      host.update(own);
      host.zoom("IN");
      host.zoom("IN");
      host.update(model);
    },
    /** Plays `boundary` to its end; the time scale its first step had. */
    async play(boundary: BoundaryV7): Promise<number | null> {
      const first = cues.length;
      const done = host.presentBoundary(
        boundary.before,
        boundary.after,
        boundary.events,
      );
      await settle();
      await drain();
      await done;
      return cues[first]?.durationScale ?? null;
    },
  };
}
