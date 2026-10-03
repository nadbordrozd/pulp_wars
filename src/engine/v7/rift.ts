import type { RandomState } from "../model/types";
import { nextBounded, randomState, seedFromText } from "../random/random";
import type { BoardStateV7, CoordV7, TerrainIdV7 } from "./types";

/**
 * The Rift (`pulp_wars-9s0.5`, docs/product/RULESET_7_RIFT.md): a land
 * terrain (it keeps its biome) on which nothing is built and only flyers
 * stand. Entry goes through the shared `canEnterTerrainV7`; this module
 * holds the "is this tile a Rift" reads that every other rule shares, and
 * the Rift placement of map generation (section 5).
 */
export function isRiftTerrainV7(
  terrain: TerrainIdV7 | null | undefined,
): boolean {
  return terrain === "RIFT";
}

/** Whether the tile at `at` (on the board) is a Rift. */
export function riftAtV7(
  board: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly {
      readonly at: CoordV7;
      readonly terrain?: TerrainIdV7 | null;
    }[];
  },
  at: CoordV7,
): boolean {
  if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height)
    return false;
  const tile = board.tiles[at.y * board.width + at.x];
  return (
    tile !== undefined &&
    tile.at.x === at.x &&
    tile.at.y === at.y &&
    tile.terrain === "RIFT"
  );
}

/** The Rift tiles of a board in (y, x) order. */
export function riftTilesV7(board: BoardStateV7): readonly CoordV7[] {
  return board.tiles
    .filter((tile) => tile.terrain === "RIFT")
    .map((tile) => tile.at);
}

// ------------------------------------------------------- Generation ---

/** A placed Rift: its three tiles in (y, x) order and its orientation. */
export interface RiftSegmentV7 {
  readonly orientation: "HORIZONTAL" | "VERTICAL";
  readonly tiles: readonly [CoordV7, CoordV7, CoordV7];
}

/**
 * RULESET_7_RIFT.md section 5.2: the number of Rifts a generated board of
 * this width aims for, from the Rift stream's first draw. 11 and 14: none
 * (no draw); 16: one with probability 1/2; 20: one (no draw); 25: two with
 * probability 1/3, otherwise one. The count is a target: fewer are placed
 * when the board has no legal site left (section 5.3).
 */
export function riftTargetCountV7(
  width: number,
  random: RandomState,
): { readonly count: 0 | 1 | 2; readonly random: RandomState } {
  if (width === 16) {
    const draw = nextBounded(random, 2);
    return { count: draw.value === 0 ? 1 : 0, random: draw.random };
  }
  if (width === 20) return { count: 1, random };
  if (width === 25) {
    const draw = nextBounded(random, 3);
    return { count: draw.value === 0 ? 2 : 1, random: draw.random };
  }
  return { count: 0, random };
}

/**
 * Section 5.1: the Rift stream. Rift placement draws from its own Mulberry32
 * stream seeded from the setup seed, never from the match stream, so the
 * match PRNG, the treasure chests, and every other generated feature are the
 * same as without Rifts.
 */
export function riftRandomStateV7(seed: number): RandomState {
  return randomState(seedFromText(`pulp-wars-rift:${seed}`));
}

/** Minimum Chebyshev distance from a Rift tile to a capital (section 5.3). */
export const RIFT_CAPITAL_DISTANCE_V7 = 3;
/** Minimum Chebyshev distance from a Rift tile to a village (section 5.3). */
export const RIFT_VILLAGE_DISTANCE_V7 = 2;
/** Minimum Chebyshev distance between tiles of two Rifts (section 5.3). */
export const RIFT_SPACING_V7 = 4;

const LAND_TERRAINS_V7: readonly TerrainIdV7[] = [
  "GRASS",
  "FOREST",
  "MOUNTAIN",
];

/**
 * Every 1 x 3 segment of a `width` x `height` board whose tiles lie off the
 * board's edge ring, in (y, x) order of the first tile, horizontal before
 * vertical.
 */
export function riftSegmentsV7(
  width: number,
  height: number,
): readonly RiftSegmentV7[] {
  const result: RiftSegmentV7[] = [];
  for (let y = 1; y < height - 1; y += 1)
    for (let x = 1; x < width - 1; x += 1) {
      if (x + 2 < width - 1)
        result.push({
          orientation: "HORIZONTAL",
          tiles: [
            { x, y },
            { x: x + 1, y },
            { x: x + 2, y },
          ],
        });
      if (y + 2 < height - 1)
        result.push({
          orientation: "VERTICAL",
          tiles: [
            { x, y },
            { x, y: y + 1 },
            { x, y: y + 2 },
          ],
        });
    }
  return result;
}

/** The facts a Rift site is checked against (section 5.3). */
export interface RiftSiteContextV7 {
  readonly board: BoardStateV7;
  readonly capitals: readonly CoordV7[];
  readonly villages: readonly CoordV7[];
  readonly treasureChests: readonly CoordV7[];
}

/**
 * Section 5.3, the local rules: every tile of the segment is off the edge
 * ring and is resource-free Grass, Forest, or Mountain with no site,
 * improvement, Road, Field Defense, or treasure chest; every tile of the
 * segment's eight-neighbour ring is land and no Rift (so a Rift never
 * touches water); no capital is within Chebyshev 2 and no village within
 * Chebyshev 1 of a segment tile; another Rift is at least
 * {@link RIFT_SPACING_V7} away; and Grass, Forest, and Mountain each stay
 * on the board.
 */
export function riftSiteLocallyLegalV7(
  context: RiftSiteContextV7,
  segment: RiftSegmentV7,
): boolean {
  const { board } = context;
  const { width, height } = board;
  const tileOf = (at: CoordV7) =>
    at.x < 0 || at.y < 0 || at.x >= width || at.y >= height
      ? undefined
      : board.tiles[at.y * width + at.x];
  for (const at of segment.tiles) {
    if (at.x < 1 || at.y < 1 || at.x > width - 2 || at.y > height - 2)
      return false;
    const tile = tileOf(at);
    if (
      tile === undefined ||
      tile.biome === null ||
      !LAND_TERRAINS_V7.includes(tile.terrain) ||
      tile.resource !== null ||
      tile.improvement !== null ||
      tile.site !== null ||
      tile.road ||
      tile.fieldDefense ||
      context.treasureChests.some((chest) => sameAt(chest, at))
    )
      return false;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const near = tileOf({ x: at.x + dx, y: at.y + dy });
        if (
          near === undefined ||
          near.biome === null ||
          near.terrain === "RIFT"
        )
          return false;
      }
    if (
      context.capitals.some(
        (capital) => chebyshevAt(capital, at) < RIFT_CAPITAL_DISTANCE_V7,
      ) ||
      context.villages.some(
        (village) => chebyshevAt(village, at) < RIFT_VILLAGE_DISTANCE_V7,
      ) ||
      board.tiles.some(
        (tile) =>
          tile.terrain === "RIFT" && chebyshevAt(tile.at, at) < RIFT_SPACING_V7,
      )
    )
      return false;
  }
  return LAND_TERRAINS_V7.every((terrain) =>
    board.tiles.some(
      (tile) =>
        tile.terrain === terrain &&
        !segment.tiles.some((at) => sameAt(at, tile.at)),
    ),
  );
}

/**
 * Section 5.4, connectivity: the Rift tiles of `after` that `before` does
 * not have split no land component of `before`, under both land routes the
 * rules use: all land (a ground route with Engineering) and land without
 * Mountains (a ground route without it, the route treasure chests and Dry
 * Land capitals are checked on). Movement is eight-way.
 */
export function riftKeepsLandConnectedV7(
  before: BoardStateV7,
  after: BoardStateV7,
): boolean {
  for (const lowland of [false, true]) {
    const passable =
      (board: BoardStateV7) =>
      (index: number): boolean => {
        const tile = board.tiles[index];
        return (
          tile !== undefined &&
          tile.biome !== null &&
          tile.terrain !== "RIFT" &&
          (!lowland || tile.terrain !== "MOUNTAIN")
        );
      };
    const beforeLabels = componentLabels(before, passable(before));
    const afterLabels = componentLabels(after, passable(after));
    const mapping = new Map<number, number>();
    for (let index = 0; index < before.tiles.length; index += 1) {
      const was = beforeLabels[index] ?? -1;
      const now = afterLabels[index] ?? -1;
      if (was < 0 || now < 0) continue;
      const seen = mapping.get(was);
      if (seen === undefined) mapping.set(was, now);
      else if (seen !== now) return false;
    }
  }
  return true;
}

function componentLabels(
  board: BoardStateV7,
  passable: (index: number) => boolean,
): readonly number[] {
  const { width, height } = board;
  const labels = new Array<number>(board.tiles.length).fill(-1);
  let next = 0;
  for (let start = 0; start < labels.length; start += 1) {
    if (labels[start] !== -1 || !passable(start)) continue;
    labels[start] = next;
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor] as number;
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const near = ny * width + nx;
          if (labels[near] !== -1 || !passable(near)) continue;
          labels[near] = next;
          queue.push(near);
        }
    }
    next += 1;
  }
  return labels;
}

/** The board with `segment` turned into a Rift (each tile keeps its biome). */
export function withRiftV7(
  board: BoardStateV7,
  segment: RiftSegmentV7,
): BoardStateV7 {
  return {
    ...board,
    tiles: board.tiles.map((tile) =>
      segment.tiles.some((at) => sameAt(at, tile.at))
        ? { ...tile, terrain: "RIFT" as const }
        : tile,
    ),
  };
}

/**
 * Section 5: places the Rifts of a generated board. The target count comes
 * from {@link riftTargetCountV7}; each Rift is drawn uniformly from the
 * locally legal segments (in {@link riftSegmentsV7} order) with the Rift
 * stream; a drawn segment that would split a land component is dropped and
 * the draw repeats over the remaining ones. With no legal segment left,
 * fewer Rifts are placed. A board with no Rift is returned unchanged.
 */
export function placeRiftsV7(
  seed: number,
  context: RiftSiteContextV7,
): {
  readonly board: BoardStateV7;
  readonly rifts: readonly RiftSegmentV7[];
} {
  const target = riftTargetCountV7(
    context.board.width,
    riftRandomStateV7(seed),
  );
  let random = target.random;
  let board = context.board;
  const rifts: RiftSegmentV7[] = [];
  if (target.count === 0) return { board, rifts };
  const all = riftSegmentsV7(board.width, board.height);
  while (rifts.length < target.count) {
    const current = { ...context, board };
    const candidates = all.filter((segment) =>
      riftSiteLocallyLegalV7(current, segment),
    );
    let placed = false;
    while (candidates.length > 0) {
      const draw = nextBounded(random, candidates.length);
      random = draw.random;
      const segment = candidates[draw.value] as RiftSegmentV7;
      const next = withRiftV7(board, segment);
      if (riftKeepsLandConnectedV7(board, next)) {
        board = next;
        rifts.push(segment);
        placed = true;
        break;
      }
      candidates.splice(draw.value, 1);
    }
    if (!placed) break;
  }
  return { board, rifts };
}

function sameAt(a: CoordV7, b: CoordV7): boolean {
  return a.x === b.x && a.y === b.y;
}
function chebyshevAt(a: CoordV7, b: CoordV7): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
