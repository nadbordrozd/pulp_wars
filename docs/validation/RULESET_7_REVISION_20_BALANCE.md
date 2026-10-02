# Ruleset 7 revision 20: coarse balance report (Dry Land)

Bead `pulp_wars-0hi.3`, identity `pulp-wars-poc-7r23`. It chooses the
sturdiness numbers of
[revision 20 section 6](../product/RULESET_7_REVISION_20.md#6-human-sturdiness)
on the Normal AI with the campaign plan of `pulp_wars-9s0.1`, and records
them in the contract's
[tuning record](../product/RULESET_7_REVISION_20.md#63-tuning-record).

**Coarse by the user's decision (2026-10-02).** Balance is tested on Dry
Land only, with small samples (about 60 games per faction pairing), and this
pass only removes gross imbalances and blind spots: no faction pairing more
lopsided than about 70/30, no faction helpless against a specific enemy
tool, no unit dominant or dead. Fine tuning (the 50-58% and 45-55% bands of
section 6.2) is deferred until the user asks for it. **Water maps
(Pangea, Continents, Archipelago, Lakes) were not tested.** All results are
Normal AI against Normal AI: they measure the rules as the current policy
plays them, not as a skilled human would. The intervals are wide (about ±12
points); read the numbers as coarse.

## 1. Summary

- **Before** (7r21, the tree after `pulp_wars-9s0.1`): Dinosaurs won
  **79.7%** of decided Dry Land games against Humans (89.7% when they moved
  first), the only pairing beyond 70/30. Humans won 45% against Undead and
  against Goblins; Dinosaurs 60% against Undead and against Goblins.
- **Numbers changed** (all inside the bounds): Human Fighter, Raider, and
  Marksman maximum HP 12 (were 10), Guard 17 (was 15); Caveman 10 (was 12,
  the `pulp_wars-c87.8` interim value; its contract value was 10).
- **After:** every faction pairing is inside 40-60%: Dinosaurs 44% against
  Humans, 47% against Undead, 51% against Goblins; Humans 47% against
  Undead and against Goblins; Undead 60% against Goblins (unchanged).
- **No errors, stalls, or exceptions** in 496 + 496 games. Round caps 5
  before and 4 after (worst pairing 6.7% before, 3.3% after).
- **Dead units (AI, not rules):** no Normal AI seat of any faction trains or
  lays its Chivalry unit (Knight, Scrap Buggy, T-Rex; 8 Vampires in 180
  Undead seat-games), and the Spitter is almost never laid. Proposals in
  [section 6](#6-proposals).

## 2. Reproduction

```bash
# before: the tree at 6929623 (7r21); after: this change (7r23, on the Martian revision d88503c)
npm run balance:ruleset7-undead -- --jobs 6 --maps dry-land --seeds 15 --pairings HU,UH,UU,HH,GH,HG,GU,UG,GG,DH,HD,DU,UD,DG,GD,DD,HUGD,DHUG,GDHU,UGDH --output RULESET_7_REVISION_20_BALANCE_AFTER.json --detail-output after-detail.json
```

| Parameter         | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| 1v1 pairings      | all sixteen ordered pairings of `H`, `U`, `G`, `D`                            |
| Map, sizes, seeds | `DRY_LAND`; 11 and 14; seeds 0-14 (480 games; 60 per faction pairing)         |
| Four-seat mixes   | `HUGD`, `DHUG`, `GDHU`, `UGDH`, 16 x 16, seeds 0-3 (16 games, a sanity check) |
| Caps              | 150 rounds (1v1), 120 (four-seat), 30,000 commands                            |
| Mode / difficulty | Rival, Normal                                                                 |

Outputs: [before](RULESET_7_REVISION_20_BALANCE_BEFORE.json) and
[after](RULESET_7_REVISION_20_BALANCE_AFTER.json), in the format of the
[Dinosaur report](RULESET_7_DINOSAUR_BALANCE.md). The matrix script now
also writes, in its detail entries only, Promotions with the damage their
full heal removed, losses by role, and commands by kind for every faction,
and growth heals, T-Rex attacks, and Rampage chains for Dinosaur seats. The
4,800-game all-map baseline was stopped by the scope change before it
finished and is not used.

A four-seat match of the harness ends when seat 0 is eliminated, so the
mixes show no faction win rate; all 32 ended that way, without errors.

## 3. Win rates (decided games, 95% Wilson intervals)

| Pairing (first named wins) | Before            | After         | Seat orders after |
| -------------------------- | ----------------- | ------------- | ----------------- |
| Human over Undead          | 45.0% [33-58]     | 46.7% [35-59] | `HU` 43, `UH` 50  |
| Human over Goblin          | 45.0% [33-58]     | 46.7% [35-59] | `HG` 47, `GH` 47  |
| Dinosaur over Human        | **79.7%** [68-88] | 44.1% [32-57] | `DH` 47, `HD` 41  |
| Dinosaur over Undead       | 59.6% [47-71]     | 46.7% [35-59] | `DU` 50, `UD` 43  |
| Dinosaur over Goblin       | 60.0% [47-71]     | 50.8% [38-63] | `DG` 55, `GD` 47  |
| Undead over Goblin         | 60.0% [47-71]     | 60.0% [47-71] | `UG` 67, `GU` 53  |

| Faction, all mixed pairings | Before | After |
| --------------------------- | -----: | ----: |
| Human                       |  36.9% | 49.7% |
| Undead                      |  52.0% | 55.6% |
| Goblin                      |  45.0% | 47.5% |
| Dinosaur                    |  66.5% | 47.2% |

Mirrors, seat 0 wins after: `HH` 69%, `UU` 43%, `GG` 60%, `DD` 55%.
Matches last 21-31 rounds on average in every pairing, before and after.

Screening (same seeds; one round):

| Candidate                         | H over U | H over G | D over H | D over U | D over G |
| --------------------------------- | -------: | -------: | -------: | -------: | -------: |
| none (before)                     |      45% |      45% |      80% |      60% |      60% |
| Human +2 on the four core roles   |        — |        — |      62% |        — |        — |
| Human +2, Caveman 10 (**chosen**) |      47% |      47% |      44% |      47% |      51% |
| Human +3, Caveman 10              |      55% |      57% |      38% |        — |        — |

Human +2 alone left Dinosaurs at 62% against Humans (78.6% when moving
first). Human +3 overshoots against Dinosaurs. The chosen set is the
smallest readable change that removes the imbalance.

## 4. Diagnosis

**Why Dinosaurs jumped to 66% under the aggressive AI.** Not the T-Rex or
Charge!: no seat laid a T-Rex Egg in 180 Dinosaur seat-games, and the
Triceratops made 6% of Dinosaur kills. The Dinosaurs won early, with the
horde: 74% of their decided games of 20 rounds or fewer, 50% of those of 46
or more. Before tuning the Caveman (12 HP for 2 Coins) made 39% of their
kills and traded 0.92 kills per loss, against 0.63 for the Human Fighter,
0.65 for the Skeleton, and 0.37 for the Goblin; the Ankylosaurus (28%,
1.48) and the Raptor (19%, 1.50) carried the rest. An aggressive AI turns
these trades into a race that the sturdier, more numerous army wins:
Dinosaur seats produce 21 units per game against 14-15 for Humans and
Undead (laying needs no empty city center). Full-heal growth restored 18 HP
per Dinosaur seat-game; it helps, but it is not what wins.

**Why Humans fell to 36%.** Humans have no trick, so the constant pressure
of the campaign plan becomes a sequence of even trades, which Humans lost
on HP: the Fighter traded 0.63 and the Guard 0.77. Field Defense does not
change that: Humans built 1 per game, and only 4-10% of all attacks in any
pairing hit a fortified unit. After tuning the Human Fighter trades 0.88,
the Guard 0.99, and the Caveman 0.66.

## 5. Blind spots, after tuning (Dry Land, 180 seat-games per faction)

Kills and losses are units killed by and lost from the role; K/L is their
ratio. "Dead" means the Normal AI never or almost never produces the unit.

| Faction  | Beats / is beaten by (after)                        | Units that carry it                                                                | Dead or weak units                                                                                                   | Dominant units                                                                |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Human    | even with everyone (44-56%)                         | Fighter 41% of kills (K/L 0.88), Guard 28% (0.99)                                  | **Knight never trained**; Captain 28 trained (Rally 0.8 per game); Raider and Marksman in a third to a half of games | Catapult K/L 7.6 (99 trained in 37 games)                                     |
| Undead   | beats Goblins 60%, even with Humans and Dinosaurs   | Skeleton 33% (0.67), Zombie 33% (0.70)                                             | Vampire 8 trained; Banshee K/L 0.50 but Wails 1.7 per game; Ghoul 0.59                                               | Lich 4.9                                                                      |
| Goblin   | loses to Undead 40%, even with Humans and Dinosaurs | Goblin 34% (0.36, 12 trained per game, the horde by design), Wolf Rider 20% (0.93) | **Scrap Buggy never trained**                                                                                        | Rocket Cart 7.3, Bomb Chucker 2.0                                             |
| Dinosaur | even with everyone (44-56%)                         | Caveman 34% (0.66), Ankylosaurus 31% (2.05), Raptor 22% (1.23)                     | **T-Rex never laid**; **Spitter** 18 Eggs in 180 seat-games                                                          | Ankylosaurus 2.05 (2.40 against Undead, 40% of those kills): watch, not gross |

- **Charge! and fortification.** The Triceratops is laid in 53 of the 71
  seat-games that research Sawmilling (75%) and charges with a run-up in 40
  of the 53 with a hatched one (75%): the usefulness targets of section 8.2
  are met. 198 Charges: 132 kills, 36 pushes (6 off a city center), 30
  blocked, 18 Field Defense destroyed, 34 fortified targets; 30 Triceratops
  lost within a round of charging; K/L 2.67, 6% of Dinosaur kills. Humans
  are not helpless against it (it makes 7% of the Dinosaur kills against
  them).
- **Nobody fails to break fortifications.** In every pairing 4-13% of the
  attacks hit a fortified unit, and 31-58% of those kill it.
- **The T-Rex** is not plowing through anything: it never appears (Chivalry
  is researched in 50 of 180 seat-games, no Egg follows). Its watch metrics
  (kill share, win-rate gap with and without one, deaths, Rampage chains)
  have no data. Cost 14 and hatch 4 price it out for the AI, but so does
  every Chivalry unit: the Knight costs 9 and is not trained either.
- **Nesting and Wallbreaker** are researched in 36% and 16% of Dinosaur
  seat-games (watch thresholds 25% and 10%: met); 39 attacks ignored City
  Walls through Wallbreaker.
- **Full-heal Promotion** is small: 0.5-0.8 Promotions per seat-game for
  Humans, Undead, and Goblins, removing 2-3 HP of damage each game. Match
  lengths did not move (mean 21-31 rounds per pairing before and after).
- **Juggernaut-role units** (level-5 rewards only) trade 5-8 kills per loss
  for every faction; they are rare and earned.

## 6. Proposals

None was applied: each needs an AI change or root approval.

1. **Chivalry units and the T-Rex are dead for the Normal AI** (Knight,
   Scrap Buggy, T-Rex never; Vampire 8 in 180 seat-games). The policy buys
   the best unit that fits as soon as a slot frees and never saves Coins for
   an expensive one; its production value (HP minus twice the cost, before
   the one-time bonus for a missing role) rates a T-Rex at 0 and a Knight at
   -8, and the bank stays near zero. A T-Rex cost inside the bounds (12) would
   not change this. Proposal for the AI's second pass: a savings plan for
   the seat's Chivalry unit once it is researched. The T-Rex watch can only
   be read after that.
2. **The Spitter is not laid** (18 Eggs in 180 seat-games), as before
   revision 20: at 10 HP for 4 Coins it has the lowest production value of
   the roster. Proposal: a production bias in the AI, as the Bomb Chucker
   got; a stat change (HP 12 or cost 3, inside the revision-19 bounds) is
   the alternative and was not screened here.
3. **Watch the Ankylosaurus** in the five-faction pass: the best trading
   unit of the game (2.05 kills per loss; 1,238 laid).
4. **Dinosaur production volume**: Dinosaur seats field about a third more
   units than Humans or Undead because laying an Egg needs no empty center.
   The win rates are even now, but the faction does not play as "few, big".
5. **Undead over Goblins 60%** (67% when Undead move first) is the most
   lopsided pairing left; inside the coarse goal.

## 7. Parity and pins

Every match with a Human or a Dinosaur seat changes: the starting Human
Fighter already has 12 HP, every exchange with a Human unit or a Caveman
resolves on different HP ratios, and the policy values roles by their HP.
Of the 480 1v1 games, all 120 games of `UU`, `GG`, `UG`, and `GU` are
identical in commands, rounds, and winner; 323 of the 360 others differ.
Instead of parity, the after run shows 496 games with no error, stall, or
exception. The pinned decisions and matches that changed are re-pinned with
these causes in their tests.
