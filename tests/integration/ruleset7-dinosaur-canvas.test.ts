// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  previewStampedeV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostCallbacksV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import type { CameraState } from "../../src/render/canvas/geometry";
import {
  eggCountdownTextV7,
  stampedePreviewTextV7,
} from "../../src/render/dinosaur-presentation-v7";
import {
  DINOSAUR_CITY_V7,
  DINOSAUR_SHOWCASE_V7,
  dinosaurCityFixtureV7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";

const AT = DINOSAUR_SHOWCASE_V7;

afterEach(() => vi.restoreAllMocks());

describe("Revision 19 Stampede presentation on the board host", () => {
  it("runs with dust, hits, slides the survivor back, then follows", async () => {
    const stampede = stampedeBoundary();
    const rig = hostRig(stampede.after, "FULL");
    const seen: string[] = [];
    const triceratopsAt: Record<string, CoordV7> = {};
    const targetAt: Record<string, CoordV7> = {};
    const done = rig.host.presentBoundary(
      stampede.before,
      stampede.after,
      stampede.events,
    );
    for (let step = 0; step < 60; step += 1) {
      await rig.frame(20);
      const effect = rig.effects.dataset.dinosaurEffect;
      if (effect === undefined) continue;
      if (seen.at(-1) !== effect) seen.push(effect);
      expect(Number(rig.effects.dataset.dinosaurProgress)).toBeLessThanOrEqual(
        1,
      );
      const triceratops = rig.unitAt(stampede.triceratopsId);
      const target = rig.unitAt(stampede.targetId);
      if (triceratops !== undefined) triceratopsAt[effect] = triceratops;
      if (target !== undefined) targetAt[effect] = target;
    }
    await rig.drain();
    await done;
    expect(seen).toEqual(["STAMPEDE_RUN", "STAMPEDE_HIT"]);
    // During the hit cue the Triceratops waits on the stand tile and the
    // survivor is still on its own tile; neither has jumped ahead.
    expect(triceratopsAt.STAMPEDE_HIT).toEqual({ x: 6, y: 2 });
    expect(targetAt.STAMPEDE_HIT).toEqual(AT.pushTarget);
    // The run keeps the target standing where it was.
    expect(targetAt.STAMPEDE_RUN).toEqual(AT.pushTarget);
    expect(rig.effects.dataset.dinosaurEffect).toBeUndefined();
    // Settled: the target one tile back, the Triceratops on its old tile.
    expect(rig.unitAt(stampede.triceratopsId)).toEqual(AT.pushTarget);
    expect(rig.unitAt(stampede.targetId)).toEqual({ x: 8, y: 2 });
    rig.host.destroy();
  });

  it("holds the hit cue at its midpoint under reduced motion", async () => {
    const stampede = stampedeBoundary();
    const rig = hostRig(stampede.after, "REDUCED");
    const progress = new Set<string>();
    const done = rig.host.presentBoundary(
      stampede.before,
      stampede.after,
      stampede.events,
    );
    for (let step = 0; step < 20; step += 1) {
      const effect = rig.effects.dataset.dinosaurEffect;
      if (effect !== undefined)
        progress.add(`${effect}:${rig.effects.dataset.dinosaurProgress}`);
      await rig.frame(100);
    }
    await rig.drain();
    await done;
    expect([...progress]).toEqual(["STAMPEDE_HIT:0.500"]);
    rig.host.destroy();
  });

  it("wobbles and cracks the Egg, then grows the hatchling in", async () => {
    const hatch = hatchBoundary();
    const rig = hostRig(hatch.after, "FULL");
    const seen: string[] = [];
    const eggShown: boolean[] = [];
    const scales: number[] = [];
    const done = rig.host.presentBoundary(
      hatch.before,
      hatch.after,
      hatch.events,
    );
    for (let step = 0; step < 60; step += 1) {
      await rig.frame(20);
      const effect = rig.effects.dataset.dinosaurEffect;
      if (effect === undefined) continue;
      if (seen.at(-1) !== effect) seen.push(effect);
      if (effect !== "HATCH") continue;
      eggShown.push(rig.isEgg(hatch.eggId));
      const pulse = rig.pulses().find((entry) => entry.unitId === hatch.eggId);
      if (pulse !== undefined) scales.push(pulse.scale);
    }
    await rig.drain();
    await done;
    // The Shaman's call reaches the Egg, then the Hatch cue plays.
    expect(seen).toEqual(["HATCH_CALL", "HATCH"]);
    // First the Egg (the state before), then the hatched unit.
    expect(eggShown[0]).toBe(true);
    expect(eggShown.at(-1)).toBe(false);
    expect(eggShown.indexOf(false)).toBeGreaterThan(0);
    // The hatchling grows from x0.6 to x1; no pulse is left afterwards.
    expect(Math.min(...scales)).toBeLessThan(0.75);
    expect(scales.at(-1)).toBeCloseTo(1, 1);
    expect(rig.pulses()).toEqual([]);
    expect(rig.isEgg(hatch.eggId)).toBe(false);
    rig.host.destroy();
  });

  it("pins Dinosaur cues for review and clears them on presentation", () => {
    const state = dinosaurShowcaseFixtureV7();
    const rig = hostRig(viewForV7(state, state.humanPlayerId), "FULL");
    rig.log.length = 0;
    rig.host.pinDinosaurFeedback([
      { effect: "STAMPEDE_HIT", cells: [AT.pushTarget], progress: 0.3 },
      { effect: "HATCH", cells: [AT.tRexEgg], progress: 0.7 },
    ]);
    expect(rig.log.some((call) => call === "arc")).toBe(true);
    rig.log.length = 0;
    rig.host.finishPresentations();
    expect(rig.log.some((call) => call === "arc")).toBe(false);
    rig.host.destroy();
  });
});

describe("Revision 19 board targets on the board host", () => {
  it("sends the Stampede of an activated target and describes it at the cursor", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const callbacks = { onSelection: vi.fn(), onCommand: vi.fn() };
    const rig = hostRig(view, "FULL", callbacks);
    const triceratops = unitAt(view, AT.triceratops);
    rig.host.update(model(view, triceratops.id));
    rig.host.activate(AT.pushTarget);
    expect(callbacks.onCommand).toHaveBeenCalledTimes(1);
    expect(callbacks.onCommand.mock.calls[0]?.[0]).toMatchObject({
      family: "STAMPEDE",
      at: AT.pushTarget,
      command: {
        kind: "STAMPEDE",
        unitId: triceratops.id,
        targetUnitId: unitAt(view, AT.pushTarget).id,
      },
    });
    // The numbers are the engine's: the target's HP and the Stampede preview.
    const target = unitAt(view, AT.pushTarget);
    const preview = previewStampedeV7(view, triceratops.id, target.id);
    if (preview === null) throw new Error("Stampede not offered");
    expect(rig.description()).toBe(
      `Grass. Juggernaut, ${target.hp} of ${target.maxHp} HP. Available: Stampede preview. ${stampedePreviewTextV7(view, preview).description}`,
    );
    expect(rig.description()).toContain(
      "Pushes Juggernaut back; Triceratops follows. No retaliation.",
    );
    // An Egg under the cursor reads its name and countdown.
    rig.host.update(model(view, null));
    rig.host.activate(AT.tRexEgg);
    const egg = unitAt(view, AT.tRexEgg);
    const turns = view.eggs.find((entry) => entry.unitId === egg.id);
    expect(rig.description()).toBe(
      `Grass. Dinosaur T-Rex Egg (${eggCountdownTextV7(turns?.turnsRemaining ?? 0)}), ${egg.hp} of ${egg.maxHp} HP`,
    );
    expect(callbacks.onSelection).toHaveBeenLastCalledWith({
      kind: "UNIT",
      unitId: unitAt(view, AT.tRexEgg).id,
    });
    rig.host.destroy();
  });

  it("lays the Egg on an activated nest tile and frames the nest tiles", async () => {
    const state = dinosaurCityFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const city = view.cities.find((entry) => entry.ownerId === view.viewer.id);
    if (city === undefined) throw new Error("city missing");
    const callbacks = { onSelection: vi.fn(), onCommand: vi.fn() };
    const rig = hostRig(view, "REDUCED", callbacks);
    const selected = {
      selection: { kind: "CITY" as const, cityId: city.id },
      selectedUnitId: null,
      selectedAchievement: null,
    };
    const base = {
      matchInstanceId: 1,
      view,
      offeredCommands: queryPlayerCommandsV7(view),
      interactive: true,
      motion: "REDUCED" as const,
      animationSpeed: "NORMAL" as const,
      presentationPaused: false,
      highContrast: false,
    };
    rig.host.update({ ...base, interaction: selected });
    // Without the pick, a nest tile is only selected.
    rig.host.activate({ x: 7, y: 7 });
    expect(callbacks.onCommand).not.toHaveBeenCalled();
    // Push the camera so the capital's ring is off to the right.
    rig.host.zoom("IN");
    rig.host.zoom("IN");
    for (let step = 0; step < 12; step += 1)
      rig.canvas.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    const before = rig.camera();
    rig.host.update({
      ...base,
      interaction: { ...selected, layEgg: { cityId: city.id, role: "KNIGHT" } },
    });
    await rig.frame(400);
    const after = rig.camera();
    expect(after.zoom).toBe(before.zoom);
    // The nest tiles span cells x 7–9, y 7–9 around the capital.
    const right = after.offsetX + (9 * 128 + 64) * after.zoom;
    const bottom = after.offsetY + (9 * 128 + 64) * after.zoom;
    expect(right).toBeLessThanOrEqual(800 - 8 + 1e-6);
    expect(bottom).toBeLessThanOrEqual(600 - 8 + 1e-6);
    expect(before.offsetX + (9 * 128 + 64) * before.zoom).toBeGreaterThan(800);
    rig.host.activate({ x: 9, y: 8 });
    expect(callbacks.onCommand).toHaveBeenCalledTimes(1);
    expect(callbacks.onCommand.mock.calls[0]?.[0]).toMatchObject({
      family: "LAY_EGG",
      command: {
        kind: "LAY_EGG",
        cityId: city.id,
        role: "KNIGHT",
        at: { x: 9, y: 8 },
      },
    });
    // The centre is no nest tile: activating it selects, as usual.
    callbacks.onSelection.mockClear();
    rig.host.activate(DINOSAUR_CITY_V7.capital);
    expect(callbacks.onCommand).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelection).toHaveBeenCalledTimes(1);
    rig.host.destroy();
  });
});

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

function model(view: PlayerViewV7, unitId: number | null): BoardHostModelV7 {
  return {
    matchInstanceId: 1,
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    interactive: true,
    motion: "FULL",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: unitId === null ? null : { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
    },
  };
}

function boundary(state: GameStateV7, command: CommandV7) {
  const actor = state.humanPlayerId;
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, actor),
    after: viewForV7(result.state, actor),
    events: projectEventsV7(state, result.state, actor, result.events),
  };
}

function stampedeBoundary() {
  const state = dinosaurShowcaseFixtureV7();
  const view = viewForV7(state, state.humanPlayerId);
  const triceratopsId = unitAt(view, AT.triceratops).id;
  const targetId = unitAt(view, AT.pushTarget).id;
  return {
    ...boundary(state, {
      kind: "STAMPEDE",
      unitId: triceratopsId,
      targetUnitId: targetId,
    }),
    triceratopsId,
    targetId,
  };
}

function hatchBoundary() {
  const state = dinosaurShowcaseFixtureV7();
  const view = viewForV7(state, state.humanPlayerId);
  const eggId = unitAt(view, AT.tRexEgg).id;
  return {
    ...boundary(state, {
      kind: "HATCH",
      unitId: unitAt(view, AT.shaman).id,
      eggUnitId: eggId,
    }),
    eggId,
  };
}

function hostRig(
  view: PlayerViewV7,
  motion: BoardHostModelV7["motion"],
  callbacks: BoardHostCallbacksV7 = {
    onSelection: vi.fn(),
    onCommand: vi.fn(),
  },
) {
  let now = 0;
  let nextFrame = 1;
  let camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  let plan: renderer.BoardRenderPlanV7 = {
    version: 7,
    entries: [],
    targets: [],
  };
  let pulses: readonly renderer.UnitPulseV7[] = [];
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
    plan = input.plan;
    pulses = input.unitPulses ?? [];
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
  host.mount(container, callbacks);
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
  const entry = (unitId: number) =>
    plan.entries.find((candidate) => candidate.key === `unit:${unitId}`);
  return {
    host,
    canvas,
    effects,
    log,
    camera: () => camera,
    pulses: () => pulses,
    /** The drawn cell of a unit, rounded (a slide is fractional). */
    unitAt: (unitId: number): CoordV7 | undefined => {
      const found = entry(unitId);
      return found === undefined
        ? undefined
        : { x: Math.round(found.at.x), y: Math.round(found.at.y) };
    },
    isEgg: (unitId: number): boolean => entry(unitId)?.egg !== undefined,
    description: (): string =>
      container.querySelector("p.sr-only")?.textContent ?? "",
    frame,
    drain: async () => {
      for (let index = 0; index < 40 && frames.size; index++) await frame(1000);
      expect(frames.size).toBe(0);
    },
  };
}
