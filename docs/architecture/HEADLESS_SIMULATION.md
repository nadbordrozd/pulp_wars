# Headless simulation

The headless entry point runs replay verification and complete equal-rules
Normal-policy matches without DOM or Canvas imports.

Current Ruleset 7 rules, including map generation, are described by
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md) for all nine
factions (Human, Undead, Goblin, Dinosaur, Martian, Ice Folk, Dwarf, Candy,
and the Cultists; `pulp_wars-t6s.7` folded the
[Martian overlay](../product/RULESET_7_MARTIANS.md), `pulp_wars-7g3.8` the
[Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md), `pulp_wars-78i.8`
the [Dwarf overlay](../product/RULESET_7_DWARVES.md), `pulp_wars-jdb.8`
the [Candy overlay](../product/RULESET_7_CANDY.md), `pulp_wars-5ti.9`
the [naval branch overlay](../product/RULESET_7_NAVAL_BRANCH.md), and
`pulp_wars-mch9.21` [the Cultists spec](../product/RULESET_7_CULTISTS.md)
into it). The headless CLI
accepts only the current Ruleset 7 identity (`RULESET_7_ID` in
`src/engine/v7/types.ts`; `--ruleset pulp-wars-poc-7r120` when this was
last brought up to date), and it is the default: without `--ruleset` a match
or a batch plays the current Ruleset 7. The earlier prototypes, Ruleset 6
(`pulp-wars-poc-6`, the default until then) and the legacy ruleset 5, are
retired with their headless runners (`pulp_wars-lky5`): the CLI refuses
their identities, and `replay` reads version 7 replays only. The
command examples below name that identity and must be given the current one
when it has moved. Since
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
case-insensitive. A batch
with `--factions` needs exactly one `--ai-counts` value, and each batch entry
records its `factions`. Since `pulp_wars-w5j.1` omission means distinct
factions in registration order (Human, Undead, Goblin, Dinosaur for seats
0–3), not all Human; see the mirror option below.

### Unique factions and the mirror option (`pulp_wars-w5j.1`)

Every seat plays a different faction
([unique-factions overlay](../product/RULESET_7_UNIQUE_FACTIONS.md)): the
engine refuses a setup that repeats a faction with `DUPLICATE_FACTION`, and
the CLI refuses a repeated `--factions` value. Mirror matches (`HH`, `UU`,
four-seat mixes that repeat a faction, a policy against itself) stay
available to tools through an explicit, headless and test only option:

- a setup may carry `allowDuplicateFactions: true`
  (`allowDuplicateFactionsV7(setup)` adds it); it is part of the setup, so
  states, replays, and the setup hash carry it;
- `runAiBatchV7` takes `allowDuplicateFactions: true` beside `factions`;
- the CLI passes it with `--allow-duplicate-factions`;
- the browser never builds it, so it never writes such a save; the browser
  controller refuses a launch that carries it and refuses to resume a save
  that carries it. The save and replay formats carry it unchanged, so mirror
  replays and saves round-trip in tests.

Users of the option, each naming it where it builds the setup:

- the balance matrix (`scripts/ruleset7-undead-balance-matrix.ts`) and the
  AI pressure telemetry (`scripts/ruleset7-ai-pressure-telemetry.ts`), only
  for their mirror pairings (`HH`, `UU`, `GG`, `DD`, `MM`, `II`) and
  repeated-faction four-seat mixes; every other cell is unchanged;
- the Human-v-Human validation and benchmark tools
  (`validate-ruleset7-tactical-ai`, `validate-ruleset-v7-normal-ai-matrix`,
  `validate-ruleset7-growth-maps`, `validate-ruleset7-naval-maps`,
  `validate-ruleset7-naval-playable`, `benchmark-ruleset7-public-planning`,
  `benchmark-ruleset7-tactical-ai`, `benchmark-ruleset-v7-reference-browser`)
  and the naval smoke's engine-built Archipelago presentation scenes
  (`browser-naval-smoke-v7`);
- the tests: `setupV7` (the all-Human rule fixture), `mirrorOptionV7`
  in `tests/fixtures/v7-builders.ts` (added by the arena and Undead UI
  fixtures and the tests' own setup helpers whenever their factions repeat),
  and the Land Grant hidden-owner state fixture. Browser-launched tests use
  `browserSetupV7` (distinct factions) instead.

`validate-ruleset7-biome` uses distinct factions instead (factions never
affect map generation), and `benchmark-ruleset-v7-command-processing`
launches the browser controller, so it uses distinct factions too.

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --factions undead,undead --allow-duplicate-factions --seed 3 --max-rounds 150
```

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type pangea --factions original,undead --seed 3 --max-rounds 200
npm run headless -- batch --ruleset pulp-wars-poc-7r120 --ai-counts 1 --factions undead,original --seeds 0,1,2 --map-types dry-land,lakes --max-rounds 200
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type pangea --factions goblin,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type pangea --factions dinosaur,original --seed 3 --max-rounds 150
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
([current rules section 20](../product/RULESET_7_CURRENT.md#20-martian-faction-rules);
[Martian overlay](../product/RULESET_7_MARTIANS.md)), on every map type
including `showcase`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type pangea --factions martian,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type showcase --ai-count 3 --factions martian,human,undead,goblin --max-rounds 50
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
  `mindControlTargets` by role, `mindControlTargetHp`, `controlledReleased`,
  `controlledLost`, `controlledMaximum`, and `controlledCaptures`; `tractorBeamsOwn`,
  `tractorBeamsHostile`, and `tractorBeamsOffCenter`; `psychicCommands`;
- `selfLaunches` (machines that embarked without a Port) and `flyoverMoves`
  (flyer Moves over a unit of another player).

`commandsByKind` counts the three new commands and the event counters the
four new events like any other kind. Faction-keyed fields include a
`MARTIAN` entry. The pressure telemetry script below accepts the pairing
letter `M`; the balance matrix (`scripts/ruleset7-undead-balance-matrix.ts`)
has had its Martian pairings and summary since the balance bead
(`pulp_wars-t6s.5`; the
[Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md)).

## Ice Folk seats (`pulp_wars-7g3.3`)

`--factions` also accepts `ice` (or `ice_folk`)
([current rules section 21](../product/RULESET_7_CURRENT.md#21-ice-folk-faction-rules);
[Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md)), on every map type
including `showcase`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type dry-land --factions ice,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type showcase --ai-count 3 --factions ice,human,undead,goblin --max-rounds 50
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
  `COLD_SNAP`, `COLD_AURA`, and, since `pulp-wars-poc-7r44`, `BLACK_ICE`),
  `newFreezes`, `reapplications`, targets by
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
`I`. The balance matrix (`npm run balance:ruleset7-undead`) has the Ice
Folk pairings `IH`, `HI`, `IU`, `UI`, `IG`, `GI`, `ID`, `DI`, `IM`, `MI`,
and `II` and writes a compact per-seat Ice Folk telemetry
(`MatrixEntry.iceFolk`) and `summary.iceFolk` (`pulp_wars-7g3.7`; the
[Ice Folk balance report](../validation/RULESET_7_ICE_FOLK_BALANCE.md)).

## Dwarf seats (`pulp_wars-78i.3`)

`--factions` also accepts `dwarf`
([current rules section 22](../product/RULESET_7_CURRENT.md#22-dwarf-faction-rules);
[Dwarf overlay](../product/RULESET_7_DWARVES.md), section 19.1), on every
map type including `showcase`; the browser setup offers the faction since
its UI bead (`pulp_wars-78i.6`):

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type dry-land --factions dwarf,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type showcase --ai-count 3 --factions dwarf,human,undead,goblin --max-rounds 50
```

The engine bead adds no Dwarf policy. A Dwarf seat plays with the generic
Normal policy on the Dwarf registration: it trains, moves, attacks,
captures, researches, and builds like a Human seat (mostly Hammerers and
Steam Moles in short matches); its Clockwork Gunners fire their second
shot when the generic attack choice offers it, its Engineers Repair, and
its Hammerers and Moles are dug in wherever they stand still next to an
own center with Dig In researched. It never issues `TUNNEL`, `BOMB_RUN`,
or `ASSEMBLE` (the policy gives an unknown command kind no priority), so no
mound, eruption, or bomb appears in a generic-policy match, and its
Gyrocopters only scout and retaliate. The other factions' policies attack
Dwarf units with their ordinary previews, which include Dig In,
Unflinching, Plated, and Knockback. The Dwarf policy is `pulp_wars-78i.4`.

Every v7 result carries a `dwarf` block (all zero without a Dwarf seat;
`src/headless/dwarf-telemetry-v7.ts`), computed from the events of the
accepted commands and the states around them: tunnels (with a rider, and
the destination distances), surfacings, eruptions with hits, their
victims, damage, Shield HP absorbed, kills, Egg damage and Eggs
destroyed, Field Defense undermined, and surfaced units lost before their
owner's next Start Turn; bombing runs, their damage, Shield HP absorbed,
kills, targets by role, and Gyrocopters lost before their owner's next
Start Turn; Gunner shots unmoved and moved and second shots; Unflinching
attacks; Assembles and their Coins; Repairs on constructs, other machines,
and others; attacks on dug-in units, the damage Dig In prevented (the
exchange recomputed without the level), and dug-in units killed;
Knockbacks, blocked ones, and centers emptied; and Plated hits with the
damage the cap prevented. The headless survivor and death counts read every
owned unit (burrowed ones included).

`commandsByKind` counts the three new commands and the event counters the
four new events like any other kind. Faction-keyed fields include a `DWARF`
entry. The balance matrix (`npm run balance:ruleset7-undead`) has the Dwarf
pairings `WH`, `HW`, `WU`, `UW`, `WG`, `GW`, `WD`, `DW`, `WM`, `MW`, `WI`,
and `IW` (`W`: Dwarf; `D` is the Dinosaur's; no `WW` mirror) and the
four-seat smoke mixes `WHUG` and `DMIW`, and writes a compact per-seat Dwarf
telemetry (`MatrixEntry.dwarf`: units trained and assembled, kills and
losses by role and cause, the killer of every loss, tunnels with and without
a rider, eruption and bomb hits, kills, victims, and same-turn follow-up
kills, Assembles, Repairs, dug-in unit-turns, and the Engineers' and
Gyrocopters' killers) and `summary.dwarf` (`pulp_wars-78i.7`; the
[Dwarf balance report](../validation/RULESET_7_DWARF_BALANCE.md)). The
scripted rider probe of the Dwarf overlay's section 19.2 is
`npx tsx scripts/ruleset7-dwarf-rider-probe.ts`.

## Mission matches (`pulp_wars-68k.2`)

`pulp-wars-poc-7r34` adds the `MISSION` map type
([campaign design](../product/CAMPAIGN.md) section 2.4;
[current rules section 2.6](../product/RULESET_7_CURRENT.md#26-mission-setup)):
a hand-authored board built from a registered mission, named by the setup's
`mission: { id, revision }`. `runAiMatchV7` accepts a mission setup
unchanged (`missionMatchSetupV7(mission, faction)` builds one), and the CLI
plays the current revision of a registered mission with
`--map-type mission --mission <ID>`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type mission --mission TEST_GROUNDS --max-rounds 30
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type mission --mission TEST_GROUNDS --factions goblin,undead --max-rounds 30
```

The mission fixes the board size, the seats, the seed, and the AI mode, so
`--seed`, `--size`, `--ai-count`, `--cooperative`,
`--allow-duplicate-factions`, and (since `7r35`, a mission has no
curiosities) `--curiosities` are errors with it; `--factions` gives one value
per seat, seat 0's from its choice where the mission offers one and the AI
seats' as the mission fixes them (without it seat 0 plays its first choice).
Hidden fixture missions such as `TEST_GROUNDS` are runnable here and appear
in no chapter. Batches (`--map-types`) do not take `mission`. A mission
played Normal against Normal is always the same game (its board, seed, and
starting position are fixed). `pulp_wars-68k.2` changes no AI decision:
non-mission matches replay byte-identically to `7r33` apart from the ruleset
ID.

### Mission directives and proxy variation (`pulp_wars-68k.3`)

An AI seat of a mission plays its directive (`RUSH`, `HOLD`, `GUARD`,
`ASSAULT`;
[campaign design](../product/CAMPAIGN.md) section 2.5;
[Greedy Normal AI](NORMAL_AI.md#mission-directives-pulp_wars-68k3)) in
headless matches exactly as in the browser: the directive is read from the
public view inside the Normal policy, so `runAiMatchV7`, the CLI, and the
browser controller need no switch. The hidden fixtures `TEST_RUSH`,
`TEST_HOLD`, and `TEST_GUARD`, and the siege fixture `TEST_NECK`
(`pulp_wars-68k.6`,
[Greedy Normal AI](NORMAL_AI.md#siege-of-a-single-file-front-pulp_wars-68k6)),
are runnable like `TEST_GROUNDS`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type mission --mission TEST_HOLD --max-rounds 20
```

A mission played Normal against Normal is always one game. **Proxy
variation** (headless and tests only, never the browser) varies seat 0, the
human's seat, with an option of `runAiMatchV7`:

```ts
runAiMatchV7(missionMatchSetupV7(mission), {
  maxRounds: 80,
  proxyVariation: { seed: 7, rate: 0.15 },
});
```

At each seat-0 decision a Mulberry32 stream of its own, seeded from `seed`
(never the match's `random`, so the board and every PRNG draw of the match
are unchanged), draws once; with probability `rate` the second or third best
candidate within the best candidate's priority band (the same `priority`;
a second draw picks between the two) is played instead of the best. The best
is never replaced when it is `END_TURN`, and `END_TURN` is never the
substitute, so the proxy never ends a turn early; the substitute still obeys
the turn-command cap. Every substitute is a ready public command, so the
command log is an ordinary valid replay. The same `(seed, rate)` always plays
the same game; `rate` must lie in `[0, 1]` (`0` plays exactly the unvaried
game). `proxyVariedDecisionV7` (`src/headless/v7.ts`) is the pure step. The
CLI and batches do not expose the option; the campaign playtest script of
`pulp_wars-68k.4` calls `runAiMatchV7` directly.

## Map curiosities (`pulp_wars-737.2`)

`pulp-wars-poc-7r35` adds the required setup field `curiosities`
([current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities);
[map curiosities spec](../product/RULESET_7_MAP_CURIOSITIES.md)): with it
on, map generation places the rare Fountain of Youth, Shrine, and Sunken
Wreck on its own stream after the Rifts. The CLI's `match` and `batch`
modes take `--curiosities on` or `--curiosities off`, **on by default** as
on the setup screen (`--curiosities` is refused with `--map-type mission`;
the Showcase never has curiosities). `runAiBatchV7` requires
`curiosities` in its options, every batch entry records it, and the
metrics carry `curiosityKinds`, the kinds the board started with in
`(y, x)` order (the new events count in `eventsByKind`):

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type dry-land --size 16 --seed 4 --max-rounds 30
npm run headless -- batch --ruleset pulp-wars-poc-7r120 --ai-counts 1 --seeds 0,1,2 --curiosities off --max-rounds 200
```

AI head start (`pulp_wars-w49.39`,
[current rules section 2.1](../product/RULESET_7_CURRENT.md#21-match-setup)):
the CLI's `match` and `batch` modes take `--ai-head-start 0` (the default,
no head start), `5`, `10`, or `20` and write `aiHeadStart: { coins }` into
every setup (`runAiBatchV7` takes an optional `aiHeadStart`; without it the
setups have no such key). The Coins go to every seat but seat 0, which in
an all-AI headless match is the one seat without them, so a head start
makes a headless match lopsided on purpose. `--ai-head-start` is refused
with `--map-type mission`, and any amount above 0 with the Showcase.

Score and modes (`pulp_wars-kaw6.2`,
[score and stars spec](../product/RULESET_7_SCORE_AND_STARS.md) section
9.4): the CLI's `match` and `batch` modes take `--mode domination` (the
default) or `--mode perfection` and write the mode into every setup
(`runAiBatchV7` takes an optional `gameMode`; without it the setups have no
`gameMode` key and are Domination). `--mode` is refused with
`--map-type mission`, and `perfection` with the Showcase. A match result
(and the `match` summary) carries `score`: the mode, every player's score
at the end of each completed round, the final breakdowns, and the
end-of-match summary with the human seat's star grade.

Every existing parity, balance, and validation tool passes
`curiosities: false` explicitly, so its measurements stay comparable:
with the option off, generation and every match are those of `7r34` (the
contract test `tests/unit/ruleset-v7-curiosities.test.ts` pins `7r34`
initial states of every map type and size and `7r34` headless matches
across the map types and factions). A match with the option on that drew
no curiosity plays command for command like the same match off. The
placement rules are checked independently of the engine, and the
distribution is printed, by
`npm run validate:ruleset7-curiosity-maps` (`--seeds=N`, default 32,
every map type, size, and AI count). The Normal AI plays curiosities
since `pulp_wars-737.4`
([Normal AI: map curiosities](NORMAL_AI.md#map-curiosities-pulp_wars-7374)),
only from the moment a seat sees one, so a match that drew none is
unchanged.

## The Giant Spider (`pulp_wars-737.3`)

`pulp-wars-poc-7r36` adds the Monster to curiosity placement
([current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities)):
a Giant Spider owned by the neutral owner, on boards of 16 and up, that
acts in a neutral turn inside the `END_TURN` wrapping each round. The
runner needs no new flag (`--curiosities on`, the default, allows it). The
metrics gain `monsters`: `placed` (0 or 1), the `damageDealt` and `kills`
of the Spider, the `bountyCoins` paid for it, and the `slainRound` (null
while it lives or when none was placed); the Spider's damage, kills, and
death count for no role or faction (`roles` and `factionRoles` skip it),
and its events count in `eventsByKind`. Seed 7 of a 16 x 16 Dry Land match
with two opponents draws one:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type dry-land --size 16 --ai-count 2 --seed 7 --max-rounds 40
```

The contract tests (`tests/unit/ruleset-v7-monster.test.ts`) play Normal
rounds with a Spider next to units of all seven factions and headless
matches with the option on at 16 x 16 without errors or stalls. Since
`pulp_wars-737.4` the Normal AI keeps away from the Spider unless it can
kill it (before, its units walked next to it and attacked it like any
enemy).

## Monuments (`pulp_wars-d8xm`)

`pulp-wars-poc-7r115` lets a city hold any number of Monuments and fixes
a Monument's look for every viewer
([current rules section 5](../product/RULESET_7_CURRENT.md#5-achievements-and-monuments)).
The Normal AI keeps its scoring: it builds a Monument where the public
command query offers one and the +3 does the most (a level reached first),
so a seat may now stack its Monuments in one city. The headless metrics
(`monumentPlacements`, `monumentTransfers`, `monumentPopulation`) already
count every Monument of a city. Boards and event kinds are unchanged; a
match where a seat earns two achievements may place both in one city,
which `7r114` refused. No match was run for this bead (the user's standing
rule).

## Tier-3 review A (`pulp_wars-1pwz`)

`pulp-wars-poc-7r113` changes two units
([current rules section 11.2](../product/RULESET_7_CURRENT.md#112-tier-3-review-2026-10-25)):
the Ice Folk Sabretooth has Overrun and Cold Blood, so it runs through
Frozen units, and the Dinosaur T-Rex costs 11 Coins (14). Boards and
event kinds are unchanged; a match with an Ice Folk or Dinosaur seat that
fields either unit plays differently from `7r112` (the Dinosaur seat lays
its T-Rex Egg sooner). No match was run for this bead (the user's standing
rule).

## Reward arrival (`pulp_wars-sa3h`)

`pulp-wars-poc-7r114` gives a city's reward unit the center again
([current rules section 4.6](../product/RULESET_7_CURRENT.md#46-training-and-city-center-spawning)):
the unit standing there, friend or foe, is pushed to a free tile next to
the center, or within two, unharmed and no longer capture-eligible, so a
reward breaks a siege. `UNIT_SPAWN_DISPLACED` is emitted again (never with
`to` null; the death cause `DISPLACED` stays retired), so
`eventsByKind.UNIT_SPAWN_DISPLACED` counts the pushes. Boards are
unchanged, but the Normal AI takes a reward that pushes a besieger off and
levels a besieged city sooner, so every match whose reward meets an
occupied center plays differently from `7r113`. No match was run for
this bead (the user's standing rule).

## Reward placement (`pulp_wars-spue`)

`pulp-wars-poc-7r111` makes a city's reward unit harmless
([current rules section 4.6](../product/RULESET_7_CURRENT.md#46-training-and-city-center-spawning)):
with a unit on the center it appears on the nearest free tile of the
city's territory, then within two tiles of the center, or is held on the
city until a later Start Turn; nothing is moved or killed, and a reward no
longer ends a siege. `UNIT_SPAWN_DISPLACED` and the death cause
`DISPLACED` are no longer emitted, so `eventsByKind` no longer counts them.
Boards are unchanged, but the Normal AI chooses its rewards by the ladder
alone and every match whose reward unit meets an occupied center plays
differently from `7r110`. No match was run for this bead (the user's
standing rule).

## Held mission waves (`pulp_wars-hmyk.35`)

`pulp-wars-poc-7r110` caps a mission wave's calm search at 3 tiles from
its written tiles
([CAMPAIGN.md section 10.3](../product/CAMPAIGN.md#103-reinforcements)).
A wave with no calm tile in reach is held (the state's optional
`heldWaves`) and tried again at its seat's next Start Turn. Two rounds
after its own round it comes regardless, on the nearest free tile. Its
`REINFORCEMENT_ARRIVED` events carry the wave's index (`wave`).
Generated matches have no waves, so they are unchanged. A mission match
whose wave finds its ground taken now plays differently from `7r109`. Of
the built missions that is GOBLIN_5 (revision 5) from its starting board,
and any mission whose wave tiles the fighting reaches. No match was run
for this bead (the user's standing rule).

## The Ice Folk border freeze (`pulp_wars-5ti.31`)

`pulp-wars-poc-7r109` freezes the water of an Ice Folk city's territory
when its borders grow and the seat has Rime
([current rules section 21.16](../product/RULESET_7_CURRENT.md#2116-the-frozen-sea)):
a Land Grant (the old footprint's water included), a capture, and a
research of Rime, Pack Ice, or Icebound (every own city). Each tile follows
the Freeze table; the event is one `WATER_FROZEN` with `unitId` null, so
`eventsByKind.WATER_FROZEN` counts these too. Boards are unchanged, but an
Ice Folk seat holds more ice earlier and its Normal AI values a Land Grant
more for the water it freezes, so a match with an Ice Folk seat plays
differently from `7r108`. No match was run for this bead (the user's
standing rule).

## The Mothership redesign (`pulp_wars-ewpj`)

`pulp-wars-poc-7r108` redesigns the Martian Mothership
([current rules section 20.7.1](../product/RULESET_7_CURRENT.md#2071-mass-beam-down)):
9 Coins, 20 HP, Attack 3, Defense 3, Sight 2, Mass Beam Down
(`MASS_BEAM_DOWN`, a new command kind appended after `END_TURN`, so every
earlier kind keeps its position) instead of Beam Down, and the Shield
Canopy. Boards are unchanged, but a Martian seat of the Normal AI buys and
plays the Mothership differently, so a match with one plays differently
from `7r107`: `commandsByKind` gains `MASS_BEAM_DOWN`, and each passenger
counts in `beamDowns`. No match was run for this bead (the user's standing
rule).

## No pointless actions (`pulp_wars-zir6`)

`pulp-wars-poc-7r107` makes an ability illegal where it would change nothing
([current rules section 12.4](../product/RULESET_7_CURRENT.md#124-no-pointless-actions)):
a Frost Bolt (the Ice Witch's, or the Sled's `THROW_BOLAS`) at a unit that
is Frozen already, a Cold Snap whose every target is Frozen already, and a
Thunder Stomp that would hit nobody and smash no Field Defense. Boards are
unchanged, but an Ice Folk or Dinosaur seat of the Normal AI is offered
fewer commands, so a match with one plays differently from `7r106`:
`commandsByKind` no longer counts such casts. No match was run for this
bead (the user's standing rule).

## Building placement (`pulp_wars-h0xx`)

`pulp-wars-poc-7r106` rationalises where buildings stand
([current rules section 8.1](../product/RULESET_7_CURRENT.md#81-common-placement-gates)):
nothing but the Mine on a Mountain, no land resource blocks a building
(it is used up), and a building on a Forest needs Forestry and clears it
(reported as a `FOREST_CLEARED` before the build's own event, +1 Coin).
Boards are unchanged, but a match that builds plays differently from
`7r105`: the Normal AI is offered other tiles and weighs the resource a
build uses up. `eventsByKind.FOREST_CLEARED` now also counts the clearings
of builds, and `economy.coinsEarned` includes their Coin. No match was run
for this bead (the user's standing rule).

## The Tesla Tower's chain lightning (`pulp_wars-737.22`)

`pulp-wars-poc-7r105` makes the zap 16 and adds the chain lightning
([current rules section 2.7, round 3](../product/RULESET_7_CURRENT.md#round-3-the-tesla-tower-the-moon-gun-the-gold-claim-and-the-lost-expedition)):
the bolt jumps on to up to four more units for 8, 4, 2, and 1, each drawn
on the match PRNG, so a match whose Tower is used plays differently from
`7r104` (boards are unchanged). A zap now emits one `TESLA_ZAPPED` per hit
(`hop` 0 to 4); `tesla.zaps` counts the zaps (hop 0) and `tesla.kills`
every kill on the chain, and `eventsByKind.TESLA_ZAPPED` counts every hit.
No match was run for this bead (the user's standing rule).

## Map curiosities round 3 B: the Sea Serpent (`pulp_wars-737.21`)

`pulp-wars-poc-7r104` adds the Sea Serpent
([current rules section 2.7, round 3 B](../product/RULESET_7_CURRENT.md#round-3-b-the-sea-serpent)),
a neutral unit afloat on water boards of width 16 and up, so a match with
the option on at those sizes and map types may start from a different
board than at `7r103`; with the option off nothing changes. The runner
needs no new flag and the metrics no new key: `monsters.breeds` lists
`SEA_SERPENT`, and its bites, deaths, bounty, and regeneration count in
the existing `monsters` block and `eventsByKind`. No match was run for
this bead (the user's standing rule).

## Map curiosities round 3 (`pulp_wars-737.20`)

`pulp-wars-poc-7r103` adds the Tesla Tower, the Moon Gun, the Gold Claim,
and the Lost Expedition
([current rules section 2.7, round 3](../product/RULESET_7_CURRENT.md#round-3-the-tesla-tower-the-moon-gun-the-gold-claim-and-the-lost-expedition)),
and boards of width 20 and 25 now draw more curiosities, so a match with
the option on at those sizes starts from a different board than at
`7r102`; with the option off nothing changes. The runner needs no new
flag. The metrics gain `tesla` (`zaps`, and `kills` among them),
`moonGun` (`shots`), `goldClaim` (`stakes`, and the Coins `paid` by every
Claim), and `expedition` (`found`, and `notesUsed`); the new events count
in `eventsByKind`. No match was run for this bead (the user's standing
rule); the distribution is printed by
`npm run validate:ruleset7-curiosity-maps`, which only generates boards.

## The Martian and Ice Folk balance round (`pulp_wars-1wy.3`)

`pulp-wars-poc-7r37` changes Martian and Ice Folk rules
([current rules sections 20.7](../product/RULESET_7_CURRENT.md#207-beam-down),
[20.10](../product/RULESET_7_CURRENT.md#2010-tractor-beam), and
[21.5](../product/RULESET_7_CURRENT.md#215-snow)) and nothing in the
runner: no flag, no metric key. The existing Martian metrics read the same
events: `beamDowns` and `beamDownPassengers` now count a Mothership's beams
and pick-ups too, and `tractorBeamsOwn`, `tractorBeamsHostile`, and
`tractorBeamsOffCenter` a Saucer's pulls and a Mothership's two-tile pulls
(`UNIT_PULLED` gains `path`; `from` and `to` are unchanged). The Ice Folk
telemetry's `glideMoves` counts Moves longer than the unit's Move, which
now happen only on Snow. A match without a Martian or Ice Folk seat plays
command for command as at `7r36`; the pinned hashes of the matches with
such a seat were recomputed. The Normal AI uses the new tools on purpose
since `pulp_wars-1wy.4` (a policy change on `7r37`: it moved the pinned
Pangea match with a Martian seat, and no match without one), and the
human-style probe and the coarse matrix of the balance design are
`pulp_wars-1wy.2` and `pulp_wars-1wy.6`.

## Candy seats (`pulp_wars-jdb.3`)

`--factions` also accepts `candy`
([current rules section 23](../product/RULESET_7_CURRENT.md#23-candy-faction-rules);
[Candy overlay](../product/RULESET_7_CANDY.md), section 19.1), on every map
type including `showcase`:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type dry-land --factions candy,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type showcase --ai-count 3 --factions candy,human,undead,goblin --max-rounds 50
```

A Candy seat plays the Candy policy of `pulp_wars-jdb.4`
([Candy play](NORMAL_AI.md#candy-play-pulp_wars-jdb4)): it Rushes for a
kill or to reach a threatened city, steps Crashed units out of melee
reach, Re-bakes before it trains, shoots its Pie Launchers first, and
Tosses, and the other factions' policies eat its Crumbs, prefer its
Crashed units on a tie, and mark a melee attack that will be bounced down.
(The engine bead, `pulp_wars-jdb.3`, played a Candy seat with the ordinary
policy, which never issued `SUGAR_RUSH`, `REBAKE`, or `SUGAR_TOSS`; that
policy is what the Candy policy decides as with every group switched off.)

Every v7 result carries a `candy` block (all zero without a Candy seat;
`src/headless/candy-telemetry-v7.ts`), computed from the events of the
accepted commands and the states around them: Rushes (and by role), Rushed
attacks and their kills, units Crashed and spared by Home Sweet Home, Candy
units killed while Crashed, Crumbs left, eaten, gone stale, and re-baked
(by role, with the Coins), the Peppermint Surprise's damage and kills,
Splats and the strike-backs they prevented, Bounces and blocked Bounces,
Sugar Tosses and Frostings with their HP, Sugar Frenzy continuations and
the longest chain, and Rushed Donut Racer attacks that granted Escape.
`commandsByKind` and `eventsByKind` count the three new commands and the
seven new events like any other kind.

The balance matrix (`npm run balance:ruleset7-undead`) accepts the pairing
letter `C` (`CH`, `HC`, `CU`, `UC`, `CG`, `GC`, `CD`, `DC`, `CM`, `MC`,
`CI`, `IC`, `CW`, `WC`, and the four-seat `CHUG`; there is no `CC`). It
has no Candy summary: the coarse balance (`pulp_wars-jdb.7`) was closed on
the Normal AI bead's small sample (20 wins in 42 games at `7r38`,
[Candy measurements](NORMAL_AI.md#candy-measurements)) without running the
matrix.

A match without a Candy seat plays command for command as at `7r37`: the
all-Human parity digests and the five pinned `7r34` curiosity matches
(Human against Undead on Dry Land; Goblin, Dinosaur, and Martian on Pangea;
Ice Folk against Dwarf on Continents; Martian, Human, and Goblin on
Archipelago; Dwarf, Undead, Ice Folk, and Dinosaur on Lakes) keep their
pinned command hashes, rounds, maps, and PRNG ends, and their event hashes
once the four neutral Candy combat-preview fields are removed
(`tests/unit/ruleset-v7-curiosities.test.ts`,
`tests/unit/ruleset-v7-undead-faction.test.ts`). The contract tests
(`tests/unit/ruleset-v7-candy-headless.sim.test.ts`) play Normal matches with a
Candy seat against every faction in both seat orders, a four-seat mix, and
a Showcase without errors or stalls.

## The naval branch (`pulp_wars-5ti.2` and `5ti.3`)

The naval branch
([current rules section 14](../product/RULESET_7_CURRENT.md#14-naval-rules)
and [section 21.16](../product/RULESET_7_CURRENT.md#2116-the-frozen-sea))
needs no flag: it is in every match with water, and a Dry Land match
forbids it. The water map types take the usual options, and an Ice Folk
seat plays them without ships:

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type continents --factions ice,original --seed 3 --max-rounds 20
```

- **What a result shows today.** `commandsByKind` counts `BOARD` and
  `FREEZE` like every command kind (both are zero in most Normal-policy
  matches: the policy picks a `BOARD` only when its general scoring
  happens to and never a `FREEZE`,
  [Normal AI](NORMAL_AI.md#the-naval-branch-pulp_wars-5ti2-and-5ti3)), and
  the `iceFolk` block counts the Chills of Black Ice under the source
  `BLACK_ICE`. The Showcase with every technology is the quickest way to
  see Submarines in a headless match.
- **What it does not show yet.** The naval telemetry of the overlay's
  [section 15.2](../product/RULESET_7_NAVAL_BRANCH.md#152-measurement)
  (rams and shoves, boardings and the prize's fate, Submarine kills by
  victim, Harbour population, Freezes, ice tiles, slides, crossings,
  ships frozen in, crush damage) is not implemented; it belongs to the
  coarse balance bead `pulp_wars-5ti.8`, which waits for the naval Normal
  AI.
- **Tests.** `tests/unit/ruleset-v7-naval-branch-headless.sim.test.ts` and
  `tests/unit/ruleset-v7-frozen-sea-headless.sim.test.ts` run bounded water
  matches of every faction, and of the Ice Folk against every faction, and
  a Showcase each, and require no error, stall, or rejected command (and,
  for an Ice Folk seat, no ship).

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

Ruleset 7 was selected explicitly as `pulp-wars-poc-7r6`; the CLI default was
still Ruleset 6 then. Match creation uses the canonical playable boundary: map generation
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
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type showcase --ai-count 3 --factions human,undead,goblin,dinosaur --max-rounds 50
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

## Many seats (`pulp_wars-ykw.3`)

Since `pulp-wars-poc-7r42`
([map scale design](../product/RULESET_7_MAP_SCALE.md) section 9):
`--ai-count` and each `--ai-counts` value take 1 to `F - 1`, `F` the number
of factions (1 to 8 since the Cult registration, `pulp_wars-mch9.3`,
`pulp-wars-poc-7r71`); the defaults stay 1 and `1,2,3`. `--factions`
takes one value per seat, up to `F`; `cult` (alias `cultists`) names the
ninth faction, which the default factions of two to eight seats never
include. Without `--size` a match or
a batch entry plays the **auto size** of its seat count and map type, the
smallest allowed width with at least 56 tiles per seat (11, 14, 16 for 2,
3, 4 seats, 20 for 5 to 7, 25 for 8 and 9). A `--size` that does not hold the seats on
the map type is an error that names the allowed sizes
(`--size must be 14, 16, 20, 25 for 5 seats on the archipelago map type`);
the Showcase stays 16 x 16 with at most three AI seats.

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type dry-land --ai-count 7 --size 11 --seed 1 --max-rounds 12
npm run headless -- match --ruleset pulp-wars-poc-7r120 --map-type continents --ai-count 5 --seed 2 --max-rounds 12
```

## Invariant bug hunt (`pulp_wars-2yc.94`)

`scripts/sim-bug-hunt-v7.ts` plays whole Normal-AI matches, so it runs only
when the user authorises simulations. It covers all nine factions on 2 to 8
seats and checks, after every command, what the browser relies on: the
active seat is offered a command (and END_TURN when no choice is pending);
every picked command is offered and accepted, and at every turn start a
sample of other offered commands is accepted too; the replay log appends;
the canonical and seat-0 projected events parse; the feedback plan builds;
the state schema round-trips at every End Turn; save and load round-trip to
the same hash under the size cap; and the seat's queries (views for every
seat, offered commands, economic and combat previews, selections, tile
action plans, the dock, the technology tree, scores) do not throw or stall.
A failure writes a repro save; `--repro <failure.json>` reloads it.

Round two (`pulp_wars-2yc.97`) runs the state schema after every command
(not only at End Turn) and adds the match invariants the schema cannot see
in one state: the round never goes back, an eliminated seat never returns,
the active seat is in play, an unlocked or spent achievement stays so,
`MATCH_ENDED` comes exactly with the outcome, a Domination win leaves no
hostile seat in play, a Perfection match ends with round 30, and a
mission's clock never runs past its last round. At command indexes 137,
611, 1499, 3001 and 6007 (mid-turn, often an AI's) it resumes the
browser's way: `parseSaveV7` with the replay `DEFER`red, play goes on from
the loaded state with a fresh AI turn count, and `verifySaveReplayV7` must
agree. At the match end it builds the summary, the star grade, the tribe
record, the mission stars and the campaign record (on in-memory storage)
and checks them against the outcome. The browser's playback plan
(`corePresentationPlanV7`), the achievement deeds and the mission tracker
join the per-command and per-turn queries. Slow spots are findings in the
summary, not failures: an AI turn over 2 s of AI time, a browser query or a
deferred load over 200 ms. Its batches: `ai2` (30 all-AI skirmishes: nine
seats on 25 x 25, Perfection, curiosities off, every difficulty, co-op,
long games, naval Archipelagos, Dry Land, the Showcase), `random2` (20,
every faction a random seat 0 twice) and `missions2` (the ten campaign
missions, the tutorial and nine labs, seat 0 the Normal AI with a share of
random commands).

```bash
node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch ai --out <dir> --jobs 8
node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch random --out <dir>
node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch mixed --out <dir> --seed-offset 1000
node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch ai2 --out <dir> --jobs 8 --timeout-minutes 60
node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch random2 --out <dir> --jobs 8
node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch missions2 --out <dir> --jobs 8
```
