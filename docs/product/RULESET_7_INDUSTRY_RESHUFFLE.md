# Ruleset 7: the Industry reshuffle

**Status:** implemented on `pulp-wars-poc-7r56` (bead `pulp_wars-w49.21`).
This is the record of a placement pass over the Industry branch of all
eight factions: what moved, the plain readings chosen where the ruling was
silent, what the Normal AI, the labs, and the missions needed, and the
questions left for hand play.
[The current rules](RULESET_7_CURRENT.md) hold the rules themselves.

**It is deliberately untuned.** No stat, cost, ability, price, or other
technology changed. No game was played by hand and nothing here is
balance evidence. The rules are tested
(`tests/unit/ruleset-v7-industry-reshuffle.test.ts`); the balance is not.

**The designer's ruling (2026-10-07), for every faction:**

1. The defender (the `GUARD` role) moves from the root of Industry to
   Fortification (tier 2), which keeps everything it has.
2. The Workshop moves from Engineering to the root. Its rule and its price
   are unchanged.
3. Mountain entry, the Mountain Sight, the Mine, and Redevelop stay at
   Engineering. Reveal Ore and the Spoils stay at the root.
4. Milling and the mills are not touched.
5. The root is shown as **Crafting** ("Garrison" at `7r55`). No
   technology ID changes.
6. The identity is `pulp-wars-poc-7r56`; `7r55` is a prior identity; the
   browser save key is `pulpWars.save.v7r56.current` and the `7r55` key is
   obsolete.

## 1. What moved

| Node (ID)                      | Tier | At `7r55`                                                           | At `7r56`                                             |
| ------------------------------ | ---: | ------------------------------------------------------------------- | ----------------------------------------------------- |
| the root (`DRILL`)             |    1 | reveal Ore; **the defender**; Spoils (2 Coins)                      | reveal Ore; **the Workshop**; Spoils (2 Coins)        |
| Engineering                    |    2 | Mountain entry; +1 Sight on Mountain; Mine; **Workshop**; Redevelop | Mountain entry; +1 Sight on Mountain; Mine; Redevelop |
| Fortification                  |    2 | the faction's own effect                                            | the faction's own effect; **the defender**            |
| Metallurgy (under Engineering) |    3 | the heavy line unit; the Forge                                      | unchanged                                             |

So the two sub-branches of Industry each lead to a unit: the root, then
Fortification, is the defender; the root, then Engineering, then
Metallurgy, is the heavy line unit. A defender is two technologies from
the start and no longer comes with the first technology a seat buys. With
one city the root costs 5 Coins and Fortification 7 (prices are by the
technologies owned and the cities, as before; the first technology of a
match is free).

The Workshop needs only the root: 4 Coins, one per city, on a tile of your
land next to one of your Farms, Lumber Camps, or Mines, paying 1 plus the
number of different kinds beside it. A Farm needs Farming, a Lumber Camp
Forestry, and a Mine Engineering, so the root alone builds no Workshop
until one of those stands.

## 2. The Industry branch of every faction

The root is shown as **Crafting** in every tree and gives the same three
things: reveal Ore, the Workshop, and the Spoils (2 Coins for the first
capture of each hostile city). Engineering is the same in every tree too
(the Dwarves show it as Mining).

| Faction   | Root shown as | Fortification shown as | Fortification gives                                                                                                     |
| --------- | ------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Humans    | Crafting      | Fortification          | **Guard**; Fighters and Guards build Field Defenses                                                                     |
| Undead    | Crafting      | Fortification          | **Zombie**; Skeletons and Zombies build Field Defenses                                                                  |
| Goblins   | Crafting      | Fortification          | **Orc Brute**; Orc Brutes build Field Defenses                                                                          |
| Dinosaurs | Crafting      | Nesting                | **Ankylosaurus Egg**; Eggs have +4 HP; +1 unit slot in every city                                                       |
| Martians  | Crafting      | Force Fields           | **Shield Projector**; Projectors raise the Shields of units next to them to 4; Shields recharge at the end of your turn |
| Ice Folk  | Crafting      | Deep Winter            | **Musk Ox**; Snow spreads two tiles from your city centers; Recover heals 6 in your territory                           |
| Dwarves   | Crafting      | Dig In                 | **Steam Mole**; Hammerers and Moles that stand still on or next to your city centers are dug in                         |
| Candy     | Crafting      | Home Sweet Home        | **Marshmallow**; Rushed units that end the turn on or next to your city centers don't Crash                             |

## 3. Plain readings chosen

Each of these is a reading of the ruling where it was silent. Any of them
can be overruled without touching the others.

1. **"Crafting" for every faction.** The root had one shared name and no
   faction name, and it keeps that shape.
2. **No Fortification node is renamed.** Each reads correctly with its
   defender in it: Force Fields with the Shield Projector and Nesting with
   the Ankylosaurus Egg most plainly; Deep Winter with the Musk Ox, Dig In
   with the Steam Mole (which is one of the two units it digs in), and
   Home Sweet Home with the Marshmallow less so, and well enough.
3. **The cards.** The root's picture is the Workshop (it showed the
   defender). Engineering's is the mined Mountain, the map picture of
   the Mine (it showed the Workshop). Fortification's pictures are unchanged, so no card shows a
   defender; the unit is named in the card's unlock list.
4. **A Workshop on a Mountain still needs Engineering.** Land units enter
   and build on Mountains with Engineering; the root does not give that.
5. **A unit that rises as a Zombie still rises without the technology.**
   A unit a Zombie bit or infected becomes a Zombie whether or not the
   Undead seat owns Fortification. Only training (and laying an Egg) reads
   the technology.
6. **A seat of a mission or lab that fields its defender owns
   Fortification** ([section 5](#5-labs-the-showcase-and-missions)). The
   units of a mission were not changed. This gives those seats what else
   the node holds: Field Defenses for Humans, Undead, and Goblins, Force
   Fields for the Martians, Nesting for the Dinosaurs.
7. **Retained fixtures keep their technologies.** A saved state in the
   tests that fields a defender with the root alone is still a legal state
   (a state does not record how a unit was got), so those fixtures were
   re-identified and not re-teched, except where a test trains a defender.
8. **The Martian unlock note** reads "Force Field" for the Shield
   Projector's ability on the Force Fields card (it read "Force Field with
   Force Fields" when the unit and its upgrade were on different cards).

## 4. The Normal AI

Details and function names:
[Normal AI, the Industry reshuffle](../architecture/NORMAL_AI.md#the-industry-reshuffle-pulp_wars-w4921).

No research order changed. A seat's chain toward a unit is read from the
tree, so every seat buys the root and then Fortification where its order
names the defender.

| Faction   | Where the defender is in the order                | What that is now                                                                |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Humans    | second (after the Marksman)                       | the root, then Fortification; the Champion third, by Engineering and Metallurgy |
| Undead    | first                                             | the root, then Fortification, before its units                                  |
| Goblins   | third (after the Bomb Chucker and the Wolf Rider) | the root, then Fortification                                                    |
| Martians  | first                                             | the root, then Force Fields, before its units                                   |
| Dinosaurs | first                                             | the root, then Nesting, before its units                                        |
| Ice Folk  | early plan (with the Sled)                        | Scouting, the root, Deep Winter                                                 |
| Dwarves   | early plan                                        | the root, Dig In                                                                |
| Candy     | early plan                                        | the root, Home Sweet Home                                                       |

What was added so that the longer chain does not slow a seat down or
stall it:

- **The root does not count against the research tempo.** The rules that
  say when the next technology is due (by city levels, and the clock while
  at war) count the technologies a seat owns. The root is a step on the
  way now, so it is left out of that count.
- **A seat whose order begins with its defender buys Fortification before
  its units and keeps the Coins for it**, while no enemy stands at the
  gates of one of its cities. Without this an Undead seat bought the root
  in round 3, spent four turns of Coins on Skeletons, and had its first
  Zombie in round 9.
- **The root alone is not a population technology** for the "economy
  first" rule and the wartime growth rule. (It unlocks the Workshop, which
  made those rules read every seat with the root as having its economy.)
- **A seat that keeps Coins for a due technology builds no Field
  Defense.** Human, Undead, and Goblin seats own Field Defense as soon as
  they own their defender, and an Undead seat under pressure spent its
  technology Coins on them.
- **A seat with the root builds a Workshop** beside a Farm, a Lumber
  Camp, or a Mine like any other growth; nothing was added for it.
- **A garrison falls back to the basic line unit** where no defender can
  be trained. This was already so: the purchase shares only count roles a
  city is offered.
- **In a match with an Ice Folk, Dwarf, or Candy seat no seat plays the
  army policy.** There a seat that owns the root researches Fortification
  as soon as it can pay for it, ahead of an economic technology. It does
  not save for it. Before this, four such seats bought the root by round
  13 of a 25-round match and none bought Fortification.

**Four diagnostic matches** were run, to look for stalls and nothing
else. Three were Humans against Undead (seed 4, Dry Land, 14 by 14); in
the last the Undead seat had the root in round 3, Fortification in round
7, and its first Zombie in round 8, and the Human seat the root in round
12, Fortification in round 14, and Guards in round 15; both built a
Workshop (rounds 18 and 19). The fourth was Ice Folk, Dwarves, Candy, and
Martians (seed 4, Dry Land, 16 by 16, 25 rounds): no error and no stall,
and the finding above. It was run before the last rule was added and was
not repeated; that rule is covered by a unit test only.

## 5. Labs, the Showcase, and missions

A seat that owns the root and fields its defender was given Fortification
and the mission a new revision. No unit, Coin, or map changed.

| Mission                                             | Revision | Seats given Fortification                       | What else that gives them                                                                    |
| --------------------------------------------------- | -------: | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `FRONTIER_1`                                        |    1 → 2 | you (Humans)                                    | your Fighters and Guards can build Field Defenses                                            |
| `FRONTIER_2`                                        |    1 → 2 | the Goblin seat                                 | its Orc Brutes can build Field Defenses                                                      |
| `FRONTIER_3`                                        |    1 → 2 | you (Goblins) and the Undead seat               | Field Defenses for both                                                                      |
| `FRONTIER_4`                                        |    2 → 3 | you (Humans or Goblins)                         | Field Defenses (the Undead seat owned Fortification already)                                 |
| `TEST_NECK`                                         |    1 → 2 | both seats                                      | Field Defenses for both                                                                      |
| `LAB_UNDEAD_MID`, `LAB_GOBLIN_MID`                  |    2 → 3 | both seats                                      | Field Defenses for both                                                                      |
| `LAB_MARTIAN_MID`                                   |    2 → 3 | both seats                                      | you own Force Fields from the first turn: units next to a Shield Projector start at Shield 4 |
| `LAB_DINOSAUR_MID`                                  |    2 → 3 | both seats                                      | you own Nesting: eight free unit slots, not three, and the T-Rex Egg has 10 HP               |
| `LAB_BACKLINE`                                      |    3 → 4 | the AI seat                                     | its Fighters and Guards can build Field Defenses                                             |
| the three breakthrough labs (`lab-breakthrough.ts`) |    3 → 4 | the attacking AI seat (Humans, Goblins, Undead) | it can replace its Guards, Orc Brutes, or Zombies, and build Field Defenses                  |

Unchanged: `LAB_SIEGE` and `LAB_LATE` (every seat of them owned
Fortification already), `TEST_GROUNDS`, `TEST_RUSH`, `TEST_HOLD`,
`TEST_GUARD`, and the Showcase (its seats own every technology).

The briefings of the four middle-game labs in the text harness say what
the player owns now (thirteen technologies; Force Fields; Nesting and its
eight free slots).

The tables of [the campaign design](CAMPAIGN.md) list the technologies of
the four Frontier missions as they were authored; read them with
Fortification added as above.

## 6. Tests, fixtures, and pins

- **New:** `tests/unit/ruleset-v7-industry-reshuffle.test.ts` (the
  identity; the tree of every faction; Milling untouched; the name and the
  cards; the defender with Fortification and not with the root alone; the
  Workshop with the root alone; the Mine and a Workshop on a Mountain
  still at Engineering; the mission grants and revisions; the Normal AI's
  chain, tempo, defender-first rule, and Workshop).
- **Identity:** every test and script that names the identity, the prior
  identities, or the save key.
- **Tree and roster expectations:** the unlock lists of the root,
  Engineering, and Fortification; the technology of each defender; the
  card pictures; the harness text.
- **Fixtures given Fortification** where a test trains or expects a
  defender (the Normal AI fixtures of the tuning and faction-pass tests,
  the Dinosaur full-city fixture, the persistence round trip).
- **Mission state hashes:** recomputed for the thirteen missions of
  section 5.
- **AI-play pins recomputed** (the play changed, not the maps): the
  curiosities parity matches (Dry Land, Pangea, Continents, Lakes; the
  map and PRNG digests are unchanged, and Archipelago is unchanged), the
  all-Human parity match of seed 1234, the digests and command counts of
  the public-planning and public-query performance tests, and the retained
  late public view's surface (64 commands; its decision and hash are
  unchanged).
- **Natural-play seeds changed**, each with a note at the test, because
  the old seed no longer shows the thing the test needs (a Lich that
  splashes or plagues, a Wail, a Lifesteal heal, a landed unit that
  captures, a Mind Control, a match that reaches the round cap).
- **Map generation did not move.** No map or PRNG digest changed.

## 7. Open questions for hand play

Nothing below was tested. These are what the placement makes worth
watching, faction by faction.

**All factions**

- The first technology a seat buys no longer gives a unit that holds a
  city. Is a rush on a capital in the first ten rounds too strong against
  a player who opens Industry? (In the AI-against-AI test matches on the
  smallest board, Humans against Undead now often end before round 20.)
- The Workshop at tier 1 needs a Farm, a Lumber Camp, or a Mine beside
  it, so the root alone pays nothing until a second technology. Is
  "Crafting" worth 5 Coins as an opening on its own, or only as the way to
  the defender?
- The opening choice of the Normal AI still values the root by the
  Mountains and the enemies near its capital. The enemies part meant "the
  defender" and now means "one step toward it". Left as it was.
- A defender and Field Defenses (or the faction's defensive effect) now
  arrive together. Is that too much defence from one technology?

**Humans.** The Guard comes one technology later and with Field Defense.
Does the Marksman opening need the Guard sooner than round 12 to 15, where
the AI now gets it? Does the Champion (three technologies on the other
sub-branch) still come at a useful time when the Guard is no longer on
the way to it? **Played** (bead `pulp_wars-w49.22`, four hand games as
the Humans and two as the Goblins against the Human AI; no rule changed):
the answers are in
[the Human tuning, step two](RULESET_7_TUNING_HUMAN.md#17-step-two). In
short: the Human's own land holds without the Guard and a village it races
a Goblin seat for does not, with or without it; Crafting gives nothing on
the turn it is bought and pays as a later technology; Fortification is
not an automatic second buy.

**Undead.** The Zombie is the faction's identity and is two technologies
away. With the AI's new rule the first Zombie came in round 8 (round 3 to
5 before). Is the Undead opening with Skeletons alone too thin for those
rounds?

**Goblins.** The Orc Brute is the one Goblin unit a Knight does not kill
in one attack. It was already third in the AI's order and is a
technology later still. Is that too late against a Human Knight rush?

**Dinosaurs.** Nesting now carries the Ankylosaurus Egg, +4 HP for Eggs,
and a slot in every city: three good things on one tier-2 node. Is it the
obvious second technology every game? The AI's two reasons for Nesting
(the defender, and a crowded city) now point at one node.

**Martians.** The first Shield Projector always arrives with Force
Fields, so a Projector without its field is no longer seen in ordinary
play. Is that wanted, or should the unit and its upgrade sit on different
nodes again?

**Ice Folk.** The Musk Ox arrives with Deep Winter (wider Snow, the
stronger Recover). The Ice Folk's hold on its own land gets all three at
once, one technology later than the Ox came before. The Mammoth is
unchanged on the other sub-branch.

**Dwarves.** The Steam Mole arrives with Dig In, which digs in Moles. A
Dwarf seat's garrison is strong the moment it exists, and absent before.
The Dwarves show Engineering as Mining and now build Workshops without
it: does "Crafting" before "Mining" read right for them?

**Candy.** The Marshmallow arrives with Home Sweet Home. Candy's early
units are fragile; the rounds before the Marshmallow are the ones to
watch.
