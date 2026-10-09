# Ruleset 7: the Goblin faction pass

**Status:** implemented on `pulp-wars-poc-7r50` (bead `pulp_wars-w49.12`),
then played by hand in three games and corrected
([section 1.2](#12-the-correction-after-hand-play)): a rocket's Gang Up is
+1 at most, Plunder pays 2 Coins, and the Goblin and Human Normal AI were
changed. Section 12 lists what is open. The rules themselves are stated
in [Ruleset 7: current rules](RULESET_7_CURRENT.md); this document is the
reasoning and the record, in the shape of
[the Human pass](RULESET_7_TUNING_HUMAN.md).

**Superseded in part by [the ninth unit](RULESET_7_NINTH_UNIT.md) (`pulp-wars-poc-7r55`, `pulp_wars-w49.17`).** The Goblins have a ninth land
unit, the **Ogre** (the heavy line role, at Metallurgy; Heavyweight: it
counts as two helpers for Gang Up), so the roster, the research order
(the Ogre after the Warboss), and every statement that the Swordsman is
the Humans' alone are out of date. The Human Swordsman this document
fights is the Champion (6 Coins, at Metallurgy). `LAB_GOBLIN_MID` is at
revision 2: your seat owns Engineering and Metallurgy too. The record
below is unchanged. **The Goblins were played by hand at `7r55`** (bead
`pulp_wars-w49.19`): no rule changed, one correction to the Normal AI, and
the findings are [section 13](#13-the-hand-pass-at-7r55).

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

**Superseded in part by [Goblin explosions and Berserk](#15-goblin-explosions-and-berserk-pulp_wars-w4935) (`pulp_wars-w49.35`).** Every death blast is 3 harder (Bomb Chucker 5, Rocket Cart 7, Scrap Buggy 7), the Goblin's Kaboom is 6, and the Orc Warboss's WAAAGH! (+1 Attack) is gone: its command is **Berserk** (+1 Move and no stop in enemy zones of control for the unmoved units within 2). Where this record gives the old blasts or WAAAGH!, it records the rules it was written under.

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

**Superseded in part at `pulp-wars-poc-7r56`** ([the Industry reshuffle](RULESET_7_INDUSTRY_RESHUFFLE.md), `pulp_wars-w49.21`): The Orc Brute is unlocked by Fortification (with Field Defense), one technology behind the root, which is shown as Crafting and unlocks the Workshop; Engineering no longer does. The games recorded here were played with the Orc Brute at the root. Nothing else here changed, and no number did. **Step two** (bead `pulp_wars-w49.23`) played the Goblins by hand at `7r56`: no rule changed, the Normal AI of a Goblin seat changed in five places (the research order among them: the Ogre third), and the findings are [section 14](#14-step-two).

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

## 13. The hand pass at `7r55`

The first hand play of the Goblins on `pulp-wars-poc-7r55`
([the ninth unit](RULESET_7_NINTH_UNIT.md) and
[the economy rejig](RULESET_7_ECONOMY_REJIG.md), both built without
playing), bead `pulp_wars-w49.19`. **No rule and no number changed, and
the identity stays `7r55`.** One correction to the Normal AI
([section 13.7](#137-the-normal-ai-one-correction)). The bar was the
user's: "the faction is not crazy op or crazy weak and that all the tech
branches are useful and that units are differentiated from other factions
by more than stats".

### 13.1 The games

All in text mode against the Normal AI, on Dry Land.

| Game  | Played as | Against                  | Map         | Route                                                                                       | Result                                                                                             |
| ----- | --------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ga`  | Goblin    | Human                    | 14, seed 3  | the mob: Leadership 8, Forestry 11, Garrison 14, Land Grants 17, Engineering 19, Armoury 21 | won, stopped in round 24: 8 cities against 3, income 35, 23 units against 8                        |
| `gb`  | Goblin    | Undead                   | 14, seed 5  | bombs and rockets: Bomb Chuckers 4, Forestry 7, Rocket Carts 17                             | lost in round 21: 4 units against 25, 4 cities against 8                                           |
| `gc`  | Goblin    | Human, Dinosaur, Martian | 16, seed 8  | the Ogre first: Garrison 1, Engineering 3, Armoury 8, all with one city                     | stopped in round 17 without hope: 2 cities against the Dinosaur seat's 9                           |
| `gd`  | Goblin    | Dinosaur                 | 14, seed 6  | Mobility: Scouting 3, Raiding 7, Roads 10, Plunder 13, Scrap Buggies 16                     | stopped in round 19, level to slightly behind: 5 cities and 12 units against 7 and 21              |
| `gl`  | Goblin    | Human                    | the lab     | `LAB_GOBLIN_MID`, four rounds, four Ogres bought                                            | two Knights and two shooters killed 12 of 29 units in one turn; both Knights killed the turn after |
| `hg`  | Human     | Goblin                   | 14, seed 11 | Hunting 3, Marksmanship 6                                                                   | abandoned in round 8: 1 city and 3 units against 4 cities and 11 units                             |
| `hg2` | Human     | Goblin                   | 14, seed 11 | Hunting 3, Marksmanship 7, Garrison 11                                                      | lost by round 12: 2 cities and 2 units against 6 cities and 14 units                               |

The numbers after a technology are the rounds it was bought in. `gd` was
added because the three planned Goblin games never bought the Mobility
branch. The two Human games have opening errors of the player in them
(section 13.2).

### 13.2 What the Human pass handed over

**1. Is the Goblin opening against Humans an always-win?** No rule was
changed. The evidence is mixed and the two Human games of this pass are
weak evidence.

- On seed 11 a hand-played Human has now lost four times in four games
  (two in the Human pass, two here), and the Human AI loses on it too. In
  `hg2` the Goblin seat had 5 units in round 4, three cities in round 6,
  and six cities and 14 units (5 Goblins, 4 Wolf Riders, 5 Bomb Chuckers)
  in round 11, on an income of 3 to 11. It researched two technologies and
  reached level 2 in round 1, which its Coins alone do not pay for.
- The fights themselves were even. In `hg2` each side killed one unit a
  turn: the Goblins lost two Wolf Riders and a Goblin (7 Coins), the Human
  a Raider and three Fighters (10). Every Gang Up was +1, and no Kaboom and
  no bomb was used before round 12. The game was lost on numbers: a Goblin
  capital of level 2 holds four units and a village three, a Human one
  three and two, and the Goblin unit that fills a slot costs 1 Coin.
- The player's errors: a lone Raider sent at two Wolf Riders (twice); 6
  Coins of fruit in a village that fell the next turn; a village three
  tiles from the capital, shown by the level-2 Scouts in round 1, seen in
  round 7; Marksmanship in round 6 or 7.
- On seed 4 the hand-played Human of the Human pass took the Goblin
  capital in round 16. The Goblins played by hand lost to the Undead AI
  (`gb`) and got nowhere among three AIs (`gc`).
- **What a Human has against it**, each seen in these games: a Marksman
  kills a Goblin with every shot and takes nothing back (two Marksmen
  killed nine Goblins, a Wolf Rider, and an Orc Brute in `ga` before an
  Ogre killed one of them in round 22); a Fighter and a Marksman kill a
  Wolf Rider a turn (6 + 4); a Knight kills every Goblin unit but the Orc
  Brute and the Ogre in one attack and rides on (nine kills by two Knights
  in one turn of `gl`); a Champion deals an Ogre 9 and two Catapults
  killed one with 14 HP (9 + 5); ground where three units do not fit
  around a target (the mob of `ga` stood in single file between Mountains
  from round 13 to 19).
- **The strong turns exist and need three units and a Warboss.** A 1-Coin
  Goblin with two helpers and WAAAGH! deals a full Fighter in Forest cover
  12 (a kill), a Guard on a Mountain 10, and a Champion in a Forest 11. An
  Orc Brute with an Ogre and a Goblin beside the target and WAAAGH! deals
  a Guard 15. A Wolf Rider with Charge and two helpers deals 16 (a Big
  Raptor, Defense 1, from full). The attacker then stands in front of the
  enemy army: the three Wolf Riders that killed in `gd` were dead within
  two turns, and the Ogre of `ga` the turn after its kill.
- **If the opening is to be slowed**, these games do not point at Kaboom
  or at Gang Up +2. What took the map in `hg2` was bodies: the 1-Coin
  capturer, the fourth unit slot, and the free Wolf Rider of every level-2
  city. That is a question for the user (section 13.8), not a defect.

**2. A Bomb Chucker blew itself up on one Fighter with 3 HP.** Confirmed
in the recorded game (twice, rounds 11 and 14) and corrected: section
13.7.

**3. Where should the Ogre sit in the Goblin research order?** Where it
is: after the Warboss, before the Scrap Buggy. Bought first (`gc`: three
technologies for 16 Coins with one city, the first Ogre in round 10) it
came into an income of 4 with three Goblins around it and took one
village. Bought eighth (`ga`, round 21, 27 Coins with seven cities) it was
worth it at once. An AI seat that reaches Armoury in round 22 is in step
with that.

**4. Is Milling a dead node?** Not shown, and nothing was changed. The
numbers of the Human pass hold for every mill: beside one building a
Workshop (tier 2, 4 Coins) gives 2 and a Windmill, a Sawmill (5 Coins),
or a Forge (6 Coins) gives 1; beside two buildings of different kinds the
Workshop gave 3 (`ga`). A mill is ahead from three buildings of its kind
around one tile, and a city may have both. The Sawmill and the Forge come
with a unit and the Forge with Arms Industry; the Windmill comes with 6 HP
a turn for the units beside it and nothing else. Farming was bought in
none of the four Goblin games (at most one Fertile Ground tile in a
city's land in `ga`, none in `gb` and `gc`; `gd` had Farm land and its
route did not go there), so Milling was never a choice. It is a weak node
on a map without Farm clusters, as Pathfinding is on a map without Forest;
whether that is acceptable is a question for the user (section 13.8).

**5. Arms Industry.** Built in `ga`, round 21: a Forge beside two Mines
(6 Coins, +2 population), and that city trained an Ogre for 4 Coins, an
Orc Brute for 2, and a Warboss for 4 (a Goblin stays 1). Three Ogres came
from it in three rounds. The limit was the one training a turn, not the
price: 52, 63, and 92 Coins were unspent in rounds 21 to 24.

### 13.3 The Ogre

- **Wanted, and not a must.** It is the second Goblin unit a Knight's
  chain stops on (a Knight deals it 12 of 16, an Orc Brute 9 of 15, and
  kills every other Goblin unit), and the only one of the two that moves
  and attacks.
- **One for each group, not an army of them.** Its worth is the +2 it
  gives the others alone: with one Ogre and one Goblin beside the target
  an Orc Brute hit at Attack 5. Its own attack is 2.5: alone it dealt a
  Marksman on a village 8. A second Ogre beside the same target adds
  nothing (the maximum is +2).
- **A Rocket Cart with one Ogre is not more reliable than with one
  Goblin.** A rocket's Gang Up is +1 at most, so Heavyweight gives it
  nothing. With one helper a rocket killed a Knight with 11 HP, a Zombie
  with 13, and a Skeleton with 8 through Bones. What the Ogre adds there
  is that it is still alive beside the target the next turn.
- **Not Blast-proof: a cost, not a trap.** The Kaboom preview names it
  (`u114(S0 Ogre) YOURS -5`). One Kaboom was not made because an Ogre
  stood in it; none hit one.
- **It dies in the open.** Advanced after a kill, the Ogre of `ga` took 9
  from a Champion, 3 from a Guard, and 4 from a Marksman in one turn; two
  Catapults killed one in `gl` (9 + 5).
- 5 Coins and Armoury are right for that. Nothing was changed.

### 13.4 The units

No unit was the best in every game: Goblins and a Warboss in `ga`, Bomb
Chuckers in `gb` (14 kills, 11 by bombs or their splash, in a lost game),
Wolf Riders with Charge in `gd`.

| Unit         | What it did                                                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goblin       | Not obsolete: 12 of 23 units in round 24 of `ga`, and one of them killed a Guard on a city in round 23. It takes villages, fills the third tile around a target, and dies to every attack. Seventeen were bought in `ga` and eight came as Militia |
| Wolf Rider   | Took three villages by round 7 of `gd`. With Raiding it is the Goblin unit that kills on open ground. Level-2 Scouts gave one or two free ones a game                                                                                              |
| Bomb Chucker | The answer to Zombies, which cannot attack after moving: it steps back and throws. Three throws at one Zombie dealt it 16 and three units beside it 9 each. Skeletons (Bones, then 6 to it in melee) and its own blasts are the answer to it       |
| Orc Brute    | The only unit that stood on a contested centre for more than a turn (`ga`). It earns its place as the anchor. Blast-proof was never the reason: the player made three Kabooms in four games and none beside a Brute                                |
| Orc Warboss  | In every attack turn of `ga`. WAAAGH! is what turned 10 into 12                                                                                                                                                                                    |
| Rocket Cart  | Two in `gb`, too late: one killed a Zombie and died to a Vampire the same round, and its death blast of 4 killed a Goblin and a Bomb Chucker beside it, whose own blast killed a second Goblin. One in the lab killed a Knight                     |
| Scrap Buggy  | One in `gd`: it rammed two Cavemen in one turn (10, then 8) and then crashed for 4 + 4 on two Ankylosauruses once the Wolf Rider beside it had stepped away. A Dinosaur grows from a kill, and the Crash denied it one. Crash earns its place      |
| Ogre         | Section 13.3                                                                                                                                                                                                                                       |

**The Goblin weakness is real and it is the faction's own.** In `gb` a
bitten Bomb Chucker with 2 HP died beside two more wounded ones and the
three death blasts chained; in the next Undead turn two Wails and a
Vampire's kill of a Rocket Cart took ten units. Every unit a Zombie kills
rises as a Zombie; a Kaboom denies it. The player also splashed his own
units on six throws, by throwing before moving the units beside the
target away (about 25 HP).

### 13.5 The branches

| Branch     | Bought                                                                | Verdict                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settlement | Gathering (`ga`, `gd`), Leadership and Land Grants (`ga`)             | strong. Leadership gave the Warboss and four Markets beside Lumber Camps (24 Coins, +8 a turn). Land Grants was bought for the unit slot in round 17, when four cities were full. Farming and Milling were never bought                                                                                                      |
| Wilds      | Hunting, Forestry (`ga`, `gb`), Bomb Chuckers and Rocket Carts (`gb`) | useful. Hunting took three villages to level 2 in one turn of `ga` (six hunts for 12 Coins; two Stockpiles and a free Wolf Rider back). Forestry without Leadership or Sawmilling gave `gb` only Lumber Camps and an income of 5 to 7 until round 13, which lost that game as much as anything. Pathfinding was never bought |
| Mobility   | Scouting, Raiding, Roads, Plunder, Scrap Buggies (`gd`)               | useful, and thin alone. Raiding makes the Wolf Rider. Roads was the surprise: eight Road tiles (16 Coins) took the capital to level 4 and a village to level 2. Plunder paid 8 Coins in six rounds for 21. Nothing in the branch hurts an Ankylosaurus                                                                       |
| Industry   | Garrison, Engineering, Armoury (`ga`, `gc`)                           | useful as a second branch, as for the Humans. Engineering without a unit paid in both games (six Mines and a Workshop in `ga`; two Mines and a Workshop were the whole economy of `gc`). Fortification and Explosives were never bought                                                                                      |

**Plunder** is the weakest node that was bought. At the rate of these
games it would have paid about 2 Coins a turn in `ga` (13 kills in rounds
12 to 24), 2 to 3 in `gb`, and 1 to 2 in `gd`, where five Road-linked
cities pay a Human seat 5 a turn for the same technology. Its hire needs a
Market, which is Leadership, in another branch. It was left alone: Coins
for kills is the economy the user wants, and the number was doubled one
pass ago.

### 13.6 The economy as a Goblin player meets it

- **Income.** `ga`: 6 in round 9, 10 in round 12, 17 in round 15, 25 in
  round 17, 33 in round 22, with seven cities. `gd`: 9 to 11 in rounds 11
  to 19 with five. `gb`: 5 to 7 until round 13.
- **Research price.** In `ga` a tier-2 technology cost 9 with two cities
  and 19 with seven; Land Grants and Armoury cost 27 each. In four games
  the player researched before a capture eight times to pay the lower
  price, and three times left a unit standing on a village for one to
  three turns to do it. It was worth 1 to 4 Coins each time.
- **Unit slots** bound in rounds 15 to 17 of `ga` (four cities full) and
  at once in the lab. **One training a city a turn** bound from round 20:
  Coins piled up to 92.
- **Level-2 villages.** Two hunts or harvests (4 Coins) and the Stockpile
  (4 Coins back) or a free Wolf Rider: a village costs nothing to take to
  level 2 where it has two Game or Fruit tiles.
- **Monuments.** Explorer in rounds 6 to 17; Land Baron in round 24 of
  `ga`. No other.
- **Level 6.** No city passed level 4 in any game. No Troll was seen.

### 13.7 The Normal AI: one correction

A Goblin seat's unit that can step back and kill with its ordinary attack
no longer blows itself up for that kill. In the recorded game (`a2` of the
Human pass, rounds 11 and 14) a Bomb Chucker stood beside a Fighter with 3
HP, which it cannot throw at from the next tile, and used Kaboom (4
damage) for the kill. The score allowed it because the enemy would have
killed the Bomb Chucker anyway and a doomed unit counts a third of its
value. One step back and a bomb kill the Fighter too, and the Bomb Chucker
lives.

The rule (`goblinStepBackKillV7` in `src/ai/v7.ts`): a Kaboom of an army
seat whose whole gain is one enemy unit killed, with no other enemy in
the blast, is not made when the unit has no attack on that enemy from
where it stands, has not moved, may attack after a Move, and would kill
it from a tile it can move to (a bomb only where its splash on own units
would be accepted). In practice that is a Bomb Chucker beside its victim.
A unit with an attack on the victim was already handled: its kill ranks
above a Kaboom's. A unit that has moved, a blast that hits two enemies,
and a Crash are as before. The rule reads the public view and the public
previews only.

No other policy number or order was changed. The research order keeps the
Ogre after the Warboss (section 13.2, item 3).

**Two diagnostic matches** between Normal AIs were run once each on the
corrected source (14 x 14, 30 rounds), to see that nothing breaks. They
are not a balance measurement. Both ran without an error or a stall and
with no Kaboom at all.

- **Goblins first, Humans second, seed 9.** Round 31: the Goblin seat
  holds ten cities and 19 units, the Human seat one city and two units.
  The Goblin seat researched Bomb Chuckers in round 4, Scouting 8,
  Forestry 10, Garrison 12, Rocket Carts 15, Leadership 17, Engineering
  19, **Armoury in round 21**, Raiding 23, and Scrap Buggies 25, and
  trained one Ogre.
- **Goblins first, Undead second, seed 5** (the map of `gb`, which the
  hand player lost as the Goblins). The Goblin seat eliminated the Undead
  seat in round 29 with 13 cities and 38 units (9 Rocket Carts, 9 Orc
  Brutes, 7 Bomb Chuckers, 6 Goblins, 3 Wolf Riders, 2 Warbosses, 2
  Ogres); **Armoury in round 27**.

With the two of the pass before (section 8.3), the Goblin seat has won
every diagnostic match that was run. That is a fact about the Normal AI
of the two seats and it is one more reason for question 1 of section
13.8.

### 13.8 Open, for the user

1. **The Goblin opening on a contested map.** Left as it is. If the user
   wants it slower, the levers these games point at are the free Wolf
   Rider of every level-2 Goblin city (given at `7r50`; a second and
   later city could give the plain Survey) or the fourth unit slot of a
   level-2 capital, not Kaboom and not Gang Up.
2. **Plunder** pays a third to a half of what land trade pays a Human
   seat. 3 Coins a kill, or Plunder without the Roads prerequisite, are
   the two changes a tester would try.
3. **Milling.** If a node that is only a building is not wanted, the
   smallest change that reads the same for every faction is a Windmill
   that counts itself (1, plus 1 for each Farm beside it, still 8 at
   most), which makes it equal to a Workshop beside one Farm and ahead
   from two. The Sawmill and the Forge would stay as they are, because
   their technologies carry a unit.
4. **Farming, Pathfinding, Fortification, and Explosives** were bought by
   no Goblin player in four games. Fortification and Explosives were not
   bought by the Human pass either.

### 13.9 For the passes that follow

- **The Undead AI is a strong opponent for a Goblin player.** It had
  seven cities in round 14 of `gb` and trained a unit in each. The pass
  should look from the Undead side at Infect against cheap units (a
  Goblin and two Bomb Chuckers rose as Zombies; a risen Zombie had 8 HP),
  at how often a Banshee's Wail finishes several wounded units at once,
  and at whether a Zombie that cannot attack after moving is helpless
  against any unit that steps back and shoots (seven Zombies died to
  bombs; Zombies hit a Bomb Chucker twice, both times one the player had
  left beside them).
- The first Lich of the Undead AI was seen in round 20 of `gb`, and no
  Wight by round 21.
- **The Dinosaur AI** took nine cities and eliminated the Martian AI in
  round 16 of `gc`, and kept sending single Cavemen onto a village centre
  held by one unit (four times in `gd`); each was killed there within two
  turns.
- **The text harness:** a `REVEALED` line lists tiles and does not say
  that a village or a chest is among them, and the player of this pass
  missed a village three tiles from his capital for six rounds, twice.
  Militia fills the city's unit slots without a word, and a training
  planned for the same turn is then refused.

### 13.10 Tests

`tests/unit/ruleset-v7-goblin-pass.test.ts`, "the Goblin hand pass at
7r55": a Bomb Chucker beside a Fighter with 3 HP, two Marksmen in reach of
it, scores its Kaboom below zero, moves to a tile two away, and then
throws for the kill; the same Bomb Chucker after a Move still uses Kaboom.

## 14. Step two

The second pass over the Goblins on `pulp-wars-poc-7r56`
([the Industry reshuffle](RULESET_7_INDUSTRY_RESHUFFLE.md): the Orc Brute
at Fortification, the Workshop at the root), bead `pulp_wars-w49.23`. Step
two is "iterate on each faction including playing games manually to rejig
the balance better and improve the AI for each faction". Three games were
played by hand as the Humans against the Goblin AI, two as the Goblins,
and the lab. **No rule and no number changed, and the identity stays
`7r56`.** The Normal AI of a Goblin seat changed in five places
([section 14.4](#144-the-goblin-normal-ai)). The bar was the user's: "the
faction is not crazy op or crazy weak and that all the tech branches are
useful and that units are differentiated from other factions by more than
stats".

### 14.1 The games

All in text mode against the Normal AI, on Dry Land.

| Game | Played as | Against                 | Map         | Route                                                                      | Result                                                                            |
| ---- | --------- | ----------------------- | ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `a`  | Human     | Goblin (before)         | 14, seed 11 | by the book: Gathering 1, Hunting 3, Marksmanship 8, Scouting 13           | stopped in round 16, losing: 3 cities and 7 units against 6 and 14                |
| `b`  | Goblin    | Human                   | 14, seed 2  | the mob, then bombs: Scouting 3, Hunting 3, Bomb Chuckers 8, Leadership 14 | stopped in round 16, ahead: 5 cities and 12 units against 5 and 9                 |
| `c`  | Goblin    | Human, Undead, Dinosaur | 16, seed 5  | Mobility: Hunting 1, Scouting 3, Raiding 9                                 | stopped in round 11, behind: 4 cities and 8 units; the Undead seat 5 and 10       |
| `gl` | Goblin    | Human                   | the lab     | `LAB_GOBLIN_MID`, two rounds, Ogres and Orc Brutes bought and dug in       | the Human AI massed and did not dive                                              |
| `a2` | Human     | Goblin (after)          | 14, seed 11 | the counter: Scouting 3, Raiding 7, Hunting 11, Chivalry 16                | stopped in round 17, level: 4 cities, 10 units, income 9 against 4 cities and 13  |
| `e`  | Human     | Goblin (after)          | 14, seed 9  | by the book: Hunting 1, Marksmanship 4, Forestry 11                        | stopped in round 12, ahead: 7 cities, 15 units, income 13 against 4 cities and 16 |

The numbers after a technology are the rounds it was bought in. "Before"
and "after" are the Goblin AI before and after section 14.4.

### 14.2 The opening against Humans

**The verdict: a wanted blowout with a counter, and not too strong on a
map that is fair. No rule was changed.** Three things were found.

**1. Seed 11 is not a fair map.** A hand-played Human had lost on it five
times in five games, and lost a sixth (`a`). Both chests of that map lie
within two tiles of the Goblin capital, and none near the Human one. The
Goblin seat opened the first in round 1 (5 Coins, which paid for its
second technology) and the second in round 2 (a free Wolf Rider): 8 Coins
of value on top of an income of 11 in its first three rounds. It had four
units in round 2 and two Wolf Riders beside the contested village in
round 4. Of seeds 1 to 20 on this board, seed 11 is the only one with two
chests beside one capital; seeds 4, 6, 7, 9, 10, 13, 14, and 19 have none
within three tiles of either
(`probe-chests.mts` in the scratch folder of the pass).

**2. On a fair map the Human is ahead.** On seed 9 (`e`) the Human, played
by the book, owned five cities in round 7 and seven in round 11, with 15
units and an income of 13 against four cities and 16 units. Three
villages went to level 2 in one turn for nothing (two hunts each: 4 Coins,
and a Stockpile of 4 or a free Raider back). The Goblin AI lost a
diagnostic match on seed 4 to the Human AI, eliminated in round 21 before
the change and in round 25 after it (section 14.4).

**3. On seed 11 itself the Human holds with the counter.** Game `a` was
lost by the book: the Wolf Rider rush of rounds 4 to 6 was beaten level
(two Wolf Riders and four Goblins for one Fighter), and then four Bomb
Chuckers arrived (3 Coins each). A bomb deals a Fighter 5 or 6 from two
tiles and every unit beside it 3, and came from tiles the Human had not
explored: eight of ten losses, three of them in one turn. Marksmen behind
Fighters is the wrong answer to bombs: the units stand together. Game `a2`
was played on the same seed against the improved AI with the answer:

- **Raiders with Raiding.** A charging Raider kills a Goblin, a Wolf
  Rider, or a Bomb Chucker in one attack and escapes. Four Bomb Chuckers,
  eight Goblins, and two Wolf Riders died for a Fighter and five Raiders.
  The Raider reaches three tiles, as far as a Bomb Chucker that moves and
  throws: whoever steps into the other's reach is struck first.
- **A slot and a free Raider from every city.** Two fruits or two hunts
  take a village to level 2 (4 Coins, a third unit slot, a free Raider).
  With three cities the Human of `a` held 6 or 7 units with Coins left
  over while the Goblin seat held 9 to 12; in `a2` every city was at level
  2 by round 12.
- **Units apart.** Nothing beside a garrison that a bomb can reach.
- In round 17 the game was level (4 cities each, 10 units and an income of
  9 against 13 units), where `a` stood at 3 cities and 8 units against 6
  and 14 in round 15. A Knight (Chivalry, bought in round 16) kills every
  Goblin unit but the Orc Brute and the Ogre and rides on.

**What the earlier evidence called bodies** is three things, and none is
out of line. The free Wolf Rider of a level-2 city is the Humans' free
Raider. The 1-Coin Goblin dies to every attack, so a Fighter (2 Coins)
kills one a turn without loss; what it buys is a turn on a contested
center (`b`: a Goblin a turn on one center for five turns, each of which
took the enemy's attack of that turn). The extra unit slot of every Goblin city (Warrens) is the
real difference in rounds 6 to 10, and the Human answer is the level-2
village above.

**Left for the user:** a chest beside a capital decides an opening
whoever owns it (5 Coins is a turn and a half of income in round 1, a free
unit two turns). Chests could keep three tiles from a capital, or seed 11
could stop being the benchmark map.

### 14.3 The questions

**The Ogre at Armoury.** Wanted, and it stays. One Ogre beside a target
gives every other Goblin unit +2 (a Goblin deals a Champion 9 and lives
where it deals 3 and dies alone), and it is one of the two Goblin units a
Knight does not kill (12 of 16). It needs three technologies (21 Coins
with one city, 39 with four), so by hand it is a round-15 unit. The
AI now researches it third (section 14.4).

**The Orc Brute at Fortification.** Not bought by hand in two games: the
Human AI fielded no Knight before round 16 and the Brute cannot attack
after it moves. It is worth its two technologies (12 Coins with one city)
against Knights and Raiders and for nothing else: a Knight deals it 11 of
15 and its Overrun ends; a charging Raider deals it 7 and takes 5; it is
Blast-proof beside its own Bomb Chuckers. A Goblin player who meets
neither skips the branch, and that is the designer's placement working as
intended: a counter technology. The AI now buys it when it sees them.

**Plunder.** Not bought: with four cities Roads cost 13 Coins and Plunder
18 on an income of 7 (`c`). The numbers of this pass agree with the last:
a Goblin seat kills about one unit a turn in a war (8 kills in rounds 6 to
16 of `b`; the AI 10 in 15 rounds of `a`), so Plunder pays 2 Coins a turn
where land trade pays a Human seat with five linked cities 5. **3 Coins a
kill does not mend it** (3 a turn, for 31 Coins of research). The price
and the place are the problem, not the rate. Two changes would put it in
reach, both the user's call because they change a tree: Plunder at Raiding
(tier 2, with Pillage and Charge), or Plunder as it is with 3 Coins a kill
and Raiding as its prerequisite in place of Roads.

**One best unit?** No. The Bomb Chucker is the best buy of rounds 8 to 15
against Humans (3 Coins, 5 or 6 from two tiles and 3 beside), and it dies
to one charge, hits nothing beside itself (it cannot throw at a
neighbour), and hurts its own side (the player of `b` had to move a Goblin away before a
throw; the AI killed one of its own Goblins with splash in `a`). Against the Undead it is the answer to Zombies and
the Skeleton is the answer to it (section 13). Goblins take the villages
and hold centers; Wolf Riders make the first kills; the Warboss turned two
bombs into 53 damage in one turn of `b` (10 and 7 to a Marksman, 9 to each
of four units beside it).

**The branches no Goblin player buys.**

| Technology  | Seen                                                                                                               | Worth its price as a Goblin?                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Farming     | not bought. Hunts and fruit made every level 2; a Farm is 5 Coins for 2                                            | On Fertile Ground, as for every faction. Nothing Goblin about it, and nothing wrong                                                                                                   |
| Milling     | not looked at (left alone by ruling)                                                                               |                                                                                                                                                                                       |
| Pathfinding | not bought. In `c` Forest ended five of a Wolf Rider's Moves in ten rounds, and a charge needs a Move of two tiles | Only to a player who already owns Bomb Chuckers. A Mobility player, whose Wolf Riders need it, is three technologies away. Forest march for the Wolf Rider at Raiding would mend that |
| Explosives  | not bought. A Kaboom already destroys a Field Defense, and a bomb's splash ignores Walls and cover                 | Least of any faction: Breach repeats what blasts do. Its Goblin use is Blast Mountain (5 damage around a Mountain for 3 Coins)                                                        |

### 14.4 The Goblin Normal AI

Read in `a`, in two diagnostic matches against the Human AI (seeds 4 and
11, 14 x 14, 25 rounds), and on recorded positions of both. Details and
function names:
[Normal AI, step two of the Goblin pass](../architecture/NORMAL_AI.md#step-two-of-the-goblin-pass-pulp_wars-w4923).

**What it does well.** It spends every Coin every turn (0 or 1 left in
thirteen of fifteen rounds of `a`). It masses its Bomb Chuckers and throws
from two tiles, the wounded target first. It grows its villages with
hunts.

**What was wrong, and is corrected.**

- _Its combined kills did not count Gang Up._ A kill by several units was
  planned from what each deals alone. Two Goblins beside a full Fighter
  deal 3 each alone and 6 each together, so no kill was planned, one of
  them attacked, and the other walked up afterwards. **Now** the plan
  counts the Gang Up the units give each other, the helpers move beside
  the target first, and the first blow waits for them. On the recorded
  position of seed 4, round 8 (a Fighter on the seat's own center), two
  Goblins kill it for 6 and 6 where one attacked another unit for 3 and
  the city fell. The kill of a unit that holds a city the seat has not the
  numbers for is planned too when two or more units make it.
- _Single Goblins walked at the enemy._ A unit that one enemy can reach
  counted as supported. **Now** a Goblin, a Wolf Rider, or an Ogre does
  not step beside an enemy unit where it would die unless another unit of
  its side stands beside that enemy, has it in range, or can still come
  into range of it this turn (a Bomb Chucker behind counts: the Goblin in
  front stands on its firing tile), and does not walk alone into a reach
  that kills it.
- _No Orc Brute against Knights._ The Orc Brute was third in the research
  order and came in round 18 or later. **Now** its technology is the next
  one as soon as two Raiders are in sight, and is bought before the units
  with a Knight in sight.
- _The Ogre in round 21 to 27, and no growth technology._ **Now** the Ogre
  is third in the order (Bomb Chucker, Wolf Rider, Ogre, Orc Brute, Rocket
  Cart, Warboss, Scrap Buggy), which puts Engineering and its Mines in
  round 12 to 14.
- _Goblins only on the defensive._ A threatened city trained its garrison
  every turn, as a Human seat's did. **Now** the rule of step two of the
  Human pass holds for a Goblin seat too: a Bomb Chucker while the army is
  short of them, the body with an enemy within two tiles of the center.

**Before and after.** Not a balance measurement: the two diagnostic
matches (14 x 14, 25 rounds) and the hand-played game on seed 11, read for
what the Goblin seat does.

| Where                           | Before                                                                                             | After                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Humans against Goblins, seed 4  | eliminated in round 21; 21 attacks, 4 with Gang Up, 4 alone at a loss; two Bomb Chuckers trained   | eliminated in round 25; 24 attacks, 9 with Gang Up, 3 alone at a loss                                                                             |
| Humans against Goblins, seed 11 | seven cities to two or three in round 25 (the run of the Human pass)                               | the Human seat eliminated in round 24; 34 attacks, 13 with Gang Up, 1 alone at a loss; Armoury in round 16, an Ogre in 17, three Orc Brutes in 19 |
| The hand-played Human, seed 11  | `a`: 21 attacks, 3 with Gang Up, 3 alone at a loss; Bomb Chuckers round 5, Scouting 9, the root 15 | `a2`: 15 attacks, 8 with Gang Up, 1 alone at a loss; the root in round 10 and Fortification in 15, before Scouting, with Raiders in sight         |

No error and no stall in any of them.

**Seen and left.**

- A unit already beside an enemy and lost anyway still attacks alone
  (3 for a Goblin). A Kaboom would deal 5; the rule that a Kaboom needs a
  kill or two enemies was not touched.
- The seat cannot see a unit on a tile it has not explored, and a Goblin
  has a Sight of one tile: several "lone" attacks in `e` were a step onto
  a tile from which the enemy first showed.
- On seed 4 the seat is boxed in by Mountains with three cities and at
  most ten units (its unit limit) and is eliminated either way. With
  Raiders in sight it now buys the root and Fortification there, and does
  not come to Engineering, which is what that land wants.
- In `a2` and `e` the seat stepped single Goblins forward inside the reach
  of Raiders and Marksmen from tiles already inside it.

### 14.5 Open, for the user

1. **Chests beside a capital** (section 14.2): keep them three tiles
   away, or retire seed 11 as the benchmark.
2. **Plunder** (section 14.3): at Raiding, or behind Raiding at 3 Coins.
   The rate alone does not mend it.
3. **Pathfinding for a Mobility player**: Forest march for the Wolf Rider
   (and the Human Raider and Knight, question 3 of the Human pass) at
   Raiding.
4. **Explosives** gives a Goblin seat nothing its blasts do not already
   do.
5. **Human Field Defense at the root** (the Human pass's fix (a)) is not
   needed for the Goblin matchup by the evidence of this pass: the answer
   to bombs is distance, and a Field Defense is destroyed by a Kaboom.
6. **Both free Scouts Raiders of `a2` died on the turn they arrived**: a
   reward unit appears on the enemy's side of its city and cannot move.
   That is true for every faction's free unit.

### 14.6 For the passes that follow

- **The Undead against Goblins.** A Goblin unit that attacks a Zombie hand
  to hand is Bitten and rises as a Zombie when it dies, and a Goblin a
  Zombie kills rises too (`c`: a Wolf Rider and a Goblin in two rounds).
  The new mob rule sends two or three Goblin units at one target: against
  a Zombie that is two or three Bitten units. The Undead pass should look
  at whether the Goblin AI feeds an Undead seat that way, and from the
  Undead side whether a Skeleton line dies to mobs (a Goblin with two
  helpers kills a full Skeleton in one attack: 10).
- **The Undead AI** took a village from a Wolf Rider with one Skeleton and
  built a Field Defense under a Zombie and walked the Zombie off it in the
  same turn (`c`, round 8). The Human AI did the same twice in `b`.
- **Seeds.** Check the chests before choosing a benchmark map.

### 14.7 Tests

`tests/unit/ruleset-v7-goblin-step2.test.ts`: the identity is unchanged;
a helper counts as the engine counts it (an Ogre 2, a bomb none); two
Goblins kill a full Fighter for 6 and 6, the second moving beside it
before the first strikes; an Ogre comes beside a Champion, the Goblin
strikes at +2 for 9, and the Ogre kills; the recorded position of seed 4,
round 8 (`tests/fixtures/ruleset-v7-goblin-mob-kill.json`) is won back
with two attacks at +1; one Goblin does not walk up to a Fighter, two do, a
Wolf Rider that lives through it does, a Goblin that kills does, and a
Human seat is as it was; the research order; one Raider in sight changes
nothing, two make the Orc Brute's technology the next one, a Knight makes
it the next purchase, and a seat that owns it or does not own Bomb
Chuckers yet keeps its order; the garrison rule of a Goblin seat yields to
a Bomb Chucker.

**Pins that moved**, each with a note at the test, because a Goblin seat
of the Normal AI plays differently (no map and no PRNG digest moved):

- the Pangea and Archipelago pins of the curiosities parity matches
  (`tests/unit/ruleset-v7-curiosities.test.ts`: the command and event
  digests; 13 rounds each still; Dry Land, Continents, and Lakes are
  unchanged);
- the Goblin breakthrough lab against the defender that gives ground: the
  capital falls in round 6 (7) (`tests/unit/ruleset-v7-tuning-7.test.ts`);
- the research order of a Goblin seat where a test states it
  (`ruleset-v7-goblin-pass`, `ruleset-v7-martian-pass`,
  `ruleset-v7-undead-pass`, `ruleset-v7-tuning-6` with the order of the
  technologies, and `ruleset-v7-industry-reshuffle`: a Goblin seat with
  the root goes on to Engineering and Armoury before Fortification);
- `ruleset-v7-human-step2`: a Goblin seat is no longer among the factions
  whose garrison rule never yields;
- the source audits: four more land-form tests in `src/ai/v7.ts` and one
  in `src/ai/v7-goblin.ts` (`ruleset-v7-dinosaur-form-audit`), and the
  six new readers classified (`tests/fixtures/v7-unit-reader-classes.ts`,
  `tests/fixtures/v7-kind-reader-classes.ts`).

## 15. Goblin explosions and Berserk (`pulp_wars-w49.35`)

The user, 2026-10-09: the explosions can be the Goblins' crowd control,
but they need more damage, so the blasts on death get +3; and the Orc
Warboss gets a buff that speeds units up instead of WAAAGH!: a Goblin that
can travel an extra tile is far more dangerous and better against crowds,
and a berserked Goblin ignores the tiles the enemy controls (it may move
past an enemy unit), gets into position, and explodes. A later addition
the same day: the Goblin's Kaboom +1. The rules are
[sections 18.4, 18.5, and 18.10 of the current rules](RULESET_7_CURRENT.md#1810-berserk-ram-and-troll-regeneration).
This was an engine bead under the mechanics-first policy (no AI tuning, no
balance games); the identity became `pulp-wars-poc-7r61` when it was
published after Dwarf crowd control (`7r60`).

### 15.1 The changes

| Rule                        | Before            | Now                                                                   |
| --------------------------- | ----------------- | --------------------------------------------------------------------- |
| Bomb Chucker death blast    | 2                 | 5                                                                     |
| Rocket Cart death blast     | 4                 | 7                                                                     |
| Scrap Buggy death blast     | 4                 | 7                                                                     |
| Goblin Kaboom               | 5                 | 6                                                                     |
| Other Kabooms               | 4 / 4 / 5 / 5     | unchanged (Wolf Rider, Bomb Chucker, Rocket Cart, Scrap Buggy)        |
| Orc Warboss command (RALLY) | WAAAGH! +1 Attack | Berserk: +1 Move, ignores enemy zones of control, until the turn ends |
| Administration unlock       | `WAAAGH_SUPPORT`  | `BERSERK_SUPPORT`                                                     |

Blasts still hit every unit in the 3 × 3 square, own units included, and
the Orc Brute stays Blast-proof.

### 15.2 Decisions made in the engine

- **One command, a new effect.** Berserk is the Warboss's `RALLY` (the
  command WAAAGH! was), with the event `UNITS_RALLIED`; the role mechanic
  `rallyEffect` (`INSPIRE` or `BERSERK`) replaced
  `rallyReachesSupportAndSiege`, which only WAAAGH! used. The UI keeps one
  button, relabelled by its bead (`pulp_wars-w49.36`).
- **Who is a target.** Every other own land-form unit within Chebyshev 2
  that has not moved this turn and is not Berserk yet, of any role (the
  rule names no `ATTACK` requirement); never an embarked unit, a boat, or
  an Egg. A unit that attacked or Recovered without moving still counts
  (it may have an Escape Move or nothing left; the rule reads only
  "has not moved"). With no target the command is not offered and is
  rejected with `HEAL_TARGET_NOT_FOUND`, like WAAAGH!.
- **Where it is stored.** A per-turn state and view list,
  `berserkThisTurn`, like `huntedThisTurn`: it survives a save mid-turn,
  is emptied at the owner's End Turn, and drops a unit that leaves the
  board or the active seat.
- **+1 Move** applies to the ordinary Move and not to an Escape Move, like
  Sugar Rush, and only in land form.
- **Zones of control** are waived exactly as Prowl waives them: entering
  hostile ZOC does not end the Move. Occupied tiles, terrain stops, and
  unexplored cells are unchanged.

### 15.3 The Normal AI

Legal and untuned. It scores Berserk where it scored WAAAGH! (the units in
reach that can reach an enemy this turn), so it calls it before its
attackers move; its own reach estimate does not add the extra Move or the
waived zones of control yet. With death blasts of 5 the Human AI no
longer takes a melee kill of a 1-HP Bomb Chucker whose blast would chip
the attacker and its neighbours (the test now shows a clean ranged kill
taken). Both are follow-ups for an AI pass.

### 15.4 Tests

`tests/unit/ruleset-v7-goblin-berserk.test.ts`: the three death blasts
and the Kabooms, Berserk targets (radius, unmoved, own land units, not
embarked or boats, a second Warboss), +1 Move, zones of control ignored
between two enemies (reducer, public validation, and the offered Moves),
occupied tiles still blocked, expiry at End Turn, the state round trip and
its validation, WAAAGH! gone, and a Normal AI turn that stays legal. The
explosion, Goblin pass, presentation, and lab tests that state blast
numbers were updated, and so were the Dinosaur (Armoured, Eggs, Grow),
Martian (Shields, Tractor Beam, chains), and revision-20 growth tests that
do; where a victim would now die a few fixtures changed role or HP to keep
each scenario's outcome (the UI showcase's own Goblin beside the Kaboom is
a Wolf Rider, the attack-chain fixture's attacker a Champion, the second
Kaboom on a shielded Grunt a Wolf Rider's). The Berserk lookups read a
missing `berserkThisTurn` as empty, as the Candy `sugarRush` lookup does,
so a public view captured before the list existed still plans.

### 15.5 The interface (`pulp_wars-w49.36`)

The Warboss's button reads **Berserk** (the tin megaphone icon is kept),
with the rule as its tooltip and a chip with the number of units it
reaches. Hovering or focusing it rings each of those units with "+1 Move"
and outlines the 5 × 5 radius ([BOARD_TARGETING.md section
2.1](../ui/BOARD_TARGETING.md#21-area-support-marked-not-picked-bead-pulp_wars-621)).
A Berserk unit wears an orange double-chevron glyph in its status column, a
"Berserk" status chip (with its glossary line), and a cursor cue; its Moves
that only Berserk gives it, the extra tile and the tiles past an enemy zone
of control, are hatched orange with the same chevrons and announced as
"Berserk reach" (the public movement query with and without the unit in
`berserkThisTurn`). The log and toast read "Your Orc Warboss: Berserk for
N units (+1 Move, ignore zones of control)". The death-blast and Kaboom
numbers come from the registration everywhere (previews, board labels, the
Kaboom! tooltip, which now also names the death blast of a unit that has
one, and the `GOBLIN_HELP_RULES_V7` sentences). Tests:
`tests/unit/ruleset7-goblin-presentation.test.ts` and
`tests/integration/ruleset7-goblin-dom.test.ts` on the hand-built
`goblinBerserkFixtureV7` and `goblinBerserkActiveFixtureV7`
(`tests/fixtures/v7-goblin-ui.ts`); `npm run review:ruleset7-goblin-ui`
captures the Berserk preview and reach.
