# Headless simulation

The headless entry point runs replay verification and complete equal-rules
Normal-policy matches without DOM or Canvas imports.

Current Ruleset 7 rules, including map generation, are described by
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md) for all eight
factions (Human, Undead, Goblin, Dinosaur, Martian, Ice Folk, Dwarf, and
Candy; `pulp_wars-t6s.7` folded the
[Martian overlay](../product/RULESET_7_MARTIANS.md), `pulp_wars-7g3.8` the
[Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md), `pulp_wars-78i.8`
the [Dwarf overlay](../product/RULESET_7_DWARVES.md), `pulp_wars-jdb.8`
the [Candy overlay](../product/RULESET_7_CANDY.md), and `pulp_wars-5ti.9`
the [naval branch overlay](../product/RULESET_7_NAVAL_BRANCH.md) into
it). The headless CLI
accepts only the current Ruleset 7 identity, `--ruleset pulp-wars-poc-7r47`
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --factions undead,undead --allow-duplicate-factions --seed 3 --max-rounds 150
```

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type pangea --factions original,undead --seed 3 --max-rounds 200
npm run headless -- batch --ruleset pulp-wars-poc-7r47 --ai-counts 1 --factions undead,original --seeds 0,1,2 --map-types dry-land,lakes --max-rounds 200
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type pangea --factions goblin,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type pangea --factions dinosaur,original --seed 3 --max-rounds 150
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type pangea --factions martian,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type showcase --ai-count 3 --factions martian,human,undead,goblin --max-rounds 50
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type dry-land --factions ice,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type showcase --ai-count 3 --factions ice,human,undead,goblin --max-rounds 50
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type dry-land --factions dwarf,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type showcase --ai-count 3 --factions dwarf,human,undead,goblin --max-rounds 50
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type mission --mission TEST_GROUNDS --max-rounds 30
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type mission --mission TEST_GROUNDS --factions goblin,undead --max-rounds 30
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

An AI seat of a mission plays its directive (`RUSH`, `HOLD`, `GUARD`;
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type mission --mission TEST_HOLD --max-rounds 20
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type dry-land --size 16 --seed 4 --max-rounds 30
npm run headless -- batch --ruleset pulp-wars-poc-7r47 --ai-counts 1 --seeds 0,1,2 --curiosities off --max-rounds 200
```

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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type dry-land --size 16 --ai-count 2 --seed 7 --max-rounds 40
```

The contract tests (`tests/unit/ruleset-v7-monster.test.ts`) play Normal
rounds with a Spider next to units of all seven factions and headless
matches with the option on at 16 x 16 without errors or stalls. Since
`pulp_wars-737.4` the Normal AI keeps away from the Spider unless it can
kill it (before, its units walked next to it and attacked it like any
enemy).

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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type dry-land --factions candy,original --seed 3 --max-rounds 150
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type showcase --ai-count 3 --factions candy,human,undead,goblin --max-rounds 50
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
(`tests/unit/ruleset-v7-candy-headless.test.ts`) play Normal matches with a
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type continents --factions ice,original --seed 3 --max-rounds 20
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
- **Tests.** `tests/unit/ruleset-v7-naval-branch-headless.test.ts` and
  `tests/unit/ruleset-v7-frozen-sea-headless.test.ts` run bounded water
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
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type showcase --ai-count 3 --factions human,undead,goblin,dinosaur --max-rounds 50
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

**Ruleset 7, many seats** (`pulp_wars-ykw.3`, `pulp-wars-poc-7r42`,
[map scale design](../product/RULESET_7_MAP_SCALE.md) section 9).
`--ai-count` and each `--ai-counts` value take 1 to `F - 1`, `F` the number
of factions (1 to 7 today); the defaults stay 1 and `1,2,3`. `--factions`
takes one value per seat, up to `F`. Without `--size` a match or a batch
entry plays the **auto size** of its seat count and map type, the smallest
allowed width with at least 56 tiles per seat (11, 14, 16 for 2, 3, 4
seats, 20 for 5 to 7, 25 for 8). A `--size` that does not hold the seats on
the map type is an error that names the allowed sizes
(`--size must be 14, 16, 20, 25 for 5 seats on the archipelago map type`);
the Showcase stays 16 x 16 with at most three AI seats. Rulesets 6 and 5
keep 1 to 3 AI seats.

```bash
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type dry-land --ai-count 7 --size 11 --seed 1 --max-rounds 12
npm run headless -- match --ruleset pulp-wars-poc-7r47 --map-type continents --ai-count 5 --seed 2 --max-rounds 12
```

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
