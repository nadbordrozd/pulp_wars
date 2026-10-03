import type { PlayerId, UnitId } from "../model/ids";
import {
  FORCE_FIELD_SHIELD_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  attackIsRayV7,
  isMindControlledV7,
  technologyCapabilitiesV7,
  unitCapacitySlotsV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type MartianUnitFactsV7,
} from "../rules/ruleset-v7";
import { unitIsConstructV7 } from "./afflictions";
import type { DomainEventV7 } from "./events";
import type {
  BurrowedEntryV7,
  CoolingStatusV7,
  CoordV7,
  GameStateV7,
  MindControlCooldownV7,
  MindControlledStatusV7,
  ShieldStatusV7,
  TerrainIdV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "./types";
import { allOwnedUnitsV7 } from "./units";

/**
 * The Martian revision (docs/product/RULESET_7_MARTIANS.md): Shields
 * (section 5), heat-ray Cooling (section 6.2), the Mind Control cooldown
 * (section 8.2), and the mind-controlled units
 * (docs/product/RULESET_7_MIND_CONTROL.md). Each lives in a side list of the
 * canonical state sorted by unit ID, like `plagued`, `bitten`, and `eggs`,
 * and is empty in a match without a Martian seat. Every helper here reads
 * the canonical state and the public view alike.
 */

/**
 * The facts a Shield lookup reads: the roster (with the mind-controlled
 * list, through which a unit's kind resolves).
 */
export type ShieldLookupV7 = FactionRosterV7;

/**
 * Section 5.1: a unit's Shield maximum: its role's under its kind (the
 * Mind Control revision: a controlled Martian unit keeps its Shield). It is
 * 0 for every role of every non-Martian kind and for boats.
 */
export function unitShieldMaximumV7(
  lookup: ShieldLookupV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): number {
  return unitRoleMechanicsV7(lookup, unit).shield;
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

/**
 * The Mind Control revision (section 6): the units a Brain controls, in
 * unit-ID order. Reads the state's and the view's list alike.
 */
export function controlledByBrainV7(
  mindControlled: readonly {
    readonly unitId: UnitId;
    readonly brainUnitId: UnitId | null;
  }[],
  brainUnitId: UnitId,
): readonly UnitId[] {
  if (mindControlled.length === 0) return [];
  return mindControlled
    .filter((entry) => entry.brainUnitId === brainUnitId)
    .map((entry) => entry.unitId);
}

/** Why a living, visible, hostile unit is not a legal Mind Control target. */
export type MindControlTargetBlockV7 =
  "TARGET_IMMUNE" | "OUT_OF_RANGE" | "TARGET_HEALTHY";

/**
 * The Mind Control revision (section 3): the per-target Mind Control
 * conditions, shared by the reducer and the public command query so that
 * every offered target is accepted and every rejected one is not offered.
 * `roster` is the state or the viewer's view (its `mindControlled` list
 * resolves the target's kind and tells an already-controlled target).
 * `target` is a living unit the Brain's owner sees and is hostile to (each
 * caller checks that against its own data); `targetTile` is the tile it
 * stands on, undefined when unknown. Returns null when the target is legal,
 * otherwise the first failing condition in the reducer's rejection order:
 *
 * - `TARGET_IMMUNE` (row 9): not in land form, a `JUGGERNAUT`-role or
 *   two-slot unit under its kind, on a settlement site (or an unknown
 *   tile), on a Rift (RULESET_7_RIFT.md section 4), a construct (the Dwarf
 *   revision section 7.2), or already mind-controlled (by any Brain);
 * - `OUT_OF_RANGE` (row 10): more than `MIND_CONTROL_RANGE_V7` from the
 *   Brain;
 * - `TARGET_HEALTHY` (rows 11 and 12): more than `MIND_CONTROL_HP_V7` HP,
 *   or unwounded (`hp` equal to `maxHp`).
 */
export function mindControlTargetBlockV7(
  roster: FactionRosterV7,
  brain: { readonly at: CoordV7 },
  target: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitStateV7["form"];
    readonly at: CoordV7;
    readonly hp: number;
    readonly maxHp: number;
  },
  targetTile:
    | {
        readonly site: unknown;
        readonly terrain: TerrainIdV7 | null;
      }
    | undefined,
): MindControlTargetBlockV7 | null {
  if (
    target.form !== "LAND" ||
    target.role === "JUGGERNAUT" ||
    unitCapacitySlotsV7(roster, target) !== 1 ||
    targetTile === undefined ||
    targetTile.site !== null ||
    targetTile.terrain === "RIFT" ||
    unitIsConstructV7(roster, target) ||
    isMindControlledV7(roster, target.id)
  )
    return "TARGET_IMMUNE";
  if (
    Math.max(
      Math.abs(brain.at.x - target.at.x),
      Math.abs(brain.at.y - target.at.y),
    ) > MIND_CONTROL_RANGE_V7
  )
    return "OUT_OF_RANGE";
  if (target.hp > MIND_CONTROL_HP_V7 || target.hp >= target.maxHp)
    return "TARGET_HEALTHY";
  return null;
}

/**
 * The Mind Control revision (section 3 row 1 and section 5.1 ruling 3):
 * whether a unit may use an ability whose result is a new unit (or a
 * controlled unit): Raise Dead, Infect, Bite, Hatch, Assemble, Mind
 * Control, and tunnel riding are unavailable to a mind-controlled unit.
 */
export function mayCreateUnitsV7(
  roster: Pick<FactionRosterV7, "mindControlled">,
  unitId: UnitId,
): boolean {
  return !isMindControlledV7(roster, unitId);
}

/** The players a release reads: who is still in the game. */
export interface ReleasePlayerV7 {
  readonly id: PlayerId;
  readonly status: "ACTIVE" | "ELIMINATED";
}

/**
 * The Mind Control revision (section 4.2) release: every controlled unit
 * (on the board or burrowed) whose Brain is no longer a living unit on the
 * board, or whose Brain changed owner, is released at once, in unit-ID
 * order. To an original owner still in the game: `ownerId` becomes
 * `originalOwnerId`, `homeCityId` stays null, `captureEligible` false, the
 * exhausted activation; it keeps HP, kills, statuses, form, and tile; event
 * `UNIT_RELEASED`. To an eliminated original owner: it is removed with
 * `UNIT_DIED { cause: "BRAIN_LOST" }` (a removal: no kill credit, Plunder,
 * Grave, rising, or growth). An entry whose unit is gone or was already
 * released earlier in the same command is skipped; `prunedMartianV7` drops
 * such entries. Returns the units, the burrowed list, the list after the
 * release, and the released and removed units.
 */
export function releaseControlledV7<U extends UnitStateV7>(
  units: readonly U[],
  burrowed: readonly BurrowedEntryV7[],
  mindControlled: readonly MindControlledStatusV7[],
  players: readonly ReleasePlayerV7[],
  events: DomainEventV7[],
): {
  readonly units: readonly U[];
  readonly burrowed: readonly BurrowedEntryV7[];
  readonly mindControlled: readonly MindControlledStatusV7[];
  readonly released: readonly UnitStateV7[];
  readonly removed: readonly UnitStateV7[];
} {
  const unchanged = {
    units,
    burrowed,
    mindControlled,
    released: [],
    removed: [],
  };
  if (mindControlled.length === 0) return unchanged;
  const board = new Map(
    units.filter((unit) => unit.hp > 0).map((unit) => [unit.id, unit]),
  );
  const underground = new Map(
    burrowed
      .filter((entry) => entry.unit.hp > 0)
      .map((entry) => [entry.unit.id, entry.unit]),
  );
  const releasedById = new Map<UnitId, UnitStateV7>();
  const removedIds = new Set<UnitId>();
  const removed: UnitStateV7[] = [];
  const ended = new Set<UnitId>();
  for (const entry of [...mindControlled].sort(
    (left, right) => left.unitId - right.unitId,
  )) {
    const unit = board.get(entry.unitId) ?? underground.get(entry.unitId);
    if (unit === undefined || unit.ownerId === entry.originalOwnerId) continue;
    const brain = board.get(entry.brainUnitId);
    if (brain !== undefined && brain.ownerId === unit.ownerId) continue;
    ended.add(entry.unitId);
    const original = players.find(
      (player) => player.id === entry.originalOwnerId,
    );
    if (original?.status === "ACTIVE") {
      releasedById.set(unit.id, {
        ...unit,
        ownerId: entry.originalOwnerId,
        homeCityId: null,
        captureEligible: false,
        activation: exhaustedMartianActivationV7(),
      });
      events.push({
        kind: "UNIT_RELEASED",
        unitId: unit.id,
        brainUnitId: entry.brainUnitId,
        fromPlayerId: unit.ownerId,
        toPlayerId: entry.originalOwnerId,
        at: { x: unit.at.x, y: unit.at.y },
      });
    } else {
      removedIds.add(unit.id);
      removed.push(unit);
      events.push({ kind: "UNIT_DIED", unitId: unit.id, cause: "BRAIN_LOST" });
    }
  }
  if (ended.size === 0) return unchanged;
  return {
    units: units
      .filter((unit) => !removedIds.has(unit.id))
      .map((unit) => (releasedById.get(unit.id) as U | undefined) ?? unit),
    burrowed: burrowed
      .filter((entry) => !removedIds.has(entry.unit.id))
      .map((entry) => {
        const released = releasedById.get(entry.unit.id);
        return released === undefined ? entry : { ...entry, unit: released };
      }),
    mindControlled: mindControlled.filter((entry) => !ended.has(entry.unitId)),
    released: [...releasedById.values()],
    removed,
  };
}

/**
 * Drops Martian side-list entries of units that left the board (Shields,
 * Cooling, Mind Control cooldowns), and the `mindControlled` entries of
 * units that are gone or were released (their owner is the original owner
 * again). A controlled unit whose Brain left the board is NOT pruned here:
 * its release is an event (`releaseControlledV7`), and state parsing
 * rejects a controlled unit without its Brain. Every reducer output runs
 * through this before validation.
 */
export function prunedMartianV7(state: GameStateV7): GameStateV7 {
  if (
    state.shields.length === 0 &&
    state.cooling.length === 0 &&
    state.mindControlled.length === 0 &&
    state.mindControlCooldowns.length === 0
  )
    return state;
  // The Dwarf revision section 5.2: a burrowed unit keeps its entries.
  const living = allOwnedUnitsV7(state).filter((unit) => unit.hp > 0);
  const alive = new Set(living.map((unit) => unit.id));
  const ownerOf = new Map(living.map((unit) => [unit.id, unit.ownerId]));
  const keep = <T extends { readonly unitId: UnitId }>(
    entries: readonly T[],
  ): readonly T[] => {
    const kept = entries.filter((entry) => alive.has(entry.unitId));
    return kept.length === entries.length ? entries : kept;
  };
  const shields = keep(state.shields);
  const cooling = keep(state.cooling);
  const controlled = state.mindControlled.filter((entry) => {
    const owner = ownerOf.get(entry.unitId);
    return owner !== undefined && owner !== entry.originalOwnerId;
  });
  const mindControlled =
    controlled.length === state.mindControlled.length
      ? state.mindControlled
      : controlled;
  const mindControlCooldowns = keep(state.mindControlCooldowns);
  return shields === state.shields &&
    cooling === state.cooling &&
    mindControlled === state.mindControlled &&
    mindControlCooldowns === state.mindControlCooldowns
    ? state
    : { ...state, shields, cooling, mindControlled, mindControlCooldowns };
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

/**
 * The exhausted activation of a controlled or released unit, a beamed unit,
 * or a rising.
 */
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
