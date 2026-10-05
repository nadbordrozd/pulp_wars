// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CoordV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { soundCuesForStepV7 } from "../../src/audio/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import {
  corePresentationPlanV7,
  type PresentationStepCueV7,
} from "../../src/render/canvas/presentation-plan-v7";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-2yc.10: the real board host announces each presentation
 * step as it starts to play, so its sounds are timed with the animation:
 * in order under full motion, each once under reduced motion, and never
 * for steps a cancelled presentation did not reach.
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

/** A Lich's shot: the bolt, its splash burst and the splash damage. */
function lichShot() {
  const state = undeadShowcaseFixtureV7();
  const actor = state.humanPlayerId;
  const before = viewForV7(state, actor);
  const result = applyCommandV7(state, actor, {
    kind: "ATTACK",
    unitId: unitAt(before, UNDEAD_SHOWCASE_V7.lich).id,
    targetUnitId: unitAt(before, UNDEAD_SHOWCASE_V7.lichTarget).id,
  });
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before,
    after: viewForV7(result.state, actor),
    envelope: projectEventsV7(state, result.state, actor, result.events),
  };
}

function setUp(motion: "FULL" | "REDUCED", animationSpeed: "NORMAL" | "FAST") {
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
  const target: Record<PropertyKey, unknown> = {};
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
  const shot = lichShot();
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  host.update({
    matchInstanceId: 1,
    view: shot.after,
    offeredCommands: [],
    interactive: false,
    motion,
    animationSpeed,
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  const cues: PresentationStepCueV7[] = [];
  host.setPresentationStepListener((cue) => cues.push(cue));
  return {
    host,
    shot,
    cues,
    plan: corePresentationPlanV7(shot.before, shot.envelope, shot.after),
    frames,
    /** Finishes the animation that is waiting for a frame. */
    finishFrame(): void {
      const entry = frames.entries().next().value as
        readonly [number, FrameRequestCallback] | undefined;
      if (entry === undefined) throw new Error("animation frame missing");
      frames.delete(entry[0]);
      now += 10_000;
      entry[1](now);
    },
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("presentation step announcements", () => {
  it("announces each step as it starts, in order", async () => {
    const scene = setUp("FULL", "NORMAL");
    expect(scene.plan.length).toBeGreaterThan(1);
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    // Only the shot has started; its splash waits for the bolt to land.
    expect(scene.cues.map((cue) => cue.step)).toEqual([scene.plan[0]]);
    expect(scene.cues[0]?.durationScale).toBe(1);
    expect(scene.cues[0]?.before).toBe(scene.shot.before);
    expect(scene.cues[0]?.envelope).toBe(scene.shot.envelope);
    expect(
      soundCuesForStepV7(required(scene.cues[0])).map((cue) => cue.id),
    ).toEqual(["attack.magic", "impact.hit"]);
    let done = false;
    void presentation.then(() => {
      done = true;
    });
    for (let guard = 0; guard < 200 && !done; guard += 1) {
      if (scene.frames.size > 0) scene.finishFrame();
      await settle();
    }
    expect(done).toBe(true);
    expect(scene.cues.map((cue) => cue.step)).toEqual(scene.plan);
    scene.host.destroy();
  });

  it("does not announce the steps a cancelled presentation never reached", async () => {
    const scene = setUp("FULL", "FAST");
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    expect(scene.cues[0]?.durationScale).toBe(0.5);
    scene.host.finishPresentations();
    await presentation;
    await settle();
    expect(scene.cues.map((cue) => cue.step)).toEqual([scene.plan[0]]);
    scene.host.destroy();
  });

  it("announces every step once under reduced motion", async () => {
    const scene = setUp("REDUCED", "NORMAL");
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    let done = false;
    void presentation.then(() => {
      done = true;
    });
    for (let guard = 0; guard < 200 && !done; guard += 1) {
      if (scene.frames.size > 0) scene.finishFrame();
      await settle();
    }
    expect(done).toBe(true);
    expect(scene.cues.length).toBe(scene.plan.length);
    expect(new Set(scene.cues.map((cue) => cue.step))).toEqual(
      new Set(scene.plan),
    );
    scene.host.destroy();
  });

  it("is not disturbed by a listener that throws, or by none", async () => {
    const scene = setUp("REDUCED", "NORMAL");
    scene.host.setPresentationStepListener(() => {
      throw new Error("listener failed");
    });
    const first = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    scene.host.finishPresentations();
    await first;
    scene.host.setPresentationStepListener(null);
    const second = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    scene.host.finishPresentations();
    await second;
    expect(scene.cues).toEqual([]);
    scene.host.destroy();
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("value missing");
  return value;
}
