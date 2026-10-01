import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
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
  RULESET_7_ID !== "pulp-wars-poc-7r19" ||
  SAVE_STORAGE_KEY_V7 !== "pulpWars.save.v7r19.current" ||
  parseMatchSetupV7({
    rulesetId: RULESET_7_ID,
    seed: 0,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "UNDEAD"],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  }) === null ||
  FACTION_IDS_V7.join(",") !== "ORIGINAL,UNDEAD,GOBLIN,DINOSAUR" ||
  FACTION_TREE_IDS_V7.join(",") !==
    "ORIGINAL_BASELINE_V5,UNDEAD_BASELINE_V1,GOBLIN_BASELINE_V1,DINOSAUR_BASELINE_V1"
)
  throw new Error("Current revision-19 release identity is invalid");

const vitest = path.join(root, "node_modules/vitest/vitest.mjs");
const result = spawnSync(
  process.execPath,
  [
    vitest,
    "run",
    "tests/unit/ruleset-v7-biome-map.test.ts",
    "tests/unit/ruleset-v7-biome-economy.test.ts",
    "tests/unit/ruleset-v7-biome-query-ai.test.ts",
    "tests/unit/ruleset-v7-achievements.test.ts",
    "tests/unit/ruleset-v7-technology.test.ts",
    "tests/unit/ruleset-v7-revision8.test.ts",
    "tests/unit/ruleset-v7-roster-pursuit.test.ts",
    "tests/unit/ruleset-v7-revision7.test.ts",
    "tests/unit/ruleset-v7-economy.test.ts",
    "tests/unit/ruleset-v7-naval-economy.test.ts",
    "tests/unit/ruleset-v7-observation.test.ts",
    "tests/unit/ruleset-v7-playtest-r10.test.ts",
    "tests/unit/ruleset-v7-logistics-r11.test.ts",
    "tests/unit/ruleset-v7-revision12.test.ts",
    "tests/unit/ruleset-v7-undead-faction.test.ts",
    "tests/unit/ruleset-v7-revision14.test.ts",
    "tests/unit/ruleset-v7-revision15.test.ts",
    "tests/unit/ruleset-v7-revision16.test.ts",
    "tests/unit/ruleset-v7-revision16-naval.test.ts",
    "tests/unit/ruleset-v7-goblin-faction.test.ts",
    "tests/unit/ruleset-v7-goblin-rules.test.ts",
    "tests/unit/ruleset-v7-revision18.test.ts",
    "tests/unit/ruleset-v7-revision18-showcase.test.ts",
    "tests/unit/ruleset-v7-dinosaur-faction.test.ts",
    "tests/unit/ruleset-v7-dinosaur-rules.test.ts",
    "tests/unit/ruleset-v7-save.test.ts",
    "tests/unit/persistence-v7.test.ts",
    "tests/integration/ruleset7-biome-browser.test.ts",
    "tests/integration/ruleset7-dom-shell.test.ts",
    "tests/integration/ruleset7-landing-dom.test.ts",
    "--maxWorkers=1",
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error("Current revision-19 release contract tests failed");
process.stdout.write(
  "ruleset-7 current release PASS: revision-19 identity and the Dinosaur faction core (registration, roster, capacity slots, Grow, Wild, Acid, Armoured, substitutions, Showcase; Eggs and Stampede declared, resolved from pulp_wars-c87.3); revision-18 movement and Showcase; the revision-17 Goblin faction core (registration, roster, the starting Goblin, substitutions, Warrens, Gang Up, Plunder, WAAAGH!, Troll regeneration, the Field Defense restriction); revision-16a orthogonal Shallow Water with the 25% Shallow minimum, capital growth floor and CAPITAL_GROWTH, Normal AI growth-first opening; revision-16b 2-tile boats (Patrol Boat and embarked Move 2, DISEMBARK spends one point) and the landing preview; revision-15 three-turn Plague with first-turn spread, Zombie 18 HP; revision-14 Plague, Bitten, unanswered Vampire, Lich Attack 3, village table, and income caps; revision-13 faction registration (Human and Undead rosters), revision-12 rules (free opening research, Fertile Ground mask, Raider Escape), roster, economy, naval, logistics, privacy, persistence, UI, and identity contracts; archived revision-2 corpus preserved\n",
);
