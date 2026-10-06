# Ruleset 7 tuning 1: the Human tech tree and economy after the hand playtest

**Status:** implemented at `pulp-wars-poc-7r46` (`pulp_wars-w49.3`, epic
`pulp_wars-w49`). The current rules are in
[Ruleset 7: current rules](RULESET_7_CURRENT.md); this document records why
the numbers moved, the exact rule before and after, what each change does
to the other factions, and what is still open. It is judged by hand play,
not by AI self-play: no balance matrix was run for it.

**Source.** The user's design notes of 2026-10-05 (the game is
defence-heavy; tier 3 comes too late; Land Grant makes cities level up very
fast; both tier 3 units should be worth having; Explosives and Commerce look
very weak) and five games played by hand in text mode
([text play](../validation/TEXT_PLAY.md)), each as Human against the Normal
AI on Dry Land, at `pulp-wars-poc-7r45`.

## 1. The five playtests (summary)

| Game | Plan                         | Setup (size, seed, opponents)          | Result                   | Decided by                             |
| ---- | ---------------------------- | -------------------------------------- | ------------------------ | -------------------------------------- |
| G1   | the natural game             | 11, seed 3, Undead                     | win, round 23            | Fighters and Marksmen by round 15      |
| G2   | defensive turtle             | 11, seed 11, Goblin                    | win, round 28            | two free Juggernauts by round 17       |
| G3   | the tier 3 push              | 11, seed 21, Dinosaur                  | win, round 30            | Catapults from round 9                 |
| G4   | the economy game             | 14, seed 5, Martian and Dwarf          | losing, stopped round 38 | reward units on all three seats        |
| G5   | Explosives and an early rush | 16, seed 8, Candy, Ice Folk and Goblin | eliminated, round 26     | the Goblin's village count by round 10 |

### 1.1 What the players measured

**Attacking a defended tile** (G3, exact previews; "deals / takes"):

| Target                                   | Fighter (Attack 2)       | Knight (Attack 3)        | Catapult (Attack 3.5) |
| ---------------------------------------- | ------------------------ | ------------------------ | --------------------- |
| Caveman 10/10 on a city center           | 4–5 / 5                  | —                        | **10, kills** / 0     |
| Caveman 10/10 in Forest                  | 3–4 / 5–6                | —                        | 8 / 0                 |
| Ankylosaurus 20/20, open ground          | 2–3 / 8–9                | 6 / 7                    | 7–8 / 0               |
| Caveman 10/10 on the Walled capital      | 2 / 8 (the Fighter dies) | 3 / 4                    | 7 / 0                 |
| Ankylosaurus 24/24 on the Walled capital | not survivable           | 4 / 10 (the Knight dies) | 5–6 / 0               |

G2 saw a Fighter deal 3 to a Walled Orc Brute and take 12 (it dies), and the
same Brute at 8 of 15 HP still deal 11. G5 saw a Guard deal 2–3 to any
Defense 2.5 unit and take 7. Every report names the same cause: the
retaliation was computed from the **fortified** Defense, so Walls, Field
Defense, and cover made a defender hit harder as well as last longer.

**The price of tier 3** (per-city steps of 1 / 3 / 5 at `7r45`):

| Game | Route                                                                      | Tier 3 technology | First tier 3 unit  |
| ---- | -------------------------------------------------------------------------- | ----------------- | ------------------ |
| G3   | one city, nothing else bought; a village capture held back to keep 9 Coins | round 6 (9 Coins) | round 9            |
| G4   | two Fighters parked on villages until Planning was researched              | round 6 (9 Coins) | Land Grant round 7 |
| G1   | expanded first: 3 cities 19 Coins, 4 cities 24, 5 cities 29                | round 18          | round 19           |
| G2   | expanded first: 29 and 34 Coins at 5 and 6 cities                          | round 21          | round 21           |

**The economy** (G4's ledger, unchanged numbers unless marked):

| Item                 | Cost                     | Return                                                | Verdict in play                                        |
| -------------------- | ------------------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| Fruit, Game          | 2 Coins                  | +1 population                                         | the best early item                                    |
| Farm, Mine           | 5 Coins                  | +2 population                                         | level 3 to 4 costs 10 and the Treasury gave 8 back     |
| Workshop             | 4 Coins                  | +2 or +3 population                                   | the cheapest population                                |
| Lumber Camp, Sawmill | 3 Coins +1; 5 Coins +1–4 | population                                            | one camp fed the Sawmills of three cities              |
| Market               | 6 Coins                  | +2 or +3 Coins a turn                                 | pays back in 2–3 turns; one Farm fed three Markets     |
| Monument             | free                     | +3 population                                         | 4 of them gave 2 extra Juggernauts                     |
| Commerce             | 24–29 Coins (the tech)   | +1 Coin a turn per connected city (+3 in G4)          | 8 turns to pay back; never worth a slot                |
| Land Grant           | flat 6 Coins             | +13, +8, +4, +3 tiles in G4                           | one city went from level 3 to 6 in a turn for 24 Coins |
| Level 5+ reward      | —                        | a Juggernaut (40 HP, Attack 4, Defense 4) or 12 Coins | 11 Juggernauts in G4; nobody took the 12 Coins         |

### 1.2 Findings the five reports share

1. **Defence.** Retaliation scales with the fortified Defense. Below tier 3
   nothing opens a Walled or covered tile; a Guard is a hopeless attacker.
2. **Research price.** The per-city surcharge (+3 on tier 2, +5 on tier 3)
   makes refusing to expand the cheapest road to tier 3 (round 6 in G3 and
   G4) and prices the leader out (29–34 Coins in G1 and G2).
3. **Tier 3 units.** The Catapult kills a basic unit every turn from three
   tiles away and is never at risk; the Knight only finishes what a Catapult
   left, at 10 HP, and its forced advance strands it. Marksmen at 3 Coins
   with a Fighter's HP did the work of both in G1.
4. **Snowball.** Monument (+3 population, free) into Boom (+3) into a free
   level-5 Juggernaut, repeated at every later level; the level-4 Treasury
   (8 Coins) refunds more than the 5-Coin building that completes the level;
   Land Grant at a flat 6 Coins is available by round 6–7.
5. **Dead branches.** A 6-Coin Market beats Commerce; Explosives gave G5's
   player one Blast, which opened his own choke point, and a demolition that
   never triggered in 26 rounds.
6. **Late Coins.** From about round 22 every game piled up Coins (97 and 123
   unspent at the end of G3 and G2): unit capacity, not Coins, is the limit.
7. **Forced advance.** A melee kill moves the attacker onto the dead unit's
   tile. It cost Fighters in G3 and G5, a Knight in G1, and a Marksman that
   killed an adjacent unit and was pulled out of its capital in G5.
8. **Chests.** A chest gave a Knight on round 2 (G1) and round 8 (G2), and
   the Goblin a Scrap Buggy on round 5 (G5).
9. **The Normal AI.** Armies of one unit type (six Zombies in G1); it never
   attacks a siege unit; it idles next to Walled units; it leaves capitals
   empty; it does not expand; it researches while dying; it walks into known
   ranged reach; its ranged units attack from distance 1 into lethal
   retaliation.
10. **The text harness.** A `do` list stops at a rejected id, and an `end`
    chained after it still ended the turn (four of five players lost part of
    a turn); `npm` was not on the players' PATH.

## 2. The changes

Each change states the aim, the rule before, the rule now, and the code.

### A. Retaliation uses the base Defense

**Aim.** Attacking a fortified unit should be costly, not suicidal;
fortification makes a defender last longer, never hit harder.

**Before.** `damageToAttacker = roundHalfUp(defenseForce / total × defense × 4.5)`
with `defense = base Defense + fortification level` and
`defenseForce = defense × hp / maxHp × cover`: the same fortified, covered
Defense that reduced the damage taken.

**Now.** The damage the defender **takes** is unchanged. The retaliation is
the same formula computed with the defender's base role Defense and no
cover:

```text
retaliationForce = baseDefense * defender.hp / defender.maxHp
damageToAttacker = roundHalfUp(retaliationForce / (attackForce + retaliationForce)
                               * baseDefense * 4.5)
```

That is exactly what the defender would deal on open ground with no
fortification. **It is a global combat rule, for every faction** (the user
confirmed it on 2026-10-05). A fight on open ground against an unfortified
unit is unchanged. The public preview and the resolution share
`retaliationDamageV7` (`src/engine/v7/combat.ts`), so they are equal.

Defense has only these sources beyond the role's base value, and the
retaliation leaves out every one:

| Source                                            | Whose                                                                                      | In the damage taken | In the retaliation   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- | -------------------- |
| City Walls (2 levels)                             | any land unit on its own Walled center (never a Martian machine or a Gyrocopter)           | yes                 | no                   |
| Field Defense (1 level)                           | any such unit on a Field Defense tile of its territory (built by Human, Undead, Orc Brute) | yes                 | no                   |
| Dig In (1 level)                                  | a Dwarf Hammerer or Steam Mole standing still by its own center                            | yes                 | no                   |
| Forest or Mountain cover (× 1.5)                  | every ground defender (never a Martian walker or flyer)                                    | yes                 | no                   |
| Snow cover (× 1.25)                               | an Ice Folk unit on Snow with no fortification                                             | yes                 | no                   |
| Glacier's cover on ice (× 1.25)                   | an Ice Folk unit on ice whose owner has Glacier                                            | yes                 | no                   |
| the fixed Defense 1 of an Egg or an embarked unit | Dinosaur Eggs; every embarked unit                                                         | yes                 | they never retaliate |

The special retaliation rules are unchanged, and each now starts from the
base-Defense number:

| Rule                                                                                                                      | Effect on the retaliation                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| a killed defender; a defender out of its own range                                                                        | none (a Bomb Chucker answers only at distance 2, a Yeti's Rockfall reach does not extend its answer)         |
| Unanswered (Vampire), a torpedo (Submarine)                                                                               | none                                                                                                         |
| an Egg, an embarked unit, an icebound unit                                                                                | none                                                                                                         |
| Splat (a unit a Pie Launcher hit this turn)                                                                               | none                                                                                                         |
| Shatter (a Chilled unit left at the threshold)                                                                            | none: the defender dies                                                                                      |
| Armoured (Ankylosaurus), Plated (Steam Tank), Shields                                                                     | reduce the retaliation the attacker takes, as before                                                         |
| Infect and Bite (Zombie), Lifesteal (Vampire)                                                                             | act on the retaliation damage, as before                                                                     |
| Unflinching, Gang Up, Charge, Inspired, Sugar Rush, a ray, the Blizzard                                                   | attacker-side or damage-taken rules: never part of a retaliation                                             |
| Bounce (Marshmallow, Gingerbread Giant), Push, Knockback                                                                  | moves after the exchange: unchanged                                                                          |
| the attacks that ignore fortification (Acid, Charge!, the Disintegrator, Boulders, Blasting Charges, Wallbreaker, Breach) | they change the damage taken only; their old second half, "and the retaliation", is now true of every attack |

`tests/unit/ruleset-v7-tuning-1.test.ts` checks Walls with Field Defense,
Forest, Mountain, Dig In, Snow, and Glacier ice against the open-ground
number through the shared attack fixture (public preview equal to the
resolution); the faction test files keep their checks of the special rules
with the new numbers.

| Attack (both at full HP)                        | Before: deals / takes | Now: deals / takes |
| ----------------------------------------------- | --------------------- | ------------------ |
| Fighter on a Guard, open ground                 | 4 / 8                 | 4 / 8              |
| Fighter on a Guard in Forest                    | 3 / 9                 | 3 / 8              |
| Fighter on a Guard on Walls                     | 3 / 12 (dies)         | 3 / 8              |
| Fighter on a Guard, Walls + Field Defense       | 2 / 12 (dies)         | 2 / 8              |
| Guard on a Guard on Walls                       | 2 / 17 (dies)         | 2 / 9              |
| Knight (10 HP then, 13 now) on a Guard on Walls | 5 / 10 (dies)         | 5 / 7              |
| Juggernaut on a Guard on Walls                  | 8 / 13                | 8 / 6              |
| Fighter on an Orc Brute on Walls                | 3 / 12 (dies)         | 3 / 6              |
| Fighter on an Orc Brute at 8 of 15 HP on Walls  | 4 / 11                | 4 / 5              |
| Fighter on a Caveman or Fighter on Walls        | 3 / 12 (dies)         | 3 / 5              |

A Fighter still pays 8 HP for 3 damage on a Walled Guard, so Walls remain
a siege to be paid for; they no longer kill what touches them.

### B. Research cost: per-city steps of 1 / 2 / 2

**Aim.** Expanding first must not make research markedly dearer; tier 3
reachable in mid-game for a player who expands. The bases (5 / 7 / 9) are
the user's and stay.

**Before.** `tier 2 = 7 + 3 (C − 1)`, `tier 3 = 9 + 5 (C − 1)`.
**Now.** `tier 2 = 7 + 2 (C − 1)`, `tier 3 = 9 + 2 (C − 1)`; tier 1 is
`5 + 1 (C − 1)` as before (`TECHNOLOGY_RESEARCH_COST_V7`).

| Cities | Tier 1 | Tier 2 before | Tier 2 now | Tier 3 before | Tier 3 now |
| -----: | -----: | ------------: | ---------: | ------------: | ---------: |
|      1 |      5 |             7 |          7 |             9 |          9 |
|      2 |      6 |            10 |          9 |            14 |         11 |
|      3 |      7 |            13 |         11 |            19 |         13 |
|      4 |      8 |            16 |         13 |            24 |         15 |
|      5 |      9 |            19 |         15 |            29 |         17 |
|      6 |     10 |            22 |         17 |            34 |         19 |

Holding a village back for one turn now saves 2 Coins, not 5. The one-city
price did not change, so tier 3 on round 6 by sitting on one city is still
affordable; that rush is answered through what it buys (C), not by a gate.

### C. The tier 3 units

**Aim.** The Catapult is a siege tool that needs protecting, not a
risk-free killer; the Knight does something the Catapult cannot; both are
worth having.

**Catapult.** Attack 3.5 → **3**. Cost 8, 10 HP, Defense 0.5, range 2–3, no
attack after moving: unchanged. Its minimum range was already 2 (it never
could target an adjacent unit; verified, and now tested), so that part of
the decision needed no change.

| Catapult shot at (full HP)              | Before        | Now   |
| --------------------------------------- | ------------- | ----- |
| Fighter (12 HP) on a city center        | 10            | 8     |
| Skeleton or Caveman (10 HP) on a center | 10, **kills** | 8     |
| Marksman or Raider (12 HP, Defense 1)   | 12, **kills** | 10    |
| Guard, open ground                      | 8             | 7     |
| Guard in Forest                         | 7             | 5     |
| Guard on Walls                          | 6             | 5     |
| Goblin (6 HP)                           | kills         | kills |

A full-HP basic infantry unit of every faction but the 6-HP Goblin now
survives one shot, so the Catapult needs a second unit to finish, and two
shots to clear a center.

**Knight.** 10 HP → **13**. Cost 9, Attack 3, Defense 1, Move 3: unchanged.
It keeps **Overrun** (after a kill it advances and may attack again, with
no cap). It has no Charge and never had: Charge is the Raider's, with
Raiding. A Fighter's or a Marksman's attack deals a Knight 6, so it now
survives two of them (it died to the second), and with change A it no
longer dies attacking a Walled Guard (5 dealt, 7 taken).

**The advance after an Overrun kill stays forced.** See Deviations (D1).

### D. The Marksman

**Aim.** One 3-Coin unit should not make the others unnecessary.

- Cost 3 → **4** Coins. 12 HP, Attack 2, Defense 1, range 1–2, capture:
  unchanged.
- **It never advances after a kill.** Before, the advance rule was "a
  surviving _adjacent_ land attacker that kills moves onto the tile": a kill
  from distance 2 never advanced, and a kill from distance 1 did, also for a
  Marksman. That is what G5's player saw (his Marksman killed a unit next
  to it and was moved out of his capital). The Marksman's role mechanic
  `advancesAfterKill` is now false, like the Catapult's.

### E. The level-reward loop

**Aim.** The loop must not print free heavy units or refund more than it
costs.

1. **The reward unit once per city.** At level 5 and above a city was
   offered "Juggernaut or 12 Coins" at every level. Now a city whose reward
   history holds a `JUGGERNAUT` is offered the Treasury (12 Coins) alone at
   every later level (`rewardCandidatesForLevelV7(level, rewards)`). The
   history travels with the city, so a captured city that already gave its
   unit gives none to the captor. A city that took the Treasury at level 5
   is still offered the unit at level 6. A one-candidate choice is still a
   pending choice (one click); the stored choice and the
   `CITY_REWARD_QUEUED` event then carry `["TREASURY"]`.
2. **Monument** +3 → **+2** population (`MONUMENT_POPULATION_V7`).
3. **Level-4 Treasury** 8 → **6** Coins. Its reward ID is now `TREASURY_6`
   (was `TREASURY_8`). The other values stay: Stockpile 4 (level 2),
   Treasury 12 (level 5+). The check asked for, "no Treasury above the
   cheapest building that can trigger that level", cannot be met literally
   (a 2-Coin harvest or a free Monument can complete any level), so the
   test used is the cheapest price of the **whole level's population** at 2
   Coins per population (harvests): level 2 needs 2 population (4 Coins;
   Stockpile 4), level 4 needs 4 (8 Coins; Treasury 6), level 5 needs 5
   (10 Coins; Treasury 12), level 6 needs 6 (12 Coins; Treasury 12). Only
   level 5 is above, by 2 Coins, and only for a city with five harvest
   tiles left at that point, which no playtest had; at the realistic 2.5
   Coins per population of Farms and Mines it is 12.5. It is left at 12 and
   listed as open.
4. **Land Grant** flat 6 Coins → **2 Coins per tile it claims, at least 6**
   (`landGrantCostV7`). See Deviations (D2) for which tiles are counted.
   G4's four grants (13, 8, 4, and 3 tiles) would have cost 26, 16, 8, and
   6 Coins instead of 6 each. `queryLandGrantPreviewV7` returns the cost and
   the tiles; the city panel button and the text harness show it.
5. **One contributor, one building.** A Farm, Lumber Camp, or Mine counted
   for every adjacent Windmill, Sawmill, or Forge of its owner, and every
   one of the six family buildings counted for every adjacent Market. Now
   each contributor counts for **one** building of a kind: the one of its
   own city if it is adjacent; otherwise the first adjacent one in (y, x)
   order. The Windmill-or-Sawmill-or-Forge choice and the Market choice are
   independent (a Farm may count for one Windmill and one Market). A
   Workshop already counted only its own city's buildings. The rule is
   stateless, so a new building of the contributor's own city takes the
   contributor from a neighbour's. Placement needs a contributor that would
   count for the new building. (`contributorServesV7` in
   `src/engine/v7/spatial-economy.ts`.)

| One contributor between the buildings of three cities | Before                   | Now                                                            |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| a Lumber Camp (3 Coins) and three Sawmills            | +1 population each: +3   | +1 for one Sawmill                                             |
| a Farm (5 Coins) and three Markets (6 Coins each)     | +2 Coins each: +6 a turn | +2, +1, +1: +4 a turn                                          |
| the same Market's payback                             | 3 turns each             | 3 turns, and 6 turns for the two that only pay their base Coin |

A Market next to its own city's Farm and Lumber Camp still pays 3 Coins a
turn for 6 Coins: the Market's own numbers did not change.

### F. Commerce, Explosives, and Field Defense

**Aim.** Explosives and Commerce are each worth a research slot sometimes.

- **Commerce:** land trade +1 → **+2** Coins a turn for each connected
  non-capital city (`LAND_TRADE_INCOME_COINS_V7`). With three connected
  cities it pays 6 a turn, so the technology's own price for a player
  with four cities (15 Coins now, 24 before) is back in three turns,
  against eight before.
- **Explosives, Breach** (new). With Explosives, the owner's land-form
  attacks from distance 1 **ignore the target's fortification levels**:
  City Walls, Field Defense, and Dig In. Terrain cover still applies, and
  Walls are not destroyed. The Field Defense on the target tile is
  destroyed, whether or not the attacker survives (before: only when it
  survived). The preview reports `breachApplied`, `fortificationLevel: 0`,
  and the removed levels in `fortificationIgnored`; the board shows
  "Breach: ignores fortification". A ranged attack never breaches.

  | Attack with Explosives (full HP)          | Without: deals / takes | With Breach |
  | ----------------------------------------- | ---------------------- | ----------- |
  | Fighter on a Guard on Walls               | 3 / 8                  | 4 / 8       |
  | Fighter on a Guard, Walls + Field Defense | 2 / 8                  | 4 / 8       |
  | Fighter on a Fighter or Caveman on Walls  | 3 / 5                  | 5 / 5       |
  | Knight on a Guard on Walls                | 5 / 7                  | 7 / 7       |
  | Juggernaut on a Guard on Walls            | 8 / 6                  | 10 / 6      |

- **Explosives, Blast Mountain.** It is now allowed on an Ore Mountain
  (the Ore is lost) and gives the tile's city **+1 permanent population**
  (`BLAST_MOUNTAIN_POPULATION_V7`); 3 Coins, own territory, no improvement
  or Field Defense on the tile, as before. A Mountain always belongs to a
  city when it can be blasted (the command needs own territory), so the
  population goes to that city and no refund rule was needed. At 3 Coins
  per population it is dearer than a harvest (2) and a Mine (2.5) and
  works on every Mountain a city owns.
- **Field Defense** no longer uses the builder's turn: the unit keeps its
  Move and its primary action. It still must not have moved or acted before
  it builds (so not after an attack), still costs 3 Coins, and a tile holds
  one. A Fighter can dig in and attack from the tile in the same turn.

### G. Treasure chests

**Aim.** A chest must not hand out a tier 3 unit early.

A chest's draw is unchanged (one PRNG draw: 5 Coins or a unit). The unit
was the faction's treasure role: the `KNIGHT` role for Human, Undead, and
Goblin (a Knight, Vampire, or Scrap Buggy, all unlocked by a tier 3
technology) and the `RAIDER` role for the five other factions. **Before
round 15 a chest never gives a unit of a tier 3 technology; the seat's
`RAIDER`-role unit appears instead** (a Raider, Ghoul, or Wolf Rider). From
round 15 on the Knight-role unit appears as before
(`treasureUnitRoleForRoundV7`). The event's reward literal stays `KNIGHT`.

## 3. Deviations from the direction given

- **D1. The Knight's advance is still forced.** The direction made the
  optional advance conditional on being cheap in the command model and on
  needing no new UI flow. The engine part is cheap (one flag on `ATTACK`),
  but in the browser an attack is one click on the target, which sends the
  one offered `ATTACK` for that pair; a second offered command for the same
  target has no control to choose it, and the Normal AI reads offered
  attacks by target. It needs a new UI flow, so the advance stays and the
  Knight's 13 HP and change A carry the aim. Open as a UI item.
- **D2. Land Grant counts the tiles the owner has explored.** A grant also
  claims neutral tiles the owner has not explored. Their number is hidden,
  so a price that counted them could not be shown exactly and would leak
  it. The cost is 2 Coins per **explored** neutral tile of the footprint,
  at least 6; unexplored neutral tiles are still claimed and revealed, for
  nothing. The preview and the engine count the same tiles.
- **D3. "Ranged attacks never advance" is implemented for the Marksman
  only.** The Spitter, the Ray Gunner, the Colossus, the Snow Hunter, and
  the Gumball Gunner (other factions' ranged units) still advance after a
  kill from distance 1, as their own designs state; they are for those
  factions' passes.
- **D4. The Catapult's minimum range** was already 2. Nothing changed.
- **D5. Treasury values.** See E3: only the level-4 value changed; the
  level-5 Treasury is 2 Coins above the strictest reading and is listed as
  open.
- **D6. The level-5+ reward after the unit is taken** is the Treasury
  alone. "The other rewards" has one member at that level, and a second
  option would have been a new reward to invent.
- **D7. Blast Mountain's event** (`MOUNTAIN_BLASTED`) still reports no
  resource for the tile, so the Ore of a blasted Ore Mountain is not in the
  event (the tile and the public view show the result).

## 4. What this does to the other factions

These rules are shared, so they changed for every faction:

| Change                                              | Who else is affected                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Retaliation                                      | Every faction, as attacker and defender. The defensive identities lose their counter-punch and keep their staying power: a dug-in Dwarf, an Ice Folk unit in Snow or on Glacier ice, any unit on Walls, Field Defense, Forest, or Mountain. |
| B. Research cost                                    | Every tree (one cost table).                                                                                                                                                                                                                |
| C, D. Unit numbers                                  | Human only. The Lich (Attack 3), Rocket Cart and Steam Cannon (3.5), the Vampire, Scrap Buggy, and the others' ranged units keep their numbers.                                                                                             |
| E1. Reward unit once per city                       | Every faction's level-5+ unit: Abomination, Troll, Brontosaurus, Colossus, Frost Giant, Brass Titan, Gingerbread Giant.                                                                                                                     |
| E2–E5. Monument, Treasury, Land Grant, contributors | Every faction (shared economy).                                                                                                                                                                                                             |
| F. Commerce                                         | Undead, Dinosaur, Martian, Ice Folk, Dwarf, and Candy get +2. The Goblin Commerce is Plunder (1 Coin per kill) and did not change.                                                                                                          |
| F. Breach and Blast Mountain                        | Every tree's Explosives, under its name: Explosives (Human, Undead, Goblin), Wallbreaker, Disintegrator, Brittle, Blasting Charges, Peppermint Surprise.                                                                                    |
| F. Field Defense                                    | The factions that build it: Human, Undead, and the Goblin Orc Brute.                                                                                                                                                                        |
| G. Chests                                           | Undead (Ghoul instead of Vampire) and Goblin (Wolf Rider instead of Scrap Buggy) before round 15; the five others already got their `RAIDER`-role unit.                                                                                     |

Side effects the direction did not name:

- **Wallbreaker is now covered by Breach.** The Dinosaur Explosives adds
  "dinosaurs ignore City Walls". Every dinosaur attack that is not the
  Spitter's (Acid already ignores everything) is a melee attack, and Breach
  removes Walls and Field Defense for it. Wallbreaker's own unlock no longer
  adds anything; the Dinosaur pass should give it something.
- **The Disintegrator, Boulders, Blasting Charges, and Charge!** removed
  fortification "for the damage and the retaliation". The second half is
  now true of every attack, so each of them is worth less than before
  relative to an ordinary attack.
- **Dig In and Snow cover** were tuned with their retaliation in mind
  (the Dwarf and Ice Folk balance records). Their win rates were measured
  before this change.
- **Goblin Gang Up** attacks into fortified tiles lose fewer Goblins.
- **The Normal AI** reads costs and previews from the public queries, so it
  stays legal. Its own damage estimate does not know Breach, its Land Grant
  value still assumes 6 Coins, and its taste for defenders was set when
  defenders hit back harder. None of that was retuned here.
- **A Marksman's Disband refund** is 2 Coins (half its cost, rounded down;
  1 before).
- **What the pinned Normal AI test matches showed** when their pins were
  recomputed (single matches used as test fixtures, not balance evidence):
  an Undead seat no longer has a Vampire before it researches Chivalry, so
  no match of seeds 0–10 showed Lifesteal within 20 rounds (two did within
  40); the Martian AI took a Mind Control in 2 of 41 Martian-against-Ice-
  Folk matches within the test's 1 500 steps (the test needed one seed in
  about ten before); in the hidden `TEST_HOLD` mission fixture the Human
  seat now destroys the Undead seat that holds its zone by round 13, where
  the Undead units used to survive and leave the zone; and an all-Human
  Continents match now researches Seamanship within 30 rounds.

## 5. Not in scope (open)

- **Normal AI behaviour:** armies of one unit type; never targeting siege
  units; idling beside Walled units; empty capitals; no expansion;
  researching while dying; walking into known ranged reach; ranged units
  attacking from distance 1 into lethal retaliation.
- **Late Coins.** Unit capacity binds from about round 22 and Coins pile up.
- **The other factions' own units and trees**, including the items in
  section 4 (Wallbreaker, the fortification-ignoring abilities, the ranged
  units that advance).
- **The Knight's optional advance** (D1) and, more widely, the forced
  advance of every melee unit, which the reports also name.
- **Open-ground retaliation.** A Guard still returns 8 to a Fighter that
  deals it 4 with no fortification at all, because retaliation scales with
  Defense. G5 asked for it to scale with Attack; not changed.
- **The level-5 Treasury** (12 Coins against 10, E3) and the Stockpile
  (4 Coins against 4).
- **The one-city rush.** Tier 3 on round 6 from one city is still
  affordable (9 Coins). The Catapult it buys no longer kills a basic unit
  per shot; whether that is enough is for the replay.

## 6. Evidence that is now stale

Every balance record, win-rate table, and playtest figure in the repository
was measured before `7r46`. In particular:

- the five hand playtests above (their previews use the old retaliation,
  the old Catapult, and the old prices);
- the faction balance records under `docs/validation/`
  (`RULESET_7_*_BALANCE*`, `RULESET_7_REVISION_20_BALANCE*`,
  `RULESET_7_NORMAL_AI_MATRIX.json`, `RULESET_7_TACTICAL_AI*`) and the
  balance sections of the faction overlays;
- the campaign playtest (`docs/validation/CAMPAIGN_TEASER_PLAYTEST.md` and
  `.json`) and the turn counts quoted in [Campaign](CAMPAIGN.md): the
  missions use these rules, and they were not rebalanced;
- the release corpus `docs/validation/RULESET_7_RELEASE_CORPUS.json` is a
  frozen revision-2 record and is unaffected.

## 7. The text harness

- `do … --end` ends the turn after the ids, only if every id was applied
  and the turn can end.
- A plain `end` right after a `do` that stopped at a rejected id is refused
  with a message naming the id and what was not executed; another `do`
  clears it, and `end --force` ends the turn anyway.
- `scripts/play-text` is a shell wrapper that finds Node on PATH or under
  `~/.local/pulp-wars-tools/node-v*/bin`, for shells without `npm`.

After two more hand playtests of identity 7r46 the text was corrected in
four places; no rule and no serialized value changed:

- **The chest line names the unit that came.** The `TREASURE_CAPTURED`
  event keeps its reward literal `KNIGHT`, which has meant "the faction's
  chest unit" since revision 19 (a Raptor, a Saucer, a Sled) and now also
  covers the Raider of the rounds before 15. The harness printed the
  literal; it now prints
  `TREASURE_CAPTURED by u2(S0 Fighter) at 9,2: granted u5(S0 Raider) at 9,1 home c1`,
  or the 5 Coins. The browser never showed the literal.
- **Slayer is the most kills held by one unit still on the board**
  (section 5 of the current rules), not the seat's kills: five kills
  shared by three units read 2/5, and the count falls when the unit that
  holds it dies. The engine and the field the harness reads were right;
  the `ACHIEVEMENTS` line now says
  `SLAYER 2/5 (most kills by one living unit)`.
- **The unlocks of the changed technologies are sentences** on the tech
  card and in `tech` (`src/render/technology-unlock-text-v7.ts`): Blast
  Mountain with its +1 population, the Breach, "Road-linked cities: +2
  Coins each turn", and "Build Field Defense: the builder keeps its move
  and attack". The harness printed the raw effect ids for the first two.
- **`options --unit` says why an attack or a Field Defense is not
  offered**, naming the first failed condition of the command query. The
  two reports were rules: a Guard cannot attack after it has moved (it
  never could; a Fighter can), and only the `FIGHTER` and `GUARD` roles
  build Field Defense, never a Marksman, wherever it stands.

## 8. A display rename in the same identity

The Candy `FIGHTER`-role unit is displayed as **Toffee Trooper** (it was
the Gumdrop), at the user's request. The name is the role label of the
Candy registration (`CANDY_ROLE_RULES_V7.FIGHTER.label`), which the Help,
the Gallery, the tech cards, the unit panel, and the log lines read, so
they all changed with it. Nothing persisted holds the name: the role ID
(`FIGHTER`), the asset ids and file names (`chibi-direction-candy-gumdrop`),
the art recipes, and the Normal AI constant `THREATENED_GUMDROP_BIAS_V7`
are unchanged. The Candy overlay, the current rules, the Candy art
fragment, the asset inventory, the screen flow, and the Normal AI document
use the new name.

Two more Candy display names changed in the same identity, after the
Chocolatier art of `pulp_wars-jdb.10` replaced their sprites: the
`KNIGHT`-role unit is the **Chocolate Bunny** (it was the Gummy Bear) and
the `JUGGERNAUT`-role unit the **Gingerbread Giant** (it was the Rock Candy
Golem). As with the Toffee Trooper, only `CANDY_ROLE_RULES_V7.KNIGHT.label`
and `.JUGGERNAUT.label` changed; the role IDs, the asset ids and file names
(`gummy-bear`, `rock-candy-golem`), the art recipes, and every number and
rule are the same.

## 9. Tests

The rule changes moved the pins of about ninety existing test files: the
identity tests, the role, cost, and reward tables, the fortification
examples of every faction (their attackers now have no Explosives where
the test is about the fortification, or expect the Breach where it is
about Explosives), the Candy battle tables, the Showcase income (19 Coins,
was 17), the recorded Normal AI decisions and matches (hashes recomputed;
seeds changed where a match no longer shows what its test needs), and two
captured state fixtures brought to the new ledger.

`tests/unit/ruleset-v7-tuning-1.test.ts` has one block per change A to G
(the exact previews against the resolution through the shared attack
fixture, the cost tables, the reward choices, the Land Grant preview, the
contributor rule on a three-city strip, Breach, Blast Mountain, Field
Defense, and chests by round), and `tests/scripts/play-text-v7.test.ts`
covers `do --end` and the refused `end`.

## 10. Round 2 (tuning 2, `pulp-wars-poc-7r47`)

Three more hand-played games on tuning 1 (a natural game, an
Explosives-and-Commerce game against the Goblins, and a Catapult rush
against the Dinosaurs) led to five decisions of the user on 2026-10-05.
Two change a rule, so the identity is `pulp-wars-poc-7r47` (autosave
`pulpWars.save.v7r47.current`; `7r46` is a prior identity, refused without
migration). No state or event shape changed.

### 10.1 The facts about "being pulled out of position"

The playtest reports said "a garrison that kills is pulled off its city
center" and "the forced advance cost nine units". What the code does:

- **A defender never moves because of a fight it did not start**, and never
  did. In `resolveAttackExchangeV7` (`src/engine/v7/reducer.ts`) the defender after the
  exchange stands at `pushDestination ?? defender.at`: only a Push, a
  Charge! push, a Knockback, or a ram's shove of the _attack_ moves it. A
  retaliation that kills the attacker credits the kill (`defenderKills`) and
  moves nothing. `advances` of `calculateCombatPreviewV7`
  (`src/engine/v7/combat.ts`) is about the attacker only and needs
  `!attackerDies`.
- **So what the players saw was their own attack.** A unit that attacked
  from its city center (or its Field Defense) on its own turn and killed
  moved onto the dead unit's tile, as the rule says, and stood in the open
  for the enemy's turn. That is situation (ii) of the three the reports
  could have meant; (i), a defender moved by a retaliation kill, does not
  exist.

`tests/unit/ruleset-v7-tuning-2.test.ts` pins both: a Guard that kills a
1-HP attacker by retaliation stays (in the open and on its own capital;
nothing moves in the exchange), and a Fighter that kills from its own
capital advances off it.

### 10.2 The decisions

| #   | Decision of the user                                                                                                        | Before (`7r46`)                                                                                                                  | After (`7r47`)                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | A unit that is attacked and kills its attacker is never moved; an attacker that kills takes the tile, except ranged attacks | the defender never moved; a melee attacker advanced; a ranged unit other than the Marksman advanced after a kill from distance 1 | the same for the defender and the melee attacker; **no ranged unit advances**; the preview says "Advances" or "Stays" |
| 2   | A city still cannot train while a unit stands on its center                                                                 | no train cards and no reason in the browser (the harness printed "center occupied")                                              | no rule change; the city panel says "Training blocked: a unit is on the city center"                                  |
| 3   | Knights capture cities                                                                                                      | no Knight-role unit of any faction could capture                                                                                 | the **Human Knight** has `CAPTURE`; the other seven are unchanged                                                     |
| 4   | The level-2 Stockpile stays 4 Coins                                                                                         | 4                                                                                                                                | 4                                                                                                                     |
| 5   | The capital rule of Commerce is shown                                                                                       | the card read "Road-linked cities: +2 Coins each turn"; a city that earned nothing said nothing                                  | no rule change; the card, the city panel, and the harness state the rule and the reason (below)                       |

### 10.3 Who advances

An attacker advances onto the tile of the unit it killed when all of these
hold (the conditions existed before; only the ranged one is new):

- it survives, the target was adjacent, and the target does not rise in
  place (Infect, Bitten);
- **it is not a ranged unit**: its kind's role has range 1
  (`isRangedRoleRuleV7`; new);
- its role advances (`advancesAfterKill`: not a Zombie, Saucer, or
  Mothership);
- it is in land form and the target was in land form or an Egg (a ship, an
  embarked unit, a Gyrocopter never advance; nothing advances onto a ship's
  or an embarked unit's water tile);
- the tile is explored by its owner, is not a Rift, and is enterable (a
  Mountain needs Engineering unless the unit strides or is Mountain-born);
- a Sabretooth, and a rider on its surfacing turn, never advance onto a
  settlement center their owner does not own;
- the neutral Monster never advances.

A Charge! still follows a pushed target under the same conditions, an
Overrun still continues only after an advance, and a Bounce still throws
the attacker back after the advance is decided. None of these was changed.
A melee attacker's advance is **not optional**, also off its own city
center or Field Defense: the user did not ask for that exception.

Every land unit that can attack an adjacent unit, after a kill from
distance 1:

| Unit (faction)                                   | Range | Before `7r47`           | Now      |
| ------------------------------------------------ | ----- | ----------------------- | -------- |
| Marksman (Human)                                 | 1–2   | stayed (since tuning 1) | stays    |
| Spitter (Dinosaur)                               | 1–2   | advanced                | stays    |
| **Grunt** (Martian, the `FIGHTER` role)          | 1–2   | advanced                | stays    |
| Ray Gunner (Martian)                             | 1–2   | advanced                | stays    |
| **Colossus** (Martian, the reward unit)          | 1–2   | advanced                | stays    |
| Snow Hunter (Ice Folk)                           | 1–2   | advanced                | stays    |
| Boulder Yeti (Ice Folk)                          | 1–2   | stayed (role mechanic)  | stays    |
| Clockwork Gunner (Dwarf)                         | 1–2   | stayed (role mechanic)  | stays    |
| Gumball Gunner (Candy)                           | 1–2   | advanced                | stays    |
| Zombie (Undead), Saucer and Mothership (Martian) | 1     | stayed (role mechanic)  | stays    |
| every other range-1 land unit                    | 1     | advanced                | advances |

The units that never attack an adjacent unit never advanced and do not
now: Catapult, Lich, Rocket Cart, Bomb Chucker (range 2 only), Tripod,
Steam Cannon, Pie Launcher (minimum range 2). A Banshee's Wail, a Gyrocopter's
bombing run, and Kaboom are not attacks. A Patrol Boat, Battleship, or
Submarine never advances (ram, shots, and torpedo alike). A Yeti's
Rockfall reaches distance 2 from a range-1 role: that attack never
advanced, and the Yeti's adjacent attack still does.

**To look at in the Martian pass:** the rule follows the role's range, so
the Martian line infantry (the Grunt, a ray pistol with range 2) and the
Colossus no longer take a tile by killing. That is the rule as the user
gave it ("excepting ranged attacks"), applied by the unit's range property;
it was not judged for the Martians.

### 10.4 The Knight-role units and Capture

| Faction  | `KNIGHT`-role unit | Captures before | Captures now |
| -------- | ------------------ | --------------- | ------------ |
| Human    | Knight             | no              | **yes**      |
| Undead   | Vampire            | no              | no           |
| Goblin   | Scrap Buggy        | no              | no           |
| Dinosaur | T-Rex              | no              | no           |
| Martian  | Mothership         | no              | no           |
| Ice Folk | Sabretooth         | no              | no           |
| Dwarf    | Steam Tank         | no              | no           |
| Candy    | Chocolate Bunny    | no              | no           |

What blocked it was the role's `abilities` list (no `CAPTURE`); the Human
Knight's is now `ATTACK`, `CAPTURE`, `OVERRUN`. Capture is the ordinary
`CAPTURE` command with its timing (`captureEligible`: the unit has stood
on the center since its turn began). What reads the ability: the command
query and the reducer, the state check of `captureEligible`, the unit card
("Can't capture." is gone from the Knight's), and the Normal AI, which
treats any unit with the ability as a capturer through the offered
commands; nothing in the AI was changed. A mind-controlled Human Knight
captures for its controller, like any controlled capturing unit.

### 10.5 Commerce as it is coded

**Superseded.** [Round 3](RULESET_7_TUNING_HUMAN.md#64-commerce) replaced
the capital rule described here before it was published: every city a Road
links to another of the player's cities earns, the first capital included.
What follows is the rule as it stood when round 2 was written.

- A player's **first capital** (`originalCapitalCityId`) is the root. Every
  other city the player owns that a Road links to it earns +2 Coins at
  Start Turn. City centers count as Road tiles and Roads join in eight
  directions.
- The first capital earns no land trade itself.
- While the player does not own its first capital, nothing is paid. **No
  other city is promoted**; the root never changes, and a captured foreign
  capital is an ordinary city.
- Goblin Commerce is Plunder and has no land trade.

Shown now: the Commerce card ("Each city linked by Road to your first
capital: +2 Coins each turn"); in the city panel the Land trade +2 stat of
a city that earns, and otherwise one line: "No land trade: no Road link to
your first capital", "No land trade: your first capital is lost", and on
the capital "No land trade: no city is linked by Road to this capital" or
"Land trade: N linked cities earn +2 each". The text harness prints the
same line under each city of `view`. The rule did not change.

### 10.6 Leftovers of tuning 1 settled here

- `scripts/browser-ui-polish-review-v7.ts` expected "Build field defense";
  it expects "Build Field Defense" (the script was not run).
- The `7r46` open item "only the Human Marksman stopped advancing" is
  closed by 10.3.

### 10.7 Tests

`tests/unit/ruleset-v7-tuning-2.test.ts` (the identity; the facts of 10.1;
every faction's adjacent attackers, ranged and melee, with the public
preview equal to the resolution; the Knight's Capture, its timing, and the
other seven; the land trade lines against the engine; the preview note),
`tests/integration/ruleset7-dock-layout-dom.test.ts` (the two city panel
lines), and `tests/scripts/play-text-v7.test.ts` (`advances to x,y`,
`stays`, the land trade line).

## 11. Round 3

Round 3 is its own document:
[the Human tech tree, round 3](RULESET_7_TUNING_HUMAN.md). It ships under
the same identity as round 2 (`pulp-wars-poc-7r47`).
