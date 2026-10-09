import type { UnitId } from "../model/ids";
import { BERSERK_MOVE_BONUS_V7 } from "../rules/ruleset-v7";
import type { UnitFormV7 } from "./types";

/**
 * Goblin explosions and Berserk (`pulp_wars-w49.35`,
 * docs/product/RULESET_7_CURRENT.md section 18.10): the helpers the
 * reducer, the movement validation, the public queries, and the stats
 * share. An Orc Warboss's `RALLY` makes every own land-form unit within 2
 * that has not moved this turn Berserk until the end of the turn
 * (`berserkThisTurn`, emptied at End Turn): +1 Move on its ordinary Move
 * and no stop on entering a hostile zone of control. Both apply only in
 * land form. Every helper returns the neutral answer when the list is
 * empty (always so in a match without a Goblin seat).
 */

/**
 * Anything that carries the `berserkThisTurn` list (a state or a view). The
 * list is optional here, like the Candy `sugarRush` lookup, so that a
 * public view captured before the list existed reads as no Berserk unit.
 */
export interface BerserkLookupV7 {
  readonly berserkThisTurn?: readonly UnitId[];
}

/** Whether the unit is Berserk this turn. */
export function unitIsBerserkV7(
  lookup: BerserkLookupV7,
  unitId: UnitId,
): boolean {
  const list = lookup.berserkThisTurn;
  return list !== undefined && list.length > 0 && list.includes(unitId);
}

/**
 * The extra Move of a unit's ordinary `MOVE`: a Berserk land-form unit has
 * `BERSERK_MOVE_BONUS_V7`, except on an Escape Move (which, like Sugar
 * Rush's, keeps the ordinary budget).
 */
export function berserkMoveBonusV7(
  lookup: BerserkLookupV7,
  unit: {
    readonly id: UnitId;
    readonly form: UnitFormV7;
    readonly activation: { readonly escapeAvailable: boolean };
  },
): number {
  return unit.form === "LAND" &&
    !unit.activation.escapeAvailable &&
    unitIsBerserkV7(lookup, unit.id)
    ? BERSERK_MOVE_BONUS_V7
    : 0;
}

/**
 * Whether entering a hostile zone of control does not end the unit's Move
 * because it is Berserk (land form only, like Prowl). It never lets a
 * unit enter an occupied tile.
 */
export function berserkIgnoresZocV7(
  lookup: BerserkLookupV7,
  unit: { readonly id: UnitId; readonly form: UnitFormV7 },
): boolean {
  return unit.form === "LAND" && unitIsBerserkV7(lookup, unit.id);
}
