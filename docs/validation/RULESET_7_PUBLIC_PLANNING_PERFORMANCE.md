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
