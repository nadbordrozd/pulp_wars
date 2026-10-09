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
import {
  ATTACK_EFFECT_DURATIONS_V7,
  attackReducedMotionProgressV7,
} from "../../src/render/canvas/attack-effects-v7";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { martianFieldV7 } from "../fixtures/v7-martian";
import {
  GIANT_EFFECT_DURATIONS_V7,
  giantReducedMotionProgressV7,
} from "../../src/render/canvas/giant-effects-v7";
import {
  GIANTS_UI_V7,
  giantsStompFixtureV7,
  giantsTossFixtureV7,
} from "../fixtures/v7-giants-ui";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-b5f.5: a Lich's attack plays its bolt on the effects
 * overlay (never the grey catapult stone), the board shows the result once
 * the bolt lands, and reduced motion holds one frame of the cue. Bead
 * pulp_wars-eu3r.4: a Battleship fires its broadside instead of the arrow.
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

function lichShot() {
  return shotOf(
    undeadShowcaseFixtureV7(),
    UNDEAD_SHOWCASE_V7.lich,
    UNDEAD_SHOWCASE_V7.lichTarget,
  );
}

/** A Dwarf Battleship at sea fires on a Guard with a Fighter beside it. */
function battleshipShot() {
  return shotOf(
    martianFieldV7(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 5, y: 1 }, form: "NAVAL" },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 } },
      ],
      { factions: ["DWARF", "ORIGINAL"], water: [{ x: 5, y: 1 }] },
    ),
    { x: 5, y: 1 },
    { x: 5, y: 3 },
  );
}

/** The giants' signatures (`pulp_wars-w49.32`): the Brontosaurus stomps. */
function stomp() {
  return commandOf(giantsStompFixtureV7(), (view) => ({
    kind: "STOMP",
    unitId: unitAt(view, GIANTS_UI_V7.stomp.brontosaurus).id,
  }));
}

/** The Troll throws its Goblin next to the two Humans. */
function toss() {
  return commandOf(giantsTossFixtureV7(), (view) => ({
    kind: "TOSS",
    unitId: unitAt(view, GIANTS_UI_V7.toss.troll).id,
    passengerUnitId: unitAt(view, GIANTS_UI_V7.toss.goblin).id,
    at: GIANTS_UI_V7.toss.landing,
  }));
}

function shotOf(state: GameStateV7, from: CoordV7, to: CoordV7) {
  return commandOf(state, (before) => ({
    kind: "ATTACK",
    unitId: unitAt(before, from).id,
    targetUnitId: unitAt(before, to).id,
  }));
}

function commandOf(
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

function setUp(
  motion: "FULL" | "REDUCED",
  shot: ReturnType<typeof commandOf> = lichShot(),
) {
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
  // The grey catapult stone is the only fill of that colour, and the
  // arrow's cream shaft the only stroke of its.
  const stoneFills: number[] = [];
  const arrowStrokes: number[] = [];
  const target: Record<PropertyKey, unknown> = {
    fillStyle: "",
    strokeStyle: "",
  };
  target.fill = vi.fn(() => {
    if (target.fillStyle === "#6d665e") stoneFills.push(now);
  });
  target.stroke = vi.fn(() => {
    if (target.strokeStyle === "#f4d291") arrowStrokes.push(now);
  });
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
    shot,
    effects,
    stoneFills,
    arrowStrokes,
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

describe("Attack cues on the board host", () => {
  it("plays the Lich's bolt on the overlay instead of the grey stone", async () => {
    const scene = setUp("FULL");
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    const duration = ATTACK_EFFECT_DURATIONS_V7.NECRO_BOLT;
    // Early in the flight, on the cue's own (linear) timeline.
    scene.step(duration * 0.25);
    expect(scene.effects.dataset.attackEffect).toBe("NECRO_BOLT");
    expect(Number(scene.effects.dataset.attackProgress)).toBeCloseTo(0.25, 2);
    scene.step(duration * 0.9);
    expect(Number(scene.effects.dataset.attackProgress)).toBeCloseTo(0.9, 2);
    scene.step(duration);
    // The splash burst follows the shot.
    await waitUntil(() => scene.frames.size === 1);
    expect(scene.effects.dataset.attackEffect).toBeUndefined();
    scene.host.finishPresentations();
    await presentation;
    expect(scene.stoneFills).toEqual([]);
    scene.host.destroy();
  });

  it("holds one frame of the bolt under reduced motion", async () => {
    const scene = setUp("REDUCED");
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    expect(scene.effects.dataset.attackEffect).toBe("NECRO_BOLT");
    expect(Number(scene.effects.dataset.attackProgress)).toBeLessThan(0.55);
    scene.step(1_000);
    await waitUntil(() => scene.effects.dataset.attackEffect === undefined);
    scene.host.finishPresentations();
    await presentation;
    expect(scene.stoneFills).toEqual([]);
    scene.host.destroy();
  });

  it("plays a Battleship's broadside instead of the arrow, then the splash", async () => {
    const scene = setUp("FULL", battleshipShot());
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    const duration = ATTACK_EFFECT_DURATIONS_V7.BROADSIDE;
    scene.step(duration * 0.25);
    expect(scene.effects.dataset.attackEffect).toBe("BROADSIDE");
    scene.step(duration * 0.75);
    expect(Number(scene.effects.dataset.attackProgress)).toBeCloseTo(0.75, 2);
    scene.step(duration);
    // The splashed Fighter's damage cue follows the broadside.
    await waitUntil(() => scene.frames.size === 1);
    expect(scene.effects.dataset.attackEffect).toBeUndefined();
    scene.host.finishPresentations();
    await presentation;
    expect(scene.arrowStrokes).toEqual([]);
    scene.host.destroy();
  });

  it("holds one frame of the broadside under reduced motion", async () => {
    const scene = setUp("REDUCED", battleshipShot());
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    expect(scene.effects.dataset.attackEffect).toBe("BROADSIDE");
    expect(Number(scene.effects.dataset.attackProgress)).toBeCloseTo(
      attackReducedMotionProgressV7("BROADSIDE"),
      3,
    );
    scene.step(1_000);
    await waitUntil(() => scene.effects.dataset.attackEffect === undefined);
    scene.host.finishPresentations();
    await presentation;
    expect(scene.arrowStrokes).toEqual([]);
    scene.host.destroy();
  });
});

describe("The giants' signature cues on the board host (bead pulp_wars-w49.32)", () => {
  it("plays the Thunder Stomp on its own timeline and shakes the board after the slam", async () => {
    const scene = setUp("FULL", stomp());
    const board = scene.effects.parentElement?.querySelector<HTMLCanvasElement>(
      "canvas.board-canvas-v7",
    );
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    const duration = GIANT_EFFECT_DURATIONS_V7.STOMP;
    scene.step(duration * 0.1);
    expect(scene.effects.dataset.giantEffect).toBe("STOMP");
    expect(Number(scene.effects.dataset.giantProgress)).toBeCloseTo(0.1, 2);
    expect(board?.style.transform ?? "").toBe("");
    scene.step(duration * 0.32);
    expect(Number(scene.effects.dataset.giantProgress)).toBeCloseTo(0.32, 2);
    expect(scene.effects.style.transform).toMatch(/^translateX\(/);
    scene.step(duration);
    // The three hits' damage cues follow; the shake has settled.
    await waitUntil(() => scene.effects.dataset.giantEffect === undefined);
    expect(scene.effects.style.transform).toBe("");
    scene.host.finishPresentations();
    await presentation;
    scene.host.destroy();
  });

  it("holds one frame of the Stomp under reduced motion, without a shake", async () => {
    const scene = setUp("REDUCED", stomp());
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    expect(scene.effects.dataset.giantEffect).toBe("STOMP");
    expect(Number(scene.effects.dataset.giantProgress)).toBeCloseTo(
      giantReducedMotionProgressV7("STOMP"),
      3,
    );
    expect(scene.effects.style.transform).toBe("");
    scene.step(1_000);
    await waitUntil(() => scene.effects.dataset.giantEffect === undefined);
    scene.host.finishPresentations();
    await presentation;
    scene.host.destroy();
  });

  it("throws the Goblin over the board", async () => {
    const scene = setUp("FULL", toss());
    const presentation = scene.host.presentBoundary(
      scene.shot.before,
      scene.shot.after,
      scene.shot.envelope,
    );
    const duration = GIANT_EFFECT_DURATIONS_V7.TOSS;
    scene.step(duration * 0.4);
    expect(scene.effects.dataset.giantEffect).toBe("TOSS");
    expect(Number(scene.effects.dataset.giantProgress)).toBeCloseTo(0.4, 2);
    scene.step(duration);
    await waitUntil(() => scene.effects.dataset.giantEffect === undefined);
    scene.host.finishPresentations();
    await presentation;
    scene.host.destroy();
  });
});
