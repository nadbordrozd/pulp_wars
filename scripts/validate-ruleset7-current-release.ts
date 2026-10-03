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
  RULESET_7_ID !== "pulp-wars-poc-7r31" ||
  SAVE_STORAGE_KEY_V7 !== "pulpWars.save.v7r31.current" ||
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
  FACTION_IDS_V7.join(",") !==
    "ORIGINAL,UNDEAD,GOBLIN,DINOSAUR,MARTIAN,ICE_FOLK,DWARF" ||
  FACTION_TREE_IDS_V7.join(",") !==
    "ORIGINAL_BASELINE_V5,UNDEAD_BASELINE_V1,GOBLIN_BASELINE_V1,DINOSAUR_BASELINE_V1,MARTIAN_BASELINE_V1,ICE_FOLK_BASELINE_V1,DWARF_BASELINE_V1"
)
  throw new Error("Current Dwarf-revision release identity is invalid");

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
    "tests/unit/ruleset-v7-dinosaur-eggs.test.ts",
    "tests/unit/ruleset-v7-revision20-rules.test.ts",
    "tests/unit/ruleset-v7-revision20-charge.test.ts",
    "tests/unit/ruleset-v7-revision20-industry.test.ts",
    "tests/unit/ruleset-v7-revision21-achievements.test.ts",
    "tests/unit/ruleset-v7-revision23-sturdiness.test.ts",
    "tests/unit/ruleset-v7-martian-faction.test.ts",
    "tests/unit/ruleset-v7-martian-shields.test.ts",
    "tests/unit/ruleset-v7-martian-rays.test.ts",
    "tests/unit/ruleset-v7-martian-movement.test.ts",
    "tests/unit/ruleset-v7-martian-abilities.test.ts",
    "tests/unit/ruleset-v7-martian-interactions.test.ts",
    "tests/unit/ruleset-v7-martian-headless.test.ts",
    "tests/unit/ruleset-v7-ice-folk-identity.test.ts",
    "tests/unit/ruleset-v7-ice-folk-helpers.test.ts",
    "tests/unit/ruleset-v7-ice-folk-faction.test.ts",
    "tests/unit/ruleset-v7-ice-folk-chill.test.ts",
    "tests/unit/ruleset-v7-ice-folk-shatter.test.ts",
    "tests/unit/ruleset-v7-ice-folk-snow.test.ts",
    "tests/unit/ruleset-v7-ice-folk-units.test.ts",
    "tests/unit/ruleset-v7-ice-folk-interactions.test.ts",
    "tests/unit/ruleset-v7-ice-folk-persistence.test.ts",
    "tests/unit/ruleset-v7-ice-folk-headless.test.ts",
    // The Dwarf revision (`pulp_wars-78i.3`).
    "tests/unit/ruleset-v7-dwarf-unit-readers.test.ts",
    "tests/unit/ruleset-v7-dwarf-identity.test.ts",
    "tests/unit/ruleset-v7-dwarf-faction.test.ts",
    "tests/unit/ruleset-v7-dwarf-tunnel.test.ts",
    "tests/unit/ruleset-v7-dwarf-bomb.test.ts",
    "tests/unit/ruleset-v7-dwarf-units.test.ts",
    "tests/unit/ruleset-v7-dwarf-interactions.test.ts",
    "tests/unit/ruleset-v7-dwarf-persistence.test.ts",
    "tests/unit/ruleset-v7-dwarf-headless.test.ts",
    "tests/unit/ruleset-v7-dinosaur-form-audit.test.ts",
    "tests/unit/ruleset-v7-dinosaur-ai-basics.test.ts",
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
  throw new Error("Current Dwarf-revision release contract tests failed");
process.stdout.write(
  "ruleset-7 current release PASS: the 7r31 identity (the Dwarf coarse balance: the bomb deals 5, 6 with Dive) after the 7r30 identity (the Steampunk Dwarf faction engine: Tunnels and mounds, the eruption, Bomb Run, clockwork, the twin-shot Gunner, Dig In, Repair and Assemble, Knockback, Plated, the Brass Titan; the off-board burrowed list with its unit-reader classification; hidden from the setup screen) with exact public previews and headless Normal matches without errors, after the 7r29 identity (every player plays a different faction; DUPLICATE_FACTION, the headless and test only mirror option) after the 7r28 identity (the Rift: a 1 x 3 crack only flyers stand on, rare in map generation) after the 7r27 identity (the Ice Folk coarse balance: Yeti 9 HP, Defense 1.5) after the 7r26 identity (the Pangea coast ring) after the 7r25 identity (the Martian balance: Colossus Defense 2.5) and the Ice Folk faction engine (Chill and Shatter, Snow, Blizzards, Cold Snap, Deep Winter, Brittle, Glide, Mountain-born, Rockfall, Sweep, Trample, Prowl, the Frost Giant's Cold Aura) with exact public previews and headless Normal matches without errors; the revision-23 sturdiness numbers (Human core land roles, Caveman); the Martian faction engine (Shields, heat rays and Cooling, Pierce, Stride, Flying and self-launch, Beam Down, Mind Control and Thralls, the Tractor Beam) with exact public previews and headless Normal matches without errors; the revision-21 Conqueror, Land Baron, Sea Dog, and Slayer achievements; the revision-20 Triceratops Charge! (run-up, ignored fortification, Push and follow) with exact public previews, the T-Rex cost and hatch time, Nesting's city slot and Wallbreaker, and the full heal of a Promotion and of a growth stage; the revision-19 Dinosaur faction core (registration, roster, capacity slots, Grow, Wild, Acid, Armoured, substitutions, Showcase) and Eggs (LAY_EGG, hatching, Shaman Hatch, Nesting, destruction, capture, Abandon Egg); revision-18 movement and Showcase; the revision-17 Goblin faction core (registration, roster, the starting Goblin, substitutions, Warrens, Gang Up, Plunder, WAAAGH!, Troll regeneration, the Field Defense restriction); revision-16a orthogonal Shallow Water with the 25% Shallow minimum, capital growth floor and CAPITAL_GROWTH, Normal AI growth-first opening; revision-16b 2-tile boats (Patrol Boat and embarked Move 2, DISEMBARK spends one point) and the landing preview; revision-15 three-turn Plague with first-turn spread, Zombie 18 HP; revision-14 Plague, Bitten, unanswered Vampire, Lich Attack 3, village table, and income caps; revision-13 faction registration (Human and Undead rosters), revision-12 rules (free opening research, Fertile Ground mask, Raider Escape), roster, economy, naval, logistics, privacy, persistence, UI, and identity contracts; archived revision-2 corpus preserved\n",
);
