import {
  isExplored,
  revealAfterUnitStepForPlayer,
  revealRadiusForPlayer,
  isAlliedTerritory,
} from "../fog/exploration";
import type { PlayerId } from "../model/ids";
import { compareCoords, sortCoords } from "../model/order";
import type { Coord, GameState, UnitState } from "../model/types";
import { arePlayersHostile } from "../rules/relationships";

export type MovementFailureReason =
  | "EMPTY_PATH"
  | "BUDGET_EXCEEDED"
  | "NOT_ADJACENT"
  | "OUT_OF_BOUNDS"
  | "OCCUPIED"
  | "CLIMBING_REQUIRED"
  | "UNEXPLORED_INTERMEDIATE"
  | "MOUNTAIN_STOPS_MOVE"
  | "FOREST_STOPS_MOVE"
  | "ZOC_STOPS_MOVE"
  | "ALLY_TERRITORY_FORBIDDEN";

export type MovementPathResult =
  | {
      readonly legal: true;
      readonly explored: readonly Coord[];
      readonly revealed: readonly Coord[];
      readonly stopped: boolean;
      readonly destination: Coord;
      readonly traversedPath: readonly Coord[];
      readonly interruption: {
        readonly at: Coord;
        readonly reason: "OCCUPIED" | "CLIMBING_REQUIRED" | "ZOC";
      } | null;
    }
  | { readonly legal: false; readonly reason: MovementFailureReason };

export interface ReachablePath {
  readonly destination: Coord;
  readonly path: readonly Coord[];
}

export function validateMovementPath(
  state: GameState,
  unit: UnitState,
  path: readonly Coord[],
  budget: number,
): MovementPathResult {
  if (path.length === 0) return { legal: false, reason: "EMPTY_PATH" };
  if (path.length > budget) {
    return { legal: false, reason: "BUDGET_EXCEEDED" };
  }
  const player = state.players.find(
    (candidate) => candidate.id === unit.ownerId,
  );
  if (player === undefined) {
    throw new RangeError("Movement unit owner disappeared");
  }
  const hasClimbing = player.researchedTechs.includes("CLIMBING");
  let explored = player.explored;
  const revealed: Coord[] = [];
  let current = unit.at;
  const traversedPath: Coord[] = [];
  for (let index = 0; index < path.length; index += 1) {
    const step = path[index];
    if (step === undefined) throw new RangeError("Movement path has a hole");
    if (movementDistance(current, step) !== 1) {
      return { legal: false, reason: "NOT_ADJACENT" };
    }
    const tile = tileAt(state, step);
    if (tile === undefined) return { legal: false, reason: "OUT_OF_BOUNDS" };
    // Blind-step semantics are fixed at command intent time. A prior path step
    // may reveal this coordinate, but that must not turn hidden occupancy into
    // a rejection or allow movement through what was initially fogged.
    const wasExplored = isExplored(
      state.setup.aiMode === "COOPERATIVE" ? player.explored : explored,
      step,
    );
    if (isAlliedTerritory(state, unit.ownerId, step)) {
      return { legal: false, reason: "ALLY_TERRITORY_FORBIDDEN" };
    }
    const occupied = state.units.some(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.hp > 0 &&
        sameCoord(candidate.at, step),
    );
    const wallOccupied = state.chocolateWalls.some((wall) =>
      sameCoord(wall.at, step),
    );
    const climbingRequired = tile.terrain === "MOUNTAIN" && !hasClimbing;
    if (occupied || wallOccupied || climbingRequired) {
      if (wasExplored) {
        return {
          legal: false,
          reason: occupied || wallOccupied ? "OCCUPIED" : "CLIMBING_REQUIRED",
        };
      }
      // Blind movement is an observation-safe intent. Discovering an
      // obstruction accepts and consumes the Move, reveals around the attempted
      // tile, and leaves the unit on the last traversed tile. Query callers can
      // therefore offer the same intent for identical PlayerViews without
      // leaking hidden occupancy or terrain through rejection.
      const reveal = revealRadiusForPlayer(
        state,
        unit.ownerId,
        explored,
        step,
        1,
      );
      explored = reveal.explored;
      revealed.push(...reveal.revealed);
      return {
        legal: true,
        explored,
        revealed: sortCoords(revealed),
        stopped: true,
        destination: current,
        traversedPath,
        interruption: {
          at: step,
          reason: occupied || wallOccupied ? "OCCUPIED" : "CLIMBING_REQUIRED",
        },
      };
    }
    const previouslyExplored = explored;
    const reveal = revealAfterUnitStepForPlayer(
      state,
      unit.ownerId,
      explored,
      step,
      {
        hasClimbing,
      },
    );
    explored = reveal.explored;
    revealed.push(...reveal.revealed);
    const entersZoc = isInEnemyZoc(state, unit.ownerId, step, explored);
    const entersNewlyRevealedZoc =
      entersZoc && !isInEnemyZoc(state, unit.ownerId, step, previouslyExplored);
    const stops =
      !wasExplored ||
      tile.terrain === "MOUNTAIN" ||
      tile.terrain === "FOREST" ||
      entersZoc;
    if (stops && index < path.length - 1) {
      if (entersNewlyRevealedZoc) {
        traversedPath.push(step);
        return {
          legal: true,
          explored,
          revealed: sortCoords(revealed),
          stopped: true,
          destination: step,
          traversedPath,
          interruption: { at: step, reason: "ZOC" },
        };
      }
      return {
        legal: false,
        reason: !wasExplored
          ? "UNEXPLORED_INTERMEDIATE"
          : tile.terrain === "MOUNTAIN"
            ? "MOUNTAIN_STOPS_MOVE"
            : tile.terrain === "FOREST"
              ? "FOREST_STOPS_MOVE"
              : "ZOC_STOPS_MOVE",
      };
    }
    current = step;
    traversedPath.push(step);
    if (stops) {
      return {
        legal: true,
        explored,
        revealed: sortCoords(revealed),
        stopped: true,
        destination: current,
        traversedPath,
        interruption: null,
      };
    }
  }
  return {
    legal: true,
    explored,
    revealed: sortCoords(revealed),
    stopped: false,
    destination: current,
    traversedPath,
    interruption: null,
  };
}

export function reachableMovementPaths(
  state: GameState,
  unit: UnitState,
  budget: number,
): readonly ReachablePath[] {
  const queue: (readonly Coord[])[] = [[]];
  const visited = new Set<string>([coordKey(unit.at)]);
  const result: ReachablePath[] = [];
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    if (path.length >= budget) continue;
    for (const destination of adjacentCoords(state, current)) {
      const key = coordKey(destination);
      if (visited.has(key)) continue;
      const candidate = [...path, destination];
      const validation = validateMovementPath(state, unit, candidate, budget);
      if (!validation.legal) continue;
      visited.add(key);
      result.push({ destination, path: candidate });
      if (!validation.stopped) queue.push(candidate);
    }
  }
  return result.sort((left, right) =>
    compareCoords(left.destination, right.destination),
  );
}

export function movementDistance(left: Coord, right: Coord): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function adjacentCoords(state: GameState, center: Coord): readonly Coord[] {
  const coords: Coord[] = [];
  for (let y = center.y - 1; y <= center.y + 1; y += 1) {
    for (let x = center.x - 1; x <= center.x + 1; x += 1) {
      const at = { x, y };
      if (!sameCoord(at, center) && tileAt(state, at) !== undefined)
        coords.push(at);
    }
  }
  return coords.sort(compareCoords);
}

function isInEnemyZoc(
  state: GameState,
  ownerId: PlayerId,
  at: Coord,
  explored: readonly Coord[],
): boolean {
  return state.units.some(
    (candidate) =>
      candidate.hp > 0 &&
      arePlayersHostile(
        state.setup.aiMode,
        state.humanPlayerId,
        ownerId,
        candidate.ownerId,
      ) &&
      isExplored(explored, candidate.at) &&
      movementDistance(candidate.at, at) === 1,
  );
}

function tileAt(state: GameState, at: Coord) {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= state.board.width ||
    at.y >= state.board.height
  ) {
    return undefined;
  }
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return tile !== undefined && sameCoord(tile.at, at) ? tile : undefined;
}

function coordKey(at: Coord): string {
  return `${at.x},${at.y}`;
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}
