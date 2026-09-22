# Ruleset 7 command processing performance

Run `node_modules/.bin/tsx scripts/benchmark-ruleset-v7-command-processing.ts` from the repository root. The probe writes `evidence.json` to a new system temporary directory and prints its path. It does not use the browser, the user's game server, or the user's save. The Node runtime and CPU/load metadata are recorded with the samples. The browser presentation and next-animation-frame scheduling proxy are measured separately by `scripts/benchmark-board-presentation-v7.ts`; neither proxy measures completed paint.

The command probe checks a 25×25 `parseGameStateV7`-valid state with 63 total units, including 60 ready human Fighters placed across the board. It records 30 cold command queries on fresh public-view clones after five warmups, with a same-view cache hit after each cold query. There are 459 complete ordered commands. It also accepts and times an offered Move against that full busy state through the authoritative reducer, checking the resulting state and event hash. A separate public-view-only stress fixture reproduces the board presentation probe's 25×25 Grass board and 60 ready units; it has 542 commands and cannot be dispatched or saved. Keeping these fixtures separate prevents a warm cache hit or an invalid synthetic state from standing in for a cold authoritative query.

For the controller path, 35 independent controllers launch the same seed-11 25×25 opening with isolated memory storage, then each dispatches one offered Move. The first five are warmups; 30 are measured. The timed dispatch includes the controller's transition notifications, reducer, replay append, human projection, event projection, and save-envelope preparation. Save flushing is outside the timed interval. Exact command, AI-ready, economic-preview, busy acceptance, before/after/event boundary, replay, and raw serialized save SHA-256 values are checked against retained values from the preceding main commit. The probe also times canonical JSON, full state hash, replay append, and certified save-envelope creation in isolation. Those component timings overlap and must not be added together.

Two paired runs on an Intel i5-7360U Mac, Node 24.21.0, compared archived main commit `b3eea917` with the optimized worktree using the same probe. Times are milliseconds; these are diagnostic observations, not portable gates.

| Measurement, 30 warmed samples            | Before run 1 / run 2 | After run 1 / run 2 |
| ----------------------------------------- | -------------------: | ------------------: |
| Valid 60-ready cold query median          |          2.86 / 2.84 |         2.76 / 2.12 |
| Public-view 542-command cold query median |         9.71 / 10.31 |         3.00 / 3.45 |
| Natural Move dispatch median              |        21.58 / 21.45 |       20.72 / 20.86 |
| Full state hash median                    |        13.41 / 13.06 |       13.21 / 11.93 |
| Replay append median                      |        13.15 / 13.03 |       13.28 / 13.11 |

The controller now uses its current serialized-boundary human view for offer checks and skips canonicalizing commands of other kinds. An exact frozen offered-object reference can pass the offer check directly; malformed commands and decorated copies still face canonical equality. Public movement preparation indexes occupied cells and hostile ZOC by public-view identity. It keeps the original path-validation order and returns the same sorted command list on both fixtures.

The large public-only stress query improved consistently. The valid-state query and natural dispatch changed by less than a millisecond in one paired run, so this evidence does not establish a robust end-to-end speedup. Full-state canonical hashing inside replay append remains the measured dominant Move cost. Save-envelope creation reuses the accepted replay certificate and was about 0.07 ms median in the isolated measurement. A future hash implementation change must preserve the checked replay and raw save bytes. The controller probe runs in Node with no DOM or Canvas work, so browser movement-start timing still needs the board probe and browser smoke gate.

The additional valid busy-state authoritative Move took 6.47 ms median before and 6.50 ms after in one paired run. Its unchanged result hash confirms that the public query optimization did not change authoritative movement. This reducer timing excludes replay append and controller presentation.

## Canonical hashing optimization

The canonical hash path now uses `TextEncoder`, byte-sized SHA-256 padding, and a typed word schedule instead of building and copying large arrays of boxed byte numbers. The Unicode key comparator reads code points by index instead of allocating code-point arrays for every sort comparison. The strict serializer still checks sparse arrays, property descriptors, symbols, plain-object prototypes, safe integers, and cycles on every call. No object-level hash or serialization cache was added.

The same command probe was run on the preceding main revision and after the change on the same Intel i5-7360U Mac with Node 24.21.0. Each line uses 30 measured samples after five warmups. The dispatch line comes from a new controller, state, and replay per sample; save flushing is outside the timed interval. All ten retained exact command, state, AI-ready, replay, and raw-save hashes matched. Times are milliseconds and remain machine/load-specific observations.

| Measurement           | Before median / p95 | After median / p95 |
| --------------------- | ------------------: | -----------------: |
| Natural Move dispatch |       19.71 / 22.20 |      12.44 / 16.46 |
| Full state hash       |       12.27 / 14.79 |        6.14 / 6.46 |
| Replay append         |       12.31 / 20.65 |        6.19 / 6.67 |
| Canonical JSON alone  |         4.97 / 6.33 |        3.04 / 3.41 |

The extended probe also times hashing and replay append on `structuredClone` copies made outside each timed interval, and checks that their state/replay hashes match. Two 30-sample runs measured 4.41/4.43 ms median for fresh-state hashing and 6.26/6.41 ms for fresh-state replay append, beside 4.35/4.39 ms and 4.44/4.50 ms for repeated same-state component calls. Independent-controller dispatch measured 10.89/11.01 ms in these extended runs. The cold-clone checks are diagnostic; independent-controller dispatch is the actual end-to-end evidence. Component timings overlap with dispatch and cannot be added together. The natural Move still spends several milliseconds in serialization and hashing; the separate busy-state reducer was about 6–7 ms in these runs. Those residuals remain relevant when judging movement latency against the browser probe.

`npm test -- tests/unit/canonical.test.ts tests/unit/persistence-v7.test.ts tests/unit/persistence-browser-v7.test.ts tests/replay/replay.test.ts tests/replay/golden-replay.test.ts --maxWorkers=1 --testTimeout=30000` checks exact replay/save behavior, Unicode order including unpaired surrogates, rejected input classes, nested mutation, and SHA-256 against Node crypto over padding boundaries and long messages. For a bounded browser proof, run `CHROME_PATH=<headless-chrome> node_modules/.bin/tsx scripts/verify-canonical-browser.ts`; it bundles the browser-target canonical module into a temporary page and checks 11 exact canonical JSON and SHA-256 vectors against Node before removing the temporary files. This proof passed in Chrome 153. Full browser game behavior is covered by the separately assigned smoke gates.

## Chromium reference-budget diagnostic

Run `CHROME_PATH=<headless-chrome> node_modules/.bin/tsx scripts/benchmark-ruleset-v7-reference-browser.ts` for a parse-valid 16 × 16 state with four players and 16 units each. Add `--human-heavy` for a separate legal stress state with 61 human units and one unit for each opponent; add `--cpu-profile` to save a Chrome CPU profile. Each run uses actual desktop DPR 2, ten warmups, and 30 measured cold legal-action queries and accepted Move validation/reductions. Fresh input clones are made before the timed blocks. Node and Chrome state, command, and accepted-result hashes must agree. The probe writes unique temporary evidence and uses an isolated Chrome profile.

On the Intel i5-7360U Mac and Chrome Headless Shell 153.0.8010.48, the balanced case had 104 offered commands and measured query median/p95 0.9/8.4 ms and validation-plus-reduction median/p95 7.4/15.4 ms. A 61-human-unit case had 137 offered commands and measured 2.4/15.5 ms and 6.1/17.7 ms respectively in one run. A later profiled run of that same human-heavy fixture measured 1.3/1.8 ms and 2.9/3.8 ms; one reduction sample reached 15.9 ms. The architecture's p95 budgets are 2 ms for legal-action query and 4 ms for validation plus reduction. These runs do not establish repeatable compliance with either budget under this machine's varying load.

The human-heavy CPU profile's active reduction samples concentrated in exact-key schema checks (`hasExactKeysV7`, 24 samples), another schema helper (7), deep freezing (6), and movement uniqueness (4). Active query samples were spread across public unit command generation (6), movement-path validation (4), and smaller helpers. Full-state canonical hashing appeared outside the timed operations during parity checks. This is a diagnosis of the measured workload, not evidence that a new runtime change is safe or needed; the large p95 variation remains a separate performance follow-up.
