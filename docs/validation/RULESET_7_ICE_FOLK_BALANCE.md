# Ruleset 7 Ice Folk: coarse balance report (Dry Land)

Bead `pulp_wars-7g3.7`, identity `pulp-wars-poc-7r27`. It measures the
[Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md) against the five other
factions with the Ice Folk Normal AI of `pulp_wars-7g3.4` on both sides, and
records the two numbers it changed in the overlay's
[tuning record](../product/RULESET_7_ICE_FOLK.md#165-tuning-record).

**Coarse by the user's decision (2026-10-02).** Balance is tested on Dry
Land only, with small samples (40 games per faction pairing, 20 per seat
order), and this pass only removes gross imbalances and blind spots: no
faction pairing more lopsided than about 70/30, no faction helpless against
a specific enemy tool, no unit dominant or dead, no ability unused or used
to absurd effect. Fine tuning (the usefulness thresholds and watch bands of
[section 16.4](../product/RULESET_7_ICE_FOLK.md#164-balance-acceptance)) is
deferred until the user asks for it; they are reported here, not chased.
**Water maps were not tested.** All results are Normal AI against Normal
AI: they measure the rules as the current policy plays them. The intervals
are wide (about ±15 points per opponent); read the numbers as coarse.

## 1. Summary

- **Before:** the Ice Folk won 69% of decided games (62-74% per opponent;
  Dinosaurs 74%, Humans 70%, Goblins 69%).
- **The cause is the early game, not the Ice Folk's signature tools.** The
  Ice Folk had more income at round 10 (5.7 against 4.9) and more cities at
  round 15 (2.9 against 2.2) in every pairing, and they won 65 of the 66
  games in which they were ahead in cities at round 15. Glide on home Snow gets their cheap Yetis
  out to the villages first: with Glide switched off (a diagnostic, not a
  proposal) the Ice Folk win 57% and the income gap disappears. Shatter,
  the Witch, the Sled, and Mountain-born screened as no cause
  ([section 4](#4-diagnosis)).
- **Two numbers changed** (inside the
  [bounds](../product/RULESET_7_ICE_FOLK.md#163-tuning-bounds)), one unit:
  the **Yeti has 9 HP and Defense 1.5** (was 10 and 2). The army that wins
  the village race now pays for it in the first fights. **After: 56%
  overall, 52-57% against every faction**, no seat order beyond 65/35.
- **No errors, stalls, or exceptions** in 340 + 340 matrix games and four
  four-seat smoke matches; two round caps before (1%), none after.
- **One blind spot remains, on the AI side: the Witch is almost never
  killed** (in 1-4 of 10-19 Witch seat-games per opponent; the criterion is
  half). She stands within two tiles of an enemy at the start of half of the
  enemy's turns, but the other factions' policy never moves to attack her
  ([section 5](#5-blind-spots)); a proposal is in
  [section 6](#6-proposals).

## 2. Reproduction

```bash
# before: 7r25 (Yeti 10 HP, Defense 2); after: this change (7r27)
npm run balance:ruleset7-undead -- --jobs 6 --maps dry-land --seeds 10 --pairings IH,HI,IU,UI,IG,GI,ID,DI,IM,MI,II,HU,UH,GD,DG,MH,HM --output RULESET_7_ICE_FOLK_BALANCE_AFTER.json --detail-output after-detail.json --markdown
```

| Parameter         | Value                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| 1v1 pairings      | `IH`, `HI`, `IU`, `UI`, `IG`, `GI`, `ID`, `DI`, `IM`, `MI`, `II`                                      |
| Reference         | `HU`, `UH`, `GD`, `DG`, `MH`, `HM` (cap-rate reference and parity)                                    |
| Map, sizes, seeds | `DRY_LAND`; 11 and 14; seeds 0-9 (340 games; 40 per Ice Folk faction pairing)                         |
| Four-seat smoke   | `ice,original,undead,goblin` and `dinosaur,martian,ice,original`, 16 x 16, seeds 0-1 (headless CLI)   |
| Caps              | 150 rounds (1v1), 120 (four-seat), 30,000 commands                                                    |
| Mode / difficulty | Rival, Normal                                                                                         |
| Screening         | the same seeds, the ten mixed Ice Folk pairings only (200 games each), one candidate number at a time |

Outputs: [before](RULESET_7_ICE_FOLK_BALANCE_BEFORE.json) and
[after](RULESET_7_ICE_FOLK_BALANCE_AFTER.json). The matrix script now has
the Ice Folk pairings and writes `MatrixEntry.iceFolk` (per Ice Folk seat:
units trained, kills and losses by role, the killer of every loss, Shatter
kills by attacker role and victim, Chill by source, Cold Snap casts, Bolas
throws, Sweep attacks with flank hits and kills, Rockfall shots and kills,
the Witch's training, deaths and killers, Sled deaths, cities lost, and the
Mountain share around the capital; plus the headless match totals for the
Shatter set-ups and Chill sources, Bolas followed by a Shatter, sluggish
turns, Snow cover and Blizzard savings, Glide, deep snow, and Mountain
crossings) and `summary.iceFolk` (win rates by opponent, seat order, and
size, cap rates, the aggregated telemetry, and the opposing faction's units,
kills, losses, and commands). The other summaries are unchanged: the
Dinosaur and Martian cap references leave the Ice Folk pairings out.

**Parity.** The Yeti belongs to the Ice Folk registry only. The 120
reference games without an Ice Folk seat, run with the new numbers at `7r25`,
end in the same state hash and round as the before run. The after numbers
were measured at `7r25` (screening) and repeated on the final tree (`7r27`,
on top of the `7r26` Pangea coast ring of `pulp_wars-9s0.2`, which leaves
Dry Land unchanged): all 340 games have the same winner and length, and
`summary.iceFolk` is identical; the 120 reference games also keep the
before run's winners and lengths.

## 3. Win rates (decided games, 95% Wilson intervals)

| Pairing (Ice Folk wins) | Before              | After               | Seat orders after | Rounds (mean, after) |
| ----------------------- | ------------------- | ------------------- | ----------------- | -------------------: |
| Ice Folk over Human     | 70% [55-82] 28/40   | 55% [40-69] 22/40   | `IH` 55, `HI` 55  |                   23 |
| Ice Folk over Undead    | 63% [47-76] 25/40   | 57% [42-72] 23/40   | `IU` 65, `UI` 50  |                   21 |
| Ice Folk over Goblin    | 69% [54-81] 27/39   | 57% [42-72] 23/40   | `IG` 55, `GI` 60  |                   20 |
| Ice Folk over Dinosaur  | 74% [59-85] 29/39   | 57% [42-72] 23/40   | `ID` 55, `DI` 60  |                   23 |
| Ice Folk over Martian   | 68% [52-80] 27/40   | 53% [38-67] 21/40   | `IM` 60, `MI` 45  |                   22 |
| All mixed               | 69% [62-75] 136/198 | 56% [49-63] 112/200 |                   |                      |

Ice Folk mirror, seat 0 wins: 11 of 20 before, 12 of 20 after. Round caps:
`GI` and `DI` one each before (5%), none after; the reference pairings none.

Screening (the same 200 mixed games, one change each):

| Candidate                              | Human | Undead | Goblin | Dinosaur | Martian | All mixed |
| -------------------------------------- | ----: | -----: | -----: | -------: | ------: | --------: |
| none (before)                          |   70% |    63% |    69% |      74% |     68% |       69% |
| Sled cost 4                            |   70% |    70% |    72% |      80% |     68% |       72% |
| Shatter threshold 2 (Brittle 3)        |   72% |    68% |    69% |      75% |     70% |       71% |
| Yeti Defense 1.5                       |   60% |    60% |    68% |      68% |     49% |       61% |
| **Yeti 9 HP and Defense 1.5 (chosen)** |   55% |    57% |    57% |      57% |     52% |       56% |
| diagnostic only: no Glide for any unit |   65% |    50% |    56% |      57% |     55% |       57% |
| diagnostic only: no Mountain-born      |   68% |    62% |    68% |      75% |     65% |       68% |

## 4. Diagnosis

**What carried the wins: the village race.** Averaged over the five
pairings, before the change:

| Measure (Ice Folk / opponent)                   | Before      | After       |
| ----------------------------------------------- | ----------- | ----------- |
| Income at round 10                              | 5.66 / 4.85 | 5.27 / 5.16 |
| Cities at round 15                              | 2.87 / 2.24 | 2.67 / 2.47 |
| Ice Folk wins when ahead in cities at round 15  | 65 of 66    | 52 of 56    |
| Ice Folk wins when behind in cities at round 15 | 3 of 40     | 3 of 47     |

The other factions' seats in the reference pairings take 2.4-2.7 cities by
round 15 and 4.6-5.3 Coins at round 10: the Ice Folk were ahead and the
opponent was held below its normal pace. On 11 x 11 (20 games each) the Ice
Folk took 28 villages in rounds 1-8 against 18 for Humans and 14 for
Dinosaurs, with 68-72 Yetis trained in those rounds against 46-47 Fighters
and Cavemen. Glide is the engine of it: every Ice Folk land unit leaves its
own territory at half cost, so a Move-1 Yeti covers two tiles at home, and
switching Glide off removes the income gap (5.1 against 5.1) and most of
the win rate. Glide and the Move values are fixed by the bounds, so the
number that pays for the race is the body that runs it: the Yeti, at
Fighter stats and Fighter cost, with 50-60% of the Ice Folk's kills.

**What did not carry the wins.**

- **Shatter** made 21-35% of the Ice Folk kills against the non-Goblin
  factions (449 in 200 seat-games, mostly a Bolas on an already wounded
  unit: "earlier damage" 46-72% of the set-ups), but lowering the
  threshold to 2 changed nothing (71%). It finishes fights the Ice Folk are
  already winning. Against Goblins it is rare (28; a Goblin dies to any hit),
  and the Ice Folk still won 69% there.
- **The Witch** comes late (first one at round 17-18 median, in 51% of
  seat-games; the games last 20-28 rounds), and the Ice Folk win at a
  similar rate with and without her against Undead and Dinosaurs. Cold Snap
  chills 1-2 targets per cast.
- **The Sled's Bolas:** a Sled at cost 4 did not lower the win rate (72%).
- **Mountain-born and Rockfall:** without Mountain-born the rate is 68%;
  Rockfall made 8-21 kills per 40 games.
- **Snow cover, the Blizzard, deep snow, Sweep:** 52-152 damage prevented
  by Snow cover and 0-119 by the Blizzard per 40 games, 0-31 enemy Moves
  stopped by deep snow, 0-6 Sweep flank kills: small.

**Why Goblins and Dinosaurs lost hardest.** Not by Cold Snap and Shatter in
bulk: against Goblins Shatter barely fires. Goblins lose the early fights
(their Goblins trade 0.26 kills per loss against the Ice Folk) while the
Ice Folk out-expand them; Dinosaurs lay Eggs and grow slowly, and fell
furthest behind in cities by round 15 (1.97 against 2.88).

**After the change** the Yeti trades 0.70-1.02 kills per loss (0.99-1.37
before) and still makes 47-60% of the Ice Folk kills: it is the cheap body
of the faction, not a dead unit.

## 5. Blind spots

After tuning, Dry Land, 200 Ice Folk seat-games against the five factions
(40 per faction). K/L is kills per loss of the role (kills include
retaliation and splash; roles: `FIGHTER` Yeti, `RAIDER` Sled, `MARKSMAN`
Snow Hunter, `GUARD` Mammoth, `CAPTAIN` Witch, `CATAPULT` Boulder Yeti,
`KNIGHT` Sabretooth, `JUGGERNAUT` Frost Giant).

| Pairing  | Ice Folk units (K/L)                                                                         | Opponent units against the Ice Folk (K/L)                                                           | What kills Ice Folk units     | Dead or unused                                                |
| -------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| Human    | Yeti 0.79, Sled 0.40, Hunter 0.88, Mammoth 1.26, Boulder 2.83, Giant 22; Witch no kills      | Fighter 0.99, Guard 0.94, Raider 0.85, Marksman 1.25, Catapult 7.0, Knight 2.1, Juggernaut 23       | Fighter, Guard, Juggernaut    | Sabretooth 4 trained; **Witch killed in 4 of 19**             |
| Undead   | Yeti 0.79, Sled 0.56, Hunter 2.06, Mammoth 2.40, Boulder 3.4, Giant 3.7                      | Skeleton 1.01, Zombie 0.66, Ghoul 0.93, Banshee 3.0, Lich 8.0, Vampire 3.7, Abomination 11.7        | Skeleton, Zombie, Abomination | Sabretooth 3 trained; **Witch killed in 4 of 17**             |
| Goblin   | Yeti 1.02, Sled 0.83, Hunter 2.13, Mammoth 1.85, Boulder 3.25, Giant 2.3; Sabretooth 0 kills | Goblin 0.36, Wolf Rider 0.95, Orc Brute 1.71, Bomb Chucker 4.0, Scrap Buggy 2.9, Troll 4.7          | Goblin, Wolf Rider, Orc Brute | **Witch killed in 3 of 15**                                   |
| Dinosaur | Yeti 0.83, Sled 0.49, Hunter 0.91, Mammoth 1.36, Boulder 1.64, Sabretooth 0.90, Giant 5.5    | Caveman 0.69, Ankylosaurus 1.98, Raptor 1.23, Spitter 1.0, Triceratops 1.88, Brontosaurus 8.4       | Caveman, Ankylosaurus, Raptor | T-Rex never laid (AI, as before); **Witch killed in 3 of 18** |
| Martian  | Yeti 0.70, Sled 0.56, Hunter 0.60, Mammoth 1.05, Boulder 0.54, Sabretooth 0.94, Giant 1.4    | Grunt 1.05, Projector 0.86, Saucer 0.64, Ray Gunner 2.14, Tripod 2.1, Mothership 2.0, Colossus 11.5 | Grunt, Colossus               | **Witch killed in 1 of 10**                                   |

The section 16.4 questions:

- **Does every opposing faction kill Witches (in at least half of the
  Witch seat-games)?** **No** (before 9-39%, after 10-24%). See below.
- **Does every opposing faction take an Ice Folk city in some games?** Yes:
  in 20-24 of 40 seat-games against each faction (17-19 before).
- **Goblin packs, Cavemen, the T-Rex, Shields, ranged armies:** each wins
  some fights and loses some. Goblins trade 0.36 (their Orc Brutes 1.71,
  Wolf Riders 0.95); Cavemen 0.69; Grunts with Shields 1.05; Human
  Marksmen 1.25, Ray Gunners 2.14. The T-Rex is never laid by the Normal AI
  (every faction; not an Ice Folk fact). Walls were not measured separately.
- **Is there a pairing in which Shatter never fires other than against
  Goblins?** No: at least one Shatter in 28 of 40 seat-games against Humans,
  25 against Undead, 21 against Dinosaurs, 23 against Martians (and 19
  against Goblins).

**The Witch blind spot.** A scratch replay of the before run (11 x 11,
seeds 0-9, both seat orders) measured, at the start of every opposing turn,
the distance from each living Witch to the nearest hostile land unit:

| Opponent | Witch-turns | Hostile within 2 | Two or more hostiles within 3 | Attacks on a Witch | Witches killed by an attack |
| -------- | ----------: | ---------------: | ----------------------------: | -----------------: | --------------------------: |
| Human    |          88 |         45 (51%) |                      53 (60%) |                  7 |                           0 |
| Dinosaur |         161 |         93 (58%) |                     105 (65%) |                  9 |                           4 |

She is in reach most turns, escorted by 2.4-2.9 own units, and an attack
on her kills her about half the time when it comes; but the other
factions' policy never moves to attack her. Its Witch rules (kill at 1182,
focus at 1178-1179) only rank attacks that are already offered from where
the units stand, and two of its counter-rules keep units away: no routine
Move without route progress into four tiles of a visible Witch (Cold Snap
reach), and a sluggish unit leaving her two tiles. This is an AI gap, not a
number ([section 6](#6-proposals), proposal 1).

Section 16.4 usefulness thresholds, after tuning (mixed 1v1):

| Unit or ability             | Measured                                                                   | Threshold | Met       |
| --------------------------- | -------------------------------------------------------------------------- | --------- | --------- |
| Sled                        | trained in 161 of 200 seat-games (81%); a Bolas in 155 of those (96%)      | 50% / 50% | yes       |
| Mammoth                     | trained in 152 of 200 (76%); a flank hit in 70 of those (46%)              | 50% / 50% | near miss |
| Snow Hunter                 | 66 of 86 seat-games with Marksmanship (77%)                                | 50%       | yes       |
| Ice Witch                   | 79 of 138 with Administration (57%); Cold Snap in 59 of those (75%)        | 50% / 50% | yes       |
| Shatter                     | in 53-70% of the seat-games against Humans, Undead, Dinosaurs, Martians    | 50%       | yes       |
| Glide, deep snow            | Glide in 200 of 200; deep snow in 51 of 200 (26%)                          | 50%       | no (snow) |
| Mountain crossing, Rockfall | high-Mountain seat-games (above 30%): crossing 42 of 45, Rockfall 27 of 45 | 50%       | yes       |
| Boulder Yeti, Sabretooth    | 26 of 33 with Sawmilling (79%); 11 of 14 with Chivalry                     | 50%       | yes       |
| Frost Giant                 | 69 granted                                                                 | reported  | —         |

Watch bands: no role other than the Yeti above 40% of the kills (the
Mammoth at most 27%: met); Shatters by a charging Sled at full HP 2 of 401
(met); sluggish turns 1,156, of which 508 cost the unit its action (the
share of all enemy unit-turns was not measured); the decided win rate with
and without a Witch differs by 13-17 points against Undead and Dinosaurs
and by 36-37 points against Humans, Goblins, and Martians (band 25: see
below). Rockfall by the biome split: Ice Folk seats with more than 30%
Mountains around the capital won 6-7 of 9 decided games against each
faction, those below 15% 9-12 of 20.

**The Witch watch band is confounded.** The policy buys her only at war,
with three front units, and never in a threatened city, so she appears in
games the Ice Folk are already not losing (first one at round 15-20, games
of 20-23 rounds on average); against Undead and Dinosaurs, where she meets
the most fights, the gap is within the band.

## 6. Proposals

None was applied: each needs an AI change or root approval.

1. **Witch hunt (AI, the blind spot).** A rule for every seat against the
   Ice Folk: when the own units that can reach a tile from which they can
   attack a visible hostile Witch this turn have projected damage (Snow
   cover included) at least her HP, move them in and attack, above routine
   Moves and just below the existing Witch kill; those Moves are exempt from
   the Cold Snap reach rule. Measured head to head (same seeds, mirrored
   seats, a few dozen decided games) per the user's AI rule. If the root
   prefers a number instead, the Witch's HP 10 (inside the bounds) makes the
   existing two-attacker focus fire more often; it was not screened, because
   the Witch is not what carried the win rate.
2. **Glide (rule; the cause of the imbalance).** Glide is fixed by the
   bounds and was not touched; the Yeti numbers pay for it. If the root
   would rather keep the Yeti at Fighter stats, the alternative is a Glide
   change (for example, no half cost on the step that leaves Snow for a
   tile that is not Snow, so that Glide speeds Ice Folk units around at
   home but not out to the villages). Without any Glide the Ice Folk win 57%
   with the decided Yeti ([section 3](#3-win-rates-decided-games-95-wilson-intervals)).
   Not screened in this pass.
3. **Mammoth flank hits** in 46% of the Mammoth seat-games (threshold 50%):
   the policy's Sweep bonus is small; an AI pass on Mammoth positioning,
   measured head to head, before any number.
4. **Deep snow** stops an enemy Move in 26% of the seat-games: most enemy
   units have Move 1 and are not affected, by the rule's design. Reported,
   not a defect.
5. **Watch in the fine-tuning pass:** the Witch's with/without gap once she
   is killed normally (proposal 1), the Sled's 0.40-0.83 kills per loss
   (it is a Chill source, not a fighter), and the Frost Giant against Humans
   (22 kills per loss, a small sample).

## 7. Parity and pins

The Yeti belongs to the Ice Folk registry only, so no match without an Ice
Folk seat changes (the parity check of section 2). The identity moves to
`pulp-wars-poc-7r27` (`7r26` appended to the prior identities, the autosave
key `pulpWars.save.v7r27.current`). Re-pinned with this cause: the identity
pins and prior-identity lists of the revision tests, the obsolete-key lists
and the browser save-key guard, the Ice Folk roster test (Yeti 9 HP,
`defense2` 3), the starting and Militia Yeti's HP, the land-role HP table of
the revision-23 sturdiness test, and four combat examples whose Yeti
retaliation or full HP changed (Snow cover, retaliation never shatters, the
Walled-center Guard, the Bomb Chucker and Rocket Cart, the Sweep's own
Yeti). No decision or match hash pin changed.
