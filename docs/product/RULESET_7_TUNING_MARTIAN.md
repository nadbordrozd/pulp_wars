# Ruleset 7: the Martian faction pass

**Status:** implemented on `pulp-wars-poc-7r52` (bead `pulp_wars-w49.14`),
with the correction of
[section 13](#13-the-correction-after-three-hand-played-games) after three
hand-played games (the Martians in the lab, the Martians from turn 1, and
the Humans against the Martian AI). Sections 1 to 12 are the pass as it
was first written; where the correction changed a rule, the passage says
so and section 13 has the reasons. The numbers of
[section 2.0](#20-numbers-from-the-script) are the script's output on the
final rules. The rules themselves are stated in
[Ruleset 7: current rules](RULESET_7_CURRENT.md); this document is the
reasoning and the record, in the shape of
[the Undead pass](RULESET_7_TUNING_UNDEAD.md),
[the Goblin pass](RULESET_7_TUNING_GOBLIN.md), and
[the Human pass](RULESET_7_TUNING_HUMAN.md).

**Superseded in part by [the ninth unit](RULESET_7_NINTH_UNIT.md) (`pulp-wars-poc-7r55`, `pulp_wars-w49.17`).** The Martians have a ninth land
unit and their first melee unit, the **Shock Trooper** (the heavy line
role, at Metallurgy; Shield 3, and while Shielded a melee attacker takes
3), so the roster, the research order (the Shock Trooper after the Ray
Gunner), "eight Martian land roles", and every statement that the
Martians have no body for the front are out of date. The Human Swordsman
this document fights is the Champion (6 Coins, at Metallurgy).
`LAB_MARTIAN_MID` is at revision 2: your seat owns Engineering and
Metallurgy too. The record below is unchanged.

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
differ from other factions' by more than numbers. Two failures count: a
faction that always wins, and a faction with one unit so good that training
anything else makes no sense. Strong combinations that can be countered are
wanted; an ability that is too strong too early goes behind a later
technology, it is not weakened. One rule was asked for by name: **a unit
pulled by a Tractor Beam explores from the tile it is pulled to, with its
ordinary sight**. Not reopened: the forced advance after a kill stays,
Bitten stays permanent, the Human Knight and its Overrun are untouched,
Stockpile stays 4, and ranged units (the Grunt and the Colossus among
them) never advance.

**The method** is the Human pass's: scenario reasoning from the engine's
exact public combat previews on constructed positions and small scenarios
played by the reducer (`scripts/martian-tuning-analysis-v7.ts`, which plays
no match), and two diagnostic matches read for what the Martian AI
researches, buys, and does. No AI-against-AI result was counted as
evidence of balance.

**Superseded in part at `pulp-wars-poc-7r56`** ([the Industry reshuffle](RULESET_7_INDUSTRY_RESHUFFLE.md), `pulp_wars-w49.21`): The Shield Projector is unlocked by Force Fields, one technology behind the root, which is shown as Crafting and unlocks the Workshop; Engineering no longer does. The games recorded here were played with the Projector at the root and Force Fields as its later upgrade. Nothing else here changed, and no number did.

**Step two** ([section 14](#14-step-two), `pulp-wars-poc-7r58`, `pulp_wars-w49.25`): the first hand-played pass since the Shock Trooper and the reshuffle. City Walls hold a unit on its own center against a Saucer's Tractor Beam; the Martian seat of the Normal AI trains before it researches, takes its free Saucers, and no longer wastes its Tripods. Where the sections below say that a Saucer pulls a unit off a walled center, that a Martian seat researches the Shock Trooper third or Heat Sinks before the Mothership, or that the seat's Tripods walk to the front, section 14 has what holds now.

## 1. The changes

| #   | Change            | Before (`7r51`)                                                                                                    | Now (`7r52`)                                                                                                                                                                                                                         | Other factions                                                                              |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 1   | Tractor Beam      | a pulled own unit revealed its sight for the puller's owner; a pulled enemy unit revealed nothing for its owner    | **the pulled unit explores**: its owner sees its ordinary sight radius from the tile it lands on, whoever pulled it                                                                                                                  | every faction whose unit is pulled sees from where it lands                                 |
| 2   | Level 2 reward    | Survey (Humans, Goblins, Undead: Scouts, the survey and a free fast unit) or Stockpile                             | **Scouts for the Martians too**: the survey and a free Saucer, with its Shield                                                                                                                                                       | the other four keep the plain Survey until their passes                                     |
| 3   | Shield Projector  | every own unit that recharged beside it had Shield 4, from the first Projector (Drill, a tier-1 technology)        | **the Force Field needs Force Fields** (the Martian Fortification, one technology after Drill): until then a Projector is a 12-HP body with Shield 3; with it, the field and the end-of-turn recharge both                           | their attacks on a Martian line meet Shield 2, not 4, until the Martians buy the technology |
| 4   | Fieldcraft        | Replant Forest, Forest march, Ray Gunner Sight 2: the weak node of every tree                                      | **Heat Sinks** (the Martian name of Fieldcraft): also, a Ray Gunner's full-power ray leaves it no Cooling, so it fires at full power every turn it does not move. The Tripod and the Colossus still overheat                         | none                                                                                        |
| 5   | Martian Normal AI | its own older policy in every match (Drill and Scouting first, one Saucer for three front units, Grunts in danger) | **plays the army rules** of the Human, Goblin, and Undead seats in a match of those four factions: Projector, an economy technology, Ray Gunner, Tripod, Brain, Saucer, Mothership; two fifths Grunts; [section 8](#8-the-normal-ai) | a Human, Goblin, or Undead seat plays the army rules against Martians too                   |
| 6   | Lab               | none for the Martians as the player                                                                                | `LAB_MARTIAN_MID`: the hand player is the Martians in an even middle game ([section 9](#9-the-lab))                                                                                                                                  | —                                                                                           |

**The correction** ([section 13](#13-the-correction-after-three-hand-played-games))
added, on the same identity: **the Force Field holds** (a full-HP unit
with a whole field is left at 1 HP by one attack); **Psychic Command
every second turn**; **Release** of a mind-controlled unit; rules for the
Martian and the Human seat of the Normal AI; and text.

No number of the Martian roster changed: every price, HP, Shield, Attack,
Defense, Move, and range is as it was. Heat Sinks is one unlock
(`HEAT_SINKS`), one role mechanic (`heatSink`, the Martian `MARKSMAN`
only), and one capability (`heatSinks`); the Force Field gate is one
capability (`projectsForceField`). No command, event, state, or view shape
changed. A match without a Martian seat plays as at `7r51`.

### 1.1 Decisions that are forks, for the user to overrule

1. **The Force Field is behind a technology.** It is the one change that
   takes something away, and it follows the standing rule "too strong too
   early goes behind a later technology". At `7r51` the first technology a
   Martian player bought (5 Coins) made every unit beside a 4-Coin Projector
   take 2 less from every attack, every turn, from about round 4: a
   Fighter's attack on a Grunt cost it 1 HP instead of 3, a Marksman's 1
   instead of 3, a Bomb Chucker's 1 instead of 3. Against the cheap units of
   the first ten rounds that is close to immunity; the faction won about
   three quarters of its coarse games with it before the Grunt lost HP
   twice. Now the same line costs one more technology (7 to
   10 Coins), which also gives the end-of-turn recharge, so Force Fields
   went from the weakest node of the Martian tree to one of its best. To
   overrule: `projectsForceField` back to "always" is a one-line change.
2. **Heat Sinks is the Ray Gunner's alone.** A Tripod that fired at full
   power every turn would kill a Fighter, a Marksman, a Raider, or a Knight
   every turn from two tiles for 9 Coins; that is the "one best unit". The
   Ray Gunner needed the help: without it a Grunt deals as much over two
   turns for a Coin less and may move ([section 2.1](#21-what-the-numbers-say)).
3. **Scouts gives a Saucer**, the Martian fast unit, as the other three
   passes gave their Raider. It cannot capture, so unlike a Raider, a Wolf
   Rider, or a Ghoul it takes no village; it carries a Grunt to one (Beam
   Down), and it sees two tiles.
4. **Pierce was left on the Tripod from its first shot.** The prepared
   alternative, if hand play finds the Tripod too good against lines, is
   "Pierce needs the Disintegrator". It was not built: a Pierce hit is half
   the damage on one unit that must stand exactly behind the target, and it
   hits own units too.
5. **Nothing was done about the Human Knight against a Martian line**
   ([section 6.5](#65-the-knight-against-a-martian-line)). A Knight kills a
   Grunt, a Ray Gunner, a Brain, a Saucer, or a Tripod in one attack through
   any Shield and rides on; five Grunts in a row die in one turn. The Knight
   is a ruling. The Martian answers are in the roster (a Shield Projector in
   the line ends the ride, the Saucer's pull brings the Knight into two
   rays before it charges, a Brain takes a wounded one, units that do not
   touch cannot be chained), and the AI now uses the first and the last.
   This is the largest open risk of the pass. **Hand play confirmed it
   (the Human player won with Knights alone), and the correction acts on
   the Martian side: the Force Field holds
   ([section 13.1](#131-the-force-field-holds)). The Knight is unchanged.**
6. **The Grunt was left at 3 Coins, Attack 2, range 2.** It is the most
   efficient Martian unit per Coin and the reason the faction can open at
   all; what it does not do is in [section 3](#3-every-martian-unit). If
   hand play finds a Grunt-only army best, the first step is the Grunt's
   range-2 shot at Attack 1.5 (its hand-to-hand attack kept), not its price.
7. **The Mothership was left** at 8 Coins and two unit slots. It is the
   weakest buy per Coin as a fighter, and it is not bought as one: its free
   Heavy Tractor Beam empties a walled center once a turn.

## 2. Scenario analysis

### 2.0 Numbers from the script

Output of `npx tsx scripts/martian-tuning-analysis-v7.ts` on
`pulp-wars-poc-7r52`, unedited except for heading levels.

#### Matchup matrix

Each cell: HP damage dealt / the whole hit taken back in the first attack (both units at full HP) and × the number of attacks by fresh full-HP attackers of that kind that kill the defender; then `p` the damage with Psychic Command (+1 Attack; a Tripod and a Brain are never Inspired). `K` is a kill of the full-HP defender. A Grunt, a Ray Gunner, a Tripod, and a Colossus attack from two tiles, the others from the next tile. A heat ray is at full power when the unit has not moved and is not Cooling, otherwise at half power; a Saucer marked (Strafe) has moved two tiles with Raiding. Of the hit a Martian attacker takes back its Shield absorbs the first 2 points (a Shield Projector and a Colossus 3, a Mothership 4, any unit in a Force Field 4).

##### Martian attackers on Human units

**Open ground**

| Attacker (cost, HP, Atk/Def)          | Fighter 2c 12hp | Guard 3c 17hp  | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------- | --------------- | -------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Grunt (3c, 8, 2/1.5)                  | 5/0 ×3; p 8     | 6/0 ×3; p 10   | 6/0 ×2; p 10    | 6/2 ×2; p 10     | 6/0 ×2; p 10K   | 4/0 ×3; p 7       | 7/0 ×2; p 10K    | 6/0 ×2; p 10    | 3/0 ×10; p 6       |
| Saucer (4c, 8, 1.5/1)                 | 3/5 ×4; p 6     | 2/9 ×6; p 5    | 4/2 ×3; p 8     | 4/2 ×3; p 8      | 4/2 ×3; p 8     | 3/7 ×5; p 6       | 5/0 ×2; p 9      | 4/2 ×3; p 8     | 2/10 ×15; p 4      |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 6/4 ×2; p 10    | 5/7 ×3; p 8    | 8/1 ×2; p 12K   | 8/1 ×2; p 12K    | 8/1 ×2; p 10K   | 6/6 ×3; p 9       | 9/0 ×2; p 10K    | 8/1 ×2; p 12    | 4/10 ×7; p 7       |
| Ray Gunner (full power) (4c, 8, 3/1)  | 8/0 ×2; p 12K   | 10/0 ×2; p 14  | 10/0 ×2; p 12K  | 10/1 ×2; p 12K   | 10K/0 ×1; p 10K | 7/0 ×2; p 11      | 10K/0 ×1; p 10K  | 10/0 ×2; p 13K  | 6/0 ×6; p 9        |
| Ray Gunner (half power) (4c, 8, 3/1)  | 3/0 ×4; p 6     | 4/0 ×4; p 8    | 4/0 ×3; p 8     | 4/2 ×3; p 8      | 4/0 ×3; p 8     | 3/0 ×5; p 6       | 5/1 ×2; p 9      | 4/0 ×3; p 8     | 2/0 ×15; p 4       |
| Shield Projector (4c, 12, 1.5/2.5)    | 3/5 ×4; p 6     | 2/9 ×6; p 5    | 4/2 ×3; p 8     | 4/2 ×3; p 8      | 4/2 ×3; p 8     | 3/7 ×5; p 6       | 5/0 ×2; p 9      | 4/2 ×3; p 8     | 2/13 ×15; p 4      |
| Brain (5c, 8, 1/1)                    | 2/6 ×6          | 1/10 ×11       | 2/2 ×5          | 2/2 ×5           | 2/2 ×4          | 1/8 ×9            | 3/0 ×3           | 2/2 ×5          | 1/10 ×29           |
| Tripod (full power) (9c, 12, 4/1)     | 12K/0 ×1        | 14/0 ×2        | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 11/0 ×2           | 10K/0 ×1         | 13K/0 ×1        | 9/0 ×4             |
| Tripod (half power) (9c, 12, 4/1)     | 5/0 ×3          | 6/0 ×3         | 6/0 ×2          | 6/2 ×2           | 6/0 ×2          | 4/0 ×3            | 7/0 ×2           | 6/0 ×2          | 3/0 ×10            |
| Mothership (8c, 16, 2.5/2)            | 6/4 ×2; p 10    | 5/7 ×3; p 8    | 8/1 ×2; p 12K   | 8/1 ×2; p 12K    | 8/1 ×2; p 10K   | 6/6 ×3; p 9       | 9/0 ×2; p 10K    | 8/1 ×2; p 12    | 4/11 ×7; p 7       |
| Colossus (full power) (—c, 32, 4/2.5) | 12K/0 ×1; p 12K | 14/0 ×2; p 17K | 12K/0 ×1; p 12K | 12K/0 ×1; p 12K  | 10K/0 ×1; p 10K | 11/0 ×2; p 15K    | 10K/0 ×1; p 10K  | 13K/0 ×1; p 13K | 9/0 ×4; p 13       |
| Colossus (half power) (—c, 32, 4/2.5) | 5/0 ×3; p 8     | 6/0 ×3; p 10   | 6/0 ×2; p 10    | 6/2 ×2; p 10     | 6/0 ×2; p 10K   | 4/0 ×3; p 7       | 7/0 ×2; p 10K    | 6/0 ×2; p 10    | 3/0 ×10; p 6       |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)          | Fighter 2c 12hp | Guard 3c 17hp  | Raider 4c 12hp  | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp  | Juggernaut —c 40hp |
| ------------------------------------- | --------------- | -------------- | --------------- | ---------------- | --------------- | ----------------- | ---------------- | --------------- | ------------------ |
| Grunt (3c, 8, 2/1.5)                  | 4/0 ×3; p 7     | 5/0 ×3; p 9    | 5/0 ×3; p 9     | 5/2 ×3; p 9      | 5/0 ×2; p 9     | 3/0 ×4; p 6       | 7/0 ×2; p 10K    | 5/0 ×3; p 9     | 2/0 ×12; p 5       |
| Saucer (4c, 8, 1.5/1)                 | 2/5 ×4; p 5     | 2/9 ×7; p 4    | 3/2 ×3; p 7     | 3/2 ×3; p 7      | 3/2 ×3; p 7     | 2/7 ×6; p 5       | 5/0 ×2; p 9      | 3/2 ×4; p 7     | 1/10 ×19; p 3      |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 5/4 ×2; p 8     | 4/7 ×4; p 7    | 7/1 ×2; p 11    | 7/1 ×2; p 11     | 7/1 ×2; p 10K   | 5/6 ×3; p 8       | 9/0 ×2; p 10K    | 7/1 ×2; p 11    | 3/10 ×9; p 6       |
| Ray Gunner (full power) (4c, 8, 3/1)  | 7/0 ×2; p 10    | 9/0 ×2; p 13   | 9/0 ×2; p 12K   | 9/1 ×2; p 12K    | 9/0 ×2; p 10K   | 6/0 ×3; p 9       | 10K/0 ×1; p 10K  | 9/0 ×2; p 13K   | 5/0 ×7; p 7        |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×4; p 5     | 3/0 ×5; p 7    | 3/0 ×3; p 7     | 3/2 ×3; p 7      | 3/0 ×3; p 7     | 2/0 ×6; p 5       | 5/1 ×2; p 9      | 3/0 ×4; p 7     | 1/0 ×19; p 3       |
| Shield Projector (4c, 12, 1.5/2.5)    | 2/5 ×4; p 5     | 2/9 ×7; p 4    | 3/2 ×3; p 7     | 3/2 ×3; p 7      | 3/2 ×3; p 7     | 2/7 ×6; p 5       | 5/0 ×2; p 9      | 3/2 ×4; p 7     | 1/13 ×19; p 3      |
| Brain (5c, 8, 1/1)                    | 1/6 ×8          | 1/10 ×13       | 2/2 ×5          | 2/2 ×5           | 2/2 ×5          | 1/8 ×11           | 3/0 ×4           | 2/2 ×6          | 1/10 ×∞            |
| Tripod (full power) (9c, 12, 4/1)     | 10/0 ×2         | 13/0 ×2        | 12K/0 ×1        | 12K/0 ×1         | 10K/0 ×1        | 9/0 ×2            | 10K/0 ×1         | 13K/0 ×1        | 7/0 ×5             |
| Tripod (half power) (9c, 12, 4/1)     | 4/0 ×3          | 5/0 ×3         | 5/0 ×3          | 5/2 ×3           | 5/0 ×2          | 3/0 ×4            | 7/0 ×2           | 5/0 ×3          | 2/0 ×12            |
| Mothership (8c, 16, 2.5/2)            | 5/4 ×2; p 8     | 4/7 ×4; p 7    | 7/1 ×2; p 11    | 7/1 ×2; p 11     | 7/1 ×2; p 10K   | 5/6 ×3; p 8       | 9/0 ×2; p 10K    | 7/1 ×2; p 11    | 3/11 ×9; p 6       |
| Colossus (full power) (—c, 32, 4/2.5) | 10/0 ×2; p 12K  | 13/0 ×2; p 17K | 12K/0 ×1; p 12K | 12K/0 ×1; p 12K  | 10K/0 ×1; p 10K | 9/0 ×2; p 13      | 10K/0 ×1; p 10K  | 13K/0 ×1; p 13K | 7/0 ×5; p 10       |
| Colossus (half power) (—c, 32, 4/2.5) | 4/0 ×3; p 7     | 5/0 ×3; p 9    | 5/0 ×3; p 9     | 5/2 ×3; p 9      | 5/0 ×2; p 9     | 3/0 ×4; p 6       | 7/0 ×2; p 10K    | 5/0 ×3; p 9     | 2/0 ×12; p 5       |

**Field Defense (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)          | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp |
| ------------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ----------------- | ---------------- | -------------- | ------------------ |
| Grunt (3c, 8, 2/1.5)                  | 3/0 ×3; p 6     | 4/0 ×4; p 7   | 4/0 ×3; p 7    | 4/2 ×3; p 7      | 4/0 ×3; p 7     | 3/0 ×4; p 5       | 4/0 ×3; p 7      | 4/0 ×3; p 7    | 2/0 ×12; p 5       |
| Saucer (4c, 8, 1.5/1)                 | 2/5 ×5; p 4     | 2/9 ×7; p 4   | 2/2 ×4; p 5    | 2/2 ×4; p 5      | 2/2 ×4; p 5     | 2/7 ×6; p 4       | 3/0 ×3; p 6      | 2/2 ×5; p 5    | 1/10 ×19; p 3      |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 4/4 ×3; p 7     | 4/7 ×4; p 6   | 5/1 ×2; p 8    | 5/1 ×2; p 8      | 5/1 ×2; p 8     | 4/6 ×3; p 7       | 6/0 ×2; p 9      | 5/1 ×3; p 8    | 3/10 ×9; p 6       |
| Ray Gunner (full power) (4c, 8, 3/1)  | 6/0 ×2; p 9     | 7/0 ×3; p 10  | 7/0 ×2; p 10   | 7/1 ×2; p 10     | 7/0 ×2; p 10K   | 5/0 ×3; p 8       | 7/0 ×2; p 10K    | 7/0 ×2; p 10   | 5/0 ×7; p 7        |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×5; p 4     | 2/0 ×6; p 5   | 2/0 ×4; p 5    | 2/2 ×4; p 5      | 2/0 ×4; p 5     | 2/0 ×6; p 4       | 3/1 ×3; p 6      | 2/0 ×5; p 5    | 1/0 ×19; p 3       |
| Shield Projector (4c, 12, 1.5/2.5)    | 2/5 ×5; p 4     | 2/9 ×7; p 4   | 2/2 ×4; p 5    | 2/2 ×4; p 5      | 2/2 ×4; p 5     | 2/7 ×6; p 4       | 3/0 ×3; p 6      | 2/2 ×5; p 5    | 1/13 ×19; p 3      |
| Brain (5c, 8, 1/1)                    | 1/6 ×9          | 1/10 ×14      | 1/2 ×8         | 1/2 ×8           | 1/2 ×7          | 1/8 ×12           | 1/0 ×6           | 1/2 ×9         | 1/10 ×∞            |
| Tripod (full power) (9c, 12, 4/1)     | 9/0 ×2          | 10/0 ×2       | 10/0 ×2        | 10/1 ×2          | 10K/0 ×1        | 8/0 ×2            | 10K/0 ×1         | 10/0 ×2        | 7/0 ×5             |
| Tripod (half power) (9c, 12, 4/1)     | 3/0 ×3          | 4/0 ×4        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 3/0 ×4            | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            |
| Mothership (8c, 16, 2.5/2)            | 4/4 ×3; p 7     | 4/7 ×4; p 6   | 5/1 ×2; p 8    | 5/1 ×2; p 8      | 5/1 ×2; p 8     | 4/6 ×3; p 7       | 6/0 ×2; p 9      | 5/1 ×3; p 8    | 3/11 ×9; p 6       |
| Colossus (full power) (—c, 32, 4/2.5) | 9/0 ×2; p 12K   | 10/0 ×2; p 14 | 10/0 ×2; p 12K | 10/1 ×2; p 12K   | 10K/0 ×1; p 10K | 8/0 ×2; p 12      | 10K/0 ×1; p 10K  | 10/0 ×2; p 13K | 7/0 ×5; p 10       |
| Colossus (half power) (—c, 32, 4/2.5) | 3/0 ×3; p 6     | 4/0 ×4; p 7   | 4/0 ×3; p 7    | 4/2 ×3; p 7      | 4/0 ×3; p 7     | 3/0 ×4; p 5       | 4/0 ×3; p 7      | 4/0 ×3; p 7    | 2/0 ×12; p 5       |

**Walled city center (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)          | Fighter 2c 12hp | Guard 3c 17hp | Raider 4c 12hp | Marksman 4c 12hp | Captain 5c 10hp | Swordsman 5c 15hp | Catapult 8c 10hp | Knight 9c 13hp | Juggernaut —c 40hp |
| ------------------------------------- | --------------- | ------------- | -------------- | ---------------- | --------------- | ----------------- | ---------------- | -------------- | ------------------ |
| Grunt (3c, 8, 2/1.5)                  | 3/0 ×3; p 6     | 4/0 ×4; p 7   | 4/0 ×3; p 7    | 4/2 ×3; p 7      | 4/0 ×3; p 7     | 3/0 ×4; p 5       | 4/0 ×3; p 7      | 4/0 ×3; p 7    | 2/0 ×12; p 5       |
| Saucer (4c, 8, 1.5/1)                 | 2/5 ×5; p 4     | 2/9 ×7; p 4   | 2/2 ×4; p 5    | 2/2 ×4; p 5      | 2/2 ×4; p 5     | 2/7 ×6; p 4       | 3/0 ×3; p 6      | 2/2 ×5; p 5    | 1/10 ×19; p 3      |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 4/4 ×3; p 7     | 4/7 ×4; p 6   | 5/1 ×2; p 8    | 5/1 ×2; p 8      | 5/1 ×2; p 8     | 4/6 ×3; p 7       | 6/0 ×2; p 9      | 5/1 ×3; p 8    | 3/10 ×9; p 6       |
| Ray Gunner (full power) (4c, 8, 3/1)  | 6/0 ×2; p 9     | 7/0 ×3; p 10  | 7/0 ×2; p 10   | 7/1 ×2; p 10     | 7/0 ×2; p 10K   | 5/0 ×3; p 8       | 7/0 ×2; p 10K    | 7/0 ×2; p 10   | 5/0 ×7; p 7        |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×5; p 4     | 2/0 ×6; p 5   | 2/0 ×4; p 5    | 2/2 ×4; p 5      | 2/0 ×4; p 5     | 2/0 ×6; p 4       | 3/1 ×3; p 6      | 2/0 ×5; p 5    | 1/0 ×19; p 3       |
| Shield Projector (4c, 12, 1.5/2.5)    | 2/5 ×5; p 4     | 2/9 ×7; p 4   | 2/2 ×4; p 5    | 2/2 ×4; p 5      | 2/2 ×4; p 5     | 2/7 ×6; p 4       | 3/0 ×3; p 6      | 2/2 ×5; p 5    | 1/13 ×19; p 3      |
| Brain (5c, 8, 1/1)                    | 1/6 ×9          | 1/10 ×14      | 1/2 ×8         | 1/2 ×8           | 1/2 ×7          | 1/8 ×12           | 1/0 ×6           | 1/2 ×9         | 1/10 ×∞            |
| Tripod (full power) (9c, 12, 4/1)     | 9/0 ×2          | 10/0 ×2       | 10/0 ×2        | 10/1 ×2          | 10K/0 ×1        | 8/0 ×2            | 10K/0 ×1         | 10/0 ×2        | 7/0 ×5             |
| Tripod (half power) (9c, 12, 4/1)     | 3/0 ×3          | 4/0 ×4        | 4/0 ×3         | 4/2 ×3           | 4/0 ×3          | 3/0 ×4            | 4/0 ×3           | 4/0 ×3         | 2/0 ×12            |
| Mothership (8c, 16, 2.5/2)            | 4/4 ×3; p 7     | 4/7 ×4; p 6   | 5/1 ×2; p 8    | 5/1 ×2; p 8      | 5/1 ×2; p 8     | 4/6 ×3; p 7       | 6/0 ×2; p 9      | 5/1 ×3; p 8    | 3/11 ×9; p 6       |
| Colossus (full power) (—c, 32, 4/2.5) | 9/0 ×2; p 12K   | 10/0 ×2; p 14 | 10/0 ×2; p 12K | 10/1 ×2; p 12K   | 10K/0 ×1; p 10K | 8/0 ×2; p 12      | 10K/0 ×1; p 10K  | 10/0 ×2; p 13K | 7/0 ×5; p 10       |
| Colossus (half power) (—c, 32, 4/2.5) | 3/0 ×3; p 6     | 4/0 ×4; p 7   | 4/0 ×3; p 7    | 4/2 ×3; p 7      | 4/0 ×3; p 7     | 3/0 ×4; p 5       | 4/0 ×3; p 7      | 4/0 ×3; p 7    | 2/0 ×12; p 5       |

##### Martian attackers on Goblin units

**Open ground**

| Attacker (cost, HP, Atk/Def)          | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Grunt (3c, 8, 2/1.5)                  | 6K/0 ×1; p 6K | 6/0 ×2; p 10K      | 6/2 ×2; p 8K        | 4/0 ×3; p 7       | 6/0 ×2; p 10        | 7/0 ×2; p 8K       | 6/0 ×2; p 10K       | 4/0 ×9; p 7   |
| Saucer (4c, 8, 1.5/1)                 | 5/1 ×2; p 6K  | 4/2 ×3; p 8        | 4/0 ×2; p 8K        | 3/7 ×5; p 6       | 4/2 ×3; p 8         | 5/0 ×2; p 8K       | 4/2 ×3; p 8         | 2/9 ×13; p 5  |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 6K/0 ×1; p 6K | 8/1 ×2; p 10K      | 8K/0 ×1; p 8K       | 6/6 ×3; p 9       | 8/1 ×2; p 12K       | 8K/0 ×1; p 8K      | 8/1 ×2; p 10K       | 5/7 ×7; p 8   |
| Ray Gunner (full power) (4c, 8, 3/1)  | 6K/0 ×1; p 6K | 10K/0 ×1; p 10K    | 8K/0 ×1; p 8K       | 7/0 ×2; p 11      | 10/0 ×2; p 12K      | 8K/0 ×1; p 8K      | 10K/0 ×1; p 10K     | 7/0 ×5; p 10  |
| Ray Gunner (half power) (4c, 8, 3/1)  | 5/0 ×2; p 6K  | 4/0 ×3; p 8        | 4/2 ×2; p 8K        | 3/0 ×5; p 6       | 4/0 ×3; p 8         | 5/1 ×2; p 8K       | 4/0 ×3; p 8         | 2/0 ×13; p 5  |
| Shield Projector (4c, 12, 1.5/2.5)    | 5/1 ×2; p 6K  | 4/2 ×3; p 8        | 4/0 ×2; p 8K        | 3/7 ×5; p 6       | 4/2 ×3; p 8         | 5/0 ×2; p 8K       | 4/2 ×3; p 8         | 2/9 ×13; p 5  |
| Brain (5c, 8, 1/1)                    | 3/1 ×2        | 2/2 ×4             | 2/0 ×3              | 1/8 ×9            | 2/2 ×5              | 3/0 ×3             | 2/2 ×4              | 1/10 ×26      |
| Tripod (full power) (9c, 12, 4/1)     | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 11/0 ×2           | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 10/0 ×4       |
| Tripod (half power) (9c, 12, 4/1)     | 6K/0 ×1       | 6/0 ×2             | 6/2 ×2              | 4/0 ×3            | 6/0 ×2              | 7/0 ×2             | 6/0 ×2              | 4/0 ×9        |
| Mothership (8c, 16, 2.5/2)            | 6K/0 ×1; p 6K | 8/1 ×2; p 10K      | 8K/0 ×1; p 8K       | 6/6 ×3; p 9       | 8/1 ×2; p 12K       | 8K/0 ×1; p 8K      | 8/1 ×2; p 10K       | 5/7 ×7; p 8   |
| Colossus (full power) (—c, 32, 4/2.5) | 6K/0 ×1; p 6K | 10K/0 ×1; p 10K    | 8K/0 ×1; p 8K       | 11/0 ×2; p 15K    | 12K/0 ×1; p 12K     | 8K/0 ×1; p 8K      | 10K/0 ×1; p 10K     | 10/0 ×4; p 14 |
| Colossus (half power) (—c, 32, 4/2.5) | 6K/0 ×1; p 6K | 6/0 ×2; p 10K      | 6/2 ×2; p 8K        | 4/0 ×3; p 7       | 6/0 ×2; p 10        | 7/0 ×2; p 8K       | 6/0 ×2; p 10K       | 4/0 ×9; p 7   |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)          | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Grunt (3c, 8, 2/1.5)                  | 6K/0 ×1; p 6K | 5/0 ×2; p 9        | 5/2 ×2; p 8K        | 3/0 ×4; p 6       | 5/0 ×3; p 9         | 7/0 ×2; p 8K       | 5/0 ×2; p 9         | 3/0 ×11; p 5  |
| Saucer (4c, 8, 1.5/1)                 | 5/1 ×2; p 6K  | 3/2 ×3; p 7        | 3/0 ×3; p 7         | 2/7 ×6; p 5       | 3/2 ×3; p 7         | 5/0 ×2; p 8K       | 3/2 ×3; p 7         | 2/9 ×16; p 4  |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 6K/0 ×1; p 6K | 7/1 ×2; p 10K      | 7/0 ×2; p 8K        | 5/6 ×3; p 8       | 7/1 ×2; p 11        | 8K/0 ×1; p 8K      | 7/1 ×2; p 10K       | 4/7 ×8; p 7   |
| Ray Gunner (full power) (4c, 8, 3/1)  | 6K/0 ×1; p 6K | 9/0 ×2; p 10K      | 8K/0 ×1; p 8K       | 6/0 ×3; p 9       | 9/0 ×2; p 12K       | 8K/0 ×1; p 8K      | 9/0 ×2; p 10K       | 5/0 ×6; p 8   |
| Ray Gunner (half power) (4c, 8, 3/1)  | 5/0 ×2; p 6K  | 3/0 ×3; p 7        | 3/2 ×3; p 7         | 2/0 ×6; p 5       | 3/0 ×3; p 7         | 5/1 ×2; p 8K       | 3/0 ×3; p 7         | 2/0 ×16; p 4  |
| Shield Projector (4c, 12, 1.5/2.5)    | 5/1 ×2; p 6K  | 3/2 ×3; p 7        | 3/0 ×3; p 7         | 2/7 ×6; p 5       | 3/2 ×3; p 7         | 5/0 ×2; p 8K       | 3/2 ×3; p 7         | 2/9 ×16; p 4  |
| Brain (5c, 8, 1/1)                    | 3/1 ×2        | 2/2 ×5             | 2/0 ×4              | 1/8 ×11           | 2/2 ×5              | 3/0 ×3             | 2/2 ×5              | 1/10 ×∞       |
| Tripod (full power) (9c, 12, 4/1)     | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 9/0 ×2            | 12K/0 ×1            | 8K/0 ×1            | 10K/0 ×1            | 8/0 ×4        |
| Tripod (half power) (9c, 12, 4/1)     | 6K/0 ×1       | 5/0 ×2             | 5/2 ×2              | 3/0 ×4            | 5/0 ×3              | 7/0 ×2             | 5/0 ×2              | 3/0 ×11       |
| Mothership (8c, 16, 2.5/2)            | 6K/0 ×1; p 6K | 7/1 ×2; p 10K      | 7/0 ×2; p 8K        | 5/6 ×3; p 8       | 7/1 ×2; p 11        | 8K/0 ×1; p 8K      | 7/1 ×2; p 10K       | 4/7 ×8; p 7   |
| Colossus (full power) (—c, 32, 4/2.5) | 6K/0 ×1; p 6K | 10K/0 ×1; p 10K    | 8K/0 ×1; p 8K       | 9/0 ×2; p 13      | 12K/0 ×1; p 12K     | 8K/0 ×1; p 8K      | 10K/0 ×1; p 10K     | 8/0 ×4; p 12  |
| Colossus (half power) (—c, 32, 4/2.5) | 6K/0 ×1; p 6K | 5/0 ×2; p 9        | 5/2 ×2; p 8K        | 3/0 ×4; p 6       | 5/0 ×3; p 9         | 7/0 ×2; p 8K       | 5/0 ×2; p 9         | 3/0 ×11; p 5  |

**Field Defense (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)          | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Grunt (3c, 8, 2/1.5)                  | 4/0 ×2; p 6K  | 4/0 ×3; p 7        | 4/2 ×2; p 7         | 3/0 ×4; p 5       | 4/0 ×3; p 7         | 4/0 ×2; p 7        | 4/0 ×3; p 7         | 3/0 ×11; p 5  |
| Saucer (4c, 8, 1.5/1)                 | 3/1 ×2; p 6K  | 2/2 ×4; p 5        | 2/0 ×3; p 5         | 2/7 ×6; p 4       | 2/2 ×4; p 5         | 3/0 ×3; p 6        | 2/2 ×4; p 5         | 2/9 ×16; p 4  |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 6K/0 ×1; p 6K | 5/1 ×2; p 8        | 5/0 ×2; p 8K        | 4/6 ×3; p 7       | 5/1 ×2; p 8         | 6/0 ×2; p 8K       | 5/1 ×2; p 8         | 4/7 ×8; p 6   |
| Ray Gunner (full power) (4c, 8, 3/1)  | 6K/0 ×1; p 6K | 7/0 ×2; p 10K      | 7/1 ×2; p 8K        | 5/0 ×3; p 8       | 7/0 ×2; p 10        | 7/0 ×2; p 8K       | 7/0 ×2; p 10K       | 5/0 ×6; p 8   |
| Ray Gunner (half power) (4c, 8, 3/1)  | 3/0 ×2; p 6K  | 2/0 ×4; p 5        | 2/2 ×3; p 5         | 2/0 ×6; p 4       | 2/0 ×4; p 5         | 3/1 ×3; p 6        | 2/0 ×4; p 5         | 2/0 ×16; p 4  |
| Shield Projector (4c, 12, 1.5/2.5)    | 3/1 ×2; p 6K  | 2/2 ×4; p 5        | 2/0 ×3; p 5         | 2/7 ×6; p 4       | 2/2 ×4; p 5         | 3/0 ×3; p 6        | 2/2 ×4; p 5         | 2/9 ×16; p 4  |
| Brain (5c, 8, 1/1)                    | 1/1 ×4        | 1/2 ×7             | 1/0 ×6              | 1/8 ×12           | 1/2 ×8              | 1/0 ×5             | 1/2 ×7              | 1/10 ×∞       |
| Tripod (full power) (9c, 12, 4/1)     | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 8/0 ×2            | 10/0 ×2             | 8K/0 ×1            | 10K/0 ×1            | 8/0 ×4        |
| Tripod (half power) (9c, 12, 4/1)     | 4/0 ×2        | 4/0 ×3             | 4/2 ×2              | 3/0 ×4            | 4/0 ×3              | 4/0 ×2             | 4/0 ×3              | 3/0 ×11       |
| Mothership (8c, 16, 2.5/2)            | 6K/0 ×1; p 6K | 5/1 ×2; p 8        | 5/0 ×2; p 8K        | 4/6 ×3; p 7       | 5/1 ×2; p 8         | 6/0 ×2; p 8K       | 5/1 ×2; p 8         | 4/7 ×8; p 6   |
| Colossus (full power) (—c, 32, 4/2.5) | 6K/0 ×1; p 6K | 10K/0 ×1; p 10K    | 8K/0 ×1; p 8K       | 8/0 ×2; p 12      | 10/0 ×2; p 12K      | 8K/0 ×1; p 8K      | 10K/0 ×1; p 10K     | 8/0 ×4; p 11  |
| Colossus (half power) (—c, 32, 4/2.5) | 4/0 ×2; p 6K  | 4/0 ×3; p 7        | 4/2 ×2; p 7         | 3/0 ×4; p 5       | 4/0 ×3; p 7         | 4/0 ×2; p 7        | 4/0 ×3; p 7         | 3/0 ×11; p 5  |

**Walled city center (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)          | Goblin 1c 6hp | Wolf Rider 3c 10hp | Bomb Chucker 3c 8hp | Orc Brute 3c 15hp | Orc Warboss 5c 12hp | Rocket Cart 7c 8hp | Scrap Buggy 8c 10hp | Troll —c 40hp |
| ------------------------------------- | ------------- | ------------------ | ------------------- | ----------------- | ------------------- | ------------------ | ------------------- | ------------- |
| Grunt (3c, 8, 2/1.5)                  | 4/0 ×2; p 6K  | 4/0 ×3; p 7        | 4/2 ×2; p 7         | 3/0 ×4; p 5       | 4/0 ×3; p 7         | 4/0 ×2; p 7        | 4/0 ×3; p 7         | 3/0 ×11; p 5  |
| Saucer (4c, 8, 1.5/1)                 | 3/1 ×2; p 6K  | 2/2 ×4; p 5        | 2/0 ×3; p 5         | 2/7 ×6; p 4       | 2/2 ×4; p 5         | 3/0 ×3; p 6        | 2/2 ×4; p 5         | 2/9 ×16; p 4  |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 6K/0 ×1; p 6K | 5/1 ×2; p 8        | 5/0 ×2; p 8K        | 4/6 ×3; p 7       | 5/1 ×2; p 8         | 6/0 ×2; p 8K       | 5/1 ×2; p 8         | 4/7 ×8; p 6   |
| Ray Gunner (full power) (4c, 8, 3/1)  | 6K/0 ×1; p 6K | 7/0 ×2; p 10K      | 7/1 ×2; p 8K        | 5/0 ×3; p 8       | 7/0 ×2; p 10        | 7/0 ×2; p 8K       | 7/0 ×2; p 10K       | 5/0 ×6; p 8   |
| Ray Gunner (half power) (4c, 8, 3/1)  | 3/0 ×2; p 6K  | 2/0 ×4; p 5        | 2/2 ×3; p 5         | 2/0 ×6; p 4       | 2/0 ×4; p 5         | 3/1 ×3; p 6        | 2/0 ×4; p 5         | 2/0 ×16; p 4  |
| Shield Projector (4c, 12, 1.5/2.5)    | 3/1 ×2; p 6K  | 2/2 ×4; p 5        | 2/0 ×3; p 5         | 2/7 ×6; p 4       | 2/2 ×4; p 5         | 3/0 ×3; p 6        | 2/2 ×4; p 5         | 2/9 ×16; p 4  |
| Brain (5c, 8, 1/1)                    | 1/1 ×4        | 1/2 ×7             | 1/0 ×6              | 1/8 ×12           | 1/2 ×8              | 1/0 ×5             | 1/2 ×7              | 1/10 ×∞       |
| Tripod (full power) (9c, 12, 4/1)     | 6K/0 ×1       | 10K/0 ×1           | 8K/0 ×1             | 8/0 ×2            | 10/0 ×2             | 8K/0 ×1            | 10K/0 ×1            | 8/0 ×4        |
| Tripod (half power) (9c, 12, 4/1)     | 4/0 ×2        | 4/0 ×3             | 4/2 ×2              | 3/0 ×4            | 4/0 ×3              | 4/0 ×2             | 4/0 ×3              | 3/0 ×11       |
| Mothership (8c, 16, 2.5/2)            | 6K/0 ×1; p 6K | 5/1 ×2; p 8        | 5/0 ×2; p 8K        | 4/6 ×3; p 7       | 5/1 ×2; p 8         | 6/0 ×2; p 8K       | 5/1 ×2; p 8         | 4/7 ×8; p 6   |
| Colossus (full power) (—c, 32, 4/2.5) | 6K/0 ×1; p 6K | 10K/0 ×1; p 10K    | 8K/0 ×1; p 8K       | 8/0 ×2; p 12      | 10/0 ×2; p 12K      | 8K/0 ×1; p 8K      | 10K/0 ×1; p 10K     | 8/0 ×4; p 11  |
| Colossus (half power) (—c, 32, 4/2.5) | 4/0 ×2; p 6K  | 4/0 ×3; p 7        | 4/2 ×2; p 7         | 3/0 ×4; p 5       | 4/0 ×3; p 7         | 4/0 ×2; p 7        | 4/0 ×3; p 7         | 3/0 ×11; p 5  |

##### Martian attackers on Undead units

**Open ground**

| Attacker (cost, HP, Atk/Def)          | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Grunt (3c, 8, 2/1.5)                  | 4/0 ×3; p 7      | 6/0 ×2; p 10K   | 6/0 ×2; p 8K   | 5/0 ×4; p 8    | 6/0 ×2; p 10K       | 6/2 ×2; p 10K   | 6/0 ×2; p 10K   | 3/0 ×10; p 6        |
| Saucer (4c, 8, 1.5/1)                 | 3/5 ×3; p 6      | 4/2 ×3; p 8     | 4/0 ×2; p 8K   | 3/5 ×5; p 6    | 4/2 ×3; p 8         | 4/0 ×3; p 8     | 4/2 ×3; p 8     | 2/10 ×15; p 4       |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 6/4 ×2; p 10K    | 8/1 ×2; p 10K   | 8K/0 ×1; p 8K  | 6/4 ×3; p 10   | 8/1 ×2; p 10K       | 8/0 ×2; p 10K   | 8/1 ×2; p 10K   | 4/10 ×7; p 7        |
| Ray Gunner (full power) (4c, 8, 3/1)  | 7/0 ×2; p 10K    | 10K/0 ×1; p 10K | 8K/0 ×1; p 8K  | 8/0 ×2; p 12   | 10K/0 ×1; p 10K     | 10K/0 ×1; p 10K | 10K/0 ×1; p 10K | 6/0 ×6; p 9         |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×4; p 5      | 4/0 ×3; p 8     | 4/0 ×2; p 8K   | 3/0 ×5; p 6    | 4/0 ×3; p 8         | 4/2 ×3; p 8     | 4/0 ×3; p 8     | 2/0 ×15; p 4        |
| Shield Projector (4c, 12, 1.5/2.5)    | 3/5 ×3; p 6      | 4/2 ×3; p 8     | 4/0 ×2; p 8K   | 3/5 ×5; p 6    | 4/2 ×3; p 8         | 4/0 ×3; p 8     | 4/2 ×3; p 8     | 2/13 ×15; p 4       |
| Brain (5c, 8, 1/1)                    | 2/6 ×5           | 2/2 ×4          | 2/0 ×3         | 2/6 ×8         | 2/2 ×4              | 2/0 ×4          | 2/2 ×4          | 1/10 ×29            |
| Tripod (full power) (9c, 12, 4/1)     | 10K/0 ×1         | 10K/0 ×1        | 8K/0 ×1        | 12/0 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 9/0 ×4              |
| Tripod (half power) (9c, 12, 4/1)     | 4/0 ×3           | 6/0 ×2          | 6/0 ×2         | 5/0 ×4         | 6/0 ×2              | 6/2 ×2          | 6/0 ×2          | 3/0 ×10             |
| Mothership (8c, 16, 2.5/2)            | 6/4 ×2; p 10K    | 8/1 ×2; p 10K   | 8K/0 ×1; p 8K  | 6/4 ×3; p 10   | 8/1 ×2; p 10K       | 8/0 ×2; p 10K   | 8/1 ×2; p 10K   | 4/11 ×7; p 7        |
| Colossus (full power) (—c, 32, 4/2.5) | 10K/0 ×1; p 10K  | 10K/0 ×1; p 10K | 8K/0 ×1; p 8K  | 12/0 ×2; p 16  | 10K/0 ×1; p 10K     | 10K/0 ×1; p 10K | 10K/0 ×1; p 10K | 9/0 ×4; p 13        |
| Colossus (half power) (—c, 32, 4/2.5) | 4/0 ×3; p 7      | 6/0 ×2; p 10K   | 6/0 ×2; p 8K   | 5/0 ×4; p 8    | 6/0 ×2; p 10K       | 6/2 ×2; p 10K   | 6/0 ×2; p 10K   | 3/0 ×10; p 6        |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)          | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Grunt (3c, 8, 2/1.5)                  | 3/0 ×3; p 5      | 5/0 ×2; p 9     | 5/0 ×2; p 8K   | 4/0 ×4; p 7    | 5/0 ×2; p 9         | 5/2 ×2; p 9     | 5/0 ×2; p 9     | 2/0 ×12; p 5        |
| Saucer (4c, 8, 1.5/1)                 | 2/5 ×4; p 5      | 3/2 ×3; p 7     | 3/0 ×3; p 7    | 2/5 ×6; p 5    | 3/2 ×3; p 7         | 3/0 ×3; p 7     | 3/2 ×3; p 7     | 1/10 ×19; p 3       |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 5/4 ×2; p 8      | 7/1 ×2; p 10K   | 7/0 ×2; p 8K   | 5/4 ×3; p 8    | 7/1 ×2; p 10K       | 7/0 ×2; p 10K   | 7/1 ×2; p 10K   | 3/10 ×9; p 6        |
| Ray Gunner (full power) (4c, 8, 3/1)  | 5/0 ×2; p 8      | 9/0 ×2; p 10K   | 8K/0 ×1; p 8K  | 7/0 ×3; p 10   | 9/0 ×2; p 10K       | 9/1 ×2; p 10K   | 9/0 ×2; p 10K   | 5/0 ×7; p 7         |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×5; p 4      | 3/0 ×3; p 7     | 3/0 ×3; p 7    | 2/0 ×6; p 5    | 3/0 ×3; p 7         | 3/2 ×3; p 7     | 3/0 ×3; p 7     | 1/0 ×19; p 3        |
| Shield Projector (4c, 12, 1.5/2.5)    | 2/5 ×4; p 5      | 3/2 ×3; p 7     | 3/0 ×3; p 7    | 2/5 ×6; p 5    | 3/2 ×3; p 7         | 3/0 ×3; p 7     | 3/2 ×3; p 7     | 1/13 ×19; p 3       |
| Brain (5c, 8, 1/1)                    | 1/6 ×7           | 2/2 ×5          | 2/0 ×4         | 1/6 ×12        | 2/2 ×5              | 2/0 ×5          | 2/2 ×5          | 1/10 ×∞             |
| Tripod (full power) (9c, 12, 4/1)     | 8/0 ×2           | 10K/0 ×1        | 8K/0 ×1        | 10/0 ×2        | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 7/0 ×5              |
| Tripod (half power) (9c, 12, 4/1)     | 3/0 ×3           | 5/0 ×2          | 5/0 ×2         | 4/0 ×4         | 5/0 ×2              | 5/2 ×2          | 5/0 ×2          | 2/0 ×12             |
| Mothership (8c, 16, 2.5/2)            | 5/4 ×2; p 8      | 7/1 ×2; p 10K   | 7/0 ×2; p 8K   | 5/4 ×3; p 8    | 7/1 ×2; p 10K       | 7/0 ×2; p 10K   | 7/1 ×2; p 10K   | 3/11 ×9; p 6        |
| Colossus (full power) (—c, 32, 4/2.5) | 8/0 ×2; p 10K    | 10K/0 ×1; p 10K | 8K/0 ×1; p 8K  | 10/0 ×2; p 14  | 10K/0 ×1; p 10K     | 10K/0 ×1; p 10K | 10K/0 ×1; p 10K | 7/0 ×5; p 10        |
| Colossus (half power) (—c, 32, 4/2.5) | 3/0 ×3; p 5      | 5/0 ×2; p 9     | 5/0 ×2; p 8K   | 4/0 ×4; p 7    | 5/0 ×2; p 9         | 5/2 ×2; p 9     | 5/0 ×2; p 9     | 2/0 ×12; p 5        |

**Field Defense (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)          | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Grunt (3c, 8, 2/1.5)                  | 3/0 ×3; p 5      | 4/0 ×3; p 7     | 4/0 ×2; p 7    | 3/0 ×5; p 6    | 4/0 ×3; p 7         | 4/2 ×3; p 7     | 4/0 ×3; p 7     | 2/0 ×12; p 5        |
| Saucer (4c, 8, 1.5/1)                 | 2/5 ×4; p 4      | 2/2 ×4; p 5     | 2/0 ×3; p 5    | 2/5 ×7; p 4    | 2/2 ×4; p 5         | 2/0 ×4; p 5     | 2/2 ×4; p 5     | 1/10 ×19; p 3       |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 4/4 ×2; p 7      | 5/1 ×2; p 8     | 5/0 ×2; p 8K   | 4/4 ×4; p 7    | 5/1 ×2; p 8         | 5/0 ×2; p 8     | 5/1 ×2; p 8     | 3/10 ×9; p 6        |
| Ray Gunner (full power) (4c, 8, 3/1)  | 5/0 ×2; p 8      | 7/0 ×2; p 10K   | 7/0 ×2; p 8K   | 6/0 ×3; p 9    | 7/0 ×2; p 10K       | 7/1 ×2; p 10K   | 7/0 ×2; p 10K   | 5/0 ×7; p 7         |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×5; p 4      | 2/0 ×4; p 5     | 2/0 ×3; p 5    | 2/0 ×7; p 4    | 2/0 ×4; p 5         | 2/2 ×4; p 5     | 2/0 ×4; p 5     | 1/0 ×19; p 3        |
| Shield Projector (4c, 12, 1.5/2.5)    | 2/5 ×4; p 4      | 2/2 ×4; p 5     | 2/0 ×3; p 5    | 2/5 ×7; p 4    | 2/2 ×4; p 5         | 2/0 ×4; p 5     | 2/2 ×4; p 5     | 1/13 ×19; p 3       |
| Brain (5c, 8, 1/1)                    | 1/6 ×8           | 1/2 ×7          | 1/0 ×6         | 1/6 ×13        | 1/2 ×7              | 1/0 ×7          | 1/2 ×7          | 1/10 ×∞             |
| Tripod (full power) (9c, 12, 4/1)     | 8/0 ×2           | 10K/0 ×1        | 8K/0 ×1        | 9/0 ×2         | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 7/0 ×5              |
| Tripod (half power) (9c, 12, 4/1)     | 3/0 ×3           | 4/0 ×3          | 4/0 ×2         | 3/0 ×5         | 4/0 ×3              | 4/2 ×3          | 4/0 ×3          | 2/0 ×12             |
| Mothership (8c, 16, 2.5/2)            | 4/4 ×2; p 7      | 5/1 ×2; p 8     | 5/0 ×2; p 8K   | 4/4 ×4; p 7    | 5/1 ×2; p 8         | 5/0 ×2; p 8     | 5/1 ×2; p 8     | 3/11 ×9; p 6        |
| Colossus (full power) (—c, 32, 4/2.5) | 8/0 ×2; p 10K    | 10K/0 ×1; p 10K | 8K/0 ×1; p 8K  | 9/0 ×2; p 13   | 10K/0 ×1; p 10K     | 10K/0 ×1; p 10K | 10K/0 ×1; p 10K | 7/0 ×5; p 10        |
| Colossus (half power) (—c, 32, 4/2.5) | 3/0 ×3; p 5      | 4/0 ×3; p 7     | 4/0 ×2; p 7    | 3/0 ×5; p 6    | 4/0 ×3; p 7         | 4/2 ×3; p 7     | 4/0 ×3; p 7     | 2/0 ×12; p 5        |

**Walled city center (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)          | Skeleton 2c 10hp | Ghoul 3c 10hp   | Banshee 3c 8hp | Zombie 3c 18hp | Necromancer 5c 10hp | Lich 8c 10hp    | Vampire 9c 10hp | Abomination —c 40hp |
| ------------------------------------- | ---------------- | --------------- | -------------- | -------------- | ------------------- | --------------- | --------------- | ------------------- |
| Grunt (3c, 8, 2/1.5)                  | 3/0 ×3; p 5      | 4/0 ×3; p 7     | 4/0 ×2; p 7    | 3/0 ×5; p 6    | 4/0 ×3; p 7         | 4/2 ×3; p 7     | 4/0 ×3; p 7     | 2/0 ×12; p 5        |
| Saucer (4c, 8, 1.5/1)                 | 2/5 ×4; p 4      | 2/2 ×4; p 5     | 2/0 ×3; p 5    | 2/5 ×7; p 4    | 2/2 ×4; p 5         | 2/0 ×4; p 5     | 2/2 ×4; p 5     | 1/10 ×19; p 3       |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 4/4 ×2; p 7      | 5/1 ×2; p 8     | 5/0 ×2; p 8K   | 4/4 ×4; p 7    | 5/1 ×2; p 8         | 5/0 ×2; p 8     | 5/1 ×2; p 8     | 3/10 ×9; p 6        |
| Ray Gunner (full power) (4c, 8, 3/1)  | 5/0 ×2; p 8      | 7/0 ×2; p 10K   | 7/0 ×2; p 8K   | 6/0 ×3; p 9    | 7/0 ×2; p 10K       | 7/1 ×2; p 10K   | 7/0 ×2; p 10K   | 5/0 ×7; p 7         |
| Ray Gunner (half power) (4c, 8, 3/1)  | 2/0 ×5; p 4      | 2/0 ×4; p 5     | 2/0 ×3; p 5    | 2/0 ×7; p 4    | 2/0 ×4; p 5         | 2/2 ×4; p 5     | 2/0 ×4; p 5     | 1/0 ×19; p 3        |
| Shield Projector (4c, 12, 1.5/2.5)    | 2/5 ×4; p 4      | 2/2 ×4; p 5     | 2/0 ×3; p 5    | 2/5 ×7; p 4    | 2/2 ×4; p 5         | 2/0 ×4; p 5     | 2/2 ×4; p 5     | 1/13 ×19; p 3       |
| Brain (5c, 8, 1/1)                    | 1/6 ×8           | 1/2 ×7          | 1/0 ×6         | 1/6 ×13        | 1/2 ×7              | 1/0 ×7          | 1/2 ×7          | 1/10 ×∞             |
| Tripod (full power) (9c, 12, 4/1)     | 8/0 ×2           | 10K/0 ×1        | 8K/0 ×1        | 9/0 ×2         | 10K/0 ×1            | 10K/0 ×1        | 10K/0 ×1        | 7/0 ×5              |
| Tripod (half power) (9c, 12, 4/1)     | 3/0 ×3           | 4/0 ×3          | 4/0 ×2         | 3/0 ×5         | 4/0 ×3              | 4/2 ×3          | 4/0 ×3          | 2/0 ×12             |
| Mothership (8c, 16, 2.5/2)            | 4/4 ×2; p 7      | 5/1 ×2; p 8     | 5/0 ×2; p 8K   | 4/4 ×4; p 7    | 5/1 ×2; p 8         | 5/0 ×2; p 8     | 5/1 ×2; p 8     | 3/11 ×9; p 6        |
| Colossus (full power) (—c, 32, 4/2.5) | 8/0 ×2; p 10K    | 10K/0 ×1; p 10K | 8K/0 ×1; p 8K  | 9/0 ×2; p 13   | 10K/0 ×1; p 10K     | 10K/0 ×1; p 10K | 10K/0 ×1; p 10K | 7/0 ×5; p 10        |
| Colossus (half power) (—c, 32, 4/2.5) | 3/0 ×3; p 5      | 4/0 ×3; p 7     | 4/0 ×2; p 7    | 3/0 ×5; p 6    | 4/0 ×3; p 7         | 4/2 ×3; p 7     | 4/0 ×3; p 7     | 2/0 ×12; p 5        |

##### Martian attackers on Martian units (Shield up)

**Open ground**

| Attacker (cost, HP, Atk/Def)          | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ------------------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Grunt (3c, 8, 2/1.5)                  | 5/1 ×2 · 3 · 2    | 6/0 ×2 · 2 · 2    | 6/0 ×2 · 2 · 2    | 4/0 ×4 · 4 · 3           | 6/0 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/4 ×7 · 8 · 7    |
| Saucer (4c, 8, 1.5/1)                 | 3/1 ×3 · 4 · 3    | 4/0 ×3 · 3 · 2    | 4/0 ×3 · 3 · 2    | 3/5 ×5 · 5 · 4           | 4/0 ×3 · 3 · 2    | 4/0 ×4 · 4 · 3    | 3/3 ×6 · 6 · 5     | 3/5 ×10 · 11 · 9  |
| Saucer (Strafe) (4c, 8, 1.5/1)        | 7/1 ×2 · 2 · 2    | 8/0 ×2 · 2 · 1K   | 8/0 ×2 · 2 · 1K   | 6/4 ×3 · 3 · 2           | 8/0 ×2 · 2 · 1K   | 8/0 ×2 · 2 · 2    | 6/2 ×3 · 3 · 3     | 6/4 ×5 · 6 · 5    |
| Ray Gunner (full power) (4c, 8, 3/1)  | 9/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/3 ×5 · 5 · 4    |
| Ray Gunner (half power) (4c, 8, 3/1)  | 3/1 ×3 · 4 · 3    | 4/0 ×3 · 3 · 2    | 4/0 ×3 · 3 · 2    | 3/0 ×5 · 5 · 4           | 4/0 ×3 · 3 · 2    | 4/0 ×4 · 4 · 3    | 3/0 ×6 · 6 · 5     | 3/5 ×10 · 11 · 9  |
| Shield Projector (4c, 12, 1.5/2.5)    | 3/0 ×3 · 4 · 3    | 4/0 ×3 · 3 · 2    | 4/0 ×3 · 3 · 2    | 3/4 ×5 · 5 · 4           | 4/0 ×3 · 3 · 2    | 4/0 ×4 · 4 · 3    | 3/2 ×6 · 6 · 5     | 3/4 ×10 · 11 · 9  |
| Brain (5c, 8, 1/1)                    | 2/2 ×5 · 6 · 4    | 2/0 ×4 · 5 · 3    | 2/0 ×4 · 5 · 3    | 1/6 ×10 · 11 · 7         | 2/0 ×4 · 5 · 3    | 2/0 ×6 · 7 · 5    | 2/4 ×9 · 9 · 7     | 1/6 ×21 · 22 · 18 |
| Tripod (full power) (9c, 12, 4/1)     | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 11/0 ×2 · 2 · 2          | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/0 ×2 · 2 · 2    | 11/2 ×3 · 3 · 3   |
| Tripod (half power) (9c, 12, 4/1)     | 5/1 ×2 · 3 · 2    | 6/0 ×2 · 2 · 2    | 6/0 ×2 · 2 · 2    | 4/0 ×4 · 4 · 3           | 6/0 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/4 ×7 · 8 · 7    |
| Mothership (8c, 16, 2.5/2)            | 7/0 ×2 · 2 · 2    | 8/0 ×2 · 2 · 1K   | 8/0 ×2 · 2 · 1K   | 6/2 ×3 · 3 · 2           | 8/0 ×2 · 2 · 1K   | 8/0 ×2 · 2 · 2    | 6/0 ×3 · 3 · 3     | 6/2 ×5 · 6 · 5    |
| Colossus (full power) (—c, 32, 4/2.5) | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 11/0 ×2 · 2 · 2          | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/0 ×2 · 2 · 2    | 11/1 ×3 · 3 · 3   |
| Colossus (half power) (—c, 32, 4/2.5) | 5/0 ×2 · 3 · 2    | 6/0 ×2 · 2 · 2    | 6/0 ×2 · 2 · 2    | 4/0 ×4 · 4 · 3           | 6/0 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/3 ×7 · 8 · 7    |

#### The reverse

Each cell: the whole hit on the full-HP Martian unit / the damage the attacker takes back, then the number of attacks by fresh full-HP attackers of that kind that kill it **in one turn** (the Shield absorbs once and recharges at its owner's next turn): with its Shield up · in a Force Field (Shield 4) · with its Shield down. `K` after a count of 1 is a kill in one attack. Ranged units attack from their full range; a unit marked (Charge) has moved two tiles with Raiding. No Goblin attacker has Gang Up here (the attacker alone), and no Lich plagues.

Machines (Saucer, Tripod, Mothership, Colossus) never have cover or fortification: their Forest and walled-center cells equal the open ones.

##### Human attackers on Martian units

**Open ground**

| Attacker (cost, HP, Atk/Def)  | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ----------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Fighter (2c, 12, 2/2)         | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Guard (3c, 17, 1.5/3)         | 3/3 ×3 · 4 · 3    | 4/2 ×3 · 3 · 2    | 4/2 ×3 · 3 · 2    | 3/7 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 4/0 ×4 · 4 · 3    | 3/5 ×6 · 6 · 5     | 3/7 ×10 · 11 · 9  |
| Raider (4c, 12, 2/1)          | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Raider (Charge) (4c, 12, 2/1) | 9/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/5 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4    |
| Marksman (4c, 12, 2/1)        | 5/3 ×2 · 3 · 2    | 6/0 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/0 ×4 · 4 · 3           | 6/0 ×2 · 2 · 2    | 6/2 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Captain (5c, 10, 1/1)         | 2/4 ×5 · 6 · 4    | 2/2 ×4 · 5 · 3    | 2/2 ×4 · 5 · 3    | 1/8 ×10 · 11 · 7         | 2/2 ×4 · 5 · 3    | 2/0 ×6 · 7 · 5    | 2/6 ×9 · 9 · 7     | 1/8 ×21 · 22 · 18 |
| Swordsman (5c, 15, 3.5/2.5)   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 9/5 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 12/0 ×2 · 2 · 1K  | 10/3 ×2 · 2 · 2    | 9/5 ×4 · 4 · 4    |
| Catapult (8c, 10, 3/0.5)      | 9/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Knight (9c, 13, 4/1)          | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 11/4 ×2 · 2 · 2          | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |
| Juggernaut (—c, 40, 4/4)      | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 11/4 ×2 · 2 · 2          | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)  | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ----------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Fighter (2c, 12, 2/2)         | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Guard (3c, 17, 1.5/3)         | 3/3 ×3 · 4 · 3    | 4/2 ×3 · 3 · 2    | 3/2 ×3 · 4 · 3    | 2/7 ×6 · 7 · 5           | 3/2 ×3 · 4 · 3    | 4/0 ×4 · 4 · 3    | 3/5 ×6 · 6 · 5     | 3/7 ×10 · 11 · 9  |
| Raider (4c, 12, 2/1)          | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Raider (Charge) (4c, 12, 2/1) | 8/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/1 ×2 · 2 · 1K   | 6/5 ×3 · 3 · 2           | 9/1 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4    |
| Marksman (4c, 12, 2/1)        | 4/3 ×3 · 3 · 2    | 6/0 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/0 ×4 · 5 · 3           | 5/0 ×2 · 3 · 2    | 6/2 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Captain (5c, 10, 1/1)         | 1/4 ×7 · 9 · 5    | 2/2 ×4 · 5 · 3    | 2/2 ×5 · 6 · 4    | 1/8 ×12 · 13 · 9         | 2/2 ×5 · 6 · 4    | 2/0 ×6 · 7 · 5    | 2/6 ×9 · 9 · 7     | 1/8 ×21 · 22 · 18 |
| Swordsman (5c, 15, 3.5/2.5)   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 8/5 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 12/0 ×2 · 2 · 1K  | 10/3 ×2 · 2 · 2    | 9/5 ×4 · 4 · 4    |
| Catapult (8c, 10, 3/0.5)      | 8/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/0 ×2 · 2 · 1K   | 6/0 ×3 · 3 · 2           | 9/0 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Knight (9c, 13, 4/1)          | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 9/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |
| Juggernaut (—c, 40, 4/4)      | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 9/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |

**Walled city center (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)  | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ----------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Fighter (2c, 12, 2/2)         | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Guard (3c, 17, 1.5/3)         | 2/3 ×5 · 6 · 4    | 4/2 ×3 · 3 · 2    | 2/2 ×4 · 5 · 3    | 2/7 ×7 · 7 · 5           | 2/2 ×4 · 5 · 3    | 4/0 ×4 · 4 · 3    | 3/5 ×6 · 6 · 5     | 3/7 ×10 · 11 · 9  |
| Raider (4c, 12, 2/1)          | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Raider (Charge) (4c, 12, 2/1) | 6/2 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/1 ×2 · 2 · 2    | 5/5 ×3 · 3 · 2           | 7/1 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4    |
| Marksman (4c, 12, 2/1)        | 3/3 ×3 · 4 · 3    | 6/0 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/0 ×5 · 5 · 4           | 4/0 ×3 · 3 · 2    | 6/2 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Captain (5c, 10, 1/1)         | 1/4 ×8 · 10 · 6   | 2/2 ×4 · 5 · 3    | 1/2 ×8 · 10 · 6   | 1/8 ×13 · 14 · 10        | 1/2 ×8 · 10 · 6   | 2/0 ×6 · 7 · 5    | 2/6 ×9 · 9 · 7     | 1/8 ×21 · 22 · 18 |
| Swordsman (5c, 15, 3.5/2.5)   | 8/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 8/1 ×2 · 2 · 1K   | 7/5 ×2 · 3 · 2           | 8/1 ×2 · 2 · 1K   | 12/0 ×2 · 2 · 1K  | 10/3 ×2 · 2 · 2    | 9/5 ×4 · 4 · 4    |
| Catapult (8c, 10, 3/0.5)      | 6/0 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 2 · 2    | 5/0 ×3 · 3 · 2           | 7/0 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Knight (9c, 13, 4/1)          | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 8/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |
| Juggernaut (—c, 40, 4/4)      | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 8/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |

##### Goblin attackers on Martian units (no Gang Up: the attacker alone)

**Open ground**

| Attacker (cost, HP, Atk/Def)      | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp |
| --------------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ---------------- |
| Goblin (1c, 6, 1.5/0.5)           | 3/3 ×3 · 4 · 3    | 4/2 ×3 · 3 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 4/0 ×4 · 4 · 3    | 3/5 ×6 · 6 · 5     | 3/6 ×10 · 11 · 9 |
| Wolf Rider (3c, 10, 2/1)          | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Wolf Rider (Charge) (3c, 10, 2/1) | 9/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/5 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4   |
| Bomb Chucker (3c, 8, 2/1)         | 5/3 ×2 · 3 · 2    | 6/0 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/0 ×4 · 4 · 3           | 6/0 ×2 · 2 · 2    | 6/2 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Orc Brute (3c, 15, 2/2.5)         | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Orc Warboss (5c, 12, 2/1)         | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Rocket Cart (7c, 8, 3.5/0.5)      | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 9/0 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 12/0 ×2 · 2 · 1K  | 10/0 ×2 · 2 · 2    | 9/0 ×4 · 4 · 4   |
| Scrap Buggy (8c, 10, 3/1)         | 9/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/5 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4   |
| Troll (—c, 40, 4/3)               | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 11/4 ×2 · 2 · 2          | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3  |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def)      | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp |
| --------------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ---------------- |
| Goblin (1c, 6, 1.5/0.5)           | 3/3 ×3 · 4 · 3    | 4/2 ×3 · 3 · 2    | 3/2 ×3 · 4 · 3    | 2/6 ×6 · 7 · 5           | 3/2 ×3 · 4 · 3    | 4/0 ×4 · 4 · 3    | 3/5 ×6 · 6 · 5     | 3/6 ×10 · 11 · 9 |
| Wolf Rider (3c, 10, 2/1)          | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Wolf Rider (Charge) (3c, 10, 2/1) | 8/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/1 ×2 · 2 · 1K   | 6/5 ×3 · 3 · 2           | 9/1 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4   |
| Bomb Chucker (3c, 8, 2/1)         | 4/3 ×3 · 3 · 2    | 6/0 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/0 ×4 · 5 · 3           | 5/0 ×2 · 3 · 2    | 6/2 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Orc Brute (3c, 15, 2/2.5)         | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Orc Warboss (5c, 12, 2/1)         | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Rocket Cart (7c, 8, 3.5/0.5)      | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 8/0 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 12/0 ×2 · 2 · 1K  | 10/0 ×2 · 2 · 2    | 9/0 ×4 · 4 · 4   |
| Scrap Buggy (8c, 10, 3/1)         | 8/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/1 ×2 · 2 · 1K   | 6/5 ×3 · 3 · 2           | 9/1 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4   |
| Troll (—c, 40, 4/3)               | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 9/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3  |

**Walled city center (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def)      | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp |
| --------------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ---------------- |
| Goblin (1c, 6, 1.5/0.5)           | 2/3 ×5 · 6 · 4    | 4/2 ×3 · 3 · 2    | 2/2 ×4 · 5 · 3    | 2/6 ×7 · 7 · 5           | 2/2 ×4 · 5 · 3    | 4/0 ×4 · 4 · 3    | 3/5 ×6 · 6 · 5     | 3/6 ×10 · 11 · 9 |
| Wolf Rider (3c, 10, 2/1)          | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Wolf Rider (Charge) (3c, 10, 2/1) | 6/2 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/1 ×2 · 2 · 2    | 5/5 ×3 · 3 · 2           | 7/1 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4   |
| Bomb Chucker (3c, 8, 2/1)         | 3/3 ×3 · 4 · 3    | 6/0 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/0 ×5 · 5 · 4           | 4/0 ×3 · 3 · 2    | 6/2 ×3 · 3 · 2    | 5/0 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Orc Brute (3c, 15, 2/2.5)         | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Orc Warboss (5c, 12, 2/1)         | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7   |
| Rocket Cart (7c, 8, 3.5/0.5)      | 8/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 8/0 ×2 · 2 · 1K   | 7/0 ×2 · 3 · 2           | 8/0 ×2 · 2 · 1K   | 12/0 ×2 · 2 · 1K  | 10/0 ×2 · 2 · 2    | 9/0 ×4 · 4 · 4   |
| Scrap Buggy (8c, 10, 3/1)         | 6/2 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/1 ×2 · 2 · 2    | 5/5 ×3 · 3 · 2           | 7/1 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4   |
| Troll (—c, 40, 4/3)               | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 8/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3  |

##### Undead attackers on Martian units

**Open ground**

| Attacker (cost, HP, Atk/Def) | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ---------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Skeleton (2c, 10, 2/2)       | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Ghoul (3c, 10, 2/1)          | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Ghoul (Charge) (3c, 10, 2/1) | 9/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/5 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4    |
| Zombie (3c, 18, 2/2)         | 5/3 ×2 · 3 · 2    | 6/2 ×2 · 2 · 2    | 6/2 ×2 · 2 · 2    | 4/6 ×4 · 4 · 3           | 6/2 ×2 · 2 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Necromancer (5c, 10, 1/1)    | 2/4 ×5 · 6 · 4    | 2/2 ×4 · 5 · 3    | 2/2 ×4 · 5 · 3    | 1/8 ×10 · 11 · 7         | 2/2 ×4 · 5 · 3    | 2/0 ×6 · 7 · 5    | 2/6 ×9 · 9 · 7     | 1/8 ×21 · 22 · 18 |
| Lich (8c, 10, 3/1)           | 9/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Vampire (9c, 10, 3/1)        | 9/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 3 · 2           | 10/0 ×1K · 2 · 1K | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Abomination (—c, 40, 4/4)    | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 11/4 ×2 · 2 · 2          | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |

**Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)**

| Attacker (cost, HP, Atk/Def) | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ---------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Skeleton (2c, 10, 2/2)       | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Ghoul (3c, 10, 2/1)          | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Ghoul (Charge) (3c, 10, 2/1) | 8/2 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/1 ×2 · 2 · 1K   | 6/5 ×3 · 3 · 2           | 9/1 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4    |
| Zombie (3c, 18, 2/2)         | 4/3 ×3 · 3 · 2    | 6/2 ×2 · 2 · 2    | 5/2 ×2 · 3 · 2    | 3/6 ×4 · 5 · 3           | 5/2 ×2 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Necromancer (5c, 10, 1/1)    | 1/4 ×7 · 9 · 5    | 2/2 ×4 · 5 · 3    | 2/2 ×5 · 6 · 4    | 1/8 ×12 · 13 · 9         | 2/2 ×5 · 6 · 4    | 2/0 ×6 · 7 · 5    | 2/6 ×9 · 9 · 7     | 1/8 ×21 · 22 · 18 |
| Lich (8c, 10, 3/1)           | 8/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/0 ×2 · 2 · 1K   | 6/0 ×3 · 3 · 2           | 9/0 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Vampire (9c, 10, 3/1)        | 8/0 ×2 · 2 · 1K   | 10/0 ×1K · 2 · 1K | 9/0 ×2 · 2 · 1K   | 6/0 ×3 · 3 · 2           | 9/0 ×2 · 2 · 1K   | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Abomination (—c, 40, 4/4)    | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 9/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |

**Walled city center (+2 Defense), the attacker without the Disintegrator**

| Attacker (cost, HP, Atk/Def) | Grunt 3c 8hp      | Saucer 4c 8hp     | Ray Gunner 4c 8hp | Shield Projector 4c 12hp | Brain 5c 8hp      | Tripod 9c 12hp    | Mothership 8c 16hp | Colossus —c 32hp  |
| ---------------------------- | ----------------- | ----------------- | ----------------- | ------------------------ | ----------------- | ----------------- | ------------------ | ----------------- |
| Skeleton (2c, 10, 2/2)       | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Ghoul (3c, 10, 2/1)          | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Ghoul (Charge) (3c, 10, 2/1) | 6/2 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/1 ×2 · 2 · 2    | 5/5 ×3 · 3 · 2           | 7/1 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/4 ×3 · 3 · 2     | 7/5 ×5 · 5 · 4    |
| Zombie (3c, 18, 2/2)         | 3/3 ×3 · 4 · 3    | 6/2 ×2 · 2 · 2    | 4/2 ×3 · 3 · 2    | 3/6 ×5 · 5 · 4           | 4/2 ×3 · 3 · 2    | 6/0 ×3 · 3 · 2    | 5/5 ×4 · 4 · 3     | 4/6 ×7 · 8 · 7    |
| Necromancer (5c, 10, 1/1)    | 1/4 ×8 · 10 · 6   | 2/2 ×4 · 5 · 3    | 1/2 ×8 · 10 · 6   | 1/8 ×13 · 14 · 10        | 1/2 ×8 · 10 · 6   | 2/0 ×6 · 7 · 5    | 2/6 ×9 · 9 · 7     | 1/8 ×21 · 22 · 18 |
| Lich (8c, 10, 3/1)           | 6/0 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 2 · 2    | 5/0 ×3 · 3 · 2           | 7/0 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Vampire (9c, 10, 3/1)        | 6/0 ×2 · 2 · 2    | 10/0 ×1K · 2 · 1K | 7/0 ×2 · 2 · 2    | 5/0 ×3 · 3 · 2           | 7/0 ×2 · 2 · 2    | 10/0 ×2 · 2 · 2   | 8/0 ×3 · 3 · 2     | 7/0 ×5 · 5 · 4    |
| Abomination (—c, 40, 4/4)    | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 10/0 ×1K · 2 · 1K | 8/4 ×2 · 2 · 2           | 10/0 ×1K · 2 · 1K | 14/0 ×1K · 2 · 1K | 12/3 ×2 · 2 · 2    | 11/4 ×3 · 3 · 3   |

#### Rays against fortification

A full-HP target on a Field Defense or a walled city center; the damage of one attack from two tiles without / with the Disintegrator (the Martian Explosives: heat rays ignore Walls and Field Defense; the Grunt's pistol is no heat ray, and Breach is for attacks from the next tile).

| Attacker                | Ground        | Fighter 12hp | Guard 17hp | Swordsman 15hp | Marksman 12hp | Zombie 18hp | Orc Brute 15hp |
| ----------------------- | ------------- | ------------ | ---------- | -------------- | ------------- | ----------- | -------------- |
| Grunt                   | Field Defense | 3 / 3        | 4 / 4      | 3 / 3          | 4 / 4         | 3 / 3       | 3 / 3          |
| Grunt                   | walled center | 3 / 3        | 4 / 4      | 3 / 3          | 4 / 4         | 3 / 3       | 3 / 3          |
| Ray Gunner (full power) | Field Defense | 6 / 8        | 7 / 10     | 5 / 7          | 7 / 10        | 6 / 8       | 5 / 7          |
| Ray Gunner (full power) | walled center | 6 / 8        | 7 / 10     | 5 / 7          | 7 / 10        | 6 / 8       | 5 / 7          |
| Ray Gunner (half power) | Field Defense | 2 / 3        | 2 / 4      | 2 / 3          | 2 / 4         | 2 / 3       | 2 / 3          |
| Ray Gunner (half power) | walled center | 2 / 3        | 2 / 4      | 2 / 3          | 2 / 4         | 2 / 3       | 2 / 3          |
| Tripod (full power)     | Field Defense | 9 / 12K      | 10 / 14    | 8 / 11         | 10 / 12K      | 9 / 12      | 8 / 11         |
| Tripod (full power)     | walled center | 9 / 12K      | 10 / 14    | 8 / 11         | 10 / 12K      | 9 / 12      | 8 / 11         |
| Tripod (half power)     | Field Defense | 3 / 5        | 4 / 6      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Tripod (half power)     | walled center | 3 / 5        | 4 / 6      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Colossus (full power)   | Field Defense | 9 / 12K      | 10 / 14    | 8 / 11         | 10 / 12K      | 9 / 12      | 8 / 11         |
| Colossus (full power)   | walled center | 9 / 12K      | 10 / 14    | 8 / 11         | 10 / 12K      | 9 / 12      | 8 / 11         |
| Colossus (half power)   | Field Defense | 3 / 5        | 4 / 6      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |
| Colossus (half power)   | walled center | 3 / 5        | 4 / 6      | 3 / 4          | 4 / 6         | 3 / 5       | 3 / 4          |

#### Scenarios

##### A Shield Projector and a firing line

- **A Catapult and three Marksmen fire at a line of Grunt, Ray Gunner, Grunt (Shield 2 each)**
  - Catapult (10) attacks Ray Gunner (8+2): deals 8 (Shield 2) (kills), takes 0
  - Marksman: its target is gone
  - Marksman (12) attacks Grunt (8+2): deals 3 (Shield 2), takes 3
  - Marksman (12) attacks Grunt (5): deals 5 (kills), takes 0
  - Left: Martians Grunt 8+2; Humans Marksman 9, Marksman 12, Marksman 12, Catapult 10.
- **The same line with a Shield Projector behind it (every Shield recharged to 4)**
  - Catapult (10) attacks Ray Gunner (8+4): deals 6 (Shield 4), takes 0
  - Marksman (12) attacks Ray Gunner (2): deals 2 (kills), takes 0
  - Marksman (12) attacks Grunt (8+4): deals 1 (Shield 4), takes 3
  - Marksman (12) attacks Grunt (7): deals 5, takes 3
  - Left: Martians Grunt 2, Grunt 8+4, Shield Projector 12+3; Humans Marksman 9, Marksman 12, Marksman 9, Catapult 10.
- **The same line with its Shields down (it attacked hand to hand and has no Force Fields)**
  - Catapult (10) attacks Ray Gunner (8): deals 8 (kills), takes 0
  - Marksman: its target is gone
  - Marksman (12) attacks Grunt (8): deals 5, takes 3
  - Marksman (12) attacks Grunt (3): deals 3 (kills), takes 0
  - Left: Martians Grunt 8; Humans Marksman 9, Marksman 12, Marksman 12, Catapult 10.

##### A Knight rides into a line of five

- **Five Grunts in a row, Shield 2: the Knight starts at one end and rides on while a unit stands beside it**
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances
  - Humans end the turn: done
  - _The Martians answer_
  - (g3 is gone)
  - (g4 is gone)
  - (mid is gone)
  - Left: Martians nothing; Humans Knight 13.
- **Five Grunts with their Shields down**
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (8): deals 8 (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8): deals 8 (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8): deals 8 (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8): deals 8 (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8): deals 8 (kills), takes 0, advances
  - Humans end the turn: done
  - _The Martians answer_
  - (g3 is gone)
  - (g4 is gone)
  - (mid is gone)
  - Left: Martians nothing; Humans Knight 13.
- **Four Grunts in a Force Field (Shield 4, full HP) with the Shield Projector in the middle of the line: the field holds the first attack**
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (8+4): deals 7 (Shield 4), takes 2
  - Knight (11) attacks Grunt (8+4): refused (UNIT_ALREADY_ACTED)
  - Knight (11) attacks Shield Projector (12+3): refused (UNIT_ALREADY_ACTED)
  - Knight (11) attacks Grunt (8+4): refused (UNIT_ALREADY_ACTED)
  - Knight (11) attacks Grunt (8+4): refused (UNIT_ALREADY_ACTED)
  - Humans end the turn: 2 Shields recharge
  - _The Martians answer_
  - Grunt (8+4) attacks Knight (11): refused (TARGET_OUT_OF_RANGE)
  - Grunt (8+2) attacks Knight (11): refused (TARGET_OUT_OF_RANGE)
  - Shield Projector (12+3) attacks Knight (11): refused (TARGET_OUT_OF_RANGE)
  - Left: Martians Grunt 1+2, Grunt 8+4, Grunt 8+4, Grunt 8+2, Shield Projector 12+3; Humans Knight 11.
- **The same fielded line; a Catapult shoots the first Grunt, then the Knight rides: one kill, and the field of the next Grunt holds**
  - Catapult (10) attacks Grunt (8+4): deals 5 (Shield 4), takes 0
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (3): deals 3 (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+4): deals 7 (Shield 4), takes 2
  - Knight (11) attacks Shield Projector (12+3): refused (UNIT_ALREADY_ACTED)
  - Left: Martians Grunt 1, Grunt 8+4, Grunt 8+4, Shield Projector 12+3; Humans Catapult 10, Knight 11.
- **The same fielded line; two Catapults and a Marksman kill the Projector first. The Shields stay at 4 until they recharge, so the Knight waits a turn; then it kills every Grunt it reaches (the Projector's tile is a gap in the row)**
  - Catapult (10) attacks Shield Projector (12+3): deals 4 (Shield 3), takes 0
  - Catapult (10) attacks Shield Projector (8): deals 8 (kills), takes 0
  - Marksman: its target is gone
  - Humans end the turn: 4 Shields recharge
  - _The Martians stand; their Shields recharge to 2 without the Projector_
  - Martians end the turn: done
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+2): deals 8 (Shield 2) (kills), takes 0, advances
  - Knight (13) attacks Grunt (8+2): refused (UNIT_ALREADY_ACTED)
  - Knight (13) attacks Grunt (8+2): refused (UNIT_ALREADY_ACTED)
  - Left: Martians Grunt 8+2, Grunt 8+2; Humans Catapult 10, Catapult 10, Marksman 12, Knight 13.
- **Two Knights at one fielded Grunt: the first leaves it at 1 HP, the second kills it and rides on into the next field, which holds**
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (8+4): deals 7 (Shield 4), takes 2
  - Knight moves 2 tiles: done
  - Knight (13) attacks Grunt (1): deals 1 (kills), takes 0, advances, attacks again
  - Knight (13) attacks Grunt (8+4): deals 7 (Shield 4), takes 2
  - Left: Martians Grunt 1, Shield Projector 12+3; Humans Knight 11, Knight 11.
- **The Martians move first: a Saucer pulls the Knight one tile into the range of two Ray Gunners that have not moved, and a Grunt**
  - Ray Gunner (8+2) attacks Knight (13): refused (TARGET_OUT_OF_RANGE)
  - Saucer moves 3 tiles: done
  - Saucer pulls Knight (13): pulled 1 tile
  - Ray Gunner (8+2) attacks Knight (13): full power, deals 10, takes 0
  - Ray Gunner (8+2) attacks Knight (3): full power, deals 3 (kills), takes 0
  - Left: Martians Ray Gunner 8+2, Ray Gunner 8+2, Grunt 8+2, Saucer 8+2; Humans nothing.

##### Psychic Command every second turn

- **A Brain commands two Grunts; they shoot a Swordsman. Next turn the Brain is Cooling and cannot command; the turn after it can**
  - Brain calls Psychic Command: 2 units inspired
  - Grunt (8+2) attacks Swordsman (15): deals 7, takes 0, inspired
  - Grunt (8+2) attacks Swordsman (8): deals 8 (kills), takes 0, inspired
  - Martians end the turn: done
  - Humans end the turn: done
  - Brain calls Psychic Command: refused (UNIT_ALREADY_ACTED)
  - Grunt (8+2) attacks Guard (17): deals 6, takes 0
  - Martians end the turn: done
  - Humans end the turn: done
  - Brain calls Psychic Command: 2 units inspired
  - Grunt (8+2) attacks Guard (13): deals 11, takes 0, inspired
  - Left: Martians Brain 8+2, Grunt 8+2, Grunt 8+2; Humans Guard 2.

##### The Tractor Beam

- **A Guard in a Forest three tiles from two Ray Gunners (the Humans own Forestry): a Saucer flies up and pulls it one tile into the open and into range**
  - Ray Gunner (8+2) attacks Guard (17): refused (TARGET_OUT_OF_RANGE)
  - Saucer moves 3 tiles: done
  - Saucer pulls Guard (17): pulled 1 tile
  - Ray Gunner (8+2) attacks Guard (17): full power, deals 10, takes 0
  - Ray Gunner (8+2) attacks Guard (7): full power, deals 7 (kills), takes 0
  - Left: Martians Ray Gunner 8+2, Ray Gunner 8+2, Saucer 8+2; Humans nothing.
- **The pulled unit's owner sees from the tile it lands on: the same pull of a Marksman whose owner has not explored the three rows behind the Saucer**
  - Saucer pulls Marksman (12): pulled 1 tile; Humans see 10 new tiles
  - Left: Martians Saucer 8+2; Humans Marksman 12.
- **A Swordsman holds a walled city center. A Tripod fires at it; then (another game) a Mothership three tiles away pulls it two tiles off the center, the same Tripod and two Grunts fire, and a Grunt walks onto the empty center**
  - Mothership pulls Swordsman (15): pulled 2 tiles
  - Tripod (12+2) attacks Swordsman (15): full power, deals 11, takes 0
  - Grunt (8+2) attacks Swordsman (4): deals 4 (kills), takes 0
  - Grunt: its target is gone
  - Grunt moves 1 tile: done
  - Left: Martians Mothership 16+4, Tripod 12+2, Grunt 8+2, Grunt 8+2, Grunt 8+2; Humans nothing.
- **The same Tripod's shot at the Swordsman on its walled center, without the pull**
  - Tripod (12+2) attacks Swordsman (15): full power, deals 8, takes 0
  - Left: Martians Tripod 12+2; Humans Swordsman 7.
- **The same shot with the Disintegrator, and a Marksman standing behind the Swordsman (Pierce)**
  - Tripod (12+2) attacks Swordsman (15): full power, deals 11, takes 0, ignores the fortification; also hits 6 on Marksman
  - Left: Martians Tripod 12+2; Humans Swordsman 4, Marksman 6.
- **A Colossus at a Guard on a walled center: without the Disintegrator, two turns**
  - Colossus (32+3) attacks Guard (17): full power, deals 10, takes 0
  - Martians end the turn: done
  - Humans end the turn: done
  - Colossus (32+3) attacks Guard (11): half power, deals 5, takes 0
  - Left: Martians Colossus 32+3; Humans Guard 6.
- **A Saucer flies three tiles, sets a Grunt from two tiles behind it down in front, and the Grunt shoots (Beam Down)**
  - Saucer moves 3 tiles: done
  - Saucer beams Grunt down beside it: set down
  - Grunt (8+2) attacks Catapult (10): deals 7, takes 0
  - Left: Martians Saucer 8+2, Grunt 8+2; Humans Catapult 3.

##### Mind Control

- **A Ray Gunner's full ray leaves a Knight at 3 HP and the Brain two tiles away takes it; the Humans shoot the Brain**
  - Ray Gunner (8+2) attacks Knight (13): full power, deals 10, takes 0
  - Brain takes control of Knight (3): it is theirs
  - Martians end the turn: done
  - Marksman (12) attacks Brain (8+2): deals 4 (Shield 2), takes 0
  - Marksman (12) attacks Brain (4): deals 4 (kills), takes 0; Knight is released to its owner
  - Left: Martians Ray Gunner 8+2; Humans Knight 3, Marksman 12, Marksman 12.
- **The same, and the Brain is out of the Marksmen's reach: next turn the Knight rides for the Martians**
  - Ray Gunner (8+2) attacks Knight (13): full power, deals 10, takes 0
  - Brain takes control of Knight (3): it is theirs
  - Martians end the turn: done
  - Humans end the turn: done
  - Knight moves 1 tile: done
  - Knight (3) attacks Marksman (12): deals 9, takes 2
  - Knight (1) attacks Marksman (12): refused (UNIT_ALREADY_ACTED)
  - Left: Martians Ray Gunner 8+2, Brain 8+2, Knight 1; Humans Marksman 3, Marksman 12.
- **A Brain cannot take a healthy unit, or one at 7 HP**
  - Brain takes control of Knight (13): refused (MIND_CONTROL_NOT_LEGAL TARGET_HEALTHY)
  - Brain takes control of Swordsman (7): refused (MIND_CONTROL_NOT_LEGAL TARGET_HEALTHY)
  - Left: Martians Brain 8+2; Humans Knight 13, Swordsman 7.
- **A Grunt's shot leaves a Lich at 4 HP and the Brain takes it; next turn it fires at its old line (no Plague: the Martians own no Pestilence)**
  - Grunt (8+2) attacks Lich (10): deals 6, takes 0 (Shield 2)
  - Brain takes control of Lich (4): it is theirs
  - Martians end the turn: 1 Shields recharge
  - Undead end the turn: done
  - Lich (4) attacks Skeleton (10): deals 4, takes 0; also hits 2 on Skeleton, 2 on Skeleton
  - Left: Martians Grunt 8+2, Brain 8+2, Lich 4; Undead Skeleton 8, Skeleton 6, Skeleton 8.
- **A Grunt's shot leaves a Scrap Buggy at 4 HP and the Brain takes it; next turn it drives among the Goblins and Kabooms**
  - Grunt (8+2) attacks Scrap Buggy (10): deals 6, takes 0
  - Brain takes control of Scrap Buggy (4): it is theirs
  - Martians end the turn: done
  - Goblins end the turn: done
  - Scrap Buggy moves 1 tile: done
  - Scrap Buggy (4) Kabooms: own Scrap Buggy explodes for 5: 5 on Goblin, 5 on Bomb Chucker, 5 on Goblin
  - Left: Martians Grunt 8+2, Brain 8+2; Goblins Goblin 1, Bomb Chucker 3, Goblin 1.

##### Grunts, Ray Gunners, and the units that walk at them

- **Three Grunts (9 Coins) and four Fighters (8 Coins) four tiles apart: the Fighters advance, the Grunts stand and shoot**
  - Start: Martians Grunt ×3 (8+2, 8+2, 8+2); Humans Fighter ×4 (12, 12, 12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 4 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×4 (12, 12, 12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×4 (12, 12, 12, 12).
  - Humans, turn 2: 0 attacks, 0 HP damage, 0 kills, 3 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×4 (12, 12, 12, 12).
  - Martians, turn 2: 3 attacks, 12 HP damage, 1 kills. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×3 (12, 12, 12).
  - Humans, turn 3: 2 attacks, 8 HP damage, 1 kills, 3 moves. Martians: Grunt ×2 (8+2, 8+2). Humans: Fighter ×3 (9, 12, 12).
  - Martians, turn 3: 2 attacks, 11 HP damage, 0 kills. Martians: Grunt ×2 (8+2, 8+2). Humans: Fighter ×3 (9, 12, 1).
  - Humans, turn 4: 2 attacks, 8 HP damage, 1 kills, 1 moves. Martians: Grunt ×1 (8+2). Humans: Fighter ×3 (6, 12, 1).
  - Martians, turn 4: 1 attacks, 6 HP damage, 1 kills. Martians: Grunt ×1 (8+2). Humans: Fighter ×2 (12, 1).
  - Humans, turn 5: 1 attacks, 3 HP damage, 0 kills. Martians: Grunt ×1 (5). Humans: Fighter ×2 (9, 1).
  - Martians, turn 5: 1 attacks, 3 HP damage, 1 kills. Martians: Grunt ×1 (5+2). Humans: Fighter ×1 (9).
  - Humans, turn 6: 1 attacks, 4 HP damage, 0 kills. Martians: Grunt ×1 (1). Humans: Fighter ×1 (6).
  - Martians, turn 6: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×1 (1+2). Humans: Fighter ×1 (6).
- **The same, and a Grunt with a Fighter beside it steps back one tile before it shoots**
  - Start: Martians Grunt ×3 (8+2, 8+2, 8+2); Humans Fighter ×4 (12, 12, 12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 4 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×4 (12, 12, 12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×4 (12, 12, 12, 12).
  - Humans, turn 2: 0 attacks, 0 HP damage, 0 kills, 3 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×4 (12, 12, 12, 12).
  - Martians, turn 2: 3 attacks, 12 HP damage, 1 kills. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Fighter ×3 (12, 12, 12).
  - Humans, turn 3: 2 attacks, 8 HP damage, 1 kills, 3 moves. Martians: Grunt ×2 (8+2, 8+2). Humans: Fighter ×3 (9, 12, 12).
  - Martians, turn 3: 2 attacks, 9 HP damage, 1 kills, 1 moves. Martians: Grunt ×2 (8+2, 8+2). Humans: Fighter ×2 (12, 12).
  - Humans, turn 4: 2 attacks, 8 HP damage, 1 kills, 1 moves. Martians: Grunt ×1 (8+2). Humans: Fighter ×2 (9, 12).
  - Martians, turn 4: 1 attacks, 5 HP damage, 0 kills, 1 moves. Martians: Grunt ×1 (8+2). Humans: Fighter ×2 (4, 12).
  - Humans, turn 5: 1 attacks, 3 HP damage, 0 kills, 1 moves. Martians: Grunt ×1 (5). Humans: Fighter ×2 (4, 9).
  - Martians, turn 5: 1 attacks, 4 HP damage, 1 kills, 1 moves. Martians: Grunt ×1 (5+2). Humans: Fighter ×1 (9).
  - Humans, turn 6: 1 attacks, 4 HP damage, 0 kills, 1 moves. Martians: Grunt ×1 (1). Humans: Fighter ×1 (6).
  - Martians, turn 6: 1 attacks, 2 HP damage, 0 kills, 1 moves. Martians: Grunt ×1 (1+2). Humans: Fighter ×1 (4).
- **Four Grunts (12 Coins) and six Fighters (12 Coins): the Fighters advance, the Grunts stand and shoot**
  - Start: Martians Grunt ×4 (8+2, 8+2, 8+2, 8+2); Humans Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 5 moves. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 2: 0 attacks, 0 HP damage, 0 kills, 4 moves. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Martians, turn 2: 4 attacks, 17 HP damage, 1 kills. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2). Humans: Fighter ×5 (12, 7, 12, 12, 12).
  - Humans, turn 3: 3 attacks, 11 HP damage, 1 kills, 5 moves. Martians: Grunt ×3 (5, 8+2, 8+2). Humans: Fighter ×5 (9, 7, 9, 12, 12).
  - Martians, turn 3: 3 attacks, 12 HP damage, 1 kills. Martians: Grunt ×3 (3, 8+2, 8+2). Humans: Fighter ×4 (9, 4, 12, 12).
  - Humans, turn 4: 2 attacks, 6 HP damage, 1 kills, 2 moves. Martians: Grunt ×2 (5, 8+2). Humans: Fighter ×4 (9, 4, 9, 12).
  - Martians, turn 4: 2 attacks, 6 HP damage, 1 kills. Martians: Grunt ×2 (3, 8+2). Humans: Fighter ×3 (9, 9, 12).
  - Humans, turn 5: 3 attacks, 11 HP damage, 2 kills, 1 moves. Martians: nothing. Humans: Fighter ×3 (9, 6, 12).
- **Three Ray Gunners (12 Coins) in the place of the four Grunts, against the same six Fighters**
  - Start: Martians Ray Gunner ×3 (8+2, 8+2, 8+2); Humans Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 5 moves. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 2: 0 attacks, 0 HP damage, 0 kills, 4 moves. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Martians, turn 2: 3 attacks, 20 HP damage, 1 kills. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×5 (12, 4, 12, 12, 12).
  - Humans, turn 3: 3 attacks, 12 HP damage, 1 kills, 5 moves. Martians: Ray Gunner ×2 (4, 8+2). Humans: Fighter ×5 (10, 4, 10, 12, 12).
  - Martians, turn 3: 2 attacks, 7 HP damage, 1 kills. Martians: Ray Gunner ×2 (4+2, 8+2). Humans: Fighter ×4 (7, 10, 12, 12).
  - Humans, turn 4: 3 attacks, 12 HP damage, 2 kills, 1 moves. Martians: nothing. Humans: Fighter ×4 (7, 8, 12, 12).
- **The same three Ray Gunners with Heat Sinks (no Cooling: full power every turn they do not move)**
  - Start: Martians Ray Gunner ×3 (8+2, 8+2, 8+2); Humans Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 5 moves. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Humans, turn 2: 0 attacks, 0 HP damage, 0 kills, 4 moves. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12).
  - Martians, turn 2: 3 attacks, 20 HP damage, 1 kills. Martians: Ray Gunner ×3 (8+2, 8+2, 8+2). Humans: Fighter ×5 (12, 4, 12, 12, 12).
  - Humans, turn 3: 3 attacks, 12 HP damage, 1 kills, 5 moves. Martians: Ray Gunner ×2 (4, 8+2). Humans: Fighter ×5 (10, 4, 10, 12, 12).
  - Martians, turn 3: 2 attacks, 13 HP damage, 1 kills. Martians: Ray Gunner ×2 (4+2, 8+2). Humans: Fighter ×4 (1, 10, 12, 12).
  - Humans, turn 4: 2 attacks, 8 HP damage, 1 kills, 2 moves. Martians: Ray Gunner ×1 (4). Humans: Fighter ×4 (1, 10, 10, 12).
  - Martians, turn 4: 1 attacks, 3 HP damage, 1 kills. Martians: Ray Gunner ×1 (4+2). Humans: Fighter ×3 (10, 10, 12).
  - Humans, turn 5: 1 attacks, 4 HP damage, 1 kills. Martians: nothing. Humans: Fighter ×3 (10, 10, 12).
- **Four Grunts (12 Coins) and three Marksmen (12 Coins) shoot at each other from two tiles; nobody moves**
  - Start: Martians Grunt ×4 (8+2, 8+2, 8+2, 8+2); Humans Marksman ×3 (12, 12, 12).
  - Martians, turn 1: 4 attacks, 24 HP damage, 2 kills. Martians: Grunt ×4 (8, 8+2, 8, 8+2). Humans: Marksman ×1 (12).
  - Humans, turn 1: 1 attacks, 3 HP damage, 0 kills. Martians: Grunt ×4 (5, 8+2, 8+2, 8+2). Humans: Marksman ×1 (9).
  - Martians, turn 2: 2 attacks, 9 HP damage, 1 kills. Martians: Grunt ×4 (5, 8+2, 8+2, 8+2). Humans: nothing.
- **Five Grunts (15 Coins) and three Swordsmen (15 Coins) four tiles apart: the Swordsmen advance, the Grunts step back from a unit beside them and shoot**
  - Start: Martians Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2); Humans Swordsman ×3 (15, 15, 15).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 3 moves. Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2). Humans: Swordsman ×3 (15, 15, 15).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2). Humans: Swordsman ×3 (15, 15, 15).
  - Humans, turn 2: 0 attacks, 0 HP damage, 0 kills, 3 moves. Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2). Humans: Swordsman ×3 (15, 15, 15).
  - Martians, turn 2: 5 attacks, 23 HP damage, 1 kills. Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2). Humans: Swordsman ×2 (11, 11).
  - Humans, turn 3: 2 attacks, 16 HP damage, 2 kills, 2 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Swordsman ×2 (11, 11).
  - Martians, turn 3: 2 attacks, 11 HP damage, 1 kills, 1 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Swordsman ×1 (11).
  - Humans, turn 4: 0 attacks, 0 HP damage, 0 kills, 1 moves. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: Swordsman ×1 (11).
  - Martians, turn 4: 2 attacks, 11 HP damage, 1 kills. Martians: Grunt ×3 (8+2, 8+2, 8+2). Humans: nothing.
- **Four Grunts and a Shield Projector behind them with Force Fields (16 Coins, Shield 4) against six Fighters and two Marksmen (20 Coins) that advance**
  - Start: Martians Grunt ×4 (8+4, 8+4, 8+4, 8+4), Shield Projector ×1 (12+3); Humans Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 7 moves. Martians: Grunt ×4 (8+4, 8+4, 8+4, 8+4), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×4 (8+4, 8+4, 8+4, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Humans, turn 2: 2 attacks, 2 HP damage, 0 kills, 6 moves. Martians: Grunt ×4 (7, 7, 8+4, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (9, 9).
  - Martians, turn 2: 4 attacks, 20 HP damage, 1 kills. Martians: Grunt ×4 (7+3, 7+3, 8+4, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 7, 12, 12, 12), Marksman ×1 (3).
  - Humans, turn 3: 5 attacks, 14 HP damage, 2 kills, 7 moves. Martians: Grunt ×2 (8+4, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (9, 12, 3, 9, 12, 12), Marksman ×1 (3).
  - Martians, turn 3: 2 attacks, 8 HP damage, 1 kills. Martians: Grunt ×2 (8+4, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×5 (9, 12, 9, 7, 12), Marksman ×1 (3).
  - Humans, turn 4: 5 attacks, 11 HP damage, 1 kills, 3 moves. Martians: Grunt ×1 (8+2), Shield Projector ×1 (9). Humans: Fighter ×5 (6, 6, 6, 7, 12), Marksman ×1 (3).
  - Martians, turn 4: 1 attacks, 6 HP damage, 1 kills. Martians: Grunt ×1 (8+2), Shield Projector ×1 (9+3). Humans: Fighter ×4 (6, 6, 7, 12), Marksman ×1 (3).
  - Humans, turn 5: 4 attacks, 8 HP damage, 1 kills, 1 moves. Martians: Shield Projector ×1 (11+1). Humans: Fighter ×4 (6, 2, 4, 12), Marksman ×1 (3).
  - Martians, turn 5: 1 attacks, 4 HP damage, 1 kills. Martians: Shield Projector ×1 (11+3). Humans: Fighter ×3 (8, 2, 12), Marksman ×1 (3).
  - Humans, turn 6: 3 attacks, 6 HP damage, 0 kills, 2 moves. Martians: Shield Projector ×1 (5). Humans: Fighter ×3 (1, 2, 6), Marksman ×1 (3).
  - Martians, turn 6: 1 attacks, 1 HP damage, 1 kills. Martians: Shield Projector ×1 (5+3). Humans: Fighter ×2 (4, 6), Marksman ×1 (3).
- **The same five without Force Fields (the Projector is a body: Shield 2 on the Grunts)**
  - Start: Martians Grunt ×4 (8+2, 8+2, 8+2, 8+2), Shield Projector ×1 (12+3); Humans Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 7 moves. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Humans, turn 2: 2 attacks, 6 HP damage, 0 kills, 6 moves. Martians: Grunt ×4 (5, 5, 8+2, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (9, 9).
  - Martians, turn 2: 4 attacks, 20 HP damage, 1 kills. Martians: Grunt ×4 (5, 5, 8+2, 8+2), Shield Projector ×1 (12+3). Humans: Fighter ×6 (12, 12, 7, 12, 12, 12), Marksman ×1 (3).
  - Humans, turn 3: 5 attacks, 18 HP damage, 3 kills, 7 moves. Martians: Grunt ×1 (8+2), Shield Projector ×1 (12+1). Humans: Fighter ×6 (12, 12, 3, 12, 12, 12), Marksman ×1 (3).
  - Martians, turn 3: 1 attacks, 3 HP damage, 1 kills. Martians: Grunt ×1 (8+2), Shield Projector ×1 (12+3). Humans: Fighter ×5 (12, 12, 12, 12, 12), Marksman ×1 (3).
  - Humans, turn 4: 5 attacks, 15 HP damage, 1 kills, 2 moves. Martians: Shield Projector ×1 (5). Humans: Fighter ×5 (6, 6, 9, 12, 12), Marksman ×1 (3).
  - Martians, turn 4: 0 attacks, 0 HP damage, 0 kills. Martians: Shield Projector ×1 (5+3). Humans: Fighter ×5 (6, 6, 9, 12, 12), Marksman ×1 (3).
  - Humans, turn 5: 2 attacks, 5 HP damage, 0 kills, 1 moves. Martians: Shield Projector ×1 (2). Humans: Fighter ×5 (6, 6, 3, 12, 12), Marksman ×1 (3).
  - Martians, turn 5: 0 attacks, 0 HP damage, 0 kills. Martians: Shield Projector ×1 (2+3). Humans: Fighter ×5 (8, 8, 3, 12, 12), Marksman ×1 (3).
  - Humans, turn 6: 2 attacks, 4 HP damage, 1 kills. Martians: nothing. Humans: Fighter ×5 (4, 8, 3, 12, 12), Marksman ×1 (3).
- **The same four Grunts without the Projector (12 Coins) against the same eight**
  - Start: Martians Grunt ×4 (8+2, 8+2, 8+2, 8+2); Humans Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Humans, turn 1: 0 attacks, 0 HP damage, 0 kills, 7 moves. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Martians: Grunt ×4 (8+2, 8+2, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (12, 12).
  - Humans, turn 2: 2 attacks, 6 HP damage, 0 kills, 6 moves. Martians: Grunt ×4 (5, 5, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 12, 12, 12, 12), Marksman ×2 (9, 9).
  - Martians, turn 2: 4 attacks, 20 HP damage, 1 kills. Martians: Grunt ×4 (5, 5, 8+2, 8+2). Humans: Fighter ×6 (12, 12, 7, 12, 12, 12), Marksman ×1 (3).
  - Humans, turn 3: 4 attacks, 10 HP damage, 2 kills, 7 moves. Martians: Grunt ×2 (8+2, 8+2). Humans: Fighter ×6 (10, 12, 4, 12, 12, 12), Marksman ×1 (3).
  - Martians, turn 3: 2 attacks, 9 HP damage, 1 kills. Martians: Grunt ×2 (8+2, 8+2). Humans: Fighter ×5 (10, 12, 7, 12, 12), Marksman ×1 (3).
  - Humans, turn 4: 4 attacks, 16 HP damage, 2 kills, 4 moves. Martians: nothing. Humans: Fighter ×5 (7, 12, 3, 12, 12), Marksman ×1 (3).

##### The Undead against Grunts

- **Five Zombies walk at five Grunts that stand and shoot (15 Coins each; the Undead move first, four tiles away)**
  - Start: Undead Zombie ×5 (18, 18, 18, 18, 18); Martians Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 1: 0 attacks, 0 HP damage, 0 kills, 4 moves. Undead: Zombie ×5 (18, 18, 18, 18, 18). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Undead: Zombie ×5 (18, 18, 18, 18, 18). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 2: 0 attacks, 0 HP damage, 0 kills, 3 moves. Undead: Zombie ×5 (18, 18, 18, 18, 18). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 2: 5 attacks, 26 HP damage, 0 kills. Undead: Zombie ×5 (2, 13, 13, 18, 18). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 3: 0 attacks, 0 HP damage, 0 kills, 2 moves. Undead: Zombie ×5 (2, 13, 13, 18, 18). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 3: 4 attacks, 15 HP damage, 2 kills. Undead: Zombie ×3 (13, 18, 18). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 4: 1 attacks, 2 HP damage, 0 kills, 1 bites, 2 moves. Undead: Zombie ×3 (10, 18, 18). Martians: Grunt ×5 (6, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 4: 5 attacks, 26 HP damage, 1 kills. Undead: Zombie ×2 (2, 18). Martians: Grunt ×5 (4, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 5: 0 attacks, 0 HP damage, 0 kills, 2 moves. Undead: Zombie ×2 (2, 18). Martians: Grunt ×5 (4+2, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 5: 5 attacks, 20 HP damage, 2 kills. Undead: nothing. Martians: Grunt ×5 (4+2, 8+2, 8+2, 8+2, 8+2).
- **Seven Skeletons (14 Coins) walk at five Grunts (15 Coins) that stand and shoot (Bones: a Grunt's shot from two tiles deals a Skeleton 4)**
  - Start: Undead Skeleton ×7 (10, 10, 10, 10, 10, 10, 10); Martians Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 1: 0 attacks, 0 HP damage, 0 kills, 6 moves. Undead: Skeleton ×7 (10, 10, 10, 10, 10, 10, 10). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 1: 0 attacks, 0 HP damage, 0 kills. Undead: Skeleton ×7 (10, 10, 10, 10, 10, 10, 10). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 2: 0 attacks, 0 HP damage, 0 kills, 5 moves. Undead: Skeleton ×7 (10, 10, 10, 10, 10, 10, 10). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Martians, turn 2: 5 attacks, 18 HP damage, 1 kills. Undead: Skeleton ×6 (10, 6, 6, 10, 10, 10). Martians: Grunt ×5 (8+2, 8+2, 8+2, 8+2, 8+2).
  - Undead, turn 3: 4 attacks, 16 HP damage, 2 kills, 6 moves. Undead: Skeleton ×6 (7, 6, 2, 10, 10, 10). Martians: Grunt ×3 (8+2, 8+2, 8+2).
  - Martians, turn 3: 3 attacks, 11 HP damage, 1 kills. Undead: Skeleton ×5 (7, 6, 1, 10, 10). Martians: Grunt ×3 (8+2, 8+2, 8+2).
  - Undead, turn 4: 4 attacks, 11 HP damage, 1 kills, 5 moves. Undead: Skeleton ×5 (4, 3, 1, 10, 7). Martians: Grunt ×2 (5, 8+2).
  - Martians, turn 4: 2 attacks, 5 HP damage, 2 kills. Undead: Skeleton ×3 (3, 10, 7). Martians: Grunt ×2 (5+2, 8+2).
  - Undead, turn 5: 2 attacks, 5 HP damage, 1 kills, 2 moves. Undead: Skeleton ×3 (3, 8, 7). Martians: Grunt ×1 (8+2).
  - Martians, turn 5: 1 attacks, 3 HP damage, 1 kills. Undead: Skeleton ×2 (8, 7). Martians: Grunt ×1 (8+2).
  - Undead, turn 6: 2 attacks, 8 HP damage, 1 kills. Undead: Skeleton ×2 (5, 7). Martians: nothing.
- **A Zombie that stands beside a Grunt bites it through its Shield, and a Skeleton finishes it: it rises**
  - Zombie (18) attacks Grunt (8+2): deals 3 (Shield 2), takes 3, bites
  - Skeleton (10) attacks Grunt (5): deals 5 (kills), takes 0; Grunt rises as a Zombie of the Undead (it was Bitten)
  - Left: Undead Zombie 15, Skeleton 10, Zombie 10; Martians nothing.
- **The same bite on a Grunt in a Force Field (Shield 4): it loses 1 HP and is Bitten all the same; a Banshee's Wail on three Grunts**
  - Zombie (18) attacks Grunt (8+4): deals 1 (Shield 4), takes 3, bites
  - Banshee (8) Wails: 2 on Grunt, 0 (Shield 2) on Grunt, 0 (Shield 2) on Grunt
  - Left: Undead Zombie 15, Banshee 8; Martians Grunt 5, Grunt 8, Grunt 8.
- **A Lich (with Pestilence) fires at the middle of three Grunts, Shield 2; then at three in a Force Field**
  - Lich (10) attacks Grunt (8+2): deals 7 (Shield 2), takes 0; also hits 3 (Shield 2) on Grunt, 3 (Shield 2) on Grunt; plagues 3
  - Lich (10) attacks Grunt (8+4): deals 5 (Shield 4), takes 0; also hits 1 (Shield 4) on Grunt, 1 (Shield 4) on Grunt; plagues 3
  - Left: Undead Lich 10, Lich 10; Martians Grunt 5, Grunt 1, Grunt 5, Grunt 7, Grunt 3, Grunt 7.

##### The Goblins against Shields

- **Three Bomb Chuckers throw at the middle of three Grunts, Shield 2**
  - Bomb Chucker (8) attacks Grunt (8+2): deals 3 (Shield 2), takes 3; also hits 1 (Shield 2) on Grunt, 1 (Shield 2) on Grunt
  - Bomb Chucker (8) attacks Grunt (5): deals 5 (kills), takes 0; also hits 3 on Grunt, 3 on Grunt; Plunder +2
  - Bomb Chucker: its target is gone
  - Left: Goblins Bomb Chucker 5, Bomb Chucker 8, Bomb Chucker 8; Martians Grunt 4, Grunt 4.
- **The same three bombs on three Grunts in a Force Field (Shield 4)**
  - Bomb Chucker (8) attacks Grunt (8+4): deals 1 (Shield 4), takes 3; also hits 0 (Shield 3) on Shield Projector, 0 (Shield 3) on Grunt, 0 (Shield 3) on Grunt
  - Bomb Chucker (8) attacks Grunt (7): deals 5, takes 3; also hits 3 on Shield Projector, 2 (Shield 1) on Grunt, 2 (Shield 1) on Grunt
  - Bomb Chucker (8) attacks Grunt (2): deals 2 (kills), takes 0; also hits 1 on Shield Projector, 1 on Grunt, 1 on Grunt; Plunder +2
  - Left: Goblins Bomb Chucker 5, Bomb Chucker 5, Bomb Chucker 8; Martians Grunt 5, Grunt 5, Shield Projector 8.
- **A Rocket Cart with a Goblin beside the target and WAAAGH! fires at a Shield Projector, and a second one at a Grunt in its Force Field; the Goblin Kabooms**
  - Orc Warboss calls WAAAGH!: 2 units inspired
  - Rocket Cart (8) attacks Shield Projector (12+3): deals 12 (Shield 3) (kills), takes 0, inspired, Gang Up +1; Plunder +2
  - Rocket Cart (8) attacks Grunt (8+4): deals 7 (Shield 4), takes 0, inspired, Gang Up +1
  - Goblin (6) Kabooms: own Goblin explodes for 5: 1 (Shield 4) on Grunt, 1 on Grunt (kills); Plunder +2
  - Left: Goblins Orc Warboss 12, Rocket Cart 8, Rocket Cart 8; Martians Grunt 7.
- **Two Goblins (Gang Up) and a charging Wolf Rider on a Grunt, Shield 2**
  - Goblin (6) attacks Grunt (8+2): deals 5 (Shield 2), takes 3, Gang Up +1
  - Goblin (6) attacks Grunt (3): deals 3 (kills), takes 0, Gang Up +1, advances; Plunder +2
  - Wolf Rider moves 2 tiles: done
  - Left: Goblins Goblin 3, Goblin 6, Wolf Rider 10; Martians Grunt 8+2.

#### Martian technologies

| Branch     | Technology     | Tier | After          | Cost as the 2nd / 5th / 9th technology | Unlocks (as coded)                                                                             |
| ---------- | -------------- | ---- | -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SETTLEMENT | GATHERING      | 1    | —              | 5 / 8 / 12                             | reveals FERTILE_GROUND, HARVEST_FRUIT                                                          |
| SETTLEMENT | FARMING        | 2    | GATHERING      | 7 / 10 / 14                            | BUILD_FARM, CONNECTED_FARM_VISUALS                                                             |
| SETTLEMENT | MILLING        | 3    | FARMING        | 9 / 12 / 16                            | BUILD_WINDMILL, ECONOMIC_FORMULA, ADJACENT_START_TURN_HEALING                                  |
| SETTLEMENT | ADMINISTRATION | 2    | GATHERING      | 7 / 10 / 14                            | unit Brain, BRAIN_SUPPORT, BUILD_MARKET, DISBAND                                               |
| SETTLEMENT | PLANNING       | 3    | ADMINISTRATION | 9 / 12 / 16                            | OWNED_CITY_CAPACITY_BONUS, LAND_GRANT                                                          |
| WILDS      | HUNTING        | 1    | —              | 5 / 8 / 12                             | HUNT_GAME                                                                                      |
| WILDS      | FORESTRY       | 2    | HUNTING        | 7 / 10 / 14                            | BUILD_LUMBER_CAMP, CLEAR_FOREST, FOREST_COVER                                                  |
| WILDS      | SAWMILLING     | 3    | FORESTRY       | 9 / 12 / 16                            | BUILD_SAWMILL, ECONOMIC_FORMULA, unit Tripod                                                   |
| WILDS      | MARKSMANSHIP   | 2    | HUNTING        | 7 / 10 / 14                            | unit Ray Gunner                                                                                |
| WILDS      | FIELDCRAFT     | 3    | MARKSMANSHIP   | 9 / 12 / 16                            | REPLANT_FOREST, FOREST_MOVEMENT_FREEDOM, FOREST_MARCH, ROLE_SIGHT, HEAT_SINKS                  |
| MOBILITY   | SCOUTING       | 1    | —              | 5 / 8 / 12                             | unit Saucer, ROLE_SIGHT                                                                        |
| MOBILITY   | ROADS          | 2    | SCOUTING       | 7 / 10 / 14                            | BUILD_ROAD, ROAD_MOVEMENT, LAND_ROAD_POPULATION                                                |
| MOBILITY   | COMMERCE       | 3    | ROADS          | 9 / 12 / 16                            | LAND_TRADE_INCOME, HIRE                                                                        |
| MOBILITY   | RAIDING        | 2    | SCOUTING       | 7 / 10 / 14                            | PILLAGE, CHARGE_BONUS                                                                          |
| MOBILITY   | CHIVALRY       | 3    | RAIDING        | 9 / 12 / 16                            | unit Mothership, CULTIVATE_FOREST                                                              |
| INDUSTRY   | DRILL          | 1    | —              | 5 / 8 / 12                             | reveals ORE, unit Shield Projector, FIRST_HOSTILE_CAPTURE_SPOILS                               |
| INDUSTRY   | ENGINEERING    | 2    | DRILL          | 7 / 10 / 14                            | MOUNTAIN_MOVEMENT, HIGH_GROUND_VISION, BUILD_MINE, BUILD_WORKSHOP, REDEVELOP, ECONOMIC_FORMULA |
| INDUSTRY   | METALLURGY     | 3    | ENGINEERING    | 9 / 12 / 16                            | BUILD_FORGE, ECONOMIC_FORMULA, ARMS_INDUSTRY_DISCOUNT                                          |
| INDUSTRY   | FORTIFICATION  | 2    | DRILL          | 7 / 10 / 14                            | FORCE_FIELDS                                                                                   |
| INDUSTRY   | EXPLOSIVES     | 3    | FORTIFICATION  | 9 / 12 / 16                            | BLAST_MOUNTAIN, MELEE_FIELD_DEMOLITION, DISINTEGRATOR                                          |

#### Martian price list

| Unit             | Technology (tier)  | Cost   | Hired | Slots | HP  | Shield | Atk / Def | Move | Range | Acts after moving | Abilities                            | A city of income 3 / 5 / 7 pays for one a turn |
| ---------------- | ------------------ | ------ | ----- | ----- | --- | ------ | --------- | ---- | ----- | ----------------- | ------------------------------------ | ---------------------------------------------- |
| Grunt            | —                  | 3      | 5     | 1     | 8   | 2      | 2 / 1.5   | 1    | 1-2   | yes               | —                                    | yes / yes / yes                                |
| Saucer           | SCOUTING (1)       | 4      | 6     | 1     | 8   | 2      | 1.5 / 1   | 3    | 1     | yes               | CHARGE, FLY, BEAM_DOWN, TRACTOR_BEAM | no / yes / yes                                 |
| Ray Gunner       | MARKSMANSHIP (2)   | 4      | 6     | 1     | 8   | 2      | 3 / 1     | 1    | 1-2   | yes               | HEAT_RAY                             | no / yes / yes                                 |
| Shield Projector | DRILL (1)          | 4      | 6     | 1     | 12  | 3      | 1.5 / 2.5 | 1    | 1     | no                | FORCE_FIELD                          | no / yes / yes                                 |
| Brain            | ADMINISTRATION (2) | 5      | 8     | 1     | 8   | 2      | 1 / 1     | 1    | 1     | yes               | RALLY, MIND_CONTROL                  | no / yes / yes                                 |
| Tripod           | SAWMILLING (3)     | 9      | 14    | 1     | 12  | 2      | 4 / 1     | 2    | 2     | yes               | STRIDE, HEAT_RAY, PIERCE             | no / no / no                                   |
| Mothership       | CHIVALRY (3)       | 8      | 12    | 2     | 16  | 4      | 2.5 / 2   | 2    | 1     | yes               | FLY, BEAM_DOWN, TRACTOR_BEAM         | no / no / no                                   |
| Colossus         | —                  | reward | —     | 2     | 32  | 3      | 4 / 2.5   | 1    | 1-2   | yes               | PUSH, STRIDE, HEAT_RAY               | —                                              |

Unit slots of a Martian city: L1 2/3, L2 3/4, L3 4/5, L4 5/6, L5 6/7 (without / with Planning), as for the Humans; a Mothership and a Colossus fill two, a mind-controlled unit none.

### 2.1 What the numbers say

**The Grunt is a shooter that costs what a body costs.** From two tiles it
deals a Fighter 5, a Guard 6 (the Guard is open to ranged attacks), a
Marksman, a Raider, or a Knight 6, a Catapult 7, and a Swordsman 4, and no
hand-to-hand unit answers. It kills a Goblin outright. It may move and
shoot at full Attack. Its 8 HP and Shield 2 are the price: a Swordsman, a
Knight, a Rocket Cart, or a Tripod kills it in one attack, a Catapult, a
Lich, a Vampire, or a charging rider leaves it at 1 HP, and two Fighters
kill it in a turn.

**Grunts beat what walks at them in small numbers and lose to it in
large.** Three Grunts (9 Coins) against four Fighters (8 Coins) end with
one Grunt at 1 HP and one Fighter. Four Grunts lose to six Fighters for
the same 12 Coins: the Fighters lose three and keep three. Four Grunts
kill three Marksmen (12 Coins) without a loss, because the Grunts shoot
first, a Grunt's Shield takes 2 of a Marksman's 5, and the Grunt answers a
shot from two tiles. Five Grunts kill three Swordsmen (15 Coins) and lose
two when they step back from a unit beside them before they shoot. Five
Grunts kill five Zombies (15 Coins) for one bite and no loss; seven
Skeletons (14 Coins, Bones) beat five Grunts and keep two. So the Grunt is
strong against few dear units and slow ones, and weak against many cheap
ones: the numbers arrive, and each Fighter's hit costs a Grunt 3 of its 8
HP.

**The Ray Gunner without Heat Sinks is a Grunt that costs a Coin more.**
Standing still it deals a Fighter 8 and then 3, 11 in two turns; a Grunt
deals 5 and 5 and may walk. What the Ray Gunner has is the single hit: it
kills a Catapult, a Captain, a Wolf Rider, a Scrap Buggy, a Ghoul, a
Necromancer, a Lich, or a Vampire in one shot, where a Grunt needs two,
and it deals a Guard, a Marksman, a Raider, or a Knight 10. Three Ray
Gunners against the six Fighters that beat four Grunts do worse than the
Grunts (they kill two and die in four turns). **With Heat Sinks** the same
three kill three of the six before they die, and a pair that is not
reached deals 16 a turn to Fighters, every turn. That is the change's
job: a reason to buy the unit and a reason to buy the technology.

**The Tripod is the faction's kill.** At full power from two tiles it
kills a Fighter, a Marksman, a Raider, a Captain, a Catapult, or a Knight
in one shot, and deals a Guard 14 and a Swordsman 11, with half as much
again on the unit behind (Pierce). Then it is Cooling and deals 5. It cannot shoot a
unit beside it at all, has Defense 1, and a Knight or two Swordsmen kill
it. It costs 9 Coins and three technologies. One shot in two turns that
kills a 2- to 9-Coin unit is strong and not automatic: a Tripod with
nothing in front of it is lost to the first unit that reaches it.

**A Shield does little against one big hit and a lot against many small
ones.** That is the faction's shape and it decides its matchups. A
Shield of 2 takes 2 of the 5 of a Fighter's hit on a Grunt and 2 of the 11 of a
Swordsman's, which kills anyway (about a fifth). With Force Fields (Shield 4, recharged
at the end of the owner's turn as well) a Fighter's hit costs a Grunt 1
HP, a Marksman's 1, a Bomb Chucker's 1, a Banshee's Wail nothing, and a
Swordsman's 7 instead of a kill. Four Grunts and a Projector with Force
Fields (16 Coins) against six Fighters and two Marksmen (20 Coins) that
walk at them kill five of the eight in six turns and end with the
Projector at 5 HP against three wounded units. The same five without the
technology kill two and are dead in six turns. Without the Projector the
four Grunts kill two and are dead in four. So the technology is worth a
great deal against small hits and, as first written, nothing against a
Knight, a Rocket Cart, or a Tripod. (The correction changed that: a whole
field now holds one attack, [section 13.1](#131-the-force-field-holds).)

**What goes through a Shield.** A Zombie's bite is not damage: it bites
through a Force Field (the Grunt loses 1 HP and is Bitten). A Lich's
Plague, Chill, and a Push are not damage either. A Rocket Cart with one
helper beside the target and WAAAGH! kills a Shield Projector (12 HP,
Shield 3) or a Grunt in a Force Field in one shot. A Knight kills every
one-slot Martian unit but the Projector.

**The Knight.** Five Grunts in a row, Shields up: a Knight that reaches
one end kills all five in one turn and stands at full HP. As first
written, with a Shield Projector in the middle of the line the ride ended
on it after two dead Grunts; a hand player's Knight simply attacked the
unit beside the Projector. Since the correction the first attack on a
fielded Grunt leaves it at 1 HP and the ride does not start (the
scenarios above are the corrected ones). If the
Martians move first, a Saucer's pull brings the Knight one tile into the
range of two Ray Gunners that have not moved: 10 and 3, dead before it
charges. [Section 6.5](#65-the-knight-against-a-martian-line) has what
follows from that.

**The Tractor Beam and Beam Down are what no other faction has.** A Guard
in a Forest three tiles from two Ray Gunners is out of range; a Saucer
flies up, pulls it one tile into the open, and the two rays kill it (10
and 7). A Mothership three tiles from a walled center pulls the Swordsman
on it two tiles off the Walls: a Tripod deals it 11 instead of 8, a Grunt
finishes it, and another Grunt walks onto the empty center (it captures
next turn if it is still there). A Saucer flies three tiles, sets a Grunt
down in front of it, and the Grunt shoots a Catapult for 7 in the same
turn. Each of these needs two or three units that have not acted and a
target that stands where the pull can move it; a unit on a city center
with a second unit beside it, or with its back to a Forest edge the pull
cannot cross, is safe.

**Mind Control turns a kill into a unit.** A Ray Gunner's ray leaves a
Knight at 3 HP and a Brain two tiles away takes it; if the Brain is not
shot (it has 8 HP and Shield 2, and two Marksmen kill it, which gives the
Knight back), the Knight rides for the Martians next turn. A controlled
Lich fires at its old line; a controlled Scrap Buggy drives into the
Goblins and Kabooms for 5 on three units. One unit per Brain, at 6 HP or
less, and not on a city or village.

**Heat rays against Walls.** Without the Disintegrator a Tripod deals a
Fighter on a walled center or a Field Defense 9 instead of a kill, and a
Guard 10 instead of 14; with it, the open-ground number. The Grunt's
pistol is no heat ray and gains nothing. So the Disintegrator is the
siege technology, and the Mothership's pull is the siege without it.

## 3. Every Martian unit

| Unit             | Price                | Its job                                                                                                                | What kills it                                                                      | What it cannot do                                                                 |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Grunt            | 3                    | the line that shoots: 4 to 7 from two tiles, also after a Move; takes villages and cities                              | a Swordsman, a Knight, a Rocket Cart, a Tripod (one attack); two Fighters; numbers | stand in a brawl (8 HP); advance after a kill; build Field Defense                |
| Saucer           | 4 (one free, Scouts) | carries a unit to the front or out of it (Beam Down); pulls one unit a tile (Tractor Beam); sees two tiles; flies      | anything that reaches it: 8 HP, Defense 1, never in cover                          | capture; take a village; fight (Attack 1.5)                                       |
| Ray Gunner       | 4                    | the one-shot kill of a 10-HP unit from two tiles; 10 on a Guard, a Marksman, a Knight; with Heat Sinks, every turn     | as the Grunt, and a Catapult or a charging rider in one attack                     | move and fire at full power; without Heat Sinks, fire at full power twice running |
| Shield Projector | 4                    | the body: 12 HP, Shield 3, Defense 2.5, the garrison, the unit that ends a Knight's ride; with Force Fields, the field | two Swordsmen; a Rocket Cart with a helper; a Knight and one more attack           | attack after a Move; hurt anything (Attack 1.5); cover itself with its own field  |
| Brain            | 5                    | Psychic Command (+1 Attack for the units beside it); Mind Control of one wounded unit                                  | as the Ray Gunner; and the unit it controls goes back to its owner                 | fight; be Inspired itself                                                         |
| Tripod           | 9                    | kills a 12-HP unit from two tiles every second turn; Pierce; walks over Forest and Mountain                            | a Knight; two Swordsmen; any unit beside it (it cannot shoot it)                   | shoot a unit beside it; capture; be Inspired; take cover                          |
| Mothership       | 8, two slots         | the free pull (two tiles, from three away) that empties a center or brings a unit into the rays; Beam Down; 16 HP      | three or four attacks; it has no cover and no Walls                                | capture; ride on (no Overrun); hit hard (Attack 2.5)                              |
| Colossus         | reward, once         | a Tripod's ray at range 1 or 2 on 32 HP; Push                                                                          | focus over two turns                                                               | advance; be pulled                                                                |

**The two failure checks.**

- **A faction that always wins?** No number rose, and one thing was taken
  away (the early Force Field). The faction loses to numbers of cheap
  units before Force Fields, to a Knight that reaches an open line at any
  time, to Rocket Carts, and to anything that gets beside its Tripods. It
  wins against few dear units, against slow units (Zombies, Guards,
  Catapults that must set up), and against a walled center once it has a
  Mothership or the Disintegrator. Those are counterable strengths.
- **One unit so good that nothing else is worth training?** The candidate
  is the Grunt (3 Coins, shoots like a Marksman). A Grunt-only army loses
  to six Fighters for the same Coins, to seven Skeletons, to one Knight,
  and cannot kill a Guard on a walled center (4 a shot, and it recovers).
  The Projector is what stops the Knight and holds the center; the Ray
  Gunner and the Tripod are what kill before the enemy arrives; the
  Saucer and the Mothership are what move the fight. The second candidate
  was the Tripod; Cooling, its minimum range, and its 9 Coins hold it, and
  Heat Sinks was kept from it for that reason.

## 4. Every Martian technology

### 4.1 The tree

The Martian tree is the shared tree with five differences: Administration
gives the Brain (Psychic Command and Mind Control) instead of the Captain,
Chivalry gives no Overrun, Fortification is **Force Fields**, Explosives
is the **Disintegrator**, and (this pass) Fieldcraft is **Heat Sinks**.
Costs are for the second, fifth, and ninth technology a player buys. The
naval branch is left out.

| Technology     | Tier | Cost        | Gives a Martian player                                                                          | When a thoughtful player buys it                                                             | Verdict                                       |
| -------------- | ---- | ----------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Gathering      | 1    | 5 / 8 / 12  | Harvest Fruit; shows Fertile Ground                                                             | first, with Fruit by the capital                                                             | good                                          |
| Hunting        | 1    | 5 / 8 / 12  | Hunt Game                                                                                       | first, with Game instead; the way to the Ray Gunner and the Tripod                           | good                                          |
| Scouting       | 1    | 5 / 8 / 12  | Saucer (flies, Beam Down, Tractor Beam, sight 2)                                                | for a second Saucer; the way to the Mothership                                               | good (the first Saucer is free now)           |
| Drill          | 1    | 5 / 8 / 12  | **Shield Projector**; shows Ore; +2 Coins for a first capture                                   | early: the garrison and the unit a Knight does not kill                                      | good; no longer the whole defence for 5 Coins |
| Farming        | 2    | 7 / 10 / 14 | Farm                                                                                            | with Fertile Ground                                                                          | good                                          |
| Administration | 2    | 7 / 10 / 14 | **Brain** (Psychic Command, Mind Control); Market; Disband                                      | once there are rays to leave units wounded; for the Market                                   | good                                          |
| Forestry       | 2    | 7 / 10 / 14 | Lumber Camp; Clear Forest; Forest cover for Grunts, Ray Gunners, Projectors, Brains             | on the way to the Tripod; machines never have cover                                          | a step with a use                             |
| Marksmanship   | 2    | 7 / 10 / 14 | **Ray Gunner**                                                                                  | when the enemy fields Catapults, Captains, riders, or Guards                                 | good                                          |
| Roads          | 2    | 7 / 10 / 14 | Roads; population for linked cities                                                             | with a second city a few tiles away; Grunts and Projectors have Move 1                       | good                                          |
| Raiding        | 2    | 7 / 10 / 14 | Pillage (3 Coins) for units that do not fly; Saucer Strafe                                      | with Saucers on the board (a strafing Saucer kills a Bomb Chucker, a Banshee, a Rocket Cart) | fair; the way to the Mothership               |
| Engineering    | 2    | 7 / 10 / 14 | Mine; Workshop; Redevelop; Mountains for Grunts, Ray Gunners, Projectors, Brains. **No unit**   | with Ore                                                                                     | economy                                       |
| Force Fields   | 2    | 7 / 10 / 14 | (Fortification) **the Projectors' Force Field** (Shield 4); Shields recharge at end of turn too | with the first Projector, against any army of cheap units or shooters                        | **was weak; now a main node** (fork 1)        |
| Milling        | 3    | 9 / 12 / 16 | Windmill (population; heals units beside it)                                                    | with two Farms around a tile                                                                 | good                                          |
| Planning       | 3    | 9 / 12 / 16 | +1 unit in every city; Land Grant                                                               | from the middle game; a Mothership fills two slots                                           | good                                          |
| Sawmilling     | 3    | 9 / 12 / 16 | Sawmill; **Tripod**                                                                             | as soon as there are Grunts to stand in front of it                                          | the strongest node of the tree                |
| Heat Sinks     | 3    | 9 / 12 / 16 | (Fieldcraft) **Ray Gunners do not overheat**; Replant Forest; Forest march; Ray Gunner sight 2  | with two Ray Gunners on the board                                                            | **was weak, as for every faction; now good**  |
| Commerce       | 3    | 9 / 12 / 16 | land trade (+1 Coin a linked city); **Markets hire**                                            | with three or more linked cities                                                             | good                                          |
| Chivalry       | 3    | 9 / 12 / 16 | **Mothership** (Heavy Tractor Beam, Beam Down); Clear for farming                               | against a walled center or a line with dear units at the back                                | good for what it does; dear                   |
| Metallurgy     | 3    | 9 / 12 / 16 | Forge; units cost 1 Coin less in a city with a Forge                                            | late, with Mines: a Grunt 2, a Tripod 8                                                      | fair                                          |
| Disintegrator  | 3    | 9 / 12 / 16 | (Explosives) Blast Mountain; Breach; **heat rays ignore Walls and Field Defense**               | to take walled centers with Tripods and Ray Gunners                                          | good                                          |

No node is dead for a Martian player. The branches: Settlement ends in
Planning and holds the Brain; Wilds holds the Ray Gunner, the Tripod, and
Heat Sinks; Mobility the Saucer and the Mothership; Industry the
Projector, its Force Field, and the Disintegrator. Every branch has a
unit and a reason to go to its end. The seven units cost 97 Coins of
research in the AI's order (Gathering free, then Drill 5, Hunting 6,
Marksmanship 9, Forestry 10, Sawmilling 13, Administration 12, Scouting
11, Raiding 14, Chivalry 17), as the Undead roster does; the Tripod is
there after 43. Force Fields and Heat Sinks are 8 to 16 Coins each on top.

### 4.2 The Martian economy

The Martians have the shared economy with no rule of their own in it:
they harvest, build, trade, and level cities exactly as the Humans do.
Their machines need no Port to cross water, which matters on a map with
water and not on Dry Land. Their units are frail and recover like any
unit, so the faction spends on replacements rather than on healing. Mind
Control is the one way to a unit without Coins or a slot, one per Brain.
Nothing here was changed, and no Coin sink was added.

The opening is the faction's weak time, as it is for the Undead: until
Drill and Marksmanship a Martian army is Grunts, which lose to the same
Coins of Fighters. The Scouts Saucer helps a player's opening (it carries
a Grunt to a far village in one turn and sees two tiles); the AI's
opening is in [section 8](#8-the-normal-ai).

### 4.3 How each change of the earlier passes lands for the Martians

| Change of the Human, Goblin, or Undead pass                 | For the Martians                                                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research price: tier base plus 1 per technology owned       | The same formula. Every Martian unit is ten technologies and 97 Coins; the Tripod is the sixth technology.                                                                              |
| Forest cover needs Forestry                                 | Applies to the four Martian units on foot, and the Martians pass Forestry on the way to the Tripod. A Saucer, a Tripod, a Mothership, and a Colossus never have cover.                  |
| Blast Mountain is an explosion; Breach                      | Applies (the Disintegrator keeps both). Breach matters to a Projector or a Mothership beside a walled center; the rays use the Disintegrator itself.                                    |
| Commerce: land trade between linked cities                  | Applies as for the Humans (+1 Coin a linked city).                                                                                                                                      |
| Commerce: Markets hire                                      | Applies (a Grunt 5, the 4-Coin units 6, a Brain 8, a Mothership 12, a Tripod 14).                                                                                                       |
| The reward ladder: Barracks, the 6-Coin Treasury, one giant | Applies: the Colossus once, in the first capital. A Martian Militia is one Grunt.                                                                                                       |
| Level 2: Scouts (the survey and a free fast unit)           | **Now for the Martians too** (this pass): a free Saucer, without Scouting.                                                                                                              |
| The Raider is not stopped by zones of control               | Human only. The Saucer flies and was never stopped.                                                                                                                                     |
| Pillage pays 3; a Raider keeps its Move                     | The 3 Coins apply to the Martian units that do not fly. No Martian unit has Escape.                                                                                                     |
| Fieldcraft: Forest march                                    | Applies to the units on foot. **Fieldcraft is Heat Sinks for the Martians** (this pass), because walkers and flyers never needed the march.                                             |
| A Field Defense is +2                                       | The Martians build none (Fortification is Force Fields). Against one: the Disintegrator, or a Tripod's attack, which destroys it.                                                       |
| Land Grant 1 Coin a tile                                    | Applies.                                                                                                                                                                                |
| The Guard is open to ranged attacks                         | In force against every Martian shot: a Grunt deals a Guard 6 and a Ray Gunner 10. The Shield Projector has no such rule; its Shield 3 is its difference.                                |
| The Swordsman at Engineering                                | Human only, and the unit Martians must not let reach them: it kills a Grunt, a Ray Gunner, a Saucer, or a Brain in one attack. Five Grunts that step back and shoot kill three for two. |
| Ranged units never advance                                  | Applies to the Grunt, the Ray Gunner, the Tripod, and the Colossus: a firing line keeps its tiles.                                                                                      |
| The Goblin Orc Brute is Blast-proof; bombs get no Gang Up   | Goblin unit rules. Against Martians: a bomb's splash is small hits, which Shields eat (1 on a Grunt, 0 in a Force Field); a rocket is one big hit, which they do not.                   |
| Bones; the Zombie's bite; Plague with Pestilence            | A Grunt's shot deals a Skeleton 4, not 5, so Skeletons are the Undead answer to Grunts. A bite and a Plague go through a Shield. A Banshee's Wail of 2 is absorbed by any Shield.       |
| A rising fills no unit slot                                 | Unchanged for Martians; a mind-controlled unit fills none either.                                                                                                                       |
| The Normal AI plays an army                                 | **A Martian seat plays it now** (this pass), with its own research order, shares, and unit rules ([section 8](#8-the-normal-ai)).                                                       |

## 5. What makes each unit different

By mechanic, against the unit of the same role in the Human roster.

| Unit             | Human unit | What it does that the Human unit does not                                                              | What it lacks                                       | A reskin? |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------- |
| Grunt            | Fighter    | shoots from two tiles, also after a Move; a Shield that comes back every turn                          | 4 HP; Field Defense; the advance                    | no        |
| Saucer           | Raider     | flies; Beam Down; Tractor Beam                                                                         | capture; Escape; Pillage                            | no        |
| Ray Gunner       | Marksman   | a heat ray: 3 Attack standing still, half after a Move; with Heat Sinks no Cooling                     | 4 HP; a full shot after a Move                      | no        |
| Shield Projector | Guard      | a Shield of 3; with Force Fields, Shield 4 for every own unit beside it; no weakness to ranged attacks | 5 HP; half a point of Defense; Field Defense        | no        |
| Brain            | Captain    | Mind Control                                                                                           | Tend Wounded: a Martian army has no healer          | no        |
| Tripod           | Catapult   | moves and fires in one turn; walks over Forest and Mountain; Pierce; kills a 12-HP unit                | range 3; a second full shot the next turn           | no        |
| Mothership       | Knight     | flies; the free Heavy Tractor Beam; Beam Down                                                          | Overrun; the charge (Attack 2.5 against 4); capture | no        |
| Colossus         | Juggernaut | a heat ray at range 1 or 2; walks over anything                                                        | the advance; 8 HP                                   | no        |

Across the faction: Shields (damage that does not last), rays that run
hot, machines without cover or Walls, and two abilities that move other
units. No other faction has any of the four.

## 6. Why each change, and what it must not do

### 6.1 The pulled unit explores

The rule as asked. `applyTractorBeam` revealed the pulled unit's sight for
the **puller's** owner and only when the unit was the puller's own; a
pulled enemy unit's owner saw nothing new, so a Marksman pulled a tile
forward stood beside tiles its owner had never seen. Now the reveal is the
pulled unit's ordinary sight (its role's radius with its owner's
technologies, 2 for a Marksman with Fieldcraft) from the tile it lands on,
for **its owner**, in the `TILES_REVEALED` event of the pull. A puller
that pulls its own unit reveals for itself as before. A neutral unit's
pull reveals for nobody.

**Other forced movement was checked** and already did this: every push
(the giants' Push, Knockback, a bounce) reveals for the pushed unit's
owner; a unit displaced by a reward unit, a unit set down by Beam Down, a
released mind-controlled unit, and every rising reveal from where they
stand. The Tractor Beam was the only one that did not.

### 6.2 Scouts

As for the three passes before: the reward that was never picked becomes
one that is. A Saucer cannot take a village itself, so this Scouts is the
weakest of the four for expansion and the best for sight and for moving a
Grunt.

### 6.3 The Force Field needs Force Fields

Fork 1 has the reason. **It must not** make the Projector a dead unit
before the technology: it is still the garrison (12 HP, Shield 3,
Defense 2.5 on a walled center), the one unit a Knight needs two attacks
for, and the first technology of the AI's order for those two reasons.
**It must not** make Force Fields a tax: a player who never buys it has
Shield 2 everywhere, which is what the faction's numbers were tuned at
before the Projector existed in the line. The Projector's unit card, the
technology, the Help page, and the text harness all say "with Force
Fields".

### 6.4 Heat Sinks

Fieldcraft was the weak node of every tree, and for the Martians weaker
still: three of the eight units ignore Forest. The Ray Gunner was the
unit with the least reason to be bought. One rule fixes both. **It must
not** reach the Tripod or the Colossus (fork 2), and it does not change
the half power after a Move: a Ray Gunner with Heat Sinks is a unit that
holds a position, which a Saucer can set down where it is needed (a unit
set down by Beam Down counts as moved that turn and fires at full power
from the next).

### 6.5 The Knight against a Martian line

A Knight's attack deals a Grunt 13 and a Ray Gunner, a Brain, a Saucer, or
a Tripod 14, against 10 to 14 HP and Shield together; a Force Field does
not save any of them. Overrun then rides on while a unit stands beside
the Knight. The Knight costs 9 Coins and three technologies, and a Human
player who reaches a Martian line with one before the Martians have a
Projector in it wins that fight outright. Nothing in the rules was
changed for it, for three reasons: the Knight is a ruling; the same
Knight kills four Fighters in a row for the Humans' other opponents too,
and their answer is also "a unit it cannot kill in the line"; and the
Martians have more answers than anyone (the pull, the rays that kill it
from two tiles before it moves, Mind Control of a Knight left at 3 HP).
What changed is the AI: Martian units no longer stand side by side when a
unit that chains is in sight, and a Projector stands in the line
([section 8](#8-the-normal-ai)). If hand play shows the Knight still
decides Human against Martian, the next step is a rule on the Martian
side (a Shield that is not pierced by the excess of a hit, for one), and
it is a fork for the user, not a tuning step. **Hand play showed it, and
the user's review chose the rule: the Force Field holds
([section 13.1](#131-the-force-field-holds)).**

## 7. What was not changed, and why

- **Every number of the roster.** The Grunt lost HP twice in earlier
  rounds; with the early Force Field gone it is weaker again, and no
  evidence asks for more.
- **The Tripod's Pierce** (fork 4), **the Mothership** (fork 7), **the
  Brain** (Mind Control was rebuilt in `7r33` and works as designed in
  both diagnostic matches).
- **The Saucer's Tractor Beam**: one tile, as its primary action. It is
  the combination the user asked factions to have, and it is countered by
  a second unit beside the target or by shooting the Saucer (8 HP).
- **The Disintegrator.** It is the Martian siege, at the end of the
  Industry branch, and competes with the Mothership's pull for the same
  job from another branch.

## 8. The Normal AI

Before this pass a Martian seat played the pre-army policy in every
match, and a Human, Goblin, or Undead seat left the army rules when a
Martian seat was at the table. Now `src/ai/v7-army.ts` counts `MARTIAN`
among the army factions: in a match whose every seat is Human, Goblin,
Undead, or Martian, every seat plays the army rules. In a match with any
of the other four factions a Martian seat plays as it did.

**Research.** The Shield Projector first (Drill, one technology: the
garrison, and the end of a Knight's ride), then one economy technology
its land can use (as the Undead seat does), the Ray Gunner, the Tripod,
the Brain, the Saucer, the Mothership. Force Fields is researched before
the Tripod once the seat fields a Projector, and Heat Sinks before the
Mothership once it fields two Ray Gunners. The older Martian research
rule is not used by an army seat.

**The army.** Two fifths Grunts, 15% Projectors, 15% Ray Gunners, a fifth
Tripods, a tenth Motherships; against two or more hostile ranged, siege,
or support units a quarter Tripods. One Saucer for six units, two at
most. The seat keeps the Coins for a Tripod or a Mothership it is short
of when one more turn's income pays for it. On a threatened or frontier
center a Grunt comes before a Projector beyond its share, and a Tripod,
a Brain, and a Mothership come last.

**The opening** is the Undead seat's: villages first (no fight at the
enemy's village in the first ten rounds), one economy technology before
the second unit technology, and the best unit on a threatened center
(never a machine, which has no Walls).

**The units.**

- A Grunt or a Tripod with a hand-to-hand unit beside it steps back to
  two tiles before it shoots, in a committed assault too; a Cooling Ray
  Gunner steps out of reach.
- A line commits like any army seat's, and a Grunt's Move in an assault
  ends two tiles from its target, not beside it.
- A Shield Projector makes no attack that takes back more than it deals
  (it dealt Guards 3 and took 8, round after round); it takes a kill. Its
  Move is worth more beside the shielded units of its line, with or
  without Force Fields (it is what a chain stops on).
- A Martian unit a Knight kills through its Shield counts as a weak link
  of a kill chain at any HP, so the army rules that keep such units from
  standing side by side in a chaining unit's reach apply to Grunts, Ray
  Gunners, Brains, Saucers, and Tripods.
- A Saucer is a carrier and a puller, not a fighter: it does not walk up
  with the line, flies in only for its own kill, flies out of the reach
  of visible enemies before it recovers, and is not trained past its
  share. Its Beam Down, its pull into a kill, and its extraction are the
  older rules, kept.
- A Projector's cover is valued only once the seat owns Force Fields.
- Mind Control, the Heavy Tractor Beam before the Mothership moves, the
  refusal of a Pierce that kills an own unit, and the rule against ending
  a machine's Move on water are the older rules, kept.

Every rule above is a Martian seat's. What a Human, Goblin, or Undead
seat does against Martians (focus fire through a Shield, the second unit
by a center in a Mothership's reach, units at 6 HP or less out of a
Brain's reach) is as it was, now together with the army rules.

### 8.1 Two diagnostic matches

Each was run twice: once to read, and once more after the AI rules the
first reading asked for, because a rule had changed. Four runs in all.
They are evidence of what the AI does, not of balance.

**A generated game** (Humans first, Martians second, Dry Land, 14 by 14,
30 rounds, both seats the Normal AI).

| What                       | First run (army rules, research Saucer second)                          | Second run (the rules above)                                                                   |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Outcome at round 30        | the Martians eliminated in round 30                                     | alive with three cities at levels 4, 3, 3                                                      |
| Technologies               | 6, none toward a Tripod                                                 | 10: Drill in round 3, Hunting 5, Forestry 12, Engineering 13, Marksmanship 16, Force Fields 20 |
| Captures                   | fought at the Human villages from round 7                               | villages in rounds 5, 6, and 9, a fourth city in round 19                                      |
| Units                      | Projectors in thirteen of eighteen rounds; 3 Saucers lost for two pulls | Grunts first; 70 Grunt shots from two tiles and 4 from the next tile                           |
| Kills and losses           | —                                                                       | 34 kills for 25 units lost                                                                     |
| Saucer, Mothership, Tripod | three Saucers                                                           | two Tripods after Sawmilling in round 22; no Saucer (Scouting came in round 29); no Mothership |
| The other seat             | —                                                                       | the Humans held nine cities at round 30: the Martian seat survives and does not keep up        |

**The lab** (`LAB_MARTIAN_MID`, both seats the Normal AI, 14 rounds).

| What                 | First run                               | Second run (units a Knight kills do not stand side by side)   |
| -------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Units trained        | every Martian unit                      | every Martian unit; Force Fields in round 9, Heat Sinks in 11 |
| Tractor Beam         | 9 pulls, 5 of them followed by the kill | 7 pulls, 3 followed by the kill                               |
| Beam Down            | 15                                      | 14                                                            |
| Mind Control         | 1 (a Knight)                            | 1 (a Swordsman)                                               |
| Rays                 | 17 at full power, 20 at half            | 20 at full power, 21 at half                                  |
| Knights that rode on | 27 times                                | 19 times                                                      |
| Kills and losses     | 31 kills for 44 units lost              | 32 kills for 36 units lost                                    |
| Cities               | held all five                           | lost one of five                                              |

What the readings say about the AI: it now researches toward its units,
expands, shoots from two tiles, and uses every ability at least once. It
still loses units to Knights faster than it kills Knights, sets Tripods
down by Beam Down in front of its line (a Tripod set down fires at half
power and stands where a Swordsman reaches it), and in a generated game
reaches its Saucer and its Tripod late. Those are in
[section 12](#12-what-is-still-open).

## 9. The lab

`LAB_MARTIAN_MID` (hidden, 16 by 16, `lab --session S.json LAB_MARTIAN_MID`
in the text harness): the hand player is the Martians in an even middle
game against the Human AI.

- **Each side** has five cities: a level-4 capital, two of level 3, and
  two of level 2 at the front, with 15 Coins a turn.
- **The Martians** hold 15 units worth 70 Coins: 5 Grunts, 2 Shield
  Projectors, 2 Saucers, 2 Ray Gunners, a Brain, 2 Tripods, and a
  Mothership. They have 20 Coins, which is 35 in hand on the first turn,
  and three free unit slots (the capital is full; a Mothership fills
  two). They own ten technologies: every unit can be trained. They do
  **not** own Force Fields, Heat Sinks, Engineering, or Farming, so the
  first research choice is the pass's own question.
- **The Humans** hold 17 units worth 77 Coins, as in the other two
  hand-player labs: 3 Swordsmen, 3 Marksmen, 2 Catapults, 2 Knights, 2
  Guards, and 5 Fighters, a walled capital and a walled level-3 city, and
  30 Coins on their first turn, which buys more.
- **The land** is not bare: every city has Forest and Fertile Ground in
  its land, the three larger ones have Ore, there is Game, and each side
  has four Lumber Camps.

## 10. Text

- The Shield Projector's card and its line in the text harness say
  "Force Field needs Force Fields: then your units that start a turn next
  to it have Shield 4"; its technology line reads "Train Shield Projector
  (Force Field with Force Fields)".
- Force Fields reads "Shield Projectors raise the Shields of units next
  to them to 4; Shields also recharge at the end of your turn".
- Heat Sinks reads as the technology's name in the tree, and the Ray
  Gunner's card says "with Heat Sinks it does not overheat (no Cooling)"
  until its owner has it. The attack preview shows "Leaves it Cooling next
  turn" only when it will.
- The Help page has one sentence each for the Force Field ("with Force
  Fields, …") and Heat Sinks.
- The Heat Sinks node uses the Fieldcraft icon; a Martian icon for it is
  listed for the art queue in
  [the Martian art fragment](../art/factions/MARTIAN.md).

## 11. Tests

`tests/unit/ruleset-v7-martian-pass.test.ts` (41 tests): the identity; the
pulled unit's reveal (for its owner, with its own radius, for the puller
when it pulls its own unit, and the same as a Push); the Scouts Saucer;
the Force Field with and without its technology (the recharge, the public
stats, a Fighter's hit of 3 or 1, the text); Heat Sinks (full power turn
after turn, the half power after a Move, not the Tripod's or the
Colossus's, the text); the numbers this document reasons from; the army
rules of a Martian seat (the order, Force Fields and Heat Sinks, the
economy technology, the shares, the Tripod's Coins, the garrison); the
unit rules of [section 8](#8-the-normal-ai); and the lab.

Existing tests changed, each with its reason in a comment: the Martian AI
tests that fixed the older policy now run it against a Dinosaur seat
(where it still applies) or assert the army rule that replaced it; the ray
tests that used an all-technology fixture leave Fieldcraft out; the
Martian technology and text tests name Heat Sinks and the gated Force
Field; the Scouts tables of the Goblin and Undead passes have the Saucer;
the lab lists and the mission pins have `LAB_MARTIAN_MID`.

## 12. What is still open

(As first written, this section asked for three hand-played games and
named the Knight; both are answered in
[section 13](#13-the-correction-after-three-hand-played-games).)

1. **Force Fields after the correction.** It answers small hits and now
   one big hit; whether a fielded line still has something to fear from a
   Human player needs a hand-played game
   ([section 13.1](#131-the-force-field-holds)).
2. **The Human seat of the Normal AI** still fielded no Knight and no
   Catapult in 22 rounds one on one
   ([section 13.8](#138-two-diagnostic-matches)).
3. **The ideas on record**: the Grunt's Attack after a Move, the Heavy
   Tractor Beam, Beam Down's reach
   ([section 13.7](#137-left-as-it-was-with-the-evidence)).
4. **The Martian AI beams Tripods to the front**, where they fire at half
   power and are reached.
5. **A Martian icon for Heat Sinks** (art).
6. **The other four factions** (Dinosaur, Ice Folk, Dwarf, Candy) still
   have the plain Survey, and a match with one of them still plays the
   older Martian policy on a Martian seat.

## 13. The correction after three hand-played games

Three sessions were played by hand on the first version: the Martians in
`LAB_MARTIAN_MID` (twelve rounds, three army compositions), the Martians
from turn 1 against the Human AI (a win in round 27), and the Humans
against the Martian AI (a win in round 17). The roster worked in a
player's hands: in the even lab position the mix killed 30 units for 16
lost and was clearly the best of the three compositions (Grunts alone and
dear units alone were both worse), Force Fields was "the best 10 Coins in
the tree" and "fine behind a technology", Heat Sinks made the Ray Gunner a
unit worth buying, and the Tripod earned its 9 Coins. Three things did
not work, and both AIs showed the same weaknesses as in earlier passes.

| #   | Change           | Before (first version)                                                                                      | Now                                                                                                                                                                                  |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7   | Force Field      | Shield 4 for the units beside a Projector; nothing against one big hit                                      | **the field holds**: a unit at full HP whose Shield a field has raised to 4, still whole, is not killed by one attack: it is left at 1 HP                                            |
| 8   | Psychic Command  | every turn, every unit beside the Brain                                                                     | **every second turn**: the command leaves the Brain Cooling for its next turn                                                                                                        |
| 9   | Mind Control     | a controlled unit could not be let go while its Brain lived                                                 | **Release**: the controller returns it to its owner where it stands, for no Coins                                                                                                    |
| 10  | Martian AI       | Force Fields before the Tripod; a unit a turn before its economy technology; any unit as a garrison         | Force Fields right after the first Projector; the Coins kept for the economy technology; a Projector as the garrison; out of a Knight's reach; Grunts beamed to free villages        |
| 11  | Human AI         | no economy technology before round 12; nothing built while pressed; Guards against shooters; lone Knights   | an economy technology before the second unit technology; villages first; growth that leaves the Coins for a unit; no Guard against an enemy that shoots; no Knight ahead of the line |
| 12  | Text and harness | Beam Down's reach unsaid; SURVEY and SCOUTS for one reward; `Kn` for a Mothership; estimates without Shield | said on the unit; one name; Martian map codes; the estimate takes the Shield and names a Charge as a possibility; where the Colossus comes from                                      |

The identity stays `pulp-wars-poc-7r52` (it had not been published). No
number of the roster changed. No command, event, state, or view shape
changed: the hold has no state of its own, the Brain's cooldown is an
entry of the existing `cooling` list, and Release is the existing
`DISBAND` command on a controlled unit.

### 13.1 The Force Field holds

**The evidence.** The Human player won in four turns of Knights (11 of
13 kills): a Knight killed a Grunt with its Shield up in the open and on
a walled center, and "a Projector in the line" did not end a ride,
because the Knight attacks the unit beside the Projector. After Chivalry
that player bought only Knights. The lab player: "Force Fields need units
next to a Projector, so next to each other; the Knight answer is units
not next to each other. The two pull against each other", and a field
"does nothing against Swordsman, Knight or Catapult hits". This was fork
5 of [section 1.1](#11-decisions-that-are-forks-for-the-user-to-overrule),
named there as the largest risk.

**The rule.** A unit at full HP whose Shield a Force Field has raised to 4
(above its own maximum) and that is still whole is not killed by one
attack: the attack's hit leaves it at 1 HP (`forceFieldHoldsV7`,
`absorbHitV7`). The hit spends the Shield, so the field holds once and
again after the next recharge; nothing is stored. A wounded unit, a unit
whose Shield has taken a point, and a Mothership (its Shield of 4 is its
own) are not held. A Zombie's bite, a Plague, Chill, a Push, and an Ice
Folk Shatter are as they were. Splash, Pierce, and blasts are not attacks
on the unit and are not capped; none of them reaches 12.

**The numbers** (the matrix of [section 2.0](#20-numbers-from-the-script),
"in a Force Field" column: every attacker that killed a fielded 8-HP unit
in one attack now needs two):

| Attack on a Grunt at full HP          | Shield 2 | In a field, first version | In a field, now                             |
| ------------------------------------- | -------- | ------------------------- | ------------------------------------------- |
| Knight (13)                           | kills    | kills                     | 7 HP and the Shield: 1 HP left              |
| Swordsman (11)                        | kills    | 7 HP: 1 HP left           | the same (the rule is not needed)           |
| Catapult (9)                          | 7 HP     | 5 HP                      | the same                                    |
| Tripod at full power                  | kills    | kills                     | 1 HP left                                   |
| Rocket Cart with a helper and WAAAGH! | kills    | kills                     | 1 HP left (a Goblin's Kaboom then kills it) |

**The scenarios** (played by the reducer, section 2.0):

- A Knight rides at four fielded Grunts with the Projector in the middle
  of the row: its first attack deals 7, leaves the Grunt at 1 HP, takes 2
  back, and its turn is over. The ride does not start.
- A Catapult shoots the first Grunt (5 HP through the field), then the
  Knight kills it and rides on: the next Grunt's field holds. One kill.
- Two Catapults kill the Projector first. The Shields of 4 stay until
  they recharge, so nothing more dies that turn; at the Martians' next
  recharge they are 2 again, and the turn after the Knight kills every
  Grunt it reaches.
- Two Knights at one fielded Grunt: the first leaves it at 1 HP, the
  second kills it and rides into the next field, which holds.

So the Knight is unchanged and still decides against a line without a
field or with a broken one. The player must break the field first: shoot
the line (any hit dents the Shield and the HP), kill or pull the
Projector a turn ahead, or spend two attacks a unit. **Standing together
beside a Projector is now the answer to the Knight**, which removes the
conflict the lab player named.

**What to watch.** Force Fields was already the best buy of the tree
against small hits; it is now also the answer to big ones, for 7 to 10
Coins and a 4-Coin unit. If hand play finds a fielded line with nothing
to fear, the first step is the condition (full HP **and** not having
attacked this turn), not the Shield.

**Where a player sees it.** The attack preview says "Force Field holds: 1
HP left" (the browser's preview notes and the harness's attack line); the
Projector's card, the Force Fields technology, the Shield line of a
fielded unit, and the Help page say "at full HP one attack cannot kill
it".

### 13.2 Psychic Command every second turn

**The evidence.** "+3 to +4 damage on every unit beside a 5-Coin Brain,
every turn, with no cooldown"; two 3-Coin Grunts under it killed a full
Swordsman on a capital; "Grunt + Brain comes close" to a best army.

| One shot from two tiles at | Grunt | Grunt with Psychic Command | Ray Gunner, full power | Tripod, full power |
| -------------------------- | ----- | -------------------------- | ---------------------- | ------------------ |
| Swordsman (15 HP)          | 4     | 7                          | 7                      | 11                 |
| Guard (17 HP)              | 6     | 10                         | 10                     | 14                 |
| Knight (13 HP)             | 6     | 10                         | 10                     | 13, kills          |

A commanded Grunt is a Ray Gunner at full power that costs a Coin less,
may walk, and never overheats; with a Brain beside six Grunts every turn
the Ray Gunner and Heat Sinks had no reason.

**The rule.** A Brain's Psychic Command leaves it Cooling until the end
of its owner's next turn, and a Cooling Brain cannot command (role
mechanic `rallyCools`, the Martian `CAPTAIN` only; the entry is one of
the `cooling` list, as for a full-power ray). Mind Control, its Move, and
its attack are not held. A Human Captain rallies every turn as before.

**Why the cooldown and not "three units at most".** Three units would
have needed a choice of which three with no target in the command, and
three commanded Grunts every turn is still the army the tester described.
Every second turn keeps the Brain's big turn (the commanded volley that
kills a Swordsman or leaves a Knight for Mind Control), halves its
average, and leaves the every-turn shot to the Ray Gunner with Heat Sinks
and the kill to the Tripod. The Brain is still worth 5 Coins for one such
turn in two and for Mind Control.

### 13.3 Release

**The finding.** The rules did not allow it. A controlled unit was
released only when its Brain died, was disbanded, or changed owner
(`releaseControlledV7`); `DISBAND` on the unit itself was refused
(`DISBAND_NOT_LEGAL`, `MIND_CONTROLLED`), and neither the harness nor the
browser offered anything. A tester's mind-controlled 3-HP Swordsman
"never fought, could not be released, and blocked the Brain for six
rounds".

**The rule.** `DISBAND` on a mind-controlled unit is **Release**: the
unit returns to its owner where it stands, exhausted, as when its Brain
is lost; no Coins are paid; if its owner is out of the game it is
removed. It needs no technology and no unused action. The Brain may take
another unit once its Mind Control cooldown is over. The browser shows
the button as "Release" on the controlled unit's card; the harness lists
`uN.disband` with "RELEASE the mind-controlled unit". The Normal AI never
releases.

### 13.4 The Martian seat of the Normal AI

Evidence: the Human-against-Martian-AI game and the diagnostic matches.
Each rule has a constructed test ([section 13.9](#139-tests)).

- **Economy and Force Fields.** Its income stood at 5 Coins from round 5
  to round 9, it owned five technologies in sixteen rounds, and it never
  researched Force Fields although it fielded Projectors from round 6.
  The replay shows why: with 4 Coins and 5 a turn it trained a 3-Coin
  unit every turn, so the 9-Coin economy technology came in round 8; and
  Force Fields stood behind the Ray Gunner's two technologies. Now the
  Coins are kept for the economy technology (`armyResearchFloorV7`, as
  for a technology that is due at war), and Force Fields is researched as
  soon as a Projector is fielded, before the Ray Gunner.
- **Villages.** A hand player took five cities by round 8 by beaming
  Grunts from the capital; the seat had two cities until round 10. Now a
  Saucer flies to a free village no own capturer is near, and beams a
  Grunt from on or beside an own center to a tile next to it
  (`ARMY_VILLAGE_FERRY_PRIORITY_V7`, `ARMY_VILLAGE_DELIVERY_PRIORITY_V7`).
- **The garrison.** A Ray Gunner was trained onto a walled center beside
  open ground two rounds running. On a contested center nothing but a
  Shield Projector is trained until one stands on or beside it, and with
  one there no Ray Gunner, Brain, or Tripod while a Grunt can be
  (`armyHelplessGarrisonV7`).
- **Knights.** A unit that a visible unit with Overrun kills in one
  attack steps out of that unit's reach before it shoots, and makes no
  Move into it except for a kill or onto a village
  (`armyKnightShyV7`). A full-HP unit whose Move ends beside an own
  Projector, with Force Fields, may enter: the field holds. The pull of
  a Knight into two unmoved rays or a Tripod is the existing kill set-up;
  it has a test with a Knight now.
- **Its best units stay.** A Beam Down that takes a unit out of lethal
  reach sets it down within three tiles, with its own units, or by an own
  center, not wherever the carrier stands (its one promoted Grunt sat out
  the decisive turns in a corner).
- A unit a Force Field holds is no weak link of a kill chain
  (`armyWeakLinkV7`), so a fielded line is not spread out.

### 13.5 The Human seat of the Normal AI

In four hand-played games across three faction passes the Human AI one
on one stalled. The replays of two of them give the causes.

| What was seen                                                                | Cause                                                                                                                                                                                                                                                                                                                    | Now                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Income of 9 Coins from round 6 to round 20; four cities at level 2           | Its order was unit technologies only; Gathering and Hunting were used up by round 6 and Farming came in round 12. And a seat with an enemy within three tiles of a center or an enemy army in the field built nothing while a city could train: a firing line two tiles away for fifteen rounds meant no building at all | One economy technology its land can use before its second unit technology, and villages first (the Undead seat's rule). A pressed seat still builds what adds population where no enemy is at the gates, when the Coins left pay for any unit on offer |
| No research in twelve rounds of the lab                                      | Every unit was unlocked; the next technology (Administration) was not due by the research clock (14 city levels against nine technologies) and ranked below training; at war units came first; and nothing was built (above)                                                                                             | No rule of its own: with growth bought at war the city levels rise and the clock comes due                                                                                                                                                             |
| Twelve Guards against Martians; every one died without touching a unit       | The defender's share of the army and its 200 points on a threatened center, whatever the enemy shoots with; the Guard has Defense 1 against shots                                                                                                                                                                        | With three or more visible enemy units, most of them shooting from two tiles, no unit that is open to ranged attacks is trained while another can be                                                                                                   |
| Thirteen Knights fed in one or two at a time; three of sixteen ever attacked | A Move without an attack is no engagement, so the rules that hold a group together did not hold a Knight that walked up; with Move 3 it arrived alone. Two more sat on a village in the enemy's reach, which is a capture and had its own rule                                                                           | A unit with Overrun makes no Move without an attack that ends alone in the enemy's reach outside its own land, and takes a village only where nothing can hit it                                                                                       |
| A city's center stood empty for a turn and nobody walked in                  | No unit could reach it in one Move, and nothing valued the step toward it                                                                                                                                                                                                                                                | A capturer within three tiles walks toward a hostile center nobody stands on, where the enemy does not kill it (a Human and a Martian seat; behind the storm and battery rules)                                                                        |

The economy technology and the Guard rule are the Human seat's. Growth
at war, the Coins kept for the economy technology, and the walk toward
an empty center are a Human and a Martian seat's: an Undead and a Goblin
seat keep the policy their own passes were played with. The Knight rule
is every army seat's (only the Human Knight has Overrun among them).

### 13.6 Text and the harness

- **Beam Down** is described on the Saucer and the Mothership: "lifted
  from on or beside ANY of your city centers or from up to 2 tiles away"
  (the harness's unit and `tech` lines; the browser's tooltip and Help
  page say "from on or next to any of your city centers").
- **Scouts.** The free Saucer fills a unit slot of the city, like every
  reward unit and the Raider, Wolf Rider, and Ghoul of the other three
  factions, and may stand above the limit. It was left so: a unit that
  costs no slot is the Undead's own rule. The reward text now says it
  ("it fills a unit slot of this city"; "uses a unit slot" in the
  browser).
- **One name.** The harness printed `SURVEY` in the queue event and the
  city line and `SCOUTS` in the id; both are `SCOUTS` now.
- **Map codes.** Martian units have their own: Gr, Sa, RG, SP, Br, Tr,
  Mo, Co, with a legend line. The bracket after a unit's name is still
  its mechanical role (`[KNIGHT]` for a Mothership), which is what the
  command ids are built from.
- **The Colossus.** The first capital's line says: "a free Colossus is
  offered once, as a reward of this city (your first capital) at level 5
  or higher; no other city offers it". (The tester reached level 5 in
  another city.)
- **The enemy-attack estimate** under `options --unit` takes the hit from
  the Shield the unit will have (and a whole field holds), and names a
  Charge as what it is: "8 with Charge, if its owner has Raiding", since
  the enemy's research is private.

### 13.7 Left as it was, with the evidence

- **The Grunt** (3 Coins, Attack 2 at range 2 after a Move). One tester:
  "the unit I would mass if slots allowed"; idea on record: Attack 1.5
  after a Move, or 4 Coins.
- **The Heavy Tractor Beam.** "Closest thing to no counter": eight pulls,
  eight kills or captures, two of them Knights off city centers; idea on
  record: no Move after the free pull, or reach 2.
- **Beam Down's reach.** "One free Saucer in turn 1 erases Move 1 for the
  whole game"; idea on record: pick up only from cities within some
  distance of the Saucer.
- **The Tripod, Heat Sinks, Scouts giving a Saucer, the gating of Force
  Fields, the Human Guard, the Knight and Overrun.**
- Also on record, not acted on: a Martian city cannot train while its
  Projector stands on the center; a Projector that kills is moved off its
  center by the forced advance; a Mothership cannot move after a Beam
  Down; the Colossus put a capital at 8 of 7 slots; the Ray Gunner before
  Heat Sinks is bought once.

**Two rule questions the testers raised.**

- _Promote does not use the unit's action_ (a Knight promoted from 7 of
  13 HP to 18 of 18 and attacked the same turn). That is the rule:
  Promotion is "an explicit command, independent of the activation", free
  once at three kills, with a full heal
  ([current rules, section 11](RULESET_7_CURRENT.md#11-unit-roster)). It
  is the same for every faction.
- _A Knight's two-tile Move was routed beside an unexplored tile and
  stopped by a hidden unit's zone of control, though a straight path
  existed._ The stop is the rule: a zone of control first seen during a
  Move interrupts it, and the Move is still accepted. The path is not a
  rule: a `MOVE` carries its path, the query offers each path to a tile,
  and the harness's short id (`u53.m.3,3`) is the first of them; the
  other is listed with `~2`. The engine does not prefer explored tiles.

### 13.8 Two diagnostic matches

Both seats the Normal AI. Each match was run twice: once when the rules
of this section were written, and once more on the final tree, because
three of the AI rules were narrowed afterwards (growth at war and the
walk toward an empty center to the Human and the Martian seat, the Knight
rule to routine Moves) when the whole test suite showed what they did to
the other seats. The numbers are the second run's; the first run's were
the same for the Human seat and, for the Martian seat, the same to round 20. They show what the seats do, not who is stronger.

**The Martian seat** (Humans first, Martians second, Dry Land 14 by 14,
seed 11, the map of the Human-against-Martian-AI game).

| Round | Income | Technologies | Cities | What                                                                      |
| ----- | ------ | ------------ | ------ | ------------------------------------------------------------------------- |
| 5     | 4      | 3            | 2      | first village in round 4; a Grunt beamed toward the next                  |
| 10    | 8      | 4            | 3      | Forestry (round 6), first Projector round 7                               |
| 15    | 14     | 8            | 5      | Farming round 11, **Force Fields round 13**, Marksmanship 14, Scouting 15 |
| 20    | 20     | 11           | 7      | Sawmilling 17, two Tripods round 19, Heat Sinks round 20                  |
| 25    | 28     | 13           | 8      | Roads round 24; the Human seat on its last city                           |

Twenty-eight Beam Downs, seven pulls (five followed by the kill, one of
a unit off a center), 35 Grunt shots from two tiles and 3 from the next
tile, 22 kills for 3 units lost. Its garrisons were Grunts and, from
round 20, a Projector and a Ray Gunner on centers no enemy was near. No
pull on a Knight: the Human seat never reached Chivalry (it held two or
three cities on this map and 3 to 6 Coins a turn).

**The Human seat** (Martians first, Humans second, seed 9, the map of
the Martians-from-turn-1 game).

| Round | Income | City levels | Technologies | The hand-played game on this map (first version) |
| ----- | ------ | ----------- | ------------ | ------------------------------------------------ |
| 5     | 7      | 2, 2, 2     | 2            | 7; 2, 2, 2; 2                                    |
| 10    | 10     | 3, 2, 2, 2  | 5            | 9; 2, 2, 2, 2; 4                                 |
| 15    | 13     | 3, 3, 3, 3  | 6            | 7; 2, 2, 2, 2; 6                                 |
| 20    | 11     | 3, 4, 3     | 7            | 9; 3, 3, 2; 6                                    |

Farming came in round 8 (round 12 before), right after Marksmanship;
four Farms and a Workshop were built while the Martian line stood at its
cities. It trained 4 Guards (12 before), all in rounds 10 to 13 while
most visible Martian units were Saucers and Projectors, and Swordsmen
and Marksmen after that. It still fielded no Knight and no Catapult in
22 rounds, and lost a city by round 20. The Martian seat in the same
match researched Force Fields in round 11, two rounds after its first
Projector.

### 13.9 Tests

`tests/unit/ruleset-v7-martian-pass.test.ts`, 21 more (62 in all): the
hold (the numbers above, what is not held, once a turn, the preview note
and the texts); the Brain's cooldown (the Cooling entry, the refusal, the
turn after, the Human Captain, the table of 13.2); Release (the event,
the owner, no Coins, never the AI's choice); the Martian seat (Force
Fields after the first Projector, the Coins kept for the economy
technology, the Projector garrison, out of a Knight's reach and not into
it, a fielded line stays, the pull of a Knight into a Tripod's shot, the
Grunt beamed to a village and the Saucer's flight there); the Human seat
(the economy technology, no Guard against shooters and one against
Projectors, no Knight ahead of its line or on a village in reach, the
walk toward an empty center, growth at war that leaves the Coins for a
unit). `tests/scripts/play-text-v7.test.ts` asserts the new lines of the
lab's start text and the Martian map codes. The estimate under
`options --unit` has no test of its own.

## 14. Step two

The second pass over the Martians, on `pulp-wars-poc-7r57` (the
[ninth unit](RULESET_7_NINTH_UNIT.md): the Shock Trooper at Armoury; the
[Industry reshuffle](RULESET_7_INDUSTRY_RESHUFFLE.md): the Shield Projector
at Force Fields with its field, the Workshop at the root), bead
`pulp_wars-w49.25`. Step two is "iterate on each faction including playing
games manually to rejig the balance better and improve the AI for each
faction". It is the faction's first hand-played pass since the ninth unit.
**One rule changed: City Walls hold a unit on its own city center against a
Saucer's Tractor Beam; a Mothership's Heavy Tractor Beam still pulls it.
The identity is `pulp-wars-poc-7r58`.** No number of the roster changed.
The Normal AI of a Martian seat changed in ten places
([section 14.5](#145-the-martian-normal-ai)). The bar was the user's: "the
faction is not crazy op or crazy weak and that all the tech branches are
useful and that units are differentiated from other factions by more than
stats".

### 14.1 The games

All in text mode against the Normal AI, on Dry Land.

| Game  | Played as | Against                         | Map         | Route                                                                         | Result                                                                                          |
| ----- | --------- | ------------------------------- | ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `a`   | Human     | Martian (before)                | 14, seed 9  | Mobility: Hunting 1, Scouting 6, Raiding 8                                    | stopped in round 13, the map won: 8 cities, 16 units, income 15 against 4 cities and 4 units    |
| `b`   | Martian   | Undead                          | 14, seed 19 | Hunting 1, Ray Gunners 3, Crafting 7, Force Fields 10, Heat Sinks 13          | stopped in round 16 with the Undead capital taken: 10 cities, 16 units, no unit lost            |
| `c`   | Martian   | Human, Goblin, Undead           | 16, seed 14 | Industry: Gathering 1, Crafting 4; Force Fields was never affordable          | stopped in round 12, lost: 4 cities (two besieged) and 3 units; 8 Grunts and a Saucer lost      |
| `lab` | Martian   | Human                           | the lab     | `LAB_MARTIAN_MID`, two rounds, three Shock Troopers bought and beamed forward | a Trooper and two Grunts killed a Champion in a Forest; the Human AI answered with a Catapult   |
| `a2`  | Human     | Martian (after the first rules) | 14, seed 9  | the same route                                                                | stopped in round 14, behind in the fight: 6 cities and 8 units against 5 cities and 11 units    |
| `b2`  | Martian   | Undead, at `7r58`               | 14, seed 19 | the commands of `b` to round 13, then the siege by hand                       | stopped in round 17: 9 cities, 15 units against 2 and 6; the walled capital held for two rounds |

The numbers after a technology are the rounds it was bought in. "Before"
and "after" are the Martian AI before and after section 14.5; `a2` was
played after its first five rules, and the later ones (the rays, the Shock
Trooper, the order from the third unit on) do not act in the thirteen
rounds it lasted: the final policy plays the recorded turns of `a2` as they
were played.

**The maps.** Of seeds 1 to 20 on Dry Land 14, seeds 9 and 19 have no chest
within three tiles of either capital and at most five Mountains within two
tiles of one (the two traps the Goblin and the Undead pass found). On Dry
Land 16 with four seats, seed 14 has no chest by the player's capital (the
Human and the Goblin seat have one each) and 5, 2, 0, and 2 Mountains.

What each seat held at the start of its turn (Coins, income, cities,
units; lost and killed are totals):

| Round | `a` Human     | `a` Martian AI | `a2` Human   | `a2` Martian AI | `b` Martian   | `b` lost, killed | `c` Martian | `c` lost, killed |
| ----- | ------------- | -------------- | ------------ | --------------- | ------------- | ---------------- | ----------- | ---------------- |
| 3     | 5, 3, 1, 3    | 1 city, 3      | 5, 3, 1, 3   | 1 city, 2       | 4, 3, 1, 3    | 0, 0             | 4, 3, 1, 3  | 0, 0             |
| 6     | 7, 6, 3, 6    | 3, 3           | 7, 6, 3, 6   | 2, 6            | 7, 7, 3, 5    | 0, 0             | 5, 5, 3, 4  | 0, 0             |
| 9     | 12, 11, 6, 8  | 4, 6           | 11, 10, 6, 8 | 4, 7            | 11, 10, 5, 10 | 0, 2             | 10, 7, 4, 5 | 3, 2             |
| 12    | 24, 15, 8, 15 | 4, 5           | 14, 10, 5, 9 | 5, 12           | 19, 12, 7, 13 | 0, 5             | 12, 4, 4, 3 | 9, 10            |
| 15    |               |                |              |                 | 18, 12, 7, 16 | 0, 7             |             |                  |

### 14.2 The questions

**(i) The Shock Trooper: wanted, and not a wall that cannot be broken.**
From the public preview (`scen-shock.ts` in the scratch folder of the
pass; a full attacker on a full Trooper, on open ground):

| Attacker             | Shield 0: deals / takes | Shield 3: deals / takes (of it the shock) | Shield 4, beside a Projector |
| -------------------- | ----------------------- | ----------------------------------------- | ---------------------------- |
| Fighter, Skeleton    | 5 / 5                   | 2 / 8 (3)                                 | 1 / 8                        |
| Champion             | 10 / 3                  | 7 / 6 (3)                                 | 6 / 6                        |
| Knight               | 12, a kill / 0          | 9 / 6 (3)                                 | 8 / 6                        |
| Wight, Ghoul charge  | 8 / 4                   | 5 / 7 (3)                                 | 4 / 7                        |
| Goblin, two helpers  | 10 / 3                  | 7 / 6, the Goblin dies                    | 6 / 6, it dies               |
| Wolf Rider, a helper | 12, a kill / 0          | 9 / 6 (3)                                 | 8 / 6                        |
| Triceratops charging | 12, a kill / 0          | 12, a kill / 3                            | 11 / 6                       |
| Marksman, a bomb     | 5 / 0                   | 2 / 0                                     | 1 / 0                        |
| Catapult, Lich       | 8 / 0                   | 5 / 0                                     | 4 / 0                        |
| Rocket Cart          | 10 / 0                  | 7 / 0                                     | 6 / 0                        |

The shock is paid by the **first** unit that strikes from the next tile:
that hit empties the Shield, so the second striker meets a 12-HP body with
Defense 2 and pays nothing. Two Champions kill a Trooper for 6 damage to
one of them; three Fighters kill one and the first loses 8 of its 12 HP.
With Force Fields the Shield is back at the end of the Martian turn, so the
price is paid once in every enemy turn, never twice. The counters are the
ones the brief named, and each works at once: any shot (a Marksman's, a
bomb's, a Catapult's) takes the Shield off for nothing and then the melee
units go in; a Wail strips 2; a Catapult, a Lich, or a Rocket Cart never
touches it. In the lab the Human AI answered three Troopers in a line with
a Catapult from three tiles and no blow. So "Shock Troopers beside a
Projector" costs a melee army one unit's HP a turn and stops nothing that
shoots first.

**It keeps up.** A Trooper moves one tile, and a Saucer or a Mothership
sets it down beside itself from any city center: the three of the lab
stood in the line, three and four tiles from where they were trained, in
the turn they were bought. It attacks after it is set down (a Champion in
a Forest: 6, and 1 back through the Shield).

**The Normal AI must be kept from fielding nothing else**
([section 14.5](#145-the-martian-normal-ai)): a Trooper is the dearer unit
of the line class, and the seat of the lab trained seven and no Grunt.

**(ii) The Shield Projector and its field on one node: left together.**
Force Fields was the best purchase of `b` (15 Coins in round 10: a Grunt
on the enemy's capital lived through two Skeletons' blows with 2 HP) and
was never affordable in `c` (11, then 13 Coins on an income of 4 to 7,
every Coin going to the Grunt that had just died). So the node is strong
and it is two technologies deep, the first of which (Crafting) gives a
Martian seat nothing on the turn it is bought. Splitting the field off to
a tier-3 node would put the faction's answer to melee later still, which
is the side on which the opening is already weak (iii). Not built, and not
proposed.

**(iii) The opening with Grunts only: strong against one slow enemy, weak
against two that walk up. No number changed.**

- In `b` (one Undead AI seat that took three cities) Grunts and three free
  Saucers took seven cities by round 11 and lost nothing: a Skeleton's blow
  costs a Grunt 3 HP and the Skeleton 3 or 4, a Grunt's shot from two tiles
  costs a Skeleton 4 for nothing, and two Grunts set down by Saucers killed
  a Ghoul in the turn they arrived.
- In `c` three AI seats reached the player's land in rounds 5 to 8. Every
  Grunt that two melee units reached died in that turn (8 HP and a Shield
  of 2: a Fighter's 5 and 5, a Skeleton's 3 and 5, a Goblin with a helper
  7): eight of them and a Saucer by round 11, two of them on the turn they
  were trained onto a center. The Grunts made 10 kills (a Goblin dies to
  one shot) and it was not enough: the Projector was 11 to 13 Coins away
  from round 5 on.
- So the faction is as [section 20](RULESET_7_CURRENT.md#20-martian-faction-rules)
  describes it: "weak when rushed and focus-fired". That is its shape and
  not a fault to tune away; what it wants is that a player sees Force
  Fields as the second purchase when a neighbour is close. The AI was
  taught that (section 14.5).

**Martians against the Undead: one-sided against the AI, and the Undead
have the tools.** `b` was never in doubt. A Wail deals a shielded unit
nothing; a Zombie bites only when its hit costs HP (1 through a field of
4); Skeletons trade 3 for 3 or 4. What works is in the Undead pass's
table: a Lich (5 to 7 through a Shield, from three tiles), a charging
Ghoul or a Wight (7 through a Shield of 2), and numbers of Skeletons with
Bones against shots. The Undead AI seat of `b` fielded none of the first
three in sixteen rounds and attacked nine times. In `b2` it showed the
fourth: a Zombie bit the Grunt on its capital for 1 HP, a Skeleton killed
it, and it rose as the garrison.

**(iv) The Saucer's pull on a garrison: it was a free kill every turn
against a walled capital. Changed** ([section 14.3](#143-city-walls-hold)).

**(v) Mind Control that keeps the unit: no abuse seen, and not met by
hand.** No game of this pass reached a Brain by hand. The AI used it once
in each lab match (a Fighter both times). Not changed.

**(vi) One best unit? No. Every branch?**

| Branch     | Bought                                                                     | Verdict                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wilds      | Hunting, Ray Gunners, Heat Sinks (`b`)                                     | the strongest. Two hunts took every village to level 2 for a free Saucer. With Heat Sinks two Ray Gunners that stand still deal 8 and 10 every turn: a full Zombie off its Walls in one turn                     |
| Industry   | Crafting, Force Fields (`b`), the Disintegrator (`b2`); Armoury in the lab | Force Fields is the faction's second purchase under pressure. The Disintegrator had no buyer while a Saucer emptied walled centers; since `7r58` it is what kills a Zombie behind Walls (8 and 10 where 5 and 5) |
| Mobility   | not bought: every Saucer was free (Scouts at level 2), five in `b` and `c` | Saucers are the faction's best unit for their price, which is nothing. The Mothership had no job a Saucer did not do; since `7r58` it is the pull that works on a walled center                                  |
| Settlement | Gathering as an opener (`c`)                                               | the Brain was not reached by hand. The AI now researches it third: Leadership is one technology behind Gathering                                                                                                 |
| Naval      | Dry Land only                                                              | not tested                                                                                                                                                                                                       |

- **The Grunt does not go obsolete.** It is the unit that takes centers,
  and seven of sixteen units in round 15 of `b`.
- **The Saucer is the unit to watch.** It is never bought and never
  short: a village with two Fruit or two Game is a free Saucer, and a
  Saucer sets a Grunt down three tiles away, where it shoots at full
  Attack in the same turn. That is the reach of the whole faction, and it
  is what the improved AI beat the player's Raiders with in `a2`.
- **Coins.** Short in `c` (never above 12; every Coin a Grunt). Not short
  in `b` (19 to 32 from round 12, every unit slot full, nothing died):
  the attrition economy as ruled, and Shields that recharge mean a winning
  Martian army replaces nothing.

### 14.3 City Walls hold

**The evidence** (`b`, rounds 14 to 16). The Undead capital had City Walls
and a Field Defense: a Zombie on it had Defense 6, a Grunt's shot dealt it
2 and a Ray Gunner's 5. A Saucer flew to two tiles from the center and
pulled the Zombie one tile off it; two Ray Gunners dealt 8 and 10, and it
was dead with no bite. The seat trained another; the same Saucer, which
had not moved, pulled that one too, and it died the same way. A Grunt
walked onto the empty center and took the capital in round 16. Two Zombies
and a capital for no loss and no Coin: the Saucer was a free unit of round 5. The counters the first pass named do not hold against a player: "a
second unit beside the target" blocks one of eight directions, and
"shooting the Saucer" asks a seat with five units to leave its center. In
`a2` the AI did the same to the player (a Raider pulled off the center it
stood on, then killed).

**The rule.** A land-form unit that stands on the center of a city of its
own owner which has City Walls is not a legal target of a Saucer's Tractor
Beam. The Mothership's Heavy Tractor Beam pulls it as before.

- It is a gate, not a nerf: the trick is whole against every center
  without Walls, against a Field Defense, against cover, and against a
  line; and against Walls it belongs to the tier-3 unit that was built for
  it and had no buyer.
- It gives the defender a counter it can choose: Walls are a level-3
  reward (against Militia).
- It gives the Disintegrator its purpose (section 14.2, (vi)).

**Replayed** (`b2`: the commands of `b` to round 13, the same game, then
by hand). Round 14: the pull is not offered; a Ray Gunner and a Grunt deal
the Zombie 5 and 3, it steps off and a Skeleton is trained onto the
center. Round 15: two Ray Gunners kill the Skeleton through Walls, a Field
Defense, and Bones (4 and 6); a Grunt walks up beside the center. Round 16:
a Zombie stands there again; the Disintegrator (27 Coins) and the two rays
kill it (8 and 10), and the Grunt steps on. The Undead turn: the wounded
Zombie bites the Grunt through its field, a Skeleton kills it, and it
rises as the garrison. The capital that fell in round 16 of `b` stood in
round 17 of `b2`, and had cost a technology and a unit.

**Where a player sees it.** The Saucer's unit card and its Tractor Beam
tooltip ("but not a unit behind its City Walls"), the Mothership's ("also
off City Walls"), the Help page, and the board, which offers no pull on a
held unit.

### 14.4 What was not changed

Every number of the roster; the Grunt (3 Coins, 8 HP, a pistol at two
tiles after a Move); Beam Down (from any own center, and the unit may
attack); the Saucer of Scouts; the Force Field and where it is; the Brain;
the Tripod; the Mothership; the Shock Trooper; Heat Sinks; the
Disintegrator.

### 14.5 The Martian Normal AI

Read in `a`, in six diagnostic matches (seed 9 against the Human AI four
times, the lab twice; not a balance measurement), and on recorded
positions of them. Details and function names:
[Normal AI, step two of the Martian pass](../architecture/NORMAL_AI.md#step-two-of-the-martian-pass-pulp_wars-w4925).

**What was wrong.** Since the reshuffle the Projector is two technologies
away, and the seat kept its Coins for them and for its growth technology:
in `a` and on the same map against the Human AI it trained no unit from
round 3 to round 9 (three Grunts on four cities). It took Stockpile in
round 1 where a free Saucer was offered. Its order put the Shock Trooper
third, so Engineering came in round 16 and Armoury in round 24, and it
fielded no Tripod, no Brain, and no Mothership in 25 rounds; Heat Sinks
stood behind the Mothership, so five and six Ray Gunners fired every
second ray at half power. In the lab it read a Tripod's shot after a Move
at full power (12 where it is 5), walked three Tripods two tiles ahead of
its Grunts for "kills" that were not, and lost four of its five in the
Human turn that followed; and it trained seven Shock Troopers and no
Grunt.

**What it does now.**

- _Bodies first_, as an Undead seat since its step two: with fewer units
  that capture than its cities and two more (Saucers do not count), a city
  that can train does so before any research, and no Coins are kept.
- _The free Saucer_ at level 2, whatever its Coins; and the opening
  harvest is made with the Coins it keeps for a technology.
- _One growth technology before the Projector's two_ while no enemy unit
  is within six tiles of one of its cities; with one there, Crafting and
  Force Fields first, also with an enemy at its gates, and before a
  capture that would raise the price.
- _The order:_ Shield Projector, Ray Gunner, **Brain**, then the Tripod and
  the Shock Trooper (the Trooper first when three or more enemy units are
  in sight and at most half of them shoot; a chain that is begun is
  finished), Saucer, Mothership. **Heat Sinks** right after the second Ray
  Gunner, and the **Disintegrator** after that once a garrison behind City
  Walls is in sight.
- _One Shock Trooper for every two Grunts._
- _A ray after a Move is at half power_ in every estimate, and a Tripod or
  a Ray Gunner makes no Move to a tile a melee unit can reach with none of
  its own line, defender, or breakthrough units nearer the enemy, unless
  its shot from there kills.

**Before and after.**

| Where                                        | Before                                                                                                                                            | After                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Against the Human AI, seed 9, rounds 1 to 10 | Stockpile in round 1; no unit trained in rounds 3 to 9; three Grunts on four cities; Crafting 4, Force Fields 8, Farming 9                        | a Saucer in round 1; four Grunts in round 5, five cities in round 8; Crafting 7, Force Fields 9, Farming 10                                                                |
| The same match, round 25                     | six cities and 21 units against six and 14; 30 kills for 9 lost; Armoury in round 24, no Brain                                                    | nine cities and 32 units against one and 3; 36 kills for 6 lost; a Brain in round 17 and three Psychic Commands                                                            |
| The hand-played Human, seed 9 (`a`, `a2`)    | four cities from round 6; five Grunts trained in twelve rounds; 10 attacks, 2 kills, 5 lost; the player had eight cities and 16 units in round 13 | four Grunts in round 5 and four Saucers by round 9; a city of the player taken in round 10; 20 attacks, 8 kills, 4 lost; the player had six cities and 8 units in round 14 |
| The lab, both seats the AI, twelve rounds    | four of five Tripods dead in round 3; seven Shock Troopers and no Grunt by round 9; Heat Sinks in round 11; 23 kills for 30 lost                  | four to six Tripods on the board throughout; six Grunts and three Troopers; Heat Sinks in round 7, the Disintegrator in 8; 29 kills for 19 lost                            |
| The recorded round 3 of that lab match       | three Tripods moved two tiles and fired for 2, 4, and 5                                                                                           | one moves, for the kill of a Champion with 3 HP                                                                                                                            |

No error and no stall in any match.

**What the changed AI did to a hand player** (`a2`, rounds 6 to 13): a
Grunt and a Saucer killed the first Raider; a Grunt in place and one set
down by a Saucer killed the second (6 and 6 from two tiles); four Grunts
came to a village the player had just taken, two of them by Saucer, and
took it back in round 10; a Saucer pulled a Raider off the center it stood
on and three units killed it; a Saucer pulled a Fighter one tile into a
Grunt's range and a second Saucer finished it; a wounded Grunt was pulled
back beside a Projector. Eight of the player's units for three Grunts and
a Saucer.

**Seen and left.**

- It researches slowly once it is winning: no technology from round 17 to
  round 22 on seed 9 while it trained to 22 units against 3, and Roads (by
  Scouting) before Heat Sinks once the war was over. It fields Grunts,
  Projectors, Ray Gunners, and Brains by round 25 of a generated match; a
  Tripod, a Shock Trooper, and a Mothership only in the lab.
- Its Saucers end their turn beside the enemy after a kill and die to a
  charge (two in `a`, one in `a2`).
- Mind Control: once in each lab match. A Brain in a generated match used
  Psychic Command and took nothing.
- A unit set down or pulled keeps its full-power ray; the estimate above
  now reads a pulled own ray unit at half power. Not corrected.

### 14.6 Open, for the user

1. **The free Saucer of every level-2 village.** Five Saucers in the two
   hand-played Martian games and four for the AI seat of `a2` by round 9,
   none bought; each is the reach of a Grunt set down three tiles away
   that shoots at once. If the faction proves too strong
   in a player's hands one on one, this is the first lever, and it gates
   well: Beam Down for the Scouts Saucer only once Saucers (Scouting) is
   researched, or one Scouts Saucer a player.
2. **The Grunt-only opening under a rush** (`c`): Force Fields is 12 to 18
   Coins away when it is needed. The smallest change inside the rulings
   would be a Martian Militia of a Shield Projector (a level-3 reward, with
   no field until the technology). Not built: one game.
3. **Banshees against Martians** (the Undead pass's item 5): a Wail still
   deals a shielded unit nothing.
4. **The Mothership.** With `7r58` it has a job. Whether 8 Coins, two unit
   slots, and three technologies are its right price was not played.
5. **Mind Control** was not met by hand in this pass.
6. **The research tempo of a winning seat** (above) is every army seat's.

### 14.7 For the Dinosaur pass

- A Tractor Beam never moved a two-slot dinosaur or an Egg and still does
  not; an Ankylosaurus on its walled center is now held against a Saucer.
- A Triceratops charging kills a Shielded Shock Trooper outright (12) and
  takes 3; a Raptor deals it 7 and takes 6. The Martian AI researches the
  Shock Trooper before the Tripod against an army that fights hand to
  hand: is that right against dinosaurs that kill it in one charge?
- The projection bug of this pass (an own unit's attack after a Move read
  at its strength before the Move) may have a twin: check what the AI
  believes a Triceratops's Charge! deals from a tile it has not reached,
  and a Stegosaurus that cannot fire after a Move.
- "Bodies first" is now an Undead and a Martian seat's rule; a Dinosaur
  seat lays Eggs that take two turns, and the same count may fit it.
- Seeds: check the chests and the Mountains before choosing a map (9 and
  19 on Dry Land 14 are clean for two seats).

### 14.8 Tests

`tests/unit/ruleset-v7-martian-step2.test.ts`: the identity; City Walls
hold (a Saucer's pull is offered and accepted without Walls, is not
offered, has no path, and is refused with them; the Mothership's is
accepted; only the owner's units on the center itself are held; the
glossary texts); bodies first for a Martian seat, with Saucers not
counted, in peace and in a war; the growth technology before the
Projector's two, and the Projector first with an enemy in sight; Force
Fields as a due technology with an enemy at the gates and before a
capture; the opening harvest with kept Coins and the free Saucer; the
recorded opening of seed 9, round 8
(`tests/fixtures/ruleset-v7-martian-opening.json`: three Grunts where it
bought Force Fields and nothing else); the order (the Brain third, the
Tripod or the Shock Trooper by the enemy in sight, a begun chain finished,
Heat Sinks after the second Ray Gunner, the Disintegrator for a garrison
behind Walls); one Shock Trooper for two Grunts; a ray at half power after
a Move, no Move to a firing tile out in front, the Move for a kill and the
Move behind a body; the recorded lab position
(`tests/fixtures/ruleset-v7-martian-tripods.json`); the Shock Field's line
in the text harness.

**Pins and fixtures that moved.** Every test that named `7r57` as the
current identity names `7r58`. The Tractor Beam's glossary, tooltip, and
Help texts where a test states them. The Martian research order where a
test states it (`ruleset-v7-martian-pass`, `ruleset-v7-dinosaur-pass`,
`ruleset-v7-tuning-6`), and in `ruleset-v7-martian-pass` the sequence of
technologies that follows from it. Two fixtures got the Grunts that keep a
Martian seat from being short of units (the Industry reshuffle's
"Fortification before its units", the Martian pass's "Coins kept for the
economy technology"). The command and event hashes of the Pangea pin of
`ruleset-v7-curiosities.test.ts`, the one with a Martian seat (12 rounds,
13 before). The source audits: one more land-form test in
`src/engine/v7/martian.ts`, and three new readers classified
(`tests/fixtures/v7-unit-reader-classes.ts`,
`tests/fixtures/v7-kind-reader-classes.ts`).
