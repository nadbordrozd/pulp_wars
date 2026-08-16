import { readFileSync } from "node:fs";
import {
  DEMO_MATCH_SETUP,
  canonicalJson,
  type FactionId,
  type MatchSetup,
  type ReplayFile,
} from "../engine/index";
import { headless } from "./index";

const args = process.argv.slice(2);
const mode = args[0] ?? "match";

if (mode === "replay") {
  const file = args[1];
  if (file === undefined) throw new Error("replay mode requires a JSON file");
  const replay = JSON.parse(readFileSync(file, "utf8")) as ReplayFile;
  const result = await headless.run(replay);
  process.stdout.write(`${canonicalJson(result)}\n`);
} else if (mode === "match") {
  const demo = args.includes("--demo");
  const aiCount = demo ? 2 : numberArg("--ai-count", 1);
  if (aiCount !== 1 && aiCount !== 2 && aiCount !== 3) {
    throw new Error("--ai-count must be 1, 2, or 3");
  }
  const size = demo ? 25 : boardSizeArg(aiCount);
  const factions = factionsArg(aiCount, demo);
  const setup: MatchSetup = demo
    ? DEMO_MATCH_SETUP
    : {
        rulesetId: "pulp-wars-poc-5",
        seed: numberArg("--seed", 0xdecafbad),
        width: size,
        height: size,
        aiCount,
        aiDifficulty: "NORMAL",
        aiMode: args.includes("--cooperative") ? "COOPERATIVE" : "RIVAL",
        humanColor: "CORAL",
        factions,
      };
  const result = await headless.runAiMatch(setup, {
    maxCommands: numberArg("--max-commands", 20_000),
    maxRounds: numberArg("--max-rounds", 500),
  });
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
} else if (mode === "batch") {
  const result = await headless.runAiBatch({
    seeds: stringArg("--seeds", "0,1,2,3,4,5,6,7")
      .split(",")
      .map((seed) => Number(seed)),
    aiCounts: stringArg("--ai-counts", "1,2,3")
      .split(",")
      .map((count) => Number(count))
      .filter(
        (count): count is 1 | 2 | 3 =>
          count === 1 || count === 2 || count === 3,
      ),
    maxCommands: numberArg("--max-commands", 20_000),
    maxRounds: numberArg("--max-rounds", 500),
    ...(optionalNumberArg("--size") === null
      ? {}
      : { boardSize: boardSizeArg(1) }),
    ...(args.includes("--cooperative")
      ? { aiMode: "COOPERATIVE" as const }
      : {}),
    ...(args.includes("--factions") ? { factions: factionsArgForBatch() } : {}),
  });
  process.stdout.write(`${canonicalJson(result)}\n`);
} else {
  throw new Error(`Unknown mode: ${mode}`);
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

function boardSizeArg(aiCount: 1 | 2 | 3): 11 | 14 | 16 | 20 | 25 {
  const fallback = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  const size = numberArg("--size", fallback);
  if (size !== 11 && size !== 14 && size !== 16 && size !== 20 && size !== 25) {
    throw new Error("--size must be 11, 14, 16, 20, or 25");
  }
  return size;
}

function factionsArg(aiCount: 1 | 2 | 3, demo: boolean): readonly FactionId[] {
  if (demo && args.includes("--factions"))
    throw new Error("--demo does not accept --factions");
  if (demo) return ["ORIGINAL", "ORIGINAL", "ORIGINAL"];
  if (!args.includes("--factions"))
    return Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const);
  return parseFactionList(stringArg("--factions", ""), aiCount + 1);
}

function factionsArgForBatch(): readonly FactionId[] {
  const counts = stringArg("--ai-counts", "1,2,3")
    .split(",")
    .map(Number)
    .filter((count) => count === 1 || count === 2 || count === 3);
  const uniqueCounts = [...new Set(counts)];
  if (uniqueCounts.length !== 1 || uniqueCounts[0] === undefined)
    throw new Error(
      "--factions with batch requires exactly one --ai-counts value",
    );
  return parseFactionList(stringArg("--factions", ""), uniqueCounts[0] + 1);
}

function parseFactionList(source: string, expectedLength: number): FactionId[] {
  const values = source.split(",");
  if (values.length !== expectedLength)
    throw new Error(
      `--factions must contain exactly ${expectedLength} seat values`,
    );
  return values.map((value) => {
    if (value === "original") return "ORIGINAL";
    if (value === "candy") return "CANDY";
    throw new Error("--factions values must be original or candy");
  });
}
