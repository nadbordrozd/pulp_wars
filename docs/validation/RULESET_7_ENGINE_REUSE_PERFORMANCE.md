# Ruleset 7 engine reuse performance

Run the fixed-command benchmark from the repository root with a captured state
and an ordered command JSON file:

```bash
node --import tsx scripts/benchmark-ruleset-v7-engine-reuse.ts \
  --state /path/to/captured-state.json \
  --commands /path/to/ordered-commands.json \
  --output /tmp/ruleset-v7-engine-reuse.json
```

The state file may be a game state or an object with a `state` property. The
command file may be an array, an object with `commands`, or the exact parity
format with `before.commands`. The probe starts every sample from a fresh
structured clone, applies only the supplied commands, and records the final
state, event, and ordered land/sea/combined-network/Road hashes. It also records
strict versus certified reducer inputs, checked outputs, sea-geometry cache
hits, builds, skips, and bounded entry count. It makes no AI decisions and has
no timing assertion.

The accepted-state certificate is identity-bound and registered only by the
reducer after an output passes `checked()` and is deeply frozen. It skips the
next redundant reducer input parse. External, parsed, cloned, mutable,
shallow-frozen, and independently deep-frozen values remain strict inputs.
Every accepted output still passes the complete state parser.

Sea-route geometry contains only explored water reachability between current
Port coordinates at the exact five-step cap. Its collision-free structural key
contains board dimensions, Navigation state, every traversable explored water
coordinate, and every candidate Port coordinate. It intentionally excludes
city IDs: each hit translates the current coordinates back through current
tiles, then reevaluates ownership, city assignment, blockade, alliance, unit
HP/form, Roads, and original-capital facts. The LRU holds at most 16 geometries;
calls without Navigation or at least two candidate Ports do not construct the
water geometry.

On the retained revision-11 16 x 16 state at command index 5524, the exact next
100 commands ended at state hash
`0d1a0e233e50574a32972028d9672e5a1decce71bbe44128464fddffbf09ab8f`
before and after this change. Eight same-process samples on Node 24 produced a
warm median of 1241 ms before and 667 ms after, a 46% reduction. Every changed
sample reported 1 strict input, 99 certified inputs, 100 checked outputs, 4
geometry builds, 1082 geometry hits, and 4 retained entries. Timing varies by
machine and load; the hashes and counters are the acceptance evidence.
