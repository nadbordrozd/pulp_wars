# Ruleset 7 revision 19: Dinosaur balance report (interim)

Bead `pulp_wars-c87.8`. It measures the Dinosaur faction of
[revision 19](../product/RULESET_7_REVISION_19_DINOSAURS.md) against the
balance acceptance of its
[section 15.3](../product/RULESET_7_REVISION_19_DINOSAURS.md#153-balance-acceptance-from-the-brief),
tunes numbers inside the
[section 15.1 bounds](../product/RULESET_7_REVISION_19_DINOSAURS.md#151-tuning-bounds)
and the Dinosaur-only Normal AI, and records the result in the contract's
[tuning record](../product/RULESET_7_REVISION_19_DINOSAURS.md#154-tuning-record-pulp_wars-c878).
The Goblin history is in the
[Goblin balance report](RULESET_7_GOBLIN_BALANCE.md) and the Human-vs-Undead
history in the [Undead balance report](RULESET_7_UNDEAD_BALANCE.md).

**This is an interim baseline.** While the bead ran, the user play-tested the
faction and asked for a rework (revision 20: the Triceratops becomes an
attack-after-move unit, the T-Rex costs more and hatches later, the
Nesting branch changes, and Humans get stronger) with its own balance pass.
The bead stopped there: the tuned set of section 4 was measured on the seven
Dinosaur pairings only, and the after-tuning run of the nine earlier pairings
and of the four-seat mixes was not finished. The matrix extension, the
telemetry, and the findings of section 7 are what revision 20 should reuse.

All results are Normal AI against Normal AI: they measure the rules as the
current policy plays them, not as a skilled human would.

## 1. Summary

- **Before** (contract values, 8e62a48): Dinosaurs won 48.7% of decided
  games against Humans, 40.8% against Undead, and 41.8% against Goblins.
  Stampede was used in 28.7% of the Dinosaur seat-games that researched
  Sawmilling (target: half). A T-Rex Egg was laid in 12.9% of seat-games.
- **After** (seven Dinosaur pairings, 2,100 games): **55.8%** [52–60]
  against Humans, **47.4%** [43–52] against Undead, **45.3%** [41–49]
  against Goblins; Stampede in **52.6%** of the Sawmilling seat-games; a
  T-Rex Egg in 17.0% of seat-games and in 39.0% of those of matches lasting
  35 rounds or more. No errors, stalls, or exceptions.
- **Numbers changed** (all inside section 15.1): Caveman HP 12 (was 10);
  Triceratops 1 slot (was 2) and hatch time 1 (was 2); a Forest lane tile
  counts as open for Stampede (the named fallback).
- **AI changed** (Dinosaur seats only): first-Triceratops production bias 20
  (was 4); research toward the Triceratops and the T-Rex at priority 1170
  once the seat owns two cities; an unmoved Triceratops walks toward the
  nearest tile with an open lane.
- **Not finished:** the after-tuning run of the nine pairings without a
  Dinosaur seat and of the mixes. Parity rests on a 24-match run that is
  identical to the untuned tree in every command, event, and state.
- **Why Stampede and the T-Rex were rare** (section 7): both units sit
  behind tier-3 technologies that the policy buys at about round 30, when
  the median match ends at round 32; a two-slot Egg waits for two free
  slots in cities that are full or one slot short on three city-turns in
  four; Forest closed most lanes that geometry offered; and a Triceratops
  (Move 1, no attack after moving) trails its army.
- **Watch items for revision 20** (section 8): Dinosaur armies are as
  numerous as everyone else's; matches are decided by Cavemen before the
  beasts matter; Eggs are a small liability; water maps are the weak spot.

## 2. Reproduction

The matrix script (`npm run balance:ruleset7-undead`,
[script](../../scripts/ruleset7-undead-balance-matrix.ts)) gained the
Dinosaur 1v1 pairings `DH`, `HD`, `DU`, `UD`, `DG`, `GD`, and `DD`, the
four-seat mixes with all four factions `HUGD`, `DHUG`, `GDHU`, and `UGDH`
(16 × 16, three AI, seeds 0–3 per map), and the section 15.2 Dinosaur
telemetry (`summary.dinosaur`, section 3). `H` is Human (`ORIGINAL`), `U`
Undead, `G` Goblin, and `D` Dinosaur, in seat order. The nine earlier 1v1
pairings and the five earlier mixes are unchanged.

Two options were added. `--first-seed K` starts the 1v1 seeds at `K`.
`--from-detail a.json,b.json` runs no match: it reads the per-match entries
of earlier `--detail-output` files and summarises the cells the other
parameters select, so one matrix can be run as several processes and merged
(the summary is a pure function of the per-match entries). The before file
was made that way from three processes.

```bash
# Before: a copy of main 8e62a48 (git archive) with this bead's script
npm run balance:ruleset7-undead -- --jobs 3 --pairings HU,UH,UU,HH,GH,HG,GU,UG,GG --detail-output before-n-detail.json
npm run balance:ruleset7-undead -- --jobs 3 --pairings DH,HD,DU,UD,DG,GD,DD --detail-output before-d-detail.json
npm run balance:ruleset7-undead -- --jobs 2 --pairings HUHU,UHUH,GHUG,HUGH,UGHU,HUGD,DHUG,GDHU,UGDH --detail-output before-m-detail.json
npm run balance:ruleset7-undead -- --from-detail before-n-detail.json,before-d-detail.json,before-m-detail.json --output RULESET_7_DINOSAUR_BALANCE_BEFORE.json
# After (this bead): the Dinosaur pairings only
npm run balance:ruleset7-undead -- --jobs 4 --pairings DH,HD,DU,UD,DG,GD,DD --output docs/validation/RULESET_7_DINOSAUR_BALANCE_AFTER.json
```

| Parameter         | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| 1v1 pairings      | `HU`, `UH`, `UU`, `HH`, `GH`, `HG`, `GU`, `UG`, `GG`, `DH`, `HD`, `DU`, `UD`, `DG`, `GD`, `DD` |
| Maps, sizes       | `DRY_LAND`, `PANGEA`, `CONTINENTS`, `ARCHIPELAGO`, `LAKES`; 11 and 14                          |
| 1v1 seeds         | 0–29 for every pairing × map × size cell (4,800 games before; 2,100 Dinosaur games after)      |
| Four-seat         | 16 × 16; the five earlier mixes and `HUGD`, `DHUG`, `GDHU`, `UGDH`; seeds 0–3 (180, before)    |
| Caps              | 150 rounds (1v1), 120 rounds (four-seat), 30,000 commands, 128 commands per turn               |
| Mode / difficulty | Rival, Normal                                                                                  |
| Wall time         | before 17,559 s + 15,535 s + 18,542 s (3, 3, and 2 jobs); after 10,100 s (4 jobs)              |

Outputs: [before](RULESET_7_DINOSAUR_BALANCE_BEFORE.json) (all 4,980 games
of the untuned tree) and [after](RULESET_7_DINOSAUR_BALANCE_AFTER.json) (the
2,100 Dinosaur 1v1 games of the tuned tree). Wall time is printed to stderr
and is not in the JSON; the machine ran other work at the same time, so it
is not a benchmark.

## 3. Dinosaur telemetry

Each match with a Dinosaur seat replays its accepted command log through the
reducer, so every event is attributed with the owners, roles, and forms of
the units just before it. Rounds advance at each Start Turn of the first
seat in turn order. Per Dinosaur seat and game (`MatrixEntry.dinosaur`):

- Eggs by the role inside: laid, hatched by the countdown and by a Shaman,
  destroyed by enemies (with the cause and the attacker's faction and role),
  lost with a captured city, removed with an eliminated owner, and abandoned;
  the Coins paid for Eggs and for those destroyed; Egg-turns on the board;
  hatch delays in rounds; the round of the first Egg of each role;
- growth: units that reached Big and Alpha by role, and grown units killed;
- Stampedes by distance, with kills, Egg kills, pushes, blocked pushes,
  damage, Field Defense destroyed, targets on a city center and those pushed
  off it, and Triceratops killed before their owner's next turn; ordinary
  Triceratops attacks; and, at the start of each own turn, the land-form
  Triceratops and those with at least one lane offered
  (`queryStampedeLanesV7` on the seat's public view);
- Spitter attacks and those whose target stood in cover or behind
  fortification; hits reduced by Armoured; Shaman Hatches, War Drums (and
  units inspired), and Tend Wounded;
- at each own End Turn: units owned, and for each own city its used slots
  and capacity, whether it is over capacity, full, short of two free slots,
  or without a nest tile; land-form T-Rexes, Triceratops, and Brontosauruses
  on the board;
- hostile kills by the credited unit's role, losses by role and cause, units
  trained, the round each technology was researched in, own turns, and turns
  at the 128-command cap.

`summary.dinosaur` adds the section 15.3 measures: Dinosaur win against each
faction with Wilson intervals, by seat order, size, map, and map/size; the
cap rate of each Dinosaur pairing against the 1v1 pairings of the same run
without a Dinosaur seat; the Stampede funnel (seat-games with Sawmilling,
with a Triceratops Egg, with a hatched Triceratops, with a lane, with a
Stampede); T-Rex Eggs in matches of 35 rounds or more; and the telemetry
summed per pairing, per opponent, over all 1v1 games, and over the four-seat
mixes. An Egg now counts as a trained unit in the per-seat economy
(`trainingCoins`, `trainedUnits`); no other seat lays Eggs, so every other
number of the earlier summaries is unchanged. `summary.goblin` is computed
from the revision-17 pairings only, as before.

## 4. Targets (section 15.3)

| #   | Target                                                                     | Before (8e62a48)                              | After (Dinosaur pairings)                                                     | Met     |
| --- | -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- | ------- |
| T1  | Dinosaur win in decided `DH` + `HD` within 40–60%                          | 48.7% [45–53] (285/585)                       | **55.8%** [52–60] (328/588)                                                   | yes     |
| T2  | Dinosaur win in decided `DU` + `UD` within 40–60%                          | 40.8% [37–45] (241/590)                       | **47.4%** [43–52] (277/584)                                                   | yes     |
| T3  | Dinosaur win in decided `DG` + `GD` within 40–60%                          | 41.8% [38–46] (249/595)                       | **45.3%** [41–49] (268/592)                                                   | yes     |
| T4  | Each Dinosaur pairing's cap rate at most 3 points above the other pairings | 0.7–3.3% vs 2.3% reference (+1.0 point worst) | 0.7–3.0% vs **2.3%** reference (**+0.7** point worst, `UD`)                   | yes     |
| T5  | Stampede in at least half of the seat-games with Sawmilling                | 28.7% (247/860)                               | **52.6%** (581/1,104); against Goblins alone 46.7% (100/214)                  | yes     |
| T6  | Eggs destroyed in a meaningful minority (watch band 15–60% of seat-games)  | 24.3% of seat-games (583/2,400); 3.3% of Eggs | **25.7%** of seat-games (617/2,400); 3.6% of Eggs laid (934/26,109)           | yes     |
| T7  | A unit reaches Big in at least half of seat-games                          | 79.2%; 3.45 Big and 0.62 Alpha per seat-game  | **80.0%** (1,921/2,400); 3.67 Big and 0.65 Alpha per seat-game                | yes     |
| T8  | No stalls, policy errors, or exceptions                                    | 0 / 0 / 0 in 4,980 games                      | **0 / 0 / 0** in 2,100 games                                                  | yes     |
| T9  | Pairings without a Dinosaur seat byte-identical                            | —                                             | 24 of 24 parity matches identical; the 2,800-game hash comparison was not run | partial |
| —   | T-Rex Egg in at least ~15% of seat-games of matches of 35+ rounds (brief)  | 31.5% (308/979); 12.9% of all seat-games      | **39.0%** (394/1,011); 17.0% of all seat-games (408/2,400)                    | yes     |

T4's reference is the cap rate of the nine pairings without a Dinosaur seat
in the before run (62 of 2,700, 2.3%); by T9 they are the same games after
tuning. T9: the parity run (`HH`, `HU`, `UH`, `UU`, `GH`, `UG`, `GG`, and
three- and four-seat matches of Humans, Undead, and Goblins, two seeds each,
60 rounds; normalised state and event-chain hashes) is identical to 8e62a48.
Every Dinosaur rule and AI change is gated on a Dinosaur seat or on the
Dinosaur registration. The full comparison of the 2,700 1v1 games and 100
mix games against the before file was started and stopped at 1,150 games
when the bead was cut short; it should be part of the revision 20 run.

## 5. Before and after

### 5.1 Win rates (decided games, 95% Wilson intervals)

| Pairing | Dinosaur win before             | Dinosaur win after              | Rounds mean / median / p90 after | Cap rate before → after |
| ------- | ------------------------------- | ------------------------------- | -------------------------------- | ----------------------- |
| `DH`    | 49.3% [44–55] (144/292)         | 59.2% [54–65] (173/292)         | 34.6 / 32 / 56                   | 2.7% → 2.7%             |
| `HD`    | 48.1% [42–54] (141/293)         | 52.4% [47–58] (155/296)         | 34.6 / 33 / 50                   | 2.3% → 1.3%             |
| `DU`    | 43.4% [38–49] (128/295)         | 48.5% [43–54] (142/293)         | 34.2 / 32 / 50                   | 1.7% → 2.3%             |
| `UD`    | 38.3% [33–44] (113/295)         | 46.4% [41–52] (135/291)         | 34.4 / 32 / 52                   | 1.7% → 3.0%             |
| `DG`    | 44.1% [39–50] (131/297)         | 47.6% [42–53] (140/294)         | 30.3 / 28 / 47                   | 1.0% → 2.0%             |
| `GD`    | 39.6% [34–45] (118/298)         | 43.0% [38–49] (128/298)         | 31.4 / 29 / 49                   | 0.7% → 0.7%             |
| `DD`    | seat 0: 51.0% [45–57] (148/290) | seat 0: 48.5% [43–54] (143/295) | 34.6 / 33 / 52                   | 3.3% → 1.7%             |

| Dinosaur win by size | 11 × 11 before | 11 × 11 after | 14 × 14 before | 14 × 14 after |
| -------------------- | -------------: | ------------: | -------------: | ------------: |
| Against Humans       |          51.5% |         61.4% |          45.9% |         50.2% |
| Against Undead       |          43.5% |         49.7% |          38.1% |         45.1% |
| Against Goblins      |          45.8% |         50.8% |          37.9% |         39.7% |

| Dinosaur win by map, after (before) | Dry Land      | Pangea        | Continents    | Archipelago   | Lakes         |
| ----------------------------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| Against Humans                      | 60.0% (51.3%) | 66.4% (50.9%) | 52.1% (45.2%) | 47.5% (46.6%) | 53.0% (49.6%) |
| Against Undead                      | 56.3% (45.8%) | 62.4% (44.5%) | 34.8% (35.6%) | 34.5% (36.4%) | 48.3% (41.9%) |
| Against Goblins                     | 50.0% (43.3%) | 57.6% (52.9%) | 33.6% (31.4%) | 32.2% (27.7%) | 52.5% (53.8%) |

The pairings without a Dinosaur seat (before run; by T9 unchanged): Undead
win 58.8% (`HU`) and 64.5% (`UH`); Goblins win 57.2% against Humans and
48.4% against Undead; seat 0 wins 52.2% (`UU`), 53.1% (`HH`), and 50.3%
(`GG`); decided games last 30.4–35.3 rounds on average; caps 0.3–4.3%.

Four-seat mixes with all four factions (before run only, 20 games each;
cities held at the end):

| Mix    | Human / Undead / Goblin / Dinosaur cities | Dinosaur seats alive | Round caps |
| ------ | ----------------------------------------- | -------------------- | ---------- |
| `HUGD` | 7 / 73 / 51 / 75                          | 15 of 20             | 4          |
| `DHUG` | 36 / 49 / 96 / 31                         | 8 of 20              | 7          |
| `GDHU` | 33 / 95 / 38 / 44                         | 12 of 20             | 4          |
| `UGDH` | 80 / 42 / 60 / 33                         | 11 of 20             | 6          |

### 5.2 Dinosaur play (all 2,400 Dinosaur seat-games of the 1v1 pairings)

| Measure                                           |                      Before |                         After |
| ------------------------------------------------- | --------------------------: | ----------------------------: |
| Cavemen / Shamans trained                         |              23,517 / 2,237 |                23,971 / 1,930 |
| Patrol Boats / Battleships trained                |                17,646 / 871 |                  16,114 / 796 |
| Eggs laid: Raptor / Spitter / Ankylosaurus        |        6,916 / 219 / 13,494 |          6,715 / 198 / 11,484 |
| Eggs laid: Triceratops / T-Rex                    |               3,238 / 1,832 |                 6,041 / 1,671 |
| Eggs laid per seat-game                           |                       10.71 |                         10.88 |
| Eggs hatched by time / by Shaman                  |                23,936 / 300 |                  24,457 / 221 |
| Eggs destroyed by enemies (share of laid)         |                  841 (3.3%) |                    934 (3.6%) |
| Seat-games with an Egg destroyed                  |                 583 (24.3%) |                   617 (25.7%) |
| Eggs lost with a city / abandoned                 |                     305 / 0 |                       249 / 0 |
| Coins in destroyed Eggs / in all Eggs             |             4,147 / 135,840 |               4,736 / 146,712 |
| Hatch delay 1 / 2 / 3 rounds                      |         14,334 / 9,872 / 30 |           16,254 / 8,352 / 72 |
| Most units at an End Turn (mean / p90)            |                   13.6 / 26 |                     14.0 / 26 |
| Used slots / capacity per city-turn               |                 3.97 / 4.87 |                   3.82 / 4.73 |
| City-turns full / with under two free slots       |               51.9% / 77.8% |                 50.6% / 77.4% |
| City-turns over capacity / with no nest tile      |                 1.4% / 1.6% |                   1.0% / 1.5% |
| Sawmilling seat-games (median round)              |                    860 (30) |                    1,104 (26) |
| Chivalry seat-games (median round)                |                    523 (38) |                      852 (30) |
| First Triceratops / T-Rex Egg (median round)      |                     34 / 41 |                       29 / 38 |
| Seat-games with a Triceratops / a T-Rex hatched   |                   556 / 293 |                     908 / 374 |
| Stampedes (per seat-game)                         |                  763 (0.32) |                  2,753 (1.15) |
| Stampedes from distance 2 / 3                     |                   440 / 323 |                 1,280 / 1,473 |
| Stampede kills / pushes / blocked pushes          |             393 / 181 / 189 |             1,578 / 552 / 623 |
| Stampede damage; Field Defense destroyed          |                  7,088; 182 |                   26,936; 580 |
| Stampedes at a city center / pushed off it        |                    113 / 41 |                     346 / 114 |
| Triceratops lost within a round of a Stampede     |                         118 |                           571 |
| Ordinary Triceratops attacks                      |                       1,622 |                         3,794 |
| Triceratops-turns with a lane                     |      1,780 of 21,925 (8.1%) |       6,482 of 42,338 (15.3%) |
| Sawmilling → Egg → hatched → lane → Stampede      | 860 → 575 → 556 → 306 → 247 | 1,104 → 910 → 908 → 649 → 581 |
| Units that reached Big / Alpha                    |               8,270 / 1,484 |                 8,814 / 1,548 |
| Seat-games with a Big / an Alpha unit             |               79.2% / 32.7% |                 80.0% / 31.8% |
| Grown units killed (share of those that grew)     |               4,934 (59.7%) |                 5,507 (62.5%) |
| Spitter attacks (ignoring cover or fortification) |                   907 (427) |                     553 (249) |
| Hits reduced by Armoured                          |                      19,027 |                        15,835 |
| Shaman Hatches (seat-games)                       |                   300 (231) |                     221 (166) |
| War Drums (units inspired) / Tend Wounded         |        9,897 (21,038) / 804 |          8,353 (16,061) / 752 |
| Own turns at the 128-command cap                  |                 8 of 85,121 |                   0 of 84,193 |

## 6. Iterations

Each candidate was screened with the matrix script on the seven Dinosaur
pairings, seeds 0–9, sizes 11 and 14, all five maps (700 games, 800 Dinosaur
seat-games), on throwaway copies of the source tree run in parallel. The
table lists them in the order tried; each row names what it adds to an
earlier row. Win rates are of decided games; "Sawmilling round" is the median
round of that research; "T-Rex Egg, 35+ rounds" is the share of Dinosaur
seat-games in matches of 35 rounds or more with a T-Rex Egg laid; "Egg
destroyed" is the share of seat-games with an Egg destroyed by an enemy. With
about 195 decided games per opponent, a win rate moves about ±3.5 points
between candidates that change nothing relevant, and the Stampede share
about ±3.

| Candidate                                                       | vs Human | vs Undead | vs Goblin | Stampede seat-games / Sawmilling | Sawmilling round | T-Rex Egg, 35+ rounds | Egg destroyed |
| --------------------------------------------------------------- | -------: | --------: | --------: | -------------------------------: | ---------------: | --------------------: | ------------: |
| untuned (8e62a48)                                               |      48% |       43% |       42% |                     75/273 (28%) |               30 |                   33% |           23% |
| `P1`: Forest lane tiles open; first-Triceratops bias 12         |      46% |       44% |       41% |                    115/273 (42%) |               30 |                   33% |           24% |
| `P2`: `P1` + Triceratops cost 7, T-Rex cost 8 and hatch time 2  |      47% |       44% |       41% |                    122/275 (44%) |               30 |                   38% |           23% |
| `S1`: `P1` + signature research at 1100                         |      49% |       43% |       42% |                    118/280 (42%) |               29 |                   38% |           22% |
| `S2`: `P1` + Triceratops 1 slot                                 |      46% |       46% |       42% |                    130/274 (47%) |               30 |                   37% |           24% |
| `S3`: `P1` + Caveman HP 12                                      |      55% |       49% |       43% |                    124/276 (45%) |               29 |                   31% |           25% |
| `T1`: `S1` + lane approach                                      |      49% |       44% |       42% |                    122/280 (44%) |               29 |                   38% |           21% |
| `T3`: `P1` + Ankylosaurus cost 4, Raptor cost 3                 |      50% |       42% |       43% |                    116/288 (40%) |               29 |                   29% |           23% |
| `T4`: `P1` + Ankylosaurus hatch time 1                          |      52% |       46% |       40% |                    126/277 (46%) |               29 |                   34% |           13% |
| `T2`: `T1` + bias 20, Triceratops hatch time 1, Caveman HP 12   |      55% |       49% |       45% |                    141/281 (50%) |               28 |                   40% |           23% |
| `V1`: `T2` with Caveman HP 10, Raptor HP 14, Ankylosaurus HP 24 |      47% |       45% |       45% |                    142/294 (48%) |               29 |                   35% |           23% |
| `V2`: `T2` with Caveman HP 10, Ankylosaurus HP 24               |      48% |       42% |       41% |                    123/287 (43%) |               29 |                   35% |           23% |
| `U1`: `T2` + Triceratops HP 22                                  |      54% |       50% |       45% |                    144/282 (51%) |               28 |                   23% |           23% |
| `U3`: `T2` + Triceratops HP 22, cost 7                          |      55% |       50% |       45% |                    147/281 (52%) |               28 |                   24% |           23% |
| `U2`: `T2` + Triceratops 1 slot                                 |      57% |       50% |       45% |                    145/280 (52%) |               28 |                   39% |           24% |
| `W1`: `T2` + one-turn Coin hold for signature research          |      55% |       47% |       47% |                    124/289 (43%) |               28 |                   35% |           23% |
| `X3`: `T2` with signature research at 1170                      |      55% |       49% |       43% |                    167/332 (50%) |               26 |                   39% |           23% |
| `X1`: `X3` + Coin hold                                          |      54% |       42% |       44% |                    149/414 (36%) |               21 |                   31% |           23% |
| `X2`: `X1` from the first city                                  |      52% |       41% |       46% |                    188/592 (32%) |               17 |                   31% |           23% |
| `Y1`: `T2` + two slots kept free for the first big body         |      55% |       49% |       45% |                    137/281 (49%) |               28 |                   41% |           23% |
| `Y2`: `X3` + two slots kept free                                |      55% |       48% |       44% |                    162/333 (49%) |               26 |                   42% |           23% |
| `Z1`: `Y1` + an own unit steps off a lane's stand tile          |      55% |       49% |       45% |                    138/281 (49%) |               28 |                   41% |           23% |
| `Z2`: `Y2` + an own unit steps off a lane's stand tile          |      55% |       48% |       44% |                    163/333 (49%) |               26 |                   42% |           23% |
| `F2`: `X3` + half the Stampede exposure penalty                 |      55% |       50% |       44% |                    170/332 (51%) |               26 |                   39% |           23% |
| `F1`: `X3` + Triceratops 1 slot (**chosen**)                    |      54% |       50% |       42% |                    184/333 (55%) |               26 |                   41% |           23% |
| `F3`: `F1` + half the Stampede exposure penalty                 |      55% |       51% |       42% |                    184/333 (55%) |               26 |                   41% |           23% |

What the iterations showed:

- **Hatch times, slots, and costs first.** Cheaper and faster big bodies
  (`P2`), a cheaper Ankylosaurus and Raptor (`T3`), and an Ankylosaurus that
  hatches in one turn (`T4`) did not move the win rates; `T4` also cut the
  seat-games with an Egg destroyed to 13% (below the watch band), because
  nine destroyed Eggs in ten are Ankylosaurus Eggs. Only the Triceratops
  slot mattered (`S2`, `U2`, `F1`), and for Stampede use, not for the win
  rate.
- **Then stats.** Caveman HP 12 (`S3`) is worth about +7 points against
  Humans, +5 against Undead, and +3 against Goblins. Tougher beasts instead
  (`V1`, `V2`) did nothing. Triceratops 22 HP (`U1`, `U3`) raised its
  production value above the T-Rex's and cut T-Rex Eggs by more than a
  third; not taken.
- **Research.** Signature research above land production (`S1`) barely
  moves the timing: the technology is bought only on a turn that starts
  with its whole cost, and the economic plan (priority 1160) and threatened
  cities spend first. Above the economic plan (`X3`) it is bought two
  rounds earlier (four against the untuned tree) and in a fifth more
  seat-games, at no cost in win rate.
  Saving one turn of income for it (`W1`, `X1`, `X2`) brings Sawmilling to
  round 17–21 but costs 6–8 points against Undead, and the first
  Triceratops Egg still came nine rounds after the research, for want of
  two free slots.
- **Three AI rules made no measurable difference and were removed:** keeping
  two slots free in one city for the first big body (`Y1`, `Y2`), stepping
  an own unit off a lane's stand tile (`Z1`, `Z2`), and half the exposure
  penalty of a Stampede (`F2`, `F3`). The lane approach (`T1`) is worth
  about a point and was kept because the contract asks for it.
- **The Triceratops slot** (`F1`): with one slot the Egg is laid as soon as
  Sawmilling is known, a seat lays two thirds more Triceratops, and Stampede
  use reaches 55% on the screening seeds (52.6% on all thirty).

## 7. Why Stampede and the T-Rex were rare

These are the findings revision 20 should start from.

1. **Both units arrive when the match is over.** Sawmilling and Chivalry
   are tier-3 technologies (12 Coins plus 5 per further city). Untuned,
   Sawmilling was researched in 36% of seat-games at a median round of 30
   and Chivalry in 22% at round 38; the median decided match ends at round 32. Stampede use depends almost only on the time left: after tuning, 75%
   of the seat-games with eleven or more rounds left after Sawmilling used
   Stampede (510 of 679), and 17% of those with ten or fewer (71 of 425).
   Winners research Sawmilling late, as a luxury: 42% of winning Sawmilling
   seat-games Stampede (271 of 639) against 67% of losing ones (310 of 465),
   who fight near their own cities.
2. **The policy does not save for research.** A technology is bought only
   on a turn that starts with its whole cost. Research toward a missing
   role has priority 1060, below land production (1080), threatened
   training (1260), and the economic plan (1160), and it needs a city with
   a free slot; on water maps the naval Coin reserve also holds back every
   other research. A seat's bank is 2–3 Coins from round 20 to round 30.
   A one-turn hold fixed the timing and cost 6–8 points against Undead.
3. **Two-slot Eggs wait for slots.** Dinosaur cities are full on 52% of
   city-turns and have fewer than two free slots on 78%: the policy refills
   a freed slot with a Caveman at once. With Sawmilling researched at round
   17–21 (`X1`, `X2`), the first Triceratops Egg still came at round 27–30.
   The T-Rex has the same problem and also loses the production comparison:
   the policy values a role at its HP minus twice its cost, which puts the
   T-Rex (28 − 20, minus 2 for its hatch time) below the Ankylosaurus
   (20 − 10) except for the one-time bonus of a role the seat does not own.
4. **Terrain and crowding closed the lanes.** Untuned, a lane was open on
   8% of Triceratops-turns. In a replay of 70 untuned matches a hostile unit
   stood in lane geometry on 134 of 736 Triceratops-turns; the lane was open
   on 16, and on 46 with Forest counted as open. The other closures: water
   42, an own unit on the stand tile 30, a hostile unit in the lane 12,
   Mountain 10. On 501 of the 736 there was no hostile unit within three
   tiles at all: a Triceratops has Move 1 and cannot attack after moving, so
   it trails the army.
5. **When a lane is there, the AI takes it.** Nine seat-games in ten that
   are offered a lane at the start of a turn Stampede at least once (581 of
   649). The exposure penalty and the hold rule are not the limit.

## 8. How the Dinosaurs play, and watch items

- **Hordes and elites: the horde is visible, the elites less so.** A seat
  trains 10.0 Cavemen and lays 10.9 Eggs per game: 4.8 Ankylosaurus, 2.8
  Raptor, 2.5 Triceratops, 0.7 T-Rex, 0.08 Spitter. It owns 14 units at its
  peak and produces as many units as its opponents (25–32 per game on both
  sides). "Few" comes only from the T-Rex and the Brontosaurus; with a
  one-slot Triceratops and Ankylosaurus the slot rule rarely binds.
  **Watch item:** the faction does not play as "few, big".
- **The T-Rex shows up in long matches:** an Egg in 17% of seat-games (39%
  of those of 35 rounds or more), the first at a median round of 38. A
  T-Rex makes 1.1 kills on average and 34% of them reach Big. **Watch item** for a costlier, slower T-Rex: it will appear less.
- **Cavemen decide matches.** The Caveman makes 12,441 of the 28,800 kills
  by land units and takes more than half of the land losses. Its HP was the only number that moved
  the win rate. Dinosaur wins got faster (32.1 rounds against Humans, 34.2
  before) and 13% of them come by round 15 (11% before). **Watch item:**
  a Caveman rush is not the faction's identity.
- **Eggs matter a little.** An enemy destroys an Egg in a quarter of
  seat-games, but only 3.6% of Eggs and 3.2% of the Coins spent on them.
  83% of the destroyed Eggs are Ankylosaurus Eggs (hatch time 2); a Raptor
  or Spitter Egg (hatch time 1) is destroyed 1.4% of the time, so it is
  training in all but name. 249 Eggs were lost with a captured city. The
  Shaman Hatch is used in 7% of seat-games: only Ankylosaurus and T-Rex
  Eggs have more than one turn to save.
- **Stampede is a field charge more than a siege tool.** 2,753 Stampedes:
  57% kill, 20% push, 23% are blocked; 13% hit a unit on a city center and
  a third of those push it off; 580 destroy Field Defense. One Stampede in
  five costs the Triceratops within a round (571).
- **Growth happens and does not snowball.** A unit reaches Big in 80% of
  seat-games (3.7 per game) and Alpha in 32% (0.65 per game); 62% of the
  units that grew are killed later.
- **The Spitter is never laid** (198 Eggs in 2,400 seat-games): at 10 HP
  for 4 Coins it has the lowest production value, like the Goblin Bomb
  Chucker before its bias. Acid ignored cover or fortification in 249 of
  its 553 attacks.
- **Water maps are the weak spot.** Against Undead and Goblins, Dinosaurs
  win 56–62% and 50–58% on Dry Land and Pangea but 32–35% on Continents and
  Archipelago, where the matches are decided by boats that every faction
  shares, and where Warrens give Goblins more of them. Nearly a quarter
  of the units a Dinosaur seat produces are Patrol Boats.
- **Map size:** against Goblins, 50.8% on 11 × 11 and 39.7% on 14 × 14.
- **Seat order against Humans:** `DH` 59.2%, `HD` 52.4%.
- **Income:** Dinosaur seats earn 9.8–10.7 Coins at round 20 against their
  opponents' 11.1–12.2. The likely cause, not measured: laying does not need
  an empty center, so every city produces every turn and less is left for
  the economy.

## 9. Benchmark pin

`scripts/benchmark-ruleset-v7-normal-policy.ts` threw "Normal policy parity
changed" on every tree since 521c3da (revision 4, 2026-09-12): it carried
its own copy of the expected decision (a Forge at (9, 8), pinned at
09b6cf8), no gate ran it, and the decision for the retained view became the
Attack of unit 19 on unit 34 at 521c3da and its hash changed twelve more
times afterwards. `tests/unit/ruleset-v7-normal-policy.test.ts` pinned the
same decision and was kept current. Both now read one pin,
`RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION` in
`scripts/ruleset-v7-late-public-view-contract.ts`, so the benchmark cannot go
stale without the unit test failing. The decision is unchanged by this bead.

## 10. Proposals for revision 20

None of these was applied.

1. **Run the unfinished comparison first:** the nine pairings without a
   Dinosaur seat and the nine mixes, against the before file.
2. **If the signature units should appear in ordinary matches,** move them
   to tier-2 technologies or give Dinosaur seats a cheaper path to them, and
   let the policy save for a technology. Timing, not unit strength, kept
   them out.
3. **Decide what slots are for.** With the Triceratops at one slot only the
   T-Rex and the Brontosaurus are big bodies. If "few, big" is wanted, the
   Ankylosaurus and the Caveman have to cost room, or city capacity has to
   be lower for Dinosaurs.
4. **Give the Spitter a production bias** or better stats; it is unused.
5. **Egg risk** could come from hatch time 2 for the Raptor and Spitter (the
   named fallback): today hatch-time-1 Eggs are safe.
