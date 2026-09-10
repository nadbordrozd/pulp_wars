import { describe, expect, it } from "vitest";
import {
  assertNormalMatrixArchiveRuntime,
  requireUniqueMatrixSelectors,
  selectInitialMatrixEntries,
  validateResumableMatrixEvidence,
  type MatrixResumeExpectationV7,
} from "../../scripts/ruleset-v7-normal-ai-matrix-evidence";

const FINGERPRINT = "a".repeat(64);
const HASH = "b".repeat(64);
const EXPECTED: MatrixResumeExpectationV7 = {
  runtimeFingerprint: FINGERPRINT,
  repeats: 2,
  expectedCells: 6,
  cellKeys: new Set([
    "RIVAL:1",
    "RIVAL:2",
    "RIVAL:3",
    "COOPERATIVE:1",
    "COOPERATIVE:2",
    "COOPERATIVE:3",
  ]),
  limits: {
    acceptedCommandsPerTurn: 128,
    acceptedCommandsPerMatch: 30_000,
    rounds: 750,
  },
};

describe("ruleset-7 Normal matrix evidence resume", () => {
  it("rejects the revision-3 runtime instead of relabeling revision-2 evidence", () => {
    expect(() => assertNormalMatrixArchiveRuntime("pulp-wars-poc-7r3")).toThrow(
      /7r2 archive.*7r3/,
    );
    expect(() =>
      assertNormalMatrixArchiveRuntime("pulp-wars-poc-7r2"),
    ).not.toThrow();
  });

  it("ignores existing output by default and reuses it only when explicit", () => {
    const evidence = validEvidence();
    expect(
      selectInitialMatrixEntries(false, { stale: true }, EXPECTED),
    ).toEqual([]);
    expect(selectInitialMatrixEntries(true, evidence, EXPECTED)).toHaveLength(
      1,
    );
    expect(() => requireUniqueMatrixSelectors([1, 1, 1], "ai-counts")).toThrow(
      /duplicates/,
    );
  });

  it("rejects stale, duplicate, inconsistent, dirty, and malformed resume data", () => {
    const stale = validEvidence();
    stale.runtimeFingerprint = "c".repeat(64);
    expect(() => validateResumableMatrixEvidence(stale, EXPECTED)).toThrow(
      /stale or incompatible/,
    );

    const duplicate = validEvidence();
    duplicate.entries.push(structuredClone(onlyEntry(duplicate)));
    expect(() => validateResumableMatrixEvidence(duplicate, EXPECTED)).toThrow(
      /duplicate/,
    );

    const inconsistent = validEvidence();
    onlyEntry(inconsistent).repeatHashesEqual = true;
    expect(() =>
      validateResumableMatrixEvidence(inconsistent, EXPECTED),
    ).toThrow(/stale or malformed/);

    const dirty = validEvidence();
    onlyEntry(dirty).diagnostics.errors = 1;
    expect(() => validateResumableMatrixEvidence(dirty, EXPECTED)).toThrow(
      /not clean/,
    );

    const malformed = validEvidence();
    onlyEntry(malformed).hashes.final = "not-a-hash";
    expect(() => validateResumableMatrixEvidence(malformed, EXPECTED)).toThrow(
      /malformed/,
    );

    const wrongLimits = validEvidence();
    wrongLimits.limits.rounds = 749;
    expect(() =>
      validateResumableMatrixEvidence(wrongLimits, EXPECTED),
    ).toThrow(/stale or incompatible/);
  });

  it("accepts a final checkpoint only when all unique cells are complete", () => {
    const evidence = validEvidence();
    const template = onlyEntry(evidence);
    evidence.entries = [...EXPECTED.cellKeys].map((key) => {
      const [aiMode, rawCount] = key.split(":");
      if (aiMode === undefined || rawCount === undefined)
        throw new Error("Matrix cell key is malformed");
      return {
        ...structuredClone(template),
        aiMode,
        aiCount: Number(rawCount),
        completedRuns: 2,
        repeatHashesEqual: true,
      };
    });
    evidence.completedCells = 6;
    evidence.complete = true;
    expect(validateResumableMatrixEvidence(evidence, EXPECTED)).toHaveLength(6);
  });
});

function validEvidence() {
  return {
    format: "pulp-wars-ruleset-7-normal-ai-matrix",
    version: 1,
    rulesetId: "pulp-wars-poc-7r2",
    runtimeFingerprint: FINGERPRINT,
    seed: 0,
    repeats: 2,
    expectedCells: 6,
    completedCells: 0,
    complete: false,
    limits: {
      acceptedCommandsPerTurn: 128,
      acceptedCommandsPerMatch: 30_000,
      rounds: 750,
    },
    entries: [
      {
        aiCount: 1,
        aiMode: "RIVAL",
        outcome: {
          kind: "DEFEAT",
          humanId: 1,
          defeatedByPlayerId: 2,
        },
        termination: "OUTCOME",
        rounds: 53,
        acceptedCommands: 971,
        diagnostics: {
          errors: 0,
          rejectedCommands: 0,
          mandatoryWorkOverflows: 0,
          stalls: 0,
          hiddenInformationViolations: 0,
          alliedHostileActions: 0,
          alliedTerritoryPathSteps: 0,
          commandCapHits: 0,
          roundCapHits: 0,
        },
        hashes: {
          command: HASH,
          event: HASH,
          checkpoint: HASH,
          final: HASH,
        },
        completedRuns: 1,
        repeatHashesEqual: false,
      },
    ],
  };
}

function onlyEntry(evidence: ReturnType<typeof validEvidence>) {
  const entry = evidence.entries[0];
  if (entry === undefined) throw new Error("Matrix entry missing");
  return entry;
}
