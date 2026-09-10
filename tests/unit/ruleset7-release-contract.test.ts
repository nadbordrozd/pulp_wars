import { describe, expect, it } from "vitest";
import {
  IMPROVEMENT_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
} from "../../src/engine/index";
import {
  REQUIRED_RELEASE_EVIDENCE_PATHS_V7,
  RELEASE_FIXTURES_V7,
  assertRuleset7ReleaseArchiveRuntime,
  fixtureExecutionKey,
  validateCompleteNormalMatrixEvidenceV7,
  validateRuleset7ReleaseCorpus,
  type ReleaseCorpusV7,
} from "../../scripts/ruleset7-release-contract";

const HASH = "a".repeat(64);

describe("Ruleset 7 release corpus contract", () => {
  it("rejects the revision-3 runtime instead of relabeling revision-2 evidence", () => {
    expect(() =>
      assertRuleset7ReleaseArchiveRuntime("pulp-wars-poc-7r3"),
    ).toThrow(/7r2 archive.*7r3/);
    expect(() =>
      assertRuleset7ReleaseArchiveRuntime("pulp-wars-poc-7r2"),
    ).not.toThrow();
  });

  it("requires complete unique inventories backed by successfully executed deterministic fixtures", () => {
    const corpus = validCorpus();
    expect(() => validate(corpus)).not.toThrow();

    const missingTechnology: ReleaseCorpusV7 = {
      ...corpus,
      inventoryCoverage: {
        ...corpus.inventoryCoverage,
        technologies: Object.fromEntries(
          Object.entries(corpus.inventoryCoverage.technologies).filter(
            ([id]) => id !== "GATHERING",
          ),
        ),
      },
    };
    expect(() => validate(missingTechnology)).toThrow(/technology inventory/);

    const missingExecution = passedTests();
    const firstFixture = RELEASE_FIXTURES_V7.at(0);
    if (firstFixture === undefined) throw new Error("release fixture missing");
    missingExecution.delete(fixtureExecutionKey(firstFixture));
    expect(() => validate(corpus, missingExecution)).toThrow(/did not execute/);

    const firstMechanic = Object.keys(corpus.mechanicCoverage)[0];
    if (firstMechanic === undefined)
      throw new Error("mechanic fixture missing");
    const missingFixture: ReleaseCorpusV7 = {
      ...corpus,
      mechanicCoverage: {
        ...corpus.mechanicCoverage,
        [firstMechanic]: "not-a-fixture",
      },
    };
    expect(() => validate(missingFixture)).toThrow(/missing fixture/);
  });

  it("rejects stale, incomplete, duplicate, and dirty deterministic evidence", () => {
    const stale = {
      ...validCorpus(),
      rulesetId: "pulp-wars-poc-7" as "pulp-wars-poc-7r2",
    };
    expect(() => validate(stale)).toThrow(/identity is stale/);

    const base = validCorpus();
    const incomplete: ReleaseCorpusV7 = {
      ...base,
      evidence: base.evidence.slice(0, -1),
    };
    expect(() => validate(incomplete)).toThrow(/evidence is incomplete/);

    const duplicate: ReleaseCorpusV7 = {
      ...base,
      evidence: [required(base.evidence.at(0)), ...base.evidence.slice(0, -1)],
    };
    expect(() => validate(duplicate)).toThrow(/duplicate evidence path/i);

    const dirty: ReleaseCorpusV7 = {
      ...base,
      mapMatrix: base.mapMatrix.map((entry, index) =>
        index === 0 ? { ...entry, postGenerationPrngHash: "dirty" } : entry,
      ),
    };
    expect(() => validate(dirty)).toThrow(
      /map evidence is incomplete or dirty/,
    );
  });

  it("rejects a fresh but partial Normal matrix checkpoint", () => {
    const expectation = {
      runtimeFingerprint: HASH,
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
        acceptedCommandsPerTurn: 128 as const,
        acceptedCommandsPerMatch: 30_000 as const,
        rounds: 750 as const,
      },
    };
    const partial = {
      format: "pulp-wars-ruleset-7-normal-ai-matrix",
      version: 1,
      rulesetId: "pulp-wars-poc-7r2",
      runtimeFingerprint: HASH,
      seed: 0,
      repeats: 2,
      expectedCells: 6,
      completedCells: 0,
      complete: false,
      limits: expectation.limits,
      entries: [],
    };
    expect(() =>
      validateCompleteNormalMatrixEvidenceV7(partial, expectation),
    ).toThrow(/partial checkpoint/);
  });
});

function validate(
  corpus: ReleaseCorpusV7,
  passedFixtureTests = passedTests(),
): void {
  validateRuleset7ReleaseCorpus(corpus, {
    technologies: TECHNOLOGY_IDS_V7,
    roles: UNIT_ROLE_IDS_V7,
    improvements: IMPROVEMENT_IDS_V7,
    rewards: REWARD_IDS_V7,
    passedFixtureTests,
  });
}

function validCorpus(): ReleaseCorpusV7 {
  const fixtureIds = Object.fromEntries(
    RELEASE_FIXTURES_V7.map((fixture) => [fixture.id, fixture.id]),
  );
  return {
    schemaVersion: 1,
    rulesetId: "pulp-wars-poc-7r2",
    generatedOn: "2026-09-09",
    mapMatrix: Array.from({ length: 24 }, (_, index) => ({
      id: `map-${index}`,
      aiCount: ((index % 3) + 1) as 1 | 2 | 3,
      aiMode: index % 2 === 0 ? ("RIVAL" as const) : ("COOPERATIVE" as const),
      size: 25 as const,
      seed: index,
      mapHash: HASH,
      postGenerationPrngHash: HASH,
      repeatMatched: true as const,
      frozenV6Parity: true as const,
    })),
    fixtures: RELEASE_FIXTURES_V7,
    inventoryCoverage: {
      technologies: inventory(TECHNOLOGY_IDS_V7, "technology-participation"),
      roles: inventory(UNIT_ROLE_IDS_V7, "role-rules"),
      improvements: inventory(IMPROVEMENT_IDS_V7, "economy-registration"),
      rewards: inventory(REWARD_IDS_V7, "reward-sequential"),
    },
    mechanicCoverage: Object.fromEntries(
      Array.from({ length: 35 }, (_, index) => {
        const fixture = RELEASE_FIXTURES_V7[index % RELEASE_FIXTURES_V7.length];
        return [`mechanic-${index}`, required(fixture).id];
      }),
    ),
    telemetryCoverage: {
      inventory: required(fixtureIds["telemetry-inventory"]),
      restoration: required(fixtureIds["telemetry-restoration"]),
      coins: required(fixtureIds["telemetry-coins"]),
      catapult: required(fixtureIds["telemetry-catapult"]),
      pursuit: required(fixtureIds["telemetry-pursuit"]),
      blackout: required(fixtureIds["telemetry-blackout"]),
    },
    evidence: REQUIRED_RELEASE_EVIDENCE_PATHS_V7.map((path) => ({
      path,
      sha256: HASH,
      artifactCount: 1,
    })),
    normalMatrixPath: "docs/validation/RULESET_7_NORMAL_AI_MATRIX.json",
    frozenRuleset6Corpus: {
      path: "docs/validation/RULESET_6_RELEASE_CORPUS.json",
      sha256: HASH,
    },
  };
}

function passedTests(): Set<string> {
  return new Set(RELEASE_FIXTURES_V7.map(fixtureExecutionKey));
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("required release fixture missing");
  return value;
}

function inventory(
  ids: readonly string[],
  fixtureId: string,
): Record<string, string> {
  return Object.fromEntries(ids.map((id) => [id, fixtureId]));
}
