import { SURVEY_RAIDERS_V7 } from "./map";
import type { CoordV7, FactionIdV7, RewardIdV7, UnitRoleIdV7 } from "./types";

/**
 * The role of the unit a city reward grants to a seat of `faction`: the
 * Militia its `FIGHTER`, the giant its `JUGGERNAUT`, Scouts its `RAIDER`
 * (`SURVEY_RAIDERS_V7`); null for a reward that grants no unit.
 */
export function rewardUnitRoleV7(
  reward: RewardIdV7,
  faction: FactionIdV7,
): UnitRoleIdV7 | null {
  return reward === "MILITIA"
    ? "FIGHTER"
    : reward === "JUGGERNAUT"
      ? "JUGGERNAUT"
      : reward === "SURVEY" && SURVEY_RAIDERS_V7[faction] === 1
        ? "RAIDER"
        : null;
}

/**
 * How far from its city's center a reward unit may appear outside the
 * city's borders (`pulp_wars-spue`, `pulp-wars-poc-7r112`).
 */
export const REWARD_ARRIVAL_RADIUS_V7 = 2;

/**
 * Reward placement (`pulp_wars-spue`, `pulp_wars-rzqf`,
 * `pulp-wars-poc-7r112`; RULESET_7_CURRENT.md section 4.6): where a free
 * unit a city grants appears. **A reward never harms a unit already
 * there**: nothing is killed, damaged, moved, or pushed, friend or foe.
 * The reducer and the public preview (`previewRewardArrivalV7`) share this
 * one rule; each supplies the facts.
 *
 * - An empty center: the reward unit appears on it.
 * - An occupied center (the owner's garrison, an ally, or a hostile unit
 *   besieging the city): the reward unit appears on the nearest tile of the
 *   city's own territory that it may stand on (`mayStand`); failing that,
 *   on the nearest tile within `REWARD_ARRIVAL_RADIUS_V7` of the center
 *   that it may stand on. Nearest is the Chebyshev distance from the
 *   center, then `(y, x)` order.
 * - With no such tile the unit is held (`null`): it waits on the city
 *   (`CityStateV7.heldRewardUnits`) and appears at a Start Turn of its
 *   owner when a tile is free.
 *
 * Siege rules (`7r80` to `7r110`) gave the center to the reward unit and
 * moved, or killed, the unit standing there.
 */
export interface RewardArrivalInputV7 {
  readonly center: CoordV7;
  /** No unit stands on the center. */
  readonly centerFree: boolean;
  /** The board's tiles (any order; the center is ignored). */
  readonly tiles: readonly CoordV7[];
  /** A free tile the reward unit may stand on. */
  readonly mayStand: (at: CoordV7) => boolean;
  /** A tile of the rewarded city's territory. */
  readonly cityTerritory: (at: CoordV7) => boolean;
}

export function rewardArrivalV7(input: RewardArrivalInputV7): CoordV7 | null {
  const { center } = input;
  if (input.centerFree) return center;
  const distance = (at: CoordV7): number =>
    Math.max(Math.abs(at.x - center.x), Math.abs(at.y - center.y));
  const ordered = input.tiles
    .filter((at) => distance(at) > 0)
    .sort(
      (left, right) =>
        distance(left) - distance(right) ||
        left.y - right.y ||
        left.x - right.x,
    );
  return (
    ordered.find((at) => input.cityTerritory(at) && input.mayStand(at)) ??
    ordered.find(
      (at) => distance(at) <= REWARD_ARRIVAL_RADIUS_V7 && input.mayStand(at),
    ) ??
    null
  );
}
