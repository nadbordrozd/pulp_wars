# Ruleset 7 revision-4 biome economy

**Status:** authoritative specification approved for implementation

**Ruleset ID:** `pulp-wars-poc-7r4`

**Map-generation revision:** `REGIONAL_BIOMES_V1`

**Scope:** this document replaces the revision-3 map, resource, Mine/Forge,
Normal-AI economy, public-view wording, save identity, and corresponding
validation rules in [Pulp Wars Ruleset 7](RULESET_7.md). Revision 3 remains the
runtime baseline until the implementation child lands. Every other Ruleset-7
rule remains unchanged. The revision-2 design review, Ruleset 6, and their
release evidence are historical inputs, not authority for revision 4.

## 1. Decision summary

Revision 4 replaces the shuffled global terrain quotas with contiguous
`PLAINS`, `WOODLAND`, and `HIGHLANDS` regions. Terrain and resources remain
probabilistic inside every biome: every terrain and each of Fruit, Fertile
Ground, Game, and Ore has nonzero probability in every biome. Settlement-ring
specialization supplies a regional floor without making rings identical.

Ore returns as the only Mountain resource. Engineering reveals Ore and a Mine
requires Ore. Mine becomes 5 Coins for +2 live population. Forge remains 6
Coins but becomes +1 per adjacent same-city Mine, capped at +6. All other
basic and processor costs and outputs remain revision 3. In particular Farm is
5/+2, Lumber Camp is 3/+1, Windmill and Sawmill are +1 per support, Workshop is
2--4, and Grand Works is 8 or 10.

There is no separate one-off Mountain goodie. The selected highland floor,
Ore/Mine path, existing chests, and branch-neutral one-offs already cover its
prospective jobs without another resource, command, or variance source.

The four land-technology branches, all node prerequisites, and the research
price formula are unchanged.

## 2. Evidence and selection

### 2.1 Reproducible method

The analysis used temporary, untracked TypeScript/JavaScript programs. It did
not change production code or checked evidence. All percentages below are
observations, not replacement probability tables.

The revision-3 baseline calls the production `generateInitialMapV7` function.
The candidate model implements sections 3--5 literally with Mulberry32 version
1 and the production bounded-draw and Fisher--Yates semantics. Its categorical
draws compare the uint32 directly with
`floor(cumulativePercent * 2^32 / 100)` integer thresholds. Validation groups
tiles by generated region, performs one cardinal flood fill per region, and
rejects unless every region is four-way connected. For every row it uses seeds
`0..N-1`, Rival mode, Coral human, all-Original factions, and the listed
board/AI setup. Cooperative mode has identical map inputs and therefore does
not need a duplicate map sample. Each accepted map contributes every capital
and village ring. A ring is the eight Chebyshev-distance-1 noncenter tiles.

The three-way comparison used 20 seeds in all nine setups: Auto 11/1, 14/2,
and 16/3 plus every AI count on Large 20 and Huge 25. Thus each system produced
180 accepted maps. The selected system then used 100 seeds per setup: 900 maps,
11,300 settlement rings, and 4,238 highland rings. Repeating the selected
20-seed matrix produced byte-identical JSON.

The temporary-result SHA-256 values are recorded so root review can detect an
accidental comparison against a different run:

| Run                                       | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| revision-3 baseline, 20 seeds/setup       | `88acd0015d7ec7cdf40f8c17bf090ff6071d643f3e209a97245cbf61cc3c83af` |
| candidate A, 20 seeds/setup               | `7444be50eba998faacbbe9977fe8b9fc9da51a3975c8148beb21aada72247c21` |
| candidate B, 20 seeds/setup               | `23bad76aea1c44bbfcb8f7e8cff56a2f9be44c42ec12902eeb9563b13516982e` |
| selected C, final payoff, 20 seeds/setup  | `78f81f8cba5f3734bc82cea9d11bdd5ecbbc7153e2afb30cdf10215fc8d0a5b0` |
| selected C, final payoff, 100 seeds/setup | `5b4ba9e99d1465b87c83744aebe622d51bfc3ff73c67457891742d5fad3d4452` |

The model reports the accepted-attempt number, global terrain/resource rates,
capital and village ring distributions, highland distributions, capital
fairness score, generated-region sizes, and Mountain component sizes. It
rejects and continues from the post-attempt PRNG state exactly as section 5. A
separate implementation gate must reproduce these statistics from production;
the temporary hashes are provenance, not a golden corpus.

### 2.2 Revision-3 baseline

Revision 3 has exact global Mountain/Forest quotas, reserves two Forest
neighbors per settlement, uses the Ruleset-6 resources for candidate
acceptance, and then strips Ore and Stone. The fresh 20-seed/setup sample
confirms the larger 200-seed 14/2 audit recorded on the parent task.

| Board/AI | Maps | Mean/p95 attempt | Mountain % | Forest % | Fertile % | Ring Mountain | Ring Forest | Ring Fertile | Ring Mountain 0/1/2/3+ % |
| -------- | ---: | ---------------: | ---------: | -------: | --------: | ------------: | ----------: | -----------: | -----------------------: |
| 11/1     |   20 |         1.25 / 2 |      18.18 |    23.97 |     20.25 |          0.46 |        3.05 |         1.70 |        67.0/24.0/6.0/3.0 |
| 14/2     |   20 |         1.15 / 2 |      17.86 |    23.98 |     20.13 |          0.42 |        3.16 |         1.69 |        67.9/23.6/7.1/1.4 |
| 16/3     |   20 |         1.35 / 2 |      17.97 |    23.83 |     20.86 |          0.42 |        3.08 |         1.74 |        73.5/14.5/8.5/3.5 |
| 20/1     |   20 |         2.70 / 5 |      18.00 |    24.00 |     20.90 |          0.45 |        3.12 |         1.79 |        70.3/18.3/7.3/4.0 |
| 20/2     |   20 |         1.90 / 4 |      18.00 |    24.00 |     20.88 |          0.44 |        2.99 |         1.81 |        71.0/18.7/6.7/3.7 |
| 20/3     |   20 |         2.05 / 4 |      18.00 |    24.00 |     20.43 |          0.50 |        3.06 |         1.68 |       67.3/19.0/10.3/3.3 |
| 25/1     |   20 |         3.95 / 8 |      18.08 |    24.00 |     20.29 |          0.43 |        3.10 |         1.72 |        69.3/20.2/8.4/2.0 |
| 25/2     |   20 |         2.60 / 6 |      18.08 |    24.00 |     20.87 |          0.43 |        3.03 |         1.77 |        68.4/21.4/8.6/1.6 |
| 25/3     |   20 |         2.35 / 6 |      18.08 |    24.00 |     20.67 |          0.39 |        3.05 |         1.80 |        73.0/17.7/6.8/2.5 |

The parent 200-map 14/2 audit measured Mountain 17.86%, Forest 23.98%, and
Fertile Ground 20.69%. Across 1,400 settlement rings it measured 0.43
Mountains, 3.12 Forests, and 1.72 Fertile Ground, with 69.6%/20.9%/7.1%/2.4%
containing zero/one/two/three-plus Mountains. Capital and village results were
nearly equal. The defect is therefore the terrain shuffler and Forest
reservation, not chiefly the capital passability constraint.

### 2.3 Candidate systems

All candidates use the exact regional construction and settlement pass later
selected. They differ in conditional weights and payoff assumptions.

| Candidate       | Geographic intent                              | Notable terrain/payoff choice                                                                           |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A: soft regions | Low contrast; preserve revision-3 economy      | Highlands only 38% Mountain; Farm 5/+2, Camp 3/+1, Mine 6/+4, Forge +3/Mine                             |
| B: hard regions | Strongest contrast and compressed basics       | Highlands 55% Mountain; Plains 76% Grass; Farm 4/+1, Camp 4/+2, Mine 5/+3, Forge +2/Mine                |
| C: moderate     | Visible regions without frequent disconnection | Highlands 45% Mountain; Farm 5/+2, initially Camp 4/+2 and Mine 5/+3, then package-audited as section 6 |

The exact candidate terrain inputs, in Grass/Forest/Mountain order, were:

| Candidate |   Plains | Woodland | Highlands |
| --------- | -------: | -------: | --------: |
| A         | 65/25/10 | 40/48/12 |  42/20/38 |
| B         |  76/17/7 |  24/68/8 |  27/18/55 |
| C         |  68/23/9 | 32/56/12 |  32/23/45 |

The exact resource inputs are Grass Fruit/Fertile/none, then Forest Game/none,
then Mountain Ore/none:

| Candidate/biome |    Grass | Forest | Mountain |
| --------------- | -------: | -----: | -------: |
| A Plains        | 20/30/50 |  32/68 |    40/60 |
| A Woodland      | 18/20/62 |  45/55 |    40/60 |
| A Highlands     | 15/15/70 |  32/68 |    55/45 |
| B Plains        | 30/22/48 |  20/80 |    30/70 |
| B Woodland      | 15/10/75 |  55/45 |    30/70 |
| B Highlands     |  10/8/82 |  25/75 |    72/28 |
| C Plains        | 26/24/50 |  28/72 |    30/70 |
| C Woodland      | 17/13/70 |  48/52 |    38/62 |
| C Highlands     | 12/10/78 |  30/70 |    68/32 |

The modeled Farm/Camp/Mine cost/output and Forge output per Mine were A
`5/+2, 3/+1, 6/+4, +3`; B `4/+1, 4/+2, 5/+3, +2`; and initial C
`5/+2, 4/+2, 5/+3, +2`. Exact package arithmetic rejected initial C's Camp and
Industry changes; final C retains Farm/Camp at `5/+2, 3/+1`, changes Mine to
`5/+2`, and changes Forge to `+1/Mine` as section 6 specifies.

Weighted across the 180 maps per candidate:

| Candidate | Failed maps | Mean attempt | Worst setup p95 | Mountain % | Fertile % | Ore % | Mean ring Mountain/Ore | All-ring 2--4 Mountain % | Highland mean Mountain/Ore | Highland 2--4 Mountain % |
| --------- | ----------: | -----------: | --------------: | ---------: | --------: | ----: | ---------------------: | -----------------------: | -------------------------: | -----------------------: |
| A         |           0 |         2.33 |              16 |      15.93 |     13.44 |  8.67 |              1.35/0.86 |                     38.9 |                  2.97/2.17 |                     92.0 |
| B         |           0 |        20.90 |             214 |      21.13 |      8.90 | 14.36 |              1.55/1.07 |                     27.3 |                  4.02/2.96 |                     66.2 |
| C final   |           0 |         3.83 |              15 |      18.64 |      9.82 | 11.54 |              1.46/0.99 |                     35.9 |                  3.37/2.53 |                     83.1 |

A is reliable but too close to the old blended map and retains the Mine/Forge
economic spike. B makes the strongest regions, but Mountains form larger
barriers, highland rings overshoot the desired 2--4 band, and the worst setup's
p95 attempt reaches 214 of 256. Its Farm reduction and Camp increase also move
dominance from agriculture to timber. C keeps reliable acceptance, cuts global
Fertile Ground by about half, and puts the typical highland ring in the target
band. It is selected after the package correction in section 6.

### 2.4 Selected 100-seed evidence

Global rates and acceptance:

| Board/AI | Maps/failures | Mean/p95 attempt | Grass % | Forest % | Mountain % | Fruit % | Fertile % | Game % | Ore % |
| -------- | ------------: | ---------------: | ------: | -------: | ---------: | ------: | --------: | -----: | ----: |
| 11/1     |         100/0 |         2.48 / 7 |   50.69 |    31.22 |      18.08 |   10.08 |      9.24 |  12.00 | 11.02 |
| 14/2     |         100/0 |        5.18 / 14 |   51.68 |    28.67 |      19.65 |   10.28 |      9.71 |  11.22 | 12.42 |
| 16/3     |         100/0 |        6.34 / 19 |   59.25 |    25.29 |      15.46 |   12.45 |     12.31 |   9.30 |  9.30 |
| 20/1     |         100/0 |         2.18 / 5 |   49.40 |    30.48 |      20.12 |    9.71 |      9.19 |  11.92 | 12.56 |
| 20/2     |         100/0 |        4.43 / 12 |   49.06 |    31.66 |      19.27 |    9.37 |      9.01 |  12.79 | 12.07 |
| 20/3     |         100/0 |        8.27 / 19 |   49.99 |    30.73 |      19.29 |    9.39 |      9.30 |  12.24 | 12.16 |
| 25/1     |         100/0 |         2.06 / 5 |   52.68 |    29.18 |      18.14 |   10.60 |     10.26 |  11.79 | 11.34 |
| 25/2     |         100/0 |        3.48 / 10 |   52.46 |    29.28 |      18.26 |   10.86 |      9.95 |  11.75 | 11.45 |
| 25/3     |         100/0 |        5.08 / 14 |   51.91 |    29.52 |      18.58 |   10.38 |     10.20 |  11.74 | 11.42 |

The table's resource percentages are whole-board rates. The terrain-conditional
weights, not these observations, are normative.

Settlement rings and highland identity:

| Board/AI | Rings | Mean Mountain/Forest/Fertile/Ore | Mountain 0/1/2--4/5+ % | No Fertile/Ore % | Three-family % | Highland rings | Highland mean Mountain/Ore | Highland 2--4 Mountain % |
| -------- | ----: | -------------------------------: | ---------------------: | ---------------: | -------------: | -------------: | -------------------------: | -----------------------: |
| 11/1     |   500 |              1.34/2.37/0.97/0.88 |     43.0/20.2/34.0/2.8 |        34.0/56.0 |           31.0 |            148 |                  3.22/2.36 |                     90.5 |
| 14/2     |   700 |              1.49/2.25/0.93/1.00 |     42.1/16.0/36.6/5.3 |        38.7/52.6 |           29.3 |            247 |                  3.35/2.44 |                     85.0 |
| 16/3     | 1,000 |              1.13/1.91/1.19/0.77 |     52.3/14.3/30.2/3.2 |        30.8/61.7 |           26.9 |            268 |                  3.09/2.37 |                     88.1 |
| 20/1     | 1,500 |              1.54/2.39/0.91/1.05 |     42.0/15.4/34.9/7.7 |        39.0/52.4 |           30.3 |            512 |                  3.51/2.60 |                     77.5 |
| 20/2     | 1,500 |              1.43/2.47/0.91/0.96 |     44.3/14.5/35.7/5.5 |        36.8/55.0 |           29.1 |            486 |                  3.34/2.46 |                     82.9 |
| 20/3     | 1,500 |              1.44/2.33/0.97/0.97 |     43.4/16.3/34.5/5.9 |        35.5/55.0 |           29.1 |            494 |                  3.36/2.50 |                     82.2 |
| 25/1     | 2,200 |              1.45/2.36/1.01/0.96 |     42.0/18.4/33.2/6.5 |        33.3/55.4 |           30.3 |            676 |                  3.46/2.57 |                     79.1 |
| 25/2     | 2,200 |              1.53/2.27/0.97/1.01 |     39.9/18.1/35.9/6.1 |        36.0/53.4 |           29.7 |            718 |                  3.48/2.57 |                     81.2 |
| 25/3     | 2,200 |              1.47/2.33/1.00/0.97 |     41.0/19.3/33.7/6.1 |        34.7/54.6 |           30.0 |            689 |                  3.48/2.57 |                     80.6 |

No settlement ring lacks Forest because the regional floor requires Timber as
one of every biome's two families. Every ring has at least three opportunities
and two families; 26.9--31.0% naturally have all three. Unlike revision 3,
Fertile Ground is absent from 30.8--39.0% and Ore from 52.4--61.7% of all
rings. Every highland ring has at least two Ore by construction, so none lacks
Ore; the remaining variation comes from the probabilistic terrain/resource
field.

Capital and village means show that the fairness acceptance does not erase
regional village variance:

| Board/AI | Capital Mountain/Forest/Fertile/Ore | Village Mountain/Forest/Fertile/Ore | Capital score p05/median/p95 |
| -------- | ----------------------------------: | ----------------------------------: | ---------------------------: |
| 11/1     |                 1.24/2.25/1.01/0.78 |                 1.40/2.45/0.94/0.95 |                       6/9/15 |
| 14/2     |                 1.32/2.06/1.04/0.91 |                 1.61/2.38/0.85/1.06 |                      6/10/14 |
| 16/3     |                 0.98/1.73/1.28/0.66 |                 1.22/2.02/1.13/0.83 |                       6/9/12 |
| 20/1     |                 1.13/2.27/1.07/0.79 |                 1.61/2.41/0.88/1.09 |                       6/9/15 |
| 20/2     |                 1.30/1.93/0.99/0.92 |                 1.47/2.61/0.89/0.96 |                       6/9/14 |
| 20/3     |                 1.28/1.84/1.10/0.86 |                 1.50/2.51/0.93/1.02 |                       6/9/13 |
| 25/1     |                 1.34/2.20/1.18/0.92 |                 1.46/2.37/0.99/0.96 |                      6/10/16 |
| 25/2     |                 1.32/1.92/1.10/0.87 |                 1.56/2.33/0.95/1.03 |                       6/9/14 |
| 25/3     |                 1.30/1.96/1.14/0.91 |                 1.51/2.41/0.97/0.99 |                      6/10/14 |

Accepted capital scores have an absolute observed range of 6--17 and, by
invariant, a within-map range no greater than 5.

Region size is a direct contiguity measure because each region is constructed
as one Manhattan Voronoi cell and then asserted four-way connected. Across the
setups, region mean size is 40.3 on 11, 65.3 on 14, 64.0 on 16, 66.7 on 20,
and 62.5 on 25. Per-setup p05/p95 spans are 20/68, 33/106, 33/115, 30--34/
120--127, and 30--31/110--113 respectively. Mountain eight-way components
average 3.7--5.3 tiles and have p95 15--28, rather than requiring isolated
checkerboard Mountains.

## 3. Identities and state boundary

Revision 4 uses these exact changed identities:

| Boundary                                   | Exact value                         |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r4`                 |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r4.current`        |
| Map revision                               | `REGIONAL_BIOMES_V1`                |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V4` |

`BiomeId` has frozen order `PLAINS`, `WOODLAND`, `HIGHLANDS`. `ResourceId`
has frozen order `FRUIT`, `FERTILE_GROUND`, `GAME`, `ORE`. Stone is not a
revision-4 identifier. Terrain and every other frozen order remain unchanged.

`TileStateV7` gains the required exact key:

```ts
readonly biome: "PLAINS" | "WOODLAND" | "HIGHLANDS";
```

Biome is authoritative board state and participates in exact parsing,
canonical JSON, hashes, saves, and replays. The internal generation-region ID
is discarded after generation and is not serialized. A replay reconstructs
biome from its exact setup and seed.

## 4. Conditional distributions

All categorical draws compare one uint32 with cumulative thresholds in the
listed order. For integer percentage `p`, the cumulative threshold is
`floor(cumulativePercent * 2^32 / 100)`. The last arm receives all remaining
uint32 values, avoiding gaps and floating-point arithmetic.

### 4.1 Terrain given biome

| Biome     | Grass | Forest | Mountain |
| --------- | ----: | -----: | -------: |
| Plains    |   68% |    23% |       9% |
| Woodland  |   32% |    56% |      12% |
| Highlands |   32% |    23% |      45% |

### 4.2 Resource given biome and terrain

| Biome     | Grass: Fruit/Fertile/none | Forest: Game/none | Mountain: Ore/none |
| --------- | ------------------------: | ----------------: | -----------------: |
| Plains    |           26% / 24% / 50% |         28% / 72% |          30% / 70% |
| Woodland  |           17% / 13% / 70% |         48% / 52% |          38% / 62% |
| Highlands |           12% / 10% / 78% |         30% / 70% |          68% / 32% |

These positive conditional values are normative. Therefore every terrain and
every resource has nonzero unconditional probability in every biome. Resource
compatibility is exact: Fruit and Fertile Ground only on Grass, Game only on
Forest, and Ore only on Mountain.

## 5. Exact map algorithm

### 5.1 Retained setup and settlement lattice

Supported square sizes, minimum sizes by AI count, Auto resolution, settlement
counts, edge distance, Chebyshev settlement spacing 3, capital spacing
`floor(width / 2)`, faction/seat rules, and the 256-attempt limit remain as in
revision 3. Candidate rejection never rewinds the one Mulberry32 stream.

Within an attempt, retain the revision-3/v6 steps for the optional 16-board
offset, corner-capital shuffle, row-major village-lattice shuffle, capital
assignment shuffle, and turn-order shuffle. Do not retain the terrain shuffle,
reserved-Forest step, exact global terrain quotas, Ruleset-6 resource table, or
post-generation Ore/Stone strip.

### 5.2 Region construction

Let `nonSettlements` be every nonsettlement coordinate in row-major `(y,x)`
order. Shuffle it once with Fisher--Yates. The resulting ordinal is
`regionRank`; lower is earlier.

```text
regionCount = max(3, roundHalfUp(width * height / 64))
```

This gives 3, 3, 4, 6, and 10 regions on widths 11, 14, 16, 20, and 25.
Choose the first seed as rank 0. Repeatedly choose the nonsettlement coordinate
whose minimum Chebyshev distance to an existing seed is greatest; ties take
lower `regionRank`. Seed ordinal is selection order.

Create the label multiset by `BiomeId[seedOrdinal mod 3]`, then Fisher--Yates
shuffle that label array. Assign every board coordinate, including settlement
coordinates, to the seed with minimum Manhattan distance; ties take lower seed
ordinal. Each resulting region must be four-way connected and contain its
seed. Its biome is its shuffled label. This construction produces broad
contiguous identities without storing region IDs.

### 5.3 Terrain draw and simultaneous cohesion pass

For each nonsettlement coordinate in row-major order, consume one uint32 and
select `baseTerrain` from section 4.1 using its biome. A settlement has
`baseTerrain = GRASS` without a draw.

For every nonsettlement tile, inspect the base terrain of its up to eight
neighbors that belong to the same generated region. Find the largest count.
Ties prefer the tile's own base terrain when it is tied for largest; otherwise
they use frozen Terrain order. If the winning count is at least 5, final
terrain becomes that winner; otherwise it remains base terrain. All tiles read
the immutable base field, so iteration order cannot feed back. Settlements are
then final Grass.

This no-draw projection creates terrain patches inside the larger biome
regions. It never changes biome or region membership.

### 5.4 Resource draw and settlement-ring floor

After every final terrain is known, consume exactly one uint32 for each
nonsettlement coordinate in row-major order and select its resource from
section 4.2. Settlements use `resource: null` without a draw.

Then process settlements in `(y,x)` order without consuming PRNG. Define a
ring opportunity family as:

- Agriculture: Fruit or Fertile Ground;
- Timber: any Forest, whether it has Game or not;
- Metal: Ore.

Enforce these minimum family counts:

| Settlement biome | Agriculture | Timber | Metal |
| ---------------- | ----------: | -----: | ----: |
| Plains           |           2 |      1 |     0 |
| Woodland         |           1 |      2 |     0 |
| Highlands        |           0 |      1 |     2 |

For deficient families, visit family order Agriculture, Timber, Metal. Choose
the lowest-`regionRank` ring tile whose current family is absent or whose
current family exceeds that biome's minimum. Convert it to the canonical
opportunity: Grass + Fertile Ground, Forest + no resource, or Mountain + Ore.
Repeat until the current family reaches its minimum, then continue. Ring
footprints cannot overlap under spacing 3, so no later settlement can undo an
earlier floor.

The pass establishes at least three opportunities and at least two families
but retains all surplus probabilistic terrain/resources. In particular a
Highlands settlement gets two Ore, not exactly two Mountains.

### 5.5 Candidate acceptance

Reject a candidate if any condition fails:

1. revision-3 layout, settlement count, empty-Grass settlement, edge, spacing,
   capital-spacing, and dense row-major tile invariants;
2. every biome appears, region count is exact, every internal region contains
   its seed and is four-way connected, and every tile has exactly one biome;
3. every terrain and every resource appears globally, with exact
   resource/terrain compatibility;
4. every settlement ring has at least three opportunities and two families;
5. every capital has at least four non-Mountain ring tiles, and all capitals
   belong to one eight-way Grass/Forest component;
6. every capital development score is 6 through 17 inclusive, and
   `max(score) - min(score) <= 5` within the candidate.

Capital development score sums ring tiles as follows: Fruit 1; Fertile Ground
2; Forest 2 plus 1 if it has Game; Ore 2; other tiles 0. Forest receives its
second point for being both a Camp site and Sawmill support. This is a bounded
start-fairness heuristic, not a Coin valuation and not a requirement that
capitals have matching terrain.

Attempt 256 returns `MAP_GENERATION_FAILED` with the unchanged atomic failure
shape. The selected 900-map model had zero failures. Its per-setup mean attempt
was 2.06--8.27 and p95 was 5--19.

### 5.6 Draw order and chests

The complete attempt draw order is frozen:

1. 16-board offset bounded draw, when applicable;
2. capital-corner Fisher--Yates draws;
3. village-candidate Fisher--Yates draws;
4. capital-assignment Fisher--Yates draws;
5. turn-order Fisher--Yates draws;
6. nonsettlement region-rank Fisher--Yates draws;
7. biome-label Fisher--Yates draws;
8. one terrain uint32 per nonsettlement in row-major order;
9. one resource uint32 per nonsettlement in row-major order.

Seed selection, region assignment, cohesion, settlement flooring, and
validation consume no draw. A rejection continues from the state after step 9.

After acceptance, retain revision-3 chest counts, legal-candidate definition,
ordered sample without replacement, bounded draws, public behavior, and reward
resolution. The new terrain changes candidates and coordinates; revision-3 map
or post-generation-PRNG parity is deliberately obsolete.

## 6. Economy and technology arithmetic

### 6.1 Exact changed rules

Ore is visible on an explored tile only to a player with Engineering.
Engineering's unlock list becomes: reveal Ore; enter Mountain; +1 Mountain
sight; build an Ore Mine; build Workshop. Research is permanent, so revealed
Ore never hides again for that player.

Build Mine requires an owned, explored `MOUNTAIN + ORE` tile and Engineering.
It costs 5, covers the Ore marker by serializing `resource: null`, creates a
Mine, and contributes +2 live population. Pillage or Redevelop removes the Mine
and restores `ORE` on the unchanged Mountain, exactly as Farm removal restores
Fertile Ground. Capture preserves an intact Mine and its live contribution.

Forge costs 6, is one per city, and at placement must touch at least one
same-city Mine. It contributes +1 per adjacent same-city Mine, capped at +6.
It remains with zero output if support is later lost and resumes after Mine
rebuilding. Grand Works counts a Forge only while that Forge output is
positive. Market continues to count Mine/Forge as the Metal family.

Every other revision-3 economy rule remains exact, including costs, placement,
cluster adjacency, Workshop and Grand Works formulas, Road coexistence,
contribution order, restoration exclusions, income, growth, and reward
settlement.

### 6.2 Basic actions

| Action        | Tech path from start | Research at 1/3 cities | Build cost |   Population | Repeat Coin/pop | First copy at 1 city, Coin/pop |
| ------------- | -------------------- | ---------------------: | ---------: | -----------: | --------------: | -----------------------------: |
| Harvest Fruit | Gathering            |                  0 / 0 |          2 | +1 permanent |            2.00 |                   2 / 1 = 2.00 |
| Hunt Game     | Hunting              |                  5 / 7 |          2 | +1 permanent |            2.00 |                   7 / 1 = 7.00 |
| Farm          | Farming              |                 7 / 11 |          5 |      +2 live |            2.50 |                  12 / 2 = 6.00 |
| Lumber Camp   | Hunting + Forestry   |                12 / 18 |          3 |      +1 live |            3.00 |                 15 / 1 = 15.00 |
| Mine          | Drill + Engineering  |                12 / 18 |          5 |      +2 live |            2.50 |                  17 / 2 = 8.50 |

Research costs use the unchanged formula. At one city the relevant endpoint paths
are Farming 7, Farming+Milling 16, Hunting+Forestry 12,
Hunting+Forestry+Sawmilling 21, Drill+Engineering 12, and
Drill+Engineering+Metallurgy 21. At three cities those are 11, 26, 18, 33, 18,
and 33. Hunting and Industry also buy military/movement capabilities, so the
first-copy ratios are deliberately not forced equal.

Observed selected-ring means are roughly 0.9--1.2 Fertile, 1.9--2.5 Forest,
and 0.8--1.1 Ore. Multiplying by basic output gives about 1.8--2.4 potential
Farm population, 1.9--2.5 Camp population, and 1.6--2.2 Mine population before
geometry and competition. The geographic model therefore does not make one
basic family dominate expected population.

Those counts are also the basic support-site frequencies used by processors.
Across setups, 61.0--69.2% of rings have at least one Fertile site, 100% have a
Forest/Camp site, and 38.3--47.6% have an Ore/Mine site. Every highland ring has
at least two Ore, so at least the observed highland share of all settlements
(26.8--35.3%, depending on setup) begins with a strong two-Mine opportunity.
The higher Forest access is offset by Camp's +1 rather than Farm/Mine's +2 and
by the 21-Coin one-city path to Sawmilling. A processor still needs its legal
empty placement geometry; section 9 requires production evidence for exact
legal processor-site frequency rather than treating support count as proof of
placement.

### 6.3 Processors and packages

| Processor   | Exact output                                               | Cost | Marginal Coin/pop with 1/2/3 supports |
| ----------- | ---------------------------------------------------------- | ---: | ------------------------------------: |
| Windmill    | +1 per Farm in touched orthogonal same-city cluster, cap 8 |    5 |                    5.00 / 2.50 / 1.67 |
| Sawmill     | +1 per Camp in touched orthogonal same-city cluster, cap 8 |    5 |                    5.00 / 2.50 / 1.67 |
| Forge       | +1 per adjacent same-city Mine, cap 6                      |    6 |                    6.00 / 3.00 / 2.00 |
| Workshop    | +1 base +1 per distinct adjacent basic type; 2--4          |    4 |                    2.00 / 1.33 / 1.00 |
| Grand Works | +4 base +2 per distinct positive processor type; 8 or 10   |    7 |             0.88 / 0.70 for 2/3 types |

The processor's marginal ratio is not its package ratio. Exact ordinary and
strong same-family packages are:

| Package            | Build Coins | Live population | Build Coin/pop | One-city research + build | Total Coin/pop |
| ------------------ | ----------: | --------------: | -------------: | ------------------------: | -------------: |
| 1 Farm + Windmill  |          10 |               3 |           3.33 |                        26 |           8.67 |
| 2 Farms + Windmill |          15 |               6 |           2.50 |                        31 |           5.17 |
| 3 Farms + Windmill |          20 |               9 |           2.22 |                        36 |           4.00 |
| 1 Camp + Sawmill   |           8 |               2 |           4.00 |                        29 |          14.50 |
| 2 Camps + Sawmill  |          11 |               4 |           2.75 |                        32 |           8.00 |
| 3 Camps + Sawmill  |          14 |               6 |           2.33 |                        35 |           5.83 |
| 1 Mine + Forge     |          11 |               3 |           3.67 |                        32 |          10.67 |
| 2 Mines + Forge    |          16 |               6 |           2.67 |                        37 |           6.17 |
| 3 Mines + Forge    |          21 |               9 |           2.33 |                        42 |           4.67 |

This table is why the initially modeled Mine 5/+3 and Forge +2 was rejected:
two Mines + Forge would have cost only 16 build Coins for 10 population while
the Farm and Camp packages produced 6 and 4. The final 6-population Industry
package is close to Agriculture in construction efficiency, pays five more
research-inclusive Coins, and still bundles Guard, Workshop, Mountain
mobility/sight, and Heavy. The highland two-Ore floor therefore creates a
credible Industry region rather than an automatic superior economy.

Workshop's first one-type packages cost 16/19/21 and produce 4/3/4 total
population through Farm/Camp/Mine respectively, including Workshop. Its own
4-Coin marginal output remains 2, 3, or 4 for one, two, or three types.

The cheapest one-support two-processor Grand Works packages at one city are:

| Positive processors | Research | Buildings including basics and Grand Works | Population including Grand Works |  Total Coin/pop |
| ------------------- | -------: | -----------------------------------------: | -------------------------------: | --------------: |
| Windmill + Forge    |       46 |                                         28 |                               14 |  74 / 14 = 5.29 |
| Sawmill + Forge     |       51 |                                         26 |                               13 |  77 / 13 = 5.92 |
| Windmill + Sawmill  |       58 |                                         25 |                               13 |  83 / 13 = 6.38 |
| all three           |       67 |                                         36 |                               18 | 103 / 18 = 5.72 |

The research column uses the union of prerequisites, so it does not double
count Drill or Engineering. These are minimum legal packages; stronger support
improves the ratio but uses more sites and Coins. Grand Works remains a true
multi-branch capstone rather than evidence that a basic branch dominates.

### 6.4 Growth timing

Growth totals are unchanged: total population 2 reaches level 2, 5 reaches
level 3, 9 reaches level 4, and 14 reaches level 5. The following lower bounds
start with 5 Coins and a level-1 capital, add only its unsieged 2-Coin income at
successive own Start Turns, spend on the named path as soon as affordable, and
assume required sites. They exclude Fruit/Game acceleration, rewards, capture,
Markets, and competing spending.

| Development                                             | Total population | First reached level |                  Required income awards |
| ------------------------------------------------------- | ---------------: | ------------------: | --------------------------------------: |
| Two Fruit harvests                                      |                2 |                   2 | 0, if both are initially owned/explored |
| Farming + one Farm                                      |                2 |                   2 |                                       4 |
| Hunting + two Game hunts                                |                2 |                   2 |                                       2 |
| Hunting + Forestry + two Camps                          |                2 |                   2 |                                       7 |
| Drill + Engineering + one Mine                          |                2 |                   2 |                                       6 |
| Farming + Milling + two Farms + Windmill                |                6 |       3, 1 progress |                                      10 |
| Hunting + Forestry + Sawmilling + three Camps + Sawmill |                6 |       3, 1 progress |                                      13 |
| Drill + Engineering + Metallurgy + two Mines + Forge    |                6 |       3, 1 progress |                                      13 |

The comparison is intentionally sequential: level-2 income rises to 3 after a
qualifying build, and that higher income is used thereafter. A highland capital
therefore has a guaranteed Industry route but not an immediate level spike.

### 6.5 Mountain-goodie decision

A separate one-off was evaluated as a design alternative, not added to the draw
table. Any useful version needs a new resource ID, reveal rule, command/event,
population contribution, AI valuation, UI/art, save parsing, and telemetry. If
placed on highland Mountains it would correlate an early bonus with the same
rings that already guarantee two Ore; if placed independently it would add
variance without repairing revision 3's absent Mountains.

The selected model already gives every highland ring two Ore, 2.37--2.60 mean
Ore, and 77.5--90.5% probability of 2--4 Mountains in the tested setups. After
the corrected Mine/Forge values, this produces a paced level-2/3 path rather
than a shortage or jackpot that needs a one-off correction. Existing Fruit,
Game, and globally public chests cover early conversion and exploration
rewards. No demonstrated pacing or variance problem remains for a Mountain
goodie to solve, so revision 4 omits it.

## 7. Public view, UI, and AI

### 7.1 Visibility and exact wording

An explored tile exposes its biome and terrain. An unexplored tile exposes
neither; the unexplored `PlayerTileViewV7` arm stays unchanged, while the
explored arm gains required `readonly biome: BiomeIdV7`. The tile dock identity
line is exactly one of `Plains · Grass`, `Plains · Forest`,
`Plains · Mountain`, `Woodland · Grass`, `Woodland · Forest`,
`Woodland · Mountain`, `Highlands · Grass`, `Highlands · Forest`, or
`Highlands · Mountain`.

Fruit and Fertile Ground remain revealed by starting Gathering. Game remains
visible from match start. Before the viewer has Engineering, an explored
Mountain serializes no public resource marker or `UNKNOWN_RESOURCE` clue; it
does not reveal whether Ore exists. After Engineering, Ore is shown as `Ore`.
An intact visible Mine remains `Mine` regardless of the viewer's research.

Engineering details must say: `Reveal Ore. Enter Mountains. Build Mines on
Ore. Build Workshops. Units on Mountains gain +1 sight.` Build Mine must say
`Build Mine · 5 Coins · +2 population`; Forge must say
`Build Forge · 6 Coins · +1 population per adjacent Mine (maximum 6)`.
Removal facts show restored Ore only to a viewer whose after-state view may
reveal it.

No new art asset is required by this specification. Biome text and accessible
semantics are required; later art direction may add biome presentation in a
separate asset task.

### 7.2 Deterministic Normal policy

Normal remains PRNG-free and public-view-only. Exact command priority and tuple
ordering remain revision 3. Recompute all previews and spatial scores from the
new Mine/Forge outputs, restored Ore, and Forge placement minimum.

Before Engineering, Normal may value prospecting only from public biome and
terrain. For each explored owned Mountain, add its biome's integer Ore prior
from section 4.2 (30, 38, or 68) to `oreProspectPoints`. A shortest chain ending
in Engineering receives `floor(oreProspectPoints / 100)` economic-target units
in `strategicValue`, plus the existing Workshop, Mountain movement/sight, and
role values. For that research candidate only, set `objectiveValue` to
`oreProspectPoints mod 100`; other research candidates retain 0 there. This is
the last prospecting tie-break before the frozen command fields in the existing
tuple. It never creates a Mine candidate, reserves a hidden tile, or infers a
specific Ore marker.

After Engineering, only exact visible owned Ore contributes Mine targets and
spatial reservations. Forge planning counts +1 per exact adjacent same-city
Mine and may not propose initial placement without one. Repair valuation treats
a removed Mine as a known rebuild target only when restored Ore is public to
that player. Hidden Ore contributes zero to commands, exact previews, and
future placement graphs. Equal public views must still produce byte-identical
candidates, scores, commands, and work slices.

## 8. Persistence and compatibility

Revision-4 setup, state, save, replay, headless selection, browser routing, and
registry require exact ruleset ID `pulp-wars-poc-7r4` and map revision
`REGIONAL_BIOMES_V1`. Numeric schema/envelope version remains 7, but revision-3
state is structurally and semantically incompatible because it lacks biome and
uses a different exact ruleset/map identity.

Revision 4 reads and writes only `pulpWars.save.v7r4.current`. On revision-4
browser startup, before Hub save-state derivation, remove only these known
incompatible development keys:

```text
pulpWars.save.v7.current
pulpWars.save.v7r2.current
pulpWars.save.v7r3.current
```

Report which exact keys were removed. Do not parse, migrate, reinterpret, or
offer them. Preserve Ruleset-6 `pulpWars.save.current`,
`pulpWars.settings.v1`, the revision-4 key, and all unrelated storage. Restart,
Replace, Delete, and Resume affect only the active route's revision-4 key.

Old v7 ruleset IDs and replays reject as incompatible, not corrupt, when their
envelope is otherwise recognizable. No revision-3 save migration is permitted.

## 9. Implementation and validation contract

The implementation child must keep production code, tests, generated evidence,
and any public documentation synchronized. At minimum it must add:

- exact-order/threshold tests for all biome, terrain, and resource boundaries,
  including `0`, each threshold minus/at, and `0xffffffff`;
- seed, farthest-point tie, Manhattan assignment tie, region connectivity,
  simultaneous cohesion, settlement-floor donor, and no-extra-draw tests;
- rejection-stream continuation, attempt-256 failure, fixed-seed clone/hash,
  setup/count/spacing/reachability, capital-score, and global-presence tests;
- strict biome/Ore state, PlayerView, event, save, replay, canonical hash,
  malformed-data, and old-revision incompatibility tests;
- Ore reveal/non-leak tests before and after Engineering; Mine build, cover,
  Pillage/Redevelop restoration, capture, rebuild, and contribution tests;
- Forge 1--6 support, placement minimum, outage/resumption, Workshop/Market/
  Grand Works dependency, preview, and negative-population tests;
- public-query and Normal tests for prospect priors, exact revealed targets,
  hidden-Ore equivalence, repair, package ordering, and deterministic ties;
- DOM/Canvas semantic wording, action cost/output, tooltip, autosave cleanup,
  restart/resume, and route-isolation tests.

The production simulation gate uses seeds `0..999` for all nine setups listed
in section 2.1 and both Rival/Cooperative setup parsing, while avoiding a
duplicate map run when only mode differs. Generate every map twice and require
equal board, settlement assignment, treasures, post-generation PRNG state, and
canonical hash. Require:

| Metric                  | Gate                                                  |
| ----------------------- | ----------------------------------------------------- |
| hard failures           | 0                                                     |
| attempt distribution    | p99 <= 64; no accepted attempt above 192              |
| global Mountain         | 14--22% per setup                                     |
| global Forest           | 24--33% per setup                                     |
| global Fertile Ground   | 8--13% per setup                                      |
| global Ore              | 8--14% per setup                                      |
| settlement floor        | 100% have >=3 opportunities and >=2 families          |
| three-family rings      | 20--40% per setup                                     |
| all-ring 2--4 Mountains | 25--45% per setup                                     |
| highland Ore access     | 100%; mean 2.2--2.9                                   |
| highland Mountains      | mean 2.8--3.8; >=75% and <=95% have 2--4              |
| capital fairness        | every score 6--17; within-map range <=5               |
| region geography        | every region four-way connected; region-size p05 >=16 |
| Mountain geography      | mean eight-way component >=3; component p95 >=12      |

Also report separate capital/village ring histograms, zero/one/2--4/5+
Mountain counts, Fertile/Forest/Ore access, basic support counts, legal
Windmill/Sawmill/Forge/Workshop/Grand Works sites, region/component size
histograms, attempt/failure causes, and fixed-seed hashes. Gates apply to
production output, not the temporary model; a material miss requires revising
this specification rather than silently tuning implementation constants.

The risk profile for the implementation is `ai/map/persistence` plus the
engine/rules, browser-visible, and legacy-storage gates required by repository
policy. Revision-3/v6 map parity tests must be removed or scoped to their
historical rulesets; Ruleset-6 goldens remain byte-for-byte frozen.

## 10. Frozen revision-4 judgments

- Use three contiguous regional biome identities with the exact weights,
  region algorithm, smoothing, and settlement floor above.
- Preserve nonzero terrain/resource probability in every biome and reject any
  accepted board missing a terrain or resource globally.
- Restore Ore as the only Mountain resource; Engineering reveals it and Mine
  requires, covers, and restores it.
- Mine is 5/+2. Forge is 6/+1 per Mine, cap 6, and requires positive support at
  placement. Farm, Camp, Windmill, Sawmill, Workshop, Grand Works, and Market
  retain revision-3 values.
- Preserve the four-branch, 21-node tree and research prices.
- Omit a Mountain one-off goodie.
- Break revision-3 saves under exact revision-4 identity and clean only the
  three named Pulp Wars development keys.
- Do not change Ruleset 6, Candy, the separately queued Road/Heavy work, or
  production art in this feature.
