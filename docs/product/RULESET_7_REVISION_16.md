# Ruleset 7 revision 16: starting growth, economy deflation, 2-tile boats, and orthogonal shallow water

**Status:** contract (`pulp_wars-72r`), partly implemented. It is
implemented by three beads in order: `pulp_wars-wwc` (identity, capital
growth guarantee, orthogonal shallow water; implemented, see
[section 13](#13-implementation-record)), `pulp_wars-zsa`
(2-tile boats and landing reach; implemented, see
[section 13.5](#135-revision-16b-2-tile-boats-pulp_wars-zsa)), and
`pulp_wars-4gc` (economy deflation);
see [section 9](#9-implementation-split-and-sequencing). Until revisions 13–16
are folded into [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(`pulp_wars-vkq.16`), this overlay together with
[revision 15](RULESET_7_REVISION_15_BALANCE.md),
[revision 14](RULESET_7_REVISION_14_BALANCE.md), and
[revision 13](RULESET_7_REVISION_13_UNDEAD.md) describes the running game.

**Ruleset ID:** `pulp-wars-poc-7r16`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (label unchanged;
generation changes, see [sections 3](#3-capital-growth-guarantee) and
[4](#4-orthogonal-shallow-water))

**Scope:** an overlay over the revision-15 contract. It guarantees that every
capital can reach level 2 on its owner's first turn from resources in its own
territory, classifies water as Shallow only when it shares an edge with land,
gives Patrol Boats and embarked units Move 2 with landing counted inside that
budget, and deflates the economy by changing numbers only (technology cost
and two income caps). Every unmentioned revision-15 rule stays in force for
both factions. Rulesets 5 and 6 and historical Ruleset 7 fixtures remain
frozen.

## 1. Sources and decided direction

The user's direction of 2026-09-30:

- "make sure that a starting city can always be levelled up within 2 turns
  (there is enough resources around)";
- "figure out how to balance the economy better. right now it's too easy to
  get lots of money and discover all the tech. resources are too generous or
  costs are too low. you can tweak this by purely numerical changes, no need
  to change the mechanics. we will keep iterating on this so your solution
  doesn't have to be the last word but right now we need to deflate the
  economy.";
- "boats including transports should move 2 tiles not 3. disembarking should
  be included in the 2 tiles distance. that is a unit in naval transport
  should be able to disembark if the land tile is right next to it or if it
  is separated from the land tile by only 1 water tile.";
- "water tiles should count as shallow water if they are adjacent to land in
  one of 4 direction. if the only adjacency to land is diagonal, the tile is
  deep water."

| #   | Item                     | Decided rule                                                                                                                                                                                                         | Bead  |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Capital growth guarantee | Every capital's eight-cell ring holds at least two growth resources of one kind (Fruit, Game, or Fish), enforced by a deterministic growth floor and a new map invariant ([section 3](#3-capital-growth-guarantee)). | `wwc` |
| 4   | Orthogonal shallow water | Water is Shallow iff one of its four orthogonal neighbours is land; the map's Shallow-share minimum falls from 40% to 25% of water ([section 4](#4-orthogonal-shallow-water)).                                       | `wwc` |
| 3   | 2-tile boats             | Patrol Boat and embarked Move 3 → 2; `DISEMBARK` costs one movement point ([section 5](#5-two-tile-boats-and-landing-reach)).                                                                                        | `zsa` |
| 2   | Economy deflation        | Tier-2 and tier-3 research costs rise with city count; the level term of income caps at 4; a Market pays at most 3 ([section 6](#6-economy-deflation)).                                                              | `4gc` |
| id  | Identity                 | `pulp-wars-poc-7r16`, autosave `pulpWars.save.v7r16.current`, cleanup through `v7r15` ([section 2](#2-identity-and-compatibility)).                                                                                  | `wwc` |

The measurements behind every number were made for this spec on a throwaway
copy of the source tree in the session scratchpad (never committed): a
map-generation sweep of 6,000 maps per variant and Normal-against-Normal
economy runs. They are summarized in each section.

## 2. Identity and compatibility

| Boundary                                   | Revision-16 value                |
| ------------------------------------------ | -------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r16`             |
| Game-state schema                          | `7`                              |
| Command/event/save/replay numeric versions | `7`                              |
| Browser autosave                           | `pulpWars.save.v7r16.current`    |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`       |
| Factions and trees                         | unchanged (`ORIGINAL`, `UNDEAD`) |

- A revision-16 reader rejects `pulp-wars-poc-7r15` and every earlier Ruleset
  7 identity in setups, states, saves, and replays; there is no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r15.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- No state, command, event, or view shape changes. Every change in this
  revision is a map-generation rule, a numeric value, or a legality condition
  on existing commands.
- Every naval map changes (Shallow/Deep classification and the Fish/Pearl
  draws that depend on it), and every map whose capital lacked the growth
  guarantee changes (growth floor). A Dry Land board whose capitals already
  satisfy the guarantee and whose candidate sequence is unchanged is
  byte-identical to revision 15.
- The identity changes once, in `pulp_wars-wwc`. `pulp_wars-zsa` and
  `pulp_wars-4gc` change rules under the same identity; revision 16 is
  complete only when `pulp_wars-4gc` lands (the revision-14 precedent, where
  AI and UI beads followed under one identity).

## 3. Capital growth guarantee

### 3.1 Definition

A capital **can level up within two turns** when its owner, acting alone and
spending only the owner's own Coins, can make the capital reach level 2 by
the end of the owner's second turn using research, harvest, and Port
commands on that capital's territory, whatever the other players do in
between. This revision guarantees the stronger condition below, which makes
level 2 reachable on the owner's **first** turn.

The arithmetic of the opening ([current rules §3](RULESET_7_CURRENT.md#3-players-turns-and-victory),
[§4.2](RULESET_7_CURRENT.md#42-population-growth-and-levels),
[§6.1](RULESET_7_CURRENT.md#61-research-cost),
[§8.2](RULESET_7_CURRENT.md#82-resource-and-basic-actions)), unchanged by this
revision:

- a seat starts with 5 Coins and its first Start Turn pays the level-1
  capital's income of 2 (level 1 + capital 1), so the first turn has
  **7 Coins**;
- level 2 needs total population 2, and a capital starts at 0;
- the first tier-1 technology is free; Harvest Fruit (Gathering), Hunt Game
  (Hunting), and Harvest Fish (Shorecraft) each cost 2 Coins and give +1
  permanent population; Fruit, Game, and Fish are visible on every explored
  tile, and the capital's 3 × 3 territory is explored at the start.

So two growth resources of one kind in the capital's territory cost 4 of the
first turn's 7 Coins: free research, two harvests, level 2 on turn 1, with 3
Coins left (enough to also train a Fighter) and the level-2 reward (Survey or
Stockpile +4) on the same turn. The later tier-2 economy research (Farming,
Forestry) is not needed.

### 3.2 Growth-ready capital (map invariant)

A **growth resource** is a Fruit on Grass, a Game on Forest, or a Fish on
Shallow Water. Fish counts only on non-`DRY_LAND` maps (Shorecraft is not
offered on Dry Land, and Dry Land has no water).

A capital is **growth-ready** when its eight ring cells (its 3 × 3 footprint
minus the center) hold at least **two growth resources of the same kind**.
Every capital of every accepted revision-16 map is growth-ready. The new map
invariant code is `CAPITAL_GROWTH`, appended to `MapInvariantCodeV7`.

The ring is exactly the capital's starting territory: settlements are at
least Chebyshev 3 apart, so no ring cell belongs to another settlement.

### 3.3 Growth floor

A deterministic, PRNG-free pass makes most candidates growth-ready without
rejecting them. It runs once per candidate, after the settlement ring floors
and, on naval maps, after the water resource draws, immediately before
validation:

1. Visit the capitals in `(y, x)` order.
2. Count Fruit, Game, and (on naval maps) Fish on the ring. If any kind has
   at least 2, the capital is done.
3. Otherwise consider Fruit and Game. The **eligible cells** for Fruit are
   ring land cells that are Grass with no resource, no site, and no
   improvement; for Game, ring Forest cells with no resource, no site, and no
   improvement. A kind is **feasible** when its eligible cells number at least
   `2 − current count`.
4. Choose the feasible kind that needs fewer additions; on a tie, Game when
   the capital's own biome is `WOODLAND`, otherwise Fruit.
5. Place that resource on the needed number of eligible cells in ascending
   topology rank (the same `rank` order that the settlement floors use).
6. If neither kind is feasible, change nothing; validation then fails the
   candidate with `CAPITAL_GROWTH` and generation continues with the next
   candidate, as for every other invariant.

The floor never changes terrain and never removes or replaces a resource, so
it never undoes a settlement-ring family floor (a Fruit on empty Grass adds an
Agriculture opportunity; a Game on Forest keeps its Timber family). It never
places Fish, Pearls, Fertile Ground, or Ore. Chests are placed after
acceptance on cells without resources, so they never cover a floor resource.

### 3.4 Acceptance and fairness

- `CAPITAL_GROWTH` is evaluated with every other invariant, on the final
  candidate board.
- Capital fairness (`CAPITAL_SCORE`: every capital's development score 6–17,
  spread at most 5) is evaluated **after** the floor. Each placed Fruit or
  Game adds 1 to the capital's score, so a floor can push a candidate out of
  the fairness band; such a candidate is rejected, never relaxed.
- The 256-candidate budget and every other invariant are unchanged. Villages
  get no growth guarantee.
- Measured with the floor and the [section 4](#4-orthogonal-shallow-water)
  rules together (seeds 0–99 of every map type and legal size/AI-count cell,
  6,000 maps): **every map is accepted**, and every capital is growth-ready.
  Mean candidate attempts by map type, revision 15 → revision 16: Dry Land
  4.4 → 3.8, Pangea 2.9 → 3.6, Continents 5.2 → 6.1, Archipelago 14.7 →
  12.1, Lakes 1.6 → 1.8. The worst cell is 20 × 20 three-AI Archipelago
  (worst attempt 112 → 223 of 256); `pulp_wars-wwc` sweeps its tight cells
  over 1,000 seeds (section 10.1).

### 3.5 Current maps (rationale)

Revision-15 maps, seeds 0–99 of all 60 cells (17,000 capitals):

| Map type    | Capitals with ≥ 2 of one growth kind (the guarantee) | Capitals that can reach level 2 within two turns at all |
| ----------- | ---------------------------------------------------: | ------------------------------------------------------: |
| Dry Land    |                                                41.2% |                                                   49.3% |
| Pangea      |                                                33.8% |                                                   61.7% |
| Continents  |                                                32.3% |                                                   64.1% |
| Archipelago |                                                35.9% |                                                   69.6% |
| Lakes       |                                                32.6% |                                                   56.9% |
| All         |                                            **35.1%** |                                               **60.3%** |

The right-hand column is the exact two-turn condition of section 3.1 with the
9 Coins of two turns (7 + a second income of 2): two growth resources of any
kinds (free technology, one harvest, a second tier-1 technology for 5, the
second harvest on turn 2), or one Fish (a Port for 4 on the same tile plus
the harvest), or two Shallow Water ring cells (two Ports). So four capitals
in ten currently cannot reach level 2 within two turns at all, and two in
three cannot do it with one technology. Under the Normal AI (Human mirror,
11 × 11 and 14 × 14, all map types, 160 seats), 29% of capitals reach level 2
by their owner's second turn today.

### 3.6 Normal AI opening

Revision 12's opener ([current rules §16](RULESET_7_CURRENT.md#16-normal-ai-summary))
surveys radius 2, which includes cells the capital cannot harvest. Revision 16
adds two rules for the Normal AI (both factions):

1. **Growth-first research.** Before the revision-12 scores, if one or more
   offered tier-1 technologies among Gathering, Hunting, and Shorecraft
   unlock at least two visible growth resources of their kind (Fruit, Game,
   Fish) on explored tiles of the original capital's own territory, the free
   opener is the one with the most such resources; ties follow technology
   order. Otherwise the revision-12 scores apply unchanged.
2. **Growth before other spending.** While the original capital is level 1
   and a harvest of a growth resource in its territory is legal and
   affordable, that harvest outranks research, training, and construction.

Measured with rule 1 alone on growth-floor maps (160 seats): every capital
reaches level 2 by its owner's third turn, but only 52% by the second,
because the policy spends turn 1's remaining 7 Coins on Farming; rule 2 is
what makes the second-turn target reachable. Required evidence is in
section 10.1.

## 4. Orthogonal shallow water

### 4.1 Classification

On every non-`DRY_LAND` map, a water cell is `SHALLOW_WATER` if and only if at
least one of its four orthogonal neighbours (on the board) is land; every
other water cell, including water whose only land contact is diagonal, is
`DEEP_WATER`. Cells off the board do not count. (Revision 15 used the eight
neighbours.)

Classification happens once, at generation. No command turns land into water
or water into land (Blast Mountain, Clear Forest, Cultivate Forest, and
Replant Forest only change land terrain), so terrain never needs
reclassification at runtime.

### 4.2 Consequences

| Rule                            | Revision 16                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Water resources                 | Unchanged tables on the new classes: Shallow 28% Fish / 10% Pearls, Deep 16% Pearls. Fish therefore exists only on edge-adjacent water.                                                            |
| Harvest Fish                    | Unchanged (Shallow Water + Fish).                                                                                                                                                                  |
| Port placement                  | Unchanged wording: owned Shallow Water with no improvement, site, or Road, and a land cell of the **same city** among its **eight** neighbours. The Shallow test itself is the new orthogonal one. |
| Movement                        | Unchanged: Shallow needs Shorecraft, Deep needs Navigation. A diagonal-only corner of a coast is now Deep.                                                                                         |
| Sea trade, landing, sea escape  | Unchanged algorithms on the new classes (sea trade already crosses Deep Water with Navigation).                                                                                                    |
| Map acceptance: Shallow minimum | Shallow Water must be at least **25%** of the map's water (was 40%). The Deep minimum `max(4, floor(water / 10))` is unchanged.                                                                    |
| Every other naval invariant     | Unchanged, evaluated on the new classes (`NAVAL_TOPOLOGY`, `NAVAL_REACHABILITY`, `COASTAL_SETTLEMENT`, `CAPITAL_SEA_ESCAPE`, landing frontiers).                                                   |
| Normal AI                       | No policy change: the AI reads public terrain. Its Shorecraft opener and Port scoring see fewer Shallow cells and less Fish.                                                                       |

### 4.3 Measurements

Seeds 0–99 of every legal naval cell (4,800 maps):

| Map type    | Shallow share of water, r15 → r16 | Fish per map, r15 → r16 | Smallest Shallow share of one map (r16) |
| ----------- | --------------------------------: | ----------------------: | --------------------------------------: |
| Pangea      |                     60.0% → 43.0% |             16.9 → 12.2 |                                    0.33 |
| Continents  |                     63.7% → 47.3% |             28.8 → 21.4 |                                    0.31 |
| Archipelago |                     49.2% → 34.6% |             30.1 → 21.2 |                                    0.23 |
| Lakes       |                     71.4% → 57.7% |             14.7 → 12.0 |                                    0.43 |

- With the old 40% minimum the orthogonal rule fails large Archipelagos: 20 ×
  20 two-AI Archipelago rejected all 256 candidates on 5 of seeds 0–9. The
  minimum was sized for the eight-neighbour rule and is a sanity band, not a
  gameplay target, so it falls to 25%. With 25% every map of the sweep is
  accepted (section 3.4); the 25 × 25 Archipelago cells now reject a few
  candidates at the floor (smallest accepted share 0.25).
- Fish falls by about 26% on naval maps. This deflates water-heavy economies
  slightly and is intended.

## 5. Two-tile boats and landing reach

### 5.1 Move values

| Unit or form           | Revision 15 | Revision 16 |
| ---------------------- | ----------: | ----------: |
| Patrol Boat (both)     |           3 |       **2** |
| Battleship (both)      |           2 |           2 |
| Embarked land unit     |           3 |       **2** |
| Knight, Vampire (land) |           3 |           3 |

Every water step still costs one full movement point (2 half-points); water
has no Road edges. Nothing else about naval units or the embarked form
changes (Defense 1, Sight 1, no Attack, no retaliation, no ZOC, no recovery).

### 5.2 Movement points and `DISEMBARK`

An embarked unit has 2 movement points per turn. Landing is a step and costs
**one** of them:

```text
spent(unit)     = unit.activation.moved ? unit.activation.movedPathLength : 0
DISEMBARK legal = the revision-15 conditions  and  spent(unit) <= 1
```

- The revision-15 conditions stay: the unit is embarked and not handled; the
  target is an adjacent (Chebyshev 1) land cell, empty, enterable by the unit
  (Mountain needs Engineering), and not in allied territory.
- `movedPathLength` already counts the traversed cells of the unit's Move,
  and every embarked step is one water step, so it equals the points spent.
  No state field is added.
- A failed budget check is rejected with the existing `MOVEMENT_ILLEGAL`
  code, atomically.
- Landing still ends the activation, sets `moved` and `handled`, and leaves
  the unit unable to capture until a later turn. Treasure, Field Defense
  destruction by occupation, and sight on landing are unchanged.
- The Move itself is unchanged: interruption by a hidden occupant or newly
  seen ZOC ends it early, and a unit whose Move stopped after one cell may
  still land. ZOC does not block `DISEMBARK` (leaving ZOC is free).

### 5.3 Reach

From its start-of-turn cell `S`, an embarked unit may land on:

- any legal land cell adjacent to `S` (`DISEMBARK` directly, 1 point); or
- any legal land cell adjacent to a water cell `W` that the unit can enter
  with a one-cell Move from `S` (Move to `W`, 1 point; then `DISEMBARK`,
  1 point).

So the landing cell is at most Chebyshev 2 from `S`, with at most one water
cell between, exactly as the user asked. After a two-cell Move the unit
cannot land that turn. Embarking is unchanged: a land unit ends a Move on an
own active, empty Port or Shipyard and is exhausted for that turn.

### 5.4 Queries, previews, and UI

- The public command query offers `DISEMBARK` only when `spent(unit) <= 1`,
  and `MOVE` paths with the Move-2 budget.
- Public unit stats show Move 2 for Patrol Boats and embarked units.
- **Landing preview (UI).** For a selected embarked unit that has not moved,
  the board marks the direct landing cells and, separately, the cells
  reachable by one water step then landing. Choosing a two-step landing cell
  sends `MOVE` to the intermediate water cell (the first in `(y, x)` order
  among the offered one-cell Move destinations adjacent to the target), then
  `DISEMBARK`; if the Move is interrupted before reaching that cell, the UI
  does not send `DISEMBARK`. After a one-cell Move only direct landing cells
  are marked; after a two-cell Move none.
- Help and unit text: "At sea: Move 2; landing uses 1 of it."

### 5.5 Normal AI

- Every AI estimate of embarked reach uses Move 2 (`src/ai/v7.ts` hard-codes
  3 today), and the transport planner lands only when `spent <= 1`, so it
  never issues a rejected `DISEMBARK`.
- The policy otherwise keeps its revision-15 naval priorities. Slower
  invasions are expected to lengthen some Archipelago and Continents games;
  that is measured, not tuned, in `pulp_wars-zsa` (section 10.2).

## 6. Economy deflation

### 6.1 Evidence

The [balance report §7.4](../validation/RULESET_7_UNDEAD_BALANCE.md#74-economy)
found income outrunning every outlet after round ~35, and revision 14's E2
cut late Market and level income. For this spec, Normal-against-Normal Human
mirrors were re-measured on revision 15 (scratch runs, 70-round cap for 1v1
11/14, 80 for 20 × 20):

| Revision 15                                          | 1v1 11 × 11 and 14 × 14 (80 games) |   1v1 20 × 20 (15 games) |
| ---------------------------------------------------- | ---------------------------------: | -----------------------: |
| Income at round 10 / 20 / 30 / 40                    |           5.3 / 13.0 / 19.6 / 22.4 | 5.8 / 16.3 / 44.0 / 59.6 |
| Share of round-30 income from level / Market         |                          61% / 32% |                58% / 38% |
| Coins carried into round 30 / 40 / 50 (mean)         |                     2.4 / 26 / 160 |           1.2 / 50 / 461 |
| Technologies researched at round 20 / 30 / 40        |                  7.7 / 14.1 / 18.3 |        7.2 / 15.0 / 21.4 |
| Seats completing the tree; completion round (median) |                      22 of 160; 37 |             29 of 30; 39 |
| Earliest completion                                  |                           round 29 |                 round 33 |

The picture is the same at both sizes: a seat is cash-limited until round
~30, then finishes the technology tree within about ten rounds, after which
the bank grows without an outlet (461 Coins carried into round 50 on 20 × 20,
with 6–7 cities). Research is cheap relative to that income: the whole tree
costs 262 Coins at three cities and 409 at six, against 44–60 Coins of income
per turn at rounds 30–40 on 20 × 20. Unit prices are not the lever (the
balance report §8.5 showed the early game, not the late game, is
unit-limited).

### 6.2 Decided numbers

Three levers, all numeric:

```text
tier 1 = 5  + 1 * (C - 1)        (unchanged)
tier 2 = 7  + 3 * (C - 1)        (was 7 + 2 * (C - 1))
tier 3 = 12 + 5 * (C - 1)        (was 9 + 3 * (C - 1))

income(city)  = if besieged: 0
                else max(1, min(level, 4) + capital + seaTrade + landTrade
                            + market + min(0, population))     (level cap was 5)
market income = min(3, 1 + distinct adjacent families)         (per Market; was min(4, ...))
```

`C` is still the researcher's currently owned city count, and the free first
tier-1 technology is unchanged. Resulting prices:

| Cities `C` | Tier 1 | Tier 2 (r15) | Tier 3 (r15) | Whole tree, naval maps, r15 → r16 |
| ---------: | -----: | -----------: | -----------: | --------------------------------: |
|          1 |      5 |        7 (7) |       12 (9) |                  164 → 191 (+16%) |
|          2 |      6 |       10 (9) |      17 (12) |                  213 → 267 (+25%) |
|          3 |      7 |      13 (11) |      22 (15) |                  262 → 343 (+31%) |
|          5 |      9 |      19 (15) |      32 (21) |                  360 → 495 (+38%) |
|          6 |     10 |      22 (17) |      37 (24) |                  409 → 571 (+40%) |
|          8 |     12 |      28 (21) |      47 (30) |                  507 → 723 (+43%) |

("Whole tree" prices all 23 technologies at one city count, one tier-1
technology free; Dry Land has 20.) The Market pays 1–3 Coins; the level term
of a level-4 or higher city is 4. Levels 5+ keep their rewards, capacity, and
Juggernauts.

Unchanged: starting Coins, the free opener, unit and building costs, harvest
costs, capital +1, land and sea trade, rewards (Stockpile 4, Treasury 8 and
12), Pearls (4), chests (5), Clear Forest (+1), Pillage (+1), Spoils (2), and
Disband refunds. Keeping them fixed keeps the change small and the event
schemas (which carry reward coin literals) untouched.

### 6.3 Measured effect of the decided numbers

Same seeds, same scratch harness, revision 15 → decided numbers:

| Measure                                  |                  1v1 11/14 (80 games) |                1v1 20 × 20 (15 games) |
| ---------------------------------------- | ------------------------------------: | ------------------------------------: |
| Income at round 10                       |                        5.3 → 5.3 (0%) |                        5.8 → 5.8 (0%) |
| Income at round 20                       |                    13.0 → 11.7 (−10%) |                     16.3 → 16.2 (−1%) |
| Income at round 30                       |                    19.6 → 17.5 (−11%) |                    44.0 → 38.8 (−12%) |
| Income at round 40                       |                    22.4 → 18.8 (−16%) |                    59.6 → 46.4 (−22%) |
| Technologies at round 20 / 30 / 40       | 7.7 / 14.1 / 18.3 → 7.3 / 12.7 / 16.3 | 7.2 / 15.0 / 21.4 → 6.6 / 12.0 / 18.1 |
| Coins carried into round 40 (mean / p90) |                      26 / 75 → 4 / 13 |                     50 / 178 → 4 / 15 |
| Coins carried into round 50 (mean)       |                              160 → 12 |                             461 → 122 |
| Tree completion round (median; earliest) |                       37; 29 → 49; 37 |                       39; 33 → 46; 39 |
| Research Coins per seat and game         |                             129 → 149 |                             368 → 523 |
| Mean game length (rounds)                |                           31.7 → 34.8 |         (mostly capped at 80 in both) |

Alternatives measured on the 1v1 11/14 set and not chosen:

- Doubling every per-city slope and raising the tier-2/3 bases to 8/11 cut
  round-20 income by 42% (Administration and Markets arrived much later): far
  too slow early.
- The two income caps alone (level 4, Market 3) cut income at rounds 30/40 by
  9% but left tree completion unchanged (median 40, earliest 31).
- The income caps plus a tier-3 formula of `12 + 4 * (C - 1)` (tier 2
  unchanged) delayed completion to a median of 43 but left the bank carried
  into round 50 at 56 Coins.

### 6.4 Targets

`pulp_wars-4gc` measures revision 15 against revision 16 on identical seeds
(section 10.3). The change is accepted when all of these hold:

| #   | Target                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Rounds 1–10 unchanged: mean income and technologies at round 10 within ±5% of revision 15.                                                                     |
| T2  | Round-20 income at least 85% of revision 15 (1v1 matrix).                                                                                                      |
| T3  | Round-30 income between 80% and 95% of revision 15 (1v1 matrix).                                                                                               |
| T4  | Mean Coins carried into round 40 at most 50% of revision 15, in the 1v1 matrix and in the 20 × 20 check.                                                       |
| T5  | 20 × 20 check: mean Coins carried into round 50 at most 40% of revision 15.                                                                                    |
| T6  | Median tree-completion round at least 5 rounds later than revision 15 in both runs, and the earliest completion at least 5 rounds later.                       |
| T7  | 1v1 matrix at the standard 150-round cap: round-cap rate at most 3 percentage points above revision 15; Undead win rate and first-mover win rate within noise. |

### 6.5 Tuning bounds

This is the first step of an iterative deflation. `pulp_wars-4gc` may tune
within these bounds, without a spec change, to meet section 6.4:

| Parameter            | Decided | Allowed |
| -------------------- | ------: | ------: |
| Tier-2 per-city step |       3 |     2–3 |
| Tier-3 base          |      12 |   10–13 |
| Tier-3 per-city step |       5 |     4–5 |
| Level income cap     |       4 |     4–5 |
| Market cap           |       3 |     3–4 |

The tier-1 formula, the tier-2 base, the free opener, and every value listed
as unchanged in section 6.2 stay fixed. The final values are recorded by
amending section 6.2 and in the balance report. If no combination inside the
bounds meets the targets, the bead reports the best measured combination and
stops for a user decision instead of widening the bounds.

## 7. Commands, events, errors, views

- **Commands, events, views:** no shape change. `DISEMBARK` legality gains
  the movement-point condition (section 5.2); research offers and previews
  report the revision-16 costs; income events, `INCOME_PREVIEWED`,
  `ECONOMIC_BUILDING_BUILT.marketIncome`, `CITY_ECONOMY_CHANGED`, and public
  improvement values use the revision-16 income terms.
- **Errors:** none new. A `DISEMBARK` without a movement point left is
  `MOVEMENT_ILLEGAL`.
- **Map generation:** `MapInvariantCodeV7` gains `CAPITAL_GROWTH`; the
  failure result of `MAP_GENERATION_FAILED` may name it as `lastFailure`.
- **Exports:** the level income cap constant becomes 4 in the engine and the
  AI's copy (`src/ai/v7.ts`); the Market cap and the research-cost formula
  keep their current functions with the new numbers.

## 8. UI text

- Technology tree and research offers show the new costs (derived; no copy
  change).
- Market text: "Market: 1–3 Coins (1 + adjacent families, max 3)". Income
  tooltip: "Level (max 4) + capital + trade + Markets".
- Terrain help: "Shallow Water: water that shares an edge with land. Water
  touching land only at a corner is Deep Water."
- Unit text for Patrol Boats and embarked units as in section 5.4; the
  landing preview's two marker styles need a legend entry ("Land now" and
  "Move 1, then land").

## 9. Implementation split and sequencing

| Order | Bead            | Scope                                                                                                                                                                                                                                                                                                                       |
| ----: | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | `pulp_wars-wwc` | Identity and save cleanup (section 2); orthogonal classification and the 25% Shallow minimum (section 4); growth floor, `CAPITAL_GROWTH`, and fairness order (section 3); Normal AI opening rules (section 3.6); terrain help text; refreshed map-dependent fixtures, hashes, natural-play seeds, and the release contract. |
|     2 | `pulp_wars-zsa` | Move 2 for Patrol Boats and embarked units; `DISEMBARK` movement point; public query, unit stats, AI reach and transport planning; landing preview and texts (section 5).                                                                                                                                                   |
|     3 | `pulp_wars-4gc` | Research-cost formula, level cap 4, Market cap 3, AI income estimate, Market and income texts; before/after measurement against section 6.4 and the balance-report section (section 6).                                                                                                                                     |

Sequencing reasons: `wwc` changes every naval map, so it goes first and owns
the identity and all fixture refreshes; `zsa` then measures naval play on
the new maps; `4gc` goes last so its before/after economy matrix measures the
final maps and naval rules, differing only by the economy numbers.

## 10. Test expectations

### 10.1 `pulp_wars-wwc`

| Area            | Required evidence                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | exact 7r16 identity; 7r15 setup/state/save/replay rejection; obsolete-key cleanup through `v7r15`; release contract and browser smoke scripts updated                                                                                                                   |
| Classification  | unit boards: a water cell with orthogonal land is Shallow; with only diagonal land it is Deep; board-edge cells; Fish never on Deep                                                                                                                                     |
| Growth floor    | unit boards: no-op when a kind already has 2; fewer-additions choice; the Woodland/other tie rule; rank order; Fertile Ground, Ore, and resource-bearing cells untouched; infeasible candidate rejected with `CAPITAL_GROWTH`; floor then fairness order                |
| Acceptance      | seeds 0–99 of all 60 cells: 100% accepted, every capital growth-ready, attempts table recorded; seeds 0–999 of the tight cells (16 × 16 three-AI, 20 × 20 two- and three-AI, 25 × 25 all Archipelago; 14 × 14 two-AI Continents): 100% accepted, worst attempt recorded |
| Level 2 (rules) | for every capital of seeds 0–19 of every 11/14/16 cell: a scripted first turn (free research of the guaranteed kind, two harvests) is accepted and the capital reaches level 2 on turn 1                                                                                |
| Level 2 (AI)    | headless Normal matches, seeds 0–19 of every 1v1 map × 11/14 cell (Human mirror and mixed): every seat's capital reaches level 2 by the end of its owner's second turn unless besieged                                                                                  |
| Fixtures        | map hashes, biome/naval map tests, natural-play seeds, and rule fixtures refreshed deliberately (rule fixtures keep fixed boards where they can, as in revision 14 §15.2)                                                                                               |

Profile: `ai/map/persistence`, with `validate:ruleset7-release` and browser
smoke as set in the bead.

### 10.2 `pulp_wars-zsa`

| Area           | Required evidence                                                                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move values    | Patrol Boat and embarked Move 2 for both factions; Battleship, Knight, Vampire unchanged; a three-cell water path is `BUDGET_EXCEEDED`                                                                                                                                      |
| Landing        | land from `S` directly; Move 1 then land; Move 2 then `DISEMBARK` rejected (`MOVEMENT_ILLEGAL`, state unchanged); an interrupted one-cell Move may still land; ZOC does not block landing; capture eligibility unchanged                                                    |
| Query and view | `DISEMBARK` offered exactly when legal; public Move 2; public/canonical agreement                                                                                                                                                                                           |
| Persistence    | save/replay round trip of move-then-land turns                                                                                                                                                                                                                              |
| AI             | naval AI tests updated; a headless sample of Archipelago and Continents matches (seeds 0–11, 11/14, HH and UH) with no policy errors; before/after game length and cap rate reported (an Archipelago cap-rate rise above 5 points files an AI follow-up, not a rule change) |
| UI             | landing preview markers and the two-command landing, texts; naval presentation tests                                                                                                                                                                                        |

### 10.3 `pulp_wars-4gc`

| Area        | Required evidence                                                                                                                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules       | research cost table of section 6.2 (and the free opener) at `C` = 1–8; level term capped at 4; Market 1–3 with and without Commerce; previews equal Start Turn income                                                                                                                   |
| Telemetry   | the balance matrix gains technologies at rounds 10/20/30/40 and the tree-completion round per seat                                                                                                                                                                                      |
| Measurement | full 1v1 matrix (`npm run balance:ruleset7-undead`, seeds 0–29, 150-round cap) and a 20 × 20 check (`--sizes 20 --seeds 3 --max-rounds 80 --pairings HH --multi-seeds 0`), before and after on identical seeds; section 6.4 targets reported one by one in a new balance-report section |
| AI and UI   | AI income estimate uses cap 4; Market and income texts                                                                                                                                                                                                                                  |

## 11. Decisions made in this spec

These fill gaps in the user's direction. Each is the simplest rule
consistent with the engine; the user may change any of them.

1. **"Within two turns" is guaranteed as "on the first turn".** Two growth
   resources of one kind make level 2 cost 4 of the first turn's 7 Coins with
   one technology. The weaker exact two-turn condition (section 3.5) would
   let the only route be a zero-Coin second turn with a second research,
   which a player who trains a unit on turn 1 misses.
2. **Capitals only, ring only.** The guarantee is for starting cities and
   counts the eight ring cells (the starting territory), not the radius-2
   area the old opener surveyed. Villages get no guarantee.
3. **A floor, not only rejection.** Only 35% of current capitals meet the
   guarantee, so rejection alone would multiply candidate attempts; the
   PRNG-free floor adds at most two resources and keeps acceptance at 100%.
4. **The floor adds Fruit or Game, never Fish**, and only on empty cells, so
   terrain, families, water draws, and hidden resources are untouched. Fish
   already present still counts.
5. **Fairness after the floor.** The capital score band is checked on the
   final board and is never relaxed.
6. **AI growth-first opening** (section 3.6), so the Normal AI demonstrates
   the guarantee and gets the same early start.
7. **Port "touching" stays eight-way.** Only the Shallow test becomes
   orthogonal; a Port may still use a diagonal land cell of its own city.
8. **Shallow minimum 25%.** The 40% band fails large Archipelagos under the
   orthogonal rule; 25% accepts every sweep map.
9. **Map revision label unchanged** (`REGIONAL_BIOMES_NAVAL_V2`), following
   revision 14 decision 15: the ruleset identity already separates the
   generators, and the setup literal stays valid.
10. **Landing costs one point; two commands, not a new command.** Move then
    `DISEMBARK` reuses `movedPathLength` and needs no command, event, or
    state change; the UI composes the two for the player.
11. **Economy: three levers.** Tier-2/3 research costs grow faster with city
    count (the late, wide economy), the level term caps at 4, and the Market
    at 3. Tier-1 costs, the tier-2 base, and every reward and price stay, so
    a one-city opening is unchanged.
12. **Bounded tuning** (section 6.5) lets `pulp_wars-4gc` hit the targets
    without another spec round, while stopping for the user outside the
    bounds.
13. **One identity bump** in `pulp_wars-wwc`; the following beads change
    rules under `pulp-wars-poc-7r16` until the revision is complete.

## 12. Concerns and follow-ups

- **Scratch measurements are small** (80 + 15 Human-mirror games for the
  economy). `pulp_wars-4gc` repeats them with the full matrix; its numbers
  replace section 6.3.
- **Longer games.** Deflation lengthened the 1v1 11/14 games by about three
  rounds and raised the share lasting past round 70 (1 → 8 of 80). Target T7
  watches the 150-round cap rate, which is the stall measure.
- **The late bank still grows** once the tree is done (122 Coins carried into
  round 50 on 20 × 20). Later iterations may need an outlet or a late-game
  price, which is a mechanics change the user excluded for now.
- **Slower invasions** on Archipelago may reopen last-city stalls across
  water (balance report §13.4); `pulp_wars-zsa` reports it.
- **Growth floor visibility.** The floor makes capital rings slightly richer
  in Fruit and Game than the biome tables; development scores stay inside the
  fairness band by construction.

## 13. Implementation record

### 13.1 Engine and AI

- **Identity.** `RULESET_7_ID = "pulp-wars-poc-7r16"`, autosave
  `pulpWars.save.v7r16.current`; `OBSOLETE_SAVE_STORAGE_KEYS_V7` ends with
  `pulpWars.save.v7r15.current`. The replay reader still names only the
  identities through `7r12` as `INCOMPATIBLE_REPLAY`; a `7r13`–`7r15` replay
  is rejected as `INVALID_REPLAY` (unchanged since revision 13).
- **Map generation** (`src/engine/v7/map.ts`). `isShallowWaterV7` is the
  section 4.1 test; `SHALLOW_WATER_MINIMUM_SHARE_V7 = 0.25`;
  `applyCapitalGrowthFloorV7` is the section 3.3 floor (called at the end of
  every candidate that placed its settlements, with the candidate's
  settlement-floor rank); `capitalGrowthCountsV7` and `capitalGrowthReadyV7`
  implement section 3.2, and `CAPITAL_GROWTH` is checked last in both
  validators. The floor draws nothing, so revision-15 and revision-16
  candidates stay PRNG-identical attempt by attempt.
- **Parity generator.** `generateInitialMapWithVillageCountV7` and
  `createInitialMapStateWithVillageCountV7` take an optional
  `MapGenerationRulesV7` (`"REVISION_16"` by default, `"REVISION_15"` for
  eight-neighbour Shallow, the 40% minimum, and no floor or
  `CAPITAL_GROWTH`). No rule path uses `REVISION_15`; it keeps fixture boards
  fixed.
- **Normal AI** (`src/ai/v7-opening.ts`, `src/ai/v7.ts`). Rule 1 reports the
  growth opener with score `1000 + resources`. Rule 2 is implemented as a
  priority band: a ready growth harvest of the level-1 original capital
  scores at least 1212 (above a level-reaching economic action, 1210), and
  while one is ready, `RESEARCH`, `TRAIN`, `TRAIN_NAVAL`, and `BUILD_*`
  candidates scoring 1212 or more drop to 1211; the naval Coin reserve never
  filters such a harvest. Attacks, captures, Rally, Tend, and movement keep
  their priorities (the revision-11 tactical tests pin that).
- **UI.** The Help screen of a naval match adds the section 8 terrain
  sentence.

### 13.2 Acceptance sweeps

`npm run validate:ruleset7-growth-maps` (seeds 0–99 of all 60 cells) and
`npm run validate:ruleset7-growth-maps -- --tight` (seeds 0–999 of the tight
cells) both pass: every map is accepted, every capital is growth-ready, and
every naval map keeps at least 25% Shallow Water.

| Map type    | Maps | Mean attempt | Worst attempt (cell) | Smallest Shallow share |
| ----------- | ---: | -----------: | -------------------- | ---------------------: |
| Dry Land    | 1200 |         3.82 | 39 (20 × 20, 3 AI)   |                      – |
| Pangea      | 1200 |         3.64 | 24 (20 × 20, 3 AI)   |                  0.331 |
| Continents  | 1200 |         6.14 | 110 (14 × 14, 2 AI)  |                  0.313 |
| Archipelago | 1200 |        12.07 | 223 (20 × 20, 3 AI)  |                  0.251 |
| Lakes       | 1200 |         1.79 | 11 (16 × 16, 3 AI)   |                  0.440 |

| Tight cell (seeds 0–999)  | Accepted | Mean attempt | Worst attempt |
| ------------------------- | -------: | -----------: | ------------: |
| Archipelago 16 × 16, 3 AI |     1000 |        26.46 |           203 |
| Archipelago 20 × 20, 2 AI |     1000 |        20.69 |           160 |
| Archipelago 20 × 20, 3 AI |     1000 |        36.09 |           231 |
| Archipelago 25 × 25, 1 AI |     1000 |         4.37 |            24 |
| Archipelago 25 × 25, 2 AI |     1000 |         7.10 |            42 |
| Archipelago 25 × 25, 3 AI |     1000 |         9.74 |            82 |
| Continents 14 × 14, 2 AI  |     1000 |        17.79 |           134 |

The worst tight-cell attempt (231 of 256, 20 × 20 three-AI Archipelago) is
the closest any sweep came to the candidate budget.

### 13.3 Level 2 evidence

- **Rules.** `tests/unit/ruleset-v7-revision16.test.ts` plays a scripted first
  turn (free research of the guaranteed kind, two harvests, reward) for every
  capital of seeds 0–19 of every 11/14/16 cell of every map type; every
  capital reaches level 2 on its owner's first turn with 7 Coins.
- **Normal AI.** Seeds 0–19 of every map type at 11 × 11 and 14 × 14, one AI,
  Human mirror and both mixed seat orders (1,200 seats): revision 15 reached
  level 2 with 4.3% of capitals by the owner's first turn and 28.8% by the
  second; revision 16 reaches it with 100% on the first turn. The test pins
  the second-turn requirement over the same matrix.

### 13.4 Refreshed artifacts

- **Identity literals** in the engine, headless CLI and runner, DOM setup,
  browser smoke scripts (which seed and check the obsolete `v7r15` key), the
  late-public-view contract, the balance matrix, the biome validator, the
  release contract (which now runs the revision-16 test), and the tests that
  pin identity; the Land Grant hidden-owner state fixture is re-identified
  with its stored board kept.
- **Fixed boards.** `tests/fixtures/v7-revision13-map.ts` builds its
  revision-13 boards with `REVISION_15` rules (unchanged layouts for every
  rule fixture) and adds `revision15PlayableGameV7` (the revision-14 village
  count with `REVISION_15` rules), which the endgame-siege arena now uses.
- **Re-pinned map hashes.** Biome map seed 0 (16 × 16, three AI): new hash
  and board hash, accepted on candidate 11; the revision-15 hash
  (candidate 25) and the revision-13 hash are asserted through
  `REVISION_15`. Seed 1: accepted on candidate 13 (four `CAPITAL_GROWTH`
  rejections) instead of 8.
- **All-Human digests.** The two fixed-board all-Human matches keep their map
  and post-generation PRNG digests; with the section 3.6 rules disabled they
  still reproduced the revision-12 digests, so their command, event, state,
  and view digests were re-recorded from the revision-16 policy.
- **Natural-play seeds** re-chosen on revision-16 maps and openings: Raider
  escape 13 → 5; Plague/Bitten, Lich-splash and scripted-Wail round trips and
  the Undead telemetry match 11 → 16; Undead boarding (Archipelago 14 × 14)
  1 → 29; Pearls in naval persistence 27 → 20; Muster Monument 42 → 46; DOM
  resume and Tech-screen tests 1 → 4 (seed 1 now opens with the AI). The
  headless command-cap test now expects Hunting and two Game hunts first.
- **Validators.** `validate:ruleset7-naval-maps` checks the orthogonal rule,
  the 25% minimum, and growth-ready capitals. Its Dry Land parity file
  (`RULESET_7_DRY_LAND_PARITY.json`) held the revision-6 boards, which
  stopped matching with revision 14's village change; `pulp_wars-vpe`
  regenerated it from the revision-16 generator
  (`npm run validate:ruleset7-naval-maps -- --write`), so it now pins the
  current Dry Land boards. Before the refresh, all 96 old entries were still
  reproduced by `generateInitialMapWithVillageCountV7` with the revision-13
  village counts and `REVISION_15` rules. Of the 96 new entries, 7 equal the
  revision-15 board (revision-14 counts), 62 differ only by growth-floor
  Fruit or Game on capital rings and the chests that move with them, and 27
  accept a different candidate because the floor or `CAPITAL_GROWTH` changes
  which candidates pass; the per-attempt PRNG states match revision 15.

### 13.5 Revision 16b: 2-tile boats (`pulp_wars-zsa`)

- **Engine** (`src/engine/rules/ruleset-v7.ts`, `src/engine/v7/`). Patrol
  Boat `move: 2` (both factions share the rule); `EMBARKED_MOVE_V7 = 2`
  replaces the three hard-coded embarked `3`s (canonical and public movement
  budgets, public unit stats); `embarkedMovementSpentV7` is section 5.2's
  `spent`, and `EMBARKED_LANDING_MAX_SPENT_V7 = 1`. `DISEMBARK` is rejected
  with `MOVEMENT_ILLEGAL` (state unchanged) when `spent > 1`, and the public
  query offers it only when `spent <= 1`. No identity, state, command, event,
  or view shape changed.
- **Landing preview.** `queryLandingPreviewV7(view, unitId, commands?)`
  returns the offered direct landing cells and, for an embarked unit that has
  not moved, each other legal landing cell next to an offered one-cell Move
  destination, paired with that Move (the first such destination in
  `(y, x)` order) and its `DISEMBARK`. Legal cells use the same public test as
  the query.
- **UI.** Direct targets are labelled "Land now" (teal dashes); two-step
  targets are a new `LANDING_AFTER_MOVE` family labelled "Move 1, then land"
  (amber dots) whose command is the Move and whose `followUp` is the landing.
  The DOM sends the landing only when the accepted Move left the unit
  embarked on that water cell and the landing is still offered. The
  selection dock of an embarked unit with landing markers shows a legend for
  both; the embarked unit's details and the naval-map Help read "At sea:
  Move 2; landing uses 1 of it." Patrol Boat stats show Move 2 through the
  role rule.
- **Normal AI** (`src/ai/v7.ts`). Embarked combat facts and projected stats
  use `EMBARKED_MOVE_V7`. The planner already lands only on offered
  `DISEMBARK` commands, so it never issues a rejected landing. One addition:
  an embarked Move with route progress, at most one cell, and a destination
  next to a planned landing cell gains one objective point, so a transport one
  cell from the landing coast moves one cell and lands the same turn instead
  of taking an equal-progress two-cell Move (which the deterministic
  tie-break used to prefer). Priorities are otherwise unchanged.
- **Tests.** `tests/unit/ruleset-v7-revision16-naval.test.ts` (Move values,
  the three-cell `BUDGET_EXCEEDED`, direct and Move-then-land landings,
  `MOVEMENT_ILLEGAL` after two cells, landings after `OCCUPIED` and `ZOC`
  interruptions, ZOC not blocking landing, capture eligibility, query and
  engine agreement at 0/1/2 points spent, the landing preview, board markers,
  AI matches that never land with more than one point spent, and a
  save/replay round trip through AI move-then-land turns) and
  `tests/integration/ruleset7-landing-dom.test.ts` (legend, two-command
  landing, no landing after an interrupted Move) join the release contract;
  `tests/unit/ruleset-v7-naval-ai.test.ts` pins the one-cell approach.

Re-pinned artifacts, each shown to change only through this bead: with
Patrol Boat and embarked Move 3, no landing budget, and no approach bonus
restored, every one of them reproduced its revision-16a value.

- **Roster values** (Patrol Boat Move 2) in the technology, Undead-faction,
  and naval-combat tests; the transport statistics test now expects Move 2.
- **All-Human digests** (`ruleset-v7-undead-faction.test.ts`): map and
  post-generation PRNG digests unchanged; command, event, state, view, and
  command-list digests re-recorded. Seed 7 (11 × 11 Continents) no longer
  ends in round 17 and reaches its 30-round cap (241 commands); seed 1234
  (14 × 14 Archipelago, cooperative) still caps at round 19 (363 commands,
  was 383). The rules alone (without the approach bonus) already changed
  both.
- **Natural-play seed.** The cooperative Continents landing test moves from
  seed 0 to seed 7: seed 0 no longer has a landed capture within 800 (or
  1,200) accepted commands; seed 7's first landed capture is command 345.
- **Fixtures.** The hidden-ZOC observation scenario walks a Raider along a
  neutral Road (three Road steps) instead of a Patrol Boat along three water
  cells; the fleet Port test starts the Patrol Boat two cells from the Port.

Headless sample (section 10.2): Normal-against-Normal, Archipelago and
Continents, 11 × 11 and 14 × 14, seeds 0–11, Human mirror (`HH`) and Undead
seat 0 against Human (`UH`), 96 matches with a 150-round cap
(`balance:ruleset7-undead -- --seeds 12 --sizes 11,14 --maps
continents,archipelago --pairings HH,UH`), revision 16a against 16b on
identical seeds. No match had a policy error or stall in either run.

| Map         | Mean / median rounds, 16a → 16b | Round-cap rate, 16a → 16b |
| ----------- | ------------------------------: | ------------------------: |
| Archipelago |           39.5 / 32 → 49.0 / 37 |       2.1% → 6.2% (1 → 3) |
| Continents  |       38.5 / 33.5 → 40.9 / 34.5 |       4.2% → 4.2% (2 → 2) |
| Both        |           39.0 / 32 → 44.9 / 36 |       3.1% → 5.2% (3 → 5) |

The Archipelago cap rate rose by 4.1 points, under the 5-point threshold that
would file an AI follow-up. The largest slowdown is 14 × 14 Archipelago (mean
42.1 → 55.8 rounds, 0 → 1 capped).
