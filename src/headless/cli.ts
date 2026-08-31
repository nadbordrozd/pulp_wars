import { readFileSync } from "node:fs";
import {
  DEMO_MATCH_SETUP,
  MAP_GENERATION_REVISION,
  canonicalJson,
  type FactionId,
  type MatchSetup,
  type ReplayFile,
} from "../engine/index";
import type { AiModeV6, FactionIdV6, MatchSetupV6 } from "../engine/v6/types";
import type { ReplayFileV6 } from "../engine/v6/replay";
import { headless } from "./index";
import {
  V6_MATCH_MAX_COMMANDS_DEFAULT,
  V6_MATCH_MAX_ROUNDS_DEFAULT,
  headlessV6,
} from "./v6";

const args = process.argv.slice(2);
const mode = args[0] ?? "match";
const ruleset = stringArg("--ruleset", "pulp-wars-poc-6");

if (mode === "replay") {
  const file = args[1];
  if (file === undefined) throw new Error("replay mode requires a JSON file");
  const replay = JSON.parse(readFileSync(file, "utf8")) as {
    readonly version?: unknown;
  };
  const result =
    replay.version === 6
      ? await headlessV6.run(replay as ReplayFileV6)
      : await headless.run(replay as ReplayFile);
  process.stdout.write(`${canonicalJson(result)}\n`);
} else if (mode === "match") {
  if (ruleset === "pulp-wars-poc-6") await runV6Match();
  else if (ruleset === "pulp-wars-poc-5") await runV5Match();
  else invalidRuleset();
} else if (mode === "batch") {
  if (ruleset === "pulp-wars-poc-6") await runV6Batch();
  else if (ruleset === "pulp-wars-poc-5") await runV5Batch();
  else invalidRuleset();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}

async function runV6Match(): Promise<void> {
  if (args.includes("--demo")) {
    throw new Error("ruleset 6 does not support --demo");
  }
  const aiCount = aiCountArg("--ai-count", 1);
  const size = boardSizeArg(aiCount);
  const setup: MatchSetupV6 = {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: numberArg("--seed", 0),
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: args.includes("--cooperative") ? "COOPERATIVE" : "RIVAL",
    humanColor: "CORAL",
    factions: factionsArgV6(aiCount),
  };
  const result = await headlessV6.runAiMatch(setup, {
    maxCommands: numberArg("--max-commands", V6_MATCH_MAX_COMMANDS_DEFAULT),
    maxRounds: numberArg("--max-rounds", V6_MATCH_MAX_ROUNDS_DEFAULT),
  });
  writeMatchSummary(result);
}

async function runV6Batch(): Promise<void> {
  const result = await headlessV6.runAiBatch({
    seeds: commaNumbers("--seeds", "0,1,2,3,4,5,6,7"),
    aiCounts: batchAiCounts(),
    modes: modesArg(),
    maxCommands: numberArg("--max-commands", V6_MATCH_MAX_COMMANDS_DEFAULT),
    maxRounds: numberArg("--max-rounds", V6_MATCH_MAX_ROUNDS_DEFAULT),
    ...(optionalNumberArg("--size") === null
      ? {}
      : { boardSize: boardSizeArg(1) }),
    ...(args.includes("--factions")
      ? { factions: factionsArgForBatchV6() }
      : {}),
  });
  process.stdout.write(`${canonicalJson(result)}\n`);
}

async function runV5Match(): Promise<void> {
  const demo = args.includes("--demo");
  if (demo && args.includes("--factions")) {
    throw new Error("--demo does not accept --factions");
  }
  const aiCount = demo ? 2 : aiCountArg("--ai-count", 1);
  const size = demo ? 25 : boardSizeArg(aiCount);
  const setup: MatchSetup = demo
    ? DEMO_MATCH_SETUP
    : {
        rulesetId: "pulp-wars-poc-5",
        mapGenerationRevision: MAP_GENERATION_REVISION,
        seed: numberArg("--seed", 0xdecafbad),
        width: size,
        height: size,
        aiCount,
        aiDifficulty: "NORMAL",
        aiMode: args.includes("--cooperative") ? "COOPERATIVE" : "RIVAL",
        humanColor: "CORAL",
        factions: factionsArgV5(aiCount, false),
      };
  const result = await headless.runAiMatch(setup, {
    maxCommands: numberArg("--max-commands", 20_000),
    maxRounds: numberArg("--max-rounds", 500),
  });
  writeMatchSummary(result);
}

async function runV5Batch(): Promise<void> {
  const result = await headless.runAiBatch({
    seeds: commaNumbers("--seeds", "0,1,2,3,4,5,6,7"),
    aiCounts: batchAiCounts(),
    maxCommands: numberArg("--max-commands", 20_000),
    maxRounds: numberArg("--max-rounds", 500),
    ...(optionalNumberArg("--size") === null
      ? {}
      : { boardSize: boardSizeArg(1) }),
    ...(args.includes("--cooperative")
      ? { aiMode: "COOPERATIVE" as const }
      : {}),
    ...(args.includes("--factions")
      ? { factions: factionsArgForBatchV5() }
      : {}),
  });
  process.stdout.write(`${canonicalJson(result)}\n`);
}

function writeMatchSummary(result: {
  readonly acceptedCommands: number;
  readonly errors: readonly unknown[];
  readonly outcome: unknown;
  readonly metrics: unknown;
  readonly rounds: number;
  readonly stalls: readonly unknown[];
  readonly stateHash: string;
  readonly termination: string;
}): void {
  process.stdout.write(
    `${canonicalJson({
      acceptedCommands: result.acceptedCommands,
      errors: result.errors,
      outcome: result.outcome,
      metrics: result.metrics,
      rounds: result.rounds,
      stalls: result.stalls,
      stateHash: result.stateHash,
      termination: result.termination,
    })}\n`,
  );
}

function stringArg(name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index < 0 ? fallback : (args[index + 1] ?? fallback);
}

function numberArg(name: string, fallback: number): number {
  const parsed = Number(stringArg(name, String(fallback)));
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return parsed;
}

function optionalNumberArg(name: string): number | null {
  return args.includes(name) ? numberArg(name, 0) : null;
}

function commaNumbers(name: string, fallback: string): number[] {
  return stringArg(name, fallback).split(",").map(Number);
}

function aiCountArg(name: string, fallback: 1 | 2 | 3): 1 | 2 | 3 {
  const count = numberArg(name, fallback);
  if (count !== 1 && count !== 2 && count !== 3) {
    throw new Error(`${name} must be 1, 2, or 3`);
  }
  return count;
}

function batchAiCounts(): (1 | 2 | 3)[] {
  const counts = commaNumbers("--ai-counts", "1,2,3").filter(
    (count): count is 1 | 2 | 3 => count === 1 || count === 2 || count === 3,
  );
  if (counts.length === 0) throw new Error("--ai-counts cannot be empty");
  return counts;
}

function boardSizeArg(aiCount: 1 | 2 | 3): 11 | 14 | 16 | 20 | 25 {
  const fallback = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  const size = numberArg("--size", fallback);
  if (size !== 11 && size !== 14 && size !== 16 && size !== 20 && size !== 25) {
    throw new Error("--size must be 11, 14, 16, 20, or 25");
  }
  return size;
}

function modesArg(): readonly AiModeV6[] {
  if (args.includes("--cooperative")) return ["COOPERATIVE"];
  return stringArg("--modes", "rival")
    .split(",")
    .map((value): AiModeV6 => {
      if (value === "rival") return "RIVAL";
      if (value === "cooperative") return "COOPERATIVE";
      throw new Error("--modes values must be rival or cooperative");
    });
}

function factionsArgV6(aiCount: 1 | 2 | 3): readonly FactionIdV6[] {
  return args.includes("--factions")
    ? parseFactionValues(stringArg("--factions", ""), aiCount + 1)
    : Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const);
}

function factionsArgV5(
  aiCount: 1 | 2 | 3,
  demo: boolean,
): readonly FactionId[] {
  if (demo && args.includes("--factions")) {
    throw new Error("--demo does not accept --factions");
  }
  if (demo) return ["ORIGINAL", "ORIGINAL", "ORIGINAL"];
  return args.includes("--factions")
    ? parseFactionValues(stringArg("--factions", ""), aiCount + 1)
    : Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const);
}

function factionsArgForBatchV6(): readonly FactionIdV6[] {
  return parseFactionValues(
    stringArg("--factions", ""),
    uniqueBatchAiCount() + 1,
  );
}

function factionsArgForBatchV5(): readonly FactionId[] {
  return parseFactionValues(
    stringArg("--factions", ""),
    uniqueBatchAiCount() + 1,
  );
}

function uniqueBatchAiCount(): 1 | 2 | 3 {
  const unique = [...new Set(batchAiCounts())];
  if (unique.length !== 1 || unique[0] === undefined) {
    throw new Error(
      "--factions with batch requires exactly one --ai-counts value",
    );
  }
  return unique[0];
}

function parseFactionValues(
  source: string,
  expectedLength: number,
): ("ORIGINAL" | "CANDY")[] {
  const values = source.split(",");
  if (values.length !== expectedLength) {
    throw new Error(
      `--factions must contain exactly ${expectedLength} seat values`,
    );
  }
  return values.map((value) => {
    if (value === "original") return "ORIGINAL";
    if (value === "candy") return "CANDY";
    throw new Error("--factions values must be original or candy");
  });
}

function invalidRuleset(): never {
  throw new Error("--ruleset must be pulp-wars-poc-6 or pulp-wars-poc-5");
}
