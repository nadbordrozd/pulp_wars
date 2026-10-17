import { describe, expect, it } from "vitest";
import {
  createFogLiftClockV7,
  createFogLiftSpritesV7,
  FOG_LIFT_V7,
  fogLiftColoursV7,
  fogLiftCoverAlphaV7,
  fogLiftEnabledV7,
  fogLiftFrameIndexV7,
  fogLiftReducedAlphaV7,
  fogLiftScheduleV7,
  fogLiftSpritePixelsV7,
  fogLiftTimingV7,
  fogLiftWalkScheduleV7,
  fogLiftWispsV7,
  type FogLiftViewV7,
} from "../../src/render/canvas/fog-lift-v7";
import { FOG_PUFF_RASTER_V7 } from "../../src/render/canvas/fog-puff-v7";

/**
 * Bead pulp_wars-2yc.83 (UI review V4): newly explored cells keep their
 * cloud and lift it away in a wave outward from the unit that sees them;
 * capped, cached, and a plain fade for reduced motion.
 */

const NORMAL = fogLiftTimingV7("NORMAL", false);
const REDUCED = fogLiftTimingV7("NORMAL", true);

/** A hand-built view: a `size` square board, these cells explored. */
function view(
  explored: readonly (readonly [number, number])[],
  units: readonly { id: number; at: [number, number]; owner?: string }[] = [],
  options: { size?: number; viewer?: string } = {},
): FogLiftViewV7 {
  const size = options.size ?? 12;
  const known = new Set(explored.map(([x, y]) => `${x},${y}`));
  const tiles = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1)
      tiles.push({ at: { x, y }, explored: known.has(`${x},${y}`) });
  return {
    viewer: { id: options.viewer ?? "P1" },
    board: { tiles },
    units: units.map((unit) => ({
      id: unit.id,
      ownerId: unit.owner ?? "P1",
      at: { x: unit.at[0], y: unit.at[1] },
    })),
    cities: [],
  };
}

/** Every cell within `radius` of `at` (Chebyshev), on a 12 x 12 board. */
function around(
  at: readonly [number, number],
  radius: number,
): [number, number][] {
  const cells: [number, number][] = [];
  for (let y = at[1] - radius; y <= at[1] + radius; y += 1)
    for (let x = at[0] - radius; x <= at[0] + radius; x += 1)
      if (x >= 0 && y >= 0 && x < 12 && y < 12) cells.push([x, y]);
  return cells;
}

describe("the switch", () => {
  it("is on by default and follows ?fog-lift=", () => {
    expect(fogLiftEnabledV7("")).toBe(true);
    expect(fogLiftEnabledV7("?fog-lift=0")).toBe(false);
    expect(fogLiftEnabledV7("?fog-lift=off")).toBe(false);
    expect(fogLiftEnabledV7("?fog-lift=1")).toBe(true);
  });
});

describe("the wave", () => {
  it("starts each ring outward one ringMs later, up to maxRings, first at 0", () => {
    const cells = [1, 2, 3, 4, 5, 6].map((x) => ({ x, y: 0 }));
    const schedule = fogLiftScheduleV7(
      cells,
      [{ at: { x: 0, y: 0 }, delayMs: 0 }],
      80,
    );
    const delay = (x: number) =>
      schedule.find((cell) => cell.at.x === x)?.delayMs;
    expect(delay(1)).toBe(0);
    expect(delay(2)).toBe(80);
    expect(delay(3)).toBe(160);
    expect(delay(4)).toBe(80 * FOG_LIFT_V7.maxRings);
    // Farther cells start with the last ring.
    expect(delay(6)).toBe(80 * FOG_LIFT_V7.maxRings);
    // Sorted by start.
    expect(schedule.map((cell) => cell.at.x)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("moves a wave seen only from afar to start at once", () => {
    const schedule = fogLiftScheduleV7(
      [
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ],
      [{ at: { x: 0, y: 0 }, delayMs: 0 }],
      80,
    );
    expect(schedule.map((cell) => cell.delayMs)).toEqual([0, 80]);
  });

  it("takes the nearest of several sources, and starts all at 0 without one", () => {
    const cells = [{ x: 3, y: 0 }];
    expect(
      fogLiftScheduleV7(
        [...cells, { x: 9, y: 0 }],
        [
          { at: { x: 0, y: 0 }, delayMs: 0 },
          { at: { x: 10, y: 0 }, delayMs: 0 },
        ],
        80,
      ).map((cell) => [cell.at.x, cell.delayMs]),
    ).toEqual([
      [9, 0],
      [3, 160],
    ]);
    expect(fogLiftScheduleV7(cells, [], 80)[0]?.delayMs).toBe(0);
  });

  it("lifts a walk's cells as the unit comes nearest to them", () => {
    const path = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const schedule = fogLiftWalkScheduleV7(
      [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
        { x: 1, y: 3 },
      ],
      path,
      400,
      80,
    );
    const delay = (x: number, y: number) =>
      schedule.find((cell) => cell.at.x === x && cell.at.y === y)?.delayMs;
    // Beside the end: when the unit gets there, a little early.
    expect(delay(3, 5)).toBe(400 - FOG_LIFT_V7.leadMs);
    expect(delay(4, 5)).toBe(400 - FOG_LIFT_V7.leadMs + 80);
    // Two from every step alike: seen from the first, one ring later.
    expect(delay(1, 3)).toBe(Math.max(0, -FOG_LIFT_V7.leadMs + 80));
  });
});

describe("the clock", () => {
  it("starts nothing on the first view, then a lift on every newly explored cell", () => {
    const clock = createFogLiftClockV7();
    const unit = { id: 1, at: [5, 5] as [number, number] };
    expect(clock.observe(view(around([5, 5], 1), [unit]), 1, 0, NORMAL)).toBe(
      0,
    );
    expect(clock.active(0, NORMAL)).toBe(false);
    // The unit steps east and sees a column of three new cells.
    const moved = { id: 1, at: [6, 5] as [number, number] };
    const after = view([...around([5, 5], 1), ...around([6, 5], 1)], [moved]);
    expect(clock.observe(after, 1, 1000, NORMAL)).toBe(3);
    // The same tiles again start nothing.
    expect(clock.observe(after, 1, 1010, NORMAL)).toBe(0);
    const frame = clock.frame(1000, NORMAL);
    expect(frame.map((lift) => `${lift.at.x},${lift.at.y}`).sort()).toEqual([
      "7,4",
      "7,5",
      "7,6",
    ]);
    // Seen from the unit that moved: all one ring, all start now.
    expect(frame.every((lift) => lift.puff?.frame === 0)).toBe(true);
    expect(clock.active(1000 + NORMAL.durationMs - 1, NORMAL)).toBe(true);
    expect(clock.active(1000 + NORMAL.durationMs, NORMAL)).toBe(false);
    expect(clock.frame(1000 + NORMAL.durationMs, NORMAL)).toEqual([]);
  });

  it("staggers a wider reveal outward from the unit that moved", () => {
    const clock = createFogLiftClockV7();
    clock.observe(view([[0, 0]], [{ id: 1, at: [0, 0] }]), 1, 0, NORMAL);
    clock.observe(
      view(around([3, 3], 3), [{ id: 1, at: [3, 3] }]),
      1,
      0,
      NORMAL,
    );
    const at = (ms: number) =>
      new Set(
        clock
          .frame(ms, NORMAL)
          .filter((lift) => lift.puff !== null && lift.puff.frame > 0)
          .map((lift) => `${lift.at.x},${lift.at.y}`),
      );
    // Early on only the first ring has started to break.
    const early = at(NORMAL.ringMs - 1 + NORMAL.durationMs / 12);
    expect(early.has("4,3")).toBe(true);
    expect(early.has("6,3")).toBe(false);
    const later = at(2 * NORMAL.ringMs + NORMAL.durationMs / 12);
    expect(later.has("6,3")).toBe(true);
  });

  it("follows a walk given before the reveal", () => {
    const clock = createFogLiftClockV7();
    clock.observe(
      view(around([0, 5], 1), [{ id: 1, at: [0, 5] }]),
      1,
      0,
      NORMAL,
    );
    clock.walk(
      {
        unitId: 1,
        path: [
          { x: 0, y: 5 },
          { x: 1, y: 5 },
          { x: 2, y: 5 },
        ],
        walkMs: 300,
      },
      0,
    );
    clock.observe(
      view(
        [...around([0, 5], 1), ...around([2, 5], 1)],
        [{ id: 1, at: [2, 5] }],
      ),
      1,
      0,
      NORMAL,
    );
    // The cells beside the end wait for the walk: still whole at 100 ms.
    const frame = clock.frame(100, NORMAL);
    expect(frame.length).toBe(6);
    expect(frame.every((lift) => lift.puff?.frame === 0)).toBe(true);
  });

  it("starts again for a new match or viewer, and drops a cell fogged again", () => {
    const clock = createFogLiftClockV7();
    clock.observe(view([[0, 0]]), 1, 0, NORMAL);
    expect(
      clock.observe(
        view([
          [0, 0],
          [1, 0],
        ]),
        2,
        0,
        NORMAL,
      ),
    ).toBe(0);
    expect(
      clock.observe(
        view(
          [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
          [],
          { viewer: "P2" },
        ),
        2,
        0,
        NORMAL,
      ),
    ).toBe(0);
    clock.observe(
      view(
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
        ],
        [],
        { viewer: "P2" },
      ),
      2,
      0,
      NORMAL,
    );
    expect(clock.frame(0, NORMAL)).toHaveLength(1);
    // The view before a presentation: the cell is fog again; no lift there.
    clock.observe(
      view(
        [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        [],
        { viewer: "P2" },
      ),
      2,
      0,
      NORMAL,
    );
    expect(clock.frame(0, NORMAL)).toHaveLength(0);
  });

  it("gives at most maxPuffs cells a cloud; the rest fade as a plain cover", () => {
    const clock = createFogLiftClockV7();
    const size = 12;
    clock.observe(view([], [], { size }), 1, 0, NORMAL);
    const all: [number, number][] = [];
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1) all.push([x, y]);
    expect(clock.observe(view(all, [], { size }), 1, 0, NORMAL)).toBe(144);
    const frame = clock.frame(NORMAL.durationMs / 2, NORMAL);
    expect(frame.filter((lift) => lift.puff !== null)).toHaveLength(
      FOG_LIFT_V7.maxPuffs,
    );
    const plain = frame.filter((lift) => lift.puff === null);
    expect(plain).toHaveLength(144 - FOG_LIFT_V7.maxPuffs);
  });

  it("fades every new cell together, without a cloud, for reduced motion", () => {
    const clock = createFogLiftClockV7();
    clock.observe(view([[0, 0]], [{ id: 1, at: [0, 0] }]), 1, 0, REDUCED);
    clock.observe(
      view(around([3, 3], 3), [{ id: 1, at: [3, 3] }]),
      1,
      0,
      REDUCED,
    );
    const half = clock.frame(FOG_LIFT_V7.reducedMs / 2, REDUCED);
    expect(half.length).toBeGreaterThan(30);
    expect(half.every((lift) => lift.puff === null)).toBe(true);
    expect(half.every((lift) => Math.abs(lift.coverAlpha - 0.5) < 1e-9)).toBe(
      true,
    );
    expect(clock.active(FOG_LIFT_V7.reducedMs, REDUCED)).toBe(false);
    expect(fogLiftReducedAlphaV7(0)).toBe(1);
  });

  it("names the unexplored cells beside the lifting ones", () => {
    const clock = createFogLiftClockV7();
    clock.observe(view([[0, 0]]), 1, 0, NORMAL);
    clock.observe(
      view([
        [0, 0],
        [1, 0],
      ]),
      1,
      0,
      NORMAL,
    );
    const beside = clock
      .fogNeighbours()
      .map((at) => `${at.x},${at.y}`)
      .sort();
    expect(beside).toEqual(["0,1", "1,1", "2,0", "2,1"]);
  });
});

describe("the look", () => {
  it("has wisps only inside the lift, within the puff raster", () => {
    expect(fogLiftWispsV7(0, 0)).toEqual([]);
    expect(fogLiftWispsV7(0, 1)).toEqual([]);
    for (let variant = 0; variant < FOG_LIFT_V7.variants; variant += 1)
      for (let frame = 0; frame < FOG_LIFT_V7.frames; frame += 1)
        for (const wisp of fogLiftWispsV7(variant, (frame + 0.5) / 12))
          for (const lobe of wisp.lobes) {
            expect(lobe.x - lobe.r).toBeGreaterThanOrEqual(
              -FOG_PUFF_RASTER_V7.x,
            );
            // Room for the cast shadow, three pixels up and right.
            expect(lobe.x + lobe.r + 3).toBeLessThanOrEqual(
              FOG_PUFF_RASTER_V7.width - FOG_PUFF_RASTER_V7.x,
            );
            expect(lobe.y - lobe.r - 3).toBeGreaterThanOrEqual(
              -FOG_PUFF_RASTER_V7.y,
            );
            expect(lobe.y + lobe.r).toBeLessThanOrEqual(
              FOG_PUFF_RASTER_V7.height - FOG_PUFF_RASTER_V7.y,
            );
          }
  });

  it("covers its whole cell, opaque, while it waits (frame 0), however it is moved", () => {
    const colours = fogLiftColoursV7("dusk");
    for (let variant = 0; variant < FOG_LIFT_V7.variants; variant += 1) {
      const sprite = fogLiftSpritePixelsV7(colours, variant, 0);
      if (sprite === null) throw new Error("empty frame 0");
      const jitter = FOG_LIFT_V7.jitter;
      for (let y = -jitter; y < 80 + jitter; y += 1)
        for (let x = -jitter; x < 80 + jitter; x += 1) {
          const px = x - sprite.x;
          const py = y - sprite.y;
          expect(px >= 0 && py >= 0 && px < sprite.width).toBe(true);
          const at = (py * sprite.width + px) * 4 + 3;
          const body = sprite.mask[at] ?? 0;
          const rim = sprite.rims[at] ?? 0;
          expect(Math.max(body, rim)).toBe(255);
        }
    }
  });

  it("frames, covers and colours", () => {
    expect(fogLiftFrameIndexV7(0)).toBe(0);
    expect(fogLiftFrameIndexV7(0.999)).toBe(FOG_LIFT_V7.frames - 1);
    expect(fogLiftCoverAlphaV7(0)).toBe(1);
    expect(fogLiftCoverAlphaV7(FOG_LIFT_V7.coverUntil)).toBe(0);
    expect(fogLiftColoursV7("OFF").body).toEqual([28, 42, 46]);
  });
});

describe("the cached frames", () => {
  it("builds a few a frame, falls back to an earlier one, and warms in idle time", () => {
    let surfaces = 0;
    const sprites = createFogLiftSpritesV7(() => {
      surfaces += 1;
      return {} as CanvasImageSource;
    });
    const colours = fogLiftColoursV7("dusk");
    sprites.beginFrame();
    for (let frame = 0; frame < FOG_LIFT_V7.buildsPerFrame; frame += 1)
      expect(sprites.sprite("dusk", colours, 0, frame)).not.toBeNull();
    expect(sprites.built).toBe(FOG_LIFT_V7.buildsPerFrame);
    // Over the budget: the nearest earlier frame built.
    const fallback = sprites.sprite(
      "dusk",
      colours,
      0,
      FOG_LIFT_V7.buildsPerFrame + 2,
    );
    expect(fallback).toBe(
      sprites.sprite("dusk", colours, 0, FOG_LIFT_V7.buildsPerFrame - 1),
    );
    expect(sprites.built).toBe(FOG_LIFT_V7.buildsPerFrame);
    // Two surfaces a frame (the body's mask and the rims).
    expect(surfaces).toBe(2 * FOG_LIFT_V7.buildsPerFrame);
    const total = FOG_LIFT_V7.variants * FOG_LIFT_V7.frames;
    let steps = 0;
    while (!sprites.warm("dusk", colours, FOG_LIFT_V7.warmPerStep)) steps += 1;
    expect(sprites.built).toBe(total);
    expect(steps).toBeGreaterThan(0);
  });
});
