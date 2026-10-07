# Ruleset 7: the ninth unit and the technology names

**Status:** implemented on `pulp-wars-poc-7r55` (bead `pulp_wars-w49.17`).
This is the record of what was built from Parts A and B of
[the heavy slot and economy design](RULESET_7_DESIGN_HEAVY_SLOT_AND_ECONOMY.md),
the plain readings chosen where that design was silent, and the questions
left for the faction-by-faction hand play.
[The current rules](RULESET_7_CURRENT.md) hold the rules themselves.

**It is a quick pass, by the user's direction:** "Do a quick pass over all
the factions to add the new unit without too much testing. THEN later do
playtesting one faction at a time and fixing tech tree balance." Every
number below is the design's first guess. Nothing was tuned, no game was
played by hand, and no diagnostic match was run. The rules are tested
(`tests/unit/ruleset-v7-ninth-unit.test.ts`); the balance is not.

**The user's rulings (2026-10-07).** "if the unit really has an important
niche to fill then keep it but fill the same niche for other factions as
well. But rename it and rethink other tech naming too. 'drill' is pretty
vague and sounds like it has to do with drilling holes." "I would prefer to
have the same number of units in each faction." "Note that if triceratops
is already doing the job of the swordsman then we can just move triceratops
into the swordsman slot and invent some new dino to do the job of the
catapult (ish)". "the human unit could be a champion to keep it short. we
could regenerate the art to make him look more championy although the
current one is cool."

## 1. What changed

- **Every faction has nine land units**, one for each of nine jobs: basic
  line, defender, fast, ranged, support, siege, breakthrough, heavy line,
  and the reward giant. A test fails if a faction has fewer.
- **The heavy line unit of every faction is at Metallurgy** (shown as
  **Armoury**), tier 3 of the Industry branch, behind Drill and
  Engineering. Engineering gives no unit any more; it keeps Mountains, the
  Mine, the Workshop, and Redevelop. Metallurgy keeps the Forge and Arms
  Industry, so a city with a working Forge trains the heavy for 1 Coin
  less.
- **The Human Swordsman is the Champion**, costs 6 Coins (5 before), and
  moved from Engineering to Metallurgy. Its numbers and its art are
  unchanged.
- **Four factions have a new heavy:** the Goblin **Ogre**, the Undead
  **Wight**, the Martian **Shock Trooper**, and the Candy **Jawbreaker**.
- **Three factions moved a unit into the heavy slot** and got a new unit
  for the job it left: the Dinosaur **Triceratops** moved and the
  **Stegosaurus** is the siege unit; the Ice Folk **Mammoth** moved and the
  **Musk Ox** is the defender; the Dwarf **Steam Tank** moved and the
  **Whirligig** is the breakthrough unit.
- **Eight technologies have new shared names** and several have a
  faction's own name ([section 5](#5-technology-names)). No technology ID
  changed.

## 2. The rosters

One row per land unit. `Role` is the engine role ID, which now means the
same job in every faction. Attack and Defense are in whole points (the
engine stores half-points). "After move" is whether the unit may attack
after moving. **Bold** units are new at `7r55`; _italic_ units moved.

### 2.1 The heavy line unit of each faction

| Faction  | Unit              | Role        | Technology | Cost |  HP | Attack | Defense | Move | Captures | Mechanic                                                            |
| -------- | ----------------- | ----------- | ---------- | ---: | --: | -----: | ------: | ---: | -------- | ------------------------------------------------------------------- |
| Human    | Champion          | `SWORDSMAN` | Metallurgy |    6 |  15 |    3.5 |     2.5 |    1 | yes      | none: the baseline                                                  |
| Goblin   | **Ogre**          | `SWORDSMAN` | Metallurgy |    5 |  16 |    2.5 |       2 |    1 | yes      | **Heavyweight:** counts as two units for Gang Up                    |
| Undead   | **Wight**         | `SWORDSMAN` | Metallurgy |    6 |  14 |      3 |     2.5 |    1 | yes      | **Rise Again:** returns once from its own Grave at 7 HP             |
| Martian  | **Shock Trooper** | `SWORDSMAN` | Metallurgy |    6 |  12 |      3 |       2 |    1 | yes      | **Shock Field:** Shield 3; while Shielded a melee attacker takes 3  |
| Dinosaur | _Triceratops_     | `SWORDSMAN` | Metallurgy |    8 |  20 |      3 |       2 |    2 | no       | Charge! (unchanged); an Egg of two turns, two slots                 |
| Ice Folk | _Mammoth_         | `SWORDSMAN` | Metallurgy |    6 |  20 |    2.5 |       2 |    1 | yes      | Sweep, Trample (unchanged)                                          |
| Dwarf    | _Steam Tank_      | `SWORDSMAN` | Metallurgy |    9 |  16 |      3 |       2 |    2 | no       | Plated 4 (unchanged)                                                |
| Candy    | **Jawbreaker**    | `SWORDSMAN` | Metallurgy |    6 |  16 |      3 |     2.5 |    1 | yes      | **Rock Hard:** never pushed, pulled, knocked back, or bounced; Rush |

Every heavy is a `LINE` unit, attacks from the next tile only, attacks
after moving, advances after a kill (the Triceratops also follows a unit
it pushes), builds no Field Defense, and fills one unit slot (the
Triceratops two).

### 2.2 The three units that took a vacated role

| Faction  | Unit            | Role       | Technology | Cost |  HP | Attack | Defense | Move | Range | After move | Captures | Mechanic                                                                              |
| -------- | --------------- | ---------- | ---------- | ---: | --: | -----: | ------: | ---: | ----: | ---------- | -------- | ------------------------------------------------------------------------------------- |
| Dinosaur | **Stegosaurus** | `CATAPULT` | Sawmilling |    7 |  12 |    2.5 |       1 |    1 |   2–3 | no         | no       | **Thagomizer:** its target is Cracked; destroys Field Defense; an Egg, one slot       |
| Ice Folk | **Musk Ox**     | `GUARD`    | Drill      |    4 |  16 |    1.5 |     2.5 |    1 |     1 | no         | yes      | **Frostbite:** a unit that attacks it from the next tile is Chilled                   |
| Dwarf    | **Whirligig**   | `KNIGHT`   | Chivalry   |    9 |  12 |      3 |     1.5 |    3 |     1 | yes        | no       | **Three Hammers:** three attacks a turn on different units; a construct and a machine |

### 2.3 The nine jobs

| Job            | Role         | Human      | Goblin       | Undead      | Martian           | Dinosaur        | Ice Folk     | Dwarf            | Candy             |
| -------------- | ------------ | ---------- | ------------ | ----------- | ----------------- | --------------- | ------------ | ---------------- | ----------------- |
| Basic line     | `FIGHTER`    | Fighter    | Goblin       | Skeleton    | Grunt             | Caveman         | Yeti         | Hammerer         | Toffee Trooper    |
| Defender       | `GUARD`      | Guard      | Orc Brute    | Zombie      | Shield Projector  | Ankylosaurus    | **Musk Ox**  | Steam Mole       | Marshmallow       |
| Fast           | `RAIDER`     | Raider     | Wolf Rider   | Ghoul       | Saucer            | Raptor          | Sled         | Gyrocopter       | Donut Racer       |
| Ranged         | `MARKSMAN`   | Marksman   | Bomb Chucker | Banshee     | Ray Gunner        | Spitter         | Snow Hunter  | Clockwork Gunner | Gumball Gunner    |
| Support        | `CAPTAIN`    | Captain    | Orc Warboss  | Necromancer | Brain             | Shaman          | Ice Witch    | Engineer         | Confectioner      |
| Siege          | `CATAPULT`   | Catapult   | Rocket Cart  | Lich        | Tripod            | **Stegosaurus** | Boulder Yeti | Steam Cannon     | Pie Launcher      |
| Breakthrough   | `KNIGHT`     | Knight     | Scrap Buggy  | Vampire     | Mothership        | T-Rex           | Sabretooth   | **Whirligig**    | Chocolate Bunny   |
| **Heavy line** | `SWORDSMAN`  | Champion   | **Ogre**     | **Wight**   | **Shock Trooper** | _Triceratops_   | _Mammoth_    | _Steam Tank_     | **Jawbreaker**    |
| Reward giant   | `JUGGERNAUT` | Juggernaut | Troll        | Abomination | Colossus          | Brontosaurus    | Frost Giant  | Brass Titan      | Gingerbread Giant |

The loose cells of the design's table are unchanged: the Steam Mole, the
Saucer, the Gyrocopter, the Banshee, the Vampire, the Mothership, the
Sabretooth, and the Chocolate Bunny do their job only in their own way.

## 3. The mechanics as built

Each is a role mechanic of its faction's registration (a body rule: it
follows the unit's kind, so a mind-controlled unit keeps it, except where
stated). The rules are in the current rules:
[Rise Again](RULESET_7_CURRENT.md#1711-the-wight-rise-again),
[Heavyweight](RULESET_7_CURRENT.md#1813-the-ogre-heavyweight),
[the Stegosaurus](RULESET_7_CURRENT.md#1915-the-stegosaurus-the-thagomizer),
[Shock Field](RULESET_7_CURRENT.md#2013-the-shock-trooper-shock-field),
[Frostbite](RULESET_7_CURRENT.md#2117-the-musk-ox-frostbite),
[Three Hammers](RULESET_7_CURRENT.md#2215-the-whirligig-three-hammers),
and [Rock Hard](RULESET_7_CURRENT.md#2312-the-jawbreaker-rock-hard).

- **Heavyweight (Ogre).** A land-form Ogre next to the target of another
  Goblin attack counts as two helpers. The faction maximum (+2) and the
  role limits stand: a Rocket Cart takes +1 at most and a bomb none. The
  Ogre's own attack takes Gang Up like any Goblin's. It has no Kaboom and
  no death blast and is not Blast-proof.
- **Rise Again (Wight).** When a Wight of an Undead seat dies and its death
  creates a Grave, the Grave is marked for that seat. At the seat's next
  Start Turn (after the hatch step, before Windmill healing) a Wight climbs
  out of each marked Grave that no unit and no mound stands on: a new unit
  at 7 HP with no home city, no kills, and a fresh activation. The Grave
  and the mark are removed and that Wight never rises again. A Grave
  something stands on keeps its mark for a later Start Turn. A mark ends
  when its Grave is raised or devoured, or when its seat leaves the game.
  The marked Grave is public on an explored tile and is drawn as a pale
  blue stone in a ring.
- **Shock Field (Shock Trooper).** An attack on a land-form Shock Trooper
  from the next tile, while its Shield has at least 1 point before the hit,
  deals the attacker 3. It follows the retaliation, is reduced by Armoured
  and capped by Plated, and is taken from the attacker's Shield first. It
  applies whatever the hit does, also with no retaliation (the blow killed
  the Trooper, or the attacker is a Vampire). A unit it kills is the
  Trooper's kill.
- **Rock Hard (Jawbreaker).** In land form a Jawbreaker is never moved by a
  Push, a Charge! push, a Knockback, or a Tractor Beam, and is not bounced
  when it attacks a Marshmallow or the Gingerbread Giant. Damage applies in
  full. It has Sugar Rush and leaves Crumbs (a Re-bake costs 3 Coins).
- **Thagomizer (Stegosaurus).** A unit its attack hits and does not kill is
  Cracked until the end of the Stegosaurus's owner's turn: 1 less Defense,
  never below 0.5. It does not stack. Every Stegosaurus attack destroys a
  Field Defense on the target's tile (the rule of every siege role).
- **Frostbite (Musk Ox).** A land-form unit that attacks a land-form Musk
  Ox from the next tile and survives the exchange is Chilled, whether or
  not the Ox survives.
- **Three Hammers (Whirligig).** It may attack three times in a turn, each
  time a different unit, moved or not. It never advances and cannot move
  after its first attack, so all three are made from one tile.

## 4. Plain readings chosen

Where the design did not say, the plainest reading was built. Each is a
candidate for the faction's hand play to overrule.

1. **Champion, not Templar.** The user chose the name. The design's
   "Templar" appears nowhere in the game.
2. **Art slots.** A moved unit keeps the art slot its sprite was made for
   (the Triceratops is still `UNIT:DINOSAUR:CATAPULT`), and each of the
   seven units without art is its faction's `SWORDSMAN` art slot. No art
   asset, prompt, or generation record was renamed.
3. **Rise Again needs a new Grave.** A Wight that dies on a tile that
   already has a Grave leaves no new Grave and does not rise. So does one
   that dies on a settlement center, on a treasure chest, or on a Rift.
4. **Rise Again and a unit of its own seat.** An own unit on the Grave
   blocks the return exactly as an enemy does ("no unit may stand on it").
5. **A risen Wight acts on the turn it rises** (a fresh activation), like
   an Egg that hatches at a Start Turn.
6. **A Wight killed in the same `END_TURN` that starts its owner's turn**
   (by Plague at that Start Turn, or by the Monster in the neutral turn
   before it) rises at the owner's following Start Turn, not at once: the
   mark is made when the command ends.
7. **Mind control and Rise Again.** A Wight that is mind-controlled at the
   start of the command that kills it does not rise, for anyone.
8. **The shock is not a retaliation** but it is reported as part of what
   the attacker takes, and a unit it kills dies with the cause
   `RETALIATION` (no new death cause). The Shock Field has no effect while
   the Trooper is embarked.
9. **Cracked lowers the unit's Defense for everything**: the hits it takes
   and its own strike back (the retaliation is computed from Defense). The
   Stegosaurus's own shot meets the uncracked Defense. An Egg and the
   neutral Monster are never Cracked. A Cracked Guard, open to ranged
   attacks (Defense 1 from two tiles), has 0.5 there.
10. **Frostbite needs a land-form attacker** and never Chills the neutral
    Monster. It emits `UNITS_CHILLED` with the new source `FROSTBITE`.
11. **Three Hammers and its targets.** "A different unit" is by unit: a
    unit attacked once this turn cannot be attacked by the same Whirligig
    again that turn, alive or not. After its first attack the Whirligig
    waits for orders until its third attack or the End Turn.
12. **Rock Hard is a land-form rule.** An embarked Jawbreaker's transport
    is shoved like any boat. A reward unit that displaces a Jawbreaker
    from a city center still displaces it (that is its own city's
    arrangement, not a push).
13. **The Triceratops keeps every rule it had as the siege role.** Its
    attacks still destroy Field Defense (reason `CATAPULT`) and War Drums
    still do not reach it (design decision 10).
14. **The Stegosaurus is an ordinary dinosaur:** laid as an Egg that
    hatches in two turns, one slot, grows Big and Alpha, ignores City
    Walls with Wallbreaker like every growing unit, and takes War Drums
    never (it is a `SIEGE` role).
15. **The Musk Ox is an ordinary Ice Folk land unit:** it Glides and
    Freezes; it builds no Field Defense.
16. **The Dinosaur Sawmilling stays "Timber".** The design proposed
    "Chopping"; the existing name was kept, as the bead directs.
17. **The Showcase** fields a ninth land unit for every seat on the Road
    tile south of its North city, homed there, with the last entity IDs
    (121 to 124 in a four-seat Showcase), so no unit that was there before
    has a new ID or tile. It is the faction's heavy, except for the three
    factions whose heavy is a unit they already had: the Triceratops, the
    Mammoth, and the Steam Tank stand where they stood, as the heavy role,
    and the Stegosaurus, the Musk Ox, and the Whirligig stand on the new
    tile (`showcaseUnitRoleV7`). A seat has twelve units (an Ice Folk seat
    nine) and its North city four.
18. **The labs.** The four middle-game labs give the player's faction
    Engineering and Metallurgy too (twelve technologies), so its heavy can
    be produced; the Dinosaur lab's two Triceratops are the heavy role.
    Every Human lab seat that fielded Swordsmen owns Metallurgy. No unit
    was added or removed: the Human side of the middle-game labs is worth
    80 Coins (77), and the player of the three breakthrough labs 67 (63)
    against the unchanged attackers, so the Goblin and Undead attackers
    are 1.87 times its value where the lab was built for twice. The labs
    are re-staged when their faction is next played by hand.
19. **Stand-in art in the panels.** A card or portrait of a unit without
    art shows its stand-in with the faction badge the interface already
    puts on placeholder art; the board uses the lettered badge.

## 5. Technology names

IDs, commands, events, and saves do not change. A name is the faction's own
if it has one, else the shared name, else the ID in sentence case
(`technologyDisplayNameV7`).

**Shared names (all eight of the design):**

| ID                  | Was               | Is               |
| ------------------- | ----------------- | ---------------- |
| `DRILL`             | Drill             | **Garrison**     |
| `ADMINISTRATION`    | Administration    | **Leadership**   |
| `PLANNING`          | Planning          | **Land Grants**  |
| `FIELDCRAFT`        | Fieldcraft        | **Pathfinding**  |
| `METALLURGY`        | Metallurgy        | **Armoury**      |
| `SHORECRAFT`        | Shorecraft        | **Sailing**      |
| `NAVAL_ENGINEERING` | Naval engineering | **Shipbuilding** |
| `SEAMANSHIP`        | Seamanship        | **Boarding**     |

**A faction's own names** (a dash is the shared name; names that existed
before `7r55` are in plain type, new ones in bold):

| ID              | Undead         | Goblin            | Dinosaur        | Martian          | Ice Folk        | Dwarf             | Candy                 |
| --------------- | -------------- | ----------------- | --------------- | ---------------- | --------------- | ----------------- | --------------------- |
| `MILLING`       | **Bone Mills** | —                 | **Grinding**    | **Solar Arrays** | —               | **Steam Pumps**   | —                     |
| `MARKSMANSHIP`  | **Banshees**   | **Bomb Chuckers** | **Spitters**    | **Ray Gunners**  | —               | **Clockwork**     | **Gumball Gunners**   |
| `SAWMILLING`    | **Liches**     | **Rocket Carts**  | Timber          | **Tripods**      | **Boulders**    | **Steam Cannons** | **Pie Launchers**     |
| `FIELDCRAFT`    | —              | —                 | —               | Heat Sinks       | —               | —                 | —                     |
| `SCOUTING`      | —              | —                 | —               | **Saucers**      | —               | **Gyrocopters**   | —                     |
| `COMMERCE`      | —              | Plunder           | —               | —                | —               | —                 | —                     |
| `RAIDING`       | —              | —                 | —               | —                | —               | **Dive Bombing**  | —                     |
| `CHIVALRY`      | **Vampires**   | **Scrap Buggies** | **T-Rex**       | **Motherships**  | **Sabretooths** | **Whirligigs**    | **Chocolate Bunnies** |
| `ENGINEERING`   | —              | —                 | —               | —                | —               | **Mining**        | —                     |
| `METALLURGY`    | —              | —                 | **Triceratops** | —                | **Mammoths**    | **Steam Tanks**   | **Jawbreakers**       |
| `FORTIFICATION` | —              | —                 | Nesting         | Force Fields     | Deep Winter     | Dig In            | Home Sweet Home       |
| `EXPLOSIVES`    | Pestilence     | —                 | Wallbreaker     | Disintegrator    | Brittle         | Blasting Charges  | Peppermint Surprise   |

The Ice Folk naval names (Rime, Pack Ice, Icebound, Black Ice, Glacier) are
unchanged.

**The one design row not followed:** Dinosaur Sawmilling is **Timber** (the
existing name), not "Chopping".

**Where a name shows.** The technology tree, the research prompt, the unit
cards ("Needs …"), the Gallery, the Help, and the text harness, which
prints the ID and then the name wherever the two differ (`DRILL
"Garrison"`). The Human heavy is the Champion in the role labels, the
Gallery (its row is "Champion"), the board, the lab briefings, and the
harness (map code `Ch`).

## 6. Rules keyed on a role that the moves touched

A role ID means a job again, so a rule that named the role now applies to
the unit that does the job. Each such rule, and what was done:

| Rule                                                                    | Keyed on                              | What was done                                                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every attack destroys Field Defense on the target tile                  | the `CATAPULT` role                   | Now the role mechanic `demolishesFieldDefense`: every faction's `CATAPULT` role (the Stegosaurus too) **and the Triceratops**, which keeps it. The reason literal is `CATAPULT`. |
| A Rally skips `SUPPORT` and `SIEGE` units                               | the tactical label                    | The Triceratops is `LINE` now; the role mechanic `rallyExcluded` keeps it out of War Drums and of a Brain's Psychic Command. The Stegosaurus is out by its `SIEGE` label.        |
| The tactical label of a role is the same in every tree                  | the registry check                    | Kept: Triceratops, Mammoth, and Steam Tank are `LINE`; Stegosaurus `SIEGE`; Musk Ox `DEFENDER`; Whirligig `BREAKTHROUGH`.                                                        |
| Only the Fighter and Guard roles build Field Defense                    | `FIGHTER`, `GUARD`                    | No Ice Folk unit builds it: the Musk Ox (`GUARD`) is registered without it, as the Mammoth was.                                                                                  |
| A Bitten or Infected victim rises as the biter's `GUARD`                | the biter's seat                      | Unchanged: the biter is an Undead seat, whose `GUARD` is the Zombie.                                                                                                             |
| Knockback, Tractor Beam, Bounce, and Mind Control skip the giant        | the `JUGGERNAUT` role and two slots   | Unchanged. The Triceratops's two slots still make it immune to Knockback, the Tractor Beam, and Mind Control.                                                                    |
| The treasure unit                                                       | the faction's `treasureUnitRole`      | Unchanged: no faction's treasure role moved (Dinosaur, Ice Folk, and Dwarf chests give the `RAIDER` role).                                                                       |
| Forest freedom and the Sight of Fieldcraft and Scouting                 | `RAIDER`, `MARKSMAN`                  | Unchanged.                                                                                                                                                                       |
| Constructs (no Grave, never Bitten, never mind-controlled)              | the role mechanic                     | The Whirligig is a construct; the Steam Tank was never one and is not.                                                                                                           |
| Machines for Repair                                                     | the role mechanic                     | The Steam Tank and the Whirligig are both machines.                                                                                                                              |
| The Charge! animation of a siege-role Triceratops                       | Dinosaur `CATAPULT`                   | Removed: the Triceratops lunges as a line unit and the Stegosaurus lobs its boulder as a siege unit.                                                                             |
| Help, cards, and notices that name a unit by its role                   | `CATAPULT`, `GUARD`, `KNIGHT` lookups | Repointed: Charge! and Wallbreaker name the Triceratops, Trample the Mammoth, Plated the Steam Tank.                                                                             |
| The Normal AI's Triceratops rules (Nesting, Wallbreaker, Planning)      | Dinosaur `CATAPULT`                   | Repointed to the heavy role (`ARMY_DINOSAUR_CHARGER_ROLE_V7`).                                                                                                                   |
| The Ice Folk AI's Mammoth share, the Dwarf AI's front and first-of-role | `GUARD`, `KNIGHT`                     | The Mammoth's share moved to the heavy role; the Steam Tank counts as a front unit and has the first-of-role value.                                                              |

## 7. The Normal AI

A first pass so that nothing breaks. None of it was tuned.

- **Research order (the five army factions).** Humans: unchanged in order
  (Marksman, Guard, Champion, Catapult, Knight, Captain); the Champion's
  chain is now Drill, Engineering, Metallurgy. Goblins: the Ogre after the
  Warboss, before the Scrap Buggy. Undead: the Wight after the
  Necromancer, before the Vampire. Martians: the Shock Trooper after the
  Ray Gunner, before the Tripod (the design wanted that only against a
  melee enemy; the order is unconditional). Dinosaurs: the Triceratops
  second as before, by its new chain; the Stegosaurus after the Spitter.
- **Purchases (the five army factions).** The heavy is a `LINE` unit, so it
  is the dearer unit of the line share and is bought when the line is
  short and the Coins reach, as the Human Swordsman was. The Dinosaur
  shares changed with the labels: line 40% (Triceratops and Cavemen),
  defenders 25%, ranged 15%, siege 10% (the Stegosaurus), breakthrough 10%;
  against fragile enemies 30 / 20 / 15 / 10 / 25.
- **Dwarf, Ice Folk, Candy (the older policy).** Each researches toward
  its heavy with its other tier-3 units (the shortest chain first), counts
  it as a front unit, and gives the first one the first-of-role value. The
  Ice Folk seat's Mammoth share moved with the Mammoth; the Musk Ox is one
  per three other front units and a body under threat. The Dwarf seat
  still builds Steam Tanks (at Metallurgy) and builds Whirligigs (at
  Chivalry).
- **Use rules** (`src/ai/v7-ninth-unit.ts`; a small positional value each):
  an Ogre stands beside a target another Goblin unit can reach; a Shielded
  Shock Trooper stands between its line and the enemy; a Whirligig goes
  where two or three weak units stand next to one tile, and not beside
  healthy melee units; every seat's unit is drawn onto a hostile Wight's
  marked Grave and keeps off its own seat's; an Undead seat does not Raise
  or Devour its own Wight's Grave while no enemy is within two tiles of
  it. The Stegosaurus is played by the existing siege rules (it stays
  behind and never attacks after moving).
- **Not built:** "shoot the Shields off before melee" for the enemies of a
  Shock Trooper, and a Jawbreaker garrison against pullers.

## 8. Stand-in art

Seven units have no art: the Ogre, Wight, Shock Trooper, Jawbreaker,
Stegosaurus, Musk Ox, and Whirligig. Each is drawn as the nearest unit of
its own faction with a lettered steel badge on the board and the stand-in
mark in the Gallery. No PixelLab call was made. What an art bead must make
for each is in its faction's art document:
[Goblin](../art/factions/GOBLIN.md), [Undead](../art/factions/UNDEAD.md),
[Martian](../art/factions/MARTIAN.md), [Candy](../art/factions/CANDY.md),
[Dinosaur](../art/factions/DINOSAUR.md),
[Ice Folk](../art/factions/ICE_FOLK.md), [Dwarf](../art/factions/DWARF.md).
The Champion keeps the Swordsman's art
([Human](../art/factions/ORIGINAL.md)).

| Unit          | Art slot                  | Drawn as         | Badge |
| ------------- | ------------------------- | ---------------- | ----- |
| Ogre          | `UNIT:GOBLIN:SWORDSMAN`   | Orc Brute        | O     |
| Wight         | `UNIT:UNDEAD:SWORDSMAN`   | Skeleton         | W     |
| Shock Trooper | `UNIT:MARTIAN:SWORDSMAN`  | Grunt            | T     |
| Jawbreaker    | `UNIT:CANDY:SWORDSMAN`    | Marshmallow      | J     |
| Stegosaurus   | `UNIT:DINOSAUR:SWORDSMAN` | Ankylosaurus     | S     |
| Musk Ox       | `UNIT:ICE_FOLK:SWORDSMAN` | Mammoth          | X     |
| Whirligig     | `UNIT:DWARF:SWORDSMAN`    | Clockwork Gunner | W     |

## 9. Shapes

- **Identity.** `pulp-wars-poc-7r55`; save key `pulpWars.save.v7r55.current`.
  `pulp-wars-poc-7r54` is a prior identity and its save key is obsolete.
- **State.** One new key, `ninthUnit`: `wightGraves` (the marked Graves,
  each `{ at, ownerId }`), `risenWights`, `crackedThisTurn`, and
  `struckThisTurn` (pairs `{ unitId, targetUnitId }`). The player view
  carries the same key, filtered by what the viewer sees.
- **Events.** One new kind, `WIGHT_RISEN` (`playerId`, `unitId`, `at`,
  `hp`), after `BITTEN_UNIT_RISEN` in the kind order. `UNITS_CHILLED` has
  the new source `FROSTBITE`.
- **The combat preview** has three new fields: `shockDamage`,
  `crackApplied`, and `frostbiteApplied`. `damageToAttacker` and
  `attackerShieldDamage` include the shock.
- **Errors.** `ATTACK_NOT_LEGAL` has the new reason `ALREADY_STRUCK`.
- **Role rules.** Every tree unlocks `SWORDSMAN` at `METALLURGY` and no
  unit at `ENGINEERING`. Nine role mechanics are new: `gangUpWeight`,
  `riseAgainHp`, `shockFieldDamage`, `immovable`, `cracksArmour`,
  `frostbite`, `attacksPerTurn`, `rallyExcluded`, and
  `demolishesFieldDefense`.
- **Unit stats.** The Defense breakdown has the new modifier source
  `CRACKED`.
- **Missions.** The four middle-game labs are revision 2; `LAB_BACKLINE`,
  `LAB_LATE`, and the three breakthrough labs are revision 3.

## 10. Tests, fixtures, and pins

`tests/unit/ruleset-v7-ninth-unit.test.ts` has the rules of this pass:
the nine jobs of every faction, the heavy at Metallurgy, each of the seven
mechanics with its edges, the moved units' kept rules, the names, the
stand-in art, the labs, and the Normal AI's research and purchases.

The older tests were brought to `7r55` without weakening what they check:

- **Moved roles.** Tests of the Triceratops, the Mammoth, and the Steam
  Tank name the role `SWORDSMAN`; the roster tables of the Dinosaur, Ice
  Folk, and Dwarf tests have a row for the new unit of the vacated role
  and an assertion for the moved one.
- **Identity.** The prior-identity and obsolete-save-key lists end at
  `7r54`; the event kind order has 101 kinds.
- **Fixtures.** Four retained JSON states have the `ninthUnit` key; the
  retained late public view gets it in its read adapter.
- **Seeds of tests that need something to happen in ordinary AI play.**
  The Undead order now holds the Wight's two technologies, so Liches come
  later: `ruleset-v7-revision14` (Plague and Bitten round trip) uses seed
  23 (8), `ruleset-v7-revision14-ai` seed 8 (0),
  `ruleset-v7-undead-area-attacks` and
  `ruleset-v7-undead-headless-telemetry` seed 8 (0), and
  `ruleset-v7-mind-control` (a Brain takes a unit) seed 14 (15).
- **Pins of AI play.** The decision hash of the retained late public view
  (the command and the candidate count are unchanged); the parity matches
  of `ruleset-v7-curiosities` on Pangea, Continents (18 rounds, was 19),
  and Lakes; the Goblin breakthrough lab's bounded run (the capital falls
  in round 6, was 7); the initial-state hashes of the nine labs whose
  revision changed.
- **Unchanged.** The all-Human parity digests of
  `ruleset-v7-undead-faction` and the map-generation parity of
  `ruleset-v7-revision18-showcase` and `ruleset-v7-curiosities` match
  their old pins once the new neutral fields are left out, so an all-Human
  match in those tests plays command for command as before.

## 11. Open questions for hand play

The questions each faction's playtest should answer first. They are what
this pass could not know without playing.

**Every faction.**

- Is tier 3 for 5 to 9 Coins the right place and price for the heavy, now
  that it arrives with the siege and breakthrough units and competes with
  them for the same Coins? Does Metallurgy get bought at all, and does
  Engineering still get bought without a unit on it?
- Does the basic line unit still go obsolete in the middle game, and is
  that later than it was for the Humans at `7r48`?
- Arms Industry now discounts the unit of its own node: is a Forge city
  that trains heavies for 1 less too cheap a line?

**Human (Champion).** Is 6 Coins at tier 3 a fair price for the unit that
was "the workhorse" at 5 Coins and tier 2? Does the Human middle game
before round 15 hold without it (Fighters and Guards against Wolf Riders
and Raptors)? Does the Guard keep its two jobs? **Played** (bead
`pulp_wars-w49.18`, five hand games, nothing changed): the answers are in
[the Human tuning, round 9](RULESET_7_TUNING_HUMAN.md#16-round-9).

**Goblin (Ogre).** Is one Ogre per mob the pattern, or do players field
Ogres only (five weak heavies)? Does Heavyweight make a Rocket Cart with
one Ogre too reliable a kill? The Ogre is not Blast-proof: how often does
its own side's Kaboom and bomb splash kill it, and is that a cost or a
trap? Does the AI stand it beside the mob's target? **Played** (bead
`pulp_wars-w49.19`, four hand games as the Goblins, a lab, and two as the
Humans against them; no rule changed): the answers are in
[the Goblin pass, section 13](RULESET_7_TUNING_GOBLIN.md#13-the-hand-pass-at-7r55).
The last question is open: in two diagnostic matches the Goblin AI seat
reached Armoury in rounds 21 and 27 and trained one and two Ogres, and
where they stood was not read.

**Undead (Wight).** How often does a Wight actually rise (melee killers
advance onto the Grave; a ranged kill needs a second unit to step on it)?
Is "kill it hand to hand" too easy a counter, or the return too strong
against ranged armies? Do Zombie, Wight, and Lich leave the Ghoul, the
Banshee, and the Vampire with nothing to do? Is the marked Grave clear
enough on the board? Should a Wight that dies onto an existing Grave rise
(reading 3)?

**Martian (Shock Trooper).** Does a body in front of the rays change how a
Martian army fights, or is a Move-1 unit left behind by walkers and
flyers? Under a Force Field its Shield is 4 and refilled each turn: is the
shock up too often? Does a Human player learn "shoot the Shield off, then
go in" from the preview? Is Engineering on the way now worth its Mines to
a Martian seat?

**Dinosaur (Triceratops, Stegosaurus).** Does the Triceratops, three
technologies from the start on a branch away from the Chopping Block,
still arrive in time to carry the army, and was the `db` finding (eight
laid, none lost) the growth heal or the tier? Does the Stegosaurus's Crack
set up the charge, or is a 7-Coin, 12-HP Egg-laid shooter never worth its
turns? The faction had "nothing that attacks from three tiles" and now
has: does that remove a weakness that mattered? Should the Triceratops
take War Drums now that it is a line unit (decision 10)? Are the new
purchase shares sensible?

**Ice Folk (Mammoth, Musk Ox).** The largest change to an existing
faction: the Ice Folk lose their 6-Coin beast in the first ten rounds and
gain a 4-Coin wall. Can they hold their opening with Yetis and Musk Oxen?
Is Frostbite a real deterrent (the attacker is next turn's Shatter target)
or ignored? Does the Mammoth at tier 3 still feel like the faction's
centre? The Ice Folk have had no faction pass and still play the older AI.

**Dwarf (Steam Tank, Whirligig).** Is 9 Coins for the heavy too dear next
to the other factions' 5 to 6, or right for a unit no hit takes more than
4 from? The Steam Tank does not capture: should a heavy? Is the Whirligig
(12 HP, Defense 1.5, never heals by itself) a crowd-fighter or a 9-Coin
loss on its first retaliation? Three attacks at full strength on wounded
units: is it the answer to Goblin hordes and risen Zombies the design
meant? The Dwarves still play the older AI.

**Candy (Jawbreaker).** Rock Hard does nothing against a faction that
pushes nothing: is the Jawbreaker then just a heavy with a Rush, and is
that enough? Against Martians, Dinosaurs, and Dwarves is it "situationally
overpowered" as intended, or decisive (a garrison nothing can pull off a
centre)? Does the Rush then Crash rhythm suit a Move-1 line unit? Candy
still plays the older AI.
