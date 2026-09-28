# Ruleset 7 Public Planning Performance

This evidence freezes exact public command, potential, spatial-score, and work
operation outputs while measuring the query optimization introduced after
commit `2a3c029f92a63ea33c7164b05ad0a91d134c1e7b`. The pre-optimization
`src/engine/v7/query.ts` SHA-256 is
`5ec37076bf45e1f4e1546d6a52b0ae8aa62d97cd65fa81d70de94d0f09069163`.

Run the Node 24 benchmark with:

```text
npx tsx scripts/benchmark-ruleset7-public-planning.ts --output /tmp/pulp-wars-public-planning.json
```

Each view runs in an isolated subprocess with a budget of one operation. This
keeps one case's retained heap and garbage collection from contaminating the
next case. The script records p50, p95, p99, and maximum `advance(1)` duration.
Timing is diagnostic and never enters query output, ordering, or scheduling.

The checked JSON records this Node 24.21.0 run:

| Public view           | Operations |        Before |        After | Ratio |  Before p95 / max |  After p95 / max |
| --------------------- | ---------: | ------------: | -----------: | ----: | ----------------: | ---------------: |
| Retained command 1100 |      4,100 |    132.292 ms |    48.950 ms | 0.370 |  0.052 / 3.882 ms | 0.020 / 2.682 ms |
| Legal 25 by 25        |    400,754 | 18,821.613 ms | 1,838.899 ms | 0.098 | 0.110 / 10.010 ms | 0.019 / 7.314 ms |
| Captured command 300  |     66,220 |  2,982.629 ms |   347.704 ms | 0.117 |  0.097 / 5.828 ms | 0.017 / 2.925 ms |
| Captured command 425  |     94,418 |  4,711.614 ms |   566.626 ms | 0.120 | 0.101 / 13.234 ms | 0.017 / 2.887 ms |

The command-300 and command-425 fixtures preserve the late 14 by 14 public
views captured from the capped seed-7111 match. Their file SHA-256 values are
`9a792f9127ab232046c53e080b56d707963b6cf66da4f7fb08df258254c0217b`
and `dd6dbf83df2e64810fd9bc2f358ebe50fcc2102cdc56c31f1555eeb316bdb2c0`.
The generated legal 25 by 25 view retains the independently frozen view hash
`213a55e5a88f09e0b91186e654ff72c15c73214d94e7faa59856cf15f479cd40`.

The recorded before timings came from the published commit with the new
benchmark and captured fixtures mounted read-only into a detached worktree:

```text
git worktree add --detach /tmp/pulp-wars-public-planning-baseline 2a3c029f92a63ea33c7164b05ad0a91d134c1e7b
ln -s "$PWD/node_modules" /tmp/pulp-wars-public-planning-baseline/node_modules
ln -s "$PWD/scripts/benchmark-ruleset7-public-planning.ts" /tmp/pulp-wars-public-planning-baseline/scripts/benchmark-ruleset7-public-planning.ts
ln -s "$PWD/tests/fixtures/ruleset-v7-public-planning-command-300.json" /tmp/pulp-wars-public-planning-baseline/tests/fixtures/ruleset-v7-public-planning-command-300.json
ln -s "$PWD/tests/fixtures/ruleset-v7-public-planning-command-425.json" /tmp/pulp-wars-public-planning-baseline/tests/fixtures/ruleset-v7-public-planning-command-425.json
(cd /tmp/pulp-wars-public-planning-baseline && node --preserve-symlinks-main --import tsx scripts/benchmark-ruleset7-public-planning.ts --output /tmp/pulp-wars-public-planning-before.json)
```

The optimization preserves immutable graph identities and exact cache scope.
A derived graph reuses its predecessor's naval connectivity only when the
single mutation cannot change Roads or active Ports. Placement totals update
the changed tile and radius-one processor or Market neighbors because those
totals do not include road population or trade sets. Road and active-Port
mutations retain independent connectivity computation. Tests freeze the
pre-optimization result hashes across budget-one and varied slicing, fresh
byte-equal views, late Road-heavy positions, and cold Port, Shipyard, and
redevelopment transitions.

## Revision 11 city-query facts

The later Revision 11 query pass preserves those outputs and operation counts
while reusing immutable public siege and city-footprint facts. Numeric array
reads provide a deterministic measure of the repeated scans removed from cold
command enumeration:

| Public view           | Tile reads before | Tile reads after | Unit reads before | Unit reads after |
| --------------------- | ----------------: | ---------------: | ----------------: | ---------------: |
| Retained command 1100 |            25,978 |            8,243 |             2,913 |              169 |
| Captured command 300  |            47,215 |            4,915 |             6,757 |              277 |
| Captured command 5524 |            36,319 |            3,832 |            10,627 |              346 |

The command-5524 evidence is the captured 16 by 16 Rival-3 view with public
view hash
`a8aa4850a31e1fe7c127bd8930b8621f51a5b32e8d4e14a5864c979953687e10`.
Its 95-command hash remains
`84491be995a7564a8743a9c26a20d533b2fa649b34fa150c205712c01e7e4b13`;
its 16,582-operation planning result remains
`c1b0bd4b222d6ee155ae44a693ca7bd975dffa8d5876439172b5226a48651ba8`.
Eleven warmed Node 24 runs at budget 113 measured median query time falling
from 1.973 ms to 1.199 ms and median query-plus-planning time from 33.205 ms to
30.136 ms. Timings remain diagnostic; exact hashes and operation counts are the
acceptance boundary.

## Revision 11 stable-fact reuse

Later Revision 11 policy work reconstructs a fresh public view after every
accepted command, although its economic graph commonly stays unchanged. The
planner now scans an exact public dependency key incrementally and retains 24
completed entries. On a hit it rebuilds the ordered result from the current
commands one candidate per operation. Cold operation counts therefore add one
operation per public tile, city, and unit plus one key-finalization operation;
warm counts are that scan plus one operation per current candidate. These are
physical-work counters: skipped placement and reservation calculations are not
added to a hit. The retained command-1100 fixture is 4,235 cold operations and
201 warm operations, with unchanged result hash
`7b6cacc305a8204edcf6c7a890873dd770b74e1d69815324dd7dd8467841530f`.

The planning key maps directly to the reads of the reused computations:

- economy-graph and spatial reads use explored state, terrain, resources,
  improvements, Roads, sites, territory assignment, dimensions, technology,
  original capital, city ownership/coordinates/growth/expansion and
  `isCapital`;
- exactness and placement gates use public city count, fog, pending city
  rewards, treasures, and remaining monument entitlements;
- income and connectivity use owned Port status plus land/sea graph facts;
- siege and prospective Port scoring use hostile occupation of owned city
  centers and hostile non-land coordinates;
- economic-preview reuse has a separate key adding Coins, complete public city
  records (including `cityActionAvailable`), improvement values, and published
  trade lists, and still checks that the current view offers the command.

Technology capability tables are separately memoized by the exact sorted
technology array. The 32-entry table contains only deeply frozen rules output.
Planning results are reconstructed with current command objects, preview values
are privately cloned, and both retained maps evict their oldest entry.

The captured round-165, command-9192 Rival-0 state was run for the same next 100
commands with the frozen draft AI on both the published `b645fa0` engine and
this change. Three alternating pairs on Node 24 began at load averages
3.86/4.10/8.99 and ended at 5.24/4.42/8.83. Baseline totals were 7,104, 8,823,
and 8,681 ms; changed totals were 6,691, 6,830, and 5,936 ms. The paired total
savings were 5.8%, 22.6%, and 31.6% (median 22.6%). Median policy time fell from
5,031 to 3,156 ms. Every sample chose the same ordered command-kind counts and
ended at state hash
`0af93dbda805f885ff0190a0258c4100172e515186e7701d0e52c267b1b95e26`.
These elapsed times are diagnostic because host load varied; the exact output,
bounded cache, invalidation, interleaving, and operation-accounting tests are
the acceptance evidence.
