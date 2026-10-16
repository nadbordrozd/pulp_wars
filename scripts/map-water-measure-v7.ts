/**
 * Map water measurement (`pulp_wars-ykw.8`): generates Continents and Lakes
 * boards (the generator only, no match is played) and reports the water
 * share, the landmasses and islets, the seas between landmasses, and the
 * lakes, and renders contact sheets as PNG.
 *
 *   npx tsx scripts/map-water-measure-v7.ts <outDir> [label]
 *
 * SEEDS=1-8 picks the seeds, NO_IMAGES=1 skips the sheets, and
 * RULES=SPREAD_VILLAGES_CURIOSITIES measures the generator before 7r87.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  RULESET_7_ID,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  majorLandmassMinimumV7,
  priorVillageCountV7,
  type MapGenerationRulesV7,
  type AiCountV7,
  type BoardSizeV7,
  type CoordV7,
  type GeneratedMapV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../src/engine/index";

const outDir = process.argv[2] ?? "map-water-out";
const label = process.argv[3] ?? "current";
mkdirSync(outDir, { recursive: true });

function setup(
  mapType: MapTypeV7,
  width: BoardSizeV7,
  seats: number,
  seed: number,
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
    curiosities: true,
  };
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const cheb = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

function components(map: GeneratedMapV7, land: boolean): CoordV7[][] {
  const { width, height } = map.board;
  const isWanted = (x: number, y: number): boolean =>
    (map.board.tiles[y * width + x]?.biome !== null) === land;
  const seen = new Set<string>();
  const result: CoordV7[][] = [];
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!isWanted(x, y) || seen.has(key({ x, y }))) continue;
      const queue: CoordV7[] = [{ x, y }];
      seen.add(key({ x, y }));
      const component: CoordV7[] = [];
      while (queue.length > 0) {
        const at = queue.shift() as CoordV7;
        component.push(at);
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = at.x + dx;
            const ny = at.y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (!isWanted(nx, ny) || seen.has(key({ x: nx, y: ny }))) continue;
            seen.add(key({ x: nx, y: ny }));
            queue.push({ x: nx, y: ny });
          }
      }
      result.push(component);
    }
  return result.sort((a, b) => b.length - a.length);
}

const median = (values: number[]): number => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
};
const mean = (values: number[]): number =>
  values.length === 0
    ? Number.NaN
    : values.reduce((sum, value) => sum + value, 0) / values.length;
const fmt = (value: number): string =>
  Number.isNaN(value) ? "-" : value.toFixed(2);

interface Stats {
  waterShare: number;
  majors: number;
  islets: number;
  isletTiles: number;
  minGap: number;
  medianGap: number;
  edgeLand: number;
  lakes: number;
  lakeSizes: number[];
  lakeFill: number;
  attempt: number;
  rifts: number;
  curiosities: number;
}

function stats(map: GeneratedMapV7, mapType: MapTypeV7, seats: number): Stats {
  const { width, height } = map.board;
  const total = width * height;
  const water = map.board.tiles.filter((tile) => tile.biome === null).length;
  const landComponents = components(map, true);
  const minimum = majorLandmassMinimumV7(width, mapType, seats);
  const majors = landComponents.filter((c) => c.length >= minimum);
  const minors = landComponents.filter((c) => c.length < minimum);
  // Seas between landmasses: for each coast tile of a major landmass the
  // water tiles to the nearest tile of another major landmass (Chebyshev
  // distance minus one).
  const gaps: number[] = [];
  let minGap = Number.POSITIVE_INFINITY;
  majors.forEach((own, index) => {
    const others = majors.filter((_, other) => other !== index).flat();
    if (others.length === 0) return;
    const ownKeys = new Set(own.map(key));
    for (const at of own) {
      const coast = [-1, 0, 1].some((dy) =>
        [-1, 0, 1].some((dx) => {
          const nx = at.x + dx;
          const ny = at.y + dy;
          return (
            nx >= 0 &&
            ny >= 0 &&
            nx < width &&
            ny < height &&
            !ownKeys.has(key({ x: nx, y: ny })) &&
            map.board.tiles[ny * width + nx]?.biome === null
          );
        }),
      );
      if (!coast) continue;
      const gap = Math.min(...others.map((other) => cheb(at, other))) - 1;
      gaps.push(gap);
      minGap = Math.min(minGap, gap);
    }
  });
  const edgeLand = map.board.tiles.filter(
    (tile) =>
      tile.biome !== null &&
      (tile.at.x === 0 ||
        tile.at.y === 0 ||
        tile.at.x === width - 1 ||
        tile.at.y === height - 1),
  ).length;
  const waterComponents = components(map, false).filter((c) =>
    c.every(
      (at) => at.x > 0 && at.y > 0 && at.x < width - 1 && at.y < height - 1,
    ),
  );
  const fills = waterComponents.map((c) => {
    const xs = c.map((at) => at.x);
    const ys = c.map((at) => at.y);
    const box =
      (Math.max(...xs) - Math.min(...xs) + 1) *
      (Math.max(...ys) - Math.min(...ys) + 1);
    return c.length / box;
  });
  return {
    waterShare: water / total,
    majors: majors.length,
    islets: minors.length,
    isletTiles: minors.reduce((sum, c) => sum + c.length, 0),
    minGap: Number.isFinite(minGap) ? minGap : Number.NaN,
    medianGap: median(gaps),
    edgeLand: edgeLand / (4 * width - 4),
    lakes: waterComponents.length,
    lakeSizes: waterComponents.map((c) => c.length),
    lakeFill: mean(fills),
    attempt: map.attempt,
    rifts: map.board.tiles.some((tile) => tile.terrain === "RIFT") ? 1 : 0,
    curiosities: map.curiosities.length,
  };
}

const COLOURS: Record<string, [number, number, number]> = {
  DEEP_WATER: [28, 64, 120],
  SHALLOW_WATER: [76, 140, 196],
  GRASS: [126, 176, 84],
  FOREST: [52, 110, 56],
  MOUNTAIN: [140, 134, 124],
  RIFT: [90, 30, 110],
};

async function sheet(
  name: string,
  maps: readonly GeneratedMapV7[],
  cell = 10,
): Promise<void> {
  const columns = Math.min(4, maps.length);
  const rows = Math.ceil(maps.length / columns);
  const size = (maps[0]?.board.width ?? 11) * cell;
  const gutter = 8;
  const outW = columns * size + (columns + 1) * gutter;
  const outH = rows * size + (rows + 1) * gutter;
  const pixels = Buffer.alloc(outW * outH * 3, 255);
  maps.forEach((map, index) => {
    const ox = gutter + (index % columns) * (size + gutter);
    const oy = gutter + Math.floor(index / columns) * (size + gutter);
    const capitals = new Set(map.capitals.map(key));
    const villages = new Set(map.villages.map(key));
    for (const tile of map.board.tiles) {
      const base = COLOURS[tile.terrain] ?? [255, 0, 255];
      for (let py = 0; py < cell; py += 1)
        for (let px = 0; px < cell; px += 1) {
          let colour = base;
          const inner =
            px >= cell / 4 &&
            px < (3 * cell) / 4 &&
            py >= cell / 4 &&
            py < (3 * cell) / 4;
          if (inner && capitals.has(key(tile.at))) colour = [220, 40, 40];
          else if (inner && villages.has(key(tile.at))) colour = [245, 210, 60];
          if (px === cell - 1 || py === cell - 1)
            colour = colour.map((c) => Math.round(c * 0.85)) as typeof colour;
          const offset =
            ((oy + tile.at.y * cell + py) * outW + ox + tile.at.x * cell + px) *
            3;
          pixels[offset] = colour[0];
          pixels[offset + 1] = colour[1];
          pixels[offset + 2] = colour[2];
        }
    }
  });
  await sharp(pixels, { raw: { width: outW, height: outH, channels: 3 } })
    .png()
    .toFile(join(outDir, `${name}.png`));
}

const CELLS: readonly [MapTypeV7, BoardSizeV7, number][] = [
  ["CONTINENTS", 11, 2],
  ["CONTINENTS", 11, 6],
  ["CONTINENTS", 14, 2],
  ["CONTINENTS", 14, 3],
  ["CONTINENTS", 16, 2],
  ["CONTINENTS", 16, 4],
  ["CONTINENTS", 20, 2],
  ["CONTINENTS", 20, 5],
  ["CONTINENTS", 20, 7],
  ["CONTINENTS", 25, 2],
  ["CONTINENTS", 25, 4],
  ["CONTINENTS", 25, 9],
  ["LAKES", 11, 2],
  ["LAKES", 14, 2],
  ["LAKES", 14, 4],
  ["LAKES", 16, 2],
  ["LAKES", 16, 4],
  ["LAKES", 20, 2],
  ["LAKES", 20, 6],
  ["LAKES", 25, 3],
  ["LAKES", 25, 9],
];
const SEEDS = (process.env.SEEDS ?? "1-8").split("-").map(Number);
const seeds: number[] = [];
for (let seed = SEEDS[0] ?? 1; seed <= (SEEDS[1] ?? 8); seed += 1)
  seeds.push(seed);

const lines: string[] = [
  `# ${label}: seeds ${String(seeds[0])}-${String(seeds.at(-1))}`,
  "",
  "| cell | water % | majors | islets (tiles) | min sea | median sea | edge land % | lakes | lake sizes | lake box fill | attempts mean/max | rift boards | curiosities | failed |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
];
for (const [mapType, width, seats] of CELLS) {
  const maps: GeneratedMapV7[] = [];
  let failed = 0;
  for (const seed of seeds) {
    const input = setup(mapType, width, seats, seed);
    // RULES names a parity generator (the generator before 7r87 is
    // SPREAD_VILLAGES_CURIOSITIES); unset, the current generator.
    const rules = process.env.RULES as MapGenerationRulesV7 | undefined;
    const result =
      rules === undefined
        ? generateInitialMapV7(input)
        : generateInitialMapWithVillageCountV7(
            input,
            priorVillageCountV7(input),
            rules,
          );
    if (result.ok) maps.push(result.map);
    else failed += 1;
  }
  const all = maps.map((map) => stats(map, mapType, seats));
  const lakeSizes = all.map((s) => s.lakeSizes.join("+"));
  lines.push(
    `| ${mapType} ${String(width)}/${String(seats)} | ${fmt(100 * mean(all.map((s) => s.waterShare)))} | ${fmt(mean(all.map((s) => s.majors)))} | ${fmt(mean(all.map((s) => s.islets)))} (${fmt(mean(all.map((s) => s.isletTiles)))}) | ${fmt(Math.min(...all.map((s) => s.minGap)))} | ${fmt(median(all.map((s) => s.medianGap)))} | ${fmt(100 * mean(all.map((s) => s.edgeLand)))} | ${fmt(mean(all.map((s) => s.lakes)))} | ${mapType === "LAKES" ? lakeSizes.slice(0, 4).join(", ") : "-"} | ${mapType === "LAKES" ? fmt(mean(all.map((s) => s.lakeFill))) : "-"} | ${fmt(mean(all.map((s) => s.attempt)))}/${String(Math.max(...all.map((s) => s.attempt)))} | ${String(all.reduce((sum, s) => sum + s.rifts, 0))} | ${fmt(mean(all.map((s) => s.curiosities)))} | ${String(failed)} |`,
  );
  process.stderr.write(`${lines.at(-1) ?? ""}\n`);
  if (process.env.NO_IMAGES === undefined && maps.length > 0)
    await sheet(
      `${label}-${mapType.toLowerCase()}-${String(width)}-${String(seats)}`,
      maps.slice(0, 8),
      width <= 14 ? 14 : width <= 20 ? 10 : 8,
    );
}
writeFileSync(join(outDir, `${label}-numbers.md`), `${lines.join("\n")}\n`);
process.stdout.write(`${lines.join("\n")}\n`);
