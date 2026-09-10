import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { AiCountV7, MatchSetupV7 } from "../src/engine/index";

export interface MatrixHashesV7 {
  readonly command: string;
  readonly event: string;
  readonly checkpoint: string;
  readonly final: string;
}

export const ARCHIVED_NORMAL_MATRIX_RULESET_ID = "pulp-wars-poc-7r2" as const;

export function assertNormalMatrixArchiveRuntime(
  runtimeRulesetId: string,
): void {
  if (runtimeRulesetId !== ARCHIVED_NORMAL_MATRIX_RULESET_ID)
    throw new Error(
      `Normal AI matrix evidence is an ${ARCHIVED_NORMAL_MATRIX_RULESET_ID} archive and cannot run against ${runtimeRulesetId}; write a separately approved current-revision matrix instead of relabeling archived evidence`,
    );
}

export interface MatrixDiagnosticsV7 {
  readonly errors: number;
  readonly rejectedCommands: number;
  readonly mandatoryWorkOverflows: number;
  readonly stalls: number;
  readonly hiddenInformationViolations: number;
  readonly alliedHostileActions: number;
  readonly alliedTerritoryPathSteps: number;
  readonly commandCapHits: number;
  readonly roundCapHits: number;
}

export interface MatrixEntryV7 {
  readonly aiCount: AiCountV7;
  readonly aiMode: MatchSetupV7["aiMode"];
  readonly outcome: unknown;
  readonly termination: string;
  readonly rounds: number;
  readonly acceptedCommands: number;
  readonly diagnostics: MatrixDiagnosticsV7;
  readonly hashes: MatrixHashesV7;
  readonly completedRuns: number;
  readonly repeatHashesEqual: boolean;
}

export interface MatrixResumeExpectationV7 {
  readonly runtimeFingerprint: string;
  readonly repeats: number;
  readonly expectedCells: number;
  readonly cellKeys: ReadonlySet<string>;
  readonly limits: {
    readonly acceptedCommandsPerTurn: 128;
    readonly acceptedCommandsPerMatch: 30_000;
    readonly rounds: 750;
  };
}

const DIAGNOSTIC_KEYS = [
  "errors",
  "rejectedCommands",
  "mandatoryWorkOverflows",
  "stalls",
  "hiddenInformationViolations",
  "alliedHostileActions",
  "alliedTerritoryPathSteps",
  "commandCapHits",
  "roundCapHits",
] as const satisfies readonly (keyof MatrixDiagnosticsV7)[];
const HASH_KEYS = ["command", "event", "checkpoint", "final"] as const;

export function normalAiRuntimeFingerprint(): string {
  const files = ["src/ai", "src/engine", "src/headless"]
    .flatMap(sourceFiles)
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(relative(process.cwd(), file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function selectInitialMatrixEntries(
  resume: boolean,
  existing: unknown,
  expected: MatrixResumeExpectationV7,
): MatrixEntryV7[] {
  if (!resume) return [];
  return validateResumableMatrixEvidence(existing, expected);
}

export function requireUniqueMatrixSelectors(
  values: readonly (string | number)[],
  name: string,
): void {
  if (new Set(values).size !== values.length)
    throw new RangeError(`${name} cannot contain duplicates`);
}

export function validateResumableMatrixEvidence(
  input: unknown,
  expected: MatrixResumeExpectationV7,
): MatrixEntryV7[] {
  if (!isRecord(input))
    throw new RangeError("Existing matrix is not an object");
  if (
    input.format !== "pulp-wars-ruleset-7-normal-ai-matrix" ||
    input.version !== 1 ||
    input.rulesetId !== "pulp-wars-poc-7r2" ||
    input.seed !== 0 ||
    input.repeats !== expected.repeats ||
    input.expectedCells !== expected.expectedCells ||
    input.runtimeFingerprint !== expected.runtimeFingerprint ||
    !isRecord(input.limits) ||
    input.limits.acceptedCommandsPerTurn !==
      expected.limits.acceptedCommandsPerTurn ||
    input.limits.acceptedCommandsPerMatch !==
      expected.limits.acceptedCommandsPerMatch ||
    input.limits.rounds !== expected.limits.rounds ||
    Object.keys(input.limits).sort().join(",") !==
      ["acceptedCommandsPerMatch", "acceptedCommandsPerTurn", "rounds"]
        .sort()
        .join(",") ||
    !Array.isArray(input.entries)
  )
    throw new RangeError("Existing matrix evidence is stale or incompatible");
  const entries = input.entries.map((entry) => validateEntry(entry, expected));
  const keys = entries.map(matrixCellKey);
  if (new Set(keys).size !== keys.length)
    throw new RangeError("Existing matrix has duplicate cells");
  const completedCells = entries.filter(
    (entry) => entry.completedRuns === expected.repeats,
  ).length;
  const complete =
    completedCells === expected.expectedCells &&
    expected.cellKeys.size === expected.expectedCells;
  if (input.completedCells !== completedCells || input.complete !== complete)
    throw new RangeError("Existing matrix completion flags are inconsistent");
  return entries;
}

export function matrixCellKey(entry: {
  readonly aiMode: MatchSetupV7["aiMode"];
  readonly aiCount: AiCountV7;
}): string {
  return `${entry.aiMode}:${entry.aiCount}`;
}

function validateEntry(
  input: unknown,
  expected: MatrixResumeExpectationV7,
): MatrixEntryV7 {
  if (!isRecord(input)) throw new RangeError("Existing matrix cell is invalid");
  const aiCount = input.aiCount;
  const aiMode = input.aiMode;
  if (
    (aiCount !== 1 && aiCount !== 2 && aiCount !== 3) ||
    (aiMode !== "RIVAL" && aiMode !== "COOPERATIVE") ||
    !expected.cellKeys.has(`${aiMode}:${aiCount}`) ||
    input.termination !== "OUTCOME" ||
    !isRecord(input.outcome) ||
    (input.outcome.kind !== "VICTORY" && input.outcome.kind !== "DEFEAT") ||
    !positiveSafeInteger(input.rounds) ||
    !positiveSafeInteger(input.acceptedCommands) ||
    !positiveSafeInteger(input.completedRuns) ||
    input.completedRuns > expected.repeats ||
    input.repeatHashesEqual !== input.completedRuns >= 2
  )
    throw new RangeError("Existing matrix cell is stale or malformed");
  if (!isRecord(input.diagnostics))
    throw new RangeError("Existing matrix diagnostics are missing");
  const diagnostics = input.diagnostics as Record<string, unknown>;
  if (
    Object.keys(diagnostics).sort().join(",") !==
      [...DIAGNOSTIC_KEYS].sort().join(",") ||
    DIAGNOSTIC_KEYS.some((key) => diagnostics[key] !== 0)
  )
    throw new RangeError("Existing matrix diagnostics are not clean");
  if (!isRecord(input.hashes))
    throw new RangeError("Existing matrix hashes are missing");
  const hashes = input.hashes as Record<string, unknown>;
  if (
    Object.keys(hashes).sort().join(",") !== [...HASH_KEYS].sort().join(",") ||
    HASH_KEYS.some(
      (key) =>
        typeof hashes[key] !== "string" ||
        !/^[0-9a-f]{64}$/.test(hashes[key] as string),
    )
  )
    throw new RangeError("Existing matrix hashes are malformed");
  return input as unknown as MatrixEntryV7;
}

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : entry.isFile() && entry.name.endsWith(".ts")
        ? [path]
        : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}
