import { strict as assert } from "node:assert";
import process from "node:process";
import {
  RULESET_7_ID,
  SHALLOW_WATER_MINIMUM_SHARE_V7,
  capitalGrowthReadyV7,
  generateInitialMapV7,
  type MapTypeV7,
} from "../src/engine/index";

// Revision 16 map acceptance (docs/product/RULESET_7_REVISION_16.md section
// 10.1): seeds 0-99 of all 60 cells, or with `--tight` seeds 0-999 of the
// tight cells. Every map must be accepted within the 256-candidate budget,
// every capital must be growth-ready, and Shallow Water must be at least 25%
// of a naval map's water. Prints the attempts table as JSON.

const tight = process.argv.includes("--tight");
const seeds = tight ? 1000 : 100;
const mapTypes: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const allCells = [
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
const tightCells: readonly (readonly [MapTypeV7, number, 1 | 2 | 3])[] = [
  ["ARCHIPELAGO", 16, 3],
  ["ARCHIPELAGO", 20, 2],
  ["ARCHIPELAGO", 20, 3],
  ["ARCHIPELAGO", 25, 1],
  ["ARCHIPELAGO", 25, 2],
  ["ARCHIPELAGO", 25, 3],
  ["CONTINENTS", 14, 2],
];
const cells = tight
  ? tightCells
  : mapTypes.flatMap((mapType) =>
      allCells.map(([size, aiCount]) => [mapType, size, aiCount] as const),
    );

interface Row {
  readonly cell: string;
  readonly maps: number;
  readonly meanAttempt: number;
  readonly worstAttempt: number;
  readonly capitalGrowthFailures: number;
  readonly minimumShallowShare: number | null;
}
const rows: Row[] = [];
for (const [mapType, size, aiCount] of cells) {
  let attempts = 0;
  let worst = 0;
  let growthFailures = 0;
  let minimumShare: number | null = null;
  for (let seed = 0; seed < seeds; seed += 1) {
    const generated = generateInitialMapV7({
      rulesetId: RULESET_7_ID,
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
      curiosities: false,
      seed,
      width: size,
      height: size,
      aiCount,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL"),
      allowDuplicateFactions: true,
      mapType,
    });
    const label = `${mapType}/${size}/${aiCount}/${seed}`;
    assert(generated.ok, `${label} was not accepted`);
    attempts += generated.map.attempt;
    worst = Math.max(worst, generated.map.attempt);
    growthFailures += generated.map.attempts.filter((attempt) =>
      attempt.failures.includes("CAPITAL_GROWTH"),
    ).length;
    for (const capital of generated.map.capitals)
      assert(
        capitalGrowthReadyV7(
          generated.map.board,
          capital,
          mapType !== "DRY_LAND",
        ),
        `${label} capital (${capital.x}, ${capital.y}) is not growth-ready`,
      );
    const water = generated.map.board.tiles.filter(
      (tile) => tile.biome === null,
    );
    if (water.length > 0) {
      const share =
        water.filter((tile) => tile.terrain === "SHALLOW_WATER").length /
        water.length;
      assert(
        share >= SHALLOW_WATER_MINIMUM_SHARE_V7,
        `${label} Shallow share ${share}`,
      );
      minimumShare = Math.min(minimumShare ?? 1, share);
    }
  }
  rows.push({
    cell: `${mapType} ${size}x${size} ${aiCount}-AI`,
    maps: seeds,
    meanAttempt: Math.round((attempts / seeds) * 100) / 100,
    worstAttempt: worst,
    capitalGrowthFailures: growthFailures,
    minimumShallowShare:
      minimumShare === null ? null : Math.round(minimumShare * 1000) / 1000,
  });
}
console.log(
  JSON.stringify(
    {
      rulesetId: RULESET_7_ID,
      seeds: `0..${seeds - 1}`,
      status: "PASS",
      cells: rows,
    },
    null,
    2,
  ),
);
