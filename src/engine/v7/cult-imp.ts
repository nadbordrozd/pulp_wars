import type { PlayerId, UnitId } from "../model/ids";
import {
  IMP_SWARM_MINIMUM_V7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import { isNeutralOwnerV7, type CoordV7, type UnitFormV7 } from "./types";

/**
 * The Cult redesign E-R6 (`pulp_wars-mch9.36`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 7.3): the Imp, a
 * Summoner's 2-Favour summon. Its Brood is read at the Start Turn check
 * (src/engine/v7/cult-channel.ts, `impBroodV7`); its **Swarm** is here,
 * read by the combat exchange and its public preview: when a bound Imp
 * attacks a unit that has, at the moment of the attack, two or more bound
 * Imps of the attacker's seat on the eight tiles around it (the attacker
 * counted), the defender does not strike back (`SWARMED`). Unbound Imps
 * have no Swarm. The helpers read only facts that canonical state and a
 * player's view share (every unit beside an own unit is visible).
 */

/** The unit facts the Imp helpers read (state and public units). */
export interface ImpUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

/** Section 7.3: whether the unit is an Imp a seat commands (bound). */
export function unitIsBoundImpV7(
  unit: SummonedUnitRefV7 & {
    readonly ownerId: PlayerId;
    readonly hp: number;
  },
): boolean {
  return (
    unit.hp > 0 && unit.summoned === "IMP" && !isNeutralOwnerV7(unit.ownerId)
  );
}

/**
 * Section 7.3, Swarm: the bound Imps of the seat `playerId` on the eight
 * tiles around `at`, in unit-ID order.
 */
export function swarmImpsAroundV7<U extends ImpUnitFactsV7>(
  units: readonly U[],
  playerId: PlayerId,
  at: CoordV7,
): readonly U[] {
  return units
    .filter(
      (unit) =>
        unit.ownerId === playerId &&
        unit.form === "LAND" &&
        unitIsBoundImpV7(unit) &&
        Math.max(Math.abs(unit.at.x - at.x), Math.abs(unit.at.y - at.y)) === 1,
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * Section 7.3, Swarm: whether `defender` may not strike back at the attack
 * of `attacker`: the attacker is a bound Imp in land form, and the
 * defender has at least `IMP_SWARM_MINIMUM_V7` bound Imps of the attacker's
 * seat on the eight tiles around it (the attacker counted).
 */
export function impSwarmsV7(
  units: readonly ImpUnitFactsV7[],
  attacker: ImpUnitFactsV7,
  defender: Pick<ImpUnitFactsV7, "at">,
): boolean {
  return (
    attacker.form === "LAND" &&
    unitIsBoundImpV7(attacker) &&
    swarmImpsAroundV7(units, attacker.ownerId, defender.at).length >=
      IMP_SWARM_MINIMUM_V7
  );
}
