import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FACTION_IDS_V7,
  LAND_PER_SETTLEMENT_V7,
  MAP_GENERATION_REVISION_V7,
  MEASURED_SEAT_CAPACITY_V7,
  RULESET_7_ID,
  capitalRoomSharesV7,
  capitalSpacingV7,
  centralZoneEdgeDistanceV7,
  continentCapitalSplitV7,
  domainBandV7,
  domainsPerSideV7,
  generateInitialMapV7,
  landTileCountV7,
  landmassSettlementCapV7,
  majorLandmassMinimumV7,
  maxSeatsV7,
  nearestCapitalSharesV7,
  partialVillagesV7,
  seatCapacityV7,
  settlementCountV7,
  villageCountV7,
  wildCentreVillageDistanceV7,
  wildReserveCountV7,
  wildReserveMapTypeV7,
  type CoordV7,
  type FactionIdV7,
  type GeneratedMapTypeV7,
  type GeneratedMapV7,
  type MatchSetupV7,
} from "../src/engine/index";

// Map scale, village density and many seats (`pulp_wars-ykw.2` and
// `pulp_wars-ykw.3`, docs/product/RULESET_7_MAP_SCALE.md sections 3 to 5 and
// 10.1 as amended in sections 5.5 and 5.6): for every legal cell (a
// generated map type, a size, and 2 to `min(F, P(w, type))` seats), seeds
// 0..SEEDS-1 (default 256, `--seeds=N`; `--types=` a comma list of map
// types; `--seats=` a comma list of seat counts):
//
// - generation succeeds on every seed (no `MAP_GENERATION_FAILED`);
// - the board has one capital per seat and the villages of the section 5.2
//   table, `max(0, S - N)`: exactly on the setups of `7r41` (2 seats, 3 on
//   14 and up, 4 on 16 and up), and at most that many on every setup new at
//   `7r42`, whose least and mean counts are reported;
// - capitals `D(w, N)` or more apart, 2 or more from the edge, and with 8
//   seats or fewer outside the central zone; on Dry Land, Pangea, and Lakes
//   each in its own domain (never the centre one of the 3 x 3); villages 1
//   or more from the edge, and settlements 3 or more apart;
// - room balance (the largest land share at most 1.5 times the smallest up
//   to 4 seats, 2.0 from 5) and village balance (the largest village share
//   minus the smallest at most `max(2, ceil(T / (2N)))`);
// - Continents: 2 / 3 / 4 landmasses for 2 / 3-5 / 6 and more seats, each
//   holding exactly its capitals; Archipelago: one capital per island;
// - the wild reserve: none on Continents and Archipelago, at most
//   1 / 2 / 3 (widths 11-16 / 20 / 25) elsewhere, each centre a land tile 2
//   or more from the edge, 5 or more from every capital with at most 4
//   between its farthest and nearest capital, 6 or more from another
//   centre, and 3 or more from every village (4 on widths 16 and up);
// - Continents: every major landmass holds at most its share of the
//   settlements by land, rounded up; Archipelago: one capital per island
//   and home islands with equal villages (within 1);
// - neutrality (seeds 0-7): setups that differ only in `factions` give
//   the same map, and only in `curiosities` the same map apart from the
//   curiosities.
//
// With the full 256 seeds it also compares against the `7r39` baseline
// (`scripts/ruleset7-map-scale-baseline-7r39.json`, the cells that existed
// then): the mean and the worst accepted attempt are at most 1.6 times the
// baseline's (never asserted below a mean of 8 and a worst of 64). A cell
// new at `7r42` has no baseline: its mean is at most 8 and its worst
// attempt at most 64, the bounds of section 10.1. On Dry Land, Pangea, and
// Lakes
// boards of width 16 and up, the seeds with a land feature (a Fountain, a
// Shrine, or a Giant Spider) are at least 90% of the baseline's, the boards
// with a Giant Spider at least 60% per map type, and the seeds with a Rift at least 85% of the
// baseline's on widths 20 and 25 and at least half on width 16 (a denser
// 16 x 16 board has fewer legal Rift runs).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = JSON.parse(
  readFileSync(
    path.join(root, "scripts/ruleset7-map-scale-baseline-7r39.json"),
    "utf8",
  ),
) as {
  readonly seeds: number;
  readonly cells: Readonly<
    Record<
      string,
      {
        readonly settlements: number;
        readonly meanAttempts: number;
        readonly worstAttempt: number;
        readonly landCuriositySeeds: number;
        readonly spiderSeeds: number;
        readonly landFeatureSeeds: number;
        readonly riftSeeds: number;
      }
    >
  >;
};
const seeds = Number(
  process.argv.find((value) => value.startsWith("--seeds="))?.slice(8) ?? 256,
);
assert(Number.isSafeInteger(seeds) && seeds > 0, "--seeds must be positive");
const ALL_TYPES: readonly GeneratedMapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "LAKES",
  "CONTINENTS",
  "ARCHIPELAGO",
];
const typeArg = process.argv
  .find((value) => value.startsWith("--types="))
  ?.slice(8);
const mapTypes =
  typeArg === undefined
    ? ALL_TYPES
    : ALL_TYPES.filter((type) =>
        typeArg.toUpperCase().split(",").includes(type),
      );
assert(mapTypes.length > 0, "--types names no generated map type");
const WIDTHS = [11, 14, 16, 20, 25] as const;
const seatArg = process.argv
  .find((value) => value.startsWith("--seats="))
  ?.slice(8);
const seatFilter =
  seatArg === undefined ? null : new Set(seatArg.split(",").map(Number));
// Section 3.2, `P(w, type)` at 11 / 14 / 16 / 20 / 25, pinned independently
// of the engine, with the two measured cells of section 3.4.
const CAPACITY: Readonly<Record<GeneratedMapTypeV7, readonly number[]>> = {
  DRY_LAND: [9, 16, 16, 36, 49],
  LAKES: [2, 16, 16, 35, 49],
  PANGEA: [8, 14, 16, 32, 49],
  CONTINENTS: [6, 12, 15, 24, 38],
  ARCHIPELAGO: [4, 8, 9, 16, 27],
};
assert.deepEqual(MEASURED_SEAT_CAPACITY_V7, [
  { width: 11, mapType: "LAKES", seats: 2 },
  { width: 11, mapType: "CONTINENTS", seats: 6 },
]);
// Every legal cell: 2 to min(F, P) seats.
const SHAPES: (readonly [(typeof WIDTHS)[number], number])[] = [];
for (const width of WIDTHS)
  for (let aiCount = 1; aiCount < FACTION_IDS_V7.length; aiCount += 1)
    if (seatFilter === null || seatFilter.has(aiCount + 1))
      SHAPES.push([width, aiCount]);
// Section 5.2, pinned independently of the engine.
const LAND: Readonly<Record<GeneratedMapTypeV7, readonly number[]>> = {
  DRY_LAND: [121, 196, 256, 400, 625],
  LAKES: [96, 156, 204, 320, 500],
  PANGEA: [72, 129, 176, 288, 450],
  CONTINENTS: [68, 110, 143, 224, 350],
  ARCHIPELAGO: [48, 78, 102, 160, 250],
};
const SETTLEMENTS: Readonly<Record<GeneratedMapTypeV7, readonly number[]>> = {
  DRY_LAND: [8, 13, 17, 27, 42],
  LAKES: [7, 12, 16, 25, 38],
  PANGEA: [6, 11, 15, 24, 38],
  CONTINENTS: [6, 9, 12, 19, 29],
  ARCHIPELAGO: [4, 7, 9, 15, 23],
};
assert.deepEqual(LAND_PER_SETTLEMENT_V7, {
  DRY_LAND: 15,
  LAKES: 13,
  PANGEA: 12,
  CONTINENTS: 12,
  ARCHIPELAGO: 11,
});
for (const mapType of ALL_TYPES)
  WIDTHS.forEach((width, index) => {
    assert.equal(landTileCountV7(width, mapType), LAND[mapType][index]);
    assert.equal(
      settlementCountV7(width, mapType),
      SETTLEMENTS[mapType][index],
      `${mapType}/${width} settlements`,
    );
    assert.equal(
      seatCapacityV7(width, mapType),
      CAPACITY[mapType][index],
      `${mapType}/${width} capacity`,
    );
    assert.equal(
      maxSeatsV7(width, mapType),
      Math.min(FACTION_IDS_V7.length, CAPACITY[mapType][index] as number),
    );
  });
assert.equal(MAP_GENERATION_REVISION_V7, "REGIONAL_BIOMES_NAVAL_V4");

const FACTIONS: readonly FactionIdV7[] = FACTION_IDS_V7;
const OTHER_FACTIONS: readonly FactionIdV7[] = [...FACTION_IDS_V7].reverse();
function setupOf(
  mapType: GeneratedMapTypeV7,
  width: MatchSetupV7["width"],
  aiCount: MatchSetupV7["aiCount"],
  seed: number,
  curiosities: boolean,
  factions: readonly FactionIdV7[] = FACTIONS,
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
    factions: factions.slice(0, aiCount + 1),
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities,
  };
}
// Section 4.3, pinned independently of the engine: the capitals each
// Continents landmass holds, the largest first, by seat count.
const CONTINENT_SPLIT: Readonly<Record<number, readonly number[]>> = {
  2: [1, 1],
  3: [1, 1, 1],
  4: [2, 1, 1],
  5: [2, 2, 1],
  6: [2, 2, 1, 1],
  7: [2, 2, 2, 1],
  8: [2, 2, 2, 2],
  9: [3, 2, 2, 2],
};
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const edgeDistance = (width: number, at: CoordV7): number =>
  Math.min(at.x, at.y, width - 1 - at.x, width - 1 - at.y);

/** Eight-connected land components, as a component index per tile (-1 water). */
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
    let size = 0;
    const queue = [start];
    label[start] = id;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor] as number;
      size += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const near = ny * width + nx;
          if (label[near] !== -1 || tiles[near]?.biome === null) continue;
          label[near] = id;
          queue.push(near);
        }
    }
    sizes.push(size);
  }
  return { label, sizes };
}

function checkMap(
  map: GeneratedMapV7,
  mapType: GeneratedMapTypeV7,
  width: number,
  seats: number,
  label: string,
  partial: boolean,
): void {
  const expectedSettlements = SETTLEMENTS[mapType][
    WIDTHS.indexOf(width as (typeof WIDTHS)[number])
  ] as number;
  const { tiles } = map.board;
  const at = (coord: CoordV7) => tiles[coord.y * width + coord.x];
  assert.equal(map.capitals.length, seats, `${label}: capitals`);
  // Section 5.6: a setup new at 7r42 holds as many villages as fit.
  if (partial)
    assert(
      map.villages.length <= Math.max(0, expectedSettlements - seats),
      `${label}: villages over the density`,
    );
  else
    assert.equal(
      map.villages.length,
      Math.max(0, expectedSettlements - seats),
      `${label}: villages`,
    );
  assert.equal(
    tiles.filter((tile) => tile.site === "CAPITAL").length,
    seats,
    `${label}: capital sites`,
  );
  assert.equal(
    tiles.filter((tile) => tile.site === "VILLAGE").length,
    map.villages.length,
    `${label}: village sites`,
  );
  const zone = centralZoneEdgeDistanceV7(width, seats);
  assert.equal(zone, seats <= 8 ? Math.floor(width / 3) : null);
  for (const capital of map.capitals) {
    assert.equal(at(capital)?.site, "CAPITAL", `${label}: capital site`);
    assert(edgeDistance(width, capital) >= 2, `${label}: capital margin`);
    if (seats <= 8)
      assert(
        edgeDistance(width, capital) < Math.floor(width / 3),
        `${label}: capital in the central zone`,
      );
  }
  // Section 4.2: one capital per domain on Dry Land, Pangea, and Lakes.
  if (mapType === "DRY_LAND" || mapType === "PANGEA" || mapType === "LAKES") {
    const k = Math.ceil(Math.sqrt(seats));
    assert.equal(domainsPerSideV7(seats), k);
    const bandOf = (value: number): number => {
      for (let index = 0; index < k; index += 1) {
        const band = domainBandV7(width, k, index);
        assert.equal(band.from, Math.floor((index * width) / k));
        if (value >= band.from && value <= band.to) return index;
      }
      throw new Error(`${label}: no domain band`);
    };
    const domains = map.capitals.map(
      (capital) => `${bandOf(capital.x)},${bandOf(capital.y)}`,
    );
    assert.equal(new Set(domains).size, seats, `${label}: shared domain`);
    if (k === 3 && seats <= 8)
      assert(!domains.includes("1,1"), `${label}: centre domain`);
  }
  // Section 4.4 items 3 and 4.
  const room = capitalRoomSharesV7(map.board, map.capitals);
  assert(
    Math.max(...room) <= (seats <= 4 ? 1.5 : 2) * Math.min(...room) + 1e-9,
    `${label}: room balance ${room.join("/")}`,
  );
  const shares = nearestCapitalSharesV7(map.board, map.capitals, map.villages);
  const counted = shares.reduce((sum, share) => sum + share, 0);
  assert(
    Math.max(...shares) - Math.min(...shares) <=
      Math.max(2, Math.ceil((counted - 1e-9) / (2 * seats))) + 1e-9,
    `${label}: village balance ${shares.join("/")}`,
  );
  for (const village of map.villages) {
    assert.equal(at(village)?.site, "VILLAGE", `${label}: village site`);
    assert(edgeDistance(width, village) >= 1, `${label}: village margin`);
  }
  const settlements = [...map.capitals, ...map.villages];
  settlements.forEach((a, index) =>
    settlements
      .slice(index + 1)
      .forEach((b) =>
        assert(chebyshev(a, b) >= 3, `${label}: settlement spacing`),
      ),
  );
  const spacing = Math.max(3, Math.floor(width / Math.ceil(Math.sqrt(seats))));
  assert.equal(capitalSpacingV7(width, seats), spacing);
  map.capitals.forEach((a, index) =>
    map.capitals
      .slice(index + 1)
      .forEach((b) =>
        assert(chebyshev(a, b) >= spacing, `${label}: capital spacing`),
      ),
  );
  // The wild reserve.
  assert(
    map.wildCentres.length <=
      (wildReserveMapTypeV7(mapType) ? wildReserveCountV7(width) : 0),
    `${label}: wild reserve size`,
  );
  assert.equal(
    wildReserveCountV7(width),
    width >= 25 ? 3 : width >= 20 ? 2 : 1,
  );
  map.wildCentres.forEach((centre, index) => {
    assert(at(centre)?.biome !== null, `${label}: wild centre on land`);
    assert(edgeDistance(width, centre) >= 2, `${label}: wild centre margin`);
    const distances = map.capitals.map((capital) => chebyshev(capital, centre));
    assert(Math.min(...distances) >= 5, `${label}: wild centre near a capital`);
    assert(
      Math.max(...distances) - Math.min(...distances) <= 4,
      `${label}: wild centre spread`,
    );
    for (const other of map.wildCentres.slice(index + 1))
      assert(chebyshev(centre, other) >= 6, `${label}: wild centre spacing`);
    assert.equal(wildCentreVillageDistanceV7(width), width >= 16 ? 4 : 3);
    for (const village of map.villages)
      assert(
        chebyshev(centre, village) >= (width >= 16 ? 4 : 3),
        `${label}: village in reserve`,
      );
  });
  // Per-landmass rules.
  if (mapType !== "CONTINENTS" && mapType !== "ARCHIPELAGO") return;
  const components = landComponents(map);
  const componentOf = (coord: CoordV7): number =>
    components.label[coord.y * width + coord.x] ?? -1;
  // Section 4.3: the major landmass minimum scales down with the islands.
  const majorMinimum = Math.max(
    6,
    mapType === "ARCHIPELAGO"
      ? Math.min(
          Math.floor((width * width) / 20),
          Math.floor(
            (LAND.ARCHIPELAGO[
              WIDTHS.indexOf(width as (typeof WIDTHS)[number])
            ] as number) /
              (2 * seats),
          ),
        )
      : Math.floor((width * width) / 20),
  );
  assert.equal(majorLandmassMinimumV7(width, mapType, seats), majorMinimum);
  const major = components.sizes
    .map((size, id) => ({ size, id }))
    .filter((component) => component.size >= majorMinimum);
  if (mapType === "CONTINENTS") {
    // Section 4.3: the landmasses and the capitals each holds.
    const split = CONTINENT_SPLIT[seats];
    assert(split !== undefined, `${label}: no landmass split`);
    assert.deepEqual(continentCapitalSplitV7(seats), split);
    assert.equal(major.length, split.length, `${label}: landmasses`);
    assert.deepEqual(
      major
        .map(
          (component) =>
            map.capitals.filter((coord) => componentOf(coord) === component.id)
              .length,
        )
        .sort((a, b) => b - a),
      split,
      `${label}: capitals per landmass`,
    );
    const majorLand = major.reduce((sum, component) => sum + component.size, 0);
    for (const component of major) {
      const held = settlements.filter(
        (coord) => componentOf(coord) === component.id,
      ).length;
      assert(held >= 1, `${label}: empty landmass`);
      assert(
        held <=
          landmassSettlementCapV7(
            settlements.length,
            component.size,
            majorLand,
          ),
        `${label}: landmass over its share`,
      );
      assert(
        held <= Math.ceil((settlements.length * component.size) / majorLand),
        `${label}: landmass share`,
      );
    }
    return;
  }
  const homes = map.capitals.map(componentOf);
  assert.equal(new Set(homes).size, seats, `${label}: one capital per island`);
  const villagesAtHome = homes.map(
    (home) =>
      map.villages.filter((village) => componentOf(village) === home).length,
  );
  assert(
    Math.max(...villagesAtHome) - Math.min(...villagesAtHome) <= 1,
    `${label}: home islands uneven (${villagesAtHome.join("/")})`,
  );
}

interface CellReport {
  readonly cell: string;
  readonly settlements: number;
  /** The villages of the density, and the least and mean a board holds. */
  readonly villageTarget: number;
  readonly leastVillages: number;
  readonly meanVillages: number;
  readonly meanAttempts: number;
  readonly worstAttempt: number;
  readonly wildCentres: number;
  readonly landFeatureSeeds: number;
  readonly spiderSeeds: number;
  readonly riftSeeds: number;
}
const reports: CellReport[] = [];
const failures: string[] = [];
let boards = 0;
for (const mapType of mapTypes)
  for (const [width, aiCount] of SHAPES) {
    const seats = aiCount + 1;
    if (seats > maxSeatsV7(width, mapType)) continue;
    const cell = `${mapType}/${width}/${seats}`;
    // The setups of 7r41 have a baseline and exact village counts.
    const legacy =
      seats === 2 ||
      (seats === 3 && width >= 14) ||
      (seats === 4 && width >= 16);
    assert.equal(
      baseline.cells[cell] !== undefined,
      legacy,
      `${cell}: baseline`,
    );
    let attempts = 0;
    let worst = 0;
    let leastVillages = Infinity;
    let villageSum = 0;
    let wild = 0;
    let landFeature = 0;
    let spider = 0;
    let rift = 0;
    for (let seed = 0; seed < seeds; seed += 1) {
      const label = `${cell}/${seed}`;
      const setup = setupOf(mapType, width, aiCount, seed, true);
      assert.equal(
        villageCountV7(setup),
        Math.max(0, settlementCountV7(width, mapType) - seats),
      );
      const result = generateInitialMapV7(setup);
      if (!result.ok) {
        failures.push(`${label}: ${JSON.stringify(result.error)}`);
        continue;
      }
      const map = result.map;
      assert.equal(
        partialVillagesV7("CAPITAL_DOMAINS_CURIOSITIES", setup),
        !legacy,
      );
      checkMap(map, mapType, width, seats, label, !legacy);
      leastVillages = Math.min(leastVillages, map.villages.length);
      villageSum += map.villages.length;
      boards += 1;
      attempts += map.attempt;
      worst = Math.max(worst, map.attempt);
      wild += map.wildCentres.length;
      const hasSpider = map.neutrals.some(
        (entry) => entry.breed === "GIANT_SPIDER",
      );
      if (hasSpider) spider += 1;
      if (
        hasSpider ||
        map.curiosities.some(
          (curiosity) =>
            curiosity.kind === "FOUNTAIN" || curiosity.kind === "SHRINE",
        )
      )
        landFeature += 1;
      if (map.board.tiles.some((tile) => tile.terrain === "RIFT")) rift += 1;
      if (seed >= 8) continue;
      // Neutrality.
      const off = generateInitialMapV7(
        setupOf(mapType, width, aiCount, seed, false),
      );
      assert(off.ok, `${label}: curiosities off`);
      assert.deepEqual(
        { ...map, curiosities: [], neutrals: [] },
        off.map,
        `${label}: curiosities changed the map`,
      );
      const others = generateInitialMapV7(
        setupOf(mapType, width, aiCount, seed, true, OTHER_FACTIONS),
      );
      assert(others.ok, `${label}: other factions`);
      // Map curiosities round 2 (`pulp_wars-737.14`, section 24.1): the
      // seats decide only whether a Downed Saucer (no Martian seat) or a
      // Graveyard (no Undead seat) may be drawn, so the curiosities may
      // differ when the two lineups differ in those seats; nothing else may.
      const excluded = (factions: readonly FactionIdV7[]) =>
        `${factions.includes("MARTIAN")},${factions.includes("UNDEAD")}`;
      const sameExclusions =
        excluded(FACTIONS.slice(0, aiCount + 1)) ===
        excluded(OTHER_FACTIONS.slice(0, aiCount + 1));
      assert.deepEqual(
        sameExclusions
          ? others.map
          : { ...others.map, curiosities: [], neutrals: [] },
        sameExclusions ? map : { ...map, curiosities: [], neutrals: [] },
        `${label}: factions changed the map`,
      );
    }
    reports.push({
      cell,
      settlements: SETTLEMENTS[mapType][WIDTHS.indexOf(width)] as number,
      villageTarget: Math.max(
        0,
        (SETTLEMENTS[mapType][WIDTHS.indexOf(width)] as number) - seats,
      ),
      leastVillages,
      meanVillages: villageSum / seeds,
      meanAttempts: attempts / seeds,
      worstAttempt: worst,
      wildCentres: wild / seeds,
      landFeatureSeeds: landFeature,
      spiderSeeds: spider,
      riftSeeds: rift,
    });
  }

process.stdout.write(
  "cell                 S (7r39)  villages target, least / mean  attempts mean/worst (7r39)   wild  land feature (7r39)  Spider (7r39)  Rift (7r39)\n",
);
const ATTEMPT_ALLOWANCE = 1.6;
// Section 10.1: a cell new at 7r42 has no baseline to compare against.
const NEW_CELL_MEAN_ATTEMPTS = 8;
const NEW_CELL_WORST_ATTEMPT = 64;
const misses: string[] = [];
const pad = (value: number | undefined, width: number): string =>
  (value === undefined ? "-" : String(value)).padStart(width);
for (const report of reports) {
  const base = baseline.cells[report.cell];
  process.stdout.write(
    `${report.cell.padEnd(20)} ${String(report.settlements).padStart(2)} (${pad(base?.settlements, 2)})   ${String(report.villageTarget).padStart(2)}  ${String(report.leastVillages).padStart(2)} / ${report.meanVillages.toFixed(1).padStart(4)}                ${report.meanAttempts.toFixed(2).padStart(6)} / ${String(report.worstAttempt).padStart(3)} (${(base === undefined ? "-" : base.meanAttempts.toFixed(2)).padStart(5)} / ${pad(base?.worstAttempt, 3)})   ${report.wildCentres.toFixed(2)}  ${String(report.landFeatureSeeds).padStart(4)} (${pad(base?.landFeatureSeeds, 3)})           ${String(report.spiderSeeds).padStart(4)} (${pad(base?.spiderSeeds, 3)})     ${String(report.riftSeeds).padStart(4)} (${pad(base?.riftSeeds, 3)})\n`,
  );
  if (seeds !== baseline.seeds) continue;
  if (
    report.meanAttempts >
    (base === undefined
      ? NEW_CELL_MEAN_ATTEMPTS
      : Math.max(8, ATTEMPT_ALLOWANCE * base.meanAttempts))
  )
    misses.push(`${report.cell}: mean attempts ${report.meanAttempts}`);
  if (
    report.worstAttempt >
    (base === undefined
      ? NEW_CELL_WORST_ATTEMPT
      : Math.max(64, ATTEMPT_ALLOWANCE * base.worstAttempt))
  )
    misses.push(`${report.cell}: worst attempt ${report.worstAttempt}`);
  // The wild-reserve comparisons are of the cells the baseline has.
  if (base === undefined) continue;
  const [type, widthText] = report.cell.split("/");
  if (
    Number(widthText) >= 16 &&
    wildReserveMapTypeV7(type as GeneratedMapTypeV7)
  ) {
    if (report.landFeatureSeeds < 0.9 * base.landFeatureSeeds)
      misses.push(`${report.cell}: land feature seeds`);
    if (
      report.riftSeeds <
      (Number(widthText) >= 20 ? 0.85 : 0.5) * base.riftSeeds
    )
      misses.push(`${report.cell}: Rift seeds`);
  }
}
// The Giant Spider (`pulp_wars-ykw.7`): per map type, the boards of width 16
// and up with a Spider are at least 60% of the baseline's.
if (seeds === baseline.seeds)
  for (const mapType of mapTypes) {
    const cells = reports.filter(
      (report) =>
        report.cell.startsWith(`${mapType}/`) &&
        Number(report.cell.split("/")[1]) >= 16 &&
        baseline.cells[report.cell] !== undefined,
    );
    const now = cells.reduce((sum, report) => sum + report.spiderSeeds, 0);
    const before = cells.reduce(
      (sum, report) => sum + (baseline.cells[report.cell]?.spiderSeeds ?? 0),
      0,
    );
    process.stdout.write(
      `Giant Spider boards, ${mapType} 16 and up, two to four seats: ${now} (7r39: ${before})\n`,
    );
    // Continents and Archipelago had one Spider on these 3,072 boards.
    if (wildReserveMapTypeV7(mapType) && now < 0.6 * before)
      misses.push(`${mapType}: Giant Spider boards`);
  }
assert.deepEqual(failures, [], "generation failed");
assert.deepEqual(misses, [], "worse than the 7r39 baseline allows");
process.stdout.write(
  `ruleset-7 map scale PASS: ${boards} boards in ${reports.length} cells (${mapTypes.join(", ")}; 2 to ${FACTION_IDS_V7.length} seats; seeds 0-${seeds - 1}), no generation failure, the section 5.2 village counts (exact on the setups of 7r41, at most on the new ones), capital spacing, margins, central zone, domains, room and village balance, wild reserve, and per-landmass rules hold${seeds === baseline.seeds ? ", and attempts, land features, Giant Spiders, and Rifts stay within the 7r39 baseline's allowance (new cells: mean 8, worst 64)" : " (baseline comparison needs the full 256 seeds)"}\n`,
);
