# Ruleset 7 design: the heavy line slot, technology names, and the economy rejig

**Status:** design proposal for the user to rule on. Nothing here is
implemented. It is the source for two implementation beads:
`pulp_wars-w49.16` (the economy rejig, Part C) and `pulp_wars-w49.17` (a
ninth unit for every faction and the renames, Parts A and B).

**Parts A and B are implemented** at `pulp-wars-poc-7r55`
(`pulp_wars-w49.17`): [the ninth unit](RULESET_7_NINTH_UNIT.md) records
what was built, the readings chosen where this design was silent, and
what is open. The user ruled that the Human unit is the **Champion** (this
design proposes "Templar") and asked for a quick pass with no tuning; the
Dinosaur Sawmilling kept its name Timber (this design proposes
"Chopping").

**Part C is implemented** at `pulp-wars-poc-7r54` (`pulp_wars-w49.16`):
[the economy rejig](RULESET_7_ECONOMY_REJIG.md) records it. The user ruled
for Reading A of the research price ("for now let's replace the research
price"), for the achievement table as proposed, and against decision 9 as
written: the reward giant is offered by **every city**, once, from level 6
("I want giant in every city not just capital. But we can postpone it one
level for now"), not by the capital alone. Where Part C below says
"capital level 6" or "once per player", that ruling is the rule. Parts A
and B are still a proposal.

**Baseline:** [Ruleset 7: current rules](RULESET_7_CURRENT.md) at
`pulp-wars-poc-7r52` (the Martian pass), plus the Dinosaur pass on branch
`dinosaur-pass-w49`. Every number proposed here is a **first guess** unless
it says otherwise. Damage figures were computed with the formula of
[current rules, section 13.2](RULESET_7_CURRENT.md#132-damage), both units
at full HP on open ground unless stated.

**The user's direction (2026-10-07).** On the Human Swordsman: "1) this
creates asymmetry - no other faction has a unit in this slot 2) the unit is
disproportionately useful 3) the technology that unlocks this unit is the
most overloaded of all tech. 4) thematically it is unfortunate. the unit is
called a swordsman but the basic fighter also wields a sword." Then: "if
the unit really has an important niche to fill then keep it but fill the
same niche for other factions as well. But rename it and rethink other tech
naming too. 'drill' is pretty vague and sounds like it has to do with
drilling holes. While you're at it, let's rejig the economy a bit. allow
windmills and similar to count farms from adjacent cities and let's have
monuments give 3 population instead of 2. To balance this, let's make tech
cost progression more steep with +1 +2 + 3 per extra city, and let's use
harder criteria to get the monuments. Maybe keep the easiest one relatively
easy but make the other ones harder so they are reached later in the game
if at all."

**Rulings given while this was written (2026-10-07).** "the 'gaming' of the
system by delaying capturing cities is a fine strategic choice and self
limiting. fewer cities means less money and opportunity for your opponent
to capture them. I would prefer to have the same number of units in each
faction. the extra unit doesn't have to fill the same exact niche as long
as it can be made unique and useful in some way. doesn't have to be a line
fighter although it would be ideal to keep that symmetry. so that there is
always someone to brute force the way through, someone to soften defences,
someone to deal with crowds (knight) etc. Note that if triceratops is
already doing the job of the swordsman then we can just move triceratops
into the swordsman slot and invent some new dino to do the job of the
catapult (ish)".

**Superseded in part at `pulp-wars-poc-7r56`** ([the Industry reshuffle](RULESET_7_INDUSTRY_RESHUFFLE.md), `pulp_wars-w49.21`): the defender of every faction is unlocked by Fortification and not by the root, the Workshop by the root and not by Engineering, and the root is shown as Crafting, not Garrison. The tables of this design show the placement it proposed for `7r55`. Nothing else here changed, and no number did.

## Summary

**Units.** Every faction gets a ninth land unit, so all eight have nine:
basic line, defender, fast, ranged, support, siege, breakthrough, **heavy
line**, and the reward giant. The heavy line unit is the one that "brute
forces the way through": the mid-game melee body that makes the basic unit
obsolete, kills a defender in two or three blows, survives one hit from a
breakthrough unit, walks one tile, and cannot shoot.

- It unlocks at **one node for every faction: Metallurgy** (tier 3 of the
  Industry branch, proposed name **Armoury**), which none of the four full
  faction games bought. Engineering goes back to Mines, Workshops, and
  Mountains.
- The Human unit keeps its numbers, is renamed **Templar**, moves one tier
  later, and costs **6** Coins (5 before). Gating it later is the
  correction, following the user's rule: "If something is too strong too
  early, gate it behind a later technology rather than weakening it."
- Four factions get a **new heavy**: Goblin **Ogre** (counts as two for
  Gang Up), Undead **Wight** (rises once from its own Grave), Martian
  **Shock Trooper** (its Shield shocks whoever hits it hand to hand), Candy
  **Jawbreaker** (nothing can move it).
- Three factions already have the brute and **move it into the slot**, and
  get a new unit for the job it leaves: Dinosaur **Triceratops** moves, new
  **Stegosaurus** (a tail-flung siege shot that cracks armour); Ice Folk
  **Mammoth** moves, new **Musk Ox** (a cheap defender that chills what
  hits it); Dwarf **Steam Tank** moves, new **Whirligig** (a clockwork
  crowd-fighter with three attacks a turn).

**Names.** Eight shared technology names change: Drill → **Garrison**,
Administration → **Leadership**, Planning → **Land Grants**, Fieldcraft →
**Pathfinding**, Metallurgy → **Armoury**, Shorecraft → **Sailing**, Naval
Engineering → **Shipbuilding**, Seamanship → **Boarding**. Where a
faction's unit makes a shared name silly, the node is shown under the
unit's name (Goblin Sawmilling is "Rocket Carts", Martian Chivalry is
"Motherships"). IDs do not change.

**Economy.**

- **Mills.** Today a Windmill already counts a neighbouring city's Farms;
  what it may not do is share one. New rule: a mill counts **every** Farm,
  Lumber Camp, or Mine of yours next to it, so a Farm between two cities'
  Windmills feeds both. Worth at most +4 population to a pair of cities,
  about one level each. Markets do not change.
- **Monuments** give **+3** population (2 today): a whole level for any
  city up to level 2.
- **Research** costs the tier base (5 / 7 / 9) **plus 1 / 2 / 3 Coins per
  city beyond the first**, replacing the "+1 per technology owned" term
  (recommended; the user must confirm "replaces" against "adds to"). A
  six-city player pays 24 for a tier 3 technology (13 today), a
  twelve-city player 42 (about 22 today).
- **Achievements.** One stays easy (Explorer: half the map). The others
  get harder: 8 cities, 6 kinds of unit, a mill at 7, an enemy **capital**,
  5 warships, 7 kills. No achievement needs a technology any more.
- **Combined.** Income barely moves; technology counts fall by about a
  quarter for a wide player (about 10 technologies at round 20 instead of
  13). The reward giant at capital level 5 already arrived by round 10 or
  11; recommended at **level 6**.

## Decisions for the user

Each with the recommendation. Items 1 to 4 block the implementation beads.

1. **Research price: does "+1 / +2 / +3 per extra city" replace or add to
   "+1 per technology owned"?** Recommend **replace**
   ([C.3](#c3-research-price-1--2--3-per-extra-city)). Adding both makes a
   tier 3 technology cost 43 at eight cities and hurts the Normal AI, which
   already researches too little.
2. **The heavy slot unlocks at Metallurgy for every faction**, and
   Engineering loses the unit ([A.2](#a2-where-the-slot-unlocks)).
   Recommend yes.
3. **The Human unit's name.** Recommend **Templar**; the other candidates
   are Man-at-Arms and Champion ([A.3](#human-templar)). And its price:
   recommend **6**.
4. **Per faction, the ninth unit** ([A.3](#a3-one-unit-per-faction)).
   Recommend: new heavies for Goblins, Undead, Martians, and Candy; move
   and backfill for Dinosaurs (Triceratops, new Stegosaurus), Ice Folk
   (Mammoth, new Musk Ox), and Dwarves (Steam Tank, new Whirligig). The
   alternative for each of the last three is to leave the existing unit
   where it is and add a new heavy (Dinosaur: none worth making; Ice Folk
   Woolly Rhino; Dwarf Boilerplate), sketched in the same section.
5. **The technology renames** ([Part B](#part-b-technology-names)).
   Recommend the eight shared renames and the per-faction unit names.
   "Garrison" looks a little like "Gathering"; the fallback is "Guard
   Duty".
6. **Mills count shared contributors; Workshops count neighbours' land
   too; Markets stay as they are**
   ([C.1](#c1-mills-and-their-neighbours)). Recommend yes.
7. **Monuments +3** ([C.2](#c2-monuments-give-3)). As directed.
8. **The seven achievement criteria**, and **no technology requirement**
   on any of them ([C.4](#c4-harder-achievements)). Recommend the table.
9. **The reward giant at capital level 6** instead of 5
   ([C.5](#c5-the-combined-effect)). Recommend yes.
10. **The Triceratops in the heavy slot takes the War Drums bonus** (it is
    excluded today because it wears the siege label). Recommend: keep it
    excluded by a role flag until the Dinosaur retest
    ([Dinosaur](#dinosaur-triceratops-moves-new-stegosaurus)).

## Part A: the heavy line slot

### A.1 The niche

**What the Human unit does that nothing else did.** From
[the Human tuning, section 12.4](RULESET_7_TUNING_HUMAN.md#124-the-swordsman)
and the hand-played games:

- **It makes the 2-Coin basic unit obsolete.** "I bought no Fighter after
  round 17" (`r5a`); "none trained after R14; pointless once the Swordsman
  is affordable" (`r8c`). A Wolf Rider with two helpers killed a full
  Fighter in one hit; the Swordsman survives it.
- **It kills a defender in melee over two turns.** 8 to a full Guard, then
  9: dead on the second blow, taking 6. A Fighter needs four attacks and
  takes 8 each time.
- **It is not one-shot by the breakthrough unit.** A Knight deals it 11 of
  15 and takes 4, so a lone Knight's Overrun stops on it.
- **It is slow and cannot shoot.** Move 1, range 1. Two Catapults kill it
  (7, then 8); three Marksmen kill it (4, 5, 6); it is pulled out of cover
  by the forced advance after a kill, which is how most of the testers'
  Swordsmen died.

That is the job in the user's words: "someone to brute force the way
through".

**Why it was "disproportionately useful".** The numbers were fair against
each unit they were tested on; the problem was where and for how much.

| Game  | Swordsmen bought        | What the report says                                                                   |
| ----- | ----------------------- | -------------------------------------------------------------------------------------- |
| `r5a` | 21 of 45 units          | "Fighters until round 14, then almost only Swordsmen (5) and Marksmen (4)"             |
| `r7c` | 11 (7 lost)             | "After Engineering and Sawmilling I had no reason to buy a Fighter, Guard or Marksman" |
| `r8c` | 13 of 32 units          | "the workhorse, fairly priced"; none of its Fighters was trained after round 14        |
| `r8c` | 13 by the Human AI seat | a rich Human AI fields it as its line too                                              |

- Against the other factions it kills a Caveman, a Raptor, a Spitter, and
  a Shaman in one attack (the Dinosaur tuning record) and a Grunt through
  its Shield (`mb`).
- At **5 Coins** a level-3 city with one trade Coin buys one every turn
  with nothing saved for. It sat at the price of a Captain while doing the
  work of an 8-Coin unit.
- At **tier 2** it arrived as the second technology (7 Coins), on the same
  node as the faction's best growth (Mines, Workshops), ten rounds before
  a Catapult or a Knight could answer it.
- **No other faction had it**, so a Human line simply outweighed every
  other faction's line from about round 12.

**The correction.** One tier later, one Coin dearer, and the same job for
everyone. The numbers stay.

- **Tier 3.** The heavy now arrives with the Catapult and the Knight, not
  before them, and its path (two technologies, then the node) costs what
  theirs does.
- **Price band.** The heavy costs **5 to 7 Coins on its faction's scale**
  (Goblin 5; Human, Undead, Martian, Candy, Ice Folk 6; the Dinosaur and
  Dwarf brutes stay at their own 8 and 9). The Human one is 6, or 5 in a
  city with a working Forge (Arms Industry, the same node).
- **The weakness is the existing one**, and every faction's heavy keeps
  it: Move 1 (or a real cost for more), no ranged attack, the forced
  advance, and two siege shots or three ranged shots kill it.

**How it fits the user's economy thesis.** "The cheapest warriors are
pretty useless against the high level units so you're constantly under
pressure to buy a high level unit every turn in every city. since cities
in mid game produce 5-6 coins and the high level units cost 8-9 you're
never in a position to hoard cash." The heavy is that unit for the line: a
level-4 city with a trade Coin earns 5 and cannot quite buy a 6-Coin heavy
every turn; a city with a Market can, and then has nothing left for a
Catapult or a Knight at 8 or 9. Making the Fighter obsolete in the middle
of the game is therefore the intent, not the defect. The defect was that
it happened at tier 2 for 5 Coins and for one faction.

### A.2 Where the slot unlocks

Engineering today gives Mountain entry, +1 Sight on Mountain, the Mine, the
Workshop, Redevelop, **and** the unit. The candidates:

| Node (tier)        | Gives today                                                         | As the heavy's node                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineering (2)    | Mountains, Mine, Workshop, Redevelop, the unit                      | the user's point 3: overloaded, and the best unit sits with the best growth                                                                                                                           |
| **Metallurgy (3)** | Forge; Arms Industry (−1 Coin on land units in a city with a Forge) | **recommended.** Never bought in any of the four full faction games (`gb`, `ub`, `mb`, `db`); a unit in plate from the node that forges it; same branch, so the branch reads defender → Mines → heavy |
| Fortification (2)  | Field Defense; five factions have their own unlock here             | every faction's signature defensive node; a unit on top overloads it and puts the heavy at tier 2 again                                                                                               |
| Explosives (3)     | Blast Mountain, Breach; six factions have their own unlock here     | already the densest tier 3 node                                                                                                                                                                       |
| Fieldcraft (3)     | Replant Forest, Forest march, ranged Sight 2 (Martian: Heat Sinks)  | the other node testers skip, but a heavy infantry unit has nothing to do with Forest craft, and Wilds would then hold three units                                                                     |
| Planning (3)       | +1 unit slot in every city, Land Grant                              | already bought for the slot; Settlement would hold two units and Industry one                                                                                                                         |

**Recommendation: Metallurgy, for all eight factions.** After the change:

| Node                           | Gives                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Drill (tier 1; "Garrison")     | reveal Ore; the defender; Spoils. Unchanged.                                              |
| Engineering (tier 2)           | land units enter Mountain; +1 Sight on Mountain; Mine; Workshop; Redevelop. **No unit.**  |
| Metallurgy (tier 3; "Armoury") | Forge; Arms Industry; **the heavy line unit**. Three lines, of which two are the Forge's. |

No node is empty and none carries more than one unit. Arms Industry stays:
it makes the node's two halves work together (a Forge city trains the
heavy for 1 less).

**For the three factions that move an existing unit**, the node that unit
leaves keeps a unit, because the new unit is placed there:

| Faction  | Node the brute leaves    | What that node gives afterwards           |
| -------- | ------------------------ | ----------------------------------------- |
| Dinosaur | Sawmilling (Triceratops) | Sawmill (Chopping Block); **Stegosaurus** |
| Ice Folk | Drill (Mammoth)          | reveal Ore; **Musk Ox**; Spoils           |
| Dwarf    | Chivalry (Steam Tank)    | **Whirligig**; Cultivate Forest           |

**Research order of each faction's Normal AI** (the heavy needs two
technologies before its node, Drill and Engineering, and both pay the AI
on the way: a defender, then Mines):

| Faction  | Consequence                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | Marksman, Guard, Engineering, **Templar**, Catapult, Knight, Captain: the heavy is still its third unit, one technology later.          |
| Goblin   | Bomb Chucker, Wolf Rider, Orc Brute, Rocket Cart, Warboss, **Ogre**, Scrap Buggy: the Ogre shares the Brute's root.                     |
| Undead   | Zombie, Banshee, Necromancer, Lich, **Wight**, Ghoul, Vampire: the Wight before the Vampire, which the AI almost never reached.         |
| Martian  | Shield Projector and Force Fields first as today, then Engineering and the **Shock Trooper** before the Tripod when its enemy is melee. |
| Dinosaur | The Triceratops path changes from Hunting, Forestry, Sawmilling to Drill, Engineering, Metallurgy; the Stegosaurus takes the old path.  |
| Dwarf    | Steam Mole, then Engineering and the **Steam Tank**; the Whirligig last, where the Tank was.                                            |
| Ice Folk | **Musk Ox** with Drill; the Mammoth two technologies later than today.                                                                  |
| Candy    | Marshmallow, then Engineering and the **Jawbreaker** before the Chocolate Bunny.                                                        |

### A.3 One unit per faction

**The count.** Every faction has eight land roles today (Humans nine with
the Swordsman); after this proposal every faction has nine. The Ice Folk
have no ships; the other seven share three.

**The jobs.** The user's list, "someone to brute force the way through,
someone to soften defences, someone to deal with crowds", as a table. **Bold**
is new or moved. _Italic_ marks a unit that does the job only loosely; the
note under the table says how.

| Job                     | Human       | Goblin       | Undead      | Martian           | Dinosaur        | Ice Folk     | Dwarf            | Candy             |
| ----------------------- | ----------- | ------------ | ----------- | ----------------- | --------------- | ------------ | ---------------- | ----------------- |
| Basic line              | Fighter     | Goblin       | Skeleton    | Grunt             | Caveman         | Yeti         | Hammerer         | Toffee Trooper    |
| Defender                | Guard       | Orc Brute    | Zombie      | Shield Projector  | Ankylosaurus    | **Musk Ox**  | _Steam Mole_     | Marshmallow       |
| Fast                    | Raider      | Wolf Rider   | Ghoul       | _Saucer_          | Raptor          | Sled         | _Gyrocopter_     | Donut Racer       |
| Ranged                  | Marksman    | Bomb Chucker | _Banshee_   | Ray Gunner        | Spitter         | Snow Hunter  | Clockwork Gunner | Gumball Gunner    |
| Support                 | Captain     | Orc Warboss  | Necromancer | Brain             | Shaman          | Ice Witch    | Engineer         | Confectioner      |
| Soften defences         | Catapult    | Rocket Cart  | Lich        | Tripod            | **Stegosaurus** | Boulder Yeti | Steam Cannon     | Pie Launcher      |
| Deal with crowds        | Knight      | Scrap Buggy  | _Vampire_   | _Mothership_      | T-Rex           | _Sabretooth_ | **Whirligig**    | _Chocolate Bunny_ |
| **Brute force (heavy)** | **Templar** | **Ogre**     | **Wight**   | **Shock Trooper** | **Triceratops** | **Mammoth**  | **Steam Tank**   | **Jawbreaker**    |
| Reward giant            | Juggernaut  | Troll        | Abomination | Colossus          | Brontosaurus    | Frost Giant  | Brass Titan      | Gingerbread Giant |

Loose cells:

- **Steam Mole (defender).** It holds a tile (Defense 2.5, Dig In) but its
  identity is the tunnel; it also attacks after moving. Left as it is.
- **Saucer, Gyrocopter (fast).** Flyers that scout and never capture; the
  Gyrocopter's attack is a bomb. By earlier design.
- **Banshee (ranged).** An area Wail with no targeted shot. By earlier
  design.
- **Vampire, Mothership, Sabretooth (crowds).** None has Overrun. The
  Vampire is a duellist (Unanswered, Lifesteal, Escape) and the Undead
  crowd answer is the Lich's splash and the Banshee's Wail. The Mothership
  pulls garrisons off centres and the Martian crowd answer is the Tripod's
  Pierce. The Sabretooth is an assassin (Prowl) and the Ice Folk crowd
  answer is the Mammoth's Sweep. This proposal does not change them; if
  the user wants the crowd job filled strictly, these three are where a
  later pass would look.
- **Chocolate Bunny (crowds).** It chains only while Rushed, at most three
  attacks, every other turn.

No faction needs the "different niche" escape the user allowed: all eight
can field a brute that is not a reskin.

**Per-unit summary** (details below; cost in Coins; A / D = Attack /
Defense):

| Faction  | Heavy line unit   | New or moved            | Cost |  HP | A / D     | Move | Its mechanic                                                    | Also new                                   |
| -------- | ----------------- | ----------------------- | ---: | --: | --------- | ---: | --------------------------------------------------------------- | ------------------------------------------ |
| Human    | **Templar**       | renamed, one tier later |    6 |  15 | 3.5 / 2.5 |    1 | none: the baseline                                              | —                                          |
| Goblin   | **Ogre**          | new                     |    5 |  16 | 2.5 / 2   |    1 | **Heavyweight:** counts as two units for Gang Up                | —                                          |
| Undead   | **Wight**         | new                     |    6 |  14 | 3 / 2.5   |    1 | **Rise Again:** returns once from its own Grave at half HP      | —                                          |
| Martian  | **Shock Trooper** | new                     |    6 |  12 | 3 / 2     |    1 | **Shock Field:** while Shielded, a melee attacker takes 3       | —                                          |
| Dinosaur | **Triceratops**   | moved from Sawmilling   |    8 |  20 | 3 / 2     |    2 | Charge! (unchanged)                                             | **Stegosaurus** (siege): Thagomizer cracks |
| Ice Folk | **Mammoth**       | moved from Drill        |    6 |  20 | 2.5 / 2   |    1 | Sweep, Trample (unchanged)                                      | **Musk Ox** (defender): Frostbite          |
| Dwarf    | **Steam Tank**    | moved from Chivalry     |    9 |  16 | 3 / 2     |    2 | Plated 4 (unchanged)                                            | **Whirligig** (crowds): Three Hammers      |
| Candy    | **Jawbreaker**    | new                     |    6 |  16 | 3 / 2.5   |    1 | **Rock Hard:** nothing pushes, pulls, or bounces it; Sugar Rush | —                                          |

Shared by every heavy unless its row says otherwise: tactical label
`LINE`, melee, attacks after moving, captures, advances after a kill (the
forced advance is not changed), builds no Field Defense, one unit slot,
Disband refund half its cost rounded down.

**The same four attackers against each heavy** (damage dealt / damage
taken back; "×n" is how many fresh attackers kill it):

| Heavy (HP)         | Knight on it      | Catapult | Marksman | Fighter   | It deals a Human Guard         |
| ------------------ | ----------------- | -------- | -------- | --------- | ------------------------------ |
| Templar (15)       | 11 / 4            | 7, ×2    | 4, ×3    | 4 / 6, ×3 | 8 / 6, dead in 2               |
| Ogre (16)          | 12 / 3            | 8, ×2    | 5, ×3    | 5 / 5, ×3 | 5 alone, 8 or 12 with helpers  |
| Wight (14)         | 11 / 4            | 7, ×2    | 4, ×3    | 4 / 6, ×3 | 7 / 7, dead in 3 (2 Frenzied)  |
| Shock Trooper (12) | 12 (9 HP) / 3 + 3 | 8, ×2    | 5, ×3    | 5 / 5 + 3 | 7 / 7, dead in 3 (2 Commanded) |
| Triceratops (20)   | 12 / 3            | 8, ×3    | 5, ×4    | 5 / 5, ×4 | 10 / 6 after one tile          |
| Mammoth (20)       | 12 / 3            | 8, ×3    | 5, ×4    | 5 / 5, ×4 | 5 / 7, and 2 to each flank     |
| Steam Tank (16)    | 4 (Plated) / 3    | 4, ×4    | 4, ×4    | 4 / 5, ×4 | 7 / 7, dead in 3               |
| Jawbreaker (16)    | 11 / 4            | 7, ×2    | 4, ×4    | 4 / 6, ×4 | 7 / 7, dead in 3 (10 Rushed)   |

No full-HP heavy dies to one Knight, so every faction has a unit a Knight
chain stops on. Every heavy dies to two or three siege shots or three or
four ranged shots, so none is safe without a screen.

#### Human: Templar

- **Name.** The unit's art is a closed great helm with a gold cross, full
  plate, a crimson tabard, a two-handed greatsword, and no shield. Three
  candidates, none of which says "sword":
  - **Templar** (recommended): one word, matches the art exactly, the same
    register as Knight, and no other Human unit starts with T. It is the
    name of a historical order; if that is unwanted, take the next.
  - **Man-at-Arms:** the plain historical word for a soldier in full
    armour. Longer, and next to "Marksman" in a list.
  - **Champion:** plain and weapon-free, but it could be read as "a
    promoted unit", and Captain and Catapult already start with C.
- **Look.** Unchanged: a knight on foot in a closed great helm and crimson
  tabard with a gold cross, greatsword held in both hands.
- **Role.** Heavy line. 6 Coins (5 with a Forge), 15 HP, Attack 3.5,
  Defense 2.5, Move 1. Needs Metallurgy.
- **Mechanic.** None. The Humans are the baseline faction
  ([design principles, section 1](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#1-product-direction));
  the other seven heavies are defined against this card.
- **Beats.** Every defender in two blows (Zombie 10 + 8, Orc Brute 9 + 6,
  Marshmallow 9 + 9, Steam Mole 9 + 7; an Ankylosaurus takes three) and
  every basic unit in one or two.
- **Beaten by.** Two Catapults, three Marksmen, three Fighters (4, 5, 6),
  a Rocket Cart with one helper and WAAAGH!, a charging Triceratops.
- **One-best-unit check.** It was the one best line unit at tier 2 for 5.
  At tier 3 for 6 it arrives beside the Catapult and the Knight and
  competes with them for the same Coins; the Guard keeps its two jobs (a
  walled centre, and the unit a Zombie bites). Retest: Humans first.
- **Role ID.** The engine role `SWORDSMAN` keeps its ID; only its display
  name and tactical label change.

#### Goblin: Ogre

- **What the faction has near the niche.** The Orc Brute (3 Coins, 15 HP,
  2 / 2.5) is a defender: it cannot attack after moving. The Goblin tuning
  record decided the faction did "not need" a heavy
  ([Goblin tuning, fork 8](RULESET_7_TUNING_GOBLIN.md)); the user's ruling
  on equal unit counts overrides that. Nothing existing is the brute: the
  Scrap Buggy is the crowd unit (Ram) and the Rocket Cart the softener.
- **Name and look.** **Ogre.** A fat grey-green ogre twice a goblin's
  height in a scrap-iron belly plate, dragging a lamp-post club, two
  goblins cheering on its shoulders.
- **Numbers.** 5 Coins, 16 HP, Attack 2.5, Defense 2, Move 1. No Kaboom,
  no death blast, not Blast-proof.
- **Mechanic: Heavyweight.** **An Ogre counts as two units for Gang Up.**
  One Ogre beside a target gives every other Goblin attack on that target
  the full +2 (a rocket still takes +1 at most and a bomb none). Its own
  attack takes Gang Up like any Goblin's: 5 on a Guard alone, 8 with one
  helper, 12 with two.
- **Why it is not a reskin.** It is the worst heavy alone (it needs three
  blows on a Guard) and the best one in a mob: it replaces the two
  helpers that die every turn (`gb`: 12 Goblins lost as helpers) with one
  body that does not.
- **Beats.** With a Wolf Rider or a Scrap Buggy beside the same target,
  any defender in one turn.
- **Beaten by.** Its own side: it is not Blast-proof, so Kaboom, bombs,
  and death blasts hurt it, which the Orc Brute beside it ignores.
  Marksmen (5 a shot), and anything that kills the Goblins around it.
- **One-best-unit check.** An army of Ogres is five weak heavies; the
  value is one Ogre per mob. The Rocket Cart stays the kill at range.
- **Signature interactions.** A Zombie's bite turns it like any unit. A
  Brain may take it, and a controlled Ogre gives no Gang Up to anyone
  (helpers are the attacker's owner's units, and the controller is not a
  Goblin seat).

#### Undead: Wight

- **What the faction has near the niche.** The Zombie (3 Coins, 18 HP) is
  the wall and never attacks after moving or advances; the Abomination is
  the reward giant and stays. The unit that walks up and finishes what a
  Zombie bit is the Skeleton, which "is still a weaker Fighter" (`ub`).
  The Undead AI bought Zombies and nothing else (`r8c`).
- **Name and look.** **Wight.** A tall barrow-king in rusted crowned
  helm and corroded mail, pale blue light in the eye slits, a notched
  greataxe over one shoulder.
- **Numbers.** 6 Coins, 14 HP, Attack 3, Defense 2.5, Move 1.
- **Mechanic: Rise Again.** **When a Wight dies and leaves a Grave, it
  climbs out of that Grave at the start of its owner's next turn, once, at
  7 HP.**
  - The Grave must still be there and no unit may stand on it; otherwise
    the Wight waits for the first of its owner's turns when the tile is
    free. A Raise Dead or a Devour of that Grave ends it.
  - A returned Wight is a rising: no home city, no unit slot, no kills. It
    does not rise a second time.
  - Only a Wight owned by an Undead seat rises (a mind-controlled one does
    not, the Crumbs precedent).
- **Counters that follow from existing rules.** A melee killer advances
  onto the tile (the forced advance) and so stands on the Grave. A Wight
  that was Bitten rises as a Zombie instead and leaves no Grave. A
  Shattered Wight leaves no Grave. A death on a city or village centre
  leaves no Grave. So: kill it hand to hand, or kill it at range and walk
  onto the Grave.
- **Beats.** Fighters and wounded or Bitten units; a Guard in two blows
  with Frenzy. It is the mover that finishes what Zombies bite, so more
  kills rise.
- **Beaten by.** Guards hand to hand (it takes 7 back), Catapults and
  Marksmen with one unit to step on the Grave, a Captain's Tend Wounded
  on the units it would have finished.
- **One-best-unit check.** It cannot bite, so it converts nothing by
  itself; without Zombies and a Lich it is a 6-Coin Skeleton with two
  lives. Risk to watch: Zombie plus Wight plus Lich may leave the Ghoul,
  Banshee, and Vampire even less to do than `ub` found.

#### Martian: Shock Trooper

- **What the faction has near the niche.** Nothing. "Nothing ever fights
  hand to hand" (`mb`); the Grunt has 8 HP, and "a Swordsman's 11 kills a
  Grunt through Shield 2". The Tripod is the softener and the Mothership a
  siege tug; neither is a brute.
- **Name and look.** **Shock Trooper.** A squat one-eyed Martian sealed
  in a domed chrome battle-suit with one heavy pincer arm, small
  lightning arcs crawling over the dome.
- **Numbers.** 6 Coins, 1 slot, 12 HP, Shield 3, Attack 3, Defense 2,
  Move 1, ground. Range 1: the faction's only melee unit. Its attack is an
  ordinary attack, not a heat ray.
- **Mechanic: Shock Field.** **While its Shield has at least 1 point, a
  unit that attacks it from the next tile takes 3 damage.**
  - It is decided by the Shield before the hit, so the attacker is shocked
    even when its blow kills the Trooper. Shields absorb the shock first;
    Armoured and Plated apply. A unit the shock kills is the Trooper's
    kill.
  - Never against an attack from two or more tiles, and never when the
    Trooper is the attacker.
- **Why it is not a reskin.** It teaches the order of an assault: shoot
  the Shield off, then go in. A Human Knight that charges a fresh one
  deals 12 (3 to the Shield, 9 to HP, leaving 3) and takes 6 (retaliation
  3, shock 3); the second Knight, with the Shield down, kills it for 0.
- **Beats.** Fighters, Guards with Psychic Command (10, then dead), and
  any melee unit that attacks it first.
- **Beaten by.** Any ranged hit first (a Marksman's shot strips the
  Shield), Catapults, and its own forced advance, which walks it out of
  the Force Field ring.
- **One-best-unit check.** The Martian army is still rays around a
  Projector; the Trooper is the body in front. It has Move 1 and no ray,
  so a line of only Troopers is outranged by everything.
- **Signature interactions.** Under a Force Field its Shield is 4 and is
  refilled, so the shock is up nearly every turn: a strong pairing that
  dies with the Projector. A Zombie's bite needs HP damage, so a hit the
  Shield absorbs does not bite, and the Zombie takes 3. Mind Control of
  an enemy heavy is the Brain's best target and needs no new rule.

#### Dinosaur: Triceratops moves, new Stegosaurus

- **Who is the brute.** The **Triceratops**. It "carried the army": 24 of
  38 kills, eight laid, none lost (`db`). It wears the Catapult's role but
  is a melee line-breaker that walks up, ignores fortification, shoves the
  defender, and takes its tile. The Ankylosaurus is the defender and "had
  no job" as an attacker. Adding a third heavy body would be redundant, so
  the Triceratops moves into the heavy slot, as the user suggested.
- **Triceratops in the slot.** Unchanged numbers and rules (8 Coins, two
  slots, 20 HP, 3 / 2, Move 2, Charge!). It now needs **Metallurgy**
  (Drill, Engineering, Metallurgy) instead of Sawmilling (Hunting,
  Forestry, Sawmilling). That also ends "an economy node and the core
  attacker in one" for the Dinosaurs
  (the Dinosaur tuning record on branch `dinosaur-pass-w49`, section 4.1).
  - **Label.** In the heavy role its tactical label is `LINE`. Today the
    `SIEGE` label keeps War Drums off it. Recommend a role flag that keeps
    that exclusion until the Dinosaur retest (decision 10).
- **The job it leaves: soften defences.** The Dinosaurs have never had a
  unit that does it from range. `db`: "Every Guard I killed after R16 was
  opened by Spitters first."
- **Name and look.** **Stegosaurus.** A plated Stegosaurus caught at the
  top of a tail swing, a boulder flying off its spiked tail.
- **Numbers.** 7 Coins, Egg, hatches in 2 turns, **1 slot**, 12 HP (16
  Big, 20 Alpha), Attack 2.5 (3.5 Alpha), Defense 1, Move 1, range 2–3,
  cannot attack after moving, never advances, no capture. Needs
  Sawmilling.
- **Mechanic: Thagomizer.** **A unit it hits is Cracked: it has 1 less
  Defense (never below 0.5) until the end of the Stegosaurus's owner's
  turn.** It does not stack. Like a Catapult, its shot destroys a Field
  Defense on the target's tile.
- **Why it is not a reskin.** A Catapult does damage; this one sets up the
  charge. It deals a Human Guard 8 (the Guard is open to ranged attacks)
  and leaves it at Defense 2, so a Triceratops with a one-tile run-up then
  kills it. On a Templar: 6, and Defense 1.5 for whatever follows.
- **Beats.** Defenders, for the units behind it. **Beaten by.** Anything
  that reaches it (Defense 1), like every siege unit.
- **One-best-unit check.** `db` flagged the Triceratops itself (none lost
  of eight). Moving it one branch away from the faction's economy and two
  technologies behind a defender is the first correction; the Dinosaur
  retest must look at the growth heal again.
- **Alternative (not recommended).** Leave the Triceratops at Sawmilling
  and add a new heavy. The roster would then hold three 20-HP bodies
  (Ankylosaurus, Triceratops, the new one) with no softener, which is the
  redundancy the brief warns against.

#### Ice Folk: Mammoth moves, new Musk Ox

- **Who is the brute.** The **Mammoth**. It wears the defender's role but
  costs 6 Coins, has 20 HP, attacks after moving, sweeps both flanks, and
  tramples Field Defense: it is already priced and built as the heavy. It
  is also the dearest tier 1 unit in the game, available as a free opening
  technology.
- **Mammoth in the slot.** Unchanged numbers and rules. It now needs
  **Metallurgy** instead of Drill.
- **The job it leaves: defender.** The Ice Folk have never had a cheap
  body that holds a tile; their basic Yeti has 9 HP.
- **Name and look.** **Musk Ox.** A low, shaggy cream-furred ox with
  frost-rimed horns, head down, breath steaming.
- **Numbers.** 4 Coins, 16 HP, Attack 1.5, Defense 2.5, Move 1, cannot
  attack after moving, captures. Needs Drill.
- **Mechanic: Frostbite.** **A unit that attacks it from the next tile and
  survives is Chilled.** (Chill as in
  [current rules, section 21.2](RULESET_7_CURRENT.md#212-frozen): sluggish
  on its next turn, and open to Shatter.) It applies whether or not the Ox
  survives.
- **Why it is not a reskin.** Every other defender punishes an attacker
  with damage or position (retaliation, Bounce, a bite). This one marks
  it: whatever hits the Ox is next turn's Shatter target and can move or
  act, not both.
- **Beats.** Melee attackers, by proxy. A Knight deals it 11 of 16, stops,
  is Chilled, and is Shattered at 3 HP or less by the next Yeti.
  **Beaten by.** Ranged and siege units, which are never Chilled by it.
- **One-best-unit check.** It deals 3 to a Fighter; it wins nothing alone.
- **Risk.** This is the largest change to an existing faction in the
  proposal: the Ice Folk lose their 6-Coin beast in the first ten rounds
  and gain a 4-Coin wall. The Ice Folk have not had their faction pass
  yet, so it can be judged there.
- **Alternative.** Leave the Mammoth at Drill and add a heavy at
  Metallurgy: a **Woolly Rhino** (6 Coins, 16 HP, 3 / 2, Move 1) with
  **Icebreaker** (its own attacks Shatter a Chilled unit at 2 HP more).
  The faction would then have two 6-Coin beasts and still no cheap wall.

#### Dwarf: Steam Tank moves, new Whirligig

- **Who is the brute.** The **Steam Tank**. It wears the Knight's role but
  has Move 2, no Overrun, and Plated 4 (no hit deals it more than 4): it
  grinds through a line, it does not chain through a crowd. The Dwarves
  have nobody for crowds except an eruption or a bomb.
- **Steam Tank in the slot.** Unchanged numbers and rules (9 Coins, 16
  HP, 3 / 2, Move 2, Plated 4, no capture). It now needs **Metallurgy**
  instead of Chivalry. It stays the dearest heavy, in keeping with a
  faction that is "heavy, slow and built to last"
  ([Dwarf art fragment](../art/factions/DWARF.md#identity)). It does not
  capture; the Hammerer and the Mole do. (If the user wants every heavy to
  capture, give it Capture and say so.)
- **The job it leaves: deal with crowds.**
- **Name and look.** **Whirligig.** A wind-up spinning top of soot-black
  iron on one wheel, a big copper key in its back, three hammers on
  chains flying out around it, the green lamp on top.
- **Numbers.** 9 Coins, 12 HP, Attack 3, Defense 1.5, Move 3, no capture.
  A construct and a machine: Unflinching on attack, never heals except by
  Repair, never Bitten, never mind-controlled, leaves no Grave
  ([current rules, section 22.6](RULESET_7_CURRENT.md#226-clockwork)).
  Needs Chivalry.
- **Mechanic: Three Hammers.** **It may attack three times in a turn,
  each time a different unit, all from the tile where it made the first
  attack.** It never advances after a kill. (The Clockwork Gunner's two
  shots are the precedent; this one needs no standing still.)
- **Why it is not a reskin.** A Knight chains only through kills and ends
  deep in the enemy. The Whirligig hits three units whether or not they
  die and stays put, and each blow is at full strength however damaged it
  is. It takes three retaliations: three healthy Fighters deal it 12 and
  it dies. It is for crowds of weak or wounded units: it kills a Goblin, a
  Catapult, and a wounded Marksman in one turn.
- **Beats.** Hordes, backlines, risen Zombies at 10 HP. **Beaten by.**
  Healthy defenders (their retaliation), and any ranged unit.
- **One-best-unit check.** At Defense 1.5 with no healing it trades badly
  against a healthy line; the Tank and the Cannon are still needed.
- **Alternative.** Leave the Tank at Chivalry and add a heavy at
  Metallurgy: a **Boilerplate** (6 Coins, 15 HP, 3.5 / 2, Move 1), a dwarf
  sealed in a boiler-plate suit with a steam maul, with **Stand Fast** (it
  is dug in wherever it did not move last turn, needing no technology).
  The roster would then have two brutes and no crowd unit.

#### Candy: Jawbreaker

- **What the faction has near the niche.** The Marshmallow (4 Coins, 18
  HP) is a defender that cannot attack after moving; the Chocolate Bunny
  is the crowd unit when Rushed; the Pie Launcher softens. Nothing is the
  brute.
- **Name and look.** **Jawbreaker.** A huge striped hard-candy ball with a
  scowling face and stubby arms, swinging a rock-candy mace, a chip out of
  its shell.
- **Numbers.** 6 Coins, 16 HP, Attack 3, Defense 2.5, Move 1. Sugar Rush
  like every Candy unit (Move 2 and +1 Attack on its first attack, then
  the Crash); leaves Crumbs; Re-bake 3 Coins by the existing rule.
- **Mechanic: Rock Hard.** **Nothing moves a Jawbreaker.** It is never
  pushed (Push, the Triceratops's shove, Knockback), never pulled (either
  Tractor Beam), and never bounced when it attacks a Marshmallow or the
  Giant. Damage still applies in full.
- **Why it is not a reskin.** It is the one garrison that can only be
  removed from a city centre by killing it, and the one Candy unit that
  can stay beside a Marshmallow line. Its tempo is Candy's own: a Rushed
  Jawbreaker deals a Guard 10 and cannot attack the turn after.
- **Beats.** The Mothership's siege (it cannot empty the centre), a
  charging Triceratops's follow-up, another Candy army's Marshmallows.
- **Beaten by.** Catapults and Marksmen as for every heavy, and its own
  Crash: a Rushed Jawbreaker cannot attack next turn.
- **One-best-unit check.** Rock Hard does nothing in the open against a
  faction that pushes nothing (Humans, Undead); there it is a plain heavy
  with a Rush. That is intended: "situationally overpowered" against the
  Martians, Dinosaurs, and Dwarves, and countered by shooting it.

#### What stops a Human Knight chain, per faction

The Knight and Overrun are not changed. After this proposal:

| Faction  | What a Knight's chain stops on                                                                  |
| -------- | ----------------------------------------------------------------------------------------------- |
| Human    | Guard (10 of 17), Templar (11 of 15)                                                            |
| Goblin   | Orc Brute (11 of 15), **Ogre** (12 of 16); a dying Buggy or Cart blasts it                      |
| Undead   | Zombie (12 of 18, and bites); a Bitten victim that rises ends the Overrun; **Wight** (11 of 14) |
| Martian  | a unit under a Force Field; **Shock Trooper** (leaves it at 3 HP and costs the Knight 6 of 13)  |
| Dinosaur | Ankylosaurus (9 of 20), **Triceratops** (12 of 20); an Egg still dies to it (not changed here)  |
| Ice Folk | **Musk Ox** (11 of 16, and the Knight is Chilled), **Mammoth** (12 of 20)                       |
| Dwarf    | Steam Mole (11 of 16), **Steam Tank** (4, Plated)                                               |
| Candy    | Marshmallow (a bounced attacker made no kill), **Jawbreaker** (11 of 16)                        |

### A.4 Engine and content cost, and the order of work

**Shared, once.** The ninth role is already wired for one faction
(`SWORDSMAN`: role rules for all eight kinds, cost `null` in seven). To
do: unlock it at `METALLURGY` in all eight trees and remove it from the
Human `ENGINEERING`; a cost and a rule per faction; the tactical label
`LINE`; the capture-capable list, the Muster roles, Disband refunds, Hire,
the Showcase and the Gallery; the text harness's two-letter code; the
Human price 6. Tests: the tree tables, the role tables, Muster, the
identity bump.

**Moved units: which role ID.** For the three moved units, recommend that
the unit takes the heavy role and the new unit takes the vacated role
(the Triceratops becomes the Dinosaur `SWORDSMAN`, the Stegosaurus the
Dinosaur `CATAPULT`), so that a role ID keeps meaning a job for the AI,
the labels, and the tests. Art is keyed by unit, not by role; check the
manifests. The cheaper path (keep the role IDs and move only the unlocks
between technologies) leaves the Triceratops labelled `SIEGE` for ever.

| Faction  | Engine                                                                                               | Art                               | AI                                                          |
| -------- | ---------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Human    | unlock, price, name                                                                                  | none (exists)                     | research order: one technology later                        |
| Goblin   | one role mechanic (`gangUpWeight` 2) read where helpers are counted                                  | sprite, portrait                  | add to the mix; stand it beside the mob's target            |
| Undead   | **new stored state** (the marked Grave), a Start Turn step, previews of Raise Dead and Devour        | sprite, portrait                  | step onto a marked Grave; do not Raise or Devour its own    |
| Martian  | a hook after an attack from distance 1 (damage to the attacker), preview field                       | sprite, portrait                  | shoot Shields off before melee (all factions' AI, cheaply)  |
| Dinosaur | role swap; **new per-turn state** (Cracked, like `splattedThisTurn`); a ranged Egg-laid siege unit   | sprite, portrait, Egg uses shared | fire before the charge; the Triceratops's new research path |
| Ice Folk | role swap; one trigger of the existing Chill                                                         | sprite, portrait                  | garrison with the Ox; Mammoth later                         |
| Dwarf    | role swap; an attack allowance of 3 with "different target" and "no move after" (the Gunner's shape) | sprite, portrait                  | pick three weak targets; never into a healthy line          |
| Candy    | one role flag read by the displacement checks                                                        | sprite, portrait                  | garrison centres against pullers                            |

Seven new sprites and portraits (Ogre, Wight, Shock Trooper, Stegosaurus,
Musk Ox, Whirligig, Jawbreaker). Stand-in art is acceptable for a first
build, as it was for the Swordsman at `7r48`.

**Suggested order.** (1) The shared slot and the Human move, rename, and
price, so the Human retest can start. (2) Goblin Ogre and Candy
Jawbreaker: one flag each. (3) Martian Shock Trooper. (4) Undead Wight
(new state). (5) Dinosaur swap and Stegosaurus. (6) Ice Folk swap and
Musk Ox. (7) Dwarf swap and Whirligig. Steps 6 and 7 can wait for those
factions' passes; until then their heavy slot can ship with the moved
unit alone only if the user accepts eight units there for a while.

## Part B: technology names

**Rules used.** One or two words; plain; says what the node gives; unique;
distinct at a glance; keep a name that is already good. A node that gives
a building and a unit is named for one of them. **Per-faction rule:**
where the shared name is a Human tool or skill the faction's unit does not
use, the node is shown under **the unit's name, plural**. Existing
per-faction names (Plunder, Nesting, Force Fields, …) stay.

### B.1 Shared names

| ID                  | Current           | What it gives (Human)                                   | Proposed         | Reason                                                                                                      |
| ------------------- | ----------------- | ------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `GATHERING`         | Gathering         | reveal Fertile Ground; Harvest Fruit                    | keep             | says it                                                                                                     |
| `FARMING`           | Farming           | Farm                                                    | keep             | says it                                                                                                     |
| `MILLING`           | Milling           | Windmill; Windmill healing                              | keep             | says it                                                                                                     |
| `ADMINISTRATION`    | Administration    | the support unit (Captain); Market; Disband             | **Leadership**   | the longest name in the tree for "your leader unit"; every faction's unit here is a leader                  |
| `PLANNING`          | Planning          | +1 unit slot in every city; Land Grant                  | **Land Grants**  | "Planning" says nothing; this names the action, as Roads does                                               |
| `HUNTING`           | Hunting           | Hunt Game                                               | keep             | says it                                                                                                     |
| `FORESTRY`          | Forestry          | Lumber Camp; Clear Forest; Forest cover                 | keep             | says it                                                                                                     |
| `SAWMILLING`        | Sawmilling        | Sawmill; Catapult                                       | keep             | names its building, like Milling; the Catapult is timber work. Other factions: B.2                          |
| `MARKSMANSHIP`      | Marksmanship      | Marksman                                                | keep             | names its unit. Other factions: B.2                                                                         |
| `FIELDCRAFT`        | Fieldcraft        | Replant Forest; no unit stops in Forest; ranged Sight 2 | **Pathfinding**  | "Fieldcraft" is vague; the node's main effect is moving through Forest                                      |
| `SCOUTING`          | Scouting          | the fast unit (Raider); Sight 2                         | keep             | fits every faction's scout                                                                                  |
| `ROADS`             | Roads             | Build Road; Road movement; Road population              | keep             | says it                                                                                                     |
| `COMMERCE`          | Commerce          | land trade; Hire at a Market                            | keep             | says it                                                                                                     |
| `RAIDING`           | Raiding           | Pillage; Raider Charge                                  | keep             | what Raiders learn to do. "Pillaging" was considered and would sit beside the Goblins' "Plunder"            |
| `CHIVALRY`          | Chivalry          | Knight; Overrun; Cultivate Forest                       | keep             | names its unit. Other factions: B.2                                                                         |
| `DRILL`             | Drill             | reveal Ore; the defender (Guard); Spoils                | **Garrison**     | the user's point: "sounds like it has to do with drilling holes". Fallbacks: Guard Duty, Sentries           |
| `ENGINEERING`       | Engineering       | Mountain entry; Mine; Workshop; Redevelop               | keep             | a fair word for a mixed bag once the unit is gone. "Mining" was considered and is one letter from "Milling" |
| `METALLURGY`        | Metallurgy        | Forge; Arms Industry; the heavy                         | **Armoury**      | plain; covers the Forge, cheaper arms, and a unit in plate                                                  |
| `FORTIFICATION`     | Fortification     | Field Defense                                           | keep             | says it                                                                                                     |
| `EXPLOSIVES`        | Explosives        | Blast Mountain; Breach                                  | keep             | says it                                                                                                     |
| `SHORECRAFT`        | Shorecraft        | Harvest Fish; Port; embarking; Patrol Boat              | **Sailing**      | "Shorecraft" is not a word a player knows                                                                   |
| `NAVIGATION`        | Navigation        | Deep Water; Gather Pearls; sea trade                    | keep             | says it                                                                                                     |
| `NAVAL_ENGINEERING` | Naval engineering | Battleship; Shipyard                                    | **Shipbuilding** | one word, names the Shipyard, and no second "Engineering"                                                   |
| `SEAMANSHIP`        | Seamanship        | Ram; Board                                              | **Boarding**     | "Seamanship" is vague; this names the stronger of its two actions                                           |
| `SUBMERSIBLES`      | Submersibles      | Submarine; Harbours                                     | keep             | names its unit                                                                                              |

Checked for look-alikes: Garrison and Gathering share two letters and sit
in different branches (decision 5); Farming, Forestry, and Fortification
exist today.

### B.2 Per-faction display names

Existing overrides, all kept: Goblin Commerce **Plunder**; Dinosaur
Fortification **Nesting**, Explosives **Wallbreaker**; Undead Explosives
**Pestilence**; Martian Fortification **Force Fields**, Fieldcraft **Heat
Sinks**, Explosives **Disintegrator**; Ice Folk Fortification **Deep
Winter**, Explosives **Brittle**, and the five naval names **Rime**,
**Pack Ice**, **Icebound**, **Black Ice**, **Glacier**; Dwarf
Fortification **Dig In**, Explosives **Blasting Charges**; Candy
Fortification **Home Sweet Home**, Explosives **Peppermint Surprise**.

Proposed additions (a dash means the shared name):

| Node (shared name) | Undead     | Goblin        | Dinosaur    | Martian      | Ice Folk    | Dwarf         | Candy             |
| ------------------ | ---------- | ------------- | ----------- | ------------ | ----------- | ------------- | ----------------- |
| Milling            | Bone Mills | —             | Grinding    | Solar Arrays | —           | Steam Pumps   | —                 |
| Marksmanship       | Banshees   | Bomb Chuckers | Spitters    | Ray Gunners  | —           | Clockwork     | Gumball Gunners   |
| Sawmilling         | Liches     | Rocket Carts  | Chopping    | Tripods      | Boulders    | Steam Cannons | Pie Launchers     |
| Scouting           | —          | —             | —           | Saucers      | —           | Gyrocopters   | —                 |
| Chivalry           | Vampires   | Scrap Buggies | T-Rex       | Motherships  | Sabretooths | Whirligigs    | Chocolate Bunnies |
| Armoury            | —          | —             | Triceratops | —            | Mammoths    | Steam Tanks   | Jawbreakers       |
| Raiding            | —          | —             | —           | —            | —           | Dive Bombing  | —                 |
| Engineering        | —          | —             | —           | —            | —           | Mining        | —                 |

Reasons, by row:

- **Milling.** Four factions' building here is not a mill (the names are
  those in `src/render/faction-buildings-v7.ts`).
- **Marksmanship, Sawmilling, Chivalry.** The known oddities: a Lich under
  "Sawmilling", a Mothership under "Chivalry". The Ice Folk Snow Hunter is
  a marksman and keeps the shared name.
- **Dinosaur Sawmilling → Chopping.** The node's building is the Chopping
  Block; with the Triceratops gone the name follows the building. (If the
  user prefers the unit rule here too: "Stegosauruses".)
- **Dwarf Marksmanship → Clockwork.** The node gives the Clockwork Gunner
  and lets Engineers Assemble them.
- **Dwarf Engineering → Mining.** The Dwarf unit called Engineer comes
  from Leadership, so "Engineering" misleads for this faction only; and
  the Dwarves have no "Milling" for it to be confused with.
- **Dwarf Raiding → Dive Bombing.** Its Dwarf unlock is Dive, not a
  Charge.

### B.3 Other names the renames touch

- **Achievement "Engineer".** It no longer needs Engineering
  ([C.4](#c4-harder-achievements)); the name can stay.
- **The Barracks "Drill"** was removed at `7r48`; nothing else is called
  Drill.
- **"Spoils"** and **"Arms Industry"** are named on the Garrison and
  Armoury cards and do not change.

### B.4 Every place a rename touches

IDs, commands, events, saves, and capabilities do not change.

- **The names themselves.** Shared names are not stored: `technologyNameV7`
  (`src/render/goblin-presentation-v7.ts`) derives them from the ID in
  sentence case. A shared display-name table is needed beside
  `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`
  (`src/engine/rules/ruleset-v7.ts`), and the per-faction additions go
  into that override table.
- **Unlock and card text:** `src/render/technology-unlock-text-v7.ts`, the
  technology tree and research prompt in `src/render/dom/app-view-v7.ts`,
  the Help, the reward text that names a technology.
- **Achievement text** that names a technology
  (`src/render/achievement-presentation-v7.ts`; "needs SCOUTING" in the
  text harness).
- **The text harness** (`scripts/play-text-v7.ts`): `tech` lines, and the
  unit and map codes for the renamed and new units.
- **Unit names:** Swordsman → Templar in the role labels, the Gallery, the
  Help, the art manifest's display strings, and the missions' briefings
  (`lab-human`, `lab-goblin`, `lab-undead`, `lab-martian`,
  `lab-breakthrough`).
- **Tests that assert text:** about 70 unit test files and 5 integration
  test files mention one of the technology names reviewed here (a count
  by search, not all in asserted strings); the seven faction test files
  that pin `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`; the browser review
  scripts under `scripts/`.
- **Documents:** the current rules (sections 4.7, 5, 6, 8, 11, and each
  faction section), the Help source, and this file. Tuning records are
  history and keep the old names.

## Part C: the economy rejig

### C.1 Mills and their neighbours

**Today's rule, exactly**
([current rules, section 8.3](RULESET_7_CURRENT.md#83-processors-and-mixed-buildings);
`contributorServesV7` in `src/engine/v7/spatial-economy.ts`).

- A Farm, Lumber Camp, or Mine belongs to the city whose territory its
  tile is in, and gives that city its own population (2, 1, 2).
- A Windmill, Sawmill, or Forge gives **its** city +1 for each Farm,
  Lumber Camp, or Mine **of the same owner** on the eight tiles around
  it, up to 8, 8, and 6. **The contributor may already stand on another
  of the owner's cities' land.**
- **One contributor feeds one mill of a kind.** If several of the owner's
  Windmills are next to one Farm, it counts for the Windmill of its own
  city; if that city has none next to it, for the first one in reading
  order (top row first, then left to right). Nothing is stored; a new
  mill of the Farm's own city takes the Farm back.
- A **Workshop** counts only its own city's Farms, Lumber Camps, and
  Mines: 1 + the number of different kinds next to it, 2 to 4.
- A **Market** pays Coins: 1 + the number of families next to it
  (Agriculture, Timber, Metal), at most 3. Contributors may be any city's
  of the same owner, and each counts for one Market by the same rule.
- One mill of each kind per city.

So "count farms from adjacent cities" is **already half true**: a lone
Windmill may count a neighbour city's Farms, and the hand players used it
(`gb`: "A Lumber Camp beside another city's Sawmill adds population to
both cities"; a Sawmill "gave +5 population for 5 Coins"). What is not
allowed is two cities' mills **sharing** a contributor, and a Workshop
looking across the border. That is what changes.

**The new rule, as a player would read it.**

> A Windmill counts every Farm of yours next to it. A Sawmill counts
> every Lumber Camp, a Forge every Mine, and a Workshop every kind of
> them. It does not matter which of your cities' land they stand on, and
> one Farm can feed two cities' Windmills.

Precisely:

1. **Whose contributors.** A mill (Windmill, Sawmill, Forge, Workshop)
   counts every contributor on its eight neighbouring tiles whose tile is
   in the territory of a city of the **same owner** as the mill's city.
2. **Sharing.** A contributor counts for **every** such mill next to it.
   A city still has one mill of each kind, so one Farm feeds at most one
   Windmill per city, and in practice at most two or three Windmills.
3. **Where the population goes.** A contributor's own population goes to
   the city whose land it stands on. A mill's output goes to the city
   whose land the mill stands on. Unchanged.
4. **Caps.** Unchanged: 8, 8, 6; a Workshop 4.
5. **Placement.** A mill needs at least one contributor it would count,
   as today; since every neighbour now counts, the offer no longer depends
   on what stands around the contributor.
6. **Markets do not change.** A Market pays Coins every turn, and tuning 1
   found one Farm between three Markets paying +6 a turn
   ([tuning 1, section E](RULESET_7_TUNING_1.md#e-the-level-reward-loop)).
   Each building still counts for one Market, its own city's first.
7. **On capture.** Nothing is stored, so nothing needs repair: a captured
   city's Farms stop counting for the former owner's mills at once and
   count for the captor's. A mill left with no contributor stays, with
   zero output, as today.
8. **Determinism.** The count is a function of the board. The reading
   order tie-break is no longer used for mills (it stays for Markets).

**Worked layouts.** Two cities stand three tiles apart, the closest the
map allows, so their territories touch along one side. "Camp" is a Lumber
Camp (3 Coins, +1); a Sawmill costs 5.

| Layout                                                                                                                                    | Today                                             | New rule                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| **One city alone.** A Sawmill on the middle of one side, four Camps beside it on its own land                                             | 4 + 4 = **8** population for 17 Coins             | the same                                     |
| **One mill on the border.** City A's Sawmill on the side facing city B; four Camps on A's land and three on B's                           | A: 4 + 7 = 11; B: 3. **14** for 26 Coins          | the same (this already works)                |
| **Two mills facing each other.** Each city has a Sawmill on the shared border and four Camps; four of the eight Camps touch both Sawmills | each city 4 + 4 = 8: level 3. **16** for 34 Coins | each city 4 + 6 = 10: level 4. **20** for 34 |
| **The same with Farms** (5 Coins, +2) and Windmills                                                                                       | each city 8 + 4 = 12. **24** for 50 Coins         | each city 8 + 6 = 14: level 5. **28** for 50 |

- A pair of facing mills shares at most **four** contributors (the tiles
  that touch both), so the new rule is worth at most **+4 population to
  the pair** per kind of mill, +2 to each city.
- A city between two neighbours can face one with its Sawmill and the
  other with its Windmill: about +4 for it, one level at levels 3 to 4.
- A Workshop that reaches across the border finds its third kind more
  often: +1.

It is a modest change. Most of the cross-city growth the testers reported
is today's rule.

### C.2 Monuments give 3

**Today**
([current rules, section 5](RULESET_7_CURRENT.md#5-achievements-and-monuments)).
Each of the seven achievements unlocks once per player and funds one
Monument: 0 Coins, **+2** live population (`MONUMENT_POPULATION_V7`; it
was 3 before tuning 1), on a free owned land tile, **at most one per
city**, so at most seven in a match. A captured Monument keeps its
population for the captor.

**New.** **+3.** Nothing else changes.

A city of level L needs L + 1 more population for the next level:

| The Monument's city     | Needs for the next level | With +2         | With +3                                |
| ----------------------- | -----------------------: | --------------- | -------------------------------------- |
| level 1 (a new village) |                        2 | level 2 exactly | level 2, and 1 of the 3 toward level 3 |
| level 2                 |                        3 | 2 of 3          | **level 3**                            |
| level 3                 |                        4 | half a level    | three quarters                         |
| level 4                 |                        5 | 2 of 5          | 3 of 5                                 |

So a Monument is a whole level, with its reward (Stockpile's 4 Coins or a
free unit at level 2; Walls or a Militia at level 3), in any city up to
level 2. At about 2.5 Coins a population it is worth 7 to 8 Coins plus the
reward. The hand players called them "free level-ups" at +2 and placed
five by rounds 13 to 23; C.4 is what keeps +3 from making that worse.

### C.3 Research price: 1 / 2 / 3 per extra city

**Today** ([current rules, section 6.1](RULESET_7_CURRENT.md#61-research-cost)).
Tier base 5 / 7 / 9, plus 1 Coin for each technology already owned beyond
the first. The first technology of a match is free. Cities do not matter.

**History.** The price was per city until round 4 of the Human tuning
(steps of 1 / 3 / 5, then 1 / 2 / 2). It was replaced because "the
per-city step punished the player for winning: in game 1 the right play
was to sit on two villages"
([Human tuning, section 11.3](RULESET_7_TUNING_HUMAN.md#113-decisions-that-are-forks-for-the-user-to-overrule)).
The user has now ruled on that: "the 'gaming' of the system by delaying
capturing cities is a fine strategic choice and self limiting. fewer
cities means less money and opportunity for your opponent to capture
them." So no rule against it is proposed.

**Reading A (recommended): the city term replaces the technology term.**

```text
tier 1 = 5 + 1 * (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

`C` is the number of cities the player owns when it researches. The free
opening technology stays.

**Reading B: the city term is added to today's.**

```text
tier t = base(t) + (N - 1) + t * (C - 1)
```

`N` is the number of technologies already owned.

**Prices** (tier 1 / tier 2 / tier 3):

| Technologies owned | Today        | Cities | Reading A    | Reading B    |
| -----------------: | ------------ | -----: | ------------ | ------------ |
|                  3 | 7 / 9 / 11   |      1 | 5 / 7 / 9    | 7 / 9 / 11   |
|                    |              |      3 | 7 / 11 / 15  | 9 / 13 / 17  |
|                    |              |      5 | 9 / 15 / 21  | 11 / 17 / 23 |
|                    |              |      8 | 12 / 21 / 30 | 14 / 23 / 32 |
|                    |              |     12 | 16 / 29 / 42 | 18 / 31 / 44 |
|                  8 | 12 / 14 / 16 |      1 | 5 / 7 / 9    | 12 / 14 / 16 |
|                    |              |      3 | 7 / 11 / 15  | 14 / 18 / 22 |
|                    |              |      5 | 9 / 15 / 21  | 16 / 22 / 28 |
|                    |              |      8 | 12 / 21 / 30 | 19 / 28 / 37 |
|                    |              |     12 | 16 / 29 / 42 | 23 / 36 / 49 |
|                 14 | 18 / 20 / 22 |      1 | 5 / 7 / 9    | 18 / 20 / 22 |
|                    |              |      3 | 7 / 11 / 15  | 20 / 24 / 28 |
|                    |              |      5 | 9 / 15 / 21  | 22 / 28 / 34 |
|                    |              |      8 | 12 / 21 / 30 | 25 / 34 / 43 |
|                    |              |     12 | 16 / 29 / 42 | 29 / 42 / 55 |

**The whole land tree** (20 technologies, tier order, the first free):

| Player                                                                                       | Today | Reading A | Reading B |
| -------------------------------------------------------------------------------------------- | ----: | --------: | --------: |
| 1 city throughout                                                                            |   314 |       143 |       314 |
| 3 cities throughout                                                                          |   314 |       229 |       400 |
| 5 cities throughout                                                                          |   314 |       315 |       486 |
| 8 cities throughout                                                                          |   314 |       444 |       615 |
| 12 cities throughout                                                                         |   314 |       616 |       787 |
| growing as the hand players did (3 cities at the 2nd purchase, 8 at the 8th, 12 at the 17th) |   314 |       507 |       678 |
| the 14 technologies of game `ub`, in its order, with its cities                              |   171 |       272 |       350 |
| a Normal AI seat's usual 7 technologies with 4 cities                                        |    55 |        69 |        84 |

**What Reading A does.**

- It is steeper exactly where the user wants it: for the wide player. The
  hand players held 6 cities by round 10 and 10 by round 20; their tier 3
  price goes from 13 to 24 at round 10 and from 21 to 36 at round 20.
- At five cities the whole tree costs what it costs today. Below five it
  is cheaper: the player who is behind gets the discount back.
- A broad researcher no longer pays more than a narrow one, which helps
  the user's bar that "all the tech branches are useful".
- A one-city rush reaches a tier 3 unit for 16 Coins (free, 7, 9), as it
  could before round 4. That rush is answered by what it buys and by the
  city count it gives up.
- The Normal AI pays about a quarter more than today (69 against 55) at
  its usual four cities.

**What Reading B does.** Everything costs at least today's price and a
wide player pays almost double (43 for a tier 3 technology at eight
cities and fourteen technologies). The Normal AI, which bought 6 or 7
technologies in 25 rounds in every hand game, pays half as much again
(84 against 55).

**Recommendation: Reading A.** It is the shape the user named ("+1 +2 +3
per extra city"), it is one sentence on the research screen ("each city
beyond your first adds 1 / 2 / 3"), and it does not push the AI further
behind. Reading B is the fallback if the retest finds small empires
researching too fast.

### C.4 Harder achievements

**Today's seven, and when hand players reached them.** Rounds are from
the full games played from turn 1 (`gb` Goblins, `ub` Undead, `mb`
Martians, `db` Dinosaurs, each against the Human AI on Dry Land 14) and
the Human games `r5a` and `r8c`. The headless figures are from
[revision 21, section 8](RULESET_7_REVISION_21_ACHIEVEMENTS.md#8-measurements)
(every seat an AI).

| Achievement | Today                                           | Hand players reached it                                  | AI seats (median round) | Proposed                                  | Shown to the player              |
| ----------- | ----------------------------------------------- | -------------------------------------------------------- | ----------------------- | ----------------------------------------- | -------------------------------- |
| Explorer    | Scouting; 100 tiles explored                    | tiles by about round 9; cashed rounds 9–15 with Scouting | 53% (22)                | **half the map explored; no technology**  | "Explore half the map."          |
| Land Baron  | 5 cities at once                                | rounds 7, 7, 8, 8, 10, 11                                | 33% (27)                | **8 cities at once**                      | "Own 8 cities at once."          |
| Muster      | Drill; 4 different trainable kinds on the board | rounds 11, 11, 13, 13, 15                                | 63% (20)                | **6 different kinds; no technology**      | "Field 6 kinds of unit at once." |
| Engineer    | Engineering; one mill with output 6             | rounds 13, 17; twice not before round 25                 | 2% (45)                 | **one mill with output 7; no technology** | "Run a mill at 7."               |
| Conqueror   | capture one enemy city                          | rounds 9 (six players), 19, 20, 23                       | 60% (20)                | **capture an enemy capital**              | "Capture an enemy capital."      |
| Sea Dog     | 3 warships at once (Ice Folk: 3 units on ice)   | not played (Dry Land)                                    | 46% (21)                | **5 warships** (Ice Folk: 5 units on ice) | "Own 5 warships at once."        |
| Slayer      | 5 kills with one unit                           | rounds 20 and 25 where the notes record it               | 43% (30)                | **7 kills with one unit**                 | "Get 7 kills with one unit."     |

**Notes on each.**

- **Explorer stays the easy one.** "Half the map" is the land and water
  tiles of the board, halved and rounded up: 98 on a 14 by 14 board (100
  today), 61 on 11 by 11 (where 100 of 121 was the hard one), 200 on 20 by 20. Dropping the Scouting requirement removes what `gb` reported:
  "Monuments wait behind technologies … which makes those technologies 4
  to 5 Coins cheaper than printed." Expected: rounds 8 to 12.
- **Land Baron at 8.** The hand players held 8 cities by rounds 12 to 20.
  With research priced per city it is the reward for paying that price.
  On the smallest two-player boards (8 settlements) it is reached only by
  the winner.
- **Muster at 6.** Six kinds need at least four unit technologies beyond
  the opening. `mb` fielded its sixth kind in round 18. The reward giant
  still does not count; ships do.
- **Engineer at 7.** Only a Windmill or a Sawmill can reach 7 (a Forge's
  cap is 6, a Workshop's 4), and only next to seven working tiles, which
  needs a border mill or a Land Grant. A planning goal for the late game.
- **Conqueror: a capital.** It needs no counter, like today's rule: it
  unlocks in the `CAPTURE` of a city that was founded as a capital and
  belonged to another player. In a duel it comes when the war is decided;
  with more players it is a real mid-game aim. The alternative, "capture 3
  enemy cities", needs a stored counter (a state shape change).
- **Sea Dog at 5.** 25 Coins of Patrol Boats instead of 15. Still not
  reachable on Dry Land and still hidden there. The Ice Folk goal reads
  "Hold the ice with 5 units at once."
- **Slayer at 7.** It is already the latest; one Knight chain made 6
  kills in a turn (`r8c`), so 7 is a first guess.

**The spread this aims at.** A typical game sees Explorer early (rounds 8
to 12); one or two of Land Baron, Muster, and Sea Dog in the middle
(rounds 15 to 25); Engineer, Conqueror, and Slayer only in long or
dominant games. A hand player who had five Monuments by round 20 would
have two or three.

**The Normal AI** does not plan for achievements and will not start. It
builds a Monument when one is offered. Expect it to earn Explorer in most
games (it had the tiles in 53% of seats even with the Scouting gate),
Sea Dog and Muster sometimes, and the rest rarely. Harder criteria take
more from the hand player than from the AI, which narrows a gap every
report measured at two to one in income.

**Every text that names a criterion.**

- Constants and the required-technology table: `src/engine/v7/achievements.ts`
  (`LAND_BARON_CITIES_V7`, `SEA_DOG_SHIPS_V7`, `SLAYER_KILLS_V7`,
  `CONQUEROR_CAPTURES_V7`, `ACHIEVEMENT_REQUIRED_TECH_V7`, the Explorer,
  Engineer, and Muster thresholds), and `MONUMENT_POPULATION_V7`.
- Goals shown to the player: `src/render/achievement-presentation-v7.ts`
  and the achievements panel in `src/render/dom/app-view-v7.ts`; the
  Monument's "+2" on the building card and in the Help.
- The text harness's achievement lines (`scripts/play-text-v7.ts`).
- Tests: `tests/unit/ruleset-v7-achievements.test.ts`,
  `tests/unit/ruleset-v7-revision21-achievements.test.ts`,
  `tests/unit/ruleset-v7-tuning-1.test.ts`,
  `tests/unit/ruleset-v7-frozen-sea-identity.test.ts`,
  `tests/integration/ruleset7-achievements-dom.test.ts`.
- Documents: the current rules, section 5 (the table, the Ice Folk Sea Dog
  goal "Hold the ice with 3 units at once.") and section 8.3 (Monument +2).

### C.5 The combined effect

Everything in this section is an **estimate** reasoned from the rules and
the four full hand games (`gb`, `ub`, `mb`, `db`); none of it was played.

**Baseline: a hand player against the Normal AI today.**

| Round | Cities | Income (Coins a turn) | Capital level | Technologies | Monuments |
| ----: | ------ | --------------------- | ------------- | ------------ | --------- |
|    10 | 5–7    | 13–18                 | 3–5           | 5–6          | 1–2       |
|    20 | 7–10   | 22–30                 | 5             | 11–13        | 4–5       |
| 25–30 | 11–12  | 41–49                 | 5–6           | 14–17        | 5         |

**After Parts A to C (Reading A).**

| Round | Cities | Income | Capital level | Technologies | Monuments | Why                                                                                                                                     |
| ----: | ------ | ------ | ------------- | ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
|    10 | 5–7    | 12–17  | 3–5           | 4–5          | 1         | one Monument (+3) instead of two (+4); the same 32 or so Coins of research buy one technology fewer at six cities (10 / 17 / 24)        |
|    20 | 7–10   | 22–31  | 5–6           | 9–10         | 2–3       | 6 to 9 Monument population instead of 8 to 10; +2 to +4 from shared mills; the 171 Coins `ub` spent on 14 technologies now buy about 10 |
| 25–30 | 11–12  | 41–50  | 6             | 12–14        | 3–4       | a tier 3 technology costs 39 to 42, a full turn's income                                                                                |

- **Income barely moves.** The level term of income stops at level 4, so
  extra population in large cities adds unit slots, not Coins. The two
  population changes roughly cancel in the first twenty rounds.
- **Research takes the difference.** A wide player's technology count
  falls by about a quarter. The heavy's path costs a six-city player 51
  Coins (Garrison 10, Engineering 17, Armoury 24): rounds 13 to 16. A
  two-city rusher has it by round 8 to 10 for about 20.
- **Does the middle game still have 5 to 6 Coin cities against 8 to 9
  Coin units?** Yes. City income is unchanged
  ([Human tuning, section 12.7](RULESET_7_TUNING_HUMAN.md#127-what-a-city-earns-against-what-a-unit-costs):
  a level-4 city earns 4 to 8). What is new is a 6-Coin unit every faction
  wants each turn in each front city, and research that is about half as
  dear again for a wide player. Both pull the same way as the user's
  thesis. No new Coin sink is added. Coins will still pile up once a war
  is decided, which the user accepts.
- **Still true and not addressed here:** from about round 14 unit slots
  and occupied centres, not Coins, limited every hand player's army.

**The reward ladder.**

- **Stockpile (4 Coins at level 2)** is not changed. The chain the testers
  ran (two Hunts for 4 Coins, level 2, Stockpile 4, repeat in the next
  city) is untouched; its Monument variant becomes rarer because there are
  fewer Monuments, and slightly better because a +3 Monument in a level-2
  city is a level by itself.
- **Barracks (level 4 and above)** arrives a little sooner in paired
  cities (one level from shared mills). No change proposed.
- **The reward giant at capital level 5.** `gb` and `ub` had it in round
  10; `mb` and `db` only when they forced it. Level 5 is 14 population.
  The capital loses its early Land Baron Monument (it was +2 at round 7
  or 8 in `gb`) and gains up to +2 from a shared mill, so the timing does
  not move: round 10 or 11, before any tier 3 unit. **Recommend moving the
  reward giant to capital level 6** (20 population; estimated rounds 14 to
  17). It is the one number in the ladder this proposal asks to move, and
  it follows the user's rule of gating what is too early rather than
  weakening it.
- **Scouts and Militia** are not changed.

**Things to watch in the retest, not proposed changes.**

- A Sawmill border pair at 20 population for 34 Coins is the cheapest
  growth in the game; if it runs away, lower the Sawmill's cap before
  touching the sharing rule.
- Engineer at 7 becomes easier under the sharing rule than it reads;
  move it to 8 if it shows up before round 20.
- The one-city tier 3 rush under Reading A.

### C.6 What must be re-tested by hand

Games are played by hand against the Normal AI, a few per faction, as for
the faction passes. Order: the shared economy with Humans first, then
each faction as its unit lands.

| #   | Faction  | Why this order                                                          | What to look at                                                                                                                                                                                               |
| --- | -------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Human    | every economy change and the moved Templar are in play with no new unit | technologies and income at rounds 10, 20, 30 against the table above; when the Templar arrives; whether Fighter, Guard, and Marksman are still bought before it; Monuments by round; the reward giant's round |
| 2   | Goblin   | cheapest new unit; the faction most changed by a heavy                  | Ogre with a mob against Guards on walls; whether mobs still need Goblins; Plunder income against the dearer research                                                                                          |
| 3   | Undead   | new stored state; the Zombie wave was already strong                    | how often a Wight returns; whether the AI steps on Graves; Zombie plus Wight plus Lich as the whole army                                                                                                      |
| 4   | Martian  | first melee Martian                                                     | Shock Trooper against Knights and Templars (the test `mb` could not run); the Force Field pairing; whether it is bought at all by a ray army                                                                  |
| 5   | Dinosaur | a moved unit and a new siege unit                                       | Triceratops timing on the new path; Stegosaurus then charge against Guards; the growth heal; Nesting; a Knight in the nest (still untested)                                                                   |
| 6   | Dwarf    | with the Dwarf faction pass                                             | Steam Tank as the line; Whirligig against hordes and against a healthy line                                                                                                                                   |
| 7   | Ice Folk | with the Ice Folk faction pass; the largest reshuffle                   | the first ten rounds without the Mammoth; Musk Ox, Chill, and Shatter against Knights                                                                                                                         |
| 8   | Candy    | with the Candy faction pass                                             | Jawbreaker on a centre against a Mothership and a Triceratops; Rush and Crash on a 6-Coin unit                                                                                                                |

For every faction also check the user's bar: "the faction is not crazy op
or crazy weak and that all the tech branches are useful and that units are
differentiated from other factions by more than stats", and that no
faction has "one obviously best unit where it doesn't make sense to train
any other units". One free-for-all with all eight factions closes the
round.
