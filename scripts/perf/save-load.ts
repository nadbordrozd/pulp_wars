/**
 * Save load timing, size and equivalence (bead `pulp_wars-2yc.95`,
 * docs/architecture/PERFORMANCE.md). Plays no match: it reads saves written
 * earlier (for example by `scripts/sim-bug-hunt-v7.ts --keep-saves`).
 *
 *   node node_modules/.bin/tsx scripts/perf/save-load.ts [--runs 3] \
 *     [--no-verify] <save.json>...
 *
 * For each save it prints the command count, the size of the save, its
 * command log and its state; the time of the browser's resume,
 * `parseSaveV7(source, { replay: "DEFER" })` (schema, invariants, hash; no
 * replay), and of the full `parseSaveV7(source)` (the same plus the replay
 * of the whole log: the resume before the bead, and the work the browser's
 * history check now does in a Web Worker), the fastest of `--runs` runs
 * each; and whether the deferred load's state equals the state the replay
 * rebuilds (canonical JSON).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { canonicalJson, runReplayV7 } from "../../src/engine/index";
import { parseSaveV7 } from "../../src/persistence/v7";

const args = process.argv.slice(2);
const runsIndex = args.indexOf("--runs");
const runs = runsIndex >= 0 ? Number(args[runsIndex + 1] ?? "3") : 3;
const skipVerify = args.includes("--no-verify");
const files = args.filter(
  (item, index) =>
    !item.startsWith("--") && (runsIndex < 0 || index !== runsIndex + 1),
);

function fastest(task: () => void): number {
  let best = Number.POSITIVE_INFINITY;
  for (let run = 0; run < runs; run += 1) {
    const started = performance.now();
    task();
    best = Math.min(best, performance.now() - started);
  }
  return best;
}

const bytesOf = (text: string): number =>
  new TextEncoder().encode(text).byteLength;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const raw = JSON.parse(source) as {
    acceptedCommands: unknown[];
    state: unknown;
  };
  let deferredKind = "";
  const deferred = fastest(() => {
    deferredKind = parseSaveV7(source, { replay: "DEFER" }).kind;
  });
  let verifiedKind = "-";
  const verified = skipVerify
    ? Number.NaN
    : fastest(() => {
        verifiedKind = parseSaveV7(source).kind;
      });
  const loaded = parseSaveV7(source, { replay: "DEFER" });
  let same = "-";
  if (!skipVerify && loaded.kind === "VALID") {
    const replayed = runReplayV7({
      format: "pulp-wars-replay",
      version: 7,
      setup: loaded.save.setup,
      commands: loaded.save.acceptedCommands,
      checkpoints: [],
    });
    same = String(
      canonicalJson(replayed.state) === canonicalJson(loaded.save.state) &&
        replayed.stateHash === loaded.save.stateHash,
    );
  }
  console.log(
    [
      path.basename(file),
      `commands=${raw.acceptedCommands.length}`,
      `bytes=${bytesOf(source)}`,
      `log=${bytesOf(JSON.stringify(raw.acceptedCommands))}`,
      `state=${bytesOf(JSON.stringify(raw.state))}`,
      `resume=${deferredKind} ${deferred.toFixed(1)}ms`,
      `full=${verifiedKind} ${Number.isNaN(verified) ? "-" : verified.toFixed(0)}ms`,
      `sameState=${same}`,
    ].join(" "),
  );
}
