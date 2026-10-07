import {
  ACHIEVEMENT_IDS_V7,
  type AchievementIdV7,
  type MapTypeV7,
} from "../engine/v7/types";
import type { AchievementProgressV7 } from "../engine/v7/view";

/**
 * Display copy for the achievements (docs/product/
 * RULESET_7_REVISION_21_ACHIEVEMENTS.md section 5). Names and goals are the
 * same for every faction.
 */
export const ACHIEVEMENT_NAMES_V7: Readonly<Record<AchievementIdV7, string>> =
  Object.freeze({
    EXPLORER: "Explorer",
    ENGINEER: "Engineer",
    MUSTER: "Muster",
    CONQUEROR: "Conqueror",
    LAND_BARON: "Land Baron",
    SEA_DOG: "Sea Dog",
    SLAYER: "Slayer",
  });

export const ACHIEVEMENT_GOALS_V7: Readonly<Record<AchievementIdV7, string>> =
  Object.freeze({
    EXPLORER: "Explore 100 tiles.",
    ENGINEER: "Get one building to 6 population.",
    // The Undead pass, correction (`pulp_wars-w49.13`): "you can train" (a
    // reward-only unit such as the Abomination does not count; the meter
    // read 3 of 4 with four kinds on the board).
    MUSTER: "Field 4 unit types you can train.",
    CONQUEROR: "Capture an enemy city.",
    LAND_BARON: "Own 5 cities at once.",
    SEA_DOG: "Own 3 warships at once.",
    SLAYER: "Get 5 kills with one unit.",
  });

/** The Help tip that explains what achievements are for. */
export const ACHIEVEMENT_HELP_TIP_V7 =
  "Achievements (see the menu) each earn a free Monument: +2 population, one per city. Conquer, expand, sail, and keep your killers alive.";

export function achievementNameV7(achievement: AchievementIdV7): string {
  return ACHIEVEMENT_NAMES_V7[achievement];
}

/**
 * The achievements listed for a match, in canonical order. Sea Dog needs
 * naval units, which a Dry Land match cannot have, so it is not listed there
 * (its entitlement exists and stays locked).
 */
export function listedAchievementIdsV7(
  mapType: MapTypeV7,
): readonly AchievementIdV7[] {
  return ACHIEVEMENT_IDS_V7.filter(
    (achievement) => achievement !== "SEA_DOG" || mapType !== "DRY_LAND",
  );
}

/** Current and required count of one progress entry. */
export function achievementProgressCountsV7(progress: AchievementProgressV7): {
  readonly current: number;
  readonly required: number;
} {
  if (progress.achievement === "EXPLORER")
    return {
      current: progress.currentExploredTiles,
      required: progress.requiredExploredTiles,
    };
  if (progress.achievement === "ENGINEER")
    return {
      current: progress.currentMaximumOutput,
      required: progress.requiredOutput,
    };
  if (progress.achievement === "MUSTER")
    return {
      current: progress.currentDistinctTrainableRoles,
      required: progress.requiredDistinctTrainableRoles,
    };
  return { current: progress.current, required: progress.required };
}
