# Ruleset 7: the Human tech tree, rounds 3 and 4

**Status:** implemented on `pulp-wars-poc-7r47` (bead `pulp_wars-w49.3`).
Round 3 (sections 1 to 10) was played by hand three times;
[round 4](#11-round-4) (section 11) is what those games changed, and has
not been played yet. Where the two differ, section 11 is the rule. [Tuning 1 and its round 2](RULESET_7_TUNING_1.md)
changed numbers and two rules after eight hand-played games. This round
starts from the other end: a unit-by-unit and technology-by-technology
analysis of the Human faction, then the changes it calls for, then three
playtests that would show whether they work. The rules themselves are stated
in [Ruleset 7: current rules](RULESET_7_CURRENT.md); this document is the
reasoning and the record.

The method is the one the user set on 2026-10-05: scenario reasoning and a
few hand-played games, never counts of AI-against-AI results. The numbers
below come from `scripts/human-tuning-analysis-v7.ts`, which asks the
engine's exact public combat preview about constructed positions and plays
no match. Water is out of scope.

**What the user asked for**, in short: every technology should be worth
buying at some moment, and every unit should have a job. The Knight exists
to reach and destroy fragile backline units, many in one turn, and may be
useless against Fighters and Guards. The Catapult grinds down a turtle that
cannot reach it. A terrain's defence should come from a technology and be
just large enough to decide whether a Knight kills a basic Fighter in one
attack. Explosives should feel like explosives. More income is the wrong
reward for Commerce when Coins already pile up.

## 1. The changes

| #   | Change                       | Before                                                                                                          | Now                                                                                                                                                                                             | Shared with other factions                       |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Knight Attack                | 3                                                                                                               | **4**                                                                                                                                                                                           | no (the Human Knight only)                       |
| 2   | Forest cover                 | every ground unit in a Forest defends at × 1.5                                                                  | only a unit whose owner has **Forestry**; a Mountain's × 1.5 is unchanged and needs no technology                                                                                               | **yes**: every faction's tree has the node       |
| 3   | Blast Mountain (Explosives)  | 3 Coins, own territory only: the Mountain becomes Grass and its city gains +1 population                        | also an **explosion**: 5 damage to every unit on the tile and on the eight around it, friend and foe; also allowed outside the territory on a Mountain next to an own land unit (no population) | **yes**                                          |
| 4   | Commerce: land trade         | +2 Coins for each city linked by Road to the first capital; the capital earns nothing; nothing while it is lost | **+2 Coins for every city linked by Road to another of the player's cities**, the first capital included; no capital rule                                                                       | yes (not the Goblins, whose Commerce is Plunder) |
| 5   | Commerce: hiring             | none                                                                                                            | each **Market hires** one land unit a turn on its own tile at 1.5 × the price, without the city action; its city may hold 1 unit above its capacity                                             | **yes** (the Goblins too)                        |
| 6   | Militia (the level-3 reward) | one free Fighter                                                                                                | **two** free Fighters                                                                                                                                                                           | no                                               |

Unchanged on purpose: the Catapult, the Marksman, the Guard, the Raider, the
Captain, the Juggernaut, the Stockpile (4 Coins, the user's decision), the
research costs, and the rule of round 2 that no ranged unit advances.

The identity stays `pulp-wars-poc-7r47`: round 2 took it and was never
published, so rounds 2 and 3 ship together. One command (`HIRE`), one
explosion cause (`BLAST`), and a nullable `cityId` on `MOUNTAIN_BLASTED` are
new in the command and event shapes; the state shape did not change.

### 1.1 Decisions that are forks, for the user to overrule

These are choices about what the game is, not numbers. Each is implemented.

1. **Forest cover is gated for every faction, not only for the Humans.** The
   technology nodes are shared, and a rule that held for one faction's
   forests only would be harder to explain than the rule itself. The cost is
   that every faction's early game changes: nobody has Forest cover until
   Forestry (tier 2, 7 Coins with one city). The Normal AI researches as it
   did; it was not taught to want Forestry.
2. **Mountain cover stays without a technology.** A Human unit cannot stand
   on a Mountain before Engineering, so for the Humans it already belongs
   to the mining branch. Gating it formally would change only the units
   that are born to mountains (the Ice Folk) and units pushed onto one.
3. **A Knight kills a full-HP Fighter in the open.** The user's two
   statements pull apart: "useless against Fighters" and "the terrain bonus
   decides whether the Knight one-shots the basic Fighter". The second can
   only be true if the Knight does kill a Fighter that has no bonus, so
   Attack is 4. A Fighter is safe from the one-shot in a Forest with
   Forestry, on a Mountain, on a Field Defense, and on a walled center; a
   Guard is safe everywhere.
4. **Blast Mountain works outside the player's territory**, on any Mountain
   next to one of its land units, enemy territory included, and removes the
   Mountain for good. Without this it could never touch a line anchored on
   Mountains, which is the case it is for.
5. **A hired unit may take its city one above its capacity.** Without this,
   hiring would only speed up refilling, and Coins would still be useless
   at the cap. With it the rich get at most one more unit per Market city.

## 2. Scenario analysis

### 2.0 Numbers from the script

`npx tsx scripts/human-tuning-analysis-v7.ts` printed what follows (the
matchup matrix, six played-out scenarios, the technology price list, and
the economy price list). It was printed again with the rules of round 4
([section 11](#11-round-4)): the Field Defense table is at +2, the
technology prices are by owned technologies, and land trade is 1; the
discussion in sections 2.1 to 10 was written on the round-3 numbers.

#### Matchup matrix

Each cell: damage dealt / damage taken in the first attack (both units at full HP), then × the number of attacks by fresh full-HP attackers of that kind that kill the defender. Ranged units attack from their full range unless marked (adjacent); a Raider marked (Charge) has moved two tiles with Raiding.

**Open ground**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp | Goblin 1c 6hp | Orc Brute 3c 15hp | Gumball Gunner 3c 8hp | T-Rex 14c 28hp |
| --------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ---------------- | -------------- | ------------------ | ------------- | ----------------- | --------------------- | -------------- |
| Fighter (2c, 12, 2/2)             | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Guard (3c, 17, 1.5/3)             | 3/5 ×4          | 2/9 ×6        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 5/0 ×2           | 4/2 ×3         | 2/13 ×15           | 5/1 ×2        | 3/7 ×5            | 4/2 ×2                | 3/5 ×8         |
| Raider (4c, 12, 2/1)              | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Raider (Charge) (4c, 12, 2/1)     | 8/4 ×2          | 7/7 ×3        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 6/10 ×6            | 6/0 ×1        | 7/5 ×2            | 8/0 ×1                | 8/4 ×3         |
| Marksman (4c, 12, 2/1)            | 5/0 ×3          | 4/0 ×4        | 6/0 ×2         | 6/2 ×2           | 6/0 ×2          | 7/0 ×2           | 6/0 ×2         | 3/0 ×10            | 6/0 ×1        | 4/0 ×3            | 6/2 ×2                | 5/0 ×5         |
| Marksman (adjacent) (4c, 12, 2/1) | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Captain (5c, 10, 1/1)             | 2/6 ×6          | 1/10 ×11      | 2/2 ×5         | 2/2 ×5           | 2/2 ×4          | 3/0 ×3           | 2/2 ×5         | 1/10 ×29           | 3/1 ×2        | 1/8 ×9            | 2/2 ×3                | 2/6 ×12        |
| Catapult (8c, 10, 3/0.5)          | 8/0 ×2          | 7/0 ×3        | 10/0 ×2        | 10/0 ×2          | 10/0 ×1         | 10/0 ×1          | 10/0 ×2        | 6/0 ×6             | 6/0 ×1        | 7/0 ×2            | 8/0 ×1                | 8/0 ×3         |
| Knight (9c, 13, 4/1)              | 12/0 ×1         | 10/6 ×2       | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 9/9 ×4             | 6/0 ×1        | 11/4 ×2           | 8/0 ×1                | 12/3 ×3        |
| Juggernaut (—c, 40, 4/4)          | 12/0 ×1         | 10/6 ×2       | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 9/9 ×4             | 6/0 ×1        | 11/4 ×2           | 8/0 ×1                | 12/3 ×3        |
| Goblin (1c, 6, 1.5/0.5)           | 3/5 ×4          | 2/6 ×6        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 5/0 ×2           | 4/2 ×3         | 2/6 ×15            | 5/1 ×2        | 3/6 ×5            | 4/2 ×2                | 3/5 ×8         |
| Orc Brute (3c, 15, 2/2.5)         | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Gumball Gunner (3c, 8, 2/1)       | 5/0 ×3          | 4/0 ×4        | 6/0 ×2         | 6/2 ×2           | 6/0 ×2          | 7/0 ×2           | 6/0 ×2         | 3/0 ×10            | 6/0 ×1        | 4/0 ×3            | 6/2 ×2                | 5/0 ×5         |
| T-Rex (14c, 28, 4/2)              | 12/0 ×1         | 10/6 ×2       | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 9/9 ×4             | 6/0 ×1        | 11/4 ×2           | 8/0 ×1                | 12/3 ×3        |

**Cover x 1.5: the defender in Forest with its owner's Forestry (a Mountain gives the same numbers with no technology)**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp | Goblin 1c 6hp | Orc Brute 3c 15hp | Gumball Gunner 3c 8hp | T-Rex 14c 28hp |
| --------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ---------------- | -------------- | ------------------ | ------------- | ----------------- | --------------------- | -------------- |
| Fighter (2c, 12, 2/2)             | 4/5 ×3          | 3/8 ×5        | 5/2 ×3         | 5/2 ×3           | 5/2 ×2          | 7/0 ×2           | 5/2 ×3         | 2/12 ×12           | 6/0 ×1        | 3/6 ×4            | 5/2 ×2                | 4/5 ×6         |
| Guard (3c, 17, 1.5/3)             | 2/5 ×4          | 2/9 ×7        | 3/2 ×3         | 3/2 ×3           | 3/2 ×3          | 5/0 ×2           | 3/2 ×4         | 1/13 ×19           | 5/1 ×2        | 2/7 ×6            | 3/2 ×3                | 2/5 ×9         |
| Raider (4c, 12, 2/1)              | 4/5 ×3          | 3/8 ×5        | 5/2 ×3         | 5/2 ×3           | 5/2 ×2          | 7/0 ×2           | 5/2 ×3         | 2/12 ×12           | 6/0 ×1        | 3/6 ×4            | 5/2 ×2                | 4/5 ×6         |
| Raider (Charge) (4c, 12, 2/1)     | 7/4 ×2          | 5/7 ×3        | 9/1 ×2         | 9/1 ×2           | 9/1 ×2          | 10/0 ×1          | 9/1 ×2         | 5/10 ×7            | 6/0 ×1        | 6/5 ×3            | 8/0 ×1                | 7/4 ×4         |
| Marksman (4c, 12, 2/1)            | 4/0 ×3          | 3/0 ×5        | 5/0 ×3         | 5/2 ×3           | 5/0 ×2          | 7/0 ×2           | 5/0 ×3         | 2/0 ×12            | 6/0 ×1        | 3/0 ×4            | 5/2 ×2                | 4/0 ×6         |
| Marksman (adjacent) (4c, 12, 2/1) | 4/5 ×3          | 3/8 ×5        | 5/2 ×3         | 5/2 ×3           | 5/2 ×2          | 7/0 ×2           | 5/2 ×3         | 2/12 ×12           | 6/0 ×1        | 3/6 ×4            | 5/2 ×2                | 4/5 ×6         |
| Captain (5c, 10, 1/1)             | 1/6 ×8          | 1/10 ×13      | 2/2 ×5         | 2/2 ×5           | 2/2 ×5          | 3/0 ×4           | 2/2 ×6         | 1/10 ×∞            | 3/1 ×2        | 1/8 ×11           | 2/2 ×4                | 1/6 ×18        |
| Catapult (8c, 10, 3/0.5)          | 7/0 ×2          | 5/0 ×3        | 9/0 ×2         | 9/0 ×2           | 9/0 ×2          | 10/0 ×1          | 9/0 ×2         | 5/0 ×7             | 6/0 ×1        | 6/0 ×3            | 8/0 ×1                | 7/0 ×4         |
| Knight (9c, 13, 4/1)              | 10/3 ×2         | 8/6 ×2        | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 7/9 ×5             | 6/0 ×1        | 9/4 ×2            | 8/0 ×1                | 10/3 ×3        |
| Juggernaut (—c, 40, 4/4)          | 10/3 ×2         | 8/6 ×2        | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 7/9 ×5             | 6/0 ×1        | 9/4 ×2            | 8/0 ×1                | 10/3 ×3        |
| Goblin (1c, 6, 1.5/0.5)           | 2/5 ×4          | 2/6 ×7        | 3/2 ×3         | 3/2 ×3           | 3/2 ×3          | 5/0 ×2           | 3/2 ×4         | 1/6 ×19            | 5/1 ×2        | 2/6 ×6            | 3/2 ×3                | 2/5 ×9         |
| Orc Brute (3c, 15, 2/2.5)         | 4/5 ×3          | 3/8 ×5        | 5/2 ×3         | 5/2 ×3           | 5/2 ×2          | 7/0 ×2           | 5/2 ×3         | 2/12 ×12           | 6/0 ×1        | 3/6 ×4            | 5/2 ×2                | 4/5 ×6         |
| Gumball Gunner (3c, 8, 2/1)       | 4/0 ×3          | 3/0 ×5        | 5/0 ×3         | 5/2 ×3           | 5/0 ×2          | 7/0 ×2           | 5/0 ×3         | 2/0 ×12            | 6/0 ×1        | 3/0 ×4            | 5/2 ×2                | 4/0 ×6         |
| T-Rex (14c, 28, 4/2)              | 10/3 ×2         | 8/6 ×2        | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 7/9 ×5             | 6/0 ×1        | 9/4 ×2            | 8/0 ×1                | 10/3 ×3        |

**Field Defense (+2 Defense), the attacker without Explosives**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp | Goblin 1c 6hp | Orc Brute 3c 15hp | Gumball Gunner 3c 8hp | T-Rex 14c 28hp |
| --------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ---------------- | -------------- | ------------------ | ------------- | ----------------- | --------------------- | -------------- |
| Fighter (2c, 12, 2/2)             | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Guard (3c, 17, 1.5/3)             | 2/5 ×5          | 2/9 ×7        | 2/2 ×4         | 2/2 ×4           | 2/2 ×4          | 3/0 ×3           | 2/2 ×5         | 1/13 ×19           | 3/1 ×2        | 2/7 ×6            | 2/2 ×3                | 2/5 ×11        |
| Raider (4c, 12, 2/1)              | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Raider (Charge) (4c, 12, 2/1)     | 6/4 ×2          | 5/7 ×3        | 7/1 ×2         | 7/1 ×2           | 7/1 ×2          | 7/0 ×2           | 7/1 ×2         | 5/10 ×7            | 6/0 ×1        | 5/5 ×3            | 7/1 ×2                | 6/4 ×4         |
| Marksman (4c, 12, 2/1)            | 3/0 ×3          | 3/0 ×5        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            | 4/0 ×2        | 3/0 ×4            | 4/2 ×2                | 3/0 ×7         |
| Marksman (adjacent) (4c, 12, 2/1) | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Captain (5c, 10, 1/1)             | 1/6 ×9          | 1/10 ×14      | 1/2 ×8         | 1/2 ×8           | 1/2 ×7          | 1/0 ×6           | 1/2 ×9         | 1/10 ×∞            | 1/1 ×4        | 1/8 ×12           | 1/2 ×6                | 1/6 ×21        |
| Catapult (8c, 10, 3/0.5)          | 6/0 ×2          | 5/0 ×3        | 7/0 ×2         | 7/0 ×2           | 7/0 ×2          | 7/0 ×2           | 7/0 ×2         | 5/0 ×7             | 6/0 ×1        | 5/0 ×3            | 7/0 ×2                | 6/0 ×4         |
| Knight (9c, 13, 4/1)              | 9/3 ×2          | 8/6 ×2        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 7/9 ×5             | 6/0 ×1        | 8/4 ×2            | 8/0 ×1                | 9/3 ×3         |
| Juggernaut (—c, 40, 4/4)          | 9/3 ×2          | 8/6 ×2        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 7/9 ×5             | 6/0 ×1        | 8/4 ×2            | 8/0 ×1                | 9/3 ×3         |
| Goblin (1c, 6, 1.5/0.5)           | 2/5 ×5          | 2/6 ×7        | 2/2 ×4         | 2/2 ×4           | 2/2 ×4          | 3/0 ×3           | 2/2 ×5         | 1/6 ×19            | 3/1 ×2        | 2/6 ×6            | 2/2 ×3                | 2/5 ×11        |
| Orc Brute (3c, 15, 2/2.5)         | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Gumball Gunner (3c, 8, 2/1)       | 3/0 ×3          | 3/0 ×5        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            | 4/0 ×2        | 3/0 ×4            | 4/2 ×2                | 3/0 ×7         |
| T-Rex (14c, 28, 4/2)              | 9/3 ×2          | 8/6 ×2        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 7/9 ×5             | 6/0 ×1        | 8/4 ×2            | 8/0 ×1                | 9/3 ×3         |

**Walled city center (+2 Defense), the attacker without Explosives**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp | Goblin 1c 6hp | Orc Brute 3c 15hp | Gumball Gunner 3c 8hp | T-Rex 14c 28hp |
| --------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ---------------- | -------------- | ------------------ | ------------- | ----------------- | --------------------- | -------------- |
| Fighter (2c, 12, 2/2)             | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Guard (3c, 17, 1.5/3)             | 2/5 ×5          | 2/9 ×7        | 2/2 ×4         | 2/2 ×4           | 2/2 ×4          | 3/0 ×3           | 2/2 ×5         | 1/13 ×19           | 3/1 ×2        | 2/7 ×6            | 2/2 ×3                | 2/5 ×11        |
| Raider (4c, 12, 2/1)              | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Raider (Charge) (4c, 12, 2/1)     | 6/4 ×2          | 5/7 ×3        | 7/1 ×2         | 7/1 ×2           | 7/1 ×2          | 7/0 ×2           | 7/1 ×2         | 5/10 ×7            | 6/0 ×1        | 5/5 ×3            | 7/1 ×2                | 6/4 ×4         |
| Marksman (4c, 12, 2/1)            | 3/0 ×3          | 3/0 ×5        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            | 4/0 ×2        | 3/0 ×4            | 4/2 ×2                | 3/0 ×7         |
| Marksman (adjacent) (4c, 12, 2/1) | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Captain (5c, 10, 1/1)             | 1/6 ×9          | 1/10 ×14      | 1/2 ×8         | 1/2 ×8           | 1/2 ×7          | 1/0 ×6           | 1/2 ×9         | 1/10 ×∞            | 1/1 ×4        | 1/8 ×12           | 1/2 ×6                | 1/6 ×21        |
| Catapult (8c, 10, 3/0.5)          | 6/0 ×2          | 5/0 ×3        | 7/0 ×2         | 7/0 ×2           | 7/0 ×2          | 7/0 ×2           | 7/0 ×2         | 5/0 ×7             | 6/0 ×1        | 5/0 ×3            | 7/0 ×2                | 6/0 ×4         |
| Knight (9c, 13, 4/1)              | 9/3 ×2          | 8/6 ×2        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 7/9 ×5             | 6/0 ×1        | 8/4 ×2            | 8/0 ×1                | 9/3 ×3         |
| Juggernaut (—c, 40, 4/4)          | 9/3 ×2          | 8/6 ×2        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 7/9 ×5             | 6/0 ×1        | 8/4 ×2            | 8/0 ×1                | 9/3 ×3         |
| Goblin (1c, 6, 1.5/0.5)           | 2/5 ×5          | 2/6 ×7        | 2/2 ×4         | 2/2 ×4           | 2/2 ×4          | 3/0 ×3           | 2/2 ×5         | 1/6 ×19            | 3/1 ×2        | 2/6 ×6            | 2/2 ×3                | 2/5 ×11        |
| Orc Brute (3c, 15, 2/2.5)         | 3/5 ×3          | 3/8 ×5        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 4/0 ×3           | 4/2 ×3         | 2/12 ×12           | 4/0 ×2        | 3/6 ×4            | 4/2 ×2                | 3/5 ×7         |
| Gumball Gunner (3c, 8, 2/1)       | 3/0 ×3          | 3/0 ×5        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            | 4/0 ×2        | 3/0 ×4            | 4/2 ×2                | 3/0 ×7         |
| T-Rex (14c, 28, 4/2)              | 9/3 ×2          | 8/6 ×2        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 7/9 ×5             | 6/0 ×1        | 8/4 ×2            | 8/0 ×1                | 9/3 ×3         |

**Walled city center, the attacker with Explosives (Breach: a melee attack ignores the Walls)**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp | Goblin 1c 6hp | Orc Brute 3c 15hp | Gumball Gunner 3c 8hp | T-Rex 14c 28hp |
| --------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ---------------- | -------------- | ------------------ | ------------- | ----------------- | --------------------- | -------------- |
| Fighter (2c, 12, 2/2)             | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Guard (3c, 17, 1.5/3)             | 3/5 ×4          | 2/9 ×6        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 5/0 ×2           | 4/2 ×3         | 2/13 ×15           | 5/1 ×2        | 3/7 ×5            | 4/2 ×2                | 3/5 ×8         |
| Raider (4c, 12, 2/1)              | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Raider (Charge) (4c, 12, 2/1)     | 8/4 ×2          | 7/7 ×3        | 10/1 ×2        | 10/1 ×2          | 10/0 ×1         | 10/0 ×1          | 10/1 ×2        | 6/10 ×6            | 6/0 ×1        | 7/5 ×2            | 8/0 ×1                | 8/4 ×3         |
| Marksman (4c, 12, 2/1)            | 3/0 ×3          | 3/0 ×5        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            | 4/0 ×2        | 3/0 ×4            | 4/2 ×2                | 3/0 ×7         |
| Marksman (adjacent) (4c, 12, 2/1) | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Captain (5c, 10, 1/1)             | 2/6 ×6          | 1/10 ×11      | 2/2 ×5         | 2/2 ×5           | 2/2 ×4          | 3/0 ×3           | 2/2 ×5         | 1/10 ×29           | 3/1 ×2        | 1/8 ×9            | 2/2 ×3                | 2/6 ×12        |
| Catapult (8c, 10, 3/0.5)          | 6/0 ×2          | 5/0 ×3        | 7/0 ×2         | 7/0 ×2           | 7/0 ×2          | 7/0 ×2           | 7/0 ×2         | 5/0 ×7             | 6/0 ×1        | 5/0 ×3            | 7/0 ×2                | 6/0 ×4         |
| Knight (9c, 13, 4/1)              | 12/0 ×1         | 10/6 ×2       | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 9/9 ×4             | 6/0 ×1        | 11/4 ×2           | 8/0 ×1                | 12/3 ×3        |
| Juggernaut (—c, 40, 4/4)          | 12/0 ×1         | 10/6 ×2       | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 9/9 ×4             | 6/0 ×1        | 11/4 ×2           | 8/0 ×1                | 12/3 ×3        |
| Goblin (1c, 6, 1.5/0.5)           | 3/5 ×4          | 2/6 ×6        | 4/2 ×3         | 4/2 ×3           | 4/2 ×3          | 5/0 ×2           | 4/2 ×3         | 2/6 ×15            | 5/1 ×2        | 3/6 ×5            | 4/2 ×2                | 3/5 ×8         |
| Orc Brute (3c, 15, 2/2.5)         | 5/5 ×3          | 4/8 ×4        | 6/2 ×2         | 6/2 ×2           | 6/2 ×2          | 7/0 ×2           | 6/2 ×2         | 3/12 ×10           | 6/0 ×1        | 4/6 ×3            | 6/2 ×2                | 5/5 ×5         |
| Gumball Gunner (3c, 8, 2/1)       | 3/0 ×3          | 3/0 ×5        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            | 4/0 ×2        | 3/0 ×4            | 4/2 ×2                | 3/0 ×7         |
| T-Rex (14c, 28, 4/2)              | 12/0 ×1         | 10/6 ×2       | 12/0 ×1        | 12/0 ×1          | 10/0 ×1         | 10/0 ×1          | 13/0 ×1        | 9/9 ×4             | 6/0 ×1        | 11/4 ×2           | 8/0 ×1                | 12/3 ×3        |

#### Scenarios

- **A Knight rides down a backline in the open (Marksman, Catapult, Captain, Raider in a row)**
  - Knight (13 HP) attacks Marksman (12 HP): deals 12, kills, takes 0, advances
  - Knight (13 HP) attacks Catapult (10 HP): deals 10, kills, takes 0, advances
  - Knight (13 HP) attacks Captain (10 HP): deals 10, kills, takes 0, advances
  - Knight (13 HP) attacks Raider (12 HP): deals 12, kills, takes 0, advances
- **A Knight meets Fighters in the open, then a Guard**
  - Knight (13 HP) attacks Fighter (12 HP): deals 12, kills, takes 0, advances
  - Knight (13 HP) attacks Fighter (12 HP): deals 12, kills, takes 0, advances
  - Knight (13 HP) attacks Guard (17 HP): deals 10, takes 6
- **Three Catapults fire at a Guard on a walled center (one enemy turn)**
  - Catapult (10 HP) attacks Guard (17 HP): deals 5, takes 0
  - Catapult (10 HP) attacks Guard (12 HP): deals 6, takes 0
  - Catapult (10 HP) attacks Guard (6 HP): deals 6, kills, takes 0
- **Three Goblins with Gang Up attack a Human Guard on a walled center (one Goblin turn; note for the Goblin pass)**
  - Goblin (6 HP) attacks Guard (17 HP): deals 6, takes 6, dies, Gang Up +2
  - Goblin (6 HP) attacks Guard (11 HP): deals 5, takes 6, dies, Gang Up +1
  - Goblin (6 HP) attacks Guard (6 HP): deals 3, takes 6, dies
- **Three Human Fighters attack a Human Guard on a walled center (the same without Gang Up)**
  - Fighter (12 HP) attacks Guard (17 HP): deals 3, takes 8
  - Fighter (12 HP) attacks Guard (14 HP): deals 3, takes 7
  - Fighter (12 HP) attacks Guard (11 HP): deals 3, takes 7
- **Two Marksmen shoot a Fighter in the open from range 2, then a Fighter finishes it**
  - Marksman (12 HP) attacks Fighter (12 HP): deals 5, takes 0
  - Marksman (12 HP) attacks Fighter (7 HP): deals 6, takes 0
  - Fighter (12 HP) attacks Fighter (1 HP): deals 1, kills, takes 0, advances

- **Blast Mountain** (3 Coins): 5 damage to every unit on the Mountain and on the eight tiles around it. Against full-HP units: Fighter 12→7, Guard 17→12, Raider 12→7, Marksman 12→7, Captain 10→5, Catapult 10→5, Knight 13→8, Juggernaut 40→35; the unit on the tile also loses the Mountain's cover.

#### Human technologies (as coded)

| Branch     | Technology     | Tier | After          | Cost as the 2nd / 8th / 16th technology | Unlocks (as coded)                                                                             |
| ---------- | -------------- | ---- | -------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SETTLEMENT | GATHERING      | 1    | —              | 5 / 17 / 33                             | reveals FERTILE_GROUND, HARVEST_FRUIT                                                          |
| SETTLEMENT | FARMING        | 2    | GATHERING      | 7 / 19 / 35                             | BUILD_FARM, CONNECTED_FARM_VISUALS                                                             |
| SETTLEMENT | MILLING        | 3    | FARMING        | 9 / 21 / 37                             | BUILD_WINDMILL, ECONOMIC_FORMULA, ADJACENT_START_TURN_HEALING                                  |
| SETTLEMENT | ADMINISTRATION | 2    | GATHERING      | 7 / 19 / 35                             | unit Captain, CAPTAIN_SUPPORT, BUILD_MARKET, DISBAND                                           |
| SETTLEMENT | PLANNING       | 3    | ADMINISTRATION | 9 / 21 / 37                             | OWNED_CITY_CAPACITY_BONUS, LAND_GRANT                                                          |
| WILDS      | HUNTING        | 1    | —              | 5 / 17 / 33                             | HUNT_GAME                                                                                      |
| WILDS      | FORESTRY       | 2    | HUNTING        | 7 / 19 / 35                             | BUILD_LUMBER_CAMP, CLEAR_FOREST, FOREST_COVER                                                  |
| WILDS      | SAWMILLING     | 3    | FORESTRY       | 9 / 21 / 37                             | BUILD_SAWMILL, ECONOMIC_FORMULA, unit Catapult                                                 |
| WILDS      | MARKSMANSHIP   | 2    | HUNTING        | 7 / 19 / 35                             | unit Marksman                                                                                  |
| WILDS      | FIELDCRAFT     | 3    | MARKSMANSHIP   | 9 / 21 / 37                             | REPLANT_FOREST, FOREST_MOVEMENT_FREEDOM, FOREST_MARCH, ROLE_SIGHT                              |
| MOBILITY   | SCOUTING       | 1    | —              | 5 / 17 / 33                             | unit Raider, ROLE_SIGHT                                                                        |
| MOBILITY   | ROADS          | 2    | SCOUTING       | 7 / 19 / 35                             | BUILD_ROAD, ROAD_MOVEMENT, LAND_ROAD_POPULATION                                                |
| MOBILITY   | COMMERCE       | 3    | ROADS          | 9 / 21 / 37                             | LAND_TRADE_INCOME, HIRE                                                                        |
| MOBILITY   | RAIDING        | 2    | SCOUTING       | 7 / 19 / 35                             | PILLAGE, CHARGE_BONUS                                                                          |
| MOBILITY   | CHIVALRY       | 3    | RAIDING        | 9 / 21 / 37                             | unit Knight, OVERRUN, CULTIVATE_FOREST                                                         |
| INDUSTRY   | DRILL          | 1    | —              | 5 / 17 / 33                             | reveals ORE, unit Guard, FIRST_HOSTILE_CAPTURE_SPOILS                                          |
| INDUSTRY   | ENGINEERING    | 2    | DRILL          | 7 / 19 / 35                             | MOUNTAIN_MOVEMENT, HIGH_GROUND_VISION, BUILD_MINE, BUILD_WORKSHOP, REDEVELOP, ECONOMIC_FORMULA |
| INDUSTRY   | METALLURGY     | 3    | ENGINEERING    | 9 / 21 / 37                             | BUILD_FORGE, ECONOMIC_FORMULA, ARMS_INDUSTRY_DISCOUNT                                          |
| INDUSTRY   | FORTIFICATION  | 2    | DRILL          | 7 / 19 / 35                             | BUILD_FIELD_DEFENSE                                                                            |
| INDUSTRY   | EXPLOSIVES     | 3    | FORTIFICATION  | 9 / 21 / 37                             | BLAST_MOUNTAIN, MELEE_FIELD_DEMOLITION                                                         |

The first technology of a match is free. A technology costs its tier's base (5 / 7 / 9) plus 2 Coins for each technology the player already owns beyond the first; the number of cities does not matter (tuning 4).

#### Economy price list

| Source            | Technology     | Cost            | Population                                                        | Coins per population |
| ----------------- | -------------- | --------------- | ----------------------------------------------------------------- | -------------------- |
| HARVEST_FRUIT     | GATHERING      | 2               | +1 permanent                                                      | 2.0                  |
| HUNT_GAME         | HUNTING        | 2               | +1 permanent                                                      | 2.0                  |
| BUILD_FARM        | FARMING        | 5               | +2 live                                                           | 2.5                  |
| BUILD_LUMBER_CAMP | FORESTRY       | 3               | +1 live                                                           | 3.0                  |
| BUILD_MINE        | ENGINEERING    | 5               | +2 live                                                           | 2.5                  |
| BUILD_WINDMILL    | MILLING        | 5               | by adjacent contributors (a Market pays Coins instead)            | —                    |
| BUILD_SAWMILL     | SAWMILLING     | 5               | by adjacent contributors (a Market pays Coins instead)            | —                    |
| BUILD_FORGE       | METALLURGY     | 6               | by adjacent contributors (a Market pays Coins instead)            | —                    |
| BUILD_WORKSHOP    | ENGINEERING    | 4               | by adjacent contributors (a Market pays Coins instead)            | —                    |
| BUILD_MARKET      | ADMINISTRATION | 6               | by adjacent contributors (a Market pays Coins instead)            | —                    |
| BLAST_MOUNTAIN    | EXPLOSIVES     | 3               | +1 permanent (own territory)                                      | 3.0                  |
| Monument          | an achievement | 0               | +2 live, one per city                                             | 0                    |
| Road link         | ROADS          | 2 per Road tile | +1 live to each linked city and +1 to the capital per linked city | —                    |

A city of level L needs L + 1 population to reach level L + 1, so levels 2, 3, 4, 5, 6 cost 2, 3, 4, 5, 6 more population (20 in all for level 6).

Level rewards (tuning 4): level 2 Scouts (the survey and a free Raider) or Stockpile (4 Coins); level 3 Walls or Militia (one Fighter); level 4 Boom, Treasury (6 Coins) or Barracks; level 5+ Barracks or Treasury (6 Coins), and in the first capital, once, the Juggernaut.

Unit capacity of a city (Human): level + 1, +1 with Planning: L1 2/3, L2 3/4, L3 4/5, L4 5/6, L5 6/7 (without / with Planning). One training per city per turn; with Commerce each Market hires one more at 1.5× (a Fighter 3, Guard 5, Raider 6, Marksman 6, Captain 8, Catapult 12, Knight 14 Coins), and the Market's city may hold 1 unit above its capacity.

Land Grant (Planning, a level-3 city, once): 1 tiles 6, 3 tiles 6, 5 tiles 10, 8 tiles 16 Coins.

### 2.1 What the matrix says

- **The Knight does its job at Attack 4 and did not at 3.** At Attack 3 it
  dealt 10 of 12 to a Raider or a Marksman and 8 to a Fighter: it killed
  only Catapults and Captains in one attack, so an Overrun chain stopped at
  the first archer. At 4 it kills a Raider, Marksman, Captain, Catapult, or
  another Knight in one attack, in the open and in cover, takes nothing
  back from a unit it kills, and rides on (the first scenario: four units
  in one turn). It deals 12 to a Fighter in the open (a kill) and 10 to one
  in cover, on a Field Defense, or on a walled center (no kill, 3 back). It
  never kills a Guard in one attack (10 of 17, and 6 back: two Guards kill
  it).
- **The breakpoint is where the user wanted it.** Any one of Forestry in a
  Forest, a Mountain, a Field Defense, or Walls turns the Knight's 12 into
  10 against a Fighter. So three technologies (Forestry, Engineering,
  Fortification) and the Walls reward now each answer the same threat, and
  a player who meets Knights has a reason to buy the one that fits its
  land.
- **The Catapult is a strong siege unit and nothing reaches it but a fast
  unit.** It takes nothing back, kills a Fighter on a walled center in two
  shots and a Guard there in three (the third scenario), and dies to one
  attack of a Knight or a charging Raider and to two of anything else. It
  was left alone.
- **The Marksman does not crowd out the Fighter.** It deals exactly a
  Fighter's damage for twice the price, with half the Defense; what it buys
  is that the damage is unanswered from range 2. It no longer advances
  (round 2) and it now dies to one Knight attack even in a Forest. Left
  alone.
- **The Guard holds.** On a walled center three Fighters deal it 9 in a
  turn and lose 22 HP doing it; three Goblins with Gang Up deal it 14 of 17
  and all three die on its retaliation (the fourth scenario). One more
  cheap attacker kills it, at 4 Coins and four dead Goblins for a 3-Coin
  unit. That is not a Human defect. **For the Goblin pass:** Gang Up raises
  a 1-Coin unit's hit on a walled Guard from 2 to 6; whether that is right
  is a Goblin question.
- **The Raider is a Fighter with Move 2 and less Defense** until Raiding:
  then a charging Raider kills a Captain or a Catapult in one attack and
  deals 10 of 12 to a Marksman. It is the cheap, early, weaker hunter (tier
  1 plus tier 2, 4 Coins) against the Knight's tier 3 and 9 Coins. Left
  alone.
- **The Captain is a bad fighter by design**; its job is Rally and Tend.
  Nothing in the matrix argues for a change, and nothing here tested its
  job.
- **The Juggernaut and the Knight now have the same Attack.** The
  Juggernaut keeps what makes it a siege unit: 40 HP, Defense 4, Push.

## 3. Every Human technology

Costs are for 1 / 3 / 5 cities. "When" is the honest answer to: at what
moment, against what, would a thoughtful player buy this instead of
something else? The naval branch is left out.

| Technology     | Tier | Cost        | Gives                                                                                         | When a thoughtful player buys it                                                                                                                           | Verdict                     |
| -------------- | ---- | ----------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Gathering      | 1    | 5 / 7 / 9   | Harvest Fruit (2 Coins, +1); shows Fertile Ground                                             | first, when the capital has Fruit: the cheapest population there is                                                                                        | good                        |
| Hunting        | 1    | 5 / 7 / 9   | Hunt Game (2 Coins, +1)                                                                       | first, when the capital has Game instead                                                                                                                   | good                        |
| Scouting       | 1    | 5 / 7 / 9   | Raider (Move 2, Sight 2)                                                                      | first on a large map, to find and take villages before the neighbour                                                                                       | good                        |
| Drill          | 1    | 5 / 7 / 9   | Guard; shows Ore; +2 Coins for a first capture                                                | first when a neighbour is close; the unit a Knight cannot kill                                                                                             | good                        |
| Farming        | 2    | 7 / 11 / 15 | Farm (5 Coins, +2)                                                                            | as soon as a city has Fertile Ground                                                                                                                       | good                        |
| Administration | 2    | 7 / 11 / 15 | Captain; Market (up to 3 Coins a turn); Disband                                               | when a city has two kinds of building for a Market; now also the building that hires                                                                       | good                        |
| Forestry       | 2    | 7 / 11 / 15 | Lumber Camp (3 Coins, +1); Clear Forest (+1 Coin); **Forest cover**                           | when the front or the cities stand in woods, or on the way to Catapults. Before this round its own content was the worst population price in the tree      | good (was weak)             |
| Marksmanship   | 2    | 7 / 11 / 15 | Marksman                                                                                      | to defend a center or a chokepoint with unanswered damage, or against slow melee armies                                                                    | good                        |
| Roads          | 2    | 7 / 11 / 15 | Roads (2 Coins a tile); +1 population per linked city and per link at the capital             | when a second city is a few tiles away                                                                                                                     | good                        |
| Raiding        | 2    | 7 / 11 / 15 | Pillage; Charge (+1 Attack for a Raider that moved 2)                                         | mostly as the step to Chivalry; on its own only by a player who already fields Raiders                                                                     | a step, weak alone          |
| Engineering    | 2    | 7 / 11 / 15 | Mountains passable (and their cover), +1 sight there; Mine (5 Coins, +2); Workshop; Redevelop | on any map with Ore or a Mountain line                                                                                                                     | good                        |
| Fortification  | 2    | 7 / 11 / 15 | Field Defense (3 Coins, +1 Defense on a tile of the territory, keeps the turn)                | when a Knight or a Juggernaut threatens Fighters on open ground of the territory. Before the Knight's Attack 4 there was little to defend the open against | situational (was weak)      |
| Milling        | 3    | 9 / 13 / 17 | Windmill (population by adjacent Farms; heals units next to it)                               | with two or more Farms around one tile                                                                                                                     | good                        |
| Planning       | 3    | 9 / 13 / 17 | +1 unit per city; Land Grant                                                                  | when the cities are full of units, which they always are by the middle game                                                                                | good                        |
| Sawmilling     | 3    | 9 / 13 / 17 | Sawmill; **Catapult**                                                                         | to break a walled position                                                                                                                                 | good                        |
| Fieldcraft     | 3    | 9 / 13 / 17 | Replant Forest; Raiders and Marksmen move freely through Forest; Marksman Sight 2             | **no good answer.** Its movement rule matters only to the Raider (a Marksman has Move 1), and Replant costs 4 Coins for a tile of cover                    | **no good answer**          |
| Commerce       | 3    | 9 / 13 / 17 | +2 Coins for every Road-linked city; **Markets hire**                                         | once two cities are linked (+4 a turn pays it back in three or four turns), and whenever Coins outrun what the cities can train                            | good (was a poor buy)       |
| Chivalry       | 3    | 9 / 13 / 17 | **Knight**, Overrun; Clear for farming                                                        | when the enemy brings Catapults or Marksmen, or leaves Fighters in the open                                                                                | good (was a 30-Coin detour) |
| Metallurgy     | 3    | 9 / 13 / 17 | Forge (population by adjacent Mines); units cost 1 Coin less                                  | late, with Mines, when many units are still to be bought                                                                                                   | good                        |
| Explosives     | 3    | 9 / 13 / 17 | **Blast Mountain** (population, and an explosion); Breach                                     | to crack a walled center (Breach) or a line on Mountains (the blast), or with Mountains in the territory as a trap for an invader                          | good (was worthless)        |

**With no good answer:** Fieldcraft. A fix was tried in this round and
taken out again: letting the Knight role through Forest with Fieldcraft
would give it a job (woods would screen a backline only from a player
without it), but the same freedom also waives the Ice Folk's Snow stop, so
it is a cross-faction change that belongs to a round that can play it.
Replant Forest does gain something from this round: with Forestry a
replanted tile is cover. **Weak:** Raiding (worth its price mainly as the
road to Chivalry).

## 4. Every Human unit

| Unit       | Cost | Its job                                                                                     | Beats                                                                 | Loses to                                                               | Does another unit do it better for the price?                     |
| ---------- | ---- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Fighter    | 2    | the line: hold ground in cover, take settlements, be numerous                               | nothing one for one; everything two for one at its price              | a Knight in the open; Marksmen and Catapults that it cannot reach      | no: 6 HP per Coin is the best in the roster                       |
| Guard      | 3    | hold one tile, above all a center                                                           | every attacker that must stand next to it (it hits back hardest)      | Catapults and Marksmen (no retaliation); it cannot attack after moving | no                                                                |
| Raider     | 4    | see far, take villages, pillage; with Raiding, kill Captains and Catapults                  | Captains, Catapults (with Charge)                                     | everything in a straight fight                                         | the Knight kills more, but two technologies later and for 9 Coins |
| Marksman   | 4    | damage that is not answered, from range 2; shoot from a center                              | slow melee units in the open                                          | a Knight (one attack, also in Forest), a charging Raider               | the Catapult, later, for siege; nothing for the price at tier 2   |
| Captain    | 5    | Rally and Tend Wounded for the units around it                                              | nothing                                                               | everything                                                             | no other unit supports                                            |
| Catapult   | 8    | break a walled or fortified position from range 2 to 3                                      | anything that cannot reach it                                         | a Knight, a charging Raider, any unit that gets next to it             | no                                                                |
| Knight     | 9    | reach the backline and kill several fragile units in one turn; take a city it reaches first | Catapults, Marksmen, Raiders, Captains, Knights; Fighters in the open | Guards; Fighters in cover or behind Walls or a Field Defense           | no                                                                |
| Juggernaut | —    | the siege breaker a level-5 city grants once                                                | everything it reaches                                                 | massed Catapults and Marksmen, time                                    | no                                                                |

Every unit has a job that no cheaper unit does. The two with the thinnest
case are the Raider (overtaken by the Knight once Chivalry is bought) and
the Captain (never measured here).

## 5. The economy ladder

The price list is in the script's output above. Read together:

- **Population costs 2 to 3 Coins a point** from every source: Fruit and
  Game 2, a Farm or a Mine 2.5, a Lumber Camp or a Blast 3, a Windmill,
  Sawmill, or Forge 2.5 with two contributors and 1.7 with three. A
  Monument is free. Nothing is out of line.
- **A city level costs its number in population** (level 2 costs 2, level 5
  costs 5), so roughly 5, 7, 10, and 12 Coins for levels 2 to 5. A level
  pays +1 Coin a turn up to level 4 and nothing after it. The first levels
  pay back in five to ten turns; from level 5 on a level is bought for the
  unit slot and the reward, not for income.
- **The rewards:** Stockpile refunds most of level 2 (4 of about 5 Coins);
  the level-4 Treasury refunds about 6 of 10; the level-5+ Treasury (12
  Coins) still refunds a level-5 or level-6 step almost whole. That last
  one is the open item of tuning 1; it is a small loop, not a degenerate
  one, since a city takes its Juggernaut once and each later level costs
  one more point than the last.
- **Militia was dominated.** One free Fighter is 2 Coins; Walls are +2
  Defense on the center for the rest of the game, and decide whether a
  Knight kills its garrison. Two Fighters (4 Coins, and two units at once
  in the early rounds) make it a choice between tempo and safety.
- **What Coins can buy** (estimates from the hand-played games, to be
  checked in playtest 3): around round 5 an income of 3 to 4 buys a Fighter
  a turn or a technology every second turn, and everything is scarce.
  Around round 15, with three cities and 10 to 14 Coins a turn, a player
  trains in every city and still buys a tier 3 technology every other
  turn. Around round 25, with five cities and 20 to 30 Coins a turn, the
  land technologies are nearly all bought, every city trains one unit a
  turn and most are at their unit limit, and the Coins pile up. **Money
  becomes useless at the unit limit**, not at the training limit.
- **What this round adds at that point:** a Market hires a second unit a
  turn in its city, at 1.5 times the price, and may take the city one unit
  above its limit. A rich player turns Coins into army at a bad rate and
  refills after a lost battle twice as fast in its Market cities; the gain
  in army size is one unit per Market city. No second sink was added: the
  playtest decides whether one is needed.

## 6. Why each change, and what it must not do

### 6.1 The Knight (Attack 4)

Section 2.1 gives the numbers. What it must not do is make the Fighter a
bad unit: a Fighter in the open is now a unit a 9-Coin Knight can remove
without loss, one after another. The answers are cheap and all exist (a
Guard, woods with Forestry, Walls, a Field Defense, a Mountain), and the
Knight has 13 HP and Defense 1, so any two units that reach it kill it.
Playtest 1 is about exactly this.

### 6.2 Forest cover from Forestry

Cover was innate for Forests and Mountains. The user's model is the other
one: the bonus belongs to a technology of the branch that owns the terrain.
Forestry was also the weakest tier 2 technology of the tree, with a
Lumber Camp at 3 Coins a point. The bonus stays × 1.5 (a smaller × 1.25
would also stop the Knight's one-shot, at 11 of 12, but would change every
existing fight in the woods for no gain).

The defender's owner must have Forestry; the attacker's technologies do not
matter. Another seat's technologies are private, so the public combat
preview reads the cover from the target's public Defense breakdown, where
"Forest × 1.5" is shown exactly when it applies. As decided in tuning 1,
cover never raises the retaliation.

### 6.3 Blast Mountain

The root's proposal is implemented as proposed, with one addition (it works
outside the territory next to an own unit, fork 4). The numbers:

- **5 damage**, the Goblin Kaboom's number: enough to matter against 12-HP
  units (a second blast or one attack finishes them) and not a kill on any
  full-HP Human unit.
- **The unit that sets the charge stands next to it and takes 5 too**, when
  the blast is outside the territory. That is the cost and the puzzle: the
  sapper is a Fighter you can afford to hurt, placed so that the blast
  reaches more of them than of you.
- **Inside the territory no unit is needed**, so a Mountain of the
  territory is a mine under an invader's feet, for 3 Coins, and it still
  pays +1 population.
- A Mountain can be blasted once. The damage follows every rule of an
  explosion: Shields first, Armoured takes 1 less, a Field Defense in the
  area is destroyed, a unit that explodes when it dies sets off a chain,
  and the kills are the blasting player's (no unit gets the credit).

Breach is unchanged. Field Defense stays with Fortification: with Knights
at Attack 4 it has its own reason.

### 6.4 Commerce

Two changes, as the root proposed.

**Land trade between any linked cities.** The capital rule of round 2 took
three sentences to explain and paid nothing to a player who had lost its
capital. The rule is now one sentence: a city earns +2 Coins while a Road
links it to another of your cities. The first capital earns too, so a first
link is worth +4 a turn (it was +2). Road population keeps its capital root
(that is the Roads technology and was not in question).

**Markets hire.** With Commerce, an empty Market tile offers every land unit
the player can train, at 1.5 times its price in that city (rounded up: a
Fighter 3, a Guard 5, a Raider or Marksman 6, a Captain 8, a Catapult 12, a
Knight 14). The unit appears on the Market tile with its turn spent, homed
to the Market's city. Hiring does not use the city action. One hire per
Market per turn follows from the tile: the hired unit stands on it until
its owner's next turn. The Market's city may hold one unit above its
capacity through a hire; ordinary training still stops at the capacity.

Against the late snowball: the premium is a 50% tax, the extra army is one
unit per Market city, a Market is one per city and costs 6 Coins and a
tile, and a besieged city neither trains nor hires.

### 6.5 Militia

A small fix found by section 5: a Human Militia is two Fighters (the Goblin
Militia already was two Goblins).

## 7. What was not changed, and why

- **Marksman, Guard, Raider, Captain, Juggernaut, Catapult:** section 2.1.
- **Fieldcraft:** section 3.
- **Late-game Coins:** only the hire. If playtest 3 still ends with nothing
  to buy, the candidates are a paid re-roll of a level reward and a second
  level of Walls.
- **Research costs, Stockpile, Treasury, Land Grant, Monument:** tuning 1.
- **The Normal AI:** it stays legal and was not taught the new tools. It
  never hires, it blasts a Mountain only in its own territory and only when
  no unit of its own or of an ally would be hit, and it does not value
  Forestry for the cover. Its combat estimate knows the new cover rule for
  its own units and reads an enemy's from the public stats.
- **The other factions' own units and trees:** their passes. What reaches
  them through shared rules is in the table of section 1.

## 8. The text harness

- `new --factions original,original` starts a **mirror**: Human against the
  Human Normal AI (any repeated faction works). The engine's tool-only path
  for repeated factions is used; the browser still refuses such a match.
- `c1.hire.KNIGHT.9,9` hires at a Market; `options` describes it with the
  price and the slot rule.
- `t.5,3.blast_mountain` prints the blast's exact preview: every visible
  unit it would hit, with the damage and the kills.
- `tech` prints the new sentences (Forest cover, Hire, Blast Mountain, land
  trade), and a city's land trade line says "linked by Road to another of
  your cities" or that it is not.

## 9. Three playtests

Each is one hand-played game with the text harness, Human against the Human
Normal AI (a mirror), as the user asked for faction testing. The player writes down what the plan needed, what
it cost, and where the rules surprised it.

### Playtest 1: Catapult push against a Knight response

- **Setup:** `new --map dry-land --size 11 --seed 21 --factions original,original`.
- **Plan:** expand to three cities; research Forestry, then Sawmilling;
  march three Catapults with a Guard and two Fighters as their screen at
  the nearest AI city. Separately, in the same game or a second seed,
  research Raiding and Chivalry and send two Knights at any AI Catapult,
  Marksman, or open-ground Fighter group you find.
- **It must reveal:** whether Catapults behind a Guard still break a walled
  center; whether the AI's or your own Knights get through a screen that
  uses a Guard, a Forest with Forestry, or a Field Defense; how many units a
  Knight kills in one turn in a real position and what it costs to lose
  it; whether a Fighter line in the open feels unplayable once Knights
  exist; whether Forestry was worth 7 to 11 Coins.

### Playtest 2: Explosives against a Mountain line

- **Setup:** `new --map pangea --size 14 --seed 8 --factions original,original`
  (this seed puts Mountains in and next to the capital's territory; if the
  front ends up without any, take another seed).
- **Plan:** research Drill, Engineering, Fortification, Explosives. Hold a
  line that includes Mountains and a walled center until the AI attacks it;
  blast a Mountain of your own territory when its units stand around it.
  Then attack: set a charge next to a Mountain that an AI unit stands on or
  beside, and use Breach on its walled center.
- **It must reveal:** how often a blast is actually available where it
  matters; whether 5 damage for 3 Coins is too cheap as a trap in the own
  territory and too dear in HP as a weapon outside it; whether the preview
  made the friendly fire clear before the command; whether Breach or the
  blast was the reason to buy Explosives; what losing the Mountain (and its
  cover and Ore) cost you later.

### Playtest 3: Commerce as the late-game money sink

- **Setup:** `new --map dry-land --size 14 --seed 5 --factions original,original`,
  played to round 35 or to a win.
- **Plan:** grow four or five cities, link them by Road, build a Market in
  each, research Commerce by round 18. From then on write down, every five
  rounds, the Coins held, the income, the units and the limit of each city,
  and what you could not buy. Hire whenever a city has trained and Coins
  remain; after a lost fight, count the turns to refill with and without
  hiring.
- **It must reveal:** whether land trade plus Markets makes Commerce a
  technology you want by the middle game; whether hiring empties the purse
  or only dents it; whether the one unit above the limit and the faster
  refill decide fights (the rich must not become unstoppable); what, at
  round 25 and 35, there still is to buy.

## 10. Tests

`tests/unit/ruleset-v7-tuning-3.test.ts`: the Knight's kills and non-kills
in each terrain and its Overrun chain; Forest cover with and without
Forestry in the resolution, the public preview, the public stats, and a
Wail, for every faction's tree, and Mountain cover without a technology;
Blast Mountain in and outside the territory, its exact preview, kills,
chains, and Field Defense; land trade between linked cities and the Road
preview; hiring (offers, price, placement, the city action, the capacity
rule, every tree); Militia. `tests/scripts/play-text-v7.test.ts` covers
the mirror, the hire, and the blast preview, and
`tests/integration/ruleset7-dock-layout-dom.test.ts` the Market's hire
buttons and the Blast Mountain button.

## 11. Round 4

Round 3 was played by hand three times (the playtests of section 9, all on
the mirror, Human against the Human Normal AI). Round 4 is what those games
asked for. It is implemented on the same unpublished identity,
`pulp-wars-poc-7r47`; where this section and sections 1 to 10 differ, this
section is the rule. The tables of section 2.0 were printed again with the
rules of round 4.

### 11.1 What the three games said

- **Game 1** (Dry Land 11, seed 21): won in round 19 with no unit lost. The
  AI fielded Fighters and two Raiders only, so Catapults against Walls and
  Knights against a screen could not be judged. Knight Attack 4 did its job
  on what there was; Forest cover from Forestry held a line. The player
  delayed two captures to keep research cheap, took Stockpile five times
  and never considered Survey, found a city at `slots 5/4` after a Militia,
  paid 15 Coins for Raiding and Scouting and got nothing from them, and
  learned from a lost shot that a Catapult cannot move and shoot.
- **Game 2** (Pangea 14, seed 8): Explosives. Four weapon blasts in 27
  rounds, about one fight in five; the two city assaults were decided by a
  blast plus Breach in one turn. The early +1 population blasts used up
  every Mountain near the capital. Blasting an Ore Mountain forfeited a
  Mine with no warning. A blast outside the territory printed "no exact
  public preview" for its price, and its event listed only the player's own
  unit. From round 23 Coins were idle: 120 unspent in round 35.
- **Game 3** (Dry Land 14, seed 5): Commerce. Bought for 17 Coins, it paid
  10 a turn at once and was the best technology in the game. Six cities
  gave six free Juggernauts by round 24. 492 Coins were unspent in round 35
  with every city at its unit limit. Administration was bought for the
  Market and offered none, because nothing said a Market needs a Farm,
  Lumber Camp, or Mine next to it. `options` printed 880 lines.

In all three games the AI never stood behind Walls with a backline, so the
positions the round-3 changes were made for never came up. Section 11.9
adds three staged positions for that.

### 11.2 The changes

| #   | Rule                                 | Round 3                                                                                     | Round 4                                                                                                                                                                                                 | Shared with other factions                   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Commerce: land trade                 | +2 Coins for every Road-linked city                                                         | **+1**                                                                                                                                                                                                  | yes (not the Goblins)                        |
| 2   | Research price                       | tier base 5 / 7 / 9 plus 1 / 2 / 2 for each city owned beyond the first                     | tier base 5 / 7 / 9 **plus 2 for each technology already owned beyond the first**; the number of cities does not matter                                                                                 | **yes**: one formula for every faction       |
| 3   | Level 2 reward                       | Survey or Stockpile (4 Coins)                                                               | **Scouts** (the survey and a free Raider) or Stockpile (4)                                                                                                                                              | no: the other factions keep the plain Survey |
| 4   | Level 3 reward: Militia              | two Fighters                                                                                | **one** Fighter                                                                                                                                                                                         | no                                           |
| 5   | Level 4 reward                       | Boom or Treasury (6)                                                                        | Boom, Treasury (6), or **Barracks**                                                                                                                                                                     | **yes**                                      |
| 6   | Level 5 and above                    | the reward unit, once per city, or Treasury (12)                                            | **Barracks or Treasury (6)**; the reward unit is offered **only in the player's first capital, once**                                                                                                   | **yes** (every faction's giant)              |
| 7   | Barracks (new reward)                | none                                                                                        | +1 unit capacity in the city, and its center drills (row 8); a city may take it at every level from 4                                                                                                   | **yes**                                      |
| 8   | Drill (new command)                  | none                                                                                        | a unit on the center of an own city with a Barracks that has not acted becomes a **veteran for 10 Coins** (+5 HP and maximum HP, no heal); its turn ends                                                | **yes** (not a Dinosaur unit, which grows)   |
| 9   | Raider                               | stopped by zones of control like every unit                                                 | **not stopped by enemy zones of control**                                                                                                                                                               | no (the Human Raider only)                   |
| 10  | Raiding: Pillage                     | +1 Coin; the unit's turn ends                                                               | **+3 Coins**; a unit with Escape (the Raider) keeps one Move after it                                                                                                                                   | the 3 Coins: yes                             |
| 11  | Fieldcraft                           | Replant Forest; Raider and Marksman ignore Forest stops; Marksman sight 2                   | also **Forest march**: no ground unit of the owner stops on entering Forest                                                                                                                             | **yes**: every faction's tree                |
| 12  | Field Defense                        | +1 Defense                                                                                  | **+2 Defense** (two fortification levels, like City Walls; the two add up to +4 on a walled center); still ignored by siege and Breach, still never in the retaliation                                  | **yes**: every unit that may stand on one    |
| 13  | Land Grant                           | claims every neutral tile of the 5 × 5 area; unexplored ones free                           | claims **explored tiles only**, 2 Coins each, at least 6; unexplored tiles stay neutral                                                                                                                 | yes                                          |
| 14  | Blast Mountain: what the player sees | no price outside the territory; no warning on Ore; the event showed only the player's units | the exact price everywhere; "Ore here: blasting it gives up a Mine (+2 population)"; the explosion is shown to its player and to every player who has explored the tile, with every visible unit it hit | yes                                          |

Unchanged on purpose: Stockpile 4 (the user's decision), Blast Mountain at
5 damage for 3 Coins and +1 population, Breach, the Knight, the Catapult,
the rule that no ranged unit advances, and Hire.

One command (`DRILL_UNIT`, after `PROMOTE`) and one reward ID (`BARRACKS`,
the last, so the older rewards keep their ordinals) are new. The state
shape did not change: a Barracks is a record in the city's reward history,
and "the first capital took its unit" is read from that history. Two state
invariants were relaxed: a veteran may have fewer than three kills in any
match (it could only on a board with Shrines), and a unit may hold its
Escape Move after a Pillage as well as after an attack.

### 11.3 Decisions that are forks, for the user to overrule

1. **Research is priced by what you know, not by what you own.** The
   per-city step punished the player for winning: in game 1 the right play
   was to sit on two villages. With a per-technology step a big empire pays
   what a small one pays, and a late technology costs real money (the 20th
   costs 45). What it costs: the player who is behind no longer gets a
   discount, and a broad researcher pays more than a narrow one. The Normal
   AI researches broadly, so its tier 3 comes later than before: in sixteen
   Undead mirror matches of 40 rounds only two trained a Vampire (Chivalry)
   and three of sixteen Undead against Human matches on Pangea trained a
   Lich (Sawmilling). The AI was not taught the new price.
2. **The reward ladder is one ladder for every faction.** Barracks, the
   6-Coin Treasury, and "one reward unit per player" hold for the Troll,
   the Brontosaurus, and the others as well. A ladder for the Humans alone
   would have needed a second set of reward rules.
3. **The reward unit belongs to the first capital.** "Once per player"
   could also have been a counter in the player's record; reading it from
   the capital needs no new state and answers the capture question: a
   captured city never gives the unit, on the turn it is taken or later. A
   player who loses the capital before level 5 and never retakes it gets no
   reward unit.
4. **A reward unit may put a city over its unit limit.** The rule is now
   one sentence for the Raider, the Fighter, and the giant: a level reward
   is never lost to a full city; the unit is placed and counts against the
   limit afterwards. Every level adds one slot and at most one unit, so
   rewards alone cannot leave a city further over its limit than it was.
5. **Field Defense +2 is shared, and adds to Walls.** A Guard on a walled
   center with a Field Defense has Defense 7 against anything but siege and
   Breach. The numbers in the other factions' revision documents that
   involve a Field Defense are the old ones; their tests were recomputed.
6. **The Raider ignores zones of control.** That is its job now: it is the
   unit that gets behind a screen, where the Knight needs a kill to open
   one. The Normal AI's threat estimate knows it; its screens no longer
   stop a Human Raider.
7. **Pillage pays 3 for every faction**, and Fieldcraft's Forest march is
   in every faction's tree: both nodes are shared. Deep snow still stops
   every unit that Fieldcraft did not already free.
8. **Drill makes veterans without kills.** 10 Coins for +5 HP is dear for a
   Fighter (five times its price) and cheap for a Knight; it is meant for
   Coins that have nothing else to buy. A Barracks city trains or drills
   in a turn, not both: a drilled unit ends its turn on the center, and a
   city trains only onto an empty center.
9. **A Land Grant leaves what you have not explored.** It is still once
   per city, so a grant taken before the ring is explored is a smaller
   grant for good.
10. **The labs repeat a faction in a mission.** Hidden fixture missions may
    now be mirrors (`mirror: true`); the browser cannot reach them.

### 11.4 Research cost

The price list of section 2.0 shows each technology as the second, the
eighth, and the sixteenth purchase. Along typical orders, with the cities
the player would hold at each purchase under the old rule:

**Catapult rush (one city, then two)**

| #   | Technology   | Tier | Cities then | Before | Now | Total before | Total now |
| --- | ------------ | ---- | ----------- | ------ | --- | ------------ | --------- |
| 1   | HUNTING      | 1    | 1           | 0      | 0   | 0            | 0         |
| 2   | FORESTRY     | 2    | 1           | 7      | 7   | 7            | 7         |
| 3   | SAWMILLING   | 3    | 2           | 11     | 11  | 18           | 18        |
| 4   | DRILL        | 1    | 2           | 6      | 9   | 24           | 27        |
| 5   | MARKSMANSHIP | 2    | 3           | 11     | 13  | 35           | 40        |

**Knights (two cities by the third purchase)**

| #   | Technology | Tier | Cities then | Before | Now | Total before | Total now |
| --- | ---------- | ---- | ----------- | ------ | --- | ------------ | --------- |
| 1   | SCOUTING   | 1    | 1           | 0      | 0   | 0            | 0         |
| 2   | RAIDING    | 2    | 1           | 7      | 7   | 7            | 7         |
| 3   | CHIVALRY   | 3    | 2           | 11     | 11  | 18           | 18        |
| 4   | DRILL      | 1    | 3           | 7      | 9   | 25           | 27        |
| 5   | GATHERING  | 1    | 3           | 7      | 11  | 32           | 38        |

**A whole land tree in the order of playtest r3-2 (cities as that game had them)**

| #   | Technology     | Tier | Cities then | Before | Now | Total before | Total now |
| --- | -------------- | ---- | ----------- | ------ | --- | ------------ | --------- |
| 1   | DRILL          | 1    | 1           | 0      | 0   | 0            | 0         |
| 2   | FORTIFICATION  | 2    | 1           | 7      | 7   | 7            | 7         |
| 3   | EXPLOSIVES     | 3    | 2           | 11     | 11  | 18           | 18        |
| 4   | GATHERING      | 1    | 2           | 6      | 9   | 24           | 27        |
| 5   | FARMING        | 2    | 3           | 11     | 13  | 35           | 40        |
| 6   | HUNTING        | 1    | 4           | 8      | 13  | 43           | 53        |
| 7   | MARKSMANSHIP   | 2    | 5           | 15     | 17  | 58           | 70        |
| 8   | FORESTRY       | 2    | 5           | 15     | 19  | 73           | 89        |
| 9   | SAWMILLING     | 3    | 6           | 19     | 23  | 92           | 112       |
| 10  | ADMINISTRATION | 2    | 6           | 17     | 23  | 109          | 135       |
| 11  | PLANNING       | 3    | 6           | 19     | 27  | 128          | 162       |
| 12  | ENGINEERING    | 2    | 6           | 17     | 27  | 145          | 189       |
| 13  | SCOUTING       | 1    | 6           | 10     | 27  | 155          | 216       |
| 14  | ROADS          | 2    | 6           | 17     | 31  | 172          | 247       |
| 15  | COMMERCE       | 3    | 6           | 19     | 35  | 191          | 282       |
| 16  | MILLING        | 3    | 6           | 19     | 37  | 210          | 319       |
| 17  | RAIDING        | 2    | 6           | 17     | 37  | 227          | 356       |
| 18  | CHIVALRY       | 3    | 6           | 19     | 41  | 246          | 397       |
| 19  | FIELDCRAFT     | 3    | 6           | 19     | 43  | 265          | 440       |
| 20  | METALLURGY     | 3    | 6           | 19     | 45  | 284          | 485       |

**The same order held at one city (a small empire)**

| #   | Technology     | Tier | Cities then | Before | Now | Total before | Total now |
| --- | -------------- | ---- | ----------- | ------ | --- | ------------ | --------- |
| 1   | DRILL          | 1    | 1           | 0      | 0   | 0            | 0         |
| 2   | FORTIFICATION  | 2    | 1           | 7      | 7   | 7            | 7         |
| 3   | EXPLOSIVES     | 3    | 1           | 9      | 11  | 16           | 18        |
| 4   | GATHERING      | 1    | 1           | 5      | 9   | 21           | 27        |
| 5   | FARMING        | 2    | 1           | 7      | 13  | 28           | 40        |
| 6   | HUNTING        | 1    | 1           | 5      | 13  | 33           | 53        |
| 7   | MARKSMANSHIP   | 2    | 1           | 7      | 17  | 40           | 70        |
| 8   | FORESTRY       | 2    | 1           | 7      | 19  | 47           | 89        |
| 9   | SAWMILLING     | 3    | 1           | 9      | 23  | 56           | 112       |
| 10  | ADMINISTRATION | 2    | 1           | 7      | 23  | 63           | 135       |

The first tier-3 technology is the third purchase in a rush and costs 11
either way: Catapults or Knights are reachable in rounds 10 to 14 as
before. From the sixth purchase on, the new price is above the old one even
for a six-city empire, and the whole land tree costs 485 Coins (284 for the
six-city game, 143 for one city before). At an income of 40 to 70 the last
eight technologies are five to seven turns of everything the empire earns.

### 11.5 Commerce

| Linked cities | Land trade before (+2) | Now (+1) | Commerce bought as the 6th technology (19 Coins): turns to pay back, before / now |
| ------------- | ---------------------- | -------- | --------------------------------------------------------------------------------- |
| 2             | +4                     | +2       | 4.8 / 9.5                                                                         |
| 3             | +6                     | +3       | 3.2 / 6.3                                                                         |
| 4             | +8                     | +4       | 2.4 / 4.8                                                                         |
| 5             | +10                    | +5       | 1.9 / 3.8                                                                         |
| 6             | +12                    | +6       | 1.6 / 3.2                                                                         |

Roads (the 5th technology, 15 Coins) comes first and pays for itself in population; counting it too, Commerce at four linked cities pays back in (15 + 19) / 4 = 8.5 turns, and the Road tiles (2 Coins each) are on top.

### 11.6 The reward ladder

| Level | Population it took | Choices                                                      | Coins of the Coin choice |
| ----- | ------------------ | ------------------------------------------------------------ | ------------------------ |
| 2     | 2                  | Scouts (survey + Raider, worth 4 Coins) or Stockpile         | 4                        |
| 3     | 3                  | Walls or Militia (one Fighter, worth 2 Coins)                | —                        |
| 4     | 4                  | Boom (+3 population), Treasury or Barracks (+1 unit, Drill)  | 6                        |
| 5+    | 5, 6, …            | Barracks or Treasury; the first capital once: the Juggernaut | 6                        |

A population point costs 2 to 3 Coins (the price list above), so level 5 costs 10 to 15 Coins of population and returns at most 6.

- **Level 2.** Stockpile is a 4-Coin refund on a level that cost about 4.
  Scouts is a 4-Coin unit that sees two tiles and ignores zones of control,
  and it comes without Scouting.
- **Level 3.** Walls or one Fighter: a city that is safe takes the body, a
  city on the front takes the Walls.
- **Level 4.** Boom (three of the five population toward level 5), 6 Coins
  now, or a Barracks. A city that has stopped growing takes the Barracks.
- **Level 5 and above.** Barracks or 6 Coins; in the first capital, once,
  the Juggernaut. No choice returns more Coins than the level's population
  cost, and one of them is always the sink of section 11.7.

### 11.7 What late Coins buy

- Drill: 10 Coins a unit, one unit a turn per Barracks city (the unit must stand on the center and ends its turn): +5 HP and maximum HP. A Fighter 12→17, a Knight 13→18, a Catapult 10→15.
- Hire: one unit a turn per Market at 1.5× (a Knight 14, a Catapult 12), one above the city's limit.
- Research: the 17th to 20th technologies cost 39, 41, 43, 45 Coins.

The three add up: an empire at its unit limit with 100 Coins can hire one
unit per Market, drill one unit per Barracks, and buy one of the last
technologies, and next turn it can do the first two again. Walls of a
second level were considered and left out: they need a new field in the
city's state, and a walled Guard on a Field Defense is already Defense 7.

### 11.8 Raider, Raiding, Scouting, Fieldcraft

- **Raider** (4 Coins, Scouting): Move 2, sight 2, Escape, and now no stop
  at an enemy zone of control. Its jobs: reach a Catapult or Marksman
  behind a screen without killing the screen (a Charge deals 10 to either),
  and pillage and leave.
- **Raiding** (tier 2): Charge, and a Pillage worth 3 Coins that leaves a
  Raider its Move. A Market in reach of a Raider is 3 Coins a visit and 6
  Coins to rebuild. It is still the way to Chivalry.
- **Scouting** (tier 1): unchanged; the Scouts reward gives one Raider
  without it, which shows the unit before the technology is bought.
- **Fieldcraft** (tier 3): Forest march makes it the technology of an army
  that fights in woods: Knights and Catapult columns no longer lose a turn
  at every Forest tile. With Forestry's cover it is a pair: stand in the
  Forest, and leave it when you choose.

### 11.9 The labs

`play:text -- lab --session S <LAB>` starts a staged position, the player
against the Human Normal AI, the player to move. They are hidden mirror
missions (`src/engine/v7/missions/lab-human.ts`), built by the ordinary
mission builder; `verify` replays them.

| Lab            | Board | The position                                                                                                                                                                                                                                                          | What it is for                                                                                                                                             |
| -------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LAB_SIEGE`    | 11    | The AI's walled level-4 capital: a Guard on the center, three Guards west of it (one in Forest with Forestry, one on a Field Defense), a Marksman and two Catapults behind, a neutral Mountain touching all three screen Guards. The AI's army holds its seven tiles. | Catapults, Knights, or Explosives against Walls: you have 6 units and 60 Coins, and each of Sawmilling, Chivalry, Explosives, Fieldcraft costs 23.         |
| `LAB_BACKLINE` | 14    | The AI advances at once with four Catapults and three Marksmen behind two Guards and three Fighters, one tile from your line.                                                                                                                                         | What reaches the backline: three Knights, two Raiders, three Fighters, two Marksmen, a Catapult, 40 Coins. Your cities are over their limits: no training. |
| `LAB_LATE`     | 16    | Six road-linked cities a side (a level-5 capital and one level-4 city with a Barracks, four more level-4 cities, two Farms and a Market each), 16 of 20 technologies, 33 units a side at every city's limit, 100 Coins each, income 43.                               | The late economy: what the Coins buy, and whether the fourth-tier choices (39 Coins each) matter.                                                          |

### 11.10 Clarity

- A Catapult's lines (train, hire, technology, and every unit line of
  `view`) end with "cannot move and attack in the same turn"; the browser
  card already said "Can't hit adjacent units or move and fire".
- A Knight's lines say "Overrun: one more attack after every kill, with no
  limit; an attack that does not kill ends it". There is no budget of two:
  the "attacks left 1" of game 1 was the one attack a kill had just earned.
- The Market's line and card say it "needs one of your Farms, Lumber Camps,
  Mines or their mills next to it".
- A city that could take a Land Grant shows its price also when the player
  cannot pay ("Land grant: 32 Coins for 16 tiles. Not enough Coins").
- `tech` says "each one you own makes the next 2c dearer; cities do not
  matter".
- `options` prints one line for many offers of one kind (Roads, Monuments,
  each Market's hires) with the count, the id pattern, and the tiles; 956
  offers in `LAB_LATE` are 124 lines. A unit's Wait and Disband ids stand
  on its own line. `--all`, `--tile`, `--city`, and `--unit` still describe
  every offer.
- A hired unit stands on the Market's tile, so the Market hires again only
  when the tile is empty. That is the rule, and the hire line says so.

### 11.11 Three games for round 4

**Game A: `LAB_SIEGE`, three times from the same start.** Each run is at
most ten rounds; stop when the center falls or the army is spent.

1. `lab --session a1.json LAB_SIEGE`. Research Sawmilling. Train two
   Catapults (8 Coins each, one per city per turn), bring them within three
   tiles of the screen behind your Guard, and shell the screen, then the
   center.
2. `lab --session a2.json LAB_SIEGE`. Research Explosives. Put one unit on
   the tile west of the Mountain at 6,5, read `options --tile 6,5`, blast,
   and storm the screen and the center with Breach the same turn and the
   next.
3. `lab --session a3.json LAB_SIEGE`. Research Chivalry. Train two Knights;
   send the Raider around the screen to the Catapults (it is not stopped at
   the Guards) and the Knights at whatever the Raider and the Marksman have
   opened.

Write down for each run: the round the center fell (or that it did not),
units lost, Coins spent, and what the AI's two Catapults did to you. It
must show: whether Walls plus a Field Defense plus Forest cover is a
position Fighters alone cannot take (it should be); whether each of the
three technologies takes it and at what price; whether a Field Defense at
+2 was worth the AI's 3 Coins; whether the blast is still worth 3 Coins
when it also hits your own unit.

Then, in the same sitting, `lab --session a4.json LAB_BACKLINE` once: on
turn 1 try the Raiders past the screen (`options --unit` shows their reach)
and the Knights at the Fighters in the open; count how many of the four
Catapults are dead by the end of round 3 and what you paid.

**Game B: `LAB_LATE`, twelve rounds.** `lab --session b.json LAB_LATE`.
Every round, before ending the turn, write down the Coins held and what you
could have bought. Use each sink at least twice: Drill at the capital and
at the second Barracks city, Hire at a Market after a loss, one of the four
missing technologies. Send Raiders at the AI's front Markets (they face
you) and pillage. It must show: whether 100 Coins and an income of 43 are
spent by round 6 or still pile up; which sink you reached for first and
which you never wanted; whether a drilled army (17-HP Fighters, 18-HP
Knights) decides a fight between equals or only pads it; whether Barracks
or the Treasury is the choice when a city reaches its next level; whether
pillaging at 3 Coins and a free Move is worth a Raider's turn.

**Game C: a full game from turn 1.**
`new --session c.json --map dry-land --size 14 --seed 5 --factions original,original`
(the board of round 3's game 3, so the two can be compared), played to win,
to round 30 at most. Research in the order the position asks for and write
down every purchase with its price and the round. At each level reward
write down the choice and the one-line reason. It must show: the round of
the first tier-3 technology and of Commerce; whether you ever delayed a
capture (there is no reason to now); how many technologies you own at
rounds 10, 20, and 30 and whether the last purchases felt like decisions;
Commerce's payback in turns at +1 a city; the number of Juggernauts on the
board at round 24 (one at most for you); whether Scouts was ever taken over
Stockpile and Barracks over Boom; whether the Scouts Raider did anything a
Fighter would not have; Coins unspent at rounds 20, 25, and 30.

### 11.12 Tests

`tests/unit/ruleset-v7-tuning-4.test.ts`: land trade; the research price
by owned technologies and its independence of the city count; the reward
lists, Scouts, the one Militia Fighter, Barracks, the 6-Coin Treasury, and
the capital's one reward unit; Drill (offer, price, effect, the refusals);
the Raider's zone-of-control rule against another faction's Raider; Pillage
at 3 Coins and the Raider's Move after it; Forest march in every tree and
on a board; the Field Defense's two levels; the Land Grant of explored
tiles and its visible price; the Blast Mountain preview outside the
territory and its projection to both players; and the three labs (they
validate, build, parse, and offer commands; `LAB_LATE` is at every unit
limit with two Drills on offer). `tests/scripts/play-text-v7.test.ts`
starts, plays a turn of, and replays every lab, and checks the grouped
`options`, the Drill line, the blast line, and the Ore warning.
`tests/integration/ruleset7-dock-layout-dom.test.ts` checks the Drill
button, the Land Grant note, and the Ore warning in the browser's DOM
(jsdom; the pages were not opened in a browser). The older tests of the
changed rules were updated in place, each with a note; the recorded
AI-against-AI matches that tests read were recomputed, and seven of them
moved to another seed because the old one no longer showed what the test
needs.
