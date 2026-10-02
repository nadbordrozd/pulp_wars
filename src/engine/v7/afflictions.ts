import type { PlayerId, UnitId } from "../model/ids";
import {
  playerFactionV7,
  unitRoleRuleV7,
  type EffectiveRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import type {
  CombatPreviewV7,
  CombatSplashEntryV7,
  DomainEventV7,
} from "./events";
import type {
  BittenStatusV7,
  GameStateV7,
  PlagueStatusV7,
  UnitStateV7,
} from "./types";

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
 * "Living" in the revision-13 sense: the unit's owner's faction is not
 * UNDEAD. Plague and Bitten affect only living units.
 */
export function isLivingOwnerV7(
  roster: FactionRosterV7,
  ownerId: PlayerId,
): boolean {
  return playerFactionV7(roster, ownerId) !== "UNDEAD";
}

/** The combatant facts the revision-14 combat afflictions read. */
export interface AfflictionCombatantV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
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
  readonly splash: readonly CombatSplashEntryV7[];
  readonly splashOwner: (unitId: UnitId) => PlayerId | undefined;
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
  const living = (ownerId: PlayerId | undefined): boolean =>
    ownerId !== undefined && isLivingOwnerV7(input.roster, ownerId);
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
      living(input.defender.ownerId) &&
      !input.plaguedUnitIds.has(input.defender.id)
    )
      plagued.push(input.defender.id);
    for (const entry of input.splash)
      if (
        !entry.dies &&
        !(entry.shieldDamage > 0 && entry.damage === 0) &&
        input.eggUnitIds?.has(entry.unitId) !== true &&
        living(input.splashOwner(entry.unitId)) &&
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
      living(input.defender.ownerId),
    attackerBitten:
      input.defenderRule.abilities.includes("BITE") &&
      input.damageToAttacker > 0 &&
      !input.attackerDies &&
      input.attacker.form === "LAND" &&
      living(input.attacker.ownerId),
    // Infect (a Zombie killer) takes precedence over an earlier bite.
    defenderBittenRises:
      input.defenderDies &&
      input.defender.form === "LAND" &&
      input.bittenUnitIds.has(input.defender.id) &&
      !input.attackerRule.abilities.includes("INFECT"),
    attackerBittenRises:
      input.attackerDies &&
      input.attacker.form === "LAND" &&
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
  const alive = new Set(
    state.units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
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
    after.units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
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
  const rule = unitRoleRuleV7(lookup, {
    ownerId: bite.biterPlayerId,
    role: "GUARD",
  });
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
