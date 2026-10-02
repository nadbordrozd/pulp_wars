import type { PlayerId, UnitId } from "../model/ids";
import {
  FORCE_FIELD_SHIELD_V7,
  attackIsRayV7,
  technologyCapabilitiesV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type MartianUnitFactsV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import type {
  CoolingStatusV7,
  CoordV7,
  GameStateV7,
  MindControlCooldownV7,
  ShieldStatusV7,
  ThrallStatusV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "./types";

/**
 * The Martian revision (docs/product/RULESET_7_MARTIANS.md): Shields
 * (section 5), heat-ray Cooling (section 6.2), Thralls (section 8.3), and
 * the Mind Control cooldown (section 8.2). Each lives in a side list of the
 * canonical state sorted by unit ID, like `plagued`, `bitten`, and `eggs`,
 * and is empty in a match without a Martian seat. Every helper here reads
 * the canonical state and the public view alike.
 */

/** The facts a Shield lookup reads: the roster and the Thrall list. */
export interface ShieldLookupV7 extends FactionRosterV7 {
  readonly thralls: readonly { readonly unitId: UnitId }[];
}

/** Whether `unitId` is a Thrall (it has a `thralls` entry). */
export function isThrallV7(
  thralls: readonly { readonly unitId: UnitId }[],
  unitId: UnitId,
): boolean {
  return thralls.some((entry) => entry.unitId === unitId);
}

/**
 * Section 5.1: a unit's Shield maximum: its role's under its owner's
 * registration, and 0 for a Thrall whatever its role says. It is 0 for every
 * role of every non-Martian faction and for boats.
 */
export function unitShieldMaximumV7(
  lookup: ShieldLookupV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): number {
  const maximum = unitRoleMechanicsV7(lookup, unit).shield;
  return maximum === 0 || isThrallV7(lookup.thralls, unit.id) ? 0 : maximum;
}

/** A unit's current Shield (0 without an entry). */
export function shieldOfV7(
  shields: readonly ShieldStatusV7[],
  unitId: UnitId,
): number {
  if (shields.length === 0) return 0;
  return shields.find((entry) => entry.unitId === unitId)?.shield ?? 0;
}

/**
 * Section 5.3: one instance of `damage` taken from the Shield first. The
 * hit is capped at the Shield plus the HP.
 */
export function absorbHitV7(
  shield: number,
  hp: number,
  damage: number,
): { readonly shieldDamage: number; readonly hpDamage: number } {
  const shieldDamage = Math.min(shield, damage);
  return { shieldDamage, hpDamage: Math.min(hp, damage - shieldDamage) };
}

/**
 * The Shield list after setting the Shield of each listed unit (0 removes
 * the entry), sorted by unit ID. Returns `shields` itself when nothing
 * changes, so a match without a Martian seat keeps its one empty list.
 */
export function withShieldsV7(
  shields: readonly ShieldStatusV7[],
  updates: ReadonlyMap<UnitId, number>,
): readonly ShieldStatusV7[] {
  if (updates.size === 0) return shields;
  const next = new Map(
    shields.map((entry) => [entry.unitId, entry.shield] as const),
  );
  let changed = false;
  for (const [unitId, shield] of updates) {
    const before = next.get(unitId) ?? 0;
    if (before === shield) continue;
    changed = true;
    if (shield <= 0) next.delete(unitId);
    else next.set(unitId, shield);
  }
  if (!changed) return shields;
  return [...next]
    .map(([unitId, shield]) => ({ unitId, shield }))
    .sort((left, right) => left.unitId - right.unitId);
}

/** The Shield list after `damage` map entries are subtracted. */
export function withShieldDamageV7(
  shields: readonly ShieldStatusV7[],
  damage: ReadonlyMap<UnitId, number>,
): readonly ShieldStatusV7[] {
  if (shields.length === 0 || damage.size === 0) return shields;
  const updates = new Map<UnitId, number>();
  for (const [unitId, amount] of damage)
    if (amount > 0)
      updates.set(unitId, Math.max(0, shieldOfV7(shields, unitId) - amount));
  return withShieldsV7(shields, updates);
}

/**
 * Section 5.1: newly created units (trained, reward, treasure, Showcase,
 * starting units) start with their Shield maximum.
 */
export function withFullShieldsV7(
  lookup: ShieldLookupV7,
  shields: readonly ShieldStatusV7[],
  created: readonly {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  }[],
): readonly ShieldStatusV7[] {
  const updates = new Map<UnitId, number>();
  for (const unit of created) {
    const maximum = unitShieldMaximumV7(lookup, unit);
    if (maximum > 0) updates.set(unit.id, maximum);
  }
  return withShieldsV7(shields, updates);
}

/** The unit facts the Force Field test reads. */
interface ForceFieldUnitV7 extends MartianUnitFactsV7 {
  readonly id: UnitId;
  readonly at: CoordV7;
  readonly hp: number;
}

/**
 * Section 5.4: whether `unit` is covered: one of its owner's Shield
 * Projectors in land form, other than itself, stands on one of the eight
 * tiles around it. Not cumulative; read at a recharge only.
 */
export function isCoveredByForceFieldV7(
  roster: FactionRosterV7,
  units: readonly ForceFieldUnitV7[],
  unit: ForceFieldUnitV7,
): boolean {
  return units.some(
    (projector) =>
      projector.id !== unit.id &&
      projector.hp > 0 &&
      projector.ownerId === unit.ownerId &&
      projector.form === "LAND" &&
      chebyshev(projector.at, unit.at) === 1 &&
      unitRoleRuleV7(roster, projector).abilities.includes("FORCE_FIELD"),
  );
}

/** The Shield a recharge sets for `unit` now (0 for an unshielded unit). */
export function rechargedShieldV7(
  lookup: ShieldLookupV7,
  units: readonly ForceFieldUnitV7[],
  unit: ForceFieldUnitV7,
): number {
  const maximum = unitShieldMaximumV7(lookup, unit);
  if (maximum === 0) return 0;
  return isCoveredByForceFieldV7(lookup, units, unit)
    ? Math.max(maximum, FORCE_FIELD_SHIELD_V7)
    : maximum;
}

/**
 * Section 5.2: the Shield recharge of `playerId`: every shielded unit of
 * that player on the board, in land or embarked form, has its Shield SET to
 * its maximum, or to `max(maximum, FORCE_FIELD_SHIELD_V7)` when covered.
 * One `SHIELDS_RECHARGED` lists the units whose Shield changed, in unit-ID
 * order; none when nothing changed. HP is untouched.
 */
export function rechargeShieldsV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const updates = new Map<UnitId, number>();
  const results: { unitId: UnitId; shield: number }[] = [];
  for (const unit of [...state.units].sort((a, b) => a.id - b.id)) {
    if (unit.ownerId !== playerId || unit.hp <= 0) continue;
    const target = rechargedShieldV7(state, state.units, unit);
    if (target === 0 || target === shieldOfV7(state.shields, unit.id)) continue;
    updates.set(unit.id, target);
    results.push({ unitId: unit.id, shield: target });
  }
  if (results.length === 0) return { state, events: [] };
  return {
    state: { ...state, shields: withShieldsV7(state.shields, updates) },
    events: [{ kind: "SHIELDS_RECHARGED", playerId, results }],
  };
}

/**
 * Section 5.5 Force Fields: the recharge at the owner's End Turn, only
 * while the owner's technology grants `shieldsRechargeAtEndTurn`.
 */
export function rechargeShieldsAtEndTurnV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (
    player === undefined ||
    !technologyCapabilitiesV7(player.researchedTechs, player.faction)
      .shieldsRechargeAtEndTurn
  )
    return { state, events: [] };
  return rechargeShieldsV7(state, playerId);
}

/** Section 6.2: a unit is Cooling while its entry has `firedThisTurn` false. */
export function isCoolingV7(
  cooling: readonly CoolingStatusV7[],
  unitId: UnitId,
): boolean {
  if (cooling.length === 0) return false;
  return cooling.some(
    (entry) => entry.unitId === unitId && !entry.firedThisTurn,
  );
}

/** The power of a ray: `NONE` for an attack that is not a ray. */
export type RayPowerV7 = "FULL" | "HALF" | "NONE";

/**
 * Section 6.1: the power an `ATTACK` by `unit` has: `NONE` unless it is a
 * ray; `FULL` when the unit has not moved this turn and is not Cooling;
 * otherwise `HALF`.
 */
export function rayPowerV7(
  roster: FactionRosterV7,
  cooling: readonly CoolingStatusV7[],
  unit: MartianUnitFactsV7 & { readonly id: UnitId },
  moved: boolean,
): RayPowerV7 {
  if (!attackIsRayV7(roster, unit)) return "NONE";
  return moved || isCoolingV7(cooling, unit.id) ? "HALF" : "FULL";
}

/** Records a full-power ray: `{ unitId, firedThisTurn: true }`. */
export function withFiredRayV7(
  cooling: readonly CoolingStatusV7[],
  unitId: UnitId,
): readonly CoolingStatusV7[] {
  return [
    ...cooling.filter((entry) => entry.unitId !== unitId),
    { unitId, firedThisTurn: true },
  ].sort((left, right) => left.unitId - right.unitId);
}

/**
 * Section 6.2: the Cooling step at `playerId`'s End Turn: every entry of
 * that player's units with `firedThisTurn` false is removed, then every
 * remaining entry of that player gets `firedThisTurn: false`.
 */
export function coolingStepV7(
  state: GameStateV7,
  playerId: PlayerId,
): GameStateV7 {
  if (state.cooling.length === 0) return state;
  const own = new Set(
    state.units
      .filter((unit) => unit.ownerId === playerId)
      .map((unit) => unit.id),
  );
  const cooling = state.cooling.flatMap((entry): CoolingStatusV7[] =>
    !own.has(entry.unitId)
      ? [entry]
      : entry.firedThisTurn
        ? [{ unitId: entry.unitId, firedThisTurn: false }]
        : [],
  );
  return { ...state, cooling };
}

/**
 * Section 8.2: the Mind Control cooldown step at `playerId`'s Start Turn:
 * each of that player's entries with `turnsRemaining` 0 is removed and every
 * other one loses 1.
 */
export function mindControlCooldownStepV7(
  state: GameStateV7,
  playerId: PlayerId,
): GameStateV7 {
  if (state.mindControlCooldowns.length === 0) return state;
  const own = new Set(
    state.units
      .filter((unit) => unit.ownerId === playerId)
      .map((unit) => unit.id),
  );
  const mindControlCooldowns = state.mindControlCooldowns.flatMap(
    (entry): MindControlCooldownV7[] =>
      !own.has(entry.unitId)
        ? [entry]
        : entry.turnsRemaining <= 0
          ? []
          : [
              {
                unitId: entry.unitId,
                turnsRemaining: entry.turnsRemaining - 1,
              },
            ],
  );
  return { ...state, mindControlCooldowns };
}

/** The Thralls a Brain controls, in unit-ID order. */
export function thrallsOfBrainV7(
  thralls: readonly ThrallStatusV7[],
  brainUnitId: UnitId,
): readonly UnitId[] {
  return thralls
    .filter((entry) => entry.brainUnitId === brainUnitId)
    .map((entry) => entry.unitId);
}

/**
 * Section 8.3 collapse: every Thrall among `units` whose Brain is no longer
 * a living unit among `units` is removed at once, in unit-ID order, each
 * with `UNIT_DIED { cause: "BRAIN_LOST" }`. These are removals: no kill
 * credit, no Plunder, no Grave, no rising, no growth. Returns the units and
 * the Thrall list after the collapse, and the removed units.
 */
export function collapseThrallsV7<
  U extends { readonly id: UnitId; readonly hp: number },
>(
  units: readonly U[],
  thralls: readonly ThrallStatusV7[],
  events: DomainEventV7[],
): {
  readonly units: readonly U[];
  readonly thralls: readonly ThrallStatusV7[];
  readonly collapsed: readonly U[];
} {
  if (thralls.length === 0) return { units, thralls, collapsed: [] };
  const alive = new Set(
    units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
  );
  const lost = thralls.filter(
    (entry) => alive.has(entry.unitId) && !alive.has(entry.brainUnitId),
  );
  if (lost.length === 0) return { units, thralls, collapsed: [] };
  const lostIds = new Set(lost.map((entry) => entry.unitId));
  const collapsed = units
    .filter((unit) => lostIds.has(unit.id))
    .sort((left, right) => left.id - right.id);
  for (const unit of collapsed)
    events.push({ kind: "UNIT_DIED", unitId: unit.id, cause: "BRAIN_LOST" });
  return {
    units: units.filter((unit) => !lostIds.has(unit.id)),
    thralls: thralls.filter((entry) => !lostIds.has(entry.unitId)),
    collapsed,
  };
}

/**
 * Drops Martian side-list entries of units that left the board (Shields,
 * Cooling, Mind Control cooldowns, and the entries of Thralls that are
 * gone). A Thrall whose Brain left the board is NOT pruned here: its
 * collapse is an event (`collapseThrallsV7`), and state parsing rejects a
 * Thrall without its Brain. Every reducer output runs through this before
 * validation.
 */
export function prunedMartianV7(state: GameStateV7): GameStateV7 {
  if (
    state.shields.length === 0 &&
    state.cooling.length === 0 &&
    state.thralls.length === 0 &&
    state.mindControlCooldowns.length === 0
  )
    return state;
  const alive = new Set(
    state.units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
  );
  const keep = <T extends { readonly unitId: UnitId }>(
    entries: readonly T[],
  ): readonly T[] => {
    const kept = entries.filter((entry) => alive.has(entry.unitId));
    return kept.length === entries.length ? entries : kept;
  };
  const shields = keep(state.shields);
  const cooling = keep(state.cooling);
  const thralls = keep(state.thralls);
  const mindControlCooldowns = keep(state.mindControlCooldowns);
  return shields === state.shields &&
    cooling === state.cooling &&
    thralls === state.thralls &&
    mindControlCooldowns === state.mindControlCooldowns
    ? state
    : { ...state, shields, cooling, thralls, mindControlCooldowns };
}

/**
 * Section 6.4 Pierce: the tile directly behind `target` seen from
 * `attacker`, when the target stands in one of the eight directions (the
 * offset's `|dx|` and `|dy|` are each 0 or equal to the distance); null for
 * any other offset (a knight's move), which has no tile behind it.
 */
export function pierceTileV7(
  attacker: CoordV7,
  target: CoordV7,
): CoordV7 | null {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (
    distance === 0 ||
    (Math.abs(dx) !== 0 && Math.abs(dx) !== distance) ||
    (Math.abs(dy) !== 0 && Math.abs(dy) !== distance)
  )
    return null;
  return { x: target.x + Math.sign(dx), y: target.y + Math.sign(dy) };
}

/**
 * Section 8.4: the tile a Tractor Beam pulls `target` to: one step from the
 * target toward the Mothership (`sign` of the offset on each axis).
 */
export function tractorBeamDestinationV7(
  mothership: CoordV7,
  target: CoordV7,
): CoordV7 {
  return {
    x: target.x + Math.sign(mothership.x - target.x),
    y: target.y + Math.sign(mothership.y - target.y),
  };
}

/** The exhausted activation of a Thrall, a beamed unit, or a rising. */
export function exhaustedMartianActivationV7(): UnitStateV7["activation"] {
  return {
    moved: true,
    movedPathLength: 0,
    attacked: true,
    attacksUsed: 1,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
    escapeAvailable: false,
    recovered: true,
    captured: true,
    handled: true,
    specialActed: true,
  };
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
