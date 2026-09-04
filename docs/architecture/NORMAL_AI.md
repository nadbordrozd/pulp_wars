# Greedy Normal Ruleset-6 AI

Normal is deterministic, renderer-independent, observation-safe, and
PRNG-free. It receives only `PlayerViewV6`, `queryPlayerCommands(view)`, and
public economic/combat previews. Policy code may not import `GameState`, map
generation, reducer legality, hidden resources/entities, or authoritative
preview functions.

## 1. Candidate construction and tie-breaks

Rebuild the complete candidate list after every accepted command. Remove Wait;
classify every other public command exactly once. A pending reward or Candify
choice is normally the only public resolver. End Turn is always present when no
choice blocks it and always has priority zero.

Compare this signed-integer tuple lexicographically, larger first:

```text
priority, strategicValue, immediateValue, futureValue, safetyValue,
objectiveValue, -commandKindOrdinal, -targetY, -targetX,
-primaryEntityId, -contentOrdinal
```

The last five fields use the frozen Ruleset-6 orders. A missing coordinate is
`(-1,-1)` before negation. `primaryEntityId` is acting unit, then target unit or
wall, then city, then zero. `contentOrdinal` is technology, role, reward,
improvement, direction, or zero. No query iteration order survives this tuple.

## 2. Exact priorities

| Priority | Candidate                                                             |
| -------: | --------------------------------------------------------------------- |
|     1400 | Capture that visibly ends the match                                   |
|     1360 | Other hostile-city Capture                                            |
|     1340 | Neutral-village Capture                                               |
|     1330 | Move directly onto a globally public treasure chest                   |
|     1320 | Promote                                                               |
|     1300 | Mandatory city/Candify choice                                         |
|     1280 | Guaranteed kill of a unit threatening an owned city                   |
|     1270 | Medic heal of a damaged defender in a threatened city                 |
|     1260 | Train in a threatened city                                            |
|     1250 | Move a friendly unit onto an empty threatened city                    |
|     1240 | Other Attack against a threatening unit                               |
|     1230 | Safe Roll that destroys a visible hostile threatening a city          |
|     1210 | Economic action whose public delta reaches one or more city levels    |
|     1200 | Build/connection that adds at least one recurring Coin per turn       |
|     1180 | Other guaranteed kill                                                 |
|     1160 | Research first step on shortest chain to a visible economic action    |
|     1140 | Economic action with positive population or permanent Coin value      |
|     1120 | Build Road that connects an existing Market to the capital            |
|     1100 | Build/retain a positive future spatial setup action                   |
|     1080 | General training                                                      |
|     1060 | Research first step to a missing trainable role with a potential slot |
|     1040 | Other legal research                                                  |
|     1020 | Candify hostile territory inside a city footprint                     |
|     1000 | Candify neutral territory inside a city footprint                     |
|      900 | Other non-lethal Attack                                               |
|      880 | Safe positive-damage Roll                                             |
|      860 | Useful Chocolate Wall near a threatened city                          |
|      700 | Move reducing distance to a known objective                           |
|      650 | Move creating a next-command Candify frontier                         |
|      600 | Move maximizing public frontier reveal                                |
|      500 | Medic heal of any damaged friendly unit                               |
|      400 | Recover below half maximum HP                                         |
|      300 | Other Recover                                                         |
|        0 | End Turn                                                              |

Redevelop is eligible only when its public two-ply replacement plan has positive
`futureValue`; Normal never destroys a building merely to spend Coins later.
Clear Forest is an economic action with permanent Coin value 1 but loses the
public future Lumber/Sawmill potential described below. Replant and an
unconnected Road require positive future value. A zero-delta build is not
productive and cannot beat End Turn unless it enables an exact next action.
Clear Forest is excluded when `futureValue < 0` unless its one Coin makes a
currently public candidate of priority 1160 or greater affordable immediately;
this is the exact cash-now versus timber-later policy boundary.

## 3. Shared score components

Threat uses only visible hostile roles and public Move/Range:
`distance <= move + range`. Severity is 3 for siege, 2 when already in attack
range, and 1 otherwise. Equal cities prefer greater severity, capital, lower
visible defender HP (empty is one more than the greatest role max HP), then
city `(y,x)` and ID.

For every candidate:

```text
immediateValue =
  20 * hostileUnitsKilled
  - 16 * ownOrAlliedUnitsKilled
  + 10 * hostileHpLost
  - 8 * ownOrAlliedHpLost
  + 30 * citiesAcquired
  + 20 * cityLevelsReached
  + 5 * populationDelta
  + 12 * recurringCoinDelta
  + immediateCoinsDelta
```

All terms use public previews. Unknown/hidden values are zero. Wall HP uses two
points per hostile HP and minus eight per own/allied HP; walls never count as
units or kills. `populationDelta` is the sum of public city deltas after live
recomputation and may be negative. `immediateCoinsDelta` includes costs as
negative, Stockpile/Treasury/Clear Forest as positive, and excludes future
income.

`safetyValue` is negative projected public damage from every visible hostile
that could attack the acting unit's result tile without moving. Breach, Charge,
and known Push use the public combat estimator. Hidden terrain/units and
`UNKNOWN_RESOURCE` contribute zero.

Known objectives are globally public treasure chests, visible neutral villages,
and hostile cities. Objective
value is negative Chebyshev distance from the resulting tile; equal objectives
use `(y,x)`. With none, frontier value is the number of new non-allied-blocked
coordinates in the public reveal result, then displacement from start. A
zero-gain move may reduce distance to the nearest public unexplored coordinate.

A direct chest Move uses `strategicValue = 1` and `immediateValue = 5`; this is
the fixed expected utility used for ordering, not a prediction or PRNG draw.
Pathing sees only the public coordinate, and reward resolution remains wholly
inside the authoritative reducer.

## 4. Spatial planning score

`futureValue` is calculated by the pure `scorePublicSpatialPlan(view,
candidate)` helper. It applies only the candidate's public, deterministic tile
changes, then enumerates every exact next economic command that would be public
if Coins and technology gates were ignored but terrain/resource ownership and
placement facts stayed unchanged. It never invents an unrevealed resource.

Score each possible next placement:

```text
8 * previewPopulationDelta
+ 18 * previewRecurringCoinDelta
+ 2 * contributingTileCount
+ 3 * distinctTypeOrFamilyCount
+ 4 * oppositePairCount
+ 6 if it creates a legal three-processor Grand Works site
+ 4 if it completes a capital-connected Market road
```

`futureValue` is `bestAfter - bestBefore`, where each best value is the sum of
the greatest non-overlapping next placement for each owned city, cities in ID
order and ties by command order. “Non-overlapping” means no two selected
previews use the same target; contributors may overlap where the rules permit.
This one-step reservation makes Normal preserve a strong Forge/Stoneworks/
Grand Works target instead of filling it with a weak basic building. It does
not search arbitrary build sequences.

For a cluster basic, `contributingTileCount` includes the resulting connected
Farm/Lumber component. For Clear Forest, after-state removes that camp/Sawmill
potential. For Replant, after-state adds one public empty Forest opportunity.
For Redevelop, compare the best exact next replacement at the removed target;
the command is excluded unless `futureValue > 0`.

## 5. Research, growth, and Roads

For each visible owned resource/action, economic placement, or missing role,
walk the owning faction's registered 25-node graph. A shortest chain counts
unresearched nodes including the candidate. Ties use that registration's frozen
node order. A missing Candy registration or role mapping is a structured policy
error, never an Original fallback.

Economic research strategic value is the number of currently public targets
unlocked by the chain plus the greatest public spatial score enabled at its
end. Role research requires an owned non-besieged city with `count < level + 1`;
it need not currently have Coins or an empty center. Other research remains
eligible so Normal can complete all branches.

An economic action “reaches a level” when the preview reports at least one
`CITY_LEVELED_UP`; this includes cross-city live changes. Normal resolves the
resulting ordered reward queue before any other action. For level-2, prefer
Stockpile when Coins < 4, otherwise Survey. For level-3, choose Militia when
known threatened and placement exists, otherwise Walls. For level-4, choose
Expand when at least four neutral cells are claimable or the unexpanded city's
best public spatial score is positive outside 3 x 3; otherwise Boom. At level
5+, choose Juggernaut when placement exists and the player has fewer
Juggernauts than cities, otherwise Treasury. Exact ties take reward ordinal.

Road planning uses only owned explored tiles. A Road gets priority 1120 only
when its accepted placement makes an existing Market capital-connected in the
public preview. Otherwise it needs positive future value. Equal Road plans
prefer fewer remaining orthogonal missing links to the nearest capital, then
the stable tuple. Normal never builds an unbounded decorative road network.

## 6. Production and role behavior

Threatened-city role order is Guard, Fighter, Medic, Heavy, Marksman, Scout,
Raider, Breacher. General order is Scout, Raider, Marksman, Guard, Medic,
Heavy, Breacher, Fighter. Choose the first missing unlocked affordable role;
otherwise the least represented available role, ties by that list. Juggernaut
is never trainable. Count mechanical roles, so Candy labels create no extra
slots. Donut counts as Raider despite its effective rule substitution.

Combat candidates use the effective faction rule. Raider Charge is included
only when its public activation path has at least two cells. Heavy/Juggernaut
Push gets strategic value 1 when `WILL_PUSH` moves a target off an owned city,
onto a lower defense tile, or out of a blocking approach; unknown never scores.
Breacher prioritizes a fortified threatening defender. Medic prioritizes the
lowest HP fraction, then greater missing HP, then target ID.

Normal excludes a Donut Roll crossing `ALLIED_TERRITORY` or containing any
visible owned/allied unit or wall. It scores only visible occupants and never
predicts a hidden victim. Choco Engineer Wall placement maximizes visible
hostile shortest approaches blocked, then avoids a public economic target,
then Grass, Forest, Mountain, `(y,x)`, and unit ID. Candify keeps the v6
footprint/connectivity rules and values hostile above neutral, frontier
adjacency, chosen city ID, then target coordinate. It does not sacrifice the
last defender of a threatened city while a productive defense exists.

## 7. Cooperative mode and information safety

The stored `humanPlayerId` defines relationships exactly as in ruleset 5. AI
seats are allied only to one another in Cooperative mode. Public enumeration
removes allied Attack/Capture/territory paths and allied buildings never count
as friendly economic contributors. There is no shared economy, Road network,
Market connection, processor contribution, vision, healing, capacity, or
technology.

An unexplored allied coordinate is only `ALLIED_TERRITORY`; an explored
technology-hidden resource is only `UNKNOWN_RESOURCE`. Both are content-free.
Game is public on an explored Forest from match start, but cannot produce a Hunt
Game candidate before Hunting. Neither hidden arm counts as frontier, spatial
potential, Roll value, route content, or a research target. Equal views
containing either arm must produce byte-identical candidates, scores, and
commands.

## 8. Runner limits and validation

Normal takes productive actions greedily and keeps no speculative Coin reserve.
The per-turn limit is 128 accepted commands. The runner reserves the number of
slots required to drain the current authoritative pending queue plus End Turn.
A missing candidate, rejection, non-advancing accepted command, or inability to
end is a structured error; it never retries with hidden knowledge.

The required browser/headless matrices and participation metrics are in
[Headless Simulation](HEADLESS_SIMULATION.md) and
[POC Validation](../validation/POC_VALIDATION.md). Animation, reduced motion,
Fast Forward, and controller pacing cannot alter candidates, commands, events,
or hashes.
