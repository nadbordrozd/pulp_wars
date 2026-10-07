# Ruleset 7: the Undead faction pass

**Status:** implemented on `pulp-wars-poc-7r51` (bead `pulp_wars-w49.13`),
with the correction of
[section 13](#13-the-correction-after-three-hand-played-games) after three
hand-played games (the Undead in the lab, the Undead from turn 1, and the
Humans against the Undead AI). Sections 1 to 12 are the pass as it was
first written; where the correction changed a rule, the passage says so
and section 13 has the reasons. The rules themselves are stated in
[Ruleset 7: current rules](RULESET_7_CURRENT.md); this document is the
reasoning and the record, in the shape of
[the Goblin pass](RULESET_7_TUNING_GOBLIN.md) and
[the Human pass](RULESET_7_TUNING_HUMAN.md).

**Superseded in part by [the ninth unit](RULESET_7_NINTH_UNIT.md) (`pulp-wars-poc-7r55`, `pulp_wars-w49.17`).** The Undead have a ninth land
unit, the **Wight** (the heavy line role, at Metallurgy; Rise Again: it
returns once from its own Grave at 7 HP unless a unit stands on it), so
the roster, the research order (the Wight after the Necromancer), and
every statement that the Swordsman is the Humans' alone are out of date.
The Human Swordsman this document fights is the Champion (6 Coins, at
Metallurgy). `LAB_UNDEAD_MID` is at revision 2: your seat owns Engineering
and Metallurgy too. The record below is unchanged.

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
makes no sense. About this faction: Zombies that multiply are wanted, as
long as they can be countered and do not decide every battle; if the wave
came too early it would go behind a later technology, never be weakened.
Not reopened: Bitten stays permanent, the forced advance after a kill
stays, the Human Knight and its Overrun are untouched, Stockpile stays 4.

**The method** is the Human pass's: scenario reasoning from the engine's
exact public combat and Wail previews on constructed positions and small
scenarios played by the reducer (`scripts/undead-tuning-analysis-v7.ts`,
which plays no match), the nine hand-played games that had an Undead seat
(rounds 5 to 8 of the Human pass, every one with the Undead played by the
AI), and two single diagnostic matches read for what the Undead AI
researches, buys, and does. No AI-against-AI result was counted.

## 1. The changes

| #   | Change           | Before (`7r50`)                                                                                                              | Now (`7r51`)                                                                                                                                                                                                                                                                                        | Other factions                                                                              |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Skeleton         | a Human Fighter with 2 HP less and no rule of its own                                                                        | **Bones**: Defense 3 against an attack from two or more tiles (its Defense stays 2 hand to hand). A Marksman's shot deals it 4, not 5: three shots kill it, not two                                                                                                                                 | their ranged units deal a Skeleton less (a Marksman 4, a Catapult 7, a Rocket Cart alone 8) |
| 2   | Vampire          | Lifesteal and an attack nothing answers; it stood where its attack left it and died to the next two shots                    | **Escape**: after an attack it survives it may move once more (the Human Raider's rule): it strikes and flies back                                                                                                                                                                                  | none                                                                                        |
| 3   | Abomination      | the Human Juggernaut under another name                                                                                      | **Infect**: a land unit it kills rises as a Zombie where it fell, and the Abomination stays where it stands. It does not bite                                                                                                                                                                       | none                                                                                        |
| 4   | Level 2 reward   | Survey (the Humans and the Goblins: Scouts, the survey and a free Raider or Wolf Rider) or Stockpile                         | **Scouts for the Undead too**: the survey and a free Ghoul                                                                                                                                                                                                                                          | the other five keep the plain Survey until their passes                                     |
| 5   | Undead Normal AI | researches Zombie, Banshee, Necromancer, Lich, Vampire; 30% Zombies, 15% Liches; trains whatever the Coins of the turn reach | researches Zombie, Banshee, **Lich**, Necromancer, Vampire; 25% Zombies, 25% Skeletons, 20% Banshees, **20% Liches**, Ghouls; keeps the Coins for a Lich; Zombies advance together and bite the dearest unit; Banshees step up to Wail; Vampires strike and fly back; [section 8](#8-the-normal-ai) | none (every rule is an Undead seat's)                                                       |
| 6   | Lab              | none for the Undead as the player                                                                                            | `LAB_UNDEAD_MID`: the hand player is the Undead in an even middle game ([section 9](#9-the-lab))                                                                                                                                                                                                    | —                                                                                           |

**The correction** ([section 13](#13-the-correction-after-three-hand-played-games))
added, on the same identity:

| #   | Change           | Before                                                                                        | Now                                                                                                                                                             |
| --- | ---------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | A rising         | homed to the city of the unit that made it, over its capacity; that city then trained nothing | **no home city**: an Infect or Bitten Zombie and a raised Skeleton fill no unit slot                                                                            |
| 8   | Lich             | plagued from its first shot                                                                   | **Plague needs Pestilence** (the Undead Explosives, two technologies of another branch); the shot and the splash are as they were                               |
| 9   | Necromancer      | Raise Dead on the Graves beside it                                                            | **within two tiles**                                                                                                                                            |
| 10  | Ghoul            | a Raider with Devour                                                                          | **Carrion**: +1 Attack against a Bitten or Plagued unit                                                                                                         |
| 11  | Undead Normal AI | fought at the enemy's village in its opening; units before every economy technology           | villages first; one economy technology its land can use before its second unit; a Zombie garrison and Walls; Banshees walk up; a Zombie moves only with company |
| 12  | Human Normal AI  | struck full Zombies hand to hand with shooters in range; built no Captain with Bitten units   | the shots first; the Captain when a unit is Bitten                                                                                                              |
| 13  | Text and events  | a curing Tend was shown to its owner only; the Land Grant line gave an old price              | a curing Tend is shown to whoever sees it; the price as charged; what Muster counts; why a Guard strikes back hard                                              |

No number of the Undead roster changed: every price, HP, Attack, Defense,
Move, and range is as it was. Bones is one role mechanic (the
`rangedDefense2` of the Human Guard's Open to ranged, set above the
Defense instead of below); Escape and Infect are role abilities that
existed (`ESCAPE`, `INFECT`). No command, event, state, or view shape
changed. The identity is `pulp-wars-poc-7r51`; `7r50` joins the prior
identities and its autosave key the obsolete ones, as in every bump.

Unchanged on purpose: the Zombie (Infect, Bite, 18 HP, no attack after a
Move), Bitten, the Banshee and Wail, Devour, Restless, and every shared
rule of the Human pass. (As first written this list also had Plague, the
Lich, the Ghoul, the Necromancer, and every technology of the tree: the
correction changed those four and gave Explosives the Pestilence unlock.)

### 1.1 Decisions that are forks, for the user to overrule

Each is implemented as stated; the alternative is what to ask for.

1. **Bones is Defense 3, one point above the Skeleton's own.** It is the
   smallest number that changes the count: a Marksman needs three shots for
   a Skeleton instead of two. Defense 4 needs the same three shots and
   lowers a Catapult's hit from 7 to 6. The alternative is no rule at all
   and a Skeleton that is a Fighter with 2 HP less.
2. **The Vampire has Escape.** The alternatives were a price of 7 or 8
   Coins, an attack again after a kill (the Knight's Overrun under another
   name, which the Undead tree leaves out on purpose), or nothing. A price
   does not give it a job; Escape makes it the unit that reaches a
   Catapult or finishes a wounded unit and is not there in the enemy's
   turn. It is the change most likely to need a correction after hand play
   ([section 12](#12-what-is-still-open)). **After hand play it is still
   a fork: the two testers who played Vampires disagree**
   ([section 13.8](#138-open-forks-and-ideas-with-the-testers-evidence)).
3. **The Abomination infects and does not bite, and does not advance.** A
   unit that survives its hit is not Bitten. The alternatives: Bite as
   well (every survivor of a 40-HP unit's hit would rise later), or a
   plain heal as the Troll has. It is given once a game, in the first
   capital, at level 5.
4. **Scouts for the Undead** gives a Ghoul (3 Coins against the
   Stockpile's 4).
5. **The Lich was not changed**, though by rule it is a Catapult with
   splash, Plague, and twice the Defense for the same 8 Coins
   ([section 3](#3-every-undead-unit)). The prepared answer, if hand play
   says one Lich after another is all an Undead player buys: **Plague
   needs Explosives**, shown as _Pestilence_ in the Undead tree (the five
   later factions have that node renamed already). It moves the strongest
   ability two technologies later without weakening it, and gives the
   Undead a reason for the end of the Industry branch. **Done in the
   correction** ([section 13.2](#132-plague-needs-pestilence)).
6. **The Zombie's Infect and Bite stay at Drill**, a first-tier
   technology. No game and no scenario shows the wave too strong too
   early: the opposite ([section 2.1](#21-what-the-numbers-say)).
7. **The Ghoul got no rule of its own.** Devour is its mechanic and
   Scouts now puts one in every Undead game. If it is still not bought,
   the proposal is **Carrion**: +1 Attack against a Bitten or Plagued
   unit, which makes it the unit that finishes what a Zombie or a Lich
   has marked ([section 5](#5-what-makes-each-unit-different)). **Done
   in the correction** ([section 13.4](#134-the-ghouls-carrion)).
8. **The Banshee was not changed.** One report called it dead weight and
   the next decisive; the difference was the AI
   ([section 8](#8-the-normal-ai)).
9. **The Undead get no unit at Engineering and no twin of the Guard's
   weakness.** The Zombie has Defense 2 at every distance and falls to
   four Marksman shots.
10. **No economy rule.** Restless stays, and the Undead economy is the
    shared one; what the faction has instead is units that cost nothing
    and (since the correction) need no slot
    ([section 4.2](#42-the-undead-economy)).
11. **The Undead AI still researches the Zombie first.** The alternative
    is the Banshee first, which buys Hunting three rounds earlier and with
    it the Game around its capital
    ([section 8.2](#82-two-diagnostic-matches)).

## 2. Scenario analysis

### 2.0 Numbers from the script

`npx tsx scripts/undead-tuning-analysis-v7.ts` prints what follows at
`7r51`, with the same tables for Forest cover and a Field Defense, the
Undead against the Goblins and against themselves, and the technology
list. Each cell is the damage dealt / the damage taken in a first attack
with both units at full HP, then × the number of attacks by fresh full-HP
attackers that kill; `f` is the damage with Frenzy (Rally for a Human
unit, WAAAGH! for a Goblin one); `K` is a kill of the full-HP defender. A
Banshee has no attack: its cell is its Wail on that unit from two tiles.
The tables are those of the corrected rules: a Ghoul marked (Carrion)
attacks a Bitten unit, and no Lich in the tables plagues (no seat in them
has Explosives). In the scenarios a Lich plagues where the title says
"with Pestilence".

#### Undead attackers on Human units

**Open ground**

| Attacker (cost, HP, Atk/Def)          | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------- | --------------- | ------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Skeleton (2c, 10, 2/2)                | 5/5 ×3; f 8     | 4/8 ×4; f 7   | 6/2 ×2; f 10    | 6/2 ×2; f 10     | 6/2 ×2; f 10K   | 4/6 ×3; f 7       | 7/0 ×2; f 10K    | 6/2 ×2; f 10    | 3/10 ×10; f 6      |
| Ghoul (3c, 10, 2/1)                   | 5/5 ×3; f 8     | 4/8 ×4; f 7   | 6/2 ×2; f 10    | 6/2 ×2; f 10     | 6/2 ×2; f 10K   | 4/6 ×3; f 7       | 7/0 ×2; f 10K    | 6/2 ×2; f 10    | 3/10 ×10; f 6      |
| Ghoul (Charge) (3c, 10, 2/1)          | 8/4 ×2; f 12K   | 7/7 ×3; f 10  | 10/1 ×2; f 12K  | 10/1 ×2; f 12K   | 10K/0 ×1; f 10K | 7/5 ×2; f 11      | 10K/0 ×1; f 10K  | 10/1 ×2; f 13K  | 6/10 ×6; f 9       |
| Ghoul (Carrion) (3c, 10, 2/1)         | 8/4 ×2; f 12K   | 7/7 ×3; f 10  | 10/1 ×2; f 12K  | 10/1 ×2; f 12K   | 10K/0 ×1; f 10K | 7/5 ×2; f 11      | 10K/0 ×1; f 10K  | 10/1 ×2; f 13K  | 6/10 ×6; f 9       |
| Ghoul (Charge, Carrion) (3c, 10, 2/1) | 12K/0 ×1; f 12K | 10/6 ×2; f 14 | 12K/0 ×1; f 12K | 12K/0 ×1; f 12K  | 10K/0 ×1; f 10K | 11/4 ×2; f 15K    | 10K/0 ×1; f 10K  | 13K/0 ×1; f 13K | 9/9 ×4; f 13       |
| Banshee (3c, 8, 1/1)                  | wail 2          | wail 2        | wail 2          | wail 2           | wail 2          | wail 1            | wail 3           | wail 2          | wail 1             |
| Zombie (3c, 18, 2/2)                  | 5/5 ×3; f 8     | 4/8 ×4; f 7   | 6/2 ×2; f 10    | 6/2 ×2; f 10     | 6/2 ×2; f 10K   | 4/6 ×3; f 7       | 7/0 ×2; f 10K    | 6/2 ×2; f 10    | 3/12 ×10; f 6      |
| Necromancer (5c, 10, 1/1)             | 2/6 ×6          | 1/10 ×11      | 2/2 ×5          | 2/2 ×5           | 2/2 ×4          | 1/8 ×9            | 3/0 ×3           | 2/2 ×5          | 1/10 ×29           |
| Lich (8c, 10, 3/1)                    | 8/0 ×2          | 10/0 ×2       | 10/0 ×2         | 10/0 ×2          | 10K/0 ×1        | 7/0 ×2            | 10K/0 ×1         | 10/0 ×2         | 6/0 ×6             |
| Vampire (9c, 10, 3/1)                 | 8/0 ×2; f 12K   | 7/0 ×3; f 10  | 10/0 ×2; f 12K  | 10/0 ×2; f 12K   | 10K/0 ×1; f 10K | 7/0 ×2; f 11      | 10K/0 ×1; f 10K  | 10/0 ×2; f 13K  | 6/0 ×6; f 9        |
| Abomination (—c, 40, 4/4)             | 12K/0 ×1; f 12K | 10/6 ×2; f 14 | 12K/0 ×1; f 12K | 12K/0 ×1; f 12K  | 10K/0 ×1; f 10K | 11/4 ×2; f 15K    | 10K/0 ×1; f 10K  | 13K/0 ×1; f 13K | 9/9 ×4; f 13       |

**Walled city center (+2 Defense), the attacker without Explosives**

| Attacker (cost, HP, Atk/Def)          | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp |
| ------------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ----------------- | ---------------- | -------------- | ------------------ |
| Skeleton (2c, 10, 2/2)                | 3/5 ×3; f 6     | 3/8 ×5; f 5   | 4/2 ×3; f 7    | 4/2 ×3; f 7      | 4/2 ×3; f 7     | 3/6 ×4; f 5       | 4/0 ×3; f 7      | 4/2 ×3; f 7    | 2/10 ×12; f 5      |
| Ghoul (3c, 10, 2/1)                   | 3/5 ×3; f 6     | 3/8 ×5; f 5   | 4/2 ×3; f 7    | 4/2 ×3; f 7      | 4/2 ×3; f 7     | 3/6 ×4; f 5       | 4/0 ×3; f 7      | 4/2 ×3; f 7    | 2/10 ×12; f 5      |
| Ghoul (Charge) (3c, 10, 2/1)          | 6/4 ×2; f 9     | 5/7 ×3; f 8   | 7/1 ×2; f 10   | 7/1 ×2; f 10     | 7/1 ×2; f 10K   | 5/5 ×3; f 8       | 7/0 ×2; f 10K    | 7/1 ×2; f 10   | 5/10 ×7; f 7       |
| Ghoul (Carrion) (3c, 10, 2/1)         | 6/4 ×2; f 9     | 5/7 ×3; f 8   | 7/1 ×2; f 10   | 7/1 ×2; f 10     | 7/1 ×2; f 10K   | 5/5 ×3; f 8       | 7/0 ×2; f 10K    | 7/1 ×2; f 10   | 5/10 ×7; f 7       |
| Ghoul (Charge, Carrion) (3c, 10, 2/1) | 9/3 ×2; f 12K   | 8/6 ×2; f 11  | 10/1 ×2; f 12K | 10/1 ×2; f 12K   | 10K/0 ×1; f 10K | 8/4 ×2; f 12      | 10K/0 ×1; f 10K  | 10/1 ×2; f 13K | 7/9 ×5; f 10       |
| Banshee (3c, 8, 1/1)                  | wail 1          | wail 1        | wail 1         | wail 1           | wail 1          | wail 1            | wail 1           | wail 1         | wail 1             |
| Zombie (3c, 18, 2/2)                  | 3/5 ×3; f 6     | 3/8 ×5; f 5   | 4/2 ×3; f 7    | 4/2 ×3; f 7      | 4/2 ×3; f 7     | 3/6 ×4; f 5       | 4/0 ×3; f 7      | 4/2 ×3; f 7    | 2/12 ×12; f 5      |
| Necromancer (5c, 10, 1/1)             | 1/6 ×9          | 1/10 ×14      | 1/2 ×8         | 1/2 ×8           | 1/2 ×7          | 1/8 ×12           | 1/0 ×6           | 1/2 ×9         | 1/10 ×∞            |
| Lich (8c, 10, 3/1)                    | 6/0 ×2          | 7/0 ×3        | 7/0 ×2         | 7/0 ×2           | 7/0 ×2          | 5/0 ×3            | 7/0 ×2           | 7/0 ×2         | 5/0 ×7             |
| Vampire (9c, 10, 3/1)                 | 6/0 ×2; f 9     | 5/0 ×3; f 8   | 7/0 ×2; f 10   | 7/0 ×2; f 10     | 7/0 ×2; f 10K   | 5/0 ×3; f 8       | 7/0 ×2; f 10K    | 7/0 ×2; f 10   | 5/0 ×7; f 7        |
| Abomination (—c, 40, 4/4)             | 9/3 ×2; f 12K   | 8/6 ×2; f 11  | 10/1 ×2; f 12K | 10/1 ×2; f 12K   | 10K/0 ×1; f 10K | 8/4 ×2; f 12      | 10K/0 ×1; f 10K  | 10/1 ×2; f 13K | 7/9 ×5; f 10       |

#### Undead attackers on Goblin units

**Open ground**

| Attacker (cost, HP, Atk/Def)          | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Skeleton (2c, 10, 2/2)                | 6K/0 ×1; f 6K | 6/2 ×2; f 10K      | 6/0 ×2; f 8K        | 4/6 ×3; f 7       | 6/2 ×2; f 10        | 7/0 ×2; f 8K       | 6/2 ×2; f 10K       | 4/8 ×9; f 7   |
| Ghoul (3c, 10, 2/1)                   | 6K/0 ×1; f 6K | 6/2 ×2; f 10K      | 6/0 ×2; f 8K        | 4/6 ×3; f 7       | 6/2 ×2; f 10        | 7/0 ×2; f 8K       | 6/2 ×2; f 10K       | 4/8 ×9; f 7   |
| Ghoul (Charge) (3c, 10, 2/1)          | 6K/0 ×1; f 6K | 10K/0 ×1; f 10K    | 8K/0 ×1; f 8K       | 7/5 ×2; f 11      | 10/1 ×2; f 12K      | 8K/0 ×1; f 8K      | 10K/0 ×1; f 10K     | 7/7 ×5; f 10  |
| Ghoul (Carrion) (3c, 10, 2/1)         | 6K/0 ×1; f 6K | 10K/0 ×1; f 10K    | 8K/0 ×1; f 8K       | 7/5 ×2; f 11      | 10/1 ×2; f 12K      | 8K/0 ×1; f 8K      | 10K/0 ×1; f 10K     | 7/7 ×5; f 10  |
| Ghoul (Charge, Carrion) (3c, 10, 2/1) | 6K/0 ×1; f 6K | 10K/0 ×1; f 10K    | 8K/0 ×1; f 8K       | 11/4 ×2; f 15K    | 12K/0 ×1; f 12K     | 8K/0 ×1; f 8K      | 10K/0 ×1; f 10K     | 10/6 ×4; f 14 |
| Banshee (3c, 8, 1/1)                  | wail 3        | wail 2             | wail 2              | wail 1            | wail 2              | wail 3             | wail 2              | wail 1        |
| Zombie (3c, 18, 2/2)                  | 6K/0 ×1; f 6K | 6/2 ×2; f 10K      | 6/0 ×2; f 8K        | 4/6 ×3; f 7       | 6/2 ×2; f 10        | 7/0 ×2; f 8K       | 6/2 ×2; f 10K       | 4/8 ×9; f 7   |
| Necromancer (5c, 10, 1/1)             | 3/1 ×2        | 2/2 ×4             | 2/0 ×3              | 1/8 ×9            | 2/2 ×5              | 3/0 ×3             | 2/2 ×4              | 1/10 ×26      |
| Lich (8c, 10, 3/1)                    | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 7/0 ×2            | 10/0 ×2             | 8K/0 ×1            | 10K/0 ×1            | 7/0 ×5        |
| Vampire (9c, 10, 3/1)                 | 6K/0 ×1; f 6K | 10K/0 ×1; f 10K    | 8K/0 ×1; f 8K       | 7/0 ×2; f 11      | 10/0 ×2; f 12K      | 8K/0 ×1; f 8K      | 10K/0 ×1; f 10K     | 7/0 ×5; f 10  |
| Abomination (—c, 40, 4/4)             | 6K/0 ×1; f 6K | 10K/0 ×1; f 10K    | 8K/0 ×1; f 8K       | 11/4 ×2; f 15K    | 12K/0 ×1; f 12K     | 8K/0 ×1; f 8K      | 10K/0 ×1; f 10K     | 10/6 ×4; f 14 |

#### The Banshee's Wail

A Banshee's Wail on one full-HP unit two tiles away (every hostile living unit within two tiles takes its own number at once; nothing answers). Full-HP Banshee / a Banshee at 4 of 8 HP.

| Target                             | open  | Forest | Field Defense | walled center |
| ---------------------------------- | ----- | ------ | ------------- | ------------- |
| Fighter (Human, 12hp, Def 2)       | 2 / 1 | 1 / 1  | 1 / 1         | 1 / 1         |
| Guard (Human, 17hp, Def 3)         | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Raider (Human, 12hp, Def 1)        | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Marksman (Human, 12hp, Def 1)      | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Captain (Human, 10hp, Def 1)       | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Swordsman (Human, 15hp, Def 2.5)   | 1 / 1 | 1 / 1  | 1 / 0         | 1 / 0         |
| Catapult (Human, 10hp, Def 0.5)    | 3 / 2 | 3 / 2  | 1 / 1         | 1 / 1         |
| Knight (Human, 13hp, Def 1)        | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Juggernaut (Human, 40hp, Def 4)    | 1 / 1 | 1 / 0  | 1 / 0         | 1 / 0         |
| Goblin (Goblin, 6hp, Def 0.5)      | 3 / 2 | 3 / 2  | 1 / 1         | 1 / 1         |
| Wolf Rider (Goblin, 10hp, Def 1)   | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Bomb Chucker (Goblin, 8hp, Def 1)  | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Orc Brute (Goblin, 15hp, Def 2.5)  | 1 / 1 | 1 / 1  | 1 / 0         | 1 / 0         |
| Orc Warboss (Goblin, 12hp, Def 1)  | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Rocket Cart (Goblin, 8hp, Def 0.5) | 3 / 2 | 3 / 2  | 1 / 1         | 1 / 1         |
| Scrap Buggy (Goblin, 10hp, Def 1)  | 2 / 2 | 2 / 1  | 1 / 1         | 1 / 1         |
| Troll (Goblin, 40hp, Def 3)        | 1 / 1 | 1 / 0  | 1 / 0         | 1 / 0         |

#### Human attackers on Undead units

**Open ground**

| Attacker (cost, HP, Atk/Def)  | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ----------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Fighter (2c, 12, 2/2)         | 5/5 ×2; f 8      | 6/2 ×2; f 10K   | 6/0 ×2; f 8K   | 5/5 ×4; f 8    | 6/2 ×2; f 10K       | 6/0 ×2; f 10K   | 6/2 ×2; f 10K   | 3/12 ×10; f 6       |
| Guard (3c, 17, 1.5/3)         | 3/5 ×3; f 6      | 4/2 ×3; f 8     | 4/0 ×2; f 8K   | 3/5 ×5; f 6    | 4/2 ×3; f 8         | 4/0 ×3; f 8     | 4/2 ×3; f 8     | 2/13 ×15; f 4       |
| Raider (4c, 12, 2/1)          | 5/5 ×2; f 8      | 6/2 ×2; f 10K   | 6/0 ×2; f 8K   | 5/5 ×4; f 8    | 6/2 ×2; f 10K       | 6/0 ×2; f 10K   | 6/2 ×2; f 10K   | 3/12 ×10; f 6       |
| Raider (Charge) (4c, 12, 2/1) | 8/4 ×2; f 10K    | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 8/4 ×2; f 12   | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 6/10 ×6; f 9        |
| Marksman (4c, 12, 2/1)        | 4/0 ×3; f 7      | 6/0 ×2; f 10K   | 6/0 ×2; f 8K   | 5/0 ×4; f 8    | 6/0 ×2; f 10K       | 6/2 ×2; f 10K   | 6/0 ×2; f 10K   | 3/0 ×10; f 6        |
| Captain (5c, 10, 1/1)         | 2/6 ×5           | 2/2 ×4          | 2/0 ×3         | 2/6 ×8         | 2/2 ×4              | 2/0 ×4          | 2/2 ×4          | 1/10 ×29            |
| Swordsman (5c, 15, 3.5/2.5)   | 10K/0 ×1; f 10K  | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 10/3 ×2; f 14  | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 7/10 ×5; f 11       |
| Catapult (8c, 10, 3/0.5)      | 7/0 ×2           | 10K/0 ×1        | 8K/0 ×1        | 8/0 ×2         | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 6/0 ×6              |
| Knight (9c, 13, 4/1)          | 10K/0 ×1; f 10K  | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 12/3 ×2; f 16  | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 9/9 ×4; f 13        |
| Juggernaut (—c, 40, 4/4)      | 10K/0 ×1; f 10K  | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 12/3 ×2; f 16  | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 9/9 ×4; f 13        |

**Walled city center (+2 Defense), the attacker without Explosives**

| Attacker (cost, HP, Atk/Def)  | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ----------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Fighter (2c, 12, 2/2)         | 3/5 ×3; f 6      | 4/2 ×3; f 7     | 4/0 ×2; f 7    | 3/5 ×5; f 6    | 4/2 ×3; f 7         | 4/0 ×3; f 7     | 4/2 ×3; f 7     | 2/12 ×12; f 5       |
| Guard (3c, 17, 1.5/3)         | 2/5 ×4; f 4      | 2/2 ×4; f 5     | 2/0 ×3; f 5    | 2/5 ×7; f 4    | 2/2 ×4; f 5         | 2/0 ×4; f 5     | 2/2 ×4; f 5     | 1/13 ×19; f 3       |
| Raider (4c, 12, 2/1)          | 3/5 ×3; f 6      | 4/2 ×3; f 7     | 4/0 ×2; f 7    | 3/5 ×5; f 6    | 4/2 ×3; f 7         | 4/0 ×3; f 7     | 4/2 ×3; f 7     | 2/12 ×12; f 5       |
| Raider (Charge) (4c, 12, 2/1) | 6/4 ×2; f 9      | 7/1 ×2; f 10K   | 7/0 ×2; f 8K   | 6/4 ×3; f 9    | 7/1 ×2; f 10K       | 7/0 ×2; f 10K   | 7/1 ×2; f 10K   | 5/10 ×7; f 7        |
| Marksman (4c, 12, 2/1)        | 3/0 ×3; f 5      | 4/0 ×3; f 7     | 4/0 ×2; f 7    | 3/0 ×5; f 6    | 4/0 ×3; f 7         | 4/2 ×3; f 7     | 4/0 ×3; f 7     | 2/0 ×12; f 5        |
| Captain (5c, 10, 1/1)         | 1/6 ×8           | 1/2 ×7          | 1/0 ×6         | 1/6 ×13        | 1/2 ×7              | 1/0 ×7          | 1/2 ×7          | 1/10 ×∞             |
| Swordsman (5c, 15, 3.5/2.5)   | 7/3 ×2; f 10K    | 8/1 ×2; f 10K   | 8K/0 ×1; f 8K  | 7/3 ×3; f 11   | 8/1 ×2; f 10K       | 8/0 ×2; f 10K   | 8/1 ×2; f 10K   | 6/10 ×6; f 9        |
| Catapult (8c, 10, 3/0.5)      | 5/0 ×2           | 7/0 ×2          | 7/0 ×2         | 6/0 ×3         | 7/0 ×2              | 7/1 ×2          | 7/0 ×2          | 5/0 ×7              |
| Knight (9c, 13, 4/1)          | 9/3 ×2; f 10K    | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 9/3 ×2; f 13   | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 7/9 ×5; f 10        |
| Juggernaut (—c, 40, 4/4)      | 9/3 ×2; f 10K    | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 9/3 ×2; f 13   | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 7/9 ×5; f 10        |

#### Goblin attackers on Undead units

**Open ground**

| Attacker (cost, HP, Atk/Def)      | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| --------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Goblin (1c, 6, 1.5/0.5)           | 3/5 ×3; f 6      | 4/2 ×3; f 8     | 4/0 ×2; f 8K   | 3/5 ×5; f 6    | 4/2 ×3; f 8         | 4/0 ×3; f 8     | 4/2 ×3; f 8     | 2/6 ×15; f 4        |
| Wolf Rider (3c, 10, 2/1)          | 5/5 ×2; f 8      | 6/2 ×2; f 10K   | 6/0 ×2; f 8K   | 5/5 ×4; f 8    | 6/2 ×2; f 10K       | 6/0 ×2; f 10K   | 6/2 ×2; f 10K   | 3/10 ×10; f 6       |
| Wolf Rider (Charge) (3c, 10, 2/1) | 8/4 ×2; f 10K    | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 8/4 ×2; f 12   | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 6/10 ×6; f 9        |
| Bomb Chucker (3c, 8, 2/1)         | 4/0 ×3; f 7      | 6/0 ×2; f 10K   | 6/0 ×2; f 8K   | 5/0 ×4; f 8    | 6/0 ×2; f 10K       | 6/2 ×2; f 10K   | 6/0 ×2; f 10K   | 3/0 ×10; f 6        |
| Orc Brute (3c, 15, 2/2.5)         | 5/5 ×2; f 8      | 6/2 ×2; f 10K   | 6/0 ×2; f 8K   | 5/5 ×4; f 8    | 6/2 ×2; f 10K       | 6/0 ×2; f 10K   | 6/2 ×2; f 10K   | 3/12 ×10; f 6       |
| Orc Warboss (5c, 12, 2/1)         | 5/5 ×2           | 6/2 ×2          | 6/0 ×2         | 5/5 ×4         | 6/2 ×2              | 6/0 ×2          | 6/2 ×2          | 3/12 ×10            |
| Rocket Cart (7c, 8, 3.5/0.5)      | 8/0 ×2; f 10K    | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 10/0 ×2; f 14  | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 7/0 ×5; f 11        |
| Scrap Buggy (8c, 10, 3/1)         | 8/4 ×2; f 10K    | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 8/4 ×2; f 12   | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 6/10 ×6; f 9        |
| Troll (—c, 40, 4/3)               | 10K/0 ×1; f 10K  | 10K/0 ×1; f 10K | 8K/0 ×1; f 8K  | 12/3 ×2; f 16  | 10K/0 ×1; f 10K     | 10K/0 ×1; f 10K | 10K/0 ×1; f 10K | 9/9 ×4; f 13        |

#### Scenarios

`play` scenarios list their commands; the Zombie wave is played whole
turns by a fixed script that the title states (every unit attacks the
enemy it kills, else the one it damages most; "hit only to kill" and
"step back" are as they read). It is a script, not the AI.

**The Zombie wave**

- **Five Zombies walk into five Fighters that stand and fight (15 Coins against 10; the Undead move first, two tiles away)**
  - Start: Undead Zombie ×5 (18, 18, 18, 18, 18); Humans Fighter ×5 (12, 12, 12, 12, 12).
  - Undead, turn 1: 0 attacks, 0 damage, 0 kills, 4 moves. Undead: Zombie ×5 (18, 18, 18, 18, 18). Humans: Fighter ×5 (12, 12, 12, 12, 12).
  - Humans, turn 1: 5 attacks, 25 damage, 0 kills. Undead: Zombie ×5 (8, 13, 18, 13, 13). Humans: Fighter ×5 (7, 8, 7, 7, 7).
  - Undead, turn 2: 4 attacks, 17 damage, 1 kills, 3 bites, 1 risen. Undead: Zombie ×6 (3, 13, 18, 9, 9, 10). Humans: Fighter ×4 (3, 2, 7, 7).
  - Humans, turn 2: 3 attacks, 13 damage, 1 kills. Undead: Zombie ×5 (13, 18, 4, 4, 10). Humans: Fighter ×4 (3, 2, 3, 3).
  - Undead, turn 3: 4 attacks, 13 damage, 4 kills, 4 risen, 1 moves. Undead: Zombie ×9 (13, 18, 4, 4, 10, 10, 10, 10, 10). Humans: nothing.
- **The same five Zombies into three Fighters with three Marksmen behind them (15 Coins against 18): the Fighters hit only to kill, the Marksmen shoot, nobody steps back**
  - Start: Undead Zombie ×5 (18, 18, 18, 18, 18); Humans Fighter ×3 (12, 12, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 1: 0 attacks, 0 damage, 0 kills, 4 moves. Undead: Zombie ×5 (18, 18, 18, 18, 18). Humans: Fighter ×3 (12, 12, 12), Marksman ×3 (12, 12, 12).
  - Humans, turn 1: 3 attacks, 16 damage, 0 kills. Undead: Zombie ×5 (2, 18, 18, 18, 18). Humans: Fighter ×3 (12, 12, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 2: 3 attacks, 16 damage, 0 kills, 3 bites. Undead: Zombie ×5 (2, 13, 15, 18, 13). Humans: Fighter ×3 (1, 7, 12), Marksman ×3 (12, 12, 12).
  - Humans, turn 2: 4 attacks, 18 damage, 1 kills. Undead: Zombie ×4 (2, 10, 18, 13). Humans: Fighter ×3 (1, 7, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 3: 3 attacks, 10 damage, 2 kills, 1 bites, 2 risen. Undead: Zombie ×6 (2, 5, 18, 13, 10, 10). Humans: Fighter ×1 (12), Marksman ×3 (12, 12, 12).
  - Humans, turn 3: 4 attacks, 17 damage, 3 kills. Undead: Zombie ×3 (18, 13, 10). Humans: Fighter ×1 (12), Marksman ×3 (12, 12, 12).
  - Undead, turn 4: 3 attacks, 12 damage, 1 kills, 2 bites, 1 risen. Undead: Zombie ×4 (13, 9, 10, 10). Humans: Marksman ×3 (12, 12, 12).
  - Humans, turn 4: 3 attacks, 15 damage, 1 kills. Undead: Zombie ×3 (13, 10, 4). Humans: Marksman ×3 (12, 12, 12).
  - Undead, turn 5: 1 attacks, 5 damage, 0 kills, 1 bites, 2 moves. Undead: Zombie ×3 (13, 8, 4). Humans: Marksman ×3 (7, 12, 12).
  - Humans, turn 5: 3 attacks, 12 damage, 2 kills. Undead: Zombie ×1 (13). Humans: Marksman ×3 (7, 9, 12).
  - Undead, turn 6: 0 attacks, 0 damage, 0 kills, 1 moves. Undead: Zombie ×1 (13). Humans: Marksman ×3 (7, 9, 12).
  - Humans, turn 6: 3 attacks, 13 damage, 1 kills. Undead: nothing. Humans: Marksman ×3 (2, 5, 12).
- **Five Zombies into six Marksmen that step back from a Zombie beside them and shoot (15 Coins against 24)**
  - Start: Undead Zombie ×5 (18, 18, 18, 18, 18); Humans Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 1: 0 attacks, 0 damage, 0 kills, 3 moves. Undead: Zombie ×5 (18, 18, 18, 18, 18). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 1: 5 attacks, 26 damage, 0 kills. Undead: Zombie ×5 (2, 13, 13, 18, 18). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 2: 0 attacks, 0 damage, 0 kills, 2 moves. Undead: Zombie ×5 (2, 13, 13, 18, 18). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 2: 5 attacks, 20 damage, 2 kills, 3 moves. Undead: Zombie ×3 (8, 18, 18). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 3: 0 attacks, 0 damage, 0 kills, 3 moves. Undead: Zombie ×3 (8, 18, 18). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 3: 4 attacks, 18 damage, 1 kills, 1 moves. Undead: Zombie ×2 (13, 13). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 4: 0 attacks, 0 damage, 0 kills, 2 moves. Undead: Zombie ×2 (13, 13). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 4: 4 attacks, 18 damage, 1 kills, 2 moves. Undead: Zombie ×1 (8). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 5: 0 attacks, 0 damage, 0 kills, 1 moves. Undead: Zombie ×1 (8). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 5: 2 attacks, 8 damage, 1 kills, 1 moves. Undead: nothing. Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
- **Three Zombies and four Skeletons (17 Coins) into three Fighters and three Marksmen (18 Coins), who shoot and hit only to kill**
  - Start: Undead Zombie ×3 (18, 18, 18), Skeleton ×4 (10, 10, 10, 10); Humans Fighter ×3 (12, 12, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 1: 0 attacks, 0 damage, 0 kills, 5 moves. Undead: Zombie ×3 (18, 18, 18), Skeleton ×4 (10, 10, 10, 10). Humans: Fighter ×3 (12, 12, 12), Marksman ×3 (12, 12, 12).
  - Humans, turn 1: 3 attacks, 16 damage, 0 kills. Undead: Zombie ×3 (2, 18, 18), Skeleton ×4 (10, 10, 10, 10). Humans: Fighter ×3 (12, 12, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 2: 2 attacks, 11 damage, 0 kills, 1 bites, 1 moves. Undead: Zombie ×3 (2, 13, 18), Skeleton ×4 (7, 10, 10, 10). Humans: Fighter ×3 (1, 12, 12), Marksman ×3 (12, 12, 12).
  - Humans, turn 2: 4 attacks, 15 damage, 2 kills. Undead: Zombie ×1 (18), Skeleton ×4 (7, 10, 10, 10). Humans: Fighter ×3 (1, 12, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 3: 2 attacks, 6 damage, 1 kills, 1 risen, 3 moves. Undead: Zombie ×2 (18, 10), Skeleton ×4 (7, 10, 5, 10). Humans: Fighter ×2 (7, 12), Marksman ×3 (12, 12, 12).
  - Humans, turn 3: 4 attacks, 20 damage, 2 kills. Undead: Zombie ×1 (13), Skeleton ×3 (7, 10, 10). Humans: Fighter ×2 (7, 12), Marksman ×3 (12, 12, 12).
  - Undead, turn 4: 3 attacks, 12 damage, 1 kills, 1 bites, 1 risen, 2 moves. Undead: Zombie ×2 (9, 10), Skeleton ×3 (5, 10, 10). Humans: Fighter ×1 (12), Marksman ×3 (7, 12, 12).
  - Humans, turn 4: 3 attacks, 14 damage, 2 kills. Undead: Skeleton ×2 (10, 10), Zombie ×1 (10). Humans: Fighter ×1 (12), Marksman ×3 (7, 12, 12).
  - Undead, turn 5: 3 attacks, 16 damage, 1 kills, 1 bites, 2 moves. Undead: Skeleton ×2 (10, 5), Zombie ×1 (5). Humans: Fighter ×1 (3), Marksman ×2 (12, 12).
  - Humans, turn 5: 2 attacks, 10 damage, 2 kills. Undead: Skeleton ×1 (10). Humans: Fighter ×1 (3), Marksman ×2 (12, 12).
  - Undead, turn 6: 1 attacks, 6 damage, 0 kills. Undead: Skeleton ×1 (8). Humans: Fighter ×1 (5), Marksman ×2 (6, 12).
  - Humans, turn 6: 1 attacks, 4 damage, 0 kills. Undead: Skeleton ×1 (4). Humans: Fighter ×1 (5), Marksman ×2 (6, 12).
- **Seven Skeletons (14 Coins) into six Marksmen that step back and shoot (24 Coins)**
  - Start: Undead Skeleton ×7 (10, 10, 10, 10, 10, 10, 10); Humans Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 1: 0 attacks, 0 damage, 0 kills, 5 moves. Undead: Skeleton ×7 (10, 10, 10, 10, 10, 10, 10). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 1: 6 attacks, 22 damage, 1 kills. Undead: Skeleton ×6 (6, 6, 10, 10, 6, 10). Humans: Marksman ×6 (12, 12, 12, 12, 12, 12).
  - Undead, turn 2: 4 attacks, 22 damage, 0 kills, 5 moves. Undead: Skeleton ×6 (4, 5, 10, 10, 4, 8). Humans: Marksman ×6 (1, 12, 7, 6, 12, 12).
  - Humans, turn 2: 6 attacks, 21 damage, 4 kills, 6 moves. Undead: Skeleton ×2 (10, 10). Humans: Marksman ×6 (1, 12, 7, 6, 12, 12).
  - Undead, turn 3: 0 attacks, 0 damage, 0 kills, 1 moves. Undead: Skeleton ×2 (10, 10). Humans: Marksman ×6 (1, 12, 7, 6, 12, 12).
  - Humans, turn 3: 4 attacks, 10 damage, 1 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (1, 12, 7, 6, 12, 12).
  - Undead, turn 4: 0 attacks, 0 damage, 0 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (1, 12, 7, 6, 12, 12).
  - Humans, turn 4: 0 attacks, 0 damage, 0 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (1, 12, 7, 6, 12, 12).
  - Undead, turn 5: 0 attacks, 0 damage, 0 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (3, 12, 9, 8, 12, 12).
  - Humans, turn 5: 0 attacks, 0 damage, 0 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (3, 12, 9, 8, 12, 12).
  - Undead, turn 6: 0 attacks, 0 damage, 0 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (5, 12, 11, 10, 12, 12).
  - Humans, turn 6: 0 attacks, 0 damage, 0 kills. Undead: Skeleton ×1 (10). Humans: Marksman ×6 (5, 12, 11, 10, 12, 12).

**Bite, then kill**

- **A Zombie that stands beside a Fighter bites it; a Skeleton steps up and finishes it**
  - Zombie (18 HP) attacks Fighter (12 HP): deals 5, takes 5, bites
  - Skeleton moves 1 tile: done
  - Skeleton (10 HP) attacks Fighter (7 HP): deals 6, takes 3
  - Skeleton moves 1 tile: done
  - Skeleton (10 HP) attacks Fighter (1 HP): deals 1 (kills), takes 0; Fighter rises as a Zombie of the Undead (it was Bitten)
  - Left: Undead Zombie 13, Skeleton 7, Skeleton 10, Zombie 10; Humans nothing.
- **A Zombie bites a Knight; a Ghoul steps up beside it (one tile: no Charge) and strikes with Carrion; a second Ghoul stands by**
  - Zombie (18 HP) attacks Knight (13 HP): deals 6, takes 2, bites
  - Ghoul moves 1 tile: done
  - Ghoul (10 HP) attacks Knight (7 HP): deals 7 (kills), takes 0; Knight rises as a Zombie of the Undead (it was Bitten)
  - Ghoul moves 2 tiles: done
  - Ghoul: its target is gone
  - Left: Undead Zombie 16, Ghoul 10, Ghoul 10, Zombie 10; Humans nothing.
- **A Zombie bites a wounded Marksman, and a Banshee's Wail finishes it: whatever kills a Bitten unit, it rises**
  - Zombie (18 HP) attacks Marksman (8 HP): deals 7, takes 1, bites
  - Banshee (8 HP) Wails: 1 on Marksman (kills); Marksman rises as a Zombie of the Undead (it was Bitten)
  - Left: Undead Zombie 17, Banshee 8, Zombie 10; Humans nothing.

**The Lich and the Banshees**

- **With Pestilence: a Lich fires at the Swordsman in the middle of a line of five (Guard, Marksman, Swordsman, Fighter, Catapult behind); two Banshees step up and Wail; the Humans do nothing for three turns**
  - Lich (10 HP) attacks Swordsman (15 HP): deals 7, takes 0; splash 4 on Marksman, 4 on Catapult, 4 on Guard, 4 on Fighter; plagues 5
  - Banshee moves 1 tile: done
  - Banshee (8 HP) Wails: 3 on Guard, 2 on Swordsman, 2 on Fighter
  - Banshee moves 1 tile: done
  - Banshee (8 HP) Wails: 3 on Guard, 2 on Swordsman, 2 on Fighter
  - Undead end the turn: Plague: 2 on Marksman, 2 on Catapult, 2 on Guard, 2 on Swordsman, 2 on Fighter
  - _The Humans' turn starts: Plague_
  - Humans end the turn: done
  - Lich (10 HP) attacks Swordsman (4 HP): deals 4 (kills), takes 0; splash 2 on Marksman, 2 on Catapult, 2 on Guard, 2 on Fighter
  - Banshee (8 HP) Wails: 3 on Guard, 2 on Fighter (kills)
  - Banshee (8 HP) Wails: 2 on Guard (kills)
  - Undead end the turn: Plague: 2 on Marksman, 2 on Catapult
  - Humans end the turn: done
  - Lich: its target is gone
  - Banshee (8 HP) Wails: refused (WAIL_NOT_LEGAL)
  - Banshee (8 HP) Wails: refused (WAIL_NOT_LEGAL)
  - Undead end the turn: Plague: 2 on Marksman, 2 on Catapult
  - Left: Undead Lich 10, Banshee 8, Banshee 8; Humans Marksman 4, Catapult 2. Graves: 3.
- **The same without Pestilence (every Lich until its owner has researched Explosives): the shot and the splash, and no Plague**
  - Lich (10 HP) attacks Swordsman (15 HP): deals 7, takes 0; splash 4 on Marksman, 4 on Catapult, 4 on Guard, 4 on Fighter
  - Banshee moves 1 tile: done
  - Banshee (8 HP) Wails: 3 on Guard, 2 on Swordsman, 2 on Fighter
  - Banshee moves 1 tile: done
  - Banshee (8 HP) Wails: 3 on Guard, 2 on Swordsman, 2 on Fighter
  - Undead end the turn: done
  - Humans end the turn: done
  - Lich (10 HP) attacks Swordsman (6 HP): deals 6 (kills), takes 0; splash 3 on Marksman, 3 on Catapult, 3 on Guard, 3 on Fighter
  - Banshee (8 HP) Wails: 3 on Guard, 3 on Fighter (kills)
  - Banshee (8 HP) Wails: 3 on Guard (kills)
  - Undead end the turn: done
  - Humans end the turn: done
  - Lich: its target is gone
  - Banshee (8 HP) Wails: refused (WAIL_NOT_LEGAL)
  - Banshee (8 HP) Wails: refused (WAIL_NOT_LEGAL)
  - Undead end the turn: done
  - Left: Undead Lich 10, Banshee 8, Banshee 8; Humans Marksman 9, Catapult 7. Graves: 3.
- **The Lich alone on the same line, with Pestilence, for three turns (no Banshee)**
  - Lich (10 HP) attacks Swordsman (15 HP): deals 7, takes 0; splash 4 on Marksman, 4 on Catapult, 4 on Guard, 4 on Fighter; plagues 5
  - Undead end the turn: Plague: 2 on Marksman, 2 on Catapult, 2 on Guard, 2 on Swordsman, 2 on Fighter
  - Humans end the turn: done
  - Lich (10 HP) attacks Swordsman (8 HP): deals 8 (kills), takes 0; splash 4 on Marksman, 4 on Catapult, 4 on Guard, 4 on Fighter
  - Undead end the turn: Plague: 2 on Marksman, 2 on Catapult (kills), 2 on Guard, 2 on Fighter
  - Humans end the turn: done
  - Lich: its target is gone
  - Undead end the turn: Plague: 2 on Marksman, 2 on Guard, 2 on Fighter
  - Left: Undead Lich 10; Humans Guard 7, Fighter 2, Marksman 2. Graves: 2.
- **The Lich alone on the same line, without Pestilence, for three turns**
  - Lich (10 HP) attacks Swordsman (15 HP): deals 7, takes 0; splash 4 on Marksman, 4 on Catapult, 4 on Guard, 4 on Fighter
  - Undead end the turn: done
  - Humans end the turn: done
  - Lich (10 HP) attacks Swordsman (10 HP): deals 9, takes 0; splash 5 on Marksman, 5 on Catapult, 5 on Guard, 5 on Fighter
  - Undead end the turn: done
  - Humans end the turn: done
  - Lich (10 HP) attacks Swordsman (3 HP): deals 3 (kills), takes 0; splash 2 on Marksman, 2 on Catapult, 2 on Guard, 2 on Fighter
  - Undead end the turn: done
  - Left: Undead Lich 10; Humans Guard 10, Fighter 5, Marksman 5, Catapult 3. Graves: 1.
- **The same Lich and Banshees on a line of three in a Forest (the Humans own Forestry; with Pestilence)**
  - Lich (10 HP) attacks Swordsman (15 HP): deals 6, takes 0; splash 3 on Guard, 3 on Fighter; plagues 3
  - Banshee (8 HP) Wails: 2 on Guard, 1 on Swordsman, 1 on Fighter
  - Banshee (8 HP) Wails: 2 on Guard, 2 on Swordsman, 2 on Fighter
  - Left: Undead Lich 10, Banshee 8, Banshee 8; Humans Guard 10, Swordsman 6, Fighter 6.
- **A Captain beside the plagued line tends it (cures Plague and bites)**
  - Lich (10 HP) attacks Swordsman (15 HP): deals 7, takes 0; splash 4 on Captain, 4 on Guard, 4 on Fighter; plagues 4
  - Undead end the turn: Plague: 2 on Captain, 2 on Guard, 2 on Swordsman, 2 on Fighter
  - Captain tends the wounded: 3 tended
  - Humans end the turn: done
  - Undead end the turn: Plague: 2 on Captain
  - Left: Undead Lich 10; Humans Guard 15, Swordsman 10, Fighter 10, Captain 2.
- **A Lich (with Pestilence) fires at a Bomb Chucker that stands between two Orc Brutes with a Goblin behind (Blast-proof)**
  - Lich (10 HP) attacks Bomb Chucker (8 HP): deals 8 (kills), takes 0; splash 4 on Goblin; plagues 1; Bomb Chucker explodes for 2: 2 on Goblin (kills)
  - Left: Undead Lich 10; Goblins Orc Brute 15, Orc Brute 15. Graves: 2.
- **A Human Catapult and a Lich in each other's range: whoever fires first**
  - Catapult (10 HP) attacks Lich (10 HP): deals 10 (kills), takes 0
  - Left: Humans Catapult 10; Undead nothing. Graves: 1.

**The Vampire**

- **A Vampire rides round a Fighter and kills the Catapult behind it, and stays where the kill left it (the Vampire before the pass); in the Humans' turn two Marksmen shoot it**
  - Vampire moves 2 tiles: done
  - Vampire (10 HP) attacks Catapult (10 HP): deals 10 (kills), takes 0, advances
  - Undead end the turn: done
  - Marksman moves 1 tile: done
  - Marksman (12 HP) attacks Vampire (10 HP): deals 6, takes 2
  - Marksman (12 HP) attacks Vampire (6 HP): deals 6 (kills), takes 0
  - Left: Undead nothing; Humans Fighter 12, Marksman 10, Marksman 12. Graves: 1.
- **The same strike, and the Vampire flies back three tiles (Escape): no Marksman reaches it**
  - Vampire moves 2 tiles: done
  - Vampire (10 HP) attacks Catapult (10 HP): deals 10 (kills), takes 0, advances
  - Vampire moves 3 tiles: done
  - Undead end the turn: done
  - Marksman moves 1 tile: done
  - Marksman (12 HP) attacks Vampire (10 HP): refused (TARGET_OUT_OF_RANGE)
  - Left: Undead Vampire 10; Humans Fighter 12, Marksman 12, Marksman 12. Graves: 1.
- **A Vampire and a Catapult behind a line without a gap: the first hostile unit it comes beside ends its Move (zone of control), so it strikes the line and flies back**
  - Vampire moves 2 tiles: done
  - Vampire (10 HP) attacks Catapult (10 HP): refused (TARGET_OUT_OF_RANGE)
  - Vampire (10 HP) attacks Fighter (12 HP): deals 8, takes 0
  - Vampire moves 3 tiles: done
  - Left: Undead Vampire 10; Humans Fighter 12, Fighter 4, Fighter 12, Catapult 10.
- **A Vampire at 4 HP drinks: a Swordsman, then (next turn) again**
  - Vampire (4 HP) attacks Swordsman (15 HP): deals 4, takes 0, heals 4
  - Undead end the turn: done
  - Humans end the turn: done
  - Vampire (8 HP) attacks Swordsman (13 HP): deals 7, takes 0, heals 2
  - Left: Undead Vampire 10; Humans Swordsman 6.

**The Necromancer**

- **A Necromancer beside three Graves raises them; next turn it calls Frenzy and the three Skeletons (5 HP) and a Zombie attack two Fighters**
  - Necromancer raises the dead: 3 Skeletons rise
  - Undead end the turn: done
  - Humans end the turn: done
  - Necromancer calls Frenzy: 3 units inspired
  - Skeleton (5 HP) attacks Fighter (12 HP): deals 6, takes 5 (dies), inspired
  - Skeleton (5 HP) attacks Fighter (6 HP): deals 6 (kills), takes 0, inspired, advances
  - Skeleton: its target is gone
  - Zombie (18 HP) attacks Fighter (12 HP): deals 5, takes 5, bites
  - Left: Undead Necromancer 10, Zombie 13, Skeleton 5, Skeleton 5; Humans Fighter 7. Graves: 2.
- **A wounded Ghoul (3 HP) moves two tiles onto a Grave and Devours it**
  - Ghoul moves 2 tiles: done
  - Ghoul (3 HP) Devours: heals 7 (to 10)
  - Left: Undead Ghoul 10; Humans Fighter 12.

**The Human Knight and the Zombies**

- **A Knight rides into three full Zombies standing together**
  - Knight (13 HP) attacks Zombie (18 HP): deals 12, takes 3, is bitten
  - Knight (10 HP) attacks Zombie (18 HP): refused (UNIT_ALREADY_ACTED)
  - Left: Humans Knight 10; Undead Zombie 6, Zombie 18, Zombie 18.
- **A Marksman shoots the first Zombie, then the Knight: Zombie, a Zombie that has just risen (10 HP), a Banshee, a Lich**
  - Marksman (12 HP) attacks Zombie (18 HP): deals 5, takes 0
  - Marksman (12 HP) attacks Zombie (13 HP): deals 5, takes 0
  - Knight (13 HP) attacks Zombie (8 HP): deals 8 (kills), takes 0, advances, attacks again
  - Knight (13 HP) attacks Zombie (10 HP): deals 10 (kills), takes 0, advances, attacks again
  - Knight (13 HP) attacks Banshee (8 HP): deals 8 (kills), takes 0, advances, attacks again
  - Knight (13 HP) attacks Lich (10 HP): deals 10 (kills), takes 0, advances
  - Left: Humans Marksman 12, Marksman 12, Knight 13; Undead nothing. Graves: 4.
- **Three Zombies answer a Knight that stopped beside them (it is bitten, and killed by the third: it rises)**
  - Zombie (6 HP) attacks Knight (10 HP): deals 4, takes 2, bites
  - Zombie (18 HP) attacks Knight (6 HP): deals 6 (kills), takes 0; Knight rises as a Zombie of the Undead
  - Zombie: its target is gone
  - Left: Undead Zombie 4, Zombie 18, Zombie 18, Zombie 10; Humans nothing.

**Goblins against Zombies**

- **Three Bomb Chuckers throw at the middle Zombie of three standing together**
  - Bomb Chucker (8 HP) attacks Zombie (18 HP): deals 5, takes 0; splash 3 on Zombie, 3 on Zombie
  - Bomb Chucker (8 HP) attacks Zombie (13 HP): deals 5, takes 0; splash 3 on Zombie, 3 on Zombie
  - Bomb Chucker (8 HP) attacks Zombie (8 HP): deals 6, takes 0; splash 3 on Zombie, 3 on Zombie
  - Left: Goblins Bomb Chucker 8, Bomb Chucker 8, Bomb Chucker 8; Undead Zombie 9, Zombie 2, Zombie 9.
- **A Rocket Cart with one Goblin beside the target and WAAAGH! fires at a Zombie; a Goblin Kabooms between two Zombies**
  - Orc Warboss calls WAAAGH!: 2 units inspired
  - Rocket Cart (8 HP) attacks Zombie (18 HP): deals 18 (kills), takes 0, inspired, Gang Up +1; Plunder +2
  - Goblin (6 HP) Kabooms: own Goblin explodes for 5: 5 on Zombie
  - Left: Goblins Orc Warboss 12, Rocket Cart 8; Undead Zombie 13. Graves: 2.
- **Two Goblins (Gang Up) attack a Zombie: both are bitten**
  - Goblin (6 HP) attacks Zombie (18 HP): deals 6, takes 4, Gang Up +1, is bitten
  - Goblin (6 HP) attacks Zombie (12 HP): deals 7, takes 3, Gang Up +1, is bitten
  - Left: Goblins Goblin 2, Goblin 3; Undead Zombie 5.

**The Abomination**

- **An Abomination attacks a Fighter, and next turn a Marksman**
  - Abomination (40 HP) attacks Fighter (12 HP): deals 12 (kills), takes 0; Fighter rises as a Zombie of the Undead
  - Undead end the turn: done
  - Humans end the turn: done
  - Abomination (40 HP) attacks Marksman (12 HP): deals 12 (kills), takes 0; Marksman rises as a Zombie of the Undead
  - Left: Undead Abomination 40, Zombie 10, Zombie 10; Humans nothing.

#### Undead prices

| Unit        | Technology (tier)  | Cost   | Hired | HP  | Atk / Def | Move | Range | Acts after moving | Abilities                     | A city of income 3 / 5 / 7 pays for one a turn |
| ----------- | ------------------ | ------ | ----- | --- | --------- | ---- | ----- | ----------------- | ----------------------------- | ---------------------------------------------- |
| Skeleton    | —                  | 2      | 3     | 10  | 2 / 2     | 1    | 1     | yes               | —                             | yes / yes / yes                                |
| Ghoul       | SCOUTING (1)       | 3      | 5     | 10  | 2 / 1     | 2    | 1     | yes               | CHARGE, DEVOUR                | yes / yes / yes                                |
| Banshee     | MARKSMANSHIP (2)   | 3      | 5     | 8   | 1 / 1     | 1    | 0     | yes               | WAIL                          | yes / yes / yes                                |
| Zombie      | DRILL (1)          | 3      | 5     | 18  | 2 / 2     | 1    | 1     | no                | INFECT, BITE                  | yes / yes / yes                                |
| Necromancer | ADMINISTRATION (2) | 5      | 8     | 10  | 1 / 1     | 1    | 1     | yes               | RALLY, RAISE_DEAD             | no / yes / yes                                 |
| Lich        | SAWMILLING (3)     | 8      | 12    | 10  | 3 / 1     | 1    | 2-3   | no                | PLAGUE                        | no / no / no                                   |
| Vampire     | CHIVALRY (3)       | 9      | 14    | 10  | 3 / 1     | 3    | 1     | yes               | LIFESTEAL, UNANSWERED, ESCAPE | no / no / no                                   |
| Abomination | —                  | reward | —     | 40  | 4 / 4     | 1    | 1     | yes               | PUSH, INFECT                  | —                                              |

Unit slots of an Undead city: L1 2/3, L2 3/4, L3 4/5, L4 5/6, L5 6/7 (without / with Planning), as for the Humans; a rising is not held back by the limit.

### 2.1 What the numbers say

- **A Skeleton, a Ghoul on foot, and a Zombie deal the same.** Attack 2:
  5 to a Fighter, 4 to a Guard or a Swordsman, 6 to a Marksman or a
  Knight. What differs is what they take and when they may strike: the
  Skeleton (10 HP, Defense 2) strikes after it moves; the Zombie (18 HP,
  Defense 2) does not, and what it damages is Bitten and what it kills
  rises; the Ghoul (10 HP, Defense 1, Move 2) strikes from two tiles away
  and, with Raiding, for 8.
- **The Zombie wave is real, and it is exactly as strong as the enemy's
  willingness to fight it hand to hand.** Five Zombies that walk into
  five Fighters who stand and fight are nine Zombies three turns later
  and no Fighter is left (first scenario). The same five into three
  Fighters with three Marksmen behind them convert the three Fighters and
  die: the three Marksmen are left, two of them wounded (second). Against six
  Marksmen that step back one tile and shoot, five Zombies deal no damage
  at all (third): a Zombie that moves cannot attack, so a unit that steps
  away from it is never attacked. That is what every hand-played game
  reported ("Marksmen countered Zombies completely"), and it is the
  counter the user asked for. It needs no technology beyond Marksmanship.
- **So the wave is not too strong too early, and it was not gated.** In
  nine hand-played games no wave formed; Zombies converted single units
  that had been pushed forward (one to four a game).
- **The Human Knight does not ride through Zombies.** It deals a full
  Zombie 12 of 18, takes 3, and is Bitten; its Overrun needs a kill, so
  the chain stops on the first Zombie. Two Marksman shots first make the
  kill, and then the Knight rides on through a Zombie that has just risen
  (10 HP), a Banshee, and a Lich in one turn. Every other Undead unit dies
  to one Knight attack. So the Zombie is to the Undead what the Orc Brute
  is to the Goblins: the unit a chain ends on. The other half: three
  Zombies beside a Knight that stopped kill it in their turn, and it rises
  (the Knight scenarios). "A melee attacker whose defender rises does not
  advance" matters for the Human answer only in a game with a third
  seat: an Undead unit is never Bitten, so a Knight's own kills of Undead
  units always let it advance and attack again.
- **Bite, then kill, is the faction's combination, and any unit
  finishes it.** A Zombie's bite on a Knight (6) and one Ghoul beside it
  (7 with Carrion, a kill) is a dead Knight and an Undead Zombie in its
  place; a Banshee's Wail of 1 on a Bitten Marksman at 1 HP does the
  same. Since the correction the Ghoul is the best finisher: on a Bitten
  unit it deals a Fighter 8 where a Skeleton deals 5, and with a Charge it
  kills a full Fighter, Raider, Marksman, or Knight in one blow
  ([section 13.4](#134-the-ghouls-carrion)).
- **The Lich is a Catapult that also hits everything beside its target
  and, with Pestilence, plagues what it hits.** One shot at the middle of
  a line of five: 7 on the Swordsman, 4 on each of the other four, and
  with Pestilence 2 more on all five at the start of each of their next
  three turns. With two Banshees (3 and 2 a unit a Wail) three of the
  five are dead after the Lich's second shot with or without Plague, and
  nothing answered. A Lich alone, three shots on that line: with
  Pestilence 55 of its 66 HP and two units dead, without it 43 and one
  ([section 13.2](#132-plague-needs-pestilence)). In a Forest the same
  shot is 6 and 3. A
  Captain beside the line removes the Plague of three units with one Tend
  Wounded, and a Catapult that fires first kills the Lich (10 of its 10
  HP), which ends every Plague it started. An Orc Brute is not splashed
  and so not plagued: a Lich's shot at a Bomb Chucker between two Brutes
  touches neither Brute.
- **The Banshee is weak on one unit and good on five.** A Wail deals 2 to
  most units in the open, 1 to a Swordsman, a Juggernaut, or anything on
  a fortified tile, 3 to a Catapult or a Goblin, to every living enemy
  within two tiles at once, after a Move, and nothing answers. Against
  one target a Marksman is three times better; against a line softened by
  a Lich it kills.
- **Before the pass the Vampire was a Lich that had to stand beside its
  target.** Attack 3 like the Lich: 8 to a Fighter, 7 to a Swordsman, 10
  to a Marksman or a Knight, a kill on a Catapult or a Captain; no
  retaliation; 10 HP, Defense 1. A charging Ghoul deals the same 10 to a
  Marksman and kills the same Catapult for 3 Coins. After its attack the
  Vampire stood among the enemy and two Marksmen killed it (first Vampire
  scenario): "Vampires died in one shot each", "four units (26 Coins)
  dead for nothing" (`r6b`, `r7b`). With Escape it is gone before the
  enemy's turn (second scenario). It is a ground unit: a line without a
  gap stops it at the line, where it hits a Fighter for 8 and leaves
  (third).
- **The Skeleton under fire.** Two Marksman shots killed a Skeleton; now
  three (4, 5, and the last). Seven Skeletons that walk at six Marksmen
  take 22 damage in the first volley instead of 30 and deal 22 instead of
  16 in their first turn of contact; they still lose that fight (14 Coins
  against 24), which is as it should be. Hand to hand nothing changed: a
  Fighter beats a Skeleton (12 HP against 10 at equal blows), and a
  Swordsman or a Knight kills one in a blow.
- **The Goblins have what the Humans have.** A Bomb Chucker deals a
  Zombie 5 and its neighbours 3; three throws leave three Zombies at 9,
  2, and 9. A Rocket Cart with a helper and WAAAGH! kills a full Zombie
  from three tiles. Two Goblins that attack a Zombie hand to hand deal it
  13 and are both Bitten.

## 3. Every Undead unit

"Buy it when" is the situation a player meets in which this unit is the
right purchase and another is not.

| Unit        | Cost | Its job                                                                                                                    | Buy it when                                                                                                      | What counters it                                                                                |
| ----------- | ---- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Skeleton    | 2    | the striker: moves and attacks, finishes what was bitten, walks at shooters (Bones), takes centers                         | the enemy shoots (Marksmen, Bomb Chuckers); a Bitten or wounded unit is one step away; a poor turn               | anything hand to hand: a Fighter wins the exchange, a Swordsman or a Knight kills it in a blow  |
| Ghoul       | 3    | the finisher and the scout: Move 2, Charge (Raiding), **Carrion** (+1 Attack on a Bitten or Plagued unit), Devour          | villages are free; a Bitten or plagued unit stands two or three tiles away; a Catapult is unguarded              | any two attacks (Defense 1); zones of control stop it; a Captain's cure removes the mark        |
| Banshee     | 3    | the Wail: 1 to 3 damage on every living enemy within two tiles, after a Move, unanswered                                   | the enemy stands three or more to a 5 × 5 (every line does), most of all after a Lich's shot                     | one Swordsman, Knight, or Raider; two Marksman shots; a fortified tile; it has no attack        |
| Zombie      | 3    | the wall that bites: 18 HP, ends a Knight's chain, what it damages is Bitten and what it kills rises                       | a center or a gap to hold; Knights or Fighters come at you; the enemy must come to you                           | Marksmen and Catapults (it never reaches a unit that steps back), Bomb Chuckers; a Captain cure |
| Necromancer | 5    | Frenzy (+1 Attack beside it) and Raise Dead: a 5-HP Skeleton from every Grave **within two tiles**, at no cost and no slot | the fight has left Graves; Skeletons and Ghouls are about to strike                                              | anything that reaches it (10 HP, Defense 1); a Zombie that converts leaves it no Grave          |
| Lich        | 8    | the siege unit that wounds a whole position: splash on every neighbour, and **with Pestilence** Plague on all it hits      | the enemy holds a line or a center, which it must do to keep you out                                             | a Knight or a Raider that reaches it, a Catapult that fires first, a Captain, spreading out     |
| Vampire     | 9    | the strike that comes back: Move 3, no retaliation, heals by its damage, Escape                                            | Catapults or Marksmen stand behind a gap; a wounded dear unit must die this turn; a line to wear down at no risk | a line without a gap (it is a ground unit), Knights and Raiders that follow it home; no capture |
| Abomination | —    | the giant the first capital grants once: 40 HP, and what it kills rises as a Zombie                                        | taken at level 5 of the first capital                                                                            | Catapults and Marksmen in numbers, a Guard or a Swordsman (it kills neither in a blow)          |

**The first failure, a faction that always wins.** The evidence is nine
hand-played games, every one with the Undead played by the AI. In the four
one-on-one games it lost in 12 to 24 rounds without ever threatening a
city; in the six-seat games one Undead seat was destroyed and one grew
late and never attacked. In the two staged breakthroughs, with twice the
defender's value in units and four Liches on the board from the first
turn, it broke the line both times and took the capital once. So nothing
says the faction is too strong, and the roster with Liches in numbers has
not been met in an even game. What this pass adds on the strong side is a
Vampire that survives its strike and a Skeleton that takes one more shot;
on the weak side nothing. Neither side of that is measured until the lab
is played.

**The second failure, one best unit.** Before: for the AI it was the
Zombie, ten of thirteen units, by the way it bought and not by merit. For
a player the matrix says: the Zombie was the best body in every situation
but one (it cannot strike on arrival), the Lich the best damage, the
Skeleton a worse Human Fighter with no reason of its own, and the Vampire
a 9-Coin unit that a 3-Coin Ghoul matched. After, the right purchase by
situation:

- the enemy shoots, or a bitten unit must be finished this turn:
  **Skeletons**;
- Knights or Fighters come at you, or a center must be held: **Zombies**;
- the enemy stands in a line: a **Lich**, and **Banshees** behind your
  Zombies for the turn after its shot;
- there are Graves beside the fight: a **Necromancer**;
- there are Catapults and Marksmen behind a gap, or a wounded Knight:
  a **Vampire**;
- villages are free, or something Bitten is two tiles away: a **Ghoul**.

The Lich is the unit this check is least sure of. It is the best damage
the Undead have by a wide margin and the scenario shows why; it also
cannot move and fire, has 10 HP, dies to one Knight, one Raider's charge,
or one Catapult shot, and does nothing to a line that steps back four
tiles (`r6b`: four Liches fired seven shots in ten rounds). An army of
Liches needs the Zombies that keep Knights off them. Fork 5 is the gate
if hand play says otherwise. **It did** (seven Liches at the end of the
lab game, 18 of 39 kills; "Zombie plus Lich is the whole army"), and the
gate is in ([section 13.2](#132-plague-needs-pestilence)).

**Does a mid-game Undead player want its 8 and 9 Coin units?** Yes, for
the reasons that held for the Goblins. Only the Lich wounds a whole
position and only the Vampire strikes behind a line and returns, and a
unit slot holding either is worth several holding Skeletons. Five cities
in the middle of a game pay about 15 Coins a turn: a Lich and a Vampire
are 17. And the cheap units are not wasted Coins either: Skeletons and
Zombies are what dies in front of the dear ones. What the Undead do not
have is a reason to hoard: nothing they own costs more than 9.

## 4. Every Undead technology

### 4.1 The tree

The Undead tree is the shared tree with three differences: Administration
gives the Necromancer (Frenzy and Raise Dead) instead of the Captain,
Chivalry gives no Overrun, and (the correction) Explosives is
**Pestilence** and makes the Liches plague. Costs are for the second,
fifth, and ninth technology a player buys. The naval branch is left out.

| Technology     | Tier | Cost        | Gives an Undead player                                             | When a thoughtful player buys it                                                                                               | Verdict                                                            |
| -------------- | ---- | ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Gathering      | 1    | 5 / 8 / 12  | Harvest Fruit; shows Fertile Ground                                | first, with Fruit by the capital                                                                                               | good                                                               |
| Hunting        | 1    | 5 / 8 / 12  | Hunt Game                                                          | first, with Game instead; the way to the Banshee and the Lich                                                                  | good                                                               |
| Scouting       | 1    | 5 / 8 / 12  | Ghoul (Move 2, sight 2, Devour)                                    | on a large map for a second and third Ghoul; the way to the Vampire                                                            | good (the first Ghoul is free now)                                 |
| Drill          | 1    | 5 / 8 / 12  | **Zombie**; shows Ore; +2 Coins for a first capture                | early in every game: the wall, the bite, and the answer to Knights and Fighters for 3 Coins                                    | the faction's standard second buy                                  |
| Farming        | 2    | 7 / 10 / 14 | Farm                                                               | with Fertile Ground                                                                                                            | good                                                               |
| Administration | 2    | 7 / 10 / 14 | **Necromancer** (Frenzy, Raise Dead); Market; Disband              | once the fighting leaves Graves; for the Market                                                                                | good                                                               |
| Forestry       | 2    | 7 / 10 / 14 | Lumber Camp; Clear Forest; Forest cover                            | on the way to the Lich; the cover makes a Zombie in a Forest take 8 from a Swordsman instead of 10                             | a step with a use                                                  |
| Marksmanship   | 2    | 7 / 10 / 14 | **Banshee**                                                        | when the enemy fights in lines; before the Lich, because it is cheap                                                           | good                                                               |
| Roads          | 2    | 7 / 10 / 14 | Roads; population for linked cities                                | with a second city a few tiles away; slow Zombies reach the front on them                                                      | good                                                               |
| Raiding        | 2    | 7 / 10 / 14 | Pillage (3 Coins); Ghoul Charge                                    | with Ghouls on the board (a charging Ghoul deals a Marksman or a Knight 10); the way to the Vampire                            | good                                                               |
| Engineering    | 2    | 7 / 10 / 14 | Mountains passable; Mine; Workshop; Redevelop. **No unit**         | with Ore or a Mountain line; a Zombie on a Mountain is a wall                                                                  | economy and ground                                                 |
| Fortification  | 2    | 7 / 10 / 14 | Field Defense, built by Skeletons and Zombies (+2 Defense)         | to hold a gap: a Zombie on a Field Defense takes 7 from a Swordsman, 9 from a Knight, 3 from a Marksman; the way to Pestilence | good for this faction (a tester found it not worth 17 Coins alone) |
| Milling        | 3    | 9 / 12 / 16 | Windmill (population; heals units beside it)                       | with two Farms around a tile                                                                                                   | good                                                               |
| Planning       | 3    | 9 / 12 / 16 | +1 unit in every city; Land Grant                                  | from the middle game; a Land Grant also widens the land in which Undead units recover                                          | good                                                               |
| Sawmilling     | 3    | 9 / 12 / 16 | Sawmill; **Lich**                                                  | as soon as the enemy holds a line                                                                                              | the strongest node of the tree                                     |
| Fieldcraft     | 3    | 9 / 12 / 16 | Replant Forest; Forest march; Banshee sight 2                      | on a wooded map, for an army of Move-1 units that must cross Forest                                                            | weak, as for every faction                                         |
| Commerce       | 3    | 9 / 12 / 16 | land trade (+1 Coin a linked city); **Markets hire**               | with three or more linked cities; a hire is a second unit a turn in that city and one above its limit                          | good                                                               |
| Chivalry       | 3    | 9 / 12 / 16 | **Vampire** (Lifesteal, no retaliation, Escape); Clear for farming | against Catapults and Marksmen behind a line with a gap                                                                        | good (the Vampire was not worth it)                                |
| Metallurgy     | 3    | 9 / 12 / 16 | Forge; units cost 1 Coin less in a city with a Forge               | late, with Mines: a Zombie 2, a Lich 7, a Vampire 8                                                                            | fair                                                               |
| Pestilence     | 3    | 9 / 12 / 16 | (Explosives) Blast Mountain; Breach; **the Liches plague**         | with two Liches on the board; to take a walled center with Skeletons, Zombies, and Vampires                                    | good; fork 5, done                                                 |

No node is dead for an Undead player. Drill is the nearest thing to an
automatic buy: a 3-Coin unit with 18 HP that answers Knights is worth 5
Coins of research in every game, as Marksmanship is for a Human. It was
left: the Zombie is the faction, and what it does not do (move and
attack, live under fire) is why the other six units are bought. The
branches: Settlement ends in Planning and holds the Necromancer; Wilds
holds the Banshee and the Lich; Mobility the Ghoul and the Vampire;
Industry the Zombie, the ground (Mountains, Field Defenses), Breach, and
since the correction the Liches' Plague.
The seven units cost 97 Coins of research in the AI's order (Gathering
free, then Drill 5, Hunting 6, Marksmanship 9, Forestry 10, Sawmilling 13,
Administration 12, Scouting 11, Raiding 14, Chivalry 17); the Lich is
there after 43.

### 4.2 The Undead economy

**The rules give the Undead the shared economy and one handicap.** They
harvest, build, trade, and level cities exactly as the Humans do.
Restless is a cost only: an Undead unit recovers in its own territory and
nowhere else, and the faction has no healer (a Ghoul on a Grave, a
Vampire by its damage, and a unit beside a Windmill are the exceptions).

**What they have instead is bodies that cost nothing and, since the
correction, need no unit slot.** A unit a Zombie or the Abomination
kills, a Bitten unit that dies, and every Grave within two tiles of a
Necromancer becomes an Undead unit at once. In every hand-played game the
unit slots and the one training a city has each turn, not the Coins, were
what limited a player from about round 16; the Undead are the faction
that limit does not hold. That is a growth identity, of the army and not
of the treasury.

**As first written this paragraph was wrong about the rule.** A rising
was "above the city limit" only in the sense that it was not refused: it
was homed to the city of the unit that made it and counted against that
city's slots, so a city whose Zombies converted could train nothing. Both
testers who played the Undead ran into it
([section 13.1](#131-a-rising-fills-no-unit-slot)). The rule now does
what the paragraph says.

**Is the faction too slow to start? The AI is; the rules are not.** (A
hand player has since shown it: six cities and 16 Coins a turn at the end
of round 10 against the Human AI's four and 9,
[section 13](#13-the-correction-after-three-hand-played-games).) A
Skeleton loses to a Human Fighter one to one, and until Drill the Undead
have nothing else, so the first five rounds are the faction's weakest.
But the tiny Undead economy of every hand-played game is the Normal AI's:
in the diagnostic match of [section 8.2](#82-two-diagnostic-matches) the
Undead seat held four cities at levels 2, 1, 1, 1 in round 12 against six
Human cities, kept most of an income of 5 Coins for the technology its
research clock asked for, and bought no growth because a Human unit stood
next to its frontier village from round 7. Scouts (a free Ghoul with Move 2) is the
rule-side help for a player's opening; the AI's is open
([section 12](#12-what-is-still-open)).

### 4.3 How each change of the Human and Goblin passes lands for the Undead

| Change of the Human or Goblin pass                           | For the Undead                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research price: tier base plus 1 per technology owned        | The same formula. Every Undead unit is ten technologies and 97 Coins; the Lich is the sixth technology.                                                                                                                          |
| Forest cover needs Forestry                                  | Applies, and the Undead pass Forestry on the way to the Lich. It matters to the Zombie (a Swordsman 8 instead of 10, a Marksman 4 instead of 5).                                                                                 |
| Blast Mountain is an explosion; Breach                       | Applies. Breach is how Skeletons, Zombies, and Vampires take a walled center without a Lich.                                                                                                                                     |
| Commerce: land trade between linked cities                   | Applies as for the Humans (+1 Coin a linked city).                                                                                                                                                                               |
| Commerce: Markets hire                                       | Applies (a Skeleton 3, the 3-Coin units 5, a Necromancer 8, a Lich 12, a Vampire 14).                                                                                                                                            |
| The reward ladder: Barracks, the 6-Coin Treasury, one giant  | Applies: the Abomination once, in the first capital. An Undead Militia is one Skeleton.                                                                                                                                          |
| Level 2: Scouts (the survey and a free Raider or Wolf Rider) | **Now for the Undead too** (this pass): a free Ghoul, without Scouting.                                                                                                                                                          |
| The Raider is not stopped by zones of control                | Human only, and not given to the Ghoul or the Vampire: both are stopped by a line without a gap, which is the counter to both.                                                                                                   |
| Pillage pays 3; a Raider keeps its Move                      | The 3 Coins apply to every Undead land unit. The Move after it needs Escape: a Ghoul's Pillage ends its turn, a Vampire's does not (it has Escape now).                                                                          |
| Fieldcraft: Forest march                                     | Applies; worth more to an army whose wall has Move 1.                                                                                                                                                                            |
| A Field Defense is +2                                        | Applies to the two Undead units that build it, the Skeleton and the Zombie. A Zombie on one is the faction's gate.                                                                                                               |
| Land Grant 1 Coin a tile                                     | Applies, and is also land in which Undead units recover.                                                                                                                                                                         |
| The Guard is open to ranged attacks                          | Human only. The Zombie needs no twin (fork 9). Bones is the same mechanic turned round, on the Skeleton.                                                                                                                         |
| The Swordsman at Engineering                                 | Human only. The Undead heavy line unit is the Zombie, at Drill; Engineering is an economy and ground technology for them.                                                                                                        |
| Drill removed; a Blast Mountain spares the unit that sets it | Apply.                                                                                                                                                                                                                           |
| The Goblin Orc Brute is Blast-proof                          | In force against a Lich: a Brute beside the target is not splashed and not plagued. A Goblin line of Brutes with the shooters behind them takes a Lich's shot on one unit. The Lich's shot at the Brute itself is as it was (7). |
| A bomb gets no Gang Up; a rocket +1; Crash; Plunder 2        | Goblin unit rules. Against the Undead: bombs splash Zombies that stand together, and a rocket with a helper and WAAAGH! kills a full Zombie.                                                                                     |
| The Normal AI plays an army                                  | An Undead seat plays it, with its own research order, shares, and unit rules ([section 8](#8-the-normal-ai)).                                                                                                                    |

## 5. What makes each unit different

By mechanic, against the unit of the same role in the Human roster.

| Unit        | Human unit | What it does that the Human unit does not                                                                                  | What it lacks                                        | A reskin?                          |
| ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Skeleton    | Fighter    | **Bones**: Defense 3 against shots; it is what Raise Dead makes                                                            | 2 HP; recovery outside its own land                  | was one; no longer                 |
| Ghoul       | Raider     | **Carrion** (+1 Attack on a Bitten or Plagued unit); Devour: heals fully on a Grave and takes it from an enemy Necromancer | Escape; it is stopped by zones of control; 2 HP      | no                                 |
| Banshee     | Marksman   | Wail: every living enemy within two tiles at once, never answered                                                          | an attack: it cannot hit one unit hard or finish one | no                                 |
| Zombie      | Guard      | Bite and Infect; 18 HP at Defense 2 at every distance                                                                      | the Guard's Defense 3; an attack after a Move        | no                                 |
| Necromancer | Captain    | Raise Dead, from two tiles                                                                                                 | Tend Wounded: an Undead army has no healer           | no                                 |
| Lich        | Catapult   | splash on every hostile neighbour of its target; Plague with Pestilence                                                    | nothing (it has twice the Catapult's Defense)        | no; the strongest of the pairs     |
| Vampire     | Knight     | no retaliation; Lifesteal; **Escape**                                                                                      | Overrun; capture; 3 HP and a point of Attack         | no; its job is now its own         |
| Abomination | Juggernaut | **Infect**: its kills rise as Zombies                                                                                      | the advance onto the tile of a kill                  | was one in all but name; no longer |

**Carrion** was the proposal for the Ghoul if fork 7 was overruled: "+1
Attack against a Bitten or Plagued unit". It was not built at first,
because Devour is a mechanic no other fast unit has and the faction's
kill combination works with any finisher. Hand play overruled that
("never bought: a Skeleton finishes for 2 Coins"; "never used Devour or
Charge"), and it is in ([section 13.4](#134-the-ghouls-carrion)).

## 6. Why each change, and what it must not do

### 6.1 Bones

The Skeleton was the one Undead unit with nothing of its own: a Human
Fighter with 10 HP instead of 12 at the same price. And the faction's
counter is the shot: every hand-played game was decided by Marksmen that
killed whatever walked up. Bones gives the 2-Coin unit the half of that
problem a rule can give it: it is the unit that walks at shooters. It
does not touch the Zombie, so "put ranged units behind your line and the
wave dies" is as true as it was. What it must not do is make Skeletons
the answer to everything: hand to hand a Skeleton is still the weakest
line unit of the three factions, and the units that kill it in one blow
(Swordsman, Knight, a charging Raider) are the ones a Zombie then bites.
So the Human answer to an Undead army is now two answers: shots for the
Zombies and blades for the Skeletons.

### 6.2 Escape

A Vampire was bought, rode in, hit once, and died in the enemy's turn. A
unit that deals a Lich's hit to one unit and is lost with it is not
worth 9 Coins when the Lich costs 8 and stays. Escape is an existing
rule with existing text ("may move again after attacking"), it fits the
unit, and it makes the Vampire unlike the Knight in play: the Knight
goes through a line and stays inside it, the Vampire touches a line and
is gone.

What it must not do is make a unit nothing can catch. It is a ground
unit: zones of control stop it on the way in and on the way out, it
cannot reach a unit behind an unbroken line, it has 10 HP and Defense 1,
and a Human Knight (Move 3) or Raider follows it home and kills it in a
blow; a Marksman reaches three tiles. It does one unit's damage a turn
and takes no ground. Whether that is still too safe is the first question
for the lab.

### 6.3 Infect for the Abomination

The reward giant of the faction whose dead rise was the one unit of it
that left a plain Grave. With Infect what it kills stands up as a Zombie
on the spot: a Fighter, a Raider, a Marksman, or a Knight in one blow.
It keeps Push for what survives. It does not advance, because the tile
of its kill holds the new Zombie; that also means it does not walk
itself into the enemy's line one kill at a time. It is one unit a game.

### 6.4 Scouts

The Human and Goblin level-2 reward is a choice because Scouts brings a
unit. The same reward for an Undead city was a survey nobody took. A
Ghoul is also the unit an Undead opening lacks: Move 2 among Move-1
units, in the rounds when villages are free.

## 7. What was not changed, and why

- **The Zombie, Bitten, Infect, the forced advance, the Human Knight:**
  the user's rulings, and the scenarios agree with them.
- **Every number of the roster:** no matchup needed one.
- **The Lich:** fork 5. It is the unit to watch. (The correction gated
  its Plague.)
- **The Banshee:** its numbers are small on purpose (it hits everything
  at once); its two opposite reports were two versions of the AI.
- **The Ghoul and the Necromancer:** both have a mechanic of their own
  and a purchase of their own (section 3). (Neither was bought in the lab
  game; the correction gave the Ghoul Carrion and the Necromancer a reach
  of two tiles.)
- **Restless and the economy:** section 4.2.
- **The tree:** no node moved and none was renamed. (The correction
  renamed Explosives to Pestilence for the Undead and added its unlock.)
- **The other factions:** nothing but what Bones does to their shots at a
  Skeleton.

## 8. The Normal AI

Everything here is an Undead seat's rule; a Human or a Goblin seat plays
as it did. The rules the correction added, for the Undead seat's opening,
economy, garrison, Banshees, and Zombies and for the Human seat against
Zombies, are in [section 13.6](#136-the-undead-normal-ai) and
[13.7](#137-the-human-normal-ai-against-zombies).

- **Research order** (`ARMY_RESEARCH_ROLES_V7.UNDEAD`): Zombie, Banshee,
  **Lich**, Necromancer, Vampire. The Lich was fourth, behind the
  Necromancer; it is the sixth technology the seat owns.
- **Army shares** (`ARMY_SHARES_V7.undead`): Skeletons 25%, Zombies 25%,
  Banshees 20%, Liches 20%, Vampires 10% (20, 30, 20, 15, 15 before);
  against two or more hostile ranged, siege, or support units 25, 20, 15,
  20, 20. One Ghoul for every five units, two at most (one in all
  before); the Necromancer keeps its own count.
- **The Coins for a Lich** (`armyDearUnitFloorV7`). An Undead seat that
  can train a Lich (or a Vampire), has none of its share, cannot pay for
  it now, and can with one more turn's income does not spend below that
  in a city no enemy is near: before, every city spent the turn's Coins
  on a 3-Coin unit, and a seat with Sawmilling fielded no Lich. A
  threatened or frontier city trains a body regardless, and with an enemy
  within three tiles of a center nothing is kept.
- **Zombies advance together** (`armyZombieAloneV7`). A Zombie's step
  into the reach of a visible enemy, outside its own land, ends beside
  another own unit or within two tiles of one that can strike on arrival;
  else it waits. This held for a seat that had not committed (tuning 7);
  it now holds for a committed one too. (The correction made it stricter
  and a filter on every Zombie Move, in its own land too.)
- **A Zombie bites the dearest unit in reach**: 4 a Coin of the target's
  price for a new bite (`ARMY_ZOMBIE_BITE_VALUE_V7`), next to the old
  preference for cheap infantry it kills. A Zombie between a Fighter, a
  Swordsman, and a Knight attacks the Knight.
- **A Zombie's Move is shy of shots** (5 a hostile ranged unit that
  reaches the tile) and **Zombies hold centers**: both were rules already
  (tunings 7 and 8) and are unchanged.
- **Banshees.** A Banshee Wails when two or more units are in its reach
  (that was so). It now also steps up to such a Wail behind an own melee
  unit when its seat has not committed, whatever reaches the tile: it
  did so only in a committed assault or out of every reach.
- **Liches, Necromancers.** A Lich fires at the unit whose neighbours
  its splash and Plague reach, a volley that plagues three goes before an
  ordinary kill, a Necromancer raises before anything else and calls
  Frenzy before the strikes: all of that was in the policy, and tests
  now hold each.
- **Vampires.** A strike that does not kill was made only where the
  Vampire would live through the enemy's turn on the tile it struck
  from. It is now also made where a free tile within its Move leaves it
  alive (`vampireEscapeTileV7`), and after the strike the Raider's
  escape rule takes it to the safest tile.
- **Scouts** is taken by the shared rule: with 4 Coins or more in hand
  at a city's second level, otherwise the Stockpile. Taking it always
  while the seat has fewer than three cities was tried and withdrawn
  ([section 8.2](#82-two-diagnostic-matches)).
- **The Abomination** is no Zombie to the policy: it attacks after a
  Move and is not held back.

### 8.1 What the hand-played games had said

| What the testers saw                                                                         | What answers it                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "the Zombie is the only unit it really buys" (10 Zombies of 13; 18 trained and nothing else) | the shares, the Coins kept for a Lich, the Lich third                                             |
| owned Marksmanship and Sawmilling and built three Banshees and no Lich (`r8c`)               | the Coins kept for a Lich                                                                         |
| Zombies walk up one at a time and are shot (22 lost for 4 kills, `r6c`)                      | the company rule, now also for a committed seat                                                   |
| "bite the dearest unit in reach (it never attacked a Knight)" (`r6d`)                        | the bite value                                                                                    |
| five Banshees, two Wails in ten rounds (`r6b`); then 18 in seven (`r7b`)                     | the step up behind its own line also when not committed                                           |
| Vampires and Ghouls ride in and die for nothing (`r6b`, `r7b`)                               | Escape and the strike that counts on it                                                           |
| two cities in round 9, the third village in round 12 to 16                                   | **not answered** (section 12); a Ghoul comes with Scouts when the seat holds 4 Coins at a level 2 |
| four technologies in 24 rounds; Coins of 0 to 5; capital at level 2 for thirteen rounds      | **not answered** (section 12): the seat is poor, not idle                                         |

### 8.2 Two diagnostic matches

Each is one match between Normal AIs, read for what the Undead seat does,
not for who wins. The first was run on three versions of the policy,
because the policy changed after each reading (the Banshee's step up and
a Scouts rule were added after the first, and the Scouts rule withdrawn
after the second); what follows is the run on this source. The second
was run once, before the last change to the shares against shooters.

- **Humans first, Undead second, dry land 14 x 14, seed 4** (the map of
  the four one-on-one games). The Undead seat loses its last city in
  round 25. It researches Drill in round 3, Hunting 6, Marksmanship 10,
  Engineering 14 (its growth technology), Forestry 18, and **Sawmilling in
  round 20**; it trains its first Zombie in round 5 and its first Banshee
  in round 11, has three Skeletons, four Zombies, and a Banshee in round
  12, two Ghouls from Scouts in round 13, and never a Lich: from round 21
  every city it has left is a frontier city, where a body is trained. Its
  cities are at levels 2, 1, 1, 1 in round 12 against six Human cities,
  it builds its first Mine in round 17 and a Workshop in round 18, and its
  capital is at level 2 until round 22. Its Zombies never step into reach
  alone (3 advances, each with company); 7 bites and 9 risings in 23
  attacks; 7 Wails for 36 damage, three of them on four units. It kills 10
  units and loses 39. **What it shows:** the order and the shares do
  nothing for a seat that is beaten before its sixth technology, and that
  seat's trouble is its economy: an income of 3 to 7 Coins, most of it
  kept for the technology its research clock says is due, and no growth
  while a Human unit stands by its frontier village (from round 7).
  Taking Scouts always while the seat has fewer than three cities was
  tried on this map: three cities in round 4 instead of round 6, the
  Ghoul dead in round 6, Hunting a round later for want of the
  Stockpile's 4 Coins, and no Mine before round 20. It was withdrawn.
- **`LAB_UNDEAD_MID` with the Normal AI on both sides, 14 rounds.** This
  is the roster with every technology and 15 Coins a turn. The Undead
  seat trains, in order: two Vampires and a Lich in round 1, then
  Skeletons, a Lich, a Necromancer, a Vampire, a Ghoul, Zombies, a
  Banshee: every unit of the roster, three Liches on the board from
  round 1 to round 10. **Liches fire 18 shots and plague 19 units;
  Vampires strike 22 times and fly back 20 times**, and finish about half
  of the Undead seat's 30 kills; six Vampires and three Liches die.
  Zombies make 6 advances into reach, every one with company, and none
  alone. Eight units rise (seven of them Bitten units killed by a Lich
  or a Vampire). The Necromancer raises 3 Skeletons and calls Frenzy
  twice; the first one dies in round 2 to a Knight's chain of four. 7
  Wails, 19 damage: the two Banshees die early and one more is trained.
  The Human seat trains Knights (five on the board from round 2) and its
  Knights kill 10-HP units in chains: the Undead seat loses 42 units and
  one city of five and holds 20 to 35 Coins from round 10, with every
  city training each turn. The match is open at round 14.

What they show for this bead: with the technologies in hand the Undead AI
fields the whole roster, fires its Liches, brings its Vampires home, and
keeps its Zombies together. What they do not show: an Undead AI that
reaches that roster in a game from round 1, balance, and the Undead under
a hand player.

## 9. The lab

`npm run play:text -- lab --session S LAB_UNDEAD_MID` starts the one lab in
which **the hand player is the Undead**, against the Human Normal AI
(`src/engine/v7/missions/lab-undead.ts`, a hidden mission like the other
labs). Its board, its cities, and its Human side are those of
`LAB_GOBLIN_MID`, so the two rosters meet the same opponent.

- **Both sides:** five cities with the same levels (a level-4 capital, two
  level-3 cities, two level-2 cities at the front, four tiles from the
  enemy's), 15 Coins a turn, ten technologies. Two neutral villages lie
  between the lines.
- **You:** every Undead unit is trainable (Drill, Marksmanship,
  Sawmilling, Administration, Scouting, Raiding, Chivalry and what they
  need). 16 units worth 62 Coins: 4 Skeletons, 4 Zombies, 2 Ghouls, 2
  Banshees, a Necromancer, 2 Liches, a Vampire. 35 Coins in hand on the
  first turn, three free unit slots (the capital and one front city are
  full), every center free to train on. The next technologies cost 16 to
  18 Coins. Your units recover only in your own land. Since the
  correction your Liches plague only once you research Pestilence
  (Fortification, then Explosives: two of those technologies), and your
  risings fill no slot.
- **The Human AI:** 17 units worth 77 Coins: 3 Swordsmen, 3 Marksmen, 2
  Catapults, 2 Knights, 2 Guards, 5 Fighters; a walled capital and one
  walled level-3 city; Forestry, so its units have Forest cover. It has
  30 Coins on its first turn and trains at once (the tester met four
  Knights by round 1; the lab's text now says so).

It is for judging the roster in about ten rounds: what you buy each turn
with 15 Coins and three or four trainings, whether a Lich or a Vampire
every turn is all there is to do, whether Zombies and Skeletons are both
worth a slot, and what the Human AI's Knights do to you.

## 10. Text

- Unit cards and recruit notes: **Bones** ("Bones: Defense 3 against
  attacks from 2 or more tiles.") on the Skeleton, in the place of the
  Human Guard's Open to ranged; **Escape** ("May move again after
  attacking: a fresh full Move if it survives, then it is done for the
  turn.") on the Vampire, the Raider's line; **Infect** ("A land unit it
  kills rises as your Zombie.") on the Abomination, the Zombie's line.
  No new text was written for the two abilities.
- The level-2 reward of an Undead city reads "Scouts: Reveal the area
  and a free Ghoul".
- The text harness prints the Bones note on unit, train, hire, and
  technology lines and "(bones)" in a combat line's Defense where it
  prints "(open to ranged)" for a Guard, lists `ESCAPE` and `INFECT`
  among the two units' abilities, offers the Vampire's Moves after its
  attack, and lists the lab.
- The correction's text: [section 13.9](#139-text-and-events).
- No art was made. Bones has no icon; the unit card shows it as a text
  line like the Guard's rule. An art bead could add one ability icon (a
  rib cage with an arrow through it) in the Undead command-icon style.
  Escape and Infect use what the Raider and the Zombie use.

## 11. Tests

`tests/unit/ruleset-v7-undead-pass.test.ts`: the identity; the three rules
on three roles and no other, the roster's numbers and abilities; Bones by
attacker and distance (a Marksman 4 from two tiles and 5 beside it, three
shots, a Catapult 7, a Rocket Cart 8, hand to hand unchanged), on a Field
Defense, the resolution equal to the preview, and the card text; Escape
after a hit and after a kill, once, for no other unit and not for the
Human Knight; the Abomination's rising, no advance, no bite; Scouts for an
Undead city; the matrix numbers of section 2.1 (the three line units' 5, a
charging Ghoul's 8, the Lich's and the Vampire's hits, the splash and
Plague of a volley, a Wail, the Knight stopped on a Zombie); the AI's
order, shares, and Ghoul count, a Lich trained with 8 Coins, the Coins
kept at 6 and 7, not at 3 and not with an enemy at the gates, and not by
a Human or a Goblin seat; the dearest bite; a Zombie held alone and
Zombies walking up together; the Wail, the Banshee's step up and its
refusal alone; the Lich's volley; Raise Dead and Frenzy; the Vampire's
flight; the lab's composition, worth, and offers.

The correction's tests are the describes named "the correction: ..." in
the same file ([section 13.10](#1310-tests)).

Changed fixtures and pins are listed in the bead's report.

## 12. What is still open

As first written this section said that nobody had played the Undead.
Three games have been played since; what they settled and changed is
[section 13](#13-the-correction-after-three-hand-played-games), and what
is open now is its
[section 13.8](#138-open-forks-and-ideas-with-the-testers-evidence) and:

- **The Undead AI is still the weaker of two Normal AIs on the map of
  the hand-played games.** With the correction it takes its villages,
  researches the growth its land can use from round 5, owns the Lich's
  technology in round 17, and is alive at round 30
  ([section 13.11](#1311-the-diagnostic-matches)); it fields one Lich and
  never researches Pestilence there, and it holds three cities against
  eight at the end. Its income is half the Human seat's until round 15,
  and a seat whose every city is a frontier city trains bodies. That is
  the shared army policy on a small income, not an Undead rule. A hand
  player meets the Undead AI's whole roster in the lab.
- **The other five factions** keep the plain level-2 Survey until their
  passes.
- **The lab has not been replayed with the corrected rules.** Its first
  play ended with seven Liches; whether a Lich without Plague is still
  the purchase of every turn, and whether Pestilence is bought, is for
  the next play.

## 13. The correction after three hand-played games

Three agents played by hand on `7r51` as first built (sessions and
reports in the bead's play-test folder): **U-A**, the Undead in
`LAB_UNDEAD_MID` against the Human AI, twelve rounds; **U-B**, the Undead
from turn 1 on a 14 x 14 dry-land map against the Human AI, a win in round
26; **U-C**, the Humans against the Undead AI on the map of the earlier
one-on-one games, a win in round 19.

**What they settled.** The roster works in a player's hands. The lab game
was a fight that was open in every one of its twelve rounds (39 kills, 32
losses). A full Zombie ended every Knight chain and bit the Knight ("deals
12, takes 3, attackerBitten", five times of five). Bones gives the
Skeleton a job: one walked onto an emptied enemy center and lived through
two Marksman shots (4 and 5) to capture it where three risen Zombies had
died in turn. And the faction is not slow to start: at the end of round
10 the hand player had six cities and 16 Coins a turn against the Human
AI's four and 9.

**What they showed wrong**, and what was done about each, follows. Not
changed: the Zombie and its numbers, Bitten, Bones, the Abomination's
Infect, Scouts and its Ghoul, the Banshee, the Vampire's Escape, every
price and number, the Human Knight, the forced advance.

**Shapes.** No command, event, state, or view field was added or
removed. The technology tree has one more unlock kind (`PESTILENCE`),
`TechnologyCapabilitiesV7` one more flag (`plague`), and
`RoleMechanicsV7` one more number (`carrionBonus2`); a rising's
`homeCityId` is null where it was a city; and a `WOUNDED_TENDED` that
cures reaches viewers it did not reach. The identity stays
`pulp-wars-poc-7r51`, which had not been published.

### 13.1 A rising fills no unit slot

**What happened.** A rising was homed to the home city of the unit that
made it and counted against that city's unit slots. So the faction's own
mechanic stopped its player buying. U-B: "my three front cities read 'no
free slot' from round 14 to round 20, which refused a Lich, a
Necromancer, a Banshee, and a Vampire". U-A: the capital refused a
Vampire twice because a Zombie had just risen, and from round 3 the
player ended every turn with 14 to 28 Coins unspent while the war was
open. Nothing said which city a rising would count against.
[Section 4.2](#42-the-undead-economy) had claimed the opposite.

**The rule now.** A unit created by rising (a Zombie's or the
Abomination's kill, the death of a Bitten unit) or by Raise Dead has no
home city and fills no unit slot of any city, for as long as it lives.

- **How it is represented.** `homeCityId` is null: the unit is an orphan,
  a state the engine already had (a unit whose home city was captured, a
  mind-controlled unit). No field was added and no command, event, state,
  or view shape changed; the events `UNIT_INFECTED` and
  `BITTEN_UNIT_RISEN` carry `homeCityId: null` where they carried a city.
- **Capacity.** Used slots are the units homed to the city
  (`assignedUnitCountV7`), so an orphan counts nowhere. A city that was
  full stays full and one with a free slot keeps it.
- **Training** is unaffected: a trained, hired, or rewarded unit is homed
  to its city and fills a slot as before. Only the three ways of rising
  changed.
- **Capture.** Capturing a city re-homes the capturing unit to it, as for
  any orphan that captures; the loss of a city changes nothing for a
  rising (it had no home to lose).
- **Muster** counts unit kinds on the board, with or without a home: a
  risen Zombie counts as a Zombie.
- **Disband** is offered as for any unit (half the Zombie's price, 1
  Coin; it was so before).
- **The city panel** lists the units homed to the city, so risings are
  not on it; the unit's own card and the board show them.
- **Old states.** A saved state whose rising has a home city (the units
  as they were until now) still parses and keeps that home; `7r50` and
  every earlier identity stay in the prior identities. Nothing is
  migrated.

### 13.2 Plague needs Pestilence

**What happened.** U-A ended with seven Liches, and 18 of its 39 kills
were a Lich's (13 by shot or splash, 5 by Plague); from round 7 a Lich was
the purchase whenever a city could train. U-B: "Zombie plus Lich is the
whole army; the other four are optional."

**The rule now** is the prepared fork 5, and the user's method (gate, do
not weaken): a Lich keeps its shot and its splash from the first, and
plagues only once its owner has researched **Pestilence**, the Undead
name of Explosives (a third-tier technology behind Fortification, in the
Industry branch; Sawmilling, which gives the Lich, is in the Wilds
branch). Explosives keeps Blast Mountain and Breach. Nothing about Plague
itself changed.

**What it takes away, by the script** (`play` scenarios of
[section 2.0](#20-numbers-from-the-script), a line of Guard, Swordsman,
Fighter with a Marksman and a Catapult behind, 66 HP in all, the Humans
doing nothing):

| A Lich's three shots at the Swordsman | Damage dealt | Dead after three turns | Left                                        |
| ------------------------------------- | ------------ | ---------------------- | ------------------------------------------- |
| without Pestilence                    | 43           | 1 (the Swordsman)      | Guard 10, Fighter 5, Marksman 5, Catapult 3 |
| with Pestilence                       | 55           | 2 (and the Catapult)   | Guard 7, Fighter 2, Marksman 2              |

With two Banshees behind it three of the five are dead after the second
shot either way; with Pestilence the two that are left have 6 HP between
them, without it 16. So Plague is about a quarter of what a Lich does to
a line that stands still, and all of what it does to one that walks away.
A Lich without it is still the Undead unit that wounds a whole position.

**The cost.** In the lab Fortification and Pestilence are the player's
eleventh and twelfth technology, 17 and 19 Coins. Fortification was the
technology U-A found "not worth it" alone; it is now the way to
Pestilence.

### 13.3 Raise Dead reaches two tiles

U-A: "Raise Dead needs an adjacent Grave, so it must stand at the front;
mine died in round 5 for one Skeleton", and it was never bought again
although "by round 10 a dozen Graves lay along the front". Raise Dead now
raises every free Grave within two tiles (`RAISE_DEAD_RADIUS_V7`), on
tiles the player has explored, so the Necromancer works from behind its
Zombies. The Skeletons it raises fill no slot (13.1). U-B's note that
conversion starves it of Graves (28 of 36 kills rose) is true and was
left: a Necromancer is for the fights a Lich and Skeletons win, not the
ones Zombies win.

### 13.4 The Ghoul's Carrion

U-A: "no reason to buy one: a Skeleton finishes for 2 Coins and a Vampire
strikes safely". U-B: "a scout and village taker; Devour and Charge were
never used". The Ghoul now has **Carrion**, the prepared fork 7: +1
Attack on its own attack against a Bitten or Plagued unit (the two marks
do not add up; it adds to a Charge and to Frenzy). From the matrix, on
open ground, full-HP units:

| A Ghoul's attack on         | Fighter | Guard | Raider | Marksman | Swordsman | Knight |
| --------------------------- | ------- | ----- | ------ | -------- | --------- | ------ |
| a unit that is not marked   | 5       | 4     | 6      | 6        | 4         | 6      |
| a Bitten or Plagued unit    | 8       | 7     | 10     | 10       | 7         | 10     |
| the same after a Charge     | 12 K    | 10    | 12 K   | 12 K     | 11        | 13 K   |
| a Skeleton on the same unit | 5       | 4     | 6      | 6        | 4         | 6      |

A Zombie's bite and one Ghoul from two tiles away is a dead Fighter,
Raider, Marksman, or Knight, which then rises. That is the job a Skeleton
does not have: it deals a Bitten Fighter 5. A Captain's cure removes the
mark, and the Ghoul still has Defense 1.

### 13.5 The Vampire, Zombies, and what else was left

Nothing was changed about the Vampire, the Zombie, or the Banshee. The
testers' disagreement about Escape and their other ideas are in
[section 13.8](#138-open-forks-and-ideas-with-the-testers-evidence).

### 13.6 The Undead Normal AI

Evidence: U-C, where the Undead AI was eliminated in round 19 with three
cities at most and never owned the technology of the Lich, the
Necromancer, or the Vampire. Each rule has a constructed test
([section 13.10](#1310-tests)) and is an Undead seat's only.

- **Villages first.** "Its three starting Skeletons walked seven tiles to
  fight at my village (two died there, for one Fighter). The villages four
  tiles from its capital were left." Through round 10, while the seat
  knows a free village within six tiles of an own center with no enemy
  within two tiles of it, its Skeletons, Zombies, and Ghouls do not walk
  into a visible enemy's reach outside its land, and one that has moved
  makes no attack there that does not kill; a unit that has not moved
  still strikes what stands beside it, and its own land is defended as
  before. The plan sends no unit out against an enemy unit that stands
  outside its land, so the free units scout and take the villages.
- **Economy first.** "Its cities did not grow for 13 rounds. The land of
  its three cities shows almost only fertile ground and Forest. It
  researched Drill, Hunting, and Marksmanship first; Forestry came in
  round 13 and at once levelled two cities, one round before the capital
  fell." After the Zombie and before the Banshee the seat researches one
  technology that builds population on its land: Farming, or Forestry by
  way of Hunting, whichever gives more population per Coin of research,
  a Forest counting threefold because Forestry is also the first step to
  the Lich. It buys that technology before a unit as soon as the Coins
  are there (not with an enemy at a city's gates). With it owned the
  order goes on: Banshee, Lich.
- **Pestilence** is researched before the Vampire once the seat fields
  two Liches.
- **The garrison.** "Round 14: a lone Banshee as the capital's garrison,
  no Walls, the two Ghouls a tile behind." A Banshee or a Lich on a
  threatened own center steps off it when a sturdier unit that can strike
  a neighbour stands beside the center, and that unit steps on (the best
  garrison of those that can; a Skeleton's Bones does not count for it).
  No Banshee is trained onto a contested center while a Zombie can be.
  A threatened city takes Walls at level 3.
- **Banshees.** "The second Banshee stood at 0,9 from round 11 to round
  18 and wailed once." A Banshee that belongs to no assault, with an
  enemy four to six tiles away, walks toward it, to a tile nothing
  reaches or one behind an own melee unit.
- **Zombies move in company.** "Round 13: a Zombie stepped alone next to
  three of my units after two rounds of retreating." Why the rule of
  [section 8](#8-the-normal-ai) let it: the rule held only for a step
  outside the seat's own land (that tile was in the capital's land), and
  it counted any own unit beside the tile as company (a Banshee stood on
  the capital next to it). Now: no Zombie Move that raises the damage it
  can take, or puts more enemy units beside it, unless a unit that fights
  hand to hand stands beside the destination (not a support unit, not the
  garrison of a center) or a striker within two tiles can still move
  this turn. In its own land too; not onto an own center.

### 13.7 The Human Normal AI against Zombies

Evidence: U-A ("it trained 14 Knights and fed 10 of them to Zombies: a
lone Knight attacks a full Zombie, is Bitten, stands there, and rises for
me", six rounds of twelve; its Captain came in round 11) and U-B ("it fed
Fighters and Guards one or two at a time into Zombies standing in my
land. All six died and all six rose"; no Captain in 26 rounds). Two rules
for every army seat that is not Undead:

- **The shots first.** A unit does not attack a full-HP unit that bites
  from the next tile while one of its own units can still shoot the same
  target this turn. Once the shot is made the Zombie is not at full HP
  and the rule is over.
- **The cure.** A seat with a Bitten unit and no unit that tends
  researches its Captain's technology next and trains the Captain before
  the unit its army would otherwise buy.

A unit with no shooter in range still strikes a full Zombie: that is the
old policy's decision, and it is why the Zombie is worth its slot.

### 13.8 Open forks and ideas, with the testers' evidence

Not done. Each is for the user.

1. **Is the Vampire's Escape too safe?** The two testers who played
   Vampires disagree.
   - U-A, yes: "too safe: nothing the Humans own catches it except a
     Knight that chooses to. 9 kills, one loss in 12 rounds, and that to
     a chain. Escape is a full 3-tile move, also after a kill that
     advanced it." Its proposal: an Escape of two tiles, or none after a
     kill that advanced it.
   - U-B, no: "Escape is not too safe: after a kill the forced advance
     left it where every exit was in a zone of control, with one tile of
     Escape and a Swordsman beside it (previewed 10, a kill; the AI did
     not take it)." Its Vampires came after the war was decided.
   - Both played against the Human AI, which follows a Vampire home only
     by chance.
2. **The Vampire at Raiding instead of Chivalry** (U-B): "It is the unit
   that answers Guards and hidden Marksmen, and it came four rounds after
   the war was decided": its twelfth technology, 44 Coins of research
   after the Lich (Scouting 9, Raiding 16, Chivalry 19).
3. **An Undead reason for Fieldcraft** (U-B): "I rejected it every time.
   Five of seven Undead units have Move 1 and already stop every tile."
   Its idea: Undead units also Recover in any Forest, which would soften
   Restless on the attack ("it cost me three or four Zombies that sat at
   2 to 8 HP beside the enemy capital").
4. **The risen Zombie's 10 HP.** U-A, an even fight: "no wave formed in 15
   conversions: a risen Zombie has 10 HP and one Catapult, Knight, or
   Swordsman hit kills it; 11 of 15 were dead again, most within one
   enemy turn. At 14 HP a Zombie took a Knight's 13 and stopped it." U-B,
   a weak opponent: "the wave formed in rounds 13 to 15 (7 risings in
   three rounds) and never stopped: 28 by the end", and what slowed it
   was Marksmen ("twelve of my 13 lost Zombies went that way"). So the
   same number reads as too low in one game and as the only brake in the
   other. It was left; the user ruled that conversion is not to be
   weakened, and a better opponent is the measure.
5. **An answer to a Knight for a poor Undead seat** (U-C): "Skeleton,
   Ghoul, and Banshee all die to one Knight hit and only the Zombie does
   not." Its idea (Bones also against a unit that moved two or more tiles
   before attacking) changes Bones, which was ruled unchanged; the Zombie
   at Drill is the answer the faction has.
6. **Smaller things the testers named and nobody changed:** training
   needs an empty center, so a garrison Zombie blocks its own city (U-A);
   a rising on a captured city's center besieges it (U-B, U-C); a
   Promotion heals fully and does not use the attack (U-C); Frenzy before
   a Move ends the Necromancer's turn while Raise Dead after a Move is
   allowed (U-B).

### 13.9 Text and events

- **Land Grant.** The text harness's line read "2c per tile, at least 6c"
  and the price charged was 1 Coin a tile (it has been since tuning 5).
  The line now prints the two numbers of the rule.
- **Muster** counts the different unit kinds a player can train that it
  has on the board; a reward-only unit (the Abomination, a Juggernaut)
  does not count, which is why U-B read 3 of 4 with Skeleton, Ghoul,
  Zombie, and Abomination. The rule was left and the texts say it: the
  achievement's goal reads "Field 4 unit types you can train." and the
  harness meter says "a reward-only unit does not count".
- **Why a Guard strikes back harder than it strikes.** Every unit strikes
  back with its Defense, not its Attack. A unit whose Defense is a point
  or more above its Attack has it on its line in the harness: "strikes
  back with its Defense 3, not its Attack" (a Guard deals a Skeleton 3
  when it attacks and 8 when it is attacked).
- **A Captain's cure** produced no event for the player whose bite it
  removed (U-A, round 11: "the tags were just gone"). A Tend that cures a
  Plague or a bite is now also projected to every player who sees the
  Captain and a cured unit, listing only the cured units that player
  sees; the harness prints "CURED: ... cured the bite of ...", and the
  game's turn summary says "Tend cured a bite". A Tend that only heals
  stays its owner's.
- **The lab's text** said the Humans hold 2 Knights; they do at the
  start and train two more in their first turn. It now says "at the
  start (and 30c on their first turn, which buys more)", and that the
  player's Liches need Pestilence to plague.
- **Unit and technology text:** the Ghoul's card has "Carrion: +1 Attack
  against a Bitten or Plagued unit."; the Lich's Plague line begins
  "With Pestilence:"; Raise Dead reads "Raises a 5 HP Skeleton from every
  free Grave within 2 tiles. They fill no unit slot."; Infect reads "A
  land unit it kills rises as your Zombie. It fills no unit slot."; the
  Undead tree names Explosives **Pestilence** with the unlock "Liches
  plague the units they hit".
- **Art.** None was made. Pestilence uses the Explosives node's icon and
  Carrion has no icon (a text line on the card). For an art bead: a
  Pestilence technology icon in the Undead tree's style, and, with the
  Bones icon of [section 10](#10-text), a Carrion ability icon.

### 13.10 Tests

`tests/unit/ruleset-v7-undead-pass.test.ts`, the describes "the
correction: ...":

- **a risen unit fills no unit slot:** a Zombie's kill, the Abomination's
  kill, and a Bitten death give a rising with no home city, the events
  say so, the state parses and the view shows it; the city that made it
  keeps its free slot and trains; a rising Disbands; a state whose rising
  has a home city still parses; the card text.
- **Plague needs Pestilence:** the unlock on the Undead Explosives node
  and on no other tree's, the name, the capability with and without the
  technology; a volley on a line of five deals the same 7 and 4, 4, 4, 4
  and plagues 5 with it and none without, in the preview and in the
  resolution; the AI's research of it with two Liches.
- **Raise Dead reaches two tiles:** a Grave two tiles away rises and one
  three away and one under a unit do not; a Grave on an unexplored tile
  is neither listed nor raised.
- **the Ghoul's Carrion:** Attack 2, 3 on a Bitten or a Plagued unit (not
  4 on both), 4 with a Charge, the damage (5, 8, a kill), no bonus for a
  Skeleton, a Zombie, or a Vampire; resolution equal to the preview, and
  the rising of what it kills; the one role that has it; the text.
- **the Undead Normal AI:** no unit in an enemy's reach outside its land
  in round 1 and one in round 11; no attack after a Move on a unit
  outside its land that does not kill, and the three exceptions (a kill,
  a unit that has not moved, round 11); its first units at the villages;
  the growth research by land (Forest, fertile ground, both), before the
  Banshee and after the Zombie, and bought before a unit unless an enemy
  is at the gates; the Banshee stepping off a threatened center and the
  Zombie stepping on; no Banshee trained onto a contested center; Walls
  for a threatened city and the Militia for a Human one; a Banshee
  walking up; a Zombie held alone in its own land and going with a
  Skeleton.
- **the Human Normal AI:** the Knight's strike on a full Zombie held
  while a Marksman can shoot it and offered after the shot; the Captain's
  technology and the Captain with a Bitten unit, not without one and not
  with a Captain on the board.
- **text and events:** a curing Tend projected to the Undead player with
  the cured unit only, a healing Tend not; the Guard's two numbers.

Rule tests that stated the old rules were changed with them
(`ruleset-v7-undead-combat`, `-undead-graves-actions`, `-undead-faction`,
`-revision14`, `-goblin-explosions`, `-revision20-industry`, the Dinosaur
and Goblin faction tests' technology names, the Undead DOM test, and the
harness test).

### 13.11 The diagnostic matches

Two matches between Normal AIs, each read for behaviour and not for who
wins.

**How often they were run.** The review asked for each once. The first
was run eight times and the second twice, each rerun after a change to a
rule that match exercises: the economy-first research was corrected four
times after reading it (every growth technology; then the land's only;
then bought before a unit; then without counting Fruit and Game as growth
already on offer), the Forest weight and the Banshee rule once each, and
the Human seat's cure research once (the lab match showed a seat with
seven Bitten Knights that never bought the Captain's technology in a
war). The first match's outcome moved with every one of those runs: the
Undead seat was alive at round 30 in the first and the last and
eliminated between round 19 and round 27 in the six between. That is
what one match is worth as a measure of strength, and none of it was
used as one. What follows is the last run of each, on this source.

**1. Humans first, Undead second, dry land 14 x 14, seed 4, thirty
rounds** (the map of [section 8.2](#82-two-diagnostic-matches) and of
U-C).

| End of round | Undead cities (levels) | Undead income | Undead units                                        | Human cities |
| ------------ | ---------------------- | ------------- | --------------------------------------------------- | ------------ |
| 5            | 2 (2, 1)               | 4             | 3 Skeletons                                         | 3            |
| 10           | 4 (2, 1, 1, 1)         | 5             | 5 Skeletons, 5 Zombies                              | 5            |
| 15           | 5 (2, 1, 1, 3, 2)      | 8             | 5 Skeletons, 4 Zombies, 2 Banshees, a Ghoul         | 6            |
| 20           | 5 (2, 1, 2, 3, 4)      | 11            | 7 Zombies, 3 Skeletons, 3 Banshees, a Lich          | 6            |
| 25           | 4 (2, 2, 3, 4)         | 10            | 9 Zombies, 5 Skeletons, 2 Banshees, a Lich, a Ghoul | 7            |
| 30           | 3 (2, 2, 3)            | 5             | 7 Zombies, a Lich, a Ghoul, a Skeleton              | 8            |

- **Technologies by round:** Gathering 1, Drill 3, **Hunting 5, Forestry
  10** (its economy technology: a Lumber Camp in round 11 and the first
  level from it), Marksmanship 14, **Sawmilling 17**, Administration 20,
  Scouting 21, Raiding 24, Chivalry 26, Fieldcraft 30. In U-C the same
  seat had Forestry in round 13 and never Sawmilling.
- **First units:** Zombie round 6, Banshee and a Scouts Ghoul round 15,
  **Lich round 18** (one, eight shots, no Pestilence: that needs two
  Liches), no Necromancer or Vampire trained by round 30.
- **Villages:** it took one in each of rounds 5, 6, 9, and 15: four
  cities by round 9 (three in U-C) and five by round 15.
- 21 units rose for it, its Banshees wailed 11 times, and two of its
  cities took Walls.

**The Human seat in that match:** it had a unit Bitten early and bought
**Administration in round 10 and its first Captain in round 11** (three
in all; one cure). It **shot full Zombies 13 times and struck them hand to
hand 3 times** (with no shooter in range); 19 of its units were Bitten
while attacking, ten of them Fighters. It trained its first Knight in
round 26 (three; five Knight attacks, two of them Bitten).

**2. `LAB_UNDEAD_MID` with the Normal AI on both sides, fourteen rounds**
(the Human AI has Knights from the start here).

- **The Human seat** trains 15 Knights (the lab game's 14), which make 43
  attacks, and 7 are Bitten while attacking. It shoots a full Zombie 5
  times and strikes one hand to hand 4 times. It buys **Administration in
  round 4 and two Captains from round 4** (in the lab game it had bought
  its first in round 11); the Captains cured nothing in fourteen rounds:
  a Bitten Knight is dead or far from them a turn later.
- **The Undead seat** researches Fortification in round 2 and
  **Pestilence in round 9** (it has three Liches from round 1); its
  Liches fire 28 shots and plague 12 units. 15 units
  rise for it, its Necromancer raises 7 Skeletons (3 in the run of
  [section 8.2](#82-two-diagnostic-matches), from the tiles beside it),
  and it trains every unit of the roster. It holds four cities of five at
  round 14 with 13 units against 23.

**What they show.** The opening and research rules do what they say on
that map: villages before fights, a growth technology in round 5, the
Lich's technology in round 17. The Human seat answers Zombies with shots
and buys its Captain. What they do not show: an Undead AI that is the
Human AI's equal from round 1 ([section 12](#12-what-is-still-open)),
and whether the Captain's cure ever matters against Knights that die the
turn after they are Bitten.
