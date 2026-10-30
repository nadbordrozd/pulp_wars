import { describe, expect, it } from "vitest";
import {
  bootstrapRatingsV7,
  bradleyTerryV7,
  ffaScheduleV7,
  headToHeadV7,
  meanIntervalV7,
  percentileV7,
  placementOrderV7,
  roundRobinScheduleV7,
  useShareV7,
  wilsonIntervalV7,
  type PairGameV7,
} from "../../scripts/balance/faction-tournament-stats-v7";

// The faction tournament's pure helpers (`pulp_wars-hblo`), on small
// hand-built inputs; the tournament itself plays matches and is run by hand.

describe("faction tournament schedules", () => {
  it("plays every pairing with both seat orders on rotating maps", () => {
    const specs = roundRobinScheduleV7({
      factions: ["A", "B", "C"],
      gamesPerPairing: 4,
      mapTypes: ["M1", "M2"],
      seedBase: 100,
    });
    expect(specs).toHaveLength(12);
    expect(new Set(specs.map((spec) => spec.seed)).size).toBe(12);
    expect(specs[0]?.seed).toBe(100);
    const ab = specs.filter((spec) => spec.factions.join("") === "AB");
    const ba = specs.filter((spec) => spec.factions.join("") === "BA");
    expect(ab).toHaveLength(2);
    expect(ba).toHaveLength(2);
    // Both orders on each map: games 0/1 on the first map, 2/3 on the next.
    expect(specs.slice(0, 4).map((spec) => spec.mapType)).toEqual([
      "M1",
      "M1",
      "M2",
      "M2",
    ]);
    // The next pairing starts one map later.
    expect(specs[4]?.mapType).toBe("M2");
  });

  it("draws free-for-alls so each faction appears equally often", () => {
    const factions = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const specs = ffaScheduleV7({
      factions,
      games: 9,
      seats: 4,
      mapTypes: ["M1", "M2", "M3"],
      seedBase: 0,
      drawSeed: 5,
    });
    const counts = new Map<string, number>();
    for (const spec of specs) {
      expect(new Set(spec.factions).size).toBe(4);
      for (const faction of spec.factions)
        counts.set(faction, (counts.get(faction) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual(new Array(9).fill(4));
    expect(specs.map((spec) => spec.mapType).slice(0, 4)).toEqual([
      "M1",
      "M2",
      "M3",
      "M1",
    ]);
  });
});

describe("faction tournament placement", () => {
  it("ranks survivors by score, then the last eliminated first", () => {
    expect(
      placementOrderV7([
        { seat: 0, eliminatedAt: 50, score: 900 },
        { seat: 1, eliminatedAt: null, score: 300 },
        { seat: 2, eliminatedAt: 80, score: 10 },
        { seat: 3, eliminatedAt: null, score: 700 },
      ]),
    ).toEqual([3, 1, 2, 0]);
  });
});

describe("faction tournament intervals", () => {
  it("computes the Wilson interval", () => {
    const interval = wilsonIntervalV7(7, 10);
    expect(interval.rate).toBeCloseTo(0.7);
    expect(interval.low).toBeCloseTo(0.3968, 3);
    expect(interval.high).toBeCloseTo(0.8922, 3);
    expect(wilsonIntervalV7(0, 0)).toEqual({ rate: 0, low: 0, high: 1 });
  });

  it("computes a mean interval and percentiles", () => {
    const interval = meanIntervalV7([1, 2, 3, 4]);
    expect(interval.mean).toBe(2.5);
    expect(interval.high - interval.mean).toBeCloseTo(
      1.96 * Math.sqrt(5 / 3 / 4),
    );
    expect(percentileV7([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentileV7([0, 10], 0.25)).toBe(2.5);
  });

  it("shares use over offer, null when never offered", () => {
    expect(useShareV7(0, 0)).toBeNull();
    expect(useShareV7(3, 12)).toBe(0.25);
  });
});

describe("faction tournament ratings", () => {
  const games = (a: string, b: string, aWins: number, bWins: number) => [
    ...Array.from({ length: aWins }, (): PairGameV7 => ({ a, b, winner: a })),
    ...Array.from({ length: bWins }, (): PairGameV7 => ({ a, b, winner: b })),
  ];

  it("rates an even record level and a stronger side higher", () => {
    const even = bradleyTerryV7(games("A", "B", 5, 5), ["A", "B"]);
    expect(even.A).toBeCloseTo(0, 6);
    expect(even.B).toBeCloseTo(0, 6);
    const lopsided = bradleyTerryV7(
      [...games("A", "B", 8, 2), ...games("B", "C", 8, 2)],
      ["A", "B", "C"],
    );
    expect(lopsided.A).toBeGreaterThan(lopsided.B as number);
    expect(lopsided.B).toBeGreaterThan(lopsided.C as number);
    const sum =
      (lopsided.A as number) + (lopsided.B as number) + (lopsided.C as number);
    expect(sum).toBeCloseTo(0, 6);
  });

  it("keeps an unbeaten faction finite through the prior", () => {
    const ratings = bradleyTerryV7(games("A", "B", 6, 0), ["A", "B"]);
    expect(Number.isFinite(ratings.A)).toBe(true);
    expect(ratings.A).toBeGreaterThan(0);
  });

  it("matches the closed form for two factions without a prior", () => {
    // p_A / p_B = 3, so the gap is 400 * log10(3).
    const ratings = bradleyTerryV7(games("A", "B", 6, 2), ["A", "B"], 0);
    expect((ratings.A as number) - (ratings.B as number)).toBeCloseTo(
      400 * Math.log10(3),
      3,
    );
  });

  it("bootstraps an interval around the point rating", () => {
    const sample = [...games("A", "B", 7, 3), ...games("A", "C", 7, 3)];
    const point = bradleyTerryV7(sample, ["A", "B", "C"]);
    const intervals = bootstrapRatingsV7(sample, ["A", "B", "C"], 50, 1);
    expect(intervals.A?.low).toBeLessThanOrEqual(point.A as number);
    expect(intervals.A?.high).toBeGreaterThanOrEqual(point.A as number);
  });

  it("builds the head-to-head matrix", () => {
    const matrix = headToHeadV7(
      [...games("A", "B", 2, 1), { a: "A", b: "B", winner: null }],
      ["A", "B"],
    );
    expect(matrix.wins.A?.B).toBe(2);
    expect(matrix.wins.B?.A).toBe(1);
    expect(matrix.games.A?.B).toBe(4);
    expect(matrix.games.B?.A).toBe(4);
  });
});
