# Pulp Wars Client Architecture

**Status:** authoritative ruleset-6 client architecture

**Rules:** [Ruleset 6](../product/RULESET_6.md)

**UI contract:** [Screen Flow](../ui/SCREEN_FLOW.md)

## 0. Ruleset-6 replacement boundary

Ruleset 6 uses `pulp-wars-poc-6` and schema/command/event/save/replay version 6. The ruleset-5 interfaces and examples later in this file are retained only
as historical implementation context. Where an identifier, union, table,
currency, faction rule, or version differs, this section and Ruleset 6 are the
only active authority; code must not merge the two versions.

The dependency direction, renderer separation, strict TypeScript posture,
canonical JSON/SHA-256, Mulberry32, serialized dispatch, local-storage adapter,
Canvas geometry, responsive docks, and performance budgets remain unchanged.
Rules data now owns two explicit faction-tree registrations and may not infer a
tree from a faction label.

```ts
type FactionId = "ORIGINAL" | "CANDY";
type FactionTreeId = "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
type UnitRoleId =
  | "FIGHTER"
  | "SCOUT"
  | "MARKSMAN"
  | "GUARD"
  | "RAIDER"
  | "MEDIC"
  | "HEAVY"
  | "BREACHER"
  | "JUGGERNAUT";

interface MatchSetupV6 {
  readonly rulesetId: "pulp-wars-poc-6";
  readonly seed: number;
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: PlayerColor;
  readonly factions: readonly FactionId[];
  readonly mapGenerationRevision: "SPATIAL_ECONOMY";
}

interface GameStateV6 {
  readonly schemaVersion: 6;
  readonly rulesetId: "pulp-wars-poc-6";
  readonly setup: MatchSetupV6;
  readonly pendingChoices: readonly PendingChoiceV6[];
  // retained deterministic turn, board, player, entity, PRNG, and outcome data
}

interface FactionTechnologyTree {
  readonly id: FactionTreeId;
  readonly faction: FactionId;
  readonly startingTechIds: readonly ["GATHERING"];
  readonly nodes: readonly TechnologyNode[]; // all 25, frozen order
  readonly roleRules: Readonly<Record<UnitRoleId, EffectiveRoleRule>>;
}

interface CityStateV6 {
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number; // may be negative; exact derived invariant
  readonly expanded: boolean;
  readonly rewards: readonly CityRewardRecord[];
}

interface TileStateV6 {
  readonly terrain: "GRASS" | "FOREST" | "MOUNTAIN";
  readonly resource:
    "FRUIT" | "GAME" | "FERTILE_GROUND" | "ORE" | "STONE" | null;
  readonly improvement: EconomicImprovementId | null;
  readonly road: boolean;
  readonly territoryCityId: CityId | null;
}
```

`RulesetDefinition.version` is 6 and owns the complete orders/formulas in
Ruleset 6 sections 1–12. Effective half-point stats are integers in half-units.
The kernel invariant recomputes every city's economic population, progress,
Market income, capacity, footprint, processor limits, and building legality
from canonical tile/entity data. Cached values are validated, never trusted.

The v6 `Command` union has the exact kinds and payloads in Ruleset 6 section 12.
The v6 `DomainEvent` union contains the corresponding economic, reward, Heal,
Push, and retained faction/combat facts. Parsers are exhaustive by version:
v6 rejects v5 `stars`, `ANIMAL`, `LUMBER_MILL`, Catapult, old technology IDs,
`ESCAPE_MOVE`, and a singular `pendingChoice`; v5 readers remain diagnostic
only. Stable `RuleError` codes use `INSUFFICIENT_COINS` and the ordered v6
validation tables.

The public boundary adds:

```ts
interface EconomicPreview {
  readonly at: Coord;
  readonly cost: number;
  readonly populationDeltaByCity: readonly CityValueDelta[];
  readonly coinIncomeDeltaByCity: readonly CityValueDelta[];
  readonly contributingTiles: readonly Coord[];
  readonly distinctTypes: readonly string[];
  readonly oppositePairAxes: readonly string[];
  readonly capitalRoadConnected: boolean;
  readonly complete: true;
}

interface PublicRulesApiV6 {
  queryPlayerCommands(view: PlayerViewV6): readonly CommandSummaryV6[];
  previewEconomic(
    view: PlayerViewV6,
    command: EconomicCommandV6,
  ): EconomicPreviewResult;
  previewCombat(
    view: PlayerViewV6,
    attacker: UnitId,
    target: CombatTargetRef,
  ): CombatPreviewV6;
}
```

Technology-hidden v6 resources project as a content-free `UNKNOWN_RESOURCE`
arm even on explored terrain. Game is the exception: it is public on every
explored Forest from match start, while Hunting gates only Hunt Game. The
unknown arm carries no candidate kind or existence bit. Economic preview is
available only for an exact public offered command and is complete;
contributors are sorted `(y,x)`. Combat preview represents hidden-behind Push
as `UNKNOWN_BEHIND_FOG`, which resolves as no Push. Equal `PlayerViewV6` values
must produce byte-identical commands, previews, AI tuples, and selections.

Replay and save envelopes use version 6. A v6 save stores the complete ordered
reward queue, exact faction tree IDs, live/cached economic values, Roads,
faction role IDs, and accepted command log. Loading runs parse -> version
selection -> invariant validation (including a full economy recomputation) ->
canonical hash -> atomic install. Recognized v1–v5 data is incompatible and
preserved; no implicit migration exists.

The exact v6 setup parser rejects `scenario`; the ruleset-5 Demo scenario and
Hub action remain historical and have no v6 reconstruction path. It requires
the exact `SPATIAL_ECONOMY` map revision and rejects missing, undefined, old,
or unknown markers.

The active test strategy extends section 11 with all 25 nodes in both faction
registrations, five resource visibility gates, every spatial formula and
recompute trigger, negative population, Market/Road connectivity, every reward
queue boundary, all nine roles/effective Candy mappings, and public preview
equality. New v6 goldens and corpora never overwrite v5 fixtures.

## Historical ruleset-5 architecture detail

The numbered sections below document the implemented v5 client and retained
cross-version infrastructure. Versioned examples are not v6 schemas.

## 1. Architectural constraints

Pulp Wars is a client-only browser application written in strict TypeScript.
Vite supplies development and production builds; Vitest supplies unit,
integration, replay, and headless tests. The development entry point is
`http://localhost:6173`, with Vite configured to fail rather than silently use
another port. There is no application server, database, account, telemetry, or
required network request after static files load.

The authoritative game is a deterministic, renderer-independent command/state/
event engine. Canvas 2D projects and draws the map. Semantic HTML and CSS render
screens, menus, dialogs, HUD, and accessible alternatives. Neither renderer nor
DOM decides game legality, randomness, AI behavior, damage, capture, income, or
victory.

Required compiler posture:

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, and
  `useUnknownInCatchVariables` enabled;
- no `any` in simulation, persistence, AI, or command boundaries;
- browser and headless tests import the same engine package;
- ruleset data is immutable at runtime and referenced by a versioned ID.

## 2. Dependency direction

```text
rules data <--- simulation <--- AI
                    ^            ^
                    |            |
             application controller
               /        |        \
       persistence   Canvas map   DOM UI
                         |
                   art manifest
```

Arrows mean “may import.” Simulation imports rules data and deterministic
utilities only. It cannot import Canvas, DOM, browser storage, audio, time,
animation, device-pixel ratio, CSS dimensions, or application controllers. AI
uses a filtered player view and public command-query API; it never receives
authoritative hidden state.

## 3. Suggested module boundary

```text
src/
  app/             route/screen state, match controller, input coordination
  engine/
    commands/      command schemas, validation, reducer
    model/         serializable state and IDs
    rules/         ruleset tables and pure calculations
    map/           deterministic generation and invariants
    combat/        preview and resolution
    fog/           player-view projection
    events/        domain event contracts
    replay/        canonicalization, hashing, replay runner
    random/        PRNG and seed conversion
  ai/              candidate enumeration and deterministic policy
  headless/        public non-DOM runner
  render/
    canvas/        projection, camera, layers, picking, animation
    dom/           semantic screens, panels, dialogs, HUD
  persistence/     save/settings repositories and migrations
  assets/          typed art manifest; no gameplay constants
  styles/          tokens, responsive layout, reduced-motion behavior
tests/
  fixtures/        versioned setup/command/hash golden cases
  unit/            pure rule tests
  integration/     complete turn and match slices
  replay/          browser/headless parity and determinism
```

Imports across these boundaries go through each directory's public index. UI
may depend on read models and command types, not mutable engine internals.

## 4. Core illustrative contracts

These interfaces illustrate required information and ownership. Exact source
layout may change, but implementations must preserve their semantics. All IDs
are branded decimal integers serialized as JSON numbers; `EntityId` allocation
is monotonic and IDs are never reused.

```ts
type PlayerId = number & { readonly __brand: "PlayerId" };
type CityId = number & { readonly __brand: "CityId" };
type UnitId = number & { readonly __brand: "UnitId" };
type WallId = number & { readonly __brand: "WallId" };
type EntityId = CityId | UnitId | WallId;
type FactionId = "ORIGINAL" | "CANDY";
type CardinalDirection = "NORTH" | "EAST" | "SOUTH" | "WEST";

interface Coord {
  readonly x: number;
  readonly y: number;
}

interface MatchSetup {
  readonly rulesetId: "pulp-wars-poc-5";
  readonly seed: number; // uint32
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: PlayerColor;
  readonly factions: readonly FactionId[]; // exact seat order, aiCount + 1
  readonly mapGenerationRevision?: "REDUCED_VILLAGES";
  readonly scenario?: "DEMO"; // absent is canonical STANDARD
}

interface GameState {
  readonly schemaVersion: 5;
  readonly rulesetId: "pulp-wars-poc-5";
  readonly setup: MatchSetup;
  readonly random: RandomState;
  readonly humanPlayerId: PlayerId; // immutable diplomatic role in headless too
  readonly nextEntityId: number;
  readonly commandIndex: number;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly board: BoardState;
  readonly players: readonly PlayerState[];
  readonly cities: readonly CityState[];
  readonly units: readonly UnitState[];
  readonly chocolateWalls: readonly ChocolateWallState[];
  readonly pendingChoice: PendingChoice | null;
  readonly outcome: MatchOutcome | null;
}

interface CityState {
  readonly id: CityId;
  readonly level: number; // positive safe integer; no gameplay ceiling
  readonly population: number; // non-negative safe integer below level + 1
  // ownership, position, capital and level-2/3 reward fields omitted here
}

interface PlayerState {
  readonly faction: FactionId; // equals setup.factions[seat]
  // retained v4 player fields omitted here
}

interface UnitActivation {
  readonly moved: boolean;
  readonly attacked: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly escapeAvailable: boolean;
  readonly specialActed: boolean; // v5 wall-build terminal action; reset each turn
}

interface UnitState {
  readonly id: UnitId;
  readonly homeCityId: CityId | null;
  readonly capacityExempt: boolean;
  readonly activation: UnitActivation;
  // owner, type, position, health, kills and veterancy omitted here
}

interface ChocolateWallState {
  readonly id: WallId;
  readonly ownerId: PlayerId;
  readonly at: Coord;
  readonly hp: number; // 1..10 while present
}

type PendingChoice =
  | {
      readonly kind: "CITY_REWARD";
      readonly cityId: CityId;
      readonly level: 2 | 3;
    }
  | {
      readonly kind: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[]; // ascending, length >= 2
    };

type CombatTargetRef =
  | { readonly kind: "UNIT"; readonly unitId: UnitId }
  | { readonly kind: "CHOCOLATE_WALL"; readonly wallId: WallId };

interface CombatPreview {
  readonly attackerId: UnitId;
  readonly target: CombatTargetRef;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly advances: boolean;
  readonly noRetaliationReason:
    | "DEFENDER_DIED"
    | "OUT_OF_RANGE"
    | "ATTACKER_UNEXPLORED"
    | "STRUCTURE"
    | null;
}

type MatchOutcome =
  | { readonly kind: "VICTORY"; readonly winnerId: PlayerId }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
    }
  | { readonly kind: "HEADLESS_VICTORY"; readonly winnerId: PlayerId };

type Command =
  | { readonly kind: "RESEARCH"; readonly tech: TechId }
  | { readonly kind: "HARVEST_FRUIT"; readonly at: Coord }
  | { readonly kind: "HUNT_ANIMAL"; readonly at: Coord }
  | { readonly kind: "BUILD_LUMBER_MILL"; readonly at: Coord }
  | { readonly kind: "BUILD_MINE"; readonly at: Coord }
  | { readonly kind: "TRAIN"; readonly cityId: CityId; readonly unit: UnitType }
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly target: CombatTargetRef;
    }
  | {
      readonly kind: "ESCAPE_MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | { readonly kind: "RECOVER"; readonly unitId: UnitId }
  | { readonly kind: "WAIT"; readonly unitId: UnitId }
  | { readonly kind: "PROMOTE"; readonly unitId: UnitId }
  | { readonly kind: "CAPTURE"; readonly unitId: UnitId }
  | {
      readonly kind: "KAMIKAZE_ROLL";
      readonly unitId: UnitId;
      readonly direction: CardinalDirection;
    }
  | {
      readonly kind: "BUILD_CHOCOLATE_WALL";
      readonly unitId: UnitId;
      readonly at: Coord;
    }
  | { readonly kind: "CANDIFY"; readonly unitId: UnitId }
  | {
      readonly kind: "CHOOSE_CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly cityId: CityId;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reward: RewardId;
    }
  | { readonly kind: "END_TURN" };

type CreateResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly DomainEvent[];
    }
  | { readonly ok: false; readonly error: RuleError };

type ApplyResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly DomainEvent[];
    }
  | {
      readonly ok: false;
      readonly state: GameState;
      readonly error: RuleError;
    };

interface SimulationApi {
  create(setup: MatchSetup): CreateResult;
  apply(state: GameState, command: Command): ApplyResult;
  legalCommands(state: GameState, actor: PlayerId): readonly CommandSummary[];
  previewCombat(
    state: GameState,
    attacker: UnitId,
    target: CombatTargetRef,
  ): CombatPreviewResult;
  viewFor(state: GameState, viewer: PlayerId): PlayerView;
}
```

Ruleset 5 retains `TileState.terrain` as
`"GRASS" | "MOUNTAIN" | "FOREST"`, `resource` as
`"FRUIT" | "ORE" | "ANIMAL" | null`, and `improvement` as
`"MINE" | "LUMBER_MILL" | null`. The exhaustive invariant accepts only the
terrain/resource/improvement combinations in POC Rules section 0.9. These are
authoritative values; renderers must not infer content from variants or pixels.

`RulesetDefinition.version` is 5 and owns Fruit `(2,1)`, Animal `(2,1)`,
Lumber Mill `(3,1)`, and Mine `(5,2)` cost/population pairs. It also owns the
frozen faction, technology, archetype, command-kind, direction, terrain,
resource, and improvement ordinals plus faction-specific effective unit rules.
Map validation owns the exact failures from POC Rules section 0.11.
The kernel adds `HUNTING_REQUIRED`, `ANIMAL_INVALID_TILE`,
`FORESTRY_REQUIRED`, and `LUMBER_MILL_INVALID_TILE` to the retained resource
errors. `CITY_AT_MAX_LEVEL` is not a v5
error because city growth is uncapped; `INTEGER_OVERFLOW` atomically guards the
safe-integer serialization boundary without imposing a gameplay level cap.

Chocolate Walls live in their own sorted collection and their occupancy is
joined with units only in movement/target queries. Combat accepts the exhaustive
`CombatTargetRef`; no numeric ID is cast between branded entity classes.
Territory ownership remains normalized on `TileState.territoryCityId`, so
Candify and city capture share one source of truth. The kernel invariant checks
one owner city per controlled tile, a city at its own center, and eight-way
connectivity from every assigned tile to that center.

`legalCommands(GameState, actor)` and authoritative `previewCombat` are kernel
and test surfaces. Observation-limited callers use `viewFor` followed by
`queryPlayerCommands(PlayerView)` and the public combat estimate. AI and UI must
not pass authoritative state into a query. The filtered query is intentionally
a pure function of `PlayerView`, including optimistic blind movement, so equal
views always expose equal candidates.

`PlayerView.commandIndex` is observation-safe transition metadata. Presentation
code may use it only to invalidate ephemeral state at an accepted-command
boundary, such as a pending same-coordinate inspection cycle; it conveys no
hidden board or entity data. Harmless rerenders retain the same value. Canvas
occupancy, selection, and disappearance checks still use only the visible
entities and explored tiles in `PlayerView`.

Territory-themed map art is a cosmetic projection of that same public view.
For every explored tile, Canvas resolves `PlayerTileView.territoryOwnerId`
through `PlayerView.players` and selects the owning faction's accepted terrain
and resource family. It must not infer ownership by locating a visible city:
the owner remains public when the controlling city center is unexplored and
`territoryCityId`/`territoryCenter` are withheld. Hidden and diplomatic-only
tile arms contain no owner, so their render plans contain only fog and cannot
disclose faction art. Visible city art independently uses the visible city's
public `ownerId`. These choices are renderer-only: capture and Candify swap art
on the next `PlayerView` without changing terrain/resources, cosmetic variant
selection, canonical state, saves, replays, PRNG, geometry, sorting, or picking.

V5 `PlayerView` exposes owned-city `assignedCounted` and `assignedExempt`
totals, plus each visible unit's public handled state and capacity-exemption
status when owned by the viewer. It also exposes the public immutable
`humanPlayerId`, every public player's faction, and explored Chocolate Walls;
external headless controller choice never changes those fields.
Rival city views omit assignment totals. In
cooperative mode, an AI view may mark an otherwise unexplored coordinate only
as `diplomaticBlock: "ALLIED_TERRITORY"`; that union arm contains no terrain,
site, resource, improvement, city, unit, wall, or controlling-player identity. Human and
rival-mode views never receive it. Public queries use the marker solely to
exclude Move/Escape/reveal paths and must remain pure for equal views.

Rejected commands return the identical state object, emit no domain events,
consume no random number, do not increment `commandIndex`, and are never saved
to the replay log. Rule errors are stable codes plus safe parameters, never
localized prose.

Events describe completed domain facts, not animation instructions:

```ts
type DomainEvent =
  | {
      readonly kind: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly income: number;
    }
  | {
      readonly kind: "UNIT_MOVED";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "UNIT_WAITED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
    }
  | {
      readonly kind: "TILES_REVEALED";
      readonly playerId: PlayerId;
      readonly tiles: readonly Coord[];
    }
  | {
      readonly kind: "DONUT_ROLL_STEP";
      readonly unitId: UnitId;
      readonly at: Coord;
    }
  | {
      readonly kind: "ROLL_DAMAGE_RESOLVED";
      readonly sourceUnitId: UnitId;
      readonly target: CombatTargetRef;
      readonly at: Coord;
      readonly damage: number;
      readonly hpBefore: number;
      readonly hpAfter: number;
    }
  | {
      readonly kind: "CHOCOLATE_WALL_BUILT";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly wallId: WallId;
      readonly at: Coord;
      readonly cost: 1;
      readonly hp: 10;
    }
  | {
      readonly kind: "CHOCOLATE_WALL_DESTROYED";
      readonly wallId: WallId;
      readonly ownerId: PlayerId;
      readonly at: Coord;
      readonly cause: "ATTACK" | "KAMIKAZE_ROLL";
    }
  | {
      readonly kind: "CANDIFY_CITY_CHOICE_REQUIRED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    }
  | {
      readonly kind: "TILE_CANDIFIED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly previousCityId: CityId | null;
      readonly previousOwnerId: PlayerId | null;
    }
  | {
      readonly kind: "FRUIT_HARVESTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 2;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "ANIMAL_HUNTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 2;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "LUMBER_MILL_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 3;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "CITY_LEVELED_UP";
      readonly cityId: CityId;
      readonly level: number; // reached positive safe integer
    }
  | { readonly kind: "COMBAT_RESOLVED"; readonly preview: CombatPreview }
  | {
      readonly kind: "UNIT_DIED";
      readonly unitId: UnitId;
      readonly cause:
        | "ATTACK"
        | "RETALIATION"
        | "ELIMINATION"
        | "KAMIKAZE_ROLL"
        | "KAMIKAZE_ROLL_SELF"
        | "CANDIFY";
    }
  | {
      readonly kind: "CITY_CAPTURED";
      readonly cityId: CityId;
      readonly from: PlayerId | null;
      readonly to: PlayerId;
    }
  | { readonly kind: "PLAYER_ELIMINATED"; readonly playerId: PlayerId }
  | { readonly kind: "MATCH_ENDED"; readonly outcome: MatchOutcome };
```

Event arrays are already in authoritative presentation order. Renderers may
coalesce or skip animations, but cannot reorder events for replay or state.

## 5. Command transaction and application control

Every accepted command is one atomic transition:

1. parse an untrusted UI/replay payload into a typed command;
2. validate actor, phase, ownership, targets, costs, prerequisites, and path;
3. calculate all effects from the pre-command state;
4. apply effects in documented stable order and emit events;
5. run state invariants and victory checks;
6. increment command index; then expose the immutable next state;
7. append command and checkpoint hash to the in-memory log and request autosave.

The application controller serializes dispatch. A second command cannot enter
while one is reducing, while a required city/Candify choice is open, or while AI is
choosing. Visual animation does not lock the engine: it locks human input in the
controller and consumes the already-produced event queue. A Fast Forward action
drains presentation immediately without changing state transitions.

## 6. Determinism, PRNG, and canonical data

### 6.1 Seed conversion and PRNG

UI text-to-seed conversion follows the FNV-1a rule in the product spec. FNV
operates on UTF-8 bytes with initial value `2166136261`; for each byte XOR then
multiply by `16777619`, retaining the low 32 bits with `Math.imul`. The resulting
unsigned integer may be zero.

The engine uses **Mulberry32** with one serialized `uint32` state. For each draw:

```text
state = (state + 0x6D2B79F5) mod 2^32
z = state
z = imul(z xor (z >>> 15), z | 1)
z = z xor (z + imul(z xor (z >>> 7), z | 61))
result = (z xor (z >>> 14)) >>> 0
```

Only `nextUint32()` is primitive. A bounded draw `n` uses rejection sampling:
set `threshold = 2^32 mod n`, reject results below `threshold`, then return
`result mod n`. This avoids modulo bias. `n` must be an integer in `[1, 2^32]`.
Do not derive rule randomness from floats.

Each PRNG draw has one named call site. Candidate collections are sorted before
sampling. Adding visual effects cannot add draws. State stores the post-draw
PRNG state, so saves resume at the exact stream position.

### 6.2 Canonical serialization and hash

Authoritative values are JSON-compatible: null, booleans, strings, safe
integers, and arrays/objects containing them. No `undefined`, `NaN`, infinity,
Date, Map, Set, BigInt, class instance, cyclic reference, or floating rule
value enters state. Coordinates, entity collections, revealed tiles, and events
use specified sorted arrays rather than object iteration order.

Canonical JSON uses UTF-8, no insignificant whitespace, JSON escaping, object
keys sorted by Unicode code-point order, and arrays in semantic order. Hashes
are lowercase hexadecimal SHA-256 of canonical UTF-8 bytes. The hashed state
excludes camera, animation, audio, localization, focus, and settings. A shared
canonicalizer must be used in browser and headless paths.

## 7. Replay and headless API

```ts
interface ReplayFile {
  readonly format: "pulp-wars-replay";
  readonly version: 5;
  readonly setup: MatchSetup;
  readonly commands: readonly Command[];
  readonly checkpoints: readonly { index: number; stateHash: string }[];
}

interface HeadlessResult {
  readonly outcome: MatchOutcome | null;
  readonly acceptedCommands: number;
  readonly state: GameState;
  readonly stateHash: string;
  readonly events: readonly DomainEvent[];
}

interface HeadlessApi {
  run(
    replay: ReplayFile,
    options?: { readonly stopAfter?: number },
  ): Promise<HeadlessResult>;
  runAiMatch(setup: MatchSetup, maxCommands: number): Promise<HeadlessResult>;
}
```

`run` fails on schema errors, rejected commands, checkpoint mismatch, or a
command after match end. `runAiMatch` is a soak-test surface; the command limit
prevents an infinite match. Headless code has no DOM shims and no Canvas import.
Golden fixtures record setup, commands, ordered events, and final hash.

`scenario: "DEMO"` is a first-class creation discriminator. The engine applies
its pure deterministic transform after ordinary map/player/entity creation and
before the ordinary opening Start Turn. It consumes no PRNG draw. Replay,
autosave, load, restart, browser, and headless all call the same `createGame`
path. Exact setup parsers accept the nine base fields, an optional standard-only
`mapGenerationRevision: "REDUCED_VILLAGES"`, or the base fields plus the one
valid DEMO discriminator. An absent map revision remains absent and selects the
historical v5 village tables; no default is injected while parsing or loading.
They reject unknown marker values, marker `undefined`, extra fields, unsupported
sizes, invalid/wrong-length/sparse faction arrays, a marked Demo, and a
non-rival or non-Original Demo. New STANDARD writers omit `scenario` and emit
the revision marker. Every setup writes its exact seat-ordered `factions`; Demo
requires three Original entries and remains unmarked for golden compatibility.

## 8. Renderer and input boundary

The renderer owns configurable projection and display dimensions. The simulation
stores only grid coordinates. Default projection and asset contracts live in
[terrain tiles](../art/classes/terrain-tiles.md), [units](../art/classes/units.md),
and [buildings](../art/classes/buildings.md).

Large and Huge boards start at minimum zoom centered on the human capital when
the whole board cannot fit. Pan, wheel/pinch, keyboard and explicit zoom
controls remain camera-only and must retain tall-sprite overhang.

Canvas 2D responsibilities:

- camera pan/zoom, device-pixel-ratio backing size, grid projection, stable draw
  sorting, fog treatment, highlights, hit testing, and map animation;
- redraw on state/event/camera changes, not as an unconstrained rule loop;
- resolve pointer coordinates to logical tiles, then ask the engine for legal
  commands; never infer legality from pixels or alpha.

Semantic DOM responsibilities:

- all menus, setup fields, HUD text, panels, technology tree, stats, dialogs,
  settings, AI progress, and end screens;
- non-modal selected-tile, selected-unit, and selected-city bottom docks with
  accessible descriptions and explicit exact action buttons so Canvas is not
  the only source of game information;
- focus management, keyboard controls, labels, errors, and live announcements.

An exact contextual command whose target is already fixed by the current
selection dispatches from its semantic button in one activation. The client
must not convert deterministic tile economy commands into Canvas target modes,
confirmation clicks, or choice dialogs. Additional confirmation or choice
steps exist only when explicitly required by product direction; Move, Attack,
and genuinely unresolved spatial targets remain map-driven.

The Canvas host owns one ephemeral inspection-activation cycle keyed by visible
coordinate and unit ID. Pointer, touch, keyboard, and semantic coordinate
activation enter the same resolver. Exact offered Move, EscapeMove, or Attack
commands retain priority and dispatch on that one activation; there is no staged
path/combat confirmation state. Other explored unit coordinates alternate unit
then visible underlying city/tile. Match identity, `PlayerView.commandIndex`,
Escape, coordinate changes, or visible-entity disappearance invalidate the
cycle, while redraws and DOM remounts do not.

Selected-unit identity is ephemeral presentation state shared by the semantic
dock and Canvas render model. A visible unit selection never enters
`MatchOverlay`; therefore it cannot create a backdrop, claim modal focus, or
disable map camera/target input. Every dock rerender filters
`queryPlayerCommands(PlayerView)` by the exact selected owned `unitId`; direct
Capture, Recover, Promote, and Wait commands are dispatched through the normal
exact revalidation boundary, while Move, Attack, and Escape remain
one-activation spatial Canvas commands. The dock identity resolves the exact
owner-faction role through the accepted world-sprite coverage registry and
places compact role/HP text beside it; it does not substitute a training
portrait. Highlighted attack targets carry their
exact public combat preview visually and semantically before activation.

A transition from any other selection to a visible unit starts one renderer-
owned selection jump through that same shared selection boundary, including
pointer, touch, Enter/Space, direct semantic-unit, and semantic-coordinate
activation. Full/Normal motion moves only that unit raster through a 240 ms
half-sine, from its ground anchor to a 12 nominal-CSS-pixel apex and exactly
back; Fast uses the same geometry in 120 ms. Camera zoom scales the visual
offset. The ground/contact anchor, owner cue, health/status layer, selection
diamond, picking, draw order, camera, commands, state, and hash never move.
Selecting the already-selected same unit does not restart it; selecting a
different unit does. Selection clear/change, disappearance, combat/ability
presentation, match/route replacement, remount, and destroy cancel it. Reduced
motion draws the ordinary selected frame, applies no offset, and schedules no
selection-jump RAF.

Candy unit docks additionally filter exact `KAMIKAZE_ROLL`,
`BUILD_CHOCOLATE_WALL`, and `CANDIFY` summaries for that unit. Roll enters one
ephemeral cardinal-direction target state; Build enters one ephemeral exact-cell
target state. One highlighted cell activation dispatches without confirmation.
Candify dispatches immediately; only an authoritative `CANDIFY_CITY` pending
choice creates a blocking modal. Escape, command-index change, unit
disappearance, route/match replacement, or another selection cancels targeting.

An explored Chocolate Wall participates in the visible-occupant-first cycle as
a structure after a unit and before the underlying tile. Its non-modal dock
shows owner and HP. A selected attacker highlights an exact wall target only
when the public query offers it; friendly/allied wall attacks receive the same
preview and immediate dispatch as hostile attacks.

Selected-city identity follows the same ephemeral `BoardSelection` path and
never enters `MatchOverlay`. Its render plan derives perimeter segments only
from explored `PlayerTileView` entries whose public `territoryCityId` matches
the visible city; it never consults authoritative fogged tiles. Its compact
dock identity resolves only the visible owner faction and level through the
accepted city coverage registry, with city/capital, level, and population text
beside the art. The semantic
dock filters `queryPlayerCommands(PlayerView)` only to Train commands with that
exact owned `cityId`; it never lists Harvest, Hunt, Lumber, or Mine. Training
controls visibly contain only the exact accepted world-unit art, bare unit name,
and cost. Every contextual raster shares one 112 x 130 CSS-pixel transparent
viewport derived from the standard 256 x 296 unit canvas at 0.25 scale and
1.75 maximum zoom; 176 CSS-pixel controls grow vertically and wrap. Raster
padding and aspect ratio are preserved with `object-fit: contain`, while a
code-native fallback occupies the same accessible framed viewport.
The mandatory city reward remains a dedicated blocking `REWARD` overlay.

Selected-tile identity also stays in `BoardSelection` and never enters
`MatchOverlay`. Its bottom dock identifies the exact public terrain, resource,
improvement/site, territory owner, defense/movement implication, and occupying
entity, then filters exact Harvest Fruit, Hunt Animal, Build Lumber Mill, or
Build Mine commands only for that selected coordinate. It has no backdrop,
focus trap, or hidden-tile look-through. Locked prerequisites may be explained
as text, but only commands returned by the public query render as buttons.
The identity header chooses accepted art in public specificity order—economic
improvement, revealed resource, then terrain—and shows only the corresponding
plain semantic name. It never displays logical coordinates; an unknown resource
falls back to terrain art and language without an existence or type hint.

The match root is a fixed `100dvh` containing a Canvas host whose CSS rectangle
is established by viewport/safe-area changes only. Tile/unit/city docks are
absolutely overlaid above the bottom safe-area inset at inline inset 0 and
z-layer `match-dock`; their natural wrapping may obscure the board. Selection,
dock content, fonts finishing load, and action-row changes must not resize the
host, backing store, or camera. Normal layouts cap the dock at 45dvh and do not
scroll; only when 200% zoom or a 320 CSS px viewport would make required content
unreachable may the dock use `max-block-size: calc(100dvh - topHudBlockSize -
env(safe-area-inset-bottom))` and its own vertical overflow. The map remains
pannable behind every non-modal dock. ResizeObserver callbacks caused only by a
dock are forbidden from entering Canvas resize logic.

Readiness is presentation derived from public activation. A surviving unit
owned by the active human with `handled = false` pulses its actual sprite from
opacity 1 to 0.62 and back over a 1.6-second ease-in-out loop. Health and owner
cues remain steady. Reduced motion leaves the sprite fully opaque and schedules
no readiness RAF; dock text and the semantic label say **Needs action**. No
detached circle, check, tick, letter `W`/`R`, tile badge, or halo represents
readiness. Wait or any handled action removes the pulse immediately after the
accepted boundary without disabling remaining actions.

All eligible sprites share one presentation phase keyed by match instance,
active player, and the `TURN_STARTED` command boundary: opacity 1 at 0 ms, 0.62
at 800 ms, and 1 at 1,600 ms. Harmless rerenders, selection, dock changes, and
camera changes do not restart it. Resume/reload has no serialized phase and
starts a fresh cycle at opacity 1; this cannot affect rules or hashes.

`COMBAT_RESOLVED` presentation plans retain public pre/post render snapshots.
When the public attacker archetype is Archer, Full/Normal motion draws a
code-native projectile from its manifest weapon attachment to the target torso
for exactly 280 ms with cubic-out progress, then a 100 ms impact
ring/crossfade; Original uses an arrow and Candy uses a round gumball. Post-combat
HP/death becomes visible at 280 ms. Reduced motion has no travel and one 100 ms
impact crossfade. Fast Forward is immediate. Camera/viewport changes reproject
the logical endpoints; Settings pauses the presentation clock. Match/route or
queue-token replacement and missing public endpoints cancel to the post-event
frame. Cancellation and Fast Forward never modify simulation state or event
order. Catapult does not borrow either Archer projectile primitive.

Roll, Build, and Candify presentations consume only their ordered v5 events.
Roll advances at 90 ms per cell with a 900 ms total cap; Build rises for 180 ms;
Candify washes/dissolves for 240 ms. Reduced motion gives each complete command
one 100 ms crossfade, and Fast Forward installs the final frame immediately.
Path reveal is installed at the corresponding Roll step, never from animation
sampling.

The exhaustive ephemeral state is renderer-owned and never serialized:

```ts
type CombatAnimationState =
  | { readonly kind: "IDLE" }
  | {
      readonly kind: "ARCHER_PROJECTILE";
      readonly queueToken: number;
      readonly commandIndex: number;
      readonly phase: "FLIGHT" | "IMPACT";
      readonly elapsedMs: number; // clamped to 0..280 or 0..100 for phase
      readonly from: Coord;
      readonly to: Coord;
      readonly projectile: "ARROW" | "GUMBALL";
    };
```

Only the presentation clock changes `elapsedMs`/`phase`. Installing a final
frame always returns `IDLE`; a reload begins `IDLE` at the saved accepted state.

CSS custom properties own renderer size tokens and responsive layout. Changing
tile size, zoom, canvas dimensions, or source raster density cannot alter a
state hash.

## 9. Application and screen state

Navigation is a finite state separate from `GameState`:

```ts
type AppRoute =
  | { readonly name: "SPLASH" }
  | { readonly name: "HUB" }
  | { readonly name: "MODE" }
  | { readonly name: "SETUP"; readonly draft: SetupDraft }
  | { readonly name: "FACTION"; readonly draft: SetupDraft }
  | { readonly name: "MATCH" }
  | { readonly name: "RESULT"; readonly outcome: MatchOutcome };

type MatchOverlay =
  | { readonly name: "NONE" }
  | { readonly name: "TECH" }
  | { readonly name: "STATS" }
  | { readonly name: "SETTINGS" }
  | { readonly name: "REWARD"; readonly cityId: CityId }
  | {
      readonly name: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    }
  | { readonly name: "CONFIRM"; readonly action: ConfirmAction };
```

Routes and overlays may be restored from benign UI state, but only GameState
and replay data are authoritative. A reload during animation resumes at the
latest accepted command without trying to recreate animation progress.

## 10. Persistence and versioning

Use browser `localStorage` behind injected repositories for the POC:

- `pulpWars.save.current`: one autosave envelope, maximum 1.5 MiB UTF-8;
- `pulpWars.settings.v1`: display/audio/accessibility settings, maximum 16 KiB.

The save envelope contains format/version, ruleset ID, resolved setup,
authoritative state, PRNG state (also present in state), accepted command log,
command index, canonical state hash, and ISO save timestamp. The timestamp is
metadata excluded from hashes and never enters the simulation. Writes occur
after each accepted command through a coalescing queue; End Turn and page
visibility loss request an immediate flush. `beforeunload` is not treated as a
durable guarantee.

Loading follows parse -> schema validation -> version selection -> invariant
validation -> canonical hash check -> atomic install. Version mismatch has no
implicit best-effort conversion. Explicit pure migrations may be added later
and must have fixture tests. Corrupt/incompatible saves remain untouched until
the user confirms Delete Save; New Match does not silently overwrite a save
until final setup confirmation.

Storage is an adapter: unit tests use memory repositories. Storage failure must
not crash an active match. No IndexedDB, cloud sync, cookies, or server storage
is required for the POC.

The faction/dynamic-territory expansion is an intentional compatibility boundary:

| Contract                  | Legacy values | Ruleset 5 active value | Compatibility behavior |
| ------------------------- | ------------: | ---------------------: | ---------------------- |
| Game state schema         |       1/2/3/4 |                      5 | no state migration     |
| Command/event envelope    |       1/2/3/4 |                      5 | exhaustive v5 parser   |
| Replay format             |       1/2/3/4 |                      5 | legacy incompatible    |
| Save envelope             |       1/2/3/4 |                      5 | legacy incompatible    |
| Settings envelope/storage |             1 |                      1 | reused unchanged       |

The loader detects recognized v1-v4 envelopes before attempting v5 state
parsing, returns `INCOMPATIBLE` rather than `CORRUPT`, preserves stored bytes,
and offers deletion/new-match recovery. It never invents seat factions,
synthesizes walls, rewrites Attack targets, or replays legacy commands under
the expanded Normal policy. Tests retain v1-v4 save/replay fixtures for
diagnostics; fresh v5 goldens cover both faction choices in every seat, both AI
modes, all board sizes, Demo, all Candy actions, wall combat, and resume at a
Candify pending choice.

## 11. Testing strategy and quality gates

Vitest suites must cover:

- every table/constant in POC Rules, technology prerequisites and current-city
  costs, income, uncapped Fruit/Animal/Lumber/Mine growth, level-2/3-only rewards, durable
  capacity exemptions, legal over-capacity states, siege, capture, elimination,
  and victory;
- map invariants across at least 1,000 seeds per supported setup, plus fixed
  retry/failure fixtures; coverage asserts exact global Mountain/Forest counts,
  per-terrain resource thresholds, at least two opportunities per settlement,
  observed non-constant settlement mixes, and no out-of-territory resource;
- a targeted Huge corpus of at least 1,000 seeds for each AI count, with a
  deterministic repeat, exact 22-settlement/113-mountain assertions, attempt
  ceiling and recorded wall-clock runtime; the existing 6,000-seed 11/14/16
  corpus remains part of the normal suite; Large covers 1,000 seeds per AI count
  and exactly 15 settlements/72 mountains without changing Auto;
- every unit's movement, Dash/Escape/Fortify behavior, fog interruption, ZOC,
  recovery, Wait/handled monotonicity, promotion, training, and capture lifecycle;
- per-seat faction exact parsing/persistence, roster labels/effective rules,
  Donut four-direction paths and every edge position, path-only reveal, fixed
  friendly/hostile/wall damage and event order, and self-removal;
- Chocolate Wall placement on every allowed terrain/resource/improvement,
  every forbidden occupancy/site/fog/relationship case, movement blocking,
  friendly/allied/hostile attack, zero retaliation/defense, persistence through
  capture/elimination, and no capacity/tally effects;
- Candify unique/nearest/tied city selection, mandatory save/resume choice,
  neutral/hostile annexation, connectivity rejection, chained expansion,
  resource/improvement preservation, capture transfer, and fog-safe views;
- combat rational arithmetic, every half boundary, no-retaliation reasons,
  advance, kill attribution, and preview/resolution identity;
- hidden-state filtering, content-free allied boundary projection, reveal/path
  exclusion, and an assertion that AI cannot import authoritative state types/API;
- identical seed/setup/commands -> byte-identical canonical JSON, event log,
  and hash across repeat runs; save/resume at each command boundary;
- headless/browser engine parity, malformed replay/save rejection, and golden
  replay hashes;
- DOM flow, focus return, dialogs, keyboard action parity, one-activation
  Move/Escape/Attack, Candy direction/build targeting, mandatory Candify city
  choice, tile-only resource controls, readiness/reduced-motion presentation,
  faction setup at 320/600/1024 CSS px, and accessible names;
- Canvas projection/picking at min/default/max zoom and high device pixel ratio.

Property tests should assert non-negative stars/HP/population, positive safe
integer levels, unique IDs, one unit per tile, valid ownership/home references,
capacity training gates without rejecting valid over-capacity states, and that
only the active player can command. Deterministic rival and cooperative soak
corpora must finish or stop cleanly at their explicit command caps without
exceptions and must repeat command/event/state hashes exactly.

Minimum delivery gates are typecheck, lint, unit/integration tests, production
build, and a headless golden replay verification.

## 12. Performance and size budgets

Budgets apply on a current desktop Chromium reference run with a 16 x 16 map,
four players, 64 living units, and device-pixel ratio 2. Record the test machine
and browser version with measurements.

| Operation                                        |                           Budget |
| ------------------------------------------------ | -------------------------------: |
| Normal command validation + reduction, p95       |                          <= 4 ms |
| Combat preview or legal-action query, p95        |                          <= 2 ms |
| Canvas interactive frame while panning, p95      |                       <= 16.7 ms |
| Full static map redraw, p95                      |                         <= 12 ms |
| Normal AI decision, p95                          |                         <= 50 ms |
| Complete AI turn engine compute                  |  <= 1,000 ms and <= 128 commands |
| Initial JS, CSS, and first-party data compressed | <= 500 KiB, excluding raster art |
| Current autosave                                 |                 <= 1.5 MiB UTF-8 |
| First usable hub after cached load               |                           <= 1 s |

AI presentation may yield to the browser between commands and may be animated
or fast-forwarded. Timing never alters its action budget, evaluation, PRNG, or
command sequence. If a budget is exceeded, profiling may change algorithms or
renderer caches, not authoritative rules or replay results.

Huge validation is deliberately targeted rather than added to every default
test run. Each fixed 25 x 25 Normal-policy completion uses hard safety caps of
20,000 accepted commands and 500 rounds. The generation corpus must finish in
240 seconds on the reference machine; complete-match wall time is recorded as
diagnostic evidence, while deterministic command/round caps remain the
authoritative stall protection.
