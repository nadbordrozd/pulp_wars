# Ruleset 7: map curiosities coarse check

**Status:** the coarse check of `pulp_wars-737.7` (bead 7 of the
[map curiosities spec](../product/RULESET_7_MAP_CURIOSITIES.md#15-implementation-beads)),
run on 2026-10-04 at `pulp-wars-poc-7r37`. It is a small sanity check, at
the user's direction ("no extensive balance testing at this stage"): 40
headless Normal matches and the placement validator. It changed no rule
and no number. The current rules are
[current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities).

**Result.** No error and no stall in any match. Curiosities are quiet: on
half of the boards the match with the option on is the match with it off,
command for command, and the Normal AI rarely touches a curiosity. The
sample is far too small to measure a win-rate shift. **Recommendation:
keep the rarity and every number as they are**; two small follow-ups are
proposed below, neither needed for the release.

## Placement

`npm run validate:ruleset7-curiosity-maps` (seeds 0–31 of every generated
map type, size, and AI count; 1,920 boards; `PASS`): the option off
reproduces the generator before the curiosities, the option on changes no
tile, and every curiosity and lair passes the independent placement
checker.

Boards with no, one, and two curiosities:

| Map type    | 11 x 11 (32) | 14 x 14 (64) | 16 x 16 (96) | 20 x 20 (96) | 25 x 25 (96) |
| ----------- | ------------ | ------------ | ------------ | ------------ | ------------ |
| Dry Land    | 24 / 8 / 0   | 27 / 37 / 0  | 32 / 64 / 0  | 0 / 59 / 37  | 2 / 29 / 65  |
| Pangea      | 23 / 9 / 0   | 33 / 31 / 0  | 26 / 70 / 0  | 5 / 63 / 28  | 7 / 39 / 50  |
| Lakes       | 28 / 4 / 0   | 30 / 34 / 0  | 19 / 77 / 0  | 14 / 52 / 30 | 19 / 21 / 56 |
| Continents  | 27 / 5 / 0   | 28 / 36 / 0  | 0 / 96 / 0   | 0 / 84 / 12  | 0 / 71 / 25  |
| Archipelago | 24 / 8 / 0   | 26 / 38 / 0  | 0 / 96 / 0   | 0 / 86 / 10  | 0 / 75 / 21  |

| Board width | Boards | With none | Curiosities per board | Spec target |
| ----------: | -----: | --------: | --------------------: | ----------: |
|          11 |    160 | 126 (79%) |                  0.21 |        0.33 |
|          14 |    320 | 144 (45%) |                  0.55 |         0.5 |
|          16 |    480 |  77 (16%) |                  0.84 |           1 |
|          20 |    480 |   19 (4%) |                  1.20 |         1.5 |
|          25 |    480 |   28 (6%) |                  1.39 |           2 |
|         all |  1,920 | 394 (21%) |                  0.97 |           — |

Kinds placed (1,860 in all: 188 Spiders, 463 Fountains, 444 Shrines, 765
Wrecks):

| Map type    | Spider | Fountain | Shrine | Wreck | Wreck share |
| ----------- | -----: | -------: | -----: | ----: | ----------: |
| Dry Land    |     30 |      201 |    170 |     0 |          0% |
| Pangea      |     80 |      122 |    102 |    64 |         17% |
| Lakes       |     78 |      107 |     97 |    78 |         22% |
| Continents  |      0 |       18 |     34 |   314 |         86% |
| Archipelago |      0 |       15 |     41 |   309 |         85% |

What the numbers say:

- **Boards with nothing.** A fifth of all boards, and at 16 x 16 a third of
  the Dry Land boards, 27% of the Pangea boards, and 20% of the Lakes
  boards, get no curiosity, because no tile is 3 from every settlement
  center and between the capitals. On 20 x 20 and 25 x 25 it is 15–20% of
  the Lakes boards and a few percent elsewhere. The measured counts sit
  below the spec's targets at every size from 16 up.
- **Wrecks on water maps.** On Continents and Archipelago boards 85% of the
  curiosities are Wrecks (623 of 731), and from 16 x 16 up every board has
  at least one curiosity, so nine boards in ten at 16 x 16 have exactly one
  Wreck and nothing else. Land kinds stay off a player's home island.
- **No Spider on Continents or Archipelago.** None in 768 boards: a lair
  needs a shared or neutral landmass, 5 from every center, with no corridor
  tile in its area. The Spider is on 30 of 288 Dry Land boards of 16 and
  up (10%), 80 of 288 Pangea boards (28%), and 78 of 288 Lakes boards
  (27%): 13% of all boards that could have one.

## Matches

Forty headless matches, Normal against Normal, Rival mode, one AI opponent:
ten boards, each played in both seat orders, each with the option on and
off on the same seed. The boards were **picked to cover every kind** (the
seeds are not a random sample of what a board draws; the placement table
above is). Each match is one command of this form (the identity the check
ran at; the Candy engine, the Grunt at 8 HP, and the village density have
since made the current identity `pulp-wars-poc-7r40`, which is what
`--ruleset` takes now. Through `7r39` a match without a Candy or Martian
seat plays as at `7r37`; the village density of `7r40`
(`pulp_wars-ykw.2`) regenerates every board, so these seeds no longer give
the boards recorded here):

```bash
npm run headless -- batch --ruleset pulp-wars-poc-7r37 --seeds 3 \
  --ai-counts 1 --size 16 --map-types pangea --factions human,undead \
  --curiosities on
```

| Board (seed)      | Curiosities      | Seat 0 against seat 1 | Off: winner, rounds | On: winner, rounds | On against off |
| ----------------- | ---------------- | --------------------- | ------------------- | ------------------ | -------------- |
| Pangea 16 (3)     | Spider           | Human, Undead         | Human, 16           | Human, 16          | same play¹     |
|                   |                  | Undead, Human         | Undead, 30          | Undead, 36         | diverged       |
| Pangea 16 (1)     | Wreck            | Goblin, Dinosaur      | Dinosaur, 20        | Dinosaur, 20       | identical      |
|                   |                  | Dinosaur, Goblin      | Dinosaur, 19        | Dinosaur, 19       | identical      |
| Lakes 16 (8)      | Spider           | Martian, Ice Folk     | Martian, 19         | Martian, 19        | same play¹     |
|                   |                  | Ice Folk, Martian     | Martian, 22         | Martian, 22        | same play¹     |
| Lakes 16 (5)      | Fountain         | Dwarf, Human          | Dwarf, 25           | Dwarf, 25          | identical      |
|                   |                  | Human, Dwarf          | Human, 59           | Human, 59          | identical      |
| Pangea 20 (8)     | Fountain, Spider | Human, Goblin         | Human, 49           | Human, 52          | diverged       |
|                   |                  | Goblin, Human         | Goblin, 44          | Goblin, 47         | diverged       |
| Pangea 20 (2)     | Shrine, Wreck    | Undead, Dwarf         | Dwarf, 145          | Dwarf, 67          | diverged       |
|                   |                  | Dwarf, Undead         | Dwarf, 95           | Undead, 102        | diverged       |
| Lakes 20 (4)      | Shrine, Spider   | Dinosaur, Martian     | Dinosaur, 71        | Dinosaur, 45       | diverged       |
|                   |                  | Martian, Dinosaur     | Martian, 115        | Martian, 66        | diverged       |
| Lakes 20 (8)      | Fountain, Wreck  | Ice Folk, Human       | Human, 36           | Human, 36          | identical      |
|                   |                  | Human, Ice Folk       | Ice Folk, 40        | Ice Folk, 40       | identical      |
| Continents 20 (2) | Shrine, Wreck    | Human, Undead         | Undead, 111         | Undead, 111        | identical      |
|                   |                  | Undead, Human         | none, 365²          | none, 365²         | identical      |
| Continents 16 (1) | Wreck            | Goblin, Dwarf         | Dwarf, 27           | Dwarf, 27          | identical      |
|                   |                  | Dwarf, Goblin         | Goblin, 26          | Goblin, 26         | identical      |

¹ The same rounds, command count, and unit deaths; the command hash differs
only because the Spider takes one entity ID, so later units are numbered
one higher. "Identical" is an equal command hash.

² Both matches stop at the headless cap of 30,000 commands in round 365
with no winner, with the option on and off alike: a stalemate of this
board and seat order that has nothing to do with curiosities (follow-up 3).

- **Errors and stalls:** none in 40 matches. 38 reached an outcome; the two
  capped matches are the pair of note ².
- **How often a curiosity changes a match:** in 10 of the 20 pairs the
  option on plays command for command like the option off (no Spider, and
  nobody touched the Fountain, Shrine, or Wreck); in 3 more the Spider
  sat untouched and the play is the same; 7 pairs diverged.
- **Winners:** 19 of 20 pairs have the same winner. The one change is
  Pangea 20 (seed 2) with the Dwarves in seat 0: the Dwarves win with the
  option off (round 95), the Undead with it on (round 102), in a match
  where a Shrine was claimed. By pairing, Undead against Dwarf goes from 0–2
  to 1–1; the other eight pairings are unchanged. With two matches per
  pairing this says only that nothing is grossly off; it cannot show a
  shift of a few points either way.
- **Length:** the 18 decided pairs sum to 969 rounds off and 835 on
  (−14%), all of it from three long matches that ended much sooner with
  the option on (145 to 67, 71 to 45, 115 to 66); the other four diverged
  pairs each ran three to seven rounds longer. Seven diverged matches are
  too few to call this an effect: two Normal seats replay any change of
  one early move as a different game.

Use of each curiosity in the 20 matches with the option on:

| Curiosity | Matches with one | Used                                                                |
| --------- | ---------------: | ------------------------------------------------------------------- |
| Spider    |                8 | fought in 2: 34 damage dealt, 2 units killed; slain in 1 (round 46) |
| Fountain  |                6 | 2 heals, one in each of 2 matches                                   |
| Shrine    |                6 | claimed in 2                                                        |
| Wreck     |               10 | salvaged in 0                                                       |

- **The Spider:** in 6 of its 8 matches nothing ever stood next to it or
  hit it, which is what the Normal AI's avoidance is for. Both fights were
  on Lakes 20 (seed 4): the Dinosaur seat lost two units to it and did not
  kill it; in the other seat order it was slain in round 46 for the
  10-Coin bounty, having dealt 15 damage and killed nothing. So two units
  were lost to the Spider in 20 matches, and one Spider in eight was slain.
- **The Wreck was never salvaged** in ten matches, two of them on
  Continents boards where it is the usual curiosity. Normal sails for a
  Wreck only with a unit already afloat within 4 water steps, and that
  seldom happens.

**Against the spec's acceptance criterion 7** (no pairing moving more than
5 points, the Spider slain in most of its matches by round 60, match length
within 10%): this check cannot decide the first, and does not meet the
other two as written (one Spider in eight slain; −14% rounds, from three
matches). The criterion assumed a matrix of hundreds of matches and a more
aggressive AI; the Normal AI of `pulp_wars-737.4` avoids the Spider by
design, so "slain in most matches" no longer describes the intended
behavior. The user asked for colour that is very rare and for no extensive
testing at this stage, and nothing here argues against shipping as is.

## Recommendation on rarity

The user asked for "very rare". Measured: about one curiosity per board on
average, none on four 11 x 11 boards in five, none on a sixth of the 16 x 16
boards, and at most two on the largest. A Spider is on roughly one board in
eight of those that could have one. **That is rare enough, and the empty
boards are acceptable: change nothing.** In particular:

- **Boards with no legal site** need no relaxing of rule 3 or rule 4: an
  empty board is the rule's intended failure mode, and filling those
  boards would make curiosities less rare, not better.
- **The Spider's absence from Continents and Archipelago** deserves no
  tweak. The only land there that could take a lair is a player's home
  island, and a hazard next to one player only is unfair. Those maps have
  the Wreck instead.
- **Wrecks on water maps** are the one place the result is not "very
  rare": from 16 x 16 up, every Continents and Archipelago board has a
  curiosity and it is nearly always a Wreck, so it is predictable there
  instead of a surprise, and Normal does not go for it. This is a matter of
  taste, not a defect; follow-up 1 is the smallest rule that would address
  it.

## Follow-ups (not done here)

1. **Optional rule tweak, the smallest one: a lone Wreck is placed half the
   time.** When the Wreck is the only eligible kind for a curiosity slot,
   draw once more on the curiosity stream and place it with probability
   1/2 (otherwise the slot stays empty). Estimated effect: Continents and
   Archipelago boards of 16 and up go from always having a curiosity to
   about half; elsewhere it applies only on a board where no land kind has
   a site (never on Dry Land). It changes which
   boards carry a Wreck, so it needs a new ruleset identity and a rerun of
   the placement validator. Do it only if the user finds a Wreck on every
   island map too predictable.
2. **Normal AI: go for the Wreck.** Widen the Wreck errand (an idle boat
   from farther than 4 water steps, or a unit that embarks for it), and
   reconsider the Fountain and Shrine bounds (half HP within two turns; 4
   route steps), as the spec's section 20 anticipated. No identity change.
   Low priority: it affects how often the AI uses a curiosity, not the
   rules.
3. **A stalemate unrelated to curiosities.** Continents 20 x 20, seed 2,
   Undead in seat 0 against Human runs to the 30,000-command cap in round
   365 with the option on and off alike. Worth a look under the AI
   endgame work, not under this epic.
