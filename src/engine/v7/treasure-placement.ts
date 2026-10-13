import { nextBounded, type RandomState } from "../random/random";

/**
 * Treasure placement of the accepted map. The function and its name come
 * unchanged from the retired Ruleset 6 map generator (`src/engine/v6/map.ts`,
 * bead pulp_wars-lky5): Ruleset 7 draws its chests with the same samples, so
 * every seed keeps its map.
 */

interface TreasureCoord {
  readonly x: number;
  readonly y: number;
}

interface TreasureTile {
  readonly at: TreasureCoord;
  readonly terrain: string;
  readonly site: unknown;
  readonly resource: unknown;
  readonly improvement: unknown;
}

interface TreasureBoard {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TreasureTile[];
}

export interface TreasurePlacementV6 {
  readonly treasureChests: readonly TreasureCoord[];
  readonly random: RandomState;
}

/** Frozen size-scaled neutral treasure count for generated square boards. */
function treasureChestCountV6(width: number): number {
  return width === 20 ? 4 : width === 25 ? 5 : 2;
}

/**
 * Samples without replacement from canonical reachable, passable empty land.
 * Only the accepted map consumes these draws; scarce candidates safely yield a
 * smaller collection.
 */
export function placeTreasureChestsV6(
  board: TreasureBoard,
  capitals: readonly TreasureCoord[],
  initialRandom: RandomState,
): TreasurePlacementV6 {
  const reachable = reachableLandKeysV6(board, capitals);
  const candidates = board.tiles
    .filter(
      (tile) =>
        reachable.has(coordKey(tile.at)) &&
        tile.terrain !== "MOUNTAIN" &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null,
    )
    .map((tile) => tile.at)
    .sort(compareCoordsV6);
  const selected: TreasureCoord[] = [];
  let random = initialRandom;
  const count = Math.min(treasureChestCountV6(board.width), candidates.length);
  for (
    let remaining = candidates.length;
    selected.length < count;
    remaining -= 1
  ) {
    const draw = nextBounded(random, remaining);
    random = draw.random;
    const chosen = candidates[draw.value];
    const last = candidates[remaining - 1];
    if (chosen === undefined || last === undefined)
      throw new RangeError("Treasure candidate selection failed");
    selected.push(chosen);
    candidates[draw.value] = last;
  }
  return {
    treasureChests: selected.sort(compareCoordsV6),
    random,
  };
}

function reachableLandKeysV6(
  board: TreasureBoard,
  starts: readonly TreasureCoord[],
): ReadonlySet<string> {
  const visited = new Set<string>();
  const queue = [...starts].sort(compareCoordsV6);
  for (const at of queue) visited.add(coordKey(at));
  for (let index = 0; index < queue.length; index += 1) {
    const at = queue[index];
    if (at === undefined) continue;
    for (const tile of [...neighbors(board, at)].sort((left, right) =>
      compareCoordsV6(left.at, right.at),
    )) {
      const key = coordKey(tile.at);
      if (tile.terrain === "MOUNTAIN" || visited.has(key)) continue;
      visited.add(key);
      queue.push(tile.at);
    }
  }
  return visited;
}

function neighbors(
  board: TreasureBoard,
  center: TreasureCoord,
): readonly TreasureTile[] {
  return coordsInRadius(board.width, board.height, center, 1)
    .filter((at) => !sameCoord(at, center))
    .map((at) => tileAt(board, at))
    .filter((tile): tile is TreasureTile => tile !== undefined);
}

function coordsInRadius(
  width: number,
  height: number,
  center: TreasureCoord,
  radius: number,
): readonly TreasureCoord[] {
  const coordinates: TreasureCoord[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(height - 1, center.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(width - 1, center.x + radius);
      x += 1
    ) {
      coordinates.push({ x, y });
    }
  }
  return coordinates;
}

function tileAt(
  board: TreasureBoard,
  at: TreasureCoord,
): TreasureTile | undefined {
  if (!onBoard(board, at)) return undefined;
  return board.tiles[at.y * board.width + at.x];
}

function onBoard(board: TreasureBoard, at: TreasureCoord): boolean {
  return at.x >= 0 && at.y >= 0 && at.x < board.width && at.y < board.height;
}

function compareCoordsV6(left: TreasureCoord, right: TreasureCoord): number {
  return left.y - right.y || left.x - right.x;
}

function sameCoord(left: TreasureCoord, right: TreasureCoord): boolean {
  return left.x === right.x && left.y === right.y;
}

function coordKey(at: TreasureCoord): string {
  return `${at.x},${at.y}`;
}
