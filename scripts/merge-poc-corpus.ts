import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";

interface Shard {
  readonly schemaVersion: 4;
  readonly matrix: {
    readonly seeds: readonly number[];
    readonly setups: readonly {
      readonly aiCount: number;
      readonly size: number;
    }[];
    readonly maxCommands: number;
    readonly maxRounds: number;
    readonly deterministicRunsPerEntry: number;
  };
  readonly summary: {
    readonly matches: number;
    readonly deterministicRuns: number;
    readonly completed: number;
    readonly errors: number;
    readonly stalls: number;
    readonly runtimeMs: number;
    readonly participation: Participation;
  };
  readonly entries: readonly Entry[];
}

interface Participation {
  readonly captures: number;
  readonly rewards: number;
  readonly fruitHarvests: number;
  readonly animalHunts: number;
  readonly minesBuilt: number;
  readonly lumberMillsBuilt: number;
  readonly trained: Readonly<Record<string, number>>;
  readonly unitActions: Readonly<Record<string, number>>;
  readonly catapultAttacks: number;
  readonly catapultKills: number;
  readonly technologies: Readonly<Record<string, number>>;
}

interface Entry {
  readonly aiCount: number;
  readonly size: number;
  readonly seed: number;
  readonly outcome: string;
  readonly winnerId: number;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  readonly runtimeMs: number;
  readonly commandHash: string;
  readonly eventHash: string;
  readonly finalHash: string;
  readonly repeatMatched: true;
  readonly participation: Participation;
}

const inputDirectory = path.resolve(valueArg("--input"));
const outputFile = path.resolve(valueArg("--output"));
const names = (await readdir(inputDirectory))
  .filter((name) =>
    /^case-(1-(11|14|16)|2-(14|16)|3-16)-[012]\.json$/.test(name),
  )
  .sort();
if (names.length !== 18) {
  throw new Error(`Expected 18 fixed corpus shards, found ${names.length}`);
}

const shards = await Promise.all(
  names.map(async (name) =>
    parseShard(await readFile(path.join(inputDirectory, name), "utf8")),
  ),
);
const entries = shards.flatMap((shard) => shard.entries).sort(compareEntries);
const keys = new Set(
  entries.map((entry) => `${entry.aiCount}:${entry.size}:${entry.seed}`),
);
if (entries.length !== 18 || keys.size !== 18) {
  throw new Error("Corpus shards do not contain 18 unique matrix entries");
}
if (
  entries.some(
    (entry) =>
      entry.outcome !== "HEADLESS_VICTORY" ||
      entry.errors !== 0 ||
      entry.stalls !== 0 ||
      entry.repeatMatched !== true,
  )
) {
  throw new Error("Corpus contains an incomplete or non-deterministic entry");
}

const participation = combineParticipation(
  entries.map((entry) => entry.participation),
);
for (const unit of ["WARRIOR", "ARCHER", "DEFENDER", "RIDER", "CATAPULT"]) {
  if (
    (participation.trained[unit] ?? 0) === 0 ||
    (participation.unitActions[unit] ?? 0) === 0
  ) {
    throw new Error(`${unit} did not train and participate`);
  }
}
for (const tech of [
  "CLIMBING",
  "RIDING",
  "HUNTING",
  "ORGANIZATION",
  "MINING",
  "FORESTRY",
  "ARCHERY",
  "STRATEGY",
  "MATHEMATICS",
]) {
  if ((participation.technologies[tech] ?? 0) === 0) {
    throw new Error(`${tech} was not researched`);
  }
}
if (
  participation.captures === 0 ||
  participation.rewards === 0 ||
  participation.fruitHarvests === 0 ||
  participation.animalHunts === 0 ||
  participation.minesBuilt === 0 ||
  participation.lumberMillsBuilt === 0 ||
  participation.catapultAttacks === 0 ||
  participation.catapultKills === 0
) {
  throw new Error(
    "Corpus lacks capture, reward, fruit, Animal, Mine, Lumber Mill, or Catapult participation",
  );
}

const output = {
  schemaVersion: 4,
  generatedAt: new Date().toISOString(),
  matrix: {
    seeds: [0, 1, 2],
    setups: [
      { aiCount: 1, size: 11 },
      { aiCount: 1, size: 14 },
      { aiCount: 1, size: 16 },
      { aiCount: 2, size: 14 },
      { aiCount: 2, size: 16 },
      { aiCount: 3, size: 16 },
    ],
    maxCommands: 20_000,
    maxRounds: 500,
    deterministicRunsPerEntry: 2,
  },
  summary: {
    matches: entries.length,
    deterministicRuns: entries.length * 2,
    completed: entries.length,
    errors: 0,
    stalls: 0,
    totalRounds: entries.reduce((sum, entry) => sum + entry.rounds, 0),
    totalCommands: entries.reduce((sum, entry) => sum + entry.commands, 0),
    measuredFirstRunRuntimeMs: entries.reduce(
      (sum, entry) => sum + entry.runtimeMs,
      0,
    ),
    outcomes: countBy(entries, (entry) => `Player ${entry.winnerId}`),
    participation,
  },
  entries,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(
  outputFile,
  await format(JSON.stringify(output), { parser: "json", endOfLine: "lf" }),
  "utf8",
);
process.stdout.write(
  `Merged ${entries.length} corpus entries into ${outputFile}\n`,
);

function parseShard(source: string): Shard {
  const value = JSON.parse(source) as Partial<Shard>;
  if (
    value.schemaVersion !== 4 ||
    value.matrix === undefined ||
    value.summary === undefined ||
    value.entries === undefined ||
    value.entries.length !== 1
  ) {
    throw new Error("Invalid POC corpus shard");
  }
  return value as Shard;
}

function compareEntries(left: Entry, right: Entry): number {
  return (
    left.aiCount - right.aiCount ||
    left.size - right.size ||
    left.seed - right.seed
  );
}

function combineParticipation(values: readonly Participation[]): Participation {
  const trained: Record<string, number> = {};
  const unitActions: Record<string, number> = {};
  const technologies: Record<string, number> = {};
  let captures = 0;
  let rewards = 0;
  let fruitHarvests = 0;
  let animalHunts = 0;
  let minesBuilt = 0;
  let lumberMillsBuilt = 0;
  let catapultAttacks = 0;
  let catapultKills = 0;
  for (const value of values) {
    captures += value.captures;
    rewards += value.rewards;
    fruitHarvests += value.fruitHarvests;
    animalHunts += value.animalHunts;
    minesBuilt += value.minesBuilt;
    lumberMillsBuilt += value.lumberMillsBuilt;
    catapultAttacks += value.catapultAttacks;
    catapultKills += value.catapultKills;
    addCounts(trained, value.trained);
    addCounts(unitActions, value.unitActions);
    addCounts(technologies, value.technologies);
  }
  return {
    captures,
    rewards,
    fruitHarvests,
    animalHunts,
    minesBuilt,
    lumberMillsBuilt,
    catapultAttacks,
    catapultKills,
    trained,
    unitActions,
    technologies,
  };
}

function addCounts(
  target: Record<string, number>,
  source: Readonly<Record<string, number>>,
): void {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function countBy<T>(
  values: readonly T[],
  key: (value: T) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const item = key(value);
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}

function valueArg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} requires a path`);
  return value;
}
