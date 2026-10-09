# Ruleset 7: step two of the Dwarf pass

**Status:** implemented on `pulp-wars-poc-7r59` (bead `pulp_wars-w49.28`);
no rule changed and the identity is unchanged. The rules themselves are
stated in [Ruleset 7: current rules](RULESET_7_CURRENT.md) (the Dwarves in
its [section 22](RULESET_7_CURRENT.md#22-dwarf-faction-rules)); the
faction's specification and its first balance pass are
[the Dwarf overlay](RULESET_7_DWARVES.md) and
[the Dwarf balance report](../validation/RULESET_7_DWARF_BALANCE.md). This
document is the reasoning and the record of the hand-played pass, in the
shape of [step two of the Ice Folk pass](RULESET_7_TUNING_ICE_FOLK.md).

## 1. What changed

Step two is "iterate on each faction including playing games manually to
rejig the balance better and improve the AI for each faction". The Dwarves
had no faction pass before it: their seat of the Normal AI played the
older policy, and so did every seat of a match with one.

- **No rule and no number changed.** Every unit, price, technology, and
  reward is as it was; the identity stays `pulp-wars-poc-7r59`
  ([section 4](#4-no-rule-changed)).
- **A Dwarf seat of the Normal AI plays the army rules** in a match whose
  every seat is Human, Undead, Goblin, Martian, Dinosaur, Ice Folk, or
  Dwarf, and so do the other seats of that match
  ([section 5](#5-the-dwarf-normal-ai)). Only a match with a Candy seat
  keeps the older policy for every seat.
- A lab for the hand player, `LAB_DWARF_MID` ([section 6](#6-the-lab)).
- **The text harness shows mounds.** A burrowed Steam Mole and its rider
  are public, but `view` printed nothing for another seat's mound: the map
  cell now ends `<seat>##` on a mound tile, a `MOUNDS` list under the
  visible units names each one (`erupts for 2 on the 8 tiles around it`, or
  `rider of uN`), and an own burrowed unit's line says `BURROWED`
  ([text-mode play](../validation/TEXT_PLAY.md#dwarf-seats)).

The bar was the user's: "the faction is not crazy op or crazy weak and
that all the tech branches are useful and that units are differentiated
from other factions by more than stats".

## 2. The games

All in text mode against the Normal AI, on Dry Land.

| Game  | Played as | Against                | Map         | Route                                                                                                        | Result                                                                                                    |
| ----- | --------- | ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `a`   | Human     | Dwarf (before)         | 14, seed 9  | Hunting 1, Scouting 6, Gathering 9, Marksmanship 13, Forestry 16, Sawmilling 18                              | stopped after round 19: 7 cities and 17 units against 4 and 12; 5 kills for 2 lost                        |
| `b`   | Dwarf     | Goblin (older policy)  | 14, seed 19 | Hunting 1, Crafting 2, Dig In 5, Gyrocopters 7, Clockwork 9, Mining 15                                       | stopped after round 15, ahead: the Goblin capital taken in round 16; 4 cities and 9 units against 1 and 2 |
| `a2`  | Human     | Dwarf (first draft)    | 14, seed 9  | the route of `a` to round 9, then Marksmanship 12, Crafting 15                                               | stopped after round 15, behind: 5 cities and 7 units against 5 and 12; 7 kills for 9 lost                 |
| `f`   | Dwarf     | Goblin (army policy)   | 14, seed 19 | the route of `b` to round 7, then Clockwork 10, Forestry 12                                                  | stopped after round 15, behind: 2 cities and 7 units against 5 and 10; 4 kills for 4 lost                 |
| `lab` | Dwarf     | Human                  | the lab     | `LAB_DWARF_MID`, six rounds: Blasting Charges, two tunnels, a Tank, two Whirligigs                           | 4 kills for 14 lost; one Knight killed five units in a ride                                               |
| `c`   | Dwarf     | Martian, Undead, Human | 16, seed 14 | Gathering 1, Crafting 2, Mining 5, Dig In 11                                                                 | stopped after round 11, behind: 2 cities and 5 units (two cities lost)                                    |
| `a3`  | Human     | Dwarf (after)          | 14, seed 9  | the route of `a` to round 5, then four Fighters in round 6, Marksmanship 8, Crafting 11                      | stopped after round 12, even: 6 cities and 14 units against 4 and 14; 3 kills for 3 lost                  |
| `g`   | Dwarf     | Human                  | 14, seed 9  | Hunting 1, Gyrocopters 3, Crafting 7, Dig In 8, Clockwork 13, Gathering 14, Blasting Charges 17, Forestry 19 | stopped after round 21, even: 6 cities and 16 units against 5 and 19; 11 kills for 9 lost                 |

The numbers after a technology are the rounds it was bought in. "Before"
is the older policy; "first draft" the gate with the order, the shares,
and bodies first ([section 5](#5-the-dwarf-normal-ai), points 1 to 4);
"after" the final policy. In `b` both seats played the older policy (a
match with a Dwarf seat did), in `f`, `c`, and `g` the army policy. `g`
is the confirmation game, played after the policy was final and with the
lesson of `f` and `c`: units before technologies.

**The maps.** The seeds of the earlier passes: on Dry Land 14, seeds 9 and
19 have no chest within three tiles of either capital; on seed 19 the
Dwarf capital stands in Forest with Mountains behind it and the Goblin
capital three tiles from the first village the Dwarves take. On Dry Land 16
with four seats, seed 14 puts the Dwarves in a corner between the three
others, with two Ore Mountains in the capital's land.

What each seat held at the end of its turn (Coins, income, cities, units;
lost and killed are totals):

| Round | `a` Human     | `a` Dwarf AI | `a2` Human | `a2` Dwarf AI | `a3` Human   | `a3` Dwarf AI | `b` Dwarf  | `f` Dwarf  | `f` Goblin AI | `c` Dwarf  | `g` Dwarf     | `g` Human AI |
| ----- | ------------- | ------------ | ---------- | ------------- | ------------ | ------------- | ---------- | ---------- | ------------- | ---------- | ------------- | ------------ |
| 3     | 2, 3, 1, 3    | 0, 3, 1, 3   | 2, 3, 1, 3 | 5, 3, 1, 3    | 2, 3, 1, 3   | 5, 3, 1, 3    | 1, 3, 1, 3 | 1, 3, 1, 3 | 3, 3, 1, 4    | 1, 3, 1, 3 | 1, 3, 1, 3    | 0, 3, 1, 3   |
| 6     | 1, 6, 4, 4    | 0, 6, 3, 4   | 1, 6, 4, 4 | 0, 9, 4, 4    | 1, 6, 4, 8   | 0, 9, 4, 4    | 2, 5, 2, 4 | 2, 5, 2, 4 | 4, 5, 2, 5    | 2, 6, 3, 4 | 3, 5, 3, 7    | 1, 9, 4, 5   |
| 9     | 1, 8, 6, 8    | 4, 9, 4, 8   | 1, 8, 6, 7 | 1, 10, 4, 11  | 0, 8, 6, 10  | 1, 12, 4, 9   | 1, 6, 3, 6 | 7, 6, 3, 5 | 1, 5, 2, 8    | 2, 5, 4, 4 | 1, 8, 6, 8    | 5, 9, 4, 8   |
| 12    | 13, 12, 7, 13 | 3, 9, 4, 10  | 0, 9, 6, 8 | 6, 10, 4, 12  | 6, 10, 6, 14 | 1, 12, 4, 14  | 3, 7, 3, 7 | 1, 4, 2, 5 | 0, 8, 3, 11   |            | 11, 11, 6, 16 | 3, 10, 4, 12 |
| 15    | 16, 12, 7, 17 | 2, 9, 4, 9   | 6, 8, 5, 7 | 2, 11, 5, 12  |              |               | 5, 9, 3, 9 | 3, 6, 2, 7 | 0, 13, 5, 10  |            | 10, 14, 7, 17 | 2, 8, 3, 12  |
| 18    |               |              |            |               |              |               |            |            |               |            | 13, 14, 7, 17 | 1, 12, 4, 13 |
| 21    |               |              |            |               |              |               |            |            |               |            | 16, 14, 6, 16 | 4, 17, 5, 19 |

In `c` (round 9) the other seats held: Martian 2 cities and 7 units,
Undead 5 and 7, Human 5 and 10.

## 3. The questions

**(i) Neither crazy strong nor crazy weak. The Dwarf AI is as good as the
hand player's opening lets it be; the hand-played Dwarves lose when they
build an economy before an army.**

- The Dwarf AI before the change held four cities of level 2 for fifteen
  rounds on an income of 9 (`a`) and made ten attacks in nineteen rounds.
  After it, on the same seed, it held eleven Hammerers in round 9 and
  killed a unit of mine nearly every turn with two or three blows on one
  target (`a2`). Against a hand player who trained four Fighters in round 6
  and bought Marksmanship before his fifth village (`a3`) it was even: three
  kills for three lost in twelve rounds, fourteen units each.
- As the Dwarves I won one game in four and drew one. Against the older Goblin policy
  (`b`, income 5 for ten rounds) the Gunners and a tunnel took the Goblin
  capital in round 16. Against the army policy (`f`) the same opening lost
  its second city in round 10; in the four-seat game (`c`) I had four
  Hammerers in round 9 against the Human seat's ten and lost two cities.
  In both I bought five technologies or two Mines before a fifth unit, and
  walked single Hammerers into reach. That is the player's error, not the
  faction's: the AI seat of the same faction, which trains first, held its
  own against the same Human opening.
- The confirmation game (`g`, the Dwarves against the Human AI on seed 9,
  units before technologies) was even after 21 rounds. Hammerers walking to
  villages gave six cities in round 9 (the Human AI four), and the Dwarves
  won the first war: a tunnel beside the Human city, its eruption, and the
  Mole's kill took that city in round 15 (eleven kills by round 21). Then
  the Human AI's Marksmen and Guards, out of my sight, killed every
  Hammerer that a kill had carried forward and the Mole on the captured
  center (a Guard's 3, a Marksman's 5, a Fighter's 3), and took the city
  back in round 20: 6 cities, 16 units, and an income of 14 against 5,
  19, and 17. The Dwarves are slow to grow: a city of level 1 has two
  unit slots and the Hammerers that take the villages fill them, so the
  Human cities reached level 3 first.

**(ii) Dig In is the faction: a Hammerer that stands still beside its
center is a Guard that strikes.**

- A Fighter that strikes a dug-in Hammerer deals 4 and takes 5 or more;
  with Forestry a dug-in Hammerer in Forest has Defense 4.5 (`f`). The
  Dwarf AI's front of dug-in Hammerers and Moles at its city in `a` cost
  me a Fighter for every 2 HP I dealt with melee units; only Marksmen (4
  a shot, 1 to 3 on a dug-in Mole) chipped it, and the AI's wounded units
  recovered 4 a turn behind it.
- It is beaten by numbers: two Goblins with Gang Up 2 (Attack 3.5) killed
  my dug-in Hammerer on a center (`f`, round 9), and a Catapult and two
  Marksmen killed two in the lab. And it ends when the unit moves: an
  advance after a kill sets the flag.

**(iii) The Steam Mole's tunnel works once a fight: a visible eruption the
enemy walks out of, or a trade.**

- Eruptions: 2 on a Wolf Rider and a Goblin, and the Mole's kill carried
  it onto the Goblin capital that it captured the next turn (`b`); 3 on four
  Human units at once with Blasting Charges (12 HP in the lab); none in
  `a`, where I stepped out of the ring each time (the `MOUNDS` list tells
  the hand player where).
- The surfaced Mole abroad is not dug in, and it died the turn after its
  eruption in the lab (a Marksman's 4 and a Champion's 8). In `g` the
  tunnel carried a Mole and its rider three tiles to the front in one turn
  (twice), an eruption of 2 hit the Fighter on the Human city and a
  Marksman, the Mole's kill carried it onto the center it captured, and an
  eruption of 3 (Blasting Charges) killed a wounded Fighter beside another
  Human city. Its rider is
  braked on a foreign center: in `b` the Hammerer that rode could not
  advance onto the Goblin capital, the Mole could.
- The AI tunnelled with a rider beside my city in `a2` (an eruption of 2
  on a Fighter) and next to my units in `a` (they had stepped away).

**(iv) Every branch was worth its price in some game.**

- **Industry** (Crafting, Dig In, Mining, Steam Tanks, Blasting Charges):
  the faction's core (ii, iii). Mining put two Mines on the capital's Ore
  Mountains by round 8 of `c` (the capital at level 3). The Steam Tank's
  Plated cap made it the unit that took four hits to kill in the lab (two
  Catapults, a Champion, and a Knight: 4 each).
- **Wilds** (Hunting, Clockwork, Forestry, Steam Cannons): the Clockwork
  Gunner is the best Dwarf unit for its 3 Coins against small units: two
  shots from two tiles (5 and 1) killed a 6-HP Goblin a turn without an
  answer (`b`, `f`), and it never advances onto the dead unit's tile. Its
  weakness is that it never heals by itself (only an Engineer repairs it):
  a Wolf Rider killed a Gunner worn to 8 HP by Bomb Chuckers' answers. The
  Steam Cannon dealt 10 to a Fighter and knocked it back (the lab), and
  died to the first Knight that reached it.
- **Mobility** (Gyrocopters, Dive Bombing, Whirligigs): the Gyrocopter is
  the eyes (Move 3, sight 2) and the bomb that is never answered: a Dive
  bomb of 6 and a Whirligig's 9 killed a promoted Knight on my capital (the
  lab), and a bomb of 5 and a Gunner's 3 a Bomb Chucker (`f`). It has 8 HP
  and Defense 1, and the landing beside the target is in its reach: of
  five Gyrocopters I flew, four died to the next enemy turn (in `g` after
  a chest, two bombs, and a kill). The
  Whirligig, Attack 3 at full strength, dealt 10 to Knights (Defense 1) and
  8 to a Champion; a Knight's single blow kills it (12 HP, Defense 1.5), so
  it is the Dwarf answer to Knights only when it strikes first.
- **Settlement** (Gathering, Leadership, Farming, Steam Pumps, Land Grants):
  the Engineer is Repair (4 HP a machine, the only healing of a Gunner, a
  Whirligig, or a Titan) and Assemble; it died in the lab's first Knight
  ride before it did either.

**(v) Units differ by more than stats.** Dig In (a defender that strikes),
the tunnel with a rider and the visible eruption, the bomb that is never
answered and lands beside its target, two shots that never advance, Repair
and Assemble, Knockback, Plated, three blows on three units: no Dwarf unit
is another faction's with other numbers.

**(vi) The Survey is a dead choice for the Dwarves, as it was for the Ice
Folk.** At level 2 a Dwarf city reveals the area or takes 4 Coins; I took
the Coins thirteen times in four games. Six factions' Survey grants a free
unit that moves two tiles and (but for the Ice Folk Sled's terrain limits)
takes villages; the Dwarf one would grant a Gyrocopter (the treasure unit),
which takes no village. Left as it is; open for the user
([section 8](#8-open-for-the-user)).

## 4. No rule changed

The rule to change would have been the Survey (vi), and play did not show
the faction crazy weak: the Dwarf AI, which trains first and takes the 4
Coins, held its own against the Human opening that beat the older policy,
the Dwarf games I lost I lost to my own opening, and with units first
the hand-played Dwarves were even with the Human AI after 21 rounds
(`g`). A free Gyrocopter
would not take the villages the Ice Folk Sled took for its seat (five
cities in round 8 of its `c`); it would scout and bomb, and it costs the
city a unit slot. No unit was crazy strong or weak for its price in eight
games, and every branch was used. So the identity stays `7r59`; the only
pins that moved are those of AI play (section 10).

## 5. The Dwarf Normal AI

The policy is described in
[Normal AI, step two of the Dwarf pass](../architecture/NORMAL_AI.md#step-two-of-the-dwarf-pass-pulp_wars-w4928).
In short:

1. **The gate.** A Dwarf seat is an army faction (`ARMY_PLAY_FACTIONS_V7`);
   only a Candy seat is not. The Dwarf rules of the older policy that are
   not about research or production (the tunnels, the bombs, Assemble,
   Repair, the Gunner's two shots, the Dig In hold, the Cannon's Knockback,
   and every seat's estimates of Dwarf units) apply under both.
2. **The order of units:** the Steam Mole (and Dig In), the Clockwork
   Gunner, the Gyrocopter, the Engineer, the Steam Tank, the Steam Cannon,
   the Whirligig; Blasting Charges first of the late technologies.
3. **The shares:** 40% line (Hammerers and Steam Tanks), 15% Steam Moles,
   25% Gunners, 10% Steam Cannons, 10% Whirligigs (20% against two or more
   hostile ranged, siege, or support units); one Gyrocopter for five
   units, two at most; the Engineers as every army's support units.
4. **Bodies first:** it trains before it researches while it fields fewer
   capturers than its cities and two more (a Gyrocopter, an Engineer, a
   Cannon, a Tank, and a Whirligig take no village; a burrowed Mole and its
   rider count), and takes the 4 Coins at level 2 (its Survey grants no
   unit). The garrison of a threatened city yields to a Gunner as a Human
   one does to a Marksman.
5. **Weak links and escorts:** a Dwarf unit of less than 15 HP at its
   maximum is a weak link of a Knight's chain at any HP; the Steam Mole's
   and the Steam Tank's Moves beside them have an escort's value.
6. **The Gunner out of reach:** a Clockwork Gunner makes no Move, whatever
   offers it, into an unscreened melee unit's reach or onto a tile it dies
   on, unless its shot kills; it and the Engineer stay out of a chaining
   unit's reach (the Ice Folk shooters' rule).

**Before and after, on seed 9** (`a`, `a2`, and `a3`; the hand player's
opening is the same to round 5):

| The Dwarf AI seat         | Before (`a`)                                                        | First draft (`a2`)                                                                       | After (`a3`)                                                    |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Cities, levels (round 12) | 4, all of level 2                                                   | 4, levels 3, 2, 3, 1                                                                     | 4, levels 3, 3, 3, 2                                            |
| Income (round 12)         | 9                                                                   | 10                                                                                       | 12                                                              |
| Units (round 12)          | 10: 7 Hammerers, 3 Moles                                            | 12: 11 Hammerers, a Mole                                                                 | 14: 9 Hammerers, 5 Moles                                        |
| Technologies (round 12)   | Gathering, Crafting, Gyrocopters, Dig In, Hunting                   | Gathering, Farming, Crafting, Dig In, Hunting                                            | Gathering, Farming, Crafting, Dig In, Hunting                   |
| Attacks, kills, lost      | 10, 2, 5 (19 rounds)                                                | 23, 9, 7 (15 rounds)                                                                     | 8, 3, 3 (12 rounds)                                             |
| Its kills                 | a Raider by a Mole; a Fighter by two Moles and a Gunner's two shots | a Raider by two Hammerers, Fighters by two or three, a Marksman by a Mole and a Hammerer | a Fighter by a Mole and a Hammerer; a Marksman by two Hammerers |

The older policy bought Gyrocopters in round 6 and trained none; after
the change a Gyrocopter comes with the fifth unit, and the Gunners in
round 13 (`a2`).

**Diagnostic matches** (AI against AI, for errors, stalls, and what a seat
does; never a balance measurement). Seed 9, Human against Dwarf, 25
rounds: on main (both seats on the older policy) the Dwarf seat held four
cities of level 2 and nine units against eight cities; with the first
draft seven cities and 24 units against three (and in 34 rounds it
eliminated the Human seat); with the final policy six cities and 24 units
against three (10 tunnels, a bomb, an Assemble). The lab, AI against AI,
twelve rounds: 29 kills for 32 lost with the final policy, 29 for 39 with
the weak-link, escort, and Gunner rules switched off (the Human AI's
Knights killed ten Dwarf units in its fourth turn then, four now). No
error and no stall in any.

## 6. The lab

`LAB_DWARF_MID` (revision 1, hidden; `scripts/play-text lab --session
S.json LAB_DWARF_MID`): **you play the Dwarves** against the Human AI on
the land and against the Human side of `LAB_ICE_FOLK_MID`. Thirteen
technologies (Dig In, Clockwork, Dive Bombing, Mining, Steam Tanks, Steam
Cannons, and Whirligigs among them; not Blasting Charges), 35 Coins on the
first turn, three free unit slots, and 16 units: 5 Hammerers, 2
Gyrocopters, 2 Clockwork Gunners, 2 Steam Moles, an Engineer, 2 Steam
Tanks, a Steam Cannon, and a Whirligig (74 Coins) against the Humans' 17
(80 Coins).

## 7. What is left

- **The Gyrocopter rarely bombs in a war.** Its landing threat (8 or more
  is refused unless the bomb kills a Catapult or a Captain) is met beside
  every target in a front, so a Dwarf seat bombed once or twice in 25
  rounds of each diagnostic match; it scouts. The hand player's bombs
  ended the same way (three Gyrocopters lost for three bombs).
- **The Engineer Assembles rarely** (one or two Assembles in 25 rounds): a
  Dwarf army seat fills its home city's slots by training, and Assemble
  needs one free.
- **The Brass Titan, the Whirligig, and the Steam Tank** are played by the
  general army rules only; no rule of their own was written or tested in
  play.
- **The Candy seat** still plays the older policy, and every seat of a
  match with one does.

## 8. Open, for the user

1. **The Dwarf Survey.** It reveals the area or gives 4 Coins; the Coins
   were taken every time. The lever is the reward (a free Gyrocopter, the
   faction's treasure unit, would scout and bomb but take no village), not
   the faction's numbers.
2. **The forced advance and the Hammerer.** A Hammerer's or a Mole's
   advance after a kill sets its moved flag: the kill that carries it off
   its center's ring ends its Dig In. Three of my Hammerers died on the
   Goblin capital their kills had carried them to (`b`). The ruling
   stands; the Gunner, which never advances, is the faction's answer.
3. **The Knight against the Dwarves.** One Knight killed five Dwarf units
   in a ride in the lab and was promoted, so the eruption that would have
   killed it found it at full HP. Only the Mole, the Tank, and a dug-in
   Hammerer stop the ride; a player has to learn to stand them in front.

## 9. For the Candy pass

- Candy seats still play the older policy, and every seat of a match with
  one does. The gate is one line (`ARMY_PLAY_FACTIONS_V7`); then no
  faction is outside it, and the tests that list "a seat outside the army
  policy" (they use Candy now: `ruleset-v7-dinosaur-pass`,
  `ruleset-v7-martian-pass`, `ruleset-v7-ice-folk-step2`,
  `ruleset-v7-ice-folk-ai`, `ruleset-v7-dwarf-ai`,
  `ruleset-v7-industry-reshuffle`, `ruleset-v7-dinosaur-ai`,
  `ruleset-v7-dinosaur-ai-against`, `ruleset-v7-revision20-ai`,
  `ruleset-v7-second-pass-ai`, `ruleset-v7-tuning-4`, and the income-cap
  match of `ruleset-v7-revision16-economy`) need another way to
  reach the older policy, or none.
- The older Dwarf research rule (`dwarfResearchV7`) is off for an army
  seat, as the Ice Folk one is; the Candy rules of the older policy split
  the same way (research and production under the army rules, the unit
  rules under both).
- A Candy Survey grants no unit either; the army rule of this pass (take
  the 4 Coins) is the Dwarf seat's only.

## 10. Tests

`tests/unit/ruleset-v7-dwarf-step2.test.ts`: the identity and the Survey
unchanged; the gate, on against each of the other six and a mirror and
off with a Candy seat; the order, technology by technology, and Blasting
Charges first at war; bodies first, counting only the units that capture;
the shares, the Gyrocopter count, and the sturdy units; the garrison that
yields to a Gunner; the 4 Coins at level 2; a lone Gunner that does not
walk into a Fighter's reach, and its two shots that kill from where it
stands; the lab.

**Tests that moved.** The army factions and "off with another faction"
(`ruleset-v7-dinosaur-pass`, `ruleset-v7-martian-pass`,
`ruleset-v7-tuning-5`, `ruleset-v7-tuning-6`, whose seats outside the army
policy are Candy now); the research orders of `ruleset-v7-tuning-6`; the
Fortification rule of the older policy (`ruleset-v7-industry-reshuffle`,
its Dwarf pairings now with a Candy seat); the income-preview match that
must reach both income caps (`ruleset-v7-revision16-economy`: no match of
seeds 0 to 12 against an army Dwarf seat has a Market at its cap, so it is
Humans against Candy, seed 8, again); the positions that read the older policy's
priorities through a Dwarf seat (`ruleset-v7-dinosaur-ai`,
`ruleset-v7-dinosaur-ai-against`, `ruleset-v7-revision20-ai`,
`ruleset-v7-second-pass-ai`, and `ruleset-v7-tuning-4`, whose other seat
is Candy now; the last also lists `LAB_DWARF_MID` among the labs); the
Ice Folk pass's gate and its "older policy" seats (`ruleset-v7-ice-folk-ai`,
`ruleset-v7-ice-folk-step2`, now with a Candy seat); the Steam Mole that
tunnels with a rider (`ruleset-v7-dwarf-ai`, whose board now holds a Candy
seat beside the Dwarves: an army Dwarf seat first takes the village that
test leaves on the way); the two curiosity matches with a Dwarf seat
(`ruleset-v7-curiosities`, Continents and Lakes: the commands and events
recomputed, the boards and final PRNG states unchanged); the labs
(`ruleset-v7-missions`, two digests for `LAB_DWARF_MID@1:DWARF`, and
`tests/scripts/play-text-v7`, with the mound on the map and the burrowed
unit's line); the source audits (one reader classified in
`tests/fixtures/v7-kind-reader-classes.ts`).
