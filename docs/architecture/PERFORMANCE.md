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

## Opening a saved game (bead `pulp_wars-2yc.95`)

Resuming a long game froze the page: `parseSaveV7` replayed the whole
command log from the setup, on the main thread, inside the browser
controller's constructor, before the main menu could draw. The save
already holds the full canonical state; the replay only proved that the log
leads to it.

**Design.** The browser resume now loads the stored state directly and
checks the history afterwards, off the main thread
([CLIENT_ARCHITECTURE.md section 10](CLIENT_ARCHITECTURE.md#10-persistence-and-versioning)):

- `parseSaveV7(source, { replay: "DEFER" })` keeps every check but the
  replay: the size cap, the envelope, the full state schema and its
  invariants, the canonical hash, the setup and PRNG, the parsed command log
  and its length. A changed state whose hash was not updated is still
  `CORRUPT`.
- The controller hands the save to a Web Worker
  (`src/app/save-history-worker-v7.ts`), which runs the full
  `parseSaveV7(source)` and replies. `savedHistoryCheck()` becomes
  `VERIFIED`, or `MISMATCH` (a save whose state was changed and rehashed, or
  whose log no longer reproduces it): play goes on from the stored state and
  a save warning says so. Without a Worker (Node, tests) it stays
  `UNCHECKED`. Every tool, test and headless reader still calls the strict
  default and rejects such a save.
- `runReplayV7` hashes a state only where a checkpoint names it and at the
  end (it hashed every intermediate state, about half of a long replay, and
  nothing read those hashes); the result, the checkpoint errors and their
  indices are unchanged.
- The save envelope did not change (no version or identity bump), so every
  earlier save opens the fast way; no slow path is left to time-slice.

Why not store a checkpoint and replay a tail: the stored state already is
the latest checkpoint, and its hash is checked on load; a tail replay would
only add work. Why not verify on the main thread in idle slices: one
command's replay costs 3 to 10 ms on a large board on a desktop, several
times more on a phone, and a slice cannot stop inside a command.

**Measured** (`scripts/perf/save-load.ts` in Node and
`scripts/perf/save-resume-browser.ts` in muted headless Chrome against
`vite preview` builds of the source before and after; no match is played:
the saves came from the user-authorised bug-hunt simulations of
`pulp_wars-2yc.94` and four nine-seat 25 x 25 Normal-AI games run for this
bead, saved every 2,000 commands). Node: one run before, fastest of three
after, a lightly loaded desktop. Browser: from navigation to the main menu's
Resume button (the save loaded and checked), with the longest main-thread
task until then.

| Save                       | Commands | Size   | Node before | Node after | Browser before (longest task) | Browser after (longest task) | Worker's replay (Node) |
| -------------------------- | -------: | ------ | ----------: | ---------: | ----------------------------- | ---------------------------- | ---------------------: |
| 9 seats, 25 x 25, round 27 |    2,000 | 288 KB |       9.3 s |      20 ms | 7.4 s (7.1 s)                 | 0.36 s (none over 50 ms)     |                  4.4 s |
| 6 seats, 20 x 20, round 51 |    3,448 | 331 KB |      13.7 s |      13 ms | 10.9 s (10.6 s)               | 0.38 s (none over 50 ms)     |                  7.0 s |
| 9 seats, 25 x 25, round 60 |    6,000 | 586 KB |      53.5 s |      18 ms | 36.6 s (36.3 s)               | 0.39 to 0.42 s (56 ms)       |                 27.2 s |
| 9 seats, 25 x 25, round 91 |   10,000 | 826 KB |      89.3 s |      20 ms | 71.4 s (71.0 s)               | 0.45 s (66 ms)               |                 53.8 s |

The deferred load of every save was compared with the full replay of its
log: the same canonical state and the same hash (`sameState=true` in
`save-load.ts`), on these four and the other bug-hunt saves. In the browser,
the same save with its human's Coins changed and its hash recomputed opens
in 0.37 s and the menu then shows the mismatch warning from the worker.
Under load the old path ran 2 to 4 times slower (the 4,000-command save of
the bug hunt: 18 s unloaded, 28 to 45 s loaded); the new one stays in tens
of milliseconds.

**Size.** The cap stays 1.5 MiB (`MAX_SAVE_BYTES_V7`). A save is the state
(150 to 175 KB on 20 x 20, 190 to 275 KB on 25 x 25, growing slowly) plus 49
to 56 bytes a command (MOVE about half of it):

| Save                        | Commands | State  | Log    | Total  | Share of the cap |
| --------------------------- | -------: | ------ | ------ | ------ | ---------------: |
| 4 seats, 20 x 20 (bug hunt) |    4,220 | 165 KB | 233 KB | 399 KB |             25 % |
| 9 seats, 25 x 25, round 53  |    5,292 | 254 KB | 269 KB | 524 KB |             33 % |
| 9 seats, 25 x 25, round 91  |   10,000 | 269 KB | 556 KB | 826 KB |             53 % |
| 9 seats, 25 x 25, round 101 |   11,208 | 275 KB | 628 KB | 904 KB |             57 % |

A nine-seat 25 x 25 game adds about 120 commands (7 KB) a round late on,
so it reaches the cap near 23,000 commands, around round 200; every game
measured ended (the human seat defeated) between rounds 17 and 101. No data
was dropped and the format was not changed for size. If games that long
matter, the log could be packed (a positional encoding of each command
kind roughly halves it; deflate shrinks a whole save about elevenfold, but there is
no synchronous one in the browser and the autosave runs after every
command), which needs a new envelope field and a loader for both forms.
`tests/unit/save-resume-deferred-v7.test.ts` checks that the real starting
save of a nine-seat 25 x 25 game with 120 KB more state and 20,000 commands
stays under the cap.

## AI turns with big armies (bead `pulp_wars-2yc.99`)

User, 2026-10-25: on an iPad, a 1:1 Dry Land 16 x 16 match whose AI had
reached about 15 cities and 50 units took "what felt like over a minute" to
move. Asked: first optimise without changing the AI's logic; failing that,
a cheaper heuristic for huge armies.

**Fixed states.** `scripts/perf/ai-turn-bench.ts generate` played Normal AI
seats (the human's seat included) from fixed setups until a seat started its
turn at a given size (the only matches played; the user authorised them to
make benchmark states). The states are checked in, gzipped, under
`scripts/perf/fixtures/ai-turn/` with how each was made in the script's
header: two 1:1 Dry Land 16 x 16 states at 10 to 12 cities and 32 to 34
units, a Dwarf against Undead 1:1 Dry Land 16 x 16 game at 8 cities / 50
units and 10 cities / 80 units (and 13 cities / 97 units in `extreme/`),
and two six-seat 25 x 25 Pangea states at 13 cities / 48 units and 15
cities / 45 units. AI-against-AI 1:1 games snowball, so a seat at 15 cities
has usually all but eliminated its rival; the Undead game is the one where
the loser held on with an army.

**Where the time goes.** In muted headless Chrome (production build,
`scripts/perf/ai-turn-browser.ts`: the save at the human's turn, End Turn,
the AI seat's turn timed until the human's turn returns; CPU profile):

| State (AI seat)             | Commands | Wall, normal playback | Main thread busy                                                          | Policy | Wall, Fast Forward |
| --------------------------- | -------: | --------------------: | ------------------------------------------------------------------------- | -----: | -----------------: |
| 10 cities, 34 units         |       38 |                16.4 s | 4.5 s                                                                     |  0.5 s |              1.8 s |
| Undead, 8 cities, 50 units  |       76 |                34.4 s | 20.4 s: board drawing about 11 s, policy 4.0 s, DOM 1.6 s, applying 1.6 s |  4.0 s |             11.4 s |
| Undead, 10 cities, 80 units |       90 |                42.6 s | 21.7 s                                                                    |  5.0 s |             16.9 s |

At normal speed **the AI's own thinking is about a tenth of its turn**. The
rest is the calm playback (beads `pulp_wars-2yc.49`, `2yc.59`): every
accepted command plays its animation (a Move 240 ms a tile, up to 1.2 s,
plus a 120 ms settle) and the AI waits while three boundaries are queued, so
a 76-command turn is about 30 s of animation however fast the policy is.
The policy runs ahead during the animation, hidden. An iPad is perhaps 2 to
4 times slower at the drawing and the policy, not at the animation clock.

In Fast Forward the wall time is the work, but a third of it was idle:
the controller ran the policy in 4 ms slices and yielded with
`setTimeout(resume, 0)`, which the browser clamps to at least 4 ms once
timers nest five deep, so the policy got about half of the main thread.

**Behaviour-preserving changes.**

| Change                                                                                                                                                                                                                                                                          | Before  | After |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----- |
| The browser passes the controller a MessageChannel scheduler (`src/app/ai-scheduler-v7.ts`, wired in `src/main.ts`): a posted message is a task of its own with no clamp; the page still renders between slices. The controller's default (tests, headless) stays `setTimeout`. | 11.4 s  | 7.5 s |
| `NormalPolicyWorkV7.assertPathWorkBounds`, run after every work unit, compares in place instead of building a table of four tuples                                                                                                                                              | (small) |       |

Measured on the Undead 50-unit state in Fast Forward, the old and new builds
back to back (busy 7.8 s and 7.7 s: the same work, the idle 3.9 s gone);
at normal speed 34.4 s and 33.0 s (playback-bound); frame intervals p95
17 ms in both. No AI command changes: `ai-turn-bench.ts check` replays two
seats' turns from all six recorded states (460 AI commands) and every
command and state hash is identical to the record made before the change,
also after merging `main`.

**Policy cost** (Node CPU profile of the Undead 50-unit turn): command
scoring 27 % (the Knight-role Overrun lookahead for every Move of a
Vampire, 15 %, most of it the Vampire's safety check on projected views),
command enumeration 15 % (movement path validation 9 %), the placement plan
14 % (reused while the board's economic facts are unchanged; each build
invalidates it), economic previews 10 %, the tactical plan 12 %
(replacement path validation 7 %). Every decision re-evaluates every unit
from a fresh view, so a turn costs roughly units x candidates x commands;
the early decisions of a big turn take 100 to 500 ms and the last ones 15 to
25 ms. No single hot spot is left that a per-view cache would remove: the
views change with every command, and the existing caches (views, economic
previews and the placement plan by fact key, danger by unit and tile)
already reuse what is reusable.

**Not done.** No lossy heuristic was added: at normal speed it would save at
most the policy's tenth of the turn, and the AI's commands would change. The
latency the player sees is the playback; the lever is to hurry playback in
a long AI turn (for example Fast durations or the 0.375 floor after the
first 20 or so boundaries of one seat's turn, or no walk for Moves that end
outside the camera), a presentation decision for its own bead. A lossy
policy shortcut for huge seats (reusing the previous decision's ranking for
far-apart units, or scoring only the units near the front plus a few
others per decision) would help Fast Forward next (7.5 s here), and needs
its own quality checks.
