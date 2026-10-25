import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES_V7,
  RULESET_7_ID,
  SKIRMISH_STARS_V7,
  difficultyHeadStartCoinsV7,
  distinctFactionsV7,
  matchDifficultyV7,
  setupDifficultyAllowedV7,
  skirmishStarThresholdsV7,
  starGradeV7,
  validateMatchSetupV7,
  type AiCountV7,
  type DifficultyV7,
  type MapTypeV7,
  type MatchSetupV7,
  type StarGradeInputsV7,
} from "../../src/engine/index";
import {
  QUICK_MAP_CYCLE_V7,
  quickBoardSizeV7,
  quickHeadStartCoinsV7,
} from "../../src/render/quick-start-v7";

/**
 * Skirmish stars (`pulp_wars-2yc.69`, docs/product/RULESET_7_SCORE_AND_STARS.md
 * section 5): a win earns stars by difficulty and score. Pure calls on
 * hand-built inputs and setups; no match is played.
 */

/** 129 land tiles: 2 stars at 458, 3 stars at 687. */
const LAND = 129;
const { twoStars: T2, threeStars: T3 } = skirmishStarThresholdsV7(LAND);

function grade(
  difficulty: DifficultyV7,
  victory: boolean,
  yourScore: number,
  extra: Partial<StarGradeInputsV7> = {},
) {
  return starGradeV7({
    gameMode: "DOMINATION",
    victory,
    rivals: 2,
    difficulty,
    landTiles: LAND,
    yourScore,
    bestRivalPeak: 300,
    ratingRound: 24,
    flawless: false,
    ...extra,
  });
}

function setupOf(
  mapType: MapTypeV7,
  opponents: number,
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  const width = quickBoardSizeV7(mapType, opponents);
  return {
    rulesetId: RULESET_7_ID,
    seed: 5,
    width,
    height: width,
    aiCount: opponents as AiCountV7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: distinctFactionsV7(opponents + 1),
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: true,
    ...overrides,
  };
}

describe("skirmish stars: the grade", () => {
  it("gives no star without a win, on any difficulty and score", () => {
    for (const difficulty of DIFFICULTIES_V7)
      for (const score of [0, T2, T3, 10_000])
        expect(grade(difficulty, false, score).stars).toBe(0);
  });

  it("gives every win at least 1 star, whatever the score", () => {
    for (const difficulty of DIFFICULTIES_V7)
      expect(grade(difficulty, true, 0).stars).toBe(1);
  });

  it("caps the stars by difficulty: Easy and Normal 1, Hard and Harder 2, only Brutal 3", () => {
    const table = DIFFICULTIES_V7.map((difficulty) => [
      difficulty,
      ...[T2 - 1, T2, T3 - 1, T3, 100_000].map(
        (score) => grade(difficulty, true, score).stars,
      ),
    ]);
    expect(table).toEqual([
      ["EASY", 1, 1, 1, 1, 1],
      ["NORMAL", 1, 1, 1, 1, 1],
      ["HARD", 1, 2, 2, 2, 2],
      ["HARDER", 1, 2, 2, 2, 2],
      ["BRUTAL", 1, 2, 2, 3, 3],
    ]);
    expect(SKIRMISH_STARS_V7.maxStars).toEqual({
      EASY: 1,
      NORMAL: 1,
      HARD: 2,
      HARDER: 2,
      BRUTAL: 3,
    });
  });

  it("grades Perfection like Domination, and a flawless win gets the glow with no extra star", () => {
    expect(grade("BRUTAL", true, T3, { gameMode: "PERFECTION" }).stars).toBe(3);
    expect(grade("NORMAL", true, T2, { flawless: true })).toMatchObject({
      stars: 1,
      glow: true,
    });
    expect(grade("HARD", true, T3, { flawless: true })).toMatchObject({
      stars: 2,
      glow: true,
    });
    // Under the 2-star score, or without a win, no glow.
    expect(grade("BRUTAL", true, T2 - 1, { flawless: true }).glow).toBe(false);
    expect(grade("BRUTAL", false, T3, { flawless: true }).glow).toBe(false);
    // pulp_wars-q6cc: an Easy win never glows; a Normal one does.
    expect(grade("EASY", true, T3, { flawless: true }).glow).toBe(false);
    expect(grade("NORMAL", true, T3, { flawless: true }).glow).toBe(true);
  });

  it("reports the score, the cap, and the thresholds the end screen shows", () => {
    expect(grade("HARDER", true, 600)).toMatchObject({
      score: 600,
      difficulty: "HARDER",
      maxStars: 2,
      thresholds: { twoStars: 458, threeStars: 687 },
      conditions: {
        victory: true,
        twoStarScore: true,
        threeStarScore: false,
        flawless: false,
      },
    });
  });

  it("grows the thresholds with the board's land", () => {
    expect(skirmishStarThresholdsV7(56)).toEqual({
      twoStars: 312,
      threeStars: 468,
    });
    expect(skirmishStarThresholdsV7(288)).toEqual({
      twoStars: 776,
      threeStars: 1164,
    });
    expect(() => grade("BRUTAL", true, 500, { landTiles: -1 })).toThrow(
      RangeError,
    );
  });
});

describe("skirmish stars: the difficulty of a match", () => {
  it("reads a named difficulty from the setup", () => {
    for (const difficulty of DIFFICULTIES_V7) {
      const coins = difficultyHeadStartCoinsV7(difficulty, "PANGEA", 14, 2);
      const setup = setupOf("PANGEA", 2, {
        aiDifficulty: difficulty,
        ...(coins === 0 ? {} : { aiHeadStart: { coins } }),
      });
      expect(matchDifficultyV7(setup)).toBe(difficulty);
    }
  });

  it("reads a Normal setup's level back from its head start", () => {
    // Pangea 14 x 14, two opponents: Hard +5, Harder +10, Brutal +20.
    expect(
      (["HARD", "HARDER", "BRUTAL"] as const).map((difficulty) =>
        difficultyHeadStartCoinsV7(difficulty, "PANGEA", 14, 2),
      ),
    ).toEqual([5, 10, 20]);
    const read = (coins?: 5 | 10 | 20) =>
      matchDifficultyV7(
        setupOf(
          "PANGEA",
          2,
          coins === undefined ? {} : { aiHeadStart: { coins } },
        ),
      );
    expect([read(), read(5), read(10), read(20)]).toEqual([
      "NORMAL",
      "HARD",
      "HARDER",
      "BRUTAL",
    ]);
    // 11 x 11 Dry Land, one opponent: Hard +10, Harder and Brutal +20. A
    // hand-set +5 is under Hard's; +20 is Brutal's game too.
    expect(
      (["HARD", "HARDER", "BRUTAL"] as const).map((difficulty) =>
        difficultyHeadStartCoinsV7(difficulty, "DRY_LAND", 11, 1),
      ),
    ).toEqual([10, 20, 20]);
    const dry = (coins: 5 | 10 | 20) =>
      matchDifficultyV7({
        aiDifficulty: "NORMAL",
        aiHeadStart: { coins },
        mapType: "DRY_LAND",
        width: 11,
        aiCount: 1,
      });
    expect([dry(5), dry(10), dry(20)]).toEqual(["NORMAL", "HARD", "BRUTAL"]);
  });

  it("names exactly the level each quick start launches with", () => {
    for (const mapType of QUICK_MAP_CYCLE_V7)
      for (let opponents = 1; opponents <= 8; opponents += 1)
        for (const difficulty of DIFFICULTIES_V7) {
          const width = quickBoardSizeV7(mapType, opponents);
          const coins = quickHeadStartCoinsV7(
            difficulty,
            mapType,
            width,
            opponents,
          );
          const result = validateMatchSetupV7(
            setupOf(mapType, opponents, {
              aiDifficulty: difficulty,
              ...(coins === 0 ? {} : { aiHeadStart: { coins } }),
            }),
          );
          if (!result.ok)
            throw new Error(`${mapType} ${opponents} ${difficulty}`);
          expect(result.setup.aiDifficulty).toBe(difficulty);
          expect(matchDifficultyV7(result.setup)).toBe(difficulty);
        }
  });

  it("refuses a harder name without exactly its head start, or on the Showcase", () => {
    const pangea = (overrides: Partial<MatchSetupV7>) =>
      validateMatchSetupV7(setupOf("PANGEA", 2, overrides)).ok;
    expect(pangea({ aiDifficulty: "BRUTAL", aiHeadStart: { coins: 20 } })).toBe(
      true,
    );
    expect(pangea({ aiDifficulty: "BRUTAL" })).toBe(false);
    expect(pangea({ aiDifficulty: "BRUTAL", aiHeadStart: { coins: 10 } })).toBe(
      false,
    );
    expect(pangea({ aiDifficulty: "NORMAL", aiHeadStart: { coins: 20 } })).toBe(
      true,
    );
    // pulp_wars-q6cc: Easy is named without a head start, never with one.
    expect(pangea({ aiDifficulty: "EASY" })).toBe(true);
    expect(pangea({ aiDifficulty: "EASY", aiHeadStart: { coins: 5 } })).toBe(
      false,
    );
    expect(pangea({ aiDifficulty: "TRIVIAL" as unknown as DifficultyV7 })).toBe(
      false,
    );
    expect(
      setupDifficultyAllowedV7(
        { mapType: "SHOWCASE", width: 16, aiCount: 3 },
        "HARD",
      ),
    ).toBe(false);
    expect(
      setupDifficultyAllowedV7(
        { mapType: "SHOWCASE", width: 16, aiCount: 3 },
        "NORMAL",
      ),
    ).toBe(true);
  });

  it("keeps the quick start's head starts the engine's", () => {
    expect(quickHeadStartCoinsV7).toBe(difficultyHeadStartCoinsV7);
  });
});
