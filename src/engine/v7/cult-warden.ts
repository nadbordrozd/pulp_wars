import type { PlayerId, UnitId } from "../model/ids";
import {
  IDOL_SHIELD_MINIMUM_RANGE_V7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import { arePlayersHostileV7 } from "./economy";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type GameStateV7,
  type UnitFormV7,
  type UnitRoleIdV7,
} from "./types";

/**
 * The Cult redesign E-R3 (`pulp_wars-mch9.33`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 8.1): the Idol Bearer, the
 * warden. **Behold!** is a lasting aura, with no command and no state: the
 * idol **stands** while its bearer is on the board in land form as a
 * player's unit with none of the statuses of the disruption rule. Then:
 *
 * - **Shield wall.** An attack from two or more tiles away on an own unit
 *   of the bearer's seat that stands on one of the eight tiles around a
 *   standing idol (never the bearer under its own idol; two idols halve
 *   once) is halved, rounded up, before Armoured, Plated, and Shields
 *   (src/engine/v7/combat.ts and the public combat preview, `idolHalved`).
 * - **Awestruck.** A unit of a player hostile to the bearer's seat that
 *   stands on one of the eight tiles around a standing idol may make a
 *   targeted `ATTACK` only on an Idol Bearer it stands beside
 *   (`ATTACK_AWESTRUCK`, src/engine/v7/cult-hexes.ts's command gate).
 *
 * The helpers read only facts that canonical state and a player's view
 * share (the units and the status lists of the units the viewer sees), so
 * the reducer, the public command query, and the previews agree.
 */

/** The unit facts the warden helpers read (state and public units). */
export interface WardenUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

type UnitEntryListV7 = readonly { readonly unitId: UnitId }[];

/**
 * The status lists of the disruption rule (the same lists as
 * `disruptingStatusKeysV7`, src/engine/v7/cult-channel.ts), as a state and
 * a view have them. A list a retained view lacks reads as empty.
 */
export interface WardenStatusListsV7 {
  readonly plagued?: UnitEntryListV7;
  readonly bitten?: UnitEntryListV7;
  readonly frozen?: UnitEntryListV7;
  readonly stuck?: UnitEntryListV7;
  readonly toothache?: UnitEntryListV7;
  readonly splattedThisTurn?: readonly UnitId[];
  readonly terrorThisTurn?: readonly UnitId[];
  readonly huntedThisTurn?: readonly UnitId[];
  readonly bombedThisTurn?: readonly UnitId[];
  readonly ninthUnit?: { readonly crackedThisTurn?: readonly UnitId[] };
  readonly cult?: { readonly frogs?: readonly UnitId[] };
}

/** What the warden helpers read of a state or a view. */
export type WardenLookupV7 = FactionRosterV7 &
  WardenStatusListsV7 &
  Pick<GameStateV7, "setup" | "humanPlayerId">;

/**
 * Section 8.1: whether the unit `unitId` has a status of the disruption
 * rule (Plagued, Bitten, Frozen, Stuck, Toothache, Splatted, Terror, the
 * hunted or bombed mark, Cracked, a frog): the statuses that put an idol
 * down for as long as they last.
 */
export function unitHasDisruptingStatusV7(
  lookup: WardenStatusListsV7,
  unitId: UnitId,
): boolean {
  const listed = (list: UnitEntryListV7 | undefined): boolean =>
    list !== undefined && list.some((entry) => entry.unitId === unitId);
  const named = (list: readonly UnitId[] | undefined): boolean =>
    list !== undefined && list.includes(unitId);
  return (
    listed(lookup.plagued) ||
    listed(lookup.bitten) ||
    listed(lookup.frozen) ||
    listed(lookup.stuck) ||
    listed(lookup.toothache) ||
    named(lookup.splattedThisTurn) ||
    named(lookup.terrorThisTurn) ||
    named(lookup.huntedThisTurn) ||
    named(lookup.bombedThisTurn) ||
    named(lookup.ninthUnit?.crackedThisTurn) ||
    named(lookup.cult?.frogs)
  );
}

/**
 * Section 8.1: whether the unit is an Idol Bearer whose idol stands: a unit
 * with Behold! on the board in land form, of a player (a mind-controlled
 * bearer's idol stands for its controller), with no status of the
 * disruption rule. A hit does not drop it; a status does, while it lasts.
 */
export function idolStandsV7(
  lookup: WardenLookupV7,
  unit: WardenUnitFactsV7,
): boolean {
  return (
    unit.hp > 0 &&
    unit.form === "LAND" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    unitRoleRuleV7(lookup, unit).abilities.includes("BEHOLD") &&
    !unitHasDisruptingStatusV7(lookup, unit.id)
  );
}

/** Section 8.1: the units of `units` whose idol stands, in their order. */
export function standingIdolsV7<U extends WardenUnitFactsV7>(
  lookup: WardenLookupV7,
  units: readonly U[],
): readonly U[] {
  return units.filter((unit) => idolStandsV7(lookup, unit));
}

/**
 * Section 8.1, the shield wall: whether an attack from `distance` tiles on
 * `defender` is halved: the distance is 2 or more, and an own Idol Bearer
 * of the defender's seat whose idol stands is on one of the eight tiles
 * around the defender (the defender's own idol does not cover it; two
 * idols halve once).
 */
export function idolShieldsV7<U extends WardenUnitFactsV7>(
  lookup: WardenLookupV7,
  units: readonly U[],
  defender: WardenUnitFactsV7,
  distance: number,
): boolean {
  if (distance < IDOL_SHIELD_MINIMUM_RANGE_V7) return false;
  if (isNeutralOwnerV7(defender.ownerId)) return false;
  return units.some(
    (unit) =>
      unit.id !== defender.id &&
      unit.ownerId === defender.ownerId &&
      chebyshev(unit.at, defender.at) === 1 &&
      idolStandsV7(lookup, unit),
  );
}

/**
 * Section 8.1, Awestruck: the Idol Bearers whose standing idol binds the
 * unit `attacker`: every one on the eight tiles around it whose seat is
 * hostile to the attacker's owner (a ranged attacker beside one is bound
 * too), in unit-ID order. Empty when it is free. A neutral unit is never
 * bound (it makes no `ATTACK`).
 */
export function awestruckBearersV7<U extends WardenUnitFactsV7>(
  lookup: WardenLookupV7,
  units: readonly U[],
  attacker: { readonly ownerId: PlayerId; readonly at: CoordV7 },
): readonly U[] {
  if (isNeutralOwnerV7(attacker.ownerId)) return [];
  return units
    .filter(
      (unit) =>
        chebyshev(unit.at, attacker.at) === 1 &&
        arePlayersHostileV7(lookup, attacker.ownerId, unit.ownerId) &&
        idolStandsV7(lookup, unit),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * Section 8.1, Awestruck: the Idol Bearer (the one with the lowest unit ID)
 * that forbids the `ATTACK` of `attacker` on the unit `targetUnitId`, or
 * null when the attack is free: nothing binds the attacker, or the target
 * is one of the bearers that bind it.
 */
export function awestruckRefusingAttackV7<U extends WardenUnitFactsV7>(
  lookup: WardenLookupV7,
  units: readonly U[],
  attacker: { readonly ownerId: PlayerId; readonly at: CoordV7 },
  targetUnitId: UnitId,
): U | null {
  const binding = awestruckBearersV7(lookup, units, attacker);
  if (binding.length === 0) return null;
  if (binding.some((unit) => unit.id === targetUnitId)) return null;
  return binding[0] ?? null;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
