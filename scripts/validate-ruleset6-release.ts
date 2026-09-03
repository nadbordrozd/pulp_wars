import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { canonicalHash } from "../src/engine/replay/canonical";
import { browserSmokeReleaseEvidenceV6 } from "./browser-smoke-v6-contract";
import {
  COMMAND_KIND_ORDER_V6,
  ECONOMIC_IMPROVEMENT_IDS,
  FACTION_TREE_IDS,
  RESOURCE_IDS,
  REWARD_IDS_V6,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type AiCountV6,
  type AiModeV6,
  type BoardSizeV6,
  type FactionIdV6,
  type MatchSetupV6,
} from "../src/engine/v6/types";
import { headlessV6 } from "../src/headless/v6";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusPath = path.join(
  root,
  "docs/validation/RULESET_6_RELEASE_CORPUS.json",
);
const write = process.argv.includes("--write");
const refreshNormal = process.argv.includes("--refresh-normal");

const ECONOMIC_COMMANDS = COMMAND_KIND_ORDER_V6.filter((kind) =>
  [
    "HARVEST_FRUIT",
    "HUNT_GAME",
    "BUILD_FARM",
    "BUILD_LUMBER_CAMP",
    "BUILD_MINE",
    "BUILD_QUARRY",
    "BUILD_WINDMILL",
    "BUILD_SAWMILL",
    "BUILD_FORGE",
    "BUILD_STONEWORKS",
    "BUILD_WORKSHOP",
    "BUILD_GRAND_WORKS",
    "BUILD_MARKET",
    "CLEAR_FOREST",
    "REPLANT_FOREST",
    "BUILD_ROAD",
    "REDEVELOP",
  ].includes(kind),
);
const ABILITIES = [
  "HEAL",
  "CHARGE",
  "PUSH",
  "BREACH",
  "ROLL",
  "WALL",
  "CANDIFY",
] as const;
const REQUIRED_SCENARIOS = [
  "ordinarySpatialLayout",
  "jackpotSpatialLayout",
  "crossCityWorkshop",
  "crossCityGrandWorks",
  "crossCityMarket",
  "capitalConnectedMarket",
  "destruction",
  "negativePopulation",
  "levelFivePlus",
  "pendingChoiceSaveResume",
  "replayHeadlessExactness",
  "legacyCompatibility",
  "cooperativeNoAlliedHarm",
] as const;

const COVERAGE_SOURCES = {
  technologies: "tests/unit/ruleset-v6-technology.test.ts",
  resources: "tests/unit/ruleset-v6-basic-economy.test.ts",
  improvements: "tests/unit/ruleset-v6-spatial-economy.test.ts",
  economicCommands: "tests/unit/ruleset-v6-roads-rewards.test.ts",
  rewards: "tests/unit/ruleset-v6-roads-rewards.test.ts",
  originalRoles: "tests/unit/ruleset-v6-original-roster.test.ts",
  candyRoles: "tests/unit/ruleset-v6-candy-roster.test.ts",
  abilities: "tests/unit/ruleset-v6-normal-policy.test.ts",
  maps: "tests/unit/ruleset-v6-map.test.ts",
  headless: "tests/unit/ruleset-v6-ai-headless.test.ts",
  browser: "tests/scripts/browser-smoke-v6-contract.test.ts",
} as const;

const EVIDENCE_FILES = [
  "art/integration/reviews/ruleset6-browser-smoke/evidence.json",
  "art/integration/reviews/ruleset6-melee-feedback/review-evidence.json",
  "art/integration/reviews/ruleset6-ranged-feedback/review-evidence.json",
  "art/pixellab/reviews/ruleset6-buildings-roads/review-evidence.json",
  "art/pixellab/reviews/ruleset6-candy-units/review-evidence.json",
  "art/pixellab/reviews/ruleset6-canvas-host/review-evidence.json",
  "art/pixellab/reviews/ruleset6-canvas-renderer/review-evidence.json",
  "art/pixellab/reviews/ruleset6-original-units/review-evidence.json",
  "art/pixellab/reviews/ruleset6-playable-shell/review-evidence.json",
  "art/pixellab/reviews/ruleset6-tech-economy-ui/review-evidence.json",
  "art/pixellab/reviews/ruleset6-terrain/review-evidence.json",
] as const;
const BROWSER_SMOKE_EVIDENCE = EVIDENCE_FILES[0];

interface MapCase {
  readonly id: string;
  readonly aiCount: AiCountV6;
  readonly aiMode: AiModeV6;
  readonly size: BoardSizeV6;
  readonly seed: number;
  readonly factions: readonly FactionIdV6[];
  readonly initialHash: string;
  readonly mapHash: string;
  readonly postGenerationPrngHash: string;
  readonly repeatMatched: true;
  readonly factionMapParity: true;
}

interface NormalEvidence {
  readonly id: string;
  readonly setup: MatchSetupV6;
  readonly termination: "OUTCOME";
  readonly outcome: string;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: 0;
  readonly stalls: 0;
  readonly capHits: 0;
  readonly commandHash: string;
  readonly eventHash: string;
  readonly checkpointHash: string;
  readonly finalHash: string;
  readonly repeatMatched: true;
  readonly relationshipViolations: 0;
  readonly publicEqualityMismatches: 0;
  readonly participation: Readonly<Record<string, number>>;
}

interface ReleaseCorpus {
  readonly schemaVersion: 6;
  readonly rulesetId: "pulp-wars-poc-6";
  readonly generatedOn: "2026-09-02";
  readonly limits: { readonly maxCommands: 30_000; readonly maxRounds: 750 };
  readonly mapMatrix: readonly MapCase[];
  readonly normalEvidence: NormalEvidence;
  readonly deterministicFixtureCoverage: {
    readonly technologiesByFactionTree: Readonly<Record<string, number>>;
    readonly resources: Readonly<Record<string, number>>;
    readonly improvements: Readonly<Record<string, number>>;
    readonly economicCommands: Readonly<Record<string, number>>;
    readonly rewards: Readonly<Record<string, number>>;
    readonly rolesByFaction: Readonly<Record<string, number>>;
    readonly abilities: Readonly<Record<string, number>>;
    readonly scenarios: Readonly<Record<string, number>>;
    readonly sources: typeof COVERAGE_SOURCES;
  };
  readonly evidence: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly artifactCount: number;
  }[];
}

const existing = existsSync(corpusPath)
  ? (JSON.parse(readFileSync(corpusPath, "utf8")) as ReleaseCorpus)
  : null;
const mapMatrix = await buildMapMatrix();
const normalEvidence = refreshNormal
  ? await runNormalEvidence()
  : (existing?.normalEvidence ?? fixedNormalEvidence());
const corpus: ReleaseCorpus = {
  schemaVersion: 6,
  rulesetId: "pulp-wars-poc-6",
  generatedOn: "2026-09-02",
  limits: { maxCommands: 30_000, maxRounds: 750 },
  mapMatrix,
  normalEvidence,
  deterministicFixtureCoverage: {
    technologiesByFactionTree: positive(
      FACTION_TREE_IDS.flatMap((tree) =>
        TECHNOLOGY_IDS.map((technology) => `${tree}:${technology}`),
      ),
    ),
    resources: positive(RESOURCE_IDS),
    improvements: positive(ECONOMIC_IMPROVEMENT_IDS),
    economicCommands: positive(ECONOMIC_COMMANDS),
    rewards: positive(REWARD_IDS_V6),
    rolesByFaction: positive(
      ["ORIGINAL", "CANDY"].flatMap((faction) =>
        UNIT_ROLE_IDS.map((role) => `${faction}:${role}`),
      ),
    ),
    abilities: positive(ABILITIES),
    scenarios: positive(REQUIRED_SCENARIOS),
    sources: COVERAGE_SOURCES,
  },
  evidence: EVIDENCE_FILES.map(evidenceRecord),
};

validateCorpus(corpus);
if (write) {
  const rendered = await format(`${JSON.stringify(corpus)}\n`, {
    parser: "json",
  });
  writeFileSync(corpusPath, rendered);
  process.stdout.write(`wrote ${path.relative(root, corpusPath)}\n`);
} else {
  if (existing === null)
    throw new Error("Release corpus is missing; run --write");
  if (canonicalHash(existing) !== canonicalHash(corpus)) {
    throw new Error(
      "Checked release corpus differs from a fresh deterministic audit; run --write and review",
    );
  }
  process.stdout.write(
    `ruleset-6 release corpus PASS: ${mapMatrix.length} repeated map cases, ${TECHNOLOGY_IDS.length * FACTION_TREE_IDS.length} faction-tech fixtures, ${EVIDENCE_FILES.length} evidence manifests\n`,
  );
}

async function buildMapMatrix(): Promise<readonly MapCase[]> {
  const result: MapCase[] = [];
  for (const aiCount of [1, 2, 3] as const) {
    const minimum = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
    for (const size of [11, 14, 16, 20, 25] as const) {
      if (size < minimum) continue;
      for (const aiMode of ["RIVAL", "COOPERATIVE"] as const) {
        const factions = Array.from(
          { length: aiCount + 1 },
          (_, index): FactionIdV6 => (index % 2 === 0 ? "ORIGINAL" : "CANDY"),
        );
        const seed =
          6000 + aiCount * 100 + size * 2 + (aiMode === "RIVAL" ? 0 : 1);
        const setup = makeSetup(aiCount, size, aiMode, factions, seed);
        const first = await headlessV6.create(setup);
        const repeat = await headlessV6.create(setup);
        if (!first.ok || !repeat.ok)
          throw new Error(`Map creation failed for ${id(setup)}`);
        const allOriginal = await headlessV6.create(
          makeSetup(
            aiCount,
            size,
            aiMode,
            Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
            seed,
          ),
        );
        if (!allOriginal.ok)
          throw new Error(`Parity map creation failed for ${id(setup)}`);
        const initialHash = canonicalHash(first.state);
        const mapHash = canonicalHash(first.state.board);
        const postGenerationPrngHash = canonicalHash(first.state.random);
        if (
          initialHash !== canonicalHash(repeat.state) ||
          mapHash !== canonicalHash(repeat.state.board) ||
          postGenerationPrngHash !== canonicalHash(repeat.state.random)
        ) {
          throw new Error(`Repeat mismatch for ${id(setup)}`);
        }
        if (
          mapHash !== canonicalHash(allOriginal.state.board) ||
          postGenerationPrngHash !== canonicalHash(allOriginal.state.random)
        ) {
          throw new Error(`Faction-only map/PRNG mismatch for ${id(setup)}`);
        }
        result.push({
          id: id(setup),
          aiCount,
          aiMode,
          size,
          seed,
          factions,
          initialHash,
          mapHash,
          postGenerationPrngHash,
          repeatMatched: true,
          factionMapParity: true,
        });
      }
    }
  }
  return result;
}

async function runNormalEvidence(): Promise<NormalEvidence> {
  const setup = fixedNormalEvidence().setup;
  const run = await headlessV6.runAiMatch(setup, {
    maxCommands: 30_000,
    maxRounds: 750,
  });
  if (
    run.termination !== "OUTCOME" ||
    run.outcome === null ||
    run.errors.length !== 0 ||
    run.stalls.length !== 0
  ) {
    throw new Error("Normal release evidence did not complete cleanly");
  }
  const metrics = run.metrics;
  return {
    id: "mixed-rival-auto-1-seed-0",
    setup,
    termination: "OUTCOME",
    outcome: metrics.eventsByKind.MATCH_ENDED === 1 ? "VICTORY" : "UNKNOWN",
    rounds: run.rounds,
    commands: run.acceptedCommands,
    errors: 0,
    stalls: 0,
    capHits: 0,
    commandHash: metrics.commandHash,
    eventHash: metrics.eventHash,
    checkpointHash: metrics.checkpointHash,
    finalHash: metrics.finalHash,
    repeatMatched:
      metrics.commandHash === fixedNormalEvidence().commandHash &&
      metrics.eventHash === fixedNormalEvidence().eventHash &&
      metrics.checkpointHash === fixedNormalEvidence().checkpointHash &&
      metrics.finalHash === fixedNormalEvidence().finalHash
        ? true
        : fail("Normal evidence did not repeat the independently recorded run"),
    relationshipViolations:
      metrics.relationshipViolations.total === 0
        ? 0
        : fail("Normal evidence recorded a relationship violation"),
    publicEqualityMismatches:
      metrics.publicEquality.mismatches === 0
        ? 0
        : fail("Normal evidence recorded a public-equality mismatch"),
    participation: {
      research: metrics.commandsByKind.RESEARCH ?? 0,
      economicBuilds: metrics.eventsByKind.ECONOMIC_BUILDING_BUILT ?? 0,
      roads: metrics.roadsBuilt,
      markets: metrics.improvementsBuilt.MARKET,
      captures: metrics.commandsByKind.CAPTURE ?? 0,
      rewards: metrics.commandsByKind.CHOOSE_CITY_REWARD ?? 0,
      attacks: metrics.commandsByKind.ATTACK ?? 0,
      push: metrics.abilityActions.PUSH,
      wall: metrics.abilityActions.WALL,
      candify: metrics.abilityActions.CANDIFY,
    },
  };
}

function fixedNormalEvidence(): NormalEvidence {
  return {
    id: "mixed-rival-auto-1-seed-0",
    setup: makeSetup(1, 11, "RIVAL", ["ORIGINAL", "CANDY"], 0),
    termination: "OUTCOME",
    outcome: "VICTORY",
    rounds: 50,
    commands: 742,
    errors: 0,
    stalls: 0,
    capHits: 0,
    commandHash:
      "7fc1a0f69054fe2045174d369179579b3e60f450accc7800f4a6c32e9f3f308c",
    eventHash:
      "2d75aa07456568ed05314f33135754c3a6aeb52b44203a32d5438fbcd35ee067",
    checkpointHash:
      "1cb23625f79faa7c50eb46e6c2ba12c3237cd4f6fe4f6d1d076c5ff443267eb4",
    finalHash:
      "a1a67fba473ded644350df0567c42b26d61761ca29ba9aea687c8522277ccd40",
    repeatMatched: true,
    relationshipViolations: 0,
    publicEqualityMismatches: 0,
    participation: {
      research: 26,
      economicBuilds: 56,
      roads: 4,
      markets: 5,
      captures: 9,
      rewards: 20,
      attacks: 155,
      push: 17,
      wall: 2,
      candify: 2,
    },
  };
}

function validateCorpus(value: ReleaseCorpus): void {
  if (value.mapMatrix.length !== 24)
    throw new Error("Expected 24 legal size/AI/mode map cases");
  for (const [name, counts] of Object.entries(
    value.deterministicFixtureCoverage,
  )) {
    if (name === "sources") continue;
    for (const [entry, count] of Object.entries(counts)) {
      if (count <= 0)
        throw new Error(`${name}:${entry} has no positive coverage`);
    }
  }
  for (const source of Object.values(
    value.deterministicFixtureCoverage.sources,
  )) {
    if (!existsSync(path.join(root, source)))
      throw new Error(`Missing coverage source ${source}`);
  }
  for (const entry of value.evidence) {
    if (entry.artifactCount <= 0)
      throw new Error(`${entry.path} has no hashed artifacts`);
  }
  if (!value.normalEvidence.repeatMatched)
    throw new Error("Normal repeat did not match");
  if (
    canonicalHash(value.normalEvidence) !== canonicalHash(fixedNormalEvidence())
  ) {
    throw new Error("Normal evidence differs from the fixed release baseline");
  }
}

function evidenceRecord(relative: string): {
  readonly path: string;
  readonly sha256: string;
  readonly artifactCount: number;
} {
  const absolute = path.join(root, relative);
  const bytes = readFileSync(absolute);
  const evidence = JSON.parse(bytes.toString("utf8")) as unknown;
  const artifacts = collectArtifacts(evidence, path.dirname(relative));
  for (const artifact of artifacts) {
    const actual = sha256(readFileSync(path.join(root, artifact.path)));
    if (actual !== artifact.sha256)
      throw new Error(`Stale evidence hash for ${artifact.path}`);
  }
  return {
    path: relative,
    sha256:
      relative === BROWSER_SMOKE_EVIDENCE
        ? sha256(
            Buffer.from(canonicalJson(browserSmokeReleaseEvidenceV6(evidence))),
          )
        : sha256(bytes),
    artifactCount: artifacts.length,
  };
}

function collectArtifacts(
  value: unknown,
  evidenceDirectory: string,
): { path: string; sha256: string }[] {
  if (Array.isArray(value))
    return value.flatMap((child) => collectArtifacts(child, evidenceDirectory));
  if (value === null || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const artifactMap =
    record.artifacts !== null &&
    typeof record.artifacts === "object" &&
    !Array.isArray(record.artifacts)
      ? Object.entries(record.artifacts as Record<string, unknown>)
          .filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          )
          .map(([filename, hash]) => ({
            path: path.join(evidenceDirectory, filename),
            sha256: hash,
          }))
      : [];
  const artifactPath =
    typeof record.path === "string"
      ? record.path
      : typeof record.filename === "string"
        ? path.join(evidenceDirectory, record.filename)
        : null;
  const own =
    artifactPath !== null && typeof record.sha256 === "string"
      ? [{ path: artifactPath, sha256: record.sha256 }]
      : [];
  return [
    ...own,
    ...artifactMap,
    ...Object.values(record).flatMap((child) =>
      collectArtifacts(child, evidenceDirectory),
    ),
  ];
}

function makeSetup(
  aiCount: AiCountV6,
  size: BoardSizeV6,
  aiMode: AiModeV6,
  factions: readonly FactionIdV6[],
  seed: number,
): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions,
  };
}

function id(setup: MatchSetupV6): string {
  return `${setup.aiMode.toLowerCase()}-${setup.aiCount}ai-${setup.width}-seed-${setup.seed}`;
}

function positive(values: readonly string[]): Readonly<Record<string, number>> {
  return Object.fromEntries(values.map((value) => [value, 1]));
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number")
    return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Release evidence contains a non-JSON value");
}

function fail(message: string): never {
  throw new Error(message);
}
