import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import {
  MAX_MAP_GENERATION_ATTEMPTS,
  MAP_GENERATION_REVISION,
  canonicalHash,
  canonicalJson,
  generateInitialMap,
  neutralVillageCount,
  randomState,
  validateMapInvariants,
  type MatchSetup,
} from "../src/engine/index";
import { runAiMatch } from "../src/headless/index";

const HUGE_SIZE = 25 as const;
const SEED_COUNT = 1_000;
const MATCH_SEED = 0;
const MAX_COMMANDS = 20_000;
const MAX_ROUNDS = 500;

const started = performance.now();
const generation = [];
for (const aiCount of [1, 2, 3] as const) {
  const runStarted = performance.now();
  let attemptTotal = 0;
  let maximumAttempt = 0;
  const hashes: string[] = [];
  for (let seed = 0; seed < SEED_COUNT; seed += 1) {
    const setup = hugeSetup(aiCount, seed);
    const first = generateInitialMap(setup, randomState(seed));
    const repeat = generateInitialMap(setup, randomState(seed));
    if (!first.ok || !repeat.ok) {
      throw new Error(`Huge generation failed for ${aiCount} AI seed ${seed}`);
    }
    if (
      canonicalJson(first.map) !== canonicalJson(repeat.map) ||
      canonicalHash(first.map) !== canonicalHash(repeat.map)
    ) {
      throw new Error(
        `Huge generation repeat mismatch for ${aiCount} AI seed ${seed}`,
      );
    }
    const expectedVillages = neutralVillageCount(setup);
    const failures = validateMapInvariants(
      first.map.board,
      aiCount + 1,
      expectedVillages,
    );
    const mountains = first.map.board.tiles.filter(
      (tile) => tile.terrain === "MOUNTAIN",
    ).length;
    const forests = first.map.board.tiles.filter(
      (tile) => tile.terrain === "FOREST",
    ).length;
    const animals = first.map.board.tiles.filter(
      (tile) => tile.resource === "ANIMAL",
    ).length;
    const settlements = first.map.board.tiles.filter(
      (tile) => tile.site === "CAPITAL" || tile.site === "VILLAGE",
    ).length;
    if (
      failures.length > 0 ||
      mountains !== 113 ||
      forests !== 150 ||
      animals === 0 ||
      settlements !== 22 ||
      first.map.villages.length !== expectedVillages ||
      first.map.attempt > MAX_MAP_GENERATION_ATTEMPTS
    ) {
      throw new Error(
        `Huge invariant failure for ${aiCount} AI seed ${seed}: ${JSON.stringify({ failures, mountains, forests, animals, settlements, villages: first.map.villages.length, attempt: first.map.attempt })}`,
      );
    }
    attemptTotal += first.map.attempt;
    maximumAttempt = Math.max(maximumAttempt, first.map.attempt);
    hashes.push(canonicalHash(first.map));
  }
  generation.push({
    aiCount,
    seeds: SEED_COUNT,
    deterministicRuns: SEED_COUNT * 2,
    failures: 0,
    maximumAttempt,
    averageAttempts: attemptTotal / SEED_COUNT,
    runtimeMs: Math.round(performance.now() - runStarted),
    corpusHash: canonicalHash(hashes),
  });
  process.stderr.write(
    `validated ${SEED_COUNT} Huge seeds twice for ${aiCount} AI; max attempt ${maximumAttempt}\n`,
  );
}

const matches = [];
for (const aiCount of [1, 2, 3] as const) {
  const setup = hugeSetup(aiCount, MATCH_SEED);
  const runStarted = performance.now();
  const result = runAiMatch(setup, {
    maxCommands: MAX_COMMANDS,
    maxRounds: MAX_ROUNDS,
    recordCheckpointHashes: false,
  });
  if (
    result.termination !== "OUTCOME" ||
    result.outcome?.kind !== "HEADLESS_VICTORY" ||
    result.errors.length !== 0 ||
    result.stalls.length !== 0
  ) {
    throw new Error(
      `Huge complete match failed for ${aiCount} AI: ${JSON.stringify({ termination: result.termination, outcome: result.outcome, errors: result.errors, stalls: result.stalls })}`,
    );
  }
  matches.push({
    aiCount,
    seed: MATCH_SEED,
    maxCommands: MAX_COMMANDS,
    maxRounds: MAX_ROUNDS,
    winnerId: result.outcome.winnerId,
    rounds: result.rounds,
    commands: result.acceptedCommands,
    errors: 0,
    stalls: 0,
    runtimeMs: Math.round(performance.now() - runStarted),
    commandHash: canonicalHash(
      result.commandLog.map((record) => record.command),
    ),
    eventHash: canonicalHash(result.events),
    finalHash: result.stateHash,
  });
  process.stderr.write(
    `completed Huge ${aiCount}-AI match in round ${result.rounds} after ${result.acceptedCommands} commands\n`,
  );
}

const report = {
  schemaVersion: 5,
  rulesetId: "pulp-wars-poc-5",
  generatedAt: new Date().toISOString(),
  host: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    cpu: os.cpus()[0]?.model ?? "unknown",
  },
  contract: {
    size: HUGE_SIZE,
    totalSettlements: 22,
    neutralVillages: { 1: 20, 2: 19, 3: 18 },
    mountains: 113,
    forests: 150,
    generationAttemptCeiling: MAX_MAP_GENERATION_ATTEMPTS,
  },
  generation,
  completeMatches: matches,
  totalRuntimeMs: Math.round(performance.now() - started),
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
  await writeFile(resolved, serialized, "utf8");
  process.stdout.write(`Huge validation written to ${resolved}\n`);
}

function hugeSetup(aiCount: 1 | 2 | 3, seed: number): MatchSetup {
  return {
    rulesetId: "pulp-wars-poc-5",
    mapGenerationRevision: MAP_GENERATION_REVISION,
    seed,
    width: HUGE_SIZE,
    height: HUGE_SIZE,
    aiCount,
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
  };
}

function outputArg(): string | null {
  const index = process.argv.indexOf("--output");
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error("--output requires a path");
  return value;
}
