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
 * Siege rules (`pulp_wars-0pgd`, `pulp-wars-poc-7r80`; RULESET_7_CURRENT.md
 * section 4.6): where a level-up reward unit appears and what happens to
 * the unit standing on the city center. The reducer and the public preview
 * (`previewRewardArrivalV7`) share this one rule; each supplies the facts.
 *
 * - An empty center: the reward unit appears on it.
 * - An occupied center: **the reward unit takes the center** and the unit
 *   standing there, the owner's garrison or a besieger alike, steps to one
 *   of the eight tiles around it that it may stand on
 *   (`occupantMayStand`): a tile of its own seat's territory first when the
 *   city is its own seat's (`preferred`), then the first in `(y, x)` order.
 *   With no such tile it dies.
 * - An occupant that nothing moves (`immovable`: Rock Hard, a rooted
 *   Tentacle) holds the center: the reward unit appears beside it, on a
 *   tile of the city's territory first (`cityTerritory`), then the first in
 *   `(y, x)` order (`spawnedMayStand`). Only with no such tile does the
 *   reward unit take the center, and the occupant dies.
 */
export interface RewardArrivalInputV7 {
  readonly center: CoordV7;
  /** The tiles around the center that are on the board, in `(y, x)` order. */
  readonly around: readonly CoordV7[];
  readonly occupant: {
    readonly id: UnitId;
    readonly immovable: boolean;
  } | null;
  /** A free tile the occupant may stand on. */
  readonly occupantMayStand: (at: CoordV7) => boolean;
  /** A tile the occupant goes to before any other (own territory). */
  readonly preferred: (at: CoordV7) => boolean;
  /** A free tile the reward unit may stand on. */
  readonly spawnedMayStand: (at: CoordV7) => boolean;
  /** A tile of the rewarded city's territory. */
  readonly cityTerritory: (at: CoordV7) => boolean;
}

export interface RewardArrivalV7 {
  /** Where the reward unit appears. */
  readonly at: CoordV7;
  /** The unit that leaves the center (it moves or dies), or null. */
  readonly displacedUnitId: UnitId | null;
  /** Where it steps to; null when nothing leaves the center or it dies. */
  readonly displaceTo: CoordV7 | null;
  /** The unit that left the center has nowhere to go and dies. */
  readonly dies: boolean;
}

export function rewardArrivalV7(input: RewardArrivalInputV7): RewardArrivalV7 {
  const { center, around, occupant } = input;
  if (occupant === null)
    return { at: center, displacedUnitId: null, displaceTo: null, dies: false };
  if (occupant.immovable) {
    const beside =
      around.find(
        (at) => input.cityTerritory(at) && input.spawnedMayStand(at),
      ) ?? around.find((at) => input.spawnedMayStand(at));
    if (beside !== undefined)
      return {
        at: beside,
        displacedUnitId: null,
        displaceTo: null,
        dies: false,
      };
    return {
      at: center,
      displacedUnitId: occupant.id,
      displaceTo: null,
      dies: true,
    };
  }
  const to =
    around.find((at) => input.preferred(at) && input.occupantMayStand(at)) ??
    around.find((at) => input.occupantMayStand(at)) ??
    null;
  return {
    at: center,
    displacedUnitId: occupant.id,
    displaceTo: to,
    dies: to === null,
  };
}
