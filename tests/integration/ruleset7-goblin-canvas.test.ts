// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import type { CameraState } from "../../src/render/canvas/geometry";
import {
  GOBLIN_SHOWCASE_V7,
  goblinShowcaseFixtureV7,
} from "../fixtures/v7-goblin-ui";

afterEach(() => vi.restoreAllMocks());

describe("Revision 17 explosion presentation on the board host", () => {
  it("bursts each chain wave in order on the effects canvas, camera still", async () => {
    const kaboom = kaboomBoundary();
    const rig = hostRig(kaboom.after, "FULL");
    const camera = rig.camera();
    const waves: string[] = [];
    const done = rig.host.presentBoundary(
      kaboom.before,
      kaboom.after,
      kaboom.events,
    );
    for (let step = 0; step < 40; step += 1) {
      await rig.frame(40);
      const wave = rig.effects.dataset.explosionWave;
      if (wave !== undefined && waves.at(-1) !== wave) waves.push(wave);
      if (wave !== undefined)
        expect(
          Number(rig.effects.dataset.explosionProgress),
        ).toBeLessThanOrEqual(1);
    }
    await rig.drain();
    await done;
    expect(waves).toEqual(["1", "2"]);
    expect(rig.effects.dataset.explosionWave).toBeUndefined();
    // Own Kaboom: the blast is where the player acted, so no camera jump.
    expect(rig.camera()).toEqual(camera);
    rig.host.destroy();
  });

  it("holds each wave at its midpoint under reduced motion", async () => {
    const kaboom = kaboomBoundary();
    const rig = hostRig(kaboom.after, "REDUCED");
    const progress: string[] = [];
    const done = rig.host.presentBoundary(
      kaboom.before,
      kaboom.after,
      kaboom.events,
    );
    for (let step = 0; step < 20; step += 1) {
      const wave = rig.effects.dataset.explosionWave;
      if (wave !== undefined)
        progress.push(`${wave}:${rig.effects.dataset.explosionProgress}`);
      await rig.frame(100);
    }
    await rig.drain();
    await done;
    expect([...new Set(progress)]).toEqual(["1:0.500", "2:0.500"]);
    rig.host.destroy();
  });

  it("pins explosion feedback for review and clears it on presentation", () => {
    const kaboom = kaboomBoundary();
    const rig = hostRig(kaboom.after, "FULL");
    rig.log.length = 0;
    rig.host.pinExplosionFeedback([
      {
        wave: 1,
        progress: 0.4,
        blasts: [{ at: GOBLIN_SHOWCASE_V7.kaboom, kind: "KABOOM", hits: [] }],
      },
    ]);
    expect(rig.log.some((call) => call === "arc")).toBe(true);
    rig.log.length = 0;
    rig.host.finishPresentations();
    expect(rig.log.some((call) => call === "arc")).toBe(false);
    rig.host.destroy();
  });
});

describe("Revision 17 Kaboom! preview camera", () => {
  it.each(["FULL", "REDUCED"] as const)(
    "pans the least distance to frame every blast area, zoom kept (%s motion)",
    async (motion) => {
      const state = goblinShowcaseFixtureV7();
      const view = viewForV7(state, state.humanPlayerId);
      const unit = view.units.find(
        (candidate) =>
          candidate.at.x === GOBLIN_SHOWCASE_V7.kaboom.x &&
          candidate.at.y === GOBLIN_SHOWCASE_V7.kaboom.y,
      );
      if (unit === undefined) throw new Error("Kaboom Goblin missing");
      const rig = hostRig(view, motion);
      const commands = queryPlayerCommandsV7(view);
      const selected = {
        selection: { kind: "UNIT" as const, unitId: unit.id },
        selectedUnitId: unit.id,
        selectedAchievement: null,
      };
      const base = {
        matchInstanceId: 1,
        view,
        offeredCommands: commands,
        interactive: true,
        motion,
        animationSpeed: "NORMAL" as const,
        presentationPaused: false,
        highContrast: false,
      };
      rig.host.update({ ...base, interaction: selected });
      // Push the camera so the blast area (cells 0–3) is off to the left.
      rig.host.zoom("IN");
      for (let step = 0; step < 6; step += 1)
        rig.canvas.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
        );
      const before = rig.camera();
      rig.host.update({
        ...base,
        interaction: { ...selected, kaboomPreviewUnitId: unit.id },
      });
      await rig.frame(400);
      await rig.frame(400);
      const after = rig.camera();
      expect(after.zoom).toBe(before.zoom);
      expect(after).not.toEqual(before);
      const beforeLeft = before.offsetX + (0 * 128 - 64) * before.zoom;
      const beforeTop = before.offsetY + (1 * 128 - 64) * before.zoom;
      expect(Math.min(beforeLeft, beforeTop)).toBeLessThan(8);
      // Blast areas span cells x 0–3, y 1–4 (Kaboom and the wave-2 cart).
      const left = after.offsetX + (0 * 128 - 64) * after.zoom;
      const right = after.offsetX + (3 * 128 + 64) * after.zoom;
      const top = after.offsetY + (1 * 128 - 64) * after.zoom;
      const bottom = after.offsetY + (4 * 128 + 64) * after.zoom;
      expect(left).toBeGreaterThanOrEqual(8 - 1e-6);
      expect(right).toBeLessThanOrEqual(800 - 8 + 1e-6);
      expect(top).toBeGreaterThanOrEqual(8 - 1e-6);
      expect(bottom).toBeLessThanOrEqual(600 - 8 + 1e-6);
      // A second update of the same preview keeps a player's own pan.
      const framed = rig.camera();
      rig.host.update({
        ...base,
        interaction: { ...selected, kaboomPreviewUnitId: unit.id },
      });
      await rig.frame(400);
      expect(rig.camera()).toEqual(framed);
      rig.host.destroy();
    },
  );
});

function kaboomBoundary(): {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: ReturnType<typeof projectEventsV7>;
} {
  const state = goblinShowcaseFixtureV7();
  const actor = state.humanPlayerId;
  const before = viewForV7(state, actor);
  const unit = before.units.find(
    (candidate) =>
      candidate.at.x === GOBLIN_SHOWCASE_V7.kaboom.x &&
      candidate.at.y === GOBLIN_SHOWCASE_V7.kaboom.y,
  );
  if (unit === undefined) throw new Error("Kaboom Goblin missing");
  const result = applyCommandV7(state, actor, {
    kind: "KABOOM",
    unitId: unit.id,
  });
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before,
    after: viewForV7(result.state, actor),
    events: projectEventsV7(state, result.state, actor, result.events),
  };
}

function hostRig(view: PlayerViewV7, motion: BoardHostModelV7["motion"]) {
  let now = 0;
  let nextFrame = 1;
  let camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  const frames = new Map<number, FrameRequestCallback>();
  const log: string[] = [];
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key in target
          ? Reflect.get(target, key)
          : (...args: unknown[]) => {
              void args;
              log.push(String(key));
            },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as CanvasRenderingContext2D,
  );
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    camera = input.camera;
  });
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 600,
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
  host.update({
    matchInstanceId: 1,
    view,
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
  if (effects === null) throw new Error("Missing effects canvas");
  const frame = async (milliseconds: number) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
    for (let index = 0; index < 6; index++) await Promise.resolve();
  };
  const canvas = container.querySelector<HTMLCanvasElement>(
    "canvas.board-canvas-v7",
  );
  if (canvas === null) throw new Error("Missing board canvas");
  return {
    host,
    canvas,
    effects,
    log,
    camera: () => camera,
    frame,
    drain: async () => {
      for (let index = 0; index < 40 && frames.size; index++) await frame(1000);
      expect(frames.size).toBe(0);
    },
  };
}
