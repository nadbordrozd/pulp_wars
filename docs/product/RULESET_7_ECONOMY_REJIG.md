# Ruleset 7: the economy rejig

**Status:** implemented on `pulp-wars-poc-7r54` (bead `pulp_wars-w49.16`).
It was not played by hand: the user asked for a quick pass now and
faction-by-faction play later. The rules themselves are stated in
[Ruleset 7: current rules](RULESET_7_CURRENT.md); this document records
what changed and why, with the numbers before and after. The design it
implements is
[Part C of the heavy slot and economy design](RULESET_7_DESIGN_HEAVY_SLOT_AND_ECONOMY.md#part-c-the-economy-rejig).
The ninth unit of every faction and the technology renames of that design
(Parts A and B) are the next bead, `pulp_wars-w49.17`, and are not in
this identity.

**What the user asked for** (2026-10-07):

> let's rejig the economy a bit. allow windmills and similar to count
> farms from adjacent cities and let's have monuments give 3 population
> instead of 2. To balance this, let's make tech cost progression more
> steep with +1 +2 + 3 per extra city, and let's use harder criteria to
> get the monuments. Maybe keep the easiest one relatively easy but make
> the other ones harder so they are reached later in the game if at all.

**The user's rulings on the design:**

- "for now let's replace the research price." The per-city term replaces
  the per-technology term; it is not added to it.
- "the 'gaming' of the system by delaying capturing cities is a fine
  strategic choice and self limiting." There is no rule against it.
- "As far as the giant goes - this is the iconic mechanic from polytopia
  and everyone loves it. I want giant in every city not just capital. But
  we can postpone it one level for now."
- "as far as achievements - go ahead with your plan."

| #   | Rule             | `7r53`                                                                                                               | `7r54`                                                                                                          |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Mills            | a Farm, Lumber Camp, or Mine counts for one Windmill, Sawmill, or Forge; a Workshop counts its own city's land only  | a mill counts every contributor of its owner next to it, on any of the owner's cities' land; contributors share |
| 2   | Monument         | +2 population                                                                                                        | **+3** population                                                                                               |
| 3   | Research price   | tier base 5 / 7 / 9 plus 1 Coin for each technology owned beyond the first                                           | tier base 5 / 7 / 9 plus **1 / 2 / 3 Coins for each city owned beyond the first**                               |
| 4   | Achievements     | 100 tiles with Scouting; 5 cities; 4 kinds with Drill; a mill at 6 with Engineering; an enemy city; 3 ships; 5 kills | half the map; 8 cities; 6 kinds; a mill at 7; an enemy capital; 5 ships; 7 kills; **no technology for any**     |
| 5   | The reward giant | offered from level 5, in the owner's first capital only, once (so once per player)                                   | offered by **every city**, once per city, **from level 6**; level 5 offers the Treasury or Barracks             |

Stockpile (4 Coins), Barracks, Markets, unit numbers and prices, and
every faction rule are unchanged.

## 1. Mills and their neighbours

**The rule, as a player reads it.** A Windmill counts every Farm of yours
next to it. A Sawmill counts every Lumber Camp, a Forge every Mine, and a
Workshop every kind of them. It does not matter which of your cities'
land they stand on, and one Farm can feed two cities' Windmills.

- A mill counts every contributor on its eight neighbouring tiles whose
  tile is in the territory of a city of the mill's owner.
- A contributor counts for every such mill next to it. A city still has
  one mill of each kind.
- A contributor's own population goes to the city whose land it stands
  on; a mill's output goes to the mill's city.
- The caps are unchanged: 8, 8, 6, and a Workshop's 4.
- A mill needs one contributor it would count to be built. Since every
  neighbour of the owner counts, the offer no longer depends on what else
  stands around the contributor.
- **Markets do not change.** A Market pays Coins every turn, and one Farm
  between three Markets paid 6 a turn before tuning 1. Each building still
  counts for one Market, its own city's first, then the first in reading
  order.
- Nothing is stored. A captured city's Farms stop counting for the former
  owner's mills at once and count for the captor's. A mill left with no
  contributor stays, with zero output.
- Every faction's building of the same kind follows the rule (a Dinosaur
  Chopping Block is the Sawmill, and so on): the rule reads the improvement,
  not its name.

Before the rejig a lone Windmill already counted a neighbouring city's
Farms. What was not allowed was two cities' mills sharing a contributor,
and a Workshop looking across the border.

**Worked layouts.** Two cities stand three tiles apart, so their
territories touch along one side. A Lumber Camp costs 3 Coins and gives
1; a Sawmill costs 5. A Farm costs 5 and gives 2; a Windmill costs 5.

| Layout                                                                                                                      | `7r53`                             | `7r54`                              |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| One city alone: a Sawmill on the middle of one side, four Camps beside it on its own land                                   | 4 + 4 = 8 population for 17 Coins  | the same                            |
| One mill on the border: city A's Sawmill on the side facing city B, four Camps on A's land and three on B's                 | A 4 + 7 = 11, B 3: 14 for 26 Coins | the same                            |
| Two mills facing each other: each city a Sawmill on the shared border and four Camps, four of the eight Camps touching both | each city 4 + 4 = 8: 16 for 34     | each city 4 + 6 = 10: **20** for 34 |
| The same with Farms and Windmills                                                                                           | each city 8 + 4 = 12: 24 for 50    | each city 8 + 6 = 14: **28** for 50 |
| A Workshop on the border with a Farm on its own land and a Lumber Camp and a Mine on the neighbour's                        | 2                                  | **4**                               |
| A Workshop with only a neighbouring city's Farm next to it                                                                  | cannot be built                    | **2**                               |

A pair of facing mills shares at most four contributors (the tiles that
touch both), so the rule is worth at most +4 population to the pair per
kind of mill.

**Where it shows.** The build preview, the city panel, the public
improvement values, and the text harness read the one count
(`spatialContributionAtV7`), so they show what the engine awards. The
Help has one line for it.

## 2. Monuments

A Monument gives **+3** live population (`MONUMENT_POPULATION_V7`; 2 from
tuning 1 to `7r53`, and 3 before tuning 1). It is still free, one per
achievement and one per city, and a captured Monument keeps its
population for the captor.

A city of level L needs L + 1 more population for the next level:

| The Monument's city, with an empty meter | Needs | With +2 (`7r53`) | With +3 (`7r54`)                       |
| ---------------------------------------- | ----: | ---------------- | -------------------------------------- |
| level 1 (a new village)                  |     2 | level 2 exactly  | level 2, and 1 of the 3 toward level 3 |
| level 2                                  |     3 | 2 of 3           | **level 3**                            |
| level 3                                  |     4 | 2 of 4           | 3 of 4                                 |
| level 4                                  |     5 | 2 of 5           | 3 of 5                                 |

The harder achievements of [section 4](#4-achievements) are what keeps +3
from making Monuments a faster road to levels than they were at +2.

## 3. Research price

```text
tier 1 = 5 + 1 * (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

`C` is the number of cities the player owns when it researches. The first
technology of a match is still free. The technologies the player owns no
longer enter the price. The price follows the cities owned at that
moment: a player may research before a capture, or hold fewer cities, to
pay less.

Tier 1 / tier 2 / tier 3 (`scripts/human-tuning-analysis-v7.ts rejig`):

| Cities | `7r54`       | `7r53` with 3 technologies owned | with 8       | with 14      |
| -----: | ------------ | -------------------------------- | ------------ | ------------ |
|      1 | 5 / 7 / 9    | 7 / 9 / 11                       | 12 / 14 / 16 | 18 / 20 / 22 |
|      3 | 7 / 11 / 15  | 7 / 9 / 11                       | 12 / 14 / 16 | 18 / 20 / 22 |
|      5 | 9 / 15 / 21  | 7 / 9 / 11                       | 12 / 14 / 16 | 18 / 20 / 22 |
|      8 | 12 / 21 / 30 | 7 / 9 / 11                       | 12 / 14 / 16 | 18 / 20 / 22 |
|     12 | 16 / 29 / 42 | 7 / 9 / 11                       | 12 / 14 / 16 | 18 / 20 / 22 |

The whole land tree of 20 technologies in tier order, the first free:

| Player               | `7r53` | `7r54` |
| -------------------- | -----: | -----: |
| 1 city throughout    |    314 |    143 |
| 3 cities throughout  |    314 |    229 |
| 5 cities throughout  |    314 |    315 |
| 8 cities throughout  |    314 |    444 |
| 12 cities throughout |    314 |    616 |

- It is steeper for the wide player, which is what the user asked for. At
  five cities the whole tree costs what it cost before; below five it is
  cheaper.
- A broad researcher no longer pays more than a narrow one.
- A one-city player reaches a tier 3 unit for 16 Coins (free, 7, 9). That
  rush is answered by what it buys and by the cities it gives up.

**History.** The price was per city until round 4 of the Human tuning
(steps 1 / 3 / 5, then 1 / 2 / 2). Round 4 replaced it because "the
per-city step punished the player for winning"
([Human tuning, section 11.3](RULESET_7_TUNING_HUMAN.md#113-decisions-that-are-forks-for-the-user-to-overrule)).
The user has now ruled the other way, with a steeper tier 3 step.

**Where it shows.** The technology tree and the research button show the
price the engine charges. The technology detail states the rule under the
price ("Tier 3: 9 Coins, +3 for each city you own beyond your first").
The text harness's `tech` prints the city count and the three formulas.
The Help has one line for it.

## 4. Achievements

| Achievement | `7r53`                                          | `7r54`                                    | Shown to the player               |
| ----------- | ----------------------------------------------- | ----------------------------------------- | --------------------------------- |
| Explorer    | Scouting; 100 tiles explored                    | **half the map explored**; no technology  | Explore half the map.             |
| Land Baron  | 5 cities at once                                | **8 cities at once**                      | Own 8 cities at once.             |
| Muster      | Drill; 4 different trainable kinds on the board | **6 different kinds**; no technology      | Field 6 unit types you can train. |
| Engineer    | Engineering; one mill with output 6             | **one mill with output 7**; no technology | Get one mill to 7 population.     |
| Conqueror   | capture one enemy city                          | **capture an enemy capital**              | Capture an enemy capital.         |
| Sea Dog     | 3 warships at once (Ice Folk: 3 units on ice)   | **5 warships** (Ice Folk: 5 units on ice) | Own 5 warships at once.           |
| Slayer      | 5 kills with one unit                           | **7 kills with one unit**                 | Get 7 kills with one unit.        |

- **Explorer** stays the easy one. Half the map is the board's tiles
  halved and rounded up: 61 on 11 by 11, 98 on 14 by 14, 128 on 16 by 16,
  200 on 20 by 20, 313 on 25 by 25.
- **Land Baron** at 8 is the reward for paying the per-city research
  price.
- **Muster** counts the kinds the player can train (a role with a price),
  so never the reward giant; ships count.
- **Engineer** at 7: only a Windmill or a Sawmill can reach it (a Forge's
  cap is 6, a Workshop's 4), and only next to seven contributors, which
  takes a border mill or a Land Grant.
- **Conqueror** has no stored counter, as before. It unlocks in the
  capture of a city that was founded as a capital and belonged to another
  player.
- **Sea Dog** is still not reachable on Dry Land and still hidden there.
  The Ice Folk goal reads "Hold the ice with 5 units at once."
- **No achievement needs a technology.** The technology cards no longer
  show a trophy, and the achievements screen never reads "Needs …".

The Normal AI does not plan for achievements. It builds a Monument when
one is offered.

## 5. The giant in every city at level 6

| Level | `7r53`                                                         | `7r54`                                                  |
| ----: | -------------------------------------------------------------- | ------------------------------------------------------- |
|     2 | Scouts or Survey; Stockpile (4 Coins)                          | the same                                                |
|     3 | Walls; Militia                                                 | the same                                                |
|     4 | Boom; Treasury (6 Coins); Barracks                             | the same                                                |
|     5 | Treasury (6); Barracks; **the first capital, once: the giant** | Treasury (6); Barracks                                  |
|   6 + | as level 5                                                     | Treasury (6); Barracks; **every city, once: the giant** |

- Every city offers its faction's giant (Juggernaut, Abomination, Troll,
  Brontosaurus, Colossus, Frost Giant, Brass Titan, Gingerbread Giant)
  when it reaches level 6, beside the Treasury and Barracks.
- Once per city. A city that takes the Treasury or Barracks at level 6 is
  offered the giant again at level 7 and at each later level until it
  takes it. This is the rule of tuning 1 (the reward unit once per city),
  one level later.
- The first-capital and once-per-player restrictions of round 4 are gone.
  They stored nothing (the capital's reward history was read), so no
  state was removed.
- A city's reward history travels with it on capture: a captured city
  that gave its giant gives none to the captor; one that did not, does.
- The giant is placed like any reward unit: on the center, or beside it
  when the center is occupied.
- Level 6 takes 20 population. A city of 3 by 3 tiles does not reach it
  from its buildings alone (seven Farms and a Windmill on the eighth tile
  give 18 at most): it takes a Land Grant, a Monument, a Boom, harvests
  and hunts, or a shared mill.

**Where it shows.** An own city's panel says "At level 6 this city can
take a free <giant>, once" (the level stat's tooltip; "This city has
taken its <giant>" afterwards), a level-4 or level-5 reward dialog says
the same under its lede, the Help has the rule, and the text harness
prints a `giant unit:` line under every own city that has not taken its
giant.

**The Showcase.** Its capital is level 5 and holds the faction's giant on
the board. Its level-5 reward record is now `TREASURY` (it was
`JUGGERNAUT`, which is no longer a level-5 reward); the capital is
offered its own giant at level 6 like any city.

## 6. The Normal AI

Kept working, not improved
([Normal AI](../architecture/NORMAL_AI.md#the-economy-rejig-pulp_wars-w4916)).

- **Rewards.** At level 6 and above it takes the giant when it is offered
  and the seat has fewer giants than cities. Before, it took the reward
  unit only for a threatened city or with 12 Coins; with the giant one
  level later and offered again only at level 7, a seat that passed would
  rarely see it again. At level 5 it takes Barracks, as it did where the
  giant was not offered.
- **Research.** The research target's price, the war clock's "turns of
  income to pay the price", and the Coins kept for a due technology all
  read the public technology tree, so they follow the seat's cities. No
  number was changed.
- **Mills.** It builds from the economic previews, which count the shared
  contributors.

## 7. Identity and shapes

`pulp-wars-poc-7r54`; `pulp-wars-poc-7r53` joins the prior identities and
its save key the obsolete keys. Older states, saves, and replays are
incompatible, as for every identity change.

- No state, view, command, or event key was added or removed.
- Literal types and validated numbers changed: a Monument's population
  (3, in the contribution, the `MONUMENT_BUILT` event, and the preview);
  the `required` numbers of the Explorer (half the board), Engineer (7),
  and Muster (6) progress entries; a level-5 reward's candidate list (no
  `JUGGERNAUT`); a `JUGGERNAUT` reward record or `UNIT_REWARD_GRANTED`
  event (level 6 or higher).
- `rewardCandidatesForLevelV7(level, rewards)` lost its `firstCapital`
  argument, and `isOwnersFirstCapitalV7` is removed.
- `technologyResearchCostV7(tier, cities)` and
  `playerTechnologyResearchCostV7(tier, technologies, cities)` take the
  city count.
- The headless `coinsSpent` metric reads a research's price from the
  technology tree (it used a formula of its own).

## 8. Plain readings where the design was silent

- **Conqueror and the player's own capital.** Taking back your own first
  capital from an enemy does not unlock it: the goal reads "an enemy
  capital". A capital that has changed hands counts whoever holds it.
- **The giant after level 6.** Offered at every level from 6 until the
  city takes it, not at level 6 alone.
- **Muster's goal text** keeps "you can train" (the Undead pass added it
  because a reward-only unit does not count).
- **Engineer's goal text** reads "Get one mill to 7 population." rather
  than the design's "Run a mill at 7.", to match the other goals.
- **Half the map** counts every tile of the board, land and water.
- **A research price for a player with no city** (never in a match)
  prices as one city.

## 9. What to watch when it is played

Not changes; things the design named and this pass did not test by hand.

- A Sawmill border pair at 20 population for 34 Coins is the cheapest
  growth in the game.
- Engineer at 7 is easier under the sharing rule than it reads.
- The one-city tier 3 rush.
- **The giant in every city.** The design estimated the capital's level 6
  at rounds 14 to 17. With one giant a city, a wide player with border
  mills and Monuments at +3 may field several giants by round 20. A giant
  is placed even in a full city and counts against its unit limit
  afterwards (a Colossus and a Brontosaurus take two slots).

## 10. Tests

`tests/unit/ruleset-v7-economy-rejig.test.ts` holds a constructed state
for each rule: the shared contributors of two cities' mills (the worked
layouts, the Workshop, the caps, the Market exception, another owner's
land, and a match in which two Windmills are built and previewed); the
Monument's +3 and the level it reaches; the price table at 1, 3, 5, 8,
and 12 cities for each tier, with and without owned technologies, in the
tree and as charged; each achievement at its boundary; the giant offered
at level 6 in a second and a third city and not at 5; and the Normal AI's
reward choice and research price.
