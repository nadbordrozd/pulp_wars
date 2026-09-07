# Ruleset 7 Design Review

**Decision:** revise the authoritative Original contract as Ruleset 7 revision
2, with exact ruleset ID `pulp-wars-poc-7r2` and faction tree
`ORIGINAL_BASELINE_V3`.

**Authority:** [Pulp Wars Ruleset 7](RULESET_7.md) contains the resulting exact
rules. This report records objectives, evidence, judgments, and implementation
impact. The [original redesign proposal](ORIGINAL_TECH_TREE_REDESIGN_PROPOSAL.md)
is historical and retains its old numbers for provenance.

**Scope:** Original only. Ruleset 6, its release corpus, and Candy remain
unchanged. This was a design and documentation review; no runtime code, tests,
fixtures, saves, AI, UI, or assets were changed or playtested.

## 1. Objectives and guiding principles

1. Every major branch must offer credible economic and military reasons to
   enter it, without requiring every individual node or fork to mirror the
   others.
2. Judge an advanced technology or unit by total prerequisite research,
   construction/training Coins, tempo, capacity, land, and forgone alternatives.
   A headline stat or building ratio alone is not its price.
3. Prefer related multi-unlocks and new decisions to narrow purchases or small
   percentage upgrades. Conditional nodes may remain conditional when their
   payoff is strong on the map that supports them.
4. Compensate scarce deposits using actual settlement-local geography. Preserve
   rare jackpots, but strengthen ordinary usable sites before enlarging already
   exceptional caps.
5. Keep one currency, direct map interaction, increasing marginal city growth,
   no inventories, and no city-management screen. Spatial planning should stay
   legible through clusters, adjacency, shapes, and mixed industries.
6. Preserve meaningful midgame development and occasional spectacular cities.
   Limit reward queues and free armies so stronger population sources remain an
   economic achievement rather than a repeated super-unit dispenser.
7. Give every unit a distinct battlefield job. Keep Fighters and other basic
   roles relevant through low price and tactical flexibility while recognizing
   that advanced units deliberately concentrate more value into scarce
   capacity.
8. Derive counters from shared stats, geometry, movement, range, retaliation,
   healing, positioning, timing, and capacity. Do not add role-ID damage bonuses
   or claim counterplay that the actual rules do not create.
9. Let gridlock breakers be spectacular in a narrow situation while preserving
   visible, timely, practical replies. Avoid unlimited chains, permanent denial,
   random conversion, and hidden-information leaks.
10. Seek contextual branch parity rather than identical output on every map.
    Watch dominant openers, dead forks, homogeneous armies, conquest snowball,
    ranged balls, turtling, and terrain lotteries.
11. Leave one deliberate future wildcard-unit extension point without creating
    a dummy role, a 26th paid node, or a counter the present game requires but
    does not supply.
12. Additional achievement rewards must create understandable optional goals,
    be personal rather than races, use no hidden enemy information, avoid
    kill/capture/wealth farming, and remain bounded enough not to dominate the
    core economy.

## 2. Evidence boundary

The map counts and combat/research arithmetic below are observations from the
unchanged generator and exact formulas. The revised prices, outputs, reward
cadence, and achievement rules are design judgments informed by those
observations. They have not been validated by human play or balance simulation.

### 2.1 Research and total access costs

Research cost remains:

```text
tier 1 = 5 + (cities - 1)
tier 2 = 7 + 2 * (cities - 1)
tier 3 = 9 + 3 * (cities - 1)
```

Gathering starts known. A Settlement endpoint therefore costs 16 Coins at one
city or 26 at three cities; another branch's new-root endpoint costs 21 or 33.
At five cities the latter path costs 45. Three level-2 cities ordinarily produce
about 7 Coins per turn including the capital bonus, so 33 is expensive but not
disproportionate to the larger empire by arithmetic alone. The coefficient
remains a playtest variable rather than a proven optimum.

Representative first-copy access cost, assuming none of its path is already
owned and excluding the value of other unlocks, is:

| Role     | One city | Three cities | What the total includes                    |
| -------- | -------: | -----------: | ------------------------------------------ |
| Fighter  |        2 |            2 | training only                              |
| Guard    |        8 |           10 | Drill + unit                               |
| Scout    |        9 |           11 | Scouting + unit                            |
| Envoy    |       13 |           17 | Craft + unit; Gathering already known      |
| Marksman |       15 |           21 | Hunting + Marksmanship + unit              |
| Raider   |       16 |           22 | Scouting + Raiding + unit                  |
| Medic    |       16 |           22 | Drill + Medicine + unit                    |
| Breacher |       27 |           39 | Drill + Fortification + Explosives + unit  |
| Saboteur |       27 |           39 | Hunting + Marksmanship + Fieldcraft + unit |
| Heavy    |       28 |           40 | Surveying + Mining + Metallurgy + unit     |
| Catapult |       29 |           41 | Hunting + Forestry + Sawmilling + unit     |
| Lancer   |       30 |           42 | Scouting + Raiding + Maneuver + unit       |

These totals explain why tier-3 roles need decisive jobs. They do not imply
equal stats: Catapult also buys timber economics, Heavy buys the strongest rare
processor path, and Lancer buys ZOC freedom for three roles.

### 2.2 Settlement-local geography

The unchanged map generator fixes Mountain at 18%, Forest at 24%, then places
Ore on 18.75% and Stone on 37.5% of Mountain. Whole-board availability can hide
how rarely an individual city begins beside a deposit.

A focused audit generated seeds 0 through 29 for one-AI 11x11 and 25x25 maps.
It examined every capital and village: 150 sites on 11x11 and 660 on 25x25.
Radius 1 is the initial eight non-site cells. Radius 2 is only a geometric 5x5
upper bound and ignores territory overlap, contest, and whether the city can
actually claim every cell.

| Board/sample |   No Ore r1 | No Stone r1 |  Neither r1 | Fewer than 2 basic families r1 | At least 3 families r1 | At least 4 Fertile r1 |
| ------------ | ----------: | ----------: | ----------: | -----------------------------: | ---------------------: | --------------------: |
| 11x11 / 150  | 137 (91.3%) | 123 (82.0%) | 113 (75.3%) |                       9 (6.0%) |             28 (18.7%) |              9 (6.0%) |
| 25x25 / 660  | 613 (92.9%) | 559 (84.7%) | 525 (79.5%) |                      50 (7.6%) |            111 (16.8%) |             45 (6.8%) |

| Board/sample |   No Ore r2 | No Stone r2 | Neither r2 | At least 3 families r2 | At least 4 Fertile r2 |
| ------------ | ----------: | ----------: | ---------: | ---------------------: | --------------------: |
| 11x11 / 150  |  57 (38.0%) |  33 (22.0%) |  13 (8.7%) |            137 (91.3%) |           116 (77.3%) |
| 25x25 / 660  | 332 (50.3%) | 195 (29.5%) | 96 (14.5%) |            564 (85.5%) |           516 (78.2%) |

Forest counts as a timber family even when it contains Game that can be hunted
first. The sample supports an off-deposit Industry floor, stronger one-deposit
Stoneworks, and useful small Farm clusters. It does not support changing map
generation or making every branch equally productive at every settlement.

### 2.3 Hidden cross-branch requirements

Tree display has one parent per node, but mixed buildings impose real economic
prerequisites:

- The old Workshop required two basic types. The cheapest one-city research
  package was Craft + Farming + one non-Settlement basic path: 26 Coins before
  construction. Allowing one type lowers first practical access to 14 through
  Craft + Farming, while additional types remain valuable.
- The old Grand Works required three processor types. Grand Works' own 16-Coin
  one-city path plus the cheapest three processor paths cost at least 74
  research Coins; at three cities the same package cost 118. Requiring two
  processor types lowers those minimums to 53 and 85. That remains a substantial
  capstone before its 7-Coin building and contributing improvements.

Market retains its two-family requirement. Its own path costs 21/33 at one/
three cities, but ordinary output of 2 Coins, or 3 with the capital Road bonus,
repays the 7-Coin building itself in 3.5 or about 2.3 turns. The unresolved cost
is its research and land package, which needs playtest evidence before another
buff.

### 2.4 Healing-aware siege

The exact combat formula disproves two earlier shortcuts. Catapult minimum range
prevents targeting an adjacent unit; that unit does not stop the Catapult firing
at a different target at range 2–3. Closing is pressure because the closer can
attack, occupy paths, and force unsafe movement.

Against a full-health 15-HP Guard with 4x Walls, a full-health Attack-3.5
Catapult first deals 4. With one heal between volleys and no other interaction:

| Attackers   | Heal 4 result                            | Heal 6 result                            |
| ----------- | ---------------------------------------- | ---------------------------------------- |
| 1 Catapult  | stalls; each 4 damage is fully recovered | stalls; each 4 damage is fully recovered |
| 2 Catapults | kill in 3 turns: `4,4`; `4,6`; `5`       | kill in 3 turns: `4,4`; `4,5`; `5,5`     |
| 3 Catapults | kill in 2 firing turns                   | kill in 2 firing turns                   |

A full-health Catapult and full-health Breacher kill that defender in one
coordinated turn if both already have legal attacks. This preserves two siege
styles: ranged investment and a riskier adjacent specialist. It does not prove
that either setup survives defenders, terrain, screens, or reinforcement.

## 3. Complete 25-node assessment

“Retain” means no exact rule change in revision 2. It does not mean the node is
proven balanced.

| Branch     | Node          | Decision                        | Assessment                                                                                                                               |
| ---------- | ------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Settlement | Gathering     | Retain                          | Free start exposes common immediate growth and supplies the branch's readable baseline.                                                  |
| Settlement | Farming       | Retain                          | Farm is abundant, efficient, persistent growth; it needs no extra military payload because Craft supplies the branch role.               |
| Settlement | Milling       | Revise                          | Windmill gains a +2 floor within its cap so one/two Farm sites justify a tier-3 purchase without enlarging the jackpot.                  |
| Settlement | Craft         | Revise Workshop; retain Envoy   | Workshop now functions beside one basic type and scales with diversity. Envoy remains a distinct costly controller.                      |
| Settlement | Grand Works   | Revise                          | Two processor types are sufficient and output is 4 + 2/type, cap 12. The large cross-branch/land package now has capstone scale.         |
| Wilds      | Hunting       | Retain                          | Cheap permanent Game conversion is an economic root; visible Game keeps the purchase informed.                                           |
| Wilds      | Forestry      | Retain                          | Common Camp growth and modest clearing form a useful immediate-versus-later choice.                                                      |
| Wilds      | Sawmilling    | Retain                          | Sawmill plus Catapult is already a strong related economic/military tier-3 bundle.                                                       |
| Wilds      | Marksmanship  | Retain                          | A cheap mobile ranged role is a sufficient tier-2 military payoff.                                                                       |
| Wilds      | Fieldcraft    | Revise Saboteur only            | Replant/movement/sight remain; Saboteur gains broader economic disruption through innate Pillage at cost 6.                              |
| Industry   | Surveying     | Retain                          | Deposit reveal, Mountain access, and high-ground sight are valuable information/position tools despite conditional extraction.           |
| Industry   | Mining        | Retain                          | Mine 6/+4 is deliberately bold for very rare Ore.                                                                                        |
| Industry   | Metallurgy    | Retain                          | Forge and Heavy already justify an exceptional resource-supported endpoint.                                                              |
| Industry   | Quarrying     | Revise Barracks                 | Quarry remains 5/+3; Barracks becomes a useful off-deposit 4-Coin, +2-capacity floor.                                                    |
| Industry   | Masonry       | Revise Stoneworks; reserve room | Stoneworks gains an ordinary-site base and placement requirement. The node reserves a future wildcard role but needs none today.         |
| Mobility   | Scouting      | Retain                          | Scout converts sight/mobility/detection into expansion and military information; cost 4 limits chest repayment.                          |
| Mobility   | Roads         | Retain                          | Roads supply direct reinforcement geometry and the later Market connection; no population is needed here.                                |
| Mobility   | Commerce      | Retain                          | Bounded recurring income is a distinct capstone whose actual payback remains a measurement target.                                       |
| Mobility   | Raiding       | Retain                          | Raider is an affordable single-target closer and preserves a different price horizon from Lancer.                                        |
| Mobility   | Maneuver      | Retain                          | Lancer plus ZOC freedom gives the tier-3 node a substantial combined-arms payoff.                                                        |
| Warfare    | Drill         | Retain                          | Guard plus first-hostile-capture Spoils gives defense and bounded conflict economy without recapture farming.                            |
| Warfare    | Fortification | Revise                          | Existing city defense remains useful only in unwalled cities; +1 capacity per owned city adds a non-entrenching durable payoff.          |
| Warfare    | Explosives    | Retain                          | Breacher plus general Pillage is a strong siege/conflict-economy endpoint; Saboteur's innate exception does not obsolete general access. |
| Warfare    | Medicine      | Retain                          | Medic creates a support role and saves replacement/retreat tempo, a real military-economic benefit.                                      |
| Warfare    | Recovery      | Retain                          | Heal 6, friendly idle recovery, and Disband are a coherent sustain/refund package even without another unit.                             |

Each branch therefore has economic and military value across the package:
Settlement has growth/mixed construction plus Envoy; Wilds has harvesting/
timber plus ranged and covert roles; Industry has rare high-yield extraction,
capacity, Heavy, and mountain position; Mobility has exploration/Road/Market
economics plus three mobility roles; Warfare has conflict income/capacity/
refunds plus defense, support, and siege.

## 4. Accepted revisions and arithmetic

### 4.1 Ordinary economic floors

Windmill becomes 0 without a reachable Farm and otherwise
`min(8, 2 + connected Farms)` at cost 5:

| Farm count | Total build cost | Farms + Windmill population | Population/Coin |
| ---------: | ---------------: | --------------------------: | --------------: |
|          1 |               10 |                           5 |            0.50 |
|          2 |               15 |                           8 |            0.53 |
|          4 |               25 |                          14 |            0.56 |
|          6 |               35 |                          20 |            0.57 |

The prior totals were 3, 6, 12, and 18. The revision helps small sites most and
leaves the total processor cap at 8. Sawmill remains unchanged because Forest
is common and the node already unlocks Catapult.

Stoneworks becomes
`min(16, 2 + 2 * adjacent Quarries + 2 * opposite pairs)`, costs 6, and
requires at least one adjacent same-city Quarry. It remains built but falls to
0 if every qualifying Quarry is later lost:

| Geometry                | Total build cost | Quarry + Stoneworks population | Prior total |
| ----------------------- | ---------------: | -----------------------------: | ----------: |
| 1 Quarry                |               11 |                              7 |           5 |
| 2 non-opposite Quarries |               16 |                             12 |          10 |
| 2 opposite Quarries     |               16 |                             14 |          12 |
| 4-Quarry cross, 2 pairs |               26 |                             26 |          24 |

Again, the one-deposit floor receives the largest relative increase. The rare
shape remains excellent without raising the cap.

Workshop remains cost 4 but requires one adjacent basic type and gives
`1 + distinct types`, or 2–5; it gives 0 after losing every basic type. A
single Farm complex is 4 population for 9 construction Coins; two types give 3
Workshop population. It supports ordinary mixed development without replacing
specialized processors.

Grand Works remains cost 7, requires two distinct adjacent positive-output
processor types, and gives `4 + 2 * distinct types`, or 8/10/12. It remains
built but gives 0 with fewer than two qualifying types; an empty Forge cannot
fake support. Its marginal building is stronger than a 5-Coin Windmill giving
6 with four Farms or a 6-Coin Forge giving 6 with two Mines because it inherits
at least 53/85 research Coins at one/three cities, two productive processor
investments, rare adjacency, and an empty tile. Computation is acyclic: basics,
then specialized processors, then mixed buildings. Market remains unchanged
and does not acquire this positive-output test.

A minimal illustrative Windmill + Forge + Grand Works package using one Farm
and one Mine costs 29 construction Coins and contributes 20 total live
population: Farm 2, Windmill 3, Mine 4, Forge 3, and Grand Works 8. A fresh city
with 20 total population reaches level 6 exactly. Its reward work is level 2,
3, and 4 choices, a level-5 Juggernaut/Treasury-12 choice, then automatic
Treasury 5 at level 6, processed sequentially. Grand Works output 8 also unlocks
Engineer. This is intentionally spectacular, but it requires three tier-3
paths, exact adjacency, resource access, and construction; it remains a primary
playtest risk.

Farm, Mine, and Quarry now cover their markers while built and restore Fertile
Ground, Ore, or Stone when Pillaged or Redeveloped. A removed Camp leaves its
Forest but no Game; harvested Fruit/Game and all other removals restore nothing.
This is deterministic, adds no stored underlying-resource field, gives no
refund or permanent population, consumes no PRNG, and makes the stronger live-
output network disruptable without letting one raid permanently erase a scarce
production site. Rebuilding costs normal Coins and restores the dependency-
ordered live output.

For an exact repair example, take the 20-live-population level-6 package above
as its city's only population source. Removing its Mine removes Mine 4, drops
Forge from 3 to 0, and drops Grand Works from 8 to 0 because only the positive
Windmill remains; live population becomes 5 and level-6 progress becomes -15.
The restored Ore makes repair possible. With no Market, the revised
`max(1, base + market + negative)` rule gives a regular city 1 Coin instead of
0 (its unreduced income would be 6) and likewise gives a capital 1 instead of
0 (unreduced 7). Starting from 0 Coins and assuming no siege, Blackout, or other
flow, the Mine can be rebuilt for 6 after six income turns; live output then
returns to 20 and regular/capital income to 6/7. The monotonic level, stored
level-2-through-6 rewards, and permanent Engineer unlock do not repeat. This is
an analytical repair boundary, not evidence that the city survives the raid or
siege.

### 4.2 Capacity without stronger turtling

Barracks becomes cost 4 and +2 local capacity, one per city and adjacent to its
center. Fortification adds +1 capacity to every owned city while retaining 2x
Fighter/Guard defense only in unwalled friendly cities.

At three cities, Drill + Fortification costs 18 and supplies three distributed
slots plus its defense rule. Surveying + Quarrying also costs 18, after which a
4-Coin Barracks supplies two local slots but consumes a valuable center-adjacent
tile. The effects stack and serve different plans. Capture recomputes the new
owner's Fortification effect; neither capacity loss nor Barracks destruction
kills units, but training stops and Defection reservations revalidate.

The revision does not strengthen Walls or healing. That would reinforce the
same static defense the siege roster is meant to challenge.

### 4.3 High-level rewards

Cumulative population needed to reach levels 5 through 11 is 14, 20, 27, 35,
44, 54, and 65. The previous rule offered a 40-HP Juggernaut at every one of
those levels. Revision 2 offers the unit/Treasury choice only at 5, 8, 11, ...;
levels 6, 7, 9, 10, ... automatically grant 5 Coins without a modal.

Eligible Treasury is 12 Coins, not 5. Twelve Coins can fund six Fighters if
capacity permits, or a 7-Coin Heavy and 4-Coin Medic after their research, while
Juggernaut concentrates 40 HP, Attack 4, Defense 4, Push, and Capture into one
capacity slot. The comparison is now army concentration versus flexibility or
economic reinvestment. It is still a design judgment, not proof of equal pick
rate. If Juggernaut has no legal placement when the milestone becomes next,
Treasury 12 resolves automatically rather than showing a one-button modal.

From level 5 through 10, a city now offers at most two Juggernauts and receives
20 automatic Treasury Coins at the intervening levels. Unique reached-level
history, monotonic city level, and sequential reward settlement prevent capture,
population loss, or rebuilding from repeating a payout.

### 4.4 Saboteur

Saboteur costs 6 and may use ordinary terminal +1 Pillage without Explosives.
Other roles still require Explosives. Pillage has no cooldown, but the Saboteur
is exposed to the improvement owner and allies through that owner's next End
Turn, just as after Attack. Blackout keeps its garrison/Scout prevention,
round+3 unit cooldown, capped one-turn denial, and city recovery.

The first-copy one-city package falls only from 28 to 27 Coins. Its real gain is
a second job: forcing a valuable live-output outage and paid reconstruction
when a garrison makes Blackout impossible. Farm/Mine/Quarry sites are repairable,
so this is not permanent resource deletion. It still sacrifices a 6-Coin
fragile unit's action and position for 1 Coin, cannot Capture, and becomes
targetable. Play must establish whether repair cost and cascade downtime make
repeated Pillage too efficient or exposure makes the option merely credible.

### 4.5 Wildcard room

Masonry is the reserved extension point for at most one future trainable
wildcard role. Revision 2 defines no role ID, stats, command, art, UI placeholder,
or balance credit for it. A later version may activate the slot only if playtest
shows a coherent battlefield job missing from the current roster. It cannot be
RNG, a general stat upgrade, a 26th technology, or a counter required for the
present game to function.

### 4.6 Personal achievements and Monument

Two fixed personal achievements each provide one lifetime placement entitlement:

- Engineer: an owned population processor/mixed building from the explicit
  eligible list reaches current individual live output 6.
- Muster: own living units from four distinct trainable roles simultaneously;
  converted and treasure/reward-created trainable roles count, Juggernaut does
  not, and the technologies need not currently be owned.

Each entitlement places one shared Monument for 0 Coins and +3 LIVE population.
It occupies an empty owned tile, allows an existing Road, and each city may hold
one. Entitlements stay unlocked/spent through later losses; destruction,
capture, Pillage, or Redevelop never refunds a consumed one. The same
entitlement cannot rebuild, but a different unlocked/unspent entitlement may
place on an eligible city after removal. A captured Monument transfers with its
city and still contributes a publicly visible +3. Its source-achievement
provenance remains visible to the current owner without an original-player link
or a requirement that the captor spent the same entitlement; other viewers see
the building and +3 but not that provenance. The captor's own entitlements are
independent. Two achievements therefore cap self-funded placements at two, not
total owned Monument contribution: conquest can retain additional enemy
Monuments.

These triggers reward spatial construction and combined arms without a race,
kill count, conquest count, treasury threshold, per-hit history, or hidden
enemy information. Unlocks do not open a modal. The system adds at most +6 from
a player's own milestones, but its free growth can still accelerate low-level
rewards and may prove unnecessary or snowballing in playtest.

## 5. Unit and counterplay verdicts

- **Fighter, Scout, Marksman, Guard, Raider, Medic, Heavy, and Breacher:** keep
  current stats and jobs. Their main open question is coin-normalized adoption,
  not a demonstrated rules defect.
- **Catapult:** keep cost 8, Attack 3.5, Defense 0.5, range 2–3, no move-fire,
  and weak same-range retaliation. Replace false “adjacency silences it” advice
  with exact target geometry and healing-aware combined-arms planning.
- **Envoy:** keep cost 6 and delayed full Defection. Its visible source, exact
  capacity reservation, one complete target-owner reply, range revalidation,
  exhausted conversion, and ordinary death/movement/displacement replies form
  a coherent controller. A Move-1 Guard at offer range 1 can only retreat to
  range 2 on an ordinary step; only a range-2 start or sufficient Road geometry
  permits retreat beyond 2 in one turn. AI/UI must calculate the real route.
- **Lancer:** keep cost 9, Move 3, and the three-attack Pursuit ceiling. Full-
  health durable screens still stop the chain; no symmetry with other expensive
  roles is required.
- **Saboteur:** retain concealment and Blackout, with only the cost/Pillage
  revision above. A center garrison intentionally blocks Blackout but no longer
  erases the role's whole disruption purpose.
- **Juggernaut:** keep exact combat stats and reward-only status. Scarcity comes
  from revised cadence rather than a stat nerf. Defection eligibility remains
  a visible, interruptible high-swing test item.

No role-ID matchup bonus is added. The review found no missing mandatory role,
so the wildcard remains design room rather than content.

## 6. Playtest uncertainties and required evidence

- first-root and first-tier-3 adoption/win rate, stratified by eligible local
  economic sites and board size;
- actual Market and Grand Works completion rounds, construction footprint,
  payback, level jumps, reward work, and whether Grand Works is a strategic goal
  or a win-more flourish;
- ordinary versus top-decile Windmill/Stoneworks output and whether the new
  floors make their paths useful without flattening geography; contributor-loss
  outages, repair turns, output resumption, and time spent at the one-Coin floor;
- Fortification and Barracks adoption, slots used, overcapacity, Defection
  reservation displacement, and capacity gained through conquest;
- reward choice rate at 12 Coins, Juggernauts per city/match, automatic Treasury
  timing, and city reward time/modal count;
- Engineer/Muster unlock and placement round, city selected, forgone tile value,
  levels/rewards caused, captured Monuments, and whether either achievement
  changes play or merely pays normal progress;
- one/two/three-Catapult siege duration with healing, Catapult survival and
  setup time, mixed Breacher attacks, and ranged-army concentration;
- Saboteur Pillage targets, immediate live value lost, cascaded zero outputs,
  marker restoration/rebuild timing, repeated survival, exposure response,
  Blackout attempts blocked, and total disruption per unit;
- Envoy cancellations/resolutions and emotional fairness, plus exact Guard and
  reward-unit responses; Lancer attacks/kills per activation and screen stops;
- Fighter share and coin-normalized damage, survival, captures, and capacity by
  role, watching for advanced units either crowding out basics or never repaying
  their total path cost;
- AI decisions compared with legal public information, including no forecast
  from hidden enemy research or concealed counterpressure.

The first tuning response should target the observed failure. Do not buff every
conditional node, lower the whole research curve, strengthen Walls, and raise
siege damage together; those changes would erase which cause mattered.

## 7. Implementation and compatibility impact

Revision 2 intentionally disagrees with the partial existing v7 implementation.
No old development save or replay is silently reinterpreted. Numeric schema and
envelope version remain 7, while exact ruleset ID changes to
`pulp-wars-poc-7r2`, faction tree to `ORIGINAL_BASELINE_V3`, and browser storage
to `pulpWars.save.v7r2.current`. The old `pulp-wars-poc-7`/
`ORIGINAL_BASELINE_V2` identity and `pulpWars.save.v7.current` key are recognized
as incompatible development data, preserved, and never migrated or deleted.
Replay dispatch requires exact `setup.rulesetId`, derives the Original faction
registration and reconstructed state tree from that ruleset, and rejects r1
under r2; `MatchSetupV7` does not gain an invented tree field. The v6 route and
key stay unchanged.

Required implementation boundaries are:

- `pulp_wars-aya.22`: revision-2 identifiers, strict development-artifact
  incompatibility, and routing/storage separation;
- `pulp_wars-aya.23`: revised economy formulas/prices, dependency-ordered
  zero-output/resumption rules, exact Farm/Mine/Quarry marker restoration,
  non-besieged one-Coin income floor, previews/events/tests, Fortification/
  Barracks capacity, Saboteur price, and level-reward cadence/order;
- `pulp_wars-aya.24`: achievement/Monument engine state, private/public schemas,
  projection, commands/events, persistence, replay, and deterministic tests;
- `pulp_wars-aya.7`: resume Envoy implementation only after the three serial
  prerequisites above, so reservations use revision-2 capacity;
- `pulp_wars-aya.8`: add Saboteur innate Pillage and `PILLAGE` exposure reason
  with Blackout/Concealment;
- `pulp_wars-aya.9`: recalibrate AI economy, capacity, reward, achievement,
  healing-aware siege, Saboteur, and exact Defection geometry using public data;
- `pulp_wars-aya.10`: route and persist only the r2 identity/key while preserving
  old development and v6 data;
- `pulp_wars-aya.13`: produce/review shared Barracks and Monument art through the
  approved checked-in PixelLab workflow;
- `pulp_wars-aya.15`: present revised formulas, values, rewards, achievements,
  Monument placement, and capacity in the core UI;
- `pulp_wars-aya.17`: present exact Pillage exposure, siege/healing and Defection
  counter geometry in mechanic UI;
- `pulp_wars-aya.18`: validate the complete r2 release, new corpus, browser,
  assets, AI/headless parity, persistence/replay, and frozen v6 compatibility.

AI, UI, schemas, events, queries, telemetry, save/replay, fixtures, and release
tests must all use the exact revised values and identity. Existing r1 fixtures
remain useful only as explicit incompatibility inputs. No v6 golden or release
corpus is refreshed as part of this redesign.
