import type { PlayerId, UnitId } from "../model/ids";
import {
  canEnterTerrainV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { unitTakesStatusV7 } from "./afflictions";
import type { TerrainIdV7, UnitFormV7, UnitRoleIdV7 } from "./types";

/**
 * The Vampire and Banshee rework (`pulp_wars-ty6i`,
 * docs/product/RULESET_7_CURRENT.md section 17.12): the helpers the
 * reducer, the movement validation, the public queries, and the stats
 * share.
 *
 * - **Feast** (the Vampire, ability `FEAST`): when its `ATTACK` kills and
 *   it survives (and Frostbite does not freeze it), it heals to its
 *   maximum HP and, after its first attack of the turn, may attack once
 *   more (`feastedThisTurn`; at most two attacks a turn).
 * - **Bat Escape** (the Vampire, role mechanic `batEscapeTiles`): its
 *   Escape Move flies for at most that many tiles (over every unit, through
 *   hostile zones of control, never stopped by terrain) and ends on a free
 *   explored land tile it may stand on that holds no curiosity.
 * - **Terror** (the Banshee, ability `TERROR`): every unit its Wail damages
 *   (HP damage above 0) and does not kill cannot strike back until the end
 *   of the active seat's turn (`terrorThisTurn`).
 * - **Ethereal** (the Banshee, ability `ETHEREAL`): the role mechanic
 *   `ignoresZocStops` (the Prowl rule).
 *
 * Every helper returns the neutral answer when its list is empty (always
 * so in a match without an Undead seat), and every rule resolves through
 * the unit's kind, so a mind-controlled Vampire or Banshee keeps it.
 */

/** Anything that carries the two lists (a state or a view). */
export interface VampireBansheeLookupV7 {
  readonly terrorThisTurn?: readonly UnitId[];
  readonly feastedThisTurn?: readonly UnitId[];
}

interface RosterUnitV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/** Terror: whether the unit was terrified by a Wail this turn. */
export function unitIsTerrifiedV7(
  lookup: VampireBansheeLookupV7,
  unitId: UnitId,
): boolean {
  const list = lookup.terrorThisTurn;
  return list !== undefined && list.length > 0 && list.includes(unitId);
}

/** Terror: whether a Wail by this unit terrifies (its role has `TERROR`). */
export function wailTerrifiesV7(
  roster: FactionRosterV7,
  banshee: RosterUnitV7,
): boolean {
  return (
    banshee.form === "LAND" &&
    unitRoleRuleV7(roster, banshee).abilities.includes("TERROR")
  );
}

/**
 * Terror: the IDs of the Wail targets the Wail terrifies, in the targets'
 * order: HP damage above 0, a survivor, and not neutral (no status sticks
 * to a neutral unit). Empty for a Banshee without `TERROR`.
 */
export function wailTerrifiedIdsV7(
  roster: FactionRosterV7,
  banshee: RosterUnitV7,
  targets: readonly {
    readonly unitId: UnitId;
    readonly damage: number;
    readonly dies: boolean;
  }[],
  ownerOf: (unitId: UnitId) => PlayerId | undefined,
): readonly UnitId[] {
  if (!wailTerrifiesV7(roster, banshee)) return [];
  return targets
    .filter((target) => {
      const ownerId = ownerOf(target.unitId);
      return (
        target.damage > 0 &&
        !target.dies &&
        ownerId !== undefined &&
        unitTakesStatusV7({ ownerId })
      );
    })
    .map((target) => target.unitId);
}

/** `list` with `ids` added, sorted and without duplicates. */
export function withUnitIdsSortedV7(
  list: readonly UnitId[],
  ids: readonly UnitId[],
): readonly UnitId[] {
  if (ids.every((id) => list.includes(id))) return list;
  return [...new Set([...list, ...ids])].sort((left, right) => left - right);
}

/** Feast: whether the unit's role (under its kind) has `FEAST`. */
export function unitFeastsV7(
  roster: FactionRosterV7,
  unit: RosterUnitV7,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("FEAST")
  );
}

/**
 * Feast: whether an `ATTACK` by `attacker` feasts: a land-form attacker
 * with `FEAST` that kills its target, survives, and is not frozen by
 * Frostbite.
 */
export function attackFeastsV7(
  roster: FactionRosterV7,
  attacker: RosterUnitV7,
  facts: {
    readonly defenderDies: boolean;
    readonly attackerDies: boolean;
    readonly frostbitten: boolean;
  },
): boolean {
  return (
    facts.defenderDies &&
    !facts.attackerDies &&
    !facts.frostbitten &&
    unitFeastsV7(roster, attacker)
  );
}

/**
 * Feast: the HP a feasting attacker heals: back to its maximum HP after
 * the exchange's damage (Lifesteal is then included).
 */
export function feastHealV7(
  attacker: { readonly hp: number; readonly maxHp: number },
  damageToAttacker: number,
): number {
  return Math.max(0, attacker.maxHp - (attacker.hp - damageToAttacker));
}

/**
 * Feast: whether the unit may make its Feast attack now: it feasted this
 * turn, has attacked exactly once, used no other primary action, and is
 * not handled (an Escape Move or a Wait ends the Feast).
 */
export function feastReadyV7(
  roster: FactionRosterV7 & VampireBansheeLookupV7,
  unit: RosterUnitV7 & {
    readonly activation: {
      readonly attacked: boolean;
      readonly attacksUsed: number;
      readonly recovered: boolean;
      readonly captured: boolean;
      readonly specialActed: boolean;
      readonly handled: boolean;
    };
  },
): boolean {
  const list = roster.feastedThisTurn;
  return (
    list !== undefined &&
    list.length > 0 &&
    list.includes(unit.id) &&
    unit.activation.attacked &&
    unit.activation.attacksUsed === 1 &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed &&
    !unit.activation.handled &&
    unitFeastsV7(roster, unit)
  );
}

/**
 * Bat Escape: the most tiles the unit's Move flies when it is an Escape
 * Move of a role with `batEscapeTiles` (land form only), or 0 for every
 * other Move.
 */
export function batEscapeTilesV7(
  roster: FactionRosterV7,
  unit: RosterUnitV7 & {
    readonly activation: { readonly escapeAvailable: boolean };
  },
): number {
  if (unit.form !== "LAND" || !unit.activation.escapeAvailable) return 0;
  return unitRoleMechanicsV7(roster, unit).batEscapeTiles;
}

/**
 * Bat Escape: whether the flight may end on a tile with these facts: an
 * explored land tile (ice included) the unit could enter on foot (a
 * Mountain needs its owner's Engineering; never water or a Rift), with no
 * curiosity. Units, mounds, and Barricades are refused by the ordinary
 * movement rules.
 */
export function batEscapeLandingAllowedV7(facts: {
  readonly explored: boolean;
  readonly terrain: TerrainIdV7;
  readonly ice: boolean;
  readonly engineering: boolean;
  readonly mountainBorn: boolean;
  readonly curiosity: boolean;
}): boolean {
  return (
    facts.explored &&
    !facts.curiosity &&
    canEnterTerrainV7({
      terrain: facts.terrain,
      movementMode: "GROUND",
      afloat: false,
      engineering: facts.engineering,
      navigation: false,
      mountainBorn: facts.mountainBorn,
      ice: facts.ice,
    })
  );
}
