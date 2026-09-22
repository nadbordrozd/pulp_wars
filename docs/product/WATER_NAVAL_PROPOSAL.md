# Water and naval play proposal, version 2

**Status: DRAFT — unapproved product proposal.** This recommends a future
ruleset; it does not change playable rules. [Ruleset 7](RULESET_7.md), its
[revision 4 biome economy](RULESET_7_REVISION_4_BIOME_ECONOMY.md), and its
[revision 5 achievements](RULESET_7_REVISION_5_ACHIEVEMENTS.md) remain
authoritative. Names, costs, movement rates, and outputs below are illustrative
balance targets, not approved values.

## Purpose and current boundary

Water should offer its own growth and Coin opportunities, faster travel between
shores, and a naval combat theater that can support a real invasion. Maps may
have continents, archipelagos, broad deserts with sparse water, or mixtures of
these. Crossing the sea may be necessary to reach a rival or village. Land-heavy
maps should still play well without naval investment.

The current game has no water terrain, naval branch, Port, or naval unit. Cities
grow from permanent and live population, earn Coins at Start Turn, and own a
fixed footprint that can expand at level 4. Units draw from their home city's
capacity. Fruit is visible on explored Grass and gives a one-off population
harvest; Game is visible on explored Forest before Hunting unlocks its use.
Roads connect city centers to the capital and can improve Market income. A land
unit occupies a village or city through its owner's next Start Turn before
Capture. This proposal keeps those relationships rather than adding a separate
shipping inventory or transport unit.

## Map shape and achievable openings

| Terrain       | Proposed role                                                      |
| ------------- | ------------------------------------------------------------------ |
| Shallow water | Borders land; early crossing and eligible for Ports and resources. |
| Deep water    | Longer open crossing; requires Navigation for units to enter.      |

Water occupies ordinary map tiles. An owned water tile belongs to one city,
through its starting footprint or Expand; a city does not own an entire sea.
No land building or Road occupies water. Deep water may separate landmasses,
and a settlement may have no land route to another settlement. The generator
should retain broad geographic variety without imposing a universal land path
or a fixed water percentage. It should measure usable coast, land development
sites, expansion targets, and travel distance together, so desert and island
starts remain different but comparably viable.

Every start must have an achievable first expansion or attack route. A capital
on an island needs an owned shallow tile where it can afford a Port, a legal
landing shore toward a reachable village or rival, and enough local economy to
fund the required research and crossing before it runs out of useful choices.
At the illustrative one-city prices, the starting 5 Coins buy Shorecraft; the
capital's ordinary Start Turn income can then pay for a 4-Coin Port without
training another unit. The opening route can use shallow water with Shorecraft.
If it requires deep water, the starting land and resources must sustain the
additional Navigation cost and staging time before first contact. The starting
Fighter must be able to use the first Port without another capacity unlock or
a newly trained unit. A land-heavy start with no useful sea route need not buy
the water branch. Avoid landlocked one-tile seas sold as naval opportunities.
These are map acceptance goals, not
new biome weights or a promise of identical shorelines.

## Research and coastal economy

Keep a fifth research branch independent of the four current land branches.
The existing research model is permanent and paid in Coins. The following
nodes use the current tier price pattern illustratively; a forced sea opening
must remain affordable from its starting economy.

| Tier | Proposed node     | Unlocks                                                                          |
| ---: | ----------------- | -------------------------------------------------------------------------------- |
|    1 | Shorecraft        | Port, one-off Fish/Pearl harvest on shallow water, shallow passage, Patrol Boat. |
|    2 | Navigation        | Passage through deep water and harvest of owned deep-water Pearls.               |
|    3 | Naval Engineering | Battleship recruitment; requires Navigation.                                     |

Fish and Pearls are visible on explored water from the outset, like Fruit and
Game; research gates use, not visibility. A water tile has at most one resource
marker. Fish appears on shallow water and gives an illustrative +1 permanent
population for a 2-Coin harvest, once. Pearls may appear on shallow or deep
water and give an illustrative one-time net Coin gain: pay 2 Coins to collect 4. Both resources disappear when collected and never regenerate. Fish advances a
coastal city's level; Pearls help pay for a Port, Navigation, or a vessel.
Harvest is an ordinary city tile action on an owned, explored eligible tile;
finding Fish or Pearls offshore does not let a player collect from neutral sea.
Pearls are thus a distinct economic choice rather than another population
improvement competing for the same scarce tiles. Deep Pearls reward later
expansion and Navigation, but an early coastal city does not depend on them.

A Port costs an illustrative 4 Coins, can be built on any explored, owned
shallow-water tile touching that city's land, and gives its owning city +1 live
population while active. There is **no per-city Port cap**. A Port is a usable
embarkation point and a naval recruitment and recovery site. A resource marker
on its tile remains available until harvested, and collecting it leaves the
Port intact; the two
uses occupy different layers. A Port can also be built after a harvest. This
single improvement avoids forcing a Fishery and a Port to compete for a tiny
coast. Repeated Ports still cost Coins and scarce tiles, but each adds its own
population and another place to stage or recruit. They do not each multiply a
trade payout.

For example, a city owns just three shallow tiles: Fish, Pearls, and empty
water. It may harvest Fish for +1 permanent population and collect Pearls for
the one-time Coin gain, then build a Port on the empty tile for +1 live
population and embark there. Later it can add Ports on the two harvested tiles,
reaching +3 live Port population and gaining more staging points without
losing either resource payout. It may instead build the first Port on Fish and
harvest Fish afterward. The city's land tiles remain available for Farms,
Camps, Mines, and their existing supporting buildings.

### What connected Ports do

Active friendly Ports connect through an explored, continuous navigable water
route, even when the player owns no water tiles between them. Shallow lanes
connect with Shorecraft; deep-water segments connect only after Navigation.
An active Port links to its city's center through that city's territory.
Port links and existing Roads can connect a remote city to the capital. That
city may receive the existing Market Road bonus where its Market otherwise
qualifies. A noncapital coastal city also receives an illustrative +1 Coin at
Start Turn when one of its active Ports has a sea link to a **different** city's
active Port in the capital-connected network. This sea bonus is **once per
city**, regardless of Port count or route count; several Ports in one city
cannot earn it by linking to one another. A city connected only by Roads gets
the existing Road benefits, not the sea bonus. Ordinary sea movement is already
faster than land travel, so connectivity adds no extra movement multiplier.

An enemy vessel occupying a Port makes that Port inactive: its +1 live
population, recruitment, recovery, embarkation, resource collection, and
connection stop until the vessel leaves. A friendly occupant also blocks
recruitment on that tile. Routes then use any other active Ports. A vessel
elsewhere in the lane contests actual passage but does not silently erase a
whole network's income; no per-tile shipping or upkeep is proposed. Port loss
may lower live population under the existing city rules. Capture transfers
Ports with the city's footprint. A vessel on owned water never claims that
tile or a city.

## Ships and an invasion that can finish

| Role               | Recommended job and limitation                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patrol Boat        | Affordable, fast screen that scouts lanes, fights other light craft, and intercepts exposed embarked units; poor in a direct exchange with a Battleship.        |
| Battleship         | Expensive, slower range-2 gun platform with illustrative attack 5, exceeding a Heavy's attack 3.5; defeats light ships and seriously damages coastal defenders. |
| Embarked land unit | The existing land unit in a vulnerable craft, with its owner, role, HP, home city, and capacity use preserved; it cannot attack or Capture while afloat.        |

Each vessel uses one ordinary home-city capacity slot; there is one unit per
tile. A Battleship can fire at ships or coastal land targets in range, but
cannot enter land, occupy or Capture a city, or fire beyond its stated range.
Its illustrative Move 2 and rule that it may move or fire, never both in the
same turn, make it a commitment. A defender can respond when it enters
bombardment range, while its firepower makes it
worth escorting an invasion. Patrol Boats can screen approaches and threaten
transports; opposing Battleships and legal coastal ranged attacks can answer
one. Concentrated cheap craft can force a costly ship to trade shots instead
of bombarding a beach. A Battleship alone cannot win Conquest: land units must
still land, hold a city center, and Capture it under the existing wait rule.

Shorecraft allows a land unit to **embark only through an active friendly
Port**: from an adjacent land tile it enters the empty Port tile and becomes an
embarked craft. It need not buy a separate transport or consume a second
capacity slot. Embarking ends its action. On later turns, an embarked unit moves
an illustrative three water tiles per turn, faster than a Fighter on ordinary
land. A six-tile crossing takes one embark turn, two sailing turns, and one
landing turn; an ordinary Fighter needs at least six movement turns to cover a
six-tile land route. Navigation permits deep-water movement. An embarked unit
has weak generic defense, cannot attack, use its land abilities, heal, or
recover afloat, and dies if its craft sinks. Naval units may use their normal
attack and movement allowances, subject to water terrain and ordinary occupancy
and hostile control.

An embarked unit may disembark to an adjacent empty, legal land tile, including
neutral or hostile shore, without a destination Port. Disembarking ends its
action; it must survive the defender's response before moving or attacking
again. A viable attack brings Patrol Boats to screen transports and a
Battleship to clear naval defenders or soften the beach, then lands enough
capture-capable units to hold a city. Shore defenders can occupy landing tiles,
fire on ships within legal range, contest the approach, or counterattack a
beachhead. These are concrete ways to stop an invasion without making an
undefended island untouchable.

After landing, a unit can re-embark **only at an active friendly Port**. A
failed beachhead may therefore be unable to retreat by sea. Capturing a
coastal city transfers its Ports and makes them available once cleared of
hostile occupation; where its owned coast has no Port, the new owner may build
one after Capture. That Port supports reinforcement, recovery, and the return
trip, subject to Coins, capacity, and any enemy blockade. An attacker choosing
an undeveloped shore accepts that it may have to win and develop a city before
its landing force can leave. Recovery for naval vessels requires an intact
friendly Port nearby and ordinary idle timing; embarked passengers must land
first. No supply chain, automatic troop return, or special offshore Capture is
proposed.

## Balance questions before approval

1. How much local economy and staging room should a compulsory shallow or deep
   crossing require, across board sizes and geography types? Test starts that
   must sail, can choose to sail, and have no useful sailing route.
2. Are Fish +1 permanent population, Port 4 Coins/+1 live population, and a
   2-to-4-Coin Pearl harvest worthwhile beside land investments without making
   a three-Port coast disproportionately strong?
3. Does one connected Coin per noncapital city, alongside the existing Market
   Road bonus, reward Port networks enough when several Ports serve one city?
4. Does the proposed Battleship overwhelm coastal defense, or do its price,
   pace, range, and exposure leave room for escort and counterattack? Measure
   defended landings, failed retreats, and reinforcement after Capture.

Approval should turn the chosen answers into a separate precise rules
contract. Until then, the four-branch, land-only game remains authoritative.
