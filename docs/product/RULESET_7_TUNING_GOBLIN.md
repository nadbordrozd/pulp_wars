# Ruleset 7: the Goblin faction pass

**Status:** implemented on `pulp-wars-poc-7r50` (bead `pulp_wars-w49.12`),
then played by hand in three games and corrected
([section 1.2](#12-the-correction-after-hand-play)): a rocket's Gang Up is
+1 at most, Plunder pays 2 Coins, and the Goblin and Human Normal AI were
changed. Section 12 lists what is open. The rules themselves are stated
in [Ruleset 7: current rules](RULESET_7_CURRENT.md); this document is the
reasoning and the record, in the shape of
[the Human pass](RULESET_7_TUNING_HUMAN.md).

**Superseded in part by [the economy rejig](RULESET_7_ECONOMY_REJIG.md)
(`pulp-wars-poc-7r54`, `pulp_wars-w49.16`).** Where this document gives a research price by the technologies owned (the
tier base plus 1 Coin for each technology owned, "the nth technology
costs …", "ten technologies and 97 Coins"), a reward giant taken at level
5 of the first capital or once per player, a Monument of +2, or an
achievement's old criterion, it records the rules it was written under.
Research is now priced by the cities owned (5 / 7 / 9 plus 1 / 2 / 3 for
each city beyond the first), every city offers its giant once from level
6, a Monument gives 3, and the achievements are harder and need no
technology. The passages are kept as history.

**What the user asked for** (2026-10-06): carry the Human tech tree
improvements over to the next faction and make sure it works. Fine balance
is not the goal. The faction must not be far too strong or far too weak,
every technology branch must be useful, and its units must differ from
other factions' by more than numbers. Two failures count: a faction that
always wins, and a faction with one unit so good that training anything else
makes no sense. A unit or a combination that is overpowering now and then,
and can be countered, is wanted. An ability that is too strong too early
goes behind a later technology instead of being weakened.

**The method** is the Human pass's: scenario reasoning from the engine's
exact public combat preview on constructed positions
(`scripts/goblin-tuning-analysis-v7.ts`, which plays no match), the seven
hand-played games that had a Goblin seat (rounds 5 to 8 of the Human pass),
and two single diagnostic matches read for what the Goblin AI researches and
buys. No AI-against-AI result was counted.

## 1. The changes

| #   | Change                   | Before (`7r49`)                                                                                                                           | Now (`7r50`)                                                                                                                                                                                            | Other factions                                                                                       |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Bomb Chucker and Gang Up | its bomb gets Gang Up like every Goblin attack (+1 Attack per own unit beside the target, to +2)                                          | **a bomb gets no Gang Up**. WAAAGH! still adds +1. Its splash, its death blast, its price, and its numbers are unchanged                                                                                | none (a Goblin unit rule)                                                                            |
| 2   | Orc Brute                | a defender with no rule of its own                                                                                                        | **Blast-proof**: not hit by an explosion (Kaboom, death blast, Blast Mountain) and not by the splash of an attack on a unit beside it                                                                   | their explosions and splash do not hurt an Orc Brute either (a Lich, a Battleship, a Blast Mountain) |
| 3   | Scrap Buggy              | Kaboom only before it attacks                                                                                                             | **Crash**: it may Kaboom after it has attacked, also while a Ram is waiting                                                                                                                             | none                                                                                                 |
| 4   | Level 2 reward           | Survey (the Humans: Scouts, the survey and a free Raider) or Stockpile                                                                    | **Scouts for the Goblins too**: the survey and a free Wolf Rider                                                                                                                                        | the other six keep the plain Survey until their passes                                               |
| 5   | Goblin Normal AI         | researches Bomb Chucker, Wolf Rider, Rocket Cart, Scrap Buggy, Orc Brute, Warboss; 30% Bomb Chuckers, 15% Rocket Carts, 15% Scrap Buggies | researches Bomb Chucker, Wolf Rider, **Orc Brute**, Rocket Cart, **Warboss**, Scrap Buggy; 20% Orc Brutes, 20% Bomb Chuckers, **25%** Rocket Carts, 15% Scrap Buggies; crashes a spent Buggy; section 8 | the Human AI researches the Swordsman third (section 8.2)                                            |
| 7   | Rocket Cart and Gang Up  | the whole Gang Up, +2                                                                                                                     | **+1 at most** (correction, section 1.2). WAAAGH! still adds +1                                                                                                                                         | none                                                                                                 |
| 8   | Plunder                  | 1 Coin a kill                                                                                                                             | **2 Coins a kill** (correction, section 1.2)                                                                                                                                                            | none                                                                                                 |
| 6   | Lab                      | none for the Goblins as the player                                                                                                        | `LAB_GOBLIN_MID`: the hand player is the Goblins in an even middle game ([section 9](#9-the-lab))                                                                                                       | —                                                                                                    |

No number of the Goblin roster changed: every price, HP, Attack, Defense,
Kaboom, and death blast is as it was. Three role mechanics are new
(`gangUpLimit`, `blastProof`, `kaboomAfterAttack`); no command, event, state,
or view shape changed (a `PLUNDER_AWARDED` event's Coins are twice its
kills). The identity is `pulp-wars-poc-7r50`; `7r49` joins the
prior identities and its autosave key the obsolete ones, as in every bump.

Unchanged on purpose: the Goblin, the Wolf Rider, the Warboss, the Troll,
Gang Up for every melee attack, Kaboom, the death blasts, Warrens, and every
shared rule of the Human pass.

### 1.1 Decisions that are forks, for the user to overrule

Each is implemented as stated; the alternative is what to ask for.

1. **A bomb gets no Gang Up at all.** The alternatives were a cap of +1 for
   bombs, a price of 4 Coins, or giving the bonus back with a technology
   (Fieldcraft would be the place). A cap still kills a Fighter with WAAAGH!
   and one helper and keeps the pattern of bombing one's own helpers; a
   price does not change which unit is best; a technology only delays the
   same end state, in which one 3-Coin unit answered every Human unit
   (section 2.1). The strong ability was not removed from the faction: it is
   the Rocket Cart's, two technologies later (fork 2).
2. **The Rocket Cart's Gang Up is +1 at most** (it kept the whole +2 in
   the first version; the correction of section 1.2). It costs 7 Coins, has
   8 HP and Defense 0.5, cannot move and fire, and dies to any unit that
   reaches it. With a Warboss and one helper it is still the Goblin kill at
   range: a Swordsman in a Forest, a Guard anywhere but on a fortified
   tile. The alternative is the +2 back, or no WAAAGH! for rockets.
3. **Blast-proof covers every explosion and every splash**, the enemy's
   too: an Orc Brute ignores a hostile Kaboom, a Blast Mountain, and the
   splash of a Lich or a Battleship. It does not cover a bomb thrown at the
   Brute itself, a Dwarf bomb or eruption, a Martian ray's Pierce, or a
   Mammoth's Sweep, and it does not hold while the Brute is embarked. The
   narrower rule (own side's blasts only) reads worse on the card.
4. **Crash is also legal in the middle of a Ram**, when the Buggy could
   still attack again. A Buggy that has Recovered or been Chilled into a
   sluggish turn still cannot.
5. **Scouts for the Goblins.** The comment on the Human rule said "until
   their passes"; a free Wolf Rider at level 2 (3 Coins against the
   Stockpile's 4) also gives the Goblin AI its first scout, which the
   hand-played games said it lacked. The other six factions were not
   touched.
6. **The Wolf Rider got no rule of its own.** It differs from the Human
   Raider by what it lacks (no Escape, stopped by zones of control) and by
   the faction's rules (Gang Up, Kaboom). If that is too thin, the proposal
   is **Pack**: a Wolf Rider counts as two units for Gang Up, so one rider
   beside a target gives everyone else +2 (section 5).
7. **Plunder pays 2 Coins a kill** (1 in the first version; section 4.2).
   The alternative a tester named is to drop its Roads prerequisite.
8. **The Goblins get no unit at Engineering and no technology of their
   own** in place of Fortification or Explosives (five other factions have
   both renamed). Their heavy hitters are Gang Up, the Rocket Cart, and the
   Scrap Buggy; a mid-priced heavy line unit would be a second way to do
   what Gang Up does.
9. **The 1-Coin Goblin and its Kaboom of 5 were left alone.** The player of
   `r5c` called it the best Coin sink in the game. It costs a unit slot and
   a city's one training of the turn, has Move 1, and dies to any attack on
   the way; the AI used it two or three times a game.
10. **The Human Guard's weakness has no Goblin twin.** The Orc Brute keeps
    Defense 2.5 at every distance (section 4.3).

### 1.2 The correction after hand play

Three games were played by hand on the first version of this pass: `ga`
(the lab `LAB_GOBLIN_MID` as the Goblins, 12 rounds), `gb` (a full game as
the Goblins against the Human AI, dry land 14 x 14, seed 9, won in round
25), and `gc` (a full game as the Humans against the Goblin AI, seed 11,
won in round 30). The user's bar for the correction: the faction not far
too strong or too weak, every branch useful, units different by more than
numbers; few changes that can be read on a card.

| Change                       | Was                                                   | Now                                                                                             | Why (the testers' numbers)                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rocket Cart: Gang Up         | +2                                                    | **+1 at most**; WAAAGH! still +1                                                                | 14 of 37 kills in `ga` and 13 of 34 in `gb` from four to six Carts, one lost in both games together; seven Guards died to one rocket each. The table below is what a rocket deals now. The Guard was not changed. |
| Plunder                      | 1 Coin a kill                                         | **2 Coins a kill**                                                                              | `ga`: 37 kills in ten rounds would have paid 37 Coins against 37 for Roads and Plunder; `gb`: 8 Coins in four rounds. Section 4.2.                                                                                |
| Goblin AI: the Orc Brute     | researched last; 10% of the army                      | researched **third**; **20%**; a Brute's Move is worth more beside its own shooters             | `gc`: two Knights killed seventeen Goblin units in one turn (round 21); the one Brute came in round 20.                                                                                                           |
| Goblin AI: Scrap Buggies     | trained on any center; 20%                            | not trained onto a threatened or frontier center; 15%; **crashes when it would die anyway**     | `gc`: seven Buggies, two attacks, no Crash; five died on the center they were trained on.                                                                                                                         |
| Goblin AI: bombs             | no Move to a throw that would splash an own unit      | moves up to a throw that is worth its splash (no own unit killed, twice the value on the enemy) | `gc`: Bomb Chuckers walked up and did not throw.                                                                                                                                                                  |
| Every army seat: the assault | weight by price and HP                                | a unit with Gang Up weighs half as much again; a joined battle with 1.5 times the units commits | `gc` rounds 15 to 20: 17 to 23 Goblin units stood in front of 11 Human units without attacking. Section 8.1.                                                                                                      |
| Goblin AI: Rocket Carts      | 20% of the army                                       | 25%                                                                                             | `gc`: two Carts in fourteen rounds with Sawmilling; they were the only thing that stopped the advance.                                                                                                            |
| Human AI: research order     | Marksman, Guard, Catapult, Knight, Swordsman, Captain | Marksman, Guard, **Swordsman**, Catapult, Knight, Captain                                       | `gb`: seven technologies in 25 rounds, two of them toward a Catapult it never trained; no unit above a Guard. Section 8.2.                                                                                        |
| Text harness                 |                                                       | the lab says 35 Coins; a hire prints `HIRED`; a Kaboom lists the units hit; the Market's Coins  | `ga`, `gb` notes.                                                                                                                                                                                                 |

**What a Rocket Cart deals now** (a full-HP target, three tiles away;
`scripts/goblin-tuning-analysis-v7.ts rocket`):

| Target         | Ground            | alone | alone, WAAAGH! | one helper | one helper, WAAAGH! |
| -------------- | ----------------- | ----- | -------------- | ---------- | ------------------- |
| Guard 17hp     | open              | 12    | 17K            | 17K        | 17K                 |
| Guard 17hp     | Forest (Forestry) | 11    | 15             | 15         | 17K                 |
| Guard 17hp     | Field Defense     | 8     | 12             | 12         | 16                  |
| Guard 17hp     | walled center     | 8     | 12             | 12         | 16                  |
| Swordsman 15hp | open              | 9     | 13             | 13         | 15K                 |
| Swordsman 15hp | Forest (Forestry) | 8     | 11             | 11         | 15K                 |
| Swordsman 15hp | Field Defense     | 7     | 10             | 10         | 14                  |
| Swordsman 15hp | walled center     | 7     | 10             | 10         | 14                  |
| Fighter 12hp   | open              | 10    | 12K            | 12K        | 12K                 |
| Fighter 12hp   | Forest (Forestry) | 8     | 12K            | 12K        | 12K                 |
| Fighter 12hp   | Field Defense     | 7     | 11             | 11         | 12K                 |
| Fighter 12hp   | walled center     | 7     | 11             | 11         | 12K                 |
| Knight 13hp    | open              | 12    | 13K            | 13K        | 13K                 |
| Knight 13hp    | Forest (Forestry) | 11    | 13K            | 13K        | 13K                 |
| Knight 13hp    | Field Defense     | 8     | 12             | 12         | 13K                 |
| Knight 13hp    | walled center     | 8     | 12             | 12         | 13K                 |

Read: alone a rocket kills nothing healthy. With WAAAGH! **or** one helper
it kills a Guard in the open (the Guard's Defense is 1 against ranged
attacks) and a Fighter or a Knight off a fortified tile; with both it also
kills a Swordsman in
the open or in a Forest and a Guard in a Forest. On a Field Defense or a
walled center a Guard is left at 1 HP and a Swordsman at 1 HP with both: no
healthy Guard or Swordsman on a fortified tile dies to one rocket any more
(with +2 a Guard on a walled center died to a rocket with WAAAGH!, and a
Swordsman in the open to a rocket with two helpers and no Warboss).

**The Lumber Camp "counted twice"** (a tester's note) is the rule, not a
defect, and nothing was changed. A Lumber Camp gives its own city +1
population as a camp, and it is a contributor to exactly one Sawmill: the
Sawmill of its own city if it stands beside one, otherwise the first
adjacent Sawmill of the same owner in (y, x) order
([current rules, section 8.3](RULESET_7_CURRENT.md)). That Sawmill's +1
goes to the Sawmill's city, which may be another city of the owner. The
total is what the same buildings would give inside one city; it is split
across two cities when the camp and the mill belong to different ones.

**Open ideas, not done now**, with what the testers saw:

- **The Rocket Cart at Fieldcraft instead of Sawmilling.** Fieldcraft was a
  Coin dump in both Goblin games ("never a buy while the war was open",
  `gb`; "never worth it", `ga`), and the Cart came with the economy
  technology every Goblin player buys anyway (round 11 in `gb`). Moving it
  would give the weak node a reason and delay the Cart by one technology.
- **Pack for the Wolf Rider** (it counts as two for Gang Up; section 5).
  Both Goblin testers called it "a Raider with different numbers".
- **A 1-Coin Goblin takes half a unit slot.** `ga`: two Goblins bought in
  twelve rounds, "every slot was full from R2 and a slot is worth more than
  1 Coin"; `gb` bought thirteen while it had slots to fill.
- **Scrap Buggy numbers.** `ga` used Crash twice and called it worth it (a
  Ram of three kills, then 5 on a walled Knight and a Swordsman); `gb`
  never crashed (both previews killed nothing and hit an own Bomb Chucker)
  and lost all three Buggies within two enemy turns of contact for four
  kills: "worth 8 Coins only for its Move 3". The two disagree, so its 10
  HP and Attack 3 were left.
- **The stack on cheap units** (`ga`): Gang Up, WAAAGH!, and Charge take a
  Wolf Rider to Attack 5. Not changed; the Rocket Cart's cap is the one
  step taken.

## 2. Scenario analysis

### 2.0 Numbers from the script

`npx tsx scripts/goblin-tuning-analysis-v7.ts` prints what follows at
`7r50`, with the same tables for Forest cover and a Field Defense, the
Goblin mirror, and the technology list. Each cell is the damage dealt / the
damage taken in a first attack with both units at full HP, then × the
number of attacks by fresh full-HP attackers that kill; `g` is the damage
with two own Goblins beside the target (the digit is the Gang Up the engine
applied) and `gw` the same with WAAAGH!; `K` is a kill of the full-HP
defender.

#### Goblin attackers on Human units

**Open ground**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp          | Guard 3c 17hp           | Raider 4c 12hp           | Marksman 4c 12hp         | Captain 5c 10hp          | Swordsman 5c 15hp       | Catapult 8c 10hp         | Knight 9c 13hp           | Juggernaut —c 40hp    |
| --------------------------------- | ------------------------ | ----------------------- | ------------------------ | ------------------------ | ------------------------ | ----------------------- | ------------------------ | ------------------------ | --------------------- |
| Goblin (1c, 6, 1.5/0.5)           | 3/5 ×4; g2 10; gw 12K    | 2/6 ×6; g2 8; gw 12     | 4/2 ×3; g2 12K; gw 12K   | 4/2 ×3; g2 12K; gw 12K   | 4/2 ×3; g2 10K; gw 10K   | 3/6 ×5; g2 9; gw 13     | 5/0 ×2; g2 10K; gw 10K   | 4/2 ×3; g2 12; gw 13K    | 2/6 ×15; g2 7; gw 11  |
| Wolf Rider (3c, 10, 2/1)          | 5/5 ×3; g2 12K; gw 12K   | 4/8 ×4; g2 10; gw 14    | 6/2 ×2; g2 12K; gw 12K   | 6/2 ×2; g2 12K; gw 12K   | 6/2 ×2; g2 10K; gw 10K   | 4/6 ×3; g2 11; gw 15K   | 7/0 ×2; g2 10K; gw 10K   | 6/2 ×2; g2 13K; gw 13K   | 3/10 ×10; g2 9; gw 13 |
| Wolf Rider (Charge) (3c, 10, 2/1) | 8/4 ×2; g2 12K; gw 12K   | 7/7 ×3; g2 14; gw 17K   | 10/1 ×2; g2 12K; gw 12K  | 10/1 ×2; g2 12K; gw 12K  | 10K/0 ×1; g2 10K; gw 10K | 7/5 ×2; g2 15K; gw 15K  | 10K/0 ×1; g2 10K; gw 10K | 10/1 ×2; g2 13K; gw 13K  | 6/10 ×6; g2 13; gw 16 |
| Bomb Chucker (3c, 8, 2/1)         | 5/0 ×3; g0 5; gw 8       | 6/0 ×3; g0 6; gw 10     | 6/0 ×2; g0 6; gw 10      | 6/2 ×2; g0 6; gw 10      | 6/0 ×2; g0 6; gw 10K     | 4/0 ×3; g0 4; gw 7      | 7/0 ×2; g0 7; gw 10K     | 6/0 ×2; g0 6; gw 10      | 3/0 ×10; g0 3; gw 6   |
| Orc Brute (3c, 15, 2/2.5)         | 5/5 ×3; g2 12K; gw 12K   | 4/8 ×4; g2 10; gw 14    | 6/2 ×2; g2 12K; gw 12K   | 6/2 ×2; g2 12K; gw 12K   | 6/2 ×2; g2 10K; gw 10K   | 4/6 ×3; g2 11; gw 15K   | 7/0 ×2; g2 10K; gw 10K   | 6/2 ×2; g2 13K; gw 13K   | 3/12 ×10; g2 9; gw 13 |
| Orc Warboss (5c, 12, 2/1)         | 5/5 ×3; g2 12K; gw 12K   | 4/8 ×4; g2 10; gw 14    | 6/2 ×2; g2 12K; gw 12K   | 6/2 ×2; g2 12K; gw 12K   | 6/2 ×2; g2 10K; gw 10K   | 4/6 ×3; g2 11; gw 15K   | 7/0 ×2; g2 10K; gw 10K   | 6/2 ×2; g2 13K; gw 13K   | 3/12 ×10; g2 9; gw 13 |
| Rocket Cart (7c, 8, 3.5/0.5)      | 10/0 ×2; g1 12K; gw 12K  | 12/0 ×2; g1 17K; gw 17K | 12K/0 ×1; g1 12K; gw 12K | 12K/0 ×1; g1 12K; gw 12K | 10K/0 ×1; g1 10K; gw 10K | 9/0 ×2; g1 13; gw 15K   | 10K/0 ×1; g1 10K; gw 10K | 12/0 ×2; g1 13K; gw 13K  | 7/0 ×5; g1 11; gw 14  |
| Scrap Buggy (8c, 10, 3/1)         | 8/4 ×2; g2 12K; gw 12K   | 7/7 ×3; g2 14; gw 17K   | 10/1 ×2; g2 12K; gw 12K  | 10/1 ×2; g2 12K; gw 12K  | 10K/0 ×1; g2 10K; gw 10K | 7/5 ×2; g2 15K; gw 15K  | 10K/0 ×1; g2 10K; gw 10K | 10/1 ×2; g2 13K; gw 13K  | 6/10 ×6; g2 13; gw 16 |
| Troll (—c, 40, 4/3)               | 12K/0 ×1; g2 12K; gw 12K | 10/6 ×2; g2 17K; gw 17K | 12K/0 ×1; g2 12K; gw 12K | 12K/0 ×1; g2 12K; gw 12K | 10K/0 ×1; g2 10K; gw 10K | 11/4 ×2; g2 15K; gw 15K | 10K/0 ×1; g2 10K; gw 10K | 13K/0 ×1; g2 13K; gw 13K | 9/9 ×4; g2 16; gw 20  |

**Walled city center (+2 Defense), the attacker without Explosives**

| Attacker (cost, HP, Atk/Def)      | Fighter 2c 12hp        | Guard 3c 17hp         | Raider 4c 12hp          | Marksman 4c 12hp        | Captain 5c 10hp          | Swordsman 5c 15hp      | Catapult 8c 10hp         | Knight 9c 13hp          | Juggernaut —c 40hp    |
| --------------------------------- | ---------------------- | --------------------- | ----------------------- | ----------------------- | ------------------------ | ---------------------- | ------------------------ | ----------------------- | --------------------- |
| Goblin (1c, 6, 1.5/0.5)           | 2/5 ×5; g2 7; gw 11    | 2/6 ×7; g2 6; gw 10   | 2/2 ×4; g2 8; gw 12K    | 2/2 ×4; g2 8; gw 12K    | 2/2 ×4; g2 8; gw 10K     | 2/6 ×6; g2 7; gw 10    | 3/0 ×3; g2 9; gw 10K     | 2/2 ×5; g2 8; gw 12     | 1/6 ×19; g2 6; gw 9   |
| Wolf Rider (3c, 10, 2/1)          | 3/5 ×3; g2 9; gw 12K   | 3/8 ×5; g2 8; gw 11   | 4/2 ×3; g2 10; gw 12K   | 4/2 ×3; g2 10; gw 12K   | 4/2 ×3; g2 10K; gw 10K   | 3/6 ×4; g2 8; gw 12    | 4/0 ×3; g2 10K; gw 10K   | 4/2 ×3; g2 10; gw 13K   | 2/10 ×12; g2 7; gw 10 |
| Wolf Rider (Charge) (3c, 10, 2/1) | 6/4 ×2; g2 12K; gw 12K | 5/7 ×3; g2 11; gw 15  | 7/1 ×2; g2 12K; gw 12K  | 7/1 ×2; g2 12K; gw 12K  | 7/1 ×2; g2 10K; gw 10K   | 5/5 ×3; g2 12; gw 15K  | 7/0 ×2; g2 10K; gw 10K   | 7/1 ×2; g2 13K; gw 13K  | 5/10 ×7; g2 10; gw 14 |
| Bomb Chucker (3c, 8, 2/1)         | 3/0 ×3; g0 3; gw 6     | 4/0 ×4; g0 4; gw 7    | 4/0 ×3; g0 4; gw 7      | 4/2 ×3; g0 4; gw 7      | 4/0 ×3; g0 4; gw 7       | 3/0 ×4; g0 3; gw 5     | 4/0 ×3; g0 4; gw 7       | 4/0 ×3; g0 4; gw 7      | 2/0 ×12; g0 2; gw 5   |
| Orc Brute (3c, 15, 2/2.5)         | 3/5 ×3; g2 9; gw 12K   | 3/8 ×5; g2 8; gw 11   | 4/2 ×3; g2 10; gw 12K   | 4/2 ×3; g2 10; gw 12K   | 4/2 ×3; g2 10K; gw 10K   | 3/6 ×4; g2 8; gw 12    | 4/0 ×3; g2 10K; gw 10K   | 4/2 ×3; g2 10; gw 13K   | 2/12 ×12; g2 7; gw 10 |
| Orc Warboss (5c, 12, 2/1)         | 3/5 ×3; g2 9; gw 12K   | 3/8 ×5; g2 8; gw 11   | 4/2 ×3; g2 10; gw 12K   | 4/2 ×3; g2 10; gw 12K   | 4/2 ×3; g2 10K; gw 10K   | 3/6 ×4; g2 8; gw 12    | 4/0 ×3; g2 10K; gw 10K   | 4/2 ×3; g2 10; gw 13K   | 2/12 ×12; g2 7; gw 10 |
| Rocket Cart (7c, 8, 3.5/0.5)      | 7/0 ×2; g1 11; gw 12K  | 8/0 ×2; g1 12; gw 16  | 8/0 ×2; g1 12K; gw 12K  | 8/0 ×2; g1 12K; gw 12K  | 8/0 ×2; g1 10K; gw 10K   | 7/0 ×2; g1 10; gw 14   | 9/0 ×2; g1 10K; gw 10K   | 8/0 ×2; g1 12; gw 13K   | 6/0 ×6; g1 9; gw 12   |
| Scrap Buggy (8c, 10, 3/1)         | 6/4 ×2; g2 12K; gw 12K | 5/7 ×3; g2 11; gw 15  | 7/1 ×2; g2 12K; gw 12K  | 7/1 ×2; g2 12K; gw 12K  | 7/1 ×2; g2 10K; gw 10K   | 5/5 ×3; g2 12; gw 15K  | 7/0 ×2; g2 10K; gw 10K   | 7/1 ×2; g2 13K; gw 13K  | 5/10 ×7; g2 10; gw 14 |
| Troll (—c, 40, 4/3)               | 9/3 ×2; g2 12K; gw 12K | 8/6 ×2; g2 15; gw 17K | 10/1 ×2; g2 12K; gw 12K | 10/1 ×2; g2 12K; gw 12K | 10K/0 ×1; g2 10K; gw 10K | 8/4 ×2; g2 15K; gw 15K | 10K/0 ×1; g2 10K; gw 10K | 10/1 ×2; g2 13K; gw 13K | 7/9 ×5; g2 14; gw 17  |

The Bomb Chucker's row before the change (`7r49`), for comparison:

| Ground        | Fighter                | Guard                 | Raider                 | Marksman               | Captain                | Swordsman             | Catapult               | Knight                 | Juggernaut           |
| ------------- | ---------------------- | --------------------- | ---------------------- | ---------------------- | ---------------------- | --------------------- | ---------------------- | ---------------------- | -------------------- |
| open          | 5/0 ×3; g2 12K; gw 12K | 6/0 ×3; g2 14; gw 17K | 6/0 ×2; g2 12K; gw 12K | 6/2 ×2; g2 12K; gw 12K | 6/0 ×2; g2 10K; gw 10K | 4/0 ×3; g2 11; gw 15K | 7/0 ×2; g2 10K; gw 10K | 6/0 ×2; g2 13K; gw 13K | 3/0 ×10; g2 9; gw 13 |
| walled center | 3/0 ×3; g2 9; gw 12K   | 4/0 ×4; g2 10; gw 14  | 4/0 ×3; g2 10; gw 12K  | 4/2 ×3; g2 10; gw 12K  | 4/0 ×3; g2 10K; gw 10K | 3/0 ×4; g2 8; gw 12   | 4/0 ×3; g2 10K; gw 10K | 4/0 ×3; g2 10; gw 13K  | 2/0 ×12; g2 7; gw 10 |

#### Human attackers on Goblin units

**Open ground**

| Attacker (cost, HP, Atk/Def)  | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ----------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Fighter (2c, 12, 2/2)         | 6K/0 ×1       | 6/2 ×2             | 6/0 ×2              | 4/6 ×3            | 6/2 ×2              | 7/0 ×2             | 6/2 ×2              | 4/8 ×9        |
| Guard (3c, 17, 1.5/3)         | 5/1 ×2        | 4/2 ×3             | 4/0 ×2              | 3/7 ×5            | 4/2 ×3              | 5/0 ×2             | 4/2 ×3              | 2/9 ×13       |
| Raider (4c, 12, 2/1)          | 6K/0 ×1       | 6/2 ×2             | 6/0 ×2              | 4/6 ×3            | 6/2 ×2              | 7/0 ×2             | 6/2 ×2              | 4/8 ×9        |
| Raider (Charge) (4c, 12, 2/1) | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 7/5 ×2            | 10/1 ×2             | 8K/0 ×1            | 10K/0 ×1            | 7/7 ×5        |
| Marksman (4c, 12, 2/1)        | 6K/0 ×1       | 6/0 ×2             | 6/2 ×2              | 4/0 ×3            | 6/0 ×2              | 7/0 ×2             | 6/0 ×2              | 4/0 ×9        |
| Captain (5c, 10, 1/1)         | 3/1 ×2        | 2/2 ×4             | 2/0 ×3              | 1/8 ×9            | 2/2 ×5              | 3/0 ×3             | 2/2 ×4              | 1/10 ×26      |
| Swordsman (5c, 15, 3.5/2.5)   | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 9/5 ×2            | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 8/6 ×4        |
| Catapult (8c, 10, 3/0.5)      | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 7/0 ×2            | 10/0 ×2             | 8K/0 ×1            | 10K/0 ×1            | 7/0 ×5        |
| Knight (9c, 13, 4/1)          | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 11/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 10/6 ×4       |
| Juggernaut (—c, 40, 4/4)      | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 11/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 10/6 ×4       |

#### Blasts and splash

| Unit         | Kaboom | Death blast |
| ------------ | ------ | ----------- |
| Goblin       | 5      | —           |
| Wolf Rider   | 4      | —           |
| Bomb Chucker | 4      | 2           |
| Orc Brute    | —      | —           |
| Orc Warboss  | —      | —           |
| Rocket Cart  | 5      | 4           |
| Scrap Buggy  | 5      | 4           |
| Troll        | —      | —           |

- **A Goblin Kabooms among three Fighters (1 Coin)**
  - Goblin (6 HP) Kabooms: own Goblin explodes for 5: 5 on Fighter, 5 on Fighter, 5 on Fighter
  - Left: Goblins nothing; Humans Fighter 7, Fighter 7, Fighter 7.
- **A Goblin Kabooms beside an Orc Brute that holds two Fighters**
  - Goblin (6 HP) Kabooms: own Goblin explodes for 5: 5 on Fighter, 5 on Fighter
  - Left: Goblins Orc Brute 15; Humans Fighter 7, Fighter 7.
- **A Bomb Chucker throws at the middle of Guard, Swordsman, Marksman standing together**
  - Bomb Chucker (8 HP) attacks Swordsman (15 HP): deals 4, takes 0; splash 2 on Guard, 2 on Marksman
  - Left: Goblins Bomb Chucker 8; Humans Guard 15, Swordsman 11, Marksman 10.
- **The same throw with WAAAGH!, two own Goblins and an Orc Brute next to the target**
  - Orc Warboss calls WAAAGH!: 4 units inspired
  - Bomb Chucker (8 HP) attacks Swordsman (15 HP): deals 7, takes 0, WAAAGH!; splash 4 on Guard, 4 on Marksman, 4 on own Goblin, 4 on own Goblin
  - Left: Goblins Orc Warboss 12, Bomb Chucker 8, Goblin 2, Goblin 2, Orc Brute 15; Humans Guard 13, Swordsman 8, Marksman 8.
- **A Fighter kills a wounded Bomb Chucker that stands between two more and beside an Orc Brute (the death blasts chain)**
  - Fighter (12 HP) attacks Bomb Chucker (2 HP): deals 2 (kills), takes 0, advances; Bomb Chucker explodes for 2: 2 on Goblin, 2 on Bomb Chucker (kills), 2 on own Fighter, 2 on Bomb Chucker (kills); Bomb Chucker explodes for 2: 2 on Goblin, 2 on own Fighter; Bomb Chucker explodes for 2: 2 on Goblin (kills), 2 on own Fighter
  - Left: Humans Fighter 6; Goblins Orc Brute 15.

#### Scenarios

- **Three Bomb Chuckers and two Goblins against a Guard, a Swordsman and a Marksman in the open, the Goblins already beside the line (one Goblin turn: the bombs, then the Goblins)**
  - Bomb Chucker (8 HP) attacks Swordsman (15 HP): deals 4, takes 0; splash 2 on Marksman, 2 on Guard, 2 on own Goblin, 2 on own Goblin
  - Bomb Chucker (8 HP) attacks Swordsman (11 HP): deals 5, takes 0; splash 3 on Marksman, 3 on Guard, 3 on own Goblin, 3 on own Goblin
  - Bomb Chucker (8 HP) attacks Swordsman (6 HP): deals 6 (kills), takes 0; splash 3 on Marksman, 3 on Guard, 1 on own Goblin (kills), 1 on own Goblin (kills); Plunder +2
  - (g1 is gone)
  - (g2 is gone)
  - Left: Goblins Bomb Chucker 8, Bomb Chucker 8, Bomb Chucker 8; Humans Guard 9, Marksman 4.
- **The same army, bombs first: the Goblins start one tile back and close in after the three throws**
  - Bomb Chucker (8 HP) attacks Swordsman (15 HP): deals 4, takes 0; splash 2 on Marksman, 2 on Guard
  - Bomb Chucker (8 HP) attacks Swordsman (11 HP): deals 5, takes 0; splash 3 on Marksman, 3 on Guard
  - Bomb Chucker (8 HP) attacks Swordsman (6 HP): deals 6 (kills), takes 0; splash 3 on Marksman, 3 on Guard; Plunder +2
  - Goblin moves up: done
  - Goblin moves up: done
  - Goblin (6 HP) attacks Guard (9 HP): deals 7, takes 5, Gang Up +1
  - Goblin (6 HP) attacks Guard (2 HP): deals 2 (kills), takes 0, Gang Up +1, advances; Plunder +2
  - Left: Goblins Bomb Chucker 8, Bomb Chucker 8, Bomb Chucker 8, Goblin 1, Goblin 6; Humans Marksman 4.
- **A Scrap Buggy with WAAAGH! rams a backline: Catapult, then two Marksmen in a row, a Guard beside the last; then it crashes**
  - Orc Warboss calls WAAAGH!: 1 units inspired
  - Scrap Buggy (10 HP) attacks Catapult (10 HP): deals 10 (kills), takes 0, Gang Up +1, WAAAGH!, advances, attacks again; Plunder +2
  - Scrap Buggy (10 HP) attacks Marksman (12 HP): deals 10, takes 1
  - Scrap Buggy (9 HP) attacks Marksman (12 HP): refused (UNIT_ALREADY_ACTED)
  - Scrap Buggy (9 HP) Kabooms: own Scrap Buggy explodes for 5: 2 on Marksman (kills), 5 on own Orc Warboss; Plunder +2
  - Left: Goblins Orc Warboss 7; Humans Marksman 12, Guard 17.
- **A Scrap Buggy with WAAAGH! and two Goblins beside its first target: a Swordsman in Forest, then the Marksman and the Catapult behind; then it crashes**
  - Orc Warboss calls WAAAGH!: 3 units inspired
  - Scrap Buggy (10 HP) attacks Swordsman (15 HP): deals 15 (kills), takes 0, Gang Up +2, WAAAGH!, advances, attacks again; Plunder +2
  - Scrap Buggy (10 HP) attacks Marksman (12 HP): deals 10, takes 1
  - Scrap Buggy (9 HP) attacks Catapult (10 HP): refused (UNIT_ALREADY_ACTED)
  - Scrap Buggy (9 HP) Kabooms: own Scrap Buggy explodes for 5: 2 on Marksman (kills), 5 on own Goblin, 5 on own Goblin; Plunder +2
  - Left: Goblins Orc Warboss 12, Goblin 1, Goblin 1; Humans Catapult 10.
- **A Human Knight rides into three Bomb Chuckers and a Rocket Cart standing together**
  - Knight (13 HP) attacks Bomb Chucker (8 HP): deals 8 (kills), takes 0, advances, attacks again; Bomb Chucker explodes for 2: 2 on Bomb Chucker, 2 on Rocket Cart, 2 on Bomb Chucker, 2 on own Knight
  - Knight (11 HP) attacks Rocket Cart (6 HP): deals 6 (kills), takes 0, advances, attacks again; Rocket Cart explodes for 4: 4 on Bomb Chucker, 4 on own Knight, 4 on Bomb Chucker
  - Knight (7 HP) attacks Bomb Chucker (2 HP): deals 2 (kills), takes 0, advances; Bomb Chucker explodes for 2: 2 on own Knight
  - Knight (5 HP) attacks Bomb Chucker (2 HP): refused (UNIT_ALREADY_ACTED)
  - Left: Humans Knight 5; Goblins Bomb Chucker 2.
- **The same Knight when the Bomb Chuckers stand apart behind an Orc Brute**
  - Knight (13 HP) attacks Orc Brute (15 HP): deals 11, takes 4
  - Left: Humans Knight 9; Goblins Orc Brute 4, Bomb Chucker 8, Bomb Chucker 8, Bomb Chucker 8.
- **A Rocket Cart with WAAAGH! and two Goblins beside the target fires at a Guard on a walled center**
  - Orc Warboss calls WAAAGH!: 3 units inspired
  - Rocket Cart (8 HP) attacks Guard (17 HP): deals 16, takes 0, Gang Up +1, WAAAGH!
  - Left: Goblins Orc Warboss 12, Rocket Cart 8, Goblin 6, Goblin 6; Humans Guard 1.
- **A bomb, then two Wolf Riders (Charge) and a Goblin on a Guard on a center without Walls**
  - Bomb Chucker (8 HP) attacks Guard (17 HP): deals 6, takes 0; splash 3 on own Wolf Rider, 3 on own Goblin, 3 on own Wolf Rider
  - Wolf Rider (7 HP) attacks Guard (11 HP): deals 11 (kills), takes 0, Gang Up +2, advances; Plunder +2
  - Wolf Rider: its target is gone
  - Goblin: its target is gone
  - Left: Goblins Bomb Chucker 8, Wolf Rider 7, Wolf Rider 7, Goblin 3; Humans nothing.
- **Two Goblins against a Human Fighter in the open (2 Coins against 2)**
  - Goblin (6 HP) attacks Fighter (12 HP): deals 6, takes 4, Gang Up +1
  - Goblin (6 HP) attacks Fighter (6 HP): deals 6 (kills), takes 0, Gang Up +1, advances; Plunder +2
  - Left: Goblins Goblin 2, Goblin 6; Humans nothing.
- **Two Swordsmen attack an Orc Brute on a Field Defense**
  - Swordsman (15 HP) attacks Orc Brute (15 HP): deals 7, takes 5
  - Swordsman (15 HP) attacks Orc Brute (8 HP): deals 8 (kills), takes 0, advances
  - Left: Humans Swordsman 10, Swordsman 15; Goblins nothing.

#### Goblin prices

| Unit         | Technology (tier)  | Cost   | Hired | HP  | Atk / Def | Move | Range | Kaboom | Death blast | A city of income 3 / 5 / 7 pays for one a turn |
| ------------ | ------------------ | ------ | ----- | --- | --------- | ---- | ----- | ------ | ----------- | ---------------------------------------------- |
| Goblin       | —                  | 1      | 2     | 6   | 1.5 / 0.5 | 1    | 1     | 5      | —           | yes / yes / yes                                |
| Wolf Rider   | SCOUTING (1)       | 3      | 5     | 10  | 2 / 1     | 2    | 1     | 4      | —           | yes / yes / yes                                |
| Bomb Chucker | MARKSMANSHIP (2)   | 3      | 5     | 8   | 2 / 1     | 1    | 2     | 4      | 2           | yes / yes / yes                                |
| Orc Brute    | DRILL (1)          | 3      | 5     | 15  | 2 / 2.5   | 1    | 1     | —      | —           | yes / yes / yes                                |
| Orc Warboss  | ADMINISTRATION (2) | 5      | 8     | 12  | 2 / 1     | 1    | 1     | —      | —           | no / yes / yes                                 |
| Rocket Cart  | SAWMILLING (3)     | 7      | 11    | 8   | 3.5 / 0.5 | 1    | 2-3   | 5      | 4           | no / no / yes                                  |
| Scrap Buggy  | CHIVALRY (3)       | 8      | 12    | 10  | 3 / 1     | 3    | 1     | 5      | 4           | no / no / no                                   |
| Troll        | —                  | reward | —     | 40  | 4 / 3     | 1    | 1     | —      | —           | —                                              |

Unit slots of a Goblin city (Warrens +1): L1 3/4, L2 4/5, L3 5/6, L4 6/7, L5 7/8 (without / with Planning); a Human city has one fewer at every level.

### 2.1 What the matrix says

- **Before the change the Bomb Chucker was the one best unit, and the
  engine says why.** A 3-Coin unit that moves and throws, with two 1-Coin
  Goblins beside its target, killed a full-HP Fighter, Raider, Marksman,
  Captain, Catapult, or Knight in one throw in the open, and with WAAAGH! a
  Guard and a Swordsman as well: every Human unit but the Juggernaut. It
  took nothing back from a melee unit, splashed half of the hit onto
  everything around, and did the same from behind its own line. That is the
  unit four hand-play reports named, and the report of the player who played
  the Goblins (`r5c`: 23 of 55 purchases, "answered Guard, Swordsman and
  Marksman alike"). The numbers that made it are Gang Up and WAAAGH! at
  range: Attack 2 became 5.
- **Without Gang Up it is the Marksman's cousin and still the best unit for
  its price.** It deals what a Marksman deals (5 to a Fighter, 6 to a Guard
  or a Knight, 4 to a Swordsman) for 3 Coins against 4, with half of that
  on every neighbour of the target, and with WAAAGH! 8, 10, and 7. It no
  longer kills anything healthy by itself: three throws kill one Swordsman
  (the first two scenarios). It has 8 HP, cannot throw at a neighbour, and dies
  to one Swordsman, one Knight, one charging Raider, or two of anything.
- **A kill now takes the mob or a machine.** A Goblin with two helpers hits
  a Fighter for 10 and a Marksman for 12 (a kill); a charging Wolf Rider
  with two helpers kills a Swordsman (15) and a Fighter; a Scrap Buggy with
  two helpers kills a Swordsman in the open (15), and in a Forest with
  WAAAGH!, and rides on; a Rocket Cart with one helper kills a Guard (17)
  from three tiles and deals a Swordsman 13 (15, a kill, with WAAAGH!).
  Those are the rows that used to be the Bomb Chucker's.
- **Bombs first is now also the right order.** In the first scenario the
  three Bomb Chuckers throw at a Swordsman their own two Goblins already
  touch: the Swordsman dies, and so do both Goblins, of the splash. In the
  second the Goblins hang back until the bombs are thrown and then walk
  up: the Swordsman dies to the three throws, the splash leaves the Guard
  at 9, the two Goblins kill it with Gang Up (7 and 2), and no Goblin is
  lost. Before the change a throw at a target with two Goblins beside it
  had Gang Up +2 (11 on the Swordsman instead of 4), which paid for the
  Goblins it killed.
- **The Rocket Cart is the strongest thing a Goblin player can field, and
  the most fragile.** Alone it deals 10 to a Fighter, 12 to a Guard, 9 to a
  Swordsman. With one helper (the most its Gang Up takes) it kills a Guard,
  a Fighter, or a Knight in the open; with WAAAGH! as well a Swordsman in
  the open or in a Forest. On a walled center a Guard keeps 1 HP of 17 and
  a Swordsman 1 of 15 (the table of section 1.2). A Marksman deals it 7 of
  its 8 HP; a Fighter that reaches it kills it in two hits; a Knight, a
  Swordsman, a Catapult, and a charging Raider kill it in one, and its
  death blast of 4 goes off among its own crew.
- **The Scrap Buggy alone is not a Knight.** At Attack 3 it kills a Catapult
  or a Captain and deals a Marksman or a Raider 10 of 12, so a chain into a
  backline stops at the first archer (third scenario: one kill, and a
  Marksman left at 2 HP). With Crash that stop is where it blows up: the
  Marksman dies and everything else beside it takes 5. With two helpers on
  its first target and WAAAGH! it kills a Swordsman in a Forest, and then
  the Marksman behind dies to the blast (fourth scenario).
- **The Orc Brute holds for two attacks of anything and one-shots
  nothing.** A Swordsman deals it 9 of 15, a Knight 11, a Catapult 7, a
  Marksman 4; on a Field Defense 7, 8, 5, and 3. It deals 4 to 6. It is no
  wall of the kind the Human Guard was (two Swordsmen kill it on a Field
  Defense), and it does not need the Guard's weakness.
- **Human high units against the horde.** A Swordsman, a Knight, or a
  Catapult kills a Goblin, a Wolf Rider, a Bomb Chucker, a Rocket Cart, or
  a Scrap Buggy in one attack; only the Brute and the Troll survive one (a Warboss survives a Catapult shot). A
  Fighter kills a Goblin and needs two attacks for the rest. The roster is
  cheap because it dies: that is the faction, and it is what makes Plunder,
  Warrens, and the 1-Coin replacement matter.
- **Two Goblins beat a Fighter** (2 Coins against 2): 6 and 6 with Gang
  Up, one Goblin left at 2 HP. Three Goblins on a walled Guard deal it 14
  of 17 and all die (the Human pass's note); a fourth kills it.
- **Kaboom is 5 to everything around for 1 Coin**: three Fighters go from
  12 to 7. Beside an Orc Brute the Brute is not touched. A death-blast
  chain (the last blast scenario) still runs through Bomb Chuckers that
  stand together and kills them all; the Brute beside them is not hurt.
- **A Knight in a cluster of exploders** kills three of four and ends at 5
  of 13 HP from their blasts (2, 4, 2). Behind an Orc Brute, with the Bomb
  Chuckers apart, it deals the Brute 11, takes 4, and reaches nobody.

## 3. Every Goblin unit

"Buy it when" is the situation a player meets in which this unit is the
right purchase and another is not.

| Unit         | Cost | Its job                                                                                             | Buy it when                                                                                                        | What counters it                                                                                |
| ------------ | ---- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Goblin       | 1    | a body: the helper that makes Gang Up, the capturer, the screen, and a 5-damage blast on legs       | always, as the last purchase of a turn and the first of a poor one; before an assault, two per target              | everything (one hit from any Human unit); a Kaboom needs it to arrive alive                     |
| Wolf Rider   | 3    | the fast gang member: arrives beside a softened unit, finishes it with Charge, takes the center     | a center has been emptied or a wounded unit stands two or three tiles from the mob; villages; Catapults left alone | any two attacks; zones of control stop it, so a screen keeps it off a backline                  |
| Bomb Chucker | 3    | the opening salvo: unanswered damage on a group before the mob closes in                            | the enemy stands two or three to a 3 × 3 (every line does); a center to soften; Catapults to hunt (two throws)     | a unit beside it (it cannot throw at a neighbour), a Knight, a Raider; its own clustering       |
| Orc Brute    | 3    | the anchor: holds a tile for two attacks, gives Gang Up from there, and ignores the explosions      | the fight is where your own bombs, Kabooms, and death blasts fall; an escort for Rocket Carts; a center to hold    | Swordsmen and Knights in pairs, Catapults; it cannot move and attack, so stepping back beats it |
| Orc Warboss  | 5    | WAAAGH!: +1 Attack on the next attack of every own unit within two tiles                            | from the first assault on: it is the only thing that strengthens a bomb, and it turns many near-kills into kills   | anything that reaches it (12 HP, Defense 1); it does not heal                                   |
| Rocket Cart  | 7    | the kill at range: with a helper beside the target and a Warboss it removes a unit in cover         | a Guard or a Swordsman stands in cover, on a Field Defense, or on a walled center, or a Juggernaut comes           | any unit that reaches it; a Catapult outranges nothing but trades; it cannot move and fire      |
| Scrap Buggy  | 8    | the chain and the crash: kills along a line the mob touches, or drives into a backline and blows up | the enemy keeps Catapults and Marksmen behind a line with a gap, or Swordsmen in the open beside your Goblins      | any shot (10 HP, Defense 1); a Guard; a screen without a gap                                    |
| Troll        | —    | the siege body the first capital grants once: 40 HP, regenerates 4                                  | taken at level 5 of the first capital                                                                              | Catapults and Marksmen in numbers, time                                                         |

**The first failure, a faction that always wins.** The evidence is seven
hand-played games. The player who took the Goblins (`r5c`) won without
contest on Bomb Chuckers. Humans played by hand beat the Goblin AI in both
full games (`r5a`, `r8e`) and lost the capital of the staged line to it
once (`r7b`). After the change the Goblin player's cheap kill
is gone and every kill needs units that die next turn; the Goblin AI loses
its bomb stacking, which it used rarely (seven throws in `r8e`, none of
them with Gang Up), and keeps the Wolf Rider, Scrap Buggy, and Rocket Cart
kills that broke the line in `r7b`. Neither side of that is measured until
the lab is played.

**The second failure, one best unit.** Before: the Bomb Chucker, by the
matrix and by four reports. After, the right purchase by situation:

- the enemy line is two tiles away and healthy: **Bomb Chuckers**, and a
  **Warboss** behind them;
- the line has been bombed and must now die: **Goblins** to make the gang,
  **Wolf Riders** to finish and to step onto the center;
- one unit will not die (a Guard on Walls, a Swordsman in a Forest): a
  **Rocket Cart**;
- the fight is under your own bombs, or Knights and Raiders are diving on
  your Bomb Chuckers and Carts: **Orc Brutes**;
- there are Catapults and Marksmen behind a gap: a **Scrap Buggy**.

**What should make a Goblin player want the 7 and 8 Coin units.** Three
things, in the order they bite.

1. _They do what no cheap unit does any more._ Only the Rocket Cart kills
   a healthy unit in cover from range (with a helper and WAAAGH! 17 on a
   Guard and 15 on a Swordsman in a Forest, against the Bomb Chucker's 6 and
   4), and only the Scrap Buggy kills twice in a turn or carries a blast
   three tiles.
2. _Unit slots._ A level-3 Goblin city holds five units and trains one a
   turn. In every hand-played game the slots and the one training, not the
   Coins, were the limit from about round 16. A slot holding a Rocket Cart
   or a Buggy is worth two or three holding Bomb Chuckers, which was not
   true while the Bomb Chucker had Gang Up.
3. _They are spent._ A Buggy that rams is dead next turn or crashes this
   turn; a Rocket Cart that has fired is the enemy's first target. Two dear
   units a turn are 15 Coins, the whole income of five cities in the middle
   of the game. That is the pressure the user described for Polytopia, and
   it needs no Coin sink.

Coins still pile up once a war is decided, as for the Humans.

## 4. Every Goblin technology

### 4.1 The tree

Costs are for the second, fifth, and ninth technology a player buys. The
naval branch is left out.

| Technology     | Tier | Cost        | Gives a Goblin                                                            | When a thoughtful player buys it                                                                                    | Verdict                             |
| -------------- | ---- | ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Gathering      | 1    | 5 / 8 / 12  | Harvest Fruit; shows Fertile Ground                                       | first, with Fruit by the capital                                                                                    | good                                |
| Hunting        | 1    | 5 / 8 / 12  | Hunt Game                                                                 | first, with Game instead; the way to both ranged units                                                              | good                                |
| Scouting       | 1    | 5 / 8 / 12  | Wolf Rider (Move 2, sight 2)                                              | early on a large map; the first fast capturer                                                                       | good                                |
| Drill          | 1    | 5 / 8 / 12  | Orc Brute (Blast-proof); shows Ore; +2 Coins for a first capture          | when the fighting starts under your own bombs, or Knights reach your Bomb Chuckers                                  | good (the Brute had no job)         |
| Farming        | 2    | 7 / 10 / 14 | Farm                                                                      | with Fertile Ground                                                                                                 | good                                |
| Administration | 2    | 7 / 10 / 14 | Orc Warboss (WAAAGH!); Market; Disband                                    | before the first assault: WAAAGH! is +1 for the whole mob and the only bonus a bomb gets                            | good (was optional)                 |
| Forestry       | 2    | 7 / 10 / 14 | Lumber Camp; Clear Forest; Forest cover                                   | on the way to the Rocket Cart; the cover itself is worth little to units of Defense 0.5 and 1                       | a step, weak alone                  |
| Marksmanship   | 2    | 7 / 10 / 14 | Bomb Chucker                                                              | early: unanswered damage and splash for 3 Coins                                                                     | good (was the automatic first buy)  |
| Roads          | 2    | 7 / 10 / 14 | Roads; population for linked cities                                       | with a second city a few tiles away                                                                                 | good                                |
| Raiding        | 2    | 7 / 10 / 14 | Pillage (3 Coins); Wolf Rider Charge                                      | with Wolf Riders on the board (a charging rider with two helpers kills a Swordsman); the way to the Buggy           | good                                |
| Engineering    | 2    | 7 / 10 / 14 | Mountains passable; Mine; Workshop; Redevelop. **No unit**                | with Ore or a Mountain line                                                                                         | economy only                        |
| Fortification  | 2    | 7 / 10 / 14 | Field Defense, built by Orc Brutes only (+2 Defense)                      | to hold a center against Swordsmen and Knights; every blast, your own too, destroys a Field Defense                 | situational; the step to Explosives |
| Milling        | 3    | 9 / 12 / 16 | Windmill (population; heals units beside it)                              | with two Farms around a tile; the only healing a Goblin army has besides rest                                       | good                                |
| Planning       | 3    | 9 / 12 / 16 | +1 unit in every city; Land Grant                                         | from the middle game, when slots are the limit                                                                      | good                                |
| Sawmilling     | 3    | 9 / 12 / 16 | Sawmill; **Rocket Cart**                                                  | when a Guard or a Swordsman stands where bombs do not kill it                                                       | good (the Cart was a Coin dump)     |
| Fieldcraft     | 3    | 9 / 12 / 16 | Replant Forest; Forest march; Bomb Chucker sight 2                        | on a wooded map, for an army that must cross Forest                                                                 | weak, as for the Humans             |
| Plunder        | 3    | 9 / 12 / 16 | +2 Coins for every enemy unit your units or blasts kill; **Markets hire** | at war with a Market: a second purchase a turn in that city and one unit above its limit; the Coins are section 4.2 | fair                                |
| Chivalry       | 3    | 9 / 12 / 16 | **Scrap Buggy** (Ram, Crash); Clear for farming                           | against a backline of Catapults and Marksmen, or Swordsmen in the open                                              | good (the Buggy was a Coin dump)    |
| Metallurgy     | 3    | 9 / 12 / 16 | Forge; units cost 1 Coin less in a city with a Forge (a Goblin stays 1)   | late, with Mines: a Bomb Chucker 2, a Rocket Cart 6, a Scrap Buggy 7                                                | fair                                |
| Explosives     | 3    | 9 / 12 / 16 | Blast Mountain (5 to everything around, never to an Orc Brute); Breach    | to take a walled center with the mob: Breach removes the Walls from every Goblin's hit, and Gang Up is still there  | good                                |

No node is dead for a Goblin and none is an automatic buy. The two weak
ones, Fieldcraft and Forestry's cover, are weak for the Humans too.
Marksmanship was the automatic second purchase and is now one of three
openers with Scouting and Drill. The six units cost 97 Coins of research in
the AI's order (Gathering free, then Hunting 5, Marksmanship 8, Scouting 7,
Drill 8, Forestry 11, Sawmilling 14, Administration 13, Raiding 14, Chivalry
17).

### 4.2 Plunder against land trade

Plunder replaces Commerce's land trade (+1 Coin a turn for every city a
Road links to another). At 1 Coin a kill no Goblin player bought it for the
Coins: in `ga` 37 kills in ten rounds of the bloodiest war the lab allows
would have returned 37 Coins against 37 for Roads and Plunder; in `gb` it
returned 8 Coins in four rounds, and bought at the earliest sensible moment
28 by the end against the same price, where a Human with the same eight
cities linked earns about 8 a turn and one Market paid more.

At **2 Coins a kill** the same games read: `ga` 74 Coins in ten rounds
(about 7 a turn at war), `gb` 16 in four rounds and 56 from round 14. The
earlier game `r5c` (20 kills in rounds 11 to 20, 29 in rounds 21 to 29) is
4 and then 6 Coins a turn, against the 5 and 12 its twelve cities would
have earned linked by Road. So Plunder now pays about what land trade pays
a seat at war in the middle of a game and half of it at the end, nothing at
peace, and it is the only income that arrives in the enemy's turn
(retaliation kills and death blasts). It also needs no Road tiles. The hire
comes with the node as before (a Bomb Chucker for 5, a Rocket Cart for 11,
a Scrap Buggy for 12, one above the city's limit).

### 4.3 How each change of the Human pass lands for the Goblins

| Change of the Human pass                                     | For the Goblins                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research price: tier base plus 1 per technology owned        | The same formula. Every Goblin unit is ten technologies and 97 Coins.                                                                                                                                            |
| Forest cover needs Forestry                                  | Applies. It matters least to this faction: a Fighter still kills a Goblin in cover (6), and a Bomb Chucker takes 5 instead of 6. Only the Brute gains (a Swordsman 8 instead of 9).                              |
| Blast Mountain is an explosion; Breach                       | Applies. An Orc Brute is not hit by a Blast Mountain, so a Brute may stand beside the Mountain it sets off. Breach with Gang Up is the Goblin way into a walled center.                                          |
| Commerce: land trade between linked cities                   | Not for the Goblins: their Commerce is Plunder (section 4.2).                                                                                                                                                    |
| Commerce: Markets hire                                       | Applies (a Goblin 2, the 3-Coin units 5, a Warboss 8, a Rocket Cart 11, a Scrap Buggy 12).                                                                                                                       |
| The reward ladder: Barracks, the 6-Coin Treasury, one giant  | Applies: the Troll once, in the first capital. A Goblin Militia is two Goblins.                                                                                                                                  |
| Level 2: Scouts (the survey and a free Raider)               | **Now for the Goblins too** (this pass): a free Wolf Rider, without Scouting.                                                                                                                                    |
| The Raider is not stopped by zones of control                | Human only, and not given to the Wolf Rider: a 3-Coin unit that slips past a screen and Kabooms for 4 among Catapults would be the Human Raider's trick with a bomb on it. The Wolf Rider stays the pack's unit. |
| Pillage pays 3; a Raider keeps its Move                      | The 3 Coins apply to every Goblin land unit. The Move after it needs Escape, which the Wolf Rider does not have: its Pillage ends its turn.                                                                      |
| Fieldcraft: Forest march                                     | Applies.                                                                                                                                                                                                         |
| A Field Defense is +2                                        | Applies to the one Goblin unit that builds it, the Orc Brute: a Swordsman deals it 7 instead of 9.                                                                                                               |
| Land Grant 1 Coin a tile                                     | Applies.                                                                                                                                                                                                         |
| The Guard is open to ranged attacks                          | Human only. The Orc Brute needs no twin: it has 15 HP and Defense 2.5 against the Guard's former 17 and 3, two Catapult shots or two Swordsmen kill it, and it was never the wall the Guard was.                 |
| The Swordsman at Engineering                                 | Human only. The Goblins have no mid-priced heavy line unit and do not need one (fork 8); Engineering is an economy technology for them.                                                                          |
| Drill removed; a Blast Mountain spares the unit that sets it | Apply.                                                                                                                                                                                                           |
| The Normal AI plays an army                                  | A Goblin seat plays it, with its own research order and shares (section 8).                                                                                                                                      |

## 5. What makes each unit different

By mechanic, against the unit of the same role in the Human roster.

| Unit         | Human unit | What it does that the Human unit does not                                                                             | What it lacks                                      | A reskin?                                |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| Goblin       | Fighter    | Gang Up; Kaboom; two for a Militia                                                                                    | Field Defense                                      | no                                       |
| Wolf Rider   | Raider     | Gang Up; Kaboom                                                                                                       | Escape; it is stopped by zones of control          | the nearest to one (fork 6)              |
| Bomb Chucker | Marksman   | splash on every neighbour, friend and foe; explodes when it dies; Kaboom; cannot throw at a neighbour; **no Gang Up** | a shot at a unit beside it; retaliation in melee   | no                                       |
| Orc Brute    | Guard      | **Blast-proof**; Gang Up; the only Goblin unit that builds a Field Defense                                            | the Guard's Defense 3 (and its weakness to ranged) | was one; no longer                       |
| Orc Warboss  | Captain    | WAAAGH! reaches two tiles and siege and support units; a real fighter (Attack 2, 12 HP)                               | Tend Wounded: a Goblin army has no healer          | no                                       |
| Rocket Cart  | Catapult   | Gang Up at range (+1 at most), the only Goblin ranged unit that has it; explodes when it dies; Kaboom                 | 2 HP                                               | was close to one; its job is now its own |
| Scrap Buggy  | Knight     | Gang Up on every hit of a Ram; **Crash**; explodes when it dies                                                       | capture; the Knight's Attack 4 alone               | was close to one; no longer              |
| Troll        | Juggernaut | regenerates 4 a turn anywhere                                                                                         | 1 Defense                                          | no                                       |

**Pack**, the proposal for the Wolf Rider if fork 6 is overruled: "counts as
two for Gang Up" (the wolf and the rider). One Wolf Rider beside a target
gives every other attacker +2. It would make the fast unit the one that
sets up a Rocket Cart or a Buggy on a target the Goblins on foot cannot
reach in time, which is a job the Human Raider does not have. It was not
built because the Wolf Rider already has purchases of its own (section 3);
it is one of the open ideas of section 1.2.

## 6. Why each change, and what it must not do

### 6.1 A bomb gets no Gang Up

Section 2.1 has the numbers. The rule is one line on one card. What it
keeps: the Bomb Chucker throws after moving, takes nothing back from melee,
splashes, explodes when it dies, and is the cheapest unanswered damage in
the game. What it must not do is make the faction toothless early, when
there is no Warboss, Cart, or Buggy: then the kills are two Goblins on a
Fighter (2 Coins against 2) and a charging Wolf Rider, as before.

It also removes a pattern that read badly: the strongest play was to stand
your own Goblins beside the target and then bomb them. A bomb now wants no
friend near its target, the mob wants every friend there, and the turn has
an order.

### 6.2 Blast-proof

The Orc Brute could not move and attack, had no ability, and was hit by
its own side's bombs like any Goblin. Testers saw six of them make no
attack in ten rounds. It now has a place no other Goblin unit can stand:
where the explosions are. A Goblin may Kaboom beside it, a Bomb Chucker may
die beside it, a bomb may land on its neighbour. It still cannot move and
attack and still dies to two Swordsmen.

What it must not do is make a line of Brutes immune to the faction's
counters. It does not: Human Marksmen, Catapults, Swordsmen, and Knights
attack it as before, and an enemy Bomb Chucker throws at the Brute itself
for 4.

### 6.3 Crash

A Scrap Buggy that had rammed stood at 9 HP beside the enemy and died to
the next shot, and its death blast of 4 went off on the enemy's terms,
often among Goblins ("four lost to four shots", `r7b`). Now the player may
end the Ram with the Kaboom of 5 instead. It makes the 8-Coin unit a
one-turn weapon: a kill or two, then a blast three tiles inside the
enemy's position. The cost is the unit, every time.

### 6.4 Scouts

The Human level-2 reward was made a choice by adding a Raider to the
survey. The same choice for a Goblin city was a survey nobody took.

## 7. What was not changed, and why

- **Gang Up for melee, Kaboom, death blasts, Warrens:** they are the
  faction.
- **Every number of the roster:** no matchup needed one once the bomb lost
  Gang Up.
- **The Wolf Rider, Engineering, the 1-Coin Goblin, the Brute's Defense:**
  forks 6 and 8 to 10.
- **Fieldcraft:** weak for every faction; a Goblin fix (the place to give
  bombs a bonus back) is fork 1.
- **The other factions:** nothing but what Blast-proof says about their
  splash and blasts on an Orc Brute.

## 8. The Normal AI

- **Research order** (`ARMY_RESEARCH_ROLES_V7.GOBLIN`): Bomb Chucker, Wolf
  Rider, Orc Brute, Rocket Cart, Warboss, Scrap Buggy. The Orc Brute is
  third since the correction (it was last): Drill is the fifth technology a
  Goblin seat owns, about round 10, and the Brute is the one Goblin unit a
  Knight's chain stops on.
- **Army shares** (`ARMY_SHARES_V7.goblin`): Goblins 20%, Orc Brutes 20%,
  Bomb Chuckers 20%, Rocket Carts 25%, Scrap Buggies 15% (30, 10, 30, 15,
  15 before the pass); against two or more hostile ranged or siege units
  15, 20, 20, 25, 20. Wolf Riders and the Warboss keep their own counts.
- **Gang Up and Blast-proof** are read from the engine: the policy's own
  Gang Up estimate gives a bomb none and a rocket at most +1, and its blast
  estimates leave an Orc Brute out, so a Kaboom or a bomb beside an own
  Brute is no longer scored as friendly fire.
- **Orc Brutes stand beside the shooters.** A Goblin seat's defender-class
  unit values a Move by 6 for each own Bomb Chucker, Rocket Cart, or
  Warboss it would stand beside, two at most (`ARMY_ESCORT_VALUE_V7`). It
  is a Goblin seat's rule only: for every faction's defenders it slowed the
  Undead attacker of `LAB_BREAKTHROUGH_UNDEAD` by a round.
- **Scrap Buggies.** A Goblin seat trains no Buggy onto a threatened or
  frontier center (the score of a breakthrough unit there is lowered by
  400, `ARMY_FRONT_BREAKTHROUGH_COST_V7`; a Brute or a Goblin is trained
  there and the Buggy in another city). A Buggy with a Ram waiting attacks
  the next target in reach (that was already so; a test now holds it).
  **Crash:** a Buggy that has attacked, would be killed in the enemy's
  turn, and whose blast hits at least one enemy and kills no own unit,
  crashes; before, an army seat's Kaboom needed a kill or two enemies.
- **Bombs.** An army unit's Move toward an attack skipped every throw that
  would splash an own unit. It now takes the throw when no own or allied
  unit dies of the splash and the hit and splash on the enemy are worth at
  least twice the splash on its own (the measure the attack itself already
  used); an Orc Brute is in no splash.
- **Rocket Carts** are a quarter of the army and are bought as soon as the
  Coins are there; the Gang Up setup Move (a Goblin steps beside a unit an
  own rocket can reach) was already in the policy and a test now holds it.

### 8.1 Why the army stood still (`gc`, rounds 15 to 20)

The recorded position at the start of the Goblin seat's turn in round 17
(`tests/fixtures/ruleset-v7-goblin-standing-army.json`): fourteen Goblin
units near eight Human units, the battle joined. The assault rule weighed
the two sides by price and HP: 216 for the Goblins against 287 for the
Humans (Swordsmen on Mountains count a quarter more). At 75% the rule said
do not commit, every turn, while the Human player bought Chivalry and two
Knights; in round 21 the Knights killed seventeen units.

The weight was wrong for this faction: 4 x price + HP makes a 1-Coin Goblin
a tenth of a Swordsman, though two Goblins with Gang Up beat a Fighter and
a charging Wolf Rider with two helpers kills a Swordsman. Three changes,
the first two for every army seat:

- a unit of a kind with Gang Up weighs half as much again
  (`ARMY_GANG_UP_STRENGTH_V7` 150; Bomb Chuckers, whose bombs get none, do
  not): 284 against 287 in the recorded position;
- a battle that is already joined commits at 70% of the enemy's weight when
  the seat has one and a half times the enemy's units there
  (`ARMY_COMMIT_JOINED_COUNT_WEIGHT_V7`);
- bombers move to a throw that is worth its splash (above).

Replayed from the recorded state the seat makes six attacks in round 17,
two of them bombs (none in the game), and in round 19 four attacks after a
WAAAGH! with the whole army advancing. What still limits it there is the
ground: Swordsmen on Mountains, Goblins without Engineering, and the policy
does not make an attack that only kills the attacker.

### 8.2 Why the Human AI stopped researching (`gb`)

The Human seat of `gb` owned five technologies in round 12 and seven in
round 25 and trained nothing above a Guard. Three causes, in order of
weight:

1. **Its order.** After the Marksman and the Guard the order went on to the
   Catapult, two technologies away (Forestry in round 15, Sawmilling in
   round 21), and the Catapult was never trained: both technologies bought
   nothing the seat used. The Swordsman, one technology from Drill, was
   fifth. It is now third (`ARMY_RESEARCH_ROLES_V7.ORIGINAL`: Marksman,
   Guard, Swordsman, Catapult, Knight, Captain). From the recorded round-15
   state (`tests/fixtures/ruleset-v7-human-research-stall.json`) the seat
   now buys Engineering.
2. **The war clock** allows one technology in three rounds for a seat whose
   income is small against the price, and its income stayed at 9 to 12
   Coins because a city does not grow while a hostile unit is within four
   tiles of its center. A clock of two rounds was tried and withdrawn: an
   Undead seat then bought no growth building in the pinned opening of
   tuning 7. The flat income is open (section 12).
3. In its last turns an enemy Troll stood on its only center. That is the
   game being lost, not a fault.

In the second diagnostic match below the Human seat owns Engineering in
round 15 and trains Swordsmen from round 16.

### 8.3 Two diagnostic matches

Each is one match between Normal AIs on a 14 x 14 dry-land map, run once on
the corrected source and read for what the Goblin seat does, not for who
wins.

- **Humans first, Goblins second, seed 11** (the map of `gc`). Over in
  round 17: the Human seat held two cities to the Goblins' five in round 10
  and never more than five units. The Goblin seat researches Marksmanship
  in round 5, Scouting 6, **Drill in round 11** (its fifth technology) with
  the first Orc Brute the same turn, Forestry 12, Sawmilling 13,
  Administration 14, Raiding 16. Three Brutes by round 15, one or two of
  them beside a shooter at each round's end. Three Rocket Carts in rounds
  15 and 16. Bomb Chuckers: a throw in every round from 11 to 14 in which
  one stood within three tiles of an enemy (5 throws by 5 such Chuckers);
  none in rounds 9 and 10 (three such Chuckers, newly trained). It attacks
  with numbers (five attacks in round 13, two kills). The match ended
  before Chivalry: no Scrap Buggy.
- **Goblins first, Humans second, seed 9** (the map of `gb`), 30 rounds
  played; the Human seat is down to one city and no unit. **Drill in round
  10**, two Orc Brutes the same turn, then two to five on the board (five
  of 21 units in round 13, four of 31 in round 29); at the end of a round
  up to four of them stand beside a Bomb Chucker, a Rocket Cart, or a
  Warboss, and up to two on a center. Rocket Carts from round 13, **six by
  round 20**, firing with Gang Up +1 from round 16: 17 on a full-HP unit
  with one helper, and 17 with WAAAGH! and no helper. **Bomb Chuckers throw
  in 17 of the 20 rounds** in which one stood within three tiles of an
  enemy at the start of the turn (23 throws by 38 such Chuckers). WAAAGH!
  in rounds 18 to 20, 23, 24, 26, and 27. Chivalry in round 21; five Scrap
  Buggies trained; in round 25 two new Buggies kill two units (9 with Gang
  Up, 6), a third hit deals 11, and **one crashes after its attack** (three
  hit, one killed); in rounds 28 and 29 three more Buggy kills (5, 14, 10)
  and no second crash. One Wolf Rider Kaboom (three hit, none killed).
  **The Human seat** owns 4 technologies in rounds 8 to 11, 5 in round 12,
  **6 in round 15 (Engineering)**, 7 in round 18, 8 in round 23, 9 in
  round 26, and trains Swordsmen from round 16. In `gb` it owned 6 in
  round 15 (Forestry) and 7 in round 25 and never had a Swordsman.

What they show for this bead: the Goblin AI has Brutes from round 10 or 11,
throws its bombs, buys Carts steadily, attacks with its numbers, and has
crashed a Buggy in a real match; the Human AI reaches the Swordsman. What
they do not show: balance, and the Goblin AI against a hand player.

## 9. The lab

`npm run play:text -- lab --session S LAB_GOBLIN_MID` starts the one lab in
which **the hand player is the Goblins**, against the Human Normal AI
(`src/engine/v7/missions/lab-goblin.ts`, a hidden mission like the other
labs).

- **Both sides:** five cities with the same levels (a level-4 capital, two
  level-3 cities, two level-2 cities at the front, four tiles from the
  enemy's), 15 Coins a turn, ten technologies. Two neutral villages lie
  between the lines.
- **You:** every Goblin unit is trainable (Marksmanship, Scouting, Raiding,
  Sawmilling, Chivalry, Drill, Administration and what they need). 20 units
  worth 63 Coins: 6 Goblins, 4 Bomb Chuckers, 3 Wolf Riders, 3 Orc Brutes,
  a Warboss, 2 Rocket Carts, a Scrap Buggy. 35 Coins in hand on the first
  turn, four free unit slots (the capital is full), every center free to
  train on. The next technologies cost 16 to 18 Coins.
- **The Human AI:** 17 units worth 77 Coins: 3 Swordsmen, 3 Marksmen, 2
  Catapults, 2 Knights, 2 Guards, 5 Fighters; a walled capital and one
  walled level-3 city; Forestry, so its units have Forest cover.

It is for judging the roster in about ten rounds: what you buy each turn
with 15 Coins and four or five trainings, whether the dear units are worth
their slots, and whether anything is a must.

## 10. Text

- Unit cards and recruit notes: **No Gang Up** ("Its bombs get no Gang
  Up.") on the Bomb Chucker in place of the Gang Up line; **Blast-proof**
  ("Blasts and bomb splash don't hurt it.") on the Orc Brute; **Crash**
  ("Can Kaboom after attacking.") on the Scrap Buggy. Help gains the lines
  "Orc Brutes" and "Crash", and the Gang Up line says a bomb gets none.
- The text harness prints the same three notes on unit, train, hire, and
  technology lines, lists the lab, and offers `kaboom` for a Buggy that
  has attacked.
- The correction: the Rocket Cart's card and recruit note say "+1 Attack
  with an ally next to the target (max +1)", Help's Gang Up line says a
  Rocket Cart gets at most +1 and a bomb none, and Plunder reads "+2 Coins
  for each enemy unit your units or blasts kill". In the text harness the
  lab says 35 Coins on the first turn (it said 20), a hire prints `HIRED`
  with the Market's city (it printed `TRAINED`), a Kaboom's `options` line
  lists the units hit and no others (it printed every unit on the board),
  and the `tech` line of Administration says what a Market pays.
- The level-2 reward of a Goblin city reads "Scouts: Reveal the area and a
  free Wolf Rider".
- No art was made. Blast-proof and Crash have no icon of their own; the
  unit card shows them as text lines like the other Goblin rules. An art
  bead could add two ability icons (a shield over a blast; a buggy in a
  burst) in the Goblin command-icon style.

## 11. Tests

`tests/unit/ruleset-v7-goblin-pass.test.ts`: the identity; the three
mechanics on three roles and no other, and the roster's numbers unchanged;
a bomb without Gang Up beside a Rocket Cart (+1), a Goblin, and a Buggy
(+2), with the damage numbers of section 2.1 (5, 6, 4 and 8, 10, 7 with
WAAAGH!); the resolution equal to the preview; Blast-proof against a
Kaboom, a death blast, an own and an enemy bomb's splash, and not against a
bomb thrown at the Brute or when embarked; Crash after an attack and in the
middle of a Ram, for no other unit, and the one predicate; Scouts for a
Goblin city; the AI's order and shares, a Rocket Cart bought with 7 Coins,
a crash taken and a crash declined, a Kaboom beside an own Brute; the lab's
composition and offers; the card text.

The correction's tests, in the same file: the rocket table of section 1.2
by ground for a Guard and a Swordsman; Plunder's 2 Coins in the capability,
the event, and the Coins; the assault facts of the recorded `gc` position
(commit) and two that must not commit; the recorded position itself (at
least five attacks, two of them bombs); the recorded `gb` position (the
Human seat researches Engineering); a Bomb Chucker's Move to a throw that
is worth its splash, and not when the splash kills the Goblin; a doomed
Buggy's crash on one enemy, and no crash that kills an own Goblin; a Buggy
that rams on; a Goblin that steps beside its Rocket Cart's target (9
becomes 13); a Brute's Move beside its Bomb Chuckers; the Buggy's score on
a threatened center (400 lower for a Goblin seat, unchanged for a Human
one). `tests/scripts/play-text-v7.test.ts` holds the harness text (35
Coins, `HIRED`, the Kaboom line, the Market sentence).

Changed fixtures and pins are listed in the bead's report: the identity
pins of every bump, three tests that used an Orc Brute as a blast or splash
victim (now a Warboss), the showcase's bomb preview (no Gang Up, splash 3),
the two bounded runs of `LAB_BREAKTHROUGH_GOBLIN` (the capital falls in
round 6 against the holding script, 7 before, and in round 7 against the
retreating one, 5 before), the pinned headless matches, and the mission
pins for the new lab. The correction moved the Plunder pins (1 to 2 Coins
in eleven test files), the research-order pins of tunings 6 and 8, one
pinned headless match with a Human seat, and the seed of the Lich match of
revision 14 (2 to 6).

## 12. What is still open

- **The correction has not been played by hand.** The three games were
  played on the first version.
- **The Goblin AI beat the Human AI in both diagnostic matches**, as it did
  before the correction, in 17 rounds on one map. AI against AI is not the
  measure here, but a hand player meets the Human AI's side of it: it
  expands slowly (two cities against five in round 10 on seed 11).
- **The Human AI's income at war is flat** (section 8.2): a city does not
  grow with a hostile unit within four tiles of its center, so a seat under
  pressure stays on 9 to 12 Coins.
- **The Rocket Cart is still the Goblin AI's killer** (section 8.3: from
  round 16, six Carts by round 20). With +1 it needs the Warboss for a
  Swordsman; whether six Carts are too many is for hand play.
- **Liches are rare in Undead matches against the Human AI**: of seeds 0 to
  6 of the revision-14 pin one match trains a Lich that plagues. Not caused
  here, and not a Goblin matter.
- **The four open ideas of section 1.2.**
- **The Wolf Rider** has no rule of its own (fork 6).
- **The other six factions** keep the plain level-2 Survey until their
  passes.
