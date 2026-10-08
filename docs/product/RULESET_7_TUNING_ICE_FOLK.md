# Ruleset 7: step two of the Ice Folk pass

**Status:** implemented on `pulp-wars-poc-7r59` (bead `pulp_wars-w49.27`).
The rules themselves are stated in
[Ruleset 7: current rules](RULESET_7_CURRENT.md); the faction's
specification and its first balance pass are
[the Ice Folk overlay](RULESET_7_ICE_FOLK.md) and
[the Ice Folk balance report](../validation/RULESET_7_ICE_FOLK_BALANCE.md).
This document is the reasoning and the record of the hand-played pass, in
the shape of step two of
[the Dinosaur pass](RULESET_7_TUNING_DINOSAUR.md#14-step-two),
[the Martian pass](RULESET_7_TUNING_MARTIAN.md#14-step-two),
[the Undead pass](RULESET_7_TUNING_UNDEAD.md#15-step-two),
[the Goblin pass](RULESET_7_TUNING_GOBLIN.md), and
[the Human pass](RULESET_7_TUNING_HUMAN.md).

## 1. What changed

Step two is "iterate on each faction including playing games manually to
rejig the balance better and improve the AI for each faction". The Ice
Folk had no faction pass before it: their seat of the Normal AI played the
older policy, and so did every seat of a match with one.

- **One rule: an Ice Folk city's level-2 Survey is Scouts, with a free
  Sled** (`SURVEY_RAIDERS_V7.ICE_FOLK`), as the Humans', the Goblins', the
  Undead's, the Martians', and the Dinosaurs' is
  ([section 4](#4-the-rule-that-changed)). The identity is
  `pulp-wars-poc-7r59`; `7r58` is a prior identity and its browser save
  key is obsolete.
- **No number changed.** Every unit, price, and technology is as it was.
- **An Ice Folk seat of the Normal AI plays the army rules** in a match
  whose every seat is Human, Undead, Goblin, Martian, Dinosaur, or Ice
  Folk, and so do the other seats of that match
  ([section 5](#5-the-ice-folk-normal-ai)). A match with a Dwarf or a
  Candy seat keeps the older policy for every seat.
- A lab for the hand player, `LAB_ICE_FOLK_MID`
  ([section 6](#6-the-lab)).

The bar was the user's: "the faction is not crazy op or crazy weak and
that all the tech branches are useful and that units are differentiated
from other factions by more than stats".

## 2. The games

All in text mode against the Normal AI, on Dry Land.

| Game  | Played as | Against                | Map         | Route                                                                                 | Result                                                                                             |
| ----- | --------- | ---------------------- | ----------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `a`   | Human     | Ice Folk (before)      | 14, seed 9  | Hunting 1, Scouting 7, Gathering 8, Raiding 11, Forestry 14                           | stopped after round 15: 7 cities and 14 units against 4 and 10; 11 kills for 6 lost                |
| `b`   | Ice Folk  | Goblin                 | 14, seed 19 | Hunting 1, Scouting 2, Crafting 5, Deep Winter 10, Marksmanship 12, Leadership 18     | stopped after round 20, ahead: 4 cities and 7 units against 2 and 5; 15 kills for 15 lost          |
| `c`   | Ice Folk  | Martian, Undead, Human | 16, seed 14 | Gathering 1, Crafting 3, Engineering 7, Deep Winter 13, Mammoths 17                   | stopped after round 19, holding: 4 cities (one lost) and 8 units; 6 kills for 12 lost              |
| `lab` | Ice Folk  | Human                  | the lab     | `LAB_ICE_FOLK_MID`, five rounds: Brittle, Walls, a Boulder Yeti, a Mammoth            | two kills without loss in round 4, then one Knight killed five units in a ride; 4 kills for 7 lost |
| `d`   | Ice Folk  | Human                  | Lakes 14    | Rime as the opener, four rounds                                                       | Freeze only: see [section 3](#3-the-questions), (v)                                                |
| `e`   | Ice Folk  | Human                  | Archip. 14  | Rime in round 3, five rounds                                                          | Freeze only                                                                                        |
| `a2`  | Human     | Ice Folk (after)       | 14, seed 9  | the same route                                                                        | stopped after round 15: 7 cities and 11 units against 4 and 15; 8 kills for 6 lost                 |
| `f`   | Ice Folk  | Goblin                 | 14, seed 19 | Hunting 1, Crafting 4, Marksmanship 7, Deep Winter 10 (with the Survey Sled, at 7r59) | stopped after round 10: 5 cities and 5 units against 2 and 6; 3 kills for 3 lost                   |

The numbers after a technology are the rounds it was bought in. "Before"
and "after" are the Ice Folk AI before and after
[section 5](#5-the-ice-folk-normal-ai). Game `c` was played with the Survey
Sled in the working tree; `b` without it.

**The maps.** Of seeds 1 to 20 on Dry Land 14, seeds 9 and 19 have no chest
within three tiles of either capital (the Goblin, Undead, Martian, and
Dinosaur passes used the same two). On seed 9 the Human capital has one
Mountain within two tiles and the Ice Folk AI's three: neither is boxed in,
and the Mountain-born seat has no wall of peaks to hide behind. On seed 19
the player's capital has five Mountains within two tiles and stands in
Forest with its villages four tiles away: the hard start for a faction
whose Sled is stopped by every Forest. On Dry Land 16 with four seats, seed
14 has no chest by the player's capital.

What each seat held at the start of its turn (Coins, income, cities, units;
lost and killed are totals):

| Round | `a` Human     | `a` Ice Folk AI | `a2` Human    | `a2` Ice Folk AI | `b` Ice Folk | `b` lost, killed | `c` Ice Folk | `c` lost, killed |
| ----- | ------------- | --------------- | ------------- | ---------------- | ------------ | ---------------- | ------------ | ---------------- |
| 3     | 5, 3, 1, 3    | 1 city, 3       | 5, 3, 1, 3    | 1 city, 3        | 4, 3, 1, 2   | 0, 0             | 5, 3, 1, 3   | 0, 0             |
| 6     | 7, 6, 3, 5    | 4, 5            | 7, 6, 3, 5    | 3, 5             | 5, 4, 2, 3   | 0, 0             | 7, 6, 3, 5   | 0, 0             |
| 9     | 12, 11, 6, 10 | 4, 11           | 9, 9, 5, 7    | 4, 8             | 8, 7, 4, 6   | 2, 2             | 9, 8, 5, 6   | 2, 2             |
| 12    | 12, 12, 7, 12 | 4, 9            | 11, 11, 6, 9  | 4, 12            | 13, 8, 4, 6  | 6, 4             | 14, 9, 5, 8  | 5, 3             |
| 15    | 14, 13, 7, 14 | 4, 10           | 18, 13, 7, 13 | 4, 14            | 9, 9, 4, 8   | 9, 5             | 10, 8, 5, 8  | 10, 5            |
| 18    |               |                 |               |                  | 19, 9, 4, 9  | 12, 12           | 8, 8, 4, 9   | 10, 6            |

Game `f` (Coins, income, cities, units): round 3: 5, 3, 1, 3; round 6: 10,
4, 2, 3; round 9: 8, 6, 3, 6; round 10: 15, 7, 4, 5, and the fifth city
taken in that turn.

## 3. The questions

**(i) An opening of Yetis alone holds against the Goblin mob and loses to
Martian Grunts. Left as it is.**

- A full Yeti kills a full Goblin in one blow (6 of 6, nothing back), and
  on its own Snow it Glides two tiles and strikes first: seven kills that
  way in `b`. A Goblin's blow on a Yeti is 3 for 3 back.
- What kills the Yeti is its own kill. The advance is forced, so each kill
  carried it off its center and beside the next Goblins: Gang Up made the
  second blow 6, and a Bomb Chucker on a tile not yet explored added 5.
  Five Yetis died that way in `b` and two in `f` (round 7: 3 and 6; round
  9: 3, and a bomb's 3). The exchange was even in both games (15 for 15, 3
  for 3) at the same price, 2 Coins a unit.
- Against Grunts it is not even. A Grunt shoots from two tiles for 5 and a
  Yeti that walks up deals 5 and takes 3; behind a Force Field a Mammoth
  dealt 1 HP. In `c` the city between three seats lost the Yeti on its
  center in rounds 7 and 8 to a Grunt's shot from a tile not yet explored
  and a Saucer's blow, and the Martian seat made 17 kills in the game for
  4 units lost.
- The answer is in the tree and early: the Snow Hunter (Hunting and
  Marksmanship, 3 Coins) kills a Goblin from two tiles without advancing,
  and was the best 3 Coins of `b`. The AI buys it second
  ([section 5](#5-the-ice-folk-normal-ai)).

**(ii) The Musk Ox is wanted for one job, Frostbite is felt as a threat,
and Deep Winter is not an automatic second purchase. Left as it is.**

- Deep Winter was bought in round 10 (`b`, after Scouting and Crafting),
  round 13 (`c`, after Crafting and Engineering), and round 10 (`f`, after
  Crafting and Marksmanship): third or fourth each time, at 9 to 15 Coins.
- The Ox on a center three tiles from the Goblin capital took 3, 3, 3, 4,
  3, and 5 in three turns, healed 6 a turn, killed one Goblin by its
  strike back, and died in round 12; the second held the center to the
  end. In `c` no Skeleton attacked the Ox on a center in six rounds (they
  killed two Yetis beside it): a Fighter that strikes it deals 4, takes 6,
  and is Chilled.
- It is not an army: it does not strike after it moves, and off its Snow
  it moves one tile. The AI caps it at one a city
  ([section 5](#5-the-ice-folk-normal-ai)).

**(iii) The Mammoth comes late (round 17 by hand, round 22 for the AI) and
is still the signature unit when it arrives. Left as it is; open for the
user.**

- The straight route in `c` was Crafting 3, Engineering 7, Mammoths 17: 37
  Coins of technology on one to five cities, with Deep Winter's 15 in
  between. Two Mines on the Ore that Engineering opened took the capital to
  level 3 on the way, so the route pays for part of itself.
- In the lab it did what it is for: 7 on a Marksman in a Forest and Sweep
  2 on the Champion beside it; the second Mammoth's blow shattered the
  Chilled Champion and swept a Fighter. Then the advance, which is forced,
  left both in front of the line and a Catapult and two Knights killed them
  (8 and 12; 11, 3, and 5).
- Against Martians it is the wrong unit: Attack 2.5 into a Force Field (1
  HP and the Shield's 4), and two Grunts' shots (4 and 5, then 7) killed it
  in two rounds.

**(iv) Chill, then Shatter comes off, and the counter exists.**

- By hand: a Bolas on a promoted Bomb Chucker of 13 HP, a Yeti's 6, and a
  5-HP Yeti's blow with 7 left (`b`, round 14); a Bolas on a Skeleton at 8
  HP and one Yeti's blow (`c`, round 8); a Cold Snap, a Boulder Yeti's 4,
  and a Mammoth's blow with 9 left on a Champion (lab, with Brittle). No
  shattered unit strikes back, and a shattered Bomb Chucker does not
  blast.
- The preview that sells it: a Yeti's blow on a Chilled Bomb Chucker,
  Banshee, Grunt, Ray Gunner, or Spitter at full HP reads "deals 8
  SHATTERS / takes 0" (the blow's 5 or 6 leaves the unit in the window),
  where the same blow on the unit not Chilled leaves it standing.
- The AI: the older policy threw nine Bolas in `a` and two Shatters
  followed. After the change it shattered 13 units in the 25 rounds of a
  diagnostic match against the Human AI (30 Bolas, one Cold Snap, 17 Cold
  Blood shots), and none in the 15 rounds of `a2` against a hand player
  (eight Bolas, three Rockfalls).
- That is the counter, and it is cheap: a 12-HP Fighter a Yeti hits for 5
  is at 7, outside the window (1 to 3 HP after the blow, 4 with Brittle);
  wounded units were pulled back or stood two to a tile-front; and the
  Sleds that carry the Bolas have 10 HP and Defense 1 (a Fighter's 6 and a
  Raider's 4: five of them died in `a2`). A Chilled unit moves or acts, so
  it does not also retreat and strike. Packs of 6-HP units are never in
  the window at all: they die outright.

**(v) No one best unit. Every land branch was worth its price in some
game; the frozen sea was not played to a landing; Coins are not short,
unit slots are.**

- The Snow Hunter is the best unit per Coin against anything that walks (it
  never advances into the next enemy), and it has 8 HP: a Knight, a
  Champion, an Ogre, a Wight, a Shock Trooper, and a Ray Gunner from two
  tiles each kill it in one blow. The Yeti takes the villages and holds a
  Mountain (Rockfall: 3 from two tiles, three times in `a2`). The Sled is
  the Chill. The Ox holds a center. The Boulder Yeti's planted throw dealt
  10 to a Knight in the lab; the Sabretooth died there before it struck.
- Leadership (the Ice Witch) was bought in round 18 of `b` and decided
  nothing; in the lab her Cold Snap began the Shatter of round 4 and the
  kill of a Knight in round 5.
- **Freeze.** In the two water labs a Yeti with Rime freezes the tile in
  front of it and steps on: one tile of unexplored Shallow Water a turn.
  Deep Water needs Pack Ice (11 Coins on three cities). Neither lab was
  played to a landing, so nothing here says the naval branch is worth its
  price, and **the Normal AI never Freezes**
  ([section 7](#7-what-is-left)).
- Coins: in `b` 15 to 28 lay unspent from round 16 with every unit slot
  full, and income stood at 8 to 9 from round 9 in both `b` and `c`. In
  Forest land nothing grows a city without Forestry. The attrition did the
  spending (15 units lost in `b`), as the ruling wants; the bottleneck is
  the level of the cities.

**(vi) Snow and Glide are strong at home and weak, not helpless, abroad.
Left as they are.**

- At home: the first strike after a Glide; a Raider stopped by Deep
  Winter's ring next to a center; a Marksman's shot halved through the
  Blizzard (3). As the Humans in `a2` I attacked onto Snow all the same:
  two Yetis and a Sled killed there in rounds 14 and 15 for a Fighter and
  two Raiders.
- Abroad: a 7-HP Sled on the emptied Goblin center took 7 from one bomb
  (Defense 1 off the Snow) and died; the Ox off its Snow moves one tile;
  the capital in `b` was emptied twice and not taken.
- "Abroad" is only enemy land. A captured village's land is Snow from the
  turn it is taken, so the home moves with the cities, and the Ice Folk
  expand as fast as anyone with the Sled ([section 4](#4-the-rule-that-changed)).

## 4. The rule that changed

**An Ice Folk city's level-2 Survey grants a free Sled** (Scouts), placed
and homed like any reward unit, without Scouting, in one of the city's
unit slots.

- Five of the eight factions had it; the Ice Folk Survey was the survey
  alone. In `b` level 2 came three times and Stockpile's 4 Coins were taken
  three times: revealing the area is not worth 4 Coins, so the choice was
  no choice. Scouting (5 Coins) was the second purchase instead, for a
  Sled of 3.
- A seat under the army rules takes Scouts at level 2 for the unit. With
  the gate alone, before this rule, an Ice Folk AI seat on seed 9 held two
  cities and seven units in round 25 against eight and twenty-five; with
  the Sled, six and twenty-two against four and seven on the same seed.
- By hand with it: five cities in round 8 of `c` and five in round 10 of
  `f`, against four in round 9 of `b` on the map of `f`. Marksmanship came
  in round 7 of `f` (round 12 of `b`).
- It costs a slot: the capital of level 2 was full in round 4 of `f` and
  trained nothing (the reward's text says "(uses a unit slot)", as
  for a Saucer and a Raptor). And the tile is not chosen: the second Sled
  of `f` appeared beside two Goblins and died the same round (Gang Up: 8
  and 2).
- Nothing else was needed: no unit was too strong or too weak for its
  price in six games.

## 5. The Ice Folk Normal AI

The policy is described in
[Normal AI, step two of the Ice Folk pass](../architecture/NORMAL_AI.md#step-two-of-the-ice-folk-pass-pulp_wars-w4927).
In short:

1. **The gate.** An Ice Folk seat is an army faction
   (`ARMY_PLAY_FACTIONS_V7`).
2. **The order of units:** the Sled, the Snow Hunter, the Musk Ox (and
   Deep Winter), the Ice Witch, the Mammoth, the Boulder Yeti, the
   Sabretooth; Brittle first of the late technologies.
3. **The shares:** 40% line, 15% defenders, 20% ranged, 15% siege (the
   Boulder Yeti, which fights as a ranged unit), 10% breakthrough; one Sled
   for four units, three at most.
4. **Bodies first:** it trains before it researches while it fields fewer
   capturers than its cities and two more, and takes Scouts at level 2.
5. **The Musk Ox is a garrison:** one a city and a third of the army at
   most; a threatened city's garrison yields to a Snow Hunter as a Human
   one does to a Marksman.
6. **What it counts for its own blows:** Cold Blood, Planted (not from a
   tile the Boulder Yeti has yet to move to), Rockfall from a Mountain, and
   Shatter.
7. **Chill, then Shatter:** a combined kill may begin with a Bolas (from
   where the Sled or the Snow Hunter stands, or after its Move), the shots
   from two tiles come next, and the adjacent blow that shatters comes
   last; that blow is no candidate while the Bolas is to come.
8. **Shooters out of reach:** a Snow Hunter or a Boulder Yeti makes no Move
   into an unscreened melee unit's reach or onto a tile it dies on, unless
   it kills; shooters and the Witch stay out of a chaining unit's reach
   (the Knight's ride in the lab); units under 15 HP at their maximum do
   not stand side by side there, and the Ox and the Mammoth beside them
   have an escort's value.
9. **Contact with company:** a Yeti or a Sled does not walk up beside an
   enemy where it would die unless another of its units is there or comes.

**Before and after, on seed 9** (`a` and `a2`, the same opening by the
hand player through round 5):

| The Ice Folk AI seat      | Before (`a`)                       | After (`a2`)                                        |
| ------------------------- | ---------------------------------- | --------------------------------------------------- |
| Cities, levels (round 15) | 4, all of level 2                  | 4, all of level 3                                   |
| Income (round 15)         | 9                                  | 13                                                  |
| Units (round 15)          | 10: Yetis, Sleds, 3 Musk Oxen      | 15: 7 Yetis, 4 Sleds, 4 Snow Hunters                |
| Technologies              | Gathering, Scouting, Crafting,     | Gathering, Scouting, Farming, Hunting, Marksmanship |
|                           | Hunting, Deep Winter (round 12)    | (round 12), Crafting                                |
| Attacks, kills, lost      | 18, 6, 11                          | 16, 6, 8                                            |
| Its kills                 | one unit at a time                 | five of six by two or three units on one target     |
| Lone units into contact   | rounds 9 and 10, dead a turn later | one (round 7, a Yeti with a wounded Sled behind it) |

The kills of `a2`: a Sled's 6 and a Yeti's 6 on a Raider (round 6); a
Yeti's 6 and a Sled's 6 on a Raider, and a Rockfall's 3, a Yeti's 5, and a
Sled's 4 on a Fighter in the same turn (round 11); a Yeti's 5 and a Sled's 4
on the Fighter that had advanced onto its Snow (round 14); a Snow Hunter's
6 on a wounded Raider, and a Yeti's 5, a Bolas, and a second Yeti's 4 on
another (round 15). In round 12 all four of its Yetis in the open stepped
back onto their Snow instead of standing in reach of nine units.

It also took a fifth city (round 9) with a Sled alone beside two Fighters
and lost the Sled and the city in two turns: the capture rule is every
seat's, and is left.

**Diagnostic matches** (eight, AI against AI, for errors, stalls, and what
a seat does; never a balance measurement). Seed 9, Human against Ice Folk,
25 rounds: on main (both seats on the older policy) the Ice Folk seat
eliminated the Human seat by round 25; with the gate alone it held two
cities; with the Survey Sled and the Shatter rules six cities and 22 units
against four and seven; with the final policy nine cities and 21 units
against two and one (30 kills for 22 lost, 13 Shatters, Mammoths in round
22, four Mammoths). The lab, AI against AI, three times: 24, 29, and 22
kills for 44, 40, and 37 lost, the Human AI ahead each time. Four seats on
Dry Land 16, seed 14, 20 rounds: the Ice Folk seat was the smallest (four
cities, five units, 11 kills for 23 lost) beside a Martian seat with 31
kills, as the hand player was in `c`. No error and no stall in any.

## 6. The lab

`LAB_ICE_FOLK_MID` (revision 1, hidden; `scripts/play-text lab --session
S.json LAB_ICE_FOLK_MID`): **you play the Ice Folk** against the Human AI
on the land and against the Human side of `LAB_DINOSAUR_MID`. Thirteen
technologies (Deep Winter, Engineering, and Mammoths among them), 35 Coins
on the first turn, three free unit slots, and 16 units: 5 Yetis, 2 Sleds, 2 Snow Hunters, 2 Musk
Oxen, an Ice Witch, 2 Mammoths, a Boulder Yeti, and a Sabretooth (64
Coins) against the Humans' 17 (80 Coins).

## 7. What is left

- **The Normal AI never Freezes.** An Ice Folk seat has no ships and no
  ice-bridge plan: on a water map it stays on its landmass. It needs a
  plan of its own (a target across Shallow Water, the Yetis that freeze a
  lane, the units that follow), which this bead did not start.
- **The Mammoth is not reached** before round 22 by the AI in a generated
  match, so its Sweep and the Sabretooth's Prowl are played by the general
  army rules only (no rule of their own was written or tested in play).
- **The AI throws a Bolas with no blow behind it** (eight in `a2`). It
  costs the Sled nothing and makes the target sluggish for a turn, so it
  was left; it is not the Shatter plan.
- **In the lab the AI loses to the Human AI** (three matches). Its
  research there was not looked at.

## 8. Open, for the user

1. **The Mammoth's place.** Round 17 by the straight route. If it should
   be seen in a 20-round game, the lever inside the rulings is its
   technology's place, not its numbers.
2. **The forced advance and a faction of 9-HP units.** Seven of the 18
   units lost in `b` and `f` died on the tile their own kill took them to.
   The ruling stands; the Snow Hunter is the faction's answer, and a
   player has to learn it.
3. **The Survey Sled's tile** is not chosen (as for every reward unit). In
   `f` it appeared beside two Goblins.
4. **The frozen sea** was not judged ([section 3](#3-the-questions), (v)).
5. **Shatter against a hand player** did not come off in `a2`. If it
   should be the thing a player fears, Brittle (the window at 4) is the
   lever, and it is the last technology of its branch.

## 9. For the Dwarf pass

- Dwarf and Candy seats still play the older policy, and every seat of a
  match with one does. The first reading of a Dwarf AI game is against
  that policy; the gate is one line (`ARMY_PLAY_FACTIONS_V7`), and the
  tests that list "a seat outside the army policy" then need a new
  example (they use Dwarf and Candy now).
- A unit that does not strike after it moves (the Musk Ox here, a dug-in
  Hammerer there) is a garrison under the army rules: cap it, and let the
  garrison of a threatened city yield to a ranged unit.
- A reward unit takes a unit slot: say so in the reward's text
  (`app-view-v7.ts`) if a Dwarf Survey gets a Gyrocopter.
- The projection reads a unit's published Attack. Planted is in the
  published number and is lost by a Move; anything a Dwarf unit gains by
  standing still (Dig In) is the same case.
- A step that changes a rule moves the identity: 77 files name it. The
  pins that moved here are listed in [section 10](#10-tests).
- The siege corridor rules of `src/ai/v7-dwarf.ts` already count their own
  form tests in the audit; a new reader in `src/ai/v7.ts` must be
  classified in both fixtures.

## 10. Tests

`tests/unit/ruleset-v7-ice-folk-step2.test.ts`: the identity (7r59, 7r58
prior, the save keys); the Survey Sled, granted without Scouting beside
the center; the gate, on against each of the other five and off with a
Dwarf or a Candy seat; the order, technology by technology; bodies first;
the shares, the Sled count, and the sturdy units; the Musk Ox cap and the
garrison of a threatened center; Shatter in the estimate at 7 to 10 HP
with and without Brittle, and Planted for a Boulder Yeti that stays and
not for one that moves, each equal to the engine's preview; the Bolas
before the blow that shatters, with that blow no candidate while the
Bolas is to come, and no wait where no Shatter follows; a lone Snow
Hunter that does not walk into a Fighter's reach, and its shot that
kills; the lab.

**Tests that moved.** The identity in every test that names it, and the
places of older identities in the prior list. The army factions and "off
with another faction" (`ruleset-v7-dinosaur-pass`,
`ruleset-v7-martian-pass`, `ruleset-v7-tuning-5`, `ruleset-v7-tuning-6`,
`ruleset-v7-industry-reshuffle`, whose seats outside the army policy are
Dwarf and Candy now). The Survey table in four pass tests. Three tests of
`ruleset-v7-ice-folk-ai` keep their exact value against a Dwarf seat and
state the order of the army rules against a Human one. The labs
(`ruleset-v7-tuning-4`, `ruleset-v7-missions` with two new digests,
`tests/scripts/play-text-v7`). The source audits: six more land-form tests
in `src/ai/v7.ts` (`ruleset-v7-dinosaur-form-audit`), and three readers
classified (`tests/fixtures/v7-unit-reader-classes.ts`,
`tests/fixtures/v7-kind-reader-classes.ts`). The Continents pin of
`ruleset-v7-curiosities.test.ts`, the one whose Ice Folk seat takes a
Survey (17 rounds, 18 before; the commands and the events; the map and
the PRNG are unchanged; the other four pins did not move). The seed of
the Normal AI match of `ruleset-v7-mind-control.test.ts` (36, 26 before:
Martian against Ice Folk, both under the army rules now).
