# Headless simulation

The headless entry point runs replay verification and complete equal-rules
Normal-policy matches without DOM or Canvas imports.

## Ruleset-6 active contract

Headless creates `pulp-wars-poc-6`, schema/replay version 6, unless it is
explicitly reading a historical fixture for incompatibility diagnostics. The
ruleset-5 examples and metrics below are historical; they cannot supply a
missing v6 default.

Match and batch writers always emit required
`mapGenerationRevision: "SPATIAL_ECONOMY"`; no CLI option produces an unmarked
or ruleset-5 revision.

```bash
npm run headless -- replay path/to/v6-replay.json
npm run headless -- match --ruleset pulp-wars-poc-6 --ai-count 3 --factions original,candy,original,candy --seed 0 --max-commands 30000 --max-rounds 750
npm run headless -- batch --ruleset pulp-wars-poc-6 --seeds 0,1,2,3,4,5,6,7 --ai-counts 1,2,3 --modes rival,cooperative --max-commands 30000 --max-rounds 750
```

`runAiMatch` policy-drives every seat from `PlayerViewV6` and the public v6
query/preview APIs. Browser and headless use the same faction-tree registry,
economy recomputation, reducer, canonicalizer, and Normal selector. Neither
path may translate v5 technologies, Catapult, Stars, Animal/Lumber Mill, or a
singular pending choice into v6 values.

Every full result records the retained deterministic hashes and at least:

- `coinsEarned`, `coinsSpent`, income by city source, and negative-population
  income reductions;
- `resourcesGenerated/revealed/consumed` for all five IDs;
- build/remove counts and live contribution histograms for all eleven economic
  improvements plus Roads;
- Windmill/Sawmill cluster sizes, Forge Mine adjacency, Stoneworks adjacency
  and opposite pairs, Workshop basic diversity, Grand Works processor
  diversity, Market family count and capital-Road bonus;
- city levels beyond five, negative population occurrences, reward choices,
  3 x 3/5 x 5 footprints, and unit capacity/over-capacity states;
- research by all 25 technology IDs and by faction tree registration;
- training/actions/kills/losses by all nine mechanical roles and effective
  faction label, including Heal, Charge, Push, Breach, Roll, Wall, and Candify;
- public preview/query equality checks, relationship violations, errors,
  stalls, command/round caps, command/event/final hashes, and map/PRNG hashes.

The standard v6 turn cap remains 128 accepted commands; the runner reserves
enough final slots to resolve the entire already-pending reward/Candify queue
and End Turn, rather than a fixed two slots. The match safety caps are 30,000
accepted commands and 750 rounds because the full 25-node economy can produce
longer games. Hitting a cap is a recorded failure for an acceptance corpus, not
a terminal outcome.

Required deterministic matrices include both factions alone and alternating,
both relationship modes, all legal Auto setups, targeted Large/Huge, and a
fixed spatial fixture for every formula. Repeat runs compare byte-identical
commands, ordered events, checkpoints, and final state. Faction-only changes
must preserve terrain/resource/settlement/turn-order/post-generation PRNG when
the resolved setup is otherwise equal. V6 map corpora assert the exact resource
draw thresholds, every-resource presence, three opportunities/two families per
settlement, and no hidden-resource query leak.

Normal participation must include every technology, role, basic action,
processor, mixed building, Market/Road bonus, reward tier, and faction
substitution across the complete corpus; individual matches need not contain
all content. Cooperative audits retain zero AI-on-AI hostile actions,
territory entry, or hidden allied harm. Human-authored fixtures separately prove
the engine-permitted Candy friendly-fire cases.

## Historical ruleset-5 usage and evidence

```bash
npm run headless -- replay path/to/replay.json
npm run headless -- match --ai-count 3 --seed 0 --max-commands 10000 --max-rounds 300
npm run headless -- match --ai-count 3 --size 20 --seed 0 --max-commands 20000 --max-rounds 500
npm run headless -- match --ai-count 3 --size 25 --seed 0 --max-commands 20000 --max-rounds 500
npm run headless -- match --ai-count 3 --size 20 --cooperative --seed 0 --max-commands 20000 --max-rounds 500
npm run headless -- match --demo --max-commands 20000 --max-rounds 500
npm run headless -- match --ai-count 3 --factions candy,original,candy,original --seed 0 --max-commands 20000 --max-rounds 500
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
batch defaults emit `mapGenerationRevision: "REDUCED_VILLAGES"`. Demo remains
unmarked and therefore preserves its established v5 golden map. The lower-level
`headless.create(setup)` and replay runner preserve an explicitly supplied
unmarked setup for historical v5 reconstruction instead of silently upgrading
it.

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

Ruleset-5 headless command enumeration retains `HARVEST_FRUIT` for explored
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
asserts 15 settlements/72 Mountains/96 Forests; Huge asserts 22/113/150. Auto
sizes assert the exact POC Rules table. Equal non-mode setup and seed must yield
the same map hash in `RIVAL` and `COOPERATIVE`, because mode consumes no map
draw. Cooperative runs additionally assert zero AI-on-AI Attack/Capture,
zero new allied-territory exploration, and no allied-territory path steps.
Ruleset-1/2/3/4 replay fixtures are compatibility diagnostics only; active
headless replays use version 5 and reject all legacy versions as incompatible
rather than reinterpret them. Headless imports no presentation plan: Archer
arrow timing, sprite pulse, dock geometry, and reduced motion cannot affect its
commands, metrics, or hashes.

Within version 5, setup marker absence is also meaningful compatibility data.
Unmarked historical replays regenerate Auto 4/6/8, Large 18/17/16, and Huge
28/27/26 neutral villages; marked current replays regenerate 3/4/6, 13/12/11,
and 20/19/18. Both paths remain deterministic and checkpoint-verified.

Ruleset-5 match and batch commands accept an exact comma-separated faction list
in seat order. Its length must equal `aiCount + 1`; `original` and `candy` are
the only values. Omission means all Original. Demo rejects a faction override
and remains three Original seats. Faction selection never changes map hashes or
PRNG state for otherwise equal setup.

Headless command enumeration includes Candy actions under the same filtered
`PlayerView` as the browser. A Roll summary contains only actor and cardinal
direction; hidden victims never enter candidates. Results add
`factionsBySeat`, `wallsBuilt`, `wallsDestroyed`, `rolls`,
`rollDamageByRelationship`, `rollPathCellsRevealed`, `candifyStarted`,
`candifyChoices`, `tilesCandified`, and `commands/actionsByEffectiveUnitLabel`.
Unit tallies never count Chocolate Walls. Every corpus verifies ordered-event,
command, and final-state hash equality on repeat.

The v5 required matrix covers all-Original, all-Candy, and mixed alternating
factions for 1/2/3 AI in Rival and Cooperative modes. Focused deterministic
fixtures cover each board edge/direction, hidden units along Roll paths,
friendly/allied casualties, promoted 15-HP survival, wall destruction, unique
and tied Candify cities, hostile-territory connectivity rejection, pending
choice save/resume/replay, and wall persistence after owner elimination. Soak
evidence must contain all four Candy labels, Candy Catapult Candify, at least
one Roll victim, wall build/attack/destruction, neutral and hostile Candify,
and zero Normal-policy allied casualties or allied annexation in Cooperative
mode. A legal human-authored friendly-fire replay remains required to prove the
engine permits it.
