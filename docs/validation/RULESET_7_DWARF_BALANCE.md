# Ruleset 7 Steampunk Dwarves: coarse balance report (Dry Land)

Bead `pulp_wars-78i.7`, identity `pulp-wars-poc-7r31`. It measures the
[Dwarf overlay](../product/RULESET_7_DWARVES.md) against the six other
factions with the Dwarf Normal AI of `pulp_wars-78i.4` on both sides, and
records the one number it changed (with the Dive bomb that follows it) in
the overlay's [tuning record](../product/RULESET_7_DWARVES.md#195-tuning-record).

**Coarse by the user's decision (2026-10-02).** Balance is tested on Dry
Land only, with small samples (40 games per faction pairing, 20 per seat
order), and this pass only removes gross imbalances and blind spots: no
faction pairing more lopsided than about 70/30, no faction helpless against
a specific enemy tool, no unit dominant or dead, no ability unused or used
to absurd effect. Fine tuning (the thresholds and watch bands of
[section 19.4](../product/RULESET_7_DWARVES.md#194-balance-acceptance)) is
deferred until the user asks for it; they are reported here, not chased.
**Water maps were not tested.** All results are Normal AI against Normal
AI: they measure the rules as the current policy plays them. The intervals
are wide (about ±15 points per opponent); read the numbers as coarse.

## 1. Summary

- **No gross imbalance, before or after.** The Dwarves won 52% of decided
  games before (45-57% per opponent) and 52% after (45-60%); every seat
  order is inside 35-65%. No game reached the round cap, and no error, stall, or
  exception occurred in 408 + 408 matrix games (240 Dwarf duels, 160
  reference duels, 8 four-seat mixes each run).
- **One number changed** (inside the
  [bounds](../product/RULESET_7_DWARVES.md#193-tuning-bounds)): **the bomb
  deals 5, and 6 with Dive** (was 4 and 5; the Dive bomb is the bomb plus 1
  by the bounds' own constraint). The Gyrocopter was below the "dead" watch
  band (0.24 kills per loss, band 0.3; 1% of the Dwarf kills). At 5 it
  scores 0.32 and bomb kills rise from 23 to 31; win rates do not move.
- **The faction's identity is in play.** Tunnels in half of the seat-games
  (85% of them erupt on somebody), 154 bombing runs, 441 Assembles (76% of
  the Gunners), 1,168 dug-in unit-turns; the Hammerer makes 55% of the
  kills (the cheap body, as every faction's Fighter role) and the Mole 19%.
- **Blind spots that remain are not numbers** (section 6): the eruption
  almost never kills (4 kills in 466 eruptions) and is at its upper bound;
  opponents kill a fielded Engineer in 36% of the seat-games (criterion:
  half); bombs and eruptions each killed one Dinosaur unit in 40 games.
- **The rider village race is no threat.** A scripted human-style probe
  (section 5) took 5 villages with riders in rounds 1 to 15 in 40 games, the
  first in round 11-12, and **lost** 0.2 cities at round 15 against the
  plain policy.
- **A defect found on the way (not fixed, an engine change):** the public
  query offers `MIND_CONTROL` on a Clockwork Gunner, which the reducer
  rejects as `TARGET_IMMUNE` (section 7, proposal 4).

## 2. Reproduction

```bash
# before: 7r30 (bomb 4, Dive 5); after: this change (7r31)
npm run balance:ruleset7-undead -- --jobs 6 --maps dry-land --seeds 10 --pairings WH,HW,WU,UW,WG,GW,WD,DW,WM,MW,WI,IW,HU,UH,GD,DG,MH,HM,IU,UI,WHUG,DMIW --output RULESET_7_DWARF_BALANCE_AFTER.json --detail-output after-detail.json --markdown
npx tsx scripts/ruleset7-dwarf-rider-probe.ts --seeds 10 --sizes 11
npx tsx scripts/ruleset7-dwarf-rider-probe.ts --seeds 10 --sizes 14
```

| Parameter         | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| 1v1 pairings      | `WH`, `HW`, `WU`, `UW`, `WG`, `GW`, `WD`, `DW`, `WM`, `MW`, `WI`, `IW` (no `WW`)              |
| Reference         | `HU`, `UH`, `GD`, `DG`, `MH`, `HM`, `IU`, `UI` (cap-rate reference and parity)                |
| Four-seat smoke   | `WHUG`, `DMIW`, 16 x 16, seeds 0-3 (an error and stall check, not a measurement)              |
| Map, sizes, seeds | `DRY_LAND`; 11 and 14; seeds 0-9 (240 Dwarf games; 40 per faction pairing, 20 per seat order) |
| Caps              | 150 rounds (1v1), 120 (four-seat), 30,000 commands                                            |
| Mode / difficulty | Rival, Normal                                                                                 |
| Screening         | the same 240 Dwarf games, one candidate at a time                                             |

Outputs: [before](RULESET_7_DWARF_BALANCE_BEFORE.json) and
[after](RULESET_7_DWARF_BALANCE_AFTER.json). The matrix script now runs the
Dwarf pairings and the two mixes and writes `MatrixEntry.dwarf` (per Dwarf
seat: units trained and assembled with the round of each role's first unit,
research rounds, kills by role and by cause, losses by role with the killer
of every loss, tunnels with and without a rider and those ending within 2
of an own center, eruptions and bombs with their hits, damage, kills,
victims, and "assists" (a hit unit killed later in the same Dwarf turn),
Assembles, Repairs, dug-in unit-turns at the seat's End Turns, the
Engineers' deaths and killers and those lost within two rounds of their
Assemble, the Gyrocopters' killers, cities lost; plus the headless match
totals for Shield absorption, Eggs, undermining, Gunner shots, Repair
targets, Dig In, Knockback, and Plated) and `summary.dwarf` (win rates by
opponent, seat order, and size, cap rates against a reference without a
Dwarf seat, the aggregated telemetry, and the opposing faction's units,
kills, losses, and commands). The other summaries are unchanged except that
their references now leave the Dwarf pairings out. The before output was
written before the Engineer-after-Assemble and Gyrocopter-killer fields
existed.

**Parity.** The bomb belongs to the Dwarf registry only. The 160 reference
games, run with the new bomb at `7r30`, end in the same state hash as the
before run (160 of 160). At `7r31` all 160 keep their winner and length,
and the 240 Dwarf games have the same winner and length as the screening
run at `7r30` (240 of 240).

## 3. Win rates (decided games, 95% Wilson intervals)

| Pairing (Dwarf wins) | Before            | After             | Seat orders after (Dwarf first, second) |
| -------------------- | ----------------- | ----------------- | --------------------------------------- |
| Dwarf over Human     | 57% [42-72] 23/40 | 60% [45-74] 24/40 | `WH` 60, `HW` 60                        |
| Dwarf over Undead    | 57% [42-72] 23/40 | 53% [38-67] 21/40 | `WU` 45, `UW` 60                        |
| Dwarf over Goblin    | 48% [33-63] 19/40 | 48% [33-63] 19/40 | `WG` 40, `GW` 55                        |
| Dwarf over Dinosaur  | 53% [38-67] 21/40 | 53% [38-67] 21/40 | `WD` 45, `DW` 60                        |
| Dwarf over Martian   | 53% [38-67] 21/40 | 53% [38-67] 21/40 | `WM` 45, `MW` 60                        |
| Dwarf over Ice Folk  | 45% [31-60] 18/40 | 45% [31-60] 18/40 | `WI` 35, `IW` 55                        |
| All                  | 52% 125/240       | 52% 124/240       |                                         |

Five of the 240 Dwarf games changed winner: three to the Undead in `WU`,
two to the Dwarves (`WH`, `UW`). Round caps: none in
the Dwarf pairings and none in the reference (Dig In does not stall the
Normal AI). Mean length 22-27 rounds.

Screening (the same 240 Dwarf games, one change each; "K/L" is the
Gyrocopter's kills per loss):

| Candidate                                     | All | Human | Undead | Goblin | Dinosaur | Martian | Ice Folk | Gyrocopter K/L | Bomb kills | Eruption kills |
| --------------------------------------------- | --: | ----: | -----: | -----: | -------: | ------: | -------: | -------------: | ---------: | -------------: |
| none (before)                                 | 52% |   57% |    57% |    48% |      53% |     53% |      45% |           0.24 |         23 |              3 |
| **bomb 5, Dive 6 (chosen)**                   | 52% |   60% |    53% |    48% |      53% |     53% |      45% |           0.32 |         31 |              4 |
| Gyrocopter HP 10                              | 52% |   60% |    53% |    48% |      53% |     50% |      50% |           0.27 |         27 |              4 |
| diagnostic: eruption 1, 2 with Blasting       | 51% |   55% |    53% |    50% |      53% |     49% |      45% |           0.25 |         23 |              3 |
| diagnostic: eruption 3, 4 with Blasting (out) | 53% |   55% |    57% |    50% |      57% |     53% |      48% |           0.23 |         20 |              9 |

Gyrocopter HP 10 made the policy train 208 Gyrocopters instead of 129
(their value counts HP) without raising their kills per loss enough; the
bomb raises the kills directly. The eruption diagnostics are in section 4.
The eruption-1 run had one policy error (section 7, proposal 4); every other
run had none.

## 4. Diagnosis

**Nothing is gross.** Every pairing is inside 45-60% and every seat order
inside 35-65%, so no number was moved for the win rate.

**Is the eruption a threat?** As damage, barely. After the change: 466
eruptions, 312 of them hit someone (522 victims, 953 HP), 4 kills. The
victims are mostly Guard- and Fighter-role units of 12 to 18 HP (Human
Guards and Undead Zombies the most), which 2 or 3 kills only when they are
already badly hurt; Martian Shields absorbed
119 HP of the eruptions' 166 against Martians. Its value is the set-up:
**207 of the victims (40%) die later in the same Dwarf turn**, to the
surfaced Mole and rider and the wave behind them. Moving the eruption
does not move results: at 1 (Blasting 2) the Dwarves win 51%, at the
contract 2 (3) 52%, at 3 (4), outside the bounds, 53% with 9 kills instead
of 3. The eruption is already at its upper bound and its constraint (3 with
Blasting Charges at most); a "wow" eruption that kills needs a rule, not a
number (section 7, proposal 1).

**Does the faction play as Dwarves, or win on Hammerers?** Its pillars are
used and the wins follow them, although the seat-games are confounded (a
seat that survives longer researches and fields more):

| Pillar (after) | Use                                                                                                 | Decided win rate with / without |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| Tunnel         | 466 tunnels (229 with a rider) in 120 of 240 seat-games; 86 surfaced units lost the next enemy turn | 71% / 33%                       |
| Bomb           | 154 runs in 70 seat-games, 730 HP, 31 kills, 41 assists; 39 Gyrocopters lost after a bomb           | 70% / 44%                       |
| Assemble       | 441 Assembles in 84 Engineer seat-games; 76% of the Gunners are assembled                           | —                               |
| Dig In         | 1,168 dug-in unit-turns; 256 attacks on dug-in units, 110 HP prevented, 101 dug-in units killed     | —                               |
| Steam Tank     | 143 trained in 41 seat-games; Plated prevented 1,016 HP                                             | 78% / 46%                       |

Kill shares: Hammerer 55%, Mole 19%, Gunner 9%, Tank 5%, Titan 5%, Cannon
4%, Gyrocopter 1%, Engineer 1%. The Hammerer is the Fighter-role body every
faction leans on (the Ice Folk Yeti 47-60%); no other role is above 40%.

**Dead or dominant.**

- **The Gyrocopter was dead by the watch band:** 23 kills for 94 losses
  (0.24) before, 1% of the kills, 0.06 against Dinosaurs. Most losses are
  not after a bomb (42 of 94): it dies scouting and to melee units next to
  its landing. Bombing runs found a target in about half of the seat-games
  with a Gyrocopter. This is the change (section 3). After: 31 kills for 96
  losses (0.32). By the Dwarf AI bead's measure (bomb kills per Gyrocopter
  lost after a bomb) it was 0.55 before and is 0.79 after.
- **The Steam Tank's watch band** (win rate with and without differing by
  less than about 25 points) is exceeded: 78% against 46%. It is the
  Witch's confound of the Ice Folk report: the Tank comes with Chivalry
  (46 seat-games, mean round 27), so it appears only in long games a seat
  has not already lost. In games over 30 rounds the Dwarf seats with a Tank
  won 23 of 32 and those without 0 of 13; seats with Chivalry and no Tank
  won 1 of 5. Its kills per loss (1.46) and kill share (5%) are ordinary.
  Not changed; a watch item for fine tuning.
- **The Brass Titan** (reward only) trades 2.60, the Steam Cannon 6.06
  (Catapult-like), the Gunner 0.70, the Mole 1.34: none dead, none dominant.

**The opponents against the Dwarves** (kills per loss of their roles
against Dwarf units, after) are ordinary: Fighter roles 0.42-0.74, Guards
0.62-2.78, the Juggernaut-role rewards 3.8-16 (as against every faction).
One outlier: the Goblin Troll, 65 kills for 1 loss in 40 games (4.7 against
the Ice Folk); the Goblin pairing is still 48%. A watch item.

## 5. The rider village race (root decision 9)

`scripts/ruleset7-dwarf-rider-probe.ts` plays every Dwarf-against-Human seed
twice, Dry Land, 11 x 11 and 14 x 14, seeds 0-9, both seat orders (40 games
per run, 150 rounds): once with the plain Normal policy, once with the Dwarf
seat's policy plus the scripted human-style rule of
[section 19.2](../product/RULESET_7_DWARVES.md#192-measurement) for rounds 1
to 15 (Drill first, a Mole at the first chance, a rider tunnel towards a
neutral village 4 to 8 tiles from the Hammerer, then walk in and capture).

| Measure (rounds 1 to 15 unless stated)      | Plain policy | Scripted probe |
| ------------------------------------------- | -----------: | -------------: |
| First Mole (median round, 11 / 14)          |      11 / 12 |          5 / 5 |
| Rider tunnels by round 15                   |           12 |             44 |
| First rider tunnel (median round, 11 / 14)  |      12 / 14 |          8 / 9 |
| Villages captured by riders                 |            0 |    5 (5 games) |
| First rider capture (median round, 11 / 14) |            — |        12 / 11 |
| Villages captured by riders to round 20     |            0 |              6 |
| Dwarf village captures                      |           58 |             59 |
| First Dwarf village capture (median round)  |            6 |              6 |
| Dwarf cities at round 15 (mean, 11 / 14)    |  2.05 / 2.30 |    2.00 / 1.95 |
| Human cities at round 15 (mean, 11 / 14)    |  2.20 / 2.30 |    2.10 / 1.75 |
| Human Raider village captures               |            0 |              0 |
| Dwarf wins (decided)                        |        24/40 |          23/40 |

**No gain**: the scripted race takes a rider village in one game in eight,
in round 11-12, five rounds after both seats' first walking capture
(round 6), and leaves the Dwarves 0.2 cities behind the plain policy at
round 15 (the Mole's 5 Coins come out of the early economy). The rider
brake (no settlement center on the surfacing turn) adds two turns to every
rider capture. The Human policy never captures a village with a Raider in
rounds 1-15, so the Raider comparison is empty; the Dwarves' first capture
is at the Humans' pace. Below the spec's threshold (about one city at round
15, or a turn ahead of the Raider), so no lever is proposed. These are the
`7r31` runs; at `7r30` (bomb 4) every rounds 1-15 capture and city number
was the same.

## 6. Blind spots

After tuning, 240 Dwarf seat-games, 40 per faction.

| Opponent | Dwarf wins | Eruption kills | Bomb kills | Gyrocopter K/L | Engineer killed (seat-games) | Dwarf city lost | Cities at round 15 (Dwarf / opponent) |
| -------- | ---------: | -------------: | ---------: | -------------: | ---------------------------: | --------------: | ------------------------------------: |
| Human    |      24/40 |              1 |          5 |           0.28 |                         3/15 |           24/40 |                             2.5 / 2.5 |
| Undead   |      21/40 |              0 |          9 |           0.45 |                         7/13 |           24/40 |                             2.6 / 2.3 |
| Goblin   |      19/40 |              1 |          6 |           0.30 |                         7/12 |           23/40 |                             2.6 / 2.6 |
| Dinosaur |      21/40 |              1 |          1 |           0.07 |                         5/16 |           23/40 |                             2.7 / 2.3 |
| Martian  |      21/40 |              0 |          5 |           0.42 |                         4/15 |           23/40 |                             2.6 / 2.4 |
| Ice Folk |      18/40 |              1 |          5 |           0.45 |                         4/13 |           26/40 |                             2.6 / 2.6 |

Before tuning: eruption kills 0, 1, 1, 0, 0, 1; bomb kills 5, 6, 6, 1, 3,
2; Gyrocopter K/L 0.25, 0.40, 0.27, 0.06, 0.30, 0.18; Engineers killed in
5/15, 6/14, 7/12, 6/16, 4/15, 4/13 seat-games.

The section 19.4 questions:

- **Does every opposing faction kill Engineers in at least half of the
  seat-games with one?** **No** (Goblins and Undead yes; Humans 3/15,
  Dinosaurs 5/16, Martians 4/15, Ice Folk 4/13; 30 of 84 overall, 32 of 85
  before). Their killers are mostly Juggernaut-role rewards and Guards
  that reach the front. 40 of the 71 Engineers that died were lost within
  two rounds of their own Assemble: the Engineer is exposed at the front,
  but the other factions' policies do not go for it (section 7, proposal 2).
- **Does every opposing faction take a Dwarf city in some games?** Yes: in
  23-26 of 40 seat-games against each.
- **Shields, Snow and the Witch, Goblin packs, Cavemen and Raptors, ranged
  armies:** each wins some fights and loses some. Martian Grunts trade 0.74
  against Dwarf units, Ice Folk Witches 0.17, Goblins 0.42, Cavemen 0.54,
  Raptors 1.14, Human Marksmen 0.39, Martian Ray Gunners 1.61, Snow Hunters
  0.94. Walls were not measured separately.
- **Is there a pairing in which eruptions or bombs never kill?** Not
  strictly, but **the Dinosaur pairing is one kill each** (eruption 1, bomb
  1 in 40 games; the Gyrocopter trades 0.07 there). Dinosaur units are big
  (Raptors 12, Ankylosaurus 20 and Armoured) and the policy bombs Cavemen;
  an eruption never hit an Egg in the 80 Dinosaur games before and after. The eruption
  kills nothing against Undead and Martians.

Section 19.4 usefulness thresholds, after tuning:

| Unit or ability          | Measured                                                                                                                                                  | Threshold | Met       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Gyrocopter               | trained in 104 of 240 seat-games (43%); a bombing run in 55 of those (53%)                                                                                | 50% / 50% | near miss |
| Steam Mole               | 183 of 240 (76%); a tunnel in 120 of those (66%); an eruption that hits in 102 of 120 (85%)                                                               | 50% each  | yes       |
| Clockwork Gunner         | 97 of 118 seat-games with Marksmanship (82%); 821 second shots                                                                                            | 50%; seen | yes       |
| Engineer                 | 84 of 170 seat-games with Administration (49%); a Repair or an Assemble in 73 of 84 (87%)                                                                 | 50% / 50% | near miss |
| Ride                     | a rider tunnel in 96 of 183 seat-games with a Mole (52%)                                                                                                  | 25%       | yes       |
| Dig In                   | damage prevented in 38 seat-games: 38 of 56 with an attack on a dug-in unit (68%), 38 of 143 with a Dwarf city lost (27%); Dig In researched in 90 of 240 | 50%       | not met   |
| Steam Cannon, Steam Tank | Cannon in 32 of 56 with Sawmilling (57%); Tank in 41 of 46 with Chivalry (89%)                                                                            | 50%       | yes       |
| Brass Titan              | 152 granted (reward only)                                                                                                                                 | reported  | —         |

The two near misses and Dig In are research and production timing of the
policy (the Dwarf AI bead cut the early Gyrocopter and Engineer back
because it lost its head-to-head with them; Dig In is researched in 90 of
240 seat-games), not a number. Fine-tuning items.

Watch bands: no role other than the Hammerer above 40% of the kills (Mole
19%: met); the Steam Tank with/without gap 32 points (band 25; confounded,
section 4); the Gyrocopter's kills per loss 0.32 (band 0.3: met after the
change, 0.24 before).

The root's watch items:

- **Martians** (the likely worst pairing): 53%. Shields absorbed 119 HP of
  eruptions (72% of their damage against Martians) and 10 of bombs; the
  Gyrocopter trades 0.42 against Martians. Not the worst pairing (Ice Folk
  45%).
- **Dinosaurs** (the likely best): 53%. No Egg was hit by an eruption or a
  bomb; cities at round 15 2.7 against 2.3.
- **Dig In round caps:** none in 240 Dwarf games or 160 reference games.
- **The rider village race:** no gain (section 5).
- **Assemble at the front:** 441 Assembles in 84 Engineer seat-games (5.3
  each), 76% of the Gunners assembled, 40 Engineers lost within two rounds
  of their Assemble.
- **Cities at round 15 (the expansion weak spot):** 2.6 against 2.5 for
  the opponents: the Dwarves are not slow.

## 7. Proposals

None was applied: each needs a rule, AI, or engine change or root
approval.

1. **The eruption (rule; the "wow" moment).** It is a softening hit (40% of
   its victims die later that turn) but almost never a kill, and it is at
   its upper bound. Out of the bounds, an eruption of 3 (4 with Blasting
   Charges) triples the kills (9 in 441) and moves nothing else (53%); it
   would also cross the spec's constraint (above 3 a mound denies its ring
   to every cheap unit). A rule that makes it hurt without a bigger number,
   for example "a unit hit by an eruption cannot retaliate until its
   owner's next turn" (the surfaced pair and the wave then attack it free),
   would keep the forecastable 2 and give the surfacing turn its blow.
   Measure head to head before adopting; not screened here.
2. **Engineer hunt (AI; the blind spot).** A rule for every seat against
   the Dwarves: when own units can reach and kill a visible Engineer this
   turn (exact previews), move in and attack, above routine Moves (the
   Witch-hunt proposal of the Ice Folk report, which is the same gap: the
   existing target bonus of +6 ranks only attacks already offered from
   where the units stand). Measured head to head per the user's AI rule.
3. **Gyrocopter and Engineer production (AI; the two near misses).** The
   Dwarf policy trains the first Gyrocopter at war with four front units
   and the Engineer with work for it; the thresholds are just missed (43%,
   49%). A fine-tuning item, not a balance defect.
4. **Mind Control on a Clockwork Gunner (engine defect).** The public
   Mind Control target query (`publicMindControlTargetsV7` in
   `src/engine/v7/query.ts`) has no construct exclusion, while the reducer
   rejects a construct with `MIND_CONTROL_NOT_LEGAL` reason `TARGET_IMMUNE`
   (Dwarf section 7.2). The Martian AI chose the offered command and the
   match ended in a policy error: `MW`, 14 x 14, seed 2, round 38, in the
   eruption-1 diagnostic build; it did not occur in the shipped runs by
   chance. Fix: add `!unitIsConstructV7(view, target)` to the query (and a
   test that every offered `MIND_CONTROL` is accepted). Needs its own bead.
5. **Watch in the fine-tuning pass:** the Steam Tank's with/without gap,
   the Goblin Troll against Dwarf units, bombs and eruptions against
   Dinosaurs, and Dig In's research timing.

## 8. Parity and pins

The bomb belongs to the Dwarf registry only, so no match without a Dwarf
seat changes (the parity check of section 2). The identity moves to
`pulp-wars-poc-7r31` (`7r30` appended to the prior identities, the autosave
key `pulpWars.save.v7r31.current`, `pulpWars.save.v7r30.current` obsolete).
Re-pinned with this cause: the identity pins and prior-identity counts of
the revision tests, the three identity `REVISION` constants (Martian, Ice
Folk, Dwarf), the obsolete-key lists and the browser smoke's obsolete-key
probe, the save-key guard of every quoted `getItem` and `removeItem` in the
smoke script (unchanged test, now reading `v7r31`), the land-grant
fixture's identity, the Dwarf constants and capability tables (bomb 5, Dive
6; the default `bombDamage` every faction's capabilities carry is the
bomb), and the bomb tests' damage (5, Dive 6, Armoured Ankylosaurus 5,
Shielded Grunt 4 through 2). No decision or match hash pin changed.
