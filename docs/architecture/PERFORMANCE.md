# Performance on large maps

Bead `pulp_wars-2yc.79` (user, 2026-10-17: "see what can be done to improve
performance of the game especially on large maps. only fully functionality
preserving refactors allowed"). This page records how the game was
profiled, what was hot, what changed and by how much, how equivalence was
proved, and what is left.

Every change here is behaviour preserving: the same game states, events,
PRNG draws, AI commands, saves, hashes and rendered pixels. A change that
would alter any output was not made.

## How it is measured

No match is played. Everything runs on **fixed states**:

- `scripts/perf/large-map-harness.ts generate --dir <d>` records, once, the
  command list that reaches three large states (a few rounds of single Normal
  AI turns, then never again): `quick-20x20-8seats-r5` (20 x 20 Continents,
  8 seats, round 6, 26 units), `advanced-25x25-8seats-r8` (25 x 25 Pangea,
  round 9, 47 units) and `advanced-25x25-8seats-r16` (25 x 25 Dry Land,
  round 17, 85 units, 36 cities). After that the states come from replaying
  the recorded commands through the reducer, checked against the recorded
  state hash.
- `record` / `check`: from each fixed state, one round of single AI turns
  (one per seat) is played and every AI command, every resulting state hash,
  the hash of every seat's view, the human's projected events and view, the
  active seat's offered commands and their economic previews are written; `check`
  recomputes them and fails on any difference.
- `time`: the active seat's whole AI turn on the fixed state, split into the
  policy, the AI view, `applyCommandV7`, the replay append (its checkpoint
  hash), the human view and the event projection, plus the cold queries; the
  fastest of three runs (the machine is shared with other workers, so wall
  times carry noise of 10 to 30 percent).
- `save`: each fixed state advanced to the human seat's turn and written as
  a browser save.
- `scripts/perf/large-map-browser.ts --save <file> --out <dir>` loads such a
  save into muted headless Chrome (1440 x 1000, `--dpr`, `--zoom-out`),
  resumes it, and measures frame intervals, animation-frame callback time and
  full board draws (full-viewport clears of the board canvas) while idle,
  panning, zooming and (`--playback`) during one round of AI turns after End
  Turn; it writes a CPU profile of each phase, a reduced-motion screenshot
  (`--reduced`, a still frame for pixel comparison) and a digest of the
  human's final view.

## Findings (before)

Numbers at the start, `advanced-25x25-8seats-r16` unless named.

| Where                                   | Cost                                                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applyCommandV7`                        | 7 to 10 ms per command; two thirds of it the connection network: `seaTradeCityIdsV7` rebuilt a string signature of every tile, city, unit and explored tile on **every** call, and was called once per city (36) per state |
| The fixture replay (1 233 commands)     | 6.0 to 7.2 s                                                                                                                                                                                                               |
| One Normal AI seat's turn (30 commands) | 1.15 to 1.65 s: policy 0.65 to 0.95 s, apply 0.23 to 0.34 s, replay append 0.12 to 0.19 s, views and projection 0.15 s                                                                                                     |
| AI policy                               | `playerFactionV7` (a `players.find` per call) alone 29 percent of the policy                                                                                                                                               |
| Browser, AI playback round (7 seats)    | 7.3 s wall, 183 ms worst frame: each new view's setup was a new object, so the fog terrain skeleton **generated the whole map again** (`createInitialMapStateV7`, about 500 ms per round)                                  |
| Browser, per accepted command           | the human's view was computed 3 times (boundary, event projection twice, results thrown away)                                                                                                                              |
| `canonicalHash` of the state            | 3.1 ms (every accepted command, for the replay checkpoint): path strings built for every value, a code-point comparator for every key sort, a SHA-256 with a guard on every read                                           |
| Economic preview                        | `economicOutputTransitionsV7` searched the board for every tile (625 x 625 per graph)                                                                                                                                      |
| Board draw                              | 1.2 to 1.6 ms of main-thread JavaScript per full draw; idle draws once per frame while units are ready (no dropped frame); 16.7 ms frames throughout idle, pan and zoom, also at DPR 2                                     |

The render loop was never the bottleneck: frame intervals stayed at
16.7 ms while idle, panning and zooming, at DPR 1 and 2. The time a large
map costs is in the engine and the AI between frames, and in one blocking
map regeneration per accepted command during playback.

## Changes, before and after

Engine timings are the fastest of three runs, alternated with a copy of the
source at the bead's start; browser timings are one run each.

In the order they landed (each its own commit). "r16" is
`advanced-25x25-8seats-r16`; a turn is the active Candy seat's 30-command turn.

| #   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Where                                                            | Before        | After         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------- | ------------- |
| 1   | The connection network cache (`seaTradeCityIdsV7`, `src/engine/v7/economy.ts`) keeps the facts it was computed from as a flat list and compares a state with it in place, instead of joining a string of every tile, city, unit and explored tile on every call; the per-city callers (`recomputeLiveEconomyV7`, the state schema's population ledger) read each owner's network once through `roadPopulationReaderV7` and group the Markets once through `marketIncomeReaderV7` | `applyCommandV7`, r16 turn                                       | 227 to 337 ms | 63 to 102 ms  |
|     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | replaying the r16 fixture (1 233 commands)                       | 6.0 to 7.2 s  | 2.3 to 3.4 s  |
|     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | a view of an uncertified r16 state                               | 14 to 25 ms   | 3.7 to 5.7 ms |
| 2   | `viewForV7` remembers the views of accepted (validated, deep-frozen, certified) states by viewer; a view is deep-frozen and a pure function of its state                                                                                                                                                                                                                                                                                                                         | event projection, r16 turn                                       | 65 to 95 ms   | 9 to 19 ms    |
|     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `viewForV7` in the browser, r16 playback round                   | 413 ms        | 286 ms        |
| 3   | The fog's terrain skeleton (`terrainSkeletonOfViewV7`, `src/render/canvas/terrain-at-fog-v7.ts`) is also remembered by the setup's text (last six), so an equal setup in a new object (every accepted state's) does not generate the map again                                                                                                                                                                                                                                   | map generation in the browser, r16 playback round                | 535 to 614 ms | 0             |
| 4   | Canonical JSON builds the error path only when it throws (a parent link per object, no string per value), sorts keys without a surrogate with the native order (equal to code-point order there) and SHA-256 runs in 32-bit registers with no per-block allocation                                                                                                                                                                                                               | `canonicalHash` of the r16 state                                 | 3.07 ms       | 2.33 ms       |
| 5   | `playerFactionV7` (`src/engine/rules/ruleset-v7.ts`) answers from a memo of the last frozen player list of frozen players (first player of each id, as `find`), any other list is searched as before                                                                                                                                                                                                                                                                             | AI policy, r16 turn                                              | 591 to 857 ms | 372 to 476 ms |
|     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `playerFactionV7` in the browser, r16 playback round             | 267 ms        | 8 ms          |
| 6   | The economic preview's output transitions index each graph's tiles once by place instead of searching the board for every tile (625 x 625 per graph); `cityHasImprovement` reads a frozen board's explored improvements by city from a memo                                                                                                                                                                                                                                      | `economicOutputTransitionsV7` in the browser, r16 playback round | 257 ms        | 12 ms         |
|     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `cityHasImprovement`, same round                                 | 83 ms         | 8 ms          |
| 7   | `technologyCapabilitiesV7` answers a frozen technology list by identity before building its text key                                                                                                                                                                                                                                                                                                                                                                             | same round                                                       | 19 ms         | 6 ms          |

All together, one Normal AI seat's r16 turn (fastest of three, alternated
with the original source): **1 048 to 1 533 ms before, 616 to 787 ms
after**; smaller fixtures: 20 x 20 round 6 65 to 152 ms → 37 to 160 ms
(4 commands, noise dominates), 25 x 25 round 9 57 to 112 ms → 37 to 54 ms.

In the browser (muted headless Chrome, DPR 1, one run each, the old build
and the new on the same save; `browser/cmp1` in the bead's scratch folder):

| Fixture       | Phase                                              | Before                                                | After                                                |
| ------------- | -------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| 20 x 20 r6    | AI playback round, wall                            | 3 354 ms, worst frame 83 ms, 95th percentile 50 ms    | 1 667 ms, worst frame 16.8 ms                        |
| 25 x 25 r9    | AI playback round, wall                            | 5 588 ms, worst frame 100 ms, 95th percentile 83 ms   | 2 141 ms, worst frame 16.8 ms                        |
| 25 x 25 r17   | AI playback round, wall                            | 8 145 ms, worst frame 50 ms, 95th percentile 33 ms    | 6 485 ms, worst frame 33 ms, 95th percentile 16.8 ms |
| 25 x 25 r17   | main-thread work of that round (profile, not idle) | 5 229 ms                                              | 3 722 ms                                             |
| 25 x 25 r17   | resume from the save to the board                  | 8 856 ms                                              | 5 232 ms                                             |
| every fixture | idle, pan, zoom                                    | 16.7 ms frames, 0.9 to 1.7 ms of animation-frame work | unchanged                                            |

The playback round is paced by the board's animations (the AI waits for
the board, `pulp_wars-2yc.59`), so its wall time does not fall to the CPU
time; what changed is the work between frames and the long frames.

## Equivalence

- **Engine and AI**: the equivalence record (`record`, above) was written
  with the source as it was at the bead's start and checked after every
  change: all three fixed states, 237 AI commands in all, give identical AI
  commands, state hashes, view hashes of every seat, projected events,
  offered commands and economic previews. Replaying each fixture (240 to
  1 263 commands) reaches the recorded state hash each time.
- **Canonical JSON and hashes**: the new `canonicalJson` / `canonicalHash`
  were compared with the old ones on the three saves, 20 000 random JSON
  values with Unicode and surrogate keys, every padding boundary of SHA-256
  and every rejected shape (the error messages included): identical, and the
  hashes equal Node's SHA-256.
- **Browser**: the same save resumed in the old and the new build gives the
  same digest of the human's view after one round of AI playback; the
  reduced-motion screenshots of the resumed boards are compared pixel for
  pixel (both builds served the same way, from copies of the source at the
  bead's start and at the end: **0 differing pixels** on all three fixtures at
  DPR 1 and DPR 2; a build served from the worktree differs from one served
  from a copy outside it only in its web fonts, so the two compared builds
  are served alike).
- Unit tests: `tests/unit/network-cache-facts-v7.test.ts` (the network
  cache recomputes after an in-place change of Roads, technologies, owners;
  the per-city readers equal the per-city functions),
  `tests/unit/perf-memo-v7.test.ts` (remembered views, terrain skeletons,
  player factions, technology capabilities), and new cases in
  `tests/unit/canonical.test.ts` (error paths, surrogate ordering).

## Follow-ups (not done: small or risky)

- **One board draw per frame** (`pulp_wars-2yc.64` item 2, measured here):
  idle draws exactly once per frame; during an r17 playback round about 92
  of 390 frames hold two full draws (an `update()` from an AI step and an
  animation frame), about 100 redundant draws at 1.2 to 1.8 ms each, about
  4 percent of the round's main-thread work, with no dropped frame. Pans
  driven by rAF-aligned pointer events draw once a frame; the harness's
  unaligned synthetic moves give two in some frames. Merging needs one host
  frame loop for the ripple, victory wave, ambient, camera and presentation
  frames and a dirty flag instead of the 50-odd synchronous `#draw()` calls
  in `board-host-v7.ts` (tests read the context synchronously after
  `update()`). Small and risky; left open on 2yc.64.
- **Parse reuse of frozen tiles**: `checked()` parses every accepted state
  (55 percent of `applyCommandV7` now), building new tile objects for the
  625 unchanged tiles and freezing them again. Returning a frozen tile the
  parser itself produced earlier would skip most of `parseBoard`,
  `hasExactKeysV7` and `deepFreeze` (about 0.5 ms a command on r16), but
  shares tile identity between consecutive states; worth doing with care.
- **Network content cache**: each new state object computes every owner's
  connection network again (about a third of the rest of `applyCommandV7`);
  a content-keyed cache over the facts list would share it across states.
- **AI policy** (now 12 ms a command on r16): no single hot spot left; the
  largest are movement path validation (`validatePlayerMovementPathCoreV7`)
  and the Candy rush planning (`planSugarRushV7`), both calling the path
  search many times for the same unit.
- **Board draw** (1.2 to 1.8 ms of JavaScript a frame): the static layers
  (terrain, territory borders, forests, fog) could be cached in an offscreen
  canvas per camera; with 16.7 ms frames everywhere it was not needed.
- Noise: the machine was shared with other workers throughout; the engine
  ranges above are the spread of the fastest-of-three runs.

## The fog lift (bead `pulp_wars-2yc.83`)

The fog lift on a reveal ([ATMOSPHERE.md](../art/ATMOSPHERE.md#the-fog-lifting-on-a-reveal))
draws on the effects overlay only. It was measured with
`scripts/perf/fog-lift-browser.ts` on `advanced-25x25-8seats-r16` (no
command played, no AI): the board is mounted over the save's state with the
cells two and three away from the human's capital unexplored, then the state
as it is is swapped in, as an accepted command would, revealing **33 cells
at once** (a wave of three rings); 1.5 s of frames, muted headless Chrome,
1440 x 1000, the same run with `?fog-lift=0`. (The fixture's save is of
identity 7r91; its state is drawn as it is, since only the board is
measured.)

| DPR | Lift | Frame interval (mean, max) | rAF work per frame (mean, p95, max) | Long tasks | The swap's task |
| --- | ---- | -------------------------- | ----------------------------------- | ---------- | --------------- |
| 1   | on   | 16.67, 16.8 ms             | 1.77, 2.1, 2.6 ms                   | 0          | 27.7 ms         |
| 1   | off  | 16.67, 16.8 ms             | 1.69, 1.9, 2.8 ms                   | 0          | 27.4 ms         |
| 2   | on   | 16.67, 16.8 ms             | 1.85, 2.3, 2.8 ms                   | 0          | 27.3 ms         |
| 2   | off  | 16.67, 16.8 ms             | 1.76, 2.2, 3.0 ms                   | 0          | 32.6 ms         |

- No dropped frame and no long task with the lift; it adds about 0.1 ms of
  animation-frame work a frame while it plays. The swap's task (the view,
  its update and first draw) is the same with and without it.
- One overlay frame of all 33 cells, held with `pinFogLift` at every 30 ms
  of the wave, costs 0.04 ms of JavaScript on average (0.2 ms at most): two
  drawImage of a cached frame a cloud, one pattern fill and one drawImage
  for all their bodies.
- The cached frames (12 frames of 3 variants, a body mask and the rims
  each, cropped) take about 4.8 MB in all and about 2 ms each to build; they
  are built two at a time, 30 ms apart, while the board shows fog, so the
  first reveal finds them ready (at most three a frame are built during a
  lift if not).
- Reading a view with a new tile list (every playback boundary) costs
  about 0.04 ms (a 25 x 25 board, 85 units); a view with the same tiles
  costs nothing. Another player's moves do not change the viewer's
  explored cells, so enemy playback starts no lift.
