# Ruleset 7: the Dinosaur faction pass

**Status:** implemented on `pulp-wars-poc-7r53` (bead `pulp_wars-w49.15`),
with the correction of
[section 13](#13-the-correction-after-three-hand-played-games) after three
hand-played games (the Dinosaurs in the lab, the Dinosaurs from turn 1,
and the Humans against the Dinosaur AI). Sections 1 to 12 are the pass as
it was first written; where the correction changed a rule, the passage
says so and section 13 has the reasons. The numbers of
[section 2.0](#20-numbers-from-the-script) are the script's output on the
final rules. The rules themselves are stated in
[Ruleset 7: current rules](RULESET_7_CURRENT.md); this document is the
reasoning and the record, in the shape of
[the Martian pass](RULESET_7_TUNING_MARTIAN.md),
[the Undead pass](RULESET_7_TUNING_UNDEAD.md),
[the Goblin pass](RULESET_7_TUNING_GOBLIN.md), and
[the Human pass](RULESET_7_TUNING_HUMAN.md).

**Superseded in part by [the ninth unit](RULESET_7_NINTH_UNIT.md) (`pulp-wars-poc-7r55`, `pulp_wars-w49.17`).** The **Triceratops is the heavy
line role** (`SWORDSMAN`, a `LINE` unit, at **Metallurgy**), not the
`CATAPULT` role at Sawmilling; its numbers and Charge! are unchanged. The
siege role is a new unit, the **Stegosaurus** (Sawmilling; range 2 to 3;
its target is Cracked), so "no unit that attacks from three tiles"
([section 5](#5-what-makes-each-unit-different) and elsewhere) is no longer true. The
research order is Ankylosaurus, Triceratops (by Drill, Engineering,
Metallurgy), Raptor, Spitter, Stegosaurus, Shaman, T-Rex, and the army
shares are 40% line, 25% defenders, 15% ranged, 10% siege, 10%
breakthrough (30% Triceratops and 20% Cavemen here). The Human Swordsman
this document fights is the Champion (6 Coins, at Metallurgy).
`LAB_DINOSAUR_MID` is at revision 2: your seat owns Engineering and
Metallurgy, and its two Triceratops are the heavy role. The record below
is unchanged.

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

**What the user asked for** (2026-10-06, repeated for this faction): carry
the Human tech tree improvements over to the next faction and make sure it
works. Fine balance is not the goal. The faction must not be far too strong
or far too weak, every technology branch must be useful, and its units must
differ from other factions' by more than numbers. Not reopened: the forced
advance after a kill stays, Bitten stays permanent, the Human Knight and
its Overrun are untouched, Stockpile stays 4, and ranged units never
advance. No new way to spend Coins was added.

**The method** is the Human pass's: scenario reasoning from the engine's
exact public combat previews on constructed positions and small scenarios
played by the reducer (`scripts/dinosaur-tuning-analysis-v7.ts` and
`scripts/dinosaur-tuning-scenarios-v7.ts`, which play no match), and two
diagnostic matches read for what the Dinosaur AI researches, lays, and
does. No AI-against-AI result was counted as evidence of balance.

## 1. The changes

| #   | Change             | Before (`7r52`)                                                                                                                | Now (`7r53`)                                                                                                                                                                                                       | Other factions                                                                      |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | Triceratops run-up | +1 Attack per tile moved this turn, up to 2 tiles, from the day it hatches                                                     | **one tile counts; the second needs Wallbreaker** (the Dinosaur Explosives): +1 Attack after any Move, +2 after a Move of two tiles with Wallbreaker                                                               | a charge at a Swordsman or a Guard leaves it alive until the Dinosaurs buy the node |
| 2   | Wallbreaker        | "dinosaurs ignore City Walls", which Breach (in every Explosives since `7r46`) already did for every attack from the next tile | **the second tile of the run-up** is its own unlock; Blast Mountain, Breach, and the City Walls rule are as they were                                                                                              | none                                                                                |
| 3   | Caveman            | a Fighter with 10 HP that builds no Field Defense: the one Dinosaur unit with no rule of its own                               | **Pack Hunt**: +1 Attack on its own attack against a unit that stands next to one of its owner's hatched dinosaurs (not a Caveman, a Shaman, or an Egg; never on its retaliation)                                  | none                                                                                |
| 4   | Level 2 reward     | Survey (Humans, Goblins, Undead, Martians: Scouts, the survey and a free fast unit) or Stockpile                               | **Scouts for the Dinosaurs too**: the survey and a free Raptor, hatched, in a unit slot of the city                                                                                                                | the other three keep the plain Survey until their passes                            |
| 5   | Hire (Commerce)    | a Market hired "any land role the player could train", which left a Dinosaur Market the Caveman and the Shaman                 | **a Dinosaur Market hires a dinosaur, hatched**: every unit the player could lay, at one and a half times its price, on the Market tile with its actions spent                                                     | none                                                                                |
| 6   | Dinosaur Normal AI | its own older policy in every match (Triceratops or T-Rex once it owns two cities), and it switched the army rules off for all | **plays the army rules** in a match of Humans, Goblins, Undead, Martians, and Dinosaurs: Ankylosaurus, an economy technology, Triceratops, Raptor, Spitter, Shaman, Planning, T-Rex; [section 8](#8-the-normal-ai) | a Human, Goblin, Undead, or Martian seat plays the army rules against Dinosaurs too |
| 7   | Lab                | none for the Dinosaurs as the player                                                                                           | `LAB_DINOSAUR_MID`: the hand player is the Dinosaurs in an even middle game ([section 9](#9-the-lab))                                                                                                              | —                                                                                   |

**The correction** ([section 13](#13-the-correction-after-three-hand-played-games))
added, on the same identity: **Nesting takes no turn off the hatch**; a
**Shaman's Tend Wounded heals a dinosaur 4**; **Pack Hunt also applies
against a unit one of the player's dinosaurs attacked this turn**; the
Dinosaur Sawmilling is displayed as **Timber** and its building as the
Chopping Block everywhere; rules for the Dinosaur seat of the Normal AI;
and text.

No number of the Dinosaur roster changed: every price, HP, Attack,
Defense, Move, range, hatch time, slot count, and growth step is as it
was. The run-up gate is one capability (`runUpTiles`: `RUN_UP_BASE_TILES_V7`
1, `RUN_UP_MAXIMUM_TILES_V7` 2 with the `WALLBREAKER` unlock); Pack Hunt
is one role mechanic (`packHuntBonus2`, 2 half-points on the Dinosaur
`FIGHTER`, 0 on every other role of every faction); Scouts is one entry
(`SURVEY_RAIDERS_V7.DINOSAUR`). No command, event, state, or view shape
changed in the pass as first written; the correction added one state and
view list, `huntedThisTurn`. A match without a Dinosaur seat plays as at
`7r52`.

### 1.1 Decisions that are forks, for the user to overrule

1. **The second run-up tile is behind Wallbreaker; nothing was made
   weaker for good.** The alternative was a lower Attack or a dearer
   Triceratops. The gate follows the Martian pass (the Force Field behind
   Force Fields): an ability too strong too early goes behind a later
   technology. The other way to read the numbers is that the Triceratops
   with Wallbreaker is still too strong ([section 2.1](#21-what-the-numbers-say),
   point 2), and then the answer is the same gate plus a number.
2. **Pack Hunt is a new rule on the base unit.** The alternative was to
   leave the Caveman a Fighter with less HP. It was the one Dinosaur unit
   that differed from another faction's by numbers only, which is the
   user's bar. The rule was chosen so that it needs no button, no state,
   and one sentence, and so that it rewards the army the faction is meant
   to field (Cavemen around a few beasts) and gives nothing to a Caveman
   rush (twelve Cavemen alone get no bonus).
3. **A hired dinosaur arrives hatched.** The alternatives were that a
   Dinosaur Market hires an Egg (then Commerce buys nothing a city cannot)
   or keeps hiring Cavemen and Shamans only (then the node is a third of a
   node for this faction). Hatched for one and a half times the price is
   the point of hiring: the unit now, not in two to four turns.
4. **The Scouts unit is a Raptor, hatched.** An Egg would be the faction's
   way, but the reward of every other faction is a unit that can walk to a
   village next turn.
5. **The T-Rex stays at 14 Coins and four turns in the Egg.** It kills a
   Fighter, a Raider, a Marksman, or a Knight in one bite only near full
   HP, and its Egg is the dearest thing a Knight can eat. It is a
   situational finisher, not the unit the army is built on, and that
   seemed right for the last node of a branch. Cheaper or faster is the
   other choice.
6. **A Knight still eats a nest.** Three Eggs (27 Coins) and the Caveman
   behind them die to one Knight in one turn, with Nesting too. Overrun
   was not to be touched; the Dinosaur answer is where the Eggs are laid
   and an Ankylosaurus beside them, and the AI already refuses a nest tile
   the visible enemies can reach. An Egg that ends a ride (as a Zombie
   does not, but a wall does) is the alternative rule.
7. **Fieldcraft stays the weak node** it is in every tree but the
   Martians' (a Spitter's Sight 2, Forest freedom, Replant).
8. **The Chopping Block was looked at and not changed**
   ([section 4.3](#43-the-chopping-block)).
9. **The AI counts the Triceratops as three tenths of its army.** It is
   registered as the faction's siege role; in the field it is the line.
   Three tenths at two slots each is most of a small city's room.

## 2. Scenario analysis

### 2.0 Numbers from the script

Output of `npx tsx scripts/dinosaur-tuning-analysis-v7.ts` on
`pulp-wars-poc-7r53`, unedited except for heading levels.

#### Matchup matrix

Each cell: HP damage dealt / damage taken back in the first attack (both units at full HP) and × the number of attacks by fresh full-HP attackers of that kind that kill the defender; then `d` the damage with War Drums (+1 Attack; the Triceratops and the Shaman are never Inspired). `K` is a kill of the full-HP defender. A Spitter attacks from two tiles, the others from the next tile. A dinosaur deals the same at stage 0 and Big (growth adds 4 HP a stage and heals; only Alpha adds +1 Attack), so its rows are stage 0 and Alpha. (Pounce) is a Raptor that moved two tiles, with Raiding. (run-up 1) is a Triceratops that moved, without Wallbreaker (+1 Attack); (run-up 2, Wallbreaker) one that moved two tiles and whose owner has Wallbreaker (+2 Attack; the same seat's Breach is moot for it, a Charge! ignores fortification anyway). (Pack Hunt) is a Caveman whose target stands next to one of its owner's dinosaurs (+1 Attack). A Spitter's Acid and a Triceratops's Charge! ignore fortification; the Acid ignores cover too.

##### Dinosaur attackers on Human units

**Open ground**

| Attacker (cost, HP, Atk/Def)                            | Fighter 2c 12hp | Guard 3c 17hp  | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------------------------- | --------------- | -------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Caveman (2c, 10, 2/2)                                   | 5/5 ×3; d 8     | 4/8 ×4; d 7    | 6/2 ×2; d 10    | 6/2 ×2; d 10     | 6/2 ×2; d 10K   | 4/6 ×3; d 7       | 7/0 ×2; d 10K    | 6/2 ×2; d 10    | 3/10 ×10; d 6      |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 8/4 ×2; d 12K   | 7/7 ×3; d 10   | 10/1 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 7/5 ×2; d 11      | 10K/0 ×1; d 10K  | 10/1 ×2; d 13K  | 6/10 ×6; d 9       |
| Raptor (4c, 12, 2.5/1)                                  | 6/4 ×2; d 10    | 5/7 ×3; d 8    | 8/1 ×2; d 12K   | 8/1 ×2; d 12K    | 8/1 ×2; d 10K   | 6/6 ×3; d 9       | 9/0 ×2; d 10K    | 8/1 ×2; d 12    | 4/11 ×7; d 7       |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 10/3 ×2; d 12K  | 8/6 ×2; d 12   | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 9/5 ×2; d 13      | 10K/0 ×1; d 10K  | 12/1 ×2; d 13K  | 7/10 ×5; d 11      |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 12K/0 ×1; d 12K | 12/5 ×2; d 16  | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 13/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 11/8 ×4; d 14      |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×3; d 8     | 6/0 ×3; d 10   | 6/0 ×2; d 10    | 6/2 ×2; d 10     | 6/0 ×2; d 10K   | 4/0 ×3; d 7       | 7/0 ×2; d 10K    | 6/0 ×2; d 10    | 3/0 ×10; d 6       |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2; d 12K   | 10/0 ×2; d 14  | 10/0 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 7/0 ×2; d 11      | 10K/0 ×1; d 10K  | 10/0 ×2; d 13K  | 6/0 ×6; d 9        |
| Ankylosaurus (5c, 20, 2/3)                              | 5/4 ×3; d 8     | 4/7 ×4; d 7    | 6/1 ×2; d 10    | 6/1 ×2; d 10     | 6/1 ×2; d 10K   | 4/5 ×3; d 7       | 7/0 ×2; d 10K    | 6/1 ×2; d 10    | 3/11 ×10; d 6      |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 8/3 ×2; d 12K   | 7/6 ×3; d 10   | 10/1 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 7/4 ×2; d 11      | 10K/0 ×1; d 10K  | 10/1 ×2; d 13K  | 6/9 ×6; d 9        |
| Shaman (5c, 10, 1/1)                                    | 2/6 ×6          | 1/10 ×11       | 2/2 ×5          | 2/2 ×5           | 2/2 ×4          | 1/8 ×9            | 3/0 ×3           | 2/2 ×5          | 1/10 ×29           |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2          | 7/7 ×3         | 10/1 ×2         | 10/1 ×2          | 10K/0 ×1        | 7/5 ×2            | 10K/0 ×1         | 10/1 ×2         | 6/10 ×6            |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 12K/0 ×1        | 10/6 ×2        | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 11/4 ×2           | 10K/0 ×1         | 13K/0 ×1        | 9/9 ×4             |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 12K/0 ×1        | 14/5 ×2        | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 13/8 ×3            |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 12K/0 ×1        | 14/5 ×2        | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 13/8 ×3            |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 12K/0 ×1        | 17K/0 ×1       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 16/7 ×3            |
| T-Rex (14c, 28, 4/2)                                    | 12K/0 ×1; d 12K | 10/6 ×2; d 14  | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 11/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 9/9 ×4; d 13       |
| Alpha T-Rex (14c, 36, 5/2)                              | 12K/0 ×1; d 12K | 14/5 ×2; d 17K | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 15K/0 ×1; d 15K   | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 13/8 ×3; d 16      |
| Brontosaurus (—c, 45, 3.5/4)                            | 10/3 ×2; d 12K  | 8/6 ×2; d 12   | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 9/5 ×2; d 13      | 10K/0 ×1; d 10K  | 12/1 ×2; d 13K  | 7/10 ×5; d 11      |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 12K/0 ×1; d 12K | 12/5 ×2; d 16  | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 13/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 11/8 ×4; d 14      |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)                            | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------------------------- | --------------- | ------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Caveman (2c, 10, 2/2)                                   | 4/5 ×3; d 7     | 3/8 ×5; d 5   | 5/2 ×3; d 9     | 5/2 ×3; d 9      | 5/2 ×2; d 9     | 3/6 ×4; d 6       | 7/0 ×2; d 10K    | 5/2 ×3; d 9     | 2/10 ×12; d 5      |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 7/4 ×2; d 10    | 5/7 ×3; d 8   | 9/1 ×2; d 12K   | 9/1 ×2; d 12K    | 9/1 ×2; d 10K   | 6/5 ×3; d 9       | 10K/0 ×1; d 10K  | 9/1 ×2; d 13K   | 5/10 ×7; d 7       |
| Raptor (4c, 12, 2.5/1)                                  | 5/4 ×2; d 8     | 4/7 ×4; d 7   | 7/1 ×2; d 11    | 7/1 ×2; d 11     | 7/1 ×2; d 10K   | 5/6 ×3; d 8       | 9/0 ×2; d 10K    | 7/1 ×2; d 11    | 3/11 ×9; d 6       |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 8/3 ×2; d 12K   | 7/6 ×3; d 10  | 11/1 ×2; d 12K  | 11/1 ×2; d 12K   | 10K/0 ×1; d 10K | 8/5 ×2; d 11      | 10K/0 ×1; d 10K  | 11/1 ×2; d 13K  | 6/10 ×6; d 9       |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 12K/0 ×1; d 12K | 10/5 ×2; d 14 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 11/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 9/8 ×4; d 12       |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×3; d 8     | 6/0 ×3; d 10  | 6/0 ×2; d 10    | 6/2 ×2; d 10     | 6/0 ×2; d 10K   | 4/0 ×3; d 7       | 7/0 ×2; d 10K    | 6/0 ×2; d 10    | 3/0 ×10; d 6       |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2; d 12K   | 10/0 ×2; d 14 | 10/0 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 7/0 ×2; d 11      | 10K/0 ×1; d 10K  | 10/0 ×2; d 13K  | 6/0 ×6; d 9        |
| Ankylosaurus (5c, 20, 2/3)                              | 4/4 ×3; d 7     | 3/7 ×5; d 5   | 5/1 ×3; d 9     | 5/1 ×3; d 9      | 5/1 ×2; d 9     | 3/5 ×4; d 6       | 7/0 ×2; d 10K    | 5/1 ×3; d 9     | 2/11 ×12; d 5      |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 7/3 ×2; d 10    | 5/6 ×3; d 8   | 9/1 ×2; d 12K   | 9/1 ×2; d 12K    | 9/1 ×2; d 10K   | 6/4 ×3; d 9       | 10K/0 ×1; d 10K  | 9/1 ×2; d 13K   | 5/9 ×7; d 7        |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×8          | 1/10 ×13      | 2/2 ×5          | 2/2 ×5           | 2/2 ×5          | 1/8 ×11           | 3/0 ×4           | 2/2 ×6          | 1/10 ×∞            |
| Triceratops (8c, 20, 3/2)                               | 7/4 ×2          | 5/7 ×3        | 9/1 ×2          | 9/1 ×2           | 9/1 ×2          | 6/5 ×3            | 10K/0 ×1         | 9/1 ×2          | 5/10 ×7            |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10/3 ×2         | 8/6 ×2        | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 9/4 ×2            | 10K/0 ×1         | 13K/0 ×1        | 7/9 ×5             |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 12K/0 ×1        | 12/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 13/4 ×2           | 10K/0 ×1         | 13K/0 ×1        | 10/8 ×4            |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 12K/0 ×1        | 12/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 13/4 ×2           | 10K/0 ×1         | 13K/0 ×1        | 10/8 ×4            |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 12K/0 ×1        | 15/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 14/7 ×3            |
| T-Rex (14c, 28, 4/2)                                    | 10/3 ×2; d 12K  | 8/6 ×2; d 12  | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 9/4 ×2; d 13      | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 7/9 ×5; d 10       |
| Alpha T-Rex (14c, 36, 5/2)                              | 12K/0 ×1; d 12K | 12/5 ×2; d 15 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 13/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 10/8 ×4; d 14      |
| Brontosaurus (—c, 45, 3.5/4)                            | 8/3 ×2; d 12K   | 7/6 ×3; d 10  | 11/1 ×2; d 12K  | 11/1 ×2; d 12K   | 10K/0 ×1; d 10K | 8/5 ×2; d 11      | 10K/0 ×1; d 10K  | 11/1 ×2; d 13K  | 6/10 ×6; d 9       |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 12K/0 ×1; d 12K | 10/5 ×2; d 14 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 11/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 9/8 ×4; d 12       |

**Field Defense (+2 Defense), the attacker without Breach or Wallbreaker (a Dinosaur defender builds none: its cells equal open ground)**

| Attacker (cost, HP, Atk/Def)                            | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------------------------- | --------------- | ------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Caveman (2c, 10, 2/2)                                   | 3/5 ×3; d 6     | 3/8 ×5; d 5   | 4/2 ×3; d 7     | 4/2 ×3; d 7      | 4/2 ×3; d 7     | 3/6 ×4; d 5       | 4/0 ×3; d 7      | 4/2 ×3; d 7     | 2/10 ×12; d 5      |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6/4 ×2; d 9     | 5/7 ×3; d 8   | 7/1 ×2; d 10    | 7/1 ×2; d 10     | 7/1 ×2; d 10K   | 5/5 ×3; d 8       | 7/0 ×2; d 10K    | 7/1 ×2; d 10    | 5/10 ×7; d 7       |
| Raptor (4c, 12, 2.5/1)                                  | 4/4 ×3; d 7     | 4/7 ×4; d 6   | 5/1 ×2; d 8     | 5/1 ×2; d 8      | 5/1 ×2; d 8     | 4/6 ×3; d 7       | 6/0 ×2; d 9      | 5/1 ×3; d 8     | 3/11 ×9; d 6       |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 7/3 ×2; d 11    | 6/6 ×3; d 10  | 8/1 ×2; d 12K   | 8/1 ×2; d 12K    | 8/1 ×2; d 10K   | 7/5 ×2; d 10      | 9/0 ×2; d 10K    | 8/1 ×2; d 12    | 6/10 ×6; d 9       |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 11/3 ×2; d 12K  | 10/5 ×2; d 13 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 10/4 ×2; d 14     | 10K/0 ×1; d 10K  | 12/1 ×2; d 13K  | 9/8 ×4; d 12       |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×3; d 8     | 6/0 ×3; d 10  | 6/0 ×2; d 10    | 6/2 ×2; d 10     | 6/0 ×2; d 10K   | 4/0 ×3; d 7       | 7/0 ×2; d 10K    | 6/0 ×2; d 10    | 3/0 ×10; d 6       |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2; d 12K   | 10/0 ×2; d 14 | 10/0 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 7/0 ×2; d 11      | 10K/0 ×1; d 10K  | 10/0 ×2; d 13K  | 6/0 ×6; d 9        |
| Ankylosaurus (5c, 20, 2/3)                              | 3/4 ×3; d 6     | 3/7 ×5; d 5   | 4/1 ×3; d 7     | 4/1 ×3; d 7      | 4/1 ×3; d 7     | 3/5 ×4; d 5       | 4/0 ×3; d 7      | 4/1 ×3; d 7     | 2/11 ×12; d 5      |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6/3 ×2; d 9     | 5/6 ×3; d 8   | 7/1 ×2; d 10    | 7/1 ×2; d 10     | 7/1 ×2; d 10K   | 5/4 ×3; d 8       | 7/0 ×2; d 10K    | 7/1 ×2; d 10    | 5/9 ×7; d 7        |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×9          | 1/10 ×14      | 1/2 ×8          | 1/2 ×8           | 1/2 ×7          | 1/8 ×12           | 1/0 ×6           | 1/2 ×9          | 1/10 ×∞            |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2          | 7/7 ×3        | 10/1 ×2         | 10/1 ×2          | 10K/0 ×1        | 7/5 ×2            | 10K/0 ×1         | 10/1 ×2         | 6/10 ×6            |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 12K/0 ×1        | 10/6 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 11/4 ×2           | 10K/0 ×1         | 13K/0 ×1        | 9/9 ×4             |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 12K/0 ×1        | 14/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 13/8 ×3            |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 12K/0 ×1        | 14/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 13/8 ×3            |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 12K/0 ×1        | 17K/0 ×1      | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 16/7 ×3            |
| T-Rex (14c, 28, 4/2)                                    | 9/3 ×2; d 12K   | 8/6 ×2; d 11  | 10/1 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 8/4 ×2; d 12      | 10K/0 ×1; d 10K  | 10/1 ×2; d 13K  | 7/9 ×5; d 10       |
| Alpha T-Rex (14c, 36, 5/2)                              | 12K/0 ×1; d 12K | 11/5 ×2; d 15 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 12/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 10/8 ×4; d 14      |
| Brontosaurus (—c, 45, 3.5/4)                            | 7/3 ×2; d 11    | 6/6 ×3; d 10  | 8/1 ×2; d 12K   | 8/1 ×2; d 12K    | 8/1 ×2; d 10K   | 7/5 ×2; d 10      | 9/0 ×2; d 10K    | 8/1 ×2; d 12    | 6/10 ×6; d 9       |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 11/3 ×2; d 12K  | 10/5 ×2; d 13 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 10/4 ×2; d 14     | 10K/0 ×1; d 10K  | 12/1 ×2; d 13K  | 9/8 ×4; d 12       |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)                            | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------------------------- | --------------- | ------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Caveman (2c, 10, 2/2)                                   | 3/5 ×3; d 6     | 3/8 ×5; d 5   | 4/2 ×3; d 7     | 4/2 ×3; d 7      | 4/2 ×3; d 7     | 3/6 ×4; d 5       | 4/0 ×3; d 7      | 4/2 ×3; d 7     | 2/10 ×12; d 5      |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6/4 ×2; d 9     | 5/7 ×3; d 8   | 7/1 ×2; d 10    | 7/1 ×2; d 10     | 7/1 ×2; d 10K   | 5/5 ×3; d 8       | 7/0 ×2; d 10K    | 7/1 ×2; d 10    | 5/10 ×7; d 7       |
| Raptor (4c, 12, 2.5/1)                                  | 4/4 ×3; d 7     | 4/7 ×4; d 6   | 5/1 ×2; d 8     | 5/1 ×2; d 8      | 5/1 ×2; d 8     | 4/6 ×3; d 7       | 6/0 ×2; d 9      | 5/1 ×3; d 8     | 3/11 ×9; d 6       |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 7/3 ×2; d 11    | 6/6 ×3; d 10  | 8/1 ×2; d 12K   | 8/1 ×2; d 12K    | 8/1 ×2; d 10K   | 7/5 ×2; d 10      | 9/0 ×2; d 10K    | 8/1 ×2; d 12    | 6/10 ×6; d 9       |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 11/3 ×2; d 12K  | 10/5 ×2; d 13 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 10/4 ×2; d 14     | 10K/0 ×1; d 10K  | 12/1 ×2; d 13K  | 9/8 ×4; d 12       |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×3; d 8     | 6/0 ×3; d 10  | 6/0 ×2; d 10    | 6/2 ×2; d 10     | 6/0 ×2; d 10K   | 4/0 ×3; d 7       | 7/0 ×2; d 10K    | 6/0 ×2; d 10    | 3/0 ×10; d 6       |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2; d 12K   | 10/0 ×2; d 14 | 10/0 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 7/0 ×2; d 11      | 10K/0 ×1; d 10K  | 10/0 ×2; d 13K  | 6/0 ×6; d 9        |
| Ankylosaurus (5c, 20, 2/3)                              | 3/4 ×3; d 6     | 3/7 ×5; d 5   | 4/1 ×3; d 7     | 4/1 ×3; d 7      | 4/1 ×3; d 7     | 3/5 ×4; d 5       | 4/0 ×3; d 7      | 4/1 ×3; d 7     | 2/11 ×12; d 5      |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6/3 ×2; d 9     | 5/6 ×3; d 8   | 7/1 ×2; d 10    | 7/1 ×2; d 10     | 7/1 ×2; d 10K   | 5/4 ×3; d 8       | 7/0 ×2; d 10K    | 7/1 ×2; d 10    | 5/9 ×7; d 7        |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×9          | 1/10 ×14      | 1/2 ×8          | 1/2 ×8           | 1/2 ×7          | 1/8 ×12           | 1/0 ×6           | 1/2 ×9          | 1/10 ×∞            |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2          | 7/7 ×3        | 10/1 ×2         | 10/1 ×2          | 10K/0 ×1        | 7/5 ×2            | 10K/0 ×1         | 10/1 ×2         | 6/10 ×6            |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 12K/0 ×1        | 10/6 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 11/4 ×2           | 10K/0 ×1         | 13K/0 ×1        | 9/9 ×4             |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 12K/0 ×1        | 14/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 13/8 ×3            |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 12K/0 ×1        | 14/5 ×2       | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 13/8 ×3            |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 12K/0 ×1        | 17K/0 ×1      | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 15K/0 ×1          | 10K/0 ×1         | 13K/0 ×1        | 16/7 ×3            |
| T-Rex (14c, 28, 4/2)                                    | 9/3 ×2; d 12K   | 8/6 ×2; d 11  | 10/1 ×2; d 12K  | 10/1 ×2; d 12K   | 10K/0 ×1; d 10K | 8/4 ×2; d 12      | 10K/0 ×1; d 10K  | 10/1 ×2; d 13K  | 7/9 ×5; d 10       |
| Alpha T-Rex (14c, 36, 5/2)                              | 12K/0 ×1; d 12K | 11/5 ×2; d 15 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 12/4 ×2; d 15K    | 10K/0 ×1; d 10K  | 13K/0 ×1; d 13K | 10/8 ×4; d 14      |
| Brontosaurus (—c, 45, 3.5/4)                            | 7/3 ×2; d 11    | 6/6 ×3; d 10  | 8/1 ×2; d 12K   | 8/1 ×2; d 12K    | 8/1 ×2; d 10K   | 7/5 ×2; d 10      | 9/0 ×2; d 10K    | 8/1 ×2; d 12    | 6/10 ×6; d 9       |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 11/3 ×2; d 12K  | 10/5 ×2; d 13 | 12K/0 ×1; d 12K | 12K/0 ×1; d 12K  | 10K/0 ×1; d 10K | 10/4 ×2; d 14     | 10K/0 ×1; d 10K  | 12/1 ×2; d 13K  | 9/8 ×4; d 12       |

##### Dinosaur attackers on Goblin units

**Open ground**

| Attacker (cost, HP, Atk/Def)                            | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Caveman (2c, 10, 2/2)                                   | 6K/0 ×1; d 6K | 6/2 ×2; d 10K      | 6/0 ×2; d 8K        | 4/6 ×3; d 7       | 6/2 ×2; d 10        | 7/0 ×2; d 8K       | 6/2 ×2; d 10K       | 4/8 ×9; d 7   |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 7/5 ×2; d 11      | 10/1 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/7 ×5; d 10  |
| Raptor (4c, 12, 2.5/1)                                  | 6K/0 ×1; d 6K | 8/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 6/6 ×3; d 9       | 8/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 8/1 ×2; d 10K       | 5/7 ×7; d 8   |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 9/5 ×2; d 13      | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 8/6 ×4; d 12  |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 13/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 12/5 ×3; d 16 |
| Spitter (4c, 10, 2/1)                                   | 6K/0 ×1; d 6K | 6/0 ×2; d 10K      | 6/2 ×2; d 8K        | 4/0 ×3; d 7       | 6/0 ×2; d 10        | 7/0 ×2; d 8K       | 6/0 ×2; d 10K       | 4/0 ×9; d 7   |
| Alpha Spitter (4c, 18, 3/1)                             | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 7/0 ×2; d 11      | 10/0 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/0 ×5; d 10  |
| Ankylosaurus (5c, 20, 2/3)                              | 6K/0 ×1; d 6K | 6/1 ×2; d 10K      | 6/0 ×2; d 8K        | 4/5 ×3; d 7       | 6/1 ×2; d 10        | 7/0 ×2; d 8K       | 6/1 ×2; d 10K       | 4/7 ×9; d 7   |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 7/4 ×2; d 11      | 10/1 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/6 ×5; d 10  |
| Shaman (5c, 10, 1/1)                                    | 3/1 ×2        | 2/2 ×4             | 2/0 ×3              | 1/8 ×9            | 2/2 ×5              | 3/0 ×3             | 2/2 ×4              | 1/10 ×26      |
| Triceratops (8c, 20, 3/2)                               | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 7/5 ×2            | 10/1 ×2             | 8K/0 ×1            | 10K/0 ×1            | 7/7 ×5        |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 11/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 10/6 ×4       |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 14/5 ×3       |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 14/5 ×3       |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 18/5 ×3       |
| T-Rex (14c, 28, 4/2)                                    | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 11/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/6 ×4; d 14 |
| Alpha T-Rex (14c, 36, 5/2)                              | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 15K/0 ×1; d 15K   | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 14/5 ×3; d 18 |
| Brontosaurus (—c, 45, 3.5/4)                            | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 9/5 ×2; d 13      | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 8/6 ×4; d 12  |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 13/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 12/5 ×3; d 16 |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)                            | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Caveman (2c, 10, 2/2)                                   | 6K/0 ×1; d 6K | 5/2 ×2; d 9        | 5/0 ×2; d 8K        | 3/6 ×4; d 6       | 5/2 ×3; d 9         | 7/0 ×2; d 8K       | 5/2 ×2; d 9         | 3/8 ×11; d 5  |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6K/0 ×1; d 6K | 9/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 6/5 ×3; d 9       | 9/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 9/1 ×2; d 10K       | 5/7 ×6; d 8   |
| Raptor (4c, 12, 2.5/1)                                  | 6K/0 ×1; d 6K | 7/1 ×2; d 10K      | 7/0 ×2; d 8K        | 5/6 ×3; d 8       | 7/1 ×2; d 11        | 8K/0 ×1; d 8K      | 7/1 ×2; d 10K       | 4/7 ×8; d 7   |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 8/5 ×2; d 11      | 11/1 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/6 ×5; d 10  |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 11/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/5 ×4; d 14 |
| Spitter (4c, 10, 2/1)                                   | 6K/0 ×1; d 6K | 6/0 ×2; d 10K      | 6/2 ×2; d 8K        | 4/0 ×3; d 7       | 6/0 ×2; d 10        | 7/0 ×2; d 8K       | 6/0 ×2; d 10K       | 4/0 ×9; d 7   |
| Alpha Spitter (4c, 18, 3/1)                             | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 7/0 ×2; d 11      | 10/0 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/0 ×5; d 10  |
| Ankylosaurus (5c, 20, 2/3)                              | 6K/0 ×1; d 6K | 5/1 ×2; d 9        | 5/0 ×2; d 8K        | 3/5 ×4; d 6       | 5/1 ×3; d 9         | 7/0 ×2; d 8K       | 5/1 ×2; d 9         | 3/7 ×11; d 5  |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6K/0 ×1; d 6K | 9/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 6/4 ×3; d 9       | 9/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 9/1 ×2; d 10K       | 5/6 ×6; d 8   |
| Shaman (5c, 10, 1/1)                                    | 3/1 ×2        | 2/2 ×5             | 2/0 ×4              | 1/8 ×11           | 2/2 ×5              | 3/0 ×3             | 2/2 ×5              | 1/10 ×∞       |
| Triceratops (8c, 20, 3/2)                               | 6K/0 ×1       | 9/1 ×2             | 8K/0 ×1             | 6/5 ×3            | 9/1 ×2              | 8K/0 ×1            | 9/1 ×2              | 5/7 ×6        |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 9/4 ×2            | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 8/6 ×4        |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 13/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 12/5 ×3       |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 13/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 12/5 ×3       |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 15/5 ×3       |
| T-Rex (14c, 28, 4/2)                                    | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 9/4 ×2; d 13      | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 8/6 ×4; d 12  |
| Alpha T-Rex (14c, 36, 5/2)                              | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 13/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 12/5 ×3; d 15 |
| Brontosaurus (—c, 45, 3.5/4)                            | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 8/5 ×2; d 11      | 11/1 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/6 ×5; d 10  |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 11/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/5 ×4; d 14 |

**Field Defense (+2 Defense), the attacker without Breach or Wallbreaker (a Dinosaur defender builds none: its cells equal open ground)**

| Attacker (cost, HP, Atk/Def)                            | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Caveman (2c, 10, 2/2)                                   | 4/0 ×2; d 6K  | 4/2 ×3; d 7        | 4/0 ×2; d 7         | 3/6 ×4; d 5       | 4/2 ×3; d 7         | 4/0 ×2; d 7        | 4/2 ×3; d 7         | 3/8 ×11; d 5  |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6K/0 ×1; d 6K | 7/1 ×2; d 10K      | 7/0 ×2; d 8K        | 5/5 ×3; d 8       | 7/1 ×2; d 10        | 7/0 ×2; d 8K       | 7/1 ×2; d 10K       | 5/7 ×6; d 8   |
| Raptor (4c, 12, 2.5/1)                                  | 6K/0 ×1; d 6K | 5/1 ×2; d 8        | 5/0 ×2; d 8K        | 4/6 ×3; d 7       | 5/1 ×2; d 8         | 6/0 ×2; d 8K       | 5/1 ×2; d 8         | 4/7 ×8; d 6   |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 6K/0 ×1; d 6K | 8/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 7/5 ×2; d 10      | 8/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 8/1 ×2; d 10K       | 6/6 ×5; d 10  |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 10/4 ×2; d 14     | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/5 ×4; d 13 |
| Spitter (4c, 10, 2/1)                                   | 6K/0 ×1; d 6K | 6/0 ×2; d 10K      | 6/2 ×2; d 8K        | 4/0 ×3; d 7       | 6/0 ×2; d 10        | 7/0 ×2; d 8K       | 6/0 ×2; d 10K       | 4/0 ×9; d 7   |
| Alpha Spitter (4c, 18, 3/1)                             | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 7/0 ×2; d 11      | 10/0 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/0 ×5; d 10  |
| Ankylosaurus (5c, 20, 2/3)                              | 4/0 ×2; d 6K  | 4/1 ×3; d 7        | 4/0 ×2; d 7         | 3/5 ×4; d 5       | 4/1 ×3; d 7         | 4/0 ×2; d 7        | 4/1 ×3; d 7         | 3/7 ×11; d 5  |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6K/0 ×1; d 6K | 7/1 ×2; d 10K      | 7/0 ×2; d 8K        | 5/4 ×3; d 8       | 7/1 ×2; d 10        | 7/0 ×2; d 8K       | 7/1 ×2; d 10K       | 5/6 ×6; d 8   |
| Shaman (5c, 10, 1/1)                                    | 1/1 ×4        | 1/2 ×7             | 1/0 ×6              | 1/8 ×12           | 1/2 ×8              | 1/0 ×5             | 1/2 ×7              | 1/10 ×∞       |
| Triceratops (8c, 20, 3/2)                               | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 7/5 ×2            | 10/1 ×2             | 8K/0 ×1            | 10K/0 ×1            | 7/7 ×5        |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 11/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 10/6 ×4       |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 14/5 ×3       |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 14/5 ×3       |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 18/5 ×3       |
| T-Rex (14c, 28, 4/2)                                    | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 8/4 ×2; d 12      | 10/1 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 8/6 ×4; d 11  |
| Alpha T-Rex (14c, 36, 5/2)                              | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 12/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 11/5 ×3; d 15 |
| Brontosaurus (—c, 45, 3.5/4)                            | 6K/0 ×1; d 6K | 8/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 7/5 ×2; d 10      | 8/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 8/1 ×2; d 10K       | 6/6 ×5; d 10  |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 10/4 ×2; d 14     | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/5 ×4; d 13 |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)                            | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Caveman (2c, 10, 2/2)                                   | 4/0 ×2; d 6K  | 4/2 ×3; d 7        | 4/0 ×2; d 7         | 3/6 ×4; d 5       | 4/2 ×3; d 7         | 4/0 ×2; d 7        | 4/2 ×3; d 7         | 3/8 ×11; d 5  |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6K/0 ×1; d 6K | 7/1 ×2; d 10K      | 7/0 ×2; d 8K        | 5/5 ×3; d 8       | 7/1 ×2; d 10        | 7/0 ×2; d 8K       | 7/1 ×2; d 10K       | 5/7 ×6; d 8   |
| Raptor (4c, 12, 2.5/1)                                  | 6K/0 ×1; d 6K | 5/1 ×2; d 8        | 5/0 ×2; d 8K        | 4/6 ×3; d 7       | 5/1 ×2; d 8         | 6/0 ×2; d 8K       | 5/1 ×2; d 8         | 4/7 ×8; d 6   |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 6K/0 ×1; d 6K | 8/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 7/5 ×2; d 10      | 8/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 8/1 ×2; d 10K       | 6/6 ×5; d 10  |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 10/4 ×2; d 14     | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/5 ×4; d 13 |
| Spitter (4c, 10, 2/1)                                   | 6K/0 ×1; d 6K | 6/0 ×2; d 10K      | 6/2 ×2; d 8K        | 4/0 ×3; d 7       | 6/0 ×2; d 10        | 7/0 ×2; d 8K       | 6/0 ×2; d 10K       | 4/0 ×9; d 7   |
| Alpha Spitter (4c, 18, 3/1)                             | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 7/0 ×2; d 11      | 10/0 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 7/0 ×5; d 10  |
| Ankylosaurus (5c, 20, 2/3)                              | 4/0 ×2; d 6K  | 4/1 ×3; d 7        | 4/0 ×2; d 7         | 3/5 ×4; d 5       | 4/1 ×3; d 7         | 4/0 ×2; d 7        | 4/1 ×3; d 7         | 3/7 ×11; d 5  |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6K/0 ×1; d 6K | 7/1 ×2; d 10K      | 7/0 ×2; d 8K        | 5/4 ×3; d 8       | 7/1 ×2; d 10        | 7/0 ×2; d 8K       | 7/1 ×2; d 10K       | 5/6 ×6; d 8   |
| Shaman (5c, 10, 1/1)                                    | 1/1 ×4        | 1/2 ×7             | 1/0 ×6              | 1/8 ×12           | 1/2 ×8              | 1/0 ×5             | 1/2 ×7              | 1/10 ×∞       |
| Triceratops (8c, 20, 3/2)                               | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 7/5 ×2            | 10/1 ×2             | 8K/0 ×1            | 10K/0 ×1            | 7/7 ×5        |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 11/4 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 10/6 ×4       |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 14/5 ×3       |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 14/5 ×3       |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 15K/0 ×1          | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 18/5 ×3       |
| T-Rex (14c, 28, 4/2)                                    | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 8/4 ×2; d 12      | 10/1 ×2; d 12K      | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 8/6 ×4; d 11  |
| Alpha T-Rex (14c, 36, 5/2)                              | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 12/4 ×2; d 15K    | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 11/5 ×3; d 15 |
| Brontosaurus (—c, 45, 3.5/4)                            | 6K/0 ×1; d 6K | 8/1 ×2; d 10K      | 8K/0 ×1; d 8K       | 7/5 ×2; d 10      | 8/1 ×2; d 12K       | 8K/0 ×1; d 8K      | 8/1 ×2; d 10K       | 6/6 ×5; d 10  |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 6K/0 ×1; d 6K | 10K/0 ×1; d 10K    | 8K/0 ×1; d 8K       | 10/4 ×2; d 14     | 12K/0 ×1; d 12K     | 8K/0 ×1; d 8K      | 10K/0 ×1; d 10K     | 10/5 ×4; d 13 |

##### Dinosaur attackers on Undead units

**Open ground**

| Attacker (cost, HP, Atk/Def)                            | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Caveman (2c, 10, 2/2)                                   | 5/5 ×2; d 8      | 6/2 ×2; d 10K   | 6/0 ×2; d 8K   | 5/5 ×4; d 8    | 6/2 ×2; d 10K       | 6/0 ×2; d 10K   | 6/2 ×2; d 10K   | 3/10 ×10; d 6       |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 8/4 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/4 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/10 ×6; d 9        |
| Raptor (4c, 12, 2.5/1)                                  | 6/4 ×2; d 10K    | 8/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 6/4 ×3; d 10   | 8/1 ×2; d 10K       | 8/0 ×2; d 10K   | 8/1 ×2; d 10K   | 4/11 ×7; d 7        |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 10/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 7/10 ×5; d 11       |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 14/3 ×2; d 18K | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 11/8 ×4; d 14       |
| Spitter (4c, 10, 2/1)                                   | 4/0 ×3; d 7      | 6/0 ×2; d 10K   | 6/0 ×2; d 8K   | 5/0 ×4; d 8    | 6/0 ×2; d 10K       | 6/2 ×2; d 10K   | 6/0 ×2; d 10K   | 3/0 ×10; d 6        |
| Alpha Spitter (4c, 18, 3/1)                             | 7/0 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/0 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/0 ×6; d 9         |
| Ankylosaurus (5c, 20, 2/3)                              | 5/4 ×2; d 8      | 6/1 ×2; d 10K   | 6/0 ×2; d 8K   | 5/4 ×4; d 8    | 6/1 ×2; d 10K       | 6/0 ×2; d 10K   | 6/1 ×2; d 10K   | 3/11 ×10; d 6       |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 8/3 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/3 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/9 ×6; d 9         |
| Shaman (5c, 10, 1/1)                                    | 2/6 ×5           | 2/2 ×4          | 2/0 ×3         | 2/6 ×8         | 2/2 ×4              | 2/0 ×4          | 2/2 ×4          | 1/10 ×29            |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2           | 10K/0 ×1        | 8K/0 ×1        | 8/4 ×2         | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 6/10 ×6             |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 12/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 9/9 ×4              |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 16/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 13/8 ×3             |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 16/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 13/8 ×3             |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 18K/0 ×1       | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 16/7 ×3             |
| T-Rex (14c, 28, 4/2)                                    | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 12/3 ×2; d 16  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/9 ×4; d 13        |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 16/3 ×2; d 18K | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 13/8 ×3; d 16       |
| Brontosaurus (—c, 45, 3.5/4)                            | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 10/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 7/10 ×5; d 11       |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 14/3 ×2; d 18K | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 11/8 ×4; d 14       |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)                            | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Caveman (2c, 10, 2/2)                                   | 4/5 ×3; d 7      | 5/2 ×2; d 9     | 5/0 ×2; d 8K   | 4/5 ×4; d 7    | 5/2 ×2; d 9         | 5/0 ×2; d 9     | 5/2 ×2; d 9     | 2/10 ×12; d 5       |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 7/4 ×2; d 10K    | 9/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 7/4 ×3; d 10   | 9/1 ×2; d 10K       | 9/0 ×2; d 10K   | 9/1 ×2; d 10K   | 5/10 ×7; d 7        |
| Raptor (4c, 12, 2.5/1)                                  | 5/4 ×2; d 8      | 7/1 ×2; d 10K   | 7/0 ×2; d 8K   | 5/4 ×3; d 8    | 7/1 ×2; d 10K       | 7/0 ×2; d 10K   | 7/1 ×2; d 10K   | 3/11 ×9; d 6        |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 8/3 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/3 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/10 ×6; d 9        |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 12/3 ×2; d 16  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/8 ×4; d 12        |
| Spitter (4c, 10, 2/1)                                   | 4/0 ×3; d 7      | 6/0 ×2; d 10K   | 6/0 ×2; d 8K   | 5/0 ×4; d 8    | 6/0 ×2; d 10K       | 6/2 ×2; d 10K   | 6/0 ×2; d 10K   | 3/0 ×10; d 6        |
| Alpha Spitter (4c, 18, 3/1)                             | 7/0 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/0 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/0 ×6; d 9         |
| Ankylosaurus (5c, 20, 2/3)                              | 4/4 ×3; d 7      | 5/1 ×2; d 9     | 5/0 ×2; d 8K   | 4/4 ×4; d 7    | 5/1 ×2; d 9         | 5/0 ×2; d 9     | 5/1 ×2; d 9     | 2/11 ×12; d 5       |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 7/3 ×2; d 10K    | 9/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 7/3 ×3; d 10   | 9/1 ×2; d 10K       | 9/0 ×2; d 10K   | 9/1 ×2; d 10K   | 5/9 ×7; d 7         |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×7           | 2/2 ×5          | 2/0 ×4         | 1/6 ×12        | 2/2 ×5              | 2/0 ×5          | 2/2 ×5          | 1/10 ×∞             |
| Triceratops (8c, 20, 3/2)                               | 7/4 ×2           | 9/1 ×2          | 8K/0 ×1        | 7/4 ×3         | 9/1 ×2              | 9/0 ×2          | 9/1 ×2          | 5/10 ×7             |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 10/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 7/9 ×5              |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 14/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 10/8 ×4             |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 14/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 10/8 ×4             |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 18K/0 ×1       | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 14/7 ×3             |
| T-Rex (14c, 28, 4/2)                                    | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 10/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 7/9 ×5; d 10        |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 14/3 ×2; d 18K | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 10/8 ×4; d 14       |
| Brontosaurus (—c, 45, 3.5/4)                            | 8/3 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/3 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/10 ×6; d 9        |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 12/3 ×2; d 16  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/8 ×4; d 12        |

**Field Defense (+2 Defense), the attacker without Breach or Wallbreaker (a Dinosaur defender builds none: its cells equal open ground)**

| Attacker (cost, HP, Atk/Def)                            | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Caveman (2c, 10, 2/2)                                   | 3/5 ×3; d 6      | 4/2 ×3; d 7     | 4/0 ×2; d 7    | 3/5 ×5; d 6    | 4/2 ×3; d 7         | 4/0 ×3; d 7     | 4/2 ×3; d 7     | 2/10 ×12; d 5       |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6/4 ×2; d 9      | 7/1 ×2; d 10K   | 7/0 ×2; d 8K   | 6/4 ×3; d 9    | 7/1 ×2; d 10K       | 7/0 ×2; d 10K   | 7/1 ×2; d 10K   | 5/10 ×7; d 7        |
| Raptor (4c, 12, 2.5/1)                                  | 4/4 ×2; d 7      | 5/1 ×2; d 8     | 5/0 ×2; d 8K   | 4/4 ×4; d 7    | 5/1 ×2; d 8         | 5/0 ×2; d 8     | 5/1 ×2; d 8     | 3/11 ×9; d 6        |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 7/3 ×2; d 10K    | 8/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 7/3 ×3; d 11   | 8/1 ×2; d 10K       | 8/0 ×2; d 10K   | 8/1 ×2; d 10K   | 6/10 ×6; d 9        |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 11/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/8 ×4; d 12        |
| Spitter (4c, 10, 2/1)                                   | 4/0 ×3; d 7      | 6/0 ×2; d 10K   | 6/0 ×2; d 8K   | 5/0 ×4; d 8    | 6/0 ×2; d 10K       | 6/2 ×2; d 10K   | 6/0 ×2; d 10K   | 3/0 ×10; d 6        |
| Alpha Spitter (4c, 18, 3/1)                             | 7/0 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/0 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/0 ×6; d 9         |
| Ankylosaurus (5c, 20, 2/3)                              | 3/4 ×3; d 6      | 4/1 ×3; d 7     | 4/0 ×2; d 7    | 3/4 ×5; d 6    | 4/1 ×3; d 7         | 4/0 ×3; d 7     | 4/1 ×3; d 7     | 2/11 ×12; d 5       |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6/3 ×2; d 9      | 7/1 ×2; d 10K   | 7/0 ×2; d 8K   | 6/3 ×3; d 9    | 7/1 ×2; d 10K       | 7/0 ×2; d 10K   | 7/1 ×2; d 10K   | 5/9 ×7; d 7         |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×8           | 1/2 ×7          | 1/0 ×6         | 1/6 ×13        | 1/2 ×7              | 1/0 ×7          | 1/2 ×7          | 1/10 ×∞             |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2           | 10K/0 ×1        | 8K/0 ×1        | 8/4 ×2         | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 6/10 ×6             |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 12/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 9/9 ×4              |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 16/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 13/8 ×3             |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 16/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 13/8 ×3             |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 18K/0 ×1       | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 16/7 ×3             |
| T-Rex (14c, 28, 4/2)                                    | 9/3 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 9/3 ×2; d 13   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 7/9 ×5; d 10        |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 13/3 ×2; d 16  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 10/8 ×4; d 14       |
| Brontosaurus (—c, 45, 3.5/4)                            | 7/3 ×2; d 10K    | 8/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 7/3 ×3; d 11   | 8/1 ×2; d 10K       | 8/0 ×2; d 10K   | 8/1 ×2; d 10K   | 6/10 ×6; d 9        |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 11/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/8 ×4; d 12        |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)                            | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Caveman (2c, 10, 2/2)                                   | 3/5 ×3; d 6      | 4/2 ×3; d 7     | 4/0 ×2; d 7    | 3/5 ×5; d 6    | 4/2 ×3; d 7         | 4/0 ×3; d 7     | 4/2 ×3; d 7     | 2/10 ×12; d 5       |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6/4 ×2; d 9      | 7/1 ×2; d 10K   | 7/0 ×2; d 8K   | 6/4 ×3; d 9    | 7/1 ×2; d 10K       | 7/0 ×2; d 10K   | 7/1 ×2; d 10K   | 5/10 ×7; d 7        |
| Raptor (4c, 12, 2.5/1)                                  | 4/4 ×2; d 7      | 5/1 ×2; d 8     | 5/0 ×2; d 8K   | 4/4 ×4; d 7    | 5/1 ×2; d 8         | 5/0 ×2; d 8     | 5/1 ×2; d 8     | 3/11 ×9; d 6        |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 7/3 ×2; d 10K    | 8/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 7/3 ×3; d 11   | 8/1 ×2; d 10K       | 8/0 ×2; d 10K   | 8/1 ×2; d 10K   | 6/10 ×6; d 9        |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 11/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/8 ×4; d 12        |
| Spitter (4c, 10, 2/1)                                   | 4/0 ×3; d 7      | 6/0 ×2; d 10K   | 6/0 ×2; d 8K   | 5/0 ×4; d 8    | 6/0 ×2; d 10K       | 6/2 ×2; d 10K   | 6/0 ×2; d 10K   | 3/0 ×10; d 6        |
| Alpha Spitter (4c, 18, 3/1)                             | 7/0 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 8/0 ×2; d 12   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 6/0 ×6; d 9         |
| Ankylosaurus (5c, 20, 2/3)                              | 3/4 ×3; d 6      | 4/1 ×3; d 7     | 4/0 ×2; d 7    | 3/4 ×5; d 6    | 4/1 ×3; d 7         | 4/0 ×3; d 7     | 4/1 ×3; d 7     | 2/11 ×12; d 5       |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6/3 ×2; d 9      | 7/1 ×2; d 10K   | 7/0 ×2; d 8K   | 6/3 ×3; d 9    | 7/1 ×2; d 10K       | 7/0 ×2; d 10K   | 7/1 ×2; d 10K   | 5/9 ×7; d 7         |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×8           | 1/2 ×7          | 1/0 ×6         | 1/6 ×13        | 1/2 ×7              | 1/0 ×7          | 1/2 ×7          | 1/10 ×∞             |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2           | 10K/0 ×1        | 8K/0 ×1        | 8/4 ×2         | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 6/10 ×6             |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 12/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 9/9 ×4              |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 16/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 13/8 ×3             |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 16/3 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 13/8 ×3             |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 18K/0 ×1       | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 16/7 ×3             |
| T-Rex (14c, 28, 4/2)                                    | 9/3 ×2; d 10K    | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 9/3 ×2; d 13   | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 7/9 ×5; d 10        |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 13/3 ×2; d 16  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 10/8 ×4; d 14       |
| Brontosaurus (—c, 45, 3.5/4)                            | 7/3 ×2; d 10K    | 8/1 ×2; d 10K   | 8K/0 ×1; d 8K  | 7/3 ×3; d 11   | 8/1 ×2; d 10K       | 8/0 ×2; d 10K   | 8/1 ×2; d 10K   | 6/10 ×6; d 9        |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1; d 10K  | 10K/0 ×1; d 10K | 8K/0 ×1; d 8K  | 11/3 ×2; d 14  | 10K/0 ×1; d 10K     | 10K/0 ×1; d 10K | 10K/0 ×1; d 10K | 9/8 ×4; d 12        |

##### Dinosaur attackers on Martian units (HP damage through the Shield)

**Open ground**

| Attacker (cost, HP, Atk/Def)                            | Grunt 3c 8hp  | Saucer 4c 8hp | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp  | Tripod 9c 12hp  | Mothership 8c 16hp | Colossus —c 32hp |
| ------------------------------------------------------- | ------------- | ------------- | ----------------- | ------------------------ | ------------- | --------------- | ------------------ | ---------------- |
| Caveman (2c, 10, 2/2)                                   | 3/3 ×3; d 7   | 4/2 ×2; d 8K  | 4/2 ×2; d 8K      | 1/6 ×7; d 4              | 4/2 ×2; d 8K  | 4/0 ×3; d 8     | 1/5 ×10; d 4       | 1/6 ×16; d 4     |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 7/2 ×2; d 8K  | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 4/5 ×3; d 8              | 8K/0 ×1; d 8K | 8/0 ×2; d 12K   | 4/4 ×4; d 8        | 4/5 ×6; d 8      |
| Raptor (4c, 12, 2.5/1)                                  | 5/3 ×2; d 8K  | 6/1 ×2; d 8K  | 6/1 ×2; d 8K      | 3/6 ×4; d 6              | 6/1 ×2; d 8K  | 6/0 ×2; d 10    | 2/4 ×5; d 6        | 3/6 ×8; d 6      |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 6/5 ×2; d 10             | 8K/0 ×1; d 8K | 10/0 ×2; d 12K  | 6/3 ×3; d 10       | 6/5 ×5; d 10     |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 10/4 ×2; d 12K           | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 10/3 ×2; d 14      | 10/4 ×3; d 14    |
| Spitter (4c, 10, 2/1)                                   | 3/3 ×3; d 7   | 4/0 ×2; d 8K  | 4/2 ×2; d 8K      | 1/0 ×7; d 4              | 4/0 ×2; d 8K  | 4/2 ×3; d 8     | 1/0 ×10; d 4       | 1/6 ×16; d 4     |
| Alpha Spitter (4c, 18, 3/1)                             | 7/2 ×2; d 8K  | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 4/0 ×3; d 8              | 8K/0 ×1; d 8K | 8/1 ×2; d 12K   | 4/0 ×4; d 8        | 4/5 ×6; d 8      |
| Ankylosaurus (5c, 20, 2/3)                              | 3/2 ×3; d 7   | 4/1 ×2; d 8K  | 4/1 ×2; d 8K      | 1/5 ×7; d 4              | 4/1 ×2; d 8K  | 4/0 ×3; d 8     | 1/4 ×10; d 4       | 1/5 ×16; d 4     |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 7/1 ×2; d 8K  | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 4/4 ×3; d 8              | 8K/0 ×1; d 8K | 8/0 ×2; d 12K   | 4/3 ×4; d 8        | 4/4 ×6; d 8      |
| Shaman (5c, 10, 1/1)                                    | 0/4 ×∞        | 0/2 ×∞        | 0/2 ×∞            | 0/8 ×∞                   | 0/2 ×∞        | 0/0 ×∞          | 0/6 ×∞             | 0/8 ×∞           |
| Triceratops (8c, 20, 3/2)                               | 7/2 ×2        | 8K/0 ×1       | 8K/0 ×1           | 4/5 ×3                   | 8K/0 ×1       | 8/0 ×2          | 4/4 ×4             | 4/5 ×6           |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 8/4 ×2                   | 8K/0 ×1       | 12K/0 ×1        | 8/3 ×2             | 8/4 ×4           |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 12K/0 ×1                 | 8K/0 ×1       | 12K/0 ×1        | 12/3 ×2            | 12/4 ×3          |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 12K/0 ×1                 | 8K/0 ×1       | 12K/0 ×1        | 12/3 ×2            | 12/4 ×3          |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 12K/0 ×1                 | 8K/0 ×1       | 12K/0 ×1        | 16K/0 ×1           | 16/3 ×2          |
| T-Rex (14c, 28, 4/2)                                    | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 8/4 ×2; d 12K            | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 8/3 ×2; d 12       | 8/4 ×4; d 12     |
| Alpha T-Rex (14c, 36, 5/2)                              | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 12K/0 ×1; d 12K          | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 12/3 ×2; d 16K     | 12/4 ×3; d 16    |
| Brontosaurus (—c, 45, 3.5/4)                            | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 6/5 ×2; d 10             | 8K/0 ×1; d 8K | 10/0 ×2; d 12K  | 6/3 ×3; d 10       | 6/5 ×5; d 10     |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 10/4 ×2; d 12K           | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 10/3 ×2; d 14      | 10/4 ×3; d 14    |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)                            | Grunt 3c 8hp  | Saucer 4c 8hp | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp  | Tripod 9c 12hp  | Mothership 8c 16hp | Colossus —c 32hp |
| ------------------------------------------------------- | ------------- | ------------- | ----------------- | ------------------------ | ------------- | --------------- | ------------------ | ---------------- |
| Caveman (2c, 10, 2/2)                                   | 1/3 ×4; d 4   | 4/2 ×2; d 8K  | 2/2 ×4; d 5       | 0/6 ×∞; d 2              | 2/2 ×4; d 5   | 4/0 ×3; d 8     | 1/5 ×10; d 4       | 1/6 ×16; d 4     |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 4/2 ×2; d 8K  | 8K/0 ×1; d 8K | 5/1 ×2; d 8K      | 2/5 ×4; d 5              | 5/1 ×2; d 8K  | 8/0 ×2; d 12K   | 4/4 ×4; d 8        | 4/5 ×6; d 8      |
| Raptor (4c, 12, 2.5/1)                                  | 3/3 ×3; d 6   | 6/1 ×2; d 8K  | 3/1 ×3; d 6       | 1/6 ×6; d 4              | 3/1 ×3; d 6   | 6/0 ×2; d 10    | 2/4 ×5; d 6        | 3/6 ×8; d 6      |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 6/2 ×2; d 8K  | 8K/0 ×1; d 8K | 6/1 ×2; d 8K      | 4/5 ×3; d 7              | 6/1 ×2; d 8K  | 10/0 ×2; d 12K  | 6/3 ×3; d 10       | 6/5 ×5; d 10     |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 7/4 ×2; d 11             | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 10/3 ×2; d 14      | 10/4 ×3; d 14    |
| Spitter (4c, 10, 2/1)                                   | 3/3 ×3; d 7   | 4/0 ×2; d 8K  | 4/2 ×2; d 8K      | 1/0 ×7; d 4              | 4/0 ×2; d 8K  | 4/2 ×3; d 8     | 1/0 ×10; d 4       | 1/6 ×16; d 4     |
| Alpha Spitter (4c, 18, 3/1)                             | 7/2 ×2; d 8K  | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 4/0 ×3; d 8              | 8K/0 ×1; d 8K | 8/1 ×2; d 12K   | 4/0 ×4; d 8        | 4/5 ×6; d 8      |
| Ankylosaurus (5c, 20, 2/3)                              | 1/2 ×4; d 4   | 4/1 ×2; d 8K  | 2/1 ×4; d 5       | 0/5 ×∞; d 2              | 2/1 ×4; d 5   | 4/0 ×3; d 8     | 1/4 ×10; d 4       | 1/5 ×16; d 4     |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 4/1 ×2; d 8K  | 8K/0 ×1; d 8K | 5/1 ×2; d 8K      | 2/4 ×4; d 5              | 5/1 ×2; d 8K  | 8/0 ×2; d 12K   | 4/3 ×4; d 8        | 4/4 ×6; d 8      |
| Shaman (5c, 10, 1/1)                                    | 0/4 ×∞        | 0/2 ×∞        | 0/2 ×∞            | 0/8 ×∞                   | 0/2 ×∞        | 0/0 ×∞          | 0/6 ×∞             | 0/8 ×∞           |
| Triceratops (8c, 20, 3/2)                               | 7/2 ×2        | 8K/0 ×1       | 8K/0 ×1           | 4/5 ×3                   | 8K/0 ×1       | 8/0 ×2          | 4/4 ×4             | 4/5 ×6           |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 8/4 ×2                   | 8K/0 ×1       | 12K/0 ×1        | 8/3 ×2             | 8/4 ×4           |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 12K/0 ×1                 | 8K/0 ×1       | 12K/0 ×1        | 12/3 ×2            | 12/4 ×3          |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 12K/0 ×1                 | 8K/0 ×1       | 12K/0 ×1        | 12/3 ×2            | 12/4 ×3          |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 8K/0 ×1       | 8K/0 ×1       | 8K/0 ×1           | 12K/0 ×1                 | 8K/0 ×1       | 12K/0 ×1        | 16K/0 ×1           | 16/3 ×2          |
| T-Rex (14c, 28, 4/2)                                    | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 5/4 ×2; d 9              | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 8/3 ×2; d 12       | 8/4 ×4; d 12     |
| Alpha T-Rex (14c, 36, 5/2)                              | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 9/4 ×2; d 12K            | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 12/3 ×2; d 16K     | 12/4 ×3; d 16    |
| Brontosaurus (—c, 45, 3.5/4)                            | 6/2 ×2; d 8K  | 8K/0 ×1; d 8K | 6/1 ×2; d 8K      | 4/5 ×3; d 7              | 6/1 ×2; d 8K  | 10/0 ×2; d 12K  | 6/3 ×3; d 10       | 6/5 ×5; d 10     |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K | 8K/0 ×1; d 8K     | 7/4 ×2; d 11             | 8K/0 ×1; d 8K | 12K/0 ×1; d 12K | 10/3 ×2; d 14      | 10/4 ×3; d 14    |

##### Dinosaur attackers on Dinosaur units

**Open ground**

| Attacker (cost, HP, Atk/Def)                            | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ------------------------------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Caveman (2c, 10, 2/2)                                   | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7    | 3/10 ×11 · 12 · 13   |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Raptor (4c, 12, 2.5/1)                                  | 6/4 ×2          | 8/1 ×2 · 2 · 3   | 8/1 ×2 · 2 · 3   | 4/7 ×4 · 5 · 6       | 8/1 ×2         | 6/4 ×3 · 4 · 4      | 6/4 ×4 · 5 · 5    | 4/11 ×8 · 9 · 9      |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 4   | 7/10 ×5 · 6 · 6      |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 2 | 11/5 ×2 · 2 · 3      | 10K/0 ×1       | 14/3 ×2 · 2 · 2     | 14/3 ×2 · 3 · 3   | 11/8 ×4 · 4 · 5      |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×2          | 6/0 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/0 ×6 · 7 · 8       | 6/0 ×2         | 5/0 ×4 · 5 · 5      | 5/0 ×5 · 6 · 7    | 3/0 ×11 · 12 · 13    |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Ankylosaurus (5c, 20, 2/3)                              | 5/4 ×2          | 6/1 ×2 · 3 · 3   | 6/1 ×2 · 3 · 3   | 3/7 ×6 · 7 · 8       | 6/1 ×2         | 5/4 ×4 · 5 · 5      | 5/4 ×5 · 6 · 7    | 3/11 ×11 · 12 · 13   |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 8/3 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/6 ×3 · 4 · 4       | 10K/0 ×1       | 8/3 ×3 · 3 · 3      | 8/3 ×3 · 4 · 4    | 6/9 ×6 · 7 · 7       |
| Shaman (5c, 10, 1/1)                                    | 2/6 ×5          | 2/2 ×5 · 6 · 7   | 2/2 ×4 · 5 · 7   | 1/10 ×18 · 21 · 25   | 2/2 ×4         | 2/6 ×9 · 11 · 12    | 2/6 ×12 · 14 · 16 | 1/10 ×∞ · ∞ · ∞      |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/9 ×5 · 5 · 5       |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 1 | 13/5 ×2 · 2 · 2      | 10K/0 ×1       | 16/3 ×2 · 2 · 2     | 16/3 ×2 · 2 · 3   | 13/8 ×4 · 4 · 4      |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 1 | 13/5 ×2 · 2 · 2      | 10K/0 ×1       | 16/3 ×2 · 2 · 2     | 16/3 ×2 · 2 · 3   | 13/8 ×4 · 4 · 4      |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1        | 12K/0 ×1 · 1 · 1 | 10K/0 ×1 · 1 · 1 | 17/5 ×2 · 2 · 2      | 10K/0 ×1       | 20K/0 ×1 · 2 · 2    | 20/2 ×2 · 2 · 2   | 16/7 ×3 · 3 · 3      |
| T-Rex (14c, 28, 4/2)                                    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/9 ×5 · 5 · 5       |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 1 | 13/5 ×2 · 2 · 2      | 10K/0 ×1       | 16/3 ×2 · 2 · 2     | 16/3 ×2 · 2 · 3   | 13/8 ×4 · 4 · 4      |
| Brontosaurus (—c, 45, 3.5/4)                            | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 4   | 7/10 ×5 · 6 · 6      |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 2 | 11/5 ×2 · 2 · 3      | 10K/0 ×1       | 14/3 ×2 · 2 · 2     | 14/3 ×2 · 3 · 3   | 11/8 ×4 · 4 · 5      |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)                            | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ------------------------------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Caveman (2c, 10, 2/2)                                   | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8    | 2/10 ×14 · 15 · 16   |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 7/4 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/7 ×4 · 5 · 5       | 9/1 ×2         | 7/4 ×3 · 3 · 4      | 7/4 ×4 · 4 · 5    | 5/10 ×7 · 8 · 9      |
| Raptor (4c, 12, 2.5/1)                                  | 5/4 ×2          | 7/1 ×2 · 3 · 3   | 7/1 ×2 · 2 · 3   | 3/7 ×5 · 6 · 7       | 7/1 ×2         | 5/4 ×4 · 4 · 5      | 5/4 ×5 · 5 · 6    | 3/11 ×10 · 11 · 11   |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 8/3 ×2          | 11/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/6 ×3 · 4 · 4       | 10K/0 ×1       | 8/3 ×3 · 3 · 3      | 8/3 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/5 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/8 ×5 · 5 · 5       |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×2          | 6/0 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/0 ×6 · 7 · 8       | 6/0 ×2         | 5/0 ×4 · 5 · 5      | 5/0 ×5 · 6 · 7    | 3/0 ×11 · 12 · 13    |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Ankylosaurus (5c, 20, 2/3)                              | 4/4 ×3          | 5/1 ×3 · 3 · 4   | 5/1 ×2 · 3 · 3   | 2/7 ×8 · 9 · 10      | 5/1 ×2         | 4/4 ×5 · 5 · 6      | 4/4 ×6 · 7 · 8    | 2/11 ×14 · 15 · 16   |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 7/3 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/6 ×4 · 5 · 5       | 9/1 ×2         | 7/3 ×3 · 3 · 4      | 7/3 ×4 · 4 · 5    | 5/9 ×7 · 8 · 9       |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×7          | 2/2 ×5 · 7 · 9   | 2/2 ×5 · 6 · 8   | 1/10 ×19 · 22 · 26   | 2/2 ×5         | 1/6 ×13 · 15 · 18   | 1/6 ×18 · 21 · 23 | 1/10 ×∞ · ∞ · ∞      |
| Triceratops (8c, 20, 3/2)                               | 7/4 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/7 ×4 · 5 · 5       | 9/1 ×2         | 7/4 ×3 · 3 · 4      | 7/4 ×4 · 4 · 5    | 5/10 ×7 · 8 · 9      |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 3   | 7/9 ×5 · 6 · 6       |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 2 | 11/5 ×2 · 2 · 3      | 10K/0 ×1       | 14/3 ×2 · 2 · 2     | 14/3 ×2 · 3 · 3   | 10/8 ×4 · 4 · 5      |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 2 | 11/5 ×2 · 2 · 3      | 10K/0 ×1       | 14/3 ×2 · 2 · 2     | 14/3 ×2 · 3 · 3   | 10/8 ×4 · 4 · 5      |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1        | 12K/0 ×1 · 1 · 1 | 10K/0 ×1 · 1 · 1 | 14/5 ×2 · 2 · 2      | 10K/0 ×1       | 18/2 ×2 · 2 · 2     | 18/2 ×2 · 2 · 2   | 14/7 ×3 · 3 · 4      |
| T-Rex (14c, 28, 4/2)                                    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 3   | 7/9 ×5 · 6 · 6       |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 2 | 11/5 ×2 · 2 · 3      | 10K/0 ×1       | 14/3 ×2 · 2 · 2     | 14/3 ×2 · 3 · 3   | 10/8 ×4 · 4 · 5      |
| Brontosaurus (—c, 45, 3.5/4)                            | 8/3 ×2          | 11/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/6 ×3 · 4 · 4       | 10K/0 ×1       | 8/3 ×3 · 3 · 3      | 8/3 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/5 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/8 ×5 · 5 · 5       |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)                            | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ------------------------------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Caveman (2c, 10, 2/2)                                   | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/10 ×14 · 15 · 16   |
| Caveman (Pack Hunt) (2c, 10, 2/2)                       | 6/4 ×2          | 7/1 ×2 · 2 · 3   | 7/1 ×2 · 2 · 3   | 4/7 ×4 · 5 · 5       | 7/1 ×2         | 6/4 ×3 · 4 · 4      | 6/4 ×4 · 5 · 5    | 5/10 ×7 · 8 · 9      |
| Raptor (4c, 12, 2.5/1)                                  | 4/4 ×2          | 5/1 ×2 · 3 · 4   | 5/1 ×2 · 3 · 3   | 3/7 ×5 · 6 · 7       | 5/1 ×2         | 4/4 ×4 · 5 · 5      | 4/4 ×5 · 6 · 7    | 3/11 ×10 · 11 · 11   |
| Raptor (Pounce) (4c, 12, 2.5/1)                         | 7/3 ×2          | 8/1 ×2 · 2 · 3   | 8/1 ×2 · 2 · 2   | 5/6 ×3 · 4 · 5       | 8/1 ×2         | 7/3 ×3 · 3 · 4      | 7/3 ×4 · 4 · 5    | 6/10 ×6 · 7 · 7      |
| Alpha Raptor (Pounce) (4c, 20, 3.5/1)                   | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 9/5 ×2 · 3 · 3       | 10K/0 ×1       | 11/3 ×2 · 2 · 3     | 11/3 ×3 · 3 · 3   | 9/8 ×5 · 5 · 5       |
| Spitter (4c, 10, 2/1)                                   | 5/0 ×2          | 6/0 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/0 ×6 · 7 · 8       | 6/0 ×2         | 5/0 ×4 · 5 · 5      | 5/0 ×5 · 6 · 7    | 3/0 ×11 · 12 · 13    |
| Alpha Spitter (4c, 18, 3/1)                             | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Ankylosaurus (5c, 20, 2/3)                              | 3/4 ×3          | 4/1 ×3 · 4 · 5   | 4/1 ×3 · 4 · 4   | 2/7 ×8 · 9 · 11      | 4/1 ×3         | 3/4 ×5 · 6 · 7      | 3/4 ×7 · 8 · 9    | 2/11 ×14 · 15 · 16   |
| Alpha Ankylosaurus (5c, 28, 3/3)                        | 6/3 ×2          | 7/1 ×2 · 2 · 3   | 7/1 ×2 · 2 · 3   | 4/6 ×4 · 5 · 5       | 7/1 ×2         | 6/3 ×3 · 4 · 4      | 6/3 ×4 · 5 · 5    | 5/9 ×7 · 8 · 9       |
| Shaman (5c, 10, 1/1)                                    | 1/6 ×8          | 1/2 ×8 · 11 · 13 | 1/2 ×7 · 9 · 12  | 1/10 ×19 · 23 · 26   | 1/2 ×7         | 1/6 ×15 · 18 · 21   | 1/6 ×21 · 23 · 26 | 1/10 ×∞ · ∞ · ∞      |
| Triceratops (8c, 20, 3/2)                               | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Triceratops (run-up 1) (8c, 20, 3/2)                    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/9 ×5 · 5 · 5       |
| Triceratops (run-up 2, Wallbreaker) (8c, 20, 3/2)       | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 1 | 13/5 ×2 · 2 · 2      | 10K/0 ×1       | 16/3 ×2 · 2 · 2     | 16/3 ×2 · 2 · 3   | 13/8 ×4 · 4 · 4      |
| Alpha Triceratops (run-up 1) (8c, 28, 4/2)              | 10K/0 ×1        | 12K/0 ×1 · 1 · 2 | 10K/0 ×1 · 1 · 1 | 13/5 ×2 · 2 · 2      | 10K/0 ×1       | 16/3 ×2 · 2 · 2     | 16/3 ×2 · 2 · 3   | 13/8 ×4 · 4 · 4      |
| Alpha Triceratops (run-up 2, Wallbreaker) (8c, 28, 4/2) | 10K/0 ×1        | 12K/0 ×1 · 1 · 1 | 10K/0 ×1 · 1 · 1 | 17/5 ×2 · 2 · 2      | 10K/0 ×1       | 20K/0 ×1 · 2 · 2    | 20/2 ×2 · 2 · 2   | 16/7 ×3 · 3 · 3      |
| T-Rex (14c, 28, 4/2)                                    | 9/3 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 9/3 ×2 · 3 · 3      | 9/3 ×3 · 3 · 4    | 7/9 ×5 · 6 · 6       |
| Alpha T-Rex (14c, 36, 5/2)                              | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 10/5 ×2 · 3 · 3      | 10K/0 ×1       | 13/3 ×2 · 2 · 2     | 13/3 ×2 · 3 · 3   | 10/8 ×4 · 4 · 5      |
| Brontosaurus (—c, 45, 3.5/4)                            | 7/3 ×2          | 8/1 ×2 · 2 · 3   | 8/1 ×2 · 2 · 2   | 5/6 ×3 · 4 · 5       | 8/1 ×2         | 7/3 ×3 · 3 · 4      | 7/3 ×4 · 4 · 5    | 6/10 ×6 · 7 · 7      |
| Alpha Brontosaurus (—c, 53, 4.5/4)                      | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 9/5 ×2 · 3 · 3       | 10K/0 ×1       | 11/3 ×2 · 2 · 3     | 11/3 ×3 · 3 · 3   | 9/8 ×5 · 5 · 5       |

#### The reverse

Each cell: the hit on the full-HP dinosaur at stage 0 / the damage the attacker takes back (the same at every stage), then the number of attacks by fresh full-HP attackers of that kind that kill it at stage 0 · Big (+4 HP) · Alpha (+8 HP); one count for the Caveman and the Shaman, which do not grow. `K` is a kill of the stage-0 unit in one attack. Ranged units attack from their full range; a unit marked (Charge), (Strafe), or (full power) has its bonus. No Goblin attacker has Gang Up here (the attacker alone), no Lich plagues, and a Martian ray is at full power.

##### Human attackers on Dinosaur units

**Open ground**

| Attacker (cost, HP, Atk/Def)  | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ----------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Fighter (2c, 12, 2/2)         | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7    | 3/12 ×11 · 12 · 13   |
| Guard (3c, 17, 1.5/3)         | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 3 · 4   | 1/9 ×10 · 12 · 14    | 4/2 ×3         | 3/5 ×6 · 7 · 8      | 3/5 ×8 · 9 · 10   | 2/13 ×17 · 18 · 20   |
| Raider (4c, 12, 2/1)          | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7    | 3/12 ×11 · 12 · 13   |
| Raider (Charge) (4c, 12, 2/1) | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Marksman (4c, 12, 2/1)        | 5/0 ×2          | 6/0 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/0 ×6 · 7 · 8       | 6/0 ×2         | 5/0 ×4 · 5 · 5      | 5/0 ×5 · 6 · 7    | 3/0 ×11 · 12 · 13    |
| Captain (5c, 10, 1/1)         | 2/6 ×5          | 2/2 ×5 · 6 · 7   | 2/2 ×4 · 5 · 7   | 1/10 ×18 · 21 · 25   | 2/2 ×4         | 2/6 ×9 · 11 · 12    | 2/6 ×12 · 14 · 16 | 1/10 ×∞ · ∞ · ∞      |
| Swordsman (5c, 15, 3.5/2.5)   | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 4   | 7/10 ×5 · 6 · 6      |
| Catapult (8c, 10, 3/0.5)      | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Knight (9c, 13, 4/1)          | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/9 ×5 · 5 · 5       |
| Juggernaut (—c, 40, 4/4)      | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/9 ×5 · 5 · 5       |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)  | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ----------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Fighter (2c, 12, 2/2)         | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8    | 2/12 ×14 · 15 · 16   |
| Guard (3c, 17, 1.5/3)         | 2/5 ×4          | 3/2 ×3 · 4 · 5   | 3/2 ×3 · 4 · 5   | 1/9 ×14 · 16 · 19    | 3/2 ×3         | 2/5 ×7 · 8 · 9      | 2/5 ×9 · 11 · 12  | 1/13 ×22 · 24 · 26   |
| Raider (4c, 12, 2/1)          | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8    | 2/12 ×14 · 15 · 16   |
| Raider (Charge) (4c, 12, 2/1) | 7/4 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/7 ×4 · 5 · 5       | 9/1 ×2         | 7/4 ×3 · 3 · 4      | 7/4 ×4 · 4 · 5    | 5/10 ×7 · 8 · 9      |
| Marksman (4c, 12, 2/1)        | 4/0 ×3          | 5/0 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/0 ×8 · 9 · 10      | 5/0 ×2         | 4/0 ×5 · 5 · 6      | 4/0 ×6 · 7 · 8    | 2/0 ×14 · 15 · 16    |
| Captain (5c, 10, 1/1)         | 1/6 ×7          | 2/2 ×5 · 7 · 9   | 2/2 ×5 · 6 · 8   | 1/10 ×19 · 22 · 26   | 2/2 ×5         | 1/6 ×13 · 15 · 18   | 1/6 ×18 · 21 · 23 | 1/10 ×∞ · ∞ · ∞      |
| Swordsman (5c, 15, 3.5/2.5)   | 8/3 ×2          | 11/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/6 ×3 · 4 · 4       | 10K/0 ×1       | 8/3 ×3 · 3 · 3      | 8/3 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Catapult (8c, 10, 3/0.5)      | 7/0 ×2          | 9/0 ×2 · 2 · 2   | 9/0 ×2 · 2 · 2   | 4/0 ×4 · 5 · 5       | 9/0 ×2         | 7/0 ×3 · 3 · 4      | 7/0 ×4 · 4 · 5    | 5/0 ×7 · 8 · 9       |
| Knight (9c, 13, 4/1)          | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 3   | 7/9 ×5 · 6 · 6       |
| Juggernaut (—c, 40, 4/4)      | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 3   | 7/9 ×5 · 6 · 6       |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)  | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ----------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Fighter (2c, 12, 2/2)         | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/12 ×14 · 15 · 16   |
| Guard (3c, 17, 1.5/3)         | 2/5 ×4          | 2/2 ×4 · 6 · 7   | 2/2 ×4 · 5 · 6   | 1/9 ×15 · 17 · 20    | 2/2 ×4         | 2/5 ×8 · 9 · 11     | 2/5 ×11 · 12 · 14 | 1/13 ×22 · 24 · 26   |
| Raider (4c, 12, 2/1)          | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/12 ×14 · 15 · 16   |
| Raider (Charge) (4c, 12, 2/1) | 6/4 ×2          | 7/1 ×2 · 2 · 3   | 7/1 ×2 · 2 · 3   | 4/7 ×4 · 5 · 5       | 7/1 ×2         | 6/4 ×3 · 4 · 4      | 6/4 ×4 · 5 · 5    | 5/10 ×7 · 8 · 9      |
| Marksman (4c, 12, 2/1)        | 3/0 ×3          | 4/0 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/0 ×8 · 9 · 11      | 4/0 ×3         | 3/0 ×5 · 6 · 7      | 3/0 ×7 · 8 · 9    | 2/0 ×14 · 15 · 16    |
| Captain (5c, 10, 1/1)         | 1/6 ×8          | 1/2 ×8 · 11 · 13 | 1/2 ×7 · 9 · 12  | 1/10 ×19 · 23 · 26   | 1/2 ×7         | 1/6 ×15 · 18 · 21   | 1/6 ×21 · 23 · 26 | 1/10 ×∞ · ∞ · ∞      |
| Swordsman (5c, 15, 3.5/2.5)   | 7/3 ×2          | 8/1 ×2 · 2 · 3   | 8/1 ×2 · 2 · 2   | 5/6 ×3 · 4 · 5       | 8/1 ×2         | 7/3 ×3 · 3 · 4      | 7/3 ×4 · 4 · 5    | 6/10 ×6 · 7 · 7      |
| Catapult (8c, 10, 3/0.5)      | 6/0 ×2          | 7/0 ×2 · 2 · 3   | 7/0 ×2 · 2 · 3   | 4/0 ×4 · 5 · 5       | 7/0 ×2         | 6/0 ×3 · 4 · 4      | 6/0 ×4 · 5 · 5    | 5/0 ×7 · 8 · 9       |
| Knight (9c, 13, 4/1)          | 9/3 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 9/3 ×2 · 3 · 3      | 9/3 ×3 · 3 · 4    | 7/9 ×5 · 6 · 6       |
| Juggernaut (—c, 40, 4/4)      | 9/3 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 9/3 ×2 · 3 · 3      | 9/3 ×3 · 3 · 4    | 7/9 ×5 · 6 · 6       |

##### Goblin attackers on Dinosaur units (no Gang Up: the attacker alone)

**Open ground**

| Attacker (cost, HP, Atk/Def)      | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp  | Brontosaurus —c 45hp |
| --------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | --------------- | -------------------- |
| Goblin (1c, 6, 1.5/0.5)           | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 3 · 4   | 1/6 ×10 · 12 · 14    | 4/2 ×3         | 3/5 ×6 · 7 · 8      | 3/5 ×8 · 9 · 10 | 2/6 ×17 · 18 · 20    |
| Wolf Rider (3c, 10, 2/1)          | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7  | 3/10 ×11 · 12 · 13   |
| Wolf Rider (Charge) (3c, 10, 2/1) | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4  | 6/10 ×6 · 7 · 7      |
| Bomb Chucker (3c, 8, 2/1)         | 5/0 ×2          | 6/0 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/0 ×6 · 7 · 8       | 6/0 ×2         | 5/0 ×4 · 5 · 5      | 5/0 ×5 · 6 · 7  | 3/0 ×11 · 12 · 13    |
| Orc Brute (3c, 15, 2/2.5)         | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7  | 3/12 ×11 · 12 · 13   |
| Orc Warboss (5c, 12, 2/1)         | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7  | 3/12 ×11 · 12 · 13   |
| Rocket Cart (7c, 8, 3.5/0.5)      | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/0 ×3 · 3 · 4       | 10K/0 ×1       | 10/0 ×2 · 3 · 3     | 10/0 ×3 · 3 · 4 | 7/0 ×5 · 6 · 6       |
| Scrap Buggy (8c, 10, 3/1)         | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4  | 6/10 ×6 · 7 · 7      |
| Troll (—c, 40, 4/3)               | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3 | 9/9 ×5 · 5 · 5       |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)      | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp   | Brontosaurus —c 45hp |
| --------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ---------------- | -------------------- |
| Goblin (1c, 6, 1.5/0.5)           | 2/5 ×4          | 3/2 ×3 · 4 · 5   | 3/2 ×3 · 4 · 5   | 1/6 ×14 · 16 · 19    | 3/2 ×3         | 2/5 ×7 · 8 · 9      | 2/5 ×9 · 11 · 12 | 1/6 ×22 · 24 · 26    |
| Wolf Rider (3c, 10, 2/1)          | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8   | 2/10 ×14 · 15 · 16   |
| Wolf Rider (Charge) (3c, 10, 2/1) | 7/4 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/7 ×4 · 5 · 5       | 9/1 ×2         | 7/4 ×3 · 3 · 4      | 7/4 ×4 · 4 · 5   | 5/10 ×7 · 8 · 9      |
| Bomb Chucker (3c, 8, 2/1)         | 4/0 ×3          | 5/0 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/0 ×8 · 9 · 10      | 5/0 ×2         | 4/0 ×5 · 5 · 6      | 4/0 ×6 · 7 · 8   | 2/0 ×14 · 15 · 16    |
| Orc Brute (3c, 15, 2/2.5)         | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8   | 2/12 ×14 · 15 · 16   |
| Orc Warboss (5c, 12, 2/1)         | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8   | 2/12 ×14 · 15 · 16   |
| Rocket Cart (7c, 8, 3.5/0.5)      | 8/0 ×2          | 11/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4   | 6/0 ×6 · 7 · 7       |
| Scrap Buggy (8c, 10, 3/1)         | 7/4 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/7 ×4 · 5 · 5       | 9/1 ×2         | 7/4 ×3 · 3 · 4      | 7/4 ×4 · 4 · 5   | 5/10 ×7 · 8 · 9      |
| Troll (—c, 40, 4/3)               | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 3  | 7/9 ×5 · 6 · 6       |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)      | Caveman 2c 10hp | Raptor 4c 12hp  | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| --------------------------------- | --------------- | --------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Goblin (1c, 6, 1.5/0.5)           | 2/5 ×4          | 2/2 ×4 · 6 · 7  | 2/2 ×4 · 5 · 6   | 1/6 ×15 · 17 · 20    | 2/2 ×4         | 2/5 ×8 · 9 · 11     | 2/5 ×11 · 12 · 14 | 1/6 ×22 · 24 · 26    |
| Wolf Rider (3c, 10, 2/1)          | 3/5 ×3          | 4/2 ×3 · 4 · 5  | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/10 ×14 · 15 · 16   |
| Wolf Rider (Charge) (3c, 10, 2/1) | 6/4 ×2          | 7/1 ×2 · 2 · 3  | 7/1 ×2 · 2 · 3   | 4/7 ×4 · 5 · 5       | 7/1 ×2         | 6/4 ×3 · 4 · 4      | 6/4 ×4 · 5 · 5    | 5/10 ×7 · 8 · 9      |
| Bomb Chucker (3c, 8, 2/1)         | 3/0 ×3          | 4/0 ×3 · 4 · 5  | 4/2 ×3 · 4 · 4   | 2/0 ×8 · 9 · 11      | 4/0 ×3         | 3/0 ×5 · 6 · 7      | 3/0 ×7 · 8 · 9    | 2/0 ×14 · 15 · 16    |
| Orc Brute (3c, 15, 2/2.5)         | 3/5 ×3          | 4/2 ×3 · 4 · 5  | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/12 ×14 · 15 · 16   |
| Orc Warboss (5c, 12, 2/1)         | 3/5 ×3          | 4/2 ×3 · 4 · 5  | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/12 ×14 · 15 · 16   |
| Rocket Cart (7c, 8, 3.5/0.5)      | 7/0 ×2          | 8/0 ×2 · 2 · 3  | 8/0 ×2 · 2 · 2   | 5/0 ×3 · 4 · 5       | 8/0 ×2         | 7/0 ×3 · 3 · 4      | 7/0 ×4 · 4 · 5    | 6/0 ×6 · 7 · 7       |
| Scrap Buggy (8c, 10, 3/1)         | 6/4 ×2          | 7/1 ×2 · 2 · 3  | 7/1 ×2 · 2 · 3   | 4/7 ×4 · 5 · 5       | 7/1 ×2         | 6/4 ×3 · 4 · 4      | 6/4 ×4 · 5 · 5    | 5/10 ×7 · 8 · 9      |
| Troll (—c, 40, 4/3)               | 9/3 ×2          | 10/1 ×2 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 9/3 ×2 · 3 · 3      | 9/3 ×3 · 3 · 4    | 7/9 ×5 · 6 · 6       |

##### Undead attackers on Dinosaur units

**Open ground**

| Attacker (cost, HP, Atk/Def) | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ---------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Skeleton (2c, 10, 2/2)       | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7    | 3/10 ×11 · 12 · 13   |
| Ghoul (3c, 10, 2/1)          | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7    | 3/10 ×11 · 12 · 13   |
| Ghoul (Charge) (3c, 10, 2/1) | 8/4 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/7 ×3 · 4 · 4       | 10K/0 ×1       | 8/4 ×3 · 3 · 3      | 8/4 ×3 · 4 · 4    | 6/10 ×6 · 7 · 7      |
| Zombie (3c, 18, 2/2)         | 5/5 ×2          | 6/2 ×2 · 3 · 3   | 6/2 ×2 · 3 · 3   | 3/8 ×6 · 7 · 8       | 6/2 ×2         | 5/5 ×4 · 5 · 5      | 5/5 ×5 · 6 · 7    | 3/12 ×11 · 12 · 13   |
| Necromancer (5c, 10, 1/1)    | 2/6 ×5          | 2/2 ×5 · 6 · 7   | 2/2 ×4 · 5 · 7   | 1/10 ×18 · 21 · 25   | 2/2 ×4         | 2/6 ×9 · 11 · 12    | 2/6 ×12 · 14 · 16 | 1/10 ×∞ · ∞ · ∞      |
| Lich (8c, 10, 3/1)           | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Vampire (9c, 10, 3/1)        | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Abomination (—c, 40, 4/4)    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/6 ×2 · 3 · 3       | 10K/0 ×1       | 12/3 ×2 · 2 · 3     | 12/3 ×3 · 3 · 3   | 9/9 ×5 · 5 · 5       |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def) | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ---------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Skeleton (2c, 10, 2/2)       | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8    | 2/10 ×14 · 15 · 16   |
| Ghoul (3c, 10, 2/1)          | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8    | 2/10 ×14 · 15 · 16   |
| Ghoul (Charge) (3c, 10, 2/1) | 7/4 ×2          | 9/1 ×2 · 2 · 2   | 9/1 ×2 · 2 · 2   | 4/7 ×4 · 5 · 5       | 9/1 ×2         | 7/4 ×3 · 3 · 4      | 7/4 ×4 · 4 · 5    | 5/10 ×7 · 8 · 9      |
| Zombie (3c, 18, 2/2)         | 4/5 ×3          | 5/2 ×3 · 3 · 4   | 5/2 ×2 · 3 · 3   | 2/8 ×8 · 9 · 10      | 5/2 ×2         | 4/5 ×5 · 5 · 6      | 4/5 ×6 · 7 · 8    | 2/12 ×14 · 15 · 16   |
| Necromancer (5c, 10, 1/1)    | 1/6 ×7          | 2/2 ×5 · 7 · 9   | 2/2 ×5 · 6 · 8   | 1/10 ×19 · 22 · 26   | 2/2 ×5         | 1/6 ×13 · 15 · 18   | 1/6 ×18 · 21 · 23 | 1/10 ×∞ · ∞ · ∞      |
| Lich (8c, 10, 3/1)           | 7/0 ×2          | 9/0 ×2 · 2 · 2   | 9/0 ×2 · 2 · 2   | 4/0 ×4 · 5 · 5       | 9/0 ×2         | 7/0 ×3 · 3 · 4      | 7/0 ×4 · 4 · 5    | 5/0 ×7 · 8 · 9       |
| Vampire (9c, 10, 3/1)        | 7/0 ×2          | 9/0 ×2 · 2 · 2   | 9/0 ×2 · 2 · 2   | 4/0 ×4 · 5 · 5       | 9/0 ×2         | 7/0 ×3 · 3 · 4      | 7/0 ×4 · 4 · 5    | 5/0 ×7 · 8 · 9       |
| Abomination (—c, 40, 4/4)    | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 10/3 ×2 · 3 · 3     | 10/3 ×3 · 3 · 3   | 7/9 ×5 · 6 · 6       |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def) | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ---------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Skeleton (2c, 10, 2/2)       | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/10 ×14 · 15 · 16   |
| Ghoul (3c, 10, 2/1)          | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/10 ×14 · 15 · 16   |
| Ghoul (Charge) (3c, 10, 2/1) | 6/4 ×2          | 7/1 ×2 · 2 · 3   | 7/1 ×2 · 2 · 3   | 4/7 ×4 · 5 · 5       | 7/1 ×2         | 6/4 ×3 · 4 · 4      | 6/4 ×4 · 5 · 5    | 5/10 ×7 · 8 · 9      |
| Zombie (3c, 18, 2/2)         | 3/5 ×3          | 4/2 ×3 · 4 · 5   | 4/2 ×3 · 4 · 4   | 2/8 ×8 · 9 · 11      | 4/2 ×3         | 3/5 ×5 · 6 · 7      | 3/5 ×7 · 8 · 9    | 2/12 ×14 · 15 · 16   |
| Necromancer (5c, 10, 1/1)    | 1/6 ×8          | 1/2 ×8 · 11 · 13 | 1/2 ×7 · 9 · 12  | 1/10 ×19 · 23 · 26   | 1/2 ×7         | 1/6 ×15 · 18 · 21   | 1/6 ×21 · 23 · 26 | 1/10 ×∞ · ∞ · ∞      |
| Lich (8c, 10, 3/1)           | 6/0 ×2          | 7/0 ×2 · 2 · 3   | 7/0 ×2 · 2 · 3   | 4/0 ×4 · 5 · 5       | 7/0 ×2         | 6/0 ×3 · 4 · 4      | 6/0 ×4 · 5 · 5    | 5/0 ×7 · 8 · 9       |
| Vampire (9c, 10, 3/1)        | 6/0 ×2          | 7/0 ×2 · 2 · 3   | 7/0 ×2 · 2 · 3   | 4/0 ×4 · 5 · 5       | 7/0 ×2         | 6/0 ×3 · 4 · 4      | 6/0 ×4 · 5 · 5    | 5/0 ×7 · 8 · 9       |
| Abomination (—c, 40, 4/4)    | 9/3 ×2          | 10/1 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 7/6 ×3 · 3 · 4       | 10K/0 ×1       | 9/3 ×2 · 3 · 3      | 9/3 ×3 · 3 · 4    | 7/9 ×5 · 6 · 6       |

##### Martian attackers on Dinosaur units (rays at full power)

**Open ground**

| Attacker (cost, HP, Atk/Def)       | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ---------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Grunt (3c, 8, 2/1.5)               | 5/0 ×2          | 6/0 ×2 · 3 · 3   | 6/0 ×2 · 3 · 3   | 3/0 ×6 · 7 · 8       | 6/0 ×2         | 5/0 ×4 · 5 · 5      | 5/0 ×5 · 6 · 7    | 3/0 ×11 · 12 · 13    |
| Saucer (4c, 8, 1.5/1)              | 3/3 ×3          | 4/0 ×3 · 4 · 5   | 4/0 ×3 · 3 · 4   | 1/7 ×10 · 12 · 14    | 4/0 ×3         | 3/3 ×6 · 7 · 8      | 3/3 ×8 · 9 · 10   | 2/8 ×17 · 18 · 20    |
| Saucer (Strafe) (4c, 8, 1.5/1)     | 6/2 ×2          | 8/0 ×2 · 2 · 3   | 8/0 ×2 · 2 · 3   | 4/5 ×4 · 5 · 6       | 8/0 ×2         | 6/2 ×3 · 4 · 4      | 6/2 ×4 · 5 · 5    | 4/8 ×8 · 9 · 9       |
| Ray Gunner (4c, 8, 3/1)            | 8/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 6/0 ×3 · 4 · 4       | 10K/0 ×1       | 8/0 ×3 · 3 · 3      | 8/0 ×3 · 4 · 4    | 6/0 ×6 · 7 · 7       |
| Shield Projector (4c, 12, 1.5/2.5) | 3/2 ×3          | 4/0 ×3 · 4 · 5   | 4/0 ×3 · 3 · 4   | 1/6 ×10 · 12 · 14    | 4/0 ×3         | 3/2 ×6 · 7 · 8      | 3/2 ×8 · 9 · 10   | 2/10 ×17 · 18 · 20   |
| Brain (5c, 8, 1/1)                 | 2/4 ×5          | 2/0 ×5 · 6 · 7   | 2/0 ×4 · 5 · 7   | 1/8 ×18 · 21 · 25    | 2/0 ×4         | 2/4 ×9 · 11 · 12    | 2/4 ×12 · 14 · 16 | 1/8 ×∞ · ∞ · ∞       |
| Tripod (9c, 12, 4/1)               | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/0 ×2 · 3 · 3       | 10K/0 ×1       | 12/0 ×2 · 2 · 3     | 12/0 ×3 · 3 · 3   | 9/0 ×5 · 5 · 5       |
| Mothership (8c, 16, 2.5/2)         | 6/0 ×2          | 8/0 ×2 · 2 · 3   | 8/0 ×2 · 2 · 3   | 4/3 ×4 · 5 · 6       | 8/0 ×2         | 6/0 ×3 · 4 · 4      | 6/0 ×4 · 5 · 5    | 4/7 ×8 · 9 · 9       |
| Colossus (—c, 32, 4/2.5)           | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 1 · 2 | 9/0 ×2 · 3 · 3       | 10K/0 ×1       | 12/0 ×2 · 2 · 3     | 12/0 ×3 · 3 · 3   | 9/0 ×5 · 5 · 5       |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)       | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ---------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Grunt (3c, 8, 2/1.5)               | 4/0 ×3          | 5/0 ×3 · 3 · 4   | 5/0 ×2 · 3 · 3   | 2/0 ×8 · 9 · 10      | 5/0 ×2         | 4/0 ×5 · 5 · 6      | 4/0 ×6 · 7 · 8    | 2/0 ×14 · 15 · 16    |
| Saucer (4c, 8, 1.5/1)              | 2/3 ×4          | 3/0 ×3 · 4 · 5   | 3/0 ×3 · 4 · 5   | 1/7 ×14 · 16 · 19    | 3/0 ×3         | 2/3 ×7 · 8 · 9      | 2/3 ×9 · 11 · 12  | 1/8 ×22 · 24 · 26    |
| Saucer (Strafe) (4c, 8, 1.5/1)     | 5/2 ×2          | 7/0 ×2 · 3 · 3   | 7/0 ×2 · 2 · 3   | 3/5 ×5 · 6 · 7       | 7/0 ×2         | 5/2 ×4 · 4 · 5      | 5/2 ×5 · 5 · 6    | 3/8 ×10 · 11 · 11    |
| Ray Gunner (4c, 8, 3/1)            | 7/0 ×2          | 9/0 ×2 · 2 · 2   | 9/0 ×2 · 2 · 2   | 4/0 ×4 · 5 · 5       | 9/0 ×2         | 7/0 ×3 · 3 · 4      | 7/0 ×4 · 4 · 5    | 5/0 ×7 · 8 · 9       |
| Shield Projector (4c, 12, 1.5/2.5) | 2/2 ×4          | 3/0 ×3 · 4 · 5   | 3/0 ×3 · 4 · 5   | 1/6 ×14 · 16 · 19    | 3/0 ×3         | 2/2 ×7 · 8 · 9      | 2/2 ×9 · 11 · 12  | 1/10 ×22 · 24 · 26   |
| Brain (5c, 8, 1/1)                 | 1/4 ×7          | 2/0 ×5 · 7 · 9   | 2/0 ×5 · 6 · 8   | 1/8 ×19 · 22 · 26    | 2/0 ×5         | 1/4 ×13 · 15 · 18   | 1/4 ×18 · 21 · 23 | 1/8 ×∞ · ∞ · ∞       |
| Tripod (9c, 12, 4/1)               | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/0 ×3 · 3 · 4       | 10K/0 ×1       | 10/0 ×2 · 3 · 3     | 10/0 ×3 · 3 · 3   | 7/0 ×5 · 6 · 6       |
| Mothership (8c, 16, 2.5/2)         | 5/0 ×2          | 7/0 ×2 · 3 · 3   | 7/0 ×2 · 2 · 3   | 3/3 ×5 · 6 · 7       | 7/0 ×2         | 5/0 ×4 · 4 · 5      | 5/0 ×5 · 5 · 6    | 3/7 ×10 · 11 · 11    |
| Colossus (—c, 32, 4/2.5)           | 10K/0 ×1        | 12K/0 ×1 · 2 · 2 | 10K/0 ×1 · 2 · 2 | 7/0 ×3 · 3 · 4       | 10K/0 ×1       | 10/0 ×2 · 3 · 3     | 10/0 ×3 · 3 · 3   | 7/0 ×5 · 6 · 6       |

**Walled city center (+2 Defense), the attacker without Breach or Wallbreaker**

| Attacker (cost, HP, Atk/Def)       | Caveman 2c 10hp | Raptor 4c 12hp   | Spitter 4c 10hp  | Ankylosaurus 5c 20hp | Shaman 5c 10hp | Triceratops 8c 20hp | T-Rex 14c 28hp    | Brontosaurus —c 45hp |
| ---------------------------------- | --------------- | ---------------- | ---------------- | -------------------- | -------------- | ------------------- | ----------------- | -------------------- |
| Grunt (3c, 8, 2/1.5)               | 3/0 ×3          | 4/0 ×3 · 4 · 5   | 4/0 ×3 · 4 · 4   | 2/0 ×8 · 9 · 11      | 4/0 ×3         | 3/0 ×5 · 6 · 7      | 3/0 ×7 · 8 · 9    | 2/0 ×14 · 15 · 16    |
| Saucer (4c, 8, 1.5/1)              | 2/3 ×4          | 2/0 ×4 · 6 · 7   | 2/0 ×4 · 5 · 6   | 1/7 ×15 · 17 · 20    | 2/0 ×4         | 2/3 ×8 · 9 · 11     | 2/3 ×11 · 12 · 14 | 1/8 ×22 · 24 · 26    |
| Saucer (Strafe) (4c, 8, 1.5/1)     | 4/2 ×2          | 5/0 ×2 · 3 · 4   | 5/0 ×2 · 3 · 3   | 3/5 ×5 · 6 · 7       | 5/0 ×2         | 4/2 ×4 · 5 · 5      | 4/2 ×5 · 6 · 7    | 3/8 ×10 · 11 · 11    |
| Ray Gunner (4c, 8, 3/1)            | 6/0 ×2          | 7/0 ×2 · 2 · 3   | 7/0 ×2 · 2 · 3   | 4/0 ×4 · 5 · 5       | 7/0 ×2         | 6/0 ×3 · 4 · 4      | 6/0 ×4 · 5 · 5    | 5/0 ×7 · 8 · 9       |
| Shield Projector (4c, 12, 1.5/2.5) | 2/2 ×4          | 2/0 ×4 · 6 · 7   | 2/0 ×4 · 5 · 6   | 1/6 ×15 · 17 · 20    | 2/0 ×4         | 2/2 ×8 · 9 · 11     | 2/2 ×11 · 12 · 14 | 1/10 ×22 · 24 · 26   |
| Brain (5c, 8, 1/1)                 | 1/4 ×8          | 1/0 ×8 · 11 · 13 | 1/0 ×7 · 9 · 12  | 1/8 ×19 · 23 · 26    | 1/0 ×7         | 1/4 ×15 · 18 · 21   | 1/4 ×21 · 23 · 26 | 1/8 ×∞ · ∞ · ∞       |
| Tripod (9c, 12, 4/1)               | 9/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 7/0 ×3 · 3 · 4       | 10K/0 ×1       | 9/0 ×2 · 3 · 3      | 9/0 ×3 · 3 · 4    | 7/0 ×5 · 6 · 6       |
| Mothership (8c, 16, 2.5/2)         | 4/0 ×2          | 5/0 ×2 · 3 · 4   | 5/0 ×2 · 3 · 3   | 3/3 ×5 · 6 · 7       | 5/0 ×2         | 4/0 ×4 · 5 · 5      | 4/0 ×5 · 6 · 7    | 3/7 ×10 · 11 · 11    |
| Colossus (—c, 32, 4/2.5)           | 9/0 ×2          | 10/0 ×2 · 2 · 2  | 10K/0 ×1 · 2 · 2 | 7/0 ×3 · 3 · 4       | 10K/0 ×1       | 9/0 ×2 · 3 · 3      | 9/0 ×3 · 3 · 4    | 7/0 ×5 · 6 · 6       |

#### Attacks on an Egg

An Egg has Defense 1 whatever its tile and never strikes back. Each cell: the damage of one attack on a 6-HP Egg / on a 10-HP Egg laid with Nesting; `K` is a kill.

| Attacker                 | Egg 6 HP | Egg 10 HP (Nesting) |
| ------------------------ | -------- | ------------------- |
| Human Fighter            | 6K       | 6                   |
| Human Guard              | 4        | 4                   |
| Human Raider             | 6K       | 6                   |
| Human Marksman           | 6K       | 6                   |
| Human Captain            | 2        | 2                   |
| Human Swordsman          | 6K       | 10K                 |
| Human Catapult           | 6K       | 10K                 |
| Human Knight             | 6K       | 10K                 |
| Human Juggernaut         | 6K       | 10K                 |
| Goblin Goblin            | 4        | 4                   |
| Goblin Wolf Rider        | 6K       | 6                   |
| Goblin Bomb Chucker      | 6K       | 6                   |
| Goblin Orc Brute         | 6K       | 6                   |
| Goblin Orc Warboss       | 6K       | 6                   |
| Goblin Rocket Cart       | 6K       | 10K                 |
| Goblin Scrap Buggy       | 6K       | 10K                 |
| Goblin Troll             | 6K       | 10K                 |
| Undead Skeleton          | 6K       | 6                   |
| Undead Ghoul             | 6K       | 6                   |
| Undead Zombie            | 6K       | 6                   |
| Undead Necromancer       | 2        | 2                   |
| Undead Lich              | 6K       | 10K                 |
| Undead Vampire           | 6K       | 10K                 |
| Undead Abomination       | 6K       | 10K                 |
| Martian Grunt            | 6K       | 6                   |
| Martian Saucer           | 4        | 4                   |
| Martian Ray Gunner       | 6K       | 10K                 |
| Martian Shield Projector | 4        | 4                   |
| Martian Brain            | 2        | 2                   |
| Martian Tripod           | 6K       | 10K                 |
| Martian Mothership       | 6K       | 8                   |
| Martian Colossus         | 6K       | 10K                 |

#### Dinosaurs against fortification

A full-HP target on a Field Defense or a walled city center; the damage of one attack without / with Wallbreaker (the Dinosaur Explosives: Breach removes Walls and Field Defense from every attack made from the next tile, and the second tile of a Triceratops's run-up counts). A Spitter's Acid and a Triceratops's Charge! ignore both without it.

| Attacker               | Ground        | Fighter 12hp | Guard 17hp | Swordsman 15hp | Marksman 12hp | Zombie 18hp | Orc Brute 15hp |
| ---------------------- | ------------- | ------------ | ---------- | -------------- | ------------- | ----------- | -------------- |
| Caveman                | Field Defense | 3 / 5        | 3 / 4      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Caveman                | walled center | 3 / 5        | 3 / 4      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Caveman (Pack Hunt)    | Field Defense | 6 / 8        | 5 / 7      | 5 / 7          | 7 / 10        | 6 / 8       | 5 / 7          |
| Caveman (Pack Hunt)    | walled center | 6 / 8        | 5 / 7      | 5 / 7          | 7 / 10        | 6 / 8       | 5 / 7          |
| Raptor                 | Field Defense | 4 / 6        | 4 / 5      | 4 / 6          | 5 / 8         | 4 / 6       | 4 / 6          |
| Raptor                 | walled center | 4 / 6        | 4 / 5      | 4 / 6          | 5 / 8         | 4 / 6       | 4 / 6          |
| Raptor (Pounce)        | Field Defense | 7 / 10       | 6 / 8      | 7 / 9          | 8 / 12K       | 7 / 10      | 7 / 9          |
| Raptor (Pounce)        | walled center | 7 / 10       | 6 / 8      | 7 / 9          | 8 / 12K       | 7 / 10      | 7 / 9          |
| Spitter                | Field Defense | 5 / 5        | 6 / 6      | 4 / 4          | 6 / 6         | 5 / 5       | 4 / 4          |
| Spitter                | walled center | 5 / 5        | 6 / 6      | 4 / 4          | 6 / 6         | 5 / 5       | 4 / 4          |
| Ankylosaurus           | Field Defense | 3 / 5        | 3 / 4      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Ankylosaurus           | walled center | 3 / 5        | 3 / 4      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Triceratops            | Field Defense | 8 / 8        | 7 / 7      | 7 / 7          | 10 / 10       | 8 / 8       | 7 / 7          |
| Triceratops            | walled center | 8 / 8        | 7 / 7      | 7 / 7          | 10 / 10       | 8 / 8       | 7 / 7          |
| Triceratops (run-up 1) | Field Defense | 12K / 12K    | 10 / 14    | 11 / 15K       | 12K / 12K     | 12 / 16     | 11 / 15K       |
| Triceratops (run-up 1) | walled center | 12K / 12K    | 10 / 14    | 11 / 15K       | 12K / 12K     | 12 / 16     | 11 / 15K       |
| T-Rex                  | Field Defense | 9 / 12K      | 8 / 10     | 8 / 11         | 10 / 12K      | 9 / 12      | 8 / 11         |
| T-Rex                  | walled center | 9 / 12K      | 8 / 10     | 8 / 11         | 10 / 12K      | 9 / 12      | 8 / 11         |
| Brontosaurus           | Field Defense | 7 / 10       | 6 / 8      | 7 / 9          | 8 / 12K       | 7 / 10      | 7 / 9          |
| Brontosaurus           | walled center | 7 / 10       | 6 / 8      | 7 / 9          | 8 / 12K       | 7 / 10      | 7 / 9          |

#### Scenarios

##### A Knight rides into a line of five

- **A young line: Caveman, Raptor, Caveman, Spitter, Caveman**
  - Knight moves 2 tiles: done
  - Knight (13/13) attacks Caveman (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Raptor (12/12): deals 12 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Caveman (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Spitter (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Caveman (10/10): deals 10 (kills), takes 0, advances
  - Humans end the turn: done
  - Left: Dinosaurs nothing; Humans Knight 13/13.
- **The same line with an Ankylosaurus in the middle**
  - Knight moves 2 tiles: done
  - Knight (13/13) attacks Caveman (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Raptor (12/12): deals 12 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Ankylosaurus (20/20): deals 9, takes 6, Armoured
  - Knight (7/13) attacks Spitter (10/10): refused (UNIT_ALREADY_ACTED)
  - Knight (7/13) attacks Caveman (10/10): refused (UNIT_ALREADY_ACTED)
  - Humans end the turn: done
  - _The Dinosaurs answer_
  - Ankylosaurus (11/20) attacks Knight (7/13): deals 6, takes 1
  - Spitter (10/10) attacks Knight (1/13): deals 1 (kills), takes 0, Acid; the Spitter grows to Big: 14/14
  - Left: Dinosaurs Ankylosaurus 10/20, Big Spitter 14/14, Caveman 10/10; Humans nothing.
- **The same line grown: a Big Raptor, an Ankylosaurus, a Big Spitter**
  - Knight moves 2 tiles: done
  - Knight (13/13) attacks Caveman (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Big Raptor (16/16): deals 14, takes 1
  - Knight (12/13) attacks Ankylosaurus (20/20): refused (UNIT_ALREADY_ACTED)
  - Knight (12/13) attacks Big Spitter (14/14): refused (UNIT_ALREADY_ACTED)
  - Knight (12/13) attacks Caveman (10/10): refused (UNIT_ALREADY_ACTED)
  - Humans end the turn: done
  - _The Dinosaurs answer_
  - Big Raptor (2/16) attacks Knight (12/13): deals 3, takes 2 (dies)
  - Caveman moves 1 tile: done
  - Big Spitter moves 1 tile: done
  - Left: Dinosaurs Ankylosaurus 20/20, Big Spitter 14/14, Caveman 10/10; Humans Knight 9/13.

##### A Knight at a nest

- **Three Eggs (Triceratops, T-Rex, Ankylosaurus: 27 Coins) north of a capital with a Caveman on it**
  - Knight moves 2 tiles: done
  - Knight (13/13) attacks Triceratops Egg (6/6): deals 6 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks T-Rex Egg (6/6): deals 6 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Ankylosaurus Egg (6/6): deals 6 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Caveman (10/10): deals 10 (kills), takes 0, advances
  - Left: Humans Knight 13/13; Dinosaurs nothing.
- **The same Eggs laid with Nesting (10 HP), an Ankylosaurus on the capital**
  - Knight moves 2 tiles: done
  - Knight (13/13) attacks Triceratops Egg (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks T-Rex Egg (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Ankylosaurus Egg (10/10): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13/13) attacks Ankylosaurus (20/20): deals 9, takes 6, Armoured
  - Left: Humans Knight 7/13; Dinosaurs Ankylosaurus 11/20.

##### An Egg laid and hatched under pressure

- **A Triceratops Egg laid without Nesting (6 HP, two turns) with a Human Raider five tiles from the nest; nothing guards it**
  - Dinosaurs lay a Triceratops Egg: 8 Coins, 6 HP, hatches in 2 turns
  - Dinosaurs end the turn: done
  - Raider moves 2 tiles: done
  - Humans end the turn: done
  - _The Egg needs one more turn_
  - Dinosaurs end the turn: done
  - Raider moves 1 tile: done
  - Raider (12/12) attacks Triceratops Egg (6/6): deals 6 (kills), takes 0, advances
  - Left: Dinosaurs Caveman 10/10 (14 Coins); Humans Raider 12/12 (24 Coins).
- **The same Egg laid with Nesting (10 HP, still two turns since the correction): the Raider's hit leaves it at 4 and it hatches**
  - Dinosaurs lay a Triceratops Egg: 8 Coins, 10 HP, hatches in 2 turns
  - Dinosaurs end the turn: done
  - Raider moves 2 tiles: done
  - Humans end the turn: done
  - _The Egg needs one more turn_
  - Dinosaurs end the turn: done
  - Raider moves 1 tile: done
  - Raider (12/12) attacks Triceratops Egg (10/10): deals 6, takes 0
  - Humans end the turn: the Triceratops Egg hatches
  - _The Triceratops has hatched beside the Raider_
  - Triceratops (20/20) attacks Raider (12/12): deals 10, takes 1
  - Left: Dinosaurs Caveman 10/10, Triceratops 19/20 (16 Coins); Humans Raider 2/12 (24 Coins).
- **An Ankylosaurus Egg (two turns) without Nesting and a Shaman beside the nest: hatched in the Dinosaurs' second turn, before the Raider arrives**
  - Dinosaurs lay a Ankylosaurus Egg: 5 Coins, 6 HP, hatches in 2 turns
  - Dinosaurs end the turn: done
  - Raider moves 2 tiles: done
  - Humans end the turn: done
  - Shaman hatches the Ankylosaurus Egg: the Ankylosaurus Egg hatches (it cannot act this turn)
  - Dinosaurs end the turn: done
  - Raider moves 1 tile: done
  - Raider (12/12) attacks Ankylosaurus (20/20): deals 3, takes 8, Armoured
  - Left: Dinosaurs Shaman 10/10, Ankylosaurus 17/20 (17 Coins); Humans Raider 4/12 (24 Coins).
- **A T-Rex Egg (14 Coins, four turns with or without Nesting; here 6 HP) and a Shaman: laid in turn 1, hatched in turn 2, the T-Rex acts in turn 3**
  - Dinosaurs lay a T-Rex Egg: 14 Coins, 6 HP, hatches in 4 turns
  - Shaman hatches the T-Rex Egg: refused (HATCH_NOT_LEGAL LAID_THIS_TURN)
  - Dinosaurs end the turn: done
  - Fighter moves 1 tile: done
  - Humans end the turn: done
  - Shaman moves 1 tile: done
  - Shaman hatches the T-Rex Egg: the T-Rex Egg hatches (it cannot act this turn)
  - T-Rex (28/28) attacks Fighter (12/12): refused (UNIT_ALREADY_ACTED)
  - Dinosaurs end the turn: done
  - Fighter moves 1 tile: done
  - Fighter (12/12) attacks T-Rex (28/28): deals 5, takes 5
  - Humans end the turn: done
  - T-Rex (23/28) attacks Fighter (7/12): deals 7 (kills), takes 0, advances; the T-Rex grows to Big: 32/32
  - Left: Dinosaurs Shaman 10/10, Big T-Rex 32/32 (10 Coins); Humans nothing (24 Coins).

##### Growing in the middle of a fight

- **A T-Rex at 10 of 28 HP beside a full-HP Fighter: wounded, it kills nothing**
  - T-Rex (10/28) attacks Fighter (12/12): deals 8, takes 5
  - Left: Dinosaurs T-Rex 5/28; Humans Fighter 4/12.
- **The same T-Rex beside a Fighter at 5 HP, then a Marksman, a Raider, and a Guard in a row: the first kill heals it**
  - T-Rex (10/28) attacks Fighter (5/12): deals 5 (kills), takes 0, advances, attacks again; the T-Rex grows to Big: 32/32
  - Big T-Rex (32/32) attacks Marksman (12/12): deals 12 (kills), takes 0, advances, attacks again
  - Big T-Rex (32/32) attacks Raider (12/12): deals 12 (kills), takes 0, advances, attacks again; the T-Rex grows to Alpha: 36/36
  - Alpha T-Rex (36/36) attacks Guard (17/17): deals 14, takes 5
  - Dinosaurs end the turn: done
  - _The Guard strikes back at the Alpha T-Rex_
  - Guard (3/17) attacks Alpha T-Rex (31/36): deals 1, takes 3 (dies)
  - Left: Dinosaurs Alpha T-Rex 30/36; Humans nothing.
- **A Triceratops charges a Fighter (one tile of run-up), grows, and takes the answer of two Swordsmen**
  - Triceratops moves 1 tile: done
  - Triceratops (20/20) attacks Fighter (12/12): deals 12 (kills), takes 0, run-up +1, advances; the Triceratops grows to Big: 24/24
  - Dinosaurs end the turn: done
  - Swordsman (15/15) attacks Big Triceratops (24/24): deals 10, takes 3
  - Swordsman (15/15) attacks Big Triceratops (14/24): deals 12, takes 2
  - Left: Dinosaurs Big Triceratops 2/24; Humans Swordsman 12/15, Swordsman 13/15.

##### The Triceratops before and after Wallbreaker

Both sides walk at each other and attack what they reach, the dearest kill first. The Dinosaurs move first from three tiles, so every Triceratops charges after two tiles.

- **3 Triceratops (24 Coins) against 5 Swordsmen (25), without Wallbreaker (run-up +1)**
  - Start: Dinosaurs Triceratops ×3 (20, 20, 20); Humans Swordsman ×5 (15, 15, 15, 15, 15).
  - Dinosaurs, turn 1: 3 attacks, 33 HP damage, 0 kills, 3 moves. Dinosaurs: Triceratops ×3 (16, 16, 16). Humans: Swordsman ×5 (4, 4, 4, 15, 15).
  - Humans, turn 1: 2 attacks, 16 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×2 (16, 16). Humans: Swordsman ×5 (4, 4, 4, 12, 15).
  - Dinosaurs, turn 2: 2 attacks, 12 HP damage, 2 kills. Dinosaurs: Triceratops ×2 (24, 24). Humans: Swordsman ×3 (6, 12, 15).
  - Humans, turn 2: 2 attacks, 17 HP damage, 0 kills. Dinosaurs: Triceratops ×2 (24, 7). Humans: Swordsman ×3 (1, 12, 12).
  - Dinosaurs, turn 3: 1 attacks, 1 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×2 (24, 7). Humans: Swordsman ×2 (14, 12).
  - Humans, turn 3: 2 attacks, 19 HP damage, 1 kills. Dinosaurs: Triceratops ×1 (14). Humans: Swordsman ×2 (11, 12).
  - Dinosaurs, turn 4: 1 attacks, 7 HP damage, 0 kills. Dinosaurs: Triceratops ×1 (8). Humans: Swordsman ×2 (4, 12).
  - Humans, turn 4: 1 attacks, 8 HP damage, 1 kills. Dinosaurs: nothing. Humans: Swordsman ×2 (4, 12).
- **The same with Wallbreaker (run-up +2): the rule before this pass**
  - Start: Dinosaurs Triceratops ×3 (20, 20, 20); Humans Swordsman ×5 (15, 15, 15, 15, 15).
  - Dinosaurs, turn 1: 3 attacks, 45 HP damage, 3 kills, 3 moves. Dinosaurs: Triceratops ×3 (24, 24, 24). Humans: Swordsman ×2 (15, 15).
  - Humans, turn 1: 2 attacks, 22 HP damage, 0 kills, 1 moves. Dinosaurs: Triceratops ×3 (24, 24, 2). Humans: Swordsman ×2 (12, 13).
  - Dinosaurs, turn 2: 2 attacks, 25 HP damage, 2 kills, 2 moves. Dinosaurs: Triceratops ×3 (24, 24, 2). Humans: nothing.
- **Triceratops, Ankylosaurus, 2 Spitters, Raptor (25 Coins) against the 5 Swordsmen, without Wallbreaker**
  - Start: Dinosaurs Triceratops ×1 (20), Ankylosaurus ×1 (20), Spitter ×2 (10, 10), Raptor ×1 (12); Humans Swordsman ×5 (15, 15, 15, 15, 15).
  - Dinosaurs, turn 1: 2 attacks, 20 HP damage, 0 kills, 5 moves. Dinosaurs: Triceratops ×1 (16), Ankylosaurus ×1 (20), Spitter ×2 (10, 10), Raptor ×1 (7). Humans: Swordsman ×5 (4, 6, 15, 15, 15).
  - Humans, turn 1: 2 attacks, 18 HP damage, 1 kills, 2 moves. Dinosaurs: Triceratops ×1 (5), Ankylosaurus ×1 (20), Spitter ×2 (10, 10). Humans: Swordsman ×5 (4, 6, 12, 15, 15).
  - Dinosaurs, turn 2: 4 attacks, 21 HP damage, 2 kills. Dinosaurs: Triceratops ×1 (24), Ankylosaurus ×1 (24), Spitter ×2 (10, 10). Humans: Swordsman ×3 (12, 15, 6).
  - Humans, turn 2: 2 attacks, 16 HP damage, 0 kills. Dinosaurs: Triceratops ×1 (15), Ankylosaurus ×1 (17), Spitter ×2 (10, 10). Humans: Swordsman ×3 (8, 9, 6).
  - Dinosaurs, turn 3: 4 attacks, 21 HP damage, 2 kills, 1 moves. Dinosaurs: Triceratops ×1 (15), Ankylosaurus ×1 (13), Spitter ×2 (14, 10). Humans: Swordsman ×1 (4).
  - Humans, turn 3: 0 attacks, 0 HP damage, 0 kills. Dinosaurs: Triceratops ×1 (15), Ankylosaurus ×1 (13), Spitter ×2 (14, 10). Humans: Swordsman ×1 (4).
  - Dinosaurs, turn 4: 1 attacks, 6 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×1 (28), Ankylosaurus ×1 (13), Spitter ×2 (14, 10). Humans: nothing.
- **12 Cavemen (24 Coins) against the 5 Swordsmen: no dinosaur, no Pack Hunt**
  - Start: Dinosaurs Caveman ×12 (10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10); Humans Swordsman ×5 (15, 15, 15, 15, 15).
  - Dinosaurs, turn 1: 0 attacks, 0 HP damage, 0 kills, 8 moves. Dinosaurs: Caveman ×12 (10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10). Humans: Swordsman ×5 (15, 15, 15, 15, 15).
  - Humans, turn 1: 5 attacks, 50 HP damage, 5 kills, 5 moves. Dinosaurs: Caveman ×7 (10, 10, 10, 10, 10, 10, 10). Humans: Swordsman ×5 (15, 15, 15, 15, 15).
  - Dinosaurs, turn 2: 5 attacks, 24 HP damage, 1 kills, 1 moves. Dinosaurs: Caveman ×7 (4, 4, 5, 10, 5, 10, 10). Humans: Swordsman ×4 (15, 15, 6, 15).
  - Humans, turn 2: 4 attacks, 29 HP damage, 4 kills, 1 moves. Dinosaurs: Caveman ×3 (4, 5, 10). Humans: Swordsman ×4 (15, 15, 6, 15).
  - Dinosaurs, turn 3: 1 attacks, 6 HP damage, 1 kills. Dinosaurs: Caveman ×3 (4, 5, 10). Humans: Swordsman ×3 (15, 15, 15).
  - Humans, turn 3: 3 attacks, 23 HP damage, 3 kills. Dinosaurs: nothing. Humans: Swordsman ×3 (15, 15, 15).
- **3 Triceratops (24 Coins) against 2 Swordsmen, 2 Marksmen, and a Catapult (26), without Wallbreaker; the Humans four tiles away move second and so strike first**
  - Start: Dinosaurs Triceratops ×3 (20, 20, 20); Humans Swordsman ×2 (15, 15), Marksman ×2 (12, 12), Catapult ×1 (10).
  - Dinosaurs, turn 1: 0 attacks, 0 HP damage, 0 kills, 3 moves. Dinosaurs: Triceratops ×3 (20, 20, 20). Humans: Swordsman ×2 (15, 15), Marksman ×2 (12, 12), Catapult ×1 (10).
  - Humans, turn 1: 5 attacks, 39 HP damage, 1 kills, 4 moves. Dinosaurs: Triceratops ×2 (6, 15). Humans: Swordsman ×2 (12, 15), Marksman ×2 (12, 12), Catapult ×1 (10).
  - Dinosaurs, turn 2: 1 attacks, 7 HP damage, 0 kills. Dinosaurs: Triceratops ×2 (6, 10). Humans: Swordsman ×2 (5, 15), Marksman ×2 (12, 12), Catapult ×1 (10).
  - Humans, turn 2: 2 attacks, 18 HP damage, 2 kills. Dinosaurs: nothing. Humans: Swordsman ×2 (5, 15), Marksman ×2 (12, 12), Catapult ×1 (10).
- **T-Rex, Triceratops, Caveman (24 Coins) against 3 Fighters, 2 Marksmen, a Guard, and a Catapult (25): a line the T-Rex can Rampage through**
  - Start: Dinosaurs T-Rex ×1 (28), Triceratops ×1 (20), Caveman ×1 (10); Humans Fighter ×3 (12, 12, 12), Guard ×1 (17), Marksman ×2 (12, 12), Catapult ×1 (10).
  - Dinosaurs, turn 1: 2 attacks, 24 HP damage, 2 kills, 3 moves. Dinosaurs: T-Rex ×1 (32), Triceratops ×1 (24), Caveman ×1 (10). Humans: Fighter ×1 (12), Guard ×1 (17), Marksman ×2 (12, 12), Catapult ×1 (10).
  - Humans, turn 1: 5 attacks, 27 HP damage, 0 kills, 1 moves. Dinosaurs: T-Rex ×1 (15), Triceratops ×1 (14), Caveman ×1 (10). Humans: Fighter ×1 (7), Guard ×1 (12), Marksman ×2 (8, 8), Catapult ×1 (10).
  - Dinosaurs, turn 2: 3 attacks, 25 HP damage, 3 kills, 1 moves. Dinosaurs: T-Rex ×1 (15), Triceratops ×1 (14), Caveman ×1 (10). Humans: Guard ×1 (12), Marksman ×1 (8).
  - Humans, turn 2: 2 attacks, 10 HP damage, 0 kills. Dinosaurs: T-Rex ×1 (5), Triceratops ×1 (14), Caveman ×1 (10). Humans: Guard ×1 (8), Marksman ×1 (8).
  - Dinosaurs, turn 3: 2 attacks, 16 HP damage, 2 kills, 1 moves. Dinosaurs: T-Rex ×1 (5), Triceratops ×1 (28), Caveman ×1 (10). Humans: nothing.

##### Pack Hunt

- **A Triceratops charges a Swordsman after one tile; a Caveman beside it finishes the Swordsman**
  - Triceratops moves 1 tile: done
  - Triceratops (20/20) attacks Swordsman (15/15): deals 11, takes 4, run-up +1, advances; Swordsman is pushed back
  - Caveman moves 1 tile: done
  - Caveman (10/10) attacks Swordsman (4/15): deals 4 (kills), takes 0, advances
  - Left: Dinosaurs Triceratops 16/20, Caveman 10/10; Humans nothing.
- **A Spitter spits at a Swordsman from two tiles; the Caveman on its far side has Pack Hunt against the hunted unit (the correction)**
  - Spitter (10/10) attacks Swordsman (15/15): deals 4, takes 0, Acid
  - Caveman (10/10) attacks Swordsman (11/15): deals 8, takes 4
  - Left: Dinosaurs Spitter 10/10, Caveman 6/10; Humans Swordsman 3/15.
- **The same Caveman on a Swordsman with no dinosaur near: no bonus**
  - Caveman (10/10) attacks Swordsman (15/15): deals 4, takes 6
  - Left: Dinosaurs Caveman 4/10; Humans Swordsman 11/15.
- **War Drums and Pack Hunt: two Cavemen beside a Raptor kill a Fighter between them (a Triceratops and a Shaman take no War Drums)**
  - Shaman calls War Drums: 2 units inspired
  - Caveman (10/10) attacks Fighter (12/12): deals 12 (kills), takes 0, inspired, advances
  - Caveman: its target is gone
  - Left: Dinosaurs Shaman 10/10, Caveman 10/10, Caveman 10/10, Raptor 12/12; Humans nothing.

##### Tend Wounded

- **A Shaman tends a Triceratops at 8 HP and a Caveman at 4 HP beside it: 4 to the dinosaur, 2 to the Caveman (the correction)**
  - Shaman tends the wounded: 2 tended
  - Left: Dinosaurs Shaman 10/10, Triceratops 12/20, Caveman 6/10; Humans Fighter 12/12.

##### Zombies and large dinosaurs

- **A T-Rex attacks a Zombie in a row of three; the Zombies answer; a Shaman tends**
  - T-Rex (28/28) attacks Zombie (18/18): deals 12, takes 3, is bitten
  - Dinosaurs end the turn: done
  - Zombie (6/18) attacks T-Rex (25/28): deals 2, takes 6 (dies), bites; the T-Rex grows to Big: 32/32
  - Zombie (18/18) attacks Big T-Rex (32/32): deals 5, takes 5, bites
  - Zombie (18/18) attacks Big T-Rex (27/32): deals 5, takes 4, bites
  - Undead end the turn: done
  - Shaman tends the wounded: 1 tended
  - Big T-Rex: its target is gone
  - Big T-Rex (26/32) attacks Zombie (13/18): deals 12, takes 3, is bitten
  - Left: Dinosaurs Big T-Rex 23/32, Shaman 10/10; Undead Zombie 1/18, Zombie 14/18.
- **A Bitten Triceratops at 6 HP is killed by a Skeleton: it rises as a Zombie, which fills one slot, not two**
  - Skeleton (10/10) attacks Triceratops (6/20): deals 6 (kills), takes 0; Triceratops rises as a Zombie of the Undead (it was Bitten)
  - Left: Undead Zombie 18/18, Skeleton 10/10, Zombie 10/18; Dinosaurs nothing.
- **3 Triceratops (24 Coins) against 8 Zombies (24), without Wallbreaker; the Dinosaurs move first**
  - Start: Dinosaurs Triceratops ×3 (20, 20, 20); Undead Zombie ×8 (18, 18, 18, 18, 18, 18, 18, 18).
  - Dinosaurs, turn 1: 3 attacks, 36 HP damage, 0 kills, 3 moves. Dinosaurs: Triceratops ×3 (17, 17, 17). Undead: Zombie ×8 (6, 6, 6, 18, 18, 18, 18, 18).
  - Undead, turn 1: 2 attacks, 11 HP damage, 0 kills, 2 bites, 3 moves. Dinosaurs: Triceratops ×3 (17, 17, 6). Undead: Zombie ×8 (6, 6, 6, 14, 15, 18, 18, 18).
  - Dinosaurs, turn 2: 3 attacks, 18 HP damage, 3 kills. Dinosaurs: Triceratops ×3 (24, 24, 24). Undead: Zombie ×5 (14, 15, 18, 18, 18).
  - Undead, turn 2: 2 attacks, 9 HP damage, 0 kills, 2 bites, 3 moves. Dinosaurs: Triceratops ×3 (24, 24, 15). Undead: Zombie ×5 (9, 15, 18, 18, 14).
  - Dinosaurs, turn 3: 3 attacks, 23 HP damage, 2 kills, 1 moves. Dinosaurs: Triceratops ×3 (21, 24, 15). Undead: Zombie ×3 (15, 18, 18).
  - Undead, turn 3: 3 attacks, 15 HP damage, 1 kills, 2 bites, 1 risen. Dinosaurs: Triceratops ×2 (21, 24). Undead: Zombie ×4 (11, 15, 18, 10).
  - Dinosaurs, turn 4: 2 attacks, 21 HP damage, 2 kills, 1 moves. Dinosaurs: Triceratops ×2 (21, 28). Undead: Zombie ×2 (15, 18).
  - Undead, turn 4: 2 attacks, 9 HP damage, 0 kills, 2 bites. Dinosaurs: Triceratops ×2 (16, 24). Undead: Zombie ×2 (10, 14).

##### Martian pulls and Mind Control

- **A Brain tries a T-Rex at 5 HP, a Triceratops at 5 HP, and an Ankylosaurus at 6 HP; a Saucer tries to pull a T-Rex and pulls a Raptor**
  - Brain takes control of T-Rex (5/28): refused (MIND_CONTROL_NOT_LEGAL TARGET_IMMUNE)
  - Brain takes control of Triceratops (5/20): refused (MIND_CONTROL_NOT_LEGAL TARGET_IMMUNE)
  - Brain takes control of Ankylosaurus (6/20): it is theirs
  - Saucer pulls T-Rex (28/28): refused (TRACTOR_BEAM_NOT_LEGAL TARGET_IMMUNE)
  - Saucer moves 1 tile: done
  - Saucer pulls Raptor (12/12): pulled 1 tile
  - Left: Martians Brain 8/8, Saucer 8/8, Ankylosaurus 6/20; Dinosaurs T-Rex 5/28, Triceratops 5/20, T-Rex 28/28, Raptor 12/12.
- **3 Triceratops (24 Coins) against 5 Grunts and a Shield Projector with Force Fields (19), without Wallbreaker; the Dinosaurs move first from four tiles, the Martians shoot and step back**
  - Start: Dinosaurs Triceratops ×3 (20, 20, 20); Martians Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2), Shield Projector ×1 (12+3).
  - Dinosaurs, turn 1: 0 attacks, 0 HP damage, 0 kills, 3 moves. Dinosaurs: Triceratops ×3 (20, 20, 20). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2), Shield Projector ×1 (12+3).
  - Martians, turn 1: 4 attacks, 20 HP damage, 0 kills. Dinosaurs: Triceratops ×3 (10, 15, 15). Martians: Grunt ×5 (8+2, 8+4, 8+4, 8+2, 8+4), Shield Projector ×1 (12+3).
  - Dinosaurs, turn 2: 3 attacks, 23 HP damage, 2 kills, 3 moves. Dinosaurs: Triceratops ×3 (24, 13, 24). Martians: Grunt ×3 (1, 8+4, 8+4), Shield Projector ×1 (12+3).
  - Martians, turn 2: 3 attacks, 11 HP damage, 0 kills, 4 moves. Dinosaurs: Triceratops ×3 (13, 13, 24). Martians: Grunt ×3 (1+4, 8+4, 8+4), Shield Projector ×1 (12+3).
  - Dinosaurs, turn 3: 3 attacks, 18 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×3 (13, 10, 19). Martians: Grunt ×2 (1+2, 2), Shield Projector ×1 (8).
  - Martians, turn 3: 2 attacks, 5 HP damage, 0 kills, 3 moves. Dinosaurs: Triceratops ×3 (11, 7, 19). Martians: Grunt ×2 (1+2, 2+2), Shield Projector ×1 (8+3).
  - Dinosaurs, turn 4: 3 attacks, 8 HP damage, 2 kills, 2 moves. Dinosaurs: Triceratops ×3 (28, 24, 14). Martians: Shield Projector ×1 (3).
  - Martians, turn 4: 0 attacks, 0 HP damage, 0 kills. Dinosaurs: Triceratops ×3 (28, 24, 14). Martians: Shield Projector ×1 (3+3).

##### Goblin bombs and rockets on a nest

- **A Bomb Chucker bombs the middle Egg of three (no Gang Up on a bomb); a Rocket Cart shoots the T-Rex Egg; a Goblin Kabooms beside two Eggs**
  - Bomb Chucker (8/8) attacks Ankylosaurus Egg (6/6): deals 6 (kills), takes 0; also hits 3 on own Goblin, 3 on T-Rex Egg, 3 on Triceratops Egg, 2 on Ankylosaurus; Plunder +2
  - Rocket Cart (8/8) attacks T-Rex Egg (3/6): deals 3 (kills), takes 0; Plunder +2
  - Goblin (3/6) Kabooms: own Goblin explodes for 5: 5 on own Bomb Chucker, 3 on Triceratops Egg (kills); Plunder +2
  - Left: Goblins Bomb Chucker 3/8, Rocket Cart 8/8; Dinosaurs Ankylosaurus 18/20.
- **2 Triceratops and an Ankylosaurus (21 Coins) against 3 Orc Brutes, 3 Bomb Chuckers, and a Rocket Cart (25), without Wallbreaker; the Dinosaurs move first**
  - Start: Dinosaurs Triceratops ×2 (20, 20), Ankylosaurus ×1 (20); Goblins Orc Brute ×3 (15, 15, 15), Bomb Chucker ×3 (8, 8, 8), Rocket Cart ×1 (8).
  - Dinosaurs, turn 1: 2 attacks, 22 HP damage, 0 kills, 3 moves. Dinosaurs: Triceratops ×2 (16, 16), Ankylosaurus ×1 (20). Goblins: Orc Brute ×3 (4, 4, 15), Bomb Chucker ×3 (8, 8, 8), Rocket Cart ×1 (8).
  - Goblins, turn 1: 4 attacks, 33 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×1 (5), Ankylosaurus ×1 (14). Goblins: Orc Brute ×3 (4, 4, 15), Bomb Chucker ×3 (8, 8, 8), Rocket Cart ×1 (8).
  - Dinosaurs, turn 2: 1 attacks, 6 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×1 (24), Ankylosaurus ×1 (14). Goblins: Orc Brute ×2 (6, 15), Bomb Chucker ×3 (8, 8, 8), Rocket Cart ×1 (8).
  - Goblins, turn 2: 4 attacks, 28 HP damage, 1 kills, 1 moves. Dinosaurs: Triceratops ×1 (10). Goblins: Orc Brute ×2 (6, 9), Bomb Chucker ×3 (8, 8, 8), Rocket Cart ×1 (8).
  - Dinosaurs, turn 3: 1 attacks, 8 HP damage, 1 kills. Dinosaurs: Triceratops ×1 (8). Goblins: Orc Brute ×2 (8, 9), Bomb Chucker ×2 (8, 8), Rocket Cart ×1 (8).
  - Goblins, turn 3: 2 attacks, 8 HP damage, 1 kills, 3 moves. Dinosaurs: nothing. Goblins: Orc Brute ×2 (8, 9), Bomb Chucker ×2 (8, 8), Rocket Cart ×1 (8).

##### A Catapult at a nesting city

- **A Catapult three tiles from a Triceratops Egg, a Guard in front of it; the Dinosaurs have a Raptor (Pounce) and a Spitter**
  - Catapult (10/10) attacks Triceratops Egg (6/6): deals 6 (kills), takes 0
  - Humans end the turn: done
  - _The Dinosaurs answer: the Raptor goes round the Guard_
  - Raptor moves 2 tiles: done
  - Raptor (12/12) attacks Catapult (10/10): deals 10 (kills), takes 0, Pounce or Charge, advances; the Raptor grows to Big: 16/16
  - Spitter moves 1 tile: done
  - Spitter (10/10) attacks Guard (17/17): deals 4, takes 8, Acid
  - Left: Humans Guard 13/17; Dinosaurs Ankylosaurus 20/20, Big Raptor 16/16, Spitter 2/10.

#### Dinosaur technologies

| Branch     | Technology     | Tier | After          | Cost as the 2nd / 5th / 9th technology | Unlocks (as coded)                                                                             |
| ---------- | -------------- | ---- | -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SETTLEMENT | GATHERING      | 1    | —              | 5 / 8 / 12                             | reveals FERTILE_GROUND, HARVEST_FRUIT                                                          |
| SETTLEMENT | FARMING        | 2    | GATHERING      | 7 / 10 / 14                            | BUILD_FARM, CONNECTED_FARM_VISUALS                                                             |
| SETTLEMENT | MILLING        | 3    | FARMING        | 9 / 12 / 16                            | BUILD_WINDMILL, ECONOMIC_FORMULA, ADJACENT_START_TURN_HEALING                                  |
| SETTLEMENT | ADMINISTRATION | 2    | GATHERING      | 7 / 10 / 14                            | unit Shaman, CAPTAIN_SUPPORT, BUILD_MARKET, DISBAND                                            |
| SETTLEMENT | PLANNING       | 3    | ADMINISTRATION | 9 / 12 / 16                            | OWNED_CITY_CAPACITY_BONUS, LAND_GRANT                                                          |
| WILDS      | HUNTING        | 1    | —              | 5 / 8 / 12                             | HUNT_GAME                                                                                      |
| WILDS      | FORESTRY       | 2    | HUNTING        | 7 / 10 / 14                            | BUILD_LUMBER_CAMP, CLEAR_FOREST, FOREST_COVER                                                  |
| WILDS      | SAWMILLING     | 3    | FORESTRY       | 9 / 12 / 16                            | BUILD_SAWMILL, ECONOMIC_FORMULA, unit Triceratops                                              |
| WILDS      | MARKSMANSHIP   | 2    | HUNTING        | 7 / 10 / 14                            | unit Spitter                                                                                   |
| WILDS      | FIELDCRAFT     | 3    | MARKSMANSHIP   | 9 / 12 / 16                            | REPLANT_FOREST, FOREST_MOVEMENT_FREEDOM, FOREST_MARCH, ROLE_SIGHT                              |
| MOBILITY   | SCOUTING       | 1    | —              | 5 / 8 / 12                             | unit Raptor, ROLE_SIGHT                                                                        |
| MOBILITY   | ROADS          | 2    | SCOUTING       | 7 / 10 / 14                            | BUILD_ROAD, ROAD_MOVEMENT, LAND_ROAD_POPULATION                                                |
| MOBILITY   | COMMERCE       | 3    | ROADS          | 9 / 12 / 16                            | LAND_TRADE_INCOME, HIRE                                                                        |
| MOBILITY   | RAIDING        | 2    | SCOUTING       | 7 / 10 / 14                            | PILLAGE, CHARGE_BONUS                                                                          |
| MOBILITY   | CHIVALRY       | 3    | RAIDING        | 9 / 12 / 16                            | unit T-Rex, OVERRUN, CULTIVATE_FOREST                                                          |
| INDUSTRY   | DRILL          | 1    | —              | 5 / 8 / 12                             | reveals ORE, unit Ankylosaurus, FIRST_HOSTILE_CAPTURE_SPOILS                                   |
| INDUSTRY   | ENGINEERING    | 2    | DRILL          | 7 / 10 / 14                            | MOUNTAIN_MOVEMENT, HIGH_GROUND_VISION, BUILD_MINE, BUILD_WORKSHOP, REDEVELOP, ECONOMIC_FORMULA |
| INDUSTRY   | METALLURGY     | 3    | ENGINEERING    | 9 / 12 / 16                            | BUILD_FORGE, ECONOMIC_FORMULA, ARMS_INDUSTRY_DISCOUNT                                          |
| INDUSTRY   | FORTIFICATION  | 2    | DRILL          | 7 / 10 / 14                            | NESTING                                                                                        |
| INDUSTRY   | EXPLOSIVES     | 3    | FORTIFICATION  | 9 / 12 / 16                            | BLAST_MOUNTAIN, MELEE_FIELD_DEMOLITION, WALLBREAKER                                            |

#### Dinosaur price list

| Unit         | Technology (tier)  | Cost   | Hired | Slots | Hatch turns (Nesting takes none off) | HP at stage 0 / Big / Alpha | Atk / Def | Move | Range | Acts after moving | Abilities                  | A city of income 3 / 5 / 7 pays for one a turn |
| ------------ | ------------------ | ------ | ----- | ----- | ------------------------------------ | --------------------------- | --------- | ---- | ----- | ----------------- | -------------------------- | ---------------------------------------------- |
| Caveman      | —                  | 2      | 3     | 1     | trained                              | 10                          | 2 / 2     | 1    | 1     | yes               | —                          | yes / yes / yes                                |
| Raptor       | SCOUTING (1)       | 4      | 6     | 1     | 1                                    | 12 / 16 / 20                | 2.5 / 1   | 2    | 1     | yes               | CHARGE, GROW               | no / yes / yes                                 |
| Spitter      | MARKSMANSHIP (2)   | 4      | 6     | 1     | 1                                    | 10 / 14 / 18                | 2 / 1     | 1    | 1-2   | yes               | ACID, GROW                 | no / yes / yes                                 |
| Ankylosaurus | DRILL (1)          | 5      | 8     | 1     | 2                                    | 20 / 24 / 28                | 2 / 3     | 1    | 1     | no                | ARMOURED, GROW             | no / yes / yes                                 |
| Shaman       | ADMINISTRATION (2) | 5      | 8     | 1     | trained                              | 10                          | 1 / 1     | 1    | 1     | yes               | RALLY, TEND_WOUNDED, HATCH | no / yes / yes                                 |
| Triceratops  | SAWMILLING (3)     | 8      | 12    | 2     | 2                                    | 20 / 24 / 28                | 3 / 2     | 2    | 1     | yes               | LINEBREAKER, GROW          | no / no / no                                   |
| T-Rex        | CHIVALRY (3)       | 14     | 21    | 2     | 4                                    | 28 / 32 / 36                | 4 / 2     | 2    | 1     | yes               | OVERRUN, GROW              | no / no / no                                   |
| Brontosaurus | —                  | reward | —     | 2     | trained                              | 45 / 49 / 53                | 3.5 / 4   | 1    | 1     | yes               | PUSH, GROW                 | —                                              |

Unit slots of a Dinosaur city: L1 2/3/4, L2 3/4/5, L3 4/5/6, L4 5/6/7, L5 6/7/8 (plain / with Nesting / with Nesting and Planning).

### 2.1 What the numbers say

1. **The Triceratops with two tiles of run-up was close to the one unit
   worth laying.** Before this pass it had +2 Attack after a Move of two
   tiles from the turn it hatched, for 8 Coins after Sawmilling, which is
   also the faction's economy technology. With +2 it kills a Swordsman
   (15 of 15), a Fighter, a Raider, a Marksman, a Captain, a Catapult, and
   a Knight in one charge and takes nothing back, and leaves a Guard at 3
   of 17. Three of them (24 Coins) that move first kill three of five
   Swordsmen (25 Coins) in the first turn, grow to 24 HP each, and finish
   the other two in the second with no unit lost. Nothing else in the
   roster comes near that for the price, and the units it kills are the
   ones the Humans' own pass added to hold a line.
2. **With one tile of run-up it is a strong unit that needs help.** A
   charged Swordsman is left at 4 of 15 and a Guard at 7 of 17, and both
   strike back. The same three against the same five lose (two Swordsmen
   are left); a Triceratops, an Ankylosaurus, two Spitters, and a Raptor
   for one Coin more win with four units left; and a Caveman beside the
   Triceratops finishes the Swordsman it charged
   ([Pack Hunt](#pack-hunt)). It still kills a Fighter, a Raider, a
   Marksman, and a Knight in one charge after any Move. **With
   Wallbreaker the old numbers return**, two technologies later (Nesting,
   then Wallbreaker: 16 to 30 Coins by the time they are bought). That is
   the faction's late-game strength and it has counters the script shows:
   units that shoot first (three Triceratops lose to two Swordsmen, two
   Marksmen, and a Catapult that strike first without killing one), a
   Guard (alive after the charge), ground that leaves no two free tiles
   for the Move, and Zombies (of three Triceratops against eight, one
   has risen as a Zombie after four turns and the other two, Bitten, face
   the last two). Whether a Human player has enough of those
   against a late Dinosaur army is the first question for a hand-played
   game.
3. **The chain-stopper is the Ankylosaurus.** A Human Knight kills a
   Caveman, a Raptor, a Spitter, and a Shaman in one attack and rides on:
   a young line of five dies to one Knight in one turn. An Ankylosaurus
   takes 9 of its 20 HP, deals 6 back, and the ride ends there; the
   Dinosaurs then kill the Knight. A Triceratops (12 of 20), a T-Rex (12
   of 28), and a Big Raptor (14 of 16) end it too. The Ankylosaurus is 5
   Coins after one tier-1 technology, the same place the Guard, the
   Zombie, and the Shield Projector have in their trees, so nothing was
   added. It cannot move and attack in the same turn, strikes back with
   its Defense 3, and takes 1 less from every hit: a Marksman deals it 3,
   a Guard 1.
4. **Eggs are the faction's weak point, as designed, and a Knight is what
   punishes them.** A 6-HP Egg dies to one attack of every unit that is
   not a Guard, a Goblin, a Saucer, a Projector, or a support unit; a
   10-HP Egg laid with Nesting survives one attack of a Fighter, a
   Marksman, a Raider, a Zombie, or a Grunt, and still dies to a
   Swordsman, a Catapult, a Knight, a Lich, or a Ray Gunner. An Egg never strikes back, so a Knight that
   reaches a nest eats every Egg in a row and then the unit behind them
   ([fork 6](#11-decisions-that-are-forks-for-the-user-to-overrule)).
   (As first written Nesting also took a turn off every hatch, and a
   Triceratops Egg laid with it hatched before a Raider five tiles away
   arrived. That made the Egg no weak point at all, and the correction
   took the turn back:
   [section 13.1](#131-nesting-takes-no-turn-off). With Nesting the
   Raider's hit now leaves the Egg at 4 of 10 and it hatches beside the
   Raider.)
5. **Growth is real but it does not run away.** Big is +4 HP and a full
   heal after one kill, Alpha +4 more and +1 Attack after three. The heal
   is the strong part: a T-Rex at 10 of 28 HP that kills a wounded
   Fighter is a Big T-Rex at 32 of 32 and kills the next two units. It
   needs the kill: at 10 HP the same T-Rex deals a full-HP Fighter 8 and
   kills nothing. A grown unit is still killed by what killed it before
   (a Big Triceratops takes 22 from two Swordsmen), and the two-slot
   units cannot be mind-controlled or pulled, which was already so.
6. **The T-Rex is a finisher.** At full HP it kills what the Knight
   kills, with Rampage; a Guard (10 of 17) and a Swordsman (11 of 15)
   end its ride, and every wound takes Attack force from it. For 14 Coins
   and four turns in a 6-HP Egg it is the dearest and slowest unit in the
   game. A Shaman's Hatch has it acting two turns sooner, which is why
   the two belong together
   ([fork 5](#11-decisions-that-are-forks-for-the-user-to-overrule)).
7. **Acid does what the Marksman cannot.** A Spitter deals a Fighter 5
   on open ground, in a Forest, on a Field Defense, and on a walled
   center, and a Guard 6 from two tiles. It is the Dinosaur answer to a
   fortified line before the Triceratops, and it has 10 HP.
8. **A Caveman alone is the weakest base unit** (10 HP, no Field
   Defense): twelve of them lose to five Swordsmen and kill two.
   With Pack Hunt beside a dinosaur it hits like a Triceratops that did
   not move (8 on a Fighter, 7 on a Swordsman), for 2 Coins and one slot.

## 3. Every Dinosaur unit

| Unit         | Price, slots, hatch         | What it is for                                                                                                                                    | Verdict                                                                      |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Caveman      | 2, one slot, trained        | takes villages and cities, holds a center, and with **Pack Hunt** finishes what a dinosaur hit                                                    | was the one reskin; now a reason to keep a fifth of the army Cavemen         |
| Raptor       | 4, one slot, 1 turn         | Move 2, Pounce with Raiding (kills a Raider, a Marksman, a Catapult, a Captain after two tiles), grows; the Scouts unit                           | useful from Scouting; killed by anything that reaches it                     |
| Spitter      | 4, one slot, 1 turn         | range 2 with Acid: the same hit on a walled center as in the open                                                                                 | useful; the only Dinosaur unit that attacks from two tiles                   |
| Ankylosaurus | 5, one slot, 2 turns        | Armoured, 20 HP, Defense 3: the garrison and the end of a Knight's ride                                                                           | the first unit to research; cannot move and attack                           |
| Shaman       | 5, one slot, trained        | War Drums (+1 Attack; not for a Triceratops), Tend Wounded (the cure for Bitten and Plague; 4 HP to a dinosaur since the correction), Hatch       | useful with a T-Rex Egg or three one-slot attackers                          |
| Triceratops  | 8, two slots, 2 turns       | Charge!: ignores Walls and Field Defense, destroys Field Defense, pushes and follows; +1 Attack after a Move, +2 after two tiles with Wallbreaker | the core attacker; gated, not weakened                                       |
| T-Rex        | 14, two slots, 4 turns      | Rampage (attacks again after a kill), 28 HP                                                                                                       | a finisher ([fork 5](#11-decisions-that-are-forks-for-the-user-to-overrule)) |
| Brontosaurus | reward of the first capital | the Juggernaut's Push with 45 HP                                                                                                                  | unchanged; one a player                                                      |
| Egg          | the unit's price, 6 HP (10) | cannot move or fight, Defense 1 on any tile, lost with its city                                                                                   | the faction's weakness, as designed                                          |

## 4. Every Dinosaur technology

### 4.1 The tree

The graph, tiers, and prices are the Human tree's
([the table above](#dinosaur-technologies)). Branch by branch:

- **Settlement.** Gathering, Farming, and Milling are the Human economy.
  **Administration** gives the Shaman and the Market. **Planning** gives
  a unit slot in every city and Land Grant: for a faction whose best
  units fill two slots it is worth more than it is to any other, and the
  AI now buys it before the T-Rex.
- **Wilds.** Hunting; Forestry (Lumber Camp, Forest cover); **Sawmilling**
  gives the Sawmill (the Chopping Block) and the Triceratops, an economy
  node and the core attacker in one, which is why the second run-up tile
  moved out of it. **Marksmanship** gives the Spitter. **Fieldcraft** is
  the weak node it is for the Humans.
- **Mobility.** **Scouting** gives the Raptor; Roads; **Commerce** gives
  trade income and Hire, which now hires a dinosaur hatched; **Raiding**
  gives Pounce and Pillage; **Chivalry** gives the T-Rex and Rampage.
- **Industry.** **Drill** gives the Ankylosaurus; Engineering the Mine
  and the Workshop; **Metallurgy** the Forge, whose discount takes 1 Coin
  off every Egg; **Nesting** (the Dinosaur Fortification) gives Eggs +4
  HP and a unit slot in every city (and, until the correction, one turn
  off every hatch);
  **Wallbreaker** (the Dinosaur Explosives) gives Blast Mountain, Breach,
  and now the second tile of the run-up.

Every branch has a unit and every tier-3 node has something a Dinosaur
player wants. Before this pass two did not: Wallbreaker's own unlock had
been empty since Breach (`7r46`), and Commerce's Hire gave a Dinosaur
Market two of seven units.

### 4.2 The Dinosaur economy

The Dinosaur economy is the Human one building for building; what differs
is what the Coins turn into. A city lays one Egg a turn; the Egg takes one
to four turns; the best units fill two of a level-2 city's three slots.
So a Dinosaur player runs out of slots and city actions before Coins: in
the lab the AI stood at its unit limit with 20 to 48 Coins in hand. The
faction's economy technologies are therefore the two that add slots,
**Nesting** (one in every city, cheap, with the Egg's HP)
and **Planning**, and the things that turn Coins into strength without a
slot: a technology, a Forge, and since this pass a hired dinosaur (a hire
may exceed the city's limit by one). No new way to spend Coins was added.

### 4.3 The Chopping Block

The user named it for a look. What it is: **only the Dinosaur look and
name of the Sawmill** (`src/render/faction-buildings-v7.ts`: "Chopping
Block", "A big stone axe and a bigger arm."; the card adds "Counts as a
Sawmill"). It has no rule of its own, and the engine knows it as
`SAWMILL` in every respect: the same price, the same Timber family, the
same adjacency income from Lumber Camps. What I found wrong with it:

1. **The technology that builds it is still called Sawmilling**, and the
   technology tree and the text harness say "Sawmill" where the board
   says "Chopping Block". The Dinosaurs rename Fortification and
   Explosives; this node, which also gives the Triceratops, kept the
   Human name.
2. **The art reads as a Lumber Camp.** Its recipe (`chopping-block-b`,
   72 by 72) is an axe in a stump with split logs, which is what a Lumber
   Camp is, and it must stand next to Lumber Camps to pay.
   [The buildings record](../art/FACTION_BUILDINGS.md) already notes that
   the axe head is smooth grey (it looks like metal, not stone), and that
   the piece is more detailed and saturated than the calm shared set; it
   was not redone when the Sawmill was redrawn.
3. **It does nothing a Sawmill does not.** That is by design of the
   faction-building looks, and I did not give it a rule: a building rule
   for one faction is a product decision, and the node is already the
   strongest in the tree.

Nothing was changed in the pass as first written. The two cheap fixes
were a display name for the technology (an entry in
`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`, no rule) and a new raster in an
art bead ([the Dinosaur art fragment](../art/factions/DINOSAUR.md) lists
it). **The correction made the first**
([section 13.4](#134-the-chopping-block-by-name)); the raster is still
open.

### 4.4 How each change of the earlier passes lands for the Dinosaurs

| Change (pass)                                          | For the Dinosaurs                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Every faction needs a unit that ends a Knight's ride   | the Ankylosaurus does, from Drill; no change needed ([section 2.1](#21-what-the-numbers-say), point 3)                               |
| Scouts: the level-2 Survey gives a fast unit (Human)   | carried over: a free Raptor                                                                                                          |
| Hire with Commerce (Human round 3)                     | carried over for dinosaurs: hired hatched                                                                                            |
| Breach in every Explosives (tuning 1)                  | it had emptied Wallbreaker; the node now has the run-up                                                                              |
| The Swordsman (Human round 5)                          | kills a Caveman, a Raptor, a Spitter, and a Shaman in one attack; survives a charge until Wallbreaker                                |
| The Guard is open to ranged attacks (Human)            | a Spitter deals it 6 from two tiles; a Triceratops's charge leaves it alive with or without Wallbreaker (an Alpha's kills it)        |
| A strong ability goes behind a later technology        | applied to the run-up                                                                                                                |
| A unit with no job gets one (Skeleton, Vampire, Ghoul) | applied to the Caveman                                                                                                               |
| One reward unit a player, Barracks, Treasury 6         | the same: one Brontosaurus from the first capital                                                                                    |
| Stockpile 4, Market beside its buildings, Land Grant   | the same; Planning's slot matters more here                                                                                          |
| Gang Up limits, Plunder (Goblin)                       | a bomb on a nest hits three Eggs and each destroyed Egg pays Plunder; unchanged                                                      |
| Risen units fill no slot, Bitten permanent (Undead)    | a Bitten Triceratops rises as a one-slot Zombie; the Shaman cures; unchanged                                                         |
| Force Field, Mind Control, Tractor Beam (Martian)      | a Triceratops's charge is absorbed by the Shield and still pushes; the two-slot dinosaurs are immune to control and pulls; unchanged |
| Army rules for the Normal AI                           | carried over ([section 8](#8-the-normal-ai))                                                                                         |
| A lab in which the hand player is the faction          | carried over ([section 9](#9-the-lab))                                                                                               |

## 5. What makes each unit different

| Unit         | Like which Human unit | What it does that no number says                                                                             |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Caveman      | Fighter               | Pack Hunt; builds no Field Defense                                                                           |
| Raptor       | Raider                | hatches from an Egg; grows; no Escape                                                                        |
| Spitter      | Marksman              | Acid: cover, Walls, and Field Defense do not count; grows                                                    |
| Ankylosaurus | Guard                 | Armoured: 1 less from every hit, bombs and blasts too; grows; not open to ranged attacks                     |
| Shaman       | Captain               | Hatch: an Egg laid on an earlier turn hatches now                                                            |
| Triceratops  | Catapult (the role)   | not a siege engine at all: Charge! from the next tile, the run-up, the push and the follow; two slots; grows |
| T-Rex        | Knight                | never captures; two slots; four turns in the Egg; grows and heals by killing                                 |
| Brontosaurus | Juggernaut            | grows                                                                                                        |
| the faction  | —                     | Eggs, slots, growth; no Field Defense and no unit that attacks from three tiles                              |

## 6. Why each change, and what it must not do

### 6.1 The run-up

Why: [section 2.1](#21-what-the-numbers-say), points 1 and 2. What it
must not do: make the Triceratops a unit nobody lays. It does not: after
any Move it has Attack 4, kills the 12-HP units and a Knight in one
charge, ignores Walls and Field Defense, and pushes a defender off a
center, all as before. A Move of one tile gives the same +1 as before; only
the second tile's +1 waits for the technology. The preview's `runUp` and
the unit card show the tiles that count for the viewer. Because research
is private, the Normal AI counts two tiles for a hostile Triceratops and
its own research for its own.

### 6.2 Pack Hunt

Why: the Caveman was a Fighter with 2 HP less and no Field Defense. What
it must not do: turn Cavemen into the army. It cannot: the bonus needs a
hatched dinosaur of the same owner next to the target, so it is worth
nothing without the dear units; it is +1 (a hit of 8 instead of 5 on a
Fighter), never on retaliation, and the Caveman still has 10 HP. It
stacks with War Drums (a Caveman with both kills a full-HP Fighter in
one attack), which costs a Shaman's action. An Egg, a
Caveman, a Shaman, and a dinosaur two tiles away give nothing. (The
correction added the unit a dinosaur attacked this turn, wherever the
dinosaur stands: [section 13.3](#133-pack-hunt-against-a-hunted-unit).)

### 6.3 Scouts

Why: the reward was the one level-2 choice of this faction with no unit,
and the Raptor is the unit that takes villages. What it must not do: give
a strong unit for nothing. A Raptor is 4 Coins and 12 HP, and it fills a
unit slot of the city (the card says so), which a small Dinosaur city
feels.

### 6.4 Hire

Why: [section 4.1](#41-the-tree). What it must not do: make the Egg
pointless. It does not: a hired Triceratops is 12 Coins against 8, needs
Commerce (a tier-3 node of another branch) and a Market, arrives with its
actions spent on the Market tile, and a Market hires once a turn. A
two-slot dinosaur counts its two slots against the city's limit plus one.
The Normal AI does not hire, as for every faction.

## 7. What was not changed, and why

- **Every number of the roster.** None was needed once the run-up was
  gated.
- **The T-Rex** ([fork 5](#11-decisions-that-are-forks-for-the-user-to-overrule)).
- **Eggs against a Knight** ([fork 6](#11-decisions-that-are-forks-for-the-user-to-overrule)).
- **Fieldcraft**, the weak node of every tree but one.
- **Alpha's +1 Attack.** An Alpha Triceratops with one tile of run-up has
  the numbers of a stage-0 one with two, after three kills.
- **The War Drums exclusion** of the Triceratops and the Shaman.
- **The Chopping Block** ([section 4.3](#43-the-chopping-block)).

## 8. The Normal AI

Before this pass a Dinosaur seat played the pre-army policy in every
match, and every other seat left the army rules when a Dinosaur seat was
at the table. Now `src/ai/v7-army.ts` counts `DINOSAUR` among the army
factions: in a match whose every seat is Human, Goblin, Undead, Martian,
or Dinosaur, every seat plays the army rules. In a match with an Ice
Folk, Dwarf, or Candy seat a Dinosaur seat plays as it did. No rule of
another faction's seat was changed; where a shared rule reads a new fact
(the class a unit's share is counted in), the fact is the same as before
for every other faction's unit, and a test says so.

**Research.** The Ankylosaurus first (Drill: the garrison and the end of
a Knight's ride), one economy technology its land can use, the
Triceratops (Hunting, Forestry, Sawmilling), the Raptor (Scouting), the
Spitter (Marksmanship), the Shaman (Administration), Planning, and the
T-Rex (Raiding, Chivalry). **Nesting** is researched before the
Triceratops's technologies once the seat fields an Ankylosaurus, and
**Wallbreaker** before the T-Rex's once it fields two Triceratops. A seat
with four or more units and no city with two free slots is **crowded**:
it researches Nesting at once, and Planning as soon as it can lay the
Triceratops, and a war does not hold those two. A Dinosaur seat's
research is also not held by a war when the Coins left after it would
still pay for the dearest production on offer: its Coins outrun its city
actions and its slots.

**Production.** `LAY_EGG` is production like `TRAIN`: it has the army's
training priority (before research and construction), the army's unit
mix, the Coins kept for the due technology and for the dear unit the army
is short of, and no production on a center under two shooters while
another city can produce. An own Egg counts as the unit inside it. The
shares (line / defender / ranged / siege / breakthrough) are 20 / 25 / 15
/ 30 / 10: a fifth Cavemen, a quarter Ankylosauruses, 15% Spitters, three
tenths Triceratops, a tenth T-Rexes; against two or more visible ranged,
siege, or support units 15 / 20 / 15 / 25 / 25. One Raptor for every four
units, three at most. The Triceratops has the siege share and fights in
the line (it is not kept from a threatened center as a Catapult is); the
T-Rex is not laid at a threatened or frontier center. The policy's older
Dinosaur adjustments stay on top: the hatch delay as a cost, no two-slot
Egg into the last slots of a small city, the first Shaman's bias.

**The opening.** Villages first, the best unit on a threatened center,
and at level 2 **Scouts whatever its Coins** (the older rule took
Stockpile below 4 Coins). A garrison does not step off a center whose
city lays an Egg this turn (the Egg goes beside it); where the city lays
none it steps aside like any army seat's so that the city can train a
Caveman.

**Units.** Kept from the older policy: guarding and hatching Eggs, the
safest nest tile, never a nest tile the visible enemies can reach,
retreating a grown, wounded unit, the Triceratops's run-up Move before
the charge that kills, War Drums, Tend Wounded, Rampage, Pounce. New: a
Dinosaur unit with less than 15 HP at its maximum is a weak link of a
kill chain (Cavemen, Raptors, Spitters, and Shamans do not stand side by
side in a chaining unit's reach); an Ankylosaurus's Move beside those
units is worth an escort's value; the value of Wallbreaker counts the
seat's own Triceratops. The correction added six rules for this seat
([section 13.5](#135-the-dinosaur-seat-of-the-normal-ai)).

**The other seats against Dinosaurs** play the army rules too. What they
knew stays: they smash reachable Eggs, do not feed a kill to a dinosaur
one kill from growing, and count two tiles of run-up for a hostile
Triceratops whatever its owner has researched.

### 8.1 Two diagnostic matches

Each was read twice: once on the first army rules, and once after the AI
rules that reading asked for (Scouts at level 2, the garrison rule, the
crowded seat's research, Planning in the order, research with the Coins
left over). Between the two readings each match was also replayed once on
unchanged code to save its states for a probe; that replay was the same
match and told nothing new. One more AI rule changed after the second
reading (Planning only after the Triceratops) and neither match was run
again for it; it is covered by a unit test. They are evidence of what the
AI does, not of balance.

**A generated game** (Humans first, Dinosaurs second, Dry Land, 14 by 14,
seed 7, 30 rounds, both seats the Normal AI).

| What                    | First reading                                                       | Second reading                                                                               |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Level-2 reward, round 1 | Stockpile                                                           | Scouts: a Raptor                                                                             |
| Villages                | rounds 6, 9, 11: four cities                                        | rounds 6, 8, 11, 11: five cities                                                             |
| Technologies            | 9: Drill 3, Hunting 5, Forestry 7, Nesting 13, Sawmilling 17        | 8: Drill 3, Hunting 5, Forestry 8, Nesting 14, Administration 18, Sawmilling 22, Planning 25 |
| Laid and trained        | 10 Cavemen, 8 Ankylosaurus Eggs, 3 Triceratops, a Raptor, a Spitter | 10 Cavemen, 12 Ankylosaurus Eggs, 2 Shamans, 2 Triceratops Eggs                              |
| Growth                  | 6 Ankylosauruses to Big, 2 to Alpha, 2 Raptors, 2 Triceratops       | 9 Ankylosauruses to Big, 2 to Alpha, a Triceratops                                           |
| Pack Hunt attacks       | 7                                                                   | 8                                                                                            |
| Kills and losses        | 19 kills for 20 units lost                                          | 20 kills for 24 units lost                                                                   |
| Cities at round 30      | 3, against the Humans' 8                                            | 4, against the Humans' 8                                                                     |
| Eggs lost               | none                                                                | none                                                                                         |

The second reading showed what the last rule change answers: Planning
(through Administration) had gone before Sawmilling and put the
Triceratops back five rounds. It now waits for the Triceratops.

**The lab** (`LAB_DINOSAUR_MID`, both seats the Normal AI, 14 rounds).

| What                 | First reading                               | Second reading                                        |
| -------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Units produced       | every Dinosaur unit                         | every Dinosaur unit                                   |
| Technologies         | Nesting in round 7, Wallbreaker in 11       | Nesting in round 7, Wallbreaker in 10, Planning in 11 |
| Hatched by a Shaman  | 4 of 23                                     | 4 of 22                                               |
| T-Rex                | 9 attacks, 7 kills, rode on 6 times; 4 lost | the same                                              |
| Triceratops charges  | 6: 3 unmoved, 1 after one tile, 2 after two | 7: 4 unmoved, 1 after one tile, 2 after two           |
| Acid attacks         | 11                                          | 8                                                     |
| Kills and losses     | 25 kills for 28 units lost                  | 26 kills for 34 units lost                            |
| Coins in hand        | 48 in round 10, 42 in round 15              | 48 in round 10, 24 in round 15                        |
| Cities at round 15   | 3 of 5, against the Humans' 9               | 3 of 5, against the Humans' 9                         |
| Knights that rode on | 8 times                                     | 12 times                                              |

What the readings say about the AI: it researches toward its units, takes
villages, lays every unit, loses no Egg, grows its Ankylosauruses, and
uses Pack Hunt, Hatch, Acid, Rampage, and the run-up. It also loses both
matches to the Human AI on the map: it holds fewer cities, charges with a
Triceratops that has not moved as often as with one that has, lays
many more Ankylosauruses than its share in a generated game (the unit it
can afford every turn in a small city), reaches the Triceratops late, and
still banks Coins at its unit limit. Those are in
[section 12](#12-what-is-still-open). None of it was tuned against the
outcome.

## 9. The lab

`LAB_DINOSAUR_MID` (hidden, 16 by 16, `lab --session S.json LAB_DINOSAUR_MID`
in the text harness): the hand player is the Dinosaurs in an even middle
game against the Human AI, on the land and against the Human side of
`LAB_MARTIAN_MID`.

- **Each side** has five cities: a level-4 capital, two of level 3, and
  two of level 2 at the front, with 15 Coins a turn.
- **The Dinosaurs** hold 12 units and an Egg worth 67 Coins: 3 Cavemen, 2
  Raptors (one Big), 2 Spitters (one Big), 2 Ankylosauruses, a Shaman, 2
  Triceratops (one Big), and a T-Rex Egg beside the Shaman that hatches
  in two turns. They have 20 Coins, which is 35 in hand on the first
  turn, and three free unit slots (two in the capital, one in the north
  level-3 city; a Triceratops and a T-Rex fill two). They own ten
  technologies: every unit can be produced. They do **not** own Nesting,
  Wallbreaker, Planning, Engineering, or Farming, so the first research
  choice is the pass's own question: slots, the second run-up tile, or
  the economy.
- **The Humans** hold 17 units worth 77 Coins, as in the other
  hand-player labs: 3 Swordsmen, 3 Marksmen, 2 Catapults, 2 Knights, 2
  Guards, and 5 Fighters, a walled capital and a walled level-3 city, and
  30 Coins on their first turn.
- **The land** is not bare: every city has Forest and Fertile Ground in
  its land, the three larger ones have Ore, there is Game, and each side
  has four Lumber Camps.

A mission unit may now carry `kills` (a grown dinosaur, at the HP of its
stage) and `egg` (an Egg with its countdown); the builder refuses both
where the rules do.

## 10. Text

- The Triceratops's card and its line in the text harness say "Charge!:
  +1 Attack after moving this turn (with Wallbreaker +1 per tile, up to
  +2). Ignores Walls and Field Defense, destroys Field Defense, and
  pushes back." The unit's stats say how many tiles count for its owner.
- Wallbreaker reads "A Triceratops's run-up counts 2 tiles (up to +2
  Attack); dinosaurs ignore City Walls".
- The Caveman's card and line say "Pack Hunt: +1 Attack against a unit
  next to one of your dinosaurs"; the Help page has a Pack Hunt rule.
- Scouts reads as for the other factions, with "(uses a unit slot)" for a
  Dinosaur city.
- The Hire line of Commerce says "a hired dinosaur arrives hatched" for
  the Dinosaurs.
- The text harness prints the Dinosaur notes it lacked (Charge!, Acid,
  Armoured, Hatch, Pack Hunt, growth, the hatch time, two slots), the
  faction's technology names ("Nesting", "Wallbreaker") in its TECH
  lines, and for an Egg its own line and not the notes of the unit
  inside.
- No art was generated. The art fragment lists what an art bead could
  do: a Pack Hunt marker (none exists; the rule is text and the attack
  preview's number), and the Chopping Block.

## 11. Tests

`tests/unit/ruleset-v7-dinosaur-pass.test.ts` (44 tests as first
written; 60 with the correction's,
[section 13.8](#138-tests)): the identity;
the Scouts Raptor; the run-up with and without Wallbreaker (the Attack,
the Swordsman it kills or leaves, Walls still ignored, preview equal to
resolution, the AI's count, the text); Pack Hunt (which neighbours count,
the Caveman's own attack only, with a Triceratops, the text); the hire
(the offer, the price, a hatched Triceratops with its two slots, the
limit, the other factions unchanged); the numbers this document reasons
from (the Knight against every unit, the Ankylosaurus that ends the ride,
Eggs with Nesting, the T-Rex, Acid); the army rules of a Dinosaur seat
(the order, Nesting and Wallbreaker, the crowded seat, research with the
Coins left over, the economy technology, the shares, Eggs counted,
Scouts, the garrison); the unit rules of
[section 8](#8-the-normal-ai); and the lab with the mission builder's
grown units and Eggs.

Existing tests changed, each with its reason in a comment: the Dinosaur
AI tests that fixed the older policy now run it against a Dwarf seat
(where it still applies); the Martian AI tests that used a Dinosaur seat
as "a match without army rules" use a Candy seat; the tuning-5 and
tuning-6 tables of army factions have the Dinosaurs; the Scouts tables
of the earlier passes have the Raptor; the Dinosaur presentation and
text tests name the gated run-up and Pack Hunt; the lab lists and the
mission pins have `LAB_DINOSAUR_MID`; the identity tests name `7r53`.

## 12. What is still open

(As first written this section asked for three hand-played games; they
are answered in
[section 13](#13-the-correction-after-three-hand-played-games), whose
[section 13.6](#136-left-as-it-was-with-the-evidence) has the ideas they
left open.)

1. **Hand-played games.** None was played in this bead as first written.
   The three the earlier passes had (the Dinosaurs in the lab, the
   Dinosaurs from turn 1, the Humans against the Dinosaur AI) were the
   next step, and the first thing to look at was the Triceratops with
   Wallbreaker ([section 2.1](#21-what-the-numbers-say), point 2).
2. **The Dinosaur AI loses to the Human AI on the map** in both
   diagnostic matches: fewer cities, a late Triceratops, more
   Ankylosauruses than its share, Coins banked at its unit limit, and
   charges without a Move ([section 8.1](#81-two-diagnostic-matches)).
3. **The forks** of
   [section 1.1](#11-decisions-that-are-forks-for-the-user-to-overrule),
   the T-Rex and the nest against a Knight first.
4. **The Chopping Block**: the technology's name and the raster
   ([section 4.3](#43-the-chopping-block)).
5. **A Pack Hunt marker** on the board (art and UI); today it is the
   card's sentence and the preview's number.
6. **The other three factions** (Ice Folk, Dwarf, Candy) still have the
   plain Survey, and a match with one of them still plays the older
   policy on every seat.

## 13. The correction after three hand-played games

Three sessions were played by hand on the pass as first written: the
Dinosaurs in the lab (12 rounds, in three phases: the intended mix,
Triceratops only, cheap units only), the Dinosaurs from turn 1 against the
Human AI (won in round 26), and the Humans against the Dinosaur AI (30
rounds). What they found, in the players' numbers:

- **The roster holds.** In the lab the mix was clearly best (34 kills for
  26 losses); Triceratops alone traded evenly (8 of 10 died the turn after
  charging) and cheap units alone did worse. Against the Dinosaur AI the
  Human player did not buy only Knights (8 Knights, 7 Swordsmen, 3
  Catapults, a Marksman), the first faction of these passes where that
  held, and an Ankylosaurus ended a Knight's ride where it stood. The
  run-up gate works; the Triceratops's counter is the Guard, which
  Spitters open.
- **Nesting removed the Egg.** With it every Egg but the T-Rex's hatched
  at the start of the next turn: 32 laid and 32 hatched in the lab, none
  ever attacked; none lost from turn 1; the Human player never reached
  one in 30 rounds.
- **The Shaman had no job.** Never bought in the lab; bought once from
  turn 1 ("Tend heals 2, resting in my own land heals 4").
- **Pack Hunt decided one kill in twelve rounds**: a Caveman with Move 1
  is not beside the next target.
- **The Dinosaur AI** laid 13 Ankylosauruses that made three kills, ended
  24 of 30 turns on 0 to 2 Coins, attacked walled centers with them,
  walked them off its centers (one Knight then took six units in a turn),
  sent each Triceratops in alone, and never researched Wallbreaker.
- **The tool** printed a Triceratops as `[CATAPULT]` and `Ct`, Nesting as
  `FORTIFICATION`, and "center occupied" for a unit that needed two
  slots; it offered no way to choose the two-tile path of a run-up.

A rare strong moment with a counter is wanted and was seen: a T-Rex made
seven kills in a turn, growing in the middle, and was then cut from 24 to
2 HP by a Catapult and a Knight. The T-Rex, Rampage, and growth are
untouched.

| #   | Change       | Before the correction                                                    | Now                                                                                                                                                       |
| --- | ------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Nesting      | Eggs +4 HP, one turn off every hatch (at least 1), +1 slot in every city | Eggs +4 HP, +1 slot in every city; **no turn off**                                                                                                        |
| 2   | Tend Wounded | heals 2, whatever the unit                                               | a Shaman **heals a hatched dinosaur 4**; a Caveman or a Shaman 2                                                                                          |
| 3   | Pack Hunt    | +1 Attack against a unit next to an own dinosaur                         | also against **a unit an own dinosaur attacked this turn** (`huntedThisTurn`)                                                                             |
| 4   | Names        | the technology "Sawmilling" and its unlock "Build sawmill"               | **Timber**, "Build Chopping Block", "Chopping Block: +1 per adjacent lumber camp" for a Dinosaur player                                                   |
| 5   | Dinosaur AI  | [section 8](#8-the-normal-ai)                                            | the Ankylosaurus cap, no losing attack, the garrison under a fast unit's eye, the Triceratops's support, Wallbreaker at war, Eggs out of reach or guarded |
| 6   | Text         | —                                                                        | the tool's names, codes, reasons, and the run-up before the Move                                                                                          |

### 13.1 Nesting takes no turn off

`NESTING.hatchTurns` is 0. An Egg hatches in its base turns with or
without Nesting:

| Unit         | Base turns | With Nesting before the correction | With Nesting now | Laid in turn N, it acts in | With a Shaman's Hatch in N + 1          |
| ------------ | ---------: | ---------------------------------: | ---------------: | -------------------------- | --------------------------------------- |
| Raptor       |          1 |                                  1 |                1 | N + 1                      | —                                       |
| Spitter      |          1 |                                  1 |                1 | N + 1                      | —                                       |
| Ankylosaurus |          2 |                                  1 |                2 | N + 2                      | N + 2, hatched through the enemy's turn |
| Triceratops  |          2 |                                  1 |                2 | N + 2                      | N + 2, hatched through the enemy's turn |
| T-Rex        |          4 |                                  3 |                4 | N + 4                      | N + 2                                   |

A Caveman and a Shaman are trained and act in N + 1, like every other
faction's unit.

**Is the faction now too slow to replace its losses in the middle game?**
No, by these numbers:

- **Throughput is unchanged.** A city lays one Egg a turn whatever the
  hatch time: the turn is a delay in the pipeline, not a lower rate. Five
  cities lay five Eggs a turn if the Coins and the slots are there, and
  they were not there before either: in the lab the hand player had 15 to
  26 Coins a turn, which is two or three units, and the cities at the
  front were at their unit limit from round 11 to round 21 in the game
  from turn 1.
- **The delay is one turn** for the Ankylosaurus and the Triceratops, the
  two units the army is built on, against a trained Human unit; the
  Raptor and the Spitter have none; the T-Rex has three, or one with a
  Shaman beside the nest.
- **Slots are held by the Egg** from the turn it is laid, as before, so
  the delay costs no slot.
- **What it brings back is the risk**: an Ankylosaurus or Triceratops Egg
  now stands through one enemy turn (a T-Rex Egg through three) with 6 HP,
  or 10 with Nesting. A 10-HP Egg survives a Fighter, a Raider, a
  Marksman, a Zombie, or a Grunt and dies to a Swordsman, a Catapult, or a
  Knight ([the Egg table](#attacks-on-an-egg)); a Raider that reaches a
  Nesting Egg leaves it at 4 and meets the Triceratops the turn after
  ([the scenario](#an-egg-laid-and-hatched-under-pressure)). A Knight
  still eats a nest ([the scenario](#a-knight-at-a-nest)), which is now a
  thing that can happen after Nesting too.
- **The Triceratops at two turns is the rule the lab opens with** (the
  hand player has no Nesting there) and the rule both diagnostic matches
  of [section 8.1](#81-two-diagnostic-matches) were laid under until
  Nesting: it is workable. The smaller alternative on record, should hand
  play find the front cannot be refilled: Nesting takes the turn off only
  for an Egg laid beside an own Ankylosaurus or Shaman.

**The Shaman's Hatch, plainly.** It makes a T-Rex act two turns sooner.
For an Ankylosaurus or a Triceratops Egg it does **not** bring the first
action forward (the Egg hatches by itself at the start of the turn the
hatched unit could first act in): what it buys is a full-HP unit where
the Egg would stand through the enemy's turn, with its strike back, and
one that a Knight cannot ride through. That is a real job next to a
threatened nest and none next to a safe one. The card says what it does:
"Uses the Shaman's action: an Egg next to it hatches now, whatever turns
it had left (not on the turn it was laid). The new unit acts from your
next turn." If the Shaman should also speed the two-turn Eggs, the rule
would have to let a hatched unit act in the turn of the Hatch; that was
not done.

### 13.2 Tend Wounded heals a dinosaur 4

Role mechanic `tendGrowingHeal` (4, the Dinosaur `CAPTAIN` only): a
Shaman's Tend Wounded restores 4 HP to a hatched dinosaur next to it and 2
to a Caveman or a Shaman; cures are as before. A Triceratops at 8 of 20 is
at 12 after it, where resting in its own land gives the same 4 and outside
it nothing. A Human Captain still heals 2.

### 13.3 Pack Hunt against a hunted unit

A unit that one of the player's hatched dinosaurs attacks, and that
survives, is hunted for the rest of that turn (`huntedThisTurn`, a state
and view list emptied at End Turn). A Caveman has Pack Hunt against it
wherever the dinosaur stands. A Spitter's Acid from two tiles sets it up:
the Spitter deals a Swordsman 4, and the Caveman on its far side then
deals it 8 where it dealt 4 alone
([the scenario](#pack-hunt)). Never on a retaliation, never from a
Caveman's or a Shaman's attack. The attack preview shows "Pack Hunt +1",
and the estimate of an enemy attack counts it when a dinosaur of that
enemy is within three tiles (a hand player was told "about 3-4" for a hit
of 7 or 8).

This is the one place the correction added state. The rule cannot be
read off the board (the Spitter that shot stands two tiles away and may
have had three targets in range), so the target has to be remembered for
the turn.

### 13.4 The Chopping Block by name

The Dinosaur Sawmilling is displayed as **Timber**: a name that fits the
Human Sawmill and the Chopping Block alike, so the node needs no second
meaning, and only the Dinosaur display changes. The technology tree's
unlock lines take the faction's building name wherever a faction has one
("Build Chopping Block", "Chopping Block: +1 per adjacent lumber camp"),
as the board and the build button already did; the text tool prints
`SAWMILLING "Timber"` and `cmd BUILD_SAWMILL "Chopping Block"`. The
raster is left to an art bead.

### 13.5 The Dinosaur seat of the Normal AI

Each has a constructed test.

- **The Ankylosaurus cap.** No more Ankylosauruses than a third of the
  army, never more than the other units they screen
  (`armyDinosaurDefenderCappedV7`), and no eighth while growth is on offer
  or the next technology is a growth technology. A capped Ankylosaurus is
  not laid at all: the garrison steps aside and the city trains a Caveman,
  or the Coins go to a technology.
- **No losing attack.** An Ankylosaurus makes no attack that takes back
  more than it deals, a kill aside. It screens: the escort value beside
  Cavemen, Raptors, Spitters, and Shamans is as it was.
- **The garrison.** While a hostile unit that moves two tiles or more, or
  has Overrun, is within four tiles of an own center, the unit on that
  center makes no Move off it but the step aside that lets the city train,
  and an Ankylosaurus on or beside it stays on or beside it.
- **The Triceratops's support.** A Triceratops makes no Move into contact
  unless another Triceratops or T-Rex is within three tiles of the target,
  or two Cavemen within two, or the target is within two tiles of an own
  center, or no other enemy is within two tiles of it. In contact already,
  it attacks.
- **Wallbreaker.** Researched at the first step of the order after the
  Triceratops's technology once the seat fields two (it was at the
  T-Rex's step, the last, which a seat at war never reached), and a war
  does not hold it; the Coins are kept for it.
- **Eggs.** An Egg of two or more turns is laid only on a nest tile that
  no visible enemy reaches in those turns, or one beside an own hatched
  unit (the garrison on the center counts). The rule against a nest the
  enemies destroy next turn, and the guard, are as they were.

### 13.6 Left as it was, with the evidence

- **The Triceratops's growth heal.** From turn 1: eight laid, none lost,
  five Alphas, 24 of 38 kills, "zero lost in 14 rounds of fighting is the
  number I would look at"; the suggestion was that Alpha heal only its +4.
  That was against a Human AI that fielded no Knight and no Catapult; in
  the lab 8 of 10 Triceratops died the turn after charging, and against
  the Dinosaur AI every grown unit but one was dead within three turns.
  Open idea, not done.
- **The Raptor.** "Nobody lays one once the villages are gone": six of
  seven died, four right after the kill that grew them. And every cheap
  Dinosaur unit is a one-hit Knight kill (a six-kill chain cost the AI 24
  Coins). The two fixes suggested: Raptor Defense 1 to 1.5 (or 14 HP), and
  Spitter HP 10 to 12. Open ideas, not done.
- **The road to the T-Rex.** Raiding and Chivalry were "37 Coins by then
  in a branch that gives a Dinosaur nothing else I wanted". Suggested: the
  T-Rex on Raiding, or Raiding with something more for the Dinosaurs, or
  hatch 4 to 3. Open idea, not done.
- **The T-Rex in a chain.** Suggested: Alpha's +1 Attack from the owner's
  next turn, or Rampage capped at four kills. Left: the moment is wanted
  and had its counter.
- **Scouts, Hire, the run-up gate, every number and price**: unchanged.

### 13.7 Text and the tool

- Dinosaur units have their own map codes (`Cv Rp Sp Ak Sh Tc Tx Bo`) and
  a legend line; a debrief prints technologies and units under the
  faction's names (`FORTIFICATION "Nesting"`, "Triceratops").
- A city line gives the reason that applies: "needs 2 free slots, the city
  has 1" for a unit of two slots, "no free tile next to the city" for an
  Egg.
- The hire line lists the roles the Market would hire with more Coins as
  "too dear", with their prices, and names every role.
- **The run-up before the Move.** `options --unit` adds to every Move of a
  Triceratops the run-up it gives and, for each enemy the Move ends next
  to, about what the Charge! would deal. With Wallbreaker a tile one step
  away is also offered by two tiles (`u7.run.4,5`): the public command
  query offers one path a tile, the shortest, so the second tile could
  not be chosen.
- **The browser** shows the run-up in the attack preview ("Charge +1")
  and on the unit's status chip after the Move and before the attack is
  committed; it does not show it before the Move, and it moves by the
  shortest path, so with Wallbreaker a player cannot take two tiles to a
  tile one step away there either. That is open
  ([section 13.9](#139-what-is-still-open)).
- The browser smoke's Dinosaur probe checks the Triceratops's card for the
  new Charge! sentence.

### 13.8 Tests

`tests/unit/ruleset-v7-dinosaur-pass.test.ts` has 60 tests; the
correction's 16: the hatch-turn table with and without Nesting and the
Shaman's Hatch; Tend Wounded on a Triceratops, a Caveman, and a full unit,
and a Human Captain's; the hunted unit (marked by a Spitter's shot, the
Caveman's preview and resolution, emptied at End Turn, a killed target, no
Caveman's or Shaman's or Human attack, the state check, the policy's
estimate); Timber and the Chopping Block in the technology tree; and one
test for each AI rule of [section 13.5](#135-the-dinosaur-seat-of-the-normal-ai).
`tests/scripts/play-text-v7.test.ts` covers the codes, the two-slot
reason, the names, the run-up lines, a two-tile run-up Move made in a lab
session, and the debrief.

Existing tests changed, each with a comment: the Nesting tests of
revisions 19 and 20 (the turn off is gone), the Tend test of the Dinosaur
rules (a dinosaur heals 4), the Dinosaur text tests, the technology-name
tables (Timber), the five state-parity tests that leave new empty lists
out of old pins (`huntedThisTurn` joins them), four state fixtures (the
new key), the form and reader audits, the hire line of the lab test, and
the Pangea pin of the curiosity parity test (a Dinosaur seat plays
differently).

### 13.9 What is still open

1. **The two diagnostic matches of the correction were run once each
   before its last two AI fixes** (the cap as a filter, Wallbreaker at
   war), which they are the evidence for, and were not run again
   ([section 13.10](#1310-two-diagnostic-matches)). Whether the seat now
   keeps to a third of Ankylosauruses and buys Wallbreaker in a whole game
   is shown by constructed tests only.
2. **The Shaman's Hatch does not speed a two-turn Egg**
   ([section 13.1](#131-nesting-takes-no-turn-off)).
3. **The browser** shows no run-up before the Move and offers no two-tile
   path ([section 13.7](#137-text-and-the-tool)); a hunted unit has no
   marker on the board.
4. **The open ideas** of [section 13.6](#136-left-as-it-was-with-the-evidence).
5. **The Dinosaur AI still loses to the Human AI on the map**, with half
   the income by round 20 in the generated game.

### 13.10 Two diagnostic matches

Each was run once on the correction, before its last two AI fixes. They
are evidence of what the AI does, not of balance.

**The generated game** (Humans first, Dinosaurs second, Dry Land, 14 by
14, seed 7, 30 rounds).

| What                                 | Reading                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Ankylosaurus share                   | 3 of 9 in round 12, 5 of 11 in 15, 7 of 14 in 18, 9 of 16 in 21, 9 of 17 in 24, 6 of 15 in 30: **about half, not a third**                    |
| Why                                  | a city with its center held could lay Eggs and train nothing; with only Drill owned the Ankylosaurus was its one Egg, and the cap was a score |
| Income (Dinosaurs / Humans)          | round 9: 5 / 5; 12: 8 / 6; 15: 6 / 11; 18: 8 / 13; 21: 9 / 15; 24: 9 / 16; 30: 9 / 17                                                         |
| Coins in hand at the start of a turn | 6 to 13 from round 9 on (0 to 2 on most turns before the correction, by the hand player's count)                                              |
| Technologies                         | Drill 3, Hunting 5, Forestry 8, Nesting 14, Sawmilling 21, Administration 23, Planning 25, Scouting 29: 9 by round 30 (the Humans 13)         |
| Wallbreaker                          | never: one Triceratops hatched, in round 28                                                                                                   |
| Triceratops charges                  | one, alone, without a Move                                                                                                                    |
| Eggs                                 | 15 laid, 14 hatched, one Ankylosaurus Egg lost to an attack in round 20                                                                       |
| Kills and losses                     | 22 kills for 19 units and an Egg                                                                                                              |
| Cities                               | 5 in round 30 and 4 in round 31, against the Humans' 7 and 8; it took a Human city in round 29                                                |

**The lab** (`LAB_DINOSAUR_MID`, 14 rounds).

| What                | Reading                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ankylosaurus share  | 2 of 13 at the start, 4 of 14 in round 6, 3 of 17 in 9, 5 of 18 in 12 and 15: under a third throughout                               |
| Income              | 15 at the start, 23 in round 6, 26 in 9, 21 from 12 (the Humans 15, 20, 19, 24, 21)                                                  |
| Technologies        | Nesting 7, Planning 9; **Wallbreaker never**, with five Triceratops fielded in round 12 and 24 to 41 Coins in hand                   |
| Why                 | Wallbreaker was the research target and a war held it: it unlocks no unit, and the Coins left after it would not pay for a T-Rex Egg |
| Triceratops charges | 6: 4 without a Move, 2 after one tile; one turn with two charging, four turns with one                                               |
| Eggs                | 28 laid, 27 hatched (7 by a Shaman), none lost                                                                                       |
| T-Rex               | 18 attacks, 14 kills, rode on 12 times; 4 lost                                                                                       |
| Kills and losses    | 30 kills for 26 units lost                                                                                                           |
| Cities at round 15  | 4 (two lost, one taken from the Humans in round 8), against the Humans' 8                                                            |

Both readings showed a defect of the correction itself, and each was
fixed afterwards with a constructed test and no further run: the capped
Ankylosaurus is now filtered out of a city's production
(`armyDinosaurDefenderHeldV7`), and Wallbreaker is not held by a war once
two Triceratops are fielded (`armyWallbreakerDueV7`). The readings above
are therefore of the seat without those two fixes.
