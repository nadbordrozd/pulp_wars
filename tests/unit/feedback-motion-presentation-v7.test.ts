import { describe, expect, it } from "vitest";
import {
  CITY_HOP_AMPLITUDE_CSS_PX_V7,
  CITY_HOP_MS_V7,
  COIN_ARC_MAX_CSS_PX_V7,
  COIN_ARC_MIN_CSS_PX_V7,
  COIN_FLIGHT_MAX_MS_V7,
  COIN_FLIGHT_MIN_MS_V7,
  COIN_SOURCE_STAGGER_SPAN_MS_V7,
  COIN_POP_MS_V7,
  COIN_SPRITES_PER_SOURCE_V7,
  COIN_SPRITE_CAP_V7,
  COIN_STAGGER_MS_V7,
  POPULATION_ICONS_PER_CITY_V7,
  coinArcControlV7,
  coinBurstOffsetV7,
  coinEntryPointV7,
  coinFrameV7,
  coinArcHeightV7,
  coinFlightMsV7,
  coinLandingAfterMsV7,
  coinPathProgressV7,
  coinStartDelayMsV7,
  coinSpritePlanV7,
  coinSpritesForAmountV7,
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
import { promotionMarkerSizeCssPxV7 } from "../../src/render/canvas/feedback-canvas-v7";

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

  it("sends the coins of a source one after another, and the sources a moment apart", () => {
    expect(coinStartDelayMsV7(0, 1, 0)).toBe(0);
    // One source: a stream, 125 ms apart (between 110 and 140).
    expect(COIN_STAGGER_MS_V7).toBeGreaterThanOrEqual(110);
    expect(COIN_STAGGER_MS_V7).toBeLessThanOrEqual(140);
    expect(coinStartDelayMsV7(0, 1, 3)).toBe(3 * COIN_STAGGER_MS_V7);
    // Many sources: their first coins never spread over more than the span.
    expect(coinStartDelayMsV7(23, 24, 0)).toBeLessThanOrEqual(
      COIN_SOURCE_STAGGER_SPAN_MS_V7 + 1e-9,
    );
    expect(coinStartDelayMsV7(1, 3, 0)).toBe(70);
    expect(coinStartDelayMsV7(2, 3, 1)).toBe(140 + COIN_STAGGER_MS_V7);
  });
});

describe("coin flight", () => {
  const from = { x: 640, y: 520 };
  const to = { x: 34, y: 30 };
  const burst = coinBurstOffsetV7(1, 3);
  const start = { x: from.x + burst.x, y: from.y + burst.y };
  /** Distance of a point from the straight line start -> end, and how far along. */
  const offLine = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    point: { x: number; y: number },
  ) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    return {
      height: Math.abs((point.x - a.x) * dy - (point.y - a.y) * dx) / length,
      along: ((point.x - a.x) * dx + (point.y - a.y) * dy) / (length * length),
    };
  };

  it("is slow enough to follow: a 300 ms hop and a toss of 1.0 to 1.3 s", () => {
    expect(COIN_POP_MS_V7).toBe(300);
    expect(coinFlightMsV7(0)).toBe(COIN_FLIGHT_MIN_MS_V7);
    expect(coinFlightMsV7(250)).toBe(1_000);
    expect(coinFlightMsV7(600)).toBe(1_140);
    expect(coinFlightMsV7(5_000)).toBe(COIN_FLIGHT_MAX_MS_V7);
    expect(COIN_FLIGHT_MIN_MS_V7).toBe(1_000);
    expect(COIN_FLIGHT_MAX_MS_V7).toBe(1_300);
    const distance = Math.hypot(to.x - start.x, to.y - start.y);
    expect(coinLandingAfterMsV7({ from, burst, to })).toBe(
      300 + coinFlightMsV7(distance),
    );
    // Fast animation speed halves it; a coin from the edge has no hop.
    expect(coinLandingAfterMsV7({ from, burst, to, durationScale: 0.5 })).toBe(
      (300 + coinFlightMsV7(distance)) / 2,
    );
    expect(coinLandingAfterMsV7({ from, burst, to, pop: false })).toBe(
      coinFlightMsV7(distance),
    );
  });

  it("moves steadily along the curve: gentle at both ends, never backwards", () => {
    expect(coinPathProgressV7(0)).toBe(0);
    expect(coinPathProgressV7(1)).toBe(1);
    expect(coinPathProgressV7(0.5)).toBeCloseTo(0.5, 12);
    let last = 0;
    let fastest = 0;
    for (let step = 1; step <= 100; step += 1) {
      const now = coinPathProgressV7(step / 100);
      expect(now).toBeGreaterThan(last);
      fastest = Math.max(fastest, now - last);
      last = now;
    }
    const first = coinPathProgressV7(0.01);
    const final = 1 - coinPathProgressV7(0.99);
    // It leaves and arrives at about a third of its mean speed (no jerk,
    // no snap) and is never more than 1.4 times as fast as the mean.
    expect(first).toBeGreaterThan(0.003);
    expect(first).toBeLessThan(0.005);
    expect(final).toBeCloseTo(first, 9);
    expect(fastest).toBeLessThan(0.014);
    expect(easeInOutCubicV7(0.5)).toBeCloseTo(0.5, 12);
  });

  it("is a real toss: a parabola whose top is a quarter to a third of the way high", () => {
    for (const variant of [0, 1, 2, 3]) {
      const control = coinArcControlV7(start, to, variant);
      const points = Array.from({ length: 41 }, (_, index) =>
        parabolaPointV7(start, control, to, index / 40),
      );
      expect(points[0]).toEqual(start);
      expect(points.at(-1)?.x).toBeCloseTo(to.x, 9);
      expect(points.at(-1)?.y).toBeCloseTo(to.y, 9);
      // A parabola: constant second differences in the path parameter.
      for (const axis of ["x", "y"] as const) {
        const second = points
          .slice(2)
          .map(
            (point, index) =>
              point[axis] -
              2 * (points[index + 1]?.[axis] ?? 0) +
              (points[index]?.[axis] ?? 0),
          );
        for (const value of second)
          expect(value).toBeCloseTo(second[0] ?? 0, 8);
      }
      const distance = Math.hypot(to.x - start.x, to.y - start.y);
      const measured = points.map((point) => offLine(start, to, point));
      const top = measured.reduce((best, item) =>
        item.height > best.height ? item : best,
      );
      expect(top.height).toBeCloseTo(coinArcHeightV7(distance, variant), 6);
      // This toss is 780 px long, so the 220 px cap applies: still more
      // than a fifth of the way high.
      expect(top.height / distance).toBeGreaterThanOrEqual(0.22);
      expect(top.height / distance).toBeLessThanOrEqual(0.34);
      // The top comes a little before halfway.
      expect(top.along).toBeGreaterThan(0.4);
      expect(top.along).toBeLessThan(0.46);
      // It rises above both ends before it falls into the counter.
      expect(Math.min(...points.map((point) => point.y))).toBeLessThan(
        start.y - 400,
      );
    }
  });

  it("keeps the arc between 70 and 220 px and gives each coin of a burst its own", () => {
    expect(coinArcHeightV7(100, 0)).toBe(COIN_ARC_MIN_CSS_PX_V7);
    expect(coinArcHeightV7(3_000, 1)).toBe(COIN_ARC_MAX_CSS_PX_V7);
    expect(coinArcHeightV7(3_000, 0)).toBe(COIN_ARC_MAX_CSS_PX_V7 * 0.8);
    const heights = [0, 1, 2].map((variant) => coinArcHeightV7(600, variant));
    expect(new Set(heights).size).toBe(3);
    for (const height of heights) {
      expect(height / 600).toBeGreaterThanOrEqual(0.25);
      expect(height / 600).toBeLessThanOrEqual(0.34);
    }
    // The hops fan out sideways and stay a small hop upward.
    const offsets = [0, 1, 2, 3, 4].map((index) => coinBurstOffsetV7(index, 5));
    expect(new Set(offsets.map((offset) => offset.x)).size).toBe(5);
    for (const offset of offsets) {
      expect(offset.y).toBeLessThanOrEqual(-16);
      expect(offset.y).toBeGreaterThanOrEqual(-24);
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(16);
    }
    expect(coinBurstOffsetV7(0, 1).x).toBe(0);
  });

  it("never collapses into a straight line, whatever the direction", () => {
    const counter = { x: 40, y: 32 };
    const sources = [
      { x: 40, y: 700 }, // directly below the counter
      { x: 44, y: 400 },
      { x: 1_250, y: 40 }, // far to the right, level with it
      { x: 1_200, y: 760 },
      { x: 300, y: 36 },
      { x: 10, y: 300 },
    ];
    for (const source of sources) {
      const control = coinArcControlV7(source, counter);
      const mid = parabolaPointV7(source, control, counter, 0.5);
      const bow = offLine(source, counter, mid).height;
      expect(bow).toBeGreaterThanOrEqual(COIN_ARC_MIN_CSS_PX_V7 - 1e-6);
      // It bows upward, or to the right for a way that is nearly vertical.
      const chordMid = {
        x: (source.x + counter.x) / 2,
        y: (source.y + counter.y) / 2,
      };
      expect(mid.y < chordMid.y - 1 || mid.x > chordMid.x + 1).toBe(true);
    }
  });

  it("stays on screen: a toss under the top edge is kept lower, or bows the other way", () => {
    const bounds = { left: 12, top: 18, right: 1268, bottom: 788 };
    const counter = { x: 40, y: 32 };
    for (const source of [
      { x: 640, y: 200 },
      { x: 1_200, y: 60 },
      { x: 300, y: 40 },
      { x: 900, y: 600 },
      { x: 40, y: 700 },
    ])
      for (const variant of [0, 1, 2]) {
        const control = coinArcControlV7(source, counter, variant, bounds);
        for (let step = 0; step <= 40; step += 1) {
          const point = parabolaPointV7(source, control, counter, step / 40);
          // Within a pixel: the curve is checked at twelve points.
          expect(point.y).toBeGreaterThanOrEqual(bounds.top - 1);
          expect(point.x).toBeLessThanOrEqual(bounds.right + 1);
        }
        // Still a curve, never the straight line.
        const mid = parabolaPointV7(source, control, counter, 0.5);
        expect(offLine(source, counter, mid).height).toBeGreaterThan(8);
      }
    // With room to spare the bounds change nothing.
    expect(coinArcControlV7({ x: 900, y: 600 }, counter, 1, bounds)).toEqual(
      coinArcControlV7({ x: 900, y: 600 }, counter, 1),
    );
  });

  it("hops up out of its tile, then is tossed from the top of the hop with no jump", () => {
    expect(coinFrameV7({ from, burst, to, elapsedMs: -1 })).toBeNull();
    const born = coinFrameV7({ from, burst, to, elapsedMs: 0 });
    expect(born).toMatchObject({ x: from.x, y: from.y, opacity: 0 });
    const total = coinLandingAfterMsV7({ from, burst, to });
    expect(coinFrameV7({ from, burst, to, elapsedMs: total })).toBeNull();
    // Sampled every 60 Hz frame: the coin never jumps.
    let last = born;
    let longest = 0;
    let popEnd: typeof born = null;
    for (let elapsed = 1000 / 60; elapsed < total; elapsed += 1000 / 60) {
      const frame = coinFrameV7({ from, burst, to, elapsedMs: elapsed });
      if (frame === null || last === null) throw new Error("gap in the flight");
      longest = Math.max(
        longest,
        Math.hypot(frame.x - last.x, frame.y - last.y),
      );
      if (elapsed <= COIN_POP_MS_V7) popEnd = frame;
      expect(frame.spin).toBeGreaterThanOrEqual(0.4);
      expect(frame.spin).toBeLessThanOrEqual(1);
      last = frame;
    }
    // About 16 px a frame at the fastest for this 780 px toss.
    expect(longest).toBeLessThan(22);
    // The hop ends at the top of the hop, full size, where the toss begins.
    expect(popEnd?.x).toBeCloseTo(start.x, 0);
    expect(popEnd?.y).toBeCloseTo(start.y, 0);
    expect(popEnd?.scale).toBeGreaterThan(0.98);
    // Just before landing it is at the counter, a little smaller.
    expect(
      Math.hypot((last?.x ?? 0) - to.x, (last?.y ?? 0) - to.y),
    ).toBeLessThan(8);
    expect(last?.scale).toBeCloseTo(0.7, 1);
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

describe("marker size", () => {
  it("scales the marker with the zoom and keeps it readable", () => {
    // 38 nominal px: about a sixth smaller than the first marker's 46.
    expect(promotionMarkerSizeCssPxV7(1, true)).toBe(38);
    expect(promotionMarkerSizeCssPxV7(0.625, true)).toBeCloseTo(23.75, 9);
    expect(promotionMarkerSizeCssPxV7(0.2, true)).toBe(20);
    expect(promotionMarkerSizeCssPxV7(0.625, false)).toBeLessThan(
      promotionMarkerSizeCssPxV7(0.625, true),
    );
  });
});
