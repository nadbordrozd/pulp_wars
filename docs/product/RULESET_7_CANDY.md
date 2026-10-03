# Ruleset 7: Candy faction (design)

**Status:** design (`pulp_wars-jdb.1`, epic `pulp_wars-jdb`). It is not a
contract and nothing in it is implemented. It went through a first draft,
a hard critique ([appendix A](#appendix-a-the-first-draft-and-its-critique)),
a redraft, a second, shorter critique
([appendix B](#appendix-b-second-critique)), and this final redraft. The
spec bead (`pulp_wars-jdb.2`) turns it into exact rules and state, command,
event, and preview shapes, and re-validates every number against the
engine; once the root approves that spec, it wins wherever the two differ.

**Scope:** an eighth playable faction, `CANDY` (displayed "Candy"): its
theme, four mechanical pillars, the roster mapped onto the shared
mechanical roles, the technology differences, a per-unit battle analysis,
its interactions with the seven existing factions and the shared rules,
and what the engine, Normal AI, UI, art, and balance beads need. The user
wants the faction to become an achievement-unlocked easter egg later; for
now it is just another faction offered in setup
([section 16](#16-the-future-unlock-a-proposal) proposes the unlock).
Economy, map rules, the technology graph, and the boats' rules are the
Human ones unless a section below says otherwise.

**Identity of the faction:** Humans are sustain, Undead are attrition,
Goblins are a reckless horde, Dinosaurs are few, big, and growing,
Martians are a small high-tech invasion force, the Ice Folk are the
things from the peaks, the Dwarves are heavy, slow, and built to last, and
the Candy are **a sugar rush**: a kingdom of living sweets that charge in
hyper and hit hard, crash flat on the next turn, crumble when they are
hit, and are baked again from their crumbs. A pie in the face stops an
enemy from hitting back, and the soft ones bounce attackers away. They are
strong on the turn they choose to spend, against fortified defenders, and
over a long fight in which their crumbs are not eaten; they are weak in
the turn after a Rush, against area damage and packs that kill fragile
10-HP bodies, against enemies that walk over their crumbs, and when their
Confectioners die.

Attack and Defense are shown in whole units, as in
[current rules section 11](RULESET_7_CURRENT.md#11-unit-roster); the code
stores half-units.

## 1. Sources and direction

The user's request (2026-10-03, epic `pulp_wars-jdb`): "design and
implement a special candy faction. inspired by the candy kingdom in
adventure time. this will be a special easter egg faction players will
unlock through some kind of achievement. for now make it just another
faction. it can be a bit wacky - not that the other factions are dead
serious."

The user's standing direction for new factions: "Before you start
implementing make sure they have a bunch of unique mechanics, some cool
useful abilities and not just slightly different stats from everyone else.
and think a bit about each unit - how would it work in a battle, would it
be useful, would it be too strong. e.g. the t rex with rampage turned out
too powerful in a way that could have been predicted and the triceratops
the opposite."

| #   | Requirement or standing lesson                                                                                                                                                             | Where                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| U1  | A candy faction inspired by the vibe of a sweet kingdom of living confections, wacky but readable.                                                                                         | [section 2](#2-theme-and-tone)                                                                             |
| U2  | Original characters and names only: inspired by, not copying, the show's characters, likenesses, and trademarks.                                                                           | [section 2.2](#22-original-names-no-borrowed-characters)                                                   |
| U3  | A bunch of unique mechanics and cool, useful abilities, not slightly different stats; each rule fits in one sentence and is visible on the board; a memorable "wow" event.                 | [section 3](#3-the-four-pillars)                                                                           |
| U4  | Every unit is thought through in battle before implementation: useful, not too strong, not dead (the T-Rex with Rampage was predictably dominant, the first Triceratops predictably weak). | [section 7](#7-per-unit-battle-analysis)                                                                   |
| U5  | The same mechanical roles and technology graph; no dead technology; reward, Militia, and treasure substitutions.                                                                           | [sections 4](#4-roster) and [5](#5-technology)                                                             |
| U6  | No attack from hiding and no hard locks (no rooting, no illegal-to-attack zones, no permanent denial); every penalty can be played through.                                                | [section 3](#3-the-four-pillars), [appendix A](#appendix-a-the-first-draft-and-its-critique) items 3 and 4 |
| U7  | The identity works in the first 20 rounds (the Normal AI rarely reaches expensive late units), and the Normal AI can play it with simple rules.                                            | [sections 3.1](#31-sugar-rush-and-the-crash) and [10](#10-normal-ai-needs)                                 |
| U8  | Balance is checked coarsely on Dry Land only; the identity is complete without water.                                                                                                      | [section 14](#14-balance)                                                                                  |
| U9  | Every player plays a different faction; faction looks and a permanent faction colour identify the owner.                                                                                   | [section 12](#12-art-needs)                                                                                |
| U10 | Its naval branch follows the naval branch expansion being designed in parallel, with tweaks; a placeholder here.                                                                           | [section 13](#13-naval-branch-placeholder)                                                                 |
| U11 | Later an achievement unlocks it as an easter egg; for now it is an ordinary faction.                                                                                                       | [section 16](#16-the-future-unlock-a-proposal)                                                             |

## 2. Theme and tone

### 2.1 Tone

The Candy are the silliest faction, and the rules stay as plain as every
other faction's. The jokes live in names, animations, and Help text: a
gumdrop soldier with a candy-cane spear, a donut that rolls into battle
with a rider on top, a pie that lands on a knight's face, a marshmallow
that goes "boing", a gummy bear on a sugar high that tramples a line and
then lies on its back with spinning eyes. Under the jokes every rule is a
one-sentence, deterministic, previewable game rule
([section 11.3](#113-help-one-liners)).

Wackiness that would hurt readability is out: no random effects (combat
stays PRNG-free), no hidden traps, no rule that depends on an animation.

### 2.2 Original names, no borrowed characters

The faction is inspired by the general idea of a sugary kingdom of living
confections ruled by a scientist monarch, with candy soldiers. It uses no
character, name, likeness, place name, or catchphrase from the show.

- **Faction display name:** "Candy". The realm, for flavour text only, is
  the **Kingdom of Sugarcrest**; the lore names no ruler (the units are
  generic sweets, like every other faction's units).
- **Unit names** are generic confection words: Gumdrop, Donut Racer,
  Gumball Gunner, Marshmallow, Confectioner, Pie Launcher, Gummy Bear, Rock
  Candy Golem.
- **Avoided on purpose:** banana-shaped guards; giant gumball-headed
  guardian statues (the Juggernaut is a rock-candy golem instead of a
  gumball machine); a pink-haired princess in a lab coat (the Confectioner
  is a round caramel sweet in an apron and goggles with a whisk); a
  peppermint butler; lemon-headed characters; any name of the show's
  kingdom, land, or characters. The art bead puts these in the faction's
  negative prompt ([section 12.4](#124-ip-guard-for-the-art)).

### 2.3 The look in brief

Glossy, rounded, edible: hard candy with a white highlight, soft jelly,
marshmallow, wafer, chocolate, candy-cane stripes, and sprinkles. The
permanent faction colour is **cotton-candy pink `#ffb8d8`**
([section 12.1](#121-faction-colour)). Details for the art bead are in
[section 12](#12-art-needs).

## 3. The four pillars

| Pillar                                                   | One sentence                                                                                                                                      | What the board shows                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Sugar Rush and the Crash](#31-sugar-rush-and-the-crash) | Before it moves, a Candy unit may Sugar Rush for +1 Move and +1 Attack on its first attack this turn; on its next turn it Crashes and cannot act. | a sparkle trail on a Rushed unit; a dizzy swirl and droopy pose on a Crashed one |
| [Crumbs and Re-baking](#32-crumbs-and-re-baking)         | A fallen Candy unit leaves Crumbs for three turns, and a Confectioner next to them can bake that unit back at half price and half HP.             | a crumb pile on the tile with the unit's role icon and three pips                |
| [Splat](#33-splat-a-pie-in-the-face)                     | A unit hit by a Pie Launcher cannot strike back for the rest of the Candy turn.                                                                   | a cream pie stuck on the unit's face                                             |
| [Bounce](#34-bounce-soft-and-springy)                    | A melee attacker that hits a Marshmallow or a Rock Candy Golem and survives is bounced one tile back.                                             | the attacker springs back one tile with a "boing"                                |

The two support abilities, the Confectioner's **Frosting** (the shared
Tend Wounded) and the Gumball Gunner's **Sugar Toss** (a ranged heal), are
unit abilities, not pillars ([section 3.5](#35-support-frosting-and-sugar-toss)).
The two technology effects, **Home Sweet Home** and **Peppermint
Surprise**, adjust the first two pillars ([section 5](#5-technology)).

**The wow events.** A Gummy Bear on a Sugar Rush tramples through a back
line (Marksman, Catapult, Captain) and is left Crashed in the middle of
the enemy army; next turn a Confectioner bakes it back out of its crumbs.
A Pie lands on a Walled Guard and two Rushed Gumdrops beat it without a
blow in return.

### 3.1 Sugar Rush and the Crash

**One sentence:** before it moves, a Candy unit may Sugar Rush for +1 Move
and +1 Attack on its first attack this turn; on its owner's next turn it
Crashes and cannot act.

- **Command.** `SUGAR_RUSH { unitId }`. Legal for an own land-form Candy
  unit (every role, the Golem included) that has not moved, has not used a
  primary action, has not landed this turn, is not Rushed, and is not
  Crashed. It is not a primary action and not a Move; it costs nothing and
  cannot be undone.
- **Rushed** (this turn only): the unit's Move is one higher (2 more
  half-points of budget), and its **first** `ATTACK` this turn gets +1
  Attack. The bonus does **not** add to Charge: a Rushed unit that also
  qualifies for Charge gets +1, not +2. It adds to nothing else either:
  Candy has no Rally.
- **Rush perks.** Two roles get one more thing while Rushed: the Donut
  Racer may make the Human Raider's **Escape** Move after an attack it
  survives, and the Gummy Bear has **Overrun** (labelled **Sugar
  Frenzy**). No other role has a perk.
- **The Crash.** At its owner's End Turn every Rushed unit becomes
  **Crashed**, unless Home Sweet Home spares it
  ([section 5](#5-technology)). A Crashed unit, during its owner's next
  turn, **cannot use a primary action** (Attack, Capture, Recover, Pillage,
  Frosting, Re-bake, Sugar Toss, and every other) and cannot Rush; it may
  Move, Wait, Promote, Disband, embark, and land. The Crash ends at the
  end of that turn. A Crashed unit keeps its zone of control, retaliates,
  Bounces, and recovers idle as usual (a Crashed unit that stays still
  gets idle recovery at the End Turn).
- **Frequency.** A unit can Rush at most every other turn: Rush on turn
  `N`, Crashed on `N + 1`, Rush again on `N + 2`.
- **Why it is new.** No faction borrows power from its own next turn.
  Inspired and Charge are free bonuses; the Ice Folk's sluggish is
  inflicted by the enemy and means "move or act". The Crash is
  self-inflicted and means "move but do not act": the opposite shape, and
  a decision every turn.
- **Why it works with the AI.** It is one free click before the ordinary
  Move, available from turn 1 with no technology, on every Candy unit. A
  simple rule plays it ([section 10](#10-normal-ai-needs)): Rush when the
  Rushed attack kills and the plain one does not, or when the extra tile
  saves a city.
- **Built-in brakes.** Capture is a primary action, so a unit that Rushed
  onto a center cannot capture on its Crash turn; a Rushed unit that kills
  a defender and advances onto a center blocks that center for two turns.
  Sustained fights favour not rushing: two plain Gumdrop attacks deal 10
  to a Fighter, one Rushed attack and a Crash deal 8.

### 3.2 Crumbs and Re-baking

**One sentence:** a fallen Candy unit leaves Crumbs for three turns, and a
Confectioner next to them can bake that unit back at half price and half
HP.

- **Crumbs.** When a unit owned by a Candy seat dies in land form on a
  land tile that is not a settlement center, it leaves **Crumbs** on that
  tile: a public tile marker recording the role and the Candy seat, with
  `turnsLeft` 3. Every death cause counts (attack, retaliation, splash,
  Wail, Plague, explosions, Shatter, a bomb, an eruption) except a death
  that rises (Infect, Bitten) and the removals (Disband, reward
  displacement, elimination, `BRAIN_LOST`). The Rock Candy Golem leaves no
  Crumbs (a reward unit has no price). A new death on a tile with Crumbs
  replaces them. Crumbs and an Undead Grave may share a tile.
- **Going stale.** At the Candy seat's End Turn every one of its Crumbs
  loses one turn; at 0 they are gone. Crumbs left during the Candy turn
  therefore last the rest of that turn and two more; Crumbs left during an
  enemy turn last three Candy turns.
- **Eaten.** A unit of a seat hostile to the Crumbs' owner that **ends a
  Move** on the tile (or lands there with `DISEMBARK`) eats them: they are
  gone. A flyer (Martian or Dwarf) never eats Crumbs, and nothing that is
  not a Move eats them (an advance, Push, Bounce, pull, Knockback, rising,
  Raise Dead, surfacing, or placement): such a unit just stands on them.
  Own and allied units never eat them.
- **Re-bake.** `REBAKE { unitId, at }`, a Confectioner primary action (it
  may have moved). Legal when the Crumbs at `at` are the actor's own,
  within 1 of the Confectioner, on an empty tile (no unit, Egg, or mound),
  the actor has the Coins, and the Confectioner's home city has a free
  slot. It pays **half the role's printed cost, rounded up** (Gumdrop 1,
  Donut Racer 2, Gumball Gunner 2, Marshmallow 2, Confectioner 3, Pie
  Launcher 4, Gummy Bear 5; Arms Industry does not apply), removes the
  Crumbs, and creates a new unit of that role on the tile at **half its
  maximum HP, rounded up**, with 0 kills, not a veteran, exhausted until
  its owner's next Start Turn, homed to the Confectioner's home city, and
  with no status of the dead unit. It needs no technology: the Crumbs are
  the recipe. A mind-controlled Confectioner cannot Re-bake (its role rule
  drops the ability, as a controlled Brain's drops Mind Control).
- **Why it is new.** Raise Dead turns any death into a free Skeleton;
  Assemble builds one fixed construct from Coins. Re-bake brings back
  **the same role** that died, only Candy's own, only for a price, only
  for three turns, and the enemy can deny it by walking onto the Crumbs.
  It makes losing an expensive unit cheaper and puts a decision on both
  sides: protect or bait the Crumbs, eat them or kill the Confectioner.

### 3.3 Splat: a pie in the face

**One sentence:** a unit hit by a Pie Launcher cannot strike back for the
rest of the Candy turn.

- A target that survives a land-form Pie Launcher's `ATTACK` is
  **Splatted** until the end of the Pie's owner's turn, whether the hit
  went to HP or to a Martian Shield. A Splatted unit does not retaliate
  against any attacker (the combat preview's `noRetaliationReason` is
  `SPLATTED`); it keeps its Defense, fortification, cover, and every other
  rule. The Pie's retaliation never splats.
- It is a per-turn list cleared at the Pie owner's End Turn (the
  `bombedThisTurn` precedent), so in a match of three or more players it
  helps only the Candy seat.
- **Why it is new.** The Vampire's Unanswered belongs to one attacker;
  Splat belongs to a target, and every Candy unit benefits. It is the
  Candy answer to fortified defenders: it removes the price of attacking
  them, not their Defense.

### 3.4 Bounce: soft and springy

**One sentence:** a melee attacker that hits a Marshmallow or a Rock Candy
Golem and survives is bounced one tile back.

- When a land-form Marshmallow or Rock Candy Golem survives an attack from
  distance 1 and the attacker survives too, the attacker moves one tile
  directly away from the defender under the Push conditions of
  [current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat) (on
  the board, explored by the defender's owner, no unit or mound, not a
  settlement, the same land or water kind, enterable by the attacker, not
  in territory allied to the attacker, no treasure chest). A blocked
  Bounce does nothing. A `JUGGERNAUT`-role attacker (and the Giant Spider,
  whose role is `JUGGERNAUT`) is never bounced; two-slot units are.
- It resolves last in the attack, after any Push, Charge! follow, and
  Knockback, so a Triceratops that pushes a Marshmallow and follows is then
  bounced back to where its follow started.
- It is not a Move: the attacker keeps its `moved` flag, takes nothing,
  eats no Crumbs, and keeps its Chill; leaving a Field Defense tile loses
  that cover.
- **Why it is new.** Push and Knockback move the defender; Bounce moves
  the attacker. It breaks the attacker's next turn without a lock: a
  bounced Guard, Zombie, Orc Brute, or Ankylosaurus (which cannot attack
  after moving) cannot attack the Marshmallow on its next turn without
  walking back first, a bounced Goblin leaves the Gang Up ring, and a
  bounced unit loses Forest, Field Defense, or a Dug-In tile.

### 3.5 Support: Frosting and Sugar Toss

- **Frosting** is the Confectioner's Tend Wounded under a Candy label
  (command `TEND_WOUNDED`): every adjacent own land-form unit heals up to
  2 and is cured of Plague, Bitten, and Chill. It does not end a Crash or
  a Splat.
- **Sugar Toss** (`SUGAR_TOSS { unitId, targetUnitId }`), a Gumball Gunner
  primary action instead of an attack: an own damaged land-form unit
  within distance 2 (not the Gunner itself) heals up to 2. A unit can be
  healed by Sugar Toss once per turn (from any Gunner). It cures nothing.
  This answers the brief's "units repaired with sugar" with a ranged
  heal, which no faction has.

### 3.6 Ideas weighed

The brief listed ideas to weigh. Each was checked against what the seven
factions already own.

| Idea                                        | Verdict                                                                                   | Why                                                                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sugar rush with a crash                     | **pillar 1**                                                                              | New axis (tempo borrowed from the next turn); one free click; works from turn 1.                                                                                                    |
| Units eaten or repaired with sugar          | **Crumbs (eaten), Sugar Toss (repaired)**                                                 | Crumbs are a contested resource; Sugar Toss is the only ranged heal in the game.                                                                                                    |
| A royal scientist who brings sweets to life | **the Confectioner's Re-bake (pillar 2)**                                                 | Must differ from Raise Dead and Assemble: same role back, own deaths only, paid, deniable, three turns.                                                                             |
| A big sweet golem as the level-up giant     | **the Rock Candy Golem**                                                                  | A rock-candy golem, not a gumball-machine guardian (IP); Bounce makes it a city anchor.                                                                                             |
| Gumdrop walls                               | rejected                                                                                  | Ruleset 7 has no destructible structure; a wall entity is a large engine and AI cost for a niche effect. Bounce gives the "soft wall" feel on a unit.                               |
| Sticky caramel spread, slowing enemies      | rejected                                                                                  | It is the Ice Folk's deep snow under another name (a derived terrain that ends enemy Moves).                                                                                        |
| Taffy that roots an attacker                | rejected (first draft, [appendix A](#appendix-a-the-first-draft-and-its-critique) item 3) | Rooting is a hard lock, which the standing direction forbids; Bounce replaced it.                                                                                                   |
| Bubblegum bubbles that float units          | rejected                                                                                  | Flying already exists twice (Martian flyers, the Dwarf Gyrocopter) and carrying another unit is Beam Down.                                                                          |
| Peppermint explosions                       | **kept small (Peppermint Surprise)**                                                      | Blasts are the Goblins'. A fixed 3 on a unit that eats Crumbs, after research, is the only peppermint bang ([section 5](#5-technology)).                                            |
| Licorice whips that pull                    | rejected                                                                                  | The Martian Tractor Beam pulls.                                                                                                                                                     |
| Candy-coated villages                       | **look only**                                                                             | Candy cities and captured villages are drawn as candy houses (art, and the faction-building-looks epic `pulp_wars-xdh`); a territory rule would echo Ice Folk Snow.                 |
| A rolling donut that hits a whole line      | rejected as a rule, kept as a look                                                        | Ruleset 6's Kamikaze Roll was a board-edge line attack; lane attacks are what made the first Triceratops (Stampede) awkward. The Donut Racer is a rider on a rolling donut instead. |

## 4. Roster

| Unit             | Role          | Tech           | Cost |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                                                          |
| ---------------- | ------------- | -------------- | ---: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------------------------------------------------ |
| Gumdrop          | `FIGHTER`     | start          |    2 |  10 |      2 |       2 |    1 |     1 |     1 | yes               | yes     | Sugar Rush; no Field Defense                                       |
| Donut Racer      | `RAIDER`      | Scouting       |    3 |  10 |      2 |       1 |    2 |     1 |     2 | yes               | yes     | Sugar Rush (Rushed: Escape); Charge (Raiding); no Escape otherwise |
| Gumball Gunner   | `MARKSMAN`    | Marksmanship   |    3 |   8 |      2 |       1 |    1 |   1–2 |    1¹ | yes               | yes     | Sugar Rush; Sugar Toss                                             |
| Marshmallow      | `GUARD`       | Drill          |    4 |  18 |    1.5 |     2.5 |    1 |     1 |     1 | no                | yes     | Sugar Rush; Bounce; no Field Defense                               |
| Confectioner     | `CAPTAIN`     | Administration |    5 |  10 |      1 |       1 |    1 |     1 |     1 | yes               | no      | Sugar Rush; Frosting; Re-bake; no Rally                            |
| Pie Launcher     | `CATAPULT`    | Sawmilling     |    8 |  10 |      3 |     0.5 |    1 |   2–3 |     1 | no                | no      | Sugar Rush; Splat; never advances                                  |
| Gummy Bear       | `KNIGHT`      | Chivalry       |    9 |  14 |      3 |     1.5 |    2 |     1 |     1 | yes               | no      | Sugar Rush (Rushed: Sugar Frenzy = Overrun); no Overrun otherwise  |
| Rock Candy Golem | `JUGGERNAUT`  | reward only    |    — |  40 |      4 |     3.5 |    1 |     1 |     1 | yes               | yes     | Sugar Rush; Push; Bounce                                           |
| Patrol Boat      | `PATROL_BOAT` | Shorecraft     |    5 |  10 |      2 |       2 |    2 |     1 |     2 | yes               | no      | naval ([section 13](#13-naval-branch-placeholder))                 |
| Battleship       | `BATTLESHIP`  | Naval Eng.     |   16 |  25 |      6 |       4 |    2 |   1–3 |     3 | no                | no      | naval; splash                                                      |

¹ Gumball Gunner Sight becomes 2 with Fieldcraft.

- **Gumdrop** (a gumdrop soldier with a candy-cane spear and a wafer
  shield) has Fighter parity for cost, Attack, Defense, Move, capture,
  Pillage with Raiding, Disband, Promotion (15 HP promoted), and the
  advance, with 10 HP like the Skeleton, and cannot build Field Defense.
  It is the start unit and the Militia.
- **Donut Racer** (a candy-corn kid riding a frosted donut that rolls like
  a wheel) has Raider parity for Move 2, Sight 2 with Scouting, Charge with
  Raiding, Pillage, capture, the advance, and Fieldcraft Forest freedom.
  It has Escape only while Rushed. It costs 3 and has 10 HP (the Ghoul,
  Wolf Rider, and Sled precedent for a Raider without innate Escape). It
  is the treasure unit.
- **Gumball Gunner** (a jellybean with a gumball blaster) has Marksman
  parity (range 1–2, minimum range 1, capture, Pillage, Disband,
  Fieldcraft Forest freedom and Sight, the advance after an adjacent
  kill), 8 HP, and Sugar Toss.
- **Marshmallow** (a big square marshmallow with a graham-cracker shield)
  has Guard parity for "cannot attack after moving" and capture, 18 HP,
  Defense 2.5, Attack 1.5, costs 4, cannot build Field Defense, and
  Bounces.
- **Confectioner** (a round caramel sweet in an apron and brass goggles,
  with a whisk) has Captain parity for its body and no capture. It has no
  Rally; its primary actions are Attack, Frosting, and Re-bake.
- **Pie Launcher** (a gingerbread catapult flinging cream pies) has
  Catapult parity (range 2–3, minimum range 2, cannot attack after moving,
  no capture, never advances, Field Defense destruction on the target tile
  with reason `CATAPULT`) with Attack 3 instead of 3.5, plus Splat.
- **Gummy Bear** (a big translucent gummy bear brawler) has Knight parity
  for no capture and the advance after a melee kill, with 14 HP, Defense
  1.5, and Move 2. It has no Overrun except while Rushed (Sugar Frenzy).
- **Rock Candy Golem** (a hulking golem of rock-candy crystals bound with
  caramel) has Juggernaut parity (reward only, capture, Push on an
  adjacent surviving target, the advance, no Pillage, no Disband) with
  Defense 3.5, and Bounces. It may Rush (Move 2, Attack 5 on its first
  attack) and Crash like any Candy unit.
- **Every Candy land unit has Sugar Rush.** Every role uses one slot.
  **No Candy unit builds Field Defense** (the tree replaces Fortification,
  [section 5](#5-technology)).
- **Substitutions.** Start unit: one Gumdrop on the capital. Militia: one
  Gumdrop. Juggernaut reward: the Rock Candy Golem. Treasure unit: the
  `RAIDER` role (a Donut Racer), as for the Dinosaurs, Martians, Ice Folk,
  and Dwarves.
- **Capture-capable:** Gumdrop, Donut Racer, Gumball Gunner, Marshmallow,
  Rock Candy Golem.
- **Disband refunds** (`floor(cost / 2)`): Gumdrop, Donut Racer, and
  Gumball Gunner 1; Marshmallow and Confectioner 2; Pie Launcher and Gummy
  Bear 4. The Golem cannot Disband.
- **Re-bake price and HP** (half the printed cost and half the maximum HP,
  each rounded up): Gumdrop 1 Coin, 5 HP; Donut Racer 2, 5; Gumball Gunner
  2, 4; Marshmallow 2, 9; Confectioner 3, 5; Pie Launcher 4, 5; Gummy Bear
  5, 7.
- **Tactical labels** are the Human ones of each role (the registry rule):
  the Pie Launcher is `SIEGE`, the Confectioner `SUPPORT`, the Marshmallow
  `DEFENDER`.

## 5. Technology

The Candy tree (`CANDY_BASELINE_V1`) has the Human graph, tiers,
prerequisites, costs, free opener, and Dry Land Naval rule, with four
unlock differences (Administration, Chivalry, Fortification, Explosives);
the other rows read differently only through the Candy labels:

| Technology     | Candy name          | Candy unlocks                                                                                       |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| Administration | same                | Confectioner (Frosting, Re-bake); Market; Disband                                                   |
| Sawmilling     | same                | Sawmill; Pie Launcher (Splat)                                                                       |
| Marksmanship   | same                | Gumball Gunner (Sugar Toss)                                                                         |
| Fieldcraft     | same                | Replant Forest; Donut Racer and Gumball Gunner ignore Forest movement stops; Gumball Gunner Sight 2 |
| Scouting       | same                | Donut Racer; Donut Racer Sight 2                                                                    |
| Raiding        | same                | Pillage; Donut Racer Charge                                                                         |
| Chivalry       | same                | Gummy Bear (Sugar Frenzy while Rushed); Cultivate Forest; no Overrun                                |
| Drill          | same                | reveal Ore; Marshmallow (Bounce); first-hostile-capture Spoils                                      |
| Fortification  | Home Sweet Home     | A Rushed unit that ends its turn on or next to one of your city centers does not Crash              |
| Explosives     | Peppermint Surprise | Blast Mountain; melee attacks destroy Field Defense; an enemy that eats your Crumbs takes 3         |

- **Administration** grants `CONFECTIONER_SUPPORT` (Frosting and Re-bake)
  instead of Captain support (no Rally).
- **Chivalry** grants no Overrun (the Undead, Martian, Ice Folk, and Dwarf
  precedent); the Gummy Bear's Sugar Frenzy is a role rule.
- **Fortification**, displayed as **Home Sweet Home**, grants
  `HOME_SWEET_HOME` instead of the Field Defense command: at the End Turn,
  a Rushed unit on or next to (Chebyshev 1) an own city center does not
  become Crashed. The radius is Dig In's. It makes Rush a defensive tool at
  the cities without making it free in the field.
- **Explosives**, displayed as **Peppermint Surprise**, keeps Blast
  Mountain and the melee Field Defense demolition and adds
  `PEPPERMINT_SURPRISE`: a unit that eats the player's Crumbs takes a fixed
  3 (a Martian Shield absorbs first; a Steam Tank's Plated cap applies; it
  can kill, credits no unit with the kill, and a death it causes leaves a
  Grave as usual). It is
  public through a visible Candy unit's stats, as Brittle and Blasting
  Charges are.
- **No dead technology.** Every technology has a live unlock for a Candy
  seat: Fieldcraft (Donut Racer, Gunner), Raiding (Pillage, Charge),
  Engineering (Mountains, Mine), Metallurgy (Arms Industry, which lowers
  training costs but not Re-bake prices), and the Naval branch as for
  every faction.
- `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains
  `CANDY: { FORTIFICATION: "Home Sweet Home", EXPLOSIVES: "Peppermint Surprise" }`;
  the engine reads the effects through capabilities (`homeSweetHome`,
  `crumbsBite` 0 or 3), never a raw technology test.

## 6. Resolution and edge rules

**An attack** (the order the spec makes exact, inserted into
[current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat) and the
faction resolution orders):

1. Attack: base Attack, + 1 Sugar Rush (first attack this turn, not with
   Charge), and the shared bonuses.
2. Damage, Shields, Armoured, Plated, as today.
3. Retaliation is skipped if the defender is Splatted.
4. Deaths; a dying Candy unit leaves Crumbs right after its `UNIT_DIED`
   (before a Grave event on the same tile, or after it: the spec picks one
   order and pins it).
5. A Pie Launcher's surviving target becomes Splatted.
6. Advance, Push, Charge! follow, Knockback, as today.
7. **Bounce** of a surviving melee attacker of a surviving Marshmallow or
   Golem.
8. Chains, Overrun or Sugar Frenzy continuation (evaluated on the board
   after the Bounce: a bounced attacker made no kill, so it has none).

**End Turn** (the Candy seat's): after idle recovery and the expiry of
Inspired and Overrun, Rushed units become Crashed (Home Sweet Home
spares those next to own centers), the Crash of units that were Crashed
this turn ends, the seat's Crumbs count down, and the Splatted list is
emptied. One event per step that changed something (the spec names them).

**Edge rules:**

- A Rushed unit that never moves or attacks still Crashes.
- A sluggish (Chilled) unit may Rush; the sluggish rule still applies, so
  if it moves it cannot attack.
- A mind-controlled Candy unit keeps Sugar Rush and the Crash for its
  controller (it keeps its kind's abilities); Home Sweet Home reads the
  controller's technology and cities. A Candy unit that dies while
  controlled leaves no Crumbs (its owner is not a Candy seat).
- An embarked Candy unit cannot Rush; a Rushed unit that embarks still
  Crashes.
- Escape (Donut Racer) gives the ordinary fresh Move 2 budget, not 3.
- Sugar Frenzy continues like Overrun after kills, at the Bear's base
  Attack (the Rush +1 was spent on the first attack).
- Re-bake never targets Crumbs under a unit; an enemy that advanced onto
  Crumbs protects them from Re-bake until it leaves, and if it leaves by a
  Move it ends elsewhere, so the Crumbs survive.
- A Bounce off a city center is legal (the attacker attacked from a
  center); a Bounce onto one is not (Push conditions).

## 7. Per-unit battle analysis

### 7.1 Method

The numbers below come from a scratch port of the damage formula of
[current rules section 13.2](RULESET_7_CURRENT.md#132-damage)
(`attackForce = attack × hp / maxHp`, `defenseForce = defense × hp / maxHp
× cover`, damage rounded half up, capped at HP), checked against the
published examples (a Fighter on a Yeti deals 5 and takes 3, 4 and 4 on
Snow; the Giant Spider deals 8 to a Fighter and takes 4). It ignores
Shields unless stated (a Grunt's or Ray Gunner's Shield 2 absorbs 2 of
each hit). The spec bead re-runs every table against the engine, as the
Dwarf contract did. Opponents are at full HP on open Grass with no
fortification unless stated; "deals / takes" is the Candy unit's damage
dealt and the retaliation it takes back. Human Fighter, Raider, and
Marksman have 12 HP, the Guard 17.

### 7.2 Gumdrop

_Fighter, 2 Coins, 10 HP, 2 / 2._

| Situation                 | Plain   | Rushed (+1 first attack) |
| ------------------------- | ------- | ------------------------ |
| Gumdrop attacks a Fighter | 5 / 5   | 8 / 4                    |
| … a Marksman or Raider    | 6 / 2   | 10 / 1                   |
| … a Catapult (10 HP)      | 7 / 0   | 10, kill                 |
| … a Captain (10 HP)       | 6 / 2   | 10, kill                 |
| … a Hammerer or Caveman   | 5 / 5   | 8 / 4                    |
| … a Yeti (9 HP)           | 5 / 3   | 9, kill                  |
| … a Goblin (6 HP)         | 6, kill | 6, kill                  |

| Attacker on a Gumdrop      | Deals / takes |
| -------------------------- | ------------- |
| Fighter, Skeleton, Caveman | 5 / 5         |
| Knight                     | 8 / 4         |
| Raptor with Pounce         | 10, kill      |
| Goblin with Gang Up +2     | 10, kill      |
| Catapult                   | 10, kill      |
| Lich (then splash 4)       | 8 / —         |

- **In a fight** the Gumdrop is a Skeleton that can spend its next turn
  for one strong hit: Rushed, it moves 2 and attacks at 3, so two Rushed
  Gumdrops kill a full Fighter (8, then 4 more) where plain ones need
  three attacks. Its 10 HP is the faction's weak spot: a pouncing Raptor,
  a Catapult, or a Goblin with two helpers kills it outright.
- **Counters:** packs and area damage (Goblins, the Lich's splash, Bomb
  Chuckers), and simply attacking it in its Crash turn, when it cannot
  answer except by retaliation.
- **Too strong?** No: at 2 Coins with 10 HP it loses an even trade to a
  12-HP Fighter unless it spends a Rush, and a Rush costs the next turn.
  **Too weak?** It is the cheapest Re-bake (1 Coin), so a lost Gumdrop
  next to a Confectioner comes back at 5 HP. The lever if it is too weak
  is HP 11.

### 7.3 Donut Racer

_Raider, 3 Coins, 10 HP, 2 / 1, Move 2._

- Plain, it is a Wolf Rider or a Sled: Move 2, Sight 2, Charge +1 after
  moving two tiles (Attack 3): 8 to a Fighter, 10 to a Marksman, a kill on
  a Catapult or a Ray Gunner (8 HP).
- **Rushed**, it moves 3 and may Escape after the attack: a hit-and-run
  raider every other turn. Because Rush and Charge do not add up, a
  Rushed charge is still Attack 3; the Rush buys reach (three tiles, or
  four on Roads) and the getaway.
- **Too strong?** In the first draft the bonuses added up (Attack 4 after
  a Rushed charge), and a 4-Coin unit killed a full 12-HP Fighter,
  Marksman, Raider, or Hammerer in one blow
  ([appendix A](#appendix-a-the-first-draft-and-its-critique) item 1). Now
  it equals the Human Raider (which has Escape every turn, 12 HP, and
  costs 4) on its Rush turn and is a weaker raider on the Crash turn,
  when it can still move.
- **Too weak?** It captures villages like any raider (a Rush to reach a
  village does not help capture, because the Crash blocks the capture
  next turn; the reach still helps block a rival). Cost 3 keeps it the
  scouting buy.
- **Counters:** Zones of control (it has no Prowl), a fortified line, and
  anything that kills 10 HP (Knight, Raptor, Catapult).

### 7.4 Gumball Gunner

_Marksman, 3 Coins, 8 HP, 2 / 1, range 1–2._

- It shoots like a 3-Coin Marksman with 8 HP: 5 to a Fighter from 2 (no
  answer), 6 / 2 against a Marksman (both at range 2). Rushed: it
  moves 2 and shoots at 3 (10 to a Marksman).
- **Sugar Toss** heals one own unit within 2 by 2 instead of shooting. Two
  Gunners keep a Marshmallow or a Golem topped up from behind it; the
  once-per-turn limit stops five Gunners from healing one unit by 10.
- **In a fight** it is the back row: it softens and finishes, and between
  waves it heals. It dies to a Knight (Attack 3 vs Defense 1, 8 HP) or a
  Catapult hit, like every 8-HP shooter.
- **Too strong or weak?** It is a Marksman with a second job; the heal is
  the Captain's per-unit amount, at range, on one unit. The tuning bound
  is heal 2–3.

### 7.5 Marshmallow

_Guard, 4 Coins, 18 HP, 1.5 / 2.5._

| Attacker on a Marshmallow   | Deals / takes | Then                                      |
| --------------------------- | ------------- | ----------------------------------------- |
| Fighter, Skeleton, Hammerer | 4 / 6         | bounced 1 tile                            |
| Knight                      | 7 / 5         | bounced (no Overrun: no kill)             |
| Raptor with Pounce          | 9 / 5         | bounced                                   |
| Mammoth                     | 6 / 6         | bounced (its Sweep still hits the flanks) |
| T-Rex                       | 11 / 4        | bounced (two-slot units are bounced)      |
| Catapult, Marksman          | 9, 4          | no Bounce (not melee)                     |
| Juggernaut, Troll, Titan    | as usual      | never bounced                             |

- **In a fight** it is a Guard that does not stay hugged: every melee
  attacker that does not kill it ends one tile away, so it cannot be
  ganged up on from the same ring twice, Guards and Zombies that bounce
  lose their next attack (they cannot attack after walking back), and a
  line of Marshmallows in front of Gunners and a Pie keeps melee away
  from them for a turn per hit.
- **Its weakness:** it hits weakly (3 to a Fighter, 6 when Rushed), ranged
  attackers ignore the Bounce, and a Bounce can save a fragile attacker
  from the Candy counterattack by throwing it out of reach. A player
  attacks a Marshmallow with ranged units first.
- **Too strong?** It has a Guard's body with less Defense (2.5 against 3)
  and a cost of 4 against 3; it cannot be fortified by Field Defense
  (Candy has none) and cannot stop an attack, only move the attacker
  afterwards. Nothing is locked: the bounced unit acts normally next turn.

### 7.6 Confectioner

_Captain, 5 Coins, 10 HP, 1 / 1._

- **Frosting** is the Captain's Tend Wounded (2 HP to every adjacent own
  unit, cures Plague, Bitten, and Chill). It keeps the Confectioner useful
  before anything has died, and gives the Candy their only cure.
- **Re-bake** turns a death into a half-price, half-HP copy at the front.
  Per Coin it is strongest on the Gummy Bear (5 Coins for a 7-HP Bear
  instead of 9 for a 14-HP one) and the Pie Launcher (4 for 5 HP).
- **In a fight** it stands one tile behind the line where its units die.
  A Vampire (10 damage) or a Knight (Attack 3 on Defense 1: 10) kills it
  in one blow, a Lich's splash wounds it, and the Normal AI already hunts
  support units
  ([current rules section 16](RULESET_7_CURRENT.md#16-normal-ai-summary)).
  Killing the Confectioner is the main answer to the faction.
- **Too strong?** The loop "Rush, die, Re-bake" is the faction's engine,
  and it is limited four ways: the Confectioner must survive next to the
  Crumbs, the Crumbs go stale in three turns, the enemy eats them by
  walking on them, and the copy comes back at half HP, which halves its
  attack force.

### 7.7 Pie Launcher

_Catapult, 8 Coins, 10 HP, 3 / 0.5, range 2–3._

| Target                                              |    Pie deals | Catapult (3.5) deals |
| --------------------------------------------------- | -----------: | -------------------: |
| Fighter                                             |            8 |                   10 |
| Guard (open)                                        |            7 |                    8 |
| Guard on Walls with Field Defense (fortification 3) | 5 (7 Rushed) |                    6 |
| Ankylosaurus (Armoured)                             |            6 |                    7 |
| Juggernaut                                          |            6 |                    7 |
| T-Rex                                               |            8 |                   10 |

- **Splat** is the point. The cracking of a Walled Guard (17 HP, Walls and
  Field Defense):

  | Step                | Candy                                   | Human, for comparison         |
  | ------------------- | --------------------------------------- | ----------------------------- |
  | Siege shot          | Pie: 5, the Guard is Splatted (12 left) | Catapult: 6 (11 left)         |
  | First melee attack  | Rushed Gumdrop: 6, no answer (6 left)   | Fighter: 3, takes 12 and dies |
  | Second melee attack | Rushed Gumdrop: 6, kill                 | —                             |

  Three Candy units kill the hardest defender in the game in one turn
  without a loss. The brakes: the two Gumdrops are Crashed next turn, the
  one that advanced onto the center cannot capture until the turn after,
  the Pie is an 8-Coin, 10-HP, Defense-0.5 unit that a Raider or a Knight
  kills in one blow, and the city's next defender walks in. The tuning
  lever, if it proves too strong, is "Splat stops one strike-back"
  ([appendix B](#appendix-b-second-critique) item 1).

- **Too weak?** Its own damage is lower than a Catapult's (Attack 3), so a
  Pie alone is a worse Catapult; it is good only with followers, which is
  the intended identity.

### 7.8 Gummy Bear

_Knight, 9 Coins, 14 HP, 3 / 1.5, Move 2._

Rushed: Move 3, Attack 4 on the first attack, then Sugar Frenzy at 3.

| Rushed chain (all targets fresh)     | Result                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| Fighter, Catapult, Captain, Marksman | kills Fighter (12), Catapult, Captain; Marksman 10 of 12; Bear 13 HP |
| Marksman, Catapult, Knight, Skeleton | kills three; Skeleton 8 of 10; Bear 10 HP                            |
| Raider, Raider                       | kills one; second 10 of 12                                           |
| Hammerer (12)                        | kills it; the next 12-HP unit survives                               |
| Guard on Field Defense               | 9 of 17, takes 9                                                     |
| Re-baked Bear (7 of 14 HP), Fighter  | 9 of 12, takes 5                                                     |

| Attacker on a Gummy Bear | Deals / takes |
| ------------------------ | ------------- |
| Fighter                  | 5 / 3         |
| Knight, Ray Gunner       | 9 / 2         |
| Catapult                 | 11            |
| T-Rex                    | 13 / 2        |

- **The T-Rex lesson, checked.** The T-Rex was predictably dominant
  because three things stacked: 28 HP, unlimited Rampage at Attack 4
  (which one-shot every 12-HP unit, so the chain never stopped on a
  line), and growth that fully healed it on a kill. The Bear has half the
  HP, no growth or heal, and Attack 4 only on its **first** attack; the
  continuation is at 3, which kills only units of 10 HP or less with
  Defense 1.5 or less (Catapult, Captain, Knight, Lich, Necromancer,
  Shaman, Yeti, Sled) and stops on any 12-HP unit, any Defense-2 unit, and
  a shielded Grunt. Then it is Crashed in the enemy's lines, where
  a Fighter and a Knight together kill it (5 + 9). The first draft gave
  +1 on every attack of the chain and one Bear killed a Marksman, a
  Catapult, a Captain, and a Fighter without a scratch
  ([appendix A](#appendix-a-the-first-draft-and-its-critique) item 2).
- **The Triceratops lesson, checked.** The first Triceratops was weak
  because its power was in a separate lane command on a Move-1 body that
  trailed the army. The Bear's power is the ordinary attack after one
  extra click, on a Move-2 (3 Rushed) body that leads the army.
- **Off its Rush turn** it is a 14-HP, Attack-3 brawler with no Overrun:
  a little better than a Knight at holding a tile, worse at sustained
  killing.
- **Counters:** keep a full-HP Fighter or Guard in front of the soft
  units (the chain stops there), punish the Crash turn, and eat its
  Crumbs.

### 7.9 Rock Candy Golem

_Juggernaut, reward, 40 HP, 4 / 3.5._

- Juggernaut parity with Defense 3.5 (the Troll's 3 plus regeneration,
  the Titan's 3 plus Unflinching, the Colossus 2.5 plus a ray). A
  Juggernaut attacking it deals 10 and takes 7; it deals 12 to a Fighter
  (kill) and 10 to a Guard (takes 6).
- **Bounce** makes it the city anchor: melee units that hit it are thrown
  back, so a besieging ring keeps breaking.
- **Rush:** Move 2 and Attack 5 on a first attack, then a Crash. A Golem
  that Rushes off its city to kill something leaves the city without its
  attack next turn; next to its own center, Home Sweet Home makes the
  Rush free.

### 7.10 The faction as a whole

- **Early (rounds 1–10):** Gumdrops and Donut Racers expand like any
  faction; Rush matters from the first contact (two Rushed Gumdrops kill a
  Fighter), and the Crash makes the Candy predictable for one turn. Drill
  (Marshmallow) or Marksmanship (Gunner) are the second technologies.
- **Mid (rounds 10–20):** Administration (Confectioner) turns deaths into
  Re-bakes; Sawmilling (Pie) opens fortified cities. The identity is
  complete by round 15 without Chivalry, which matters because the Normal
  AI reaches tier-3 units late.
- **Strong against:** fortified, slow, high-retaliation defenders (Guards
  on Walls, Zombies, Steam Moles dug in, Ankylosaurs), melee-heavy armies
  (Bounce), soft back lines (the Bear).
- **Weak against:** area damage and packs (Goblins, the Lich, Bomb
  Chuckers, Mammoth Sweep: 10-HP bodies), armies that punish the Crash
  turn, fast units that reach Crumbs and Confectioners (a Raptor or a
  Sabretooth eats Crumbs; a Saucer or a Gyrocopter cannot eat them but
  kills Confectioners), and Shields (a Shield 2 absorbs more than a Rush
  adds).
- **Too many mechanics?** Four pillars, two support abilities, and two
  technology effects, against the Dwarves' tunnel, mound, eruption, ride,
  bombing run, clockwork, twin shot, Dig In, Repair, Assemble, Knockback,
  and Plated. Every Candy rule fits in one sentence
  ([section 11.3](#113-help-one-liners)).

## 8. Interactions

Every Candy rule needs a `CANDY` seat; in a match without one no Crumbs,
Crash, or Splat exists and no Candy command is offered.

### 8.1 Humans

- Field Defense and Walls count fully against Candy attacks (only Splat
  removes the retaliation). A Captain's Tend Wounded does not end a Crash
  (it is not the Candy's). The Raider's Escape and the Knight's Overrun
  work as usual; a Knight that hits a Marshmallow without killing it is
  bounced.

### 8.2 Undead

- Candy units are **living**: they leave Graves, are plagued, bitten,
  infected, and wailed. A Candy death that leaves a Grave also leaves
  Crumbs; Raise Dead and Re-bake compete for the tile (each needs it
  empty), and a Ghoul that ends its Move on the Grave eats the Crumbs.
- A Candy unit that rises (Infect, Bitten) leaves no Crumbs.
- **Splat on a Zombie** stops its retaliation, so the Candy units that
  attack it after the Pie take no strike-back: no infecting kill and no
  bite. This makes the Pie a good answer to Zombies.
- Frosting cures Plague and Bitten. Wail ignores Bounce (not an attack).
  A Vampire's attacks are unanswered anyway; Splat on a Vampire stops its
  Lifesteal retaliation.

### 8.3 Goblins

- Kaboom, death blasts, and bomb splash kill Candy units with fixed
  damage; those deaths leave Crumbs. Goblin units eat Crumbs like any
  ground unit. A Bounce throws a Goblin out of the target's eight-cell
  ring, so it no longer helps Gang Up there. A Splatted goblin-crewed unit
  may still Kaboom on its own turn (Splat only stops retaliation).
- A Sugar Frenzy that kills an exploding unit takes its death blast like
  any Overrun. Plunder counts Candy kills.

### 8.4 Dinosaurs

- Eggs are targets; a Sugar Frenzy may continue after killing an Egg. A
  Triceratops is bounced after its Charge! push and follow
  ([section 3.4](#34-bounce-soft-and-springy)); a T-Rex is bounced. Acid
  and Wallbreaker work against Candy units and cities as against anyone's.
  Dinosaurs eat Crumbs.
- Splat stops an Alpha dinosaur's retaliation like any unit's.

### 8.5 Martians

- A Shield absorbs damage first; Splat still applies when the Shield took
  the whole hit. Flyers never eat Crumbs. Mind Control: a Candy unit at 6
  HP or less is a target like any; it keeps Rush and the Crash for its
  controller; it leaves no Crumbs if it dies controlled. A controlled
  Confectioner may Frost but not Re-bake. The Tractor Beam may pull a
  Crashed unit or one standing on Crumbs (a pull eats nothing). A
  Mothership that attacks a Marshmallow at range 1 is bounced (a flyer
  can be pushed; Push conditions decide where).

### 8.6 Ice Folk

- Chill and the Crash combine harmlessly: a Crashed unit cannot act
  anyway; a sluggish unit may Rush. Deep snow stops a Candy ground unit's
  Move as any other faction's (the Rush's extra tile does not cross Snow).
  A Shatter death leaves Crumbs. Frosting cures Chill. A Mammoth that hits
  a Marshmallow is bounced after its Sweep. Ice Folk units eat Crumbs.

### 8.7 Dwarves

- Bombs and eruptions kill Candy units with fixed damage; the deaths leave
  Crumbs. A Gyrocopter (a flyer) never eats Crumbs; a surfacing Mole or
  rider does not (surfacing is not a Move). Re-bake needs the tile free of
  a mound. Dig In counts against Candy attacks; Splat stops a dug-in
  unit's retaliation. A Steam Tank is bounced (Plated caps damage, not
  movement); the Brass Titan (`JUGGERNAUT`) is not. Knockback moves a
  Candy unit like any.

### 8.8 The Rift

- No Candy unit enters a Rift. Nothing pushes or bounces a ground unit
  onto one, so no Candy unit dies there and no Crumbs lie there.

### 8.9 Map curiosities

- The **Fountain of Youth** heals a Candy unit like any (it is not
  Frosting and ends no Crash). The **Shrine** promotes an eligible Candy
  unit. The **Sunken Wreck** is salvaged by Candy boats as by any.
- The **Giant Spider** (`JUGGERNAUT` role, neutral) is never bounced, can
  be Splatted, and never eats Crumbs (its neutral step is not a Move). A
  Rushed Gumdrop deals it 8 and takes 4.

### 8.10 Missions and the campaign

- A mission may give a seat the Candy faction once it is registered; the
  mission builder needs no Crumbs layer (missions start with none). The
  teaser chapter does not use the Candy. Forbidden technologies work as
  for every faction (forbidding Administration removes Re-bake and
  Frosting).

### 8.11 Cities, capture, and capacity

- A Re-baked unit needs and takes a slot in the Confectioner's home city;
  Re-bake never exceeds capacity. Crumbs never lie on a settlement center.
  A Crashed unit cannot capture. A city's Candy look changes with its
  owner (art only).

### 8.12 Fog and observation

- Crumbs are public on every explored tile (role, owner, turns left), as
  Graves are. Rushed and Crashed states and Splat are public on visible
  units (like Chill and Plague). Whether the seat has Home Sweet Home or
  Peppermint Surprise is public through a visible Candy unit's stats. No
  Candy rule reveals or hides a unit.

### 8.13 Boats

- Candy boats are the Human Patrol Boat and Battleship drawn in the Candy
  style, until the naval branch expansion defines more
  ([section 13](#13-naval-branch-placeholder)). Boats cannot Rush and leave
  no Crumbs (water).

## 9. Engine needs

For the spec and engine beads (`pulp_wars-jdb.2`, `jdb.3`):

- **Identity.** A new ruleset identity `pulp-wars-poc-7rNN` and autosave
  key. `CANDY` appended to the frozen `FACTION_IDS_V7` and
  `CANDY_BASELINE_V1` to `FACTION_TREE_IDS_V7`; display name "Candy".
  **Audit first:** Ruleset 6 already uses the string `"CANDY"` in shared
  code (`src/headless/cli.ts`, `src/render/dom/app-view.ts`,
  `src/app/controller.ts`, `src/ai/index.ts`, art bindings). If any shared
  path keys on the bare faction string across rulesets (art registries,
  headless `--factions`), the spec either scopes it by ruleset or names the
  Ruleset 7 faction `CONFECTION`; it must not change Ruleset 6.
- **Registration.** `CANDY_ROLE_RULES_V7`, `CANDY_ROLE_MECHANICS_V7`
  (`sugarRush`, `rushPerk`, `bounces`, `splats`, `rebakes`, `sugarToss`,
  `crumbs`), `FACTION_RULES_V7.CANDY` (treasure role `RAIDER`, no capacity
  bonus), the tree unlocks and capabilities of
  [section 5](#5-technology).
- **State** (neutral when there is no Candy seat): an activation flag
  `sugarRushed`; `crashed: unitId[]`;
  `crumbs: { at, role, ownerId, turnsLeft }[]` sorted by `(y, x)`;
  `splattedThisTurn: unitId[]`; a per-turn `tossedThisTurn: unitId[]` for
  the once-per-turn heal.
- **Commands:** `SUGAR_RUSH`, `REBAKE`, `SUGAR_TOSS`; Frosting is
  `TEND_WOUNDED`.
- **Events** (names for the spec to settle): `UNIT_SUGAR_RUSHED`,
  `UNITS_CRASHED` (End Turn), `CRUMBS_LEFT`, `CRUMBS_EATEN` (with the
  Peppermint damage), `CRUMBS_STALE`, `UNIT_REBAKED`, `SUGAR_TOSSED`, and
  the Bounce as `UNIT_PUSHED` with a reason or its own `UNIT_BOUNCED`.
- **Combat preview fields:** `sugarRush` (the +1 applied), `splatApplied`
  and `noRetaliationReason: "SPLATTED"`, `bounce` (the attacker's
  destination or blocked).
- **Queries:** the movement query with a Rushed budget (a "what if I Rush"
  reach for the UI and AI), Re-bake and Toss previews, Crumbs in the view.
- **Shared helpers to extend, not fork:** `unitMayActAfterMoveV7` and the
  primary-action gate for the Crash; the Push conditions for Bounce; the
  Unanswered retaliation path for Splat; the Grave creation hook for
  Crumbs; the Tend Wounded path for Frosting; the Escape grant for the
  Donut Racer's perk; the Overrun grant for Sugar Frenzy.
- **Neutrality:** a match without a Candy seat is byte-identical in
  decisions and hashes apart from identity and the empty lists, as for the
  Dwarves.

## 10. Normal AI needs

Every Candy heuristic is gated on a match with a Candy seat
(`src/ai/v7-candy.ts`), so other matches stay byte-identical.

**As the Candy:**

- **Rush** a unit when, among its offered plans, the Rushed plan kills a
  target the plain plan cannot, or reaches a threatened own city center
  in time; rush the Gummy Bear only when the Rushed first attack kills and
  a Sugar Frenzy continuation is available, or the first kill is a
  `CATAPULT`, `CAPTAIN`, or `KNIGHT`-role unit. Next to an own center with
  Home Sweet Home, rush every unit that attacks. Never rush a unit that
  ends in a visible lethal reach unless its attack kills. Consider Rush
  only for a unit with a visible hostile unit within its Move + 1 + range,
  or on the way to a threatened own city (it bounds the extra queries).
- **Crashed units** hold or step back out of melee reach; they are not
  counted as attackers for the next turn's plans.
- **Re-bake:** a Confectioner moves toward own Crumbs within 3 (the most
  expensive role first) and Re-bakes when it can pay and the home city has
  a slot; between deaths it Frosts like a Captain tends.
- **Pie first:** order the turn so a Pie Launcher shoots the target the
  melee units will attack, preferring fortified and high-retaliation
  defenders; melee attacks then use the Splat.
- **Sugar Toss** when a Gunner has no shot worth more than 2 HP of healing
  on the most valuable damaged unit in range.
- **Marshmallows** to the front row; Golem on the most threatened city.
- **Research:** the ordinary free opener; then Drill or Marksmanship;
  Administration at two cities; Sawmilling against a visible Walled city;
  Home Sweet Home once an own city is threatened; Peppermint Surprise
  late.

**Against the Candy:**

- Treat a Crashed hostile unit as having no attack next turn; prefer
  attacking Crashed units.
- End a routine Move on Candy Crumbs when the tile is otherwise no worse
  (denial), unless the seat has Peppermint Surprise and the unit has 3 HP
  or less, or the eat would leave it in lethal reach.
- Hunt Confectioners (the support-unit hunt of the second pass).
- Value melee attacks on a Marshmallow or Golem lower (the Bounce costs
  position); prefer ranged attacks on them.
- Count a visible Rush-capable unit's reach as Move + 1 and its first
  attack as + 1 in threat estimates, unless it is Crashed.

A modest head-to-head test accompanies the AI bead, as for the Dwarves.

## 11. UI needs

### 11.1 Surfaces

- **Setup:** "Candy" in every faction select; eight factions mean a
  four-seat game leaves four unpicked (no change to the select logic).
- **Unit actions:** a **Sugar Rush** toggle on the unit card before it
  moves (with a preview of the Rushed reach drawn in a sparkle tint and
  the attack previews showing +1), **Re-bake** (target Crumbs, the price
  and the HP of the result), **Sugar Toss** (targets within 2 with the
  heal), **Frosting** (the Tend Wounded button relabelled).
- **Markers:** Rushed (sparkle trail, a small lightning-lollipop chip),
  Crashed (dizzy swirl, droopy sprite tint, "Crashed: can't act this
  turn"), Splatted (a pie on the face, "Splatted: can't strike back"),
  Crumbs (a pile with the role icon and up to three pips), Bounce (a
  spring animation and an arrow in the combat preview showing where the
  attacker lands).
- **Previews:** combat previews show Splat ("No strike-back: Splatted"),
  the Bounce destination when attacking a Marshmallow or Golem, the Rush
  bonus, and Peppermint Surprise damage on a Move onto Crumbs.
- **Unit info and Help:** the one-liners below, the role table, and the
  technology names.

### 11.2 Labels

`SUGAR_RUSH` "Sugar Rush"; Crashed "Crashed"; `REBAKE` "Re-bake";
`SUGAR_TOSS` "Sugar Toss"; `TEND_WOUNDED` for the Confectioner "Frosting";
Overrun for the Gummy Bear "Sugar Frenzy"; the technologies "Home Sweet
Home" and "Peppermint Surprise".

### 11.3 Help one-liners

- **Sugar Rush:** before it moves, a Candy unit may Rush: +1 Move and +1
  Attack on its first attack this turn, but next turn it is Crashed and
  can't act.
- **Crashed:** this unit can move but can't attack, capture, or use
  abilities this turn; it still strikes back.
- **Crumbs:** a fallen Candy unit leaves Crumbs for three turns; enemies
  that walk onto them eat them.
- **Re-bake:** the Confectioner bakes the unit in adjacent Crumbs back, at
  half its price and half its HP.
- **Splat:** a unit hit by a Pie Launcher can't strike back for the rest
  of the Candy turn.
- **Bounce:** a melee attacker that hits a Marshmallow or a Rock Candy
  Golem and survives is bounced one tile back.
- **Sugar Toss:** the Gumball Gunner heals an own unit within 2 by 2,
  once per unit per turn.
- **Frosting:** the Confectioner heals adjacent units by 2 and cures
  Plague, bites, and Chill.
- **Sugar Frenzy:** a Rushed Gummy Bear keeps attacking after each kill.
- **Donut Racer:** a Rushed Donut Racer may move again after attacking.
- **Home Sweet Home:** a Rushed unit that ends its turn next to your city
  center doesn't Crash.
- **Peppermint Surprise:** an enemy that eats your Crumbs takes 3 damage.

## 12. Art needs

### 12.1 Faction colour

The permanent faction colour is **cotton-candy pink `#ffb8d8`** (L\* 82),
measured with the method and grounds of
[FACTION_COLOURS.md](../art/FACTION_COLOURS.md) (CIE76, Machado 2009 at
severity 1):

| Against            | Normal | Deuteranopia | Protanopia |
| ------------------ | -----: | -----------: | ---------: |
| Human `#d01c3a`    |   64.0 |         53.4 |       51.9 |
| Undead `#a221ee`   |   92.5 |         79.4 |       78.0 |
| Goblin `#fdd20f`   |   95.5 |         84.9 |       94.6 |
| Dinosaur `#fe7500` |   82.2 |         76.4 |       76.3 |
| Martian `#e83aae`  |   54.6 |         27.3 |       41.5 |
| Ice Folk `#10b8ff` |   60.3 |         49.8 |       29.0 |
| Dwarf `#2db885`    |   82.9 |         24.1 |       34.6 |

Its weakest pairs (Martian 54.6 normal, Dwarf 24.1 deuteranopia, Ice Folk
29.0 protanopia) are above today's weakest pairs (Human/Dinosaur 49.1,
Goblin/Dinosaur 20.6, Martian/Ice Folk 26.6). Against the grounds it is
78.6 from Grass, 49.7 from Shallow Water, 53.5 from Deep Water, 33.3 from
Mountain, and 56.5 from Snow with normal vision; its weak spot is
**Shallow Water under a deficiency (4.1)**, where the light line in its
dark casing must carry it, as the Martian magenta does on Deep Water
(10). A deeper bubblegum pink (`#ff6fb5`) was rejected: 21.7 from the
Martian magenta. A mint was rejected: 24.6 from the Dwarf jade with
normal vision. The art bead re-measures in
`tests/unit/faction-colours-render-v7.test.ts` and may propose a
candy-cane (pink and white) border dash if the captures fail on Shallow
Water.

### 12.2 The look

- **Materials:** glossy hard candy with a hard white highlight, soft
  translucent jelly, matte marshmallow, wafer and biscuit, chocolate,
  frosting, candy-cane stripes, sprinkles. Fixed colours (the converted
  direction of [VISUAL_DIRECTION_2026-10.md](../art/VISUAL_DIRECTION_2026-10.md),
  no owner mask): cream and marshmallow white, cotton-candy pink, mint as
  small trim, caramel and chocolate browns. No large area close to another
  faction colour: no magenta, saturated violet, hazard yellow, orange,
  ice blue, or jade.
- **Silhouettes:** round and squat, big glossy highlights, every unit an
  edible object with a face (a gumdrop, a donut wheel, a jellybean, a
  marshmallow block, a gummy bear, a rock-candy golem). The Confectioner
  reads as a small round sweet in an apron with goggles and a whisk. At
  zoom 0.75 they must read apart from the Goblins (also small and round:
  Candy is pastel and glossy, Goblins olive and scrap) and the Ice Folk
  (also white: Candy is pink and warm, Ice Folk blue and cold).
- **Cities and buildings:** cake and candy houses with frosting roofs and
  lollipop trees beside them; a captured village becomes a candy house.
  Faction building looks (a candy orchard Farm, a cotton-candy Windmill)
  belong to the epic `pulp_wars-xdh`.
- **Ruleset 6 Candy art** (the frozen Candy Warrior, Gumball Guard, Choco
  Engineer, Donut, Marshmallow Medic, Jawbreaker, Candy Crusher, Sugar
  Titan, and the lollipop-forest and rock-candy terrain) is a different
  style and stays frozen. Its direction informs only the motifs (gumballs,
  donuts, marshmallows, rock candy, lollipop trees); no Ruleset 6 asset is
  reused, and terrain stays the shared Ruleset 7 terrain.

### 12.3 Assets to draw

- Eight land units, the Patrol Boat (a chocolate-bar boat with a wafer
  sail), the Battleship (a layered-cake galleon with candy-cane masts),
  the embarked transport (a floating donut ring), and their portraits;
  City levels 1 to 5 and the capital.
- Markers: Crumbs (one pile, the role shown by a code-drawn icon, not one
  sprite per role), the Crashed swirl, the Rushed sparkle, the Splat pie,
  the Bounce spring; command icons Sugar Rush, Re-bake, Sugar Toss,
  Frosting; projectiles (gumball, pie, tossed sweet).
- A faction fragment `docs/art/factions/CANDY.md` from the template, with
  a 32 px lineup check against the seven factions.

### 12.4 IP guard for the art

The faction negative fragment includes: banana guards, gumball-machine
guardian statues, a pink-haired princess, lab coat with crown, peppermint
butler, lemon-headed figure, and the show's name. Each sample is checked by
eye for likeness to the show's characters as well as for the usual chibi
criteria.

## 13. Naval branch (placeholder)

The naval branch expansion (epic `pulp_wars-5ti`, design bead
`pulp_wars-5ti.1`, `docs/product/RULESET_7_NAVAL_BRANCH.md`, being written
in parallel) gives every faction five naval technologies, starting with
the Humans, with per-faction tweaks only where needed. The Candy follow
the Human naval branch with these candidate tweaks, to be settled when
that design lands:

- the new vessel drawn as a candy boat with the Human rules;
- boats keep no Candy rule (no Rush, no Crumbs) unless the naval design
  gives every faction a hook, in which case the Candy hook is a Sugar Rush
  for ships (Move + 1, first attack + 1, Crash), not a new mechanic.

Until then the Candy have the current Human Patrol Boat and Battleship.

## 14. Balance

### 14.1 Measurement

The project policy: Dry Land only, small samples, no per-matchup band
chasing; remove gross imbalances (worse than about 70 to 30) and blind
spots.

- **Pairings:** Normal against Normal, Rival, Dry Land, sizes 11 and 14,
  both seat orders, about 20 to 40 decided games per opponent, 150 rounds:
  `CH`, `HC`, `CU`, `UC`, `CG`, `GC`, `CD`, `DC`, `CM`, `MC`, `CI`, `IC`,
  `CW`, `WC` (pairing letter `C`). One four-seat 16 × 16 mix as a smoke
  check.
- **Telemetry** per Candy seat-game: units by role and round; Rushes per
  role, Rush kills (a kill the plain attack would not make), units killed
  while Crashed, Home Sweet Home spares; Crumbs left, Re-baked (by role,
  Coins spent), eaten, stale; Peppermint damage and kills; Splats and
  strike-backs prevented (HP); Bounces and blocked Bounces; Sugar Toss and
  Frosting HP healed; Sugar Frenzy chain lengths; Confectioners lost and
  the round; cities at rounds 10, 15, 20; the round-cap rate.

### 14.2 Tuning bounds (for the balance bead)

| Parameter                           | Design value            | Bounds                     |
| ----------------------------------- | ----------------------- | -------------------------- |
| Gumdrop HP / Defense                | 10 / 2                  | 9–12 / 1.5–2               |
| Donut Racer HP / cost               | 10 / 3                  | 9–12 / 3–4                 |
| Gumball Gunner HP; Sugar Toss heal  | 8; 2                    | 8–10; 2–3                  |
| Marshmallow HP / Defense / cost     | 18 / 2.5 / 4            | 16–20 / 2–3 / 3–5          |
| Confectioner HP / cost              | 10 / 5                  | 10–12 / 4–6                |
| Re-bake price; HP                   | ⌈cost / 2⌉; ⌈maxHp / 2⌉ | price + 0–1; HP ⅓–½        |
| Crumbs lifetime                     | 3 Candy turns           | 2–3                        |
| Pie Launcher Attack / cost          | 3 / 8                   | 3–3.5 / 7–9                |
| Gummy Bear HP / Attack / Def / cost | 14 / 3 / 1.5 / 9        | 12–16 / 2.5–3 / 1–2 / 8–10 |
| Rock Candy Golem HP / Attack / Def  | 40 / 4 / 3.5            | 36–40 / 3.5–4 / 3–4        |
| Peppermint Surprise damage          | 3                       | 2–4                        |
| Rush: +1 Move, +1 first Attack      | fixed                   | fixed                      |

**Named levers** (each needs root approval): Splat stops one strike-back
instead of all for the turn; Sugar Frenzy capped at two continuations;
the Crash also lowers Defense by 0.5; Home Sweet Home off the Golem; a
Re-bake may exceed capacity (if Re-bake is never used because slots are
full).

### 14.3 Acceptance (coarse, Dry Land)

- **No gross imbalance:** in decided games the Candy win between about
  30% and 70% against each of the seven factions separately.
- **No stalls, policy errors, or exceptions;** the Candy round-cap rate is
  not clearly above that of the other pairings in the same run.
- **No blind spot:** every opposing faction kills Confectioners in at
  least half of the seat-games in which one was fielded and takes a Candy
  city in some games; Crumbs are eaten in some games by every opponent.
- **Every unit is produced and every ability used:** Sugar Rush in nearly
  every Candy seat-game and by at least four roles over the run; Gumball
  Gunner, Marshmallow, Confectioner trained in at least half of the
  seat-games with their technology; a Re-bake in at least half of those
  with a Confectioner; a Splat that prevents a strike-back in at least half
  of those with a Pie; a Bounce in at least half of those in which a
  Marshmallow was attacked in melee; Gummy Bear and Pie reported (tier 3).
- **No dominant unit:** no role but the Gumdrop makes more than 40% of the
  seat's kills; Sugar Frenzy chains of three or more kills are rare (under
  about one per seat-game); the Gummy Bear's kills per loss stay under
  about 2.
- **The Crash bites, but not too much:** units killed while Crashed are
  between about 10% and 50% of Candy losses (below, the Crash is
  toothless; above, Rush is a trap).
- **Neutrality:** pairings without a Candy seat have byte-identical final
  state hashes to a pre-Candy run of the same seeds.

## 15. Identity and compatibility

- One identity bump for the engine bead (`7rNN`), one more if the balance
  bead changes numbers after other identities have moved on (the
  Dwarf precedent). Saves and replays of earlier identities are rejected,
  never migrated.
- Faction choice never affects map generation. The browser setup, the
  engine, and the headless tools (`--factions candy`, after the
  [section 9](#9-engine-needs) audit) offer the faction.
- With eight factions the map-scale epic (`pulp_wars-ykw`) may allow up to
  eight players; nothing here assumes a seat count.
- Every other faction's rules are unchanged; the Candy additions are
  neutral in a match without a Candy seat.

## 16. The future unlock (a proposal)

Not implemented now; a separate bead after the epic, and the user decides.

- **Where it lives:** a profile record outside saves, like campaign
  progress (`pulpWars.campaign.v1`, which survives identity changes): for
  example `pulpWars.profile.v1` with earned meta-achievements, derived
  unlocks, and a Reset. Skirmish otherwise stays fully unlocked (the
  campaign recommendation); the Candy would be the one gated skirmish
  faction, shown in setup as a locked "???" slot with a hint. Headless and
  test setups are never gated, and a developer option unlocks it.
- **The achievement, recommended: "Sweet Tooth":** win a skirmish in which
  you harvested at least 10 Fruit. It is thematic (sugar), reachable by
  any faction on most maps, and slightly off the usual path (players often
  build Farms instead), which suits an easter egg. Hint: "Some say a sweet
  tooth opens a hidden door."
- **Alternatives:** "Sugar High", win a skirmish by round 30 (fits the
  Rush, but depends on map size and AI count); "Full Set", unlock all
  seven in-match achievements in one match (hard; no Sea Dog on Dry Land).

## 17. Bead breakdown

Same loop as the Ice Folk and the Dwarves. Each bead carries the
CLAUDE.md validation block.

| Bead           | Scope                                                                                                                                                                                        | Validation profile                                                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jdb.1` (this) | Design: theme, pillars, roster, battle analysis, critique.                                                                                                                                   | `docs/tracker`: `npx prettier --check docs/product/RULESET_7_CANDY.md`; links; `git diff --check`.                                                                               |
| `jdb.2`        | Spec (contract) in this file: exact state, commands, events, errors, previews, resolution orders; every table re-run against the engine; the `CANDY` string audit; root rulings.             | `docs/tracker`.                                                                                                                                                                  |
| `jdb.3`        | Engine: registration, tree, Rush and Crash, Crumbs and Re-bake, Splat, Bounce, Sugar Toss, Frosting label, technologies, previews, queries, identity bump, neutrality tests.                 | `ai/map/persistence` (identity, state schema, saves and replays): `npm run check`, `npm run validate:ruleset6-release`; browser smoke if the setup offers it in this bead.       |
| `jdb.4`        | Normal AI as and against the Candy, with a head-to-head test.                                                                                                                                | `ai/map/persistence`.                                                                                                                                                            |
| `jdb.5`        | Art: `docs/art/factions/CANDY.md` fragment and subject lines (user approval), PixelLab production art (units, boats, portraits, cities, markers, icons), colour test. Needs PixelLab access. | `asset-only`, with a new `npm run art:chibi-candy-direction-review` (after `art:chibi-dwarf-direction-review`) plus `art:faction-colours-review` and `art:faction-looks-review`. |
| `jdb.6`        | UI: setup, Rush toggle and reach, Re-bake, Toss, markers, previews, Help, labels; art wired in.                                                                                              | `ui/presentation` plus `npm run smoke:browser`.                                                                                                                                  |
| `jdb.7`        | Coarse balance on Dry Land within [section 14](#14-balance); tuning record and report.                                                                                                       | `ai/map/persistence`.                                                                                                                                                            |
| `jdb.8`        | Fold into `RULESET_7_CURRENT.md` as section 23 with the release gates.                                                                                                                       | `cross-cutting/release`.                                                                                                                                                         |
| later          | The unlock of [section 16](#16-the-future-unlock-a-proposal) (profile record, gated setup slot, hint, developer unlock), after the user picks the achievement.                               | `ui/presentation` plus `npm run smoke:browser`.                                                                                                                                  |
| `5ti` (other)  | The Candy part of the naval branch, inside that epic.                                                                                                                                        | that epic's profiles.                                                                                                                                                            |

Dependencies: `jdb.2` after this bead; `jdb.3` after `jdb.2`; `jdb.4` and
`jdb.5` after `jdb.3` (the art can start from `jdb.2` once the user
approves the fragment); `jdb.6` after `jdb.3` and `jdb.5`; `jdb.7` after
`jdb.4` and `jdb.6`; `jdb.8` last.

## 18. Open questions

1. **The colour:** cotton-candy pink `#ffb8d8` (recommended) or a
   candy-cane pink-and-white border?
2. **The unlock:** "Sweet Tooth" (recommended) or another achievement, and
   should the Candy be the one faction gated in skirmish?
3. **Splat's strength:** keep "no strike-back for the rest of the Candy
   turn" (recommended, with the one-strike-back lever ready), or start with
   the weaker version?

## Appendix A: the first draft and its critique

### A.1 The first draft, in brief

The first draft had the same theme and four mechanics with these
differences: Sugar Rush gave +1 Attack on **every** attack that turn and
added to Charge; the Gummy Bear had Sugar Frenzy at that Attack; the
Marshmallow was **Sticky** ("a melee attacker that hits it cannot Move on
its next turn") instead of Bouncy; Crumbs never went stale and were swept
by any enemy that stood on them, an advance included; **Re-bake was free**
(any role, half HP); Home Sweet Home spared a Rushed unit anywhere in own
territory; Explosives was **Hard Candy** (Pie Launchers ignore Walls and
Field Defense); the Gunner's Sugar Toss healed 3 with no limit per target;
the Donut Racer cost 4; and the faction colour was a bubblegum pink
`#ff6fb5`.

### A.2 The critique

Reviewed as a skeptical designer looking for degenerate combinations, AI
exploits, readability problems, and too many mechanics. Each item names
the draft's position, the objection, and what the redraft did.

1. **Rush plus Charge.** Draft: the bonuses added up. Objection: a Rushed,
   charging Donut Racer attacked at 4, one-shot every full 12-HP Fighter,
   Marksman, Raider, and Hammerer, and escaped, for 4 Coins: a Raptor with
   Escape. Redraft: the Rush bonus does not add to Charge; the Donut
   Racer's Rush buys reach and Escape only, and it costs 3.
2. **The Gummy Bear was the T-Rex again.** Draft: +1 on every attack of the
   chain. Objection: the computed chain was Marksman, Catapult, Captain,
   Fighter, all killed, the Bear untouched: Attack 4 one-shots every
   12-HP unit, so the chain never stops on a line, exactly the predicted
   T-Rex failure. Redraft: +1 on the first attack only; the continuation
   at 3 kills only soft units of 10 HP or less
   ([section 7.8](#78-gummy-bear)).
3. **Sticky was a hard lock.** Draft: an attacker that hit a Marshmallow
   could not Move next turn. Objection: rooting is forbidden by the
   standing direction; on a melee unit next to Candy Gunners it meant a
   guaranteed death; on the AI side it froze attack plans. Redraft:
   Bounce, which moves the attacker once and locks nothing.
4. **Crumbs never went stale and were swept by an advance.** Objections,
   both ways: permanent Crumbs pile up into board clutter and a
   permanent re-buy discount (the Graves precedent is for a whole faction
   mechanic, not a discount), while sweeping on the advance meant nearly
   every melee kill destroyed the Crumbs at once, so Re-bake would only
   follow ranged kills. Redraft: three Candy turns; only a Move (or a
   landing) eats them; an advanced enemy blocks Re-bake until it leaves.
5. **A free Re-bake was Raise Dead with better units.** Objection: free
   Gummy Bears and Pies at the front made losses free and blurred the
   Undead identity. Redraft: half the printed cost, a home-city slot, own
   Crumbs only, and the role that died.
6. **Home Sweet Home in all territory** made Rush free in a large area
   (and larger with Land Grant): Candy defenders would Rush every turn,
   a permanent +1 Move and +1 Attack at home, stronger than Dig In.
   Redraft: on or next to an own city center (Dig In's radius).
7. **Hard Candy doubled the siege.** Draft Explosives let Pies ignore Walls
   and Field Defense, on top of Splat. Objection: Splat already removes
   the price of attacking a fortified defender; ignoring its Defense too
   made Walls meaningless against the Candy, and three factions already
   have a "siege ignores fortification" technology (Wallbreaker, the
   Disintegrator, Blasting Charges). Redraft: Peppermint
   Surprise, which feeds the Crumbs pillar and stays small.
8. **Too much healing for a "fragile" faction.** Draft: Frosting 2 to all
   adjacent, Sugar Toss 3 to anyone in range with no limit, and Re-bake.
   Objection: three Gunners healed one Golem by 9 a turn; the Candy read
   as sustain, which is the Human identity. Redraft: Toss 2, once per
   target per turn. Frosting stays (it is the Captain's, cures Plague, and
   gives the Confectioner a job before deaths). The balance bead watches
   HP healed.
9. **Too many mechanics?** The draft also floated a Gunner Rush perk (two
   shots), a Pie Rush perk (splash), and caramel puddles from Pies. Cut:
   only the two perks that define their units (Donut Escape, Bear Frenzy)
   stay; puddles are the Ice Folk's deep snow.
10. **AI exploitability of the Crash.** Objection: a naive AI would Rush
    whenever a Rushed attack is better and then lose its army to
    counterattacks in the Crash turn; a human could bait it. Redraft: the
    AI Rushes only for a kill the plain attack cannot make or to save a
    city, never into visible lethal reach without a kill, and Crashed
    units step back ([section 10](#10-normal-ai-needs)).
11. **Readability of three short-lived states.** Rushed, Crashed, and
    Splatted are three states on units plus Crumbs on tiles. Objection:
    clutter. Redraft: each has one distinct visual (sparkle, swirl, pie,
    crumb pile), Rushed and Splatted exist only during the Candy turn, and
    Crumbs are a single pile sprite with a code-drawn role icon.
12. **The colour.** `#ff6fb5` was 21.7 from the Martian magenta with normal
    vision and 16.1 under deuteranopia, below every existing pair.
    Redraft: `#ffb8d8` ([section 12.1](#121-faction-colour)).
13. **The Golem was a gumball-machine guardian.** IP: too close to the
    show's giant guardians. Redraft: the Rock Candy Golem.
14. **Every unit Rushes, the Golem too.** Objection: a Golem that Rushes
    attacks at 5 and, with Home Sweet Home next to its city, does so every
    turn. Kept: "every Candy land unit can Rush" is one rule with no
    exceptions to remember, a Golem's Rush off its city leaves the city
    without its attack next turn, and at home it is the reward unit doing
    its job. The lever "Home Sweet Home off the Golem" is named for the
    balance bead.

## Appendix B: second critique

A shorter pass over the redraft.

1. **Splat still cracks Walls cheaply.** A Pie and two Rushed Gumdrops
   kill a Walled, Field-Defense Guard in one turn without a loss
   ([section 7.7](#77-pie-launcher)).
   Kept, because it is the faction's siege identity and has real brakes
   (the Crash blocks the capture, the advanced Gumdrop blocks the center
   for two turns, the Pie is fragile and expensive). The balance bead has
   a named lever: Splat stops one strike-back. Open question 3.
2. **The Crash is nearly free for units that sit.** A Marshmallow, Golem,
   or Pie that does not need its next action loses little. Accepted: Rush
   then is a repositioning tool (Move + 1) for defenders, which is a fair
   use, and their next action is usually wanted (the Pie shoots every
   turn). The telemetry's "killed while Crashed" band watches the Crash.
3. **Re-bake needs a free slot at home.** At the front the home city is
   often full, which could make Re-bake rare. Kept (no over-capacity
   production except rewards and risings); the lever "may exceed capacity"
   is named for the balance bead.
4. **Sugar Toss and Frosting together on one unit.** A unit next to a
   Confectioner and in range of a Gunner heals 4 a turn plus recovery.
   Accepted: it costs both supports' actions. Bounds 2–3 on Toss.
5. **Bounce helping the attacker.** A bounce can carry a fragile attacker
   out of the Candy counterattack. Accepted as a real cost of the Bounce;
   the Normal AI does not plan on it.
6. **The `CANDY` string.** Ruleset 6 uses it in shared code. Made an
   explicit audit step with a fallback name, so no Ruleset 6 behaviour can
   change ([section 9](#9-engine-needs)).
7. **Peppermint Surprise may be a quiet technology.** If opponents simply
   stop eating Crumbs, the effect is "Crumbs survive", which is still the
   point. Kept, with damage bounds 2–4; the shared Blast Mountain and
   Field Defense demolition keep the technology live either way.
8. **Crumbs under Mind Control.** The redraft said "a Candy unit's death
   leaves Crumbs", so a Candy unit dying while a Brain controlled it left
   Crumbs for nobody in particular, and a controlled Confectioner could
   have baked Candy units for a Martian seat: units whose kind is not their
   owner's faction without being controlled, which the one-resolver model
   does not allow. Fixed: only a unit owned by a Candy seat leaves Crumbs,
   and a controlled Confectioner cannot Re-bake.
9. **The AI's cost.** Evaluating a Rushed variant of every Candy unit's
   plan doubles its movement queries. Fixed: the AI considers Rush only
   for a unit with a visible hostile unit within its Move + 1 + range, or
   on the way to a threatened own city; Rush is one command, so the
   128-command cap is not touched.

Changes made in this final redraft: items 8 and 9 above; the Re-bake
price ignores Arms Industry (so Metallurgy does not stack a second
discount); Escape from a Rushed Donut Racer has the ordinary Move 2 (not
3); Bounce resolves after the Charge! follow; and Splat applies when a
Shield took the whole hit.
