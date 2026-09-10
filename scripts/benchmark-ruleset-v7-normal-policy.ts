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
    "d095b657a12242e56e4bf3ada5e3a0a8d1982da358a906c9bd477e0eabe6c75b" ||
  report.policyDecisionHash !==
    "c5d38ea77c2efa7b859191f3e3449082e75f0753273308e1192535742b9d1f82" ||
  report.synchronous.decisionHash !== report.policyDecisionHash ||
  JSON.stringify(report.command) !==
    JSON.stringify({ kind: "BUILD_FORGE", at: { x: 9, y: 8 } })
)
  throw new Error(`Normal policy parity changed: ${JSON.stringify(report)}`);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
