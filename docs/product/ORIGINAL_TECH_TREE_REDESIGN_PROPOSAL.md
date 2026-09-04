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
- nine nodes become explicitly dual-use instead of being narrow one-unlock
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
  Stoneworks become much more productive per opportunity; hard processor caps
  preserve exceptional cities without allowing one build to create an
  excessive reward queue;
- Craft, rather than already-attractive Farming, unlocks the Pikeman, while
  Quarrying also unlocks the terrain-independent Barracks; these are deliberate
  fallbacks when the local map does not support a branch's resource action;
- Warfare gains a bounded conquest economy—first-capture Spoils, modest
  Pillage, and Disband—rather than an arbitrary peaceful population building;
- no counter is expressed as “unit X deals bonus damage to unit Y.” Counterplay
  comes from price, health, attack, defense, range, minimum range, movement,
  retaliation, action order, terrain, city defense, and zone of control.

The proposal deliberately preserves the current research-cost formula. The
first tuning response to weak late-tier adoption should be richer nodes and
better units, not automatically cheaper research. An independent pass revised
the initial draft's most snowball-prone values; section 14 records the evidence
and each resulting change.

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
| [`economy.ts`](../../src/engine/v6/economy.ts) and [`reducer.ts`](../../src/engine/v6/reducer.ts)                   | Growth thresholds, mandatory reward-queue sequencing, capture/move transactions, and current treasure/unit placement behavior.                                                   |
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

The independent review also sampled 240 accepted maps: seeds 0–19 for every
legal board-size/player-count pair, producing 3,000 settlement footprints.
This matters more than whole-board averages because two Forest neighbors are
reserved around every settlement and capitals require at least four
non-Mountain neighbors.

| Opportunity | Mean in initial 3 x 3 | Initial footprints with none | Mean in centered 5 x 5 | 5 x 5 footprints with none |
| ----------- | --------------------: | ---------------------------: | ---------------------: | -------------------------: |
| Fertile     |                  1.75 |                        11.5% |                   5.19 |                       0.2% |
| Forest      |                  3.08 |                         0.0% |                   7.04 |                       0.0% |
| Game        |                  0.95 |                        33.8% |                   2.16 |                       9.6% |
| Ore         |                  0.07 |                        93.3% |                   0.63 |                      53.0% |
| Stone       |                  0.17 |                        84.9% |                   1.32 |                      26.8% |

The 5 x 5 figures are optimistic: contested or previously assigned cells may
not be claimable. Consequently Industry is not a credible general-purpose
opening economy merely because both resource kinds exist somewhere on the
board. Its rare deposits need exceptional conversion rates, while at least one
node needs useful off-deposit value. This finding motivates Quarrying's
Barracks unlock and the capped, still-high processor values below.

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

| Branch     | Tier | Technology        | Prerequisite           | Economic unlocks                                                                                | Military/utility unlocks                                                        |
| ---------- | ---: | ----------------- | ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Settlement |    1 | **Gathering**     | —; researched at start | Reveal Fruit/Fertile Ground; Harvest Fruit (2 Coins, +1 permanent population)                   | —                                                                               |
| Settlement |    2 | **Farming**       | Gathering              | Farm (5 Coins, +2 live population); connected-field visuals                                     | —                                                                               |
| Settlement |    3 | **Milling**       | Farming                | Windmill (5 Coins, +1 per connected Farm, cap 8)                                                | —                                                                               |
| Settlement |    2 | **Craft**         | Gathering              | Workshop (4 Coins, +1 per distinct adjacent basic family, 2–4)                                  | Train Pikeman                                                                   |
| Settlement |    3 | **Grand Works**   | Craft                  | Grand Works (7 Coins, +2 per distinct adjacent processor, 6–8); Redevelop                       | —                                                                               |
| Wilds      |    1 | **Hunting**       | —                      | Hunt visible Game (2 Coins, +1 permanent population)                                            | —                                                                               |
| Wilds      |    2 | **Forestry**      | Hunting                | Lumber Camp (3 Coins, +1 live population); Clear Forest (+1 Coin)                               | —                                                                               |
| Wilds      |    3 | **Sawmilling**    | Forestry               | Sawmill (5 Coins, +1 per connected Lumber Camp, cap 8)                                          | Train Catapult                                                                  |
| Wilds      |    2 | **Marksmanship**  | Hunting                | —                                                                                               | Train Marksman                                                                  |
| Wilds      |    3 | **Fieldcraft**    | Marksmanship           | Replant Forest (4 Coins); preserves future Camp/Sawmill planning                                | Scout and Marksman ignore Forest movement termination; Marksman sight becomes 2 |
| Industry   |    1 | **Surveying**     | —                      | Reveal Ore/Stone                                                                                | Enter Mountain; +1 sight radius while on Mountain                               |
| Industry   |    2 | **Mining**        | Surveying              | Mine (6 Coins, +4 live population)                                                              | —                                                                               |
| Industry   |    3 | **Metallurgy**    | Mining                 | Forge (6 Coins, +3 per adjacent Mine, cap 18)                                                   | Train Heavy                                                                     |
| Industry   |    2 | **Quarrying**     | Surveying              | Quarry (5 Coins, +3 live population)                                                            | Barracks (6 Coins, maximum one per city, +1 unit capacity)                      |
| Industry   |    3 | **Masonry**       | Quarrying              | Stoneworks (6 Coins, +2 per adjacent Quarry and +2 per opposite pair, cap 16)                   | Stone-based population accelerates city capacity and reward access              |
| Mobility   |    1 | **Scouting**      | —                      | Earlier villages/chests/resources improve expansion choices                                     | Train Scout; sight radius 2                                                     |
| Mobility   |    2 | **Roads**         | Scouting               | Road (2 Coins); enables Market connection bonus                                                 | Half-cost orthogonal movement on connected friendly road/city network           |
| Mobility   |    3 | **Commerce**      | Roads                  | Market (7 Coins, +1 Coin/turn per adjacent family, plus 1 for capital-road connection; cap 5)   | Roads support reinforcement and flanking                                        |
| Mobility   |    2 | **Raiding**       | Scouting               | —                                                                                               | Train Raider; Charge after moving at least two path cells                       |
| Mobility   |    3 | **Maneuver**      | Raiding                | —                                                                                               | Scout/Raider ignore hostile ZOC; Raider Move becomes 3                          |
| Warfare    |    1 | **Drill**         | —                      | Spoils: +2 Coins on a player's first hostile capture of each city; neutral villages pay nothing | Train Guard                                                                     |
| Warfare    |    2 | **Fortification** | Drill                  | —                                                                                               | Fighter/Guard receive 2× defense in an unwalled friendly city                   |
| Warfare    |    3 | **Explosives**    | Fortification          | Pillage: destroy the hostile improvement beneath a unit for +1 Coin; terminal action            | Train Breacher; Breach ignores ordinary terrain/city defense multipliers        |
| Warfare    |    2 | **Medicine**      | Drill                  | Sustaining damaged units avoids replacement cost                                                | Train Medic; Heal adjacent owned unit by 4 HP                                   |
| Warfare    |    3 | **Recovery**      | Medicine               | Disband a trainable unit for `floor(training cost / 2)` Coins                                   | Medic heals 6; fully idle units recover 6 HP in friendly territory              |

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

| Node       | Economic use                              | Military use                                |
| ---------- | ----------------------------------------- | ------------------------------------------- |
| Craft      | Rewards a mixed basic-economy site        | Unlocks Pikeman                             |
| Sawmilling | Multiplies Lumber Camp clusters           | Unlocks Catapult                            |
| Fieldcraft | Replants future timber clusters           | Improves forest movement and Marksman sight |
| Metallurgy | Multiplies rare Mines                     | Unlocks Heavy                               |
| Quarrying  | Converts Stone at high efficiency         | Unlocks terrain-independent city capacity   |
| Roads      | Enables Market network                    | Accelerates reinforcement                   |
| Drill      | Pays conquest Spoils                      | Unlocks Guard                               |
| Explosives | Converts destruction into Pillage Coins   | Unlocks Breacher                            |
| Recovery   | Recovers part of obsolete-unit investment | Improves healing and recovery               |

This is more than the minimum “one economy plus one unit” bundling. It also
lets a player justify a node from the board position rather than from a fixed
build order.

## 7. Complete proposed Original unit roster

### 7.1 Stats and training

| Unit       | Unlock            | Cost |  HP | Attack | Defense | Move | Range | Minimum range | Move then primary action? |
| ---------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ------------: | ------------------------- |
| Fighter    | Start             |    2 |  10 |      2 |       2 |    1 |     1 |             1 | Yes                       |
| Scout      | Scouting (T1)     |    4 |  10 |    1.5 |       1 |    2 |     1 |             1 | Yes                       |
| Pikeman    | Craft (T2)        |    4 |  12 |    2.5 |       2 |    1 |     1 |             1 | Yes                       |
| Marksman   | Marksmanship (T2) |    3 |  10 |      2 |       1 |    1 |     2 |             1 | Yes                       |
| Guard      | Drill (T1)        |    3 |  15 |    1.5 |       3 |    1 |     1 |             1 | No                        |
| Raider     | Raiding (T2)      |    4 |  10 |      2 |       1 |    2 |     1 |             1 | Yes                       |
| Medic      | Medicine (T2)     |    4 |  10 |    0.5 |     1.5 |    1 |     1 |             1 | Yes                       |
| Catapult   | Sawmilling (T3)   |    8 |  10 |    3.5 |     0.5 |    1 |     3 |             2 | No                        |
| Heavy      | Metallurgy (T3)   |    7 |  20 |    3.5 |     3.5 |    1 |     1 |             1 | Yes                       |
| Breacher   | Explosives (T3)   |    6 |  10 |      4 |       1 |    1 |     1 |             1 | No                        |
| Juggernaut | City reward only  |    — |  40 |      4 |       4 |    1 |     1 |             1 | Yes                       |

The table shows base role stats. Maneuver changes Raider Move from 2 to 3 for
players who have researched it; no other proposed technology changes a role's
numeric stat.

The roster has three trainable tier-3 units with different jobs and prices:
Catapult 8, Heavy 7, and Breacher 6. None is merely Fighter with every number
increased.

### 7.2 Abilities and restrictions

| Unit       | Abilities and restrictions                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fighter    | Attack, Capture. Its 2-Coin price is its late-game advantage.                                                                                                                                                                     |
| Scout      | Attack, Capture, sight 2; gains Forest freedom from Fieldcraft and ZOC freedom from Maneuver.                                                                                                                                     |
| Pikeman    | Attack, Capture. No matchup bonus: Attack 2.5 and Dash make it a mobile line attacker; HP 12 and Defense 2 keep it materially less durable than Guard.                                                                            |
| Marksman   | Attack at range 1–2, Capture, no advance after a ranged kill; Fieldcraft grants Forest freedom and sight 2.                                                                                                                       |
| Guard      | Attack, Capture, cannot attack after moving; strongest cheap base defense and benefits from Fortification.                                                                                                                        |
| Raider     | Attack, Capture; Charge adds +1 Attack only after an accepted move of at least two path cells; Maneuver removes hostile-ZOC termination and raises Move from 2 to 3. Base Attack/Defense are both reduced from current Ruleset 6. |
| Medic      | Weak Attack or Heal; does not Capture. Heal is 4, upgraded to 6 by Recovery.                                                                                                                                                      |
| Catapult   | Attack only at range 2–3; cannot attack after moving, Capture, retaliate at range 1, or advance after a kill. It may retaliate at range 2–3, using its ordinary Defense 0.5 retaliation force.                                    |
| Heavy      | Attack, Capture, Push a surviving melee target when the behind tile is legal. High HP lets it stay on the front line.                                                                                                             |
| Breacher   | Melee Attack with Breach; cannot attack after moving or Capture. Breach replaces the defender's ordinary terrain/city multiplier with 1×, but does not alter base Defense.                                                        |
| Juggernaut | Attack, Capture, Push; reward-only and unchanged in purpose.                                                                                                                                                                      |

### 7.3 Why the advanced prices are justified

- A **Catapult** costs 4 Fighters and safely deals approximately 4 damage per
  full-health shot to a Guard under a 4× city-wall multiplier. A Marksman deals
  approximately 1. It also exactly defeats a full-health open-ground Fighter,
  but cannot fire after moving and loses its attack while an enemy remains
  adjacent. It buys siege tempo, not general durability.
- A **Heavy** costs 3.5 Fighters, but carries twice their HP, 3.5/3.5 combat
  stats, and Push. It concentrates strength into one capacity slot.
- A **Breacher** costs 3 Fighters and can deal approximately 10 damage to a
  full-health Guard while ignoring its city multiplier. It pays for that burst
  with 10 HP, Defense 1, range 1, no Dash, and no Capture.

Capacity concentration matters: three or four Fighters need three or four city
slots, while one advanced unit needs one. That is a real part of advanced-unit
value and should be shown in balancing, not treated as free. The Scout's
increase from 3 to 4 Coins is also intentional: on large maps its sight,
village access, and route to globally public treasure chests are economic
effects, not free military utility.

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

| Improvement |  Cost | Limit/placement                                    | Proposed output                                                                        |
| ----------- | ----: | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Windmill    |     5 | One/city; touches Farm                             | +1 per orthogonally connected same-city Farm; cap 8.                                   |
| Sawmill     |     5 | One/city; touches Lumber Camp                      | +1 per orthogonally connected same-city Lumber Camp; cap 8.                            |
| Forge       | **6** | One/city                                           | **+3 per adjacent same-city Mine, maximum +18.**                                       |
| Stoneworks  | **6** | One/city                                           | **+2 per adjacent same-city Quarry, plus +2 per complete opposite pair, maximum +16.** |
| Workshop    |     4 | One/city; at least two adjacent basic types        | +1 per distinct adjacent friendly basic type; 2–4.                                     |
| Grand Works |     7 | One/city; at least three adjacent processor types  | +2 per distinct adjacent friendly processor type; 6 or 8.                              |
| Market      |     7 | One/city; at least two adjacent families           | +1 Coin/turn per family, plus +1 if capital-road connected; cap 5.                     |
| Barracks    | **6** | One/city; empty owned tile adjacent to city center | **+1 unit capacity; no population or Coin income.**                                    |

Windmill, Sawmill, Workshop, Grand Works, and Market retain their current
arithmetic. This isolates the mountain correction and avoids inflating the
already-attractive field/forest packages.

### 8.3 Mountain jackpot arithmetic

| Complex                          | Cost |    Proposed population | Current population | Proposed population/Coin |
| -------------------------------- | ---: | ---------------------: | -----------------: | -----------------------: |
| 1 Mine                           |    6 |                      4 |                  2 |                     0.67 |
| 4 Mines + Forge                  |   30 |       `4×4 + 4×3 = 28` |                 16 |                     0.93 |
| 1 Quarry                         |    5 |                      3 |                  1 |                     0.60 |
| 2 opposite Quarries + Stoneworks |   16 |   `2×3 + 2×2 + 2 = 12` |                  6 |                     0.75 |
| 4 cross Quarries + Stoneworks    |   26 | `4×3 + 4×2 + 2×2 = 24` |                 12 |                     0.92 |

The numbers intentionally permit a rare Mine/Forge city to jump several city
levels. The player has paid for Surveying, Mining, Metallurgy, four deposits,
an exact adjacency tile, and 30 Coins of construction. That should feel like a
spectacular payoff, not like an ordinary Farm cluster with fewer candidates.

The initial draft's uncapped `+4/Mine` Forge was not a safe baseline. Eight
adjacent Mines plus that Forge represented 64 population: enough to take a
fresh city to level 10 and create nine reward decisions over the complex's
construction. Under the revised limits, the absolute basic-plus-processor
maxima are 50 for eight Mines and a capped `+18` Forge, and 40 for eight
Quarries and a capped `+16` Stoneworks. Starting from no other population,
those totals reach levels 9 and 8 respectively. Because basic builds must drain
their own reward queues before construction continues, the final Forge can add
at most two queued levels after eight Mines; the final Stoneworks can add at
most two after eight Quarries. Exceptional mixed cities can still grow beyond
those levels through other families and Grand Works, but one processor cannot
create an uncontrolled modal/reward-unit cascade.

### 8.4 Conflict and capacity rules

| Rule     | Exact proposal                                                                                                                                                     | Reason                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Spoils   | With Drill, the first hostile Capture of a particular city by that player grants +2 Coins. Neutral villages grant nothing; recapture cannot pay that player again. | Adds bounded conflict income without discounting the fastest neutral-expansion opener or enabling recapture farming. |
| Barracks | With Quarrying, 6 Coins and one adjacent city tile buys +1 capacity; maximum one/city.                                                                             | Gives scarce Industry a terrain-independent military fallback without inventing population.                          |
| Pillage  | With Explosives, a unit on a hostile improvement may take a terminal action that destroys it and grants +1 Coin. It does not affect Roads or settlement centers.   | Destruction and population denial are already valuable; the payment stays deliberately secondary.                    |
| Disband  | With Recovery, remove a trainable owned unit for `floor(cost/2)` Coins. Reward-only units have no refund.                                                          | Lets an advanced economy recover part of obsolete roster investment.                                                 |

Spoils and Pillage are intentionally modest because conquest already transfers
cities, recurring income, capacity, and productive territory. The per-player,
per-city Spoils record is serialized and public to that player; it is the small
piece of additional state needed to prevent profitable city trading. Pillage
destroys each improvement at most once. Neither reward should make an already
winning war its own technology-and-replacement funding loop.

## 9. Branch value and parity analysis

### 9.1 Nominal economic surface

Assume 100 board cells, ignore settlement-center subtraction, and assume each
basic resource eventually reaches its matching processor. This is a comparison
tool, not a promise about one city's geometry.

| Package                         |           Nominal opportunities | Population represented by basics + proportional processor share |
| ------------------------------- | ------------------------------: | --------------------------------------------------------------: |
| Farming + Milling               |                   21.75 Fertile |                                       `21.75 × (2 + 1) = 65.25` |
| Hunting + Forestry + Sawmilling |     7.5 Game plus all 24 Forest |                        `7.5 Hunt + 24 Camp + 24 Sawmill = 55.5` |
| Mining + Metallurgy             |                       3.375 Ore |                                      `3.375 × (4 + 3) = 23.625` |
| Quarrying + Masonry             | 6.75 Stone, before pair bonuses |              `6.75 × (3 + 2) = 33.75`, plus opposite-pair value |
| Combined Industry               |       10.125 mountain resources |                                    **57.375 plus pair bonuses** |

This is an optimistic upper-bound comparison: it assigns every basic tile a
proportional processor share even though city borders, placement cells, cluster
breaks, and processor caps prevent universal coverage. It must not be read as
expected realized population. Under that ceiling, an Ore tile carries roughly
seven population of basic-plus-Forge value and a Stone tile at least five,
compared with three for Fertile Ground and roughly two to three for Forest
depending on Game. Industry's two forks together approach Settlement's nominal
economic surface despite operating on less than half as many resource markers.

Mining alone remains lower in global expected population than Farming, and the
settlement-footprint sample shows that most cities cannot use it at all before
expansion. Its path instead unlocks Heavy and produces unusually rapid local
level-ups when the geography appears. Quarrying has twice as many markers,
high pair upside, and the Barracks as an off-deposit payoff. The split is
therefore a choice between a rarer military/industrial jackpot and a more
available geometric stone/capacity engine, not two resource-only dead ends.

### 9.2 Whole-branch packages

| Branch     | Dependable economic value                                                                  | Military value                                              | Why enter it even on imperfect terrain                                                                    |
| ---------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Settlement | Most abundant permanent/Farm growth; Workshop and Grand Works turn mixed sites into growth | Craft unlocks a mobile, capacity-efficient Pikeman          | Gathering is already known; Craft still rewards mixed maps with few Fertile tiles                         |
| Wilds      | Game, cheap Camps, Sawmill clusters, clearing/replanting                                   | Marksman plus true range-3 Catapult; Fieldcraft mobility    | Forest is 24% of every generated board; artillery remains useful after local forests are developed        |
| Industry   | Very high population per rare deposit; two different jackpot geometries                    | Barracks adds capacity; Heavy concentrates front-line power | Surveying always provides Mountain access/vision; Barracks and Heavy work without a nearby deposit        |
| Mobility   | Roads save movement; Markets produce up to 5 recurring Coins per city                      | Scout exploration and Raider flanking/ZOC penetration       | Every accepted settlement has at least two nearby economic families, supporting eventual Market diversity |
| Warfare    | Bounded Spoils, Pillage, partial Disband refund, and replacement-cost savings              | Guard, Medic, Breacher, city fortification, recovery        | Its economy is conflict-driven and independent of resource generation                                     |

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
| Charged Raider → Pikeman  | Open ground                              |          8 / 4 | The Pike survives, but is not a second cheap Guard.                  |
| Charged Raider → Marksman | Open ground                              |         10 / 0 | An exposed Marksman is removed if the Raider finds a two-step lane.  |
| Charged Raider → Catapult | Open ground                              |         10 / 0 | Minimum range and Defense 0.5 make unsupported artillery vulnerable. |
| Fighter → Pikeman         | Open ground                              |          5 / 5 | Pike gains capacity density, not Guard-level staying power.          |
| Pikeman → Guard           | Open ground                              |          5 / 7 | Guard wins the static melee trade; Pike's advantage is Dash/Attack.  |
| Marksman → walled Guard   | 4× city defense                          |          1 / 0 | Safe chip damage alone is too slow for strong siege.                 |
| Catapult → walled Guard   | Range 2–3, 4× city defense               |          4 / 0 | Expensive artillery creates real pressure but needs four shots.      |
| Breacher → walled Guard   | Breach replaces multiplier with 1×       |         10 / 6 | Direct siege is faster but exposes the fragile attacker.             |

Nothing in those outcomes checks the defender's unit ID. If future stat tuning
changes the matchups, it does so through universal combat properties.

### 10.3 Position and combined arms

- ZOC from a cheap Fighter can close the route to a Catapult. Maneuver lets a
  Move-3 Raider bypass that stop, but occupancy and surviving defenders still
  matter.
- Catapult minimum range 2 means a unit that reaches adjacency shuts down its
  attack without a special “silence artillery” rule. It may move away, but
  cannot fire on that turn.
- A Marksman can move and fire but has shorter reach and lower siege damage; a
  Catapult has range 3 but cannot move and fire. Both remain useful.
- A Guard on a city maximizes defense but may allow artillery to set up outside
  retaliation range. Leaving the city to contest it gives up the multiplier.
- A Heavy can Push a screen away when geometry permits, opening a lane without
  dealing special anti-screen damage.
- Multiple Catapults are limited by an 8-Coin price, city capacity, a full turn
  of setup after every move, and the need for adjacent screens. Range 3 still
  ignores intervening units and terrain, so artillery concentration remains a
  specific playtest risk rather than a solved theorem.
- Roads increase the practical threat radius of reinforcements, but Forest,
  Mountain prerequisites, unexplored stops, and ZOC remain impartial checks.

## 11. Example pacing

### 11.1 Early game: one city

The capital produces 2 Coins per turn and starts with 5. The player cannot do
everything at once:

- **Settlement:** keep the starting branch advantage and spend 2 per Fruit for
  immediate growth. Farming is the reliable abundant-resource fork; Craft is
  the mixed-site fork and pairs its Workshop with a 4-Coin Pikeman, so the
  branch still has an off-terrain military purchase.
- **Wilds:** spend 5 on Hunting and 2 to Hunt one visible Game. The same branch
  leads to cheap timber or Marksmen; the terrain decides the fork.
- **Industry:** spend all 5 on Surveying for Mountain access, both resource
  reveals, and high-ground sight. A visible Ore/Stone concentration justifies
  the slower 7-Coin extraction follow-up.
- **Mobility:** spend 5 on Scouting and 4 on a Scout to contest villages and
  chests sooner. This is indirect economy through information and expansion.
- **Warfare:** spend 5 on Drill. A 3-Coin Guard stabilizes the capital; bounded
  Spoils begins only when the player captures a hostile city, so Drill does not
  subsidize the neutral-village race.

Each opening therefore has a board/economy story and an immediate military or
territorial story.

### 11.2 Midgame: three cities

At three cities, costs are 7/11/15. A new root-to-tier-3 path costs 33 Coins,
so the endpoint must serve more than one purpose.

- A forest empire that already owns Hunting and Forestry spends 15 on
  Sawmilling. It can immediately build a 5-Coin Sawmill where profitable and
  train 8-Coin Catapults for a fortified frontier. Economy and war share the
  same research purchase.
- An Ore-rich city spends 11 on Mining, then 15 on Metallurgy. Four 6-Coin
  Mines plus a 6-Coin Forge produce 28 live population and unlock a 20-HP Heavy.
  The 56-Coin research/build commitment is enormous, but its local city and
  army payoff are also enormous.
- A mixed empire can take Roads then Commerce. A 4-Coin/turn Market repays its
  7-Coin build in two start-turn incomes after placement, while the Road network
  shortens defensive reinforcement.
- A pressured empire can take Fortification for the Guard/Fighter city
  multiplier. An empire whose Stone sites are delayed can still justify
  Quarrying because a Barracks raises one city's capacity without another
  level; neither benefit depends on rolling the correct resource.

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
- Explosives adds both Breachers and 1-Coin Pillage pressure against a dense
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

- Add Pikeman and Catapult role IDs/rules; add `minimumRange` to role rules,
  authoritative Attack legality, public enumeration/preview, retaliation,
  threat projection, and AI range checks. Catapult uses the same minimum for
  attacks and retaliation.
- Add Quarrying's Barracks as a non-economic city improvement or a clearly
  separated capacity-building layer; define capture, destruction,
  serialization, and live capacity recomputation.
- Add Spoils, Pillage, and Disband commands/effects, exact event payloads,
  validation order, overflow behavior, and transaction ordering. Spoils needs
  deterministic per-city/per-player first-capture history in the new schema.
- Change Mine, Quarry, Forge, and Stoneworks costs/formulas and update previews.
- Maneuver's Raider Move 3 requires player-capability-aware effective role
  resolution. The current faction-only `effectiveRoleRuleV6(faction, role)`
  cannot represent a researched numeric role modifier safely; movement,
  threat, UI stat, combat-preview, and AI callers must share one new resolver.
- A Catapult can retaliate at range 2–3 under the ordinary rule and cannot at
  adjacency because of minimum range. Its Defense 0.5, rather than Attack 3.5,
  supplies retaliation force under the existing combat formula.
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
  closing, Pikeman/Guard distinction, Barracks capacity, first-capture Spoils,
  Pillage, Disband, and Maneuver's effective Raider Move 3.
- Rebalance economic research value so rare high-output extraction is not
  undervalued by raw target count. Passive/off-terrain unlocks such as
  Barracks and Spoils need explicit node utility; the current shortest-chain
  policy mainly values public economic target count and missing roles.
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

| Risk                                           | Proposed baseline                                                  | Safe first tuning range                            | Evidence to watch                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| One Mine causes excessive reward queues        | +4 pop for 6                                                       | +3 to +4                                           | Levels per Mine; reward modal frequency; Mining adoption     |
| Forge jackpot snowballs too hard               | +3/Mine, cost 6, processor cap 18                                  | cap 15–18; Mine base +3–4                          | Population from top 5% of Forges; reward choices from build  |
| Stone pairs overpay                            | +2/Quarry +2/pair, processor cap 16                                | cap 14–16; pair +1 to +2                           | Stoneworks distribution versus Windmill/Sawmill              |
| Industry still feels too map-dependent         | unchanged frequencies                                              | boost Surveying utility before altering generation | Root adoption on starts with zero owned mountain resources   |
| Catapult creates static artillery balls        | cost 8, A3.5, R2–3, D0.5, no Dash                                  | cost 8–9; A3–3.5; R3 fixed                         | Siege duration; Catapult survival with/without screens       |
| Raider still wins frontal trades               | cost4, A2, D1, Charge +1                                           | Charge +0.5–1; D1–1.5                              | Coin-normalized losses versus Fighter/Pikeman/Guard          |
| Maneuver makes conquest mobility oppressive    | Raider Move3 plus Scout/Raider ZOC freedom at tier 3               | keep Move2 or remove Scout ZOC freedom             | Captures/pillages per Raider; response time to breakthroughs |
| Pikeman overlaps Guard                         | Pike cost4, HP12, A2.5/D2/Dash; Guard cost3, HP15, A1.5/D3/no Dash | Pike A2–2.5 or HP 10–12                            | Pick rates by offensive/defensive posture                    |
| Spoils accelerates conquest snowball           | first hostile capture/city/player +2; neutral 0                    | +1 to +2                                           | Drill opening win rate and Coins earned before round 10      |
| Pillage is more valuable than occupation       | flat +1, terminal                                                  | 0 to +1                                            | Pillage frequency and net destroyed build cost               |
| Barracks bypasses city development too cheaply | cost6, +1 capacity, one/city, Quarrying                            | cost6–8                                            | Barracks adoption and units per city level                   |
| Scout makes Mobility a mandatory opener        | cost4, sight2, Move2, Capture                                      | cost4–5 or remove Capture only after evidence      | First-root adoption; chest/village captures by role          |
| Tier 3 remains too late                        | current `9 + 3(C-1)`                                               | coefficient 2–3                                    | First tier-3 round, match share with any tier-3 tech         |
| Advanced units crowd out Fighters              | 6–8 Coins and one slot                                             | +1 unit cost before stat nerf                      | Coin-normalized damage, captures, and survival by role       |

Recommended balance telemetry for seeded AI and human playtests:

- research adoption and first-purchase round by branch/node;
- Coins spent on research, improvements, and roles;
- eligible resource markers converted by family;
- city levels and income attributable to each economic family;
- combat damage, kills, survival turns, and captures per unit Coin;
- turns from first walled-Guard siege contact to capture;
- win rate conditional on first tier-3 node;
- top-decile Forge/Stoneworks values rather than averages alone.

## 14. Independent review

This section records the adversarial second pass. It is part of the proposal,
not evidence that the design has been playtested or approved.

### 14.1 Opportunity-cost audit

The starting technology makes Settlement structurally cheaper. The comparison
below uses the unchanged formula and assumes the player owns none of the other
nodes in the path.

| Research milestone                          | One city | Three cities |
| ------------------------------------------- | -------: | -----------: |
| Settlement tier 2 (Gathering already known) |        7 |           11 |
| Settlement tier 3 path                      |       16 |           26 |
| Another root                                |        5 |            7 |
| Another root plus tier 2                    |       12 |           18 |
| Another complete tier-3 path                |       21 |           33 |

That five-to-seven-Coin Settlement advantage is intentional starting-faction
identity, but it means Farming cannot also receive the branch's only unit and
remain an obviously neutral choice. The Pikeman therefore moved to Craft.
Farming is the reliable abundant-resource fork; Craft is the mixed-site plus
military fork.

Representative complete economic packages show why raw opportunity counts and
population-per-Coin must both be considered. “Entry” includes new research and
the displayed buildings at one city, but excludes resource harvests not named
in the row and any value from military unlocks.

| Package                                      | Entry Coins | Output                                | Comparison note              |
| -------------------------------------------- | ----------: | ------------------------------------- | ---------------------------- |
| 4 Farms + Windmill                           |          41 | 12 population                         | 0.29 population/entry Coin   |
| 6 empty-Forest Lumber Camps + Sawmill        |          44 | 12 population; Game harvests excluded | 0.27 population/entry Coin   |
| 4 Mines + Forge                              |          51 | 28 population + Heavy unlock          | 0.55 population/entry Coin   |
| 4 cross Quarries + Stoneworks                |          47 | 24 population + Barracks unlock       | 0.51 population/entry Coin   |
| Commerce path + one Road + two-family Market | at least 30 | normally 3 Coins/turn with Road bonus | 10 turns on named costs only |

The Market row assumes the two required family contributors and their unlocks
already exist; their costs are not included, so it is deliberately a lower
bound rather than a direct static-package comparison.

Research is shared across every city, so those ratios improve sharply with a
second complex; they are not literal investment recommendations. They do show
the intended identities: Settlement/Wilds are available and steady, Industry
is scarce but efficient, and Commerce compounds only after a large fixed
unlock/network cost. Warfare has no comparable peaceful package and must be
judged on avoided replacement, bounded conquest income, and combat tempo.

Military access is also asymmetric without being empty:

| Branch     | Earliest universal or off-resource military payoff at one city                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Settlement | Craft 7 + Pikeman 4; Gathering parent already known                                                                      |
| Wilds      | Hunting + Marksmanship 12 + Marksman 3                                                                                   |
| Industry   | Surveying 5 gives Mountain access/vision; Quarrying 12 enables a 6-Coin Barracks anywhere; Heavy is the 21-Coin endpoint |
| Mobility   | Scouting 5 + Scout 4; Raiding costs 12 before its 4-Coin Raider                                                          |
| Warfare    | Drill 5 + Guard 3                                                                                                        |

Industry is still the least dependable opening military branch, but it no
longer requires a usable Stone tile to obtain value from Quarrying. Wilds has
the strongest combined ranged roster, offset by two prerequisite paths,
fragility, and Catapult setup. Warfare remains the quickest direct defense.
These are hypotheses to test, not proof of equal win rate.

### 14.2 Findings incorporated

| Finding from independent pressure test                                                                                                                                                 | Revision made in this draft                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An uncapped eight-Mine Forge represented 64 population and a level-10 fresh city, with a long sequence of mandatory rewards.                                                           | Forge is now +3/Mine capped at +18. Stoneworks is capped at +16. Exact maximum levels and queue increments are stated in section 8.3.                                             |
| Whole-board resource frequency disguised severe settlement-local scarcity: 93.3% of sampled initial footprints had no Ore and 84.9% had no Stone.                                      | Added the 240-map/3,000-footprint audit; retained bold Mine/Quarry basics; gave Quarrying a Barracks that works without a deposit.                                                |
| Farming was already the cheap, abundant, free-parent path; adding the branch's unit there made Craft a likely dead fork.                                                               | Pikeman moved from Farming to Craft.                                                                                                                                              |
| The original Pikeman was almost a cheaper Guard with Dash and also an efficient Fighter replacement.                                                                                   | Pikeman is now cost 4, HP 12, Attack 2.5, Defense 2. Guard remains the cheaper 15-HP Defense-3 city specialist.                                                                   |
| Neutral Spoils discounted the strongest early snowball, while level-scaled hostile Spoils and +2 Pillage paid a winner for taking income and destroying it. Recapture could be farmed. | Neutral captures pay zero; hostile Spoils is +2 only on that player's first capture of that city; Pillage is +1 and terminal.                                                     |
| Attack 4.5, cost-7 range-3 artillery killed most field units while also dealing 6 to a walled Guard, making protected Catapult balls too efficient.                                    | Catapult is cost 8 and Attack 3.5. It deals 4 to the walled Guard, still kills an open Fighter, cannot move-and-fire, and is disabled at adjacency.                               |
| “Minimum range” was underspecified for retaliation and does not exist in the current role model.                                                                                       | Minimum range is explicitly 2 for both Attack and retaliation; ranged retaliation uses Defense 0.5 under the existing formula; every affected engine/public/AI surface is listed. |
| Maneuver's ZOC-only tier-3 benefit was difficult to justify at a five-city price of 21, especially after artillery created a need for a credible closing unit.                         | Maneuver also raises Raider Move to 3. Low Defense, Fighter/Guard screens, cost, and occupancy remain impartial checks.                                                           |
| A 3-Coin Scout could repay itself from a single public chest while accelerating village captures, exploration, and future resource knowledge.                                          | Scout now costs 4. Removing Capture is held as a stronger fallback only if adoption/win telemetry still shows a mandatory opener.                                                 |
| Existing Normal AI values visible economic targets and missing roles, not passive unlocks, per-city first-capture history, minimum range, or protected artillery formations.           | The implementation-impact section now requires explicit utility and tactical support; this redesign cannot safely reuse current weights or fixed role orders.                     |

### 14.3 Failure modes that remain live

- **Dominant opener:** Drill is the cheapest durable defense and Scouting still
  turns information into expansion. Craft is unusually cheap because Gathering
  is free. First-root adoption and win rate need seeded map stratification.
- **Dead forks:** Mining is knowingly conditional, and Milling, Masonry, and
  Grand Works can lack geometry. Their adoption must be compared only when a
  public eligible site exists; otherwise target-count averages will mislead.
- **Terrain lottery:** the higher Industry ratios compensate successful
  conversion, not an empire that never owns a deposit. Barracks supplies a
  floor, but a complete lack of Ore still delays Heavy's dual-use economics.
- **Turtling:** Walls plus Guard remain extremely strong. Catapult and Breacher
  give two geometrically different answers, while Heavy Push can remove a
  surviving defender when the behind tile is legal. Siege-duration telemetry
  must distinguish “defense matters” from an actual lock.
- **Ranged balls:** Marksmen move-and-fire at range 2; Catapults fire at range 3
  and ignore intervening terrain. Cost, capacity, setup, minimum range, and
  Raider penetration are checks, but concentrated ranged armies may still
  erase screens faster than the defender can close.
- **Mobility/conquest snowball:** Move-3 Maneuver Raiders can reach chests,
  villages, pillage targets, and artillery quickly. First-capture-only Spoils
  prevents cycling but does not remove the ordinary reward of taking a city.
- **Reward cadence:** even capped industrial complexes can generate consecutive
  choices. Measure choices per build and time blocked in the reward queue, not
  just final city level.

### 14.4 Explicit product alternatives

The following are real judgment calls rather than hidden recommendations:

1. **Industry fallback:** baseline is Quarrying → Barracks. If that association
   feels thematically forced, rename the node **Stonecraft**. Moving Barracks
   back to Fortification is mechanically simpler but reopens Industry's
   off-deposit-value problem and strengthens Warfare turtling.
2. **Pikeman identity:** baseline is a 4-Coin mobile attacker, not an anti-Raider
   flag. If testing still treats it as Fighter+, remove it rather than add a
   matchup bonus; a universal stationary “Brace” mechanic is the more complex
   fallback.
3. **Artillery lethality:** baseline Attack 3.5 produces 4 damage against a
   full-health walled Guard and 10 against an open Fighter. Attack 3 produces
   only 3 and 8 respectively; use that fallback if ranged armies dominate.
4. **Spoils state:** baseline uses per-player/per-city first-capture history.
   The simpler alternative is no capture payout at all. An unrestricted or
   level-scaled payout is not recommended because it permits cycling and
   compounds conquest.
5. **Maneuver payoff:** baseline gives Raider Move 3 plus ZOC freedom. Keeping
   Move 2 is the first rollback if Mobility dominates; Escape-after-attack is
   not recommended as an initial addition because it removes too much reply
   opportunity.
6. **Research scaling:** retain the existing formula for the first prototype.
   If eligible tier-3 nodes remain unused, lower only the tier-3 city
   coefficient from 3 to 2 before increasing already-potent unit stats.

## 15. Review questions

1. Is the proposed asymmetry acceptable—Settlement/Industry lead peaceful
   growth, Mobility compounds positioning/income, and Warfare earns through
   conflict—or should every branch have a direct population building?
2. Are Mine `+4 for 6` and Quarry `+3 for 5` sufficiently bold, or should a
   rare deposit be even more transformative?
3. Are the proposed Forge `+18` and Stoneworks `+16` processor caps high enough
   to preserve exceptional cities without producing excessive reward queues?
4. Does **Sawmilling → Sawmill + Catapult** fit the desired dual-use identity,
   or should the artillery unlock live on a differently named Wilds node?
5. Is range 3 with minimum range 2 the right Catapult geometry? In particular,
   should a Catapult retaliate weakly against another range-2/3 attacker under
   normal Defense-based retaliation, as proposed?
6. Is the cost-4, HP-12, Attack-2.5, Defense-2 Pikeman distinct enough from the
   cheaper, tougher, no-Dash Guard? If not, should it be removed or given a
   universal positional ability rather than a matchup bonus?
7. Are Spoils and Pillage the right economic identity for Warfare, or would a
   peaceful production/refund model be preferable despite weaker theme?
8. Should Quarrying's Barracks consume a map tile for +1 capacity, and does the
   pairing feel coherent enough, or should capacity remain exclusively tied to
   city level?
9. Should the current research-cost formula be frozen for the first playtest,
   or is the five-city tier-3 cost of 21 already known to be too punitive?
10. Is three trainable tier-3 units—Catapult, Heavy, Breacher—enough, or should
    Fieldcraft, Masonry, Maneuver, or Recovery also introduce a distinct
    advanced role?
11. Is Raider Move 3 plus hostile-ZOC freedom an appropriate tier-3 Maneuver
    payoff, or does that make Mobility's conquest tempo too strong?
12. For implementation sequencing, should a new ruleset wait for a complete
    Candy adaptation, or may an explicitly Original-only experimental ruleset
    ship first?

## 16. Approval boundary

Approval of this document should mean approval to write an authoritative new-
ruleset specification and implementation plan. It should **not** by itself mean
that these numbers are silently applied to Ruleset 6. Candy remains a separate
design exercise after the Original tree is accepted.
