import type { PlayerId } from "../model/ids";
import {
  ACHIEVEMENT_IDS_V7,
  type AchievementEntitlementV7,
  type AchievementIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "./types";

/**
 * Revision 21 (docs/product/RULESET_7_REVISION_21_ACHIEVEMENTS.md): the
 * achievement registry. The three revision-5 achievements keep their enabling
 * technology; the four revision-21 achievements have none (`null`), because
 * their conditions cannot be met in the opening turns and must be reachable
 * by every faction whatever it researches.
 */
export const ACHIEVEMENT_REQUIRED_TECH_V7: Readonly<
  Record<AchievementIdV7, TechnologyIdV7 | null>
> = Object.freeze({
  EXPLORER: "SCOUTING",
  ENGINEER: "ENGINEERING",
  MUSTER: "DRILL",
  CONQUEROR: null,
  LAND_BARON: null,
  SEA_DOG: null,
  SLAYER: null,
});

/** The achievements added by revision 21, in canonical order. */
export const REVISION_21_ACHIEVEMENT_IDS_V7 = Object.freeze([
  "CONQUEROR",
  "LAND_BARON",
  "SEA_DOG",
  "SLAYER",
] as const);
export type Revision21AchievementIdV7 =
  (typeof REVISION_21_ACHIEVEMENT_IDS_V7)[number];

/** Conqueror: captures of a city owned by another player. */
export const CONQUEROR_CAPTURES_V7 = 1 as const;
/** Land Baron: cities owned at once. */
export const LAND_BARON_CITIES_V7 = 5 as const;
/** Sea Dog: naval units (Patrol Boats and Battleships) on the board at once. */
export const SEA_DOG_SHIPS_V7 = 3 as const;
/** Slayer: kills credited to one unit on the board. */
export const SLAYER_KILLS_V7 = 5 as const;

export const REVISION_21_ACHIEVEMENT_REQUIRED_V7 = Object.freeze({
  CONQUEROR: CONQUEROR_CAPTURES_V7,
  LAND_BARON: LAND_BARON_CITIES_V7,
  SEA_DOG: SEA_DOG_SHIPS_V7,
  SLAYER: SLAYER_KILLS_V7,
} as const satisfies Record<Revision21AchievementIdV7, number>);

/**
 * The current count of each revision-21 achievement for `playerId`, from the
 * canonical state alone. Conqueror has no stored counter: its count is 1 once
 * the entitlement is unlocked (the capture itself unlocks it) and 0 before.
 * An Egg is a unit with no kills and is not a naval unit, so it never counts.
 */
export function revision21AchievementCountsV7(
  state: Pick<GameStateV7, "players" | "cities" | "units">,
  playerId: PlayerId,
): Readonly<Record<Revision21AchievementIdV7, number>> {
  const player = state.players.find((candidate) => candidate.id === playerId);
  let cities = 0;
  for (const city of state.cities) if (city.ownerId === playerId) cities += 1;
  let ships = 0;
  let kills = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId || unit.hp <= 0) continue;
    if (unit.form === "NAVAL") ships += 1;
    if (unit.kills > kills) kills = unit.kills;
  }
  return {
    CONQUEROR:
      player !== undefined && entitlementOf(player, "CONQUEROR")?.unlocked
        ? CONQUEROR_CAPTURES_V7
        : 0,
    LAND_BARON: cities,
    SEA_DOG: ships,
    SLAYER: kills,
  };
}

function entitlementOf(
  player: {
    readonly achievementEntitlements: readonly AchievementEntitlementV7[];
  },
  achievement: AchievementIdV7,
): AchievementEntitlementV7 | undefined {
  return player.achievementEntitlements.find(
    (entitlement) => entitlement.achievement === achievement,
  );
}

/** A new seat's entitlements: every achievement, locked and unspent. */
export function initialAchievementEntitlementsV7(): AchievementEntitlementV7[] {
  return ACHIEVEMENT_IDS_V7.map((achievement) => ({
    achievement,
    unlocked: false,
    spent: false,
  }));
}
