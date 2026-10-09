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
  MAP_GENERATION_REVISION_V7,
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
  RULESET_7_ID !== "pulp-wars-poc-7r70" ||
  SAVE_STORAGE_KEY_V7 !== "pulpWars.save.v7r70.current" ||
  MAP_GENERATION_REVISION_V7 !== "REGIONAL_BIOMES_NAVAL_V4" ||
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
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  }) === null ||
  FACTION_IDS_V7.join(",") !==
    "ORIGINAL,UNDEAD,GOBLIN,DINOSAUR,MARTIAN,ICE_FOLK,DWARF,CANDY" ||
  FACTION_TREE_IDS_V7.join(",") !==
    "ORIGINAL_BASELINE_V5,UNDEAD_BASELINE_V1,GOBLIN_BASELINE_V1,DINOSAUR_BASELINE_V1,MARTIAN_BASELINE_V1,ICE_FOLK_BASELINE_V1,DWARF_BASELINE_V1,CANDY_BASELINE_V1"
)
  throw new Error("Current Candy-revision release identity is invalid");

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
    "tests/unit/ruleset-v7-revision12.sim.test.ts",
    "tests/unit/ruleset-v7-undead-faction.test.ts",
    "tests/unit/ruleset-v7-undead-faction.sim.test.ts",
    "tests/unit/ruleset-v7-revision14.test.ts",
    "tests/unit/ruleset-v7-revision14.sim.test.ts",
    "tests/unit/ruleset-v7-revision15.test.ts",
    "tests/unit/ruleset-v7-revision16.test.ts",
    "tests/unit/ruleset-v7-revision16.sim.test.ts",
    "tests/unit/ruleset-v7-revision16-naval.test.ts",
    "tests/unit/ruleset-v7-revision16-naval.sim.test.ts",
    "tests/unit/ruleset-v7-goblin-faction.test.ts",
    "tests/unit/ruleset-v7-goblin-faction.sim.test.ts",
    "tests/unit/ruleset-v7-goblin-rules.test.ts",
    "tests/unit/ruleset-v7-revision18.test.ts",
    "tests/unit/ruleset-v7-revision18.sim.test.ts",
    "tests/unit/ruleset-v7-revision18-showcase.test.ts",
    "tests/unit/ruleset-v7-revision18-showcase.sim.test.ts",
    "tests/unit/ruleset-v7-dinosaur-faction.test.ts",
    "tests/unit/ruleset-v7-dinosaur-faction.sim.test.ts",
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
    "tests/unit/ruleset-v7-martian-headless.sim.test.ts",
    "tests/unit/ruleset-v7-ice-folk-identity.test.ts",
    "tests/unit/ruleset-v7-ice-folk-helpers.test.ts",
    "tests/unit/ruleset-v7-ice-folk-faction.test.ts",
    "tests/unit/ruleset-v7-ice-folk-freeze.test.ts",
    "tests/unit/ruleset-v7-ice-folk-shatter.test.ts",
    "tests/unit/ruleset-v7-ice-folk-snow.test.ts",
    "tests/unit/ruleset-v7-ice-folk-units.test.ts",
    "tests/unit/ruleset-v7-ice-folk-interactions.test.ts",
    "tests/unit/ruleset-v7-ice-folk-persistence.test.ts",
    "tests/unit/ruleset-v7-ice-folk-headless.sim.test.ts",
    // The Dwarf revision (`pulp_wars-78i.3`).
    "tests/unit/ruleset-v7-dwarf-unit-readers.test.ts",
    "tests/unit/ruleset-v7-dwarf-identity.test.ts",
    "tests/unit/ruleset-v7-dwarf-faction.test.ts",
    "tests/unit/ruleset-v7-dwarf-tunnel.test.ts",
    "tests/unit/ruleset-v7-dwarf-bomb.test.ts",
    "tests/unit/ruleset-v7-dwarf-units.test.ts",
    "tests/unit/ruleset-v7-dwarf-interactions.test.ts",
    "tests/unit/ruleset-v7-dwarf-persistence.test.ts",
    "tests/unit/ruleset-v7-dwarf-headless.sim.test.ts",
    // Mission setups (`pulp_wars-68k.2`, docs/product/CAMPAIGN.md).
    "tests/unit/ruleset-v7-missions.test.ts",
    "tests/unit/ruleset-v7-missions.sim.test.ts",
    // Map curiosities engine I (`pulp_wars-737.2`,
    // docs/product/RULESET_7_MAP_CURIOSITIES.md).
    "tests/unit/ruleset-v7-curiosities.test.ts",
    "tests/unit/ruleset-v7-curiosities.sim.test.ts",
    "tests/integration/ruleset7-curiosities-dom.test.ts",
    "tests/integration/ruleset7-curiosities-dom.sim.test.ts",
    // Map curiosities engine II, the Giant Spider (`pulp_wars-737.3`).
    "tests/unit/ruleset-v7-monster.test.ts",
    "tests/unit/ruleset-v7-monster.sim.test.ts",
    "tests/unit/ruleset-v7-owner-readers.test.ts",
    // The Martian and Ice Folk balance round (`pulp_wars-1wy.3`,
    // docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md).
    "tests/unit/ruleset-v7-balance-martian-ice.test.ts",
    // The Candy faction engine (`pulp_wars-jdb.3`,
    // docs/product/RULESET_7_CANDY.md).
    "tests/unit/ruleset-v7-candy-identity.test.ts",
    "tests/unit/ruleset-v7-candy-numbers.test.ts",
    "tests/unit/ruleset-v7-candy-faction.test.ts",
    "tests/unit/ruleset-v7-candy-rush.test.ts",
    "tests/unit/ruleset-v7-candy-crumbs.test.ts",
    "tests/unit/ruleset-v7-candy-combat.test.ts",
    "tests/unit/ruleset-v7-candy-interactions.test.ts",
    "tests/unit/ruleset-v7-candy-persistence.test.ts",
    "tests/unit/ruleset-v7-candy-headless.sim.test.ts",
    "tests/unit/ruleset-v7-candy-ai.test.ts",
    // Map scale: the village density (`pulp_wars-ykw.2`, kept as the V3
    // parity rules) and many seats (`pulp_wars-ykw.3`,
    // docs/product/RULESET_7_MAP_SCALE.md).
    "tests/unit/ruleset-v7-map-scale.test.ts",
    "tests/unit/ruleset-v7-many-seats.test.ts",
    // The naval branch, engine step I (`pulp_wars-5ti.2`,
    // docs/product/RULESET_7_NAVAL_BRANCH.md).
    "tests/unit/ruleset-v7-naval-branch-identity.test.ts",
    "tests/unit/ruleset-v7-naval-branch-ram.test.ts",
    "tests/unit/ruleset-v7-naval-branch-board.test.ts",
    "tests/unit/ruleset-v7-naval-branch-submarine.test.ts",
    "tests/unit/ruleset-v7-naval-branch-harbours.test.ts",
    "tests/unit/ruleset-v7-naval-branch-persistence.test.ts",
    "tests/unit/ruleset-v7-naval-branch-headless.sim.test.ts",
    // The naval branch, engine step II (`pulp_wars-5ti.3`): the frozen sea.
    "tests/unit/ruleset-v7-frozen-sea-identity.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-freeze.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-slide.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-turns.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-icebound.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-ground.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-persistence.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-headless.sim.test.ts",
    "tests/unit/ruleset-v7-frozen-sea-interactions.test.ts",
    "tests/unit/ruleset-v7-dinosaur-form-audit.test.ts",
    "tests/unit/ruleset-v7-dinosaur-ai-basics.test.ts",
    "tests/unit/ruleset-v7-dinosaur-ai-basics.sim.test.ts",
    "tests/unit/ruleset-v7-save.test.ts",
    "tests/unit/persistence-v7.test.ts",
    "tests/integration/ruleset7-biome-browser.test.ts",
    "tests/integration/ruleset7-dom-shell.test.ts",
    "tests/integration/ruleset7-landing-dom.test.ts",
    "--maxWorkers=1",
  ],
  // The `all` test tier: the release contract also runs the whole-match
  // simulation files (`*.sim.test.ts`, pulp_wars-bwry).
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PULP_WARS_TEST_TIER: "all" },
  },
);
if (result.status !== 0)
  throw new Error("Current Candy-revision release contract tests failed");
process.stdout.write(
  "ruleset-7 current release PASS: the 7r49 identity (tuning 6: research costs 1 Coin for each technology owned, a reward unit appears beside an occupied center, damage from an unseen attacker is reported to its victim's owner) after the 7r48 identity (tuning 5: the Human Guard has Defense 1 against an attack from two or more tiles, the Human Swordsman at Engineering, Drill removed, Land Grant at 1 Coin a tile, a Blast Mountain spares the unit that sets it) after the 7r47 identity (tuning 2: a ranged unit never advances after a kill, the Human Knight captures settlements) after the 7r46 identity (tuning 1 from the hand playtest: retaliation from the defender's base Defense without fortification or cover; technology cost steps of 1, 2, and 2 per extra city; the Catapult at Attack 3, the Knight at 13 HP, the Marksman at 4 Coins and never advancing; the reward unit once per city, the Monument at +2 population, the level-4 Treasury at 6 Coins, Land Grant at 2 Coins per explored tile and at least 6, one contributor for one Windmill, Sawmill, Forge, and Market; Commerce at 2 Coins per connected city, Breach and the paying Blast Mountain with Explosives, Field Defense that keeps the builder's turn; no tier 3 chest unit before round 15) after the 7r45 identity (no fortification on ice: a Dwarf Hammerer or Steam Mole on an ice tile is never dug in, with the interaction rows of the frozen sea tested one by one) after the 7r44 identity (the naval branch, engine step II, the Ice Folk frozen sea: an Ice Folk tree with no ship, Freeze on Shallow and Deep Water, ice tiles that thaw outside their owner's territory, the slide and the slip, Icebound ships and the crush, Black Ice, and Glacier, the FREEZE command and the WATER_FROZEN, ICE_MELTED, and UNITS_CRUSHED events, with exact public previews and headless Normal water matches with an Ice Folk seat without errors) after the 7r43 identity (the naval branch, engine step I: five Naval technologies in every tree, Seamanship with the Ram and Board, Submersibles with the Submarine, Submerged, Torpedo, and Harbours, the BOARD command and the SHIP_BOARDED event, with exact public previews and headless Normal water matches without errors) after the 7r42 identity (many seats: two to as many players as there are factions on every width that holds them, capitals in domains at least D(w, N) apart and outside the central zone, room and village balance, Continents with two to four landmasses sized by their capitals and Archipelago with one island per seat, nine seat colours, map revision REGIONAL_BIOMES_NAVAL_V4) after the 7r41 identity (the early economy tweak: 3 starting Coins instead of 5, so a first turn has 5 Coins in hand, and tier 3 technology base cost 9 instead of 12, so one-city technology costs read 5, 7, and 9, with the per-city steps unchanged) after the 7r40 identity (village density per map type instead of the fixed village table: settlements per land tile, villages one tile from the edge, lattice packing on Dry Land, Pangea, and Lakes with the wild reserve, the Continents landmass share and equal Archipelago home islands, map revision REGIONAL_BIOMES_NAVAL_V3) after the 7r39 identity (the Martian Grunt at 8 HP, the first step of the balance design's fallback ladder after the coarse matrix put the Martians above 60%) after the 7r38 identity (the Candy faction engine, the eighth faction: Sugar Rush and the Crash, Crumbs and Re-bake with Peppermint Surprise, Splat, Bounce, Frosting and Sugar Toss, Home Sweet Home, and Sugar Frenzy capped at two continuations, with exact public previews, eight factions, and headless Normal matches with a Candy seat without errors) after the 7r37 identity (the Martian and Ice Folk balance round: Beam Down after a Move with a pick-up within two tiles and a passenger that counts as moved, once a turn per unit; the Tractor Beam on the Saucer; the Mothership at 8 Coins with Beam Down and a free Heavy Tractor Beam of reach 2 to 3 pulling up to two tiles once a turn; the Grunt at Attack 2 and 9 HP; Glide only from Snow onto Snow; and Snow cover x 1.25) after the 7r36 identity (map curiosities engine II: the Giant Spider, a neutral-owned Monster placed on boards of 16 and up that attacks the weakest unit that stood next to it or hurt it in a neutral turn after every round, with its neutral registration, immunities, bounty, previews, and the owner-reader classification) after the 7r35 identity (map curiosities engine I: the required Curiosities setup option, placement on its own stream after the Rifts with the option off byte-identical to 7r34, the Fountain of Youth, the Shrine, and the Sunken Wreck) after the 7r34 identity (mission setups: the MISSION map type, the registered mission and its revision, UNKNOWN_MISSION, and forbidden technologies) after the 7r33 identity (Mind Control keeps the unit: a controlled unit keeps its type and abilities under its controller, one per Brain, released to its owner when the Brain is lost) after the 7r32 identity (the Martian ranged units: the Grunt's ray pistol at range 1-2, Attack 1.5 and 3 Coins; the Tripod at range 2 only with Sight 2) after the 7r31 identity (the Dwarf coarse balance: the bomb deals 5, 6 with Dive) after the 7r30 identity (the Steampunk Dwarf faction engine: Tunnels and mounds, the eruption, Bomb Run, clockwork, the twin-shot Gunner, Dig In, Repair and Assemble, Knockback, Plated, the Brass Titan; the off-board burrowed list with its unit-reader classification; offered on the setup screen since the 7r31 fold) with exact public previews and headless Normal matches without errors, after the 7r29 identity (every player plays a different faction; DUPLICATE_FACTION, the headless and test only mirror option) after the 7r28 identity (the Rift: a 1 x 3 crack only flyers stand on, rare in map generation) after the 7r27 identity (the Ice Folk coarse balance: Yeti 9 HP, Defense 1.5) after the 7r26 identity (the Pangea coast ring) after the 7r25 identity (the Martian balance: Colossus Defense 2.5) and the Ice Folk faction engine (Chill and Shatter, Snow, Blizzards, Cold Snap, Deep Winter, Brittle, Glide, Mountain-born, Rockfall, Sweep, Trample, Prowl, the Frost Giant's Cold Aura) with exact public previews and headless Normal matches without errors; the revision-23 sturdiness numbers (Human core land roles, Caveman); the Martian faction engine (Shields, heat rays and Cooling, Pierce, Stride, Flying and self-launch, Beam Down, Mind Control and Thralls, the Tractor Beam) with exact public previews and headless Normal matches without errors; the revision-21 Conqueror, Land Baron, Sea Dog, and Slayer achievements; the revision-20 Triceratops Charge! (run-up, ignored fortification, Push and follow) with exact public previews, the T-Rex cost and hatch time, Nesting's city slot and Wallbreaker, and the full heal of a Promotion and of a growth stage; the revision-19 Dinosaur faction core (registration, roster, capacity slots, Grow, Wild, Acid, Armoured, substitutions, Showcase) and Eggs (LAY_EGG, hatching, Shaman Hatch, Nesting, destruction, capture, Abandon Egg); revision-18 movement and Showcase; the revision-17 Goblin faction core (registration, roster, the starting Goblin, substitutions, Warrens, Gang Up, Plunder, WAAAGH!, Troll regeneration, the Field Defense restriction); revision-16a orthogonal Shallow Water with the 25% Shallow minimum, capital growth floor and CAPITAL_GROWTH, Normal AI growth-first opening; revision-16b 2-tile boats (Patrol Boat and embarked Move 2, DISEMBARK spends one point) and the landing preview; revision-15 three-turn Plague with first-turn spread, Zombie 18 HP; revision-14 Plague, Bitten, unanswered Vampire, Lich Attack 3, village table, and income caps; revision-13 faction registration (Human and Undead rosters), revision-12 rules (free opening research, Fertile Ground mask, Raider Escape), roster, economy, naval, logistics, privacy, persistence, UI, and identity contracts; archived revision-2 corpus preserved\n",
);
