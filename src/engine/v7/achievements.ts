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
 * achievement registry. The economy rejig (`pulp_wars-w49.16`, 7r54,
 * docs/product/RULESET_7_ECONOMY_REJIG.md): no achievement needs a
 * technology any more (Explorer needed Scouting, Engineer Engineering, and
 * Muster Drill before). The table stays so a later rule can name one.
 */
export const ACHIEVEMENT_REQUIRED_TECH_V7: Readonly<
  Record<AchievementIdV7, TechnologyIdV7 | null>
> = Object.freeze({
  EXPLORER: null,
  ENGINEER: null,
  MUSTER: null,
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

/**
 * Conqueror: captures of an enemy capital. The economy rejig (7r54): the
 * captured city was founded as a capital (`isCapital`), belonged to another
 * player, and is not the captor's own first capital (any enemy city
 * before).
 */
export const CONQUEROR_CAPTURES_V7 = 1 as const;
/** Land Baron: cities owned at once (5 before the economy rejig). */
export const LAND_BARON_CITIES_V7 = 8 as const;
/**
 * Sea Dog: naval units (Patrol Boats and Battleships) on the board at once
 * (3 before the economy rejig).
 */
export const SEA_DOG_SHIPS_V7 = 5 as const;
/** Slayer: kills credited to one unit on the board (5 before). */
export const SLAYER_KILLS_V7 = 7 as const;
/**
 * Muster: different kinds of unit the player can train (a role with a
 * price, so never the reward giant; ships count) on the board at once (4,
 * and Drill, before the economy rejig).
 */
export const MUSTER_KINDS_V7 = 6 as const;
/**
 * Engineer: the output of one Windmill, Sawmill, Forge, or Workshop (6, and
 * Engineering, before the economy rejig). Only a Windmill or a Sawmill can
 * reach it (a Forge's cap is 6, a Workshop's 4).
 */
export const ENGINEER_MILL_OUTPUT_V7 = 7 as const;
/**
 * Explorer: half the board's tiles, rounded up (98 on a 14 by 14 board, 61
 * on 11 by 11, 200 on 20 by 20; a flat 100, and Scouting, before the
 * economy rejig).
 */
export function explorerTilesRequiredV7(board: {
  readonly width: number;
  readonly height: number;
}): number {
  return Math.ceil((board.width * board.height) / 2);
}

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
 *
 * The naval branch, the frozen sea
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.11): an Ice Folk seat
 * has no ships, so its Sea Dog counts its land-form units standing on ice
 * instead (a land-form unit stands on a water tile only on ice), against
 * the same number (`ICE_SEA_DOG_UNITS_V7`).
 */
export function revision21AchievementCountsV7(
  state: Pick<GameStateV7, "players" | "cities" | "units" | "board">,
  playerId: PlayerId,
): Readonly<Record<Revision21AchievementIdV7, number>> {
  const player = state.players.find((candidate) => candidate.id === playerId);
  let cities = 0;
  for (const city of state.cities) if (city.ownerId === playerId) cities += 1;
  const iceFolk = player?.faction === "ICE_FOLK";
  let ships = 0;
  let kills = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId || unit.hp <= 0) continue;
    if (
      iceFolk
        ? unit.form === "LAND" &&
          state.board.tiles[unit.at.y * state.board.width + unit.at.x]
            ?.biome === null
        : unit.form === "NAVAL"
    )
      ships += 1;
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
