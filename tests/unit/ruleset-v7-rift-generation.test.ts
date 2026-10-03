import { describe, expect, it } from "vitest";
import {
  RIFT_SPACING_V7,
  RULESET_7_ID,
  createInitialMapStateV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  riftKeepsLandConnectedV7,
  riftRandomStateV7,
  riftSegmentsV7,
  riftTargetCountV7,
  villageCountV7,
  withRiftV7,
  type AiCountV7,
  type BoardSizeV7,
  type BoardStateV7,
  type CoordV7,
  type GeneratedMapV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";

// The Rift's map generation (docs/product/RULESET_7_RIFT.md section 5).

const SHAPES = [
  [11, 1],
  [14, 1],
  [14, 2],
  [16, 1],
  [16, 2],
  [16, 3],
  [20, 1],
  [20, 2],
  [20, 3],
  [25, 1],
  [25, 2],
  [25, 3],
] as const;
const TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];

function setup(
  mapType: MapTypeV7,
  width: BoardSizeV7,
  aiCount: AiCountV7,
  seed: number,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    allowDuplicateFactions: true,
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    curiosities: false,
  };
}

const key = (at: CoordV7) => `${at.x},${at.y}`;
const chebyshev = (a: CoordV7, b: CoordV7) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** The board's Rifts as groups of four-connected Rift tiles. */
function riftGroups(board: BoardStateV7): CoordV7[][] {
  const rift = new Set(
    board.tiles
      .filter((tile) => tile.terrain === "RIFT")
      .map((tile) => key(tile.at)),
  );
  const seen = new Set<string>();
  const groups: CoordV7[][] = [];
  for (const tile of board.tiles) {
    if (!rift.has(key(tile.at)) || seen.has(key(tile.at))) continue;
    const group = [tile.at];
    seen.add(key(tile.at));
    for (let cursor = 0; cursor < group.length; cursor += 1) {
      const at = group[cursor] as CoordV7;
      for (const near of [
        { x: at.x + 1, y: at.y },
        { x: at.x - 1, y: at.y },
        { x: at.x, y: at.y + 1 },
        { x: at.x, y: at.y - 1 },
      ])
        if (rift.has(key(near)) && !seen.has(key(near))) {
          seen.add(key(near));
          group.push(near);
        }
    }
    groups.push(group);
  }
  return groups;
}

/** Eight-connected components of the cells `passable` admits. */
function labels(
  board: BoardStateV7,
  passable: (index: number) => boolean,
): number[] {
  const out = new Array<number>(board.tiles.length).fill(-1);
  let next = 0;
  for (let start = 0; start < out.length; start += 1) {
    if (out[start] !== -1 || !passable(start)) continue;
    out[start] = next;
    const queue = [start];
    while (queue.length > 0) {
      const index = queue.pop() as number;
      const x = index % board.width;
      const y = Math.floor(index / board.width);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height)
            continue;
          const near = ny * board.width + nx;
          if (out[near] === -1 && passable(near)) {
            out[near] = next;
            queue.push(near);
          }
        }
    }
    next += 1;
  }
  return out;
}

/** Every rule of sections 5.1 to 5.4, checked against the board without Rifts. */
function checkRifts(
  map: GeneratedMapV7,
  base: GeneratedMapV7,
  width: number,
): number {
  const { board } = map;
  // Only the Rift tiles' terrain differs; everything else is the base map.
  expect(map.capitals).toEqual(base.capitals);
  expect(map.villages).toEqual(base.villages);
  expect(map.treasureChests).toEqual(base.treasureChests);
  expect(map.turnOrderSeats).toEqual(base.turnOrderSeats);
  expect(map.random).toEqual(base.random);
  expect(map.attempts).toEqual(base.attempts);
  board.tiles.forEach((tile, index) => {
    const before = base.board.tiles[index];
    if (before === undefined) throw new Error("tile missing");
    if (tile.terrain !== "RIFT") expect(tile).toEqual(before);
    else {
      expect({ ...tile, terrain: before.terrain }).toEqual(before);
      expect(["GRASS", "FOREST", "MOUNTAIN"]).toContain(before.terrain);
      expect(before.resource).toBeNull();
      expect(before.site).toBeNull();
    }
  });
  const groups = riftGroups(board);
  for (const group of groups) {
    expect(group).toHaveLength(3);
    const xs = new Set(group.map((at) => at.x));
    const ys = new Set(group.map((at) => at.y));
    expect(xs.size === 1 || ys.size === 1).toBe(true);
    const span = Math.max(xs.size, ys.size);
    expect(span).toBe(3);
    for (const at of group) {
      expect(at.x).toBeGreaterThan(0);
      expect(at.y).toBeGreaterThan(0);
      expect(at.x).toBeLessThan(width - 1);
      expect(at.y).toBeLessThan(width - 1);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const near = board.tiles[(at.y + dy) * width + at.x + dx];
          // Every neighbour is land: a Rift never touches water.
          expect(near?.biome).not.toBeNull();
          if (near?.terrain === "RIFT")
            expect(
              group.some((own) => own.x === near.at.x && own.y === near.at.y),
            ).toBe(true);
        }
      for (const capital of map.capitals)
        expect(chebyshev(capital, at)).toBeGreaterThanOrEqual(3);
      for (const village of map.villages)
        expect(chebyshev(village, at)).toBeGreaterThanOrEqual(2);
      for (const chest of map.treasureChests)
        expect(key(chest)).not.toBe(key(at));
      for (const other of groups)
        if (other !== group)
          for (const there of other)
            expect(chebyshev(there, at)).toBeGreaterThanOrEqual(
              RIFT_SPACING_V7,
            );
    }
  }
  // No land component of the base board is split, with or without Mountains.
  for (const lowland of [false, true]) {
    const passable = (b: BoardStateV7) => (index: number) => {
      const tile = b.tiles[index];
      return (
        tile !== undefined &&
        tile.biome !== null &&
        tile.terrain !== "RIFT" &&
        (!lowland || tile.terrain !== "MOUNTAIN")
      );
    };
    const before = labels(base.board, passable(base.board));
    const after = labels(board, passable(board));
    const mapping = new Map<number, number>();
    before.forEach((label, index) => {
      const now = after[index] ?? -1;
      if (label < 0 || now < 0) return;
      const seen = mapping.get(label);
      if (seen === undefined) mapping.set(label, now);
      else expect(seen).toBe(now);
    });
  }
  return groups.length;
}

function generated(input: MatchSetupV7) {
  const map = generateInitialMapV7(input);
  const base = generateInitialMapWithVillageCountV7(
    input,
    villageCountV7(input),
    "PANGEA_COAST_RING",
  );
  if (!map.ok || !base.ok) throw new Error("generation failed");
  return { map: map.map, base: base.map };
}

describe("Rift placement (section 5)", () => {
  it.each(TYPES)(
    "%s: counts, shapes, sites, spacing, and connectivity on every size",
    (mapType) => {
      for (const [width, aiCount] of SHAPES)
        // Seeds 0-3 here; scripts/validate-ruleset7-naval-maps.ts sweeps 64.
        for (let seed = 0; seed < 4; seed += 1) {
          const { map, base } = generated(setup(mapType, width, aiCount, seed));
          const count = checkRifts(map, base, width);
          const target = riftTargetCountV7(
            width,
            riftRandomStateV7(seed),
          ).count;
          expect(count).toBeLessThanOrEqual(target);
          if (width <= 14) expect(count).toBe(0);
          // A board without a Rift is byte-identical to the board before
          // the Rift.
          if (count === 0) expect(map).toEqual(base);
        }
    },
  );

  it("the target count by width (section 5.2)", () => {
    const counts = (width: number) => {
      const seen = new Map<number, number>();
      for (let seed = 0; seed < 600; seed += 1) {
        const { count } = riftTargetCountV7(width, riftRandomStateV7(seed));
        seen.set(count, (seen.get(count) ?? 0) + 1);
      }
      return seen;
    };
    expect([...counts(11).keys()]).toEqual([0]);
    expect([...counts(14).keys()]).toEqual([0]);
    expect([...counts(20).keys()]).toEqual([1]);
    const sixteen = counts(16);
    expect([...sixteen.keys()].sort()).toEqual([0, 1]);
    expect(sixteen.get(1) ?? 0).toBeGreaterThan(240);
    expect(sixteen.get(1) ?? 0).toBeLessThan(360);
    const big = counts(25);
    expect([...big.keys()].sort()).toEqual([1, 2]);
    expect(big.get(2) ?? 0).toBeGreaterThan(150);
    expect(big.get(2) ?? 0).toBeLessThan(250);
    // 11 and 14 draw nothing: the Rift stream is untouched.
    const random = riftRandomStateV7(7);
    expect(riftTargetCountV7(14, random).random).toBe(random);
    expect(riftTargetCountV7(20, random).random).toBe(random);
  });

  it("places one Rift on every Dry Land, Pangea, and Lakes 20 x 20 board", () => {
    for (const mapType of ["DRY_LAND", "PANGEA", "LAKES"] as const)
      for (let seed = 0; seed < 6; seed += 1) {
        const { map } = generated(setup(mapType, 20, 2, seed));
        expect(riftGroups(map.board)).toHaveLength(1);
      }
  });

  it("is deterministic and independent of the factions", () => {
    const input = setup("DRY_LAND", 25, 1, 3);
    const first = generateInitialMapV7(input);
    expect(generateInitialMapV7(input)).toEqual(first);
    expect(
      generateInitialMapV7({ ...input, factions: ["MARTIAN", "UNDEAD"] }),
    ).toEqual(first);
  });

  it("the Showcase has no Rift", () => {
    const result = createInitialMapStateV7({
      ...setup("SHOWCASE", 16, 3, 1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.state.board.tiles.some((tile) => tile.terrain === "RIFT"),
    ).toBe(false);
  });

  it("the initial state of a Rift board parses and keeps capitals' rings free", () => {
    const result = createInitialMapStateV7(setup("DRY_LAND", 25, 3, 4));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { board, cities } = result.state;
    expect(board.tiles.some((tile) => tile.terrain === "RIFT")).toBe(true);
    for (const tile of board.tiles)
      if (tile.terrain === "RIFT") {
        expect(tile.territoryCityId).toBeNull();
        for (const city of cities)
          expect(chebyshev(city.at, tile.at)).toBeGreaterThanOrEqual(3);
      }
  });

  it("segments: every straight 1 x 3 run off the edge ring, horizontal first", () => {
    const segments = riftSegmentsV7(6, 6);
    // Interior 4 x 4: 2 horizontal starts per row x 4 rows, and as many vertical.
    expect(segments).toHaveLength(16);
    expect(segments[0]).toEqual({
      orientation: "HORIZONTAL",
      tiles: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    });
    expect(segments[1]?.orientation).toBe("VERTICAL");
  });

  it("connectivity: a Rift across a one-cell land bridge is refused", () => {
    // A 7 x 7 board: land rows y = 1..5 joined only through the column x = 3.
    const tiles = Array.from({ length: 49 }, (_, index) => {
      const at = { x: index % 7, y: Math.floor(index / 7) };
      const land = at.x === 3 || at.y === 1 || at.y === 5;
      return {
        at,
        biome: land ? ("PLAINS" as const) : null,
        terrain: land ? ("GRASS" as const) : ("DEEP_WATER" as const),
        resource: null,
        improvement: null,
        road: false,
        fieldDefense: false,
        site: null,
        territoryCityId: null,
      };
    });
    const board = { width: 7, height: 7, tiles } as unknown as BoardStateV7;
    const bridge = withRiftV7(board, {
      orientation: "VERTICAL",
      tiles: [
        { x: 3, y: 2 },
        { x: 3, y: 3 },
        { x: 3, y: 4 },
      ],
    });
    expect(riftKeepsLandConnectedV7(board, bridge)).toBe(false);
    // A Rift beside the bridge, with land all round it, keeps it connected.
    const wide = {
      ...board,
      tiles: board.tiles.map((tile) =>
        tile.at.y >= 1 && tile.at.y <= 5 && tile.at.x >= 1 && tile.at.x <= 5
          ? { ...tile, biome: "PLAINS" as const, terrain: "GRASS" as const }
          : tile,
      ),
    } as BoardStateV7;
    expect(
      riftKeepsLandConnectedV7(
        wide,
        withRiftV7(wide, {
          orientation: "HORIZONTAL",
          tiles: [
            { x: 2, y: 3 },
            { x: 3, y: 3 },
            { x: 4, y: 3 },
          ],
        }),
      ),
    ).toBe(true);
  });
});
