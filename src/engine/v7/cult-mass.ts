import type { PlayerId, UnitId } from "../model/ids";
import type { SummonedUnitRefV7 } from "../rules/ruleset-v7";
import { arePlayersHostileV7 } from "./economy";
import {
  idolStandsV7,
  type WardenLookupV7,
  type WardenUnitFactsV7,
} from "./cult-warden";
import { isNeutralOwnerV7, type CoordV7, type UnitFormV7 } from "./types";

/**
 * The Cult redesign E-R7 (`pulp_wars-mch9.37`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 7.4): the Gibbering Mass,
 * a Summoner's 5-Favour defender (with a helper, at Gibbering Masses).
 *
 * - **Doorstep.** At its seat's Start Turn check a bound Mass short of its
 *   Control by its strands stays bound with no strand when it stands **on
 *   or beside an own city center** (a city, never a village), or **beside
 *   an own Idol Bearer whose idol stands** (the warden's rule of section
 *   8.1, src/engine/v7/cult-warden.ts). Its strands count first: a strand
 *   to a Mass on its Doorstep is legal and simply unneeded.
 * - **Drag.** A land-form unit of a player hostile to the Mass's owner
 *   (flyers included) that **begins a Move** on one of the eight tiles
 *   around a Gibbering Mass may move only `MASS_DRAG_TILES_V7` tile in that
 *   Move (the movement refusal `DRAGGED`, src/engine/v7/movement.ts). No
 *   status, no state: it is read from the board when the Move begins. An
 *   Unbound Mass (the neutral owner's) drags every player's units.
 *
 * Immovable, no advance, and no capture are its registration's
 * (src/engine/rules/ruleset-v7.ts). The helpers read only facts that
 * canonical state and a player's view share (every unit beside an own unit
 * is visible; a viewer reads a Mass's Doorstep from its public channel
 * entry, which the view computes from the state).
 */

/** The unit facts the Mass helpers read (state and public units). */
export interface MassUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

/** Section 7.4: whether the unit is a Gibbering Mass a seat commands. */
export function unitIsBoundMassV7(
  unit: SummonedUnitRefV7 & {
    readonly ownerId: PlayerId;
    readonly hp: number;
  },
): boolean {
  return (
    unit.hp > 0 && unit.summoned === "MASS" && !isNeutralOwnerV7(unit.ownerId)
  );
}

/**
 * Section 7.4, Doorstep: whether the bound Gibbering Mass `mass` stands on
 * its Doorstep as the board stands: on or beside a center of `cities` its
 * seat owns, or on one of the eight tiles around an own Idol Bearer whose
 * idol stands. False for any other unit (an Unbound Mass has no Doorstep).
 */
export function massOnDoorstepV7<U extends WardenUnitFactsV7>(
  lookup: WardenLookupV7,
  cities: readonly { readonly ownerId: PlayerId; readonly at: CoordV7 }[],
  units: readonly U[],
  mass: WardenUnitFactsV7,
): boolean {
  if (!unitIsBoundMassV7(mass) || mass.form !== "LAND") return false;
  if (
    cities.some(
      (city) =>
        city.ownerId === mass.ownerId && chebyshev(city.at, mass.at) <= 1,
    )
  )
    return true;
  return units.some(
    (unit) =>
      unit.id !== mass.id &&
      unit.ownerId === mass.ownerId &&
      chebyshev(unit.at, mass.at) === 1 &&
      idolStandsV7(lookup, unit),
  );
}

/**
 * Section 7.4, Drag: the Gibbering Mass (the lowest unit ID among several)
 * that drags `mover` as it stands now, or undefined: a living land-form
 * Mass on one of the eight tiles around a land-form unit of a player
 * (never a neutral unit) whose owner is hostile to the mover's (an Unbound
 * Mass, the neutral owner's, is hostile to every player).
 */
export function draggingMassV7<U extends MassUnitFactsV7>(
  lookup: Parameters<typeof arePlayersHostileV7>[0],
  units: readonly U[],
  mover: Pick<MassUnitFactsV7, "id" | "ownerId" | "form" | "at">,
): U | undefined {
  if (mover.form !== "LAND" || isNeutralOwnerV7(mover.ownerId))
    return undefined;
  return units
    .filter(
      (unit) =>
        unit.id !== mover.id &&
        unit.hp > 0 &&
        unit.summoned === "MASS" &&
        unit.form === "LAND" &&
        chebyshev(unit.at, mover.at) === 1 &&
        (isNeutralOwnerV7(unit.ownerId) ||
          arePlayersHostileV7(lookup, unit.ownerId, mover.ownerId)),
    )
    .sort((left, right) => left.id - right.id)[0];
}

const MASSES_V7 = new WeakMap<
  readonly MassUnitFactsV7[],
  { readonly length: number; readonly masses: readonly unknown[] }
>();

/**
 * Section 7.4: the living Gibbering Masses of `units` (bound or Unbound), in
 * their order, read once per unit list (the movement rules ask for every
 * path they validate; a list is never changed in place, and one whose
 * length changed is read again).
 */
export function massesOfV7<U extends MassUnitFactsV7>(
  units: readonly U[],
): readonly U[] {
  const cached = MASSES_V7.get(units);
  if (cached !== undefined && cached.length === units.length)
    return cached.masses as readonly U[];
  const masses = units.filter(
    (unit) => unit.hp > 0 && unit.summoned === "MASS",
  );
  MASSES_V7.set(units, { length: units.length, masses });
  return masses;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
