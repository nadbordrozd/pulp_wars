# Water and naval play proposal

**Status: DRAFT — unapproved product proposal.** This is a recommendation for
discussion, not a change to the playable rules. [Ruleset 7](RULESET_7.md), its
[revision 4 biome economy](RULESET_7_REVISION_4_BIOME_ECONOMY.md), and its
[revision 5 achievements](RULESET_7_REVISION_5_ACHIEVEMENTS.md) remain
authoritative. All names and values below are illustrative until a later design
is approved.

## Intended place in the game

Water should add a second route for exploration, trade, and invasion while the
land game stays complete. The current four research branches already cover
growth, resource use, roads, and war; the reserved fifth branch can serve cities
with a coast without becoming a prerequisite for inland players. A city still
grows through live population, earns Coins at Start Turn, owns a fixed footprint
that can expand, and assigns units against its capacity. Water uses those same
city relationships instead of creating a separate sea economy.

The first version should have two water terrains, one resource, two water
improvements, two naval roles, and four research nodes. Ordinary land units can
cross water in a vulnerable embarked state; there is no separate transport unit
or cargo stack. No city, neutral village, or capture target appears on water.

## Geography and fair starts

| Terrain       | Recommended role                                                         |
| ------------- | ------------------------------------------------------------------------ |
| Shallow water | Coast and approach lane. Borders land; accessible with first water tech. |
| Deep water    | Open crossing. Requires later navigation tech.                           |

Shallow water forms the edge of each useful water body, with deep water only in
its interior. A land tile is coastal when it touches shallow water by the
game's ordinary eight-way adjacency. Water may cross city footprints and can be
claimed by initial territory or Expand. The tile belongs to the same city that
claims it; owning water does not claim an entire connected sea. No Road or land
building goes on water.

Keep every capital and village reachable through land under the existing land
movement rules. Water creates shortcuts and alternative attack fronts, never a
mandatory crossing for Conquest. Compare start positions for both land
development and reachable coast: each player should have a plausible coastal
city site or expansion route, but starts need not have identical shorelines.
Protect enough usable land in each settlement ring that replacing land with
water does not erase its agriculture, timber, or Ore opportunities. Avoid tiny
isolated ponds and narrow water pockets that cannot support a meaningful route.
On smaller boards, prefer a modest connected inlet over deep water that only
serves as an impassable obstacle. Water should leave room for land armies to
approach and defend coastal cities.

These are map goals, not a proposed change to the existing regional biome
weights or a fixed share of water. Land retains its Plains, Woodland, and
Highlands identity. A future map review should measure coast access, usable
economic land, and capital spacing together before settling exact placement.

## Fifth research branch and coastal economy

Research uses the existing tier costs and permanent unlock model. The proposed
branch is independent of the four land branches; no existing land technology
requires it.

| Tier | Illustrative node | Recommended unlocks                                                              |
| ---: | ----------------- | -------------------------------------------------------------------------------- |
|    1 | Shorecraft        | Enter shallow water while embarked; build Port; recruit Patrol Boat from a Port. |
|    2 | Fisheries         | Reveal Fish on explored shallow water; build Fishery on Fish.                    |
|    2 | Navigation        | Embarked units and naval units may enter deep water.                             |
|    3 | Naval Engineering | Recruit Warship from a Port; ranged sea pressure. Requires Navigation.           |

Fisheries and Navigation are separate children of Shorecraft. A player can
develop a coast without buying open-sea passage, or buy passage before the
extra coastal growth. This gives the first water research a useful mobility and
defense package and leaves the expensive fighting ship for a deliberate naval
commitment. Inland players can invest in the existing land branches instead.

| Feature | Recommended effect                                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Port    | One per city, on an owned shallow tile touching that city's land. Provides naval recruitment and recovery; illustrative +1 live population.        |
| Fish    | Resource on shallow water, revealed with Fisheries. Before research, explored water gives no hint that a hidden Fish marker exists.                |
| Fishery | Built on owned, explored Fish; covers the marker and gives illustrative +2 live population to that city. Removing it restores Fish for rebuilding. |

These are local city investments: they require owned water, Coins, and an
eligible city, and their live population can be disrupted. Fish is a renewable
**site**, not a repeated harvest payout. This parallels Farm and Mine marker
restoration without adding a permanent one-off reward. A Fishery does not add a
fourth Market family in the first version. Coastal cities can gain levels and
income from their water tiles, while inland Farm, Camp, Mine, and processor
networks keep their existing value. The illustrative population amounts should
be tuned against lost land sites, technology cost, and city-level timing rather
than treated as approved balance.

An intact Port is the naval recruitment and recovery point for its city. A
recruit appears on its empty Port tile, uses one assigned capacity slot, and
starts exhausted like other trained units. Occupying the Port tile blocks
recruitment. A hostile vessel occupying a Port or Fishery suppresses that
improvement's live output; occupying a Port also blocks recruitment and
recovery until it leaves. This is a reversible blockade, with no special
destruction rule needed in the first version. Land units and naval vessels both
count toward their home city's ordinary unit capacity; losing or capturing a
Port does not destroy ships or grant extra capacity.

## Units, combat, and counterplay

| Role               | Recommended job and constraint                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patrol Boat        | Affordable shallow-water scout and screen. Can contest enemy boats and exposed transports; weaker in a direct fight with a Warship.                  |
| Warship            | More costly, slower ranged naval attacker. Pressures ships and coastal defenders, but needs an intact Port and cannot occupy a city.                 |
| Embarked land unit | Its original role and HP travel in one vulnerable craft. It cannot attack or use land abilities while afloat; the passenger dies if the craft sinks. |

There is still at most one unit on each tile. Naval roles stay on water; land
roles stay on land except while embarked. Neither naval role may Capture. A
Warship's range can reach a coastal land unit, but land defenders with legal
range may also fire onto water. Patrol Boats protect transports by occupying
approach cells and fighting enemy boats. Warships beat a lone Patrol Boat in an
open exchange but give up price and speed; multiple cheap boats, coastal ranged
fire, and a landing army are distinct responses. Use normal combat, retaliation,
terrain, and zone-of-control principles unless playtest demonstrates a need for
a specific exception. No role-specific damage bonus or automatic shore siege
bonus is proposed. A ship adjacent to a city does not besiege its land center.

Water ownership and sight follow the current exploration model. Exploring water
reveals terrain, and ordinary enemy vessels on explored tiles remain visible as
ordinary land units do; this proposal adds no live re-fog. Existing special
concealment rules still apply where relevant. An enemy vessel on owned water
does not transfer territory. Existing hostile zone-of-control movement stops
and fog-safe contact behavior should apply to water movement where their
ordinary conditions are met. A Port reveals no unexplored sea merely because
it is owned.

## Ordinary land-unit passage

Embarkation should be a direct contextual move from a land tile to an adjacent,
empty shallow-water tile. Shorecraft is required. The unit itself becomes an
embarked craft; there is no separately bought boat, carrier capacity, or second
occupant. It retains its owner, home city, capacity use, current HP, and role.
Embarking ends its action for that turn. Its later water movement uses a common,
modest transport pace rather than the land role's movement tricks or Roads.
Navigation permits passage into deep water. A player can embark from any legal
shore, including neutral or hostile land, so a destroyed Port cannot strand
units; a Port remains valuable for naval recruitment and recovery.

While afloat, an embarked unit cannot attack, capture, pillage, heal, use role
abilities, or recover. It can be attacked and can be lost with its craft; do not
give a Heavy or Juggernaut its land defense while afloat. Disembarkation moves
to an adjacent, empty legal land tile and ends that unit's action. A landing
therefore needs a free beachhead and survives an enemy response before it can
fight or move farther. Normal land movement, abilities, and recovery return on
its next turn. A land unit must then occupy a city center through the existing
capture wait; arriving by sea does not bypass the capture rule. Embarked units
cannot occupy city centers or seize water territory.

Naval vessels recover only while in owned water at or next to an intact friendly
Port and only under the normal idle/recovery timing. An embarked passenger must
land for recovery. These limits make a long crossing an exposed commitment and
give the defending coast time to meet it.

## Decisions to resolve before approval

1. **Map amount and shape:** Which board sizes should include meaningful deep
   water, and what minimum coast access preserves fair starts without flattening
   regional variation? Test generated maps rather than fixing a percentage now.
2. **Economic payback:** Are Port +1 and Fishery +2 live population enough to
   repay their research, construction, and lost land sites? Compare inland and
   coastal city level timing, not just raw resource counts.
3. **Combat feel:** Should an embarked craft be entirely unable to retaliate, or
   have a small generic defense? Check whether Patrol Boats can escort a landing
   without making unescorted transport hopeless.
4. **Landing tempo:** Is a full turn of exposure after disembark the right
   counterplay window on small maps? Adjust only after testing defended and
   undefended shores.
5. **Blockade and recovery:** Does reversible occupation create enough naval
   economic pressure, or does a later design need explicit pillage or repair?

Approval should turn the chosen answers into a separate precise rules contract.
Until then, the current four-branch, land-only game remains the playable ruleset.
Island-only maps that require sea travel and a second water resource such as
Pearls are candidates for later iteration, outside this first recommendation.
