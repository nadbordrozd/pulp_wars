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
import type { ReplayFileV7 } from "../engine/v7/replay";
import {
  FACTION_IDS_V7,
  type BoardSizeV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../engine/v7/types";
import {
  allowedBoardSizesV7,
  autoBoardSizeV7,
  seatCountAllowedV7,
} from "../engine/v7/map-scale";
import {
  missionByIdV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
} from "../engine/v7/missions/index";
import { distinctFactionsV7, duplicateFactionV7 } from "../engine/v7/setup";
import { headless } from "./index";
import {
  V6_MATCH_MAX_COMMANDS_DEFAULT,
  V6_MATCH_MAX_ROUNDS_DEFAULT,
  headlessV6,
} from "./v6";
import {
  V7_MATCH_MAX_COMMANDS_DEFAULT,
  V7_MATCH_MAX_ROUNDS_DEFAULT,
  headlessV7,
} from "./v7";

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
    replay.version === 7
      ? await headlessV7.run(replay as ReplayFileV7)
      : replay.version === 6
        ? await headlessV6.run(replay as ReplayFileV6)
        : await headless.run(replay as ReplayFile);
  process.stdout.write(`${canonicalJson(result)}\n`);
} else if (mode === "match") {
  if (ruleset === "pulp-wars-poc-7r43") await runV7Match();
  else if (ruleset === "pulp-wars-poc-6") await runV6Match();
  else if (ruleset === "pulp-wars-poc-5") await runV5Match();
  else invalidRuleset();
} else if (mode === "batch") {
  if (ruleset === "pulp-wars-poc-7r43") await runV7Batch();
  else if (ruleset === "pulp-wars-poc-6") await runV6Batch();
  else if (ruleset === "pulp-wars-poc-5") await runV5Batch();
  else invalidRuleset();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}

async function runV7Match(): Promise<void> {
  if (args.includes("--demo"))
    throw new Error("ruleset 7 does not support --demo");
  const mapType = mapTypeArg();
  if (mapType === "MISSION") {
    await runV7MissionMatch();
    return;
  }
  if (args.includes("--mission"))
    throw new Error("--mission requires --map-type mission");
  const aiCount = aiCountArgV7();
  const size = boardSizeArgV7(aiCount, mapType);
  const setup: MatchSetupV7 = {
    rulesetId: "pulp-wars-poc-7r43",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    seed: numberArg("--seed", 0),
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: args.includes("--cooperative") ? "COOPERATIVE" : "RIVAL",
    humanColor: "CORAL",
    factions: factionsArgV7(aiCount),
    mapType,
    curiosities: curiositiesArgV7(),
    ...(allowDuplicateFactionsArgV7() ? { allowDuplicateFactions: true } : {}),
  };
  const result = await headlessV7.runAiMatch(setup, {
    maxCommands: numberArg("--max-commands", V7_MATCH_MAX_COMMANDS_DEFAULT),
    maxRounds: numberArg("--max-rounds", V7_MATCH_MAX_ROUNDS_DEFAULT),
  });
  writeMatchSummary(result);
}

/**
 * docs/product/CAMPAIGN.md section 2.4: `--map-type mission --mission <ID>`
 * plays the registered mission's current revision. The mission fixes the
 * board size, seats, seed, and AI mode; `--factions` (one value per seat)
 * picks seat 0's faction where the mission offers a choice and must repeat
 * the AI seats' fixed factions. Without it seat 0 plays its first choice.
 */
async function runV7MissionMatch(): Promise<void> {
  for (const flag of [
    "--seed",
    "--size",
    "--ai-count",
    "--cooperative",
    "--allow-duplicate-factions",
    "--curiosities",
  ])
    if (args.includes(flag))
      throw new Error(
        `${flag} does not apply to --map-type mission: the mission fixes its size, seats, seed, and mode, and has no curiosities`,
      );
  if (!args.includes("--mission"))
    throw new Error("--map-type mission requires --mission <ID>");
  const id = stringArg("--mission", "");
  const mission = missionByIdV7(id);
  if (mission === null)
    throw new Error(`--mission ${id} is not a registered mission`);
  const choices = mission.seats.map((seat) => missionSeatFactionsV7(seat));
  const factions = args.includes("--factions")
    ? factionsArgV7(mission.seats.length - 1)
    : null;
  const setup = missionMatchSetupV7(mission, factions?.[0]);
  if (
    setup === null ||
    (factions !== null && setup.factions.join(",") !== factions.join(","))
  )
    throw new Error(
      `ruleset 7 --factions for mission ${id} must be ${choices.map((choice) => choice.join("|").toLowerCase()).join(",")}`,
    );
  const result = await headlessV7.runAiMatch(setup, {
    maxCommands: numberArg("--max-commands", V7_MATCH_MAX_COMMANDS_DEFAULT),
    maxRounds: numberArg("--max-rounds", V7_MATCH_MAX_ROUNDS_DEFAULT),
  });
  writeMatchSummary(result);
}

async function runV7Batch(): Promise<void> {
  const factions = args.includes("--factions")
    ? factionsArgV7(uniqueBatchAiCountV7())
    : null;
  const mapTypes = mapTypesArg();
  const result = await headlessV7.runAiBatch({
    seeds: commaNumbers("--seeds", "0,1,2,3,4,5,6,7"),
    aiCounts: batchAiCountsV7(),
    modes: modesArg(),
    maxCommands: numberArg("--max-commands", V7_MATCH_MAX_COMMANDS_DEFAULT),
    maxRounds: numberArg("--max-rounds", V7_MATCH_MAX_ROUNDS_DEFAULT),
    ...v7BatchBoardSize(mapTypes),
    mapTypes,
    curiosities: curiositiesArgV7(),
    ...(factions === null ? {} : { factions }),
    ...(allowDuplicateFactionsArgV7() ? { allowDuplicateFactions: true } : {}),
  });
  process.stdout.write(`${canonicalJson(result)}\n`);
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

/**
 * Ruleset 7 `--ai-count` (docs/product/RULESET_7_MAP_SCALE.md section 9): 1
 * to `F - 1`, `F` the number of factions; the default stays 1.
 */
function aiCountArgV7(): number {
  const count = numberArg("--ai-count", 1);
  if (!Number.isSafeInteger(count) || count < 1 || count > maxAiCountV7())
    throw new Error(`--ai-count must be 1 to ${maxAiCountV7()}`);
  return count;
}

/** Ruleset 7 `--ai-counts`: each 1 to `F - 1`; the default stays 1,2,3. */
function batchAiCountsV7(): number[] {
  const counts = commaNumbers("--ai-counts", "1,2,3");
  if (
    counts.length === 0 ||
    counts.some(
      (count) =>
        !Number.isSafeInteger(count) || count < 1 || count > maxAiCountV7(),
    )
  )
    throw new Error(
      `--ai-counts must be a comma list of 1 to ${maxAiCountV7()}`,
    );
  return counts;
}

function maxAiCountV7(): number {
  return FACTION_IDS_V7.length - 1;
}

function uniqueBatchAiCountV7(): number {
  const unique = [...new Set(batchAiCountsV7())];
  if (unique.length !== 1 || unique[0] === undefined) {
    throw new Error(
      "--factions with batch requires exactly one --ai-counts value",
    );
  }
  return unique[0];
}

/**
 * Ruleset 7 `--size` (map scale sections 3.3, 6.2, and 9): the auto size of
 * the seat count and map type by default; a size that does not hold the
 * seats on the map type is an error naming the allowed sizes. Revision 18
 * section 5.5: the fixed Showcase board is 16 x 16 with at most three AI
 * seats, and any other `--size` is an error.
 */
function boardSizeArgV7(aiCount: number, mapType: MapTypeV7): BoardSizeV7 {
  const seats = aiCount + 1;
  const allowed = allowedBoardSizesV7(mapType, seats);
  if (mapType === "SHOWCASE" && numberArg("--size", 16) !== 16)
    throw new Error("--size must be 16 for the showcase map type");
  if (allowed.length === 0)
    throw new Error(
      `--ai-count ${aiCount} has no board size on the ${mapType.toLowerCase()} map type`,
    );
  const size = numberArg("--size", autoBoardSizeV7(seats, mapType) ?? 0);
  if (!seatCountAllowedV7(size, mapType, seats))
    throw new Error(
      `--size must be ${allowed.join(", ")} for ${seats} seats on the ${mapType.toLowerCase()} map type`,
    );
  return size as BoardSizeV7;
}

function v7BatchBoardSize(mapTypes: readonly MapTypeV7[]): {
  readonly boardSize?: 11 | 14 | 16 | 20 | 25;
} {
  if (!mapTypes.includes("SHOWCASE"))
    return optionalNumberArg("--size") === null
      ? {}
      : { boardSize: boardSizeArg(1) };
  if (numberArg("--size", 16) !== 16)
    throw new Error("--size must be 16 for the showcase map type");
  return { boardSize: 16 };
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

function mapTypeArg(): MapTypeV7 {
  const value = stringArg("--map-type", "continents")
    .toUpperCase()
    .replaceAll("-", "_");
  if (
    value === "DRY_LAND" ||
    value === "PANGEA" ||
    value === "CONTINENTS" ||
    value === "ARCHIPELAGO" ||
    value === "LAKES" ||
    value === "SHOWCASE" ||
    value === "MISSION"
  )
    return value;
  throw new Error(
    "--map-type must be dry_land, pangea, continents, archipelago, lakes, showcase, or mission",
  );
}

function mapTypesArg(): readonly MapTypeV7[] {
  return stringArg("--map-types", "continents")
    .split(",")
    .map((value) => {
      const normalized = value.toUpperCase().replaceAll("-", "_");
      if (
        normalized === "DRY_LAND" ||
        normalized === "PANGEA" ||
        normalized === "CONTINENTS" ||
        normalized === "ARCHIPELAGO" ||
        normalized === "LAKES" ||
        normalized === "SHOWCASE"
      )
        return normalized;
      throw new Error(
        "--map-types values must be dry_land, pangea, continents, archipelago, lakes, or showcase",
      );
    });
}

function factionsArgV6(aiCount: 1 | 2 | 3): readonly FactionIdV6[] {
  return args.includes("--factions")
    ? parseFactionValues(stringArg("--factions", ""), aiCount + 1)
    : Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const);
}

/**
 * Tools only: `--allow-duplicate-factions` lets `--factions` repeat a
 * faction (mirror matches); without it a repeated faction is refused, as in
 * the game (docs/product/RULESET_7_UNIQUE_FACTIONS.md).
 */
function allowDuplicateFactionsArgV7(): boolean {
  return args.includes("--allow-duplicate-factions");
}

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 3):
 * `--curiosities on` or `--curiosities off`; on by default, as on the setup
 * screen. The Showcase never has curiosities, whatever the value.
 */
function curiositiesArgV7(): boolean {
  if (!args.includes("--curiosities")) return true;
  const value = stringArg("--curiosities", "").toLowerCase();
  if (value === "on") return true;
  if (value === "off") return false;
  throw new Error("--curiosities must be on or off");
}

/**
 * Ruleset 7 seat-ordered factions: `original` (alias `human`), `undead`,
 * `goblin`, `dinosaur`, `martian`, `ice` (alias `ice_folk`), `dwarf`, or
 * `candy`, case-insensitive, exactly one value per seat (seat 0 first), no faction
 * twice unless `--allow-duplicate-factions`. Without `--factions` the seats
 * play distinct factions in registration order (Human, Undead, Goblin,
 * Dinosaur).
 */
function factionsArgV7(aiCount: number): readonly FactionIdV7[] {
  if (!args.includes("--factions")) return distinctFactionsV7(aiCount + 1);
  const values = stringArg("--factions", "").split(",");
  if (values.length !== aiCount + 1)
    throw new Error(
      `ruleset 7 --factions must contain exactly ${aiCount + 1} seat values`,
    );
  const factions = values.map((value): FactionIdV7 => {
    const normalized = value.trim().toLowerCase();
    if (normalized === "original" || normalized === "human") return "ORIGINAL";
    if (normalized === "undead") return "UNDEAD";
    if (normalized === "goblin") return "GOBLIN";
    if (normalized === "dinosaur") return "DINOSAUR";
    if (normalized === "martian") return "MARTIAN";
    if (normalized === "ice" || normalized === "ice_folk") return "ICE_FOLK";
    // The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 19.1).
    if (normalized === "dwarf") return "DWARF";
    // The Candy revision (docs/product/RULESET_7_CANDY.md section 19.1).
    if (normalized === "candy") return "CANDY";
    throw new Error(
      "ruleset 7 --factions values must be original (human), undead, goblin, dinosaur, martian, ice, dwarf, or candy",
    );
  });
  const duplicate = duplicateFactionV7(factions);
  if (duplicate !== null && !allowDuplicateFactionsArgV7())
    throw new Error(
      `ruleset 7 --factions must give every seat a different faction (${duplicate.faction} repeats at seats ${duplicate.seats.join(", ")}); tools may pass --allow-duplicate-factions`,
    );
  return factions;
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
  throw new Error(
    "--ruleset must be pulp-wars-poc-7r43, pulp-wars-poc-6, or pulp-wars-poc-5",
  );
}
