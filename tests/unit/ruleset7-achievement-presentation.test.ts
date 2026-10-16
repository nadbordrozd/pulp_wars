import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  REVISION_21_ACHIEVEMENT_REQUIRED_V7,
  viewForV7,
  type PlayerEventV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { cityNameV7 } from "../../src/render/city-names-presentation-v7";
import { initialV7 } from "../fixtures/v7-builders";
import {
  ACHIEVEMENT_GOALS_V7,
  ACHIEVEMENT_HELP_TIP_V7,
  ACHIEVEMENT_NAMES_V7,
  achievementDeedV7,
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

// Bead pulp_wars-2yc.70: the popup says what the player did, with the
// number that earned it, read from the view right after the unlock.
describe("ruleset-7 achievement deeds", () => {
  const base = (): PlayerViewV7 => {
    const state = initialV7();
    return viewForV7(state, state.humanPlayerId);
  };
  const withProgress = (
    view: PlayerViewV7,
    entry: PlayerViewV7["achievementProgress"][number],
  ): PlayerViewV7 => ({
    ...view,
    achievementProgress: view.achievementProgress.map((current) =>
      current.achievement === entry.achievement ? entry : current,
    ),
  });
  const millValue = (
    improvement: "WINDMILL" | "SAWMILL" | "FORGE" | "WORKSHOP" | "MARKET",
    level: number,
  ): PlayerViewV7["improvementValues"][number] => ({
    at: { x: 0, y: 0 },
    improvement,
    level,
    measure: improvement === "MARKET" ? "COIN_INCOME" : "POPULATION",
    contributingTiles: [],
  });

  it("Explorer counts the tiles explored out of the map's", () => {
    const view = base();
    expect(view.board.width * view.board.height).toBe(121);
    expect(
      achievementDeedV7(
        "EXPLORER",
        withProgress(view, {
          achievement: "EXPLORER",
          currentExploredTiles: 64,
          requiredExploredTiles: 61,
        }),
      ),
    ).toBe("You explored 64 of the map's 121 tiles.");
    expect(
      achievementDeedV7(
        "EXPLORER",
        withProgress(view, {
          achievement: "EXPLORER",
          currentExploredTiles: 121,
          requiredExploredTiles: 61,
        }),
      ),
    ).toBe("You explored every tile of the map.");
  });

  it("Engineer names the mill and its population, in the faction's words", () => {
    const view = withProgress(
      {
        ...base(),
        improvementValues: [
          millValue("MARKET", 8),
          millValue("WINDMILL", 4),
          millValue("SAWMILL", 8),
        ],
      },
      {
        achievement: "ENGINEER",
        currentMaximumOutput: 8,
        requiredOutput: 7,
      },
    );
    expect(achievementDeedV7("ENGINEER", view)).toBe(
      "Your Sawmill makes 8 population.",
    );
    // An Undead Windmill is a Bone Mill (epic pulp_wars-xdh).
    expect(
      achievementDeedV7("ENGINEER", {
        ...view,
        viewer: { ...view.viewer, faction: "UNDEAD" },
        improvementValues: [millValue("WINDMILL", 8)],
      }),
    ).toBe("Your Bone Mill makes 8 population.");
    expect(
      achievementDeedV7("ENGINEER", { ...view, improvementValues: [] }),
    ).toBe("One of your mills makes 8 population.");
  });

  it("Muster counts the unit types in the field", () => {
    expect(
      achievementDeedV7(
        "MUSTER",
        withProgress(base(), {
          achievement: "MUSTER",
          currentDistinctTrainableRoles: 7,
          requiredDistinctTrainableRoles: 6,
        }),
      ),
    ).toBe("You field 7 different unit types at once.");
  });

  it("Conqueror names the capital the same boundary captured", () => {
    const view = base();
    const capital = view.cities.find((city) => city.isCapital);
    if (capital === undefined) throw new Error("capital missing");
    const rival = view.players.find((player) => player.id !== view.viewer.id);
    if (rival === undefined) throw new Error("rival missing");
    const captured: Extract<PlayerEventV7, { kind: "CITY_CAPTURED" }> = {
      kind: "CITY_CAPTURED",
      cityId: capital.id,
      from: rival.id,
      to: view.viewer.id,
    };
    expect(achievementDeedV7("CONQUEROR", view, [captured])).toBe(
      `You captured ${cityNameV7(view, capital)}, an enemy capital.`,
    );
    expect(cityNameV7(view, capital).length).toBeGreaterThan(0);
    // Without the capture (a resumed match), the plain deed.
    expect(achievementDeedV7("CONQUEROR", view)).toBe(
      "You captured an enemy capital.",
    );
    // A neutral village taken is no enemy capital.
    expect(
      achievementDeedV7("CONQUEROR", view, [{ ...captured, from: null }]),
    ).toBe("You captured an enemy capital.");
  });

  it("Land Baron counts the cities", () => {
    expect(
      achievementDeedV7(
        "LAND_BARON",
        withProgress(base(), {
          achievement: "LAND_BARON",
          current: 9,
          required: 8,
        }),
      ),
    ).toBe("Your empire spans 9 cities.");
  });

  it("Sea Dog counts the warships, and the Ice Folk's units on the ice", () => {
    const view = withProgress(base(), {
      achievement: "SEA_DOG",
      current: 6,
      required: 5,
    });
    expect(achievementDeedV7("SEA_DOG", view)).toBe(
      "You command 6 warships at once.",
    );
    expect(
      achievementDeedV7("SEA_DOG", {
        ...view,
        viewer: { ...view.viewer, faction: "ICE_FOLK" },
      }),
    ).toBe("You hold the ice with 6 units at once.");
  });

  it("Slayer names the unit and its kills", () => {
    const view = base();
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (own === undefined) throw new Error("unit missing");
    const slayerView = withProgress(
      {
        ...view,
        units: view.units.map((unit) =>
          unit.id === own.id ? { ...unit, role: "KNIGHT", kills: 8 } : unit,
        ),
      },
      { achievement: "SLAYER", current: 8, required: 7 },
    );
    expect(achievementDeedV7("SLAYER", slayerView)).toBe(
      "Your Knight has killed 8 enemy units.",
    );
    // The veteran gone from the view: the count alone.
    expect(achievementDeedV7("SLAYER", { ...slayerView, units: [] })).toBe(
      "One of your units has killed 8 enemy units.",
    );
  });

  it("reads a count below the goal as the goal the unlock proves", () => {
    const view = base();
    expect(achievementDeedV7("LAND_BARON", view)).toBe(
      "Your empire spans 8 cities.",
    );
    expect(achievementDeedV7("SEA_DOG", view)).toBe(
      "You command 5 warships at once.",
    );
    expect(achievementDeedV7("MUSTER", view)).toBe(
      "You field 6 different unit types at once.",
    );
    expect(achievementDeedV7("EXPLORER", view)).toBe(
      "You explored 61 of the map's 121 tiles.",
    );
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      const deed = achievementDeedV7(achievement, view);
      expect(deed).toMatch(/^(You|Your|One) .+\.$/);
      expect(deed.length).toBeLessThanOrEqual(48);
      // No tile coordinates.
      expect(deed).not.toMatch(/\(\s*\d+\s*,\s*\d+\s*\)/);
    }
  });
});
