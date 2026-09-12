import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  parseMatchSetupV7,
} from "../src/engine/index";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = JSON.parse(
  readFileSync(
    path.join(root, "docs/validation/RULESET_7_RELEASE_CORPUS.json"),
    "utf8",
  ),
) as { readonly rulesetId?: unknown };
if (archive.rulesetId !== "pulp-wars-poc-7r2")
  throw new Error("Archived revision-2 release corpus identity changed");
if (
  RULESET_7_ID !== "pulp-wars-poc-7r4" ||
  SAVE_STORAGE_KEY_V7 !== "pulpWars.save.v7r4.current" ||
  parseMatchSetupV7({
    rulesetId: RULESET_7_ID,
    seed: 0,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL"],
    mapGenerationRevision: "REGIONAL_BIOMES_V1",
  }) === null
)
  throw new Error("Current revision-4 release identity is invalid");

const vitest = path.join(root, "node_modules/vitest/vitest.mjs");
const result = spawnSync(
  process.execPath,
  [
    vitest,
    "run",
    "tests/unit/ruleset-v7-biome-map.test.ts",
    "tests/unit/ruleset-v7-biome-economy.test.ts",
    "tests/unit/ruleset-v7-biome-query-ai.test.ts",
    "tests/unit/ruleset-v7-save.test.ts",
    "tests/integration/ruleset7-biome-browser.test.ts",
    "--maxWorkers=1",
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error("Current revision-4 release contract tests failed");
process.stdout.write(
  "ruleset-7 current release PASS: revision-4 identity and focused runtime contracts; archived revision-2 corpus preserved\n",
);
