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
