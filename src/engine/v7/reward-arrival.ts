import type { UnitId } from "../model/ids";
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
 * city's borders, and how far the unit it pushes off the center may go
 * (`pulp_wars-spue`, `pulp_wars-sa3h`).
 */
export const REWARD_ARRIVAL_RADIUS_V7 = 2;

/**
 * Reward arrival (`pulp_wars-sa3h`, RULESET_7_CURRENT.md section 4.6): where
 * a free unit a city grants appears, and what happens to the unit on the
 * center. The reducer and the public preview (`previewRewardArrivalV7`)
 * share this one rule; each supplies the facts.
 *
 * - An empty center: the reward unit appears on it.
 * - An occupied center (the owner's garrison, an ally, or a hostile unit
 *   besieging the city), when the reward unit may push (`pushes`: the first
 *   unit of a reward): **the reward unit takes the center and pushes the
 *   occupant off**, friend or foe, to the nearest free tile it may stand on
 *   (`occupantMayStand`): a tile next to the center, of the city's
 *   territory first, then in `(y, x)` order; failing that, a tile within
 *   `REWARD_ARRIVAL_RADIUS_V7` of the center by the same order. The push
 *   never damages or kills it.
 * - When the occupant cannot be pushed (no such tile, or nothing moves it:
 *   an Egg, Rock Hard, an icebound boat, a neutral unit) or the reward unit
 *   may not push (the second Goblin or Initiate of a Militia, a held unit),
 *   the reward unit appears beside the city by the placement of
 *   `pulp_wars-spue` (7r111): on the nearest tile of the city's own
 *   territory that it may stand on (`mayStand`), else on the nearest such
 *   tile within `REWARD_ARRIVAL_RADIUS_V7` of the center. Nearest is the
 *   Chebyshev distance from the center, then `(y, x)` order.
 * - With no such tile the unit is held (`at` null): it waits on the city
 *   (`CityStateV7.heldRewardUnits`) and appears at a Start Turn of its
 *   owner when a tile is free.
 *
 * History: the siege rules (`7r80` to `7r110`) pushed the occupant to a
 * tile next to the center and killed it with none; reward placement
 * (`7r111` to the identity before `pulp_wars-sa3h`) never moved it.
 */
export interface RewardArrivalInputV7 {
  readonly center: CoordV7;
  /** The unit on the center, or null when it is free. */
  readonly occupant: { readonly id: UnitId } | null;
  /** The reward unit may push the occupant off the center. */
  readonly pushes: boolean;
  /** The board's tiles (any order; the center is ignored). */
  readonly tiles: readonly CoordV7[];
  /** A free tile the occupant may be pushed to. */
  readonly occupantMayStand: (at: CoordV7) => boolean;
  /** A free tile the reward unit may stand on beside the city. */
  readonly mayStand: (at: CoordV7) => boolean;
  /** A tile of the rewarded city's territory. */
  readonly cityTerritory: (at: CoordV7) => boolean;
}

export interface RewardArrivalV7 {
  /** Where the reward unit appears; null when it is held. */
  readonly at: CoordV7 | null;
  /** The unit pushed off the center, or null. */
  readonly pushedUnitId: UnitId | null;
  /** Where the pushed unit goes; null when nothing is pushed. */
  readonly pushTo: CoordV7 | null;
}

export function rewardArrivalV7(input: RewardArrivalInputV7): RewardArrivalV7 {
  const { center, occupant } = input;
  if (occupant === null)
    return { at: center, pushedUnitId: null, pushTo: null };
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
  if (input.pushes) {
    for (let ring = 1; ring <= REWARD_ARRIVAL_RADIUS_V7; ring += 1) {
      const candidates = ordered.filter(
        (at) => distance(at) === ring && input.occupantMayStand(at),
      );
      const to =
        candidates.find((at) => input.cityTerritory(at)) ?? candidates[0];
      if (to !== undefined)
        return { at: center, pushedUnitId: occupant.id, pushTo: to };
    }
  }
  return {
    at:
      ordered.find((at) => input.cityTerritory(at) && input.mayStand(at)) ??
      ordered.find(
        (at) => distance(at) <= REWARD_ARRIVAL_RADIUS_V7 && input.mayStand(at),
      ) ??
      null,
    pushedUnitId: null,
    pushTo: null,
  };
}
