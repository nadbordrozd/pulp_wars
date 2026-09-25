# Ruleset 7 revision 11: City logistics and tactical AI

**Status:** approved planned contract; not implemented in the current runtime.

**Planned ruleset ID:** `pulp-wars-poc-7r11`

**Current executable runtime:** `pulp-wars-poc-7r10`

**Scope:** this document is a narrow overlay over the implemented
[revision-10 playtest corrections](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)
and the unchanged rules in the
[revision-9 Human technology contract](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md).
It changes city action cadence, Windmill healing, land-Road population,
Commerce, Ore visibility, Pillage's technology assignment, two naval art
sources, and Normal-AI evaluation. Every unmentioned revision-10 and
revision-9 rule remains in force, including revision-10 Road movement and
city-center spawning/displacement.

The choices below are narrow applications of the approved
[technology-tree principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md): Roads
and healing make Human infrastructure matter on the board; Commerce gains a
one-line cross-branch payoff; and Raiding receives a unique non-unit tool.
Windmill healing is one Start Turn infrastructure resolution, not a
continuously changing unit aura. It therefore avoids formation recalculation
while units move and leaves the Captain's active support identity intact.

## 1. Identity and compatibility

| Boundary                                   | Revision-11 value                   |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r11`                |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r11.current`       |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V5` |

The revision-11 reader rejects every earlier Ruleset-7 identity rather than
reinterpreting its city actions, recovery, economy, or technology state. There
is no save migration. Current-route startup deletes only the known obsolete
Ruleset-7 current-save keys through `pulpWars.save.v7r10.current`. It preserves
the frozen Ruleset-6 save, settings, historical fixtures and artifacts, and
unrelated storage.

Numeric version 7 remains sufficient because exact ruleset identity also
dispatches every state, setup, command envelope, event log, save, replay, and
release artifact. Until the implementation and release work changes the
executable identity, revision 10 remains the honest current behavior and this
document must not be presented in the game as live rules.

## 2. One city action per owner turn

Each city has exactly one city action during each turn of its current owner.
The following accepted commands spend it:

- `TRAIN { cityId, role }`;
- `TRAIN_NAVAL { cityId, at, role }` from any active Port or Shipyard assigned
  to that city; and
- `LAND_GRANT { cityId }`.

All Ports and the Shipyard assigned to one city share that city's single
action. Training from one dock prevents land training, training from another
dock, and Land Grant in that city for the rest of the owner turn. Each other
city keeps its own action.

Research, unit commands, resource harvest, improvement and Road construction,
terrain transformation, Port/Shipyard construction, Redevelop, and every
other tile command consume no city action. Mandatory reward resolution and
reward choices consume no city action. A Militia or Juggernaut granted by a
reward therefore still spawns when that city's action has been spent and does
not spend an available action.

The canonical city record stores `cityActionAvailable`. At the owner's Start
Turn, set it to `true` for every city that player then owns. An accepted city
action sets it to `false` only after every ordinary legality check and atomic
preflight succeeds. Rejected commands consume no Coins, city action, PRNG, or
other state. A direct attempt when the flag is false rejects with
`CITY_ACTION_SPENT`; ordinary public command queries omit all three kinds for
that city.

Capture sets the captured city's flag to `false`, regardless of its former
value. The capturer cannot use that city action during the capture turn. It
becomes available only if the city is still owned by that player at that
player's next Start Turn. Recapture repeats the same rule and never carries an
unused action between owners.

`cityActionAvailable` participates in strict state/save/replay parsing and
hashing. The owner sees it on each owned city in `PlayerViewV7`, city selection,
and accessible city status. Opponents receive no private availability field or
command omission that reveals it through fog. Accepted training keeps
revision-10 center displacement and removal semantics. Naval training keeps
its selected-dock occupancy, activity, cost, and spawning rules.

## 3. Windmill Start Turn healing

Milling no longer unlocks Supply, and supplied-city recovery is absent. Remove
the 6-HP supplied-territory row, `supplied` status, and Supply descriptions
from rules, public views, UI, AI, and telemetry.

At the Start Turn of player `P`, each Windmill on a tile currently assigned to
a city owned by `P` can heal damaged units owned by `P` on its eight adjacent
cells. The center cell is not adjacent and never qualifies. Land, naval, and
embarked forms all qualify. An enemy or formal ally never qualifies. A validly
constructed Windmill remains a healing source even if it currently has zero
Farm contributors or zero live population output; only current ownership and
the Windmill's continued existence matter.

Resolve the complete heal from one immutable post-activation-reset Start Turn
snapshot:

1. Order owned Windmill coordinates by canonical `(y,x)`.
2. Order damaged living same-owner adjacent units by unit ID for each source.
3. Assign each eligible unit to the first adjacent Windmill in that source
   order. Later overlapping Windmills skip it.
4. Heal every assigned unit by `min(6, maxHp - hp)`. Apply the grouped results
   atomically.

Thus one unit receives Windmill healing at most once per owner Start Turn even
when several Windmills touch it. Full-health units are neither assigned nor
reported. Healing consumes no city action, unit activation, Coins, or PRNG and
does not mark the unit as moved, recovered, handled, or tended.

Ordinary explicit and idle recovery remains 4 HP in friendly land territory
and 2 HP in neutral or hostile land territory. The inherited naval 4/0 recovery
rule remains. Captain Tend Wounded remains 2 HP with its existing action and
once-per-owner-turn marker. These sources are independent: a unit may receive
idle recovery before the turn changes, then Windmill healing at its next Start
Turn, and may later receive Tend or use Recover when otherwise legal.

Start Turn event order is:

1. `TURN_STARTED`;
2. zero or more `WINDMILL_HEALING_RESOLVED` events in source `(y,x)` order;
3. `INCOME_AWARDED`;
4. inherited reward settlement and achievement evaluation.

Each healing event has
`{ playerId, cityId, at, results: [{ unitId, amount, hpAfter }] }`, with results
in unit-ID order, and exists only when its source actually healed at least one
unit. The source city's current ID provides attribution but does not constrain
the target's home city or tile assignment.

The owner receives the complete event. Another observer receives only results
for which both the Windmill cell and healed unit are currently visible; omit
the projected event if no result remains. Projection never reveals a hidden
source, unit, ownership change, or HP value.

Normal-motion presentation coalesces all visible Start Turn healing into one
brief two-beat cue: every contributing Windmill turns/pulses for 180 ms, then
every unit present in an actual projected result receives a simultaneous
260 ms healing pulse. The total cue is at most 440 ms regardless of source or
target count. Do not animate full-health or skipped overlapping targets.
Reduced motion uses two opacity/color-state changes without translation or
rotation; Fast Forward applies the same authoritative events without an
animation delay. The semantic event log names the Windmill coordinate, each
healed unit, and exact amount. Existing Windmill art and code-native effects
are sufficient; this rule authorizes no new Windmill raster.

## 4. Roads and Commerce

### 4.1 Land-Road population

Roads retains revision-10 half-step movement on any usable Road edge. Movement
and the population graph remain separate: movement needs no capital connection.

For the population graph, eligible nodes are owned city centers and Road tiles
that are either neutral or assigned to a city currently owned by the player.
Edges join all eight adjacent nodes. Seed the graph only from the player's
currently owned original capital. There are no Port, Shipyard, sea, or allied
edges. The graph exists as soon as Roads is researched and does not require
Commerce.

For each distinct connected owned city whose ID is not the player's original
capital ID:

- that connected city receives +1 reversible live population; and
- the original capital receives +1 reversible live population.

A captured foreign capital is an ordinary non-original-capital city for this
rule. The original capital receives one point per distinct connected city, not
per Road, route, edge, or alternate path. Loss of the original capital makes
the complete contribution zero; no other city becomes an anchor. Recapture or
reconnection restores it.

Contributions are derived and deduplicated by
`(playerId, connectedCityId, beneficiaryCityId)`. Recompute immediately after
Roads research and every accepted transition that can change current Road
eligibility, city ownership, or connectivity. Use the inherited live-economy
and growth event ordering. Disconnect can reduce displayed population but not
the high-water city level or reward history. Reconnection restores the same
contribution once and cannot duplicate a level or reward.

### 4.2 Commerce payoff

Commerce has exactly two effects:

1. each connected owned non-original-capital city in the land graph above pays
   +1 Coin at Start Turn; and
2. every owned Market's recurring income is doubled.

Without Commerce, a Market retains revision 9's `1 + distinct adjacent
economic families`, capped at 4. With Commerce, its exact income is
`2 * (1 + families)`, producing 2, 4, 6, or 8 Coins. The construction gate,
one-per-city limit, eight-neighbor family rules, contributor sharing, and
post-support-loss base income remain unchanged. Researching Commerce applies
the multiplier immediately to subsequent previews and income; it does not add
a resource, stockpile, technology slot, or Road requirement to Market
placement.

Land trade pays each connected city at most once and never pays the original
capital for itself. Market, land-trade, and inherited sea-trade income are
separate additive facts before the population-deficit floor; siege still
makes the affected city's complete income zero. The player-facing explanation
is: **Connected cities grow with Roads; Commerce earns trade and doubles
Markets.**

Doubling is retained as the revision-11 starting value because it gives the
tier-3 Mobility technology a visible payoff from 1–4 additional Coins per
Market while requiring a cross-branch Administration investment and valid
Market placement. This is a bounded synergy with existing systems rather than
a new economy.

## 5. Ore and Pillage technology assignments

The relevant technology rows become:

| Branch     | Tier | ID            | Requires      | Exact unlocks                                              |
| ---------- | ---: | ------------- | ------------- | ---------------------------------------------------------- |
| Settlement |    3 | `MILLING`     | Farming       | Windmill; adjacent Start Turn healing                      |
| Mobility   |    2 | `RAIDING`     | Scouting      | Pillage for all normal trainable land roles; Raider Charge |
| Industry   |    1 | `DRILL`       | —             | reveal Ore; Guard; first hostile Capture Spoils            |
| Industry   |    2 | `ENGINEERING` | Drill         | Mountain movement/Sight; Mine; Workshop; Redevelop         |
| Industry   |    3 | `EXPLOSIVES`  | Fortification | melee Field Defense demolition; Blast Mountain             |

Drill reveals Ore on explored Mountain tiles. Engineering remains required to
enter Mountain with land units, receive +1 Mountain Sight, build Mine or
Workshop, and Redevelop. Building a Mine still covers Ore; Pillage or
Redevelop restores it. Public views continue to emit `UNKNOWN_RESOURCE` until
the viewer owns Drill, and equal hidden-resource views remain
decision-identical.

Blast Mountain still rejects every Mountain containing Ore. Because
Explosives already descends from Drill through Fortification, its public offer
can use the Drill-visible resource directly and has no Engineering prerequisite
or Engineering-based suppression.

Raiding is the sole Human technology that grants Pillage. Once researched,
Fighter, Raider, Marksman, Guard, Captain, Catapult, and Knight may all use the
inherited terminal `PILLAGE` command. Its target, move-before-terminal,
activation, 1-Coin, improvement destruction/restoration, Road exclusion,
exposure, event, and no-refund rules are unchanged. Raider Charge remains a
separate Raiding unlock. Remove Pillage from the Explosives technology card,
Rules/Help, action prerequisites, AI valuation, and every Human description.
Explosives retains only Field Defense demolition by surviving friendly
land-form melee attackers and Blast Mountain. Faction-specific role
substitutions outside this Human technology assignment remain governed by
their own contracts.

## 6. Revision-11 Port and Fish art

This section is the revision-11 override for the Port and Fish clauses in the
[Naval Asset Contract](../art/classes/naval.md#3-fish-and-pearls) and
[building contract](../art/classes/buildings.md). The shared
[Art Direction](../art/ART_DIRECTION.md) remains authoritative. In particular,
the southeast three-quarter camera, upper-left light, strong outline, broad
flat shading, transparent straight-alpha output, clean edges, and square-tile
hierarchy do not change.

The production inventory is exactly two new programmatic PixelLab sources:

| Asset ID                               | Subject      | Canvas       | Anchor      | Scale | Background  |
| -------------------------------------- | ------------ | ------------ | ----------- | ----: | ----------- |
| `building-ruleset7-port-v7r11`         | working Port | 384 x 384 px | `(192,288)` |  0.30 | transparent |
| `terrain-ruleset7-resource-fish-v7r11` | Fish shoal   | 256 x 384 px | `(128,256)` |  0.50 | transparent |

Revision 11 registers these sources for the existing Port and Fish subjects.
The accepted revision-10 sources remain historical. Shorecraft, Build Port,
Port identity, Harvest Fish, and their deterministic framed UI reuse derive
from these two accepted world sources and authorize no extra request. Do not
regenerate Shipyard, water, Pearls, ships, transport, icons, portraits,
effects, or any other production art in this revision.

### 6.1 Working Port

Revision 11 explicitly supersedes the older requirements that the Port be
“small” and “not a full harbor scene.” It is a substantial but tile-bounded
working harbor: two broad timber-and-stone piers or quays form a readable
docking basin, a compact warehouse anchors the back edge, and one bold cargo
group of crates/barrels plus mooring gear communicates trade and service. The
silhouette is low and wide. It must read as a functional harbor at minimum
zoom without becoming a city, bridge, ship, or scenic coastline.

Preferred alpha bounds are `x=24..360,y=62..328`; hard bounds are
`x=12..372,y=36..340`. No alpha crosses the left, right, or bottom hard bound;
only the warehouse roof or a modest hoist may extend upward. The visible alpha
bounds must span at least 300 source pixels horizontally and 210 vertically,
and the alpha-weighted displayed area must be at least 25% larger than the
revision-10 Port when measured at the same 0.30 scale. Record both old and new
measurements in review evidence.

Keep the central/lower docking and resource window at
`x=80..304,y=168..330` visibly open. Fish, Pearls, and a colocated naval or
embarked unit draw over the Port and must retain their primary silhouette. A
contiguous 8–15% maskable faction-color patch remains required, but cargo and
function must read without its hue.

The retained Shipyard must remain clearly more industrial: it owns the larger
crane/drydock frame, taller service silhouette, and upgraded-dock reading. The
Port owns the broad public quay, modest warehouse, cargo, and open basin. Reject
a Port that visually outclasses or aliases the Shipyard, hides a resource or
unit, needs a state overlay to read, or resembles the old small U-shaped pier.

Do not bake a ship, resource, route, Coin, number, owner emblem, trade state,
selection, blockade, damage, smoke, text, terrain square, cast shadow, or fog
into the source.

### 6.2 Fish shoal

Fish becomes one coherent shoal of five to seven small silver-teal fish. They
swim in similar southeast headings in a loose diagonal, wedge, or staggered
formation. Each fish has a separately readable body and tail, clear transparent
space separates neighboring silhouettes, and no single fish dominates the
composition.

Use the inherited owning square and hard bounds. Preferred visible bounds are
`x=48..208,y=180..320`; hard bounds remain `x=40..216,y=148..336`, with bottom
contact near `y=320`. Broad highlights and strong outlines must keep individual
fish readable on both water values at 0.625x zoom. Reject a single dominant
fish, radial clump, overlapping blob, skeleton, dead/caught pose, school that
looks like bubbles or foam, or a mere recolor of the revision-10 composition.
The water-context and minimum-zoom visual review is authoritative over an
arbitrary per-fish angle, spacing, or alpha quota. The source contains no boat,
hook, net, sparkle, action arrow, text, price, terrain, Port, shadow, or UI.

### 6.3 Generation and review gate

Use checked-in programmatic PixelLab recipes and immutable submission receipts.
Each source records prompt, negative prompt, dimensions, model/settings, seed
when supported, reference hashes, output mapping, and deterministic processing.
Generate, inspect, and accept Port and Fish individually; exactly two accepted
sources comprise this inventory. Retain receipts for every rejected and retried
generation without treating those attempts as additional production assets.

For each source, inspect the transparent source, nearest-neighbor enlarged
view, and native map display at 0.625x, 1x, and 1.75x with DPR 1 and 2. The
context sheet must include both water terrains, every owner color, fog and
selection, all eight coast adjacencies, and dense coast repetition. Port review
also includes every resource/occupant/blockade state, one through five Ports,
and a side-by-side with Shipyard and all naval pieces. Fish review also includes
with/without Port and Shipyard, every naval piece, grayscale, and comparison
beside Fruit, Game, Ore, Fertile Ground, and Pearls. A successful provider
response is not acceptance; regenerate any source that fails silhouette,
spacing, footprint, resource/occupant readability, camera, palette, alpha, or
edge quality.

## 7. Bounded Normal-AI policy

Revision 11 replaces the current broad priority buckets with a bounded tactical
heuristic while retaining the public-information boundary in
[Greedy Normal AI](../architecture/NORMAL_AI.md). The policy remains
deterministic, PRNG-free, renderer-independent, and a pure consumer of
`PlayerViewV7`, public command queries, and public previews. It may not import
authoritative state, reducer legality, hidden resources or entities, opponent
economy/research, or map-generation facts.

This is not a general game-tree search. Candidate evaluation may project the
current command and bounded public reachability needed for one tactical fact.
It may retain the existing bounded Knight continuation evaluator because the
authoritative Overrun lock exposes that finite sequence. It may not add
minimax, opponent-turn rollout, Monte Carlo play, arbitrary multi-turn build
search, or elapsed-time-dependent decisions.

### 7.1 Tactical priorities and exceptions

Build threat facts from public legal reach, range, minimum range,
move-then-primary limits, terrain access, occupancy, ZOC, form, capture timing,
and visible damage previews. Proximity alone is not a threat. A “screen” counts
only if it can legally reach a useful blocking, interception, retaliation, or
replacement cell within the relevant activation; a unit within distance two
that is blocked, immobile, unable to attack after moving, or at invalid range
does not count.

The ordering goals are:

1. preserve or retake an actually threatened owned city;
2. complete a legal hostile-city capture or create a survivable immediate
   capture line;
3. take favorable combat and protect useful formations;
4. use support, recovery, economy, and movement toward assigned objectives;
5. end the turn when no positive bounded action remains.

Avoid an Attack whose public preview predicts the acting unit dies, the target
survives, and no higher goal changes. This filter has explicit exceptions when
the same projected command is necessary to prevent an otherwise reachable
city capture, clears or completes an immediate city capture, removes Field
Defense for a legal follow-up already available this turn, or trades the unit
for a strictly more valuable visible tactical result. The exception must be a
computed public fact in the candidate explanation, not a role or coordinate
special case.

Keep the sole effective defender on an actually threatened city unless another
unit can legally replace its defensive function this turn or moving produces
one of the city-saving/capture exceptions above. Before training, project
revision-10 center displacement. Do not train a Fighter into a threatened
occupied city when that would push a healthy fortified Guard off the center or
remove it for lack of a destination, unless the projected final defense is
strictly better by the same public threat model.

Assign units to city objectives with bounded reservations or diminishing
returns so one city does not attract the whole army while another visible
city, defense, flank, support need, or recoverable unit has useful work.
Objective assignment must account for distinct legal approach cells rather
than distance alone. Guards prefer holding/replacing defenders; Catapults seek
legal screened range; Knights and Raiders prefer flanks and capture openings;
Captains compare the complete legal Rally/Tend result; damaged units compare
ordinary recovery and reachable Windmill staging against low-value attacks.
These are score inputs, not hidden role bonuses or forced scripts.

City action candidates compete across land training, every assigned dock, and
Land Grant as one shared resource. The policy must score their projected final
city/action state and cannot assume another city action remains.

### 7.2 Bounded Road planning

Normal may build a Road only when the tile either completes a currently useful
capital-to-city land connection or is the next missing tile on one canonical
public corridor to a specific owned non-original-capital city. Corridor search
uses explored legal Road cells, existing eligible nodes at zero new-Road cost,
canonical tie-breaks, and a hard cap of eight missing Road tiles. Select one
target by derived live-population benefit, Commerce income when known, useful
movement shortening, fewer missing tiles, then city ID. Build outward from the
existing capital component; each accepted Road must reduce that selected
corridor's missing count. Recompute after every command or connectivity change.

If no target has a useful corridor within the cap, no Road build outranks End
Turn merely because it is legal. The policy never starts disconnected Road
fragments, decorative branches, or several equal corridors at once. It may
abandon a corridor when capture, ownership, cost, or a higher tactical need
changes the public value; no stored hidden plan is required.

### 7.3 Scheduler bounds and deterministic parity

Keep the 128 accepted-command owner-turn cap, mandatory-work reservation, one
accepted browser command per scheduled slice, structured failure semantics,
and the existing incremental `NormalPolicyWorkV7` budget API. Every new threat,
objective, corridor, and displacement pass is resumable. Advancing with budget
one performs at most one declared work unit such as one candidate projection,
one path-node expansion, or one unit/objective comparison. Wall-clock time
never enters scoring or tie-breaks.

For every validation view, cold synchronous selection, every tested sliced
budget (including one), save/resume reconstruction, and browser scheduling must
produce the same ordered candidate tuples and selected command. Two byte-equal
public views produce byte-equal work and commands. Authority states that
project to the same public view also produce the same work and commands.

Before heuristic tuning, the retained command-1100 policy benchmark and a
worst-case legal 25 x 25 revision-11 view freeze baseline total work units,
candidate count, path expansions, and slice count. The implementation declares
finite per-pass work-unit ceilings from the public cell, unit, objective,
candidate, and eight-missing-Road limits; tests fail if a pass exceeds its
declared ceiling. Cold/sliced equality, the 128-command cap, and those work-unit
bounds are deterministic gates.

Run the same benchmark views against baseline and revised policies under the
same reference-machine conditions and report total duration plus p50, p95, and
maximum slice time. The historical architecture evidence observed 12.6–13.5 ms
maximum slices and no measured slice above 16 ms, but explicitly labels those
figures load-sensitive rather than portable guarantees. Later reviewed browser
evidence recorded an 18.1 ms AI slice while passing the existing 40 ms callback
diagnostic. Revision 11 creates no new 16 ms hard gate. Investigate and explain
or correct any material baseline-to-revised timing regression before
acceptance. Timing remains diagnostic and never enters decisions or tie-breaks.

## 8. AI evaluation and acceptance

Clone determinism proves reproducibility, not playing strength. Revision-11 AI
acceptance requires all three groups below and publishes commands, metrics,
caps, and failures rather than a strength claim based on equal hashes.

### 8.1 Semantic tactical scenarios

Scenario fixtures are built from named public relationships and legal
constraints, not policy-specific coordinates or expected entity IDs. Run each
scenario in at least two legal translations/reflections and assert the outcome
class; stable tuple ordering may choose among genuinely equivalent commands.
The suite must cover:

1. a legal immediate city threat outranks a closer unit that cannot legally
   attack or capture because of minimum range, move/attack, terrain, occupancy,
   or ZOC;
2. the sole effective city defender holds while an unreachable nominal screen
   is nearby;
3. a reachable replacement permits that defender to take a superior action;
4. a low-value suicidal fortified Attack loses to hold, support, or recovery;
5. a projected sacrifice is selected when it is the only public line that
   saves an owned city;
6. a projected sacrifice is selected when it clears or completes an immediate
   hostile-city capture;
7. several units reserve distinct useful approaches or objectives instead of
   all converging on one city;
8. a Captain selects a multi-unit Rally or Tend result over a weaker attack,
   and a badly wounded unit recovers or stages for Windmill healing when that
   dominates attacking;
9. a Catapult keeps legal range and a reachable screen, a Guard holds, and a
   Knight or Raider uses a legal flank/capture opening;
10. threatened-city training does not displace or delete a healthy fortified
    Guard for a Fighter when the projected defense worsens;
11. one city spends at most one action and chooses the best public result among
    land training, all assigned naval docks, and Land Grant; and
12. Roads follow and complete an at-most-eight-missing-tile useful corridor,
    while a legal isolated/scattered Road loses to End Turn or another useful
    action.

Each fixture records the public facts that make its expectation true and a
counter-variant that removes the decisive fact where practical. No assertion
may special-case a coordinate, generated unit ID, or candidate ordinal.

### 8.2 Controlled same-rules comparison

After the revision-11 runtime rules are complete but before heuristic changes,
freeze the minimally adapted production policy as the validation baseline. The
adaptation may consume revision-11 public queries and previews and make the
existing selector legal under the new schemas; it receives no new tactical,
Road, city-action, or economy judgment. Record its source revision and content
hash with the comparison evidence. Both policies use the exact same
revision-11 engine, maps, starting states, visible information, command cap,
scheduler budget, and deterministic tie-break domain. This compares policy
quality under one ruleset, not revision-10 balance against revision 11.

Before viewing revised-policy results, freeze these 12 two-player Rival setups
at 14 x 14:

| Map type      | Seeds                    |
| ------------- | ------------------------ |
| `DRY_LAND`    | `7111, 7112, 7113, 7114` |
| `CONTINENTS`  | `7211, 7212, 7213, 7214` |
| `ARCHIPELAGO` | `7311, 7312, 7313, 7314` |

Run each setup twice, swapping revised and baseline controller seats for 24
bounded head-to-head games. Each game has a 200-round cap, 30,000 accepted
commands per match, 128 accepted commands per owner turn, and a 300-second
wall-clock safety cap. Classify every termination as outcome, round cap,
accepted-command cap, wall cap, or structured failure; never omit or silently
replace a capped seed. The revised policy must win more games than the baseline,
win at least 14 of 24, and have no structured policy failure, rejection,
non-advancing acceptance, or command-cap termination. Report wins, losses,
draws/caps, rounds, commands, cities captured/lost, actual threatened city
saves, capture conversions, low-value suicidal attacks, support actions,
recovery, and Road connections for both policies.

This paired result is the finite material-improvement gate. If it fails, tune
the general public heuristics or revise this contract with reviewed evidence;
do not choose favorable replacement seeds or encode the losing positions.

### 8.3 Bounded natural-game matrix

Run revised-policy seeds `0` and `6173` in each of the 1-, 2-, and 3-AI Rival
and Cooperative cells: six cells and 12 games total. Every computer-controlled
seat uses the revised policy. Use the current default `CONTINENTS` map type,
legal Auto board sizes, and the same 200-round, 30,000 accepted-command,
128-command-per-owner-turn, and 300-second wall-clock caps as the paired corpus.
Classify every termination without dropping a capped run. Report setup, seed,
outcome, termination reason, rounds, accepted commands, maximum commands in one
owner turn, scheduler work/slices, captures, losses, research, each city action
kind, Windmill heals, Roads built/connections completed, Market and trade
income, support/recovery, and the tactical metrics from the paired comparison.

Every revised-policy game must finish or reach its declared round cap without
error, stall, rejected selected command, hidden-state access, command-cap
termination, or scheduler-budget violation. Cooperative games retain zero
AI-on-AI hostile commands, casualties, capture, allied-territory path steps,
and hidden allied-content inference. Report capped games honestly; neither a
cap nor deterministic replay counts as a win or proof of strength.

## 9. Implementation and release traceability

Implementation evidence must cover these bounded groups:

| Contract area    | Required deterministic evidence                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| identity/schema  | exact r11 dispatch; r10 rejection; numeric-v7 round trip; current-key cleanup only through r10; preserved v6/settings/history                                                  |
| city action      | shared land/naval/Land Grant spend; all docks; rejection atomicity; Start Turn reset; capture delay; reward exemption; owner-only view; save/replay/hash                       |
| Windmill healing | eight neighbors; center exclusion; every form; ownership; zero-output source; overlap assignment; cap; source/result order; projection; ordinary recovery/Tend composition     |
| Roads/Commerce   | land-only graph; neutral/owned Roads; original-capital loss/recapture; immediate reversible two-end population; no duplicates; 1-Coin trade; exact Market 1–4/2–8; siege/floor |
| technology       | Drill Ore visibility and fog safety; Engineering retained gates; Raiding Pillage for all seven roles; no Explosives Pillage; Blast Mountain Ore rejection                      |
| presentation     | city-action status; exact tech/help/income text; coalesced healing animation; reduced motion/Fast Forward parity                                                               |
| art              | exactly two accepted sources with complete receipts; measured Port growth; Port/Shipyard distinction; readable five-to-seven-fish shoal; native/enlarged/context review        |
| AI correctness   | public-view invariance; cold/sliced/save parity; 128-command and scheduler bounds; legal commands; no general deep search                                                      |
| AI usefulness    | all semantic scenarios; frozen 24-game swapped same-rules comparison; 12 revised-policy natural games; complete metrics and honest caps                                        |

Revision-11 release evidence adds focused engine, presentation, asset, AI,
headless, save/replay, and browser checks to the inherited release profile. It
must not refresh frozen historical corpora to imply revision-11 behavior.
