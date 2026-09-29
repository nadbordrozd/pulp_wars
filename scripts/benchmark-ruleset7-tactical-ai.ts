import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NormalPolicyWorkV7, chooseNormalCommandV7 } from "../src/ai/v7";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  canonicalHash,
  cityId,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  unitId,
  viewForV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../src/engine/index";
import { upgradeRetainedPublicViewV7 } from "./ruleset-v7-late-public-view-contract";
import {
  TACTICAL_AI_BASELINE_REF,
  TACTICAL_AI_BASELINE_SHA256,
  loadPinnedTacticalAiBaselineV7,
} from "./ruleset-v7-tactical-ai-baseline";

const retained = structuredClone(
  upgradeRetainedPublicViewV7(
    JSON.parse(
      readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
    ) as PlayerViewV7,
  ),
);
const worstCase = legalWorstCaseView();
const views = [
  { id: "retained-command-1100", view: retained },
  { id: "legal-25x25", view: worstCase },
] as const;

const probe = optionalArgument("--probe");
if (probe !== null) {
  const [id, policyName] = probe.split(":");
  const selected = views.find((entry) => entry.id === id);
  if (
    selected === undefined ||
    (policyName !== "baseline" && policyName !== "revised")
  )
    throw new Error(`Unknown benchmark probe ${probe}`);
  if (policyName === "baseline") {
    const baseline = await loadPinnedTacticalAiBaselineV7();
    try {
      process.stdout.write(
        `${JSON.stringify(measureBaseline(selected.view, baseline.module))}\n`,
      );
    } finally {
      baseline.cleanup();
    }
  } else {
    process.stdout.write(`${JSON.stringify(measureRevised(selected.view))}\n`);
  }
} else {
  const output = argument("--output");
  const report = {
    schemaVersion: 1,
    baseline: {
      ref: TACTICAL_AI_BASELINE_REF,
      sha256: TACTICAL_AI_BASELINE_SHA256,
      adapter: "pinned policy source + current revision-11 engine modules",
    },
    timing: "Diagnostic only; elapsed time never affects policy decisions.",
    views: views.map(({ id, view }) => {
      process.stderr.write(
        `[benchmark] ${id}: pinned baseline fresh process\n`,
      );
      const before = runProbe(id, "baseline");
      process.stderr.write(`[benchmark] ${id}: revised policy fresh process\n`);
      const after = runProbe(id, "revised");
      if (before.command === null || before.candidateCount === 0)
        throw new Error(`${id} baseline fixture is not actionable`);
      if (after.command === null || after.candidateCount === 0)
        throw new Error(`${id} revised fixture is not actionable`);
      return {
        id,
        viewHash: canonicalHash(view),
        facts: {
          board: `${view.board.width}x${view.board.height}`,
          units: view.units.length,
          cities: view.cities.length,
          visibleHostiles: view.units.filter(
            (unit) => unit.ownerId !== view.viewer.id,
          ).length,
        },
        baseline: before,
        revised: after,
        durationRatio: ratio(after.timing.totalMs, before.timing.totalMs),
      };
    }),
  };
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function runProbe(
  id: (typeof views)[number]["id"],
  policy: "baseline" | "revised",
): ReturnType<typeof measureRevised> {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(import.meta.url),
      "--probe",
      `${id}:${policy}`,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.status !== 0)
    throw new Error(
      `Benchmark probe ${id}:${policy} failed: ${result.stderr || result.stdout}`,
    );
  return JSON.parse(result.stdout) as ReturnType<typeof measureRevised>;
}

function measureBaseline(
  source: PlayerViewV7,
  policy: Awaited<ReturnType<typeof loadPinnedTacticalAiBaselineV7>>["module"],
) {
  let clock = 0;
  const coldStarted = performance.now();
  const work = new policy.NormalPolicyWorkV7(
    structuredClone(source),
    () => clock++,
  );
  let decision: unknown = null;
  let workUnits = 0;
  while (decision === null) {
    decision = work.runSlice(1);
    workUnits += 1;
    if (workUnits > 10_000_000) throw new Error("Baseline work did not finish");
  }
  const coldDurationMs = round(performance.now() - coldStarted);
  const timings = timed(() =>
    policy.chooseNormalCommandV7(structuredClone(source)),
  );
  const slicedTiming = timedSlices(
    () => new policy.NormalPolicyWorkV7(structuredClone(source)),
  );
  const selected = decision as {
    command: unknown;
    candidates: readonly unknown[];
  };
  if (
    slicedTiming.decisionHash !== canonicalHash(selected) ||
    timings.decisionHashes.some((hash) => hash !== canonicalHash(selected))
  )
    throw new Error(
      "Baseline synchronous/synthetic/browser-sliced parity failed",
    );
  return {
    command: selected.command,
    decisionHash: canonicalHash(selected),
    candidateCount: selected.candidates.length,
    coldTiming: {
      totalMs: coldDurationMs,
      decisionHash: canonicalHash(selected),
      note: "One decision in a fresh process before stable-fact cache reuse.",
    },
    legacyLoopIterationsAtSyntheticBudgetOne: workUnits,
    loopCountNote:
      "Synthetic-clock outer policy-loop iterations; not equivalent to revised declared path-expansion work units.",
    timing: timings,
    slicedTiming,
  };
}

function measureRevised(source: PlayerViewV7) {
  const coldStarted = performance.now();
  const work = new NormalPolicyWorkV7(structuredClone(source), () => 0);
  let decision = work.advanceWork(1);
  let slices = 1;
  while (decision === null) {
    decision = work.advanceWork(1);
    slices += 1;
  }
  const coldDurationMs = round(performance.now() - coldStarted);
  const diagnostic = work.diagnostic();
  const warmStarted = performance.now();
  const warmWork = new NormalPolicyWorkV7(structuredClone(source), () => 0);
  let warmDecision = warmWork.advanceWork(1);
  while (warmDecision === null) warmDecision = warmWork.advanceWork(1);
  const warmDurationMs = round(performance.now() - warmStarted);
  const warmDiagnostic = warmWork.diagnostic();
  const timings = timed(() => chooseNormalCommandV7(structuredClone(source)));
  const slicedTiming = timedSlices(
    () => new NormalPolicyWorkV7(structuredClone(source)),
  );
  if (
    slicedTiming.decisionHash !== canonicalHash(decision) ||
    canonicalHash(warmDecision) !== canonicalHash(decision) ||
    timings.decisionHashes.some((hash) => hash !== canonicalHash(decision))
  )
    throw new Error(
      "Revised synchronous/budget-one/browser-sliced parity failed",
    );
  return {
    command: decision.command,
    decisionHash: canonicalHash(decision),
    candidateCount: decision.candidates.length,
    workUnits: diagnostic.workUnits,
    slicesAtBudgetOne: slices,
    work: diagnostic,
    coldTiming: {
      totalMs: coldDurationMs,
      decisionHash: canonicalHash(decision),
      note: "One budget-one decision in a fresh process before stable-fact cache reuse.",
    },
    warmBudgetOne: {
      totalMs: warmDurationMs,
      decisionHash: canonicalHash(warmDecision),
      workUnits: warmDiagnostic.workUnits,
      work: warmDiagnostic,
      note: "Immediate equal-view reconstruction after the cold decision in the same process.",
    },
    timing: timings,
    slicedTiming,
  };
}

function timed(run: () => unknown) {
  const samples: number[] = [];
  const decisionHashes: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const started = performance.now();
    const result = run();
    samples.push(performance.now() - started);
    decisionHashes.push(canonicalHash(result));
  }
  samples.sort((left, right) => left - right);
  return {
    samples: samples.length,
    totalMs: round(samples.reduce((total, item) => total + item, 0)),
    p50Ms: round(samples[Math.floor(samples.length / 2)] ?? 0),
    p95Ms: round(samples.at(-1) ?? 0),
    maximumMs: round(samples.at(-1) ?? 0),
    decisionHashes,
  };
}

function timedSlices(
  factory: () => { runSlice(milliseconds: number): unknown },
) {
  const samples: number[] = [];
  const work = factory();
  let result: unknown = null;
  const started = performance.now();
  while (result === null) {
    const sliceStarted = performance.now();
    result = work.runSlice(8);
    samples.push(performance.now() - sliceStarted);
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (fraction: number) =>
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ] ?? 0;
  return {
    budgetMs: 8,
    slices: samples.length,
    totalMs: round(performance.now() - started),
    p50Ms: round(percentile(0.5)),
    p95Ms: round(percentile(0.95)),
    maximumMs: round(sorted.at(-1) ?? 0),
    decisionHash: canonicalHash(result),
  };
}

function legalWorstCaseView(): PlayerViewV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 751_125,
    width: 25,
    height: 25,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  });
  if (!created.ok)
    throw new Error(`25x25 fixture failed: ${created.error.code}`);
  const playerId = created.state.turnOrder[created.state.activeSeatIndex];
  if (playerId === undefined) throw new Error("25x25 active player missing");
  const newCityId = cityId(9);
  const newCityAt = { x: 10, y: 17 };
  const owner = created.state.players.find((player) => player.id === playerId);
  const capital = created.state.cities.find(
    (city) => city.id === owner?.originalCapitalCityId,
  );
  if (owner === undefined || capital === undefined)
    throw new Error("25x25 owner/capital missing");
  const reserved = new Set(created.state.units.map((unit) => key(unit.at)));
  const pick = (near: { x: number; y: number }) => {
    const tile = created.state.board.tiles
      .filter(
        (candidate) =>
          candidate.biome !== null &&
          candidate.terrain !== "MOUNTAIN" &&
          !reserved.has(key(candidate.at)) &&
          !created.state.cities.some(
            (city) => key(city.at) === key(candidate.at),
          ),
      )
      .sort(
        (left, right) =>
          distance(left.at, near) - distance(right.at, near) ||
          left.at.y - right.at.y ||
          left.at.x - right.at.x,
      )[0];
    if (tile === undefined) throw new Error("25x25 unit placement missing");
    reserved.add(key(tile.at));
    return tile.at;
  };
  const activeTemplate = created.state.units.find(
    (unit) => unit.ownerId === playerId,
  );
  if (activeTemplate === undefined) throw new Error("25x25 unit missing");
  const makeUnit = (
    id: number,
    role: "GUARD" | "CAPTAIN" | "CATAPULT" | "RAIDER",
    at: { x: number; y: number },
    homeCityId: typeof newCityId,
    ownerId = playerId,
  ) => ({
    ...activeTemplate,
    id: unitId(id),
    ownerId,
    homeCityId,
    role,
    at,
    hp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
    maxHp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
  });
  const hostilePlayers = created.state.players.filter(
    (player) => player.id !== playerId,
  );
  const hostileOne = hostilePlayers[0];
  const hostileTwo = hostilePlayers[1];
  if (hostileOne === undefined || hostileTwo === undefined)
    throw new Error("25x25 hostile players missing");
  const roadPathKeys = new Set(
    created.state.board.tiles
      .filter(
        (tile) =>
          tile.biome !== null &&
          distance(tile.at, capital.at) <= 3 &&
          distance(tile.at, newCityAt) < distance(capital.at, newCityAt),
      )
      .sort(
        (left, right) =>
          distance(left.at, newCityAt) - distance(right.at, newCityAt),
      )
      .slice(0, 3)
      .map((tile) => key(tile.at)),
  );
  const unparsed: GameStateV7 = {
    ...created.state,
    nextEntityId: 16,
    players: created.state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            coins: 100,
            researchedTechs: TECHNOLOGY_IDS_V7,
            explored: created.state.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    board: {
      ...created.state.board,
      tiles: created.state.board.tiles.map((tile) => {
        const inNewTerritory = distance(tile.at, newCityAt) <= 1;
        return {
          ...tile,
          site: key(tile.at) === key(newCityAt) ? ("CITY" as const) : tile.site,
          territoryCityId:
            inNewTerritory && tile.territoryCityId === null
              ? newCityId
              : tile.territoryCityId,
          road: tile.road || roadPathKeys.has(key(tile.at)),
        };
      }),
    },
    cities: [
      ...created.state.cities,
      {
        id: newCityId,
        ownerId: playerId,
        at: newCityAt,
        level: 1,
        permanentPopulation: 0,
        economicPopulation: 0,
        population: 0,
        isCapital: false,
        expanded: false,
        landGrantUsed: false,
        cityActionAvailable: true,
        rewards: [],
      },
    ],
    units: [
      ...created.state.units.map((unit) =>
        unit.ownerId === playerId
          ? {
              ...unit,
              role: "GUARD" as const,
              hp: effectiveRoleRuleV7("GUARD", "ORIGINAL").maxHp,
              maxHp: effectiveRoleRuleV7("GUARD", "ORIGINAL").maxHp,
            }
          : unit,
      ),
      makeUnit(10, "CAPTAIN", pick(capital.at), capital.id),
      makeUnit(11, "CATAPULT", pick(capital.at), capital.id),
      makeUnit(12, "RAIDER", pick(newCityAt), newCityId),
      makeUnit(13, "GUARD", pick(newCityAt), newCityId),
      makeUnit(
        14,
        "RAIDER",
        pick(capital.at),
        hostileOne.originalCapitalCityId,
        hostileOne.id,
      ),
      makeUnit(
        15,
        "CATAPULT",
        pick(newCityAt),
        hostileTwo.originalCapitalCityId,
        hostileTwo.id,
      ),
    ],
  };
  const state = parseGameStateV7(unparsed);
  if (state === null)
    throw new Error("Constructed dense 25x25 state is invalid");
  return viewForV7(state, playerId);
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index < 0 || value === undefined || value.startsWith("--"))
    throw new Error(`Usage: ${name} <path>`);
  return value;
}

function optionalArgument(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--"))
    throw new Error(`Usage: ${name} <value>`);
  return value;
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function ratio(left: number, right: number): number | null {
  return right === 0 ? null : round(left / right);
}

function key(at: { x: number; y: number }): string {
  return `${at.y},${at.x}`;
}

function distance(
  left: { x: number; y: number },
  right: { x: number; y: number },
): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
