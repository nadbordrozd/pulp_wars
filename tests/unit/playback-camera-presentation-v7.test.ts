import { describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  type CameraState,
} from "../../src/render/canvas/geometry";
import {
  CAMERA_GLIDE_MAX_MS_V7,
  CAMERA_GLIDE_MIN_MS_V7,
  cameraGlideAtV7,
  cameraGlideDurationMsV7,
  cellsInsideZoneV7,
  cellsOffscreenV7,
  comfortZoneV7,
  playbackCameraEventsV7,
  playbackCameraTargetV7,
  playbackFollowAllowedV7,
  playbackStepCellsV7,
  startCameraGlideV7,
  suppressedSeatAfterInputV7,
  visibleMapRegionV7,
} from "../../src/render/canvas/playback-camera-v7";
import type { CorePresentationStepV7 } from "../../src/render/canvas/presentation-plan-v7";

// Bead pulp_wars-2yc.49: the playback camera holds still while the action
// is in view and glides, once, to what is not.

const desktop = { width: 1280, height: 800 };
const phone = { width: 375, height: 667 };
/** 80 CSS px a tile: zoom step 1. */
const zoom = 80 / TILE_WIDTH;
const whole = (viewport: { height: number }) => ({
  top: 0,
  bottom: viewport.height,
});
const at = (x: number, y: number): CoordV7 => ({ x, y });
/** The camera that puts cell (x, y) on the canvas point (sx, sy). */
const cameraWith = (cell: CoordV7, sx: number, sy: number): CameraState => ({
  zoom,
  offsetX: sx - cell.x * TILE_WIDTH * zoom,
  offsetY: sy - cell.y * TILE_HEIGHT * zoom,
});
const screenOf = (camera: CameraState, cell: CoordV7) => ({
  x: camera.offsetX + cell.x * TILE_WIDTH * camera.zoom,
  y: camera.offsetY + cell.y * TILE_HEIGHT * camera.zoom,
});

describe("the comfort zone", () => {
  it("is the free map region inset by 15% on every side", () => {
    expect(comfortZoneV7(desktop, whole(desktop), zoom)).toEqual({
      left: 192,
      right: 1088,
      top: 120,
      bottom: 680,
    });
  });

  it("leaves the HUD and the open dock out", () => {
    const band = { top: 80, bottom: 600 };
    expect(visibleMapRegionV7(desktop, band)).toEqual({
      left: 0,
      right: 1280,
      top: 80,
      bottom: 600,
    });
    const zone = comfortZoneV7(desktop, band, zoom);
    expect(zone.top).toBeCloseTo(80 + 520 * 0.15);
    expect(zone.bottom).toBeCloseTo(600 - 520 * 0.15);
  });

  it("is inset by at least half a tile, so a unit in it is drawn whole", () => {
    // Phone width, tiles of 160 CSS px: 15% of 375 is less than half a tile.
    const zone = comfortZoneV7(phone, whole(phone), 160 / TILE_WIDTH);
    expect(zone.left).toBe(80);
    expect(zone.right).toBe(295);
  });

  it("reads a band under one pixel as the whole canvas", () => {
    expect(visibleMapRegionV7(desktop, { top: 300, bottom: 300 })).toEqual({
      left: 0,
      right: 1280,
      top: 0,
      bottom: 800,
    });
  });
});

describe("the comfort-zone rule", () => {
  const camera = cameraWith(at(10, 10), 640, 400);

  it("moves the camera zero times for a cluster of moves inside the zone", () => {
    // Twelve moves of several units, all within a few tiles of the centre.
    const cluster: (readonly CoordV7[])[] = [];
    for (let unit = 0; unit < 6; unit += 1) {
      cluster.push([at(8 + unit, 8), at(8 + unit, 9), at(8 + unit, 10)]);
      cluster.push([at(12 - unit, 12), at(11 - unit, 12)]);
    }
    let current = camera;
    let moves = 0;
    for (const [index, cells] of cluster.entries()) {
      const target = playbackCameraTargetV7({
        camera: current,
        viewport: desktop,
        band: whole(desktop),
        cells,
        upcoming: cluster.slice(index + 1),
      });
      if (target !== null) {
        moves += 1;
        current = target;
      }
    }
    expect(moves).toBe(0);
    expect(current).toBe(camera);
  });

  it("moves once for an event outside the zone, and frames it", () => {
    const far = [at(30, 24), at(31, 24)];
    const target = playbackCameraTargetV7({
      camera,
      viewport: desktop,
      band: whole(desktop),
      cells: far,
    });
    if (target === null) throw new Error("The far event did not move it");
    expect(target.zoom).toBe(camera.zoom);
    // The event's middle is at the middle of the free region.
    expect(screenOf(target, at(30.5, 24))).toEqual({ x: 640, y: 400 });
    const zone = comfortZoneV7(desktop, whole(desktop), zoom);
    expect(cellsInsideZoneV7(target, far, zone)).toBe(true);
    // Framed, the camera holds: the same event, and moves near it.
    for (const cells of [far, [at(31, 24), at(31, 25)], [at(27, 22)]])
      expect(
        playbackCameraTargetV7({
          camera: target,
          viewport: desktop,
          band: whole(desktop),
          cells,
        }),
      ).toBeNull();
  });

  it("moves for an event in view but in the margin outside the zone", () => {
    // Cell (16, 10) is on the canvas at x = 1120, right of the zone's 1088.
    const cells = [at(16, 10)];
    expect(cellsOffscreenV7(camera, cells, desktop)).toBe(false);
    expect(
      playbackCameraTargetV7({
        camera,
        viewport: desktop,
        band: whole(desktop),
        cells,
      }),
    ).not.toBeNull();
  });

  it("frames the event with the queued events that fit the zone with it", () => {
    const event = [at(30, 24), at(31, 24)];
    const near = [at(34, 26), at(35, 26)];
    const tooFar = [at(60, 24)];
    const alsoNear = [at(29, 22)];
    const target = playbackCameraTargetV7({
      camera,
      viewport: desktop,
      band: whole(desktop),
      cells: event,
      upcoming: [near, tooFar, alsoNear],
    });
    if (target === null) throw new Error("The far event did not move it");
    const zone = comfortZoneV7(desktop, whole(desktop), zoom);
    // The group (29..35, 22..26) is centred; the event too far is left out.
    expect(screenOf(target, at(32, 24))).toEqual({ x: 640, y: 400 });
    for (const cells of [event, near, alsoNear])
      expect(cellsInsideZoneV7(target, cells, zone)).toBe(true);
    expect(cellsInsideZoneV7(target, tooFar, zone)).toBe(false);
  });

  it("frames above the dock and below the HUD", () => {
    const band = { top: 100, bottom: 500 };
    const target = playbackCameraTargetV7({
      camera,
      viewport: desktop,
      band,
      cells: [at(40, 40)],
    });
    expect(target && screenOf(target, at(40, 40))).toEqual({ x: 640, y: 300 });
  });

  it("centres a path wider than the zone when it fits the free region", () => {
    // Phone width at 80 px a tile: the zone is 262 px, four tiles 320 px.
    const path = [at(20, 20), at(21, 20), at(22, 20), at(23, 20)];
    const start = cameraWith(at(0, 0), 100, 100);
    const target = playbackCameraTargetV7({
      camera: start,
      viewport: phone,
      band: whole(phone),
      cells: path,
    });
    if (target === null) throw new Error("The path did not move it");
    expect(screenOf(target, at(21.5, 20)).x).toBeCloseTo(187.5);
    // Every tile of the path is wholly on the canvas.
    expect(screenOf(target, at(20, 20)).x - 40).toBeGreaterThanOrEqual(0);
    expect(screenOf(target, at(23, 20)).x + 40).toBeLessThanOrEqual(375);
    // Asked again from there, it holds.
    expect(
      playbackCameraTargetV7({
        camera: target,
        viewport: phone,
        band: whole(phone),
        cells: path,
      }),
    ).toBeNull();
  });

  it("keeps the end of a path too long for the region inside the zone", () => {
    const path = Array.from({ length: 9 }, (_, index) => at(20 + index, 20));
    const target = playbackCameraTargetV7({
      camera: cameraWith(at(0, 0), 100, 100),
      viewport: phone,
      band: whole(phone),
      cells: path,
    });
    if (target === null) throw new Error("The path did not move it");
    const zone = comfortZoneV7(phone, whole(phone), zoom);
    expect(cellsInsideZoneV7(target, [at(28, 20)], zone)).toBe(true);
  });

  it("never moves for an event with no tiles", () => {
    expect(
      playbackCameraTargetV7({
        camera,
        viewport: desktop,
        band: whole(desktop),
        cells: [],
      }),
    ).toBeNull();
  });

  it("knows an event that is wholly off the canvas", () => {
    expect(cellsOffscreenV7(camera, [at(10, 10)], desktop)).toBe(false);
    expect(cellsOffscreenV7(camera, [at(40, 10)], desktop)).toBe(true);
    expect(cellsOffscreenV7(camera, [at(10, -9)], desktop)).toBe(true);
    // A path that reaches into the canvas is not off it.
    expect(cellsOffscreenV7(camera, [at(40, 10), at(17, 10)], desktop)).toBe(
      false,
    );
  });
});

describe("framing at the edge of the board", () => {
  // A 30 x 30 board at 80 px a tile, with half a tile of ground round it.
  const board = {
    left: -TILE_WIDTH / 2,
    top: -TILE_HEIGHT / 2,
    right: 29.5 * TILE_WIDTH,
    bottom: 29.5 * TILE_HEIGHT,
  };
  const camera = cameraWith(at(10, 10), 640, 400);

  it("shows no void beyond the board for an event in its corner", () => {
    const corner = [at(28, 29), at(29, 29)];
    const free = playbackCameraTargetV7({
      camera,
      viewport: desktop,
      band: whole(desktop),
      cells: corner,
    });
    const target = playbackCameraTargetV7({
      camera,
      viewport: desktop,
      band: whole(desktop),
      cells: corner,
      board,
    });
    if (free === null || target === null)
      throw new Error("The corner event did not move it");
    // Unbounded, the corner sits mid-screen with void right and below.
    expect(screenOf(free, at(29.5, 29.5)).x).toBeLessThan(1280);
    // Bounded, the board's edge is at the canvas edge.
    expect(screenOf(target, at(29.5, 29.5))).toEqual({ x: 1280, y: 800 });
    // The event's tiles are wholly in view.
    expect(cellsOffscreenV7(target, corner, desktop)).toBe(false);
    expect(screenOf(target, at(29, 29)).x + 40).toBeLessThanOrEqual(1280);
    expect(screenOf(target, at(29, 29)).y + 40).toBeLessThanOrEqual(800);
    // There, the same event (outside the zone, at the edge) moves nothing.
    expect(
      playbackCameraTargetV7({
        camera: target,
        viewport: desktop,
        band: whole(desktop),
        cells: corner,
        board,
      }),
    ).toBeNull();
  });

  it("keeps a board smaller than the free region wholly in view", () => {
    const small = {
      left: -TILE_WIDTH / 2,
      top: -TILE_HEIGHT / 2,
      right: 5.5 * TILE_WIDTH,
      bottom: 5.5 * TILE_HEIGHT,
    };
    // The 6 x 6 board is on screen but pushed against the left edge, so
    // its first column is in the margin outside the zone.
    const start = cameraWith(at(0, 0), 40, 200);
    const target = playbackCameraTargetV7({
      camera: start,
      viewport: desktop,
      band: whole(desktop),
      cells: [at(0, 2)],
      board: small,
    });
    if (target === null) throw new Error("The edge event did not move it");
    expect(screenOf(target, at(-0.5, 0)).x).toBeGreaterThanOrEqual(0);
    expect(screenOf(target, at(5.5, 0)).x).toBeLessThanOrEqual(1280);
    expect(screenOf(target, at(0, -0.5)).y).toBeGreaterThanOrEqual(0);
    expect(screenOf(target, at(0, 5.5)).y).toBeLessThanOrEqual(800);
  });
});

describe("the camera glide", () => {
  it("lasts longer the further it goes, within its bounds", () => {
    expect(cameraGlideDurationMsV7(0, desktop)).toBe(CAMERA_GLIDE_MIN_MS_V7);
    expect(cameraGlideDurationMsV7(640, desktop)).toBeCloseTo(
      (CAMERA_GLIDE_MIN_MS_V7 + CAMERA_GLIDE_MAX_MS_V7) / 2,
    );
    expect(cameraGlideDurationMsV7(1280, desktop)).toBe(CAMERA_GLIDE_MAX_MS_V7);
    // Beyond two screens: the same cap, so a faster glide, never a cut.
    expect(cameraGlideDurationMsV7(5000, desktop)).toBe(CAMERA_GLIDE_MAX_MS_V7);
    expect(CAMERA_GLIDE_MIN_MS_V7).toBe(260);
    expect(CAMERA_GLIDE_MAX_MS_V7).toBe(600);
  });

  it("scales with the animation speed", () => {
    const glide = startCameraGlideV7({
      from: { x: 0, y: 0 },
      target: { x: 1280, y: 0 },
      viewport: desktop,
      durationScale: 0.5,
    });
    expect(glide.durationMs).toBe(300);
  });

  it("starts from rest, never overshoots and lands exactly on its target", () => {
    const glide = startCameraGlideV7({
      from: { x: 100, y: -50 },
      target: { x: -900, y: 350 },
      viewport: desktop,
    });
    expect(cameraGlideAtV7(glide, 0)).toEqual({
      offset: { x: 100, y: -50 },
      velocity: { x: 0, y: 0 },
      settled: false,
    });
    let previous = 100;
    for (let elapsed = 1; elapsed < glide.durationMs; elapsed += 1) {
      const sample = cameraGlideAtV7(glide, elapsed);
      expect(sample.settled).toBe(false);
      // Monotonic towards the target on each axis, never past it.
      expect(sample.offset.x).toBeLessThanOrEqual(previous);
      expect(sample.offset.x).toBeGreaterThanOrEqual(-900);
      expect(sample.offset.y).toBeLessThanOrEqual(350);
      previous = sample.offset.x;
    }
    // When its time is up it is within a few pixels, then exactly there.
    const last = cameraGlideAtV7(glide, glide.durationMs - 0.001);
    expect(Math.abs(last.offset.x + 900)).toBeLessThan(1000 * 0.004);
    expect(cameraGlideAtV7(glide, glide.durationMs)).toEqual({
      offset: { x: -900, y: 350 },
      velocity: { x: 0, y: 0 },
      settled: true,
    });
    expect(cameraGlideAtV7(glide, 10_000).settled).toBe(true);
  });

  it("travels in a straight line from rest", () => {
    const glide = startCameraGlideV7({
      from: { x: 0, y: 0 },
      target: { x: 400, y: 200 },
      viewport: desktop,
    });
    for (const elapsed of [20, 90, 200, 300]) {
      const { offset } = cameraGlideAtV7(glide, elapsed);
      expect(offset.y).toBeCloseTo(offset.x / 2);
    }
  });

  it("is the same whatever the frame times were", () => {
    const glide = startCameraGlideV7({
      from: { x: 0, y: 0 },
      target: { x: 700, y: -300 },
      viewport: desktop,
    });
    // Sampled every 16 ms or in ragged steps, 240 ms in is the same place.
    let ragged = cameraGlideAtV7(glide, 0);
    for (const elapsed of [3, 50, 51, 180, 240])
      ragged = cameraGlideAtV7(glide, elapsed);
    let steady = cameraGlideAtV7(glide, 0);
    for (let elapsed = 16; elapsed <= 240; elapsed += 16)
      steady = cameraGlideAtV7(glide, elapsed);
    expect(ragged).toEqual(steady);
    expect(cameraGlideAtV7(glide, 240)).toEqual(cameraGlideAtV7(glide, 240));
  });

  it("bends to a new target without stopping, overshooting only a little", () => {
    const first = startCameraGlideV7({
      from: { x: 0, y: 0 },
      target: { x: 600, y: 0 },
      viewport: desktop,
    });
    const mid = cameraGlideAtV7(first, 80);
    expect(mid.velocity.x).toBeGreaterThan(0);
    // The new target is a short way ahead: the carried speed runs past it.
    const second = startCameraGlideV7({
      from: mid.offset,
      target: { x: mid.offset.x + 40, y: 0 },
      viewport: desktop,
      velocity: mid.velocity,
    });
    expect(cameraGlideAtV7(second, 0).velocity).toEqual(mid.velocity);
    let furthest = mid.offset.x;
    for (let elapsed = 0; elapsed <= second.durationMs; elapsed += 1)
      furthest = Math.max(furthest, cameraGlideAtV7(second, elapsed).offset.x);
    const overshoot = furthest - second.target.x;
    expect(overshoot).toBeGreaterThan(0);
    // Bounded: well under the distance the carried speed would have run.
    expect(overshoot).toBeLessThan(mid.velocity.x * second.durationMs * 0.1);
    expect(cameraGlideAtV7(second, second.durationMs).offset).toEqual(
      second.target,
    );
  });
});

describe("player input wins", () => {
  it("takes the camera from the seat whose playback it interrupts", () => {
    expect(
      suppressedSeatAfterInputV7({
        presentingSeat: 2,
        activeSeat: 2,
        viewerSeat: 0,
        suppressedSeat: null,
      }),
    ).toBe(2);
    expect(playbackFollowAllowedV7(2, 2)).toBe(false);
    // The next seat's playback is followed again.
    expect(playbackFollowAllowedV7(2, 3)).toBe(true);
    expect(playbackFollowAllowedV7(null, 2)).toBe(true);
  });

  it("counts input between two boundaries of another player's turn", () => {
    expect(
      suppressedSeatAfterInputV7({
        presentingSeat: null,
        activeSeat: 3,
        viewerSeat: 0,
        suppressedSeat: null,
      }),
    ).toBe(3);
  });

  it("changes nothing for a pan in the viewer's own turn", () => {
    expect(
      suppressedSeatAfterInputV7({
        presentingSeat: null,
        activeSeat: 0,
        viewerSeat: 0,
        suppressedSeat: null,
      }),
    ).toBeNull();
  });
});

describe("what the playback camera frames", () => {
  const move = (
    unitId: number,
    path: readonly CoordV7[],
    followCamera: boolean,
  ): CorePresentationStepV7 => ({
    kind: "MOVE",
    unitId,
    path,
    durationMs: 240,
    ...(followCamera ? { followCamera: true as const } : {}),
  });
  const melee: CorePresentationStepV7 = {
    kind: "MELEE",
    unitId: 1,
    from: at(3, 3),
    to: at(4, 3),
    durationMs: 230,
  };
  const damage: CorePresentationStepV7 = {
    kind: "DAMAGE",
    unitId: 2,
    at: at(4, 3),
    damage: 3,
    lethal: false,
    durationMs: 100,
  };

  it("frames another player's moves and attacks, not the damage beat", () => {
    expect(
      playbackCameraEventsV7(
        [move(1, [at(1, 3), at(2, 3), at(3, 3)], true), melee, damage],
        true,
      ),
    ).toEqual([
      { index: 0, cells: [at(1, 3), at(2, 3), at(3, 3)] },
      { index: 1, cells: [at(3, 3), at(4, 3)] },
    ]);
  });

  it("frames nothing of the viewer's own turn", () => {
    expect(
      playbackCameraEventsV7(
        [move(1, [at(1, 3), at(2, 3)], false), melee, damage],
        false,
      ),
    ).toEqual([]);
  });

  it("frames the neutral turn inside the viewer's End Turn from its first marked step", () => {
    const events = playbackCameraEventsV7(
      [melee, move(9, [at(7, 7), at(8, 7)], true), melee],
      false,
    );
    expect(events.map((event) => event.index)).toEqual([1, 2]);
  });

  it("frames an event the fog hides never: it has no step", () => {
    // A hidden move is not in the plan (presentation-plan-v7), so there is
    // nothing to frame; a step with no tiles is skipped too.
    expect(playbackCameraEventsV7([], true)).toEqual([]);
    expect(
      playbackCameraEventsV7(
        [{ kind: "VISIBILITY_CROSSFADE", durationMs: 180 }],
        true,
      ),
    ).toEqual([]);
  });

  it("reads a cue's tiles with where it came from", () => {
    expect(
      playbackStepCellsV7({
        kind: "CULT",
        effect: "STRAND_FORMED",
        from: at(1, 1),
        cells: [at(3, 1)],
        durationMs: 300,
        followCamera: true,
      }),
    ).toEqual([at(1, 1), at(3, 1)]);
    expect(
      playbackStepCellsV7({ kind: "BUILD", at: at(5, 5), durationMs: 180 }),
    ).toEqual([at(5, 5)]);
  });
});
