export interface ReleaseFixtureV7 {
  readonly id: string;
  readonly source: string;
  readonly test: string;
}

export const ARCHIVED_RULESET7_RELEASE_ID = "pulp-wars-poc-7r2" as const;

export function assertRuleset7ReleaseArchiveRuntime(
  runtimeRulesetId: string,
): void {
  if (runtimeRulesetId !== ARCHIVED_RULESET7_RELEASE_ID)
    throw new Error(
      `Ruleset 7 release evidence is an ${ARCHIVED_RULESET7_RELEASE_ID} archive and cannot validate ${runtimeRulesetId}; create a separately approved current-revision release corpus instead of relabeling archived evidence`,
    );
}

export interface ReleaseEvidenceV7 {
  readonly path: string;
  readonly sha256: string;
  readonly artifactCount: number;
}

export interface ReleaseCorpusV7 {
  readonly schemaVersion: 1;
  readonly rulesetId: typeof ARCHIVED_RULESET7_RELEASE_ID;
  readonly generatedOn: "2026-09-09";
  readonly mapMatrix: readonly {
    readonly id: string;
    readonly aiCount: 1 | 2 | 3;
    readonly aiMode: "RIVAL" | "COOPERATIVE";
    readonly size: 11 | 14 | 16 | 20 | 25;
    readonly seed: number;
    readonly mapHash: string;
    readonly postGenerationPrngHash: string;
    readonly repeatMatched: true;
    readonly frozenV6Parity: true;
  }[];
  readonly fixtures: readonly ReleaseFixtureV7[];
  readonly inventoryCoverage: {
    readonly technologies: Readonly<Record<string, string>>;
    readonly roles: Readonly<Record<string, string>>;
    readonly improvements: Readonly<Record<string, string>>;
    readonly rewards: Readonly<Record<string, string>>;
  };
  readonly mechanicCoverage: Readonly<Record<string, string>>;
  readonly telemetryCoverage: Readonly<Record<string, string>>;
  readonly evidence: readonly ReleaseEvidenceV7[];
  readonly normalMatrixPath: "docs/validation/RULESET_7_NORMAL_AI_MATRIX.json";
  readonly frozenRuleset6Corpus: {
    readonly path: "docs/validation/RULESET_6_RELEASE_CORPUS.json";
    readonly sha256: string;
  };
}

export const REQUIRED_RELEASE_EVIDENCE_PATHS_V7 = Object.freeze([
  "art/pixellab/reviews/ruleset7-original-units/review-evidence.json",
  "art/pixellab/reviews/ruleset7-catapult/review-evidence.json",
  "art/pixellab/reviews/ruleset7-building-economy/review-evidence.json",
  "art/pixellab/reviews/ruleset7-tactical-ui/review-evidence.json",
  "art/pixellab/reviews/ruleset7-farms/review-evidence.json",
  "art/integration/reviews/ruleset7-tactical-ui/evidence.json",
  "art/integration/reviews/ruleset7-preview/evidence.json",
  "art/integration/reviews/ruleset7-core-ui",
  "art/integration/reviews/ruleset7-farms",
  "art/integration/reviews/ruleset7-ui-polish",
] as const);

export const RELEASE_FIXTURES_V7 = Object.freeze([
  fixture(
    "foundation-identifiers",
    "tests/unit/ruleset-v7-foundation.test.ts",
    "freezes the exact v7 IDs and semantic orders",
  ),
  fixture(
    "foundation-setup",
    "tests/unit/ruleset-v7-foundation.test.ts",
    "accepts only exact dense all-Original setup",
  ),
  fixture(
    "foundation-command-schema",
    "tests/unit/ruleset-v7-foundation.test.ts",
    "parses every new command arm with exact keys and rejects v6 arms",
  ),
  fixture(
    "foundation-event-schema",
    "tests/unit/ruleset-v7-foundation.test.ts",
    "strictly parses canonical v7 event envelopes",
  ),
  fixture(
    "foundation-state-schema",
    "tests/unit/ruleset-v7-foundation.test.ts",
    "rejects malformed authoritative timers, occupancy, IDs, and cross-references",
  ),
  fixture(
    "technology-graph",
    "tests/unit/ruleset-v7-technology.test.ts",
    "registers the exact ordered 25-node Original graph and start",
  ),
  fixture(
    "technology-formula",
    "tests/unit/ruleset-v7-technology.test.ts",
    "uses the exact city-scaled formula without unsafe arithmetic",
  ),
  fixture(
    "technology-participation",
    "tests/unit/ruleset-v7-technology.test.ts",
    "researches the entire graph for 180 coins without PRNG use",
  ),
  fixture(
    "role-rules",
    "tests/unit/ruleset-v7-technology.test.ts",
    "binds every Original role to its exact immutable v7 roster values",
  ),
  fixture(
    "research-replay",
    "tests/unit/ruleset-v7-technology.test.ts",
    "replays supported research commands deterministically and rejects atomically",
  ),
  fixture(
    "economy-registration",
    "tests/unit/ruleset-v7-economy.test.ts",
    "registers the retained economy and revised Industry values exactly",
  ),
  fixture(
    "economy-spatial",
    "tests/unit/ruleset-v7-economy.test.ts",
    "retains farm/camp processors, mixed buildings, Market, roads, and forest actions",
  ),
  fixture(
    "economy-roads",
    "tests/unit/ruleset-v7-economy.test.ts",
    "preserves Roads through free Clear Forest and paid Replant, and builds Roads for 2",
  ),
  fixture(
    "economy-negative-population",
    "tests/unit/ruleset-v7-economy.test.ts",
    "keeps city level while live loss can drive current population negative",
  ),
  fixture(
    "reward-sequential",
    "tests/unit/ruleset-v7-economy.test.ts",
    "queues one every-level reward at a time and stops preflight at the modal",
  ),
  fixture(
    "reward-level2-offered-contract",
    "tests/unit/ruleset-v7-pursuit-query.test.ts",
    "keeps pending reward choice precedence over an open sequence",
  ),
  fixture(
    "reward-level3-accepted-and-offered-contract",
    "tests/unit/ruleset-v7-command-precedence.test.ts",
    "keeps canonical reward order blocking until the queue drains, then resumes PURSUIT_READY",
  ),
  fixture(
    "reward-level4-policy-contract",
    "tests/unit/ruleset-v7-normal-policy.test.ts",
    "chooses a safe reward when BOOM would cascade beyond the remaining cap",
  ),
  fixture(
    "reward-juggernaut",
    "tests/unit/ruleset-v7-economy.test.ts",
    "settles successful Juggernaut rewards sequentially through one modal",
  ),
  fixture(
    "reward-treasury",
    "tests/unit/ruleset-v7-economy.test.ts",
    "automatically grants Treasury 12 at every blocked level with no ghost queue",
  ),
  fixture(
    "economy-level6-repair",
    "tests/unit/ruleset-v7-economy.test.ts",
    "repairs the exact level-6 live20 package from floor income without repeating rewards",
  ),
  fixture(
    "economy-income-exceptions",
    "tests/unit/ruleset-v7-economy.test.ts",
    "floors only nonbesieged pre-Blackout income and keeps suppression bounded",
  ),
  fixture(
    "capacity-sources",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "stacks owner Fortification with one adjacent 4-Coin Barracks for two capacity",
  ),
  fixture(
    "training",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "trains an unlocked unit at exact cost into available city capacity",
  ),
  fixture(
    "overcapacity",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "allows legal over-capacity after hostile Pillage destroys Barracks",
  ),
  fixture(
    "resource-restoration",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "restores a production marker once when hostile Pillage destroys its improvement",
  ),
  fixture(
    "capacity-reservation",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "cancels ordered capacity reservations immediately after Barracks removal",
  ),
  fixture(
    "disband",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "refunds floor half cost for trainable Disband and excludes reward units",
  ),
  fixture(
    "spoils",
    "tests/unit/ruleset-v7-conflict-capacity.test.ts",
    "awards Spoils once per hostile city and never for neutral villages",
  ),
  fixture(
    "achievement-engineer",
    "tests/unit/ruleset-v7-achievements.test.ts",
    "unlocks Engineer only from a final individual qualifying output of six",
  ),
  fixture(
    "achievement-muster",
    "tests/unit/ruleset-v7-achievements.test.ts",
    "counts four distinct living trainable roles for Muster and excludes Juggernaut",
  ),
  fixture(
    "monument-lifetime",
    "tests/unit/ruleset-v7-achievements.test.ts",
    "spends each entitlement once for a free +3 Monument and allows the other after removal",
  ),
  fixture(
    "monument-transfer",
    "tests/unit/ruleset-v7-achievements.test.ts",
    "keeps captured provenance current-owner-only without spending captor entitlements",
  ),
  fixture(
    "monument-events",
    "tests/unit/ruleset-v7-achievements.test.ts",
    "uses exact canonical/player Monument event boundaries and rejects generic Monument provenance",
  ),
  fixture(
    "conventional-combat",
    "tests/unit/ruleset-v7-roster-pursuit.test.ts",
    "applies ordinary role restrictions, Charge, Breach, Push, and ranged advance",
  ),
  fixture(
    "healing-promotion-lifecycle",
    "tests/unit/ruleset-v7-roster-pursuit.test.ts",
    "supports Heal, Recover, Wait, Promote, stat attribution, and automatic recovery",
  ),
  fixture(
    "pursuit",
    "tests/unit/ruleset-v7-roster-pursuit.test.ts",
    "runs the bounded three-attack Pursuit state machine with no side doors",
  ),
  fixture(
    "pursuit-persistence",
    "tests/unit/ruleset-v7-roster-pursuit.test.ts",
    "round-trips a naturally opened Pursuit through replay and save",
  ),
  fixture(
    "defection-timing",
    "tests/unit/ruleset-v7-defection.test.ts",
    "gives one complete reply activation and resolves at the later initiator Start Turn (2 seats, 0 -> 1)",
  ),
  fixture(
    "defection-city-occupant",
    "tests/unit/ruleset-v7-defection.test.ts",
    "converts a city occupant without Capture or Spoils and immediately changes siege",
  ),
  fixture(
    "defection-reward-unit",
    "tests/unit/ruleset-v7-defection.test.ts",
    "converts Juggernaut through ordinary reserved capacity and preserves all durable fields",
  ),
  fixture(
    "defection-cleanup",
    "tests/unit/ruleset-v7-defection.test.ts",
    "cancels a converted Envoy's later mark in canonical order and releases its reservation",
  ),
  fixture(
    "observation-equivalence",
    "tests/unit/ruleset-v7-observation.test.ts",
    "makes observation-equivalent hidden positions byte-identical across every public input",
  ),
  fixture(
    "concealed-contact",
    "tests/unit/ruleset-v7-observation.test.ts",
    "offers optimistic paths, accepts hidden ZOC contact, consumes movement, and reveals before interruption",
  ),
  fixture(
    "safe-debug-boundary",
    "tests/unit/ruleset-v7-observation.test.ts",
    "keeps raw hashes behind an explicit spoiler capability while safe logs accept only projected batches",
  ),
  fixture(
    "blackout-detection",
    "tests/unit/ruleset-v7-blackout.test.ts",
    "allows city-center detection but blocks ordinary, Scout, and third-rival unit detection",
  ),
  fixture(
    "blackout-recovery",
    "tests/unit/ruleset-v7-blackout.test.ts",
    "caps suppression at three without touching treasury and restores full recovery income",
  ),
  fixture(
    "blackout-actions",
    "tests/unit/ruleset-v7-blackout.test.ts",
    "blocks development and Train while retaining unit actions and existing capacity",
  ),
  fixture(
    "saboteur-innate-pillage",
    "tests/unit/ruleset-v7-blackout.test.ts",
    "bypasses Explosives, exposes with the strict PILLAGE arm, and leaves cooldown unchanged",
  ),
  fixture(
    "save-replay",
    "tests/unit/persistence-v7.test.ts",
    "round-trips a command-bearing v7 save through reducer replay",
  ),
  fixture(
    "save-boundary-certificates",
    "tests/unit/persistence-v7.test.ts",
    "reuses only exact immutable accepted-boundary identities without changing save bytes",
  ),
  fixture(
    "save-v1-v6-incompatible",
    "tests/unit/persistence-v7.test.ts",
    "classifies every v1-v6 artifact as incompatible without migration",
  ),
  fixture(
    "save-r1-incompatible",
    "tests/unit/persistence-v7.test.ts",
    "preserves the r1 development identity as incompatible and never executes it",
  ),
  fixture(
    "browser-storage-isolation",
    "tests/unit/persistence-browser-v7.test.ts",
    "reads, writes, and deletes only the revision-2 key",
  ),
  fixture(
    "browser-old-v7-isolation",
    "tests/unit/persistence-browser-v7.test.ts",
    "preserves incompatible r1 bytes and never consults the old development key",
  ),
  fixture(
    "normal-public-boundary",
    "tests/unit/ruleset-v7-normal-policy.test.ts",
    "keeps authority, reducer, map generation, and PRNG out of policy imports",
  ),
  fixture(
    "normal-pursuit",
    "tests/unit/ruleset-v7-normal-policy.test.ts",
    "selects the public Pursue, second kill, Pursue, and third kill chain",
  ),
  fixture(
    "normal-yielding",
    "tests/unit/ruleset-v7-normal-policy.test.ts",
    "yields inside a dense Pursuit tree without changing the frozen result",
  ),
  fixture(
    "telemetry-inventory",
    "tests/unit/ruleset-v7-ai-headless.test.ts",
    "publishes complete zero-filled command, event, tech, role, and improvement inventories",
  ),
  fixture(
    "telemetry-restoration",
    "tests/unit/ruleset-v7-ai-headless.test.ts",
    "counts restoration and only the subsequent same-site build as rebuild",
  ),
  fixture(
    "telemetry-coins",
    "tests/unit/ruleset-v7-ai-headless.test.ts",
    "reconciles every positive coin delta from accepted events",
  ),
  fixture(
    "telemetry-catapult",
    "tests/unit/ruleset-v7-ai-headless.test.ts",
    "counts explicit and automatic recovery between Catapult volleys",
  ),
  fixture(
    "telemetry-pursuit",
    "tests/unit/ruleset-v7-ai-headless.test.ts",
    "counts one Pursuit activation once and attributes retaliation to defender role",
  ),
  fixture(
    "telemetry-blackout",
    "tests/unit/ruleset-v7-ai-headless.test.ts",
    "samples Blackout and exposure once at the actual target turn boundary",
  ),
  fixture(
    "asset-inventory",
    "tests/unit/ruleset7-ui-assets.test.ts",
    "has explicit resolvable entries for every role, technology and improvement",
  ),
  fixture(
    "asset-standard-units",
    "tests/unit/ruleset7-original-unit-assets.test.ts",
    "records exact standard geometry, role language, and accepted world hashes",
  ),
  fixture(
    "asset-catapult",
    "tests/unit/ruleset7-catapult-assets.test.ts",
    "records a new accepted world asset with calibrated siege geometry",
  ),
  fixture(
    "asset-buildings",
    "tests/unit/ruleset7-building-economy-assets.test.ts",
    "defines exactly four new assets with strict geometry and no Spoils raster",
  ),
  fixture(
    "asset-tactical",
    "tests/unit/ruleset7-tactical-ui-assets.test.ts",
    "registers every required code-native role with unique static metadata",
  ),
  fixture(
    "asset-farms",
    "tests/unit/ruleset7-farm-assets.test.ts",
    "records three accepted independent PixelLab recipes with opaque exact footprints",
  ),
  fixture(
    "farm-pairing",
    "tests/unit/ruleset7-farm-assets.test.ts",
    "pairs canonical same-city revealed cardinal layouts without holes",
  ),
  fixture(
    "farm-pairing-boundaries",
    "tests/unit/ruleset7-farm-assets.test.ts",
    "recomputes presentation after removal, fog, pillage, or city ownership partition changes",
  ),
  fixture(
    "main-menu-resume",
    "tests/integration/ruleset7-dom-shell.test.ts",
    "returns a real accepted match boundary to Main menu and resumes it",
  ),
  fixture(
    "completed-hud",
    "tests/integration/ruleset7-dom-shell.test.ts",
    "labels a completed match without leaving a stale AI thinking status",
  ),
] as const);

export function fixtureExecutionKey(
  fixture: Pick<ReleaseFixtureV7, "source" | "test">,
): string {
  return `${fixture.source}::${fixture.test}`;
}

export function validateRuleset7ReleaseCorpus(
  corpus: ReleaseCorpusV7,
  expected: {
    readonly technologies: readonly string[];
    readonly roles: readonly string[];
    readonly improvements: readonly string[];
    readonly rewards: readonly string[];
    readonly passedFixtureTests: ReadonlySet<string>;
  },
): void {
  if (
    corpus.schemaVersion !== 1 ||
    corpus.rulesetId !== "pulp-wars-poc-7r2" ||
    corpus.generatedOn !== "2026-09-09"
  )
    throw new Error("Ruleset 7 release corpus identity is stale");
  if (corpus.mapMatrix.length !== 24)
    throw new Error("Ruleset 7 release corpus must contain 24 map cases");
  unique(
    corpus.mapMatrix.map((entry) => entry.id),
    "map case",
  );
  if (
    corpus.mapMatrix.some(
      (entry) =>
        !entry.repeatMatched ||
        !entry.frozenV6Parity ||
        !hash(entry.mapHash) ||
        !hash(entry.postGenerationPrngHash),
    )
  )
    throw new Error("Ruleset 7 map evidence is incomplete or dirty");
  unique(
    corpus.fixtures.map((fixture) => fixture.id),
    "fixture id",
  );
  const fixtureIds = new Set(corpus.fixtures.map((fixture) => fixture.id));
  for (const fixture of corpus.fixtures) {
    if (!expected.passedFixtureTests.has(fixtureExecutionKey(fixture)))
      throw new Error(
        `Fixture test did not execute successfully: ${fixture.id}`,
      );
  }
  validateInventory(
    corpus.inventoryCoverage.technologies,
    expected.technologies,
    fixtureIds,
    "technology",
  );
  validateInventory(
    corpus.inventoryCoverage.roles,
    expected.roles,
    fixtureIds,
    "role",
  );
  validateInventory(
    corpus.inventoryCoverage.improvements,
    expected.improvements,
    fixtureIds,
    "improvement",
  );
  validateInventory(
    corpus.inventoryCoverage.rewards,
    expected.rewards,
    fixtureIds,
    "reward",
  );
  for (const [mechanic, fixtureId] of Object.entries({
    ...corpus.mechanicCoverage,
    ...corpus.telemetryCoverage,
  })) {
    if (!fixtureIds.has(fixtureId))
      throw new Error(`${mechanic} references missing fixture ${fixtureId}`);
  }
  if (
    Object.keys(corpus.mechanicCoverage).length < 35 ||
    Object.keys(corpus.telemetryCoverage).length < 6
  )
    throw new Error("Ruleset 7 behavioral fixture coverage is incomplete");
  unique(
    corpus.evidence.map((entry) => entry.path),
    "evidence path",
  );
  if (
    JSON.stringify(corpus.evidence.map((entry) => entry.path)) !==
      JSON.stringify(REQUIRED_RELEASE_EVIDENCE_PATHS_V7) ||
    corpus.evidence.some(
      (entry) => !hash(entry.sha256) || entry.artifactCount <= 0,
    )
  )
    throw new Error("Ruleset 7 reviewed evidence is incomplete or dirty");
  if (!hash(corpus.frozenRuleset6Corpus.sha256))
    throw new Error("Frozen Ruleset 6 corpus hash is missing");
}

export function validateCompleteNormalMatrixEvidenceV7(
  input: unknown,
  expected: MatrixResumeExpectationV7,
): void {
  const entries = validateResumableMatrixEvidence(input, expected);
  if (
    typeof input !== "object" ||
    input === null ||
    (input as { readonly complete?: unknown }).complete !== true ||
    (input as { readonly completedCells?: unknown }).completedCells !==
      expected.expectedCells ||
    entries.length !== expected.expectedCells ||
    entries.some(
      (entry) =>
        entry.completedRuns !== expected.repeats || !entry.repeatHashesEqual,
    )
  )
    throw new Error("Ruleset 7 Normal matrix is a partial checkpoint");
}

function fixture(id: string, source: string, test: string): ReleaseFixtureV7 {
  return { id, source, test };
}

function validateInventory(
  actual: Readonly<Record<string, string>>,
  expected: readonly string[],
  fixtureIds: ReadonlySet<string>,
  label: string,
): void {
  const actualIds = Object.keys(actual);
  if (JSON.stringify(actualIds) !== JSON.stringify(expected))
    throw new Error(
      `${label} inventory fixture coverage is incomplete or stale`,
    );
  for (const [id, fixtureId] of Object.entries(actual))
    if (!fixtureIds.has(fixtureId))
      throw new Error(`${label} ${id} references missing fixture ${fixtureId}`);
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length)
    throw new Error(`Ruleset 7 release corpus contains duplicate ${label}`);
}

function hash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
import {
  validateResumableMatrixEvidence,
  type MatrixResumeExpectationV7,
} from "./ruleset-v7-normal-ai-matrix-evidence";
