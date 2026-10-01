import type { PlayerId, UnitId } from "../model/ids";
import { arePlayersAlliedV7 } from "./economy";
import { tileAtV7 } from "./spatial-economy";
import type {
  CoordV7,
  GameStateV7,
  TerrainIdV7,
  UnitFormV7,
  UnitStateV7,
} from "./types";
import type { PlayerViewV7 } from "./view";

/**
 * Revision 19 Stampede lane geometry (docs/product/
 * RULESET_7_REVISION_19_DINOSAURS.md section 7.1), shared by canonical
 * resolution and the public queries. Every fact a lane reads is public on an
 * explored tile, and a lane must be explored, so both read the same facts.
 */

/** The Stampede distances: the target is exactly 2 or 3 tiles away. */
export const STAMPEDE_DISTANCES_V7 = Object.freeze([2, 3] as const);

/** The eight lane directions in (dy, dx) order. */
export const STAMPEDE_DIRECTIONS_V7: readonly CoordV7[] = Object.freeze(
  [
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ].map((direction) => Object.freeze(direction)),
);

/** What a lane reads about one tile (null terrain when unexplored). */
export interface StampedeTileFactsV7 {
  readonly explored: boolean;
  readonly terrain: TerrainIdV7 | null;
  readonly territoryOwnerId: PlayerId | null;
}

export interface StampedeUnitFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly form: UnitFormV7;
}

/** The board facts of one observer (the actor's state, or a public view). */
export interface StampedeBoardFactsV7 {
  /** Undefined off the board. */
  readonly tile: (at: CoordV7) => StampedeTileFactsV7 | undefined;
  readonly hasChest: (at: CoordV7) => boolean;
  readonly unitAt: (at: CoordV7) => StampedeUnitFactsV7 | undefined;
  readonly allied: (left: PlayerId, right: PlayerId) => boolean;
}

export type StampedeLaneV7 =
  | {
      readonly ok: true;
      /** The tiles strictly between the Triceratops and the target. */
      readonly lane: readonly CoordV7[];
      /** The last lane tile, next to the target. */
      readonly standAt: CoordV7;
      readonly runTiles: 1 | 2;
      /** The unit step from the Triceratops toward the target. */
      readonly direction: CoordV7;
    }
  | { readonly ok: false; readonly reason: "NOT_IN_LANE" | "LANE_BLOCKED" };

/**
 * The lane from `from` to `to`, or why there is none. `to` must be exactly 2
 * or 3 tiles away in one of the eight directions; every lane tile must be
 * open (section 7.1): explored, Grass, outside territory allied to the
 * actor, free of a treasure chest, and free of units, except that a lane
 * tile other than the stand tile may hold the actor's own units or Eggs.
 * `unexploredOpen` treats an unexplored lane tile as open (the threat
 * envelope of a hostile Triceratops, "open as far as the viewer can see").
 */
export function stampedeLaneV7(
  facts: StampedeBoardFactsV7,
  actorOwnerId: PlayerId,
  from: CoordV7,
  to: CoordV7,
  unexploredOpen = false,
): StampedeLaneV7 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  if (
    (n !== 2 && n !== 3) ||
    (Math.abs(dx) !== 0 && Math.abs(dx) !== n) ||
    (Math.abs(dy) !== 0 && Math.abs(dy) !== n)
  )
    return { ok: false, reason: "NOT_IN_LANE" };
  const direction = { x: Math.sign(dx), y: Math.sign(dy) };
  const lane: CoordV7[] = [];
  for (let step = 1; step < n; step += 1)
    lane.push({
      x: from.x + direction.x * step,
      y: from.y + direction.y * step,
    });
  for (const [index, at] of lane.entries()) {
    const tile = facts.tile(at);
    if (tile === undefined) return { ok: false, reason: "LANE_BLOCKED" };
    const occupant = facts.unitAt(at);
    const standTile = index === lane.length - 1;
    if (
      occupant !== undefined &&
      (standTile || occupant.ownerId !== actorOwnerId)
    )
      return { ok: false, reason: "LANE_BLOCKED" };
    if (!tile.explored) {
      if (unexploredOpen) continue;
      return { ok: false, reason: "LANE_BLOCKED" };
    }
    if (
      tile.terrain !== "GRASS" ||
      (tile.territoryOwnerId !== null &&
        facts.allied(actorOwnerId, tile.territoryOwnerId)) ||
      facts.hasChest(at)
    )
      return { ok: false, reason: "LANE_BLOCKED" };
  }
  const standAt = lane.at(-1);
  if (standAt === undefined) return { ok: false, reason: "NOT_IN_LANE" };
  return {
    ok: true,
    lane,
    standAt,
    runTiles: (n - 1) as 1 | 2,
    direction,
  };
}

/** Whether a unit of this form may be the target of a Stampede. */
export function isStampedeTargetFormV7(form: UnitFormV7): boolean {
  return form === "LAND" || form === "EGG";
}

/** The lane facts the actor `actorId` knows in canonical state. */
export function stateStampedeFactsV7(
  state: GameStateV7,
  actorId: PlayerId,
): StampedeBoardFactsV7 {
  const actor = state.players.find((player) => player.id === actorId);
  if (actor === undefined) throw new RangeError("INVALID_STATE");
  const explored = new Set(actor.explored.map(key));
  return {
    tile: (at) => {
      const tile = tileAtV7(state.board, at);
      if (tile === undefined) return undefined;
      if (!explored.has(key(at)))
        return { explored: false, terrain: null, territoryOwnerId: null };
      return {
        explored: true,
        terrain: tile.terrain,
        territoryOwnerId:
          tile.territoryCityId === null
            ? null
            : (state.cities.find((city) => city.id === tile.territoryCityId)
                ?.ownerId ?? null),
      };
    },
    hasChest: (at) => state.treasureChests.some((chest) => same(chest, at)),
    unitAt: (at) =>
      state.units.find((unit: UnitStateV7) => unit.hp > 0 && same(unit.at, at)),
    allied: (left, right) => arePlayersAlliedV7(state, left, right),
  };
}

/** The lane facts of a public view (its viewer's explored tiles and units). */
export function viewStampedeFactsV7(view: PlayerViewV7): StampedeBoardFactsV7 {
  return {
    tile: (at) => {
      if (
        at.x < 0 ||
        at.y < 0 ||
        at.x >= view.board.width ||
        at.y >= view.board.height
      )
        return undefined;
      const tile = view.board.tiles[at.y * view.board.width + at.x];
      if (tile === undefined) return undefined;
      return tile.explored
        ? {
            explored: true,
            terrain: tile.terrain,
            territoryOwnerId: tile.territoryOwnerId,
          }
        : { explored: false, terrain: null, territoryOwnerId: null };
    },
    hasChest: (at) => view.treasureChests.some((chest) => same(chest, at)),
    unitAt: (at) => view.units.find((unit) => unit.hp > 0 && same(unit.at, at)),
    allied: (left, right) => arePlayersAlliedV7(view, left, right),
  };
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7): string => `${at.y},${at.x}`;
