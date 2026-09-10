import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { runAiMatchV7 } from "../src/headless/v7";
import {
  RULESET_7_ID,
  type AiCountV7,
  type MatchSetupV7,
} from "../src/engine/index";
import {
  assertNormalMatrixArchiveRuntime,
  matrixCellKey,
  normalAiRuntimeFingerprint,
  requireUniqueMatrixSelectors,
  selectInitialMatrixEntries,
  type MatrixDiagnosticsV7,
  type MatrixHashesV7,
} from "./ruleset-v7-normal-ai-matrix-evidence";

assertNormalMatrixArchiveRuntime(RULESET_7_ID);

const aiCounts = parseAiCounts(valueAfter("--ai-counts") ?? "1,2,3");
const modes = parseModes(valueAfter("--modes") ?? "rival,cooperative");
const repeats = parsePositiveInteger(valueAfter("--repeats") ?? "2", "repeats");
const output = valueAfter("--output");
const resume = process.argv.includes("--resume");
requireUniqueMatrixSelectors(aiCounts, "ai-counts");
requireUniqueMatrixSelectors(modes, "modes");
const isCompletionMatrix =
  repeats >= 2 && aiCounts.length === 3 && modes.length === 2;

if (output !== undefined && !isCompletionMatrix)
  throw new RangeError(
    "--output requires the complete 1,2,3 × rival,cooperative matrix with at least two repeats",
  );
if (resume && output === undefined)
  throw new RangeError("--resume requires --output");
const runtimeFingerprint = normalAiRuntimeFingerprint();
const cellKeys = new Set(
  modes.flatMap((mode) =>
    aiCounts.map((aiCount) => matrixCellKey({ aiMode: mode, aiCount })),
  ),
);
const entries = selectInitialMatrixEntries(
  resume,
  resume && output !== undefined && existsSync(output)
    ? JSON.parse(readFileSync(output, "utf8"))
    : null,
  {
    runtimeFingerprint,
    repeats,
    expectedCells: cellKeys.size,
    cellKeys,
    limits: {
      acceptedCommandsPerTurn: 128,
      acceptedCommandsPerMatch: 30_000,
      rounds: 750,
    },
  },
);
if (output !== undefined) writeEvidence(output);

for (const mode of modes)
  for (const aiCount of aiCounts) {
    let entry = entries.find(
      (candidate) => candidate.aiMode === mode && candidate.aiCount === aiCount,
    );
    for (
      let repeat = (entry?.completedRuns ?? 0) + 1;
      repeat <= repeats;
      repeat += 1
    ) {
      const started = performance.now();
      const result = runAiMatchV7(setup(aiCount, mode), {
        maxCommands: 30_000,
        maxRounds: 750,
        progressEveryCommands: 100,
        onProgress: ({ acceptedCommands, round, activePlayerId }) => {
          process.stderr.write(
            `${mode} ai=${aiCount} repeat=${repeat} commands=${acceptedCommands} round=${round} active=${activePlayerId}\n`,
          );
        },
      });
      const run = compact(result);
      process.stderr.write(
        `${mode} ai=${aiCount} repeat=${repeat} completed in ${(
          (performance.now() - started) /
          1_000
        ).toFixed(
          1,
        )}s: ${result.termination} round=${result.rounds} commands=${result.acceptedCommands}\n`,
      );
      assertSuccessful(run, mode, aiCount, repeat);
      if (entry === undefined) {
        entry = {
          aiCount,
          aiMode: mode,
          ...run,
          completedRuns: 1,
          repeatHashesEqual: false,
        };
        entries.push(entry);
      } else {
        if (JSON.stringify(run.hashes) !== JSON.stringify(entry.hashes))
          throw new Error(
            `Repeat hash mismatch for ${mode} ai=${aiCount}: ${JSON.stringify([
              entry.hashes,
              run.hashes,
            ])}`,
          );
        entry = {
          ...entry,
          completedRuns: repeat,
          repeatHashesEqual: repeat >= 2,
        };
        const index = entries.findIndex(
          (candidate) =>
            candidate.aiMode === mode && candidate.aiCount === aiCount,
        );
        entries[index] = entry;
      }
      if (output !== undefined) writeEvidence(output);
    }
    if (entry === undefined || entry.completedRuns < repeats)
      throw new Error(`Matrix cell did not complete for ${mode} ai=${aiCount}`);
  }

if (output === undefined) process.stdout.write(serializeEvidence());
else {
  writeEvidence(output);
  process.stderr.write(`Wrote ${output}\n`);
}

interface MatchRun {
  readonly outcome: unknown;
  readonly termination: string;
  readonly rounds: number;
  readonly acceptedCommands: number;
  readonly diagnostics: MatrixDiagnosticsV7;
  readonly hashes: MatrixHashesV7;
}

function serializeEvidence(): string {
  const completedCells = entries.filter(
    (entry) => entry.completedRuns >= repeats,
  ).length;
  const complete =
    isCompletionMatrix &&
    completedCells === cellKeys.size &&
    entries.length === cellKeys.size;
  return `${JSON.stringify(
    {
      format: "pulp-wars-ruleset-7-normal-ai-matrix",
      version: 1,
      rulesetId: "pulp-wars-poc-7r2",
      runtimeFingerprint,
      seed: 0,
      repeats,
      expectedCells: aiCounts.length * modes.length,
      completedCells,
      complete,
      limits: {
        acceptedCommandsPerTurn: 128,
        acceptedCommandsPerMatch: 30_000,
        rounds: 750,
      },
      entries,
    },
    null,
    2,
  )}\n`;
}

function writeEvidence(path: string): void {
  writeFileSync(path, serializeEvidence(), "utf8");
}

function setup(
  aiCount: AiCountV7,
  aiMode: MatchSetupV7["aiMode"],
): MatchSetupV7 {
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: "pulp-wars-poc-7r2",
    seed: 0,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    mapGenerationRevision: "SPATIAL_ECONOMY",
  };
}

function compact(result: ReturnType<typeof runAiMatchV7>): MatchRun {
  return {
    outcome: result.outcome,
    termination: result.termination,
    rounds: result.rounds,
    acceptedCommands: result.acceptedCommands,
    diagnostics: {
      errors: result.metrics.errors,
      rejectedCommands: result.errors.filter((error) =>
        error.code.startsWith("COMMAND_REJECTED:"),
      ).length,
      mandatoryWorkOverflows: result.errors.filter(
        (error) => error.code === "TURN_COMMAND_CAP_EXCEEDED",
      ).length,
      stalls: result.metrics.stalls,
      hiddenInformationViolations:
        result.metrics.observation.hiddenInformationViolations,
      alliedHostileActions: result.metrics.relationships.alliedHostileActions,
      alliedTerritoryPathSteps:
        result.metrics.relationships.alliedTerritoryPathSteps,
      commandCapHits: result.metrics.commandCapHits,
      roundCapHits: result.metrics.roundCapHits,
    },
    hashes: {
      command: result.metrics.commandHash,
      event: result.metrics.eventHash,
      checkpoint: result.metrics.checkpointHash,
      final: result.metrics.finalHash,
    },
  };
}

function assertSuccessful(
  run: MatchRun,
  mode: MatchSetupV7["aiMode"],
  aiCount: AiCountV7,
  repeat: number,
): void {
  if (
    run.termination !== "OUTCOME" ||
    run.outcome === null ||
    Object.values(run.diagnostics).some((value) => value !== 0)
  )
    throw new Error(
      `Invalid completion for ${mode} ai=${aiCount} repeat=${repeat}: ${JSON.stringify(run)}`,
    );
}

function valueAfter(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function parseAiCounts(value: string): readonly AiCountV7[] {
  const values = value.split(",").map((item) => Number(item));
  if (
    values.length === 0 ||
    values.some((item) => item !== 1 && item !== 2 && item !== 3)
  )
    throw new RangeError("ai-counts must contain only 1,2,3");
  return values as AiCountV7[];
}

function parseModes(value: string): readonly MatchSetupV7["aiMode"][] {
  const values = value.split(",").map((item) => item.toUpperCase());
  if (
    values.length === 0 ||
    values.some((item) => item !== "RIVAL" && item !== "COOPERATIVE")
  )
    throw new RangeError("modes must contain only rival,cooperative");
  return values as MatchSetupV7["aiMode"][];
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new RangeError(`${name} must be a positive safe integer`);
  return parsed;
}
