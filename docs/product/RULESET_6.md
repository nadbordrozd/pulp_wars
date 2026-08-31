# Pulp Wars Ruleset 6

**Status:** authoritative new-match contract

**Ruleset ID:** `pulp-wars-poc-6`

**Source brief:** [Land-only 4X economy and technology tree](../new_instructions.md)

**Related contracts:** [client architecture](../architecture/CLIENT_ARCHITECTURE.md),
[headless simulation](../architecture/HEADLESS_SIMULATION.md),
[Normal AI](../architecture/NORMAL_AI.md), [screen flow](../ui/SCREEN_FLOW.md),
[validation](../validation/POC_VALIDATION.md), and
[art direction](../art/ART_DIRECTION.md)

This document converts the source brief into the complete deterministic
ruleset-6 contract. The brief's MVP list is implementation order only: all 25
technologies, all nine roles, both faction registrations, and every system in
this document are final ruleset-6 scope. Ruleset 5 remains historical evidence
in [POC Rules](POC_RULES.md); it is not a fallback for an omitted rule here.

## 1. Version, compatibility, and frozen order

Game state, command/event envelopes, replay, and save are version 6. New data
uses only `pulp-wars-poc-6`. Recognized versions 1 through 5 return
`INCOMPATIBLE` (or `INCOMPATIBLE_REPLAY`), remain byte-for-byte untouched, and
are never migrated, decorated, or replayed under v6. Settings remain
`pulpWars.settings.v1`. Canonical JSON, SHA-256 hashing, Mulberry32, uint32 seed
conversion, command atomicity, and the shared browser/headless kernel retain
their ruleset-5 contracts.

The following ruleset-5 sections are deliberately imported, with terminology
and version mechanically replaced by this document: Match Setup section 2
(except Demo), Players/Rounds section 4, Cities/Villages/Siege/Capture section
6, persistent Exploration section 8, unit lifecycle section 10, rational Combat
section 11, Cooperative mode section 12.3, and Save/Replay failure behavior
section 13. Ruleset-6 sections override their economy, technology, role,
movement, territory, reward, currency, schema, and faction details. No other v5
content is imported. V6 setup rejects every `scenario` field; the historical
Demo action/scenario is removed rather than silently rebuilding its curated
state on a different map economy.

Every v6 setup requires `mapGenerationRevision: "SPATIAL_ECONOMY"`. Missing,
undefined, old `REDUCED_VILLAGES`, and unknown revisions reject as
`INVALID_SETUP`; there is no unmarked v6 generator path.

The product remains a client-only, local, single-human Conquest match against
one to three equal-rules Normal AI seats in Rival or Cooperative mode. There is
no server/account, online multiplayer, water/naval/air layer, general diplomacy,
score/timed victory, upkeep, inventory, resource stockpile, undo, live re-fog,
or animation-dependent rule. Original and Candy are the only factions.

Frozen `FactionId` order is `ORIGINAL`, `CANDY`. Each faction registers its own
tree under frozen `FactionTreeId` order `ORIGINAL_BASELINE`,
`CANDY_BASELINE_V1`. The two registrations initially have the same graph,
costs, prerequisites, starting technology, and mechanical role unlocks. Their
unit labels, art, and the explicit Candy rule substitutions in section 10
differ. A faction is immutable for a match; factions may repeat across seats.

Frozen terrain order is `GRASS`, `FOREST`, `MOUNTAIN`. Frozen resource order is
`FRUIT`, `GAME`, `FERTILE_GROUND`, `ORE`, `STONE`. Frozen economic improvement
order is `FARM`, `LUMBER_CAMP`, `MINE`, `QUARRY`, `WINDMILL`, `SAWMILL`,
`FORGE`, `STONEWORKS`, `WORKSHOP`, `GRAND_WORKS`, `MARKET`. `ROAD` is a separate
boolean infrastructure layer and may coexist with a resource or improvement.
Every other resource/improvement combination is exhaustive under section 4.

Frozen mechanical `UnitRoleId` order is `FIGHTER`, `SCOUT`, `MARKSMAN`,
`GUARD`, `RAIDER`, `MEDIC`, `HEAVY`, `BREACHER`, `JUGGERNAUT`. State serializes
the role, never a faction label. Rules and public views resolve the owning
player's faction registration; localized names and art do not enter hashes.

Frozen technology order is:

1. `GATHERING`
2. `FARMING`
3. `MILLING`
4. `CRAFT`
5. `GRAND_WORKS`
6. `HUNTING`
7. `FORESTRY`
8. `SAWMILLING`
9. `MARKSMANSHIP`
10. `FIELDCRAFT`
11. `SURVEYING`
12. `MINING`
13. `METALLURGY`
14. `QUARRYING`
15. `MASONRY`
16. `SCOUTING`
17. `ROADS`
18. `COMMERCE`
19. `RAIDING`
20. `MANEUVER`
21. `DRILL`
22. `FORTIFICATION`
23. `EXPLOSIVES`
24. `MEDICINE`
25. `RECOVERY`

Frozen serialized command-kind order is `MOVE`, `ATTACK`, `KAMIKAZE_ROLL`,
`HEAL_ADJACENT`, `RECOVER`, `CAPTURE`, `PROMOTE`, `WAIT`,
`BUILD_CHOCOLATE_WALL`, `CANDIFY`, `RESEARCH`, `HARVEST_FRUIT`, `HUNT_GAME`,
`BUILD_FARM`, `BUILD_LUMBER_CAMP`, `BUILD_MINE`, `BUILD_QUARRY`,
`BUILD_WINDMILL`, `BUILD_SAWMILL`, `BUILD_FORGE`, `BUILD_STONEWORKS`,
`BUILD_WORKSHOP`, `BUILD_GRAND_WORKS`, `BUILD_MARKET`, `CLEAR_FOREST`,
`REPLANT_FOREST`, `BUILD_ROAD`, `REDEVELOP`, `TRAIN`,
`CHOOSE_CANDIFY_CITY`, `CHOOSE_CITY_REWARD`, `END_TURN`. Frozen cardinal order
is `NORTH`, `EAST`, `SOUTH`, `WEST`. Within a command kind, sort target `(y,x)`,
acting entity ID, then referenced content ordinal.

Frozen `RewardId` order is `SURVEY`, `STOCKPILE`, `WALLS`, `MILITIA`, `EXPAND`,
`BOOM`, `JUGGERNAUT`, `TREASURY`.

## 2. Core state and exact arithmetic

Authoritative state adds or replaces these v5 concepts:

```ts
interface GameState {
  readonly schemaVersion: 6;
  readonly rulesetId: "pulp-wars-poc-6";
  readonly pendingChoices: readonly PendingChoice[];
  // retained setup, board, players, cities, units, walls, PRNG and turn data
}

interface TileState {
  readonly terrain: "GRASS" | "FOREST" | "MOUNTAIN";
  readonly resource:
    "FRUIT" | "GAME" | "FERTILE_GROUND" | "ORE" | "STONE" | null;
  readonly improvement: EconomicImprovementId | null;
  readonly road: boolean;
  readonly territoryCityId: CityId | null;
}

interface CityState {
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number;
  readonly expanded: boolean;
  readonly rewards: readonly CityRewardRecord[];
}

interface UnitActivationV6 {
  readonly moved: boolean;
  readonly movedPathLength: number;
  readonly attacked: boolean;
  readonly healed: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly specialActed: boolean;
}

type PendingChoice =
  | {
      readonly kind: "CITY_REWARD";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly candidates: readonly RewardId[];
    }
  | {
      readonly kind: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    };
```

All values are safe integers. Half-point unit stats are stored as integer
half-units (`attack2`, `defense2`); display divides by two. No floating-point
value enters rules data or state.

For level `L`, cumulative population already spent is
`growthSpent(L) = L * (L + 1) / 2 - 1`. The city invariant is:

```text
population = permanentPopulation + economicPopulation - growthSpent(level)
```

`permanentPopulation` is cumulative Fruit, Game, Boom, and any later explicit
permanent grant. `economicPopulation` is recomputed from the live buildings
whose tiles currently have that `territoryCityId`, including their current
processor/mixed contribution. A positive change repeatedly levels while
`population >= level + 1`, subtracting the threshold by increasing
`growthSpent`. A negative change may make `population` negative. Level and
earned reward records never decrease. Every arithmetic operation preflights
safe-integer bounds; overflow rejects the initiating transaction atomically as
`INTEGER_OVERFLOW`.

After any build, redevelopment, capture, territory transfer, or destruction,
recompute affected cities from the final tile graph in ascending city ID,
compare each new `economicPopulation` with its stored value, then resolve level
gains in city-ID and reached-level order. Emit all building/territory facts
first, then `CITY_ECONOMY_CHANGED` in city-ID order, then `CITY_LEVELED_UP` in
city-ID/reached-level order. This prevents destroy/rebuild population farming.

## 3. Coins, cities, capacity, and territory

`COINS` is the only spendable currency and the only human-facing term. `stars`,
star glyphs, and `INSUFFICIENT_STARS` do not exist in a v6 parser, view, event,
or UI. All seats start with 5 Coins. Start Turn credits, per non-besieged city:

```text
base = city.level + (city.isCapital ? 1 : 0)
market = live Market output from section 7
negativePopulation = min(0, city.population)
cityIncome = max(0, base + market + negativePopulation)
```

Cities process in ascending ID. A besieged city produces zero. Market income
and negative population are live previews; neither changes level or unit
capacity.

Every seat starts with Gathering researched, one level-1 capital, one full-HP
faction Fighter on that capital, and the retained radius-2 exploration. The
Fighter is assigned to and counted by its capital. The first Start Turn grants
ordinary income; none is prepaid.

A level-`L` city has capacity `L + 1`. Every living unit with that
`homeCityId`, including the starting Fighter, counts. Training requires
`count < L + 1`; a legal train reaches equality at most. Militia and
Juggernaut rewards assign a counted unit and may exceed capacity; valid
over-capacity state destroys nothing and merely disables training. The v5
`capacityExempt` distinction is absent from new state.

Each generated or captured city begins with its centered 3 x 3 Chebyshev
footprint. A tile belongs to at most one city. Level-4 Expand permanently sets
`expanded = true` and claims every on-board neutral tile in the centered 5 x 5
footprint; tiles already assigned to any city are retained by that city.
Consequently close cities can have a clipped contested footprint. Capture
transfers every tile assigned to the captured city.

Ruleset-6 Candify no longer grows unbounded chains. Its target must lie within
the chosen city's current 3 x 3 footprint, or 5 x 5 when expanded. It may annex
neutral or hostile non-settlement territory in that footprint, subject to the
v5 nearest-city, tied-choice, cooperative-alliance, and hostile-connectivity
rules. A currently assigned tile still has exactly one city. This deliberately
reconciles Candy identity with Expand as the sole way to enlarge a city's
economic footprint.

## 4. Map resources and basic development

V6 retains square land-only sizes 11/14/16/20/25, current reduced settlement
counts, spacing, 18% Mountain and 24% Forest targets, connected capitals, and
retry ordering. After terrain and
settlements are fixed, visit every non-settlement coordinate in `(y,x)` order
and consume exactly one `nextUint32` resource draw:

| Setup            | Board | Neutral villages | Total settlements |
| ---------------- | ----: | ---------------: | ----------------: |
| 1 AI Auto/Tiny   |    11 |                3 |                 5 |
| 2 AI Auto/Small  |    14 |                4 |                 7 |
| 3 AI Auto/Normal |    16 |                6 |                10 |
| 1/2/3 AI Large   |    20 |         13/12/11 |                15 |
| 1/2/3 AI Huge    |    25 |         20/19/18 |                22 |

Explicit sizes at least as large as the seat's Auto minimum remain legal;
Auto never resolves to Large/Huge.

For cell count `C`, Mountain count is `roundHalfUp(C*18/100)` and Forest count
is `roundHalfUp(C*24/100)`: respectively 22/29 on 11, 35/47 on 14, 46/61 on
16, 72/96 on 20, and 113/150 on 25. Settlement centers replace neither target;
generation allocates the exact terrain counts among non-settlement cells.

Settlements are empty Grass, at least two cells from an edge, and at Chebyshev
distance at least 3 from one another. Capital pairs are at least
`floor(width/2)` apart. Every capital has at least four non-Mountain neighbors,
and all capitals join one eight-way Grass-or-Forest component. Seat/capital and
turn-order shuffles remain separate. A rejected candidate continues the same
serialized PRNG stream; attempt 256 returns `MAP_GENERATION_FAILED` without
weakening a constraint.

| Terrain  | Draw interval                  | Resource       |
| -------- | ------------------------------ | -------------- |
| Grass    | `u < 0x20000000`               | Fruit          |
| Grass    | `0x20000000 <= u < 0x80000000` | Fertile Ground |
| Grass    | otherwise                      | none           |
| Forest   | `u < 0x50000000`               | Game           |
| Forest   | otherwise                      | none           |
| Mountain | `u < 0x30000000`               | Ore            |
| Mountain | `0x30000000 <= u < 0x90000000` | Stone          |
| Mountain | otherwise                      | none           |

Settlement centers are empty Grass and still consume no resource draw. Reject
a candidate unless every settlement has at least three immediately usable
economic opportunities among its eight neighbors and at least two distinct
families among agriculture, timber, metal, and stone. Fruit, Fertile Ground,
Game, Ore, Stone, and an empty Forest each count as one opportunity; a Game
Forest counts once. Reject unless every resource type occurs globally. These
checks happen after all draws and use the continued PRNG stream on retry.

Resource visibility is technology-gated even on explored tiles: Fruit and
Fertile Ground require Gathering; Game requires Hunting; Ore and Stone require
Surveying. Before its reveal technology, the public resource arm is
`UNKNOWN_RESOURCE`, not `null`; legal queries, AI, map art, tooltips, and
previews cannot distinguish its kind or absence. Improvements and Roads on an
explored tile are always public.

Basic actions require an explored tile assigned to an owned, non-besieged city
with no pending reward for that city. A unit is neither required nor a blocker.

| Action            | Tech      | Exact target                    | Cost |   Population |
| ----------------- | --------- | ------------------------------- | ---: | -----------: |
| Harvest Fruit     | Gathering | Grass + Fruit                   |    2 | permanent +1 |
| Hunt Game         | Hunting   | Forest + Game                   |    2 | permanent +1 |
| Build Farm        | Farming   | Grass + Fertile Ground          |    5 |      live +2 |
| Build Lumber Camp | Forestry  | Forest, no resource/improvement |    3 |      live +1 |
| Build Mine        | Mining    | Mountain + Ore                  |    5 |      live +2 |
| Build Quarry      | Quarrying | Mountain + Stone                |    4 |      live +1 |

Harvest/Hunt consume the resource. Farm/Mine/Quarry consume their marker and
install the improvement. Lumber Camp leaves Forest. No basic improvement
produces Coins. A Road may coexist and is ignored by target validity.

Clear Forest requires Forestry and an explored owned Forest with no resource,
improvement, or settlement. It costs 0, changes terrain to Grass, keeps any
Road, and grants exactly 1 Coin. Replant Forest requires Fieldcraft and an
explored owned Grass with no resource, improvement, or settlement. It costs 4,
changes terrain to Forest, keeps any Road, and grants no population.

## 5. Specialized processors

“Adjacent” means any of eight Chebyshev neighbors. A connected cluster uses
four-way orthogonal edges only. Unless stated otherwise, a processor counts
only basic improvements whose `territoryCityId` equals its own city. Each
processor costs 5 Coins, requires an empty resource/improvement-free tile in
owned non-besieged territory, and is limited to one of its type per city.

- `WINDMILL` (Milling) must touch a Farm. It contributes +1 population per
  Farm in the orthogonally connected same-city Farm component touching it,
  capped at +8. If it touches multiple components, use their union; a Farm is
  counted once.
- `SAWMILL` (Sawmilling) is the Lumber Camp equivalent, +1 per connected
  same-city Lumber Camp, capped at +8.
- `FORGE` (Metallurgy) contributes +2 per immediately adjacent same-city Mine.
  There is no cap beyond eight adjacent cells.
- `STONEWORKS` (Masonry) contributes +1 per adjacent same-city Quarry, plus +2
  for each complete opposite pair across it. The four pair axes are N/S, E/W,
  NE/SW, and NW/SE. A Quarry may participate in one pair only because each
  direction belongs to one axis.

Farm visual merging follows only four-way same-city Farm connections and is
cosmetic; it uses no simulation PRNG and never changes cluster membership.
Lumber Camps remain distinct sprites; Sawmill cluster UI outlines their
four-way component.

## 6. Mixed economy and Grand Works

Workshop, Grand Works, and Market may count an immediately adjacent friendly
building even when it belongs to another city; hostile, allied-AI, and neutral
buildings never count. “Friendly” means the same player, not merely a
cooperative ally.

`WORKSHOP` requires Craft, costs 4, is limited to one per city, and requires at
least two distinct adjacent basic types among Farm, Lumber Camp, Mine, and
Quarry. It contributes +1 population per distinct type, maximum +4. Duplicate
types do not add value.

`GRAND_WORKS` requires Grand Works, costs 7, is limited to one per city, and
requires at least three distinct adjacent processor types among Windmill,
Sawmill, Forge, and Stoneworks. It contributes +2 population per distinct type:
+6 for three or +8 for four. Duplicate processors do not add value.

Every processor, Workshop, Grand Works, and Market target may use Grass,
Forest, or Mountain but must have `resource: null`, `improvement: null`, no
settlement center, and owned non-besieged territory without a pending reward.
The building preserves its underlying terrain and Road. Thus resources never
coexist with an economic improvement; Roads and Chocolate Walls are the only
separate layers that may coexist with one.

`REDEVELOP { at }` requires Grand Works. It targets one explored economic
improvement assigned to the active player's city, removes it for no cost and no
refund, and retains terrain and Road. Consumed Fruit/Fertile/Game/Ore/Stone does
not return. It may remove basic, processor, Workshop, Grand Works, or Market;
Roads and Chocolate Walls require their own rules and are not Redevelop targets.

## 7. Market and Roads

`MARKET` requires Commerce, costs 7, is limited to one per city, and requires
at least two distinct adjacent families:

- Agriculture: Farm or Windmill
- Timber: Lumber Camp or Sawmill
- Metal: Mine or Forge
- Stone: Quarry or Stoneworks

It produces +1 Coin per distinct adjacent friendly family, maximum 4. If it is
also adjacent to at least one capital-connected friendly Road, add +1; maximum 5. Market produces no population.

`BUILD_ROAD` requires Roads, costs 2, and targets an explored, owned,
non-settlement tile without a Road. It may coexist with any resource,
improvement, unit, or Chocolate Wall and grants no population. Roads transfer
with territory.

A Road is capital-connected when every tile in one orthogonally connected Road
component is controlled by the same player and at least one tile in that
component is orthogonally adjacent to that player's capital center. Market
adjacency remains eight-way. Capture or Candify recomputes connection and
Market income immediately.

Movement uses integer half-step points: a role with Move `M` receives `2*M`
points. Every ordinary adjacent step costs 2. A step costs 1 when both endpoints
are orthogonally adjacent, each endpoint is either a friendly Road or an owned
city center, and at least one endpoint is a Road in that connected network.
Forest and Mountain steps end the Move even when the Road discount applied;
Fieldcraft removes Forest termination for Scout and Marksman. Surveying is
required to enter Mountain. Road cost never bypasses a missing terrain unlock.
Diagonal movement is legal but never receives the Road discount.

## 8. Technology registrations

Both faction trees start with `GATHERING` already researched. All other nodes
use the exact graph and unlocks below. A player may research any available node
in free order.

| Ord | ID            | Tier | Requires      | Unlocks                                                 |
| --: | ------------- | ---: | ------------- | ------------------------------------------------------- |
|   0 | Gathering     |    1 | —             | Fruit/Fertile reveal; Harvest Fruit                     |
|   1 | Farming       |    2 | Gathering     | Farm; connected field visuals                           |
|   2 | Milling       |    3 | Farming       | Windmill                                                |
|   3 | Craft         |    2 | Gathering     | Workshop                                                |
|   4 | Grand Works   |    3 | Craft         | Grand Works; Redevelop                                  |
|   5 | Hunting       |    1 | —             | Game reveal; Hunt Game                                  |
|   6 | Forestry      |    2 | Hunting       | Lumber Camp; Clear Forest                               |
|   7 | Sawmilling    |    3 | Forestry      | Sawmill                                                 |
|   8 | Marksmanship  |    2 | Hunting       | Marksman role                                           |
|   9 | Fieldcraft    |    3 | Marksmanship  | Scout/Marksman Forest freedom; Replant Forest           |
|  10 | Surveying     |    1 | —             | Mountain movement; Ore/Stone reveal; high-ground vision |
|  11 | Mining        |    2 | Surveying     | Mine                                                    |
|  12 | Metallurgy    |    3 | Mining        | Forge; Heavy role                                       |
|  13 | Quarrying     |    2 | Surveying     | Quarry                                                  |
|  14 | Masonry       |    3 | Quarrying     | Stoneworks                                              |
|  15 | Scouting      |    1 | —             | Scout role and sight                                    |
|  16 | Roads         |    2 | Scouting      | Roads                                                   |
|  17 | Commerce      |    3 | Roads         | Market and capital connection bonus                     |
|  18 | Raiding       |    2 | Scouting      | Raider role / Candy Donut substitution                  |
|  19 | Maneuver      |    3 | Raiding       | Raider and Scout ignore hostile ZOC                     |
|  20 | Drill         |    1 | —             | Guard role                                              |
|  21 | Fortification |    2 | Drill         | Fighter/Guard city defense                              |
|  22 | Explosives    |    3 | Fortification | Breacher role                                           |
|  23 | Medicine      |    2 | Drill         | Medic role                                              |
|  24 | Recovery      |    3 | Medicine      | stronger Medic heal and idle friendly recovery          |

Research cost is evaluated from current owned-city count `C >= 1`:

```text
tier 1 = 5 + (C - 1)
tier 2 = 7 + 2*(C - 1)
tier 3 = 9 + 3*(C - 1)
```

Research consumes no action and no PRNG. Purchases are permanent. Faction tree
registration is required even when two registrations share the graph; no code
may fall back from a missing Candy node to Original implicitly.

## 9. Baseline roles and combat abilities

Displayed half stats are backed by `attack2`/`defense2` integers. Combat keeps
the v5 rational half-up formula and greatest-single-defense-bonus rule.

| Role       | Cost |  HP | Attack | Defense | Move | Range | Unlock           |
| ---------- | ---: | --: | -----: | ------: | ---: | ----: | ---------------- |
| Fighter    |    2 |  10 |      2 |       2 |    1 |     1 | start            |
| Scout      |    3 |  10 |    1.5 |       1 |    2 |     1 | Scouting         |
| Marksman   |    3 |  10 |      2 |       1 |    1 |     2 | Marksmanship     |
| Guard      |    3 |  15 |    1.5 |       3 |    1 |     1 | Drill            |
| Raider     |    4 |  10 |    2.5 |     1.5 |    2 |     1 | Raiding          |
| Medic      |    4 |  10 |    0.5 |     1.5 |    1 |     1 | Medicine         |
| Heavy      |    5 |  15 |      3 |       3 |    1 |     1 | Metallurgy       |
| Breacher   |    5 |  10 |      4 |       1 |    1 |     1 | Explosives       |
| Juggernaut |    — |  40 |      4 |       4 |    1 |     1 | city reward only |

Fighter, Scout, Marksman, Raider, Medic, Heavy, and Juggernaut may move then
use their ordinary Attack/Heal action. Guard and Breacher cannot Attack after
Move. Every role except Medic and Breacher may Capture. Marksman may attack at
range 1 or 2 and never advances on a ranged kill.

A unit may Move once. `movedPathLength` is the number of accepted ordinary Move
path cells and resets to zero at Start Turn. Attack/Heal may occur once and are
mutually exclusive. Recover, Capture, Roll, Wall Build, and completed Candify
are terminal. Roll and Wall Build require no prior Move/Attack/Heal/Recover/
Capture/special; Candify may follow one Move but no Attack/Heal/Recover/Capture/
special. Wait sets only `handled` and does not change later legality. Every
handled action is monotonic until Start Turn. New trained/reward units enter
handled and otherwise exhausted.

Scout sight radius is 2; all other roles use 1. A unit on Mountain with
Surveying adds 1. Reveal uses Chebyshev distance. With Maneuver, Scout and
Raider ignore hostile ZOC while moving; occupancy still blocks every role.

Raider `Charge` adds exactly +1 attack (two half-units) when its accepted
ordinary Move earlier in the same turn traversed at least two path cells and it
then makes a melee Attack. The preview and resolution use the same activation
path length. It has no automatic retreat.

Medic `HEAL_ADJACENT` targets an adjacent living unit owned by the same player,
never itself or an ally. It heals 4 HP, or 6 with Recovery, capped at max HP,
and consumes the Medic's action. It may follow Move and does not grant kills.

Heavy and Juggernaut have Push. If a melee target survives, continue the
attacker-to-target vector one cell. Push only when that cell is on-board,
explored by the attacker, traversable by the target's owner, and contains no
unit, Chocolate Wall, or settlement center. Move the target after combat and
emit `UNIT_PUSHED`; otherwise do nothing. Push never captures or triggers ZOC.

Breacher's melee Attack sets the target defense bonus to 1, ignoring Mountain,
Forest, city, City Walls, and Fortification, but retains the defender's base
defense and normal retaliation. Breach grants no special damage against a
Chocolate Wall and never damages an economic building or territory.

Exploration gates whether the attacker may target an Attack. Once that Attack
is committed, every surviving in-range unit defender retaliates; whether the
defender has explored the attacker's tile is irrelevant in ruleset 6. This is
an explicit ruleset-6 override of the imported ruleset-5 retaliation-visibility
clause, so authoritative resolution and the fog-safe public preview use the
same exact calculation without exposing opponent exploration.

The greatest single ordinary defense bonus is 4/1 for any unit on its friendly
city with the Walls reward; 2/1 for Fighter or Guard on a friendly city after
Fortification; 3/2 for any unit on a friendly city, on Mountain, or on Forest;
and 1/1 otherwise. Bonuses never multiply. Breacher replaces the selected
bonus with 1/1.

Explicit Recover remains 4 HP in friendly territory and 2 elsewhere. End Turn
auto-recovers an otherwise idle unit by the same values; with Recovery, a unit
that spent the whole turn without moving, attacking, healing, capturing, or
using a Candy special recovers 6 in friendly territory. Promotion remains at
three kills, adds 5 max/current HP once, and does not refresh activation.

## 10. Faction role mapping and Candy reconciliation

Original labels equal the role names. Candy uses this frozen mapping:

| Role       | Candy label       | Mechanical relationship                |
| ---------- | ----------------- | -------------------------------------- |
| Fighter    | Candy Warrior     | baseline parity                        |
| Scout      | Jelly Scout       | baseline parity                        |
| Marksman   | Gumball Guard     | baseline parity; gumball projectile    |
| Guard      | Choco Engineer    | baseline parity; Chocolate Wall action |
| Raider     | Donut             | v5 Donut substitution below            |
| Medic      | Marshmallow Medic | baseline parity                        |
| Heavy      | Jawbreaker        | baseline parity                        |
| Breacher   | Candy Crusher     | baseline parity                        |
| Juggernaut | Sugar Titan       | baseline parity                        |

Every Candy-owned unit, including Sugar Titan, has Candify. Choco Engineer may
Build Chocolate Wall for 1 Coin under the v5 wall placement, occupancy, combat,
event, and persistence contract, with `GUARD` as its required role. A Road
neither enables nor blocks Wall placement and remains beneath the Wall.

Donut deliberately substitutes for baseline Raider rather than silently
combining incompatible identities. It costs 3, has HP 10, defense 1, Move 1,
attack/range 0, and no ordinary Attack, Charge, or Dash; it retains Capture,
Candify, and the exact v5 cardinal Kamikaze Roll: path to board edge,
path-cell-only reveal, fixed 10 damage in traversal order to every unit or wall
regardless of relationship/defense, ordered deaths, then self-removal. Maneuver
does not affect Roll. It lets an ordinary Donut Move ignore hostile ZOC so the
node is still meaningful.

The v5 Catapult role and Candy Catapult are retired for new v6 matches.
Explosives unlocks Breacher/Candy Crusher. V5 Candy Warrior, Gumball Guard,
Choco Engineer, Donut, Wall, Candify, and projectile production art may be
reused only where the v6 art contracts explicitly accept it; no saved v5 unit
is converted.

## 11. City rewards and pending order

Every reached level creates exactly one mandatory reward:

| Level | Choice A                              | Choice B                      |
| ----: | ------------------------------------- | ----------------------------- |
|     2 | Survey: reveal Chebyshev radius 3     | Stockpile: +4 Coins           |
|     3 | Walls: persistent 4x city defense     | Militia: free faction Fighter |
|     4 | Expand: claim neutral 5 x 5 footprint | Boom: permanent +3 population |
|    5+ | faction Juggernaut                    | Treasury: +5 Coins            |

New choices append to `pendingChoices` in city-ID/reached-level order. While
the queue is non-empty, only a resolver for its first item is legal. Boom may
cause further levels; append those new rewards immediately after the resolving
item and before any previously later transaction (none can be created while
blocked). Save/replay preserves the exact queue.

Militia/Juggernaut uses the city center when empty, otherwise the owned
traversable city tile of least Chebyshev distance, then `(y,x)`. Chocolate Walls
and units block placement. If none exists, that reward returns
`NO_REWARD_UNIT_PLACEMENT`; its Coin alternative remains legal. Reward units
are full-health, handled/exhausted, assigned to the city, and may exceed
capacity. Survey/Stockpile/Walls/Expand are one-time records; Treasury and
Juggernaut record their source reached level so every level 5+ resolves once.

## 12. Commands, events, errors, and transaction order

The v6 command union adds dedicated commands named by the frozen order and
removes `ESCAPE_MOVE`, `HUNT_ANIMAL`, `BUILD_LUMBER_MILL`, and the v5
technology-specific names. Payloads are `{ at }` for tile actions,
`{ cityId, role }` for Train, `{ unitId, targetUnitId }` for Heal,
`{ unitId, target }` for Attack, and retain exact v5 payloads for Move, Roll,
Wall, and Candify. `CHOOSE_CANDIFY_CITY` is `{ unitId, cityId }`;
`CHOOSE_CITY_REWARD` is `{ cityId, reachedLevel, reward }`. Move is
`{ unitId, path }`, Roll is `{ unitId, direction }`, Wall is `{ unitId, at }`,
and Candify is `{ unitId }`. End Turn has no payload.

Every accepted economic tile transaction orders effects as: deduct Coins;
mutate terrain/resource/improvement/Road; recompute all affected live values;
apply permanent population when applicable; resolve levels and append rewards;
emit the command-specific fact; emit economy deltas; emit level events;
increment `commandIndex`. Research, rewards, and unit actions use their stated
domain order. No v6 economy, technology, movement, or ability command consumes
PRNG.

The event union includes `TECH_RESEARCHED`, `FRUIT_HARVESTED`, `GAME_HUNTED`,
`ECONOMIC_BUILDING_BUILT`,
`ECONOMIC_BUILDING_REMOVED`, `FOREST_CLEARED`, `FOREST_REPLANTED`,
`ROAD_BUILT`, `CITY_ECONOMY_CHANGED`, `CITY_LEVELED_UP`,
`CITY_REWARD_QUEUED`, `CITY_REWARD_CHOSEN`, `CITY_TERRITORY_EXPANDED`,
`UNIT_TRAINED`, `UNIT_REWARD_GRANTED`, `UNIT_HEALED`, `UNIT_PUSHED`, and the
retained movement/combat/capture/wall/Roll/Candify/turn/outcome facts. Building
events carry player, city, coordinate, improvement, cost, and resulting
building contribution. Economy changes carry city ID, prior/new economic
population, prior/new progress, and prior/new Market income. Contributor
IDs/coordinates are query data, not events.

The new event payloads are exact: `TECH_RESEARCHED { playerId, tech, cost }`;
resource events
`{ playerId, cityId, at, cost, permanentPopulationAdded: 1 }`;
`ECONOMIC_BUILDING_BUILT { playerId, cityId, at, improvement, cost,
populationContribution, marketIncome }`; `ECONOMIC_BUILDING_REMOVED { playerId,
cityId, at, improvement, populationContributionRemoved, marketIncomeRemoved }`;
forest events `{ playerId, cityId, at, coinDelta }`;
`ROAD_BUILT { playerId, cityId, at, cost: 2 }`;
`CITY_ECONOMY_CHANGED { cityId, economicBefore, economicAfter,
populationBefore, populationAfter, marketBefore, marketAfter }`;
`CITY_LEVELED_UP { cityId, level }`; `CITY_REWARD_QUEUED { cityId,
reachedLevel, candidates }`; `CITY_REWARD_CHOSEN { playerId, cityId,
reachedLevel, reward }`; `CITY_TERRITORY_EXPANDED { playerId, cityId, tiles }`
with `(y,x)` tiles; `UNIT_REWARD_GRANTED { playerId, cityId, reachedLevel,
unitId, role }`; `UNIT_HEALED { medicId, targetUnitId, amount, hpAfter }`; and
`UNIT_PUSHED { sourceUnitId, targetUnitId, from, to }`. Candidate arrays use
reward order. After each `CITY_LEVELED_UP`, emit its `CITY_REWARD_QUEUED` before
the next reached level. Retained event payloads stay exact under their
deliberately imported v5 sections with renamed v6 role/currency fields.

After common gates `MATCH_ENDED`, `PLAYER_ELIMINATED`, `NOT_ACTIVE_PLAYER`, and
`PENDING_CHOICE`, tile actions validate in this exact order:

1. `TILE_NOT_FOUND`
2. `TILE_UNEXPLORED`
3. action-specific `TECH_REQUIRED { tech }`
4. action-specific `INVALID_TILE { action }`
5. `TERRITORY_NOT_OWNED`
6. `CITY_BESIEGED`
7. `CITY_REWARD_PENDING`
8. `CITY_BUILDING_LIMIT` when applicable
9. `PLACEMENT_REQUIREMENT_UNMET` with public required/count data
10. `INSUFFICIENT_COINS { cost }`
11. `INTEGER_OVERFLOW`

Redevelop uses `REDEVELOP_INVALID_TARGET` at step 4 and omits steps 8/9.
Clear/Replant use `FOREST_ACTION_INVALID_TILE` at step 4. Every rejected command
returns the identical state object, no events, no reveal, no command-index
increment, and no PRNG draw.

Unit commands retain v5 common actor existence/ownership/readiness ordering.
Then Heal validates `UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`,
`HEAL_TARGET_NOT_FOUND`, `HEAL_TARGET_NOT_OWNED`, `HEAL_TARGET_NOT_ADJACENT`,
`HEAL_TARGET_FULL`. Charge and Push are effects, never commands or errors.
Train validates city existence/ownership, siege, reward queue for that city,
role trainability/unlock, center occupancy, capacity, Coins, overflow.

Research validation after common gates is `TECH_NOT_FOUND`,
`TECH_ALREADY_RESEARCHED`, `TECH_PREREQUISITE_MISSING`,
`INSUFFICIENT_COINS`, `INTEGER_OVERFLOW`. A choice resolver first validates
that the queue head matches its kind/entity, then city/unit existence and
ownership, reached level/candidate membership, `NO_REWARD_UNIT_PLACEMENT`, and
overflow. Candify inserts `CANDIFY_OUTSIDE_FOOTPRINT` after its public invalid-
tile check and before relationship/connectivity/nearest-city checks. Capture
emits `CITY_CAPTURED`, recomputes transferred city economies, emits economy and
level events, then resolves elimination/outcome.

## 13. Fog-safe queries and previews

`PlayerView` contains no hidden resource identity. Public command enumeration
is a pure function of the view and offers only exact explored targets whose
legality is derivable without hidden state. Equal views produce byte-identical
commands, previews, AI tuples, and choices.

`EconomicPreview` contains target, cost, owner city, `populationDeltaByCity`
sorted by city ID, `coinIncomeDeltaByCity`, resulting contribution, distinct
types/families, connected contributing coordinates, opposite-pair axes, Road
connection status, building-limit status, and `complete: true`. It is returned
only for an explored offered target. Contributing coordinates are included only
when explored; because a legal player-built contributor was necessarily
explored and persistent fog never closes, an offered preview is complete.
Locked/invalid tiles receive only prerequisite or public placement guidance,
never a speculative preview.

Combat preview includes Charge attack, Breach defense suppression, Heal amount,
and Push as `WILL_PUSH`, `BLOCKED`, or `UNKNOWN_BEHIND_FOG`. Push resolves only
on an attacker-explored behind tile, so `UNKNOWN_BEHIND_FOG` always means no
push if the Attack is committed. Roll continues to expose only direction and
no hidden victims. Resource reveal, Market connectivity, and Candy territory
queries follow the same equality rule.

## 14. Normal AI and headless behavior

Normal remains deterministic, observation-safe, and PRNG-free. It consumes only
`PlayerView`, public commands, and public previews. Its exact tuple and policy
are in [Normal AI](../architecture/NORMAL_AI.md). Spatial economy is not a
random placement fallback: the policy scores the full post-command live delta,
preserves high-value future processor/Grand Works cells, prefers level-crossing
growth, connects built Markets to capitals, and researches shortest visible
unlock chains. It never reads unrevealed resources.

Headless exposes the same v6 parser/kernel, exact faction trees, metrics, and
caps described in [Headless Simulation](../architecture/HEADLESS_SIMULATION.md).
Browser and headless commands/events/checkpoints/hashes must match. V5 goldens
remain frozen compatibility fixtures; v6 gets new fixtures and corpora.

## 15. Presentation and accessibility

Screen flow follows [Screen Flow](../ui/SCREEN_FLOW.md). Required v6 changes are
Coins terminology and iconography; five-branch/25-node faction-specific Tech;
live economic and Market previews; contributor highlighting; negative
population/income explanation; 3 x 3 versus expanded 5 x 5 territory; Road
connection; all nine faction-correct roles; Heal, Redevelop, forest, Road, and
building actions; and the ordered reward queue.

Selecting a build target previews every contributing explored tile on Canvas
with distinct shape/pattern cues for cluster, adjacency, opposite pair,
diversity, processor, and Road connection. Text lists the exact calculation,
so color and animation are never required. The city dock shows
`population / next threshold` even when negative, live building population,
Market Coins, total next-turn income, and `assigned / (level + 1)` capacity.
Responsive docks retain the fixed-Canvas, non-modal, 44 CSS px, 320 px/200%
zoom, keyboard, touch, and reduced-motion contracts.

## 16. Production asset inventory and gates

Production uses only checked-in programmatic PixelLab scripts plus code-native
geometry as classified in the art contracts. Required v6 inventory is:

- 18 faction-role unit sprites and 18 matching portraits: nine Original and
  nine Candy in each asset family;
- shared Farm, Lumber Camp, Mine, Quarry, Windmill, Sawmill, Forge,
  Stoneworks, Workshop, Grand Works, and Market buildings;
- Fertile Ground, Stone, Road segments/connections, and revalidated Fruit,
  Game, Ore, Forest, and terrain families for both territory looks;
- 25 technology icons per faction registration (an identical approved image may
  be explicitly aliased, never silently missing), Coin/income/population/
  capacity/Road/negative-population UI, every build/clear/replant/redevelop/
  heal action, and all reward choices;
- code-native cluster outlines, contributor links, opposite-pair axes, Road
  connection, previews, projectiles, Push, Charge, Heal, and reduced-motion
  effects.

Existing v5 assets are candidates, not automatic acceptance. Reuse requires
the manifest to map the new ID explicitly and a v6 native/minimum-zoom/context
review to prove the old silhouette still communicates the new role. New asset
classes pass at least three representative individual samples before batching;
Juggernaut/Sugar Titan and the dense building set each receive separate scale/
occlusion gates. The class-specific inventories and review matrices are in
`docs/art/classes/`.

## 17. Delivery stages and acceptance

Implementation is serialized but scope is not reduced:

1. schema 6, exact parsers, faction-tree registries, frozen tables, compatibility;
2. resource generation/reveal, permanent/live population ledger, basics;
3. processors and mixed spatial recomputation/previews;
4. Roads/Market, territory Expand, rewards and negative-income behavior;
5. complete Original roster and abilities;
6. complete Candy mapping, retained specials, and faction-correct UI/AI;
7. production assets and visual integration;
8. full deterministic, browser, accessibility, performance, and corpus audit.

No stage may label ruleset 6 complete while later stages remain. The exact
validation matrix is authoritative in
[POC Validation](../validation/POC_VALIDATION.md).

## 18. Deliberate resolutions

These are frozen choices where the source brief was provisional or ruleset 5
conflicted:

- MVP is sequencing, not final scope; all 25 nodes and nine roles ship in v6.
- Game reveals at Hunting; Fruit/Fertile at starting Gathering; Ore/Stone at
  Surveying.
- Juggernaut uses exact 40 HP. Half stats use rational half-units.
- Roads are a coexisting layer, orthogonal for discount/connectivity, cost 2,
  and never grant population.
- Advanced buildings may occupy any terrain after its resource is absent;
  terrain remains authoritative underneath.
- Live population is a derived permanent/live ledger; negative progress lowers
  income but never level/capacity, and rebuild cannot repeat a level reward.
- Large gains use one ordered reward queue. Level 5+ offers a choice at every
  reached level, not only the first.
- Expand claims neutral 5 x 5 cells but never steals a city's assigned tile.
  Candy Candify remains distinct but is bounded by the chosen city footprint.
- Original uses the source roster. Candy has a separate registration: retained
  Candy Warrior/Gumball/Engineer/Donut identities, five new Candy roles, and no
  v6 Catapult. Donut explicitly replaces Charge with its existing Roll rule.
- The v5 Demo is removed instead of pretending its nine-tech curated state is a
  valid v6 showcase. Historical saves/replays remain incompatible and intact.
- Attack target legality still requires attacker exploration, but a surviving
  in-range unit defender always retaliates. Ruleset 6 deliberately removes the
  v5 defender-exploration retaliation gate so public preview and resolution are
  exact and equal-view deterministic.
