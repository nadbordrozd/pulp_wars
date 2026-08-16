# Headless simulation

The headless entry point runs replay verification and complete equal-rules
Normal-policy matches without DOM or Canvas imports.

```bash
npm run headless -- replay path/to/replay.json
npm run headless -- match --ai-count 3 --seed 0 --max-commands 10000 --max-rounds 300
npm run headless -- match --ai-count 3 --size 20 --seed 0 --max-commands 20000 --max-rounds 500
npm run headless -- match --ai-count 3 --size 25 --seed 0 --max-commands 20000 --max-rounds 500
npm run headless -- match --ai-count 3 --size 20 --cooperative --seed 0 --max-commands 20000 --max-rounds 500
npm run headless -- match --demo --max-commands 20000 --max-rounds 500
npm run headless -- batch --seeds 0,1,2,3,4,5,6,7 --ai-counts 1,2,3 --max-commands 20000 --max-rounds 500
npm run headless -- batch --size 25 --seeds 0 --ai-counts 1,2,3 --max-commands 20000 --max-rounds 500
```

`runAiMatch` drives every seat through the same filtered `PlayerView`, public
query, Normal policy, and `applyCommand` path. The runner policy-drives the
nominal human externally; it never rewrites serialized `humanPlayerId`, so
browser/headless cooperative relationships and canonical state agree. Each full result contains accepted commands, ordered events, a
checkpoint hash after every command, the final canonical hash, and explicit
error/stall diagnostics. An AI turn is capped at 128 accepted commands with
space reserved to resolve a pending reward before End Turn.

`headless.createDemo()` launches the exact canonical Demo Match setup, while
`match --demo` runs all three seats under the Normal policy from that same
scenario. It fixes Huge/two-AI/rival/Coral/seed `0xdecafbad`; ordinary match and
batch defaults remain unchanged.

`runAiBatch` returns compact outcomes, rounds, command counts, hashes, errors,
and stalls. CI fixes seed `0` for all three supported opponent counts; the
documented soak corpus is seeds `0..7` across 1/2/3 opponents (24 matches).
Every run uses 20,000 commands and 500 rounds as hard safety caps. Corpus
changes are intentional golden changes: compare per-entry final hashes as well
as aggregate completion/error/stall counts.

Without `--size`, headless match and batch retain the Auto sizes 11/14/16 for
1/2/3 AI. `--size 20` explicitly selects Large and `--size 25` selects Huge.
Without `--cooperative`, `aiMode` is `RIVAL`; the flag selects
`COOPERATIVE` without changing which seat is nominally human. Headless may
policy-drive that human seat, but relationship legality still derives from the
stored `humanPlayerId`. Fixed Huge completion evidence
uses seed `0` for each AI count with the same 20,000-command and 500-round hard
caps; measured wall time is recorded separately from deterministic results.

Blind movement is an optimistic public intent. If an unexplored destination
contains a hidden unit or an unenterable mountain, the engine accepts the Move,
reveals radius one, consumes activation, leaves the unit before the obstruction,
and records `UNIT_MOVE_INTERRUPTED`. Thus hidden state cannot alter the offered
candidate or create a rejected-command retry loop. A multi-step intent that
discovers enemy ZOC is similarly accepted and truncated on its last legal step.

Ruleset-4 headless command enumeration includes `HARVEST_FRUIT` for explored
fruit in an owned, non-besieged city territory when Organization and 2 stars
are public, at every city level. It includes `HUNT_ANIMAL` under the
Hunting/2-star/Animal rule, `BUILD_LUMBER_MILL` under the
Forestry/3-star/empty-Forest rule, and `BUILD_MINE` under the
Mining/5-star/explicit-Ore rule; it never offers a resource command for an
unexplored tile. `WAIT` is enumerated once for each unhandled active unit but
Normal excludes it from policy candidates. Canonical candidate order is
command kind, target `(y, x)`, then stable entity/content ordinal; none consumes
PRNG.

Every full and compact result records `commandsByKind`, `eventsByKind`,
`researchByTech`, `trainedByUnit`, `actionsByUnit`, `terrainCounts`,
`resourceCounts`, `improvementCounts`, settlement opportunity min/max and
histogram, Catapult attacks/kills, outcome/rounds/caps/errors/stalls, and
command/event/final hashes. The corpus validates exact global Mountain/Forest
counts, at least two opportunities per settlement, at least two distinct
settlement resource mixes across the corpus, at least one Animal per board, and
no out-of-territory resource.
Repeated setup/seed runs compare command, event, and final-state hashes. Large
asserts 20 settlements/72 Mountains/96 Forests; Huge asserts 30/113/150. Auto
sizes assert the exact POC Rules table. Equal non-mode setup and seed must yield
the same map hash in `RIVAL` and `COOPERATIVE`, because mode consumes no map
draw. Cooperative runs additionally assert zero AI-on-AI Attack/Capture,
zero new allied-territory exploration, and no allied-territory path steps.
Ruleset-1/2/3 replay fixtures are compatibility diagnostics only; active
headless replays use version 4 and reject all legacy versions as incompatible
rather than reinterpret them. Headless imports no presentation plan: Archer
arrow timing, sprite pulse, dock geometry, and reduced motion cannot affect its
commands, metrics, or hashes.
