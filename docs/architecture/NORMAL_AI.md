# Greedy Normal POC AI

Normal is a deterministic, renderer-independent greedy heuristic policy. It
receives only `PlayerView` and `queryPlayerCommands(view)`. Policy code does not
import `GameState`, authoritative command eligibility/combat preview, or hidden
entity collections. Every selection is submitted as an ordinary `Command`
through `applyCommand` by the browser controller or headless runner.

The complete priority table, threat definition, economic formula, stable tuple,
and cooperative relationship rules are authoritative in
[POC Rules section 12](../product/POC_RULES.md#12-ai-contract). This document
specifies how policy code builds those values without hidden access.

## Candidate construction

The policy rebuilds candidates after every accepted command. It starts from the
public query, removes `WAIT`, and classifies every remaining command exactly
once. Mandatory rewards are normally the only query result while pending. End
Turn remains the lowest candidate and cannot beat any legal productive action.

Threats use only visible hostile units and their public unit-table move/range:
`distance <= move + range`. The approximation deliberately ignores hidden
terrain, hidden blockers, ZOC, and opponent technology, so it may defend early
but can never gain information. Besiege/direct/range-plus-move severities are
3/2/1. Training in a threatened city is scored before other production whenever
the public query offers it; a besieged or occupied city naturally has no Train
candidate.

Research-chain classification is a pure walk over the frozen nine-tech graph.
For each visible owned unconsumed resource, empty unimproved Forest, or absent
desired unit role, find all
available first steps on a shortest unresearched prerequisite chain. Retain the
lowest technology-table ordinal when chains tie. Resource-chain research beats
growth, and role-chain research follows general training. Other research stays
eligible: Normal never treats a technology as permanently uninteresting.

Growth candidates compare `population + gain` with `level + 1`; there is no
maximum-level filter. Fruit and Animal use +1/-2 population/star terms and
immediate value 3; Lumber Mill uses +1/-3 and immediate value 2; Mine uses
+2/-5 and immediate value 5. Equal Fruit/Animal values reach the stable
command-kind/coordinate tuple, so ordering never depends on query iteration.
After a level-up, the fresh query immediately exposes the new training slot and
the policy can spend it in the same turn.

## Production and activation

Threatened-city type order is Defender, Warrior, Archer, Rider, Catapult.
General type order is Rider, Archer, Catapult, Defender, Warrior. General production selects the first
missing role that is currently unlocked and affordable. If none qualifies, it
selects the least-represented available role, breaking counts by that order.
This deliberately removes the old save-for-an-unavailable-role behavior: an AI
with a legal slot and an affordable Warrior trains it rather than ending the
turn merely because Rider is still locked.

Catapult is a distinct desired role only when an owned city has a potential
slot; its research chain is Hunting -> Forestry -> Mathematics. The policy does
not special-case its cost or movement-plus-attack: the public query reflects
its lack of Dash. Production counts all owned living units by type, including durable exempt and
orphan units; training legality itself uses only the query's level-based
non-exempt city count. Valid over-capacity cities produce no Train candidate and
require no policy special case.

Known movement objectives are visible neutral villages and visible hostile
cities. Equal objectives use `(y, x)`. If no objective is known, score the
number of unexplored, non-allied-blocked coordinates in the candidate result's
public reveal area. The policy favors actual frontier gain and then displacement
from the start, so units spread outward instead of oscillating. The two public
subvalues are packed into the one signed `objectiveValue` field with frontier
gain as the dominant component. A zero-gain move remains useful only when it
reduces distance to the nearest public unexplored coordinate; this handles the
ordinary opening radius, where the first one-step move may not reveal a tile,
without permitting a passive End Turn loop. Capture, defense, attacks, recovery,
and Escape use the exact tuple in POC Rules.

Normal never selects Wait. Accepted Move, Attack, Escape, Capture, and Recover
already mark a unit handled; AI presentation has no attention pulse to dismiss.
When no productive candidate remains, End Turn is correct and avoids replay
bloat from semantic no-ops.

Faction labels map back to the five mechanical roles before production counts:
Candy Warrior -> Warrior, Gumball Guard -> Archer, Choco Engineer -> Defender,
Donut -> Rider, and Candy Catapult -> Catapult. Candidate simulation uses the
owner faction's effective rule, so Donut has move 1 and never produces Attack
or Escape candidates. A Candy city trains Candy-labelled variants without a
separate content ordinal or extra capacity slot.

Candy candidates use the exact inserted priorities in POC Rules section 0.6.
For Roll, policy walks the public cardinal line and totals only visible unit and
wall HP; unexplored cells are zero-valued. It rejects a Roll with a visible
owned/allied victim or wall and otherwise values hostile threat kills first.
This safety filter is a policy choice, never an engine legality rule.

Wall placement scores only exact public `BUILD_CHOCOLATE_WALL` candidates. It
counts visible hostile shortest approach lines blocked toward the threatened
city, avoids a visible friendly Fruit/Animal/Ore/empty-Forest action when an
equally blocking alternative exists, then uses terrain order Grass, Forest,
Mountain and the standard coordinate/entity tie-breaks. Walls are occupancy
blockers for later public movement scoring but never units, threats, objectives,
production roles, kills, or capacity.

Candify scores hostile territory above neutral and is excluded for friendly or
allied territory. Move candidates gain the POC Rules 610 priority only when the
public resulting cell would have a legal next Candify and no higher-priority
objective move exists. A tied mandatory `CHOOSE_CANDIFY_CITY` uses public
candidate territory to maximize newly adjacent non-friendly cells, then lowest
city ID. Normal does not sacrifice the last unit assigned to a threatened city
while any productive defense action remains.

## Cooperative mode

The relationship graph comes from setup plus immutable serialized
`humanPlayerId`, not policy-local controller state. In `COOPERATIVE`,
human-to-AI pairs are hostile and AI-to-AI pairs are allied.
Public enumeration already removes allied Attack/Capture and allied-territory
paths. Policy classification additionally excludes allied units/cities from
threat, safety, objectives, and combat value. An unexplored allied territory
coordinate may appear only as the content-free `diplomaticBlock` union arm; it
does not count as frontier and exposes no terrain, resource, Mine, entity, or
controlling AI.

There is no shared vision, economy, technology, unit control, healing, reward,
capacity, or coordinated plan. Cooperation means only non-hostility,
allied-territory avoidance, and a common human target. Neutral villages remain
valid expansion objectives for every AI.

Candy does not loosen cooperation: public enumeration rejects building or
Candifying allied territory, and policy rejects a Roll with any visible allied
unit or wall on its line. The engine still accepts friendly/allied Roll damage
and wall Attack for human-authored commands because those abilities explicitly
permit friendly fire. Soak assertions distinguish engine capability from Normal
policy: zero AI-on-AI Roll casualties, wall attacks, or Candify transfers are
required.

## Determinism and runner limits

Stable comparison is the signed-integer tuple from POC Rules. Target coordinates
are `(y, x)`; IDs and frozen content-table ordinals finish ties. Normal consumes
zero PRNG draws. Equal PlayerViews, including diplomatic blockers, must produce
byte-identical candidate tuples and the same selected command.

Each turn admits at most 128 accepted commands. The runner reserves the final
two slots for a mandatory pending city/Candify choice and End Turn. A missing candidate,
rejected selected command, non-advancing accepted command, or inability to end
terminates with a structured error/stall diagnostic rather than retrying with
hidden knowledge. Browser pacing, Fast Forward, and headless execution must
produce identical commands, ordered events, and final hashes.

Validation uses fixed rival and cooperative corpora on Auto, Large 20 x 20, and
Huge 25 x 25 boards. Participation evidence must show training, exploration,
neutral and hostile capture, all nine technologies and five units, Fruit,
Animal, Lumber Mills, Mines, Catapult attacks/kills, and levels beyond three
where reachable. Hunt and Lumber command/event counts remain separate so their
absence cannot hide inside aggregate growth. Cooperative evidence additionally requires zero
AI-on-AI Attack/Capture, zero allied ZOC/siege, zero new exploration inside
allied territory, and no allied-territory Move/Escape step.

Ruleset-5 adds all-Original, all-Candy, and alternating mixed-faction matrices.
Participation evidence separately records Roll, wall Build/Attack/destruction,
Candify unique/tied resolution, neutral/hostile annexation, all four Candy unit
labels, and Candy Catapult Candify. Every matrix repeats command/event/state
hashes and verifies that faction assignment changes no map hash or PRNG stream.
