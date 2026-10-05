# Ruleset 7 release validation

**Status:** historical revision-2 evidence; final acceptance passed for
`pulp-wars-poc-7r2`. This evidence is not current for the authoritative
[revision-3 prototype](../product/RULESET_7.md) and must not be relabeled or
refreshed as revision-3 evidence. Runtime candidate
`7831cc95bcba4b5938d414d817744c7e2ee34ca2` is published on `main`, verified on
`origin/main`, deployed successfully to GitHub Pages, and verified through the
actual production URL.

Revision-9 retained features have a separate focused review harness and
historical evidence description in
[RULESET_7_REVISION_9_REVIEW.md](RULESET_7_REVISION_9_REVIEW.md). The harness
requires the exact current runtime identity; archived evidence remains frozen.
The current runtime identity and rules are described by
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md).
This frozen revision-2 record and corpus remain unchanged.

## Current release contract (`pulp-wars-poc-7r40`: Human, Undead, Goblin, Dinosaur, Martian, Ice Folk, Dwarf, and Candy)

The current runtime is `pulp-wars-poc-7r40` (autosave
`pulpWars.save.v7r40.current`; saves and replays of `pulp-wars-poc-7r39`
and earlier are refused, and startup removes their autosave keys). Its eight
factions, Human, Undead, Goblin, Dinosaur, Martian, Ice Folk, Dwarf, and Candy, are
all described by [Ruleset 7: current rules](../product/RULESET_7_CURRENT.md),
into which `pulp_wars-78i.8` folded the
[Dwarf overlay](../product/RULESET_7_DWARVES.md) (engine `pulp_wars-78i.3`
at `7r30`, Normal AI `pulp_wars-78i.4`, UI `pulp_wars-78i.6` with the
production art of `pulp_wars-78i.5`, and the `pulp_wars-78i.7` coarse
balance numbers of `7r31`, the bomb 5 and 6 with Dive), after
`pulp_wars-7g3.8` folded the
[Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md) (engine
`pulp_wars-7g3.3` at `7r24`, Normal AI `pulp_wars-7g3.4`, UI
`pulp_wars-7g3.6` with the production art of `pulp_wars-7g3.5`, and the
`pulp_wars-7g3.7` coarse balance numbers of `7r27`, Yeti 9 HP and Defense
1.5), after `pulp_wars-t6s.7` folded the
[Martian overlay](../product/RULESET_7_MARTIANS.md) (engine
`pulp_wars-t6s.2` at `7r22`, Normal AI `pulp_wars-t6s.3`, UI
`pulp_wars-t6s.4` with the production art of `pulp_wars-t6s.6`, and the
`pulp_wars-t6s.5` coarse balance number of `7r25`, Colossus Defense 2.5),
after `pulp_wars-c87.9` folded the
[revision-19 Dinosaur overlay](../product/RULESET_7_REVISION_19_DINOSAURS.md)
as amended by [revision 20](../product/RULESET_7_REVISION_20.md) (the
Triceratops's Charge! replacing Stampede, the T-Rex cost and hatch time,
Nesting's city slot, Wallbreaker, and the full heal of a Promotion or growth
stage), [revision 21](../product/RULESET_7_REVISION_21_ACHIEVEMENTS.md) (the
Conqueror, Land Baron, Sea Dog, and Slayer achievements), and the
`pulp_wars-0hi.3` numbers of `7r23`
([revision 20 section 6.3](../product/RULESET_7_REVISION_20.md#63-tuning-record):
Human Fighter, Raider, and Marksman 12 HP, Guard 17, Caveman 10), after
`pulp_wars-0ao.9` folded the
[revision-17 Goblin overlay](../product/RULESET_7_REVISION_17_GOBLINS.md)
and `pulp_wars-6gd.2` and `6gd.3` the
[revision-18 overlay](../product/RULESET_7_REVISION_18.md).
`pulp_wars-9s0.2` (`7r26`) gives Pangea a coast ring (no land on the
board's edge ring; the island can be circumnavigated in Shallow Water) and
changes no other map type; `npm run validate:ruleset7-naval-maps` checks
the ring on every size. `pulp_wars-9s0.5` (`7r28`) adds the Rift
([Rift overlay](../product/RULESET_7_RIFT.md)): a 1 x 3 crack only flyers
stand on, placed on 16 x 16 to 25 x 25 generated boards;
`npm run validate:ruleset7-naval-maps` checks every Rift rule on every map
type and size (seeds 0-31), and the Dry Land parity file was re-pinned for
the 60 cells whose board gained a Rift. `pulp_wars-w5j.1` (`7r29`) makes
every player play a different faction
([unique-factions overlay](../product/RULESET_7_UNIQUE_FACTIONS.md)); the
browser smoke launches only distinct factions. `pulp_wars-78i.3` (`7r30`)
registers the seventh faction, the Dwarves, `pulp_wars-78i.7` (`7r31`)
changes only the Dwarf bomb
([Dwarf balance report](RULESET_7_DWARF_BALANCE.md)), `pulp_wars-b5f.2`
(`7r32`) gives the Martian Grunt a ray pistol (range 1–2, Attack 1.5, 3
Coins) and the Tripod range 2 only with Sight 2
([Martian tuning record](../product/RULESET_7_MARTIANS.md#165-tuning-record)),
and `pulp_wars-b5f.3` (`7r33`) makes a mind-controlled unit keep its type
and abilities (one per Brain, a wounded target, released to its owner when
the Brain is lost;
[Mind Control revision](../product/RULESET_7_MIND_CONTROL.md)); matches
without a Martian seat replay their command logs with identical outcomes.
`pulp_wars-68k.2` (`7r34`) adds the `MISSION` setup (authored mission
boards, `UNKNOWN_MISSION`, and mission-forbidden technologies;
[current rules section 2.6](../product/RULESET_7_CURRENT.md#26-mission-setup));
non-mission matches replay byte-identically to `7r33` apart from the
ruleset ID, and its contract test is `tests/unit/ruleset-v7-missions.test.ts`.
`pulp_wars-737.2` (`7r35`) adds map curiosities engine I: the required
setup option `curiosities` (on by default) and the rare Fountain of Youth,
Shrine, and Sunken Wreck
([current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities)).
With the option off a match is the `7r34` match command for command (the
contract test pins `7r34` initial states and headless matches across the
map types and factions), and every parity, balance, and validation tool
passes it off. Its contract test is
`tests/unit/ruleset-v7-curiosities.test.ts`; the placement distribution and
the independent placement checker run with
`npm run validate:ruleset7-curiosity-maps`.
`pulp_wars-737.3` (`7r36`) adds map curiosities engine II: the Giant
Spider, a Monster owned by the reserved neutral owner on boards of 16 and
up, its neutral turn after every round, its immunities and bounty, and the
owner-reader classification
([current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities)).
With the option off a match is the `7r35` match apart from the empty
`monsters` list (the all-Human parity digests and the `7r34` curiosity
pins still hold with it removed); with it on, the Monster's weight changes
which curiosities a board draws. Its contract tests are
`tests/unit/ruleset-v7-monster.test.ts` and
`tests/unit/ruleset-v7-owner-readers.test.ts`, and the curiosity-map
validator checks the Monster's lair rules independently. The other steps of
the curiosities epic changed no identity: the Normal AI (`pulp_wars-737.4`),
the art (`pulp_wars-737.5`), the UI with its smoke probe
(`pulp_wars-737.6`), and the coarse check and fold (`pulp_wars-737.7`),
whose evidence is the
[curiosities check](RULESET_7_CURIOSITIES_CHECK.md): 40 headless Normal
matches, the option on against off on the same boards, and the placement
statistics of the validator.
`pulp_wars-1wy.3` (`7r37`) is the engine step of the Martian and Ice Folk
balance round
([balance design](../product/RULESET_7_BALANCE_MARTIAN_ICE.md)): Beam Down
after a Move with a pick-up within two tiles and a passenger that counts as
moved, the Tractor Beam on the Saucer, the Mothership at 8 Coins with Beam
Down and the free Heavy Tractor Beam, the Grunt at Attack 2 and 9 HP, Glide
only from Snow onto Snow, and Snow cover × 1.25
([current rules sections 20.7](../product/RULESET_7_CURRENT.md#207-beam-down),
[20.10](../product/RULESET_7_CURRENT.md#2010-tractor-beam), and
[21.5](../product/RULESET_7_CURRENT.md#215-snow)). A match without a
Martian or Ice Folk seat is the `7r36` match apart from the two empty
per-turn lists (the all-Human parity digests, the mission pins, and the
Human-against-Undead `7r34` curiosity pin still hold with them removed);
the four pinned matches with a Martian or Ice Folk seat were recomputed.
Its contract test is `tests/unit/ruleset-v7-balance-martian-ice.test.ts`.
Its numbers are the design's proposed ones: the Normal AI step
(`pulp_wars-1wy.4`) is done (no rule or identity change; it moved the
pinned Pangea match with a Martian seat of
`tests/unit/ruleset-v7-curiosities.test.ts`), and the UI step
(`pulp_wars-1wy.5`) and the coarse matrix with the human-style probe
(`pulp_wars-1wy.6`) are still to come.
`pulp_wars-jdb.3` (`7r38`) is the engine step of the
[Candy overlay](../product/RULESET_7_CANDY.md): the eighth faction, with
Sugar Rush and the Crash, Crumbs and Re-bake, Splat, Bounce, Frosting, and
Sugar Toss
([current rules section 23](../product/RULESET_7_CURRENT.md#23-candy-faction-rules)).
A match without a Candy seat is the `7r37` match apart from the four empty
Candy lists and the four neutral combat-preview fields (the all-Human
parity digests, the mission pins, and all five `7r34` curiosity pins still
hold with them removed; no pinned match was recomputed). Its contract tests
are `tests/unit/ruleset-v7-candy-identity.test.ts`, `-numbers`, `-faction`,
`-rush`, `-crumbs`, `-combat`, `-interactions`, `-persistence`, and
`-headless`. The setup offers the Candy with its unit, portrait, city, and
ship art (`pulp_wars-jdb.5`) and
plain command buttons; its Normal AI (`pulp_wars-jdb.4`), its
full UI with a browser smoke probe (`pulp_wars-jdb.6`), and its coarse
balance (`pulp_wars-jdb.7`) are still to come.
`pulp_wars-1wy.6` (`7r39`) is the measurement of the balance round: the
Martian Grunt has 8 HP (was 9), the first step of the design's fallback
ladder
([balance design, section 17](../product/RULESET_7_BALANCE_MARTIAN_ICE.md#17-measurement-and-the-grunt-at-8-hp-pulp_wars-1wy6)).
No shape changed. A match without a Martian seat is the `7r38` match (the
all-Human parity digests, the mission pins, and the curiosity pins without
a Martian seat hold); of the two pinned curiosity matches with a Martian
seat, the Pangea one was recomputed and the Archipelago one did not move.
The Normal AI's threatened-city Grunt bias went from 14 to 15 so that a
threatened city still trains Grunts.
`pulp_wars-ykw.2` (`7r40`) is engine step I of the
[map scale design](../product/RULESET_7_MAP_SCALE.md): the village count
follows a density per map type instead of the fixed table, villages may
stand one tile from the edge, Dry Land, Pangea, and Lakes get a wild
reserve, and the map revision is `REGIONAL_BIOMES_NAVAL_V3`
([current rules, section 2.2](../product/RULESET_7_CURRENT.md#22-settlements-and-treasures)).
No shape changed. Every generated board changed, so every pin on a
generated board or a headless match was recomputed; the Showcase and the
missions did not change (their pins hold). `npm run
validate:ruleset7-map-scale` (`scripts/validate-ruleset7-map-scale.ts`)
generates every map type, size, and seat count on seeds 0-255 and compares
against the `7r39` baseline in
`scripts/ruleset7-map-scale-baseline-7r39.json`.
The Undead, the Goblins, the Dinosaurs, the Martians, the Ice Folk, the
Dwarves, and the Candy are part of the default route: match setup always
offers a
Human/Undead/Goblin/Dinosaur/Martian/Ice Folk/Dwarf/Candy choice for the human and
each AI seat (distinct by default: Human, Undead, Goblin, Dinosaur), and
there is no development flag (`pulp_wars-vkq.16` removed `?undead=1`; the
later factions never had one). Balance evidence is the
[Goblin balance report](RULESET_7_GOBLIN_BALANCE.md), the
[Dinosaur balance report](RULESET_7_DINOSAUR_BALANCE.md), the coarse
[revision-20 balance report](RULESET_7_REVISION_20_BALANCE.md), and the
coarse [Martian](RULESET_7_MARTIAN_BALANCE.md),
[Ice Folk](RULESET_7_ICE_FOLK_BALANCE.md), and
[Dwarf](RULESET_7_DWARF_BALANCE.md) balance reports, and the small
[curiosities check](RULESET_7_CURIOSITIES_CHECK.md); the release does not
rerun their matrices.

- `npm run validate:ruleset7-release`
  (`scripts/validate-ruleset7-current-release.ts`) is the current release
  contract. It checks the `7r40` identity (ruleset ID, autosave key, the
  map revision `REGIONAL_BIOMES_NAVAL_V3`, the
  eight-entry
  `ORIGINAL`/`UNDEAD`/`GOBLIN`/`DINOSAUR`/`MARTIAN`/`ICE_FOLK`/`DWARF`/`CANDY`
  faction and tree orders of the engine, and a Human-against-Undead setup), confirms
  that the archived corpus below still carries the revision-2 identity, and
  runs the revision contract tests: the Undead faction, revisions 14–16 and
  18 (with the Showcase), the Goblin faction and Goblin rules suites, the
  Dinosaur faction, rules, Eggs, form-audit, and AI-basics suites, the
  revision-20 rules, Charge!, and Industry suites, the revision-21
  achievement suite, the `7r23` sturdiness suite, the Martian engine suites,
  the Ice Folk engine suites, the Dwarf engine suites (the unit-reader
  classification, identity, faction, Tunnel, bomb, units, interactions,
  persistence, and headless suites), the Candy engine suites (identity,
  numbers, faction, Rush, Crumbs, combat, interactions, persistence, and
  headless), persistence, and the DOM shell and
  landing tests (the Goblin explosion, the other AI, and the
  presentation suites run in `npm run check`). It
  keeps no checked corpus or fingerprint of its own and has no `:refresh`
  variant, so a release has nothing to regenerate there.
- `npm run smoke:browser` runs the default route with no `ruleset` parameter:
  the natural Human match below, the CHIBI art-set probe, an Undead probe
  that finds the per-seat faction selects on the default setup (Human and
  Undead, each disabled in the other's select), picks Undead for the human
  from the keyboard (the opponent moves to Human), plays the Undead-vs-Human
  match to its outcome, and resumes the save on a fresh default-route load
  (against a development server it then resumes a scripted Undead save to
  dispatch Raise Dead and mounts the Plague and Bitten fixture; with
  `--deployed` it stops after launch and resume), a **Goblin probe**, a
  **Dinosaur probe**, a **Martian probe**, an **Ice Folk probe**, a **Dwarf
  probe**, a **Curiosities probe**, and a **Showcase probe**:
  - The **Goblin probe** (`pulp_wars-0ao.5`, `0ao.7`) checks that every
    seat's select offers exactly Human, Undead, Goblin, Dinosaur, Martian,
    Ice Folk, and Dwarf, picks
    Goblin for seat 0 from the keyboard, launches a Goblin-vs-Undead match
    from the production setup, selects the starting Goblin on its capital
    from the keyboard, checks the Kaboom! button's accessible name (its
    tooltip sentence with the Kaboom damage read from the page's public unit
    stats, not a literal, and the hit count), arms it and checks the dock
    summary ("Hits N units: …"; the turn-1 blast usually hits nobody),
    confirms, checks the "Your Goblin blew up" announcement and the unit
    count, and resumes the save with its Goblin seat on a fresh
    default-route load.
  - The **Dinosaur probe** (`pulp_wars-c87.4`, `0hi.2`) checks the same
    seven faction options, launches a Showcase with a Dinosaur human seat
    against Undead, Goblin, and Human seats from the production setup,
    selects the
    Triceratops from the keyboard, checks its Charge! unit info (and that
    no Stampede control, lane, or legend exists), moves it two tiles next to
    the neighbouring strip's Captain, checks the "Charge! +N Attack" status
    and the "Charge +N" attack preview, and attacks; then selects North,
    checks the "N/M slots" capacity line, lays a Raptor Egg through its Lay
    Egg card on a nest tile picked on the board, ends the turn, checks that
    the Egg hatched into a Raptor, and resumes the save with its Dinosaur
    seat on a fresh default-route load.
  - The **Martian probe** (`pulp_wars-t6s.4`) checks the same seven faction
    options, launches a Showcase with a Martian human seat against Undead,
    Goblin, and Dinosaur seats from the production setup, selects a ray
    unit from the
    keyboard, checks its "Full power" status and an attack preview that
    names the full-power ray and "Leaves it Cooling next turn", fires (the
    shooter is then Cooling), selects the Saucer, beams the capital's Grunt
    down through the Beam Down button with the passenger and tile picked in
    the dock (checking the "Saucer beamed down a" announcement and the
    moved Grunt next to the Saucer), and resumes the save with its
    Martian seat on a fresh default-route load.
  - The **Ice Folk probe** (`pulp_wars-7g3.6`) checks the same seven
    faction options, launches a Showcase with an Ice Folk human seat
    against Undead, Goblin, and Dinosaur seats from the production setup,
    checks that its strip is under Snow (the view's `snow` flags) and that
    the board cursor on the capital names what Snow does ("Snow: your units
    move at half cost"), selects the Sled from the keyboard and moves it by
    an offered Move into Bolas reach of an enemy, arms its Bolas button,
    checks the "Will be Frozen" or "Will be Frosted" target hint, throws
    (checking the "Sled chilled a" announcement and a sluggish Chill entry
    on the target), and resumes the save with its Ice Folk seat and the
    Chill on a fresh default-route load.
  - The **Dwarf probe** (`pulp_wars-78i.6`) checks the same seven faction
    options, launches a Showcase with a Dwarf human seat against Undead,
    Goblin, and Human seats from the production setup (the human's "D"
    typeahead passes Dinosaur, whose seat takes the freed Human), selects
    the Steam Mole from the keyboard, arms its Tunnel button, checks the
    eruption forecast ("If they stay:") on an offered destination in the
    dock, tunnels there (checking the "Steam Mole tunnelled" announcement
    and the mound in the view's `burrowed` list, with the Mole off the
    board), and resumes the save with its Dwarf seat and the mound on a
    fresh default-route load.
  - The **Showcase probe** (`pulp_wars-6gd.3`) launches the Showcase map
    (16 x 16 only, no seed control), checks the ten own units, three own
    cities, and every technology, ends one turn, and resumes.
  - The **Curiosities probe** (`pulp_wars-737.6`,
    `scripts/browser-smoke-v7-curiosities.ts`) mounts the curiosities UI
    fixture (a 16 x 16 board with the Giant Spider on its lair, a Fountain
    of Youth, a Shrine, and a Sunken Wreck) in the default look and checks
    that the board plans every curiosity and the provoked Spider, that the
    Spider's dock says "Neutral", that a Fighter stepping onto the Shrine
    claims it and is Promoted, and that End Turn plays the neutral turn
    (the Spider attacks the Fighter beside it) and the Fountain heals the
    unit standing on it. It needs the development server's fixture, so
    with `--deployed` it is skipped and reported as such.

  The Goblin, Dinosaur, Martian, Ice Folk, Dwarf, and Showcase probes use
  no fixture, so they run unchanged with
  `--deployed`. They do not play their matches to an outcome: complete
  Goblin, Dinosaur, Martian, Ice Folk, and Dwarf matches (every pairing of
  the seven factions, and four-seat mixes; the Martian, Ice Folk, and Dwarf
  pairings on Dry Land) were played headlessly by the balance matrices, and
  `npm run check` runs bounded headless Goblin, Dinosaur, Martian, Ice
  Folk, and Dwarf matches and replays. Mind Control and the Tractor Beam
  are covered by the engine, AI, and UI tests and the
  `review:ruleset7-martian-ui` captures, Cold Snap, Shatter, Sweep, and a
  Frozen unit refused an attack after moving by the engine, AI, and UI
  tests and the `review:ruleset7-ice-folk-ui` captures, and the rider, the
  surfacing and its eruption, the bombing run, Assemble, Repair, Dig In,
  and Knockback by the engine, AI, and UI tests and the
  `review:ruleset7-dwarf-ui` captures, not by the smoke. Complete matches
  with curiosities were played headlessly by the
  [curiosities check](RULESET_7_CURIOSITIES_CHECK.md), and the Spider's
  panel, the provoke warning, the attack preview, Help, and the Gallery
  tab are covered by the UI tests and the `review:ruleset7-curiosities-ui`
  captures.

- `npm run validate:ruleset7-curiosity-maps`
  (`scripts/validate-ruleset7-curiosity-maps.ts`, `pulp_wars-737.2`,
  `737.3`) generates seeds 0–31 of every generated map type, size, and AI
  count (1,920 boards, about seven minutes) and checks that the option off
  reproduces the generator before the curiosities, that the option on
  changes no tile or other generated fact, that every placed curiosity and
  lair obeys the placement rules by a checker independent of the engine,
  and that the same setup gives the same curiosities; it prints the count
  per map type and size and the kind totals. It keeps no checked corpus;
  the totals of the current identity are in the
  [curiosities check](RULESET_7_CURIOSITIES_CHECK.md#placement).

- `npm run art:chibi-goblin-review` (`scripts/art/chibi-goblin-review.ts`,
  `pulp_wars-0ao.8`, `3tq.9`), `npm run art:chibi-dinosaur-review`
  (`scripts/art/chibi-dinosaur-review.ts`, `pulp_wars-c87.7`, `3tq.13`),
  `npm run art:chibi-martian-direction-review`
  (`scripts/art/chibi-martian-direction-review.ts`, `pulp_wars-t6s.6`),
  `npm run art:chibi-ice-folk-direction-review`
  (`scripts/art/chibi-ice-folk-direction-review.ts`, `pulp_wars-7g3.5`), and
  `npm run art:chibi-dwarf-direction-review`
  (`scripts/art/chibi-dwarf-direction-review.ts`, `pulp_wars-78i.5`)
  recheck the PixelLab Goblin, Dinosaur, Martian, Ice Folk, and Dwarf unit
  sprites, portraits, cities, and (for the Dinosaurs) the Egg and command
  icons (for the Martians the icons, effects, palette, and readability; for
  the Ice Folk also the Snow overlay tiles, the Chill markers, and the
  Shatter frames; for the Dwarves also the 32 px lineup, the mounds, the
  Dig In earthwork, the eruption frames, and the Dwarf fleet), and rewrite
  the review evidence under `art/pixellab/reviews/chibi-batch-goblin/`,
  `art/pixellab/reviews/chibi-batch-dinosaur/`,
  `art/pixellab/reviews/chibi-batch-direction-martian/`,
  `art/pixellab/reviews/chibi-batch-direction-ice-folk/`, and
  `art/pixellab/reviews/chibi-batch-direction-dwarf/`; inspect it with the
  other art reviews. `npm run art:curiosities-review`
  (`scripts/art/curiosities-review.ts`, `pulp_wars-737.5`) does the same
  for the Giant Spider, its lair web, the Fountain, the Shrine, the Wreck,
  and their icons and effects, under
  `art/pixellab/reviews/chibi-batch-curiosities/`.
- **Gate order.** Run `npm run check` **before** the art review commands,
  then restore the checked-in review evidence with `git checkout -- art/`
  after them: on macOS Chrome the reviews rewrite tracked review evidence,
  which breaks the deterministic-evidence test (`board-renderer-v6`) if
  `npm run check` runs afterwards. Never commit the rewritten evidence as
  part of a release.
- The revision-2 sections below, `RULESET_7_RELEASE_CORPUS.json`, and the
  archived browser evidence in `art/integration/reviews/ruleset7-preview/`
  (whose `evidence.json` records `pulp-wars-poc-7r2` and a runtime
  fingerprint bound into that corpus) are frozen history. They are not
  refreshed for later revisions; in particular
  `npm run smoke:browser -- --archive-evidence` is not a current release step,
  because it would overwrite that revision-2 evidence with current
  (`7r37`) captures. The revision-2 validator described below as
  `validate:ruleset7-release` is now `npm run validate:ruleset7-archive-r2`,
  and its `:refresh` variant no longer exists.

The current release gates, in the order they are run from the reviewed
release revision (the `cross-cutting/release` profile plus the Ruleset 7,
Goblin, Dinosaur, Martian, Ice Folk, Dwarf, and map-curiosity additions).
`npm run check`
runs
before the art
reviews, and `git checkout -- art/` restores the evidence they rewrite
before the browser smokes (see the gate-order note above):

```bash
npm run validate:ruleset7-release
npm run validate:ruleset7-curiosity-maps
npm run validate:ruleset6-release
npm run check
npm run art:validate
npm run art:ruleset6-terrain-review
npm run art:ruleset6-building-road-review
npm run art:ruleset6-original-unit-review
npm run art:ruleset6-candy-unit-review
npm run art:ruleset6-tech-economy-ui-review
npm run art:ruleset6-renderer-review
npm run art:ruleset6-host-review
npm run art:ruleset6-combat-review
npm run art:ruleset6-shell-review
npm run art:ruleset7-original-unit-review
npm run art:ruleset7-catapult-review
npm run art:ruleset7-building-economy-review
npm run art:ruleset7-tactical-ui-review
npm run art:ruleset7-farm-review
npm run art:chibi-goblin-review
npm run art:chibi-dinosaur-review
npm run art:chibi-martian-direction-review
npm run art:chibi-ice-folk-direction-review
npm run art:chibi-dwarf-direction-review
npm run art:curiosities-review
git checkout -- art/
npm run smoke:browser
npm run smoke:browser:legacy-v5
npm audit --audit-level=high
git diff --check
```

The results of a release run are recorded on its bead
(`pulp_wars-0ao.9` for revision 17, `pulp_wars-c87.9` for the four-faction
`7r23` fold, `pulp_wars-t6s.7` for the five-faction `7r25` fold,
`pulp_wars-7g3.8` for the six-faction `7r30` fold, `pulp_wars-78i.8` for
the seven-faction `7r31` fold, `pulp_wars-737.7` for the map-curiosities
fold, no identity change), not in this document;
the
[final release gates](#final-release-gates) and
[root verification status](#root-verification-status) below are the frozen
revision-2 record.

The revision-16 contract (`pulp-wars-poc-7r16`, Human and Undead), the
revision-17 and revision-18 three-faction contracts, the four-faction
`7r23` contract, the five-faction `7r25`–`7r29` contract, and the
six-faction `7r30` contract are superseded by this one; their validator and smoke were extended in place, not kept as
separate commands.

For that revision-2 release, Ruleset 7 was the normal browser default and the
supported Original-faction game. Exact `?ruleset=7` selected the same contract.
Frozen Ruleset 6 remains a
discoverable compatibility game at exact `?ruleset=6`, including Candy setup
and its historical save. Development-only `?legacy-v5=1` remains available to
the retained legacy smoke.

The machine-readable deterministic record is
[RULESET_7_RELEASE_CORPUS.json](RULESET_7_RELEASE_CORPUS.json). The frozen
[Ruleset 6 corpus](RULESET_6_RELEASE_CORPUS.json) is an input whose bytes and
hash are verified; the Ruleset 7 workflow never refreshes or relabels it.

## Reproducible deterministic evidence

Run:

```bash
npm run validate:ruleset7-release
```

The command regenerates 24 legal board-size, AI-count, and relationship-mode
map cases. Every case is generated twice, and the board, treasures, and
post-generation PRNG state are compared with the frozen v6 generator. It then
executes the named deterministic fixture tests recorded in the corpus. A
coverage entry counts only when its exact test title passed in that invocation;
the validator rejects missing execution, stale inventory, duplicate evidence,
dirty artifact hashes, partial browser evidence, and a partial or stale Normal
matrix. The natural browser report also carries a fingerprint of its production
route, controller, persistence, renderer, UI, art registry, and smoke contract,
so an earlier successful capture is rejected after any of those inputs change.

The inventory mapping accounts for all 25 technologies, 13 roles, 13
improvements, and eight rewards. These records deliberately distinguish
contracts from participation: the technology fixture accepts all 25 research
commands, role records prove each immutable role contract while separate
mechanic fixtures exercise its behavior, and reward records say whether a
choice was offered, accepted, or evaluated by the production policy. No
positive counter is fabricated from an identifier list. Masonry's future
wildcard extension is reserved only; the exact 13-role fixture proves that no
wildcard role is implemented.

The behavior mapping covers the required revision-2 schemas and identities,
economy and repair package, every-level rewards, achievements and Monuments,
combat and lifecycle, Pursuit, Defection, Concealment, Blackout, persistence,
compatibility, public AI boundary, and production asset registration. Telemetry
fixtures start from real accepted transition sequences. They verify the
zero-filled inventory shape and separately verify restoration/rebuild, Coin,
Catapult recovery, Pursuit, and Blackout/exposure accounting. Source inventory
alone is not behavioral or telemetry evidence.

`npm run validate:ruleset7-release:refresh` deliberately replaces only the new
Ruleset 7 deterministic corpus after review. It is not a routine gate and does
not run or rewrite the Normal matrix. The matrix must first be generated from
the current runtime with:

```bash
npx tsx scripts/validate-ruleset-v7-normal-ai-matrix.ts --ai-counts 1,2,3 --modes rival,cooperative --repeats 2 --output docs/validation/RULESET_7_NORMAL_AI_MATRIX.json
```

The matrix is six all-AI cells: one, two, and three Normal AI opponents in both
Rival and Cooperative mode, with two exact repeats. Release requires an actual
outcome, equal repeat hashes, and zero errors, rejected commands, mandatory-work
overflows, stalls, hidden-information violations, allied hostile actions,
allied-territory path steps, command-cap hits, and round-cap hits. Repeat hashes
show deterministic clone execution. Separate equal-public-view tests prove
hidden-authority observation equivalence; the matrix does not claim to measure
that by itself.

## Browser and reviewed visual evidence

All three smoke harnesses use isolated temporary output by default. See
[browser evidence output](BROWSER_EVIDENCE_OUTPUT.md) for explicit output paths,
guarded archive publication, and preservation of existing local evidence.

`npm run smoke:browser` opens the normal production entry with no `ruleset`
parameter. It launches a real one-AI Original match, uses only public controller
snapshots and actual offered DOM controls, and lets the shipped Normal AI play
all non-human commands while the human harness chooses offered rewards and ends
turns. The match must reach a real Victory or Defeat under the production
scheduler. The same run checks keyboard/pointer/touch input, Fast Forward,
autosave, restart, resume, delete, the separate r2/r1/v6 storage keys, explicit
Ruleset 6 Original/Candy discovery, and unsupported-route storage isolation.

Routine local runs enforce these functional checks, including cooperative AI
yielding and a real outcome, and report callback timings separately. Every run
writes `timing.json` to its printed evidence directory with the browser version,
CPU/OS, load average, production callback maximum, cold-policy measurements
(development mode only), and `PASS` or `EXCEEDED` against the unchanged 40 ms
callback budget. Invalid or missing measurements still fail. `EXCEEDED` prints
a warning and does not establish performance acceptance, even when all functional
checks pass.

Reference performance and release acceptance require strict mode:

```bash
npm run smoke:browser -- --performance
npm run smoke:browser -- http://localhost:6175/pulp_wars/ --deployed --performance
```

`--archive-evidence` also always enables strict mode. Both strict modes fail if
either measured callback maximum exceeds 40 ms; timing evidence is written before
that failure, and release `PASS` evidence is not written. A built-bundle probe
does not load the development-only cold-policy fixture and reports that
measurement as absent. Ordinary functional smoke is not a replacement for these
strict reference checks.

This separation follows the recorded-machine performance budgets in
[Client Architecture](../architecture/CLIENT_ARCHITECTURE.md#12-performance-and-size-budgets)
and the host-dependent timing guidance in
[Public Planning](../architecture/PUBLIC_PLANNING_V7.md). The September 2026
investigation recorded development callbacks of 61.7/67.5 ms and a local built
callback of 30.0 ms on the previous host. On an Intel i5-7360U Mac with Chrome
153, later development and built observations were 43.2 ms and 121.8/79.2 ms.
All reached the correct initial human boundary; those over-budget observations
remain performance failures. They do not establish a development-server-only
cause. The measured production callback also includes projection, command
application and DOM notification, so it is not isolated policy compute time.

This is automated playability evidence, not human playtesting or a claim about
subjective balance. The Normal matrix and deterministic fixtures support
analytical correctness and balance telemetry; neither substitutes for future
human playtesting. The checked tactical browser captures are also explicitly
labeled as strict engine-applied synthetic fixtures, not natural matches.

After deployment, a bounded production-bundle probe can be run without source
or test-module imports:

```bash
npx tsx scripts/browser-smoke-v7.ts --deployed 'https://nadbordrozd.github.io/pulp_wars/?browser-smoke=1'
```

It verifies default-v7 launch, a real AI return, a human End Turn and second AI
return, DOM Main menu/resume at an unchanged accepted command/hash boundary,
reload/resume, route-owned restart/delete, explicit-v6 Candy discovery, and
unsupported-route isolation. The debug bundle is accessed only through its
explicit spoiler acknowledgement API.

Production asset acceptance is independently rechecked by `art:validate`, the
five Ruleset 7 art review commands, and the inherited nine Ruleset 6 review
commands. The release corpus binds the five v7 PixelLab review manifests plus
the core, tactical, natural-match, natural/synthetic Farm, and UI-polish browser
evidence groups to their checked files. Farm evidence covers the accepted
single, horizontal-pair, and vertical-pair rasters, deterministic same-city
pairing, fog/ownership/removal boundaries, and production pointer selection.
The UI-polish evidence covers single physical city contours, grouped bounded
desktop docks, unique Technology headings, compact reflow, and route-owned Main
menu/resume at an accepted authoritative boundary.

## Final release gates

Run from the reviewed release revision:

```bash
npm run validate:ruleset7-release
npm run validate:ruleset6-release
npm run art:validate
npm run art:ruleset6-terrain-review
npm run art:ruleset6-building-road-review
npm run art:ruleset6-original-unit-review
npm run art:ruleset6-candy-unit-review
npm run art:ruleset6-tech-economy-ui-review
npm run art:ruleset6-renderer-review
npm run art:ruleset6-host-review
npm run art:ruleset6-combat-review
npm run art:ruleset6-shell-review
npm run art:ruleset7-original-unit-review
npm run art:ruleset7-catapult-review
npm run art:ruleset7-building-economy-review
npm run art:ruleset7-tactical-ui-review
npm run art:ruleset7-farm-review
npm run smoke:browser -- --performance
npm run smoke:browser:ruleset6
npm run smoke:browser:legacy-v5
npx tsx scripts/browser-core-ui-review-v7.ts
npx tsx scripts/browser-tactical-ui-review-v7.ts
npx tsx scripts/browser-farm-review-v7.ts
npm run review:ruleset7-ui-polish
npm run check
npm audit --audit-level=high
git diff --check
```

The browser default, compatibility routes, all three save keys, Normal matrix,
fixture corpus, visual evidence, and production build pass or fail together.
There is no Ruleset 7 release fallback to Ruleset 6 and no silent Candy
adaptation.

## Root verification status

The following checks passed at the current reviewed source revision:

- `npm run check`: formatting, lint, strict TypeScript checks, 1,375 tests in
  126 files, production build, and golden replay;
- `art:validate`, all nine Ruleset 6 art reviews, and all five Ruleset 7 art
  reviews;
- default Ruleset 7 natural browser smoke: a real Defeat in round 18 after 161
  commands, three initial production AI commands over nine scheduled slices,
  maximum accepted-callback time 34.5 ms against the 40 ms limit, and a cold
  command-1100 result of 873 callbacks, 1,482 host ticks, 12.3 ms maximum
  callback time, and 13,262.7 ms total;
- full Ruleset 6 Original/Candy browser smoke, including the AI-first launch;
- quiet legacy v5 browser smoke with 1-AI, 2-AI, and 3-AI outcomes after 378,
  669, and 1,306 commands respectively;
- Ruleset 7 core, tactical, Farm, and UI-polish browser reviews;
- frozen Ruleset 6 corpus validation: 24 maps, 50 fixtures, 12 evidence
  manifests, with corpus SHA-256
  `70a3074be0ac565c7bd5c25a5733796ca7ff262fe8c5931b70bc3d41a90ff77e`;
- `npm audit --audit-level=high` with zero vulnerabilities after updating Sharp
  to 0.35.4 and Vitest to 4.1.11.

The fresh Normal matrix passed all six cells with two exact repeats, equal
repeat hashes, and zero diagnostics. Its runtime fingerprint is
`52b0d0d0b63692b9f49a0d01ca0043d4463fb05051508bb6bb73410d214b5c1e`.

| Mode        | Normal AI count | Rounds | Accepted commands |
| ----------- | --------------: | -----: | ----------------: |
| Rival       |               1 |     53 |               971 |
| Rival       |               2 |     18 |               319 |
| Rival       |               3 |     40 |             1,334 |
| Cooperative |               1 |     53 |               971 |
| Cooperative |               2 |     19 |               352 |
| Cooperative |               3 |     31 |               993 |

The approved initial Ruleset 7 corpus refresh and subsequent ordinary
`npm run validate:ruleset7-release` both passed with 24 repeated v6-parity
maps, 74 executed deterministic fixtures, ten reviewed evidence groups, a
fresh six-cell matrix, and exact inventory coverage for 25 technologies, 13
roles, 13 improvements, and eight rewards.

The corrected bounded `--deployed` path also passed against the built
production distribution served locally under `/pulp_wars/`: three initial AI
commands over 14 scheduled slices with a 38.6 ms maximum callback, followed by
the real second AI return, DOM Main menu/resume command-and-hash equality,
restart, reload, delete, and compatibility routing. This validates the built
probe path independently of the subsequent actual Pages verification.

Timing results are run-specific acceptance observations, not universal
performance guarantees. Earlier development-host attempts recorded 45.3 ms
and 41.4 ms callbacks; those failures remain in the Beads validation history
and are not relabeled as passes.

GitHub Pages workflow
[34377218485](https://github.com/nadbordrozd/pulp_wars/actions/runs/34377218485)
completed Build and Deploy successfully at `2026-09-09T16:33:19Z`. The actual
deployed verification command was:

```bash
npx tsx scripts/browser-smoke-v7.ts --deployed 'https://nadbordrozd.github.io/pulp_wars/?browser-smoke=1'
```

It passed in Chrome 153.0.8010.36 with three initial AI commands over 14
scheduled slices and a 39.9 ms maximum callback against the 40 ms limit. The
production-bundle path loaded no source or test modules and passed default-v7
launch, the real second AI return, DOM Main menu to `RESUMABLE` and Resume with
exact command-index/hash preservation, deterministic restart, reload/resume,
route-owned delete, old-v7 and v6 key isolation, exact Ruleset 6 Original/Candy
discovery, and unsupported-route isolation.

All release acceptance and actual deployment checks are therefore complete.
Any subsequent commit containing this final record and tracker closures is
documentation/tracker-only and introduces no runtime changes; no future commit
SHA is asserted here.
