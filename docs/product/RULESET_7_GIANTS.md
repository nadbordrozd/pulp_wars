# Ruleset 7: a signature ability for every giant

**Status:** design, bead `pulp_wars-w49.29` (epic `pulp_wars-w49`, point
7 of the user's notes of 2026-10-05). The rules are written against
`pulp-wars-poc-7r59` and against bead `pulp_wars-zypi`, which moves the
reward giant back to city level 5. The root accepted the defaults of
[section 14](#14-open-questions-and-defaults) (Push only on the Juggernaut,
the full Swallow, no new art).

**Built (engine, `pulp_wars-w49.30`).** Section 6 and section 8 are in the
engine at `pulp-wars-poc-7r62` (the identity bump section 8 names, taken at
publication after Dwarf crowd control, `7r60`, and Goblin explosions and
Berserk, `7r61`; a save, replay, or setup of `7r61` is rejected): the
registry, the four commands, the `giants` block and `wallsRazed`, the
events, the previews, the text harness and `lab --giant`, and a Normal AI
that stays legal (it uses no signature).
Break Off is built as the user changed it on 2026-10-09
([section 6.8](#68-candy-gingerbread-giant-break-off): two full-HP
Gingerbread Men for 10 HP, no slot needed); the draft, critique, balance
reasoning, and AI notes below still describe the design's single Trooper.
[The current rules](RULESET_7_CURRENT.md#111-the-giants-signatures) hold
the built rules and are authoritative. Not yet built: the Normal AI's use
of the signatures (`pulp_wars-w49.31`).

**Built (presentation, `pulp_wars-w49.32`).** Section 10: the four
commands' buttons and board targeting
([board targeting 3.6](../ui/BOARD_TARGETING.md#36-the-giants-signatures-bead-pulp_wars-w4932)),
the preview text, the unit cards and the swallowed victim's badge, the
city panel's Walls, the glossary, the reward line, and the code-drawn cues
with their sounds and reduced-motion frames
([attack effects](../art/ATTACK_EFFECTS.md#the-giants-signatures-bead-pulp_wars-w4932)).
The Gingerbread Men are the Gingerbread Giant's sprite drawn smaller (no
new art). The general Help keeps no faction text, so the signatures are
explained in the unit glossary and on the unit card.

**Ice Folk Freeze** (`pulp_wars-w49.37`) replaced Chill and Sluggish with
Frozen ([current rules section 21.2](RULESET_7_CURRENT.md#212-frozen)):
Glacial Smash and its shards now read and apply Frozen
([section 6.6](#66-ice-folk-frost-giant-glacial-smash)), the Frost Giant
has 36 HP (40 before), and its Cold Aura freezes the units around it after
its own Move or landing instead of at its owner's Start Turn; the tables
and analyses below that say Chill, 40 HP, or Start Turn describe the
giants before that change.

**The user's ask.** 2026-10-08: "review the giant units of all factions and
give them unique abilities; they are very samey now". Epic `w49` point 7:
"Juggernaut-level creatures are samey in appearance and abilities (they do
look cool)", with the faction bar of 2026-10-06: "units differentiated from
other factions by more than stats; fine balance is not the goal."

**How this was worked.** An inventory of the code and the rules
([section 1](#1-inventory-at-pulp-wars-poc-7r59)); six faction labs played
by hand in text mode with a reward giant placed at the front
([section 2](#2-what-hand-play-showed)); a first draft
([section 3](#3-draft-1)); a skeptical critique of it
([section 4](#4-the-critique)); a redraft
([section 5](#5-the-redraft)); and the final rules, exact enough to test
([section 6](#6-final-rules)). The balance check is scenario reasoning with
the engine's damage formula and the hand-played turns; no AI-vs-AI
statistics were run.

## Summary

| Faction  | Giant             | Signature (new)                                                                                                                | Also changes                                        |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Human    | Juggernaut        | **Crushing Shove**: a target it cannot push is crushed for 3, and a hostile unit behind it takes 3 too                         | keeps Push (the only giant that does)               |
| Undead   | Abomination       | **Swallow**: gulps an adjacent unit of 12 HP or less, digests it 4 a turn, and spits it out as a Zombie                        | loses Push; keeps Infect and never advancing        |
| Goblin   | Troll             | **Goblin Toss**: throws an adjacent own Goblin 2 or 3 tiles; the Goblin keeps its action (Kaboom)                              | loses Push; keeps Regenerate 4                      |
| Dinosaur | Brontosaurus      | **Thunder Stomp**: if it has not moved, 4 to every hostile ground unit around it, and the Field Defense there smashed          | loses Push; keeps Grow and two slots                |
| Martian  | Colossus          | **Overstride**: steps over units and through zones of control; tramples each hostile unit it steps over for 3                  | **Move 2** (was 1); loses Push; keeps the heat ray  |
| Ice Folk | Frost Giant       | **Glacial Smash**: its hit shatters a Chilled unit left at 8 HP or less, and the shards Chill the units around it              | **never advances**; loses Push; keeps the Cold Aura |
| Dwarf    | Brass Titan       | **Siege Hammer**: its blows ignore Walls, Field Defense, and Dig In, smash the Field Defense, and **tear down a city's Walls** | loses Push; keeps the construct rules               |
| Candy    | Gingerbread Giant | **Break Off**: spends 10 of its own HP on two full-HP Gingerbread Men (Toffee Troopers) beside it (the user's change)          | loses Push; keeps Sugar Rush and Bounce             |

Eight different kinds of mechanic: a displacement combo, a delayed removal
and conversion, a throw, an area attack, a movement rule, an execute with a
status chain, a siege rule that changes a city, and unit creation. One
engine identity bump, with one new stored list and one new city field
([section 8](#8-engine-impact-one-identity-bump)).

## 1. Inventory at `pulp-wars-poc-7r59`

### 1.1 The eight reward giants

All are the `JUGGERNAUT` role (tactical label `MYTHIC`), reward only (cost
`null`, no technology), Move 1, Sight 1, attack after moving, capture. Values
from `*_ROLE_RULES_V7` and `*_ROLE_MECHANICS_V7` in
`src/engine/rules/ruleset-v7.ts` and from
[section 11](RULESET_7_CURRENT.md#11-unit-roster) of the current rules.

| Faction  | Giant             |  HP | Attack | Defense | Range | Slots | Abilities now                                                       | Mechanics now                                                                                   |
| -------- | ----------------- | --: | -----: | ------: | ----: | ----: | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Human    | Juggernaut        |  40 |      4 |       4 |     1 |     1 | `ATTACK`, `CAPTURE`, `PUSH`                                         | advances after a kill                                                                           |
| Undead   | Abomination       |  40 |      4 |       4 |     1 |     1 | `ATTACK`, `CAPTURE`, `PUSH`, `INFECT`                               | never advances (`7r51`); a kill rises as a Zombie at 12 of 18 HP                                |
| Goblin   | Troll             |  40 |      4 |       3 |     1 |     1 | `ATTACK`, `CAPTURE`, `PUSH`, `REGENERATE`                           | regenerates 4 at its owner's Start Turn                                                         |
| Dinosaur | Brontosaurus      |  45 |    3.5 |       4 |     1 |     2 | `ATTACK`, `CAPTURE`, `PUSH`, `GROW`                                 | grows to 49 HP (Big) and 53 HP, Attack 4.5 (Alpha); full heal per stage                         |
| Martian  | Colossus          |  32 |      4 |     2.5 |   1–2 |     2 | `ATTACK`, `CAPTURE`, `PUSH`, `STRIDE`, `HEAT_RAY`                   | Shield 3; heat ray (half power after moving or while Cooling); walker; never advances (ranged)  |
| Ice Folk | Frost Giant       |  40 |      4 |       4 |     1 |     1 | `ATTACK`, `CAPTURE`, `PUSH`, `COLD_AURA`, `MOUNTAIN_BORN`, `FREEZE` | Cold Aura (Chills every hostile land unit around it at its owner's Start Turn); Glide; advances |
| Dwarf    | Brass Titan       |  36 |      4 |       3 |     1 |     1 | `ATTACK`, `CAPTURE`, `PUSH`, `CLOCKWORK`                            | construct: Unflinching on attack, no self-repair, no Grave, Repair +4                           |
| Candy    | Gingerbread Giant |  40 |      4 |     3.5 |     1 |     1 | `ATTACK`, `CAPTURE`, `PUSH`, `SUGAR_RUSH`, `BOUNCE`                 | Sugar Rush and the Crash; its melee attackers Bounce; leaves no Crumbs                          |

The bead names the Undead Wight, the Goblin Ogre, and the Dinosaur
Triceratops; since `7r55` those are the heavy line (`SWORDSMAN`) of their
factions, and the giants are the Abomination, the Troll, and the
Brontosaurus. This document is about the `JUGGERNAUT` role only.

### 1.2 What every giant shares

- **Push** on a surviving adjacent target
  ([section 13.4](RULESET_7_CURRENT.md#134-after-combat)): the one rule all
  eight have, and the one the user sees every time a giant hits.
- **Immunities keyed on the role:** Mind Control, the Tractor Beam,
  Knockback, Shatter, and Bounce (as an attacker) never apply to a
  `JUGGERNAUT`-role unit. No Pillage, no Disband, not counted for Muster.
- **Arrival:** the city level reward. Every city offers its giant once, from
  `REWARD_UNIT_LEVEL_V7` (6 at `7r59`). **Since the reward ladder rework
  (`pulp_wars-zypi`) every level from 5 offers the giant or 10 Coins, with
  no once-per-city limit, and the Normal AI takes it for a threatened city
  or when the city has a free slot and the seat fields fewer giants than
  cities.** It is
  placed on the center, or beside it when the center is occupied, full HP,
  exhausted, and may exceed the city's unit limit. The Showcase capital
  holds one; missions may place one. (At `7r59` the Normal AI took the
  giant whenever it was offered and it had fewer giants than cities,
  `src/ai/v7.ts`.)
- **The AI's valuation** is one formula for every giant
  (`retainedUnitValue`, the target bonus): 40 + Attack + Defense, +8 for
  Push.

### 1.3 Other big units, not in scope

- **The Giant Spider** (neutral, role `JUGGERNAUT`, `ATTACK` only, 24 HP):
  it shares the role and must not inherit any signature
  ([section 6.0](#60-rules-common-to-every-giant)).
- **Two-slot units** (Triceratops, T-Rex, Mothership) and the heavy line
  have their own rules from the ninth-unit round and are trained units.

### 1.4 How often a giant appears

The economy rejig's estimate puts a capital at level 6 around rounds 14
to 17 and at level 5 (14 population) around rounds 10 to 11, before any
tier 3 unit ([heavy-slot design, C.5](RULESET_7_DESIGN_HEAVY_SLOT_AND_ECONOMY.md#c5-the-combined-effect)).
With `zypi` every city that reaches level 5 offers one, so a wide player can
field two to four giants by round 20, and the first one meets tier 1 and
tier 2 armies. The Human playtest of 2026-10-05 saw eleven in one game under
the Monument and Boom snowball. Whatever a signature does, it must stay
fair when several of the same giant are on the board.

## 2. What hand play showed

Text mode (`npm run play:text`), the five faction labs of the middle game
plus `LAB_BREAKTHROUGH`, each with the faction's giant added at full HP at
the front by a scratch script (the labs hold no giant; the script changed
only the session's state, never the engine). The opponent is the Human
Normal AI in every case. There is no Dwarf or Candy lab; those two giants
were checked with the engine formula only.

| Lab                | Giant placed                  | Turns played | What happened                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LAB_ICE_FOLK_MID` | Frost Giant beside a Champion |            2 | Turn 1: walked up; the AI's Catapult hit it for 6 and a Champion for 8 (taking 9). Turn 2: Cold Aura Chilled two units; it killed the 6-HP Champion and **advanced** into the open; the AI's two Catapults (7, 8) and a Champion (11) killed it. |
| `LAB_UNDEAD_MID`   | Abomination in a Forest       |            3 | Killed a Fighter and a Knight, both rose as Zombies (the AI killed each Zombie in its next turn); it **never advances**, stayed in the Forest, and was at 22 of 40 after three AI turns with two kills.                                          |
| `LAB_GOBLIN_MID`   | Troll in a Forest             |            1 | Killed a Fighter, **advanced** into the open, and died in the same AI turn: Catapult 7, Catapult 7, Champion 10, Marksman 6, Champion 10.                                                                                                        |
| `LAB_MARTIAN_MID`  | Colossus two tiles back       |            1 | A full-power ray killed a Fighter at distance 2 with no retaliation; nothing reached it; it is Cooling the next turn.                                                                                                                            |
| `LAB_DINOSAUR_MID` | Brontosaurus in a Forest      |            2 | Hit a Fighter for 10 and pushed it; took 15 (3 in retaliation, then a Catapult 5 and a Champion 7). Turn 2: three hostile units next to it (Fighter 12, Champion 6 of 15, Knight 13); killing the Champion also grows it (full heal to 49).      |
| `LAB_BREAKTHROUGH` | Juggernaut against a column   |            1 | The AI stood in columns (Champions, Marksmen behind, Catapults behind them). Every Push was blocked by the unit behind. It dealt a Champion 11 and died in the next AI turn: 6, 7, 8, 5, 10.                                                     |

Four findings shaped the design:

1. **A giant that advances after a kill dies.** The Normal AI focus-fires a
   giant with Catapults and its heavies; a giant that steps into the open
   loses 35 to 40 HP in one AI turn. The two that did not advance (the
   Abomination by its rule, the Colossus by range) were alive after their
   turns, the Abomination after three AI turns with two kills. A signature should give value without dragging the
   giant forward (the user ruled on 2026-10-06 that forced advance stays,
   so this is done unit by unit with `advancesAfterKill`, as the
   Abomination already does).
2. **Push is usually blocked.** In the AI's column formation every Push
   failed, so the one shared ability did nothing.
3. **Giants are already not game-ending.** One to three kills before it
   falls is worth roughly a Knight or a T-Rex, 9 to 14 Coins. The risk is
   not the body; it is an ability that repeats every turn or multiplies
   with several giants.
4. **The Abomination and the Colossus are the least samey today** (Infect,
   the ray at range 2). The others are a 40-HP Push.

## 3. Draft 1

The first pass picked one mechanic per faction from the user's list (AoE,
several tiles at once, leaving things behind, combos, unique movement,
statuses, wacky abilities):

| Giant             | Draft 1                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Juggernaut        | **Shield Wall**: own units next to it have one more fortification level.                                       |
| Abomination       | **Meat Hook**: pull a hostile unit from 2 or 3 tiles to the tile next to it, then attack it.                   |
| Troll             | **Goblin Toss**: throw an adjacent Goblin up to 4 tiles; it explodes on landing (Kaboom 5 over the 3 × 3).     |
| Brontosaurus      | **Thunder Stomp**: 4 to every unit around it, own included, and every survivor pushed one tile outward.        |
| Colossus          | **Sweeping Ray**: a full-power ray also hits the two tiles flanking the target at the same distance.           |
| Frost Giant       | **Walking Winter**: the tiles around it count as Snow of its owner (Glide, Snow cover, deep snow for enemies). |
| Brass Titan       | **Steam Vent**: 3 to every hostile unit around it, and 4 to itself (only an Engineer repairs it).              |
| Gingerbread Giant | **Break Off**: tear off 8 HP to make a Toffee Trooper beside it, with no limit.                                |

Every giant kept Push.

## 4. The critique

A skeptical designer's reading of draft 1, point by point.

1. **Push on all eight is the sameness.** The user sees eight different
   bodies do one thing. Draft 1 adds a ninth thing to each and keeps the
   shared one. Worse, in the AI's dense formations Push is blocked most of
   the time ([section 2](#2-what-hand-play-showed)), so it is the weakest
   shared rule too. **Keep Push only where it is the point.**
2. **Shield Wall feeds the problem the epic is about.** Point 1 of the
   user's notes is that defensive play is already too strong and the AI
   cannot break a formation. A giant that hands out fortification makes a
   free, unkillable-looking wall at level 5. Rejected. The Human giant
   should _break_ formations, which is also what Push is for: build on it.
3. **Meat Hook is the Martian Tractor Beam** (Saucer, Mothership) with a
   different sprite. The bar is "differentiated from other factions by more
   than stats"; a second faction with the same pull fails it. The Undead
   identity is death and rising (Graves, Infect, Bitten, Plague), so the
   Abomination should do something with a body. The user's own example is
   **swallow and regrow**.
4. **An auto-exploding Toss is artillery.** A 1-Coin Goblin thrown 4 tiles
   to deal 5 over a 3 × 3 out-ranges the 7-Coin Rocket Cart and removes the
   one decision that makes it Goblin (whether to blow up). Range 2 to 3 is
   enough, and the Goblin should land and then choose: Kaboom, attack, or
   stand in the way.
5. **Draft 1's Stomp is unplayable in a Dinosaur fight.** Pack Hunt wants
   own units next to the target, so a stomp that hurts own units hits the
   pack. Pushing up to eight units outward needs an order, fails half the
   time, and repeats Push. Hostile only, no push. And it must not be free
   every turn on top of an attack: tie it to standing still (the Bronto
   rears up), which also keeps it off the advance.
6. **The Sweeping Ray changes nothing about how the Colossus is used.** It
   already stands still and fires at range 2; a wider beam is the Tripod's
   Pierce again. A walker giant's fantasy is **stepping over the line**:
   that is the user's "trample through a line", and only a giant can do it.
7. **Walking Winter is invisible.** Snow cover ×1.25 and Glide are numbers
   the player does not feel at the moment of play, and dynamic Snow costs a
   renderer change. The Frost Giant already Chills its neighbours with the
   Cold Aura; the missing half is **the payoff**: the giant that freezes
   should be the one that shatters. Shatter is the Ice Folk's own kill rule,
   and the giant is the one unit it never applies to.
8. **Steam Vent is a second Stomp.** Two area attacks in eight giants is one
   too many. Dwarves are engineers and siege makers (Steam Cannon, Blasting
   Charges, the Tunnel); the user's example **siege smash** fits, and it
   answers point 1 of the epic: a giant that knocks down Walls is the
   turtle-breaker.
9. **Unlimited Break Off is a unit factory.** With Frosting, Sugar Toss,
   Recover (4 in own land), and Windmills (up to 6), a Giant heals 8 in a
   turn or two; with no limit it makes a free 2-Coin unit every other turn
   forever, beyond the unit limit. **Gate it by the home city's free slot**
   (the Re-bake rule) and by an HP floor.
10. **The advance kills giants** (finding 1). Whatever the Frost Giant gets,
    a shatter is a kill, and a kill pulls it forward into the Catapults; an
    executioner that advances dies on its first execution. Make it stand.
11. **Several giants at level 5.** Anything that repeats every turn
    multiplies: three Brontosauruses stomping a line, three Trolls tossing.
    Each signature needs a cost or a condition (a Goblin used, standing
    still, a city slot, HP, digest time).
12. **The AI.** Four new commands. If the engine lands without AI use, the
    AI's giants are worse than now (they lose Push). The AI bead must land
    before the next release, and the engine bead must keep the AI legal.
13. **The Giant Spider** shares the role and spreads the Human Juggernaut's
    mechanics (`NEUTRAL_MONSTER_ROLE_MECHANICS_V7`); every signature must be
    keyed on the role's ability under the unit's kind and set off for it.
14. **Swallow is the costliest rule to build** (a unit off the board, like a
    burrowed Dwarf unit). Keep a cheaper fallback in hand
    ([section 14](#14-open-questions-and-defaults), question 12).

## 5. The redraft

| Giant                  | Draft 1          | Redraft                                                     | Why (critique point)                                       |
| ---------------------- | ---------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Juggernaut             | Shield Wall      | **Crushing Shove** (Push that crushes)                      | 1, 2: break formations; make the shared rule work in lines |
| Abomination            | Meat Hook        | **Swallow** (digest, then a Zombie)                         | 3: no copy of the Tractor Beam; Undead bodies              |
| Troll                  | Toss, auto-blast | **Goblin Toss**, 2–3 tiles, the Goblin chooses              | 4                                                          |
| Brontosaurus           | Stomp, all units | **Thunder Stomp**, hostile only, unmoved, 4                 | 5, 11                                                      |
| Colossus               | Sweeping Ray     | **Overstride**, Move 2, trample 3                           | 6                                                          |
| Frost Giant            | Walking Winter   | **Glacial Smash** (shatter at 8) and shards; never advances | 7, 10                                                      |
| Brass Titan            | Steam Vent       | **Siege Hammer**: ignore fortification, tear down Walls     | 8                                                          |
| Gingerbread Giant      | Break Off        | **Break Off**, a free home slot, at least 9 HP              | 9                                                          |
| all but the Juggernaut | Push             | **no Push**                                                 | 1                                                          |

## 6. Final rules

Notation as in the current rules: Attack and Defense in whole points (the
engine stores half-points), Chebyshev distance, "fixed damage" ignores
Attack, Defense, the HP ratio, cover, fortification, and Walls; a Martian
Shield absorbs fixed damage first, Armoured takes 1 off a hit of 2 or more,
and Plated caps it at 4, as for a blast
([section 18.4](RULESET_7_CURRENT.md#184-kaboom)).

### 6.0 Rules common to every giant

- **G1. Push.** Only the Human Juggernaut has `PUSH`. It is removed from the
  Abomination, Troll, Brontosaurus, Colossus, Frost Giant, Brass Titan, and
  Gingerbread Giant. (A Triceratops's Charge! still pushes; Knockback,
  Bounce, and the ram's shove are unchanged.)
- **G2. Land form only.** Every signature needs the giant in land form. An
  embarked giant has none (as every ability afloat).
- **G3. Keyed on the kind's ability.** Each signature is gated by its
  ability literal in the role rule under the unit's kind (`CRUSH`,
  `SWALLOW`, `TOSS`, `STOMP`, `OVERSTRIDE`, `GLACIAL_SMASH`,
  `SIEGE_HAMMER`, `BREAK_OFF`) and its numbers are role mechanics. The
  Giant Spider's role rule keeps `ATTACK` only and its mechanics set every
  new field to off, so it has none of them. Every giant stays immune to Mind
  Control, so no signature is ever used by a controller.
- **G4. New primary actions** (`SWALLOW`, `TOSS`, `STOMP`, `BREAK_OFF`)
  join every list of primary actions: the sluggish table of
  [section 21.3](RULESET_7_CURRENT.md#213-what-a-frozen-unit-cannot-do)
  (legal unmoved, `UNIT_ALREADY_ACTED` after a Move), the Crash
  ([section 23.2](RULESET_7_CURRENT.md#232-sugar-rush-and-the-crash)), a
  pending city reward blocking every command, and "no unit moves after a
  primary action". Each marks the giant handled.
- **G5. New death causes.** `CRUSH`, `STOMP`, and `TRAMPLE` are added
  wherever `SPLASH` is listed: a Grave where the Grave rules allow, Crumbs,
  a death blast, a Bitten or Infect rising as for a splash death, and kill
  credit to the giant (Promotion, growth, Slayer, Plunder). `DIGESTED`
  leaves nothing: no Grave, no Crumbs, no death blast, no rising of any
  kind, no Rise Again.
- **G6. Retaliation.** None of the new damage draws retaliation. Crushing
  Shove and Siege Hammer modify an ordinary `ATTACK`, whose own retaliation
  is unchanged and computed before them.
- **G7. Reward, placement, slots, immunities, and the AI's taking of the
  giant** are unchanged (the level is `zypi`'s).

### 6.1 Human Juggernaut: Crushing Shove

**Rule.** When a land-form unit whose role has `CRUSH` (the Juggernaut)
makes an `ATTACK` from distance 1 and the defender survives the exchange,
the Push step runs as now. **If the defender is not pushed**, it is
**crushed**: it takes `CRUSH_DAMAGE_V7` **3** fixed damage. If the tile it
would have been pushed onto holds a unit or an Egg hostile to the
Juggernaut's owner, that unit (the **blocker**) takes 3 fixed damage too.

- "Not pushed" is any outcome of the Push conditions other than
  `WILL_PUSH`: the tile is off the board, unexplored by the attacker,
  occupied (a unit, an Egg, or a mound), a settlement site, of the wrong
  land/water kind, not enterable, allied to the target, or holds a chest.
- **Never crushed:** a defender the Push rule never moves by its nature: an
  Egg, a Rock Hard unit (the Jawbreaker), and an icebound unit. Other giants
  and two-slot units are pushed or crushed like anyone.
- **The blocker** is hit only when it is hostile to the Juggernaut's owner;
  an own or allied blocker takes nothing (the defender is still crushed). A
  burrowed unit under a mound is never hit. A flyer standing on the tile is
  hit.
- **Order.** In the Push step, after the exchange's deaths and risings:
  the crush on the defender, then the blocker, then their deaths in that
  order (each with its Grave, rising, Crumbs, and death blast and its
  chain). A crush kill is not followed by an advance and does not start an
  Overrun (the Juggernaut has none).
- **Events.** `UNIT_CRUSHED` with `playerId`, `sourceUnitId`,
  `targetUnitId`, `damage`, `shieldDamage`, `dies`, `blockerUnitId` (or
  null), `blockerDamage`, `blockerShieldDamage`, and `blockerDies`,
  projected to every observer who sees the Juggernaut's or the defender's
  tile (as `COMBAT_RESOLVED`); a blocker hidden from the observer appears
  as null.
- **Preview.** `crush` is `NONE`, `WILL_CRUSH`, or `UNKNOWN_BEHIND_FOG`
  exactly when the Push preview is (the target's owner's research decides
  whether it may enter the tile); `crushDamage` and `collisionDamage` are
  the damage that would be applied; `push` keeps its meaning. The text
  harness prints "crushes for 3 (and 3 to u64)".

**Worked examples** (the `LAB_BREAKTHROUGH` column, open Grass): the
Juggernaut hits a Champion (15 HP) with a Marksman behind it: 11, the
Champion is crushed to 1 and the Marksman takes 3 (12 to 9); the Juggernaut
takes 4. A Guard on a walled center that has a Field Defense, with another
Guard behind it: 7 and 3 (17 to 7), and 3 to the second Guard. A Guard backed by a
Lake: 10 and 3 (17 to 4).

### 6.2 Undead Abomination: Swallow

**`SWALLOW { kind, unitId, targetUnitId }`**, a primary action of a role
with `SWALLOW` (the Abomination). It may follow a Move. Legality, in order
(all rejections atomic):

| #   | Requirement                                                                                                                                                | Rejection                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                             | the ordinary unit errors                   |
| 2   | Its role, under its kind, has `SWALLOW`.                                                                                                                   | `UNIT_ROLE_INVALID { role }`               |
| 3   | It is in land form.                                                                                                                                        | `SWALLOW_NOT_LEGAL { reason: "EMBARKED" }` |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Abomination has not moved.                                                       | `UNIT_ALREADY_ACTED`                       |
| 5   | It holds no victim.                                                                                                                                        | `SWALLOW_NOT_LEGAL { reason: "FULL" }`     |
| 6   | The target is a unit on the board the actor sees, hostile to the actor, at distance 1, in land form (not embarked, naval, or an Egg).                      | `SWALLOW_NOT_LEGAL { reason: "TARGET" }`   |
| 7   | The target uses one slot, its role is not `JUGGERNAUT`, it is not the Giant Spider, not a construct, not Rock Hard, not icebound, and not mind-controlled. | `SWALLOW_NOT_LEGAL { reason: "IMMUNE" }`   |
| 8   | The target's HP is at most `SWALLOW_MAX_HP_V7` **12** (its Shield does not count).                                                                         | `SWALLOW_NOT_LEGAL { reason: "TOO_BIG" }`  |

**Result.** The target leaves the board without dying and is stored in the
new list `giants.swallowed` as `{ holderUnitId, unit }` (sorted by holder),
with its HP, kills, home city, and veteran flag; every per-unit entry it had
(Chill, Plague, Bitten, Shield, Cooling, Sugar Rush, Splat, Mind Control
cooldown) is removed. A swallowed Brain releases its controlled units
(`UNIT_RELEASED`, as when a Brain is lost). Nothing retaliates (it is not an
attack: no Shock Field, Frostbite, or Bounce), nothing is credited, and the
Abomination does not move. A victim taken from a city center ends the siege
it made or leaves the center empty. Field Defense on its tile stays. Event
`UNIT_SWALLOWED { playerId, unitId, victimUnitId, victimOwnerId, role, hp }`.

While held, the victim is a unit of its owner for its home city's unit
limit and nothing else: it is not on the board, has no zone of control, no
sight, is never a target, and its owner cannot command it. It is shown on
the holder: the public unit stats of a visible Abomination carry
`swallowed { unitId, ownerId, role, hp, maxHp }` (the victim's owner always
knows it, as for any unit of its own).

**Digesting.** At the Abomination's owner's Start Turn, right after Troll
regeneration ([section 18.10](RULESET_7_CURRENT.md#1810-berserk-ram-and-troll-regeneration)),
each held victim loses `DIGEST_DAMAGE_V7` **4** HP (no Shield, Armoured, or
Plated: it is inside) and the holder heals the HP the victim lost (capped
at its maximum). Event `UNIT_DIGESTED { playerId, unitId, victimUnitId,
amount, hpAfter, healed }`. A victim at 0 HP dies (`UNIT_DIED` cause
`DIGESTED`, kill credited to the Abomination) and the Abomination
**regurgitates** it: a Zombie of the Abomination's owner rises at the Infect
rising HP (**12 of 18**), homeless and exhausted, on the first tile around
the Abomination in `(y, x)` order that is land, holds no unit, Egg, mound,
or chest, is enterable by a Zombie, and is not allied to the victim's owner
(the reward placement test); with no such tile no Zombie rises. Event
`UNIT_REGURGITATED { playerId, unitId, victimUnitId, zombieUnitId | null,
at | null }`. The Abomination is then empty and may Swallow again this turn.

**Release.** When the Abomination dies on a land tile, its victim is
released right after the Abomination's `UNIT_DIED` and before its Grave and
any advance: the victim stands on that tile with its current HP, the
exhausted activation, and `captureEligible` false (event
`SWALLOWED_UNIT_RELEASED`). The tile is then occupied, so the killer does
not advance onto it. When its owner is eliminated, the victim is released
the same way. In every other case (the Abomination dies afloat, or is
removed by reward displacement) the victim dies with cause `DIGESTED` and no
credit and no Zombie. When the victim's owner is eliminated while it is
held, the entry is removed with that player's units.

**Kept and changed.** The Abomination keeps Infect (its own kills by attack
or retaliation rise as Zombies) and never advances; it loses Push.

**Saves.** `giants.swallowed` is hashed, saved, replayed, and parsed:
parsing rejects an entry whose holder is not on the board, not land-form,
or lacks `SWALLOW`; two entries for one holder; a victim ID also on the
board or in `burrowed`; a victim at 0 HP or above its maximum; a victim
that the legality above would refuse (an Egg, two slots, a giant, a
construct); and any entry in a match without an Undead seat.

**Worked examples.** A Knight at 9 of 13 next to the Abomination: swallowed;
9 to 5 to 1 over two Undead Start Turns, the Abomination healing 4 and 4;
dead at the third, and a Zombie rises beside it. A Guard at 7 of 17 on a
walled center: swallowed, the center is empty, and the Human player can
train on it again the next turn. A full-HP Champion (15) or Guard (17):
too big; the Abomination's attack (11 or 10) makes it swallowable the next
turn.

### 6.3 Goblin Troll: Goblin Toss

**`TOSS { kind, unitId, passengerUnitId, at }`**, a primary action of a role
with `TOSS` (the Troll). It may follow the Troll's Move. Legality, in order:

| #   | Requirement                                                                                                                                                                                                                                                                                                                 | Rejection                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                                                                                                              | the ordinary unit errors                   |
| 2   | Its role, under its kind, has `TOSS`.                                                                                                                                                                                                                                                                                       | `UNIT_ROLE_INVALID { role }`               |
| 3   | It is in land form.                                                                                                                                                                                                                                                                                                         | `TOSS_NOT_LEGAL { reason: "EMBARKED" }`    |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Troll has not moved.                                                                                                                                                                                                                              | `UNIT_ALREADY_ACTED`                       |
| 5   | The passenger is another unit of the actor on the board, of the Goblin kind and the `FIGHTER` role (the Goblin), in land form, at distance 1 from the Troll, not mind-controlled, and has not landed this turn.                                                                                                             | `TOSS_NOT_LEGAL { reason: "PASSENGER" }`   |
| 6   | `at` is at distance 2 or 3 (`TOSS_RANGE_V7`) from the Troll, holds no treasure chest and no curiosity, and passes the Push conditions for the passenger (`displacementDestinationLegalV7`: on the board, explored, no unit, Egg, or mound, not a settlement site, enterable by a Goblin, not a Rift, not allied territory). | `TOSS_NOT_LEGAL { reason: "DESTINATION" }` |

**Result.** The Goblin is placed on `at`. It is not a Move: nothing between
the tiles matters (units, water, Mountains, zones of control), and nothing on
`at` stops or slows it; it eats no Crumbs. Its `moved` flag becomes true
and `captureEligible` false; every other activation flag is kept, so a
Goblin that has not used its primary action may still Attack (it attacks
after moving) or **Kaboom** this turn. A Field Defense on `at` in territory
hostile to the actor is destroyed (reason `OCCUPATION`, as when a land unit
enters). The Goblin reveals its sight from `at`. The Troll has used its
primary action. Events: `GOBLIN_TOSSED { playerId, unitId, passengerUnitId,
from, to }`, `FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then the ordinary
tail. Projected to every observer who sees the Troll's tile or `at`.

- A sluggish Goblin that is thrown has moved, so it cannot act after
  landing (the ordinary sluggish rule).
- A Goblin that already used its primary action may still be thrown (to
  block, to besiege next turn by walking, or to be in the way); it cannot
  act.
- `at` is explored (a Push condition), and every unit on an explored tile
  is visible ([section 15](RULESET_7_CURRENT.md#15-fog-and-observation)),
  and the Goblin's entry reads its owner's own research: the command is
  exact and the preview equals the result.

**Kept and changed.** The Troll keeps Regenerate 4 and the advance after a
kill; it loses Push.

**Worked example** (`LAB_GOBLIN_MID`, the position of
[section 2](#2-what-hand-play-showed)): the Troll stays in the Forest at
8,5; the Goblin at 6,5 walks to 7,5; the Troll tosses it to 10,7, two tiles
away; it Kabooms: 5 to the Fighter at 9,6 (12 to 7) and 5 to the Catapult
at 11,7 (10 to 5), and to anyone else around 10,7. The Troll, at full HP in
cover, did not advance into the five attacks that killed it in the real
turn.

### 6.4 Dinosaur Brontosaurus: Thunder Stomp

**`STOMP { kind, unitId }`**, a primary action of a role with `STOMP` (the
Brontosaurus). Legality: the ordinary unit errors; `UNIT_ROLE_INVALID`
without `STOMP`; `STOMP_NOT_LEGAL { reason: "EMBARKED" }` afloat;
`UNIT_ALREADY_ACTED` after a primary action or a landing; and
`STOMP_NOT_LEGAL { reason: "MOVED" }` when its `moved` flag is true (it
rears up from where it stood; an advance, Push, or pull earlier in the
turn does not set the flag). No target is needed: a Stomp that hits nobody
is legal.

**Result.** Every unit on the eight tiles around the Brontosaurus that is on
the board, hostile to its owner, in land form or an Egg, and does not fly
(never a Saucer, Mothership, or Gyrocopter; a walker is hit) takes
`STOMP_DAMAGE_V7` **4** fixed damage, all at once (results sorted by
`(y, x, unitId)`, each `min(damage, Shield + HP)`). Every Field Defense on
those eight tiles is destroyed, whoever owns it (reason `STOMP`, `(y, x)`
order). Then the dead die in results order (cause `STOMP`, each with its
Grave, rising, Crumbs, death blast, and chain, as G5), and growth is
applied to the Brontosaurus for its kills (a growth stage heals it fully).
A burrowed unit is underground and never hit; own and allied units, ships,
and embarked units are never hit. It is not an attack: no retaliation, no
Pack Hunt, War Drums, Gang Up, or Alpha bonus, no Shatter, no Splat, no
Charge!. Event `THUNDER_STOMP { playerId, unitId, results:
{ unitId, damage, shieldDamage, dies }[], fieldDefenses }`, projected to
every observer who sees the Brontosaurus's tile (results for units hidden
from the observer are left out, as for explosions).

**Kept and changed.** The Brontosaurus keeps Grow, two slots, and the
advance after an attack's kill; it loses Push.

**Worked example** (`LAB_DINOSAUR_MID`, round 2): around the Brontosaurus
stand a Fighter (12), a Champion (6 of 15), and a Knight (13). A Stomp:
12 to 8, 6 to 2, 13 to 9, 12 damage and no retaliation. An attack on the
Champion instead kills it and grows the Brontosaurus to Big (49 HP, a full
heal from 30). Both are good; that is the choice the signature should give.

### 6.5 Martian Colossus: Overstride

**Stats.** The Colossus has **Move 2** (was 1). Everything else is as now:
32 HP, Shield 3, Attack 4, Defense 2.5, range 1–2, heat ray, walker, two
slots, never advances.

**Rule.** The ordinary `MOVE` of a land-form unit whose role has
`OVERSTRIDE` (the Colossus) has the flyer's passing rules of
[section 20.6](RULESET_7_CURRENT.md#206-movement-stride-flying-and-crossing-water)
and keeps every other walker rule:

- a step onto a tile that holds a unit or an Egg of any owner is entered as
  if it were empty, at any point of the path except the last; it never ends
  a Move on an occupied tile;
- hostile zones of control never end its Move (it still exerts its own);
- an unexplored tile still ends the Move, and a hidden unit there
  interrupts it on the tile before, as for a flyer;
- Mountains, Forests, and Shallow Water as for any walker.

**Trample.** After the Move's own events, each unit on a tile the Colossus
passed over (entered and left in the same Move) that is hostile to its
owner, in land form or an Egg, and does not fly takes `TRAMPLE_DAMAGE_V7`
**3** fixed damage, once per Move, in path order; then the dead die in that
order (cause `TRAMPLE`, as G5, kill credit to the Colossus). Passing over a
tile takes no chest or curiosity, eats no Crumbs, and destroys no Field
Defense; only the final tile does what any Move's final tile does. Event
`UNITS_TRAMPLED { playerId, unitId, results }` after the `UNIT_MOVED`,
projected like the Move. The command query's Move preview lists the units
the path would trample; it is exact, since a Move never passes an
unexplored tile.

- The heat ray after an Overstride is at half power, as after any Move.
- An Escape Move, a Beam Down, a Push, or a pull is not an Overstride.

**Kept and changed.** Heat ray, Shield, Stride, capture, two slots kept;
Push lost; Move 2.

**Worked example.** A Colossus next to a Human screen, a Fighter with a
Catapult two tiles behind it: the Colossus strides over the Fighter (12 to 9) to the tile beyond, next to the Catapult, and fires a half-power ray
(Attack 2): 7 to the Catapult (10 to 3), no retaliation (a Catapult cannot
hit an adjacent unit). The next turn, unmoved and not Cooling, its full ray
kills the Catapult, and it can stride back out over the screen.

### 6.6 Ice Folk Frost Giant: Glacial Smash

**Rule.** When a land-form unit whose role has `GLACIAL_SMASH` (the Frost
Giant) attacks at distance 1, the Shatter test of
[section 21.4](RULESET_7_CURRENT.md#214-shatter) uses
`GLACIAL_SMASH_HP_V7` **8** instead of its owner's Shatter threshold (3, or
4 with Brittle). Every other condition is unchanged: the defender is Frozen
(Chilled before `pulp_wars-w49.37`) and in land form, its role is not `JUGGERNAUT`, and after the hit it would
have 1 to 8 HP. The preview carries `shatters` as today and
`glacialSmash: true` when the threshold of 8 was the one that applied.

**Shards.** When a Frost Giant's attack shatters a unit (by Glacial Smash or
within the ordinary threshold), every other unit on the eight tiles around
the shattered unit's tile that can be Frozen by the Giant's owner (hostile,
land form, not an Egg; `JUGGERNAUT` roles included) is Frozen by the
ordinary rule ([current rules section 21.2](RULESET_7_CURRENT.md#212-frozen)),
with one `UNITS_FROZEN { source: "SHARDS" }` after the death events.

**Never advances.** The Frost Giant's `advancesAfterKill` is false (as the
Abomination's): after a shatter or any kill it stays.

**Kept and changed.** Cold Aura, Mountain-born, Glide, Freeze kept; Push
lost; never advances. Since `pulp_wars-w49.37` the Cold Aura follows the
Giant's own Move or landing
([current rules section 21.12](RULESET_7_CURRENT.md#2112-prowl-and-the-cold-aura)),
and the Giant has 36 HP.

**Worked examples** (open Grass unless stated, the target Frozen; they
were written with the Cold Aura of the Ice Folk Start Turn): a Guard (17) takes 10 and would keep
7: **shattered**. A Champion in a Forest takes 9 and would keep 6:
shattered. A Mammoth (20) takes 12 and would keep 8: shattered. A Guard on
a Field Defense takes 8 and would keep 9: not shattered (it is at 9; the
next Ice Folk hit finishes it). A full-HP Ankylosaurus takes 9 (10 less
Armoured) and keeps 11: not shattered. In `LAB_ICE_FOLK_MID` round 2 the
Giant would have smashed the Chilled Fighter at 9,4 (12, hit 8, keeps 4),
Chilled the Fighter and the Knight beside it with the shards (and renewed
the Champion's Chill), and stayed on its tile instead of advancing into the
turn that killed it.

### 6.7 Dwarf Brass Titan: Siege Hammer

**Rule.** Every `ATTACK` from distance 1 by a land-form unit whose role has
`SIEGE_HAMMER` (the Brass Titan):

1. **ignores the defender's fortification levels** (Walls, Field Defense,
   Dig In) for the damage; cover stays. As for a Breach, the retaliation is
   unchanged (it never used fortification). The preview's
   `fortificationIgnored` is the levels removed and `siegeHammer` is true;
2. **destroys a Field Defense on the target's tile** (reason
   `SIEGE_HAMMER`), whether or not either unit survives;
3. **tears down the Walls**: when the target stands on the center of a city
   whose owner is hostile to the Titan's owner and the city has Walls, the
   city's Walls are destroyed, whether or not either unit survives. The
   city keeps its `WALLS` reward record (the level-3 reward was taken and
   is not offered again) and gets the new field `wallsRazed: true`; a city
   has Walls when it holds the record and `wallsRazed` is false. Razed Walls
   stay razed through a capture; no rule rebuilds them. Event
   `WALLS_DESTROYED { cityId, byUnitId }`, public to every player who knows
   the city (Walls are public). The preview carries `wallsDestroyed`.

**Kept and changed.** The construct rules (Unflinching on attack, no
self-repair, no Grave, Mind Control-immune, Repair +4) and the advance are
kept; Push is lost.

**Worked examples.** A Guard on a walled capital center with a Field
Defense: 10 instead of 7, the Field Defense and the Walls gone; the Titan
takes 6 (36 to 30, repaired only by an Engineer). The next unit to attack
that Guard (7 of 17) finds no fortification: a Champion's hit, 12, kills
it. The Titan at 18 of 36 still attacks as if at full HP (Unflinching).

### 6.8 Candy Gingerbread Giant: Break Off

**The user's change of 2026-10-09** (bead comment on `pulp_wars-w49.30`):
the Gingerbread Giant spends 10 HP to make **two** mini Gingerbread Men,
each with the stats of a regular Toffee Trooper. The root's judgements: they
are Candy `FIGHTER`-role units (a Toffee Trooper in every rule) carrying a
presentation variant ("Gingerbread Man", persisted with the unit); Break
Off needs the Giant at 11 HP or more and two free legal adjacent land tiles;
it is the Giant's primary action; both are homed to the Giant's home city
and placed even when that city is at capacity (they count against it
afterwards, like reward units). This replaces the single 8-HP Trooper and
its free-slot requirement of the design; the rule below is the built one.

**`BREAK_OFF { kind, unitId, tiles }`**, a primary action of a role with
`BREAK_OFF` (the Gingerbread Giant); `tiles` is two distinct tiles in
`(y, x)` order. It may follow a Move. Legality, in order:

| #   | Requirement                                                                                                                                                                                                                          | Rejection                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                       | the ordinary unit errors                     |
| 2   | Its role, under its kind, has `BREAK_OFF`.                                                                                                                                                                                           | `UNIT_ROLE_INVALID { role }`                 |
| 3   | It is not Crashed.                                                                                                                                                                                                                   | `UNIT_CRASHED { unitId }`                    |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Giant has not moved.                                                                                                                                       | `UNIT_ALREADY_ACTED`                         |
| 5   | It is in land form.                                                                                                                                                                                                                  | `BREAK_OFF_NOT_LEGAL { reason: "EMBARKED" }` |
| 6   | Its HP is more than `BREAK_OFF_HP_V7` (10), so at least 11.                                                                                                                                                                          | `BREAK_OFF_NOT_LEGAL { reason: "TOO_WEAK" }` |
| 7   | It has a home city owned by the actor.                                                                                                                                                                                               | `BREAK_OFF_NOT_LEGAL { reason: "NO_HOME" }`  |
| 8   | Each of the two `tiles` is one of the eight tiles around it, holds no unit of any owner or form, no mound, no treasure chest, and no curiosity, is enterable by a Toffee Trooper, and is not allied territory (Re-bake's tile rule). | `BREAK_OFF_NOT_LEGAL { reason: "TILE" }`     |

There is no slot rule. The command query offers every pair of legal tiles,
in `(y, x)` order (up to 28).

**Result.** The Giant loses 10 HP (it is not damage: no event of damage, no
Shield or Armoured, never a death). Two Gingerbread Men with the next two
entity IDs stand on the two tiles, in order: each a Candy `FIGHTER` (a
Toffee Trooper) owned by the actor, homed to the Giant's home city (each
using a slot, even beyond its limit), at **full HP** (10 of 10), zero kills,
the exhausted activation, `captureEligible` false, and
`variant: "GINGERBREAD_MAN"` (public; presentation only). Hostile Field
Defense on either tile is destroyed (reason `OCCUPATION`), and each reveals
its sight. They are ordinary Toffee Troopers from then on (they may Rush
next turn, and leave Crumbs when they die). Event `GIANT_BROKE_OFF
{ playerId, unitId, newUnitIds, tiles, cityId, hp }`, then
`FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, and the ordinary tail. It
spends no Coins and no city action, and a siege of the home city does not
block it (as Re-bake).

**Kept and changed.** Sugar Rush (a Rushed Giant may Break Off; the Crash
then blocks it on the next turn) and Bounce kept; Push lost.

**Worked example.** A Giant at 40 next to the front: Break Off, the Giant
at 30 and two 10-HP Gingerbread Men in the line. A Knight then attacks the
Giant at 30 of 40 and is Bounced. Recover in own land brings the Giant back
4 a turn.

## 7. Balance: scenario reasoning

The numbers below use the engine formula of
[section 13.2](RULESET_7_CURRENT.md#132-damage). The question for each is
"is a free one at level 5 exciting but not game-ending, and is a third one
still fair?"

| Giant             | What it adds per use                                                                     | Its cost or condition                                    | Repeats                              | Counterplay                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| Juggernaut        | +3 on the target, +3 on the unit behind, in a dense line                                 | none: it is its attack                                   | once a turn                          | spread out (then it pushes); kill it: it still dies in one AI turn alone |
| Abomination       | removes a unit of 12 HP or less for up to three turns, a Zombie at the end, +4 HP a turn | one victim at a time; Move 1; a primary action           | at most one held victim              | keep wounded units away; kill the Abomination (40 HP) to free the victim |
| Troll             | a 1-Coin Goblin's Kaboom (5 over a 3 × 3) at 2–3 tiles                                   | a Goblin per throw, adjacent to the Troll; friendly fire | once a turn                          | spread out; kill the Goblins next to the Troll                           |
| Brontosaurus      | 4 to each hostile ground unit next to it, no retaliation                                 | it may not have moved; it does not also attack           | once a turn                          | do not crowd it; it is slow (Move 1)                                     |
| Colossus          | reaches past a screen; 3 to each unit stepped over                                       | half-power ray after the Move; Defense 2.5               | every Move                           | it ends next to your units: hit it (it has no fortification or cover)    |
| Frost Giant       | kills one Chilled unit a turn that its hit leaves at 8 or less; shards Chill             | the target must be Chilled; it no longer advances        | once a turn                          | do not end a turn next to it; shoot it; Tend Wounded thaws               |
| Brass Titan       | breaks fortification; razes Walls for good                                               | it must reach the center; no self-repair                 | Walls once per city                  | kill it before it reaches the center; it heals only by Engineers         |
| Gingerbread Giant | an 8-HP Trooper at the front for 8 HP                                                    | a free slot in its home city; at least 9 HP; its action  | once a turn, while slots and HP last | the Trooper is a 2-Coin unit at 8 HP; Bounce still protects the Giant    |

**Single giant at level 5 (rounds 10 to 12).** It meets Fighters, Guards,
Marksmen, Catapults, Knights. The hand play shows it trades for one to three
units before it falls ([section 2](#2-what-hand-play-showed)). Each
signature adds roughly one unit's worth over its life: a Juggernaut's two
crushes are a Marksman; a Swallow is a unit and a Zombie; three Tosses are
three Kabooms; two Stomps on three units are 24 damage without retaliation;
a Glacial Smash is a Guard or a Champion killed in one turn instead of two;
a razed capital wall turns a three-turn siege into two; two Break Offs are
two Troopers. That moves a giant from "a free Knight" to "a free T-Rex":
exciting, and not a win by itself.

**Three of the same giant (round 20 and later).** The signatures that
repeat with no resource are Crushing Shove, Thunder Stomp, Overstride, and
Glacial Smash. Each needs the giant next to the enemy, where three giants
draw three times the Catapult fire that killed one in a turn. The resource
signatures are bounded: Toss by Goblins (three a turn is three Coins and
three slots), Break Off by home slots, Swallow by one victim each, Siege
Hammer by the number of walled cities. The worst stack in this reasoning is two
Brontosauruses either side of a Human line: up to 8 to each of three or
four units a turn, about the damage of four Catapult shots, while each
unmoved Bronto in front of the line takes the line's whole return fire;
that is strong and answerable.

**Against the epic's problems.** Crushing Shove, Thunder Stomp, Siege
Hammer, and Overstride are all formation breakers, and Glacial Smash and
Swallow finish fortified units; none adds defence (point 1 of the user's
notes). Removing Push from seven giants takes away a rule that was mostly
blocked in formations anyway.

**Numbers to tune first if hand play disagrees:** `STOMP_DAMAGE_V7` (4 to
3), `GLACIAL_SMASH_HP_V7` (8 to 6), `SWALLOW_MAX_HP_V7` (12 to 10),
`TOSS_RANGE_V7` (3 to 2), the Colossus's Move (2 to 1 with Overstride
still allowed on a Road half step).

## 8. Engine impact (one identity bump)

All of it is one engine change at the next free identity after `zypi`
(serial with every other identity work), `pulp-wars-poc-7r6x`.

- **Registry** (`src/engine/rules/ruleset-v7.ts`): the ability literals
  `CRUSH`, `SWALLOW`, `TOSS`, `STOMP`, `OVERSTRIDE`, `GLACIAL_SMASH`,
  `SIEGE_HAMMER`, `BREAK_OFF` in `UnitRoleAbilityV7`; `PUSH` removed from
  seven `JUGGERNAUT` role rules; the Colossus's `move` 2; role mechanics
  fields `crushDamage`, `swallowMaxHp`, `tossRange`, `stompDamage`,
  `trampleDamage`, `glacialSmashHp`, `siegeHammer`, `breakOffHp` (0 or false
  by default), the Frost Giant's `advancesAfterKill` false; constants
  `CRUSH_DAMAGE_V7`, `SWALLOW_MAX_HP_V7`, `DIGEST_DAMAGE_V7`,
  `TOSS_RANGE_V7`, `STOMP_DAMAGE_V7`, `TRAMPLE_DAMAGE_V7`,
  `GLACIAL_SMASH_HP_V7`, `BREAK_OFF_HP_V7`. `NEUTRAL_MONSTER_ROLE_MECHANICS_V7`
  sets every new field off explicitly.
- **Combat** (`combat.ts`): the crush in the Push step; the Siege Hammer's
  fortification removal, Field Defense destruction, and Walls; the
  per-attacker Shatter threshold and the shards (`ice-folk.ts`).
- **Movement** (`movement.ts`): Overstride passing and ZOC, and the trample
  step after the Move.
- **Commands** (`commands.ts`, `reducer.ts`, a new `giants.ts` like
  `ninth-unit.ts`): `SWALLOW`, `TOSS`, `STOMP`, `BREAK_OFF`, with legality,
  reducer, and the Start Turn digest step.
- **State:** a `giants` block in `GameStateV7` (like `ninthUnit`) holding
  `swallowed`, and the city field `wallsRazed`; `state-schema.ts`,
  hashing, saves, replays, and every reader of "has Walls".
- **Events** (`event-schema.ts`, `event-projection.ts`): `UNIT_CRUSHED`,
  `UNIT_SWALLOWED`, `UNIT_DIGESTED`, `UNIT_REGURGITATED`,
  `SWALLOWED_UNIT_RELEASED`, `GOBLIN_TOSSED`, `THUNDER_STOMP`,
  `UNITS_TRAMPLED`, `WALLS_DESTROYED`, `GIANT_BROKE_OFF`; the `UNITS_CHILLED`
  source `SHARDS`; the death causes `CRUSH`, `STOMP`, `TRAMPLE`,
  `DIGESTED` in every cause list (Graves, Crumbs, death blasts, risings,
  kill credit, the Slayer count).
- **Queries and previews** (`query.ts`, `view.ts`): the four commands
  offered with exact previews (`previewSwallowV7`, `previewTossV7`,
  `previewStompV7`, `previewBreakOffV7`); combat preview fields `crush`,
  `crushDamage`, `collisionDamage`, `siegeHammer`, `wallsDestroyed`,
  `glacialSmash`; the Move preview's trample list; public unit stats
  `swallowed` and a `giant` block naming the signature.
- **Text harness** (`scripts/play-text-v7.ts`): offers and prints the
  four commands and the new preview fields; `lab` gains a `--giant` flag
  that places the seat's reward giant at the front of every `*_MID` lab and
  `LAB_BREAKTHROUGH` (for the AI bead's hand play).
- **Normal AI, minimum in the engine bead:** it never issues an illegal
  command, keeps attacking with giants, and no longer counts Push for the
  seven ([section 9](#9-normal-ai)).
- **Docs:** [the current rules](RULESET_7_CURRENT.md) sections 4.8, 11,
  13.2 to 13.4, 17.6, 18, 19, 20.6, 21.4, 21.12, 22.10, 23, the revision
  history, and this document's status.

Files that already name the role and must be read for the change:
`src/ai/v7.ts` (the reward pick, `retainedUnitValue`, the target bonus,
the two Shatter tests that skip the role, the Knight-ride escort), `src/ai/v7-candy.ts`
(Sugar Toss on the Giant), `src/ai/v7-ice-folk.ts`, `src/ai/v7-martian.ts`,
`src/ai/v7-dwarf.ts`, `src/engine/v7/query.ts`, `combat.ts`, `candy.ts`,
`ice-folk.ts`, `martian.ts`, `reducer.ts`, `state-schema.ts`,
`event-schema.ts`, `event-projection.ts`.

## 9. Normal AI

The AI keeps taking every giant it is offered. Per signature, the minimum
use (the AI bead):

- **Juggernaut:** add the crush and the collision to the expected damage of
  an attack (the preview carries them); prefer a target with a unit or a
  wall behind it.
- **Abomination:** Swallow when a legal target cannot be killed by its
  attack this turn, preferring the highest cost (a Knight, a Catapult, a
  Brain); never while its own HP is below 16 (a victim freed next to a
  dying Abomination is wasted). Do not walk it next to an enemy giant.
- **Troll:** keep one or two Goblins beside it (an escort, as the Dinosaur
  Ankylosaurus escort); Toss when a landing tile exists whose Kaboom would
  deal at least 8 to hostile units net of friendly damage, or kill a unit,
  and Kaboom right after; otherwise attack.
- **Brontosaurus:** Stomp when it has not moved and the Stomp's hostile
  damage is at least its best attack's damage plus the retaliation it would
  take; prefer the attack when it kills and grows the Bronto.
- **Colossus:** let the movement search pass over units with Overstride
  (the flyer path code); value the trample; still prefer standing still for
  a full ray; stride to a Catapult or Marksman behind a screen when the ray
  is half power anyway (Cooling).
- **Frost Giant:** in the existing Shatter test (`src/ai/v7.ts`), read the
  attacker's threshold (8 for the Giant); target a Chilled neighbour first;
  it no longer advances, so it can be the anchor of the Ice Folk line.
- **Brass Titan:** send it toward the nearest walled hostile city; target the
  center's garrison first.
- **Gingerbread Giant:** Break Off when its home city has a free slot, its HP
  is at least 24, and a free tile next to it is toward the enemy.
- **Against giants:** the AI already focus-fires them. Add: do not end a
  turn next to a Frost Giant with a unit its smash would kill; keep wounded
  one-slot units out of an Abomination's reach; do not stand in two rows
  in front of a Juggernaut.

## 10. Attack effects and UI

**Effects** (code-drawn in `src/render/canvas/attack-effects-v7.ts`, as
the Battleship broadside and the heat ray; listed in
[the attack-effects record](../art/ATTACK_EFFECTS.md); every one with a
reduced-motion hold frame and a sound event in
`src/audio/sound-events-v7.ts`):

| Giant             | Cue                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Juggernaut        | the push slide stops short with a thud: both units jolt, a crack ring between them, "3" on each                                                            |
| Abomination       | a gulp: the target shrinks into the Abomination; a small belly badge with the victim's portrait and HP; the digest "−4" at Start Turn; the Zombie spat out |
| Troll             | the Goblin arcs over the board, cartwheeling, and lands with a dust puff                                                                                   |
| Brontosaurus      | a foot slam, a ground ring over the 3 × 3, dust, and a short board shake (none with reduced motion)                                                        |
| Colossus          | the walk steps over units; a stamp puff and "3" on each trampled one                                                                                       |
| Frost Giant       | the existing Shatter burst, bigger, with ice shards flying to the eight tiles and the Chill marks                                                          |
| Brass Titan       | a hammer blow; on a walled center, the wall ring crumbles into rubble and the Walls mark goes                                                              |
| Gingerbread Giant | a gingerbread chunk breaks off and rolls to the tile, where the Trooper pops up                                                                            |

**UI.** The four commands get buttons and targeting (Swallow targets, Toss
landing tiles with the Kaboom area preview, the Stomp's 3 × 3 with damage,
Break Off tiles); the attack preview shows crush, Siege Hammer, Walls, and
the Glacial Smash threshold; the Overstride Move preview marks trampled
units; the unit card states the signature in one line (the
`ninth-unit-presentation-v7.ts` pattern), and a held victim on the
Abomination's card; the city panel shows razed Walls; the Help and the unit
glossary describe the eight signatures; the reward dialog's giant line
names the signature ("A free Troll, once: throws Goblins").

**Art.** No new sprite is needed: the piece is a Toffee Trooper. The user
also called the giants samey in appearance; that is a separate art decision
([section 14](#14-open-questions-and-defaults), question 10).

## 11. Test plan

Engine (`tests/unit/ruleset-v7-giants.test.ts`, constructed states):

- **Registry:** every faction's `JUGGERNAUT` role has exactly its one
  signature ability; `PUSH` only on the Human Juggernaut; the Colossus has
  Move 2; the Frost Giant does not advance; the Giant Spider has none of the
  eight and plays as before (its existing tests unchanged).
- **Crushing Shove:** push free (no crush); blocked by a hostile unit
  (target and blocker 3), by an own unit (target only), by an Egg, by a
  mound, by water, by the board edge, by a settlement; never on an Egg,
  Jawbreaker, or icebound defender; a crush kill and a blocker kill (Grave,
  Crumbs, a Rocket Cart's death blast); Shield, Armoured, and Plated; the
  preview equal to the result; the projection under fog.
- **Swallow:** every legality row; the swallow of a Brain (release); digest
  ticks and the heal; regurgitation with and without a free tile; release on
  death (killer does not advance), on elimination, death afloat;
  victim's home slot counted; victim's owner eliminated; save, load, replay,
  and the hash with a held victim; parsing rejections.
- **Goblin Toss:** every legality row; landing next to hostile units then
  Kaboom; a sluggish Goblin cannot act; a Goblin that already acted; Field
  Defense on the landing tile; no Crumbs eaten; ZOC and terrain ignored in
  between; the preview equals the result.
- **Thunder Stomp:** moved and unmoved; flyers, ships, embarked, burrowed,
  own and allied units not hit; Eggs hit; Shield, Armoured, Plated; Field
  Defense smashed; kills, growth to Big and Alpha, a death blast chain that
  hits the Brontosaurus; the projection hides hidden units.
- **Overstride:** passing own, hostile, and allied units; ZOC; unexplored
  stop; the trample of each passed hostile unit once; a passed chest and
  Crumbs untouched; Shallow Water; half-power ray after; the Move preview.
- **Glacial Smash:** the threshold 8 against the Brittle 4 and the default
  3; not on a giant; the shards (new freeze sluggish, re-Chill not
  sluggish); no advance after a smash.
- **Siege Hammer:** fortification ignored, cover kept, retaliation
  unchanged; Field Defense destroyed when the Titan dies; Walls razed on a
  hostile center only; `wallsRazed` through capture; the level-3 reward not
  re-offered; every reader of Walls (fortification, the city panel query,
  Snow on a walled Ice Folk center).
- **Break Off** (as changed on 2026-10-09): every legality row (Crash, HP
  10 and 11, no home, the tile rules, fewer than two free tiles); the two
  Gingerbread Men's HP, home, slots (also beyond a full city), exhaustion,
  variant, and Toffee Trooper rules.
- **G4 and G5:** each new primary action in the sluggish table and the
  Crash; each new death cause in the Grave, Crumbs, blast, rising, and
  kill-credit lists.
- **Source audits and pins:** the identity, the ability and event lists,
  the schema pins, the release corpus as the identity bump requires.

AI (`tests/unit/ruleset-v7-giants-ai.test.ts`): a constructed position per
signature in which the Normal AI uses it, and one in which it correctly
does not (a killable target before a Swallow, a growth kill before a Stomp,
no Goblin in reach); the AI never issues an illegal giant command over the
headless smoke of every faction.

UI: the presentation tests of each new command, preview, and card line;
the attack-effects tests and the review evidence
(`npm run art:attack-effects-review`); the browser smoke.

Hand play (the AI bead): one game turn sequence per faction with
`lab --giant`, about five turns each, notes on what the AI did with and
against the giant.

## 12. Acceptance criteria

This bead (`w49.29`):

1. Every faction's giant has one distinct signature ability that fits the
   faction and changes how the giant is used (the summary table; no two
   share a mechanic).
2. The rules are exact and testable (sections 6.0 to 6.8), with the draft,
   the critique, and the redraft (sections 3 to 5).
3. An implementation bead table (section 13).

The implementation as a whole:

1. Each of the eight signatures works exactly as section 6 states, with a
   preview equal to the result wherever the viewer has the information.
2. Only the Human Juggernaut has Push; the Colossus has Move 2; the Frost
   Giant never advances; the Giant Spider is unchanged.
3. Saves, replays, and hashes cover held victims and razed Walls.
4. The Normal AI uses every signature in its constructed position and
   never issues an illegal giant command.
5. Each signature has a board cue, a sound, a reduced-motion frame, a unit
   card line, and a Help entry.
6. The current rules document holds the rules, and this document's status
   says what was built.

## 13. Implementation beads

| #   | Bead                                                                                                                           | Scope                                                                                                                                                                                                                                                                                          | Validation profile                                           | Depends on                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| 1   | **Giant signatures, engine** (identity bump): the eight rules, Push on the Juggernaut only, Colossus Move 2, Frost Giant stays | section 6 and section 8: registry, combat, movement, the four commands, the `giants` state block and `wallsRazed`, events and projection, queries and previews, the text harness and `lab --giant`, the AI minimum (legal, no Push value for seven), [the current rules](RULESET_7_CURRENT.md) | `ai/map/persistence` (new stored state and an identity bump) | `pulp_wars-zypi` (identity serial) |
| 2   | **Giant signatures, Normal AI**                                                                                                | section 9 for the eight giants and against them; the AI tests; hand play with `lab --giant`, about five turns per faction, notes in this document                                                                                                                                              | `ai/map/persistence`                                         | 1                                  |
| 3   | **Giant signatures, UI and attack effects**                                                                                    | section 10: the four commands' buttons and targeting, preview text, unit cards, city panel Walls, Help and glossary, reward dialog line, eight code-drawn cues with sounds and reduced-motion frames, the attack-effects review evidence                                                       | `ui/presentation`, with `npm run smoke:browser`              | 1 (may run beside 2)               |

Validation blocks for the root to put in the beads:

```text
Bead 1
Validation profile: ai/map/persistence
Worker focused checks: npm run typecheck; npm run lint; npm run format:check;
  npm test -- tests/unit/ruleset-v7-giants.test.ts and every test that names
  JUGGERNAUT, PUSH, Shatter, Walls, Infect, Bounce, or the Giant Spider;
  every source-audit test; the text-play test
Conditional final gates: npm run check; npm run validate:ruleset6-release
  (the identity bump)

Bead 2
Validation profile: ai/map/persistence
Worker focused checks: npm run typecheck; npm run lint;
  npm test -- tests/unit/ruleset-v7-giants-ai.test.ts and the faction AI
  tests; the hand play with npm run play:text
Conditional final gates: npm run check; npm run validate:ruleset6-release

Bead 3
Validation profile: ui/presentation
Worker focused checks: npm run typecheck; npm run lint; npm run format:check;
  npm test -- tests/unit/attack-effects-render-v7.test.ts
  tests/integration/attack-effects-canvas.test.ts and the presentation tests
  it touches; npm run art:attack-effects-review (evidence)
Conditional final gates: the ui/presentation set; npm run smoke:browser
  (user-visible Canvas and input change)
```

## 14. Open questions and defaults

The root decides; each default is what the beads above assume.

1. **Push off seven giants.** Default: yes (critique point 1). Alternative:
   keep Push everywhere and add the signatures.
2. **The Frost Giant never advances.** Default: yes. It is a per-unit rule
   like the Abomination's, not a change to the user's ruling that forced
   advance stays.
3. **The Colossus at Move 2.** Default: yes; without it Overstride cannot
   pass a unit except on a Road.
4. **Swallow a city's garrison.** Default: allowed (it empties the center,
   and the owner can train on it again next turn). Alternative: refuse a
   target on a settlement center.
5. **Swallow immunities.** Default: constructs, Rock Hard, two-slot units,
   giants, mind-controlled units, and Eggs cannot be swallowed.
6. **What the Troll throws.** Default: the Goblin only. Alternative: any
   one-slot Goblin unit (a thrown Bomb Chucker reaches 5 tiles: too far).
7. **Toss onto a settlement center.** Default: no (the Push conditions).
   Alternative: allow, so a Goblin can besiege a city from the air.
8. **The piece.** Default: a Toffee Trooper at 8 HP. Alternative: a new
   "Gingerbread Man" kind (a new role entry, art, and AI work).
9. **Bounce on the Gingerbread Giant.** Default: keep it.
10. **Appearance.** The user said the giants also look samey. Default: no
    new art in this round; the signature cues make each giant read
    differently on the board. Alternative: an art bead that redraws the
    eight with distinct silhouettes (a PixelLab pass under the art
    direction), after the user approves a direction.
11. **Engine and AI in one release.** Default: separate beads, but no
    release candidate between them (the engine alone makes the AI's giants
    weaker: no Push, unused commands).
12. **A cheaper Swallow.** If the off-board victim proves too costly in the
    engine bead: the Abomination kills an adjacent target of 12 HP or less
    outright with no retaliation and it rises at once as a Zombie (Infect),
    with no digest and no release. Default: the full rule.
13. **Kill credit for crush, stomp, trample, and digest.** Default: yes,
    for Promotion, growth, Slayer, and Plunder, as for splash.
14. **The numbers.** Default: the values of section 6, with the tuning
    order of [section 7](#7-balance-scenario-reasoning) if hand play
    disagrees.
