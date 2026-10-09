import type { PlayerId, UnitId } from "../model/ids";
import {
  CRACKED_DEFENSE2_V7,
  CRACKED_MINIMUM_DEFENSE2_V7,
  isMindControlledV7,
  roleDefense2AtDistanceV7,
  seatRoleMechanicsV7,
  seatRoleRuleV7,
  unitRoleMechanicsV7,
  type EffectiveRoleRuleV7,
  type FactionRosterV7,
  type RoleMechanicsV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import { compareCoordsV7, sameCoordV7 } from "./schema";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type GameStateV7,
  type NinthUnitStateV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
  type WightGraveV7,
} from "./types";

/**
 * The ninth unit (`pulp_wars-w49.17`, `pulp-wars-poc-7r55`,
 * docs/product/RULESET_7_NINTH_UNIT.md): the helpers the reducer, the
 * queries, and the stats share for the mechanics of the units added to (or
 * moved inside) every roster: the Ogre's Heavyweight (in `gangUpBonusV7`),
 * the Wight's Rise Again, the Shock Trooper's Shock Field, the Jawbreaker's
 * Rock Hard, the Stegosaurus's Thagomizer, and the Musk Ox's Frostbite (the
 * Whirligig's Three Hammers became Whirl, `pulp_wars-w49.33`, in
 * `dwarf-crowd-control.ts`). Every helper returns the neutral answer for a
 * unit without the mechanic.
 */

/** The unit facts the helpers read. */
export interface NinthUnitFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/** Anything that carries the stored ninth-unit lists (state or view). */
export interface NinthUnitLookupV7 {
  readonly ninthUnit?: Pick<NinthUnitStateV7, "crackedThisTurn">;
}

// ---------------------------------------------------------- Rock Hard ---

/**
 * Rock Hard (the Candy Jawbreaker): in land form nothing moves the unit: no
 * Push, Charge! shove, Knockback, or Tractor Beam moves it, and it is not
 * bounced when it attacks a bouncing unit. A body rule (a mind-controlled
 * Jawbreaker keeps it). An embarked Jawbreaker's transport is a boat like
 * any other.
 */
export function unitIsImmovableV7(
  roster: FactionRosterV7,
  unit: NinthUnitFactsV7,
): boolean {
  return (
    unit.form === "LAND" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    unitRoleMechanicsV7(roster, unit).immovable
  );
}

// ------------------------------------------------------- Shock Field ---

/**
 * Shock Field (the Martian Shock Trooper): the raw damage an attacker takes
 * for attacking `defender` from `distance`: the role's `shockFieldDamage`
 * when the defender is in land form, the attack comes from the next tile,
 * and the defender's Shield has at least 1 point before the hit; otherwise
 * 0. It does not depend on what the hit does (a blow that kills the
 * Trooper is shocked too), and never applies to the Trooper's own attacks.
 * The caller reduces it by Armoured and Plated and takes it from the
 * attacker's Shield first.
 */
export function shockFieldDamageV7(
  roster: FactionRosterV7,
  defender: NinthUnitFactsV7,
  defenderShield: number,
  distance: number,
): number {
  if (defender.form !== "LAND" || distance !== 1 || defenderShield < 1)
    return 0;
  return unitRoleMechanicsV7(roster, defender).shockFieldDamage;
}

// --------------------------------------------------------- Thagomizer ---

/** Whether the unit was Cracked during the active seat's turn. */
export function unitIsCrackedV7(
  lookup: NinthUnitLookupV7,
  unitId: UnitId,
): boolean {
  const list = lookup.ninthUnit?.crackedThisTurn;
  return list !== undefined && list.length > 0 && list.includes(unitId);
}

/** A Cracked unit's Defense in half-points: 1 less, never below 0.5. */
export function crackedDefense2V7(defense2: number): number {
  return Math.max(
    Math.min(defense2, CRACKED_MINIMUM_DEFENSE2_V7),
    defense2 - CRACKED_DEFENSE2_V7,
  );
}

/**
 * A land-form or naval defender's base Defense in half-points against an
 * attack from `distance` tiles: the role's Defense at that distance
 * (`roleDefense2AtDistanceV7`), 1 lower (never below 0.5) while the unit is
 * Cracked. Shared by canonical resolution, the public preview, and the
 * retaliation.
 */
export function unitDefense2AtDistanceV7(
  lookup: NinthUnitLookupV7,
  unit: { readonly id: UnitId },
  rule: Pick<EffectiveRoleRuleV7, "defense2">,
  mechanics: Pick<RoleMechanicsV7, "rangedDefense2">,
  distance: number,
): number {
  const base = roleDefense2AtDistanceV7(rule, mechanics, distance);
  return unitIsCrackedV7(lookup, unit.id) ? crackedDefense2V7(base) : base;
}

/**
 * The Thagomizer (the Dinosaur Stegosaurus): whether an `ATTACK` Cracks its
 * target: a land-form attacker whose role cracks armour, a target that
 * survives, is not an Egg, and is not the neutral Monster (no status sticks
 * to it). It does not stack: a Cracked target stays Cracked.
 */
export function attackCracksV7(
  roster: FactionRosterV7,
  attacker: NinthUnitFactsV7,
  defender: Pick<UnitStateV7, "ownerId" | "form">,
  defenderDies: boolean,
): boolean {
  return (
    !defenderDies &&
    attacker.form === "LAND" &&
    defender.form !== "EGG" &&
    !isNeutralOwnerV7(defender.ownerId) &&
    unitRoleMechanicsV7(roster, attacker).cracksArmour
  );
}

/** `list` with `unitId` inserted, sorted, without duplicates. */
export function withSortedUnitIdV7(
  list: readonly UnitId[],
  unitId: UnitId,
): readonly UnitId[] {
  return list.includes(unitId)
    ? list
    : [...list, unitId].sort((left, right) => left - right);
}

// ---------------------------------------------------------- Frostbite ---

/**
 * Frostbite (the Ice Folk Musk Ox): whether an `ATTACK` Chills its own
 * attacker: made from the next tile on a land-form unit whose role has
 * Frostbite, by a land-form attacker that survives the exchange, is hostile
 * to the Ox by construction (it attacked it), and is not the neutral
 * Monster. It applies whether or not the Ox survives.
 */
export function attackIsFrostbittenV7(
  roster: FactionRosterV7,
  attacker: Pick<UnitStateV7, "ownerId" | "form">,
  defender: NinthUnitFactsV7,
  distance: number,
  attackerDies: boolean,
): boolean {
  return (
    distance === 1 &&
    !attackerDies &&
    attacker.form === "LAND" &&
    defender.form === "LAND" &&
    !isNeutralOwnerV7(attacker.ownerId) &&
    unitRoleMechanicsV7(roster, defender).frostbite
  );
}

// ---------------------------------------------------------- Rise Again ---

/**
 * Rise Again (the Undead Wight): whether the death of `unit` (as it was
 * before the command that killed it) marks the Grave it leaves: its role
 * rises again under its kind, it is not mind-controlled (only a Wight of
 * its own Undead seat rises, the Crumbs precedent), and it has not risen
 * before.
 */
export function deathMarksWightGraveV7(
  before: Pick<GameStateV7, "players" | "mindControlled" | "ninthUnit">,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form">,
): boolean {
  if (unit.form !== "LAND" || isNeutralOwnerV7(unit.ownerId)) return false;
  if (isMindControlledV7(before, unit.id)) return false;
  if (before.ninthUnit.risenWights.includes(unit.id)) return false;
  return unitRoleMechanicsV7(before, unit).riseAgainHp !== null;
}

/**
 * Rise Again: `after` with the Graves the command's Wight deaths left,
 * folded from its events like the Crumbs (`withCrumbsLeftV7`): a
 * `GRAVE_CREATED` right after the `UNIT_DIED` of a unit that
 * `deathMarksWightGraveV7` in the state before the command. A death that
 * leaves no Grave (a bitten or infected Wight that rises as a Zombie, a
 * shattered one, one on a settlement center, on a chest, or on a tile that
 * already has a Grave) marks nothing. Returns `after` itself when nothing
 * is marked.
 */
export function withWightGravesV7(
  before: GameStateV7,
  after: GameStateV7,
  events: readonly DomainEventV7[],
): GameStateV7 {
  let wightGraves = after.ninthUnit.wightGraves;
  events.forEach((event, index) => {
    if (event.kind !== "GRAVE_CREATED" || index === 0) return;
    const death = events[index - 1];
    if (death === undefined || death.kind !== "UNIT_DIED") return;
    const unit = before.units.find(
      (candidate) => candidate.id === death.unitId,
    );
    if (unit === undefined || !deathMarksWightGraveV7(before, unit)) return;
    if (wightGraves.some((entry) => sameCoordV7(entry.at, event.at))) return;
    wightGraves = [
      ...wightGraves,
      { at: { x: event.at.x, y: event.at.y }, ownerId: unit.ownerId },
    ].sort((left, right) => compareCoordsV7(left.at, right.at));
  });
  return wightGraves === after.ninthUnit.wightGraves
    ? after
    : { ...after, ninthUnit: { ...after.ninthUnit, wightGraves } };
}

/** The marked Grave at `at`, if any. */
export function wightGraveAtV7<G extends { readonly at: CoordV7 }>(
  wightGraves: readonly G[],
  at: CoordV7,
): G | undefined {
  if (wightGraves.length === 0) return undefined;
  return wightGraves.find((entry) => sameCoordV7(entry.at, at));
}

/**
 * Drops the ninth-unit entries that no longer hold: a marked Grave whose
 * Grave is gone (a Raise Dead or a Devour of it ends the return) or whose
 * owner left the game, and the per-unit entries of units that left the
 * board. Every reducer output runs through this before validation.
 */
export function prunedNinthUnitV7(state: GameStateV7): GameStateV7 {
  const current = state.ninthUnit;
  if (
    current.wightGraves.length === 0 &&
    current.risenWights.length === 0 &&
    current.crackedThisTurn.length === 0
  )
    return state;
  const onBoard = new Set(
    state.units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
  );
  const active = new Set(
    state.players
      .filter((player) => player.status === "ACTIVE")
      .map((player) => player.id),
  );
  const wightGraves = current.wightGraves.filter(
    (entry) =>
      active.has(entry.ownerId) &&
      state.graves.some((grave) => sameCoordV7(grave, entry.at)),
  );
  const risenWights = current.risenWights.filter((unitId) =>
    onBoard.has(unitId),
  );
  const crackedThisTurn = current.crackedThisTurn.filter((unitId) =>
    onBoard.has(unitId),
  );
  return wightGraves.length === current.wightGraves.length &&
    risenWights.length === current.risenWights.length &&
    crackedThisTurn.length === current.crackedThisTurn.length
    ? state
    : {
        ...state,
        ninthUnit: {
          wightGraves,
          risenWights,
          crackedThisTurn,
        },
      };
}

/** The per-turn list emptied at an End Turn (Cracked). */
export function withNinthUnitTurnEndedV7(state: GameStateV7): GameStateV7 {
  const current = state.ninthUnit;
  return current.crackedThisTurn.length === 0
    ? state
    : { ...state, ninthUnit: { ...current, crackedThisTurn: [] } };
}

/**
 * The seat-level facts of a returning Wight (a role-level read: the Wight
 * returns as its owner seat's own heavy role), or null for a seat whose
 * heavy does not rise again.
 */
export function wightRisingRuleV7(
  roster: Pick<FactionRosterV7, "players">,
  ownerId: PlayerId,
): { readonly maxHp: number; readonly hp: number } | null {
  const hp = seatRoleMechanicsV7(roster, ownerId, "SWORDSMAN").riseAgainHp;
  if (hp === null) return null;
  const maxHp = seatRoleRuleV7(roster, ownerId, "SWORDSMAN").maxHp;
  return { maxHp, hp: Math.min(hp, maxHp) };
}

export type { WightGraveV7 };
