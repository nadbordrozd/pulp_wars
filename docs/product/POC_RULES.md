# Pulp Wars POC Rules

**Status:** authoritative implementation target for the fifth-play POC

**Ruleset ID:** `pulp-wars-poc-5`

This fifth-play ruleset supersedes `pulp-wars-poc-4` for new matches. It keeps
the ruleset-4 map, economy, technology, Catapult, city, activation, Large/Huge,
and cooperative-AI rules except where section 0 replaces them. Per-seat faction
identity, faction rosters, Chocolate Wall entities, dynamic territory, and new
command/event unions change canonical state and deterministic policy, so
ruleset-1 through ruleset-4 saves/replays are intentionally incompatible;
section 13 defines the exact compatibility behavior.

**Research basis:** [Polytopia core reference](../research/POLYTOPIA_CORE_REFERENCE.md)

**Presentation contracts:** [screen flow](../ui/SCREEN_FLOW.md),
[client architecture](../architecture/CLIENT_ARCHITECTURE.md), and
[art direction](../art/ART_DIRECTION.md)

This document decides the POC game rules. Where the research could not establish
an original-game rule, this document makes a deliberate, testable Pulp Wars
choice. Research terminology such as Warrior is a temporary POC content label,
not a claim to final faction naming.

## 0. Ruleset-5 replacement contract

This section is the compact change boundary from ruleset 4. Its exact rules
replace any stale one-faction, fixed-territory, unit-only-combat, version-4, or
five-unit-roster wording later in this file; all unmentioned rules remain
unchanged. The retained Forest economy, varied map algorithm, Catapult, and
presentation rules in sections 0.9 through 0.12 remain normative after the
identifier/version updates below.

### 0.0 Version and frozen identifiers

Ruleset ID, game-state schema, command/event envelopes, replay, and save are all
version 5. Serialized `FactionId` values and frozen order are `ORIGINAL`, then
`CANDY`; human-facing labels are **Original** and **Candy**. Factions may repeat
across seats. A player's faction is immutable for the match and applies to every
unit that player owns; no conversion or faction-changing command exists.

The setup adds required `factions`, an array in seat order of length
`aiCount + 1`. Seat 0 is the one Human and seats 1 through `aiCount` are Normal
AI. `PlayerState` repeats its own `faction` from the corresponding setup entry;
state validation rejects disagreement. Demo stores
`factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL"]` so its established content
remains stable. Faction selection consumes no PRNG draw and never changes map,
capital, color, or turn-order shuffles.

Ruleset 5 adds branded `WallId`, monotonic from the same global entity-ID
allocator as cities and units, and `GameState.chocolateWalls`, sorted by ID.
`nextEntityId` is still never reused. The exact active schema additions are:

```ts
type FactionId = "ORIGINAL" | "CANDY";
type CardinalDirection = "NORTH" | "EAST" | "SOUTH" | "WEST";

interface MatchSetup {
  // retained v4 fields, with rulesetId: "pulp-wars-poc-5"
  readonly factions: readonly FactionId[]; // exact seat order and length
}

interface PlayerState {
  // retained fields
  readonly faction: FactionId;
}

interface UnitActivation {
  // retained fields
  readonly specialActed: boolean; // reset false at Start Turn
}

interface ChocolateWallState {
  readonly id: WallId;
  readonly ownerId: PlayerId;
  readonly at: Coord;
  readonly hp: number; // positive integer, initially/max 10
}
```

`UnitState.type` stores a mechanical archetype, while public labels and art are
derived from the owner's faction. Frozen archetype order remains `WARRIOR`,
`ARCHER`, `DEFENDER`, `RIDER`, `CATAPULT`; no Candy name enters this union.
This avoids duplicating equal combat tables and makes a replay's mechanics
independent of localized names.

| Archetype | Original label | Candy label    | Candy rules delta                 |
| --------- | -------------- | -------------- | --------------------------------- |
| Warrior   | Warrior        | Candy Warrior  | Same stats/abilities/unlock       |
| Archer    | Archer         | Gumball Guard  | Same stats/abilities/unlock       |
| Defender  | Defender       | Choco Engineer | Adds Build Chocolate Wall         |
| Rider     | Rider          | Donut          | Move 1, no Attack/Escape; Roll    |
| Catapult  | Catapult       | Catapult       | Same shared sprite/stats; Candify |

Candy Warrior is exact Warrior parity. Gumball Guard is exact Archer parity,
including cost, Archery unlock, range, Dash/Fortify, combat, and the ranged
presentation timing in section 0.7, but uses a gumball projectile rather than
an arrow. Choco Engineer is exact Defender parity plus its build action. Candy
Catapult intentionally reuses the current Catapult mechanics and production
sprite; because its owner is Candy it receives Candify. Original units never
receive Candy actions. Cities, terrain, technology, resources, economy, and
Catapult are otherwise faction-neutral in v5.

### 0.1 Donut contract

Donut uses Rider's cost 3, max HP 10, defense 1, Fortify, and Riding unlock,
but has move 1, attack 0, range 0, and no Dash or Escape. `ATTACK` and
`ESCAPE_MOVE` are never legal or enumerated for it. It may Move, Recover, Wait,
Promote, Capture, or Candify under the ordinary lifecycle rules.

`KAMIKAZE_ROLL { unitId, direction }` is available to a ready Candy Rider only
before Move, Recover, Capture, Candify, Build, or a prior Roll. `handled` alone
does not block it, so Wait retains the action. A direction is legal only when
the cardinally adjacent coordinate in that direction is on-board. The path is
every coordinate after the Donut through and including the board-edge cell,
in travel order. It ignores terrain, Climbing, Forest terminal movement, ZOC,
territory, units, and Chocolate Walls; none stops or shortens the roll. The
starting cell is not part of the path and is never damaged.

For each path coordinate in travel order, resolve exactly this sequence:

1. emit `DONUT_ROLL_STEP { unitId, at }`;
2. add only `at` to the owner's persistent explored set if it was unknown and
   emit `TILES_REVEALED { playerId, tiles: [at] }`; never reveal a neighbor;
3. if the cell contains a living unit other than the rolling Donut, subtract
   `min(10, hp)` ignoring defense, Fortify, terrain, City Wall, faction, and
   relationship, then emit `ROLL_DAMAGE_RESOLVED` with source, target, cell,
   damage, prior HP, and resulting HP;
4. otherwise, if it contains a Chocolate Wall, apply the same fixed damage and
   event shape to that wall;
5. when that target reaches zero, immediately emit
   `UNIT_DIED { cause: "KAMIKAZE_ROLL" }` or
   `CHOCOLATE_WALL_DESTROYED { cause: "KAMIKAZE_ROLL" }` and remove it before
   continuing to the next cell.

A board cell cannot contain both a unit and Chocolate Wall, so there is never a
same-cell target-order tie. Damage on later cells is calculated from the state
after earlier deaths. All victims are damaged, including the actor's units and
walls and cooperative allies. Friendly and allied unit deaths count as losses
for their owner but never as kills for the rolling player; hostile unit deaths
count in the rolling player's match tallies but cannot promote the Donut because
it is sacrificed. Wall destruction never counts as a unit kill or loss.

After the final cell, emit
`UNIT_DIED { unitId, cause: "KAMIKAZE_ROLL_SELF" }`, remove the Donut, and
evaluate invariant/outcome checks. Its starting tile becomes empty; it never
occupies a traversed cell. The sacrifice counts as one loss for its owner and
no player's kill. The entire roll is one atomic command and one
`commandIndex` increment, consumes no PRNG, and cannot be interrupted by a
pending choice. Victim damage/deaths are not simultaneous in the reducer: they
resolve strictly in traversal order, although no command may interleave. That
order is the sole deterministic tie-break for events, tallies, and presentation.

After common match/outcome/active-player/pending-choice gates, validation order
is `UNIT_NOT_FOUND`, `UNIT_NOT_OWNED`, `UNIT_NOT_READY`,
`UNIT_TYPE_INVALID { expected: "CANDY_DONUT" }`, `UNIT_ALREADY_ACTED`, then
`ROLL_DIRECTION_INVALID { direction }`. Rejection is atomic and reveals no
contents along the proposed line.

### 0.2 Choco Engineer and Chocolate Wall contract

`BUILD_CHOCOLATE_WALL { unitId, at }` costs 1 star. It is available only to a
ready Candy Defender before Move, Attack, Recover, Capture, Candify, or a prior
Build; Wait does not block it. `at` must be one of the eight Chebyshev-adjacent
on-board explored cells. It may contain Grass, Mountain, Forest, Fruit, Ore,
Animal, Mine, or Lumber Mill. It may not contain any unit, Chocolate Wall, or
settlement site (`CAPITAL`, `VILLAGE`, or `CITY`). The actor need not own the
target territory. In cooperative mode an AI cannot build in an allied AI's
territory; the human has no ally.

Acceptance deducts 1 star, allocates one wall with the active player as owner,
10 HP and the target coordinate, marks the Engineer's activation
`handled = true`, `specialActed = true`, and fully acted, then emits
`CHOCOLATE_WALL_BUILT { playerId, unitId, wallId, at, cost: 1, hp: 10 }`.
It increments `commandIndex` once and consumes no PRNG. Existing terrain,
resource, improvement, site, and territory fields are unchanged.

After common gates, validation order is `UNIT_NOT_FOUND`, `UNIT_NOT_OWNED`,
`UNIT_NOT_READY`, `UNIT_TYPE_INVALID { expected: "CANDY_CHOCO_ENGINEER" }`,
`UNIT_ALREADY_ACTED`, `TILE_NOT_FOUND`, `TILE_UNEXPLORED`,
`WALL_TARGET_NOT_ADJACENT`, `WALL_INVALID_TILE` (settlement, unit, or wall),
`ALLY_TERRITORY_FORBIDDEN { at }`, then
`INSUFFICIENT_STARS { cost: 1 }`.

A Chocolate Wall is a destructible structure, not a unit. It has owner, cell,
and 10 current/max HP, defense 0, no range, activation, home city, capacity,
vision, ZOC, movement, retaliation, recovery, promotion, capture, Candify, or
income. It blocks ordinary Move/Escape occupancy but does not prevent a
unit-free Fruit/Hunt/Lumber/Mine tile action on the same cell. It persists when
territory beneath it changes owner, its city is captured, or its owner is
eliminated; only damage to zero removes it.

`ATTACK` targets the exhaustive `CombatTargetRef` union of a unit or Chocolate
Wall. Unit targeting retains ordinary hostility rules. Any player may target a
visible wall, including its own or an allied wall; `TARGET_ALLIED` does not
apply to walls. Range, attacker readiness, one-attack, Dash, and exploration
rules still apply. A wall contributes zero defense force, receives no terrain,
city, or reward bonus, and never retaliates. The ordinary rational combat
formula and health-scaled attacker force determine damage; this is not fixed
10 damage. A destroyed adjacent wall permits melee advance only when the target
cell is otherwise enterable under ordinary terrain-technology and occupancy
rules; otherwise `advances` is false. Emit `COMBAT_RESOLVED`, then
`CHOCOLATE_WALL_DESTROYED { wallId, ownerId, at, cause: "ATTACK" }` when HP
reaches zero. Wall destruction grants no kill or promotion credit.

`CombatPreview.defenderId` is replaced in v5 by exact `target:
CombatTargetRef`; it retains damage/death/advance fields and adds
`noRetaliationReason: "STRUCTURE"` for a surviving wall. UI, AI, replay, and
events never infer a target kind from a numeric ID.

### 0.3 Candify and dynamic territory

Every unit owned by a Candy-faction player, including Candy Catapult, has
Candify. Chocolate Walls are not units and never have it.
`CANDIFY { unitId }` is legal for a ready owned Candy unit on an explored tile
that has no settlement site and is not already controlled by that player. The
unit may have made its one ordinary Move, regardless of Dash, but may not have
attacked, escaped, recovered, captured, built, rolled, or already Candified.
Wait does not block it. This deliberate move-then-sacrifice rule makes Candify
an immediate frontier action rather than requiring the unit to survive idle on
the border for a turn.

An owned city is viable when at least one tile currently assigned to that city
is Chebyshev-adjacent to the unit's cell. This includes previously Candified
tiles, so territory may grow as a connected chain. For each viable city,
distance is Chebyshev distance from the unit's cell to the city center. Retain
only cities at the minimum distance, then sort by city ID. If there is no viable
city, reject. If there is exactly one nearest viable city, `CANDIFY` immediately
resolves. If two or more tie for nearest, `CANDIFY` sets
`pendingChoice: { kind: "CANDIFY_CITY", unitId, candidateCityIds }`, emits
`CANDIFY_CITY_CHOICE_REQUIRED` with the same sorted IDs, and increments the
command index without sacrificing the unit or changing territory.

While that pending choice exists, the only accepted command is
`CHOOSE_CANDIFY_CITY { unitId, cityId }`; End Turn, city reward, and every other
command return `PENDING_CHOICE { kind: "CANDIFY_CITY" }`. The modal is mandatory
and non-dismissible. The chosen ID must be one of the stored candidates; no
legality is recomputed from hidden or mutable state. Acceptance clears pending,
resolves Candify, and increments the command index. Save/reload and replay retain
the exact pending unit and sorted candidates.

Resolving Candify atomically performs this order:

1. record the previous `territoryCityId` and its owner, if any;
2. remove the sacrificed unit and emit
   `UNIT_DIED { unitId, cause: "CANDIFY" }`, counting one owner loss and no
   player's kill;
3. assign the tile's `territoryCityId` to the chosen city and set
   `territoryCenter` to that city's coordinate, retaining terrain, resource,
   and improvement;
4. emit `TILE_CANDIFIED { playerId, unitId, cityId, at,
previousCityId, previousOwnerId }`;
5. evaluate state invariants and match outcome.

Candify may annex neutral land or a hostile player's non-settlement territory.
It may not target a Capital, Village, or City tile, an already-friendly tile,
or—for an AI in Cooperative mode—an allied AI's territory. It never captures,
damages, besieges, levels, or changes a city; never grants population/income;
never reveals adjacent cells; and consumes no PRNG. The unit's cell is already
explored and remains explored. Other players who previously explored it see
the current ownership normally; unexplored viewers receive no change leak.

After common gates, `CANDIFY` validation order is `UNIT_NOT_FOUND`,
`UNIT_NOT_OWNED`, `UNIT_NOT_READY`, `CANDY_FACTION_REQUIRED`,
`UNIT_ALREADY_ACTED`, `CANDIFY_INVALID_TILE` (settlement or already friendly),
`TARGET_ALLIED`, then `CANDIFY_NO_ADJACENT_CITY`. For
`CHOOSE_CANDIFY_CITY`, order is `CANDIFY_CHOICE_INVALID` (wrong pending kind or
unit), `CITY_NOT_FOUND`, `CITY_NOT_OWNED`, then
`CANDIFY_CITY_NOT_CANDIDATE`. Rejections are identical-state, no-event,
no-reveal transactions.

Dynamic territory replaces the old fixed 3 x 3 invariant after creation. Each
city begins with its generated 3 x 3 territory; thereafter every controlled
tile points to exactly one city, and every city's tile set must remain
eight-way connected to its city center. Capture transfers every tile currently
assigned to that city, including Candified extensions. Candify can take a
border tile from a hostile city only when the remaining hostile territory stays
connected to that hostile city center; otherwise it returns
`CANDIFY_WOULD_DISCONNECT`. This stable connectivity check occurs after
`TARGET_ALLIED` and before nearest-city selection. It prevents ownership islands
and makes the state invariant testable.

### 0.4 Command, event, view, and ordering additions

The exact v5 command union adds `KAMIKAZE_ROLL`,
`BUILD_CHOCOLATE_WALL`, `CANDIFY`, and `CHOOSE_CANDIFY_CITY`; `ATTACK` uses
`CombatTargetRef`. Frozen command-kind order is Move, Attack, EscapeMove,
KamikazeRoll, Recover, Capture, Promote, Wait, BuildChocolateWall, Candify,
Research, HarvestFruit, HuntAnimal, BuildLumberMill, BuildMine, Train,
ChooseCandifyCity, ChooseCityReward, EndTurn. Within units, technologies, and
rewards, existing frozen order remains.

The event union adds `DONUT_ROLL_STEP`, `ROLL_DAMAGE_RESOLVED`,
`CHOCOLATE_WALL_BUILT`, `CHOCOLATE_WALL_DESTROYED`,
`CANDIFY_CITY_CHOICE_REQUIRED`, and `TILE_CANDIFIED`; `UNIT_DIED.cause` adds
`KAMIKAZE_ROLL`, `KAMIKAZE_ROLL_SELF`, and `CANDIFY`. Event arrays follow the
transaction orders above and remain domain facts, never animation commands.

The active error union adds `UNIT_TYPE_INVALID`, `ROLL_DIRECTION_INVALID`,
`WALL_TARGET_NOT_ADJACENT`, `WALL_INVALID_TILE`, `CANDY_FACTION_REQUIRED`,
`CANDIFY_INVALID_TILE`, `CANDIFY_NO_ADJACENT_CITY`,
`CANDIFY_WOULD_DISCONNECT`, `CANDIFY_CHOICE_INVALID`, and
`CANDIFY_CITY_NOT_CANDIDATE`. Existing common and relationship errors retain
their meanings.

`PlayerView` exposes every explored Chocolate Wall's ID, owner, coordinate,
current/max HP and structure kind. An unexplored wall is absent. Public command
enumeration offers the four new actions only from visible state and exact owned
unit/faction facts. A directional Roll intent never enumerates or predicts
hidden victims; its summary contains only unit and direction. Equal views yield
equal command lists, AI tuples, and choices. Faction is public for every player
from match start and is shown in Stats; it contains no hidden information.

### 0.5 Setup and Demo presentation

The faction route is one compact seat list, not a sequence of cards. It shows
all `aiCount + 1` rows at once: **You**, then **AI 1** through **AI 3** as
applicable. Each row has a two-option Original/Candy segmented control with
name, one small representative portrait, and a one-line roster summary. Every
row defaults to Original, repeats are allowed, and changing AI count preserves
still-present row selections while new rows default to Original. Start summary
lists each seat and faction. There are no locks, currencies, nested detail
pages, or separate confirmation per AI. Demo's three rows are fixed Original
and are not editable.

### 0.6 AI policy additions

Normal remains observation-safe and deterministic. It never selects an action
that damages an owned/allied unit or wall when a non-damaging productive
candidate exists, and never Candifies allied AI territory in Cooperative mode.
New priorities are inserted without changing retained relative ordering:

| Priority | Candidate                                                                              |
| -------: | -------------------------------------------------------------------------------------- |
|     1070 | Roll that destroys a visible hostile threatening a city with no friendly/allied victim |
|     1055 | Build a wall on an empty threatened-city approach                                      |
|     1010 | Other Roll with positive public hostile damage and zero friendly/allied damage         |
|      890 | Candify hostile territory adjacent to an owned city                                    |
|      870 | Candify neutral territory adjacent to an owned city                                    |
|      610 | Move a Candy unit to create a next-command Candify frontier                            |
|        0 | End Turn                                                                               |

`CHOOSE_CANDIFY_CITY` is mandatory priority 950, like a city reward, and picks
the candidate maximizing newly adjacent non-friendly cells, then lowest city
ID. Roll score uses only visible occupants/walls; unexplored path cells
contribute zero, so AI never gains hidden knowledge. A Roll with any visible
friendly/allied victim or wall is excluded. Otherwise strategic value is
threat severity, immediate value adds `10 * hostileHpLost` and subtracts
`8 * ownOrAlliedHpLost`; hostile wall HP has value 2 per point and friendly
wall damage uses the own-loss term. Donut production counts the Rider role;
Choco Engineer counts Defender; Candy labels do not create extra role slots.

Wall placement candidates must be legal public targets. The preferred target
is an explored empty non-settlement tile adjacent to a threatened owned city,
maximizing the number of visible hostile shortest approaches it blocks, then
preferring Grass, Forest, Mountain, target `(y,x)`, and unit ID. AI never builds
on an allied territory or a tile with a visible friendly economic action when
another equally scoring target exists. It spends the ordinary 1 star greedily.

Candify values hostile ownership above neutral, then frontier adjacency count,
then chosen/nearest city ID and target `(y,x)`. It never sacrifices the last
living unit assigned to a threatened city when another productive defense is
available. These are policy preferences, not legality gates. Cooperative AI
still treats the human as hostile and other AI seats as allied; faction does
not change the relationship graph.

### 0.7 Presentation and reduced motion

Full/Normal Roll animates the Donut along the authoritative path at 90 ms per
cell, capped to 900 ms total by uniform timing compression, with one code-native
impact squash/ring per damaged entity. The sprite disappears after the final
cell. Each traversed cell becomes visible at its corresponding step. Reduced
motion installs each revealed/damaged step without travel and uses a 100 ms
crossfade for the complete command; Fast Forward is immediate.

Build uses a 180 ms code-native chocolate-block rise and settles on the
authoritative wall frame; Reduced Motion uses a 100 ms crossfade. Candify uses a
240 ms candy-color tile wash plus sprite dissolve, or one 100 ms crossfade in
Reduced Motion. Gumball Guard uses the Archer contract's 280 ms cubic-out
flight plus 100 ms impact but draws a round gumball primitive from
`projectileOrigin`; it does not use the arrow shaft/head. All effects pause,
cancel, reproject, and fast-forward under the existing event-queue rules and
never alter simulation order, reveal, damage, or hashes.

### 0.8 Deliberate edge decisions

The brief's ambiguous edges are resolved here rather than left to code:

- Original is the stable name/ID for the pre-Candy faction; faction repeats are
  legal and Demo remains all Original.
- Candy Catapult is mechanically and visually shared with Original Catapult but
  receives Candify because the ability belongs to the owning faction.
- Donut fixed damage bypasses combat defense; walls never stop the roll; the
  Donut always disappears after reaching the chosen edge.
- Chocolate Walls may coexist with terrain resources and improvements, block
  unit occupancy, persist through capture/elimination, and may be attacked by
  any relationship, including their owner.
- Candify may follow Move, may steal hostile non-settlement territory, and may
  chain outward, but connectivity prevents cutting a hostile city into islands.
- Only equal-distance nearest viable cities produce a mandatory choice; farther
  viable cities are not offered.

No unresolved product choice remains for implementation. New Candy city art,
Candy Catapult art, Candy technology art, faction-specific economy, and wall
upgrades are outside v5 rather than silently inferred.

### 0.9 Retained terrain, technology, and archetype identifiers

The authoritative terrain IDs are `GRASS`, `MOUNTAIN`, and `FOREST`; resource
IDs are `FRUIT`, `ORE`, `ANIMAL`, or `null`; and improvement IDs are `MINE`,
`LUMBER_MILL`, or `null`. A tile stores exactly one terrain, at most one
resource, and at most one improvement. Valid combinations are Fruit/Grass,
Ore/Mountain, Animal/Forest, Mine/Mountain with no resource, and Lumber
Mill/Forest with no resource. Renderers and AI never infer these values from a
cosmetic variant.

Frozen technology-table order and the complete nine-node graph are:

Serialized `TechId` values are `CLIMBING`, `RIDING`, `HUNTING`,
`ORGANIZATION`, `MINING`, `FORESTRY`, `ARCHERY`, `STRATEGY`, and
`MATHEMATICS` in the displayed order. Human-facing labels use title case.

| Ordinal | Technology   | Tier | Prerequisite | Unlock                                         |
| ------: | ------------ | ---: | ------------ | ---------------------------------------------- |
|       0 | Climbing     |    1 | None         | Mountain movement and vision                   |
|       1 | Riding       |    1 | None         | Rider                                          |
|       2 | Hunting      |    1 | None         | Hunt Animal; makes Forestry/Archery available  |
|       3 | Organization |    1 | None         | Harvest Fruit; makes Strategy available        |
|       4 | Mining       |    2 | Climbing     | Build Mine                                     |
|       5 | Forestry     |    2 | Hunting      | Build Lumber Mill; makes Mathematics available |
|       6 | Archery      |    2 | Hunting      | Archer                                         |
|       7 | Strategy     |    2 | Organization | Defender                                       |
|       8 | Mathematics  |    3 | Forestry     | Catapult                                       |

Technology cost remains `tier * ownedCityCount + 4`; for a one-city player the
prices are therefore 5, 6, and 7 stars for tiers 1, 2, and 3. This adds the
original-inspired Hunting -> Forestry -> Mathematics siege branch without
importing any other full-game technology.

Frozen unit-table order is Warrior, Archer, Defender, Rider, Catapult. Catapult
has serialized `UnitType: "CATAPULT"`; the complete ordered IDs are `WARRIOR`,
`ARCHER`, `DEFENDER`, `RIDER`, `CATAPULT`. Catapult
costs 8 stars and has max HP 10, attack 4, defense 0, movement 1, Chebyshev
range 3, and no Dash, Escape, or Fortify. It may attack before moving, but a
Move ends its ability to attack that turn; all existing one-attack and ranged
no-advance rules apply. It is trained only after Mathematics.

The integer-rational combat boundary is deliberate. A full-health Catapult
against a full-health unfortified Warrior has forces 4 and 2, so defender
damage is `roundHalfUp((4 / 6) * 4 * 9 / 2) = 12`, clamped to 10: the Warrior
dies with no retaliation. This is not a universal one-shot promise. A
full-health Warrior on its owned City Wall has defense force 8, takes 6, and
survives at 4 HP; a promoted full-health 15-HP Warrior on ordinary ground takes
12 and survives at 3 HP. Ordinary 3/2 city or Mountain Fortify, or Forest
defense after Archery, yields 10 damage and does not save an unpromoted 10-HP
Warrior. These examples use the same
formula and are normative regression vectors, not special cases.

### 0.10 Retained Forest economy commands and events

Forest is enterable without technology at cost 1 but, like Mountain, ends that
Move. A unit defending on Forest receives a 3/2 defense bonus only when its
owner has Archery. `ANIMAL` is visible on every explored
Forest regardless of technology. `HUNT_ANIMAL { at }` is the exact Fruit
parallel: Hunting, an owned non-besieged controlling city with no pending
reward, and 2 stars are required; acceptance consumes Animal, costs 2 stars,
and adds 1 population. A unit is neither required nor a blocker.

`BUILD_LUMBER_MILL { at }` requires Forestry, an explored Forest with
`resource: null` and `improvement: null` in an owned non-besieged territory
whose city has no pending reward, and 3 stars. Acceptance costs 3 stars, sets
`improvement: "LUMBER_MILL"`, and adds 1 population. It is legal on any empty
Forest, including one emptied by Hunt; it is not legal while Animal remains.
The mill is a permanent non-interactive marker with no recurring income and
transfers with territory exactly like a Mine.

After common match, outcome, active-player, and pending-choice gates, validation
order is exact:

1. Hunt Animal: `TILE_NOT_FOUND`, `TILE_UNEXPLORED`, `HUNTING_REQUIRED`,
   `ANIMAL_INVALID_TILE`, `TERRITORY_NOT_OWNED`, `CITY_BESIEGED`, then
   `INSUFFICIENT_STARS { cost: 2 }`.
2. Build Lumber Mill: `TILE_NOT_FOUND`, `TILE_UNEXPLORED`,
   `FORESTRY_REQUIRED`, `LUMBER_MILL_INVALID_TILE`,
   `TERRITORY_NOT_OWNED`, `CITY_BESIEGED`, then
   `INSUFFICIENT_STARS { cost: 3 }`.

Both accepted transactions use the Fruit event order: deduct stars; consume
Animal or set the improvement; add population and calculate every threshold;
set the lowest newly due reward; emit respectively
`ANIMAL_HUNTED { playerId, cityId, at, cost: 2, populationAdded: 1 }` or
`LUMBER_MILL_BUILT { playerId, cityId, at, cost: 3, populationAdded: 1 }`;
then emit `CITY_LEVELED_UP` in ascending reached-level order. Increment
`commandIndex` once and consume no PRNG. Overflow rejects the whole transaction
as `INTEGER_OVERFLOW` before stars, resource, or improvement changes.

### 0.11 Retained varied deterministic maps

Settlement counts, spacing, board presets, and the exact mountain target remain
unchanged. Let `C = width * height`, `M = roundHalfUp(C * 18 / 100)`, and
`F = roundHalfUp(C * 24 / 100)`. Every accepted standard or Demo board has:

| Size | Mountains `M` | Forests `F` |
| ---: | ------------: | ----------: |
|   11 |            22 |          29 |
|   14 |            35 |          47 |
|   16 |            46 |          61 |
|   20 |            72 |          96 |
|   25 |           113 |         150 |

After settlement coordinates and seat/turn shuffles are produced by the
unchanged stage ordering, sort all non-settlement coordinates by `(y, x)`,
Fisher-Yates shuffle once, assign the first `M` as Mountain, the next `F` as
Forest, and the rest as Grass. Settlement centers remain empty Grass. A capital
must have at least four non-Mountain neighbors, and all capitals must connect
through an eight-way Grass-or-Forest path, so no movement technology is needed
to meet another capital.

Then visit settlements by `(y, x)` and each one's eight territory coordinates
by `(y, x)`, consuming exactly one `nextUint32` draw per tile even when its
resource test fails. A Grass receives Fruit when `u < 0x60000000` (3/8); a
Mountain receives Ore when `u < 0x80000000` (1/2); a Forest receives Animal
when `u < 0x80000000` (1/2). No resource exists outside a settlement territory.
An **immediately controllable utilization opportunity** is one adjacent tile
that, once the settlement is owned and the named prerequisite is researched,
needs no unit or further map reveal: a Fruit, Ore, Animal, or any Forest
(Animal Forest counts once, although it can later support two actions). Every
settlement must have at least two such distinct adjacent tiles. A candidate
with fewer is rejected. Every accepted board must also contain at least one
Animal globally, so Hunting's economic action is never absent from a match; a
zero-Animal candidate is rejected. There is no exact per-settlement Fruit, Ore, Animal,
Mountain, Forest, or upper opportunity quota. This minimum-only rejection is
the requested variety boundary and explicitly replaces the fixed
two-Fruit/two-Ore/three-Mountain recipe.

All terrain/resource draws occur before capital connectivity and opportunity
validation. A failed candidate consumes the continued serialized PRNG stream;
the existing 256-attempt ceiling and `MAP_GENERATION_FAILED` remain. Map
validation uses stable failures `MOUNTAIN_COUNT`, `FOREST_COUNT`,
`FRUIT_TERRAIN`, `ORE_TERRAIN`, `ANIMAL_TERRAIN`, `IMPROVEMENT_TERRAIN`,
`RESOURCE_OUTSIDE_TERRITORY`, `ANIMAL_ABSENT`, and
`SETTLEMENT_OPPORTUNITY_MINIMUM`. Generation
must pass for every supported size and both AI modes; `aiMode` never changes
map draws.

### 0.12 Retained public information and presentation

`PlayerView` exposes Forest, Animal, and Lumber Mill only on explored ordinary
tile arms. Unexplored and cooperative `ALLIED_TERRITORY` arms remain
content-free; they reveal no terrain, resource, improvement, entity, or owner.
The public query offers Hunt/Lumber only for exact explored owned coordinates,
and equal views still produce equal candidates. The v5 command-kind order is
authoritative in section 0.4. Within Train, Catapult follows Rider; technology
order is the table in section 0.9.

Map selection docks are viewport overlays. Opening, closing, or wrapping any
tile/unit/city dock must not change the Canvas host CSS rectangle, backing-store
dimensions, camera origin, zoom, or selected logical coordinate. More lines may
cover the lower map. The previous requirement that mobile Canvas occupy only
the space remaining above a non-scrolling dock is removed; exact geometry and
the accessibility overflow fallback are in Screen Flow.

No detached letter badge, yellow circle, `W`, or `R` may be drawn on a tile to
communicate Wait/readiness or resource state. An active-human owned unit with
`handled = false` pulses the actual unit sprite from opacity 1 to 0.62 and back
over a 1.6-second ease-in-out loop; health and owner cues remain steady. Full
motion never exceeds one opacity cycle per 1.6 seconds and contains no rapid
flash. Reduced motion keeps the sprite at opacity 1 with no attention tween;
the dock text **Needs action** and semantic unit label remain the redundant cue.
Any handled action removes the pulse at the accepted boundary; Promote alone
does not.

Archer-archetype Attack consumes `COMBAT_RESOLVED` like every combat. Under
Full/Normal animation, Original draws the retained arrow primitive and Candy
draws the gumball primitive specified in section 0.7. Both use 280 ms
logical-coordinate cubic-out flight followed by a 100 ms impact
ring/crossfade. The post-combat HP/death visual becomes visible at 280 ms.
Reduced motion omits travel and uses one 100 ms impact crossfade; Fast Forward
completes immediately. Resize/zoom/pan reprojects endpoints each frame.
Settings pauses the presentation clock. Match replacement, reload/install,
route exit, invalidation of the event-queue token, or loss of either endpoint
from the event's public render snapshot cancels the primitive and installs the
authoritative post-event frame; Fast Forward does the same synchronously.
Cancellation never changes or reorders events. Catapult uses ordinary ranged
combat presentation with no approved projectile primitive.

## 1. Product boundary

The POC is a local, single-player, land-conquest game for one human and one to
three AI opponents. Every seat independently selects Original or Candy. Both
share technology, economy, cities, terrain, and capital income; the roster and
Candy abilities differ exactly under section 0.
There is no account, server, online multiplayer, monetization, progression, or
cross-device synchronization.

Included:

- seeded square maps made of grass, forest, and mountains;
- capitals, neutral villages, cities, fruit, animals, ore veins, Lumber Mills,
  and Mines;
- stars, uncapped city population/levels, assigned-unit training capacity,
  siege, and capture;
- Original and Candy faction rosters, Chocolate Walls, Candify, Donut Roll,
  and the five shared mechanical unit archetypes;
- nine technologies, persistent exploration, eight-way movement, zones of
  control, combat, recovery, veterancy, elimination, and conquest victory;
- deterministic greedy Normal AI using observation-safe information;
- rival-AI and cooperative-against-the-human AI relationship modes;
- one versioned autosave, restart, and deterministic command replay.

Excluded:

- water, roads, farms, trade, general diplomacy, player-created
  alliances or teams, naval or air units, super units, ruins, encounters,
  monuments, temples, score victory,
  timed victory, capital-only victory, pass-and-play, undo, disband, live
  re-fog, invisible units, animation-dependent rules, factions beyond Original
  and Candy, or faction-specific technology/economy/cities;
- Perfection, Creative, Boot Camp, Weekly Challenge, Glory, and Might as
  playable modes. Their POC UI treatment is specified in the screen-flow doc.

## 2. Match setup and seed

The only playable victory mode is **Conquest**. Setup contains `aiCount`,
`boardPreset`, `aiMode`, `seed`, the human's cosmetic player color, and the
required seat-ordered `factions` array. AI
difficulty is visibly fixed to **Normal (POC)**. There are no AI economy
bonuses or handicaps. `aiMode` is either `RIVAL` (default: every other player
is hostile) or `COOPERATIVE` (all AI seats cooperate against the human under
section 12.3). The cooperative choice is valid with any AI count; with one AI
its diplomacy has no additional effect.

| AI opponents | Total players | Auto preset |   Board | Neutral villages |
| -----------: | ------------: | ----------- | ------: | ---------------: |
|            1 |             2 | Tiny        | 11 x 11 |                4 |
|            2 |             3 | Small       | 14 x 14 |                6 |
|            3 |             4 | Normal      | 16 x 16 |                8 |

`Auto` is the default and resolves to the table. The user may explicitly choose
any preset at least as large as the Auto preset; smaller choices are disabled.
The resolved dimensions, rather than `Auto`, are stored in setup and replay.

**Huge** is an explicit 25 x 25 preset for every AI count. It never changes
`Auto`. Huge always has exactly 30 settlements: 28 neutral villages with one
AI, 27 with two AI, and 26 with three AI. The existing 11/14/16 village counts
above remain unchanged.

**Large** is a second explicit preset, 20 x 20 for every AI count. It never
changes `Auto`. Large always has exactly 20 settlements: 18 neutral villages
with one AI, 17 with two AI, and 16 with three AI. Its targets are 72 Mountains
and 96 Forests, allocated by section 0.11 without a territory quota. Large uses
the same lattice, spacing, connectivity, retry ceiling, and PRNG ordering as
every other v5 map.

The simulation accepts a `uint32` seed. The UI accepts zero to 64 Unicode
characters. It normalizes non-empty input with NFC, UTF-8 encodes it, and hashes
those bytes with 32-bit FNV-1a to obtain the simulation seed. Empty input causes
the setup UI to obtain one random `uint32` from the browser, display it as eight
lowercase hexadecimal digits, and store that resolved integer before match
creation. Randomness never reads the browser again after setup. PRNG details are
defined in [Client Architecture](../architecture/CLIENT_ARCHITECTURE.md#6-determinism-prng-and-canonical-data).

New Match with an identical ruleset ID, resolved setup, seed, and command log
must produce the same initial state, events, and final hash.

### 2.1 Deterministic Demo Match

The Hub's **Demo Match** action is one explicit ruleset-5 scenario, represented
by optional setup field `scenario: "DEMO"`. An absent scenario is the canonical
standard match. No other scenario value is valid. Demo fixes the complete
resolved setup to Huge 25 x 25, two rival Normal AI, Coral human, and uint32
seed `0xdecafbad` (`3737844653`); its serialized `humanPlayerId` is 1 and its
three serialized factions are Original.

Demo first runs the ordinary seeded map, capital assignment, entity allocation,
and turn-order shuffles without adding a PRNG draw. A pure scenario transform
then rotates the shuffled cyclic order to start with the human and converts the
neutral village nearest the human capital by Chebyshev distance, breaking ties
by `(y, x)`. Because v4 terrain/resource draws established the seeded board stream,
the old v3 coordinate and entity-ID literals are historical validation data,
not v5 inputs. The derivation above remains the v5 coordinate contract. Both selected
settlements become level-three cities with zero carried population, Workshop,
and City Wall. Their combined ordinary opening income is 9 stars; the scenario
supplies 21 pre-income stars, so the first playable human turn opens with
exactly 30.

Only the human receives all nine technologies and all 625 explored tiles. Each
human city starts with exactly four ready full-health units, placed city center
first and then on its seven non-center territory tiles in `(y, x)` order,
regardless of terrain because the human owns Climbing. Each receives Warrior,
Archer, Defender, and Rider in that order. Normal AI capital, unit, stars,
technologies, and radius-two exploration remain ordinary with no bonus or
full-map knowledge. The ordinary starting Warrior in the human capital retains
its founding-unit capacity exemption. Its three added units and all four units
of the converted city are non-exempt; the capital is at its level-three limit
and the converted city is validly over it. Neither can train until its
non-exempt assigned count falls below its level.

## 3. Map invariants

Generation is accepted only if all invariants below hold. The generator may
retry deterministically; retry number is part of the PRNG stream and is not a
new seed. After 256 failed candidates it returns `MAP_GENERATION_FAILED` rather
than weakening a constraint.

1. Coordinates are integer `(x, y)` in `[0, width)` and `[0, height)`. All eight
   Chebyshev-adjacent cells are neighbors.
2. There is exactly one capital per player and the preset's exact number of
   neutral villages. Every settlement is on grass, is at least two tiles from
   each edge, and is at Chebyshev distance at least three from every other
   settlement.
3. Capital pairs are at least `floor(width / 2)` tiles apart by Chebyshev
   distance. Seat assignment to capitals is a seeded shuffle independent of
   player ID; the resulting turn order is a separate seeded shuffle.
4. Each capital has at least four grass neighbors. Every capital can reach every
   other capital through an orthogonally or diagonally connected grass-only
   path. Thus the match is winnable before Climbing is researched.
5. Mountains occupy exactly `roundHalfUp(cellCount * 18 / 100)` non-settlement
   cells. An accepted board still contains the required grass-only path between
   every capital; candidate rejection, not a reduced mountain count, preserves
   connectivity.
6. Forest count, terrain allocation, resource probabilities, and the
   minimum-two utilization guarantee use section 0.11. There is deliberately no
   exact settlement terrain/resource recipe.
7. No Fruit, Ore, or Animal exists outside settlement territories. Empty
   Forest outside a territory is terrain only because no city controls it.
8. No tile belongs to two city territories. Generation begins with disjoint
   3 x 3 territories; Candify may later reassign or expand them under the
   connected dynamic-territory invariant in section 0.3.
9. The complete map is generated at start. Fog changes knowledge, never map
   generation. No resource or enemy placement is generated on discovery.

A settlement's initial territory is the centered 3 x 3 Chebyshev area, clipped only in
the abstract rule; invariant 2 ensures generated settlements are never clipped.
Neutral territory has no owner. When a village becomes a city, its initial
territory becomes that city's player's territory and may subsequently grow or
lose non-center tiles through Candify.

### 3.1 Historical ruleset-3 resource recipe

The remainder of this subsection records the superseded ruleset-3 algorithm
for compatibility context only. Ruleset 5 must use section 0.11 and must not
apply these exact per-settlement counts.

Let `S` be the number of capitals plus neutral villages and let
`M = roundHalfUp(cellCount * 18 / 100)`. Generation requires `M >= 3S` and at
least `M - 3S` cells outside all settlement territories; a candidate that fails
either condition is rejected rather than changing resource counts.

After all settlement coordinates are fixed, sort every settlement by `(y, x)`.
For each settlement in that order, list its eight non-center territory
coordinates by `(y, x)`, apply the standard seeded Fisher-Yates shuffle, and
assign the shuffled positions in this exact order:

1. positions 0 and 1: mountain with `ORE`;
2. position 2: mountain with no resource;
3. positions 3 and 4: grass with `FRUIT`;
4. positions 5 through 7: grass with no resource.

Then list every cell outside all settlement territories by `(y, x)`, shuffle
that list, and make its first `M - 3S` cells ordinary non-ore mountains. The
whole candidate is still rejected unless capital grass-neighbor, spacing, and
grass-connectivity invariants pass. A retry consumes the continued serialized
PRNG stream; it never derives a second seed or weakens a count.

Thus a generated map has exactly `2S` ore veins, `2S` fruit resources, `S`
ordinary mountains inside territories, and `M - 3S` ordinary mountains outside
territories. Each future city has six potential population from its two fruit
and two ore veins: `2 * 1 + 2 * 2 = 6`. Level 3 requires five total population,
so every settlement has two independent growth sources and one population of
slack even if the player does not use the most efficient order. The same
formula has no dimension-specific branch. On the explicit 25 x 25 Huge board,
`M = 113` and `S = 30`, so 90 mountains are inside territories and 23 ordinary
mountains are outside them.

## 4. Players, rounds, and turn sequence

Creation stores the one human's allocated player ID as immutable
`humanPlayerId` before any turn-order shuffle and copies each setup faction to
its player. All players start active with five stars, no researched technology,
one level-one capital, and one Warrior-archetype unit supported by that capital
on the capital tile. Its label/art is Warrior for Original or Candy Warrior for
Candy. That ordinary starting archetype alone is created with
`capacityExempt = true`; it is ready with `handled = false`. Initial exploration
reveals every tile within Chebyshev radius two of the capital. No starting income is prepaid;
the first player's first Start Turn awards income exactly like every later turn.

A round is complete after every player that was active at the round's start has
either taken a turn or been eliminated. `round` starts at 1. Turn order is
stored explicitly.

Each turn is:

1. **Start:** set the active player; award income from all owned, non-besieged
   cities in ascending city ID; reset each surviving unit's activation,
   including `handled = false`; mark units already standing on a neutral
   village or hostile city as capture-eligible.
2. **Free ordering:** accept any legal research, Harvest, Hunt, Lumber, Mine,
   reward, training, unit, wall, Candify, Wait, Roll, or capture command. There
   is no phase ordering inside this step.
3. **End:** reject End Turn while a city reward or Candify city choice is
   pending; otherwise
   auto-recover eligible idle units in ascending unit ID, emit income preview
   for the next occurrence of this player's turn, and advance turn order.
4. **Boundary:** skip eliminated players. Increment `round` after passing the
   last seat in stored order. Victory is checked after every capture and unit
   death command, then again at End Turn as an invariant check.

There is no turn limit. The human must confirm End Turn if any owned surviving
unit still has `handled = false`, any affordable city can train a unit, or a
capture is available. Wait is the explicit way to dismiss a unit's attention
state without consuming its legal actions. The confirmation is UI-only and does
not change command legality.

## 5. Stars, cities, population, and resources

### 5.1 Star flow

Stars are non-negative integers. A command that would make stars negative is
illegal. Income is credited only at Start Turn:

```text
cityIncome = city.level + (city.isCapital ? 1 : 0)
           + (city.rewardLevel2 == "WORKSHOP" ? 1 : 0)
```

Every player, including every AI, receives the capital bonus. A besieged city
contributes zero. Captured cities cannot award income to the new owner until
that owner's next Start Turn. The only one-off star reward is level-three
Resources (+5). There is no interest, upkeep, score conversion, meeting reward,
or unit refund.

### 5.2 City growth and assigned-unit capacity

| Reached level | Population needed from prior level | Base income | Non-exempt training limit | Mandatory choice |
| ------------: | ---------------------------------: | ----------: | ------------------------: | ---------------- |
|             1 |                                  - |           1 |                         1 | None             |
|             2 |                                  2 |           2 |                         2 | Workshop/Survey  |
|             3 |                                  3 |           3 |                         3 | Resources/Wall   |
|      `L >= 4` |                                `L` |         `L` |                       `L` | None             |

There is no gameplay maximum city level. `level` is a positive safe integer and
`population` is a non-negative safe-integer progress value. To advance a city
from current level `L` to `L + 1`, it needs `L + 1` population. After any
population gain, repeatedly apply this exact loop:

```text
while population >= level + 1:
  population -= level + 1
  level += 1
```

There is no gameplay cap hidden behind the representation. If adding population
or computing the next threshold/income would exceed `Number.MAX_SAFE_INTEGER`,
reject the initiating command as `INTEGER_OVERFLOW` atomically; serialized
states containing unsafe values are invalid. Finite v5 maps cannot approach
this boundary, but the rule keeps future growth sources deterministic.

Emit one `CITY_LEVELED_UP` per reached level in ascending order. Only reaching
level 2 or level 3 creates the existing mandatory reward choice; levels 4 and
above have no reward until a later ruleset explicitly adds one. A city with a
pending reward cannot train units, be harvested or mined for, or end its
owner's turn until `ChooseCityReward` resolves it. Current +1/+2 population
actions cannot cross both reward levels in one command; a future larger growth
action must specify an ordered pending-choice queue before it is added.

City income remains the formula in section 5.1 at every level. Until dedicated
art is approved, every level 4+ city reuses the accepted level-three building
body at the same scale/anchor and adds a code-native numeric level badge. It is
never enlarged, procedurally embellished, or assigned unapproved raster art.

- **Workshop:** permanent +1 income for that city.
- **Survey:** immediately reveal every tile within Chebyshev radius three of
  that city for its current owner; it has no ongoing effect.
- **Resources:** immediately add 5 stars to the current owner.
- **City Wall:** eligible friendly units on the city tile use a 4x defense
  bonus instead of the normal city 1.5x.

Rewards are attached to the city and transfer with capture. One-off Survey and
Resources effects do not repeat or transfer retroactively.

Every trained unit is assigned to its training city through `homeCityId` and is
non-exempt. A city may train exactly when the number of living, non-exempt units
whose `homeCityId` is that city is strictly less than `city.level`; unit
location does not matter. The accepted training transaction assigns the new
unit to that city, so a legal training may bring the count to exactly the level
but never above it.

Each ordinary starting capital Warrior is created with durable
`capacityExempt = true`; every other current unit, including Demo-added units,
trained units, and any future converted/acquired unit, defaults to false unless
that future acquisition rule explicitly says otherwise. The flag belongs to
the unit, survives movement, save/replay, capture-based home reassignment, and
orphaning, and disappears only with the unit. An exempt unit with a home city
does not count toward training capacity. No other unit becomes exempt merely by
occupying a capital or becoming the oldest unit.

Imported, captured, Demo, or future acquisition states may validly contain
more non-exempt assigned units than a city's level. No unit is destroyed or
orphaned to repair that state. The city simply cannot train until deaths or
home reassignment reduce the non-exempt count below its level. Death frees a
counted slot immediately. Owned-city UI exposes `counted/level` plus the number
of assigned exempt units separately; rival-city views do not expose hidden
assignment counts.

Any future conversion or other unit-acquisition command must atomically choose
an owned `homeCityId` and create/reassign that unit as non-exempt. Acquisition
assignment is allowed to exceed the destination level; it does not borrow the
training gate. No such acquisition command exists in ruleset 5.

### 5.3 Fruit harvesting

Fruit is a one-use resource on grass. It is visible whenever its tile is
explored, including before Organization is researched; the UI shows its locked
prerequisite without exposing any unexplored tile. Organization unlocks
`Harvest Fruit`. A legal harvest costs 2 stars, changes that tile's resource
from `FRUIT` to `null`, and immediately adds 1 population to the city controlling
the territory. It creates no building and provides no recurring income.

No unit presence is required. A unit occupying the fruit tile neither enables
nor prevents harvesting. The city must be owned by the active player, not
besieged, and free of a pending reward. The tile must be explored grass with
unconsumed fruit, and the player must own Organization and have at least 2
stars.

These values deliberately copy the regular-tribe baseline recorded in the
[core research](../research/POLYTOPIA_CORE_REFERENCE.md#7-stars-resources-and-economic-decisions):
Organization, 2 stars, and +1 population. They also fit this economy without an
opening stall: a one-city player begins its first turn with 7 stars after
capital income, so it can buy the 5-star Organization technology and harvest
one fruit immediately. Fruit costs 2 stars per population; a Mine costs 2.5,
balanced by Mine's two-population burst and deeper Climbing -> Mining research
path.

For a syntactically valid `HARVEST_FRUIT`, validation uses this stable order
after the common match/active-player/pending-choice gates:

1. missing coordinate -> `TILE_NOT_FOUND`;
2. unexplored coordinate -> `TILE_UNEXPLORED`;
3. Organization absent -> `ORGANIZATION_REQUIRED`;
4. anything other than grass with `FRUIT` -> `FRUIT_INVALID_TILE`;
5. no currently owned controlling city -> `TERRITORY_NOT_OWNED`;
6. besieged controlling city -> `CITY_BESIEGED`;
7. fewer than 2 stars -> `INSUFFICIENT_STARS` with `cost: 2`.

On acceptance, resolve atomically in this order: deduct 2 stars; consume the
fruit; add 1 population and resolve level thresholds in ascending order; set
the lowest newly due city reward as the blocking pending choice; emit
`FRUIT_HARVESTED { playerId, cityId, at, cost: 2, populationAdded: 1 }`; then
emit any `CITY_LEVELED_UP` events in ascending level order. `commandIndex`
increments once. Harvest uses no PRNG draw.

### 5.4 Ore and mines

An ore vein is visible whenever its tile is explored, even without Mining; the
UI shows the locked prerequisite. After Mining is researched, a player may
build a Mine for 5 stars on an unmined ore mountain in one of their city
territories. No unit presence is required. The ore is consumed, a Mine remains
as a non-interactive marker, and that city immediately gains 2 population.
Mines produce no recurring stars and cannot be removed, pillaged, or captured
separately from the city territory. A mountain without `ORE` is never mineable,
even inside an owned territory. City level never suppresses an otherwise legal
Mine.

For `BUILD_MINE`, stable validation after the common gates is: `TILE_NOT_FOUND`,
`TILE_UNEXPLORED`, `MINING_REQUIRED`, `MINE_INVALID_TILE` (including an ordinary
non-ore mountain), `TERRITORY_NOT_OWNED`, `CITY_BESIEGED`, then
`INSUFFICIENT_STARS { cost: 5 }`. Its accepted transaction retains the existing
order: deduct stars, consume `ORE`, set
`mine: true`, add 2 population/resolve rewards, emit `MINE_BUILT`, then emit
ascending `CITY_LEVELED_UP` events. It uses no PRNG draw.

### 5.5 Resource ownership, capture, and reward locking

Fruit, Ore, Animal, Mines, and Lumber Mills belong to tiles, not players.
Unconsumed resources transfer implicitly when their controlling territory is
captured or Candified;
consumed resources do not return, and existing improvements remain. Capturing a neutral village
reveals radius one, which reveals its complete 3 x 3 territory and all remaining
resources to the captor. No capture effect grants population or repeats a prior
resource event.

Harvest Fruit, Hunt Animal, Build Lumber Mill, and Build Mine are tile commands,
never city commands. They are
offered only for the exact selected public tile in the tile dock; selecting a
city never lists them even when the tile lies in that city's territory. The
single global pending choice blocks every command except its exact
`CHOOSE_CITY_REWARD` or `CHOOSE_CANDIFY_CITY` resolver, including resource
commands aimed at another city. After the choice is resolved, public command
enumeration is rebuilt from the new view.
Rejected resource commands never spend stars, consume a feature, increment the
command index, emit an event, or reveal whether an unexplored tile has a
resource or owner.

## 6. Cities, villages, siege, capture, and elimination

A unit entering an unoccupied neutral village or hostile city does not capture it
immediately. It must survive there until its owner's next Start Turn. That unit
then becomes capture-eligible and may use `Capture`; Capture consumes all of its
remaining activation and cannot be combined with Move, Attack, or Recover that
turn. Leaving the tile clears eligibility.

An owned city is **besieged** while any hostile unit occupies its tile. It remains
owned by the defender, yields zero income, cannot train, and cannot resolve a
pending reward. The attacker may be attacked normally. If removed, siege ends
immediately. A village has no income or siege state.

Capturing a village creates a level-one non-capital city with zero population,
no rewards, and a monotonically assigned city ID. Capturing a hostile city:

1. changes city and ownership of every tile currently assigned to it, including
   Candified extensions, while preserving level, population, capital marker,
   resources, improvements, Chocolate Walls, and chosen rewards;
2. changes the capturing unit's `homeCityId` to the captured city without
   changing its durable `capacityExempt` flag;
3. sets every other living unit formerly supported by that city to
   `homeCityId = null`; orphan units remain owned, operate normally, and consume
   no city capacity;
4. clears siege and capture eligibility, then checks elimination.

A player is eliminated immediately after it owns zero cities. Remove all of
its remaining units in ascending unit ID, cancel its pending choices, skip its
future turns, and retain it in statistics as eliminated. Its Chocolate Walls
remain as owner-tagged inert structures until destroyed. Losing a capital alone
does not eliminate a player. There is no capital recapture exception.

Because this is a single-player POC, the match ends with **Victory** when the
human is the only non-eliminated player and with **Defeat** immediately when the
human is eliminated. A Defeat records the player whose Capture eliminated the
human as `defeatedByPlayerId`; remaining AI seats do not continue playing and no
claim is made that one of them conquered the others. The engine can use the same
rules in capped AI-vs-AI headless tests, where the last non-eliminated player is
the winner. A state with no active player is invalid and never a draw.

## 7. Technology

Technologies are permanent per player. A purchase spends stars, emits one event,
and takes no unit or city action. Cost is evaluated before purchase from the
current number of owned cities:

```text
technologyCost = technologyTier * ownedCityCount + 4
```

The complete nine-technology table and frozen order are in section 0.9. A technology is available
only if all listed prerequisites are owned. Warrior requires no technology.
There are no faction starting technologies, discounts, backward research,
Free Spirit, or technology refunds.

## 8. Exploration and information

Exploration is a persistent bitset per player. It never closes. There is no
separate `visibleNow` rule: explored terrain, resources, cities, Chocolate
Walls, and ordinary enemy units remain visible. Hidden information consists
only of unexplored tiles and entities on them.

- Setup reveals radius two around the player's capital. Explored Fruit, Ore, and Animal
  are visible regardless of whether their action technology is researched.
- A unit reveals radius one after each legal path step and at its final tile.
- Donut Roll is the exception: it reveals exactly each traversed cell and no
  neighbor, as section 0.1 specifies.
- A unit standing on a mountain reveals radius two if its owner has Climbing.
- Capturing a village or city reveals radius one around it after ownership
  changes; Survey reveals radius three.
- Reveal uses Chebyshev distance and clips at map edges.
- If a moving unit steps onto a previously unexplored tile, its movement ends.
  This gives every unit, including Rider, at most one blind step per Move.
- Newly revealed ZOC may stop movement at the same step; movement never rewinds.
- A Move query treats an adjacent unexplored tile as an optimistic legal intent.
  If that tile reveals an occupying unit or an unenterable mountain, the
  accepted Move is interrupted before the tile, consumes the activation, and
  reveals radius one around the obstruction. This prevents hidden occupancy or
  terrain from leaking through legal-action lists or rejected-command loops.
  Likewise, if an otherwise-public multi-step intent reveals a new enemy ZOC,
  the accepted Move is truncated on the step that revealed it.

An attack is legal only when the defender's tile is explored by the attacker.
Retaliation additionally requires the attacker's tile to have been explored by
the defender. AI receives a read-only view filtered by exactly its exploration
bitset; it cannot query hidden cells, entities, command legality, or outcomes.

In cooperative mode, one narrow diplomacy projection prevents an AI from
exploring another AI's territory without revealing its contents. An unexplored
tile currently controlled by an allied AI may expose only
`diplomaticBlock: "ALLIED_TERRITORY"`; terrain, site, resource, improvement,
city, unit, Chocolate Wall, and exact controlling identity remain absent. Such a tile does not enter
the exploration bitset, cannot be a Move/Escape path step or destination, and
is clipped from unit, capture, and Survey reveal results. Previously explored
knowledge is never erased if a tile later becomes allied. Human and rival-mode
views never receive this marker. Equal PlayerViews, including these markers,
must still produce equal public commands and AI decisions.

## 9. Movement and zones of control

Each tile holds at most one unit and at most one Chocolate Wall; a unit and wall
cannot share a cell. A path is an explicit ordered list of adjacent
coordinates. It may not cross or end on any other unit, leave the board, use an
unexplored tile as an intermediate step, cross/end on a Chocolate Wall, or enter
a mountain without Climbing.
Grass steps cost 1. Forest and Mountain steps cost 1 but end the Move. Diagonals are legal;
there is no corner-cutting restriction.

Entering any tile adjacent to a living enemy unit ends the Move. This ZOC is
checked after the step, includes all eight neighbors, and applies even when the
enemy is newly revealed. A unit that starts in ZOC may leave it. ZOC does not
forbid an attack and does not pin a unit before movement.

Here and throughout movement/combat, enemy means **hostile under the stored
`aiMode`**. Cooperative AI units do not project ZOC against one another. They
still occupy and block their own tile, cannot share or path through one another,
and receive no shared movement, healing, territory, economy, or vision benefit.

Move is issued at most once per normal pre-attack activation. Original Warrior,
Archer, and Rider plus Candy Warrior and Gumball Guard have Dash and may attack
after moving. Defender/Choco Engineer lacks Dash: after it moves it cannot
attack. Donut has no Attack. Attacking without moving is legal for every
attack-capable unit. All movement budgets are integers; there are no roads or
fractional cost.

Original Rider has Escape. Donut does not. After an Original Rider's Attack
resolves and it survives, it may make one
optional `EscapeMove` with a fresh movement budget of 2. All occupancy,
mountain, fog, and ZOC rules apply. Escape never grants a second attack and is
forfeited by Capture or Recover.

Move, EscapeMove, and Attack have no gameplay confirmation phase. Once an owned
unit is selected, one pointer/touch/keyboard/semantic activation of an exact
offered destination or target dispatches that exact command immediately. A
Move/Escape destination with multiple shortest legal paths uses the query's
single canonical path: shortest step count, then lexicographically smallest
sequence of step coordinates by `(y, x)`. Combat preview remains the same pure
calculation, but appears on the highlighted target and in its accessible name;
it never opens a confirmation dialog or requires a second activation.

## 10. Units and lifecycle

| Archetype / Original label | Cost | Max HP | Attack | Defense | Move | Range | Abilities             | Technology  |
| -------------------------- | ---: | -----: | -----: | ------: | ---: | ----: | --------------------- | ----------- |
| Warrior                    |    2 |     10 |      2 |       2 |    1 |     1 | Dash, Fortify         | None        |
| Archer                     |    3 |     10 |      2 |       1 |    1 |     2 | Dash, Fortify         | Archery     |
| Defender                   |    3 |     15 |      1 |       3 |    1 |     1 | Fortify               | Strategy    |
| Rider                      |    3 |     10 |      2 |       1 |    2 |     1 | Dash, Escape, Fortify | Riding      |
| Catapult                   |    8 |     10 |      4 |       0 |    1 |     3 | None                  | Mathematics |

Candy replaces the first four labels/art with Candy Warrior, Gumball Guard,
Choco Engineer, and Donut. The first three retain the table except for Choco
Engineer's additional build action; Donut's exact replacement row is cost 3,
HP 10, attack/range 0, defense 1, move 1, Fortify, Riding. Candy Catapult uses
the shared Catapult row. Section 0 is authoritative where these differ.

Training spends the listed cost, requires the unlock, an owned non-besieged city
without a pending reward, non-exempt assigned count below the city's level, and
an empty city tile. The new unit appears there with full HP, zero kills, that
city as home, `capacityExempt = false`, and an exhausted activation with
`handled = true`; it cannot act or pulse until its owner's next Start Turn.
Stable IDs are monotonic and never reused.

An activation tracks `moved`, `attacked`, `recovered`, `captured`, `handled`,
Escape availability, and the v5 terminal special-action state. No unit can
attack twice. Recover, Capture, Roll, wall Build, and completed Candify consume
the whole activation. A unit at full HP cannot Recover. Accepted Move,
EscapeMove, Attack, Recover, Capture, Roll, Build, completed Candify, and Wait
set `handled = true`; it is monotonic until the next Start Turn. Opening a
Candify city choice does not mutate activation until resolution. Promote does
not set it because promotion is a free lifecycle action.

`WAIT { unitId }` is legal exactly once per turn for an active player's living
unit while `handled = false`, including a unit with no Move/Attack target. It
sets only `handled = true`, emits `UNIT_WAITED { playerId, unitId }`, increments
`commandIndex` once, consumes no PRNG, and leaves position, HP, movement,
attack, Escape, capture, recovery, promotion, and every other command legality
unchanged. The unit may act normally after waiting. A repeated Wait is rejected
as `UNIT_ALREADY_HANDLED` with identical state and no event. Wait does not
prevent end-turn auto-recovery because it is not a move, attack, recovery,
capture, or training action. Normal AI never selects Wait; it is a human
attention-management command and End Turn outranks it in AI policy.

Explicit Recover restores 4 HP in friendly territory or 2 elsewhere and ends
the activation. At End Turn, a unit auto-recovers by the same amount only if it
did not move, attack, recover, capture, or train this turn. Friendly territory
means a tile controlled by one of the player's cities. Healing is capped at max
HP.

A unit becomes promotion-eligible at three kills, including retaliation kills.
`Promote` may be issued once at any point in its owner's free-ordering phase,
even after another action. It is a free lifecycle action: max HP increases by
5, current HP becomes that maximum, and eligibility is consumed permanently.
Promotion does not refresh movement or attack. Disband is excluded.

## 11. Combat

Attack range is Chebyshev distance. A unit target must be an explored living
hostile unit within range; an explored Chocolate Wall may be targeted regardless
of relationship. Compute attack and possible retaliation from pre-exchange
health:

```text
attackForce  = attacker.attack * attacker.hp / attacker.maxHp
defenseForce = defender.defense * defender.hp / defender.maxHp * defenseBonus
totalForce   = attackForce + defenseForce

damageToDefender = roundHalfUp(
  attackForce / totalForce * attacker.attack * 4.5)

damageToAttacker = roundHalfUp(
  defenseForce / totalForce * defender.defense * 4.5)
```

Implement these as integer rational arithmetic. For a non-negative fraction
`numerator / denominator`, `roundHalfUp` is
`floor((2 * numerator + denominator) / (2 * denominator))`. Do not use host
floating point or host-language `round`.

Defense bonus is the greatest applicable single value, never a product:

- 4/1 on an owned city with City Wall for a Fortify unit;
- 3/2 on an owned city for a Fortify unit, on a Mountain, or on Forest when the
  defender's owner has Archery;
- 1/1 otherwise.

Apply defender damage first. If a unit defender dies, remove it and do not
retaliate. Otherwise retaliate only if the defender's range reaches the
attacker and the defender has explored the attacker's tile. Retaliation uses
the pre-exchange values already computed; it is not reduced by damage just
taken. Apply and clamp both damage values to `[0, hp]`.

An adjacent attacker that kills advances onto the defender's tile if it is
still alive. A ranged-distance kill never advances. An advancing attacker onto
a village or city must still wait until its next Start Turn for capture.

Chocolate Wall combat uses the special defense/retaliation/advance rules in
section 0.2. Donut Roll uses fixed ability damage, not this formula.

Every selection presents the exact projected defender damage, projected
retaliation damage (or zero plus reason), death, and melee advance before the
Attack command. Preview calls the same pure calculation as resolution and does
not consume PRNG.

## 12. AI contract

All AI seats use **Normal (POC)**. Difficulty is stored as the enum `NORMAL` so
future rulesets can add alternatives without changing old saves. In this
ruleset it gives no extra stars, vision, technologies, units, combat modifier,
or hidden-state access.

The AI receives its filtered `PlayerView` and `queryPlayerCommands(view)` from
the same public API as the UI. It rebuilds candidates after every accepted
command and compares this signed-integer tuple lexicographically:

```text
priority, strategicValue, immediateValue, safetyValue, objectiveValue,
commandKindOrdinal, targetY, targetX, primaryEntityId, contentOrdinal
```

Larger values win through `objectiveValue`. The final five deterministic fields
use ascending values, implemented by negating them before tuple comparison.
Command ordinals use the v5 order in section 0.4. Content ordinals use the
frozen faction/technology/unit/reward tables. These fields resolve all v5 ties; Normal consumes
no PRNG draw.

The stable target coordinate is the final path step for Move/Escape, defender or
wall coordinate for Attack, edge coordinate for Roll, command coordinate for
Build/Candify/Harvest/Hunt/Lumber/Mine, and city coordinate for Train/choice.
Research and End Turn use `(-1,-1)`. `primaryEntityId` is acting unit ID when
present, otherwise target wall ID, city ID, then 0. `contentOrdinal` is the
referenced direction, faction, unit, technology, or reward-table ordinal and 0
when none. Unavailable score
components are always 0.

### 12.1 Threat, economy, production, and movement heuristics

An owned city is **known threatened** when it is besieged or a visible hostile
unit has Chebyshev distance `d` to the city satisfying
`d <= hostile.range + hostile.move`. This deliberately overestimates paths
rather than reading hidden terrain or opponent technology. Threat severity is
3 for siege, 2 when `d <= range`, and 1 otherwise. Equal threats choose greater
severity, capital first, lower city-tile defender HP first (empty uses one more
than the greatest unit max HP), then city coordinate `(y, x)` and city ID.

Every legal retained candidate receives exactly one priority below; section
0.6 inserts the v5 Candy priorities between these values:

| Priority | Candidate                                                                      |
| -------: | ------------------------------------------------------------------------------ |
|     1200 | Capture that visibly ends the match                                            |
|     1160 | Other hostile-city Capture                                                     |
|     1140 | Neutral-village Capture                                                        |
|     1100 | Promote                                                                        |
|     1060 | Guaranteed kill of a unit threatening an owned city                            |
|     1050 | Train in a threatened city                                                     |
|     1040 | Move a friendly unit onto an empty threatened city tile                        |
|     1030 | Other legal attack against a threatening unit                                  |
|     1000 | Other guaranteed kill                                                          |
|      950 | Mandatory city reward or Candify city choice                                   |
|      920 | Research on a shortest prerequisite chain to a visible owned resource action   |
|      900 | Fruit/Animal/Lumber/Mine growth that reaches at least one level                |
|      880 | Other Fruit/Animal/Lumber/Mine growth                                          |
|      860 | General training                                                               |
|      840 | Research on a shortest chain to an absent trainable role with a potential slot |
|      820 | Other legal research                                                           |
|      700 | Other non-lethal attack                                                        |
|      600 | Move/Escape that reduces distance to a known objective                         |
|      500 | Move/Escape maximizing new frontier exposure                                   |
|      350 | Recover below half maximum HP                                                  |
|      250 | Other legal Recover                                                            |
|        0 | End Turn                                                                       |

Wait is deliberately excluded from AI candidates. A potential training slot is
an owned non-besieged city with non-exempt assigned count below level; it need
not currently have an empty center or enough stars for the future unit.
"Shortest prerequisite chain" counts unresearched nodes including the candidate,
then breaks ties by technology table order. Visible resource research considers
explored owned Fruit/Ore/Animal and empty unimproved Forest not blocked by
siege/pending reward. Growth is a
level-up candidate when current population plus its gain is at least
`city.level + 1`.

For threatened-city training, retain only one offered type per city in the
order Defender, Warrior, Archer, Rider, Catapult, taking the first
unlocked/affordable type. For general training, role preference is Rider,
Archer, Catapult, Defender,
Warrior. Choose the first missing **available** role; if none is missing and
available, choose the least-represented available role, breaking equal counts
by that order. Unlike the v2 policy, an unavailable preferred role never causes
the AI to save a usable slot: it falls through to an available type. Repeat
after every accepted command, so a greedy AI may fill every legal slot.

`strategicValue` is threat severity for defense candidates; number of currently
visible resource targets unlocked along the selected research chain for
resource research; `1` for a level-producing growth action; and otherwise 0.
`immediateValue = 10 * hostileHpLost - 8 * ownHpLost + 20 * citiesAcquired +
5 * populationGained + starsDelta`, with absent terms zero. `safetyValue` is the
negative sum of public combat-estimate damage from visible hostile units that
could attack the acting unit's resulting tile without moving.

Known objectives are visible neutral villages plus visible hostile cities,
never allied cities. `objectiveValue` is negative Chebyshev distance from the
resulting tile to the nearest objective, choosing equal objectives by `(y, x)`.
When none is known, frontier value is the count of unexplored, non-allied-blocked
tiles that the move's public reveal radius would cover; equal gain prefers the
result with greater distance from its start, then the normal stable fields.
Unknown terrain/entities contribute nothing. This makes units actively explore
until they find capturable settlements or the human enemy.

### 12.2 Greedy execution boundary

Normal takes every affordable higher-priority economic/production action and
every useful unit activation available under the table; it does not preserve a
speculative star reserve. It executes until End Turn or 128 accepted commands.
The runner reserves the last two slots for a pending choice and End Turn. At
the limit it resolves a mandatory city/Candify choice, then issues End Turn; a rejected
selection is a structured runner error, never a hidden-information retry.
Animation speed never changes selection or event order.

### 12.3 Cooperative AI mode

`COOPERATIVE` creates one fixed relationship graph from serialized
`GameState.humanPlayerId`: that player is hostile to every other player, every
pair of non-human AI seats is allied, and no other relationship exists. A
headless policy controller never changes this identity. It is an authoritative
rules mode, not merely an AI preference:

- Attack and retaliation can target only hostile units. AI-on-AI `ATTACK`
  returns `TARGET_ALLIED`; allied units exert no ZOC against one another.
  Chocolate Walls are the explicit targeting exception, though Normal policy
  never attacks its own or an allied wall.
- Capture may take a neutral village or hostile city only. AI-on-AI `CAPTURE`
  returns `TARGET_ALLIED`, and an allied unit never besieges an allied city.
- An AI Move/Escape cannot enter or cross a tile marked as another AI's
  territory, whether explored or exposed only by `diplomaticBlock`. Allied
  units outside territory remain ordinary occupancy blockers.
- An AI cannot Build or Candify allied territory. Donut Roll legality retains
  friendly/allied damage, but Normal excludes every Roll with a visible allied
  victim or wall. Faction never changes relationships.
- Reveal operations omit currently allied territory that is not already
  explored. There is no shared vision, map contents, stars, technology, income,
  healing, unit control, reward, or city capacity.
- Normal excludes allied units/cities/territory from threats, attacks, capture
  objectives, safety damage, and frontier pathing. It may still capture neutral
  villages and uses all economic, research, production, and growth heuristics.
- Human commands remain hostile toward every AI. Capture/elimination/victory
  timing is otherwise unchanged; if the human is eliminated, Defeat ends the
  browser match immediately without simulating allied survivors.

For an untrusted v5 command, relationship validation occurs after actor/target
existence, active ownership, and exploration checks but before range, damage,
siege, or capture effects. Attack/Capture against a visible ally returns
`TARGET_ALLIED`. Move/Escape validates path coordinates and public exploration
first, then returns `ALLY_TERRITORY_FORBIDDEN { at }` for the first allied path
step before terrain, occupancy, or ZOC validation. Every rejection is atomic
and carries no additional hidden payload.

## 13. Save, replay, restart, and failure rules

After each accepted command and after match creation, write one versioned
autosave containing resolved setup, authoritative state, PRNG state, command
log, and final command index. A write failure shows a non-blocking warning and
keeps the in-memory match playable. Resume validates schema, ruleset, canonical
hash, and command index; incompatible or corrupt data is never partially loaded.

Replay reconstructs from resolved setup and seed, applies accepted commands in
order, and compares checkpoint/final hashes. Rejected commands are not logged.
AI commands are logged exactly like human commands. Playback timing and skipped
animations are presentation only. There is no undo because movement can reveal
hidden information. Restart requires confirmation and creates the same initial
state from the stored resolved setup and seed with an empty command log.

Ruleset 5 uses game-state schema 5 plus command, event, replay, and save envelope
version 5. It retains all v4 fields and adds setup/player faction identity,
Chocolate Wall state, dynamic territory semantics, the Candify pending-choice
arm, the exact commands/events/errors in section 0.4, and generalized combat
targets. Cooperative relationships still derive solely from setup plus
`humanPlayerId`; faction adds no mutable diplomacy.

The exact v5 setup parser requires the nine standard fields, including
`aiMode: "RIVAL" | "COOPERATIVE"` and exact `factions`, or those nine plus
`scenario: "DEMO"`; it rejects missing, undefined, unknown, extra, non-square,
unsupported-size, invalid-faction, wrong-length, or sparse-array input. Demo
requires its fixed rival/all-Original setup. Standard writers omit only
`scenario`, never `aiMode` or `factions`.

Settings remain `pulpWars.settings.v1`; Full/Reduced already represents the
required motion choice. Recognized ruleset/save/replay versions 1 through 4 are
reported as **incompatible**, retained byte-for-byte, and never replayed or
partially migrated under ruleset 5. The UI offers Delete Save or New Conquest;
it does not silently overwrite on load.

There is deliberately no v4-to-v5 active-save or replay migration. Although an
all-Original initial position could be decorated with faction fields, v5 changes
the exact setup parser, Attack payload, entity allocator domain, state
invariants, public command order, Normal candidate order, and canonical hashes.
Inventing factions for seats or rewriting commands/checkpoints would no longer
be byte-for-byte replay verification. Legacy readers remain only for explicit
diagnostics and fixtures; new matches and exports write version 5. A recognized
legacy save returns `INCOMPATIBLE`, preserves its bytes, and offers Delete Save
or New Conquest; it is never parsed as corrupt or silently overwritten.

Autosave lifecycle and canonical serialization are specified in
[Client Architecture](../architecture/CLIENT_ARCHITECTURE.md#10-persistence-and-versioning).

Ruleset-5 Demo Match uses the same state/save/replay schema versions. Its
scenario discriminator, fixed rival `aiMode`, and all-Original faction array are
preserved by restart, autosave, load, replay, and headless creation. Existing
v2/v3/v4 Demo and standard hashes remain historical compatibility fixtures, not
v5 expected hashes. V5 fixtures must record new initial, post-command,
save/resume, replay, and headless hashes after implementation.

## 14. Deliberate baseline decisions

These choices settle the open questions in research section 17 and are Pulp
Wars contracts, not assertions about private Polytopia internals:

1. victory requires eliminating rivals by taking all cities, not capitals or score;
2. board presets, village counts, separation, varied Forest/resource generation,
   minimum opportunities, and connectivity are fixed above;
3. Climbing unlocks terminal mountain movement and 1.5x mountain defense;
4. all seats start with 5 stars and normal-income parity; Fruit, Animal, Lumber
   Mill, and explicit-Ore Mine growth are included;
5. city levels are uncapped, retain rewards only at levels 2/3, use level-based
   non-exempt training capacity, begin with 3 x 3 territory, and allow connected
   Candy expansion under section 0.3;
6. exploration persists, has no live re-fog, and AI has information parity
   except for the explicit content-free allied-territory boundary marker;
7. combat keeps rational half-up rounding and adds the exact Catapult boundary;
8. auto/explicit recovery and promotion are included; disband is excluded;
9. the one greedy Normal policy, cooperative relationship rules, limits, and
   tie-breaks are defined above;
10. AI animation may fast-forward; undo is excluded;
11. art geometry is renderer configuration defined under `docs/art/classes/`;
12. Original and Candy labels, roster mapping, and their exact asymmetric
    actions are the approved v5 faction contract.
