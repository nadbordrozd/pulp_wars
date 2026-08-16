import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import {
  canonicalHash,
  createGame,
  type Command,
  type MatchSetup,
  type TechId,
  type UnitType,
} from "../src/engine/index";
import { runAiMatch, type AiMatchResult } from "../src/headless/index";

const FIXED_SEEDS = [0, 1, 2] as const;
const MAX_COMMANDS = 20_000;
const MAX_ROUNDS = 500;
const SUPPORTED_SETUPS = [
  { aiCount: 1, size: 11 },
  { aiCount: 1, size: 14 },
  { aiCount: 1, size: 16 },
  { aiCount: 2, size: 14 },
  { aiCount: 2, size: 16 },
  { aiCount: 3, size: 16 },
] as const;
const HUGE_SETUPS = [
  { aiCount: 1, size: 25 },
  { aiCount: 2, size: 25 },
  { aiCount: 3, size: 25 },
] as const;
const SELECTABLE_SETUPS = [...SUPPORTED_SETUPS, ...HUGE_SETUPS] as const;
const SEEDS = selectedSeeds();
const SETUPS = selectedSetups();
const UNIT_TYPES = [
  "WARRIOR",
  "ARCHER",
  "DEFENDER",
  "RIDER",
  "CATAPULT",
] as const;
const TECHS = [
  "CLIMBING",
  "RIDING",
  "HUNTING",
  "ORGANIZATION",
  "MINING",
  "FORESTRY",
  "ARCHERY",
  "STRATEGY",
  "MATHEMATICS",
] as const;

interface Participation {
  readonly captures: number;
  readonly neutralCaptures: number;
  readonly hostileCaptures: number;
  readonly rewards: number;
  readonly fruitHarvests: number;
  readonly animalHunts: number;
  readonly minesBuilt: number;
  readonly lumberMillsBuilt: number;
  readonly populationGained: number;
  readonly cityLevelUps: number;
  readonly maximumCityLevel: number;
  readonly finalCityCount: number;
  readonly tilesRevealed: number;
  readonly commandsByKind: Readonly<Record<Command["kind"], number>>;
  readonly trained: Readonly<Record<UnitType, number>>;
  readonly unitActions: Readonly<Record<UnitType, number>>;
  readonly catapultAttacks: number;
  readonly catapultKills: number;
  readonly technologies: Readonly<Record<TechId, number>>;
}

interface CorpusEntry {
  readonly aiCount: 1 | 2 | 3;
  readonly size: 11 | 14 | 16 | 25;
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

const started = performance.now();
const entries: CorpusEntry[] = [];
for (const { aiCount, size } of SETUPS) {
  for (const seed of SEEDS) {
    const setup = makeSetup(aiCount, size, seed);
    const runStarted = performance.now();
    const first = runAiMatch(setup, {
      maxCommands: MAX_COMMANDS,
      maxRounds: MAX_ROUNDS,
      recordCheckpointHashes: false,
    });
    const runtimeMs = Math.round(performance.now() - runStarted);
    assertCompleted(first, setup);

    const repeat = runAiMatch(setup, {
      maxCommands: MAX_COMMANDS,
      maxRounds: MAX_ROUNDS,
      recordCheckpointHashes: false,
    });
    assertCompleted(repeat, setup);
    const firstHashes = hashes(first);
    const repeatHashes = hashes(repeat);
    if (canonicalHash(firstHashes) !== canonicalHash(repeatHashes)) {
      throw new Error(
        `Determinism mismatch for ${aiCount} AI, ${size}x${size}, seed ${seed}`,
      );
    }

    const outcome = first.outcome;
    if (outcome === null || outcome.kind !== "HEADLESS_VICTORY") {
      throw new Error("Complete headless match did not produce a winner");
    }
    entries.push({
      aiCount,
      size,
      seed,
      outcome: outcome.kind,
      winnerId: outcome.winnerId,
      rounds: first.rounds,
      commands: first.acceptedCommands,
      errors: first.errors.length,
      stalls: first.stalls.length,
      runtimeMs,
      ...firstHashes,
      repeatMatched: true,
      participation: participation(first, setup),
    });
    process.stderr.write(
      `validated ${aiCount} AI ${size}x${size} seed ${seed}: round ${first.rounds}, ${first.acceptedCommands} commands, ${runtimeMs} ms\n`,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

const aggregate = aggregateParticipation(entries);
if (
  SETUPS.length === SUPPORTED_SETUPS.length &&
  SEEDS.length === FIXED_SEEDS.length
) {
  for (const unit of UNIT_TYPES) {
    if (aggregate.trained[unit] === 0 || aggregate.unitActions[unit] === 0) {
      throw new Error(
        `${unit} did not train and participate in the fixed corpus`,
      );
    }
  }
  for (const tech of TECHS) {
    if (aggregate.technologies[tech] === 0) {
      throw new Error(`${tech} was not researched in the fixed corpus`);
    }
  }
  if (aggregate.captures === 0) throw new Error("Corpus recorded no captures");
  if (aggregate.rewards === 0)
    throw new Error("Corpus recorded no city rewards");
  if (aggregate.fruitHarvests === 0)
    throw new Error("Corpus recorded no fruit harvests");
  if (aggregate.animalHunts === 0)
    throw new Error("Corpus recorded no Animal hunts");
  if (aggregate.minesBuilt === 0) throw new Error("Corpus recorded no Mines");
  if (aggregate.lumberMillsBuilt === 0)
    throw new Error("Corpus recorded no Lumber Mills");
  for (const kind of Object.keys(
    aggregate.commandsByKind,
  ) as Command["kind"][]) {
    if (kind !== "WAIT" && aggregate.commandsByKind[kind] === 0) {
      throw new Error(`${kind} was not exercised in the fixed corpus`);
    }
  }
  if (aggregate.commandsByKind.WAIT !== 0) {
    throw new Error("Normal selected Wait in the fixed corpus");
  }
  if (aggregate.catapultAttacks === 0 || aggregate.catapultKills === 0) {
    throw new Error("Catapult did not attack and kill in the fixed corpus");
  }
}

const previousDocumentedBaseline = {
  rulesetId: "pulp-wars-poc-2",
  totalRounds: 519,
  totalCommands: 9_701,
  captures: 166,
  rewards: 238,
  fruitHarvests: 212,
  minesBuilt: 231,
  trainedUnits: 896,
  unitActions: 6_616,
} as const;

const report = {
  schemaVersion: 4,
  generatedAt: new Date().toISOString(),
  matrix: {
    seeds: SEEDS,
    setups: SETUPS,
    maxCommands: MAX_COMMANDS,
    maxRounds: MAX_ROUNDS,
    deterministicRunsPerEntry: 2,
  },
  summary: {
    matches: entries.length,
    deterministicRuns: entries.length * 2,
    completed: entries.length,
    errors: entries.reduce((sum, entry) => sum + entry.errors, 0),
    stalls: entries.reduce((sum, entry) => sum + entry.stalls, 0),
    totalRounds: entries.reduce((sum, entry) => sum + entry.rounds, 0),
    totalCommands: entries.reduce((sum, entry) => sum + entry.commands, 0),
    runtimeMs: Math.round(performance.now() - started),
    outcomes: countBy(entries, (entry) => `Player ${entry.winnerId}`),
    participation: aggregate,
    comparisonToPreviousDocumentedBaseline: {
      baseline: previousDocumentedBaseline,
      note: "The baseline is historical ruleset-2 evidence, so deltas demonstrate changed participation but do not isolate policy from the v4 rules boundary.",
      deltas: {
        totalRounds:
          entries.reduce((sum, entry) => sum + entry.rounds, 0) -
          previousDocumentedBaseline.totalRounds,
        totalCommands:
          entries.reduce((sum, entry) => sum + entry.commands, 0) -
          previousDocumentedBaseline.totalCommands,
        captures: aggregate.captures - previousDocumentedBaseline.captures,
        rewards: aggregate.rewards - previousDocumentedBaseline.rewards,
        fruitHarvests:
          aggregate.fruitHarvests - previousDocumentedBaseline.fruitHarvests,
        minesBuilt:
          aggregate.minesBuilt - previousDocumentedBaseline.minesBuilt,
        trainedUnits:
          Object.values(aggregate.trained).reduce(
            (sum, count) => sum + count,
            0,
          ) - previousDocumentedBaseline.trainedUnits,
        unitActions:
          Object.values(aggregate.unitActions).reduce(
            (sum, count) => sum + count,
            0,
          ) - previousDocumentedBaseline.unitActions,
      },
    },
  },
  entries,
};

const output = outputArg();
const serializedReport = await format(JSON.stringify(report), {
  parser: "json",
  endOfLine: "lf",
});
if (output === null) {
  process.stdout.write(serializedReport);
} else {
  const resolved = path.resolve(output);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, serializedReport, "utf8");
  process.stdout.write(`POC corpus written to ${resolved}\n`);
}

function makeSetup(
  aiCount: 1 | 2 | 3,
  size: 11 | 14 | 16 | 25,
  seed: number,
): MatchSetup {
  return {
    rulesetId: "pulp-wars-poc-4",
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
  };
}

function assertCompleted(result: AiMatchResult, setup: MatchSetup): void {
  if (
    result.termination !== "OUTCOME" ||
    result.outcome === null ||
    result.errors.length !== 0 ||
    result.stalls.length !== 0
  ) {
    throw new Error(
      `Incomplete corpus match ${setup.aiCount} AI ${setup.width}x${setup.height} seed ${setup.seed}: ${JSON.stringify({ termination: result.termination, outcome: result.outcome, errors: result.errors, stalls: result.stalls })}`,
    );
  }
}

function hashes(result: AiMatchResult): {
  readonly commandHash: string;
  readonly eventHash: string;
  readonly finalHash: string;
} {
  return {
    commandHash: canonicalHash(
      result.commandLog.map((record) => record.command),
    ),
    eventHash: canonicalHash(result.events),
    finalHash: result.stateHash,
  };
}

function participation(
  result: AiMatchResult,
  setup: MatchSetup,
): Participation {
  const created = createGame(setup);
  if (!created.ok)
    throw new Error(`Could not recreate setup: ${created.error.code}`);
  const unitTypes = new Map<number, UnitType>(
    created.state.units.map((unit) => [unit.id, unit.type]),
  );
  const trained = emptyUnitCounts();
  const unitActions = emptyUnitCounts();
  const technologies = emptyTechCounts();
  let captures = 0;
  let neutralCaptures = 0;
  let hostileCaptures = 0;
  let rewards = 0;
  let fruitHarvests = 0;
  let animalHunts = 0;
  let minesBuilt = 0;
  let lumberMillsBuilt = 0;
  let populationGained = 0;
  let cityLevelUps = 0;
  let tilesRevealed = 0;
  let catapultAttacks = 0;
  let catapultKills = 0;
  const commandsByKind = emptyCommandCounts();

  for (const record of result.commandLog) {
    commandsByKind[record.command.kind] += 1;
    if (record.command.kind === "TRAIN") trained[record.command.unit] += 1;
    if (record.command.kind === "RESEARCH")
      technologies[record.command.tech] += 1;
    if (record.command.kind === "CAPTURE") captures += 1;
    if (record.command.kind === "CHOOSE_CITY_REWARD") rewards += 1;
    if (record.command.kind === "HARVEST_FRUIT") fruitHarvests += 1;
    if (record.command.kind === "HUNT_ANIMAL") animalHunts += 1;
    if (record.command.kind === "BUILD_MINE") minesBuilt += 1;
    if (record.command.kind === "BUILD_LUMBER_MILL") lumberMillsBuilt += 1;
    if ("unitId" in record.command) {
      const type = unitTypes.get(record.command.unitId);
      if (type !== undefined) unitActions[type] += 1;
      if (record.command.kind === "ATTACK" && type === "CATAPULT") {
        catapultAttacks += 1;
        if (
          record.events.some(
            (event) => event.kind === "UNIT_DIED" && event.cause === "ATTACK",
          )
        ) {
          catapultKills += 1;
        }
      }
    }
    for (const event of record.events) {
      if (event.kind === "UNIT_TRAINED") {
        unitTypes.set(event.unitId, event.unit);
      }
      if (event.kind === "CITY_CAPTURED") {
        if (event.from === null) neutralCaptures += 1;
        else hostileCaptures += 1;
      }
      if (
        event.kind === "FRUIT_HARVESTED" ||
        event.kind === "ANIMAL_HUNTED" ||
        event.kind === "MINE_BUILT" ||
        event.kind === "LUMBER_MILL_BUILT"
      ) {
        populationGained += event.populationAdded;
      }
      if (event.kind === "CITY_LEVELED_UP") cityLevelUps += 1;
      if (event.kind === "TILES_REVEALED") {
        tilesRevealed += event.tiles.length;
      }
    }
  }
  return {
    captures,
    neutralCaptures,
    hostileCaptures,
    rewards,
    fruitHarvests,
    animalHunts,
    minesBuilt,
    lumberMillsBuilt,
    populationGained,
    cityLevelUps,
    maximumCityLevel: Math.max(
      ...result.state.cities.map((city) => city.level),
    ),
    finalCityCount: result.state.cities.length,
    tilesRevealed,
    commandsByKind,
    trained,
    unitActions,
    catapultAttacks,
    catapultKills,
    technologies,
  };
}

function aggregateParticipation(
  entries: readonly CorpusEntry[],
): Participation {
  const trained = emptyUnitCounts();
  const unitActions = emptyUnitCounts();
  const technologies = emptyTechCounts();
  let captures = 0;
  let neutralCaptures = 0;
  let hostileCaptures = 0;
  let rewards = 0;
  let fruitHarvests = 0;
  let animalHunts = 0;
  let minesBuilt = 0;
  let lumberMillsBuilt = 0;
  let populationGained = 0;
  let cityLevelUps = 0;
  let maximumCityLevel = 0;
  let finalCityCount = 0;
  let tilesRevealed = 0;
  let catapultAttacks = 0;
  let catapultKills = 0;
  const commandsByKind = emptyCommandCounts();
  for (const entry of entries) {
    captures += entry.participation.captures;
    neutralCaptures += entry.participation.neutralCaptures;
    hostileCaptures += entry.participation.hostileCaptures;
    rewards += entry.participation.rewards;
    fruitHarvests += entry.participation.fruitHarvests;
    animalHunts += entry.participation.animalHunts;
    minesBuilt += entry.participation.minesBuilt;
    lumberMillsBuilt += entry.participation.lumberMillsBuilt;
    populationGained += entry.participation.populationGained;
    cityLevelUps += entry.participation.cityLevelUps;
    maximumCityLevel = Math.max(
      maximumCityLevel,
      entry.participation.maximumCityLevel,
    );
    finalCityCount += entry.participation.finalCityCount;
    tilesRevealed += entry.participation.tilesRevealed;
    catapultAttacks += entry.participation.catapultAttacks;
    catapultKills += entry.participation.catapultKills;
    for (const kind of Object.keys(commandsByKind) as Command["kind"][]) {
      commandsByKind[kind] += entry.participation.commandsByKind[kind];
    }
    for (const unit of UNIT_TYPES) {
      trained[unit] += entry.participation.trained[unit];
      unitActions[unit] += entry.participation.unitActions[unit];
    }
    for (const tech of TECHS) {
      technologies[tech] += entry.participation.technologies[tech];
    }
  }
  return {
    captures,
    neutralCaptures,
    hostileCaptures,
    rewards,
    fruitHarvests,
    animalHunts,
    minesBuilt,
    lumberMillsBuilt,
    populationGained,
    cityLevelUps,
    maximumCityLevel,
    finalCityCount,
    tilesRevealed,
    commandsByKind,
    trained,
    unitActions,
    catapultAttacks,
    catapultKills,
    technologies,
  };
}

function emptyUnitCounts(): Record<UnitType, number> {
  return { WARRIOR: 0, ARCHER: 0, DEFENDER: 0, RIDER: 0, CATAPULT: 0 };
}

function emptyTechCounts(): Record<TechId, number> {
  return {
    CLIMBING: 0,
    RIDING: 0,
    HUNTING: 0,
    ORGANIZATION: 0,
    MINING: 0,
    FORESTRY: 0,
    ARCHERY: 0,
    STRATEGY: 0,
    MATHEMATICS: 0,
  };
}

function emptyCommandCounts(): Record<Command["kind"], number> {
  return {
    MOVE: 0,
    ATTACK: 0,
    ESCAPE_MOVE: 0,
    RECOVER: 0,
    CAPTURE: 0,
    PROMOTE: 0,
    WAIT: 0,
    RESEARCH: 0,
    HARVEST_FRUIT: 0,
    HUNT_ANIMAL: 0,
    BUILD_MINE: 0,
    BUILD_LUMBER_MILL: 0,
    TRAIN: 0,
    CHOOSE_CITY_REWARD: 0,
    END_TURN: 0,
  };
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

function outputArg(): string | null {
  const index = process.argv.indexOf("--output");
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error("--output requires a path");
  return value;
}

function selectedSeeds(): readonly number[] {
  const value = optionalArg("--seed");
  if (value === null) return FIXED_SEEDS;
  const seed = Number(value);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new Error("--seed must be a uint32 integer");
  }
  return [seed];
}

function selectedSetups(): readonly (typeof SELECTABLE_SETUPS)[number][] {
  const aiValue = optionalArg("--ai-count");
  const sizeValue = optionalArg("--size");
  if (aiValue === null && sizeValue === null) return SUPPORTED_SETUPS;
  if (aiValue === null || sizeValue === null) {
    throw new Error("--ai-count and --size must be supplied together");
  }
  const aiCount = Number(aiValue);
  const size = Number(sizeValue);
  const match = SELECTABLE_SETUPS.find(
    (setup) => setup.aiCount === aiCount && setup.size === size,
  );
  if (match === undefined) throw new Error("Unsupported AI/board-size pair");
  return [match];
}

function optionalArg(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} requires a value`);
  return value;
}
