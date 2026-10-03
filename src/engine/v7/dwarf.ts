import type { PlayerId, UnitId } from "../model/ids";
import {
  DIG_IN_RADIUS_V7,
  ownerResearchedTechsV7,
  unitCapabilitiesV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import type {
  CoordV7,
  FactionIdV7,
  GameStateV7,
  TechnologyIdV7,
  UnitFormV7,
  UnitRoleIdV7,
} from "./types";
import type { PlayerViewV7 } from "./view";

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md): the helpers the
 * reducer, the queries, and the stats share. Every helper returns the
 * neutral answer for a unit of any other faction.
 */

/** Whether any seat of the match is a Dwarf seat (the setup decides). */
export function matchHasDwarvesV7(state: {
  readonly setup: { readonly factions: readonly FactionIdV7[] };
}): boolean {
  return state.setup.factions.includes("DWARF");
}

/** The unit facts the Dwarf helpers read. */
export interface DwarfUnitFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly activation: { readonly moved: boolean };
}

/**
 * The unit-level technology of `unit` (canonical state only): its
 * controller's research through its kind's tree (the Mind Control
 * revision section 5.2).
 */
function unitOwnerCapabilitiesV7(
  state: Pick<GameStateV7, "players" | "mindControlled">,
  unit: { readonly id: UnitId; readonly ownerId: PlayerId },
): ReturnType<typeof unitCapabilitiesV7> {
  // Map curiosities (section 10.5): the neutral owner has no technology.
  return unitCapabilitiesV7(
    state,
    unit,
    ownerResearchedTechsV7(state, unit.ownerId),
  );
}

/**
 * Section 8 Dig In on canonical state: a land-form unit whose role digs in
 * (Hammerer, Steam Mole), whose controller's research grants Dig In
 * through its kind's tree, that has not moved (its activation's `moved`),
 * standing on or next to (`DIG_IN_RADIUS_V7`) the center of a city its
 * owner (its controller) owns, whatever the tile's territory.
 */
export function unitIsDugInV7(
  state: Pick<GameStateV7, "players" | "cities" | "mindControlled">,
  unit: DwarfUnitFactsV7,
): boolean {
  if (
    unit.form !== "LAND" ||
    unit.activation.moved ||
    !unitRoleMechanicsV7(state, unit).digsIn ||
    !unitOwnerCapabilitiesV7(state, unit).digIn
  )
    return false;
  return state.cities.some(
    (city) =>
      city.ownerId === unit.ownerId &&
      chebyshev(city.at, unit.at) <= DIG_IN_RADIUS_V7,
  );
}

/**
 * Section 8 Dig In from a public view: the canonical answer, which the
 * view's unit stats carry for every visible unit (`dwarf.dugIn`), because
 * the owner's technologies are private.
 */
export function publicUnitIsDugInV7(
  view: Pick<PlayerViewV7, "unitStats">,
  unitId: UnitId,
): boolean {
  return (
    view.unitStats.find((stats) => stats.unitId === unitId)?.dwarf?.dugIn ===
    true
  );
}

/** Section 2.3: a machine for Repair (every Dwarf land role but two). */
export function unitIsMachineV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): boolean {
  return unitRoleMechanicsV7(roster, unit).repairsAsMachine;
}

/**
 * Section 7.1: whether an `ATTACK` by this unit is Unflinching (a land-form
 * construct): its force uses its maximum HP.
 */
export function attackIsUnflinchingV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).unflinchingAttack
  );
}

/**
 * Section 6.1: whether the unit strikes back when attacked: its role has
 * `ATTACK`, or `BOMB_RUN` (the Gyrocopter retaliates with its Attack).
 */
export function roleRetaliatesV7(rule: {
  readonly abilities: readonly string[];
}): boolean {
  return (
    rule.abilities.includes("ATTACK") || rule.abilities.includes("BOMB_RUN")
  );
}

/**
 * Section 7.3: the shots a unit may fire this turn: its role's unmoved
 * allowance when it has not moved (the Clockwork Gunner's 2), otherwise 1.
 * A Gunner that has fired cannot move, so its `moved` flag at its first shot
 * is the flag now.
 */
export function attackAllowanceV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
    readonly activation: { readonly moved: boolean };
  },
): number {
  return unit.form === "LAND" && !unit.activation.moved
    ? unitRoleMechanicsV7(roster, unit).unmovedShots
    : 1;
}

/**
 * Section 7.3: whether the unit may still fire a second shot this turn (an
 * unmoved Gunner after its first shot): it fired, it has shots left, and it
 * used no other primary action.
 */
export function twinShotReadyV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
    readonly activation: {
      readonly moved: boolean;
      readonly attacked: boolean;
      readonly attacksUsed: number;
      readonly recovered: boolean;
      readonly captured: boolean;
      readonly specialActed: boolean;
    };
  },
): boolean {
  return (
    unit.activation.attacked &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed &&
    unit.activation.attacksUsed >= 1 &&
    unit.activation.attacksUsed < attackAllowanceV7(roster, unit)
  );
}

/**
 * Section 10.1: the tile a Steam Cannon's Knockback pushes a target to:
 * one tile directly away from the attacker.
 */
export function knockbackDestinationV7(
  attacker: CoordV7,
  target: CoordV7,
): CoordV7 {
  return {
    x: target.x + Math.sign(target.x - attacker.x),
    y: target.y + Math.sign(target.y - attacker.y),
  };
}

/** Section 10.1: whether an `ATTACK` by this unit knocks back. */
export function attackKnocksBackV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).knockback;
}

/**
 * Section 10.1 with Blasting Charges: whether an `ATTACK` by this unit
 * ignores the defender's fortification (a land-form Steam Cannon whose
 * owner has `cannonIgnoresFortification`). `ownerTechs` are the attacker
 * owner's technologies (the viewer's own in a public preview).
 */
export function cannonIgnoresFortificationV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  ownerTechs: readonly string[],
): boolean {
  return (
    attackKnocksBackV7(roster, unit) &&
    unitCapabilitiesV7(roster, unit, ownerTechs as readonly TechnologyIdV7[])
      .cannonIgnoresFortification
  );
}

/**
 * Section 5.5 and root ruling 1: the rider brake. A unit that surfaced this
 * turn as a rider (a role with `RIDES_TUNNEL` in `surfacedThisTurn`) never
 * ends a Move or advances on a settlement center its owner does not own.
 */
export function surfacedRiderV7(
  lookup: FactionRosterV7 & {
    readonly surfacedThisTurn?: readonly UnitId[];
  },
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): boolean {
  const surfaced = lookup.surfacedThisTurn;
  return (
    surfaced !== undefined &&
    surfaced.length > 0 &&
    surfaced.includes(unit.id) &&
    unitRoleMechanicsV7(lookup, unit).ridesTunnel
  );
}

/** Whether the unit's role has the given ability under its kind. */
export function unitHasAbilityV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
  ability: string,
): boolean {
  return (unitRoleRuleV7(roster, unit).abilities as readonly string[]).includes(
    ability,
  );
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
