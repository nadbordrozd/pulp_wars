import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES_V7,
  allowDuplicateFactionsV7,
  difficultyHeadStartCoinsV7,
  gameKindOfV7,
  isRegularGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  distinctFactionsV7,
  regularSetupShapeV7,
  validateMatchSetupV7,
  REGULAR_MAP_CYCLE_V7,
  type DifficultyV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  quickBoardSizeV7,
  quickGameKindV7,
  quickHeadStartCoinsV7,
  type QuickGameKindInputV7,
} from "../../src/render/quick-start-v7";
import { setupOpponentCountsV7 } from "../../src/render/setup-options-v7";
import { browserSetupV7 } from "../fixtures/v7-builders";

/**
 * Regular and custom games (bead `pulp_wars-2yc.103`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 5.8): the kind the
 * new-game screen gives a game, the optional `gameKind` setup key, and the
 * kind of a setup made before the key.
 */

/** A setup the quick start would launch (without the kind key). */
function quickSetup(
  mapType: MapTypeV7 = "CONTINENTS",
  opponents = 1,
  difficulty: DifficultyV7 = "NORMAL",
): MatchSetupV7 {
  const width = quickBoardSizeV7(mapType, opponents);
  const coins = quickHeadStartCoinsV7(difficulty, mapType, width, opponents);
  const base = browserSetupV7(11);
  return {
    ...base,
    width,
    height: width,
    aiCount: opponents,
    factions: distinctFactionsV7(opponents + 1),
    mapType,
    curiosities: true,
    aiDifficulty: difficulty,
    gameMode: "DOMINATION",
    ...(coins === 0 ? {} : { aiHeadStart: { coins } }),
  };
}

const QUICK_INPUT: QuickGameKindInputV7 = {
  quickMapType: "CONTINENTS",
  mapType: "CONTINENTS",
  boardSize: quickBoardSizeV7("CONTINENTS", 2),
  aiCount: 2,
  difficulty: "HARD",
  aiHeadStartCoins: quickHeadStartCoinsV7(
    "HARD",
    "CONTINENTS",
    quickBoardSizeV7("CONTINENTS", 2),
    2,
  ),
  aiMode: "RIVAL",
  curiosities: true,
  seedMode: "NEW",
  opponentFactionsChosen: false,
};

describe("the new-game screen's kind (quickGameKindV7)", () => {
  it("is regular with only the quick choices made", () => {
    expect(quickGameKindV7(QUICK_INPUT)).toBe("REGULAR");
    for (const mapType of REGULAR_MAP_CYCLE_V7)
      for (const opponents of [1, 3, 5])
        for (const difficulty of DIFFICULTIES_V7) {
          const boardSize = quickBoardSizeV7(mapType, opponents);
          expect(
            quickGameKindV7({
              ...QUICK_INPUT,
              quickMapType: mapType,
              mapType,
              aiCount: opponents,
              boardSize,
              difficulty,
              aiHeadStartCoins: quickHeadStartCoinsV7(
                difficulty,
                mapType,
                boardSize,
                opponents,
              ),
            }),
          ).toBe("REGULAR");
        }
  });

  it("is custom after any change under Custom game", () => {
    const changes: Partial<QuickGameKindInputV7>[] = [
      { mapType: "LAKES" },
      { mapType: "DRY_LAND" },
      { mapType: "SHOWCASE" },
      { boardSize: 20 },
      { aiHeadStartCoins: 20 },
      { aiHeadStartCoins: 0 },
      { aiMode: "COOPERATIVE" },
      { curiosities: false },
      { seedMode: "SEED" },
      { opponentFactionsChosen: true },
    ];
    for (const change of changes)
      expect(quickGameKindV7({ ...QUICK_INPUT, ...change })).toBe("CUSTOM");
  });

  it("stays regular when a value set by hand equals the default", () => {
    expect(
      quickGameKindV7({
        ...QUICK_INPUT,
        boardSize: quickBoardSizeV7("CONTINENTS", 2),
      }),
    ).toBe("REGULAR");
  });
});

describe("a setup's kind (gameKindOfV7, isRegularGameV7)", () => {
  it("reads the recorded kind", () => {
    expect(gameKindOfV7({ ...quickSetup(), gameKind: "CUSTOM" })).toBe(
      "CUSTOM",
    );
    // A recorded REGULAR stands even where the shape check would not hold
    // (a later quick start tuning must not take a game's stars away).
    expect(isRegularGameV7({ ...browserSetupV7(3), gameKind: "REGULAR" })).toBe(
      true,
    );
  });

  it("derives the kind of a setup made before the key from its shape", () => {
    for (const mapType of REGULAR_MAP_CYCLE_V7)
      for (const opponents of setupOpponentCountsV7())
        for (const difficulty of DIFFICULTIES_V7) {
          const setup = quickSetup(mapType, opponents, difficulty);
          expect(regularSetupShapeV7(setup)).toBe(true);
          expect(gameKindOfV7(setup)).toBe("REGULAR");
        }
    // Before 2yc.69 a harder level was recorded as NORMAL with its head
    // start: still regular.
    const harder = quickSetup("PANGEA", 2, "HARDER");
    expect(gameKindOfV7({ ...harder, aiDifficulty: "NORMAL" })).toBe("REGULAR");
    const custom: MatchSetupV7[] = [
      { ...quickSetup(), width: 14, height: 14 },
      { ...quickSetup(), aiMode: "COOPERATIVE" },
      { ...quickSetup(), curiosities: false },
      { ...quickSetup(), mapType: "DRY_LAND" },
      // A head start other than the named level's (a hand head start
      // that equals a level's reads as that level, as a regular game).
      { ...quickSetup("CONTINENTS", 1, "HARD"), aiHeadStart: { coins: 20 } },
      // Brutal named without its head start.
      { ...quickSetup("CONTINENTS", 1, "NORMAL"), aiDifficulty: "BRUTAL" },
      browserSetupV7(5),
    ];
    for (const setup of custom) expect(gameKindOfV7(setup)).toBe("CUSTOM");
  });

  it("never calls the Showcase, a mission or a mirror setup regular", () => {
    const showcase: MatchSetupV7 = {
      ...quickSetup(),
      mapType: "SHOWCASE",
      width: 16,
      height: 16,
      gameKind: "REGULAR",
    };
    expect(isRegularGameV7(showcase)).toBe(false);
    const mirror = allowDuplicateFactionsV7({
      ...quickSetup(),
      gameKind: "REGULAR",
    });
    expect(isRegularGameV7(mirror)).toBe(false);
    const mission = missionByIdV7("TUTORIAL_1");
    const setup = mission === null ? null : missionMatchSetupV7(mission);
    expect(setup).not.toBeNull();
    if (setup !== null) expect(isRegularGameV7(setup)).toBe(false);
  });
});

describe("the optional gameKind setup key (validateMatchSetupV7)", () => {
  it("keeps the key, and a setup without it keeps its exact shape", () => {
    for (const kind of ["REGULAR", "CUSTOM"] as const) {
      const result = validateMatchSetupV7({ ...quickSetup(), gameKind: kind });
      expect(result.ok && result.setup.gameKind).toBe(kind);
    }
    const keyless = validateMatchSetupV7(browserSetupV7(9));
    expect(keyless.ok).toBe(true);
    if (keyless.ok) expect("gameKind" in keyless.setup).toBe(false);
    expect(keyless.ok && keyless.setup).toEqual(browserSetupV7(9));
  });

  it("refuses a bad kind, a regular Showcase or mirror, and any mission kind", () => {
    expect(
      validateMatchSetupV7({ ...quickSetup(), gameKind: "QUICK" }).ok,
    ).toBe(false);
    const showcase = {
      ...browserSetupV7(4),
      mapType: "SHOWCASE",
      width: 16,
      height: 16,
    };
    expect(validateMatchSetupV7(showcase).ok).toBe(true);
    expect(validateMatchSetupV7({ ...showcase, gameKind: "CUSTOM" }).ok).toBe(
      true,
    );
    expect(validateMatchSetupV7({ ...showcase, gameKind: "REGULAR" }).ok).toBe(
      false,
    );
    const mirror = allowDuplicateFactionsV7(browserSetupV7(4));
    expect(validateMatchSetupV7({ ...mirror, gameKind: "CUSTOM" }).ok).toBe(
      true,
    );
    expect(validateMatchSetupV7({ ...mirror, gameKind: "REGULAR" }).ok).toBe(
      false,
    );
    const mission = missionByIdV7("TUTORIAL_1");
    const setup = mission === null ? null : missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no tutorial");
    expect(validateMatchSetupV7(setup).ok).toBe(true);
    expect(validateMatchSetupV7({ ...setup, gameKind: "CUSTOM" }).ok).toBe(
      false,
    );
  });

  it("keeps a harder difficulty's head start check with the key", () => {
    const setup = quickSetup("CONTINENTS", 2, "HARD");
    const coins = difficultyHeadStartCoinsV7("HARD", "CONTINENTS", 14, 2);
    expect(setup.aiHeadStart?.coins).toBe(coins);
    expect(validateMatchSetupV7({ ...setup, gameKind: "REGULAR" }).ok).toBe(
      true,
    );
  });
});
