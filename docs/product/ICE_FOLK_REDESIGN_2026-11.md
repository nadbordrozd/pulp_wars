# Ice Folk redesign: one freeze, a real naval branch (2026-11)

> **Status** (2026-11-08, `pulp_wars-fofr`). A design proposal, being
> built in the beads of [section 6](#6-implementation-plan), one ruleset
> revision each; the rules in force are
> [RULESET_7_CURRENT.md](RULESET_7_CURRENT.md) section 21.
>
> - **Bead 1 is done** in `pulp-wars-poc-7r133` (`pulp_wars-xv0t`): the one
>   Freeze rule, stored Snow, docks never frozen, the Witch's Cold Snap
>   ring, the Frost Giant's Cold Wake; `FREEZE`, `FROST_BOLT`,
>   `THROW_BOLAS` (the Sled has Escape and 12 HP), the Cold Aura, the
>   shards, and the Blizzard's Snow are gone.
> - **Bead 2 is done** in `pulp-wars-poc-7r134` (`pulp_wars-3qtp`): the
>   Snow Golem of 3.7 (9 Coins, Attack 3, Defense 1, Move 1, range 2–3, no
>   attack after moving, the Snowball; Boulders and Planted gone) and the
>   Mammoth of 3.8 (Attack 3, 8 Coins, Sweep at formula damage that can
>   Shatter).
> - **Bead 3 is done** in `pulp-wars-poc-7r135` (`pulp_wars-ecnj`): skating
>   is plain movement (3.6). Glide covers Snow and ice; Skate, Runners, the
>   Sled's glide through zones of control, `glideDirection`, the skate
>   trail, its arrows and the "Skate:" and "Runners" labels are gone.
> - **The stat pass is done** in `pulp-wars-poc-7r136` (`pulp_wars-px48`,
>   [section 7](#7-stat-pass-against-the-human-roster-7r136)): every Ice
>   Folk unit against the Human unit of its role. Only the Sled was the
>   Raider's equal on every number (with Glide for Prowl); it has 11 HP
>   (12 before). Every other unit already gave way somewhere and is
>   unchanged. The pass took `7r136`, so beads 4 and 5 below move to
>   `7r137` and `7r138`. Beads 4 to 6 are not built.
> - **Decisions taken in bead 3:** (1) **Glide and a Road:** a step that
>   leaves a usable Road node and also Glides costs one half-point, never
>   less (the two never add up; a Road is never on ice, so they meet only
>   on Snow). (2) **Zones of control:** entering a hostile zone of control
>   ends a Move on ice as anywhere; a zone first seen during the Move
>   interrupts it there (`ZOC`). (3) **The Glide marker on Snow went
>   too:** with one rule for Snow and ice, the pale Glide tiles and their
>   "Glide: Snow to Snow" legend of `pulp_wars-1wy.5` would have marked
>   Moves on ice; every Move mark is now a plain one (only a dive keeps its
>   mark). (4) The Normal AI's city-threat estimate, which leaves Glide out
>   (`pulp_wars-7g3.4`), now leaves out ice as well as Snow; its unit
>   threat estimate uses the engine's step cost. (5) `unitSkatesV7` is
>   `unitIsIceFolkGroundV7` (it now only gates the dive); the public stats
>   `iceFolk.skates` and `iceFolk.runners` are gone. (6) **The dive:** in a
>   radius-1 territory Glide now walks a unit between any two Fishing Holes
>   over the capital's Snow, so the movement query offers the walk and a
>   dive only to a hole no walk reaches (bead 4 moves the dive to Under the
>   Ice). No command kind, event kind or ordinal changed.
> - **Decisions taken in bead 2:** (1) The Golem keeps the numbers of 3.7,
>   so it is not better than the Catapult on every axis: it costs one Coin
>   more (9 against 8) for Defense 1 (0.5), the Snowball, Mountain-born and
>   Glide, with the same Attack 3, range 2–3, Move 1 and no attack after
>   moving (the across-the-roster comparison with the Human units is the
>   later bead `pulp_wars-px48`). (2) A Sweep flank hit is the defender
>   side of the attack's own preview on that unit (its Attack against that
>   unit, the unit's Defense, fortification and cover, Armoured, Plated and
>   Shield; no retaliation or other answer); a flank unit it shatters dies
>   with cause `SHATTER` (no Grave, no blast), and its `splash` entry
>   carries `shatters: true`. (3) The preview flag is `snowball: boolean`
>   (the attack is a Snowball); the freeze reads the board after the deaths,
>   so a sunk ship's open water becomes ice (with Rime) and a killed unit's
>   neutral land Snow. (4) The Golem's projectile is the boulder cue
>   recoloured as a snowball (attack cue `SNOWBALL`; no new art). (5) The
>   Ice Folk Sawmilling is shown as "Snow Golems" (Boulders, the retired
>   ability, before), like Frost Wyrms and Mammoths. (6) The Normal AI
>   plays the Golem as siege (the Catapult's class), values a Snowball that
>   leaves its target Frozen like a Frost Breath, and a flank Shatter like a
>   Shatter kill. (7) The worked example of 3.7 "a Guard takes 7 (10 left)"
>   holds for a Guard on Field Defense; in the open a Human Guard has
>   Defense 1 against a shot (tuning 5) and takes 10.
> - **Design change during bead 1** (the user, 2026-11-08: "walrus
>   freezing units that hit it is fine. we can have the special giant unit
>   freeze everything around it whenever it moves. it's a powerful ability
>   but makes sense for the special unit"): **the Walrus keeps Frostbite**
>   and gets no Cold Wake; **the Cold Wake is the Frost Giant's alone**.
>   Sections 1, 3.1, 3.3 and the bead plan below say so; the Walrus's
>   place in the rebuilt naval branch (3.4, 4.1, 5.2) still describes it as
>   the bridge builder, which bead 4 must revisit (see 3.4).
> - **Decisions taken in bead 1:** (1) Frozen still means "loses one of its
>   owner's own turns": a freeze in the unit's own turn (Frostbite, Black
>   Ice) gives `turnsLeft` 2, every other freeze 1 (with 1 for Frostbite it
>   would thaw at that same turn's end and do nothing). (2) Stored Snow is a
>   separate `snow` list in the state (not ice entries with a land flag),
>   omitted from canonical hashes while empty. (3) `WATER_FROZEN` became
>   `TILES_FROZEN { playerId, unitId, tiles, snow }`. (4) A Cold Snap is
>   offered whenever its ring changes something, Snow alone included; the
>   Normal AI casts it only when it Freezes a hostile unit or its ice serves
>   a planned crossing. Its `ALREADY_FROZEN` refusal is gone (`NO_TARGET`).
>   (5) The AI builds crossings with Cold Snaps and the Giant's wake (the
>   Walrus builds nothing now). (6) Hoarfrost unlocks nothing until bead 4;
>   Black Ice, Glacier, and the Ice Harbour rules stay until bead 4. (7) The
>   Wail preview's hidden-Blizzard flag went (a hidden Witch can no longer
>   change Snow cover). (8) The retired action icons and the BOLAS and
>   Frost Bolt art stay registered in the asset manifests (removing art is
>   bead 4's asset work).

The user played the Ice Folk on 2026-11-08 and listed what does not work:
too many freezing mechanics that look alike, a Mammoth whose sweep is
meaningless, sea trade that ignores the ice, a naval branch with too little
in it (Glacier and Hoarfrost useless, half-cracked ice tedious, captured
harbours turning into Ice Harbours nobody can build), a skating interface
with arrows and a Sled that slides across the whole map, and a Snow Golem
that is a worse Catapult. The ask: "simplify but also make it make sense
and have the ice folks have interesting, powerful abilities and synergies."

This document lists what exists today (section 2), proposes one design
(sections 3 and 4), says what it disturbs (section 5), and splits the work
into beads (section 6); section 7 records the stat pass against the Human
roster that followed bead 3.

## 1. The design in one page

- **One freeze effect, Freeze.** Freezing a tile turns water into ice,
  turns open land into Snow, and Freezes a hostile unit standing there for
  one turn. Every ability that freezes a tile uses this one rule.
- **Three tile freezers, one each way:**
  - the **Frost Giant** (the reward unit) freezes every tile around it
    each time it moves (**Cold Wake**; decided during bead 1: the user
    gave it to "the special giant unit", not the Walrus);
  - the **Ice Witch** freezes every tile around her on command (**Cold
    Snap**);
  - the **Snow Golem**'s shot freezes the one tile it hits (**Snowball**).
- **Two unit-only freezes:** the Frost Wyrm's **Frost Breath** (its attack
  Freezes the survivor; no tile changes), a clearly different verb: a blow,
  not a spell; and the Walrus's **Frostbite** (a unit that strikes it from
  the next tile and survives is Frozen), kept at the user's word "walrus
  freezing units that hit it is fine".
- **Everyone else loses their freezing powers:** the `FREEZE` command of
  seven roles, the Frost Bolt, the Sled's Bolas, Glacial Smash's shards,
  Black Ice, and the Blizzard's Snow are removed.
- **Mammoth:** its Sweep hits each flank unit for the normal damage of its
  attack (a fixed 2 today), and its Attack rises from 2.5 to 3.
- **Sea trade over ice only:** an Ice Folk sea link needs an unbroken chain
  of their own ice between the two endpoints, and then has no length limit,
  like a Road.
- **The naval branch is rebuilt** so each of its five technologies does
  for the Ice Folk what it does for a seafaring faction: Rime (the Walrus;
  Fishing Holes), Pack Ice (deep water; Pearls),
  Harpoons (+1 Attack against ships, the Ram's twin), Ice Fortress (the
  Shipyard's and Battleship's twin), Under the Ice (the dive and +1
  population per hole, the Submarine's and Harbours' twin). Glacier,
  Hoarfrost, thick and half-cracked ice, and the Ice Harbour are gone; a
  captured dock stays a plain dock.
- **Skating is just movement:** Glide covers Snow and ice alike: a step
  from a frozen tile onto a frozen tile costs half a point, like a Road.
  Runners (the free straight slide), the Sled's slide through zones of
  control, and the skate arrows are gone. A Sled reaches 4 tiles, not the
  whole map.
- **Snow Golem:** Catapult reach and damage (range 2 to 3, Attack 3) plus
  the Snowball freeze, which sets up Shatter for the melee line.

## 2. Inventory: what exists at `7r132`

### 2.1 Everything that freezes a unit

| #   | Mechanic                     | Carrier                     | What it does                                                                                     | Source in the rules |
| --- | ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------- |
| 1   | Bolas (shown as Frost Bolt)  | Sled                        | `THROW_BOLAS`: Freezes one unit exactly 2 tiles away; primary action                             | 21.9                |
| 2   | Frost Bolt                   | Ice Witch                   | `FROST_BOLT`: Freezes one unit exactly 2 tiles away; one of her two spells a turn                | 21.6                |
| 3   | Cold Snap                    | Ice Witch                   | `COLD_SNAP`: Freezes every unit next to her, and with Rime ices the water around her             | 21.6                |
| 4   | Frostbite                    | Walrus                      | a unit that strikes the Walrus from the next tile and survives is Frozen (2 turns: its own turn) | 21.17               |
| 5   | Frost Breath                 | Frost Wyrm                  | its attack Freezes the target it leaves alive                                                    | 21.12               |
| 6   | Cold Aura                    | Frost Giant                 | after its own Move, every unit next to it is Frozen                                              | 21.12               |
| 7   | Shards                       | Frost Giant                 | when Glacial Smash shatters a unit, every unit around the shattered tile is Frozen               | 21.4                |
| 8   | Black Ice                    | seat tech (Seamanship)      | a hostile unit that ends its Move on the seat's ice is Frozen (2 turns)                          | 21.16               |
| 9   | Freeze (water line)          | every land role but Witch   | `FREEZE`: a ship the line reaches is Frozen                                                      | 21.16               |
| 10  | Shatter, Cold Blood, Brittle | Ice Folk blows, Snow Hunter | consumers of Frozen: kill at 1 to 3 HP (4 with Brittle; 8 Glacial Smash); +0.5 Attack on Frozen  | 21.4, 21.9, 21.7    |

Frozen itself: no move or action, no strike back, one turn (two when a
unit is frozen during its own turn), public, no immunity, cured by Tend
Wounded, Repair and Frosting (21.2, 21.3).

### 2.2 Everything that makes or removes ice and Snow

| #   | Mechanic             | What it does                                                                                                      | Source      |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Freeze (`FREEZE`)    | seven roles: the tile next to them and the one beyond (three with Hoarfrost) become ice; takes foreign ice; mends | 21.16       |
| 2   | Cold Snap water ring | with Rime, every water tile around the Witch becomes ice                                                          | 21.6, 21.16 |
| 3   | Border freeze        | with Rime, the water of a city's whole territory freezes on research, Land Grant, capture, and at setup           | 21.16       |
| 4   | Docks iced over      | any Freeze may ice over any dock; an Ice Folk-held one is then an "Ice Harbour" or "Great Harbour"                | 21.16, 14   |
| 5   | Snow: territory      | every land tile of an Ice Folk city's territory is Snow (derived, never stored)                                   | 21.5        |
| 6   | Snow: Blizzard       | the 3 x 3 around a land-form Ice Witch is Snow and moves with her                                                 | 21.5, 21.6  |
| 7   | Snow: Deep Winter    | with Deep Winter, neutral land within 2 of an own city center is Snow                                             | 21.7        |
| 8   | Crack Ice            | every other faction's ground unit and ship breaks an adjacent free, unbuilt ice tile back to water                | 21.16       |
| 9   | Glacier thick ice    | the seat's ice takes two Cracks; the first leaves it "cracked"; a Freeze mends it                                 | 21.16       |
| 10  | Pillage, elimination | Pillage removes a building on ice (the ice stays); an eliminated seat's ice stays, its cracks go                  | 21.16       |

### 2.3 Everything that skates, glides or dives

| Mechanic                       | Who                        | What it does                                                                            |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------- |
| Glide                          | every Ice Folk ground unit | a step from Snow onto Snow costs half a point                                           |
| Skate                          | every Ice Folk ground unit | a step onto ice costs half a point (from land too)                                      |
| Runners                        | Sled, Snow Hunter          | a straight step from ice onto ice costs nothing: an unbounded straight glide            |
| Glide through zones of control | Sled                       | a straight glide on ice does not stop in a hostile zone of control                      |
| The dive                       | every Ice Folk ground unit | from an own Fishing Hole, unmoved, to any other free own Fishing Hole as the whole Move |
| Only the Ice Folk walk on ice  | rule (`7r132`)             | other ground units never enter ice and Crack it; walkers and flyers cross it            |
| Frost Wyrm flight              | Frost Wyrm                 | flies over Shallow and Deep Water without Navigation                                    |
| Interface                      | board                      | skate trail and slide arrows across the ice, "Skate:" move labels                       |

### 2.4 Everything that touches the sea

- No ships, no embarking, no docks of their own (`BUILD_PORT` and
  `BUILD_SHIPYARD` refused). Ships cannot enter ice.
- **Fishing Hole** (Rime, 3 Coins, on own ice in territory): +1
  population, a Farm for mills and the Market, the dive, and since `7r127`
  a sea-link endpoint (two holes of different cities within five steps of
  water or ice).
- Fish and Pearls harvested under the ordinary gates; mills, Workshop,
  Market and Monument may stand on own ice.
- Sea Dog counts 5 units standing on ice; a Sunken Wreck on ice is
  salvaged by the first unit that ends a Move on it.
- Frozen ships shatter to an Ice Folk blow from the next tile.
- A captured dock keeps working; a Freeze over it makes it an Ice Harbour
  (or Great Harbour) the Ice Folk walk on but could never build.

### 2.5 The Ice Folk naval branch today

| ID                  | Tier | Shown as  | Gives                                                                                      | The user's verdict                                   |
| ------------------- | ---: | --------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `SHORECRAFT`        |    1 | Rime      | `FREEZE` on Shallow Water; Fishing Hole; Harvest Fish; sea links; the border freeze        | the core; Fishing Holes "play the role of a harbour" |
| `NAVIGATION`        |    2 | Pack Ice  | `FREEZE` on Deep Water; Gather Pearls                                                      | fine                                                 |
| `NAVAL_ENGINEERING` |    3 | Hoarfrost | the Freeze line reaches 3 tiles instead of 2                                               | "useless"                                            |
| `SEAMANSHIP`        |    2 | Black Ice | a hostile unit stepping onto the seat's ice is Frozen (since `7r132` only walkers, flyers) | not named; nearly dead since `7r132`                 |
| `SUBMERSIBLES`      |    3 | Glacier   | thick ice (two Cracks; "cracked" state; Freeze mends); Snow cover on ice                   | "useless"; half-cracked ice "too tedious"            |

### 2.6 The other factions' naval branches (the parity target)

Every seafaring faction keeps the same five technologies, the same three
ship roles and the same economic unlocks; names, numbers and the Seamanship
trick differ ([RULESET_7_NAVAL_FACTIONS.md](RULESET_7_NAVAL_FACTIONS.md)).

| Faction   | T1 (Shorecraft) | T3 (Naval Engineering) | T2 (Seamanship): the Ram plus     | T3 (Submersibles) |
| --------- | --------------- | ---------------------- | --------------------------------- | ----------------- |
| Humans    | Sailing         | Shipbuilding           | Board                             | Submersibles      |
| Undead    | Ghost Ships     | Plague Galleons        | Drowned Crews (a sunk ship rises) | Sunken Galleys    |
| Goblins   | Fire Rafts      | Dreadnoughts           | Powder Kegs (rafts Kaboom afloat) | Diving Barrels    |
| Dinosaurs | Dugouts         | War Rafts              | Horned Prows (Board)              | Plesiosaurs       |
| Martians  | Skimmers        | Hover Cruisers         | Hover Pods (foot units launch)    | Bathyspheres      |
| Dwarves   | Steam Launches  | Ironclads              | Sea Tunnels (Moles under water)   | Diving Bells      |
| Candy     | Gumdrop Tugs    | Pie Galleons           | Sugar Sails (ships Sugar Rush)    | Choco Subs        |
| Cult      | Black Gondolas  | Galleons of the Eye    | Offerings to the Deep (Favour)    | The Kraken        |

What the branch gives, by need:

| Need                   | Every seafaring faction                                                           | Ice Folk at `7r132`                                | Ice Folk proposed (section 3.4)                                                      |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Cross water            | T1: embark at a Port (Move 2 afloat); T2: Deep Water                              | T1: everyone Freezes a 2-tile line; T2: Deep Water | T1: the Witch's Cold Snap (and the Golem, the Giant's wake) ices water; T2: deep     |
| A unit of the branch   | T1 Patrol Boat; T3 Battleship; T3 Submarine                                       | none                                               | T1 the Walrus                                                                        |
| Attack ships           | Patrol Boat (Ram, T2), Submarine, Battleship                                      | Freeze lines, then Shatter from the ice            | Harpoons (+1 Attack against units afloat, T2), Cold Wake, Snowball, Shatter          |
| Attack land from water | Battleship, range 3, splash (T3)                                                  | nothing                                            | Ice Fortress: a fortified sea post, ranged units on it reach 1 further (T3)          |
| Sea resources          | Fish, Port +1 (T1); Pearls (T2); Shipyard +1 more (T3); Harbours +1 per dock (T3) | Fish, Fishing Hole +1 (T1); Pearls (T2)            | Fish, Fishing Hole +1 (T1); Pearls (T2); Ice Fortress +1 more (T3); +1 per hole (T3) |
| Trade                  | sea links between docks, at most 5 water steps (T1)                               | holes within 5 water or ice steps                  | holes joined by an unbroken chain of own ice, any length (T1)                        |
| Trick                  | Board or the faction trick (T2); Submerged and Torpedo (T3)                       | Black Ice, thick ice                               | Harpoons (T2); the dive between holes (T3)                                           |

## 3. The proposal

### 3.1 Freeze: the one effect

**Freezing a tile** (from any source below) does, for that tile:

| The tile                                          | Result                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| a hostile unit stands on it (any form but an Egg) | the unit is **Frozen** for one turn (the 21.2 rule), plus the tile row below |
| open water, no unit afloat, not a dock            | becomes the freezer's **ice** (needs Rime; Deep Water needs Pack Ice)        |
| open water holding a unit afloat, or any dock     | stays water (the unit afloat, if hostile, is Frozen)                         |
| another seat's ice                                | becomes the freezer's ice                                                    |
| land that is no player's territory, not a Rift    | becomes **Snow** (stored; section 3.2)                                       |
| land in any player's territory, own ice, a Rift   | unchanged                                                                    |

- **Frozen costs the unit one of its own turns.** Every tile freeze acts
  on the freezer's own turn, so the unit has `turnsLeft` 1 and thaws at
  the end of its owner's next turn. Frostbite (kept, 3.3) and Black Ice
  (until bead 4) freeze a unit during its own turn, so they keep
  `turnsLeft` 2, which costs it its next turn too (bead 1's reading). Everything else about Frozen
  stays (21.2, 21.3): no move or action, no strike back, Shatter window,
  cured by Tend Wounded, Repair and Frosting, no immunity.
- Without Rime a freeze still Freezes units on water and still makes Snow;
  it only makes no ice. The border freeze (Rime) stays as it is, minus
  docks.
- **Docks are never frozen.** No Ice Harbour or Great Harbour, no dock iced
  shut. A ship on a dock is Frozen like any ship.
- Events: one `UNITS_FROZEN` (sources `COLD_SNAP`, `COLD_WAKE`, `SNOWBALL`,
  `FROST_BREATH`, `FROSTBITE`, and `BLACK_ICE` until bead 4) and one
  `TILES_FROZEN` (the renamed `WATER_FROZEN`, listing ice and Snow tiles).

**Glossary line (Freeze):** "Freezing a tile turns water to ice and open
land to Snow; an enemy on it is Frozen for a turn."

### 3.2 Snow, ice, thaw and Crack after the change

- **Snow** is what Ice Folk terrain already means (Glide and Snow cover for
  the Ice Folk, deep snow for other ground units). It now comes from three
  places: the territory of an Ice Folk city (derived, as now), Deep Winter's
  ring (unchanged), and **stored Snow** that a freeze laid on neutral land.
- **Stored Snow stays** (like ice: nothing has to be done to keep it), and
  **melts the moment its tile becomes any player's territory** (a new city,
  a Land Grant, a capture). Rule of thumb for players: Snow never lies on
  another player's land, because nobody can clear it.
- **The Blizzard no longer makes Snow.** The Witch keeps its protection:
  ranged hits on her own Ice Folk units next to her are halved (21.6). The
  thing the user saw as "turning everything around her into Ice Folk
  terrain" is now her Cold Snap, once a turn, and it stays where she cast it.
- **Ice** is unchanged except: no thick ice, no cracked state, no ice cover
  (all Glacier), no dock under ice.
- **Crack Ice** is unchanged for the other factions (7r132): any of their
  ground units or ships next to free, unbuilt Ice Folk ice breaks it back
  into water with one action. Buildings on ice (Fishing Hole, Ice Fortress,
  mills) cannot be cracked; they are Pillaged.
- No tile ever thaws by itself. Units thaw after one turn.

### 3.3 Who freezes

| Unit        | Ability (new or kept)                          | Kind          | Rule                                                                                                                                                    |
| ----------- | ---------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frost Giant | **Cold Wake** (replaces Cold Aura and shards)  | tile, passive | when it completes its own `MOVE`, it freezes every tile of the 8 around its new tile; Glacial Smash (Shatter threshold 8) stays                         |
| Ice Witch   | **Cold Snap** (kept, widened)                  | tile, active  | primary action: freezes every tile of the 8 around her; offered only when it changes something (a unit Frozen, a tile frozen); one tap, no confirmation |
| Snow Golem  | **Snowball** (new; replaces Boulders, Planted) | tile, attack  | every attack it makes freezes the target's tile after the exchange (a surviving target is Frozen)                                                       |
| Frost Wyrm  | **Frost Breath** (kept)                        | unit only     | its attack Freezes the target it leaves alive; the tile is untouched                                                                                    |
| Walrus      | **Frostbite** (kept; the user, during bead 1)  | unit only     | a unit that strikes it from the next tile and survives is Frozen (its own turn: `turnsLeft` 2); no tile changes; no Cold Wake                           |

**Removed:** `FREEZE` (the command, the ability on seven roles, the line,
Hoarfrost's long line); `FROST_BOLT`; `THROW_BOLAS`; Cold Aura's
unit-only freeze (merged into Cold Wake); Glacial Smash's shards; Black Ice
(bead 4); the Blizzard's Snow; the "mend a crack" Freeze (bead 4, with
Glacier; a tile freeze still mends an own crack until then).

Why these carriers:

- **The Frost Giant moves the ice.** The user: "we can have the special
  giant unit freeze everything around it whenever it moves. it's a
  powerful ability but makes sense for the special unit". It is slow (Move
  1), so its Cold Wake is a deliberate walk, not a raid: each Move lays a
  ring of ice and Snow, a 3-wide road one tile a turn, and Freezes every
  enemy beside its new tile. The campaign leans on the Giant's freezing
  (I2, I5, late I1), and a reward unit in every level-6 city is the right
  place for the biggest freeze.
- **The Walrus keeps Frostbite** (the user: "walrus freezing units that
  hit it is fine"): a defender that punishes melee, with no tile freeze,
  so it is no second moving freeze. (The proposal before had the Walrus
  carry the Cold Wake as the bridge builder; that went.)
- **The Witch is the active area freeze.** She already froze her
  neighbours and her water; now that ring also lays Snow, and her two other
  spells (Frost Bolt, the moving Blizzard Snow) go.
- **The Snow Golem is the single tile at range**, which is also its answer
  to the Catapult (section 3.7).
- **The Wyrm's breath is the one unit-only freeze**: a blow that leaves
  frost on the victim, the "units are sometimes frozen without the ground"
  the user allowed for.

So four of the nine Ice Folk units freeze (the Witch, the Golem, the Wyrm,
the Walrus), plus the reward Giant's wake, each in a different way, and
the Yeti, Sled, Snow Hunter and Mammoth do not.

Glossary lines:

| Entry        | Line                                                |
| ------------ | --------------------------------------------------- |
| Cold Wake    | "After each Move, it freezes every tile around it." |
| Frostbite    | "A unit that strikes it up close is Frozen."        |
| Cold Snap    | "Freezes every tile around the Witch."              |
| Snowball     | "Its shot freezes the tile it hits."                |
| Frost Breath | "Its attack leaves the target Frozen."              |
| Blizzard     | "Ranged hits on your units next to her are halved." |

### 3.4 The naval branch rebuilt

The five node IDs, tiers, prerequisites and prices stay (the AI and the
tech screen keep working). Each node now matches what it gives the
seafaring factions.

| ID                  | Tier | Shown as          | Unlocks                                                                                                                                                            | Its seafaring twin                          |
| ------------------- | ---: | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `SHORECRAFT`        |    1 | Rime              | **the Walrus** (moved here from Fortification); freezes make ice on Shallow Water; Fishing Hole; Harvest Fish; ice sea links (3.5); the border freeze              | Port, embarking, Patrol Boat, Fish, links   |
| `NAVIGATION`        |    2 | Pack Ice          | freezes make ice on Deep Water; Gather Pearls                                                                                                                      | Deep Water, Pearls                          |
| `SEAMANSHIP`        |    2 | **Harpoons**      | every Ice Folk unit has +1 Attack against a unit afloat (a ship, a transport)                                                                                      | the Ram (+1 Attack against units afloat)    |
| `NAVAL_ENGINEERING` |    3 | **Ice Fortress**  | upgrade one Fishing Hole per city to an Ice Fortress (5 Coins): +1 population more; an own unit on it is fortified, and a ranged unit on it reaches 1 tile further | Shipyard (+1, one per city), Battleship     |
| `SUBMERSIBLES`      |    3 | **Under the Ice** | the dive between Fishing Holes (moved here from Rime); every active Fishing Hole, Ice Fortress and captured dock gives +1 population                               | Submarine (stealth), Harbours (+1 per dock) |

- **The Walrus** (`GUARD` role, now at Rime): 5 Coins (4 now), 16 HP,
  Attack 1.5, Defense 2, Move 1, melee, no attack after moving, captures,
  Glides, Frostbite. The Ice Folk Fortification node (Deep Winter) keeps
  Deep Winter and no longer unlocks a unit. **Open for bead 4:** this
  proposal made the Walrus Rime's unit as the bridge builder (Cold Wake);
  since bead 1 the Walrus has no Cold Wake (the Giant has it), so the
  Witch's Cold Snap and the Giant build the crossings, and bead 4 decides
  whether the Walrus still moves to Rime (as a sea-ice defender) or stays
  at Fortification.
- **Harpoons** is a combat modifier like the Ram, on every Ice Folk attack
  on a unit in `NAVAL` or `EMBARKED` form (the preview row "Harpoon +1").
  A Yeti harpoons a Patrol Boat for 8 instead of 5; a Frozen boat at 10 HP
  is then left at 2 and shatters.
- **The Ice Fortress** is an improvement `ICE_FORTRESS` that upgrades an
  active own Fishing Hole in place (command `BUILD_ICE_FORTRESS`, Naval
  Engineering, 5 Coins, one per city, like the Shipyard). It keeps
  everything the hole does (sea-link endpoint, dive node, Farm for the
  mills), gives 2 population in all (3 with Under the Ice), fortifies an
  own unit standing on it (fortification level 1, the Field Defense
  level; the one exception to "no fortification on ice"), and a unit with
  range 2 or more standing on it has its range raised by 1 (a Snow Hunter
  shoots 3, a Snow Golem 4). It is Pillaged like any building on ice.
- **Under the Ice** gives the dive (21.16, unchanged as a rule) and the
  Harbours bonus. Moving the dive here takes a teleport out of tier 1,
  where it was a lot of power for 5 Coins, and gives the branch a
  Submarine-like stealth move.
- **Captured docks stay docks.** A Port or Shipyard the Ice Folk capture
  stays an open-water dock in their territory: it gives its population (and
  +1 with Under the Ice), it is a sea-link endpoint (3.5), it trains
  nothing, and no unit of theirs embarks there. It is never frozen, so it
  never becomes an Ice Harbour. `BUILD_PORT` and `BUILD_SHIPYARD` stay
  refused.
- **Removed:** Hoarfrost (`LONG_FREEZE`), Black Ice (`BLACK_ICE`), Glacier
  (`GLACIER`: thick ice, the cracked state, the mend, ice cover), the Ice
  Harbour and Great Harbour names and sprites, and the ice-under-a-dock
  rules of sections 14 and 21.16.

Tech card lines (one number each at most):

| Card          | Line                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| Rime          | "Walruses; your freezes make ice on shallow water; Fishing Holes."        |
| Pack Ice      | "Your freezes make ice on deep water; Pearls."                            |
| Harpoons      | "+1 Attack against ships and boats."                                      |
| Ice Fortress  | "Fortify a Fishing Hole: a unit on it is fortified and shoots 1 further." |
| Under the Ice | "Dive between your Fishing Holes; each hole gives +1 population."         |

### 3.5 Sea routes over ice only

For an Ice Folk seat, section 9.5 becomes:

- **Endpoints:** its active Fishing Holes and Ice Fortresses, and its
  active captured docks. An endpoint is active while it lies in an own
  city's territory and no living hostile unit stands on it (as now).
- **The link:** two endpoints of two **different** own cities are linked
  when an eight-way chain of tiles, **every one of them the seat's own ice**,
  joins them (the endpoints themselves excepted, so a captured dock on open
  water links through the ice beside it; two endpoints side by side link
  directly). There is **no length limit**: own ice is the Ice Folk Road,
  and a Road connection has none.
- **Open water breaks it.** A route that would cross even one tile of open
  water, foreign ice, or land is no route. A Crack in the chain breaks the
  link until the Ice Folk freeze the tile again (a Walrus walking past, a
  Cold Snap, the border freeze). A hostile unit on a mid-route ice tile
  does not break it (as for Roads and the current sea links); one on an
  endpoint does.
- Pack Ice is not needed to use a link over deep ice; it is needed to make
  that ice.
- **Other factions' sea links are unchanged:** they still run through
  water and under Ice Folk ice, within five steps. Ice blocking enemy trade
  was considered and rejected (section 4).
- The view's `naval.seaRoutes` publishes the chain as the dashed line, as
  now. The Normal AI values a link through the economic preview, as now,
  and the other factions' AI learns that cracking a route tile breaks a
  connection (section 5.1).

Glossary line: "Your sea links run only along your own ice."

### 3.6 Skating is plain movement

- **One rule, Glide:** for a land-form Ice Folk ground unit, a step **from
  a frozen tile onto a frozen tile** (Snow or ice) costs one half-point,
  like a step along a Road. Every other step costs what it costs anyone.
  Snow and ice are the same for this; a Road and Glide do not add up.
- So a Move-1 unit crosses 2 frozen tiles a turn and the Sled 4. Leaving a
  frozen tile for bare land costs a full point. The Frost Wyrm flies and
  does not glide.
- **Removed:** Skate as a separate rule (a step onto ice from bare land is
  a full step now), Runners (the free straight slide), the Sled's slide
  through zones of control, `glideDirection` in route search, the skate
  trail, the slide arrows, and the "Skate:" move labels. Move marks on ice
  are ordinary move marks.
- **The Sled** (no Bolas, no Runners) becomes the Ice Folk Raider in full:
  4 Coins, 12 HP (10 now), Attack 2, Defense 1, Move 2, Sight 2, Charge with
  Raiding, **Escape** (one more Move after an attack, the Raider's rule),
  Glides, captures. With Harpoons it is the hit-and-run ship hunter on the
  ice.

Glossary line (Glide): "Between Snow and ice tiles, Ice Folk move at half
cost, as on a Road."

### 3.7 The Snow Golem against the Catapult

| Unit                | Coins |  HP |        Attack | Defense |  Move |   Range | Attack after Move | Extras                                                      |
| ------------------- | ----: | --: | ------------: | ------: | ----: | ------: | ----------------- | ----------------------------------------------------------- |
| Catapult (Human)    |     8 |  10 |             3 |     0.5 |     1 |     2–3 | no                | destroys Field Defense                                      |
| Snow Golem now      |     9 |  10 | 2 (3 Planted) |     1.5 |     2 |     1–2 | yes               | ignores fortification; Mountain-born; Glides                |
| **Snow Golem, new** | **9** |  10 |         **3** |   **1** | **1** | **2–3** | **no**            | **Snowball**; Mountain-born; Glides; destroys Field Defense |

- **Snowball:** every attack freezes the target's tile after the exchange
  (section 3.1): a target that survives is Frozen, open neutral land
  under it becomes Snow, and a ship is Frozen on its water. A Golem never
  Shatters (it never strikes from the next tile); it sets the Shatter up.
- Dropped: range 1, Move 2, attack after moving, Planted, and Boulders'
  "ignores fortification". It is a siege piece with the Catapult's reach
  and blow, sturdier (Defense 1), able to sit on peaks, and every shot
  freezes. That is worth the extra Coin.
- Examples (full HP, open ground): a Fighter takes 8 (4 left, Frozen;
  any Yeti blow then kills); a Guard takes 7 (10 left, Frozen), and a
  Mammoth blow of 7 then leaves 3: **Shatter**. A Battleship takes 7 and
  is Frozen (10 and range 4 with Harpoons on an Ice Fortress).

### 3.8 The Mammoth hits as hard as it looks

**Why it is low now.** Two numbers: the Sweep's flank hit is a fixed
`SWEEP_DAMAGE_V7` 2 (1 against Armoured), whatever the target, so the
"hits three units" Mammoth deals 2 to the side units; and its own Attack is
2.5, the lowest heavy-line Attack in the game (Champion 3.5; Triceratops,
Wight, Steam Tank, Jawbreaker, Shock Trooper 3; Ogre 2.5 with
Heavyweight). A full-HP Fighter takes 6 from it, and each flank unit 2.

**The fix.**

- **Sweep at full damage:** each hostile flank unit takes the damage the
  Mammoth's attack would deal to it by the ordinary formula (its own
  Defense, fortification and cover; Armoured, Shields and Plated apply),
  with no retaliation. A flank hit is an Ice Folk blow from the next tile,
  so it **Shatters** a Frozen flank unit left at 1 to 3 HP (4 with
  Brittle). Kill credit, Graves and blasts as now.
- **Attack 3** (`attack2` 6, from 5); **8 Coins** (from 7), the
  Triceratops price. 20 HP, Defense 2, Move 1, Trample and Stampede
  unchanged (Stampede keeps its fixed 3: it is a shove, not a blow).
- Examples (full HP, open): a Fighter in front takes 8 (the Mammoth takes
  4 back) and two Fighters on the flanks 8 each, 24 in all for one blow
  (today 6 + 2 + 2). A Guard takes 7. Against three units next to a Witch
  who just cast Cold Snap, nothing strikes back and every unit left at 3
  or less shatters.

Glossary line (Sweep): "Its attack also hits the two enemies beside the
target, at full damage."

### 3.9 The rest of the kit, unchanged

Yeti (Mountain-born, Rockfall), Snow Hunter (Cold Blood: +0.5 Attack on a
Frozen target; it loses Runners and `FREEZE`), Frost Wyrm (flight over
Deep Water, Frost Breath; it loses `FREEZE`), Frost Giant (Glacial Smash),
Shatter (threshold 3; 4 with Brittle), Deep Winter, Brittle, territory
Snow, deep snow, "only the Ice Folk walk on ice", Crack Ice, the border
freeze, Fishing Holes, Sea Dog, and the Wreck salvage.

## 4. Synergies, counters, and rejected alternatives

### 4.1 The combos this kit is built for

| Combo                | How it plays                                                                                                                                            | Gate                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Freeze, then Shatter | any freezer Freezes; the next melee blow kills a unit it leaves at 1 to 3 HP, with no strike back; Snow Hunters add Cold Blood from range               | the freezers' techs         |
| Frost and Sweep      | the Witch's Cold Snap Freezes her ring; a Mammoth's blow hits three Frozen units at full damage, none strikes back, each one left at 3 or less shatters | Administration + Metallurgy |
| Snowball and Smash   | the Golem Freezes a big unit at range 3; the Frost Giant's Glacial Smash kills it at 8 HP or less                                                       | Sawmilling + a level-5 city |
| The walking bridge   | a Frost Giant walks out on the sea laying a 3-wide road; ships next to it are Frozen; Yetis and Sleds glide out and harpoon them; boats shatter         | Rime + a level-6 city       |
| Winter road          | Cold Wakes and Cold Snaps leave Snow on neutral land: the army glides 2 tiles a turn (Sled 4) with Snow cover, and enemy riders stop on entering        | Rime / Administration       |
| Dive and freeze      | under the ice, a unit dives to a far Fishing Hole and a Witch beside it freezes the ring (a Walrus's Cold Wake before bead 1; revisit in bead 4)        | Under the Ice               |
| Sea battery          | a Snow Golem on an Ice Fortress shoots 4 tiles, fortified, and Freezes each ship it hits for the Sleds to harpoon                                       | Ice Fortress + Sawmilling   |
| Ice is trade         | the bridges between cities are the sea links: every ice road is also income, and worth guarding                                                         | Rime                        |

### 4.2 Why it is not always-winning

- Every freezer is slow or fragile: the Walrus and the Giant have Move 1,
  the Witch has 10 HP and acts from the next tile, the Golem has 10 HP and
  cannot shoot what stands next to it. A unit two tiles from a Walrus or a
  Witch is never Frozen by them; ranged units and Battleships outrange them.
- Frozen lasts one turn and never stacks; `JUGGERNAUT`-role units never
  shatter; a cure (Tend Wounded, Repair, Frosting) thaws at once.
- Ice is one Crack from water and breaks a sea link; Snow never lies on
  another player's land, and Roads ignore deep snow.
- The power comes in tiers: the Walrus at tier 1 (Rime), the Witch at tier
  2, the Golem, Mammoth and Wyrm at tier 3, Harpoons at tier 2 and the
  Fortress and Under the Ice at tier 3.
- Cheap packs and Gang Up still beat Yetis in the open.

**The balance risk to watch:** a Walrus that keeps stepping beside an enemy
line Freezes it every turn. That is the Polytopia Mooni pattern and the
user asked for it ("freeze everything around it as it moves"), but if hand
play shows it decides every game, the first knob is that a Cold Wake
Freezes only units on water or ice (it still lays Snow and ice), and the
second is moving the Walrus back to Fortification.

### 4.3 Rejected alternatives

| Alternative                                                   | Why not                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Give the Ice Folk real ships (sea beasts at the Fishing Hole) | breaks "they walk on the sea they freeze"; new roles, art and AI for three units                            |
| Keep `FREEZE` on every unit, only shorter                     | the user: "i don't want every single unit having freezing powers"                                           |
| Land frost that thaws after a turn                            | a second countdown and a second duration; the user has asked twice that frozen things simply stay           |
| Stored Snow anywhere, enemy territory included                | nobody could ever clear it; deep snow on an enemy's home would be permanent harassment                      |
| Cold Wake on the Sled                                         | a Move-2 attacker that freezes its neighbours before striking is a lock with no counterplay                 |
| The Frost Giant loses all freezing                            | the campaign leans on it, and sharing the Walrus's rule adds no new mechanic                                |
| Ice Folk ice blocks other factions' sea links                 | a new way to cut trade for a whole map; out of scope, and it punishes the other side for the Ice Folk's ice |
| Uncrackable or thick ice                                      | the root's earlier ruling (no ice that walls off a sea), and the user found the half-cracked state tedious  |
| Golem keeps range 1–2, Move 2, Planted                        | the single-tile freezer wants the Catapult's reach; three conditional numbers are the opposite of simple    |
| Mammoth Attack 3.5 (the Champion's)                           | with full-damage flank hits, Attack 3 already makes one blow worth three                                    |
| Skating as a naval-branch tech                                | Glide on Snow is the faction's core movement; one rule for Snow and ice is simpler than a gated one         |

## 5. Impact

### 5.1 Normal AI

All of it is through the public queries and exact previews, as now.

- **Remove:** `FREEZE` scoring (`iceFreezeScoreV7`, `iceWaterFreezeScoreV7`),
  Bolas and Frost Bolt scoring, Black Ice avoidance
  (`hostileBlackIce`, `iceMoveOntoHostileIceRejectedV7`,
  `iceLandingRejectedV7`), thick-ice cracking and mending, Hoarfrost and
  Glacier research values, Runners' `iceGlideLineV7`.
- **Rework the crossing planner** (`iceSeaPlanV7`, `findCrossing`,
  `iceCrossingMoveV7` in `src/ai/v7-frozen-sea.ts`): a crossing is built
  by Witch Cold Snaps and Frost Giant Moves along the planned line (each
  Move's Cold Wake previewed: tiles iced, units Frozen), not by Freeze
  lines (done in bead 1).
- **Score the Cold Wake on every Giant Move** (units Frozen,
  Shatter setups, tiles iced or snowed) and the Snowball on every Golem
  attack (the Frozen target's Shatter setups), from the previews.
- **Research and build:** Rime now brings the Ice Folk defender (army
  growth reads the Walrus at `SHORECRAFT`); Harpoons, Ice Fortress
  (`BUILD_ICE_FORTRESS` site choice) and Under the Ice values; a Fishing
  Hole's value counts only links its ice chain makes.
- **The other factions:** threat tiles include a Giant's wake
  reach (2 tiles: one step plus the ring) and a Golem's range; `iceCrackScoreV7`
  values a crack that breaks an Ice Folk sea link; ships fear Walruses on
  the ice, not Freeze lines (`iceHostileFreezersV7`, `iceFreezeReachesV7`).
- Mammoth: the Sweep is valued from the preview's `splash` entries, which
  now carry full damage and Shatter.

### 5.2 Missions and campaign

The Ice Folk chapter (`src/campaign/chapter-ice-folk.ts`, missions
`src/engine/v7/missions/ice-folk-1.ts` to `ice-folk-6.ts`, CAMPAIGN.md
sections 22 and 27) was calibrated against the current kit, so every
mission needs a look; hand play (`play-text`) needs the user's go-ahead.

| Mission                  | What changes for it                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 The Warm Mountain     | Rime held the pocket "behind Cold Snaps, Frost Bolts and the Sled's bolas"; Frost Bolt and Bolas are gone (the Walrus keeps Frostbite). Hint "Frozen enemies can't act: freeze first, then strike." still true. Likely a little harder; replay first.                                                                           |
| I2 Waking the Giants     | the Frost Giant decides it; it keeps its wake (now also tiles) but loses the shards that froze the Abbot. Hint "freeze, then smash" still true. Replay.                                                                                                                                                                         |
| I3 The Frozen Strait     | built on Freeze lines and Hoarfrost. Its seat starts with Rime, Pack Ice and Naval Engineering (now the Ice Fortress) and a Walrus; its Witch now builds the bridge with Cold Snaps; the Steam Launches' Port can no longer be iced shut. Hint "Freeze toward an enemy ship to Freeze it for a turn." must change. Full retune. |
| I4 A Year Without Summer | won by Walrus Frostbite against Knights. Frostbite stays (decided during bead 1), so the hint "Walruses freeze whoever strikes them up close." stays true; the Walrus may move to Rime in bead 4 (the seat starts with Shorecraft). Replay.                                                                                     |
| I5 The Ember Lodge       | the Giant's shards go (it won I5 with Glacial Smash, which stays); "Hoarfrost Camp" is a place name and stays; hint "A giant's blow shatters a badly hurt Frozen enemy." still true.                                                                                                                                            |
| I6 The Winter Crown      | hint "A Sled's bolas holds a daemon still for a turn." must change (bead 1: "An Ice Witch's Cold Snap holds a daemon still for a turn."); the Sleds lose the bolas that held the Horrors. Replay.                                                                                                                               |

- Texts that name removed mechanics: the chapter's hints above; the
  mission definition comments of I3 (Freeze lines, Hoarfrost, Black Ice);
  CAMPAIGN.md section 27's descriptions stay as history.
- Every mission's `technologies` and `forbiddenTechnologies` lists should be
  re-checked for the Walrus's move to `SHORECRAFT` (a seat that forbids
  Shorecraft can no longer train Walruses).
- Ice Folk seats in other campaigns (`CULT_5`, `DWARF_2`, `HUMAN_4`,
  `UNDEAD_6`) are on dry boards; they lose Frost Bolt and Bolas.
  Their pins move only with the ruleset.
- The Ice Folk lab mission (`lab-ice-folk.ts`) and the Showcase need their
  Freeze examples replaced.

### 5.3 Saves, replays and state

Each bead below bumps the ruleset (`7r133` onwards). Earlier Ruleset 7
identities are rejected, never migrated (section 1), so old autosaves and
replays simply do not load under the new revision. Shape changes, by bead:

- `ice` entries may lie on land (stored Snow), or a new `snow` list (the
  bead decides; one list with a land flag is preferred); `ice.cracked` and
  the view's `thick` and `cracked` go; `frozen.turnsLeft` stays 1 or 2
  (bead 1 kept 2 for Frostbite).
- Commands `FREEZE`, `FROST_BOLT` and `THROW_BOLAS` are removed;
  `BUILD_ICE_FORTRESS` is added; improvement `ICE_FORTRESS` is appended.
- `UNITS_FROZEN.source` loses `BOLAS`, `FROST_BOLT`, `SHARDS`, `FREEZE`,
  and `COLD_AURA` (bead 1) and `BLACK_ICE` (bead 4), keeps `FROSTBITE`,
  and gains `COLD_WAKE` (bead 1) and `SNOWBALL` (bead 2); `WATER_FROZEN`
  becomes `TILES_FROZEN` (bead 1).
- Unlock kinds `LONG_FREEZE`, `BLACK_ICE`, `GLACIER` and capabilities
  `longFreeze`, `blackIce`, `thickIce`, `iceCover` go; `HARPOONS`,
  `ICE_FORTRESS` and `UNDER_THE_ICE` (with `dive` and the hole population)
  come.
- Combat preview: `iceCover`, `plantedApplied` and
  Boulders' `fortificationIgnored` for the Golem go; `harpoon` and
  `snowball` come; Sweep `splash` entries carry formula damage and may
  carry `shatters`.

### 5.4 Interface, art and sound

- **Retire:** the Freeze button and its water badges, the Frost Bolt and
  Bolas badges and buttons (`ICON:ACTION:FREEZE`, `ICON:ACTION:THROW_BOLAS`),
  the BOLAS projectile effect and its sound pairing, the Frost Bolt whoosh,
  the `SHARDS` sound pairing, the Hoarfrost, Black Ice and Glacier tech
  icons, the thick and cracked ice drawing (crack stages), the Ice Harbour
  and Great Harbour sprites, the skate trail and slide arrows, and the
  "Skate:" and "Runners" labels.
- **Keep and reuse:** Cold Snap's frost ring effect (also for Cold Wake),
  `special.freeze`, `impact.ice`, `special.ice-crack`, the Snow tile
  drawing (stored Snow draws as Snow), the Shatter effects, the Fishing
  Hole sprite.
- **New (PixelLab through checked-in scripts, with review):** the Ice
  Fortress building sprite; tech icons for Harpoons, Ice Fortress and Under
  the Ice; a Snowball projectile for the Golem (or a recolour of its
  boulder). **Sound (ElevenLabs script):** a harpoon hit is optional; the
  existing impact sounds can serve.
- **Board:** no new controls. A Frost Giant's Move destination shows
  the ring it will freeze in the quiet Cold Snap tint while hovered (a
  preview, never a chooser); the Golem's attack preview says "Freezes";
  Harpoon is a preview row; the Ice Fortress is a build entry. Every tile
  keeps one meaning: the Freeze-against-Attack overlap on ships (finding 16
  of the simplification review) disappears with `FREEZE`.
- **Text:** glossary, Help rows, unit cards and tech cards per the lines in
  section 3; RULESET_7_CURRENT.md sections 9.5, 14 (whose Ice Harbour Port
  paragraph and section 14.4's "for the Ice Folk, Glacier" are already
  stale at `7r132`), and 21 rewritten.

## 6. Implementation plan

Five rules beads in order, each its own ruleset revision and independently
reviewable, then one campaign bead. Every rules bead carries its own Normal
AI, interface, glossary, rules-doc and mission-text changes, so the game is
coherent after each one.

Validation for every rules bead (no simulations, per the standing rule):

```text
Validation profile: engine/rules + ui/presentation (AI and save schema touched: gates as ai/map/persistence without its simulation gates)
Worker focused checks: npx vitest run <the bead's focused test files, listed below>
Conditional final gates: npm run format:check, npm run lint, npm run typecheck, npm run test:unit, npm run build (root); npm run smoke:browser only if it plays no match, otherwise skipped and recorded
```

### Bead 1: one freeze effect (`7r133`)

- **Scope:** the Freeze rule of 3.1 and the Snow, ice and thaw rules of
  3.2 (stored Snow on neutral land that melts in any territory; docks never
  freeze; a tile freeze gives `turnsLeft` 1). Carriers: Witch Cold Snap
  (ring of tiles), Frost Giant Cold Wake (replacing Cold Aura; shards
  gone). **The Walrus keeps Frostbite and has no Cold Wake** (the user's
  change during the bead). Remove `FREEZE` (all roles), `FROST_BOLT`,
  `THROW_BOLAS` (the Sled gains Escape and 12 HP), shards, and the
  Blizzard's Snow (its ranged halving stays). Black Ice stays until bead 4.
  AI: the crossing planner on Cold Snaps and Giant Moves; Cold Wake
  scoring; removals of 5.1. UI: remove the buttons and badges, the
  wake-ring hover tint, glossary and Help lines, the hints of I3 and I6.
  Rules doc: 21.1 to 21.6, 21.12, 21.16, 21.17. **Done** in `7r133`
  (`pulp_wars-xv0t`).
- **Acceptance:** hand-built states show a Cold Snap and a Cold Wake
  freezing water (with Rime), neutral land (Snow) and hostile units in the
  same action, leaving territory land, Rifts and docks unchanged, and a
  ship on a dock Frozen with its tile still water; stored Snow melts when a
  Land Grant takes its tile; a Frozen unit has `turnsLeft` 1 and thaws
  after its owner's next turn; `FREEZE`, `FROST_BOLT` and `THROW_BOLAS` are
  neither offered nor accepted; a Walrus's Frostbite still Freezes its
  melee attacker and a Walrus's Move freezes no tile; a Sled Escapes after
  an attack; previews equal results; the Normal AI builds a crossing with
  Cold Snaps in a hand-built strait; every glossary entry carries at most
  one number.
- **Focused tests:** the `ruleset-v7-ice-folk-*`, `ruleset-v7-frozen-sea-*`
  (not `*.sim.test.ts`), `ruleset-v7-ice-freeze-rework-s55m`,
  `ruleset-v7-frostbite-thaw-s55m8`, `ruleset-v7-ice-border-freeze`,
  `ruleset-v7-ice-redesign-*`, `ice-folk-render-v7`,
  `frozen-sea-presentation-render-v7`, and `campaign-ice-folk-v7` test
  files, plus a new `ruleset-v7-ice-folk-one-freeze.test.ts`.

### Bead 2: Snow Golem and Mammoth (`7r134`)

- **Scope:** the Golem of 3.7 (cost 9, Attack 3, Defense 1, Move 1, range
  2–3, no attack after moving, Snowball; Planted and Boulders removed) and
  the Mammoth of 3.8 (Attack 3, 8 Coins, Sweep at formula damage that can
  Shatter). Previews (`snowball`, Sweep `splash` with full damage and
  `shatters`), AI attack scoring through them, unit cards, glossary, the
  Golem's projectile (reuse or recolour), rules doc 21.4, 21.10, 21.11,
  21.13.
  **Done** in `7r134` (`pulp_wars-3qtp`).
- **Acceptance:** the worked numbers of 3.7 and 3.8 hold in hand-built
  states (a Golem deals a Fighter 8 and Freezes it; a Golem-frozen Guard
  shatters to a Mammoth blow; a Mammoth blow deals 8, 8 and 8 to three
  Fighters with one retaliation of 4); a flank hit Shatters a Frozen unit at
  3 HP and never a `JUGGERNAUT`; the Golem cannot target an adjacent unit;
  previews equal results.
- **Focused tests:** `ruleset-v7-ice-folk-units`, `ruleset-v7-ice-folk-shatter`,
  `ruleset-v7-ice-folk-interactions`, `ruleset-v7-ice-folk-stampede`,
  `ruleset-v7-mammoth-stampede-57lq`, `ice-folk-render-v7`, plus a new
  `ruleset-v7-golem-mammoth-fofr.test.ts`.

### Bead 3: skating is plain movement (`7r135`)

- **Scope:** Glide over Snow and ice (3.6); remove Skate as a separate
  rule, Runners, the Sled's slide through zones of control, and
  `glideDirection`; remove the skate trail, slide arrows and "Skate:" and
  "Runners" labels; Help and glossary; AI reach and threat tiles; rules doc
  21.5 and 21.16 (skating).
- **Acceptance:** in hand-built states a Yeti crosses 2 frozen tiles and a
  Sled 4, a step from bare land onto ice costs a full point, a Sled stops
  on entering a hostile zone of control on ice, no path is longer than the
  budget allows; the movement query, the reducer and the threat estimate
  agree; no arrow or skate label is drawn for a Move on ice.
- **Focused tests:** `ruleset-v7-ice-movement-s55m2`,
  `ruleset-v7-frozen-sea-slide`, `ruleset-v7-ice-folk-snow`,
  `ruleset-v7-ice-only-ice-folk-y242`, `frozen-sea-presentation-render-v7`,
  `ice-redesign-interface-render-v7`, plus a new
  `ruleset-v7-skating-plain-move-ecnj.test.ts`. **Done** in `7r135`
  (`pulp_wars-ecnj`).

### Bead 4: the naval branch rebuilt (`7r137`)

- **Scope:** section 3.4: the Walrus to Rime; Harpoons replaces Black Ice;
  Ice Fortress replaces Hoarfrost (improvement, command, build rules,
  fortification and range on it); Under the Ice replaces Glacier (the dive
  moves here, +1 population per hole, Fortress and captured dock); thick
  ice, the cracked state, ice cover, and the Ice Harbour names go; captured
  docks stay plain docks. AI research, army growth, Fortress site choice;
  tech cards; new art (Ice Fortress sprite, three tech icons) through the
  PixelLab scripts with review; mission tech lists re-checked for the
  Walrus; rules doc 14, 14.4, 21.16.
- **Acceptance:** each node's unlocks match the table of 3.4 in the tree
  and on its card; a Yeti's attack on a boat shows and applies Harpoon +1;
  a Snow Hunter on an Ice Fortress shoots 3 tiles and is fortified; the
  Fortress is one per city and only on an active own Fishing Hole; a dive
  is refused without Under the Ice; one Crack breaks any ice; a captured
  Port stays open water after a Cold Snap beside it; the art passes its
  `art:*review` and the asset tests.
- **Validation note:** add `npm run art:validate` and the applicable
  `art:*review` command to the root's gates (asset-only rule).
- **Focused tests:** `ruleset-v7-naval-branch-*` (not `*.sim.test.ts`),
  `ruleset-v7-ice-redesign-build`, `ruleset-v7-ice-redesign-crack`,
  `ruleset-v7-frozen-sea-ground`, `ruleset-v7-frozen-sea-persistence`,
  `chibi-ice-folk-rework-assets`, `chibi-naval-branch-assets`, plus a new
  `ruleset-v7-ice-naval-branch-fofr.test.ts`.

### Bead 5: sea routes over ice only (`7r138`)

- **Scope:** section 3.5 for Ice Folk seats (endpoints, own-ice chain, no
  length limit, Cracks and endpoint occupants break links); other
  factions unchanged; the view's `naval.seaRoutes`, the economic preview,
  the Normal AI's valuation of holes and cracks; Rime's card and the "Hole
  links" Help row; rules doc 9.5.
- **Acceptance:** in hand-built states two holes ten tiles apart joined by
  own ice link, the same with one open tile do not, a Crack in the chain
  drops the connected population until the tile is refrozen, foreign ice
  in the chain breaks it, a captured Port links through the ice beside it,
  and a Human sea link under Ice Folk ice is unchanged; the AI values a
  crack that breaks an Ice Folk link above one that does not.
- **Focused tests:** the sea-link tests in `ruleset-v7-naval-branch-*` and
  `ruleset-v7-frozen-sea-*` (not `*.sim.test.ts`), `naval-presentation-render-v7`,
  plus a new `ruleset-v7-ice-sea-routes-fofr.test.ts`.

### Bead 6: Ice Folk campaign after the redesign (no ruleset bump)

- **Scope:** mission data only, as in CAMPAIGN.md section 27: replay the
  six Ice Folk missions under `7r138` and retune enemy starts (I3 first:
  the walking bridge replaces Freeze lines); record the results as a new
  CAMPAIGN.md section; re-pin the mission tables.
- **Needs the user's authorisation** for the `play-text` games (a whole-game
  run under the standing rule). Without it the bead only re-pins and lists
  what was not played.
- **Validation profile:** `ai/map/persistence` without simulations unless
  authorised; focused `campaign-ice-folk-v7` and `ruleset-v7-missions`.

## 7. Stat pass against the Human roster (`7r136`)

`pulp_wars-px48`, after bead 3. The user, 2026-11-08: "compare units with
equivalent human units and if they seem across the board better (same
stats but extra frost-related abilities) then let's nerf them a bit. lower
their hp or defence or higher cost. just a bit. Doesn't have to be exact
equivalence; one unit can be plain better than another but let's avoid
total dominance on every axis".

**Method.** Each Ice Folk unit is paired with the Human unit of the same
mechanical role (`ICE_FOLK_ROLE_RULES_V7` against `ORIGINAL_ROLE_RULES_V7`):
the slot both factions train, the Frost Giant against the Human reward
giant. The numeric axes are Coins (fewer is better), maximum HP, Attack,
Defense, Move, maximum range, and attack after moving. Glide over Snow and
ice, Mountain-born, cover on Snow and every other rule are abilities, not
axes. A unit **dominates** when it is at least its pair's equal on every
axis and has an ability on top; a dominating unit takes one small step
down (−1 or −2 HP, −0.5 Defense, or +1 Coin), a unit already worse on some
axis is left alone, and the 7r134 Snow Golem and Mammoth keep their
numbers unless they dominate (they do not).

**The table** (`7r135` values; Attack and Defense in whole points; range
is minimum–maximum; "AaM" is attack after moving; **bold** marks the axes
where the Ice Folk unit is worse):

| Role         | Human unit | Coins | HP  | Atk | Def                 | Move | Range | AaM | Human abilities                                        | Ice Folk unit | Coins | HP     | Atk   | Def     | Move | Range | AaM | Ice Folk abilities                                                            | Verdict                                       |
| ------------ | ---------- | ----- | --- | --- | ------------------- | ---- | ----- | --- | ------------------------------------------------------ | ------------- | ----- | ------ | ----- | ------- | ---- | ----- | --- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| `FIGHTER`    | Fighter    | 2     | 12  | 2   | 2                   | 1    | 1     | yes | Field Defense (Fortification)                          | Yeti          | 2     | **9**  | 2     | **1.5** | 1    | 1     | yes | Mountain-born; Rockfall (range 2 from a Mountain); Glide; no Field Defense    | worse on HP and Defense: unchanged            |
| `RAIDER`     | Raider     | 4     | 12  | 2   | 1                   | 2    | 1     | yes | Charge; Escape; Prowl (zones of control never stop it) | Sled          | 4     | 12     | 2     | 1       | 2    | 1     | yes | Charge; Escape; Glide (four frozen tiles a turn); no Prowl                    | **ties on every axis: 11 HP**                 |
| `MARKSMAN`   | Marksman   | 4     | 12  | 2   | 1                   | 1    | 1–2   | yes | none                                                   | Snow Hunter   | 3     | **8**  | 2     | 1       | 1    | 1–2   | yes | Cold Blood (+0.5 Attack on a Frozen target); Glide                            | cheaper but worse on HP: unchanged            |
| `GUARD`      | Guard      | 3     | 17  | 1.5 | 3 (1 against shots) | 1    | 1     | no  | Field Defense (Fortification)                          | Walrus        | **4** | **16** | 1.5   | **2**   | 1    | 1     | no  | Frostbite; Glide; no Field Defense                                            | worse on Coins, HP and Defense: unchanged     |
| `CAPTAIN`    | Captain    | 5     | 10  | 1   | 1                   | 1    | 1     | yes | Rally; Tend Wounded                                    | Ice Witch     | **6** | 10     | 1     | 1       | 1    | 1     | yes | Blizzard; Cold Snap; Glide; no Rally; no Tend Wounded                         | worse on Coins: unchanged                     |
| `CATAPULT`   | Catapult   | 8     | 10  | 3   | 0.5                 | 1    | 2–3   | no  | demolishes Field Defense                               | Snow Golem    | **9** | 10     | 3     | 1       | 1    | 2–3   | no  | Snowball; Mountain-born; Glide; demolishes Field Defense                      | worse on Coins: unchanged (the 7r134 numbers) |
| `KNIGHT`     | Knight     | 9     | 13  | 4   | 1                   | 3    | 1     | yes | Overrun (Chivalry)                                     | Frost Wyrm    | 9     | 14     | **3** | 1       | 3    | 1     | yes | Flies (Deep Water without Navigation); Frost Breath; Sight 2; never advances  | worse on Attack: unchanged                    |
| `SWORDSMAN`  | Champion   | 6     | 15  | 3.5 | 2.5                 | 1    | 1     | yes | none                                                   | Mammoth       | **8** | 20     | **3** | **2**   | 1    | 1     | yes | Sweep; Trample; Stampede; Glide                                               | worse on Coins, Attack and Defense: unchanged |
| `JUGGERNAUT` | Juggernaut | —     | 40  | 4   | 4                   | 1    | 1     | yes | Push; Crushing Shove (reward giant)                    | Frost Giant   | —     | **36** | 4     | 4       | 1    | 1     | yes | Cold Wake; Glacial Smash; Mountain-born; Glide; never advances (reward giant) | worse on HP: unchanged                        |

- **Ships:** none to pair. The Ice Folk tree unlocks no Patrol Boat,
  Battleship or Submarine (the frozen sea; bead 4 rebuilds the branch
  without ships), so the Human boats in `ICE_FOLK_ROLE_RULES_V7` are never
  trained, found or rewarded.
- **Other sources:** the treasure unit is a Sled (the Raider row), the
  starting unit and Militia a Yeti (the Fighter row), and the level-5+
  reward a Frost Giant (the Juggernaut row). No Ice Folk unit is hired,
  summoned or unlocked outside these nine rows.

**The one change: the Sled has 11 HP (12 before).** It was the only unit at
its pair's equal on every axis: since `7r133` (Escape for the Bolas, 12 HP)
it has the Raider's Coins, HP, Attack, Defense, Move, range and Sight, and
since `7r135` its Glide makes it a four-tile dash over Snow and ice. It
trades the Raider's Prowl for that Glide, so it was never strictly better,
but the numbers alone read "a Raider with frost on top", which is what the
user asked to avoid. One HP is the smallest step on the table: Coins +1
(25%) or Defense −0.5 (half its Defense) would change its role, while one
HP changes no common kill. A Human Knight (14 in the open) and two
Marksman shots (6 each) still kill it at full HP as before; a Charging
Raider (10) now leaves it 1 HP (2 before); a Gyrocopter bomb (6) leaves 5
(6 before). Promoted, it has 16 HP (17 before).

**Decisions.** (1) Range is compared by its maximum (the Golem's and the
Catapult's 2–3 tie; the Yeti's Rockfall reach from a Mountain is an
ability). (2) The Human Guard's Defense 1 against shots, Sight, cover and
the reward giants' missing cost are not axes; the giants tie on cost. (3)
`tests/unit/ruleset-v7-ice-folk-stat-pass-px48.test.ts` pins, for each pair,
the axes on which the Ice Folk unit gives way, and fails when an Ice Folk
unit is at its pair's equal on every axis unless the test lists the pair
as an exception with a reason; it lists none.
