# Ruleset 7 revision 17: Goblin balance report

Bead `pulp_wars-0ao.7`. It measures the Goblin faction of
[revision 17](../product/RULESET_7_REVISION_17_GOBLINS.md) against the
balance acceptance of its
[section 14.3](../product/RULESET_7_REVISION_17_GOBLINS.md#143-balance-acceptance-from-the-brief),
tunes numbers inside the
[section 14.1 bounds](../product/RULESET_7_REVISION_17_GOBLINS.md#141-tuning-bounds)
and the Goblin-only Normal AI until every target is met, and records the
result in the contract's
[tuning record](../product/RULESET_7_REVISION_17_GOBLINS.md#144-tuning-record-pulp_wars-0ao7).
The Human-vs-Undead history stays in the
[Undead balance report](RULESET_7_UNDEAD_BALANCE.md).

All results are Normal AI against Normal AI: they measure the rules as the
current policy plays them, not as a skilled human would.

## 1. Summary

- **Before:** Goblins won 72.0% of decided games against Humans and 65.6%
  against Undead. The Normal AI never trained a Bomb Chucker, and 33.7% of
  the deaths caused by Goblin explosions were own units (44.0% against
  Undead).
- **After:** Goblins win **56.9%** [53–61] against Humans and **49.7%**
  [46–54] against Undead. Every section 14.3 target is met (section 4):
  Goblin cap rates are at or below the non-Goblin reference, Kaboom is used in
  67.7% of Goblin seat-games and deals 12 times more hostile than friendly
  damage, 25.2% of Goblin explosion deaths are friendly fire, there are no
  errors, stalls, or exceptions, and all 1,200 non-Goblin games keep
  byte-identical final hashes.
- **Numbers changed** (all inside section 14.1): one starting Goblin instead
  of two (Militia still gives two), Goblin Attack 1.5 and Defense 0.5,
  Goblin Kaboom 5, death blasts 2 (Bomb Chucker) and 4 (Rocket Cart, Scrap
  Buggy).
- **AI changed** (Goblin seats only): the Bomb Chucker is trained (about one
  per game), a Kaboom weighs friendly losses twice, and exploding units keep
  away from own units whenever any visible enemy can damage them.
- **Watch items** (section 7): Bomb Chucker bombs kill almost as many own
  units as enemies (46.4% friendly); chain reactions practically never
  happen in AI play (longest chain 2); Plunder is about 2% of a Goblin
  seat's income; Goblins are stronger on 14 × 14 than on 11 × 11. The
  proposals that need root approval are in section 8.

## 2. Reproduction

The matrix script (`npm run balance:ruleset7-undead`,
[script](../../scripts/ruleset7-undead-balance-matrix.ts)) gained the Goblin
1v1 pairings `GH`, `HG`, `GU`, `UG`, and `GG`, the four-seat mixes with all
three factions `GHUG`, `HUGH`, and `UGHU` (16 × 16, three AI, seeds 0–3 per
map), and the section 14.2 Goblin telemetry (`summary.goblin`, section 3).
`H` is Human (`ORIGINAL`), `U` Undead, and `G` Goblin, in seat order. The
Human/Undead pairings `HU`, `UH`, `UU`, `HH`, `HUHU`, and `UHUH` are
unchanged and run in the same matrix as the baseline.

```bash
# After (this bead): every pairing, seeds 0-29, sizes 11 and 14, 150 rounds
npm run balance:ruleset7-undead -- --jobs 7 --output docs/validation/RULESET_7_GOBLIN_BALANCE_AFTER.json --detail-output after-detail.json
# Before: a copy of main 978b929 (git archive) with this bead's script,
# Goblin pairings and mixes only, writing RULESET_7_GOBLIN_BALANCE_BEFORE.json
npm run balance:ruleset7-undead -- --jobs 4 --pairings GH,HG,GU,UG,GG,GHUG,HUGH,UGHU --output RULESET_7_GOBLIN_BALANCE_BEFORE.json --detail-output before-detail.json
# Parity: the same copy of 978b929, the four pre-Goblin 1v1 pairings,
# writing RULESET_7_GOBLIN_BALANCE_BASELINE_BEFORE.json
npm run balance:ruleset7-undead -- --jobs 2 --pairings HU,UH,UU,HH --output RULESET_7_GOBLIN_BALANCE_BASELINE_BEFORE.json --detail-output before-base-detail.json
```

| Parameter         | Value                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| 1v1 pairings      | `HU`, `UH`, `UU`, `HH`, `GH`, `HG`, `GU`, `UG`, `GG`                                 |
| Maps, sizes       | `DRY_LAND`, `PANGEA`, `CONTINENTS`, `ARCHIPELAGO`, `LAKES`; 11 and 14                |
| 1v1 seeds         | 0–29 for every pairing × map × size cell (2,700 games after, 1,500 Goblin before)    |
| Four-seat         | 16 × 16, `HUHU`, `UHUH`, `GHUG`, `HUGH`, `UGHU`, seeds 0–3 per map (100 games after) |
| Caps              | 150 rounds (1v1), 120 rounds (four-seat), 30,000 commands, 128 commands per turn     |
| Mode / difficulty | Rival, Normal                                                                        |
| Wall time         | before 6,724 s (`--jobs 4`), after 5,693 s (`--jobs 7`), parity 6,816 s (`--jobs 2`) |

Outputs: [before](RULESET_7_GOBLIN_BALANCE_BEFORE.json),
[after](RULESET_7_GOBLIN_BALANCE_AFTER.json), and the
[parity baseline](RULESET_7_GOBLIN_BALANCE_BASELINE_BEFORE.json). The
`summary` of each file was recomputed from its run's detail file with the
final script (the summary is a pure function of the per-game entries; the
recomputation only adds the Goblin over-capacity aggregate, which was added
after the before run). Wall time is printed to stderr and is not in the JSON.

## 3. Goblin telemetry

Each match with a Goblin seat replays its accepted command log through the
reducer, so every event is attributed with the owners and roles of the
units just before it. Per Goblin seat and game (`MatrixEntry.goblin`):

- Kabooms and death blasts, by role; explosions by chain wave;
- blast damage and deaths credited to the seat (the exploding unit's owner)
  by victim side: hostile, own, allied; death blasts separately;
- Kaboom chains: every explosion of a chain the seat's Kaboom started, by
  side relative to that seat (exploders excluded, as they are never hit by
  their own blast), and the Kabooms whose chain was net positive;
- Bomb Chucker bomb splash by side; Plunder Coins; Gang Up bonus 0/+1/+2 of
  the seat's attacks and the Gang Up attacks that killed; WAAAGH! uses and
  units inspired; Trolls gained and HP regenerated; own turns and turns at
  the 128-command cap; the most units owned at an End Turn;
- hostile kills and damage by the credited unit's role (attacks,
  retaliation, hostile splash, and blasts), losses by role and cause, and
  the roles of own units killed by own blasts with how the exploder died.

Per game: chains (commands or Start Turns with at least one explosion),
their sizes, the longest chain, and the deepest wave. `summary.goblin` adds
the section 14.3 measures: Goblin win against Humans (`GH` + `HG`) and
Undead (`GU` + `UG`) with Wilson intervals, by seat order, size, and
map/size; the cap rate of each Goblin pairing against the non-Goblin 1v1
reference of the same run; and the telemetry summed per pairing, per
opponent, over all 1v1 games, and over the four-seat mixes.

## 4. Targets (section 14.3)

| #   | Target                                                                   | Before                                                       | After                                                                                                  | Met |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --- |
| T1  | Goblin win in decided `GH` + `HG` within 40–60%                          | 72.0% [68–76] (422/586)                                      | **56.9%** [53–61] (339/596)                                                                            | yes |
| T2  | Goblin win in decided `GU` + `UG` within 40–60%                          | 65.6% [62–69] (383/584)                                      | **49.7%** [46–54] (290/584)                                                                            | yes |
| T3  | Each Goblin pairing's cap rate at most 3 points above the non-Goblin 1v1 | 1.0–3.0% vs 3.3% reference (−0.3 points worst)               | `GH` 0.0, `HG` 1.3, `GU` 3.3, `UG` 2.0, `GG` 2.0% vs **3.3%** reference (**+0.0** points worst)        | yes |
| T4  | Kaboom in at least half of Goblin seat-games                             | 62.3% (1,122/1,800); `GG` 50.8%                              | **67.7%** (1,218/1,800); per pairing 68.7–73.0%, `GG` 63.2%                                            | yes |
| T5  | Kaboom net-positive: hostile chain damage above friendly                 | 11,899 vs 2,186                                              | **17,570 vs 1,425** (kills 788 vs 43); 2,705 of 2,858 Kabooms net positive                             | yes |
| T6  | Friendly fire under 35% of Goblin explosion deaths                       | 33.7% (178/528); vs Human 35.9%, vs Undead 44.0%, `GG` 21.0% | **25.2%** (302/1,198); vs Human 21.8%, vs Undead 31.4%, `GG` 19.6%                                     | yes |
| T6w | Watch: bomb-splash friendly deaths against the same threshold            | no bombs (no Bomb Chucker trained)                           | 46.4% (172/371): **over** the threshold (section 7)                                                    | no  |
| T7  | No stalls, policy errors, or exceptions                                  | 0 / 0 / 0 in 1,560 games                                     | **0 / 0 / 0** in 2,800 games                                                                           | yes |
| T8  | Non-Goblin pairings byte-identical                                       | —                                                            | **1,200 of 1,200** `HU`/`UH`/`UU`/`HH` final hashes identical to the untuned tree (978b929); see below | yes |

T3's reference is the cap rate of the four non-Goblin pairings in the after
run (40 of 1,200, 3.3%); the before run did not include them, and the
parity run shows they are identical. T8 compares like with like: the
identity is `pulp-wars-poc-7r17` on both sides, so no hash differs for an
identity reason. The pre-Goblin revision-16 hashes differ only by the
ruleset identity, which `pulp_wars-0ao.2` already proved; a separate
16-match parity run (Human, Undead, three- and four-seat; normalised state
and event-chain hashes) is also identical to the `0ao.6` policy.

The four-seat mixes are not a 14.3 target. Goblin explosion deaths there are
37.7% friendly (49/130; 57.6% before), from 60 games.

## 5. Before and after

### 5.1 Win rates (decided games, 95% Wilson intervals)

| Pairing | Goblin win before       | Goblin win after        | Rounds mean / median / p90 after | Cap rate before → after |
| ------- | ----------------------- | ----------------------- | -------------------------------- | ----------------------- |
| `GH`    | 71.9% [67–77] (210/292) | 57.7% [52–63] (173/300) | 31.9 / 30 / 49                   | 2.7% → 0.0%             |
| `HG`    | 72.1% [67–77] (212/294) | 56.1% [50–62] (166/296) | 31.1 / 30 / 50                   | 2.0% → 1.3%             |
| `GU`    | 68.4% [63–74] (199/291) | 52.8% [47–58] (153/290) | 31.8 / 29 / 51                   | 3.0% → 3.3%             |
| `UG`    | 62.8% [57–68] (184/293) | 46.6% [41–52] (137/294) | 30.9 / 30 / 47                   | 2.3% → 2.0%             |
| `GG`    | seat 0: 53.2%           | seat 0: 50.3%           | 29.9 / 27 / 48                   | 1.0% → 2.0%             |

| Goblin win by size | 11 × 11 before | 11 × 11 after | 14 × 14 before | 14 × 14 after |
| ------------------ | -------------: | ------------: | -------------: | ------------: |
| Against Humans     |          69.9% |         53.0% |          74.1% |         60.7% |
| Against Undead     |          64.0% |         44.9% |          67.2% |         54.5% |

The non-Goblin pairings of the after run (identical to the untuned tree):
`HU` Undead 57.1%, `UH` Undead 62.2%, `UU` seat 0 52.0%, `HH` seat 0 54.1%;
decided games last 33.9–35.7 rounds on average; caps 2.0–6.3%.

Four-seat mixes (20 games each; cities held at the end, two seats of the
doubled faction):

| Mix    | Before: Goblin / Human / Undead cities | After: Goblin / Human / Undead cities | Goblin seats alive before → after |
| ------ | -------------------------------------- | ------------------------------------- | --------------------------------- |
| `GHUG` | 146 / 30 / 35                          | 125 / 41 / 42                         | 21 → 19 of 40                     |
| `HUGH` | 73 / 90 / 46                           | 57 / 96 / 52                          | 16 → 15 of 20                     |
| `UGHU` | 69 / 22 / 118                          | 33 / 46 / 132                         | 15 → 11 of 20                     |

### 5.2 Goblin play (all 1,800 Goblin seat-games of the 1v1 matrix)

| Measure                                       |                  Before |                   After |
| --------------------------------------------- | ----------------------: | ----------------------: |
| Goblins / Wolf Riders / Orc Brutes trained    | 20,209 / 5,087 / 13,858 | 21,910 / 5,028 / 11,290 |
| Bomb Chuckers / Rocket Carts / Warbosses      |         0 / 989 / 1,052 |   1,838 / 1,145 / 1,855 |
| Most units at an End Turn (mean / p90)        |               16.3 / 28 |               15.7 / 29 |
| Kabooms (per seat-game)                       |            2,268 (1.26) |            2,858 (1.59) |
| Kabooms by Goblin / Wolf Rider / others       |        1,944 / 260 / 64 |       2,484 / 251 / 123 |
| Death blasts                                  |                     677 |                   1,832 |
| Goblin explosion deaths: hostile / own        |               350 / 178 |               896 / 302 |
| Death blasts only: hostile / own deaths       |               122 / 135 |               109 / 259 |
| Chains with 1 / 2 explosions; longest         |           2,915 / 15; 2 |           4,606 / 42; 2 |
| Bomb splash deaths: hostile / own             |                   0 / 0 |               199 / 172 |
| Attacks with Gang Up 0 / +1 / +2              | 35,464 / 12,787 / 7,111 | 37,509 / 13,074 / 7,023 |
| Gang Up attacks that killed                   |                  13,891 |                  13,573 |
| WAAAGH! uses (units inspired)                 |           1,451 (7,167) |          2,412 (11,984) |
| Seat-games with a Troll; Troll HP regenerated |             693; 10,884 |             710; 13,121 |
| Plunder Coins per seat-game (share of income) |             6.83 (1.9%) |             7.74 (2.1%) |
| Own turns at the 128-command cap              |             5 of 55,821 |             4 of 58,134 |
| Games with Goblin over-capacity               |             25 of 1,500 |             22 of 1,500 |

## 6. Iterations

Each candidate was screened on a seed subset with the matrix script
(`--pairings GH,HG,GU,UG,GG --seeds N`, sizes 11 and 14, all five maps) in
parallel background runs, on throwaway copies of the source tree. The table
shows each candidate on the seeds it ran (and the untuned tree on the same
seeds); `FF` is the friendly share of Goblin explosion deaths, `bomb FF` the
friendly share of bomb-splash deaths, and `BC` the Bomb Chuckers trained.
The final set is `N`; the chosen exposure rule (`M`) made no measurable
difference and is kept as the simpler rule.

Seeds 0–4 (250 games; `start1` and `gang1` without `GG`, 200 games):

| Candidate                                                     | vs Human | vs Undead | Kaboom seat-games |  FF | FF vs H / vs U | bomb FF |  BC |
| ------------------------------------------------------------- | -------: | --------: | ----------------: | --: | -------------: | ------: | --: |
| untuned (978b929)                                             |      76% |       68% |           185/300 | 38% |      36% / 51% |       — |   0 |
| `start1`: one starting Goblin (and Militia one)               |      63% |       56% |           133/200 | 35% |      26% / 41% |       — |   0 |
| `gang1`: Gang Up +1                                           |      72% |       64% |           139/200 | 45% |      48% / 42% |       — |   0 |
| `bc`: Bomb Chucker training bias                              |      73% |       67% |           189/300 | 48% |      62% / 43% |     43% | 288 |
| `bc` + `start1`                                               |      63% |       56% |           185/300 | 48% |      37% / 61% |     47% | 289 |
| `A`: `bc` + `start1` + Goblin Attack 1.5 + death blasts 2/4/4 |      58% |       53% |           202/300 | 36% |      32% / 54% |     45% | 302 |
| `B`: `bc` + `start1` + Gang Up +1 + death blasts 2/4/4        |      62% |       54% |           180/300 | 40% |      39% / 38% |     38% | 307 |
| `C`: `A` + spacing when enemies can deal half the HP          |      57% |       50% |           198/300 | 30% |      32% / 41% |     39% | 275 |
| `D`: `C` + Kaboom friendly losses weighed twice               |      57% |       49% |           183/300 | 31% |      22% / 43% |     50% | 273 |
| `E`: `D` with two Militia Goblins                             |      58% |       50% |           184/300 | 29% |      17% / 45% |     54% | 272 |
| `F`: two starting Goblins, Gang Up +1, Attack 1.5, Def 0.5    |      59% |       52% |           202/300 | 51% |      40% / 61% |     32% | 282 |

Seeds 0–9 (500 games):

| Candidate                                   | vs Human | vs Undead | Kaboom seat-games |  FF | FF vs H / vs U | bomb FF |    BC |
| ------------------------------------------- | -------: | --------: | ----------------: | --: | -------------: | ------: | ----: |
| untuned (978b929)                           |      72% |       67% |           365/600 | 33% |      30% / 48% |       — |     0 |
| `D`                                         |      55% |       51% |           363/600 | 36% |      26% / 44% |     47% |   585 |
| `G`: `E` + spacing at a quarter of the HP   |      58% |       52% |           368/600 | 31% |      30% / 46% |     48% |   541 |
| `H`: `G` + Bomb Chucker HP 10               |      57% |       54% |           376/600 | 52% |      52% / 63% |     42% | 2,037 |
| `I`: `G` + Troll Defense 2.5                |      58% |       52% |           368/600 | 37% |      40% / 47% |     50% |   600 |
| `J`: `G` + Orc Brute Defense 2              |      57% |       50% |           372/600 | 39% |      37% / 49% |     42% |   588 |
| `K`: `G` + Goblin Defense 0.5               |      55% |       48% |           361/600 | 45% |      30% / 49% |     45% |   592 |
| `L`: `G` + Gang Up +1                       |      56% |       51% |           394/600 | 36% |      28% / 56% |     45% |   548 |
| `M`: `G` + spacing at any visible damage    |      58% |       51% |           368/600 | 31% |      30% / 44% |     50% |   531 |
| `N`: `M` + Goblin Kaboom 5 + Goblin Def 0.5 |      57% |       49% |           401/600 | 23% |      22% / 29% |     52% |   521 |

What the iterations showed:

- **One starting Goblin** is the largest lever (about −10 points against
  each faction). Two starting Goblins with every other nerf (`F`) also
  balanced the win rates but left half of the blast deaths friendly.
- **Gang Up +1** barely moved the win rate (`gang1`, `B`, `L`) and was not
  taken: Gang Up +2 stays, as the faction's identity.
- **The Bomb Chucker** was never trained: its 8 HP lost the HP-led training
  value to the Orc Brute. The training bias fixes that (about one per game);
  at HP 10 (`H`) the policy trains four times as many and they flood the
  board with death blasts.
- **Friendly fire is noisy** at 500 games (±5 points between candidates
  that change nothing relevant, such as `G` and `I`), and death blasts are a
  wash at best: enemies kill exploders from range, so their blasts mostly
  hit own units. Spacing helped (`C`, `G`), but the share only fell
  robustly when Kabooms kill more enemies (`N`: Goblin Kaboom 5 more than
  doubles hostile blast kills), with Goblin Defense 0.5 paying for it.
- Troll Defense 2.5 (`I`) and Orc Brute Defense 2 (`J`) did not move the win
  rate and were not taken.

## 7. How the Goblins play

- **Hordes: yes.** A Goblin seat trains about 12 Goblins per game and owns
  15.7 units at its peak (p90 29). Over-capacity is rare (22 of 1,500
  games), and only 4 of 58,134 Goblin turns reached the 128-command cap.
- **Gang Up: yes.** 35% of Goblin-side attacks carry Gang Up (13,074 at +1,
  7,023 at +2), and 13,573 of them killed their target.
- **Kaboom: yes.** 1.59 Kabooms per seat-game, in 67.7% of seat-games, 87%
  of them by Goblins; 2,705 of 2,858 Kabooms did more hostile than friendly
  damage, and Kaboom chains killed 788 enemies against 43 own units.
- **Death blasts: they happen (1,832) but mostly hurt their owner.** They
  killed 259 own units against 109 enemies: enemies kill exploders from
  range or with splash, Wail, and Plague, so a blast rarely reaches its
  killer. Most friendly victims are Goblins (130) and Patrol Boats (78);
  most killing blasts are a Bomb Chucker killed by an attack (87) or a Rocket
  Cart killed by an attack (51).
- **Chains: practically never.** 4,606 of 4,648 explosion events stand
  alone, 42 have two explosions, and none has three (the four-seat mixes saw
  three three-explosion chains before tuning, none after). The Normal AI
  keeps its exploding units apart and away from its own units, as section 10
  requires, and a Goblin seat trains only about two exploding units per game
  (1.0 Bomb Chucker, 0.6 Rocket Cart), so the AI does not build the clumps
  chains need. A human player who parks Rocket Carts
  together will see them; the AI will not. **Watch item.**
- **Plunder: barely matters.** 7.7 Coins per seat-game, 2.1% of a Goblin
  seat's income (2.6% against Undead, whose cheap raised units die often).
  It is too small to change outcomes. **Watch item** (section 8).
- **Trolls: yes.** 710 of 1,800 seat-games (39%) earned a Troll (1,680
  Trolls); Trolls regenerated 13,121 HP and killed 1,671 enemies (one per
  Troll), and only 418 (25%) were killed.
- **Units:** every trainable Goblin role is trained and kills. Goblins
  6,960 kills; Orc Brutes 4,579; Wolf Riders 2,271; Rocket Carts 2,140 (1.9
  per cart); Bomb Chuckers 1,459 (0.8 per Chucker, but their bombs kill 172
  own units against 199 enemies); Orc Warbosses 367 kills and 2,412 WAAAGH!s
  inspiring 11,984 units. The Scrap Buggy is never trained (only treasure
  Buggies appear; 1,017 kills), exactly like the Human Knight, which the
  Normal AI never trains either: a policy trait, not a Goblin problem.
- **The Bomb Chucker is the weakest unit** and the only one that was useless
  before this bead (never trained). With the bias it is trained and kills,
  but its friendly bombs (watch item T6w) make it a net-neutral unit in AI
  hands. **Watch item** with a proposal in section 8.

Other watch items:

- **Map size:** Goblins win 60.7% against Humans and 54.5% against Undead on
  14 × 14 but 53.0% and 44.9% on 11 × 11 (Warrens and the horde scale with
  room to expand). The aggregate is inside the band; a 20 × 20 check is
  outside this bead's matrix.
- **Seat order against Undead:** `GU` 52.8% and `UG` 46.6% (the Undead
  mixed matrix shows the same first-mover effect for Undead, `UH` 62.2%
  against `HU` 57.1%).
- **Four-seat friendly fire** 37.7% (60 games; not a target).

## 8. Proposals needing root approval

None of these is applied; each is outside section 14.1 or is a mechanic.

1. **Bomb Chucker friendly fire (T6w, 46.4%).** Either make the bomb's
   splash hostile-only like the Battleship and Lich (a mechanic change; the
   friendly-fire bomb is user decision U3, so this needs the user), or
   keep friendly fire and make the bomb splash a flat 1 damage to own and
   allied units. Without approval, the AI could also require a hostile kill
   for any bomb that splashes own units (an AI change inside this bead's
   remit, not yet measured).
2. **Plunder** (fixed at 1 Coin per kill): 2 Coins per kill would make it
   about 4% of income, or Plunder could pay the victim's training cost
   halved. Recommendation: leave it, since the win rates are now in the band
   and Plunder is flavour; revisit if human playtests find it pointless.
3. **Chains:** if the user wants chains to be a common sight in AI games,
   the AI would have to cluster exploding units deliberately, against
   section 10's spacing rule and the friendly-fire target. Recommendation:
   accept chains as a human-player tactic.
