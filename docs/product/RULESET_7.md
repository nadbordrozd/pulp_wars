# Pulp Wars Ruleset 7

**Status:** revision-3 runtime baseline; partially superseded by the
authoritative [revision-4 biome-economy specification](RULESET_7_REVISION_4_BIOME_ECONOMY.md)

**Runtime ruleset ID:** `pulp-wars-poc-7r3`

Revision 4 is approved for implementation under exact ruleset ID
`pulp-wars-poc-7r4`. Its specification supersedes this document wherever it
defines map generation, biome/resource state, Mine/Forge economy, associated
Normal-AI and public-view behavior, save identity/cleanup, or validation. The
remaining revision-3 rules stay authoritative. Until that implementation
lands, this file also describes the current runtime; revision-3 passages that
conflict with the linked revision-4 specification are historical baseline and
must not be copied into the implementation.

**Design history:**
[Original technology-tree redesign proposal](ORIGINAL_TECH_TREE_REDESIGN_PROPOSAL.md)
and [Ruleset 7 design review](RULESET_7_DESIGN_REVIEW.md)

**Compatibility contract:** [Pulp Wars Ruleset 6](RULESET_6.md)

**Related contracts:** [client architecture](../architecture/CLIENT_ARCHITECTURE.md),
[headless simulation](../architecture/HEADLESS_SIMULATION.md),
[Normal AI](../architecture/NORMAL_AI.md),
[screen flow](../ui/SCREEN_FLOW.md), and
[art direction](../art/ART_DIRECTION.md)

Ruleset 7 revision 3 is the approved Original-faction rapid-prototype baseline.
It replaces revision 2's five branches with a 21-node four-branch graph,
replaces Envoy and Lancer with Horse Archer, consolidates Mountain economy into
one Mine path, and removes Barracks. It retains the reviewed growth/reward,
achievement, Concealment, and Blackout systems. The proposal and revision-2
design review remain design history; alternatives, arithmetic, and review
questions in them are not normative.

Ruleset 7 does not alter Ruleset 6. Candy remains fully playable only in the
frozen Ruleset-6 route until it receives its own separately approved Ruleset-7
registration. A v7 parser never substitutes Original rules, labels, or art for
Candy.

## 1. Version, routing, compatibility, and frozen order

### 1.1 Version identifiers

New v7 data uses these exact identifiers:

| Boundary              | Exact value                    |
| --------------------- | ------------------------------ |
| Ruleset               | `pulp-wars-poc-7r3`            |
| Game-state schema     | `7`                            |
| Command envelope      | `pulp-wars-command`, `7`       |
| Canonical event batch | `pulp-wars-events`, `7`        |
| Player event batch    | `pulp-wars-player-events`, `7` |
| Save envelope         | `pulp-wars-save`, `7`          |
| Browser autosave      | `pulpWars.save.v7r3.current`   |
| Replay file           | `pulp-wars-replay`, `7`        |
| Map revision          | `SPATIAL_ECONOMY`              |
| Faction               | `ORIGINAL`                     |
| Faction tree          | `ORIGINAL_BASELINE_V4`         |

Game state, setup, command/event envelopes, saves, and replays are strict exact-
key schemas. Unknown fields, sparse arrays, unsafe integers, wrong versions,
wrong ruleset IDs, and missing required fields reject atomically. Half-point
stats use integer half-units. Canonical JSON, SHA-256 state hashes, Mulberry32
version 1, uint32 seeds, immutable rules data, monotonic positive entity IDs,
and round-half-up rational arithmetic remain the shared kernel contracts.

Versions 1 through 6 are recognized as incompatible by v7 save/replay readers,
preserved byte-for-byte, and never migrated or replayed under v7. Earlier v7
ruleset/tree identities are also recognized and rejected rather than migrated,
reinterpreted, or loaded under revision 3. Ruleset-6 readers remain available
and continue to read v6 only. The one historical v6 save normalization for a
missing `treasureChests` field remains confined to the v6 loader and is not
copied into v7.

### 1.2 Browser and headless routing

- The normal browser entry and `?ruleset=7` launch Ruleset 7.
- Exact query `?ruleset=6` launches the existing Ruleset-6 browser, including
  Original/Candy setup and v6 save resume. It is a supported compatibility
  route, not a development-only flag.
- Any other nonempty `ruleset` value shows an unsupported-ruleset error and
  creates no match. It never falls back to v7 or v6.
- Ruleset 7 revision 3 reads, writes, resumes, replaces, restarts, and deletes
  only the `pulpWars.save.v7r3.current` autosave key.
- On revision-3 browser startup, before Hub save-state derivation, remove the
  two known incompatible prototype keys `pulpWars.save.v7.current` and
  `pulpWars.save.v7r2.current`. Report whether either key was removed. Do not
  parse, migrate, reinterpret, or offer those saves. Cleanup is limited to
  those exact keys: preserve the Ruleset-6 `pulpWars.save.current` key,
  `pulpWars.settings.v1`, and all unrelated browser storage.
- Switching between the normal/v7 route and exact `?ruleset=6` never prompts
  deletion or replacement of the other active version's save. Starting a new
  match may offer Replace only when that route's own autosave exists; explicit
  Delete or Restart affects only that same route's key.
- Headless match/batch requires `--ruleset pulp-wars-poc-7r3` for revision 3.
  Replay dispatch selects by numeric envelope version and then requires exact
  `setup.rulesetId`; the selected ruleset's Original faction registration and
  each reconstructed player's state `factionTreeId` must derive to
  `ORIGINAL_BASELINE_V4`. `MatchSetupV7` has no tree-ID field. Unknown or
  mismatched identifiers reject rather than falling back.

Settings remain shared in `pulpWars.settings.v1`; save storage does not.
Version selection and route-owned key selection occur before ruleset-specific
state parsing.

### 1.3 Frozen identifier orders

These arrays define serialization, canonical iteration, UI order, AI tie-breaks,
and content ordinals.

`FactionId`: `ORIGINAL`.

`FactionTreeId`: `ORIGINAL_BASELINE_V4`.

`TerrainId`: `GRASS`, `FOREST`, `MOUNTAIN`.

`ResourceId`: `FRUIT`, `FERTILE_GROUND`, `GAME`.

`ImprovementId`: `FARM`, `LUMBER_CAMP`, `MINE`, `WINDMILL`, `SAWMILL`,
`FORGE`, `WORKSHOP`, `GRAND_WORKS`, `MARKET`, `MONUMENT`. `ROAD` remains a
separate boolean infrastructure layer.

`AchievementId`: `ENGINEER`, `MUSTER`.

`UnitRoleId`:

1. `FIGHTER`
2. `SCOUT`
3. `MARKSMAN`
4. `GUARD`
5. `RAIDER`
6. `MEDIC`
7. `CATAPULT`
8. `SABOTEUR`
9. `HEAVY`
10. `HORSE_ARCHER`
11. `BREACHER`
12. `JUGGERNAUT`

`TechnologyId`:

1. `GATHERING`
2. `FARMING`
3. `MILLING`
4. `MEDICINE`
5. `RECOVERY`
6. `HUNTING`
7. `FORESTRY`
8. `SAWMILLING`
9. `MARKSMANSHIP`
10. `FIELDCRAFT`
11. `SCOUTING`
12. `ROADS`
13. `COMMERCE`
14. `RAIDING`
15. `MOUNTED_ARCHERY`
16. `DRILL`
17. `FORTIFICATION`
18. `EXPLOSIVES`
19. `ENGINEERING`
20. `METALLURGY`
21. `GRAND_WORKS`

`CommandKind`:

1. `MOVE`
2. `ATTACK`
3. `BLACKOUT_CITY`
4. `HEAL_ADJACENT`
5. `RECOVER`
6. `CAPTURE`
7. `PROMOTE`
8. `PILLAGE`
9. `DISBAND`
10. `WAIT`
11. `RESEARCH`
12. `HARVEST_FRUIT`
13. `HUNT_GAME`
14. `BUILD_FARM`
15. `BUILD_LUMBER_CAMP`
16. `BUILD_MINE`
17. `BUILD_WINDMILL`
18. `BUILD_SAWMILL`
19. `BUILD_FORGE`
20. `BUILD_WORKSHOP`
21. `BUILD_GRAND_WORKS`
22. `BUILD_MARKET`
23. `BUILD_MONUMENT`
24. `CLEAR_FOREST`
25. `REPLANT_FOREST`
26. `BUILD_ROAD`
27. `REDEVELOP`
28. `TRAIN`
29. `CHOOSE_CITY_REWARD`
30. `END_TURN`

`RewardId`: `SURVEY`, `STOCKPILE`, `WALLS`, `MILITIA`, `EXPAND`, `BOOM`,
`JUGGERNAUT`, `TREASURY`.

`DomainEventKind`: `TURN_STARTED`, `INCOME_AWARDED`, `INCOME_PREVIEWED`,
`TURN_ENDED`, `TECH_RESEARCHED`, `FRUIT_HARVESTED`, `GAME_HUNTED`,
`ECONOMIC_BUILDING_BUILT`, `ECONOMIC_BUILDING_REMOVED`, `FOREST_CLEARED`,
`FOREST_REPLANTED`, `ROAD_BUILT`, `CITY_ECONOMY_CHANGED`, `CITY_LEVELED_UP`,
`CITY_REWARD_QUEUED`, `CITY_REWARD_CHOSEN`,
`CITY_REWARD_AUTOMATICALLY_GRANTED`, `CITY_TERRITORY_EXPANDED`,
`ACHIEVEMENT_UNLOCKED`, `MONUMENT_BUILT`,
`UNIT_TRAINED`, `UNIT_REWARD_GRANTED`, `UNIT_HEALED`, `UNIT_PUSHED`,
`UNIT_MOVED`, `UNIT_MOVE_INTERRUPTED`, `TILES_REVEALED`, `COMBAT_RESOLVED`,
`SABOTEUR_EXPOSED`, `BLACKOUT_PLANTED`, `BLACKOUT_ACTIVATED`,
`BLACKOUT_RECOVERY_STARTED`, `BLACKOUT_RECOVERY_COMPLETED`,
`IMPROVEMENT_PILLAGED`, `UNIT_DISBANDED`, `SPOILS_AWARDED`, `UNIT_RECOVERED`,
`UNIT_WAITED`, `UNIT_PROMOTED`, `UNIT_DIED`, `CITY_CAPTURED`,
`TREASURE_CAPTURED`, `PLAYER_ELIMINATED`, `MATCH_ENDED`.

`PlayerEventKind` uses that same order for retained projected facts, followed
by projection-only `UNIT_REVEALED` and `UNIT_CONCEALED`. Projection preserves
canonical relative order and inserts a reveal immediately before the first
fact that makes the entity public.

`CardinalDirection`: `NORTH`, `EAST`, `SOUTH`, `WEST` (retained for canonical
geometry even though v7 has no cardinal-direction command).

`BlackoutPhase`: `PENDING`, `ACTIVE`, `RECOVERY`.

Commands sort by command-kind order, target `(y,x)`, acting entity ID, then
referenced content ordinal. Paths compare lexicographically by their `(y,x)`
coordinate sequence after their destination. IDs and coordinate arrays sort
ascending and `(y,x)` respectively unless an exact section below says
otherwise.

For query ordering, target is tile `at`, Move destination, target
unit/city's current coordinate, or `(-1,-1)` when none. Acting entity is unit,
then city, then zero. Referenced content is Technology order, UnitRole order,
Reward order, Achievement order, or target entity ID; otherwise zero. This
ordering is derived from public view only.

## 2. Match setup, map generation, players, and turns

### 2.1 Exact setup

```ts
interface MatchSetupV7 {
  readonly rulesetId: "pulp-wars-poc-7r3";
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

V7 calls the unchanged Ruleset-6 `SPATIAL_ECONOMY` generator and lets that
generator complete its ordinary acceptance and chest placement. It does not
add, remove, or reorder a PRNG draw. Revision 3 then deterministically changes
every accepted Mountain tile whose resource is `ORE` or `STONE` to
`resource: null` before constructing v7 state. No other tile field changes.
For otherwise equal all-Original resolved setups, replacing only
ruleset/schema identifiers yields byte-identical terrain, settlements,
seat/capital assignment, turn order, Grass/Forest resources, treasure
coordinates, and post-generation Mulberry32 state; Mountain Ore/Stone markers
are the sole board-content difference.

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

The unchanged generator still consumes one uint32 resource draw for each
non-settlement coordinate in `(y,x)` using this Ruleset-6 table:

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

Its Ore/Stone draws and global resource-kind acceptance checks still happen
exactly as in Ruleset 6; the deterministic post-generation strip consumes no
draw. Revision-3 state therefore contains only `FRUIT`, `FERTILE_GROUND`, and
`GAME` resource IDs, and every Mountain begins with `resource: null`.

During unchanged Ruleset-6 candidate acceptance, every settlement must have at
least three economic opportunities and two families among its eight neighbors,
and every Ruleset-6 resource kind must occur globally. These are generator
pre-strip checks, not revision-3 state invariants: Ore and Stone do not survive
into revision-3 state or count as its available resource families. Rejected
candidates continue the same PRNG stream. After acceptance, the same
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
draw or chest removal.

### 2.3 Players, relationships, victory, and turn sequence

All seats begin with 5 Coins, `GATHERING`, a level-1 capital, one full-HP
Original Fighter assigned to that capital, locked/unspent `ENGINEER` and
`MUSTER` entitlements, and radius-2 exploration. Initial income is not prepaid.
`round` starts at 1. Turn order is stored explicitly.

In Rival mode every different owner is hostile. In Cooperative mode the stored
`humanPlayerId` is hostile to every AI, every pair of non-human AI seats is
allied, and no other alliance exists. Allies share detection of Saboteurs but
do not share exploration, economy, technology, Roads, units, healing, capacity,
or commands. AI allies cannot attack, capture, enter assigned allied territory,
or build there. Human-versus-AI relationships remain hostile.

A round ends after every player active at its start has acted or been
eliminated. End Turn skips eliminated seats and increments `round` after the
last stored seat. A player is eliminated immediately on owning zero cities:
remove its units by ID, normalize city Blackout records it owned or sourced as
specified below, cancel its choices, and skip future turns. Human-only survival
is Victory; human elimination is
immediate Defeat attributed to the capturing player. Headless all-AI play ends
with the final active player. There is no draw or rules turn limit.

Start Turn has this exact transaction order:

1. set the incoming active seat and emit `TURN_STARTED`;
2. reset activation for units already owned by that player, set ordinary
   capture eligibility, and mark recovery-phase Blackout cities of that owner
   as having begun their required unaffected turn;
3. activate `PENDING` Blackouts on that player's cities in ascending city ID;
4. calculate city income after siege and Blackout suppression,
   credit it in city-ID order, then emit `INCOME_AWARDED`;
5. evaluate that player's still-locked achievements after all income facts.

End Turn is unavailable during a mandatory choice. Its exact order is:

1. auto-recover eligible idle units in unit-ID order;
2. change `ACTIVE` Blackouts to `RECOVERY`; clear each `RECOVERY` whose owner
   completed the required unaffected Start-to-End turn;
3. clear timed Saboteur exposures anchored to this player's next End Turn;
4. emit `INCOME_PREVIEWED` for this player's next turn, then `TURN_ENDED`;
5. advance to the next seat and run the Start Turn transaction.

Pending choices delay End Turn and every dependent timer. Automatic boundaries
consume no PRNG and do not increment `commandIndex` independently of the
accepted `END_TURN` command.

## 3. Authoritative state and invariants

The v7 state contains the v6 board/player/city/population/unit/reward fields,
with the exact replacements below. It has no Candy or Chocolate-Wall state.

```ts
interface GameStateV7 {
  readonly schemaVersion: 7;
  readonly rulesetId: "pulp-wars-poc-7r3";
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
  readonly factionTreeId: "ORIGINAL_BASELINE_V4";
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly coins: number;
  readonly researchedTechs: readonly TechnologyId[];
  readonly explored: readonly Coord[];
  readonly spoilsClaimedCityIds: readonly CityId[];
  readonly achievementEntitlements: readonly AchievementEntitlementV7[];
}

interface AchievementEntitlementV7 {
  readonly achievement: AchievementId;
  readonly unlocked: boolean;
  readonly spent: boolean;
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
  readonly attacksUsed: 0 | 1 | 2;
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

interface SaboteurExposureV7 {
  readonly unitId: UnitId;
  readonly anchorPlayerId: PlayerId;
  readonly reason: "ATTACK" | "PILLAGE" | "BLACKOUT";
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
      }
    | {
        readonly kind: "MONUMENT";
        readonly achievement: AchievementId;
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

`attacksUsed` is `0 | 1 | 2` for Horse Archer and `0 | 1` for every other
role. `attacked` is true exactly when `attacksUsed > 0`. A trained or
reward-created Horse Archer starts wholly exhausted with `attacksUsed: 2`,
`attacked: true`, and `handled: true`; another trained/reward-created role
starts wholly exhausted with `attacksUsed: 1`, `attacked: true`, and
`handled: true`. Their other activation flags use the existing exhausted-unit
defaults. Start Turn resets every surviving owned unit to `attacksUsed: 0` and
`attacked: false` before play.

`blackoutEligibleRound` is a positive safe integer only for a Saboteur and is
`null` for every other role. A trained/rewarded Saboteur starts with value 1.
Exposure keys `(unitId, anchorPlayerId)` are unique; a new exposure replaces
the reason and extends, never shortens, the same boundary. Removing the
Saboteur or eliminating the anchor player clears the record immediately.

All entity arrays use unique monotonic IDs and canonical order. Units/walls do
not share cells because v7 contains units only. Every coordinate is on-board;
every home/territory/contribution reference resolves; role-specific state
matches its role; all exposure records name a living Saboteur and active anchor
player.
Each player's `achievementEntitlements` contains exactly `ENGINEER`, then
`MUSTER`. A spent entitlement is unlocked; neither flag ever changes from true
to false. Missing, duplicate, reordered, or inconsistent achievement state is
invalid under the revision-3 identity. Only population-producing
resources/improvements, Boom, and Monument create population contribution
records; Market never creates a zero-valued record. Every built
population improvement has exactly one matching LIVE record whose amount is
updated in place and may be zero while required contributors are absent. Every
Monument has exactly one matching +3 LIVE contribution naming the achievement
whose entitlement placed it.

City reward history contains at most one entry per reached level and none above
the current level. At most one pending choice exists globally; it is the first
unrewarded choice level in city-ID/reached-level scan order. A no-placement
automatic Treasury grant never appears in `pendingChoices`. Any later
unrewarded levels are legal only while that earlier modal choice blocks the
settlement scan. The recorded reward at level 2/3/4 must be legal for that
level; every recorded level at 5+ is Juggernaut or Treasury.

For each city, living assigned units consume capacity. Training requires
`living assigned < capacity`. Reward units may exceed capacity; no existing
unit is destroyed, but training remains disabled until the city is below its
current capacity.

## 4. Cities, population, territory, capacity, rewards, and achievements

### 4.1 Cities, growth, capacity, and level rewards

For level `L`:

```text
growthSpent(L) = L * (L + 1) / 2 - 1
population = permanentPopulation + economicPopulation - growthSpent(level)
next threshold = L + 1
capacity = L + 1
  + (current owner has Fortification ? 1 : 0)
```

All arithmetic is safe-integer, preflighted, and atomic. Positive changes level
repeatedly while progress meets the next threshold. Negative live change may
make population negative but never reduces level, reward history, or base
capacity. At Start Turn a non-besieged city produces:

```text
base = level + (isCapital ? 1 : 0)
market = current Market output
negative = min(0, population)
preBlackout = max(1, base + market + negative)
blackoutLoss = ACTIVE ? min(3, preBlackout) : 0
income = preBlackout - blackoutLoss
```

The one-Coin floor applies to every non-besieged city, including a non-capital,
after negative population. It is not credit or a population adjustment. Siege
still sets income to zero, and an active Blackout may suppress the floor for its
affected turn; the ordinary recovery boundary restores it.

An enemy on the city center besieges it: zero income, no training, and no
economic construction. Existing mandatory rewards remain resolvable. A unit
must occupy a neutral village or hostile city until its owner's next Start
Turn before Capture. Capture transfers city and assigned tiles, preserves
level/economy/rewards/Roads, re-homes the capturer, orphans other units
formerly assigned to the captured city, clears capturer eligibility, and then
checks elimination.

Each city begins with neutral cells in its centered 3 x 3 footprint. Level-4
Expand permanently claims neutral cells in its centered 5 x 5, preserves cells
assigned to other cities, and reveals every newly claimed cell. Capture
transfers the exact current footprint. A tile belongs to at most one city.

Each reached level receives exactly one stored reward:

| Reached level | Resolution                                                               |
| ------------: | ------------------------------------------------------------------------ |
|             2 | choose Survey: reveal radius 3, or Stockpile: +4 Coins                   |
|             3 | choose Walls: 4x city defense, or Militia: free Fighter                  |
|             4 | choose Expand: neutral 5 x 5 footprint, or Boom: +3 permanent population |
|      `L >= 5` | choose Juggernaut reward unit, or Treasury: +12 Coins                    |

After an economy mutation, every new `CITY_LEVELED_UP` fact is emitted before
this reward scan begins. Reward settlement scans cities by city ID and
unrewarded reached levels in ascending order. At the first level requiring
input it creates the sole pending choice and stops. Resolving that choice
records it and resumes the same scan before ordinary play. A level-4 Boom can
therefore expose the next level-5-or-higher modal choice before later city
work.

At any level `L >= 5`, if no legal Juggernaut placement exists when that reward
becomes next, Treasury is the only usable arm and is granted automatically for
12 Coins with the same event/history contract. The scan then advances until it
reaches another modal choice or finishes. Otherwise the two-arm choice is
queued. Militia/Juggernaut uses empty center, then owned
traversable city tiles by distance and `(y,x)`; an unavailable unit arm may not
be chosen. Reward units are full-health, assigned, exhausted, and may overfill
capacity. A pending Blackout does not block a reward.

City level never decreases, and reward history is keyed by unique reached
level. Capture, later population loss, rebuilding, and recomputation therefore
cannot repeat any reward. Coin overflow, unit placement, population changes,
all deterministic reward work through the next modal boundary, and event/ID
allocation are preflighted before the accepted command mutates state. A later
player choice is not knowable or preflighted by the command that first exposes
its modal; resolving that choice is its own accepted, atomic transaction.

### 4.2 Personal achievements and Monuments

Achievements are personal deterministic milestones, never races. Each player
begins with locked, unspent `ENGINEER` and `MUSTER` entitlements. Progress may
fall, but unlocking is permanent:

- **Engineer:** unlock when one currently owned `WINDMILL`, `SAWMILL`, `FORGE`,
  `WORKSHOP`, or `GRAND_WORKS` has a final current individual
  live population output of at least 6 after the dependency-ordered
  recomputation in section 5.3. Basic improvements, Markets, and Monuments do
  not qualify. Workshop's present maximum is 4, so it cannot
  satisfy the threshold under this revision even though it remains explicitly
  in the population-building class.
- **Muster:** unlock when the player simultaneously owns living units of at
  least four distinct trainable roles. Fighter and any technology-trained,
  treasure-granted, or otherwise reward-created trainable role count. Multiple
  units of one role count once. Reward-only Juggernaut does not
  count, and current research ownership is irrelevant.

After the final ownership, unit, economy, and reward mutation of each accepted
command or automatic turn boundary that can change either condition, evaluate
still-locked achievements in `ENGINEER`, `MUSTER` order. Unlocking emits
`ACHIEVEMENT_UNLOCKED { playerId, achievement }` in that same batch and does not
consume a command, Coin, action, or PRNG draw. It reveals no enemy state.

`BUILD_MONUMENT { achievement, at }` spends one unlocked, unspent entitlement.
It costs 0 and places the shared `MONUMENT` improvement with +3 LIVE population.
The target must be an explored, owned, non-site tile with no resource or
improvement, in a non-besieged and non-blacked-out city with no pending reward.
Any terrain is legal, an existing Road remains, and each city may contain at
most one Monument. The command marks the entitlement spent, creates the exact
live contribution, recomputes growth/rewards, and emits `MONUMENT_BUILT` before
economy and level facts.

Unlock and spent state remain with the player for the match. Loss, capture,
Pillage, or Redevelop never refunds a consumed entitlement or re-triggers its
achievement. After a Monument is removed, the same spent entitlement cannot
replace it, but the current owner may spend a different unlocked entitlement
on that now-eligible city if one remains unused. A captured Monument and its +3
contribution transfer with the city like other live improvements; its original
achievement provenance remains on the contribution, without an original-player
link and without spending or requiring the captor's matching entitlement. The
captor's own entitlements remain independent. Consequently a player can fund
at most two placements but can own more than two captured Monuments and receive
more than +6 Monument population. A Monument can be Pillaged or Redeveloped and
never produces Coins, recurring triggers, or further achievement progress.

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

| Ord | Branch             | Tier | ID              | Requires        | Exact unlocks                                                             |
| --: | ------------------ | ---: | --------------- | --------------- | ------------------------------------------------------------------------- |
|   0 | Settlement         |    1 | Gathering       | —; starts known | Fruit/Fertile reveal; Harvest Fruit                                       |
|   1 | Settlement         |    2 | Farming         | Gathering       | Farm; connected-field visuals                                             |
|   2 | Settlement         |    3 | Milling         | Farming         | Windmill                                                                  |
|   3 | Settlement         |    2 | Medicine        | Gathering       | Medic; Heal 4                                                             |
|   4 | Settlement         |    3 | Recovery        | Medicine        | Heal 6; idle friendly recovery 6; Disband                                 |
|   5 | Wilds              |    1 | Hunting         | —               | Hunt visible Game                                                         |
|   6 | Wilds              |    2 | Forestry        | Hunting         | Lumber Camp; Clear Forest                                                 |
|   7 | Wilds              |    3 | Sawmilling      | Forestry        | Sawmill; Catapult                                                         |
|   8 | Wilds              |    2 | Marksmanship    | Hunting         | Marksman                                                                  |
|   9 | Wilds              |    3 | Fieldcraft      | Marksmanship    | Replant Forest; Saboteur; Scout/Marksman Forest freedom; Marksman sight 2 |
|  10 | Mobility & Trade   |    1 | Scouting        | —               | Scout; sight 2; Scout detection radius 2                                  |
|  11 | Mobility & Trade   |    2 | Roads           | Scouting        | Road                                                                      |
|  12 | Mobility & Trade   |    3 | Commerce        | Roads           | Market; capital-Road bonus                                                |
|  13 | Mobility & Trade   |    2 | Raiding         | Scouting        | Raider; Charge                                                            |
|  14 | Mobility & Trade   |    3 | Mounted Archery | Raiding         | Horse Archer; Dash                                                        |
|  15 | Industry & Warfare |    1 | Drill           | —               | Guard; first-capture Spoils                                               |
|  16 | Industry & Warfare |    2 | Fortification   | Drill           | Fighter/Guard 2x defense in unwalled friendly city; +1 capacity per city  |
|  17 | Industry & Warfare |    3 | Explosives      | Fortification   | Breacher; Pillage                                                         |
|  18 | Industry & Warfare |    2 | Engineering     | Drill           | Mine; Workshop; Mountain entry and +1 Mountain sight for every role       |
|  19 | Industry & Warfare |    3 | Metallurgy      | Engineering     | Forge; Heavy                                                              |
|  20 | Industry & Warfare |    3 | Grand Works     | Engineering     | Grand Works; Redevelop                                                    |

The graph is exactly four roots, eight tier-2 nodes, and nine tier-3 nodes: five
Settlement, five Wilds, five Mobility & Trade, and six Industry & Warfare
technologies. Its frozen preorder is the table order above:

```text
Gathering (start)
├── Farming ───── Milling
└── Medicine ──── Recovery

Hunting
├── Forestry ──── Sawmilling
└── Marksmanship ─ Fieldcraft

Scouting
├── Roads ─────── Commerce
└── Raiding ───── Mounted Archery

Drill
├── Fortification ─ Explosives
└── Engineering ┬─ Metallurgy
                └─ Grand Works
```

Every non-root has exactly one research prerequisite, and there are no faction
fallback nodes. `METALLURGY` and `GRAND_WORKS` are sibling tier-3 children of
`ENGINEERING`; neither requires the other. The displayed placement rules for
Workshop, Grand Works, and Market create intentional cross-branch construction
requirements, not additional research edges.

Engineering reserves design room for one optional future trainable wildcard
role. Revision 3 defines no additional role ID, stats, ability, command, art,
UI control, or serialization for it. A later contract may use this extension
point only for a coherent battlefield job shown by playtest to be missing; it
may not be a random unit, a generic stat upgrade, or a compulsory counter absent
from the current roster. It adds no technology and requires a separately
versioned review before becoming gameplay.

A future fifth branch is reserved for coherent water/naval content. Revision 3
defines no water terrain, unit, technology, command, art, serialization, paid
placeholder, or empty UI branch. The research surface renders exactly the four
implemented branches and no fifth column or branch button.

### 5.2 Resources, visibility, and basic actions

Game is visible from match start on every explored Forest; Hunting gates use,
not visibility. Fruit and Fertile Ground reveal with starting Gathering. There
are no Ore or Stone resources in revision-3 state and no Mountain-resource
visibility gate.

Tile economy requires an explored tile assigned to an owned non-besieged city
without a pending reward for that city. A unit is not required and does not
block the action. Roads coexist and do not change validity.

| Action            | Tech        | Exact target                      | Cost | Result                                     |
| ----------------- | ----------- | --------------------------------- | ---: | ------------------------------------------ |
| Harvest Fruit     | Gathering   | Grass + Fruit                     |    2 | consume resource; +1 permanent population  |
| Hunt Game         | Hunting     | Forest + Game                     |    2 | consume resource; +1 permanent population  |
| Build Farm        | Farming     | Grass + Fertile Ground            |    5 | cover marker; Farm; +2 live population     |
| Build Lumber Camp | Forestry    | Forest, no resource/improvement   |    3 | Forest remains; +1 live population         |
| Build Mine        | Engineering | Mountain, no resource/improvement |    6 | Mountain remains; Mine; +4 live population |

Building a Farm replaces and covers Fertile Ground while the improvement
exists: the serialized tile's `resource` field becomes `null`, so no separate
underlying-resource field is added. Removing the Farm by Redevelop or Pillage
restores `FERTILE_GROUND` on unchanged Grass. A Mine has no marker prerequisite
and its removal leaves the preserved Mountain with `resource: null`. Removing a
Lumber Camp leaves its Forest but restores no Game. Harvested Fruit and Game
never regenerate, and removal of any other improvement restores no resource.
Restoration grants no refund or population; rebuilding pays the normal Coin
cost and recreates the ordinary live contribution.

Clear Forest requires Forestry, costs zero, targets owned explored Forest with
no site/resource/improvement, preserves Road, converts it to Grass, and grants
1 Coin. Replant requires Fieldcraft, costs 4, targets equivalent empty Grass,
preserves Road, converts it to Forest, and grants no population.

### 5.3 Processors, mixed buildings, and Market

Adjacent means all eight Chebyshev neighbors. Connected Farm/Camp clusters use
four orthogonal edges. Specialized processors count only same-city basic
improvements. Workshop, Grand Works, and Market count an adjacent improvement
owned by the same player even across city borders; cooperative allies are not
friendly contributors.

| Improvement | Cost | Placement/limit                                 | Exact live output                                                                                                            |
| ----------- | ---: | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Windmill    |    5 | one/city; touches Farm                          | +1 per Farm in touching orthogonally connected same-city cluster; cap 8; no base output                                      |
| Sawmill     |    5 | one/city; touches Lumber Camp                   | +1 per Camp in touching orthogonally connected same-city cluster; cap 8                                                      |
| Forge       |    6 | one/city                                        | +3 per adjacent same-city Mine; cap 18                                                                                       |
| Workshop    |    4 | one/city; at least one adjacent basic type      | 0 with no adjacent Farm/Camp/Mine type; otherwise +1 base plus +1 per distinct type; 2–4; cap 4                              |
| Grand Works |    7 | one/city; at least two adjacent processor types | 0 with fewer than two qualifying types; otherwise +4 base plus +2 per distinct qualifying type; 8 or 10; cap 10              |
| Market      |    7 | one/city; at least two adjacent families        | +1 recurring Coin for each Agriculture/Timber/Metal family, plus 1 when adjacent to a capital-connected friendly Road; cap 4 |

All listed buildings target an owned, explored, non-site tile with no resource
or improvement in a non-besieged city without a pending city reward. Subject
to the listed contribution requirements, underlying Grass, Forest, or Mountain
is legal and preserved. This common-land Workshop placement gives Engineering
a usable economic floor in a city with any adjacent Farm or Camp even when no
Mountain is present. Road is preserved.

Placement evaluates the listed minimum against the current graph. After
construction, Windmill, Sawmill, Forge, Workshop, and Grand Works remain on the
map when contributors are lost but produce zero below their applicable minimum
or empty formula and resume when qualifying support is rebuilt. Compute
basic-improvement contributions first; then specialized Windmill, Sawmill, and
Forge outputs; then Workshop and Grand Works. Grand Works counts a distinct adjacent
Windmill/Sawmill/Forge type only when that individual processor's
current output is positive, so an empty zero-output Forge cannot qualify it.
This dependency is acyclic. Market's unchanged family formula counts the
adjacent Agriculture (`FARM`/`WINDMILL`), Timber
(`LUMBER_CAMP`/`SAWMILL`), and Metal (`MINE`/`FORGE`) families and does not
acquire a positive-output requirement.

`REDEVELOP` requires Grand Works and removes any owned improvement, including
Monument, without cost, refund, or achievement-entitlement restoration. It
restores only the Farm production marker defined in section 5.2.
`BUILD_ROAD` requires Roads,
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
  or a Horse Archer's second Attack. It is terminal. It never targets Roads,
  terrain, resources, city centers, or Walls. Destruction restores only the
  Farm production marker defined in section 5.2; all other targets restore no
  resource.
- **Saboteur Pillage:** a Saboteur may Pillage without Explosives under the
  same target, payout, and terminal-action rules. Actor ownership/role is
  validated before applying this exception, so it cannot disclose a concealed
  or guessed enemy entity. A successful Saboteur Pillage exposes it to the
  improvement city's owner and formal allies through that owner's next accepted
  End Turn, exactly as an Attack exposure; Pillage has no separate cooldown.
  Every other role still requires Explosives.
- **Disband:** with Recovery, an owned trainable role may remove itself for
  `floor(trainingCost / 2)` Coins. It may follow ordinary Move but not another
  primary action or a Horse Archer's first Attack and is terminal. Juggernaut
  has no refund and may not Disband. Removal frees home-city capacity.
- **Fortification:** while its current owner has Fortification, every owned
  city has +1 capacity, including newly captured cities. Research only adds
  capacity. Capture or any ownership change recomputes the old/new owner tech
  effect; capacity loss never destroys an existing unit.

After build, removal, capture, territory transfer, or destruction, recompute
affected city live economy from the final graph in city-ID order. Emit the
building/destruction/capture fact first, then emit `CITY_ECONOMY_CHANGED`.
Apply every
reachable level increase and emit all `CITY_LEVELED_UP` facts in
city-ID/reached-level order before reward settlement. Then scan unrewarded
levels in that same order: emit and record each no-placement automatic
Treasury-12 grant, or emit the first `CITY_REWARD_QUEUED` and stop at that modal
boundary. Never emit a queued fact for an automatic grant, and never pre-create
facts for choices beyond the first pending modal.

## 6. Original roster, movement, combat, and lifecycle

### 6.1 Frozen role rules

Stats are base values; no technology silently mutates a numeric role stat.

| Role         | Unlock          | Cost |  HP | Attack | Defense | Move | Range | Min range | Move then primary? |
| ------------ | --------------- | ---: | --: | -----: | ------: | ---: | ----: | --------: | ------------------ |
| Fighter      | Start           |    2 |  10 |      2 |       2 |    1 |     1 |         1 | Yes                |
| Scout        | Scouting        |    4 |  10 |    1.5 |       1 |    2 |     1 |         1 | Yes                |
| Marksman     | Marksmanship    |    3 |  10 |      2 |       1 |    1 |     2 |         1 | Yes                |
| Guard        | Drill           |    3 |  15 |    1.5 |       3 |    1 |     1 |         1 | No                 |
| Raider       | Raiding         |    4 |  10 |      2 |       1 |    2 |     1 |         1 | Yes                |
| Medic        | Medicine        |    4 |  10 |    0.5 |     1.5 |    1 |     1 |         1 | Yes                |
| Catapult     | Sawmilling      |    8 |  10 |    3.5 |     0.5 |    1 |     3 |         2 | No                 |
| Saboteur     | Fieldcraft      |    6 |  10 |      2 |       1 |    2 |     1 |         1 | Yes                |
| Heavy        | Metallurgy      |    7 |  20 |    3.5 |     3.5 |    1 |     1 |         1 | Yes                |
| Horse Archer | Mounted Archery |    9 |  10 |      2 |       1 |    3 |     2 |         1 | Yes                |
| Breacher     | Explosives      |    6 |  10 |      4 |       1 |    1 |     1 |         1 | No                 |
| Juggernaut   | Reward only     |    — |  40 |      4 |       4 |    1 |     1 |         1 | Yes                |

Exactly 11 roles are trainable, including baseline Fighter; exactly five
tier-3 roles are trainable: Catapult, Saboteur, Heavy, Horse Archer, and
Breacher. Juggernaut is reward-only. The complete roster is 12 roles.

Fighter, Scout, Marksman, Guard, Raider, Heavy, and Juggernaut may Capture.
Medic, Saboteur, Catapult, Horse Archer, and Breacher may not. Guard, Catapult,
and Breacher cannot Attack after Move. Catapult cannot fire at range 1,
retaliate at range 1, Capture, or advance. Marksman attacks at range 1–2 and
does not advance on a ranged kill. Horse Archer attacks at range 1–2 and never
advances, including after an adjacent kill.

Minimum range limits only the chosen target. An adjacent enemy cannot be
targeted by a Catapult, but its presence does not globally silence that
Catapult: if action state and geometry permit, the Catapult may still attack a
different visible hostile unit at range 2–3. Occupancy, ZOC, screening, and the
adjacent unit's own attack create the close-range pressure through ordinary
rules.

Scout sight is 2. Fieldcraft makes Marksman sight 2 and removes Forest movement
termination for both Scout and Marksman. Other base sight is 1. Engineering
adds 1 sight while on Mountain and permits all roles to enter Mountain. No
revision-3 role ignores hostile ZOC.

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
Engineering is required for Mountain.

Entering a cell adjacent to a visible or newly detected hostile unit ends Move
after that step. A unit may leave ZOC; ZOC does not pin or prohibit Attack.
No role ignores this termination. Allied units occupy cells but do not project
hostile ZOC.

Each ordinary unit may Move once. Attack, Heal, Blackout, Pillage, and Disband
are primary actions under their stated restrictions. Recover, Capture, and
completed primary specials are terminal. Wait sets only `handled`; it does not
consume later legality or prevent idle auto-recovery. Promote is free once at
three kills, including retaliation kills; it adds 5 max/current HP and never
refreshes movement, attacks, or any action state. New trained/rewarded units are
handled and otherwise exhausted until their next Start Turn.

Explicit Recover heals 4 in friendly territory and 2 elsewhere. End Turn
auto-recovers by the same amount only for a unit that did not move, attack,
heal, recover, capture, or use a special. With Recovery, a wholly
idle unit in friendly territory heals 6. Healing never clears Blackout,
exposure, cooldown, or Horse Archer attack usage.

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
Mountain, or Forest; otherwise 1x. Breach forces 1x.

The `WALLS` reward is a city defense flag, not a map entity or combat target.
Ruleset 7 has no Chocolate Wall or other destructible structure command.

A surviving adjacent attacker advances after killing a unit, then reveals
normal sight. A ranged kill never advances, and Horse Archer never advances at
any range. Every Horse Archer strike retaliates normally when the defender's
range permits. No rule contains a role-ID-specific damage bonus:
all counters emerge from these universal stats, ranges, actions, geometry,
retaliation, terrain, city defense, capacity, and price.

Against a full-health 15-HP Guard under 4x Walls, a full-health Attack-3.5
Catapult initially deals 4 damage. With no other interference and one owner
heal between firing turns, one Catapult makes no lasting progress against
either ordinary friendly recovery 4 or Recovery 6. Two Catapults kill in three
firing turns under either heal rate; the per-turn shot sequences are `4,4`,
then `4,6`, then `5` against heal 4 and `4,4`, then `4,5`, then `5,5` against
heal 6. Three Catapults kill in two firing turns. One full-health Catapult plus
one full-health Breacher kills the same full-health defender in one coordinated
turn if both already have legal attacks. These are deterministic diagnostic
scenarios, not proof that either siege role is balanced or survives the setup.

### 6.4 Portable faction archetypes

Future faction registrations may change names, art, exact stats, and signature
mechanics, but their complete roster must preserve these battlefield jobs at a
comparable research/price horizon. Combining or splitting jobs is allowed only
when the full roster still supplies the pressure and its practical counterplay.

| Archetype     | Original role | Invariant job                                                                      |
| ------------- | ------------- | ---------------------------------------------------------------------------------- |
| Generalist    | Fighter       | Cheap capture body, baseline screen, efficient ordinary trade                      |
| Explorer      | Scout         | Early mobility/sight that converts information into expansion and timely detection |
| Basic ranged  | Marksman      | Mobile short-range pressure with low durability                                    |
| Defender      | Guard         | Cheap high-defense occupation that makes frontal melee inefficient                 |
| Flanker       | Raider        | Affordable fast single-target closer against exposed ranged/support units          |
| Support       | Medic         | Sustains allies while sacrificing direct offense and tempo                         |
| Artillery     | Catapult      | Costly long-range siege with a close-range/setup weakness                          |
| Infiltrator   | Saboteur      | Hidden access to neglected rear areas and bounded city/economic disruption         |
| Anchor        | Heavy         | Capacity-efficient durable front-line concentration and displacement               |
| Mobile ranged | Horse Archer  | Fast two-shot pressure that trades capture and repositioning for ranged tempo      |
| Direct siege  | Breacher      | High-risk adjacent answer to extreme static defense                                |
| Super-unit    | Juggernaut    | Frequent reward-only strategic concentration that ordinary rosters can answer      |

The safety envelope is as invariant as the spectacular effect: Mobile ranged
has exactly two total attacks, cannot reposition after firing, cannot Capture
or advance, and gains no promotion/reward/action reset; an Infiltrator has
timely universal/comparable detection, fails against active picketing, and has
both per-unit cooldown and per-target recovery. A future faction may express
these jobs differently, but may not remove their practical counters or replace
them with hardcoded role matchup damage.

## 7. Horse Archer and Saboteur state machines

These systems are deterministic serialized rules. They consume no gameplay
PRNG. Their counters are ordinary positioning, durability, range, detection,
timing, capacity, and price—not hidden role matchup bonuses.

### 7.1 Horse Archer: guaranteed two-shot activation

1. Start Turn resets every Horse Archer to `attacksUsed = 0`, `attacked =
false`, and ordinary activation defaults. With Dash it may take its one
   ordinary Move before firing, subject to normal terrain, exploration,
   occupancy, and hostile-ZOC termination.
2. A legal Horse Archer Attack targets one visible hostile unit at Chebyshev
   range 1–2. Each accepted Attack increments `attacksUsed` before ordinary
   combat resolution. Its two-shot allowance does not depend on a kill: if it
   survives its first Attack, it retains one second Attack even after a
   nonlethal result.
3. After the first Attack, set `attacked = true` and leave `handled = false`.
   The unit may not Move, Capture, Recover, Heal, Blackout, Pillage, Disband, or
   use another primary/terminal action. It may later Attack any legal range-1/2
   target from its unchanged coordinate, Promote if ordinarily eligible, or
   Wait. Wait remains advisory: it sets `handled = true` but does not consume or
   hide the legal second shot. The player may act with other units or End Turn
   before using the second shot; there is no global command lock, sequence
   phase, or forced menu.
4. The second accepted Attack sets `attacksUsed = 2` and `handled = true` after
   combat resolution. A killed Horse Archer is removed normally. Promotion,
   rewards, kills, loot, Wait, and acting with another unit never reset
   `attacksUsed`, `moved`, or `attacked`. End Turn discards an unused second
   shot; the next Start Turn performs the ordinary reset.
5. Horse Archer never advances into a killed defender's tile, including on an
   adjacent shot, and never becomes Capture-eligible. It receives ordinary
   retaliation whenever the target's minimum/maximum range includes the attack
   distance. It has no hostile-ZOC immunity.

The ceiling is two total attacks per activation, not two additional attacks.
The allowance is represented only by the unit's existing activation fields;
there is no Pursuit state, command, event, telemetry family, or global action
lock. Public view, action dock, preview, and AI expose read-only
`attacksUsed`/`2 - attacksUsed` values for Horse Archer.

### 7.2 Saboteur: Concealment, exposure, and Blackout

Concealment is a passive viewer-relative rule. An enemy Saboteur entity is
omitted unless at least one condition holds:

- it is within Chebyshev 1 of that viewer's unit or city center;
- it is within Chebyshev 2 of that viewer's Scout;
- an exposure record anchored to that viewer or its formal ally is live.

Owners always see their own Saboteurs. Formal allies share detections.
Detection ignores terrain and Walls. It reveals only the entity/current
coordinate, not unexplored surrounding terrain. Leaving detector range restores
Concealment unless an exposure reveal remains. Detection is recomputed
after every movement step, ownership change, death, spawn, and turn boundary.

An ordinary Attack by a Saboteur creates an exposure to the target owner and
its formal allies through the end of that owner's next accepted End Turn.
Pillage creates the same exposure to the improvement city's owner, and Blackout
creates it for the target city owner. Repeated exposure extends to the new
boundary. Exposure changes observation only; it does not change combat stats,
target legality for a viewer that still cannot observe it, or terrain
exploration. Pillage uses no Blackout cooldown and does not create city
Blackout/recovery state.

`BLACKOUT_CITY { unitId, cityId }` is a terminal primary action after optional
ordinary Move. It requires:

- a living owned Saboteur that is primary-action ready;
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
ownership changes. The action grants no Coins, damage, spawn, or population
change.

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

### 7.3 Hidden occupancy and shared interactions

Public movement treats an undetected Saboteur and its ZOC as absent. Authority
resolves an offered path stepwise:

- attempting to enter its occupied cell stops on the legal prefix before it;
- entering its newly detected hostile ZOC stops on the entered cell;
- either outcome accepts the command, consumes Move, reveals the Saboteur to
  the detecting side, and uses ordinary public interruption reason
  `OCCUPIED` or `ZOC`; it never rejects with a hidden-specific error;
- a first-step occupied contact may leave the mover at origin but still consumes
  its movement action.

Attack, Heal, and entity-targeted commands cannot name an undetected Saboteur.
Guessed IDs return the same generic target-not-found result as an empty or
unseen ID. Push previews report `UNKNOWN_BEHIND_FOG` for nonpublic occupancy;
actual contact reveals only when resulting geometry detects it.

City/Wall multipliers apply normally to Horse Archer and Saboteur combat.
Blackout causes no retaliation and ignores multipliers. Healing does not clear
any new state. Start/End boundaries, not animations or wall-clock time, advance
every timer.

## 8. Commands, validation, events, and transaction order

### 8.1 Exact command payloads

```ts
type CommandV7 =
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
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
        "RECOVER" | "CAPTURE" | "PROMOTE" | "PILLAGE" | "DISBAND" | "WAIT";
      readonly unitId: UnitId;
    }
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyId }
  | { readonly kind: TileCommandKindV7; readonly at: Coord }
  | {
      readonly kind: "BUILD_MONUMENT";
      readonly achievement: AchievementId;
      readonly at: Coord;
    }
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

`TileCommandKindV7` is command ordinals 12–22 and 24–27; Monument has its
separate achievement-bearing arm. Attack has no structure arm in Original-only
v7. Command envelope keys are exactly `format`, `version`, `command`. Every
parser checks exact payload keys and frozen IDs before rule validation.

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
invalid-tile code.
Monument follows bounds/exploration/owned-city, siege, Blackout, pending-reward,
one-per-city, and empty-tile gates, then `ACHIEVEMENT_NOT_UNLOCKED` and
`ACHIEVEMENT_ENTITLEMENT_SPENT`, in that order; it has no Coin or tech gate.
Research after common gates is `TECH_NOT_FOUND`,
`TECH_ALREADY_RESEARCHED`, `TECH_PREREQUISITE_MISSING`,
`INSUFFICIENT_COINS`, `INTEGER_OVERFLOW`. Train validates city existence,
ownership, siege, Blackout, pending reward, role trainability/unlock, center
occupancy, capacity, Coins, then overflow.

Revision-3 special commands use these exact post-actor orders:

- A Horse Archer's second Attack uses the ordinary Attack target/relationship/
  range order after checking role, `attacksUsed === 1`, survival, and its local
  activation restrictions. It is offered despite `attacked: true`; no special
  command kind or phase exists.
- Blackout: `UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`, `CITY_NOT_FOUND`,
  `TARGET_ALLIED`, `TARGET_OUT_OF_RANGE`, `BLACKOUT_PROTECTED`,
  `BLACKOUT_COOLDOWN`, `SABOTEUR_DETECTED`, `INTEGER_OVERFLOW`.
- Pillage: `UNIT_ALREADY_ACTED`, then `TECH_REQUIRED` unless the already
  validated owned actor is a Saboteur, then `PILLAGE_INVALID_TARGET`,
  `INTEGER_OVERFLOW`. The role exception is never evaluated for a missing,
  unowned, or concealed guessed actor.
- Disband: `TECH_REQUIRED`, `UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`,
  `INTEGER_OVERFLOW`.
- End Turn has no unit-sequence gate.

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

| Event                               | Exact payload                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `SABOTEUR_EXPOSED`                  | `{ unitId, anchorPlayerId, reason: ATTACK \| PILLAGE \| BLACKOUT }`                  |
| `BLACKOUT_PLANTED`                  | `{ cityId, sourceUnitId, sourceOwnerId, targetOwnerId, actionRound, eligibleRound }` |
| `BLACKOUT_ACTIVATED`                | `{ cityId, ownerId, suppressedCoins }`                                               |
| `BLACKOUT_RECOVERY_STARTED`         | `{ cityId, ownerId, reason: AFFECTED_TURN_ENDED \| CITY_CAPTURED }`                  |
| `BLACKOUT_RECOVERY_COMPLETED`       | `{ cityId, ownerId }`                                                                |
| `IMPROVEMENT_PILLAGED`              | `{ playerId, unitId, cityId, at, improvement, resourceRestored, coinDelta: 1 }`      |
| `UNIT_DISBANDED`                    | `{ playerId, unitId, role, coinDelta }`                                              |
| `SPOILS_AWARDED`                    | `{ playerId, cityId, coins: 2 }`                                                     |
| `CITY_REWARD_AUTOMATICALLY_GRANTED` | `{ playerId, cityId, reachedLevel, reward: TREASURY, coins: 12 }`                    |
| `ACHIEVEMENT_UNLOCKED`              | `{ playerId, achievement }`                                                          |
| `MONUMENT_BUILT`                    | `{ playerId, cityId, achievement, at, populationAdded: 3 }`                          |

Retained event payloads are exact v7-typed forms:

- `TURN_STARTED { playerId, coins }`, `INCOME_AWARDED` and
  `INCOME_PREVIEWED { playerId, totalCoins, cities: [{ cityId, coins }] }`,
  `TURN_ENDED { playerId }`;
- `TECH_RESEARCHED { playerId, tech, cost }`;
- resource actions `{ playerId, cityId, at, cost,
permanentPopulationAdded: 1 }`;
- `ECONOMIC_BUILDING_BUILT { playerId, cityId, at, improvement, cost,
populationContribution, marketIncome }` and
  `ECONOMIC_BUILDING_REMOVED { playerId, cityId, at, improvement,
populationContributionRemoved, marketIncomeRemoved, resourceRestored }`;
- `FOREST_CLEARED | FOREST_REPLANTED { playerId, cityId, at, coinDelta }`
  and `ROAD_BUILT { playerId, cityId, at, cost: 2 }`;
- `CITY_ECONOMY_CHANGED { cityId, economicBefore, economicAfter,
populationBefore, populationAfter, marketBefore, marketAfter }`,
  `CITY_LEVELED_UP { cityId, level }`,
  `CITY_REWARD_QUEUED { cityId, reachedLevel, candidates }`,
  `CITY_REWARD_CHOSEN { playerId, cityId, reachedLevel, reward, coinDelta }`
  where Stockpile is 4, Treasury at any level 5 or higher is 12, and every
  other choice is 0, and
  `CITY_TERRITORY_EXPANDED { playerId, cityId, tiles }`;
- `UNIT_TRAINED { playerId, cityId, unitId, role, cost, at }`,
  `UNIT_REWARD_GRANTED { playerId, cityId, reachedLevel, unitId, role }`,
  `UNIT_HEALED { medicId, targetUnitId, amount, hpAfter }`, and
  `UNIT_PUSHED { sourceUnitId, targetUnitId, from, to }`;
- `UNIT_MOVED { unitId, path }`,
  `UNIT_MOVE_INTERRUPTED { unitId, at, reason }`, and
  `TILES_REVEALED { playerId, tiles }`, where interruption reason is exactly
  `OCCUPIED | ENGINEERING_REQUIRED | ZOC`;
- `UNIT_RECOVERED { unitId, amount, automatic }`,
  `UNIT_WAITED { playerId, unitId }`,
  `UNIT_PROMOTED { unitId, maxHp }`, and
  `UNIT_DIED { unitId, cause }`, where cause is
  `ATTACK | RETALIATION | ELIMINATION` (Disband emits only `UNIT_DISBANDED`);
- `CITY_CAPTURED { cityId, from, to }`,
  `PLAYER_ELIMINATED { playerId }`, and
  `MATCH_ENDED { outcome }`.

For `ECONOMIC_BUILDING_REMOVED` and `IMPROVEMENT_PILLAGED`,
`resourceRestored` is exactly
`"FERTILE_GROUND" | null` under section 5.2's mapping.

`COMBAT_RESOLVED` includes attacker/target IDs, exact Attack and Defense
half-units, minimum/maximum range, Charge/Breach, defense multiplier, damage,
death, retaliation/no-retaliation reason, advance, Push, and Horse Archer
`attacksUsed`/`attacksRemaining`. `TREASURE_CAPTURED` retains requested/granted
`COINS | HEAVY`,
5/0 Coin delta, fallback, and optional spawned unit/location/home-city fields.

### 8.4 Transaction order

An accepted command preflights all costs, integer effects, allocations, and
determinable target choices only through the next modal boundary before
mutation. It then mutates atomically, emits domain facts in the stated order,
increments `commandIndex` exactly once, and deep-freezes the result. A future
choice exposed at that boundary is a separate command and transaction; the
original command cannot preflight an option the player has not selected.

- Research: deduct Coins, insert the technology in frozen order, and emit
  `TECH_RESEARCHED`. Fortification immediately changes capacity queries for all
  owned cities; no existing unit is removed.
- Economic build/harvest: deduct Coins; mutate tile/resource/improvement/Road;
  emit action/build fact; recompute economy;
  apply permanent population; emit economy and all new level facts; settle
  no-placement automatic Treasury-12 grants until the next modal choice, queue
  that choice, then evaluate achievements.
- Monument: validate and spend the entitlement; place Monument and its +3 LIVE
  contribution; emit `MONUMENT_BUILT`; recompute economy and levels; settle
  no-placement automatic Treasury-12 grants until the next modal choice;
  evaluate the other still-locked achievement. Monument itself is excluded
  from Engineer.
- City reward choice: record the reached-level reward once, apply its exact
  Coin/population/territory/unit result, emit choice and result facts, revalidate
  capacity after a reward unit, then resume reward settlement through any
  no-placement automatic Treasury-12 grants and the next modal choice before
  evaluating achievements. A no-placement Treasury follows the same order
  without an accepted choice command.
- Attack: resolve combat from one pre-exchange preview; emit
  `COMBAT_RESOLVED`, deaths, advance/Push, reveal, and final Horse Archer
  activation fields. Retaliation deaths use the same ordering.
- Capture: transfer city/territory; emit `CITY_CAPTURED`; normalize Blackout;
  grant/record Spoils; reveal; recompute economy;
  emit economy and all new level facts; orphan/re-home units; settle
  no-placement automatic Treasury-12 grants through the next modal and queue
  it; evaluate the captor's achievements; then elimination/outcome.
- Blackout: allocate/store state, set terminal activation, and emit the plant
  fact and exposure. No combat or income occurs.
- Pillage: destroy improvement and restore the exact section-5.2 production
  marker when applicable; grant 1 Coin; emit Pillage and any Saboteur exposure;
  recompute dependency-ordered live economy;
  emit economy and all new level facts; settle no-placement automatic
  Treasury-12 grants through the next modal and queue it; then evaluate
  achievements. Redevelop uses the same removal/restoration, economy, level,
  reward, and achievement sequence without the Pillage Coin or exposure.
- Disband: remove unit, grant refund, emit Disband, and cancel exposure records
  involving it.

## 9. Observation-safe views, events, queries, and artifacts

### 9.1 PlayerView

`PlayerViewV7` is the only rules input to browser presentation and Normal AI.
It contains schema/ruleset/command index, setup, human player ID, round/active
seat/turn order, the viewer's complete own player state, public player
identity/status, global leaderboard, projected board/cities/population values,
visible units and authority-derived stats, public chests, viewer-owned pending
choices, viewer-safe Blackout/exposure status, and outcome.

```ts
interface PublicPlayerV7 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: "CORAL" | "TEAL" | "GOLD" | "VIOLET";
  readonly faction: "ORIGINAL";
  readonly factionTreeId: "ORIGINAL_BASELINE_V4";
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
      readonly resource: ResourceId | null;
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
  readonly visibility?: PublicUnitVisibilityV7;
}

interface PublicUnitVisibilityV7 {
  readonly concealment?: "OWNER_CAPABILITY";
  readonly detection?: {
    readonly kind: "DETECTED";
    readonly breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE";
  };
  readonly exposures?: readonly {
    readonly reason: "ATTACK" | "PILLAGE" | "BLACKOUT";
    readonly boundary: {
      readonly kind: "ANCHOR_NEXT_ACCEPTED_END_TURN";
      readonly anchorPlayerId: PlayerId;
      readonly round:
        | { readonly known: true; readonly value: number }
        | {
            readonly known: false;
            readonly reason: "SAFE_INTEGER_OVERFLOW";
          };
    };
  }[];
}

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
  readonly rulesetId: "pulp-wars-poc-7r3";
  readonly commandIndex: number;
  readonly setup: MatchSetupV7;
  readonly humanPlayerId: PlayerId;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly viewer: PlayerStateV7;
  readonly achievementProgress: readonly AchievementProgressV7[];
  readonly players: readonly PublicPlayerV7[];
  readonly leaderboard: readonly PublicLeaderboardEntryV7[];
  readonly board: PlayerBoardViewV7;
  readonly cities: readonly PublicCityV7[];
  readonly populationContributions: readonly PublicPopulationContributionV7[];
  readonly improvementValues: readonly PublicImprovementValueV7[];
  readonly units: readonly PublicUnitV7[];
  readonly unitStats: readonly PublicUnitStatsV7[];
  readonly treasureChests: readonly Coord[];
  readonly blackoutStatuses: readonly PublicBlackoutStatusV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

type AchievementProgressV7 =
  | {
      readonly achievement: "ENGINEER";
      readonly currentMaximumOutput: number;
      readonly requiredOutput: 6;
    }
  | {
      readonly achievement: "MUSTER";
      readonly currentDistinctTrainableRoles: number;
      readonly requiredDistinctTrainableRoles: 4;
    };
```

`PublicPopulationContributionV7` retains every non-Monument contribution arm.
Its Monument contribution always exposes `amount: 3` when the building is
visible; fixed population is not private. Its source is exactly one of
`{ kind: "MONUMENT", visibility: "FULL", achievement, at }` for the current
owner or `{ kind: "MONUMENT", visibility: "BUILDING_ONLY", at }` for another
viewer. The full arm retains the contribution's source achievement after city
capture even if the current owner has not spent the matching entitlement. The
redacted arm has no achievement or original-player field, and neither arm
invents an original-player link.

`PublicPlayerV7` deliberately omits Coins, researched technologies, exploration,
Spoils history, achievement entitlements, and achievement progress for non-
viewers. `viewer` retains the owner's entitlement state, and
`achievementProgress` is derived only from that viewer's current public-own
state. Public tile/city/unit/status arms are exact discriminated unions:
redacted arms carry none of the omitted fields.

Projection rules are exact:

- Unexplored tiles contain coordinate and `explored: false` only, except the
  content-free allied-territory block. Every explored revision-3 resource is
  exact because all retained resource kinds are visible from match start.
- A city appears only when its center is explored. A normal unit appears on an
  explored tile. A Saboteur appears only when section 7.2 makes it visible to
  that viewer.
- Fresh projection adds `visibility` only when a visible unit has a special
  viewer-safe fact. An owned Saboteur receives the capability marker, never a
  promise that opponents cannot see it. A nonowner receives generic current
  detection without detector identity and applicable exposure records only for
  that viewer/formal ally. These reasons may overlap. Exposure `round` is derived
  from the stored current round and seat: an anchor before the active seat ends
  next round; the current or a later anchor ends this round. A maximum-safe
  round that cannot represent the increment retains the exact accepted-End-Turn
  boundary with `known: false`. The current owner sees all exposure records for
  its own unit, including after an ownership change; unrelated viewers never
  receive an anchor, recipient, or detector identity.
- `unitStats` contains one entry for each and only each visible unit, computed
  by authority in fixed HP, Attack, Defense, Move, Range, Sight order. It uses
  exact rational base/total values and separately attributed active modifier
  terms. Promotion modifies maximum HP; Charge modifies Attack; the one greatest
  defense multiplier reports its additive difference; Mountain modifies Sight.
  Roads, Fieldcraft, Concealment, two-shot allowance, and cooldown do not invent
  numeric Move/stat terms; they appear as ability/status data.
- A Defense or Sight row whose exact value could disclose an unexplored
  position omits every position-derived modifier, recomputes its displayed
  total, and carries optional `visibility: "BASE_ONLY"`; absence retains the
  exact prior contract. A public combat preview never treats a `BASE_ONLY`
  defender as exact.
- Owned improvement live values expose population or Market income. A
  Monument's fixed +3 is visible to every viewer who
  sees the building; only its source achievement is limited to the current
  owner. Another viewer sees an ordinary shared Monument without entitlement
  provenance. Processor contributors are exposed only when the underlying
  cells are public.
- Blackout owner/source details are complete to source and target owners. Other
  viewers get city phase only while the city is independently visible and no
  hidden source ID/location.
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
  income deltas by city, contribution, distinct types/families, connected
  coordinates, Road connection, limits, the exact post-removal
  `resourceRestored`, and resulting output-zero/resumption states. It applies
  the one-Coin non-besieged income floor and returns
  `complete: true` only for an exact public target.
- Monument preview includes achievement entitlement, one-per-city status, +3
  live population, resulting level/reward work, and the lost empty tile. It
  derives from owner-safe progress only. City reward preview shows the 12-Coin
  Treasury alternative at every level 5 or higher and whether lack of legal
  Juggernaut placement will grant it automatically.
- Combat preview uses the same rational calculation as resolution when the
  public defender stat is exact and includes Catapult minimum
  range/retaliation, Charge, Breach, Push certainty, damage, death, advance,
  and Horse Archer attacks used/remaining. It returns no exact preview for a
  `BASE_ONLY` defender. Preview uncertainty does not remove an otherwise legal
  offered Attack.
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

The `MONUMENT_BUILT` member of `PlayerEventV7` is exactly:

```ts
type ProjectedMonumentBuiltV7 =
  | {
      readonly kind: "MONUMENT_BUILT";
      readonly visibility: "FULL";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly achievement: AchievementId;
      readonly at: Coord;
      readonly populationAdded: 3;
    }
  | {
      readonly kind: "MONUMENT_BUILT";
      readonly visibility: "BUILDING_ONLY";
      readonly cityId: CityId;
      readonly at: Coord;
      readonly populationAdded: 3;
    };
```

`FULL` goes only to the current owner of the building's city at projection;
`BUILDING_ONLY` goes to any other viewer for whom the tile is independently
public. The latter omits builder/entitlement identity but not the publicly
knowable fixed population.

Projection may omit an event, redact fields, or add the presentation facts
`UNIT_REVEALED { unitId, at, reason }` and
`UNIT_CONCEALED { unitId, lastSeenAt }`. It obeys these rules:

- An unseen Saboteur's movement, selection, status, attack candidacy, ZOC, and
  location-bearing events are omitted.
- If an enemy Saboteur becomes detectable partway through movement, the
  projected batch begins with `UNIT_REVEALED` at the first detectable step and
  includes only the visible suffix. If it leaves all visibility, emit the
  visible prefix and `UNIT_CONCEALED` without final/path information.
- Contact interruption is shown only after contact itself makes the Saboteur
  detectable. The public `OCCUPIED`/`ZOC` result contains no former hidden path
  content.
- Saboteur Attack/Pillage/Blackout exposure emits `UNIT_REVEALED` before the
  visible combat/pillage/plant event to the target side. Other viewers receive
  only events allowed by their independent visibility.
- `ACHIEVEMENT_UNLOCKED` and achievement progress are owner-only.
  `MONUMENT_BUILT` uses the exact `FULL`/`BUILDING_ONLY` arms above. A captured
  Monument's current owner can inspect the source achievement retained on its
  population contribution; other viewers cannot. Captured Monument population
  follows ordinary visible-city economy projection.
- Projected removal/Pillage facts retain `resourceRestored` only as the
  viewer's after-state tile would show it: exact public Fertile Ground or
  `null`.
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

The existing v6 candidate structure, public-information boundary, and signed-
integer tie-break shape remain stable. Numeric economic, capacity, reward,
research-chain, and siege assumptions must be recalibrated for revision 3's
actual outputs and opportunity costs rather than copied from v6 or older v7
development contract. V7 adds these deterministic requirements:

- Horse Archer planning scores both guaranteed shots from the stationary
  post-Move firing coordinate. It evaluates exact preview damage, retaliation,
  target cost, survival, and the opportunity to split shots across two targets;
  it never assumes a kill. After the first shot, candidate reconstruction may
  choose another unit or End Turn, but must preserve the Horse Archer's legal
  second Attack for later consideration. Threat scoring includes Move 3 plus
  range 2, ordinary ZOC termination, no advance, no Capture, and no movement
  after firing; it adds no role-ID anti-Horse-Archer score.
- Reward choice compares the actual 12-Coin Treasury alternative with
  Juggernaut's 40 HP, one-slot concentration, Push, placement, and current
  army/economic need; 12 is not a hidden Juggernaut training cost.
- Blackout value is exactly attributable suppressed city income (cap 3) plus
  the public value of that turn's currently available Train/development
  actions, minus exposure and survival risk. It never assigns theft/spawn value.
  Normal garrisons a high-value rear city or positions a Scout picket when
  visible Saboteur risk justifies the opportunity cost, and respects city
  recovery and unit eligible round.
- Catapult plans only range 2–3 shots, screens adjacency, and accounts for one
  setup turn after moving. It forecasts target healing and coordinated shot
  count. An adjacent enemy is an immediate survival/targeting threat but does
  not prevent firing at another legal range-2/3 target. Anti-artillery units
  value attacking, occupying fire lanes, and forcing unsafe repositioning.
- Fortification includes one slot per owned city and must be valued on capture
  as well as research. Mine/Forge research uses dependency-ordered live output,
  not Mountain or building count. AI reconstruction recognizes zero-output
  buildings, restored Farm sites, ordinary rebuild cost, the one-Coin
  ruined-city floor, and output resumption.
  Spoils is valued only before that player's first hostile capture of a given
  city; Pillage
  includes the immediate live-output outage and 1 Coin but not permanent
  deletion of a Farm site. Raid danger and repair priority account
  for rebuild Coins/turns, contributor cascades, exposure, and likely survival.
  Disband is chosen only when its refund plus freed capacity exceeds retaining
  the unit under the standard safety score.
- Saboteur compares innate Pillage against Attack and Blackout using destroyed
  live value, exposure, survival, and tempo; it never assigns a cooldown to
  ordinary Pillage. Achievement progress and Monument placement use only the
  actor's public-own state. Normal values the free +3 live population, imminent
  reward thresholds, one-per-city limit, and lost tile opportunity, and never
  forecasts enemy research or hidden counterpressure.

The per-turn command cap remains 128, while the match caps remain 30,000
accepted commands and 750 rounds. The runner reserves enough slots to drain the
current reward queue and End Turn. A missing candidate,
rejection, non-advancing accepted command, or inability to end is a structured
failure. Browser AI executes at most one accepted command per scheduled slice,
returns to the event loop after each command and at least every 8 ms of policy
work, and supports Fast Forward by suppressing presentation rather than running
an unyielding synchronous loop.

Browser and headless use the identical v7 parser, registry, reducer,
projector, query/preview helpers, AI selector, canonicalizer, and map generator.
Required metrics include:

- command/event/error/stall counts and hashes; ruleset/setup/map/PRNG hashes;
- research adoption/first round for all 21 nodes and branch;
- Coin income/spend, one-Coin floor turns, negative-population losses, Spoils,
  Pillage, Disband;
- all resource conversions/restorations/rebuilds, 10 improvements, Roads, live
  contributions including zero-output outages/resumption, Fortification
  capacity, and overcapacity;
- Engineer/Muster progress and unlock rounds, Monument placements/transfers/
  losses, attributable population, and rewards reached from Monument growth;
- role training/actions/damage/kills/losses/captures/survival per Coin for all
  12 roles;
- Horse Archer shots per activation, first/second targets, split-fire choices,
  retaliation, survival, post-first-shot command interleaving, and attempted
  movement/Capture/advance violations;
- Saboteur concealed/detected/exposed turns by source, Blackouts blocked,
  suppression and actions denied, recovery turns, cooldown, and post-exposure
  survival;
- Catapult shot ranges, setup turns, healing between volleys, coordinated
  attackers, siege duration, and screen survival;
- observation-equivalence assertions and any hidden-information violation.

V7 receives new fixtures/corpora and never refreshes a v6 golden. Equal v6/v7
all-Original map inputs assert pre-strip generator/PRNG parity, then exact
Ore/Stone removal and no other board difference, separately from gameplay
hashes.

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
tile; only its permitted upward alpha participates in ordinary tile depth. The
retained global foreground pass renders improvement-value pips only, after all
tile rasters, so a tall neighboring raster cannot obscure the pips. It never
re-renders an improvement raster or changes selection/depth semantics.

Selecting a visible unit, city, or tile opens exactly one nonmodal dock. It
never opens the obsolete duplicate “Choose an action” surface. The map remains
pannable/zoomable and the fixed Canvas host, camera, zoom, and selection never
resize or jump when dock content changes. Docks omit tile coordinates.
The unit, city, and tile dock spans the full viewport width on desktop and
compact layouts. Identity and semantic facts may reflow or scroll within that
bottom bar, while its label-sized Close control remains reachable. Contextual
and tactical action buttons share one left-aligned, nonwrapping horizontal row;
only that row scrolls horizontally, by touch, pointer wheel, or focus-following
keyboard navigation, without creating page-level horizontal overflow. This
Ruleset-7 layout specializes the otherwise retained screen-flow dock contract.

Every exact unambiguous contextual command executes from one button activation
against the already-selected entity/tile. Harvest, Hunt, Build, Clear, Replant,
Road, Redevelop, Monument, Capture, Recover, Promote, Wait, Pillage, and Disband
never ask for the same target again and never add confirmation.
Training buttons dispatch their exact city/role immediately. Confirmation is
used only where this contract explicitly names one. Buttons are 176 CSS pixels
wide, at least 44 x 44, grow vertically, and remain in the dock's single
horizontally scrolling action row rather than wrapping into a vertical list.
Every Train card has a sibling question-mark help control. It opens a read-only
unit-help dialog containing the canonical recruit name, exact world sprite,
HP/Attack/Defense/Move/Range/Sight values, and plain-language abilities and
restrictions. The dialog has no Train action, Coin mutation, or command
dispatch. Escape and Close return focus to the originating help control.

Move and Attack remain highlighted on the map and are never duplicated as
destination/target buttons. After a Horse Archer's first shot, its legal second
targets remain ordinary Attack highlights whenever that unit is selected. The
dock shows two read-only shot indicators (used and remaining) and creates no
sequence dialog, end-sequence button, home-city choice, administrative submenu,
or global command lock.

Blackout highlights eligible adjacent cities only when more than one exists;
with exactly one, **Blackout** dispatches immediately. No command preview opens
an extra confirmation.

Unit identity uses the exact world sprite, compact name/HP, and then vertically
stacked HP, Attack, Defense, Move, Range, and Sight rows. Numeric modifier terms
appear as `Defense 2 + 1 + 2`; each `+N` has a hover/focus/touch tooltip naming
its source. Ability tags open explanatory cards for Capture, Charge, Heal,
Push, Breach, Dash, two-shot allowance, Concealment, Blackout, minimum range, and
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
not open a second confirmation; changing routes is never such an action. After
startup cleanup, the v7 Hub reports whether obsolete v7/v7r2 prototype saves
were removed, without exposing or offering their contents.

**Tech** opens the only research surface: a full-screen layer on compact screens
and large modal on wide screens. The full four-branch graph uses the frozen
tree geometry. Each card contains only a dominant 112 x 130 art viewport, name,
and current Coin cost when unresearched. No cost appears after research; no
“need N more Coins” text or status prose appears inside a card. Available,
unavailable, and researched use color plus distinct border/connector/check
shape. Selecting a card opens details with prerequisite, exact unlocks/formula,
state, and Research only when offered. Technology details express each unlock
as structured semantic bullets—units, actions, buildings, movement/sight, and
passive effects as applicable—rather than one dense prose string. Research
dispatches immediately without confirmation and keeps the tree/focus open. The
main match screen never exposes a Research button.
Wide screens show each branch name once as its accessible column heading and
omit redundant branch-jump controls. Compact/mobile and the 200% UI-scale
fallback show one readable branch selector; activation keeps keyboard focus on
the native selector while scrolling the corresponding branch into view. Ordinary wide-screen overlays use content-appropriate
bounded widths, and every Close control fits its label while retaining at least
a 44 x 44 CSS-pixel target.

An ACTIVE match exposes a clearly labelled **Main menu** action in the HUD.
It flushes the latest accepted authoritative boundary, cancels only pending AI
and presentation work, and returns to the route-owned Hub without deleting or
replacing the match. The existing **Resume** action restores that exact human,
AI, or mandatory-reward boundary; a save failure leaves the in-memory match
active with an actionable warning so the player can retry safely.

Mandatory city reward choices use the existing blocking popup and dispatch on
the chosen reward with no second confirmation. On desktop, reward buttons stay
in one horizontal row. A no-placement automatic
12-Coin Treasury uses a brief notice and never creates or flashes a one-button
modal. A mandatory choice suppresses Leaderboard and other overlays until
resolved.

An owner-only Achievements panel lists Engineer and Muster in fixed order with
exact current/required progress, locked/unlocked/spent state, and plain-language
conditions. It shows no opponent progress. Selecting an unlocked unspent entry
highlights legal Monument tiles; selecting a highlighted tile dispatches the
single `BUILD_MONUMENT` command immediately. An explored Monument is visible to
any viewer as the shared building with its fixed +3 population; its source
achievement badge is visible only to the building's current owner, including
after capture. Unlock uses a nonmodal notice and never interrupts another
command or mandatory reward.

City population shows only the current layer of `level + 1` tiny squares,
filled left-to-right; negative progress uses red leading squares capped
visually to the layer while semantic text states the full deficit. Windmill,
Sawmill, Forge, Workshop, Grand Works, and Market show one compact
code-native value square per public contribution, wrapping after eight;
supported population buildings explicitly show 0 while offline. Every publicly
visible Monument shows the same three population squares; only its
source-achievement badge is owner-only. No number is baked into building art.

Only the owner sees a concealed Saboteur marker. A detecting enemy sees a
Reveal/Detected state only while legal; exposure shows its exact safe
expiry/break condition. Undetected movement, targets,
threat overlays, animations, rejection text, logs, and semantic cursor content
are absent. Blackout UI distinguishes city-center reveal from hostile-unit
blocking without identifying hidden detectors.

The HUD's Leaderboard remains view-only and shows global cities/living units in
turn order, including concealed units only in the aggregate. It is usable
during AI work and mutates nothing.

### 11.3 Animation and accessibility

Accepted unit Move events slide the sprite along the projected path rather than
teleporting. Melee/ranged combat uses code-native lunge/jerk, projectile, impact,
and damage shake; Catapult uses a code-native arcing stone. Each Horse Archer
shot uses the same combat primitive without delaying rule boundaries.
Conceal/reveal is a short opacity crossfade; Blackout status transitions use
code-native attachment pulses. No animation changes events, sight, timing, or
hashes.

An active-human unit with an offered Move uses the accepted anchor-preserving
silhouette glow and 1–1.08 scale/1–0.62 opacity 1.6-second rhythm. Health and
owner cues remain steady; movement/combat suppress it. Reduced motion uses a
strong static 1.04 glow and schedules no travel/readiness animation. Full,
Fast, Reduced, pause/cancel/reproject, and live-region behavior retain the
screen-flow contract.

All actions have semantic names and visible labels, focus meets WCAG 2.2 AA,
meaning never relies on color/motion, and controls are at least 44 CSS px.
Revision 3 is a desktop rapid prototype: desktop layout and keyboard/pointer
behavior are acceptance scope; compact/mobile QA and GitHub Pages deployment
are not required for this revision. Canvas coordinates retain a semantic
activator with the same visible-occupant selection and immediate-dispatch
behavior.

## 12. Production asset inventory and geometry

Production raster art uses checked-in programmatic PixelLab scripts only.
Prompts, negative prompts, dimensions, model/settings, supported seeds,
candidate/output mapping, and deterministic postprocessing are recorded.
Credentials remain environment-only. Every new class starts with exactly three
individually inspected samples before bounded batches of at most three; the
orchestrator separately reviews native, enlarged, minimum/normal/maximum zoom,
DPR 1/2, terrain/city/improvement/neighbor, selection/status, and UI contexts.
Horse Archer is one mounted extension within the already sampled unit class,
not a new class: its one world sprite and portrait are each reviewed
individually under the bounded exception below.

Required v7 inventory is:

- 12 explicit Original role world-sprite registrations and 12 matching role
  portraits. Existing accepted assets are explicit aliases only; Horse Archer
  is the new revision-3 role asset.
- one shared Monument world sprite used by both achievements;
- raster action symbols for Blackout, Pillage, and Disband. Horse Archer shot
  counters, detection/exposure, Spoils, cooldown, and Blackout phases may be
  code-native symbols but must have explicit manifest/component registrations
  and semantic labels;
- 21 explicit `ORIGINAL_BASELINE_V4` technology-icon registrations. An accepted
  existing resource/building/unit icon may be aliased explicitly. Sawmilling
  may reuse Sawmill art while its detail lists Catapult; Fieldcraft may reuse
  its forest/Saboteur symbol; Mounted Archery may reuse Horse Archer; no key
  falls back;
- retained terrain, resource, city, economic-building, Road, Coin, population,
  reward, HUD, movement, combat, and shell inventory, with Windmill, Workshop,
  Grand Works, and Market values updated code-native.
  Achievement progress, entitlement state, and the current-owner-only source-
  achievement badge may be code-native but require explicit component
  registrations and semantic labels.

Every retained unit keeps its accepted source dimensions, anchor, scale,
transparent padding, and renderer registration unchanged. Horse Archer has a
bounded mounted-unit exception: its horse-and-rider body must be materially
broader and readable at native gameplay zoom, rather than squeezed into the
prior narrow mounted/standard-unit visible bounds or padded around an oversized
weapon. The subsequent art bead records and reviews the exact mounted canvas,
anchor, scale, alpha bounds, foot contact, overflow, and UI aliasing before any
production asset is accepted. This contract does not preselect those numbers.

Catapult uses the low-wide siege contract: transparent 384 x 384, anchor
`(192,288)`, scale `0.24`, shared downward offset, preferred bounds
`x=30..354,y=24..318`, hard bounds `x=16..368,y=8..336`, wheel contact within
10 x/6 y. It may be broader than standard units but cannot hide a city label,
adjacent target, or unit. Its projectile is not baked into the raster.

The already accepted Monument retains its processor/mid-building registration:
transparent 384 x 384 source, anchor `(192,288)`, scale `0.30`, preferred bounds
`x=24..360,y=24..326`, hard bounds `x=8..376,y=8..344`, shared upper-left key
light, and placement below unit/status layers. It stays within the 128 x 128
square on left/right/bottom and may overflow upward only.

Revision 3 requires three gravel-backed Original Mountain variants and three
corresponding integrated mined-Mountain references. Variant ordinal `0`, `1`,
or `2` maps to the same ordinal when a Mine is built; removal returns to that
same Mountain variant. The Mine visual must read as construction integrated
into the Mountain rather than a loose sprite stuck on top. The underlying
terrain remains `MOUNTAIN` in state throughout. Existing source files remain
unchanged until the subsequent art bead records this exact mapping and passes
its visual review.

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
Format/version/ruleset are `pulp-wars-save`/7/`pulp-wars-poc-7r3`. The UTF-8
limit is 1,572,864 bytes. ISO timestamp is metadata outside canonical state. Setup,
random state, command count/index, canonical state hash, and complete replay
reconstruction must agree before atomic installation.

V7 replay keys are exactly `format`, `version`, `setup`, `commands`, and
`checkpoints`; each checkpoint is exact `{ index, stateHash }`, indices strictly
increase within command count, and hashes are lowercase 64-hex SHA-256. Format
and version are `pulp-wars-replay` and 7. Replays require exact
`setup.rulesetId: "pulp-wars-poc-7r3"`, derive the Original faction registration
from that ruleset, and require every reconstructed player state to use
`ORIGINAL_BASELINE_V4`; there is no setup tree-ID field. They apply accepted
commands through the shared reducer as the stored active player, verify
checkpoints, and reject schema errors, command rejection, mismatch, or commands
after outcome. Saves/replays include Horse Archer attack usage,
exposure/cooldown, Blackout/recovery, Spoils history, capacity, reward history,
achievement entitlements, and Monument state through canonical state/commands;
Farm restoration is reproduced from the removed improvement and needs no hidden
underlying-resource field. No timer or hidden state is reconstructed from UI.

Autosave occurs at creation and every accepted command boundary after replay
append/checkpoint. It never captures an animation, transient target mode,
non-authoritative dialog, or AI thought. It does preserve mandatory rewards and
all new authoritative phases. Browser v7 persists this envelope only at
`pulpWars.save.v7r3.current`. Restart reproduces the identical v7 revision-3
setup/seed and replaces only that key; Delete removes only that key. The older
prototype keys `pulpWars.save.v7.current` and `pulpWars.save.v7r2.current` are
removed and reported on startup without parsing. The v6 key
`pulpWars.save.current`, shared settings, and unrelated storage are preserved.

### 13.2 Required compatibility and validation

Revision-3 prototype evidence must prove:

- strict version-7 revision-3 setup/state/command/canonical-event/player-event/
  save/replay parsing, exact `setup.rulesetId`, derived faction registration and
  state tree identity, round trips, invariants, hashes, and malformed-data
  rejection;
- versions 1–6 remain preserved/incompatible to v7, v6 goldens remain unchanged,
  and `?ruleset=6` can create/resume Candy while v7 rejects every Candy setup;
- older v7 ruleset/tree identities are recognized and rejected without
  migration or reinterpretation; old replays reject from exact setup identity;
- browser startup removes and reports only `pulpWars.save.v7.current` and
  `pulpWars.save.v7r2.current`, while preserving
  `pulpWars.save.v7r3.current`, v6 `pulpWars.save.current`, shared settings, and
  unrelated browser storage;
- unchanged v6 generator calls/draws, exact post-generation PRNG parity,
  deterministic Ore/Stone stripping, and no other board-content change;
- all 21 nodes in exact preorder, four/eight/nine tier counts, 10 improvements,
  12 roles, 11 trainables, five tier-3 trainables, contributor-loss zero
  outputs and resumption, Farm marker restoration but no Mine/Camp or other
  regeneration, the non-besieged one-Coin income floor and Blackout/siege
  exceptions, every-level-5+ choice/no-placement automatic reward ordering,
  Roads, Fortification capacity, capture, Walls, negative population, training,
  promotion, healing, Spoils, Pillage, and Disband;
- the 18-live package case, with no permanent population, no Market, and only
  non-population reward choices: Farm 2 + Windmill 1 + Mine 4 + Forge 3 + Grand
  Works 8 reaches level 5 with 4 progress, not level 6. Mine removal leaves 3
  live and -11 progress, sets Forge/Grand Works to 0, leaves regular/capital
  income at the 1/1 floor, and restores no resource. Mine rebuilding for 6
  restores 18 live and regular/capital income to 5/6, with no repeated level
  reward or Engineer unlock; siege remains zero and Blackout may suppress the
  floor;
- Engineer/Muster trigger and persistence, owner-safe progress, free Monument
  placement, one-per-city and two-entitlement limits, capture transfer,
  Pillage/Redevelop/loss without refund, no same-entitlement reuse or re-trigger,
  placement from a different unused entitlement after removal, public +3 with
  owner-only source achievement, nested growth and reward ordering, save/resume,
  replay, and deterministic AI placement;
- all level facts before sequential no-placement automatic-grant/first-queue
  facts, no ghost queue for automatic Treasury, atomic preflight only through
  the next modal boundary, and each later reward choice as its own transaction;
- Horse Archer's two guaranteed total attacks across nonlethal/lethal results,
  retaliation death, target changes, acting with another unit, Wait, End Turn,
  promotion, save/resume, and replay; no movement after the first shot, Capture,
  advance, ZOC immunity, reset, special command/event/phase, or global lock;
- Concealment observation equivalence across view, paths/ZOC, guessed IDs,
  Push/displacement, commands, previews, stats, selections, AI tuples, canonical-
  to-player event projection, animations/logs, reconnect, leaderboard, safe log,
  and omniscient debug boundaries;
- Blackout unit-vs-city detection, global-round cooldown after ownership change,
  capped suppression, action blocking, alternating Saboteurs, capture/recapture,
  one complete unaffected owner turn, death/elimination, and timer replay;
- Saboteur's 6-Coin cost, innate no-cooldown Pillage, exposure reason and
  boundary, and the unchanged Explosives requirement for every other role;
- deterministic Normal participation, no `MOVEMENT_ILLEGAL` retry/stall,
  scheduled browser yielding, headless/browser parity, 30,000-command/750-round
  caps, and the complete telemetry inventory;
- native/enlarged/context visual review, asset manifest completeness,
  `art:validate`, exact three-Mountain/three-integrated-Mine mapping, bounded
  mounted-unit geometry, desktop accessibility UI, browser smoke, and
  production build when their later implementation beads require them.

The checked Ruleset-7 release corpus and Normal-AI matrix prove only
the historical `pulp-wars-poc-7r2` runtime. They are not revision-3 evidence and
must not be relabeled or refreshed as a side effect of this specification.
Revision 3 is a local desktop rapid prototype; this specification does not
require GitHub Pages publication, compact/mobile QA, or a complete new release
matrix for every prototype pass. Later implementation beads assign focused and
risk-based gates before claiming revision-3 playability.

## 14. Frozen judgments

The following choices close every proposal alternative for the v7 revision-3
prototype baseline:

- Ruleset 7 is Original-only; Candy remains supported at `?ruleset=6` and is
  never silently adapted.
- The exact 21-node four-branch graph and research formula are authoritative.
  Engineering reserves a versioned future wildcard-role extension point but
  revision 3 adds no wildcard role or placeholder.
- The unchanged v6 generator/PRNG runs first; revision 3 then strips Ore/Stone
  without another draw. Mine is 6/+4 on any empty owned Mountain, and Forge is
  6/+3 per adjacent same-city Mine cap 18. Windmill is 5/+1 per connected Farm
  cap 8 with no base output.
- Workshop is 4/+1 base plus one per distinct basic type with minimum one;
  Grand Works is 7/+4 base plus two per distinct processor with minimum two and
  cap 10; revised buildings fall to zero below their support minimum and resume
  after rebuilding. Grand Works counts only positive-output specialized
  processors. Market counts three families and caps at 4; Sawmill is unchanged.
- Farm removal restores its covered Fertile Ground marker; Mine/Camp removal
  and consumed Fruit/Game restore nothing. Non-besieged city
  income has a one-Coin floor after negative population, subject to ordinary
  Blackout suppression; siege remains zero.
- Fortification adds +1 capacity to every owned city alongside its unwalled
  Fighter/Guard defense; Barracks does not exist.
- Drill grants +2 first-hostile-city Spoils; Explosives grants terminal +1
  Pillage; Recovery grants half-cost trainable-unit Disband.
- Every reached level after level 4 pairs a Juggernaut with 12 Coins; lack of a
  legal Juggernaut placement automatically grants the 12 Coins without a
  pending choice.
  Engineer and Muster each fund one free +3-live-population shared Monument,
  with one Monument per city, no refund or same-entitlement reuse, and public
  +3 population but owner-only source-achievement provenance.
- Catapult is Attack 3.5, cost 8, range 2–3, cannot move-and-fire, and uses
  Defense 0.5 retaliation only at range 2–3.
- Horse Archer is cost 9, 10 HP, Attack 2, Defense 1, Move 3, range 1–2, Sight
  1, and has two guaranteed total attacks after optional pre-fire Move. It
  cannot move after firing, Capture, advance, ignore ZOC, or reset its allowance.
- Saboteur costs 6 and has innate terminal +1 Pillage with ordinary exposure
  and no Pillage cooldown. It uses viewer-relative concealment, radius-1 ordinary/city and radius-2
  Scout detection, hostile-unit Blackout blocking, 3-Coin suppression, one
  affected action turn, `actionRound + 3` unit cooldown, and one complete
  unaffected city-owner turn of recovery.
- No role-ID matchup damage modifier exists. These are portable archetypes,
  while Original's exact names, art, stats, and mechanics are faction-specific.
