import { describe, expect, it } from "vitest";
import type { PlayerViewV7 } from "../../src/engine/index";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/render/canvas/geometry";
import { CATCH_UP_FULL_BACKLOG_V7 } from "../../src/render/canvas/playback-pacing-v7";
import {
  AI_PACING_BACKLOG_V7,
  MIN_DURATION_SCALE_V7,
} from "../../src/render/canvas/playback-pacing-v7";
import {
  HURRY_BEAT_SCALE_V7,
  HURRY_CALM_BOUNDARIES_V7,
  HURRY_FAST_BOUNDARIES_V7,
  HURRY_FLOOR_BOUNDARIES_V7,
  HURRY_PACING_BACKLOG_V7,
  HURRY_RUSH_BOUNDARIES_V7,
  HURRY_RUSH_SCALE_V7,
  boundaryOffscreenV7,
  hurriedDurationScaleV7,
  hurryScaleCapV7,
  hurrySkipsBeatV7,
  hurryTurnKeyV7,
  playbackHurriedV7,
  playbackMattersToViewerV7,
} from "../../src/render/canvas/playback-hurry-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import {
  rivalAttack,
  rivalMove,
  type BoundaryV7,
} from "../fixtures/ruleset7-ai-hurry";

// Bead pulp_wars-2yc.114: long AI turns hurry after a calm opening.

const stepsOf = (boundary: BoundaryV7): CorePresentationStepV7[] => [
  ...corePresentationPlanV7(boundary.before, boundary.events, boundary.after),
];

describe("the hurry of a long turn", () => {
  it("keeps the first twelve seen boundaries calm", () => {
    expect(HURRY_CALM_BOUNDARIES_V7).toBe(12);
    for (let played = 0; played < HURRY_CALM_BOUNDARIES_V7; played++) {
      expect(playbackHurriedV7(played)).toBe(false);
      expect(hurryScaleCapV7(played)).toBe(1);
      expect(hurryScaleCapV7(played, true)).toBe(1);
      for (const speed of ["NORMAL", "FAST"] as const)
        for (const matters of [false, true])
          expect(
            hurriedDurationScaleV7({ speed, backlog: 0, played, matters }),
          ).toBe(speed === "FAST" ? 0.5 : 1);
    }
    expect(playbackHurriedV7(HURRY_CALM_BOUNDARIES_V7)).toBe(true);
  });

  it("ramps to the Fast pace, then the 0.375 floor, then the rush scale", () => {
    expect([
      HURRY_FAST_BOUNDARIES_V7,
      HURRY_FLOOR_BOUNDARIES_V7,
      HURRY_RUSH_BOUNDARIES_V7,
    ]).toEqual([14, 17, 20]);
    expect(hurryScaleCapV7(12)).toBe(1);
    expect(hurryScaleCapV7(13)).toBeCloseTo(0.75);
    for (const played of [14, 15, 16])
      expect(hurryScaleCapV7(played)).toBe(0.5);
    for (const played of [17, 18, 19])
      expect(hurryScaleCapV7(played)).toBe(MIN_DURATION_SCALE_V7);
    for (const played of [20, 40, 127])
      expect(hurryScaleCapV7(played)).toBe(HURRY_RUSH_SCALE_V7);
    // A tile in 60 ms: still a walk of a few frames.
    expect(240 * HURRY_RUSH_SCALE_V7).toBe(60);
    // Monotonic: the turn only ever gets quicker.
    for (let played = 1; played < 60; played++)
      expect(hurryScaleCapV7(played)).toBeLessThanOrEqual(
        hurryScaleCapV7(played - 1),
      );
  });

  it("gives what matters to the viewer a readable beat: the Fast pace, then the floor", () => {
    expect(HURRY_BEAT_SCALE_V7).toBe(0.5);
    const matters = (played: number, backlog = 0) =>
      hurriedDurationScaleV7({
        speed: "NORMAL",
        backlog,
        played,
        matters: true,
      });
    expect(matters(13)).toBeCloseTo(0.75);
    expect(matters(16)).toBe(0.5);
    // Not hurried below the beat before the rush...
    expect(matters(18)).toBe(0.5);
    // ...and never below the floor, never at the rush scale.
    for (const played of [20, 40, 127])
      expect(matters(played)).toBe(MIN_DURATION_SCALE_V7);
    // Calm playback's own catch-up still applies (a deep queue).
    expect(matters(18, CATCH_UP_FULL_BACKLOG_V7)).toBe(MIN_DURATION_SCALE_V7);
    // Fast never makes what matters slower than Fast.
    expect(
      hurriedDurationScaleV7({
        speed: "FAST",
        backlog: 0,
        played: 13,
        matters: true,
      }),
    ).toBe(0.5);
  });

  it("honours the Fast setting and never slows playback down", () => {
    for (let played = 0; played < 60; played++)
      for (const matters of [false, true])
        for (const backlog of [0, 4, 9]) {
          const normal = hurriedDurationScaleV7({
            speed: "NORMAL",
            backlog,
            played,
            matters,
          });
          const fast = hurriedDurationScaleV7({
            speed: "FAST",
            backlog,
            played,
            matters,
          });
          expect(fast).toBeLessThanOrEqual(normal);
          expect(fast).toBeLessThanOrEqual(0.5);
        }
  });

  it("skips the beat between units only from the floor on, for what does not matter", () => {
    expect(hurrySkipsBeatV7(HURRY_FLOOR_BOUNDARIES_V7 - 1, false)).toBe(false);
    expect(hurrySkipsBeatV7(HURRY_FLOOR_BOUNDARIES_V7, false)).toBe(true);
    expect(hurrySkipsBeatV7(60, true)).toBe(false);
  });

  it("lets the AI run further ahead of a hurried turn, short of the queue cut", () => {
    expect(HURRY_PACING_BACKLOG_V7).toBeGreaterThan(AI_PACING_BACKLOG_V7);
    // The app cuts a queue longer than twelve.
    expect(HURRY_PACING_BACKLOG_V7 + 1).toBeLessThanOrEqual(12);
  });

  it("keys a seat's turn by match, round and seat", () => {
    const { before } = rivalMove({ x: 4, y: 4 });
    const key = hurryTurnKeyV7(1, before);
    expect(hurryTurnKeyV7(1, before)).toBe(key);
    expect(hurryTurnKeyV7(2, before)).not.toBe(key);
    expect(hurryTurnKeyV7(1, { ...before, round: before.round + 1 })).not.toBe(
      key,
    );
    expect(
      hurryTurnKeyV7(1, {
        ...before,
        activeSeatIndex: before.turnOrder.indexOf(before.viewer.id),
      }),
    ).not.toBe(key);
  });
});

describe("what matters to the viewer", () => {
  it("is an attack on the viewer's unit", () => {
    const attack = rivalAttack();
    const steps = stepsOf(attack);
    expect(steps.some((step) => step.kind === "MELEE")).toBe(true);
    expect(playbackMattersToViewerV7(attack.before, attack.after, steps)).toBe(
      true,
    );
    // The attack's cue alone, the viewer's unit unhurt, still matters: it
    // plays next to the viewer's unit.
    expect(
      playbackMattersToViewerV7(
        attack.before,
        attack.before,
        steps.filter((step) => step.kind === "MELEE"),
      ),
    ).toBe(true);
  });

  it("is not a rival's move away from the viewer", () => {
    const move = rivalMove({ x: 0, y: 10 });
    expect(
      playbackMattersToViewerV7(move.before, move.after, stepsOf(move)),
    ).toBe(false);
  });

  it("is anything that hurts the viewer's unit or takes the viewer's city", () => {
    const attack = rivalAttack();
    const move = rivalMove({ x: 0, y: 10 });
    const steps = stepsOf(move);
    const viewer = attack.before.viewer.id;
    const own = attack.before.units.find((unit) => unit.ownerId === viewer);
    if (own === undefined) throw new Error("Missing the viewer's unit");
    const withUnit = (view: PlayerViewV7, hp: number): PlayerViewV7 => ({
      ...view,
      units: [...view.units, { ...own, hp }],
    });
    expect(
      playbackMattersToViewerV7(
        withUnit(move.before, own.hp),
        withUnit(move.after, own.hp - 1),
        steps,
      ),
    ).toBe(true);
    expect(
      playbackMattersToViewerV7(
        withUnit(move.before, own.hp),
        move.after,
        steps,
      ),
    ).toBe(true);
    const city = move.before.cities.find((entry) => entry.ownerId === viewer);
    if (city === undefined) throw new Error("Missing the viewer's city");
    const rival = move.before.turnOrder[move.before.activeSeatIndex];
    if (rival === undefined) throw new Error("Missing the rival");
    expect(
      playbackMattersToViewerV7(
        move.before,
        {
          ...move.after,
          cities: move.after.cities.map((entry) =>
            entry.id === city.id ? { ...entry, ownerId: rival } : entry,
          ),
        },
        steps,
      ),
    ).toBe(true);
  });
});

describe("a boundary off the canvas", () => {
  it("is one whose every step's tiles are off the canvas", () => {
    const move = rivalMove({ x: 0, y: 10 });
    const steps = stepsOf(move);
    const viewport = { width: 400, height: 300 };
    // A camera with the Knight's tile at the middle of the canvas.
    const at = { x: 0, y: 10 };
    const onIt = {
      offsetX: viewport.width / 2 - at.x * TILE_WIDTH,
      offsetY: viewport.height / 2 - at.y * TILE_HEIGHT,
      zoom: 1,
    };
    expect(boundaryOffscreenV7(steps, onIt, viewport)).toBe(false);
    expect(
      boundaryOffscreenV7(
        steps,
        { offsetX: -100_000, offsetY: -100_000, zoom: 1 },
        viewport,
      ),
    ).toBe(true);
    // A boundary with no tiles (a reveal alone) is never off the canvas.
    expect(
      boundaryOffscreenV7(
        [{ kind: "VISIBILITY_CROSSFADE", durationMs: 180 }],
        { offsetX: -100_000, offsetY: -100_000, zoom: 1 },
        viewport,
      ),
    ).toBe(false);
  });
});
