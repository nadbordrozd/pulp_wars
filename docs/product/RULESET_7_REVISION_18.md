# Ruleset 7 revision 18: friendly pass-through, road bonus by origin, and the Showcase setup

**Status:** contract (`pulp_wars-6gd.1`), fully implemented. Sections 2–4
(identity, movement, roads, queries, AI, UI previews) are implemented by
`pulp_wars-6gd.2` and section 5 (Showcase setup) by `pulp_wars-6gd.3`; both
are folded into the [current rules](RULESET_7_CURRENT.md) (the Showcase is
its section 2.5). The section 5.3 ledger and income numbers were checked by
running the engine's ledger rules and are all correct; `pulp_wars-6gd.3`
only made the entity-ID order and the setup-screen seed explicit (sections
5.4 and 5.6). See [section 8](#8-implementation-split-and-sequencing).

**Ruleset ID:** `pulp-wars-poc-7r18`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (label unchanged; the
five generated map types are byte-identical to revision 17)

**Scope:** an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) (revision 17). It lets a
unit move through tiles held by its owner's units, makes the Road half cost
depend only on the tile being left, and adds a fixed `SHOWCASE` map type that
starts every seat with three developed cities, every technology, one unit of
every role, and the whole board explored. Every unmentioned revision-17 rule
stays in force for all three factions. Rulesets 5 and 6 and historical
Ruleset 7 fixtures remain frozen.

## 1. Sources and decided direction

The user's direction of 2026-10-01 (`pulp_wars-6gd`), after playing the
three-faction game:

- units pass over friendly units, on land and at sea, and cannot end on them;
- "movement bonus from roads should be calculated in such a way that there
  doesn't need to be a road on the destination tile for it to count. if there
  are tiles A B C in this order and a unit stands on A and the unit could
  normally only reach tile B then there just needs to be a road on A and B for
  the unit to reach C. It is not needed for there to be road on C.";
- "add an option to pick a map where you start with 3 developed cities and all
  tech discovered and 1 of each unit already present and so does your
  opponent. it can be a very simple map. 3/4 land and 1/4 water on one side.
  this is just to see what all the units are, what they look like. and make
  the map already explored as well".

The root's decisions: pass-through is for the mover's own units unless the
rules already treat allies like own units (they do not, see
[section 3.1](#31-rule)); a step costs half when the tile being **left** has
a usable Road.

## 2. Identity and compatibility

| Boundary                                   | Revision-18 value                              |
| ------------------------------------------ | ---------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r18`                           |
| Game-state schema                          | `7`                                            |
| Command/event/save/replay numeric versions | `7`                                            |
| Browser autosave                           | `pulpWars.save.v7r18.current`                  |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                     |
| Factions and trees                         | unchanged (`ORIGINAL`, `UNDEAD`, `GOBLIN`)     |
| `MapTypeV7`                                | the five revision-17 values, plus `SHOWCASE`   |
| Setup, state, command, event, view shapes  | unchanged (no key added, removed, or re-typed) |

- A revision-18 reader rejects `pulp-wars-poc-7r17` and every earlier Ruleset
  7 identity in setups, states, saves, and replays; there is no migration.
  `PRIOR_RULESET_7_IDS` gains `pulp-wars-poc-7r17` and stays gap-free.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r17.current` (the complete list is
  `pulpWars.save.v7.current` and its `v7r2` … `v7r17` successors, exactly the
  existing list plus `v7r17`), and preserves the Ruleset 6 save, settings, the
  art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-6gd.2`. `pulp_wars-6gd.3` adds the
  `SHOWCASE` map type under the same identity (the revision-16 precedent);
  between the two beads a `SHOWCASE` setup is `INVALID_SETUP`.
- Maps of the five generated types, their turn orders, and treasures are
  unchanged. Move legality and cost change, so recorded revision-17 command
  streams are not replayable and pinned match hashes change wherever a seat
  uses the new movement.

## 3. Friendly pass-through

### 3.1 Rule

"Own unit" means another unit on the board with the mover's `ownerId`, in any
form (land, embarked, naval). **Allied units are not own units**: an allied
unit blocks exactly as a hostile one does today.

A `MOVE` path `p1 … pn` is evaluated step by step as today, with these
changes to occupancy only:

1. A step that holds a unit of another player that the mover's owner can see
   is illegal with `OCCUPIED` (unchanged), wherever it is in the path.
2. The final step `pn` holding an own unit is illegal with `OCCUPIED`. A unit
   never ends a Move on an occupied tile.
3. An intermediate step holding an own unit is entered **as if it were
   empty**: same step cost, same entry requirements (terrain, technology,
   form, allied territory), same sight reveal from that tile, and the same
   stop rules.
4. Therefore an own-occupied tile on which the Move would have to stop cannot
   be passed: the path is illegal with the existing stop reason
   (`FOREST_STOPS_MOVE`, `MOUNTAIN_STOPS_MOVE`, `ZOC_STOPS_MOVE`, or
   `UNEXPLORED_INTERMEDIATE`). Own units never cancel hostile ZOC.

This applies identically to land units on land, naval units on water, and
embarked units on water, including a boat passing a dock tile that holds an
own unit and a land unit passing its own city center. It applies to the
Raider's escape Move. It applies to nothing but `MOVE`.

Why own units only: allies "share nothing else"
([current rules §3](RULESET_7_CURRENT.md#3-players-turns-and-victory)); they
do not share exploration, so an allied unit can be hidden from the mover,
while an own unit is always visible to its owner. Own-only keeps the rule
free of hidden information, and only AI seats are ever allied, so the human
player loses nothing.

### 3.2 Interactions

| Topic                           | Rule                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zone of control                 | Unchanged. A tile in visible hostile ZOC stops the Move, so it can be a destination only if empty and can never be passed through, occupied or not. Leaving ZOC stays free.                                                                                                                                                                                                                                      |
| Forest and Mountain stops       | Unchanged. An own unit standing in a Forest or on a Mountain can be passed only when that step would not stop the mover: a Road edge ([section 4.1](#41-rule)), or Fieldcraft Forest freedom for the `RAIDER` and `MARKSMAN` roles.                                                                                                                                                                              |
| Unexplored tiles                | Unchanged: entering one ends the Move, so it cannot be passed.                                                                                                                                                                                                                                                                                                                                                   |
| Cost, Charge, landing budget    | A passed tile costs its normal step cost and counts in the path length (`movedPathLength`), so it counts toward Charge's two cells and an embarked unit's landing budget.                                                                                                                                                                                                                                        |
| Interrupted Move                | See [section 3.3](#33-interrupted-moves).                                                                                                                                                                                                                                                                                                                                                                        |
| Advance, Overrun and Ram        | Unchanged. An advance enters the cell the dead defender left, which is empty; it is not a Move and passes through nothing. Overrun and Ram continue from that cell as today.                                                                                                                                                                                                                                     |
| Push                            | Unchanged. The cell behind the target must be empty; a unit is never pushed onto or through any unit.                                                                                                                                                                                                                                                                                                            |
| Reward-unit displacement        | Unchanged: the displaced occupant needs a free adjacent cell.                                                                                                                                                                                                                                                                                                                                                    |
| Auto-embark                     | Unchanged. Embarking needs the Move to end on an own active, **empty** dock, so a dock holding any unit cannot be embarked on (`OCCUPIED`). A land unit still enters water only as the final step, so it never passes through a dock.                                                                                                                                                                            |
| `DISEMBARK` reach               | Unchanged. The landing cell must be empty, and landing is legal only after at most a one-cell Move, which must itself end on an empty water cell. Pass-through therefore adds no landing cell; it only widens where a two-cell water Move can end.                                                                                                                                                               |
| Capture and siege               | Unchanged. Capture needs the unit to start its turn alone on the center; passing through a tile never besieges, captures, blocks training, or blockades. `CITY_SPAWN_OCCUPIED` still applies to any unit standing on the center.                                                                                                                                                                                 |
| Treasure, Field Defense, Graves | Unchanged: they resolve only on the tile where the Move ends.                                                                                                                                                                                                                                                                                                                                                    |
| Fog and observation             | The rule reads only own units, which their owner always sees, so the public validator and the engine agree and no hidden fact is exposed. Sight is revealed from every tile entered, passed tiles included. `UNIT_MOVED` and its projection are unchanged. When a viewer estimates the reach of a visible unit of another seat, that unit passes through the visible units of **its** owner and no other unit's. |

### 3.3 Interrupted moves

Today a Move is interrupted, and still accepted, in three cases: the next
step holds a unit the owner could not see before the command (`OCCUPIED`), the
next step turns out to be impassable terrain that was unexplored before the
command (`ENGINEERING_REQUIRED`), or the tile just entered is in hostile ZOC
that was not visible before the command (`ZOC`). The mover then stands on the
last tile it entered.

Revision 18 adds one fallback: **if that tile holds an own unit, the mover
ends on the last tile of the entered path that holds no unit, or on its
starting tile if there is none.** The starting tile is always free of other
units, so the fallback always exists and is deterministic.

- `UNIT_MOVED.path` is the entered path truncated to the final tile (the event
  is omitted when the mover stays on its starting tile, as today).
  `activation.moved` is true and `movedPathLength` is the truncated length.
- `UNIT_MOVE_INTERRUPTED` keeps its shape and meaning: `at` is the tile that
  could not be entered (`OCCUPIED`, `ENGINEERING_REQUIRED`) or the tile where
  the new ZOC was met (`ZOC`). With the fallback, `at` may be more than one
  cell from the mover's final tile.
- Exploration keeps every tile revealed up to the interruption, including
  sight from passed tiles beyond the final tile. Treasure, hostile Field
  Defense destruction, and blockade recomputation use the final tile.
- Every tile before the fallback tile was passed without a stop, so the
  fallback tile is always a legal place to end.

This case is rare by construction: an own unit normally has explored every
tile next to it. It can arise when an own unit was pushed or displaced onto a
tile whose neighbours its owner had not explored.

### 3.4 Queries, previews, UI, and AI

- `reachablePlayerMovementPathsV7` and the engine enumeration expand through
  own-occupied tiles and never return one as a destination. Each destination
  keeps the cheapest path; ties keep the existing enumeration order.
  `validatePlayerMovementPathV7` applies [section 3.1](#31-rule) with
  "own unit" meaning a visible unit with the moving unit's `ownerId`. Every
  offered `MOVE` is accepted by the engine.
- The UI highlights only legal destinations (never an own-occupied tile) and
  may draw the path over own units. Help text: "Units can move through your
  own units but cannot stop on them."
- The Normal AI moves only through offered commands, so it uses pass-through
  automatically. Its own route estimates must follow the same rule: the
  replacement-defender path search in `src/ai/v7.ts` and the endgame distance
  fields in `src/ai/v7-endgame.ts` treat own-occupied tiles as passable but
  not as end tiles. Threat reach of visible hostile units comes from the
  public enumeration and so includes pass-through for their owner.

## 4. Road bonus by origin

### 4.1 Rule

**Usable Road node** (unchanged, the revision-17 rule of
[current rules §9.1](RULESET_7_CURRENT.md#91-road-usability)): for a player
who has researched Roads, a land tile that has a Road and is neutral or in
that player's territory, or the center of a city that player owns. A Road in
another player's territory, allied or hostile, is not usable. Without Roads
no tile is a usable node.

- **Cost.** A step costs 1 half-point when the tile being left is a usable
  Road node for the mover's owner, and 2 otherwise. The tile being entered
  does not matter: it needs no Road, and it may be unexplored, a Forest, a
  Mountain, or a dock the unit embarks on.
- **Entering a Road tile from a roadless tile costs 2.**
- **Stops are unchanged.** The Forest and Mountain stop is ignored only on a
  **Road edge**: a step whose two ends are both usable Road nodes. A half-cost
  step onto a roadless Forest or Mountain still ends the Move there. Mountain
  entry still needs Engineering.
- Steps that leave a water tile always cost 2 (water has no Roads), so naval
  and embarked movement is unchanged. Movement edges still need no connection
  to the capital. Road population, land trade, and Road construction are
  unchanged.

### 4.2 What changes from revision 17

Revision 17 charged 1 only when **both** ends were usable Road nodes and the
entered tile was explored land. The only steps whose cost changes are those
that leave a usable Road node and enter a tile that is not one (roadless
land, another player's Road, an unexplored tile, or a dock): 2 becomes 1. No
step becomes more expensive, so every Move legal in revision 17 on the same
board is still legal.

### 4.3 Worked examples

Tiles `T0 T1 T2 …` lie in a line, the unit starts on `T0`, `R` is a usable
Road node, `-` is open Grass with no Road, and no stop applies. Budget is
`2 * Move` half-points.

| Move | Tiles `T0 T1 T2 T3 T4 …` | Revision 18: costs, farthest tile | Revision 17 farthest tile |
| ---: | ------------------------ | --------------------------------- | ------------------------- |
|    1 | `R R -` (the user's ABC) | 1 + 1 = 2, reaches `T2`           | `T1`                      |
|    1 | `R - -`                  | 1, then 2 more is 3: `T1`         | `T1`                      |
|    1 | `- R R`                  | 2: `T1`                           | `T1`                      |
|    1 | `R R R -`                | 1 + 1 = 2: `T2`                   | `T2`                      |
|    2 | `R R - - -`              | 1 + 1 + 2 = 4: `T3`               | `T2`                      |
|    2 | `R - - -`                | 1 + 2 = 3: `T2`                   | `T2`                      |
|    2 | `- R R - -`              | 2 + 1 + 1 = 4: `T3`               | `T2`                      |
|    2 | `R R R R - -`            | 4 × 1 = 4: `T4`                   | `T3`                      |
|    3 | `R R - - - -`            | 1 + 1 + 2 + 2 = 6: `T4`           | `T3`                      |
|    3 | `R R R R R R - -`        | 6 × 1 = 6: `T6`                   | `T5`                      |

- A single Road tile under the unit never adds a tile: the half-point saved
  cannot pay for another full step.
- In general a Road run no longer needs its last tile: `2 * Move` steps need
  Roads on the `2 * Move` tiles left, not on `2 * Move + 1` tiles.
- Stop example: `T0` is `R`, `T1` is a roadless Forest. The step costs 1 and
  the Move ends on `T1` (no Road edge). If `T1` is a Forest with a usable
  Road, the unit does not stop and its next step costs 1.
- Embark example: a Move-1 unit on a Road tile next to its city center, whose
  center is next to an own active empty Port, reaches the Port and embarks in
  one Move (1 + 1).

### 4.4 Queries, UI, and AI

- The engine and public step-cost functions use the same origin-only rule, so
  previews, offered paths, and reach estimates agree with the engine. The
  capability field keeps its name `connectedOrthogonalStepCost2`.
- UI text for Roads (technology tree and help): "Leaving a Road tile costs
  half a move; the tile you move onto needs no Road."
- The Normal AI reads the public enumeration. Its Road corridor still builds
  every missing tile from the original capital to the chosen city (the last
  tile matters for Road population even though movement no longer needs it).

## 5. Showcase setup

### 5.1 Representation

`SHOWCASE` is a sixth `mapType`. Reasons: the setup already has exactly one
field that selects the board, so no key is added and the exact-key setup,
save, and replay schemas keep their shape; a separate flag would need rules
for its combination with each map type and size.

| Setup field           | `SHOWCASE` rule                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `width`, `height`     | exactly 16; any other size is `INVALID_SETUP`                                                          |
| `aiCount`             | 1–3 (2–4 seats), as in a normal setup                                                                  |
| `aiMode`              | `RIVAL` or `COOPERATIVE`, unchanged meaning                                                            |
| `factions`            | any faction per seat, as in a normal setup                                                             |
| `humanColor`          | unchanged                                                                                              |
| `seed`                | any uint32; it does not affect the board, cities, units, or turn order                                 |
| Turn order            | seat order, seat 0 (the human) first                                                                   |
| `random`              | the Mulberry32 initial state for the seed with no draw consumed (`mapAttempt` is reported as 1)        |
| Generation invariants | none apply (spacing, fairness, growth guarantee, port reachability, land share); the board is the rule |

Setups that differ only in `seed` produce the same state except `setup.seed`
and `random`. Setups that differ only in `factions` produce the same board,
cities, contributions, unit positions, and IDs.

### 5.2 Board

Coordinates are `(x, y)` with `(0, 0)` first in `(y, x)` order. The board is
16 x 16: rows `y = 0–11` are land (192 tiles, three quarters) and rows
`y = 12–15` are water (64 tiles, one quarter, along the high-`y` side).

- **Water.** `y = 12` is `SHALLOW_WATER` (it shares an edge with land);
  `y = 13–15` is `DEEP_WATER`. Fish on `(x, 12)` and Pearls on `(x, 14)` for
  `x` in 0, 4, 8, 12.
- **Land.** Every land tile has biome `PLAINS` and terrain Grass with no
  resource, except as stated below and in the city templates.
- **Feature rows.** On `y = 0`, even `x` is Mountain and odd `x` is Forest;
  Ore on the Mountains with `x % 4 = 0` and Game on the Forests with
  `x % 4 = 1`. On `y = 1`, Fruit where `x % 4 = 2` and Fertile Ground where
  `x % 4 = 3`.
- No village, no treasure chest, no Grave, no Field Defense, no Monument.

**Strips.** Strip `k` (0–3) has center column `cx = 4k + 2` and holds one
seat's three cities in columns `cx − 1 … cx + 1`. Columns 0, 4, 8, and 12
stay neutral. Seat 0 uses strip 0; AI seat `i` (1 … `aiCount`) uses strip
`3 − aiCount + i`, so the AI seats fill the strips farthest from the human.
A strip without a seat keeps the plain land and water rules above.

### 5.3 Cities

Each seat has three cities in its strip. All tiles are relative to `cx`.

| City    | Center     | Site      | Level | Rewards recorded (levels 2, 3, …) | Permanent | Live | Population |
| ------- | ---------- | --------- | ----: | --------------------------------- | --------: | ---: | ---------: |
| North   | `(cx, 3)`  | `CITY`    |     4 | `SURVEY`, `WALLS`, `TREASURY_8`   |         0 |   11 |          2 |
| Capital | `(cx, 7)`  | `CAPITAL` |     5 | `SURVEY`, `WALLS`, `BOOM`, …¹     |         4 |   10 |          0 |
| Coast   | `(cx, 11)` | `CITY`    |     3 | `SURVEY`, `WALLS`                 |         0 |    8 |          3 |

¹ The capital's fourth record is `JUGGERNAUT` (level 5).

Each city owns exactly its centered 3 x 3 footprint (`landGrantUsed` and
`expanded` are false, `cityActionAvailable` is false until the owner's Start
Turn). Reward records are history only: setup grants no Coins, exploration,
or unit for them, and no reward choice is pending. Every city has Walls.

| City    | Tile           | Content                               | Live population |
| ------- | -------------- | ------------------------------------- | --------------: |
| North   | `(cx − 1, 2)`  | Forest, Lumber Camp                   |               1 |
| North   | `(cx + 1, 2)`  | Mountain, Ore, Mine                   |               2 |
| North   | `(cx − 1, 3)`  | Sawmill (two adjacent Lumber Camps)   |               2 |
| North   | `(cx + 1, 3)`  | Forge (two adjacent Mines)            |               2 |
| North   | `(cx − 1, 4)`  | Forest, Lumber Camp                   |               1 |
| North   | `(cx, 4)`      | Road                                  |               — |
| North   | `(cx + 1, 4)`  | Mountain, Ore, Mine                   |               2 |
| Capital | `(cx − 1, 6)`  | Fertile Ground, Farm                  |               2 |
| Capital | `(cx, 6)`      | Road                                  |               — |
| Capital | `(cx + 1, 6)`  | Fertile Ground, Farm                  |               2 |
| Capital | `(cx − 1, 7)`  | Windmill (two adjacent Farms)         |               2 |
| Capital | `(cx + 1, 7)`  | Market (one adjacent family: 2 Coins) |               — |
| Capital | `(cx − 1, 8)`  | Fertile Ground, Farm                  |               2 |
| Capital | `(cx, 8)`      | Road                                  |               — |
| Coast   | `(cx − 1, 10)` | Fertile Ground, Farm                  |               2 |
| Coast   | `(cx, 10)`     | Road                                  |               — |
| Coast   | `(cx + 1, 10)` | Forest, Game                          |               — |
| Coast   | `(cx − 1, 11)` | Workshop (one adjacent basic type)    |               2 |
| Coast   | `(cx + 1, 11)` | Fruit                                 |               — |
| Coast   | `(cx − 1, 12)` | Port                                  |               1 |
| Coast   | `(cx + 1, 12)` | Shipyard                              |               2 |

- Roads also lie on the neutral tiles `(cx, 5)` and `(cx, 9)`, so the Road
  line `(cx, 4) … (cx, 10)` joins the three centers. Road population is
  therefore +2 for the capital and +1 for each other city, included in the
  Live column above (North 10 + 1, Capital 8 + 2, Coast 7 + 1).
- The capital's permanent population is the `BOOM` record (3, at its center)
  plus one `HARVEST_FRUIT` record (1) at `(cx + 1, 8)`. No other permanent
  record exists.
- The population ledger is the ordinary one: every improvement except the
  Market has its live contribution record with the value the spatial rules
  compute, and every city satisfies
  `population = permanent + live − growthSpent(level)` with
  `0 <= population <= level`.
- Expected first income (current rules §4.3): capital 4 + 1 + 2 (Market) = 7;
  North 4 + 1 land trade = 5; Coast 3 + 1 land trade = 4; 16 for a Human or
  Undead seat and 14 for a Goblin seat (Plunder replaces land trade). No city
  has sea trade.

### 5.4 Players and units

- **Technology:** every seat has all 23 technologies, in `TECHNOLOGY_IDS_V7`
  order. Nothing is left to research; the free opening technology does not
  apply. The Dry Land Naval restriction does not apply.
- **Coins:** 5, as in a normal setup. The first seat's Start Turn runs at
  creation and pays its income (21 Coins for a Human or Undead first seat, 19
  for a Goblin one).
- **Exploration:** every seat has all 256 cells explored, so every unit is
  visible to every seat.
- **Achievements:** the three entitlements start locked and are evaluated by
  the ordinary rule, so Explorer and Muster unlock at each seat's first
  evaluation; Engineer does not (no processor reaches 6).
- **Units:** one unit of each of the ten mechanical roles, in the seat's
  faction (the `JUGGERNAUT` role is the Juggernaut, Abomination, or Troll).
  Every unit is at full HP with zero kills and a fresh, unexhausted
  activation, like the normal starting unit.

| Role          | Tile          | Form  | Home city |
| ------------- | ------------- | ----- | --------- |
| `FIGHTER`     | `(cx, 7)`     | land  | Capital   |
| `RAIDER`      | `(cx − 1, 5)` | land  | North     |
| `MARKSMAN`    | `(cx, 5)`     | land  | North     |
| `GUARD`       | `(cx + 1, 5)` | land  | North     |
| `CAPTAIN`     | `(cx − 1, 9)` | land  | Capital   |
| `CATAPULT`    | `(cx, 9)`     | land  | Capital   |
| `KNIGHT`      | `(cx + 1, 9)` | land  | Capital   |
| `JUGGERNAUT`  | `(cx + 1, 8)` | land  | Capital   |
| `PATROL_BOAT` | `(cx, 12)`    | naval | Coast     |
| `BATTLESHIP`  | `(cx, 13)`    | naval | Coast     |

- **Capacity.** Showcase creation performs no capacity check. The homes above
  nevertheless fit: Capital 5 of 7, North 3 of 6, Coast 2 of 5 (each capacity
  is one higher for a Goblin seat), so training is possible from the first
  turn. Both docks start empty and active.
- **Entity IDs.** As today, seat `s` has capital ID `2s + 1` and `FIGHTER` ID
  `2s + 2`. Then three passes, each over all seats in seat order: every
  seat's North and Coast cities; then every seat's contribution records (per
  city in the order capital, North, Coast: permanent records, then live
  records, each in `(y, x)` tile order); then every seat's remaining units
  in the role order of the table. With four seats the cities are IDs 1–16
  (odd 1–7 capitals, 9–16 North and Coast), the records 17–80, and the
  remaining units 81–116.

### 5.5 Play, AI, saves

- The match is an ordinary Ruleset 7 match from the first Start Turn on:
  every rule, victory and elimination, city rewards for later levels,
  capacity, and research (nothing offered) are unchanged.
- The Normal AI plays its ordinary policy with no Showcase-specific logic.
- Saves, autosave, resume, and replays work unchanged: the state is an
  ordinary valid `GameStateV7`, and a replay recreates the initial state from
  its setup.
- The headless CLI accepts `showcase` for `--map-type` and `--map-types`
  (size 16 only: the size defaults to 16 for every seat count, another
  `--size` is an error, and a batch that lists `showcase` runs all of its
  map types at 16). No balance or validation matrix includes it by default.

### 5.6 Setup screen

The "Map" select gains a last option **Showcase** with the description "A
fixed demo map: three developed cities, every unit, all technology, map
revealed." Continents stays the default. While Showcase is selected the Size
select offers only 16 x 16 (and is disabled) and the "Map seed" control is
hidden; the submitted setup carries seed 0, whatever the hidden seed field
holds. Choosing another map brings back the player's earlier size and seed
choice. Opponents, Mode, Color, and the per-seat faction selects work as
usual. In a match the map label reads "Showcase".

## 6. Commands, events, errors, views

- **Commands and events:** no new kind and no shape change. `MOVE` legality
  and cost change ([sections 3](#3-friendly-pass-through) and
  [4](#4-road-bonus-by-origin)); `UNIT_MOVED.path` may cross own-occupied
  tiles; `UNIT_MOVE_INTERRUPTED.at` may be non-adjacent to the final tile.
- **Errors:** none new. `MOVEMENT_ILLEGAL` keeps its reasons; `OCCUPIED` now
  means a visible unit of another player anywhere in the path, or any unit
  on the final step. A `SHOWCASE` setup with a size other than 16 is
  `INVALID_SETUP`.
- **Views and queries:** shapes unchanged; movement offers, reach, and step
  costs follow the new rules. `view.setup.mapType` may be `SHOWCASE`.

## 7. Normal AI

No new heuristic. Required: the AI's private path searches follow
[section 3.4](#34-queries-previews-ui-and-ai) and
[section 4.4](#44-queries-ui-and-ai); decisions stay deterministic, PRNG-free,
and based on public information. Pinned AI hashes are expected to change in
most matches; the implementation bead re-pins them and explains the diffs.

## 8. Implementation split and sequencing

| Order | Bead              | Scope                                                                                                                                                                                                                                                                                                   |
| ----: | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | `pulp_wars-6gd.2` | Identity and save cleanup (section 2); pass-through (section 3) and Road cost (section 4) in the engine, public validator and enumerations, AI path searches, and UI previews and texts; re-pinned fixtures; current rules §1, §9.2, §12.1, §14, §16, and the revision history folded for sections 2–4. |
|     2 | `pulp_wars-6gd.3` | `SHOWCASE` map type (section 5): setup parsing, initial state, setup screen, headless CLI, smoke probe; current rules §2 and §3 folded for section 5.                                                                                                                                                   |

`6gd.2` goes first because it owns the identity and every fixture refresh;
`6gd.3` then adds one map type that changes no existing match.

## 9. Test expectations

### 9.1 `pulp_wars-6gd.2`

| Area         | Required evidence                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity     | exact 7r18 identity; 7r17 setup/state/save/replay rejection; gap-free prior list; obsolete-key cleanup through `v7r17`; release contract and browser smoke scripts updated                                                                                                                                                                                                                                 |
| Pass-through | fixed boards: a Move-2 unit passes one own unit and ends beyond it; ending on an own unit is `OCCUPIED`; a visible allied unit and a visible hostile unit block as intermediates; an own unit in a roadless Forest, on a Mountain, or in hostile ZOC cannot be passed (the three stop reasons); Fieldcraft and Road-edge exceptions pass; naval through an own boat; embarked through an own embarked unit |
| Interactions | embark onto a dock holding an own unit rejected; `DISEMBARK` offers unchanged by an own unit on the adjacent water cell; Push and advance unchanged; treasure and hostile Field Defense untouched on a passed tile; Charge counts passed cells                                                                                                                                                             |
| Interruption | a handcrafted state for each interruption reason with the mover on an own-occupied tile: final tile is the last free tile (and the starting tile when none), `movedPathLength`, event payloads, and kept exploration as in section 3.3                                                                                                                                                                     |
| Road cost    | every row of the section 4.3 table for Move 1, 2, and 3; another player's Road and a Road without the Roads technology cost 2; roadless Forest after a Road tile stops; Road Forest does not; the embark example; an unexplored destination from a Road tile costs 1                                                                                                                                       |
| Parity       | for sampled states, the public enumeration equals the engine enumeration for the owner, and every offered `MOVE` is accepted; revision-17 fixture diffs explained                                                                                                                                                                                                                                          |
| AI and UI    | AI path-search tests for own-occupied corridors; headless Normal sample with no policy error; move preview highlights and texts                                                                                                                                                                                                                                                                            |

Profile: `ai/map/persistence`, with the gates set in the bead.

### 9.2 `pulp_wars-6gd.3`

| Area        | Required evidence                                                                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup       | `SHOWCASE` accepted at 16 for 1–3 AI and every faction mix; rejected at other sizes; the five other map types byte-identical to before                                                                                                                         |
| Board       | 192 land and 64 water tiles; Shallow exactly on `y = 12`; the feature rows; strips by seat count; unused strips plain                                                                                                                                          |
| Cities      | for every seat: three cities with the section 5.3 centers, levels, rewards, territories, improvements, Roads, ledger values, and populations; Walls on each; no pending choice; the stated first income                                                        |
| Players     | 23 technologies; 256 explored cells; 5 Coins before the first Start Turn; Explorer and Muster unlocked after the first evaluation                                                                                                                              |
| Units       | ten units per seat with the section 5.4 roles, tiles, forms, homes, and IDs; faction labels (Juggernaut, Abomination, Troll); no capacity exceeded                                                                                                             |
| Determinism | equal setups give equal state hashes; a different seed changes only `setup.seed` and `random`; a different faction mix keeps board and positions                                                                                                               |
| Play        | the initial state passes `parseGameStateV7`; save and replay round trip; headless Normal-against-Normal Showcase matches (each faction, 2 and 4 seats, 20 rounds) with no policy error; every role of every faction has at least one offered command on turn 1 |
| UI          | the setup option, forced size, description, and in-match label; a browser smoke probe that starts a Showcase match and sees ten own units                                                                                                                      |

Profile: `ai/map/persistence`, with the gates set in the bead.

## 10. Decisions made in this spec

Each fills a gap in the user's direction with the simplest rule consistent
with the engine; the user may change any of them.

1. **Own units only.** Allies block like hostile units
   ([section 3.1](#31-rule)).
2. **A passed tile obeys every stop rule.** An own unit in a roadless Forest,
   on a Mountain, or in hostile ZOC cannot be passed, because an empty tile
   there would end the Move.
3. **Interruption fallback:** the last unoccupied tile of the entered path,
   else the starting tile; exploration gained is kept.
4. **Pass-through is `MOVE` only.** Push, advance, displacement, embarking,
   and landing still need an empty tile.
5. **Road cost reads only the tile left.** The entered tile's Road,
   exploration, and terrain are irrelevant, which keeps the public cost equal
   to the engine cost. As a consequence the embark step from a Road tile or
   own city center costs half.
6. **The stop exemption keeps the two-ended Road edge.** A Road through a
   Forest still makes it passable; a Road tile next to a roadless Forest does
   not.
7. **`SHOWCASE` is a map type**, fixed at 16 x 16, ignoring the seed, with
   turn order in seat order.
8. **Water on the high-`y` side**, exactly four rows; all land `PLAINS`.
9. **City levels 5, 4, 3** with an honest population ledger, Walls
   everywhere, and one family per city: agriculture and Market in the
   capital, timber and metal in the North city, docks and a Workshop on the
   coast. Ten of the eleven improvements appear; the Monument does not.
10. **Units within capacity**, not exhausted, standing on the neutral rows
    and Road tiles between the cities, so the first turn can try
    pass-through and the Road rule at once.
11. **5 Coins and ordinary income**; achievements evaluated normally; no
    villages or treasure.
12. **AI seats take the far strips**; with three AI seats all four strips are
    used.
13. **One identity bump** in `pulp_wars-6gd.2`; `pulp_wars-6gd.3` adds the
    map type under `pulp-wars-poc-7r18`.

## 11. Concerns

- **Balance.** Pass-through removes body-blocking of one's own units and the
  Road change lengthens Road moves by one tile; both speed up reinforcement
  and Knight, Vampire, and Scrap Buggy strikes. No balance run is specified;
  `pulp_wars-6gd.2` should report game length and cap rate before and after
  on its headless sample.
- **Fixture churn.** Most pinned AI hashes and natural-play fixtures will
  move, since movement offers change in nearly every match.
- **Half-cost embark** (decision 5) is a side effect of the origin-only rule.
  Excluding it would make the cost depend on the entered tile's terrain,
  which the public view does not know for an unexplored tile.
- **Enumeration cost.** Expanding through own units enlarges the search in
  crowded formations; the public-planning benchmarks should be rechecked.
- **Showcase proximity.** Seats in neighbouring strips start one neutral
  column apart with all units ready, so a four-seat Showcase turns into a
  fight on the first turn. Two-seat matches start ten columns apart.
- **Showcase city centers** in strip 3 are one cell from the board edge and
  capitals are four columns apart, outside the generator's spacing rules.
  Nothing in the state schema requires those rules, but UI or AI code that
  assumes them must be checked in `pulp_wars-6gd.3`.
- **Biome art.** All Showcase land is `PLAINS`; if ground art differs by
  biome, Woodland and Highlands ground will not appear.
- **Undead and Goblin economy art** and the Monument are not shown by the
  Showcase; faction city sprites (`pulp_wars-6gd.6`) are, at levels 3–5.
