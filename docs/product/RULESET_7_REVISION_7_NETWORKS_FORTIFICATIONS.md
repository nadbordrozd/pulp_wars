# Ruleset 7 revision 7: networks and fortifications

**Status:** implemented and release validated on 2026-09-23; now inherited by
the current [revision-8 overlay](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md).

**Ruleset ID:** `pulp-wars-poc-7r7`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2`

**Scope:** this document is the revision-7 overlay over the implemented
[revision-6 water and naval contract](RULESET_7_REVISION_6_WATER_NAVAL.md). It
replaces revision-6 rules only where named below: identity, one non-dry map
acceptance rule, Roads and infrastructure networks, embarkation, Battleship,
the Industry & Warfare technology graph, Saboteur/Blackout removal, and land
defense. Revision 6 and its inherited revision-4 and revision-5 contracts remain
authoritative everywhere else. Ruleset 6 is unchanged.

## 1. Revision identity and compatibility

| Boundary                                   | Exact value                         |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r7`                 |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r7.current`        |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V4` |

Numeric version 7 remains valid because dispatch also requires the exact
ruleset ID and exact setup. Revision-7 readers reject every earlier Ruleset-7
ruleset ID and map revision. They do not migrate or reinterpret revision-6
state. The current route removes the known incompatible Ruleset-7 autosave keys
through `pulpWars.save.v7r6.current`, preserves the Ruleset-6 key, settings, the
revision-7 key, and unrelated storage, and operates only on
`pulpWars.save.v7r7.current`.

`MatchSetupV7` retains the revision-6 fields and values except for exact
`rulesetId: "pulp-wars-poc-7r7"` and
`mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2"`. Canonical state adds an
immutable `originalCapitalCityId` to each player and a `fieldDefense: boolean`
to every tile. The original-capital reference survives capture. A lost original
capital is not replaced; recapturing that same city re-enables rules anchored to
it.

The revision-7 exact schemas and frozen orders remove `GRAND_WORKS`,
`SABOTEUR`, `EMBARK`, `BLACKOUT_CITY`, `BUILD_GRAND_WORKS`, all Blackout and
Saboteur exposure state, and their event kinds. They add:

- technology `PROSPECTING`;
- command `BUILD_FIELD_DEFENSE { unitId }`; and
- event `FIELD_DEFENSE_BUILT { playerId, unitId, at, cost: 3 }`.

`ROAD_BUILT` changes its exact `cityId` field to `CityId | null`; neutral Road
construction emits `null`, while owned construction names the assigned city.

Field defense is a tile layer, not an improvement. The retained Industry &
Warfare technology preorder is `DRILL`, `FORTIFICATION`, `EXPLOSIVES`,
`PROSPECTING`, `ENGINEERING`, `METALLURGY`; the unchanged Naval branch follows.
Every strict schema, canonical-order, safe-integer, atomic rejection, replay,
and hashing rule from revision 6 continues to apply.

## 2. Map acceptance

`REGIONAL_BIOMES_NAVAL_V2` retains the revision-6 map types, topology bands,
economic floors, one seeded Mulberry32 stream, and 256-candidate bound. Its
non-dry topology or settlement-placement algorithm and draw schedule may change
deterministically as needed to satisfy this added rule reliably: every
settlement-containing land component on a non-dry map must contain at least one
settlement whose center is Chebyshev-distance 1 from Shallow Water. At least one
such adjacent Shallow-Water cell must be a legal eventual Port site assigned to
that settlement after capture. This is a minimum, not a cap; other settlements
on that component may also be coastal. The implementation freezes the revised
algorithm, draw schedule, and tie breaks beside the generator.

The selected qualifying settlement is the first by `(y,x)` among valid
candidates, but no designation is serialized. `DRY_LAND` retains its exact
revision-6 dry board behavior under the new setup identity.

## 3. Technology graph and removed systems

Industry & Warfare renders as two independent visible lanes. Prerequisite lines
must show the real edges and must not imply an edge between the two tier-1
roots.

| Tier | ID              | Requires      | Exact unlocks                                                                         |
| ---: | --------------- | ------------- | ------------------------------------------------------------------------------------- |
|    1 | `DRILL`         | —             | Guard; first-hostile-city Capture spoils; +1 fortification on every owned city center |
|    2 | `FORTIFICATION` | Drill         | Fighter/Guard field defense; +1 capacity for every owned city                         |
|    3 | `EXPLOSIVES`    | Fortification | Breacher; Pillage                                                                     |
|    1 | `PROSPECTING`   | —             | reveal Ore; Mountain movement and construction; +1 Sight while on Mountain            |
|    2 | `ENGINEERING`   | Prospecting   | Mine; Workshop; Redevelop                                                             |
|    3 | `METALLURGY`    | Engineering   | Forge; Heavy                                                                          |

Mountain passage, Ore visibility, resource-free spatial improvement and
Monument construction, and high-ground Sight therefore derive from Prospecting
everywhere: authoritative movement, public pathing and previews, setup
placement, reward placement, query reasons, AI, and stat explanations.
Engineering retains the revision-4 Mine and Workshop rules and now owns
Redevelop. Metallurgy is otherwise unchanged.

Grand Works technology, improvement, construction command, population formula,
UI card/action, AI valuation, and Engineer-achievement qualifier are absent.
Fieldcraft retains Replant Forest, Scout/Marksman forest movement, and Marksman
Sight, but no longer unlocks a unit. Saboteur, Concealment, exposure, Blackout,
recovery, detection, state, queries, commands, events, UI, and AI policy are
absent. Strict revision identity means no conversion rule is needed for removed
entities or buildings.

## 4. Roads, Ports, and connected-city population

### 4.1 Road placement and use

Roads still cost 2 Coins and require Roads technology. `BUILD_ROAD` may target
an explored, traversable land tile that is either owned by the actor or neutral.
It may not target water, a settlement center, an existing Road, or territory
owned by another player, including a formal ally. Resource and improvement
coexistence remains legal. Mountain is traversable only with Prospecting.

A Road's usability is derived from current territory; it stores no builder.
While its tile is neutral, every player with Roads may use it in that player's
own network. Once the tile becomes owned, only that owner may use its Road
discount or network edge. A former builder crossing a now-foreign Road pays
ordinary terrain cost. Neutral construction has no city siege, Blackout, or
pending-reward gate; owned construction retains the ordinary owned-city gates
except that Blackout no longer exists.

For each player, seed the road graph only from that player's original capital
while that city is currently owned by the player. Eight-way edges connect city
centers and eligible owned-or-neutral Road tiles. Every discounted movement
edge still requires both endpoints in this capital-rooted graph; each Road
endpoint costs one half movement point, as in revision 6. Foreign Roads never
join the graph.

### 4.2 Bounded Port edges

Every same-owner active Port is an endpoint attached to its assigned city
center. Two endpoints share a sea edge when their canonical shortest route is
at most five eight-way water steps, every route tile is explored by the owner,
and the owner's technology permits every traversed water terrain. Endpoint
occupancy and the existing active/blockaded rule apply; mid-route occupants and
ZOC do not remove an infrastructure edge. Neighbor and tie-break order remains
canonical.

Ports assigned to the same city may form an edge and extend a chain, but do not
earn trade. Any number of road, city, and at-most-five-step sea edges may chain,
so the total connected distance is not capped at five. Blocking one endpoint
removes its incident edges and then recomputes alternate chains.

The combined road/Port graph continues to supply the Market capital-connection
bonus. The revision-6 sea trade rule remains bounded to +1 Coin for each
qualifying noncapital city and never pays the capital, the same city twice, or
for a same-city sea edge.

### 4.3 Reversible live population

Roads technology adds live population from the combined graph:

- each currently owned city other than that player's own original capital in
  the original capital's component receives +1 live population; and
- the owned original capital receives +1 live population for each such distinct
  connected city.

Captured foreign capitals are ordinary connected-city contributors and
beneficiaries for this population rule. When the original capital is not owned
by its original player, that player's complete network population contribution
is zero; no captured city becomes a replacement anchor. Recapture of the
original capital permits the graph to contribute again. Revision 6's separately
bounded sea-trade Coin eligibility is unchanged.

These contributions are derived, reversible, and deduplicated by
`(playerId, connectedCityId, beneficiaryCityId)`. Recompute them after research,
Road/Port construction, blockade changes, capture, territory expansion, and
any removal that changes the graph. Disconnect removes the matching live
contributions and may make displayed population negative. Reconnection restores
the same contributions once. City level and reward history remain high-water
records, so disconnect/reconnect cannot lower a level, erase a reward, duplicate
a contribution, or grant the same reached-level reward again.

## 5. Automatic embarkation

There is no player-facing Embark action or `EMBARK` command in revision 7. A
normal `MOVE` automatically embarks a land unit when its final path coordinate
is an eligible Port. The Port must be explored, active, empty before the move,
owned by the unit's owner, and enabled by Shorecraft.

The Port coordinate must be the submitted path's final step, reached directly
from adjacent land. The land prefix and final step consume the unit's ordinary
movement budget and obey exploration, occupancy, terrain, allied-territory, and
ZOC rules. A path that continues beyond the Port is invalid rather than
partially embarking. If movement is interrupted before reaching the Port, the
unit remains in land form and keeps the ordinary interrupted-move activation.

On reaching the Port, emit `UNIT_MOVED` and then `UNIT_EMBARKED`, preserve the
same entity, role, HP, kills, veteran state, and home city, change its form to
`EMBARKED`, and exhaust the activation. It cannot continue moving, Attack,
Capture, Promote, Recover, or use another primary action that turn. Charge is
discarded. Disembarkation and all other transport rules remain revision 6.
Queries, previews, keyboard/pointer flow, and AI offer the Port as an ordinary
Move destination and never offer a separate Embark control.

## 6. Battleship and splash combat

| Role       | Tech              | Cost |  HP | Attack | Defense | Move | Range | Sight | Activation   |
| ---------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ----: | ------------ |
| Battleship | Naval Engineering |   16 |  25 |      6 |       4 |    2 |   1–3 |     3 | Move or fire |

Battleship retains the revision-6 naval form, promotion, recovery, ZOC, target,
and no-capture rules. It may Move or Attack in an activation, never both. Its
art contract is the revision-7 replacement in
[Naval Asset Contract](../art/classes/naval.md).

A legal Battleship Attack still requires one visible hostile primary target.
Calculate the ordinary primary combat preview from the pre-attack state. The
primary defender retaliates exactly once only when it survives primary damage,
has Attack, and the attack distance lies in its range. No splash target
retaliates.

After the primary calculation, snapshot every other living unit on the eight
tiles adjacent to the primary impact coordinate. Each unit hostile to the
Battleship's owner receives
`max(1, ceil(primary damageToDefender / 2))` splash damage, capped by that
unit's current HP. The primary target is never included twice. The attacker,
friendly units, and formal allies take no splash damage. Splash uses no target
Defense, cover, fortification, role modifier, chain, Push, advance, or further
retaliation.

Primary damage, its one retaliation, and all splash damage resolve from that
snapshot and are applied simultaneously. A splash casualty therefore cannot
cancel the already-computed primary retaliation or change another splash
result. The Battleship gains one kill for each unit it kills, including splash
casualties; the primary defender gains a kill only if its retaliation kills the
Battleship.

One `COMBAT_RESOLVED` event contains the primary preview and splash entries in
`(y,x), unitId` order. Then emit `UNIT_DIED` for the primary defender when
applicable, splash casualties in that same order, and the Battleship last when
retaliation killed it. Derived Port/network, economy/growth/reward,
achievement, elimination, and match-end events follow after all casualties are
removed. Authority emits no extra combat event: its one combat record is that
`COMBAT_RESOLVED` event.

Projection includes a splash entry or casualty only for a viewer entitled to
observe that unit at the impact snapshot; an affected unit's owner is always
entitled. Omitted entries do not leave counts, anonymous damage, death markers,
sound, text, or animation. Splash reveals no tile and never makes a hidden unit
targetable. Preview uses the same viewer-safe filtering, so attacking a visible
primary target cannot probe adjacent fog. When the viewer owns an affected
splash unit but cannot observe the attacker or primary target, player-event
projection replaces the hidden `COMBAT_RESOLVED` event with
`COMBAT_SPLASH_DAMAGE { splash }`. That redacted presentation event contains
only the viewer-owned splash entries and reveals no hidden attacker, primary
target, impact coordinate, or other casualty.

## 7. Unified fortification

For a land-form defender belonging to the current tile owner, compute:

```text
fortification level =
  1 if its tile is that defender's owned city center and its owner has Drill
  + 2 if that city has the Walls reward
  + 1 if the tile has fieldDefense

effective Defense = (unit base Defense + fortification level)
  * remaining terrain cover multiplier
```

Each level therefore adds exactly 1 flat Defense before Forest/Mountain cover.
The retained Forest and Mountain multiplier remains 1.5x. Breach continues to
set that terrain multiplier to 1x; it does not erase flat fortification. Naval
and embarked forms receive neither land cover nor fortification. A foreign or
hostile land unit occupying the tile receives none of its city, Walls, or field
defense levels.

This formula replaces the old automatic 1.5x city multiplier, Fortification's
Fighter/Guard 2x city multiplier, and Walls' 4x multiplier. Those multipliers
must not remain as additional factors. Drill's city level follows current
ownership and current research; Walls remains stored on and transfers with the
city. Field defense remains on and transfers with its tile.

`BUILD_FIELD_DEFENSE { unitId }` costs 3 Coins, requires Fortification, and
uses the acting Fighter or Guard's current coordinate. The unit must be in land
form, on explored currently owned land, primary-action eligible, and on a tile
without field defense. Ordinary role after-move eligibility applies: Fighter
may build after moving and Guard may not. The accepted command spends the
unit's primary action and sets `fieldDefense: true`.

Field defense may coexist with a city, Road, resource, site, or improvement. It
does not consume, cover, restore, or modify any of them. It cannot be stacked,
Pillaged, Redeveloped, or voluntarily removed in revision 7. If ownership
changes, it supplies its level only to a land defender belonging to the current
tile owner.

Presentation uses the established code-native small brick/fortification symbol
with a numeric level. It is not a production raster. Do not render zero. Owners
see the exact level on their explored tiles; other players see it only while
the tile is currently visible. A fogged enemy tile may retain its static field
defense drawing under ordinary explored-map memory, but omits the live numeric
total. Combat preview exposes the exact level only for an observable defender.

## 8. Normal AI and interaction requirements

Normal AI uses only public queries and the same commands. It must:

- consider neutral Roads usable until territory changes, and value connected
  city/capital live population without double-counting reconnection;
- evaluate Port chains with the five-step edge cap and existing bounded
  Market/trade rewards;
- use a normal Move to autoembark and never plan a removed Embark command;
- value Battleship splash only for observable targets, prefer useful clusters,
  and preserve its move-or-fire constraint;
- research Prospecting for Ore, Mountain routes, and high-ground Sight, then
  Engineering/Metallurgy for their actual descendants;
- build field defense with a ready Fighter or Guard when its positional defense
  is worth 3 Coins, including threatened cities and chokepoints; and
- never plan Grand Works, Saboteur, Blackout, or their removed commands.

Technology UI renders the two Industry & Warfare lanes without clipping or a
false prerequisite. Action docks label field defense cost and resulting level,
and Battleship stats/splash/move-or-fire accurately. Network and city previews
show reversible population deltas once per beneficiary. All UI derives from a
player view; none may inspect authoritative hidden state.

## 9. Bounded implementation acceptance

Focused deterministic tests cover the changed contracts: exact r7/map-V2/save
identity and strict r6 rejection; the coastal-settlement acceptance rule;
neutral Road ownership transitions; five-step Port edges and chains; reversible
deduplicated city/capital live population through blockade, capture, capital
loss, and reconnection; automatic embark path-end/interruption/exhaustion;
Battleship stats, splash snapshot, retaliation, ordering, and fog projection;
the revised graph and removed IDs; and unified fortification stacking,
capture, action cost, and display visibility.

Adapt the existing naval map/playability and browser checks to revision 7 and
run the repository's one cross-cutting revision-7 release gate. Do not create a
second broad corpus for these rules. The release evidence must prove
determinism, save/resume at the new command boundaries, Normal-AI legality, no
hidden-state query access, playable invasion on the established map matrix,
and no regression on `DRY_LAND` beyond the approved identity and rules changes.

Release validation passed on 2026-09-23. The full check passed 151 files and
1,566 tests. A subsequent focused run also passed the final coast-oscillation
detector and partial matrix regressions. Map validation passed 960 repeated
setups. Naval playability passed 40 exact-repeat matrix cases: the first 37 in
the original run and the final 3 through the explicit resume boundary after a
detector-only correction; runtime behavior was unchanged. Eight targeted naval
scenarios also passed exact repeats. The natural Continents and Archipelago
runs each proved a same-unit invasion lifecycle and reached their 2,000-command
caps in rounds 55 and 54 respectively; these command-capped runs do not claim
match victories. Current, naval, and legacy browser checks passed, along with
art validation, the frozen Ruleset-6 release checks, and the dependency audit
with zero vulnerabilities.
