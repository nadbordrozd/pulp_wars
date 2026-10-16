import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  HEX_COOLDOWN_TURNS_V7,
  NEUTRAL_ROLE_RULES_V7,
  TENTACLE_LIFETIME_V7,
  unitCapabilitiesV7,
} from "../rules/ruleset-v7";
import type { CommandV7 } from "./commands";
import type { CultReducerKitV7 } from "./cult";
import {
  ribbitRejectionV7,
  switcherooRejectionV7,
  tentacleRejectionV7,
  unitIsTentacleV7,
  type RibbitRejectionV7,
  type SwitcherooRejectionV7,
  type TentacleRejectionV7,
} from "./cult-hexes";
import type { DomainEventV7 } from "./events";
import { canonicalGiantTileFactsV7 } from "./giants";
import { unitSightRadiusAtV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { ApplyCommandResultV7 } from "./reducer";
import {
  NEUTRAL_OWNER_ID_V7,
  type CoordV7,
  type CultStateV7,
  type GameStateV7,
  type HexCooldownV7,
  type MonsterStateV7,
  type TentacleV7,
  type UnitActivationV7,
  type UnitStateV7,
} from "./types";

/**
 * The Cultists of the Ancient Ones, hexes and tricks (`pulp_wars-mch9.8`,
 * the sixth Cult engine bead; docs/product/RULESET_7_CULTISTS.md sections
 * 9.1 to 9.3): the reducer steps of Ribbit, Switcheroo, and the Tentacle,
 * and what the turn does to their lists (a frog ends with its owner's turn,
 * a cooldown counts its owner's Start Turns, a Tentacle sinks at the end of
 * its third neutral turn). (Pick Me! retired with the Chosen: the Cult
 * redesign, `pulp_wars-mch9.31`.) The
 * shared legality and the restrictions on other commands are in
 * src/engine/v7/cult-hexes.ts.
 */

// ------------------------------------------------------------ The lists ---

const sortedIds = (ids: readonly UnitId[]): readonly UnitId[] =>
  [...ids].sort((left, right) => left - right);

/**
 * Section 9.1: the Cult state without the frog `unitId` (cured by Tend
 * Wounded, Repair, or Top-Up); `cult` itself for a unit that is no frog.
 */
export function withFrogCuredV7(
  cult: CultStateV7,
  unitId: UnitId,
): CultStateV7 {
  return cult.frogs.includes(unitId)
    ? { ...cult, frogs: cult.frogs.filter((id) => id !== unitId) }
    : cult;
}

/**
 * Section 9.1: a frog ends with its owner's turn. At `actor`'s End Turn
 * every frog it owns is itself again. Returns `state` itself when nothing
 * changes.
 */
export function withFrogsTurnEndedV7(
  state: GameStateV7,
  actor: PlayerId,
): GameStateV7 {
  if (state.cult.frogs.length === 0) return state;
  const own = new Set(
    state.units.filter((unit) => unit.ownerId === actor).map((unit) => unit.id),
  );
  const frogs = state.cult.frogs.filter((unitId) => !own.has(unitId));
  return frogs.length === state.cult.frogs.length
    ? state
    : { ...state, cult: { ...state.cult, frogs } };
}

/**
 * Sections 9.1 and 9.2: the tricks' step of the Start Turn of `playerId`,
 * with the Mind Control cooldowns: each hex cooldown of a unit of that seat
 * counts down and leaves the list at 0 (so a Hexer or a Familiar skips its
 * owner's turn after the cast). Returns `state` itself when nothing
 * changes.
 */
export function tricksStartTurnStepV7(
  state: GameStateV7,
  playerId: PlayerId,
): GameStateV7 {
  const { hexCooldowns } = state.cult;
  if (hexCooldowns.length === 0) return state;
  const own = new Set(
    state.units
      .filter((unit) => unit.ownerId === playerId)
      .map((unit) => unit.id),
  );
  if (!hexCooldowns.some((entry) => own.has(entry.unitId))) return state;
  return {
    ...state,
    cult: {
      ...state.cult,
      hexCooldowns: hexCooldowns.flatMap((entry): HexCooldownV7[] =>
        !own.has(entry.unitId)
          ? [entry]
          : entry.turnsRemaining <= 1
            ? []
            : [{ unitId: entry.unitId, turnsRemaining: 1 }],
      ),
    },
  };
}

/**
 * The structural half of the trick lists (every reducer output runs through
 * it before validation): a frog and a cooldown need their unit on
 * the board; a Tentacle's entry needs its Tentacle, and its grab the held
 * unit on one of the eight tiles around it (a shove, a swap, or anything
 * else that takes the unit from its side ends the grab).
 */
export function prunedTricksV7(state: GameStateV7): GameStateV7 {
  const cult = state.cult;
  if (
    cult.frogs.length === 0 &&
    cult.hexCooldowns.length === 0 &&
    cult.tentacles.length === 0
  )
    return state;
  const unitById = new Map(
    state.units.filter((unit) => unit.hp > 0).map((unit) => [unit.id, unit]),
  );
  const frogs = cult.frogs.filter((unitId) => unitById.has(unitId));
  const hexCooldowns = cult.hexCooldowns.filter((entry) =>
    unitById.has(entry.unitId),
  );
  let tentaclesChanged = false;
  const tentacles = cult.tentacles.flatMap((entry): TentacleV7[] => {
    const tentacle = unitById.get(entry.unitId);
    if (tentacle === undefined || !unitIsTentacleV7(tentacle)) {
      tentaclesChanged = true;
      return [];
    }
    if (entry.grabbedUnitId === null) return [entry];
    const held = unitById.get(entry.grabbedUnitId);
    if (held !== undefined && chebyshev(held.at, tentacle.at) === 1)
      return [entry];
    tentaclesChanged = true;
    return [{ ...entry, grabbedUnitId: null }];
  });
  return frogs.length === cult.frogs.length &&
    hexCooldowns.length === cult.hexCooldowns.length &&
    !tentaclesChanged
    ? state
    : { ...state, cult: { ...cult, frogs, hexCooldowns, tentacles } };
}

// ----------------------------------------------------- Reducer steps ---

type TargetCommandV7 = Extract<CommandV7, { kind: "RIBBIT" | "SWITCHEROO" }>;
type TentacleCommandV7 = Extract<CommandV7, { kind: "TENTACLE" }>;

/** Marks a unit as having used its primary action. */
function withPrimaryUsed(unit: UnitStateV7): UnitStateV7 {
  return {
    ...unit,
    activation: { ...unit.activation, specialActed: true, handled: true },
  };
}

function withHexCooldown(cult: CultStateV7, unitId: UnitId): CultStateV7 {
  return {
    ...cult,
    hexCooldowns: [
      ...cult.hexCooldowns.filter((entry) => entry.unitId !== unitId),
      { unitId, turnsRemaining: HEX_COOLDOWN_TURNS_V7 },
    ].sort((left, right) => left.unitId - right.unitId),
  };
}

function rejectWith(
  kit: CultReducerKitV7,
  original: GameStateV7,
  unit: UnitStateV7,
  rejection: RibbitRejectionV7 | SwitcherooRejectionV7 | TentacleRejectionV7,
): ApplyCommandResultV7 {
  switch (rejection.code) {
    case "UNIT_ROLE_INVALID":
      return kit.rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
    case "UNIT_ALREADY_ACTED":
      return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
    default:
      return kit.rejected(original, rejection.code, {
        reason: rejection.reason,
      });
  }
}

/** The unit `unitId` when it is on the board and `actor` sees it. */
function visibleTarget(
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitId,
): UnitStateV7 | undefined {
  const named = state.units.find((unit) => unit.id === unitId && unit.hp > 0);
  return named !== undefined && isUnitVisibleToPlayerV7(state, actor, named)
    ? named
    : undefined;
}

/**
 * Section 9.1: `RIBBIT`, a primary action of a Hexer in place of its attack
 * that may follow its Move: the target is a frog until the end of its
 * owner's next turn (`UNIT_FROGGED`), and the Hexer cannot Ribbit on its
 * owner's next turn. A frogged cultist is disrupted (the command's
 * disruption step: a frog is a status).
 */
export function applyRibbitV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: TargetCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const hexer = actorCheck.unit;
  const target = visibleTarget(state, actor, command.targetUnitId);
  const rejection = ribbitRejectionV7(state, hexer, target);
  if (rejection !== null) return rejectWith(kit, original, hexer, rejection);
  if (target === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: state.units.map((unit) =>
          unit.id === hexer.id ? withPrimaryUsed(unit) : unit,
        ),
        cult: {
          ...withHexCooldown(state.cult, hexer.id),
          frogs: sortedIds([...state.cult.frogs, target.id]),
        },
      }),
      [
        {
          kind: "UNIT_FROGGED",
          playerId: actor,
          unitId: hexer.id,
          targetUnitId: target.id,
          targetOwnerId: target.ownerId,
          at: { x: target.at.x, y: target.at.y },
        },
      ],
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/**
 * Section 9.2: `SWITCHEROO`, a primary action of a Familiar that may follow
 * its Move: it and the target swap tiles (`UNITS_SWAPPED`), and the
 * Familiar cannot swap on its owner's next turn. A swap is not a Move:
 * neither activation changes but the Familiar's spent action; each unit
 * reveals its sight where it lands; a swapped channeller is disrupted (the
 * command's disruption step), and a swapped unit a Tentacle held is free.
 */
export function applySwitcherooV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: TargetCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const familiar = actorCheck.unit;
  const target = visibleTarget(state, actor, command.targetUnitId);
  const researched = kit.requirePlayer(state, actor).researchedTechs;
  const rejection = switcherooRejectionV7(
    state,
    canonicalGiantTileFactsV7(state, actor),
    unitCapabilitiesV7(state, familiar, researched).switcheroo,
    {
      engineering: researched.includes("ENGINEERING"),
      navigation: researched.includes("NAVIGATION"),
    },
    familiar,
    target,
  );
  if (rejection !== null) return rejectWith(kit, original, familiar, rejection);
  if (target === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const from = { x: familiar.at.x, y: familiar.at.y };
    const to = { x: target.at.x, y: target.at.y };
    const units = state.units.map((unit): UnitStateV7 =>
      unit.id === familiar.id
        ? { ...withPrimaryUsed(unit), at: to, captureEligible: false }
        : unit.id === target.id
          ? { ...unit, at: from, captureEligible: false }
          : unit,
    );
    const events: DomainEventV7[] = [
      {
        kind: "UNITS_SWAPPED",
        playerId: actor,
        unitId: familiar.id,
        targetUnitId: target.id,
        targetOwnerId: target.ownerId,
        from,
        to,
      },
    ];
    let players = state.players;
    for (const unitId of [familiar.id, target.id]) {
      const moved = units.find((unit) => unit.id === unitId);
      if (moved === undefined) continue;
      const sightState: GameStateV7 = { ...state, units, players };
      const reveal = kit.revealRadius(
        sightState,
        moved.ownerId,
        moved.at,
        unitSightRadiusAtV7(sightState, moved),
      );
      players = kit.setExplored(players, moved.ownerId, reveal.explored);
      if (reveal.revealed.length > 0)
        events.push({
          kind: "TILES_REVEALED",
          playerId: moved.ownerId,
          tiles: reveal.revealed,
        });
    }
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units,
        players,
        cult: withHexCooldown(state.cult, familiar.id),
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// ------------------------------------------------- Tentacle and Grab ---

/**
 * Section 9.3: resolves one slap of the Tentacle `tentacleId` on `state`
 * (the ordinary exchange with the unit `tentacleSlapTargetV7` names, and
 * the Grab). The reducer supplies it: an attack is the ordinary exchange.
 */
export type TentacleSlapResolverV7 = (
  state: GameStateV7,
  tentacleId: UnitId,
) => { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] };

const FRESH_ACTIVATION_V7: UnitActivationV7 = Object.freeze({
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  recovered: false,
  captured: false,
  specialActed: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  handled: false,
});

/**
 * Section 9.3: the state with a new Tentacle of the Caller `callerUnitId`
 * on `at`: a neutral unit of the breed `TENTACLE` at full HP, with its
 * `monsters` entry and its `cult.tentacles` entry (three neutral turns to
 * live, holding nobody).
 */
export function withTentacleRisenV7(
  state: GameStateV7,
  callerUnitId: UnitId,
  at: CoordV7,
): { readonly state: GameStateV7; readonly tentacle: UnitStateV7 } {
  const rule = NEUTRAL_ROLE_RULES_V7.TENTACLE;
  const allocation = allocateUnitId(state.nextEntityId);
  const tentacle: UnitStateV7 = {
    id: allocation.id,
    ownerId: NEUTRAL_OWNER_ID_V7,
    homeCityId: null,
    role: rule.role,
    form: "LAND",
    at: { x: at.x, y: at.y },
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: FRESH_ACTIVATION_V7,
    summoned: "TENTACLE",
  };
  const entry: MonsterStateV7 = {
    unitId: tentacle.id,
    breed: "TENTACLE",
    home: { x: at.x, y: at.y },
    provokedBy: [],
  };
  return {
    tentacle,
    state: {
      ...state,
      nextEntityId: allocation.nextEntityId,
      units: [...state.units, tentacle],
      monsters: [...state.monsters, entry].sort(
        (left, right) => left.unitId - right.unitId,
      ),
      cult: {
        ...state.cult,
        tentacles: [
          ...state.cult.tentacles,
          {
            unitId: tentacle.id,
            callerUnitId,
            turnsLeft: TENTACLE_LIFETIME_V7,
            grabbedUnitId: null,
          },
        ].sort((left, right) => left.unitId - right.unitId),
      },
    },
  };
}

/**
 * Section 9.3, Grab, after a slap of the Tentacle `tentacleId` at the unit
 * `targetUnitId` (null when nobody stood beside it): the Tentacle holds the
 * unit it slapped while both survive and the unit still stands next to it
 * (`UNIT_GRABBED`, pushed onto `events`), and nobody otherwise. Returns
 * `state` itself when its entry does not change.
 */
export function withGrabAfterSlapV7(
  state: GameStateV7,
  tentacleId: UnitId,
  targetUnitId: UnitId | null,
  events: DomainEventV7[],
): GameStateV7 {
  const entry = state.cult.tentacles.find(
    (candidate) => candidate.unitId === tentacleId,
  );
  if (entry === undefined) return state;
  const tentacle = state.units.find(
    (unit) => unit.id === tentacleId && unit.hp > 0,
  );
  const held =
    tentacle === undefined || targetUnitId === null
      ? undefined
      : state.units.find(
          (unit) =>
            unit.id === targetUnitId &&
            unit.hp > 0 &&
            chebyshev(unit.at, tentacle.at) === 1,
        );
  if (tentacle !== undefined && held !== undefined)
    events.push({
      kind: "UNIT_GRABBED",
      unitId: tentacleId,
      targetUnitId: held.id,
      at: { x: tentacle.at.x, y: tentacle.at.y },
    });
  const grabbedUnitId = held?.id ?? null;
  if (entry.grabbedUnitId === grabbedUnitId) return state;
  return {
    ...state,
    cult: {
      ...state.cult,
      tentacles: state.cult.tentacles.map((candidate) =>
        candidate.unitId === tentacleId
          ? { ...candidate, grabbedUnitId }
          : candidate,
      ),
    },
  };
}

/**
 * Section 9.3: `TENTACLE`, a primary action of a Summoner (the retired
 * Caller's before the Cult redesign, `pulp_wars-mch9.31`) with Tentacles
 * that may follow its Move: a Tentacle rises on `at` (`TENTACLE_ROSE`) and slaps at once
 * (`slap`: the ordinary exchange, with retaliation, deaths, and Graves,
 * credited to nobody, and the Grab).
 */
export function applyTentacleV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: TentacleCommandV7,
  slap: TentacleSlapResolverV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const caller = actorCheck.unit;
  const rejection = tentacleRejectionV7(
    state,
    canonicalGiantTileFactsV7(state, actor),
    unitCapabilitiesV7(
      state,
      caller,
      kit.requirePlayer(state, actor).researchedTechs,
    ).tentacles,
    caller,
    command.at,
  );
  if (rejection !== null) return rejectWith(kit, original, caller, rejection);
  try {
    const risen = withTentacleRisenV7(
      {
        ...state,
        units: state.units.map((unit) =>
          unit.id === caller.id ? withPrimaryUsed(unit) : unit,
        ),
      },
      caller.id,
      command.at,
    );
    const events: DomainEventV7[] = [
      {
        kind: "TENTACLE_ROSE",
        playerId: actor,
        unitId: caller.id,
        tentacleUnitId: risen.tentacle.id,
        at: risen.tentacle.at,
        hp: risen.tentacle.hp,
      },
    ];
    const slapped = slap(risen.state, risen.tentacle.id);
    events.push(...slapped.events);
    const staged = kit.graveActionTail(
      {
        ...slapped.state,
        commandIndex: kit.nextSafe(state.commandIndex),
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
 * Section 9.3: the end of a neutral turn for the Tentacles, in unit-ID
 * order: each one on the board has one neutral turn less to live, and one
 * with none left sinks (`TENTACLE_SANK`, then `UNIT_DIED` cause `SANK`,
 * pushed onto `events`): it leaves the board with its entries and leaves
 * nothing behind. Returns `state` itself when there is no Tentacle.
 */
export function resolveTentacleCountdownV7(
  state: GameStateV7,
  events: DomainEventV7[],
): GameStateV7 {
  if (state.cult.tentacles.length === 0) return state;
  const sunk = new Set<UnitId>();
  const tentacles = state.cult.tentacles.flatMap((entry): TentacleV7[] => {
    const tentacle = state.units.find(
      (unit) => unit.id === entry.unitId && unit.hp > 0,
    );
    if (tentacle === undefined) return [];
    if (entry.turnsLeft > 1)
      return [{ ...entry, turnsLeft: (entry.turnsLeft - 1) as 1 | 2 }];
    sunk.add(entry.unitId);
    events.push(
      {
        kind: "TENTACLE_SANK",
        unitId: entry.unitId,
        at: { x: tentacle.at.x, y: tentacle.at.y },
      },
      { kind: "UNIT_DIED", unitId: entry.unitId, cause: "SANK" },
    );
    return [];
  });
  return {
    ...state,
    units:
      sunk.size === 0
        ? state.units
        : state.units.filter((unit) => !sunk.has(unit.id)),
    monsters:
      sunk.size === 0
        ? state.monsters
        : state.monsters.filter((entry) => !sunk.has(entry.unitId)),
    cult: { ...state.cult, tentacles },
  };
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
