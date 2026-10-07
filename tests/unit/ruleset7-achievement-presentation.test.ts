import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  REVISION_21_ACHIEVEMENT_REQUIRED_V7,
} from "../../src/engine/index";
import {
  ACHIEVEMENT_GOALS_V7,
  ACHIEVEMENT_HELP_TIP_V7,
  ACHIEVEMENT_NAMES_V7,
  achievementNameV7,
  achievementProgressCountsV7,
  listedAchievementIdsV7,
} from "../../src/render/achievement-presentation-v7";

// Revision 21 (docs/product/RULESET_7_REVISION_21_ACHIEVEMENTS.md section 5).
describe("ruleset-7 achievement presentation", () => {
  it("names every achievement and states its goal with the engine's numbers", () => {
    expect(ACHIEVEMENT_NAMES_V7).toEqual({
      EXPLORER: "Explorer",
      ENGINEER: "Engineer",
      MUSTER: "Muster",
      CONQUEROR: "Conqueror",
      LAND_BARON: "Land Baron",
      SEA_DOG: "Sea Dog",
      SLAYER: "Slayer",
    });
    expect(Object.keys(ACHIEVEMENT_GOALS_V7)).toEqual([...ACHIEVEMENT_IDS_V7]);
    // The economy rejig (`pulp_wars-w49.16`, 7r54): an enemy capital, half
    // the map, a mill at 7, and six kinds.
    expect(ACHIEVEMENT_GOALS_V7.CONQUEROR).toBe("Capture an enemy capital.");
    expect(ACHIEVEMENT_GOALS_V7.EXPLORER).toBe("Explore half the map.");
    expect(ACHIEVEMENT_GOALS_V7.ENGINEER).toBe("Get one mill to 7 population.");
    expect(ACHIEVEMENT_GOALS_V7.MUSTER).toBe(
      "Field 6 unit types you can train.",
    );
    expect(ACHIEVEMENT_GOALS_V7.LAND_BARON).toBe(
      `Own ${REVISION_21_ACHIEVEMENT_REQUIRED_V7.LAND_BARON} cities at once.`,
    );
    expect(ACHIEVEMENT_GOALS_V7.SEA_DOG).toBe(
      `Own ${REVISION_21_ACHIEVEMENT_REQUIRED_V7.SEA_DOG} warships at once.`,
    );
    expect(ACHIEVEMENT_GOALS_V7.SLAYER).toBe(
      `Get ${REVISION_21_ACHIEVEMENT_REQUIRED_V7.SLAYER} kills with one unit.`,
    );
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      expect(achievementNameV7(achievement)).toBe(
        ACHIEVEMENT_NAMES_V7[achievement],
      );
      expect(ACHIEVEMENT_GOALS_V7[achievement].length).toBeLessThanOrEqual(40);
    }
    expect(ACHIEVEMENT_HELP_TIP_V7).toContain("Monument");
  });

  it("lists Sea Dog on every map type except Dry Land", () => {
    for (const mapType of [
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
      "SHOWCASE",
    ] as const)
      expect(listedAchievementIdsV7(mapType)).toEqual([...ACHIEVEMENT_IDS_V7]);
    expect(listedAchievementIdsV7("DRY_LAND")).toEqual([
      "EXPLORER",
      "ENGINEER",
      "MUSTER",
      "CONQUEROR",
      "LAND_BARON",
      "SLAYER",
    ]);
  });

  it("reads the current and required count of every progress shape", () => {
    expect(
      achievementProgressCountsV7({
        achievement: "EXPLORER",
        currentExploredTiles: 42,
        requiredExploredTiles: 100,
      }),
    ).toEqual({ current: 42, required: 100 });
    expect(
      achievementProgressCountsV7({
        achievement: "ENGINEER",
        currentMaximumOutput: 3,
        requiredOutput: 7,
      }),
    ).toEqual({ current: 3, required: 7 });
    expect(
      achievementProgressCountsV7({
        achievement: "MUSTER",
        currentDistinctTrainableRoles: 2,
        requiredDistinctTrainableRoles: 6,
      }),
    ).toEqual({ current: 2, required: 6 });
    expect(
      achievementProgressCountsV7({
        achievement: "SLAYER",
        current: 7,
        required: 5,
      }),
    ).toEqual({ current: 7, required: 5 });
  });
});
