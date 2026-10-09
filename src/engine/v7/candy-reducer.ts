import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  REBAKE_OVER_CAPACITY_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  canEnterTerrainV7,
  rebakeHpV7,
  rebakePriceV7,
  seatRoleMechanicsV7,
  seatRoleRuleV7,
  unitRoleRuleV7,
} from "../rules/ruleset-v7";
import { biteOfV7, recordBittenRisingV7 } from "./afflictions";
import {
  candyActionRejectionV7,
  crumbsAtV7,
  crumbsBiteV7,
  homeSweetHomeSparesV7,
  matchHasCandyV7,
  peppermintHitV7,
  sugarRushRejectionV7,
  sugarTossAmountV7,
  sugarTossTargetRejectionV7,
  unitEatsCrumbsV7,
  withCrumbsV7,
  withSugarRushV7,
  withUnitIdV7,
  withoutCrumbsAtV7,
} from "./candy";
import {
  countedDownCandyStatusV7,
  rebakeSourcesV7,
  topUpAmountV7,
  topUpTargetRejectionV7,
  unitHasToothacheV7,
  unitIsAfflictedForTopUpV7,
  unitIsStuckV7,
  withoutCandyStatusV7,
} from "./candy-abilities";
import type { CommandV7 } from "./commands";
import type { DwarfReducerKitV7 } from "./dwarf-reducer";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
} from "./economy";
import type { DomainEventV7 } from "./events";
import {
  isExplodingUnitV7,
  resolveStateExplosionChainV7,
  type CreditedDeathV7,
} from "./explosions";
import { recordCombatDeathV7 } from "./graves";
import {
  releaseControlledV7,
  shieldOfV7,
  withFullShieldsV7,
  withShieldDamageV7,
} from "./martian";
import { withFrozenCuredV7 } from "./ice-folk";
import { unitSightRadiusAtV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { ApplyCommandResultV7 } from "./reducer";
import { noRisingAtV7 } from "./rift";
import { tileAtV7 } from "./spatial-economy";
import type {
  CoordV7,
  CrumbsV7,
  GameStateV7,
  SugarRushStatusV7,
  TileStateV7,
  UnitStateV7,
} from "./types";
import { tileOccupiedV7 } from "./units";

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md): the `SUGAR_RUSH`,
 * `REBAKE`, and `SUGAR_TOSS` commands, the eating of Crumbs at the end of a
 * Move or a landing, the End Turn steps, the fold of `CRUMBS_LEFT` events
 * into the state, and the pruning. The reducer passes its shared helpers
 * (the kit of the Dwarf commands), so these follow the same tails,
 * validation, and certificates as every other command.
 */
export type CandyReducerKitV7 = DwarfReducerKitV7;

type SugarRushCommandV7 = Extract<CommandV7, { kind: "SUGAR_RUSH" }>;
type RebakeCommandV7 = Extract<CommandV7, { kind: "REBAKE" }>;
type SugarTossCommandV7 = Extract<CommandV7, { kind: "SUGAR_TOSS" }>;
type TopUpCommandV7 = Extract<CommandV7, { kind: "TOP_UP" }>;

// --------------------------------------------------------- Sugar Rush ---

/** Section 5.1: `SUGAR_RUSH`. Not a primary action and not a Move. */
export function applySugarRushV7(
  kit: CandyReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: SugarRushCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const unit = actorCheck.unit;
  const rejection = sugarRushRejectionV7(state, unit);
  if (rejection !== null)
    switch (rejection.code) {
      case "UNIT_ROLE_INVALID":
        return kit.rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
      case "SUGAR_RUSH_NOT_LEGAL":
        return kit.rejected(original, "SUGAR_RUSH_NOT_LEGAL", {
          reason: rejection.reason,
        });
      case "UNIT_CRASHED":
        return kit.rejected(original, "UNIT_CRASHED", { unitId: unit.id });
      case "UNIT_ALREADY_ACTED":
        return kit.rejected(original, "UNIT_ALREADY_ACTED", {
          unitId: unit.id,
        });
    }
  try {
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        sugarRush: withSugarRushV7(state.sugarRush, unit.id, "RUSHED"),
      }),
      [
        {
          kind: "UNIT_SUGAR_RUSHED",
          playerId: actor,
          unitId: unit.id,
          move: unitRoleRuleV7(state, unit).move + SUGAR_RUSH_MOVE_BONUS_V7,
        },
      ],
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// ------------------------------------------------------------ Re-bake ---

/**
 * Section 6.4, row 8, as the Candy redesign
 * (docs/product/RULESET_7_CANDY_REDESIGN.md section 8.1) changed it:
 * whether the tile `at` may take the re-baked unit of `role` for `actor`:
 * no unit of any owner or form, no mound, and no Barricade (the shared
 * occupancy predicate), no treasure chest and no curiosity, enterable by
 * the role (the shared `canEnterTerrainV7` with the actor's research), and
 * not in territory allied to the actor. The caller checks that it is one of
 * the eight tiles around the Confectioner.
 */
export function rebakeTileLegalV7(
  state: GameStateV7,
  actor: PlayerId,
  role: UnitStateV7["role"],
  at: CoordV7,
): boolean {
  const tile = tileAtV7(state.board, at);
  if (
    tile === undefined ||
    tileOccupiedV7(state, at) ||
    state.treasureChests.some((chest) => same(chest, at)) ||
    state.curiosities.some((curiosity) => same(curiosity.at, at))
  )
    return false;
  const player = kitPlayer(state, actor);
  // The unit is not built yet: a role-level read of the actor's seat.
  const mechanics = seatRoleMechanicsV7(state, actor, role);
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: mechanics.movementMode,
      afloat: false,
      engineering: player.researchedTechs.includes("ENGINEERING"),
      navigation: player.researchedTechs.includes("NAVIGATION"),
      mountainBorn: mechanics.mountainBorn,
      // The frozen sea (naval branch section 8.3): nothing is re-baked on
      // ice (Crumbs never lie there).
      ice: false,
    })
  )
    return false;
  const territoryOwner =
    tile.territoryCityId === null
      ? undefined
      : state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId;
  return !(
    territoryOwner !== undefined &&
    territoryOwner !== actor &&
    arePlayersAlliedV7(state, actor, territoryOwner)
  );
}

/**
 * Section 6.4, as the Candy redesign (section 8.1) changed it: `REBAKE`, a
 * primary action of the Confectioner: it scoops its seat's Crumbs on `from`
 * (within `REBAKE_REACH_V7`, from under any unit) and bakes the copy onto
 * the free tile `at` next to itself, putting its home city at most
 * `REBAKE_OVER_CAPACITY_V7` over capacity.
 */
export function applyRebakeV7(
  kit: CandyReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: RebakeCommandV7,
): ApplyCommandResultV7 {
  if (
    state.commandIndex >= Number.MAX_SAFE_INTEGER ||
    state.nextEntityId >= Number.MAX_SAFE_INTEGER
  )
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const confectioner = actorCheck.unit;
  const blocked = candyActionRejectionV7(state, confectioner, "REBAKE");
  if (blocked === "ROLE")
    return kit.rejected(original, "UNIT_ROLE_INVALID", {
      role: confectioner.role,
    });
  if (blocked === "CRASHED")
    return kit.rejected(original, "UNIT_CRASHED", { unitId: confectioner.id });
  if (blocked === "ACTED")
    return kit.rejected(original, "UNIT_ALREADY_ACTED", {
      unitId: confectioner.id,
    });
  if (blocked === "EMBARKED")
    return kit.rejected(original, "REBAKE_NOT_LEGAL", { reason: "EMBARKED" });
  const home = state.cities.find((city) => city.id === confectioner.homeCityId);
  if (home === undefined || home.ownerId !== actor)
    return kit.rejected(original, "REBAKE_NOT_LEGAL", { reason: "NO_HOME" });
  const crumbs = rebakeSourcesV7(state.crumbs, actor, confectioner.at).find(
    (entry) => same(entry.at, command.from),
  );
  if (crumbs === undefined)
    return kit.rejected(original, "REBAKE_NOT_LEGAL", { reason: "NO_CRUMBS" });
  const role = crumbs.role;
  if (
    chebyshev(command.at, confectioner.at) !== 1 ||
    !rebakeTileLegalV7(state, actor, role, command.at)
  )
    return kit.rejected(original, "REBAKE_NOT_LEGAL", { reason: "TILE" });
  if (
    assignedUnitCountV7(state, home.id) +
      seatRoleMechanicsV7(state, actor, role).capacitySlots >
    cityUnitCapacityV7(state, home) + REBAKE_OVER_CAPACITY_V7
  )
    return kit.rejected(original, "CITY_CAPACITY_FULL", { cityId: home.id });
  const cost = rebakePriceV7(role);
  const player = kit.requirePlayer(state, actor);
  if (cost === null) return kit.rejected(original, "INVALID_STATE");
  if (player.coins < cost)
    return kit.rejected(original, "INSUFFICIENT_COINS", { cost });
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const rule = seatRoleRuleV7(state, actor, role);
    const at = { x: command.at.x, y: command.at.y };
    const hp = Math.min(rebakeHpV7(role), rule.maxHp);
    const rebaked: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: home.id,
      role,
      form: "LAND",
      at,
      hp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: kit.exhaustedActivation(),
    };
    const tile = tileAtV7(state.board, at) as TileStateV7;
    const territoryOwner =
      tile.territoryCityId === null
        ? undefined
        : state.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId;
    // The Assemble and Beam Down precedent: hostile Field Defense on the
    // tile is destroyed by the unit that appears on it.
    const occupiesHostileDefense =
      tile.fieldDefense &&
      territoryOwner !== undefined &&
      arePlayersHostileV7(state, actor, territoryOwner);
    const board = occupiesHostileDefense
      ? kit.replaceTile(state, at, { ...tile, fieldDefense: false })
      : state.board;
    const units = [
      ...state.units.map((unit) =>
        unit.id === confectioner.id
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
      rebaked,
    ];
    const sightState = { ...state, board, units } as GameStateV7;
    const reveal = kit.revealRadius(
      sightState,
      actor,
      at,
      unitSightRadiusAtV7(sightState, rebaked),
    );
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_REBAKED",
        playerId: actor,
        unitId: confectioner.id,
        rebakedUnitId: rebaked.id,
        role,
        from: { x: crumbs.at.x, y: crumbs.at.y },
        at,
        cityId: home.id,
        cost,
        hp,
      },
    ];
    if (occupiesHostileDefense)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at,
        reason: "OCCUPATION",
      });
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    const staged = kit.graveActionTail(
      {
        ...state,
        board,
        nextEntityId: allocation.nextEntityId,
        commandIndex: kit.nextSafe(state.commandIndex),
        players: kit.setExplored(
          kit.debit(state.players, actor, cost),
          actor,
          reveal.explored,
        ),
        units,
        shields: withFullShieldsV7(state, state.shields, [rebaked]),
        crumbs: withoutCrumbsAtV7(state.crumbs, crumbs.at),
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// --------------------------------------------------------- Sugar Toss ---

/** Section 9: `SUGAR_TOSS`, a primary action of the Gumball Gunner. */
export function applySugarTossV7(
  kit: CandyReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: SugarTossCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const gunner = actorCheck.unit;
  const blocked = candyActionRejectionV7(state, gunner, "SUGAR_TOSS");
  if (blocked === "ROLE")
    return kit.rejected(original, "UNIT_ROLE_INVALID", { role: gunner.role });
  if (blocked === "CRASHED")
    return kit.rejected(original, "UNIT_CRASHED", { unitId: gunner.id });
  if (blocked === "ACTED")
    return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: gunner.id });
  if (blocked === "EMBARKED")
    return kit.rejected(original, "SUGAR_TOSS_NOT_LEGAL", {
      reason: "EMBARKED",
    });
  // A unit the actor cannot see is not found (a rejection reveals nothing).
  const named = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  const target =
    named !== undefined && isUnitVisibleToPlayerV7(state, actor, named)
      ? named
      : undefined;
  const rejection = sugarTossTargetRejectionV7(
    gunner,
    target,
    state.tossedThisTurn,
  );
  if (rejection === "OUT_OF_RANGE" || rejection === "ALREADY_TOSSED")
    return kit.rejected(original, "SUGAR_TOSS_NOT_LEGAL", {
      reason: rejection,
    });
  if (rejection !== null)
    return kit.rejected(original, rejection, {
      targetUnitId: command.targetUnitId,
    });
  if (target === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const amount = sugarTossAmountV7(target);
    const hpAfter = target.hp + amount;
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        tossedThisTurn: withUnitIdV7(state.tossedThisTurn, target.id),
        units: state.units.map((unit) =>
          unit.id === gunner.id
            ? {
                ...unit,
                activation: {
                  ...unit.activation,
                  specialActed: true,
                  handled: true,
                },
              }
            : unit.id === target.id
              ? { ...unit, hp: hpAfter }
              : unit,
        ),
      }),
      [
        {
          kind: "SUGAR_TOSSED",
          playerId: actor,
          unitId: gunner.id,
          targetUnitId: target.id,
          amount,
          hpAfter,
        },
      ],
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// ------------------------------------------------------------- Top-Up ---

/**
 * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md section 8.2):
 * `TOP_UP`, a primary action of the Confectioner (it may follow a Move): one
 * own adjacent unit stops being Crashed, heals `TOP_UP_HEAL_V7`, and is
 * cured (Plague and Bitten removed, a Frozen unit thawed, Stuck and
 * Toothache removed). Its activation is untouched.
 */
export function applyTopUpV7(
  kit: CandyReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: TopUpCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const confectioner = actorCheck.unit;
  const blocked = candyActionRejectionV7(state, confectioner, "TOP_UP");
  if (blocked === "ROLE")
    return kit.rejected(original, "UNIT_ROLE_INVALID", {
      role: confectioner.role,
    });
  if (blocked === "CRASHED")
    return kit.rejected(original, "UNIT_CRASHED", { unitId: confectioner.id });
  if (blocked === "ACTED")
    return kit.rejected(original, "UNIT_ALREADY_ACTED", {
      unitId: confectioner.id,
    });
  if (blocked === "EMBARKED")
    return kit.rejected(original, "TOP_UP_NOT_LEGAL", { reason: "EMBARKED" });
  // A unit the actor cannot see is not found (a rejection reveals nothing).
  const named = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  const target =
    named !== undefined && isUnitVisibleToPlayerV7(state, actor, named)
      ? named
      : undefined;
  const afflicted =
    target !== undefined && unitIsAfflictedForTopUpV7(state, target.id);
  const rejection = topUpTargetRejectionV7(
    state,
    confectioner,
    target,
    afflicted,
  );
  if (rejection === "OUT_OF_RANGE" || rejection === "NOTHING_TO_DO")
    return kit.rejected(original, "TOP_UP_NOT_LEGAL", { reason: rejection });
  if (rejection !== null)
    return kit.rejected(original, rejection, {
      targetUnitId: command.targetUnitId,
    });
  if (target === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const crashEnded = state.sugarRush.some(
      (entry) => entry.unitId === target.id && entry.phase === "CRASHED",
    );
    const amount = topUpAmountV7(target);
    const hpAfter = target.hp + amount;
    const cured =
      afflicted ||
      unitIsStuckV7(state, target.id) ||
      unitHasToothacheV7(state, target.id);
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        sugarRush: crashEnded
          ? state.sugarRush.filter((entry) => entry.unitId !== target.id)
          : state.sugarRush,
        plagued: state.plagued.filter((entry) => entry.unitId !== target.id),
        bitten: state.bitten.filter((entry) => entry.unitId !== target.id),
        frozen: withFrozenCuredV7(state.frozen, target.id),
        stuck: withoutCandyStatusV7(state.stuck, target.id),
        toothache: withoutCandyStatusV7(state.toothache, target.id),
        units: state.units.map((unit) =>
          unit.id === confectioner.id
            ? {
                ...unit,
                activation: {
                  ...unit.activation,
                  specialActed: true,
                  handled: true,
                },
              }
            : unit.id === target.id
              ? { ...unit, hp: hpAfter }
              : unit,
        ),
      }),
      [
        {
          kind: "UNIT_TOPPED_UP",
          playerId: actor,
          unitId: confectioner.id,
          targetUnitId: target.id,
          crashEnded,
          amount,
          hpAfter,
          cured,
        },
      ],
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// ------------------------------------------------------ Eating Crumbs ---

/**
 * Section 6.3: the eating step at the end of a `MOVE` or a `DISEMBARK`.
 * `staged` is the state after the Move's own changes (the unit on its final
 * tile, in its final form) and before the economy tail. When the unit
 * `eaterId` eats the Crumbs under it, they are removed, `CRUMBS_EATEN` is
 * appended, and the Peppermint Surprise is applied: an ordinary death with
 * cause `PEPPERMINT` (its Grave or Bitten rising, its own Crumbs, a Brain's
 * releases, its death blast and chain, Plunder, and the rising reveals),
 * credited to the Crumbs' owner and to no unit. Returns `staged` itself
 * when nothing is eaten.
 */
export function resolveCrumbsEatingV7(
  kit: CandyReducerKitV7,
  staged: GameStateV7,
  eaterId: UnitId,
  events: DomainEventV7[],
): GameStateV7 {
  if (staged.crumbs.length === 0) return staged;
  const eater = staged.units.find((unit) => unit.id === eaterId && unit.hp > 0);
  if (eater === undefined) return staged;
  const crumbs = crumbsAtV7(staged, eater.at);
  if (
    crumbs === undefined ||
    !unitEatsCrumbsV7(staged, eater, crumbs.ownerId, (left, right) =>
      arePlayersHostileV7(staged, left, right),
    )
  )
    return staged;
  const hit = peppermintHitV7(
    staged,
    eater,
    shieldOfV7(staged.shields, eater.id),
    crumbsBiteV7(staged, crumbs.ownerId),
  );
  events.push({
    kind: "CRUMBS_EATEN",
    playerId: crumbs.ownerId,
    at: { x: crumbs.at.x, y: crumbs.at.y },
    role: crumbs.role,
    unitId: eater.id,
    damage: hit.damage,
    shieldDamage: hit.shieldDamage,
    dies: hit.dies,
  });
  const eaten: GameStateV7 = {
    ...staged,
    crumbs: withoutCrumbsAtV7(staged.crumbs, crumbs.at),
    shields: withShieldDamageV7(
      staged.shields,
      new Map([[eater.id, hit.shieldDamage]]),
    ),
  };
  if (!hit.dies)
    return hit.damage === 0
      ? eaten
      : {
          ...eaten,
          units: eaten.units.map((unit) =>
            unit.id === eater.id ? { ...unit, hp: unit.hp - hit.damage } : unit,
          ),
        };
  // The eater dies: its death, then its blast, as for any fixed damage.
  let units = eaten.units.filter((unit) => unit.id !== eater.id);
  let graves = eaten.graves;
  let nextEntityId = eaten.nextEntityId;
  const risings: UnitStateV7[] = [];
  const bite = biteOfV7(eaten, eater.id);
  if (
    bite === undefined ||
    eater.form !== "LAND" ||
    noRisingAtV7(eaten.board, eater.at)
  )
    graves = recordCombatDeathV7(eaten, graves, eater, "PEPPERMINT", events);
  else {
    const allocation = allocateUnitId(nextEntityId);
    nextEntityId = allocation.nextEntityId;
    const rising = recordBittenRisingV7(
      { players: eaten.players, units },
      bite,
      eater,
      "PEPPERMINT",
      allocation.id,
      kit.exhaustedActivation(),
      events,
    );
    risings.push(rising);
    units = [...units, rising];
  }
  // A Brain killed by the Peppermint Surprise releases its controlled unit.
  const release = releaseControlledV7(
    units,
    eaten.burrowed,
    eaten.mindControlled,
    eaten.players,
    events,
  );
  units = [...release.units];
  const chain = resolveStateExplosionChainV7(
    eaten,
    {
      units,
      board: eaten.board,
      graves,
      nextEntityId,
      bitten: eaten.bitten,
      shields: eaten.shields,
      mindControlled: release.mindControlled,
      burrowed: release.burrowed,
    },
    isExplodingUnitV7(eaten, eater)
      ? [{ unit: { ...eater, hp: 0 }, cause: "DEATH" as const }]
      : [],
    events,
  );
  risings.push(...chain.risings);
  const credits: CreditedDeathV7[] = [
    {
      creditedId: crumbs.ownerId,
      victimOwnerId: eater.ownerId,
      victimUnitId: eater.id,
    },
    ...chain.credits,
  ];
  const plunder = kit.plunderAwards(eaten, eaten.players, credits);
  events.push(...plunder.events);
  let players = plunder.players;
  for (const risen of risings) {
    if (!chain.units.some((unit) => unit.id === risen.id)) continue;
    const risenState = {
      ...eaten,
      board: chain.board,
      players,
      units: chain.units,
    } as GameStateV7;
    const reveal = kit.revealRadius(
      risenState,
      risen.ownerId,
      risen.at,
      unitSightRadiusAtV7(risenState, risen),
    );
    players = kit.setExplored(players, risen.ownerId, reveal.explored);
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: risen.ownerId,
        tiles: reveal.revealed,
      });
  }
  return {
    ...eaten,
    board: chain.board,
    players,
    units: [...chain.units],
    graves: chain.graves,
    nextEntityId: chain.nextEntityId,
    shields: chain.shields,
    mindControlled: chain.mindControlled,
    burrowed: chain.burrowed,
  };
}

// ----------------------------------------------------------- End Turn ---

/**
 * Sections 5.3, 6.2, and 10: the Candy steps of `playerId`'s End Turn, in
 * order: the Crash (the Crashes of its units end; every `RUSHED` entry
 * becomes `CRASHED`, or is removed when Home Sweet Home spares its unit;
 * `UNITS_CRASHED`), the Crumbs countdown (its Crumbs lose one turn;
 * `CRUMBS_STALE`), and the emptying of `splattedThisTurn` and
 * `tossedThisTurn`. Returns `state` itself when nothing changes.
 */
export function resolveCandyEndTurnV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (
    state.sugarRush.length === 0 &&
    state.crumbs.length === 0 &&
    state.splattedThisTurn.length === 0 &&
    state.tossedThisTurn.length === 0 &&
    state.stuck.length === 0 &&
    state.toothache.length === 0 &&
    state.glazedThisTurn.length === 0
  )
    return { state, events: [] };
  const events: DomainEventV7[] = [];
  const unitById = new Map(state.units.map((unit) => [unit.id, unit]));
  // Step 1: the Crash turn of the active seat's units is over.
  const afterCrash = state.sugarRush.filter(
    (entry) =>
      entry.phase !== "CRASHED" ||
      unitById.get(entry.unitId)?.ownerId !== playerId,
  );
  // Step 2: Rushed becomes Crashed, or is spared by Home Sweet Home.
  const crashedUnitIds: UnitId[] = [];
  const sparedUnitIds: UnitId[] = [];
  const sugarRush: SugarRushStatusV7[] = [];
  for (const entry of afterCrash) {
    if (entry.phase !== "RUSHED") {
      sugarRush.push(entry);
      continue;
    }
    const unit = unitById.get(entry.unitId);
    if (unit !== undefined && homeSweetHomeSparesV7(state, unit))
      sparedUnitIds.push(entry.unitId);
    else {
      crashedUnitIds.push(entry.unitId);
      sugarRush.push({ unitId: entry.unitId, phase: "CRASHED" });
    }
  }
  if (crashedUnitIds.length + sparedUnitIds.length > 0)
    events.push({
      kind: "UNITS_CRASHED",
      playerId,
      crashedUnitIds,
      sparedUnitIds,
    });
  // The Crumbs countdown of the active seat's Crumbs.
  const stale: CoordV7[] = [];
  const crumbs: CrumbsV7[] = [];
  for (const entry of state.crumbs) {
    if (entry.ownerId !== playerId) crumbs.push(entry);
    else if (entry.turnsLeft <= 1) stale.push(entry.at);
    else
      crumbs.push({
        ...entry,
        turnsLeft: (entry.turnsLeft - 1) as CrumbsV7["turnsLeft"],
      });
  }
  if (stale.length > 0)
    events.push({ kind: "CRUMBS_STALE", playerId, tiles: stale });
  const countedCrumbs = state.crumbs.some((entry) => entry.ownerId === playerId)
    ? crumbs
    : state.crumbs;
  // The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 6.2): the Stuck
  // and Toothache countdown of the active seat's units (no event).
  const ownerOf = (unitId: UnitId): PlayerId | undefined =>
    unitById.get(unitId)?.ownerId;
  return {
    state: {
      ...state,
      sugarRush:
        sugarRush.length === state.sugarRush.length &&
        crashedUnitIds.length === 0
          ? state.sugarRush
          : sugarRush,
      crumbs: countedCrumbs,
      stuck: countedDownCandyStatusV7(state.stuck, playerId, ownerOf),
      toothache: countedDownCandyStatusV7(state.toothache, playerId, ownerOf),
      splattedThisTurn:
        state.splattedThisTurn.length === 0 ? state.splattedThisTurn : [],
      tossedThisTurn:
        state.tossedThisTurn.length === 0 ? state.tossedThisTurn : [],
      glazedThisTurn:
        state.glazedThisTurn.length === 0 ? state.glazedThisTurn : [],
    },
    events,
  };
}

// ---------------------------------------------- Crumbs left and prune ---

/**
 * Section 6.1: `state` with the Crumbs of every `CRUMBS_LEFT` event of an
 * accepted command, in event order: fresh Crumbs replace any on the tile.
 */
export function withCrumbsLeftV7(
  state: GameStateV7,
  events: readonly DomainEventV7[],
): GameStateV7 {
  let crumbs = state.crumbs;
  for (const event of events)
    if (event.kind === "CRUMBS_LEFT")
      crumbs = withCrumbsV7(crumbs, {
        at: event.at,
        role: event.role,
        ownerId: event.playerId,
      });
  return crumbs === state.crumbs ? state : { ...state, crumbs };
}

/**
 * The Candy revision: drops the `sugarRush`, `splattedThisTurn`, and
 * `tossedThisTurn` entries of units that left the board (and the
 * `tossedThisTurn` entries of units that left land form), and the Crumbs of
 * a Candy seat that is no longer in the game. Every reducer output runs
 * through this before validation.
 */
export function prunedCandyV7(state: GameStateV7): GameStateV7 {
  if (
    state.sugarRush.length === 0 &&
    state.crumbs.length === 0 &&
    state.splattedThisTurn.length === 0 &&
    state.tossedThisTurn.length === 0 &&
    state.stuck.length === 0 &&
    state.toothache.length === 0
  )
    return state;
  if (!matchHasCandyV7(state)) return state;
  const onBoard = new Map(
    state.units.filter((unit) => unit.hp > 0).map((unit) => [unit.id, unit]),
  );
  const sugarRush = state.sugarRush.filter((entry) =>
    onBoard.has(entry.unitId),
  );
  const splattedThisTurn = state.splattedThisTurn.filter((unitId) =>
    onBoard.has(unitId),
  );
  const tossedThisTurn = state.tossedThisTurn.filter(
    (unitId) => onBoard.get(unitId)?.form === "LAND",
  );
  const active = new Set(
    state.players
      .filter((player) => player.status === "ACTIVE")
      .map((player) => player.id),
  );
  const crumbs = state.crumbs.filter((entry) => active.has(entry.ownerId));
  // The Candy redesign (section 6.2): Stuck and Toothache entries go when
  // their unit leaves the board (death, Disband, burrow, Swallow) or is an
  // Egg.
  const carries = (entry: { readonly unitId: UnitId }): boolean => {
    const unit = onBoard.get(entry.unitId);
    return unit !== undefined && unit.form !== "EGG";
  };
  const stuck = state.stuck.filter(carries);
  const toothache = state.toothache.filter(carries);
  return sugarRush.length === state.sugarRush.length &&
    splattedThisTurn.length === state.splattedThisTurn.length &&
    tossedThisTurn.length === state.tossedThisTurn.length &&
    crumbs.length === state.crumbs.length &&
    stuck.length === state.stuck.length &&
    toothache.length === state.toothache.length
    ? state
    : {
        ...state,
        sugarRush,
        splattedThisTurn,
        tossedThisTurn,
        crumbs,
        stuck,
        toothache,
      };
}

function kitPlayer(
  state: GameStateV7,
  actor: PlayerId,
): GameStateV7["players"][number] {
  const player = state.players.find((candidate) => candidate.id === actor);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
