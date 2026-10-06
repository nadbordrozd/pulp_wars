# Ruleset 7: the Human tech tree, rounds 3 to 6

**Status:** rounds 3 and 4 were implemented on `pulp-wars-poc-7r47` (bead
`pulp_wars-w49.3`); [round 5](#12-round-5) (section 12, bead
`pulp_wars-w49.4`) was implemented on `pulp-wars-poc-7r48` and played three times;
[round 6](#13-round-6) (section 13, bead `pulp_wars-w49.6`, mostly the
Normal AI) is implemented on `pulp-wars-poc-7r49` and has not been played
yet. Round 3 (sections 1 to 10) was played by hand three times;
[round 4](#11-round-4) (section 11) is what those games changed, and was
played four times. Where they differ, the later section is the rule. [Tuning 1 and its round 2](RULESET_7_TUNING_1.md)
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

| #   | Rule                                 | Round 3                                                                                     | Round 4                                                                                                                                                                                                                               | Shared with other factions                   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Commerce: land trade                 | +2 Coins for every Road-linked city                                                         | **+1**                                                                                                                                                                                                                                | yes (not the Goblins)                        |
| 2   | Research price                       | tier base 5 / 7 / 9 plus 1 / 2 / 2 for each city owned beyond the first                     | tier base 5 / 7 / 9 **plus 2 for each technology already owned beyond the first**; the number of cities does not matter                                                                                                               | **yes**: one formula for every faction       |
| 3   | Level 2 reward                       | Survey or Stockpile (4 Coins)                                                               | **Scouts** (the survey and a free Raider) or Stockpile (4)                                                                                                                                                                            | no: the other factions keep the plain Survey |
| 4   | Level 3 reward: Militia              | two Fighters                                                                                | **one** Fighter                                                                                                                                                                                                                       | no                                           |
| 5   | Level 4 reward                       | Boom or Treasury (6)                                                                        | Boom, Treasury (6), or **Barracks**                                                                                                                                                                                                   | **yes**                                      |
| 6   | Level 5 and above                    | the reward unit, once per city, or Treasury (12)                                            | **Barracks or Treasury (6)**; the reward unit is offered **only in the player's first capital, once**                                                                                                                                 | **yes** (every faction's giant)              |
| 7   | Barracks (new reward)                | none                                                                                        | +1 unit capacity in the city, and its center drills (row 8); a city may take it at every level from 4                                                                                                                                 | **yes**                                      |
| 8   | Drill (new command)                  | none                                                                                        | a unit on the center of an own city with a Barracks that has not acted becomes a **veteran for 10 Coins** (+5 HP and maximum HP, no heal); its turn ends                                                                              | **yes** (not a Dinosaur unit, which grows)   |
| 9   | Raider                               | stopped by zones of control like every unit                                                 | **not stopped by enemy zones of control**                                                                                                                                                                                             | no (the Human Raider only)                   |
| 10  | Raiding: Pillage                     | +1 Coin; the unit's turn ends                                                               | **+3 Coins**; a unit with Escape (the Raider) keeps one Move after it                                                                                                                                                                 | the 3 Coins: yes                             |
| 11  | Fieldcraft                           | Replant Forest; Raider and Marksman ignore Forest stops; Marksman sight 2                   | also **Forest march**: no ground unit of the owner stops on entering Forest                                                                                                                                                           | **yes**: every faction's tree                |
| 12  | Field Defense                        | +1 Defense                                                                                  | **+2 Defense** (two fortification levels, like City Walls; the two add up to +4 on a walled center); a siege shot is made against it and then destroys it, a Breach ignores and destroys it, and it is still never in the retaliation | **yes**: every unit that may stand on one    |
| 13  | Land Grant                           | claims every neutral tile of the 5 × 5 area; unexplored ones free                           | claims **explored tiles only**, 2 Coins each, at least 6; unexplored tiles stay neutral                                                                                                                                               | yes                                          |
| 14  | Blast Mountain: what the player sees | no price outside the territory; no warning on Ore; the event showed only the player's units | the exact price everywhere; "Ore here: blasting it gives up a Mine (+2 population)"; the explosion is shown to its player and to every player who has explored the tile, with every visible unit it hit                               | yes                                          |

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

## 12. Round 5

Round 4 was played by hand four times. The games were slow: armies of
Guards stood in front of each other, few units died, and the Normal AI
trained a unit every third turn and spent on its economy with an enemy at
its gates. The user's direction of 2026-10-06 for this round: **more
units, more deaths, more turnover**, by two levers in this order. First a
Normal AI that fields an army and attacks with it. Second the Guard, which
should hold against a Fighter, a Raider, and perhaps a Knight, and be an
easy target for Marksmen and Catapults ("a Guard softened by a couple of
Marksmen can be killed by a Fighter"). A third, optional lever: one more
heavy melee unit at tier 2 of the industry branch. The Knight and its
Overrun are not weakened, and the Fighter is unchanged. Only Humans
against Goblins or Undead are in view.

Round 5 is implemented on `pulp-wars-poc-7r48` (bead `pulp_wars-w49.4`).
Where this section and sections 1 to 11 differ, this section is the rule.
Nothing of it was played by hand yet.

### 12.1 The changes

| #   | Rule                 | Round 4                                                                  | Round 5                                                                                                                    | Other factions                                                                            |
| --- | -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Normal AI            | trains when the economy has nothing better; research by economic value   | **army play** (section 12.2)                                                                                               | Undead and Goblin seats play it too, with their own units; the other five factions do not |
| 2   | Human Guard          | Defense 3 against everything                                             | **Defense 1 against an attack from two or more tiles**; 3 next to its attacker and in its retaliation                      | their Guard-role units are unchanged; their ranged attacks hit a Human Guard harder       |
| 3   | Swordsman (new unit) | none                                                                     | **5 Coins, 15 HP, Attack 3.5, Defense 2.5, Move 1**, melee, captures; unlocked by **Engineering**                          | Human only: no other tree unlocks it                                                      |
| 4   | Drill                | a unit on a Barracks center becomes a veteran for 10 Coins               | **removed**; a Barracks is +1 unit slot                                                                                    | shared                                                                                    |
| 5   | Land Grant           | 2 Coins a tile, at least 6                                               | **1 Coin a tile**, no minimum                                                                                              | shared                                                                                    |
| 6   | Blast Mountain       | 5 damage to every unit on and around the tile, the blasting player's too | the same, except **the unit that sets it**: the player's weakest land unit next to the Mountain is not hit                 | shared                                                                                    |
| 7   | Labs                 | `LAB_BACKLINE` and `LAB_LATE` at revision 1                              | revision 2: a Swordsman in each line of `LAB_BACKLINE` (both sides own Engineering), one in every front city of `LAB_LATE` | —                                                                                         |

One role (`SWORDSMAN`, the last role ID) is new and one command
(`DRILL_UNIT`) is gone, so every command kind after `PROMOTE` is back at
its tuning-3 ordinal. The state shape did not change. The invariant that a
veteran has three kills (except through a Shrine) is back.

Not changed: the Fighter, the Knight, Overrun, the Catapult, the Marksman,
every price of round 4, and **Metallurgy** (a Forge, and 1 Coin off land
training in a city with a Forge). Engineering now gives a unit, so the
branch reads Drill (Guard), Engineering (Swordsman), Metallurgy (cheaper
units).

### 12.2 The Normal AI plays an army

What the four games and one idle-seat run showed, and the rule that
answers each. The numbers are
in `src/ai/v7-army.ts`; the detail is in
[Normal AI: army play](../architecture/NORMAL_AI.md#army-play-pulp_wars-w494).

| Problem                                                                | Rule                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a unit every third turn; Coins went to buildings and research          | Once an enemy city is known or a hostile unit is within six tiles of a center, every city with a free slot **trains before any research or building**, the best unit the Coins buy.                         |
| cities that could not train because their garrison stood on the center | The unit on the center **steps beside it and the city trains in the same turn**, also with an enemy near. Without the Coins for a unit it stays.                                                            |
| armies of Guards                                                       | A **mixed army**: about 35% line units (the dearest it can pay for), 15% defenders, 20% ranged, 15% siege, 15% breakthrough (25% against an enemy with ranged or siege units); never only defenders.        |
| economy technologies with enemies at the gates                         | **Research goes to the cheapest fighting unit it cannot train yet** (Marksman, Catapult, Knight, Swordsman, and their Undead and Goblin counterparts), and other research waits while that one is in reach. |
| single units fed into pairs                                            | A melee unit moves in for **a kill or an exchange clearly in its favor**, and nobody walks alone into more enemies than it has friends beside it.                                                           |
| ranged units with no shot; Catapults left behind                       | A ranged unit with a target **shoots**. A Marksman or Catapult without one **moves to where it has a shot** (a Catapult: next turn, on a tile it survives on) and stays behind its own line.                |
| attacks that wounded many and killed nobody                            | **Focus fire**: every visible enemy unit is checked for a kill by several units in one turn; the ranged hits go first, the melee unit that finishes goes last. Wounded units first.                         |
| the garrison walked off a walled center                                | The unit on a center **stays** while an enemy is within six tiles (apart from the step that lets the city train).                                                                                           |
| a healthy unit could be disbanded for its refund                       | A unit at half HP or more is never disbanded.                                                                                                                                                               |

Knights go for fragile units through the ordinary attack values (a kill of
a Marksman or Catapult is worth its price) and the larger breakthrough
share. City attacks and captures of weak centers are the campaign plan of
`pulp_wars-9s0.1`, unchanged; with more units trained it has more to send.

The play is on for a Human, Undead, or Goblin seat **in a match whose
every seat is one of those three**. With any other faction present both
sides keep the older policy, so the five other factions' AI and its tests
are as they were. It is also off while the seat's naval plan is active and
during the opening harvest.

How it was checked: constructed positions in
`tests/unit/ruleset-v7-tuning-5.test.ts` (section 12.9), the three labs
through the text harness, and three short single matches of at most 25
rounds on an 11 x 11 dry-land map, read for one thing only, whether both
seats train and attack. Units trained per round, Humans then the other
seat:

- Humans against Goblins, seed 7 (before the besieged-city rule): Humans
  0 1 1 0 1 2 1 0 0 0 1 0; Goblins 0 1 0 0 0 0 0 0 0 0 0 0. The Goblin's
  only unit stood on its center with a Human Fighter two tiles away, so
  its city never trained. This is what the step beside the center fixes.
- The same match after it: Humans 0 1 1 0 1 2 1 0 1 1 0 0 2 0; Goblins
  0 1 0 1 1 1 0 1 1 0 0 0 0 0. Both sides attack from round 7.
- Humans against Undead, seed 3: Humans 0 1 1 0 0 0 2 2 0 0 0 2 2 0 2 1 1
  2 2 3 0; Undead 0 1 1 0 0 1 1 0 0 0 1 0 0 1 0 1 0 0 0 0 0. The Humans
  train Fighters, Marksmen, Swordsmen, and Guards; both sides attack in
  most rounds from round 6.

No outcome was counted. In the first rounds a seat earns 3 Coins a turn
and has two unit slots, so "a unit every turn" means "whenever a slot and
the Coins are there".

### 12.3 The Guard

**The rule, as the card says it: "Open to ranged: Defense 1 against
attacks from 2 or more tiles."** The Guard keeps Defense 3
against a unit next to it, and its retaliation (which only a neighbor
takes) is unchanged. Fortification and cover add to the 1 as they add to
the 3. It is one number on one unit; the three places that compute damage
(the engine, the public preview, the AI's estimate) read it through one
function.

Damage to a full-HP Guard from a full-HP attacker, before and after:

| Attacker                 | Open         | Forest with Forestry | Field Defense | Walls     | Walls and Field Defense |
| ------------------------ | ------------ | -------------------- | ------------- | --------- | ----------------------- |
| Marksman, from two tiles | 4 → **6**    | 3 → **5**            | 3 → **4**     | 3 → **4** | 2 → **3**               |
| Catapult                 | 7 → **10**   | 5 → **9**            | 5 → **7**     | 5 → **7** | 4 → **5**               |
| Marksman, adjacent       | 4            | 3                    | 3             | 3         | 2                       |
| Fighter                  | 4 (takes 8)  | 3                    | 3             | 3         | 2                       |
| Raider with Charge       | 7 (takes 7)  | 5                    | 5             | 5         | 4                       |
| Swordsman                | 8 (takes 6)  | 7                    | 6             | 6         | 5                       |
| Knight                   | 10 (takes 6) | 8                    | 8             | 8         | 7                       |

The user's test, **two Marksmen and then one Fighter on a full-HP Guard**
(`scripts/human-tuning-analysis-v7.ts round5`):

| Ground                  | After two Marksmen | The Fighter        | Guard left |
| ----------------------- | ------------------ | ------------------ | ---------- |
| open                    | 17 → 11 → 4        | deals 4, **kills** | dead       |
| Forest with Forestry    | 17 → 12 → 6        | deals 5, takes 5   | 1          |
| Field Defense           | 17 → 13 → 9        | deals 4, takes 6   | 5          |
| Walls                   | 17 → 13 → 9        | deals 4, takes 6   | 5          |
| Walls and Field Defense | 17 → 14 → 11       | deals 3, takes 7   | 8          |

**Two Catapults:** they kill a Guard in the open (10, then 7) and in
Forest (9, then 8), leave 1 HP on a Field Defense or on a walled center
(7, then 9), and leave 6 HP on a walled center with a Field Defense (5,
then 6). A Catapult's shot is made against the Field Defense and then
destroys it; the Walls stay.

So cover, a Field Defense, and Walls each buy the Guard one more attacker,
and a walled center with a Field Defense still takes a real siege.

**Is 3 Coins still right?** Against melee nothing changed: a Fighter (2
Coins) deals 4 and takes 8, a Raider with Charge trades 7 for 7 and has 12
HP to the Guard's 17, a Knight (9 Coins) needs two attacks and takes 6 of
its 13 HP on the first. It is still the cheapest way to stop anything that
has to walk up to it, and it is no longer a wall against an army with two
Marksmen (8 Coins) behind its line. The recommendation is to keep 3 Coins.

**The same rule in other matches.** A Human Guard is hit harder by every
faction's attack from two or more tiles: a Banshee's Wail, a Bomb
Chucker's bomb (and its splash on the units around), a Ray Gunner (10, was
7), a Tripod (14, was 10), a Grunt (6, was 4), a Pie Launcher (10, was 7),
a Boulder (10, was 7), Acid (6, was 4). Those factions' own Guard-role
units are unchanged, and their tests state the new numbers.

### 12.4 The Swordsman

A heavy melee unit at **Engineering**, tier 2 of the industry branch (the
technology that also gives Mines and Workshops; it needs Drill and costs 7
Coins as the second technology).

| Unit      | Cost | HP  | Attack | Defense | Move |
| --------- | ---- | --- | ------ | ------- | ---- |
| Fighter   | 2    | 12  | 2      | 2       | 1    |
| Guard     | 3    | 17  | 1.5    | 3       | 1    |
| Swordsman | 5    | 15  | 3.5    | 2.5     | 1    |
| Knight    | 9    | 13  | 4      | 1       | 3    |

Its job is to kill what a Fighter cannot and a Knight should not: the
Guard in the line.

- A Swordsman deals 8 to a full-HP Guard and takes 6; its second attack
  kills. Two Swordsmen kill a Guard in one turn.
- A Knight deals it 11 of 15 and takes 4; a second Knight kills it. A
  Swordsman is a bad target for a lone Knight and no wall against two.
- Two Catapults kill it (7, then 8). Two Marksmen deal 4 and 5.
- Three Fighters (6 Coins) kill it (4, 5, 6) and the first two take 6 and
  5: Fighters in numbers still answer it.

It builds no Field Defense and has no ability, so its card is its numbers.
**Metallurgy is unchanged.** With Arms Industry a Swordsman costs 4 in a
city with a Forge.

**Art.** The Swordsman has its own map sprite and portrait since
`pulp_wars-w49.9` (a closed great helm, full plate, a greatsword, no
shield). At `7r48` it was drawn with the Guard's sprite and portrait and
a small "S" on the board.

### 12.5 Decisions that are forks, for the user to overrule

1. **The Guard's weakness is a Defense number, not HP.** Defense 1 from
   two or more tiles is one line on the card and leaves the Guard exactly
   as it was against melee. The alternatives were fewer HP (weaker against
   everything) or a damage multiplier for ranged units (a rule on every
   ranged card). It also means the other factions' ranged units hit a
   Human Guard harder than their own tuning assumed.
2. **The Swordsman is at Engineering, and Metallurgy was left alone.**
   Engineering is the tier 2 industry node that had no unit. Metallurgy
   still pays only with a Forge; making its discount unconditional would
   make the third industry technology a plain army technology and is a
   one-line change if wanted.
3. **Army play is for Humans, Undead, and Goblins only**, and only when
   every seat is one of them. It kept the other five factions' AI and
   tests untouched, as asked. A Human seat against Dinosaurs plays the old
   policy.
4. **A besieged city trains by stepping its garrison off the center.**
   The trained unit takes the center in the same turn, so the center is
   never empty; the unit that stepped out stands in the open. The
   alternative, a garrison that never moves, trained one unit in twelve
   rounds in the first confirmation run.
5. **The AI no longer saves for a plan.** An army seat spends on units
   first; the old savings plan (hold Coins for a technology or a city
   level) is off for it.
6. **A Blast Mountain spares one unit**, the weakest own land unit next to
   the Mountain; a second own unit next to it is still hit. Sparing every
   own unit would make the blast a one-sided weapon.
7. **Land Grant has no minimum.** One explored neutral tile costs 1 Coin.
8. **Drill is gone and nothing replaces it as a late Coin sink.** Late
   Coins buy hires (at 1.5 times the price) and, now, armies the AI
   actually fields.
9. **The Showcase has no Swordsman** until it has art.

### 12.6 How a unit gets HP back

The complete list (the rules are in
[current rules, section 10](RULESET_7_CURRENT.md#10-recovery-and-support)):

| Source             | Amount                                                                 | Who                                          |
| ------------------ | ---------------------------------------------------------------------- | -------------------------------------------- |
| Recover            | 4 in own territory, 2 elsewhere; the unit does nothing else            | every land unit (Undead: own territory only) |
| Idle recovery      | the same, by itself at End Turn, for a unit that did not move or act   | the same                                     |
| Windmill           | up to 6 at Start Turn, next to an own Windmill                         | every faction (Milling builds it)            |
| Tend Wounded       | up to 2 to each own unit next to the Captain; cures afflictions        | Human Captain (the Orc Warboss has none)     |
| Promotion          | full heal and +5 maximum HP, once, after three kills                   | every non-growing unit                       |
| Fountain of Youth  | 12 at Start Turn on the Fountain                                       | map curiosity                                |
| Troll regeneration | up to 4 at Start Turn                                                  | Goblin Troll                                 |
| Lifesteal, Devour  | a Vampire heals by the damage it deals; a Ghoul on a Grave heals fully | Undead                                       |

For turnover the two that matter are idle recovery (a unit that steps out
of the fight for a turn in its own land gets 4 back for nothing) and the
Windmill (6 a turn for units standing next to one). Neither was changed
this round; if battles still do not kill enough, idle recovery outside a
city's own territory is the first candidate.

### 12.7 What a city earns against what a unit costs

A city pays 1 Coin per level **up to level 4**; a higher level adds unit
slots and rewards and no income (the cap keeps one large city from paying
for an army by itself). On top: +1 for a founded capital, +1 with a Road
to another own city (Commerce), +1 by sea, and its Market (up to 3). So a
level-3 city earns 3 to 7 Coins and a level-4 or higher city 4 to 8.

| City                                    | Income |
| --------------------------------------- | ------ |
| level 3, no Market, no trade            | 3      |
| level 3, land trade                     | 4      |
| level 3, Market 2, land trade           | 6      |
| level 4 or higher, no Market, no trade  | 4      |
| level 4 or higher, land trade           | 5      |
| level 4 or higher, Market 2, land trade | 7      |
| level 4 or higher, Market 3, land trade | 8      |

"Pays for one a turn" below: a city of income 3 / 5 / 7.

**Human units**

| Unit      | Technology (tier)  | Cost | HP  | Attack / Defense | 3 / 5 / 7       |
| --------- | ------------------ | ---- | --- | ---------------- | --------------- |
| Fighter   | —                  | 2    | 12  | 2 / 2            | yes / yes / yes |
| Guard     | Drill (1)          | 3    | 17  | 1.5 / 3          | yes / yes / yes |
| Raider    | Scouting (1)       | 4    | 12  | 2 / 1            | no / yes / yes  |
| Marksman  | Marksmanship (2)   | 4    | 12  | 2 / 1            | no / yes / yes  |
| Captain   | Administration (2) | 5    | 10  | 1 / 1            | no / yes / yes  |
| Swordsman | Engineering (2)    | 5    | 15  | 3.5 / 2.5        | no / yes / yes  |
| Catapult  | Sawmilling (3)     | 8    | 10  | 3 / 0.5          | no / no / no    |
| Knight    | Chivalry (3)       | 9    | 13  | 4 / 1            | no / no / no    |

**Goblin units**

| Unit         | Technology (tier)  | Cost | HP  | Attack / Defense | 3 / 5 / 7       |
| ------------ | ------------------ | ---- | --- | ---------------- | --------------- |
| Goblin       | —                  | 1    | 6   | 1.5 / 0.5        | yes / yes / yes |
| Orc Brute    | Drill (1)          | 3    | 15  | 2 / 2.5          | yes / yes / yes |
| Wolf Rider   | Scouting (1)       | 3    | 10  | 2 / 1            | yes / yes / yes |
| Bomb Chucker | Marksmanship (2)   | 3    | 8   | 2 / 1            | yes / yes / yes |
| Orc Warboss  | Administration (2) | 5    | 12  | 2 / 1            | no / yes / yes  |
| Rocket Cart  | Sawmilling (3)     | 7    | 8   | 3.5 / 0.5        | no / no / yes   |
| Scrap Buggy  | Chivalry (3)       | 8    | 10  | 3 / 1            | no / no / no    |

**Undead units**

| Unit        | Technology (tier)  | Cost | HP  | Attack / Defense | 3 / 5 / 7       |
| ----------- | ------------------ | ---- | --- | ---------------- | --------------- |
| Skeleton    | —                  | 2    | 10  | 2 / 2            | yes / yes / yes |
| Zombie      | Drill (1)          | 3    | 18  | 2 / 2            | yes / yes / yes |
| Ghoul       | Scouting (1)       | 3    | 10  | 2 / 1            | yes / yes / yes |
| Banshee     | Marksmanship (2)   | 3    | 8   | 1 / 1            | yes / yes / yes |
| Necromancer | Administration (2) | 5    | 10  | 1 / 1            | no / yes / yes  |
| Lich        | Sawmilling (3)     | 8    | 10  | 3 / 1            | no / no / no    |
| Vampire     | Chivalry (3)       | 9    | 10  | 3 / 1            | no / no / no    |

What it says. A plain level-3 city buys a Fighter or a Guard every turn
and a Marksman or Swordsman every second turn. Two cities with a Road
between them buy a Swordsman a turn. A Catapult or Knight a turn needs a
level-4 city with a full Market and trade, or two cities' income; they
stay the units a player saves for. The Goblin army is the cheapest per
body (three of its units cost 3 or less, its line unit 1), the Undead one
in between. The one-unit-per-city-per-turn rule and the unit slots, not
the Coins, are what limit an army from the middle of the game on, which is
why the AI's "every city trains every turn" matters more than any price.

### 12.8 Clarity fixes from the games

| Seen                                                            | Now                                                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| the reward read "Survey" and gave a Raider                      | the text harness calls it **Scouts** and says "free Raider, reveals the area" (`c1.reward.SCOUTS`; the old id is still accepted)        |
| the Explorer achievement stood at 110 of 100 and never unlocked | it needs **Scouting** as well as the explored tiles; the harness line now says so (the browser already showed it as locked)             |
| a city showed population "-1/5"                                 | a city that lost live population below its level's start really is below zero and pays less; the city line now says so                  |
| the Raider's Charge applied sometimes                           | the unit line says "Charge: +1 Attack after a move of 2 tiles (needs Raiding)"                                                          |
| a Knight's "attacks left" counter                               | replaced by "Overrun: attacks again after this kill" on the attack that grants it                                                       |
| the Field Defense line said a siege shot ignores it             | a Catapult's shot is made against the Field Defense and then destroys it; the text, the harness line, and row 12 of section 11.2 say so |
| income stopped rising at level 4                                | the city line says that a level pays 4 Coins at most and that higher levels add unit slots and rewards                                  |
| a blast hurt the unit that set it                               | rule 6 of section 12.1; the preview names the unit that is not hit                                                                      |

No tile coordinates were added to any player-facing text.

### 12.9 Tests

`tests/unit/ruleset-v7-tuning-5.test.ts`: the identity; the Guard's rule
(Human only; Defense 1 from two tiles and 3 next to the attacker; two
Marksmen and a Fighter; Walls and a Field Defense add to the 1); the
Swordsman (last role, Human tree only, trained for 5 Coins with
Engineering, its exchanges with a Guard, a Knight, and two Catapults, the
stand-in art); Drill removed and the veteran invariant; Land Grant at 1
Coin; the unit that sets a blast; the labs; and the army play in
constructed positions: who plays it, the composition shares, never only
defenders, Knights against fragile enemies, units before research and
buildings for each of the three factions, training in every city with a
free slot, a ranged unit shoots, two ranged hits and a Fighter that
finishes a Guard, a melee unit that moves in for a good exchange and not
for a bad one, the garrison (the step beside the center with a Knight or a
Fighter near, no Move without Coins, an ordinary Move with nobody near),
a Catapult that stays out of an enemy Catapult's reach and one that moves
to a firing position, and a Field Defense under a Catapult's shot.

The older tests of the changed rules were updated in place, each with a
note: the Guard's damage from ranged attacks in the Martian, Ice Folk,
Candy, Dinosaur, and Goblin tests; Land Grant, Blast Mountain, hires, and
Drill in the tuning 1, 3, and 4 tests and the DOM and text-harness tests;
the reader audits. The recorded matches and decision pins that tests read
were recomputed. Three tests that need something to happen in a recorded
match moved to another seed or pairing, found by running the candidate
seeds once each and reading only whether the event occurs: the Undead
Frenzy and Lich splash tests, the Infect and Lifesteal round trip (seed
2), and the income-cap match (now Humans against Dinosaurs, seed 7,
because a Human mirror on that small map no longer runs 30 rounds).

## 13. Round 6

Round 5 was played by hand three times (Humans against the Goblin AI,
Humans against the Undead AI, Goblins against the Human AI; 14 x 14
dry-land maps). Two of the games were bloody: the player lost 27 and 33
units, the AI trained 67 and 54, focused fire, and attacked in groups. The
AI still lost all three, and the reports say why:

- With 17 units against 5 behind a gate it walked up and did not attack;
  when it did attack it fed three or four units a turn into two Marksmen.
- The Undead AI never took a village (three were in reach), stayed on one
  city with 3 Coins a turn and three unit slots, and was eliminated in
  round 12. In its last turns it researched with an enemy army at its
  capital and a free slot, and a unit next to the capital walked away.
- Neither the Goblin nor the Human AI reached its strong units. The Goblin
  AI researched Roads in round 5 and Marksmanship in round 22 and never
  bought a unit dearer than 3 Coins; the Human AI never researched
  Sawmilling or Chivalry. Income stayed at 9 to 11 Coins from round 9 to
  round 18.
- Small things that cost games: a Kaboom spent on one target, Guards in the
  open in front of Bomb Chuckers, units trained onto a center under three
  to six ranged units, a Raider idle beside the enemy capital for seven
  rounds.

The user's direction of 2026-10-06 for this round: **the AI first, the
mechanics second.** A heuristic AI without search stays weak, so the user
plays against many of them; "the problem is if even with overwhelming
numbers the AI can't break through my ranks. You need to fix that." The
game should be bloody, with constant turnover. Coins that pile up once a
war is decided are not a problem to solve. Units that are overpowering in
the right situation (the Knight's kill chains, Zombie conversion waves) are
wanted and stay as they are. No new Coin sinks. The result is judged on
constructed positions and by hand play, never by counting AI-against-AI
outcomes.

Round 6 is implemented on `pulp-wars-poc-7r49` (bead `pulp_wars-w49.6`).
Where this section and sections 1 to 12 differ, this section is the rule.
Nothing of it was played by hand yet. It had a correction pass after the
root's review (the same bead): each faction's own research order and army
mix so that the Undead field Zombies, Roads for a seat with three cities,
the assault at a gate one tile wide, and a tighter lab; the first draft is
named where it differed.

### 13.1 The changes

| #   | What                           | Round 5                                                                                        | Round 6                                                                                                                                                                                   |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Research price (a rule)        | the tier's base (5 / 7 / 9) plus **2** Coins for each technology owned beyond the first        | the base plus **1** Coin for each technology owned beyond the first (section 13.5)                                                                                                        |
| 2   | Reward unit (a rule)           | appears on the center; a unit standing there is pushed to the first free tile in reading order | **the unit on the center stays**; the reward unit appears on a free tile of the city next to the center (section 13.7)                                                                    |
| 3   | Damage from an unseen attacker | the victim's owner got no event: the unit lost HP, or died, without a line                     | the owner gets the damage and whether the unit died, nothing about the attacker (section 13.7)                                                                                            |
| 4   | Normal AI: attacking           | an exchange in its favor, or a combined kill; otherwise it waits                               | **the assault**: it weighs the position, masses outside its reach, commits with numbers, fires at the anchors first, takes losing exchanges on a focus, goes through a gap (section 13.3) |
| 5   | Normal AI: economy             | units before everything once an enemy city is known; the first research by economic value      | villages and city levels first, growth while no enemy is near, research toward each faction's signature units, the dear units bought (sections 13.4 and 13.5)                             |
| 6   | Normal AI: discipline          |                                                                                                | the nine rules of section 13.6                                                                                                                                                            |
| 7   | Labs                           | `LAB_SIEGE`, `LAB_BACKLINE`, `LAB_LATE`                                                        | three more: `LAB_BREAKTHROUGH`, `LAB_BREAKTHROUGH_GOBLIN`, `LAB_BREAKTHROUGH_UNDEAD` (section 13.2)                                                                                       |
| 8   | Text harness                   |                                                                                                | what an enemy unit would deal to yours, the reason of a rejected move, free Monuments in plain words, hits from unseen attackers (section 13.7)                                           |

Not changed, by the user's ruling: the Knight and Overrun, the Zombie, the
Stockpile at 4 Coins, every unit and price. No Coin sink was added, and a
city still cannot train with its center occupied. The Goblin Bomb Chucker
(23 of the hand player's 55 purchases in the third game) is recorded for
the Goblin pass and was not touched. AI head starts and alliances are
separate work.

The state shape did not change; a `7r48` save, replay, or session is
refused as incompatible because rule 1 changes what a recorded research
costs.

### 13.2 The bar: numbers against a prepared line

`LAB_BREAKTHROUGH` is the user's test as a staged position
(`src/engine/v7/missions/lab-breakthrough.ts`, 16 x 16). You hold the only
crossing between two lakes, eight tiles wide:

```text
     x 0123456789ABCDEF
y  0   .....~~~~.......
   2   .h...~~~~.....u.      h, H: your cities; u, U: the AI's
   4   ......G.........      G: Guard on a Mountain
   5   .....MS....f..u.      S: Swordsman in a Forest; M: Marksman
   6   ....C.G.........      G: Guard on a Field Defense; C: Catapult
   7   ...H.MS.........      H: your walled capital, a Guard on it
   8   ......S.......U.
   9   ....C.G.........
  10   .....MS....f....
  11   ......G.......u.
  13   .h...~~~~.......
  14   .....~~~~.....u.
```

14 units worth 63 Coins, three cities, 12 Coins a turn, Forestry (so the
Forests are cover), Engineering, Sawmilling, and Fortification. The AI
stands three tiles outside the reach of your Catapults and Marksmen with
**twice the value** and three level-4 cities (13 Coins a turn):

| Lab                       | Attacker | Its army                                                                                                | Units | Coins of units |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ----- | -------------- |
| `LAB_BREAKTHROUGH`        | Human    | 6 Swordsmen, 5 Fighters, 2 Guards, 5 Marksmen, 3 Catapults, 3 Knights, 2 Raiders                        | 26    | 125            |
| `LAB_BREAKTHROUGH_GOBLIN` | Goblin   | 6 Orc Brutes, 6 Goblins, 7 Bomb Chuckers, 4 Rocket Carts, 4 Scrap Buggies, 5 Wolf Riders, 1 Orc Warboss | 33    | 125            |
| `LAB_BREAKTHROUGH_UNDEAD` | Undead   | 6 Zombies, 6 Skeletons, 5 Banshees, 4 Liches, 4 Vampires, 3 Ghouls, 1 Necromancer                       | 29    | 127            |

The AI seat has no directive: it plays the ordinary Normal policy.

**The first draft was no bar.** The lab first gave the attacker two and a
half to three times the value (154 to 172 Coins), five level-5 cities with
a Barracks each (21 Coins a turn), and a defender script that never moved
or trained. The round-5 policy, run from its source on that lab, took the
capital too (rounds 6, 8, and 8 against rounds 5, 6, and 7). The lab above
is the tightened one: twice the value, an economy like yours, and a
defender that does what a player does cheaply.

**The bounded run.** This is the one AI-driven run that is automated
(`tests/unit/ruleset-v7-tuning-6.test.ts`). The player's side is a script:

1. the shots that draw no retaliation (Catapults, Marksmen) go together at
   the unit they kill, or else hurt most;
2. every other attack that kills or deals at least what it takes;
3. every city that can trains a Swordsman, or a Guard, or a Fighter, while
   the Coins last (the capital cannot: its Guard stands on the center);
4. a melee unit behind the line walks to the nearest gap in it.

| Attacker | On the line | Capital taken | Attackers lost by then | The round-5 policy, same lab and script |
| -------- | ----------- | ------------- | ---------------------- | --------------------------------------- |
| Human    | round 2     | round 7       | 7                      | round 9, 9 lost                         |
| Goblin   | round 2     | round 8       | 15                     | round 10, 17 lost                       |
| Undead   | round 3     | round 8       | 12                     | round 9, 17 lost                        |

(The losses are those of the whole run, to the end of the match or 16
rounds.) The test pins the round the capital falls for the three
attackers, so the round-5 policy fails it for each.

**What this run does and does not show.** At twice the value **both
policies break this line**; round 6 does it one to two rounds sooner and
with fewer losses. That is the honest size of the difference on an
eight-tile front against a script: a script does not counterattack, and a
line of fourteen units with two Catapults does not hold eight tiles
against twice its value whoever attacks it. What stopped the AI in the
hand-played games was not this. It was a gate one tile wide (first game,
rounds 9 to 18), in front of which the round-5 AI stood with 17 to 23
units, attacked piecemeal, and pulled back. That is section 13.3a and its
tests: a column of strong units now attacks the unit in the gate every
turn until it falls, where the round-5 policy made no attack at all.
Whether the line of a player who thinks holds is for the hand play of this
round.

### 13.3 How the AI attacks a position

The rules, the numbers, and the priorities are in
[Normal AI: the assault](../architecture/NORMAL_AI.md#the-assault-expansion-and-discipline-pulp_wars-w496).
In plain words:

- **It weighs the position.** Enemy units close to each other are one
  position. A unit weighs four times its price plus its HP; a unit behind
  Walls or on a Field Defense counts half as much again, in other cover a
  quarter more.
- **It masses first.** While its units within nine tiles outweigh the
  position by half but too few of them have arrived (within five tiles),
  those that have arrived wait outside every enemy's reach and the others
  come up.
- **It commits with numbers.** Once what has arrived outweighs the position
  by half, every unit closes in in the same turn, whatever reach it steps
  into. Once the battle is joined (a unit in contact, an enemy wounded) it
  keeps going at equal weight, so the first losses do not call it off.
  Without that advantage it plays as in round 5: only a good exchange or a
  kill.
- **It fires before it charges.** The shots from two or more tiles go
  first, at the anchors (a unit in cover or on a fortification, a Guard);
  then the melee units attack; a kill by a melee unit takes the tile.
- **It takes losing exchanges, on a focus.** A committed unit attacks
  although it takes more than it deals when the group can take half the
  target's HP this turn, when the battle is joined, or when the unit is
  lost anyway. It never makes an attack that kills it without a kill.
- **It goes through.** A fast unit that can reach a Marksman, a Catapult,
  or a support unit does so before the line fights (a Raider goes through a
  one-tile gap; a Knight makes its own with a kill). A unit that can step
  onto an empty enemy center does, and captures.
- **It does not walk away.** A committed unit makes no ordinary move that
  takes it farther from the position, a wounded one attacks before it
  recovers, and new units march to the same front.

Worked example (a test): a Guard on a Field Defense with a Marksman behind
it weighs 71. Three Fighters (60) do not attack it: a Fighter deals 4 and
takes 8. Six Fighters (120) commit; three can reach it in the first turn
and take 12 of its 17 HP, losing more HP than they take; the Guard is dead
in the second turn.

### 13.3a A gate one tile wide

A single-file front (every land route to the enemy's cities runs through
the same corridor, and a garrison in its own territory holds its far end)
has had its own siege since `pulp_wars-68k.6`: line up, bring siege
units, fire at one holder, rotate the wounded head out, and attack by hand
only a holder at half HP or less, or once 30 unspent Coins have piled up.
A seat without siege units and without a pile of Coins never attacked. In
the first draft of this round the assault of section 13.3 was simply
switched off there, which left exactly the user's complaint in place.

Now, for a seat that plays the army rules:

- **Numbers start the assault.** When the units that have come up outweigh
  the garrison by half (the same weights as in section 13.3), the siege is
  in its assault whatever the treasury holds: siege and ranged units take
  their firing tiles inside enemy reach and fire first at one holder; the
  head of the column attacks the holder in front of it **every turn** it
  survives the exchange, healthy holder or not; a worn head rotates out
  and the next strongest unit takes its place; the column goes through as
  soon as the mouth is open.
- **Explosives.** With numbers, a Mountain next to the corridor or to a
  holder is blasted before the column attacks (when the blast hits no own
  unit but the one that sets it): it hurts the holders and leaves ground
  the column can use. This is the one place the AI blasts outside its own
  territory.
- **Another way round.** A front is single-file only while no other
  explored route exists; the scouts of the campaign plan keep exploring,
  and the front dissolves the turn a second route is seen. Nothing new was
  added for this.

Tests (`tests/unit/ruleset-v7-chokepoint-ai.test.ts`, "numbers at the
gate"): five Swordsmen and no Coins against a healthy Guard in the gate
with a Fighter behind it attack in the first turn (17 to 8 HP) and kill
it in the second; with Explosives the Mountain beside the gate is blasted
first; two Guards against the same gate do not attack (no numbers: the old
siege). The twenty older tests of the siege pass unchanged.

### 13.4 Expansion and growth

| Seen in round 5                                                                              | Rule                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a Ghoul beside a free village attacked a Fighter instead; one city, 3 Coins a turn, all game | A unit that can step onto a free village does, before any exchange that is not a kill, **stays on it**, and captures next turn. Until the seat has three cities its first units are trained before research. |
| income flat at 9 to 11 Coins for ten rounds; 4 to 8 Coins idle at the unit limit             | While no enemy is within four tiles of a center, a city level, a harvest, or a hunt is bought **before** training; a Monument (free) at once.                                                                |
| every Coin went to units, cities stayed at level 2 and 3                                     | With two thirds of the unit slots filled and no enemy near, Farms, Lumber Camps, Mines, and Markets are bought before the army is topped up. Below two thirds, or with an enemy near, units come first.      |
| the level-4 reward                                                                           | Boom (3 population), not the 6 Coins.                                                                                                                                                                        |

Two diagnostic matches were read for behavior only (14 x 14, Dry Land;
Humans against Goblins, seed 1, and Goblins against Undead, seed 3): the
Human seat had three cities in round 5 and ten in round 18, the Goblin seat
of the second match four in round 10 and seven in round 20. In both the
other seat was boxed in on two or three cities and lost; that is not
evidence of anything.

### 13.5 Research: the price, the order, and the dear units

**The price** (`scripts/human-tuning-analysis-v7.ts round6`). The base by
tier is unchanged (5 / 7 / 9); each technology already owned beyond the
first adds 1 Coin, not 2.

| It is the player's | Tier 1: round 5 / round 6 | Tier 2  | Tier 3  |
| ------------------ | ------------------------- | ------- | ------- |
| 2nd                | 5 / 5                     | 7 / 7   | 9 / 9   |
| 3rd                | 7 / 6                     | 9 / 8   | 11 / 10 |
| 4th                | 9 / 7                     | 11 / 9  | 13 / 11 |
| 5th                | 11 / 8                    | 13 / 10 | 15 / 12 |
| 6th                | 13 / 9                    | 15 / 11 | 17 / 13 |
| 8th                | 17 / 11                   | 19 / 13 | 21 / 15 |
| 10th               | 21 / 13                   | 23 / 15 | 25 / 17 |
| 12th               | 25 / 15                   | 27 / 17 | 29 / 19 |
| 16th               | 33 / 19                   | 35 / 21 | 37 / 23 |
| 20th               | 41 / 23                   | 43 / 25 | 45 / 27 |

The whole land tree of 20 technologies costs 314 Coins in tier order (485
in round 5). In the first game the hand player's tenth technology would
have been Chivalry at 23 Coins; it is 17 now.

**The order** is each faction's own: its signature and best-value units
come first (`ARMY_RESEARCH_ROLES_V7`). The first draft of this round used
one order for all three (ranged, siege, breakthrough, line, defender,
support), which put the Zombie ninth and the Necromancer last: an Undead
AI that almost never fielded the units that make it Undead. From a
Gathering opener (`scripts/human-tuning-analysis-v7.ts round6`):

| #   | Humans                      | Price | Undead                          | Price | Goblins                        | Price |
| --- | --------------------------- | ----- | ------------------------------- | ----- | ------------------------------ | ----- |
| 2   | Hunting                     | 5     | Drill: **Zombie**               | 5     | Hunting                        | 5     |
| 3   | Marksmanship: **Marksman**  | 8     | Hunting                         | 6     | Marksmanship: **Bomb Chucker** | 8     |
| 4   | Drill: **Guard**            | 7     | Marksmanship: **Banshee**       | 9     | Scouting: **Wolf Rider**       | 7     |
| 5   | Forestry                    | 10    | Administration: **Necromancer** | 10    | Forestry                       | 10    |
| 6   | Sawmilling: **Catapult**    | 13    | Forestry                        | 11    | Sawmilling: **Rocket Cart**    | 13    |
| 7   | Scouting: Raider            | 10    | Sawmilling: **Lich**            | 14    | Raiding                        | 12    |
| 8   | Raiding                     | 13    | Scouting: Ghoul                 | 11    | Chivalry: **Scrap Buggy**      | 15    |
| 9   | Chivalry: **Knight**        | 16    | Raiding                         | 14    | Drill: **Orc Brute**           | 12    |
| 10  | Engineering: **Swordsman**  | 15    | Chivalry: **Vampire**           | 17    | Administration: **Warboss**    | 15    |
| 11  | Administration: **Captain** | 16    |                                 |       |                                |       |
|     | **Total**                   | 113   |                                 | 97    |                                | 97    |

So the Undead have the Zombie with the first technology they buy, the
Banshee with the third, and the Necromancer with the fourth; the Goblins
have the Bomb Chucker with the second and the Wolf Rider with the third;
the Humans have the Marksman with the second and the Guard, a cheap anchor,
with the third, and pay for that with the Catapult one technology later
(43 Coins in all instead of 34).

**Roads.** A seat with three or more cities researches Roads (by Scouting)
once it can train the first two units of its order, and Commerce after the
last. With fewer cities it does not. (In the first draft Roads was on no
order, and no unit took a Road step in three 26-round test matches.)

**The army's mix** is per faction too (`armySharesV7`): line, defender,
ranged, siege, breakthrough in percent.

| Faction | Line | Defender         | Ranged                 | Siege | Breakthrough | Also                                       |
| ------- | ---- | ---------------- | ---------------------- | ----- | ------------ | ------------------------------------------ |
| Humans  | 35   | 15               | 20                     | 15    | 15           | one Raider from five units                 |
| Undead  | 20   | **30** (Zombies) | 20                     | 15    | 15           | one Ghoul from five units                  |
| Goblins | 30   | 10               | **30** (Bomb Chuckers) | 15    | 15           | a Wolf Rider per four units, at most three |

An Undead army that grows from two Skeletons to twelve units buys four
Zombies, two Banshees, two Liches, and two Vampires (a test).

**How it uses Zombies.** What a Zombie kills rises as a Zombie, so cheap
infantry is its prey: an attack on a line unit of at most 2 Coins (a
Fighter, a Skeleton, a Goblin) is worth more to it than any other (12
strategic value), it walks toward the nearest such unit and not toward the
nearest enemy, and of the tiles it could step to it prefers the one fewer
enemy ranged and siege units reach (5 per unit). It is a preference: where
every tile is under fire it still advances.

**When it researches.** A technology is _due_ while the seat's city levels
add up to at least twice the technologies it owns beyond the first: two
city levels buy one technology, so research and growth advance together.
A due technology is bought before training when the Coins are there, no
enemy is within four tiles of a center, and the seat has its three cities
(or no city that can train). With an enemy near, units come first, as in
round 5. Training is never held back to save for a technology; when every
slot is full the Coins collect for it by themselves.

**The dear units.** A role whose class the army is short of gets 20 points
per Coin of its price, so with the Coins in hand the first city to train
buys the Catapult, the Knight, the Rocket Cart, the Scrap Buggy, the Lich,
or the Vampire and not another 1- or 2-Coin body. In the two
diagnostic matches the Human seat researched Marksmanship in round 5,
trained its first Catapult in round 8 and its first Knights in round 18,
and stood with 5 Catapults and 4 Knights in round 20; the Goblin seat
trained Bomb Chuckers from round 8 and a Rocket Cart in round 10 and stood
with 5 Rocket Carts and 2 Scrap Buggies in round 20 (in the hand-played
games of round 5: none of either).

### 13.6 Discipline

| Seen in round 5                                                                      | Rule                                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| research with an enemy army at the capital and a free slot                           | With an enemy within three tiles of a center, **nothing but units** is bought while a city can still train this turn.                                                           |
| the unit on the center attacked, so the city could not train                         | The unit on a center does not chip while it can still step aside: it steps aside, the city trains, and it attacks from the new tile if it can.                                  |
| a full-HP Zombie did not attack a wounded Fighter standing on its capital            | An enemy unit on an own center is attacked **whatever the exchange**.                                                                                                           |
| a unit next to the besieged capital walked away                                      | A unit within four tiles of a center with an enemy at its gates does not walk away from it and comes nearer.                                                                    |
| one unit a turn trained onto a center inside the reach of three to six Bomb Chuckers | A city does not train onto a center two or more enemy ranged units can hit while another city can train (unless an enemy capturer can walk onto that center next turn).         |
| pairs and threes standing together under splash                                      | A move that ends next to own units inside a splash attacker's reach is worth less than one that does not.                                                                       |
| Guards in the open in front of ranged units                                          | A Human Guard does not step into the open inside the reach of an enemy ranged or siege unit (a center, a Field Defense, a Mountain, or a Forest with Forestry is not the open). |
| a Kaboom on one unit, twice on the same Fighter                                      | A Kaboom only for a kill or on two or more enemies.                                                                                                                             |
| a Raider idle beside the enemy capital for seven rounds                              | A unit alone among enemies with nothing to attack goes back to the others; with Raiding it pillages an improvement in reach.                                                    |

"Never end a turn with the Coins for a useful unit and a free slot in a
city that can train" holds by the step aside of round 5 and is pinned by a
test with two garrisoned cities. What still leaves Coins unspent is the
rule that a city trains once a turn (the first game's 10 to 16 idle Coins
were a seat with two cities that could train and a roster that costs at
most 3): that is the pile-up the user ruled is not a problem.

### 13.7 Two defects and the text harness

- **A hit from an unseen attacker.** An attacker on a tile the victim's
  owner has not explored (a Bomb Chucker three tiles away) produced no
  event for that owner: the unit lost HP, or died with a bare death line.
  The owner now receives the hidden-source damage event that splash from
  an unseen attacker already used, with the unit that was hit first in its
  list: the amount and whether it died. It names no attacker and no tile
  of the attacker. The browser shows the hit on the unit as it shows
  splash; the text harness prints
  `HIT_UNSEEN u12(S0 Guard) @7,2 takes 6 from a source you do not see (hp 17->11)`.
- **A reward unit and the garrison.** A Militia or Scouts unit used to
  take the center and push the unit standing there to the first free tile
  in reading order, without the player choosing; a wounded Swordsman was
  pushed into Bomb Chucker range that way. The unit on the center now
  stays, and the reward unit appears on a free tile next to the center, one
  of the city's own territory first. Only when no tile next to the center
  is free does the old rule apply (the reward unit takes the center).
- **Text harness** (`docs/validation/TEXT_PLAY.md`): `options --unit` on
  an enemy unit lists what it would deal to each of your units it can
  reach next turn, and on your own unit what each visible enemy would deal
  to it (an estimate from public information); a rejected move says why
  (the unit has moved, the tile is occupied, too far, or the three rules
  that end a move early); a free Monument is one plain line at the top of
  `options` and under `options --city`; `lab` knows the three breakthrough
  labs.

### 13.8 Decisions that are forks, for the user to overrule

1. **An unfavourable exchange is taken on a focus, not always.** With a
   clear advantage the AI still does not send a Fighter alone at a Guard
   (4 dealt for 8 taken): it does so when the group can take half the
   target's HP that turn, when the battle is joined, or when the unit is
   lost anyway. The alternative, every committed unit attacks whatever it
   can reach, was tried first and burned units for hits the Guard healed
   back in its own land.
2. **"Clear advantage" is half as much again by weight** (four times the
   price plus the HP, fortified units counted higher), and equal weight
   once the battle is joined. A higher bar keeps the AI out of fights it
   would win slowly; a lower one makes it bleed against walls.
3. **"Nothing but units" ends when every city that can train has trained
   that turn.** With an enemy three tiles from a center and Coins left
   after training, the AI still researches or builds. Holding every Coin
   until the next turn was the literal reading; it would freeze a seat's
   economy whenever one raider stands near one city.
4. **Research is tied to city levels** (two levels a technology). It makes
   a small seat grow before it researches and a large one research at
   once. A fixed schedule by round would be simpler to explain and blind
   to how the game is going.
5. **Training is never held back for a technology or a dear unit.** The
   dear unit is bought when the Coins are there at the start of the turn;
   a poor seat still fills its slots with cheap units. Saving a turn for a
   Knight is the alternative.
6. **Each faction's research order is a fixed list.** It does not look at
   the enemy: an Undead seat buys Drill first against Goblins and against
   Liches alike. The Human Catapult is now the sixth technology, not the
   fifth, because the Guard comes before it.
7. **The reward unit beside the center** stands in the open for a turn,
   exhausted. The alternative, a choice of the tile by the player, is a
   new command.
8. **The lab's attacker has twice the Coins of units** and an economy like
   the defender's. At that ratio both policies still win it against a
   script; a lab that the round-5 policy loses outright would need a
   defender that counterattacks, which is a second AI, or a gate (the
   tests of section 13.3a).
9. **At a gate, numbers attack every turn, whatever the exchange**, as long
   as the attacker survives it. Against a Guard that recovers 4 HP a turn
   in its own land a column of Fighters loses more than it deals; the
   strongest unit goes first to make that rare, and the alternative is
   the waiting the user ruled out.
10. **A third of the Undead army is Zombies.** That is a guess at "a real
    share"; the number is one line in `src/ai/v7-army.ts`.

### 13.9 What is still open

- The AI's assault was checked on constructed positions and one scripted
  defender. A line that is two deep, a defender that counterattacks into
  the massing units, and a position it cannot see whole are for the hand
  play.
- It does not withdraw a wounded unit from a committed fight, does not
  hire, blasts only beside a gate, and does not build a Field Defense
  under fire.
- At a gate the column still attacks one unit at a time: it does not
  count what stands behind the holder beyond the garrison within three
  tiles, and a seat without Explosives has no way to widen the gap.
- A seat that loses the early war is boxed in on one or two cities and
  cannot recover: the rules above do not help a seat with 3 Coins a turn.
- The Goblin Bomb Chucker is still the one best Goblin unit, and the AI
  now buys more of them.
- In the one diagnostic match read after the correction pass (Undead
  against Humans, 14 x 14, seed 1) the Human seat took three cities early,
  so it researched Scouting and Roads before Forestry and had its first
  Catapult only in round 25: Roads delays the siege unit of a seat whose
  income stays low. The Undead seat had Drill in round 3, five Zombies in
  round 12, Necromancers in round 22, Liches and Vampires in round 28.

### 13.10 Tests

`tests/unit/ruleset-v7-tuning-6.test.ts`: the identity; the research price
(the table, the public tree, the engine's charge, the chain to Chivalry);
the assault (the three modes from strengths, the weights, three Fighters
that do not attack a Guard and six that kill it in two turns, staging and
the common advance, the Catapult on the anchor before the melee, the
Raider through the gap, shooters first for a ranged unit, a wounded unit
that keeps attacking); expansion and growth (the village before an
exchange and the unit that stays on it, harvest before training, pressed,
the free Monument, Boom at level 4); research (due, the order for the
three factions with its signature units first, Roads with three cities,
due research before training, training first on one city); the Undead and
their Zombies (a third of a growing army, the cheap infantry as a target,
the tile the Marksman does not reach); the dear units; discipline (two cities that both train, the enemy
on the own center, the garrison that steps aside, the covered center,
splash spacing, the Guard and the open, the Kaboom, the lone unit, the
second unit at the gates); the unseen attacker's damage (the event, the
browser's damage step, the death); the reward unit beside the center; and
the three labs with their bounded runs. The gate is in
`tests/unit/ruleset-v7-chokepoint-ai.test.ts` ("numbers at the gate").

The older tests of the changed rules were updated in place, each with a
note; the recorded matches and decision pins that tests read were
recomputed.
