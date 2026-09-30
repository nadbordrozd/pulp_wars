import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  PLAGUE_DAMAGE_V7,
  PLAGUE_DURATION_TURNS_V7,
  biteOfV7,
  isLivingOwnerV7,
  recordBittenRisingV7,
  withPlaguedV7,
} from "./afflictions";
import {
  economyEventsV7,
  growthEventsV7,
  recomputeLiveEconomyV7,
} from "./economy";
import type { CombatSplashEntryV7, DomainEventV7 } from "./events";
import { recordCombatDeathV7 } from "./graves";
import { unitSightRadiusAtV7 } from "./movement";
import type {
  CoordV7,
  GameStateV7,
  PlagueStatusV7,
  UnitStateV7,
} from "./types";

/**
 * Revision 14 Start Turn Plague (section 3.3), resolved for the player whose
 * turn starts, after activations and city actions reset and before Windmill
 * healing, with the revision-15 duration:
 *
 * 1. every plagued unit the player owns takes `min(2, hp)` damage, applied
 *    together from the pre-Plague state (`PLAGUE_DAMAGED`);
 * 2. each death, in (y, x, id) order, emits `UNIT_DIED` cause `PLAGUE` and
 *    either rises as a Bitten Zombie or leaves a Grave under the ordinary
 *    rules; no one gains kill credit;
 * 3. every surviving plagued unit of the player on its first plagued turn
 *    (`turnsRemaining` still 3), in unit-ID order, spreads its source to
 *    every adjacent living, non-plagued unit of any owner (`PLAGUE_SPREAD`);
 *    newly plagued units start with 3 turns and do not spread this turn;
 * 4. every surviving damaged entry loses one remaining turn; entries that
 *    reach 0 expire (`PLAGUE_EXPIRED`), so a unit can be plagued again later;
 * 5. risings reveal their sight for their owners, and the live economy is
 *    recomputed when a unit died.
 */
export function resolveStartTurnPlagueV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const plaguedIds = new Set(state.plagued.map((entry) => entry.unitId));
  const sufferers = state.units
    .filter(
      (unit) =>
        unit.ownerId === playerId && unit.hp > 0 && plaguedIds.has(unit.id),
    )
    .sort(compareUnitsByTile);
  if (sufferers.length === 0) return { state, events: [] };
  const events: DomainEventV7[] = [];
  const results: CombatSplashEntryV7[] = sufferers.map((unit) => {
    const damage = Math.min(PLAGUE_DAMAGE_V7, unit.hp);
    return {
      unitId: unit.id,
      at: { x: unit.at.x, y: unit.at.y },
      damage,
      dies: damage >= unit.hp,
    };
  });
  events.push({ kind: "PLAGUE_DAMAGED", playerId, results });
  const damage = new Map(
    results.map((entry) => [entry.unitId, entry.damage] as const),
  );
  let units: UnitStateV7[] = state.units
    .map((unit) =>
      damage.has(unit.id)
        ? { ...unit, hp: unit.hp - (damage.get(unit.id) ?? 0) }
        : unit,
    )
    .filter((unit) => unit.hp > 0);
  let graves = state.graves;
  let nextEntityId = state.nextEntityId;
  const risings: UnitStateV7[] = [];
  for (const entry of results) {
    if (!entry.dies) continue;
    const victim = state.units.find((unit) => unit.id === entry.unitId);
    if (victim === undefined) throw new RangeError("INVALID_STATE");
    const bite = biteOfV7(state, victim.id);
    if (bite !== undefined && victim.form === "LAND") {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        state,
        bite,
        victim,
        "PLAGUE",
        allocation.id,
        exhaustedActivationV7(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    } else
      graves = recordCombatDeathV7(state, graves, victim, "PLAGUE", events);
  }
  const dead = new Set(
    results.filter((entry) => entry.dies).map((entry) => entry.unitId),
  );
  const damaged = new Set(results.map((entry) => entry.unitId));
  const survivingPlague = state.plagued.filter(
    (entry) => !dead.has(entry.unitId),
  );
  const alreadyPlagued = new Set(survivingPlague.map((entry) => entry.unitId));
  // Revision 15: only a unit on its first plagued turn spreads.
  const sourceOf = new Map(
    survivingPlague
      .filter(
        (entry) =>
          damaged.has(entry.unitId) &&
          entry.turnsRemaining === PLAGUE_DURATION_TURNS_V7,
      )
      .map((entry) => [entry.unitId, entry.sourceUnitId] as const),
  );
  const spread: Pick<PlagueStatusV7, "unitId" | "sourceUnitId">[] = [];
  const spreaders = units
    .filter((unit) => unit.ownerId === playerId && sourceOf.has(unit.id))
    .sort((left, right) => left.id - right.id);
  for (const spreader of spreaders) {
    const sourceUnitId = sourceOf.get(spreader.id);
    if (sourceUnitId === undefined) continue;
    for (const unit of [...units].sort((left, right) => left.id - right.id))
      if (
        unit.hp > 0 &&
        chebyshev(unit.at, spreader.at) === 1 &&
        !alreadyPlagued.has(unit.id) &&
        isLivingOwnerV7(state, unit.ownerId)
      ) {
        alreadyPlagued.add(unit.id);
        spread.push({ unitId: unit.id, sourceUnitId });
      }
  }
  if (spread.length > 0) {
    const at = new Map(units.map((unit) => [unit.id, unit.at] as const));
    events.push({
      kind: "PLAGUE_SPREAD",
      playerId,
      results: spread
        .map((entry) => {
          const coord = at.get(entry.unitId) as CoordV7;
          return { unitId: entry.unitId, at: { x: coord.x, y: coord.y } };
        })
        .sort(
          (left, right) =>
            left.at.y - right.at.y ||
            left.at.x - right.at.x ||
            left.unitId - right.unitId,
        ),
    });
  }
  // Revision 15: every damaged survivor counts one turn down; at 0 it expires.
  const counted: PlagueStatusV7[] = [];
  const expired: UnitId[] = [];
  for (const entry of survivingPlague) {
    if (!damaged.has(entry.unitId)) counted.push(entry);
    else if (entry.turnsRemaining > 1)
      counted.push({ ...entry, turnsRemaining: entry.turnsRemaining - 1 });
    else expired.push(entry.unitId);
  }
  if (expired.length > 0)
    events.push({ kind: "PLAGUE_EXPIRED", playerId, unitIds: expired });
  let players = state.players;
  for (const risen of risings) {
    // Revision 13 section 5.4: a rising reveals its sight for its owner.
    const risenState = { ...state, players, units } as GameStateV7;
    const reveal = revealAround(
      risenState,
      risen.ownerId,
      risen.at,
      unitSightRadiusAtV7(risenState, risen),
    );
    players = players.map((player) =>
      player.id === risen.ownerId
        ? { ...player, explored: reveal.explored }
        : player,
    );
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: risen.ownerId,
        tiles: reveal.revealed,
      });
  }
  let next: GameStateV7 = {
    ...state,
    nextEntityId,
    players,
    units,
    graves,
    plagued: withPlaguedV7(counted, spread),
    bitten: state.bitten.filter((entry) => !dead.has(entry.unitId)),
  };
  if (dead.size > 0) {
    const economy = recomputeLiveEconomyV7(
      state,
      { board: next.board, cities: next.cities, units },
      next.populationContributions,
    );
    events.push(
      ...economyEventsV7(economy.changes),
      ...growthEventsV7(economy.changes),
    );
    next = {
      ...next,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    };
  }
  return { state: next, events };
}

/** The exhausted activation every rising carries (revision 13 section 5.4). */
export function exhaustedActivationV7(): UnitStateV7["activation"] {
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

function revealAround(
  state: GameStateV7,
  playerId: PlayerId,
  center: CoordV7,
  radius: number,
): { explored: readonly CoordV7[]; revealed: readonly CoordV7[] } {
  const player = state.players.find((item) => item.id === playerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  const known = new Set(player.explored.map(key));
  const explored = [...player.explored];
  const revealed: CoordV7[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(state.board.height - 1, center.y + radius);
    y += 1
  )
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(state.board.width - 1, center.x + radius);
      x += 1
    )
      if (!known.has(key({ x, y }))) {
        explored.push({ x, y });
        revealed.push({ x, y });
      }
  return {
    explored: explored.sort(compareCoords),
    revealed: revealed.sort(compareCoords),
  };
}

function compareUnitsByTile(left: UnitStateV7, right: UnitStateV7): number {
  return left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id;
}
const compareCoords = (a: CoordV7, b: CoordV7): number =>
  a.y - b.y || a.x - b.x;
const key = (at: CoordV7): string => `${at.y},${at.x}`;
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
