import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { NormalPolicyWorkV7, chooseNormalCommandV7 } from "../src/ai/v7";
import { canonicalHash, type PlayerViewV7 } from "../src/engine/index";

const source = JSON.parse(
  readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
) as PlayerViewV7;

const view = structuredClone(source);
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
const synchronous = chooseNormalCommandV7(structuredClone(source));
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

if (
  report.fixtureViewHash !==
    "9826c2f0c2a3c93a461b4bbb1f31f9f1a7d3ee02047c9ef96246d0e68e7f0a77" ||
  report.policyDecisionHash !==
    "e3a9cb0f00b414c0220e01ff57b0d6cec3e5cd762f6c2cfeb83ab00d349a5e95" ||
  report.synchronous.decisionHash !== report.policyDecisionHash ||
  JSON.stringify(report.command) !==
    JSON.stringify({ kind: "BUILD_LUMBER_CAMP", at: { x: 12, y: 14 } })
)
  throw new Error(`Normal policy parity changed: ${JSON.stringify(report)}`);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
