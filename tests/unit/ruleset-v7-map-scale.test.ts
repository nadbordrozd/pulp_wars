import { describe, expect, it } from "vitest";
import {
  LAND_PER_SETTLEMENT_V7,
  MAP_GENERATION_REVISION_V7,
  MAP_GENERATION_RULES_V7,
  RULESET_7_ID,
  canonicalMapRandomHashV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  landTileCountV7,
  landmassSettlementCapV7,
  parseMatchSetupV7,
  revision14VillageCountV7,
  settlementCountV7,
  villageCountV7,
  wildCentreLegalV7,
  wildCentreVillageDistanceV7,
  wildReserveCountV7,
  wildReserveMapTypeV7,
  type CoordV7,
  type FactionIdV7,
  type GeneratedMapTypeV7,
  type GeneratedMapV7,
  type MatchSetupV7,
} from "../../src/engine/index";

// Map scale, village density (`pulp_wars-ykw.2`, `pulp-wars-poc-7r40`,
// docs/product/RULESET_7_MAP_SCALE.md section 5 as amended in section 5.5;
// current rules section 2.2): settlements per land tile instead of the fixed
// village table, villages 1 from the edge, the wild reserve, lattice packing
// on Dry Land, Pangea, and Lakes, the row-major fill with the per-landmass
// rules on Continents and Archipelago, and map revision V3.
//
// The many-seats generator (`pulp_wars-ykw.3`, map revision V4,
// tests/unit/ruleset-v7-many-seats.test.ts) replaced it as the current
// generator. Every board here is generated under the
// `VILLAGE_DENSITY_CURIOSITIES` parity rules, which must keep reproducing
// the V3 boards byte for byte: the golden hashes below were pinned at
// `7r40`, when these rules were the current generator.

const TYPES: readonly GeneratedMapTypeV7[] = [
  "DRY_LAND",
  "LAKES",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
];
const WIDTHS = [11, 14, 16, 20, 25] as const;
const SETTLEMENTS: Readonly<Record<GeneratedMapTypeV7, readonly number[]>> = {
  DRY_LAND: [8, 13, 17, 27, 42],
  LAKES: [7, 12, 16, 25, 38],
  PANGEA: [6, 11, 15, 24, 38],
  CONTINENTS: [6, 9, 12, 19, 29],
  ARCHIPELAGO: [4, 7, 9, 15, 23],
};
const FACTIONS: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
];

function setup(
  mapType: MatchSetupV7["mapType"],
  width: MatchSetupV7["width"],
  aiCount: MatchSetupV7["aiCount"],
  seed: number,
  overrides: Partial<MatchSetupV7> = {},
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
    factions: FACTIONS.slice(0, aiCount + 1),
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
    ...overrides,
  };
}

function generated(input: MatchSetupV7): GeneratedMapV7 {
  const result = generateInitialMapWithVillageCountV7(
    input,
    villageCountV7(input),
    "VILLAGE_DENSITY_CURIOSITIES",
  );
  if (!result.ok)
    throw new Error(`generation failed: ${JSON.stringify(result.error)}`);
  return result.map;
}

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const edgeDistance = (width: number, at: CoordV7): number =>
  Math.min(at.x, at.y, width - 1 - at.x, width - 1 - at.y);

/** Eight-connected land components: a component index per tile, -1 water. */
function landComponents(map: GeneratedMapV7): {
  readonly label: readonly number[];
  readonly sizes: readonly number[];
} {
  const { width, height, tiles } = map.board;
  const label = new Array<number>(tiles.length).fill(-1);
  const sizes: number[] = [];
  for (let start = 0; start < tiles.length; start += 1) {
    if (label[start] !== -1 || tiles[start]?.biome === null) continue;
    const id = sizes.length;
    const queue = [start];
    label[start] = id;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor] as number;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = (index % width) + dx;
          const y = Math.floor(index / width) + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const near = y * width + x;
          if (label[near] !== -1 || tiles[near]?.biome === null) continue;
          label[near] = id;
          queue.push(near);
        }
    }
    sizes.push(queue.length);
  }
  return { label, sizes };
}

/** Every density rule of one generated board. */
function expectDensityBoard(
  map: GeneratedMapV7,
  mapType: GeneratedMapTypeV7,
  width: (typeof WIDTHS)[number],
  seats: number,
): void {
  const expected = SETTLEMENTS[mapType][WIDTHS.indexOf(width)] as number;
  const tileAt = (at: CoordV7) => map.board.tiles[at.y * width + at.x];
  expect(map.capitals).toHaveLength(seats);
  expect(map.villages).toHaveLength(Math.max(0, expected - seats));
  expect(
    map.board.tiles.filter((tile) => tile.site === "VILLAGE"),
  ).toHaveLength(map.villages.length);
  for (const village of map.villages) {
    expect(tileAt(village)?.site).toBe("VILLAGE");
    expect(tileAt(village)?.terrain).toBe("GRASS");
    expect(edgeDistance(width, village)).toBeGreaterThanOrEqual(1);
  }
  const settlements = [...map.capitals, ...map.villages];
  settlements.forEach((a, index) => {
    for (const b of settlements.slice(index + 1))
      expect(chebyshev(a, b)).toBeGreaterThanOrEqual(3);
  });
  map.capitals.forEach((a, index) => {
    if (mapType === "DRY_LAND")
      expect(edgeDistance(width, a)).toBeGreaterThanOrEqual(2);
    for (const b of map.capitals.slice(index + 1))
      expect(chebyshev(a, b)).toBeGreaterThanOrEqual(Math.floor(width / 2));
  });
  // The wild reserve.
  expect(map.wildCentres.length).toBeLessThanOrEqual(
    wildReserveMapTypeV7(mapType) ? wildReserveCountV7(width) : 0,
  );
  map.wildCentres.forEach((centre, index) => {
    expect(
      wildCentreLegalV7(
        width,
        width,
        map.capitals,
        map.wildCentres.slice(0, index),
        (at) => tileAt(at)?.biome !== null,
        centre,
      ),
    ).toBe(true);
    // 3 on widths 11 and 14; 4 on 16 and up, room for a Spider's lair.
    expect(wildCentreVillageDistanceV7(width)).toBe(width >= 16 ? 4 : 3);
    for (const village of map.villages)
      expect(chebyshev(centre, village)).toBeGreaterThanOrEqual(
        width >= 16 ? 4 : 3,
      );
  });
  if (mapType !== "CONTINENTS" && mapType !== "ARCHIPELAGO") return;
  const components = landComponents(map);
  const componentOf = (at: CoordV7): number =>
    components.label[at.y * width + at.x] ?? -1;
  if (mapType === "CONTINENTS") {
    const majorMinimum = Math.max(6, Math.floor((width * width) / 20));
    const major = components.sizes
      .map((size, id) => ({ size, id }))
      .filter((component) => component.size >= majorMinimum);
    const majorLand = major.reduce((sum, component) => sum + component.size, 0);
    for (const component of major) {
      const held = settlements.filter(
        (at) => componentOf(at) === component.id,
      ).length;
      expect(held).toBeGreaterThanOrEqual(1);
      expect(held).toBeLessThanOrEqual(
        Math.ceil((settlements.length * component.size) / majorLand),
      );
    }
    // Villages stand on major landmasses only.
    for (const village of map.villages)
      expect(major.map((component) => component.id)).toContain(
        componentOf(village),
      );
    return;
  }
  const homes = map.capitals.map(componentOf);
  expect(new Set(homes).size).toBe(seats);
  const villagesAtHome = homes.map(
    (home) =>
      map.villages.filter((village) => componentOf(village) === home).length,
  );
  expect(
    Math.max(...villagesAtHome) - Math.min(...villagesAtHome),
  ).toBeLessThanOrEqual(1);
}

describe("ruleset-7 map scale: village density (7r40, the V3 parity rules)", () => {
  it("counts settlements by land per settlement, whatever the seats", () => {
    expect(MAP_GENERATION_REVISION_V7).toBe("REGIONAL_BIOMES_NAVAL_V4");
    expect(LAND_PER_SETTLEMENT_V7).toEqual({
      DRY_LAND: 15,
      LAKES: 13,
      PANGEA: 12,
      CONTINENTS: 12,
      ARCHIPELAGO: 11,
    });
    expect(
      Object.fromEntries(
        TYPES.map((type) => [
          type,
          WIDTHS.map((width) => landTileCountV7(width, type)),
        ]),
      ),
    ).toEqual({
      DRY_LAND: [121, 196, 256, 400, 625],
      LAKES: [96, 156, 204, 320, 500],
      PANGEA: [72, 129, 176, 288, 450],
      CONTINENTS: [68, 110, 143, 224, 350],
      ARCHIPELAGO: [48, 78, 102, 160, 250],
    });
    expect(
      Object.fromEntries(
        TYPES.map((type) => [
          type,
          WIDTHS.map((width) => settlementCountV7(width, type)),
        ]),
      ),
    ).toEqual(SETTLEMENTS);
    // Villages are the settlements less one capital per seat.
    expect(
      ([1, 2, 3] as const).map((aiCount) =>
        villageCountV7(setup("DRY_LAND", 16, aiCount, 0)),
      ),
    ).toEqual([15, 14, 13]);
    expect(villageCountV7(setup("ARCHIPELAGO", 11, 1, 0))).toBe(2);
    expect(villageCountV7(setup("PANGEA", 25, 3, 0))).toBe(34);
    expect(villageCountV7(setup("SHOWCASE", 16, 1, 0))).toBe(0);
    // The fixed table of 7r39 stays for the parity rules only.
    expect(
      [
        setup("DRY_LAND", 11, 1, 0),
        setup("ARCHIPELAGO", 11, 1, 0),
        setup("DRY_LAND", 16, 3, 0),
        setup("ARCHIPELAGO", 16, 3, 0),
        setup("LAKES", 20, 2, 0),
        setup("PANGEA", 25, 1, 0),
      ].map(revision14VillageCountV7),
    ).toEqual([4, 3, 7, 6, 13, 21]);
    expect(
      [11, 14, 16, 20, 25].map((width) => wildReserveCountV7(width)),
    ).toEqual([1, 1, 1, 2, 3]);
    expect(TYPES.filter(wildReserveMapTypeV7)).toEqual([
      "DRY_LAND",
      "LAKES",
      "PANGEA",
    ]);
    expect(landmassSettlementCapV7(19, 112, 224)).toBe(10);
    expect(landmassSettlementCapV7(12, 36, 143)).toBe(4);
  });

  it.each(TYPES)(
    "%s: density, spacing, margins, reserve, and landmass rules on 11, 14, and 16",
    (mapType) => {
      for (const [width, aiCount] of [
        [11, 1],
        [14, 1],
        [14, 2],
        [16, 1],
        [16, 2],
        [16, 3],
      ] as const)
        for (const seed of [0, 1, 2])
          expectDensityBoard(
            generated(setup(mapType, width, aiCount, seed)),
            mapType,
            width,
            aiCount + 1,
          );
    },
    600_000,
  );

  it.each(TYPES)(
    "%s: the same rules on 20 and 25",
    (mapType) => {
      for (const [width, aiCount, seed] of [
        [20, 1, 0],
        [20, 3, 1],
        [25, 2, 0],
      ] as const)
        expectDensityBoard(
          generated(setup(mapType, width, aiCount, seed)),
          mapType,
          width,
          aiCount + 1,
        );
    },
    600_000,
  );

  it("lets a village stand one tile from the edge, never a Dry Land capital", () => {
    let nearEdge = 0;
    for (let seed = 0; seed < 6; seed += 1) {
      const map = generated(setup("DRY_LAND", 16, 1, seed));
      nearEdge += map.villages.filter(
        (village) => edgeDistance(16, village) === 1,
      ).length;
      for (const village of map.villages)
        expect(edgeDistance(16, village)).toBeGreaterThanOrEqual(1);
      for (const capital of map.capitals)
        expect(edgeDistance(16, capital)).toBeGreaterThanOrEqual(2);
    }
    expect(nearEdge).toBeGreaterThan(0);
  });

  it("reserves wild centres on Dry Land, Pangea, and Lakes only", () => {
    expect(generated(setup("DRY_LAND", 25, 1, 0)).wildCentres).toHaveLength(3);
    expect(generated(setup("DRY_LAND", 20, 1, 0)).wildCentres).toHaveLength(2);
    expect(generated(setup("DRY_LAND", 14, 1, 0)).wildCentres).toHaveLength(1);
    // Four lattice-corner capitals on 16 x 16 leave no tile 5 from them all.
    expect(generated(setup("DRY_LAND", 16, 3, 0)).wildCentres).toEqual([]);
    for (const mapType of ["CONTINENTS", "ARCHIPELAGO"] as const)
      expect(generated(setup(mapType, 25, 1, 0)).wildCentres).toEqual([]);
    // The legality rule.
    const capitals = [
      { x: 2, y: 2 },
      { x: 13, y: 13 },
    ];
    const land = () => true;
    expect(wildCentreLegalV7(16, 16, capitals, [], land, { x: 8, y: 7 })).toBe(
      true,
    );
    // 4 from a capital.
    expect(wildCentreLegalV7(16, 16, capitals, [], land, { x: 6, y: 6 })).toBe(
      false,
    );
    // More than 4 between the farthest and the nearest capital.
    expect(wildCentreLegalV7(16, 16, capitals, [], land, { x: 13, y: 7 })).toBe(
      false,
    );
    // 1 from the edge.
    expect(wildCentreLegalV7(16, 16, capitals, [], land, { x: 14, y: 1 })).toBe(
      false,
    );
    // 5 from another wild centre.
    expect(
      wildCentreLegalV7(16, 16, capitals, [{ x: 8, y: 2 }], land, {
        x: 8,
        y: 7,
      }),
    ).toBe(false);
    // Water.
    expect(
      wildCentreLegalV7(16, 16, capitals, [], () => false, { x: 8, y: 7 }),
    ).toBe(false);
  });

  it("is deterministic and neutral to factions and curiosities", () => {
    for (const mapType of TYPES) {
      const input = setup(mapType, 16, 2, 5);
      const map = generated(input);
      expect(generated(input)).toEqual(map);
      expect(
        generated({ ...input, factions: ["CANDY", "DWARF", "MARTIAN"] }),
      ).toEqual(map);
      const on = generated({ ...input, curiosities: true });
      expect({ ...on, curiosities: [], monsterHome: null }).toEqual(map);
    }
  });

  it("names the generators: the current rules and the 7r39 parity rules", () => {
    expect(MAP_GENERATION_RULES_V7).toEqual([
      "REVISION_15",
      "REVISION_16",
      "PANGEA_COAST_RING",
      "RIFTS",
      "CURIOSITIES",
      "VILLAGE_DENSITY",
      "VILLAGE_DENSITY_RIFTS",
      "VILLAGE_DENSITY_CURIOSITIES",
      "CAPITAL_DOMAINS",
      "CAPITAL_DOMAINS_RIFTS",
      "CAPITAL_DOMAINS_CURIOSITIES",
    ]);
    const input = setup("DRY_LAND", 20, 1, 3, { curiosities: true });
    // The default rules and the density count are the current generator.
    expect(
      generateInitialMapWithVillageCountV7(input, villageCountV7(input)),
    ).toEqual(generateInitialMapV7(input));
    const current = generateInitialMapWithVillageCountV7(
      input,
      villageCountV7(input),
      "VILLAGE_DENSITY_CURIOSITIES",
    );
    const rifts = generateInitialMapWithVillageCountV7(
      input,
      villageCountV7(input),
      "VILLAGE_DENSITY_RIFTS",
    );
    const plain = generateInitialMapWithVillageCountV7(
      input,
      villageCountV7(input),
      "VILLAGE_DENSITY",
    );
    if (!current.ok || !rifts.ok || !plain.ok) throw new Error("generation");
    expect({ ...current.map, curiosities: [], monsterHome: null }).toEqual(
      rifts.map,
    );
    expect(current.map.curiosities.length).toBeGreaterThan(0);
    // The Rift changes only terrain.
    expect(rifts.map.board.tiles.some((tile) => tile.terrain === "RIFT")).toBe(
      true,
    );
    expect(plain.map.board.tiles.some((tile) => tile.terrain === "RIFT")).toBe(
      false,
    );
    expect(rifts.map.villages).toEqual(plain.map.villages);
    expect(rifts.map.random).toEqual(plain.map.random);
    // The 7r39 board of the same setup: the fixed table on the lattice 2
    // from the edge, no wild reserve. Its hash was computed with the 7r39
    // source itself (`pulp_wars-ykw.2`), so this pins the parity rules to
    // the generator before the density byte for byte.
    const before = generateInitialMapWithVillageCountV7(
      setup("DRY_LAND", 11, 1, 0),
      revision14VillageCountV7(setup("DRY_LAND", 11, 1, 0)),
      "CURIOSITIES",
    );
    if (!before.ok) throw new Error("7r39 generation");
    expect(before.map.villages).toHaveLength(4);
    expect(before.map.wildCentres).toEqual([]);
    for (const village of before.map.villages)
      expect(edgeDistance(11, village)).toBeGreaterThanOrEqual(2);
    expect(canonicalMapRandomHashV7(before.map)).toBe(PRE_DENSITY_HASH);
  });

  it("rejects a candidate that cannot hold its villages, and the old revision", () => {
    // 40 villages never fit an 11 x 11 board (9 settlements at most).
    expect(
      generateInitialMapWithVillageCountV7(
        setup("DRY_LAND", 11, 1, 0),
        40,
        "VILLAGE_DENSITY_CURIOSITIES",
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "MAP_GENERATION_FAILED",
        params: {
          seed: 0,
          width: 11,
          height: 11,
          attempts: 256,
          lastFailure: "VILLAGE_DENSITY",
        },
      },
    });
    for (const mapType of ["LAKES", "ARCHIPELAGO"] as const) {
      const failed = generateInitialMapWithVillageCountV7(
        setup(mapType, 11, 1, 0),
        40,
        "VILLAGE_DENSITY_CURIOSITIES",
      );
      expect(failed.ok).toBe(false);
      if (!failed.ok && failed.error.code === "MAP_GENERATION_FAILED")
        expect(["VILLAGE_DENSITY", "SETTLEMENT_COUNT"]).toContain(
          failed.error.params.lastFailure,
        );
    }
    for (const mapGenerationRevision of [
      "REGIONAL_BIOMES_NAVAL_V2",
      "REGIONAL_BIOMES_NAVAL_V3",
    ]) {
      expect(
        parseMatchSetupV7({
          ...setup("DRY_LAND", 11, 1, 0),
          mapGenerationRevision,
        }),
      ).toBeNull();
      expect(
        generateInitialMapV7({
          ...setup("DRY_LAND", 11, 1, 0),
          mapGenerationRevision,
        }),
      ).toEqual({ ok: false, error: { code: "INVALID_SETUP", params: {} } });
    }
    // The rules before the capital domains exist for the setups they
    // accepted: two to four seats, 14 and up for three, 16 and up for four.
    for (const [width, aiCount] of [
      [11, 2],
      [14, 3],
      [20, 4],
    ] as const)
      expect(
        generateInitialMapWithVillageCountV7(
          setup("DRY_LAND", width, aiCount, 0, {
            factions: [
              "ORIGINAL",
              "UNDEAD",
              "GOBLIN",
              "DINOSAUR",
              "DWARF",
            ].slice(0, aiCount + 1) as FactionIdV7[],
          }),
          1,
          "VILLAGE_DENSITY_CURIOSITIES",
        ),
      ).toEqual({ ok: false, error: { code: "INVALID_SETUP", params: {} } });
  });

  it("pins one golden board per map type at two seats", () => {
    expect(
      Object.fromEntries(
        TYPES.map((mapType) => {
          const map = generated(setup(mapType, 16, 1, 7));
          return [
            mapType,
            [
              canonicalMapRandomHashV7(map),
              map.attempt,
              map.villages.length,
              map.wildCentres,
            ],
          ];
        }),
      ),
    ).toEqual(GOLDEN);
  });
});

/**
 * `canonicalMapRandomHashV7` of 11 x 11 Dry Land, one AI, seed 0 (four
 * villages), generated by the `pulp-wars-poc-7r39` source.
 */
const PRE_DENSITY_HASH =
  "09944ee3356d66313c02503b3572f679bc05811f835058d701809891aa5e80ce";

const GOLDEN = {
  DRY_LAND: [
    "3814b3868b404d2f10989b0a08b506ce513d2f20d7da7447bbddfa57fcb39dd7",
    2,
    15,
    [{ x: 13, y: 3 }],
  ],
  LAKES: [
    "685f19136ea3b63060edf497fa70d698505c82058e0d46a22f6bc70f87bcec86",
    5,
    14,
    [{ x: 9, y: 9 }],
  ],
  PANGEA: [
    "80ffc0ea6bfbf5bd6729072afbbe9e18e94394f147bf35f24bc245811074134a",
    1,
    13,
    [{ x: 13, y: 7 }],
  ],
  CONTINENTS: [
    "550269c613de706996a4114a03270db4e75fb17f33283ad144a800ec2388b7c5",
    2,
    10,
    [],
  ],
  ARCHIPELAGO: [
    "7beb2531ac90a89ad23e1f269e5bbbff5d764f980ab95109761c378175d1fc8b",
    2,
    7,
    [],
  ],
};
