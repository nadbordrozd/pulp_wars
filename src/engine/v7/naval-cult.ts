import type { PlayerId, UnitId } from "../model/ids";
import {
  deepOfferingAmountV7,
  deepOfferingOfV7,
  factionHasFavourV7,
  neutralBreedOfV7,
  ownerResearchedTechsV7,
  playerFactionV7,
  unitRoleMechanicsV7,
  type FactionRosterV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import {
  favourForfeitedV7,
  favourGainedEventV7,
  favourOfV7,
  withFavourGainedV7,
} from "./cult";
import { SEA_SERPENT_OFFERING_VALUE_V7 } from "./curiosities";
import { arePlayersHostileV7 } from "./economy";
import type { DomainEventV7 } from "./events";
import { unitScoreValueV7 } from "./score";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type CultStateV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitFormV7,
  type UnitRoleIdV7,
} from "./types";

/**
 * Themed naval branches, the Deep Ones (`pulp_wars-5ti.22`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 9.3): the Cult's two
 * rules at sea.
 *
 * - **Offerings to the Deep** (K1). A hostile unit afloat (`NAVAL` or
 *   `EMBARKED`) that a Cult seat's ship in `NAVAL` form kills by its
 *   `ATTACK` or its retaliation, while the ship's role has `DEEP_OFFERING`
 *   and its kind's capabilities under its owner have `deepOfferings`, pays
 *   the seat half its value in Favour (`DEEP_OFFERING_DIVISOR_V7`), capped
 *   at 30 as every gain (`FAVOUR_GAINED` source `DEEP_OFFERING`). Never
 *   from splash, blasts, Plague, a bomb, the crush, or a Tentacle.
 * - **The Kraken's Drag afloat** (K2). A unit afloat of a player hostile to
 *   the Kraken's owner that begins a `MOVE` beside a living Kraken in
 *   `NAVAL` form that is not icebound moves one tile in it (the Gibbering
 *   Mass's `DRAGGED`, `MASS_DRAG_TILES_V7`). A landing (`DISEMBARK`), a
 *   Ram's shove, and a Tractor Beam pull are not Moves. It is read from the
 *   board when the Move begins: no status and no state.
 *
 * The helpers read only facts canonical state and a player's view share
 * (every unit beside an own unit is visible; the ice on explored tiles is
 * public).
 */

/** The unit facts the Kraken helpers read (state and public units). */
export interface KrakenUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

/**
 * Section 9.3 K2: whether `unit` is a living ship whose role, under its
 * kind, Drags afloat (the Cult Kraken), in `NAVAL` form. Ice is the
 * caller's (an icebound Kraken drags nobody).
 */
export function unitDragsAfloatV7(
  roster: FactionRosterV7,
  unit: KrakenUnitFactsV7,
): boolean {
  return (
    unit.hp > 0 &&
    unit.form === "NAVAL" &&
    unit.summoned === undefined &&
    unit.role === "SUBMARINE" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    unitRoleMechanicsV7(roster, unit).dragsAfloat
  );
}

const KRAKENS_V7 = new WeakMap<
  readonly KrakenUnitFactsV7[],
  { readonly length: number; readonly krakens: readonly unknown[] }
>();

/**
 * Section 9.3 K2: the living Krakens of `units` in `NAVAL` form, in their
 * order, read once per unit list (the movement rules ask for every path
 * they validate; a list is never changed in place, and one whose length
 * changed is read again). A ship's kind is its owner's (a ship is never
 * mind-controlled), so the list depends on the units alone.
 */
export function krakensOfV7<U extends KrakenUnitFactsV7>(
  roster: FactionRosterV7,
  units: readonly U[],
): readonly U[] {
  const cached = KRAKENS_V7.get(units);
  if (cached !== undefined && cached.length === units.length)
    return cached.krakens as readonly U[];
  const krakens = units.filter((unit) => unitDragsAfloatV7(roster, unit));
  KRAKENS_V7.set(units, { length: units.length, krakens });
  return krakens;
}

/**
 * Section 9.3 K2, Drag afloat: the Kraken (the lowest unit ID among
 * several) that drags `mover` as it stands now, or undefined: a living
 * Kraken of `krakens` (from `krakensOfV7`) not on ice (`iceAt`), on one of
 * the eight tiles around a unit afloat (`NAVAL` or `EMBARKED`) of a player
 * whose owner is hostile to the Kraken's.
 */
export function draggingKrakenV7<U extends KrakenUnitFactsV7>(
  lookup: Parameters<typeof arePlayersHostileV7>[0],
  krakens: readonly U[],
  mover: Pick<KrakenUnitFactsV7, "id" | "ownerId" | "form" | "at">,
  iceAt: (at: CoordV7) => boolean,
): U | undefined {
  if (
    krakens.length === 0 ||
    (mover.form !== "NAVAL" && mover.form !== "EMBARKED") ||
    isNeutralOwnerV7(mover.ownerId)
  )
    return undefined;
  let found: U | undefined;
  for (const kraken of krakens)
    if (
      kraken.id !== mover.id &&
      chebyshev(kraken.at, mover.at) === 1 &&
      !iceAt(kraken.at) &&
      arePlayersHostileV7(lookup, kraken.ownerId, mover.ownerId) &&
      (found === undefined || kraken.id < found.id)
    )
      found = kraken;
  return found;
}

// ------------------------------------------------- Offerings to the Deep ---

/** The unit facts an Offering reads (state and public units alike). */
export interface DeepOfferingUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly maxHp?: number;
}

/**
 * Section 9.3 K1: the Favour (before the cap) the kill of `victim` by
 * `killer` pays the killer's seat, by its attack or its retaliation, with
 * the killer's controller's research `killerResearchedTechs`; 0 when it
 * pays nothing.
 */
export function deepOfferingFavourV7(
  lookup: FactionRosterV7 & Pick<GameStateV7, "setup" | "humanPlayerId">,
  killer: DeepOfferingUnitFactsV7,
  victim: DeepOfferingUnitFactsV7,
  killerResearchedTechs: readonly TechnologyIdV7[],
): number {
  if (isNeutralOwnerV7(killer.ownerId) || killer.form !== "NAVAL") return 0;
  return deepOfferingAmountV7(
    {
      form: killer.form,
      offering: deepOfferingOfV7(lookup, killer, killerResearchedTechs),
      hasFavour: factionHasFavourV7(playerFactionV7(lookup, killer.ownerId)),
    },
    victim,
    arePlayersHostileV7(lookup, killer.ownerId, victim.ownerId),
    // Map curiosities round 3, bead B (section 8.6): the Sea Serpent pays
    // as a victim of value 8 (4 Favour), whatever its bounty.
    isNeutralOwnerV7(victim.ownerId) &&
      neutralBreedOfV7(lookup, victim) === "SEA_SERPENT"
      ? SEA_SERPENT_OFFERING_VALUE_V7
      : unitScoreValueV7(lookup, victim),
  );
}

/**
 * Section 9.3 K1: the Cult state after the kill of `victim` by `killer` (an
 * attack or a retaliation), with its `FAVOUR_GAINED` (source
 * `DEEP_OFFERING`) pushed onto `events`; `cult` itself when the kill pays
 * nothing. The killer's research is its owner's.
 */
export function withDeepOfferingFavourV7(
  state: GameStateV7,
  cult: CultStateV7,
  killer: DeepOfferingUnitFactsV7,
  victim: DeepOfferingUnitFactsV7,
  events: DomainEventV7[],
): CultStateV7 {
  const amount = deepOfferingFavourV7(
    state,
    killer,
    victim,
    ownerResearchedTechsV7(state, killer.ownerId),
  );
  if (amount <= 0) return cult;
  const next = withFavourGainedV7(cult, killer.ownerId, amount);
  events.push(
    favourGainedEventV7(cult, next, killer.ownerId, "DEEP_OFFERING", amount),
  );
  return next;
}

/**
 * Section 9.3 K1, the preview: the Favour an Offering would pay the seat
 * `playerId` holding `favour` now, and the part the cap of 30 would forfeit.
 */
export function deepOfferingGainV7(
  cult: Pick<CultStateV7, "favour">,
  playerId: PlayerId,
  amount: number,
): { readonly favour: number; readonly forfeited: number } {
  return {
    favour: amount,
    forfeited: favourForfeitedV7(favourOfV7({ cult }, playerId), amount),
  };
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
