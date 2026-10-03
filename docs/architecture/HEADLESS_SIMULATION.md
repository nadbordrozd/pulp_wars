# Headless simulation

The headless entry point runs replay verification and complete equal-rules
Normal-policy matches without DOM or Canvas imports.

Current Ruleset 7 rules, including map generation, are described by
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md) for the four
playable factions (Human, Undead, Goblin, and Dinosaur); the Martian seats
below follow the [Martian overlay](../product/RULESET_7_MARTIANS.md), which
is not folded into it. The headless CLI
accepts only the current Ruleset 7 identity, `--ruleset pulp-wars-poc-7r25`
(plus `pulp-wars-poc-6` and `pulp-wars-poc-5`). Since
[revision 21](../product/RULESET_7_REVISION_21_ACHIEVEMENTS.md) the
`achievements` metrics carry all seven achievements: `progressMaximum` and
`unlockRound` per achievement, and `unlockedSeats`, the number of seats that
unlocked each one in the match. The
[Ruleset-7 revision-4 biome-economy specification](../product/RULESET_7_REVISION_4_BIOME_ECONOMY.md)
is historical: it introduced the simulation matrix, telemetry, and revision-4
compatibility boundary. The revision-2 records below (including their
`pulp-wars-poc-7r6` command examples, which the current CLI rejects) and
revision-3 references remain historical.

## Ruleset-7 revision-13 factions and Undead telemetry

Revision 13 match and batch commands accept a seat-ordered `--factions` list
with exactly `aiCount + 1` values, seat 0 first. Values are `original` (alias
`human`), `undead`, (revision 17) `goblin`, or (revision 19) `dinosaur`,
case-insensitive; omission means all Human. A batch
with `--factions` needs exactly one `--ai-counts` value, and each batch entry
records its `factions`.

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type pangea --factions original,undead --seed 3 --max-rounds 200
npm run headless -- batch --ruleset pulp-wars-poc-7r25 --ai-counts 1 --factions undead,original --seeds 0,1,2 --map-types dry-land,lakes --max-rounds 200
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type pangea --factions goblin,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type pangea --factions dinosaur,original --seed 3 --max-rounds 150
```

A Dinosaur seat
([current rules section 19](../product/RULESET_7_CURRENT.md#19-dinosaur-faction-rules);
[revision-19 overlay](../product/RULESET_7_REVISION_19_DINOSAURS.md)) plays
with the Normal policy on the Dinosaur registration. It trains Cavemen and
Shamans, lays every other role as an Egg (`LAY_EGG`, counted with its role's
production and Coins in the role inventories), and plays Eggs, Hatch, Grow,
and the Triceratops's Charge!
([revision 20](../product/RULESET_7_REVISION_20.md); the Stampede command
is removed) with the
[Dinosaur policy](NORMAL_AI.md#revision-19-dinosaur-play-pulp_wars-c875)
(`pulp_wars-c87.5`, `pulp_wars-0hi.2`); the Dinosaur telemetry follows
(`pulp_wars-c87.8`). The balance matrix
(`scripts/ruleset7-undead-balance-matrix.ts`) reports Charge! in place of
the Stampede counters, in the `charge` block of each Dinosaur seat and of
the summary: attacks by a Triceratops, split by run-up (0, 1, 2), with
their kills, Pushes, follows, blocked Pushes, Field Defense destroyed,
attacks that ignored fortification, and attacks by a dinosaur that ignored
City Walls through Wallbreaker.

Every v7 result adds, beside the mechanical-role inventories:

- `factionsBySeat` and `factionRoles[faction]` with trained, training Coins,
  damage, kills, losses, and captures per mechanical role, credited to the
  owner's faction of the unit that trained, dealt, died, or captured;
- role and faction damage/kills that include retaliation, Lich and
  Battleship splash, and Wail (previously only primary attack damage counted);
- `capacity.overcapacityStatesByFaction` and `maximumOvercapacity` (largest
  assigned-minus-capacity excess at an active-player turn boundary); and
- `undead`: Wail uses, targets, zero-damage targets, damage, and kills;
  splash hits/damage/kills (all splash) and Lich splash damage/kills; Infect
  conversions split by attack and retaliation and by hostile city or village
  center, plus captures by a Zombie that rose on a center; Raise Dead uses,
  Skeletons raised, and the largest single raise; Devours, Devour healing, and
  full-HP denials; Lifesteal heals and HP; Graves created, maximum open at a
  turn boundary, and remaining at the end; raised-Skeleton kills, losses, and
  captures; and Disbands (with refunded Coins) of raised Skeletons and of any
  rising.
- Revision 14 ([overlay](../product/RULESET_7_REVISION_14_BALANCE.md#13-headless-telemetry))
  adds to `undead`: `plagueApplications` (units newly plagued by Lich
  attacks), `plagueSpreads`, `plagueDamageEntries`, `plagueDamage`,
  `plagueDeaths`, `plagueCleared` (source Lich left the board),
  `plagueCures` and `bittenCures` (Tend Wounded), `bites`, `bittenRisings`,
  `plaguedMaximum`/`bittenMaximum` (most at once at a turn boundary),
  `plaguedRemaining`/`bittenRemaining`, and `unansweredAttacks` (Vampire
  attacks that drew no retaliation). The Market output histogram uses the
  revision-14 Market value (no Commerce doubling).
- Revision 15 ([overlay](../product/RULESET_7_REVISION_15_BALANCE.md#8-headless-telemetry))
  adds `plagueExpired` (infections that ended after their third turn) and
  `plagueTurnsAtEnd` (infections that ended after 0, 1, 2, or 3 Start Turn
  damage steps, by any cause; infections still running at the end are not
  counted).
- `runAiMatchV7` accepts `initialGame` (a created first turn whose state
  carries exactly the setup), which parity tests use to start from a
  revision-13 board.

The Human-vs-Undead balance matrix (`pulp_wars-vkq.10`) is
`npm run balance:ruleset7-undead`; its parameters, output, and results are in
[the Undead balance report](../validation/RULESET_7_UNDEAD_BALANCE.md).
Revision 17 (`pulp_wars-0ao.7`) adds the Goblin pairings (`GH`, `HG`, `GU`,
`UG`, `GG`), the three-faction four-seat mixes (`GHUG`, `HUGH`, `UGHU`), and
the Goblin telemetry (`summary.goblin`, computed by replaying each Goblin
match's command log); see
[the Goblin balance report](../validation/RULESET_7_GOBLIN_BALANCE.md).
The per-match headless result itself has no Goblin block: losses count every
death (Kaboom and explosion deaths included), Bomb Chucker bomb splash (own
units included) counts in the attacker's damage and kills and in the
`undead` splash counters like any splash, and explosion damage and kills are
credited to no role or faction. Faction-keyed fields (`factionRoles`,
`overcapacityStatesByFaction`) include a `GOBLIN` entry.

## Martian seats (`pulp_wars-t6s.2`)

`--factions` also accepts `martian`
([Martian overlay](../product/RULESET_7_MARTIANS.md)), on every map type
including `showcase`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type pangea --factions martian,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type showcase --ai-count 3 --factions martian,human,undead,goblin --max-rounds 50
```

The engine bead added no Martian policy: a Martian seat played with the
generic Normal policy and never issued `BEAM_DOWN`, `MIND_CONTROL`, or
`TRACTOR_BEAM`. The Martian policy (`pulp_wars-t6s.3`) is
[summarized in the Normal AI notes](NORMAL_AI.md#martian-play-pulp_wars-t6s3):
a Martian seat now uses all three, and every seat plays against Martian
Shields, rays, Brains, and Motherships.

Every v7 result carries a `martian` block (all zero without a Martian
seat), computed from the events of the accepted commands:

- `shieldAbsorbed` by source (`attack`, `retaliation`, `splash`, which
  includes Pierce, `wail`, `blast`), `hitsFullyAbsorbed`, `rechargeEvents`,
  `rechargedShields`, and `endTurnRechargeEvents` (Force Fields);
- `raysFull`, `raysHalf` (`raysHalfMoved`, `raysHalfCooling`), `rayDamage`,
  `rayKills`, and `raysIgnoringFortification` (the Disintegrator);
- `pierceHitsHostile`, `pierceHitsFriendly`, `pierceDamage`, `pierceKills`;
- `beamDowns` and `beamDownPassengers` by role; `mindControls`,
  `mindControlTargets` by role, `mindControlTargetHp`, `thrallsCollapsed`,
  `thrallsMaximum`, and `thrallCaptures`; `tractorBeamsOwn`,
  `tractorBeamsHostile`, and `tractorBeamsOffCenter`; `psychicCommands`;
- `selfLaunches` (machines that embarked without a Port) and `flyoverMoves`
  (flyer Moves over a unit of another player).

`commandsByKind` counts the three new commands and the event counters the
four new events like any other kind. Faction-keyed fields include a
`MARTIAN` entry. The pressure telemetry script below accepts the pairing
letter `M`; the balance matrix (`scripts/ruleset7-undead-balance-matrix.ts`)
gets its Martian pairings and summary with the balance bead
(`pulp_wars-t6s.5`).

## Ice Folk seats (`pulp_wars-7g3.3`)

`--factions` also accepts `ice` (or `ice_folk`)
([Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md)), on every map type
including `showcase`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type dry-land --factions ice,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type showcase --ai-count 3 --factions ice,human,undead,goblin --max-rounds 50
```

The engine bead adds no Ice Folk policy. An Ice Folk seat plays with the
generic Normal policy on the Ice Folk registration: it trains, moves,
attacks, captures, researches, and builds like a Human seat; its units
Glide and take Snow cover wherever the generic route search and attack
choice happen to put them, and its Yetis cross Mountains when a Move offers
it. It never issues `THROW_BOLAS` or `COLD_SNAP` (the policy gives an
unknown command kind no priority), so Chill comes only from the Frost
Giant's Cold Aura and Shatter is rare. The other factions' policies attack
Ice Folk units with their ordinary previews, which include Snow cover, the
Blizzard, and Shatter. The Ice Folk policy is `pulp_wars-7g3.4`.

Every v7 result carries an `iceFolk` block (all zero without an Ice Folk
seat; `src/headless/ice-folk-telemetry-v7.ts`), computed from the events of
the accepted commands and the states around them:

- Chill: `chillEvents` and `chillApplications` by source (`BOLAS`,
  `COLD_SNAP`, `COLD_AURA`), `newFreezes`, `reapplications`, targets by
  faction and role, `sluggishTurns` and `sluggishTurnsWithoutAction`, and
  `tendCures`;
- Shatter: `shatters` by attacker role, victim faction and role, the source
  of the victim's Chill, and the setup that brought the victim into the
  window (`CHARGE_AT_FULL_HP`, `SWEEP_FLANK`, `SNOW_HUNTER`, `BOULDER`,
  `YETI`, `OTHER_HIT`, `EARLIER_DAMAGE`); `shatterRetaliationAvoided`,
  `shatterGravesDenied`, and `shatterBlastsDenied`;
- abilities: `bolasThrows` by target role and `bolasFollowedByShatter`;
  `coldSnapCasts`, `coldSnapTargets`, `witchTurnsWithoutTarget`,
  `witchTurnsNearAllies`, Witch deaths (rounds and killers by role), and
  `sledDeaths`; Sweep attacks by flank victims, flank damage and kills, and
  `trampledFieldDefense`; Rockfall shots, damage, and kills; Boulder throws
  (Planted or moved), damage, ignored fortification, and destroyed Field
  Defense; `prowlMovesThroughZoc` and Sabretooth kills by role;
- terrain: `mountainEntriesWithoutEngineering` and `mountainCrossings`,
  `glideMoves`, `deepSnowStoppedMoves` (other factions' Moves stopped on
  Snow), and `snowTilesAtEndTurnTotal` and `snowTilesAtEndTurnMaximum`;
- protection: `blizzardHalvedAttacks`, `blizzardDamagePrevented` and the
  halved attacks by attacker role, and `snowCoverAttacks` and
  `snowCoverDamagePrevented` (the exchange recomputed without the rule).

`commandsByKind` counts the two new commands and the event counters
`UNITS_CHILLED` like any other kind. Faction-keyed fields include an
`ICE_FOLK` entry. The pressure telemetry script accepts the pairing letter
`I`; the balance matrix gets its Ice Folk pairings and summary with the
balance bead (`pulp_wars-7g3.7`).

## Normal AI pressure telemetry (`pulp_wars-9s0.1`)

`scripts/ruleset7-ai-pressure-telemetry.ts` measures how expansionist and
aggressive the Normal policy plays. It runs Normal-vs-Normal matches and
replays each accepted command log through the reducer; nothing in it is read
by the policy, and no gate runs it. Matches are independent and seeded, so
the result does not depend on `--jobs`.

```bash
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --pairings HU,UH,GD,DG --seeds 3 --markdown
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --turtle --pairings HUGD,HDGU --multi-size 16 --seeds 2 --max-rounds 60 --markdown
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --from-output a.json,b.json --maps pangea --markdown
```

A pairing is one letter per seat (`H` Human, `U` Undead, `G` Goblin, `D`
Dinosaur, `M` Martian): two-letter pairings run on every `--sizes` value (default 11 and
14), longer ones on `--multi-size` (default 16). `--maps` defaults to all
five map types, `--seeds` to 3 (from `--first-seed`), `--max-rounds` to 150.
`--output` writes the summary and every match; `--from-output` runs no
match and summarises the selected cells of earlier output files.

Per seat it reports, at the end of each own turn:

- the round of first contact (enemy territory or an enemy city explored),
  of the first attack on an enemy unit, of the first siege (an attack on a
  unit on an enemy city center, or a step onto one), and of the first city
  capture;
- after first contact: the share of turns with at least one, two, or three
  own land units in or next to enemy territory, the longest run of turns
  with none, and the same over the turns in which no hostile land unit
  stands within two tiles of an own city (the seat is free to attack);
- how long the seat takes to come back after it loses its presence at the
  front, split by whether those units died or withdrew;
- the same shares by the gap between its nearest city and the nearest known
  enemy city, and by the distance between the capitals at the start;
- what each land unit did that turn (at the front, moved closer to a known
  enemy city, moved away, other move, acted, idle on a center, idle at home,
  idle in the field), the embarked share, and Raiders near home;
- Coins spent on units, on the economy, and on research by round, the bank
  at the end of the turn, the share of full cities, army and city counts by
  round, and how fast villages are taken.

`--turtle` makes seat 0 a defender that stays at home: it plays the Normal
policy's best command that is not a Move ending more than three tiles from
its own cities, onto a Port, or a landing. It develops, trains, and kills
what comes into reach, like a player who sits behind their walls. The
summary then adds the turtle's view (hostile land units in or next to its
territory at the end of each of its turns: the first round, the share of
turns with one, two, or three, and the calm runs), counts the matches in
which it lost its last city, and leaves the turtle out of the per-seat
tables. The measurements of `pulp_wars-9s0.1` are in
[Greedy Normal AI](NORMAL_AI.md#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01).

## Ruleset-7 revision-2 historical implementation contract

The commands, identifiers, inventory counts, and checked matrix below describe
the historical revision-2 implementation. They are not revision-3 evidence.
The authoritative revision-3 headless and telemetry contract is
[Ruleset 7](../product/RULESET_7.md#10-normal-ai-scheduling-headless-and-telemetry)
and supersedes conflicting revision-2 details here for subsequent implementation.

Ruleset 7 is selected explicitly as `pulp-wars-poc-7r6`; the v6 CLI default is
unchanged. Match creation uses the canonical playable boundary: map generation
creates five Coins per seat, then exactly one initial `START_TURN` awards the
first active player its two-Coin capital income, producing the initial 7/5 Coin
split. Replay command zero reconstructs that same playable state rather than a
raw generated map.

```bash
npm run headless -- replay path/to/v7-replay.json
npm run headless -- match --ruleset pulp-wars-poc-7r6 --map-type continents --ai-count 3 --seed 0 --max-commands 30000 --max-rounds 750
npm run headless -- batch --ruleset pulp-wars-poc-7r6 --map-types dry-land,pangea,continents,archipelago,lakes --seeds 0 --ai-counts 1,2,3 --modes rival,cooperative --max-commands 30000 --max-rounds 750
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

Revision 6 accepts one `--map-type` for a match and a comma-separated
`--map-types` list for a batch. Continents is the match default. Revision 18
adds `showcase`, the fixed 16 x 16 Showcase setup (three developed cities,
every technology, and one unit of every role per seat; the seed does not
change the board): its size defaults to 16 for every seat count, any other
`--size` is an error, and a batch that lists `showcase` runs all of its map
types at 16. No validation or balance matrix includes it by default.

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r25 --map-type showcase --ai-count 3 --factions human,undead,goblin,human --max-rounds 50
```

The naval
playable validator runs the fixed five-map, four-shape, two-relation matrix
twice through 20 rounds or 600 accepted commands, then exercises fixed targeted
and natural invasion sequences. Optional `policySliceMilliseconds` uses the
same `NormalPolicyWorkV7` loop as the browser and reports callback count, slice
count, maximum slice time, and total decision time without changing hashes.

Role efficiency telemetry stores `survivorsPerThousandCoins` as an integer:
`round(1000 * survivors / trainingCoins)`, or zero when no Coins were spent.
The earlier fractional `survivalPerCoin` calculation was incompatible with the
integer-only canonical serializer and is not a compatible unit.

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
