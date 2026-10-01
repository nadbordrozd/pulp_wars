# Pulp Wars Ruleset 7: current rules

**Status:** authoritative description of the current Ruleset 7 runtime,
`pulp-wars-poc-7r17` (revision 17), for all three playable factions, Human
(`ORIGINAL`), Undead (`UNDEAD`), and Goblin (`GOBLIN`). It folds in revision
12 (free opening technology, Fruit visible from the start, Fertile Ground
revealed by Gathering, resources kept under improvements, Normal AI opening
research, and Raider Escape; no separate overlay document) and the overlays
of revisions [13](RULESET_7_REVISION_13_UNDEAD.md) (the Undead faction),
[14](RULESET_7_REVISION_14_BALANCE.md) (Plague, Bitten, the unanswered
Vampire, villages, and income caps),
[15](RULESET_7_REVISION_15_BALANCE.md) (three-turn Plague, 18-HP Zombie),
[16](RULESET_7_REVISION_16.md) (16a: orthogonal Shallow Water and the capital
growth guarantee; 16b: 2-tile boats and landing; 16c: economy deflation), and
[17](RULESET_7_REVISION_17_GOBLINS.md) (the Goblin faction, with the
`pulp_wars-0ao.7` tuned numbers). The Undead and the Goblins are part of the
ordinary game: faction choice is offered in every match setup, with no
development flag. Every number below was checked against the engine code at
the time of writing.

**Supersedes for current play:** [Ruleset 7 baseline](RULESET_7.md) and its
overlays, revisions [4](RULESET_7_REVISION_4_BIOME_ECONOMY.md),
[5](RULESET_7_REVISION_5_ACHIEVEMENTS.md),
[6](RULESET_7_REVISION_6_WATER_NAVAL.md),
[7](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md),
[8](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md),
[9](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md),
[10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md),
[11](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md),
[13](RULESET_7_REVISION_13_UNDEAD.md),
[14](RULESET_7_REVISION_14_BALANCE.md),
[15](RULESET_7_REVISION_15_BALANCE.md),
[16](RULESET_7_REVISION_16.md), and
[17](RULESET_7_REVISION_17_GOBLINS.md). Those documents remain as design
history, exact schema/ordering detail, measurements, and acceptance
provenance. When one of them disagrees with this document, this document
describes the current rules. In particular, the [baseline](RULESET_7.md)
still states revision-3 values and roles that later overlays replaced without
editing it (for example Walls, Mine, and Market numbers, Medic, Scout, Heavy,
Horse Archer, Breacher, Saboteur, and Grand Works), the revision 13–15
overlays state values that later revisions replaced (for example the Lich's
Attack 2.5, the 20-HP Zombie, unlimited Plague, the Move-3 embarked unit, the
level-5 income cap, and the 4-Coin Market), and the revision-17 overlay's
tuning bounds and decisions keep the pre-tuning contract values (two starting
Goblins, Goblin Attack 2 and Defense 1, Kaboom 4, death blasts 3/5/5); the
values here are current. Where a document and the code disagreed, the code's
behavior is the rule and is stated below;
[Known discrepancies](#20-known-discrepancies) lists no discrepancy as of
revision 17.

**Terms.** "On the board" means a unit that currently exists (HP above 0).
**Living** has the narrower revision-13 meaning used by Wail, Plague, and
Bitten: a unit whose owner's faction is not `UNDEAD`. Undead units are
therefore never living, whatever their HP; Human and Goblin units are living.
**Goblin-crewed** units are the Goblin seat's Goblin, Wolf Rider, Bomb
Chucker, Rocket Cart, and Scrap Buggy (they can Kaboom); **exploding units**
are its Bomb Chucker, Rocket Cart, and Scrap Buggy (they also explode when
killed) ([section 18](#18-goblin-faction-rules)).

**Source of truth in code:** `src/engine/rules/ruleset-v7.ts` (technology,
faction registrations, roles and role mechanics, faction rules, action
costs), `src/engine/v7/` (reducer, economy, spatial economy, combat, Graves,
Infect, Wail, Plague and Bitten afflictions, explosions, movement, map
generation, queries, views), and `src/ai/v7.ts` with its `src/ai/v7-*.ts`
helpers (Normal AI, including `src/ai/v7-goblin.ts`).

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

| Boundary                                   | Current value                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r17`                                                                                  |
| Game-state schema                          | `7`                                                                                                   |
| Command/event/save/replay numeric versions | `7`                                                                                                   |
| Browser autosave                           | `pulpWars.save.v7r17.current`                                                                         |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                                                            |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`                                                                        |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`, `GOBLIN_BASELINE_V1`                                    |
| Faction to tree binding                    | `ORIGINAL` → `ORIGINAL_BASELINE_V5`; `UNDEAD` → `UNDEAD_BASELINE_V1`; `GOBLIN` → `GOBLIN_BASELINE_V1` |
| Display names                              | `ORIGINAL` is "Human"; `UNDEAD` is "Undead"; `GOBLIN` is "Goblin"                                     |

- The exact ruleset ID dispatches every state, setup, save, and replay; earlier
  Ruleset 7 identities (`PRIOR_RULESET_7_IDS`, gap-free through
  `pulp-wars-poc-7r16`) are rejected, never migrated.
- The current browser route deletes only the known obsolete Ruleset 7 autosave
  keys (through `pulpWars.save.v7r16.current`) and preserves the Ruleset 6
  save, settings, the art-set preference, and unrelated storage.
- The normal browser entry and `?ruleset=7` launch Ruleset 7; exact
  `?ruleset=6` launches Ruleset 6; any other value is an unsupported-ruleset
  error. There is no other rules parameter: the former `?undead=1`
  development flag is gone, and a save or replay with Undead or Goblin seats
  loads like any other.
- All arithmetic is safe-integer and atomic: a rejected command changes no
  state and consumes no Coins, city action, or PRNG draw.
- **Factions.** Each seat has one faction, fixed for the match. A player
  stores `faction` and the bound `factionTreeId`; state parsing rejects a
  player whose faction differs from its setup entry or whose tree does not
  match its faction.
- **Faction model** (the Ruleset 6 Candy precedent). All three factions share
  the frozen mechanical role order `FIGHTER`, `RAIDER`, `MARKSMAN`, `GUARD`,
  `CAPTAIN`, `CATAPULT`, `KNIGHT`, `JUGGERNAUT`, `PATROL_BOAT`, `BATTLESHIP`.
  State, commands, events, reward IDs, and event literals serialize the
  mechanical role, never a faction label. Rules, public views, previews, UI,
  and the AI resolve every unit through its **owner's** faction registration
  (label, cost, stats, abilities, role mechanics, faction rules) with no
  cross-faction fallback. Units never change owner; Infect and Bitten remove
  the victim and create a new unit.
- The Undead and Goblin technology graphs, economy, and every non-unit rule
  are identical to the Human ones; the differences are the unit rosters
  ([section 11](#11-unit-roster)), the technology unlocks of
  [section 6.2](#62-technology-tree) (two for each faction, plus the Goblin
  name Plunder for Commerce), and the faction rules of
  [section 17](#17-undead-faction-rules) (Undead) and
  [section 18](#18-goblin-faction-rules) (Goblin).
- `GameStateV7` has no Goblin field: explosions resolve inside one command or
  Start Turn and leave no persistent state; Plunder changes Coins and Troll
  regeneration changes HP.

## 2. Setup and map generation

### 2.1 Match setup

A match is one human against 1–3 equal-rules Normal AI seats, in `RIVAL` or
`COOPERATIVE` mode, on a square board.

| Setup field | Legal values                                                                               |
| ----------- | ------------------------------------------------------------------------------------------ |
| Board width | 11, 14, 16, 20, or 25 (height equals width); minimum 11/14/16 for 1/2/3 AI                 |
| Auto size   | 11, 14, or 16 for 1, 2, or 3 AI                                                            |
| Map type    | `DRY_LAND`, `PANGEA`, `CONTINENTS` (default), `ARCHIPELAGO`, `LAKES`                       |
| AI          | `aiCount` 1–3, difficulty `NORMAL`, mode `RIVAL` or `COOPERATIVE`                          |
| Human color | `CORAL`, `TEAL`, `GOLD`, `VIOLET`                                                          |
| Factions    | one entry per seat (`aiCount + 1`, seat 0 is the human): `ORIGINAL`, `UNDEAD`, or `GOBLIN` |
| Seed        | uint32; equal setups and seeds generate byte-identical maps, turn order, and treasures     |

- **Faction choice.** `factions` is a dense array; index `i` is seat `i`'s
  faction, and every combination is legal (single-faction or any mix of the
  three). The browser setup always offers one Human/Undead/Goblin select per
  seat ("Your faction", "Player N faction"), all Human by default. The
  headless tools accept `original` (alias `human`), `undead`, and `goblin` in
  `--factions`. Faction choice never
  affects map generation, capital placement, turn order, treasure placement,
  or any PRNG draw: setups that differ only in `factions` generate
  byte-identical boards, turn orders, and treasures.

### 2.2 Settlements and treasures

| Board width | Legal AI counts | Neutral villages for 1/2/3 AI  | Total settlements for 1/2/3 AI | Treasure chests |
| ----------: | --------------- | ------------------------------ | ------------------------------ | --------------: |
|          11 | 1               | 4 (3 on `ARCHIPELAGO`) / — / — | 6 (5) / — / —                  |               2 |
|          14 | 1–2             | 4 / 5 / —                      | 6 / 8 / —                      |               2 |
|          16 | 1–3             | 4 / 5 / 7 (6 on `ARCHIPELAGO`) | 6 / 8 / 11 (10)                |               2 |
|          20 | 1–3             | 14 / 13 / 12                   | 16 / 16 / 16                   |               4 |
|          25 | 1–3             | 21 / 20 / 19                   | 23 / 23 / 23                   |               5 |

- Every seat has one capital; total settlements are capitals plus villages.
- On widths 11, 14, and 16 the village count follows the AI count, not the
  width: an explicit 16 x 16 board with one AI has 6 settlements, and an
  explicit 14 x 14 board with one AI also has 6. Auto size (11/14/16 for
  1/2/3 AI) therefore gives 6, 8, or 11 settlements (5 and 10 on the two
  Archipelago exceptions). On widths 20 and 25 the total is fixed at 16 and 23.
- The two Archipelago exceptions (11 x 11 with one AI, 16 x 16 with three AI)
  keep the revision-13 count because one more village fails map acceptance on
  some seeds ([revision 14 §8](RULESET_7_REVISION_14_BALANCE.md#8-villages)).
- The chest count is a maximum: if fewer candidate cells exist, fewer chests
  are placed.
- Settlements are Grass land cells at least two cells from an edge and at least
  Chebyshev distance 3 apart; capitals are at least `floor(width / 2)` apart.
- Every settlement's eight-cell ring has at least three economic opportunities
  from at least two families (Agriculture, Timber, Metal).
- **Capital growth guarantee.** Every capital's eight-cell ring (its starting
  territory) holds at least two **growth resources** of one kind: Fruit on
  Grass, Game on Forest, or (on non-Dry-Land maps) Fish on Shallow Water. So
  every capital can reach level 2 on its owner's first turn: free research, two
  harvests at 2 Coins each out of the first turn's 7 Coins. A deterministic,
  PRNG-free growth floor runs on each candidate after the settlement ring
  floors and water draws: for each capital in `(y, x)` order that lacks two of
  one kind, it adds the missing Fruit (on empty ring Grass) or Game (on empty
  ring Forest), choosing the feasible kind that needs fewer additions (ties:
  Game for a Woodland capital, otherwise Fruit), on eligible cells in the
  settlement floors' rank order. It never changes terrain, never removes or
  replaces a resource, and never places Fish, Pearls, Fertile Ground, or Ore.
  A candidate it cannot fix fails the `CAPITAL_GROWTH` map invariant.
  Villages get no guarantee. Details:
  [revision 16 §3](RULESET_7_REVISION_16.md#3-capital-growth-guarantee).
- Capital fairness: every capital's development score is 6–17 and scores on
  one map differ by at most 5. It is evaluated after the growth floor and
  never relaxed.
- Chests sit on empty Grass/Forest land reachable from a capital (no site,
  resource, or improvement). Moving onto a chest makes one PRNG draw: 5 Coins,
  or a full-HP exhausted unit of the mover's faction's `KNIGHT` role (Knight,
  Vampire, or Scrap Buggy) on the first legal adjacent land cell, homed to the
  mover's home city first and then by city ID among cities with free capacity;
  if no placement exists the chest gives 5 Coins.
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

- A water cell is `SHALLOW_WATER` if and only if at least one of its four
  orthogonal neighbours on the board is land; every other water cell,
  including water that touches land only diagonally, is `DEEP_WATER`.
  Classification happens once, at generation; no command turns land into
  water or water into land.
- On non-dry maps Shallow Water must be at least 25% of the map's water, and
  Deep Water at least `max(4, floor(water / 10))` cells.
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
  full-HP unit of its faction's `FIGHTER` role (Fighter for Human, Skeleton
  for Undead, Goblin for Goblin) on the capital and homed there, three locked
  achievement entitlements, and every cell within radius 2 of its capital
  explored. A Goblin seat, too, starts with a single Goblin: `pulp_wars-0ao.7`
  tuned the revision-17 contract's two starting Goblins to one
  (`STARTING_FIGHTERS_V7` is 1 for every faction). The engine keeps the
  contract's second-Goblin placement for a value of 2 (created after every
  seat's first unit, on the first land, non-Mountain, empty, chest-free cell
  of the capital ring in `(y, x)` order, or not at all), but it is unused.
- Turn order is a seeded shuffle; `round` starts at 1 and increments after the
  last seat in turn order.
- **Relationships:** in Rival mode every pair of players is hostile. In
  Cooperative mode all AI seats are formal allies of each other and hostile to
  the human. Allies cannot attack each other, capture each other's cities, or
  enter each other's territory; they share nothing else.
- **Start Turn** (in order): set the active seat and reset its units'
  activations and capture eligibility; set every owned city's city action
  available; resolve the seat's Plague ([section 17.8](#178-plague));
  explode the seat's exploding units that Plague killed, with any chain
  reaction and its Plunder
  ([section 18.7](#187-where-chains-run-and-event-order)); resolve Windmill
  healing; regenerate Trolls
  ([section 18.10](#1810-waaagh-ram-and-troll-regeneration)); award income;
  settle pending city rewards; evaluate achievements. Events:
  `TURN_STARTED`, then `PLAGUE_DAMAGED`, deaths and risings, `PLAGUE_SPREAD`,
  `PLAGUE_EXPIRED`, rising reveals and economy changes, then the chain
  events, `PLUNDER_AWARDED`, and the chain's rising reveals and economy
  changes, then `WINDMILL_HEALING_RESOLVED`, `UNITS_REGENERATED`,
  `INCOME_AWARDED`, and the reward and achievement events. Plague resolves
  before income, so a rising that besieges its victim's city center cuts
  that city's income this turn, and Plunder from a Start Turn chain is added
  before income.
- **End Turn** (in order): auto-recover idle damaged units; expire Inspired and
  Overrun; preview next income; advance to the next active seat and run its
  Start Turn. End Turn is unavailable while a city reward choice is pending.
  Since revision 17, `END_TURN` is one of the commands after which naval
  blockade and sea-network changes are reported
  ([section 14](#14-naval-rules)), so a blockader killed during the next
  seat's Start Turn (by Plague or a chain) emits `PORT_BLOCKADE_CHANGED` and
  `SEA_NETWORK_CHANGED` in that `END_TURN`.
- The first seat's first Start Turn runs when the match is created, so every
  seat's first turn includes ordinary income.
- **Elimination:** a player owning zero cities is eliminated immediately; its
  units are removed (leaving no Graves and setting off no death blasts) and
  its future turns skipped. Plague
  from its removed Liches and the bites it inflicted end
  ([section 17](#17-undead-faction-rules)).
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
else max(1, min(level, 4) + capital + seaTrade + landTrade + market + min(0, population))
```

- The **level term** is capped at 4 (`CITY_LEVEL_INCOME_CAP_V7`). Levels 5 and
  higher still grant rewards, capacity, and reward units; only their income
  stops growing. Every income surface (Start Turn income,
  `INCOME_PREVIEWED`, the city panel and HUD projection, public previews)
  uses the same capped term.
- `capital` is 1 for a city founded as a capital, under any owner. The bonus
  travels with the city: a captured capital pays its +1 to its new owner (and
  to every later owner), and the former owner loses it. This is separate from
  the _original capital_ that roots Road population and trade
  ([section 9](#9-roads-trade-and-market)).
- `seaTrade` and `landTrade` are each 0 or 1 ([section 9](#9-roads-trade-and-market)).
- `market` is the city's Market income ([section 9.4](#94-market)).

### 4.4 Unit capacity

- Capacity is `level + 1`, plus 1 if the owner has Planning, plus 1
  (**Warrens**) if the city's current owner is a Goblin seat
  (`cityUnitCapacityForV7`). Warrens follow the owner: a city a Goblin seat
  captures gains the slot and a Goblin city captured by another faction loses
  it. Training, treasure placement, `previewCityCapacityV7`, the city panel,
  and the Normal AI use the same formula.
- Every unit on the board counts against its home city; land and naval units
  share capacity.
- Training and treasure units need a free slot; reward units and Undead
  risings ([section 17.3](#173-risings)) may exceed capacity, and capacity
  loss never removes units.

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
  and an **empty city center**. Any unit on the center (own or allied)
  blocks land training with `CITY_SPAWN_OCCUPIED`; a hostile occupant besieges
  the city instead.
- **Arms Industry:** while a Forge in the training city has positive output,
  every land role trains for 1 Coin less (minimum 1, so the 1-Coin Goblin
  stays at 1).
- **Naval training** happens on a selected active, empty Port or Shipyard
  assigned to the city ([section 14](#14-naval-rules)).
- **Reward units** (the Militia `FIGHTER` and the level-5+ `JUGGERNAUT`, in
  the owner's faction: Fighter, Skeleton, or Goblin; Juggernaut, Abomination,
  or Troll) always appear on the city center. An existing occupant moves to
  the first free adjacent land cell in `(y, x)` order that it can legally
  enter (Engineering for Mountain, no unit, no treasure, not allied
  territory). If none exists, the occupant is removed with no refund or kill
  credit (and no Grave or death blast).
- **Goblin Militia** is two Goblins (`MILITIA_FIGHTERS_V7`): the first
  appears on the center as above; the second then appears on the first
  adjacent cell in `(y, x)` order that the same displacement rule allows, or
  is not created (no substitute). Each is full-HP, exhausted, homed to the
  city, may exceed capacity, and emits `UNIT_REWARD_GRANTED`; the reward ID
  stays `MILITIA`.
- New units are full-HP and exhausted until their owner's next Start Turn.

### 4.7 Siege and capture

- A city is **besieged** while a hostile unit stands on its center: zero income
  and no training, Land Grant, or tile economy for that city. Pending rewards
  can still be chosen.
- **Capture** requires a capture-capable land unit (Human Fighter, Raider,
  Marksman, Guard, or Juggernaut; Undead Skeleton, Ghoul, Banshee, Zombie, or
  Abomination; Goblin Goblin, Wolf Rider, Bomb Chucker, Orc Brute, or Troll)
  that began its owner's turn on a neutral
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

- Reward units come from the owner's registration: an Undead Militia is a
  Skeleton and an Undead Juggernaut reward is an Abomination; a Goblin Militia
  is two Goblins ([section 4.6](#46-training-and-city-center-spawning)) and a
  Goblin Juggernaut reward is a Troll. Reward IDs (`MILITIA`, `JUGGERNAUT`)
  are the same for every faction.
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
| Muster      | Drill       | at least four distinct trainable roles owned on the board at once (Juggernaut excluded)            |

- Progress made before the enabling research counts; unlocking is permanent
  and evaluated after every relevant accepted transition.
- Muster counts mechanical roles under the owner's registration (for Undead:
  Skeleton, Ghoul, Banshee, Zombie, Necromancer, Lich, Vampire, Patrol Boat,
  Battleship; the Abomination is excluded like the Juggernaut; for Goblins:
  Goblin, Wolf Rider, Bomb Chucker, Orc Brute, Orc Warboss, Rocket Cart,
  Scrap Buggy, Patrol Boat, Battleship, with the Troll excluded). Risings
  count. No achievement counts kills, so explosion kills affect achievements
  only by removing units.
- Each unlocked, unspent entitlement funds one `BUILD_MONUMENT`: 0 Coins, +3
  live population, on an explored owned land tile with no site, resource,
  improvement, or treasure (Mountain needs Engineering), at most one Monument
  per city, no siege or pending reward.
- Spent entitlements stay spent if the Monument is removed or captured;
  captured Monuments keep their +3 for the captor.

## 6. Technology

### 6.1 Research cost

```text
tier 1 = 5  + 1 * (C - 1)
tier 2 = 7  + 3 * (C - 1)
tier 3 = 12 + 5 * (C - 1)
```

| Cities `C` | Tier 1 | Tier 2 | Tier 3 |
| ---------: | -----: | -----: | -----: |
|          1 |      5 |      7 |     12 |
|          2 |      6 |     10 |     17 |
|          3 |      7 |     13 |     22 |
|          4 |      8 |     16 |     27 |
|          5 |      9 |     19 |     32 |
|          6 |     10 |     22 |     37 |

`C` is the researcher's currently owned city count
(`TECHNOLOGY_RESEARCH_COST_V7`). Research is permanent,
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
| Mobility   |    3 | `COMMERCE`          | Roads          | +1 Coin land trade per connected city                                              |
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

The table uses Human (`ORIGINAL_BASELINE_V5`) names. The Undead tree
(`UNDEAD_BASELINE_V1`) has the same graph, tiers, prerequisites, costs, free
opener, Dry Land Naval rule, and every economic and movement unlock, with two
unlock differences: Administration grants Necromancer support (Frenzy and
Raise Dead) instead of Captain support, and Chivalry grants no Overrun. Every
other unlock is the same mechanical value, so role unlocks, the Fieldcraft
Forest freedom, and the Sight entries apply to the Undead role of the same
mechanical role. The tree, research offers, and Help describe each unlock
with the **viewer's** faction labels, so the Undead unlocks that differ from
the table above are:

| Technology     | Undead unlocks                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| Administration | Necromancer (Frenzy, Raise Dead); Market; Disband                               |
| Sawmilling     | Sawmill; Lich                                                                   |
| Marksmanship   | Banshee                                                                         |
| Fieldcraft     | Replant Forest; Ghoul and Banshee ignore Forest movement stops; Banshee Sight 2 |
| Scouting       | Ghoul; Ghoul Sight 2                                                            |
| Raiding        | Pillage for all trainable land roles; Ghoul Charge                              |
| Chivalry       | Vampire; Cultivate Forest                                                       |
| Drill          | reveal Ore; Zombie; first-hostile-capture Spoils (2 Coins)                      |
| Fortification  | Skeleton/Zombie Build Field Defense                                             |

The Goblin tree (`GOBLIN_BASELINE_V1`) has the same graph, tiers,
prerequisites, costs, free opener, Dry Land Naval rule, and technology IDs as
the Human one, with two unlock differences: Administration grants WAAAGH!
support (`WAAAGH_SUPPORT`) instead of Captain support, and Commerce grants
**Plunder** (`PLUNDER { coins: 1 }`, [section 18.9](#189-kill-credit-plunder-and-friendly-fire))
instead of land trade, so Goblins never earn land trade (Roads movement and
Road population are unchanged). Chivalry keeps Overrun, labelled Ram.
Commerce keeps its ID `COMMERCE` in state, commands, and events and is
displayed as **Plunder** to a Goblin viewer
(`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`); the public technology tree query
returns IDs only, and the browser resolves names with the UI helper
`technologyNameV7` (`src/render/goblin-presentation-v7.ts`), which keeps the
sentence-case names of every other technology. The Goblin unlocks that read
differently from the Human table are:

| Technology     | Goblin name | Goblin unlocks                                                                                 |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| Administration | same        | Orc Warboss (WAAAGH!); Market; Disband                                                         |
| Sawmilling     | same        | Sawmill; Rocket Cart                                                                           |
| Marksmanship   | same        | Bomb Chucker                                                                                   |
| Fieldcraft     | same        | Replant Forest; Wolf Rider and Bomb Chucker ignore Forest movement stops; Bomb Chucker Sight 2 |
| Scouting       | same        | Wolf Rider; Wolf Rider Sight 2                                                                 |
| Commerce       | Plunder     | +1 Coin for each enemy unit your units or blasts kill                                          |
| Raiding        | same        | Pillage for all trainable land roles; Wolf Rider Charge                                        |
| Chivalry       | same        | Scrap Buggy; Ram; Cultivate Forest                                                             |
| Drill          | same        | reveal Ore; Orc Brute; first-hostile-capture Spoils (2 Coins)                                  |
| Fortification  | same        | Orc Brute Build Field Defense                                                                  |

The other technologies read the same for every faction. The engine, query,
and AI checks of land trade read the technology capability
`landTradeIncomeCoins` (never a raw `COMMERCE` test), and Plunder is the
capability `plunderCoins`.

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
  Coin land trade at Start Turn. Goblin Commerce is Plunder and grants no land
  trade ([section 6.2](#62-technology-tree)).
- A captured foreign capital counts as an ordinary city. Losing the original
  capital drops all Road population and land trade to zero until recaptured.
- Ports, sea routes, and allies never join this graph. Disconnection removes
  the population without lowering level or repeating rewards.

### 9.4 Market

```text
market income = min(3, 1 + distinct adjacent families)
```

- Families: Agriculture (Farm, Windmill), Timber (Lumber Camp, Sawmill), Metal
  (Mine, Forge). Workshops do not count.
- Contributors may belong to any city of the same owner; a Market with no
  remaining family still pays its 1 base Coin.
- A Market pays 1–3 Coins (`MARKET_INCOME_CAP_V7`): 2 with one family, 3 with
  two or more. Commerce does not change Market income.

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
| Recover or idle recovery, land  | 4 in own territory; 2 elsewhere (Undead: Restless, see below)          | explicit terminal `RECOVER`, or End Turn for a unit that did not move or act |
| Recover or idle recovery, naval | 4 on or adjacent to an own active Port/Shipyard; otherwise illegal / 0 | same                                                                         |
| Embarked unit                   | none                                                                   | —                                                                            |
| Windmill (Milling)              | up to 6                                                                | Start Turn, once per unit                                                    |
| Troll regeneration (Goblin)     | up to 4, any tile and form; cures nothing                              | Start Turn, after Windmill healing                                           |
| Captain Tend Wounded (Human)    | up to 2, and cures Plague and Bitten                                   | Captain action, once per unit per owner turn                                 |

- **Windmill healing:** at the owner's Start Turn, each Windmill in the
  owner's territory heals damaged own units (any form) on its eight
  neighbors. A unit next to several Windmills heals once, assigned to the first
  Windmill in `(y, x)` order. Output does not matter, and healing needs no
  technology, so a captured Windmill heals its new owner's units even without
  Milling.
- **Restless (Undead):** a land-form unit of an Undead seat recovers only in
  its owner's territory. An explicit `RECOVER` elsewhere is rejected
  atomically with `RECOVER_NOT_LEGAL { reason: "RESTLESS" }` and is never
  offered; End Turn idle recovery skips it (no HP change, no event). Undead
  naval units keep the naval rule; Windmill healing is unchanged.
- **Wait** does not prevent idle recovery; moving or any primary action does.
- **Goblin recovery** is the Human rule: Goblins are not Restless. A Goblin
  seat has no healer and no cure for Plague or Bitten
  ([section 18.3](#183-discipline-field-defense-and-no-healers)); beyond
  recovery and Windmills it heals only by Troll regeneration.
- **Captain** (Human `CAPTAIN`): may Move, then use one primary action:
  Attack, Rally, or Tend Wounded. The Undead Necromancer instead has Attack,
  Frenzy, and Raise Dead ([section 17](#17-undead-faction-rules)), and the
  Goblin Orc Warboss has Attack and WAAAGH!
  ([section 18.10](#1810-waaagh-ram-and-troll-regeneration)); neither has
  Tend Wounded (`TEND_WOUNDED` is never offered and is rejected with
  `UNIT_ROLE_INVALID`).
- **Rally** (Undead: **Frenzy**, labelled "Frenzied"; Goblin: **WAAAGH!**;
  all with the same command `RALLY`, flag `inspired`, and event
  `UNITS_RALLIED`): every adjacent own land-form unit that is not `SUPPORT`
  or `SIEGE` (not a Captain, Necromancer, Catapult, or Lich), has the
  `ATTACK` ability (so not a Banshee), and is not already Inspired becomes
  Inspired: +1 Attack on its next attack this turn. WAAAGH! reaches every
  other own land-form unit within Chebyshev distance 2 and includes `SUPPORT`
  and `SIEGE` roles (Rocket Carts, other Warbosses); it keeps the `ATTACK`
  and not-already-Inspired requirements. Inspired expires at End Turn, does
  not stack, and never affects Wail, Kaboom, or blasts. With no eligible
  target the command rejects with `HEAL_TARGET_NOT_FOUND`.
- **Tend Wounded** (Human Captain): targets every adjacent own land-form unit
  (other than the Captain, not yet tended this turn) that is damaged,
  plagued, or bitten; a plagued or bitten unit is a target even at full HP.
  Each target heals `min(2, maxHp - hp)` (possibly 0) and loses both Plague and
  Bitten (`WOUNDED_TENDED` results carry `curedPlague` and `curedBitten`). It
  does not use the target's action. The Captain cannot tend itself.
- **Disband** (Administration): an own land-form trainable unit that has not
  used a primary action (it may have moved) removes itself for
  `floor(printed cost / 2)` Coins (a Goblin refunds 0 and is still offered
  Disband). Juggernaut, Abomination, Troll, naval, and embarked units cannot
  Disband. Disband never explodes. A plagued or bitten unit cannot Disband: it
  is not offered and is rejected with `DISBAND_NOT_LEGAL` (reason `PLAGUED`,
  reported first, or `BITTEN`).
- **Promotion:** a unit with at least 3 kills may Promote once for free: +5
  maximum and current HP. Embarked units cannot Promote. Explosions credit no
  unit kill, and Bomb Chucker splash kills of own or allied units do not
  count ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)).

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
| Patrol Boat | Shorecraft        |    5 |  10 |      2 |       2 |    2 |     1 |     2 | yes               | no      | naval                    |
| Battleship  | Naval Engineering |   16 |  25 |      6 |       4 |    2 |   1–3 |     3 | no                | no      | naval; splash            |

¹ Marksman Sight becomes 2 with Fieldcraft.

The table above is the Human (`ORIGINAL`) roster. The Undead (`UNDEAD`)
roster, by mechanical role (half-unit values `attack2`/`defense2` in
parentheses):

| Unit        | Role          | Tech              | Cost |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                                   |
| ----------- | ------------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------------------------- |
| Skeleton    | `FIGHTER`     | start             |    2 |  10 |  2 (4) |   2 (4) |    1 |     1 |     1 | yes               | yes     | Field Defense                               |
| Ghoul       | `RAIDER`      | Scouting          |    3 |  10 |  2 (4) |   1 (2) |    2 |     1 |     2 | yes               | yes     | Charge (Raiding); Devour                    |
| Banshee     | `MARKSMAN`    | Marksmanship      |    3 |   8 |  1 (2) |   1 (2) |    1 |     — |    1² | Wail: yes         | yes     | Wail; no targeted Attack                    |
| Zombie      | `GUARD`       | Drill             |    3 |  18 |  2 (4) |   2 (4) |    1 |     1 |     1 | no                | yes     | Field Defense; Infect; Bite; never advances |
| Necromancer | `CAPTAIN`     | Administration    |    5 |  10 |  1 (2) |   1 (2) |    1 |     1 |     1 | yes               | no      | Frenzy; Raise Dead                          |
| Lich        | `CATAPULT`    | Sawmilling        |    8 |  10 |  3 (6) |   1 (2) |    1 |   2–3 |     1 | no                | no      | splash; Plague; never advances              |
| Vampire     | `KNIGHT`      | Chivalry          |    9 |  10 |  3 (6) |   1 (2) |    3 |     1 |     1 | yes               | no      | Lifesteal; Unanswered                       |
| Abomination | `JUGGERNAUT`  | reward only       |    — |  40 |  4 (8) |   4 (8) |    1 |     1 |     1 | yes               | yes     | Push                                        |
| Patrol Boat | `PATROL_BOAT` | Shorecraft        |    5 |  10 |  2 (4) |   2 (4) |    2 |     1 |     2 | yes               | no      | naval                                       |
| Battleship  | `BATTLESHIP`  | Naval Engineering |   16 |  25 | 6 (12) |   4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                               |

² Banshee Sight becomes 2 with Fieldcraft.

- **Skeleton** has exact Fighter parity (Field Defense with Fortification,
  capture, Pillage, Disband); Raise Dead also creates Skeletons.
- **Ghoul** keeps Raider Charge (Raiding), Pillage, and Fieldcraft Forest
  freedom; it has no Escape (Devour replaces it) and costs 3, not 4.
- **Banshee** has no `ATTACK` ability: it cannot issue `ATTACK`, never
  retaliates, and its role stores range 0 and minimum range 0. Its Attack
  exists only for Wail. It keeps capture, Pillage, Disband, Fieldcraft Forest
  freedom, and ordinary land ZOC (none onto water).
- **Zombie** has Guard parity for movement, capture, Field Defense, and "cannot
  attack after moving"; it never advances after a kill.
- **Necromancer** cannot capture; its primary actions are Attack, Frenzy, and
  Raise Dead.
- **Lich** has Catapult parity for range 2–3, minimum range, "cannot attack
  after moving", no capture, no advance, and Field Defense destruction on the
  primary target tile, and adds splash and Plague.
- **Vampire** cannot capture and has no Overrun; the defender of its attacks
  never retaliates (`UNANSWERED`).
- **Abomination** has exact Juggernaut parity (reward only, Push, capture, no
  Pillage or Disband). Patrol Boat and Battleship are the Human units.
- Undead Disband refunds: Skeleton, Ghoul, Banshee, and Zombie 1,
  Necromancer 2, Lich and Vampire 4. Arms Industry and the Shipyard discount
  apply to every faction.

The Goblin (`GOBLIN`) roster, by mechanical role, with the
`pulp_wars-0ao.7` tuned values (`GOBLIN_ROLE_RULES_V7` and
`GOBLIN_ROLE_MECHANICS_V7`). "Kaboom" and "Death blast" are the fixed blast
damages of [section 18.4](#184-kaboom) and [18.5](#185-death-blasts):

| Unit         | Role          | Tech              | Cost |  HP |  Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Kaboom | Death blast | Abilities                            |
| ------------ | ------------- | ----------------- | ---: | --: | ------: | ------: | ---: | ----: | ----: | ----------------- | ------- | -----: | ----------: | ------------------------------------ |
| Goblin       | `FIGHTER`     | start             |    1 |   6 | 1.5 (3) | 0.5 (1) |    1 |     1 |     1 | yes               | yes     |      5 |           — | Kaboom; no Field Defense             |
| Wolf Rider   | `RAIDER`      | Scouting          |    3 |  10 |   2 (4) |   1 (2) |    2 |     1 |     2 | yes               | yes     |      4 |           — | Charge (Raiding); Kaboom; no Escape  |
| Bomb Chucker | `MARKSMAN`    | Marksmanship      |    3 |   8 |   2 (4) |   1 (2) |    1 |     2 |    1³ | yes               | yes     |      4 |           2 | bombs (friendly-fire splash); Kaboom |
| Orc Brute    | `GUARD`       | Drill             |    3 |  15 |   2 (4) | 2.5 (5) |    1 |     1 |     1 | no                | yes     |      — |           — | Field Defense                        |
| Orc Warboss  | `CAPTAIN`     | Administration    |    5 |  12 |   2 (4) |   1 (2) |    1 |     1 |     1 | yes               | no      |      — |           — | WAAAGH!; no Tend Wounded             |
| Rocket Cart  | `CATAPULT`    | Sawmilling        |    7 |   8 | 3.5 (7) | 0.5 (1) |    1 |   2–3 |     1 | no                | no      |      5 |           4 | Kaboom; never advances               |
| Scrap Buggy  | `KNIGHT`      | Chivalry          |    8 |  10 |   3 (6) |   1 (2) |    3 |     1 |     1 | yes               | no      |      5 |           4 | Ram; Kaboom                          |
| Troll        | `JUGGERNAUT`  | reward only       |    — |  40 |   4 (8) |   3 (6) |    1 |     1 |     1 | yes               | yes     |      — |           — | Push; Regenerate 4                   |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 |  10 |   2 (4) |   2 (4) |    2 |     1 |     2 | yes               | no      |      — |           — | naval                                |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 |  25 |  6 (12) |   4 (8) |    2 |   1–3 |     3 | no                | no      |      — |           — | naval; splash                        |

³ Bomb Chucker Sight becomes 2 with Fieldcraft.

- **Goblin** has Fighter parity (capture, Pillage with Raiding, Disband)
  except that it cannot build Field Defense; it is the 1-Coin horde unit.
- **Wolf Rider** has Raider parity for Move 2, Sight 2 (Scouting), Charge
  (Raiding), Pillage, capture, and Fieldcraft Forest freedom; it has no
  Escape.
- **Bomb Chucker** has range 2 and minimum range 2: it cannot target an
  adjacent unit and retaliates only against an attacker exactly 2 cells away.
  Its attack is a bomb ([section 18.8](#188-bomb-chucker-bombs)). It keeps
  capture, Pillage, Disband, and Fieldcraft Forest freedom and Sight.
- **Orc Brute** has Guard parity (cannot attack after moving, capture, Field
  Defense with Fortification) and is the only Goblin unit that builds Field
  Defense.
- **Orc Warboss** cannot capture; its primary actions are Attack and WAAAGH!
  (no Tend Wounded).
- **Rocket Cart** has Catapult parity: range 2–3, minimum range 2, cannot
  attack after moving (Kaboom is still allowed after a Move), no capture,
  never advances, Field Defense destruction on the primary target tile
  (reason `CATAPULT`), and no splash.
- **Scrap Buggy** has Knight parity: Move 3, no capture, and Overrun,
  labelled **Ram** for Goblins (same rule and events).
- **Troll** has Juggernaut parity (reward only, Push, capture, no Pillage or
  Disband) with Defense 3 instead of 4, and regenerates 4 HP at its owner's
  Start Turn.
- **Patrol Boat and Battleship** are the Human units (names, stats,
  hostile-only Battleship splash, and art). Goblin faction rules do not apply
  to them: no Gang Up, no Kaboom, no death blast.
- Goblin Disband refunds: Goblin 0, Wolf Rider, Bomb Chucker, and Orc Brute
  1, Orc Warboss 2, Rocket Cart 3, Scrap Buggy 4.
- **Public abilities** (the role rule's `abilities`): Goblin `ATTACK`,
  `CAPTURE`, `KABOOM`; Wolf Rider `ATTACK`, `CAPTURE`, `CHARGE`, `KABOOM`;
  Bomb Chucker `ATTACK`, `CAPTURE`, `KABOOM`; Orc Brute `ATTACK`, `CAPTURE`;
  Orc Warboss `ATTACK`, `RALLY`; Rocket Cart `ATTACK`, `KABOOM`; Scrap Buggy
  `ATTACK`, `OVERRUN`, `KABOOM`; Troll `ATTACK`, `CAPTURE`, `PUSH`,
  `REGENERATE`. Blast damages, the bomb's splash target mode, the WAAAGH!
  radius, the Field Defense restriction, and the regeneration amount are role
  mechanics, exposed to every viewer of a Goblin unit through the `goblin`
  block of its public unit stats (`kaboomDamage`, `deathBlastDamage`,
  `rallyRadius`, `regeneration`, `buildsFieldDefense`).

General roster rules:

- An **embarked** land unit of any faction has Move 2 on water (landing
  uses one point, [section 14](#14-naval-rules)), Defense 1, Sight 1, no
  Attack, no retaliation, no ZOC, and no Kaboom.
- Base Sight gains +1 while standing on a Mountain with Engineering.
- Minimum range limits only the chosen target: a Catapult, Lich, Rocket Cart,
  or Bomb Chucker cannot target an adjacent unit but may still fire at
  another target in range.
- Tactical-role labels (`LINE`, `SKIRMISHER`, and so on) are display metadata
  with no combat effect.

## 12. Movement and unit actions

### 12.1 Movement

- Movement is eight-way; Chebyshev distance defines adjacency, range, sight,
  and ZOC. A Move has `2 * Move` half-points; an ordinary step costs 2 and a
  usable Road edge costs 1.
- A Move ends on entering an unexplored cell, a Forest (unless a Road edge or
  Fieldcraft freedom for the `RAIDER` and `MARKSMAN` roles: Raider and
  Marksman, Ghoul and Banshee, Wolf Rider and Bomb Chucker), a Mountain
  (unless a Road edge),
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
- Primary actions are Attack, Recover, Capture, and specials
  (Rally/Frenzy/WAAAGH!, Tend, Field Defense, Pillage, Raise Dead, Devour,
  Wail, Kaboom). Guard, Zombie, Orc Brute, Catapult, Lich, Rocket Cart, and
  Battleship cannot attack after moving.
- `WAIT` only marks the unit handled (it also declines an available Escape).
- **Escape** (Human Raider, innate; the Ghoul and Wolf Rider have none):
  after an accepted
  Attack that the Raider survives, including after a melee kill with its
  ordinary advance, the Raider may make exactly one more ordinary `MOVE` this
  turn with a fresh full Move 2 budget, whether or not it moved before
  attacking. Terrain, Forest/Mountain stops, Road half-steps, ZOC, occupancy,
  fog reveal, treasure, and automatic embarkation apply as for any Move. After
  the escape Move the Raider is handled: no further Attack, Capture, Pillage,
  Recover, Disband, Fortify, or other primary action. The player may decline
  (Wait, End Turn, or simply select another unit). Escape is never granted after
  a non-Attack action and never grants or refreshes Charge or Inspired. The
  canonical activation flag `escapeAvailable` is hashed, saved, and replayed;
  the combat preview and `COMBAT_RESOLVED` event carry `escapeAvailable`, every
  observer of the visible Raider sees the activation flag, the owner's unit
  status reads "Escape: may move again", and the public command query offers the
  escape Moves.
- **Pillage** (Raiding): an own land-form unit other than a Juggernaut,
  Abomination, or Troll standing on an improvement in hostile territory
  destroys it for +1
  Coin, re-exposing any resource it hid. It may follow a Move but no primary
  action and is terminal. Roads, Field Defense, terrain, resources, city
  centers, and Walls cannot be pillaged.

### 12.3 Field Defense

- `BUILD_FIELD_DEFENSE` (Fortification, 3 Coins) needs a unit whose role
  mechanics allow it (`buildsFieldDefense`: Fighter, Guard, Skeleton, Zombie,
  or Orc Brute; never the Goblin) in land form that has neither moved nor
  acted this turn, standing on an explored land tile of its owner's territory
  without Field Defense. It uses the unit's whole turn. A Goblin is never
  offered it and is rejected like any other role that cannot build it
  (`INVALID_TILE` with `action: "BUILD_FIELD_DEFENSE"`).
- Every explosion destroys Field Defense on every tile of its blast area,
  whoever owns the tile (reason `EXPLOSION`,
  [section 18.6](#186-blast-resolution)).
- Field Defense is a tile layer, not an improvement: it coexists with Roads,
  resources, improvements, and cities, transfers with the tile, and cannot be
  stacked, pillaged, redeveloped, or removed voluntarily.

## 13. Combat and fortification

### 13.1 Legality

- The attacker needs the `ATTACK` ability (the Banshee has none). The target
  must be a visible, non-allied unit on the board within the attacker's
  minimum–maximum range. Embarked units cannot attack.
- Land units may attack afloat units from shore and naval units may attack
  coastal land units.

### 13.2 Damage

```text
attack  = base Attack + 1 (Charge) + 1 (Inspired/Frenzied/WAAAGH!) + Gang Up (0–2)
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
- A surviving defender retaliates only if it has the `ATTACK` ability and an
  Attack above 0, is not embarked, the attacker is within its own range, and
  the attacker is not `UNANSWERED` (a Vampire). The preview then reports
  `noRetaliationReason` `DEFENDER_DIED`, `UNANSWERED`, or `OUT_OF_RANGE`.
- **Charge:** with Raiding, a Raider, Ghoul, or Wolf Rider that moved at
  least two cells this turn gets +1 Attack on its first attack, at range 1.
- **Inspired** (Frenzied for Undead, WAAAGH! for Goblins): +1 Attack on the
  unit's first accepted attack after Rally, Frenzy, or WAAAGH!.
- **Gang Up** (Goblin attackers in land form,
  [section 18.2](#182-gang-up)): +1 Attack for each other unit the attacker's
  owner has on the eight cells around the target, at most +2. It never
  applies to retaliation. The combat preview and `COMBAT_RESOLVED` carry
  `gangUp` (0 for every non-Goblin, naval, or embarked attacker), and
  `attack2` includes it.
- **Lifesteal** (Vampire): after the exchange, a surviving Vampire heals by
  the damage it dealt (as attacker or retaliating defender), capped at its
  maximum HP: `hpAfter = min(maxHp, hp - damageTaken + damageDealt)`. The
  preview and `COMBAT_RESOLVED` carry `attackerHeal` and `defenderHeal`.

### 13.3 Fortification

For a land-form defender standing in its owner's territory:

```text
fortification level = 2 (own city center with Walls) + 1 (tile has Field Defense)
```

Each level adds 1 flat Defense before cover. Naval, embarked, and foreign
units on the tile receive none. There is no other city-center defense bonus.

### 13.4 After combat

- **Advance:** a surviving adjacent land attacker (not a Catapult, Lich,
  Rocket Cart, or Zombie) that kills a land defender moves into its cell if
  explored and enterable (Mountain needs Engineering), then reveals sight. It
  does not advance when the defender rises in place (an Infect or Bitten
  rising), and it stands on any Grave the death left.
- **Push:** a Juggernaut, Abomination, or Troll pushes a surviving adjacent
  target one cell directly away if the cell is on the board, explored by the
  attacker, empty, not a settlement, the same land/water kind as the target,
  enterable by the target's owner, and not in territory allied to the target.
- **Escape:** a surviving Human Raider may make one more ordinary Move
  ([section 12.2](#122-activation)).
- **Overrun** (Human Knight; **Ram** for the Goblin Scrap Buggy, same rule
  and events): after the unit kills and advances, if a visible hostile unit
  is adjacent to its new cell it may Attack again, with no other action
  allowed. This repeats without a cap until a non-kill, death, or no target.
  The continuation is evaluated after any death-blast chain the attack set
  off ([section 18.7](#187-where-chains-run-and-event-order)).
- **Splash** (Battleship of any faction, the Undead Lich, and the Goblin Bomb
  Chucker): when the unit attacks (never when it retaliates), every other
  unit on the eight cells around the primary target, hidden or visible and of
  any faction or form, takes `max(1, ceil(primary damage / 2))` (capped at its
  HP), with no retaliation or modifiers. Battleship and Lich splash hits only
  units hostile to the attacker (splash target mode `HOSTILE`); the Bomb
  Chucker's bomb also hits own and allied units (mode `ALL`, friendly fire,
  [section 18.8](#188-bomb-chucker-bombs)). Splash kills of hostile units
  count for the attacker; splash kills of own or allied units do not.
- **Plague** (Lich): when a Lich attacks and survives the exchange, the
  primary target and every surviving living splash target become plagued
  ([section 17.8](#178-plague)).
- **Infect and Bite** (Zombie): a land-form unit a Zombie kills (by its attack
  or retaliation) rises as the Zombie's owner's Zombie; a living land-form
  unit it damages and does not kill becomes Bitten
  ([sections 17.6](#176-infect) and [17.7](#177-bitten)).
- **Field Defense destruction:** after an attack against a unit on a Field
  Defense tile, it is destroyed for the first applicable reason: a Catapult,
  Lich, or Rocket Cart attacked (reason `CATAPULT`); a surviving Inspired
  (Frenzied, WAAAGH!) unit
  attacked at range 1; a surviving land attacker whose owner has Explosives
  attacked at range 1; or the attacker advanced into the cell. These attack reasons apply whoever owns the tile:
  neutral, the defender's, a third player's, or the attacker's own territory
  (for example, killing an enemy that stands on your own Field Defense and
  advancing onto it destroys that Field Defense). Separately, a land unit
  entering the empty tile by Move or disembarkation destroys it only when the
  tile's territory belongs to a player hostile to the mover.
- Kills are counted for promotion, including retaliation and hostile splash
  kills and kills whose victim rises (not friendly bomb-splash kills or
  explosion kills).
- **Deaths.** A combat death leaves a Grave, an Infect rising, or a Bitten
  rising as [section 17](#17-undead-faction-rules) describes. An exploding
  Goblin unit (the defender, a splash victim, or the attacker) then explodes,
  after the attack's deaths, risings, advance, and Push
  ([section 18.7](#187-where-chains-run-and-event-order)). The exact
  resolution and event order of an attack are in
  [revision 13 §6.8](RULESET_7_REVISION_13_UNDEAD.md#68-combat-resolution-order)
  as extended by
  [revision 14 §10](RULESET_7_REVISION_14_BALANCE.md#10-combat-resolution-order)
  and [revision 17 §6.7](RULESET_7_REVISION_17_GOBLINS.md#67-where-chains-run-and-event-order).

## 14. Naval rules

- **Water movement:** only naval and embarked units enter water. Shallow Water
  needs Shorecraft (via embarking or training), Deep Water needs Navigation.
  Every water step costs a full movement point. Patrol Boats, Battleships, and
  embarked units all have Move 2.
- **Embarking:** a land unit embarks by ending a Move on an own active, empty
  Port or Shipyard (Shorecraft). It keeps its identity, HP, kills, and home
  city and is exhausted for the turn.
- **Disembarking:** on a later turn an embarked unit may move through water,
  then `DISEMBARK` onto an adjacent (Chebyshev 1) empty land cell it can enter
  (Mountain needs Engineering; no allied territory). Landing costs one of the
  unit's two movement points: `DISEMBARK` is legal only while
  `spent = moved ? movedPathLength : 0` is at most 1, and is otherwise rejected
  atomically with `MOVEMENT_ILLEGAL` and not offered. So from its start-of-turn
  cell an embarked unit lands either directly on an adjacent cell, or after a
  one-cell Move on a cell adjacent to that water cell; after a two-cell Move it
  cannot land that turn. ZOC does not block landing, and a Move interrupted
  after one cell may still land. Landing ends the unit's activation for every
  faction: for the rest of that turn the landed unit cannot Move, Attack,
  Kaboom, Recover, Capture, Pillage, Fortify, use any special action, Wait, or
  Disband (Promote, which never depends on the activation, stays available).
  The public command query offers none of these, and the engine rejects them
  atomically with the existing codes for a unit that already acted (Attack,
  Kaboom, Move, Recover, Disband: `UNIT_ALREADY_ACTED`; Wait:
  `UNIT_ALREADY_HANDLED`; Capture: `CAPTURE_NOT_ELIGIBLE`). It may capture
  from a later turn. The browser marks direct landing cells ("Land
  now") and cells reachable by one water step then landing ("Move 1, then
  land"), sending the Move and then `DISEMBARK` for the latter.
- **Port** (Shorecraft, 4 Coins): on owned Shallow Water with a land cell of
  the same city among its eight neighbours, and with no improvement, site, or
  Road. It may share its tile with Fish or Pearls, has no per-city limit, and
  gives +1 live population while active.
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
- Reward units and treasure units are always land units.
- **Goblin boats** are the Human Patrol Boat and Battleship: no Gang Up, no
  Kaboom, and no death blast. Blasts hit naval and embarked units in the
  blast area like any unit (the embarked Defense 1 is irrelevant to fixed
  damage), and an exploding unit killed while embarked explodes on its water
  tile. A blast that kills a blockader lifts the blockade.
- **Blockade events.** `PORT_BLOCKADE_CHANGED` and `SEA_NETWORK_CHANGED` are
  recomputed after `ATTACK`, `BUILD_PORT`, `BUILD_ROAD`, `CAPTURE`,
  `DISEMBARK`, `MOVE`, `REDEVELOP`, `WAIL`, `KABOOM`, `END_TURN`, `LAND_GRANT`,
  and research of Roads, Shorecraft, or Navigation. `KABOOM` and `END_TURN`
  joined the list in revision 17; with `END_TURN`, a blockade lifted by a
  death at the next seat's Start Turn (Plague or a Plague-started chain) is
  reported in that command instead of silently.

## 15. Fog and observation

- Each player's explored set only grows: from unit and city sight, Survey,
  Land Grant, and capture. There is no live re-fog.
- A unit is visible to another player exactly when it stands on a cell that
  player has explored. Allies do not share exploration.
- Unexplored cells expose only their coordinates. Ore stays hidden without
  Drill and Fertile Ground stays hidden without Gathering; Fruit, Game, Fish,
  and Pearls are visible on every explored tile.
- Graves are shown on every explored tile (the treasure-chest rule); Plague
  (with remaining turns) and Bitten (with the biter player) are public on
  every visible unit, but a Plague's source Lich is named only when the viewer
  can see it. Faction and tree of every player are public.
- Owner-private facts (city action flags, trade graphs, research, Coins, and
  achievement progress) are never shown to opponents.
- The browser UI and Normal AI read only the player's public view, public
  command queries, and public previews. Viewer-projected events never reveal
  hidden units, sources, or HP.
- **Explosions** reveal no tiles (risings reveal their sight as usual).
  `EXPLOSION_RESOLVED` follows the Wail rule: it is projected to a viewer
  that can see the exploding unit before or after the command, with
  `results` filtered to units the viewer owns or could see before the
  command; a viewer that cannot see the exploder but owns a victim receives
  `COMBAT_SPLASH_DAMAGE` with its own entries. `PLUNDER_AWARDED` is
  owner-only and names no victims; `UNITS_REGENERATED` is projected like
  `WINDMILL_HEALING_RESOLVED`. Explosion previews are computed from the
  viewer's visible units and flag `touchesUnexplored`
  ([section 18.12](#1812-commands-events-errors-and-queries)).
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
  (`src/ai/v7-opening.ts`). Every faction uses the same opener.
- **Growth first** (revision 16): before those scores, if offered tier-1
  technologies among Gathering, Hunting, and Shorecraft unlock at least two
  visible growth resources of their kind on explored tiles of the original
  capital's own territory, the free opener is the one with the most such
  resources (ties by technology order). While the original capital is level 1
  and a harvest of a growth resource in its territory is legal and affordable,
  that harvest outranks research, training, and construction. In the
  revision-16 test matrix every Normal capital reaches level 2 on its owner's
  first turn; the test pins the second-turn requirement.
- **Transports** plan with Move 2 and land only through offered `DISEMBARK`
  commands; an embarked Move of one cell that ends next to a planned landing
  cell is preferred, so a transport one cell from the coast moves and lands
  the same turn.
- **Undead play.** In a match with an Undead seat (and only there, so
  decisions elsewhere are unchanged), Normal plays as and against the Undead
  from public information: Raise Dead on Graves whose Skeletons would survive,
  Necromancers approaching Graves, Frenzy, Devour to heal or deny a Grave,
  Wail and Lich targets by exact previewed damage, kills, Graves, and Plague,
  Lifesteal and Infect/Bitten valuation, Restless units returning home to
  recover, Liches and Vampires kept out of visible lethal reach and off
  transports, Vampires attacking only when they survive, and against the
  Undead: avoiding infecting retaliation and costly bites, prioritizing
  Necromancers and plaguing Liches, Tend Wounded cures, spread discipline
  around spreading Plague, and Wail and splash in threat evaluation. Details
  and priorities:
  [Normal AI revision 13](../architecture/NORMAL_AI.md#revision-13-undead-play-pulp_wars-vkq9),
  [14](../architecture/NORMAL_AI.md#revision-14-plague-bitten-and-vampire-play-pulp_wars-vkq18),
  [15](../architecture/NORMAL_AI.md#revision-15-plague-duration-pulp_wars-vkq20),
  and
  [Lich safety](../architecture/NORMAL_AI.md#lich-safety-vampire-survival-and-lich-hunts-pulp_wars-vkq21).
- **Goblin play** (revision 17, `pulp_wars-0ao.6`, `0ao.7`, `0ao.13`). Every
  Goblin heuristic is gated on a match with a Goblin seat
  (`src/ai/v7-goblin.ts`), so Human and Undead decisions and pinned hashes in
  matches without one are unchanged. As Goblins, Normal scores Kaboom from
  the exact `previewKaboomV7` chain (hostile damage and kills plus Plunder,
  minus own and allied losses at a friendly-fire factor of 2 and the
  exploder's own value) and takes only net-positive Kabooms; moves helpers
  next to targets for Gang Up and ranks targets by Gang Up; values bomb and
  death-blast friendly fire as a cost and throws a bomb that would kill an
  own or allied unit only when it kills the target and kills more hostile
  than own and allied units (unless it saves a city or is the endgame
  combined kill), ranks a friend-splashing bomb below a clean one, moves a
  Bomb Chucker to a clean throw, and keeps other own units from ending a
  routine Move where an own bomb thrown now would kill them; keeps its exploding units away from own units
  while any visible enemy can damage them; trains a cheap Goblin horde into
  Warrens capacity plus Bomb Chuckers; researches Plunder when hostile units
  are near; uses WAAAGH! like Rally; and lets Trolls keep fighting. Against
  Goblins, threat evaluation includes Gang Up, Bomb Chucker splash, and the
  Kaboom reach of visible goblin-crewed land units (an embarked one cannot
  land and Kaboom in the same turn), units avoid ending in a clump a visible
  goblin-crewed land unit could Kaboom at a profit, and a kill of an
  exploding unit is valued with `previewAttackExplosionsV7`. Details:
  [Normal AI revision 17](../architecture/NORMAL_AI.md#revision-17-goblin-play-pulp_wars-0ao6)
  and the [Goblin balance report](../validation/RULESET_7_GOBLIN_BALANCE.md).
- **Raider Escape:** a Raider attack earns a small bonus for its retreat
  option. After the attack, if visible enemies can reach the Raider, Normal
  only uses an escape Move to a strictly safer visible tile (less projected
  visible damage), preferring own territory and Forest/Mountain cover;
  otherwise ordinary Move scoring applies.
- **Endgame siege:** once expansion is over (no reachable empty neutral
  village), a seat with at least three cities that faces a hostile seat on one
  or two cities (half or fewer of its own, with no more units on the board)
  closes
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

## 17. Undead faction rules

Humans are sustain; Undead are attrition: death feeds the Undead through
Graves, raising, infection, and lifesteal, and Liches and Zombies afflict
living units with Plague and bites. Every rule in this section needs an
`UNDEAD` seat in the setup; in a match without one no Grave, Plague, or bite
ever exists, no Undead command is offered, and the Undead schema fields hold
their neutral values (`graves: []`, `plagued: []`, `bitten: []`, heals 0,
infected and bitten flags false). Human units keep every Human ability
(Rally, Tend Wounded, Escape, Overrun) and Goblin units every Goblin rule
against Undead opponents; Goblin units are living. Goblin explosions
interact with these rules as listed in
[section 18.11](#1811-interactions-with-other-rules).
Specifications and exact event shapes:
[revision 13](RULESET_7_REVISION_13_UNDEAD.md),
[revision 14](RULESET_7_REVISION_14_BALANCE.md), and
[revision 15](RULESET_7_REVISION_15_BALANCE.md).

### 17.1 Graves

A Grave is a tile marker. Grave creation is enabled by the setup (at least
one `UNDEAD` seat) and stays enabled after the Undead seats are eliminated.

- **Creation.** When a unit dies, one Grave is created on its death tile when
  all of these hold: the unit was in land form (not embarked or naval), of
  any owner and faction; it died with cause `ATTACK`, `RETALIATION`,
  `SPLASH` (Battleship, Lich, or Bomb Chucker), `WAIL`, `PLAGUE`, `KABOOM`
  (its own Kaboom), or `EXPLOSION` (hit by a blast); the tile is land and is
  not a settlement site (capital, city, or village center); the death did not
  rise (Infect or Bitten); and the tile has no Grave yet.
- **No Grave** comes from a water, embarked, or naval death, Disband, reward
  displacement removal, elimination removal, or a death that rises. A chest
  is consumed by the unit that enters its tile, so no Grave shares a tile
  with a chest.
- **Properties.** A Grave blocks and costs nothing: movement, occupancy, ZOC,
  training, reward and treasure placement, buildings, Monuments, Roads, Field
  Defense, and every economic action ignore it, and it survives terrain
  transforms, Redevelop, Pillage, capture, and territory changes. A unit may
  stand on a Grave (a melee attacker advances onto the Grave its kill left).
  Only Raise Dead and Devour remove Graves; they never expire.
- **State and view.** `GameStateV7.graves` is a `(y, x)`-sorted,
  duplicate-free coordinate list covered by saves, replays, and hashes; state
  parsing rejects a Grave off the board, on water, on a settlement site, or on
  a chest, and any Grave in a match without an Undead seat.
  `PlayerViewV7.graves` is its explored subset, and `GRAVE_CREATED { at }`
  follows the `UNIT_DIED` of the unit that left it.

### 17.2 Raise Dead and Devour

- **Raise Dead** (`RAISE_DEAD { unitId }`, Necromancer primary action, 0
  Coins). Legal for an own land-form Necromancer that has not used its
  primary action (it may have moved) when at least one **eligible Grave**
  exists: a Grave on one of its eight neighbours with no unit of any owner on
  it (no cap, no terrain or territory filter). In `(y, x)` order each
  eligible Grave is removed and replaced by a Skeleton rising at 5 of 10 HP,
  taking consecutive new unit IDs. The Necromancer is then handled. With no
  eligible Grave the command is rejected with `RAISE_DEAD_NOT_LEGAL`
  (`NO_GRAVE`). Event `DEAD_RAISED`; the public preview `previewRaiseDeadV7`
  equals the result.
- **Devour** (`DEVOUR { unitId }`, Ghoul terminal action). Legal for an own
  land-form Ghoul that has not used its primary action (it may have moved)
  and stands on a Grave, also at full HP (to deny the Grave). The Grave is
  removed, the Ghoul's HP becomes its maximum, and the Ghoul is handled.
  Otherwise `DEVOUR_NOT_LEGAL` (`NO_GRAVE`). Event `GRAVE_DEVOURED` (its
  `amount` may be 0); preview `previewDevourV7`.

### 17.3 Risings

Raise Dead Skeletons, Infect Zombies, and Bitten Zombies are **risings**. A
rising:

- is homed to the creating unit's home city (for a Bitten rising, the biting
  Zombie's home city while that Zombie is on the board), or orphaned when
  that unit is orphaned or gone;
- may exceed its home city's capacity, like a reward unit; an over-capacity
  city cannot train until a slot frees;
- appears in place regardless of movement-entry rules (Mountain without
  Engineering, allied territory) and never destroys Field Defense;
- has 0 kills, is not veteran, is not capture-eligible, and is exhausted
  until its owner's next Start Turn; and
- reveals its sight for its owner when it appears.

On a city or village center a rising besieges that city at once and may
capture it from its owner's next turn. An existing Grave stays under a
rising.

### 17.4 Frenzy

Frenzy is the Undead name of Rally ([section 10](#10-recovery-and-support)):
same command, flag, event, and +1 Attack; its targets exclude Necromancers,
Liches, and Banshees.

### 17.5 Restless

Undead land-form units recover only in their owner's territory
([section 10](#10-recovery-and-support)).

### 17.6 Infect

A land-form unit killed by a Zombie, by the Zombie's attack or by its
retaliation, dies normally (the Zombie keeps the kill) and then rises as a
Zombie of the Zombie's owner at 10 of 18 HP on its tile, with no Grave. The
victim may be of any faction and any land role, on any land tile,
including a city or village center. The killing Zombie never advances.
Naval and embarked victims, splash, Wail, Kaboom, and explosions never
infect. Event
`UNIT_INFECTED`; the combat preview carries `attackerInfected` and
`defenderInfected`.

### 17.7 Bitten

- **Bite.** When a Zombie deals more than 0 damage, by attack or
  retaliation, to a **living land-form** unit that survives, that unit
  becomes Bitten, recording the biter player and Zombie; the last biter wins.
  Embarked and naval units are never bitten; splash, Wail, and explosions are
  not Zombie damage.
- **Rising.** When a Bitten unit dies in land form from `ATTACK`,
  `RETALIATION`, `SPLASH`, `WAIL`, `PLAGUE`, `KABOOM`, or `EXPLOSION`,
  whoever killed it, it rises
  on its tile as a Zombie owned by the biter player at 10 of 18 HP
  ([section 17.3](#173-risings)), with no Grave; the killer keeps the kill.
  Infect takes precedence when a Zombie is the killer. A melee attacker whose
  defender rises does not advance (so an Overrun ends there). A Bitten unit
  that dies afloat or embarked, or is removed by displacement or elimination,
  does not rise. Event `BITTEN_UNIT_RISEN`.
- **End.** Bitten persists through embarking and disembarking and ends when
  the unit leaves the board, its biter player is eliminated, or a Human
  Captain's Tend Wounded cures it. A Bitten unit cannot Disband (it may
  Kaboom, and then rises as its biter's Zombie).
- **Previews and state.** The combat preview carries `attackerBitten`,
  `defenderBitten`, `attackerBittenRises`, and `defenderBittenRises`; the
  Wail preview carries `bittenRises`. `GameStateV7.bitten` lists
  `{ unitId, biterPlayerId, biterUnitId }`; the view lists
  `{ unitId, biterPlayerId }`.

### 17.8 Plague

- **Application.** When a Lich attacks and survives the exchange, the
  primary target and every surviving splash target that is living become
  plagued unless already plagued; units of any form qualify. A plagued unit
  records its source Lich and `turnsRemaining` 3. Plague never stacks and a
  second hit resets nothing; a dying Lich applies none. The combat preview's
  `plagued` lists the units an attack newly plagues.
- **Start Turn** (the plagued unit's owner's turn, after the reset and
  before Windmill healing, [section 3](#3-players-turns-and-victory)):
  1. every plagued unit of that player takes `min(2, hp)` damage, all at once
     (`PLAGUE_DAMAGED`);
  2. deaths (cause `PLAGUE`, no kill credit) leave a Bitten rising or a
     Grave;
  3. surviving units on their **first** plagued Start Turn (3 turns left)
     spread their source, in unit-ID order, to every adjacent unit of any
     owner that is on the board, living, and not plagued (the lowest-ID
     spreader wins; new victims start at 3 and do not spread this step;
     `PLAGUE_SPREAD`);
  4. every surviving damaged entry loses one turn, and an entry that had 1
     turn left expires instead (`PLAGUE_EXPIRED`);
  5. risings reveal their sight and the live economy is recomputed.

  So a Plague deals at most 6 damage over its victim's owner's next three
  Start Turns and spreads once. Plague damage is not an attack: no
  retaliation, Lifesteal, Infect, Field Defense destruction, advance, or
  Push. A Goblin exploding unit that Plague kills explodes after step 5,
  before Windmill healing, and its chain may damage and kill other players'
  units during this Start Turn
  ([section 18.7](#187-where-chains-run-and-event-order)).

- **End.** Plague ends when the unit leaves the board, when it expires, when
  its source Lich leaves the board for any reason (every unit it plagued is
  cured, `PLAGUE_CLEARED` at the end of the command's events), or when a
  Human Captain's Tend Wounded cures it. A unit whose Plague ended can be
  plagued again with a fresh 3 turns. A plagued unit cannot Disband.
- **State and view.** `GameStateV7.plagued` lists
  `{ unitId, sourceUnitId, turnsRemaining }` (1–3); the view lists every
  visible plagued unit with its `turnsRemaining` and names the source only
  when the viewer sees it.

### 17.9 Wail

`WAIL { unitId }`, a Banshee primary action and not an Attack.

- **Legality.** An own land-form Banshee that has not used its primary
  action (it may have moved), with at least one target; otherwise
  `WAIL_NOT_LEGAL` (`NO_TARGET`).
- **Targets.** Every unit that is on the board, hostile, living, visible to
  the Banshee's owner, and within Chebyshev 2 of the Banshee, in any form;
  allies never.
- **Damage.** Per target, the ordinary damage formula
  ([section 13.2](#132-damage)) with the Banshee attacking at Attack 1 at its
  current HP (no Charge or Inspired/Frenzied bonus) against the target's own
  Defense, fortification, embarked Defense 1, and cover. Damage may be 0; such
  a target still counts. All targets resolve together from the pre-Wail
  state.
- **Result.** No retaliation, advance, Push, Infect, or Field Defense
  destruction. Kills count for the Banshee's promotion and leave Graves or
  Bitten risings, and Goblin exploding units it kills explode; the Banshee
  is handled. Event `WAIL_RESOLVED` (then
  `UNIT_DIED` with cause `WAIL` per death); the preview `previewWailV7`
  equals the result because only visible units are targets.

### 17.10 Commands, events, and queries

- Commands `RAISE_DEAD`, `DEVOUR`, and `WAIL` (each `{ kind, unitId }`).
- Events `DEAD_RAISED`, `GRAVE_DEVOURED`, `WAIL_RESOLVED`, `UNIT_INFECTED`,
  `GRAVE_CREATED`, `BITTEN_UNIT_RISEN`, `PLAGUE_DAMAGED`, `PLAGUE_SPREAD`,
  `PLAGUE_EXPIRED`, and `PLAGUE_CLEARED`; `UNIT_DIED.cause` includes `WAIL`
  and `PLAGUE`; `WOUNDED_TENDED` results carry `curedPlague` and
  `curedBitten`.
- Errors `RAISE_DEAD_NOT_LEGAL`, `DEVOUR_NOT_LEGAL`, `WAIL_NOT_LEGAL`, and
  `DISBAND_NOT_LEGAL`; `RECOVER_NOT_LEGAL` has the reason `RESTLESS`.
- The public command query offers each Undead command, Tend Wounded, and
  Disband exactly when legal. Public previews (`previewRaiseDeadV7`,
  `previewDevourV7`, `previewWailV7`, `previewTendWoundedV7`,
  `queryCombatPreviewV7`) include every Undead effect computed from visible
  units and public statuses only, and projected events filter entries per
  viewer (a viewer who cannot see a splash or Wail source but owns a victim
  receives `COMBAT_SPLASH_DAMAGE`).

## 18. Goblin faction rules

Humans are sustain, Undead are attrition, and Goblins are a reckless horde:
cheap weak units, a bonus for ganging up on one target, units that blow
themselves up (and their friends), and Coins for every kill. Every rule in
this section applies only to units and cities of a `GOBLIN` seat; in a match
without one no Kaboom is offered, no explosion occurs, no Plunder is
awarded, no Troll exists, Warrens never apply, and every combat preview's
`gangUp` is 0. Each rule resolves through the owner's registration
(`FACTION_RULES_V7`, `GOBLIN_ROLE_RULES_V7`, `GOBLIN_ROLE_MECHANICS_V7`).
Human and Undead units keep every ability against Goblins, and blasts hit
them like any unit. Specification, decisions, and the tuning record:
[revision 17](RULESET_7_REVISION_17_GOBLINS.md) and the
[Goblin balance report](../validation/RULESET_7_GOBLIN_BALANCE.md).

### 18.1 Horde and Warrens

- The Goblin costs 1 Coin, has 6 HP, Attack 1.5, and Defense 0.5
  ([section 11](#11-unit-roster)).
- **Warrens:** every city owned by a Goblin seat has +1 unit capacity
  (`cityCapacityBonus` 1, [section 4.4](#44-unit-capacity)).

### 18.2 Gang Up

- When a Goblin unit in land form makes an `ATTACK` (any accepted attack,
  melee or ranged, including Ram continuations), it gets **+1 Attack for each
  other unit its owner has on the eight cells around the target, up to +2**
  (`gangUpMaximum` 2).
- Helpers are units on the board owned by the attacker's owner, of any role
  and form (land, embarked, naval), other than the attacker. Allied units
  never count. Own units are always visible to their owner, so the public
  preview is exact.
- Gang Up never applies to retaliation, Kaboom, blasts, Wail, or Goblin
  boats, and adds to Charge and Inspired/WAAAGH!. Bomb splash derives from
  the boosted primary damage.

### 18.3 Discipline: Field Defense and no healers

- Only the Orc Brute builds Field Defense; the Goblin never does
  ([section 12.3](#123-field-defense)).
- Goblin recovery is the Human rule (Goblins are not Restless). The Orc
  Warboss has no Tend Wounded, so a Goblin seat cannot cure Plague or Bitten;
  its only healing beyond recovery and Windmills is Troll regeneration.

### 18.4 Kaboom

`KABOOM { kind, unitId }` is a primary action of every goblin-crewed unit. It
is not an Attack and needs no technology.

- **Blast area and damage.** An explosion's blast area is the 3 × 3 square
  centred on the exploding unit's tile (where it died), clipped to the
  board. It hits **every other unit on the board in that area**: any owner
  (own, allied, hostile), any faction, any form (land, embarked, naval),
  visible or hidden. Each hit deals `min(blast damage, current HP)`; blast
  damage is fixed per role (Kaboom: Goblin 5, Wolf Rider 4, Bomb Chucker 4,
  Rocket Cart 5, Scrap Buggy 5) and ignores Attack, Defense, HP ratio, cover,
  fortification, Walls, Field Defense, the embarked Defense, Charge, Gang Up,
  and Inspired.
- **Legality.** The unit is the actor's own, on the board, in land form, has
  the `KABOOM` ability under its owner's registration, and has not used a
  primary action this turn. It may have moved (a Rocket Cart too, whose
  "cannot attack after moving" limits only Attack) or been marked handled by
  Wait. It may not Kaboom in the turn it landed: landing ends the activation
  for every faction ([section 14](#14-naval-rules)), so a landed unit can
  Kaboom from its owner's next turn. No target is needed: a Kaboom that hits
  nobody is legal. A Plagued or Bitten unit may Kaboom.
- **Result.** The unit dies (`UNIT_DIED` cause `KABOOM`, then its Grave or
  Bitten rising), then its explosion resolves as wave 1 of a chain. Kaboom
  never moves, captures, or advances a unit and never damages cities,
  buildings, improvements, Roads, resources, Ports, Walls, Monuments, or
  terrain; it destroys only Field Defense.
- **Rejections (atomic).** Unknown, dead, or foreign unit → the ordinary
  unit errors; a role without `KABOOM` (Orc Brute, Orc Warboss, Troll, boats,
  every Human and Undead role) → `UNIT_ROLE_INVALID { role }`; primary action
  already used, the unit landed this turn, or a Ram continuation pending →
  `UNIT_ALREADY_ACTED`;
  embarked → `KABOOM_NOT_LEGAL { reason: "EMBARKED" }`. A pending city
  reward blocks it like every command.

### 18.5 Death blasts

A Bomb Chucker, Rocket Cart, or Scrap Buggy **explodes when it is killed**,
whatever killed it and wherever it stands (land, a city or village center,
embarked on water), with its death-blast damage (Bomb Chucker 2, Rocket Cart
4, Scrap Buggy 4): killed as a defender (`ATTACK`), while attacking
(`RETALIATION`), by splash (`SPLASH`), by Wail (`WAIL`), by Plague (`PLAGUE`,
at its owner's Start Turn), or by another blast (`EXPLOSION`). A unit
explodes at most once: a Kaboom is that unit's explosion. Disband, reward
displacement removal, and elimination removal are removals, not deaths, and
never explode. Goblins and Wolf Riders never explode on death.

### 18.6 Blast resolution

One explosion resolves in this order:

1. collect every unit still on the board in the blast area other than the
   exploder (a unit killed earlier in the same command is gone);
2. each takes `min(blast damage, hp)`, all together; results are sorted by
   `(y, x, unitId)`;
3. every blast-area tile with Field Defense loses it, whoever owns it
   (`FIELD_DEFENSE_DESTROYED { at, reason: "EXPLOSION" }` in `(y, x)` order;
   a tile already cleared by an earlier explosion of the chain is not
   reported again);
4. each unit reduced to 0 HP dies (`UNIT_DIED` cause `EXPLOSION`), in results
   order, each followed by its Grave or Bitten rising.

"Death first, then the bang": an exploding unit's death, Grave, or rising is
recorded before its explosion, so a unit on the exploder's own tile when the
blast resolves is hit: a melee attacker that killed it and advanced, or an
Infect or Bitten rising that appeared there.

### 18.7 Where chains run, and event order

An explosion that kills an exploding unit sets it off. A chain is
breadth-first by **wave**: wave 1 is the Kaboom unit, or every exploding unit
killed by the command's (or Start Turn's) ordinary effects, in ascending unit
ID; the explosions of a wave resolve one at a time in ascending unit ID
against current HP; every exploding unit killed during wave `n` explodes in
wave `n + 1`. The chain ends after a wave that kills no exploding unit.
Every unit explodes at most once and risings are Zombies, so a chain is
finite; the engine asserts at most as many explosions as there were units on
the board at chain start, counting the wave-1 exploders that just died
(`explosionChainMaxExplosionsV7`; a violation is an internal `INVALID_STATE`
rejection, unreachable by construction). Chains are PRNG-free.

A chain runs after the effect that caused the deaths has fully resolved:

- **`KABOOM`:** `UNIT_DIED` (cause `KABOOM`) and the exploder's
  `GRAVE_CREATED` or `BITTEN_UNIT_RISEN`; the chain; `PLUNDER_AWARDED`;
  reveals of risings; the economy, reward-settlement, and achievement tail.
- **`ATTACK`:** the ordinary steps through Push (damage, splash, Lifesteal,
  kill credit, removals, primary Field Defense destruction, deaths with
  Graves, Infect, and Bitten risings, advance, Push); then the chain of the
  exploding units among the defender, splash victims, and attacker; then the
  Ram/Overrun continuation, evaluated on the board after the chain (none if
  the attacker died or no visible hostile unit is adjacent any more; the
  `COMBAT_RESOLVED` preview's `overrunContinues` and `attacksRemaining` state
  the final value); then `PLUNDER_AWARDED`, reveals, and the tail. Event
  order: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; the death events;
  `UNIT_MOVED` (advance); `UNIT_PUSHED`; the chain events;
  `PLUNDER_AWARDED`; `TILES_REVEALED`; the tail.
- **`WAIL`:** after the Wail deaths and their Graves or risings, the chain of
  exploding victims, then `PLUNDER_AWARDED` and the tail.
- **Start Turn Plague:** after Plague steps 1–5, the chain of the player's
  exploding units that Plague killed, then `PLUNDER_AWARDED`, rising
  reveals, and the economy; then Windmill healing, Troll regeneration,
  income, rewards, and achievements
  ([section 3](#3-players-turns-and-victory)).

Chain events: for each explosion in chain order `EXPLOSION_RESOLVED`, then
its `FIELD_DEFENSE_DESTROYED` events, then for each death in its results
order `UNIT_DIED` (cause `EXPLOSION`) followed by that death's
`GRAVE_CREATED` or `BITTEN_UNIT_RISEN`. Every command then appends the naval
blockade and sea-network events ([section 14](#14-naval-rules); `KABOOM` and
`END_TURN` are on that list), followed by `PLAGUE_CLEARED` when a blast
killed a Lich.

### 18.8 Bomb Chucker bombs

A Bomb Chucker `ATTACK` is an ordinary targeted attack (damage formula, Gang
Up, Inspired, retaliation only from a defender that reaches 2 cells) plus a
bomb splash: **every other unit on the eight cells around the primary
target**, of any owner including the Bomb Chucker's own and its allies',
hidden or visible, of any form, takes `max(1, ceil(primary damage / 2))`
capped at its HP. There is no retaliation from splash targets and no
modifier, splash applies only when the Bomb Chucker attacks (never when it
retaliates), splash deaths have cause `SPLASH` (so exploding units killed by
it explode), and bomb splash does not destroy Field Defense. Fog and
projection follow the Battleship splash rules: canonical resolution includes
hidden units, the public combat preview lists only visible ones, and a
viewer that cannot see the attacker or target but owns a splashed unit
receives `COMBAT_SPLASH_DAMAGE`.

### 18.9 Kill credit, Plunder, and friendly fire

Every death is credited to at most one player:

| Death cause                    | Credited player                  | Unit kill credit (promotion)       |
| ------------------------------ | -------------------------------- | ---------------------------------- |
| `ATTACK`                       | the attacker's owner             | the attacker                       |
| `RETALIATION`                  | the retaliating defender's owner | the defender                       |
| `SPLASH`                       | the attacker's owner             | the attacker, hostile victims only |
| `WAIL`                         | the Banshee's owner              | the Banshee                        |
| `EXPLOSION`                    | the exploding unit's owner       | none (the exploding unit is dead)  |
| `KABOOM` (the exploder itself) | none                             | none                               |
| `PLAGUE`                       | none                             | none                               |

- A victim that rises (Infect or Bitten) still counts as killed.
- **Plunder** (the Goblin `COMMERCE`, displayed as Plunder; Mobility, tier 3,
  requires Roads, ordinary tier-3 cost): when a death is credited to a
  player that has Plunder and the victim's owner is hostile to that player,
  that player gains 1 Coin. This covers its attacks (primary and splash
  kills), its units' retaliation, and the blasts of its exploding units,
  including blasts of its units that an enemy killed. It earns nothing for
  Plague deaths or own or allied victims.
- Plunder Coins are added after the command's (or Start Turn's) deaths and
  chain, before the economy tail, with one
  `PLUNDER_AWARDED { playerId, kills, coins }` per credited player with at
  least one plundered kill, in player-ID order. Coins may arrive during
  another player's turn. The event is owner-only and carries no victim IDs.
- **Friendly fire** is a hit by an explosion or a Bomb Chucker splash on a
  unit owned by the credited player or its ally (the exploder itself never
  counts). A friendly-fire death earns no Plunder and no promotion credit.
  Previews report friendly damage and deaths separately.

### 18.10 WAAAGH!, Ram, and Troll regeneration

- **WAAAGH!** is the Goblin Rally (command `RALLY`, flag `inspired` labelled
  "WAAAGH!", event `UNITS_RALLIED`; unlock `WAAAGH_SUPPORT`). An Orc Warboss
  in land form that has not used a primary action (it may have moved) makes
  every other own land-form unit within Chebyshev distance 2 that has the
  `ATTACK` ability and is not already Inspired gain +1 Attack on its first
  accepted attack this turn; `SUPPORT` and `SIEGE` roles qualify. Everything
  else is the Inspired rule ([section 10](#10-recovery-and-support)),
  including `INSPIRED` Field Defense destruction. With no eligible target it
  rejects with `HEAL_TARGET_NOT_FOUND`.
- **Ram** is Overrun under a Goblin label for the Scrap Buggy
  ([section 13.4](#134-after-combat)); its continuation is evaluated after
  any chain its attack set off.
- **Troll regeneration:** at its owner's Start Turn, after Windmill healing
  and before income, every Troll of that player on the board heals
  `min(4, maxHp − hp)`, in any form and on any tile (own, neutral, or hostile
  territory). It is separate from Windmill healing and idle recovery and
  cures nothing. Event `UNITS_REGENERATED { playerId, results }` with
  `results: [{ unitId, amount, hpAfter }]` in unit-ID order for Trolls with
  `amount > 0`; no event when no Troll healed.

### 18.11 Interactions with other rules

| Rule                    | Interaction                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves                  | `KABOOM` and `EXPLOSION` deaths are qualifying combat deaths (land form, land tile, not a settlement site, no rising, no Grave yet); Graves exist only in matches with an Undead seat.                                                                                     |
| Infect, Bitten          | Explosions are not Zombie damage: they never infect or bite. A Bitten land-form unit that dies from `KABOOM` or `EXPLOSION` rises as its biter's Zombie. A Zombie that kills a Bomb Chucker infects it, and the Chucker's death blast then hits the Zombie and the rising. |
| Plague, Wail            | Plague and Wail kills of exploding units set off death blasts. A blast that kills a Lich ends every Plague it caused (`PLAGUE_CLEARED`). Goblin units are living: Wail, Plague, and bites affect them.                                                                     |
| Lifesteal, Unanswered   | Blasts are not combat exchanges: no Lifesteal heal. A Vampire's attack draws no retaliation, but a Bomb Chucker it kills still explodes and hits it.                                                                                                                       |
| Push, Charge, Escape    | Push resolves before the chain. A Raider that survives the attack and the chain keeps its Escape Move.                                                                                                                                                                     |
| Cities, villages        | Blasts hit units on centers (Walls and fortification give no protection), never capture, move, or advance a unit, and never change a city, territory, level, Walls, improvement, Road, resource, or Monument. Surviving victims keep their capture eligibility.            |
| Capacity                | A Kaboom or blast death frees its home city's slot at once; the city trains again only with its city action still available.                                                                                                                                               |
| Achievements, Promotion | No achievement counts kills; explosions credit no unit kill ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)).                                                                                                                                                  |

### 18.12 Commands, events, errors, and queries

- **Command** `KABOOM { kind, unitId }`, inserted in `COMMAND_KIND_ORDER_V7`
  immediately after `WAIL`.
- **Events:** `UNITS_REGENERATED { playerId, results }` (after
  `WINDMILL_HEALING_RESOLVED`); `EXPLOSION_RESOLVED` (after `WAIL_RESOLVED`)
  with `playerId` (the exploding unit's owner), `unitId`, `role`, `at` (its
  death tile), `cause` (`KABOOM` or `DEATH`), `wave` (1-based), `damage`, and
  `results` in the splash-entry shape `{ unitId, at, damage, dies }`, sorted
  by `(y, x, unitId)` and possibly empty; and
  `PLUNDER_AWARDED { playerId, kills, coins }` (after `SPOILS_AWARDED`).
  `UNIT_DIED.cause` and the Grave and Bitten-rising causes gain `KABOOM` and
  `EXPLOSION`; `FIELD_DEFENSE_DESTROYED.reason` gains `EXPLOSION`.
  `CombatPreviewV7` gains `gangUp`; Bomb Chucker `splash` entries may name
  own and allied units.
- **Error:** `KABOOM_NOT_LEGAL` (reason `EMBARKED`); other Kaboom rejections
  reuse existing codes ([section 18.4](#184-kaboom)).
- **Registration:** faction `GOBLIN`, tree `GOBLIN_BASELINE_V1`, display name
  "Goblin"; unlock kinds `WAAAGH_SUPPORT` and `PLUNDER { coins: 1 }`;
  capability `plunderCoins`; abilities `KABOOM` and `REGENERATE`; faction
  rules `cityCapacityBonus` and `gangUpMaximum`; role mechanics
  `kaboomDamage`, `deathBlastDamage`, `splashTargets`, `buildsFieldDefense`,
  `rallyRadius`, `rallyReachesSupportAndSiege`, and `regeneration`.
- **`queryPlayerCommandsV7`** offers `KABOOM` exactly when legal (also with
  no unit in the blast area), never offers Goblin Field Defense or Warboss
  Tend Wounded, and offers WAAAGH! (`RALLY`) only with an eligible target.
- **`previewKaboomV7(view, unitId)`** returns null unless `KABOOM` is
  offered; otherwise `unitId`, `at`, `explosions`, `totals`, `friendlyFire`,
  and `touchesUnexplored`. `explosions` lists the previewed chain in
  resolution order, each with `unitId`, `ownerId`, `role`, `at`, `cause`,
  `wave`, `damage`, `results`, and `fieldDefenseDestroyed`; each result has
  `unitId` (null for a Zombie that would rise during the previewed command),
  `ownerId`, `at`, `damage`, `dies`, and `friendly` (own or allied). `totals`
  holds `hostileDamage`, `hostileKills`, `friendlyDamage`, `friendlyKills`,
  and `plunderCoins` (the exploder excluded; 0 without Plunder), and
  `friendlyFire` is `friendlyDamage > 0`.
- **`previewAttackExplosionsV7(view, attackerId, targetUnitId)`** returns
  null when the attack is not offered, otherwise the same chain shape (with
  `attackerId` and `targetUnitId`) for the death blasts the attack would set
  off, after its deaths, risings, advance, and Push (an empty chain when
  none).
- Chain previews use the viewer's visible units only. `touchesUnexplored` is
  true when a previewed blast area (or, for an attack, the splash ring or an
  unknown Push destination the chain depends on) includes a cell the viewer
  has not explored; with `touchesUnexplored: false` the preview equals the
  resolution. A Kaboom's first blast is always exact.
- `queryCombatPreviewV7` and `estimateCombatV7` include Gang Up and friendly
  bomb splash. `queryThreatenedTilesV7` (which returns tiles, not damage)
  adds, for a visible goblin-crewed land unit, every tile within Chebyshev 1
  of a tile it can reach this turn (it may Kaboom after moving). An embarked
  goblin-crewed unit adds no Kaboom reach: landing ends its activation, so it
  cannot land and Kaboom in the same turn (`pulp_wars-0ao.15` removed the
  landing reach that `pulp_wars-0ao.11` had added).
- Public unit stats carry the `goblin` mechanics block for Goblin-owned
  units, and `previewCityCapacityV7` includes Warrens. `PublicPlayerV7` and
  the leaderboard carry `GOBLIN` and `GOBLIN_BASELINE_V1` for Goblin seats.

## 19. Revision history

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
| 13       | `pulp-wars-poc-7r13` | Undead faction (per-seat factions, roster, Graves, Restless, Frenzy, Raise Dead, Devour, Infect, Lifesteal, Wail, Lich splash)                                     | [revision 13](RULESET_7_REVISION_13_UNDEAD.md)                |
| 14       | `pulp-wars-poc-7r14` | Plague (Lich) and Bitten (Zombie); Tend cures; unanswered Vampire; Lich Attack 3; +1 village; level income cap 5; Commerce no longer doubles Markets               | [revision 14](RULESET_7_REVISION_14_BALANCE.md)               |
| 15       | `pulp-wars-poc-7r15` | Plague lasts three owner turns and spreads only on the first; Zombie 18 HP                                                                                         | [revision 15](RULESET_7_REVISION_15_BALANCE.md)               |
| 16a      | `pulp-wars-poc-7r16` | Orthogonal Shallow Water (25% minimum); capital growth guarantee and `CAPITAL_GROWTH`; Normal AI growth-first opening                                              | [revision 16](RULESET_7_REVISION_16.md)                       |
| 16b      | `pulp-wars-poc-7r16` | Patrol Boat and embarked Move 2; landing costs one movement point; landing preview                                                                                 | [revision 16](RULESET_7_REVISION_16.md)                       |
| 16c      | `pulp-wars-poc-7r16` | Research tiers 5+1/7+3/12+5 per extra city; level income cap 4; Market cap 3                                                                                       | [revision 16](RULESET_7_REVISION_16.md)                       |
| 17       | `pulp-wars-poc-7r17` | Goblin faction: roster, Warrens, Gang Up, Kaboom, death blasts and chains, friendly-fire bombs, Plunder, WAAAGH!, Troll regeneration; `END_TURN` blockade events   | [revision 17](RULESET_7_REVISION_17_GOBLINS.md)               |
| 17       | `pulp-wars-poc-7r17` | `pulp_wars-0ao.7` tuning: one starting Goblin; Goblin Attack 1.5, Defense 0.5, Kaboom 5; death blasts 2/4/4; Goblin-only Normal AI changes                         | [revision 17](RULESET_7_REVISION_17_GOBLINS.md)               |
| 17 (fix) | `pulp-wars-poc-7r17` | `pulp_wars-0ao.15`: landing ends the activation for every faction (no Attack, Kaboom, Move, or Disband after landing)                                              | [revision 16](RULESET_7_REVISION_16.md)                       |

**Documentation parity (2026-09-28, no ruleset or identity change):** where
older documents disagreed with the code, the code's behavior was adopted as
the rule and is now stated in the ordinary sections: Field Defense
destruction by attack regardless of tile owner
([section 13.4](#134-after-combat)); sea trade for a captured foreign capital
([section 9.5](#95-sea-trade)); the capital +1 income following a captured
capital to its new owner ([section 4.3](#43-income)); settlement counts on
widths 11–16 following the AI count ([section 2.2](#22-settlements-and-treasures));
and Windmill healing without Milling ([section 10](#10-recovery-and-support)).

**Undead release fold (2026-09-30, `pulp_wars-vkq.16`, no ruleset or identity
change):** revisions 13–16 were folded into this document for both factions,
and the `?undead=1` development flag was removed, so faction choice is part of
every match setup. Where the older text of this document or an overlay
disagreed with the code, the code's behavior is stated:

- retaliation needs the `ATTACK` ability and an Attack above 0, not merely an
  Attack stat (the Banshee has Attack 1 for Wail but never retaliates), and
  the attacker must not be `UNANSWERED` ([section 13.2](#132-damage));
- Rally and Frenzy targets are own land-form units that are not `SUPPORT` or
  `SIEGE`, have the `ATTACK` ability, and are not already Inspired (for Human
  units this equals the former "not a Captain or Catapult";
  [section 10](#10-recovery-and-support));
- Charge applies only at range 1 (no Human or Undead Charge unit has a longer
  range; [section 13.2](#132-damage));
- stale revision-12 values replaced by later revisions: the 7r12 identity and
  obsolete-key list, the eight-neighbour Shallow rule, the village table,
  research tiers `7 + 2(C - 1)` and `9 + 3(C - 1)`, the uncapped level term,
  the Commerce-doubled Market paying up to 4 (8), Patrol Boat and embarked
  Move 3, and "Only the `ORIGINAL` faction exists";
- "living unit" meaning a unit on the board was reworded to "on the board"
  (Muster, capacity, occupancy, legality, endgame siege), because "living"
  now means non-Undead.

**Goblin release fold (2026-10-01, `pulp_wars-0ao.9`, no ruleset or identity
change):** revision 17 (`pulp-wars-poc-7r17`, implemented by
`pulp_wars-0ao.2`–`0ao.8` and `0ao.11`–`0ao.17`) was folded into this document
for three factions, with a Goblin roster table, the Goblin technology
differences, [section 18](#18-goblin-faction-rules), and the Goblin
interactions in the shared sections; the former sections 18 (revision
history) and 19 (known discrepancies) became 19 and 20. Every Goblin value
was checked against `GOBLIN_ROLE_RULES_V7`, `GOBLIN_ROLE_MECHANICS_V7`,
`FACTION_RULES_V7`, `STARTING_FIGHTERS_V7`, `MILITIA_FIGHTERS_V7`, and
`explosions.ts`. Where the revision-17 overlay and the code differed, the
code's behavior is stated:

- the `pulp_wars-0ao.7` tuned values replace the contract's (one starting
  Goblin; Goblin Attack 1.5, Defense 0.5, Kaboom 5; death blasts 2, 4, and
  4); Militia stays two Goblins;
- the chain bound counts the units on the board at chain start plus the
  wave-1 exploders that just died;
- `previewAttackExplosionsV7` returns null (not an empty chain) for an attack
  that is not offered; explosion preview results may carry a null `unitId`
  for a would-be rising; `touchesUnexplored` also covers the splash ring and
  an unknown Push destination;
- the naval events of a command precede its `PLAGUE_CLEARED`;
- technology display names are resolved in the UI helper `technologyNameV7`,
  not by the technology tree query, which returns IDs only (root decision;
  `pulp_wars-0ao.16` removed the engine's duplicate Title Case helper, so
  `technologyNameV7` is the single name helper);
- Goblin cities use the shared settlement art with no Goblin city tint (root
  decision on `pulp_wars-0ao.4`; presentation, not a rule).

The fold also records two code changes made while it was prepared. Landing
ends the unit's activation for every faction (`pulp_wars-0ao.15`, root
decision, as revisions 6 and 16 specify; [section 14](#14-naval-rules)):
before it, `DISEMBARK` set only `moved` and `handled`, so a landed unit was
still offered and allowed Attack, Kaboom, Disband, and other primary actions,
and the public threatened-tiles query and the Normal AI counted an embarked
goblin-crewed unit's landing-then-Kaboom reach (`pulp_wars-0ao.11`); that
reach is gone. Cure text is faction-aware (`pulp_wars-0ao.16`): Goblins have
no cure for Plague or Bitten, and their Help and status sentences say so.

## 20. Known discrepancies

No discrepancy is open: as of revision 17 (`pulp-wars-poc-7r17`) the rules in
this document match the code.

The revision 13–17 overlays keep superseded values (for example the
Lich's Attack 2.5 and 20-HP Zombie in revision 13, unlimited Plague in
revision 14, "Move 3" for embarked units in revision 13, and the pre-tuning
Goblin contract values in the revision-17 bounds and decisions) as design
history; this document states the current values.
