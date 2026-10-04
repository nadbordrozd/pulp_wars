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
[section 8.4](#84-68k5-campaign-ui-and-progress)) are implemented. The
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
   unchanged except the mission label.
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

**Briefing.** "The Ashen Marquis waits on the far shore of Bone Neck, a strip
of land one road wide. No boat will cross those waters. Who leads the
charge: Steele's Rangers or Grubnak's horde?" Hints: "One way in: the
isthmus." "Catapults or Rocket Carts outrange the gate." "A Lich punishes a
crowd on the isthmus."

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
  from the proxy, and the directive compliance checks below.

Acceptance bands (the Normal AI is a weaker player than an attentive human,
so the proxy's win rate is a floor on what a person will see):

| Mission | Proxy win rate | Median winning round | Directive check (every run)                                                                                                                                                                   |
| ------- | -------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | 70–100%        | ≥ 8                  | a Goblin land unit enters your territory by round 5                                                                                                                                           |
| 2       | 35–90%         | ≥ 15                 | none (NORMAL); the Goblins capture or besiege a city of yours in ≥ 20% of runs (it must not be a walkover)                                                                                    |
| 3       | 30–90%         | ≥ 15                 | before round 16 no Undead land unit ends an Undead turn more than one tile outside the zone; after round 16 an Undead unit leaves the zone in ≥ 50% of runs where the Undead still have units |
| 4       | 20–80% each    | ≥ 20                 | at every Undead End Turn, at least `min(4, Undead land units)` stand in the gate zone                                                                                                         |

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
