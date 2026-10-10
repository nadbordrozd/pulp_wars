# Ruleset 7: the Candy redesign

**Status:** design (bead `pulp_wars-jdb.11`, epic `pulp_wars-jdb`), with
the defaults of [section 18](#18-open-questions-with-defaults) accepted;
**its engine is built** by `pulp_wars-jdb.12` at `pulp-wars-poc-7r68`, and
[current rules section 23](RULESET_7_CURRENT.md#23-candy-faction-rules)
states the rules as built, with the places where the code differs from
this text in its
[known discrepancies](RULESET_7_CURRENT.md#25-known-discrepancies). The
Normal AI's use of the new abilities (`pulp_wars-jdb.13`) and their markers
and effects (`pulp_wars-jdb.14`) are not built yet. Where this document and
the [Candy overlay](RULESET_7_CANDY.md) differ, this document wins and the
overlay is history.

**Ruleset ID:** the engine bead takes the next free identity when it lands
(written `7rNN` below; `7r59` is current). Identity work is serial: the
Dwarf step two (`pulp_wars-w49.28`), the giant reward level
(`pulp_wars-zypi`), and the giant signatures engine (`pulp_wars-w49.30`)
may each take one first.

**Scope:** the Candy land roles, their abilities, Crumbs and the
Confectioner, and the shapes, engine impact, AI notes, art, UI, and tests
that follow. Sugar Rush, the Crash, Home Sweet Home, Splat, Bounce, Sugar
Toss, Peppermint Surprise, Rock Hard, the roster numbers, the technology
graph, and the boats stay as they are, except where a section says
otherwise. The Gingerbread Giant (the `JUGGERNAUT` role) belongs to the
[giants spec](RULESET_7_GIANTS.md#68-candy-gingerbread-giant-break-off)
(`pulp_wars-w49.29`), which gives it **Break Off**; this document does not
redesign it again and only states how the new Candy rules meet it
([section 7.9](#79-gingerbread-giant-break-off-from-the-giants-spec)).

The shape follows the earlier faction passes: what the user asked
([section 1](#1-the-complaint-and-the-bar)), what exists
([section 2](#2-what-the-candy-have-today)), a first draft
([section 3](#3-first-draft)), a skeptical critique
([section 4](#4-critique)), the redraft
([section 5](#5-redraft)), the final rules
([sections 6 to 9](#6-final-rules-sugar-rush-and-the-statuses)), and then
the numbers ([section 10](#10-the-faction-as-a-whole)), the hand-played
turns and the Crumbs count before and after
([section 11](#11-hand-played-turns-and-the-crumbs-count)), engine impact
([section 12](#12-engine-impact-one-identity-bump)), AI
([section 13](#13-normal-ai-notes)), art and UI, tests, acceptance, beads,
and open questions.

## 1. The complaint and the bar

The user, 2026-10-08 (bead `pulp_wars-jdb.11`):

> Candy people are like Humans only sort of worse. Sugar Rush is great, but
> all their abilities are the same as Human abilities only gated by Sugar
> Rush; give them new fun, wacky abilities. The Confectioner's baking is
> rubbish because the Crumbs never happen; make it better.

The bar for every faction pass (user rulings of 2026-10-06 on epic
`pulp_wars-w49`): the faction is neither crazy strong nor crazy weak, every
technology branch is useful, and units differ from other factions by more
than stats; fine balance is not the goal. The design round's point 7 asks
for "AoE attacks, attacking multiple tiles at once, leaving stuff behind on
a tile, combo attacks, unique movements, inflicting statuses, strange stat
combinations, wacky abilities and more". Balance is judged by scenario
reasoning and a few hand-played turns, not by AI-against-AI statistics
(user mandate of 2026-10-05). The Candy are the last faction without step
two (army-play AI); it follows this redesign
([section 17](#17-implementation-beads)).

## 2. What the Candy have today

### 2.1 Every ability, and whose it is

The audit reads `CANDY_ROLE_RULES_V7` and `CANDY_ROLE_MECHANICS_V7`
(`src/engine/rules/ruleset-v7.ts`), `src/engine/v7/candy.ts`
(`overrunKindV7`, `overrunMayContinueV7`, `attackGrantsEscapeV7`), and
`src/engine/v7/candy-reducer.ts`.

| Unit              | Role         | Ability today                     | Whose ability it really is                                                          |
| ----------------- | ------------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| every land unit   | —            | Sugar Rush and the Crash          | **Candy's own** (the signature; kept)                                               |
| Toffee Trooper    | `FIGHTER`    | none besides the Rush             | a Fighter with 10 HP and no Field Defense                                           |
| Donut Racer       | `RAIDER`     | Escape, only while Rushed; Charge | **the Human Raider's Escape behind the Rush**; Charge is the shared Raiding unlock  |
| Gumball Gunner    | `MARKSMAN`   | Sugar Toss (a ranged heal of 2)   | Candy's own, but a heal, and the attack is a Marksman's                             |
| Marshmallow       | `GUARD`      | Bounce                            | Candy's own                                                                         |
| Confectioner      | `CAPTAIN`    | Frosting; Re-bake                 | **Frosting is the Human Captain's Tend Wounded relabelled**; Re-bake is Candy's own |
| Pie Launcher      | `CATAPULT`   | Splat                             | Candy's own                                                                         |
| Chocolate Bunny   | `KNIGHT`     | Sugar Frenzy, only while Rushed   | **the Human Knight's Overrun behind the Rush** (`overrunKindV7`), capped at three   |
| Jawbreaker        | `SWORDSMAN`  | Rock Hard (`immovable`)           | Candy's own, but a passive immunity                                                 |
| Gingerbread Giant | `JUGGERNAUT` | Push; Bounce                      | the Juggernaut's Push (the giants spec replaces it with **Break Off**) and Bounce   |

So the user is right on the three units he sees most: the Racer and the
Bunny earn their perk by Rushing and the perk is a Human ability, and the
Confectioner's everyday action is the Captain's. The Trooper, the faction's
most common unit, has nothing at all, and with 10 HP against the Fighter's
12 it is "a Human, only sort of worse".

The other factions got mechanics that change how a unit is used, not a
borrowed ability: the Dwarves tunnel, erupt, bomb, and Dig In
([Dwarf overlay](RULESET_7_DWARVES.md)); the Ice Folk Chill, Shatter, Glide
on Snow, and throw Bolas ([Ice Folk overlay](RULESET_7_ICE_FOLK.md)); the
Martians shield, beam down, pull, and take minds
([Martian overlay](RULESET_7_MARTIANS.md)). The Candy design that this
document replaces put its effort into four faction-wide pillars (Rush,
Crumbs, Splat, Bounce) and let three units borrow the rest.

### 2.2 The Crumbs pipeline, and why it fails

A Re-bake ([current rules section 23.3](RULESET_7_CURRENT.md#233-crumbs))
needs all of these on one Candy turn: a Candy death on a land tile that is
not a settlement site; a Confectioner (Leadership, tier 2, 5 Coins) that
ends next to the Crumbs with its action unused; **the Crumbs tile empty**;
a **free slot in the Confectioner's home city**; the Coins; and the Crumbs
not yet eaten or stale. Three of these fail in ordinary play almost every
time:

1. **The killer stands on the Crumbs.** The advance after a melee kill is
   forced (user ruling of 2026-10-06), so every melee kill of a Candy unit
   puts the enemy on its Crumbs, and a Candy unit that takes the tile back
   by a kill stands there in turn.
2. **The home city is full.** Cities are kept full; the hand playtests of
   epic `pulp_wars-w49` found that unit capacity, not Coins, is what limits
   armies.
3. **The fights are at the settlements.** Deaths on a village or city
   center leave no Crumbs at all.

And when a Re-bake does happen, the copy (5 HP for a Trooper) appears on the
very tile where the original died, next to the unit that killed it.

**Hand-played sample.** One text-mode game as the Candy against the Human
Normal AI (Dry Land 11, seed 9, `pulp-wars-poc-7r59`, 16 rounds; session in
the bead's scratch output). Six Candy units died:

| #   | When                | Unit                          | Tile | Killed by, then                      | Crumbs          | Re-bake today, next Candy turn                                  |
| --- | ------------------- | ----------------------------- | ---- | ------------------------------------ | --------------- | --------------------------------------------------------------- |
| 1   | round 5, Human turn | Toffee Trooper (Crashed)      | 4,1  | Raider, which advanced and Escaped   | none: a village | no Confectioner yet (trained in round 8)                        |
| 2   | round 13            | Toffee Trooper (Crashed)      | 2,2  | Fighter, which advanced onto it      | yes             | no: the Fighter stood on it, then my Trooper that killed it did |
| 3   | round 15            | the re-baked Trooper (5 HP)   | 2,2  | Raider (Escaped); a Fighter ate them | eaten           | —                                                               |
| 4   | round 15            | Toffee Trooper (Crashed, 5HP) | 2,3  | Fighter, which advanced onto it      | yes             | no: the Fighter, then my killing Trooper, stood on it           |
| 5   | round 16            | Toffee Trooper (Crashed)      | 1,2  | Fighter, which advanced onto it      | yes             | no: the Fighter stood on it                                     |
| 6   | round 16            | Toffee Trooper (Crashed)      | 3,3  | Fighter, which advanced onto it      | yes             | no: the Fighter stood on it                                     |

The one Re-bake of the game (round 14) needed a trick: the Confectioner's
home was full (3 of 3), and only a free Explorer Monument (+3 population,
level 3, a fourth slot) opened a slot. The copy appeared at 2,2 between a
Fighter and a Raider and died in the next Human turn (unit 3). **One
Re-bake from six deaths, none by ordinary means.** Five of the six dead
were Crashed when they died.

**A usage count, for the record.** Six headless Normal-against-Normal
matches with a Candy seat at `7r59` (Dry Land 14, seeds 9 and 19, the
Candy against the Humans in both seat orders and against the Goblins; the
`candy` headless metrics) left 77 Crumbs: 23 were eaten, 47 went stale, and
**2 were re-baked**. This counts how often the AI got the mechanic to fire,
not who won; it agrees with the hand-played game.

## 3. First draft

The first draft (kept here so the critique has something to cut) gave every
unit a big ability and made Crumbs a second economy.

- **Sugar Rush** unchanged; the Rush perks (Escape, Sugar Frenzy) removed.
- **Toffee Trooper — Sticky:** a unit it hits cannot Move on its next turn.
- **Donut Racer — Glaze:** the tiles it rolls over are Glazed until the
  Candy seat's next turn; own units step onto Glaze at half cost and enemy
  units that step onto Glaze end their Move there.
- **Gumball Gunner — Ricochet:** every shot also hits **every** hostile unit
  next to the target for half; Sugar Toss dropped.
- **Marshmallow — Bounce** and **Squish:** it takes at most 5 from one hit.
- **Confectioner — the Oven:** every Candy death within 3 tiles of a
  Confectioner goes straight into its oven (no Crumbs on the board); its
  **Bake** puts the unit back out next to it at half price and half HP, any
  number over capacity. **Sugar Top-Up:** every adjacent Crashed unit stops
  being Crashed. Frosting dropped.
- **Snack:** any own Candy unit that ends a Move on own Crumbs eats them,
  heals 3, and stops being Crashed.
- **Pie Launcher — Splat** for every hostile unit next to the target too.
- **Chocolate Bunny — Bunny Hop:** it may jump over any unit or terrain as
  often as it likes; Sugar Frenzy kept.
- **Jawbreaker — Toothache:** a unit that attacks it has −1 Attack for its
  next turn, retaliation included; Rock Hard kept.

## 4. Critique

Read as a skeptical designer looking for hard locks, degenerate loops,
readability problems, and AI blind spots. Each item states the objection
and what the redraft does.

1. **Sticky is a root.** "Cannot Move" is the hard lock the original design
   already rejected (its appendix A item 3): a Knight or Raider that hits a
   Trooper is a guaranteed kill, and a unit next to three Troopers never
   leaves. **Redraft:** Stuck limits a Move to **one step** for one turn.
   Every Move-1 unit is untouched; a Raider, Knight, Sled, or Saucer loses
   its reach and its Escape, which is the anti-cavalry job the cheap unit
   should have.
2. **Glaze as an enemy trap** is the Ice Folk's deep snow (a tile that ends
   a Move) by another name. **Redraft:** Glaze helps only the Racer's own
   side and only in the turn it is laid; it is a moving road, not a trap.
3. **Ricochet on every neighbour** turns a 3-Coin unit into a Lich: against
   a packed line one shot deals 6 plus 3 to each of up to seven others.
   **Redraft:** one bounce, to the weakest visible neighbour, only from
   distance 2 (a lob, not a point-blank shot). Sugar Toss stays: the
   Candy keep one ranged heal, and it is already built and used.
4. **Squish is Plated** (the Dwarf Steam Tank). **Cut.** The Marshmallow's
   Bounce is already its own.
5. **The Oven hides the Crumbs.** Taking Crumbs off the board removes the
   enemy's answer (eating them), Peppermint Surprise, and the "leave
   something on the tile" mechanic the user asked for, and "any number over
   capacity" is an unbounded army: every death within 3 of a Confectioner
   comes back without a slot. **Redraft:** Crumbs stay on the board, but the
   Confectioner **scoops** them from up to **2** tiles away (from under any
   unit), bakes the copy onto a free tile **next to itself**, and may put
   its home city **at most one** unit over capacity.
6. **Snack competes with the Bake and kills the Crash.** A Crashed unit
   that walks onto a fallen friend's Crumbs is sober again, so every death
   un-Crashes a neighbour; and a player must choose between snacking and
   baking the same pile, a decision the AI will get wrong. The user asked
   for the Bake to happen, not for a second use. **Cut.**
7. **Top-Up on every neighbour** makes the Crash optional around a
   Confectioner: an army in a ring Rushes every turn. **Redraft:** Top-Up
   is **one** adjacent unit, a primary action that competes with the Bake
   and the Confectioner's attack; it also heals 2 and cures (Frosting's job,
   which it replaces, so the Candy keep a cure against Plague and bites).
8. **Splat on the neighbours** makes a whole line unable to strike back
   after one Pie shot; with Rushed Troopers that is the uncapped T-Rex
   failure again (a turn with no losses against any defence). **Cut;** the
   Pie keeps Splat on its target.
9. **Unlimited hops plus Sugar Frenzy** is the T-Rex twice: reach anything,
   then chain. And Sugar Frenzy is exactly the borrowed Overrun the user
   complained about. **Redraft:** one hop per Move, Sugar Frenzy removed,
   and in its place **Thump**: every attack the Bunny makes deals 2 to each
   other hostile unit around it. It is an area hit, not a chain: it softens
   a back line for the Gunners and Troopers instead of clearing it alone.
10. **Toothache for a whole turn, retaliation included,** halves a Fighter's
    output in both directions for two turns, on top of a 2.5-Defense
    retaliation; with Bounce and Stuck the Candy line would punish every
    melee attack three ways, which feeds the defence-heavy play that epic
    `pulp_wars-w49` is trying to remove. **Redraft:** Toothache is −1 Attack
    on the attacker's **next attack only**, never on retaliation.
11. **Too many markers.** Rushed, Crashed, Splatted, Stuck, Toothache,
    Glaze, and Crumbs. **Kept, with one look each:** the three enemy
    statuses are the faction's new identity (a pie in the face, toffee on
    the feet, a cracked tooth), each comes from one unit and fits one
    sentence; Glaze exists only during the Candy turn. Rushed and Splatted
    already exist only during the Candy turn.
12. **Do the borrowed perks leave holes?** Without Escape the Racer cannot
    hit and run; without Overrun the Bunny cannot clear a line. Both were
    the complaint. The Racer becomes the army's road-layer (and still
    raids with Charge); the Bunny becomes the unit that **reaches** a back
    line (Hop) and hurts all of it a little (Thump).
13. **Is the faction now too strong?** The buffs (Sticky on the 2-Coin unit,
    Glaze, Ricochet, Thump, Toothache, a Bake that works) outweigh the cuts
    (Escape, Sugar Frenzy's three-kill ceiling, Frosting's area heal). The
    starting point is "Humans, only sort of worse" (the hand-played game
    was lost on a Trooper line that melted), so a net buff is intended;
    [section 10](#10-the-faction-as-a-whole) checks that no part is
    dominant, and [section 10.2](#102-tuning-bounds-and-named-levers) names
    the levers.
14. **AI blind spots.** Every new rule must be readable by the Normal AI
    from public previews: Stuck and Toothache are public statuses, the
    Ricochet target and the Thump hits are in the combat preview, the Hop
    is in the movement query, the Glaze in the view. The older policy
    playing the Candy must stay legal with none of it
    ([section 13](#13-normal-ai-notes)).
15. **The bake still needs a death.** The bead suggests a bake "on its own
    action, not a rare trigger". A death-free bake (a Trooper out of
    nothing every turn) is a second training queue that ignores the city
    action and, with any over-capacity allowance, the unit limit; it would
    also cut the Crumbs, the faction's "never quite dead" line, out of the
    loop. The real failure is that Crumbs exist (77 in six matches) and
    almost none are baked. **Redraft:** keep the bake tied to Crumbs, make
    it fire after most deaths in a Confectioner's reach (the three fixes of
    item 5), and give the Confectioner Top-Up for the turns with no Crumbs,
    so it always has a Candy action. The death-free bake is
    [open question 11](#18-open-questions-with-defaults).
16. **Two capacity rules for one faction.** The giants spec's Break Off
    (`pulp_wars-w49.29`) makes a Trooper only into a **free** slot of the
    Giant's home, while Re-bake may put its home one unit over. **Kept, on
    purpose:** Break Off makes a new unit for no Coins, so it must find a
    real slot (the giants spec's own "unit factory" critique); Re-bake
    pays Coins to bring back a unit that already had a slot until it died.
    Both read the same tile rule (around the maker, free, enterable, not
    allied territory), so the player learns one placement.

## 5. Redraft

The redraft is the first draft with the critique applied; the final rules
follow in [sections 6 to 9](#6-final-rules-sugar-rush-and-the-statuses).

| Unit              | Final kit                                                                    | Changed from today                      |
| ----------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| every land unit   | Sugar Rush and the Crash; Home Sweet Home                                    | Rush perks removed                      |
| Toffee Trooper    | **Sticky Toffee:** whatever it hits is Stuck (a Move of one step) for a turn | new                                     |
| Donut Racer       | **Glaze Trail:** the tiles it leaves are a half-cost road for its side       | Escape removed; Glaze new               |
| Gumball Gunner    | **Ricochet** from distance 2 (half the hit to the weakest neighbour); Toss   | Ricochet new                            |
| Marshmallow       | Bounce                                                                       | unchanged                               |
| Confectioner      | **Re-bake** (scoop from 2, bake next to itself, one over capacity); Top-Up   | Re-bake reworked; Frosting → **Top-Up** |
| Pie Launcher      | Splat                                                                        | unchanged                               |
| Chocolate Bunny   | **Bunny Hop** (jump one tile in a Move); **Thump** (2 to every neighbour)    | Sugar Frenzy removed; Hop and Thump new |
| Jawbreaker        | Rock Hard; **Toothache** (a melee attacker's next attack is −1)              | Toothache new                           |
| Gingerbread Giant | **Break Off** (the giants spec); Bounce                                      | Push lost, by `pulp_wars-w49.29`        |
| Crumbs            | also on settlement sites; scooped from 2 tiles, from under any unit          | placement and reach                     |

The identity line becomes: **the Candy are a sugar rush of sticky, annoying
sweets that keep coming back.** They hit hard on the turn they choose,
crash the next, gum up whatever touches them (toffee, pies, toothache,
bounces), and the Confectioner bakes the fallen back out of their Crumbs.
They are weak to ranged and fixed damage (which no Candy status answers), to
units that kill a 10-HP body in one blow, and to anyone who kills the
Confectioner.

## 6. Final rules: Sugar Rush and the statuses

### 6.1 Sugar Rush and the Crash

[Current rules section 23.2](RULESET_7_CURRENT.md#232-sugar-rush-and-the-crash)
stands, with two changes:

- **No Rush perks.** The role mechanic `rushPerk` is removed: a Rushed Donut
  Racer is never granted Escape, and a Rushed Chocolate Bunny has no Overrun
  (Sugar Frenzy). `SUGAR_FRENZY_MAX_CONTINUATIONS_V7`, the state-parsing
  check on a perk flag without a `RUSHED` entry, the Rushed Racer's and
  Bunny's chips, and the `escapeAvailable` and `overrunAdvance` readings for
  Candy units go. No Candy unit has Escape or Overrun.
- **Top-Up** ([section 8.2](#82-top-up)) removes a `CRASHED` entry during the
  owner's turn. A unit Topped Up before it moved may Rush again that turn
  (the Rush legality is unchanged: not Crashed, not moved, no primary action
  used, not handled).

### 6.2 Candy statuses on other units

The Candy give three statuses. **Splatted** is unchanged
([current rules section 23.5](RULESET_7_CURRENT.md#235-splat)). **Stuck**
and **Toothache** are new and share these rules:

- **Who can carry them:** a unit on the board in any form, except an Egg,
  a burrowed Dwarf unit (it is off the board), and the Giant Spider (no
  status sticks to it). Allied and own units can carry them only through
  Mind Control (a controlled Candy unit applies them to its controller's
  enemies, which may be Candy units).
- **Duration.** Each entry has `endsLeft`: **1** when it is applied during a
  turn of a seat other than the unit's owner, **2** when it is applied
  during its owner's own turn (the unit attacked a Toffee Trooper or a
  Jawbreaker). At every End Turn of a seat `P`, every entry of a unit `P`
  owns loses 1 and those at 0 are removed (no event; the Chill precedent).
  So a status always lasts **until the end of the victim's next turn that
  begins after the hit**. A new application sets `endsLeft` to the larger
  of the old and the new value. Entries belong to units: they survive Mind
  Control and release, and are removed when the unit leaves the board.
- **Public:** on every visible unit, in the view and the unit stats, like
  `chilled`.
- **Top-Up** removes both from its target
  ([section 8.2](#82-top-up)); nothing else cures them.

**Stuck** (state `stuck: { unitId, endsLeft }[]`, sorted by unit ID). A
Stuck unit's `MOVE`, an Escape Move included, has **at most one step** (a
path of one tile), whatever its Move, Rush, Roads, Glaze, or Glide. A slide
on ice that its one step starts still runs (a slide is not a step). It may
still attack, act, Wait, embark, land, and exert ZOC; displacement and
placement commands (Tunnel, Bomb Run, Beam Down, a Push) are not Moves and
are unaffected. Consequences, all from existing rules: Charge needs a Move
of two tiles, so a Stuck Raider never Charges; a Triceratops's Charge!
run-up is at most 1; a Raider that Slips past ZOC still moves one tile.

**Toothache** (state `toothache: { unitId, endsLeft }[]`, sorted by unit
ID). A unit with Toothache has **−1 Attack** (`TOOTHACHE_ATTACK2_V7`, 2
half-units, never below 0.5) on its **next `ATTACK`**, at any distance; the
entry is removed after that attack's exchange, or when it expires. It never
changes retaliation, Defense, or fixed damage. It adds to every other
modifier (Rush, Charge, Inspired, Cold Blood, Strafe) after them.

## 7. Final rules: the units

### 7.1 Toffee Trooper: Sticky Toffee

**One sentence:** whatever a Toffee Trooper hits is Stuck until the end of
its next turn: it can move only one tile.

- After an `ATTACK` exchange in which a land-form Toffee Trooper (kind
  `CANDY`, role `FIGHTER`) **hit** a unit, that unit becomes Stuck if it is
  still on the board after the exchange's deaths: the Trooper's **target**
  when the Trooper attacked, and the **attacker** when the Trooper struck
  back. A hit is any exchange in which the Trooper's damage was computed,
  whether it went to HP or wholly to a Shield (the Splat precedent). A
  ranged attacker on a Trooper is never hit back, so it is never Stuck.
- Role mechanic `sticky: true` for the Candy `FIGHTER` only; public
  ability `STICKY`.
- Event `UNIT_STUCK { playerId, sourceUnitId, unitId, endsLeft }`
  (`playerId` the Trooper's owner), right after the exchange's deaths and
  the Splat, before the advance. The combat preview carries `stuckApplied`:
  `"NONE"`, `"TARGET"`, or `"ATTACKER"`.
- Embarked or Crashed: a Crashed Trooper still sticks what it strikes back
  at; an embarked one never fights.

### 7.2 Donut Racer: Glaze Trail

**One sentence:** the tiles a Donut Racer rolls off are glazed for the rest
of the turn, and its side moves onto them at half cost.

- After an accepted `MOVE` of a land-form Donut Racer, its start tile and
  every tile its path passed (not the tile it ended on) that is a land tile
  become **Glazed** for the rest of the active seat's turn (state
  `glazedThisTurn: CoordV7[]`, sorted by `(y, x)`, emptied at that seat's
  End Turn; Glaze belongs to the active seat). Event
  `TILES_GLAZED { playerId, unitId, tiles }` after the Move's own events.
- For a land-form unit of the **active seat** (its own units, and units it
  controls), a step **onto** a Glazed tile costs **1** half-point instead of
  2 (a Road step's cost; never less). Every stop still applies: Forest,
  Mountain, deep snow, ice, ZOC, an unexplored cell, occupancy.
- It is a road for the turn, not a trap: other seats' units never read
  Glaze, and it never survives the End Turn.
- Removed: Escape (the Racer has none, Rushed or not). Kept: Charge with
  Raiding, capture, Pillage, Sight 2, Fieldcraft Forest freedom.
- Role mechanic `glazeTrail: true` for the Candy `RAIDER` only; public
  ability `GLAZE_TRAIL`. The movement query and `previewSugarRushV7` read
  the Glaze.

Worked example: a Donut Racer moves two tiles east, glazing its start and
the middle tile. A Toffee Trooper standing west of the Racer's start steps
onto the start (1) and the middle tile (1): two tiles with Move 1, and it
ends next to the Racer. Rushed (4 half-points), it spends 2 on the Glaze
and has 2 left, one more ordinary step: three tiles in all, where an
unglazed Rushed Trooper walks two.

### 7.3 Gumball Gunner: Ricochet and Sugar Toss

**One sentence:** a Gumball Gunner's shot from two tiles bounces on to the
weakest enemy next to its target for half the damage.

- After an `ATTACK` by a land-form Gumball Gunner from **distance 2**, when
  the main hit dealt `d` (HP plus Shield) of at least 2, the gumball
  ricochets to **one** unit: among the units hostile to the Gunner's owner
  on the eight tiles around the target's tile, other than the target, that
  the Gunner's owner saw before the attack, in any form but burrowed or
  submerged, never an Egg or the Giant Spider: the one with the **lowest
  HP**, then the lowest unit ID. It takes `floor(d / 2)` fixed damage:
  Armoured takes 1 off, Plated caps it, a Shield absorbs first, and no
  cover, fortification, Snow, or Blizzard changes it (the main hit has
  already had them). No retaliation, Splat, Stuck, or Field Defense
  destruction. It happens whether or not the main target died.
- A death is cause `RICOCHET`, credited like a `SPLASH` death (to the
  Gunner's owner, with unit kill credit to the Gunner).
- Event `RICOCHETED { playerId, unitId, targetUnitId, damage, shieldDamage, dies }`
  after the attack's own deaths, Splat, statuses, advance, and Bounce. The
  combat preview carries `ricochet: { unitId, damage } | null`, exact (the
  candidates are units the attacker sees).
- From distance 1 there is no ricochet.
- **Sugar Toss** is unchanged
  ([current rules section 23.7](RULESET_7_CURRENT.md#237-the-redesign-abilities)).
- Role mechanic `ricochet: true` for the Candy `MARKSMAN` only; public
  ability `RICOCHET`.

### 7.4 Marshmallow: Bounce

Unchanged ([current rules section 23.6](RULESET_7_CURRENT.md#236-bounce)).

### 7.5 Confectioner: Re-bake and Top-Up

The Confectioner keeps the Captain's body (5 Coins, 10 HP, Attack 1,
Defense 1, Move 1, no Rally; it captures since `pulp_wars-ke95`). Its primary actions are
`ATTACK`, **`REBAKE`** ([section 8.1](#81-crumbs-and-re-bake)), and
**`TOP_UP`** ([section 8.2](#82-top-up)). It no longer has `TEND_WOUNDED`
(Frosting); `TEND_WOUNDED` is never offered to a Candy unit. Public
abilities: `ATTACK`, `CAPTURE`, `REBAKE`, `TOP_UP`, `SUGAR_RUSH`.

### 7.6 Pie Launcher: Splat

Unchanged ([current rules section 23.5](RULESET_7_CURRENT.md#235-splat)).

### 7.7 Chocolate Bunny: Bunny Hop and Thump

**One sentence:** a Chocolate Bunny can hop over one tile in its Move, and
every attack it makes thumps 2 into every other enemy around it.

**Bunny Hop.**

- The path of a land-form Chocolate Bunny's `MOVE` may contain **one hop**:
  two consecutive path tiles at Chebyshev distance 2 in a straight line
  (`dx` and `dy` each in {−2, 0, 2}, not both 0).
- The **jumped tile** (the one between) must be explored and must not be
  water (Shallow, Deep, or ice); it may hold any unit of any owner, an Egg,
  or a mound, and any land terrain (Forest, Mountain, a Rift). It is not
  entered: no cost, no stop, no ZOC, no eating, no chest, no Field Defense,
  and no reveal from it.
- The hop costs **2 half-points** (one ordinary step; never the Road or
  Glaze cost). The landing tile follows every entering rule (occupancy,
  `canEnterTerrainV7`, the Forest, Mountain, deep-snow, ice, ZOC, and
  unexplored-cell stops), and a path may not continue past a stop.
- **Fog.** When the landing tile holds a unit the mover could not see, the
  Move is interrupted on the take-off tile (`UNIT_MOVE_INTERRUPTED`, the
  ordinary hidden-unit rule).
- A hop is part of an ordinary `MOVE`; no new command. The movement
  search (`reachablePlayerMovementPathsV7` and
  `validatePlayerMovementPathV7` in `movement.ts`, and `previewSugarRushV7`)
  offers hop destinations and `queryThreatenedTilesV7` counts them. Stuck allows one step only, and a
  hop is a step, so a Stuck Bunny may hop.

**Thump.**

- After every `ATTACK` by a land-form Chocolate Bunny, once the exchange,
  its deaths, the statuses, the advance, and a Bounce are resolved, if the
  Bunny is still on the board, **every other** unit hostile to its owner on
  the eight tiles around it (in any form but burrowed or submerged; never
  an Egg or the Giant Spider; never the attack's own target) takes
  `THUMP_DAMAGE_V7` **2** fixed damage (Armoured 1 off, Plated cap, Shield
  first). No retaliation, no statuses. Never on retaliation.
- Deaths are cause `THUMP`, credited like a `SPLASH` death (to the Bunny's
  owner, with unit kill credit to the Bunny).
- Event `THUMPED { playerId, unitId, hits: [{ unitId, damage, shieldDamage, dies }] }`
  (sorted by unit ID; omitted when empty). The combat preview carries
  `thump: [{ unitId, damage }]`; it reads the Bunny's tile after the
  previewed advance or Bounce, so it is exact whenever those are
  (`"UNKNOWN_BEHIND_FOG"` Bounce: the Thump list is the units around the
  unbounced tile, marked `thumpUncertain: true`).

The Bunny keeps Knight parity otherwise (9 Coins, 14 HP, Attack 3, Defense
1.5, Move 2, the advance after a melee kill; it captures since
`pulp_wars-ke95`). Role mechanics
`hop: true` and `thumpDamage: 2` for the Candy `KNIGHT` only; public
abilities `HOP` and `THUMP`.

### 7.8 Jawbreaker: Rock Hard and Toothache

**One sentence:** a unit that bites a Jawbreaker gets Toothache: its next
attack is 1 weaker.

- After an `ATTACK` from distance 1 on a land-form Jawbreaker, the attacker
  gets Toothache if it is still on the board after the exchange's deaths,
  whether or not the Jawbreaker survived (it bit down anyway).
- Event `TOOTHACHE_GIVEN { playerId, sourceUnitId, unitId, endsLeft }`
  (`playerId` the Jawbreaker's owner). The combat preview carries
  `toothacheApplied` (the attacker will get it) and `toothacheAttack` (the
  attacker's own Toothache lowered this attack).
- **Rock Hard** is unchanged
  ([current rules section 23.12](RULESET_7_CURRENT.md#2312-the-jawbreaker-rock-hard)).
- Role mechanic `toothache: true` for the Candy `SWORDSMAN` only; public
  ability `TOOTHACHE`.

### 7.9 Gingerbread Giant: Break Off, from the giants spec

The [giants spec](RULESET_7_GIANTS.md#68-candy-gingerbread-giant-break-off)
(`pulp_wars-w49.29`, built by `pulp_wars-w49.30` to `w49.32`) is the rule
for the Giant: **Break Off** (`BREAK_OFF { kind, unitId, at }`) tears 8 HP
off a Giant of at least 9 HP to make an 8-of-10-HP Toffee Trooper on a free
tile around it, into a free slot of its home city, for no Coins; the Giant
loses Push and keeps Sugar Rush and Bounce. This document changes none of
that. How the two documents meet:

- **The broken-off Trooper is an ordinary Toffee Trooper**, so under this
  redesign it has **Sticky Toffee** with no extra rule, and when it dies it
  leaves Crumbs that a Confectioner may Re-bake (a 1-Coin, 5-HP copy).
- **The Giant itself** still leaves no Crumbs (`leavesCrumbs` false) and is
  never re-baked; it gets no new Candy ability here.
- **Top-Up on the Giant** is legal like on any own unit: it ends the
  Giant's Crash (so a Giant that Rushed last turn may Break Off this turn),
  heals 2, and cures. With Frosting gone, the Giant's HP comes back only by
  Recover (with Windmills), Top-Up (2), and Sugar Toss (2), slower than the giants spec's
  critique assumed (its point 9 counted Frosting), so Break Off is, if
  anything, more bounded.
- **Capacity.** Break Off needs a free slot; a Re-bake that put the shared
  home city one over capacity blocks Break Off there until a death brings it
  back ([critique item 16](#4-critique)).
- **Bounce** stays on the Giant (giants spec open question 9, default keep),
  so the Marshmallow and the Giant are the Bouncy units, as now.
- **Order on the Candy turn.** When the Giant and a Confectioner share a
  home city with one free slot, Break Off first and then Re-bake gets both
  units (the Re-bake goes one over); the other order gets only the Re-bake.
  The step two AI orders them so ([section 13](#13-normal-ai-notes)).

## 8. Final rules: Crumbs, Re-bake, and Top-Up

### 8.1 Crumbs and Re-bake

**One sentence:** a fallen Candy unit leaves Crumbs for three turns, and a
Confectioner within two tiles scoops them up and bakes the unit back out
next to itself at half price and half HP.

**Crumbs** keep their state (`crumbs: { at, role, ownerId, turnsLeft }[]`),
lifetime (`CRUMBS_TURNS_V7` 3), eating, Peppermint Surprise, events, and
fog rules ([current rules sections 23.3 and 23.4](RULESET_7_CURRENT.md#233-crumbs)),
with two changes:

- **Settlement sites hold Crumbs.** A death on a village or a city center
  leaves Crumbs like any land tile. Crumbs are still never left on water,
  ice, a Rift, a chest tile, or a curiosity tile. State parsing accepts a
  settlement site.
- **Two more causes:** `RICOCHET` and `THUMP` deaths leave Crumbs (in a test
  mirror). The giants spec's causes follow its rule G5: `CRUSH`, `STOMP`,
  and `TRAMPLE` deaths leave Crumbs, and a `DIGESTED` (swallowed) Candy unit
  leaves none.

**`REBAKE { kind, unitId, from, at }`** (the command gains `from`; `at` is
now where the copy appears). A primary action of the Confectioner; it may
follow a Move. Legality, in order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                      | Rejection                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                   | the ordinary unit errors                   |
| 2   | Its role, under its kind, has `REBAKE` (a mind-controlled Confectioner's role rule drops it).                                                                                                    | `UNIT_ROLE_INVALID { role }`               |
| 3   | It is not Crashed.                                                                                                                                                                               | `UNIT_CRASHED { unitId }`                  |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Confectioner has not moved.                                                                                            | `UNIT_ALREADY_ACTED`                       |
| 5   | It is in land form.                                                                                                                                                                              | `REBAKE_NOT_LEGAL { reason: "EMBARKED" }`  |
| 6   | It has a home city owned by the actor.                                                                                                                                                           | `REBAKE_NOT_LEGAL { reason: "NO_HOME" }`   |
| 7   | `from` is within Chebyshev distance `REBAKE_REACH_V7` (**2**) of it and holds Crumbs owned by the actor. **Any unit, Egg, or mound may stand on them.**                                          | `REBAKE_NOT_LEGAL { reason: "NO_CRUMBS" }` |
| 8   | `at` is one of the eight tiles around the Confectioner, holds no unit of any owner or form, no mound, no chest, and no curiosity, is enterable by the Crumbs' role, and is not allied territory. | `REBAKE_NOT_LEGAL { reason: "TILE" }`      |
| 9   | The home city has `used + 1 <= capacity + REBAKE_OVER_CAPACITY_V7` (**1**).                                                                                                                      | `CITY_CAPACITY_FULL`                       |
| 10  | The actor has `rebakePriceV7(role)` = `ceil(cost / 2)` Coins (Arms Industry never applies).                                                                                                      | `INSUFFICIENT_COINS`                       |

**Result.** The Coins are spent and the Crumbs at `from` removed (scooped,
from under whoever stands there). A new unit of the Crumbs' role with the
next entity ID stands on `at`: owned by the actor, homed to the
Confectioner's home city, at `rebakeHpV7(role)` = `ceil(maxHp / 2)` HP, zero
kills, the exhausted activation, `captureEligible` false; hostile Field
Defense on `at` is destroyed (`OCCUPATION`), and the new unit reveals its
sight. The Confectioner has used its primary action. Events:
`UNIT_REBAKED { playerId, unitId, rebakedUnitId, role, from, at, cityId, cost, hp }`,
`FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then the ordinary tail. It
spends no city action; a siege does not block it. The price and HP table of
[current rules section 23.3](RULESET_7_CURRENT.md#233-crumbs) stands, with
the Jawbreaker at 3 Coins and 8 HP.

**Over capacity.** The one extra unit is the reward-unit rule
([current rules section 4.4](RULESET_7_CURRENT.md#44-unit-capacity)): a
city over capacity keeps its units and trains nothing until a death,
Disband, or removal brings it back to capacity. With
`REBAKE_OVER_CAPACITY_V7` 1, a Confectioner's home holds at most one unit
over capacity through Re-bake.

**Why these three changes, in one line each:** the reach of 2 means a
Confectioner one tile behind the line reaches the line and one tile past
it; scooping from under a unit beats the forced advance; baking next to the
Confectioner puts the fragile copy behind the line, not next to its killer;
and one over capacity makes a full home city, the normal state, no bar.

### 8.2 Top-Up

**One sentence:** the Confectioner gives one neighbour a sugar top-up: it
stops being Crashed, heals 2, and is cured.

`TOP_UP { kind, unitId, targetUnitId }` replaces Frosting. A primary action
of the Confectioner; it may follow a Move. Legality, in order:

| #   | Requirement                                                                                           | Rejection                                         |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                        | the ordinary unit errors                          |
| 2   | Its role, under its kind, has `TOP_UP`.                                                               | `UNIT_ROLE_INVALID { role }`                      |
| 3   | It is not Crashed.                                                                                    | `UNIT_CRASHED { unitId }`                         |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Confectioner has not moved. | `UNIT_ALREADY_ACTED`                              |
| 5   | It is in land form.                                                                                   | `TOP_UP_NOT_LEGAL { reason: "EMBARKED" }`         |
| 6   | `targetUnitId` is an own unit the actor sees, other than the Confectioner, in land form, not an Egg.  | `HEAL_TARGET_NOT_FOUND` / `HEAL_TARGET_NOT_OWNED` |
| 7   | It is within Chebyshev distance 1.                                                                    | `TOP_UP_NOT_LEGAL { reason: "OUT_OF_RANGE" }`     |
| 8   | It is Crashed, damaged, plagued, bitten, Chilled, Stuck, or has Toothache.                            | `TOP_UP_NOT_LEGAL { reason: "NOTHING_TO_DO" }`    |

**Result.** The target's `CRASHED` entry is removed; it heals
`min(TOP_UP_HEAL_V7 (2), maxHp − hp)`; Plague and Bitten are cured, a Chill
entry becomes thawing, and Stuck and Toothache are removed. Its activation
is untouched: if it has not moved or acted it may now move, act, or Rush.
The Confectioner has used its primary action. Event
`UNIT_TOPPED_UP { playerId, unitId, targetUnitId, crashEnded, amount, hpAfter, cured }`.
There is no per-target limit and no new list: each Confectioner has one
action, and a second Confectioner may top up the same unit (the Crash is
already gone, so it gets only another heal of 2).

### 8.3 Technologies

The graph is unchanged. **Leadership** (Administration) reads "Confectioner
(Re-bake, Top-Up); Market; Disband" for a Candy viewer. The other Candy
unlock texts change only where a unit's ability is named: Scouting "Donut
Racer (Glaze Trail)", Marksmanship "Gumball Gunner (Ricochet, Sugar Toss)",
Chivalry "Chocolate Bunny (Hop, Thump); Cultivate Forest", Metallurgy
"Jawbreaker (Rock Hard, Toothache); Forge; Arms Industry". Home Sweet Home
and Peppermint Surprise are unchanged.

**Branch audit** (every branch must stay useful): Settlement gains the most
(Leadership's Confectioner now bakes in ordinary play); Wilds has the Pie
and the Gunner; Mobility has the Racer's Glaze, Charge, and the Bunny;
Industry has the Marshmallow, Home Sweet Home, the Jawbreaker, and
Peppermint Surprise. No branch loses its reason to exist.

## 9. Resolution order, and interactions

### 9.1 Resolution order

**An attack** ([current rules section 13](RULESET_7_CURRENT.md#13-combat-and-fortification)
with the Candy steps, new ones in bold):

1. Attack value: base and existing bonuses, the Rush's +1; **then the
   attacker's Toothache −1** (never below 0.5). Defense as before.
2. Damage both ways (a Splatted defender does not strike back).
3. Shatter, Lifesteal, Sweep, kill credit, growth.
4. Field Defense destroyed on the target tile under the ordinary reasons.
5. Deaths in order, each with its Grave or rising, then its Crumbs.
6. Splat of a Pie's surviving target; **Stuck** (a Toffee Trooper's
   target, or the attacker it struck back at); **Toothache** for a surviving
   distance-1 attacker of a Jawbreaker; **the attacker's own Toothache is
   used up**.
7. Push and Knockback, the advance, the Charge! follow.
8. Bounce.
9. **Ricochet** (a Gunner from distance 2) or **Thump** (a Bunny), with
   their deaths and Crumbs.
10. Death-blast chains, Plunder, reveals, and the ordinary tail.

**A Move** of a Donut Racer: the Move's own events, eating Crumbs, then
**`TILES_GLAZED`**, then the tail.

**End Turn**, for the active seat: the Crash step; the Crumbs countdown;
**the Stuck and Toothache countdown** of the active seat's units; then
`splattedThisTurn`, `tossedThisTurn`, and **`glazedThisTurn`** are emptied;
then the income preview.

### 9.2 Interactions

| Other rule                               | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chill, sluggish                          | Combine: a Stuck, Chilled unit may move one step or act. Top-Up thaws an own Chilled unit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Cracked, Splat, Inspired, Charge, Strafe | Toothache is applied after every other Attack modifier. Splat, Stuck, and Toothache can all be on one unit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Plague, Bitten                           | Top-Up cures one adjacent unit; Sugar Toss cures nothing. With Frosting gone the Candy cure one unit per Confectioner per turn.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Roads, Forest, Mountain, Snow, ice       | Glaze halves only the cost of a step onto it; every stop applies. A Stuck unit moves one step even along a Road. A hop may jump a Forest, a Mountain, or a Rift, never water or ice; its landing is an ordinary entry (deep snow and ice stop it there).                                                                                                                                                                                                                                                                                                                                     |
| Rift                                     | Never Glazed (no Candy ground unit enters one); a Bunny may hop over one; no Crumbs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Flyers (Saucer, Mothership, Gyrocopter)  | A flyer can be Stuck (one step) and get Toothache; it is hit by Ricochet and Thump; it never eats Crumbs; a Bunny may hop over a flyer.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Boats, embarked units                    | A boat or embarked unit can be Stuck (one step on water), get Toothache (a ship attacking a shore Jawbreaker from distance 1), and take Ricochet and Thump. An embarked Candy unit has none of these abilities. A copy is never baked onto water or ice. Glaze is land only.                                                                                                                                                                                                                                                                                                                 |
| Submarine (Submerged), burrowed units    | Never Ricochet or Thump targets, never Stuck or given Toothache while burrowed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Martian Shields, Shock Field             | A Shield absorbs Ricochet and Thump first; a hit wholly on a Shield still Sticks. A Bunny or Trooper attacking a Shock Trooper takes its Shock Field as usual.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Mind Control                             | Body rules follow the kind: a controlled Trooper sticks, Racer glazes for its controller, Gunner ricochets, Bunny hops and thumps, Jawbreaker gives Toothache, and a controlled Confectioner Tops Up its controller's units; `REBAKE` is still lost under control. Statuses on a unit survive its capture and release.                                                                                                                                                                                                                                                                       |
| Armoured, Plated                         | Reduce and cap Ricochet and Thump like any fixed damage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Graves, risings, death blasts, Plunder   | Ricochet and Thump deaths are ordinary deaths (Graves, risings, blasts with their chains, Plunder for a Goblin seat's kills of Candy units).                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Gang Up, Heavyweight                     | A Stuck Goblin still helps a Gang Up where it stands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Rock Hard, Bounce, Push                  | A bounced attacker of a Marshmallow still gets Stuck or Toothache as above. Thump reads the Bunny's tile after a Bounce.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Eggs, the Giant Spider                   | Never Stuck, never Toothache, never Ricochet or Thump targets. A Bunny may hop over an Egg; Re-bake scoops Crumbs from under an Egg.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Fog                                      | Ricochet picks only units the attacker saw; Thump hits the eight tiles around the Bunny, always in its sight; the hop needs an explored jumped tile; Glaze, Stuck, and Toothache are public on visible tiles and units; Re-bake reads own Crumbs and own units. Every Candy preview stays exact, except the existing Bounce fog case.                                                                                                                                                                                                                                                        |
| Giant signatures (`w49.29`)              | Break Off: [section 7.9](#79-gingerbread-giant-break-off-from-the-giants-spec). A swallowed unit has left the board, so its Stuck, Toothache, Rush, and Crash entries go, and a `DIGESTED` Candy unit leaves no Crumbs. A Stuck Colossus moves one step and so cannot Overstride a unit. Goblin Toss, Thunder Stomp, and Swallow are not Moves or attacks: Stuck and Toothache do not touch them; a Juggernaut's crush and a Titan's Siege Hammer ride on an `ATTACK`, so its Toothache lowers that hit, never the fixed crush. A Bunny may hop over a giant; Ricochet and Thump hit giants. |
| Saves, replays                           | New identity; the state gains `stuck`, `toothache`, and `glazedThisTurn`; earlier saves are rejected like every identity change.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## 10. The faction as a whole

### 10.1 Per-unit battle analysis

Numbers from the engine's damage formula (`calculateCombatPreviewV7`, ported
to a scratch calculator in the bead's scratch output and checked against
the pinned values of `tests/unit/ruleset-v7-candy-numbers.test.ts`: a Trooper
deals a Fighter 5 and takes 5, 8 and 4 Rushed; a Fighter deals a
Marshmallow 4 and takes 6; a Rushed Pie kills a Fighter). Full HP, open
Grass, no fortification, unless stated. "Deals / takes"; "kill" means no
strike-back. Human Fighter, Raider, Marksman 12 HP; Knight 13 HP, Attack 4;
Champion 15 HP, Attack 3.5.

**Toffee Trooper (Sticky Toffee).** The point is the fast units that hit
and run.

| Exchange                                | Numbers             | With Sticky Toffee                                                                             |
| --------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Raider attacks a Trooper                | 5 / 5 (Raider at 7) | the Raider is Stuck: no Escape now, one step next turn; a plain Trooper then kills it (7 of 7) |
| Raider with Charge on a Trooper         | 8 / 4 (Raider 8)    | Stuck the same way                                                                             |
| Wolf Rider or Sled (10 HP) on a Trooper | 5 / 5               | Stuck; the Racer or a second Trooper finishes it                                               |
| Knight attacks a Trooper                | 10, kill            | no strike-back, so no Stuck: the Knight still kills Troopers                                   |
| Trooper attacks a Knight                | 6 / 2               | the Knight (7 HP) is Stuck: it cannot ride three tiles away to safety                          |
| Goblin attacks a Trooper                | 5 / 5 (Goblin 1)    | Stuck (it can still Gang Up where it stands)                                                   |

Too strong? A Move-1 army never notices it, and it does not stop an attack,
only the walk away. Too weak? It turns the 10-HP Trooper into the answer to
the Raider screens the Human AI uses (the hand-played game: two Raiders
killed two Troopers and Escaped). Lever: Stuck only on the
Trooper's own attacks.

**Donut Racer (Glaze Trail).** No damage numbers change (Raider parity, 10
HP; without Escape it now stands where it attacked). Glaze is reach for the
slow units: a Move-1 unit that follows the trail moves two tiles, so a
Marshmallow or a Pie reaches the front a turn sooner, and a plain Trooper
keeps pace with a Rushed one without Crashing. Too strong? It never adds a
tile to the Racer itself, and the trail is at most the Racer's own path
(two tiles, three Rushed, more along Roads that already halve). Too weak?
It is the only Candy tool that moves an army without the Crash. Lever:
Glaze only for `FIGHTER` and `GUARD` roles.

**Gumball Gunner (Ricochet).**

| Shot from distance 2 | Main hit, plain / Rushed | Ricochet, plain / Rushed |
| -------------------- | -----------------------: | -----------------------: |
| Fighter              |                    5 / 8 |                    2 / 4 |
| Marksman or Knight   |                   6 / 10 |                    3 / 5 |
| Catapult or Captain  |              7 / 10 kill |                    3 / 5 |
| Guard                |                    4 / 7 |                    2 / 3 |
| Goblin (6 HP)        |            6 kill (both) |                 3 (both) |

A plain shot is a 3-Coin Marksman's; the extra 2 or 3 goes to the weakest
neighbour, which is where it finishes things (a 3-HP Raider, a Captain a
Thump left at 8). Too strong? One target, half the hit, only from 2 tiles:
a Gunner never deals more than a Rushed Marksman's hit plus half of it. Too
weak? Two Gunners behind a Pie now crack a fortified pair, not one unit.
Lever: ricochet `floor(d / 3)`.

**Marshmallow and Pie Launcher** are unchanged; their tables in
[Candy overlay section 11](RULESET_7_CANDY.md#11-per-unit-battle-analysis)
hold where tuning 1 did not move them.

**Confectioner.** A Fighter deals it 6 / 2, a Raider 6 / 2, a Marksman 6
from two tiles, and a Catapult or Knight kills it. The Re-bake copies, and
what kills them:

| Copy            | Price |  HP | A Fighter on it | Note                                     |
| --------------- | ----: | --: | --------------- | ---------------------------------------- |
| Toffee Trooper  |     1 |   5 | 5, kill         | 7 after a Top-Up: 5 / 4                  |
| Marshmallow     |     2 |   9 | 6 / 4           |                                          |
| Jawbreaker      |     3 |   8 | 6 / 4           | and the Fighter gets Toothache           |
| Pie Launcher    |     4 |   5 | 5, kill         | baked behind the line it is safe         |
| Chocolate Bunny |     5 |   7 | 7, kill         | a 7-HP Bunny still kills a Catapult (10) |

Baked next to the Confectioner, a copy stands one tile behind the line
instead of on the tile where its original died. Top-Up's real use is the
Crash: in the hand-played game five of six Candy deaths were Crashed units,
and three Crashed Troopers idled for a turn next to the enemy. A Top-Up
makes one of them a fresh attacker.

**Chocolate Bunny (Hop and Thump).**

| Bunny attacks       | Plain    | Rushed   |
| ------------------- | -------- | -------- |
| Catapult or Captain | 10, kill | 10, kill |
| Marksman or Raider  | 10 / 1   | 12, kill |
| Knight              | 10 / 1   | 13, kill |
| Fighter             | 8 / 4    | 12, kill |
| Guard               | 7 / 7    | 10 / 6   |
| Champion            | 7 / 5    | 11 / 4   |

Then Thump: 2 to every other enemy around it. **The back-line strike:** a
Bunny standing next to a Fighter screen hops over the Fighter (one step;
the landing tile is next to the Fighter, a ZOC stop, so the Move ends
there), kills a Catapult beside the landing tile (10), advances onto its
tile, and thumps a Marksman (12 → 10) and a Captain (10 → 8) beside it,
and the screen's Fighter too when it is adjacent. Walking up to the
screen is itself a ZOC stop, so the hop over a screen is a plan made a
turn ahead: the Bunny walks up one turn and hops the next. A Gunner's
ricochet or a Trooper then finishes the Captain. Next turn the Crashed
Bunny takes a Knight's 13 and a Marksman's shot and dies, 9 Coins for an
8-Coin Catapult and 4 HP of chip, with its Crumbs deep in enemy ground.
Plain, it hops in, kills the Catapult, and can hop back out the next turn.

**The T-Rex lesson.** The old Sugar Frenzy killed three soft units in one
Rushed turn (and, uncapped, eight). The Bunny now kills one and wounds the
rest by 2: its ceiling falls from 3 kills to 1 kill plus 14 HP of chip on a
fully packed ring of seven. **The Triceratops lesson.** Hop is part of the
ordinary Move, not a separate lane command, and it leads the army (Move 2,
hop) instead of trailing it. Too weak? The Knight's job, as the user put it,
is reaching and killing the pesky back line; Hop is the reach, the Gunner's
ricochet and Thump do the rest together. Lever: Thump 3.

**Jawbreaker (Toothache).**

| Exchange                      | Numbers             | Then                                                               |
| ----------------------------- | ------------------- | ------------------------------------------------------------------ |
| Fighter attacks a Jawbreaker  | 4 / 6 (Fighter 6)   | Toothache: its next attack on a fresh Trooper deals 1, not 3       |
| Champion attacks a Jawbreaker | 9 / 5 (Champion 10) | its next attack on a fresh Jawbreaker deals 4 / 7 instead of 8 / 6 |
| Knight attacks a Jawbreaker   | 11 / 4 (Knight 9)   | its next attack is at Attack 3 (a Gunner still dies: 8, kill)      |
| Guard attacks a Jawbreaker    | 3 / 7               | (a Guard should not attack it anyway)                              |
| Jawbreaker attacks a Fighter  | 8 / 4               | Rushed: 12, kill                                                   |

Toothache punishes the melee wave that hits the Candy anvil, for one attack
only, and does nothing to ranged fire, which is the Jawbreaker's counter.
Too strong? Together with its 2.5-Defense strike-back it makes melee into a
Jawbreaker a bad trade, by design; the answer is a Catapult or a Marksman.
Lever: Toothache only while the Jawbreaker survives.

### 10.2 Tuning bounds and named levers

The engine bead implements the contract values; the Candy step two bead
(`pulp_wars-jdb.13` in [section 17](#17-implementation-beads)) may move
these within the bounds after hand play, changing this document, the code,
and the tests together:

| Parameter                     | Contract value   | Bounds                    |
| ----------------------------- | ---------------- | ------------------------- |
| Stuck: steps allowed          | 1                | 1 (fixed)                 |
| Glaze step cost (half-points) | 1                | 1 (fixed)                 |
| Ricochet damage               | `floor(d / 2)`   | `floor(d / 3)` to `d / 2` |
| Thump damage                  | 2                | 1–3                       |
| Toothache                     | −1 Attack, once  | −0.5 to −1                |
| Re-bake reach                 | 2                | 1–3                       |
| Re-bake over capacity         | 1                | 0–1                       |
| Re-bake price; HP             | ⌈cost/2⌉; ⌈HP/2⌉ | price +0–1; HP ⅓–½        |
| Top-Up heal                   | 2                | 1–3                       |
| Toffee Trooper HP             | 10               | 10–12                     |

**Named levers** (root approval): Stuck only from the Trooper's own attacks;
Glaze only for `FIGHTER` and `GUARD`; Toothache only while the Jawbreaker
survives; Re-bake needs a free slot in **any** own city instead of over
capacity; Top-Up cannot end a Crash of a unit that Rushed this round.

### 10.3 Verdict

- **Early (rounds 1–10):** Troopers stick Raiders and Wolf Riders, so the
  early raid screens that beat the old Candy lose units; the Racer glazes
  the way for the second wave. Rush is unchanged.
- **Mid (10–20):** the Confectioner pays for itself: a 1-Coin Trooper or a
  2-Coin Marshmallow most turns of a fight, a Top-Up on the turns without
  Crumbs. Gunners ricochet behind a Pie's Splat.
- **Late:** the Jawbreaker anchors (Rock Hard, Toothache), the Bunny hops
  the screen and thumps the back line.
- **Not crazy strong:** every new effect is small per use (one step, 2
  damage, −1 once, half a hit, half a unit), none stops an attack or a
  retaliation (only Splat does, as before), and every one of them is
  answered by ranged fire or by killing the Confectioner.
- **Not crazy weak:** the three complaints are answered: the Trooper has a
  job, no unit borrows a Human ability, and the Bake fires in ordinary play
  ([section 11.2](#112-crumbs-before-and-after)).

## 11. Hand-played turns and the Crumbs count

### 11.1 The game, replayed by hand under the redesign

The game of [section 2.2](#22-the-crumbs-pipeline-and-why-it-fails), rounds
12 to 14, re-read move by move with the final rules (the same Human moves
where they still make sense; numbers from the formula):

- **Round 12, Candy.** As played: a Rushed Trooper kills the Raider (8 HP)
  at 2,2 and advances. Unchanged.
- **Round 13, Human.** As played, a Fighter hits the Crashed Trooper 5 / 5
  and is left at 7; **it is now Stuck** (the Trooper struck back). A
  second Fighter kills the Trooper and advances onto its Crumbs at 2,2.
- **Round 13, Candy.** As played, Rushed Troopers kill both Fighters (the
  Stuck one could not have stepped back anyway). **New:** the Confectioner
  at 2,4 scoops the Crumbs at 2,2 (distance 2) from under the Fighter and
  bakes a 5-HP Trooper at 1,5, behind the line, for 1 Coin. (Today the
  home city had a free slot that turn; the Fighter on the tile was the
  bar. In round 14 the home was full and needed the Monument.)
- **Round 14, Human.** As played, a Raider hits a Crashed Trooper 5 / 5;
  **it is now Stuck** and cannot Escape. A Fighter hits another 5 / 5 and
  is Stuck.
- **Round 14, Candy.** As played, three Troopers are Crashed at 5 to 6 HP.
  **New:** the Confectioner at 1,3 Tops Up the Trooper at 1,2 (5 → 7 HP,
  no longer Crashed). It has not moved, so it Rushes and attacks the Stuck
  Raider next to it (7 of 12 HP after the Trooper's strike-back): a Rushed
  7-HP Trooper deals it 7, a kill (plain it would deal 6 and take 1). In the game
  as played the Raider stayed free, Escaped after its next attack, and
  killed the re-baked copy.

The redesign did not turn the lost fight into a won one (the Candy were
outnumbered 9 units to 6 by round 15), but it changed the two things that
felt wrong while playing: the Raiders' free hit-and-run against the Trooper
line, and the Crumbs that sat under a Fighter's feet while the
Confectioner stood beside them unable to do anything.

### 11.2 Crumbs, before and after

Per death of the hand-played game, whether a Re-bake was possible on the
next Candy turn:

| #   | Today                                      | Redesign                                                                   |
| --- | ------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | no (village: no Crumbs; no Confectioner)   | no (Crumbs on the village now, but no Confectioner until round 8)          |
| 2   | no (Fighter, then own Trooper on the tile) | **yes**, round 13 (distance 2, scooped from under the Fighter)             |
| 3   | — (eaten)                                  | — (eaten: unchanged; in the redesign this copy would not have stood there) |
| 4   | no (Fighter, then own Trooper on the tile) | **yes**, round 15 (distance 1)                                             |
| 5   | no (Fighter on the tile)                   | **yes**, round 16 (distance 1)                                             |
| 6   | no (Fighter on the tile)                   | **yes**, round 17 (distance 2, the Crumbs' second turn; one Bake a turn)   |

**Today: 0 of 6 by ordinary means** (one with a Monument to open a slot).
**Redesign: 4 of 6**, one Re-bake on each Candy turn of the fight from
round 13 on. The two misses are the ones the redesign means to keep: no
Confectioner yet, and Crumbs the enemy chose to eat.

| Crumbs frequency                               | Today (`7r59`)                                                           | Redesign                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Hand-played game: deaths re-bakeable next turn | 0 of 6 (1 via Monument)                                                  | 4 of 6 (one a turn from round 13)                           |
| Hand-played game: deaths that leave Crumbs     | 5 of 6 (not the village)                                                 | 6 of 6                                                      |
| Six headless matches: piles re-baked           | 2 of 77 (about 3 %)                                                      | not re-run (the rules are not built); step two measures it  |
| Blockers that made piles stale                 | killer on the tile, full home, out of reach, Coins                       | out of reach, the Confectioner's one action, Coins          |
| Confectioner turns with a Candy action to take | Re-bake only beside a free pile; otherwise Frosting (the Captain's heal) | every turn (Re-bake, else Top-Up on a Crashed or hurt unit) |

The same reasoning on the usage count: of the 77 Crumbs of the six headless
matches, 23 were eaten (unchanged) and 47 went stale. The three conditions
that made them stale in the hand-played game (the killer on the tile, the
full home, the settlement site) are gone; what remains is a Confectioner
within 3 tiles before its Move (2 after it) and its one action a turn. A
Candy death during the Candy's own turn (a Trooper killed by the strike-back
it attacked into) can now be baked **in the same turn** if the Confectioner
acts after the attack, before any enemy can eat the Crumbs. The engine
bead's telemetry adds the reason a pile went stale
([section 15](#15-test-plan)), so step two can check the fix in its own
hand play.

## 12. Engine impact (one identity bump)

All of it is one engine change, `pulp_wars-jdb.12`, at the next free
identity (`7rNN`), serial with the other identity work named in the
header. Matches without a Candy seat keep every pinned decision; their
states differ only in the identity and the three new empty lists.

- **Registry** (`src/engine/rules/ruleset-v7.ts`):
  - `UnitRoleAbilityV7` gains `STICKY`, `GLAZE_TRAIL`, `RICOCHET`, `HOP`,
    `THUMP`, `TOOTHACHE`, and `TOP_UP`.
  - `CANDY_ROLE_RULES_V7`: the `FIGHTER` gains `STICKY`, the `RAIDER`
    `GLAZE_TRAIL`, the `MARKSMAN` `RICOCHET`, the `KNIGHT` `HOP` and
    `THUMP`, the `SWORDSMAN` `TOOTHACHE`; the `CAPTAIN`'s abilities become
    `ATTACK`, `REBAKE`, `TOP_UP`, `SUGAR_RUSH` (`TEND_WOUNDED` dropped).
    The comments that describe the Rush perks go.
  - Role mechanics: `rushPerk` is removed from the mechanics type and every
    table (it is `null` everywhere else); new fields `sticky`, `glazeTrail`,
    `ricochet`, `hop`, `thumpDamage`, `toothache` (false or 0 by default,
    off in `NEUTRAL_MONSTER_ROLE_MECHANICS_V7`), set only in
    `CANDY_ROLE_MECHANICS_V7`.
  - Constants: `SUGAR_FRENZY_MAX_CONTINUATIONS_V7` removed;
    `TOOTHACHE_ATTACK2_V7` 2, `THUMP_DAMAGE_V7` 2, `RICOCHET_DIVISOR_V7` 2,
    `REBAKE_REACH_V7` 2, `REBAKE_OVER_CAPACITY_V7` 1, `TOP_UP_HEAL_V7` 2,
    `STUCK_MAX_STEPS_V7` 1, `GLAZE_STEP_COST_V7` 1. `rebakePriceV7` and
    `rebakeHpV7` are unchanged (the Jawbreaker already resolves to 3 and 8).
- **State** (`types.ts`, `state-schema.ts`, hashing, saves, replays):
  `stuck` and `toothache` (`{ unitId, endsLeft }[]`, sorted by unit ID,
  `endsLeft` 1 or 2) and `glazedThisTurn` (`CoordV7[]`, sorted by
  `(y, x)`, land tiles only). Crumbs parsing accepts a settlement site.
  Every unit removal (death, Disband, burrow, Swallow, elimination) drops
  the unit's entries, as for `sugarRush`.
- **Combat** (`combat.ts`, `candy.ts`): Toothache in the Attack value after
  every other modifier and its consumption; Stuck after the exchange's
  deaths (target or struck-back attacker); Toothache given after a
  distance-1 attack on a Jawbreaker; Ricochet and Thump after the Bounce,
  with the death causes `RICOCHET` and `THUMP` added wherever `SPLASH` is
  listed (Graves, Crumbs, death blasts, risings, kill credit, Plunder, the
  Slayer count). `overrunKindV7` loses its Candy branch, and
  `attackGrantsEscapeV7` and `overrunMayContinueV7` lose the Rush-perk
  reads (no Candy unit has Escape or Overrun).
- **Movement** (`movement.ts`): the Stuck one-step cap on every `MOVE`
  (an Escape Move included); the Glaze step cost for the active seat's
  land-form units; the Bunny hop as a path edge of length 2 with its
  jumped-tile and landing rules; the Racer's `TILES_GLAZED` after its Move
  (`candy-reducer.ts`).
- **Commands** (`commands.ts`, `reducer.ts`, `candy-reducer.ts`):
  `REBAKE` gains `from` (the schema rejects a command without it under the
  new identity); new `TOP_UP { kind, unitId, targetUnitId }` with the
  legality of [section 8.2](#82-top-up); `TOP_UP` joins every list of
  primary actions (the sluggish table, the Crash list, a pending city
  reward blocking it, "no Move after a primary action"); `TEND_WOUNDED` is
  never offered or accepted for a Candy unit (`UNIT_ROLE_INVALID`). Re-bake
  capacity reads `REBAKE_OVER_CAPACITY_V7` through the reward-unit rule of
  [current rules section 4.4](RULESET_7_CURRENT.md#44-unit-capacity).
- **End Turn**: the Stuck and Toothache countdown for the active seat's
  units after the Crumbs countdown; `glazedThisTurn` emptied with
  `splattedThisTurn` and `tossedThisTurn`.
- **Events** (`event-schema.ts`, `event-projection.ts`): `UNIT_STUCK`,
  `TOOTHACHE_GIVEN`, `TILES_GLAZED`, `RICOCHETED`, `THUMPED`,
  `UNIT_TOPPED_UP`; `UNIT_REBAKED` gains `from`. Projection: each is shown
  to a viewer who sees the tile or unit it names, like `UNITS_CHILLED`;
  `TILES_GLAZED` lists only tiles the viewer sees.
- **Queries and previews** (`query.ts`, `view.ts`, `unit-stats.ts`):
  combat preview fields `stuckApplied`, `toothacheApplied`,
  `toothacheAttack`, `ricochet`, `thump`, `thumpUncertain`;
  `previewRebakeV7` returns `{ from, at, role, price, hp }` options (and
  absorbs the "why not" reason of `pulp_wars-jdb.9`); a new
  `previewTopUpV7`; the movement search offers hops and reads Glaze and
  Stuck; `queryThreatenedTilesV7` counts hops; public unit stats gain
  `stuck`, `toothache`, and the ability flags; the view carries
  `glazedThisTurn` for the active seat's turn. The Rushed Racer's
  `escapeAvailable` and the Bunny's `overrunAdvance` readings for Candy
  units go.
- **Text harness** (`scripts/play-text-v7.ts`): prints and offers `TOP_UP`,
  `REBAKE from>at`, hops in Move options, the new preview fields and
  statuses. The `LAB_CANDY_MID_V7` mission (`src/engine/v7/missions/`) for
  hand play is step two's (`pulp_wars-jdb.13`).
- **Telemetry** (`src/headless/candy-telemetry-v7.ts`): the counters of
  [section 15](#15-test-plan), including stale Crumbs by reason.
- **Normal AI, minimum in the engine bead** (`src/ai/v7-candy.ts`): legal
  only ([section 13](#13-normal-ai-notes)).
- **Presentation kept compiling** (`src/render/candy-presentation-v7.ts`,
  `src/render/unit-glossary-v7.ts`): the engine bead removes the Rush-perk
  and Frosting readings so the build passes; the new markers and buttons are
  `pulp_wars-jdb.14`.
- **Docs:** [current rules section 23](RULESET_7_CURRENT.md#23-candy-faction-rules)
  (23.1, 23.2, 23.3, 23.7 to 23.10), section 11's Candy rows, the revision
  history, the [Candy overlay](RULESET_7_CANDY.md)'s status line, and this
  document's status.

Tests that pin today's behaviour and must change with it:
`tests/unit/ruleset-v7-candy-rush.test.ts` (perks),
`ruleset-v7-candy-crumbs.test.ts` (Re-bake reach, placement, capacity,
settlement sites), `ruleset-v7-candy-faction.test.ts`,
`ruleset-v7-candy-identity.test.ts`, `ruleset-v7-candy-persistence.test.ts`,
`ruleset-v7-candy-interactions.test.ts`, `ruleset-v7-candy-ai.test.ts`,
`ruleset-v7-candy-headless.test.ts`, `candy-presentation-v7.test.ts`, and
`tests/integration/ruleset7-candy-dom.test.ts` (perk chips).

## 13. Normal AI notes

(Step two is built, without matches or hand play:
[the Candy army seat](../architecture/NORMAL_AI.md#the-candy-army-seat-pulp_wars-jdb13).
Break Off was built as two Troopers with no slot rule, so its order against
a Re-bake is the reverse of the one below.)

The Candy keep the older policy (`src/ai/v7-candy.ts`) until step two; the
engine bead only keeps it legal. Step two (`pulp_wars-jdb.13`) brings the
Candy seat onto the army play (`ARMY_PLAY_FACTIONS_V7`) like the Dwarf pass
(`pulp_wars-w49.28`) and the
[Ice Folk pass](RULESET_7_TUNING_ICE_FOLK.md#5-the-ice-folk-normal-ai).

**The engine bead (legality only):** the older policy must never send
`TEND_WOUNDED` from a Confectioner, must read `previewRebakeV7`'s new
`{ from, at }` options (take the most expensive role, then the placement
tile with the lowest visible threat), may ignore `TOP_UP`, Glaze, and Hop
(they are legal to skip), and must not count on Escape or Sugar Frenzy.
The existing `rush`, `rebake`, `pieFirst`, `sugarToss`, and the
against-the-Candy groups keep their switches.

**Step two, as the Candy:**

- **Re-bake first.** A Confectioner with an offered `REBAKE` bakes before
  any other action of its turn, the most expensive role first; it moves to a
  tile within 2 of the most valuable pile when none is in reach, avoiding
  visible lethal reach. When an own attacker dies to a strike-back, the
  Confectioner acts after that attack and bakes it back the same turn.
- **Top-Up** a Crashed unit that has an offered kill next to it, else the
  Crashed unit in the most danger; never instead of an offered Re-bake.
- **The Gingerbread Giant:** Break Off is the giants AI bead's
  (`pulp_wars-w49.31`); step two only orders it before a Re-bake into the
  same home city ([section 7.9](#79-gingerbread-giant-break-off-from-the-giants-spec))
  and may Top-Up a Crashed Giant that has a Break Off or a kill waiting.
- **Order the wave:** the Racer moves first (its Glaze), then the slow units
  along it; Pies before the melee (as now); Gunners pick shots whose
  ricochet kills; the Bunny looks for a hop that reaches a `SIEGE`,
  `SUPPORT`, or `RANGED` target and counts Thump kills in its score.
- **Troopers screen** against visible Raider-role and Knight-role units:
  Stuck units are free kills next turn.
- **The Jawbreaker** stands in the front row facing melee, never a ranged
  battery.

**Against the Candy (every seat in a match with a Candy seat):** prefer
ranged attacks on a Toffee Trooper, Jawbreaker, or Marshmallow when the
scores tie; a melee attack whose preview says `stuckApplied` or
`toothacheApplied` loses a little score; a Stuck unit does not plan routes
it cannot walk; kill the Confectioner first among support units (as now);
eat Crumbs within reach of a Confectioner when the Move is otherwise no
worse (as now).

Step two follows the user's rule for AI changes: hand-played games first,
a lab (`LAB_CANDY_MID`) for the hand player, a modest head-to-head only
where a heuristic is in doubt, no AI-vs-AI win-rate tuning.

## 14. Art, UI, and effects

Every surface reads the public view, the offered commands, and the public
previews; no text names a tile.

| Need                    | What                                                                                                                                                             | Art or code                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Stuck marker            | toffee strands round the feet; chip "Stuck: one step"                                                                                                            | PixelLab marker (one sprite) or code-drawn first          |
| Toothache marker        | a cracked tooth with a sparkle; chip "Toothache: next attack −1"                                                                                                 | PixelLab marker or code-drawn first                       |
| Glazed tiles            | a pink frosting streak on each tile, the active seat's turn only                                                                                                 | code-drawn overlay                                        |
| Hop                     | an arc over the jumped tile in the Move preview; a hop animation                                                                                                 | code-drawn arc; sprite animation is a hop offset          |
| Thump                   | a cocoa-dust shock ring and "−2" on each neighbour; preview lists them                                                                                           | effect cue (attack-effects registry)                      |
| Ricochet                | the gumball bounces from the target to the neighbour; preview "Ricochet −n"                                                                                      | extends `GUMBALL_SHOT`                                    |
| Re-bake                 | the pile highlighted within 2 tiles, then the free tiles around the Confectioner with a ghost, price, and HP; crumbs fly to the oven puff                        | existing whisk and oven puff, plus a crumb trail cue      |
| Top-Up                  | replaces the Frosting button: a sugar-shaker icon; target ring with "+n", "Crash ends", "Cures"                                                                  | new command icon (PixelLab) replacing the piping-bag icon |
| Removed                 | the Rushed Donut "may move again" and the Bunny's Sugar Frenzy pips and chips; Frosting texts                                                                    | code                                                      |
| Help, one sentence each | Sticky Toffee, Glaze Trail, Ricochet, Re-bake (new reach), Top-Up, Bunny Hop, Thump, Toothache                                                                   | text                                                      |
| Log lines               | "{unit} is stuck in toffee", "{unit} has a toothache", "{unit} ricocheted onto {unit} (−n)", "{unit} thumped n units", "{owner} Confectioner topped up a {unit}" | text                                                      |

Art follows the [Candy art fragment](../art/factions/CANDY.md) and the
PixelLab workflow (checked-in scripts, recorded recipes, a small sample
reviewed at native and enlarged size before any batch); the review command
is `npm run art:chibi-candy-direction-review`. The code-drawn cues (Thump,
Ricochet, the Glaze streak, the hop arc) go in
`src/render/canvas/attack-effects-v7.ts` and the
[attack-effects record](../art/ATTACK_EFFECTS.md), each with a
reduced-motion hold frame and a sound event, reviewed with
`npm run art:attack-effects-review`. The unit sprites do not change. The
Gingerbread Giant's Break Off cue ("a gingerbread chunk breaks off and
rolls to the tile") and button are the giants UI bead's
(`pulp_wars-w49.32`), not this one's.

## 15. Test plan

New and changed tests live in `tests/unit/ruleset-v7-candy-*.test.ts`.

- **Identity and shapes:** the new identity, the previous one rejected;
  `stuck`, `toothache`, `glazedThisTurn` parsed, sorted, hashed, saved, and
  replayed; parsing rejects a status on an Egg, a burrowed unit, the Spider,
  or a unit not on the board, `endsLeft` outside 1–2, a Glazed water tile;
  `rushPerk` gone; `REBAKE` with `from`; `TOP_UP` at its command position;
  the new events at their positions; parity of matches without a Candy seat
  with the previous identity apart from identity and neutral fields.
- **Sticky Toffee:** target and strike-back cases, a Shield-only hit, the
  dead target (no entry), ranged attackers never Stuck, `endsLeft` 1 and 2,
  the countdown at the owner's End Turns across Mind Control, a Stuck Raider
  (one step, no Escape, no Charge), a Stuck Triceratops (run-up 1), a slide
  after the one step, a Stuck Bunny hopping.
- **Glaze:** tiles glazed (start and passed, not the end), the cost of a
  step onto Glaze for own and controlled units, not for other seats, every
  stop still applying, emptied at End Turn, a Rushed Racer along a Road.
- **Ricochet:** distance 2 only, `d` below 2, the lowest-HP choice and the
  ID tie-break, visibility, exclusions (Egg, Spider, burrowed, submerged),
  Armoured, Plated, Shield, a kill with credit, Crumbs in a mirror, preview
  equal to resolution.
- **Re-bake:** each legality row, scooping from under a hostile unit, an
  Egg, a mound, an own unit; reach 2 and not 3; placement tile rules;
  capacity +1 and not +2; Crumbs on a village and a city center; same-turn
  bake after a strike-back death; price and HP of every role.
- **Top-Up:** each legality row; Crash ended and a Rush afterwards; heal,
  cures (Plague, Bitten, Chill, Stuck, Toothache); `TEND_WOUNDED` never
  offered to a Candy unit.
- **Bunny:** hop geometry (8 directions), jumped tile conditions (water,
  ice, unexplored refused; units, Mountain, Rift allowed), one hop per
  path, the landing stops, a hidden unit on the landing tile interrupting
  on the take-off tile, movement query and threatened tiles; Thump on every
  attack, never on retaliation, after the advance and a Bounce, exclusions,
  deaths with blasts; no Overrun when Rushed.
- **Jawbreaker:** Toothache to a surviving distance-1 attacker (Jawbreaker
  alive or dead), none from distance 2, used up by the next attack, the
  minimum Attack 0.5, never on retaliation; Rock Hard unchanged.
- **Racer:** no Escape when Rushed.
- **With the giant signatures** (when `pulp_wars-w49.30` has landed; else
  in that bead): a broken-off Trooper Sticks what it strikes back at and
  leaves re-bakeable Crumbs; Top-Up ends a Crashed Giant's Crash and it
  may Break Off the same turn; Break Off then Re-bake into one home city
  with one free slot (both legal) and the other order (Break Off refused);
  a swallowed unit's Stuck and Toothache entries removed and no Crumbs on
  `DIGESTED`; Crumbs on `CRUSH`, `STOMP`, and `TRAMPLE` deaths; a Stuck
  Colossus refused an Overstride path.
- **Previews and queries:** every new preview field equals the resolution;
  offered commands equal accepted ones; public stats carry the new flags.
- **AI legality (engine bead):** headless Normal matches with a Candy seat
  against each faction finish without policy errors; pinned decisions of
  matches without a Candy seat unchanged.
- **Telemetry:** the `candy` metrics gain Stuck, Toothache, Glaze steps
  used, ricochet and Thump damage and kills, hops, Top-Ups (and Crashes
  ended), Re-bakes by distance, and stale Crumbs by reason (no Confectioner
  within reach, Confectioner busy, Coins, capacity).
- **Numbers:** `tests/unit/ruleset-v7-candy-numbers.test.ts` pins the tables
  of [section 10.1](#101-per-unit-battle-analysis).

## 16. Acceptance criteria

1. Every Candy land unit has an ability that no other faction has and that
   is not a Human ability behind the Rush: Sticky Toffee, Glaze Trail,
   Ricochet (and Sugar Toss), Bounce, Re-bake and Top-Up, Splat, Hop and
   Thump, Toothache (and Rock Hard), and the Gingerbread Giant's Break Off
   (the giants spec, built by `pulp_wars-w49.30`). No Candy unit has
   Escape, Overrun, Push, or Tend Wounded.
2. The Confectioner bakes in ordinary play: in the step two hand-played
   games a Re-bake follows most Candy deaths that happen within 3 tiles of a
   living Confectioner, and the telemetry's stale-Crumbs reasons show no
   systematic blocker.
3. Every rule above is exact, previewable, and tested as
   [section 15](#15-test-plan) lists; matches without a Candy seat are
   unchanged apart from identity.
4. The faction meets the user's bar in step two's hand play: neither crazy
   strong nor crazy weak, every branch useful.

## 17. Implementation beads

| Bead (proposed id) | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Validation profile                                                                       | Depends on                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pulp_wars-jdb.12` | **Candy redesign, engine** (one identity bump): [section 12](#12-engine-impact-one-identity-bump): Stuck, Toothache, Glaze, Ricochet, Hop, Thump, Re-bake with reach, scoop, placement, and one over capacity, Top-Up, Crumbs on settlement sites, no Rush perks; shapes, events, previews, queries, telemetry, tests; the older Candy AI kept legal; the current rules and the Candy overlay updated; absorbs the Re-bake "why not" query of `pulp_wars-jdb.9`                | `ai/map/persistence`, with `npm run smoke:browser` (a Candy unit's commands change)      | the root's rulings on [section 18](#18-open-questions-with-defaults); identity serial after `w49.28`, `zypi`, `w49.30` |
| `pulp_wars-jdb.13` | **Candy step two, AI and hand-played balance:** the Candy seat on the army-play AI with the notes of [section 13](#13-normal-ai-notes); `LAB_CANDY_MID_V7`; hand-played text games (as the Humans against the Candy AI, and as the Candy against two other factions, Dry Land 14 seeds 9 and 19); the Crumbs count of [section 11.2](#112-crumbs-before-and-after) re-measured; tuning inside [section 10.2](#102-tuning-bounds-and-named-levers); `RULESET_7_TUNING_CANDY.md` | `ai/map/persistence`; `npm run smoke:browser` if the AI turn changes in the browser      | `jdb.12`; the Dwarf step two (`w49.28`) for the shared army-play code; the giants AI (`w49.31`) for Break Off          |
| `pulp_wars-jdb.14` | **Candy redesign, UI and art:** [section 14](#14-art-ui-and-effects): markers (Stuck, Toothache), Glaze overlay, hop arc, Thump and Ricochet cues, the two-step Re-bake pick, the Top-Up button and icon, Help, glossary, and log texts, removal of the perk chips and Frosting texts; PixelLab icons and markers under the art fragment                                                                                                                                       | `ui/presentation` with `npm run smoke:browser`; the art part also `npm run art:validate` | `jdb.12` (may run beside `jdb.13`)                                                                                     |

Validation blocks for the root to put in the beads:

```text
pulp_wars-jdb.12
Validation profile: ai/map/persistence
Worker focused checks: npm run typecheck; npm run lint; npm run format:check;
  npm test -- tests/unit/ruleset-v7-candy-*.test.ts
  tests/unit/candy-presentation-v7.test.ts tests/unit/candy-ui-ai.test.ts
  tests/integration/ruleset7-candy-dom.test.ts, every source-audit test, and
  the text-play test
Conditional final gates: npm run check; npm run validate:ruleset6-release
  (identity bump); npm run smoke:browser (Candy commands in the browser)

pulp_wars-jdb.13
Validation profile: ai/map/persistence
Worker focused checks: npm run typecheck; npm run lint;
  npm test -- tests/unit/ruleset-v7-candy-ai.test.ts
  tests/unit/ruleset-v7-candy-headless.test.ts and the army-play AI tests;
  the hand play with npm run play:text
Conditional final gates: npm run check; npm run validate:ruleset6-release;
  npm run smoke:browser if the AI turn changes in the browser

pulp_wars-jdb.14
Validation profile: ui/presentation (art part: asset-only gates kept)
Worker focused checks: npm run typecheck; npm run lint; npm run format:check;
  npm test -- tests/unit/candy-presentation-v7.test.ts
  tests/unit/candy-board-render-v7.test.ts
  tests/unit/chibi-candy-direction-assets.test.ts
  tests/unit/attack-effects-render-v7.test.ts
  tests/integration/ruleset7-candy-dom.test.ts
  tests/integration/attack-effects-canvas.test.ts;
  npm run art:chibi-candy-direction-review and
  npm run art:attack-effects-review (evidence)
Conditional final gates: the ui/presentation set; npm run art:validate;
  npm run smoke:browser (user-visible Canvas and input change)
```

`pulp_wars-jdb.9` (Candy polish) overlaps only in its public Re-bake "why
not" query, which `jdb.12` absorbs because it rewrites Re-bake; the rest of
`jdb.9` (portrait, Move breakdown, Classic badge) stands.

## 18. Open questions, with defaults

The root decides; the default is what this document specifies.

1. **Keep Sugar Toss** on the Gunner beside Ricochet? Default **yes** (a
   ranged heal no one else has, built, used by the AI). Alternative: drop it
   and give the Gunner Ricochet alone.
2. **Over capacity by one, or a free slot in any own city?** Default **one
   over capacity at home** (the reward-unit rule). Alternative: any own
   city's free slot (no over-capacity units at all).
3. **Re-bake reach 2.** Default 2. Alternative: 3 (more reliable, more
   Re-bakes from behind the line).
4. **Top-Up may un-Crash a unit that then Rushes again** (one unit Rushing
   every turn while a Confectioner spends its action on it). Default **yes**
   (bounded to one unit per Confectioner, and it costs the Bake). Alternative:
   a Topped-Up unit cannot Rush that turn (needs a `toppedUpThisTurn` list).
5. **Toothache when the Jawbreaker dies.** Default **yes** (it bit down
   anyway). Alternative: only while it survives.
6. **Thump and Ricochet on the Giant Spider.** Default **never** (no status
   or side effect on the Monster, as for Splat). Alternative: they hit it
   like any fixed damage.
7. **Thump and Ricochet on Eggs.** Default **never** (an Egg is not a unit
   for these). Alternative: Eggs take them like units.
8. **Frosting removed.** Default **yes** (it is the Captain's Tend Wounded).
   Alternative: keep Frosting and add Top-Up as a third action.
9. **The Gingerbread Giant.** Default: the giants spec's Break Off, with
   Bounce kept and Push lost, exactly as written there; this document adds
   only the meeting rules of
   [section 7.9](#79-gingerbread-giant-break-off-from-the-giants-spec).
   Alternative: none proposed here (a change belongs to the giants spec).
10. **Name of the command.** Default: keep `REBAKE` and "Re-bake" (the art,
    icons, and texts exist). Alternative: "Bake".
11. **A bake with no Crumbs.** Default **no**: the Confectioner bakes only
    from Crumbs and Tops Up otherwise ([critique item 15](#4-critique)).
    Alternative: "Fresh Batch", once per Confectioner every three turns, a
    Toffee Trooper at 5 HP for 2 Coins next to it, into a free home slot
    only (no over-capacity); it needs a cooldown list and AI work.
12. **Order against the giants engine.** Default: `jdb.12` takes its
    identity after `w49.30`, so its tests cover the broken-off Trooper and
    the giants' death causes at once. Alternative: `jdb.12` first, and
    `w49.30` adds the [section 15](#15-test-plan) giant cases.
13. **Re-bake's two-capacity reading** ([critique item 16](#4-critique)).
    Default: Re-bake one over capacity, Break Off only into a free slot.
    Alternative: both one over (more Troopers) or both a free slot (Re-bake
    then fails in a full home, today's main blocker).
