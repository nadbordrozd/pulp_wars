import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  canonicalMapRandomHashV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  nearestCapitalSharesV7,
  villageBalancedV7,
  villageCountForRulesV7,
  villageCountV7,
  type AiCountV7,
  type BoardSizeV7,
  type CoordV7,
  type GeneratedMapV7,
  type MapGenerationRulesV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";

/**
 * Villages spread over the land (`pulp_wars-9s0.12`, `pulp-wars-poc-7r79`,
 * docs/product/RULESET_7_MAP_SCALE.md section 5.7). Every test here only
 * generates maps; none plays a match.
 */

function setup(
  mapType: MapTypeV7,
  width: BoardSizeV7,
  seats: number,
  seed: number,
  curiosities = false,
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
  if (!result.ok) throw new Error(result.error.code);
  return result.map;
}

const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
const key = (at: CoordV7): string => `${at.x},${at.y}`;
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const landOf = (map: GeneratedMapV7): CoordV7[] =>
  map.board.tiles.filter((tile) => tile.biome !== null).map((tile) => tile.at);

/**
 * The villages in each third of the land. The land tiles are put in order
 * (by row, or by column) and cut into three bands of equal land, so an even
 * spread puts a third of the villages in each band whatever the shape of
 * the land.
 */
function villagesPerThird(
  map: GeneratedMapV7,
  axis: "rows" | "columns",
): [number, number, number] {
  const land = landOf(map).sort((a, b) =>
    axis === "rows" ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y,
  );
  const index = new Map(land.map((at, position) => [key(at), position]));
  const counts: [number, number, number] = [0, 0, 0];
  for (const village of map.villages) {
    const position = index.get(key(village));
    if (position === undefined) throw new Error("village off the land");
    const band = Math.min(2, Math.floor((3 * position) / land.length));
    counts[band as 0 | 1 | 2] += 1;
  }
  return counts;
}

/** The share of all villages of `maps` in each third of the land. */
function thirdShares(
  maps: readonly GeneratedMapV7[],
  axis: "rows" | "columns",
): number[] {
  const sums = [0, 0, 0];
  for (const map of maps)
    villagesPerThird(map, axis).forEach((count, band) => {
      sums[band] = (sums[band] ?? 0) + count;
    });
  const total = sums.reduce((sum, count) => sum + count, 0);
  return sums.map((count) => count / total);
}

/**
 * Boards with enough villages for a share to mean something (13 to 36 a
 * board, 150 to 430 over the twelve seeds).
 */
const SPREAD_CELLS = [
  ["PANGEA", 20, 2],
  ["PANGEA", 25, 3],
  ["CONTINENTS", 20, 2],
  ["CONTINENTS", 25, 2],
  ["CONTINENTS", 25, 3],
  ["ARCHIPELAGO", 20, 2],
  ["ARCHIPELAGO", 25, 2],
  ["ARCHIPELAGO", 25, 3],
] as const;

describe("villages spread over the land (7r79)", () => {
  // The bound. An even spread gives each third 0.333. Over twelve boards a
  // cell has 150 to 430 villages, so a share drawn at random would stray
  // about 0.03 to 0.04 (one standard deviation); villages are not quite
  // independent (they keep 3 apart, and capitals take the corners), and the
  // measured shares of the current generator run from 0.27 to 0.38. A third
  // must hold 0.24 to 0.43: about three deviations either side, and far from
  // the 0.14 to 0.17 the `(y, x)` fill left in the bottom third of a
  // two-player Continents board (pinned below).
  it.each(SPREAD_CELLS)(
    "%s %i with %i players: no third of the land holds too many or too few villages",
    (mapType, width, seats) => {
      const maps = SEEDS.map((seed) =>
        generated(setup(mapType, width, seats, seed)),
      );
      for (const axis of ["rows", "columns"] as const)
        for (const share of thirdShares(maps, axis)) {
          expect(share).toBeGreaterThanOrEqual(0.24);
          expect(share).toBeLessThanOrEqual(0.43);
        }
      // One board alone has too few villages for a tight bound (13 villages
      // put 4 or 5 in a third, give or take 2): no third holds two thirds.
      for (const map of maps)
        for (const axis of ["rows", "columns"] as const)
          expect(
            Math.max(...villagesPerThird(map, axis)) / map.villages.length,
          ).toBeLessThanOrEqual(2 / 3);
    },
  );

  it("fixes the bias of the (y, x) fill: the 7r78 rules starve the bottom third of Continents", () => {
    for (const width of [20, 25] as const) {
      const before = thirdShares(
        SEEDS.map((seed) =>
          generated(setup("CONTINENTS", width, 2, seed), "CAPITAL_DOMAINS"),
        ),
        "rows",
      );
      const after = thirdShares(
        SEEDS.map((seed) => generated(setup("CONTINENTS", width, 2, seed))),
        "rows",
      );
      // Measured: 0.41 / 0.42 / 0.17 and 0.42 / 0.44 / 0.14 before;
      // 0.31 / 0.31 / 0.37 and 0.32 / 0.35 / 0.32 after.
      expect(before[2]).toBeLessThan(0.2);
      expect(after[2]).toBeGreaterThan(0.3);
    }
  });

  it("no longer puts a Pangea's coastal village on the top row of the island", () => {
    // The coastal settlement a landmass needs was the first legal coast
    // tile in (y, x) order: a village on the island's top row on nearly
    // every board whose capitals stand inland.
    const onRow = (map: GeneratedMapV7, row: "top" | "bottom"): boolean => {
      const rows = landOf(map).map((at) => at.y);
      const edge = row === "top" ? Math.min(...rows) : Math.max(...rows);
      return map.villages.some((village) => village.y === edge);
    };
    const cells = [16, 20, 25] as const;
    const count = (
      rules: MapGenerationRulesV7 | undefined,
      row: "top" | "bottom",
    ): number =>
      cells
        .flatMap((width) =>
          SEEDS.map((seed) =>
            generated(setup("PANGEA", width, 2, seed), rules),
          ),
        )
        .filter((map) => onRow(map, row)).length;
    const boards = cells.length * SEEDS.length;
    const before = { top: count("CAPITAL_DOMAINS", "top") };
    const after = {
      top: count(undefined, "top"),
      bottom: count(undefined, "bottom"),
    };
    // Before, a village stood on the top row of at least five boards in six.
    expect(before.top).toBeGreaterThanOrEqual((5 * boards) / 6);
    // Now the top row is no likelier than the bottom row, give or take a
    // quarter of the boards.
    expect(after.top).toBeLessThan(before.top);
    expect(Math.abs(after.top - after.bottom)).toBeLessThanOrEqual(boards / 4);
  });

  it("keeps the starts fair: balanced villages and a village near every start", () => {
    for (const [mapType, width, seats] of [
      ...SPREAD_CELLS,
      ["CONTINENTS", 16, 2],
      ["ARCHIPELAGO", 16, 2],
      ["CONTINENTS", 20, 4],
      ["ARCHIPELAGO", 20, 4],
      ["PANGEA", 16, 4],
    ] as const)
      for (const seed of SEEDS) {
        const input = setup(mapType, width, seats, seed);
        const map = generated(input);
        // The configured density, exactly (map scale section 5.1).
        expect(map.villages).toHaveLength(villageCountV7(input));
        // Map scale section 4.4 item 4: villages counted for their nearest
        // capital differ by at most max(2, ceil(T / (2N))).
        expect(
          villageBalancedV7(
            nearestCapitalSharesV7(map.board, map.capitals, map.villages),
          ),
        ).toBe(true);
        // Every start has a village within 5, and no start's nearest
        // village is more than 2 further than another's.
        const nearest = map.capitals.map((capital) =>
          Math.min(
            ...map.villages.map((village) => chebyshev(capital, village)),
          ),
        );
        expect(Math.max(...nearest)).toBeLessThanOrEqual(5);
        expect(Math.max(...nearest) - Math.min(...nearest)).toBeLessThanOrEqual(
          2,
        );
        // Settlements still keep 3 apart, villages 1 from the edge.
        const settlements = [...map.capitals, ...map.villages];
        settlements.forEach((a, index) =>
          settlements
            .slice(index + 1)
            .forEach((b) => expect(chebyshev(a, b)).toBeGreaterThanOrEqual(3)),
        );
        for (const village of map.villages) {
          expect(Math.min(village.x, village.y)).toBeGreaterThanOrEqual(1);
          expect(Math.max(village.x, village.y)).toBeLessThanOrEqual(width - 2);
        }
      }
  });

  it("is deterministic from the seed and neutral to factions and curiosities", () => {
    for (const mapType of ["PANGEA", "CONTINENTS", "ARCHIPELAGO"] as const) {
      const input = setup(mapType, 20, 3, 5);
      const map = generated(input);
      expect(generated(input)).toEqual(map);
      expect(
        generated({ ...input, factions: ["CANDY", "DWARF", "MARTIAN"] }),
      ).toEqual(map);
      const on = generated({ ...input, curiosities: true });
      expect({ ...on, curiosities: [], neutrals: [] }).toEqual(map);
      // Another seed is another board.
      expect(generated(setup(mapType, 20, 3, 6)).villages).not.toEqual(
        map.villages,
      );
      // The spread draws from no stream: the 7r79 board differs from the
      // 7r78 board only by where settlements stand and what follows from
      // that, and the candidate count of the land mask is unchanged. (The
      // natural water of 7r87 draws its own land; see
      // tests/unit/ruleset-v7-natural-water.test.ts.)
      expect(landOf(generated(input, "SPREAD_VILLAGES_CURIOSITIES"))).toEqual(
        landOf(generated(input, "CAPITAL_DOMAINS")),
      );
    }
  });

  it("leaves Dry Land byte-identical: hashes pinned from main at 7r78", () => {
    // `canonicalMapRandomHashV7` of the board main (e153c793, 7r78)
    // generated for seed 1 with curiosities on, by width and players.
    const PINNED = {
      "11/2":
        "4589e328f02e00f1e224aacf4fcd05ee43db8501ebee778b1ff9207e18ca5a98",
      "11/8":
        "26a6fe5fb1d399db5a24a1bb738bf42a01dc2639f0b9a293426d2d030900a686",
      "14/4":
        "190a13136ace5900a18789836310a27e72568276fc95b8bb3c5448caba0e88ed",
      "16/2":
        "bf02184918baa553b2ef2f68e6925df7d9863de47cd7a1fc61fc74def75dccfd",
      "16/6":
        "0eafb98ae032967391c4b85ccb1ffe374d55c77fdf9dff2963d103ddef8dd7d6",
      "20/4":
        "69b197e9c43b3fc51781be61acfd4932484713d1417699bfb3482ff202b272cc",
      "20/8":
        "e514c743efa1bb8c84f2b40d4687b147203dcf583479dc17f3d3968daa370d03",
      "25/2":
        "eabf746765cbf33bf13eba9ecadf3fc60ea925897ec576d9fac9c363987e59ac",
      "25/6":
        "d411006e2cecc4377ea98d46078d0532677b2a38dccdca29951ceba0f9012fdf",
    };
    expect(
      Object.fromEntries(
        Object.keys(PINNED).map((cell) => {
          const [width, seats] = cell.split("/").map(Number);
          return [
            cell,
            canonicalMapRandomHashV7(
              generated(
                setup("DRY_LAND", width as BoardSizeV7, seats ?? 2, 1, true),
              ),
            ),
          ];
        }),
      ),
    ).toEqual(PINNED);
    // And the whole map equals the 7r78 generator's on more seeds.
    for (const [width, seats] of [
      [11, 3],
      [16, 4],
      [20, 2],
      [25, 5],
    ] as const)
      for (const seed of [2, 3, 4]) {
        const input = setup("DRY_LAND", width, seats, seed, true);
        expect(generated(input)).toEqual(
          generated(input, "CAPITAL_DOMAINS_CURIOSITIES"),
        );
      }
  });

  it("still reproduces the 7r78 water maps under the CAPITAL_DOMAINS rules", () => {
    // `canonicalMapRandomHashV7` of the board main (e153c793, 7r78)
    // generated for seed 1 with two players and curiosities on. The
    // Continents, Archipelago, and 16 x 16 Pangea boards are the ones the
    // current generator settles differently.
    const PINNED = {
      "PANGEA/16":
        "396272ee2656703f8e4f5b92c8484fe5ff5a47245c1aecd14265a58150541ec6",
      "PANGEA/25":
        "bf473a73f846e3e8dfc218f96ffaf063ecb402d75617704990b69638e346f883",
      "LAKES/20":
        "d028772d83f3ba8456e8e4baa5fdd46b7910cc79c4f0dd7dcbb5d48cf39543c5",
      "CONTINENTS/20":
        "0d8ff6cd0f34a2530373d3fa3e09af33ef5c4b76022a0085d00f9a4c37ce73a1",
      "ARCHIPELAGO/25":
        "0aa677f24e8e59f4fadb7d27a9cba8efca63cd7a9e5f0194e7e156d70ffae09b",
    };
    const hashes = (rules?: MapGenerationRulesV7): Record<string, string> =>
      Object.fromEntries(
        Object.keys(PINNED).map((cell) => {
          const [mapType, width] = cell.split("/");
          return [
            cell,
            canonicalMapRandomHashV7(
              generated(
                setup(
                  mapType as MapTypeV7,
                  Number(width) as BoardSizeV7,
                  2,
                  1,
                  true,
                ),
                rules,
              ),
            ),
          ];
        }),
      );
    expect(hashes("CAPITAL_DOMAINS_CURIOSITIES")).toEqual(PINNED);
    // The 7r79 generator, kept as the SPREAD_VILLAGES rules since the
    // natural water of 7r87 redrew Continents and Lakes.
    const current = hashes("SPREAD_VILLAGES_CURIOSITIES");
    // A Pangea or Lakes board whose capital already stands on the coast
    // has no coastal village to move and is unchanged.
    expect(current["PANGEA/25"]).toBe(PINNED["PANGEA/25"]);
    expect(current["LAKES/20"]).toBe(PINNED["LAKES/20"]);
    expect(current["PANGEA/16"]).not.toBe(PINNED["PANGEA/16"]);
    expect(current["CONTINENTS/20"]).not.toBe(PINNED["CONTINENTS/20"]);
    expect(current["ARCHIPELAGO/25"]).not.toBe(PINNED["ARCHIPELAGO/25"]);
  });
});
