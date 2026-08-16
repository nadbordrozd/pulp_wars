import type { RuleError } from "../commands/errors";
import { ruleError } from "../commands/errors";
import type {
  BoardState,
  Coord,
  MatchSetup,
  RandomState,
  TileState,
} from "../model/types";
import { compareCoords } from "../model/order";
import { nextBounded, nextUint32 } from "../random/random";

export const MAX_MAP_GENERATION_ATTEMPTS = 256;

export type MapInvariantCode =
  | "TILE_LAYOUT"
  | "SETTLEMENT_COUNT"
  | "SETTLEMENT_TERRITORY"
  | "SETTLEMENT_SPACING"
  | "CAPITAL_SPACING"
  | "CAPITAL_GRASS_NEIGHBORS"
  | "CAPITALS_DISCONNECTED"
  | "MOUNTAIN_COUNT"
  | "FOREST_COUNT"
  | "FRUIT_TERRAIN"
  | "ORE_TERRAIN"
  | "ANIMAL_TERRAIN"
  | "IMPROVEMENT_TERRAIN"
  | "RESOURCE_OUTSIDE_TERRITORY"
  | "ANIMAL_ABSENT"
  | "SETTLEMENT_OPPORTUNITY_MINIMUM";

export interface GeneratedMap {
  readonly board: BoardState;
  readonly capitals: readonly Coord[];
  readonly villages: readonly Coord[];
  /** Capital coordinate indexed by player seat. */
  readonly capitalAssignments: readonly Coord[];
  /** Player seat indices in turn order. */
  readonly turnOrderSeats: readonly number[];
  readonly random: RandomState;
  readonly attempt: number;
}

export type GenerateMapResult =
  | { readonly ok: true; readonly map: GeneratedMap }
  | { readonly ok: false; readonly error: RuleError };

interface Candidate {
  readonly board: BoardState;
  readonly capitals: readonly Coord[];
  readonly villages: readonly Coord[];
  readonly capitalAssignments: readonly Coord[];
  readonly turnOrderSeats: readonly number[];
  readonly random: RandomState;
}

const STANDARD_NEUTRAL_VILLAGES: Readonly<
  Record<MatchSetup["aiCount"], number>
> = {
  1: 4,
  2: 6,
  3: 8,
};

const HUGE_TOTAL_SETTLEMENTS = 30;
const LARGE_TOTAL_SETTLEMENTS = 20;

export function generateInitialMap(
  setup: MatchSetup,
  initialRandom: RandomState,
): GenerateMapResult {
  let random = initialRandom;
  let lastFailure: MapInvariantCode = "TILE_LAYOUT";
  const neutralVillages = neutralVillageCount(setup);
  for (let attempt = 1; attempt <= MAX_MAP_GENERATION_ATTEMPTS; attempt += 1) {
    const generated = generateCandidate(setup, random);
    random = generated.random;
    const failures = validateMapInvariants(
      generated.board,
      setup.aiCount + 1,
      neutralVillages,
    );
    if (failures.length === 0) {
      return {
        ok: true,
        map: { ...generated, attempt },
      };
    }
    lastFailure = failures[0] ?? "TILE_LAYOUT";
  }
  return {
    ok: false,
    error: ruleError("MAP_GENERATION_FAILED", {
      seed: setup.seed,
      width: setup.width,
      height: setup.height,
      attempts: MAX_MAP_GENERATION_ATTEMPTS,
      lastFailure,
    }),
  };
}

export function validateMapInvariants(
  board: BoardState,
  expectedCapitals: number,
  expectedVillages: number,
): readonly MapInvariantCode[] {
  const failures: MapInvariantCode[] = [];
  const expectedCells = board.width * board.height;
  if (
    board.tiles.length !== expectedCells ||
    board.tiles.some(
      (tile, index) =>
        tile.at.x !== index % board.width ||
        tile.at.y !== Math.floor(index / board.width) ||
        tile.at.x < 0 ||
        tile.at.y < 0 ||
        tile.at.x >= board.width ||
        tile.at.y >= board.height,
    )
  ) {
    failures.push("TILE_LAYOUT");
  }

  const capitals = board.tiles.filter((tile) => tile.site === "CAPITAL");
  const villages = board.tiles.filter((tile) => tile.site === "VILLAGE");
  const settlements = [...capitals, ...villages];
  if (
    capitals.length !== expectedCapitals ||
    villages.length !== expectedVillages
  ) {
    failures.push("SETTLEMENT_COUNT");
  }
  if (
    settlements.some(
      (tile) =>
        tile.terrain !== "GRASS" ||
        tile.at.x < 2 ||
        tile.at.y < 2 ||
        tile.at.x >= board.width - 2 ||
        tile.at.y >= board.height - 2,
    )
  ) {
    failures.push("SETTLEMENT_TERRITORY");
  }
  if (
    hasPairCloserThan(
      settlements.map((tile) => tile.at),
      3,
    )
  ) {
    failures.push("SETTLEMENT_SPACING");
  }
  if (
    hasPairCloserThan(
      capitals.map((tile) => tile.at),
      Math.floor(board.width / 2),
    )
  ) {
    failures.push("CAPITAL_SPACING");
  }

  for (const capital of capitals) {
    if (
      neighbors(board, capital.at).filter((tile) => tile.terrain !== "MOUNTAIN")
        .length < 4
    ) {
      failures.push("CAPITAL_GRASS_NEIGHBORS");
      break;
    }
  }
  if (
    !capitalsConnected(
      board,
      capitals.map((tile) => tile.at),
    )
  ) {
    failures.push("CAPITALS_DISCONNECTED");
  }

  const expectedMountains = roundHalfUpPercent(expectedCells, 18);
  if (
    board.tiles.filter((tile) => tile.terrain === "MOUNTAIN").length !==
    expectedMountains
  ) {
    failures.push("MOUNTAIN_COUNT");
  }
  const expectedForests = roundHalfUpPercent(expectedCells, 24);
  if (
    board.tiles.filter((tile) => tile.terrain === "FOREST").length !==
    expectedForests
  ) {
    failures.push("FOREST_COUNT");
  }
  if (
    board.tiles.some(
      (tile) => tile.resource === "FRUIT" && tile.terrain !== "GRASS",
    )
  ) {
    failures.push("FRUIT_TERRAIN");
  }
  if (
    board.tiles.some(
      (tile) => tile.resource === "ORE" && tile.terrain !== "MOUNTAIN",
    )
  ) {
    failures.push("ORE_TERRAIN");
  }
  if (
    board.tiles.some(
      (tile) => tile.resource === "ANIMAL" && tile.terrain !== "FOREST",
    )
  ) {
    failures.push("ANIMAL_TERRAIN");
  }
  if (
    board.tiles.some(
      (tile) =>
        (tile.improvement === "MINE" &&
          (tile.terrain !== "MOUNTAIN" || tile.resource !== null)) ||
        (tile.improvement === "LUMBER_MILL" &&
          (tile.terrain !== "FOREST" || tile.resource !== null)),
    )
  ) {
    failures.push("IMPROVEMENT_TERRAIN");
  }
  if (
    board.tiles.some(
      (tile) => tile.territoryCenter === null && tile.resource !== null,
    )
  ) {
    failures.push("RESOURCE_OUTSIDE_TERRITORY");
  }
  if (!board.tiles.some((tile) => tile.resource === "ANIMAL")) {
    failures.push("ANIMAL_ABSENT");
  }
  for (const settlement of settlements) {
    const territory = board.tiles.filter(
      (tile) =>
        tile.territoryCenter !== null &&
        sameCoord(tile.territoryCenter, settlement.at),
    );
    const opportunities = territory.filter(
      (tile) =>
        !sameCoord(tile.at, settlement.at) &&
        (tile.resource !== null || tile.terrain === "FOREST"),
    );
    if (
      territory.length !== 9 ||
      opportunities.length < 2 ||
      settlement.resource !== null ||
      settlement.improvement !== null ||
      settlement.terrain !== "GRASS"
    ) {
      failures.push("SETTLEMENT_OPPORTUNITY_MINIMUM");
      break;
    }
  }
  return failures;
}

export function chebyshevDistance(left: Coord, right: Coord): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function generateCandidate(
  setup: MatchSetup,
  initialRandom: RandomState,
): Candidate {
  let random = initialRandom;
  let offset = 0;
  if (setup.width === 16) {
    const draw = nextBounded(random, 3);
    offset = draw.value;
    random = draw.random;
  }
  const axis: number[] = [];
  for (
    let coordinate = 2 + offset;
    coordinate < setup.width - 2;
    coordinate += 3
  ) {
    axis.push(coordinate);
  }
  const low = axis[0];
  const high = axis.at(-1);
  if (low === undefined || high === undefined) {
    throw new RangeError("Supported board must contain settlement lattice");
  }
  const cornerShuffle = shuffle(
    [
      { x: low, y: low },
      { x: high, y: low },
      { x: low, y: high },
      { x: high, y: high },
    ],
    random,
  );
  random = cornerShuffle.random;
  const capitals = cornerShuffle.values.slice(0, setup.aiCount + 1);
  const capitalKeys = new Set(capitals.map(coordKey));
  const remainingSites = axis
    .flatMap((y) => axis.map((x) => ({ x, y })))
    .filter((coord) => !capitalKeys.has(coordKey(coord)))
    .sort(compareCoords);
  const villageShuffle = shuffle(remainingSites, random);
  random = villageShuffle.random;
  const villages = villageShuffle.values.slice(0, neutralVillageCount(setup));
  const settlementSites = [...capitals, ...villages].sort(compareCoords);

  // Seat assignment and turn order remain distinct deterministic shuffles and
  // precede all terrain/resource draws in the ruleset-4 stream.
  const capitalAssignmentShuffle = shuffle(capitals, random);
  random = capitalAssignmentShuffle.random;
  const turnOrderShuffle = shuffle(
    Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
    random,
  );
  random = turnOrderShuffle.random;

  const territoryByKey = new Map<string, Coord>();
  for (const settlement of settlementSites) {
    for (const coord of coordsInRadius(
      setup.width,
      setup.height,
      settlement,
      1,
    )) {
      territoryByKey.set(coordKey(coord), settlement);
    }
  }
  const settlementByKey = new Map<string, "CAPITAL" | "VILLAGE">();
  for (const coord of capitals) settlementByKey.set(coordKey(coord), "CAPITAL");
  for (const coord of villages) settlementByKey.set(coordKey(coord), "VILLAGE");

  const nonSettlement: Coord[] = [];
  for (let y = 0; y < setup.height; y += 1) {
    for (let x = 0; x < setup.width; x += 1) {
      const coord = { x, y };
      const key = coordKey(coord);
      if (!settlementByKey.has(key)) nonSettlement.push(coord);
    }
  }
  const terrainShuffle = shuffle(nonSettlement.sort(compareCoords), random);
  random = terrainShuffle.random;
  const mountainTarget = roundHalfUpPercent(setup.width * setup.height, 18);
  const forestTarget = roundHalfUpPercent(setup.width * setup.height, 24);
  const mountainKeys = new Set(
    terrainShuffle.values.slice(0, mountainTarget).map(coordKey),
  );
  const forestKeys = new Set(
    terrainShuffle.values
      .slice(mountainTarget, mountainTarget + forestTarget)
      .map(coordKey),
  );
  const resourceByKey = new Map<string, TileState["resource"]>();
  for (const settlement of settlementSites) {
    const territory = coordsInRadius(setup.width, setup.height, settlement, 1)
      .filter((coord) => !sameCoord(coord, settlement))
      .sort(compareCoords);
    for (const coord of territory) {
      const draw = nextUint32(random);
      random = draw.random;
      const key = coordKey(coord);
      if (mountainKeys.has(key) && draw.value < 0x80000000) {
        resourceByKey.set(key, "ORE");
      } else if (forestKeys.has(key) && draw.value < 0x80000000) {
        resourceByKey.set(key, "ANIMAL");
      } else if (
        !mountainKeys.has(key) &&
        !forestKeys.has(key) &&
        draw.value < 0x60000000
      ) {
        resourceByKey.set(key, "FRUIT");
      }
    }
  }

  const tiles: TileState[] = [];
  for (let y = 0; y < setup.height; y += 1) {
    for (let x = 0; x < setup.width; x += 1) {
      const at = { x, y };
      const key = coordKey(at);
      const terrain: TileState["terrain"] = mountainKeys.has(key)
        ? "MOUNTAIN"
        : forestKeys.has(key)
          ? "FOREST"
          : "GRASS";
      tiles.push({
        at,
        terrain,
        resource: resourceByKey.get(key) ?? null,
        improvement: null,
        site: settlementByKey.get(key) ?? null,
        territoryCenter: territoryByKey.get(key) ?? null,
        territoryCityId: null,
      });
    }
  }
  return {
    board: { width: setup.width, height: setup.height, tiles },
    capitals: [...capitals].sort(compareCoords),
    villages: [...villages].sort(compareCoords),
    capitalAssignments: capitalAssignmentShuffle.values,
    turnOrderSeats: turnOrderShuffle.values,
    random,
  };
}

export function neutralVillageCount(setup: MatchSetup): number {
  return setup.width === 25
    ? HUGE_TOTAL_SETTLEMENTS - (setup.aiCount + 1)
    : setup.width === 20
      ? LARGE_TOTAL_SETTLEMENTS - (setup.aiCount + 1)
      : STANDARD_NEUTRAL_VILLAGES[setup.aiCount];
}

function shuffle<T>(
  values: readonly T[],
  initialRandom: RandomState,
): {
  readonly values: readonly T[];
  readonly random: RandomState;
} {
  const result = [...values];
  let random = initialRandom;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = nextBounded(random, index + 1);
    random = draw.random;
    const other = draw.value;
    const currentValue = result[index];
    const otherValue = result[other];
    if (currentValue === undefined || otherValue === undefined) {
      throw new RangeError("Shuffle index escaped collection");
    }
    result[index] = otherValue;
    result[other] = currentValue;
  }
  return { values: result, random };
}

function roundHalfUpPercent(value: number, percent: number): number {
  return Math.floor((value * percent + 50) / 100);
}

function hasPairCloserThan(values: readonly Coord[], minimum: number): boolean {
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const first = values[left];
      const second = values[right];
      if (
        first !== undefined &&
        second !== undefined &&
        chebyshevDistance(first, second) < minimum
      ) {
        return true;
      }
    }
  }
  return false;
}

function capitalsConnected(
  board: BoardState,
  capitals: readonly Coord[],
): boolean {
  const first = capitals[0];
  if (first === undefined) return false;
  const visited = new Set([coordKey(first)]);
  const queue: Coord[] = [first];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) continue;
    for (const tile of neighbors(board, current)) {
      const key = coordKey(tile.at);
      if (tile.terrain !== "MOUNTAIN" && !visited.has(key)) {
        visited.add(key);
        queue.push(tile.at);
      }
    }
  }
  return capitals.every((coord) => visited.has(coordKey(coord)));
}

function neighbors(board: BoardState, center: Coord): readonly TileState[] {
  return coordsInRadius(board.width, board.height, center, 1)
    .filter((coord) => !sameCoord(coord, center))
    .map((coord) => board.tiles[coord.y * board.width + coord.x])
    .filter((tile): tile is TileState => tile !== undefined);
}

function coordsInRadius(
  width: number,
  height: number,
  center: Coord,
  radius: number,
): readonly Coord[] {
  const coords: Coord[] = [];
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
      coords.push({ x, y });
    }
  }
  return coords;
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}
