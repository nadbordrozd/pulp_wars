# Pulp Wars Ruleset 7: current rules

**Status:** authoritative description of the current Ruleset 7 runtime,
`pulp-wars-poc-7r12` (revision 12: free opening technology, Fruit visible
from the start, Fertile Ground revealed by Gathering, resources kept under
improvements, Normal AI opening research, and Raider Escape). Revision 12 has
no separate overlay document; this document is its contract. Every number
below was checked against the engine code at the time of writing.

**Supersedes for current play:** [Ruleset 7 baseline](RULESET_7.md) and its
overlays, revisions [4](RULESET_7_REVISION_4_BIOME_ECONOMY.md),
[5](RULESET_7_REVISION_5_ACHIEVEMENTS.md),
[6](RULESET_7_REVISION_6_WATER_NAVAL.md),
[7](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md),
[8](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md),
[9](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md),
[10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md), and
[11](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md). Those documents remain as
design history, exact schema/ordering detail, and acceptance provenance. When
one of them disagrees with this document, this document describes the current
rules. In particular, the [baseline](RULESET_7.md) still states revision-3
values and roles that later overlays replaced without editing it (for example
Walls, Mine, and Market numbers, Medic, Scout, Heavy, Horse Archer, Breacher,
Saboteur, and Grand Works); the values here are current. Where a document and
the code disagreed, the code's behavior is the rule and is stated below;
[Known discrepancies](#18-known-discrepancies) is empty as of revision 12.

**Source of truth in code:** `src/engine/rules/ruleset-v7.ts` (technology,
roles, action costs), `src/engine/v7/` (reducer, economy, spatial economy,
combat, movement, map generation, queries, views), and `src/ai/v7.ts` (Normal
AI).

**Not covered here:** production art specifications
([Art Direction](../art/ART_DIRECTION.md) and
[asset classes](../art/classes/naval.md)), UI layout
([screen flow](../ui/SCREEN_FLOW.md) and
[client architecture](../architecture/CLIENT_ARCHITECTURE.md)), validation
evidence ([release validation](../validation/RULESET_7_RELEASE.md),
[tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)), and
performance work ([public planning](../architecture/PUBLIC_PLANNING_V7.md)).

Ruleset 7 does not change Ruleset 6, which remains playable through the
separate [Ruleset 6](RULESET_6.md) route.

## 1. Identity and compatibility

| Boundary                                   | Current value                       |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r12`                |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r12.current`       |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V5` |

- The exact ruleset ID dispatches every state, setup, save, and replay; earlier
  Ruleset 7 identities are rejected, never migrated.
- The current browser route deletes only the known obsolete Ruleset 7 autosave
  keys (through `pulpWars.save.v7r11.current`) and preserves the Ruleset 6
  save, settings, and unrelated storage.
- The normal browser entry and `?ruleset=7` launch Ruleset 7; exact
  `?ruleset=6` launches Ruleset 6; any other value is an unsupported-ruleset
  error.
- All arithmetic is safe-integer and atomic: a rejected command changes no
  state and consumes no Coins, city action, or PRNG draw.
- Only the `ORIGINAL` faction exists in Ruleset 7.

## 2. Setup and map generation

### 2.1 Match setup

A match is one human against 1–3 equal-rules Normal AI seats, in `RIVAL` or
`COOPERATIVE` mode, on a square board.

| Setup field | Legal values                                                                           |
| ----------- | -------------------------------------------------------------------------------------- |
| Board width | 11, 14, 16, 20, or 25 (height equals width); minimum 11/14/16 for 1/2/3 AI             |
| Auto size   | 11, 14, or 16 for 1, 2, or 3 AI                                                        |
| Map type    | `DRY_LAND`, `PANGEA`, `CONTINENTS` (default), `ARCHIPELAGO`, `LAKES`                   |
| AI          | `aiCount` 1–3, difficulty `NORMAL`, mode `RIVAL` or `COOPERATIVE`                      |
| Human color | `CORAL`, `TEAL`, `GOLD`, `VIOLET`                                                      |
| Seed        | uint32; equal setups and seeds generate byte-identical maps, turn order, and treasures |

### 2.2 Settlements and treasures

| Board width | Legal AI counts | Neutral villages for 1/2/3 AI | Total settlements for 1/2/3 AI | Treasure chests |
| ----------: | --------------- | ----------------------------- | ------------------------------ | --------------: |
|          11 | 1               | 3 / — / —                     | 5 / — / —                      |               2 |
|          14 | 1–2             | 3 / 4 / —                     | 5 / 7 / —                      |               2 |
|          16 | 1–3             | 3 / 4 / 6                     | 5 / 7 / 10                     |               2 |
|          20 | 1–3             | 13 / 12 / 11                  | 15 / 15 / 15                   |               4 |
|          25 | 1–3             | 20 / 19 / 18                  | 22 / 22 / 22                   |               5 |

- Every seat has one capital; total settlements are capitals plus villages.
- On widths 11, 14, and 16 the village count follows the AI count, not the
  width: an explicit 16 x 16 board with one AI has 5 settlements, and an
  explicit 14 x 14 board with one AI also has 5. Auto size (11/14/16 for
  1/2/3 AI) therefore gives 5, 7, or 10 settlements. On widths 20 and 25 the
  total is fixed at 15 and 22.
- The chest count is a maximum: if fewer candidate cells exist, fewer chests
  are placed.
- Settlements are Grass land cells at least two cells from an edge and at least
  Chebyshev distance 3 apart; capitals are at least `floor(width / 2)` apart.
- Every settlement's eight-cell ring has at least three economic opportunities
  from at least two families (Agriculture, Timber, Metal).
- Capital fairness: every capital's development score is 6–17 and scores on
  one map differ by at most 5.
- Chests sit on empty Grass/Forest land reachable from a capital (no site,
  resource, or improvement). Moving onto a chest makes one PRNG draw: 5 Coins,
  or a full-HP exhausted Knight on the first legal adjacent land cell, homed to
  the mover's home city first and then by city ID among cities with free
  capacity; if no placement exists the chest gives 5 Coins.
- Generation uses one Mulberry32 stream and at most 256 candidates; a rejected
  candidate continues the stream and constraints never relax.

### 2.3 Map types

| Map type      | Land share | Structure                                                                                         |
| ------------- | ---------: | ------------------------------------------------------------------------------------------------- |
| `DRY_LAND`    |       100% | No water; all capitals share one land component.                                                  |
| `PANGEA`      |     68–76% | One major landmass holds every settlement and at least 90% of land; at least one deep-water body. |
| `CONTINENTS`  |     50–62% | Two major landmasses for two players, otherwise three; capitals on at least two of them.          |
| `ARCHIPELAGO` |     34–46% | Between `playerCount` and `2 * playerCount + 2` major islands; each capital on a different one.   |
| `LAKES`       |     72–84% | At least two enclosed lakes of four or more cells; at least 75% of water is not edge-connected.   |

- Water within one cell of land is `SHALLOW_WATER`; other water is
  `DEEP_WATER`.
- On non-dry maps every inhabited landmass has a settlement adjacent to a legal
  Shallow Water Port site, and all inhabited landmasses are mutually reachable
  by sea once the required technology is researched.
- A capital without useful land expansion receives an affordable sea escape.
- The exact topology algorithm and acceptance bands are in
  [revision 6 §3](RULESET_7_REVISION_6_WATER_NAVAL.md#3-deterministic-map-generation)
  and [revision 7 §2](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md#2-map-acceptance).

### 2.4 Biomes, terrain, and resources

Land is divided into contiguous `PLAINS`, `WOODLAND`, and `HIGHLANDS` regions
(`max(3, roundHalfUp(width * height / 64))` regions), then each land cell draws
terrain and resource from these exact tables.

| Biome     | Grass | Forest | Mountain |
| --------- | ----: | -----: | -------: |
| Plains    |   68% |    23% |       9% |
| Woodland  |   32% |    56% |      12% |
| Highlands |   32% |    23% |      45% |

| Biome     | Grass: Fruit / Fertile Ground / none | Forest: Game / none | Mountain: Ore / none |
| --------- | -----------------------------------: | ------------------: | -------------------: |
| Plains    |                      26% / 24% / 50% |           28% / 72% |            30% / 70% |
| Woodland  |                      17% / 13% / 70% |           48% / 52% |            38% / 62% |
| Highlands |                      12% / 10% / 78% |           30% / 70% |            68% / 32% |

| Water terrain | Fish | Pearls | None |
| ------------- | ---: | -----: | ---: |
| Shallow Water |  28% |    10% |  62% |
| Deep Water    |   0% |    16% |  84% |

- A settlement-ring floor then guarantees family minimums by the settlement's
  biome: Plains 2 Agriculture + 1 Timber; Woodland 1 Agriculture + 2 Timber;
  Highlands 1 Timber + 2 Metal (Ore).
- The complete draw order, cohesion pass, and floor algorithm are in
  [revision 4 §5](RULESET_7_REVISION_4_BIOME_ECONOMY.md#5-exact-map-algorithm).

## 3. Players, turns, and victory

- Every seat starts with 5 Coins, no technology, a level-1 capital, one
  full-HP Fighter homed there, three locked achievement entitlements, and every
  cell within radius 2 of its capital explored.
- Turn order is a seeded shuffle; `round` starts at 1 and increments after the
  last seat in turn order.
- **Relationships:** in Rival mode every pair of players is hostile. In
  Cooperative mode all AI seats are formal allies of each other and hostile to
  the human. Allies cannot attack each other, capture each other's cities, or
  enter each other's territory; they share nothing else.
- **Start Turn** (in order): set the active seat and reset its units'
  activations and capture eligibility; set every owned city's city action
  available; resolve Windmill healing; award income; settle pending city
  rewards; evaluate achievements.
- **End Turn** (in order): auto-recover idle damaged units; expire Inspired and
  Overrun; preview next income; advance to the next active seat and run its
  Start Turn. End Turn is unavailable while a city reward choice is pending.
- The first seat's first Start Turn runs when the match is created, so every
  seat's first turn includes ordinary income.
- **Elimination:** a player owning zero cities is eliminated immediately; its
  units are removed and its future turns skipped.
- **Outcome:** the human wins when every other player is eliminated and loses
  immediately when eliminated. There is no draw, score, or turn-limit victory.

## 4. Cities

### 4.1 Territory

- A city starts with the neutral cells of its centered 3 x 3 footprint; a tile
  belongs to at most one city.
- Capturing a neutral village founds a level-1 non-capital city that claims its
  neutral 3 x 3 cells.
- **Land Grant** (Planning, city action, 6 Coins) assigns every currently
  neutral cell of the centered, board-clipped 5 x 5 footprint to a level-3+
  city and reveals those cells. It requires no siege, no pending reward for the
  city, and at least one claimable cell. Each city ID may be granted once ever,
  even across ownership changes. The rule is canonical: unexplored neutral
  cells count and are claimed. The public command query offers Land Grant
  only when an explored footprint cell has no public territory owner (the
  view hides the city of territory whose center is unexplored, but not its
  owner), so every offer is accepted and no offer depends on hidden cells.
- Capture transfers the city's exact current footprint with everything on it.

### 4.2 Population, growth, and levels

```text
growthSpent(L) = L * (L + 1) / 2 - 1
population     = permanentPopulation + livePopulation - growthSpent(level)
level rises while population >= level + 1
```

- Levels are reached at total population 2 (level 2), 5 (level 3), 9 (level
  4), 14 (level 5), and so on.
- **Permanent** population comes from harvests and the Boom reward and never
  goes away. **Live** population comes from standing improvements, active
  Ports, and connected Roads and is recomputed after every change.
- Live population loss can make displayed population negative but never lowers
  level or repeats a reward.

### 4.3 Income

At Start Turn each owned city pays:

```text
if besieged: 0
else max(1, level + capital + seaTrade + landTrade + market + min(0, population))
```

- `capital` is 1 for a city founded as a capital, under any owner. The bonus
  travels with the city: a captured capital pays its +1 to its new owner (and
  to every later owner), and the former owner loses it. This is separate from
  the _original capital_ that roots Road population and trade
  ([section 9](#9-roads-trade-and-market)).
- `seaTrade` and `landTrade` are each 0 or 1 ([section 9](#9-roads-trade-and-market)).
- `market` is the city's Market income ([section 9.4](#94-market)).

### 4.4 Unit capacity

- Capacity is `level + 1`, plus 1 if the owner has Planning.
- Every living unit counts against its home city; land and naval units share
  capacity.
- Training and treasure Knights need a free slot; reward units may exceed
  capacity, and capacity loss never removes units.

### 4.5 City action

- Each city has one city action per owner turn, spent by exactly one of: land
  `TRAIN`, `TRAIN_NAVAL` from any of its Ports or its Shipyard, or
  `LAND_GRANT`.
- The action becomes available at the owner's Start Turn. A captured city's
  action is unavailable until its new owner's next Start Turn.
- Research, construction, harvesting, unit commands, and reward choices never
  spend it; reward units still appear after the action is spent.
- The flag is visible only to the city's owner.

### 4.6 Training and city-center spawning

- **Land training** requires the role's technology, an available city action,
  a free capacity slot, enough Coins, no siege, no pending reward for the city,
  and an **empty city center**. Any living unit on the center (own or allied)
  blocks land training with `CITY_SPAWN_OCCUPIED`; a hostile occupant besieges
  the city instead.
- **Arms Industry:** while a Forge in the training city has positive output,
  every land role trains for 1 Coin less (minimum 1).
- **Naval training** happens on a selected active, empty Port or Shipyard
  assigned to the city ([section 14](#14-naval-rules)).
- **Reward units** (Militia Fighter, Juggernaut) always appear on the city
  center. An existing occupant moves to the first free adjacent land cell in
  `(y, x)` order that it can legally enter (Engineering for Mountain, no unit,
  no treasure, not allied territory). If none exists, the occupant is removed
  with no refund or kill credit.
- New units are full-HP and exhausted until their owner's next Start Turn.

### 4.7 Siege and capture

- A city is **besieged** while a hostile unit stands on its center: zero income
  and no training, Land Grant, or tile economy for that city. Pending rewards
  can still be chosen.
- **Capture** requires a capture-capable land unit (Fighter, Raider,
  Marksman, Guard, or Juggernaut) that began its owner's turn on a neutral
  village or hostile city center, stands there alone, and has not moved or used
  a primary action this turn. Capture is terminal.
- Capture transfers level, footprint, improvements, Roads, Walls, and reward
  history; re-homes the capturing unit; orphans units homed there by the
  former owner; and spends the city action.
- **Spoils:** with Drill, a player's first capture of each hostile city grants
  2 Coins (never for villages or recaptures).

### 4.8 City rewards

Each reached level grants exactly one reward, chosen by the owner:

| Reached level | Option A                                 | Option B              |
| ------------: | ---------------------------------------- | --------------------- |
|             2 | Survey: explore radius 3 around the city | Stockpile: +4 Coins   |
|             3 | Walls: +2 fortification at the center    | Militia: free Fighter |
|             4 | Boom: +3 permanent population            | Treasury: +8 Coins    |
|         5, 6… | Juggernaut reward unit                   | Treasury: +12 Coins   |

- Rewards settle only for the active player's cities, by city ID then level;
  the first unrewarded level becomes the single pending choice, which blocks
  every other command until chosen.
- A level reached during another player's turn waits for its owner's next
  turn.
- Walls are stored on the city and transfer on capture.

## 5. Achievements and Monuments

| Achievement | Requires    | Condition                                                                                          |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------- |
| Explorer    | Scouting    | at least 100 explored tiles                                                                        |
| Engineer    | Engineering | one owned Windmill, Sawmill, Forge, or Workshop with live output of at least 6 (Workshop max is 4) |
| Muster      | Drill       | at least four distinct living trainable roles owned at once (Juggernaut excluded)                  |

- Progress made before the enabling research counts; unlocking is permanent
  and evaluated after every relevant accepted transition.
- Each unlocked, unspent entitlement funds one `BUILD_MONUMENT`: 0 Coins, +3
  live population, on an explored owned land tile with no site, resource,
  improvement, or treasure (Mountain needs Engineering), at most one Monument
  per city, no siege or pending reward.
- Spent entitlements stay spent if the Monument is removed or captured;
  captured Monuments keep their +3 for the captor.

## 6. Technology

### 6.1 Research cost

```text
tier 1 = 5 + (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

`C` is the researcher's currently owned city count. Research is permanent,
costs Coins only, and needs the one listed prerequisite. No technology starts
known. On `DRY_LAND` the three Naval technologies are visible but cannot be
researched, so Shorecraft is never offered there.

**Free opening technology:** while a player has researched zero
technologies, researching any offered tier-1 technology (Gathering, Hunting,
Scouting, Drill, or Shorecraft where offered) costs 0 Coins. It is not forced
or modal and can be used on any turn; the `TECH_RESEARCHED` event records the
actual cost (0), and the public technology tree and research offers show the
cost as 0 ("Free") while the player is eligible. After the first research the
ordinary formula applies to every technology.

### 6.2 Technology tree

| Branch     | Tier | ID                  | Requires       | Exact unlocks                                                                      |
| ---------- | ---: | ------------------- | -------------- | ---------------------------------------------------------------------------------- |
| Settlement |    1 | `GATHERING`         | —              | reveal Fertile Ground; Harvest Fruit                                               |
| Settlement |    2 | `FARMING`           | Gathering      | Farm; connected-Farm visuals                                                       |
| Settlement |    3 | `MILLING`           | Farming        | Windmill; Windmill Start Turn healing (6 HP)                                       |
| Settlement |    2 | `ADMINISTRATION`    | Gathering      | Captain (Rally, Tend Wounded); Market; Disband                                     |
| Settlement |    3 | `PLANNING`          | Administration | +1 capacity in every owned city; Land Grant                                        |
| Wilds      |    1 | `HUNTING`           | —              | Hunt Game                                                                          |
| Wilds      |    2 | `FORESTRY`          | Hunting        | Lumber Camp; Clear Forest                                                          |
| Wilds      |    3 | `SAWMILLING`        | Forestry       | Sawmill; Catapult                                                                  |
| Wilds      |    2 | `MARKSMANSHIP`      | Hunting        | Marksman                                                                           |
| Wilds      |    3 | `FIELDCRAFT`        | Marksmanship   | Replant Forest; Raider and Marksman ignore Forest movement stops; Marksman Sight 2 |
| Mobility   |    1 | `SCOUTING`          | —              | Raider; Raider Sight 2                                                             |
| Mobility   |    2 | `ROADS`             | Scouting       | Build Road; half-cost Road movement; connected-city Road population                |
| Mobility   |    3 | `COMMERCE`          | Roads          | +1 Coin land trade per connected city; Market income ×2                            |
| Mobility   |    2 | `RAIDING`           | Scouting       | Pillage for all trainable land roles; Raider Charge                                |
| Mobility   |    3 | `CHIVALRY`          | Raiding        | Knight; Overrun; Cultivate Forest                                                  |
| Industry   |    1 | `DRILL`             | —              | reveal Ore; Guard; first-hostile-capture Spoils (2 Coins)                          |
| Industry   |    2 | `ENGINEERING`       | Drill          | land units enter Mountain; +1 Sight on Mountain; Mine; Workshop; Redevelop         |
| Industry   |    3 | `METALLURGY`        | Engineering    | Forge; Arms Industry (−1 land training cost)                                       |
| Industry   |    2 | `FORTIFICATION`     | Drill          | Fighter/Guard Build Field Defense                                                  |
| Industry   |    3 | `EXPLOSIVES`        | Fortification  | Blast Mountain; melee Field Defense demolition                                     |
| Naval      |    1 | `SHORECRAFT`        | —              | Harvest Fish; Build Port; embarkation and Shallow Water transport; Patrol Boat     |
| Naval      |    2 | `NAVIGATION`        | Shorecraft     | Deep Water movement; Gather Pearls; sea trade                                      |
| Naval      |    3 | `NAVAL_ENGINEERING` | Navigation     | Battleship; Shipyard; −2 Coin naval training at a Shipyard                         |

## 7. Resources and visibility

| Resource       | Terrain       | Visible on explored tiles | Used by                     |
| -------------- | ------------- | ------------------------- | --------------------------- |
| Fruit          | Grass         | always                    | Harvest Fruit (Gathering)   |
| Fertile Ground | Grass         | only with Gathering       | Farm                        |
| Game           | Forest        | always                    | Hunt Game                   |
| Ore            | Mountain      | only with Drill           | Mine; blocks Blast Mountain |
| Fish           | Shallow Water | always                    | Harvest Fish                |
| Pearls         | any water     | always                    | Gather Pearls               |

- A tile has at most one resource. Harvested Fruit, Game, Fish, and Pearls
  never regenerate.
- **Resources stay under improvements.** Placing an improvement never
  removes the resource beneath it: the resource stays on the tile, hidden in
  every public view, preview, and Normal AI input while the improvement
  stands, and it is visible and usable again once the improvement is removed
  (Redevelop or Pillage). A Farm always stands on Fertile Ground and a Mine on
  Ore. Ports and Shipyards are the exception: their Fish or Pearls stay visible
  and harvestable. Harvests (Fruit, Game, Fish, Pearls) are not improvements
  and consume their resource. An improved tile never offers a resource action
  for the resource it hides.
- Without Drill, an explored Mountain shows no resource marker, so hidden Ore
  is indistinguishable from an empty Mountain. Likewise, without Gathering an
  explored Grass tile shows no Fertile Ground marker; the mask applies to the
  public view, previews, projected events (a cultivated tile reports no
  resource), and Normal AI input.
- Placement gates for buildings, Monuments, and Replant Forest consider only
  resources the actor can observe, so a player without Gathering may place a
  Sawmill, Workshop, Forge, or Monument on Grass that hides Fertile Ground. The
  Fertile Ground stays under it and is exposed (to viewers with Gathering)
  when the improvement is removed; the removal event reports it as restored.
- **Terrain-transform exception:** terrain transforms are not improvements.
  Replant Forest on Grass that hides Fertile Ground turns the tile into Forest
  and removes the Fertile Ground, which cannot exist on Forest. Clear Forest,
  Cultivate Forest, and Blast Mountain cannot meet a hidden resource (Forest
  resources are always visible and Blast requires Explosives, hence Drill).

## 8. Economic actions and buildings

### 8.1 Common placement gates

Tile economy targets an explored tile assigned to one of the actor's cities
that is not besieged and has no pending reward. No unit is needed. Resource
actions, buildings, and Monuments never target a site (city center or village)
or a treasure tile. Mountain targets for buildings, Monuments, and Roads
require Engineering. Roads always coexist.

### 8.2 Resource and basic actions

| Action            | Tech        | Target                                     | Cost | Result                                  |
| ----------------- | ----------- | ------------------------------------------ | ---: | --------------------------------------- |
| Harvest Fruit     | Gathering   | Grass + Fruit                              |    2 | remove Fruit; +1 permanent population   |
| Hunt Game         | Hunting     | Forest + Game                              |    2 | remove Game; +1 permanent population    |
| Harvest Fish      | Shorecraft  | Shallow Water + Fish (Port tile if active) |    2 | remove Fish; +1 permanent population    |
| Gather Pearls     | Navigation  | any water + Pearls (Port tile if active)   |    2 | remove Pearls; receive 4 Coins (net +2) |
| Build Farm        | Farming     | Grass + Fertile Ground                     |    5 | Farm; +2 live population                |
| Build Lumber Camp | Forestry    | Forest, no resource or improvement         |    3 | Lumber Camp; +1 live population         |
| Build Mine        | Engineering | Mountain + Ore                             |    5 | Mine; +2 live population                |

### 8.3 Processors and mixed buildings

"Adjacent" always means the eight surrounding cells.

| Building | Tech           | Cost | Limit    | Placement needs                                                   | Live output                                                               |
| -------- | -------------- | ---: | -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Windmill | Milling        |    5 | one/city | at least one adjacent same-owner Farm                             | +1 per adjacent same-owner Farm, cap 8                                    |
| Sawmill  | Sawmilling     |    5 | one/city | at least one adjacent same-owner Lumber Camp                      | +1 per adjacent same-owner Lumber Camp, cap 8                             |
| Forge    | Metallurgy     |    6 | one/city | at least one adjacent same-owner Mine                             | +1 per adjacent same-owner Mine, cap 6                                    |
| Workshop | Engineering    |    4 | one/city | at least one adjacent Farm, Lumber Camp, or Mine of the same city | 0 without support; else 1 + number of distinct adjacent basic types (2–4) |
| Market   | Administration |    6 | one/city | at least one adjacent economic family                             | Coins, not population ([section 9.4](#94-market))                         |
| Monument | achievement    |    0 | one/city | an unspent achievement entitlement                                | +3                                                                        |

- Buildings target a land tile with no site, visible resource, improvement, or
  treasure.
- Processor contributors may belong to any city of the same owner, and one
  contributor may support several processors. Workshop counts only its own
  city's improvements.
- A building that loses all support stays in place with zero output and
  recovers when support returns.

### 8.4 Terrain and infrastructure actions

| Action              | Tech          | Target                                                                               | Cost | Result                                             |
| ------------------- | ------------- | ------------------------------------------------------------------------------------ | ---: | -------------------------------------------------- |
| Clear Forest        | Forestry      | owned Forest with no site, resource, or improvement                                  |    0 | becomes Grass; +1 Coin                             |
| Replant Forest      | Fieldcraft    | owned Grass with no site, resource, or improvement                                   |    4 | becomes Forest                                     |
| Cultivate Forest    | Chivalry      | owned Forest with no site, resource, or improvement                                  |    4 | becomes Grass + Fertile Ground                     |
| Blast Mountain      | Explosives    | owned Mountain with no site, resource (including Ore), improvement, or Field Defense |    3 | becomes Grass                                      |
| Build Road          | Roads         | owned or neutral land without site or Road                                           |    2 | adds Road ([section 9](#9-roads-trade-and-market)) |
| Redevelop           | Engineering   | any owned improvement                                                                |    0 | removes it with no refund; re-exposes its resource |
| Build Field Defense | Fortification | see [section 12.3](#123-field-defense)                                               |    3 | adds Field Defense                                 |

- Terrain changes preserve Road, Field Defense, and territory.
- Redevelop can remove Monuments, Ports, and Shipyards (Port or Shipyard only
  when unoccupied); it never removes Roads, Field Defense, terrain, city
  centers, or Walls. A Fish or Pearls marker under a removed Port stays.
- Neutral Road construction skips the siege and pending-reward gates.

## 9. Roads, trade, and Market

### 9.1 Road usability

- A Road stores no builder. While its tile is neutral, every player with Roads
  may use it; once the tile is owned, only the owner may.
- A usable Road node is a Road on a neutral or own-territory tile, or the
  center of a city the player owns.

### 9.2 Road movement

- With Roads, a land step between two adjacent usable Road nodes (orthogonal
  or diagonal) costs half a movement point, so a Move-1 unit crosses two such
  edges.
- A Road step also ignores the Forest and Mountain movement stop; Mountain
  entry still needs Engineering.
- Movement edges need no connection to the capital.
- The engine's Road-movement capability field is named
  `connectedOrthogonalStepCost2` for historical reasons; the half cost applies
  to orthogonal and diagonal steps and needs no capital connection, as stated
  above.

### 9.3 Road population and land trade

- The population graph contains usable Road nodes joined in eight directions
  and is rooted only at the player's **original capital** while the player
  still owns it.
- With Roads, each other owned city in that component gets +1 live
  population, and the original capital gets +1 per such connected city.
- With Commerce, each such connected non-original-capital city also earns +1
  Coin land trade at Start Turn.
- A captured foreign capital counts as an ordinary city. Losing the original
  capital drops all Road population and land trade to zero until recaptured.
- Ports, sea routes, and allies never join this graph. Disconnection removes
  the population without lowering level or repeating rewards.

### 9.4 Market

```text
market income = min(4, 1 + distinct adjacent families) * (Commerce ? 2 : 1)
```

- Families: Agriculture (Farm, Windmill), Timber (Lumber Camp, Sawmill), Metal
  (Mine, Forge). Workshops do not count.
- Contributors may belong to any city of the same owner; a Market with no
  remaining family still pays its 1 base Coin (2 with Commerce).
- A Market pays 1–4 Coins, or 2–8 with Commerce.

### 9.5 Sea trade

- With Navigation, each owned city other than the player's own original
  capital earns +1 Coin at Start Turn when one of its active Ports or
  Shipyards connects to an active Port or Shipyard of a different owned city.
  A captured foreign capital counts as an ordinary city and can earn sea
  trade. The original capital earns none itself but can be the partner city,
  and, unlike land trade, sea trade does not require the player to still own
  its original capital.
- Two docks connect when a path of at most five eight-way steps through water
  the owner has explored (Deep Water included) joins them.
- Mid-route units do not break a connection; a blockaded endpoint does.
- A city earns at most one sea-trade Coin and may also earn land trade.
  Allies never share trade.

## 10. Recovery and support

| Healing source                  | Amount                                                                 | When                                                                         |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Recover or idle recovery, land  | 4 in own territory; 2 elsewhere                                        | explicit terminal `RECOVER`, or End Turn for a unit that did not move or act |
| Recover or idle recovery, naval | 4 on or adjacent to an own active Port/Shipyard; otherwise illegal / 0 | same                                                                         |
| Embarked unit                   | none                                                                   | —                                                                            |
| Windmill (Milling)              | up to 6                                                                | Start Turn, once per unit                                                    |
| Captain Tend Wounded            | up to 2                                                                | Captain action, once per unit per owner turn                                 |

- **Windmill healing:** at the owner's Start Turn, each Windmill in the
  owner's territory heals damaged own units (any form) on its eight
  neighbors. A unit next to several Windmills heals once, assigned to the first
  Windmill in `(y, x)` order. Output does not matter, and healing needs no
  technology, so a captured Windmill heals its new owner's units even without
  Milling.
- **Wait** does not prevent idle recovery; moving or any primary action does.
- **Captain:** may Move, then use one primary action: Attack, Rally, or Tend
  Wounded.
- **Rally:** every adjacent own land unit that is not a Captain or Catapult and
  is not already Inspired becomes Inspired: +1 Attack on its next attack this
  turn. Inspired expires at End Turn and does not stack.
- **Tend Wounded:** heals every adjacent damaged own land unit (other than the
  Captain, not yet tended this turn) by 2. It does not use the target's action.
- **Disband** (Administration): an own land-form trainable unit that has not
  used a primary action (it may have moved) removes itself for
  `floor(printed cost / 2)` Coins. Juggernaut, naval, and embarked units cannot
  Disband.
- **Promotion:** a unit with at least 3 kills may Promote once for free: +5
  maximum and current HP. Embarked units cannot Promote.

## 11. Unit roster

Attack and Defense are shown in whole units (the code stores half-units).

| Unit        | Tech              | Cost |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                |
| ----------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------ |
| Fighter     | start             |    2 |  10 |      2 |       2 |    1 |     1 |     1 | yes               | yes     | Field Defense            |
| Raider      | Scouting          |    4 |  10 |      2 |       1 |    2 |     1 |     2 | yes               | yes     | Charge (Raiding); Escape |
| Marksman    | Marksmanship      |    3 |  10 |      2 |       1 |    1 |   1–2 |    1¹ | yes               | yes     | —                        |
| Guard       | Drill             |    3 |  15 |    1.5 |       3 |    1 |     1 |     1 | no                | yes     | Field Defense            |
| Captain     | Administration    |    5 |  10 |      1 |       1 |    1 |     1 |     1 | yes               | no      | Rally; Tend Wounded      |
| Catapult    | Sawmilling        |    8 |  10 |    3.5 |     0.5 |    1 |   2–3 |     1 | no                | no      | —                        |
| Knight      | Chivalry          |    9 |  10 |      3 |       1 |    3 |     1 |     1 | yes               | no      | Overrun                  |
| Juggernaut  | reward only       |    — |  40 |      4 |       4 |    1 |     1 |     1 | yes               | yes     | Push                     |
| Patrol Boat | Shorecraft        |    5 |  10 |      2 |       2 |    3 |     1 |     2 | yes               | no      | naval                    |
| Battleship  | Naval Engineering |   16 |  25 |      6 |       4 |    2 |   1–3 |     3 | no                | no      | naval; splash            |

¹ Marksman Sight becomes 2 with Fieldcraft.

- An **embarked** land unit has Move 3 on water, Defense 1, Sight 1, no Attack,
  no retaliation, and no ZOC.
- Base Sight gains +1 while standing on a Mountain with Engineering.
- Minimum range limits only the chosen target: a Catapult cannot target an
  adjacent unit but may still fire at another target 2–3 cells away.
- Tactical-role labels (`LINE`, `SKIRMISHER`, and so on) are display metadata
  with no combat effect.

## 12. Movement and unit actions

### 12.1 Movement

- Movement is eight-way; Chebyshev distance defines adjacency, range, sight,
  and ZOC. A Move has `2 * Move` half-points; an ordinary step costs 2 and a
  usable Road edge costs 1.
- A Move ends on entering an unexplored cell, a Forest (unless a Road edge or
  Fieldcraft freedom for Raider and Marksman), a Mountain (unless a Road edge),
  or a cell in hostile ZOC. A path that continues past such a stop is illegal.
- Land units need Engineering to enter Mountain and cannot enter water except
  by embarking.
- Cells with a visible unit are blocked; a hidden occupant or newly seen ZOC
  interrupts the Move at the prior cell instead.
- Allied AI units cannot enter each other's territory.
- **ZOC:** a hostile land unit projects ZOC onto adjacent land cells. A naval
  unit projects it onto adjacent water it could enter. A land unit projects
  onto adjacent water only against an afloat unit it could attack at range 1.
  Embarked units project none. Leaving ZOC is free.

### 12.2 Activation

- Each unit may Move once per turn, and cannot Move after a primary action.
- Primary actions are Attack, Recover, Capture, and specials (Rally, Tend,
  Field Defense, Pillage). Guard, Catapult, and Battleship cannot attack after
  moving.
- `WAIT` only marks the unit handled (it also declines an available Escape).
- **Escape** (Raider, innate): after an accepted Attack that the Raider
  survives, including after a melee kill with its ordinary advance, the Raider
  may make exactly one more ordinary `MOVE` this turn with a fresh full Move 2
  budget, whether or not it moved before attacking. Terrain, Forest/Mountain
  stops, Road half-steps, ZOC, occupancy, fog reveal, treasure, and automatic
  embarkation apply as for any Move. After the escape Move the Raider is
  handled: no further Attack, Capture, Pillage, Recover, Disband, Fortify, or
  other primary action. The player may decline (Wait, End Turn, or simply
  select another unit). Escape is never granted after a non-Attack action and
  never grants or refreshes Charge or Inspired. The canonical activation flag
  `escapeAvailable` is hashed, saved, and replayed; the combat preview and
  `COMBAT_RESOLVED` event carry `escapeAvailable`, every observer of the
  visible Raider sees the activation flag, the owner's unit status reads
  "Escape: may move again", and the public command query offers the escape
  Moves.
- **Pillage** (Raiding): an own land-form non-Juggernaut unit standing on an
  improvement in hostile territory destroys it for +1 Coin, re-exposing any
  resource it hid. It may follow a
  Move but no primary action and is terminal. Roads, Field Defense, terrain,
  resources, city centers, and Walls cannot be pillaged.

### 12.3 Field Defense

- `BUILD_FIELD_DEFENSE` (Fortification, 3 Coins) needs a Fighter or Guard in
  land form that has neither moved nor acted this turn, standing on an
  explored land tile of its owner's territory without Field Defense. It uses
  the unit's whole turn.
- Field Defense is a tile layer, not an improvement: it coexists with Roads,
  resources, improvements, and cities, transfers with the tile, and cannot be
  stacked, pillaged, redeveloped, or removed voluntarily.

## 13. Combat and fortification

### 13.1 Legality

- The target must be a visible, living, non-allied unit within the attacker's
  minimum–maximum range. Embarked units cannot attack.
- Land units may attack afloat units from shore and naval units may attack
  coastal land units.

### 13.2 Damage

```text
attack  = base Attack + 1 (Charge) + 1 (Inspired)
defense = base Defense + fortification level          (embarked: 1)
cover   = 1.5 on Forest or Mountain for land-form defenders, else 1

attackForce  = attack  * attacker.hp / attacker.maxHp
defenseForce = defense * defender.hp / defender.maxHp * cover
total        = attackForce + defenseForce

damageToDefender = roundHalfUp(attackForce  / total * attack  * 4.5)
damageToAttacker = roundHalfUp(defenseForce / total * defense * 4.5)
```

- Both results use pre-combat HP and are capped at current HP. A killed
  defender does not retaliate.
- A surviving defender retaliates only if it has an Attack stat, is not
  embarked, and the attacker is within its own range.
- **Charge:** with Raiding, a Raider that moved at least two cells this turn
  gets +1 Attack on its first attack.
- **Inspired:** +1 Attack on the unit's first accepted attack after Rally.

### 13.3 Fortification

For a land-form defender standing in its owner's territory:

```text
fortification level = 2 (own city center with Walls) + 1 (tile has Field Defense)
```

Each level adds 1 flat Defense before cover. Naval, embarked, and foreign
units on the tile receive none. There is no other city-center defense bonus.

### 13.4 After combat

- **Advance:** a surviving adjacent land attacker (not a Catapult) that kills a
  land defender moves into its cell if explored and enterable (Mountain needs
  Engineering), then reveals sight.
- **Push:** a Juggernaut pushes a surviving adjacent target one cell directly
  away if the cell is on the board, explored by the attacker, empty, not a
  settlement, the same land/water kind as the target, enterable by the target's
  owner, and not in territory allied to the target.
- **Escape:** a surviving Raider may make one more ordinary Move
  ([section 12.2](#122-activation)).
- **Overrun:** after a Knight kills and advances, if a visible hostile unit is
  adjacent to its new cell it may Attack again, with no other action allowed.
  This repeats without a cap until a non-kill, death, or no target.
- **Battleship splash:** every other unit hostile to the attacker on the eight
  cells around the primary target takes `max(1, ceil(primary damage / 2))`,
  with no retaliation or modifiers; splash kills count for the Battleship.
- **Field Defense destruction:** after an attack against a unit on a Field
  Defense tile, it is destroyed for the first applicable reason: a Catapult
  attacked; a surviving Inspired unit attacked at range 1; a surviving land
  attacker whose owner has Explosives attacked at range 1; or the attacker
  advanced into the cell. These attack reasons apply whoever owns the tile:
  neutral, the defender's, a third player's, or the attacker's own territory
  (for example, killing an enemy that stands on your own Field Defense and
  advancing onto it destroys that Field Defense). Separately, a land unit
  entering the empty tile by Move or disembarkation destroys it only when the
  tile's territory belongs to a player hostile to the mover.
- Kills are counted for promotion, including retaliation and splash kills.

## 14. Naval rules

- **Water movement:** only naval and embarked units enter water. Shallow Water
  needs Shorecraft (via embarking or training), Deep Water needs Navigation.
  Every water step costs a full movement point.
- **Embarking:** a land unit embarks by ending a Move on an own active, empty
  Port or Shipyard (Shorecraft). It keeps its identity, HP, kills, and home
  city and is exhausted for the turn.
- **Disembarking:** on a later turn an embarked unit may move through water,
  then `DISEMBARK` onto an adjacent empty land cell it can enter (Mountain needs
  Engineering; no allied territory). This ends its activation, and it cannot
  capture until a later turn.
- **Port** (Shorecraft, 4 Coins): on owned Shallow Water touching land of the
  same city, with no improvement, site, or Road. It may share its tile with
  Fish or Pearls, has no per-city limit, and gives +1 live population while
  active.
- **Shipyard** (Naval Engineering, 5 Coins, one per city): upgrades an active
  Port in place. It keeps all Port functions, gives +2 live population in
  total, and makes naval training 2 Coins cheaper (minimum 1): Patrol Boat 3,
  Battleship 14.
- **Active and blockaded docks:** a Port or Shipyard is active while its city's
  owner owns it and no hostile naval or embarked unit stands on it. A
  blockaded dock gives 0 population and cannot train, embark, harvest its
  resource, recover ships, or join sea trade until the blockader leaves.
- **Naval training:** `TRAIN_NAVAL` selects an active, empty dock assigned to
  the city and spends the city action, capacity, and Coins.
- Naval units cannot capture, embark, pillage, disband, push, or advance, and
  they receive no terrain cover or fortification.
- Reward units and treasure Knights are always land units.

## 15. Fog and observation

- Each player's explored set only grows: from unit and city sight, Survey,
  Land Grant, and capture. There is no live re-fog.
- A unit is visible to another player exactly when it stands on a cell that
  player has explored. Allies do not share exploration.
- Unexplored cells expose only their coordinates. Ore stays hidden without
  Drill and Fertile Ground stays hidden without Gathering; Fruit, Game, Fish,
  and Pearls are visible on every explored tile.
- Owner-private facts (city action flags, trade graphs, research, Coins, and
  achievement progress) are never shown to opponents.
- The browser UI and Normal AI read only the player's public view, public
  command queries, and public previews. Viewer-projected events never reveal
  hidden units, sources, or HP.
- Exact projection rules are in
  [baseline §9](RULESET_7.md#9-observation-safe-views-events-queries-and-artifacts)
  and the relevant overlay sections.

## 16. Normal AI summary

- Normal is deterministic and PRNG-free and uses only the public view, public
  commands, and public previews, never hidden state.
- It ranks work as: save threatened cities; take or set up captures; make
  favorable attacks and protect formations; use support, recovery, economy, and
  movement toward objectives; end the turn.
- It avoids attacks predicted to lose the unit without a city-saving or
  capture-enabling reason, keeps a sole city defender unless replaced, and
  spreads units across objectives.
- **Opening research:** on its first turn Normal researches its free tier-1
  technology before other work, chosen deterministically from its own public
  view of explored tiles within Chebyshev 2 of its original capital: Gathering
  scores 4 per Fruit plus one per three open Grass; Hunting 4 per Game plus one
  per three Forest; Drill 2 per Mountain plus 3 per visible hostile unit within
  4 and 2 per visible hostile city within 5; Shorecraft (only when offered and
  the capital's territory has Shallow Water) 4 per Fish plus one per two
  Shallow Water; Scouting `max(0, 10 - 2 * (Fruit + Game + counted Fish))`.
  The highest score wins; ties follow technology order
  (`src/ai/v7-opening.ts`).
- **Raider Escape:** a Raider attack earns a small bonus for its retreat
  option. After the attack, if visible enemies can reach the Raider, Normal
  only uses an escape Move to a strictly safer visible tile (less projected
  visible damage), preferring own territory and Forest/Mountain cover;
  otherwise ordinary Move scoring applies.
- **Endgame siege:** once expansion is over (no reachable empty neutral
  village), a seat with at least three cities that faces a hostile seat on one
  or two cities (half or fewer of its own, with no more living units) closes
  on that seat's last cities along land routes, clears non-capturing units off
  their centers and approach tiles for its capturers, and commits a combined
  attack when this turn's offered attacks kill the center's defender next to a
  ready capturer (`src/ai/v7-endgame.ts`).
- One city action is compared across land training, every dock, and Land
  Grant. Roads are built only along one corridor of at most eight missing tiles
  from the original capital to a chosen city.
- Each owner turn is capped at 128 accepted commands and scheduled through
  bounded, resumable work units; elapsed time never affects decisions.
- Details: [Greedy Normal AI](../architecture/NORMAL_AI.md),
  [revision 11 §7](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md#7-bounded-normal-ai-policy),
  [tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md), and
  [public planning work](../architecture/PUBLIC_PLANNING_V7.md).

## 17. Revision history

| Revision | Ruleset ID           | Main changes                                                                                                                                                       | Source                                                        |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 3        | `pulp-wars-poc-7r3`  | Original-faction baseline: four land branches, growth rewards, achievements, combat kernel                                                                         | [RULESET_7.md](RULESET_7.md)                                  |
| 4        | `pulp-wars-poc-7r4`  | Regional biomes; Ore returns; Mine 5/+2; Forge +1 per Mine                                                                                                         | [revision 4](RULESET_7_REVISION_4_BIOME_ECONOMY.md)           |
| 5        | `pulp-wars-poc-7r5`  | Explorer achievement; Monument placement flow                                                                                                                      | [revision 5](RULESET_7_REVISION_5_ACHIEVEMENTS.md)            |
| 6        | `pulp-wars-poc-7r6`  | Map types, water, Fish, Pearls, Ports, Naval branch, transport, Patrol Boat, Battleship                                                                            | [revision 6](RULESET_7_REVISION_6_WATER_NAVAL.md)             |
| 7        | `pulp-wars-poc-7r7`  | Neutral Roads, automatic embark, Battleship splash, flat fortification levels, Field Defense; removed Saboteur                                                     | [revision 7](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md) |
| 8        | `pulp-wars-poc-7r8`  | Adjacent shared processor contributors                                                                                                                             | [revision 8](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md)      |
| 9        | `pulp-wars-poc-7r9`  | 23-node Human tree, Captain, Knight, Overrun, Land Grant, Shipyard, Market move, separate land/sea trade                                                           | [revision 9](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md)        |
| 10       | `pulp-wars-poc-7r10` | Road movement without capital connection; city-center spawning; full-turn Fortify                                                                                  | [revision 10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)  |
| 10 (fix) | `pulp-wars-poc-7r11` | An occupied center blocks land training; displacement applies only to reward units                                                                                 | [revision 10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)  |
| 11       | `pulp-wars-poc-7r11` | One city action per turn; Windmill healing; Road population; Commerce ×2 Market; Ore on Drill; Pillage on Raiding; tactical AI                                     | [revision 11](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md)     |
| 12       | `pulp-wars-poc-7r12` | No starting technology; free first tier-1 research; Fruit always visible, Fertile Ground on Gathering; resources kept under improvements; AI opener; Raider Escape | this document                                                 |

**Documentation parity (2026-09-28, no ruleset or identity change):** where
older documents disagreed with the code, the code's behavior was adopted as
the rule and is now stated in the ordinary sections: Field Defense
destruction by attack regardless of tile owner
([section 13.4](#134-after-combat)); sea trade for a captured foreign capital
([section 9.5](#95-sea-trade)); the capital +1 income following a captured
capital to its new owner ([section 4.3](#43-income)); settlement counts on
widths 11–16 following the AI count ([section 2.2](#22-settlements-and-treasures));
and Windmill healing without Milling ([section 10](#10-recovery-and-support)).

## 18. Known discrepancies

None: as of revision 12 (`pulp-wars-poc-7r12`) this document matches the code.
