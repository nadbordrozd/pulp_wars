import { describe, expect, it } from "vitest";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import {
  BOARD_SIZES_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  canonicalMapRandomHashV7,
  domainBandV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  lakeWaterCountV7,
  landTileCountV7,
  majorLandmassMinimumV7,
  maxSeatsV7,
  missionByIdV7,
  missionMapDriftV7,
  naturalLakeCountRangeV7,
  nineSeatContinentGroupsV7,
  villageCountForRulesV7,
  villageCountV7,
  type AiCountV7,
  type BoardSizeV7,
  type CoordV7,
  type GeneratedMapV7,
  type MapGenerationRulesV7,
  type MapTypeV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

/**
 * Natural water (`pulp_wars-ykw.8`, `pulp-wars-poc-7r87`,
 * docs/product/RULESET_7_MAP_SCALE.md section 5.8): Continents on 46% of
 * the board with wider seas and islets, and Lakes as noise-shaped blobs of
 * varied size and count. Every test here only generates maps; none plays a
 * match.
 */

function setup(
  mapType: MapTypeV7,
  width: BoardSizeV7,
  seats: number,
  seed: number,
  curiosities = true,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount: (seats - 1) as AiCountV7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: seats }, () => "ORIGINAL" as const),
    allowDuplicateFactions: true,
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities,
  };
}

/** The current generator, or the generator of `rules` (a parity call). */
function generated(
  input: MatchSetupV7,
  rules?: MapGenerationRulesV7,
): GeneratedMapV7 {
  const result =
    rules === undefined
      ? generateInitialMapV7(input)
      : generateInitialMapWithVillageCountV7(
          input,
          villageCountForRulesV7(input, rules),
          rules,
        );
  if (!result.ok)
    throw new Error(`generation failed: ${JSON.stringify(result.error)}`);
  return result.map;
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const edgeDistance = (width: number, at: CoordV7): number =>
  Math.min(at.x, at.y, width - 1 - at.x, width - 1 - at.y);

/** Eight-connected components of land (`land`) or water, largest first. */
function components(map: GeneratedMapV7, land: boolean): CoordV7[][] {
  const { width, height, tiles } = map.board;
  const wanted = (x: number, y: number): boolean =>
    (tiles[y * width + x]?.biome !== null) === land;
  const seen = new Set<string>();
  const result: CoordV7[][] = [];
  for (const tile of tiles) {
    if (!wanted(tile.at.x, tile.at.y) || seen.has(key(tile.at))) continue;
    const component: CoordV7[] = [];
    const queue = [tile.at];
    seen.add(key(tile.at));
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const at = queue[cursor] as CoordV7;
      component.push(at);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const near = { x: at.x + dx, y: at.y + dy };
          if (near.x < 0 || near.y < 0 || near.x >= width || near.y >= height)
            continue;
          if (!wanted(near.x, near.y) || seen.has(key(near))) continue;
          seen.add(key(near));
          queue.push(near);
        }
    }
    result.push(component);
  }
  return result.sort((a, b) => b.length - a.length);
}

const waterShare = (map: GeneratedMapV7): number =>
  map.board.tiles.filter((tile) => tile.biome === null).length /
  map.board.tiles.length;

/** The fewest Chebyshev steps between two tiles of different landmasses. */
function closestLandmasses(majors: readonly (readonly CoordV7[])[]): number {
  let closest = Number.POSITIVE_INFINITY;
  majors.forEach((own, index) => {
    for (const other of majors.slice(index + 1))
      for (const a of own)
        for (const b of other) closest = Math.min(closest, chebyshev(a, b));
  });
  return closest;
}

/** Interior lakes: water components that never touch the board's edge. */
function lakes(map: GeneratedMapV7): CoordV7[][] {
  const width = map.board.width;
  return components(map, false).filter((component) =>
    component.every((at) => edgeDistance(width, at) > 0),
  );
}

/** A lake's tiles over the tiles of its bounding box (1 for a rectangle). */
function boxFill(lake: readonly CoordV7[]): number {
  const xs = lake.map((at) => at.x);
  const ys = lake.map((at) => at.y);
  return (
    lake.length /
    ((Math.max(...xs) - Math.min(...xs) + 1) *
      (Math.max(...ys) - Math.min(...ys) + 1))
  );
}

const SEEDS = [1, 2, 3, 4, 5, 6];

describe("natural water: the identity (7r87)", () => {
  // `pulp_wars-ykw.8` took 7r87 after the free Pearls of `pulp_wars-5ti.14`
  // (7r86).
  it("is 7r87 after 7r86, its save key obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r87");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r87.current");
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe("pulp-wars-poc-7r86");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r86.current",
    );
  });
});

describe("natural water: Continents", () => {
  it("covers 46% of the board with landmasses, plus islets, so about 52% is water", () => {
    for (const [width, seats] of [
      [11, 2],
      [14, 3],
      [16, 2],
      [20, 4],
      [25, 2],
    ] as const)
      for (const seed of SEEDS.slice(0, 3)) {
        const input = setup("CONTINENTS", width, seats, seed);
        const map = generated(input);
        const minimum = majorLandmassMinimumV7(width, "CONTINENTS", seats);
        const land = components(map, true);
        const majors = land.filter((c) => c.length >= minimum);
        const islets = land.filter((c) => c.length < minimum);
        // The landmasses hold exactly the land of the density
        // (`landTileCountV7`), the islets come on top.
        expect(majors.reduce((sum, c) => sum + c.length, 0)).toBe(
          landTileCountV7(width, "CONTINENTS"),
        );
        expect(map.villages).toHaveLength(villageCountV7(input));
        for (const islet of islets) {
          expect(islet.length).toBeLessThanOrEqual(3);
          for (const at of islet) {
            expect(edgeDistance(width, at)).toBeGreaterThanOrEqual(1);
            expect(map.board.tiles[at.y * width + at.x]?.site).toBeNull();
            // Water all round: no other land within 1.
            for (const other of land)
              if (other !== islet)
                for (const near of other)
                  expect(chebyshev(at, near)).toBeGreaterThanOrEqual(2);
          }
        }
        const share = waterShare(map);
        expect(share).toBeGreaterThanOrEqual(0.5);
        expect(share).toBeLessThanOrEqual(0.56);
        // Before 7r87: 56% land, 44% water.
        const before = waterShare(
          generated(input, "SPREAD_VILLAGES_CURIOSITIES"),
        );
        expect(before).toBeLessThan(0.48);
      }
  });

  it("keeps at least two tiles of sea between the landmasses of two to four players", () => {
    let narrowBefore = 0;
    for (const [width, seats] of [
      [11, 2],
      [14, 2],
      [14, 3],
      [16, 2],
      [16, 4],
      [20, 2],
      [20, 3],
      [25, 4],
    ] as const)
      for (const seed of SEEDS) {
        const input = setup("CONTINENTS", width, seats, seed);
        const minimum = majorLandmassMinimumV7(width, "CONTINENTS", seats);
        const majors = (map: GeneratedMapV7) =>
          components(map, true).filter((c) => c.length >= minimum);
        // At least two Water tiles between two landmasses (Chebyshev 3).
        expect(
          closestLandmasses(majors(generated(input))),
        ).toBeGreaterThanOrEqual(3);
        if (
          closestLandmasses(
            majors(generated(input, "SPREAD_VILLAGES_CURIOSITIES")),
          ) <= 2
        )
          narrowBefore += 1;
      }
    // The generator before 7r87 left a single Water tile somewhere between
    // two landmasses on some of them (measured: 6 of these 48 boards).
    expect(narrowBefore).toBeGreaterThanOrEqual(5);
  });

  it("sprinkles islets in the open sea, about one per 60 Water tiles", () => {
    let islets = 0;
    let wanted = 0;
    for (const width of [16, 20, 25] as const)
      for (const seed of SEEDS) {
        const input = setup("CONTINENTS", width, 2, seed);
        const map = generated(input);
        const minimum = majorLandmassMinimumV7(width, "CONTINENTS", 2);
        const found = components(map, true).filter((c) => c.length < minimum);
        const isletTiles = found.reduce((sum, c) => sum + c.length, 0);
        const sea =
          map.board.tiles.filter((tile) => tile.biome === null).length +
          isletTiles;
        islets += found.length;
        wanted += Math.round(sea / 60);
      }
    // Measured: every islet the count asks for finds room on these boards.
    expect(islets).toBeGreaterThanOrEqual(Math.floor(wanted * 0.9));
    expect(islets).toBeLessThanOrEqual(wanted);
  });

  it("groups the nine domains of a nine-seat board into neighbouring landmasses", () => {
    const width = 14;
    const domainAt = (column: number, row: number) => {
      const x = domainBandV7(width, 3, column);
      const y = domainBandV7(width, 3, row);
      return { x0: x.from, x1: x.to, y0: y.from, y1: y.to };
    };
    // Slot 0 on the top-left domain: no turn, the top row and three columns.
    const cells: [number, number][] = [
      [0, 0],
      [2, 2],
      [1, 0],
      [0, 1],
      [2, 0],
      [1, 1],
      [0, 2],
      [2, 1],
      [1, 2],
    ];
    const groups = nineSeatContinentGroupsV7(
      width,
      cells.map(([column, row]) => domainAt(column, row)),
    );
    expect(groups.map((group) => group.length)).toEqual([3, 2, 2, 2]);
    expect(groups.flat().sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    for (const group of groups)
      for (const [index, slot] of group.entries())
        if (index > 0) {
          const [ax, ay] = cells[group[index - 1] as number] as [
            number,
            number,
          ];
          const [bx, by] = cells[slot] as [number, number];
          expect(Math.abs(ax - bx) + Math.abs(ay - by)).toBe(1);
        }
    expect(groups[0]).toEqual([0, 2, 4]);
    // Nine-seat boards the generator before 7r87 could not draw on 14 x 14
    // (seeds 33, 57, and 63 failed after 256 candidates).
    for (const seed of [33, 57, 63])
      expect(generated(setup("CONTINENTS", 14, 9, seed)).capitals).toHaveLength(
        9,
      );
  });
});

describe("natural water: Lakes", () => {
  it("draws two to five noise-shaped lakes off the edge, with the Water count unchanged", () => {
    for (const width of BOARD_SIZES_V7)
      for (const seed of SEEDS.slice(0, 3)) {
        const map = generated(setup("LAKES", width, 2, seed));
        const water = map.board.tiles.filter((tile) => tile.biome === null);
        expect(water).toHaveLength(lakeWaterCountV7(width, width));
        const inset = width <= 11 ? 2 : 3;
        for (const tile of water)
          expect(edgeDistance(width, tile.at)).toBeGreaterThanOrEqual(inset);
        const found = lakes(map).filter((lake) => lake.length >= 4);
        const [fewest, most] = naturalLakeCountRangeV7(width);
        expect(found.length).toBeGreaterThanOrEqual(Math.min(2, fewest));
        expect(found.length).toBeLessThanOrEqual(most);
        expect(found.reduce((sum, lake) => sum + lake.length, 0)).toBe(
          water.length,
        );
      }
  });

  it("no longer draws two rectangles: lake count, sizes, and shapes vary", () => {
    const fills: number[] = [];
    const before: number[] = [];
    const counts = new Set<number>();
    const sizes = new Set<string>();
    for (const width of [16, 20, 25] as const)
      for (const seed of SEEDS) {
        const input = setup("LAKES", width, 3, seed);
        const now = lakes(generated(input));
        counts.add(now.length);
        sizes.add(
          now
            .map((lake) => lake.length)
            .sort((a, b) => a - b)
            .join("+"),
        );
        fills.push(...now.map(boxFill));
        const old = lakes(generated(input, "SPREAD_VILLAGES_CURIOSITIES"));
        // Before 7r87: always two lakes of equal Water.
        expect(old).toHaveLength(2);
        expect(Math.abs((old[0]?.length ?? 0) - (old[1]?.length ?? 0))).toBe(
          width === 25 ? 1 : 0,
        );
        before.push(...old.map(boxFill));
      }
    const mean = (values: readonly number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    // Measured: 0.92 before (rectangles with a ragged end), about 0.7 now.
    expect(mean(before)).toBeGreaterThan(0.85);
    expect(mean(fills)).toBeLessThan(0.8);
    expect(counts.size).toBeGreaterThanOrEqual(2);
    expect(sizes.size).toBeGreaterThan(9);
  });
});

describe("natural water: what does not move", () => {
  it("leaves Dry Land, Pangea, and Archipelago byte-identical: hashes pinned from main at 7r84", () => {
    // `canonicalMapRandomHashV7` of the board main (b803dfb5, 7r84)
    // generated for seed 1 with curiosities on.
    const PINNED = {
      "DRY_LAND/16/2":
        "bf02184918baa553b2ef2f68e6925df7d9863de47cd7a1fc61fc74def75dccfd",
      "DRY_LAND/20/6":
        "f8e0996ba4de1e71b86ba2ad8fed0388ea969cd6fd0f2f152390b57926294757",
      "PANGEA/14/3":
        "6d0d93fef6fb099e47aa01e79508db09b81e6d83b919f358dece1ceb6f463cb5",
      "PANGEA/20/2":
        "70c86f3f9209985c10560de0e5be4795b0a2b25af3c0e1f0586a5688b76605fd",
      "PANGEA/25/7":
        "c557209fa0d92a84d045a09f1380feadcd14697db2ba3d5ee16685e3c2ea5016",
      "ARCHIPELAGO/16/2":
        "5a12fb5212983e12fec57c8da9e7d54ac898d2c728f12b279bb86078422f2c0e",
      "ARCHIPELAGO/20/5":
        "9e83226a5fe05b1e479373e7981826280f1d4889d7c050f2e9b0cf68890dfa55",
      "ARCHIPELAGO/25/3":
        "75c7e5b11fb5cf5de47973142b268af9fc084f9d2391111d8874c138fb79d880",
    };
    const hashes = (rules?: MapGenerationRulesV7) =>
      Object.fromEntries(
        Object.keys(PINNED).map((cell) => {
          const [mapType, width, seats] = cell.split("/");
          return [
            cell,
            canonicalMapRandomHashV7(
              generated(
                setup(
                  mapType as MapTypeV7,
                  Number(width) as BoardSizeV7,
                  Number(seats),
                  1,
                ),
                rules,
              ),
            ),
          ];
        }),
      );
    expect(hashes()).toEqual(PINNED);
    // And the whole map equals the 7r79 generator's on more seeds.
    for (const [mapType, width, seats] of [
      ["DRY_LAND", 14, 4],
      ["PANGEA", 16, 5],
      ["ARCHIPELAGO", 20, 3],
    ] as const)
      for (const seed of [2, 3]) {
        const input = setup(mapType, width, seats, seed);
        expect(generated(input)).toEqual(
          generated(input, "SPREAD_VILLAGES_CURIOSITIES"),
        );
      }
  });

  it("still draws the Continents and Lakes of 7r84 under the SPREAD_VILLAGES rules", () => {
    const PINNED = {
      "CONTINENTS/16/2":
        "3c461ae594041e404affbd91ad7ec7be5593187f7985ac34d29f1217c59a2bc8",
      "CONTINENTS/20/5":
        "1a9fba8353ab97f26cec7a611bce701e50bf3446902cb87617f23f2a07a456e5",
      "LAKES/16/2":
        "185c37d62f62aa1b9bb5ddb24859a3178765ddeb0bdbcd1d00a5404ddaf2b01e",
      "LAKES/20/6":
        "0877ee3c112106dccc8f97e7c2fd5b0a7c4c96f84df30c72e67cef011f292a78",
    };
    for (const [cell, hash] of Object.entries(PINNED)) {
      const [mapType, width, seats] = cell.split("/");
      const input = setup(
        mapType as MapTypeV7,
        Number(width) as BoardSizeV7,
        Number(seats),
        1,
      );
      expect(
        canonicalMapRandomHashV7(
          generated(input, "SPREAD_VILLAGES_CURIOSITIES"),
        ),
      ).toBe(hash);
      expect(canonicalMapRandomHashV7(generated(input))).not.toBe(hash);
    }
  });

  it("keeps the players each width and map type allows", () => {
    // The setup rules of map scale section 3.3: the land of 46% Continents
    // lowers `floor(L / 9)` but never below the nine factions.
    const most = (mapType: MapTypeV7) =>
      BOARD_SIZES_V7.map((width) => maxSeatsV7(width, mapType));
    expect(most("CONTINENTS")).toEqual([6, 9, 9, 9, 9]);
    expect(most("LAKES")).toEqual([2, 9, 9, 9, 9]);
  });

  it("keeps the campaign boards: missions 4 and 9 regenerate under the rules they were baked with", () => {
    for (const id of ["FRONTIER_4", "FRONTIER_9"]) {
      const mission = missionByIdV7(id) as MissionDefinitionV7;
      const source = mission.source as NonNullable<
        MissionDefinitionV7["source"]
      >;
      expect(source.rules).toBe("SPREAD_VILLAGES_CURIOSITIES");
      expect(missionMapDriftV7(mission)).toEqual([]);
      // The current generator draws another board for the same source.
      expect(
        missionMapDriftV7({
          ...mission,
          source: { ...source, rules: "NATURAL_WATER_CURIOSITIES" },
        }),
      ).not.toEqual([]);
    }
  });
});
