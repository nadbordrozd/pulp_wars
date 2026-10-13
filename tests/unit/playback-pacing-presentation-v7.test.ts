import { describe, expect, it } from "vitest";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  CATCH_UP_FROM_BACKLOG_V7,
  CATCH_UP_FULL_BACKLOG_V7,
  MIN_DURATION_SCALE_V7,
  MOVE_MAX_MS_V7,
  MOVE_TILE_MS_V7,
  UNIT_SETTLE_MS_V7,
  moveDurationMsV7,
  movePathProgressV7,
  playbackDurationScaleV7,
  settleRemainingMsV7,
} from "../../src/render/canvas/playback-pacing-v7";
import { enemyCameraFixtureV7 } from "../fixtures/ruleset7-enemy-camera";

// Bead pulp_wars-2yc.49: a slower walk, the same for every player.

describe("the pace of a Move", () => {
  it("takes 240 ms a tile at Normal, up to 1200 ms", () => {
    expect(MOVE_TILE_MS_V7).toBe(240);
    expect(MOVE_MAX_MS_V7).toBe(1200);
    expect([1, 2, 3, 5, 6, 9].map(moveDurationMsV7)).toEqual([
      240, 480, 720, 1200, 1200, 1200,
    ]);
    // A path of one tile (a visible stretch one tile long) still takes one.
    expect(moveDurationMsV7(0)).toBe(240);
  });

  it("gives the viewer's own Move and another player's the same time a tile", () => {
    // The same three-tile Move by the same unit, planned as another
    // player's (the fixture) and as the viewer's own (the viewer active).
    const fixture = enemyCameraFixtureV7("visible-move");
    const [enemy] = corePresentationPlanV7(
      fixture.before,
      fixture.events,
      fixture.after,
    ).filter((step) => step.kind === "MOVE");
    const [own] = corePresentationPlanV7(
      {
        ...fixture.before,
        activeSeatIndex: fixture.before.turnOrder.indexOf(
          fixture.before.viewer.id,
        ),
      },
      fixture.events,
      fixture.after,
    ).filter((step) => step.kind === "MOVE");
    if (enemy === undefined || own === undefined)
      throw new Error("Missing the Move steps");
    expect(enemy.followCamera).toBe(true);
    expect(own.followCamera).toBeUndefined();
    expect(enemy.path).toEqual(own.path);
    expect(enemy.durationMs).toBe(3 * MOVE_TILE_MS_V7);
    expect(own.durationMs).toBe(enemy.durationMs);
  });

  it("eases in and out: slow at both ends, steady between", () => {
    for (const tiles of [1, 2, 3, 5]) {
      expect(movePathProgressV7(0, tiles)).toBe(0);
      expect(movePathProgressV7(1, tiles)).toBe(1);
      expect(movePathProgressV7(0.5, tiles)).toBeCloseTo(0.5);
      let previous = 0;
      for (let step = 1; step <= 100; step += 1) {
        const value = movePathProgressV7(step / 100, tiles);
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
      // The first and the last tenth of the time cover less than a tenth
      // of the way; they mirror each other.
      expect(movePathProgressV7(0.1, tiles)).toBeLessThan(0.1);
      expect(movePathProgressV7(0.9, tiles)).toBeCloseTo(
        1 - movePathProgressV7(0.1, tiles),
      );
    }
    // A three-tile walk holds one pace through its middle.
    const pace = movePathProgressV7(0.5, 3) - movePathProgressV7(0.4, 3);
    expect(movePathProgressV7(0.7, 3) - movePathProgressV7(0.6, 3)).toBeCloseTo(
      pace,
    );
    // And never runs more than a fifth faster than its average.
    expect(pace / 0.1).toBeCloseTo(1.2);
    expect(movePathProgressV7(-1, 2)).toBe(0);
    expect(movePathProgressV7(2, 2)).toBe(1);
  });
});

describe("the time scale of playback", () => {
  it("is 1 at Normal and 0.5 at Fast", () => {
    expect(playbackDurationScaleV7("NORMAL")).toBe(1);
    expect(playbackDurationScaleV7("FAST")).toBe(0.5);
    // Fast walks a tile in 120 ms, about the 90 ms Normal took before.
    expect(MOVE_TILE_MS_V7 * playbackDurationScaleV7("FAST")).toBe(120);
  });

  it("hurries as boundaries queue up, down to the old Normal pace", () => {
    expect(CATCH_UP_FROM_BACKLOG_V7).toBe(3);
    expect(CATCH_UP_FULL_BACKLOG_V7).toBe(8);
    for (const backlog of [0, 1, 3])
      expect(playbackDurationScaleV7("NORMAL", backlog)).toBe(1);
    expect(playbackDurationScaleV7("NORMAL", 5)).toBeCloseTo(0.75);
    expect(playbackDurationScaleV7("NORMAL", 8)).toBe(MIN_DURATION_SCALE_V7);
    expect(playbackDurationScaleV7("NORMAL", 40)).toBe(MIN_DURATION_SCALE_V7);
    // 0.375 x 240 ms is the 90 ms a tile of the pace before this bead.
    expect(MOVE_TILE_MS_V7 * MIN_DURATION_SCALE_V7).toBe(90);
    // Fast never goes below the same floor.
    expect(playbackDurationScaleV7("FAST", 5)).toBe(MIN_DURATION_SCALE_V7);
    expect(playbackDurationScaleV7("FAST", 40)).toBe(MIN_DURATION_SCALE_V7);
  });
});

describe("the beat between two units", () => {
  it("is what is left of 120 ms since the last unit stopped", () => {
    expect(UNIT_SETTLE_MS_V7).toBe(120);
    const rest = (nowMs: number, lastEndedAtMs: number | null, scale = 1) =>
      settleRemainingMsV7({ nowMs, lastEndedAtMs, durationScale: scale });
    expect(rest(1000, 1000)).toBe(120);
    expect(rest(1050, 1000)).toBe(70);
    // The AI's thinking time counts: nothing is added to a pause.
    expect(rest(1400, 1000)).toBe(0);
    expect(rest(1000, null)).toBe(0);
    expect(rest(1000, 1000, 0.5)).toBe(60);
  });
});
