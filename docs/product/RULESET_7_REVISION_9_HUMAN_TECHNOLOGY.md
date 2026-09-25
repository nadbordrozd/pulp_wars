# Ruleset 7 revision 9: Human technology redesign

**Status:** implemented historical revision-9 contract, superseded as the
current runtime by the
[revision-10 playtest corrections](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md).
Its unchanged rules remain normative through the revision-10 overlay.

**Ruleset ID:** `pulp-wars-poc-7r9`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2`

**Scope:** this document converts the approved
[technology-tree revision](PULP_WARS_TECH_TREE_REVISION.md) and its
[design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md) into the exact
revision-9 contract. It is an overlay over the implemented
[revision-8 contract](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md) and its
inherited revision-4 through revision-7 contracts. Revision 9 replaces only
the identity, Human technology/roster, named economy, recovery, trade,
fortification, reward, command, UI, AI, persistence, and art rules below.
Unmentioned map generation, combat arithmetic, city growth, capture, fog,
relationships, naval movement, and deterministic ordering remain inherited.
Rulesets 5 and 6 remain frozen.

This revision changes only the current `ORIGINAL` faction. It does not add or
reinterpret Candy or any future faction, and tactical-role metadata creates no
cross-faction mechanics by itself.

## 1. Frozen product judgments

These decisions close omissions in the approved design without adding another
system:

| Question                  | Revision-9 decision and rationale                                                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workshop and Redevelop    | Retain both under Engineering with their current values and removal semantics. The approved revision starts from revision 8 and never removes either useful, established Engineering tool.                                                                                        |
| Recovery and Disband      | Remove the `RECOVERY` technology and Medic. Keep ordinary explicit and idle recovery. Supply replaces the former six-HP land recovery upgrade. Retain Disband under Administration because orderly demobilization fits the Human logistics branch and was not explicitly removed. |
| City defense and capacity | Remove the technology-granted city-center defense level. Keep Walls and Field Defense as separate additive flat levels. Move the technology capacity bonus to Planning exactly as proposed.                                                                                       |
| Achievements              | Retain Explorer, Engineer, Muster, their entitlements, popup/placement flow, and Monuments. Update only enabling technology names and roster-sensitive progress.                                                                                                                  |
| Infrastructure income     | Land trade and sea trade use separate graphs. Neither supplies the other, and Market has no Road or capital-connection bonus. This makes the two approved income rules independently readable.                                                                                    |
| Dry Land                  | Keep the Naval branch visible but disabled. Its detail says `Unavailable on Dry Land maps`; it has no research offer. This preserves tree discoverability without offering a useless purchase.                                                                                    |
| New visuals               | Captain, Knight, and Shipyard need new production sources. Existing art is reused only where its subject still says the same thing. Temporary generic unit or building aliases are not release acceptance.                                                                        |

Numeric values in this contract are the revision-9 starting values. Changing
them before the first revision-9 release requires an explicit contract update;
runtime code may not silently reinterpret “initial target” wording in the
design input.

## 2. Identity, exact orders, and compatibility

| Boundary                                   | Exact revision-9 value              |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r9`                 |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r9.current`        |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V5` |

Numeric version 7 remains sufficient because every state, setup, command
envelope, event log, save, replay, and release artifact also dispatches on the
exact ruleset and setup identity. A revision-9 reader rejects all earlier
Ruleset-7 identities rather than reinterpreting their technology, unit, reward,
or activation state. Current-route startup removes only known incompatible
Ruleset-7 autosave keys through `pulpWars.save.v7r8.current`; it preserves the
Ruleset-6 save, settings, historical fixtures, and unrelated storage. There is
no prototype migration.

The frozen technology order is:

```text
GATHERING, FARMING, MILLING, ADMINISTRATION, PLANNING,
HUNTING, FORESTRY, SAWMILLING, MARKSMANSHIP, FIELDCRAFT,
SCOUTING, ROADS, COMMERCE, RAIDING, CHIVALRY,
DRILL, ENGINEERING, METALLURGY, FORTIFICATION, EXPLOSIVES,
SHORECRAFT, NAVIGATION, NAVAL_ENGINEERING
```

The frozen role order is:

```text
FIGHTER, RAIDER, MARKSMAN, GUARD, CAPTAIN, CATAPULT, KNIGHT,
JUGGERNAUT, PATROL_BOAT, BATTLESHIP
```

Removed technology and role IDs are absent from revision-9 exact schemas, not
deprecated aliases. The implementation must similarly freeze complete command,
event, reward, achievement, improvement, tactical-role, and activation-field
orders and test rejection of removed or reordered values.

## 3. Complete Human technology graph

Research cost remains:

```text
tier 1 = 5 + (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

where `C` is the number of currently owned cities. `GATHERING` starts known.
Research is permanent, costs Coins, and consumes no unit/city action or PRNG.

| Branch     | Tier | ID                  | Requires       | Exact unlocks                                                    |
| ---------- | ---: | ------------------- | -------------- | ---------------------------------------------------------------- |
| Settlement |    1 | `GATHERING`         | starts known   | reveal Fruit/Fertile Ground; Harvest Fruit                       |
| Settlement |    2 | `FARMING`           | Gathering      | Farm; connected-field visuals                                    |
| Settlement |    3 | `MILLING`           | Farming        | Windmill; Supply                                                 |
| Settlement |    2 | `ADMINISTRATION`    | Gathering      | Captain; Market; Disband                                         |
| Settlement |    3 | `PLANNING`          | Administration | +1 capacity per owned city; Land Grant                           |
| Wilds      |    1 | `HUNTING`           | —              | Hunt Game                                                        |
| Wilds      |    2 | `FORESTRY`          | Hunting        | Lumber Camp; Clear Forest                                        |
| Wilds      |    3 | `SAWMILLING`        | Forestry       | Sawmill; Catapult                                                |
| Wilds      |    2 | `MARKSMANSHIP`      | Hunting        | Marksman                                                         |
| Wilds      |    3 | `FIELDCRAFT`        | Marksmanship   | Replant Forest; Raider/Marksman Forest freedom; Marksman Sight 2 |
| Mobility   |    1 | `SCOUTING`          | —              | Raider; Raider Sight 2                                           |
| Mobility   |    2 | `ROADS`             | Scouting       | Road construction and connected Road movement                    |
| Mobility   |    3 | `COMMERCE`          | Roads          | land trade income                                                |
| Mobility   |    2 | `RAIDING`           | Scouting       | Raider Charge; Raider Pillage                                    |
| Mobility   |    3 | `CHIVALRY`          | Raiding        | Knight; Cultivate Forest                                         |
| Industry   |    1 | `DRILL`             | —              | Guard; first hostile Capture Spoils                              |
| Industry   |    2 | `ENGINEERING`       | Drill          | reveal Ore; Mountain movement/Sight; Mine; Workshop; Redevelop   |
| Industry   |    3 | `METALLURGY`        | Engineering    | Forge; Arms Industry discount                                    |
| Industry   |    2 | `FORTIFICATION`     | Drill          | Fighter/Guard Field Defense construction                         |
| Industry   |    3 | `EXPLOSIVES`        | Fortification  | generic Pillage; melee Field Defense demolition; Blast Mountain  |
| Naval      |    1 | `SHORECRAFT`        | —              | Fish; Port; shallow embark/transport; Patrol Boat                |
| Naval      |    2 | `NAVIGATION`        | Shorecraft     | Deep Water movement/transport; Pearls; sea trade                 |
| Naval      |    3 | `NAVAL_ENGINEERING` | Navigation     | Battleship; Shipyard                                             |

Game-facing branch labels are exactly `Settlement`, `Wilds`, `Mobility`,
`Industry`, and `Naval`. The four land branches render the approved fork shape;
Naval renders one three-node chain. Cards list every retained unlock, including
Workshop/Redevelop and Disband.

On `DRY_LAND`, all three Naval cards remain in their normal positions but are
disabled regardless of prerequisites or Coins. Public research queries and AI
offer no Naval research command. The detail sheet, not permanent card chrome,
explains `Unavailable on Dry Land maps`. Other map types use the ordinary
offers.

## 4. Economy, territory, and rewards

### 4.1 Retained basic economy

The following values remain exact:

| Action/improvement | Cost | Result                                                                                     |
| ------------------ | ---: | ------------------------------------------------------------------------------------------ |
| Harvest Fruit      |    2 | consume Fruit; +1 permanent population                                                     |
| Farm               |    5 | requires Fertile Ground; +2 live population                                                |
| Hunt Game          |    2 | consume Game; +1 permanent population                                                      |
| Lumber Camp        |    3 | eligible Forest; +1 live population                                                        |
| Windmill           |    5 | one/city; requires adjacent same-owner Farm; +1 per adjacent same-owner Farm, cap 8        |
| Sawmill            |    5 | one/city; requires adjacent same-owner Lumber Camp; +1 per adjacent same-owner Camp, cap 8 |
| Mine               |    5 | requires Mountain + Ore; +2 live population                                                |
| Forge              |    6 | one/city; requires adjacent same-owner Mine; +1 per adjacent same-owner Mine, cap 6        |

Windmill, Sawmill, and Forge use revision 8's eight-neighbor, same-current-owner,
cross-city sharing rule. A contributor can support several processors. Losing
all support leaves the processor at zero until support returns. Engineering,
not Drill, reveals Ore, permits land units to enter Mountain, grants +1 Sight
while on Mountain, and permits Mine construction. Building a Mine covers Ore;
Pillage or Redevelop restores it.

`CLEAR_FOREST` retains its current eligibility, changes an empty Forest to
Grass, preserves Road, costs 0, and grants 1 Coin. `REPLANT_FOREST` retains its
current eligibility, changes empty Grass to Forest, preserves Road, costs 4,
and grants no immediate output.

### 4.2 Workshop and Redevelop

Workshop remains an Engineering building: cost 4, one per city, on an eligible
owned land tile, with at least one adjacent basic improvement assigned to that
same city. Its output is 0 without support; otherwise +1 base and +1 for each
distinct adjacent same-city Farm, Lumber Camp, and Mine type, for 2–4 live
population. Revision 8's cross-city processor rule does not expand Workshop.

`REDEVELOP` remains an Engineering tile command. It costs 0 and removes one
owned improvement under the ordinary explored, non-besieged, no-pending-reward
city gates, without refund. It can remove a Monument, Port, or Shipyard when
the tile is unoccupied. It does not remove Roads, Field Defense, terrain,
resources, city centers, sites, or Walls. Removing Farm restores Fertile
Ground; removing Mine restores Ore; no other removed improvement creates a
resource. A Fish or Pearls marker already coexisting with a Port/Shipyard is
preserved. Entitlements spent on a removed Monument remain spent.

### 4.3 Market

Market moves to Administration:

- cost 6; one per city;
- placement uses an explored, owned, non-site land tile with no resource or
  improvement, in a non-besieged city without a pending reward; Road remains;
- placement requires at least one qualifying adjacent economic family;
- output is +1 base Coin plus +1 per distinct adjacent family, cap 4 total;
- Agriculture is Farm/Windmill, Timber is Lumber Camp/Sawmill, and Metal is
  Mine/Forge; Workshop is not a family member;
- all eight neighbors count; a qualifying improvement may be assigned to any
  city with the same current owner and may support several Markets; and
- after all families are lost, the Market remains and supplies only its +1
  base Coin.

Market has no Road, capital, land-trade, sea-trade, or positive-output bonus.
Mountain placement still requires Engineering. Market income remains recurring
city income, not population.

### 4.4 Arms Industry

A Forge is active for Arms Industry while it belongs to the training city and
its current live output is positive. Every normal land unit trained from that
city costs 1 Coin less, minimum 1. This applies to Fighter, Raider, Marksman,
Guard, Captain, Catapult, and Knight. It does not change printed base stats,
research prices, Disband refunds, reward units, embarked forms, Patrol Boats,
or Battleships. The accepted `TRAIN` event records the actual discounted cost.
Capture or contributor changes recompute the offer immediately.

### 4.5 Planning, Land Grant, and level-4 rewards

Planning adds one capacity slot to every city currently owned by the researcher
and every city that player later acquires. Base capacity remains `level + 1`.
No other revision-9 technology adds capacity. Losing ownership recomputes each
player's applicable bonus and never destroys an existing over-capacity unit.
Land and naval units use the same city capacity.

`LAND_GRANT { cityId }` is one atomic city action:

- requires Planning, an owned level-3-or-higher city, 6 Coins, no siege, and no
  unresolved city reward;
- requires at least one currently neutral cell in the centered, board-clipped
  5 x 5 footprint;
- assigns every such cell to that city in canonical `(y,x)` order; a cell
  already assigned to any city is unchanged;
- preserves terrain, biome, site, treasure, resource, improvement, Road,
  Field Defense, water, and occupants, then reveals every newly assigned cell;
- records `landGrantUsed: true` on the city ID even if ownership later changes;
  an unused captured city may be granted by its new owner, while a used city
  can never be granted again; and
- the exact enlarged footprint transfers with the city on later capture.

The command is not offered when it would claim zero cells. It has no targeting
mode, refund, population, or income beyond what the claimed board already
contains. Territory/economy/network changes are recomputed after assignment.

Level 4 becomes exactly `BOOM` (+3 permanent population) or `TREASURY_8`
(+8 Coins). `EXPAND` is absent from revision-9 reward schemas. Existing level
2, level 3, and level 5+ choices, including Walls and the 12-Coin `TREASURY`,
remain inherited.

## 5. Recovery, Supply, and support

### 5.1 Recovery and Disband

`RECOVER` remains a universal terminal unit command. End Turn still
auto-recovers each damaged, wholly idle eligible unit in unit-ID order before
income preview. Moving, attacking, recovering, capturing, or using a primary
special prevents idle recovery; `WAIT` alone does not. Amounts are:

| Unit/location                                              | Explicit or idle recovery |
| ---------------------------------------------------------- | ------------------------: |
| friendly land territory                                    |                      4 HP |
| neutral or hostile land territory                          |                      2 HP |
| territory assigned to an owned supplied city               |                      6 HP |
| naval unit on/adjacent to an owned active Port or Shipyard |                      4 HP |
| naval unit elsewhere; embarked unit anywhere               |                      0 HP |

A city is supplied exactly while it owns at least one Windmill whose current
live output is positive. Supply is derived after every economy/ownership
change, does not stack, affects only friendly land-form units on tiles assigned
to that city, and adds no population or income. Explicit and idle recovery use
the same amount. Captain healing may occur in the same turn and does not by
itself make the target non-idle.

Administration retains `DISBAND`: an owned trainable land-form unit may follow
an ordinary Move but no primary action, removes itself terminally, frees its
home-city capacity, and grants `floor(printed base training cost / 2)` Coins.
Forge discounts do not lower the refund. Juggernaut, naval, and embarked forms
cannot Disband.

### 5.2 Captain actions

Captain is a normal trainable land unit. It may Move, then Attack or use one
support action. Attack, `RALLY`, and `TEND_WOUNDED` are mutually exclusive
primary actions; either support command handles the Captain.

`RALLY { unitId }` requires at least one adjacent friendly land-form unit whose
tactical role is neither `SUPPORT` nor `SIEGE` and which is not already
Inspired. The accepted command takes one immutable adjacency snapshot and
sets `inspired: true` on every adjacent qualifying unit; it never affects the
Captain, another Captain, Catapult, ship, or embarked form.

Inspired expires at that owner's accepted End Turn. It does not stack. The
unit's next accepted Attack command that turn consumes it; rejected attacks and
retaliation do not. That Attack receives +1 Attack for its complete primary
combat calculation. Raider Charge may add its separate +1. If the Inspired
Attack is melee and the target stands on Field Defense, resolve the defense
first, then destroy it if the attacker survives. A Knight receives the bonus
and demolition permission only on the first accepted Attack in an Overrun
chain.

`TEND_WOUNDED { unitId }` requires at least one adjacent friendly damaged
land-form unit other than the acting Captain that has not been tended during
this owner's turn. It heals every such unit by 2, capped at max HP, using one
immutable adjacency snapshot and unit-ID event order. Full-health, already
tended, naval, and embarked units are not affected or marked. A different
adjacent Captain may be healed. Each healed unit records a per-owner-turn
`tendedThisTurn` marker reset at its owner's next Start Turn. Receiving Tend
does not consume the target's action or prevent its ordinary recovery.

## 6. Human roster, tactical roles, and Overrun

### 6.1 Exact role values

| Unit        | Tactical role   |   Cost |  HP | Attack | Defense | Move | Range | Sight | Move then primary | Capture |
| ----------- | --------------- | -----: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- |
| Fighter     | `LINE`          |      2 |  10 |      2 |       2 |    1 |     1 |     1 | Yes               | Yes     |
| Raider      | `SKIRMISHER`    |      4 |  10 |      2 |       1 |    2 |     1 |     2 | Yes               | Yes     |
| Marksman    | `RANGED`        |      3 |  10 |      2 |       1 |    1 |   1–2 |     1 | Yes               | Yes     |
| Guard       | `DEFENDER`      |      3 |  15 |    1.5 |       3 |    1 |     1 |     1 | No                | Yes     |
| Captain     | `SUPPORT`       |      5 |  10 |      1 |       1 |    1 |     1 |     1 | Yes               | No      |
| Catapult    | `SIEGE`         |      8 |  10 |    3.5 |     0.5 |    1 |   2–3 |     1 | No                | No      |
| Knight      | `BREAKTHROUGH`  |      9 |  10 |      3 |       1 |    3 |     1 |     1 | Yes               | No      |
| Juggernaut  | `MYTHIC`        | reward |  40 |      4 |       4 |    1 |     1 |     1 | Yes               | Yes     |
| Patrol Boat | `NAVAL_SCREEN`  |      5 |  10 |      2 |       2 |    3 |     1 |     2 | Yes               | No      |
| Battleship  | `NAVAL_CAPITAL` |     16 |  25 |      6 |       4 |    2 |   1–3 |     3 | No                | No      |

Fieldcraft raises Marksman Sight to 2 and removes Forest entry termination for
Raider and Marksman. Raider has no Charge or Pillage until Raiding. After an
ordinary accepted Move traversing at least two path cells, Charge gives the
Raider +1 Attack on its next Attack that turn and is then consumed. Raider may
Pillage with Raiding; other normal trainable land roles require Explosives.

The tactical-role field is required faction-independent UI/design metadata.
It has no generic combat multiplier, eligibility shortcut, or hidden damage
class. Runtime mechanics continue to bind explicitly to unit/ability data.

The inherited Treasure draw remains one deterministic 50/50 draw between 5
Coins and a roster unit. Revision 9 replaces the removed Heavy reward with a
Knight while preserving placement, capacity exhaustion, the 5-Coin fallback,
and PRNG consumption exactly.

### 6.2 Knight Overrun

Each Attack remains a separate accepted command. A Knight begins an Overrun
continuation only when all of these are true after one melee Attack:

1. the primary defender died;
2. the Knight survived;
3. the defender's coordinate is empty after all combat casualties; and
4. that explored destination is legal land for the Knight, including
   Engineering for Mountain.

The Knight then advances to that coordinate without a movement command. ZOC
does not cancel combat advance. Hostile Field Defense remaining on the entered
tile is destroyed as occupation. If at least one adjacent visible hostile
target is legally attackable from the new coordinate, set `overrunActive` and
offer another Attack. While active, no Move, Recover, Capture, Disband,
support, construction, or other primary command is legal for that Knight. The
player may issue another Attack or End Turn.

Every continuation repeats the same test, with no fixed attack-count cap. A
non-kill, Knight death, illegal/occupied advance, water target, or absence of a
legal next target clears the continuation and handles the unit. It never grants
another ordinary Move. `attacksUsed` is therefore a nonnegative safe integer
in revision 9 rather than the old two-shot union. Inspired and Charge are
consumed on the first accepted Attack and do not refresh. Combat preview,
events, player view, AI, save/resume, replay, and hashing expose or preserve the
exact current chain state.

## 7. Field and city defense

For a land-form defender belonging to the current tile owner:

```text
fortification level =
  2 if its owned city center has the Walls reward
  + 1 if its tile has Field Defense

effective Defense =
  (unit base Defense + fortification level) * terrain cover multiplier
```

Forest and Mountain retain the inherited 1.5x cover. Breach is removed with
Breacher. There is no automatic city-center multiplier or Drill defense level.
Walls is stored on the city, transfers on capture, and is not a destructible
map entity. Field Defense is a tile layer, transfers with the tile, and helps
only a land defender belonging to that tile's current owner. Naval/embarked
forms receive neither.

`BUILD_FIELD_DEFENSE { unitId }` retains cost 3 and requires Fortification. A
primary-action-eligible Fighter or Guard in land form constructs it on its
current explored owned land tile when none is present. It may coexist with a
Road, resource, improvement, or city center. Fighter may build after Move;
Guard may not. It is not an improvement and cannot be Redeveloped, Pillaged,
stacked, or voluntarily removed.

Destroy one Field Defense after combat or entry when the first applicable
reason below occurs:

1. `CATAPULT`: a Catapult attacked its occupying land defender; destroy after
   combat whether either combatant survives;
2. `INSPIRED`: a surviving Inspired unit made that melee Attack;
3. `EXPLOSIVES`: any surviving friendly land-form melee attacker whose owner
   has Explosives made that Attack; or
4. `OCCUPATION`: a hostile land unit legally entered the now-unoccupied tile,
   including ordinary Move, disembarkation, or combat advance.

The Field Defense applies to the Attack that removes it. Emit one destruction
event with the highest listed applicable reason. Ranged attacks other than
Catapult do not remove it. Push does not count as voluntary occupation.

Generic Explosives Pillage retains the current hostile-improvement-under-actor,
1-Coin, terminal, Road-excluded behavior for the seven normal trainable land
roles. Raider has the Raiding exception. It never targets Field Defense,
terrain, resources, city centers, or Walls.
Like Disband, Pillage may follow an ordinary Move when the unit has not used a
primary action; Guard and Catapult post-Move attack restrictions do not block
this generic terminal action.

`BLAST_MOUNTAIN { at }` costs 3 and targets an explored owned Mountain with no
site, resource, improvement, or Field Defense in a non-besieged city without a
pending reward. It changes Mountain to Grass, preserves Road and territory,
and grants no Coin or population. Explosives authorizes the action, but its
public offer remains suppressed until Engineering reveals whether a Mountain
contains Ore. After Engineering, only resource-free Mountains are offered;
hidden Ore cannot be probed through command availability.

## 8. Roads, trade, Naval, and Shipyard

### 8.1 Roads and land trade

Road placement, neutral/owned usability, eight-way city/Road edges, movement
discount, original-capital anchor, and ownership transitions remain revision 7. Roads no longer create live population.

With Commerce, each owned non-capital city in the player's land-only component
rooted at that player's currently owned original capital contributes +1 Coin
at Start Turn. The graph contains eligible Road tiles and owned city centers;
it contains no Port, Shipyard, or sea edge. Each city pays at most once, the
capital never pays itself, loss of the original capital disables all land
trade, and recapture/reconnection restores it. Formal allies never share it.

### 8.2 Sea trade

With Navigation, construct an owner-private Port graph using the inherited
revision-7 endpoint rules: active owned Ports/Shipyards are endpoints; an edge
uses a canonical shortest explored eight-way water route of at most five steps;
same-city endpoints may extend a chain; Deep Water is legal with Navigation;
endpoint blockade removes incident edges; and mid-route occupants/ZOC do not
remove abstract connectivity.

Each owned non-capital city with an active Port/Shipyard earns +1 Coin at Start
Turn when its Port component contains an endpoint assigned to at least one
other owned city. Same-city endpoints alone do not qualify. The capital may be
the other endpoint but earns no sea-trade payment. A city earns at most one sea
Coin regardless of endpoints, paths, or destinations. The graph contains no
Road/city-center land edge and needs no capital connection. Formal allies do
not share it.

Land and sea trade are separate income facts. A non-capital city may earn one
of each in the same Start Turn. Both join base and Market income before the
inherited population-deficit floor; siege still makes the city's complete
income zero.

### 8.3 Port and Shipyard

Fish, Pearl, Port, embarkation, transport, Patrol Boat, Battleship, blockade,
and naval combat retain their revision-7 values except where this contract
names trade or Shipyard. In particular a Port costs 4, contributes +1 live
population while active, has no per-city cap, and can coexist with Fish or
Pearls.

Navigation gates Pearl collection on both Shallow and Deep Water. Shorecraft
alone no longer collects shallow-water Pearls. The collection transaction
retains the current pay-2, receive-4, consume-resource rule.

`BUILD_SHIPYARD { at }` requires Naval Engineering and:

- targets one explored owned active Port in a non-besieged city without a
  pending reward;
- costs 5 and is legal only while that city owns no other Shipyard;
- atomically replaces `PORT` with `SHIPYARD`, preserving tile, resource,
  occupant, ownership, and every Port network/embark/recovery behavior; and
- contributes +2 live population total while active: the retained Port +1 and
  one additional Shipyard +1.

A hostile afloat unit on its tile blockades the complete Shipyard. Both live
population points become zero; it supplies no network endpoint and cannot
embark, harvest a coexisting resource, train, or recover ships until
reactivated. A friendly occupant does not deactivate it but still prevents
recruitment on that occupied coordinate. Capture transfers it with its city;
Redevelop removes the complete upgrade and restores no consumed resource.

An active ordinary Port continues to train naval roles at printed cost. When
the player selects an active unoccupied Shipyard coordinate, Patrol Boat and
Battleship training costs 2 Coins less, minimum 1. Thus the starting costs are
3 and 14 at a Shipyard. The actual dock coordinate, cost, and discount source
are recorded in public offers and the accepted training event. Forge and
Shipyard discounts never combine because their eligible role sets are
disjoint.

## 9. Achievements and Monuments

Every player retains three ordered entitlements: `EXPLORER`, `ENGINEER`, then
`MUSTER`. Progress before enabling research counts, unlocking is permanent,
and evaluation occurs after every accepted transition that can change it.

| Achievement | Enabling technology | Completion condition                                                                                                                                                            |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explorer    | Scouting            | at least 100 distinct explored tiles                                                                                                                                            |
| Engineer    | Engineering         | one currently owned Windmill, Sawmill, Forge, or Workshop has individual final live output at least 6; Workshop remains listed but its current maximum is 4                     |
| Muster      | Drill               | at least four distinct living trainable roles currently owned; land roles, Patrol Boat, and Battleship count; Juggernaut does not; embarked form counts only its passenger role |

The revision-5 popup queue, read-only Achievements view, owner-private progress,
one action per available entitlement, `BUILD_MONUMENT`, one Monument per city,
0 cost, +3 live population, capture provenance, removal, and permanent spending
semantics remain exact. New Captain and Knight roles count distinctly for
Muster. Removed roles cannot appear in revision-9 state or progress.

## 10. Commands, lifecycle, public behavior, and transaction order

Revision 9 adds `RALLY`, `TEND_WOUNDED`, `LAND_GRANT`, `CULTIVATE_FOREST`,
`BLAST_MOUNTAIN`, and `BUILD_SHIPYARD`. It removes the old Medic heal command
and all removed-role/technology values. Retained commands include explicit
Recover, Disband, Redevelop, Pillage, Field Defense, naval training, and the
ordinary inherited surface.

`CULTIVATE_FOREST { at }` costs 4 and targets explored owned Forest with no
site, resource, or improvement in a non-besieged city without a pending reward.
It changes the tile to Grass + Fertile Ground, preserves Road, Field Defense,
and territory, and grants no immediate Coin or population.

Canonical state stores only facts needed for exact replay: Land Grant use,
Shipyard identity/contribution, tactical role metadata through definitions,
per-unit Inspired, tended-this-turn, attacks-used, and Overrun continuation.
Supply, trade qualification, processor output, discounts, legal support
targets, and Field Defense effects are derived. Start Turn resets that owner's
ordinary activation and tended marker. End Turn resolves idle recovery, expires
Inspired/Overrun state, previews income, advances the turn, awards the next
player's income, settles rewards, then evaluates achievements in inherited
canonical order.

New accepted facts identify exact actors/targets/coordinates and values:

- Rally records the Captain and canonically ordered affected unit IDs;
- Tend records the Captain and ordered `{ unitId, amount, hpAfter }` results;
- Land Grant records city, cost, and ordered newly assigned/revealed cells;
- Cultivate and Blast record before/after terrain/resource and cost;
- Shipyard records city, coordinate, cost, and live contribution;
- Field Defense destruction records coordinate and exact reason; and
- combat records Inspired/Charge Attack bonuses, whether they were consumed,
  Overrun advance/continuation, and the cumulative safe attack count.

Every command preflights costs, safe integers, exact targets, allocations,
economy changes, and deterministic work only through the next modal boundary,
then mutates atomically and increments the command index once. Rejected
commands mutate and consume nothing. Economy-affecting commands emit their
action fact, dependency-ordered economy/network changes, all level changes,
reward settlement through the next modal, and achievement unlocks. Attack
resolves combat and casualties from one immutable preview, then Field Defense,
advance/occupation, reveal, continuation, promotion eligibility, elimination,
and outcome in canonical order.

PlayerView is the only browser and Normal-AI rules input. It must expose enough
owner-public data for exact offered costs, support targets, Land Grant cells,
separate trade, supply recovery, fortification destruction, and Overrun. The
owner sees Inspired and once-per-turn Tend status. An opponent sees Inspired
only on a currently visible unit because it affects immediate combat; Tend
eligibility is owner-only. Fog never leaks live support, route, resource, or
unit state.

The compact UI must show tactical role, exact current stats, Supply, Inspired,
Tended-this-turn, Overrun availability, separate land/sea income, and the
actual city or selected-dock discount with short accessible explanations.
Action chips use actual cost/effect values. The technology and Rules/Help views
use this contract's labels and no removed unlock. Normal AI uses the same public
offers, can use both Captain actions and Overrun, distinguishes training-city
from Shipyard discounts, values Land Grant without hidden cells, treats trade
graphs separately, and never researches disabled Dry Land Naval cards.

## 11. Finite revision-9 art inventory

Production follows the checked-in programmatic PixelLab workflow in
[Art Direction](../art/ART_DIRECTION.md) and the linked class contracts. The
new production-source inventory is exactly six items:

| Asset ID                          | Class/source                                              | Required reading                                                                                                                      |
| --------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `unit-original-captain`           | standard unit, 256 x 296, anchor `(128,222)`, scale 0.25  | compact Human officer/support silhouette with an oversized command pennant or horn; distinct from Fighter, Medic, Marksman, and Guard |
| `unit-original-knight`            | mounted unit, 384 x 384, anchor `(192,288)`, scale 0.27   | armored southeast-facing horse and unmistakable melee lance/sword; no bow; distinct from archived Horse Archer and ordinary Raider    |
| `building-ruleset7-shipyard`      | water building, 384 x 384, anchor `(192,288)`, scale 0.30 | visibly upgraded Port with larger crane/drydock frame and retained open water/resource reading; not a city or ship                    |
| `ui-action-rally-v7r9`            | action icon, 192 x 192                                    | clear command pennant/horn burst; no text, unit portrait, or baked status                                                             |
| `ui-action-cultivate-forest-v7r9` | action icon, 192 x 192                                    | one readable Forest-to-furrow/Fertile transformation, not Clear or Replant                                                            |
| `ui-action-blast-mountain-v7r9`   | action icon, 192 x 192                                    | one readable Mountain-clearing blast, playful and non-gory, not combat damage                                                         |

Captain and Knight portraits are deterministic framed derivatives of their
accepted world sources; they are not extra PixelLab requests. Generate and
review Captain and Knight individually because standard and mounted geometry
differ. Shipyard is its own building gate. The three action sources are one
bounded UI family only after its representative sample gate passes.

Explicit suitable reuses are:

| Revision-9 use                                                                               | Existing accepted art                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Tend Wounded                                                                                 | `ui-action-heal`                                                    |
| Land Grant and Planning                                                                      | `ui-reward-expand`                                                  |
| Disband                                                                                      | `ui-action-disband`                                                 |
| Redevelop                                                                                    | `ui-action-redevelop`                                               |
| Field Defense/Fortification                                                                  | existing code-native field-defense mark and `ui-tech-fortification` |
| Pillage                                                                                      | `ui-action-pillage`                                                 |
| Shipyard build/selection/Naval Engineering                                                   | new `building-ruleset7-shipyard` world source                       |
| Captain/Knight train, identity, and technology cards                                         | their new accepted world source or derived portrait                 |
| Supply, Inspired, Tended, Overrun, Charge, discounts, trade, destruction                     | code-native status/effect/number treatment; no raster               |
| every retained terrain, resource, improvement, ship, transport, Monument, reward, and action | its current accepted subject-matching asset                         |

Medic cannot stand in for Captain; Horse Archer cannot stand in for Knight;
Port cannot stand in for the final Shipyard. Removed sources remain historical
and available to frozen rulesets but are not registered to revision-9 roles.

## 12. Implementation and release traceability

The integrated runtime package must prove the following bounded groups rather
than treating this document as a backlog:

| Contract area     | Required deterministic evidence                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| identity/schema   | exact r9/tree/map/save dispatch; earlier-r7 rejection; removed IDs rejected; canonical round trips and hashes                                                             |
| graph/roster      | all 23 nodes/edges/unlocks; Dry Land disabled offers; ten-role order; tactical roles have no generic combat effect                                                        |
| economy           | retained Workshop/Redevelop; r8 shared processors; Market 1–4 without Road; Cultivate preserves Road/Field Defense; Supply changes; Forge and selected-Shipyard discounts |
| support/recovery  | explicit and idle 2/4/6 land recovery; naval 0/4; Disband; Rally/Tend adjacency, expiry, consumption, once-per-turn, save/resume                                          |
| combat            | Inspired + Charge composition; unbounded command-by-command Overrun; every termination; Field Defense/Walls formula and all four destruction paths                        |
| territory/rewards | Land Grant ownership/one-use/capture/zero-cell rejection; Boom/Treasury-8; no Expand; capacity transfer                                                                   |
| trade/naval       | independent land/sea graphs; dual payment; blockade/alternate routes; Shipyard population, upgrade, training and recovery gates                                           |
| achievements      | updated enabling technologies and roster progress; three Monument entitlements and existing popup/placement lifecycle                                                     |
| public/AI/UI      | no hidden-state access; exact statuses/costs/previews; legal deterministic Normal play; readable full tree, help, actions, and disabled Naval detail                      |
| art               | exact six-source inventory, derivatives/reuses, PixelLab receipts/manifests, native/enlarged and intended-context review                                                  |

Release evidence must include exact-repeat headless/save/replay scenarios at
the new command boundaries; current and naval browser flows; Dry Land; map and
AI playability; asset validation and the named revision-9 art review; retained
Ruleset-6/legacy gates; and a fresh revision-9 release corpus. Revision-8 and
earlier evidence remains historical and is not refreshed to claim revision-9
behavior.
