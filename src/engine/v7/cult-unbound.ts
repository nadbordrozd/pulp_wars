import type { PlayerId, UnitId } from "../model/ids";
import type { SummonedUnitRefV7 } from "../rules/ruleset-v7";
import {
  isDaemonBreedV7,
  isNeutralOwnerV7,
  NEUTRAL_OWNER_ID_V7,
  type CoordV7,
  type DaemonBreedV7,
  type GameStateV7,
  type MonsterStateV7,
  type UnitActivationV7,
  type UnitFormV7,
  type UnitStateV7,
} from "./types";
import { tileOccupiedV7 } from "./units";

/**
 * The Cultists of the Ancient Ones, Unbound (`pulp_wars-mch9.6`, the fourth
 * Cult engine bead; docs/product/RULESET_7_CULTISTS.md sections 6.4 and
 * 6.5): a daemon whose channel failed belongs to nobody. It is a neutral
 * unit of its own breed in the `monsters` registration, rampages at once
 * and in every neutral turn, is Furious for the turn it broke loose in, and
 * may be bound again by a Cult seat whose strands on it reach its Control
 * in one turn.
 *
 * This module holds what the canonical state and a player's view share: who
 * a rampage goes for and by which path (so the eye mark of the public query
 * and the reducer agree), and the state changes of becoming Unbound and of
 * being bound again. The reducer resolves the attacks
 * (src/engine/v7/reducer.ts, `resolveRampageV7`); the strands that count
 * toward a binding are `bindingStrandsV7` (src/engine/v7/cult-channel.ts).
 */

/** The unit facts a rampage reads (state and public units). */
export interface RampageUnitFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

/**
 * Whether a rampaging daemon may stand on a tile. A view answers `UNKNOWN`
 * for a tile its viewer has not explored (the plan treats it as closed and
 * says it is not exact).
 */
export type RampageTileV7 = "FREE" | "BLOCKED" | "UNKNOWN";

/** The board a rampage is planned on. */
export interface RampageBoardV7 {
  readonly width: number;
  readonly height: number;
  readonly tile: (at: CoordV7) => RampageTileV7;
}

/** The `monsters` entry of the Unbound daemon `unitId`, if it is one. */
export function unboundEntryV7<M extends Pick<MonsterStateV7, "unitId">>(
  lookup: { readonly monsters?: readonly M[] },
  unitId: UnitId,
): (M & Pick<MonsterStateV7, "unbound">) | undefined {
  const monsters = lookup.monsters;
  if (monsters === undefined || monsters.length === 0) return undefined;
  const entry = monsters.find((candidate) => candidate.unitId === unitId) as
    (M & Pick<MonsterStateV7, "unbound">) | undefined;
  return entry?.unbound === undefined ? undefined : entry;
}

/**
 * Section 6.4: whether the unit is an Unbound daemon: a summoned unit with a
 * Control that the neutral owner holds.
 */
export function unitIsUnboundV7(
  unit: SummonedUnitRefV7 & { readonly ownerId: PlayerId },
): boolean {
  return (
    isNeutralOwnerV7(unit.ownerId) &&
    (unit.summoned === "HORROR" || unit.summoned === "HERALD")
  );
}

/**
 * Sections 6.4 and 9.3: whether the unit is a wild unit of the Cult's
 * making: an Unbound daemon (the Tentacle joins with `pulp_wars-mch9.8`).
 * Its kills pay nobody, and a Chosen it attacks and kills is no Martyr.
 */
export function unitIsWildV7(
  unit: SummonedUnitRefV7 & { readonly ownerId: PlayerId },
): boolean {
  return isNeutralOwnerV7(unit.ownerId) && unit.summoned !== undefined;
}

/**
 * Section 6.5: whether the Unbound daemon `unitId` is Furious: it broke
 * loose in a Start Turn check and that seat's turn has not ended.
 */
export function daemonIsFuriousV7(
  lookup: { readonly monsters?: readonly MonsterStateV7[] },
  unitId: UnitId,
): boolean {
  return unboundEntryV7(lookup, unitId)?.unbound?.furious === true;
}

// ------------------------------------------------------- The rampage ---

/**
 * Section 6.4, rule 1: whether a rampage may go for `unit`: a unit of a
 * player on the board, never a neutral unit (the Spider, a camp guard,
 * Bigfoot, another Unbound daemon, a Tentacle) and never an afloat one (a
 * ship or an embarked unit). An Egg is a target like any unit. A burrowed
 * unit is not on the board, so it is in no list this reads.
 */
export function rampageTargetableV7(unit: RampageUnitFactsV7): boolean {
  return (
    unit.hp > 0 &&
    !isNeutralOwnerV7(unit.ownerId) &&
    (unit.form === "LAND" || unit.form === "EGG")
  );
}

/**
 * Section 6.4, rule 1: the unit a rampage of the daemon on `from` goes for:
 * the nearest targetable unit by Chebyshev distance; ties go to a unit of
 * the seat that summoned it, then to the fewest Hit Points, then to the
 * lowest unit ID. With `maximumDistance` only units that near count (the
 * Herald's second attack: 1). Null when there is nobody.
 */
export function rampageTargetV7<U extends RampageUnitFactsV7>(
  units: readonly U[],
  daemon: { readonly id: UnitId },
  from: CoordV7,
  summonerPlayerId: PlayerId,
  maximumDistance = Number.POSITIVE_INFINITY,
): U | null {
  let best: U | null = null;
  let bestDistance = 0;
  for (const unit of units) {
    if (unit.id === daemon.id || !rampageTargetableV7(unit)) continue;
    const distance = chebyshev(unit.at, from);
    if (distance > maximumDistance) continue;
    if (
      best === null ||
      distance < bestDistance ||
      (distance === bestDistance &&
        compareTies(unit, best, summonerPlayerId) < 0)
    ) {
      best = unit;
      bestDistance = distance;
    }
  }
  return best;
}

function compareTies(
  left: RampageUnitFactsV7,
  right: RampageUnitFactsV7,
  summonerPlayerId: PlayerId,
): number {
  const leftOwn = left.ownerId === summonerPlayerId ? 0 : 1;
  const rightOwn = right.ownerId === summonerPlayerId ? 0 : 1;
  return leftOwn - rightOwn || left.hp - right.hp || left.id - right.id;
}

/** One rampage as the board stands (section 6.4, rules 1 and 2). */
export interface RampagePlanV7<U extends RampageUnitFactsV7> {
  /** The unit it goes for, or null when no unit is on the board for it. */
  readonly target: U | null;
  /** The tiles it steps through, in order (empty when it stays). */
  readonly path: readonly CoordV7[];
  /** Whether it ends next to its target, and so attacks it. */
  readonly attacks: boolean;
}

/**
 * Section 6.4, rules 1 and 2: the rampage of the daemon `daemon` with Move
 * `move` on `board`. It goes for its target ({@link rampageTargetV7}) by a
 * shortest walk over the tiles it may stand on to a tile next to the
 * target, at most `move` steps, each step to the first of the eight
 * neighbours in (y, x) order that shortens the walk; it stops as soon as it
 * stands next to the target. When no walk leads there (the target is across
 * water, behind a wall of units, or ringed), it goes to the tile within
 * `move` steps that is nearest to the target by Chebyshev distance (fewer
 * steps, then (y, x), break a tie), which may be the tile it stands on.
 *
 * Zones of control, Roads, Snow, and terrain never stop or slow it: a thing
 * that belongs to nobody is held by nobody's line, and it strides.
 */
export function rampagePlanV7<U extends RampageUnitFactsV7>(
  board: RampageBoardV7,
  units: readonly U[],
  daemon: { readonly id: UnitId; readonly at: CoordV7 },
  move: number,
  summonerPlayerId: PlayerId,
): RampagePlanV7<U> {
  const target = rampageTargetV7(units, daemon, daemon.at, summonerPlayerId);
  if (target === null) return { target: null, path: [], attacks: false };
  if (chebyshev(daemon.at, target.at) === 1)
    return { target, path: [], attacks: true };
  const free = (at: CoordV7): boolean =>
    same(at, daemon.at) || board.tile(at) === "FREE";
  const keyOf = (at: CoordV7): number => at.y * board.width + at.x;
  // Breadth-first from the tiles next to the target: `walk` is the number
  // of steps from a tile to the nearest of them.
  const walk = new Map<number, number>();
  let frontier: CoordV7[] = [];
  for (const near of neighbours(board, target.at))
    if (free(near)) {
      walk.set(keyOf(near), 0);
      frontier.push(near);
    }
  while (frontier.length > 0 && !walk.has(keyOf(daemon.at))) {
    const next: CoordV7[] = [];
    for (const at of frontier) {
      const steps = (walk.get(keyOf(at)) ?? 0) + 1;
      for (const near of neighbours(board, at)) {
        if (walk.has(keyOf(near)) || !free(near)) continue;
        walk.set(keyOf(near), steps);
        next.push(near);
      }
    }
    frontier = next;
  }
  const path: CoordV7[] = [];
  let current = daemon.at;
  if (walk.has(keyOf(current))) {
    for (let step = 0; step < move; step += 1) {
      const left = walk.get(keyOf(current)) ?? 0;
      if (left === 0) break;
      const next = neighbours(board, current).find(
        (near) => free(near) && walk.get(keyOf(near)) === left - 1,
      );
      if (next === undefined) break;
      path.push(next);
      current = next;
    }
    return { target, path, attacks: chebyshev(current, target.at) === 1 };
  }
  // No walk reaches the target: the reachable tile nearest to it.
  const reached = new Map<number, readonly CoordV7[]>([[keyOf(current), []]]);
  let ring: { readonly at: CoordV7; readonly path: readonly CoordV7[] }[] = [
    { at: current, path: [] },
  ];
  let best: { readonly at: CoordV7; readonly path: readonly CoordV7[] } = {
    at: current,
    path: [],
  };
  for (let step = 0; step < move; step += 1) {
    const next: typeof ring = [];
    for (const node of ring)
      for (const near of neighbours(board, node.at)) {
        if (reached.has(keyOf(near)) || !free(near)) continue;
        const entry = { at: near, path: [...node.path, near] };
        reached.set(keyOf(near), entry.path);
        next.push(entry);
        const gain =
          chebyshev(near, target.at) - chebyshev(best.at, target.at) ||
          entry.path.length - best.path.length ||
          near.y - best.at.y ||
          near.x - best.at.x;
        if (gain < 0) best = entry;
      }
    ring = next;
  }
  return {
    target,
    path: best.path,
    attacks: chebyshev(best.at, target.at) === 1,
  };
}

/**
 * Section 6.4, rules 2 and 3: the board of a rampage on the canonical
 * state. The daemon may stand on Grass, Forest, and Mountain (it strides;
 * never water, ice, or a Rift), never on a settlement center, a Dimensional
 * Gate or any other curiosity tile, or a treasure chest, and never where a
 * unit, a mound, or a Barricade is (it walks round a Barricade).
 */
export function rampageBoardV7(
  state: Pick<
    GameStateV7,
    | "board"
    | "units"
    | "burrowed"
    | "barricades"
    | "treasureChests"
    | "curiosities"
  >,
  daemonId: UnitId,
): RampageBoardV7 {
  const { board } = state;
  return {
    width: board.width,
    height: board.height,
    tile: (at) => {
      if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height)
        return "BLOCKED";
      const tile = board.tiles[at.y * board.width + at.x];
      return tile !== undefined &&
        rampageTerrainV7(tile.terrain) &&
        tile.site === null &&
        !tileOccupiedV7(state, at, daemonId) &&
        !state.treasureChests.some((chest) => same(chest, at)) &&
        !state.curiosities.some((curiosity) => same(curiosity.at, at))
        ? "FREE"
        : "BLOCKED";
    },
  };
}

/** Section 6.4: the terrain a rampaging daemon walks on. */
export function rampageTerrainV7(terrain: string): boolean {
  return terrain === "GRASS" || terrain === "FOREST" || terrain === "MOUNTAIN";
}

// ----------------------------------------------------- Unbound, bound ---

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
 * Section 6.4, the result of a failed check (and of its seat's
 * elimination): the daemon `daemonId` belongs to the neutral owner and is a
 * neutral unit of its own breed in `monsters`, with the seat that commanded
 * it as its summoner. It keeps its role, its `summoned` field, its Hit
 * Points, and its kills, and loses every status (Frozen, Stuck, Toothache,
 * and the marks of a hit this turn), as no status sticks to a neutral unit.
 * Its activation is fresh (the rampage that follows a check uses it).
 */
export function withDaemonUnboundV7(
  state: GameStateV7,
  daemonId: UnitId,
  summonerPlayerId: PlayerId,
  furious: boolean,
): GameStateV7 {
  const daemon = state.units.find((unit) => unit.id === daemonId);
  const breed = daemon?.summoned;
  if (
    daemon === undefined ||
    breed === undefined ||
    !isDaemonBreedV7(breed as DaemonBreedV7)
  )
    throw new RangeError("INVALID_STATE");
  const without = <T extends { readonly unitId: UnitId }>(
    list: readonly T[],
  ): readonly T[] =>
    list.some((entry) => entry.unitId === daemonId)
      ? list.filter((entry) => entry.unitId !== daemonId)
      : list;
  const withoutId = (list: readonly UnitId[]): readonly UnitId[] =>
    list.includes(daemonId) ? list.filter((id) => id !== daemonId) : list;
  const entry: MonsterStateV7 = {
    unitId: daemonId,
    breed: breed as DaemonBreedV7,
    home: { x: daemon.at.x, y: daemon.at.y },
    provokedBy: [],
    unbound: { summonerPlayerId, furious },
  };
  return {
    ...state,
    units: state.units.map((unit): UnitStateV7 =>
      unit.id === daemonId
        ? {
            ...unit,
            ownerId: NEUTRAL_OWNER_ID_V7,
            captureEligible: false,
            activation: FRESH_ACTIVATION_V7,
          }
        : unit,
    ),
    monsters: [
      ...state.monsters.filter((other) => other.unitId !== daemonId),
      entry,
    ].sort((left, right) => left.unitId - right.unitId),
    frozen: without(state.frozen),
    stuck: without(state.stuck),
    toothache: without(state.toothache),
    splattedThisTurn: withoutId(state.splattedThisTurn),
    terrorThisTurn: withoutId(state.terrorThisTurn),
    huntedThisTurn: withoutId(state.huntedThisTurn),
    bombedThisTurn: withoutId(state.bombedThisTurn),
    ninthUnit: state.ninthUnit.crackedThisTurn.includes(daemonId)
      ? {
          ...state.ninthUnit,
          crackedThisTurn: withoutId(state.ninthUnit.crackedThisTurn),
        }
      : state.ninthUnit,
  };
}

/**
 * Section 6.5: the Unbound daemon `daemonId` is bound to `playerId`: that
 * seat commands it, exhausted until its next turn, and it leaves the
 * `monsters` registration. The strands on it stay and count for the seat's
 * next check.
 */
export function withDaemonBoundV7(
  state: GameStateV7,
  daemonId: UnitId,
  playerId: PlayerId,
  exhausted: UnitActivationV7,
): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit): UnitStateV7 =>
      unit.id === daemonId
        ? { ...unit, ownerId: playerId, activation: exhausted }
        : unit,
    ),
    monsters: state.monsters.filter((entry) => entry.unitId !== daemonId),
  };
}

/**
 * Section 6.5: Furious ends with the turn of the seat in whose Start Turn
 * the daemon broke loose. At `actor`'s End Turn every daemon it summoned is
 * no longer Furious (and so is one whose summoner is out of the match).
 * Returns `state` itself when nothing changes.
 */
export function withFuriousEndedV7(
  state: GameStateV7,
  actor: PlayerId,
): GameStateV7 {
  if (!state.monsters.some((entry) => entry.unbound?.furious === true))
    return state;
  const active = new Set(
    state.players
      .filter((player) => player.status === "ACTIVE")
      .map((player) => player.id),
  );
  let changed = false;
  const monsters = state.monsters.map((entry) => {
    if (
      entry.unbound?.furious !== true ||
      (entry.unbound.summonerPlayerId !== actor &&
        active.has(entry.unbound.summonerPlayerId))
    )
      return entry;
    changed = true;
    return { ...entry, unbound: { ...entry.unbound, furious: false } };
  });
  return changed ? { ...state, monsters } : state;
}

function neighbours(
  board: { readonly width: number; readonly height: number },
  at: CoordV7,
): CoordV7[] {
  const result: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const near = { x: at.x + dx, y: at.y + dy };
      if (
        near.x >= 0 &&
        near.y >= 0 &&
        near.x < board.width &&
        near.y < board.height
      )
        result.push(near);
    }
  return result;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
