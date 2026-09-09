import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  IMPROVEMENT_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  canonicalHash,
  generateInitialMapV6,
  generateInitialMapV7,
  toV6Setup,
  type AiCountV7,
  type BoardSizeV7,
  type MatchSetupV7,
} from "../src/engine/index";
import { normalAiRuntimeFingerprint } from "./ruleset-v7-normal-ai-matrix-evidence";
import { browserReleaseRuntimeFingerprintV7 } from "./ruleset7-browser-release-fingerprint";
import {
  REQUIRED_RELEASE_EVIDENCE_PATHS_V7,
  RELEASE_FIXTURES_V7,
  fixtureExecutionKey,
  validateCompleteNormalMatrixEvidenceV7,
  validateRuleset7ReleaseCorpus,
  type ReleaseCorpusV7,
  type ReleaseEvidenceV7,
} from "./ruleset7-release-contract";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusPath = path.join(
  root,
  "docs/validation/RULESET_7_RELEASE_CORPUS.json",
);
const matrixPath = path.join(
  root,
  "docs/validation/RULESET_7_NORMAL_AI_MATRIX.json",
);
const frozenV6CorpusPath = path.join(
  root,
  "docs/validation/RULESET_6_RELEASE_CORPUS.json",
);
const write = process.argv.includes("--write");

const passedFixtureTests = runFixtureTests();
const corpus = buildCorpus();
validateRuleset7ReleaseCorpus(corpus, {
  technologies: TECHNOLOGY_IDS_V7,
  roles: UNIT_ROLE_IDS_V7,
  improvements: IMPROVEMENT_IDS_V7,
  rewards: REWARD_IDS_V7,
  passedFixtureTests,
});
validateNormalMatrix();

if (write) {
  const rendered = await format(`${JSON.stringify(corpus)}\n`, {
    parser: "json",
  });
  writeFileSync(corpusPath, rendered);
  process.stdout.write(
    `wrote ${path.relative(root, corpusPath).replaceAll("\\", "/")}\n`,
  );
} else {
  if (!existsSync(corpusPath))
    throw new Error("Ruleset 7 release corpus is missing; run --write");
  const existing = JSON.parse(readFileSync(corpusPath, "utf8")) as unknown;
  if (canonicalHash(existing) !== canonicalHash(corpus))
    throw new Error(
      "Checked Ruleset 7 release corpus is stale; run --write and review the deterministic diff",
    );
}

process.stdout.write(
  `ruleset-7 release corpus PASS: ${corpus.mapMatrix.length} repeated v6-parity map cases, ${corpus.fixtures.length} executed deterministic fixtures, ${corpus.evidence.length} reviewed evidence groups, fresh six-cell Normal matrix\n`,
);

function buildCorpus(): ReleaseCorpusV7 {
  const fixture = (id: string): string => {
    if (!RELEASE_FIXTURES_V7.some((candidate) => candidate.id === id))
      throw new Error(`Unknown release fixture ${id}`);
    return id;
  };
  return {
    schemaVersion: 1,
    rulesetId: "pulp-wars-poc-7r2",
    generatedOn: "2026-09-09",
    mapMatrix: buildMapMatrix(),
    fixtures: RELEASE_FIXTURES_V7,
    inventoryCoverage: {
      technologies: mapInventory(
        TECHNOLOGY_IDS_V7,
        fixture("technology-participation"),
      ),
      roles: mapInventory(UNIT_ROLE_IDS_V7, fixture("role-rules")),
      improvements: Object.fromEntries(
        IMPROVEMENT_IDS_V7.map((id) => [
          id,
          fixture(
            id === "MONUMENT" ? "monument-lifetime" : "economy-registration",
          ),
        ]),
      ),
      rewards: Object.fromEntries(
        REWARD_IDS_V7.map((id) => [
          id,
          fixture(
            id === "SURVEY" || id === "STOCKPILE"
              ? "reward-level2-offered-contract"
              : id === "WALLS" || id === "MILITIA"
                ? "reward-level3-accepted-and-offered-contract"
                : id === "EXPAND" || id === "BOOM"
                  ? "reward-level4-policy-contract"
                  : id === "JUGGERNAUT"
                    ? "reward-juggernaut"
                    : "reward-treasury",
          ),
        ]),
      ),
    },
    mechanicCoverage: {
      exactVersionIdentities: fixture("foundation-identifiers"),
      strictSetupAndOriginalOnly: fixture("foundation-setup"),
      commandEnvelopeParsing: fixture("foundation-command-schema"),
      canonicalAndPlayerEventParsing: fixture("foundation-event-schema"),
      authoritativeStateInvariants: fixture("foundation-state-schema"),
      technologyFormulaAndGraph: fixture("technology-formula"),
      all25AcceptedResearchCommands: fixture("technology-participation"),
      noWildcardRoleImplemented: fixture("role-rules"),
      replayedResearch: fixture("research-replay"),
      revisedEconomyFormulas: fixture("economy-registration"),
      contributorLossAndResumption: fixture("economy-spatial"),
      roads: fixture("economy-roads"),
      negativePopulation: fixture("economy-negative-population"),
      sequentialEveryLevelRewards: fixture("reward-sequential"),
      juggernautReward: fixture("reward-juggernaut"),
      treasury12AutomaticFallback: fixture("reward-treasury"),
      level6Live20Repair: fixture("economy-level6-repair"),
      incomeFloorSiegeAndBlackout: fixture("economy-income-exceptions"),
      barracksAndFortificationCapacity: fixture("capacity-sources"),
      exactRoleTraining: fixture("training"),
      legalOvercapacity: fixture("overcapacity"),
      productionMarkerRestoration: fixture("resource-restoration"),
      reservationCancellation: fixture("capacity-reservation"),
      disband: fixture("disband"),
      firstHostileCaptureSpoils: fixture("spoils"),
      engineerAchievement: fixture("achievement-engineer"),
      musterAchievement: fixture("achievement-muster"),
      monumentEntitlementLifetime: fixture("monument-lifetime"),
      monumentCaptureTransfer: fixture("monument-transfer"),
      monumentPublicProjection: fixture("monument-events"),
      combatRoleAbilities: fixture("conventional-combat"),
      healingPromotionAndLifecycle: fixture("healing-promotion-lifecycle"),
      pursuitThreeAttackCeilingAndTermination: fixture("pursuit"),
      pursuitSaveAndReplay: fixture("pursuit-persistence"),
      defectionSeatTiming: fixture("defection-timing"),
      defectionCityOccupation: fixture("defection-city-occupant"),
      defectionRewardUnit: fixture("defection-reward-unit"),
      defectionMultipleMarkCleanup: fixture("defection-cleanup"),
      concealmentObservationEquivalence: fixture("observation-equivalence"),
      hiddenContact: fixture("concealed-contact"),
      safeLogAndDebugBoundary: fixture("safe-debug-boundary"),
      blackoutDetection: fixture("blackout-detection"),
      blackoutSuppressionAndRecovery: fixture("blackout-recovery"),
      blackoutActionBlocking: fixture("blackout-actions"),
      saboteurInnatePillage: fixture("saboteur-innate-pillage"),
      saveReplayRoundTrip: fixture("save-replay"),
      immutableAcceptedBoundaryCertificates: fixture(
        "save-boundary-certificates",
      ),
      v1ThroughV6Incompatibility: fixture("save-v1-v6-incompatible"),
      revision1Incompatibility: fixture("save-r1-incompatible"),
      revision2BrowserStorageIsolation: fixture("browser-storage-isolation"),
      oldV7BrowserStorageIsolation: fixture("browser-old-v7-isolation"),
      normalUsesOnlyPublicInputs: fixture("normal-public-boundary"),
      normalPursuitSearch: fixture("normal-pursuit"),
      browserPolicyYielding: fixture("normal-yielding"),
      completeProductionAssetRegistration: fixture("asset-inventory"),
      standardUnitArtGeometry: fixture("asset-standard-units"),
      catapultArtGeometry: fixture("asset-catapult"),
      buildingAndEconomyArtGeometry: fixture("asset-buildings"),
      tacticalRasterAndCodeNativeRegistry: fixture("asset-tactical"),
      farmAcceptedProductionAssets: fixture("asset-farms"),
      farmCanonicalPairing: fixture("farm-pairing"),
      farmPairingVisibilityAndOwnershipBoundaries: fixture(
        "farm-pairing-boundaries",
      ),
      routeOwnedMainMenuResume: fixture("main-menu-resume"),
      completedMatchStatus: fixture("completed-hud"),
    },
    telemetryCoverage: {
      completeZeroFilledInventory: fixture("telemetry-inventory"),
      acceptedRestorationAndRebuildTransitions: fixture(
        "telemetry-restoration",
      ),
      acceptedCoinEventReconciliation: fixture("telemetry-coins"),
      acceptedCatapultRecoveryTransitions: fixture("telemetry-catapult"),
      acceptedPursuitTransitions: fixture("telemetry-pursuit"),
      acceptedBlackoutAndExposureTransitions: fixture("telemetry-blackout"),
    },
    evidence: evidenceRecords(),
    normalMatrixPath: "docs/validation/RULESET_7_NORMAL_AI_MATRIX.json",
    frozenRuleset6Corpus: {
      path: "docs/validation/RULESET_6_RELEASE_CORPUS.json",
      sha256: sha256(readFileSync(frozenV6CorpusPath)),
    },
  };
}

function buildMapMatrix(): ReleaseCorpusV7["mapMatrix"] {
  const entries: ReleaseCorpusV7["mapMatrix"][number][] = [];
  for (const aiCount of [1, 2, 3] as const) {
    const minimum = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
    for (const size of [11, 14, 16, 20, 25] as const) {
      if (size < minimum) continue;
      for (const aiMode of ["RIVAL", "COOPERATIVE"] as const) {
        const seed =
          7_000 + aiCount * 100 + size * 2 + (aiMode === "RIVAL" ? 0 : 1);
        const setup = setupV7(aiCount, size, aiMode, seed);
        const first = generateInitialMapV7(setup);
        const repeat = generateInitialMapV7(setup);
        const frozen = generateInitialMapV6(toV6Setup(setup));
        if (!first.ok || !repeat.ok || !frozen.ok)
          throw new Error(`Map generation failed for ${mapId(setup)}`);
        const mapHash = canonicalHash({
          board: first.map.board,
          treasureChests: first.map.treasureChests,
        });
        const randomHash = canonicalHash(first.map.random);
        const repeatMapHash = canonicalHash({
          board: repeat.map.board,
          treasureChests: repeat.map.treasureChests,
        });
        const frozenMapHash = canonicalHash({
          board: frozen.map.board,
          treasureChests: frozen.map.treasureChests,
        });
        if (
          mapHash !== repeatMapHash ||
          randomHash !== canonicalHash(repeat.map.random) ||
          mapHash !== frozenMapHash ||
          randomHash !== canonicalHash(frozen.map.random)
        )
          throw new Error(`Map repeat/parity mismatch for ${mapId(setup)}`);
        entries.push({
          id: mapId(setup),
          aiCount,
          aiMode,
          size,
          seed,
          mapHash,
          postGenerationPrngHash: randomHash,
          repeatMatched: true,
          frozenV6Parity: true,
        });
      }
    }
  }
  return entries;
}

function runFixtureTests(): ReadonlySet<string> {
  const sources = [
    ...new Set(RELEASE_FIXTURES_V7.map((fixture) => fixture.source)),
  ];
  const vitest = path.join(root, "node_modules/vitest/vitest.mjs");
  const result = spawnSync(
    process.execPath,
    [vitest, "run", ...sources, "--maxWorkers=1", "--reporter=json"],
    { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(
      `Ruleset 7 deterministic fixture execution failed:\n${result.stderr || result.stdout}`,
    );
  const report = JSON.parse(result.stdout) as {
    readonly success?: boolean;
    readonly testResults?: readonly {
      readonly name?: string;
      readonly assertionResults?: readonly {
        readonly title?: string;
        readonly status?: string;
      }[];
    }[];
  };
  if (report.success !== true || !Array.isArray(report.testResults))
    throw new Error("Ruleset 7 fixture report is incomplete");
  const passed = new Set<string>();
  for (const result of report.testResults) {
    const normalized = result.name?.replaceAll("\\", "/") ?? "";
    const source = sources.find((candidate) => normalized.endsWith(candidate));
    if (source === undefined) continue;
    for (const assertion of result.assertionResults ?? [])
      if (assertion.status === "passed" && assertion.title !== undefined)
        passed.add(fixtureExecutionKey({ source, test: assertion.title }));
  }
  return passed;
}

function validateNormalMatrix(): void {
  const expectedCells = new Set([
    "RIVAL:1",
    "RIVAL:2",
    "RIVAL:3",
    "COOPERATIVE:1",
    "COOPERATIVE:2",
    "COOPERATIVE:3",
  ]);
  validateCompleteNormalMatrixEvidenceV7(
    JSON.parse(readFileSync(matrixPath, "utf8")),
    {
      runtimeFingerprint: normalAiRuntimeFingerprint(),
      repeats: 2,
      expectedCells: 6,
      cellKeys: expectedCells,
      limits: {
        acceptedCommandsPerTurn: 128,
        acceptedCommandsPerMatch: 30_000,
        rounds: 750,
      },
    },
  );
}

function evidenceRecords(): readonly ReleaseEvidenceV7[] {
  const records = [
    manifestEvidence(
      "art/pixellab/reviews/ruleset7-original-units/review-evidence.json",
    ),
    manifestEvidence(
      "art/pixellab/reviews/ruleset7-catapult/review-evidence.json",
    ),
    manifestEvidence(
      "art/pixellab/reviews/ruleset7-building-economy/review-evidence.json",
    ),
    manifestEvidence(
      "art/pixellab/reviews/ruleset7-tactical-ui/review-evidence.json",
    ),
    manifestEvidence(
      "art/pixellab/reviews/ruleset7-farms/review-evidence.json",
    ),
    manifestEvidence(
      "art/integration/reviews/ruleset7-tactical-ui/evidence.json",
    ),
    browserReleaseEvidence(),
    directoryEvidence("art/integration/reviews/ruleset7-core-ui", [
      "core-1024-city-dock.png",
      "core-1024-tech.png",
      "core-1024-unit-dock.png",
      "core-320-fertile-dock.png",
      "core-390-dpr2-game-dock.png",
      "core-600-mandatory-reward.png",
      "core-600-reward-resolved.png",
      "core-600-tech.png",
      "core-600-zoom200-high-contrast-reduced.png",
    ]),
    directoryEvidence("art/integration/reviews/ruleset7-farms", [
      "natural-pair-selected.png",
      "natural-single-selected.png",
      "review-evidence.json",
      "synthetic-complex-layouts-dpr1.png",
      "synthetic-complex-layouts-dpr2.png",
    ]),
    directoryEvidence("art/integration/reviews/ruleset7-ui-polish", [
      "evidence.json",
      "ui-polish-1024-city-contours.png",
      "ui-polish-1440-city-contours.png",
      "ui-polish-1440-city-long-identity-multiple-actions-synthetic.png",
      "ui-polish-1440-main-menu-resume.png",
      "ui-polish-1920-settings-dialog.png",
      "ui-polish-1920-tech-modal.png",
      "ui-polish-1920-tile-action-dock.png",
      "ui-polish-320-match-ui-scale-200.png",
      "ui-polish-320-settings-ui-scale-200.png",
      "ui-polish-390-city-no-action-dock-dpr2.png",
      "ui-polish-390-tech-branch-select-dpr2.png",
    ]),
  ];
  if (
    JSON.stringify(records.map((record) => record.path)) !==
    JSON.stringify(REQUIRED_RELEASE_EVIDENCE_PATHS_V7)
  )
    throw new Error("Ruleset 7 release evidence catalogue is out of order");
  return records;
}

function browserReleaseEvidence(): ReleaseEvidenceV7 {
  const relativePath = "art/integration/reviews/ruleset7-preview/evidence.json";
  const value = JSON.parse(
    readFileSync(path.join(root, relativePath), "utf8"),
  ) as Record<string, unknown>;
  const outcome = value.outcome as Record<string, unknown> | undefined;
  const persistence = value.persistence as Record<string, unknown> | undefined;
  const compatibility = value.compatibility as
    Record<string, unknown> | undefined;
  if (
    value.status !== "PASS" ||
    value.rulesetId !== "pulp-wars-poc-7r2" ||
    value.runtimeFingerprint !== browserReleaseRuntimeFingerprintV7(root) ||
    value.route !== "DEFAULT_NO_RULESET_PARAMETER" ||
    value.controllerBoundary !==
      "PUBLIC_SNAPSHOT_OFFERED_COMMANDS_AND_PRODUCTION_DOM_CONTROLS_ONLY" ||
    (outcome?.outcome !== "VICTORY" && outcome?.outcome !== "DEFEAT") ||
    typeof outcome.commandIndex !== "number" ||
    outcome.commandIndex <= 0 ||
    typeof outcome.humanEndTurns !== "number" ||
    outcome.humanEndTurns <= 0 ||
    Object.values(persistence ?? {}).some((entry) => entry !== true) ||
    Object.keys(persistence ?? {}).length !== 6 ||
    Object.values(compatibility ?? {}).some((entry) => entry !== true) ||
    Object.keys(compatibility ?? {}).length !== 2
  )
    throw new Error("Ruleset 7 browser release evidence is failed or partial");
  return manifestEvidence(relativePath);
}

function manifestEvidence(relativePath: string): ReleaseEvidenceV7 {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute))
    throw new Error(`Missing release evidence ${relativePath}`);
  const bytes = readFileSync(absolute);
  const value = JSON.parse(bytes.toString("utf8")) as unknown;
  const artifacts = normalizeArtifacts(
    collectArtifacts(value, path.dirname(relativePath)),
    relativePath,
  );
  if (artifacts.length === 0)
    throw new Error(`Release evidence ${relativePath} contains no artifacts`);
  for (const artifact of artifacts) {
    const absoluteArtifact = path.join(root, artifact.path);
    if (!existsSync(absoluteArtifact))
      throw new Error(`Missing reviewed artifact ${artifact.path}`);
    if (
      artifact.sha256 !== null &&
      sha256(readFileSync(absoluteArtifact)) !== artifact.sha256
    )
      throw new Error(`Stale reviewed artifact hash ${artifact.path}`);
  }
  return {
    path: relativePath,
    sha256: canonicalHash({
      manifest: sha256(bytes),
      artifacts: artifacts.map((artifact) => ({
        path: artifact.path,
        sha256: sha256(readFileSync(path.join(root, artifact.path))),
      })),
    }),
    artifactCount: artifacts.length,
  };
}

function directoryEvidence(
  relativePath: string,
  filenames: readonly string[],
): ReleaseEvidenceV7 {
  const artifacts = filenames.map((filename) => {
    const artifactPath = path.join(relativePath, filename);
    const absolute = path.join(root, artifactPath);
    if (!existsSync(absolute))
      throw new Error(`Missing reviewed artifact ${artifactPath}`);
    return {
      path: artifactPath.replaceAll("\\", "/"),
      sha256: sha256(readFileSync(absolute)),
    };
  });
  return {
    path: relativePath,
    sha256: canonicalHash(artifacts),
    artifactCount: artifacts.length,
  };
}

function collectArtifacts(
  value: unknown,
  evidenceDirectory: string,
): { readonly path: string; readonly sha256: string | null }[] {
  if (Array.isArray(value))
    return value.flatMap((child) => collectArtifacts(child, evidenceDirectory));
  if (value === null || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const pairs = [
    [record.sourcePath, record.sourceSha256],
    [record.outputPath, record.outputSha256],
    [record.output, record.outputSha256],
    [record.candidate, record.candidateSha256],
  ] as const;
  const own = pairs.flatMap(([rawPath, rawHash]) =>
    typeof rawPath === "string"
      ? [
          {
            path: rawPath.replaceAll("\\", "/"),
            sha256: typeof rawHash === "string" ? rawHash : null,
          },
        ]
      : [],
  );
  const explicitPath =
    typeof record.path === "string" && typeof record.sha256 === "string"
      ? [
          {
            path: record.path.replaceAll("\\", "/"),
            sha256: record.sha256,
          },
        ]
      : [];
  const filenamePath =
    typeof record.filename === "string" && typeof record.sha256 === "string"
      ? [
          {
            path: path
              .join(evidenceDirectory, record.filename)
              .replaceAll("\\", "/"),
            sha256: record.sha256,
          },
        ]
      : [];
  const artifactMap =
    record.artifacts !== null &&
    typeof record.artifacts === "object" &&
    !Array.isArray(record.artifacts)
      ? Object.entries(record.artifacts as Record<string, unknown>).flatMap(
          ([filename, rawHash]) =>
            typeof rawHash === "string"
              ? [
                  {
                    path: path
                      .join(evidenceDirectory, filename)
                      .replaceAll("\\", "/"),
                    sha256: rawHash,
                  },
                ]
              : [],
        )
      : [];
  const screenshots = Array.isArray(record.screenshots)
    ? record.screenshots.flatMap((filename) =>
        typeof filename === "string"
          ? [
              {
                path: path
                  .join(evidenceDirectory, filename)
                  .replaceAll("\\", "/"),
                sha256: null,
              },
            ]
          : [],
      )
    : [];
  return [
    ...own,
    ...explicitPath,
    ...filenamePath,
    ...artifactMap,
    ...screenshots,
    ...Object.entries(record)
      .filter(
        ([key, child]) =>
          key !== "screenshots" &&
          (key !== "artifacts" || Array.isArray(child)),
      )
      .flatMap(([, child]) => collectArtifacts(child, evidenceDirectory)),
  ];
}

function normalizeArtifacts(
  artifacts: readonly {
    readonly path: string;
    readonly sha256: string | null;
  }[],
  evidencePath: string,
): readonly { readonly path: string; readonly sha256: string | null }[] {
  const byPath = new Map<string, string | null>();
  for (const artifact of artifacts) {
    const existing = byPath.get(artifact.path);
    if (
      existing !== undefined &&
      existing !== null &&
      artifact.sha256 !== null &&
      existing !== artifact.sha256
    )
      throw new Error(
        `Conflicting reviewed hashes for ${artifact.path} in ${evidencePath}`,
      );
    byPath.set(artifact.path, existing ?? artifact.sha256);
  }
  return [...byPath].map(([artifactPath, artifactHash]) => ({
    path: artifactPath,
    sha256: artifactHash,
  }));
}

function setupV7(
  aiCount: AiCountV7,
  size: BoardSizeV7,
  aiMode: MatchSetupV7["aiMode"],
  seed: number,
): MatchSetupV7 {
  return {
    rulesetId: "pulp-wars-poc-7r2",
    seed,
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

function mapId(setup: MatchSetupV7): string {
  return `${setup.aiMode.toLowerCase()}-${setup.aiCount}ai-${setup.width}-seed-${setup.seed}`;
}

function mapInventory(
  ids: readonly string[],
  fixtureId: string,
): Readonly<Record<string, string>> {
  return Object.fromEntries(ids.map((id) => [id, fixtureId]));
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
