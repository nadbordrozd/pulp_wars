# Pulp Wars Ruleset 7

**Status:** authoritative new-match contract; implementation may follow this
document, but this document does not claim that implementation is complete

**Ruleset ID:** `pulp-wars-poc-7`

**Design history:**
[Original technology-tree redesign proposal](ORIGINAL_TECH_TREE_REDESIGN_PROPOSAL.md)

**Compatibility contract:** [Pulp Wars Ruleset 6](RULESET_6.md)

**Related contracts:** [client architecture](../architecture/CLIENT_ARCHITECTURE.md),
[headless simulation](../architecture/HEADLESS_SIMULATION.md),
[Normal AI](../architecture/NORMAL_AI.md),
[screen flow](../ui/SCREEN_FLOW.md), and
[art direction](../art/ART_DIRECTION.md)

Ruleset 7 is the approved Original-faction implementation baseline. It freezes
the reviewed 25-node technology graph, revised mountain economy, 13-role
Original roster, and the Pursuit, Defection, Concealment, and Blackout state
machines. The proposal remains design history; alternatives and review
questions in it are not normative.

Ruleset 7 does not alter Ruleset 6. Candy remains fully playable only in the
frozen Ruleset-6 route until it receives its own separately approved Ruleset-7
registration. A v7 parser never substitutes Original rules, labels, or art for
Candy.

## 1. Version, routing, compatibility, and frozen order

### 1.1 Version identifiers

New v7 data uses these exact identifiers:

| Boundary              | Exact value                    |
| --------------------- | ------------------------------ |
| Ruleset               | `pulp-wars-poc-7`              |
| Game-state schema     | `7`                            |
| Command envelope      | `pulp-wars-command`, `7`       |
| Canonical event batch | `pulp-wars-events`, `7`        |
| Player event batch    | `pulp-wars-player-events`, `7` |
| Save envelope         | `pulp-wars-save`, `7`          |
| Browser autosave      | `pulpWars.save.v7.current`     |
| Replay file           | `pulp-wars-replay`, `7`        |
| Map revision          | `SPATIAL_ECONOMY`              |
| Faction               | `ORIGINAL`                     |
| Faction tree          | `ORIGINAL_BASELINE_V2`         |

Game state, setup, command/event envelopes, saves, and replays are strict exact-
key schemas. Unknown fields, sparse arrays, unsafe integers, wrong versions,
wrong ruleset IDs, and missing required fields reject atomically. Half-point
stats use integer half-units. Canonical JSON, SHA-256 state hashes, Mulberry32
version 1, uint32 seeds, immutable rules data, monotonic positive entity IDs,
and round-half-up rational arithmetic remain the shared kernel contracts.

Versions 1 through 6 are recognized as incompatible by v7 save/replay readers,
preserved byte-for-byte, and never migrated or replayed under v7. Ruleset-6
readers remain available and continue to read v6 only. The one historical v6
save normalization for a missing `treasureChests` field remains confined to the
v6 loader and is not copied into v7.

### 1.2 Browser and headless routing

- The normal browser entry and `?ruleset=7` launch Ruleset 7.
- Exact query `?ruleset=6` launches the existing Ruleset-6 browser, including
  Original/Candy setup and v6 save resume. It is a supported compatibility
  route, not a development-only flag.
- Any other nonempty `ruleset` value shows an unsupported-ruleset error and
  creates no match. It never falls back to v7 or v6.
- Ruleset 7 reads, writes, resumes, replaces, restarts, and deletes only the
  `pulpWars.save.v7.current` autosave key. Ruleset 6 continues to own and use
  its unchanged historical `pulpWars.save.current` key.
- Both autosaves may coexist. A route ignores the other version's key for Hub
  state and save lifecycle decisions. Switching between the normal/v7 route
  and exact `?ruleset=6` route never prompts deletion or replacement of the
  other version's save. Starting a new match may offer Replace only when that
  route's own autosave exists; explicit Delete or Restart affects only that
  same route's key.
- Headless match/batch requires `--ruleset pulp-wars-poc-7` for v7. Replay
  dispatch selects only by the exact parsed envelope version. Unknown or
  mismatched identifiers reject rather than falling back.

Settings remain shared in `pulpWars.settings.v1`; save storage does not.
Version selection and route-owned key selection occur before ruleset-specific
state parsing.

### 1.3 Frozen identifier orders

These arrays define serialization, canonical iteration, UI order, AI tie-breaks,
and content ordinals.

`FactionId`: `ORIGINAL`.

`FactionTreeId`: `ORIGINAL_BASELINE_V2`.

`TerrainId`: `GRASS`, `FOREST`, `MOUNTAIN`.

`ResourceId`: `FRUIT`, `GAME`, `FERTILE_GROUND`, `ORE`, `STONE`.

`ImprovementId`: `FARM`, `LUMBER_CAMP`, `MINE`, `QUARRY`, `WINDMILL`,
`SAWMILL`, `FORGE`, `STONEWORKS`, `WORKSHOP`, `GRAND_WORKS`, `MARKET`,
`BARRACKS`. `ROAD` remains a separate boolean infrastructure layer.

`UnitRoleId`:

1. `FIGHTER`
2. `SCOUT`
3. `ENVOY`
4. `MARKSMAN`
5. `GUARD`
6. `RAIDER`
7. `MEDIC`
8. `CATAPULT`
9. `SABOTEUR`
10. `HEAVY`
11. `LANCER`
12. `BREACHER`
13. `JUGGERNAUT`

`TechnologyId`:

1. `GATHERING`
2. `FARMING`
3. `MILLING`
4. `CRAFT`
5. `GRAND_WORKS`
6. `HUNTING`
7. `FORESTRY`
8. `SAWMILLING`
9. `MARKSMANSHIP`
10. `FIELDCRAFT`
11. `SURVEYING`
12. `MINING`
13. `METALLURGY`
14. `QUARRYING`
15. `MASONRY`
16. `SCOUTING`
17. `ROADS`
18. `COMMERCE`
19. `RAIDING`
20. `MANEUVER`
21. `DRILL`
22. `FORTIFICATION`
23. `EXPLOSIVES`
24. `MEDICINE`
25. `RECOVERY`

`CommandKind`:

1. `MOVE`
2. `PURSUE`
3. `ATTACK`
4. `OFFER_DEFECTION`
5. `BLACKOUT_CITY`
6. `HEAL_ADJACENT`
7. `RECOVER`
8. `CAPTURE`
9. `PROMOTE`
10. `PILLAGE`
11. `DISBAND`
12. `END_PURSUIT`
13. `WAIT`
14. `RESEARCH`
15. `HARVEST_FRUIT`
16. `HUNT_GAME`
17. `BUILD_FARM`
18. `BUILD_LUMBER_CAMP`
19. `BUILD_MINE`
20. `BUILD_QUARRY`
21. `BUILD_WINDMILL`
22. `BUILD_SAWMILL`
23. `BUILD_FORGE`
24. `BUILD_STONEWORKS`
25. `BUILD_WORKSHOP`
26. `BUILD_GRAND_WORKS`
27. `BUILD_MARKET`
28. `BUILD_BARRACKS`
29. `CLEAR_FOREST`
30. `REPLANT_FOREST`
31. `BUILD_ROAD`
32. `REDEVELOP`
33. `TRAIN`
34. `CHOOSE_CITY_REWARD`
35. `END_TURN`

`RewardId`: `SURVEY`, `STOCKPILE`, `WALLS`, `MILITIA`, `EXPAND`, `BOOM`,
`JUGGERNAUT`, `TREASURY`.

`DomainEventKind`: `TURN_STARTED`, `INCOME_AWARDED`, `INCOME_PREVIEWED`,
`TURN_ENDED`, `TECH_RESEARCHED`, `FRUIT_HARVESTED`, `GAME_HUNTED`,
`ECONOMIC_BUILDING_BUILT`, `ECONOMIC_BUILDING_REMOVED`, `FOREST_CLEARED`,
`FOREST_REPLANTED`, `ROAD_BUILT`, `CITY_ECONOMY_CHANGED`, `CITY_LEVELED_UP`,
`CITY_REWARD_QUEUED`, `CITY_REWARD_CHOSEN`, `CITY_TERRITORY_EXPANDED`,
`UNIT_TRAINED`, `UNIT_REWARD_GRANTED`, `UNIT_HEALED`, `UNIT_PUSHED`,
`UNIT_MOVED`, `UNIT_PURSUED`, `UNIT_MOVE_INTERRUPTED`, `TILES_REVEALED`,
`COMBAT_RESOLVED`, `PURSUIT_OPENED`, `PURSUIT_ENDED`, `DEFECTION_OFFERED`,
`DEFECTION_ARMED`, `DEFECTION_CANCELLED`, `DEFECTION_RESOLVED`,
`SABOTEUR_EXPOSED`, `BLACKOUT_PLANTED`, `BLACKOUT_ACTIVATED`,
`BLACKOUT_RECOVERY_STARTED`, `BLACKOUT_RECOVERY_COMPLETED`,
`IMPROVEMENT_PILLAGED`, `UNIT_DISBANDED`, `SPOILS_AWARDED`, `UNIT_RECOVERED`,
`UNIT_WAITED`, `UNIT_PROMOTED`, `UNIT_DIED`, `CITY_CAPTURED`,
`TREASURE_CAPTURED`, `PLAYER_ELIMINATED`, `MATCH_ENDED`.

`PlayerEventKind` uses that same order for retained projected facts, followed by
projection-only `UNIT_REVEALED`, `UNIT_CONCEALED`, and
`DEFECTION_ENDPOINT_STATUS`. Projection preserves canonical relative order and
inserts a reveal immediately before the first fact that makes the entity
public.

`CardinalDirection`: `NORTH`, `EAST`, `SOUTH`, `WEST` (retained for canonical
geometry even though v7 has no cardinal-direction command).

`PursuitPhase`: `NONE`, `PURSUIT_READY`, `PURSUIT_MOVED`.

`DefectionPhase`: `WAITING_FOR_REPLY`, `ARMED`.

`BlackoutPhase`: `PENDING`, `ACTIVE`, `RECOVERY`.

Commands sort by command-kind order, target `(y,x)`, acting entity ID, then
referenced content ordinal. Paths compare lexicographically by their `(y,x)`
coordinate sequence after their destination. IDs and coordinate arrays sort
ascending and `(y,x)` respectively unless an exact section below says
otherwise.

For query ordering, target is tile `at`, Move/Pursue destination, target
unit/city's current coordinate, or `(-1,-1)` when none. Acting entity is unit,
then city, then zero. Referenced content is Technology order, UnitRole order,
Reward order, target entity ID, and (for equal Defection targets) home-city ID;
otherwise zero. This ordering is derived from public view only.

## 2. Match setup, map generation, players, and turns

### 2.1 Exact setup

```ts
interface MatchSetupV7 {
  readonly rulesetId: "pulp-wars-poc-7";
  readonly seed: number; // uint32
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: "CORAL" | "TEAL" | "GOLD" | "VIOLET";
  readonly factions: readonly "ORIGINAL"[];
  readonly mapGenerationRevision: "SPATIAL_ECONOMY";
}
```

Width equals height. The `factions` dense array length is exactly
`aiCount + 1`, in seat-assignment order, and every item is `ORIGINAL`. `CANDY`,
an omitted factions array, a scenario field, or any other extra field is
`INVALID_SETUP`. Minimum width is 11/14/16 for 1/2/3 AI. Explicit 20 and 25 are
legal for every AI count. Auto resolves only to 11/14/16.

The product remains a local, client-only, one-human Conquest match against one
to three equal-rules Normal AI seats in Rival or Cooperative mode. It has no
server, accounts, online multiplayer, naval/air layer, score/timed victory,
upkeep, inventories, resource stockpiles, undo, or live re-fog.

### 2.2 Exact map parity

V7 calls the unchanged Ruleset-6 `SPATIAL_ECONOMY` generator. It does not add,
remove, or reorder a PRNG draw. For otherwise equal all-Original resolved
setups, replacing only ruleset/schema identifiers yields byte-identical board,
settlements, seat/capital assignment, turn order, resources, treasure
coordinates, and post-generation Mulberry32 state.

| Setup            | Board | Neutral villages | Total settlements |
| ---------------- | ----: | ---------------: | ----------------: |
| 1 AI Auto/Tiny   |    11 |                3 |                 5 |
| 2 AI Auto/Small  |    14 |                4 |                 7 |
| 3 AI Auto/Normal |    16 |                6 |                10 |
| 1/2/3 AI Large   |    20 |         13/12/11 |                15 |
| 1/2/3 AI Huge    |    25 |         20/19/18 |                22 |

Mountain is 18% and Forest 24%, rounded half up: 22/29 on 11, 35/47 on 14,
46/61 on 16, 72/96 on 20, and 113/150 on 25. Settlements are empty Grass, at
least two cells from an edge and Chebyshev distance 3 apart; capitals are at
least `floor(width/2)` apart, have at least four non-Mountain neighbors, and
share one eight-way Grass/Forest component. Attempt 256 fails without relaxing
a constraint.

Each non-settlement coordinate consumes one uint32 resource draw in `(y,x)`:

| Terrain  | Draw interval                  | Resource       |
| -------- | ------------------------------ | -------------- |
| Grass    | `u < 0x20000000`               | Fruit          |
| Grass    | `0x20000000 <= u < 0x80000000` | Fertile Ground |
| Grass    | otherwise                      | none           |
| Forest   | `u < 0x50000000`               | Game           |
| Forest   | otherwise                      | none           |
| Mountain | `u < 0x30000000`               | Ore            |
| Mountain | `0x30000000 <= u < 0x90000000` | Stone          |
| Mountain | otherwise                      | none           |

Every settlement must have at least three economic opportunities and two
families among its eight neighbors; every resource kind must occur globally.
Rejected candidates continue the same PRNG stream. After acceptance, the same
continued stream places 2 chests on 11/14/16, 4 on 20, and 5 on 25 by the
Ruleset-6 ordered sample-without-replacement algorithm. Chests are globally
public, nonblocking, and sorted `(y,x)`.

Chest candidates are `(y,x)`-ordered Grass/Forest cells in the eight-way land
component reachable from a capital, excluding settlements, Mountains,
resources, and improvements. Sample without replacement with one bounded draw
per placed chest. If fewer legal candidates exist, place only those candidates
without failing map generation.

An accepted ordinary Move onto a chest consumes the only post-setup gameplay
PRNG draw in v7: modulo 2 zero grants 5 Coins; one attempts a full-HP v7 Heavy
on the first legal adjacent `(y,x)` coordinate and assigns the mover's home
city first, then city ID, among cities with capacity. The Heavy is exhausted.
If placement or capacity fails, it grants 5 Coins. Successful placement reveals
normal Heavy sight immediately. Overflow rejects the complete Move without a
draw or chest removal. Pursue cannot enter a chest coordinate.

### 2.3 Players, relationships, victory, and turn sequence

All seats begin with 5 Coins, `GATHERING`, a level-1 capital, one full-HP
Original Fighter assigned to that capital, and radius-2 exploration. Initial
income is not prepaid. `round` starts at 1. Turn order is stored explicitly.

In Rival mode every different owner is hostile. In Cooperative mode the stored
`humanPlayerId` is hostile to every AI, every pair of non-human AI seats is
allied, and no other alliance exists. Allies share detection of Saboteurs but
do not share exploration, economy, technology, Roads, units, healing, capacity,
or commands. AI allies cannot attack, capture, enter assigned allied territory,
or build there. Human-versus-AI relationships remain hostile.

A round ends after every player active at its start has acted or been
eliminated. End Turn skips eliminated seats and increments `round` after the
last stored seat. A player is eliminated immediately on owning zero cities:
remove its units by ID, cancel its Defection marks/reservations, normalize city
Blackout records it owned or sourced as specified below, cancel its choices,
and skip future turns. Human-only survival is Victory; human elimination is
immediate Defeat attributed to the capturing player. Headless all-AI play ends
with the final active player. There is no draw or rules turn limit.

Start Turn has this exact transaction order:

1. set the incoming active seat and emit `TURN_STARTED`;
2. reset activation for units already owned by that player, set ordinary
   capture eligibility, and mark recovery-phase Blackout cities of that owner
   as having begun their required unaffected turn;
3. revalidate and resolve that player's `ARMED` Defection marks in ascending
   mark ID; converted units enter after reset and remain wholly exhausted;
4. apply successful-conversion sight and emit its reveal facts;
5. activate `PENDING` Blackouts on that player's cities in ascending city ID;
6. calculate city income after conversion siege and Blackout suppression,
   credit it in city-ID order, then emit `INCOME_AWARDED`.

End Turn is unavailable during a mandatory choice or open Pursuit. Its exact
order is:

1. auto-recover eligible idle units in unit-ID order;
2. arm surviving `WAITING_FOR_REPLY` Defections whose recorded target owner is
   ending this turn, in mark-ID order;
3. change `ACTIVE` Blackouts to `RECOVERY`; clear each `RECOVERY` whose owner
   completed the required unaffected Start-to-End turn;
4. clear timed Saboteur exposures anchored to this player's next End Turn;
5. emit `INCOME_PREVIEWED` for this player's next turn, then `TURN_ENDED`;
6. advance to the next seat and run the Start Turn transaction.

Pending choices delay End Turn and every dependent timer. Automatic boundaries
consume no PRNG and do not increment `commandIndex` independently of the
accepted `END_TURN` command.

## 3. Authoritative state and invariants

The v7 state contains the v6 board/player/city/population/unit/reward fields,
with the exact replacements below. It has no Candy or Chocolate-Wall state.

```ts
interface GameStateV7 {
  readonly schemaVersion: 7;
  readonly rulesetId: "pulp-wars-poc-7";
  readonly setup: MatchSetupV7;
  readonly random: {
    readonly algorithm: "MULBERRY32";
    readonly version: 1;
    readonly state: number;
  };
  readonly humanPlayerId: PlayerId;
  readonly nextEntityId: number;
  readonly commandIndex: number;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly board: BoardStateV7;
  readonly players: readonly PlayerStateV7[];
  readonly cities: readonly CityStateV7[];
  readonly populationContributions: readonly PopulationContributionV7[];
  readonly units: readonly UnitStateV7[];
  readonly treasureChests: readonly Coord[];
  readonly defectionMarks: readonly DefectionMarkV7[];
  readonly saboteurExposures: readonly SaboteurExposureV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

interface PlayerStateV7 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: "CORAL" | "TEAL" | "GOLD" | "VIOLET";
  readonly faction: "ORIGINAL";
  readonly factionTreeId: "ORIGINAL_BASELINE_V2";
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly coins: number;
  readonly researchedTechs: readonly TechnologyId[];
  readonly explored: readonly Coord[];
  readonly spoilsClaimedCityIds: readonly CityId[];
}

interface TileStateV7 {
  readonly at: Coord;
  readonly terrain: "GRASS" | "FOREST" | "MOUNTAIN";
  readonly resource: ResourceId | null;
  readonly improvement: ImprovementId | null;
  readonly road: boolean;
  readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryCityId: CityId | null;
}

interface BoardStateV7 {
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly tiles: readonly TileStateV7[]; // complete row-major (y,x)
}

interface UnitActivationV7 {
  readonly moved: boolean;
  readonly movedPathLength: number;
  readonly attacked: boolean;
  readonly attacksUsed: 0 | 1 | 2 | 3;
  readonly pursuitPhase: "NONE" | "PURSUIT_READY" | "PURSUIT_MOVED";
  readonly healed: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly specialActed: boolean;
}

interface UnitStateV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  readonly role: UnitRoleId;
  readonly at: Coord;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivationV7;
  readonly blackoutEligibleRound: number | null;
}

type CityBlackoutV7 =
  | {
      readonly phase: "PENDING";
      readonly sourceUnitId: UnitId;
      readonly sourceOwnerId: PlayerId;
      readonly plantedRound: number;
    }
  | {
      readonly phase: "ACTIVE";
      readonly sourceOwnerId: PlayerId;
      readonly suppressedCoins: number;
    }
  | {
      readonly phase: "RECOVERY";
      readonly recoveryOwnerId: PlayerId;
      readonly unaffectedTurnStarted: boolean;
    };

interface CityStateV7 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: Coord;
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number;
  readonly isCapital: boolean;
  readonly expanded: boolean;
  readonly rewards: readonly {
    readonly reachedLevel: number;
    readonly reward: RewardId;
  }[];
  readonly blackout: CityBlackoutV7 | null;
}

interface DefectionMarkV7 {
  readonly id: number;
  readonly sourceUnitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly initiatingPlayerId: PlayerId;
  readonly recordedTargetOwnerId: PlayerId;
  readonly reservedHomeCityId: CityId;
  readonly offeredAtCommandIndex: number;
  readonly phase: "WAITING_FOR_REPLY" | "ARMED";
}

interface SaboteurExposureV7 {
  readonly unitId: UnitId;
  readonly anchorPlayerId: PlayerId;
  readonly reason: "ATTACK" | "BLACKOUT";
  readonly clearsAtAnchorNextEndTurn: true;
}

type PopulationContributionV7 = {
  readonly id: number;
  readonly cityId: CityId;
  readonly category: "PERMANENT" | "LIVE";
  readonly amount: number;
  readonly source:
    | {
        readonly kind: "RESOURCE_ACTION";
        readonly action: "HARVEST_FRUIT" | "HUNT_GAME";
        readonly at: Coord;
      }
    | {
        readonly kind: "IMPROVEMENT";
        readonly improvement: ImprovementId;
        readonly at: Coord;
      }
    | {
        readonly kind: "CITY_REWARD";
        readonly reward: "BOOM";
        readonly reachedLevel: 4;
        readonly at: Coord;
      };
};

type PendingChoiceV7 = {
  readonly kind: "CITY_REWARD";
  readonly cityId: CityId;
  readonly reachedLevel: number;
  readonly candidates: readonly RewardId[];
};

type MatchOutcomeV7 =
  | { readonly kind: "VICTORY"; readonly winnerId: PlayerId }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
    }
  | { readonly kind: "HEADLESS_VICTORY"; readonly winnerId: PlayerId };
```

`blackoutEligibleRound` is a positive safe integer only for a Saboteur and is
`null` for every other role. A trained/rewarded Saboteur starts with value 1.
Defection visibility is derived from its live mark and is not duplicated in
`saboteurExposures`. Exposure keys `(unitId, anchorPlayerId)` are unique; a new
exposure replaces the reason and extends, never shortens, the same boundary.
Removing the Saboteur or eliminating the anchor player clears the record
immediately.

All entity arrays use unique monotonic IDs and canonical order. Units/walls do
not share cells because v7 contains units only. Every coordinate is on-board;
every home/territory/contribution/mark reference resolves; role-specific state
matches its role; all mark endpoints are different living units at parse time;
all exposure records name a living Saboteur and active anchor player.
Only population-producing resources/improvements and Boom create population
contribution records; Market and Barracks never create zero-valued records.

Defection capacity is an ordered entitlement rather than a numeric slot field.
For each city, living assigned units consume capacity first; surviving marks
then reserve remaining capacity in ascending mark ID. A mark whose turn is not
covered is cancelled. New offers append after existing marks. This rule runs
after every capacity/ownership/unit-count mutation. Training requires
`living assigned + reservations < capacity`. Reward units may exceed capacity
and therefore can invalidate later reservations; cancelled reservations never
revive automatically.

## 4. Cities, population, territory, capacity, and rewards

For level `L`:

```text
growthSpent(L) = L * (L + 1) / 2 - 1
population = permanentPopulation + economicPopulation - growthSpent(level)
next threshold = L + 1
capacity = L + 1 + (live owned Barracks ? 1 : 0)
```

All arithmetic is safe-integer, preflighted, and atomic. Positive changes level
repeatedly while progress meets the next threshold. Negative live change may
make population negative but never reduces level, reward history, or base
capacity. At Start Turn a non-besieged city produces:

```text
base = level + (isCapital ? 1 : 0)
market = current Market output
negative = min(0, population)
preBlackout = max(0, base + market + negative)
blackoutLoss = ACTIVE ? min(3, preBlackout) : 0
income = preBlackout - blackoutLoss
```

An enemy on the city center besieges it: zero income, no training, and no
economic construction. Existing mandatory rewards remain resolvable. A unit
must occupy a neutral village or hostile city until its owner's next Start
Turn before Capture. Capture transfers city and assigned tiles, preserves
level/economy/rewards/Barracks/Roads, re-homes the capturer, orphans other units
formerly assigned to the captured city, clears capturer eligibility, and then
checks elimination.

Each city begins with neutral cells in its centered 3 x 3 footprint. Level-4
Expand permanently claims neutral cells in its centered 5 x 5, preserves cells
assigned to other cities, and reveals every newly claimed cell. Capture
transfers the exact current footprint. A tile belongs to at most one city.

Rewards remain mandatory and ordered:

| Reached level | Choice A                        | Choice B                      |
| ------------: | ------------------------------- | ----------------------------- |
|             2 | Survey: reveal radius 3         | Stockpile: +4 Coins           |
|             3 | Walls: 4x city defense          | Militia: free Fighter         |
|             4 | Expand: neutral 5 x 5 footprint | Boom: +3 permanent population |
|            5+ | Juggernaut reward unit          | Treasury: +5 Coins            |

New rewards append in city-ID/reached-level order. Only the queue head may
resolve. Boom-generated rewards insert before later work. Militia/Juggernaut
uses empty center, then owned traversable city tiles by distance and `(y,x)`;
otherwise that arm is unavailable. Reward units are full-health, assigned,
exhausted, and may overfill capacity. A pending Blackout does not block a
reward; a reward-created unit can cancel an uncovered Defection reservation
under the entitlement rule.

## 5. Technology and economy

### 5.1 Research model and complete graph

Every player begins with `GATHERING`. Research is permanent, free-ordered among
available nodes, consumes Coins but no unit/city action, and consumes no PRNG.
Cost uses current owned-city count `C >= 1`:

```text
tier 1 = 5 + (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

| Ord | Branch     | Tier | ID            | Requires        | Exact unlocks                                                             |
| --: | ---------- | ---: | ------------- | --------------- | ------------------------------------------------------------------------- |
|   0 | Settlement |    1 | Gathering     | —; starts known | Fruit/Fertile reveal; Harvest Fruit                                       |
|   1 | Settlement |    2 | Farming       | Gathering       | Farm; connected-field visuals                                             |
|   2 | Settlement |    3 | Milling       | Farming         | Windmill                                                                  |
|   3 | Settlement |    2 | Craft         | Gathering       | Workshop; Envoy                                                           |
|   4 | Settlement |    3 | Grand Works   | Craft           | Grand Works; Redevelop                                                    |
|   5 | Wilds      |    1 | Hunting       | —               | Hunt visible Game                                                         |
|   6 | Wilds      |    2 | Forestry      | Hunting         | Lumber Camp; Clear Forest                                                 |
|   7 | Wilds      |    3 | Sawmilling    | Forestry        | Sawmill; Catapult                                                         |
|   8 | Wilds      |    2 | Marksmanship  | Hunting         | Marksman                                                                  |
|   9 | Wilds      |    3 | Fieldcraft    | Marksmanship    | Replant Forest; Saboteur; Scout/Marksman Forest freedom; Marksman sight 2 |
|  10 | Industry   |    1 | Surveying     | —               | Mountain entry; Ore/Stone reveal; Mountain sight +1                       |
|  11 | Industry   |    2 | Mining        | Surveying       | Mine                                                                      |
|  12 | Industry   |    3 | Metallurgy    | Mining          | Forge; Heavy                                                              |
|  13 | Industry   |    2 | Quarrying     | Surveying       | Quarry; Barracks                                                          |
|  14 | Industry   |    3 | Masonry       | Quarrying       | Stoneworks                                                                |
|  15 | Mobility   |    1 | Scouting      | —               | Scout; sight 2; Scout detection radius 2                                  |
|  16 | Mobility   |    2 | Roads         | Scouting        | Road                                                                      |
|  17 | Mobility   |    3 | Commerce      | Roads           | Market; capital-Road bonus                                                |
|  18 | Mobility   |    2 | Raiding       | Scouting        | Raider; Charge                                                            |
|  19 | Mobility   |    3 | Maneuver      | Raiding         | Lancer; Scout/Raider/Lancer ignore hostile ZOC                            |
|  20 | Warfare    |    1 | Drill         | —               | Guard; first-capture Spoils                                               |
|  21 | Warfare    |    2 | Fortification | Drill           | Fighter/Guard 2x defense in unwalled friendly city                        |
|  22 | Warfare    |    3 | Explosives    | Fortification   | Breacher; Pillage                                                         |
|  23 | Warfare    |    2 | Medicine      | Drill           | Medic; Heal 4                                                             |
|  24 | Warfare    |    3 | Recovery      | Medicine        | Heal 6; idle friendly recovery 6; Disband                                 |

The graph is exactly five roots, ten tier-2 nodes, and ten tier-3 nodes:

```text
Gathering (start)
├── Farming ───── Milling
└── Craft ─────── Grand Works

Hunting
├── Forestry ──── Sawmilling
└── Marksmanship ─ Fieldcraft

Surveying
├── Mining ────── Metallurgy
└── Quarrying ─── Masonry

Scouting
├── Roads ─────── Commerce
└── Raiding ───── Maneuver

Drill
├── Fortification ─ Explosives
└── Medicine ───── Recovery
```

Every non-root has exactly one prerequisite. There are no cross-branch hidden
requirements or faction fallback nodes.

### 5.2 Resources, visibility, and basic actions

Game is visible from match start on every explored Forest; Hunting gates use,
not visibility. Fruit and Fertile Ground reveal with starting Gathering. Ore
and Stone require Surveying. An explored gated Grass/Mountain tile projects
`UNKNOWN_RESOURCE`, identically for hidden presence and hidden absence.

Tile economy requires an explored tile assigned to an owned non-besieged city
without a pending reward for that city. A unit is not required and does not
block the action. Roads coexist and do not change validity.

| Action            | Tech      | Exact target                    | Cost | Result                                     |
| ----------------- | --------- | ------------------------------- | ---: | ------------------------------------------ |
| Harvest Fruit     | Gathering | Grass + Fruit                   |    2 | consume resource; +1 permanent population  |
| Hunt Game         | Hunting   | Forest + Game                   |    2 | consume resource; +1 permanent population  |
| Build Farm        | Farming   | Grass + Fertile Ground          |    5 | consume marker; Farm; +2 live population   |
| Build Lumber Camp | Forestry  | Forest, no resource/improvement |    3 | Forest remains; +1 live population         |
| Build Mine        | Mining    | Mountain + Ore                  |    6 | consume marker; Mine; +4 live population   |
| Build Quarry      | Quarrying | Mountain + Stone                |    5 | consume marker; Quarry; +3 live population |

Clear Forest requires Forestry, costs zero, targets owned explored Forest with
no site/resource/improvement, preserves Road, converts it to Grass, and grants
1 Coin. Replant requires Fieldcraft, costs 4, targets equivalent empty Grass,
preserves Road, converts it to Forest, and grants no population.

### 5.3 Processors, mixed buildings, Market, and Barracks

Adjacent means all eight Chebyshev neighbors. Connected Farm/Camp clusters use
four orthogonal edges. Specialized processors count only same-city basic
improvements. Workshop, Grand Works, and Market count an adjacent improvement
owned by the same player even across city borders; cooperative allies are not
friendly contributors.

| Improvement | Cost | Placement/limit                                    | Exact live output                                                                                                                  |
| ----------- | ---: | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Windmill    |    5 | one/city; touches Farm                             | +1 per Farm in touching orthogonally connected same-city cluster; cap 8                                                            |
| Sawmill     |    5 | one/city; touches Lumber Camp                      | +1 per Camp in touching orthogonally connected same-city cluster; cap 8                                                            |
| Forge       |    6 | one/city                                           | +3 per adjacent same-city Mine; cap 18                                                                                             |
| Stoneworks  |    6 | one/city                                           | +2 per adjacent same-city Quarry plus +2 per complete N/S, E/W, NE/SW, or NW/SE pair; cap 16                                       |
| Workshop    |    4 | one/city; at least two adjacent basic types        | +1 per distinct Farm/Camp/Mine/Quarry type; 2–4                                                                                    |
| Grand Works |    7 | one/city; at least three adjacent processor types  | +2 per distinct Windmill/Sawmill/Forge/Stoneworks type; 6 or 8                                                                     |
| Market      |    7 | one/city; at least two adjacent families           | +1 recurring Coin for each Agriculture/Timber/Metal/Stone family, plus 1 when adjacent to a capital-connected friendly Road; cap 5 |
| Barracks    |    6 | one/city; empty owned tile adjacent to city center | +1 unit capacity; no population or Coins                                                                                           |

All listed buildings target an owned, explored, non-site tile with no resource
or improvement in a non-besieged city without a pending city reward. Except for
Barracks' city-center adjacency and the listed contribution requirements, the
underlying terrain may be Grass, Forest, or Mountain and is preserved. Road is
preserved. Barracks is an improvement for occupancy, destruction, capture,
serialization, selection, and Redevelop, but not an economic-population or
Market family contributor.

`REDEVELOP` requires Grand Works and removes any owned improvement, including
Barracks, without cost/refund/resource restoration. `BUILD_ROAD` requires Roads,
costs 2, targets an explored owned non-settlement tile without Road, and may
coexist with any resource/improvement/unit. Road components and discounts use
orthogonal edges only; Market adjacency remains eight-way.

A Road component is capital-connected when every tile is controlled by one
player and at least one Road tile is orthogonally adjacent to that player's
capital. Capture recomputes it immediately.

### 5.4 Conflict economy and capacity

- **Spoils:** with Drill, the first hostile Capture of each city by a given
  player grants exactly 2 Coins. Neutral villages grant zero. The city ID is
  appended once to that player's sorted `spoilsClaimedCityIds`; later recapture
  by that player grants zero. Overflow preflight occurs before Capture mutation.
- **Pillage:** with Explosives, any trainable or reward unit standing on an
  improvement in hostile territory may destroy it and gain 1 Coin. It may
  follow ordinary Move but not Attack, Heal, Recover, Capture, another special,
  or Pursuit. It is terminal. It never targets Roads, terrain, resources, city
  centers, or Walls. Barracks destruction immediately recomputes capacity and
  reservations.
- **Disband:** with Recovery, an owned trainable role may remove itself for
  `floor(trainingCost / 2)` Coins. It may follow ordinary Move but not another
  primary action or Pursuit and is terminal. Juggernaut has no refund and may
  not Disband. Converted trainable units use their v7 role cost. Removal frees
  home-city capacity before reservation revalidation.
- **Barracks:** one live owned Barracks raises only its city's capacity by 1.
  Losing it may leave a legal over-capacity city; no unit is destroyed and
  training remains disabled until usage plus reservations is below capacity.

After build, removal, capture, territory transfer, or destruction, recompute
affected city live economy from the final graph in city-ID order, then resolve
levels in city-ID/reached-level order. Building/destruction/capture facts emit
first, then `CITY_ECONOMY_CHANGED`, then each `CITY_LEVELED_UP` immediately
followed by `CITY_REWARD_QUEUED`. Capacity-reservation cancellation facts emit
after the mutation fact and before economy/level facts.

## 6. Original roster, movement, combat, and lifecycle

### 6.1 Frozen role rules

Stats are base values; no technology silently mutates a numeric role stat.

| Role       | Unlock       | Cost |  HP | Attack | Defense | Move | Range | Min range | Move then primary? |
| ---------- | ------------ | ---: | --: | -----: | ------: | ---: | ----: | --------: | ------------------ |
| Fighter    | Start        |    2 |  10 |      2 |       2 |    1 |     1 |         1 | Yes                |
| Scout      | Scouting     |    4 |  10 |    1.5 |       1 |    2 |     1 |         1 | Yes                |
| Envoy      | Craft        |    6 |   7 |      0 |     0.5 |    1 |     2 |         1 | Defection only     |
| Marksman   | Marksmanship |    3 |  10 |      2 |       1 |    1 |     2 |         1 | Yes                |
| Guard      | Drill        |    3 |  15 |    1.5 |       3 |    1 |     1 |         1 | No                 |
| Raider     | Raiding      |    4 |  10 |      2 |       1 |    2 |     1 |         1 | Yes                |
| Medic      | Medicine     |    4 |  10 |    0.5 |     1.5 |    1 |     1 |         1 | Yes                |
| Catapult   | Sawmilling   |    8 |  10 |    3.5 |     0.5 |    1 |     3 |         2 | No                 |
| Saboteur   | Fieldcraft   |    7 |  10 |      2 |       1 |    2 |     1 |         1 | Yes                |
| Heavy      | Metallurgy   |    7 |  20 |    3.5 |     3.5 |    1 |     1 |         1 | Yes                |
| Lancer     | Maneuver     |    9 |  12 |      3 |     1.5 |    3 |     1 |         1 | Yes                |
| Breacher   | Explosives   |    6 |  10 |      4 |       1 |    1 |     1 |         1 | No                 |
| Juggernaut | Reward only  |    — |  40 |      4 |       4 |    1 |     1 |         1 | Yes                |

Exactly 12 roles are trainable, including baseline Fighter; exactly five
tier-3 roles are trainable: Catapult, Saboteur, Heavy, Lancer, and Breacher.
Juggernaut is reward-only.

Fighter, Scout, Marksman, Guard, Raider, Heavy, Lancer, and Juggernaut may
Capture. Medic, Envoy, Saboteur, Catapult, and Breacher may not. Envoy has no
ordinary Attack or retaliation and always uses a 1x defense multiplier;
terrain, city, Walls, and Fortification never improve it. Guard, Catapult, and
Breacher cannot Attack after Move. Catapult cannot fire at range 1, retaliate
at range 1, Capture, or advance. Marksman attacks range 1–2 and does not
advance on a ranged kill.

Scout sight is 2. Fieldcraft makes Marksman sight 2 and removes Forest movement
termination for both Scout and Marksman. Other base sight is 1. Surveying adds
1 sight while on Mountain and permits all roles to enter Mountain. Maneuver
lets Scout, Raider, and Lancer ignore hostile ZOC; it does not change Move.

Raider Charge adds exactly +1 Attack only after its accepted ordinary Move in
that turn traversed at least two path cells. Medic Heal targets an adjacent
owned damaged unit, restores 4 HP or 6 with Recovery, and is mutually exclusive
with Attack. Heavy and Juggernaut Push a surviving melee target one cell along
the attacker-target vector when the destination is on-board, attacker-explored,
traversable for the target owner, and free of unit/settlement; otherwise no
Push occurs. Push never captures or triggers ZOC. Breach replaces the target's
selected ordinary defense multiplier with 1x; it does not alter base Defense.

### 6.2 Movement and action lifecycle

Movement is eight-way; Chebyshev distance defines range, sight, adjacency, and
ZOC. Ordinary Move receives `2 * Move` half-step points. A normal step costs 2.
It costs 1 only for an orthogonal step whose endpoints are friendly Road or
owned city center, with at least one Road in the friendly connected network.
Diagonal steps are never discounted. Forest/Mountain entry ends Move even when
discounted, except Fieldcraft Forest freedom. An unexplored step ends Move.
Surveying is required for Mountain.

Entering a cell adjacent to a visible or newly detected hostile unit ends Move
after that step. A unit may leave ZOC; ZOC does not pin or prohibit Attack.
Maneuver roles ignore termination but not occupancy. Allied units occupy cells
but do not project hostile ZOC.

Each ordinary unit may Move once. Attack/Heal/Defection/Blackout/Pillage/
Disband are primary actions under their stated restrictions. Recover, Capture,
and completed primary specials are terminal. Wait sets only `handled`; it does
not consume later legality or prevent idle auto-recovery. Promote is free once
at three kills, including retaliation kills; it adds 5 max/current HP, never
refreshes action state, and may occur after Pursuit has ended but never while
Pursuit is open. New trained/rewarded/converted units are handled and otherwise
exhausted until their next Start Turn.

Explicit Recover heals 4 in friendly territory and 2 elsewhere. End Turn
auto-recovers by the same amount only for a unit that did not move, attack,
heal, recover, capture, use a special, or enter Pursuit. With Recovery, a wholly
idle unit in friendly territory heals 6. Healing never clears Defection,
Blackout, exposure, cooldown, or Pursuit.

### 6.3 Exact combat

Use integer rational arithmetic from pre-exchange health:

```text
attackForce  = attacker.attack * attacker.hp / attacker.maxHp
defenseForce = defender.defense * defender.hp / defender.maxHp * defenseBonus
totalForce   = attackForce + defenseForce

damageToDefender = roundHalfUp(
  attackForce / totalForce * attacker.attack * 4.5)

damageToAttacker = roundHalfUp(
  defenseForce / totalForce * defender.defense * 4.5)
```

For nonnegative `numerator / denominator`, round half up is
`floor((2 * numerator + denominator) / (2 * denominator))`. Clamp damage to
current HP. Apply defender damage first. A dead defender does not retaliate.
Otherwise it retaliates when attacker distance is within both its minimum and
maximum range; v7 does not require defender exploration. Retaliation uses the
pre-exchange force and the defender's Defense stat as its retaliation power.
Thus Catapult retaliates weakly at range 2–3 and never at adjacency.

Use the greatest single ordinary defense multiplier, never a product: 4x for a
unit on its friendly city with Walls; 2x for Fighter/Guard in an unwalled
friendly city after Fortification; 1.5x for any unit on a friendly city,
Mountain, or Forest; otherwise 1x. Breach forces 1x. Defection conversion
recalculates ownership-dependent defense immediately.

The `WALLS` reward is a city defense flag, not a map entity or combat target.
Ruleset 7 has no Chocolate Wall or other destructible structure command. A
Lancer therefore opens Pursuit only from a hostile-unit kill; city defense,
Pillage, and any non-unit removal can never qualify.

A surviving adjacent attacker advances after killing a unit, then reveals
normal sight. A ranged kill never advances. Every surviving eligible Lancer
strike retaliates normally. No rule contains a role-ID-specific damage bonus:
all counters emerge from these universal stats, ranges, actions, geometry,
retaliation, terrain, city defense, capacity, and price.

### 6.4 Portable faction archetypes

Future faction registrations may change names, art, exact stats, and signature
mechanics, but their complete roster must preserve these battlefield jobs at a
comparable research/price horizon. Combining or splitting jobs is allowed only
when the full roster still supplies the pressure and its practical counterplay.

| Archetype    | Original role | Invariant job                                                                       |
| ------------ | ------------- | ----------------------------------------------------------------------------------- |
| Generalist   | Fighter       | Cheap capture body, baseline screen, efficient ordinary trade                       |
| Explorer     | Scout         | Early mobility/sight that converts information into expansion and timely detection  |
| Controller   | Envoy         | Fragile delayed threat that forces an isolated premium unit to move or receive help |
| Basic ranged | Marksman      | Mobile short-range pressure with low durability                                     |
| Defender     | Guard         | Cheap high-defense occupation that makes frontal melee inefficient                  |
| Flanker      | Raider        | Affordable fast single-target closer against exposed ranged/support units           |
| Support      | Medic         | Sustains allies while sacrificing direct offense and tempo                          |
| Artillery    | Catapult      | Costly long-range siege with a close-range/setup weakness                           |
| Infiltrator  | Saboteur      | Hidden access to neglected rear areas and bounded city/economic disruption          |
| Anchor       | Heavy         | Capacity-efficient durable front-line concentration and displacement                |
| Sweeper      | Lancer        | Costly mobility plus finite repeat actions punishing fragile-unit concentration     |
| Direct siege | Breacher      | High-risk adjacent answer to extreme static defense                                 |
| Super-unit   | Juggernaut    | Rare reward-only strategic concentration that ordinary rosters can answer           |

The safety envelope is as invariant as the spectacular effect: a Sweeper has a
finite ceiling stopped by durable occupancy or sufficient spacing, with no
promotion/loot/action reset; a Controller gives the target owner a complete
visible reply, uses a fragile/costly source, cancels deterministically, never
bypasses capacity, and grants no immediate converted action; an Infiltrator has
timely universal/comparable detection, fails against active picketing, and has
both per-unit cooldown and per-target recovery. A future faction may express
these jobs differently, but may not remove their practical counters or replace
them with hardcoded role matchup damage.

## 7. Gridlock-breaker state machines

These systems are deterministic serialized rules. They consume no gameplay
PRNG. Their counters are ordinary positioning, durability, range, detection,
timing, capacity, and price—not hidden role matchup bonuses.

### 7.1 Lancer: bounded Pursuit

1. Start Turn resets a Lancer to `attacksUsed = 0`, `pursuitPhase = NONE`.
   It may ordinary Move with Move 3 and Dash, then Attack.
2. Every accepted Attack increments `attacksUsed`, including a wall/structure
   attack if a future ruleset adds one. Only killing a hostile **unit** can open
   Pursuit. Resolve damage, retaliation, death, ordinary melee advance, sight,
   capture eligibility changes, and their events first.
3. If the Lancer survives a lethal hostile-unit Attack and `attacksUsed` is 1
   or 2, set `pursuitPhase = PURSUIT_READY`, clear only `attacked`, and expose
   `3 - attacksUsed` remaining attacks. On the third Attack, or after a
   nonlethal result or attacker death, close Pursuit and set
   `attacked = handled = true`.
4. In `PURSUIT_READY`, legal commands are an adjacent visible hostile-unit
   `ATTACK`, one `PURSUE` path of one or two entered cells, or `END_PURSUIT`.
   Each interval between qualifying attacks may contain at most one Pursue.
   Pursue costs one point per entered cell; Road discounts never apply.
5. Pursue uses ordinary bounds, occupancy, Surveying, Forest/unexplored stop,
   allied-territory, hidden-contact, and ZOC rules. Maneuver ignores ZOC. A
   path cannot enter a public treasure coordinate. After any accepted path,
   including a contact-shortened path, phase becomes `PURSUIT_MOVED`; only an
   adjacent visible hostile-unit Attack or `END_PURSUIT` remains.
6. `END_PURSUIT` is terminal, clears phase, and sets
   `attacked = handled = true`. While Pursuit is open, ordinary Move, Capture,
   Recover, Heal, Defection, Blackout, Pillage, Disband, Promote, Wait,
   economic/faction special actions, structure attacks, chest collection, and
   End Turn are illegal.
7. A Pursuit Attack receives ordinary retaliation and ordinary melee advance.
   A nonlethal second strike ends the entire sequence. No death, promotion,
   reward, loot, structure, action, or ownership transition can reset the
   three-Attack ceiling.

The maximum is three total attacks, not three additional attacks. Because a
kill may advance one cell before a two-cell Pursue, a later target may begin
three Chebyshev cells from the prior target. UI, AI, and threat queries include
that full reach.

### 7.2 Envoy: delayed Defection

`OFFER_DEFECTION { unitId, targetUnitId, homeCityId }` is a terminal primary
action after an optional ordinary Move.

At offer time:

- the Envoy is owned, alive, active, not in Pursuit, and has not used another
  primary/terminal action;
- the target is a visible living hostile unit at Chebyshev distance 1–2 and
  has no existing Defection mark;
- the named owned city has one capacity entitlement after living assigned
  units and earlier mark reservations;
- all roles, including Juggernaut and other reward units, are eligible;
- the action deals no damage, causes no retaliation, allocates the next entity
  ID as mark ID, reserves capacity, marks the Envoy handled/special-acted, and
  stores the **resulting** accepted `commandIndex` as `offeredAtCommandIndex`.

The mark starts `WAITING_FOR_REPLY`. The recorded target owner and its formal
allies see the Envoy entity and exact current coordinate until the mark ends,
even if that terrain was unexplored; surrounding terrain remains unrevealed.
Initiator and recorded target owner receive the complete mark. A third party
seeing only one endpoint receives an endpoint status without counterpart ID or
coordinate; both endpoints must be independently visible before the link is
shown.

The explicitly revealed Envoy is a legal Attack target even when its tile
remains unexplored. Its fixed 1x defense makes the preview exact without
disclosing terrain. A lethal adjacent attacker advances only if that coordinate
is already explored and traversable for it; otherwise it kills without advance
or terrain reveal. Moving toward the coordinate uses ordinary optimistic
movement and may reveal/stop normally.

The first accepted End Turn by the recorded target owner after the offer is the
reply boundary. That owner receives one complete Start/income/action/recovery
window. Immediately after its recovery the mark is revalidated and becomes
`ARMED`; failure cancels it. This applies whether the target's seat is later in
the offer round or earlier and therefore replies in the next round.

An armed mark resolves at the initiating player's first subsequent Start Turn,
after that player's existing units reset and before Blackout/income. Revalidate,
in mark-ID order:

- source and target live;
- source still belongs to the initiator;
- target still belongs to its recorded owner, who remains hostile;
- both endpoints are within range 2;
- initiator still owns the reserved city; and
- this mark still has its ordered capacity entitlement.

Failure emits one cancellation and releases the reservation before the next
mark. Moving/pushing either endpoint out of range, death/removal, source or
target conversion, relationship change, player elimination, reserved-city
capture, Barracks loss, or capacity displacement can cancel.

On success, atomically:

1. remove the target from its former home-city count;
2. change target owner and `homeCityId` to the reserved city, consuming the
   reservation;
3. preserve role, coordinate, current/max HP, kills, veteran status, promotion,
   and ownership-neutral cooldowns;
4. set Capture false and every activation field exhausted/handled for the
   complete current turn;
5. cancel Defection marks sourced by the converted unit, clear its Pursuit,
   and revalidate all remaining reservations;
6. recompute friendly-city, Walls, Fortification, siege, and capacity facts;
7. reveal terrain from the converted unit by its normal sight to its new owner,
   without transferring former-owner exploration.

Converting a city occupant neither captures nor transfers the city and grants
no Spoils. If the converted unit is now hostile to that city, its friendly
defense vanishes and it besieges the city, but it cannot Capture on the
conversion turn. Reward-unit conversion never uses reward over-capacity
permission; it requires and consumes the reserved capacity.

A later Envoy may offer the converted unit again, but there is no automatic
chain. The current owner gets a complete activation before a later reconversion
can resolve. Walls and defense multipliers do not block Defection because it is
not combat and there is no line-of-fire rule.

### 7.3 Saboteur: Concealment, exposure, and Blackout

Concealment is a passive viewer-relative rule. An enemy Saboteur entity is
omitted unless at least one condition holds:

- it is within Chebyshev 1 of that viewer's unit or city center;
- it is within Chebyshev 2 of that viewer's Scout;
- an exposure record anchored to that viewer or its formal ally is live; or
- a live Defection mark explicitly reveals it to that viewer.

Owners always see their own Saboteurs. Formal allies share detections.
Detection ignores terrain and Walls. It reveals only the entity/current
coordinate, not unexplored surrounding terrain. Leaving detector range restores
Concealment unless an exposure/Defection reveal remains. Detection is recomputed
after every movement step, ownership change, death, spawn, and turn boundary.

An ordinary Attack by a Saboteur creates an exposure to the target owner and
its formal allies through the end of that owner's next accepted End Turn.
Blackout creates the same timed exposure to the target city owner. Repeated
exposure extends to the new boundary. Exposure changes observation only; it
does not change combat stats, target legality for a viewer that still cannot
observe it, or terrain exploration.

`BLACKOUT_CITY { unitId, cityId }` is a terminal primary action after optional
ordinary Move. It requires:

- a living owned Saboteur, not in Pursuit and otherwise primary-action ready;
- an adjacent visible hostile city;
- no `PENDING`, `ACTIVE`, or `RECOVERY` state on that city;
- `round >= blackoutEligibleRound`; and
- no living unit hostile to the Saboteur currently detects it. City-center
  detection alone reveals the Saboteur but does not block Blackout.

Thus any hostile garrison on the city center blocks the action, ordinary units
cover their radius-1 approach, and Scouts cover radius 2. “Hostile unit” is
relative to the Saboteur, so a detecting third-party rival also blocks it.

On acceptance, set the city to `PENDING`, expose the Saboteur to the target
owner/allies, mark it handled/special-acted, and set
`blackoutEligibleRound = actionRound + 3`. The global-round threshold survives
Defection. The action grants no Coins, damage, spawn, or population change.

At the target city's next owner Start Turn, `PENDING` becomes `ACTIVE` before
income and suppresses `min(3, preBlackout city income)`. Through that turn the
city cannot Train and no tile assigned to it may Harvest, Hunt, Build,
Clear/Replant, Road, Redevelop, or otherwise develop. Rewards, existing
population/capacity/defense/Roads/improvements, movement, combat, Capture, and
unit actions remain functional. The effect clears at that owner's End Turn and
becomes `RECOVERY { unaffectedTurnStarted: false }`.

At the next Start Turn of the current owner, recovery becomes
`unaffectedTurnStarted: true`; that city receives ordinary income/actions. Its
End Turn clears recovery. If city ownership changes during `PENDING` or
`ACTIVE`, cancel denial and install recovery for the new owner with false. If
ownership changes during `RECOVERY`, retain recovery, replace its owner, and
reset false. A capture during an already-started recovery turn therefore still
requires the new owner to complete a later full unaffected turn. Multiple
Blackouts never stack.

Saboteur death does not remove a planted city effect. Source-owner elimination
also leaves a planted effect, because it is city-attached; the target's normal
capture/recovery rules still apply. The per-unit round threshold and per-city
unaffected-turn recovery are independent guardrails.

### 7.4 Hidden occupancy and shared interactions

Public movement treats an undetected Saboteur and its ZOC as absent. Authority
resolves an offered path stepwise:

- attempting to enter its occupied cell stops on the legal prefix before it;
- entering its newly detected hostile ZOC stops on the entered cell unless the
  mover ignores ZOC;
- either outcome accepts the command, consumes Move/Pursue, reveals the
  Saboteur to the detecting side, and uses ordinary public interruption reason
  `OCCUPIED` or `ZOC`; it never rejects with a hidden-specific error;
- a first-step occupied contact may leave the mover at origin but still consumes
  its movement action; and
- a Pursuit contact changes phase to `PURSUIT_MOVED`; an adjacent revealed
  Saboteur may then be attacked, but no replacement path is granted.

Defection, Attack, Heal, and entity-targeted commands cannot name an undetected
Saboteur. Guessed IDs return the same generic target-not-found result as an
empty or unseen ID. Push previews report `UNKNOWN_BEHIND_FOG` for nonpublic
occupancy; actual contact reveals only when resulting geometry detects it.

City/Wall multipliers apply normally to Lancer and Saboteur combat. Defection
and Blackout cause no retaliation and ignore multipliers. Capture cannot occur
during Pursuit or on a conversion turn. Healing does not clear any new state.
Start/End boundaries, not animations or wall-clock time, advance every timer.

## 8. Commands, validation, events, and transaction order

### 8.1 Exact command payloads

```ts
type CommandV7 =
  | {
      readonly kind: "MOVE" | "PURSUE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      readonly kind: "OFFER_DEFECTION";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly homeCityId: CityId;
    }
  | {
      readonly kind: "BLACKOUT_CITY";
      readonly unitId: UnitId;
      readonly cityId: CityId;
    }
  | {
      readonly kind: "HEAL_ADJACENT";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      readonly kind:
        | "RECOVER"
        | "CAPTURE"
        | "PROMOTE"
        | "PILLAGE"
        | "DISBAND"
        | "END_PURSUIT"
        | "WAIT";
      readonly unitId: UnitId;
    }
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyId }
  | { readonly kind: TileCommandKindV7; readonly at: Coord }
  | {
      readonly kind: "TRAIN";
      readonly cityId: CityId;
      readonly role: UnitRoleId;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: RewardId;
    }
  | { readonly kind: "END_TURN" };
```

`TileCommandKindV7` is exactly command ordinals 15–32. Attack has no structure
arm in Original-only v7. Command envelope keys are exactly `format`, `version`,
`command`. Every parser checks exact payload keys and frozen IDs before rule
validation.

### 8.2 Common validation and observation-safe errors

Every command first checks, in order: `MATCH_ENDED`, `PLAYER_ELIMINATED`,
`NOT_ACTIVE_PLAYER`, `PENDING_CHOICE`. A choice resolver instead checks that it
matches the queue head before its entity/reward validation.

Unit commands then check actor existence, ownership, life, role, and relevant
activation state before target/range/content. An unseen or concealed target is
`TARGET_NOT_FOUND`; it is indistinguishable from an unknown ID. Relationship is
checked before range/damage. Every rejection returns the identical state,
empty events, no reveal, no `commandIndex` increment, and no PRNG draw.

Tile commands validate in this exact order:

1. `TILE_NOT_FOUND`
2. `TILE_UNEXPLORED`
3. action-specific `TECH_REQUIRED`
4. action-specific `INVALID_TILE`
5. `TERRITORY_NOT_OWNED`
6. `CITY_BESIEGED`
7. `CITY_BLACKED_OUT`
8. `CITY_REWARD_PENDING`
9. `CITY_BUILDING_LIMIT`
10. `PLACEMENT_REQUIREMENT_UNMET`
11. `INSUFFICIENT_COINS`
12. `INTEGER_OVERFLOW`

Redevelop omits building/placement gates; Clear/Replant use their specific
invalid-tile code. Barracks checks its one-per-city limit before adjacency.
Research after common gates is `TECH_NOT_FOUND`,
`TECH_ALREADY_RESEARCHED`, `TECH_PREREQUISITE_MISSING`,
`INSUFFICIENT_COINS`, `INTEGER_OVERFLOW`. Train validates city existence,
ownership, siege, Blackout, pending reward, role trainability/unlock, center
occupancy, capacity including reservations, Coins, then overflow.

New commands use these exact post-actor orders:

- Pursue: `UNIT_ROLE_INVALID`, `PURSUIT_NOT_READY`, `INVALID_PATH`, public
  allied-territory/terrain/bounds rules; hidden contact is accepted and
  shortened.
- End Pursuit: `UNIT_ROLE_INVALID`, `PURSUIT_NOT_OPEN`.
- Offer Defection: `UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`,
  `TARGET_NOT_FOUND`, `TARGET_ALLIED`, `TARGET_OUT_OF_RANGE`,
  `DEFECTION_TARGET_MARKED`, `CITY_NOT_FOUND`, `CITY_NOT_OWNED`,
  `CITY_CAPACITY_FULL`, `INTEGER_OVERFLOW`.
- Blackout: `UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`, `CITY_NOT_FOUND`,
  `TARGET_ALLIED`, `TARGET_OUT_OF_RANGE`, `BLACKOUT_PROTECTED`,
  `BLACKOUT_COOLDOWN`, `SABOTEUR_DETECTED`, `INTEGER_OVERFLOW`.
- Pillage: `TECH_REQUIRED`, `UNIT_ALREADY_ACTED`,
  `PILLAGE_INVALID_TARGET`, `INTEGER_OVERFLOW`.
- Disband: `TECH_REQUIRED`, `UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`,
  `INTEGER_OVERFLOW`.
- End Turn: after common gates, `PURSUIT_MUST_END` if any owned Lancer has an
  open sequence.

### 8.3 Canonical events

Every accepted command produces one strict version-7 canonical event envelope
at its resulting `commandIndex`. The complete event union uses the frozen order
in section 1.3 and the exact payloads below. All canonical events are
omniscient.

```ts
interface EventEnvelopeV7 {
  readonly format: "pulp-wars-events";
  readonly version: 7;
  readonly commandIndex: number;
  readonly events: readonly DomainEventV7[];
}
```

Match creation emits the same envelope at `commandIndex: 0` for its initial
Start Turn. Later batches correspond one-to-one with accepted commands.

| Event                         | Exact payload                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `PURSUIT_OPENED`              | `{ unitId, attacksUsed, attacksRemaining }`                                                                            |
| `UNIT_PURSUED`                | `{ unitId, path, from, to }`                                                                                           |
| `PURSUIT_ENDED`               | `{ unitId, attacksUsed, reason: NONLETHAL \| THIRD_ATTACK \| ATTACKER_DIED \| EXPLICIT_END \| STATE_CANCELLED }`       |
| `DEFECTION_OFFERED`           | `{ markId, sourceUnitId, targetUnitId, initiatingPlayerId, targetOwnerId, reservedHomeCityId, offeredAtCommandIndex }` |
| `DEFECTION_ARMED`             | `{ markId, sourceUnitId, targetUnitId, targetOwnerId }`                                                                |
| `DEFECTION_CANCELLED`         | `{ markId, reason }` with the frozen reason list below                                                                 |
| `DEFECTION_RESOLVED`          | `{ markId, sourceUnitId, targetUnitId, fromPlayerId, toPlayerId, homeCityId, at }`                                     |
| `SABOTEUR_EXPOSED`            | `{ unitId, anchorPlayerId, reason: ATTACK \| BLACKOUT }`                                                               |
| `BLACKOUT_PLANTED`            | `{ cityId, sourceUnitId, sourceOwnerId, targetOwnerId, actionRound, eligibleRound }`                                   |
| `BLACKOUT_ACTIVATED`          | `{ cityId, ownerId, suppressedCoins }`                                                                                 |
| `BLACKOUT_RECOVERY_STARTED`   | `{ cityId, ownerId, reason: AFFECTED_TURN_ENDED \| CITY_CAPTURED }`                                                    |
| `BLACKOUT_RECOVERY_COMPLETED` | `{ cityId, ownerId }`                                                                                                  |
| `IMPROVEMENT_PILLAGED`        | `{ playerId, unitId, cityId, at, improvement, coinDelta: 1 }`                                                          |
| `UNIT_DISBANDED`              | `{ playerId, unitId, role, coinDelta }`                                                                                |
| `SPOILS_AWARDED`              | `{ playerId, cityId, coins: 2 }`                                                                                       |

Defection cancellation reason order is `SOURCE_MISSING`, `TARGET_MISSING`,
`SOURCE_OWNER_CHANGED`, `TARGET_OWNER_CHANGED`, `RELATIONSHIP_CHANGED`,
`OUT_OF_RANGE`, `RESERVED_CITY_LOST`, `CAPACITY_LOST`,
`INITIATOR_ELIMINATED`, `TARGET_OWNER_ELIMINATED`, `STATE_CANCELLED`.

Retained event payloads are exact v7-typed forms:

- `TURN_STARTED { playerId, coins }`, `INCOME_AWARDED` and
  `INCOME_PREVIEWED { playerId, totalCoins, cities: [{ cityId, coins }] }`,
  `TURN_ENDED { playerId }`;
- `TECH_RESEARCHED { playerId, tech, cost }`;
- resource actions `{ playerId, cityId, at, cost,
permanentPopulationAdded: 1 }`;
- `ECONOMIC_BUILDING_BUILT { playerId, cityId, at, improvement, cost,
populationContribution, marketIncome, capacityDelta }` and
  `ECONOMIC_BUILDING_REMOVED { playerId, cityId, at, improvement,
populationContributionRemoved, marketIncomeRemoved, capacityDelta }`;
- `FOREST_CLEARED | FOREST_REPLANTED { playerId, cityId, at, coinDelta }`
  and `ROAD_BUILT { playerId, cityId, at, cost: 2 }`;
- `CITY_ECONOMY_CHANGED { cityId, economicBefore, economicAfter,
populationBefore, populationAfter, marketBefore, marketAfter }`,
  `CITY_LEVELED_UP { cityId, level }`,
  `CITY_REWARD_QUEUED { cityId, reachedLevel, candidates }`,
  `CITY_REWARD_CHOSEN { playerId, cityId, reachedLevel, reward }`, and
  `CITY_TERRITORY_EXPANDED { playerId, cityId, tiles }`;
- `UNIT_TRAINED { playerId, cityId, unitId, role, cost, at }`,
  `UNIT_REWARD_GRANTED { playerId, cityId, reachedLevel, unitId, role }`,
  `UNIT_HEALED { medicId, targetUnitId, amount, hpAfter }`, and
  `UNIT_PUSHED { sourceUnitId, targetUnitId, from, to }`;
- `UNIT_MOVED { unitId, path }`,
  `UNIT_MOVE_INTERRUPTED { unitId, at, reason }`, and
  `TILES_REVEALED { playerId, tiles }`, where interruption reason is exactly
  `OCCUPIED | SURVEYING_REQUIRED | ZOC`;
- `UNIT_RECOVERED { unitId, amount, automatic }`,
  `UNIT_WAITED { playerId, unitId }`,
  `UNIT_PROMOTED { unitId, maxHp }`, and
  `UNIT_DIED { unitId, cause }`, where cause is
  `ATTACK | RETALIATION | ELIMINATION` (Disband emits only `UNIT_DISBANDED`);
- `CITY_CAPTURED { cityId, from, to }`,
  `PLAYER_ELIMINATED { playerId }`, and
  `MATCH_ENDED { outcome }`.

`COMBAT_RESOLVED` includes attacker/target IDs, exact Attack and Defense
half-units, minimum/maximum range, Charge/Breach, defense multiplier, damage,
death, retaliation/no-retaliation reason, advance, Push, and
`pursuitWillOpen`. `TREASURE_CAPTURED` retains requested/granted `COINS | HEAVY`,
5/0 Coin delta, fallback, and optional spawned unit/location/home-city fields.

### 8.4 Transaction order

An accepted command preflights all costs, integer effects, allocations, and
deterministic target choices before mutation. It then mutates atomically, emits
domain facts in the stated order, increments `commandIndex` exactly once, and
deep-freezes the result.

- Economic build/harvest: deduct Coins; mutate tile/resource/improvement/Road;
  emit action/build fact; revalidate capacity/Defection; recompute economy;
  apply permanent population; emit economy then level/reward facts.
- Attack: resolve combat from one pre-exchange preview; emit
  `COMBAT_RESOLVED`, deaths, advance/Push, reveal, cancellation/ownership-safe
  cleanup, then Pursuit open/end. Retaliation deaths use the same ordering.
- Pursue: resolve its accepted/shortened path stepwise; emit visible movement,
  interruption, reveal, then phase mutation. It cannot trigger a chest.
- Capture: transfer city/territory; emit `CITY_CAPTURED`; normalize Blackout;
  cancel affected Defections; grant/record Spoils; reveal; recompute economy;
  emit levels/rewards; orphan/re-home units; then elimination/outcome.
- Offer/Blackout: allocate/store state, set terminal activation, emit the
  offer/plant fact and exposure. No combat or income occurs.
- Defection boundary: cancel invalid marks or mutate ownership, emit
  resolution, cancellation cleanup, reveal, and derived siege/capacity facts
  before Blackout and income.
- Pillage: destroy improvement, grant 1 Coin, emit Pillage, revalidate
  reservations/capacity, then recompute economy and levels.
- Disband: remove unit, grant refund, emit Disband, cancel marks/exposures
  involving it, then revalidate reservations.

## 9. Observation-safe views, events, queries, and artifacts

### 9.1 PlayerView

`PlayerViewV7` is the only rules input to browser presentation and Normal AI.
It contains schema/ruleset/command index, setup, human player ID, round/active
seat/turn order, the viewer's complete own player state, public player
identity/status, global leaderboard, projected board/cities/population values,
visible units and authority-derived stats, public chests, viewer-owned pending
choices, viewer-safe Defection/Blackout/exposure status, and outcome.

```ts
interface PublicPlayerV7 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: "CORAL" | "TEAL" | "GOLD" | "VIOLET";
  readonly faction: "ORIGINAL";
  readonly factionTreeId: "ORIGINAL_BASELINE_V2";
  readonly status: "ACTIVE" | "ELIMINATED";
}

type PlayerTileViewV7 =
  | {
      readonly at: Coord;
      readonly explored: false;
      readonly diplomaticBlock?: "ALLIED_TERRITORY";
    }
  | {
      readonly at: Coord;
      readonly explored: true;
      readonly terrain: TerrainId;
      readonly resource: ResourceId | "UNKNOWN_RESOURCE" | null;
      readonly improvement: ImprovementId | null;
      readonly road: boolean;
      readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
      readonly territoryCityId: CityId | null;
      readonly territoryOwnerId: PlayerId | null;
    };

interface PublicCityV7 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: Coord;
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number;
  readonly isCapital: boolean;
  readonly expanded: boolean;
  readonly rewards: readonly {
    readonly reachedLevel: number;
    readonly reward: RewardId;
  }[];
  readonly blackout: PublicBlackoutStatusV7 | null;
}

interface PublicUnitV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null; // non-null only to the owner
  readonly role: UnitRoleId;
  readonly at: Coord;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivationV7;
  readonly blackoutEligibility:
    | { readonly known: true; readonly round: number }
    | { readonly known: false };
}

type PublicDefectionStatusV7 =
  | {
      readonly visibility: "FULL";
      readonly markId: number;
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly initiatingPlayerId: PlayerId;
      readonly targetOwnerId: PlayerId;
      readonly reservedHomeCityId: CityId;
      readonly phase: "WAITING_FOR_REPLY" | "ARMED";
    }
  | {
      readonly visibility: "ENDPOINT";
      readonly endpointUnitId: UnitId;
      readonly phase: "WAITING_FOR_REPLY" | "ARMED";
    };

type PublicBlackoutStatusV7 =
  | {
      readonly visibility: "FULL";
      readonly cityId: CityId;
      readonly phase: "PENDING" | "ACTIVE" | "RECOVERY";
      readonly sourceUnitId: UnitId | null;
      readonly suppressedCoins: number | null;
      readonly unaffectedTurnStarted: boolean | null;
    }
  | {
      readonly visibility: "CITY_ONLY";
      readonly cityId: CityId;
      readonly phase: "PENDING" | "ACTIVE" | "RECOVERY";
    };

interface PublicLeaderboardEntryV7 {
  readonly playerId: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: "CORAL" | "TEAL" | "GOLD" | "VIOLET";
  readonly faction: "ORIGINAL";
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly isViewer: boolean;
  readonly cityCount: number;
  readonly livingUnitCount: number;
}

interface PlayerViewV7 {
  readonly schemaVersion: 7;
  readonly rulesetId: "pulp-wars-poc-7";
  readonly commandIndex: number;
  readonly setup: MatchSetupV7;
  readonly humanPlayerId: PlayerId;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly viewer: PlayerStateV7;
  readonly players: readonly PublicPlayerV7[];
  readonly leaderboard: readonly PublicLeaderboardEntryV7[];
  readonly board: PlayerBoardViewV7;
  readonly cities: readonly PublicCityV7[];
  readonly populationContributions: readonly PopulationContributionV7[];
  readonly improvementValues: readonly PublicImprovementValueV7[];
  readonly units: readonly PublicUnitV7[];
  readonly unitStats: readonly PublicUnitStatsV7[];
  readonly treasureChests: readonly Coord[];
  readonly defectionStatuses: readonly PublicDefectionStatusV7[];
  readonly blackoutStatuses: readonly PublicBlackoutStatusV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}
```

`PublicPlayerV7` deliberately omits Coins, researched technologies, exploration,
and Spoils history for non-viewers. `viewer` retains those own values. Public
tile/city/unit/status arms are exact discriminated unions: redacted arms carry
none of the omitted fields.

Projection rules are exact:

- Unexplored tiles contain coordinate and `explored: false` only, except the
  content-free allied-territory block. Explored gated resources use
  `UNKNOWN_RESOURCE` for both presence and absence.
- A city appears only when its center is explored. A normal unit appears on an
  explored tile. A Saboteur appears only when section 7.3 makes it visible to
  that viewer.
- `unitStats` contains one entry for each and only each visible unit, computed
  by authority in fixed HP, Attack, Defense, Move, Range, Sight order. It uses
  exact rational base/total values and separately attributed active modifier
  terms. Promotion modifies maximum HP; Charge modifies Attack; the one greatest
  defense multiplier reports its additive difference; Mountain modifies Sight.
  Roads, Fieldcraft, Maneuver, Concealment, Pursuit, and cooldown do not invent
  numeric Move/stat terms; they appear as ability/status data.
- Owned improvement live values expose population, Market income, or Barracks
  capacity contribution. Processor contributors are exposed only when the
  underlying cells are public.
- Blackout owner/source details are complete to source and target owners. Other
  viewers get city phase only while the city is independently visible and no
  hidden source ID/location.
- Defection endpoints and link follow section 7.2. An endpoint-only third-party
  badge contains phase but not counterpart identity, owner, city, or coordinate.
- `leaderboard` contains each player once in stored turn order with player ID,
  seat, controller, color, Original faction, active/eliminated state, viewer
  flag, city count, and living-unit count. Counts include concealed Saboteurs,
  but never expose role or location. It contains no Coins, technology, IDs of
  owned entities, or exploration.

Equal canonical `PlayerViewV7` values must produce byte-identical public
commands, canonical paths, previews, selections, AI tuples, and projected event
batches. Public command enumeration is a pure function of the view. It offers
only actions whose legality is derivable from that view, except optimistic
movement resolved by the accepted interruption contract.

### 9.2 Public previews

- Economic preview returns exact cost, city, signed population and recurring-
  income deltas by city, contribution, capacity delta, distinct types/families,
  connected coordinates, opposite axes, Road connection, limits, and
  `complete: true` only for an exact public target.
- Combat preview uses the same rational calculation as resolution and includes
  Catapult minimum range/retaliation, Charge, Breach, Push certainty, damage,
  death, advance, and whether a Lancer kill would open Pursuit.
- Pursuit preview includes current `attacksUsed`, attacks remaining, direct
  adjacent targets, every canonical one/two-cell path and resulting attack
  target, ordinary kill-advance reach, and public stop reasons.
- Defection preview includes target, reserved city/capacity, recorded reply
  owner, reply and earliest resolution boundaries, cancellation conditions,
  exhaustion, and city-occupant siege consequence.
- Blackout preview includes target, detecting sources already visible to the
  actor, whether unit detection blocks, action/eligible rounds, capped income
  denial, blocked city actions, exposure boundary, and recovery turn.
- No preview speculates about hidden units or resources. A blind Push or
  displacement uses `UNKNOWN_BEHIND_FOG`; guessed concealed targets get no
  distinct preview.

### 9.3 Viewer-projected live events

The reducer emits canonical events internally. Before any browser animation,
notice, ordinary log, semantic announcement, or controller callback, authority
calls a pure `projectEventsV7(beforeState, afterState, viewerId, events)` and
emits an exact `pulp-wars-player-events` envelope. DOM/Canvas code never
receives the canonical batch for an active match.

```ts
interface PlayerEventEnvelopeV7 {
  readonly format: "pulp-wars-player-events";
  readonly version: 7;
  readonly viewerId: PlayerId;
  readonly commandIndex: number;
  readonly events: readonly PlayerEventV7[];
}
```

Projection may omit an event, redact fields, or add the presentation facts
`UNIT_REVEALED { unitId, at, reason }`,
`UNIT_CONCEALED { unitId, lastSeenAt }`, and
`DEFECTION_ENDPOINT_STATUS { unitId, phase }`. It obeys these rules:

- An unseen Saboteur's movement, selection, status, attack candidacy, ZOC,
  Pursuit contact before reveal, and location-bearing events are omitted.
- If an enemy Saboteur becomes detectable partway through movement, the
  projected batch begins with `UNIT_REVEALED` at the first detectable step and
  includes only the visible suffix. If it leaves all visibility, emit the
  visible prefix and `UNIT_CONCEALED` without final/path information.
- Contact interruption is shown only after contact itself makes the Saboteur
  detectable. The public `OCCUPIED`/`ZOC` result contains no former hidden path
  content.
- Saboteur Attack/Blackout exposure emits `UNIT_REVEALED` before the visible
  combat/plant event to the target side. Other viewers receive only events
  allowed by their independent visibility.
- Defection's target side receives the explicitly revealed source coordinate
  but no terrain ring. Third-party link fields require both endpoints visible.
- Public economy, research, own commands, global captures/eliminations/outcome,
  and leaderboard-affecting facts remain visible only with the fields already
  approved by the view; hidden entity IDs are redacted.

Reconnect and save/resume rebuild presentation from the current PlayerView and
future projected events. They never replay a hidden canonical event into the
live UI.

### 9.4 Omniscient artifact boundary

Canonical game state, canonical event batches, save envelopes, replay files,
checkpoint/state hashes, and raw debug bundles are omniscient reproduction or
diagnostic artifacts. They are never passed to Normal AI, ordinary live logs,
screen readers, Canvas/DOM presentation, telemetry visible to a player, or a
safe “export game log” control.

An explicit **Export debug bundle (includes hidden map and units)** action may
download the raw artifact locally. It must display the spoiler warning in its
accessible name and file metadata, must not render contents in-app during an
active match, and performs no network upload. A separate safe live log export
contains only the requesting viewer's projected event batches and PlayerView-
safe setup/diagnostics. Final-map/replay developer tooling may deliberately use
omniscient artifacts only when labeled as such.

## 10. Normal AI, scheduling, headless, and telemetry

Normal remains deterministic, renderer-independent, PRNG-free, and restricted
to `PlayerViewV7`, public commands, and public previews. It rebuilds candidates
after every accepted command, excludes Wait, never retries a rejection with
hidden knowledge, and uses the v6 signed-integer tuple extended by v7 command
ordinals:

```text
priority, strategicValue, immediateValue, futureValue, safetyValue,
objectiveValue, -commandKindOrdinal, -targetY, -targetX,
-primaryEntityId, -contentOrdinal
```

The existing v6 economic, capture, defense, training, research-chain, Road,
reward, combat, movement, and Cooperative priorities remain numerically stable
for equivalent v7 candidates. V7 adds these deterministic requirements:

- In open Pursuit, search the complete public tree to the three-attack ceiling.
  Score guaranteed kills, damage, retaliation, resulting safety, target cost,
  and spacing using exact previews. Choose the lexicographically best sequence's
  next command; never assume a non-guaranteed kill. If no sequence improves
  value, choose End Pursuit. Reserve an End-Pursuit command slot.
- Value Lancer threats by full Move, kill advance, and two-cell Pursue. Protect
  Marksmen/Catapults with healthy durable occupancy or spacing beyond that
  corridor; do not use a role-ID anti-Lancer score.
- An Envoy offer includes target role cost/value, target owner's guaranteed
  complete reply, visible escape/kill/rescue options, source survival, reserved
  capacity duration, conversion exhaustion, and city siege. Juggernaut has a
  fixed valuation equal to 12 Coins for AI comparison only; it is not a hidden
  training cost or rules value. Candidate home cities sort by free capacity,
  then safety from visible capture, then city ID.
- A threatened AI moves a marked target out of range or attacks/pushes the
  Envoy when that produces greater retained value than its ordinary action.
  It never reads a hidden source beyond the explicit Defection reveal.
- Blackout value is exactly attributable suppressed city income (cap 3) plus
  the public value of that turn's currently available Train/development
  actions, minus exposure and survival risk. It never assigns theft/spawn value.
  Normal garrisons a high-value rear city or positions a Scout picket when
  visible Saboteur risk justifies the opportunity cost, and respects city
  recovery and unit eligible round.
- Catapult plans only range 2–3 shots, screens adjacency, and accounts for one
  setup turn after moving. Anti-artillery units value closing to range 1.
- Barracks value is one slot minus its 6-Coin/opportunity cost. Mine/Forge and
  Quarry/Stoneworks research uses live output, not raw deposit count. Spoils is
  valued only before that player's first hostile capture; Pillage includes the
  destroyed live value and 1 Coin; Disband is chosen only when its refund plus
  freed capacity exceeds retaining the unit under the standard safety score.

The per-turn command cap remains 128, while the match caps remain 30,000
accepted commands and 750 rounds. The runner reserves enough slots to drain the
current reward queue, close Pursuit, and End Turn. A missing candidate,
rejection, non-advancing accepted command, or inability to end is a structured
failure. Browser AI executes at most one accepted command per scheduled slice,
returns to the event loop after each command and at least every 8 ms of policy
work, and supports Fast Forward by suppressing presentation rather than running
an unyielding synchronous loop.

Browser and headless use the identical v7 parser, registry, reducer,
projector, query/preview helpers, AI selector, canonicalizer, and map generator.
Required metrics include:

- command/event/error/stall counts and hashes; ruleset/setup/map/PRNG hashes;
- research adoption/first round for all 25 nodes and branch;
- Coin income/spend, negative-population losses, Spoils, Pillage, Disband;
- all resource conversions, 12 improvements, Roads, live contributions,
  Barracks capacity/overcapacity/reservation turns;
- role training/actions/damage/kills/losses/captures/survival per Coin for all
  13 roles;
- Lancer attacks/kills per activation, Pursuit paths/stops/end reasons and
  target spacing;
- Defection offers/reply turns/arms/resolutions/cancellations by reason,
  converted role/value, and reservation duration;
- Saboteur concealed/detected/exposed turns by source, Blackouts blocked,
  suppression and actions denied, recovery turns, cooldown, and post-exposure
  survival;
- Catapult shot ranges, setup turns, siege duration, and screen survival;
- observation-equivalence assertions and any hidden-information violation.

V7 receives new fixtures/corpora and never refreshes a v6 golden. Equal v6/v7
all-Original map inputs assert map and post-generation PRNG parity separately
from gameplay hashes.

## 11. DOM/Canvas interaction contract

### 11.1 Map, selection, and direct actions

The active presentation remains an axis-aligned 128 x 128 CSS-pixel square grid;
this is presentation only. Logical coordinates, eight-way movement, ranges,
adjacency, map generation, saves, and replay do not depend on renderer geometry.
Tiles depth-sort by projected row then column. Within each tile the order is
full-square terrain, Road/flat resource, low improvement or city base, tall
back portion, unit, then health/selection/status attachments. A same-tile unit
is always in front of its improvement. No improvement is hoisted into a global
foreground layer, so it cannot clip the Forest/resource/unit on the next lower
tile; only its permitted upward alpha participates in ordinary tile depth.

Selecting a visible unit, city, or tile opens exactly one nonmodal dock. It
never opens the obsolete duplicate “Choose an action” surface. The map remains
pannable/zoomable and the fixed Canvas host, camera, zoom, and selection never
resize or jump when dock content changes. Docks omit tile coordinates.

Every exact unambiguous contextual command executes from one button activation
against the already-selected entity/tile. Harvest, Hunt, Build, Clear, Replant,
Road, Redevelop, Barracks, Capture, Recover, Promote, Wait, Pillage, Disband,
and End Pursuit never ask for the same target again and never add confirmation.
Training buttons dispatch their exact city/role immediately. Confirmation is
used only where this contract explicitly names one. Buttons are 176 CSS pixels
wide, at least 44 x 44, grow vertically, and wrap without horizontal overflow.

Move, ordinary Attack, and Pursuit movement/attacks remain highlighted on the
map and are never duplicated as destination/target buttons. A Pursuit kill
immediately highlights direct attacks and canonical one/two-cell paths plus an
End Pursuit button. After Pursue, only eligible attacks and End Pursuit remain.

Defection is genuinely multi-target. **Defection** first highlights eligible
visible target units. Target activation dispatches immediately when exactly one
eligible reserved city exists; with several, a blocking **Choose home city**
dialog lists only those city IDs/capacity values in ascending ID and the chosen
button dispatches immediately. It is a required choice, not a confirmation.
Blackout highlights eligible adjacent cities only when more than one exists;
with exactly one, **Blackout** dispatches immediately. No command preview opens
an extra confirmation.

Unit identity uses the exact world sprite, compact name/HP, and then vertically
stacked HP, Attack, Defense, Move, Range, and Sight rows. Numeric modifier terms
appear as `Defense 2 + 1 + 2`; each `+N` has a hover/focus/touch tooltip naming
its source. Ability tags open explanatory cards for Capture, Charge, Heal,
Push, Breach, Pursuit, Defection, Concealment, Blackout, minimum range, and
other role abilities. Cards explain rules and close without dispatching.

City identity uses the city sprite; tile identity uses the most specific public
improvement/resource/terrain sprite. Game/Fertile/terrain art is vertically
centered in the shared viewport and never clipped low. Train and tile-action
buttons use the exact accepted world/building/resource sprite at the same
apparent scale as maximum map zoom.

### 11.2 Technology, rewards, status, and information safety

The Hub derives **Resume**, **Replace**, and **Delete** only from the active
route's autosave key. A match's **Restart** likewise replaces only that route's
key. The v7 Hub never presents a v6 save as resumable, replaceable, corrupt, or
blocking, and the v6 Hub never presents a v7 save that way. Choosing the
explicit route-scoped Replace, Delete, or Restart action is sufficient and does
not open a second confirmation; changing routes is never such an action.

**Tech** opens the only research surface: a full-screen layer on compact screens
and large modal on wide screens. The full five-branch graph uses the frozen
tree geometry. Each card contains only a dominant 112 x 130 art viewport, name,
and current Coin cost when unresearched. No cost appears after research; no
“need N more Coins” text or status prose appears inside a card. Available,
unavailable, and researched use color plus distinct border/connector/check
shape. Selecting a card opens details with prerequisite, exact unlocks/formula,
state, and Research only when offered. Research dispatches immediately without
confirmation and keeps the tree/focus open. The main match screen never exposes
a Research button.

Mandatory city rewards use the existing blocking popup and dispatch on the
chosen reward with no second confirmation. Defection home-city choice uses the
same focus-safe choice pattern. A mandatory choice suppresses Leaderboard and
other overlays until resolved.

City population shows only the current layer of `level + 1` tiny squares,
filled left-to-right; negative progress uses red leading squares capped
visually to the layer while semantic text states the full deficit. Windmill,
Sawmill, Forge, Stoneworks, Workshop, Grand Works, and Market show one compact
code-native value square per public contribution, wrapping after eight.
Barracks shows exactly one capacity square while live. No number is baked into
building art.

Only the owner sees a concealed Saboteur marker. A detecting enemy sees a
Reveal/Detected state only while legal; exposure and Defection source reveal
show their exact safe expiry/break condition. Undetected movement, targets,
threat overlays, animations, rejection text, logs, and semantic cursor content
are absent. Blackout UI distinguishes city-center reveal from hostile-unit
blocking without identifying hidden detectors.

The HUD's Leaderboard remains view-only and shows global cities/living units in
turn order, including concealed units only in the aggregate. It is usable
during AI work and mutates nothing.

### 11.3 Animation and accessibility

Accepted unit Move events slide the sprite along the projected path rather than
teleporting. Melee/ranged combat uses code-native lunge/jerk, projectile, impact,
and damage shake; Catapult uses a code-native arcing stone. Pursue uses the same
movement/combat primitives without delaying rule boundaries. Conceal/reveal is
a short opacity crossfade; Defection and Blackout status transitions use
code-native attachment pulses. No animation changes events, sight, timing, or
hashes.

An active-human unit with an offered Move uses the accepted anchor-preserving
silhouette glow and 1–1.08 scale/1–0.62 opacity 1.6-second rhythm. Health and
owner cues remain steady; movement/combat suppress it. Reduced motion uses a
strong static 1.04 glow and schedules no travel/readiness animation. Full,
Fast, Reduced, pause/cancel/reproject, and live-region behavior retain the
screen-flow contract.

All actions have semantic names and visible labels, focus meets WCAG 2.2 AA,
meaning never relies on color/motion, controls are at least 44 CSS px, and
320/390/600/1024 widths plus 200% zoom have no two-dimensional DOM scroll.
Canvas coordinates have a semantic activator with the same visible-occupant
selection and immediate-dispatch behavior.

## 12. Production asset inventory and geometry

Production raster art uses checked-in programmatic PixelLab scripts only.
Prompts, negative prompts, dimensions, model/settings, supported seeds,
candidate/output mapping, and deterministic postprocessing are recorded.
Credentials remain environment-only. Every new class starts with exactly three
individually inspected samples before bounded batches of at most three; the
orchestrator separately reviews native, enlarged, minimum/normal/maximum zoom,
DPR 1/2, terrain/city/improvement/neighbor, selection/status, and UI contexts.

Required v7 inventory is:

- 13 explicit Original role world-sprite registrations and 13 matching role
  portraits. Existing accepted v6 Original assets are explicit aliases only;
  new production assets are Envoy, Catapult, Saboteur, and Lancer.
- one shared Barracks world sprite and selection/action registration;
- raster action symbols for Defection, Blackout, Pillage, and Disband;
  Pursue/End Pursuit, detection/exposure, Spoils, cooldown, Blackout phases,
  and capacity reservation may be code-native symbols but must have explicit
  manifest/component registrations and semantic labels;
- 25 explicit `ORIGINAL_BASELINE_V2` technology-icon registrations. An accepted
  existing resource/building/unit icon may be aliased explicitly. Sawmilling
  may reuse Sawmill art while its detail lists Catapult; Fieldcraft may reuse
  its forest/Saboteur symbol; Maneuver may reuse Lancer; no key falls back;
- retained terrain, resource, city, economic-building, Road, Coin, population,
  reward, HUD, movement, combat, and shell inventory, with Forge/Stoneworks
  value visuals updated code-native for the new caps and Barracks capacity.

Envoy, Saboteur, and Lancer use the standard unit contract: untrimmed transparent
256 x 296 source, anchor `(128,222)`, map scale `0.25`, and shared 18 CSS-pixel
downward cosmetic offset at 1x. Preferred alpha bounds are
`x=32..224,y=10..240`; hard bounds `x=16..240,y=4..252`; foot contact midpoint
is within 8 x/6 y source pixels. Visible occupancy targets 28–44% of the legacy
128-wide footprint and stays materially smaller than Forest/Mountain; no left,
right, or bottom square overflow is permitted.

Catapult uses the low-wide siege contract: transparent 384 x 384, anchor
`(192,288)`, scale `0.24`, shared downward offset, preferred bounds
`x=30..354,y=24..318`, hard bounds `x=16..368,y=8..336`, wheel contact within
10 x/6 y. It may be broader than standard units but cannot hide a city label,
adjacent target, or unit. Its projectile is not baked into the raster.

Barracks uses the established processor/mid-building contract: transparent
384 x 384, anchor `(192,288)`, scale `0.30`, preferred bounds
`x=24..360,y=24..326`, hard bounds `x=8..376,y=8..344`. It sits wholly within
the 128 x 128 square left/right/bottom, may overflow upward only, uses the
shared upper-left key light, remains below unit/status layers, and leaves the
unit anchor/selection readable.

All contextual and technology raster art occupies an exact 112 x 130 CSS-pixel
transparent `object-fit: contain` viewport with original transparent padding.
Action buttons are 176 CSS pixels wide. Standard action/status icons are
128 x 128 source to 32 x 32 CSS; primary action icons are 192 x 192 to
48 x 48; compact HUD icons are 96 x 96 to 24 x 24. Text, numbers, pips,
connectors, paths, detection radii, cooldown/recovery state, selection, focus,
health, owner colors, projectiles, and animation are code-native and never
baked into production rasters.

## 13. Save, replay, release, and acceptance

### 13.1 Save and replay envelopes

V7 save keys are exactly `format`, `version`, `rulesetId`, `setup`, `state`,
`randomState`, `acceptedCommands`, `commandIndex`, `stateHash`, and `savedAt`.
Format/version/ruleset are `pulp-wars-save`/7/`pulp-wars-poc-7`. The UTF-8 limit
is 1,572,864 bytes. ISO timestamp is metadata outside canonical state. Setup,
random state, command count/index, canonical state hash, and complete replay
reconstruction must agree before atomic installation.

V7 replay keys are exactly `format`, `version`, `setup`, `commands`, and
`checkpoints`; each checkpoint is exact `{ index, stateHash }`, indices strictly
increase within command count, and hashes are lowercase 64-hex SHA-256. Format
and version are `pulp-wars-replay` and 7. Replays create the exact v7 setup,
apply accepted commands through the shared reducer as the stored active player,
verify checkpoints, and reject schema errors, command rejection, mismatch, or
commands after outcome. Saves/replays include Pursuit, Defection reservations,
exposure/cooldown, Blackout/recovery, Spoils history, and Barracks state through
canonical state/commands; no timer or hidden state is reconstructed from UI.

Autosave occurs at creation and every accepted command boundary after replay
append/checkpoint. It never captures an animation, transient target mode,
non-authoritative dialog, or AI thought. It does preserve mandatory rewards and
all new authoritative phases. Browser v7 persists this envelope only at
`pulpWars.save.v7.current`. Restart reproduces the identical v7 setup/seed and
replaces only that key; Delete removes only that key. Browser v6 continues to
use `pulpWars.save.current` without any v7 read, write, migration, replacement,
restart, or deletion. The two autosaves can coexist independently.

### 13.2 Required compatibility and validation

Release evidence must prove:

- strict version-7 setup/state/command/canonical-event/player-event/save/replay
  parsing, round trips, invariants, hashes, and malformed-data rejection;
- versions 1–6 remain preserved/incompatible to v7, v6 goldens remain unchanged,
  and `?ruleset=6` can create/resume Candy while v7 rejects every Candy setup;
- `pulpWars.save.v7.current` and the unchanged v6
  `pulpWars.save.current` coexist; each route reads/writes/resumes/replaces,
  restarts, and deletes only its own key, and route switching causes no
  cross-version Replace/Delete prompt or mutation;
- equal v6/v7 all-Original setup map/PRNG parity and no new PRNG consumption;
- all 25 nodes, formulas, 12 improvements, 13 roles, five tier-3 trainables,
  rewards, roads, capacity, capture, Walls, negative population, training,
  promotion, healing, Spoils, Pillage, and Disband;
- Pursuit termination/three-attack ceiling across kill, retaliation death,
  city defense, non-unit removals, promotion, chests, hidden contact, Capture,
  Wait, End Turn,
  save/resume, and replay;
- Defection timing for target seats before/after initiator in 2/3/4-player
  order, one complete target reply, reward-unit conversion, city occupation,
  reservation loss, capture, negative population, Barracks loss, multiple marks,
  elimination, ownership cleanup, save/resume, and replay equality;
- Concealment observation equivalence across view, paths/ZOC, guessed IDs,
  Push/displacement, commands, previews, stats, selections, AI tuples, canonical-
  to-player event projection, animations/logs, reconnect, leaderboard, safe log,
  and omniscient debug boundaries;
- Blackout unit-vs-city detection, global-round cooldown after conversion,
  capped suppression, action blocking, alternating Saboteurs, capture/recapture,
  one complete unaffected owner turn, death/elimination, and timer replay;
- deterministic Normal participation, no `MOVEMENT_ILLEGAL` retry/stall,
  scheduled browser yielding, headless/browser parity, 30,000-command/750-round
  caps, and the complete telemetry inventory;
- native/enlarged/context visual review, asset manifest completeness,
  `art:validate`, v7 class review commands, square-footprint/anchor/scale/layer
  checks, responsive/accessibility UI, browser smoke, and production build.

The v7 release corpus is new and approved separately; its refresh command is
never a routine gate. Dependency/audit and complete release gates follow the
repository's risk-based validation policy. No implementation bead may label
Ruleset 7 playable until browser setup through outcome, persistence/replay,
Normal AI, all required production assets, browser smoke, deterministic corpus,
and v6 compatibility route pass together.

## 14. Frozen judgments

The following choices close every proposal alternative for the first v7
playable baseline:

- Ruleset 7 is Original-only; Candy remains supported at `?ruleset=6` and is
  never silently adapted.
- The 25-node graph and research formula are unchanged.
- Mine is 6/+4, Quarry 5/+3, Forge 6/+3 per Mine cap 18, and Stoneworks 6/+2
  per Quarry plus +2/opposite pair cap 16.
- Quarrying unlocks the 6-Coin one-per-city Barracks for +1 capacity.
- Drill grants +2 first-hostile-city Spoils; Explosives grants terminal +1
  Pillage; Recovery grants half-cost trainable-unit Disband.
- Catapult is Attack 3.5, cost 8, range 2–3, cannot move-and-fire, and uses
  Defense 0.5 retaliation only at range 2–3.
- Lancer is cost 9 with a maximum of three total attacks and at most two Pursue
  cells between qualifying kills.
- Envoy performs full delayed ownership conversion, including reward units,
  only after one complete target-owner reply and with a live capacity
  reservation; conversion is exhausted.
- Saboteur uses viewer-relative concealment, radius-1 ordinary/city and radius-2
  Scout detection, hostile-unit Blackout blocking, 3-Coin suppression, one
  affected action turn, `actionRound + 3` unit cooldown, and one complete
  unaffected city-owner turn of recovery.
- No role-ID matchup damage modifier exists. These are portable archetypes,
  while Original's exact names, art, stats, and mechanics are faction-specific.
