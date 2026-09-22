import { spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const output = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-v7-achievement-review-"),
);
const args = [
  "node_modules/tsx/dist/cli.mjs",
  "scripts/browser-ui-polish-review-v7.ts",
  "--achievement-only",
  `--output=${output}`,
  ...process.argv.slice(2),
];
console.log(`Achievement browser review evidence: ${output}`);
const result = spawnSync(process.execPath, args, { stdio: "inherit" });
if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;
