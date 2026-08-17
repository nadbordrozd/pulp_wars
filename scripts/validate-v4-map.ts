import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import {
  MAP_GENERATION_REVISION,
  RULESET_ID,
  canonicalHash,
  createGame,
  neutralVillageCount,
  validateMapInvariants,
  type BoardSize,
  type BoardState,
  type MatchSetup,
} from "../src/engine/index";

const CASES = [
  { category: "AUTO", aiCount: 1, size: 11, seeds: 1_000 },
  { category: "AUTO", aiCount: 1, size: 14, seeds: 1_000 },
  { category: "AUTO", aiCount: 1, size: 16, seeds: 1_000 },
  { category: "AUTO", aiCount: 2, size: 14, seeds: 1_000 },
  { category: "AUTO", aiCount: 2, size: 16, seeds: 1_000 },
  { category: "AUTO", aiCount: 3, size: 16, seeds: 1_000 },
  { category: "LARGE", aiCount: 1, size: 20, seeds: 1_000 },
  { category: "LARGE", aiCount: 2, size: 20, seeds: 1_000 },
  { category: "LARGE", aiCount: 3, size: 20, seeds: 1_000 },
  { category: "HUGE", aiCount: 1, size: 25, seeds: 100 },
  { category: "HUGE", aiCount: 2, size: 25, seeds: 100 },
  { category: "HUGE", aiCount: 3, size: 25, seeds: 100 },
] as const;

interface SettlementDistribution {
  opportunities: number;
  fruit: number;
  ore: number;
  animals: number;
  forests: number;
}

const started = performance.now();
const entries = [];
for (const corpusCase of CASES) {
  const caseStarted = performance.now();
  const boardHashes: string[] = [];
  const mixes = new Set<string>();
  const opportunityHistogram: Record<string, number> = {};
  const resourceCounts = { FRUIT: 0, ORE: 0, ANIMAL: 0 };
  let exactlyTwo = 0;
  let moreThanTwo = 0;

  for (let seed = 0; seed < corpusCase.seeds; seed += 1) {
    const setup = makeSetup(corpusCase.aiCount, corpusCase.size, seed);
    const rival = createGame(setup);
    const cooperative = createGame({ ...setup, aiMode: "COOPERATIVE" });
    if (!rival.ok || !cooperative.ok) {
      throw new Error(
        `Creation failed for ${caseLabel(corpusCase)} seed ${seed}`,
      );
    }
    const rivalHash = canonicalHash(rival.state.board);
    const cooperativeHash = canonicalHash(cooperative.state.board);
    if (rivalHash !== cooperativeHash) {
      throw new Error(
        `AI mode changed the map for ${caseLabel(corpusCase)} seed ${seed}`,
      );
    }
    boardHashes.push(rivalHash);

    const expectedVillages = neutralVillageCount(setup);
    const failures = validateMapInvariants(
      rival.state.board,
      corpusCase.aiCount + 1,
      expectedVillages,
    );
    if (failures.length > 0) {
      throw new Error(
        `Invariant failure for ${caseLabel(corpusCase)} seed ${seed}: ${failures.join(",")}`,
      );
    }
    assertExactCounts(rival.state.board, corpusCase.size, seed, corpusCase);

    for (const tile of rival.state.board.tiles) {
      if (tile.resource !== null) resourceCounts[tile.resource] += 1;
    }
    for (const distribution of settlementDistributions(rival.state.board)) {
      if (distribution.opportunities < 2) {
        throw new Error(
          `Opportunity minimum failed for ${caseLabel(corpusCase)} seed ${seed}`,
        );
      }
      if (distribution.opportunities === 2) exactlyTwo += 1;
      if (distribution.opportunities > 2) moreThanTwo += 1;
      increment(opportunityHistogram, String(distribution.opportunities));
      mixes.add(
        [
          distribution.fruit,
          distribution.ore,
          distribution.animals,
          distribution.forests,
        ].join(","),
      );
    }
  }

  if (mixes.size < 2 || exactlyTwo === 0 || moreThanTwo === 0) {
    throw new Error(
      `Distribution variety failed for ${caseLabel(corpusCase)}: ${JSON.stringify({ mixes: mixes.size, exactlyTwo, moreThanTwo })}`,
    );
  }
  const entry = {
    ...corpusCase,
    pairedBoards: corpusCase.seeds * 2,
    failures: 0,
    mountainCountPerBoard: roundedPercent(corpusCase.size ** 2, 18),
    forestCountPerBoard: roundedPercent(corpusCase.size ** 2, 24),
    resourceCountsAcrossUniqueMaps: resourceCounts,
    distinctSettlementMixes: mixes.size,
    exactlyTwoOpportunitySettlements: exactlyTwo,
    moreThanTwoOpportunitySettlements: moreThanTwo,
    opportunityHistogram,
    boardCorpusHash: canonicalHash(boardHashes),
    runtimeMs: Math.round(performance.now() - caseStarted),
  };
  entries.push(entry);
  process.stderr.write(
    `validated ${caseLabel(corpusCase)}: ${corpusCase.seeds} seeds in ${entry.runtimeMs} ms\n`,
  );
}

const report = {
  schemaVersion: 5,
  rulesetId: RULESET_ID,
  matrix: {
    modes: ["RIVAL", "COOPERATIVE"],
    cases: CASES,
    uniqueMapInputs: CASES.reduce((sum, entry) => sum + entry.seeds, 0),
    pairedBoards: CASES.reduce((sum, entry) => sum + entry.seeds * 2, 0),
  },
  assertions: {
    exactTerrainCounts: true,
    invariantSet: true,
    modeMapParity: true,
    animalPresent: true,
    distinctSettlementMixes: true,
    exactlyTwoOpportunitiesPresent: true,
    moreThanTwoOpportunitiesPresent: true,
  },
  entries,
  corpusHash: canonicalHash(
    entries.map(({ category, aiCount, size, seeds, boardCorpusHash }) => ({
      category,
      aiCount,
      size,
      seeds,
      boardCorpusHash,
    })),
  ),
  runtimeMs: Math.round(performance.now() - started),
};

const serialized = await format(JSON.stringify(report), {
  parser: "json",
  endOfLine: "lf",
});
const output = outputArg();
if (output === null) {
  process.stdout.write(serialized);
} else {
  const resolved = path.resolve(output);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, serialized, "utf8");
  process.stdout.write(`V4 map corpus written to ${resolved}\n`);
}

function makeSetup(
  aiCount: 1 | 2 | 3,
  size: BoardSize,
  seed: number,
): MatchSetup {
  return {
    rulesetId: RULESET_ID,
    mapGenerationRevision: MAP_GENERATION_REVISION,
    seed,
    width: size,
    height: size,
    aiCount,
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
  };
}

function assertExactCounts(
  board: BoardState,
  size: BoardSize,
  seed: number,
  corpusCase: (typeof CASES)[number],
): void {
  const mountains = board.tiles.filter(
    (tile) => tile.terrain === "MOUNTAIN",
  ).length;
  const forests = board.tiles.filter(
    (tile) => tile.terrain === "FOREST",
  ).length;
  const animals = board.tiles.filter(
    (tile) => tile.resource === "ANIMAL",
  ).length;
  if (
    mountains !== roundedPercent(size ** 2, 18) ||
    forests !== roundedPercent(size ** 2, 24) ||
    animals === 0
  ) {
    throw new Error(
      `Exact-count failure for ${caseLabel(corpusCase)} seed ${seed}: ${JSON.stringify({ mountains, forests, animals })}`,
    );
  }
}

function settlementDistributions(
  board: BoardState,
): readonly SettlementDistribution[] {
  const byCenter = new Map<string, SettlementDistribution>();
  for (const tile of board.tiles) {
    if (tile.site === "CAPITAL" || tile.site === "VILLAGE") {
      byCenter.set(coordKey(tile.at), {
        opportunities: 0,
        fruit: 0,
        ore: 0,
        animals: 0,
        forests: 0,
      });
    }
  }
  for (const tile of board.tiles) {
    if (tile.territoryCenter === null) continue;
    const distribution = byCenter.get(coordKey(tile.territoryCenter));
    if (distribution === undefined)
      throw new Error("Territory references a missing settlement");
    if (
      tile.at.x === tile.territoryCenter.x &&
      tile.at.y === tile.territoryCenter.y
    )
      continue;
    if (tile.resource !== null || tile.terrain === "FOREST")
      distribution.opportunities += 1;
    if (tile.resource === "FRUIT") distribution.fruit += 1;
    if (tile.resource === "ORE") distribution.ore += 1;
    if (tile.resource === "ANIMAL") distribution.animals += 1;
    if (tile.terrain === "FOREST") distribution.forests += 1;
  }
  return [...byCenter.values()];
}

function caseLabel(corpusCase: (typeof CASES)[number]): string {
  return `${corpusCase.category} ${corpusCase.aiCount}-AI/${corpusCase.size}`;
}

function coordKey(at: { readonly x: number; readonly y: number }): string {
  return `${at.x},${at.y}`;
}

function roundedPercent(value: number, percent: number): number {
  return Math.floor((value * percent + 50) / 100);
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function outputArg(): string | null {
  const index = process.argv.indexOf("--output");
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error("--output requires a path");
  return value;
}
