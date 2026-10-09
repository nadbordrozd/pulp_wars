import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  BARRICADE_CAP_V7,
  BARRICADE_COST_V7,
  BARRICADE_DEFENSE2_V7,
  BARRICADE_HP_V7,
  attackIsTorpedoV7,
  primaryActionBlockedAfterMoveV7,
  unitIsIceboundV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { biteOfV7, recordBittenRisingV7 } from "./afflictions";
import { unitIsCrashedV7 } from "./candy";
import { calculateCombatPreviewV7 } from "./combat";
import type { CommandV7 } from "./commands";
import { twinShotReadyV7 } from "./dwarf";
import type { DwarfReducerKitV7 } from "./dwarf-reducer";
import { arePlayersHostileV7 } from "./economy";
import type { CombatSplashEntryV7, DomainEventV7 } from "./events";
import { isExplodingUnitV7, resolveStateExplosionChainV7 } from "./explosions";
import { recordCombatDeathV7 } from "./graves";
import { attackMaximumRangeV7 } from "./ice-folk";
import { releaseControlledV7, withShieldDamageV7 } from "./martian";
import { unitSightRadiusAtV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { ApplyCommandResultV7 } from "./reducer";
import { noRisingAtV7 } from "./rift";
import { tileAtV7 } from "./spatial-economy";
import {
  type BarricadeV7,
  type CoordV7,
  type GameStateV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { barricadeAtV7, tileOccupiedV7 } from "./units";
import type { PlayerViewV7 } from "./view";
import { wailDamageV7 } from "./wail";

/**
 * Dwarf crowd control (`pulp_wars-w49.33`; current rules section 22.15 and
 * docs/product/RULESET_7_DWARVES.md sections 6.2 and 9.3): the Whirligig's
 * `WHIRL`, which replaced Three Hammers, and the Engineer's Barricade (the
 * `BUILD_BARRICADE` command, `ATTACK_BARRICADE` by any hostile unit that can
 * attack, and Repair). The helpers are shared by the reducer, the public
 * queries, and the previews, so every offered command is accepted and every
 * preview equals its result.
 */

type WhirlCommandV7 = Extract<CommandV7, { kind: "WHIRL" }>;
type BuildBarricadeCommandV7 = Extract<CommandV7, { kind: "BUILD_BARRICADE" }>;
type AttackBarricadeCommandV7 = Extract<
  CommandV7,
  { kind: "ATTACK_BARRICADE" }
>;

// ------------------------------------------------------------- Whirl ---

/** Whether a unit's role Whirls (a land-form Whirligig). */
export function unitWhirlsV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("WHIRL") &&
    unitRoleMechanicsV7(roster, unit).whirl
  );
}

/**
 * The units a Whirl hits, in (y, x, id) order: every unit on the board
 * within Chebyshev 1 of the Whirligig that is hostile to its owner and
 * visible to it, of any form (land, flyer, Egg, embarked, or boat), each
 * with the ordinary attack's damage on it from the state before the Whirl
 * (current rules section 13.2 with every Defense, cover, fortification,
 * Armoured, Plated, and Shield rule of the defender; the Whirligig's force
 * is Unflinching). Nothing answers it: no retaliation, Shock Field, or
 * Frostbite.
 */
export function whirlTargetsV7(
  state: GameStateV7,
  whirligig: UnitStateV7,
): readonly CombatSplashEntryV7[] {
  return state.units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.id !== whirligig.id &&
        chebyshev(unit.at, whirligig.at) <= 1 &&
        arePlayersHostileV7(state, whirligig.ownerId, unit.ownerId) &&
        isUnitVisibleToPlayerV7(state, whirligig.ownerId, unit),
    )
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    )
    .map((unit) => {
      const hit = calculateCombatPreviewV7(
        state,
        whirligig.id,
        unit.id,
        undefined,
        { ignoreShatter: true },
      );
      return {
        unitId: unit.id,
        at: { x: unit.at.x, y: unit.at.y },
        damage: hit.damageToDefender,
        dies: hit.damageToDefender >= unit.hp,
        shieldDamage: hit.defenderShieldDamage,
      };
    });
}

/**
 * `WHIRL { kind, unitId }`: the Whirligig's primary action; it may follow a
 * Move. Legality, in order: the ordinary unit errors; the role has `WHIRL`
 * (`UNIT_ROLE_INVALID`); it has not used a primary action (an attack
 * included) and may act after its Move (`UNIT_ALREADY_ACTED`); land form
 * (`WHIRL_NOT_LEGAL { reason: "EMBARKED" }`); at least one target
 * (`WHIRL_NOT_LEGAL { reason: "NO_TARGET" }`). Result: every target loses
 * its damage at once; the deaths (cause `ATTACK`, kill credit to the
 * Whirligig) in (y, x, id) order with their Graves or risings; a dead
 * Brain's units are released; death blasts chain; Plunder; reveals; no
 * advance; the Whirligig has attacked and is handled.
 */
export function applyWhirlV7(
  kit: DwarfReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: WhirlCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const whirligig = actorCheck.unit;
  if (
    !unitRoleRuleV7(state, whirligig).abilities.includes("WHIRL") ||
    !unitRoleMechanicsV7(state, whirligig).whirl
  )
    return kit.rejected(original, "UNIT_ROLE_INVALID", {
      role: whirligig.role,
    });
  if (
    whirligig.activation.overrunActive ||
    kit.primaryUsed(whirligig) ||
    whirligig.activation.attacksUsed > 0 ||
    primaryActionBlockedAfterMoveV7(state, whirligig) ||
    unitIsCrashedV7(state, whirligig.id)
  )
    return kit.rejected(original, "UNIT_ALREADY_ACTED", {
      unitId: whirligig.id,
    });
  if (whirligig.form !== "LAND")
    return kit.rejected(original, "WHIRL_NOT_LEGAL", { reason: "EMBARKED" });
  try {
    const targets = whirlTargetsV7(state, whirligig);
    if (targets.length === 0)
      return kit.rejected(original, "WHIRL_NOT_LEGAL", {
        reason: "NO_TARGET",
      });
    const killed = targets.filter((entry) => entry.dies);
    const kills = whirligig.kills + killed.length;
    if (!Number.isSafeInteger(kills)) throw new RangeError("INTEGER_OVERFLOW");
    const damage = new Map(
      targets.map((entry) => [entry.unitId, entry.damage] as const),
    );
    let units: UnitStateV7[] = state.units
      .map((unit) =>
        unit.id === whirligig.id
          ? {
              ...unit,
              kills,
              captureEligible: false,
              activation: {
                ...unit.activation,
                attacked: true,
                attacksUsed: 1,
                inspired: false,
                overrunActive: false,
                escapeAvailable: false,
                handled: true,
              },
            }
          : damage.has(unit.id)
            ? { ...unit, hp: unit.hp - (damage.get(unit.id) ?? 0) }
            : unit,
      )
      .filter((unit) => unit.hp > 0);
    const events: DomainEventV7[] = [
      {
        kind: "WHIRL_RESOLVED",
        playerId: actor,
        unitId: whirligig.id,
        at: { x: whirligig.at.x, y: whirligig.at.y },
        results: targets,
      },
    ];
    let graves = state.graves;
    let nextEntityId = state.nextEntityId;
    const risings: UnitStateV7[] = [];
    for (const entry of killed) {
      const victim = requireUnit(state, entry.unitId);
      // A bitten land-form victim rises as its biter's Zombie (never on a
      // Rift); every other death may leave a Grave (never a construct's).
      const bite = biteOfV7(state, victim.id);
      if (
        bite === undefined ||
        victim.form !== "LAND" ||
        noRisingAtV7(state.board, victim.at)
      ) {
        graves = recordCombatDeathV7(state, graves, victim, "ATTACK", events);
        continue;
      }
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        state,
        bite,
        victim,
        "ATTACK",
        allocation.id,
        kit.exhaustedActivation(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    }
    const release = releaseControlledV7(
      units,
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    units = [...release.units];
    const chain = resolveStateExplosionChainV7(
      state,
      {
        units,
        board: state.board,
        graves,
        nextEntityId,
        bitten: state.bitten,
        shields: withShieldDamageV7(
          state.shields,
          new Map(
            targets.map((entry) => [entry.unitId, entry.shieldDamage] as const),
          ),
        ),
        mindControlled: release.mindControlled,
        burrowed: release.burrowed,
      },
      killed.flatMap((entry) => {
        const victim = requireUnit(state, entry.unitId);
        return isExplodingUnitV7(state, victim)
          ? [{ unit: { ...victim, hp: 0 }, cause: "DEATH" as const }]
          : [];
      }),
      events,
    );
    risings.push(...chain.risings);
    // The kills are the Whirligig's owner's (Plunder, a Monster's bounty).
    const plunder = kit.plunderAwards(state, state.players, [
      ...killed.map((entry) => ({
        creditedId: actor,
        victimOwnerId: requireUnit(state, entry.unitId).ownerId,
        victimUnitId: entry.unitId,
      })),
      ...chain.credits,
    ]);
    events.push(...plunder.events);
    let players = plunder.players;
    const revealedByPlayer = new Map<PlayerId, CoordV7[]>();
    for (const risen of risings) {
      if (!chain.units.some((unit) => unit.id === risen.id)) continue;
      const sightState = {
        ...state,
        board: chain.board,
        players,
        units: chain.units,
      } as GameStateV7;
      const sight = kit.revealRadius(
        sightState,
        risen.ownerId,
        risen.at,
        unitSightRadiusAtV7(sightState, risen),
      );
      players = kit.setExplored(players, risen.ownerId, sight.explored);
      if (sight.revealed.length > 0)
        revealedByPlayer.set(risen.ownerId, [
          ...(revealedByPlayer.get(risen.ownerId) ?? []),
          ...sight.revealed,
        ]);
    }
    for (const [ownerId, tiles] of [...revealedByPlayer].sort(
      ([left], [right]) => left - right,
    ))
      events.push({
        kind: "TILES_REVEALED",
        playerId: ownerId,
        tiles: kit.uniqueCoords(tiles),
      });
    const staged = kit.graveActionTail(
      {
        ...state,
        board: chain.board,
        commandIndex: kit.nextSafe(state.commandIndex),
        nextEntityId: chain.nextEntityId,
        players,
        units: [...chain.units],
        graves: chain.graves,
        shields: chain.shields,
        mindControlled: chain.mindControlled,
        burrowed: chain.burrowed,
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// -------------------------------------------------------- Barricades ---

/** The Barricades `ownerId` has standing. */
export function standingBarricadesV7(
  lookup: { readonly barricades: readonly Pick<BarricadeV7, "ownerId">[] },
  ownerId: PlayerId,
): number {
  return lookup.barricades.filter((entry) => entry.ownerId === ownerId).length;
}

/** Whether `ownerId` may build another Barricade (`BARRICADE_CAP_V7`). */
export function barricadeCapReachedV7(
  lookup: { readonly barricades: readonly Pick<BarricadeV7, "ownerId">[] },
  ownerId: PlayerId,
): boolean {
  return standingBarricadesV7(lookup, ownerId) >= BARRICADE_CAP_V7;
}

/**
 * The facts of a Barricade tile, from the canonical state or a view (both
 * carry every unit, mound, and Barricade on a tile the builder explored):
 * one of the eight tiles around the Engineer, explored by the builder, land
 * and not a Rift, not a settlement site, with no unit, mound, Barricade,
 * treasure chest, curiosity, or Grave.
 */
export interface BarricadeTileFactsV7 {
  readonly explored: boolean;
  readonly land: boolean;
  readonly rift: boolean;
  readonly site: boolean;
  readonly occupied: boolean;
  readonly chest: boolean;
  readonly curiosity: boolean;
  readonly grave: boolean;
}

/** Whether a tile with these facts, `distance` from the Engineer, is legal. */
export function barricadeTileFactsLegalV7(
  facts: BarricadeTileFactsV7,
  distance: number,
): boolean {
  return (
    distance === 1 &&
    facts.explored &&
    facts.land &&
    !facts.rift &&
    !facts.site &&
    !facts.occupied &&
    !facts.chest &&
    !facts.curiosity &&
    !facts.grave
  );
}

/** The canonical Barricade tile rule for `engineer` (see the facts). */
export function barricadeTileLegalV7(
  state: GameStateV7,
  actor: PlayerId,
  engineer: Pick<UnitStateV7, "at">,
  to: CoordV7,
): boolean {
  const tile = tileAtV7(state.board, to);
  if (tile === undefined) return false;
  return barricadeTileFactsLegalV7(
    {
      explored:
        state.players
          .find((player) => player.id === actor)
          ?.explored.some((known) => same(known, to)) === true,
      land: tile.biome !== null,
      rift: tile.terrain === "RIFT",
      site: tile.site !== null,
      occupied: tileOccupiedV7(state, to),
      chest: state.treasureChests.some((chest) => same(chest, to)),
      curiosity: state.curiosities.some((entry) => same(entry.at, to)),
      grave: state.graves.some((grave) => same(grave, to)),
    },
    chebyshev(engineer.at, to),
  );
}

/**
 * `BUILD_BARRICADE { kind, unitId, to }`: an Engineer's primary action
 * (it may follow a Move). Legality, in order: the ordinary unit errors; the
 * role has `BARRICADE` (`UNIT_ROLE_INVALID`); no primary action used, and a
 * sluggish Engineer has not moved (`UNIT_ALREADY_ACTED`); land form
 * (`BARRICADE_NOT_LEGAL { reason: "EMBARKED" }`); fewer than
 * `BARRICADE_CAP_V7` standing (`BARRICADE_NOT_LEGAL { reason: "CAP" }`);
 * the Coins (`INSUFFICIENT_COINS`); the tile
 * (`INVALID_TILE { action: "BUILD_BARRICADE" }`). Result: the Coins are
 * spent and a Barricade of the actor with full HP stands on `to`; the
 * Engineer is handled.
 */
export function applyBuildBarricadeV7(
  kit: DwarfReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: BuildBarricadeCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const engineer = actorCheck.unit;
  if (!unitRoleRuleV7(state, engineer).abilities.includes("BARRICADE"))
    return kit.rejected(original, "UNIT_ROLE_INVALID", {
      role: engineer.role,
    });
  if (
    engineer.activation.overrunActive ||
    kit.primaryUsed(engineer) ||
    primaryActionBlockedAfterMoveV7(state, engineer)
  )
    return kit.rejected(original, "UNIT_ALREADY_ACTED", {
      unitId: engineer.id,
    });
  if (engineer.form !== "LAND")
    return kit.rejected(original, "BARRICADE_NOT_LEGAL", {
      reason: "EMBARKED",
    });
  if (barricadeCapReachedV7(state, actor))
    return kit.rejected(original, "BARRICADE_NOT_LEGAL", { reason: "CAP" });
  const player = kit.requirePlayer(state, actor);
  if (player.coins < BARRICADE_COST_V7)
    return kit.rejected(original, "INSUFFICIENT_COINS", {
      cost: BARRICADE_COST_V7,
    });
  if (!barricadeTileLegalV7(state, actor, engineer, command.to))
    return kit.rejected(original, "INVALID_TILE", {
      action: "BUILD_BARRICADE",
    });
  try {
    const at = { x: command.to.x, y: command.to.y };
    const events: DomainEventV7[] = [
      {
        kind: "BARRICADE_BUILT",
        playerId: actor,
        unitId: engineer.id,
        at,
        cost: BARRICADE_COST_V7,
      },
    ];
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        players: kit.debit(state.players, actor, BARRICADE_COST_V7),
        units: state.units.map((unit) =>
          unit.id === engineer.id
            ? {
                ...unit,
                activation: {
                  ...unit.activation,
                  specialActed: true,
                  handled: true,
                },
              }
            : unit,
        ),
        barricades: [
          ...state.barricades,
          { at, ownerId: actor, hp: BARRICADE_HP_V7 },
        ].sort(
          (left, right) => left.at.y - right.at.y || left.at.x - right.at.x,
        ),
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/**
 * The damage an attack of `attacker` deals a Barricade with `hp`: the
 * ordinary formula (current rules section 13.2) with the attacker's role
 * Attack (no situational bonus) at its current HP (its maximum for an
 * Unflinching construct) against Defense 2 (`BARRICADE_DEFENSE2_V7`) at the
 * Barricade's HP ratio, with no cover or fortification, capped at its HP.
 */
export function barricadeDamageV7(input: {
  readonly attack2: number;
  readonly attackerHp: number;
  readonly attackerMaxHp: number;
  readonly unflinching: boolean;
  readonly barricadeHp: number;
}): number {
  return wailDamageV7({
    attack2: input.attack2,
    attackerHp: input.unflinching ? input.attackerMaxHp : input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    defense2: BARRICADE_DEFENSE2_V7,
    defenderHp: input.barricadeHp,
    defenderMaxHp: BARRICADE_HP_V7,
    defenseBonusNumerator: 1,
    defenseBonusDenominator: 1,
  });
}

/**
 * Why `attacker` cannot attack a Barricade now (the attacker rows of an
 * `ATTACK`), or null when it can: the role has `ATTACK` and an Attack above
 * 0, it is not embarked, icebound, or Crashed, it has not used a primary
 * action (an unmoved Gunner's second shot is allowed), it may act after its
 * Move, and it is not a torpedo. Shared by the reducer and the query.
 */
export function barricadeAttackerRejectionV7(
  lookup: GameStateV7 | PlayerViewV7,
  attacker: Pick<
    UnitStateV7,
    "id" | "ownerId" | "role" | "form" | "at" | "activation"
  >,
  primaryUsed: boolean,
):
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "ATTACK_NOT_LEGAL"; readonly reason: string }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | null {
  const rule = unitRoleRuleV7(lookup, attacker);
  if (!rule.abilities.includes("ATTACK") || rule.attack2 <= 0)
    return { code: "UNIT_ROLE_INVALID" };
  if (attacker.form !== "LAND" && attacker.form !== "NAVAL")
    return { code: "ATTACK_NOT_LEGAL", reason: "EMBARKED" };
  if (unitIsIceboundV7(lookup, attacker))
    return { code: "ATTACK_NOT_LEGAL", reason: "ICEBOUND" };
  // A torpedo targets only units afloat (naval branch section 5.3).
  if (attackIsTorpedoV7(lookup, attacker))
    return { code: "ATTACK_NOT_LEGAL", reason: "NOT_AFLOAT" };
  const twinShot = twinShotReadyV7(lookup, attacker);
  if (
    unitIsCrashedV7(lookup, attacker.id) ||
    attacker.activation.overrunActive ||
    (!twinShot && (primaryUsed || attacker.activation.attacksUsed >= 1)) ||
    (primaryActionBlockedAfterMoveV7(lookup, attacker) &&
      attacker.activation.attacksUsed === 0)
  )
    return { code: "UNIT_ALREADY_ACTED" };
  return null;
}

/**
 * `ATTACK_BARRICADE { kind, unitId, at }`: an attack on the Barricade on
 * `at` by a unit of a player hostile to its owner. Legality, in order: the
 * ordinary unit errors; the attacker rows
 * ({@link barricadeAttackerRejectionV7}); a Barricade on `at` on a tile the
 * actor has explored (`TARGET_NOT_FOUND`); hostile to the actor
 * (`TARGET_ALLIED`); within the attacker's range (`TARGET_OUT_OF_RANGE`).
 * Result: the Barricade loses {@link barricadeDamageV7} and is destroyed at
 * 0 HP; nothing answers, nobody advances, and no kill is credited. The
 * attacker has attacked (an unmoved Gunner keeps its second shot).
 */
export function applyAttackBarricadeV7(
  kit: DwarfReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: AttackBarricadeCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const attacker = actorCheck.unit;
  const refusal = barricadeAttackerRejectionV7(
    state,
    attacker,
    kit.primaryUsed(attacker),
  );
  if (refusal !== null)
    return refusal.code === "UNIT_ROLE_INVALID"
      ? kit.rejected(original, refusal.code, { role: attacker.role })
      : refusal.code === "UNIT_ALREADY_ACTED"
        ? kit.rejected(original, refusal.code, { unitId: attacker.id })
        : kit.rejected(original, refusal.code, { reason: refusal.reason });
  const barricade = barricadeAtV7(state, command.at);
  const explored =
    state.players
      .find((player) => player.id === actor)
      ?.explored.some((known) => same(known, command.at)) === true;
  if (barricade === undefined || !explored)
    return kit.rejected(original, "TARGET_NOT_FOUND", {
      at: { x: command.at.x, y: command.at.y },
    });
  if (!arePlayersHostileV7(state, actor, barricade.ownerId))
    return kit.rejected(original, "TARGET_ALLIED");
  const distance = chebyshev(attacker.at, barricade.at);
  if (
    distance < unitRoleRuleV7(state, attacker).minimumRange ||
    distance >
      attackMaximumRangeV7(
        state,
        attacker,
        tileAtV7(state.board, attacker.at)?.terrain,
      )
  )
    return kit.rejected(original, "TARGET_OUT_OF_RANGE");
  try {
    const damage = barricadeDamageV7({
      attack2: unitRoleRuleV7(state, attacker).attack2,
      attackerHp: attacker.hp,
      attackerMaxHp: attacker.maxHp,
      unflinching:
        attacker.form === "LAND" &&
        unitRoleMechanicsV7(state, attacker).unflinchingAttack,
      barricadeHp: barricade.hp,
    });
    const hpAfter = barricade.hp - damage;
    const attacksUsed = kit.nextSafe(attacker.activation.attacksUsed);
    const afterAttack: UnitStateV7 = {
      ...attacker,
      captureEligible: false,
      activation: {
        ...attacker.activation,
        attacked: true,
        attacksUsed,
        inspired: false,
        overrunActive: false,
        escapeAvailable: false,
        handled: !twinShotLeftAfterV7(state, attacker, attacksUsed),
      },
    };
    const events: DomainEventV7[] = [
      {
        kind: "BARRICADE_ATTACKED",
        playerId: actor,
        unitId: attacker.id,
        at: { x: barricade.at.x, y: barricade.at.y },
        ownerId: barricade.ownerId,
        damage,
        hpAfter,
        destroyed: hpAfter <= 0,
      },
    ];
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: state.units.map((unit) =>
          unit.id === attacker.id ? afterAttack : unit,
        ),
        barricades:
          hpAfter <= 0
            ? state.barricades.filter((entry) => entry !== barricade)
            : state.barricades.map((entry) =>
                entry === barricade ? { ...entry, hp: hpAfter } : entry,
              ),
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/** Whether an unmoved Gunner keeps a shot after `attacksUsed` attacks. */
function twinShotLeftAfterV7(
  roster: FactionRosterV7,
  attacker: UnitStateV7,
  attacksUsed: number,
): boolean {
  return (
    attacker.form === "LAND" &&
    !attacker.activation.moved &&
    unitRoleMechanicsV7(roster, attacker).unmovedShots > attacksUsed
  );
}

/**
 * Repair (an Engineer's `TEND_WOUNDED`, role mechanic `repairMachineHeal`):
 * every damaged own Barricade within 1 of the Engineer heals
 * `min(REPAIR_MACHINE_V7, BARRICADE_HP_V7 - hp)`, like a machine, in
 * (y, x) order. A Barricade has no once-a-turn limit (it stores nothing).
 * Empty for every healer without `repairMachineHeal` and for a healer that
 * is not in land form.
 */
export function barricadeRepairsV7(
  roster: FactionRosterV7,
  barricades: readonly BarricadeV7[],
  engineer: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form" | "at">,
): readonly {
  readonly at: CoordV7;
  readonly amount: number;
  readonly hpAfter: number;
}[] {
  if (engineer.form !== "LAND" || barricades.length === 0) return [];
  const heal = unitRoleMechanicsV7(roster, engineer).repairMachineHeal;
  if (heal === null) return [];
  return barricades
    .filter(
      (entry) =>
        entry.ownerId === engineer.ownerId &&
        entry.hp < BARRICADE_HP_V7 &&
        chebyshev(entry.at, engineer.at) <= 1,
    )
    .map((entry) => {
      const amount = Math.min(heal, BARRICADE_HP_V7 - entry.hp);
      return {
        at: { x: entry.at.x, y: entry.at.y },
        amount,
        hpAfter: entry.hp + amount,
      };
    });
}

/** Repair's Barricade results applied to the list. */
export function withBarricadesRepairedV7(
  barricades: readonly BarricadeV7[],
  repairs: readonly { readonly at: CoordV7; readonly hpAfter: number }[],
): readonly BarricadeV7[] {
  if (repairs.length === 0) return barricades;
  return barricades.map((entry) => {
    const repair = repairs.find((item) => same(item.at, entry.at));
    return repair === undefined ? entry : { ...entry, hp: repair.hpAfter };
  });
}

function requireUnit(state: GameStateV7, unitId: UnitId): UnitStateV7 {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) throw new RangeError("INVALID_STATE");
  return unit;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
