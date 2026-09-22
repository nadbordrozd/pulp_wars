# Ruleset 7 revision 6: water and naval play

**Status:** authoritative specification approved for implementation; the current
runtime remains `pulp-wars-poc-7r5` until the revision-6 implementation and
release gates pass.

**Ruleset ID:** `pulp-wars-poc-7r6`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V1`

**Scope:** this document supersedes the
[water and naval proposal](WATER_NAVAL_PROPOSAL.md) and replaces earlier
Ruleset 7 setup, map generation, water economy, technology order, unit roster,
Normal-AI naval policy, public-view additions, save identity, and corresponding
validation rules. [Revision 5](RULESET_7_REVISION_5_ACHIEVEMENTS.md) remains
authoritative for achievements and Monument placement. [Revision 4](RULESET_7_REVISION_4_BIOME_ECONOMY.md)
remains authoritative for land biomes, land resources, Mine/Forge economy, and
their unchanged AI/public rules. The [Ruleset 7 baseline](RULESET_7.md) supplies
all other unchanged rules. This is a planned implementation contract, not a
claim that water is present in the current playable build.

## 1. Product decisions

Revision 6 adds five selectable map types, two water terrains, Fish, Pearls,
Ports, one three-node naval research branch, embarked transport, Patrol Boat,
and Battleship. `CONTINENTS` is the default for a new match. `DRY_LAND` remains
available for a land-only match. Water uses ordinary cells, ownership,
exploration, fog, occupancy, combat, and city footprints; it does not add a
shipping inventory, supply chain, second board, or separate naval capacity.

The selected balance values deliberately make the first crossing affordable
without making Ports free growth. Fish matches the existing one-population
harvest ratio. Pearls give a bounded net two-Coin return. A Port costs four
Coins for one live population and has no city cap, while trade pays at most one
Coin per eligible noncapital city. Patrol Boat is a fast affordable screen.
Battleship has decisive attack but costs ten Coins and must choose movement or
fire, so an invasion still needs vulnerable land units and a beachhead.

Land connectivity is not a global acceptance rule. `PANGEA` promises a main
shared landmass and `DRY_LAND` retains the connected-capital land baseline;
`CONTINENTS`, `ARCHIPELAGO`, and `LAKES` may require sailing. An inland capital
with useful land expansion need not be coastal. A capital without useful land
expansion receives an affordable sea escape; that escape may require Navigation
only when its local land/economy gives enough productive runway to fund it.

## 2. Identity, setup, and compatibility

### 2.1 Exact identities

| Boundary                                   | Exact value                         |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r6`                 |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r6.current`        |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V1`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V4` |

Numeric version 7 is retained because revision dispatch also requires the exact
ruleset ID and exact setup. Revision-6 readers reject every earlier Ruleset-7
ruleset ID and map revision; they never migrate, reinterpret, or replay an
earlier state under revision 6. Ruleset 6 remains frozen and separately routed.

On the normal/current route, before deriving Hub save state, remove only these
known incompatible prototype/current Ruleset-7 keys:

```text
pulpWars.save.v7.current
pulpWars.save.v7r2.current
pulpWars.save.v7r3.current
pulpWars.save.v7r4.current
pulpWars.save.v7r5.current
```

Report which exact keys were removed. Preserve `pulpWars.save.current`,
`pulpWars.settings.v1`, `pulpWars.save.v7r6.current`, and every unrelated key.
Do not parse or migrate removed values. Restart, Replace, Resume, and Delete on
the current route operate only on `pulpWars.save.v7r6.current`.

### 2.2 Exact setup

Revision 6 adds one required field and changes the exact map revision:

```ts
type MapTypeV7 = "DRY_LAND" | "PANGEA" | "CONTINENTS" | "ARCHIPELAGO" | "LAKES";

interface MatchSetupV7R6 {
  readonly rulesetId: "pulp-wars-poc-7r6";
  readonly seed: number; // uint32
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: "CORAL" | "TEAL" | "GOLD" | "VIOLET";
  readonly factions: readonly "ORIGINAL"[];
  readonly mapType: MapTypeV7;
  readonly mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1";
}
```

Width equals height. Existing minimum widths remain exact: 11/14/16 for 1/2/3
AI. Explicit 20 and 25 are legal for every AI count. Auto resolves by AI count
to 11, 14, or 16. The setup screen orders the five choices exactly as the union
above and initially selects `CONTINENTS`. Existing faction, seat, color,
difficulty, and relationship rules remain unchanged.

Frozen appended identifier orders are:

- `TerrainId`: existing `GRASS`, `FOREST`, `MOUNTAIN`, then `SHALLOW_WATER`,
  `DEEP_WATER`;
- `ResourceId`: existing revision-4 order, then `FISH`, `PEARLS`;
- `ImprovementId`: existing revision-5 order, then `PORT`;
- `TechnologyId`: existing revision-5 preorder, then `SHORECRAFT`, `NAVIGATION`,
  `NAVAL_ENGINEERING`;
- `UnitRoleId`: existing revision-5 order, then `PATROL_BOAT`, `BATTLESHIP`.

`EMBARKED_TRANSPORT` is a required unit form/presentation ID, not a trainable
role, technology-unlock count, or separate unit entity.

## 3. Deterministic map generation

### 3.1 Shared generator boundary

Generation uses the one setup-seeded Mulberry32 version-1 stream and at most
256 complete candidates. Rejection continues from the post-attempt PRNG state;
it never rewinds or relaxes a constraint. Attempt 256 returns the existing
atomic `MAP_GENERATION_FAILED` result. Candidate generation, validation, and
final serialization are renderer-independent. Equal exact setups and seeds
must produce byte-identical board state, settlement assignment, turn order,
treasures, final PRNG state, canonical JSON, and hash.

Each attempt constructs, in order: a structured topology mask for the selected
map type; shallow/deep classification; the revision-4 regional biome and land
terrain/resource field on land cells; settlements and city footprints; the
settlement economic floor; water resources; capital assignment and turn order;
then treasure placement from the continued stream. The implementation must
freeze its bounded draws and tie breaks in `(y,x)` order. No rejection branch
may change how many draws the completed attempt consumes. Cosmetic water or
resource variants never consume simulation PRNG.

`DRY_LAND` is the exact revision-4 accepted board algorithm, legal setup matrix,
draw schedule, and distributions apart from the new setup/ruleset/map
identities. For otherwise equal revision-5 setup fields and seed, selecting
`DRY_LAND` must preserve the prior board, settlements, capital/seat assignment,
turn order, treasures, and post-generation PRNG state byte for byte. It contains
zero water, Fish, Pearls, or Ports. For the other types, water masking happens
before the regional land pass. A water tile has required `biome: null`; a land
tile has the exact revision-4 biome union. Land-only conditional terrain/resource
weights, Ore reveal, Mine/Forge rules, and biome semantics remain unchanged.

### 3.2 Topology acceptance

Land and water component tests are eight-way. Coast contact, Port placement,
routes, movement, range, and landing adjacency also use the game's ordinary
eight-way geometry. A **major land component** has at least
`max(6, floor(boardArea / 20))` cells. Percent bounds include settlement cells
and round outward: a candidate passes when its integer count lies between
`ceil(minPercent * area)` and `floor(maxPercent * area)`.

| Map type      | Land share | Required structure                                                                                                                      |
| ------------- | ---------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DRY_LAND`    |       100% | No water; revision-4 connected-capital acceptance.                                                                                      |
| `PANGEA`      |     68–76% | One major land component contains every capital, every village, and at least 90% of all land; at least one deep-water component.        |
| `CONTINENTS`  |     50–62% | Exactly 2 major components for 2 total players, otherwise exactly 3; each has a settlement; capitals occupy at least 2 components.      |
| `ARCHIPELAGO` |     34–46% | Between `playerCount` and `2 * playerCount + 2` major components; each capital starts on a different major component.                   |
| `LAKES`       |     72–84% | At least 2 enclosed water components of at least 4 cells; at least 75% of water is not board-edge-connected; capitals need not connect. |

For `CONTINENTS`, no major component may hold more than `ceil(2 * settlements /
3)` settlements. For `ARCHIPELAGO`, no major component may hold more than half
of all settlements, rounded up; every major component has coast. Pangea may
contain small offshore islands. Continents and Lakes may contain minor islands.
The generator does not promise an all-land path except where the table says so.

For every non-dry type:

- water is at least the table minimum, shallow water is at least 40% of water,
  and deep water is at least `max(4, floor(water / 10))` cells;
- every deep cell belongs to a water component that also contains shallow
  water; there is no isolated unusable deep pocket;
- `SHALLOW_WATER` is every water cell at Chebyshev distance 1 from land;
  remaining water is `DEEP_WATER`;
- every major land component has at least two distinct legal landing cells and
  at least two adjacent shallow cells;
- a one-cell enclosed water component and a water component with no legal Port
  or landing relationship reject as decorative noise.

Every settlement-containing land component that is separate from another
settlement-containing component has at least one settlement reachable by land
within that component whose initial 3 x 3 or potential expanded 5 x 5 footprint
contains a legal Shallow-Water Port site. Treat settlement-containing land
components as nodes and legal eventual Navigation water routes between their
Port/landing pairs as edges; this graph must be connected. Consequently every
capital and village is reachable after the required land and naval research,
and no inhabited continent is sealed inland. This eventual reachability does
not make every capital coastal or replace the immediate owned-Port rule for a
capital that lacks useful land expansion.

These are exact acceptance bands, not global target quotas. Structured masks
must produce recognizable coastlines and bodies rather than independently
sampling each tile. The production implementation records the exact mask
growth/erosion algorithm, draw schedule, and row-major tie breaks beside the
generator; changing any of them requires a new map-generation revision.

### 3.3 Settlements, starts, and no-stranding rule

Total settlements remain size-based: 5, 7, 10, 15, and 22 on widths 11, 14,
16, 20, and 25. The first `playerCount` are capitals and the remainder are
neutral villages. Settlements are land Grass and may be directly adjacent to
water; the settlement cell itself is never water. Every pair retains exact
Chebyshev spacing at least 3, and every pair of capitals retains exact spacing
at least `floor(width / 2)`. No player receives special starting Coins.

Define a capital as having **useful land expansion** when a land path of at
most `width` steps, traversable by its starting Fighter with starting
technology, can reach a neutral village or hostile capital and its initial
footprint/ring meets the revision-4 economic floor. Every capital in a non-dry
map must pass the common economic fairness checks. A capital without useful
land expansion must additionally pass all sea-escape checks below:

1. Its initial 3 x 3 footprint contains at least four land cells, one owned
   shallow-water cell touching its land, and one such cell legal for a Port
   after resource coexistence is considered.
2. Its footprint/ring contains at least three usable economic opportunities
   from at least two families. Fish counts as the water family; revision-4
   Agriculture, Timber, and Metal are the land families. At least one
   opportunity is on land. Fish is required only when the capital otherwise
   lacks enough local population/Coin runway for its route.
3. From an owned legal Port cell, an eight-way water route of at most
   `max(5, width - 2)` steps reaches water adjacent to an empty legal landing
   on a different settlement's land component. The associated settlement is a
   neutral village or hostile capital, and it has at least two legal landing
   cells.
4. If that route includes Deep Water, starting 5 Coins plus at most six
   ordinary unsieged capital income awards must cover Shorecraft, Navigation,
   and one Port: at one city the exact total is 16 and the no-development
   income floor supplies 17 after six awards. A Shallow-only route must cover
   Shorecraft and one Port, exact total 9, after at most two such awards. The
   initial footprint/ring must still retain at least one legal population
   action after identifying the route. These are acceptance calculations with
   no competing spending, grants, or discounts.

Every capital, including an inland Pangea capital, uses the revision-4
development score extended with Fish worth 1 and Pearls worth 1. Every capital
scores 6 through 17 and the within-map range is at most 5. A useful-land capital
may satisfy its complete floor on land and need no owned water, Fish, or Port.

Thus a player who needs the sea can buy the required technology and Port from
its accepted local economy without first training another unit or unlocking
capacity. The starting Fighter remains assigned to the capital and can use that
Port. Pangea and other land-viable starts are not forced to invest in water.

### 3.4 Water resources

After land resources, every nonsettlement water cell receives exactly one
categorical resource draw in `(y,x)` order:

| Terrain       | Fish | Pearls | None |
| ------------- | ---: | -----: | ---: |
| Shallow Water |  28% |    10% |  62% |
| Deep Water    |   0% |    16% |  84% |

After all water draws, the conditional sea-escape floor may deterministically
replace the lowest-rank eligible owned shallow cell's resource with Fish when a
capital needs Fish for the affordability test; it consumes no additional draw
and never changes a Port site's terrain. A tile has at most one resource.
Fish exists only on Shallow Water. Pearls may exist on either water terrain.
Neither resource appears on `DRY_LAND`.

Fish and Pearls are visible on every explored water tile from match start.
Research gates use, not visibility. Resources may coexist with a Port in the
separate improvement layer. Harvest removes only the resource; building,
blockading, reactivating, transferring, or removing a Port never creates,
removes, or restores one.

## 4. Naval technology and coastal economy

### 4.1 Fifth research branch

The existing city-count price formula applies without exception:

```text
tier 1 = 5 + (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

| Tier | ID                  | Requires   | Exact unlocks                                                                           |
| ---: | ------------------- | ---------- | --------------------------------------------------------------------------------------- |
|    1 | `SHORECRAFT`        | —          | Harvest Fish/Pearls on shallow water; build Port; embark; shallow movement; Patrol Boat |
|    2 | `NAVIGATION`        | Shorecraft | Deep-water movement and deep-water Pearl harvest                                        |
|    3 | `NAVAL_ENGINEERING` | Navigation | Battleship                                                                              |

The technology screen renders this as a fifth branch after Industry & Warfare,
with visible prerequisite lines and the same locked/available/researched
semantics as land branches. It must not reorder the existing 21 nodes.

### 4.2 Fish, Pearls, and Port

Tile economy retains the existing explored, owned, assigned-city, no-siege,
no-active-Blackout, and no-pending-reward gates.

| Action        | Exact target                                                         | Tech       | Cost | Result                                       |
| ------------- | -------------------------------------------------------------------- | ---------- | ---: | -------------------------------------------- |
| Harvest Fish  | Shallow Water + Fish                                                 | Shorecraft |    2 | remove Fish; +1 permanent population         |
| Gather Pearls | Shallow Water + Pearls                                               | Shorecraft |    2 | remove Pearls; receive 4 Coins; net +2 Coins |
| Gather Pearls | Deep Water + Pearls                                                  | Navigation |    2 | remove Pearls; receive 4 Coins; net +2 Coins |
| Build Port    | owned explored Shallow Water touching land assigned to the same city | Shorecraft |    4 | add Port; +1 live population while active    |

Pearl collection requires the player to hold the 2-Coin cost and preflights
the final net and intermediate safe-integer bounds atomically. Its event reports
`cost: 2`, `coinsReceived: 4`, and `coinDelta: 2`. Fish behaves like Fruit for
growth and never regenerates.

A Port requires no existing improvement, but its tile may contain Fish or
Pearls, a unit, and ownership. It cannot contain a settlement or Road. There is
no per-city Port cap. A friendly occupant does not deactivate a Port but makes
that tile unavailable for recruitment. Harvesting a coexisting resource leaves
the Port intact; building a Port leaves the resource intact.

An **active Port** is owned by its assigned city's current owner and has no
hostile afloat unit on its tile. Each active Port contributes +1 live
population. A hostile Patrol Boat, Battleship, or embarked transport occupying
the tile blockades it. A blockaded Port contributes zero population and cannot
recruit, recover, embark, harvest its resource, or participate in a route.
Leaving or removing the hostile unit reactivates it immediately. Recompute city
economy, levels, rewards, income preview, and network facts after blockade
begins or ends; negative live population never lowers city level or repeats a
reward. A friendly or formal-allied occupant is not a blockade, though any
occupant prevents recruitment.

Ports transfer with their city's exact footprint. A vessel never claims water
or a city. Port cannot be Pillaged: existing Pillage requires the actor to stand
on a hostile improvement, and every afloat land unit has specials disabled,
while naval roles have no Pillage capability. Redevelop may remove an owned
unoccupied Port under the ordinary city/economy gates and restores no resource.

### 4.3 Sea network, trade, and Roads

For each player, build one deterministic infrastructure graph:

- city-center nodes use the existing eight-way owned Road/city-center edges;
- every active Port attaches to its assigned city center;
- two active Ports of different cities share a sea edge when an eight-way
  continuous route of viewer-explored water connects them; Shallow Water is
  legal with Shorecraft and Deep Water only with Navigation;
- route search orders neighbors in the existing canonical direction order and
  coordinates `(y,x)`; neutral, hostile-owned, and occupied transit water are
  legal for connectivity; only the canonical shortest route is exposed;
- Ports of the same city do not create a trade edge or payment.

The combined graph, rather than Roads alone, defines capital connection for the
existing Market Road bonus. A remote city connected by Road to its Port, by sea
to another Port, and from there by Road to the capital is capital-connected.
Road discounts still apply only on Road/city-center movement cells; the graph
does not grant a sea movement discount. Mid-lane units still contest actual
movement through occupancy and ZOC, but never erase trade connectivity. Only
a hostile afloat unit standing on a Port disables that Port and its links.

At Start Turn, each noncapital city earns exactly +1 trade Coin when it is in
the combined capital-connected component and has at least one active sea edge
to a distinct city. The capital earns no separate trade Coin. A city earns at
most one, regardless of Port count, destinations, or redundant routes. Add the
trade Coin to that city's income before the ordinary Blackout suppression cap;
siege still makes its income zero. A blockade removes only routes that depended
on the blocked Port, then recomputes alternate routes. Mid-lane occupation
never breaks trade; apart from active endpoint Ports, connectivity depends only
on explored navigable water geometry and the owner's technology.

Infrastructure is owner-private. Formal allies do not share Ports, routes,
Roads, Market connection, trade income, exploration, or recovery. An allied
Port is not friendly for embarkation or recruitment.

## 5. Movement, embarkation, and naval combat

### 5.1 Terrain passage and embarkation

Land roles cannot enter water in land form. Naval roles cannot enter land.
Shorecraft permits Patrol Boats and embarked transports on Shallow Water;
Navigation additionally permits them and Battleships on Deep Water. Every
water step costs one ordinary movement point, diagonal or orthogonal; Roads and
city centers never discount it. Unexplored entry and hostile ZOC end movement
under the existing rules.

An owned land unit may embark only when all are true:

- it is on land adjacent to an empty active Port owned by the same player;
- Shorecraft is researched and the Port tile is explored;
- the unit has not moved, attacked, healed, recovered, captured, used a special,
  or begun a Horse Archer attack sequence this activation; and
- it is not a newly trained/rewarded exhausted unit.

`EMBARK { unitId, portAt }` moves the same unit entity onto the Port, changes it
to embarked form, and ends its activation. It consumes no Coin, new entity ID,
or capacity slot. Home city, passenger role, HP/max HP, kills, veteran state,
capacity use, and per-unit cooldowns remain stored unchanged.

At a later activation, an embarked unit has Move 3, Defense 1, Sight 1, no
Attack or range, no retaliation, no ZOC, and no land-role numeric modifiers.
It may spend zero or more of those movement points through legal water and then
`DISEMBARK { unitId, at }` onto an adjacent empty land tile in the same
activation. The land tile must be traversable by its land role and owner and may
be a neutral or hostile shore or city center. Disembark restores land form at
unchanged HP, consumes all remaining movement, and ends the activation. It does
not Attack, advance, become immediately Capture eligible, or bypass Mountain
entry. If it begins the owner's later Start Turn on a village or hostile city
center, ordinary Capture eligibility and wait rules apply. Re-embarkation always
requires another active owned Port.

An embarked unit is visibly an `EMBARKED_TRANSPORT`; its passenger role and
public combat facts remain visible under ordinary explored-unit projection.
There is no hidden cargo, manifest, second hull HP bar, or identity guessing.
Sinking removes the unit and passenger together.

### 5.2 Exact naval roles

| Role        | Unlock            | Cost |  HP | Attack | Defense | Move | Range | Min range | Sight | Move then Attack? | Capture |
| ----------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | --------: | ----: | ----------------: | ------: |
| Patrol Boat | Shorecraft        |    5 |  10 |      2 |       2 |    3 |     1 |         1 |     2 |               Yes |      No |
| Battleship  | Naval Engineering |   10 |  20 |      5 |       3 |    2 |     2 |         1 |     2 |                No |      No |

Both are trainable roles, consume one ordinary home-city capacity slot, may be
promoted, and use the shared combat formula. They may attack hostile afloat
units or coastal land units in range. Patrol Boat may Move then Attack.
Battleship may Move or Attack in an activation, never both; firing marks it
handled, and moving makes Attack unavailable for that activation. Both
retaliate when the incoming attack distance is within their range. Neither
advances, enters land, captures, embarks, carries a passenger, Pushes, Pillages,
Blackouts, or receives terrain/city/Wall/Fortification defense multipliers.

Naval ZOC is the eight water cells adjacent to a Patrol Boat or Battleship that
are legal water for that vessel's owner. It affects hostile water movement in
the ordinary manner. An embarked transport projects no ZOC. A land unit's ZOC
extends onto adjacent water only when that land unit has a legal range-1 Attack
against the visible afloat target; formal allies never project hostile ZOC.

Naval roles may explicitly Recover, or idle auto-recover, only while on or
adjacent to an active Port owned by the same player. Recovery restores 4 HP, or
6 with Recovery technology, and follows existing action/idle gates. They heal
zero elsewhere. Medics cannot Heal a naval role or an embarked unit. Embarked
units cannot Recover or receive Heal until after landing.

### 5.3 Land ability interaction table

| Existing rule or ability | Exact water interaction                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attack/ranged combat     | A land unit may target a visible afloat hostile unit in its ordinary range from shore. A naval unit may target coastal land. Ordinary retaliation range and damage apply.                                                                                                                                                                                           |
| Push                     | Heavy/Juggernaut may Push a surviving afloat target only into an empty legal water cell for that target owner. They never Push a land-form unit into water, an afloat unit onto land, or any unit through a blocked/unknown cell. Patrol Boat and Battleship do not Push.                                                                                           |
| Breach/defense           | Breach can attack an adjacent afloat target and forces its ordinary defense multiplier to 1x; naval units already have no terrain multiplier.                                                                                                                                                                                                                       |
| Charge                   | Raider may receive Charge from a qualifying land move and attack an adjacent vessel from shore. Embarking discards the current activation and cannot carry Charge afloat.                                                                                                                                                                                           |
| Heal/Recovery            | Medic Heal never targets afloat units. Embarked units have no recovery. Ships use only the owned-active-Port rule above.                                                                                                                                                                                                                                            |
| Saboteur/Concealment     | Embarked Saboteur is an ordinary visible transport and has no Concealment, detection aura, Attack, Pillage, or Blackout command afloat. Stored exposure/cooldown timers continue. Concealment is recomputed after landing.                                                                                                                                          |
| Blackout                 | Blackout still targets an adjacent hostile city from land. It blocks that city's Port construction, water-resource actions, naval recruitment, and Redevelop during the active turn. Existing Ports, population, routes, embarkation, recovery, and blockades continue; trade income remains part of pre-Blackout income and can be suppressed by the existing cap. |
| Horse Archer             | It cannot embark after a first shot. A fresh Horse Archer may embark, but has no two-shot Attack afloat; stored attack usage is not reset. Landing ends the activation.                                                                                                                                                                                             |
| Pillage/Disband          | No afloat unit may Pillage or Disband. After landing, ordinary prerequisites and activation state apply on a later activation. Port is not a Pillage target.                                                                                                                                                                                                        |
| Promotion                | Naval roles promote at three kills for +5 max/current HP. An embarked passenger may not Promote afloat; an already eligible passenger may Promote after landing without an action reset. Embark/disembark never clears kills or veteran state.                                                                                                                      |
| Capture/Spoils           | Naval roles and embarked units cannot Capture. A landed capture-capable role uses the ordinary next-Start-Turn eligibility and Capture command; Spoils then works unchanged.                                                                                                                                                                                        |
| Capacity/rewards         | Ships use their recruiting city's ordinary capacity. Militia, treasure Heavy, Juggernaut, and other reward placement remain land-only. No reward creates a ship or transport. Muster counts Patrol Boat and Battleship as distinct living trainable roles; embarked form counts only its passenger role, never an extra role.                                       |
| Training                 | Land roles train at the city center as before. Ships train only on an explicitly selected empty active Port tile assigned to the city; the new ship is full HP and exhausted.                                                                                                                                                                                       |

Water ownership is ordinary city-footprint ownership. Expansion may claim
neutral water. Capture transfers owned water and Ports with the footprint.
Movement through neutral or hostile water does not change ownership. Formal AI
allies retain the existing ban on entering assigned allied territory, including
allied water; human-versus-AI relations remain hostile.

## 6. Commands, public queries, and UI

### 6.1 Required command surface

Revision 6 adds exact typed commands for `HARVEST_FISH`, `GATHER_PEARLS`,
`BUILD_PORT`, `TRAIN_NAVAL`, `EMBARK`, and `DISEMBARK`. `TRAIN_NAVAL` contains
`cityId`, `at`, and role `PATROL_BOAT | BATTLESHIP`; `at` must be the selected
Port. Move and Attack continue using the shared commands. Existing atomic
validation, overflow, command-index, event, canonical ordering, and rejection
semantics apply. Canonical events identify player, city/unit, coordinate, exact
cost/delta, role/form transition, blockade transition, network/trade change,
and all resulting economy/reward facts without depending on presentation.

Every legal new action must be returned by `queryPlayerCommands(PlayerView)`
and accepted by the reducer for the same public facts. The UI and Normal AI may
not construct hidden-authority commands or inspect canonical state. Equal
canonical player views produce byte-identical water paths, commands, previews,
AI tuples, and projected events.

Player views add the exact setup map type; water terrain/resource/Port fields;
owned route and trade facts; unit land/embarked form; naval recovery eligibility;
and owner-safe blockade/network previews. Unexplored water reveals only its
coordinate. Explored Fish/Pearls are exact. Visible Ports and ships are public.
Enemy research, unexplored routes, and unseen blockers are not projected.
Optimistic water movement uses the existing hidden-contact interruption
contract. Route previews never reveal an unexplored coordinate or concealed
Saboteur.

### 6.2 Exact interaction flow

- Setup shows `Dry Land`, `Pangea`, `Continents`, `Archipelago`, and `Lakes`,
  with `Continents` initially selected and accessible explanatory text.
- The technology surface shows the fifth branch and exact costs/unlocks.
- Fish, Pearls, Port population, Pearl `−2 / +4 / net +2`, trade `+1`, and
  blockade loss use the accepted Coin/population icons plus signed semantic
  text; numbers and route state are code-native.
- Selecting an owned explored Port tile opens its tile dock. If it is active,
  empty, assigned to a non-besieged/non-blacked-out city with no pending reward,
  and capacity/Coins/technology permit, that dock offers `Train Patrol Boat`
  and/or `Train Battleship`. Activation directly dispatches `TRAIN_NAVAL` for
  that exact tile. There is no city-center ship spawn, automatic Port choice,
  nearest-Port rule, or second target modal.
- Selecting a land unit beside an eligible Port offers `Embark`; selecting an
  embarked unit offers each exact legal landing tile through map targeting.
- Unit identity uses Patrol Boat, Battleship, or Embarked Transport art and
  labels. The passenger role remains present in accessible transport detail.
- Owned active/blockaded Port state, ship recovery radius, canonical sea route,
  and landing targets use code-native outlines/icons. Fog and public-view rules
  limit every overlay.

No new dedicated research portrait family is required. Shorecraft reuses Port
art, Navigation reuses accepted Deep Water art, and Naval Engineering reuses
Battleship art in the standard technology-card viewport. Patrol Boat and
Battleship portraits derive from their accepted world sources. Action identity
reuses the corresponding resource, Port, ship, or transport source. If live UI
review proves Deep Water unreadable as a Navigation symbol, one separate
128 x 128 `ui-tech-navigation-v7r6` symbol may be generated under the naval art
contract; it is conditional and is not part of the initial required inventory.

## 7. Deterministic Normal AI

Normal remains public-view-only, PRNG-free, and bounded. Existing land command
priority and tuple tie breaks remain unchanged when no naval objective exists.
The policy adds these required behaviors:

1. Detect whether a living capture-capable unit lacks a public land route to a
   known neutral village or hostile city. If so, value exploration toward an
   unexplored coast/naval frontier. Once a public overseas target or promising
   landing frontier exists, identify the cheapest legal Shallow/Deep route and
   value its required Shorecraft, Navigation, usable Port, and departure unit as
   expansion work before optional processors or extra training.
2. Reserve Coins and one city capacity slot only from public facts for the
   cheapest missing step. A reserved Port coordinate is an explored owned
   shallow cell selected by shortest public route, then city ID and `(y,x)`.
3. Embark a capture-capable unit, sail by canonical shortest public route, and
   disembark onto a legal shore that advances toward the target. It must not
   oscillate between Port and land or re-embark without a changed target/path.
4. Against visible naval danger, prefer a Patrol Boat escort before a second
   transport. With sufficient economy and Naval Engineering, value Battleship
   bombardment of a defended landing, but never wait indefinitely for one when
   a legal favorable landing exists.
5. After landing, preserve the unit through the ordinary wait/capture sequence,
   reinforce a contested beachhead, and build/use a captured Port when return
   or reinforcement has public strategic value.
6. Defend visible owned Ports, attack exposed transports before equal-value
   warships, blockade a Port only when the projected population/network denial
   or route control improves the existing deterministic score, and leave a
   blockade when capture/defense has higher priority.

Cooperative AI allies never enter allied land/water, use allied Ports, blockade
allied Ports, attack allied ships/transports, or choose an allied landing. They
may travel neutral water beside an ally. Equal views must yield equal research,
build, recruit, route, landing, target, and command choices.

## 8. Release acceptance

Implementation is complete only when the ordinary Ruleset-7 release gates are
extended with this bounded matrix:

### 8.1 Map and determinism matrix

Run every legal Cartesian cell of 5 map types × supported width/AI combinations
× 2 relationship modes for seeds `0..7`: 960 generated matches across the 12
legal width/AI pairs. Each exact case is generated twice. Require no generation
failure; equal board, settlement, turn-order, treasure, post-generation PRNG
state, canonical JSON, and hash; all topology/start/economy/resource invariants;
and no missing/out-of-bounds cells or invalid city assignments. `DRY_LAND` also
proves prior-seed board and post-generation PRNG preservation.

### 8.2 Rules and persistence fixtures

Focused deterministic fixtures cover both resource terrains; Port/resource
coexistence in both action orders; multiple Ports; blockade begin/end and
negative live population; alternate routes; one trade payment; Road/sea/Market
integration; alliance isolation; every embark/landing restriction; deep-water
Navigation; capacity; promotion; ship recovery; every row of the interaction
table; combat and retaliation at ranges 1/2; Battleship move-or-fire; capture
after landing; save/resume at each new command boundary; exact r6 key cleanup;
earlier-r7 rejection; headless/browser parity; and public-query/reducer parity
with equal-view and hidden-blocker cases.

### 8.3 AI and playable invasion matrix

For each map type, run width 11/1 AI, width 14/2 AI, width 16/3 AI, and width
25/3 AI in Rival and Cooperative modes: 40 cells. Run two exact repeats of one
fixed seed per cell for a bounded observation horizon of 20 rounds or 600 accepted
commands. Require equal command/event/final hashes; no errors, rejections,
public-boundary violations, allied trespass/hostility, scheduler stall,
mandatory-work overflow, or repeated embark/disembark oscillation. Reaching the
declared horizon cleanly is an observation, not a scheduler stall or required
match outcome. Pangea and any other land-connected case need not sail.

Separate fixed legal fixtures cover an isolated capital and a sea-advantageous
target for each non-dry map type. In exact repeat runs they must explore the
naval frontier, research the required path, build and depart through a Port,
land legally, and complete a city Capture after the ordinary wait. At least one
fixture requires Navigation and Deep Water; at least one uses Patrol Boat
escort; at least one uses Battleship bombardment. `DRY_LAND` records zero water
commands.

Additionally run one selected natural `CONTINENTS` seed and one selected natural
`ARCHIPELAGO` seed with a ceiling of 60 rounds or 2,000 accepted commands. Each
must show an AI departure, landing, and completed city Capture without requiring
a terminal match outcome. Record actual wall-clock duration and the existing
AI callback/work-slice performance diagnostics for every natural and targeted
run; do not replace these bounded cases with an unconstrained seed sweep.

Browser evidence launches each map type through real setup controls, verifies
the exact selected/default map type after save/resume, completes one Port
selection/recruit action and one embark/landing flow on a water map, and reaches
an ordinary accepted human boundary after AI return. Visual review covers an
11 x 11 dense coast and a 25 x 25 mixed fleet at minimum/normal/maximum zoom,
native desktop layout at DPR 1/2, fog, every owner color, and selected/blockaded
states. Existing responsive behavior must remain unchanged, but revision 6 adds
no new narrow/mobile visual acceptance target. This evidence demonstrates
deterministic playability, not final human
balance certification.

## 9. Work-package boundary

This contract supports three implementation packages without changing product
authority:

1. production naval art, generation recipes, manifests, and visual evidence;
2. deterministic map/engine/economy/combat/persistence/public-query behavior;
3. Normal AI, setup and match UI, Canvas presentation, browser evidence, and
   end-to-end release validation.

Required implementation details discovered inside a package may be recorded in
tests and architecture documentation, but may not change the exact product
numbers, identifiers, compatibility boundary, or acceptance invariants above
without a separately reviewed contract revision.
