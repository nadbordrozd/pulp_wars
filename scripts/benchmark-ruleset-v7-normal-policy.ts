import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { NormalPolicyWorkV7, chooseNormalCommandV7 } from "../src/ai/v7";
import { canonicalHash, type PlayerViewV7 } from "../src/engine/index";
import {
  RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION,
  upgradeRetainedPublicViewV7,
} from "./ruleset-v7-late-public-view-contract";

const source = JSON.parse(
  readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
) as PlayerViewV7;

const view = structuredClone(upgradeRetainedPublicViewV7(source));
const constructorStarted = performance.now();
const work = new NormalPolicyWorkV7(view);
const constructorMs = performance.now() - constructorStarted;
let decision: ReturnType<typeof chooseNormalCommandV7> | null = null;
let slices = 0;
let maximumSliceMs = 0;
let slicesOver8Ms = 0;
let slicesOver16Ms = 0;
const slicedStarted = performance.now();
while (decision === null) {
  const sliceStarted = performance.now();
  decision = work.runSlice(8);
  const elapsed = performance.now() - sliceStarted;
  maximumSliceMs = Math.max(maximumSliceMs, elapsed);
  slicesOver8Ms += Number(elapsed > 8);
  slicesOver16Ms += Number(elapsed > 16);
  slices += 1;
}
const slicedTotalMs = performance.now() - slicedStarted;

const synchronousStarted = performance.now();
const synchronous = chooseNormalCommandV7(
  structuredClone(upgradeRetainedPublicViewV7(source)),
);
const synchronousMs = performance.now() - synchronousStarted;
const report = {
  fixtureViewHash: canonicalHash(source),
  policyDecisionHash: canonicalHash(decision),
  command: decision.command,
  candidateCount: decision.candidates.length,
  constructorMs,
  sliced: {
    budgetMs: 8,
    slices,
    totalMs: slicedTotalMs,
    maximumSliceMs,
    slicesOver8Ms,
    slicesOver16Ms,
  },
  synchronous: {
    totalMs: synchronousMs,
    decisionHash: canonicalHash(synchronous),
  },
};

// The expected decision is the pin the unit test keeps current
// (`RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION`), not a second copy.
const expected = RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION;
if (
  report.fixtureViewHash !== expected.fixtureViewHash ||
  report.policyDecisionHash !== expected.policyDecisionHash ||
  report.synchronous.decisionHash !== report.policyDecisionHash ||
  JSON.stringify(report.command) !== JSON.stringify(expected.command) ||
  report.candidateCount !== expected.candidateCount
)
  throw new Error(`Normal policy parity changed: ${JSON.stringify(report)}`);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
