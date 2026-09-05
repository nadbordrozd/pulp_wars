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
- ten nodes become explicitly dual-use instead of being narrow one-unlock
  purchases;
- Original replaces the indistinct Pikeman concept with a fragile **Envoy**
  whose delayed Defection threat can dislodge isolated premium defenders;
- the kill-chaining **Lancer** and concealed **Saboteur** join the Envoy as
  three high-variance counter-archetypes with explicit reply windows;
- the Catapult is true range-3 siege and shares **Sawmilling** with the
  Sawmill, echoing the desirable “economic processor plus military payoff”
  pattern without copying another game's complete tree;
- Heavy and Breacher remain tier-3 units, so the proposal has five distinct
  trainable tier-3 roles;
- the Raider remains the affordable single-target flanker, while the expensive
  Lancer punishes clusters of weak units through a bounded three-attack Pursuit
  sequence rather than an unlimited action reset;
- Ore and Stone frequencies stay unchanged, but Mines, Quarries, Forges, and
  Stoneworks become much more productive per opportunity; hard processor caps
  preserve exceptional cities without allowing one build to create an
  excessive reward queue;
- Craft, rather than already-attractive Farming, unlocks the Envoy, while
  Quarrying also unlocks the terrain-independent Barracks; these are deliberate
  fallbacks when the local map does not support a branch's resource action;
- Fieldcraft pairs forest economics with a covert city-disruption unit, and
  Maneuver pairs ZOC freedom with the roster's costly sweeper payoff;
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
9. **Spectacular abilities need visible exits.** A gridlock breaker may look
   overpowered in its intended situation, but its timing window, state cap,
   cost, exposure, and ordinary-stat weaknesses must leave a deterministic
   response. The answer is never a hidden unit-ID damage multiplier.

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

| Branch     | Tier | Technology        | Prerequisite           | Economic unlocks                                                                                | Military/utility unlocks                                                     |
| ---------- | ---: | ----------------- | ---------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Settlement |    1 | **Gathering**     | —; researched at start | Reveal Fruit/Fertile Ground; Harvest Fruit (2 Coins, +1 permanent population)                   | —                                                                            |
| Settlement |    2 | **Farming**       | Gathering              | Farm (5 Coins, +2 live population); connected-field visuals                                     | —                                                                            |
| Settlement |    3 | **Milling**       | Farming                | Windmill (5 Coins, +1 per connected Farm, cap 8)                                                | —                                                                            |
| Settlement |    2 | **Craft**         | Gathering              | Workshop (4 Coins, +1 per distinct adjacent basic family, 2–4)                                  | Train Envoy                                                                  |
| Settlement |    3 | **Grand Works**   | Craft                  | Grand Works (7 Coins, +2 per distinct adjacent processor, 6–8); Redevelop                       | —                                                                            |
| Wilds      |    1 | **Hunting**       | —                      | Hunt visible Game (2 Coins, +1 permanent population)                                            | —                                                                            |
| Wilds      |    2 | **Forestry**      | Hunting                | Lumber Camp (3 Coins, +1 live population); Clear Forest (+1 Coin)                               | —                                                                            |
| Wilds      |    3 | **Sawmilling**    | Forestry               | Sawmill (5 Coins, +1 per connected Lumber Camp, cap 8)                                          | Train Catapult                                                               |
| Wilds      |    2 | **Marksmanship**  | Hunting                | —                                                                                               | Train Marksman                                                               |
| Wilds      |    3 | **Fieldcraft**    | Marksmanship           | Replant Forest (4 Coins); preserves future Camp/Sawmill planning                                | Train Saboteur; Scout/Marksman gain Forest freedom; Marksman sight becomes 2 |
| Industry   |    1 | **Surveying**     | —                      | Reveal Ore/Stone                                                                                | Enter Mountain; +1 sight radius while on Mountain                            |
| Industry   |    2 | **Mining**        | Surveying              | Mine (6 Coins, +4 live population)                                                              | —                                                                            |
| Industry   |    3 | **Metallurgy**    | Mining                 | Forge (6 Coins, +3 per adjacent Mine, cap 18)                                                   | Train Heavy                                                                  |
| Industry   |    2 | **Quarrying**     | Surveying              | Quarry (5 Coins, +3 live population)                                                            | Barracks (6 Coins, maximum one per city, +1 unit capacity)                   |
| Industry   |    3 | **Masonry**       | Quarrying              | Stoneworks (6 Coins, +2 per adjacent Quarry and +2 per opposite pair, cap 16)                   | Stone-based population accelerates city capacity and reward access           |
| Mobility   |    1 | **Scouting**      | —                      | Earlier villages/chests/resources improve expansion choices                                     | Train Scout; sight 2; detect concealed units at radius 2                     |
| Mobility   |    2 | **Roads**         | Scouting               | Road (2 Coins); enables Market connection bonus                                                 | Half-cost orthogonal movement on connected friendly road/city network        |
| Mobility   |    3 | **Commerce**      | Roads                  | Market (7 Coins, +1 Coin/turn per adjacent family, plus 1 for capital-road connection; cap 5)   | Roads support reinforcement and flanking                                     |
| Mobility   |    2 | **Raiding**       | Scouting               | —                                                                                               | Train Raider; Charge after moving at least two path cells                    |
| Mobility   |    3 | **Maneuver**      | Raiding                | —                                                                                               | Train Lancer; Scout/Raider/Lancer ignore hostile ZOC                         |
| Warfare    |    1 | **Drill**         | —                      | Spoils: +2 Coins on a player's first hostile capture of each city; neutral villages pay nothing | Train Guard                                                                  |
| Warfare    |    2 | **Fortification** | Drill                  | —                                                                                               | Fighter/Guard receive 2× defense in an unwalled friendly city                |
| Warfare    |    3 | **Explosives**    | Fortification          | Pillage: destroy the hostile improvement beneath a unit for +1 Coin; terminal action            | Train Breacher; Breach ignores ordinary terrain/city defense multipliers     |
| Warfare    |    2 | **Medicine**      | Drill                  | Sustaining damaged units avoids replacement cost                                                | Train Medic; Heal adjacent owned unit by 4 HP                                |
| Warfare    |    3 | **Recovery**      | Medicine               | Disband a trainable unit for `floor(training cost / 2)` Coins                                   | Medic heals 6; fully idle units recover 6 HP in friendly territory           |

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

| Node       | Economic use                              | Military use                               |
| ---------- | ----------------------------------------- | ------------------------------------------ |
| Craft      | Rewards a mixed basic-economy site        | Unlocks Envoy                              |
| Sawmilling | Multiplies Lumber Camp clusters           | Unlocks Catapult                           |
| Fieldcraft | Replants future timber clusters           | Unlocks Saboteur; improves forest movement |
| Metallurgy | Multiplies rare Mines                     | Unlocks Heavy                              |
| Quarrying  | Converts Stone at high efficiency         | Unlocks terrain-independent city capacity  |
| Scouting   | Finds expansion/economic targets earlier  | Unlocks Scout                              |
| Roads      | Enables Market network                    | Accelerates reinforcement                  |
| Drill      | Pays conquest Spoils                      | Unlocks Guard                              |
| Explosives | Converts destruction into Pillage Coins   | Unlocks Breacher                           |
| Recovery   | Recovers part of obsolete-unit investment | Improves healing and recovery              |

This is more than the minimum “one economy plus one unit” bundling. It also
lets a player justify a node from the board position rather than from a fixed
build order.

## 7. Complete proposed Original unit roster

### 7.1 Stats and training

| Unit       | Unlock            | Cost |  HP | Attack | Defense | Move | Range | Minimum range | Move then primary action? |
| ---------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ------------: | ------------------------- |
| Fighter    | Start             |    2 |  10 |      2 |       2 |    1 |     1 |             1 | Yes                       |
| Scout      | Scouting (T1)     |    4 |  10 |    1.5 |       1 |    2 |     1 |             1 | Yes                       |
| Envoy      | Craft (T2)        |    6 |   7 |      0 |     0.5 |    1 |     2 |             1 | Yes, Defection only       |
| Marksman   | Marksmanship (T2) |    3 |  10 |      2 |       1 |    1 |     2 |             1 | Yes                       |
| Guard      | Drill (T1)        |    3 |  15 |    1.5 |       3 |    1 |     1 |             1 | No                        |
| Raider     | Raiding (T2)      |    4 |  10 |      2 |       1 |    2 |     1 |             1 | Yes                       |
| Medic      | Medicine (T2)     |    4 |  10 |    0.5 |     1.5 |    1 |     1 |             1 | Yes                       |
| Catapult   | Sawmilling (T3)   |    8 |  10 |    3.5 |     0.5 |    1 |     3 |             2 | No                        |
| Saboteur   | Fieldcraft (T3)   |    7 |  10 |      2 |       1 |    2 |     1 |             1 | Yes                       |
| Heavy      | Metallurgy (T3)   |    7 |  20 |    3.5 |     3.5 |    1 |     1 |             1 | Yes                       |
| Lancer     | Maneuver (T3)     |    9 |  12 |      3 |     1.5 |    3 |     1 |             1 | Yes                       |
| Breacher   | Explosives (T3)   |    6 |  10 |      4 |       1 |    1 |     1 |             1 | No                        |
| Juggernaut | City reward only  |    — |  40 |      4 |       4 |    1 |     1 |             1 | Yes                       |

These are base role stats. Technology does not modify a role's numeric stat;
Maneuver's movement benefit is now the new Move-3 Lancer rather than a hidden
Raider stat increase. The roster has five trainable tier-3 units with distinct
jobs and prices: Catapult 8, Saboteur 7, Heavy 7, Lancer 9, and Breacher 6.
None is merely Fighter with every number increased.

Roster audit: 13 unique roles comprise 12 trainable units (the starting
Fighter plus 11 technology unlocks) and one reward-only Juggernaut. The five
tier-3 trainable roles are the five named above; no node unlocks the same role
twice.

### 7.2 Abilities and restrictions

| Unit       | Abilities and restrictions                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fighter    | Attack, Capture. Its 2-Coin price is its late-game advantage.                                                                                                                                                                                           |
| Scout      | Attack, Capture, sight 2; detects concealed units at radius 2 rather than the ordinary radius 1; gains Forest freedom from Fieldcraft and ZOC freedom from Maneuver.                                                                                    |
| Envoy      | Defection after moving; no ordinary Attack, retaliation, Capture, or city-defense bonus. The delayed conversion requires one uninterrupted enemy reply and a reserved friendly capacity slot.                                                           |
| Marksman   | Attack at range 1–2, Capture, no advance after a ranged kill; Fieldcraft grants Forest freedom and sight 2.                                                                                                                                             |
| Guard      | Attack, Capture, cannot attack after moving; strongest cheap base defense and benefits from Fortification.                                                                                                                                              |
| Raider     | Attack, Capture; Charge adds +1 Attack only after an accepted move of at least two path cells. Maneuver removes hostile-ZOC termination but no longer changes Raider Move. Base Attack/Defense remain reduced from current Ruleset 6.                   |
| Medic      | Weak Attack or Heal; does not Capture. Heal is 4, upgraded to 6 by Recovery.                                                                                                                                                                            |
| Catapult   | Attack only at range 2–3; cannot attack after moving, Capture, retaliate at range 1, or advance after a kill. It may retaliate at range 2–3, using its ordinary Defense 0.5 retaliation force.                                                          |
| Saboteur   | Attack, Conceal, and Blackout after moving; no Capture. Blackout requires an unpicketed city: detection by a hostile unit makes the action illegal, while city-center detection alone only reveals the attempt. Attacking or using Blackout exposes it. |
| Heavy      | Attack, Capture, Push a surviving melee target when the behind tile is legal. High HP lets it stay on the front line.                                                                                                                                   |
| Lancer     | Attack, Capture, Pursuit, and Dash; Maneuver lets it ignore hostile ZOC. It can make at most three attacks in a turn and only a lethal unit attack continues the sequence.                                                                              |
| Breacher   | Melee Attack with Breach; cannot attack after moving or Capture. Breach replaces the defender's ordinary terrain/city multiplier with 1×, but does not alter base Defense.                                                                              |
| Juggernaut | Attack, Capture, Push; reward-only and unchanged in purpose.                                                                                                                                                                                            |

### 7.3 Gridlock-breaker state machines

The three new high-variance mechanics are commands and serialized state, not
informal exceptions. All coordinate lists and target choices use the engine's
canonical ordering; none consumes gameplay PRNG.

These are original implementations of portable jobs, not copies of another
game's units: Pursuit is a three-attack movement sequence rather than an
unlimited kill reset; Defection is delayed, interruptible, and capacity-backed
rather than an immediate attack replacement; Blackout suppresses one city's
income/actions and creates neither revolt units nor theft income.

#### Lancer: bounded Pursuit

1. A Lancer begins each turn with `attacksUsed = 0` and no Pursuit state. It
   may take its ordinary Move and melee Attack using Move 3 and Dash.
2. Every Attack increments `attacksUsed`. After one that kills a hostile
   **unit**, if the Lancer survives retaliation and the resulting count is 1
   or 2, it enters `PURSUIT_READY`: `attacked` clears and
   `3 - attacksUsed` attacks remain in the activation. Ordinary melee advance
   into the defeated unit's cell, its sight reveal, and all combat events
   resolve before Pursuit opens. A resulting count of 3 ends the activation.
   Killing a wall or structure never qualifies.
3. From `PURSUIT_READY`, the player may attack an adjacent visible hostile
   unit immediately, issue one `PURSUE` path of one or two entered cells and
   then attack, or `END_PURSUIT`. A Pursue path costs one point per cell; Roads
   do not discount it. Ordinary occupancy, Mountain access, Forest/unexplored
   termination, map bounds, and allied-territory rules apply. Maneuver's ZOC
   freedom applies because the Lancer is unlocked by that technology. A
   Pursue path may not enter a globally public treasure-chest cell, so a chain
   cannot consume PRNG, create a reward unit, or change capacity mid-sequence.
4. After a Pursue path the unit enters `PURSUIT_MOVED`; only an Attack against
   an adjacent visible hostile unit or `END_PURSUIT` is legal. Contact with a
   concealed occupant or its newly detected ZOC uses the observation-safe
   stop in section 7.4; the revealed unit may be attacked if adjacent, but the
   Lancer receives no replacement path. A nonlethal attack, death to
   retaliation, the third attack, or `END_PURSUIT` sets
   `attacked = handled = true` and clears Pursuit. It cannot ordinary Move,
   Capture, Promote, Heal, Pillage, attack a structure, collect a chest, or
   Wait between follow-up attacks. End Turn is unavailable until the player
   explicitly ends a still-open sequence.

Thus a Lancer can erase at most three exposed low-defense units, not an
unlimited army. Because a melee kill normally advances one cell before the
next two-cell Pursue, a next target can be as far as three Chebyshev cells from
the previous target; “spacing” means more than that or an occupied/durable
intervening screen, not merely two empty cells. Attack 3 kills a full-health
Defense-1 Marksman or Catapult but deals only about 8 to a full-health
Defense-2 Fighter. Each surviving defender retaliates normally. At 9 Coins,
the Lancer is poor value against Fighters, Guards, Heavies, walls, spaced
formations, and any screen it cannot kill; those properties create the counter
without an anti-role modifier.

#### Envoy: delayed Defection

1. `OFFER_DEFECTION` is a terminal primary action after an optional ordinary
   Move. It targets one visible hostile unit at Chebyshev range 1–2 with no
   existing Defection mark and names one owned city with an unreserved capacity
   slot. The slot becomes reserved immediately. The action deals no damage and
   causes no retaliation.
2. The mark stores source unit, target unit, initiating player, recorded target
   owner, reserved home city, `offeredAtCommandIndex`, and phase
   `WAITING_FOR_REPLY`. Offering explicitly reveals the Envoy entity and its
   current coordinate—but no surrounding terrain—to the recorded target owner
   and that owner's formal allies until the mark ends. The initiator and target
   owner receive the full mark. A third party that can see only one endpoint
   receives only a status badge on that endpoint; it receives the linked unit
   ID and coordinate only while both endpoints are independently visible.
3. The **first accepted `END_TURN` by the recorded target owner after the
   offer** is the reply boundary, whether that turn occurs later in the current
   round or in the next round. The owner receives that turn's normal Start Turn
   income, activation reset, pending-choice flow, unit commands, and End Turn
   recovery. Immediately after recovery and before the next seat starts, a
   surviving mark changes to `ARMED`. This guarantees exactly one complete
   target-owner activation window and never grants an extra action.
4. An `ARMED` mark resolves at the initiating player's first subsequent Start
   Turn. That Start Turn first resets units the player already owned, then
   resolves armed marks in ascending mark ID, then reveals from successful
   conversions and awards income. Because the target changes owner **after**
   the reset, the converted unit is explicitly exhausted for that whole turn:
   Capture is false and every activation flag, including `handled`, is true.
5. At both the arming and resolution boundaries, the source and target must be
   alive, the source must still belong to the initiator, the target must still
   have its recorded hostile owner, both must be within range 2, and the
   initiator must still own the reserved city and slot. Failure clears the mark
   and reservation. Moving either unit out of range, killing, converting, or
   pushing the Envoy, changing the target's ownership, capturing its reserved
   city, or reducing that city's capacity can break the attempt.
6. On success, the target keeps role, current HP, kills, and veteran status but
   changes owner and home city and counts against the reserved city's capacity.
   It reveals terrain from its current cell by its normal sight rules but
   transfers none of its former owner's exploration. Its old home city frees
   its former counted assignment. Ownership-dependent states are then
   normalized: any Defection sourced by that unit cancels, open Pursuit clears,
   and Capture remains false; role-owned neutral timers such as Blackout
   cooldown persist under their ownership-safe representation.

Every hostile role, including a reward-only Juggernaut, is eligible. That is
the Envoy's deliberately alarming payoff, but even a Juggernaut can step away
or kill the Defense-0.5, 7-HP Envoy during the guaranteed reply. A converted
reward unit is re-homed against the reserved city rather than using reward
placement's permission to create an over-capacity state. Multiple Envoys cannot
mark one target or reserve one slot. A city defender may abandon its fortified
cell to move out of range; mobile attackers can instead close and kill the
Envoy. Walls and defense
multipliers do not block an offer because no combat occurs. As with current
ranged combat, intervening units and terrain do not create line of sight; the
target must nevertheless be present in the acting player's public view.

The timing is independent of player count. In every row below the target gets
exactly one full Start/income/action/recovery window after the offer; extra
seats change only how many third parties can disrupt the setup.

| Target seat relative to initiator | Reply boundary                                                     | Resolution boundary                                                 |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Later in the current round        | Target's End Turn in the offer round, after recovery               | Initiator's Start Turn in the next round, before income             |
| Earlier in turn order             | Target's End Turn in the next round, after its complete activation | Initiator's later Start Turn in that same next round, before income |

| Player count | Complete target activations before resolution | Other-player activations before resolution | Consequence                                                                 |
| -----------: | --------------------------------------------: | -----------------------------------------: | --------------------------------------------------------------------------- |
|            2 |                                             1 |                                          0 | Pure source-versus-target reply; no third-party rescue or interference      |
|            3 |                                             1 |                                          1 | One third party acts either before arming or between arming and resolution  |
|            4 |                                             1 |                                          2 | Both third parties act once somewhere in the same offer-to-resolution cycle |

A pending mandatory choice merely delays the target's accepted End Turn and
therefore delays arming; it never shortens the reply. Initiator or target
elimination, source/target removal, or a relationship/ownership change cancels
the mark immediately. When several marks resolve at one Start Turn, mark-ID
order is also the transaction order: each valid reservation is consumed by its
own target, and every cancelled reservation is released before the next mark
is checked.

Converting a city occupant does not transfer or Capture the city. The unit is
now hostile to that city, so friendly-city, Fortification, and Walls defense
are recalculated and normally disappear; it may besiege the city until removed,
but its exhausted state prevents Capture on the conversion turn. This
secondary denial is part of Defection's premium-target payoff and must be
included in its preview and valuation.

A converted unit may be targeted by a later new offer, but conversion never
chains automatically and confers no immunity bypass. The later controller must
provide another Envoy, another reserved slot, and another complete target-owner
reply. Even when that offer is made at the first possible opposing turn, the
current owner receives one normal activation with the unit before a
reconversion can resolve. This permits costly tug-of-war without instant
ping-pong or a single command cascading through multiple owners.

#### Saboteur: concealed Blackout

1. **Conceal** omits an enemy Saboteur from a player's view unless it is within
   Chebyshev distance 1 of one of that player's units or city centers, within
   distance 2 of one of that player's Scouts, or has an exposure marker visible
   to that player. Formal allies share those detections. Owners always see
   their own Saboteurs. Exploration remains permanent terrain knowledge;
   Conceal affects only the unit entity, not terrain or globally public
   aggregate standings.
2. `BLACKOUT_CITY` is a terminal primary action after an optional Move. It
   targets an adjacent hostile city with no pending/active Blackout and no
   recovery protection. At validation time the Saboteur must not be detected
   by any hostile **unit**; detection by the target city center reveals the
   Saboteur but does not itself prevent the action. Consequently one garrison
   on the city center blocks Blackout, a nearby ordinary unit covers part of
   the approach ring, and a center Scout covers all of it. The pending effect
   is visible to source and target owners; another player sees it only while
   that city is visible. The Saboteur becomes exposed to the target owner and
   its allies through the end of the owner's next turn. It stores
   `blackoutEligibleRound = actionRound + 3`; it is illegal in rounds
   `actionRound + 1` and `actionRound + 2` and becomes legal in round
   `actionRound + 3`, even if Defection changes its owner.
3. At the target owner's next Start Turn, before income, Blackout suppresses
   up to 3 Coins of that city's calculated income rather than subtracting an
   existing treasury. Through that turn the city cannot Train, and its
   territory cannot take economic build, clear, replant, or Redevelop actions.
   Existing population, capacity, rewards, defenses, Roads, units, and
   improvements continue to function. The effect clears at End Turn.
4. When the affected turn ends, the city enters `BLACKOUT_RECOVERY`. It must
   complete one later owner turn with normal income and actions before another
   Blackout can be planted; the protection clears after that unaffected End
   Turn. Pending, active, and recovery state is attached to the city entity.
   Capturing the city cancels a pending or active effect but leaves/starts
   recovery protection until the new owner completes one unaffected turn, so
   capture and recapture cannot reset the lockout. Blackout gives the
   Saboteur's owner no Coins, does not damage or spawn units, and cannot stack.
   The per-city recovery window prevents alternating Saboteurs from denying
   every owner turn, while the per-unit round cooldown prevents one infiltrator
   from rotating across cities continuously.

City-center detection means the Saboteur is revealed as soon as it reaches
Blackout range. The action still lands before an **unpicketed** city's owner
can reply, but any detecting hostile unit makes Blackout illegal and the
7-Coin attacker remains exposed to nearby mobile or ranged units. Empty rear
cities are therefore valid targets; a city-center garrison is a simple hard
counter, and a Scout is the strongest proactive picket. Attacking instead uses
ordinary combat and exposes the Saboteur to the target owner and its allies
through the end of that owner's next turn without creating Blackout. Other
players still apply detection independently.

### 7.4 Shared interaction contract for the new mechanics

| System                   | Exact interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fog and hidden occupancy | Defection targets must be visible when offered and never reveal later hidden target movement. Public paths treat an undetected Saboteur and its ZOC as absent. Authority resolves an accepted path stepwise: entry toward its occupied cell stops on the legal prefix before it; entry into its newly detected hostile ZOC stops on the entered cell unless the mover ignores ZOC. Either contact consumes Move/Pursue, reveals the Saboteur to the detecting side, and never returns a hidden-specific rejection. Ordinary and Pursue paths use the same rule.                                                                                                                                                                  |
| Detection                | Enemy units/city centers detect at radius 1 and Scouts at radius 2, regardless of terrain or Walls; formal allies share detection. Attacks, Defection, and other entity-targeted commands cannot target a concealed unit. A hostile unit's detection also blocks Blackout; city-center detection alone does not. Concealment is recalculated per viewer, so one side's detection does not globally reveal it. Blind area/displacement contact may reveal a unit on actual interaction but may not make it targetable beforehand.                                                                                                                                                                                                 |
| Cities and Walls         | Lancer and ordinary attacks use normal defense and wall rules. Defection ignores multipliers and does not capture its occupied city; after conversion, all defense is recalculated for the new owner. Blackout ignores multipliers and leaves Walls/fortification intact. City ownership change cancels pending/active denial but preserves/starts the one-unaffected-turn recovery state.                                                                                                                                                                                                                                                                                                                                       |
| Retaliation              | Every Lancer strike receives ordinary retaliation when legal. Defection and Blackout are non-Attack terminal actions and cause none. Envoy Attack 0 means it never retaliates; Saboteur retaliates normally while revealed or concealed because concealment does not alter authoritative combat.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ZOC and Roads            | Envoy and Saboteur use ordinary ZOC and Road movement. Scout, Raider, and Lancer ignore hostile ZOC with Maneuver. Roads affect an ordinary Lancer move but never its two-cell Pursue budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Capacity and training    | Training all three requires one free city slot. A pending Defection reserves a second slot for its target; public capacity queries subtract owned reservations, and loss of that exact reservation cancels resolution. Blackout blocks training only for the affected turn. Pursuit cannot collect chests and therefore never creates units or capacity.                                                                                                                                                                                                                                                                                                                                                                         |
| Capture and rewards      | Lancer has Capture but cannot use it during Pursuit; Envoy and Saboteur lack Capture. Defection never captures a city or grants capture/Spoils income. Converted reward units are allowed but counted; no unit can be converted during placement, and occupied reward spawn selection remains unchanged. Blackout cannot create reward choices.                                                                                                                                                                                                                                                                                                                                                                                  |
| Healing and status       | Healing does not clear Defection, exposure, cooldown, Pursuit, or Blackout. Source or target death/removal immediately cancels its Defection mark and releases the reservation; a planted Blackout persists after Saboteur death. City ownership change cancels pending/active Blackout but preserves one unaffected-turn recovery. Dead Lancers lose Pursuit with their entity. Start/End Turn and round ordering, not healing, advances timers. Converted HP is not restored.                                                                                                                                                                                                                                                  |
| Replay and schemas       | Pursuit mode/counter, Defection reservation/phase plus offer command index, per-view exposure, round-based Saboteur cooldown, and city Blackout/recovery are authoritative serialized fields or entities. Commands and canonical events carry explicit IDs/coordinates and deterministic timers. Defection emits offered, armed/cancelled, and resolved/cancelled facts at exact boundaries. Canonical replay/save/checkpoints remain omniscient reproduction artifacts; live player-facing events require a viewer projection.                                                                                                                                                                                                  |
| Public observation       | `PlayerView.units`, stat/selection/threat/target queries, movement reachability, combat previews, AI candidates/tuples, animations, notices, and ordinary logs omit undetected entity/location data. Guessed hidden IDs receive the same generic invalid-target result as empty/unseen IDs. Globally public leaderboard unit totals may still include Saboteurs, revealing roster quantity but never role or location. Push/other blind displacement previews report concealed-occupancy uncertainty; actual blocked contact reveals only to sides whose units then detect it. Debug export, raw save, canonical replay, and state hashes are explicitly omniscient and must be labelled/withheld from competitive live viewing. |
| AI and UI targeting      | Legal-action queries expose Pursue/End, Defection plus eligible home-city slots, and Blackout only to the acting player. AI evaluates bounded sequences, reserved capacity, the target's guaranteed reply, detection/picket risk, recovery protection, and lost city income. UI previews show reply/resolution boundaries, break conditions, besieging-on-conversion, attacks remaining, Pursuit reach including advance, detection versus Blackout-blocking unit detection, exposure, eligible round, capped loss, and city recovery without exposing hidden endpoints.                                                                                                                                                         |

### 7.5 Why the advanced prices are justified

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
- A **Lancer** costs 4.5 Fighters. Its first strike is only slightly stronger
  than a Raider's Charge, and it cannot begin a chain through a healthy Fighter.
  The premium buys a three-attack ceiling when the opponent clusters fragile
  or wounded units.
- A **Saboteur** costs 3.5 Fighters for Fighter-level Attack, half the Defense,
  no Capture, a round-based two-turn cooldown, and a payload that fails while a
  hostile unit detects it. Its value is positional economic denial against an
  unpicketed city, not efficient front-line combat or a guaranteed tax on every
  city it can reach.
- An **Envoy** costs 3 Fighters despite having no Attack and only 7 HP. It pays
  off only when an expensive target cannot spend its reply moving away or
  removing the Envoy; the capacity reservation prevents free over-capacity
  conversion.

Capacity concentration matters: three or four Fighters need three or four city
slots, while one advanced unit needs one. That is a real part of advanced-unit
value and should be shown in balancing, not treated as free. The Scout's
increase from 3 to 4 Coins is also intentional: on large maps its sight,
village access, and route to globally public treasure chests are economic
effects, not free military utility.

### 7.6 Cross-faction archetype charter

Future factions should retain the battlefield questions in the **Invariant
job** column. They do not need to copy Original's names, art, exact stats, or
mechanic text. A faction may combine two jobs in one unit or split one job
across two units only if its complete roster still supplies the listed pressure
and counter-pressure at a comparable research/price horizon.

| Portable archetype | Original expression | Invariant job                                                                                               | Faction-specific freedom                                                                                            |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Generalist         | Fighter             | Cheap capture-capable body; efficient screen and baseline trade                                             | Weapon, movement rider, exact 2/2 stats                                                                             |
| Explorer           | Scout               | Early sight/mobility that converts information into expansion and supplies timely anti-concealment coverage | Detection radius may live here or on another comparably early unit/rule; terrain affinity, Capture, combat strength |
| Defender           | Guard               | Cheap high-defense occupation that makes frontal melee inefficient                                          | Fortify rule, HP/Defense mix, city affinity                                                                         |
| Basic ranged       | Marksman            | Mobile short-range pressure with low durability                                                             | Range pattern, move-fire rule, damage curve                                                                         |
| Flanker            | Raider              | Affordable fast single-target closer that punishes exposed ranged units                                     | Charge, escape, road/terrain interaction                                                                            |
| Support            | Medic               | Sustains allies while sacrificing direct offense and tempo                                                  | Heal, cleanse, shield, or another bounded support action                                                            |
| Artillery          | Catapult            | Expensive long-range siege pressure with a close-range/setup weakness                                       | Minimum range, reload, line of fire, projectile theme                                                               |
| Anchor             | Heavy               | Capacity-efficient durable front-line power that displaces or survives                                      | Push, armor, HP pool, movement limitation                                                                           |
| Direct siege       | Breacher            | High-risk adjacent answer to extreme static defense                                                         | Defense stripping, structure attack, positional setup                                                               |
| Sweeper            | Lancer              | Costly mobility plus bounded repeat actions that punish weak-unit concentration                             | Chain trigger, cap, fatigue, route rules; never a unit-ID damage bonus                                              |
| Controller         | Envoy               | Fragile delayed threat to an isolated premium unit, forcing movement or rescue                              | Conversion, disable, displacement, or possession with a guaranteed reply                                            |
| Infiltrator        | Saboteur            | Situational hidden access to neglected rear areas and bounded city/economic disruption                      | Detection model, theft/denial payload, cooldown, reveal condition; never removes the roster's timely picket counter |
| Super-unit         | Juggernaut          | Rare reward-only strategic concentration that ordinary rosters must answer                                  | Reward source, scale, movement, signature action                                                                    |

The Sweeper, Controller, and Infiltrator are high-variance jobs, not promises
that every faction receives Pursuit, Defection, and Blackout. Their shared
contract is the tactical question they pose: do not mass fragile units, do not
leave an expensive immobile unit unsupported, and do not neglect the rear. A
future faction's answer may look radically different while preserving those
three checks and equally legible counterplay.

Portability includes the **counter contract**, not only the spectacular side
of each role:

| Job         | Invariant safety envelope                                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sweeper     | Finite repeat-action ceiling; a durable ordinary screen or adequate spacing ends the sequence; no action, promotion, loot, or structure side door resets the ceiling.             |
| Controller  | Full target-owner reply after a visible telegraph; fragile/costly source; deterministic cancellation; no capacity bypass; ownership change never grants an immediate action.      |
| Infiltrator | Early universal or comparable detector/picket access; disruption fails against an actively garrisoned target; per-unit cooldown and per-target recovery prevent permanent denial. |

A future faction may answer concealment with a watchtower, aura, or different
early unit instead of a Scout, for example, but it may not ship an Infiltrator
into a roster whose opponents lack a practical pre-impact counter. Likewise,
“bounded” does not require exactly three attacks or exactly one unaffected city
turn; it requires a visible finite ceiling that survives all faction-specific
interactions.

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

Eight adjacent Mines plus the rejected uncapped `+4/Mine` Forge represented 64
population: enough to take a fresh city to level 10 and create nine reward
decisions over the complex's construction. Under the revised limits, the
absolute basic-plus-processor maxima are 50 for eight Mines and a capped `+18`
Forge, and 40 for eight Quarries and a capped `+16` Stoneworks. Starting from
no other population, those totals reach levels 9 and 8 respectively. Because
basic builds must drain their own reward queues before construction continues,
the final Forge can add at most two queued levels after eight Mines; the final
Stoneworks can add at most two after eight Quarries. Exceptional mixed cities
can still grow beyond those levels through other families and Grand Works, but
one processor cannot create an uncontrolled modal/reward-unit cascade.

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
| Settlement | Most abundant permanent/Farm growth; Workshop and Grand Works turn mixed sites into growth | Craft unlocks the high-leverage but answerable Envoy        | Gathering is already known; Craft still rewards mixed maps with few Fertile tiles                         |
| Wilds      | Game, cheap Camps, Sawmill clusters, clearing/replanting                                   | Marksman, range-3 Catapult, and covert Saboteur             | Forest is 24% of every board; artillery and disruption remain useful after forests are developed          |
| Industry   | Very high population per rare deposit; two different jackpot geometries                    | Barracks adds capacity; Heavy concentrates front-line power | Surveying always provides Mountain access/vision; Barracks and Heavy work without a nearby deposit        |
| Mobility   | Roads save movement; Markets produce up to 5 recurring Coins per city                      | Scout/Raider mobility plus Lancer anti-mass breakthrough    | Every accepted settlement has at least two nearby economic families, supporting eventual Market diversity |
| Warfare    | Bounded Spoils, Pillage, partial Disband refund, and replacement-cost savings              | Guard, Medic, Breacher, city fortification, recovery        | Its economy is conflict-driven and independent of resource generation                                     |

Parity does not mean identical unlock counts. Warfare should retain the widest
combat toolkit because its peaceful map economy is weakest. Settlement and
Industry need fewer roles because their city-growth ceilings are much higher.

### 9.3 Unit-unlock distribution

| Branch     | Proposed unit unlocks        | Count |
| ---------- | ---------------------------- | ----: |
| Settlement | Envoy                        |     1 |
| Wilds      | Marksman, Catapult, Saboteur |     3 |
| Industry   | Heavy                        |     1 |
| Mobility   | Scout, Raider, Lancer        |     3 |
| Warfare    | Guard, Medic, Breacher       |     3 |

No branch is now militarily empty. The remaining asymmetry is deliberate and
offset by economic scope rather than by making every branch contain the same
number of units.

## 10. Emergent counterplay

### 10.1 Intended pressure loop

```text
Fighter / Guard screen
    absorbs ordinary melee and blocks lanes
        ↓ invites
Marksman / Catapult fire
    attacks without ordinary melee retaliation
        ↓ invites
Raider / Lancer breakthrough
    closes quickly; Lancer punishes a clustered fragile back line
        ↓ invites
spaced Fighters, Guards, Heavies, and overlapping retaliation
```

Envoy and Saboteur attack overreliance from different axes. An isolated premium
anchor must spend its reply escaping or removing the Envoy. An army that
commits every unit to one front leaves rear cities open to Blackout. Breacher
remains the risky adjacent solution to extreme defense, while Heavy is the
capacity-efficient front-line anchor and positional displacer. None replaces
ordinary screens, spacing, detection, and reserve units.

### 10.2 Full-health illustrative exchanges

These use proposed stats, ordinary current combat arithmetic, and no promotion.
“Damage” is defender damage / attacker retaliation. A killed defender does not
retaliate.

| Attack                    | Context                                  | Approx. damage | Meaning                                                                 |
| ------------------------- | ---------------------------------------- | -------------: | ----------------------------------------------------------------------- |
| Fighter → Raider          | Open ground                              |          6 / 2 | A 2-Coin Fighter trades efficiently into the 4-Coin flanker.            |
| Charged Raider → Fighter  | Open ground                              |          8 / 4 | Raider hurts but does not erase its screen in one attack.               |
| Charged Raider → Guard    | Guard on ordinary 1.5× defensive terrain |          5 / 8 | Charging a prepared defensive body is a losing exchange.                |
| Charged Raider → Marksman | Open ground                              |         10 / 0 | An exposed Marksman is removed if the Raider finds a two-step lane.     |
| Charged Raider → Catapult | Open ground                              |         10 / 0 | Minimum range and Defense 0.5 make unsupported artillery vulnerable.    |
| Lancer → Marksman         | Open ground                              |         10 / 0 | A kill opens Pursuit; clustering up to two more fragile units is risky. |
| Lancer → Fighter          | Open ground                              |          8 / 4 | A healthy Fighter stops Pursuit and extracts ordinary retaliation.      |
| Fighter → Lancer          | Open ground                              |          5 / 3 | Cheap bodies trade efficiently into the 9-Coin sweeper.                 |
| Charged Raider → Envoy    | Open ground                              |          7 / 0 | A mobile attacker removes the controller before Defection resolves.     |
| Marksman → walled Guard   | 4× city defense                          |          1 / 0 | Safe chip damage alone is too slow for strong siege.                    |
| Catapult → walled Guard   | Range 2–3, 4× city defense               |          4 / 0 | Expensive artillery creates real pressure but needs four shots.         |
| Breacher → walled Guard   | Breach replaces multiplier with 1×       |         10 / 6 | Direct siege is faster but exposes the fragile attacker.                |

Nothing in those outcomes checks the defender's unit ID. If future stat tuning
changes the matchups, it does so through universal combat properties.

### 10.3 Position and combined arms

- ZOC from a cheap Fighter can close the route to a Catapult. Maneuver lets a
  Raider or Lancer bypass that stop, but occupancy and surviving defenders
  still matter.
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
- A Lancer can devastate three Marksmen/Catapults along a reachable lane, yet
  one healthy Fighter ends the sequence because Attack 3 does not kill Defense
  2 from full HP. Because kill advance plus Pursue can bridge three Chebyshev
  cells between targets, safe spacing must exceed that reach or include an
  occupied/durable screen.
- A Guard or Juggernaut threatened by Defection sees the Envoy and can retreat out of range,
  close and attack if it has move-then-attack, accept allied help, or allow a
  Push to separate the units. An unsupported static defender may have to vacate
  the position it was meant to hold, which is the intended gridlock break. If
  it remains on a city and converts, it loses friendly city/Wall defense and is
  exhausted, giving the former owner a normal combat reply despite the siege.
- Saboteur detection is supplied at radius 1 by any unit and at radius 2 by a
  Scout. Any hostile unit detection makes Blackout illegal, so a center
  garrison is a hard counter rather than merely revenge after the denial lands.
  Blackout cannot remove existing defenses and a city must receive one normal
  turn between effects, so it disrupts neglected reinforcement/development
  rather than permanently locking a defended city.
- Roads increase the practical threat radius of reinforcements, but Forest,
  Mountain prerequisites, unexplored stops, and ZOC remain impartial checks.

## 11. Example pacing

### 11.1 Early game: one city

The capital produces 2 Coins per turn and starts with 5. The player cannot do
everything at once:

- **Settlement:** keep the starting branch advantage and spend 2 per Fruit for
  immediate growth. Farming is the reliable abundant-resource fork; Craft is
  the mixed-site fork and pairs its Workshop with a 6-Coin Envoy. That unit is
  a positional threat, not a replacement for starting Fighters.
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
- An empire facing protected Catapults can buy Maneuver for ZOC freedom and a
  9-Coin Lancer. The Lancer is wasteful against the Guard screen but threatens
  a decisive Pursuit if a Raider or Heavy first opens a lane.
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
- Fieldcraft adds Saboteurs whose Blackout punishes undefended rear production,
  but a 7-Coin infiltrator that finds every city garrisoned or within a Scout's
  detection radius cannot use its payload and is a failed purchase.

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

- Add Envoy, Catapult, Saboteur, and Lancer role IDs/rules; add `minimumRange`
  to role rules, authoritative Attack legality, public enumeration/preview,
  retaliation, threat projection, and AI range checks. Catapult uses the same
  minimum for attacks and retaliation.
- Replace the single-attack activation assumption with explicit bounded
  Pursuit state and `PURSUE`/`END_PURSUIT` commands. Combat events must state
  whether a unit kill opened another attack; ordinary movement cannot be
  smuggled into a Pursuit sequence. Pursue has a separate two-point budget,
  forbids public chest cells, uses contact-safe hidden occupancy/ZOC stops, and
  cannot be bypassed by Promote, Wait, End Turn, or faction specials.
- Add phased Defection marks and capacity reservations. The recorded target
  owner's first accepted End Turn after the offer arms the mark after recovery;
  the initiator's first subsequent Start Turn resolves it after existing-unit
  activation reset and before income. Current city capacity queries must count
  reservations, conversion must re-home converted units transactionally, and
  every failure path must release the reserved slot. Unlike reward placement,
  conversion cannot create a new over-capacity state.
- Add per-view Conceal/detection, contact-safe movement into concealed
  occupancy and newly detected ZOC, exposure/round-cooldown state, Scout
  radius-2 detection, unit-detection Blackout prevention, and city
  Blackout/recovery state. Current v6 makes every unit on a permanently
  explored cell visible, so simply filtering the view is insufficient:
  movement validation/enumeration, blind displacement, generic rejection
  detail, combat/ability targets and previews, stats/selections/threats,
  leaderboard aggregates, AI inputs/tuples, live event projection, animation,
  notices, logs, reconnect, and spectator/debug/replay access all require an
  explicit observation-safe rule.
- Add Quarrying's Barracks as a non-economic city improvement or a clearly
  separated capacity-building layer; define capture, destruction,
  serialization, and live capacity recomputation.
- Add Spoils, Pillage, and Disband commands/effects, exact event payloads,
  validation order, overflow behavior, and transaction ordering. Spoils needs
  deterministic per-city/per-player first-capture history in the new schema.
- Change Mine, Quarry, Forge, and Stoneworks costs/formulas and update previews.
- Maneuver no longer changes Raider Move, avoiding a researched numeric role
  modifier that the current faction-only
  `effectiveRoleRuleV6(faction, role)` cannot represent. Its ZOC capability
  must include the new Lancer everywhere movement and threat are computed.
- A Catapult can retaliate at range 2–3 under the ordinary rule and cannot at
  adjacency because of minimum range. Its Defense 0.5, rather than Attack 3.5,
  supplies retaliation force under the existing combat formula.
- Preserve deterministic integer arithmetic and no new gameplay PRNG.
- Define canonical boundaries. End Turn performs recovery, validates and arms
  eligible Defections, emits their events, then advances the active seat. Start
  Turn resets activations for units already owned by the incoming player,
  resolves that player's armed Defections in mark-ID order, reveals from
  successful conversions, evaluates round-based Saboteur eligibility, triggers
  Blackout, and only then calculates income. End Turn clears an active
  Blackout into recovery or clears recovery after one unaffected owner turn.
  Converted units are inserted exhausted after reset. Pending city rewards
  still block unrelated commands and cannot be bypassed by these automatic
  transitions.
- Add a deterministic Defection timing matrix for 2-, 3-, and 4-player games,
  with target seats before and after the initiator: each case must observe
  exactly one target Start/income/action/End window, arm only after that End
  Turn's recovery, resolve only at the initiator's following Start after reset
  and before income, and leave the converted unit exhausted. Cover pending
  choices, intervening-player kills/pushes, target or initiator elimination,
  city/capacity loss, multiple marks in ID order, save/resume at both phases,
  converted city occupants/defense recalculation, ownership-dependent state
  cleanup, and replay event equality.

### Factions

The current architecture requires complete explicit registrations for Original
and Candy. The first implementation contract must decide whether the new
ruleset ships only after Candy has a complete adapted roster, or whether that
ruleset temporarily permits Original-only match setup. It must never fall back
silently from Candy to Original. This proposal makes no Candy choices.

### AI and simulation

- Replace fixed nine-role ordering and “missing role” research assumptions.
- Teach AI the Catapult minimum range, protected firing positions, anti-siege
  closing, Barracks capacity, first-capture Spoils, Pillage, and Disband.
- Teach AI to search at most three Lancer attacks without treating a potential
  kill as certain; reserve cheap screens between Lancers and fragile units;
  value a Defection only after modeling the target owner's guaranteed complete
  reply turn and any intervening seats; garrison valuable rear cities or use
  Scout pickets; respect per-city recovery; and value Blackout by attributable
  city income/action denial rather than a flat role bonus.
- AI observations, policy diagnostics, and ordinary player-facing logs must
  never expose concealed authoritative units. Raw debug exports, saves,
  canonical replays, and hashes remain explicitly omniscient diagnostic
  artifacts and should not be offered as safe live-player views.
  Deterministic tie-breaks order Pursuit paths, eligible Defection cities, and
  Blackout targets by existing canonical IDs and coordinates.
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
  Sawmill and Catapult, Fieldcraft must show Saboteur, and Maneuver must show
  Lancer.
- New Original world sprites/portraits are required for Envoy, Catapult,
  Saboteur, and Lancer, plus Barracks and action/status symbols for Defection,
  Pursuit, detection/exposure, Blackout, Pillage, Spoils, and Disband.
  Production art would follow the checked-in PixelLab workflow only after art
  direction and the design contract are approved.
- Combat preview must display minimum range, inability to move-and-fire, and
  expected ranged retaliation without relying on color alone.
- The map and action bar must show remaining Pursuit attacks and legal follow-up
  cells/reach, Defection's waiting/armed phase, revealed source, target reply
  owner, next safe resolution boundary, break conditions, converted-city
  siege, and reserved city, plus Saboteur detection source, whether a hostile
  unit blocks Blackout, exposure, eligible round, and target-city recovery.
  Enemy UI must never show concealed selections, blocked paths, threat overlays,
  event animations, or rejection text that leaks a Saboteur.

## 13. Risks and tunable parameters

| Risk                                           | Proposed baseline                                                                                                           | Safe first tuning range                            | Evidence to watch                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| One Mine causes excessive reward queues        | +4 pop for 6                                                                                                                | +3 to +4                                           | Levels per Mine; reward modal frequency; Mining adoption    |
| Forge jackpot snowballs too hard               | +3/Mine, cost 6, processor cap 18                                                                                           | cap 15–18; Mine base +3–4                          | Population from top 5% of Forges; reward choices from build |
| Stone pairs overpay                            | +2/Quarry +2/pair, processor cap 16                                                                                         | cap 14–16; pair +1 to +2                           | Stoneworks distribution versus Windmill/Sawmill             |
| Industry still feels too map-dependent         | unchanged frequencies                                                                                                       | boost Surveying utility before altering generation | Root adoption on starts with zero owned mountain resources  |
| Catapult creates static artillery balls        | cost 8, A3.5, R2–3, D0.5, no Dash                                                                                           | cost 8–9; A3–3.5; R3 fixed                         | Siege duration; Catapult survival with/without screens      |
| Raider still wins frontal trades               | cost4, A2, D1, Charge +1                                                                                                    | Charge +0.5–1; D1–1.5                              | Coin-normalized losses versus Fighter/Guard                 |
| Lancer chain wipes lack a reply                | cost9, A3/D1.5, three attacks, two-cell Pursue; no chest/Promote/action reset                                               | cost9–10; attack cap 2–3; Pursue 1–2               | Units killed/turn; chains stopped by healthy screens        |
| Defection trivializes premium units            | revealed Envoy; one complete target-owner turn, 7 HP/D0.5, cost6, capacity reservation                                      | cost6–7; require one or two turns                  | Marks armed/resolved; value converted; response chosen      |
| Converted rewards bypass capacity              | all roles eligible; conversion requires a reserved slot and re-homes target                                                 | exclude super-units only after evidence            | Converted Juggernauts; capacity/reward integrity            |
| Concealment leaks or feels arbitrary           | radius-1 unit/city and radius-2 Scout detection; contact-safe movement/ZOC; projected live events                           | Scout radius 1–2                                   | Hidden-info test failures; surprise/contact outcomes        |
| Blackout locks cities too reliably             | unit detection blocks; suppress up to 3 income/one action turn; one normal city turn between effects; round+3 unit cooldown | cap 2–3; deny Train only                           | Income/actions denied; protected turns; Saboteur survival   |
| Spoils accelerates conquest snowball           | first hostile capture/city/player +2; neutral 0                                                                             | +1 to +2                                           | Drill opening win rate and Coins earned before round 10     |
| Pillage is more valuable than occupation       | flat +1, terminal                                                                                                           | 0 to +1                                            | Pillage frequency and net destroyed build cost              |
| Barracks bypasses city development too cheaply | cost6, +1 capacity, one/city, Quarrying                                                                                     | cost6–8                                            | Barracks adoption and units per city level                  |
| Scout makes Mobility a mandatory opener        | cost4, sight2, Move2, Capture                                                                                               | cost4–5 or remove Capture only after evidence      | First-root adoption; chest/village captures by role         |
| Tier 3 remains too late                        | current `9 + 3(C-1)`                                                                                                        | coefficient 2–3                                    | First tier-3 round, match share with any tier-3 tech        |
| Advanced units crowd out Fighters              | 6–9 Coins and one slot                                                                                                      | +1 unit cost before stat nerf                      | Coin-normalized damage, captures, and survival by role      |

Recommended balance telemetry for seeded AI and human playtests:

- research adoption and first-purchase round by branch/node;
- Coins spent on research, improvements, and roles;
- eligible resource markers converted by family;
- city levels and income attributable to each economic family;
- combat damage, kills, survival turns, and captures per unit Coin;
- Lancer attacks and kills per activation, sequence stops, and target spacing;
- Defection offers, target reply turns, arms, resolutions/cancellations, break
  reason, converted value, and reserved-slot turns;
- Saboteur turns concealed/detected by source, Blackouts blocked by pickets,
  income/actions denied, protected normal city turns, and survival after
  exposure;
- turns from first walled-Guard siege contact to capture;
- win rate conditional on first tier-3 node;
- top-decile Forge/Stoneworks values rather than averages alone.

## 14. Independent review

This section records the economic/map review, the pressure test applied while
adding the gridlock-breaker roster, and a fresh independent adversarial review
of that roster revision. It is part of the proposal, not evidence that the
design has been playtested or approved. The latest review found and corrected
material timing, repeat-denial, counter-availability, and hidden-information
gaps; section 14.4 records them separately from the author's initial audit.

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
remain an obviously neutral choice. The military fallback therefore remains
on Craft, now as the Envoy rather than an interchangeable line attacker.
Farming is the reliable abundant-resource fork; Craft is the mixed-site plus
high-leverage control fork.

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
| Settlement | Craft 7 + Envoy 6; Gathering parent already known                                                                        |
| Wilds      | Hunting + Marksmanship 12 + Marksman 3                                                                                   |
| Industry   | Surveying 5 gives Mountain access/vision; Quarrying 12 enables a 6-Coin Barracks anywhere; Heavy is the 21-Coin endpoint |
| Mobility   | Scouting 5 + Scout 4; Raiding costs 12 before its 4-Coin Raider                                                          |
| Warfare    | Drill 5 + Guard 3                                                                                                        |

Industry is still the least dependable opening military branch, but it no
longer requires a usable Stone tile to obtain value from Quarrying. Wilds has
the strongest combined ranged/covert roster, but reaching both Catapult and
Saboteur requires two different tier-2 forks and 37 research Coins at one city
from no Wilds technology (`5 + 7 + 9 + 7 + 9`). Mobility similarly needs both
forks to combine the Raider and Lancer. Warfare remains the quickest direct
defense. These are hypotheses to test, not proof of equal win rate.

### 14.2 Findings incorporated

| Finding from independent pressure test                                                                                                                                                 | Revision made in this draft                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An uncapped eight-Mine Forge represented 64 population and a level-10 fresh city, with a long sequence of mandatory rewards.                                                           | Forge is now +3/Mine capped at +18. Stoneworks is capped at +16. Exact maximum levels and queue increments are stated in section 8.3.                                             |
| Whole-board resource frequency disguised severe settlement-local scarcity: 93.3% of sampled initial footprints had no Ore and 84.9% had no Stone.                                      | Added the 240-map/3,000-footprint audit; retained bold Mine/Quarry basics; gave Quarrying a Barracks that works without a deposit.                                                |
| Farming was already the cheap, abundant, free-parent path; adding the branch's unit there made Craft a likely dead fork.                                                               | The branch's military fallback stays on Craft, now as Envoy.                                                                                                                      |
| Both earlier Pikeman drafts remained line infantry competing with Fighter/Guard and did not create a new decision.                                                                     | Pikeman is removed. Envoy instead threatens a delayed, interruptible Defection and has no ordinary Attack.                                                                        |
| Neutral Spoils discounted the strongest early snowball, while level-scaled hostile Spoils and +2 Pillage paid a winner for taking income and destroying it. Recapture could be farmed. | Neutral captures pay zero; hostile Spoils is +2 only on that player's first capture of that city; Pillage is +1 and terminal.                                                     |
| Attack 4.5, cost-7 range-3 artillery killed most field units while also dealing 6 to a walled Guard, making protected Catapult balls too efficient.                                    | Catapult is cost 8 and Attack 3.5. It deals 4 to the walled Guard, still kills an open Fighter, cannot move-and-fire, and is disabled at adjacency.                               |
| “Minimum range” was underspecified for retaliation and does not exist in the current role model.                                                                                       | Minimum range is explicitly 2 for both Attack and retaliation; ranged retaliation uses Defense 0.5 under the existing formula; every affected engine/public/AI surface is listed. |
| Maneuver's ZOC-only tier-3 benefit was difficult to justify at a five-city price of 21, while artillery created a need for a credible closing unit.                                    | Maneuver unlocks the 9-Coin Lancer; Raider remains Move 2. Lancer Pursuit is capped at three attacks and stopped by a healthy Fighter.                                            |
| A 3-Coin Scout could repay itself from a single public chest while accelerating village captures, exploration, and future resource knowledge.                                          | Scout now costs 4. Removing Capture is held as a stronger fallback only if adoption/win telemetry still shows a mandatory opener.                                                 |
| Existing Normal AI values visible economic targets and missing roles, not passive unlocks, per-city first-capture history, minimum range, or protected artillery formations.           | The implementation-impact section now requires explicit utility and tactical support; this redesign cannot safely reuse current weights or fixed role orders.                     |

### 14.3 Gridlock-breaker exploit audit

| Exploit or degeneracy                                | Baseline guardrail                                                                                                                                                                                                   | Residual test question                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Infinite Lancer action reset                         | Only lethal hostile-unit attacks qualify; maximum three attacks; one Pursue path between attacks; no chest, Promote, Wait, End Turn, special, or structure reset; every nonlethal result and explicit End terminates | Does a two-attack cap still feel spectacular if three routinely decides battles?                                            |
| Chain through walls or disposable structures         | Structure kills never open Pursuit; ordinary retaliation and occupancy apply to every target                                                                                                                         | Can allied disposable units be manipulated into lanes? Allied attacks are illegal, so no.                                   |
| Lancer makes all mobile units obsolete               | Cost 9; Defense 1.5; full-health Fighter survives Attack 3 and stops the chain; Raider costs 4 and reaches its single priority target earlier in the tree                                                            | Compare coin-normalized kills/captures against mixed armies; spacing must account for kill advance plus two-cell Pursue.    |
| Defection steals a premium unit without reply        | Offer reveals the Envoy to target owner/allies; next target-owner End arms only after a complete turn/recovery; initiator's following Start resolves; range 2 survives both boundaries                               | Is one complete turn enough around immobilized walled defenders, or should conversion require two?                          |
| Reward/super-unit conversion bypasses scarcity       | Reward roles are eligible but require a reserved slot, cannot act on conversion turn, and transfer no exploration; conversion cannot create over-capacity                                                            | Does the emotional swing of a converted Juggernaut outweigh the rare setup even when rules remain sound?                    |
| Conversion overfills or corrupts home-city capacity  | The slot is reserved at offer time and revalidated atomically; every cancel releases it; successful target is re-homed and counted                                                                                   | Fuzz simultaneous city loss, negative population, Disband, and multiple reservations.                                       |
| Defection captures a city in the same transaction    | Conversion clears Capture eligibility and grants no Spoils; a converted city occupant must survive until a later Start Turn                                                                                          | Does delayed Capture remain obvious in UI and AI planning?                                                                  |
| Concealed unit leaks through queries/rejections      | Public paths assume hidden occupancy/ZOC absent; stepwise authority accepts a visible prefix, reveals on contact, and uses generic target failures; all player-facing events/diagnostics are projected               | Observation-equivalence must cover every public command/query/event/animation surface, not only `PlayerView.units`.         |
| Permanent invisibility removes counterplay           | Any enemy unit/city detects at radius 1, Scout at radius 2; hostile-unit detection makes Blackout illegal; Attack/Blackout creates timed exposure                                                                    | Is one center garrison too binary, or does it create the intended “neglected rear only” niche?                              |
| Blackout/recapture or alternating units locks a city | No payout/spawn/damage; one pending effect; city ownership starts/preserves recovery; one unaffected owner turn is mandatory; each Saboteur waits until action round +3                                              | Measure denial cadence and remove development lockout first if one affected turn remains too broad.                         |
| Disruption invalidates population/reward state       | Blackout suppresses at most 3 incoming Coins and future actions only; it never removes live population, capacity, rewards, Roads, or defense                                                                         | Is blocking both training and development too broad despite state safety?                                                   |
| Hidden Saboteur changes spawn/displacement outcomes  | City-adjacent spawn cells already fall inside city/unit detection; other blind displacement reports uncertainty and reveals only on actual contact                                                                   | Verify reward/treasure placement, Push, future area effects, and event projection never leak an undetected remote location. |
| Sweeper/controller simply amplify artillery balls    | Lancer must pass occupancy and kill a screen; Envoy must remain within range 2 through a reply; Catapult still cannot fire after moving or at adjacency                                                              | Test protected artillery against equal-Coin Fighter/Guard spacing plus mobile reserves.                                     |
| One branch supplies an entire dominant army          | Wilds and Mobility each have three units, but their two endpoints require both forks; Wilds' full unit set costs 37 research Coins at one city before training                                                       | Track single-branch win rate and role diversity; move Saboteur only if its dual-use Fieldcraft home proves dominant.        |

### 14.4 Fresh independent gridlock-breaker review

The reviewer traced the three mechanics through current Ruleset 6 combat,
movement, capacity, reward, turn, view, query, AI, replay, and debug-export
contracts. This was a design audit, not an implementation test. The following
issues were material enough to revise the baseline rather than defer to
playtesting:

| Review finding                                                                                                                                                                            | Revision incorporated                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pursuit's “exactly one follow-up” wording contradicted its three-attack ceiling, and the state machine did not explicitly block Promote, End Turn, faction specials, or chest collection. | Remaining attacks are exactly `3 - attacksUsed`; only Attack, one bounded Pursue, or explicit End is legal; chest cells and every reset/side-action route are excluded.              |
| A melee kill advances before the two-cell Pursue, so successive targets can be three cells apart. “More than two cells” understated the real wipe corridor.                               | All positioning guidance and UI reach requirements now include the ordinary advance; durable occupancy or spacing beyond three cells is the stated counter.                          |
| Concealed occupancy was covered, but concealed ZOC could still make authoritative movement differ from public pathing without a fair contact rule.                                        | Ordinary and Pursue paths are resolved stepwise; hidden occupancy stops before contact and newly detected ZOC stops on the entered cell, while ZOC-immune units continue normally.   |
| A range-2 Defection could be offered from terrain the target owner had never explored, leaving the threatened player unable to locate the fragile source.                                 | Offering reveals the Envoy entity/coordinate to target owner and allies for the mark's duration without revealing surrounding terrain.                                               |
| “One target reply” was correct in intent but not demonstrated for seats before/after the initiator in 2-, 3-, and 4-player order.                                                         | A relative-seat timing table now proves that later-seat targets reply in the offer round and earlier-seat targets reply next round; intervening seats only add disruption chances.   |
| Full mark metadata shown when a third party saw only one endpoint could reveal the hidden counterpart.                                                                                    | Third parties receive an endpoint badge only; linked IDs/coordinates require both endpoints to be independently visible.                                                             |
| Converting a fortified city occupant did not specify recalculated defense, immediate siege/income implications, or ownership-bound state cleanup.                                         | Friendly city/Wall/Fortification defense is recalculated for the new owner, the resulting siege is explicit, the unit remains exhausted, and sourced marks/open Pursuit cancel.      |
| A successfully converted premium unit could be offered back immediately, making “no existing mark” look like protection against a conversion chain when it was not.                       | Re-marking is allowed but never automatic: it costs a new Envoy/reservation and the current owner receives a complete usable reply activation before any reconversion resolves.      |
| A per-Saboteur cooldown did not prevent two Saboteurs from alternating Blackout on one city forever; capture also reset the only city-side guardrail.                                     | Every affected city must complete one normal owner turn between Blackouts, and that recovery follows the city through capture; denial still never pays or spawns units.              |
| `currentOwnerTurn + 3` became ambiguous if Defection changed the Saboteur's owner.                                                                                                        | Cooldown is now `actionRound + 3`, a serialized global-round threshold that survives ownership changes and is identical at every player count.                                       |
| Radius-1 detection merely revealed a Saboteur after it had moved adjacent and fired, so the proposed “cheap rear Fighter” was revenge, not pre-impact counterplay.                        | Blackout is illegal while any hostile unit detects the Saboteur; a center garrison blocks the ring, and Scouts detect at radius 2 to provide an early proactive picket.              |
| Filtering `PlayerView.units` alone would still leak through targets, paths, ZOC, Push previews, AI tuples, animations, events, logs, saves, replays, and hashes.                          | Section 7.4 now defines the public projection surface, generic guessed-ID failures, blind-displacement uncertainty, and labels raw save/replay/debug/hash artifacts as omniscient.   |
| The portable charter preserved the threats but did not require future factions to preserve their counters.                                                                                | Each high-variance archetype now carries an invariant safety envelope; factions may reskin/reimplement the job but may not omit finite ceilings, reply windows, or timely detection. |

#### Independent verdict

- **Lancer/Pursuit:** retains the intended spectacular three-kill ceiling. It
  is broadly useful because Move 3, Dash, Capture, and one strong attack are
  valuable, but 9 Coins and Defense 1.5 make that package inefficient unless
  mobility or a weak-unit corridor matters. A healthy Fighter/Guard/Heavy,
  occupied lane, ordinary retaliation, or spacing beyond the full
  advance-plus-Pursue reach ends the chain. No unit-ID matchup modifier is
  needed.
- **Envoy/Defection:** is the sharpest anti-anchor mechanic and the greatest
  emotional-risk item. Full conversion, including Juggernauts, remains in the
  baseline because source revelation, one complete target-owner activation,
  range revalidation, source fragility, deterministic cancellation, reserved
  capacity, exhausted arrival, and loss of captured-city defense provide real
  ordinary-mechanics answers. The safe rollback remains disable/displacement
  if human playtests find ownership loss fun-killing despite understanding the
  reply.
- **Saboteur/Blackout:** now has a narrow, legible target: an unpicketed rear
  city. A garrison prevents the payload, a Scout patrol detects earlier, the
  infiltrator is exposed after acting, and every affected city receives a full
  recovery turn. This preserves a strong positional punishment without a
  permanent economic lock or recapture farm.
- **Branch parity:** the revisions add no node or role and do not change the
  25-node graph. Scout detection modestly improves Mobility specifically as a
  counter to Wilds' Saboteur, strengthening cross-branch incentive rather than
  concentrating another payoff in Wilds. Settlement still owns the cheapest
  high-variance unit path, but Envoy's zero Attack and reserved capacity make
  it a situational purchase rather than a general army core.

The mechanics are sufficiently bounded for an implementation contract, but
their emotional fairness, AI competence, and prices remain playtest claims.
The implementation should ship observation-equivalence, timer, and action-
state tests before balance simulation; otherwise a balance result could merely
be measuring information leaks or illegal extra actions.

### 14.5 Failure modes that remain live

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
- **Mobility/conquest snowball:** Maneuver Lancers and ZOC-free Move-2 Raiders
  can reach artillery and open chains quickly. First-capture-only Spoils
  prevents cycling but does not remove the ordinary reward of taking a city.
- **High-variance frustration:** Defection and Blackout can feel worse than
  their average economic value, while an ideal Pursuit can decide a turn.
  Source telegraphs, full-reach previews, garrison blocking, and recovery
  badges must be comprehensible before measuring resignations/misclicks
  alongside win rate.
- **Visibility complexity:** Concealment is the only proposed mechanic that
  weakens the current “explored means permanently visible unit” contract. It
  requires observation-equivalence tests across commands, generic rejections,
  path/ZOC contact, displacement, previews, AI, projected events/logs,
  animation, reconnect/resume, and omniscient-artifact access, not just a
  filtered renderer.
- **Reward cadence:** even capped industrial complexes can generate consecutive
  choices. Measure choices per build and time blocked in the reward queue, not
  just final city level.

### 14.6 Explicit product alternatives

The following are real judgment calls rather than hidden recommendations:

1. **Industry fallback:** baseline is Quarrying → Barracks. If that association
   feels thematically forced, rename the node **Stonecraft**. Moving Barracks
   back to Fortification is mechanically simpler but reopens Industry's
   off-deposit-value problem and strengthens Warfare turtling.
2. **Controller identity:** baseline replaces Pikeman with the 6-Coin Envoy and
   a one-reply Defection. If full conversion is too swingy, keep the Controller
   archetype but convert the resolution into a one-turn disable or forced
   displacement; do not restore Fighter+ line infantry.
3. **Artillery lethality:** baseline Attack 3.5 produces 4 damage against a
   full-health walled Guard and 10 against an open Fighter. Attack 3 produces
   only 3 and 8 respectively; use that fallback if ranged armies dominate.
4. **Spoils state:** baseline uses per-player/per-city first-capture history.
   The simpler alternative is no capture payout at all. An unrestricted or
   level-scaled payout is not recommended because it permits cycling and
   compounds conquest.
5. **Maneuver payoff:** baseline keeps Raider Move 2, adds ZOC freedom, and
   unlocks the 9-Coin Lancer. Reduce Pursuit from three attacks to two before
   reducing healthy-screen durability; unlimited resets are not recommended.
6. **Research scaling:** retain the existing formula for the first prototype.
   If eligible tier-3 nodes remain unused, lower only the tier-3 city
   coefficient from 3 to 2 before increasing already-potent unit stats.
7. **Reward conversion:** baseline allows Juggernauts because the guaranteed
   reply and capacity reservation create the desired anti-super-unit threat.
   Excluding reward-only roles is the safe rollback if the swing is fun-killing
   even when rare; do not make the outcome random.
8. **Concealment:** baseline uses radius-1 unit/city detection and radius 2 on
   Scouts; hostile-unit detection blocks Blackout. If rear defense is still
   tedious, widen another early picket tool before making every hidden move
   globally visible, which would erase the Infiltrator job.
9. **Blackout payload:** baseline suppresses up to 3 income and one turn of
   Train/development actions, followed by one unaffected owner turn. If denial
   is oppressive, retain the income loss and Train denial but remove
   development lockout before changing concealment, picket blocking, or city
   recovery.

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
6. Is the 6-Coin, 7-HP Envoy's delayed full Defection an exciting answer to an
   isolated premium unit, or should the Controller archetype impose a temporary
   disable/displacement instead of ownership change?
7. Are Spoils and Pillage the right economic identity for Warfare, or would a
   peaceful production/refund model be preferable despite weaker theme?
8. Should Quarrying's Barracks consume a map tile for +1 capacity, and does the
   pairing feel coherent enough, or should capacity remain exclusively tied to
   city level?
9. Should the current research-cost formula be frozen for the first playtest,
   or is the five-city tier-3 cost of 21 already known to be too punitive?
10. Is five trainable tier-3 units—Catapult, Saboteur, Heavy, Lancer, and
    Breacher—the right payoff density, or do Wilds/Mobility now carry too much
    of the military roster?
11. Is the Lancer's three-attack cap large enough to punish weak-unit masses
    while remaining legibly bounded, or should the safe baseline start at two?
12. Is the baseline counter—radius-1 unit/city detection, radius-2 Scout
    detection, and Blackout blocked by hostile-unit detection—legible and
    active, or does a center garrison make the infiltrator's niche too binary?
13. With one guaranteed unaffected city turn between effects, should Blackout
    still deny both Train and tile development for its affected turn, or is the
    capped 3-Coin suppression plus Train denial sufficient?
14. Should reward-only Juggernauts remain eligible for Defection when the
    attempt reserves capacity, waits through one reply, and consumes the
    converted unit's first turn?
15. For implementation sequencing, should a new ruleset wait for a complete
    Candy adaptation, or may an explicitly Original-only experimental ruleset
    ship first?

## 16. Approval boundary

Approval of this document should mean approval to write an authoritative new-
ruleset specification and implementation plan. It should **not** by itself mean
that these numbers are silently applied to Ruleset 6. Candy remains a separate
design exercise after the Original tree is accepted.
