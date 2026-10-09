import { describe, expect, it } from "vitest";
import {
  scoreFromCountsV7,
  starGradeV7,
  type PlayerId,
  type StarGradeInputsV7,
} from "../../src/engine/index";
import {
  gradeConditionLinesV7,
  leaderboardOrderV7,
  pointsLabelV7,
  ratingTextV7,
  ratingThresholdV7,
  roundsLeftLabelV7,
  scoreBreakdownLinesV7,
  scoreLedeV7,
  scoreRoundLabelV7,
  signedPointsV7,
  starsLabelV7,
} from "../../src/render/score-presentation-v7";

/**
 * Score and modes, leaderboard and end of match (`pulp_wars-kaw6.3`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 8): the words and order
 * the DOM shows, from hand-built scores and grades.
 */

const COUNTS = {
  territoryTiles: 9,
  cityLevels: 4,
  techTiers: 19,
  achievements: 2,
  armyValue: 2,
  killValue: 14,
  lossValue: 4,
  hpLost: 23,
};

const GRADE_INPUTS: StarGradeInputsV7 = {
  gameMode: "DOMINATION",
  victory: true,
  rivals: 3,
  hardestDifficulty: true,
  yourScore: 312,
  bestRivalPeak: 223,
  ratingRound: 18,
  everyRivalEliminatedByYou: false,
  flawless: false,
};

describe("score breakdown lines", () => {
  it("lists every factor with plain words, its count, and its points", () => {
    const lines = scoreBreakdownLinesV7(scoreFromCountsV7(COUNTS));
    expect(
      lines.map((line) => [line.key, line.label, line.detail, line.points]),
    ).toEqual([
      ["territory", "Territory", "9 tiles × 2", 18],
      ["cities", "City levels", "4 levels × 10", 40],
      ["technology", "Technology", "19 tiers researched × 8", 152],
      ["achievements", "Achievements", "2 × 40", 80],
      ["army", "Army", "units worth 2 Coins", 2],
      ["kills", "Kills", "enemy units worth 14 Coins × 2", 28],
      ["losses", "Losses", "your units worth 4 Coins died", -4],
      ["damage", "Damage taken", "23 HP lost, −1 per 5", -4],
      ["total", "Score", "", 312],
    ]);
  });

  it("adds the cap's line only when it gives points back, and the total adds up", () => {
    const capped = scoreFromCountsV7({
      territoryTiles: 0,
      cityLevels: 0,
      techTiers: 3,
      achievements: 0,
      armyValue: 0,
      killValue: 2,
      lossValue: 30,
      hpLost: 61,
    });
    const lines = scoreBreakdownLinesV7(capped);
    const cap = lines.find((line) => line.key === "cap");
    expect(cap).toEqual({
      key: "cap",
      label: "Penalty cap",
      detail: "losses and damage take at most half",
      points: capped.capReturned,
    });
    expect(capped.capReturned).toBe(28);
    // Every line but the total sums to the total.
    expect(
      lines
        .filter((line) => line.key !== "total")
        .reduce((sum, line) => sum + line.points, 0),
    ).toBe(capped.total);
    expect(lines.at(-1)).toMatchObject({ key: "total", points: 14 });
    expect(
      scoreBreakdownLinesV7(scoreFromCountsV7(COUNTS)).some(
        (line) => line.key === "cap",
      ),
    ).toBe(false);
  });

  it("says one Coin, one tile, one level, and one tier in the singular", () => {
    const lines = scoreBreakdownLinesV7(
      scoreFromCountsV7({
        territoryTiles: 1,
        cityLevels: 1,
        techTiers: 1,
        achievements: 0,
        armyValue: 1,
        killValue: 1,
        lossValue: 1,
        hpLost: 0,
      }),
    );
    expect(lines.map((line) => line.detail).slice(0, 7)).toEqual([
      "1 tile × 2",
      "1 level × 10",
      "1 tier researched × 8",
      "0 × 40",
      "units worth 1 Coin",
      "enemy units worth 1 Coin × 2",
      "your units worth 1 Coin died",
    ]);
  });
});

describe("score labels", () => {
  it("signs points with a true minus and counts points", () => {
    expect([signedPointsV7(46), signedPointsV7(-4), signedPointsV7(0)]).toEqual(
      ["+46", "−4", "0"],
    );
    expect([pointsLabelV7(1), pointsLabelV7(312)]).toEqual([
      "1 point",
      "312 points",
    ]);
  });

  it("counts Perfection's rounds and leaves Domination's turns alone", () => {
    expect(scoreRoundLabelV7({ round: 12, roundLimit: 30 })).toBe(
      "Round 12 of 30",
    );
    expect(scoreRoundLabelV7({ round: 12, roundLimit: null })).toBeNull();
    expect(roundsLeftLabelV7({ roundsLeft: 18 })).toBe("18 rounds left");
    expect(roundsLeftLabelV7({ roundsLeft: 1 })).toBe("1 round left");
    expect(roundsLeftLabelV7({ roundsLeft: 0 })).toBe("Final round");
    expect(roundsLeftLabelV7({ roundsLeft: null })).toBeNull();
  });

  it("names the goal of each mode; Domination's is not the score", () => {
    expect(scoreLedeV7("PERFECTION")).toBe(
      "Highest score after round 30 wins.",
    );
    expect(scoreLedeV7("DOMINATION")).toMatch(
      /^Capture every enemy city to win\./,
    );
  });
});

describe("leaderboard order", () => {
  const entry = (
    playerId: number,
    score: number,
    cityCount: number,
    status: "ACTIVE" | "ELIMINATED" = "ACTIVE",
  ) => ({ playerId: playerId as PlayerId, score, cityCount, status });
  const entries = [
    entry(4, 178, 1),
    entry(1, 312, 1),
    entry(5, 400, 0, "ELIMINATED"),
    entry(3, 217, 2),
    entry(2, 217, 3),
    entry(6, 50, 1),
    entry(7, 50, 1),
  ];

  it("keeps the turn order in Domination", () => {
    expect(leaderboardOrderV7("DOMINATION", entries)).toBe(entries);
  });

  it("ranks Perfection by score, then cities, then turn order, the eliminated last", () => {
    expect(
      leaderboardOrderV7("PERFECTION", entries).map((item) => item.playerId),
    ).toEqual([1, 2, 3, 4, 6, 7, 5]);
  });
});

describe("the grade on the end screen", () => {
  it("shows the rating and the stars", () => {
    const grade = starGradeV7(GRADE_INPUTS);
    expect(ratingTextV7(grade)).toBe("×1.39 the best rival's score");
    expect(starsLabelV7(grade)).toBe("1 of 3 stars");
    expect(starsLabelV7({ stars: 3, glow: true })).toBe(
      "3 of 3 stars, flawless",
    );
    expect(ratingThresholdV7(175)).toBe("1.75");
  });

  it("lists every condition met or missed, star by star, in Domination", () => {
    const lines = gradeConditionLinesV7(starGradeV7(GRADE_INPUTS));
    expect(lines.map((line) => [line.key, line.stars, line.met])).toEqual([
      ["win", 1, true],
      ["two", 2, false],
      ["three", 3, false],
      ["conquest", 3, false],
    ]);
    expect(lines.map((line) => line.text)).toEqual([
      "Win",
      "Score 1.50 times the best rival's",
      "Score 2.00 times the best rival's",
      "Take every rival's last city yourself",
    ]);
  });

  it("uses the thresholds for the number of rivals", () => {
    const lines = gradeConditionLinesV7(
      starGradeV7({ ...GRADE_INPUTS, rivals: 1, yourScore: 450 }),
    );
    expect(lines.slice(1, 3).map((line) => [line.text, line.met])).toEqual([
      ["Score 2.00 times the best rival's", true],
      ["Score 3.00 times the best rival's", false],
    ]);
  });

  it("asks no conquest in Perfection, names a missed difficulty, and shows the glow only when earned", () => {
    const perfection = gradeConditionLinesV7(
      starGradeV7({
        ...GRADE_INPUTS,
        gameMode: "PERFECTION",
        hardestDifficulty: false,
      }),
    );
    expect(perfection.map((line) => line.key)).toEqual([
      "win",
      "two",
      "three",
      "difficulty",
    ]);
    // Flawless but under the 2-star rating: no glow, so nothing says it.
    expect(
      gradeConditionLinesV7(starGradeV7({ ...GRADE_INPUTS, flawless: true }))
        .map((line) => line.key)
        .includes("flawless"),
    ).toBe(false);
    const glowing = gradeConditionLinesV7(
      starGradeV7({ ...GRADE_INPUTS, flawless: true, yourScore: 400 }),
    );
    expect(glowing.at(-1)).toEqual({
      key: "flawless",
      stars: 3,
      text: "Flawless: you lost no unit and no city",
      met: true,
    });
  });
});
