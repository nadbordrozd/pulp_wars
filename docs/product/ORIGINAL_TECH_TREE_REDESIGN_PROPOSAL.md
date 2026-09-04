# Original Technology Tree Redesign Proposal

> **DRAFT — NOT IMPLEMENTED — ORIGINAL FACTION ONLY**
>
> This is a review proposal, not an authoritative rules contract. It does not
> change Ruleset 6, game code, saves, assets, AI, or the Candy faction. If the
> direction is approved, it should be converted into a separately reviewed
> implementation contract before any gameplay work begins.

## 1. Decision summary

Keep the readable five-branch, three-tier, 25-node tree and the current
research model. Redesign what the nodes contain:

- every major branch supplies both an economic reason and a military reason
  to enter it;
- seven nodes become explicitly dual-use instead of being narrow one-unlock
  purchases;
- Original gains one new mid-tier unit, the **Pikeman**, and one new tier-3
  unit, the **Catapult**;
- the Catapult is true range-3 siege and shares **Sawmilling** with the
  Sawmill, echoing the desirable “economic processor plus military payoff”
  pattern without copying another game's complete tree;
- Heavy and Breacher remain tier-3 units, so the proposal has three distinct
  trainable tier-3 roles;
- the Raider becomes a sharper flanker: cheaper stats than a Fighter head-on,
  but fast enough to punish Marksmen and Catapults;
- Ore and Stone frequencies stay unchanged, but Mines, Quarries, Forges, and
  Stoneworks become much more productive per opportunity;
- Warfare gains a conquest economy—Spoils, Barracks capacity, Pillage, and
  Disband—rather than an arbitrary peaceful population building;
- no counter is expressed as “unit X deals bonus damage to unit Y.” Counterplay
  comes from price, health, attack, defense, range, minimum range, movement,
  retaliation, action order, terrain, city defense, and zone of control.

The proposal deliberately preserves the current research-cost formula. The
first tuning response to weak late-tier adoption should be richer nodes and
better units, not automatically cheaper research.

## 2. Scope, assumptions, and source basis

### Scope

- Original faction only.
- Land-only square maps and the current spatial city economy.
- A complete replacement proposal for the current Original registration, not
  an incremental patch list.
- Candy adaptation, names, art, and balance are explicitly deferred.

### Assumptions

1. The overall shape means five roots, each root forking into two tier-2 nodes,
   with one tier-3 child beneath each fork: `1 + 2 + 2` nodes per branch.
2. Each proposed node has exactly one in-branch parent at most. This retains
   the current tree-screen layout constraint.
3. The basic research mechanics remain: one Coin currency, permanent research,
   prerequisites, free research order among available nodes, dynamic price by
   tier and current city count, and Gathering known at match start.
4. The terrain/resource generator remains unchanged for the first balance
   pass. Changing both availability and yield would make the result harder to
   evaluate.
5. Existing city growth, live economic population, negative population,
   capacity, defense multipliers, retaliation, roads, and reward mechanics are
   retained unless this document says otherwise.
6. Half-point attack and defense remain exact rational values. Numerical combat
   examples use the existing full-health formula and round-half-up behavior.
7. “Economically useful” includes population, recurring Coins, unit-capacity
   savings, refunds, and conquest income. It does not require every branch to
   contain a peaceful population building.

### Sources audited

| Source                                                                                                              | What it establishes                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Ruleset 6 §§4–9](RULESET_6.md#4-map-resources-and-basic-development)                                               | Exact generator frequencies, current improvements, graph, costs, roles, combat abilities, and movement rules.                                                                    |
| [Original economy brief](../new_instructions.md#9-technology-structure)                                             | Five-branch intent, spatial-economy goals, processor formulas, and the desire for multi-unlock technologies.                                                                     |
| [Polytopia core reference §§7–11](../research/POLYTOPIA_CORE_REFERENCE.md#7-stars-resources-and-economic-decisions) | Useful comparative evidence for resource costs, five-root readability, movement, retaliation, and role differentiation. It is reference material, not an imported specification. |
| [Normal AI §§5–6](../architecture/NORMAL_AI.md#5-research-growth-and-roads)                                         | Current shortest-unlock-chain research assumptions and fixed role preferences that a redesign would invalidate.                                                                  |
| [Screen flow: Technology tree](../ui/SCREEN_FLOW.md#technology-tree)                                                | Five wide columns, compact single-branch navigation, one visual parent per node, full-graph cards, and detail-sheet requirements.                                                |
| [`ruleset-v6.ts`](../../src/engine/rules/ruleset-v6.ts)                                                             | Actual registered nodes, effects, role bindings, and cost function.                                                                                                              |
| [`map.ts`](../../src/engine/v6/map.ts)                                                                              | Actual terrain targets, conditional resource draw intervals, and map acceptance constraints.                                                                                     |
| [`spatial-economy.ts`](../../src/engine/v6/spatial-economy.ts)                                                      | Actual contribution arithmetic and adjacency/cluster semantics.                                                                                                                  |
| [`combat.ts`](../../src/engine/v6/combat.ts) and [`movement.ts`](../../src/engine/v6/movement.ts)                   | Exact damage, retaliation, terrain-stop, road, exploration, and ZOC mechanics.                                                                                                   |

## 3. Current-state diagnosis

### 3.1 Military unlocks are concentrated

The current 25-node registration distributes trainable role unlocks as follows:

| Branch     | Current unit unlocks   | Count |
| ---------- | ---------------------- | ----: |
| Settlement | None                   |     0 |
| Wilds      | Marksman               |     1 |
| Industry   | Heavy                  |     1 |
| Mobility   | Scout, Raider          |     2 |
| Warfare    | Guard, Medic, Breacher |     3 |

This makes Settlement a largely economic opening and Warfare the obvious place
to look for roster breadth. More importantly, several tier-3 purchases merely
improve something the player already has. Sawmilling unlocks only the Sawmill,
Masonry only Stoneworks, Fieldcraft only movement/replanting, Maneuver only ZOC
freedom, and Recovery only healing. These can be correct situational purchases,
but they do not consistently feel like late-tree payoffs.

### 3.2 The map strongly favors fields and forests

The generator fixes Mountain at 18% and Forest at 24%; the remaining 58% is
Grass. Conditional resource probabilities produce these nominal whole-board
rates before resource-free settlement centers and acceptance bias:

| Opportunity    |   Conditional rate | Nominal board rate | Per 100 cells |
| -------------- | -----------------: | -----------------: | ------------: |
| Fruit          |     12.5% of Grass |              7.25% |          7.25 |
| Fertile Ground |     37.5% of Grass |             21.75% |         21.75 |
| Forest, any    |      fixed terrain |             24.00% |         24.00 |
| Game           |   31.25% of Forest |              7.50% |          7.50 |
| Ore            | 18.75% of Mountain |             3.375% |         3.375 |
| Stone          |  37.5% of Mountain |              6.75% |          6.75 |

On a 20×20 map with 15 settlements, the fixed terrain counts are 232 Grass,
96 Forest, and 72 Mountain. Because the 15 settlement centers are empty Grass,
the nominal non-settlement expectations are approximately 27.1 Fruit, 81.4
Fertile Ground, 30 Game, 13.5 Ore, and 27 Stone.

Actual maps are not independent random samples: every settlement must have at
least three nearby economic opportunities and two families, and every resource
must occur globally. That acceptance step improves local variety, but it does
not remove the structural fact that Ore is roughly one-sixth as common as
Fertile Ground and Stone is split into its own prerequisite path.

### 3.3 Current extraction does not pay for scarcity

Current basic population per Coin is Farm `2/5 = 0.40`, Lumber Camp
`1/3 = 0.33`, Mine `2/5 = 0.40`, and Quarry `1/4 = 0.25`. The mountain options
are no better per tile than the abundant options; Quarry is worse. Their
processor jackpots help only after buying another tier-3 technology and finding
the correct rare geometry.

Representative current complexes make the issue visible:

| Complex                            | Build cost | Population | Population/Coin |
| ---------------------------------- | ---------: | ---------: | --------------: |
| 4 Farms + Windmill                 |         25 |         12 |            0.48 |
| 6 Lumber Camps + Sawmill           |         23 |         12 |            0.52 |
| 4 Mines + Forge                    |         25 |         16 |            0.64 |
| 4 Quarries in a cross + Stoneworks |         21 |         12 |            0.57 |

The mountain complexes are more efficient once assembled, but not enough to
offset how rarely one city can assemble them, the initial Surveying purchase,
and the split between Mining and Quarrying.

### 3.4 Current counters exist, but the late siege answer is incomplete

The existing Guard/Fortification/Walls stack successfully creates a defensive
problem. Marksmen can attack without melee retaliation, and Raiders can punish
fragile ranged units, but a range-2 Marksman with Attack 2 inflicts only about
1 damage per shot on a full-health Guard under a 4× wall multiplier. The
Breacher is lethal against defense bonuses, yet its range 1, Move 1, and lack
of move-then-attack require it to survive adjacent positioning. That is a valid
siege style, not a complete substitute for long-range pressure.

The redesign should preserve the Breacher as a risky direct answer and add a
costly, fragile artillery answer. The defender then chooses between holding the
city and contesting the artillery screen.

## 4. Design principles

1. **Every branch is a package.** A major branch should change both how the
   player earns/spends Coins and how the player projects force.
2. **Rich nodes beat cheaper nodes.** A tier-3 node should normally unlock a
   new unit, a new building, or a strategically transformative rule; ideally
   two related benefits.
3. **Scarcity earns efficiency.** Mountain resources remain rare and exciting;
   they are not made common. Each developed deposit is much stronger.
4. **Counters are properties, not matchup tables.** No unit stores an “anti-X”
   multiplier. A cheap high-defense body naturally resists a fast low-defense
   attacker; minimum range naturally exposes artillery to a unit that closes.
5. **Basic units remain relevant.** Fighter's low price, Dash, and Capture make
   it efficient even after advanced roles appear.
6. **Advanced units are power purchases, not taxes.** They cost more, but solve
   problems that several cheap bodies cannot solve as safely or quickly.
7. **Economic geography remains legible.** The redesign adjusts numbers and
   unlock bundles without adding inventories or hidden resource chains.
8. **Branch parity is contextual, not identical.** Settlement is dependable,
   Industry is high-variance/high-payoff, Mobility compounds through position
   and Markets, and Warfare earns through conflict. Equal tile counts would
   erase those identities.

## 5. Research structure and costs

The formula remains exactly:

```text
tier 1 = 5 + 1 × (owned cities - 1)
tier 2 = 7 + 2 × (owned cities - 1)
tier 3 = 9 + 3 × (owned cities - 1)
```

| Owned cities | Tier 1 | Tier 2 | Tier 3 | New-root path through tier 3 |
| -----------: | -----: | -----: | -----: | ---------------------------: |
|            1 |      5 |      7 |      9 |                           21 |
|            2 |      6 |      9 |     12 |                           27 |
|            3 |      7 |     11 |     15 |                           33 |
|            5 |      9 |     15 |     21 |                           45 |

Gathering remains researched at start, so a Settlement tier-3 path costs only
the tier-2 and tier-3 prices. The meaningful opportunity cost of capturing a
city before research remains intact.

## 6. Complete proposed technology graph

The IDs and the `root → two tier-2 forks → one tier-3 child per fork` geometry
are retained. “Economic” includes development, income, capacity, refund, and
conquest-economy effects.

### 6.1 All nodes

| Branch     | Tier | Technology        | Prerequisite           | Economic unlocks                                                                                     | Military/utility unlocks                                                        |
| ---------- | ---: | ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Settlement |    1 | **Gathering**     | —; researched at start | Reveal Fruit/Fertile Ground; Harvest Fruit (2 Coins, +1 permanent population)                        | —                                                                               |
| Settlement |    2 | **Farming**       | Gathering              | Farm (5 Coins, +2 live population); connected-field visuals                                          | Train Pikeman                                                                   |
| Settlement |    3 | **Milling**       | Farming                | Windmill (5 Coins, +1 per connected Farm, cap 8)                                                     | —                                                                               |
| Settlement |    2 | **Craft**         | Gathering              | Workshop (4 Coins, +1 per distinct adjacent basic family, 2–4)                                       | —                                                                               |
| Settlement |    3 | **Grand Works**   | Craft                  | Grand Works (7 Coins, +2 per distinct adjacent processor, 6–8); Redevelop                            | Redeploying land can open roads, lines of sight, and defensive space            |
| Wilds      |    1 | **Hunting**       | —                      | Hunt visible Game (2 Coins, +1 permanent population)                                                 | —                                                                               |
| Wilds      |    2 | **Forestry**      | Hunting                | Lumber Camp (3 Coins, +1 live population); Clear Forest (+1 Coin)                                    | —                                                                               |
| Wilds      |    3 | **Sawmilling**    | Forestry               | Sawmill (5 Coins, +1 per connected Lumber Camp, cap 8)                                               | Train Catapult                                                                  |
| Wilds      |    2 | **Marksmanship**  | Hunting                | —                                                                                                    | Train Marksman                                                                  |
| Wilds      |    3 | **Fieldcraft**    | Marksmanship           | Replant Forest (4 Coins); preserves future Camp/Sawmill planning                                     | Scout and Marksman ignore Forest movement termination; Marksman sight becomes 2 |
| Industry   |    1 | **Surveying**     | —                      | Reveal Ore/Stone                                                                                     | Enter Mountain; +1 sight radius while on Mountain                               |
| Industry   |    2 | **Mining**        | Surveying              | Mine (6 Coins, +4 live population)                                                                   | —                                                                               |
| Industry   |    3 | **Metallurgy**    | Mining                 | Forge (6 Coins, +4 per adjacent Mine)                                                                | Train Heavy                                                                     |
| Industry   |    2 | **Quarrying**     | Surveying              | Quarry (5 Coins, +3 live population)                                                                 | —                                                                               |
| Industry   |    3 | **Masonry**       | Quarrying              | Stoneworks (6 Coins, +2 per adjacent Quarry and +3 per opposite pair)                                | Stone-based population accelerates city capacity and reward access              |
| Mobility   |    1 | **Scouting**      | —                      | Earlier villages/chests/resources improve expansion choices                                          | Train Scout; sight radius 2                                                     |
| Mobility   |    2 | **Roads**         | Scouting               | Road (2 Coins); enables Market connection bonus                                                      | Half-cost orthogonal movement on connected friendly road/city network           |
| Mobility   |    3 | **Commerce**      | Roads                  | Market (7 Coins, +1 Coin/turn per adjacent family, plus 1 for capital-road connection; cap 5)        | Roads support reinforcement and flanking                                        |
| Mobility   |    2 | **Raiding**       | Scouting               | —                                                                                                    | Train Raider; Charge after moving at least two path cells                       |
| Mobility   |    3 | **Maneuver**      | Raiding                | —                                                                                                    | Scout and Raider ignore hostile ZOC while moving                                |
| Warfare    |    1 | **Drill**         | —                      | Spoils: capture a neutral village for +1 Coin; capture a hostile city for `min(city level, 3)` Coins | Train Guard                                                                     |
| Warfare    |    2 | **Fortification** | Drill                  | Build Barracks (5 Coins, maximum one per city, +1 unit capacity, no population/income)               | Fighter/Guard receive 2× defense in an unwalled friendly city                   |
| Warfare    |    3 | **Explosives**    | Fortification          | Pillage: destroy the hostile improvement beneath a unit for +2 Coins; terminal action                | Train Breacher; Breach ignores ordinary terrain/city defense multipliers        |
| Warfare    |    2 | **Medicine**      | Drill                  | Sustaining damaged units avoids replacement cost                                                     | Train Medic; Heal adjacent owned unit by 4 HP                                   |
| Warfare    |    3 | **Recovery**      | Medicine               | Disband a trainable unit for `floor(training cost / 2)` Coins                                        | Medic heals 6; fully idle units recover 6 HP in friendly territory              |

### 6.2 Graph audit

```text
Gathering (start)
├── Farming ───── Milling
└── Craft ─────── Grand Works

Hunting
├── Forestry ──── Sawmilling
└── Marksmanship ─ Fieldcraft

Surveying
├── Mining ────── Metallurgy
└── Quarrying ─── Masonry

Scouting
├── Roads ─────── Commerce
└── Raiding ───── Maneuver

Drill
├── Fortification ─ Explosives
└── Medicine ───── Recovery
```

The graph contains 25 unique nodes, five roots, ten tier-2 nodes, and ten
tier-3 nodes. Every non-root has exactly one prerequisite; there are no cycles
or cross-branch display parents.

### 6.3 Explicit dual-use nodes

| Node          | Economic use                              | Military use                                |
| ------------- | ----------------------------------------- | ------------------------------------------- |
| Farming       | Converts abundant Fertile Ground          | Unlocks Pikeman                             |
| Sawmilling    | Multiplies Lumber Camp clusters           | Unlocks Catapult                            |
| Fieldcraft    | Replants future timber clusters           | Improves forest movement and Marksman sight |
| Metallurgy    | Multiplies rare Mines                     | Unlocks Heavy                               |
| Roads         | Enables Market network                    | Accelerates reinforcement                   |
| Drill         | Pays conquest Spoils                      | Unlocks Guard                               |
| Fortification | Adds one city capacity via Barracks       | Improves city defense                       |
| Explosives    | Converts destruction into Pillage Coins   | Unlocks Breacher                            |
| Recovery      | Recovers part of obsolete-unit investment | Improves healing and recovery               |

This is more than the minimum “one economy plus one unit” bundling. It also
lets a player justify a node from the board position rather than from a fixed
build order.

## 7. Complete proposed Original unit roster

### 7.1 Stats and training

| Unit       | Unlock            | Cost |  HP | Attack | Defense | Move | Range | Minimum range | Move then primary action? |
| ---------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ------------: | ------------------------- |
| Fighter    | Start             |    2 |  10 |      2 |       2 |    1 |     1 |             1 | Yes                       |
| Scout      | Scouting (T1)     |    3 |  10 |    1.5 |       1 |    2 |     1 |             1 | Yes                       |
| Pikeman    | Farming (T2)      |    3 |  15 |      2 |     2.5 |    1 |     1 |             1 | Yes                       |
| Marksman   | Marksmanship (T2) |    3 |  10 |      2 |       1 |    1 |     2 |             1 | Yes                       |
| Guard      | Drill (T1)        |    3 |  15 |    1.5 |       3 |    1 |     1 |             1 | No                        |
| Raider     | Raiding (T2)      |    4 |  10 |      2 |       1 |    2 |     1 |             1 | Yes                       |
| Medic      | Medicine (T2)     |    4 |  10 |    0.5 |     1.5 |    1 |     1 |             1 | Yes                       |
| Catapult   | Sawmilling (T3)   |    7 |  10 |    4.5 |     0.5 |    1 |     3 |             2 | No                        |
| Heavy      | Metallurgy (T3)   |    7 |  20 |    3.5 |     3.5 |    1 |     1 |             1 | Yes                       |
| Breacher   | Explosives (T3)   |    6 |  10 |      4 |       1 |    1 |     1 |             1 | No                        |
| Juggernaut | City reward only  |    — |  40 |      4 |       4 |    1 |     1 |             1 | Yes                       |

The roster has three trainable tier-3 units with different jobs and prices:
Catapult 7, Heavy 7, and Breacher 6. None is merely Fighter with every number
increased.

### 7.2 Abilities and restrictions

| Unit       | Abilities and restrictions                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fighter    | Attack, Capture. Its 2-Coin price is its late-game advantage.                                                                                                                                         |
| Scout      | Attack, Capture, sight 2; gains Forest freedom from Fieldcraft and ZOC freedom from Maneuver.                                                                                                         |
| Pikeman    | Attack, Capture. No matchup bonus: 15 HP and Defense 2.5 make it an efficient line body against any fragile charge unit.                                                                              |
| Marksman   | Attack at range 1–2, Capture, no advance after a ranged kill; Fieldcraft grants Forest freedom and sight 2.                                                                                           |
| Guard      | Attack, Capture, cannot attack after moving; strongest cheap base defense and benefits from Fortification.                                                                                            |
| Raider     | Attack, Capture; Charge adds +1 Attack only after an accepted move of at least two path cells; Maneuver removes hostile-ZOC termination. Base Attack/Defense are both reduced from current Ruleset 6. |
| Medic      | Weak Attack or Heal; does not Capture. Heal is 4, upgraded to 6 by Recovery.                                                                                                                          |
| Catapult   | Attack only at range 2–3; cannot attack after moving, Capture, retaliate against adjacent attackers, or advance after a kill. Ordinary ranged-retaliation rules still apply.                          |
| Heavy      | Attack, Capture, Push a surviving melee target when the behind tile is legal. High HP lets it stay on the front line.                                                                                 |
| Breacher   | Melee Attack with Breach; cannot attack after moving or Capture. Breach replaces the defender's ordinary terrain/city multiplier with 1×, but does not alter base Defense.                            |
| Juggernaut | Attack, Capture, Push; reward-only and unchanged in purpose.                                                                                                                                          |

### 7.3 Why the advanced prices are justified

- A **Catapult** costs 3.5 Fighters, but safely deals approximately 6 damage
  per full-health shot to a Guard under a 4× city-wall multiplier. A Marksman
  deals approximately 1. It buys siege tempo, not general durability.
- A **Heavy** costs 3.5 Fighters, but carries twice their HP, 3.5/3.5 combat
  stats, and Push. It concentrates strength into one capacity slot.
- A **Breacher** costs 3 Fighters and can deal approximately 10 damage to a
  full-health Guard while ignoring its city multiplier. It pays for that burst
  with 10 HP, Defense 1, range 1, no Dash, and no Capture.

Capacity concentration matters: three Fighters need three city slots, while
one advanced unit needs one. That is a real part of advanced-unit value and
should be shown in balancing, not treated as free.

## 8. Economy and improvement numbers

### 8.1 Resources and basic improvements

| Resource/terrain | Availability                         | Tech/action            | Cost |         Proposed result | Current result |
| ---------------- | ------------------------------------ | ---------------------- | ---: | ----------------------: | -------------: |
| Fruit on Grass   | 7.25% nominal                        | Gathering / Harvest    |    2 | +1 permanent population |             +1 |
| Game on Forest   | 7.50% nominal                        | Hunting / Hunt         |    2 | +1 permanent population |             +1 |
| Fertile Ground   | 21.75% nominal                       | Farming / Farm         |    5 |      +2 live population |             +2 |
| Empty Forest     | up to 24%; Game must be hunted first | Forestry / Lumber Camp |    3 |      +1 live population |             +1 |
| Ore              | 3.375% nominal                       | Mining / Mine          |    6 |  **+4 live population** | +2 for 5 Coins |
| Stone            | 6.75% nominal                        | Quarrying / Quarry     |    5 |  **+3 live population** | +1 for 4 Coins |

Mountain extraction therefore becomes more efficient, not merely larger:
Mine is `4/6 = 0.67` population/Coin and Quarry is `3/5 = 0.60`, versus Farm
at `0.40` and Lumber Camp at `0.33`.

### 8.2 Processors and mixed buildings

| Improvement |  Cost | Limit/placement                                    | Proposed output                                                                            |
| ----------- | ----: | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Windmill    |     5 | One/city; touches Farm                             | +1 per orthogonally connected same-city Farm; cap 8.                                       |
| Sawmill     |     5 | One/city; touches Lumber Camp                      | +1 per orthogonally connected same-city Lumber Camp; cap 8.                                |
| Forge       | **6** | One/city                                           | **+4 per adjacent same-city Mine**; adjacency naturally caps at 8.                         |
| Stoneworks  | **6** | One/city                                           | **+2 per adjacent same-city Quarry, plus +3 per complete opposite pair** across four axes. |
| Workshop    |     4 | One/city; at least two adjacent basic types        | +1 per distinct adjacent friendly basic type; 2–4.                                         |
| Grand Works |     7 | One/city; at least three adjacent processor types  | +2 per distinct adjacent friendly processor type; 6 or 8.                                  |
| Market      |     7 | One/city; at least two adjacent families           | +1 Coin/turn per family, plus +1 if capital-road connected; cap 5.                         |
| Barracks    | **5** | One/city; empty owned tile adjacent to city center | **+1 unit capacity; no population or Coin income.**                                        |

Windmill, Sawmill, Workshop, Grand Works, and Market retain their current
arithmetic. This isolates the mountain correction and avoids inflating the
already-attractive field/forest packages.

### 8.3 Mountain jackpot arithmetic

| Complex                          | Cost |    Proposed population | Current population | Proposed population/Coin |
| -------------------------------- | ---: | ---------------------: | -----------------: | -----------------------: |
| 1 Mine                           |    6 |                      4 |                  2 |                     0.67 |
| 4 Mines + Forge                  |   30 |       `4×4 + 4×4 = 32` |                 16 |                     1.07 |
| 1 Quarry                         |    5 |                      3 |                  1 |                     0.60 |
| 2 opposite Quarries + Stoneworks |   16 |   `2×3 + 2×2 + 3 = 13` |                  6 |                     0.81 |
| 4 cross Quarries + Stoneworks    |   26 | `4×3 + 4×2 + 2×3 = 26` |                 12 |                     1.00 |

The numbers intentionally permit a rare Mine/Forge city to jump several city
levels. The player has paid for Surveying, Mining, Metallurgy, four deposits,
an exact adjacency tile, and 30 Coins of construction. That should feel like a
spectacular payoff, not like an ordinary Farm cluster with fewer candidates.

The absolute theoretical complex maxima are 64 population from eight adjacent
Mines plus a Forge (`32 + 32`) and 52 from eight adjacent Quarries plus a
Stoneworks (`24 + 16 + 12`). Those layouts are extraordinarily unlikely inside
one city's workable footprint. They should initially be allowed and monitored
rather than silently capped; geography producing an exceptional metropolis is
an explicit product goal. A cap remains a tuning lever if generated-map
evidence disproves that assumption.

### 8.4 Warfare economy

| Rule     | Exact proposal                                                                                                                                                    | Reason                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Spoils   | With Drill, neutral-village Capture grants +1 Coin; hostile-city Capture grants `min(captured city level, 3)` Coins.                                              | Pays for aggressive expansion without making three neutral captures fully repay the 5-Coin technology.    |
| Barracks | With Fortification, 5 Coins and one adjacent city tile buys +1 capacity; maximum one/city.                                                                        | Converts land and capital into production capacity without inventing population.                          |
| Pillage  | With Explosives, a unit on a hostile improvement may take a terminal action that destroys it and grants +2 Coins. It does not affect Roads or settlement centers. | Makes offensive positioning economically meaningful; flat reward is legible and below most rebuild costs. |
| Disband  | With Recovery, remove a trainable owned unit for `floor(cost/2)` Coins. Reward-only units have no refund.                                                         | Lets an advanced economy recover part of obsolete roster investment.                                      |

Spoils and Pillage are intentionally modest because conquest already transfers
cities and productive territory. Their baselines must not turn a winning war
into an unstoppable Coin cascade.

## 9. Branch value and parity analysis

### 9.1 Nominal economic surface

Assume 100 board cells, ignore settlement-center subtraction, and assume each
basic resource eventually reaches its matching processor. This is a comparison
tool, not a promise about one city's geometry.

| Package                         |           Nominal opportunities | Population represented by basics + proportional processor share |
| ------------------------------- | ------------------------------: | --------------------------------------------------------------: |
| Farming + Milling               |                   21.75 Fertile |                                       `21.75 × (2 + 1) = 65.25` |
| Hunting + Forestry + Sawmilling |     7.5 Game plus all 24 Forest |                        `7.5 Hunt + 24 Camp + 24 Sawmill = 55.5` |
| Mining + Metallurgy             |                       3.375 Ore |                                        `3.375 × (4 + 4) = 27.0` |
| Quarrying + Masonry             | 6.75 Stone, before pair bonuses |              `6.75 × (3 + 2) = 33.75`, plus opposite-pair value |
| Combined Industry               |       10.125 mountain resources |                                     **60.75 plus pair bonuses** |

This is the intended compensation: an Ore tile carries roughly eight
population of basic-plus-Forge value and a Stone tile at least five, compared
with three for Fertile Ground and roughly two to three for Forest depending on
Game. Industry's two forks together approach Settlement's nominal economic
surface despite operating on less than half as many resource markers.

Mining alone remains lower in global expected population than Farming, but its
path also unlocks Heavy and produces unusually rapid local level-ups. Quarrying
has twice as many markers and high pair upside. The split is therefore a choice
between a rarer military/industrial jackpot and a more available geometric
stone engine, not two underpowered halves.

### 9.2 Whole-branch packages

| Branch     | Dependable economic value                                                                   | Military value                                           | Why enter it even on imperfect terrain                                                                    |
| ---------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Settlement | Most abundant permanent/Farm growth; Workshop and Grand Works turn mixed sites into growth  | Pikeman supplies an affordable 15-HP line unit           | Gathering is already known; Craft still rewards mixed maps with few Fertile tiles                         |
| Wilds      | Game, cheap Camps, Sawmill clusters, clearing/replanting                                    | Marksman plus true range-3 Catapult; Fieldcraft mobility | Forest is 24% of every generated board; artillery remains useful after local forests are developed        |
| Industry   | Very high population per rare deposit; two different jackpot geometries                     | Heavy concentrates front-line power in one capacity slot | Surveying always provides Mountain access and vision; Heavy gives Mining a non-geographic payoff          |
| Mobility   | Roads save movement; Markets produce up to 5 recurring Coins per city                       | Scout exploration and Raider flanking/ZOC penetration    | Every accepted settlement has at least two nearby economic families, supporting eventual Market diversity |
| Warfare    | Spoils, +1 Barracks capacity, Pillage, partial Disband refund, and replacement-cost savings | Guard, Medic, Breacher, city fortification, recovery     | Its economy is conflict-driven and independent of resource generation                                     |

Parity does not mean identical unlock counts. Warfare should retain the widest
combat toolkit because its peaceful map economy is weakest. Settlement and
Industry need fewer roles because their city-growth ceilings are much higher.

### 9.3 Unit-unlock distribution

| Branch     | Proposed unit unlocks  | Count |
| ---------- | ---------------------- | ----: |
| Settlement | Pikeman                |     1 |
| Wilds      | Marksman, Catapult     |     2 |
| Industry   | Heavy                  |     1 |
| Mobility   | Scout, Raider          |     2 |
| Warfare    | Guard, Medic, Breacher |     3 |

No branch is now militarily empty. The remaining asymmetry is deliberate and
offset by economic scope rather than by making every branch contain the same
number of units.

## 10. Emergent counterplay

### 10.1 Intended pressure loop

```text
Guard / Pikeman line
    holds cheap melee and Raider charges
        ↓ invites
Marksman / Catapult fire
    attacks without ordinary melee retaliation
        ↓ invites
Raider flanking
    closes quickly and exploits Defense 1 / 0.5
        ↓ invites
Fighter screens, Pikemen, Guards, and ZOC
```

Breacher and Heavy sit beside this loop rather than replacing it. Breacher is
the risky adjacent solution to extreme defense. Heavy is a capacity-efficient
front-line anchor and positional displacer, but attacking a 4× walled Guard
head-on is still inefficient.

### 10.2 Full-health illustrative exchanges

These use proposed stats, ordinary current combat arithmetic, and no promotion.
“Damage” is defender damage / attacker retaliation. A killed defender does not
retaliate.

| Attack                    | Context                                  | Approx. damage | Meaning                                                              |
| ------------------------- | ---------------------------------------- | -------------: | -------------------------------------------------------------------- |
| Fighter → Raider          | Open ground                              |          6 / 2 | A 2-Coin Fighter trades efficiently into the 4-Coin flanker.         |
| Charged Raider → Fighter  | Open ground                              |          8 / 4 | Raider hurts but does not erase its screen in one attack.            |
| Charged Raider → Guard    | Guard on ordinary 1.5× defensive terrain |          5 / 8 | Charging a prepared defensive body is a losing exchange.             |
| Charged Raider → Marksman | Open ground                              |         10 / 0 | An exposed Marksman is removed if the Raider finds a two-step lane.  |
| Charged Raider → Catapult | Open ground                              |         10 / 0 | Minimum range and Defense 0.5 make unsupported artillery vulnerable. |
| Fighter → Pikeman         | Open ground                              |          4 / 6 | The 15-HP line unit absorbs cheap infantry efficiently.              |
| Marksman → walled Guard   | 4× city defense                          |          1 / 0 | Safe chip damage alone is too slow for strong siege.                 |
| Catapult → walled Guard   | Range 2–3, 4× city defense               |          6 / 0 | Expensive artillery creates real pressure but needs several shots.   |
| Breacher → walled Guard   | Breach replaces multiplier with 1×       |         10 / 6 | Direct siege is faster but exposes the fragile attacker.             |

Nothing in those outcomes checks the defender's unit ID. If future stat tuning
changes the matchups, it does so through universal combat properties.

### 10.3 Position and combined arms

- ZOC from a cheap Fighter can close the route to a Catapult. Maneuver lets a
  Raider bypass that stop, but occupancy and surviving defenders still matter.
- Catapult minimum range 2 means a unit that reaches adjacency shuts down its
  attack without a special “silence artillery” rule.
- A Marksman can move and fire but has shorter reach and lower siege damage; a
  Catapult has range 3 but cannot move and fire. Both remain useful.
- A Guard on a city maximizes defense but may allow artillery to set up outside
  retaliation range. Leaving the city to contest it gives up the multiplier.
- A Heavy can Push a screen away when geometry permits, opening a lane without
  dealing special anti-screen damage.
- Roads increase the practical threat radius of reinforcements, but Forest,
  Mountain prerequisites, unexplored stops, and ZOC remain impartial checks.

## 11. Example pacing

### 11.1 Early game: one city

The capital produces 2 Coins per turn and starts with 5. The player cannot do
everything at once:

- **Settlement:** keep the starting branch advantage, spend 2 per Fruit for
  immediate growth, then save 7 for Farming. Farming offers both +2 Farms and
  a 3-Coin Pikeman, so the purchase is not dead during an early border fight.
- **Wilds:** spend 5 on Hunting and 2 to Hunt one visible Game. The same branch
  leads to cheap timber or Marksmen; the terrain decides the fork.
- **Industry:** spend all 5 on Surveying for Mountain access, both resource
  reveals, and high-ground sight. A visible Ore/Stone concentration justifies
  the slower 7-Coin extraction follow-up.
- **Mobility:** spend 5 on Scouting and 3 on a Scout to contest villages and
  chests sooner. This is indirect economy through information and expansion.
- **Warfare:** spend 5 on Drill. A 3-Coin Guard stabilizes the capital, while
  each later neutral capture returns 1 Coin through Spoils.

Each opening therefore has a board/economy story and an immediate military or
territorial story.

### 11.2 Midgame: three cities

At three cities, costs are 7/11/15. A new root-to-tier-3 path costs 33 Coins,
so the endpoint must serve more than one purpose.

- A forest empire that already owns Hunting and Forestry spends 15 on
  Sawmilling. It can immediately build a 5-Coin Sawmill where profitable and
  train 7-Coin Catapults for a fortified frontier. Economy and war share the
  same research purchase.
- An Ore-rich city spends 11 on Mining, then 15 on Metallurgy. Four 6-Coin
  Mines plus a 6-Coin Forge produce 32 live population and unlock a 20-HP Heavy.
  The 56-Coin research/build commitment is enormous, but its local city and
  army payoff are also enormous.
- A mixed empire can take Roads then Commerce. A 4-Coin/turn Market repays its
  7-Coin build in two start-turn incomes after placement, while the Road network
  shortens defensive reinforcement.
- A pressured empire can take Fortification. A Barracks raises one city's
  capacity without another level and Guards/Fighters gain the city multiplier;
  neither benefit depends on rolling the correct resource.

### 11.3 Late game: five cities

At five cities, a new tier-3 technology costs 21 Coins. That price reinforces
planning rather than completion for its own sake:

- Sawmilling can be justified by multiple mature timber cities and the need
  for range-3 siege.
- Metallurgy can turn one rare Mine formation into several levels and add
  capacity-efficient Heavies.
- Grand Works can complete planned cross-city processor geometry for +6/+8
  population and permit redevelopment of obsolete placements.
- Recovery can rescue a veteran army and refund half the cost of units that no
  longer fit the plan.
- Explosives adds both Breachers and 2-Coin Pillage pressure against a dense
  enemy economy.

If playtests show that players correctly identify these benefits but still
never buy tier 3 after reaching four or five cities, reduce only the tier-3
city coefficient from 3 to 2. Do not make that change before measuring node
adoption with the richer unlock packages.

## 12. Implementation and migration impact if approved

This document does not authorize implementation. A later contract would need
to resolve the following work.

### Versioning

Ruleset 6 declares its IDs, node order, role order, schemas, hashes, and Candy
mapping frozen. This redesign should therefore become a new ruleset version,
not a silent mutation of `pulp-wars-poc-6`. Existing v6 saves/replays and
goldens should remain readable only under their original contract.

### Engine and data model

- Add Pikeman and Catapult role IDs/rules; add Catapult `minimumRange` and
  adjacent-retaliation restriction.
- Add Barracks as a non-economic city improvement or a clearly separated
  capacity-building layer; define capture, destruction, serialization, and
  live capacity recomputation.
- Add Spoils, Pillage, and Disband commands/effects, exact event payloads,
  validation order, overflow behavior, and transaction ordering.
- Change Mine, Quarry, Forge, and Stoneworks costs/formulas and update previews.
- Define whether a Catapult can retaliate at range 2–3. This proposal says yes
  under the ordinary range rule and no at adjacency because of minimum range.
- Preserve deterministic integer arithmetic and no new gameplay PRNG.

### Factions

The current architecture requires complete explicit registrations for Original
and Candy. The first implementation contract must decide whether the new
ruleset ships only after Candy has a complete adapted roster, or whether that
ruleset temporarily permits Original-only match setup. It must never fall back
silently from Candy to Original. This proposal makes no Candy choices.

### AI and simulation

- Replace fixed nine-role ordering and “missing role” research assumptions.
- Teach AI the Catapult minimum range, protected firing positions, anti-siege
  closing, Pikeman screening, Barracks capacity, Spoils, Pillage, and Disband.
- Rebalance economic research value so rare high-output extraction is not
  undervalued by raw target count.
- Update headless metrics to report node adoption, build counts, role mix,
  resource conversion, and combat outcomes by role.
- Create new deterministic corpus/goldens rather than refreshing v6 evidence.

### UI and assets

- The 25-node graph and single-parent branch layout remain compatible with the
  existing wide/compact Tech screen.
- Node detail copy and unlock icon lists need revision; Sawmilling must show
  both Sawmill and Catapult.
- New Original world sprites/portraits are required for Pikeman and Catapult,
  plus Barracks and Pillage/Spoils/Disband action symbols. Production art would
  follow the checked-in PixelLab workflow only after art direction and the
  design contract are approved.
- Combat preview must display minimum range, inability to move-and-fire, and
  expected ranged retaliation without relying on color alone.

## 13. Risks and tunable parameters

| Risk                                           | Proposed baseline                                    | Safe first tuning range                            | Evidence to watch                                            |
| ---------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| One Mine causes excessive reward queues        | +4 pop for 6                                         | +3 to +4                                           | Levels per Mine; reward modal frequency; Mining adoption     |
| Forge jackpot snowballs too hard               | +4/Mine, cost 6, no cap                              | +3 to +4/Mine; optional 32 cap                     | Population from top 5% of Forges; win rate after first Forge |
| Stone pairs overpay                            | +2/Quarry +3/pair                                    | pair +2 to +3                                      | Stoneworks distribution versus Windmill/Sawmill              |
| Industry still feels too map-dependent         | unchanged frequencies                                | boost Surveying utility before altering generation | Root adoption on starts with zero owned mountain resources   |
| Catapult creates static artillery balls        | cost 7, A4.5, R2–3, D0.5, no Dash                    | cost 7–8; A4–4.5; R3 fixed                         | Siege duration; Catapult survival with/without screens       |
| Raider still wins frontal trades               | cost4, A2, D1, Charge +1                             | Charge +0.5–1; D1–1.5                              | Coin-normalized losses versus Fighter/Pikeman/Guard          |
| Pikeman overlaps Guard                         | both cost3; Pike A2/D2.5/Dash, Guard A1.5/D3/no Dash | Pike HP 12–15 or cost 3–4                          | Pick rates by terrain and offensive/defensive posture        |
| Spoils accelerates expansion snowball          | +1 village, up to +3 hostile city                    | village 0–1; city cap 2–3                          | Drill opening win rate and Coins earned before round 10      |
| Pillage is more valuable than occupation       | flat +2, terminal                                    | +1 to +2                                           | Pillage frequency and net destroyed build cost               |
| Barracks bypasses city development too cheaply | cost5, +1 capacity, one/city                         | cost5–7                                            | Barracks adoption and units per city level                   |
| Tier 3 remains too late                        | current `9 + 3(C-1)`                                 | coefficient 2–3                                    | First tier-3 round, match share with any tier-3 tech         |
| Advanced units crowd out Fighters              | 6–7 Coins and one slot                               | +1 unit cost before stat nerf                      | Coin-normalized damage, captures, and survival by role       |

Recommended balance telemetry for seeded AI and human playtests:

- research adoption and first-purchase round by branch/node;
- Coins spent on research, improvements, and roles;
- eligible resource markers converted by family;
- city levels and income attributable to each economic family;
- combat damage, kills, survival turns, and captures per unit Coin;
- turns from first walled-Guard siege contact to capture;
- win rate conditional on first tier-3 node;
- top-decile Forge/Stoneworks values rather than averages alone.

## 14. Review questions

1. Is the proposed asymmetry acceptable—Settlement/Industry lead peaceful
   growth, Mobility compounds positioning/income, and Warfare earns through
   conflict—or should every branch have a direct population building?
2. Are Mine `+4 for 6` and Quarry `+3 for 5` sufficiently bold, or should a
   rare deposit be even more transformative?
3. Should the exceptional theoretical Forge/Stoneworks outputs remain uncapped
   for the first playtest, as proposed, or have explicit caps from day one?
4. Does **Sawmilling → Sawmill + Catapult** fit the desired dual-use identity,
   or should the artillery unlock live on a differently named Wilds node?
5. Is range 3 with minimum range 2 the right Catapult geometry? In particular,
   should a Catapult retaliate against another range-2/3 attacker under normal
   rules, as proposed?
6. Is the Pikeman distinct enough from Guard: more Attack, slightly less
   Defense, Dash, same cost and HP? If not, should it be removed or given a
   universal positional ability rather than a matchup bonus?
7. Are Spoils and Pillage the right economic identity for Warfare, or would a
   peaceful production/refund model be preferable despite weaker theme?
8. Should Barracks consume a map tile for +1 capacity, or should capacity remain
   exclusively tied to city level?
9. Should the current research-cost formula be frozen for the first playtest,
   or is the five-city tier-3 cost of 21 already known to be too punitive?
10. Is three trainable tier-3 units—Catapult, Heavy, Breacher—enough, or should
    Fieldcraft, Masonry, Maneuver, or Recovery also introduce a distinct
    advanced role?
11. For implementation sequencing, should a new ruleset wait for a complete
    Candy adaptation, or may an explicitly Original-only experimental ruleset
    ship first?

## 15. Approval boundary

Approval of this document should mean approval to write an authoritative new-
ruleset specification and implementation plan. It should **not** by itself mean
that these numbers are silently applied to Ruleset 6. Candy remains a separate
design exercise after the Original tree is accepted.
