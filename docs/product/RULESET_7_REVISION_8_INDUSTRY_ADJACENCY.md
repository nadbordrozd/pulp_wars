# Ruleset 7 revision 8: merged industry and shared adjacency

**Status:** implemented as the current playable Ruleset 7 runtime.

**Ruleset ID:** `pulp-wars-poc-7r8`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2`

**Scope:** this document is the revision-8 overlay over the implemented
[revision-7 networks and fortifications contract](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md).
It replaces only the exact revision identity, the Industry & Warfare technology
graph, and the Windmill, Sawmill, and Forge contributor formulas. Revision 7
and its inherited contracts remain authoritative everywhere else. Ruleset 6 is
unchanged.

## 1. Identity and compatibility

| Boundary                                   | Exact value                         |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r8`                 |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r8.current`        |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V4` |

Exact ruleset identity remains part of state, setup, save, replay, and release
validation. Revision-8 readers reject earlier Ruleset-7 identities rather than
replaying commands under changed rules. The current route removes only the
known incompatible Ruleset-7 autosave keys from `pulpWars.save.v7.current`
through `pulpWars.save.v7r7.current`. It preserves the Ruleset-6 save,
settings, unrelated storage, and frozen archive fixtures. There is no prototype
save migration.

## 2. Merged Industry & Warfare lane

Industry & Warfare is one visible three-node chain. `DRILL`, `FORTIFICATION`,
and `EXPLOSIVES` are not active technology IDs. Fortification remains a game
mechanic and player-facing effect name where it describes city or field
defense.

| Tier | ID            | Requires    | Exact unlocks                                                                                                                                                          |
| ---: | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | `PROSPECTING` | —           | reveal Ore; Mountain movement and construction; +1 Sight on Mountain; Guard; first hostile Capture of each city grants 2 Coins; +1 fortification on owned city centers |
|    2 | `ENGINEERING` | Prospecting | Mine; Workshop; Redevelop; Fighter/Guard field defense; +1 capacity for every owned city                                                                               |
|    3 | `METALLURGY`  | Engineering | Forge; Heavy; Breacher; Pillage                                                                                                                                        |

The ordinary tier research cost formula is unchanged. Prospecting is the only
tier-1 Industry & Warfare offer. Its Mountain capability applies consistently
to movement, public pathing, AI traversal, disembarkation, treasure and reward
placement, infrastructure placement, Ore visibility, and high-ground Sight.
Engineering still gates Mine construction even though Prospecting reveals Ore
and permits Mountain entry. Achievement prerequisites follow the merged lane:
Muster uses Prospecting and Engineer uses Engineering.

Technology cards show every merged unlock. The layout has one Industry &
Warfare root and real prerequisite edges
`PROSPECTING -> ENGINEERING -> METALLURGY`; it does not retain empty cards or
display-only edges for removed IDs.

## 3. Adjacent shared processor contributors

Windmill, Sawmill, and Forge count matching improvements on the eight tiles
immediately surrounding the processor:

| Processor | Matching contributor | Output                         |
| --------- | -------------------- | ------------------------------ |
| Windmill  | Farm                 | +1 live population each, cap 8 |
| Sawmill   | Lumber Camp          | +1 live population each, cap 8 |
| Forge     | Mine                 | +1 live population each, cap 6 |

A contributor qualifies when its assigned city has the same current owner as
the processor's assigned city. It may belong to another city owned by that
player. A single contributor may support every qualifying adjacent processor,
including processors assigned to several different cities. There is no
assignment, exclusivity, consumption, or reservation of contributors.

Diagonal adjacency counts. A matching improvement two or more tiles away does
not count, even when a chain of matching improvements connects it to the
processor. Foreign contributors do not count. Capture immediately reevaluates
eligibility from current city ownership.

Placement still requires at least one qualifying contributor after placement.
Each city still permits at most one processor of each type. Costs remain 5
Coins for Windmill, 5 for Sawmill, and 6 for Forge. Output caps remain 8, 8,
and 6. Workshop, Market, Road, Port, and connected-city network formulas are
unchanged.

## 4. Derived state and public behavior

Every mutation that can add, remove, replace, or transfer a contributor or
processor recomputes all affected same-owner cities. This includes basic and
processor construction, Redevelop, Pillage, capture, and territory ownership
changes. Building or removing one shared contributor may therefore emit
population changes for several processor cities in one transaction.

Placement queries, exact public previews, AI scoring, reducer acceptance,
stored live contributions, capture recomputation, and redevelopment
recomputation use the same eight-neighbor ownership rule. Public previews list
every affected owned city and expose only already public contributor
coordinates. When an owned footprint needed for an exact cross-city result is
not public, the existing conservative `NOT_OFFERED` preview behavior remains.

The technology tree, Rules/Help, selected-building explanations, and compact
economy values use the same wording: adjacent, same-owner, other-city sharing,
and the applicable cap. Connected Farm presentation remains visual only and
does not extend a processor's economic reach.

## 5. Acceptance

Focused deterministic coverage must prove:

- the exact three-node lane and absence of all three removed active IDs;
- Prospecting-only Ore visibility and Mountain entry;
- diagonal contributors count, distant connected contributors do not, and
  foreign contributors do not;
- one Lumber Camp boosts Sawmills assigned to two, three, and four distinct
  same-owner cities;
- equivalent Windmill and Forge ownership, adjacency, placement, and cap
  behavior;
- public preview and canonical command results report matching multi-city
  deltas for contributor construction and removal;
- AI scores the same public cross-city value; and
- capture and Redevelop remove or restore the correct derived outputs.

Save and replay tests require the exact `pulp-wars-poc-7r8` identity while
retaining numeric schema 7 and `REGIONAL_BIOMES_NAVAL_V2`. Current browser
evidence must show the readable merged technology cards and a cross-city
economic preview. Historical release corpora and earlier revision documents
remain frozen evidence and are not regenerated for this revision.
