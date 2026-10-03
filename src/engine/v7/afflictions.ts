import type { PlayerId, UnitId } from "../model/ids";
import {
  playerFactionV7,
  seatRoleRuleV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  type EffectiveRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import type {
  CombatPreviewV7,
  CombatSplashEntryV7,
  DomainEventV7,
} from "./events";
import {
  isNeutralOwnerV7,
  type BittenStatusV7,
  type GameStateV7,
  type PlagueStatusV7,
  type UnitStateV7,
} from "./types";
import { allOwnedUnitsV7 } from "./units";

/**
 * Revision 14 afflictions: Plague (applied by a Lich attack, spreading at
 * Start Turn) and Bitten (applied by Zombie damage). Both live in canonical
 * state as `plagued` and `bitten` lists sorted by unit ID.
 */

/** Revision 14 section 3.3: Plague deals 2 damage at its owner's Start Turn. */
export const PLAGUE_DAMAGE_V7 = 2;

/**
 * Revision 15: Plague resolves on at most three of the plagued unit's owner's
 * Start Turns (at most 6 damage) and then expires; the unit spreads it only
 * on the first of them.
 */
export const PLAGUE_DURATION_TURNS_V7 = 3;

/** Revision 14 section 4.3: a bitten victim rises as a 10-HP Zombie. */
export const BITTEN_RISING_HP_V7 = 10;

/**
 * "Living" in the revision-13 sense: the seat's faction is not UNDEAD. A
 * seat-level read (what the seat's own trained units are); a concrete unit
 * reads {@link isLivingUnitV7}, which follows the unit's kind.
 */
export function isLivingOwnerV7(
  roster: Pick<FactionRosterV7, "players">,
  ownerId: PlayerId,
): boolean {
  return playerFactionV7(roster, ownerId) !== "UNDEAD";
}

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 2.3): the
 * per-unit "living" test. A unit is living when its kind is not UNDEAD
 * (the Mind Control revision: a controlled Zombie stays undead) and its role
 * is not a construct under its kind (the Clockwork Gunner, the Brass
 * Titan). Plague, Bitten, the Wail, and their previews read this test; with
 * no Dwarf seat and no controlled unit it returns exactly what
 * {@link isLivingOwnerV7} returns.
 */
export function isLivingUnitV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitStateV7["role"];
  },
): boolean {
  return (
    unitFactionV7(roster, unit) !== "UNDEAD" &&
    !unitRoleMechanicsV7(roster, unit).construct
  );
}

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 8.6):
 * whether a status (Plague, Bitten, Infect, Chill, Mind Control) can stick
 * to the unit. Only a neutral unit (the Giant Spider) is immune; it is read
 * from the neutral owner, not from the role.
 */
export function unitTakesStatusV7(unit: {
  readonly ownerId: PlayerId;
}): boolean {
  return !isNeutralOwnerV7(unit.ownerId);
}

/** The Dwarf revision (section 7): whether the unit's role is a construct. */
export function unitIsConstructV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitStateV7["role"];
  },
): boolean {
  return unitRoleMechanicsV7(roster, unit).construct;
}

/** The combatant facts the revision-14 combat afflictions read. */
export interface AfflictionCombatantV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitStateV7["role"];
  readonly form: UnitStateV7["form"];
}

/**
 * Revision 14 combat afflictions, shared by canonical resolution and the
 * public preview (sections 3.1, 4.1, and 4.2). `plaguedUnitIds` and
 * `bittenUnitIds` are the afflictions already in force (canonical state, or
 * the public view, which lists them for every visible unit).
 */
export function afflictionCombatEffectsV7(input: {
  readonly roster: FactionRosterV7;
  readonly attacker: AfflictionCombatantV7;
  readonly defender: AfflictionCombatantV7;
  readonly attackerRule: EffectiveRoleRuleV7;
  readonly defenderRule: EffectiveRoleRuleV7;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  /**
   * The Martian revision section 5.3: what the defender's Shield absorbed.
   * A hit that a Shield absorbed completely plagues nobody.
   */
  readonly defenderShieldDamage?: number;
  readonly attackerDies: boolean;
  readonly defenderDies: boolean;
  /**
   * The Rift (RULESET_7_RIFT.md section 4): whether the attacker or the
   * defender stands on a Rift, where nothing rises.
   */
  readonly attackerOnRift: boolean;
  readonly defenderOnRift: boolean;
  readonly splash: readonly CombatSplashEntryV7[];
  /**
   * The owner and role of a splash victim (the Dwarf revision: the living
   * test is per unit).
   */
  readonly splashUnit: (unitId: UnitId) =>
    | {
        readonly id: UnitId;
        readonly ownerId: PlayerId;
        readonly role: UnitStateV7["role"];
      }
    | undefined;
  readonly plaguedUnitIds: ReadonlySet<UnitId>;
  readonly bittenUnitIds: ReadonlySet<UnitId>;
  /**
   * Revision 19: the Eggs among the splash victims. An Egg takes no status:
   * it is never plagued (and never Bitten, which needs land form).
   */
  readonly eggUnitIds?: ReadonlySet<UnitId>;
}): Pick<
  CombatPreviewV7,
  | "plagued"
  | "attackerBitten"
  | "defenderBitten"
  | "attackerBittenRises"
  | "defenderBittenRises"
> {
  // The Dwarf revision section 2.3: the per-unit living test (a construct
  // is never plagued or bitten).
  const living = (
    unit:
      | {
          readonly id: UnitId;
          readonly ownerId: PlayerId;
          readonly role: UnitStateV7["role"];
        }
      | undefined,
  ): boolean =>
    unit !== undefined &&
    unitTakesStatusV7(unit) &&
    isLivingUnitV7(input.roster, unit);
  const plagued: UnitId[] = [];
  if (input.attackerRule.abilities.includes("PLAGUE") && !input.attackerDies) {
    // The Martian revision section 5.3: a Lich plagues only targets that
    // lost HP, so a hit a Shield absorbed completely plagues nobody (an
    // unshielded target of a 0-damage hit is plagued as before).
    if (
      !input.defenderDies &&
      input.defender.form !== "EGG" &&
      !(
        (input.defenderShieldDamage ?? 0) > 0 && input.damageToDefender === 0
      ) &&
      living(input.defender) &&
      !input.plaguedUnitIds.has(input.defender.id)
    )
      plagued.push(input.defender.id);
    for (const entry of input.splash)
      if (
        !entry.dies &&
        !(entry.shieldDamage > 0 && entry.damage === 0) &&
        input.eggUnitIds?.has(entry.unitId) !== true &&
        living(input.splashUnit(entry.unitId)) &&
        !input.plaguedUnitIds.has(entry.unitId)
      )
        plagued.push(entry.unitId);
  }
  return {
    plagued,
    defenderBitten:
      input.attackerRule.abilities.includes("BITE") &&
      input.damageToDefender > 0 &&
      !input.defenderDies &&
      input.defender.form === "LAND" &&
      living(input.defender),
    attackerBitten:
      input.defenderRule.abilities.includes("BITE") &&
      input.damageToAttacker > 0 &&
      !input.attackerDies &&
      input.attacker.form === "LAND" &&
      living(input.attacker),
    // Infect (a Zombie killer) takes precedence over an earlier bite.
    defenderBittenRises:
      input.defenderDies &&
      input.defender.form === "LAND" &&
      !input.defenderOnRift &&
      input.bittenUnitIds.has(input.defender.id) &&
      !input.attackerRule.abilities.includes("INFECT"),
    attackerBittenRises:
      input.attackerDies &&
      input.attacker.form === "LAND" &&
      !input.attackerOnRift &&
      input.bittenUnitIds.has(input.attacker.id) &&
      !input.defenderRule.abilities.includes("INFECT"),
  };
}

/**
 * Adds fresh plague entries (revision 15: the full three turns remaining); a
 * unit already plagued keeps its source and its remaining turns (no stacking,
 * no reset).
 */
export function withPlaguedV7(
  plagued: readonly PlagueStatusV7[],
  added: readonly Pick<PlagueStatusV7, "unitId" | "sourceUnitId">[],
): readonly PlagueStatusV7[] {
  if (added.length === 0) return plagued;
  const byId = new Map(plagued.map((entry) => [entry.unitId, entry] as const));
  for (const entry of added)
    if (!byId.has(entry.unitId))
      byId.set(entry.unitId, {
        unitId: entry.unitId,
        sourceUnitId: entry.sourceUnitId,
        turnsRemaining: PLAGUE_DURATION_TURNS_V7,
      });
  return [...byId.values()].sort((left, right) => left.unitId - right.unitId);
}

/** Records or replaces a bite; the last biter wins. */
export function withBittenV7(
  bitten: readonly BittenStatusV7[],
  entry: BittenStatusV7,
): readonly BittenStatusV7[] {
  return [
    ...bitten.filter((item) => item.unitId !== entry.unitId),
    {
      unitId: entry.unitId,
      biterPlayerId: entry.biterPlayerId,
      biterUnitId: entry.biterUnitId,
    },
  ].sort((left, right) => left.unitId - right.unitId);
}

/**
 * Drops afflictions that no longer apply (sections 3.5 and 4.4): entries of
 * units that left the board, Plague whose source Lich left the board, and
 * bites whose biter player is no longer active. Every reducer output runs
 * through this before validation, so no code path can leave a stale entry.
 */
export function prunedAfflictionsV7(state: GameStateV7): GameStateV7 {
  if (state.plagued.length === 0 && state.bitten.length === 0) return state;
  // The Dwarf revision section 5.2: a burrowed unit keeps its entries.
  const alive = new Set(
    allOwnedUnitsV7(state)
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.id),
  );
  const active = new Set(
    state.players
      .filter((player) => player.status === "ACTIVE")
      .map((player) => player.id),
  );
  const plagued = state.plagued.filter(
    (entry) => alive.has(entry.unitId) && alive.has(entry.sourceUnitId),
  );
  const bitten = state.bitten.filter(
    (entry) => alive.has(entry.unitId) && active.has(entry.biterPlayerId),
  );
  return plagued.length === state.plagued.length &&
    bitten.length === state.bitten.length
    ? state
    : { ...state, plagued, bitten };
}

/**
 * `PLAGUE_CLEARED` for every unit whose Plague ended between `before` and
 * `after` because its source Lich left the board while the unit survived.
 */
export function plagueClearedEventsV7(
  before: GameStateV7,
  after: GameStateV7,
): DomainEventV7[] {
  if (before.plagued.length === 0) return [];
  const alive = new Set(
    allOwnedUnitsV7(after)
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.id),
  );
  const still = new Set(after.plagued.map((entry) => entry.unitId));
  const unitIds = before.plagued
    .filter(
      (entry) =>
        alive.has(entry.unitId) &&
        !still.has(entry.unitId) &&
        !alive.has(entry.sourceUnitId),
    )
    .map((entry) => entry.unitId);
  return unitIds.length === 0 ? [] : [{ kind: "PLAGUE_CLEARED", unitIds }];
}

/** The bite recorded for a unit, if any. */
export function biteOfV7(
  state: Pick<GameStateV7, "bitten">,
  unitId: UnitId,
): BittenStatusV7 | undefined {
  return state.bitten.find((entry) => entry.unitId === unitId);
}

/**
 * Records one death converted by Bitten (section 4.3): appends the victim's
 * `UNIT_DIED` and then `BITTEN_UNIT_RISEN`, and returns the Zombie rising on
 * the victim's tile. The rising follows the revision-13 rising rules: it is
 * owned by the biter's owner, homed to the biting Zombie's home city when
 * that Zombie is still on the board in `lookup` (otherwise orphaned), may
 * exceed capacity, has no kills, is not veteran, is not capture-eligible,
 * and carries the caller's exhausted activation. No Grave is created.
 */
export function recordBittenRisingV7(
  lookup: Pick<GameStateV7, "players" | "units">,
  bite: BittenStatusV7,
  victim: Pick<UnitStateV7, "id" | "at">,
  cause: Extract<DomainEventV7, { kind: "UNIT_DIED" }>["cause"],
  risingId: UnitId,
  activation: UnitStateV7["activation"],
  events: DomainEventV7[],
): UnitStateV7 {
  // The rising is the biter seat's own `GUARD` (a role-level read).
  const rule = seatRoleRuleV7(lookup, bite.biterPlayerId, "GUARD");
  const biter = lookup.units.find(
    (unit) =>
      unit.id === bite.biterUnitId &&
      unit.hp > 0 &&
      unit.ownerId === bite.biterPlayerId,
  );
  const rising: UnitStateV7 = {
    id: risingId,
    ownerId: bite.biterPlayerId,
    homeCityId: biter?.homeCityId ?? null,
    role: "GUARD",
    form: "LAND",
    at: { x: victim.at.x, y: victim.at.y },
    hp: Math.min(BITTEN_RISING_HP_V7, rule.maxHp),
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation,
  };
  events.push(
    { kind: "UNIT_DIED", unitId: victim.id, cause },
    {
      kind: "BITTEN_UNIT_RISEN",
      playerId: rising.ownerId,
      victimUnitId: victim.id,
      unitId: rising.id,
      at: rising.at,
      homeCityId: rising.homeCityId,
    },
  );
  return rising;
}
