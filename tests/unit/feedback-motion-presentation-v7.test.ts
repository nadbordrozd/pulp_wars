import { describe, expect, it } from "vitest";
import {
  CITY_HOP_AMPLITUDE_CSS_PX_V7,
  CITY_HOP_MS_V7,
  COIN_FLIGHT_MS_V7,
  COIN_POP_MS_V7,
  COIN_SPRITES_PER_SOURCE_V7,
  COIN_SPRITE_CAP_V7,
  COIN_STAGGER_MS_V7,
  COIN_STAGGER_SPAN_MS_V7,
  POPULATION_ICONS_PER_CITY_V7,
  coinArcControlV7,
  coinBurstOffsetV7,
  coinEntryPointV7,
  coinFrameV7,
  coinLandingMsV7,
  coinSpritePlanV7,
  coinSpritesForAmountV7,
  coinStaggerMsV7,
  easeInOutCubicV7,
  feedbackPulseV7,
  heldCityMeterV7,
  hopOffsetCssPxV7,
  parabolaPointV7,
  populationHopFrameV7,
  populationIconPlanV7,
  promotionMarkerBobCssPxV7,
  readyChevronBounceCssPxV7,
} from "../../src/render/canvas/feedback-motion-v7";
import {
  SPENT_SPRITE_BRIGHTNESS_V7,
  createSpentSpriteCacheV7,
  promotionMarkerSizeCssPxV7,
  spentSpritePixelsV7,
} from "../../src/render/canvas/feedback-canvas-v7";

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

describe("coin sprites", () => {
  it("shows a few sprites per source, not one per Coin", () => {
    expect([0, 1, 2, 3, 4, 7, 8, 40].map(coinSpritesForAmountV7)).toEqual([
      0, 1, 2, 3, 4, 4, 5, 5,
    ]);
    expect(coinSpritesForAmountV7(1_000)).toBe(COIN_SPRITES_PER_SOURCE_V7);
  });

  it("always adds up to the Coins gained, under every cap", () => {
    const cases: readonly (readonly number[])[] = [
      [1],
      [3, 9, 2],
      [12, 12, 12, 12, 12, 12, 12, 12],
      Array.from({ length: 40 }, (_, index) => 1 + (index % 6)),
      [100, 1],
    ];
    for (const amounts of cases)
      for (const room of [0, 1, 3, 7, COIN_SPRITE_CAP_V7, 100]) {
        const plan = coinSpritePlanV7(amounts, room);
        expect(plan.length).toBeLessThanOrEqual(room);
        if (room === 0) {
          expect(plan).toEqual([]);
          continue;
        }
        expect(sum(plan.map((sprite) => sprite.value))).toBe(sum(amounts));
        for (const sprite of plan) expect(sprite.value).toBeGreaterThan(0);
      }
  });

  it("never puts more than the cap on screen and keeps every city it can", () => {
    const amounts = Array.from({ length: 30 }, () => 6);
    const plan = coinSpritePlanV7(amounts);
    expect(plan.length).toBe(COIN_SPRITE_CAP_V7);
    // Thirty cities share twenty-four sprites: one each, six go without.
    expect(new Set(plan.map((sprite) => sprite.source)).size).toBe(
      COIN_SPRITE_CAP_V7,
    );
    const few = coinSpritePlanV7([6, 6, 6]);
    expect(few.map((sprite) => sprite.source)).toEqual([
      0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    ]);
    // In proportion: a richer city launches more.
    const mixed = coinSpritePlanV7([1, 9]);
    expect(
      mixed.filter((sprite) => sprite.source === 1).length,
    ).toBeGreaterThan(mixed.filter((sprite) => sprite.source === 0).length);
  });

  it("spreads a launch over a bounded time", () => {
    expect(coinStaggerMsV7(1)).toBe(0);
    expect(coinStaggerMsV7(4)).toBe(COIN_STAGGER_MS_V7);
    expect(coinStaggerMsV7(24) * 23).toBeLessThanOrEqual(
      COIN_STAGGER_SPAN_MS_V7 + 1e-9,
    );
  });
});

describe("coin flight", () => {
  const from = { x: 640, y: 520 };
  const to = { x: 34, y: 30 };
  const burst = coinBurstOffsetV7(1, 3);

  it("eases in and out along the path", () => {
    expect(easeInOutCubicV7(0)).toBe(0);
    expect(easeInOutCubicV7(1)).toBe(1);
    expect(easeInOutCubicV7(0.5)).toBeCloseTo(0.5, 12);
    // Symmetric, slow at both ends, fastest in the middle.
    for (const t of [0.1, 0.25, 0.4])
      expect(easeInOutCubicV7(t) + easeInOutCubicV7(1 - t)).toBeCloseTo(1, 12);
    const early = easeInOutCubicV7(0.1) - easeInOutCubicV7(0);
    const middle = easeInOutCubicV7(0.55) - easeInOutCubicV7(0.45);
    const late = easeInOutCubicV7(1) - easeInOutCubicV7(0.9);
    expect(middle).toBeGreaterThan(early * 5);
    expect(late).toBeCloseTo(early, 12);
    expect(easeInOutCubicV7(-1)).toBe(0);
    expect(easeInOutCubicV7(2)).toBe(1);
  });

  it("flies a parabola: constant second differences in the path parameter", () => {
    const start = { x: from.x + burst.x, y: from.y + burst.y };
    const control = coinArcControlV7(start, to);
    const points = Array.from({ length: 11 }, (_, index) =>
      parabolaPointV7(start, control, to, index / 10),
    );
    expect(points[0]).toEqual(start);
    expect(points.at(-1)?.x).toBeCloseTo(to.x, 9);
    expect(points.at(-1)?.y).toBeCloseTo(to.y, 9);
    const second = (axis: "x" | "y"): number[] =>
      points
        .slice(2)
        .map(
          (point, index) =>
            point[axis] -
            2 * (points[index + 1]?.[axis] ?? 0) +
            (points[index]?.[axis] ?? 0),
        );
    for (const axis of ["x", "y"] as const) {
      const differences = second(axis);
      for (const value of differences)
        expect(value).toBeCloseTo(differences[0] ?? 0, 9);
    }
    // A slight arc: its top is a seventh of the distance off the chord,
    // between 26 and 96 px, and it bends upward.
    const mid = parabolaPointV7(start, control, to, 0.5);
    const chord = { x: (start.x + to.x) / 2, y: (start.y + to.y) / 2 };
    const height = Math.hypot(mid.x - chord.x, mid.y - chord.y);
    const distance = Math.hypot(to.x - start.x, to.y - start.y);
    expect(height).toBeCloseTo(Math.min(96, Math.max(26, distance / 7)), 9);
    expect(mid.y).toBeLessThan(chord.y);
  });

  it("pops out of its tile, then follows the eased parabola to the counter", () => {
    expect(coinFrameV7({ from, burst, to, elapsedMs: -1 })).toBeNull();
    const born = coinFrameV7({ from, burst, to, elapsedMs: 0 });
    expect(born).toMatchObject({ x: from.x, y: from.y, opacity: 0 });
    const popped = coinFrameV7({ from, burst, to, elapsedMs: COIN_POP_MS_V7 });
    expect(popped?.x).toBeCloseTo(from.x + burst.x, 9);
    expect(popped?.y).toBeCloseTo(from.y + burst.y, 9);
    expect(popped?.scale).toBeCloseTo(1, 9);
    const start = { x: from.x + burst.x, y: from.y + burst.y };
    const control = coinArcControlV7(start, to);
    for (const progress of [0.2, 0.5, 0.8]) {
      const frame = coinFrameV7({
        from,
        burst,
        to,
        elapsedMs: COIN_POP_MS_V7 + COIN_FLIGHT_MS_V7 * progress,
      });
      const expected = parabolaPointV7(
        start,
        control,
        to,
        easeInOutCubicV7(progress),
      );
      expect(frame?.x).toBeCloseTo(expected.x, 9);
      expect(frame?.y).toBeCloseTo(expected.y, 9);
      expect(frame?.spin).toBeGreaterThanOrEqual(0.35);
      expect(frame?.spin).toBeLessThanOrEqual(1);
    }
    // Landed: nothing is drawn, and the landing time says so.
    expect(
      coinFrameV7({
        from,
        burst,
        to,
        elapsedMs: COIN_POP_MS_V7 + COIN_FLIGHT_MS_V7,
      }),
    ).toBeNull();
    expect(coinLandingMsV7(100)).toBe(100 + COIN_POP_MS_V7 + COIN_FLIGHT_MS_V7);
    // Fast animation speed halves it; a coin from the edge has no pop.
    expect(coinLandingMsV7(0, 0.5)).toBe(
      (COIN_POP_MS_V7 + COIN_FLIGHT_MS_V7) / 2,
    );
    expect(coinLandingMsV7(0, 1, false)).toBe(COIN_FLIGHT_MS_V7);
    expect(
      coinFrameV7({ from, burst, to, elapsedMs: 0, pop: false })?.scale,
    ).toBe(1);
  });

  it("enters from the nearest edge when its source is off-screen", () => {
    const frame = { left: 0, top: 0, right: 1280, bottom: 800 };
    expect(coinEntryPointV7({ x: 400, y: 300 }, frame)).toEqual({
      point: { x: 400, y: 300 },
      offscreen: false,
    });
    expect(coinEntryPointV7({ x: 2000, y: 300 }, frame, 18)).toEqual({
      point: { x: 1298, y: 300 },
      offscreen: true,
    });
    expect(coinEntryPointV7({ x: 500, y: 5000 }, frame, 18)).toEqual({
      point: { x: 500, y: 818 },
      offscreen: true,
    });
    expect(coinEntryPointV7({ x: -900, y: -900 }, frame, 18)).toEqual({
      point: { x: -18, y: -18 },
      offscreen: true,
    });
  });
});

describe("population icons", () => {
  it("is one icon per point up to six, then merges without losing a point", () => {
    expect(populationIconPlanV7([1])).toEqual([{ source: 0, value: 1 }]);
    expect(populationIconPlanV7([2, 1]).map((icon) => icon.source)).toEqual([
      0, 0, 1,
    ]);
    for (const amounts of [[9], [4, 4, 4], [1, 1, 1, 1, 1, 1, 1, 1], [20, 1]]) {
      const plan = populationIconPlanV7(amounts);
      expect(plan.length).toBeLessThanOrEqual(POPULATION_ICONS_PER_CITY_V7);
      expect(sum(plan.map((icon) => icon.value))).toBe(sum(amounts));
    }
    expect(populationIconPlanV7([3], 0)).toEqual([]);
    expect(sum(populationIconPlanV7([3, 3], 2).map((icon) => icon.value))).toBe(
      6,
    );
  });

  it("hops in an arc from the source to the city", () => {
    const from = { x: 100, y: 200 };
    const to = { x: 260, y: 200 };
    expect(populationHopFrameV7(from, to, 0, 40)).toMatchObject(from);
    expect(populationHopFrameV7(from, to, 1, 40)).toMatchObject(to);
    const top = populationHopFrameV7(from, to, 0.5, 40);
    expect(top.x).toBeCloseTo(180, 9);
    expect(top.y).toBeCloseTo(160, 9);
    expect(top.scale).toBe(1);
  });

  it("fills the city's meter as the points arrive, never past full", () => {
    const before = { level: 2, population: 1 };
    expect(heldCityMeterV7(before, 0)).toEqual({ level: 2, population: 1 });
    expect(heldCityMeterV7(before, 1)).toEqual({ level: 2, population: 2 });
    expect(heldCityMeterV7(before, 9)).toEqual({ level: 2, population: 3 });
    expect(heldCityMeterV7({ level: 1, population: -2 }, 1)).toEqual({
      level: 1,
      population: -1,
    });
  });
});

describe("hops, bob and bounce", () => {
  it("starts and ends on the ground and rises to its amplitude once", () => {
    const hop = (elapsed: number): number =>
      hopOffsetCssPxV7(elapsed, CITY_HOP_MS_V7, CITY_HOP_AMPLITUDE_CSS_PX_V7);
    expect(hop(0)).toBe(0);
    expect(hop(-5)).toBe(0);
    expect(hop(CITY_HOP_MS_V7)).toBe(0);
    expect(hop(CITY_HOP_MS_V7 * 3)).toBe(0);
    expect(hop(CITY_HOP_MS_V7 * 0.35)).toBeCloseTo(
      -CITY_HOP_AMPLITUDE_CSS_PX_V7,
      9,
    );
    // The rebound is a fifth as high.
    expect(hop(CITY_HOP_MS_V7 * 0.85)).toBeCloseTo(
      -CITY_HOP_AMPLITUDE_CSS_PX_V7 * 0.2,
      9,
    );
    for (let elapsed = 0; elapsed <= CITY_HOP_MS_V7; elapsed += 8)
      expect(hop(elapsed)).toBeLessThanOrEqual(0);
  });

  it("is perfectly still in reduced motion", () => {
    for (const elapsed of [0, 40, 123, 800, 1_234]) {
      expect(hopOffsetCssPxV7(elapsed, CITY_HOP_MS_V7, 9, true)).toBe(0);
      expect(feedbackPulseV7(elapsed, true)).toBe(0);
      expect(promotionMarkerBobCssPxV7(elapsed, true)).toBe(-0);
      expect(readyChevronBounceCssPxV7(elapsed, true)).toBe(0);
    }
  });

  it("bobs the marker gently and bounces the chevron twice per loop", () => {
    expect(feedbackPulseV7(0, false)).toBe(0);
    expect(feedbackPulseV7(800, false)).toBeCloseTo(1, 9);
    expect(promotionMarkerBobCssPxV7(800, false)).toBeCloseTo(-2.5, 9);
    expect(readyChevronBounceCssPxV7(0, false)).toBeCloseTo(0, 9);
    expect(readyChevronBounceCssPxV7(400, false)).toBeCloseTo(-4, 9);
    expect(readyChevronBounceCssPxV7(1_200, false)).toBeCloseTo(-4, 9);
  });
});

describe("marker size and the spent sprite", () => {
  it("scales the marker with the zoom and keeps it readable", () => {
    expect(promotionMarkerSizeCssPxV7(1, true)).toBe(46);
    expect(promotionMarkerSizeCssPxV7(0.625, true)).toBeCloseTo(28.75, 9);
    expect(promotionMarkerSizeCssPxV7(0.2, true)).toBe(20);
    expect(promotionMarkerSizeCssPxV7(0.625, false)).toBeLessThan(
      promotionMarkerSizeCssPxV7(0.625, true),
    );
  });

  it("dims a spent sprite's colour and light and keeps its silhouette", () => {
    const pixels = new Uint8ClampedArray([200, 40, 40, 255, 10, 200, 30, 0]);
    const dimmed = spentSpritePixelsV7(pixels);
    // Opaque pixel: less saturated and darker, alpha untouched.
    expect(dimmed[3]).toBe(255);
    expect((dimmed[0] ?? 0) - (dimmed[1] ?? 0)).toBeLessThan(160 * 0.5);
    expect(
      Math.max(dimmed[0] ?? 0, dimmed[1] ?? 0, dimmed[2] ?? 0),
    ).toBeLessThan(200 * SPENT_SPRITE_BRIGHTNESS_V7 + 1);
    // Transparent pixel: untouched.
    expect([...dimmed.slice(4)]).toEqual([10, 200, 30, 0]);
    expect([...pixels]).toEqual([200, 40, 40, 255, 10, 200, 30, 0]);
  });

  it("builds a spent copy once per sprite and falls back to the sprite", () => {
    let reads = 0;
    const surface = { copy: true } as unknown as CanvasImageSource;
    const cache = createSpentSpriteCacheV7({
      readPixels: () => {
        reads += 1;
        return new Uint8ClampedArray([1, 2, 3, 255]);
      },
      createSurface: () => surface,
    });
    const sprite = { width: 1, height: 1 } as unknown as CanvasImageSource;
    expect(cache.resolve(sprite)).toBe(surface);
    expect(cache.resolve(sprite)).toBe(surface);
    expect(reads).toBe(1);
    const unreadable = createSpentSpriteCacheV7({
      readPixels: () => null,
      createSurface: () => surface,
    });
    expect(unreadable.resolve(sprite)).toBe(sprite);
  });
});
