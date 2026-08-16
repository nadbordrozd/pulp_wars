import { sortCoords } from "../model/order";
import type { PlayerId } from "../model/ids";
import type { BoardState, Coord, GameState } from "../model/types";
import { arePlayersAllied } from "../rules/relationships";

export interface RevealResult {
  readonly explored: readonly Coord[];
  readonly revealed: readonly Coord[];
}

export interface UnitVisionInputs {
  readonly hasClimbing: boolean;
}

export function isExplored(explored: readonly Coord[], at: Coord): boolean {
  return explored.some((coord) => sameCoord(coord, at));
}

export function revealRadius(
  board: BoardState,
  explored: readonly Coord[],
  center: Coord,
  radius: number,
): RevealResult {
  if (!Number.isSafeInteger(radius) || radius < 0) {
    throw new RangeError("Reveal radius must be a non-negative safe integer");
  }
  const known = new Map(explored.map((coord) => [coordKey(coord), coord]));
  const revealed: Coord[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(board.height - 1, center.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(board.width - 1, center.x + radius);
      x += 1
    ) {
      const at = { x, y };
      const key = coordKey(at);
      if (!known.has(key)) {
        known.set(key, at);
        revealed.push(at);
      }
    }
  }
  return {
    explored: sortCoords([...known.values()]),
    revealed: sortCoords(revealed),
  };
}

export function revealAfterUnitStep(
  board: BoardState,
  explored: readonly Coord[],
  at: Coord,
  inputs: UnitVisionInputs,
): RevealResult {
  const tile = board.tiles[at.y * board.width + at.x];
  if (tile === undefined || !sameCoord(tile.at, at)) {
    throw new RangeError("Unit vision coordinate is outside the board");
  }
  const radius = tile.terrain === "MOUNTAIN" && inputs.hasClimbing ? 2 : 1;
  return revealRadius(board, explored, at, radius);
}

export function revealAfterUnitStepForPlayer(
  state: GameState,
  playerId: PlayerId,
  explored: readonly Coord[],
  at: Coord,
  inputs: UnitVisionInputs,
): RevealResult {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (tile === undefined || !sameCoord(tile.at, at)) {
    throw new RangeError("Unit vision coordinate is outside the board");
  }
  const radius = tile.terrain === "MOUNTAIN" && inputs.hasClimbing ? 2 : 1;
  return revealRadiusForPlayer(state, playerId, explored, at, radius);
}

/** Reveal while preserving old knowledge and clipping only newly allied land. */
export function revealRadiusForPlayer(
  state: GameState,
  playerId: PlayerId,
  explored: readonly Coord[],
  center: Coord,
  radius: number,
): RevealResult {
  const reveal = revealRadius(state.board, explored, center, radius);
  if (
    state.setup.aiMode !== "COOPERATIVE" ||
    playerId === state.humanPlayerId
  ) {
    return reveal;
  }
  const allowedRevealed = reveal.revealed.filter(
    (at) => !isAlliedTerritory(state, playerId, at),
  );
  const allowedKeys = new Set([
    ...explored.map(coordKey),
    ...allowedRevealed.map(coordKey),
  ]);
  return {
    explored: reveal.explored.filter((at) => allowedKeys.has(coordKey(at))),
    revealed: allowedRevealed,
  };
}

export function isAlliedTerritory(
  state: GameState,
  playerId: PlayerId,
  at: Coord,
): boolean {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (tile?.territoryCityId === null || tile?.territoryCityId === undefined)
    return false;
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  return (
    city !== undefined &&
    arePlayersAllied(
      state.setup.aiMode,
      state.humanPlayerId,
      playerId,
      city.ownerId,
    )
  );
}

function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}
