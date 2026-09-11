# Headless simulation

The headless entry point runs replay verification and complete equal-rules
Normal-policy matches without DOM or Canvas imports.

The authoritative
[Ruleset-7 revision-4 biome-economy specification](../product/RULESET_7_REVISION_4_BIOME_ECONOMY.md)
defines the next map identity, deterministic simulation matrix, telemetry, and
revision-4 compatibility boundary. The revision-2 records below and
revision-3 references remain historical where that specification conflicts.

## Ruleset-7 revision-2 historical implementation contract

The commands, identifiers, inventory counts, and checked matrix below describe
the historical revision-2 implementation. They are not revision-3 evidence.
The authoritative revision-3 headless and telemetry contract is
[Ruleset 7](../product/RULESET_7.md#10-normal-ai-scheduling-headless-and-telemetry)
and supersedes conflicting revision-2 details here for subsequent implementation.

Ruleset 7 is selected explicitly as `pulp-wars-poc-7r2`; the v6 CLI default is
unchanged. Match creation uses the canonical playable boundary: map generation
creates five Coins per seat, then exactly one initial `START_TURN` awards the
first active player its two-Coin capital income, producing the initial 7/5 Coin
split. Replay command zero reconstructs that same playable state rather than a
raw generated map.

```bash
npm run headless -- replay path/to/v7-replay.json
npm run headless -- match --ruleset pulp-wars-poc-7r2 --ai-count 3 --seed 0 --max-commands 30000 --max-rounds 750
npm run headless -- batch --ruleset pulp-wars-poc-7r2 --seeds 0 --ai-counts 1,2,3 --modes rival,cooperative --max-commands 30000 --max-rounds 750
```

Only Original is registered for this revision, so an explicit faction list
must contain `original` once per seat. Auto boards remain 11/14/16 for one,
two, or three AI opponents. `runAiMatchV7` policy-drives every seat through the
same `PlayerViewV7`, public Normal policy, reducer, event stream, and canonical
hash path. Limits are 128 accepted commands per turn, 30,000 per match, and 750
rounds. A command rejection, missing candidate, non-advancing accepted command,
mandatory-work overflow, stall, or either match cap is a structured failure,
not an outcome.

Long local soaks may pass `onProgress` with a positive
`progressEveryCommands` interval. The callback receives only immutable accepted
command count, round, and active-player ID after each interval; it cannot alter
policy inputs and is absent from canonical results and deterministic hashes.

```ts
runAiMatchV7(setup, {
  progressEveryCommands: 100,
  onProgress: ({ acceptedCommands, round, activePlayerId }) => {
    // Diagnostic reporting only.
  },
});
```

The checked seed-0 1/2/3-AI × Rival/Cooperative completion evidence is
[RULESET_7_NORMAL_AI_MATRIX.json](../validation/RULESET_7_NORMAL_AI_MATRIX.json).
Regenerate its twelve actual runs from current runtime sources with:

```bash
npx tsx scripts/validate-ruleset-v7-normal-ai-matrix.ts --output docs/validation/RULESET_7_NORMAL_AI_MATRIX.json
```

The default deliberately ignores an existing artifact. An interrupted run may
continue with `--resume`, but only without runtime changes: the validator binds
the evidence to a fingerprint of `src/ai`, `src/engine`, and `src/headless` and
validates every retained cell, repeat count, zero diagnostic, outcome, and hash
before skipping it. It writes after every completed run. The fingerprint covers
runtime TypeScript sources, not harness or toolchain
configuration; changes outside those runtime directories still require their
ordinary focused validation. The checked compact
entries retain outcome, rounds, accepted-command count, diagnostics, and
command/event/checkpoint/final hashes; repeat equality compares those four
hashes. Wall-clock measurements are diagnostics and are deliberately excluded
from deterministic evidence.

Every result initializes zero-filled inventories for all 25 technologies, 13
roles, 13 improvements, command kinds, event kinds, resources, rewards, and
Defection cancellation reasons. Thus absence is represented by zero rather
than a missing key. Counters have these units:

- `commandsByKind` and `eventsByKind` count accepted commands and emitted domain
  events. Research adoption and first round count actual `TECH_RESEARCHED`
  events; role actions count accepted unit commands, while trained, damage,
  kills, losses, captures, training Coins, survivors, and survivor-per-training-
  Coin ratios retain their stated units.
- `coinsEarned` sums positive accepted-event Coin deltas: turn income, Forest
  clearing, Coin treasure, chosen Stockpile/Treasury, automatic Treasury,
  Spoils, Pillage, and Disband. `coinsSpent` sums accepted public preview or
  fixed research/training costs. The one-Coin floor counts actual income awards
  at eligible non-besieged, non-Blackout cities; negative population records
  the magnitude sampled at active-player turn boundaries.
- Resource and improvement build/remove/restore/rebuild fields count events.
  A rebuild is a later same-coordinate production build after a restoration.
  Outage and resumption count transitions across zero live output. Live-output
  histograms count improvement instances at active-player turn-boundary
  snapshots, so they are samples, not lifetime event totals.
- Pursuit activation counts the first `PURSUIT_OPENED` event only; attacks,
  kills, paths, interruption reasons, end reasons, target spacing, and public
  tree nodes are separate counts. Defection reservation duration is accepted
  commands from offer through cancellation/resolution; reply and reservation
  boundary fields count actual transitions or boundary samples.
- Saboteur concealed/detected/exposed/cooldown values are unit-turn samples at
  the named boundary. Blackout suppression is actual `suppressedCoins`.
  `actionsDenied` is the count of public Train/economic command instances that
  would be offered for that city with the active Blackout removed; it is a
  counterfactual availability measure, not observed attempted commands or
  private player intent.
- Catapult shot ranges, setup turns, siege boundaries, and screened survival
  are events or turn-boundary samples as named. Healing between volleys is the
  sum of actual `UNIT_HEALED` and explicit/automatic `UNIT_RECOVERED` HP applied
  to a target after one recorded Catapult shot and before its next recorded
  Catapult shot. Coordinated attackers sums legal public Catapult shooters at
  each shot; it is not a unique-unit count.

For the first 32 accepted-command positions, the runner serializes a public
view clone and compares public commands, applicable previews, and policy output
against that clone. These checks detect nondeterminism or dependence on object
identity, but clone equality alone is not proof against omniscience. Separate
fixtures construct byte-equal public views backed by different concealed
authority states and assert byte-equal decisions. Cooperative relationship
audits require zero allied hostile actions and zero allied-territory path steps.

The v7 API and CLI have no DOM, Canvas, animation, or presentation imports.
Browser pacing and the yielding host callback cannot change score tuples,
commands, ordered events, or hashes.

## Ruleset-6 active contract

The default or explicit v6 route creates `pulp-wars-poc-6`, schema/replay
version 6, unless it is explicitly reading a historical fixture for
incompatibility diagnostics. The ruleset-5 examples and metrics below are
historical; they cannot supply a missing v6 default.

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
- treasures generated/captured, Coin/Heavy rewards, and Heavy-to-Coin
  fallbacks;
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
settlement, and no hidden-resource query leak. Map hashes include the sorted
serialized treasure coordinates as well as the board, and post-generation PRNG
hashes include placement draws. Event and checkpoint hashes cover the exact
`TREASURE_CAPTURED` reward arm and optional spawned unit.

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
