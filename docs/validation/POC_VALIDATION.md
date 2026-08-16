# Pulp Wars POC validation

## Ruleset 5 Candy faction acceptance plan

This is a prospective gate, not a claim that ruleset 5 is implemented. The
authoritative behavior is POC Rules section 0. A Candy implementation is not
accepted until all items below pass on the same reviewed revision.

### Schema, determinism, and compatibility

- Exact setup parsing covers every 2–4-seat Original/Candy array, repeats,
  invalid values, wrong/sparse lengths, extra fields, and fixed all-Original
  Demo. Faction changes alone preserve initial map/PRNG hashes.
- State schema, command/events, replay, and save are version 5. Recognized v1-v4
  saves/replays return incompatible and preserve bytes; no migration or silent
  overwrite occurs. Fresh v5 golden fixtures cover all-Original, all-Candy,
  mixed Rival/Cooperative, and Demo.
- Save/resume/replay at every new command boundary—including a pending tied
  Candify choice—repeats canonical command, ordered-event, checkpoint, and final
  hashes. Malformed target unions, wall IDs, directions, and candidate lists are
  rejected atomically.

### Rules and information safety

- Candy Warrior and Gumball Guard match Original Warrior/Archer mechanics
  exactly; Choco Engineer matches Defender plus Build; Donut has the exact
  cost/HP/defense/unlock but move 1 and no Attack/Escape; Candy Catapult is
  shared mechanically and can Candify.
- Donut fixtures cover every starting edge/corner and cardinal direction,
  terrain/ZOC/wall pass-through, path-only reveal, hidden targets, multiple
  victims, friendly/allied/hostile damage, 10/15/promoted HP boundaries,
  ordered deaths, wall destruction, final self-removal, tallies, and identical
  rejection with no hidden reveal.
- Wall fixtures cover all eight neighbors and every allowed
  terrain/resource/improvement, every forbidden settlement/unit/wall/fog case,
  1-star atomicity, shared entity-ID allocation, movement blocking, unit-free
  economy actions underneath, friendly/allied/hostile combat, rational damage,
  zero defense/retaliation/kill credit, melee advance gate, capture transfer
  independence, owner elimination persistence, and no capacity/ZOC/vision.
- Candify fixtures cover move-then-action, Wait retention, all other activation
  exclusions, neutral and hostile annexation, settlement/friendly/allied
  rejection, unique nearest city, unequal-distance filtering, tied nearest
  mandatory choice, candidate ordering, no cancel/other command, resource/
  improvement/wall preservation, chained connected expansion, disconnect
  rejection, capture of extended territory, and no neighboring reveal.
- `PlayerView`/public-query paired hidden-state tests prove equal views produce
  equal candidates for Roll lines, walls, and Candify and that unexplored/allied
  blockers contain no wall, faction-owned entity, terrain, or territory detail.

### AI, browser, and accessibility

- Repeated headless matrices cover all-Original, all-Candy, and alternating
  mixed factions for 1/2/3 AI in both relationship modes on Auto plus targeted
  Large/Huge cases. Metrics prove all Candy labels train and act, Roll damages a
  hostile, walls build/are attacked/destroyed, both neutral and hostile Candify
  occur, and tied choices resolve without stalls.
- Cooperative corpora assert zero Normal-policy AI-on-AI Roll casualties, wall
  attacks, allied Builds/Candify, ZOC/siege/capture, or new allied exploration;
  focused human-authored tests separately prove legal friendly fire.
- Chromium review at 320, 390 DPR2, 600, 1024, 1440, 200% zoom, keyboard, touch,
  all owner colors, Full/Reduced/Fast motion verifies compact per-seat setup,
  faction-correct training/docks/stats, one-activation Roll/Build targeting,
  mandatory Candify dialog/focus restoration, wall/unit/tile inspection cycle,
  gumball/roll/build/Candify timing, live announcements, and no map resize/dim.

### PixelLab production acceptance

- Checked-in recipes generate Candy Warrior, Gumball Guard, Donut, then Choco
  Engineer on the standard 256 x 296 canvas at `(128,222)`, Chocolate Wall on
  256 x 296 at `(128,222)`, required UI portraits/icons, and a 1024-square Candy
  hero. Candy Catapult reuses accepted art; effects stay code-native.
- The first three Candy units pass individual native/enlarged/on-map review
  before batching. Chocolate Wall passes separately on every compatible
  terrain/resource/improvement. Gumball projectile origin is calibrated inside
  mouth/chute alpha. Contact sheets and individual evidence record dimensions,
  alpha bounds, prompts/settings/seeds/output mapping, scale/anchor, all owner
  colors, grayscale, minimum zoom, occlusion, and rejection/regeneration history.

Minimum closure gates are formatting, lint, all typechecks/tests, production
build, v5 golden replay, focused headless matrices, browser smoke, PixelLab
manifest validation, visual review evidence, documentation links/consistency,
and `git diff --check`.

**Date:** 2026-08-16  
**Result:** Ruleset-4 functional and production presentation audit passed;
Fruit, Forest, Animal, Lumber Mill, Catapult, Forestry, and Mathematics
PixelLab art is accepted and integrated
**Reference machine:** Windows 11 Home 10.0.26100, Intel Core i7-10510U,
15.8 GiB RAM, Chrome 151.0.7922.137

## Baseline delivery gates (before first-play feedback fixes)

The live Windows Vite process held a native Rolldown module, so the clean install
and first full gate ran in an isolated copy without stopping or modifying that
server:

```sh
validation_copy=$(mktemp -d /mnt/c/Windows/Temp/pulp-wars-validation.XXXXXX)
rsync -a --exclude node_modules --exclude dist --exclude .git --exclude .beads ./ "$validation_copy/"
cd "$validation_copy"
npm ci
npm run check
npm run art:validate
```

Results:

- `npm ci`: 180 packages installed, 0 vulnerabilities.
- Formatting, ESLint, and all three strict TypeScript configurations passed.
- Vitest: 20 files, 138 tests passed.
- Production build: 136.68 KiB JS / 41.93 KiB gzip and 14.94 KiB CSS /
  4.35 KiB gzip. This is about 46.28 KiB compressed first-party code, below
  the 500 KiB budget excluding raster art.
- Golden replay passed.
- PixelLab source, generated manifest, hashes, dimensions, alpha contracts, and
  all accepted outputs passed `art:validate`; no generation API was called.

Afterward, a non-destructive `npm install` repaired the live workspace shims
without stopping Vite. npm warned that it could not remove one locked,
hash-suffixed Rolldown staging directory, but completed with 0 vulnerabilities.
The full `npm run check && npm run art:validate` then passed in the workspace as
well. After the browser-budget regression was made load-independent, its 12
focused tests passed five consecutive runs, and the complete 20-file,
138-test `npm run check` passed twice (29.75 s and 29.40 s). `localhost:6173`
returned HTTP 200 before and after repair.

Starting a second isolated `npm run dev` exited with `Port 6173 is already in
use`, proving `--strictPort` refuses silent fallback without terminating the
existing server.

## Deterministic complete-match corpus

The fixed, non-cherry-picked seeds are `0,1,2`. The matrix covers every legal
AI/board-size pair: 1 AI on 11/14/16, 2 AI on 14/16, and 3 AI on 16. Each entry
ran twice with 20,000-command and 500-round safety caps. The repeat compared
the complete command hash, ordered event hash, and final state hash.

The corpus was sharded only to keep Windows process memory/timing isolated:

```sh
for setup in 1:11 1:14 1:16 2:14 2:16 3:16; do
  ai=${setup%%:*}; size=${setup##*:}
  for seed in 0 1 2; do
    npm run validate:poc -- --ai-count "$ai" --size "$size" --seed "$seed" \
      --output "docs/validation/case-${ai}-${size}-${seed}.json"
  done
done
npm run validate:poc:merge -- --input docs/validation \
  --output docs/validation/POC_CORPUS.json
```

All 18 matches (36 deterministic runs) reached `HEADLESS_VICTORY`: 0 command or
round caps, 0 stalls, 0 rejected-policy errors, and 10,470 accepted commands
over 585 rounds. Full command/event/final hashes and per-match participation are
in [POC_CORPUS.json](POC_CORPUS.json).

|  AI | Board | Seed | Winner | Round | Commands | First run ms |
| --: | ----: | ---: | -----: | ----: | -------: | -----------: |
|   1 |    11 |    0 |     P1 |     8 |       46 |          233 |
|   1 |    11 |    1 |     P1 |    19 |      117 |          527 |
|   1 |    11 |    2 |     P2 |    26 |      207 |          976 |
|   1 |    14 |    0 |     P2 |    58 |      973 |        7,740 |
|   1 |    14 |    1 |     P1 |    32 |      392 |        4,925 |
|   1 |    14 |    2 |     P1 |    20 |      138 |          817 |
|   1 |    16 |    0 |     P1 |    33 |      445 |        8,476 |
|   1 |    16 |    1 |     P2 |    10 |       56 |          639 |
|   1 |    16 |    2 |     P2 |    10 |       61 |          713 |
|   2 |    14 |    0 |     P1 |    40 |      704 |       10,343 |
|   2 |    14 |    1 |     P3 |    34 |      547 |       14,021 |
|   2 |    14 |    2 |     P3 |    39 |      762 |       18,730 |
|   2 |    16 |    0 |     P2 |    47 |      918 |       34,179 |
|   2 |    16 |    1 |     P1 |    53 |    1,263 |       34,951 |
|   2 |    16 |    2 |     P2 |    28 |      440 |       11,362 |
|   3 |    16 |    0 |     P3 |    45 |    1,143 |       33,710 |
|   3 |    16 |    1 |     P1 |    49 |    1,481 |       38,624 |
|   3 |    16 |    2 |     P4 |    34 |      777 |       19,507 |

Winner distribution was P1/P2/P3/P4 = 8/6/3/1. The corpus exercised 187 city
captures and 225 reward choices. It trained Warrior/Archer/Defender/Rider
203/216/184/361 times and recorded 1,889/1,591/1,261/2,549 unit commands for
those types. Every technology participated: Climbing 48, Riding 48, Hunting 48,
Organization 44, Mining 36, Archery 32, and Strategy 29 research commands.

### Balance decision

No rules or balance constants changed. Every setup terminated, wins were spread
across seats, and every unit, technology, reward, and capture system
participated. The three-seed corpus is a POC failure detector, not enough data
to claim competitive balance, so tuning from it would be premature.

## Real-browser completion and usability

```sh
npm run smoke:browser -- http://localhost:6173
```

The Chrome run used the real setup/faction/match/result DOM and Canvas surfaces
and the same deterministic Normal policy to automate the human seat. It passed:

| Opponents | Seed | Browser result | Commands | Rounds |
| --------: | ---: | -------------: | -------: | -----: |
|         1 |    1 |        Victory |      117 |     19 |
|         2 |    0 |        Victory |      704 |     40 |
|         3 |    2 |         Defeat |      446 |     26 |

Every flow covered a fixed accepted-command save boundary, full reload to Hub,
Resume, exact state-hash recovery, authoritative reward choices, visible AI
thinking status, Fast Forward, result, read-only final map, Results return,
Play Again at command index zero with the same setup/seed, and exit to Hub for a
clean next conquest.

Browser assertions also covered native semantic buttons/fields, labeled Canvas
and accessible map inspection, polite/assertive live regions, `T` keyboard
access to Technology, modal focus ownership, Escape focus return, minimum
44 CSS px visible buttons, no document horizontal overflow, loaded runtime
images, and a true 390 x 844 CSS px mobile viewport at DPR 2.

Representative evidence:

- [1-AI desktop result](../../art/integration/reviews/result-1ai-desktop.png)
  and [mobile restart](../../art/integration/reviews/restart-1ai-mobile-390-dpr2.png)
- [2-AI desktop final map](../../art/integration/reviews/final-map-2ai-desktop.png)
  and [mobile result](../../art/integration/reviews/result-2ai-mobile-390-dpr2.png)
- [3-AI desktop result](../../art/integration/reviews/result-3ai-desktop.png)
  and [mobile restart](../../art/integration/reviews/restart-3ai-mobile-390-dpr2.png)

Visual inspection found no clipped tall sprites, broken images, horizontal DOM
overflow, or unreachable primary actions. Dense late-game final maps are busy
by design, but depth ordering, health/status marks, city labels, and controls
remain visible. Native/original-scale unit, terrain, building, and UI contact
sheets were also inspected; all 41 wired PixelLab PNGs remain coherent with the
approved chunky illustrated direction.

## Correctness defect found and fixed

The first 2-AI browser run stopped after command 424. The browser controller
carried an AI's per-turn command counter into that same AI's later turn when a
human turn occurred between them, eventually raising the 128-command guard.
The controller now resets the counter on accepted End Turn and reserves the
documented final slots for a pending reward and End Turn, matching headless
behavior. A pure production state transition is exercised across 129 later
turns by the same AI and at the 126/127/128-command boundaries, while a short
controller integration test covers three alternating human/AI cycles. This
keeps the regression deterministic under full-suite load; the full browser and
automated gates pass with the fix.

## Explicit limitations

- The earlier PixelLab resource blocker is resolved. Riding and Archery now use
  accepted production icons; their code-native letters appear only while an
  image loads or if it fails. The first restored-credit Archery attempt remains
  quarantined because ornate grip marks read as text-like clutter at 64 px.
- Browser completion uses deterministic AI policy for repeatability. It proves
  the real interaction/state plumbing but is not a substitute for an external
  human playtest, screen-reader session, or formal WCAG conformance audit.
- Runtime values above are observed wall-clock measurements on the stated
  laptop and include Windows/WSL filesystem/tooling overhead; they are evidence,
  not cross-machine performance goldens.

## First-play feedback regression audit

The first-play feedback repairs received a fresh independent audit after the
baseline validation above. This audit did not change gameplay, balance, or art,
and it made no PixelLab request. It regenerated the established corpus and
Chrome evidence in place. The earlier 20-file/138-test figures are retained as
the historical baseline; the current post-feedback gate is the 21-file/159-test
run below.

### Fresh automated gates

```sh
npm run check
npm run art:validate
git diff --check
npm run validate:poc -- --output docs/validation/POC_CORPUS.json
npm run smoke:browser -- http://localhost:6173
```

Results:

- Formatting, ESLint, all three strict TypeScript configurations, production
  build, and golden replay passed.
- Vitest passed 21 files and 159 tests. The focused feedback coverage includes
  actionless moved/attacked/recovered/captured/exhausted units, every meaningful
  offered unit-command category, exact Capture dispatch, renderer fog leakage,
  human and paced-AI combat presentation, reduced motion, Fast Forward parity,
  and restart/navigation/destroy cancellation.
- Production output was 149.08 KiB JS / 45.53 KiB gzip and 16.05 KiB CSS /
  4.57 KiB gzip, about 50.10 KiB compressed first-party code and below the
  500 KiB budget excluding raster art.
- PixelLab source/manifests, accepted hashes, dimensions, alpha contracts, and
  outputs passed validation without contacting the generation API.
- The regenerated 18-case corpus completed all 36 deterministic runs with
  `HEADLESS_VICTORY`, 0 errors, 0 stalls, 0 command/round caps, 10,470 accepted
  commands, and 585 rounds. Each pair matched complete command, ordered-event,
  and final-state hashes; outcomes, rounds, command counts, and aggregate
  participation remained the established baseline values in
  [POC_CORPUS.json](POC_CORPUS.json).
- The normal browser flow again completed 1/2/3-AI games at 117/704/446
  commands (Victory/Victory/Defeat). It verified exact save/reload boundary
  hashes, rewards, paced AI and Fast Forward, final map, same-seed restart,
  loaded assets, 44 CSS px targets, no horizontal overflow, and no UI deadlock.
- Windows Chrome received HTTP 200 from `http://localhost:6173`. Starting a
  second Vite process failed with `Port 6173 is already in use`, confirming the
  strict-port contract rather than silently selecting another port.

### Focused desktop and mobile review

The following review modes ran against the live localhost build at 1440 x 1000
CSS px and at a true 390 x 844 CSS px mobile viewport with DPR 2:

```sh
npm run art:rendering-review -- http://localhost:6173
npm run smoke:browser -- http://localhost:6173 --capture-review
npm run smoke:browser -- http://localhost:6173 --attack-review
npm run smoke:browser -- http://localhost:6173 --growth-review
```

Every generated screenshot was visually inspected:

- Mountains now meet and cover their ground diamonds instead of floating.
  Accepted source art remains unchanged; runtime registration puts observed
  alpha bottoms at +32 to +37.5 CSS px against the diamond's +37 px bottom.
- Standard-unit visible silhouettes are at most 78.4 x 81.9 CSS px and accepted
  city silhouettes at most 107.4 x 100.8 CSS px at nominal zoom. Their current
  top/side overhang remains intentional and no longer overwhelms adjacent tiles.
- Hidden coordinates contribute only a fog render entry. All fog entries sort
  before revealed ground, mountains, cities, units, selections, and statuses;
  the screenshots show no fog painted across revealed overhangs and tests prove
  no hidden terrain, feature, city, or unit enters the render plan.
- A legal Capture appears as a prominent primary action at desktop and mobile,
  is keyboard/touch accessible, dispatches the exact observation-safe offered
  command, disappears after use, and labels multiple opportunities distinctly.
- `Ready units remain` is absent for units with no offered action, including
  blocked full-health and moved/attacked/recovered/captured/exhausted cases, and
  remains for real Move, Attack, Escape Move, Recover, Promote, and Capture
  opportunities. Affordable training and capture retain their separate warning
  categories.
- Full-motion combat visibly lunges into contact and then shows impact,
  retaliation, damage, and death feedback. Reduced motion uses a stationary
  impact cue. Human and paced-AI attacks commit the same authoritative boundary;
  Fast Forward suppresses queued presentation, and navigation/restart/destroy
  cancellation leaves no timer or input lock behind.
- The then-current city inspection surface showed essential level, population,
  income, capacity, siege, and chosen-reward facts plus only exact commands.
  Its layout evidence was superseded by the map-first selected-city dock review
  recorded below; prerequisite teaching remains in Technology and tile
  inspection.

Representative evidence:

- [renderer desktop](../../art/feedback/reviews/renderer-calibration-desktop.png)
  and [renderer mobile DPR2](../../art/feedback/reviews/renderer-calibration-mobile-390-dpr2.png)
- [Capture desktop](../../art/integration/reviews/feedback-capture-desktop.png)
  and [Capture mobile DPR2](../../art/integration/reviews/feedback-capture-mobile-390-dpr2.png)
- [combat contact](../../art/integration/reviews/feedback-attack-contact-desktop.png),
  [combat impact](../../art/integration/reviews/feedback-attack-impact-desktop.png),
  and [combat impact mobile DPR2](../../art/integration/reviews/feedback-attack-impact-mobile-390-dpr2.png)

### Audit conclusion and remaining limits

No feedback regression was found, so no code or rule correction was made during
this final audit. The two existing art fallbacks and the human/accessibility
testing limitation above remain unchanged. Combat evidence is deterministic and
code-native; it does not add audio or generated animation frames, which were not
part of the requested repair.

## Second-play visual footprint calibration

The second-play visual pass measured the accepted alpha directly and replaced
the shared mountain/building registrations with per-asset runtime geometry. No
accepted PNG, generated record, output hash, ground projection, picking rule,
fog/depth layer, or simulation data changed.

```sh
npm run art:credentials
npm run art:footprint-review
npm run art:rendering-review -- http://localhost:6173
npm run check
npm run art:validate
git diff --check
```

PixelLab reported `PIXELLAB_API_KEY: missing`. The earlier HTTP 402 limitation
therefore could not be re-authenticated or balance-checked, and no generation
request was made. Runtime calibration fully met the footprint contract, so no
candidate or reference-image regeneration was needed.

All bounds below are nominal CSS pixels relative to the owning tile center;
right and bottom are exclusive alpha bounds:

| Asset               | Before bounds              | Calibrated bounds              |
| ------------------- | -------------------------- | ------------------------------ |
| Mountain 1          | `-60.5,-73 .. 60.5,32.5`   | `-50.82,-58.38 .. 50.82,30.24` |
| Mountain 2          | `-60.5,-73 .. 60.5,32.5`   | `-50.82,-58.38 .. 50.82,30.24` |
| Mountain 3          | `-54,-78 .. 53.5,38`       | `-43.2,-62.4 .. 42.8,30.4`     |
| Village             | `-38,-86.5 .. 50.5,7.5`    | `-38,-63.5 .. 50.5,30.5`       |
| City level 1        | `-50.4,-74.7 .. 50.4,11.1` | `-50.4,-55.5 .. 50.4,30.3`     |
| City levels 2 and 3 | `-53.4,-87.6 .. 54,13.2`   | `-53.4,-70.5 .. 54,30.3`       |

Mountain 3's flat source base exceeded the sloped lower diamond edge by up to
10.66 CSS px even after scale/anchor calibration. All mountains now use a
deterministic Canvas clip that stays unbounded above the center and exactly
follows the lower half of the owning 128 x 74 diamond below it, reducing that
foreground overflow to zero. Mountains 1/2 naturally fit the same boundary,
and the shared clip guards their contract against later registration drift.

The repeated fixture includes every mountain variant, a village, and city
levels 1–3. Both new captures were visually inspected: peaks retain readable
top overhang without dominating adjacent cells, no mountain base paints into a
foreground tile, settlements fill their diamonds without added scale/overlap,
and fog/depth ordering remains coherent.

- [1440 x 1000 desktop](../../art/feedback/reviews/second-calibration-desktop.png)
- [390 x 844 mobile at DPR 2](../../art/feedback/reviews/second-calibration-mobile-390-dpr2.png)

The full gate passed 21 files / 160 tests, strict formatting, lint, all three
TypeScript configurations, production build, and golden replay. The production
bundle was 149.83 KiB JS / 45.72 KiB gzip plus 16.05 KiB CSS / 4.57 KiB gzip.
`art:validate`, the independent alpha measurement contract, and
`git diff --check` passed; accepted asset hashes remain valid.

## Ruleset 2 fruit and explicit-ore validation

This section supersedes the earlier first-play statement that Mines were the
only population source. Ruleset `pulp-wars-poc-2` adds Organization fruit while
retaining explicit-ore Mines. Game state, command envelopes, events, saves, and
replays are version 2; settings intentionally remain version 1.

The focused transactional suite verifies `HARVEST_FRUIT` at 2 stars for +1
population with no unit or occupancy requirement, resource consumption, no PRNG
movement, atomic rejection, ascending level events, and the documented stable
error order. It also verifies that both fruit and Mine return
`CITY_AT_MAX_LEVEL` before affordability, ordinary mountains are never mineable,
public command queries do not leak hidden resources, and Normal AI can choose
fruit using only `PlayerView`.

Six supported setup combinations were each exercised across 1,000 seeds. All
6,000 maps repeated deterministically and preserved connectivity, the exact
global 18% mountain target, no resource outside a settlement territory, and
this exact nine-tile territory recipe: one empty grass settlement center, two
ore mountains, one ordinary mountain, two fruit grass, and three empty grass.

The regenerated ruleset-2 corpus completed 18 matches / 36 paired deterministic
runs with 9,701 accepted commands, 519 rounds, zero errors, and zero stalls. It
recorded 212 fruit harvests and 231 Mines, as well as participation by every
unit and technology. The generated
[POC_CORPUS.json](POC_CORPUS.json) is schema 2 and has SHA-256
`1043f0ff3d67b699082eb1fb8b30a486f78b931219cf6302a84ed029d5ab4f61`;
its `generatedAt` and runtime fields make the whole-file hash evidence for this
run rather than a cross-machine golden.

The intentional golden is now
`two-player-seeded-map-fruit-five-commands-v2`: five accepted commands include
Organization and fruit at `(7,1)`, emit 18 ordered events, and finish at canonical
state hash `29fde725e2649fd43c4ed119151646a2dd202447868481f74ee4188ebe0e4c6`.
Explicit legacy fixtures prove that save v1 returns `INCOMPATIBLE` and replay v1
returns `INCOMPATIBLE_REPLAY`; loading either preserves its original stored
bytes and never silently migrates or overwrites them.

The live Chrome gates passed full 1/2/3-AI games at 271/578/225 commands
(Victory/Defeat/Defeat), the locked/affordable/reward-pending growth review, and
the mixed-resource review at 1440 x 1000 and a true 390 x 844 DPR2 viewport.
Both mixed-resource captures were visually inspected after correcting the Mine
depth tie: fruit, gold-tipped ore, ordinary mountains, and the completed
pickaxe/cart Mine remain distinct, with no modal covering the board.

- [mixed resources desktop](../../art/integration/reviews/resources-v2-desktop.png)
- [mixed resources mobile DPR2](../../art/integration/reviews/resources-v2-mobile-390-dpr2.png)

The final gate passed 22 files / 173 tests, formatting, lint, all three
TypeScript configurations, production build, and golden replay. The production
bundle is 156.75 kB JS / 46.96 kB gzip plus 16.94 kB CSS / 4.73 kB gzip, and
`art:validate` passes without contacting PixelLab or changing an accepted PNG.
Because `PIXELLAB_API_KEY` is known missing, the fruit world marker is a clearly
isolated deterministic Canvas placeholder. A separate production-art follow-up
must generate, inspect, accept, and register the final PixelLab fruit asset.

## Explicit Huge 25 x 25 validation

Huge is an explicit-only v2 board: Auto remains 11/14/16. The targeted validator
keeps the existing 6,000-seed normal-suite corpus unchanged and adds 1,000 seeds
for each Huge AI count. Every Huge seed is generated twice and compared as
canonical JSON and SHA-256, while both results retain the same serialized PRNG
ordering and 256-attempt ceiling.

```sh
npm run validate:huge -- --output docs/validation/HUGE_25_VALIDATION.json
```

On the reference machine, all 3,000 seeds / 6,000 deterministic generation runs
passed with exactly 30 settlements, 113 mountains, 2 ore + 1 ordinary mountain

- 2 fruit + 3 empty grass around every empty settlement center, no outside
  resources, valid spacing/connectivity/capital separation, and no generation
  failure. Each AI-count corpus had average and maximum attempt 1. The targeted
  generation phase completed in 157.842 seconds, within its documented 240-second
  reference budget:

|  AI | Neutral villages | Paired runs | Runtime ms | Corpus hash                                                        |
| --: | ---------------: | ----------: | ---------: | ------------------------------------------------------------------ |
|   1 |               28 |       2,000 |     68,374 | `2ecc9ad6a9dfdc897c633f0db7308cef25f3d67f556e1c4fc28fc2921b8f36bb` |
|   2 |               27 |       2,000 |     42,454 | `90567d3caf059f5f3fcdaa740a4270239a13b881332122c451c27d079b210952` |
|   3 |               26 |       2,000 |     47,014 | `a78bb3437b0c1a513f547d8a55894e1ba82435f0571be31f0931f1ba4de1b3b7` |

Fixed seed `0` then completed under the 20,000-command and 500-round hard safety
caps for every AI count, with zero errors, stalls, command caps, or round caps:

|  AI | Winner | Round | Commands | Runtime ms | Final hash                                                         |
| --: | -----: | ----: | -------: | ---------: | ------------------------------------------------------------------ |
|   1 |     P2 |    41 |    1,885 |     77,742 | `5cc54f26889ec02cb2e56a424b0322fa00fe6b49b4a6ae188b263b63a38c83a0` |
|   2 |     P2 |    57 |    3,581 |    138,624 | `45bc91c26d98f2266de8e7b22e8a3309ae17b3d39bd4b181da8285ec910b60bc` |
|   3 |     P3 |    93 |    7,525 |    279,252 | `9638f62b913497b7a9fcaf145f04bdb24ff6b8257037fe38f4490e01048d16a7` |

The complete machine-readable report includes command and event hashes and has
SHA-256 `8d39e40afed034a2c2e552f12e3743da6cafc2d37b2502c533fa89c791c31f56`:
[HUGE_25_VALIDATION.json](HUGE_25_VALIDATION.json).

Chrome 151.0.7922.137 exercised explicit setup, initial human-capital centering,
pointer pan plus wheel zoom, and exact save/reload/resume at 1440 x 1000 and a
true 390 x 844 CSS-pixel viewport at DPR 2. The initial capital anchors were
`(720, 478.268)` in a `1440 x 869.578` Canvas and `(195, 312.549)` in a
`390 x 538.141` Canvas. Interaction moved the anchor vertically by 51.058 and
45.621 CSS pixels respectively; the centered tall sprites remained unclipped.
Resume recovered command index 5 at canonical state hash
`10d0b9c1523ef21e3396892d37913f093764dd1c45bfefb1b804dd948f7d2aa5`.
All eight screenshots were visually inspected for target reachability,
horizontal overflow, center usefulness, map readability, edge overhang, and
desktop/mobile parity:

- [setup desktop](../../art/integration/reviews/huge-setup-desktop.png) and
  [setup mobile DPR2](../../art/integration/reviews/huge-setup-mobile-390x844-dpr2.png)
- [initial desktop](../../art/integration/reviews/huge-initial-capital-desktop.png)
  and [initial mobile DPR2](../../art/integration/reviews/huge-initial-capital-mobile-390x844-dpr2.png)
- [interaction desktop](../../art/integration/reviews/huge-interaction-desktop.png)
  and [interaction mobile DPR2](../../art/integration/reviews/huge-interaction-mobile-390x844-dpr2.png)
- [save/resume desktop](../../art/integration/reviews/huge-save-resume-desktop.png)
  and [save/resume mobile DPR2](../../art/integration/reviews/huge-save-resume-mobile-390x844-dpr2.png)

The final Huge gate passed formatting, ESLint, all three strict TypeScript
configurations, 22 Vitest files / 189 tests, production build, and the unchanged
golden replay in 34.42 seconds. The production bundle is 158.59 kB JS / 47.62
kB gzip plus 23.19 kB CSS / 5.91 kB gzip. `art:validate`, documentation
formatting, the explicit Huge headless match and batch CLI paths, the dedicated
Huge Chrome review, the full 1/2/3-AI browser smoke, and `git diff --check` all
passed. No accepted PixelLab raster or art manifest changed.

## Second-play final validation audit

The final audit reran the complete second-feedback surface on 2026-08-15. A
clean `npm ci` in an isolated Windows temporary copy installed 180 packages with
zero vulnerabilities; its full `npm run check`, `art:validate`, and documentation
formatting gates passed. The repaired live worktree then passed the same gates,
the footprint validator, all headless corpora, and Chrome 151.0.7922.137 review.
The post-fix gate passed 22 files / 189 tests plus the golden replay; its
production bundle is 158.59 kB JS / 47.62 kB gzip and 23.16 kB CSS / 5.90 kB
gzip.

The v2 deterministic corpus completed 18 matches / 36 paired runs, 519 rounds,
and 9,701 commands with no error, stall, or hash mismatch in 106,455 ms. Ignoring
only `generatedAt` and runtime metadata, its SHA-256 remained exactly
`6aa91e27bcf507ccf58e24ba86346a9ac76517d44d85cfbd7db09650f8f1c025`.
The fresh complete report has SHA-256
`dc931d7685950e8aba5b1c562ae3698ddee7aabd276bb18704789e58487e6428`:
[POC_CORPUS.json](POC_CORPUS.json).

The dedicated Huge validator completed all 3,000 seeds twice and all three fixed
complete matches without failure, mismatch, command cap, or round cap. The run
took 962,999 ms; its metadata-stripped report hash remained exactly
`cd900109eacfa1653b5a183113724402b5e1d180424e71a7b3d049e2fd7593df`.
Generation took 41,722 / 42,058 / 40,312 ms for 1 / 2 / 3 AI, with the unchanged
corpus hashes in the table above. The fixed matches were P2 round 41 / 1,885
commands / 62,083 ms, P2 round 57 / 3,581 commands / 126,922 ms, and P3 round
93 / 7,525 commands / 649,439 ms. Their final hashes were unchanged. The fresh
complete report has SHA-256
`a3f1f9525906ffde5f0ad4d4a0e9e4b2ee9861770ea2871b5bb7213c94135080`:
[HUGE_25_VALIDATION.json](HUGE_25_VALIDATION.json).

Ordinary 1-, 2-, and 3-AI Chrome flows completed with 271, 578, and 225 commands
respectively. They exercised exact save/reload, pending growth rewards, AI
status and fast-forward, final-map inspection, result, same-seed restart, and
hub exit. Every specialized review also passed at 1440 x 1000 and true
390 x 844 DPR 2: mountain/building calibration and fog order; selected-unit
actions, capture, and warnings; combat contact/impact, reduced motion,
fast-forward, and cancellation; technology overview/detail; the prior city
states; fruit versus ore/ordinary mountains and growth; and Huge setup,
capital centering, pan/zoom, and save/resume. All 55 final screenshots were
visually inspected at full detail. Representative evidence:

- [mountain calibration desktop](../../art/feedback/reviews/second-calibration-desktop.png)
  and [mobile DPR2](../../art/feedback/reviews/second-calibration-mobile-390-dpr2.png)
- [selected actions desktop](../../art/integration/reviews/second-selected-unit-actions-desktop.png)
  and [mobile DPR2](../../art/integration/reviews/second-selected-unit-actions-mobile-390x844-dpr2.png)
- [combat contact](../../art/integration/reviews/feedback-attack-contact-desktop.png)
  and [impact](../../art/integration/reviews/feedback-attack-impact-mobile-390-dpr2.png)
- [technology overview](../../art/integration/reviews/second-technology-overview-desktop.png)
  and [detail](../../art/integration/reviews/second-technology-detail-mobile-390x844-dpr2.png)
- [mixed resources](../../art/integration/reviews/resources-v2-desktop.png)
- [Huge interaction](../../art/integration/reviews/huge-interaction-mobile-390x844-dpr2.png)
  and [save/resume](../../art/integration/reviews/huge-save-resume-desktop.png)
- [faction chrome](../../art/pixellab/reviews/chrome-faction-desktop.png)

The audit found and repaired two narrowly scoped regressions. The deterministic
combat fixture now clears stale resource and mine fields when coercing its
combat tiles to grass, and its mobile contact assertion no longer spends the
contact phase waiting on an unrelated overflow check. The faction hero also
rendered blank in real Chrome because of its CSS drop-shadow; removing that
filter restores the accepted raster without changing the asset or manifest.
Post-fix attack and chrome reviews pass on both target viewports.

No broken asset, hidden fog leak, required-control clipping, horizontal
overflow, deadlock, inaccessible action, or gameplay-rule drift was found. No
PixelLab request was made and no accepted raster changed. The one known external
limitation remains: without the required PixelLab resource access, the fruit
world marker is still the documented temporary deterministic code-native
marker. Production replacement still requires a separate PixelLab
generate-inspect-accept workflow.

## Unit health anchor and inspection-cycle validation

The unit status repair moved code-native health bars from the head to the
feet/ground anchor without changing any accepted raster. The 42 x 6 CSS px fill
uses a bounded status scale, begins 4 CSS px below the feet at nominal zoom, and
sits in a 46 x 10 CSS px backing. Pure geometry checks at 0.625x, 1x, and 1.75x
prove the backing stays adjacent to the anchor and ends above a colocated city
label. A focused Canvas draw check verifies that both actual `fillRect` calls use
that geometry and preserve proportional HP fill.

The shared PlayerView-only activation resolver now cycles a visible unit before
its underlying visible city or tile/site. Mouse, touch, Enter/Space, and the
semantic coordinate control use that resolver. Tests cover friendly and enemy
units, city and plain-tile underlays, the stable third activation, fog
nonleakage, harmless remount persistence, and reset on coordinate change,
Escape, accepted-command revision, match instance, and entity disappearance.
An exact offered Attack/Move/Escape target remains the documented positional
command priority exception, preserving combat preview and staged movement.

The focused gate passed 4 files / 58 tests plus all three strict TypeScript
configurations. The complete `npm run check` passed 22 files / 197 tests,
formatting, ESLint, all TypeScript configurations, production build, and golden
replay. The production bundle is 160.45 kB JS / 48.16 kB gzip plus 23.16 kB CSS
/ 5.90 kB gzip. `art:validate`, documentation formatting, the selected-unit
Chrome review, and `git diff --check` also passed; PixelLab was not contacted.

Chrome 151.0.7922.137 ran the deterministic health/cycle fixture at 1440 x 1000
CSS px DPR 1 and a true 390 x 844 CSS px DPR 2. Before capture, the fixture
asserted friendly unit -> underlying city -> friendly unit, then a different
coordinate's visible enemy first, then the reset friendly-unit-first result.
The mobile Canvas measured 390 x 844 CSS px with a 780 x 1688 backing store.
Both PNGs were visually inspected at original detail: full and partial health
fills are readable at the feet, the colocated city label remains clear, the
selection diamond and owner/readiness marks remain distinct, and object depth,
fog, tall overhang, and map readability are intact.

- [desktop evidence](../../art/feedback/reviews/health-cycle-desktop.png),
  SHA-256 `661c4d949a069e1dea46037d41108a27652078f9e2eb5c38bd9c54910be0fc04`
- [mobile DPR2 evidence](../../art/feedback/reviews/health-cycle-mobile-390x844-dpr2.png),
  SHA-256 `fa285cef87bc4ebed25b324da87b9764b09ed48565d5e572e6835373e07ac5f0`

## Non-blocking unit action dock validation

Unit selection no longer enters the overlay state or renders a unit modal or
backdrop. The bottom HUD dock reads only the selected visible unit and exact
`queryPlayerCommands(PlayerView)` results for that owned `unitId`. It exposes
Capture Village/City, Recover, and Promote as direct semantic buttons; Move,
Attack, and Escape remain Canvas destinations with staged movement and attack
confirmation unchanged. Enemy and actionless units retain their visible stats
and concise state without command controls. Escape clears selection from Canvas
or dock focus, and ordinary rerenders keep the semantic dock and Canvas
highlight synchronized.

Focused validation passed 3 files / 64 tests and all three strict TypeScript
configurations. Coverage includes friendly ready, moved, attacked, recovered,
captured, promoted, and actionless states; enemy state; exact Capture, Recover,
and Promote dispatch; selected-unit command nonleakage; exact Move/Attack target
projection; occupant-first cycling; dock-focused Escape; and modal/backdrop
absence. The complete `npm run check` passed 22 files / 208 tests, formatting,
ESLint, all TypeScript configurations, production build, and golden replay. The
production bundle is 160.14 kB JS / 48.05 kB gzip plus 23.76 kB CSS / 6.02 kB
gzip.

The reproducible `npm run smoke:browser -- --capture-review` passed in Chrome
151.0.7922.137 at 1440 x 1000 CSS px DPR 1 and a true 390 x 844 CSS px DPR 2.
Before capture it asserted no unit modal/backdrop, an interactive Canvas, exact
single-unit Capture nonleakage, visible unit stats, keyboard focus, query-derived
end-turn warnings, pan/zoom, 44 px controls, no horizontal overflow, and a
780 x 1688 mobile Canvas backing store. Both PNGs were inspected at original
detail: the full board stays undimmed and targetable, selection and legal targets
remain clear, and the dock reflows without internal scrolling or clipping.

- [desktop evidence](../../art/integration/reviews/unit-action-dock-desktop.png),
  SHA-256 `d8411d03087ec984e7a99ae31b0d23e97c84ee95e484f681999e6afd0a9b28a8`
- [mobile DPR2 evidence](../../art/integration/reviews/unit-action-dock-mobile-390x844-dpr2.png),
  SHA-256 `b3f72c7af04d3af729724394d1f6a3195a4663ac9a4b35b6a50d4aa6be664f3c`

## Map-first selected-city dock validation

City selection now remains ephemeral `BoardSelection` state and never creates
a CITY overlay, modal, backdrop, or scroll panel. The Canvas render plan reads
only explored `PlayerView` tiles for the selected visible city's public
`territoryCityId`, derives diamond-edge perimeter segments from their adjacency,
and emits no selected-territory entry over fog. The city center retains its
selection diamond. The semantic bottom dock filters exact
`queryPlayerCommands(PlayerView)` results only to Train commands with the exact
owned city ID. Harvest Fruit and Build Mine are selected-tile actions and never
appear here. Rival, besieged, and actionless city fixtures expose summary only.

The pure geometry and render-plan coverage includes a stable 12-segment 3 x 3
perimeter, no interior segments, partial explored territory, and fog
nonleakage. DOM coverage includes direct unit-to-city inspection cycling,
resource-control absence, query command counts, accepted unit-art paths,
training buttons whose visible children are exactly art, bare name, and star
cost, rival/siege/actionless states, absent modal/backdrop, keyboard focus, and
Escape returning focus to Canvas. The original selected-city delivery passed
22 files / 212 tests; the later selected-tile result records the current full
suite and superseding city-action separation gates. PixelLab was not contacted.

The reproducible city-growth Chrome mode passed in Chrome 151.0.7922.137 at
1440 x 1000 CSS px DPR 1 and true 390 x 844 CSS px DPR 2 for rich four-training-
action, empty, and mandatory reward-pending states. Before capture it asserted an
interactive undimmed Canvas, no city modal/backdrop, exact training markup and
accessible names, resource-control absence, six concise stats, no coordinates,
focusability, map pan/zoom, minimum visible board height, all camera/End Turn
controls inside the visual viewport, 44 px targets, no horizontal/page/internal
dock scroll, and a 780 x 1688 mobile backing store. All six PNGs were inspected
at original detail.
The perimeter is clear around the explored fixed territory without crossing
fog; city and resource markers remain readable; the dock fits beside desktop
controls and reflows above reachable mobile camera/turn controls; and the
mandatory reward remains the only blocking backdrop.

These paths were refreshed during the selected-tile delivery; their current
hashes include the Capacity and Founders stats plus training-only city actions.

- [rich actions desktop](../../art/integration/reviews/selected-city-dock-rich-actions-desktop.png),
  SHA-256 `ceee6d4c6602c8d2c4b4dd9a0e6ffdf62d44ad73ade0d30c009e86324563485e`
- [rich actions mobile DPR2](../../art/integration/reviews/selected-city-dock-rich-actions-mobile-390x844-dpr2.png),
  SHA-256 `29694522340eabd2f7f0da0258a362a307bae1085280bdba88ece9191c35dc22`
- [empty desktop](../../art/integration/reviews/selected-city-dock-empty-desktop.png),
  SHA-256 `e14c7233d2c48b27222e064aaa1255aaf297810bfccb101134e2d428f8188d21`
- [empty mobile DPR2](../../art/integration/reviews/selected-city-dock-empty-mobile-390x844-dpr2.png),
  SHA-256 `e5e29d46e8beb16c2453bc8a6d209d2eab3bee63748ad06f40a32e2689dbec08`
- [mandatory reward desktop](../../art/integration/reviews/selected-city-dock-reward-pending-desktop.png),
  SHA-256 `4ace7fd58472e13288c3bdb6961002cb947ef2bef5d9c6495ae7fb95a09a9f9e`
- [mandatory reward mobile DPR2](../../art/integration/reviews/selected-city-dock-reward-pending-mobile-390x844-dpr2.png),
  SHA-256 `d3b7c28a1d76f4d3be0ab49d0a4c4151e53c66514a360568b041770245238395`

## Canonical deterministic Demo Match validation

The Demo Match uses uint32 seed `0xdecafbad` (`3737844653`) and optional v2
setup discriminator `scenario: "DEMO"`; absent scenario bytes remain the
canonical standard setup. Engine creation, replay reconstruction, v2 save
round-trip, controller autosave/resume/restart/play-again, the headless API and
CLI, and the real Hub action all reconstruct the same developed opening. The
initial canonical state SHA-256 is
`22a16f3d2dbb1c9e15469fc2e1e90465d8427c2f4791920460a080c7a277b85c`.
The ordinary reference setup retained its prior hash
`cfbde66dfdcb5e5f92c7d7f51a1e716aeff95c786a55b84b67812a1d6577e063`,
and the existing v2 golden replay and 6,000-seed map corpus assertions passed
unchanged.

The fixed human layout is City 1 capital `(2,2)` and converted City 7 `(2,5)`,
both level 3, population 0, Workshop plus City Wall, and capacity 4. Units are
U2 Warrior `(2,2)`, U8 Archer `(1,1)`, U9 Defender `(3,1)`, and U10 Rider
`(1,2)` home-assigned to City 1; U11 Warrior `(2,5)`, U12 Archer `(1,4)`, U13
Defender `(2,4)`, and U14 Rider `(3,5)` are home-assigned to City 7. Every unit
is ready, full-health, on distinct enterable grass, selectable, and has a legal
rendered movement target. The human has all nine technologies, all 625 tiles
explored, and 30 opening stars from 21 scenario stars plus 9 ordinary city
income. AI P2 remains at capital C3/Warrior U4 `(2,20)` and P3 at C5/U6
`(20,2)`; each has 5 stars, no technologies, and ordinary 25-tile exploration.
The rotated turn order is `[1,3,2]`, the human starts, and the unchanged
post-generation random state is `2405986613`.

The direct capped CLI check was:

```sh
npm run headless -- match --demo --max-commands 1 --max-rounds 5
```

It accepted one policy command with no error or stall and returned deterministic
state hash `1bc18716d21486b56239f7535992cd55c64c721c975535d48c792ba20c8f23dd`.
The Chrome review issued an actual legal U2 Move through the controller; its v2
autosave and full-page reload both produced exact canonical hash
`4af25d1e59b5cef25d58429e292debe71732ef012fef1ea18291ef55aa2f0fe9`.
Restart restored the initial hash and camera centering.

The full `npm run check` passed 23 files / 223 tests, formatting, ESLint, all
three strict TypeScript configurations, production build, and golden replay.
The production bundle is 166.82 kB JS / 50.06 kB gzip plus 23.14 kB CSS /
5.89 kB gzip. `art:validate`, documentation formatting, `git diff --check`, and
`npm audit --audit-level=high` also passed; npm reported zero vulnerabilities
and PixelLab was not contacted. The ordinary three-game Chrome smoke remained
green (1 AI Victory in 271 commands, 2 AI Defeat in 578, and 3 AI Defeat in
225), demonstrating that the normal launch defaults and complete result flow
were unaffected.

Chrome 151.0.7922.137 ran `npm run smoke:browser -- --demo-review` at desktop
1440 x 1000 CSS px DPR 1 and true 390 x 844 CSS px DPR 2. It asserted the exact
engine state above, parsed autosaves, all eight units' movement highlights,
capital click cycling from unit to city, both non-blocking docks, 44 px targets,
no horizontal overflow, no document scroll, HUD/camera/End Turn containment,
capital centering, save/reload, and same-seed restart. Visual review found that
focusing Canvas after mobile city cycling initially scrolled the 100dvh shell
and displaced the HUD. Canvas focus now uses `preventScroll`; strengthened
scroll and viewport assertions pass in both viewports, and the regenerated
captures were inspected at original detail.

The two city-dock paths were refreshed during the v3 scalable-capacity run and
their hashes below now include counted-capacity and exempt-founder stats. The
other six captures remained pixel-identical.

- [Hub desktop](../../art/integration/reviews/demo-hub-desktop.png), SHA-256
  `89c759996b17d15e4c313931eda69cbf422d3011e8cc17a0614c4b758cdc1dbf`
- [Hub mobile DPR2](../../art/integration/reviews/demo-hub-mobile-390x844-dpr2.png),
  SHA-256 `ba82106b2bac88765daa61a0da340442b81e24b7216ad8ce03f13da4f0f4c293`
- [Unit dock desktop](../../art/integration/reviews/demo-unit-dock-desktop.png),
  SHA-256 `a1a9ca684c15c1b5fa9e0936d8236f38a4d7ff461f52b6f1c6f741c25c3cd5a5`
- [Unit dock mobile DPR2](../../art/integration/reviews/demo-unit-dock-mobile-390x844-dpr2.png),
  SHA-256 `4023c79aea57c9e9e3e20286bdf666f3195c16191a5a54d81023a92e9b6a41a1`
- [City dock desktop](../../art/integration/reviews/demo-city-dock-desktop.png),
  SHA-256 `a8d12b1141a6f80b30c6cbd1facc2cd70ca68eb8e0dd76b9ff4543f1987306fd`
- [City dock mobile DPR2](../../art/integration/reviews/demo-city-dock-mobile-390x844-dpr2.png),
  SHA-256 `b0f704f52d92ec7fefe3907d3bb6233439ed4b7074f889a3fd83f1fd8e081640`
- [Save/resume desktop](../../art/integration/reviews/demo-save-resume-desktop.png),
  SHA-256 `f07cc5f788369b3a5d8a17669d28a85754c5fcd1cc4f95f043e91af4f716f802`
- [Restart mobile DPR2](../../art/integration/reviews/demo-restart-mobile-390x844-dpr2.png),
  SHA-256 `613be64d526e3a0ccc3aaf0bebfe9e60f8df33c85ce7f639f8aaf3b645a6979d`

## Map-first interaction and Demo Match final audit

The complete map-first selection, bottom-dock, and deterministic Demo Match
delivery received a fresh final audit on 2026-08-15. A clean isolated Windows
temporary copy installed all 180 locked packages with `npm ci` and reported zero
vulnerabilities. Its full `npm run check`, `art:validate`, and documentation
formatting gates passed. The repaired live worktree then passed the same full
gate, `git diff --check`, `npm audit --audit-level=high`, and a focused verbose
69-test geometry/Canvas/DOM interaction run. The full current gate remains 23
files / 223 tests plus the golden replay; the production bundle remains 166.82
kB JS / 50.06 kB gzip and 23.14 kB CSS / 5.89 kB gzip.

The standard ruleset-2 corpus completed all 18 matches twice in 80,705 ms: 519
rounds and 9,701 accepted commands with zero errors, stalls, caps, or repeat
mismatches. Removing only generated timestamps and runtime lines produced no
diff against [POC_CORPUS.json](POC_CORPUS.json), so every standard command,
event, participation, and final-state hash remains unchanged.

The dedicated Huge validator then repeated all 1,000 seeds for each AI count
and completed the three fixed seed-0 matches in 572,118 ms. All 3,000 boards
generated on attempt one with the exact 30 settlements and 113 mountains. The
complete matches remained P2 round 41 / 1,885 commands, P2 round 57 / 3,581
commands, and P3 round 93 / 7,525 commands. Removing only generated timestamp
and runtime metadata produced no diff against
[HUGE_25_VALIDATION.json](HUGE_25_VALIDATION.json); all three generation corpus
hashes and all command, ordered-event, and final-state hashes are unchanged.

Fresh Chrome 151.0.7922.137 validation covered the health/cycle fixture,
selected-unit dock, all rich/empty/reward-pending city states, and Demo Match at
1440 x 1000 plus a true 390 x 844 DPR-2 viewport. The ordinary browser matrix
also completed its save/reload, AI progress, Fast Forward, result, final-map,
and same-seed restart flows at 271 / 578 / 225 commands for 1 / 2 / 3 AI. The
Demo initial and one-Move autosave hashes remained
`22a16f3d2dbb1c9e15469fc2e1e90465d8427c2f4791920460a080c7a277b85c` and
`4af25d1e59b5cef25d58429e292debe71732ef012fef1ea18291ef55aa2f0fe9`;
the one-policy-command CLI hash remained
`1bc18716d21486b56239f7535992cd55c64c721c975535d48c792ba20c8f23dd`.

All 32 regenerated relevant screenshots were inspected at original detail.
They show feet-anchored health bars, unit-first then underlying-city cycling,
undimmed and targetable maps, movement and explored-only territory highlights,
training controls with only unit art/name/cost, reachable 44 px controls, and
no document or dock overflow. Verbose interaction coverage additionally proved
mouse, touch, keyboard, and semantic-coordinate parity, fog-safe cycling,
harmless-remount persistence, documented reset boundaries, and the narrow exact
positional-command priority exception. No product regression was found, so no
gameplay, UI, or raster asset changed during this final audit. PixelLab was not
contacted. The existing generated-art fallbacks and the absence of an external
human screen-reader/formal WCAG audit remain the documented limitations.

## Ruleset 3 acceptance plan and staged validation

The preceding results are historical ruleset-2 evidence. The authoritative
third-play target is now `pulp-wars-poc-3`. The city-progression and assigned-
capacity foundation, map-first selected-tile dock, one-activation positional
commands, Wait/readiness behavior, and greedy threat-aware Normal AI below are
implemented and validated; Large map generation and cooperative diplomacy remain
later delivery stages.
The following acceptance list therefore mixes completed requirements with
still-pending whole-ruleset gates.

### Scalable-city and assigned-capacity foundation result

Ruleset, game-state, command, event, replay, and save boundaries are version 3.
The exact setup schema includes required `aiMode` and recognizes the 20 x 20
size; match creation deliberately keeps cooperative play and Large generation
behind stable `INVALID_SETUP` results until their dedicated stages. Recognized
v1/v2 save and replay fixtures remain incompatible, byte-preserved historical
evidence rather than migrated data.

Focused and full tests cover positive safe-integer city levels, repeated
`level + 1` thresholds with carried population and ordered level events,
level-4 Harvest, level-derived income/capacity, no rewards beyond levels 2/3,
and atomic `INTEGER_OVERFLOW` rejection before resource consumption, star
spending, or End Turn mutation. They also cover exempt ordinary founders,
non-exempt assigned trainees, equality/over-capacity training rejection, death
cleanup, exact capture reassignment/orphan preservation, rival count redaction,
and replay/save round trips. Demo City 1 is exactly three counted plus one
exempt; Demo City 7 is four counted and validly over its level-three capacity.

The v3 Demo initial state SHA-256 is
`bcb87821d2f2e50a79b817b9a4f1f7afcfe37345d1c78f7722b5997e84b1a20e`;
its actual one-Move Chrome autosave boundary is
`8a24bdefe9d37ef5559b393788b1108ab8fb9dcfb277963c38a4825cfc6320d0`.
The capped one-policy-command headless Demo ends at
`ea6149e16f96a6b17d5577f01729930ce3ed07ef09b71e8c28bec67ff1184f51`.
The v3 golden replay finishes at
`735fbdc9ae41ac77f7618414170d9e3d6add52143380ba80b7cdeb3f8b5f8079`.
The complete check passed 24 files / 234 tests, formatting, ESLint, all three
strict TypeScript configurations, production build, and the golden replay. The
production bundle is 169.19 kB JS / 50.72 kB gzip plus 23.14 kB CSS / 5.89 kB
gzip. Art validation, documentation formatting, `git diff --check`, and the
high-severity dependency audit also passed with zero reported vulnerabilities.

Chrome 151.0.7922.137 exercised Demo save/reload/restart and the scalable city
fixture at 1440 x 1000 DPR 1 and true 390 x 844 DPR 2. The level-4 captures were
inspected at original detail: the accepted level-three city raster and geometry
remain unchanged, the code-native `4` badge and `City 1 · L4` label are legible,
and the non-modal dock shows level 4, population `0/5`, income 5, counted
capacity `0/4`, and one exempt founder without overflow or internal scrolling.

- [level-4 desktop](../../art/integration/reviews/scalable-city-level4-desktop.png),
  SHA-256 `357f9a5dbdfb68bf740c75f682d1503cbe77f7828552cb894cd1c1efd7312a08`
- [level-4 mobile DPR2](../../art/integration/reviews/scalable-city-level4-mobile-390x844-dpr2.png),
  SHA-256 `4bcb75478aae096e4d79d51321c1e277d5633f2e7bf134c0ef4a361b43d218e5`

### Map-first selected-tile dock result

`TILE` no longer exists in `MatchOverlay`, controller overlay cleanup, modal
rendering, or responsive modal CSS. Tile selection remains ephemeral
`BoardSelection` and renders a compact footer dock without a backdrop, focus
trap, internal scrolling, or Canvas lock. The dock reads only `PlayerView`:
explored tiles identify coordinate, terrain, resource/site/Mine, public
territory, visible occupants, movement, and defense; an unexplored coordinate
shows only its coordinate and **Unexplored**. The same pointer, touch, keyboard,
and semantic-coordinate activation path reaches the selection, including the
unit-first then underlying-tile cycle. Escape clears it and returns input to the
Canvas.

Harvest Fruit and Build Mine are now exclusively tile-scoped presentation.
Each selected exact coordinate filters `queryPlayerCommands(PlayerView)` for
its one matching resource command, and only an actually offered command becomes
a button. Locked prerequisites, rival ownership, siege, pending reward, and
read-only timing remain concise text rather than disabled fake actions. Accepted
resource commands pass through the ordinary controller revalidation boundary;
the selected tile remains in place and refreshes immediately after consumption.
The selected-city dock filters only exact Train commands for its city and has
no fruit/Mine controls or target ordinals.

DOM/Canvas/UI contract coverage includes plain grass, affordable and locked
fruit/ore, ordinary non-ore mountains, completed Mines, occupied tile underlays,
city tiles, rival territory, siege, pending rewards, consumed-resource refresh,
and content-free fog. The complete suite passes 24 files / 237 tests, formatting,
ESLint, all three strict TypeScript targets, production build, and the golden
replay. The production bundle is 169.12 kB JS / 50.64 kB gzip plus 24.47 kB CSS /
6.02 kB gzip. PixelLab manifest/output validation and the high-severity
dependency audit also pass with zero reported vulnerabilities; no raster asset
was generated or changed for this code-native dock.

Chrome 151.0.7922.137 exercised the six deterministic review states at 1440 x
1000 DPR 1 and true 390 x 844 DPR 2. Automated assertions cover the undimmed
interactive Canvas, exact command controls, fog nonleakage, city separation,
44 CSS px actions, required Zoom/End Turn containment, no page/dock overflow,
and at least 180 CSS px of visible map. All twelve captures were inspected at
original detail. The initial mobile resource row was rejected because its long
status and action overlapped; the accepted layout stacks them and uses a
two-column fact grid without clipping.

- [fruit desktop](../../art/integration/reviews/selected-tile-dock-fruit-desktop.png),
  SHA-256 `19d3cc71d6ea8a45e03131cb4f4735c56fa1b626588b1739244bbb3ba7f6eacb`
- [fruit mobile DPR2](../../art/integration/reviews/selected-tile-dock-fruit-mobile-390x844-dpr2.png),
  SHA-256 `6847c7dfae665c38281c8caa1f49a864557aa0480f9c001b6b561afdbcedf2f1`
- [Mine action desktop](../../art/integration/reviews/selected-tile-dock-mine-desktop.png),
  SHA-256 `089f891245af51d01bc25d0accfb9d4ab335f87eeded8d1aba87c9c2a55b4d7e`
- [Mine action mobile DPR2](../../art/integration/reviews/selected-tile-dock-mine-mobile-390x844-dpr2.png),
  SHA-256 `68e0f8f9fe6d9ef56600808a0ffc13512c3f5c666946a7f78574f14ce32c895f`
- [ordinary mountain desktop](../../art/integration/reviews/selected-tile-dock-ordinary-mountain-desktop.png),
  SHA-256 `83bf1fd0d5634ad6bb2c1125b6d5aa2584e6a48f8d24be7e8c104c0adce1b72c`
- [ordinary mountain mobile DPR2](../../art/integration/reviews/selected-tile-dock-ordinary-mountain-mobile-390x844-dpr2.png),
  SHA-256 `98d23181f6a3c6e7d4a058d41f905a85f37a163c177d2f42e4316e408e98a56e`
- [consumed fruit desktop](../../art/integration/reviews/selected-tile-dock-resource-consumed-desktop.png),
  SHA-256 `560b8dc4e19f7d3972a7840ada91fedc56c8ebb66516e796f797ce3105ccf0b8`
- [consumed fruit mobile DPR2](../../art/integration/reviews/selected-tile-dock-resource-consumed-mobile-390x844-dpr2.png),
  SHA-256 `1928e849d055b13a855acda72797303b635bd4929f3f5070f47770ce019287ed`
- [fog-safe desktop](../../art/integration/reviews/selected-tile-dock-fog-safe-desktop.png),
  SHA-256 `2e903df5e6596704a03d7fbb1bedb1abe0489d4be9027db9ee7a7a0f19a7a0a1`
- [fog-safe mobile DPR2](../../art/integration/reviews/selected-tile-dock-fog-safe-mobile-390x844-dpr2.png),
  SHA-256 `7fc1a8cba22187de92850aa812ab2bc284f731ad620c741a64c943b2fdd8a77e`
- [city separation desktop](../../art/integration/reviews/selected-tile-dock-city-separation-desktop.png),
  SHA-256 `05484e6ae206e90dce58d6eb35996544e1c818117beb9774fc439adc378ee8d6`
- [city separation mobile DPR2](../../art/integration/reviews/selected-tile-dock-city-separation-mobile-390x844-dpr2.png),
  SHA-256 `0a96ac2a2ce811438a8c5392a70ebc52d495893741a998576f1fe3c20522cdda`

### One-activation positional-command result

The Canvas host no longer owns staged movement state, and Attack is no longer a
confirmation action or modal route. While an owned unit is selected, the first
activation of an exact query-offered Move, Escape Move, or Attack target sends
that exact command to the controller. The controller re-queries the current
`PlayerView` before applying it, so stale or illegal commands remain atomic
rejections. Exact offered spatial commands retain priority over inspection;
activating other coordinates preserves the visible-unit-first then underlying
city/tile cycle. Drag/pan and pinch input never dispatch.

Movement highlighting now attaches the query's canonical path to the active
pointer or keyboard target before commitment. Every offered Attack target
displays the shared pure public preview: defender damage and survival/death,
retaliation damage or its reason, attacker survival/death, and advance/no-
advance. The native coordinate activator exposes the same exact facts in its
accessible option name. No preview depends on hover alone, and neither preview
path creates a backdrop or focus trap.

Focused pure, Canvas, DOM, and controller tests cover exact command lookup,
stale and illegal rejection, mouse/touch drag thresholds, keyboard Enter/Space,
semantic activation and focus restoration, Rider Escape, attack-over-inspection
priority, canonical paths, exact preview wording, autosave/hash parity, combat
input lock, full/reduced-motion presentation, cancellation, and fog-safe
interrupted movement. The complete current gate passes 24 files / 243 tests,
formatting, ESLint, all three strict TypeScript targets, production build, and
the v3 golden replay. PixelLab validation, documentation formatting,
`git diff --check`, and the high-severity dependency audit also pass; no raster
asset changed.

Chrome 151.0.7922.137 exercised all twelve command/input pairs (Move, Escape
Move, and Attack by pointer, true touch, keyboard, and semantic coordinate) at
1440 x 1000 DPR 1 and true 390 x 844 DPR 2. Each first activation matched the
independently applied expected state hash and immediate autosave boundary,
created no modal, and retained Canvas or inspector focus where applicable. All
four evidence frames were inspected at original detail; routes and combat facts
remain legible on the map without displacing the bottom dock or required
controls.

The unchanged ordinary browser policy flow also completed: 1 AI victory in 403
commands, 2 AI defeat in 540, and 3 AI defeat in 225, including autosave/reload,
final-map, restart, responsive-target, and focus checks. The dedicated combat
review passed full-motion desktop/mobile contact and impact plus reduced-motion
impact, authoritative hash parity, input locking, and cancellation.

- [canonical Move path desktop](../../art/integration/reviews/single-activation-move-path-desktop.png),
  SHA-256 `83669480967bf5b06755d449c1e2592f8e976b35da1720beff3d0d43008b39dd`
- [canonical Move path mobile DPR2](../../art/integration/reviews/single-activation-move-path-mobile-390x844-dpr2.png),
  SHA-256 `6c961c7985ef71b617fd65834cdafa1cd601fc9ee009ba3e34873f07ccc6a8db`
- [exact Attack preview desktop](../../art/integration/reviews/single-activation-attack-preview-desktop.png),
  SHA-256 `1625bab987c76f1617ae3ada8cb325edbffcd142fd8d3e04bb69a7ca1c8c67c0`
- [exact Attack preview mobile DPR2](../../art/integration/reviews/single-activation-attack-preview-mobile-390x844-dpr2.png),
  SHA-256 `2aade35a32ba669a13b0b3a2738fe9e92475d414b0c534c1264d5cb339a2b1f8`

### Wait and readiness-halo result

`WAIT {unitId}` is now an exact public command for each selected, owned, living,
active-player unit whose durable `activation.handled` flag is false. Acceptance
sets only that flag, emits one `UNIT_WAITED`, consumes no PRNG, and advances one
command boundary; repeat Wait rejects atomically as `UNIT_ALREADY_HANDLED`.
Focused engine, query, replay, save, controller, and DOM tests prove that Wait
preserves movement, attack, recovery, capture, Escape, promotion, position, HP,
and every other public command. It also leaves end-turn auto-recovery available.
Start Turn clears handled for existing living units, while newly trained units
remain handled and exhausted. Normal AI can observe the public Wait command but
filters it from composition and policy choice.

All circular check/tick unit-state badges are absent from Canvas and related UI
contracts. An unhandled active-human unit instead receives a code-native soft
feet ring without modifying unit-raster opacity. Its deterministic 1.8-second
ease-in-out geometry stays within 45–70% alpha and 3% scale variation. Handled,
enemy, and nonactive units receive no ring; reduced motion holds it at 60% alpha
without scheduling a readiness animation. The RAF lifecycle tests cover handled
transitions, combat/input lock, reduced motion, enemy turns, and remount cleanup.
The selected-unit dock and semantic map labels retain redundant **Needs action**
or **Handled** text, and end-turn attention now depends only on unhandled units.

The complete gate passes 25 files / 255 tests, formatting, ESLint, all three
strict TypeScript targets, production build, and the v3 golden replay. The
production bundle is 171.27 kB JS / 51.27 kB gzip plus 24.47 kB CSS / 6.02 kB
gzip. PixelLab manifest/output validation, `git diff --check`, and the
high-severity dependency audit pass with zero reported vulnerabilities; this
code-native status treatment generated or changed no production raster asset.

Chrome 151.0.7922.137 exercised the deterministic fixture at 1440 x 1000 DPR 1,
true 390 x 844 DPR 2 mobile, and reduced motion. Automated assertions cover the
exact Wait boundary, atomic disappearance of repeat Wait, byte-identical other
commands, handled attention clearing, undimmed interactive Canvas, responsive
targets, and static reduced-motion treatment. All five captures were inspected
at original resolution: the restrained ring stays at the unit's feet, does not
obscure its silhouette or health bar, and disappears after Wait while the dock
continues to expose **Handled**. The unchanged ordinary Chrome policy smoke also
passed: 1 AI victory in 403 commands, 2 AI defeat in 540, and 3 AI defeat in 225.

- [readiness halo desktop](../../art/integration/reviews/readiness-halo-desktop.png),
  SHA-256 `af7d9e56cfb703102749f89e1f046cc5f4196f30c7a0e393071217fc01a9384f`
- [readiness halo mobile DPR2](../../art/integration/reviews/readiness-halo-mobile-390x844-dpr2.png),
  SHA-256 `2b4889abe7a371dd0efd7ff03ccb60923724d42a1d2f5a9ce54c000aa124351e`
- [unselected readiness halo mobile DPR2](../../art/integration/reviews/readiness-halo-unselected-mobile-390x844-dpr2.png),
  SHA-256 `1a16c2ae13c25533b8314db29cfc3f649593083a638e8e5550cbcb30a9465304`
- [handled after Wait mobile DPR2](../../art/integration/reviews/readiness-waited-mobile-390x844-dpr2.png),
  SHA-256 `00cd4282cc5dedbf61ec50fc1db845c40f11be5f8681e3dc3875e66fee5d27cf`
- [static reduced-motion halo desktop](../../art/integration/reviews/readiness-halo-reduced-motion-desktop.png),
  SHA-256 `3850274e9e50d5b78ff1f3474496d9d696dd46deaca2d266e9b5afe9d7ae1039`

### Greedy threat-aware Normal AI result

Normal now rebuilds a complete public-query candidate set after every accepted
command and applies the authoritative v3 priority, strategic, immediate,
safety, objective, and stable tie tuple. It uses only `PlayerView` plus public
combat/unit/technology tables. Focused tests prove visible move-plus-range and
siege threat classification, guaranteed-kill defense, threatened-city Defender /
Warrior / Archer / Rider preference, affordable-role fallthrough, neutral and
hostile capture tiers, resource and missing-role research chains, level-producing
growth, general composition, objective/frontier movement, stable ties, identical-
view noninterference, hidden occupancy/ZOC nonleak, and exact Wait exclusion.

The fixed non-cherry-picked seeds remain `0,1,2` across the six supported
11/14/16 setup pairs. Each match ran twice with 20,000-command and 500-round
caps. All 18 entries reached `HEADLESS_VICTORY`: zero errors, stalls, caps, or
repeat mismatches across 591 rounds and 12,363 accepted commands. Complete
per-entry command/event/final hashes and expanded participation are in
[POC_CORPUS.json](POC_CORPUS.json), whose whole-file SHA-256 for this run is
`8d1f8e8777cd716845700a6f2eecd194223b407954ad3bc362e688d112ab8699`.

| Participation                | v3 greedy corpus | Historical documented baseline |       Delta |
| ---------------------------- | ---------------: | -----------------------------: | ----------: |
| Trained units                |            1,360 |                            896 |        +464 |
| Unit commands                |            8,434 |                          6,616 |      +1,818 |
| Captures                     |              188 |                            166 |         +22 |
| Fruit                        |              274 |                            212 |         +62 |
| Mines                        |              273 |                            231 |         +42 |
| Rewards / city level-ups     |        273 / 273 |                      238 / n/a | +35 rewards |
| Population gained            |              820 |                            n/a |         n/a |
| Publicly revealed move tiles |            4,730 |                            n/a |         n/a |

The baseline is the last complete documented ruleset-2 corpus, so these deltas
show materially greater participation but do not isolate policy from the v3
rules boundary. The new report records 89 neutral and 99 hostile captures,
maximum city level 3, 137 final cities summed across entries, every unit and
technology, and every productive command kind: 5,781 Move, 2,236 Attack, 92
Escape Move, 81 Recover, 188 Capture, 56 Promote, 317 Research, 274 Fruit, 273
Mine, 1,360 Train, 273 Reward, and 1,432 End Turn. Wait is exactly zero. Winner
distribution is P1/P2/P3/P4 = 8/7/2/1. The longest case ended at round 53 with
1,638 commands; the complete paired corpus took 151.1 seconds on the reference
workspace on its first pass and 163.9 seconds on the final post-hardening pass;
both stayed well inside every deterministic cap.

The fixed Huge Demo also completed headlessly at round 38 / 2,356 commands with
P1 `HEADLESS_VICTORY`, zero errors or stalls, and final state hash
`8966b848d35d54dc3424f16f0cce09f17cc31a4aaae70cefac57dd483f9da0c6`.
Chrome 151.0.7922.137 completed the standard 1/2/3-AI flows at 397 / 169 / 509
commands (Victory / Defeat / Defeat), including exact Hub-loaded save hashes,
Resume, paced and Fast Forward AI, result/final-map, same-seed restart, desktop,
and true 390 x 844 DPR-2 mobile checks. Demo desktop/mobile save-resume retained
initial hash `bcb87821d2f2e50a79b817b9a4f1f7afcfe37345d1c78f7722b5997e84b1a20e`
and autosave hash
`8a24bdefe9d37ef5559b393788b1108ab8fb9dcfb277963c38a4825cfc6320d0`.

The regenerated final maps were inspected at original detail. The 1-AI victory
visibly contains six level-three cities, 15 mixed units, completed Mines, and a
fully explored board. The defeated-human 2/3-AI maps retain fog while showing
developed AI city clusters and mixed formations in explored territory; no hidden
terrain leaks, broken images, clipping, or presentation deadlock were found.

- [1-AI developed final map](../../art/integration/reviews/final-map-1ai-desktop.png),
  SHA-256 `b4db6f27b9f1c179b341767b69ce2097053c879757a2de9f4b2452b36adc402f`
- [2-AI fog-safe final map](../../art/integration/reviews/final-map-2ai-desktop.png),
  SHA-256 `6f42ada0f60524b4e15e356cf7b63f707bd887709099bbf3a9e599a23f07c11c`
- [3-AI fog-safe final map](../../art/integration/reviews/final-map-3ai-desktop.png),
  SHA-256 `b3737d2017123e27cd1bef3e01184b8e953231d72aad364a8df18aacaf882e94`

The browser smoke now freezes a partial validation boundary before hashing and
checks the loaded state on Hub before Resume. This removes two real timer races:
a paced AI could accept a command between snapshot and reload, or immediately
after Resume before the CDP assertion. It does not alter production persistence
or AI scheduling, and the focused controller save/replay parity tests still pass.

The final automated gate passes formatting, ESLint, all three strict TypeScript
targets, 25 Vitest files / 258 tests, production build, and golden replay. The
production bundle is 174.86 kB JS / 52.21 kB gzip plus 24.47 kB CSS / 6.02 kB
gzip. PixelLab source/manifest/output validation, documentation formatting, and
`git diff --check` also pass without contacting PixelLab or changing accepted
raster source art.

### Engine, schema, and compatibility

- Exhaustive untrusted parsers accept only schema/save/replay/command/event
  version 3 and the exact v3 setup fields, including required rival/cooperative
  `aiMode`, sizes 11/14/16/20/25, and fixed rival Demo. Recognized v1/v2 data
  returns incompatible, remains byte-identical in storage, and is never
  partially migrated. Browser and headless creation serialize the same immutable
  `humanPlayerId`; externally policy-driving that seat does not change
  cooperative relations or its canonical state.
- City properties cover positive safe-integer levels beyond 3, the threshold
  loop `level + 1`, carried population, per-level ordered events, income at high
  levels, rewards only at levels 2/3, and continued Harvest/Mine legality.
  Level 4+ renderer evidence must reuse the accepted level-three raster at the
  same geometry with a readable code-native numeric badge. Unsafe integer
  growth/income fixtures reject atomically as `INTEGER_OVERFLOW` rather than
  clamping a city level.
- Every ordinary starting capital Warrior is durably capacity-exempt through
  save/replay, capture home reassignment, and orphaning. Every trained and Demo-
  added unit is non-exempt. Training allows `counted < level`, assigns the new
  unit, permits reaching equality, rejects equality/over-capacity, and never
  destroys a valid over-capacity acquired state. Demo asserts City 1 counted
  `3/3` plus one exempt and City 7 counted `4/3`.
- Wait is offered once to every unhandled active living unit, sets only handled,
  emits one `UNIT_WAITED`, consumes no PRNG, increments one command boundary,
  survives save/replay, leaves every other action and auto-recovery unchanged,
  and rejects repeat Wait atomically. Start Turn resets handled; trained units
  enter handled/exhausted.

### Public queries, diplomacy, and deterministic AI

- PlayerView/query tests prove tile resource commands are exposed only for the
  exact explored selected coordinate, never in city actions and never through
  fog. Rival city assignment totals remain redacted. Equal views produce equal
  commands and policy decisions.
- Cooperative fixtures prove AI pairs cannot Attack, retaliate, Capture, siege,
  exert ZOC, or enter/cross one another's territory. New reveal excludes allied
  territory. The only permitted hidden boundary datum is
  `diplomaticBlock: ALLIED_TERRITORY`, with no terrain/resource/Mine/site/entity/
  controller payload. Previously explored tiles are not re-fogged. Human-to-AI
  hostility and neutral-village capture remain normal.
- Unit tests cover every greedy priority, threat severity, research-chain
  choice, level-producing growth, threatened/general production role order,
  unavailable-role fallthrough, objective/frontier score, stable signed tuple,
  and zero PRNG draws. Fixed rival and cooperative browser/headless runs must
  agree on command/event/state hashes and show training, exploration, research,
  fruit/Mines, expansion, and defensive production. Cooperative logs must have
  zero AI-on-AI combat/capture and zero allied-territory exploration/path steps.

### Map-first browser and accessibility evidence

- Selecting plain grass, fruit, ore, ordinary mountain, Mine, occupied tile,
  city tile, and unexplored tile at desktop and 390 x 844 DPR 2 always leaves
  Canvas undimmed and interactive, creates no tile modal/backdrop/focus trap,
  and renders one non-scrolling bottom dock. Only exact offered Harvest/Mine
  buttons dispatch, and city docks contain only exact training controls.
- Pointer, touch, Enter/Space, and semantic coordinate activation dispatch an
  offered Move, EscapeMove, or Attack on the first activation with no second
  click or confirmation UI. Canonical paths and attack damage/retaliation/death/
  advance previews are visible and accessible before activation. Occupant-first
  inspection cycling remains intact when the coordinate is not an offered
  positional command.
- No circle/check/tick readiness marker remains. Unhandled active-human units
  show only the specified gentle feet halo; handled actions and Wait remove it.
  Reduced motion freezes rather than removes the redundant halo, and dock text
  exposes Needs action/Handled. End-turn warnings depend on unhandled units, so
  Wait suppresses attention without disabling later commands.
- Setup, restart, save/resume, replay, and CLI cover explicit Large 20 x 20 and
  both AI modes. Across 1,000 seeds per AI count, Large repeats exactly with 20
  settlements, 72 mountains, the standard resource recipe, valid connectivity,
  and no generation failures or weakened invariants. Auto remains 11/14/16 and
  Huge remains 25.

### Cooperative AI and Large implementation result

The ruleset-3 delivery passed 26 Vitest files / 272 tests in one full run. The
production bundle is 177.82 kB JS / 53.09 kB gzip plus 24.47 kB CSS / 6.02 kB
gzip. Formatting, ESLint, all three strict TypeScript targets, production build,
golden replay, PixelLab source/manifest/output validation, Markdown formatting,
relative-link validation across 13 Markdown files, and `git diff --check` pass.
No PixelLab request ran and no accepted raster source art changed.

The paired 1,000-seed Large generator corpus passed for every opponent count,
with exact 20 settlements, 72 mountains, 40 fruit, 40 ore, connectivity, and all
existing territory/resource invariants on both copies. Aggregate hashes were:

- 1 AI: `a546b34459199496a358589a916f2029c2b3158cb4c3bc42141e9b7c1d8b00ea`
- 2 AI: `b35359d8493b25f3cbff10ea1c9ebeca09c891c777129fff6daaa1314abca1c2`
- 3 AI: `d521f6c6e6986e3a6e2683d7e3f06658c727518c371c84b1714338742c308723`

The fixed 3-AI/Large/cooperative seed-0 audit repeated identically and completed
in 1,122 commands with no error, stall, or cap. Its command, event, and final
hashes are respectively
`8d935035f4915c4470c3b48cdc5fd5a5eb84322edd8e774ea9a401329f200b90`,
`84d7219626a0b44952ccdd3db38f4734403ed635c3f74b6089abe2bff6547ff2`,
and `7bdbe181a16814b721d6c3c3481fef225910a4217b0c21430dd88f708d221721`.
It recorded 76 AI attacks and five AI captures against the human, while its
independent command/replay audit found zero AI-on-AI Attack/Capture, allied ZOC
or siege, allied-territory Move/Escape step, newly explored allied-territory
coordinate, or diplomatic-boundary leak. AI participation included research,
movement/exploration, training, fruit, Mines, capture, attack, recovery, escape,
promotion, and city rewards. The direct cooperative Large CLI batch also
completed seed 0 for 1/2/3 AI without cap, error, or stall in 1,479/1,523/1,122
commands; final hashes were
`aaab0288900088e906dd0a798b594011bc1a2feb97b7c19404f0212990828d4a`,
`d800e3373f964bf193529a3378501bdb6d51c7faea2f1e4ea49e856be504f546`,
and the 3-AI hash above.

The standard rival one-command batch hashes remain byte-identical at
`3c74f55242a5dd07eae17d1c368945a3445d2192ea55ae86d048074554724782`,
`41fc11706d2e0faa877fed4b301b531364ec0b88824dc5ce20abfe3a0ce29b28`,
and `a906fdf182bf0c944df47d340da1cdf4244db4bf795df7ca5505425f126cfd02`
for 1/2/3 AI. The ordinary rival Chrome regression also retained its established
1-AI victory in 397 commands and 2/3-AI defeats in 169/509 commands.

Chrome 151 reproducibly exercised the real 3-AI cooperative Large setup,
confirmation, match, desktop and true 390 x 844 DPR 2 camera interaction, 30
policy steps, autosave reload, and exact resume. The live boundary reached
command 48 with state hash
`313a4a8c042071697d15d22088964195b5767a1141032eaba5fe696d2a8c0680`;
the measured desktop/mobile camera movement was 45.58/51.12 CSS px. Run it with
`npm run smoke:browser -- http://localhost:6173 --cooperative-large-review`.
Every screenshot was inspected at its captured resolution with no clipping,
overflow, broken art, fog leak, or stale resume state:

- [desktop setup](../../art/integration/reviews/cooperative-large-setup-desktop.png),
  SHA-256 `ecbf489be8733960331a883e9649a7c4b1d6a28d8cbe5872bef82d218e2e1802`
- [mobile setup](../../art/integration/reviews/cooperative-large-setup-mobile-390x844-dpr2.png),
  SHA-256 `cb17448943385f8f7a4b6d3643e00b4044baa8c2eb79c4d239e9b20046b94ebc`
- [desktop match](../../art/integration/reviews/cooperative-large-match-desktop.png),
  SHA-256 `e63b012692f8a3aca2600f09df5a00bda232b456ddd6f396f33c78b678a38955`
- [mobile match](../../art/integration/reviews/cooperative-large-match-mobile-390x844-dpr2.png),
  SHA-256 `3bd096670b436d62a7bd3c3c38e9d4ff845e897201eab52a29321e976b6e5f5b`
- [desktop save/resume](../../art/integration/reviews/cooperative-large-save-resume-desktop.png),
  SHA-256 `39c1eba4e63b40935f70bae617df01490defa376ee8b2f611dd7e9cc4ff06a76`
- [mobile save/resume](../../art/integration/reviews/cooperative-large-save-resume-mobile-390x844-dpr2.png),
  SHA-256 `a3fdaf0797e978090210926b381aec3183d809cc12399e2c1a7d20c544fdc7b9`

The delivery gate remains formatting, ESLint, all strict TypeScript targets,
full Vitest, production build, headless golden, art validation, documentation
formatting/link checks, `git diff --check`, focused desktop/mobile Chrome review,
and deterministic rival/cooperative corpora. New v3 fixture hashes must be
recorded only from passing implementation output; the v2 hashes above remain
compatibility evidence and must not be silently rewritten.

## Ruleset 3 final active-AI audit

The final audit used an exact repository copy without `.git`, `.beads`, build
output, or existing dependencies. A clean `npm ci` installed 180 packages and
reported zero vulnerabilities. The first parallel Vitest launch hit two
environmental worker-start timeouts after 24 files / 211 tests had passed; the
same full suite then passed serially at 26 files / 272 tests. The final isolated
and live gates passed formatting, ESLint, all three strict TypeScript targets,
all 272 tests, production build, golden replay, PixelLab manifest/output
validation, art footprint review, relative Markdown links, `npm audit`, and
`git diff --check`. The final bundle was 177.82 kB JS / 53.09 kB gzip plus
24.47 kB CSS / 6.02 kB gzip. No PixelLab request ran and no production source or
accepted raster asset changed.

The fixed rival corpus ran all 18 old-size setup/seed entries twice: 36 terminal
victories, 591 rounds, 12,363 commands, and zero errors, stalls, caps, or
command/event/final-hash mismatches. Its canonical metadata-independent SHA-256
was `33ec6999e84cd5f05be2fead406fed5000644a5822d7f50ce6b9ff65f24f681e`,
exactly matching the checked-in corpus. Participation included 2,236 attacks,
188 captures, 317 research commands, 274 fruit harvests, 273 Mines, 1,360
trained units, 273 rewards, 820 population, and 4,730 revealed tiles. The
existing paired 6,000-case old-size generator corpus also remained green.

The three required cooperative seed-0 corpora each repeated exactly, accepted
authoritative defeat as a valid terminal outcome, and had zero errors, stalls,
caps, AI-on-AI Attack/Capture, allied-path, allied-new-exploration, allied-ZOC,
allied-siege, or diplomatic-boundary violations:

| Setup     | Commands | Command SHA-256                                                    | Event SHA-256                                                      | Final SHA-256                                                      |
| --------- | -------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 2 AI / 14 |      169 | `5cde4886e64629eb24412c1430bbd47bc2eaad8b31777255e11cba54f9574b57` | `2cf68fd93ad48ea0eeb2a825a59976a3613dda5a1874def4710a353d8b8f0fc4` | `8af05b6054ce1fc11d0acddc4b63ace55621e58b7133e10e5ac227414ab8e05c` |
| 3 AI / 16 |      846 | `69088ef4ddbd48f1d229f311cadfa975089149f601f0f89cc2bf0a4a845a5134` | `a454f28b3bb6fb0049c67c517504b831ad4f8cb5141d827798e659d0b100180b` | `8aad906bc72a00950eb63c20a0a379e75c5b5f486ee39473718289a7543d653b` |
| 3 AI / 20 |    1,122 | `8d935035f4915c4470c3b48cdc5fd5a5eb84322edd8e774ea9a401329f200b90` | `84d7219626a0b44952ccdd3db38f4734403ed635c3f74b6089abe2bff6547ff2` | `7bdbe181a16814b721d6c3c3481fef225910a4217b0c21430dd88f708d221721` |

Together those runs recorded 165 attacks and 11 captures against the human,
926 newly revealed AI tiles, 54 AI city level-ups, and positive AI research, movement,
training, fruit, Mine, and growth participation in every setup. The cooperative
validator now exits nonzero unless a run has terminal `OUTCOME`, a non-null
authoritative outcome, zero errors/stalls/cap, zero diplomatic violations, and
all required participation. Before this hardening, a deliberately capped run
printed `COMMAND_CAP` with a null outcome but returned success; it now fails with
explicit diagnostics.

The paired 1,000-seed Large corpus for each opponent count repeated exactly with
20 settlements, 72 mountains, 40 fruit, 40 ore, connectivity, and all invariants:
1 AI `a546b34459199496a358589a916f2029c2b3158cb4c3bc42141e9b7c1d8b00ea`,
2 AI `b35359d8493b25f3cbff10ea1c9ebeca09c891c777129fff6daaa1314abca1c2`,
and 3 AI
`d521f6c6e6986e3a6e2683d7e3f06658c727518c371c84b1714338742c308723`.
The v3 Demo completed headlessly in 2,356 commands at round 38 with zero
errors/stalls and final hash
`8966b848d35d54dc3424f16f0cce09f17cc31a4aaae70cefac57dd483f9da0c6`.
The checked-in Huge JSON remains explicitly historical schema/ruleset-2
evidence; current v3 Huge generation, save/reload, camera, and gameplay are
covered by the live tests and browser review rather than rewriting that file.

Chrome 151 at 1,440 x 1,000 DPR 1 and true 390 x 844 DPR 2 passed ordinary rival
1/2/3-AI full games, Demo, tile/unit/city docks, single-activation Move/Escape/
Attack, preview/animation/reduced motion, readiness and Wait, cycling, strict
training, level-4 growth/capacity exemption, AI pacing/Fast Forward,
Cooperative Large, and Huge. Pointer, touch, keyboard, and semantic controls;
focus restoration; 44 px targets; undimmed interactive maps; target/boundary
visibility; fog safety; loaded images; and absence of horizontal/internal
scroll or clipped required controls all passed. The ordinary results remained
1-AI victory in 397 commands and 2/3-AI defeats in 169/509. Cooperative Large
saved and resumed exactly at command 48 with hash
`313a4a8c042071697d15d22088964195b5767a1141032eaba5fe696d2a8c0680`;
Huge did so at the observed paced boundary command 6 with hash
`087c80a002db77bcf7baead1effbbca9753a56e1530278b25ac2b66402c6b82d`.
The browser fixture now permits any non-negative initial paced command index,
then proves the exact frozen save/resume boundary, avoiding a real CDP timing
flake without weakening deterministic assertions. Its capture fixture now
asserts the v3 bottom dock, undimmed canvas, Escape dismissal, and semantic focus
restoration instead of the removed v2 tile modal.

All 98 browser evidence images were present, including 78 regenerated in the
final review window. Representative final, dock, combat, readiness, growth,
Demo, Cooperative, Huge, and art-contact-sheet images were visually inspected
at captured detail; the complete set also passed the mode-specific DOM, layout,
image-load, and fog assertions. Selected fresh
SHA-256 values are 1-AI final map
`cbc84a919f88bbb4ff5342e3854d3c813f7b054cc35ca87aa52de19fe5b26fbe`,
mobile Fruit dock
`2e06397738fe5a7271b395dd98bee81373d4d97f83d2a10fb9f5e0a7c02ed983`,
mobile attack preview
`bf23723fdcc47624aa3e4b129e1787f53d14737d356ed37d4191b366518046d6`,
mobile level-4 city
`4bcb75478aae096e4d79d51321c1e277d5633f2e7bf134c0ef4a361b43d218e5`,
and mobile Huge resume
`ffd43d22fd03fe48a6ab56ccfe184ec2df305d5c5838cda884f6447601b908b3`.
No broken art, fog leak, overflow, clipping, modal dimming, or readiness tick was
found. The accepted art manifests remained
`4b04e4068db10d615159b7a5c4df44ab998316c940da219b18a2e65a121b8520`,
`50ef5e2b1c263451316d5831470950642d5e7b5037c8b80568b9039d5a679219`,
and `41e35d296cfe3d358e32cdd607b721f3d3e60bc832147533ef16f0122d6ee8e0`.
Known intentional art fallbacks remain the clear code-native fruit world marker
and text technology icons for Riding and Archery.

One verified project Vite process remains healthy on strict port 6173. Windows
localhost reaches its IPv6 loopback endpoint with HTTP 200; WSL `curl localhost`
cannot reach that Windows-side binding. A second project server correctly fails
strict-port startup rather than choosing another port. Live dependencies were
repaired non-destructively after a locked Rolldown file caused an initial WSL
`npm ci` unlink failure; the live tree resolves and the complete live gate above
passed. This host-boundary behavior is the only known operational limitation.

## Ruleset 4 forest, siege, varied-map, and presentation acceptance plan

Everything above this section is immutable ruleset-2/3 evidence, not a
ruleset-4 expected hash or active acceptance claim. `POC_CORPUS.json`,
`HUGE_25_VALIDATION.json`, legacy saves/replays, and existing screenshots remain
historical and must not be rewritten to look like v4 results. New evidence uses
schema/ruleset/save/replay/command/event version 4 and separate v4 filenames.

### Engine, schema, and transactions

- Exhaustive parsers accept only `pulp-wars-poc-4`, schema/envelope version 4,
  the exact setup fields, all nine technology IDs, five unit IDs, three terrain
  IDs, three resource IDs plus null, and two improvement IDs plus null. Every
  invalid terrain/resource/improvement cross-product is rejected.
- Recognized v1/v2/v3 saves and replays return `INCOMPATIBLE`, preserve input
  bytes, and are neither partially migrated nor classified `CORRUPT`. Fresh v4
  create/save/load/resume/restart/replay and Demo fixtures compare every
  checkpoint and final SHA-256; timestamps do not affect hashes.
- Hunt and Lumber each cover every error in exact precedence, including
  ambiguous multi-failure fixtures, plus identical-state/no-event/no-index/no-
  PRNG rejection. Acceptance asserts Hunt costs 2 and Lumber costs 3, each adds
  +1 population, with exact resource or
  improvement mutation, resource event before ascending level events, pending
  reward selection, overflow atomicity, siege/reward locking, capture transfer,
  occupied-tile legality, and legality at levels 1 and 4+.
- Public query/PlayerView fixtures cover explored Fruit/Ore/Animal/Forest and
  all locked/unlocked actions. Unexplored and allied diplomatic arms contain no
  terrain, resource, improvement, city, unit, or owner; equal views yield
  byte-identical commands and Normal choices.
- Catapult tests assert cost 8, HP 10, attack 4, defense 0, move 1, range 3,
  Mathematics, no Dash/Escape/Fortify, no attack after Move, attacks at distance
  1/2/3 but not 4, no ranged advance, and ordinary training/capacity lifecycle.
- Rational combat vectors assert full Catapult -> unfortified Warrior computes
  12/clamps 10 and kills; City Wall Warrior takes 6/survives 4; promoted
  15-HP Warrior takes 12/survives 3; ordinary 3/2 Fortify or Archery Forest
  defense takes 10. Preview and
  resolution agree exactly and consume no PRNG.

### Map generation and deterministic AI/headless evidence

- For every legal AI count, both AI modes, and sizes 11/14/16/20/25, at least
  1,000 fixed seeds assert settlement counts/spacing, exact Mountain counts
  22/35/46/72/113, exact Forest counts 29/47/61/96/150, empty Grass settlement
  centers, four-passable-neighbor capitals, Grass-or-Forest connectivity,
  resource/terrain validity, no out-of-territory resource, and at least two
  distinct adjacent opportunity tiles per settlement, plus at least one Animal
  globally.
- Movement/combat fixtures assert Forest is enterable without technology, costs
  one and ends Move; Archery grants its single 3/2 defense bonus; the bonus does
  not stack with city/Mountain/Wall; and public preview equals resolution.
- Generator trace fixtures assert sorted coordinate inputs, one terrain
  Fisher-Yates shuffle, exactly one raw resource draw per territory tile,
  thresholds Fruit `0x60000000`, Ore/Animal `0x80000000`, continued-stream
  retries, attempt-256 failure, and unchanged map hash between Rival/Cooperative
  for equal non-mode setup/seed. Corpus distribution proves at least two
  settlement mixes and includes exactly-two and more-than-two opportunities;
  no exact two-Fruit/two-Ore assertion remains.
- Normal tuple tests use frozen command/technology/unit ordinals, all four
  growth kinds at priorities 900/880, resource-chain priority 920, Catapult
  production orders, Mathematics chain, and visible-only safety/objectives.
- New rival/cooperative Auto/Large/Huge corpora record commands/events by kind,
  research by nine techs, training/actions by five units, terrain/resource/
  improvement counts, opportunity histogram, Catapult attacks/kills,
  population/levels/captures/reveals, caps/errors/stalls, and all hashes.
  Required participation includes Hunt, Lumber, Mine, Fruit, Mathematics,
  Catapult training/attack, terminal outcomes, and cooperative zero violations.

### Browser, animation, accessibility, and art evidence

- Empty, short, and maximum-line tile/unit/city selections at 320, 390, 600,
  1024, and 1440 CSS px; DPR 1/2; 100%/200% zoom; and safe-area fixtures compare
  Canvas rect/backing size, camera center/zoom, and logical selection before,
  during, and after docks. They remain identical. Docks may cover the map, stay
  non-modal/pannable, use <=45dvh normally, and scroll only in the documented
  extreme fallback with all 44 px controls reachable.
- Render-plan/DOM tests assert no circle/check/tick, yellow badge, detached
  `W`/`R`, or halo. Full motion schedules one 1.6 s sprite opacity
  1 -> 0.62 -> 1 loop only for active-human unhandled units. Reduced motion
  schedules no readiness RAF, leaves opacity 1, and retains **Needs action**.
- Archer Full/Normal fake-time tests at 0/279/280/379/380 ms verify origin/
  target projection, cubic-out travel, impact and post-state boundary. Reduced
  motion has only 100 ms impact; Fast Forward is immediate. Pan/zoom/resize
  reprojects without restart; Settings pauses; every documented cancellation
  lands on final state without changing event order. Catapult has no arrow.
- Tile dock/map cursor expose Forest/Animal/Lumber Mill without fog leaks;
  exact Hunt/Lumber buttons dispatch, city docks never list resource actions,
  and the nine-node tree exposes Forestry/Mathematics and range-3 Catapult.
- PixelLab validation requires only reproducible scripts/manifests and review
  plans at this specification stage; no production asset is generated. Future
  assets must pass 384 x 384 Catapult geometry, 256 x 296 Forest/Animal/Lumber
  geometry, Archer attachment, source/native/minimum-zoom review, three accepted
  Forest samples before batching, and labeled contact sheets. Programmatic
  arrow/impact and dock/readiness primitives are code-native.

Ruleset-4 delivery is not a pass until focused tests, full `npm run check`,
`npm run art:validate`, a deterministic v4 golden replay, new headless corpora,
and real-browser review pass and their hashes/evidence are appended below this
plan. Documentation formatting and local-link checks are mandatory first.

## Ruleset-4 map corpus evidence

The exhaustive varied-map matrix is intentionally an explicit gate rather than
part of default Vitest:

```sh
npm run validate:v4-map -- --output docs/validation/POC_V4_MAP_CORPUS.json
```

The 2026-08-16 run covered 9,300 unique map inputs and 18,600 paired boards:
the six Auto configurations used 1,000 seeds each, every Large AI count used
1,000 seeds, and every Huge AI count used 100 seeds. Rival and Cooperative
boards matched for every input. Exact terrain counts, all v4 invariants, global
Animal presence, multiple settlement mixes, and both exactly-two and
more-than-two opportunity settlements passed in every configuration with zero
failures. Runtime was 206,916 ms and the combined corpus hash was
`753ff217de75568ca2b4ea0f9adb15e324b855beefc667652170599607859a64`.

| Matrix case     | Board-corpus hash                                                  |
| --------------- | ------------------------------------------------------------------ |
| Auto 1-AI / 11  | `7723a8d40027e336952d1377517f7f891066fe5b6044334f0ccce41e6e6503d3` |
| Auto 1-AI / 14  | `15d7ea66441ee51075fb3f67924b949e65d73922406c9b31c3df3f09cc9de53f` |
| Auto 1-AI / 16  | `a3894eeabc0e31a1030cfedc41d6f0b26fc688a57e51620b18baaeefe14abda9` |
| Auto 2-AI / 14  | `bd978223b70a26ceccb34f8f5d2ad578b21235cda21a727c774b7dd258706b2d` |
| Auto 2-AI / 16  | `4849c2f40d4366f0ccf8a086b62113fe2744cbe0f38b11de069243d913939929` |
| Auto 3-AI / 16  | `178fc9a741097ed0ffa11c40ac2541176b7a36e5b2891403108dee9525611a39` |
| Large 1-AI / 20 | `57cdc4e27a8fceaaf384c5d0b19356ecfdefa2472cd9aa570e73fa535d4efa08` |
| Large 2-AI / 20 | `1648790f458dfdaef8024f473b32c8edeaff9b5ee02c01e8f6c9854e25824792` |
| Large 3-AI / 20 | `4b7c7a5972c4da2523bcdbf9e22b6093021e2180dfcbeb34c646acc31dcdf87b` |
| Huge 1-AI / 25  | `37d85dfdc8d5affedfc2b3a1d79e097ae35d9e52596eb7d4f414f68b09fed995` |
| Huge 2-AI / 25  | `d9f1faadf7438b00dd3ffce102c6cfce16ad822889aa500b2e628db333d76921` |
| Huge 3-AI / 25  | `9f629f9eb5e2e2d69afc85099f37d7590445f396f6a801e9e19896e65c6d256c` |

The full per-case resource totals, opportunity histograms, diversity counts,
terrain counts, hashes, and runtimes are checked in at
[POC_V4_MAP_CORPUS.json](POC_V4_MAP_CORPUS.json). Default Vitest retains the 12
seed-zero canonical fixtures and a bounded 10-seed paired sample for every
matrix case. The final post-split run passed 28 files / 291 tests in 33.80 s;
the project target is to keep default Vitest at roughly 60 seconds or less on
this host while running the exhaustive corpus explicitly when map rules or
generation change. The complete formatting/lint/typecheck/test/build/golden
`npm run check` passed in 81.35 s on the same host.

## Ruleset-4 Catapult and Normal-AI corpus evidence

The Catapult implementation keeps the frozen unit ordinal after Rider and adds
Mathematics-driven Normal composition without changing the deterministic map
stream. The bounded active v4 AI corpus is checked in at
[POC_V4_AI_CORPUS.json](POC_V4_AI_CORPUS.json). It covers seeds 0, 1, and 2
across the six supported Auto/selectable 11/14/16 setup combinations, repeats
all 18 matches, and uses the 20,000-command/500-round safety caps.

The 2026-08-16 corpus completed all 18 matches twice with zero errors or stalls:
659 total rounds, 12,726 accepted commands, 92 Catapults trained, 883 Catapult
actions, 479 Catapult attacks, 278 Catapult kills, and 40 Mathematics research
commands. Every existing unit also retained positive training/action
participation. First-run plus deterministic-repeat runtime was 69,996 ms. The
formatted corpus file SHA-256 is
`66ad378ac274f94c75f29e33e3034adb57275bb666d5e32c675b31eed9d30683`;
each entry records its command, event, and final-state hashes.

The manual v4 golden replay remains intentionally unchanged because it contains
only Demo Forest-economy commands and ruleset tables are not serialized into
`GameState`. Its replay still verifies at final state hash
`8bee6f1b1e94ebbecc48bea41973a4ec0a7391e9a1a2e104cef423b6970a078c`;
the fixture file SHA-256 is
`783673d9857eeb1380eae8842d73361017b89eb82ee28ce5bae39f2878c652d1`.
Separate focused save/replay/headless regression builds a legal
Hunting -> Forestry -> Mathematics -> Train Catapult command log and compares
the same final hash and ordered events through all three paths.

The final Catapult delivery gate passed formatting, lint, strict browser/engine/
art TypeScript builds, 28 test files / 299 tests, production Vite build, and the
headless golden replay. `npm run art:validate` also passed without adding or
claiming Catapult production art, and every local Markdown link resolved.

A Rival 1-AI 14 x 14 seed-1 smoke completed at round 61 after 990 commands with
10 Catapults trained, 63 Catapult attacks, 34 Catapult kills, zero errors/stalls,
and final hash
`7cc535f99ef2927bc9410cab842ec99cc2fea974194bcee79e153a22610f15c4`.
A Cooperative 2-AI 14 x 14 seed-0 smoke completed at round 23 after 420
commands with Mathematics and Catapult training participation; the relationship
audit reported zero violations, command hash
`0165cd98db74bd9bebb335c2332d45e7a6bbd4bcead0b8883c350dd298e9aa78`,
event hash
`9ead89f6e149b30f7baa41147923701561840432528ff96798de59e9cf9322d6`,
and final hash
`a24c9ce2a6db2be523a13cd7868e89ab9c0952918e218522667be61ad5eb05b3`.

## Ruleset-4 final functional and fallback audit

The independent 2026-08-16 final pass used Windows Node 24.12.0 on the recorded
Intel i7-10510U host and Chrome 151.0.7922.137. A clean copy on the Windows temp
volume completed `npm ci` with 180 packages and zero vulnerabilities. Both that
copy and the live checkout then passed formatting, lint, all three strict
TypeScript projects, 28 files / 303 tests, the production Vite build, and the
v4 golden replay. The live pass also completed `npm run art:validate`,
`git diff --check`, npm audit, and a repository credential-pattern scan. The
production bundle remained 195.85 kB JavaScript / 56.84 kB gzip and 26.15 kB
CSS / 6.43 kB gzip.

The fresh exhaustive map command covered 9,300 unique inputs / 18,600 Rival and
Cooperative paired boards in 128,571 ms. It had zero failures and reproduced
the checked-in deterministic content byte-for-byte after removing runtime
fields, including corpus hash
`753ff217de75568ca2b4ea0f9adb15e324b855beefc667652170599607859a64`.
Every exact Mountain/Forest count, Animal presence, mode-map parity, and
minimum-two opportunity invariant passed. Every matrix case contained both
exactly-two and greater-than-two opportunity settlements and hundreds of
distinct mixes, so the old fixed settlement recipe is absent.

The fresh active Rival corpus likewise matched the checked-in deterministic
content after timestamps/runtime were removed: 18 matches / 36 repeated runs,
659 rounds, 12,726 accepted commands, zero errors/stalls, 133 Hunts, 264 Lumber
Mills, 92 Catapults trained, 883 Catapult actions, 479 attacks, 278 kills, and
40 Mathematics purchases. All nine technologies and five units participated.
A repeated 3-AI Large match was byte-identical at 2,118 commands / round 51,
with final hash
`ff6793548baa2887a0a539f634562206bbcd9f0e71d21a2a6b61af74a2182b02`.

The purpose-built Huge validator separately ran 1,000 seeds twice for each AI
count: 6,000 deterministic generation runs, zero failures, maximum attempts
9/7/8 against the 256 ceiling, and generation corpus hashes
`de005fb2b78184646e86c52d9c1913b134e52768d1d2d3b76a302496169ad76e`,
`f78c9b0910edd9f95f2a4169539dafed68f80cee0425be669ed2298559d58b79`,
and `f743ea1de95825158a92a03005bee300cc571a0839eab8138d34707518002b6c`.
Its 1/2/3-AI matches all completed under the 20,000-command / 500-round caps at
2,203/3,602/5,067 commands and rounds 48/67/77 with zero errors/stalls. Their
final hashes were respectively
`221b4e587883450ac082bf03d96a5d0a09567df39ead4d0455b61709cda453a2`,
`551bd17f8f881e80a8545834653087f534856e91be4f64283b0dbc1b4010c920`,
and `3980bb3fffeb0b636a183270e3c253b0d01429389050bcf25ef77f15721102e8`.

Cooperative Auto 14, Large 20, and Huge 25 matches completed with zero errors,
stalls, AI-on-AI attacks/captures, allied-territory path steps or new reveals,
allied-only ZOC, or allied siege. The 2-AI Auto case retained command/event/final
hashes `0165cd98db74bd9bebb335c2332d45e7a6bbd4bcead0b8883c350dd298e9aa78`,
`9ead89f6e149b30f7baa41147923701561840432528ff96798de59e9cf9322d6`,
and `a24c9ce2a6db2be523a13cd7868e89ab9c0952918e218522667be61ad5eb05b3`.
Large completed at 1,453 commands with final hash
`15b11b400478dcbc6787443c83de8f83f7d954d7cea0edaa2e9dc6c9eb236d4d`;
Huge completed at 1,803 commands with final hash
`b5f8a20e342504dbc552612f7f29c47fbdb9b6225351b4de22afff7cb69fd249`.
All three showed positive AI research, training, exploration, city growth,
growth actions, attacks against the human, and capture participation.

Chrome exercised the complete ordinary 1/2/3-AI browser flow at 288/776/403
commands, including exact autosave reload/resume, result/final map, Play Again,
loaded assets, keyboard semantics, Fast Forward, and mobile restart. Focused
desktop 1440 x 1000 DPR1 and true 390 x 844 DPR2 modes passed for Cooperative
Large, Huge, the v4 Demo, the nine-node technology tree, stable tile/unit/city
docks, Forest/Animal/Lumber actions, Catapult training, mixed v4 resources,
Wait/readiness, reduced motion, capture, scalable cities, and one-activation
Move/Escape/Attack across pointer, touch, keyboard, and semantic controls. The
Demo initial hash was
`05ee08426e7acda629d8dc06e15ebf135b3b3f2754c385ac9b9ff1ddf1de187d`;
its accepted one-Move autosave/resume boundary was
`985d63219e7b5d4eb47c7c91f86f47a26eec8aa81c64d2e29c4081fef3cb326c`.

The HUD geometry evidence records identical Canvas CSS size, backing store,
camera projections, and logical selection across no dock and short/tall
tile/unit/city docks on desktop and mobile. Normal docks used visible overflow
within 45dvh; only the 320 px accessibility fixture used the documented local
scroll fallback. Marker DOM count was zero throughout. Full motion changed only
the ready unit raster pixels over the 1.6-second opacity cycle; health/owner
attachments stayed steady, Wait removed the pulse without removing other
actions, and reduced motion scheduled no pulse and stayed pixel-static while
retaining **Needs action**.

The independent Archer evidence retained deterministic command index 1 and
post-state hash
`23697a77b0af71c4cfc9c0282669b7cc3950b3922648b3c885d09a0d865a3dee`
for contact, 140 ms cubic-out flight, 280 ms impact, and 100 ms full/reduced
impact frames at both DPRs. Focused tests additionally passed 0/279/280/379/380
ms boundaries, pause, pan/zoom reprojection, Fast Forward, reduced motion, and
all cancellation routes without changing command/event order. Catapult never
used the Archer primitive.

Original-detail inspection found one scoped product copy defect: Mathematics
and Help confused Catapult's 8-star cost with its attack stat and said
**Attack 8**. Both now say the authoritative **Attack 4**, with DOM and Chrome
regression coverage. Several historical browser validators were also migrated
from ruleset-3 assumptions: seven to nine technology nodes, fixed Fruit/Ore
settlement counts to v4 Forest/Animal invariants, v3 Demo hash/coordinates to
their v4 derivation, and random per-settlement resource dependencies to
explicit UI-only fixtures.

The previously blocked PixelLab production pass was resumed after the user
restored credits. The credential stayed environment-only and was forwarded to
the Windows Node process through WSL's environment bridge; the checked-in
pipeline reported only `PIXELLAB_API_KEY: present`, never the value or numeric
balance. All requests used the recorded model, prompts, negative prompts,
dimensions, seeds, references, and output mapping.

Nine new production IDs are accepted: four Forest variants, Animal, Lumber
Mill, Catapult, Forestry, and Mathematics. Five visually unsuitable attempts
were quarantined and never wired; two additional Forest-4 jobs failed the
deterministic anchor gate and remained unwired. Forest samples passed
individually before the fourth variant was batched. A recorded
`groundContactY` post-process preserves scale and alpha while correcting
provider vertical drift to y222 for Forest/Animal/Lumber Mill and y288 for the
Catapult; over-tall candidates are proportionally fitted within the hard
contact box rather than clipped.

The repeated production fixture contains 29 Forests, 4 Animals, 3 Lumber Mills,
1 Catapult, and 40 fog tiles. Browser review exposed Animals being erased by a
single-raster canopy, so the tested/documented same-tile order now draws Animal
frontage after Forest while Lumber Mill remains between trunks. Accepted
resources and siege art remain visible at fog edges without fog painting over
their revealed overhang. The 1440 x 1000 capture hash is
`2a3b0b1dcdf5f0cd9f22350f710faea70d8379fd542b31cd9561c5f08e7c6d0b`;
the true 390 x 844 DPR-2 capture hash is
`de0332523f1b98bf25adf6b6bff9d05876455216fbbf7060585a7ec7af0e084e`.
See [desktop production review](../../art/feedback/reviews/forest-catapult-production-desktop-1440x1000.png),
[mobile production review](../../art/feedback/reviews/forest-catapult-production-mobile-390x844-dpr2.png),
and [machine-readable evidence](../../art/feedback/reviews/forest-catapult-production-evidence.json).

## Fruit production raster replacement

The restored PixelLab session also replaced the intentional code-native Fruit
world marker. The credential remained environment-only and reached the exact
Windows Node process through `WSLENV=PIXELLAB_API_KEY/w`; the checked-in tool
printed presence only and no credential or numeric balance. All three paid
iterations used fixed seeds, accepted Grass references with recorded hashes,
and the checked-in 256 x 296 transparent object-canvas recipe.

Two attempts were rejected and quarantined rather than wired. Attempt 1 hash
`89046a1e6e542f5adcfd948d3e37a6b7b08829c191ead4c385b8917bbb3e5d76`
was too tall and leaf-dominant. Attempt 2 hash
`a779fd8693f7b9944303d3c7de9613510f004c08b87ad8e27adee1b75065a0e0`
lost the third-fruit and leaf cues at minimum scale. The accepted third source
and production output have identical SHA-256
`71d28e528ab3a4676b5396ca608181dbe815bca6843b190a54586c27d6324342`.
Its alpha bounds are `x=83..172`, `y=150..222`, so the `(128,222)` anchor and
0.5 runtime scale produce a grounded 44.5 x 36 CSS px marker.

The renderer now requests `/assets/pixellab/terrain/fruit.png` in the existing
low-resource layer; the code-native marker is retained only for asynchronous
loading or load error. Focused tests verify this transition and exact anchor.
Source/enlarged/native/0.75x inspection, rejected-versus-accepted comparison,
8 x 8 repetition, occupied-tile depth, and explored-Fruit/fog-edge behavior
passed. The actual production URL loaded in both Chrome captures. Desktop
1440 x 1000 DPR1 hash is
`e4afdec7514e20257300e187f7f9f5a6865ab9b4b8bcbe3ab18ff50b6a4b7281`;
true 390 x 844 DPR2 hash is
`94473430efa7f0d6431a81447eae222308810df4fba3aad4f874fb802454f691`.

See the [iteration sheet](../../art/pixellab/reviews/fruit-iteration-review.png),
[repetition sheet](../../art/pixellab/reviews/fruit-repetition-review.png),
[desktop runtime review](../../art/integration/reviews/resources-v2-desktop.png),
[mobile runtime review](../../art/integration/reviews/resources-v2-mobile-390-dpr2.png),
and [machine-readable evidence](../../art/feedback/reviews/fruit-production-evidence.json).

Windows localhost returned HTTP 200 from `http://localhost:6173`, and every
Chrome run used that strict-port Vite entry point.
