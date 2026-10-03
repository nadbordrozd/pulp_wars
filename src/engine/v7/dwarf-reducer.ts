import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import type { JsonValue } from "../replay/canonical";
import {
  ASSEMBLE_COST_V7,
  BOMB_RANGE_V7,
  armouredDamageV7,
  canEnterTerrainV7,
  effectiveRoleRuleV7,
  playerFactionV7,
  technologyCapabilitiesV7,
  unitIsMountainBornV7,
  unitIsSluggishV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  primaryActionBlockedAfterMoveV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { biteOfV7, recordBittenRisingV7 } from "./afflictions";
import type { CommandV7 } from "./commands";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
  recomputeLiveEconomyV7,
  type CityEconomyChangeV7,
} from "./economy";
import type { DomainEventV7, CombatSplashEntryV7 } from "./events";
import {
  isExplodingUnitV7,
  resolveStateExplosionChainV7,
  type CreditedDeathV7,
} from "./explosions";
import { recordCombatDeathV7 } from "./graves";
import {
  absorbHitV7,
  collapseThrallsV7,
  shieldOfV7,
  withFullShieldsV7,
  withShieldDamageV7,
} from "./martian";
import { reachableMovementPathsV7, unitSightRadiusAtV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { ApplyCommandResultV7, RuleErrorCodeV7 } from "./reducer";
import { riftAtV7 } from "./rift";
import { spatialContributionAtV7, tileAtV7 } from "./spatial-economy";
import type {
  BurrowedEntryV7,
  CoordV7,
  GameStateV7,
  PlayerStateV7,
  TileStateV7,
  UnitStateV7,
} from "./types";
import { tileOccupiedV7 } from "./units";

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md): the `TUNNEL`,
 * `BOMB_RUN`, and `ASSEMBLE` commands and the Start Turn surfacing. The
 * reducer passes its shared helpers (`DwarfReducerKitV7`), so these follow
 * the same tails, validation, and certificates as every other command.
 */
export interface DwarfReducerKitV7 {
  readonly accepted: (
    state: GameStateV7,
    events: readonly DomainEventV7[],
  ) => ApplyCommandResultV7;
  readonly rejected: (
    state: GameStateV7,
    code: RuleErrorCodeV7,
    params?: Readonly<Record<string, JsonValue>>,
  ) => ApplyCommandResultV7;
  readonly checked: (state: GameStateV7) => GameStateV7;
  readonly arithmeticFailure: (
    state: GameStateV7,
    cause: unknown,
  ) => ApplyCommandResultV7;
  readonly validateUnitActor: (
    state: GameStateV7,
    actor: PlayerId,
    unitId: UnitId,
  ) =>
    | { ok: true; unit: UnitStateV7 }
    | { ok: false; code: RuleErrorCodeV7; params: Record<string, JsonValue> };
  readonly primaryUsed: (unit: UnitStateV7) => boolean;
  readonly exhaustedActivation: () => UnitStateV7["activation"];
  readonly revealRadius: (
    state: GameStateV7,
    playerId: PlayerId,
    center: CoordV7,
    radius: number,
  ) => { explored: readonly CoordV7[]; revealed: readonly CoordV7[] };
  readonly setExplored: (
    players: readonly PlayerStateV7[],
    actor: PlayerId,
    explored: readonly CoordV7[],
  ) => readonly PlayerStateV7[];
  readonly debit: (
    players: readonly PlayerStateV7[],
    actor: PlayerId,
    cost: number,
  ) => readonly PlayerStateV7[];
  readonly replaceTile: (
    state: GameStateV7,
    at: CoordV7,
    replacement: TileStateV7,
  ) => GameStateV7["board"];
  readonly requirePlayer: (
    state: GameStateV7,
    actor: PlayerId,
  ) => PlayerStateV7;
  readonly nextSafe: (value: number) => number;
  readonly graveActionTail: (
    staged: GameStateV7,
    actor: PlayerId,
    events: DomainEventV7[],
  ) => GameStateV7;
  readonly plunderAwards: (
    state: GameStateV7,
    players: readonly PlayerStateV7[],
    deaths: readonly CreditedDeathV7[],
  ) => {
    readonly players: readonly PlayerStateV7[];
    readonly events: readonly DomainEventV7[];
  };
  readonly economyAndGrowth: (
    changes: readonly CityEconomyChangeV7[],
  ) => readonly DomainEventV7[];
  readonly uniqueCoords: (values: readonly CoordV7[]) => CoordV7[];
}

type TunnelCommandV7 = Extract<CommandV7, { kind: "TUNNEL" }>;
type BombRunCommandV7 = Extract<CommandV7, { kind: "BOMB_RUN" }>;
type AssembleCommandV7 = Extract<CommandV7, { kind: "ASSEMBLE" }>;

// ------------------------------------------------------------- Tunnel ---

/**
 * Section 5.1: a tunnel tile for `unit`: on the board, explored by the
 * actor, land and not a Rift, enterable by the unit (a Mountain needs its
 * owner's Engineering), with no unit and no mound (the occupancy predicate)
 * and no treasure chest, not a settlement site, and not in territory allied
 * to the actor.
 */
export function tunnelTileLegalV7(
  state: GameStateV7,
  actor: PlayerId,
  unit: Pick<UnitStateV7, "ownerId" | "role">,
  at: CoordV7,
): boolean {
  const tile = tileAtV7(state.board, at);
  if (
    tile === undefined ||
    tile.biome === null ||
    tile.terrain === "RIFT" ||
    tile.site !== null ||
    !isExploredBy(state, actor, at)
  )
    return false;
  const owner = state.players.find((player) => player.id === unit.ownerId);
  if (owner === undefined) return false;
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(state, unit),
      afloat: false,
      engineering: owner.researchedTechs.includes("ENGINEERING"),
      navigation: false,
      mountainBorn: unitIsMountainBornV7(state, unit),
    }) ||
    tileOccupiedV7(state, at) ||
    state.treasureChests.some((chest) => same(chest, at))
  )
    return false;
  const territoryOwner =
    tile.territoryCityId === null
      ? undefined
      : state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId;
  return !(
    territoryOwner !== undefined &&
    arePlayersAlliedV7(state, actor, territoryOwner)
  );
}

/**
 * Section 5.1 row 6: the tiles a sequence of at most `range` steps between
 * Chebyshev neighbours reaches from `from`, every tile after the first
 * explored by the actor and land (Grass, Forest, Mountain, or Rift).
 * Underground nothing else matters: units, zones of control, terrain stops,
 * Snow, Roads, and water ownership.
 */
export function tunnelReachV7(
  board: Pick<GameStateV7["board"], "width" | "height">,
  passable: (at: CoordV7) => boolean,
  from: CoordV7,
  range: number,
): ReadonlyMap<string, CoordV7> {
  const reached = new Map<string, CoordV7>();
  let frontier: CoordV7[] = [from];
  const seen = new Set<string>([key(from)]);
  for (let step = 1; step <= range; step += 1) {
    const next: CoordV7[] = [];
    for (const at of frontier)
      for (let y = at.y - 1; y <= at.y + 1; y += 1)
        for (let x = at.x - 1; x <= at.x + 1; x += 1) {
          const candidate = { x, y };
          if (
            x < 0 ||
            y < 0 ||
            x >= board.width ||
            y >= board.height ||
            seen.has(key(candidate)) ||
            !passable(candidate)
          )
            continue;
          seen.add(key(candidate));
          reached.set(key(candidate), candidate);
          next.push(candidate);
        }
    frontier = next;
  }
  return reached;
}

/** The canonical tunnel reach of the actor's Mole on `from`. */
function canonicalTunnelReachV7(
  state: GameStateV7,
  actor: PlayerId,
  from: CoordV7,
  range: number,
): ReadonlyMap<string, CoordV7> {
  return tunnelReachV7(
    state.board,
    (at) =>
      isExploredBy(state, actor, at) &&
      tileAtV7(state.board, at)?.biome !== null,
    from,
    range,
  );
}

/**
 * Section 5.1 row 7: whether `rider` may ride `mole`'s tunnel: another own
 * living land-form unit on the board whose role has `RIDES_TUNNEL`, next to
 * the Mole, that has not moved, used a primary action, or landed this turn
 * and did not surface this turn.
 */
export function riderReadyV7(
  state: Pick<GameStateV7, "players" | "surfacedThisTurn">,
  mole: Pick<UnitStateV7, "id" | "ownerId" | "at">,
  rider: UnitStateV7,
  primaryUsed: (unit: UnitStateV7) => boolean,
): boolean {
  return (
    rider.id !== mole.id &&
    rider.hp > 0 &&
    rider.ownerId === mole.ownerId &&
    rider.form === "LAND" &&
    unitRoleRuleV7(state, rider).abilities.includes("RIDES_TUNNEL") &&
    chebyshev(rider.at, mole.at) === 1 &&
    !rider.activation.moved &&
    !rider.activation.overrunActive &&
    !primaryUsed(rider) &&
    !state.surfacedThisTurn.includes(rider.id)
  );
}

export function applyTunnelV7(
  kit: DwarfReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: TunnelCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const mole = actorCheck.unit;
  if (!unitRoleRuleV7(state, mole).abilities.includes("TUNNEL"))
    return kit.rejected(original, "UNIT_ROLE_INVALID", { role: mole.role });
  if (
    mole.activation.moved ||
    mole.activation.overrunActive ||
    kit.primaryUsed(mole)
  )
    return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: mole.id });
  if (mole.form !== "LAND")
    return kit.rejected(original, "TUNNEL_NOT_LEGAL", { reason: "EMBARKED" });
  if (state.surfacedThisTurn.includes(mole.id))
    return kit.rejected(original, "TUNNEL_NOT_LEGAL", { reason: "SURFACED" });
  const range = unitRoleMechanicsV7(state, mole).tunnelRange;
  if (
    !tunnelTileLegalV7(state, actor, mole, command.to) ||
    !canonicalTunnelReachV7(state, actor, mole.at, range).has(key(command.to))
  )
    return kit.rejected(original, "TUNNEL_NOT_LEGAL", {
      reason: "DESTINATION",
    });
  let rider: UnitStateV7 | null = null;
  if (command.rider !== null) {
    const riderId = command.rider.unitId;
    const named = state.units.find((unit) => unit.id === riderId);
    if (
      named === undefined ||
      !riderReadyV7(state, mole, named, kit.primaryUsed)
    )
      return kit.rejected(original, "TUNNEL_NOT_LEGAL", { reason: "RIDER" });
    if (
      chebyshev(command.rider.to, command.to) !== 1 ||
      !tunnelTileLegalV7(state, actor, named, command.rider.to)
    )
      return kit.rejected(original, "TUNNEL_NOT_LEGAL", {
        reason: "RIDER_DESTINATION",
      });
    rider = named;
  }
  try {
    const riderTo = command.rider === null ? null : command.rider.to;
    const burrow = (unit: UnitStateV7, at: CoordV7): UnitStateV7 => ({
      ...unit,
      at: { x: at.x, y: at.y },
      captureEligible: false,
      activation: kit.exhaustedActivation(),
    });
    const entries: BurrowedEntryV7[] = [
      { unit: burrow(mole, command.to), moleUnitId: null },
      ...(rider === null || riderTo === null
        ? []
        : [{ unit: burrow(rider, riderTo), moleUnitId: mole.id }]),
    ];
    const gone = new Set(entries.map((entry) => entry.unit.id));
    let players = state.players;
    const revealed: CoordV7[] = [];
    // Section 5.1 result 2: the actor explores the tiles within 1 of each
    // mound (the Sight of a Sight-1 unit standing there).
    for (const entry of entries) {
      const reveal = kit.revealRadius(
        { ...state, players } as GameStateV7,
        actor,
        entry.unit.at,
        1,
      );
      players = kit.setExplored(players, actor, reveal.explored);
      revealed.push(...reveal.revealed);
    }
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_TUNNELLED",
        playerId: actor,
        unitId: mole.id,
        from: mole.at,
        to: { x: command.to.x, y: command.to.y },
        riderUnitId: rider?.id ?? null,
        riderFrom: rider?.at ?? null,
        riderTo: riderTo === null ? null : { x: riderTo.x, y: riderTo.y },
      },
    ];
    const unique = kit.uniqueCoords(revealed);
    if (unique.length > 0)
      events.push({ kind: "TILES_REVEALED", playerId: actor, tiles: unique });
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        players,
        units: state.units.filter((unit) => !gone.has(unit.id)),
        burrowed: [...state.burrowed, ...entries].sort(
          (left, right) => left.unit.id - right.unit.id,
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

// ---------------------------------------------------------- Surfacing ---

/** Section 5.4: whether an eruption hits `unit` (a unit on the ground). */
export function eruptionHitsV7(
  roster: FactionRosterV7,
  unit: Pick<UnitStateV7, "ownerId" | "role" | "form">,
): boolean {
  return (
    unit.form === "EGG" ||
    (unit.form === "LAND" && unitMovementModeV7(roster, unit) !== "FLY")
  );
}

/**
 * Section 5.4 step 2: the eruption of a Mole of `moleOwnerId` surfacing on
 * `at` against `units`: every unit on the eight tiles around it that is
 * hostile to the Mole's owner and on the ground takes `damage`, Armoured
 * then Plated then the Shield, capped at its HP, all at once; in (y, x, id)
 * order. Shared by the resolution and the public forecast.
 */
export function eruptionResultsV7<
  U extends Pick<UnitStateV7, "id" | "ownerId" | "role" | "form" | "at" | "hp">,
>(
  lookup: FactionRosterV7 & Pick<GameStateV7, "setup" | "humanPlayerId">,
  moleOwnerId: PlayerId,
  at: CoordV7,
  damage: number,
  units: readonly U[],
  shieldOf: (unitId: UnitId) => number,
): readonly CombatSplashEntryV7[] {
  return units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        chebyshev(unit.at, at) === 1 &&
        arePlayersHostileV7(lookup, moleOwnerId, unit.ownerId) &&
        eruptionHitsV7(lookup, unit),
    )
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    )
    .map((unit) => {
      const hit = absorbHitV7(
        shieldOf(unit.id),
        unit.hp,
        armouredDamageV7(lookup, unit, damage),
      );
      return {
        unitId: unit.id,
        at: { x: unit.at.x, y: unit.at.y },
        damage: hit.hpDamage,
        dies: hit.hpDamage >= unit.hp,
        shieldDamage: hit.shieldDamage,
      };
    });
}

/** The Start Turn activation (`resetTurnUnits`): nothing moved or used. */
function startTurnActivationV7(): UnitStateV7["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
    escapeAvailable: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
  };
}

/**
 * Section 5.4: at `playerId`'s Start Turn, after the activation reset and
 * the Shield recharge and before Plague, each burrowed Mole of that seat
 * surfaces in unit-ID order: the Mole and then its rider return to the
 * board on their mound tiles with the Start Turn activation and no capture
 * eligibility (both join `surfacedThisTurn`); the eruption hits the hostile
 * ground units around the Mole; Field Defense on the Mole's tile and the
 * eight around it is undermined; the deaths are recorded in (y, x, id) order
 * with kill credit to the Mole; exploding victims explode as a chain (the
 * surfaced pair included); Plunder; the surfaced units and risings reveal.
 */
export function resolveStartTurnSurfacingV7(
  kit: DwarfReducerKitV7,
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const moles = state.burrowed
    .filter(
      (entry) => entry.moleUnitId === null && entry.unit.ownerId === playerId,
    )
    .sort((left, right) => left.unit.id - right.unit.id);
  if (moles.length === 0) return { state, events: [] };
  let current = state;
  const events: DomainEventV7[] = [];
  for (const moleEntry of moles) {
    const riderEntry = current.burrowed.find(
      (entry) => entry.moleUnitId === moleEntry.unit.id,
    );
    const returning = [
      moleEntry,
      ...(riderEntry === undefined ? [] : [riderEntry]),
    ];
    // The occupancy predicate reserves a mound tile: nothing stands on it.
    for (const entry of returning)
      if (current.units.some((unit) => same(unit.at, entry.unit.at)))
        throw new RangeError("INVALID_STATE");
    const surfaced = returning.map((entry): UnitStateV7 => ({
      ...entry.unit,
      captureEligible: false,
      activation: startTurnActivationV7(),
    }));
    const mole = surfaced[0] as UnitStateV7;
    const rider = surfaced[1] ?? null;
    const returned = new Set(surfaced.map((unit) => unit.id));
    let units: UnitStateV7[] = [...current.units, ...surfaced].sort(
      (left, right) => left.id - right.id,
    );
    const owner = kit.requirePlayer(current, playerId);
    const eruptionDamage = technologyCapabilitiesV7(
      owner.researchedTechs,
      owner.faction,
    ).eruptionDamage;
    const results = eruptionResultsV7(
      current,
      playerId,
      mole.at,
      eruptionDamage,
      units,
      (unitId) => shieldOfV7(current.shields, unitId),
    );
    events.push({
      kind: "UNIT_SURFACED",
      playerId,
      unitId: mole.id,
      at: { x: mole.at.x, y: mole.at.y },
      riderUnitId: rider?.id ?? null,
      riderAt: rider === null ? null : { x: rider.at.x, y: rider.at.y },
      eruptionDamage,
      results,
    });
    // Step 3: undermining, whoever owns the Field Defense.
    let board = current.board;
    for (let y = mole.at.y - 1; y <= mole.at.y + 1; y += 1)
      for (let x = mole.at.x - 1; x <= mole.at.x + 1; x += 1) {
        const at = { x, y };
        const tile = tileAtV7(board, at);
        if (tile === undefined || !tile.fieldDefense) continue;
        board = kit.replaceTile({ ...current, board }, at, {
          ...tile,
          fieldDefense: false,
        });
        events.push({
          kind: "FIELD_DEFENSE_DESTROYED",
          at,
          reason: "UNDERMINED",
        });
      }
    // The hits apply together, then the deaths in results order.
    const damage = new Map(results.map((entry) => [entry.unitId, entry]));
    const before = units;
    units = units
      .map((unit) => {
        const entry = damage.get(unit.id);
        return entry === undefined
          ? unit
          : { ...unit, hp: unit.hp - entry.damage };
      })
      .filter((unit) => unit.hp > 0);
    const kills = results.filter((entry) => entry.dies).length;
    if (kills > 0)
      units = units.map((unit) =>
        unit.id === mole.id
          ? { ...unit, kills: nextSafeBy(unit.kills, kills) }
          : unit,
      );
    let graves = current.graves;
    let nextEntityId = current.nextEntityId;
    let thralls = current.thralls;
    const risings: UnitStateV7[] = [];
    const initial: { unit: UnitStateV7; cause: "DEATH" }[] = [];
    const lookup = { ...current, board };
    for (const entry of results) {
      if (!entry.dies) continue;
      const victim = before.find((unit) => unit.id === entry.unitId);
      if (victim === undefined) throw new RangeError("INVALID_STATE");
      const bite = biteOfV7(current, victim.id);
      if (
        bite === undefined ||
        victim.form !== "LAND" ||
        riftAtV7(board, victim.at)
      )
        graves = recordCombatDeathV7(
          lookup,
          graves,
          victim,
          "ERUPTION",
          events,
        );
      else {
        const allocation = allocateUnitId(nextEntityId);
        nextEntityId = allocation.nextEntityId;
        const rising = recordBittenRisingV7(
          { players: current.players, units },
          bite,
          victim,
          "ERUPTION",
          allocation.id,
          kit.exhaustedActivation(),
          events,
        );
        risings.push(rising);
        units = [...units, rising];
      }
      // A Brain killed by the eruption takes its Thralls with it.
      const collapse = collapseThrallsV7(units, thralls, events);
      units = [...collapse.units];
      thralls = collapse.thralls;
      if (isExplodingUnitV7(current, victim))
        initial.push({ unit: { ...victim, hp: 0 }, cause: "DEATH" });
    }
    const shields = withShieldDamageV7(
      current.shields,
      new Map(results.map((entry) => [entry.unitId, entry.shieldDamage])),
    );
    // Step 5: exploding victims explode as a chain; the surfaced Mole and
    // rider are in the blast.
    const chain = resolveStateExplosionChainV7(
      current,
      {
        units,
        board,
        graves,
        nextEntityId,
        bitten: current.bitten,
        shields,
        thralls,
      },
      initial,
      events,
    );
    const credits: CreditedDeathV7[] = [
      ...results
        .filter((entry) => entry.dies)
        .map((entry) => ({
          creditedId: playerId,
          victimOwnerId: (
            before.find((unit) => unit.id === entry.unitId) as UnitStateV7
          ).ownerId,
        })),
      ...chain.credits,
    ];
    const plunder = kit.plunderAwards(current, current.players, credits);
    events.push(...plunder.events);
    let players = plunder.players;
    // Step 6: reveals of the surfaced units that are still on the board and
    // of the risings.
    const revealed = new Map<PlayerId, CoordV7[]>();
    const sighted = [
      ...chain.units.filter((unit) => returned.has(unit.id)),
      ...risings,
      ...chain.risings,
    ];
    for (const unit of sighted) {
      if (!chain.units.some((candidate) => candidate.id === unit.id)) continue;
      const sightState = {
        ...current,
        board: chain.board,
        players,
        units: chain.units,
      } as GameStateV7;
      const reveal = kit.revealRadius(
        sightState,
        unit.ownerId,
        unit.at,
        unitSightRadiusAtV7(sightState, unit),
      );
      players = kit.setExplored(players, unit.ownerId, reveal.explored);
      if (reveal.revealed.length > 0)
        revealed.set(unit.ownerId, [
          ...(revealed.get(unit.ownerId) ?? []),
          ...reveal.revealed,
        ]);
    }
    for (const [ownerId, tiles] of [...revealed].sort(
      ([left], [right]) => left - right,
    ))
      events.push({
        kind: "TILES_REVEALED",
        playerId: ownerId,
        tiles: kit.uniqueCoords(tiles),
      });
    current = {
      ...current,
      board: chain.board,
      players,
      units: [...chain.units].sort((left, right) => left.id - right.id),
      graves: chain.graves,
      nextEntityId: chain.nextEntityId,
      shields: chain.shields,
      thralls: chain.thralls,
      burrowed: current.burrowed.filter(
        (entry) => !returned.has(entry.unit.id),
      ),
      surfacedThisTurn: [
        ...current.surfacedThisTurn,
        ...[...returned].filter((unitId) =>
          chain.units.some((unit) => unit.id === unitId),
        ),
      ].sort((left, right) => left - right),
    };
  }
  const economy = recomputeLiveEconomyV7(
    state,
    { board: current.board, cities: current.cities, units: current.units },
    current.populationContributions,
  );
  events.push(...kit.economyAndGrowth(economy.changes));
  return {
    state: {
      ...current,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    },
    events,
  };
}

// ---------------------------------------------------------- Bomb Run ---

/**
 * Section 6.2 row 10: whether `to` is a legal landing of `gyro`'s bombing
 * run on `target`: next to the target, strictly farther from the
 * Gyrocopter than the target, explored, no treasure chest, and a tile on
 * which an ordinary `MOVE` of the Gyrocopter could end this turn.
 */
export function bombLandingLegalV7(
  state: GameStateV7,
  actor: PlayerId,
  gyro: UnitStateV7,
  target: Pick<UnitStateV7, "at">,
  to: CoordV7,
): boolean {
  if (
    chebyshev(to, target.at) !== 1 ||
    chebyshev(to, gyro.at) <= chebyshev(target.at, gyro.at) ||
    !isExploredBy(state, actor, to) ||
    state.treasureChests.some((chest) => same(chest, to))
  )
    return false;
  return reachableMovementPathsV7(state, gyro).some((path) =>
    same(path.destination, to),
  );
}

export function applyBombRunV7(
  kit: DwarfReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: BombRunCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const gyro = actorCheck.unit;
  if (!unitRoleRuleV7(state, gyro).abilities.includes("BOMB_RUN"))
    return kit.rejected(original, "UNIT_ROLE_INVALID", { role: gyro.role });
  if (
    gyro.activation.moved ||
    gyro.activation.overrunActive ||
    kit.primaryUsed(gyro)
  )
    return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: gyro.id });
  if (gyro.form !== "LAND")
    return kit.rejected(original, "BOMB_RUN_NOT_LEGAL", { reason: "EMBARKED" });
  if (unitIsSluggishV7(state, gyro))
    return kit.rejected(original, "BOMB_RUN_NOT_LEGAL", { reason: "SLUGGISH" });
  const target = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (target === undefined || !isUnitVisibleToPlayerV7(state, actor, target))
    return kit.rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (!arePlayersHostileV7(state, actor, target.ownerId))
    return kit.rejected(original, "TARGET_ALLIED");
  if (chebyshev(gyro.at, target.at) > BOMB_RANGE_V7)
    return kit.rejected(original, "BOMB_RUN_NOT_LEGAL", {
      reason: "OUT_OF_RANGE",
    });
  if (state.bombedThisTurn.includes(target.id))
    return kit.rejected(original, "BOMB_RUN_NOT_LEGAL", {
      reason: "ALREADY_BOMBED",
    });
  if (!bombLandingLegalV7(state, actor, gyro, target, command.to))
    return kit.rejected(original, "BOMB_RUN_NOT_LEGAL", { reason: "LANDING" });
  try {
    const owner = kit.requirePlayer(state, actor);
    const bombDamage = technologyCapabilitiesV7(
      owner.researchedTechs,
      owner.faction,
    ).bombDamage;
    const from = gyro.at;
    const to = { x: command.to.x, y: command.to.y };
    // Step 1: the flight; the Gyrocopter has used its Move and its primary
    // action.
    const flown: UnitStateV7 = {
      ...gyro,
      at: to,
      captureEligible: false,
      activation: {
        ...gyro.activation,
        moved: true,
        movedPathLength: chebyshev(from, to),
        specialActed: true,
        handled: true,
      },
    };
    // Step 2: the fixed bomb, Armoured then Plated then the Shield.
    const hit = absorbHitV7(
      shieldOfV7(state.shields, target.id),
      target.hp,
      armouredDamageV7(state, target, bombDamage),
    );
    const killed = hit.hpDamage >= target.hp;
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_BOMBED",
        playerId: actor,
        unitId: gyro.id,
        from,
        to,
        targetUnitId: target.id,
        at: { x: target.at.x, y: target.at.y },
        damage: hit.hpDamage,
        shieldDamage: hit.shieldDamage,
        killed,
      },
    ];
    let units: UnitStateV7[] = state.units
      .map((unit) =>
        unit.id === gyro.id
          ? { ...flown, kills: killed ? nextSafeBy(gyro.kills, 1) : gyro.kills }
          : unit.id === target.id
            ? { ...unit, hp: unit.hp - hit.hpDamage }
            : unit,
      )
      .filter((unit) => unit.hp > 0);
    let graves = state.graves;
    let nextEntityId = state.nextEntityId;
    let thralls = state.thralls;
    const risings: UnitStateV7[] = [];
    const initial: { unit: UnitStateV7; cause: "DEATH" }[] = [];
    if (killed) {
      // Step 4: cause BOMB, the Grave or rising, a Brain's collapse.
      const bite = biteOfV7(state, target.id);
      if (
        bite === undefined ||
        target.form !== "LAND" ||
        riftAtV7(state.board, target.at)
      )
        graves = recordCombatDeathV7(state, graves, target, "BOMB", events);
      else {
        const allocation = allocateUnitId(nextEntityId);
        nextEntityId = allocation.nextEntityId;
        const rising = recordBittenRisingV7(
          { players: state.players, units },
          bite,
          target,
          "BOMB",
          allocation.id,
          kit.exhaustedActivation(),
          events,
        );
        risings.push(rising);
        units = [...units, rising];
      }
      const collapse = collapseThrallsV7(units, thralls, events);
      units = [...collapse.units];
      thralls = collapse.thralls;
      // Step 5: the death blast hits the Gyrocopter beside the wreck.
      if (isExplodingUnitV7(state, target))
        initial.push({ unit: { ...target, hp: 0 }, cause: "DEATH" });
    }
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
          new Map([[target.id, hit.shieldDamage]]),
        ),
        thralls,
      },
      initial,
      events,
    );
    units = [...chain.units];
    const plunder = kit.plunderAwards(state, state.players, [
      ...(killed ? [{ creditedId: actor, victimOwnerId: target.ownerId }] : []),
      ...chain.credits,
    ]);
    events.push(...plunder.events);
    let players = plunder.players;
    const survivor = units.find((unit) => unit.id === gyro.id);
    const revealedByPlayer = new Map<PlayerId, CoordV7[]>();
    const reveal = (unit: UnitStateV7): void => {
      const sightState = {
        ...state,
        board: chain.board,
        players,
        units,
      } as GameStateV7;
      const sight = kit.revealRadius(
        sightState,
        unit.ownerId,
        unit.at,
        unitSightRadiusAtV7(sightState, unit),
      );
      players = kit.setExplored(players, unit.ownerId, sight.explored);
      if (sight.revealed.length > 0)
        revealedByPlayer.set(unit.ownerId, [
          ...(revealedByPlayer.get(unit.ownerId) ?? []),
          ...sight.revealed,
        ]);
    };
    // Step 1 (reveal from the landing) and the risings.
    reveal(survivor ?? flown);
    for (const risen of [...risings, ...chain.risings])
      if (units.some((unit) => unit.id === risen.id)) reveal(risen);
    for (const [ownerId, tiles] of [...revealedByPlayer].sort(
      ([left], [right]) => left - right,
    ))
      events.push({
        kind: "TILES_REVEALED",
        playerId: ownerId,
        tiles: kit.uniqueCoords(tiles),
      });
    // Step 6: a surviving Gyrocopter that landed on water self-launches.
    const landing = tileAtV7(state.board, to);
    if (survivor !== undefined && landing?.biome === null) {
      units = units.map((unit) =>
        unit.id === gyro.id
          ? {
              ...unit,
              form: "EMBARKED" as const,
              activation: {
                ...kit.exhaustedActivation(),
                movedPathLength: chebyshev(from, to),
              },
            }
          : unit,
      );
      events.push({
        kind: "UNIT_EMBARKED",
        playerId: actor,
        unitId: gyro.id,
        passengerRole: gyro.role,
        from,
        to,
      });
    }
    const staged = kit.graveActionTail(
      {
        ...state,
        board: chain.board,
        commandIndex: kit.nextSafe(state.commandIndex),
        nextEntityId: chain.nextEntityId,
        players,
        units,
        graves: chain.graves,
        shields: chain.shields,
        thralls: chain.thralls,
        bombedThisTurn: [...state.bombedThisTurn, target.id].sort(
          (left, right) => left - right,
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

// ---------------------------------------------------------- Assemble ---

/**
 * Section 9.2 row 9: whether `to` is a legal Assemble tile of `engineer`:
 * one of the eight tiles around it, land and not a Rift, enterable by a
 * Gunner (a Mountain needs Engineering), with no unit, no mound, and no
 * treasure chest, not a settlement site, and not in territory allied to the
 * actor.
 */
export function assembleTileLegalV7(
  state: GameStateV7,
  actor: PlayerId,
  engineer: Pick<UnitStateV7, "at">,
  to: CoordV7,
): boolean {
  return (
    chebyshev(engineer.at, to) === 1 &&
    tunnelTileLegalV7(state, actor, { ownerId: actor, role: "MARKSMAN" }, to)
  );
}

/** Section 9.2: the cost of an Assemble for a home city (Arms Industry). */
export function assembleCostV7(
  state: Pick<GameStateV7, "board" | "cities">,
  homeCityId: GameStateV7["cities"][number]["id"],
): number {
  const forgeActive = state.board.tiles.some(
    (tile) =>
      tile.territoryCityId === homeCityId &&
      tile.improvement === "FORGE" &&
      spatialContributionAtV7(state, tile.at, "FORGE").population > 0,
  );
  return Math.max(1, ASSEMBLE_COST_V7 - (forgeActive ? 1 : 0));
}

export function applyAssembleV7(
  kit: DwarfReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: AssembleCommandV7,
): ApplyCommandResultV7 {
  if (
    state.commandIndex >= Number.MAX_SAFE_INTEGER ||
    state.nextEntityId >= Number.MAX_SAFE_INTEGER
  )
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const engineer = actorCheck.unit;
  if (!unitRoleRuleV7(state, engineer).abilities.includes("ASSEMBLE"))
    return kit.rejected(original, "UNIT_ROLE_INVALID", {
      role: engineer.role,
    });
  const player = kit.requirePlayer(state, actor);
  if (
    !technologyCapabilitiesV7(player.researchedTechs, player.faction).assemble
  )
    return kit.rejected(original, "TECH_REQUIRED", { tech: "MARKSMANSHIP" });
  if (
    engineer.activation.overrunActive ||
    kit.primaryUsed(engineer) ||
    primaryActionBlockedAfterMoveV7(state, engineer)
  )
    return kit.rejected(original, "UNIT_ALREADY_ACTED", {
      unitId: engineer.id,
    });
  if (engineer.form !== "LAND")
    return kit.rejected(original, "ASSEMBLE_NOT_LEGAL", { reason: "EMBARKED" });
  const home = state.cities.find((city) => city.id === engineer.homeCityId);
  if (home === undefined || home.ownerId !== actor)
    return kit.rejected(original, "ASSEMBLE_NOT_LEGAL", { reason: "NO_HOME" });
  const role = "MARKSMAN" as const;
  if (
    assignedUnitCountV7(state, home.id) +
      unitRoleMechanicsV7(state, { ownerId: actor, role }).capacitySlots >
    cityUnitCapacityV7(state, home)
  )
    return kit.rejected(original, "CITY_CAPACITY_FULL", { cityId: home.id });
  const cost = assembleCostV7(state, home.id);
  if (player.coins < cost)
    return kit.rejected(original, "INSUFFICIENT_COINS", { cost });
  if (!assembleTileLegalV7(state, actor, engineer, command.to))
    return kit.rejected(original, "INVALID_TILE", { action: "ASSEMBLE" });
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const rule = effectiveRoleRuleV7(role, playerFactionV7(state, actor));
    const to = { x: command.to.x, y: command.to.y };
    const gunner: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: home.id,
      role,
      form: "LAND",
      at: to,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: kit.exhaustedActivation(),
    };
    const tile = tileAtV7(state.board, to) as TileStateV7;
    const territoryOwner =
      tile.territoryCityId === null
        ? undefined
        : state.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId;
    // The Beam Down precedent: hostile Field Defense on the tile is
    // destroyed by the unit that appears on it.
    const occupiesHostileDefense =
      tile.fieldDefense &&
      territoryOwner !== undefined &&
      arePlayersHostileV7(state, actor, territoryOwner);
    const board = occupiesHostileDefense
      ? kit.replaceTile(state, to, { ...tile, fieldDefense: false })
      : state.board;
    const units = [
      ...state.units.map((unit) =>
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
      gunner,
    ];
    const sightState = { ...state, board, units } as GameStateV7;
    const reveal = kit.revealRadius(
      sightState,
      actor,
      to,
      unitSightRadiusAtV7(sightState, gunner),
    );
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_ASSEMBLED",
        playerId: actor,
        unitId: engineer.id,
        assembledUnitId: gunner.id,
        at: to,
        cityId: home.id,
        cost,
      },
    ];
    if (occupiesHostileDefense)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: to,
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
        shields: withFullShieldsV7(state, state.shields, [gunner]),
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// ------------------------------------------------------------- Prune ---

/**
 * The Dwarf revision: drops the `surfacedThisTurn` and `bombedThisTurn`
 * entries of units that left the board. Every reducer output runs through
 * this before validation.
 */
export function prunedDwarfV7(state: GameStateV7): GameStateV7 {
  if (state.surfacedThisTurn.length === 0 && state.bombedThisTurn.length === 0)
    return state;
  const onBoard = new Set(
    state.units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
  );
  const surfacedThisTurn = state.surfacedThisTurn.filter((unitId) =>
    onBoard.has(unitId),
  );
  const bombedThisTurn = state.bombedThisTurn.filter((unitId) =>
    onBoard.has(unitId),
  );
  return surfacedThisTurn.length === state.surfacedThisTurn.length &&
    bombedThisTurn.length === state.bombedThisTurn.length
    ? state
    : { ...state, surfacedThisTurn, bombedThisTurn };
}

function isExploredBy(
  state: Pick<GameStateV7, "players">,
  playerId: PlayerId,
  at: CoordV7,
): boolean {
  const player = state.players.find((candidate) => candidate.id === playerId);
  return player?.explored.some((known) => same(known, at)) === true;
}
function nextSafeBy(value: number, delta: number): number {
  const result = value + delta;
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const key = (at: CoordV7): string => `${at.y},${at.x}`;
