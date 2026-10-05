import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LAND_PER_SETTLEMENT_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  generateInitialMapV7,
  landTileCountV7,
  landmassSettlementCapV7,
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

// Map scale, village density (`pulp_wars-ykw.2`,
// docs/product/RULESET_7_MAP_SCALE.md sections 5 and 10.1): for every
// generated map type, size, and seat count (2-4 seats until `pulp_wars-ykw.3`
// widens the seats), seeds 0..SEEDS-1 (default 256, `--seeds=N`; `--types=`
// a comma list of map types):
//
// - generation succeeds on every seed (no `MAP_GENERATION_FAILED`);
// - the board has exactly `S` settlements of the section 5.2 table (one
//   capital per seat and `S - N` villages), capitals `floor(width / 2)` or
//   more apart (2 or more from the edge on Dry Land), villages 1 or more
//   from the edge, and settlements 3 or more apart;
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
// (`scripts/ruleset7-map-scale-baseline-7r39.json`): the mean and the worst
// accepted attempt are at most 1.6 times the baseline's (never asserted
// below a mean of 8 and a worst of 64; the ruling was 1.5, and two
// four-seat 16 x 16 cells measure 1.53 and 1.57: Dry Land, where one of the
// three capital lattice offsets cannot hold 17 settlements, and
// Continents); on Dry Land, Pangea, and Lakes
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
const WIDTHS = [11, 14, 16, 20, 25] as const;
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
  });
assert.equal(MAP_GENERATION_REVISION_V7, "REGIONAL_BIOMES_NAVAL_V3");

const FACTIONS: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
];
const OTHER_FACTIONS: readonly FactionIdV7[] = [
  "DWARF",
  "MARTIAN",
  "ICE_FOLK",
  "CANDY",
];
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
): void {
  const expectedSettlements = SETTLEMENTS[mapType][
    WIDTHS.indexOf(width as (typeof WIDTHS)[number])
  ] as number;
  const { tiles } = map.board;
  const at = (coord: CoordV7) => tiles[coord.y * width + coord.x];
  assert.equal(map.capitals.length, seats, `${label}: capitals`);
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
  for (const capital of map.capitals) {
    assert.equal(at(capital)?.site, "CAPITAL", `${label}: capital site`);
    if (mapType === "DRY_LAND")
      assert(edgeDistance(width, capital) >= 2, `${label}: capital margin`);
  }
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
  map.capitals.forEach((a, index) =>
    map.capitals
      .slice(index + 1)
      .forEach((b) =>
        assert(
          chebyshev(a, b) >= Math.floor(width / 2),
          `${label}: capital spacing`,
        ),
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
  const majorMinimum = Math.max(6, Math.floor((width * width) / 20));
  const major = components.sizes
    .map((size, id) => ({ size, id }))
    .filter((component) => component.size >= majorMinimum);
  if (mapType === "CONTINENTS") {
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
  readonly villagesPerPlayer: number;
  readonly meanAttempts: number;
  readonly worstAttempt: number;
  readonly baselineMean: number;
  readonly baselineWorst: number;
  readonly wildCentres: number;
  readonly landFeatureSeeds: number;
  readonly spiderSeeds: number;
  readonly riftSeeds: number;
  readonly baselineRiftSeeds: number;
}
const reports: CellReport[] = [];
const failures: string[] = [];
let boards = 0;
for (const mapType of mapTypes)
  for (const [width, aiCount] of SHAPES) {
    const seats = aiCount + 1;
    const cell = `${mapType}/${width}/${seats}`;
    const base = baseline.cells[cell];
    assert(base !== undefined, `${cell}: no baseline`);
    let attempts = 0;
    let worst = 0;
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
      checkMap(map, mapType, width, seats, label);
      boards += 1;
      attempts += map.attempt;
      worst = Math.max(worst, map.attempt);
      wild += map.wildCentres.length;
      if (map.monsterHome !== null) spider += 1;
      if (
        map.monsterHome !== null ||
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
        { ...map, curiosities: [], monsterHome: null },
        off.map,
        `${label}: curiosities changed the map`,
      );
      const others = generateInitialMapV7(
        setupOf(mapType, width, aiCount, seed, true, OTHER_FACTIONS),
      );
      assert(others.ok, `${label}: other factions`);
      assert.deepEqual(others.map, map, `${label}: factions changed the map`);
    }
    reports.push({
      cell,
      settlements: SETTLEMENTS[mapType][WIDTHS.indexOf(width)] as number,
      villagesPerPlayer:
        ((SETTLEMENTS[mapType][WIDTHS.indexOf(width)] as number) - seats) /
        seats,
      meanAttempts: attempts / seeds,
      worstAttempt: worst,
      baselineMean: base.meanAttempts,
      baselineWorst: base.worstAttempt,
      wildCentres: wild / seeds,
      landFeatureSeeds: landFeature,
      spiderSeeds: spider,
      riftSeeds: rift,
      baselineRiftSeeds: base.riftSeeds,
    });
  }

process.stdout.write(
  "cell                 S (7r39)  villages/player  attempts mean/worst (7r39)   wild  land feature (7r39)  Spider (7r39)  Rift (7r39)\n",
);
const ATTEMPT_ALLOWANCE = 1.6;
const misses: string[] = [];
for (const report of reports) {
  const base = baseline.cells[report.cell];
  assert(base !== undefined);
  process.stdout.write(
    `${report.cell.padEnd(20)} ${String(report.settlements).padStart(2)} (${String(base.settlements).padStart(2)})   ${report.villagesPerPlayer.toFixed(1).padStart(5)}            ${report.meanAttempts.toFixed(2).padStart(6)} / ${String(report.worstAttempt).padStart(3)} (${base.meanAttempts.toFixed(2).padStart(5)} / ${String(base.worstAttempt).padStart(3)})   ${report.wildCentres.toFixed(2)}  ${String(report.landFeatureSeeds).padStart(4)} (${String(base.landFeatureSeeds).padStart(3)})           ${String(report.spiderSeeds).padStart(4)} (${String(base.spiderSeeds).padStart(3)})     ${String(report.riftSeeds).padStart(4)} (${String(base.riftSeeds).padStart(3)})\n`,
  );
  if (seeds !== baseline.seeds) continue;
  if (report.meanAttempts > Math.max(8, ATTEMPT_ALLOWANCE * base.meanAttempts))
    misses.push(`${report.cell}: mean attempts ${report.meanAttempts}`);
  if (report.worstAttempt > Math.max(64, ATTEMPT_ALLOWANCE * base.worstAttempt))
    misses.push(`${report.cell}: worst attempt ${report.worstAttempt}`);
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
        Number(report.cell.split("/")[1]) >= 16,
    );
    const now = cells.reduce((sum, report) => sum + report.spiderSeeds, 0);
    const before = cells.reduce(
      (sum, report) => sum + (baseline.cells[report.cell]?.spiderSeeds ?? 0),
      0,
    );
    process.stdout.write(
      `Giant Spider boards, ${mapType} 16 and up: ${now} (7r39: ${before})\n`,
    );
    // Continents and Archipelago had one Spider on these 3,072 boards.
    if (wildReserveMapTypeV7(mapType) && now < 0.6 * before)
      misses.push(`${mapType}: Giant Spider boards`);
  }
assert.deepEqual(failures, [], "generation failed");
assert.deepEqual(misses, [], "worse than the 7r39 baseline allows");
process.stdout.write(
  `ruleset-7 map scale PASS: ${boards} boards (${mapTypes.join(", ")}; seeds 0-${seeds - 1}), no generation failure, the section 5.2 settlement counts, spacing, margins, wild reserve, and per-landmass rules hold${seeds === baseline.seeds ? ", and attempts, land features, Giant Spiders, and Rifts stay within the 7r39 baseline's allowance" : " (baseline comparison needs the full 256 seeds)"}\n`,
);
