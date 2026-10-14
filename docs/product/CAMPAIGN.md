# Campaign mode: design and teaser

**Status:** design (`pulp_wars-68k.1`, epic `pulp_wars-68k`). The engine
bead `68k.2` is implemented at `pulp-wars-poc-7r34`
([current rules section 2.6](RULESET_7_CURRENT.md#26-mission-setup); its
notes are in [section 8.1](#81-68k2-engine-missions-authored-maps-forbidden-technologies)),
and the AI bead `68k.3` (directives and proxy variation; its notes are in
[section 8.2](#82-68k3-ai-mission-directives-and-proxy-variation)), and the
content bead `68k.4` (the four Chapter One missions, `src/campaign/chapter-1.ts`,
and `npm run playtest:campaign`; its final numbers and tuning record are in
[section 8.3](#83-68k4-content-the-four-teaser-missions-and-their-playtest)),
and the campaign UI and progress bead `68k.5` (its notes are in
[section 8.4](#84-68k5-campaign-ui-and-progress)), and the siege bead
`68k.6` (the Normal AI's siege of a single-file front and mission 4's
revision 2; its notes are in
[section 8.5](#85-68k6-normal-ai-siege-of-a-single-file-front)) are
implemented. **The campaign framework and part one**
(`pulp_wars-v642.1`, `pulp-wars-poc-7r82`) are
[sections 9 to 13](#9-part-one-the-hollow-frontier-ten-missions): ten
missions (all ten built: 1 to 4 here, 5 to 10 by `pulp_wars-v642.2` to
`pulp_wars-v642.4`), objectives beyond conquest, teams,
reinforcements, natural maps, the objective tracker, stars, and the
hand-play record; where they differ from sections 1 to 8, they are the
current design. The
implementation beads in
[section 8](#8-implementation-beads) follow this document; where an
implementation bead finds that this design and the code disagree, it stops
and surfaces the conflict.

**Request (user, 2026-10-03, summarized):** a campaign "sort of like in HoMM":
beat one map to advance to the next, unlocking more playable factions along
the way; start as Humans against Goblins or the Undead. Objectives start with
plain domination (later perhaps capture a village, survive X turns, escort,
capture the flag). The AI may start with several cities so the player has to
catch up; one map has a heavily fortified AI position behind a narrow isthmus
with naval technology disabled. Some missions tweak the AI: attack at once,
never attack, or guard a place. Deliver the first 3–4 missions as a teaser
before the direction is decided. **Simplicity is key.**

**Ruleset ID:** the engine bead (`68k.2`) takes the next free
`pulp-wars-poc-7rNN` (after `7r31`, or after whatever identity the Dwarf fold
or another bead takes first), because it adds legal setups. This document
names no number: `7rNN` stands for that identity. Mission content added or
revised later does **not** change the ruleset identity
([section 2.4](#24-identity-saves-and-replays)).

**Terminology.** In this document and in user-facing text, the **campaign** is
the chain of missions. In the Normal AI code, "campaign" already names the
unit-job plan of `src/ai/v7-campaign.ts` (a _military_ campaign: expansion,
exploration, pressure). To avoid a collision, the new code uses **mission**
in the engine and AI (`MissionDefinitionV7`, `src/engine/v7/missions/`,
`src/ai/v7-directives.ts`) and **campaign** only in the app and UI layer
(`src/campaign/`). No existing identifier is renamed.

## 1. Decisions at a glance

The teaser's decisions. Three of them were changed by `pulp_wars-v642.1`:
the **map** is now the generator's output with recorded edits
([section 10.5](#105-natural-maps)), the **objective** has five kinds
([section 10.1](#101-objectives-are-data)), and there are **triggers** of
one kind, reinforcement waves ([section 10.3](#103-reinforcements)).

| Question               | Decision                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map                    | Hand-authored ASCII layouts on the existing square sizes (11, 14, 16), built into an ordinary `GameStateV7` by a deterministic builder, like the [Showcase](RULESET_7_CURRENT.md#25-showcase-setup). No seeded generation, no overrides.                                              |
| Where a mission lives  | Engine data: `src/engine/v7/missions/<id>.ts`, one object per mission. Story, briefing, hints, and chapter order: `src/campaign/`.                                                                                                                                                    |
| How a match knows it   | New map type `MISSION` plus a setup field `mission: { id, revision }`. The state is an ordinary state; no new state field.                                                                                                                                                            |
| Objective              | `DOMINATION` only, which is the existing victory rule. The objective is a one-member typed union so later kinds are additive.                                                                                                                                                         |
| Forbidden technologies | Rule-level, generalizing the existing Dry Land Naval rule: refused by the reducer, never offered, shown "Unavailable" in the tree.                                                                                                                                                    |
| AI tweaks              | Per-seat **directive**: `NORMAL`, `RUSH`, `HOLD(zone)`, `GUARD(zone, garrison)`, each optionally `untilRound`. A leash filter on the Normal AI's ready commands plus parameters to its existing unit-job plan. No fork; `NORMAL` and every non-mission match decide byte-identically. |
| Triggers               | None. `untilRound` is the only time switch, and it is AI-only (a pure function of the public round).                                                                                                                                                                                  |
| Saves and replays      | The setup carries `mission.id` and `mission.revision`; replays rebuild the mission from the bundled definition. A changed initial state bumps the mission revision, never the ruleset; old saves of that mission are refused with a clear message.                                    |
| Progress               | Separate localStorage key `pulpWars.campaign.v1`, holding only completed missions. Unlocks are derived, never stored. It survives ruleset identity changes.                                                                                                                           |
| Skirmish               | Stays fully unlocked. Unlocks gate which factions you may lead in campaign missions that offer a choice ([section 4.3](#43-what-unlocks-gate)).                                                                                                                                       |
| Mid-mission resume     | The one existing autosave slot holds whichever match is current, mission or skirmish.                                                                                                                                                                                                 |
| UI                     | A Skirmish / Campaign switch on the front screen, a mission list, a briefing, mission-aware Victory and Defeat dialogs, an unlock notice. No new production art: faction emblems reuse the existing portraits.                                                                        |
| Teaser                 | Four missions: Humans vs Goblins (rush), Humans vs a three-city Goblin realm, Goblins vs a turtling Undead, Humans-or-Goblins vs the Undead isthmus fortress with naval technology forbidden.                                                                                         |

## 2. Architecture

### 2.1 A mission is data

A mission is one frozen object of type `MissionDefinitionV7`, in its own
module under `src/engine/v7/missions/`, registered in
`MISSION_REGISTRY_V7` (`src/engine/v7/missions/index.ts`). Sketch:

```ts
export interface MissionDefinitionV7 {
  /** Stable, SCREAMING_SNAKE; never reused for a different mission. */
  readonly id: string;
  /** Bumped whenever the built initial state changes (section 2.4). */
  readonly revision: number;
  /** Test fixtures: registered for headless and tests, in no chapter. */
  readonly hidden?: true;
  readonly size: 11 | 14 | 16;
  /** Fixed; it only seeds the treasure-chest draws. */
  readonly seed: number;
  /** Rows of `size` characters, y = 0 first (legend below). */
  readonly terrain: readonly string[];
  /** Same shape: resources; "." for none. */
  readonly resources: readonly string[];
  /** Default biome; `biomes` rows (P/W/H) override it per tile. */
  readonly biome: "PLAINS" | "WOODLAND" | "HIGHLANDS";
  readonly biomes?: readonly string[];
  readonly villages: readonly CoordV7[];
  readonly roads?: readonly CoordV7[];
  readonly fieldDefenses?: readonly CoordV7[];
  readonly improvements?: readonly {
    readonly at: CoordV7;
    readonly improvement: ImprovementIdV7;
  }[];
  readonly treasureChests?: readonly CoordV7[];
  /** Only with an Undead seat. */
  readonly graves?: readonly CoordV7[];
  /** Seat 0 is the human; 2–4 seats; `aiMode` as in a normal setup. */
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly seats: readonly MissionSeatV7[];
  /** Closed under prerequisites (section 2.3). */
  readonly forbiddenTechnologies: readonly TechnologyIdV7[];
  readonly objective: MissionObjectiveV7;
}

export interface MissionSeatV7 {
  /** A fixed faction, or (seat 0 only) a choice among these. */
  readonly faction: FactionIdV7 | { readonly choice: readonly FactionIdV7[] };
  readonly coins: number;
  readonly technologies: readonly TechnologyIdV7[];
  /** The first city is the seat's capital (its original capital). */
  readonly cities: readonly MissionCityV7[];
  readonly units: readonly MissionUnitV7[];
  /** Explored at start: radius around each own city, plus rectangles. */
  readonly reveal: {
    readonly radius: number;
    readonly rects?: readonly RectV7[];
  };
  /** AI seats only; absent means NORMAL. Read by the AI, never the engine. */
  readonly directive?: MissionDirectiveV7;
}

export interface MissionCityV7 {
  readonly at: CoordV7;
  readonly level: number;
  /** One reward per reached level 2…level, e.g. ["SURVEY", "WALLS"]. */
  readonly rewards: readonly RewardIdV7[];
}

export interface MissionUnitV7 {
  /** The mechanical role; it resolves through the seat's faction. */
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  /** Index into the seat's `cities`; default 0 (the capital). */
  readonly home?: number;
}

export type MissionObjectiveV7 = { readonly kind: "DOMINATION" };

export interface RectV7 {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}
```

**Terrain legend:** `.` Grass, `f` Forest, `^` Mountain, `~` water, `x` Rift.
Water is classified by the ordinary rule (Shallow when orthogonally adjacent
to land, otherwise Deep), so authors never write Shallow or Deep by hand.
**Resource legend:** `r` Fruit, `e` Fertile Ground, `g` Game, `o` Ore, `s` Fish,
`p` Pearls, `.` none. The builder refuses a resource on the wrong terrain.

Starting units are written by mechanical role (`FIGHTER`, `GUARD`, …), the
same way state stores them, so a seat whose faction is a choice gets the
chosen faction's unit of that role (a Fighter for Humans, a Goblin for
Goblins).

**Why authored maps, not seeded generation plus overrides.** The missions are
about one specific shape: a rush lane, a valley of villages, a ridge with two
passes, an isthmus one tile wide. The generator's invariants (capital
spacing, fairness bands, growth guarantee, port reach) actively fight those
shapes, and an override layer on top of a seeded board would have to be
re-validated against every generator change. The Showcase already proved the
authored path: a pure function from setup to an ordinary `GameStateV7` that
passes the full state schema. A 16 × 16 layout is 16 short strings, readable
in review and in diffs.

**Why only the existing sizes.** `BoardSizeV7`, the setup validation, the
camera, and the renderer all assume the square sizes 11, 14, 16, 20, and 25.
The teaser needs nothing else. Non-square or other sizes are a later,
separate change.

### 2.2 The builder

`missionInitialStateV7(setup)` (in `src/engine/v7/missions/build.ts`) turns a
registered definition into the initial state; `createInitialMapStateV7`
dispatches `mapType: "MISSION"` to it exactly as it dispatches `SHOWCASE`
today, and `createPlayableGameV7` then runs the first Start Turn as for every
match. The builder is pure and draws nothing from the PRNG.

- **Board.** Tiles from the layers; sites `CAPITAL`, `CITY`, `VILLAGE`;
  roads, Field Defenses, improvements; territory: every city claims the
  neutral cells of its centered 3 × 3 footprint, in city-ID order.
- **Entity IDs** follow the Showcase convention, which the state schema
  requires: seat `s` has capital ID `2s + 1` and its first unit ID `2s + 2`;
  then, each pass in seat order, the other cities, the population ledger, and
  the other units in definition order.
- **Population ledger.** Live records come from the authored improvements and
  Roads under the ordinary spatial rules (as the Showcase computes them).
  Permanent population is filled to exactly what the city's level needs
  (`growthSpent(level)`, so the city starts at population 0 of its level) with
  `HARVEST_FRUIT` records on empty footprint Grass tiles in `(y, x)` order,
  which is exactly the history an ordinary game would have left. A city whose
  footprint cannot hold enough records refuses the build. Rewards are history
  only: setup pays no Coins, unit, or exploration for them; `WALLS` sets the
  Walls; `BOOM` adds its own record.
- **Players.** Faction and tree from the setup (seat 0's choice included);
  `coins` from the definition (the first seat's first Start Turn then pays
  income as in every match); `researchedTechs` from the definition;
  `explored` from `reveal`; ordinary locked achievement entitlements. A seat
  that starts with a technology does not get the free opening research (the
  ordinary rule: the opener applies only while zero technologies are known).
- **Units** at full HP, zero kills, fresh activation, homed as written. As in
  the Showcase, creation performs no capacity check: a mission may start a
  seat over capacity, which then simply cannot train until a slot frees.
  Martian Shields would start full; Dinosaur units start hatched.
- **Turn order** is seat order, the human first. `random` is the Mulberry32
  initial state of the mission seed; `mapAttempt` is 1.
- **Build-time validation** (a thrown error, caught by tests long before
  release): layer shapes and legend; cities off the edge ring and on land;
  every seat owns exactly one capital first; distinct factions across the
  seats for every allowed choice; a choice only on seat 0 and none of its
  options played by an AI seat; units on terrain their form can stand on;
  forbidden technologies closed under prerequisites and disjoint from every
  seat's starting technologies; a waterless map forbids the whole Naval
  branch; Graves only with an Undead seat; the result passes
  `parseGameStateV7`.

### 2.3 Forbidden technologies

The engine already has one forbidden-technology rule: on `DRY_LAND` the
three Naval technologies are visible but cannot be researched
([current rules §6.1](RULESET_7_CURRENT.md#61-research-cost)). The mission
mechanism generalizes it into one function, the single source every surface
reads:

```ts
/** Technologies no seat may research in this match, with the reason. */
export function forbiddenTechnologiesV7(
  setup: MatchSetupV7,
): ReadonlyMap<TechnologyIdV7, "DRY_LAND" | "MISSION">;
```

- **Reducer:** `RESEARCH` of a forbidden technology is refused with the
  existing `TECH_REQUIRED { tech, reason }`, `reason` now `DRY_LAND` or
  `MISSION`. Like every rejection it changes no state.
- **Queries:** the public technology tree marks the node `DISABLED` (the
  existing state) and research offers never include it; the free opener
  never applies to it.
- **UI:** the tree card reads "Unavailable in this mission" (Dry Land keeps
  "Unavailable on Dry Land maps").
- **AI:** the Normal AI already researches only offered technologies. Its
  naval plan, gated today on `mapType === "DRY_LAND"`, is gated on
  "Shorecraft is forbidden" instead, so a mission with water but no Naval
  branch never plans Ports or boats.
- **Closure.** A definition must forbid a technology's dependants with it
  (forbidding Shorecraft forbids Navigation and Naval Engineering), so the
  tree never shows an "available" child of a disabled parent.

### 2.4 Identity, saves, and replays

- **Setup.** `MapTypeV7` gains `MISSION`. A mission setup carries the extra
  key `mission: { id: string, revision: number }` (and only a `MISSION` setup
  may carry it). Validation looks the pair up in the registry and requires
  every other field to match the definition: `width` and `height` equal
  `size`, `aiCount` equals seats − 1, `aiMode` and `seed` equal the
  definition's, `factions` equal the seats' factions with seat 0 inside its
  choice where it has one. `allowDuplicateFactions` is refused with
  `MISSION`. New refusal: `UNKNOWN_MISSION { id, revision }` when the pair is
  not registered (an unknown id, or a revision other than the current one).
- **State.** No new field. The mission's board, cities, units, and
  technologies are ordinary state; the forbidden technologies and the
  directives are derived from `setup.mission` on every read. The game-state
  schema version stays 7.
- **Replays** store the setup and the accepted commands, as now. Replaying
  rebuilds the initial state from the bundled definition, so a replay is
  deterministic exactly as long as the definition is unchanged — which the
  revision guarantees. AI decisions are not replayed (commands are), so a
  directive change never breaks a replay.
- **Revision discipline.** The registry holds only the current revision of
  each mission. A test pins `canonicalHash` of each registered mission's
  initial state (per allowed faction choice) to its revision; editing a
  layout, unit, city, or technology without bumping the revision fails that
  test. Directives and story text sit outside the hash: changing them never
  invalidates a save.
- **Ruleset identity.** `68k.2` changes the identity once (new map type, new
  setup key, new refusal code), with the ordinary consequences: the autosave
  key becomes `pulpWars.save.v7rNN.current`, the previous key joins
  `OBSOLETE_SAVE_STORAGE_KEYS_V7`, and the headless CLI accepts only `7rNN`.
  **Adding a mission or bumping a mission's revision does not change the
  ruleset identity**: the mission registry is versioned by
  `(id, revision)`, so skirmish saves survive campaign content work. Any rule
  change still bumps the identity as always, and that does delete an
  in-progress mission autosave; campaign progress lives under its own key
  and survives ([section 4.1](#41-storage)).
- **Loading a stale mission save.** `parseSaveV7` maps `UNKNOWN_MISSION` to
  `INCOMPATIBLE` with the diagnostic "This mission was updated since the game
  was saved. Start it again from the campaign." The save-recovery screen
  shows it with the usual Delete action.
- **Headless.** `--map-type mission --mission <ID>` on the CLI (the faction of
  a choice seat from `--factions`), and `runAiMatchV7` / `runAiBatchV7`
  accept a mission setup unchanged. Hidden fixture missions are runnable
  there but appear in no chapter.

### 2.5 AI directives

The Normal AI plays every mission with its ordinary policy plus at most one
directive per AI seat. Directives are plain data on the seat definition:

```ts
export type MissionDirectiveV7 =
  | { readonly kind: "NORMAL" }
  | { readonly kind: "RUSH"; readonly untilRound?: number }
  | {
      readonly kind: "HOLD";
      readonly zone: readonly RectV7[];
      readonly untilRound?: number;
    }
  | {
      readonly kind: "GUARD";
      readonly zone: readonly RectV7[];
      readonly garrison: number;
      readonly untilRound?: number;
    };
```

The AI finds its directive from its own public view: `view.setup.mission`
names the mission, `view.viewer.seat` the seat. A directive is active while
`view.round < untilRound` (always, without `untilRound`); after that the seat
plays `NORMAL`. Nothing reads hidden state, the clock, or the PRNG.

| Directive                 | Plan change (unit jobs in `v7-campaign.ts`)                                                                                                                                                                         | Leash (filter on ready commands) | Intended feel                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| `NORMAL`                  | none                                                                                                                                                                                                                | none                             | the ordinary opponent                               |
| `RUSH`                    | while a hostile city is known: no village, chest, or exploration jobs; every free land unit takes the `ATTACK` job; waves set out at once (wave size 1). With no hostile city known it plays `NORMAL` until one is. | none                             | "they attack straight away", in a stream            |
| `HOLD(zone)`              | no `ATTACK`, `VILLAGE`, `CHEST`, or `EXPLORE` job whose target lies outside the zone; a unit outside the zone gets a new `RETURN` job to the nearest zone tile                                                      | every own land unit              | "never leaves home, never attacks first"            |
| `GUARD(zone, garrison n)` | the `n` garrison units get the `RETURN` job until inside, then stay; every other unit plays `NORMAL`                                                                                                                | the garrison only                | "protects a place" while the rest of the army roams |

- **The leash.** For a leashed unit, the filter removes from the policy's
  ready commands every command that would end the unit's move outside the
  zone (a `MOVE`, a disembark, any ability that relocates the actor to a
  previewed tile outside). Attacks stay legal from inside the zone against
  any target in range, so a holding seat shoots back at a besieger beside its
  walls; an advance after a kill may carry the unit one tile out, and the
  `RETURN` job brings it back. `END_TURN`, research, training, construction,
  and every city command are never filtered, so a directive can never leave
  the AI without a legal command.
- **Garrison choice** (`GUARD`), recomputed at each of the seat's decisions,
  deterministic: own land units already inside the zone first, then by land
  route steps to the zone, then by unit ID; at most `n`; fewer when the seat
  has fewer units.
- **Zones** are unions of inclusive rectangles. Nothing else (no
  "own territory" zone: it grows as the seat expands and would make `HOLD`
  ambiguous).
- **No fork.** The directive enters the policy at exactly two points: the
  `CampaignFactsV7` handed to `campaignPlanForPolicyV7` (job filtering, the
  `RETURN` job, wave size) and a filter on `queryAiReadyCommandsV7` output in
  `NormalPolicyWorkV7`. Scoring, tactics, faction modules, research, and
  production are untouched. With `NORMAL`, and in every non-mission match,
  the filter is the identity and the plan facts are unchanged, so decisions
  are byte-identical (checked by the release corpus and the golden replay).
- **Revealing the target is data, not cheating.** A `RUSH` seat knows where
  to go because the mission's `reveal` rectangles include the human's
  capital, exactly as if its scouts had been there; the AI still reads only
  its public view.

### 2.6 Shared vs campaign-only

| Piece                                                    | Layer                            | Who may use it                                                   |
| -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `MISSION` map type, registry, builder, `UNKNOWN_MISSION` | engine                           | browser and headless; any future scenario, not only the campaign |
| `forbiddenTechnologiesV7`                                | engine                           | every match (Dry Land is its first user)                         |
| Directives                                               | AI (`src/ai/v7-directives.ts`)   | every mission match, browser and headless                        |
| Headless proxy variation (section 7.1)                   | headless and AI work loop        | tests and playtest scripts only; never the browser               |
| Chapter order, story, briefings, hints, unlock table     | app (`src/campaign/`)            | campaign UI only                                                 |
| Progress storage                                         | persistence (`src/persistence/`) | campaign UI only                                                 |
| Campaign screens and mission-aware dialogs               | DOM (`src/render/dom/`)          | browser                                                          |

The skirmish setup never builds a `MISSION` setup.

## 3. Objectives

This section is the teaser's. The objectives that exist now (`ESCORT`,
`SURVIVE`, `CAPTURE`, `KILL`, deadlines, protected places and units,
secondary goals) are in [section 10.1](#101-objectives-are-data); they took
the identity bump this section foresaw (`pulp-wars-poc-7r82`). Capture the
flag is still not built.

The teaser uses only `DOMINATION`, which is the existing outcome rule: the
human wins when every other player is eliminated (owns zero cities) and loses
when eliminated. It therefore needs no engine change beyond carrying the
objective in the definition.

The objective is a typed union with one member today. Later kinds are
additive, each its own reviewed rules change with an identity bump, because
an objective decides the outcome and the outcome is state that replays must
reproduce:

| Later kind      | Sketch                                        | Engine need                                         |
| --------------- | --------------------------------------------- | --------------------------------------------------- |
| `CAPTURE_SITE`  | own a named city at the start of your turn    | outcome check at Start Turn                         |
| `SURVIVE_TURNS` | still have a city when round N begins         | outcome check at round change                       |
| `ESCORT`        | a tagged unit reaches a tile; losing it loses | unit tag in state, outcome checks at move and death |
| `CTF`           | carry a flag token home                       | new token entity; deferred furthest                 |

All of them would read the objective from the mission definition through one
function, `missionOutcomeV7(state)`, which is the extension point. None is in
the teaser.

## 4. Progress and unlocks

### 4.1 Storage

- Key `pulpWars.campaign.v1` in localStorage, owned by
  `CampaignProgressStoreV7` (`src/persistence/campaign-v7.ts`). It is not a
  save key: it is never in `OBSOLETE_SAVE_STORAGE_KEYS_V7`, so ruleset
  identity changes leave it alone, and "Delete save" never touches it.
- Shape:

  ```json
  {
    "format": "pulp-wars-campaign-progress",
    "version": 1,
    "completed": {
      "FRONTIER_1": {
        "firstWonAt": "2026-10-03T12:00:00.000Z",
        "bestRounds": 14
      }
    }
  }
  ```

  Only completed missions are stored. Which missions are open and which
  factions are unlocked are **derived** from `completed` and the chapter
  table on every read, so the two can never disagree. Unknown mission IDs
  are kept and ignored (a mission removed from a later build does not wipe
  progress).

- **Recording a win.** When the controller observes the human's `VICTORY` in
  a match whose setup has a `mission` that belongs to a chapter, it records
  the win before the Victory dialog renders. Recording is idempotent (a
  replayed win only lowers `bestRounds`). It also runs when a completed
  mission save is resumed, so closing the tab during the dialog loses
  nothing.
- **Unreadable progress** (invalid JSON or shape): the campaign screen says
  "Campaign progress can't be read." with a Reset button (the save-recovery
  pattern) and records nothing until reset; skirmish is unaffected.
- **Reset progress** lives in Settings on the campaign screen, behind a
  confirmation.

### 4.2 Mission availability

- Missions of a chapter are linear: mission 1 is always open; mission N is
  open once mission N − 1 is completed.
- A completed mission stays playable from the list ("Play again"); winning
  it again changes only `bestRounds`.
- Defeat records nothing; Retry restarts the same setup.
- **Resume mid-mission** uses the one existing autosave slot: a mission is an
  ordinary match. The resume screen labels it ("Mission 2 · The Warrens ·
  Turn 7"). Starting a skirmish or another mission while one is saved uses
  the existing replace confirmation; the replaced mission can be started
  again from the list. One slot keeps persistence unchanged; a second slot
  is not worth its cost in the teaser ([appendix A](#appendix-a-critique-of-the-first-draft), item 7).
- No carry-over between missions (no persistent hero, army, or technology):
  every mission starts from its definition.

### 4.3 What unlocks gate

**Recommendation: skirmish keeps every faction unlocked.** The unlocks gate
the faction you may **lead in a campaign mission that offers a choice**, and
the campaign screen shows the unlocked roster as the reward.

Why not gate skirmish:

- Every faction is playable in skirmish today. Locking six of seven behind a
  four-mission teaser (and later behind a much longer campaign) would take
  away what players and the balance work use every day.
- The campaign is still a teaser whose direction is undecided; gating the
  rest of the game on it would couple two things that should stay separate
  until the direction is settled.
- The opposite is cheap to add later: a single "Campaign unlocks skirmish
  factions" switch reading the same derived set.

Teaser unlock table (in `src/campaign/chapter-1.ts`):

| Event         | Unlocks                                              |
| ------------- | ---------------------------------------------------- |
| always        | Human                                                |
| mission 2 won | Goblin (mission 3 is played as them)                 |
| mission 4 won | Undead (announced as the leader of the next chapter) |

Mission 4 offers Human or Goblin to seat 0, filtered to unlocked factions, so
the gate is real in the teaser (before mission 2 is won, mission 4 cannot be
open anyway; the filter is what a longer campaign will rely on).

## 5. UI flow

Every screen reuses the existing front-screen frame (`v7-front-screen`),
buttons, popups, and type; no new production art. Text follows the
[simplified interface overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-simplified-interface-overlay):
short and plain, with the pulp flavour confined to the story blurbs.

1. **Front screen.** Under the brand, a two-state control like "New map / Use
   seed": **Skirmish** (default; the existing setup form, unchanged) and
   **Campaign**. The choice lasts for the page session. The resume screen is
   unchanged except the mission label. (Superseded by the main menu,
   `pulp_wars-2yc.18`: Campaign is a button of the menu, and the mission
   label is under its Continue; see
   [the title scene and menu](../ui/SCREEN_FLOW.md#current-ruleset-7-title-scene-and-menu).)
2. **Campaign screen** (in place of the setup form): the chapter title
   ("Chapter One: The Hollow Frontier"), then one card per mission in order:
   number, name, the faction emblem(s) you lead (the faction's `FIGHTER`
   portrait), the opponent's emblem, and a state: **Locked** (dimmed,
   "Win the previous mission"), **Open**, or **Done** with "Best: N turns".
   Below the list, **Factions**: every faction emblem, dimmed until unlocked.
3. **Briefing** (selecting an open card): mission name, story blurb, an
   **Objective** line ("Capture every enemy city."), up to three hints, the
   map size and opponent, "You lead: Humans" or, for a choice mission, a
   faction select listing unlocked choices only. Buttons **Start mission**
   (with the existing replace confirmation when a game is saved) and
   **Back**.
4. **In match.** The match screen is unchanged. Settings shows "Mission: The
   Warrens" and the objective in place of "Map seed"; forbidden technologies
   read "Unavailable in this mission" in the tree.
5. **Victory** (mission): "Mission complete" with the closing line of the
   story; an unlock notice when one was earned ("New faction: Goblins", with
   the emblem); buttons **Next mission** (opens its briefing), **Campaign**.
   After the last teaser mission: "To be continued…" and **Campaign**.
6. **Defeat** (mission): "Mission failed", buttons **Retry** (the existing
   restart of the same setup) and **Campaign**.
7. **Accessibility.** The switch, cards, and briefing are keyboard reachable
   in reading order; card state is in the accessible name ("Mission 2, The
   Warrens, locked"); focus moves to the briefing heading on open and back
   to the card on Back.

A painted campaign map in the HoMM manner is out of scope: it is new
production art and needs an approved art direction first.

## 6. The teaser: Chapter One, "The Hollow Frontier"

This section describes the four missions as the teaser shipped them, on
hand-authored boards with conquest objectives. They were rebuilt by
`pulp_wars-v642.1`: the current boards, seats, and objectives are in
[section 9](#9-part-one-the-hollow-frontier-ten-missions) and
[section 11](#11-hand-play-record-missions-1-to-4), and the sketches and
coordinates below are history.

Captain Vera Steele of the Frontier Rangers holds the last fort before the
Hollow Hills. The goblins of Grubnak the Loud are coming down out of the
hills, and they are not coming to trade. Placeholder names, open to the
user's veto.

Map sketches use the terrain legend of [section 2.1](#21-a-mission-is-data)
plus these overlays: `H`/`h` your capital/city, `G`/`g` Goblin capital/city,
`U`/`u` Undead capital/city, `v` neutral village, `#` Field Defense on Grass,
`=` the isthmus (Grass). Resources are placed by the content bead under the
ordinary ring floors (every city ring gets at least three economic
opportunities from two families, and every capital two growth resources of
one kind) and are not drawn here. Coordinates are `(x, y)`.

### 6.1 Mission 1, "Goblins at the Gate" (`FRONTIER_1`)

Humans vs Goblins, 11 × 11, two seats, Rival. Easy. **Lesson:** a rush
breaks on Guards in a city; then counterattack.

```text
     x 0123456789A
y  0   ^^ff...ff^^
   1   ^f....ff..^
   2   f..v....G.f
   3   f.....f...f
   4   ..^^......f
   5   ...^..v.^..
   6   f......^^..
   7   f...f.....f
   8   f.H....v..f
   9   ^..ff....f^
  10   ^^f...ff^^^
```

| Seat        | Faction | Coins | Technologies | Cities                         | Units                                          | Reveal                  | Directive |
| ----------- | ------- | ----: | ------------ | ------------------------------ | ---------------------------------------------- | ----------------------- | --------- |
| 0 (you)     | Human   |     5 | Drill        | capital `(2,8)` L2 (Survey)    | Fighter ×2, Guard ×1 at and around the capital | radius 2                | —         |
| 1 (Grubnak) | Goblin  |     6 | Scouting     | capital `(8,2)` L2 (Stockpile) | Goblin ×4, Wolf Rider ×1                       | radius 2 + your capital | `RUSH`    |

Villages `(3,2)`, `(6,5)`, `(7,8)`. Forbidden: the Naval branch (no water).
The Goblins start over capacity (5 units, capacity 4 with Warrens), so the
first wave is their whole army and reinforcements trickle in as it dies.

**Briefing.** "Fort Hollow was meant to be a quiet posting. Then the drums
started. Grubnak's goblins are pouring out of the eastern hills, and they
are not here to trade. Hold the fort, Captain Steele, then show them the way
home." Hints: "Keep a Guard on your city." "Goblins hit hard and break
easily." "When the rush breaks, march east."

**Close.** "The rush broke on your walls. Grubnak fled north-east, to
something his goblins call the Warrens."

### 6.2 Mission 2, "The Warrens" (`FRONTIER_2`)

Humans vs Goblins, 14 × 14, two seats, Rival. Medium. **The AI starts with
three cities. Lesson:** catch up by grabbing villages first, then take the
weak outpost before the walled capital.

```text
     x 0123456789ABCD
y  0   ^^ff..ffff.^^^
   1   ^f.....f...f.^
   2   f...g.....f..^
   3   f.........G..f
   4   ..ff..^^.....f
   5   .f...^^....f..
   6   ..f....v...f..
   7   .v....^^...f..
   8   f.....^^...g..
   9   f..f.......f.f
  10   ..f......ff..f
  11   f..H...v....ff
  12   ^f....ff..f.^^
  13   ^^ff.....ff^^^
```

| Seat        | Faction | Coins | Technologies             | Cities                                                                                       | Units                                                     | Reveal                    | Directive |
| ----------- | ------- | ----: | ------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------- | --------- |
| 0 (you)     | Human   |     8 | Gathering, Scouting      | capital `(3,11)` L2 (Survey)                                                                 | Fighter ×2, Raider ×1                                     | radius 3                  | —         |
| 1 (Grubnak) | Goblin  |     5 | Drill, Scouting, Hunting | capital `(10,3)` L3 (Survey, Walls); `(4,2)` L2 (Stockpile); outpost `(11,8)` L2 (Stockpile) | Orc Brute ×1 (capital), Goblin ×2 per town, Wolf Rider ×1 | radius 2 around each city | `NORMAL`  |

Villages `(1,7)`, `(7,6)`, `(7,11)`, all nearer to you. Forbidden: the Naval
branch (no water). Three cities make the Goblins' research dearer (tier 2
costs 13, not 7), which is the natural brake on the head start.

**Briefing.** "The rush broke, but Grubnak has three strongholds and a
grudge. Your scouts count more goblins than bullets. The villages in the
valley will answer to whoever gets there first. Be first." Hints: "Villages
become cities: take them early." "The outpost to the east is the weak
point." "The walled capital comes last."

**Close.** "Grubnak, cornered in his own warrens, asks to talk. His goblins
did not come for your fort, he says. Something drove them out of the hills.
Something that does not breathe." **Unlocks: Goblin.**

### 6.3 Mission 3, "Green Tide" (`FRONTIER_3`)

**You lead the Goblins** against the Undead, 14 × 14, two seats, Rival.
Medium. **Lesson:** Goblin play (cheap Goblins, Kaboom, Gang Up) and striking
before a turtle matures. The Undead hold the north behind a ridge with two
passes and march at the new moon.

```text
     x 0123456789ABCD
y  0   ^^ff..f.ff.^^^
   1   ^f.....f...f.^
   2   f.u....U...v.f
   3   f...f.....f..f
   4   ..f.....f....f
   5   .f.....f.....f
   6   ^^.^^^^^^^.^^^
   7   ..v....f....v.
   8   f.....v......f
   9   .f..f.....f...
  10   f..........f.f
  11   f...G.....g..f
  12   ^f....ff...f^^
  13   ^^ff.....ff^^^
```

| Seat           | Faction | Coins | Technologies          | Cities                                                     | Units                                  | Reveal                    | Directive                                                  |
| -------------- | ------- | ----: | --------------------- | ---------------------------------------------------------- | -------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| 0 (you)        | Goblin  |     6 | Scouting, Drill       | capital `(4,11)` L2 (Survey); `(10,11)` L1                 | Goblin ×4, Wolf Rider ×1, Orc Brute ×1 | radius 2 + both passes    | —                                                          |
| 1 (the Undead) | Undead  |     5 | Drill, Administration | capital `(7,2)` L3 (Survey, Walls); `(2,2)` L2 (Stockpile) | Skeleton ×2, Zombie ×2, Necromancer ×1 | radius 2 around each city | `HOLD` zone `x 0–13, y 0–6`, `untilRound: 16`, then NORMAL |

Villages `(11,2)` (inside the Undead zone), `(2,7)`, `(12,7)`, `(6,8)`.
Graves at `(4,3)`, `(9,4)`, `(5,5)`. The ridge row `y = 6` opens at `x = 2`
and `x = 10` (Mountains are passable with Engineering). Forbidden: the Naval
branch (no water).

**Briefing.** "The dead took the warrens, and Grubnak wants them back. They
are digging in behind the ridge. Scouts say they won't cross it until the new
moon, sixteen days from now. Hit them before they're ready. And remember: a
goblin's best weapon is his last one." Hints: "The Undead won't cross the
ridge before turn 16." "Goblins are cheap: spend them." "Kaboom hurts
everything around it, yours too."

**Close.** "The warrens are green again. Among the ashes, Grubnak finds a
seal: a skull in a crown. The Ashen Marquis. His tower stands on Bone Neck."

### 6.4 Mission 4, "Bone Neck" (`FRONTIER_4`)

**You lead Humans or Goblins** (unlocked choices) against the Undead, 16 × 16,
two seats, Rival. Hard. **Lesson:** a breach. The Undead realm is a
peninsula joined to your shore by a one-tile isthmus three tiles long, under
a walled gate city with Field Defenses and a Lich. **Naval technology is
forbidden**, so the isthmus is the only way in.

```text
     x 0123456789ABCDEF
y  0   ^^ff..f~~~~^^ff^
   1   ^f..f..~~~~f..f^
   2   f......~~~~.f..f
   3   f..h...~~~..fU.f
   4   ..f..^.~~~...^.f
   5   .f...v.~~~~.^^.f
   6   f..f...~~~~~f..f
   7   ^......~~~#....^
   8   f..H...===#u...f
   9   ^......~~~#....^
  10   f..f...~~~~~f..f
  11   .f.....~~~~.f^^.
  12   ..v..f.~~~~.u..f
  13   f....v.~~~~.f..^
  14   ^ff....~~~~~^ff^
  15   ^^fff..~~~~~^^^^
```

The only land link between `x ≤ 6` and `x ≥ 10` is row 8, `x = 7–9`. The
gate city `(11,8)` owns the isthmus exit `(10,7)`, `(10,8)`, `(10,9)`, so its
Field Defenses count (fortification applies in the owner's territory).

| Seat                  | Faction                    | Coins | Technologies                                                                   | Cities                                                                                                    | Units                                                                                                                                            | Reveal                                      | Directive                                                               |
| --------------------- | -------------------------- | ----: | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
| 0 (you)               | Human or Goblin (unlocked) |    10 | Drill, Scouting, Hunting, Forestry                                             | capital `(3,8)` L3 (Survey, Walls); `(3,3)` L2 (Survey)                                                   | `FIGHTER` ×2, `GUARD` ×1, `RAIDER` ×1                                                                                                            | radius 2 + rect `x 7–12, y 6–10` (the gate) | —                                                                       |
| 1 (the Ashen Marquis) | Undead                     |     8 | Gathering, Hunting, Forestry, Sawmilling, Drill, Fortification, Administration | capital `(13,3)` L4 (Survey, Walls, Treasury); gate `(11,8)` L3 (Survey, Walls); `(12,12)` L2 (Stockpile) | gate: Zombie ×3 on the Field Defenses, Lich ×1 at `(11,7)`, Skeleton ×1 on the center; capital: Skeleton ×1, Necromancer ×1; `(12,12)`: Ghoul ×1 | radius 2 around each city + the isthmus     | `GUARD` zone `x 10–12, y 7–9`, `garrison: 4`; the rest NORMAL (sorties) |

Villages `(5,5)`, `(2,12)`, `(5,13)` on your shore. Field Defenses `(10,7)`,
`(10,8)`, `(10,9)`. Forbidden: Shorecraft, Navigation, Naval Engineering. The
choice is limited to Human and Goblin: Martian flyers would cross the water
and make the mission moot, so the choice list is part of the design, not
only of the unlocks.

**Revision 2** (`68k.6`,
[section 8.5](#85-68k6-normal-ai-siege-of-a-single-file-front)) differs
from this sketch in three numbers: **Sawmilling is forbidden too** (and the
Undead do not start with it), so nobody trains a Catapult, Rocket Cart, or
Lich; **you start with two siege units** (Catapults, or Rocket Carts for the
Goblins) at `(2,8)` and `(3,7)`; and the gate's unit at `(11,7)` is a
**Skeleton, not a Lich**. The layout, the cities, the Coins, the garrison
of four, and the Field Defenses are the sketch's.

**Briefing.** "The Ashen Marquis waits on the far shore of Bone Neck, a strip
of land one road wide. No boat will cross those waters. Who leads the
charge: Steele's Rangers or Grubnak's horde?" Hints: "One way in: the
isthmus." "Catapults or Rocket Carts outrange the gate." "Nobody builds
siege engines here: keep yours alive." (the third hint was "A Lich punishes
a crowd on the isthmus." until revision 2 took the Lich out).

**Close.** "The tower falls. From its ashes a dry voice offers terms: 'Every
army needs soldiers who never tire, Captain.' To be continued…"
**Unlocks: Undead.**

### 6.5 Difficulty and coverage

| Mission | Player | Opponent | Size | Directive            | Feature the user asked for             | Target difficulty |
| ------- | ------ | -------- | ---: | -------------------- | -------------------------------------- | ----------------- |
| 1       | Human  | Goblin   |   11 | `RUSH`               | AI attacks straight away               | easy              |
| 2       | Human  | Goblin   |   14 | `NORMAL`             | AI starts with several cities          | medium            |
| 3       | Goblin | Undead   |   14 | `HOLD` until turn 16 | AI does not attack; first faction swap | medium            |
| 4       | choice | Undead   |   16 | `GUARD` the gate     | fortress, isthmus, naval forbidden     | hard              |

All numbers above (coins, levels, unit counts, `untilRound`, garrison) are
first guesses; the content bead tunes them against
[section 7](#7-testing). The final values, and where they differ from the
sketches above, are in the
[`68k.4` tuning record](#83-68k4-content-the-four-teaser-missions-and-their-playtest).

## 7. Testing

### 7.1 Headless playability (`npm run playtest:campaign`)

The board, the starting position, and combat are deterministic, and the only
PRNG draws are treasure chests. **A mission played Normal AI against Normal
AI is therefore one game, whatever the seed.** Variation has to come from
the player's side:

- **Proxy variation** (headless and test only, never the browser): an option
  `proxyVariation: { seed, rate }` on `runAiMatchV7` for seat 0. At each
  seat-0 decision, a separate Mulberry32 stream (seeded from `seed`, never
  the match's `random`) decides with probability `rate` to take the second
  or third best candidate within the best candidate's priority band instead
  of the best, never substituting for `END_TURN` and never choosing
  `END_TURN` early. The command log is an ordinary valid replay.
- `scripts/campaign-playtest-v7.ts` runs each mission (each faction choice of
  mission 4) for 20 variation seeds at `rate` 0.15, up to 80 rounds, and
  writes `docs/validation/CAMPAIGN_TEASER_PLAYTEST.json` plus a short `.md`
  summary: win rate, median and range of winning rounds, AI cities captured
  from the proxy, and the directive compliance checks below. `--write` with
  another `--seeds` writes the same files for a smaller run of every
  mission (the files state their parameters); the checked-in evidence is
  such a run of 10 seeds (`68k.6`, at the user's request for a small run).

Acceptance bands (the Normal AI is a weaker player than an attentive human,
so the proxy's win rate is a floor on what a person will see):

| Mission | Proxy win rate | Median winning round | Directive check (every run)                                                                                                                                                                                                                                                                             |
| ------- | -------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | 70–100%        | ≥ 8                  | a Goblin land unit enters your territory by round 5                                                                                                                                                                                                                                                     |
| 2       | 35–90%         | ≥ 15                 | none (NORMAL); the Goblins capture or besiege a city of yours in ≥ 20% of runs (it must not be a walkover)                                                                                                                                                                                              |
| 3       | 30–90%         | ≥ 15                 | before round 16 no Undead land unit ends an Undead turn more than one tile outside the zone; after round 16 an Undead unit leaves the zone in ≥ 50% of runs where the Undead still have units                                                                                                           |
| 4       | 20–80% each    | ≥ 20                 | at every Undead End Turn without a unit of yours in the gate zone, at least `min(4, Undead land units)` stand in it; at most 2% of those End Turns may fall short (a replacement walking in after a garrison death). An End Turn with your units in the zone is the breach and is not counted (`68k.6`) |

"Not trivially won" is the upper bound and the round floor; "not hopeless" is
the lower bound. A mission outside its band is tuned (numbers first, layout
second) or its band is argued in the tuning record; the user's own playtest
of the teaser is the final word.

### 7.2 Unit and integration tests

- **Engine (`68k.2`):** builder output parses as `GameStateV7` for every
  registered mission and faction choice; the pinned `canonicalHash` per
  `(id, revision, choice)`; setup validation (every mismatch refused,
  `UNKNOWN_MISSION`, `allowDuplicateFactions` refused); forbidden research
  refused with `reason: "MISSION"` and no state change, the tree node
  `DISABLED`, never in offers, the free opener not applied; save round trip
  and replay of a mission; stale revision → `INCOMPATIBLE` with the mission
  diagnostic; Dry Land behaviour unchanged.
- **AI (`68k.3`):** hidden fixture missions `TEST_RUSH`, `TEST_HOLD`,
  `TEST_GUARD`: the leash never removes `END_TURN`; a leashed unit never ends
  a move outside its zone; `untilRound` switches exactly at the round; the
  garrison choice order; proxy variation is deterministic per seed and only
  ever picks offered commands; `NORMAL` and non-mission matches are
  byte-identical to before (golden replay, release corpus).
- **Campaign (`68k.5`):** progress store parse, write, idempotent record,
  unknown IDs kept, corrupt progress → recovery state; derived availability
  and unlocks; DOM: switch, list states, briefing, choice select filtered to
  unlocked factions, mission Victory and Defeat dialogs with Next, Retry and
  Campaign, unlock notice, resume label; controller: a `VICTORY` of a mission
  records progress before the dialog, and on resume of a completed save.

### 7.3 Browser smoke (`npm run smoke:browser`)

Add a campaign probe: open Campaign, mission 1 Open and mission 2 Locked;
open the briefing; Start; the board renders on the human's turn; Settings
shows the mission; a Naval node reads "Unavailable in this mission"; return to
menu; the resume screen shows the mission label; then, with a seeded
progress key, mission 4's briefing offers exactly the unlocked choices. The
storage-isolation check grows from three keys to four (the campaign key must
survive save deletion and obsolete-key cleanup).

## 8. Implementation beads

Linear, each a coherent reviewable outcome. Beads may not widen their scope;
work they discover becomes a new bead.

### 8.1 `68k.2` Engine: missions, authored maps, forbidden technologies

Scope: `MissionDefinitionV7` and registry, the builder, `MISSION` map type and
`setup.mission`, `UNKNOWN_MISSION`, `forbiddenTechnologiesV7` (reducer,
tree query, offers; Dry Land through the same function), the pinned-hash
test, save and replay support, the stale-mission diagnostic, the headless
`--mission` flag, one hidden fixture mission `TEST_GROUNDS`, the identity
bump to `7rNN`, and the rules text: a new
[current rules](RULESET_7_CURRENT.md) section "2.6 Mission setup" and the
§6.1 forbidden-technology sentence, plus the CLIENT_ARCHITECTURE and
HEADLESS_SIMULATION notes. No AI change, no UI beyond the tree label.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-missions.test.ts tests/unit/ruleset-v7-revision18-showcase.test.ts tests/replay ; npm run typecheck ; npm run lint
Conditional final gates: npm run check ; npm run validate:ruleset6-release ; npm run validate:ruleset7-release ; npm run smoke:browser (autosave key change is observable at startup) ; npm run smoke:browser:legacy-v5 (schema handling and compatibility routing)
```

**Implementation notes (`68k.2`, `pulp-wars-poc-7r34`).** Where this design
left a detail open, the engine decided:

- The pinned hash leaves the ruleset ID out, so an identity bump alone never
  fails it; a rule change that alters a mission's built state re-pins it.
- A city whose live population alone exceeds `growthSpent(level)` gets no
  harvest record and starts with that surplus (it must stay below
  `level + 1`); otherwise it starts at population 0 of its level.
- A replay of an unregistered `(id, revision)` is `INCOMPATIBLE_REPLAY`
  (the save gets the diagnostic of section 2.4).
- Every seat needs at least one unit (its first unit takes ID `2s + 2`); a
  unit may not start on another seat's city or dock, and a village may not
  lie in a city's territory.
- `missionMatchSetupV7(mission, faction?, color?)` builds a mission's setup;
  the CLI refuses `--seed`, `--size`, `--ai-count`, `--cooperative`, and
  `--allow-duplicate-factions` with `--map-type mission`, and batches do not
  take `mission`.
- The directive types of section 2.5 are declared with the definition
  (`src/engine/v7/missions/types.ts`) for `68k.3`; no AI reads them yet.

### 8.2 `68k.3` AI: mission directives and proxy variation

Depends on `68k.2`. Scope: `src/ai/v7-directives.ts` (`NORMAL`, `RUSH`,
`HOLD`, `GUARD`, `untilRound`, zones, garrison choice), the two hook points
in `v7-campaign.ts` and `NormalPolicyWorkV7`, the `RETURN` job, the naval
plan gated on forbidden Shorecraft, the hidden fixtures `TEST_RUSH`,
`TEST_HOLD`, `TEST_GUARD`, the headless `proxyVariation` option, and the
NORMAL_AI and HEADLESS_SIMULATION sections.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-mission-directives.test.ts tests/unit/ruleset-v7-campaign-ai.test.ts ; npm run typecheck ; npm run lint
Conditional final gates: npm run check ; npm run validate:ruleset6-release ; npm run validate:ruleset7-release
```

**Implementation notes (`68k.3`, no identity change).** The full account is
in [Greedy Normal AI](../architecture/NORMAL_AI.md#mission-directives-pulp_wars-68k3)
and [Headless simulation](../architecture/HEADLESS_SIMULATION.md#mission-directives-and-proxy-variation-pulp_wars-68k3).
Where section 2.5 left a detail open, the AI decided:

- **A leashed unit outside its zone** keeps the relocations that bring it
  closer (fewer land-route steps, or a smaller distance where no explored
  route exists); every other relocation ending outside is removed. Without
  this a unit carried out by an advance, trained in a city outside the zone,
  or starting outside could never walk its `RETURN` job.
- **Leashed units:** `HOLD` leashes every own land or embarked unit, `GUARD`
  its garrison. The relocating commands are a Move's last tile, a Disembark,
  a Bomb Run landing, a Tunnel (Mole and rider), and a Beam Down passenger.
- **`RUSH`** also drops the defence job of free units (only the reserve,
  defenders walking to a threatened city, still defends). A unit with no
  explored land route to the known city has no job and approaches it
  directly; the content bead should reveal a route (mission 1's reveal of
  the human capital is enough on its open board).
- **`RETURN`** goes to the zone tile nearest by distance, then by the
  straighter line; the route field covers the whole zone. A `GUARD`
  garrison unit inside the zone takes `RETURN` to its own tile (it stays). A
  unit on an own city center with a hostile unit near, or a defender bound
  for a threatened city, keeps that objective, as in every match.
- **Priority band** of the proxy variation is the best candidate's exact
  `priority`; with one qualifying alternative it is taken, with two a second
  draw picks. `rate` must lie in `[0, 1]`.
- **Directive checks** (`validateMissionDirectivesV7`, a test over the
  registry; the engine does not read directives): only AI seats, non-empty
  on-board zones, a positive garrison, `untilRound` of at least 2.
- **Fixtures** `TEST_RUSH`, `TEST_HOLD`, `TEST_GUARD` (revision 1,
  `src/engine/v7/missions/test-directives.ts`) are pinned in the mission
  hash test like `TEST_GROUNDS`. `TEST_GROUNDS` (water, Naval branch
  forbidden) plays differently from `68k.2` only through the naval gate.
- **Section 7.1, mission 4:** a dead garrison unit is replaced by the next
  unit in the choice order, which has to walk in; in a fixture run where the
  human army occupied the zone, 5 of 30 End Turns fell short. The content
  bead should read the "every End Turn" check with that in mind.

### 8.3 `68k.4` Content: the four teaser missions and their playtest

Depends on `68k.3`. Scope: `FRONTIER_1`–`FRONTIER_4` definitions (resources,
final numbers), `src/campaign/chapter-1.ts` (order, story, briefings, hints,
unlock table; data only), `scripts/campaign-playtest-v7.ts` with the npm
script `playtest:campaign`, the evidence files, tuning to the bands of
[section 7.1](#71-headless-playability-npm-run-playtestcampaign), and the
tuning record appended to this document. Adding missions does not bump the
ruleset identity.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-missions.test.ts tests/unit/campaign-chapter-v7.test.ts ; npm run playtest:campaign ; npm run typecheck ; npm run lint
Conditional final gates: npm run check ; npm run validate:ruleset6-release ; npm run validate:ruleset7-release ; root review of the playtest evidence against section 7.1
```

**Implementation notes and tuning record (`68k.4`, no identity change).**
The missions are `src/engine/v7/missions/frontier-1.ts` … `frontier-4.ts`
(revision 1 each, pinned in the mission hash test), the chapter data is
`src/campaign/chapter-1.ts` (`CHAPTER_ONE_V7`: order, intro, briefings,
Objective line, hints, closing lines, outro, starting factions, and
per-mission unlocks; tested by `tests/unit/campaign-chapter-v7.test.ts`,
which also refuses tile coordinates and engine identifiers in player
text), and the evidence is
[`CAMPAIGN_TEASER_PLAYTEST.md`](../validation/CAMPAIGN_TEASER_PLAYTEST.md)
with its per-run `CAMPAIGN_TEASER_PLAYTEST.json`, written by
`npm run playtest:campaign` (20 variation seeds from 1 at rate 0.15, up to
80 rounds, every faction choice of mission 4; `--missions`, `--factions`,
`--seeds`, `--first-seed`, and `--runs` explore without writing). The full
run takes about 25 minutes with 8 jobs, mostly mission 4's matches running
to the round cap.

**The Industry reshuffle (`pulp_wars-w49.21`, `pulp-wars-poc-7r56`).** The defender of every faction is unlocked by Fortification, so every mission seat that owns Drill and fields its defender owns Fortification too: `FRONTIER_1`, `FRONTIER_2`, and `FRONTIER_3` are revision 2 and `FRONTIER_4` is revision 3. No unit, Coin, or map changed, and the playtest was not rerun. The technology lists in the tables of this document are as authored; [the record](RULESET_7_INDUSTRY_RESHUFFLE.md#5-labs-the-showcase-and-missions) has what each seat was given.

_Final setups_ (every mission is 1 Human-side seat against 1 AI seat,
Rival, the Naval branch forbidden; resources follow the ring floors of
section 6):

| Mission      | You                                                                                                                                                    | AI                                                                                                                                                                                                   | Directive                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `FRONTIER_1` | Human, 8 Coins, Drill; capital `(2,8)` L3 (Survey, Walls); Guard ×2, Fighter ×3                                                                        | Goblin, 0 Coins, Scouting; capital `(8,2)` **L1**; one Goblin at home and a war band in the field (Goblin ×4, Wolf Rider ×1 between `(4,4)` and `(6,6)`); villages `(3,2)`, `(9,5)`, `(7,8)`         | `RUSH`; reveal: your capital and the lane        |
| `FRONTIER_2` | Human, 10 Coins, Gathering, Scouting; capital `(3,11)` L3 (Survey, Walls) with Guard, Fighter ×2, Raider; **town `(7,11)` L2** with Guard, Fighter     | Goblin, 0 Coins, Drill, Scouting, Hunting; capital `(10,3)` L3 (Survey, Walls) with Orc Brute, Goblin, Wolf Rider; towns `(4,2)`, `(11,8)` L2 (Stockpile) with Goblin ×2 each                        | `NORMAL`; villages `(1,7)`, `(7,6)`, **`(5,8)`** |
| `FRONTIER_3` | Goblin, 6 Coins, Scouting, Drill; capital `(4,11)` L2 (Survey), town `(10,11)` L1; Goblin ×4, Wolf Rider, Orc Brute; reveal both passes                | Undead, 5 Coins, **Gathering**, Drill, Administration; capital `(7,2)` L3 (Survey, Walls), town `(2,2)` L2 (Stockpile); Skeleton ×2, Zombie ×2, Necromancer; Graves as sketched                      | `HOLD` x 0–13, y 0–6, `untilRound: 16`           |
| `FRONTIER_4` | Human or Goblin, 10 Coins, Drill, Scouting, Hunting, Forestry; capital `(3,8)` L3 (Survey, Walls), town `(3,3)` L2 (Survey); Fighter ×2, Guard, Raider | Undead, 8 Coins, the seven sketched technologies; capital `(13,3)` L4 (Survey, Walls, **Boom**) with two Lumber Camps; gate `(11,8)` L3 (Survey, Walls); `(12,12)` L2 (Stockpile); units as sketched | `GUARD` x 10–12, y 7–9, garrison 4               |

Differences from the section 6 sketches, all content: mission 1's middle
village moved from `(6,5)` to `(9,5)`, off the rush lane, and the Goblin
army starts in the field (bold above); mission 2 gives you a second city
in place of the `(7,11)` village, whose village moved to `(5,8)`; mission 3's
Undead also know Gathering (Administration requires it, and the builder
refuses a technology without its prerequisite); mission 4's level-4 reward
is Boom, not Treasury (the capital's footprint holds four free Grass tiles,
and Treasury would need nine harvest records). The briefings, hints, and
closing lines are section 6's text unchanged.

_Results against the section 7.1 bands_ (seeds 1–20; a second set,
seeds 21–40, gave mission 1 95%, mission 2 70%, mission 3 50%, every
directive check passing):

| Mission            | Proxy win rate (band) | Median winning round, range (floor) | Directive check                                                                                                       |
| ------------------ | --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1                  | 100% (70–100%)        | 26.5, 14–40 (≥ 8)                   | a Goblin land unit in your territory by round 5 in 20/20 runs (latest: round 3)                                       |
| 2                  | 55% (35–90%)          | 27, 20–44 (≥ 15)                    | the Goblins captured or besieged a city of yours in 16/20 runs (80% ≥ 20%)                                            |
| 3                  | 40% (30–90%)          | 30, 20–49 (≥ 15)                    | no hold violation in 20/20 runs (worst distance 1); left the zone after round 16 in 16/20 runs with units (80% ≥ 50%) |
| 4 (Human / Goblin) | **0% / 0% (20–80%)**  | — (≥ 20)                            | garrison of four in the gate zone at 100% of AI End Turns in every run                                                |

_Tuning history._

- **Mission 1** (design numbers: 0% win, the Goblins took the fort in every
  run by round 15). The Normal AI on your side researches first and spreads
  its few units over villages, and the middle village on the rush lane
  became a Goblin town that the rush stopped to hold. Steps: your capital
  L3 with Walls, 8 Coins, a second Guard (0%); the Goblin capital L1 with 0
  Coins (10%); one Goblin fewer (5%); five Human units (60–100%, but the
  rush met your army in the open and reached your territory by round 5 in
  only 8–10 of 20 runs); the middle village moved east and the war band
  started in the field (100%, incursion 16/20); one more war-band Goblin
  (incursion 19/20; a sixth tipped it to 70% wins with captures by round
  6); the extra Goblin placed nearer your fort instead (100%, incursion
  20/20). The rush still breaks and the counterattack is slow (median round
  26), so "easy" holds without being a walkover.
- **Mission 2** (design numbers: 0%, your capital fell by round 12–22 in
  every run). Three Goblin cities out-produce one Human city many times
  over (1-Coin Goblins, a Wolf Rider that takes an empty capital): even
  with your capital L3, five then seven starting units, 15 Coins, the
  Goblin towns at L1, and the Goblins' Scouting removed, the proxy won 0–10%.
  A calibration with only the Goblin capital gave 85%, with capital and
  outpost 20%. The lever that worked is a second Human city: with it the
  proxy won 100%, and restoring the Goblins toward the sketch (Scouting,
  towns L2 with Stockpile, the Wolf Rider, two Goblins per town) brought it
  to 55%. The Goblins still keep the head start in cities (three to two).
- **Mission 3** met its band with the design's numbers (40%; 50% on the
  second seed set). One checker refinement: an Undead Infect or Bite raises
  a Zombie on its victim's tile, which can lie two tiles outside the zone in
  the AI's own turn before the leash can move it; the check counts such
  just-risen units apart (it happened once on seeds 1–20) and requires
  every unit that existed at the AI's previous End Turn to stay within one
  tile.
- **Mission 4** is **not reachable by content**: the proxy never breaches
  the isthmus, with either faction, and the match runs to the round cap
  (the Undead take a village-city now and then). Numbers and layout tried,
  eight seeds each, all 0% (one 1-in-8 win, at round 74): Undead 0 Coins,
  lower levels, the peninsula's growth resources removed; starting
  Catapults for you; Sawmilling forbidden (no Liches or Catapults beyond the
  start); the gate without Field Defenses, Walls, or Zombies and a garrison
  of two; the Lich moved away; `GUARD` released at round 15; the isthmus
  widened to two tiles; even a `NORMAL` Undead seat; and the whole Industry
  branch forbidden (no Guards or Zombies), the only change that produced a
  win. Traces show why: the Normal AI attacks only at favourable odds, so
  two lines of high-Defense units (Guards and Zombies on Field Defenses)
  facing each other across a one-file front never engage, and a unit of
  your own parked on the isthmus (a Catapult with a target every turn, or a
  Guard that will not attack) corks the only path for the rest of the army.
  It is a limit of the Normal AI as a proxy at a chokepoint, not of the
  mission's numbers, so mission 4 keeps the design's numbers (the Boom
  substitution aside) and its band is argued here: the proxy's 0% is a
  floor, and the user's own playtest decides whether a person breaches the
  gate (Catapults from the isthmus, the Lich first). Making the band
  measurable needs either a Normal AI siege behaviour for a single-file
  front (an AI change, outside content) or a different mission shape.
  `68k.6` did the first and then tuned the mission to revision 2:
  [section 8.5](#85-68k6-normal-ai-siege-of-a-single-file-front). The
  mission 4 rows of the two tables above are revision 1.
- **Directive compliance** held everywhere: every `RUSH` run reached your
  territory by round 3, no `HOLD` unit strayed more than one tile before
  round 16, and the `GUARD` garrison was full at every Undead End Turn
  (the enemy never entered the zone, so the section 8.2 caveat never
  applied).

### 8.4 `68k.5` Campaign UI and progress

Depends on `68k.4`. Scope: `CampaignProgressStoreV7` and the storage key,
controller recording of wins, the front-screen switch, campaign screen,
briefing with the filtered choice, mission label and objective in Settings,
mission Victory and Defeat dialogs, unlock notice, resume label, reset, the
smoke probe, and the SCREEN_FLOW overlay "Campaign" plus the
CLIENT_ARCHITECTURE persistence note. It completes the epic.

```text
Validation profile: ai/map/persistence + ui/presentation
Worker focused checks: npx vitest run tests/unit/campaign-progress-v7.test.ts tests/integration/ruleset7-campaign-dom.test.ts tests/integration/ruleset7-browser-controller.test.ts ; npm run typecheck ; npm run lint
Conditional final gates: npm run check ; npm run validate:ruleset6-release ; npm run smoke:browser (new user-visible flow) ; because it closes the epic (final integration), the root runs the cross-cutting/release set of CLAUDE.md once at close
```

**Implementation notes (`68k.5`, no identity change).** The screens are
described in the
[screen flow overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-campaign-overlay)
and the storage and controller in
[client architecture](../architecture/CLIENT_ARCHITECTURE.md#campaign-progress-and-screens-pulp_wars-68k5).
Where sections 4 and 5 left a detail open, the UI decided:

- **Leaving a finished mission** (Next mission, Campaign) deletes the
  finished match from the one autosave slot; its win is already recorded.
  A finished skirmish keeps its old behaviour (the dialog stays until Play
  again or Delete).
- **The unlock notice** shows the factions the recorded win newly unlocked,
  so it appears for the win that first unlocked them and not for a replayed
  win or a reloaded dialog.
- **Reset progress** sits in a "Settings" disclosure at the foot of the
  campaign list and asks "Erase all campaign progress?" first. Progress the
  store cannot read is never overwritten by a later win until it is reset.
- **Briefing facts** are the map size chip ("11 × 11"), "vs" with the
  opponent's emblem and name, and "You lead" (a select only when the
  filtered choice has more than one faction).
- **Fixtures.** `tests/fixtures/v7-campaign-ui.ts` plays a chapter mission
  to its end with the Normal AI on one side and a side that only ends its
  turns on the other (mission 1 is won in 15 rounds, mission 2 in 15, and
  mission 1 is lost in 5). Mission 4 is not won this way even against an
  AI that only ends its turns, which agrees with the tuning record above.

### 8.5 `68k.6` Normal AI: siege of a single-file front

Follows from the mission 4 finding of
[section 8.3](#83-68k4-content-the-four-teaser-missions-and-their-playtest).
Scope: a general siege behaviour of the Normal AI for a single-file front
(`src/ai/v7-chokepoint.ts` and its hooks in `src/ai/v7.ts`), the hidden
fixture mission `TEST_NECK`, mission 4's revision 2, the playtest's `GUARD`
check and `--write`, the evidence files, and the NORMAL_AI section. No rule
changes and no identity bump.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-chokepoint-ai.test.ts tests/unit/ruleset-v7-mission-directives.test.ts tests/unit/ruleset-v7-campaign-ai.test.ts tests/unit/ruleset-v7-missions.test.ts tests/unit/campaign-chapter-v7.test.ts and the AI and source-audit tests ; npm run playtest:campaign -- --seeds 10 --write ; npm run typecheck ; npm run lint
Conditional final gates: npm run check ; npm run validate:ruleset6-release ; npm run validate:ruleset7-release ; npm run smoke:browser (mission 4's starting position changed)
```

**The siege** is described in
[Greedy Normal AI](../architecture/NORMAL_AI.md#siege-of-a-single-file-front-pulp_wars-68k6).
In short: where every land route from the seat's cities to its nearest
known enemy city runs through a one-tile corridor that ends, before that
city, at a position hostile units hold in their own territory, one melee
unit holds the head of the corridor and a wounded head withdraws when the
tile behind it is free; siege units fire from tiles that hit the defenders
and never block the corridor; all fire goes to one defender a turn; a melee
attack at odds the policy otherwise refuses is made on a defender at half
its HP or less, or once the seat's unspent Coins reach 30 (the policy has
no memory, so the treasury is its attrition clock); and when the defenders
are gone the column goes through. A board without such a front decides
exactly as before: 31 headless matches on the five generated map types
have equal hashes with the siege on and off, and missions 1–3 have the
same final-state hash in all 30 runs.

**Mission 4, revision 2.** The siege alone does not make the design's
mission winnable for the proxy, so the mission's numbers changed, as little
as the band allowed:

| Revision 2 differs from the section 6.4 sketch in | Why                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sawmilling forbidden (and not an Undead start)    | With Sawmilling the Undead hold five or six Liches by round 15. A Lich and a Catapult have the same range and neither attacks after moving, so the one already in place shoots first, and a Lich kills a Catapult in one shot. The besieger's siege units never get to fire. |
| Two starting siege units for you                  | Nobody can train one. Catapults for the Humans, Rocket Carts for the Goblins, at `(2,8)` and `(3,7)`.                                                                                                                                                                        |
| A Skeleton at `(11,7)` instead of the Lich        | One Lich behind the mouth reaches the isthmus and cannot be reached from your shore. Its kills promote it to 15 HP, which survives a Catapult shot (12); with it kept, 0 of 8 runs were won, and in the traced run both starting Catapults were dead by round 16.            |

The layout (the isthmus three tiles long), both economies, the Coins, the
garrison of four, and the three Field Defenses are the sketch's. The third
hint, "A Lich punishes a crowd on the isthmus.", became "Nobody builds siege
engines here: keep yours alive." These are content decisions made to reach
the band; the user's own playtest remains the final word on them.

_Results_ (10 variation seeds from 1, rate 0.15, up to 80 rounds; the
siege is switched off with `setChokepointPolicyOptionsV7`):

| Mission 4                         | Human                                      | Goblin                                     |
| --------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Revision 1, policy before `68k.6` | 0% (9 unfinished, 1 loss)                  | 0% (10 unfinished)                         |
| Revision 1, with the siege        | 0% (10 unfinished)                         | 0% (10 unfinished)                         |
| Revision 2, siege switched off    | 0% (10 unfinished)                         | 50% (winning rounds 43–73)                 |
| Revision 2, with the siege        | **30%** (winning rounds 56–71, median 60)  | **40%** (winning rounds 54–77, median 68)  |
| Band                              | 20–80%, median winning round ≥ 20: in band | 20–80%, median winning round ≥ 20: in band |

So the Humans needed both: revision 2 without the siege is still 0%
(a Guard does 2 damage to a Zombie on a Field Defense and takes 9), and
the siege on revision 1 is 0%. The Goblins win revision 2 with or without
the siege (five and four of ten: the difference is within the noise of ten
runs). With the siege every win takes more than fifty rounds, so the
mission stays the chapter's long, hard one. Missions 1–3 are unchanged
(100%, 60%, and 50% on the same ten seeds, each run with the same final-state
hash as without the siege).

_Tuning history_ (eight seeds each, Human; the siege was still changing
between these runs, so they are a record of the search, not a comparison).
The first four had the isthmus shortened to two tiles, so that three tiles
of your shore reach the mouth, and a small Undead realm (capital level 2,
no third city, 0 Coins, no Administration):

- the Undead start without Sawmilling (they research it) and keep the
  starting Lich: 0 of 8;
- the same without the starting Lich: 0 of 8;
- Sawmilling forbidden, two starting Catapults, the starting Lich kept:
  0 of 8;
- Sawmilling forbidden, two starting Catapults, no Lich: 5 of 8, won in
  rounds 26–36.

Then the design's layout and economy came back with only the three changes
of the table above: in band, which is revision 2.

**Decided here.**

- **The `GUARD` check counts the breach apart.** The proxy now enters the
  gate zone, and an Undead End Turn with a unit of yours in the zone falls
  short of the garrison because the garrison is being killed or kept out.
  Such End Turns are not counted; of the others at most 2% may fall short
  (a replacement walking in). On the ten seeds: 34 short End Turns of 744
  (Human) and 41 of 743 (Goblin), all but one with your units in the zone.
- **The evidence is a run of 10 seeds** (the user asked for a small run),
  written with the playtest's `--seeds 10 --write`; the files state their
  parameters. The default run of 20 seeds still writes them.
- **`TEST_NECK`** (revision 1, `src/engine/v7/missions/test-neck.ts`) is
  pinned in the mission hash test like the other fixtures.
- **Open.** The siege is measured on one real front. Revision 2 has no
  Lich and no trainable siege unit, so the savings goal and the siege
  training bias of the policy are exercised only by tests and by revision
  1, where they work (the Human proxy researches Sawmilling by round 4 and
  fields two Catapults by round 6) but the Liches still win. A mission
  with a Lich behind a single-file gate stays beyond the proxy.

## 9. Part one, "The Hollow Frontier": ten missions

`pulp_wars-v642.1` (epic `pulp_wars-v642`; the user, 2026-10-14: "I want
more. Make 10 total for now", maps "as natural looking as the generated
ones", "a narrative connecting the missions", "different format missions",
"New missions should unlock more factions but keep cultists for last").
This section replaces [section 6](#6-the-teaser-chapter-one-the-hollow-frontier)
as the description of the campaign's content: the four teaser missions keep
their lessons and are rebuilt on generated maps
([section 11](#11-hand-play-record-missions-1-to-4)); six more are designed
here and were listed in the game as "Coming soon" until they were built
(missions 9 and 10, the last, by `pulp_wars-v642.4`). The
text the player reads is in `src/campaign/chapter-1.ts`.

### 9.1 The story

A pulp serial in ten instalments, part one of more.

1. Captain Vera Steele of the Frontier Rangers holds Fort Hollow when
   Grubnak the Loud's goblins come down out of the hills. She beats them,
   follows them home, and learns they were running from something.
2. The something is the dead. Steele and Grubnak, now on the same side,
   break the Ashen Marquis's gate at Bone Neck, and the Marquis asks for
   terms: he did not choose to wake. **Someone is ringing a bell under the
   mountains.**
3. The trail runs up the mountain (the Dwarves of Ironbraid Hold, whose
   bell it is, and the Ice Folk it called down), then out to sea, where the
   bell called a star down onto an island of dinosaurs. The star is a
   Martian ship, and the Martians say they were not invading: they were
   answering.
4. The call has torn a hole in the world, and a besieged kingdom of sweets
   falls out of it. Its queen has seen who sings to the hole: grey hoods,
   the Lodge of the Unblinking Eye.
5. Steele takes the Lodge one toll short of the Great Summoning, and the
   Cultists, as always, kneel to the winner. **But in the shaft where the
   bell hung, something that was called has opened one eye.** End of part
   one.

The recurring villain of the middle missions is Baron Kessler, a Human
robber baron who sells his guns to whoever pays, so that Human AI seats
have a reason to oppose every faction the player leads. The Cultists are
foreshadowed from mission 4 (the bell), named in mission 9, fought and
unlocked in mission 10.

### 9.2 The ten missions

"Rounds" is the target length for a competent player; the star column is
the two secondary goals (the first star is the win).

| #   | Mission (`ID`)                             | You lead          | Against                                                            | Format                    | Map                            | Win / lose                                                                      | Lesson or twist                                                          | Unlocks   | Rounds | Difficulty | Stars                             |
| --- | ------------------------------------------ | ----------------- | ------------------------------------------------------------------ | ------------------------- | ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- | ------ | ---------- | --------------------------------- |
| 1   | Goblins at the Gate (`FRONTIER_1`)         | Humans            | Goblins (rush)                                                     | Conquest                  | Dry Land 11                    | capture the Goblin camp                                                         | hold a wall against a rush, then counter-attack; your first giant        | none      | 10–12  | Easy       | by turn 12; lose no city          |
| 2   | The Warrens (`FRONTIER_2`)                 | Humans            | Goblins (three cities)                                             | Capture                   | Dry Land 14                    | capture the Warrens (their capital)                                             | expand first: villages, then an army that sticks together                | Goblins   | 14–18  | Medium     | by turn 18; lose no city          |
| 3   | Green Tide (`FRONTIER_3`)                  | Goblins           | Undead (holds its plain until turn 16)                             | Capture                   | Dry Land 14                    | capture the Barrow (their capital)                                              | play the horde: Troll toss, Kaboom, Gang Up; your dead rise against you  | none      | 11–15  | Medium     | by turn 15; lose no city          |
| 4   | Bone Neck (`FRONTIER_4`)                   | Humans or Goblins | Undead (guards the gate)                                           | Capture                   | Continents 16, one land bridge | capture the gate city                                                           | a breach: two siege engines, no boats, one way in                        | Undead    | 10–14  | Hard       | by turn 12; lose no city          |
| 5   | Dead Men's Road (`FRONTIER_5`)             | Undead            | Humans (toll fort), Ice Folk (raiders), one side                   | Escort                    | Dry Land 16, a mountain wall   | bring Doctor Crane to the Ironbraid gate by turn 20 / he dies, or time runs out | protect one fragile unit on a long road; go round or go through          | Dwarves   | 13–16  | Medium     | by turn 16; lose no city          |
| 6   | The Deep Gate (`FRONTIER_6`)               | Dwarves           | Ice Folk (north, over the peaks), Humans (east, through the doors) | Hold out                  | Dry Land 14, a mountain pocket | 14 turns pass / the Deep Gate falls                                             | defend against waves from two sides that end in giants; relief on turn 9 | Ice Folk  | 14     | Medium     | lose no city; the Thane lives     |
| 7   | The Island That Time Forgot (`FRONTIER_7`) | Ice Folk          | Dinosaurs (natives), Humans (the Baron)                            | Capture against the clock | Archipelago 16                 | capture the Crater by turn 18 / time runs out                                   | the naval mission without ships: freeze a road over the sea; a race      | Dinosaurs | 11–16  | Hard       | by turn 14; lose no city          |
| 8   | Brain Wave (`FRONTIER_8`)                  | Dinosaurs         | Martians (guard), Humans (thralls)                                 | Hunt                      | Pangea 16                      | kill the Overmind by turn 20 / time runs out                                    | a raid: ignore the cities, reach one unit behind its guard               | Martians  | 11–16  | Hard       | by turn 15; the Old Queen lives   |
| 9   | Sugar and Spite (`FRONTIER_9`)             | Martians          | Undead, Goblins; ally: Candy                                       | Rescue (hold out)         | Lakes 16 with a Rift           | 16 turns pass / Sugarcrest (the ally's capital) falls                           | defend someone else's city; only flyers cross the Rift                   | Candy     | 16     | Hard       | Praline lives; Riftwatch is yours |
| 10  | The Stars Are Right (`FRONTIER_10`)        | Humans            | Cultists (guard), Undead (thralls); ally: Goblins                  | Capture against the clock | Pangea 20                      | capture the Lodge by turn 24 / time runs out                                    | the finale: four seats, an ally, a fortress, a deadline                  | Cultists  | 20–24  | Very hard  | by turn 20; lose no city          |

Formats covered: classic conquest (1), capture a place (2, 3, 4), escort
(5), survive N rounds (6, 9), capture against a clock (7, 10), kill or raid
(8), naval or island (7), an allied AI (9, 10). Seven of the ten have a
single opponent or a pair; missions 5 to 10 each have two opponents, and
missions 9 and 10 have four seats.

### 9.3 Missions 5 to 10 in detail

Each is designed to the framework of [section 10](#10-the-mission-framework)
and needs nothing the framework lacks. Seeds are picked with the seed
browser when the mission is built ([section 12](#12-the-mission-builders-guide));
the numbers below are starting points for the hand play that tunes them.

**5, Dead Men's Road** (built by `pulp_wars-v642.2`; the numbers are the
hand play's, [section 11.6](#116-dead-mens-road)). Dry Land 16, seed 9: a
mountain wall down the middle of the board, and nobody climbs (Engineering
is forbidden to everybody; the Yetis are Mountain-born). Three seats, the
two enemies one team. You (Undead, south-west): a level 2 capital and a
level 2 town, eight units, a Lich among them, and the tagged unit
`ARCHIVIST`, a Necromancer like any other (10 Hit Points, Attack 1, one
step a turn; Rally and Raise Dead each cost him his step). Seat 1, Humans
(Baron Kessler's toll-men): a walled level 3 fort in the pass, five units
that all `GUARD` its 3 × 3 zone (garrison 6), forbidden Chivalry,
Sawmilling, Forestry, Farming and Explosives (no Knights, no siege, no
growth, no blasting). Seat 2, Ice Folk: a walled level 3 camp in the
south-east corner, `HOLD` its 3 × 3 zone until round 6, then `RUSH`, with
waves of three and four onto the plain before the gate in rounds 9 and 13.
Landmark `IRONBRAID_GATE`: a neutral village in the far north-east, in
sight from the start. Objective
`ESCORT { unit: ARCHIVIST, to: IRONBRAID_GATE, within: 1, byRound: 20 }`,
stars `WITHIN_ROUNDS 16` and `KEEP_CITIES`. Graves along both roads give
the Necromancer something to do on the way. **The choice:** the pass is
nine steps and every free tile of it is next to the fort's zone, so the
garrison has to be broken (a Lich outranges Guards, and what a Zombie
bites gets up on your side) or walked round (Blast Mountain opens a tile
out of its reach); the south road is fifteen steps round the mountain
block, empty until the raiders wake in round 6, and it passes their camp.
The clock and the waves are what stop "kill everything, then walk".

**6, The Deep Gate** (built by `pulp_wars-v642.2`;
[section 11.7](#117-the-deep-gate)). Dry Land 14, seed 18: the capital in
a pocket of the western mountains with two doors (east, two Forest tiles;
south, past your town). Three seats, Rival. You (Dwarves): the capital
`DEEP_GATE` at level 4 with Walls and two Mines, a level 2 town at the
south door, Field Defenses inside both doors, seven units, the tagged
Engineer `THANE`; you own Mining, so the Dwarves walk the peaks. Seat 1,
Ice Folk: a walled level 3 camp far to the north-east and a war band of
four already under the peaks north of the gate, `RUSH`; their Yetis are
Mountain-born and throw rocks two tiles down into the pocket. Seat 2,
Humans: a walled level 3 camp in the south-east, `HOLD` until round 6, then
`RUSH`; Engineering is forbidden to them, so they come through a door.
Reinforcements: Ice Folk waves north of the gate in rounds 3, 7 and 11 (a
Boulder Yeti from round 7, a Frost Giant in round 11); Human waves one or
two steps from the east door in rounds 6, 9 and 12 (a Juggernaut and a
Catapult in round 12); your relief of three (a Steam Tank among them) in
round 9. Land Grants and Farming are forbidden to everybody: the enemy
camps field no giant of their own, and yours comes only from a Monument.
Objective `SURVIVE { rounds: 14, protect: [DEEP_GATE] }`, stars
`KEEP_CITIES` and `UNIT_ALIVE THANE`.

**7, The Island That Time Forgot** (built, `pulp_wars-v642.3`; the record
is [section 11.8](#118-the-island-that-time-forgot)). Archipelago 16, seed
9; three seats, Rival. The Ice Folk have no ships at all
([current rules section 21.16](RULESET_7_CURRENT.md#2116-the-frozen-sea)),
so the naval mission is theirs on foot and the Baron's by sea. You (Ice
Folk, the north-west island): a level 2 capital, a level 2 town, seven
units, and the frozen sea from the first turn: Rime, Pack Ice, Black Ice
and Glacier (Icebound, which freezes a ship in, is yours to research).
Seat 1, Dinosaurs (the southern island, two rows of sea away): a level 2
capital in the middle and the level 2 town on the landmark `CRATER`, on the
shore that faces you; `GUARD` the Crater with a garrison of three, the rest
`NORMAL`; the Naval branch and Nesting (no more Ankylosauruses, small
Eggs) are forbidden to them. Seat 2, Humans (the Baron's expedition, the
north-east island): a level 2 port town with a Patrol Boat, Sailing and
Navigation, no Battleship; `HOLD` until round 8, then `RUSH`; a landing
party of four and a second Patrol Boat arrive beside the Crater in round 8.
Objective `CAPTURE { places: [CRATER], byRound: 18 }`, stars
`WITHIN_ROUNDS 14` and `KEEP_CITIES`. The lesson is the frozen sea as a
road and as a weapon (whoever steps onto your ice is Frozen at your next
turn, and a Frozen unit shatters), and a race: the Baron's ship harries
the crossing from round 3, and in round 8 his men land.

**8, Brain Wave** (built, `pulp_wars-v642.3`; the record is
[section 11.9](#119-brain-wave)). Pangea 16, seed 2; three seats, teams
`[0, 1, 1]`: the Martians and their thralls are one side. You (Dinosaurs,
north-west): a level 3 capital, a level 2 town three tiles south of it,
eight units, two of them grown, and the tagged giant `OLD_QUEEN` (a
Brontosaurus); you own Engineering, so your dinosaurs cross Mountains.
Seat 1, Martians (the crater, a basin in the eastern mountains open only
to the south): a walled level 3 capital with the tagged Brain `OVERMIND`
on its center; `GUARD` the basin with a garrison of six (the Overmind, a
Colossus, two Shield Projectors, a Ray Gunner, a Tripod), while two
Grunts, a Ray Gunner and two Saucers hunt; forbidden the Mothership's
technology and everything that grows the capital into a second Colossus
(Farming, Forestry, Engineering, Explosives, Roads, Land Grants and what
follows them). Seat 2, Humans (thralls, a camp in the south): a level 2
town, `RUSH`, with waves of three in rounds 5, 9 and 13. Objective
`KILL { units: [OVERMIND], byRound: 20 }`, stars `WITHIN_ROUNDS 15` and
`UNIT_ALIVE OLD_QUEEN`. There are three ways in: the Rim (along the north;
the peaks north of the crater are two tiles from the Overmind), the Pass
(two Mountain tiles on the row of your town), and the long southern road
past the thralls, with no Mountain on it. The lesson is a raid: no city
has to fall, one unit behind its guard does. What guards it: Mind Control
takes a wounded one-slot unit within two tiles of a Brain (the Old Queen,
a giant, is immune: what punishes sending her in alone is the Colossus
and the rays), a Saucer's Tractor Beam pulls a unit out of your line, and
a Force Field keeps a Martian at full strength alive through one hit. What
kills it: a Spitter's Acid ignores the Walls.

**9, Sugar and Spite** (built by `pulp_wars-v642.4`,
`src/engine/v7/missions/frontier-9.ts`; its hand play is in
[section 11.10](#1110-sugar-and-spite)). Lakes 16, seed 5, with seven tiles
turned to Rift in one column, north and south of the western lake (the
lake keeps the band short); four seats, teams `[0, 0, 1, 1]`; the Naval
branch forbidden, so nobody sails the lakes. You (Martians, the strip west
of the Rift): a level 4 capital and a town, three Saucers, two Grunts, a
Ray Gunner and a Shield Projector. Seat 1, Candy (your ally, between the
lakes): the walled level 3 capital `SUGARCREST` and the town Gumdrop,
`HOLD` the land of the two cities, the tagged giant `PRALINE`; no Coins and
a small economy (Farming, Forestry, Engineering and Planning forbidden to
it). Seat 2, Undead (north-east): `RUSH`. Seat 3, Goblins (south-east):
`HOLD` until round 4, then `RUSH`. Six besieger waves muster in the enemy
camps, out of your sight: the Undead's in rounds 4, 8 and 12, the Goblins'
in rounds 6, 10 and 12, the later ones with Liches and Rocket Carts.
Objective `SURVIVE { rounds: 16, protect: [SUGARCREST] }`, stars
`UNIT_ALIVE PRALINE` and `HOLD_PLACE RIFTWATCH` (a neutral village just
east of the Rift: take it and keep it). The lesson is defending a city
that is not yours: your ground troops cross one at a time under a Saucer,
an ally's land is closed to your units, and the siege engines behind the
besiegers' line are yours to hunt.

Changed from the first design, by hand play: the kingdom's capital is
level 3, not 4, and its seat is poor (a rich Candy seat won the mission
alone); the waves are six, not three, and come with siege engines; the
second star is the village of Riftwatch, not "lose no city" (nothing
walks to your strip, so that star was free; and the kingdom's town of
Gumdrop cannot be saved from outside its land).

**10, The Stars Are Right** (built by `pulp_wars-v642.4`,
`src/engine/v7/missions/frontier-10.ts`; its hand play is in
[section 11.11](#1111-the-stars-are-right)). Pangea 20, seed 23; four
seats, teams `[0, 0, 1, 1]`; the Naval branch forbidden. The Lodge stands
in the northern highlands with Mountains on three sides, a wooded slope
below it and a goat path from the west. You (Humans, south-west): a level
5 capital and two towns, ten units (the whole roster but the Champion; no
Engineering yet). Seat 1, Goblins (Grubnak, your ally, south-east): a
level 3 capital, `NORMAL` until round 10, then `RUSH`. Seat 2, Cultists
(the summit, north): the walled level 3 capital `LODGE` and two towns,
`GUARD` the summit with a garrison of 6; eighteen units, far over its
unit limit, among them two Summoners, a Stargazer, a Caller, a Chosen and
the Thing in the Cellar; 9 Favour and The Stars Are Right; every other
technology forbidden to it; waves of four behind the Lodge in rounds 8, 14
and 20, the last two with a Summoner. Seat 3, Undead (thralls): the barrow
on your road and a town in the east, `RUSH`, waves of four at the barrow
in rounds 6, 12 and 18 for as long as the seat lives. Objective
`CAPTURE { places: [LODGE], byRound: 24 }`, stars `WITHIN_ROUNDS 20` and
`KEEP_CITIES`.

**The clock and the Great Summoning.** In the story the Hierophant needs
twenty-four tolls. In the rules the Lodge's Favour is the Summoning's
progress, and it is public (the candles beside the seat's name): the Lodge
starts with 9, spends 5 on its first Horror and 5 more on a second once it
has sacrificed an Initiate, and is paid from then on in blood: every unit
a Horror kills (a Knight is 9), every Seizure, every dead Chosen (6). It
has no Offering (Harvest Rites is forbidden to it). With 10 or more it
saves, and at 20, with a Summoner and three chanters whom nobody
threatens, it begins the Great Summoning: a circle on the summit for one
round, and then the Herald. So a player who feeds the Horrors, or who is
slow, meets the Herald; one who shoots the Summoners or keeps an army on
the slope does not. Round 24 is the hard stop: the last toll. A mechanical
link between the deadline itself and the rite (the rite completing as the
loss) would need a scripted ritual, which the framework does not have; it
was not added.

Changed from the first design, by hand play: the Lodge is level 3 (its
summit has room for no more), your capital level 5; the ally turns to
`RUSH` at round 10; the Cult's tree is closed and its Favour paid in
blood only (with the whole tree it fielded forty units and summoned the
Herald in round 3).

### 9.4 Unlock order, and free play

Humans (from the start), Goblins (mission 2), Undead (4), Dwarves (5), Ice
Folk (6), Dinosaurs (7), Martians (8), Candy (9), Cultists (10, the reward
of part one). A mission unlocks the faction the story has just made peace
with, and the next mission is led by it, so each new faction is learned in
a mission built around what makes it different. Missions 1 and 3 unlock
nothing: 1 is the first lesson, and 3 is played as the Goblins unlocked by 2.

**Free play is not gated.** Skirmish offers every faction from the first
launch, as before ([section 4.3](#43-what-unlocks-gate)): unlocks decide
which faction you may lead in a campaign mission that offers a choice
(mission 4) and fill the campaign screen's faction row. The user asked for
unlocks as the campaign's reward, not as a lock on the rest of the game,
and the existing behaviour already said so.

## 10. The mission framework

Built by `pulp_wars-v642.1` on the engine of [section 2](#2-architecture).
The rules are in
[current rules section 2.6](RULESET_7_CURRENT.md#26-mission-setup); this
section says what there is and why.

### 10.1 Objectives are data

`MissionDefinitionV7.objective` (`src/engine/v7/missions/types.ts`):

```ts
type MissionObjectiveV7 = {
  byRound?: number; // lose when this round ends without the win
  protect?: ({ place: string } | { unit: string })[]; // lose when one is lost
  bonus?: MissionBonusGoalV7[]; // at most two: the second and third star
} & (
  | { kind: "DOMINATION" }
  | { kind: "ESCORT"; unit: string; to: string; within: 0 | 1 | 2 }
  | { kind: "SURVIVE"; rounds: number }
  | { kind: "CAPTURE"; places: string[] }
  | { kind: "KILL"; units: string[] }
);
type MissionBonusGoalV7 =
  | { kind: "WITHIN_ROUNDS"; rounds: number }
  | { kind: "KEEP_CITIES" }
  | { kind: "UNIT_ALIVE"; unit: string }
  | { kind: "HOLD_PLACE"; place: string };
```

Places are `landmarks` (`{ tag, at }`) and units are tagged in a seat's unit
list (`tag`). The objective is **not stored in the state**: the reducer asks
`missionOutcomeV7(before, after, actor)` (`src/engine/v7/missions/objectives.ts`)
after every accepted command and writes only the outcome, with its `cause`.
A unit's tag resolves to its unit ID through the builder's deterministic
numbering, so no tag is stored either. Order within one command: the win is
judged before the loss; the clock only when the command ended a round.
Eliminating every hostile seat wins every objective.

The public query is `missionStatusV7(state)`, carried in every mission view
as `PlayerViewV7.mission`: kind, clock, escort distance, places, units,
secondary goals with whether each holds now, and the stars at a victory.
Events: `MATCH_ENDED` as for every end (the cause is on the outcome), and
`REINFORCEMENT_ARRIVED`. The text harness prints `OBJECTIVE`, `CLOCK`,
`STARS`, and `REINFORCEMENTS` lines and names the cause in `OUTCOME`
([text-mode play](../validation/TEXT_PLAY.md#missions)).

### 10.2 Seats: teams and a seat's own forbidden technologies

- Two to four seats, as before. `teams` (one number per seat) makes seats
  of one team allies under every alliance rule, so an AI seat may fight
  beside the human; without it the mission's AI mode decides.
- `MissionSeatV7.forbiddenTechnologies` forbids a seat technologies of its
  own. It is the framework's handicap lever: hand play found that what
  makes a mission unfair is usually one unit of the AI's (Bomb Chuckers
  against a wall, Necromancers on a field of Graves), and taking that unit's
  technology from the AI seat is exact where an economy tweak is not. The
  human seat is never handicapped this way in the built missions.

### 10.3 Reinforcements

`reinforcements: [{ seat, round, units: [{ role, at }] }]`: a wave arrives
at its seat's Start Turn of that round, on or beside the written tile, with
no home city. Waves are the scripted events of the framework: a relief
column, a landing party, the next assault of a siege. They are
deterministic and unconditional (a wave does not depend on what happened),
which keeps replays and the AI's view simple.

### 10.4 Directive schedules

A seat's `directive` may be a list; each entry may carry `fromRound` and
`untilRound`, and the first entry whose rounds hold the current round is
played (`HOLD` until round 6, then `RUSH`). The kinds are the four of
[section 2.5](#25-ai-directives); nothing else about the Normal AI changed.
An allied AI seat needs no directive of its own: with `teams` it treats the
human as an ally in every rule and plays its ordinary game against the
rest.

**Allies that behave** (`pulp_wars-v642.4`). An allied AI seat takes a
directive like any other AI seat (only the human seat takes none), and
the four kinds were enough for the two missions with an ally; no new kind
was added.

- **An ally that must defend** (mission 9, the Candy kingdom): `HOLD` with
  the zone drawn as the land of its cities and nothing more. The leash
  then keeps every unit of the ally on or beside its walls. Hand play
  showed why the zone must be narrow: with a zone that reached the
  approaches the Normal AI sent the ally's giant out to the zone's edge to
  meet the first Goblins, and it was mobbed in round 3. Give the ally a
  starting reveal that covers the approaches, too: the Normal AI keeps a
  unit on a city center only while it sees a hostile unit near it, and an
  ally that could not see the besiegers coming walked its garrison off the
  center a turn before they arrived.
- **An ally that must attack with you** (mission 10, the Goblins): a
  schedule, `NORMAL` until a round and `RUSH` from then on. The ordinary
  game first (villages, an economy, an army), then every free unit marches
  on the nearest hostile city, which brought the horde to the Lodge's
  slope in the rounds in which the player's siege stood there. `RUSH` from
  round 1 would send the starting eight in a stream and leave the ally
  with no economy.
- **What an ally changes for the player.** No unit may enter an ally's
  land (the ordinary alliance rule), so the player fights in front of an
  allied city, never inside it, and an allied city that stands in a
  corridor closes it. A capture objective is met by the ally's capture
  too.

### 10.5 Natural maps

A mission board is the map generator's output plus a short recorded list of
edits. The definition keeps its ASCII layers (they are what the builder
reads and what a reviewer sees), and beside them `source { mapType, size,
seats, seed, edits }`. `tests/unit/ruleset-v7-mission-objectives.test.ts`
rebuilds every registered mission's layers from its source
(`missionMapDriftV7`) and fails when they differ, so nobody can hand-edit a
board without recording the edit. Edits are one tile each: terrain (with an
optional resource), a resource, a biome, a village or a chest added or
removed. The four built missions change terrain on two tiles in all (Bone
Neck); every other edit removes a village where a mission city stands or
where a village would hand the AI a free city.

`scripts/mission-map-v7.ts` is the seed browser:

```bash
npx tsx scripts/mission-map-v7.ts browse --map dry-land --size 14 --seats 2 --seeds 1-24 --out <dir>
npx tsx scripts/mission-map-v7.ts bake --map continents --size 16 --seats 2 --seed 6
npx tsx scripts/mission-map-v7.ts show --mission FRONTIER_4 --out <dir>
```

`browse` writes a contact sheet of the seeds (terrain, resources, villages,
the generator's capitals) as one PNG; `bake` prints the layers of one seed
as the TypeScript of a definition; `show` draws a registered mission's
board.

### 10.6 The interface

- **Roster** (the campaign screen): ten cards. Each shows its number, name,
  format, who fights whom (an ally stands on your side of "vs"), what it
  unlocks, and its state: locked, open, its stars and best turn count once
  won, or "Coming soon" for a mission that is designed but not built.
- **Briefing**: the mission number and format, the story, the Objective
  line with the objective's icon, what the three stars are for, up to three
  hints, the map size, the opponents and allies with their emblems, what a
  win unlocks, and the faction you lead (a choice where the mission offers
  one).
- **Objective tracker**: one chip in the top bar: an icon, the Objective
  line, and one counter (turns left, steps to go, or how many of several
  places or targets are done); the counter turns red in the last two rounds
  of a deadline. On a phone it is a row of its own under the chips.
- **Marks on the board**: a round badge on a stem over each place and named
  unit of the objective that the player can see: a flag (go there, take
  it), a shield (it must not fall), a star (this one must live), a
  crosshair (this one must die). No tile coordinate is shown anywhere; a
  distance is a count of steps. The marks do not move, so the Motion
  setting does not concern them.
- **Debrief**: "Mission complete" or "Mission failed", one line that says
  why ("The Warrens is yours.", "Out of time.", "Doctor Crane was killed."),
  on a win the stars with each goal marked earned or missed, the closing
  line of the story, and the unlock notice. A win offers **Next mission**
  and **Retry** (for the missing stars); a defeat offers **Retry**; both
  offer Campaign and Main menu.

The presentation is pure functions of the player view in
`src/render/mission-presentation-v7.ts` (`missionTrackerV7`,
`missionMarkersV7`, `missionStarGoalsV7`, `missionOutcomeLineV7`); the
phone review has scenes for the roster with progress, a briefing with a
choice, the tracker of every objective kind, and both end dialogs
(`campaign-progress`, `campaign-briefing-choice`, `mission-hud-*`,
`mission-victory`, `mission-defeat`).

### 10.7 Progress and stars

Progress stays in `pulpWars.campaign.v1`, behind try/catch, and holds only
completed missions. A completion gains an optional `stars` (1 to 3): the
most stars any win of the mission earned. Progress written before stars
existed has no `stars` and reads as one star, so **existing progress stays
valid**: a player who had won the four teaser missions keeps them won, with
one star each and their unlocks, and may replay them for the rest. A win is
recorded with `1 + the secondary goals that hold at the victory`.

### 10.8 Identity

The ruleset identity is `pulp-wars-poc-7r82`. [Section 3](#3-objectives)
already said that an objective kind is a rules change with an identity
bump, because the objective decides the outcome and the outcome is state a
replay must reproduce; the outcome also gained a field (`cause`), the event
list a kind, and the alliance rule a case (teams). A match that is not a
mission plays exactly as at `7r81`, but its saves are refused like any
other identity change. Mission content added later (missions 5 to 10) does
not change the identity again unless it needs a new rule.

## 11. Hand-play record: missions 1 to 4

Each mission was played by hand through the text harness
(`scripts/play-text mission …`, [section 12](#12-the-mission-builders-guide))
as a competent but not perfect player, with the mission's AI seats played
by the Normal AI under their directives, and tuned until it was won in its
target length. The transcripts are kept with the bead's evidence
(`scratchpad/pulp_wars-v642.1/transcripts/`). "Turn" below is the round of
the win.

### 11.1 Goblins at the Gate

Dry Land 11, seed 1; five villages removed so that only the one behind your
fort remains. **Won in round 11** with all three stars, one Fighter lost.
The fifth configuration:

1. The war band walked off to take the villages in the lane instead of
   attacking: the villages went.
2. Bomb Chuckers' splash killed the Guards on the wall from out of reach:
   Marksmanship is forbidden to the Goblin seat.
3. Five Wolf Riders overran the fort in round 4: Scouting is forbidden to
   the Goblin seat.
4. Orc Brutes, an Ogre and Mines made the Goblin camp uncrackable, and a
   large starting reveal handed the AI the Explorer Monument: the Goblins
   start with Gathering only, Engineering and Metallurgy are forbidden to
   them, and their reveal is under half the board.

The winning line: fortify the two Guards on the wall, research Gathering
and harvest to level 4, Farming to level 5 and the Juggernaut in round 5,
kill the war band on the wall, then march. **What nearly went wrong:** a
lone Fighter sent ahead dies to Gang Up; the hint says so now.

### 11.2 The Warrens

Dry Land 14, seed 9; five villages removed (three of them are the Goblin
cities). **Won in round 16** by capturing the Warrens, three stars. The
fifth configuration:

1. A three-city Goblin economy with Bomb Chuckers, Wolf Riders and Brutes
   overran the player by round 9.
2. An even war ended on a Troll at the Warrens.
3. The Warrens in woods with Bomb Chuckers behind Walls was a fortress.
4. A level 5 Warrens fielded two Trolls.

Final: you start with Guards and Marksmen and eight units; the Goblins
start without Hunting and Scouting and are forbidden Marksmanship,
Fieldcraft and Metallurgy; the Warrens is a level 2 city without Walls; and
the objective is the Warrens, not every city, which ends the mission when
the lesson is learned instead of after a mop-up. **What nearly went
wrong:** two Juggernauts sent in one at a time each died to Gang Up, and a
Knight dash was lost; the win came from two Juggernauts and Knights
arriving together.

### 11.3 Green Tide

Dry Land 14, seed 24; two villages removed (the Undead town and your own).
**Won in round 11** by capturing the Barrow, three stars, about nine
Goblins lost (and risen as Zombies). The third configuration:

1. Six units and 5 Coins a turn: the first Bomb Chucker came in round 6,
   too late.
2. A horde of twelve far over capacity could not replace its dead, and one
   death-blast chain wiped the Bomb Chuckers.

Final: a level 4 capital with a land grant and a Mine (a Troll in round 1
by hunting, a second in round 6), and the Undead hold only the open plain
around the Barrow, so the villages of the forest belt are yours. **What
nearly went wrong:** clustering the horde next to its own Kaboom; the Troll
toss, Gang Up and Explosives' Breach decided it.

### 11.4 Bone Neck

Continents 16, seed 6; two channel tiles turned to land (Bone Neck) and
three villages removed (your town, the gate, an Undead town). **Won in
round 11 as the Humans** (one Guard lost) **and in round 11 as the
Goblins**, three stars each. The second configuration:

1. Objective "capture the tower" with three Necromancers: they raised a
   Skeleton on every Grave of the gate every turn, and the siege never
   ended.

Final: Administration and Planning are forbidden to the Undead seat (no
Necromancer), and the objective is the gate. The winning line: the economy
to a level 5 giant by round 2, the two siege engines on the near shore
killing whatever stands on the neck's exit, a Guard (or a Brute) plugging
the bridge, then the giant kills the gate's occupant and enters.
**What nearly went wrong:** a siege engine left within reach of the gate's
Raider; they are the only two of the mission.

### 11.5 What the hand play taught

- A capture objective bounds a mission's length; "every city" turns a won
  position into ten more rounds.
- Handicap the AI by forbidding one technology to its seat, not by starving
  its economy.
- Keep AI capitals small: a level 5 city fields a giant.
- Keep a seat's starting reveal under half the board, or it starts with
  the Explorer Monument.
- A `RUSH` seat does not throw itself at a prepared line; give the player a
  reason to come out.
- Do not start the player far over capacity: nothing can be replaced.
- (Missions 5 and 6.) The Normal AI attacks what it can reach from where it
  is safe and does not march on a strong position: a siege needs waves that
  arrive in reach, and a defender who cannot out-build them.
- Taking a seat's last city ends the seat and its waves. Put a camp where
  that is a choice with a price, wall it, and garrison it.
- A city's level decides whether it fields a giant, for the player too:
  count the population within reach (Fruit, Game, Mines, Monuments, a Blast
  Mountain in one's own land) before choosing levels and technologies.

### 11.6 Dead Men's Road

`pulp_wars-v642.2`. Dry Land 16, seed 9; ten villages removed (the fort's,
the camp's and the gate's neighbours, and those an AI seat would take; two
stay in the far north-west). Five attempts over four configurations; the
transcripts are in `scratchpad/pulp_wars-v642.2/transcripts/`.

1. **Abandoned in round 6.** A level 4 capital with a Land Grant harvested
   its Fruit to level 5 on the first turn (an Abomination led the column);
   the fort grew to level 5 by round 5 (a Juggernaut in the pass); two
   roaming toll-men killed the scout on round 1 and took a village. Now:
   two level 2 Undead cities, no Lumber Camp or Farm for either enemy,
   every toll-man in the `GUARD` zone, the villages gone.
2. **Won in round 16 through the pass, three stars** (by one round). The
   Lich broke nine Guards over ten rounds (a Guard is open to a shot from
   two tiles, and the splash plagues its neighbours), bitten toll-men got
   up as Zombies, and a Blast Mountain opened a tile of the wall out of the
   Guards' reach. The round 13 wave killed the vanguard at the gate and the
   Doctor ended a turn next to a Yeti. The fort, with Explosives, had
   blasted its own mountains for population (a Juggernaut in round 14) and
   opened the block between the two roads: Explosives is forbidden to both
   enemy seats now.
3. **Abandoned in round 5.** The south road with the raiders holding the
   whole south-east: they were on the column from round 2, and the long
   road was no safer than the short one. Now the camp is in the corner and
   they hold its nine tiles.
4. **Lost in round 8 on the south road** ("Doctor Crane was killed."): the
   column beat the raiders at their camp, and the Doctor then ended a turn
   on the one tile of the road next to the fort's corner; a Marksman and a
   Fighter killed him from inside the zone. The final configuration, and
   the mission's fail condition seen for real.
5. **Won in round 15 on the south road, three stars**, the final
   configuration. Roads (researched on turn 1, fourteen tiles built) carried
   the Doctor two steps a turn; the raiders came out in round 6 and lost
   all six of their units to the Lich and the Zombies; a Ghoul took their camp in round
   10, the round after their wave arrived and a Sled froze the Doctor.
   Taking the camp ends the Ice Folk and their waves: that is the south
   road's fight, and whoever wins it walks the rest.

**What nearly went wrong:** a lone scout dies on round 1 on either road;
the Doctor dies in one enemy turn on any tile next to two enemies, so every
step is counted against what can reach it. The pass on the final
configuration (the Ice camp one tile further off and no Explosives for the
AI) was not replayed: both changes take pressure off that road.

### 11.7 The Deep Gate

`pulp_wars-v642.2`. Dry Land 14, seed 18; nine villages and a chest
removed (one village stays, in the rock west of the gate, for the Dwarves
to climb to). **Won in round 14, three stars, with 5 of 15 units left**, in
the fifth configuration; an earlier one was won with two stars and three
units. What the runs taught:

1. An Ice camp three tiles north of the gate could be captured in round 4,
   which ends the seat and its waves. Both camps are far off and walled,
   and the Ice Folk's war band and waves arrive under the peaks instead.
2. **The Normal AI does not attack a prepared line.** With Land Grants (the
   ore of a wider territory) or a Farm in each city the Dwarves had two
   Brass Titans by round 5 or 6 and sixteen units, and neither enemy came
   within reach for the rest of the mission, giants included. Land Grants
   and Farming are forbidden, the chest in the pocket (a free Gyrocopter,
   and with it the Explorer's Monument on round 2) is gone, and a Titan
   comes from a Monument: about round 5 from the Explorer's, round 9 from
   the Muster's.
3. Human waves that arrived four steps from the door never attacked, with
   or without Catapults; waves that arrive one or two steps away do, at
   once. They arrive there, and the hints give every wave's round, because
   a Catapult that arrived unannounced shot the Thane the turn it came.
4. A Titan that leaves the walls to hunt Yetis is dead in one turn (31 Hit
   Points to a wave that had just arrived). The gate is held from inside;
   the peaks are cleared by Clockwork Gunners, which shoot twice when they
   have not moved.

The winning line: the town's Mines to level 3 and Walls on turn 1; a
Gyrocopter to explore, the Explorer's Monument and a Brass Titan in the
gate in round 5; Gunners behind the doors; the relief's Steam Tank makes
six kinds for the Muster's Monument and a second Titan in the town in
round 9. The last three rounds are the Frost Giant (it freezes what it
stands next to) from the north and the Juggernaut through the east door:
ten of fifteen units died in them. **What nearly went wrong:** nothing in
the open survives the peaks; the Thane was kept four tiles back and
finished unhurt. The deliberate loss: with the garrison disbanded, a Yeti
captured the Deep Gate in round 5 ("The Deep Gate fell.").

### 11.8 The Island That Time Forgot

`pulp_wars-v642.3`. Archipelago 16, seed 9, three seats; five villages
removed (your town, the Crater, and the three an AI seat would have taken
for a free city). **Won in round 11** by capturing the Crater, three
stars, two units lost. The fifth configuration (transcripts `m7a` to
`m7e` in `scratchpad/pulp_wars-v642.3/transcripts/`):

1. A level 3 capital with a land grant: the Fish of its home waters and a
   Population Boom made a Frost Giant in round 1. The capital is level 2.
2. The Crater as the town in the middle of the island, behind the Dinosaur
   capital: with Nesting the natives laid a third Ankylosaurus and stood
   three of them (60 Hit Points, Armoured) around it, with 14 to 17 units
   by round 11; the Baron, with two villages, fielded a Juggernaut and a
   Battleship that shelled your home island from the open sea. Out of time
   in round 18 (played to the end as the deliberate loss: "Out of time").
   The Crater is now the town on the shore that faces you, the natives are
   forbidden Nesting, three villages went, and the Baron has no Battleship.
3. Told to `HOLD` their island, every Dinosaur walked to the capital and
   the Crater stood empty in round 3. Three of them `GUARD` it now.
4. With Rime and Pack Ice alone the road melted every third turn, the one
   lane jammed, and the army reached the island in a trickle; the giant
   killed whoever stood on the Crater, and the natives trained another
   Caveman onto it every turn. Not on course in round 16. You now start
   with Black Ice and Glacier too (the road lasts five turns and a unit
   slides the whole lane in one Move), and the town's units start at the
   capital.

The winning line: Fish and a Farm for a level 3 capital (a free Sled),
five units on the ice for the Sea Dog Monument, a Boom and two Lumber Camps
for a Frost Giant in round 4; the Ice Witch freezes the road while a Sled
sinks the Baron's Patrol Boat (round 3); a Raptor that kills a Yeti on the
ice is Frozen by Black Ice and shattered; the giant slides down the lane,
freezes the Crater's Ankylosaurus with its Cold Aura and shatters it
(round 8). **What nearly went wrong:** the Baron's landing party killed
the Caveman the natives trained onto the empty Crater and a Fighter stood
on it, one turn from capturing it (a Frost Bolt and the giant's Glacial
Smash removed him); and a giant does not advance after a kill, so a
second unit has to enter the Crater in the same turn (a Sled over the ice
of the west shore, with Bolas on the Raptor and a Frost Bolt on the
Spitter that could have killed it).

The AI on an island board: the Baron's seat sails by itself. Its Patrol
Boat attacked the units on the ice in round 3, its transports carried a
Guard, a Raider, a Marksman and, in configurations 2 and 4, a Juggernaut
to the island from round 8 on, and an icebound transport's crew climbed
out onto the ice and was Frozen there. The natives have no ships by
design: they counter-attack onto the ice and train on the Crater.

### 11.9 Brain Wave

`pulp_wars-v642.3`. Pangea 16, seed 2, three seats; eight villages removed
(your town, three in and beside the crater, and the four of the south).
**Won in round 11** by killing the Overmind, three stars (the Old Queen
alive with 20 of 45 Hit Points), seven units lost. The third
configuration (transcripts `m8a` to `m8c`):

1. A garrison of five without a Colossus, and a Martian seat free to
   build: with Mines on every peak of its land the crater was a level 7
   city in round 5, and the Colossus of its level 7 took the center and
   pushed the Overmind off its own Walls, beside the Old Queen, who had
   walked in alone and killed it in round 6. The thralls took the four
   southern villages and were a four-city power by round 6.
2. With a Colossus, a garrison of six and no Mines, the Martians blasted
   the peaks of their rim with Explosives for population (level 5 in round
   4). Stopped in round 5: Explosives is forbidden to them too.

The winning line: Mines for a level 3 town (a free Raptor), the two
villages on the Rim and the Pass for forward nests, a Triceratops and
Spitters; the Old Queen pulled back and tended by the Shaman after the
Colossus and the Tripod took 19 Hit Points from her in one turn; in round
9, with their heat rays Cooling, the Queen and the Triceratops (Charge!,
which pushed the Colossus off the Rim) cleared the way; in round 11 the
Queen climbed the Rim and struck the Overmind on its Walls (its Shield and
2 Hit Points), and a Spitter on the peak two tiles away finished it with
Acid: a Force Field holds only for a unit at full strength. **What nearly
went wrong:** a Saucer's Tractor Beam twice pulled the Ankylosaurus out of
the line into the rays, and it died; the Colossus one-shot a Spitter on a
peak; the Triceratops died on the Rim the turn after its charge; and the
Queen stood on the Rim with 22 Hit Points for one enemy turn. No unit was
mind-controlled in the winning game, because none was left wounded within
two tiles of the Overmind: the rule shaped the approach and did not fire.

The deliberate loss: passing every turn runs the clock out ("Out of
time" after round 20). It also showed that neither the thralls nor the
Martian hunters attack a player who never leaves home (two cities and
nine units intact at the end): a `RUSH` seat does not storm a line, as
[section 11.5](#115-what-the-hand-play-taught) says, and here the clock
is what brings the player out.

### 11.10 Sugar and Spite

`pulp_wars-v642.4`. Lakes 16, seed 5 (the contact sheet of seeds 1 to 24
is with the bead's evidence, `scratchpad/pulp_wars-v642.4/maps/`); seven
tiles turned to Rift, one chest and nine villages removed (six under
cities, three on the besiegers' roads). **Won when round 16 ended, three
stars**: Sugarcrest standing with four Candy units left, Queen Praline
alive on 9 of 40 Hit Points, Riftwatch held since round 2; ten units lost
(two Saucers, five Ray Gunners, two Shield Projectors, a Grunt). The fifth
configuration, and the second full game on it:

1. A level 4 Sugarcrest with a level 2 town, 6 Coins and the whole tree:
   the kingdom grew to level 5, fielded eighteen units and **won by itself
   in three stars with the player absent**.
2. A poor kingdom, larger waves, and a `HOLD` zone that reached the
   approaches: the Queen ran to the zone's edge and was mobbed in round 3.
3. A `HOLD` zone of the cities' own land: the kingdom held to round 16
   alone with one star; the waves were made six, with siege engines, and
   then it fell in round 12 without help.
4. First full game: a wave of five rose beside the player's southern
   squad in round 7 and killed all three units of it in the turn it
   arrived. The waves now muster in the besiegers' own camps, out of the
   player's sight; the mission was then won in round 16 with one star
   (Gumdrop, the kingdom's town and then the third star, fell in round 11
   whatever the player did: its land is closed to the player's units).
5. The third star became the village of Riftwatch, east of the Rift:
   something the player takes and then has to keep.

**The deliberate loss:** ending every turn without a command loses in
round 14, "a place you had to hold fell" (Riftwatch goes to the Goblins in
round 8, the Queen dies in round 10).

The winning line: grow both cities at once (hunting, then Forestry and
lumber camps; the capital's level 5 and 6 rewards taken as Coins, since a
Colossus cannot cross), take Riftwatch with a Saucer in round 2 and train
a Shield Projector there, carry Ray Gunners over under the Saucers into a
block beside it, shoot whatever walks into range, and send a Saucer at
every Rocket Cart (one kill set off a chain of three death blasts).
**What nearly went wrong:** a Ray Gunner one tile in front of the Shield
Projector's field dies to one rocket; a northern bastion of two units
beside the Rift held for five rounds and saved nothing; and in the last
round the kingdom was down to a Bunny on its center and the Queen on 9 Hit
Points, with fifty enemy units on the board.

### 11.11 The Stars Are Right

`pulp_wars-v642.4`. Pangea 20, seed 23 (contact sheet with the bead's
evidence); two Mountain tiles beside the Lodge turned to Grass and eleven
villages removed (seven under cities, one on the Goblin capital's land,
three that would have been free cities for the lodge). **Won in round 19 by capturing the Lodge, three
stars**, eight units lost (two Juggernauts, a Knight, three Catapults, two
Guards), the Lodge's Favour at 21 and no Summoner left to spend it. The
third configuration:

1. The design's seats with the Cult's whole tree and Harvest Rites: with
   the player absent the lodge made an Offering in every city every turn,
   began the Great Summoning in round 2, had the Herald in round 3, and
   fielded forty units by round 17. The tree was closed, the Offering
   taken away (Favour in blood only), and the lodge's economy left as it
   starts. Played on that: **won in round 18** after a poor first half
   (three Knights and a Juggernaut lost by round 9), because the Lodge fell
   three rounds after the army reached it, and the thralls were eliminated
   in round 12.
2. Toughened: the Thing in the Cellar and a third Hexer at the Lodge, a
   third Undead town in the north-west with the waves rising there, the
   lodge's waves moved behind the summit. The Undead waves of rounds 6 and
   12 rose in the player's rear beside the siege train, and a Caller's
   Tentacle killed a Catapult a round; abandoned in round 13 with the
   barrow not yet taken.
3. Final: the Thing and the third Hexer stay; the Undead have their two
   towns again and their waves rise at the barrow, where the player
   expects the dead; a hint says so.

**The deliberate loss:** ending every turn without a command, the lodge
begins the Great Summoning in round 18, the Herald stands on the summit in
round 19, and the thralls take the last of the player's cities in round
21 ("you were eliminated"). The clock itself (round 24 ends, "Out of
time") is covered by a test that ends turns without playing a seat.

The winning line: the capital to level 6 and the northern town to level 5
at once (two Juggernauts in two rounds), Catapults behind them, the barrow
shot empty and taken in round 7 and grown into a forward base with the
Conqueror's Monument (a third Juggernaut), Engineering for the Mountains,
then the slope: Catapults on the Summoners, a Juggernaut onto the Lodge's
center, capture. **What nearly went wrong, and what the Cult did:**

- A Horror came out of the western town and killed a Knight in the forest
  in round 5 of two games out of three: 9 Favour to the lodge each time.
- A Juggernaut the reward had pushed off the barrow's center was killed in
  one enemy phase by a Horror, a Hexer and the wave that had just risen.
- The Stargazer dropped a star on the siege camp in round 11 (10 damage)
  and marked the camp again in rounds 11, 13 and 14. The camp stepped out
  of the first; a Catapult that stayed under the second to shoot a
  Summoner killed him and died; a Knight's Overrun ended the third in
  round 15: a Hexer, the Stargazer, and the Summoner on the Lodge's center
  in one charge. The Horror then killed the Knight on the center (Favour
  10).
- A Hexer frogged a Guard, which a Familiar and an Idol Bearer then
  killed; a Caller's Tentacle killed a Marksman in the first game and
  three Catapults in the second.
- The Lodge's Favour stood at 16 in round 17 and 21 in round 18: the
  Great Summoning was one Summoner short when the Lodge fell.
- The Goblins took the thralls' eastern town in round 9 (which eliminated
  the Undead, the barrow being the player's) and fought on the slope from
  round 13.

**The Cult seat in its first real matches** (it had been built on
hand-built states only). No rule broke: three games and four games played
with the player absent ran to their end, the two winning sessions replay
to the same state hash, and every Cult mechanic was seen working: Summon
and Channel (with the Thing's Anchor on a channeller), Unbound and Bind
again (a Horror whose channeller the Goblins hurt killed its own Summoner
and an Initiate, and was bound again the next turn), Sacrifice, Seize, the
Offering, Martyr, the Great Summoning (begun, fizzled, completed), the
Herald, Star-fall (fell, and fizzled when its leader died), Ribbit, the
Tentacle and its Grab, and Blast Mountain used on three units beside the
Lodge. What the seat does poorly, for the AI's owner to weigh; none of it
was changed here:

1. **Its capital's center is held by whoever is nearest.** The Thing in
   the Cellar walked off the Lodge's center in the first rounds and never returned;
   in the winning game the center was held in turn by a Summoner, a
   Hexer, and an Initiate while Idol Bearers stood beside it. A
   Knight's Overrun killed the Summoner there and took the center; three
   rounds later a Juggernaut did the same to the Initiate and the mission
   was over. A seat should keep its sturdiest unit on a walled center.
2. **A Summoner fights like an Initiate.** A Summoner that arrived with a
   wave attacked a wounded Catapult, advanced after the kill into the
   player's line, and died the next turn. The seat's summoning needs that
   unit; it should not make melee attacks that advance.
3. **With Harvest Rites and a full city it summons the Herald at once.**
   A seat whose cities start at their unit limit makes an Offering in each
   of them every turn (the rule of
   [the Cult's AI](RULESET_7_CULTISTS.md#154-everything-else-in-simple-high-value-ways):
   "at its unit limit or with nothing to train") and tops the pool up with
   a spare Initiate: from 9 Favour the Great Summoning began in round 2.
   An ordinary game does not start that way, but a mission or a late
   skirmish position does; the mission forbids the technology.
4. **A Horror leaves the guarded zone with its channellers.** A daemon is
   not part of a `GUARD` garrison, and the cultists that follow it are the
   free ones, so one Horror hunted five tiles from the Lodge. In the
   mission that is welcome (it is how the player first meets one).

Two things about the framework rather than the Cult:

- **A wave acts in the turn it arrives.** A wave written onto tiles the
  player's army has reached arrives beside it and attacks at once, and a
  unit whose tile is taken appears up to two tiles away, which can be in
  the player's line (a Summoner did). Missions write their waves where the
  player is not expected and say when they come; a rule that a wave
  arrives with its turn spent would be fairer.
- **The Normal AI keeps a unit on a center only while it sees a hostile
  unit near.** An allied or guarding seat needs a starting reveal that
  covers its approaches ([section 10.4](#104-directive-schedules)).

## 12. The mission builder's guide

How to add a mission.

1. **Design it** in the table of [section 9.2](#92-the-ten-missions): who
   leads, against whom, the format, the lesson, the unlock, the target
   rounds.
2. **Pick a map.** Browse seeds of the map type and size
   (`npx tsx scripts/mission-map-v7.ts browse --map <type> --size <n>
--seats <n> --seeds 1-24 --out <dir>`), look at the contact sheet, pick a
   seed whose shape tells the mission's story (a pass, a neck, an island),
   and keep the sheet with the bead's evidence.
3. **Bake it.** `mission-map-v7.ts bake …` prints the layers; paste them
   into `src/engine/v7/missions/<id>.ts` between the `// <map>` markers,
   with `source { mapType, size, seats, seed, edits: [] }`. Add an edit for
   every change you make to a layer (remove the village where a city
   stands; a land bridge; a Rift band), and keep the list short: the board
   should read as generated.
4. **Seat it.** For each seat: faction (seat 0 may offer a choice), Coins,
   technologies, cities with levels and rewards, units by role, a reveal.
   Put every landmark of the objective inside seat 0's reveal. Name
   landmarks and tag units in capitals (`GATE`, `ARCHIVIST`).
5. **Set the objective**, the stars, the teams, the waves, and each AI
   seat's directive (a schedule when it changes with the round) and its own
   forbidden technologies.
6. **Register it** in `src/engine/v7/missions/index.ts`, and write its
   story in `src/campaign/chapter-1.ts`: name, format, briefing (three
   sentences), the Objective line (one short sentence, it is the tracker's
   text), up to three hints of at most 60 characters, the closing line, the
   unlock, and the names of its landmarks and tagged units. Remove its
   `planned` block.
7. **Pin it.** Run `tests/unit/ruleset-v7-missions.test.ts` and add the
   mission's initial-state hashes to its two tables; the chapter test
   (`tests/unit/campaign-chapter-v7.test.ts`) lists what each built mission
   must be.
8. **Hand-play it** as seat 0:
   `scripts/play-text mission --session <file> <ID> [--faction <f>]`, then
   `view`, `options`, `do <ids> --end`. Play it as a competent but not
   perfect player. If it is not won within its target rounds, or is won
   without the lesson, change the definition (bump its `revision` when its
   initial state changes, and re-pin) and play again. Record the seed, the
   rounds, and what nearly went wrong in [section 11](#11-hand-play-record-missions-1-to-4),
   and keep the transcripts.

## 13. Decisions and follow-ups of `pulp_wars-v642.1`

**Decisions made** (the user asked for them to be made):

- Ten missions, one part, ending on a hook; the names of
  [section 9.1](#91-the-story) (Captain Vera Steele, Grubnak the Loud, the
  Ashen Marquis, Doctor Mortimer Crane, Thane Brunhild Ironbraid, Baron
  Kessler, Mother Rime, the Overmind, Queen Praline, the Lodge of the
  Unblinking Eye) are placeholders open to the user's veto.
- The unlock order of [section 9.4](#94-unlock-order-and-free-play), the
  Cultists last; free play stays ungated.
- Missions 2, 3 and 4 became capture missions (the enemy capital or the
  gate), because hand play showed that conquest missions drag after the
  lesson is learned. Mission 1 stays a conquest: the Goblins have one camp.
- Objectives are data and are not stored in the state; the identity is
  `7r82` ([section 10.8](#108-identity)).
- The AI is handicapped by a seat's own forbidden technologies, never by a
  change to the Normal AI.
- Three stars: the win and two secondary goals per mission, the most ever
  earned is kept, and they gate nothing.
- Missions 5 to 10 are on the roster as "Coming soon" rather than hidden,
  so the player sees the whole of part one and what each mission unlocks.
- The interface says "turn" where the rules say "round", as the top bar
  already does.
- The board's marks are code-drawn badges in the Newsstand recipe; no new
  production art was generated.

**Not done here, for later beads:**

- Build missions 5 to 10 ([section 9.3](#93-missions-5-to-10-in-detail)),
  each with its own hand play.
- Map curiosities on mission boards: the state schema ties curiosities to
  generated boards, so a mission board has none. A mission that wants a
  curiosity as a landmark needs that rule changed.
- The AI-proxy playtest (`npm run playtest:campaign`,
  [section 7.1](#71-headless-playability-npm-run-playtestcampaign)) plays
  whole matches and was not run under the standing no-simulations rule; its
  expectations predate the capture objectives and the new boards.
- An allied AI seat plays its ordinary game: it does not come to the
  human's aid on purpose. Mission 9 and 10 may want a directive for that.
  (`pulp_wars-v642.4`: the existing kinds were enough, see
  [section 10.4](#104-directive-schedules).)
- Mid-mission story beats (a line when a wave arrives) and portraits of the
  named characters.

## Appendix A: critique of the first draft

The first draft was reviewed as a skeptical designer and engineer. Each item
names the draft's position, the objection, and what this redraft does.

1. **Mission content under the ruleset identity.** Draft: every mission
   change bumps `7rNN`, the project's rule for "the set of legal setups
   changes". Objection: content iteration (tuning a mission is many small
   edits) would wipe every autosave, skirmish included, again and again.
   Redraft: missions carry their own `(id, revision)`; the identity bumps
   once for the mechanism; a pinned hash makes a forgotten revision bump a
   test failure ([section 2.4](#24-identity-saves-and-replays)).
2. **Seeds do not vary a fixed mission.** Draft: "the Normal AI wins in X% of
   seeds". Objection: with a fixed board and deterministic combat, the only
   PRNG use is treasure chests, so every seed plays the same game and the
   percentage is 0 or 100. Redraft: headless-only proxy variation on seat 0
   ([section 7.1](#71-headless-playability-npm-run-playtestcampaign)).
3. **Directive exploits.** `HOLD`: a besieger camping just outside the zone,
   or a Catapult shelling from two tiles out, is never engaged. Mitigation:
   leashed units still attack anything in range from inside the zone, zones
   are drawn to include approaches (mission 3's zone runs to the ridge), and
   `untilRound` ends the hold. Accepted residue: patient shelling of a
   `HOLD` seat works; that is the lesson of a turtle. `RUSH`: units arrive
   one at a time and die one at a time; intended for the easy mission and
   tuned by its starting army. `GUARD`: an advance after a kill drags a
   garrison unit out of the gate; the `RETURN` job and the end-of-turn check
   bound it to one tile for one turn.
4. **A directive must never stall the AI.** A first-draft leash on _all_
   commands could remove the only legal command. Redraft: the leash removes
   only relocating unit commands; `END_TURN` and city, research, and build
   commands are never filtered; tested on fixtures.
5. **Forking the AI.** Draft: a separate "scripted AI" for missions.
   Objection: the Normal AI is 12,000+ lines with faction modules and a
   performance budget; a fork would rot. Redraft: two hook points, identity
   behaviour for `NORMAL`, byte-identical non-mission matches.
6. **Unlocks gating skirmish.** Draft: start with Humans only everywhere.
   Objection: takes away six existing factions from players and from the
   balance work, behind a four-mission teaser. Redraft: skirmish stays
   unlocked; unlocks gate the faction choice in campaign missions
   ([section 4.3](#43-what-unlocks-gate)); open question 1.
7. **A second save slot for missions.** Draft: `pulpWars.campaign.save` beside
   the skirmish autosave. Objection: doubles the persistence surface (cleanup,
   recovery, smoke isolation, obsolete keys) for little gain. Redraft: one
   slot; a replaced mission is simply started again.
8. **Stored unlocks.** Draft stored `unlockedFactions`. Objection: derived data
   can drift from `completed` (edits, chapter changes). Redraft: store only
   completions, derive the rest.
9. **Chokepoint bypass.** A Martian Saucer flies over water; a Dwarf Mole
   tunnels; a Martian Mothership tractors units. A naval ban does not close
   the isthmus for them. Redraft: mission 4's choice is Human or Goblin; the
   Undead side has no bypass either. Future chokepoint missions must list
   their allowed factions with this in mind.
10. **Authored cities and the population ledger.** The state schema
    cross-checks population against level and its records; a hand-written
    level-4 city would fail it. Redraft: the builder fills permanent
    records itself, as the Showcase does, and refuses what it cannot fill
    ([section 2.2](#22-the-builder)).
11. **Ruleset churn kills mid-mission saves.** Balance work bumps the identity
    often. Accepted: missions are short; the progress key survives; the
    resume screen's existing behaviour applies. Noted so nobody is
    surprised.
12. **Name collision.** "Campaign" already names the AI unit-job plan.
    Redraft: "mission" in engine and AI, "campaign" in app and UI.
13. **Scope creep cut from the draft:** a painted campaign map (needs art
    direction), carry-over heroes or armies, star ratings or scores (the
    results contract forbids fabricated scores), triggers and scripted
    reinforcements, non-square maps, objectives other than domination,
    naval-enabled missions (the Normal AI's naval play on hand-made coasts
    is unmeasured), three-seat missions, difficulty levels. Each is a
    possible later bead, none is needed to judge the direction.
14. **`untilRound` is a trigger in disguise.** Kept: it is AI-only, a pure
    function of the public round, changes no state, and gives the turtle
    mission its clock with one integer. Real triggers (state changes at a
    time or place) remain out.
15. **Is Normal AI a fair proxy for the human?** It underplays sieges and
    may fail the isthmus breach far more often than a person. The bands are
    therefore wide and asymmetric, and the user's own play decides.

## Appendix B: open questions for the user

1. **Skirmish unlocks.** Keep every faction playable in skirmish, with
   unlocks gating only campaign choices (recommended), or should the
   campaign unlock factions for skirmish too?
2. **Story and order.** Humans vs Goblins (rush), Humans vs three Goblin
   cities, then Goblins vs Undead, then Humans-or-Goblins vs the Undead
   isthmus fortress, unlocking Goblins and then Undead: is that the shape
   you want for the teaser?
3. **Tone and names.** Captain Vera Steele, Grubnak the Loud, the Ashen
   Marquis, "The Hollow Frontier": keep, or do you have names in mind?
