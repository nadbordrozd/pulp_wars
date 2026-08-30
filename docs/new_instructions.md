# Land-only 4X prototype: economy + technology tree

> **Source brief and provenance.** This user-authored direction is preserved as
> the design source. The exact deterministic implementation contract, including
> the user's clarification that this is the Original baseline and Candy uses a
> separately registered copy with Candy unit substitutions, is
> [Pulp Wars Ruleset 6](product/RULESET_6.md). The MVP section below defines
> sequencing, not a reduction of final ruleset-6 scope.

## 1. Design goal

Preserve the parts of Polytopia's economy that are unusually good:

- one spendable currency;
- increasing marginal cost of city income;
- cities developed by interacting directly with the map;
- terrain determines economic opportunities;
- technology order creates opportunity costs;
- no city-management screen;
- economic development remains interesting well into the midgame;
- occasionally the geography creates a spectacular city that reaches level 8, 9, 10+;
- technologies frequently unlock several related things rather than representing tiny +5% upgrades.

The major differentiation is:

**Economic optimization is more explicitly spatial.**

Polytopia's advanced economy is primarily:

> place multiplier beside as many matching buildings as possible.

This game uses several equally simple spatial relationships:

**clusters, adjacency, shapes/lines, and mixed-industry combinations.**

The player should routinely have thoughts like:

> “If I put the mine there, the Forge will eventually hit three mines.”

> “Those four farms could become one big agricultural cluster.”

> “This tile is unusually valuable because it touches a Sawmill, Forge and Windmill.”

There are still no inventories of iron, wood, food, etc. These are purely spatial relationships.

---

# 2. Core city economy

There is one spendable currency: **Coins**.

Cities have a **level** and **population**.

A level-N city:

- produces N Coins per turn;
- supports roughly N+1 units;
- requires N+1 population to reach level N+1.

Therefore:

- Level 1 → 2 requires 2 population.
- Level 2 → 3 requires 3.
- Level 3 → 4 requires 4.
- Level 4 → 5 requires 5.
- etc.

The population bar resets each time the threshold is reached. Level-up gets a short animation/fanfare and an occasional one-off choice.

The capital gets +1 Coin/turn.

This intentionally retains Polytopia's convex growth curve. The novelty is in **how population is produced**, not in disguising the same curve.

## City territory

Normal city territory is 3×3 centred on the city.

One mid-level city upgrade can expand it to 5×5.

A tile belongs to exactly one city. Economic improvements normally contribute population to the city that owns their tile.

This matters for cluster calculations below.

---

# 3. Basic resources

Use roughly five economic landscape features.

### Fruit

Visible after Gathering.

**Harvest Fruit**

- Cost: 2 Coins
- +1 population
- Fruit disappears

This is cheap immediate development.

### Game

Visible from the start or after Hunting.

**Hunt Game**

- Cost: 2
- +1 population
- Game disappears

Again, immediate development.

### Fertile Ground

A persistent resource marker on plains.

**Farm**

- Cost: 5
- +2 population
- Remains on map

Adjacent Farms visually merge into larger continuous fields.

### Forest

Terrain rather than a resource token.

**Lumber Camp**

- Cost: 3
- +1 population
- Forest remains visibly forested/developed

Forests should be relatively common, so this is intentionally less efficient than Farms or Mines.

### Ore

Resource found mainly on hills/mountains.

**Mine**

- Cost: 5
- +2 population

Ore should be relatively rare and clustered enough that excellent Forge locations occasionally occur.

### Stone

A second hill/mountain resource.

**Quarry**

- Cost: 4
- +1 population

Stone is more common than ore. Its advanced building gets a stronger geometrical bonus to compensate for the weak base Quarry.

---

# 4. The spatial economy

There are four important types of economic interaction.

## A. Cluster: Windmill

Unlocked by Milling.

Cost: 5.

Maximum one per city.

A Windmill must touch at least one Farm.

Instead of counting only immediately adjacent Farms, the Windmill counts the **orthogonally connected Farm cluster** touching it.

Each Farm in that cluster contributes:

**+1 population**

Maximum Windmill contribution: **+8**.

Example:

```
F F F
  F W
  F
```

This is a five-Farm cluster, so the Windmill contributes +5.

The Farms themselves already generated 10 population. The Windmill makes an especially good agricultural site dramatically better.

This differs importantly from ordinary adjacency: the player cares about preserving contiguous farmland.

A gap matters.

```
F F . F
    W
```

The isolated Farm doesn't count.

Processors count only resource buildings belonging to their own city. This prevents two neighbouring Windmills from both exploiting the same enormous cross-city farm network.

---

## B. Cluster: Sawmill

Unlocked by Sawmilling.

Cost: 5.

Maximum one per city.

Must touch a Lumber Camp.

Counts the orthogonally connected group of Lumber Camps attached to it.

Each connected Lumber Camp:

**+1 population**

Maximum Sawmill contribution: **+8**.

This gives forest-heavy cities a similar jackpot mechanism to agricultural cities, but the underlying economics differ:

- Lumber Camps are cheaper;
- each gives only +1;
- forests are common;
- forest clearing competes with preserving a future Sawmill cluster.

---

## C. Classic adjacency jackpot: Forge

Unlocked by Metallurgy.

Cost: 5.

Maximum one per city.

**+2 population per adjacent Mine.**

Keep this deliberately simple.

A Forge touching:

- 1 Mine = +2
- 2 Mines = +4
- 3 Mines = +6
- 4 Mines = +8
- theoretically 8 Mines = +16

The theoretical huge Forge is good.

Do not balance the game around preventing the rare +12 or +16 Forge. Geography producing an absurdly productive industrial city is part of the fun.

---

## D. Shape bonus: Stoneworks

Unlocked by Masonry.

Cost: 5.

Maximum one per city.

The Stoneworks gets:

**+1 population for every adjacent Quarry**

and additionally:

**+2 population for every opposite pair of Quarries across the Stoneworks.**

For example:

```
Q
|
```

Q - S - Q
|
Q

Four adjacent Quarries:

+4 from adjacency.

There are two opposite pairs:

+4 additional.

Stoneworks total:

**+8 population.**

Diagonal opposite pairs also count.

This provides a very simple pattern-recognition puzzle:

> “That empty tile between those two stone deposits is unusually valuable.”

It introduces geometry beyond adjacency without requiring the player to calculate anything complicated.

The UI should preview the resulting value before construction and visually highlight the contributing buildings.

---

# 5. Mixed-economy buildings

Specialized processors reward concentrations of one resource.

Mixed buildings reward diversity.

This creates a genuine land-use tension.

## Workshop

Unlocked relatively early by Craft.

Cost: 4.

Maximum one per city.

Requires at least two different adjacent basic improvement types.

It produces:

**+1 population per distinct adjacent basic economic type.**

Types:

- Farm
- Lumber Camp
- Mine
- Quarry

Examples:

Mine + Farm = +2.

Mine + Farm + Lumber Camp = +3.

Mine + Farm + Lumber Camp + Quarry = +4.

Two Mines still count as only one type.

This makes certain heterogeneous patches valuable in a completely different way from Forge/Windmill sites.

---

# 6. Grand Works: the late-game spatial jackpot

This is probably the most distinctive economic building.

Unlocked by Grand Works, a tier-3 technology.

Cost: 7.

Maximum one per city.

It can only be built if the tile is adjacent to at least **three different advanced processors**:

- Windmill
- Sawmill
- Forge
- Stoneworks

It generates:

**+2 population per different adjacent processor.**

Therefore:

3 processors → +6

4 processors → +8

It does not care about duplicate processors.

Crucially, this building **may count friendly processor buildings belonging to neighbouring cities**.

That makes dense mature empires economically interact across city borders.

A 3×3 city will very rarely be able to construct a good Grand Works. That's intentional.

It becomes much more plausible:

- after a city expands to 5×5;
- where two or three cities border one another;
- in unusually varied terrain.

This makes it a genuine late-game spatial objective rather than an ordinary building.

The desired player reaction is:

> “Holy crap. If I put the Windmill here rather than there, eventually this middle tile can touch the Windmill, Forge and Sawmill.”

That's a decision the player may anticipate ten turns before completing it.

---

# 7. Market and recurring income

Direct recurring income must be much more constrained than population because recurring Coins compound.

## Market

Unlocked by Commerce.

Cost: 7.

Maximum one per city.

Requires at least two different economic families adjacent.

Produces:

**+1 Coin/turn for each distinct adjacent economic family.**

Families:

- Agriculture: Farm / Windmill
- Timber: Lumber Camp / Sawmill
- Metal: Mine / Forge
- Stone: Quarry / Stoneworks

Farm + Windmill are still only one family.

Maximum normal output:

**+4 Coins/turn.**

If the Market is also adjacent to a Road connected to the capital:

**+1 additional Coin/turn.**

Absolute maximum:

**+5 Coins/turn.**

This is intentionally hard to achieve.

The Market therefore rewards the exact opposite landscape from the Forge:

- Forge wants specialization.
- Market wants diversity.

It also creates a reason to plan roads around economic geography.

---

# 8. Destruction and dynamic population

Advanced buildings have live values.

If a Windmill currently receives +5 from five connected Farms and one Farm is destroyed, its contribution becomes +4.

The city's current population progress decreases by 1.

City levels never go backwards.

If enough economic population disappears, population progress can become negative. Negative population reduces city income until replaced, but doesn't reduce unit capacity or city level.

This avoids exploits where a player repeatedly destroys and rebuilds the same configuration for population.

It also makes scorched-earth tactics possible without introducing a separate infrastructure-health system.

---

# 9. Technology structure

Use five branches, three tiers, 25 technologies.

For MVP, the exact visual shape isn't sacred; use the familiar five-root layout because it is exceptionally readable.

## Branch 1 — Settlement

### T1: Gathering

Unlocks:

- Harvest Fruit
- reveals Fertile Ground

This is the default starting technology for the MVP faction.

### T2A: Farming

Requires Gathering.

Unlocks:

- Farm
- adjacent Farms visually merge into fields

### T3A: Milling

Requires Farming.

Unlocks:

- Windmill
- connected-Farm-cluster mechanic

### T2B: Craft

Requires Gathering.

Unlocks:

- Workshop
- mixed basic-economy adjacency bonus

### T3B: Grand Works

Requires Craft.

Unlocks:

- Grand Works
- Redevelop: destroy one of your own economic buildings without refund

Grand Works provides the strongest incentive for deliberately planning a mixed city.

---

# Branch 2 — Wilds

### T1: Hunting

Unlocks:

- Hunt Game

### T2A: Forestry

Requires Hunting.

Unlocks:

- Lumber Camp
- Clear Forest

Clear Forest removes an undeveloped Forest and gives **+1 Coin**.

This creates:

> immediate money now

versus

> preserve this forest for a future Lumber Camp/Sawmill.

Do not make clearing extremely lucrative.

### T3A: Sawmilling

Requires Forestry.

Unlocks:

- Sawmill
- connected-Lumber-Camp-cluster bonus

### T2B: Marksmanship

Requires Hunting.

Unlocks:

- Marksman unit

### T3B: Fieldcraft

Requires Marksmanship.

Unlocks:

- Scout and Marksman ignore the extra movement cost of Forest
- Replant Forest

Replant Forest:

- Cost 4
- converts empty plain into Forest
- gives no population

A later Lumber Camp can then be added normally.

This is intentionally expensive. Its purpose is late-game spatial optimization, not cheap population manufacture.

---

# Branch 3 — Industry

### T1: Surveying

Unlocks:

- movement on mountains/hard hills
- reveals Ore
- reveals Stone
- units standing on high ground get +1 vision

### T2A: Mining

Requires Surveying.

Unlocks:

- Mine

### T3A: Metallurgy

Requires Mining.

Unlocks:

- Forge
- Heavy unit

### T2B: Quarrying

Requires Surveying.

Unlocks:

- Quarry

### T3B: Masonry

Requires Quarrying.

Unlocks:

- Stoneworks
- Stoneworks opposite-pair bonus

This entire branch therefore presents a choice between:

**rare, expensive, extremely productive metal sites**

and

**more common but spatially demanding stone sites.**

---

# Branch 4 — Mobility

### T1: Scouting

Unlocks:

- Scout unit
- Scout has increased sight radius

### T2A: Roads

Requires Scouting.

Unlocks:

- Roads

Road cost: provisionally 2 Coins per tile.

Roads improve unit movement.

They do **not** automatically generate population. Their economic payoff comes later through Commerce.

### T3A: Commerce

Requires Roads.

Unlocks:

- Market
- capital-road Market bonus

### T2B: Raiding

Requires Scouting.

Unlocks:

- Raider unit

Raider is fast but not simply a Polytopia Rider clone.

Its signature ability is **Charge**:

If it moves at least two tiles before making a melee attack, it receives an attack bonus.

It does not automatically retreat after attacking.

### T3B: Maneuver

Requires Raiding.

Unlocks:

- Raider ignores enemy zone-of-control when moving.
- Scout may also pass through enemy zone-of-control, but cannot end movement on an occupied tile.

This makes the mobility branch increasingly about penetration and positioning rather than simply producing a stronger cavalry unit.

---

# Branch 5 — Warfare

### T1: Drill

Unlocks:

- Guard unit

Guard is an inexpensive defensive specialist.

### T2A: Fortification

Requires Drill.

Unlocks:

- Fortify bonus for Fighter and Guard while occupying friendly cities
- stronger city defensive bonus

No separate fort-management screen.

### T3A: Explosives

Requires Fortification.

Unlocks:

- Breacher unit

The Breacher is the replacement for the conventional Catapult archetype.

It is a fragile, dangerous **melee siege unit** whose attacks ignore terrain and city defensive bonuses.

This deliberately changes siege geometry: taking a fortified city requires getting the specialist physically beside the defender rather than parking artillery three squares away.

### T2B: Medicine

Requires Drill.

Unlocks:

- Medic unit

Medic uses its action to heal an adjacent friendly unit.

### T3B: Recovery

Requires Medicine.

Unlocks:

- Medic healing increases
- units that spend a whole turn without moving or attacking recover additional health while in friendly territory

No additional unit.

This branch therefore contains defensive, siege and sustain options without requiring a large roster.

---

# 10. Provisional unit roster

Use generic internal role names. Factions can later give them thematic names and artwork.

## Fighter

Available from start.

Cost: 2
HP: 10
Attack: 2
Defense: 2
Move: 1
Range: 1

Generic capture-capable infantry.

## Scout

Scouting.

Cost: 3
HP: 10
Attack: 1.5
Defense: 1
Move: 2
Range: 1

Large vision radius.

This is primarily exploration and positioning rather than cheap cavalry.

## Marksman

Marksmanship.

Cost: 3
HP: 10
Attack: 2
Defense: 1
Move: 1
Range: 2

Can move and shoot.

Fragile if engaged.

## Guard

Drill.

Cost: 3
HP: 15
Attack: 1.5
Defense: 3
Move: 1
Range: 1

Strong at holding cities and chokepoints.

## Raider

Raiding.

Cost: 4
HP: 10
Attack: 2.5
Defense: 1.5
Move: 2
Range: 1

Charge: bonus attack after moving two tiles before combat.

## Medic

Medicine.

Cost: 4
HP: 10
Attack: 0.5
Defense: 1.5
Move: 1

Can use its action to heal an adjacent friendly unit by 4 HP.

## Heavy

Metallurgy.

Cost: 5
HP: 15
Attack: 3
Defense: 3
Move: 1
Range: 1

Push: if the target survives and the tile behind it is free and traversable, push it one tile backward.

This gives the expensive front-line unit a positional identity rather than merely being Fighter++.

## Breacher

Explosives.

Cost: 5
HP: 10
Attack: 4
Defense: 1
Move: 1
Range: 1

Breach: ignores terrain, wall and city defensive bonuses.

This is intentionally not long-range artillery.

## Super unit / Juggernaut

Acquired from high-level city growth rather than normal training.

HP: ~40
Attack: 4
Defense: 4
Move: 1

Push.

The faction can later replace this with its own thematic superunit.

---

# 11. City level rewards

Keep these sparse.

The city already becomes better simply by leveling. Do not turn every level into management.

Provisional sequence:

### Level 2

Choose:

**Survey** — reveal a substantial area around the city.

or

**Stockpile** — gain 4 Coins.

### Level 3

Choose:

**Walls** — strong city defense.

or

**Militia** — spawn a free Fighter.

### Level 4

Choose:

**Expand** — territory grows from 3×3 to 5×5.

or

**Boom** — immediately gain +3 population toward the next level.

This choice is structurally excellent and worth retaining even though Polytopia has something very similar.

### Level 5+

Choose:

**Juggernaut** — spawn the faction's superunit.

or

**Treasury** — gain 5 Coins.

The intended dominant choice in conquest games will usually be the superunit, but immediate cash should occasionally be strategically preferable.

---

# 12. Technology costs

Research should become more expensive with empire size.

Initial tuning:

**Tier 1:**
5 + 1 × (cities − 1)

**Tier 2:**
7 + 2 × (cities − 1)

**Tier 3:**
9 + 3 × (cities − 1)

So with one city:

5 / 7 / 9.

With three cities:

7 / 11 / 15.

This is slightly more expensive at the upper tiers than Polytopia.

Reason: on a land-only map almost the entire tree is potentially relevant. There isn't a naval branch that can simply be ignored on a landlocked start, and tier-3 economic technologies create powerful spatial multipliers.

This should be playtested aggressively rather than treated as sacred.

---

# 13. Expected economic magnitudes

The numbers should deliberately permit occasional huge turns.

### Good agricultural city

5 Farms:

+10 population.

Good Windmill:

+5.

Total:

+15 from that agricultural complex.

### Good forest city

6 Lumber Camps:

+6.

Sawmill:

+6.

Total:

+12.

Cheaper to construct than the agricultural equivalent, but requires many Forest tiles.

### Excellent mining city

4 Mines:

+8.

Four-Mine Forge:

+8.

Total:

+16.

This should feel fantastic and relatively rare.

### Excellent stone formation

4 Quarries:

+4.

Stoneworks touching all four, with two opposite pairs:

+8.

Total:

+12.

### Mature mixed city

Workshop touching three different basics:

+3.

Grand Works touching three processors:

+6.

Potential later fourth processor:

+2 more.

These are exactly the sorts of bonuses that can push a mature city through multiple levels and produce the occasional level-9/10 metropolis.

That is desirable.

---

# 14. Important balance constraints

## Do not let basic improvements produce recurring Coins

A Farm should not simply cost 3 and produce +1 Coin/turn.

That creates too-linear a marginal cost for income and makes early reinvestment explode.

Basic economic development should overwhelmingly generate population; city levels translate population into recurring income through an increasingly expensive curve.

## Recurring-income buildings must be scarce and bounded

Hence:

- Market is tier 3;
- one per city;
- costs 7;
- rewards diversity rather than raw building count;
- has a practical maximum of 4–5 Coins.

## Cluster multipliers need limits

Windmill and Sawmill should provisionally cap at 8.

Without the cap, neighbouring expanded cities could create gigantic contiguous networks whose value becomes hard to reason about.

Forge doesn't need the same cap because adjacency provides a natural maximum of eight and +16 theoretical population is acceptable.

## Mixed combos should be hard but not fantastical

An earlier version of Grand Works required all four processor types.

Reject that.

In a normal 3×3 city it would almost never exist, and even 5×5 cities would require unusually perfect terrain.

Final rule:

**three out of four types unlocks it; the fourth makes it better.**

This makes +6 plausible and +8 special.

## Cross-city interaction should be selective

Do not let Windmills and Sawmills count another city's entire resource network.

That makes ownership difficult to understand and allows excessive double-counting.

However, purely local mixed buildings — Workshop, Grand Works and Market — may inspect friendly buildings on immediately adjacent tiles regardless of city ownership.

That gives neighbouring cities interesting interactions without making the underlying accounting obscure.

---

# 15. What makes this economy different

The underlying macro loop remains intentionally familiar:

**Coins → map development → population → city levels → more Coins / units.**

The microeconomic problem is different.

A player examining an undeveloped city isn't only asking:

> “How many resources can I harvest?”

They're simultaneously seeing:

**Clusters**

> “Those five fertile tiles could make a huge Windmill city.”

**Jackpot adjacency**

> “There are four ore deposits around this one empty tile.”

**Shapes**

> “Those Quarries line up perfectly for Stoneworks.”

**Diversity**

> “This mediocre-looking mixed terrain is actually an excellent Workshop/Market site.”

**Long-term recipes**

> “If this city expands, that empty square can eventually touch three advanced industries and become a Grand Works.”

This should mean that two cities containing the same number of resource tiles can have very different economic potential depending on their arrangement.

That's the central new mechanic.

---

# 16. MVP recommendation

Do **not** initially implement all 25 technologies.

Implement the entire data model, but make the first playable vertical slice:

- Gathering
- Farming
- Milling
- Craft
- Hunting
- Forestry
- Sawmilling
- Surveying
- Mining
- Metallurgy
- Scouting
- Roads
- Drill

And these units:

- Fighter
- Scout
- Marksman or Guard
- Heavy
- Juggernaut

Most importantly, make these four economic situations work correctly:

1. ordinary resource harvesting;
2. a connected Farm cluster feeding a Windmill;
3. several Mines feeding a Forge;
4. a Workshop rewarding mixed adjacent resources.

If those four interactions make the player stare at the terrain and plan several turns ahead, the economic concept works.

Only then add Stoneworks, Market, Grand Works and the rest of the combat tree.

The economic prototype is the thing that needs validation. The remaining technology tree is inexpensive content once the underlying spatial game is fun.
