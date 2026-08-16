# Pulp Wars Client Architecture

**Status:** authoritative POC architecture

**Rules:** [POC Rules](../product/POC_RULES.md)

**UI contract:** [Screen Flow](../ui/SCREEN_FLOW.md)

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
type EntityId = CityId | UnitId;

interface Coord {
  readonly x: number;
  readonly y: number;
}

interface MatchSetup {
  readonly rulesetId: "pulp-wars-poc-4";
  readonly seed: number; // uint32
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: PlayerColor;
  readonly scenario?: "DEMO"; // absent is canonical STANDARD
}

interface GameState {
  readonly schemaVersion: 4;
  readonly rulesetId: "pulp-wars-poc-4";
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
  readonly pendingChoice: PendingChoice | null;
  readonly outcome: MatchOutcome | null;
}

interface CityState {
  readonly id: CityId;
  readonly level: number; // positive safe integer; no gameplay ceiling
  readonly population: number; // non-negative safe integer below level + 1
  // ownership, position, capital and level-2/3 reward fields omitted here
}

interface UnitActivation {
  readonly moved: boolean;
  readonly attacked: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly escapeAvailable: boolean;
}

interface UnitState {
  readonly id: UnitId;
  readonly homeCityId: CityId | null;
  readonly capacityExempt: boolean;
  readonly activation: UnitActivation;
  // owner, type, position, health, kills and veterancy omitted here
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
      readonly targetId: UnitId;
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
    defender: UnitId,
  ): CombatPreviewResult;
  viewFor(state: GameState, viewer: PlayerId): PlayerView;
}
```

Ruleset 4 defines `TileState.terrain` as
`"GRASS" | "MOUNTAIN" | "FOREST"`, `resource` as
`"FRUIT" | "ORE" | "ANIMAL" | null`, and `improvement` as
`"MINE" | "LUMBER_MILL" | null`. The exhaustive invariant accepts only the
terrain/resource/improvement combinations in POC Rules section 0.1. These are
authoritative values; renderers must not infer content from variants or pixels.

`RulesetDefinition.version` is 4 and owns Fruit `(2,1)`, Animal `(2,1)`,
Lumber Mill `(3,1)`, and Mine `(5,2)` cost/population pairs. It also owns the
frozen technology, unit, command-kind, terrain, resource, and improvement
ordinals. Map validation owns the exact failures from POC Rules section 0.3.
The kernel adds `HUNTING_REQUIRED`, `ANIMAL_INVALID_TILE`,
`FORESTRY_REQUIRED`, and `LUMBER_MILL_INVALID_TILE` to the retained resource
errors. `CITY_AT_MAX_LEVEL` is not a v4
error because city growth is uncapped; `INTEGER_OVERFLOW` atomically guards the
safe-integer serialization boundary without imposing a gameplay level cap.

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

V4 `PlayerView` exposes owned-city `assignedCounted` and `assignedExempt`
totals, plus each visible unit's public handled state and capacity-exemption
status when owned by the viewer. It also exposes the public immutable
`humanPlayerId`; external headless controller choice never changes that field.
Rival city views omit assignment totals. In
cooperative mode, an AI view may mark an otherwise unexplored coordinate only
as `diplomaticBlock: "ALLIED_TERRITORY"`; that union arm contains no terrain,
site, resource, Mine, city, unit, or controlling-player identity. Human and
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
      readonly cause: "ATTACK" | "RETALIATION" | "ELIMINATION";
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
while one is reducing, while a required reward choice is open, or while AI is
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
  readonly version: 4;
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
path. Exact setup parsers accept either the eight STANDARD fields, including
required `aiMode`, or those fields plus the one valid DEMO discriminator; they
reject unknown values, extra fields, unsupported sizes, and a non-rival Demo.
STANDARD writers continue to omit `scenario` exactly.

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
one-activation spatial Canvas commands. Highlighted attack targets carry their
exact public combat preview visually and semantically before activation.

Selected-city identity follows the same ephemeral `BoardSelection` path and
never enters `MatchOverlay`. Its render plan derives perimeter segments only
from explored `PlayerTileView` entries whose public `territoryCityId` matches
the visible city; it never consults authoritative fogged tiles. The semantic
dock filters `queryPlayerCommands(PlayerView)` only to Train commands with that
exact owned `cityId`; it never lists Harvest, Hunt, Lumber, or Mine. Training
controls visibly contain only accepted unit art, bare unit name, and star cost.
The mandatory city reward remains a dedicated blocking `REWARD` overlay.

Selected-tile identity also stays in `BoardSelection` and never enters
`MatchOverlay`. Its bottom dock identifies the exact public terrain, resource,
improvement/site, territory owner, defense/movement implication, and occupying
entity, then filters exact Harvest Fruit, Hunt Animal, Build Lumber Mill, or
Build Mine commands only for that selected coordinate. It has no backdrop,
focus trap, or hidden-tile look-through. Locked prerequisites may be explained
as text, but only commands returned by the public query render as buttons.

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
When the public attacker type is Archer, Full/Normal motion draws a code-native
arrow from its manifest weapon attachment to the defender torso for exactly
280 ms with cubic-out progress, then a 100 ms impact ring/crossfade; post-combat
HP/death becomes visible at 280 ms. Reduced motion has no travel and one 100 ms
impact crossfade. Fast Forward is immediate. Camera/viewport changes reproject
the logical endpoints; Settings pauses the presentation clock. Match/route or
queue-token replacement and missing public endpoints cancel to the post-event
frame. Cancellation and Fast Forward never modify simulation state or event
order. Catapult does not borrow the Archer arrow primitive.

The exhaustive ephemeral state is renderer-owned and never serialized:

```ts
type CombatAnimationState =
  | { readonly kind: "IDLE" }
  | {
      readonly kind: "ARCHER_ARROW";
      readonly queueToken: number;
      readonly commandIndex: number;
      readonly phase: "FLIGHT" | "IMPACT";
      readonly elapsedMs: number; // clamped to 0..280 or 0..100 for phase
      readonly from: Coord;
      readonly to: Coord;
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

The forest/siege/map expansion is an intentional compatibility boundary:

| Contract                  | Legacy values | Ruleset 4 active value | Compatibility behavior |
| ------------------------- | ------------: | ---------------------: | ---------------------- |
| Game state schema         |         1/2/3 |                      4 | no state migration     |
| Command/event envelope    |         1/2/3 |                      4 | exhaustive v4 parser   |
| Replay format             |         1/2/3 |                      4 | legacy incompatible    |
| Save envelope             |         1/2/3 |                      4 | legacy incompatible    |
| Settings envelope/storage |             1 |                      1 | reused unchanged       |

The loader detects recognized v1/v2/v3 envelopes before attempting v4 state
parsing, returns `INCOMPATIBLE` rather than `CORRUPT`, preserves stored bytes,
and offers deletion/new-match recovery. It never synthesizes Forest/Animal,
converts `mine` booleans into a new map, or replays legacy commands under the
expanded Normal policy. V3-to-v4 is deliberately not a pure state migration:
the initial seeded board and subsequent AI command log differ. Tests retain
v1/v2/v3 save/replay fixtures for diagnostics; fresh v4 goldens cover both AI
modes, all board sizes, Demo, Hunt/Lumber, Catapult combat, and resume.

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
  deterministic repeat, exact 30-settlement/113-mountain assertions, attempt
  ceiling and recorded wall-clock runtime; the existing 6,000-seed 11/14/16
  corpus remains part of the normal suite; Large covers 1,000 seeds per AI count
  and exactly 20 settlements/72 mountains without changing Auto;
- every unit's movement, Dash/Escape/Fortify behavior, fog interruption, ZOC,
  recovery, Wait/handled monotonicity, promotion, training, and capture lifecycle;
- combat rational arithmetic, every half boundary, no-retaliation reasons,
  advance, kill attribution, and preview/resolution identity;
- hidden-state filtering, content-free allied boundary projection, reveal/path
  exclusion, and an assertion that AI cannot import authoritative state types/API;
- identical seed/setup/commands -> byte-identical canonical JSON, event log,
  and hash across repeat runs; save/resume at each command boundary;
- headless/browser engine parity, malformed replay/save rejection, and golden
  replay hashes;
- DOM flow, focus return, dialogs, keyboard action parity, one-activation
  Move/Escape/Attack, tile-only resource controls, readiness/reduced-motion
  presentation, and accessible names;
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
