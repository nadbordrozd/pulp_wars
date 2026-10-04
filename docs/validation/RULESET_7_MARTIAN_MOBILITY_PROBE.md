# Ruleset 7: the Martian mobility probe, baseline

Bead `pulp_wars-1wy.2` (epic `pulp_wars-1wy`). The probe and its acceptance
bars are defined in
[the balance design, section 8.2](../product/RULESET_7_BALANCE_MARTIAN_ICE.md#82-the-human-style-probe).
This report is the **baseline on the rules before `pulp_wars-1wy.3`**
(identity `pulp-wars-poc-7r36`): the probe uses whatever is legal today. The
run after the rules change belongs to `pulp_wars-1wy.6`.

Data: [RULESET_7_MARTIAN_MOBILITY_PROBE.json](RULESET_7_MARTIAN_MOBILITY_PROBE.json)
(summary and every match).

## Result in short

- **The probe wins 13 of 36 games (36.1%)**; the Normal Martian AI on the
  same seeds and seats wins 12 of 36 (33.3%). The difference is one game.
- **The user's observation shows up.** A Martian seat that buys the carriers
  and uses every mobility tool every turn does not win more than one that
  masses Grunts, and both are well below 50% on this sample. The tools fire
  rarely and late: a Tractor Beam in 4 of 36 probe games, the first carrier
  at median round 11, no beamed unit ever attacks on arrival (today's rules
  exhaust it), and 8 pulled units in 36 games died in the turn of the pull.
- **The sample is small** (36 games per arm, by the standing coarse-balance
  policy). One game is 2.8 points; a 36-game win rate has a standard error
  of about 8 points. The per-opponent rows (6 games each) are indications
  only.
- The Normal Martian AI's 33.3% is lower than the 46-58% of the earlier
  Martian reports. Those were other identities (`7r25`, `7r27`, `7r32`),
  other seeds, and larger samples; this report did not investigate the gap
  (see [Concerns](#concerns)).

## What was run

```text
npm run probe:martian-mobility -- --markdown --output docs/validation/RULESET_7_MARTIAN_MOBILITY_PROBE.json
```

- Dry Land, two seats, Rival, round cap 150, no curiosities.
- 11 x 11 with seeds 0 and 1, 14 x 14 with seed 0; both seat orders; six
  opponents (Human, Undead, Goblin, Dinosaur, Ice Folk, Dwarf): 36 cells.
- Each cell is played twice: the **probe** on the Martian seat, and the
  plain **Normal Martian AI** on the Martian seat (the comparison). The
  opponent is the Normal AI in both.
- Every match is deterministic and independent. All 72 matches were decided:
  no round cap, error, stall, or rejected command.

The script's defaults are this small run. Larger runs need explicit flags
(`--seeds 10,10`, `--sizes`, `--opponents`, `--first-seed`, `--max-rounds`,
`--jobs`).

## The probe

`MARTIAN_MOBILITY_PROBE` is headless only
(`src/headless/martian-mobility-probe-v7.ts`; the match runner is
`src/headless/martian-mobility-probe-match-v7.ts`). It is the Normal AI with
overrides: before each command the probe looks for one command to play, in
the order below; when no rule applies the Normal policy decides. The Normal
AI and the engine are unchanged.

| #   | Rule         | What it plays                                                                                                                                                                                                                                   |
| --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Production   | A light carrier while the army has fewer than one per three front units; a heavy (two-slot) carrier when offered, one per six front units and always the first. Not in a city with a hostile unit within three tiles.                           |
| 1   | Mind Control | Whenever offered, the most valuable target.                                                                                                                                                                                                     |
| 2   | Pull         | The best offered Tractor Beam: a defender off a hostile center next to an own ground unit that can step on (which then steps on); a hostile unit to where the other own units deal its Shield plus HP; an own wounded unit out of lethal reach. |
| 3   | Focus fire   | The attacks that kill a target this turn, pulled targets first: a killing hit, then shots without retaliation, then the biggest hit; ranged non-ray units walk to two tiles from the target to join.                                            |
| 4   | Extract      | A Beam Down of an own unit that has acted and stands in visible lethal reach, to the safest legal tile.                                                                                                                                         |
| 5   | Deliver      | A Beam Down to a tile from which the passenger has a hostile unit in range; else to the tile that gains the most steps toward the enemy (at least two, and more than its own Move).                                                             |
| 6   | Reposition   | A carrier with nothing to do flies to hover within two tiles of the front unit nearest the enemy, out of lethal reach, at a pull distance from hostile units near own shooters.                                                                 |

**It only plays offered commands.** Every choice comes from
`queryPlayerCommandsV7`; destinations come from `previewTractorBeamV7`;
damage comes from `queryCombatPreviewV7` and the policy's public projection;
danger comes from `queryThreatenedTilesV7` (against Dwarves also the hostile
mounds of the view, their eruption and surfacing reach, and a Gyrocopter bomb, as
in the Normal policy). The probe reads only the public view.

**It discovers the rules from the offers.** Nothing in it says "an unmoved
Saucer", "a Mothership", "exactly two tiles", or "the passenger is
exhausted". When `pulp_wars-1wy.3` lands, without a change to the probe:

- a Tractor Beam offered by a Saucer is scored like any other pull;
- a heavy pull is scored at the previewed final tile, and the hover rule
  learns the new pull distances from the offered commands;
- a Beam Down offered after the carrier's Move is used (the reposition
  comes before the tools are looked at again);
- a pick-up of a unit away from a city is an extraction or a delivery like
  any other (a unit test feeds such an offer);
- a passenger delivered with its primary action left is shot by the focus
  rule or the Normal policy as soon as the engine offers its attack.

**Differences from section 8.2**, all toward the task's wording ("every
mobility tool each turn"):

- Production goes first, so that a unit trained this turn can be delivered
  this turn.
- Mind Control, the reposition rule, and the walking shooters are added.
- Focus fire is a kill plan of the probe, not the Normal attack order; an
  attack that does not kill is still the Normal policy's.
- A kill pull must turn a non-kill into a kill and does not count the
  puller's own attack (today the pull is its whole action).
- Kiting has no rule of its own: a unit cannot move after it attacks today.
  It is the Normal policy's step back to two tiles, the walking shooters
  (always to two tiles or more), and extraction.

## Win rates

Martian wins per decided game.

| Opponent  | Games |         Probe | Normal Martian AI |
| --------- | ----: | ------------: | ----------------: |
| Human     |     6 |   2/6 (33.3%) |       1/6 (16.7%) |
| Undead    |     6 |   3/6 (50.0%) |       4/6 (66.7%) |
| Goblin    |     6 |   3/6 (50.0%) |       2/6 (33.3%) |
| Dinosaur  |     6 |   2/6 (33.3%) |       3/6 (50.0%) |
| Ice Folk  |     6 |   2/6 (33.3%) |       1/6 (16.7%) |
| Dwarf     |     6 |   1/6 (16.7%) |       1/6 (16.7%) |
| **Mixed** |    36 | 13/36 (36.1%) |     12/36 (33.3%) |

| Split           |        Probe | Normal Martian AI |
| --------------- | -----------: | ----------------: |
| 11 x 11         | 7/24 (29.2%) |      8/24 (33.3%) |
| 14 x 14         | 6/12 (50.0%) |      4/12 (33.3%) |
| Martians first  | 5/18 (27.8%) |      7/18 (38.9%) |
| Martians second | 8/18 (44.4%) |      5/18 (27.8%) |

Paired by cell (same seed, size, and seats): both won 8, only the probe 5,
only the Normal AI 4, neither 19.

Against the section 8.2 bars, which apply **after** the rules change:

| Bar                                                   | Baseline                       |
| ----------------------------------------------------- | ------------------------------ |
| At least 50% of mixed decided games                   | 36.1%: not met                 |
| At least 40% against each faction                     | met for Undead and Goblin only |
| Not worse than the Normal Martian AI by over 5 points | +2.8 points: met               |
| Round caps not above the Normal runs (section 8.3)    | 0 and 0                        |

## Tool usage

Per Martian seat-game (36 games per arm).

| Measure                                  | Probe | Normal Martian AI |
| ---------------------------------------- | ----: | ----------------: |
| Martian turns                            | 27.64 |             25.19 |
| Carrier-turns with Beam Down             | 25.53 |             12.08 |
| Carrier-turns with a Tractor Beam        |  4.03 |              1.31 |
| Games with a carrier                     |    33 |                30 |
| First carrier, median round              |    11 |                12 |
| Tractor Beams                            |  0.67 |              0.17 |
| ... on a hostile unit                    |  0.33 |              0.17 |
| ... on an own unit                       |  0.33 |              0.00 |
| ... a defender off a hostile center      |  0.22 |              0.00 |
| City captured within two rounds of it    |  0.11 |              0.00 |
| Pulled units killed in the same turn     |  0.22 |              0.03 |
| Games with a Tractor Beam                |     4 |                 2 |
| Tractor Beams per Tractor carrier-turn   | 0.166 |             0.128 |
| Beam Downs                               |  6.33 |              1.81 |
| ... from a city                          |  6.33 |              1.81 |
| ... pick-ups away from a city            |  0.00 |              0.00 |
| ... of a unit that attacked (extraction) |  1.47 |              0.08 |
| ... after the carrier moved              |  0.00 |              0.00 |
| Passengers that attacked on arrival      |  0.00 |              0.00 |
| Games with a Beam Down                   |    29 |                19 |
| Beam Downs per Beam Down carrier-turn    | 0.248 |             0.149 |
| Mind Controls                            |  0.14 |              0.08 |
| Attacks                                  | 49.33 |             40.14 |
| ... from two tiles or more               | 40.86 |             33.86 |
| Hostile units killed on Martian turns    | 10.81 |              8.03 |
| Martian units lost                       |  8.00 |              6.11 |
| Cities captured                          |  2.31 |              2.00 |
| Rounds                                   | 27.83 |             25.44 |

Units trained per game (role IDs; `FIGHTER` Grunt, `MARKSMAN` Ray Gunner,
`GUARD` Shield Projector, `RAIDER` Saucer, `CAPTAIN` Brain, `CATAPULT`
Tripod, `KNIGHT` Mothership):

| Arm               | Grunt | Ray Gunner | Projector | Saucer | Brain | Tripod | Mothership |
| ----------------- | ----: | ---------: | --------: | -----: | ----: | -----: | ---------: |
| Probe             |  5.72 |       0.78 |      0.86 |   2.03 |  0.39 |   1.03 |       0.47 |
| Normal Martian AI |  5.36 |       0.39 |      1.03 |   0.94 |  0.39 |   0.56 |       0.28 |

The probe's own commands, by rule (36 games):

| Rule                 | Commands | Per game |
| -------------------- | -------: | -------: |
| Train a carrier      |       69 |     1.92 |
| Train a heavy one    |        3 |     0.08 |
| Mind Control         |        5 |     0.14 |
| Pull: city           |        7 |     0.19 |
| Pull: kill           |        4 |     0.11 |
| Pull: rescue         |       11 |     0.31 |
| Step on the center   |        7 |     0.19 |
| Focus attack         |      733 |    20.36 |
| Focus Move           |      113 |     3.14 |
| Extract              |       58 |     1.61 |
| Deliver: attack tile |       75 |     2.08 |
| Deliver: route       |       88 |     2.44 |
| Reposition           |      543 |    15.08 |

## What the baseline says

- **The carriers are busy and it does not pay.** The probe fields twice the
  Saucers (2.03 a game against 0.94), has twice the carrier-turns, and
  makes 3.5 times the Beam Downs (6.33 against 1.81). It wins one game more
  out of 36.
- **Beam Down is a turn late, as the design says.** 0 of 228 probe Beam
  Downs were followed by an attack of the passenger that turn, 0 came after
  a carrier Move, and 0 were pick-ups: today's rules allow none of the
  three. A carrier acts on one turn in four (0.248 Beam Downs per
  carrier-turn) and spends most of the others hovering (15.08 repositions a
  game).
- **The Tractor Beam is almost absent.** Only the Mothership has it: a
  Tractor Beam in 4 of 36 probe games, 24 pulls in all: 12 of own units
  out of lethal reach and 12 of hostile units, of which 8 were defenders
  pulled off a center (4 of those cities fell within two rounds) and 8 died
  in the turn they were pulled. The Mothership is trained 0.47 times a game.
- **The Grunts do the work, and they kill slowly.** Both arms shoot from two
  tiles in 83-84% of their attacks. The probe's focus fire kills more
  (10.81 hostile units a game against 8.03) but also loses more (8.00
  against 6.11) and plays longer (27.8 rounds against 25.4).
- **Mind Control is starved** (0.14 a game), as section 3.7 predicts: few
  targets are left wounded at 6 HP or less.

So on today's rules the "win by mobility" plan is a side-grade at best: the
user's experience that Martians are weak in human hands is consistent with
this sample. Whether the probe passes its bars is for the run after
`pulp_wars-1wy.3`.

## Every match

| Opponent | Size | Seed | Martian seat | Probe | Rounds | Normal | Rounds | Probe pulls | Probe beams | Probe Mind Controls |
| -------- | ---: | ---: | ------------ | ----- | -----: | ------ | -----: | ----------: | ----------: | ------------------: |
| Human    |   11 |    0 | first        | loss  |     26 | loss   |     25 |           0 |           5 |                   0 |
| Human    |   11 |    0 | second       | loss  |     28 | loss   |     25 |           0 |           2 |                   0 |
| Human    |   11 |    1 | first        | loss  |     38 | loss   |     24 |           0 |           9 |                   0 |
| Human    |   11 |    1 | second       | win   |     15 | win    |     24 |           0 |           6 |                   0 |
| Human    |   14 |    0 | first        | win   |     38 | loss   |     52 |           3 |           7 |                   1 |
| Human    |   14 |    0 | second       | loss  |     22 | loss   |     28 |           0 |           4 |                   0 |
| Undead   |   11 |    0 | first        | loss  |     23 | win    |     26 |           0 |           3 |                   0 |
| Undead   |   11 |    0 | second       | loss  |     25 | loss   |     26 |           0 |           0 |                   0 |
| Undead   |   11 |    1 | first        | loss  |     16 | loss   |     16 |           0 |           0 |                   0 |
| Undead   |   11 |    1 | second       | win   |     15 | win    |     19 |           0 |           5 |                   0 |
| Undead   |   14 |    0 | first        | win   |     26 | win    |     32 |           0 |           9 |                   1 |
| Undead   |   14 |    0 | second       | win   |     54 | win    |     38 |           2 |          27 |                   0 |
| Goblin   |   11 |    0 | first        | loss  |     21 | win    |     32 |           0 |           4 |                   0 |
| Goblin   |   11 |    0 | second       | win   |     33 | loss   |     26 |           0 |          11 |                   0 |
| Goblin   |   11 |    1 | first        | loss  |     33 | loss   |     31 |           0 |           6 |                   1 |
| Goblin   |   11 |    1 | second       | win   |     21 | loss   |     21 |           0 |           7 |                   0 |
| Goblin   |   14 |    0 | first        | win   |     32 | win    |     23 |           0 |          11 |                   0 |
| Goblin   |   14 |    0 | second       | loss  |     24 | loss   |     19 |           0 |           0 |                   0 |
| Dinosaur |   11 |    0 | first        | loss  |     10 | loss   |     11 |           0 |           0 |                   0 |
| Dinosaur |   11 |    0 | second       | loss  |     26 | loss   |     29 |           0 |           2 |                   0 |
| Dinosaur |   11 |    1 | first        | loss  |     50 | win    |     25 |          11 |          19 |                   1 |
| Dinosaur |   11 |    1 | second       | win   |     25 | win    |     20 |           0 |          17 |                   0 |
| Dinosaur |   14 |    0 | first        | win   |     43 | win    |     33 |           8 |          26 |                   1 |
| Dinosaur |   14 |    0 | second       | loss  |     28 | loss   |     33 |           0 |           0 |                   0 |
| Ice Folk |   11 |    0 | first        | loss  |     25 | loss   |     16 |           0 |           5 |                   0 |
| Ice Folk |   11 |    0 | second       | loss  |     22 | loss   |     19 |           0 |           0 |                   0 |
| Ice Folk |   11 |    1 | first        | loss  |     22 | win    |     21 |           0 |           2 |                   0 |
| Ice Folk |   11 |    1 | second       | win   |     16 | loss   |     12 |           0 |           2 |                   0 |
| Ice Folk |   14 |    0 | first        | win   |     51 | loss   |     24 |           0 |          17 |                   0 |
| Ice Folk |   14 |    0 | second       | loss  |     24 | loss   |     31 |           0 |           0 |                   0 |
| Dwarf    |   11 |    0 | first        | loss  |     22 | loss   |     19 |           0 |           3 |                   0 |
| Dwarf    |   11 |    0 | second       | loss  |     26 | loss   |     26 |           0 |           1 |                   0 |
| Dwarf    |   11 |    1 | first        | loss  |     34 | loss   |     30 |           0 |           5 |                   0 |
| Dwarf    |   11 |    1 | second       | win   |     19 | win    |     20 |           0 |          10 |                   0 |
| Dwarf    |   14 |    0 | first        | loss  |     38 | loss   |     33 |           0 |           1 |                   0 |
| Dwarf    |   14 |    0 | second       | loss  |     31 | loss   |     27 |           0 |           2 |                   0 |

## Concerns

- **Sample size.** 36 games per arm cannot separate 36% from 33%, and
  cannot rank the opponents. The after-change run should use the same cells
  so that the comparison is paired; a larger run is one flag away if the
  user asks for it.
- **The Normal Martian AI at 33%.** Earlier reports measured 46-58% on other
  identities with 24 or more games per pairing. This run has six games per
  opponent on seeds 0 and 1, on `7r36`, after the later factions and AI
  work. It may be noise, or the Martians may have fallen behind since; this
  bead did not look into it. The coarse matrix of `pulp_wars-1wy.6` will
  show which.
- **The probe is a script, not a person.** It executes the section 8.2 rules
  with simple scores. It does not save Coins for a Mothership, plan a siege
  over several turns, or research toward the carriers; a real player does.
  It measures whether the tools pay when used at every chance, not the
  ceiling of human play.
- **Two conservative choices to revisit after `pulp_wars-1wy.3`.** The kill
  pull does not count the puller's own attack (right today, an
  underestimate once the Mothership's pull is free). A carrier that has a
  qualifying delivery where it stands uses it before it considers flying
  somewhere better (right today, when a Move forfeits the Beam Down).
