import {
  ICE_SEA_DOG_UNITS_V7,
  MONUMENT_POPULATION_V7,
} from "../engine/rules/ruleset-v7";
import {
  ENGINEER_MILL_OUTPUT_V7,
  LAND_BARON_CITIES_V7,
  MUSTER_KINDS_V7,
  SEA_DOG_SHIPS_V7,
  SLAYER_KILLS_V7,
} from "../engine/v7/achievements";
import {
  ACHIEVEMENT_IDS_V7,
  type AchievementIdV7,
  type MapTypeV7,
} from "../engine/v7/types";
import type { PlayerEventV7 } from "../engine/v7/events";
import type { AchievementProgressV7, PlayerViewV7 } from "../engine/v7/view";
import { cityNameV7 } from "./city-names-presentation-v7";
import { unitDisplayNameV7 } from "./dinosaur-presentation-v7";
import { factionBuildingV7 } from "./faction-buildings-v7";

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
    // The economy rejig (`pulp_wars-w49.16`, 7r54): the harder criteria of
    // docs/product/RULESET_7_ECONOMY_REJIG.md. Explorer stays the easy one.
    EXPLORER: "Explore half the map.",
    ENGINEER: `Get one mill to ${ENGINEER_MILL_OUTPUT_V7} population.`,
    // The Undead pass, correction (`pulp_wars-w49.13`): "you can train" (a
    // reward-only unit such as the Abomination does not count; the meter
    // read 3 of 4 with four kinds on the board).
    MUSTER: `Field ${MUSTER_KINDS_V7} unit types you can train.`,
    CONQUEROR: "Capture an enemy capital.",
    LAND_BARON: `Own ${LAND_BARON_CITIES_V7} cities at once.`,
    SEA_DOG: `Own ${SEA_DOG_SHIPS_V7} warships at once.`,
    SLAYER: `Get ${SLAYER_KILLS_V7} kills with one unit.`,
  });

/** The Help tip that explains what achievements are for. */
export const ACHIEVEMENT_HELP_TIP_V7 = `Achievements (see the menu) each earn a free Monument: +${MONUMENT_POPULATION_V7} population, one per city. Conquer, expand, sail, and keep your killers alive.`;

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

const MILL_NAMES_V7 = Object.freeze({
  WINDMILL: "Windmill",
  SAWMILL: "Sawmill",
  FORGE: "Forge",
  WORKSHOP: "Workshop",
} as const);

type MillIdV7 = keyof typeof MILL_NAMES_V7;

const isMill = (improvement: string): improvement is MillIdV7 =>
  Object.hasOwn(MILL_NAMES_V7, improvement);

const counted = (amount: number, one: string, many: string): string =>
  `${amount} ${amount === 1 ? one : many}`;

/**
 * The deed behind a completed achievement (bead pulp_wars-2yc.70, the user
 * 2026-10-16: "the popup should say what you did exactly"): one short line
 * with the number that earned it, read from the view of the boundary that
 * unlocked it. Presentation only, no engine change: the numbers are the
 * viewer's own `achievementProgress` (owner-only), its own mills' values
 * and units, and the city a Conqueror capture took (`CITY_CAPTURED` among
 * the same boundary's events). A count below the requirement (a view older
 * than the unlock) reads as the requirement, which the unlock proves was
 * met. No line names a tile.
 */
export function achievementDeedV7(
  achievement: AchievementIdV7,
  view: PlayerViewV7,
  events: readonly PlayerEventV7[] = [],
): string {
  const progress = view.achievementProgress.find(
    (entry) => entry.achievement === achievement,
  );
  const reached = (required: number): number =>
    progress === undefined
      ? required
      : Math.max(achievementProgressCountsV7(progress).current, required);
  switch (achievement) {
    case "EXPLORER": {
      const total = view.board.width * view.board.height;
      const explored = Math.min(
        total,
        reached(
          progress?.achievement === "EXPLORER"
            ? progress.requiredExploredTiles
            : Math.ceil(total / 2),
        ),
      );
      return explored >= total
        ? "You explored every tile of the map."
        : `You explored ${explored} of the map's ${total} tiles.`;
    }
    case "ENGINEER": {
      const output = reached(ENGINEER_MILL_OUTPUT_V7);
      const mills = view.improvementValues.flatMap((value) =>
        isMill(value.improvement) && value.measure === "POPULATION"
          ? [{ improvement: value.improvement, level: value.level }]
          : [],
      );
      const mill =
        mills.find((value) => value.level === output) ??
        mills.find((value) => value.level >= output);
      if (mill === undefined)
        return `One of your mills makes ${output} population.`;
      const name =
        factionBuildingV7(mill.improvement, view.viewer.faction)?.name ??
        MILL_NAMES_V7[mill.improvement];
      return `Your ${name} makes ${mill.level} population.`;
    }
    case "MUSTER":
      return `You field ${counted(reached(MUSTER_KINDS_V7), "unit type", "different unit types")} at once.`;
    case "CONQUEROR": {
      const capital = events
        .flatMap((event) =>
          event.kind === "CITY_CAPTURED" &&
          event.to === view.viewer.id &&
          event.from !== null
            ? view.cities.filter(
                (city) => city.id === event.cityId && city.isCapital,
              )
            : [],
        )
        .at(0);
      return capital === undefined
        ? "You captured an enemy capital."
        : `You captured ${cityNameV7(view, capital)}, an enemy capital.`;
    }
    case "LAND_BARON":
      return `Your empire spans ${counted(reached(LAND_BARON_CITIES_V7), "city", "cities")}.`;
    case "SEA_DOG":
      // The frozen sea (section 21.16): the Ice Folk hold the ice instead.
      return view.viewer.faction === "ICE_FOLK"
        ? `You hold the ice with ${counted(reached(ICE_SEA_DOG_UNITS_V7), "unit", "units")} at once.`
        : `You command ${counted(reached(SEA_DOG_SHIPS_V7), "warship", "warships")} at once.`;
    case "SLAYER": {
      // The unit with the most kills, as Slayer reads it (section 5).
      const slayer = view.units
        .filter(
          (unit) =>
            unit.ownerId === view.viewer.id &&
            unit.form !== "EGG" &&
            unit.kills >= SLAYER_KILLS_V7,
        )
        .reduce<PlayerViewV7["units"][number] | undefined>(
          (best, unit) =>
            best === undefined || unit.kills > best.kills ? unit : best,
          undefined,
        );
      return slayer === undefined
        ? `One of your units has killed ${counted(reached(SLAYER_KILLS_V7), "enemy unit", "enemy units")}.`
        : `Your ${unitDisplayNameV7(view, slayer)} has killed ${counted(slayer.kills, "enemy unit", "enemy units")}.`;
    }
  }
}
