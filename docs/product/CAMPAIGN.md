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

| Question               | Decision                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map                    | Hand-authored ASCII layouts on the existing square sizes (11, 14, 16), built into an ordinary `GameStateV7` by a deterministic builder, like the [Showcase](RULESET_7_CURRENT.md#25-showcase-setup). No seeded generation, no overrides.                                                                                      |
| Where a mission lives  | Engine data: `src/engine/v7/missions/<id>.ts`, one object per mission. Story, briefing, hints, and chapter order: `src/campaign/`.                                                                                                                                                                                            |
| How a match knows it   | New map type `MISSION` plus a setup field `mission: { id, revision }`. The state is an ordinary state; no new state field.                                                                                                                                                                                                    |
| Objective              | `DOMINATION` only, which is the existing victory rule. The objective is a one-member typed union so later kinds are additive.                                                                                                                                                                                                 |
| Forbidden technologies | Rule-level, generalizing the existing Dry Land Naval rule: refused by the reducer, never offered, shown "Unavailable" in the tree.                                                                                                                                                                                            |
| AI tweaks              | Per-seat **directive**: `NORMAL`, `RUSH`, `HOLD(zone)`, `GUARD(zone, garrison)`, `ASSAULT(target)` (`pulp_wars-v642.5`), each optionally `untilRound`. A leash filter on the Normal AI's ready commands plus parameters to its existing unit-job plan. No fork; `NORMAL` and every non-mission match decide byte-identically. |
| Triggers               | None. `untilRound` is the only time switch, and it is AI-only (a pure function of the public round).                                                                                                                                                                                                                          |
| Saves and replays      | The setup carries `mission.id` and `mission.revision`; replays rebuild the mission from the bundled definition. A changed initial state bumps the mission revision, never the ruleset; old saves of that mission are refused with a clear message.                                                                            |
| Progress               | Separate localStorage key `pulpWars.campaign.v1`, holding only completed missions. Unlocks are derived, never stored. It survives ruleset identity changes.                                                                                                                                                                   |
| Skirmish               | Stays fully unlocked. Unlocks gate which factions you may lead in campaign missions that offer a choice ([section 4.3](#43-what-unlocks-gate)).                                                                                                                                                                               |
| Mid-mission resume     | The one existing autosave slot holds whichever match is current, mission or skirmish.                                                                                                                                                                                                                                         |
| UI                     | A Skirmish / Campaign switch on the front screen, a mission list, a briefing, mission-aware Victory and Defeat dialogs, an unlock notice. No new production art: faction emblems reuse the existing portraits.                                                                                                                |
| Teaser                 | Four missions: Humans vs Goblins (rush), Humans vs a three-city Goblin realm, Goblins vs a turtling Undead, Humans-or-Goblins vs the Undead isthmus fortress with naval technology forbidden.                                                                                                                                 |

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
  /** Explored at start: radius around each own city, plus rectangles;
   * the builder adds territory and the units' sight (section 2.2). */
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
  `explored` from `reveal`, then (once every unit is placed) every tile of
  the seat's cities' territory and everything its starting units see under
  the ordinary sight rule (the role's Sight with the Fieldcraft and
  high-ground bonuses; an Egg sees its own tile only), so no starting unit
  or city stands on ground its seat has not explored (`pulp_wars-hmyk.17`;
  a wave already reveals its units' sight as it arrives, section 10.3);
  ordinary locked achievement entitlements. A seat
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
  invalidates a save. A builder change that alters registered missions'
  initial states without a ruleset identity bump bumps each altered
  mission's revision too, so its old saves are refused as stale rather than
  failing their replay check (exploration after placement,
  `pulp_wars-hmyk.17`, bumped 57 missions).
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
    }
  // pulp_wars-v642.5
  | {
      readonly kind: "ASSAULT";
      readonly target: CoordV7;
      readonly untilRound?: number;
    };
// pulp_wars-v642.10: GUARD may also carry
//   readonly others?: { kind: "RUSH" } | { kind: "ASSAULT"; target: CoordV7 };
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
| `ASSAULT(target)`         | as `RUSH`, but while the city on `target` is a known hostile city it is the only city marched on; and the position of hostile units that holds it (any of them within 3 tiles) is assaulted whatever it weighs      | none                             | "they storm that place, even against a wall"        |

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
- **`ASSAULT`** (`pulp_wars-v642.5`). Hand play of missions 6 and 8 found
  the Normal AI's sound rule, go in only where the army outweighs the
  enemy's position, turning a siege into quiet rounds: the attackers stood
  outside a prepared line and sniped, and a player who stayed home was
  never attacked at all ([section 11.5](#115-what-the-hand-play-taught)).
  `ASSAULT` keeps every other rule of the army (it masses before it goes
  in, it still takes the kill and the safe shot first) and changes one
  weight: the position that holds its target counts as outweighed. It is a
  third hook into the policy, inside the army's weighing of positions
  (`armyAssaultV7`) and the siege of a single-file front
  (`chokepointAssaultOnV7`), and like the other two it is the identity
  for every other directive and every non-mission match.
- **`GUARD` with `others`** (`pulp_wars-v642.10`, the danger pass). The
  user, 2026-10-18: missions where "you gather the army and roll over
  them" against "not very aggressive ai". A `GUARD` seat kept its garrison
  home and left every other unit to `NORMAL`, which masses and waits
  before a prepared line; `RUSH` and `ASSAULT` had no garrison and
  emptied the seat's own cities. `others: RUSH` or `others: ASSAULT(target)`
  gives the units outside the garrison that play: the garrison keeps its
  `RETURN` job and its leash, and every other free unit marches on the
  nearest known hostile city (or the target, which is then assaulted
  whatever it weighs) with no village, chest, or exploration job. It is the
  same two hooks and the same assault weight as `RUSH` and `ASSAULT`, read
  off the `GUARD` plan (`CampaignDirectiveV7.others`,
  `assaultHoldsTargetV7`); without `others` a `GUARD` is unchanged. The
  hidden fixture `TEST_GUARD_RAID` (TEST_GUARD with a garrison of one and
  `others: ASSAULT` on the Human capital) tests it.
- **Revealing the target is data, not cheating.** A `RUSH` seat knows where
  to go because the mission's `reveal` rectangles include the human's
  capital, exactly as if its scouts had been there; the AI still reads only
  its public view.
- **Ships on the leash** (`pulp_wars-hmyk.11`, the saga's extension E7).
  The directives lead land and embarked units: a ship was never leashed,
  so a flagship left its post at once (`CANDY_3`'s Sovereign sailed out in
  round 1 and shelled every boat the kingdom launched). A `HOLD` or
  `GUARD` may carry `ships: true`: every ship of the seat (form `NAVAL`)
  joins the leashed units, besides the land units of a `HOLD` and the
  garrison of a `GUARD`, so its Moves end in the zone (or, from outside,
  come closer) and its attacks from where it stands are never filtered;
  the zone is drawn on water. It is the same filter on the ready commands
  as every other leash, so the naval plan sees only the leashed Moves; it
  is AI only (directives sit outside the state hash) and absent it changes
  nothing. The shape check refuses any value but `true`
  (`missionDirectiveProblemV7`).

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

(Superseded in part by the campaign map, `pulp_wars-hmyk.3`: progress is
version 2, grouped by campaign, under `pulpWars.campaign.v2`, and the
version 1 below is migrated; see [section 14.4](#144-progress-version-2).)

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
  garrison unit inside the zone takes `RETURN` to its own tile (it stays).
  A summon (a Cult daemon or a Tentacle) is never the garrison
  (`pulp_wars-mch9.56`: a Herald called inside `DINOSAUR_6`'s zone took a
  garrison place and stood still until it broke loose); it plays the
  others' directive. A
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

| #   | Mission (`ID`)                             | You lead          | Against                                                            | Format                               | Map                            | Win / lose                                                                      | Lesson or twist                                                                               | Unlocks   | Rounds | Difficulty  | Stars                             |
| --- | ------------------------------------------ | ----------------- | ------------------------------------------------------------------ | ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | --------------------------------- |
| 1   | Goblins at the Gate (`FRONTIER_1`)         | Humans            | Goblins (rush)                                                     | Conquest                             | Dry Land 11                    | capture the Goblin camp                                                         | hold a wall against a rush, then counter-attack; your first giant                             | none      | 10–12  | Easy        | by turn 12; lose no city          |
| 2   | The Warrens (`FRONTIER_2`)                 | Humans            | Goblins (three cities)                                             | Capture                              | Dry Land 14                    | capture the Warrens (their capital)                                             | Gang Up: an army that sticks together and shoots first; a giant                               | Goblins   | 15–18  | Easy–medium | by turn 18; lose no city          |
| 3   | Green Tide (`FRONTIER_3`)                  | Goblins           | Undead (three towns; raid the camp from turn 4, waves 5 and 9)     | Capture against the clock            | Dry Land 16                    | capture the Barrow by turn 26 / time runs out                                   | a build-up under raids: Mines, Trolls on your hills, then Troll toss and Kaboom               | none      | 18–22  | Hard        | by turn 20; lose no city          |
| 4   | Bone Neck (`FRONTIER_4`)                   | Humans or Goblins | Undead (guards the gate; the dead rise in your fields)             | Capture against the clock            | Continents 16, one land bridge | capture the gate city by turn 14 / time runs out                                | a front rank: siege engines dent it, a rider's Overrun sweeps behind it; a guard at home      | Undead    | 8–12   | Hard        | by turn 9; lose no city           |
| 5   | Dead Men's Road (`FRONTIER_5`)             | Undead            | Humans (toll fort), Ice Folk (raiders), one side                   | Escort                               | Dry Land 16, a mountain wall   | bring Doctor Crane to the Ironbraid gate by turn 24 / he dies, or time runs out | a fort in the pass: a Lich outranges it, Pestilence rots it; the Doctor walks behind the dead | Dwarves   | 19–24  | Hard        | by turn 20; lose no city          |
| 6   | The Deep Gate (`FRONTIER_6`)               | Dwarves           | Ice Folk (north, over the peaks), Humans (east, through the doors) | Hold out                             | Dry Land 14, a mountain pocket | 14 turns pass / the Deep Gate falls                                             | hold from inside; Blasting Charges bring the peaks down on the Yetis; relief on turn 9        | Ice Folk  | 14     | Medium–hard | lose no city; the Thane lives     |
| 7   | The Island That Time Forgot (`FRONTIER_7`) | Ice Folk          | Dinosaurs (natives, three towns), Humans (the Baron, raids)        | Capture against the clock (build-up) | Archipelago 20                 | capture the Crater by turn 30 / time runs out                                   | beat off a raid; build up; freeze a road over the sea; Frost Giants shatter the frozen        | Dinosaurs | 26–28  | Hard        | by turn 24; lose no city          |
| 8   | Brain Wave (`FRONTIER_8`)                  | Dinosaurs         | Martians (guard), Humans (thralls, march at once)                  | Hunt (build-up)                      | Pangea 16                      | kill the Overmind by turn 26 / time runs out                                    | build up from one nest; feed the Queen on the thralls; climb where they cannot                | Martians  | 20–24  | Hard        | by turn 18; the Old Queen lives   |
| 9   | Sugar and Spite (`FRONTIER_9`)             | Martians          | Undead (also behind you), Goblins (storm); ally: Candy             | Rescue (hold out)                    | Lakes 16 with a Rift           | 16 turns pass / Sugarcrest (the ally's capital) falls                           | defend someone else's city and your own; Saucers hunt the siege engines                       | Candy     | 16     | Hard        | Praline lives; Riftwatch is yours |
| 10  | The Stars Are Right (`FRONTIER_10`)        | Humans            | Cultists (guard), Undead (thralls, assault); ally: Goblins         | Capture against the clock            | Pangea 20                      | capture the Lodge by turn 24 / time runs out                                    | the finale: hold Northwatch, take the barrow, crack the ring; slay the gazer                  | Cultists  | 20–22  | Very hard   | by turn 20; lose no city          |

Formats covered: classic conquest (1), capture a place (2), escort (5),
survive N rounds (6, 9), capture against a clock (3, 4, 7, 10), kill or
raid (8), naval or island (7), an allied AI (9, 10). Seven of the ten have a
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

**Revision 2** (`pulp_wars-v642.8`, the campaign difficulty pass; the
record is [section 11.16](#1116-campaign-difficulty-pass-b-missions-5-to-7-pulp_wars-v6428)).
Revision 1 started the Undead with nine technologies (Liches, Banshees,
Crafting, Fortification and the rest), and its fort harvested Fruit with
Gathering and handed whoever took it a giant. The board, the raiders'
camp and schedule, the clock and the stars are revision 1's; what changed:

- **You**: four technologies (Gathering, Leadership, Hunting and Scouting)
  and 15 Coins (was 10). The Lich of the starting army stays; more Liches
  are two researches away (Forestry, Liches), Pestilence three (Crafting,
  Fortification, Pestilence), Roads one.
- **The fort**: seven toll-men (two Guards, two Marksmen and three
  Fighters; it was five), `GUARD` with a garrison of 7; Gathering,
  Leadership and Land Grants are forbidden to it, so it no longer grows.
- **The raiders**: the wave of round 9 brings a Musk Ox (four units, was
  three).

**The problem and its hint.** The fort is the problem: seven men behind
Walls, and every free tile of the pass next to their zone. A column that
walks into the pass loses the Doctor to the Marksmen. A Lich outranges
them; Pestilence makes its hits plague the garrison, the Ghouls' Carrion
finishes the sick, and what a Zombie bites gets up on your side. The hints
say "A Lich outranges Kessler's Toll. Pestilence rots it." and "Keep the
Doctor behind the dead. He can raise more.", after "If the Doctor dies,
the mission is lost."

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
`KEEP_CITIES` and `UNIT_ALIVE THANE`. Since `pulp_wars-v642.5` both
enemies `ASSAULT` the Deep Gate in the middle rounds (the Ice Folk from
round 5, the Baron's men from round 6, both until round 10), which the
first build's quiet middle rounds asked for
([section 11.12](#1112-campaign-follow-ups-pulp_wars-v6425)).

**Revision 2** (`pulp_wars-v642.8`;
[section 11.16](#1116-campaign-difficulty-pass-b-missions-5-to-7-pulp_wars-v6428)):
you start with five technologies, Gathering, Leadership, Crafting, Mining
and Dig In (seven before: Hunting and Clockwork, the Clockwork Gunners'
technology, are a research each now); Blasting Charges stays yours to
research. Everything else is revision 1's. **The problem and its hints**:
the Yetis on the peaks above the pocket throw rocks at whatever stands in
the open, so a garrison that marches out to meet the waves is shelled to
pieces (the autopilot lost the Deep Gate in round 6). The gate is held
from inside: Gunners that have not moved shoot twice, and Blast Mountain
brings a peak down on the Yetis on it and beside it. The hints are "Ice
Folk: turn 3, then 7 and 11. Baron: 6, then 9 and 12.", "Blasting Charges
bring the peaks down on the Yetis." and "Gunners that stand still fire
twice. Keep the Thane back."

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

**Revision 2, a build-up** (`pulp_wars-v642.8`, the campaign difficulty
pass; the record is
[section 11.16](#1116-campaign-difficulty-pass-b-missions-5-to-7-pulp_wars-v6428)).
Revision 1 handed you the whole frozen sea, two cities and seven units, and
was won by hand in round 11. Revision 2 is a new board and a longer clock:

- **The board**: Archipelago 20, seed 2 (picked from the seed browser's
  contact sheet): your island in the north-west, the Baron's in the
  north-east, the natives' in the south. A spur of your island runs down to
  the strait; column 7 is the road: four tiles of water (two of them deep),
  the natives' northern tip, two more tiles of water and the Crater. Seven
  villages are removed (the two native towns, one beside a native town,
  and the four of the Baron's island); five stay, four of them on yours.
- **You** (Ice Folk): Coldharbour alone, at level 2 with the Scouts
  reward, two Yetis and a Sled, 5 Coins and **no technology** (the first
  research is free; Rime, Pack Ice, Black Ice and Glacier are yours to
  discover).
- **The natives** (Dinosaurs): three level 2 towns, Fernmaw (the capital),
  the Crater on the shore that faces you, and Tarpit; ten units; Hunting,
  Spitters and Scouting. Forbidden: the Naval branch and every growth and
  heavy technology (Gathering and what follows it, Forestry, Timber,
  Crafting, Engineering, Triceratops, Nesting and Wallbreaker). Three
  `GUARD` the Crater.
- **The Baron** (Humans): Port Kessler at level 2 with a Port, a Guard, a
  Fighter, a Marksman and a Patrol Boat; Hunting, Marksmanship, Crafting,
  Fortification, Sailing and Navigation; no Shipbuilding, Forestry,
  Sawmilling, Farming, Milling or Explosives. `HOLD` his island until round
  16, then `ASSAULT` the Crater (which he sees from the start); his landing
  party of five, a Patrol Boat among them, comes ashore beside the Crater in
  round 14.
- **The clock**: `CAPTURE { places: [CRATER] }` by round 30; stars
  `WITHIN_ROUNDS 24` and `KEEP_CITIES`.

**The problem and its hint.** One town with three income cannot cross a
strait held by three towns of dinosaurs: the four villages of your island
and the frozen sea come first (Rime freezes the shallows, Pack Ice the deep
water of the strait, and gathers Pearls), then the road down column 7 and
the trap of Black Ice (whatever steps onto your ice is Frozen at your next
turn), and then Frost Giants: a city at level 5 sends one, its Cold Aura
freezes what stands next to it, and its Glacial Smash shatters what is
frozen. The hints say "Rime freezes the shallows; Pack Ice the deep
water.", "Whoever steps on your ice freezes. Giants shatter them." and
"Level 5 cities send Frost Giants. The Baron lands turn 14."; the briefing
says to grow and cross.

**Revision 3, the danger pass** (`pulp_wars-v642.10`; the record is
[section 11.19](#1119-the-danger-pass-b-missions-7-to-10-pulp_wars-v64210)). The build-up stays a build-up, but it is no longer quiet: in round 7
a landing party of the Baron (a Fighter and a Marksman) comes ashore on
your spur beside Hjorna, and from round 7 to 11 the Baron `ASSAULT`s
Coldharbour (he now knows it from the start); in round 12 he holds his
island again, and from round 16 he races you for the Crater as before. A
Musk Ox on the village's center (Fortification, "Deep Winter") freezes
whoever strikes it, and a frozen raider shatters under a Yeti. The hints
now say "Raiders land on turn 7. A Musk Ox freezes its attackers." and
"Level 5 cities send Frost Giants. They shatter the frozen." beside the
frozen sea; the briefing says to hold the shore first. Board, natives,
clock and stars are unchanged. Played on `7r100`, the ice redesign
(permanent ice, ice roads the Ice Folk slide along).

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
town, `RUSH` until round 9 and then `ASSAULT` on your town of Egg Rock
(`pulp_wars-v642.5`: a player who stayed home was never attacked), with
waves of three in rounds 5, 9 and 13. Objective
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

**Revision 2, a build-up** (`pulp_wars-v642.9`, the campaign difficulty
pass; the record is
[section 11.14](#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429)).
Revision 1 was won on autopilot in round 7 with three stars: the
Brontosaurus walked the Rim alone and stepped on the Overmind. The same
board, seats and teams; what changed:

- **You**: the nest Thunder Nest alone, at level 2, **no technology** (the
  first research is free; Engineering, Spitters, Nesting and the rest are
  yours to discover), 5 Coins, a Raptor, and the Old Queen as a **T-Rex**
  (`KNIGHT`, 28 Hit Points, Overrun; she grows with every kill, and an
  Alpha's bite of Attack 5 kills the Overmind on its walled center in one
  blow). Five villages are removed (the two enemy towns and the three of
  the south); seven stay, five of them in your quarter, one behind the Pass
  and one on the northern shore under the Rim.
- **The Martians**: two cities in the crater (the Glass Ship, level 3 and
  walled, and Ray Hollow, level 2), no Colossus, and a `GUARD` of nine
  from round 1: the Overmind, two Shield Projectors, three Ray Gunners, a
  Tripod and two Grunts; two Saucers and everything the colony trains
  hunt. Engineering is forbidden to them as before, so nothing of theirs
  follows you onto a Mountain.
- **The thralls**: two camps (Kessler's Camp and Puppet Ford), `HOLD` their
  own row of the south until round 10 and then `ASSAULT` the nest, with
  waves of three in rounds 10, 16 and 22; Knights, Champions and every
  growth technology (Farming, Milling, Forestry, Sawmilling, Land Grants)
  are forbidden to them.
- **The clock**: `KILL { OVERMIND }` by round 26; stars `WITHIN_ROUNDS 18`
  and `UNIT_ALIVE OLD_QUEEN`.

**The problem and its hint.** The guard shoots down anything that walks up
alone (a young Queen dies in one enemy turn beside the crater), a Brain
takes over a wounded one-slot unit within two tiles, and one nest cannot
out-train a colony. The answer is the build-up: villages and Mines on the
peaks, Engineering, and the Old Queen fed on the hunters (Saucers, Ray
Gunners, Grunts that wander out of the crater) until she is an Alpha, then
over the Mountains, where nothing of the Martians can follow, onto the
Overmind. The hints say "One nest won't do it: take the villages, then
grow.", "The crater has one gate. Climbers have more." and "Feed the Queen
small prey: an Alpha bites through walls."; the briefing warns to keep the
wounded away from the brain.

**Revision 3, the danger pass** (`pulp_wars-v642.10`; [section 11.19](#1119-the-danger-pass-b-missions-7-to-10-pulp_wars-v64210)): the thralls hold their camps only until round 3 and then `ASSAULT`
the nest, and their waves of three come in rounds 6, 12 and 18 (were 10,
16 and 22). The nest is threatened from round 6, and the young Queen
feeds on the marchers: in the hand play she was an Alpha in round 8. The
Bolder abilities (`7r99`) let a Brain take over any unit beside it, the
Old Queen too, so the hint for the bite became "Beside the brain, strike
to kill or be taken.", and "The thralls march at once. Let the Queen eat
them." replaces the hint about villages. Board, seats, clock and stars
are unchanged.

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

**Revision 2** (`pulp_wars-v642.9`, the campaign difficulty pass;
[section 11.14](#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429)):
you start with three technologies, Hunting, Saucers and Ray Gunners
(seven before: Gathering, Crafting, Force Fields and the Saucers' Charge
are a research away, so the Shield Projector that anchors the block at
Riftwatch must be researched first). Revision 1 was held to the end on
autopilot with one star; on revision 2 the autopilot, whose ground troops
never cross the Rift, loses Sugarcrest in the last round. **The problem and
its hint**: the kingdom falls to the siege engines of the waves (Rocket
Carts, Bomb Chuckers, Liches) unless someone hunts them, and only your
flyers reach them in time; the hints say "Only flyers cross the Rift.
Saucers carry the rest over." and "Siege engines outrange walls: hunt
them with Saucers." Board, seats, waves and stars are unchanged.

**Revision 3, the danger pass** (`pulp_wars-v642.10`; [section 11.19](#1119-the-danger-pass-b-missions-7-to-10-pulp_wars-v64210)): on `7r99` an autopilot held the kingdom to the end (one star): the
kingdom baked a Gingerbread Man from every trooper it lost and its walls
held. So the kingdom loses its Confectioner; the Goblins `ASSAULT`
Sugarcrest from round 4 instead of rushing past the walls; both besiegers
send two more waves with siege engines (rounds 9 and 11, two Catapults
each); and the dead rise on your side of the Rift too, in the north of
your strip behind its peaks (three in round 5, four in round 10), and
march on your towns. The second hint reads "The dead rise behind you too:
keep a guard at home." and the briefing warns that your side is not safe.
Board, clock and stars are unchanged.

**10, The Stars Are Right** (built by `pulp_wars-v642.4`,
`src/engine/v7/missions/frontier-10.ts`; its hand play is in
[section 11.11](#1111-the-stars-are-right)). Pangea 20, seed 23; four
seats, teams `[0, 0, 1, 1]`; the Naval branch forbidden. The Lodge stands
in the northern highlands with Mountains on three sides, a wooded slope
below it and a goat path from the west. You (Humans, south-west): a level
5 capital and two towns, ten units (the whole roster but the Champion; no
Engineering yet), 5 Coins. Seat 1, Goblins (Grubnak, your ally, south-east): a
level 3 capital, `NORMAL` until round 10, then `RUSH`. Seat 2, Cultists
(the summit, north): the walled level 3 capital `LODGE` and two towns,
`GUARD` the summit with a garrison of 8 (the Thing on the Lodge, two Idol
Bearers, a Chosen, both Summoners, two Hexers); eighteen units, far over
its unit limit, among them two Summoners, a Stargazer, a Caller, two
Chosen and the Thing in the Cellar; 9 Favour and The Stars Are Right;
every other technology forbidden to it; waves of four behind the Lodge in
rounds 8, 12 and 17, the last two with a Summoner. Seat 3, Undead
(thralls): the barrow on your road (a Zombie on its center) and a town in
the east, `RUSH`, waves of four at the barrow
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
Herald in round 3). Revision 2 (`pulp_wars-v642.6`,
[section 11.13](#1113-mission-10-on-the-corrected-cult-ai-pulp_wars-v6426)):
replayed on the corrected Cult AI, the first build fell in round 12 with
nothing lost, so your Coins went from 15 to 5, the ring got an Idol Bearer
and a Chosen for a Hexer and an Initiate and a garrison of 8 (it was 6),
the barrow a Zombie on its center, and the Summoner waves came forward
from rounds 14 and 20 to 12 and 17.

**The campaign difficulty pass** (`pulp_wars-v642.9`;
[section 11.14](#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429))
kept revision 2: on autopilot it is lost (the thralls take the last city
in round 22), and a trial with less pre-research (no Gathering, Farming
or Leadership) was lost twice by hand, so the finale keeps the army
Steele brought with her and hits the ground running. **The problem and its
hints**: the Favour is the countdown, and it is fed by every unit a Horror
kills and every Chosen that dies a martyr (the briefing now says so); the
ring's Idol Bearers and Chosen stop a Knight's Overrun, so "Catapults crack
the ring; then the Knights ride through.", and "No Summoner, no summoning:
shoot the candle-bearers." The barrow hint moved into the briefing. Only
the text changed.

**Revision 3, a stop-gap** (`pulp_wars-mch9.31`, the Cult redesign's
roster, `pulp-wars-poc-7r85`): the Caller and the Chosen retired, so the
ring's Chosen on the goat path side (9, 2) is an Idol Bearer, the other
Chosen (11, 4) an Initiate, and the Caller (9, 4) a Hexer, and the
briefing's "every Chosen who dies a martyr" reads "every cultist offered
up" (Martyr is gone). Nothing else changed: the mission's retune for the
redesigned Cult (its technologies, its Favour, its hints, and the replay)
is the redesign's campaign bead
([its section 15](RULESET_7_CULT_REDESIGN.md#15-campaign-and-labs)).

**Revision 4, the retune for the redesigned Cult** (`pulp_wars-mch9.46`,
on `pulp-wars-poc-7r91`;
[section 11.17](#1117-mission-10-on-the-redesigned-cult-pulp_wars-mch946)):
the lodge owns Engineering and Gibbering Masses (Metallurgy needs
Engineering; Tentacles stay forbidden) and starts with 8 Favour, the same
share of the Herald's 18 as the old 9 of 20. The ring's units of revision
3 are confirmed (the Idol Bearer on the goat path, the Initiate, the
Hexer), and so are the seats, the clock, the waves, the stars, and the
map. Engineering also lets the lodge mine the ore on its Mountains: the
Lodge and Candlewick reach level 5 by round 6 and each raises a Thing in
the Cellar, so the summit holds three Things where it held one. **The
problem and its hints** changed with the Cult: the cultists have 7 Hit
Points and every one dies to a Knight's blow, but a standing idol halves
every shot on the units beside it (the Lodge's Thing included) and an enemy
beside it may strike only its Bearer, and the Stargazer's star now falls
for 15 with three chanters on whoever stays under its mark. So the hints
read "An idol blunts your shots: break its Bearer, then charge." and "A
marked star falls at dawn: scatter, or slay the gazer.", beside the
countdown ("The Lodge's Favour is the countdown: at 18, the Herald."); the
briefing's "every soldier a Horror takes" reads "every soldier its daemons
take".

**Revision 5, the danger pass** (`pulp_wars-v642.10`; [section 11.19](#1119-the-danger-pass-b-missions-7-to-10-pulp_wars-v64210)): the finale gave three stars in round 16 to a player who knew it, so
the dead now come first. The thralls `ASSAULT` Northwatch from round 1
(they rushed), the barrow keeps a second Zombie (a Knight's Overrun took
it in round 3 in the first trial), the dead rise in rounds 5 and 10
(were 6, 12 and 18; the second rising with a Bone Catapult), and the four
villages within an easy walk of your towns are gone (Northwatch's, Fort
Steele's and Millford's two). Your start, the Cult, the clock and the
stars are those of revision 4: a smaller start (Fort Steele at level 3 or
4, no Captain) was lost four times by hand. The briefing now says the
dead of Hollow Barrow are already marching on Northwatch.

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

### 9.5 Missions 2 to 4 after the difficulty pass (`pulp_wars-v642.7`)

The user, 2026-10-14: the missions were "a bit too easy", "past 2nd or 3rd
mission the victory shouldn't be guaranteed if you play on autopilot",
ideally with "some sort of tactical trick that is necessary to win", hinted
in the flavour text, and "at least some of the missions should involve
building up your base and army from scratch", with more of the tree left
to discover. The target for this pass: mission 2 easy to medium (naive play
already costs something), missions 3 and 4 lost or out of time on
autopilot (research the cheapest technology, train the default line unit,
march everything at the objective, attack whatever is in reach), and won by
a player who reads the briefing. The hand play is in
[section 11.15](#1115-the-difficulty-pass-missions-2-to-4-pulp_wars-v6427).

**2, The Warrens** (revision 4). The board, the seats' cities and the
objective are revision 3's. You start with 10 Coins (was 12) and without
Scouting (your Raider is still there); the Goblins start with a second
Goblin at Stinkwell (six units). **The problem** is gentle and is the
Goblins' own rule: Gang Up. A unit that stands alone in the open is mobbed
and killed, a giant sent ahead alone is mobbed too, and the Warrens trains
a fresh Orc Brute onto its center every turn. **The answer:** an army that
moves as one block with Marksmen shooting first (they take no blow in
return), a giant grown early (Fort Ashby reaches level 5 in round 2 with a
Workshop, a Fruit, a Hunt, the Boom and a Farm), Explosives' Breach for the
Field Defenses, and a kill that advances onto a center (a Juggernaut's, or a
Knight's Overrun). The briefing says it ("a goblin is a coward alone and a
terror in a crowd"), and so do two hints.

**3, Green Tide** (revision 4): a **build-up mission** on a bigger board.
Dry Land 16, seed 23; six villages removed (the two Undead towns, and four
that would have handed the dead a free empire). You (Goblins): one camp,
Wolfden, at level 2 with its Land Grant in ore-rich hills in the south,
two Goblins and a Wolf Rider, no technology (the first is free), 5 Coins;
seven villages between you and the plain. The Undead: the walled level 3
Barrow and the level 2 towns Gravesend and Cairnholm on the high plain,
five units, Graves; `HOLD` the plain (rows 0 to 5) until the new moon,
round 12, then `NORMAL`; a wave of three (a Lich among them) out of the
Barrow in round 16. Their seat may not research Gathering, Farming,
Milling, Administration, Planning, Marksmanship, Fieldcraft, Scouting,
Roads, Commerce, Raiding or Chivalry: no Necromancer's Rally, no Banshee's
Wail, no Ghoul's charge, no growth from harvests (hand play: with them the
first build's Barrow reached level 5 and fielded an Abomination, and every
skirmish at the plain's edge was lost). Objective
`CAPTURE { places: [BARROW], byRound: 26 }`, stars `WITHIN_ROUNDS 20` and
`KEEP_CITIES`. **The problem:** an economy from nothing, then a ring of the
dead that a Goblin cannot touch: whatever dies bitten gets up on their side.
**The answer:** Drill and Engineering first, Mines on the hills (seven ore
Mountains in the camp's grant), a Troll at level 5 (round 6) and a second
at level 6 (round 9), the villages for slots and Coins, Fortification and
Explosives, and then the Trolls: a Troll throws a Goblin into the ring and
the Goblin's Kaboom hurts every bone-man around it, and a Troll's kill on
the Barrow's center (Breach ignores the Walls) puts it on the center. Hinted
in the briefing ("grow a Troll before the new moon", "a Troll can throw it
a long way") and the hints.

**4, Bone Neck** (revision 5): **a front rank**. The board is revision 4's.
You start with 10 Coins and Drill, Fortification, Scouting and Raiding
(Chivalry is one step away), a Guard and a Raider at Camp Concord and a
Marksman and the two Catapults at Ferry Rest. The Bone Gate's garrison is
five: the two Zombies on the Field Defenses at the neck's exit (the front
rank) and Skeletons behind; `GUARD` with a garrison of 5; the tower sends
two Skeletons in round 6. The Undead seat may not research Sawmilling (no
Lich: it would outrange the siege train), Scouting and what follows it (no
Ghoul), Marksmanship (no Banshee), Fortification and Explosives (no new
Zombie and no new Field Defense), Administration or Planning (no
Necromancer). Sawmilling is no longer forbidden to you. Objective
`CAPTURE { places: [GATE], byRound: 14 }`, stars `WITHIN_ROUNDS 9` and
`KEEP_CITIES`. **The problem:** the neck is one tile wide, so whatever walks
over it meets the two Zombies alone, dies, and rises on the other side.
**The answer** is the user's own example: the Catapults on the near shore
(three tiles from the exit) strip the Field Defenses and wear the Zombies
down, the Marksman finishes one, and a Knight (or a Scrap Buggy) crosses
the neck and kills the wounded Zombie: Overrun carries it on through
every Skeleton it kills, onto the gate's center. The briefing says "crack
the front rank with stones, then send riders through the gap before the
tower sends more"; the hints say the same in short.

### 9.6 Missions 3 to 6 after the danger pass (`pulp_wars-v642.10`)

The user, 2026-10-18: "the missions are too easy. aside from the first few
they should get harder. right now there are a bunch of missions where you
have 2 or 3 cities to start with and like 5 more villages within easy reach
and you are to defeat an enemy with 2 or 3 cities and not very aggressive
ai. naturally, you gather the army and roll over them. There should be some
danger involved." The targets of this pass: from mission 3 on a thoughtful
player is threatened in the first five to eight rounds, has to defend, and
can lose cities or the mission; the autopilot of
[section 9.5](#95-missions-2-to-4-after-the-difficulty-pass-pulp_wars-v6427)
loses; a first thoughtful win is usually one or two stars. The levers:
fewer free villages near the player, an enemy that attacks early and keeps
attacking (the `GUARD` directive's new `others`,
[section 2.5](#25-ai-directives)), scripted waves, and handicaps only where
one enemy unit made a mission unwinnable. Pass A changed missions 3 to 5;
mission 6 was replayed on `7r99` and left as it is. The hand play is in
[section 11.18](#1118-the-danger-pass-missions-3-to-6-pulp_wars-v64210).

**3, Green Tide** (revision 5). The board is revision 4's with five more
villages removed (eleven edits): the three nearest Wolfden and the two by
the dead towns, so the horde walks for its slots and the dead do not grow
an empire (with them the dead reached six cities and twenty-five units by
round 15). Four villages are left on your side, none next to the camp.
The dead: the walled level 3 Barrow and Gravesend and Cairnholm at level 1
(were level 2), six units, no Coins; they know where Wolfden is (their
reveal). Their schedule: `HOLD` the plain until round 4; from round 4 to
round 10 three keep the Barrow and every other unit storms Wolfden
(`GUARD` with `others: ASSAULT`); from the new moon, round 11, `HOLD` the
plain again. Waves: three out of the hills' old graves in round 5 and three
more in round 9 (both join the storm), and the Barrow's last crypts in
round 16 (a Lich among them). Their seat may not research Liches,
Pestilence, Wights or Lumber Camps (Sawmilling, Explosives, Metallurgy,
Forestry) besides revision 4's list: hand play lost a Troll a turn to two
Liches out of sight and the plague, and Wights refilled the Barrow's
center. The clock (round 26) and the stars (round 20, lose no city) are
revision 4's. **The problem:** the raids reach the camp in rounds 6 to 9,
before it has grown; a Goblin (Defense 0.5) that stands alone in the open
is killed and rises on their side, and a Troll that chases the dead into
the open, carried forward by its kills, is eaten by the pack. **The
answer:** Mines and a Workshop for a Troll by round 6 and a second by round
9, the raids broken on your own hills by the Trolls and Goblins that gang
up from beside them, Explosives by round 12, then the march while the dead
sulk on their plain, a thrown Goblin's Kaboom on the ring and a Troll's
Breach kill on the center at full Hit Points (one that lands there hurt
dies the same night). The hints: "The hills are full of ore: Mines grow
the camp.", "The dead raid from turn 5. Fight them on your hills." and "A
Troll can throw a Goblin. Then: Kaboom."

**4, Bone Neck** (revision 6). Two of the four villages on your side are
gone (seven edits). The dead now come from two sides: three rise in your
fields south of Camp Concord in round 3 and three north of Ferry Rest in
round 7, and they take the villages beside your towns and march on Camp
Concord (their reveal). The gate and the tower keep seven (`GUARD` of both
zones, garrison 7) and every other bone-man, the tower's restock of round 6
included, storms Camp Concord (`others: ASSAULT`). The dead may not
research Wights (Metallurgy) besides revision 5's list: hand play found
four Wights refilling the gate's center faster than any Knight could empty
it. Clock and stars are revision 5's (round 14; round 9, lose no city).
**The problem:** a Knight sent alone at the risen is killed by two of them,
and a Knight that lands on the gate's center beside two bone-men (13 Hit
Points of attackers) dies there that night; Explosives' Breach is needed
once the gate has grown Walls. **The answer:** the Catapults and the
Marksman on the near shore strip the Field Defenses and leave the ring
wounded, a Knight's Overrun chain kills the ring first and lands on the
center last, and a Guard and a second Knight stay home for the risen. The
briefing adds "his dead are already rising in your own fields" and "leave
a guard at home"; the hints are "One way in: the Neck. Walk it alone and
you rise dead.", "The dead rise in your fields too: keep a guard home."
and "A rider who kills keeps charging: let him run."

**5, Dead Men's Road** (revision 3). The raiders come out of their camp in
round 3 (was 6) and storm Gallows Cross, the Doctor's town, until round 10
(`GUARD` of the camp with a Musk Ox, `others: ASSAULT`), then hunt the
nearest town (`RUSH`); both seats know where the dead live (their
reveals), and what the fort trains beyond its seven sallies out (`others:
RUSH`). The raiders may not research Scouting and what follows it: no Sled
but the one at home and no Sabretooth (a Sled's Bolas froze the Doctor
beside the pass and its charge killed him in two hand plays), and the
waves of rounds 9 and 13 bring a Yeti for their Sled. The clock is round
24 and the star round 20 (were 20 and 16): defending Gallows Cross costs
the column about four rounds. **The problem:** two fights at once; the
Liches that kill the raiders from behind the Zombies are the Liches the
fort needs, a Lich that stands in front is killed by a charging Sled, and
the fort refills its center every turn. **The answer:** Liches and
Pestilence as before, behind a screen of Zombies, the raiders first (rounds
5 to 9), then the fort, then the Doctor walks the pass behind the dead
with the gate side cleared ahead of him. The briefing's "something white
is already hunting your towns" and the hint "White raiders hit Gallows
Cross from turn 3." say it.

**6, The Deep Gate** (revision 2, unchanged). Replayed on `7r99` and on
`7r100` with the new Ice Folk AI: the autopilot lost the Deep Gate in round 5, and a thoughtful defence held to
the end with two stars, the Thane killed in round 9 by a Boulder Yeti and
Copperstep's center taken twice and retaken, with one Brass Titan and one
Gunner left at the end. It already carries the danger this pass asks for.

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
at its seat's Start Turn of that round, on the written tile or the nearest
free one, with no home city. Waves are the scripted events of the framework: a relief
column, a landing party, the next assault of a siege. They are
deterministic and unconditional (a wave does not depend on what happened),
which keeps replays and the AI's view simple.

**A wave arrives calmly** (`pulp_wars-v642.5`, `7r83`). It arrives with
its turn spent: nothing in it moves or attacks until its seat's next
turn. And it never arrives next to a unit of a seat hostile to it: when
the written tile is taken, cannot hold the unit, or is next to such a
unit, the unit comes on the nearest free tile that is not, searched ring
by ring to the edge of the board (`(y, x)` order within a ring). Before,
a wave could appear up to two tiles from its tile, in the player's line,
and attack at once (a Summoner did in mission 10, a wave of five killed a
squad in mission 9's fourth configuration). Standing on a wave's tiles
does not cancel it: it comes in further out. A wave is announced by the hints or musters out of sight, and the turn it
arrives is the player's to answer it.

**A wave is announced** (`pulp_wars-hmyk.18`). The user, 2026-10-20: "The
regularly appearing AI reinforcements are a nice balancer but you should do
more to announce them. there should be a musical cue and / or a popup."
Every wave the viewer sees arrive (an arrival in the fog is not projected,
so it is neither shown nor heard) plays as one step of the playback
(`REINFORCEMENT` in `src/render/canvas/presentation-plan-v7.ts`): the
camera goes to its tiles by the playback camera's rules (it never moves
once the player took the camera during that seat's playback, and reduced
motion cuts instead of gliding), its units fade in and stand a beat, and
as the step starts a stinger plays and a banner shows
(`src/render/reinforcement-presentation-v7.ts`):

- **The stinger** says the side: ominous for a seat against the viewer
  (`match.wave.enemy`), heroic for the viewer's own wave and a team
  mate's (`match.wave.ally`); [SOUND.md](../ui/SOUND.md#reinforcement-waves).
  Fast Forward plays no stinger.
- **The banner** is a cream plate under the HUD with the faction's stripe
  and emblem: a kicker with the side ("Enemy reinforcements!", "Allied
  reinforcements!", "Your reinforcements!"), one sentence of who and
  roughly where, and the wave's story line in quotes. The sentence is a
  count and the faction's soldiers ("Three Goblin raiders", "An Ice Folk
  warrior"), a verb ("arrive"; "land on the coast" when every tile it came
  on is land beside water; "sail up" for ships) and a place: "near" the
  nearest city the viewer sees within three steps of the wave's middle,
  else the part of the map in nine ("in the north-east", "in the middle
  of the map"). It never names a tile. It counts the units the viewer saw
  arrive. It goes after 4.5 seconds or at a tap, takes no focus, never
  covers End Turn or the dock, and on a phone spans the width between the
  gutters in smaller type. A second banner waits for the first (at most
  three wait). Fast Forward shows it at once.
- **The story line** (E4 of [SAGA.md section 4](SAGA.md#4-mission-system-extensions)):
  a wave may carry `line`, at most 90 characters on one line with no
  coordinates (`missionWaveTextProblemV7`, checked by the builder). A wave
  without one shows its faction's generic line for its side
  (`DEFAULT_WAVE_LINES_V7`: an enemy line and a friendly line for each of
  the nine factions), so every wave of every mission has one.
- **The heads-up** (decided by `pulp_wars-hmyk.18`; default off). A wave
  may carry `announce`: `true` writes "Scouts report Goblins approaching
  from the north." ("allied Undead", "your reinforcements"; the part of
  the map from the middle of its written tiles, none for the middle), a
  string is the sentence itself under the rules of `line`. It shows as a
  banner ("Enemies approaching!", "Allies approaching!", "Help is on the
  way!"), without a stinger, when the playback of the
  boundary that begins the player's last turn before the wave arrives has
  ended: the wave's round when the player plays before its seat in the
  round, otherwise the round before (so a wave of the player's own seat
  is announced the turn before). A heads-up that would fall on round 1 is
  not shown (the briefing and the hints speak then), nor one of a seat
  that is out. No built mission sets it yet; a mission that wants the
  player warned without a hint sets it on that wave.

Both fields are presentation only: they are not in the state, so they are
outside the pinned initial-state hash and need no revision bump. The
hidden fixture `TEST_WAVES` (`src/engine/v7/missions/test-objectives.ts`)
has an allied wave with its own line, an enemy wave with the default line
and a heads-up, and a wave of the player's own; the banner's tests and its
screenshots use it.

### 10.4 Directive schedules

A seat's `directive` may be a list; each entry may carry `fromRound` and
`untilRound`, and the first entry whose rounds hold the current round is
played (`HOLD` until round 6, then `RUSH`). The kinds are those of
[section 2.5](#25-ai-directives): the first four, and `ASSAULT` since
`pulp_wars-v642.5`, used by missions 6 and 8. Since `pulp_wars-v642.10` a
`GUARD` may send the rest of its army out (`others`, section 2.5), used by
missions 3 to 5.
**Strict shapes** (`pulp_wars-hmyk.14`). The builder refuses a malformed
directive like any other definition fault (`missionDirectiveProblemV7`,
run by `validateMissionDefinitionV7` and by the AI's
`validateMissionDirectivesV7`): a known kind with no key that kind does
not take, rounds that are integers of at least 2, zones of rectangles on
the board, a positive garrison, a target on the board, and a `GUARD`'s
`others` absent, `{ kind: "RUSH" }` or `{ kind: "ASSAULT", target }`.
Before, a `GUARD` written with `others: "RUSH"` (the bare word, a slip
made while building `HUMAN_6`) was accepted and played as `NORMAL`.
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

**When the generator changes** (`pulp_wars-ykw.8`, `pulp-wars-poc-7r87`:
natural water redrew every Continents and Lakes board), a mission keeps its
board: the baked layers are what the game plays, and the source names the
generation rules it was baked with, `source.rules` (here
`"SPREAD_VILLAGES_CURIOSITIES"`, the generator of `7r79` to `7r86`, kept as
parity rules). The drift test then regenerates the source under those
rules, so the board stays pinned to a generator that can still draw it, and
neither its layers, its `revision`, nor its initial-state hashes move.
Missions 4 (Continents) and 9 (Lakes) carry it; the Dry Land, Pangea, and
Archipelago missions need none, since those generators did not change. A
source without `rules` is the current generator; `frozen` (no comparison
at all) is the fallback for a board no kept rules can draw.

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
- **Story names** (`pulp_wars-v642.5`): a mission names its cities
  (`MissionCityV7.name`) and may name a landmark that is a neutral village
  (`MissionLandmarkV7.name`). On a mission board those names replace the
  ones dealt from the factions' lists (`src/render/city-names-presentation-v7.ts`)
  everywhere a city is named: its plate on the board, the city panel, the
  log and toasts, and the text harness (`c12 Sugarcrest`); a named village
  wears its plate before anyone takes it, and the city founded there keeps
  the name. The names are presentation, not state: they change no hash
  and need no revision bump. Every city of the ten missions is named, and a
  landmark's name in the chapter ("the Lodge") is its board name ("The
  Lodge") in a sentence, which the chapter test holds. The places of part
  one: Fort Hollow and Drum Camp (1); Fort Ashby, Millbrook, the Warrens,
  Stinkwell and Muckgate (2); Wolfden, the Barrow, Gravesend and Cairnholm (3);
  Camp Concord, Ferry Rest, the Ashen Tower, the Bone Gate and Cinderfield
  (4); Lantern Hill, Gallows Cross, Kessler's Toll, Whitefang and the
  Ironbraid Gate (5); the Deep Gate, Copperstep, Rime Camp and Fort Bullion
  (6); Coldharbour, Fernmaw, the Crater, Tarpit and Port Kessler (7);
  Thunder Nest, the Glass Ship, Ray Hollow, Kessler's Camp and Puppet Ford
  (8; Egg Rock until revision 2 made it a village); Saucer
  Field, Red Dust, Sugarcrest, Gumdrop, Wormwood, Coffin Hill, Spitewood,
  Sourmash and Riftwatch (9); Fort Steele, Northwatch, Millford, Grubnak's
  Hall, the Lodge, Candlewick, Greyhood, Hollow Barrow and Bonefield (10).
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

The ruleset identity was `pulp-wars-poc-7r82` for the framework, and is
`pulp-wars-poc-7r83` since waves arrive calmly ([section 10.3](#103-reinforcements),
`pulp_wars-v642.5`; a match that is not a mission plays as at `7r82`). [Section 3](#3-objectives)
already said that an objective kind is a rules change with an identity
bump, because the objective decides the outcome and the outcome is state a
replay must reproduce; the outcome also gained a field (`cause`), the event
list a kind, and the alliance rule a case (teams). A match that is not a
mission plays exactly as at `7r81`, but its saves are refused like any
other identity change. Mission content added later (missions 5 to 10) does
not change the identity again unless it needs a new rule.

### 10.9 Mission curiosities (`pulp_wars-hmyk.14`)

The saga's extension E1 ([SAGA.md section 4](SAGA.md#4-mission-system-extensions)):
a definition may place curiosities by hand, `curiosities: [{ kind, at }]`,
of any kind map generation places, named by the generator's placement
kind:

- the tile markers `FOUNTAIN`, `SHRINE`, `WRECK`, `WISHING_WELL` and the
  round-3 `TESLA_TOWER`, `MOON_GUN`, `GOLD_CLAIM`, `LOST_EXPEDITION`, each
  fresh (the Gun unfired, the Claim unstaked with its 30 Coins, the
  Expedition unfound, the Well untossed);
- the lone neutral units `MONSTER` (the Giant Spider), `BIGFOOT` and
  `SEA_SERPENT`, each starting on `at`, its home;
- `GATES`, a pair of Dimensional Gates: `at` and its `partner`;
- a camp, `DOWNED_SAUCER` or `GRAVEYARD`, with its `guards`
  (`[{ breed, at }]`).

**Rules on.** A `MISSION` setup's `curiosities` key is `true` exactly when
its definition places any (setup validation refuses any other value), and
then the rules of every placed kind are on, round 3's `ZAP`,
`FIRE_MOON_GUN`, the Claim's payout and the Serpent's neutral turn
included: those rules act on what stands on the board, so nothing else
changes. Nothing is placed by the generator on a mission board, so a
mission without `curiosities` runs with them off, its setup key `false`
and its state exactly as before (every pin of such a mission is
unchanged). The builder creates the neutral units after every other
initial entity, in definition order, as map generation does, and writes no
harvest record on a curiosity's tile.

**Tile rules, not site rules.** The generator's site rules (the distances
to capitals, villages, settlement centres and other curiosities, the
board widths, the landmass and cut-tile rules) do not apply to an authored
tile; the state schema skips the centre distance and the widths for a
mission board. Each kind's tile rules do, and the builder refuses a
definition that breaks one, with the tile in the message: every tile on
the board off its edge ring, on its kind's terrain, and on no settlement,
chest, resource, improvement, Grave, starting unit or other curiosity; a
neutral unit (Spider, Bigfoot, Serpent, guard) 3 or more from every
settlement centre, where it may stand; the Serpent's home on Deep Water
with at least 16 water tiles within 3; Bigfoot's home in a habitat of 12
Forest tiles; a camp's guards of its breeds within 2 of it; one of each
kind and one danger per board (the Spider, a camp or the Serpent); no
Downed Saucer with a Martian seat and no Graveyard with an Undead seat.

**Identity.** No ruleset identity change: no rule of play changed, every
existing setup and state parses as before, and a mission that places
curiosities is a new `(id, revision)`, which an older build refuses as
`UNKNOWN_MISSION`. The hidden fixture `TEST_CURIOSITIES` (TEST_GROUNDS
with nine kinds on an 11 x 11 board, next to the settlements) and
`tests/unit/ruleset-v7-mission-curiosities.test.ts` cover it. Used by
`HUMAN_5` (the Sea Serpent) and `HUMAN_6` (the Tesla Tower), section 15,
by `DINOSAUR_3` (the Sea Serpent), section 17, and by `CANDY_5` (a pair
of Dimensional Gates, the only way across its strait), section 21.

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
  reason to come out, or (since `pulp_wars-v642.5`) give the seat an
  `ASSAULT` on the place it must take.
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
configuration was replayed by `pulp_wars-v642.5` and won in round 13
([section 11.12](#1112-campaign-follow-ups-pulp_wars-v6425)).

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
was changed here (points 1 to 3 were corrected afterwards, and point 4
judged no bug, by `pulp_wars-mch9.27`:
[the Cultists spec, section 15.10](RULESET_7_CULTISTS.md#1510-as-built-the-corrections-from-the-first-real-matches-pulp_wars-mch927)):

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
  arrives with its turn spent would be fairer. (Done by
  `pulp_wars-v642.5`, [section 10.3](#103-reinforcements).)
- **The Normal AI keeps a unit on a center only while it sees a hostile
  unit near.** An allied or guarding seat needs a starting reveal that
  covers its approaches ([section 10.4](#104-directive-schedules)).

### 11.12 Campaign follow-ups (`pulp_wars-v642.5`)

Story names on every board, waves that arrive with their turn spent and
never beside a hostile unit (`7r83`), and the `ASSAULT` directive for
missions 6 and 8. Every mission whose play those changed was played again
by hand through the text harness; the transcripts are in
`scratchpad/pulp_wars-v642.5/transcripts/`. Missions 1 to 4 have no waves
and no new directive and were not replayed. The star thresholds are kept:
no replay was a walkover, and every win came within or just inside the
target rounds of [section 9.2](#92-the-ten-missions) by a player who knew
the missions, as before.

- **Mission 5, the pass** (the replay [section 11.6](#116-dead-mens-road)
  asked for). **Won in round 13, three stars, one unit lost** (a Ghoul,
  caught at the Ice camp by a Sled's Bolas, a Snow Hunter and a Yeti).
  Two Liches with Pestilence shot the toll fort from three tiles (the
  plague splash wore down the whole garrison), the Zombies' and Skeletons'
  Breach ignored the Walls, and the bitten Guard on the center rose as a
  Zombie of yours: the fort fell in round 7 and the Human seat with it.
  Roads from Gallows Cross through the fort carried the Doctor two steps
  a turn; the round 9 wave (two Yetis and a Sled) arrived at its own tiles
  in the north-east and was shot by the Liches from the fort before it
  reached the road. **What nearly went wrong:** in round 11 the Doctor
  could have stepped to two tiles from the gate, and the second Yeti of
  the wave stood unseen in the fog one step from that tile; scouting first
  and waiting a round on the road was the difference.
- **Mission 6 with `ASSAULT`.** **Won when round 14 ended, two stars**
  (the Thane lost): the middle rounds are no longer quiet. The Ice Folk
  went in at once (the peak Mole died in round 5 to three Yetis), the
  Baron's men killed the south door's Hammerer in round 7, and their
  Raider took the Gunner on Copperstep's center in round 8 and stood on it
  (shot off the next turn). A Brass Titan came from the Explorer's
  Monument in round 4 and a second from the Muster's in round 9, as in the
  first build; two Blast Mountains on the northern peaks killed four
  Yetis. **What went wrong:** a Titan sent onto the peaks was frozen by the
  Ice Witch and killed (as section 11.7 warned), and in round 12 a Human
  Knight's Overrun killed a Hammerer, the Thane and a Gunner in one charge
  through the opened east door. **Played passively** (ending every turn
  without a command) the Deep Gate fell in round 9 to the Ice Folk ("a
  place you had to hold fell"); the first build's passive run had to
  disband the garrison to lose.
- **Mission 7.** **Won in round 12 by capturing the Crater, three
  stars**, one unit lost. Rounds 1 to 7 replayed the first build's winning
  line move for move (nothing before the first wave changed); the Baron's
  landing party of round 8 now arrived away from the Frost Giant and the
  Sleds beside the Crater, spent, instead of on the shore beside them, and
  never reached the Crater. A round was lost to the Crater's center: the
  giant killed the Caveman on it but cannot advance after a kill, and no
  other unit could reach the center that turn (the second unit has to be
  placed beforehand).
- **Mission 8 with `ASSAULT`.** **Won in round 11, three stars** (the Old
  Queen on 21 of 45), four units lost: the Queen on the Rim struck the
  Overmind through its Shield (8 to 4) and a Spitter finished it with Acid,
  as in the first build. **Played passively**, the thralls massed at their
  camp, marched from round 9, attacked from round 13, took Egg Rock in
  round 15 and killed eight of the nine dinosaurs by round 20; the first
  build's passive run ended with nine units intact. The clock still ends a
  passive game first.
- **Mission 9.** **Won when round 16 ended, two stars** (Queen Praline
  died in round 8, Riftwatch held): the waves still muster in their camps
  out of sight, so the spent-on-arrival rule changed little here, and its
  besiegers got no `ASSAULT`: they already storm the kingdom every round
  (the first build's record has no quiet round to fix). The
  kingdom's own Sugar Crashes and the first besiegers had taken Praline to
  half her Hit Points by round 4; the block of Ray Gunners and a Shield
  Projector at Riftwatch held the Goblins' southern road, and a Saucer's
  charge on a Rocket Cart set off a chain of death blasts in round 14.
  **What nearly went wrong:** Sugarcrest was down to one Toffee Trooper on
  its center in round 15 with the Undead massed north of it, and every
  city of the player stood at its unit limit from round 6, so the Coins
  piled up (92 at the end) with nothing to train: grow Red Dust and
  Riftwatch early for slots.
- **Mission 10.** **Won in round 15, three stars**, six units lost. The
  barrow fell in round 7 as before (the round 6 Undead wave rose two tiles
  off and could not act on arrival); the Conqueror's Monument and a Farm
  made it a level 5 city with a third Juggernaut that round, and the
  Goblins eliminated the thralls in round 8. The Cult's Star-fall hit the
  barrow three rounds running (a Juggernaut and two Catapults lost), and a
  Horror and the wave killed the pushed-off Juggernaut. The win came from
  two Knights: one Overrun chain cleared Candlewick, two Idol Bearers and a
  Hexer in round 13, and in round 14 a Knight with Breach killed the
  Summoner standing on the Lodge's center and advanced onto it (Favour 23,
  no Summoner left to begin the rite). That is the Cult seat's weakness of
  [section 11.11](#1111-the-stars-are-right) (its center held by whoever
  is nearest). The Cult AI corrections of `pulp_wars-mch9.27` (a sturdy
  garrison kept on a watched center, a Summoner that no longer advances
  into the enemy line) landed after this replay; the round-20 star is kept
  until the mission is played again on them (done in
  [section 11.13](#1113-mission-10-on-the-corrected-cult-ai-pulp_wars-v6426)).

### 11.13 Mission 10 on the corrected Cult AI (`pulp_wars-v642.6`)

Mission 10 played again by hand on `7r83` with the Cult AI corrections of
`pulp_wars-mch9.27`
([the Cultists spec, section 15.10](RULESET_7_CULTISTS.md#1510-as-built-the-corrections-from-the-first-real-matches-pulp_wars-mch927)).
Four games and a passive one; the transcripts and sessions are in
`scratchpad/pulp_wars-v642.6/`. No rule or AI code changed, the ruleset
identity stays `7r83`, and the mission is at revision 2.

1. **Revision 1: won in round 12, three stars, nothing lost. A
   walkover.** The capital reached level 6 in round 1 (the Muster
   Monument, a Farm and a Fruit: a Juggernaut) and Northwatch level 5 in
   round 2 (a second); a Juggernaut killed the Skeleton on the barrow's
   center in round 4 and took the barrow in round 5, and the Conqueror's
   Monument, a Boom and a Farm made it level 5 (a third) that turn. The
   lodge spent its 9 Favour on two Horrors in rounds 4 and 5, and both
   died to Juggernauts without a kill. In round 7 one Knight's Overrun
   killed eighteen units in one charge: an Initiate and an Idol Bearer by
   the barrow, a Familiar, two thralls of the round 6 wave (placed by
   Candlewick), a Hexer, **both Summoners**, an Initiate, the Familiar on
   the Lodge's center, two Hexers, the Stargazer, two Initiates, a
   Skeleton, a Zombie, and the Caller. Every cultist but the Idol Bearer,
   the Chosen and the Thing dies to one Knight's blow. With no Summoner
   until the round 14 wave, the Favour never passed 9; Candlewick fell in
   round 9 (a fifth Juggernaut), the Thing in round 11, and the Lodge in
   round 12. The Goblins took Bonefield in round 8, which eliminated the
   thralls.
2. **Toughened** (revision 2): 5 Coins for you instead of 15 (the second
   Juggernaut a round later, Engineering and Explosives later); in the
   ring an Idol Bearer on the goat path for the Hexer and a Chosen beside
   the Summoners for the Initiate, and the `GUARD` garrison 8 instead of 6
   (the Thing, two Idol Bearers, the Chosen, both Summoners and two Hexers
   stay on the summit), so a Knight's Overrun ends on the first Idol
   Bearer or Chosen it meets; a Zombie on the barrow's center instead of a
   Skeleton. **Won in round 15, three stars**, ten units lost (the
   Captain, two Fighters, three Knights, a Catapult, a Marksman, two
   Juggernauts). The barrow took two blows and fell in round 7. The lodge
   now fought: Horrors killed the Captain (Favour 9) and a fresh Knight on
   the barrow's center (13), and the second stood on that center until two
   Catapults killed it; Tentacles killed two Fighters, a Catapult and a
   Marksman; the ring killed a Juggernaut that stood beside the Lodge
   (the Thing, two Chosen and a Hexer in one turn). A Summoner Sacrificed
   a Chosen (19) and, when a Juggernaut reached the ring, the threatened
   Summoner was Sacrificed by the other (24): one Summoner and 24 Favour
   in round 11, the Great Summoning one unthreatened Summoner away. The
   Juggernaut killed that Summoner in round 12. The Thing died in round 13
   to a Catapult, a Juggernaut's blow and its crush, and a Knight, which
   advanced onto the center and was frogged and killed there; in round 14
   a Knight's hit and a Juggernaut's kill put the Juggernaut on the
   center, and it captured in round 15.
3. **Toughened again**: the lodge's Summoner waves in rounds 12 and 17
   instead of 14 and 20, so a player still at the ring around round 13
   meets a fresh Summoner with the Favour already banked. Replayed with
   the same commands as game 2 through round 12 (nothing before the round
   12 wave changed, and the game is deterministic), then played on: the
   wave's Hexer and Summoner arrived behind the Lodge, the same assault put
   a Juggernaut on the center in round 14, and **the lodge began the Great
   Summoning that same turn** (24 Favour to 4). **Won in round 15, three
   stars**, eleven lost: the capture came at the start of the round the
   Herald would have come.
4. **A slower round 14** (branched from game 3: the center hit but not
   taken): the Summoner stayed threatened by the Juggernaut beside the
   center and no rite began; the wounded Idol Bearer on the center stepped
   off for a fresh one beside it (the garrison swap); a Chosen died
   attacking a Juggernaut (Martyr, 30) and paid for a Horror; a Tentacle
   killed a Knight and a Juggernaut. Two Juggernauts took the center in
   round 15, **won in round 16**.

**Played passively** (ending every turn without a command): the thralls
took Northwatch in round 10 and Fort Steele in round 18, and Millford in
round 21 ("you were eliminated"). The lodge spent its 9 Favour on Horrors
against the Goblins and never held more than 7 again; no rite began.

**The round-20 star is kept.** Every win on revision 2 came in round 15
or 16 with ten or more units lost, by a player who knew the board from
the walkover and found the Muster and Conqueror Juggernauts at once; a
first game should land near round 20, and the Herald is a round away for
a player who reaches the ring with the lodge's Favour banked and a
Summoner unthreatened.

**What the Cult AI did that mattered.**

- **A sturdy garrison: yes, on revision 2.** The Thing (first in the
  garrison) stood on the Lodge's center from round 1 until it was killed in
  round 13, striking from it without leaving it; an Idol Bearer stepped on
  every time the center was emptied, and a wounded one stepped off for a
  fresh one. On revision 1 (a garrison of 6) the center leaked twice, both
  by rules older than the correction: in round 8 the Idol Bearer on the
  watched (not threatened) Lodge stepped aside so the city could train,
  and the Lodge trained a Familiar onto it (8 HP, the worst garrison it
  can train; "a city its seat trains onto keeps the rules it had"); the
  Thing stepped back on the round after. In round 10 the wounded Thing
  stepped off to strike a Juggernaut because an Idol Bearer could take
  its place (the tactical defender replacement, which lets the best
  garrison go when the replacement is more than half as good, as the
  correction's pinned test allows). A follow-up for the AI's owner: a
  watched lodge should step its garrison aside to train only when it then
  trains a garrison at least as good.
- **The Summoner's advance: none seen.** No Summoner made a melee attack;
  they stayed in the ring and channelled. A threatened Summoner was
  Sacrificed by the other for 5 Favour.
- **The Herald: never.** The Great Summoning began once (game 3, round 14) and the Lodge fell before it completed. The Favour came in blood:
  Horror kills (a Captain 5, a Knight 9), a Chosen and a Summoner
  Sacrificed (6 and 5), and a Martyr (6).
- **Blast Mountain on its own summit.** The lodge blasts the Mountains
  beside the player's units (8,2, 8,3 and 9,3 in each won game, 7,3 too in
  one), which
  hurts the units beside them by 5 but turns the summit's Mountain wall to
  Grass and opens the Lodge to Juggernauts and Knights. Worth weighing for
  a guarding Cult seat.
- **Waves away from the army.** With the army at the barrow, the thralls'
  round 6 wave appeared beside Candlewick and on the Cult's summit (the
  nearest free tiles not beside a hostile unit, section 10.3), where it
  was no threat; the rule is as built.

### 11.14 Campaign difficulty pass C: missions 8 to 10 (`pulp_wars-v642.9`)

The user, 2026-10-14: the missions were too easy ("you just push forward
and it's fine no matter what"); past mission 2 or 3 an autopilot should
not win, a mission should pose a problem whose trick the flavour text
hints at, and some missions should be built up from one city with the
technology left to discover. Missions 8 to 10 were played on `7r84` (the
Battleship and Pearls change); Gather Pearls needs Navigation, and the
whole Naval branch is forbidden in all three missions, so their 11 to 15
Pearls tiles pay nobody and the economy is unchanged by it. No rule, AI,
or framework code changed; the ruleset identity stays `7r84`. Sessions,
logs and the autopilot script are in `scratchpad/pulp_wars-v642.9/`
(`sessions/`, `transcripts/`, `tools/autopilot.ts`), the screenshots of
the new briefings and trackers in `screens/`.

**Autopilot** is played by a script through the text harness, by the
brief's definition: one research a turn, the cheapest offered; the first
reward offered; train the line unit (`FIGHTER`) wherever it can; every
unit marches by the shortest land route it can walk (Mountains only with
Engineering, water and Rift only for flyers) straight at the objective,
attacks whatever is in reach (a kill first, then the most damage),
captures what it stands on, never retreats and never uses an ability.

**Mission 8, Brain Wave: revision 2, a build-up.** Revision 1 on
autopilot: **won in round 7, three stars** (the Brontosaurus walked the
Rim alone and killed the Overmind in one blow). The design of
[section 9.3](#93-missions-5-to-10-in-detail) took five configurations:

1. One nest with the Brontosaurus, a Caveman and a Raptor; three Martian
   cities (a town outside the crater), a garrison of seven, the thralls
   `NORMAL` until round 8. Autopilot eliminated in round 11. By hand,
   abandoned in round 6: the colony's Grunts and Saucers were on the nest's
   villages from round 3 and the thralls took the four southern villages.
2. The colony held its half until round 6 and the thralls their row:
   abandoned in round 10, the thralls had four cities and eighteen units.
3. The three southern villages removed: the thralls stayed at two camps,
   but the Colossus was outside the crater when the `GUARD` began, so it
   hunted, and abandoned in round 13 (nothing of a Dinosaur army of
   Cavemen and Spitters scratches a Colossus).
4. The Colossus kept home (a garrison of ten): the guard's rays, the
   Tripod and the Colossus shot three Spitters off the Rim in one turn on
   their way to the peaks two tiles from the Overmind; abandoned in round 16.
5. **Final.** The Old Queen a T-Rex, no Colossus, a garrison of nine, two
   Martian cities, the thralls kept to their camps and without growth.
   **Autopilot: lost, out of time** (round 26 ended; nothing left). It
   researched Gathering, Hunting, Scouting, Crafting, Farming, Leadership,
   Forestry, Spitters, Roads and Raiding, never Engineering, and sent the
   young Queen down the long road, where she lived to the end without ever
   reaching the gate. **By hand: won in round 15, three stars** (the Queen
   on 26 of 36), five units lost. The line: Gathering free and three fruit
   for a level 3 nest and the Scouts' Raptor on turn 1; the Queen took the
   village by the Pass and the Raptors the four of the west by round 8;
   Crafting, Engineering (round 6, before the next capture so it cost less)
   and Spitters; Mines on the peaks; the Explorer's Monument and a Boom in
   round 11; Nesting in round 13. The Queen killed a Ray Gunner and the
   Tripod that came out into the pocket west of the crater (round 9), two
   Saucers (round 13: her third kill made her an Alpha, which heals her
   full and gives Attack 5) and a Grunt (round 14), each time on or beside
   a Mountain the Martians cannot climb, and in round 15 she stepped onto
   the Mountain beside the Glass Ship and killed the Overmind on its walls
   in one bite (8 of 8 through the shield). **The naive raid, tested on a
   copy in round 10:** the young Queen (two kills, Attack 4) took the
   Overmind to 2 of 8 and was killed by two Ray Gunners and the Brain in the
   enemy turn. The second star was tightened from round 20 to 18. **What
   nearly went wrong:** every Spitter or Caveman that ended a turn within
   two of the crater's edge died to the rays, and eggs laid at the front
   were shot before they hatched.

**Mission 9, Sugar and Spite: revision 2.** Revision 1 on autopilot: **won
when round 16 ended, one star** (its three Saucers flew to the kingdom
and attacked whatever was in reach; Praline died in round 13). Revision 2
takes four of the seven starting technologies away. **Autopilot: lost in
round 16** (Sugarcrest fell to the Goblins in the last round; its Grunts
never crossed the Rift). **By hand: won when round 16 ended, two stars**
(Riftwatch held, Praline dead in round 10), eight units lost (mostly
Saucers). The line: hunting to a level 2 Red Dust on turn 1, Riftwatch by
Saucer in round 2 with a Shield Projector and a Ray Gunner beamed beside
it, Raiding and Crafting, Force Fields in round 5; Saucer charges on every
Bomb Chucker and Wolf Rider south of the kingdom (a Bomb Chucker's death
blast took two Goblins with it); a Workshop and the Explorer's Monument
made Riftwatch level 3 for slots; a village on the western shore taken in
round 12; Heat Sinks in round 13. **What nearly went wrong:** every city
stood at its unit limit until Riftwatch grew; a Saucer left beside the
Goblin line died each time; in round 16 Sugarcrest was held by its
Confectioner and one Toffee Trooper, with Gumdrop lost that round.

**Mission 10, The Stars Are Right: revision 2 kept.** On autopilot
revision 2 is **lost** (eliminated by the thralls in round 22). A trial
revision without Gathering, Farming and Leadership (the player's
economy) was **lost on autopilot in round 20** and **twice by hand**:

1. **Lost, out of time.** A Knight's Overrun ran into Candlewick and a
   Horror killed it (Favour 13, round 4); in round 14 a Catapult killed a
   Chosen beside the barrow (a martyr, Favour 19), the lodge Sacrificed an
   Idol Bearer for 21 and began the Great Summoning out of reach of the
   army, and the Herald came in round 15. Its two blows a turn killed five
   Knights and the Juggernaut; two Knights took the Lodge's center in
   rounds 18 and 19 (Explosives' Breach through the walls, both Summoners
   killed, the Herald Unbound), and the Herald, now nobody's, killed each
   of them on the center and stayed on the summit to the end.
2. **Abandoned in round 11**, the barrow not taken: without Farming the
   second Juggernaut never came, and a Knight and the Juggernaut that
   stood on the barrow's center died to its four Zombies and were bitten.

Both games failed by the player's mistakes, but they are the mistakes the
finale should punish, not ten rounds of slow economy, so the finale keeps
its army ([section 9.3](#93-missions-5-to-10-in-detail)); the record of
revision 2's wins (rounds 15 and 16, ten units lost) is
[section 11.13](#1113-mission-10-on-the-corrected-cult-ai-pulp_wars-v6426).
What the games taught went into the text: the briefing now says that a
dying Chosen feeds the Summoning, and the hints name the trick (Catapults
on the ring's Idol Bearers and Chosen, then the Knights' Overrun; the
Summoners first).

### 11.15 The difficulty pass: missions 2 to 4 (`pulp_wars-v642.7`)

Each mission was played by hand through the text harness, once on
autopilot (as defined in [section 9.5](#95-missions-2-to-4-after-the-difficulty-pass-pulp_wars-v6427))
and as a player who reads the briefing, on `7r84`; the sessions and
transcripts are in `scratchpad/pulp_wars-v642.7/s/`. Every earlier draft
that the hand play rejected is listed. Where an autopilot game was decided
long before its clock, its last rounds were played by a small loop of the
same autopilot rules (attack what is in reach, kills first; research the
cheapest; train the line unit), marked "loop" below; it plays nothing else.
No rule or AI code changed; the ruleset identity stays `7r84`.

**Mission 2, The Warrens** (Dry Land 14, seed 9; revision 4).

1. First draft (8 Coins; Gathering, Scouting, Drill, Fortification; six
   units; the Goblins with Hunting, 6 Coins, nine units, three level 2
   towns). Autopilot: by round 7 four units against twenty, five Goblin
   cities. Read-the-briefing: the Goblins snowballed to twenty units and
   seven cities; abandoned in round 6. Far too hard for mission 2.
2. Eased (Goblins at 0 Coins, Drill and Fortification only, seven units,
   level 1 towns): read-the-briefing play lost both giants to Gang Up and
   was at the Warrens' door with nothing left in round 20; with Marksmen
   back (seven units) another game stalled at Muckgate until round 16.
3. **Revision 4** (above). **Autopilot:** Muckgate fell in round 4 (a
   Guard killed the Brute on it), then the march north lost the Raider,
   the capital's Guard, two Fighters and a Marksman one by one to Gang Up,
   and the Goblins took two villages; in round 9 six units (a Guard, a
   Marksman, four Fighters) stood at the Warrens' ring against six Orc
   Brutes (two on Field Defenses), with no giant, no Breach and no slot
   left to train in; stopped there, with no capture in reach of round 18. **Read the
   briefing: won in round 17, three stars.** Fort Ashby reached level 5 in
   round 2 (a Juggernaut), Larkfen level 5 in round 5 (a second, with the
   Explorer Monument); Explosives in round 6; Muckgate fell in round 9 at
   the third try (the Warrens and Muckgate train a Brute onto an empty
   center every turn); Chivalry in round 11. Both Juggernauts were mobbed
   and killed (rounds 7 and 15) the moment they stood alone, and Larkfen
   was lost for two rounds to a Brute on its walled center. The win: the
   last Juggernaut died breaking the Warrens' ring in round 15, and in
   round 16 a Knight's Overrun killed the Wolf Rider beside the Warrens and
   the Brute on its center and stood on it; captured in round 17.

**Mission 3, Green Tide** (Dry Land 16, seed 23; revision 4; the build-up
mission).

1. First draft (the Undead with Gathering, Administration, a Necromancer,
   5 Coins, seven units and two waves; the plain held to row 6): the
   read-the-briefing game lost every Goblin that came near the plain's edge
   (Rally, the Banshees' Wail, Ghouls) and stood at round 17 with two
   Trolls but no Barrow; with a Necromancer-free seat the Barrow grew to
   level 5 by round 12 and fielded an Abomination.
2. **Revision 4** (above). **Autopilot:** researched Gathering, Hunting,
   Scouting and Drill, never grew Wolfden past level 2 (four slots), and
   marched its three units and every new Goblin up the hills; the Wolf
   Rider and the Goblins died at the plain's edge and rose as Zombies by
   round 6; from round 9 (loop) it only trained, and the dead took Wolfden
   in round 20: **eliminated in round 20.** **Read the briefing: won in
   round 17, three stars** (the clock is 26). Drill free and Engineering
   in round 1, the chest by the camp for 5 Coins; Mines on four ore
   Mountains and a Workshop: level 3 in round 2, level 4 (the Boom) in
   round 5, level 5 in round 6 (a Troll), level 6 in round 9 (a second
   Troll); Oddnog and Duskmere taken by a Wolf Rider and a Goblin; Fortification
   in round 10, Explosives in round 12. The Trolls walked up from round 7
   (the hills cost a round per tile); in round 13 a Troll's blow and a
   Goblin finished a Zombie, in rounds 14 to 16 the Trolls killed
   Skeletons, a Ghoul and the Zombies on the ring, one blow on the Wight
   on the center pushed it off, and in round 16 a Troll's kill on the
   center (Breach) put it there; captured in round 17. In the first draft
   the throw-and-Kaboom hurt four bone-men by 6 each in one blow (round
   13), the trick the briefing names. **What went wrong:** every Goblin
   that stood on the plain's edge died and rose as a Zombie, and Duskmere,
   on that edge, was besieged from round 14; Goblins in the open are only
   ammunition for a Troll.

**Mission 4, Bone Neck** (Continents 16, seed 6; revision 5; played as the
Humans).

1. First draft (the gate's garrison six with two Zombies more, waves in
   rounds 6 and 10, the Undead tree open but for Sawmilling): the
   read-the-briefing line worked at once (Catapults stripped the Field
   Defenses, a Knight's Overrun killed seven and stood on the center in
   round 5), but the Knight died on the center that night to the two
   Zombies left beside it, every time (four games), and rose on their side;
   the gate grew Walls and trained Zombies and rebuilt the Field Defenses
   every turn, and a Ghoul from the next town finished any rider.
2. **Revision 5** (above). **Autopilot** (Human): researched Gathering,
   Hunting, Roads, Engineering, Farming; the Catapults on the shore wore
   the exit down well, but the Marksman, the Raider and the Fighters went
   over the neck one at a time, died beside the gate and rose as Zombies on
   the exit; from round 8 (loop) **out of time when round 14 ended.**
   **Read the briefing: won in round 6, three stars.** Chivalry in round
   1, Knights in rounds 2 and 3; the Catapults three tiles from the exit by
   round 2, the Marksman on the neck's first tile in round 4; in round 4
   the Catapults stripped both Field Defenses (the Undead cannot rebuild
   them); in round 5 the Catapults and the Marksman left the Zombies at 2
   and 8 Hit Points and the Knight crossed the neck: Overrun killed both
   Zombies and five Skeletons and ended on the center with nothing beside
   it; captured in round 6. A player who does not find the trick in the
   first rounds meets the tower's wave in round 6; the round-9 star is for
   finding it.

**Not played:** mission 4 as the Goblins (their rider is the Scrap Buggy:
Attack 3, 10 Hit Points, Overrun, and Rocket Carts for siege engines); a
follow-up.

### 11.16 Campaign difficulty pass B: missions 5 to 7 (`pulp_wars-v642.8`)

The same request as [section 11.14](#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429):
past mission 2 or 3 an autopilot should not win, a mission should pose a
problem whose trick the flavour text hints at, and some missions should
be built up from one city with the technology left to discover. Mission 7
is this part's build-up; the escort stays an escort and the hold-out a
hold-out. Played on `7r84` through the text harness
(`scripts/play-text mission`); no rule, AI, or framework code changed and
the ruleset identity stays `7r84`. The sessions and filtered transcripts
are in `scratchpad/pulp_wars-v642.8/` (`m5-*`, `m6-*`, `m7-*`, a `.json`
session and a `.log` each), with the helper scripts in `bin/` (`autoturn`
plays the autopilot's research and training).

**Autopilot**, by the brief's definition, played by hand with the helper:
the cheapest research offered (the free one first), the line unit
(`FIGHTER`) trained wherever it can be, every unit marched straight at the
objective, whatever is in reach attacked, no retreat, no ability used on
purpose.

#### Mission 5, Dead Men's Road: revision 2

Dry Land 16, seed 9, as before. Three configurations, five games:

1. **The fort of seven, still with Gathering**; the Undead with four
   technologies. Autopilot: **lost in round 7** (the Doctor walked into the
   pass with the column and the fort's Marksmen shot him). By hand: **won
   in round 16, three stars**, but the fort harvested its Fruit to level 4
   on round 1, and capturing it handed me a giant. Gathering, Leadership
   and Land Grants are forbidden to the fort now.
2. **The raiders out a round earlier** (`HOLD` until round 5) and a
   Mammoth in the round 13 wave beside the gate. By hand: **lost in round
   17** (the Doctor killed beside the gate by Yetis out of sight; the
   Mammoth's wave had taken the Ironbraid Gate village). Too much at the
   end of a long road: the schedule is round 6 again, the Mammoth is gone,
   and the round 9 wave brings a Musk Ox instead.
3. **Final.** Autopilot: **lost in round 7** ("Doctor Crane was killed.").
   By hand: **won in round 15, three stars.** The line: Forestry and Liches
   on turn 1 and the Muster's Monument; Crafting (round 2), Fortification
   (round 3) and Pestilence (round 5); the Liches shelled the fort from
   beyond its Marksmen's range, every hit plagued the men around the
   target, the Ghouls' Carrion finished the sick and the Zombies' bites
   raised the dead toll-men on my side; Kessler's Toll fell in round 9 (+4
   income), and the Doctor walked the pass from round 9 to round 15 behind
   the dead.

#### Mission 6, The Deep Gate: revision 2

Dry Land 14, seed 18; only the Dwarves' starting technologies changed
(Hunting and Clockwork removed). One configuration, two games:

- Autopilot: **lost in round 6.** It researched Hunting, Scouting,
  Forestry, Clockwork and Roads; the garrison marched out of the doors at
  the first waves and was shelled from the peaks (four units left by round
  4, one by round 5), the Thane died early, and the Ice Folk took the Deep
  Gate in round 6 ("The Deep Gate fell.").
- By hand: **held to the end of round 14, two stars** (the Thane alive and
  unhurt; Copperstep fell to the Baron's Juggernaut in round 14, the last).
  The line: Gyrocopters and the Copperstep's Scouts reward explored the
  map for the Explorer's Monument, and a Brass Titan stood in the gate in
  round 2; the village of Stokvar in round 4; Hunting and Clockwork; Blasting
  Charges in round 6 and two peaks north of the gate blasted under the
  Yetis (one died, the Titan's Siege Hammer finished another); the Muster's
  Monument at Copperstep and a second Titan in round 9; Gunners behind the
  doors firing twice. **Mistakes that cost the third star:** the first
  Titan left the walls to chase the Yetis and was frozen and killed, and
  one of my blasts took my own Field Defense with it.

#### Mission 7, The Island That Time Forgot: revision 2, a build-up

Archipelago 20, seed 2 (the seed browser's contact sheet of Archipelago
20: an island for each seat, and a strait that a road of ice can cross in
one column); 20 Pearls tiles, now worth 10 Coins a Gather (`7r84`). Six
configurations; every abandoned one was the Baron or the Crater out of
hand, not the crossing:

1. **The Crater as the natives' capital** in the middle of their island,
   the Baron `RUSH` from round 12 and four villages on his island:
   abandoned in round 23. The Baron grew to four cities, shipped
   Juggernauts to my island and blockaded the ice road with Patrol Boats.
2. **The Baron without growth technologies**, `HOLD` until round 14:
   abandoned in round 21, the same raids a little later.
3. **The Baron `HOLD` until round 16, then `ASSAULT` the Crater**, but he
   could not see it, so the assault fell on Coldharbour: abandoned in
   round 20. He sees the Crater from the start now.
4. **The Baron seeing the Crater, the Crater still the capital**:
   abandoned in round 26. A capital at level 4 laid a Raptor egg every
   turn and refilled its ring as fast as the giants emptied it.
5. **The Crater as the shore town, the natives without growth**:
   abandoned in round 23. The Baron took the four villages of his island,
   reached four cities and four Juggernauts, and shipped them over.
6. **Final**, the four villages of the Baron's island removed.
   Autopilot: **lost, out of time** (round 30 ended). It researched
   Gathering (free), Hunting, Scouting, Crafting, Rime, Leadership,
   Farming, Forestry, Marksmanship, Roads, Raiding, Engineering,
   Fortification, Pack Ice, Black Ice and Milling in that order, took no
   village (the villages are not on the road to the Crater), so it stayed
   at one city and +3 Coins a turn; its three units waited at the end of
   the spur until Pack Ice let them cross, reached the natives' northern
   tip in the last rounds and died there.
   By hand: **won in round 24, three stars** (the star's last round). The
   line: Rime free and Hunting on turn 1; the villages of Hjorna and
   Brisund in round 3, Glimra in round 4 and Mjolka in round 8; Pack Ice
   (round 5), a Sled from Coldharbour at level 3 (round 6), Black Ice
   (round 8), Forestry (9), Crafting (12), Glacier (14), Gathering (15) and
   Leadership (16); Ports, Hunts and Lumber Camps; Frost Giants from Glimra
   (round 12), Coldharbour (14) and Brisund (15). Sleds froze the road
   down column 7; Raptors and Cavemen that stepped onto it were Frozen by
   Black Ice and shattered, and the Crater's Ankylosaurus shattered in
   round 19. In rounds 21 to 23 the giants, on the tiles beside the
   Crater, killed whatever the natives put on its center; a giant stepped
   onto it in round 23 (at 1 Hit Point) and captured it in round 24.
   **Pearls**: none of the 20 tiles lay in my territory on that line, and
   the Baron gathered once at his port; Coins were not the limit (137
   unspent at the end): the giants and the time to cross were.

**What the build-up taught.** On a board with an island AI seat, what makes a
build-up unwinnable is not the enemy you came for but the third seat's
growth: the Baron with four villages outgrew the player by round 15 every
time. A build-up mission keeps the neutral villages on the player's side
of the board and the bystander's cities few.

### 11.17 Mission 10 on the redesigned Cult (`pulp_wars-mch9.46`)

Mission 10 at revision 4
([section 9.3](#93-missions-5-to-10-in-detail): the lodge with Engineering,
Gibbering Masses, and 8 Favour), played through the text harness on
`pulp-wars-poc-7r91` with the whole redesign on the board: 7-HP robes, the
warden's idol, Star-fall alone with joins, Imps in Broods, Masses on their
Doorstep, the Herald's Hunger, the Cult AI that summons all three daemons,
and the AI against it. Mission seed 20261110. The hand play was authorised
for this bead; no AI-versus-AI match was run. No rule, AI, or framework
code changed and the identity stays `7r91`. The sessions, the autopilot
script (the one of [section 11.14](#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429))
and both debriefs are in `scratchpad/pulp_wars-mch9.46/`.

**Autopilot: lost, out of time** (round 24 ended). It researched Roads, Engineering, Milling, Land Grants,
Pathfinding, Commerce, Armoury, and Explosives, trained nineteen Fighters,
and marched them up the slope a few at a time. The lodge raised a Mass on
its Doorstep in round 2, a Horror in round 3, and Imps from round 6; its
Lodge and Candlewick reached level 5 (a second Thing in the Cellar in round
5), it took Northwatch in round 11 (and Bonefield from the Goblins in
round 16), the thralls took Fort Steele in round 17, and the lodge's
Favour, fed by the daemons' kills, paid for the Great Summoning: a Herald
in round 17 and a second in round 21. The player ended with Millford and
one Fighter.

**By hand: won in round 16, three stars**, four units lost (two Knights, a
Juggernaut, a Fighter). The opening of
[section 11.13](#1113-mission-10-on-the-corrected-cult-ai-pulp_wars-v6426)
still works: the Muster Monument, a Farm and a fruit for a Juggernaut in
round 1, Northwatch to level 5 for a second in round 3, Engineering in
round 4, the barrow shot empty and taken in round 7 and grown with the
Conqueror's Monument, a Boom and a Farm to level 5 (a third Juggernaut),
Explosives (Breach) in round 7. Then the problem:

- **The idols.** Every shot on a unit beside a standing idol is halved
  (the Catapults dealt the Lodge's Thing 4 and 5, half their blow), and a
  unit beside it may strike only the Bearer: the first Knight, frogged
  beside a Bearer in round 5, died to its blow and an Initiate's. Three
  Bearers fell to Juggernauts in rounds 8 and 9 and one to a Knight in
  round 12 (another to its own Unbound Imp, the last to the Goblins), and
  from round 12 the casters stood in the open.
- **The star.** At the end of round 8 the Stargazer marked the siege camp
  for 15 (three chanters): in round 9 every unit but one Fighter, which
  had no tile out of the mark, stepped out of its nine tiles. In round 10
  a Juggernaut killed the Stargazer behind the summit, and the star it had
  marked next fizzled.
- **The robes.** In round 12 one Knight's Overrun killed an Idol Bearer, a
  Summoner, three Initiates and a Hexer (six kills); it died to the
  Lodge's Thing, which stepped off the center to strike it. Candlewick's
  Thing stepped off its center in round 10; a Juggernaut killed the Imp
  left on it in round 11 and captured in round 12, and another killed the
  Thing in round 13; the Goblins killed the third.
- **The Lodge.** In round 15 two Catapults and a Marksman took the Lodge's
  Thing from 16 to 4 through the idol, a Juggernaut with Breach killed it
  and stepped onto the center, was promoted (a full heal), and captured in
  round 16.

**What nearly went wrong:** a Knight left beside a Bearer after its chain
(round 5), a Juggernaut on 5 Hit Points that struck a Bearer and died to
its blow (round 11), and the round 7 Zombie that stood on Millford with
nothing in reach to strike it (the Goblins eliminated the thralls the
next round, and it died with them). **What the Cult AI did:** it spent every
Favour as it came (a Mass on the Doorstep in rounds 5 and 14, an Imp
nearly every round, a Horror in round 12), so its Favour never passed 5
and no rite began; the Imps swarmed the Juggernauts for 3 a blow with no
strike back; in round 8 the first Mass stepped from beside the Lodge's
center to strike a Fighter, onto a tile beside an Idol Bearer (still its
Doorstep, no strand), the Bearer struck a Juggernaut and was left on 4
Hit Points, and that Juggernaut killed it first thing in round 9, so the
Mass, held by nothing, broke loose at the lodge's check and bit its own
Initiate (`pulp_wars-mch9.50` found the move legal; the idol was lost
first); the lodge's Things stepped off the center to strike and stepped
back. **The round-20 star is kept**: the win came four rounds inside it
by a player who knew the board, as in section 11.13.

**`LAB_CULT_MID`** was checked, not played: its revision 2 already places
the redesigned roster, and a test now shows that on its first turn the
Summoners offer an Imp, a Horror, and a Mass and a star begun alone can be
joined. Its state did not change, so it stays at revision 2.

### 11.18 The danger pass: missions 3 to 6 (`pulp_wars-v642.10`)

Pass A of the danger pass ([section 9.6](#96-missions-3-to-6-after-the-danger-pass-pulp_wars-v64210)).
Played on `7r99` through the text harness (`scripts/play-text mission`);
the sessions and logs are in `scratchpad/pulp_wars-v642.10a/s/` (`m3a*`,
`m4a*`, `m5a*`, `m6a*` thoughtful, `*auto*` autopilot) with the helpers in
`bin/` (`autopilot.py` plays the brief's autopilot unattended: the
cheapest research, the line unit in every city, every unit attacks what is
in reach, a kill first, or steps to the offered tile nearest the
objective). The ruleset identity stays `7r99`: the only code change is the
directive lever (`GUARD`'s `others`), in the AI layer. Every rejected
draft is listed; "thoughtful" is a player who reads the briefing and
hints, makes ordinary mistakes, and learns from the previous attempt.

**Mission 3, Green Tide** (Dry Land 16, seed 23; revision 5).

1. First draft (three villages near the camp removed; the dead at eight
   units and 5 Coins with level 2 towns, `GUARD` with `others: ASSAULT`
   from round 1, waves in rounds 5, 12 and 16). The raid reached the camp
   in round 4 (a Skeleton killed a scouting Goblin) and the dead massed at
   the hills' edge from round 6; two Trolls (rounds 6 and 9) broke the
   first raids, but the dead took the two villages by their towns and a
   third, reached six cities and twenty-five units, and two Liches out of
   sight with the plague killed a Troll in round 15: abandoned in round 17.
2. The two villages by the dead towns removed, no Liches or Pestilence:
   eighteen units by round 13; a Troll carried forward by its kills into
   the western pack died in round 9; abandoned in round 14.
3. The dead at six units and no Coins, `HOLD` until round 4, raids in
   rounds 5 and 9, no Wights: the march started in round 13, the ring was
   broken by a thrown Goblin's Kaboom in round 19, but a fresh Zombie was
   trained onto the center every turn; abandoned in round 21.
4. The dead fall back to their plain at the new moon: the Troll that
   landed on the center at 27 Hit Points in round 17 was killed there
   that night (a Lich, two Zombies, a Skeleton); abandoned in round 19.
5. **Final** (the dead towns at level 1, no Lumber Camps, no round 12
   wave). **Autopilot: eliminated in round 9** (Gathering, Hunting,
   Scouting, Farming, Forestry and Roads; no Mines, no Troll; the raid of
   round 5 killed its three units in rounds 7 and 8 and took Wolfden).
   **Thoughtful: won in round 18, three stars** (the fifth attempt, with
   the lessons of the four before). Engineering on turn 1, the chest for 5
   Coins, Mines and a Workshop: the first Troll in round 6, the second in
   round 9. **Danger:** the round 5 raid came down to the hills' edge;
   in round 7 it killed two Goblins standing on the front, in round 8 a
   Zombie's bite killed a third and it rose on their side; in rounds 8 and
   9 the Trolls (from the walled center and the mine hills) and Goblins
   ganging up beside them killed four raiders without loss. Fortification
   in round 10, Explosives in round 12, the march from round 10 by the
   eastern hills (the village on the way taken in round 14, a Goblin lost
   to the reserve north of the Barrow in round 16). In round 15 a Troll's
   kill on the ring carried it beside the center; in round 16 its Breach
   blow left the fresh Zombie on the center at 6 Hit Points (the push
   failed), and in round 17 it killed it and stood on the center at full
   Hit Points, held the night, and captured the Barrow in round 18. The
   thrown Goblin's Kaboom was the key in attempts 3 and 4 (two kills and
   two Field Defenses in one throw) and was not needed in the final.

**Mission 4, Bone Neck** (Continents 16, seed 6; revision 6; as the
Humans).

1. First draft (the dead free to research Wights). **Danger:** the risen of
   round 3 took the village south of Camp Concord in round 4 and attacked
   the Fighter beside the capital; a Knight's Overrun chain went over the
   neck in round 5 (four kills) and onto the gate's center, and a Ghoul and
   a Skeleton killed it that night; the risen of round 7 took the village
   north of Ferry Rest in round 9; four Wights refilled the gate's center.
   Abandoned in round 11.
2. **Final** (no Metallurgy for the dead). **Autopilot: eliminated in round
   11** (Gathering, Hunting, Farming, Forestry, Marksmanship, Roads; its
   units walked the neck one by one, the risen took Camp Concord in round
   9 and Ferry Rest in round 10). **Thoughtful: won in round 10, two stars**
   (the round 9 star missed). Chivalry on turn 1, Knights in rounds 2, 4
   and 7, the Muster's Monument and Walls at Ferry Rest in round 3, the
   Catapults three tiles from the exit. **Danger:** the risen of round 3
   killed the home Knight sent at them alone (round 4); in round 6 a
   Knight's chain (four kills) landed on the center and was killed there
   that night by a Ghoul and a Skeleton from the gate's reserve; the
   second home Knight retook the risen village (round 8); the gate grew
   Walls (round 8), so Explosives' Breach (round 9); in round 9 a Knight's
   Overrun chain killed six (the ring and the reserve north of the gate)
   and landed on the center last, held the night, captured in round 10.
   The village north of Ferry Rest stayed with the risen.

**Mission 5, Dead Men's Road** (Dry Land 16, seed 9; revision 3).

1. First draft (raiders out in round 3 with a hunting party of three on
   the south road in round 4; the fort's others `RUSH`; the clock round
   20). **Danger:** the raiders reached Gallows Cross in rounds 5 to 7 and
   pinned both Liches there; a Sled froze units with its Bolas every turn;
   the fort fell in round 12 and the Doctor was four steps short when the
   clock was out of reach (round 18). Lost on time.
2. The same: a Lich pushed forward was charged by a Sled and killed in
   round 7, the other the same night; abandoned in round 8.
3. Clock round 22, star round 20 → 18: the Doctor, walking ahead of his
   column past the fort, was frozen by a Sled's Bolas and killed by the
   Sled and an unseen Snow Hunter in round 16.
4. The same configuration, the opening of 3 replayed to round 14, then the
   fort taken (round 15) and the escort ahead of the Doctor: **won in round
   22, two stars**, the last round.
5. The hunting party removed: the Doctor slipped past the fort while it
   stood, was frozen by a Sled and killed by it and a Guard in round 16.
6. **Final** (no Scouting for the raiders, so no Sled but the one at home
   and no Sabretooth; the waves' Sleds are Yetis; the clock round 24 and
   the star round 20). **Autopilot: lost in round 12** (the Doctor walked
   into the pass with the column and was killed). **Thoughtful: won in
   round 22, two stars** (on the clock of round 22, before it was set to
   24). **Danger:** the raiders at Gallows Cross in rounds 5 to 8 (a Sled
   charged and killed a Lich that stepped out from behind the Zombies in
   round 8); the fort refilled its center with a Guard every turn until
   round 16; Yetis of the round 13 wave killed three Zombies around the
   fort in round 17 and stood beside the Doctor's path; a Snow Hunter
   brought the Doctor to 4 Hit Points in round 19. The line: Forestry and
   Liches on turn 1, the Muster's Monument and Walls at Gallows Cross,
   Crafting, Fortification and Pestilence by round 6; the raiders killed
   by round 9; the fort shelled from round 10 and taken in round 17 (a
   bitten Marksman rose on its center); the Doctor from round 17 to round
   22 behind the Zombies.

**Mission 6, The Deep Gate** (Dry Land 14, seed 18; revision 2, not
changed). **Autopilot: lost in round 5** (the garrison marched out and the
Deep Gate fell). **Thoughtful: held to the end of round 14, two stars**
(the Thane lost). Blasting Charges and Gyrocopters on turn 1, a Workshop
in round 2, the Explorer's Monument and a Brass Titan in round 4; blasts
on the peaks killed or wounded six Yetis in rounds 3 to 6. **Danger:** the
Baron's wave killed the south door's Hammerer in round 6 and a Fighter
stood on Copperstep's center in round 8 and again in round 9 (killed each
time); the Ice Folk wave of round 7 (a Boulder Yeti) killed the Steam Mole
and, in round 9, the Thane; by round 12 one Brass Titan, two Gunners and a
Hammerer were left, and the Deep Gate held with the Titan alone on its
center. It needs no change for this pass.

**What the pass taught.** The Normal AI with `others: ASSAULT` attacks
early and keeps coming, but it masses before it commits, so the first
contact comes two or three rounds after a wave arrives; the danger is
then real for a slow build-up (missions 3 and 5) and an escort. What tips
a mission from dangerous to unwinnable is the enemy's economy (villages
and city levels: mission 3) and one unit kind that breaks the trick
(Wights on mission 4's center, Sleds against mission 5's Doctor); those
are removed by forbidden technologies and edits, not by softening the
attacks. A unit that lands on a city center beside the enemy's reserve
dies that night in every mission of this pass: the tricks have to clear
the ring before they land.

**On the ice redesign (`7r100`).** The frozen sea redesign
(`pulp_wars-5ti.25`, `7r100`) and its AI (`pulp_wars-5ti.26`) landed on
`main` during this pass. Missions 5 and 6 use the Ice Folk only as enemies
on dry land; both were replayed on the new rules and AI: the autopilot lost
both again (mission 5 in round 12, mission 6 in round 5), and the final
thoughtful games of all four missions, replayed command for command,
played out identically (mission 3 won in round 18 with three stars,
mission 4 in round 10 with two, mission 5 in round 22 with two, mission 6
held with two).

### 11.19 The danger pass B: missions 7 to 10 (`pulp_wars-v642.10`)

The user, 2026-10-18: "the missions are too easy. aside from the first
few they should get harder ... There should be some danger involved."
The targets: a thoughtful player feels threatened in the first five to
eight rounds and can lose cities or the mission if careless; the
autopilot of [section 11.14](#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429)
loses; a thoughtful first win is usually one or two stars. Missions 8 to
10 were played on `pulp-wars-poc-7r99` (the Bolder abilities), mission 7
on `7r100` (the ice redesign, `pulp_wars-5ti.25` and `5ti.26`, merged
during the pass). Only mission data, the chapter text and their tests
changed: no rule, AI or framework code, and no new directive lever (the
`ASSAULT` of `pulp_wars-v642.5`, schedules and waves were enough). The
sessions, the autopilot script, the compact view, the attack lister and
the replay helper are in `scratchpad/pulp_wars-v642.10b/`.

#### Mission 7, The Island That Time Forgot: revision 3

Archipelago 20, seed 2; mission seed 20261107. Revision 2 never
threatened the player: nothing could reach the island before the
crossing. Four configurations:

1. A raid of three (two Fighters and a Marksman) on the spur in round 6
   and four more in round 11, the Baron storming Coldharbour from round 5
   to 15: abandoned in round 10. The raiders took Hjorna in round 8 and
   trained in it, and five Baron units stood on the island.
2. A raid of three in round 8, the assault until round 16: abandoned in
   round 16. Hjorna surrounded, the Baron shipping Raiders and a Guard
   over, no crossing begun.
3. A raid of three in round 7, the assault until round 12 and then his
   island again: abandoned in round 18, four rounds behind the old line
   (the first Frost Giant in round 16).
4. **Final.** A raid of two (a Fighter and a Marksman) in round 7, the
   assault on Coldharbour until round 12. **Autopilot: lost, out of time**
   (round 30 ended, one city). **By hand: won in round 28, two stars**
   (no city lost; not by round 24).

The line: Rime and Hunting in round 1; Brisund in round 2, Hjorna in 4,
Mjolka in 5, Glimra in 14; Crafting (3), Deep Winter (7: a Musk Ox on
Hjorna's center in round 8), Pack Ice (10), Black Ice (11), Gathering
(12), Forestry (14), Glacier (20); Frost Giants from Brisund (16),
Coldharbour and Hjorna (20); the ice road down column 6 in rounds 19 to
23, which the giants slid along; a giant killed the Spitter beside the
Crater (25) and two the Ankylosaurus on its center (26); a giant stepped
on in round 27 and captured in round 28. **The danger moments:** in
round 8 the raiders struck the Musk Ox on Hjorna, whose Frostbite froze
the Fighter for a Yeti to shatter; the Marksman sniped Yetis until round
16; from round 17 the Baron's flotilla (a Guard, a Fighter, two Raiders,
the Marksman, a Juggernaut and Patrol Boats) passed the spur on its way
to the Crater, and in round 21 a Fighter stepped onto Hjorna's center
(the Ox and a Sled killed it); a native Spitter killed the Yeti that
froze the road (23) and a Caveman the Yeti on the Crater (26). On
`7r100` the road is permanent and the Ice Folk slide along it, which is
what made the late crossing possible.

#### Mission 8, Brain Wave: revision 3

Pangea 16, seed 2. **Autopilot: eliminated in round 19** (the thralls
took the nest). **By hand: won in round 22, two stars** (the Old Queen
alive on 6 of 36; not by round 18).

The line: Gathering free and three fruit for the Scouts' Raptor in round
1; Grumba and Thogga in round 2, Rokku and Gronda in 5; Crafting (3),
Engineering (5), Hunting (8), Spitters (10), Forestry (13), Leadership
(17); Mines on the peaks, the Explorer's Monument and a Boom in round 9,
the Brontosaurus in round 14. The thralls marched from round 3 and the
Queen ate them: six kills in one Overrun in round 8 (an Alpha), eleven by
round 13. The finish was a climb: Spitters on the Rim took the Overmind
from 8 to 1 with Acid through its walls, and the Brontosaurus stepped
onto the peak beside it and killed it in the same turn. **The danger
moments:** the thralls on Rokku and Gronda from round 6; Saucers, a Ray
Gunner and the Tripod on Grumba from round 8 (a Caveman lost, and two
Spitters to the Tripod later); the thralls' waves wore the Queen from 36
to 6 by round 21; whatever ended a turn beside the Brain would have been
taken.

#### Mission 9, Sugar and Spite: revision 3

Lakes 16, seed 5. Revision 2 on `7r99` was **won on autopilot with one
star**: the kingdom held alone. Six configurations, each judged by the
autopilot first: the dead rising in your strip (rounds 5 and 10) and a
last wave of both besiegers in round 14, then the Goblins storming
Sugarcrest (`ASSAULT`), the last waves in round 13, no Confectioner, and
a second last push in round 15 were all still won on autopilot (once a
Goblin Wolf Rider stood on Sugarcrest's center when the last round
ended). **Final:** the two extra waves of both besiegers in rounds 9 and 11. **Autopilot: lost in round 15** (Sugarcrest fell). **By hand: won
when round 16 ended, two stars** (Riftwatch held; Praline dead in round
10).

The line: Raiding and two hunts for Red Dust in round 1; Riftwatch by
Saucer in round 2, a Shield Projector and a Ray Gunner beamed beside it
in round 3; Crafting (2), Force Fields (3), Gathering (7), Leadership and
Forestry (10), Land Grants (12); Fudgley taken in round 4. **The danger
moments:** the Goblins' Gang Up killed a Saucer that charged their line
(round 6); Bomb Chuckers killed both Ray Gunners (rounds 9 and 11); a
Rocket Cart killed Praline (round 10) and Sugarcrest's center stood empty
with an Orc Brute beside it (round 11); in round 12 a Saucer killed a
Rocket Cart whose blast took two Bomb Chuckers, two Goblins and two more
Rocket Carts (and the Saucer); the dead of the strip came over the
northern peaks in round 12, took Fudgley in round 14 and killed two
Grunts and a Saucer. Sugarcrest ended the mission with two defenders.

#### Mission 10, The Stars Are Right: revision 5

Pangea 20, seed 23; mission seed 20261110. Seven configurations:

1. The thralls storming Northwatch from round 1, waves of four every four
   rounds from round 4, Fort Steele at level 4 without a Captain, the
   four near villages removed: autopilot lost (out of time, two cities
   lost). By hand abandoned in round 3: a Knight's Overrun had emptied
   the barrow and stood on its center.
2. The barrow walled (level 3) and waves of five or six every three
   rounds: abandoned in round 12 (thirteen dead on Northwatch).
3. Waves every four rounds, the barrow walled: abandoned in round 15
   (the barrow's center killed every unit that stood on it).
4. The barrow unwalled with a second Zombie, Fort Steele at level 3:
   abandoned in round 12.
5. Waves in rounds 5, 10 and 15: abandoned in round 15.
6. Waves in rounds 5 and 10, Fort Steele at level 4: abandoned in round
   14 (twice, the second a replay of the first nine rounds).
7. **Final:** revision 4's start (Fort Steele at level 5, the Captain)
   with the thralls' assault, the second Zombie, the waves of rounds 5
   and 10 and the four villages gone. **Autopilot: eliminated in round
   20** (Northwatch fell, then Fort Steele and Millford). **By hand: won
   in round 21, two stars** (no city lost; not by round 20).

The line: the Muster Monument, a Farm and a fruit for a Juggernaut in
round 1; Northwatch walled in round 2 and at level 5 for a second
Juggernaut in round 3; Engineering (4), Explosives (5), Land Grants (9);
the barrow emptied by a Knight's Overrun in round 5 and captured in
round 6, the Conqueror's Monument and a Farm there for a third
Juggernaut; Fort Steele to level 7 (round 9) and 8 (round 12) for a
fourth and a fifth. **The danger moments:** from round 2 the thralls
struck Northwatch's walls (a Fighter died and rose as a Zombie in round
3); in round 6 a Star-fall of three chanters killed the Knight on the
barrow; Imps and Idol Bearers ground the barrow's Juggernaut down to 13;
Knights died to the Things in rounds 10, 11 and 13; in round 14 a Knight
killed an Initiate, an Idol Bearer, an Initiate, the Stargazer and a
Summoner in one Overrun; in rounds 19 and 20 the Goblins' Gang Up and
Kaboom broke the Things and the last Bearer, and in round 21 a Goblin
Orc Brute captured the Lodge for the alliance.

#### What the pass taught

- `ASSAULT` from the first round gives the early threat, but the Normal
  AI sends the units one by one; a seat whose home is weak loses it to
  one Knight's Overrun. The attacker's own home needs a sturdy center.
- Waves are the lever for danger near the player, but in a build-up a
  raid must stay small: three raiders with an assault of eight rounds
  took a village and starved the build-up every time.
- A `RUSH` seat stood off walls a giant held; `ASSAULT` on the place
  made the siege of mission 9 real.
- The Bolder abilities changed two missions by themselves: Goblin Gang Up
  (+4 with two helpers) made both Goblin seats lethal, the ally of mission
  10 included, and a Brain now takes the Old Queen if she stands beside
  it.

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
   with `source { mapType, size, seats, seed, edits: [] }` (a board baked
   before a generator change also names its `rules`, section 10.5). Add an edit for
   every change you make to a layer (remove the village where a city
   stands; a land bridge; a Rift band), and keep the list short: the board
   should read as generated.
4. **Seat it.** For each seat: faction (seat 0 may offer a choice), Coins,
   technologies, cities with levels and rewards, units by role, a reveal.
   Put every landmark of the objective inside seat 0's reveal. Name
   landmarks and tag units in capitals (`GATE`, `ARCHIVIST`), and give
   every city its story name (`name: "Fort Hollow"`; a village landmark
   too, when the story names it).
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

## 14. The campaign map and the faction campaigns (`pulp_wars-hmyk.3`)

**Request (user, 2026-10-19, epic `pulp_wars-hmyk`, summarized):** one
campaign per faction, about six missions each, unlocking one another as a
graph shown on a campaign screen "sort of like in HoMM 3": each campaign a
picture, the unavailable ones greyed out, arranged in a logical way; a cheat
code to pick any mission of any campaign; the campaigns deployed one at a
time under the main menu's Campaign button. Where this section differs from
sections 4, 5 and 10.6, it is current.

### 14.1 The registry

`src/campaign/campaigns.ts` lists every campaign (`CAMPAIGNS_V7`) in map
order. An entry has an ID, its faction, a short name for sentences
("Humans"), a title and a subtitle, a tier, its prerequisites, a picture
(an asset ID of `src/assets/campaign-pictures-manifest.ts`, drawn in bead
`pulp_wars-hmyk.13`; see
[the campaign pictures](../art/CAMPAIGN_PICTURES.md)), the portrait shown
when there is no picture or it fails to load, and its chapter (the missions,
story and unlocks of `src/campaign/chapter-1.ts`'s shape), null until the
campaign is written. The titles and subtitles of the faction campaigns are
placeholders ("The Human Campaign", "Six missions") until the saga bible
(`pulp_wars-hmyk.1`) names them; each campaign bead (`pulp_wars-hmyk.4` to
`.12`) fills in its entry there.

The ten-mission chapter of part one is the **prologue**, "The Hollow
Frontier" (`FRONTIER`): always open, no one's prerequisite, its missions
and progress unchanged. A mission belongs to exactly one campaign; its ID is
unique across them.

### 14.2 The unlock graph

| Tier | Campaigns                             | Open when                       |
| ---- | ------------------------------------- | ------------------------------- |
| 0    | The Hollow Frontier (prologue)        | always                          |
| 1    | Humans, Undead                        | always                          |
| 2    | Dinosaurs, Martians, Goblins, Dwarves | Humans **and** Undead completed |
| 3    | Ice Folk, Cultists, Candy             | all four of tier 2 completed    |

- A campaign is **completed** when its last mission is won.
- A campaign with no registered mission is **Coming soon**: on the map,
  greyed with a lock, never started, whatever its prerequisites. A campaign
  that is built but waits for prerequisites is **Locked** and says which
  ("Locked: finish Humans and Undead"). The two are distinct.
- Inside a campaign the missions open in order, as before (section 4.2).
- The Cult is the middle of the last row: the saga culminates there.
- Skirmish stays ungated (section 4.3). The faction unlocks of the
  prologue are unchanged.

The derived state is in `src/campaign/progress-v7.ts`: `campaignPlatesV7`
(each campaign's status, the prerequisites it still waits for, missions won
and stars), `campaignCompletedV7`, `campaignBuiltV7`, and
`campaignNewlyOpenedV7` (the campaigns a win opened, for the Victory
dialog's "New campaigns: …" notice).

### 14.3 The screen

The main menu's **Campaign** opens the **campaign map** (the panel titled
"Campaign"):

- The prologue's wide plate on top, set apart by a dashed rule.
- Below, three rows: the two openers, the middle four, the last three.
  Between two rows, the lines of what unlocks what: every plate above joins
  one knot that fans out to every plate below (every campaign above opens
  every one below). The knot is a lock with "Finish both" / "Finish all 4"
  (and "· 1/2" once some are done) until the gate opens, then a yellow flag
  with "Open"; the lines are dashed and soft while closed, ink when open.
  The lines are drawn in a box stretched to the row, so they meet the
  plates' centres at any width without measuring the layout.
- A **plate** is a button: the picture (a 128 x 96 scene of the campaign,
  shown 1:1 and shrunk to fit a narrow plate; the faction's portrait on a
  framed plate with a stripe of the faction's colour should it fail to
  load), the title, and the progress ("Open"; or a star with "4/18" and "2 of 6"; a
  trophy badge once completed). Locked and Coming soon plates are greyed with
  a lock badge, `aria-disabled`, focusable; a tap writes why in a status
  line under the map ("The Dinosaur Campaign opens when you finish Humans
  and Undead.", "…: coming soon.") and opens nothing. The accessible name
  carries the state ("The Human Campaign, open, 0 of 6 missions won";
  "…, Locked: finish Humans and Undead"; "…, Coming soon").
- **Settings** (Reset progress) is at the foot of the map.
- On a phone (narrower than 30rem) the middle four are two rows of two, and
  the lines follow; the map scrolls with the page.
- An open plate opens the campaign's **mission list**: a **Campaigns** back
  button, the picture (twice its size on a screen 48rem or wider) with the
  subtitle and title, the story, and the
  mission cards of section 10.6; the prologue keeps its Factions row. A card
  opens its briefing as before; Back returns to the list. Escape steps
  back: briefing, list, map, menu.
- Leaving a finished mission (Next mission, Campaign) returns to that
  mission's own campaign.

### 14.4 Progress, version 2

Progress is grouped by campaign under a new key, `pulpWars.campaign.v2`:

```json
{
  "format": "pulp-wars-campaign-progress",
  "version": 2,
  "campaigns": {
    "FRONTIER": {
      "completed": {
        "FRONTIER_1": {
          "firstWonAt": "2026-10-03T12:00:00.000Z",
          "bestRounds": 14,
          "stars": 2
        }
      }
    }
  }
}
```

- **Migration.** While there is no version 2, the store reads version 1
  (`pulpWars.campaign.v1`) and files its missions under `FRONTIER`; no win
  is lost. Nothing is written on load; the first win recorded writes
  version 2 under the new key. The old key is left alone, so an older
  build (a cached tab) still reads its progress, until **Reset** erases
  both keys.
- A win is filed under its mission's campaign; a mission already filed
  elsewhere stays there. Unknown campaign and mission IDs are kept. A
  mission listed under two campaigns is unreadable.
- The controller still hands the screens every completion in one record
  (mission IDs are unique), so the derived state reads as before.

Analytics: `mission_start` and `mission_end` carry `campaign_id`
(`frontier`, `humans`, …; [ANALYTICS.md](../ANALYTICS.md)).

### 14.5 Testing: pick any mission

A cheat for testing, **"All missions unlocked"**:

- On the campaign screen, **tap the "Campaign" title seven times quickly**
  (each tap within 0.8 s of the last), or **type `pulpwars`** on a
  keyboard. Doing it again turns it off.
- Or open the game with **`?campaign-cheat=1`** in the address
  (`?campaign-cheat=0` turns it off).
- While it is on, a yellow **All missions unlocked** chip stands beside the
  title (tap it to turn the cheat off); every built campaign is open
  whatever its prerequisites, every mission of it can be picked, and a
  choice of faction offers the mission's whole list. Coming soon stays
  Coming soon. Wins are recorded as usual.
- The switch is stored in localStorage (`pulpWars.campaignCheat`), so it
  survives a reload.

## 15. The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`)

The first faction campaign: six missions, `HUMAN_1` to `HUMAN_6`
(`src/engine/v7/missions/human-*.ts`), in the chapter
`src/campaign/chapter-humans.ts`, which the campaign map's Humans plate
opens (tier 1, open from the start). The briefings and closings are the
saga bible's ([SAGA.md](SAGA.md) sections 2.1 and 3.1), trimmed to the
card. Each mission was hand played through `play-text` (the "thoughtful"
run, using the hint) and run by a scripted autopilot (research the
cheapest technology, train Fighters, attack or capture what is in reach,
march on the objective); from mission 3 on the autopilot must lose or miss
the clock.

### 15.1 The missions

| Mission                      | Board (generator, seed) | Match seed | Seats                                        | Format and clock                                | Stars                             |
| ---------------------------- | ----------------------- | ---------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| H1 Thaw at Northwatch        | Dry Land 11, seed 2     | 20261201   | Humans; Undead                               | Conquest of Hollow Barrow and the Barrow Camp   | by round 12; no city lost         |
| H2 The Lord Protector's Writ | Dry Land 14, seed 9     | 20261202   | Humans; Goblins                              | Capture the three toll forts by round 18        | by round 14; no city lost         |
| H3 Outlaws of the Greenwood  | Pangea 16, seed 21      | 20261203   | Humans; Goblins; Dinosaurs                   | Escort Mr. Pettigrew to Kingsbridge by round 20 | by round 16; no city lost         |
| H4 The Siege of Fort Hollow  | Dry Land 16, seed 19    | 20261204   | Humans and Undead (ally); Cult; Ice Folk     | Hold Fort Hollow for 12 rounds                  | no city lost; Mr. Pettigrew lives |
| H5 Broadsides at Saltmarsh   | Continents 16, seed 1   | 20261205   | Humans; Goblins; the Sea Serpent (neutral)   | Sink the Golden Goose by round 20               | by round 16; no city lost         |
| H6 Kessler Hall              | Pangea 20, seed 16      | 20261206   | Humans; Goblins, Dinosaurs and Cult (teamed) | Capture Kessler Hall by round 22                | by round 18; no city lost         |

### 15.2 Hand play

| Mission | Thoughtful run                                                             | Autopilot                                                                 |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| H1      | Win, round 9, 3 stars                                                      | Defeat, round 12                                                          |
| H2      | Win, round 15, 2 stars (missed the round-14 star)                          | Victory, round 12, 3 stars (allowed at step 2: a stream of Fighters wins) |
| H3      | Win, round 15, 3 stars                                                     | Defeat, round 4                                                           |
| H4      | Win (held), round 12, 2 stars (Mr. Pettigrew died in the last enemy phase) | Defeat, round 10                                                          |
| H5      | Win, round 14, 3 stars                                                     | Defeat, out of time (round 21)                                            |
| H6      | Win, round 13, 3 stars                                                     | Defeat, out of time (round 23)                                            |

The danger moments, and what each mission's hand play changed:

- **H1.** Rallied Skeletons (Attack 3) killed the Fighter trained on the
  town's center twice; the Knight's Overrun killed five of the dead in round 6. The Undead lost Fortification (Zombies dug in on Field Defenses made a
  slog) and the Banshees (two wails hit the whole front).
- **H2.** Every lone unit on Mudford's center was mobbed (Gang Up 2 to 3,
  10 to 12 damage); the Goblins refill each fort's center every turn.
  Explosives' Breach and a Chivalry Knight's Overrun chain won. The Redcaps
  lost Brutes on Field Defenses (they turtled), Bomb Chuckers and Rocket
  Carts, Wolf Riders, and the farming and hunting trees (Kingsgate reached
  level 5 and a Troll by round 4); the garrison is one unit per fort.
- **H3.** Five attempts. The beasts' Triceratops chained kills out of a
  hold zone that touched the camp, and Redcap riders ran the escort down
  once the beasts were dead: the Redcaps lost Scouting and the Chuckers,
  the Rookery moved south-east, the beasts got stronger and a smaller zone,
  and the player sees more of the board. The winning route waits three
  rounds while the Redcaps and the beasts fight, then goes along the south
  edge two tiles clear of the wood and north up the far side.
- **H4.** Nine attempts. The Lodge's Hexers and the Whitefang's Snow Hunters
  shot Mr. Pettigrew off the walls; the Lodge summoned Imps at its chapel
  for five rounds instead of coming; the enemies took six villages round
  the fort and trained from them. Now: 12 rounds (the saga's 16 fell every
  time), waves within two or three tiles of the walls (round 5 the Lodge,
  6 and 9 the Whitefang, 7 the Marquis's relief column), Hollow Mill as a
  second place to train, no villages near the fort, no enemy ranged units,
  3 Favour, and a fort with three Farms (a fourth Farm and a Workshop make
  it level 5 and send a Juggernaut in round 1). An Imp went Unbound when
  its Summoner died and killed an Initiate: the hint's lesson.
- **H5.** With the Redcap fleet anchored in the channel, two Dreadnoughts
  shelled Saltmarsh flat in round 1. The fleet now rides on the open sea
  east of the Redcaps' shore; the Normal AI keeps it there for some rounds
  and then brings the Golden Goose round the south cape into the channel.
  The Redcaps then took three villages, cashed the channel's Pearls, built
  Farms and Workshops, grew five towns and two Trolls, and launched a Fire
  Raft from every port each turn: the Redcaps' shore keeps no villages, the
  Anchorage no Pearls, the Redcaps learn only the sea, and the second
  Dreadnought is gone (the Goose sails with two Fire Rafts and a Diving
  Barrel). The winning line: Seamanship, Submersibles and Navigation (the
  deep water needs it), a Submarine a turn, a Fire Raft killed a turn at
  the Anchorage's Shipyard, and three torpedoes (10, 12 and 3, unanswered)
  when the Goose came within reach. A damaged Submarine sent scouting alone
  was rammed; a Fire Raft's Kaboom and the Goose's broadside sank another.
  The clock came down from the saga's 22 rounds (star 18) to 20 (star 16).
- **H6.** With Drill the Redcaps researched Engineering, and Workshops and
  Mines raised Gallows Toll from level 3 to 6 in seven rounds, two Trolls
  on its gate: the Redcaps learn nothing. With an Orc Brute on the Hall's
  gate, two Knights' Overrun chains took the Hall in round 10: a Troll holds
  it now, and the Redcaps' garrison stands on the gates (one-tile zones).
  The winning line: Explosives in round 1; an Explorer monument, Boom and
  Fruit make Fort Steele level 5 and a Juggernaut in round 3; Knights take
  Gallows and Weir Toll by Overrun chains that kill the gate's neighbours
  first and end on the gate; Catapults and Knights break the Raptors and
  the Lodge's Horrors (a Horror kills a Knight in one blow; killing its
  channellers frees it); four Knights on four sides kill the Troll (10,
  12, 13 and 5) and the fourth stands on the Hall. Five Knights were lost.
  The clock came down from the saga's 26 rounds (star 22) to 22 (star 18).

### 15.3 Deviations and follow-ups

- **Curiosities, since `pulp_wars-hmyk.14`.** Built at first without the
  saga's Sea Serpent (H5) and lightning tower (H6), which waited for the
  round-3 curiosities and mission curiosities (section 10.9); both are in
  now (section 15.4), each mission at revision 2.
- **E6 and E7 were not built.** A tag on a ship works as it is (the Golden
  Goose is a tagged Dreadnought afloat). Directives still lead land units
  only; moving the fleet off the channel gave H5 its opening rounds, and
  the Normal AI brings the Goose in on its own.
- **Resource edits.** H5 removes the Pearls by the Anchorage and H6 the
  Game under Kessler Hall; the natural-map test now allows an edit that
  removes a resource beside those that remove a village or a chest.
- **H2's autopilot wins** (round 12, 3 stars): step 2 of 6 is allowed to
  fall to plain play.
- **H4's second star is hard**: Mr. Pettigrew died in the last enemy
  phase of the only winning run.

### 15.4 The Sea Serpent and the Tesla Tower (`pulp_wars-hmyk.14`)

Mission curiosities (section 10.9) put the saga's two curiosities on the
boards; each mission went to revision 2 and was played again, a
thoughtful run with `play-text` and the scripted autopilot.

- **H5, the Sea Serpent.** Its home is the deep water north of the
  narrows (the generator would never put it there: 4 from Saltmarsh and
  from a village). The briefing ends "Mind the old serpent in the deep
  water: it has no politics." Thoughtful run: **win, round 15, 3 stars**
  (Seamanship r1; workshop, Boom and Treasury made Saltmarsh level 5 by
  r4; Submersibles r4, Navigation r5, a Submarine most turns, three land
  units disbanded for slots; a Fire Raft killed a turn at the Anchorage's
  Shipyard; the Golden Goose came round the south cape and three
  torpedoes, 10, 12 and 3, sank her in round 15, her death blast taking 7
  from each Submarine beside her). The Serpent never bit: it wandered to
  the channel's north mouth by round 8 and kept near it, beside the Port's
  exit and the Troll on the Anchorage's shore, so a Submarine had to sail
  off (the Troll walked away too); it kept the pearl water closed and
  pushed the fleet south, towards the Goose's road. Danger: a damaged
  Submarine sent scouting round the south cape was rammed by a raft (r12),
  and an escort raft's Kaboom took 5 off the Patrol Boat (r8). Autopilot:
  **defeat, out of time (round 21)**, as at revision 1. The mission needs
  no re-tuning.
- **H6, the Tesla Tower.** It stands on the Hall's lawn two tiles before
  the gate (the saga's "three tiles" would put the gate out of the zap's
  reach, which the saga's tactic needs), inside the Hall's land,
  where the generator could never place it. The briefing gains "a lightning
  tower on the lawn", and the Troll hint became "The tower's zap and three
  lances at once fell the Troll." Thoughtful run: **win, round 12, 3
  stars** (Explosives r1; Explorer monument, Boom and fruit made Fort
  Steele level 5 and a Juggernaut by r2; Overrun chains ending on the
  gates took Gallows Toll (r3, captured r4) and Weir Toll (r5, captured
  r6); the Raptors and the Lodge's channellers fell to Knight chains in r7
  and r8, and the Horror, Unbound, killed the Lodge's Idol Bearer before
  Knights finished it in r9; Greyfriars, captured in r10, eliminated the
  Lodge; a veteran Knight held the tower from
  r8; in r11 one zap and three Knights, 4, 11, 12 and 13, killed the Troll
  and the third stood on the Hall). The tower is the player's lever: the
  Normal AI never stood on it in eight rounds (the Redcaps' garrison is
  leashed to the gate, the beasts kept to its east), and a zap alone does
  nothing to a Troll that heals 4 a turn on its walls; with the assault it
  replaces the fourth lance. One Knight was lost (the Triceratops, r7).
  Autopilot: **defeat, out of time (round 23)**, as at revision 1. The
  clock and stars stay.

## 16. The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`)

The second faction campaign: six missions, `UNDEAD_1` to `UNDEAD_6`
(`src/engine/v7/missions/undead-*.ts`), in the chapter
`src/campaign/chapter-undead.ts`, which the campaign map's Undead plate
opens (tier 1, open from the start). The briefings and closings are the
saga bible's ([SAGA.md](SAGA.md) sections 2.2 and 3.2), trimmed to the
card. Each mission was hand played through `play-text` (the thoughtful
run, using the hint) and run by the scripted autopilot of section 15; from
mission 3 on the autopilot must lose or miss the clock. Every mission
seats you as the Undead with no choice, so the chapter's starting
factions are empty: it unlocks nothing for the prologue's faction choices.

### 16.1 The missions

| Mission                   | Board (generator, seed) | Match seed | Seats                                                | Format and clock                                    | Stars                           |
| ------------------------- | ----------------------- | ---------- | ---------------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| U1 Resurrection Men       | Dry Land 11, seed 13    | 20261301   | Undead; Humans                                       | Conquest of the Company's two camps                 | by round 12; the Marquis lives  |
| U2 The Drowned Library    | Lakes 14, seed 22       | 20261302   | Undead; Goblins                                      | Hold Saint Ashes and keep Crane alive for 12 rounds | no city lost; the Marquis lives |
| U3 The Ship of the Dead   | Continents 16, seed 15  | 20261303   | Undead; Martians                                     | Capture Chapel Rock by round 22                     | by round 18; no city lost       |
| U4 The Hall of the Thanes | Dry Land 16, seed 3     | 20261304   | Undead; Dwarves                                      | Escort Crane to the Summit Stair by round 22        | by round 18; no city lost       |
| U5 Bedtime Reading        | Lakes 16, seed 9        | 20261305   | Undead; Cult and Humans (teamed)                     | Kill Brother Mallory by round 20                    | by round 16; no city lost       |
| U6 The Founder's Tomb     | Dry Land 16, seed 23    | 20261306   | Undead and Humans (ally); Cult and Ice Folk (teamed) | Hold the Rangers' Lodge for 16 rounds               | Crane lives; no city lost       |

### 16.2 Hand play

| Mission | Thoughtful run                                                  | Autopilot                                                        |
| ------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| U1      | Win, round 10, 3 stars (sixth attempt)                          | Unfinished at round 41 (no clock; allowed at step 1)             |
| U2      | Win (held), round 12, 3 stars (eleventh attempt)                | Defeat, round 4 (Crane killed)                                   |
| U3      | Win, round 12, 3 stars (seventh attempt)                        | Defeat, out of time (round 23)                                   |
| U4      | Win, round 16, 3 stars (seventh attempt)                        | Defeat, round 8 (Crane killed)                                   |
| U5      | Win, round 15, 3 stars (first run after the autopilot won)      | Defeat, out of time (round 21); before hardening, a round-18 win |
| U6      | Win (held), round 16, 2 stars (Cinderwick lost; fourth attempt) | Defeat, round 15 (the Lodge fell)                                |

On the final definitions, after the merge with mission curiosities, each
winning run was replayed from its command log (your moves, the Normal AI
replying) and ended exactly as above, and each autopilot result held.

The danger moments, and what each mission's hand play changed:

- **U1.** Two Fighters hit the Vampire for 6 and 7 in round 2 (13 to 3
  HP); every half-raised (5 HP) Skeleton left in reach died. The Company
  grew a Fighter a turn from each camp and its Marksmen shot every raised
  Skeleton on the fields: it now learns nothing, the camps hold no
  Marksmen, there are seven old Graves (the first Raise gives four
  Skeletons), and the chest by Grimsditch Camp (a free Raider) is gone.
  The winning line: Raise in round 1, then a rallied Vampire kill, Feast's
  second strike and Bat Escape back every other turn; the camps fell in
  rounds 8 and 10.
- **U2.** Ten attempts. On an island reached only by the causeway the
  goblins sat at its foot for five rounds, so they have Engineering and
  climb the peaks; their camps reached level 4 in four rounds on Mines, a
  Workshop and monuments, a reward Wolf Rider a level, so the camps are
  level 1 with no ore, no growth technologies, no Wolf Riders and Bomb
  Chuckers only in the waves; Crane twice died to a Chucker's splash in the
  last enemy phase, so the clock is 12 rounds (the saga's 14) and the
  round-9 Chucker is gone. The winning line: Wail and Terror, then Zombies
  and Skeletons strike without reply; Infect turned eight goblins into
  Zombies; Raise refilled the ring every turn; Pestilence and Blast
  Mountain on the mob; the Vampire hid on the west shore from round 4 for
  its star. Kabooms killed three raised units at once, twice. The
  goblins then got Fortification from the start (the Industry rule: a
  seat with Drill and a defender owns it; they had learned it in round 4
  of every run and trained a Brute a turn), and the mission was played
  once more: the same line won, the Vampire feeding on the Brutes once
  Wails had terrified them; a goblin stood on Ashwater Landing's center
  in round 11 until a Zombie killed it and Infect raised it as one of
  yours, and in round 12 the Vampire filled the last gap beside Crane.
- **U3.** Gravesend over its unit limit trained nothing, so it has
  Planning and Lychgate a port. With naval technology the Martians built a
  Port on every water tile round the Rock and rode the monuments to level
  4; a starting Hover Cruiser, then one beside a Shield Projector (Force
  Field, Shield 4), sank the whole fleet: they learn no naval technology
  and no Fortification, and the waves are two Skimmers (round 5) and a
  Cruiser and a Skimmer (round 9). The winning line: Navigation and the
  Pearls in round 1, Sunken Galleys from round 3 (a torpedo a turn sinks a
  Skimmer unanswered, and Drowned Crews raise it as a Ghost Ship), the Sea
  Dog monument and Boom took Gravesend to level 5, and its Abomination
  sailed to the Rock, swallowed the Shield Projector and infected the next
  Grunt into a Zombie, which captured. The Necromancer landed on the Rock
  was shot dead from the Rig.
- **U4.** Mines and Workshops took Cairn Hall to level 4 in two rounds, a
  reward Gyrocopter a level: the wardens have no Engineering or growth
  technologies (they never climb the peaks; you may). Three Gyrocopters
  bombed Crane and the Steam Cannon (12 and a knock-back) took the Vampire
  to 1 HP in one shot; a Clockwork Gunner killed Crane; the wardens took
  the stair (then a village) as a fourth hall. Now the stair is bare
  ground, Cairn Hall stands on the road, the garrison holds ten, and a
  patrol on the peaks (a Hammerer and a Gunner) keeps the goat path from
  being free. The winning line: Engineering in round 1, up the western
  woods and over the peaks, the Vampire killing both Gyrocopters and the
  patrol in Feast chains and Bat-Escaping out of the Cannon's reach.
- **U5.** With a level 1 chapel and a smaller ring the autopilot won by
  round 18; Greyhood is level 2, four Initiates and four Bearers hold the
  strip, and the Lodge has 8 Favour. The toll-men fell by round 7 to Wail,
  the Vampire's Feast chains and a Wail on the fort's last Guard; the
  captured fort's free monument made Lantern Hill level 3. Blast Mountain
  turned the peak at the causeway's foot into grass. A Horror hit the
  Vampire for 13 on that peak (6 HP left, pinned by its zone of control:
  only an attack and Bat Escape got it out). Wails do nothing to daemons.
  A Lich's halved shots still spread Plague through the Lodge; with their
  channellers dead a Horror and the Imps came unbound, killed both of the
  chapel's Bearers and then Mallory himself.
- **U6.** Four attempts. Ashby Camp was over its unit limit with no second
  town, and the Vampire sent east alone died to a Horror and an Imp
  (13 and 5): Ashby is level 3 (two fields cleared), the Undead have
  Planning, Cinderwick is a second town on the eastern slope, and three old
  Graves lie by the camp. With the Whitefang camp beside Ashby and
  `RUSH`ing, the clan went for the camp and lost it in round 4: the camp is
  in the north-western corner and the clan assaults the Lodge. A Sled's
  bolas froze the Vampire two rounds running on the western front and the
  Yetis killed it. The winning line: Liches do the work (splash and Plague
  killed a Sled, a Mammoth and three Yetis; a Lich shoots into the Rangers'
  land over the walls), the Vampire only finishes wounded units and
  escapes home, and killing Initiates and a Bearer unbinds the Lodge's
  daemons. A Horror killed both Liches trained at Cinderwick and an
  Initiate took the town (round 8); the Lodge's center stood empty for a
  moment twice with Imps beside it.

### 16.3 Deviations and follow-ups

- **U2 holds 12 rounds**, not the bible's 14, and its goblins climb the
  peaks (Engineering) instead of keeping to the causeway.
- **U4's summit stair is bare ground**, not a village, and Cairn Hall
  stands on the tunnel road; a patrol walks the peaks.
- **U3's Martians** learn no naval technology and no Fortification (no
  Force Fields); their fleet is fixed plus two waves.
- **U5 and U6 name the Cult's town Greyhood** in both missions; U6's
  Undead have a second town, Cinderwick, that the bible does not name.
- **The chapter's starting factions are empty** (every Undead mission
  seats a fixed faction), so the Undead are still unlocked for the
  prologue's choices in its fourth mission.
- **No mission curiosities.** Mission curiosities (E1, section 10.9,
  `pulp_wars-hmyk.14`) landed while this campaign was built; none of the
  six missions needs one, and they were tuned without. U3's bay could
  hold a Sea Serpent in a later revision.

## 17. The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`)

The third faction campaign: six missions, `DINOSAUR_1` to `DINOSAUR_6`
(`src/engine/v7/missions/dinosaur-*.ts`), in the chapter
`src/campaign/chapter-dinosaurs.ts`, which the campaign map's Dinosaur
plate opens (tier 2: locked until the Humans and the Undead are finished;
the cheat of section 14.5 opens it). The briefings and closings are the
saga bible's ([SAGA.md](SAGA.md) sections 2.5 and 3.5), trimmed to the
card. Each mission was hand played through `play-text` (the thoughtful
run, using the hint) and run by the scripted autopilot of section 15; from
mission 3 on the autopilot must lose or miss the clock. Every mission
seats you as the Dinosaurs with no choice, so the chapter's starting
factions are empty.

### 17.1 The missions

| Mission                        | Board (generator, seed) | Match seed | Seats                                                      | Format and clock                               | Stars                            |
| ------------------------------ | ----------------------- | ---------- | ---------------------------------------------------------- | ---------------------------------------------- | -------------------------------- |
| DN1 The Empty Nest             | Pangea 11, seed 16      | 20261401   | Dinosaurs; Humans                                          | Conquest of the two poacher camps              | by round 12; the Old Queen lives |
| DN2 Big Game                   | Pangea 14, seed 4       | 20261402   | Dinosaurs; Humans and Goblins (teamed)                     | Kill Major Thornbury by round 20               | by round 16; the Old Queen lives |
| DN3 The Sea Road               | Archipelago 16, seed 9  | 20261403   | Dinosaurs; Humans; the Sea Serpent (neutral)               | Bring the Old Queen to Big Top Bay by round 22 | by round 18; no city lost        |
| DN4 The Greatest Show on Earth | Pangea 16, seed 12      | 20261404   | Dinosaurs; Humans and Goblins (teamed)                     | Kill Baron Kessler by round 18                 | by round 14; the Old Queen lives |
| DN5 Through the Barrowlands    | Dry Land 16, seed 16    | 20261405   | Dinosaurs and Martians (ally); Undead and Goblins (teamed) | Bring the Old Queen to Mire's Edge by round 18 | by round 14; no city lost        |
| DN6 Old Blood                  | Lakes 16, seed 16       | 20261406   | Dinosaurs; Cult and Undead (teamed)                        | Capture Greyhood by round 18                   | by round 14; the Old Queen lives |

The Old Queen is a tagged T-Rex in every mission (an Alpha, three kills,
from DN5 on); Shaman Oona is tagged in DN1 and DN6.

### 17.2 Hand play

| Mission | Thoughtful run                                                    | Autopilot                                  |
| ------- | ----------------------------------------------------------------- | ------------------------------------------ |
| DN1     | Win, round 10, 3 stars (third layout, first run on it)            | Defeat, round 16 (eliminated)              |
| DN2     | Win, round 12, 2 stars (the Queen died in round 11; third layout) | Defeat, round 17 (eliminated)              |
| DN3     | Win, round 16, 3 stars (sixth layout)                             | Defeat, round 5 (the Queen sunk, embarked) |
| DN4     | Win, round 9, 3 stars (fourth layout)                             | Defeat, out of time (round 19)             |
| DN5     | Win, round 7, 3 stars (third layout; two defeats on the second)   | Defeat, round 1 (the Queen killed)         |
| DN6     | Win, round 7, 3 stars (third layout; one run lost the Queen)      | Defeat, round 16 (eliminated)              |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held.

What the hand play taught first: **an Alpha T-Rex eats whatever has little
HP.** Her Rampage has no limit and every kill advances her, so against
Fighters, Goblins, Skeletons, Initiates or a 10-HP Captain she walks
through a line and into the target in one turn (DN1's first layout fell to
the Queen alone in round 4, DN2's in round 4, DN4's to the autopilot in
round 3, DN6's first Lodge by round 5). Every mission therefore puts
something she cannot one-shot or cannot reach between her and the
objective: Guards on Field Defenses, rifles that shoot her to pieces,
peaks, the sea, the bite of the dead, a daemon. The danger moments, and
what each mission's hand play changed:

- **DN1.** With three Fighters and a rifle per camp the Queen ate both
  camps alone by round 4; with two rifles, a Guard and two Fighters per
  camp she walked to the village in round 3, took 19 in one enemy phase and
  died in round 4. Now each camp keeps a Guard and a rifle (seven
  poachers), and you start with a Raptor and Land Grants (one free slot
  for an Egg). The winning line: Hunting and a Raptor Egg in round 1, the
  Queen kept in the jungle by the nest, War Drums and the Queen on the
  village's Guard with a Raptor finishing it (Big), the Explorer monument
  for a Scouts Raptor, two Fighters eaten by the nest (Big, a full heal),
  the Queen an Alpha in round 7, Raptors on Tusker's Landing's rifle and
  Fighter, both camps in round 10. Oona died on the nest to two Fighters;
  every Raptor left in a rifle's reach died (Defense 1).
- **DN2.** With Thornbury on the ridge over the lodge and Engineering
  yours, the Queen fed on the Redcaps and rampaged into him in round 4.
  Now he stands on the highest peak of the ridge, every tile beside him a
  Mountain, leashed to it (`GUARD` on his tile alone, garrison 1), and
  your seat may not research Engineering, Armoury or Wallbreaker: only
  range reaches him. A Guard on the peak before him, Redcap packs in
  rounds 5 and 9. The winning line: a Spitter Egg a turn (eight laid),
  Land Grants in round 6, the Redcaps fed to the Spitters and the Queen
  (Alpha in round 5), Caveman Pack Hunt after Spitter shots on two Guards,
  Thornbury shot from the forest below the ridge (12 to 6, then dead, in
  rounds 11 and 12). Danger: the level-3 lodge sent a Fighter a turn over
  the peaks; Wolf Rider pairs (Gang Up) killed a Raptor and a Big Spitter;
  the Queen, rampaging through the Redcaps to the western shore at 14 HP,
  had no way back and died in round 11 (Raider, rifle and Fighter).
- **DN3.** Fernmaw was over its unit limit (the Queen fills two slots), so
  the Shaman is homed to the Crater and you have Land Grants; the Dugout's
  Ram needs Horned Prows (Seamanship), which you own. With Hunting, Drill
  and the naval tree the Baron's Gullrock and Wharf grew two levels a turn
  (fish, pearls, Ports, Workshops), took Big Top Bay as a town and launched
  a Patrol Boat a turn; with Sailing and Navigation alone they still did,
  and ferried Guards across to Fernmaw. Now the Baron learns nothing: his
  Battleship, Submarine and two Patrol Boats keep to the shallows (no
  Navigation), the Battleship's guns covering the whole northern lane;
  Gullrock has no pearls, fruit or fish; landing parties come ashore in
  rounds 4, 8 and 12. The winning line: a Dugout's two-tile run sank a
  Patrol Boat at once (10) and the Queen bit the other off the shore;
  Plesiosaurs researched in round 1; Gullrock's islet is joined to the
  island by a diagonal step, so the Queen took it, a Port built there let
  her embark at once (round 13), the Battleship hit her embarked for 17,
  two Plesiosaurs torpedoed the Battleship (12) and sank the Submarine
  (12) in round 15, and she sailed into Big Top Bay in round 16. The
  Battleship sank a staged Dugout and a Plesiosaur that had torpedoed it
  (it is seen once it fires). The Sea Serpent kept to the south.
- **DN4.** With the big top in the middle of the dunes and two Fighters in
  its ring, the autopilot's Queen ran through a Fighter into the 10-HP
  Baron in round 3; with eight Guards and a 5 x 5 zone the garrison walked
  to the side facing you and left the far side empty; with the zone the
  3 x 3 ring (full: nothing in it moves) the autopilot wore one Guard down
  over three turns and won in round 4. Now the big top stands under the
  northern peaks with half its ring on the Mountains (the Baron's men have
  Engineering), the Redcaps have Orc Brutes and packs in rounds 4 and 8,
  and the clock is 18 rounds (the saga's 20). The winning line: Wallbreaker
  in round 1 (Breach, the two-tile run), the Queen an Alpha on the eastern
  Redcaps by round 4 and Sawdust Camp taken, a Triceratops's two-tile
  Charge! killing a rifle (11), and in round 9 a Spitter's Acid (6) and
  the Queen's Breach (11) killed the ring's southern Guard, her Rampage
  carried her in and the Baron died. Kessler's War Drums on two rifles took
  a Triceratops from 20 to 2 in one turn; a Brute and a Goblin (Gang Up)
  killed a Triceratops left beside them.
- **DN5.** With small barrows and three-unit waves the Redcaps fell in
  round 5 and the dead hardly came south. With twelve Graves (the first
  Raise put eight Skeletons on the fields), Ghouls and waves of four the
  Queen died twice: rampaging fourteen kills deep into the barrow fields
  alone (round 6), and two tiles from Mire's Edge to a Ghoul's Carrion (11
  on the bitten Queen, round 10) after two Triceratops and a Raptor had
  been bitten and risen as Zombies. Now there are eight Graves and no
  Ghouls, and the clock is 18 rounds (the saga's 22). The winning line:
  Spitters and a Raptor killed the Brutes in the gaps, the Queen went
  through the ford on Overrun and took Redcap Ford (the Redcaps' capital,
  round 5), climbed onto the ridge, rampaged over two Skeletons and a Ghoul
  into Barrow Hill out of the dead's reach (round 6) and walked to Mire's
  Edge in round 7. The Unquiet took Mire's Edge as a town in round 4; the
  escort still counts beside it.
- **DN6.** With two Summoners and 12 Favour the Lodge never reached 20 and
  the Queen ate it by round 5; with three Summoners, Hexers and 16 Favour
  the Great Summoning began in round 2 and the Herald stood on the eastern
  shore from round 3, but with the whole Lodge leashed to the island it
  never left it and the autopilot won in round 14. Now eight hold the
  island and every other unit, the daemons included, assaults Mire's Edge
  (`others: ASSAULT`), and the clock is 18 rounds (the saga's 22). One
  thoughtful run killed two of the Herald's channellers in round 5: it went
  Unbound, ate the Lodge's last Summoner, Initiate and Bearer and then the
  Queen on Greyhood's centre (26 in one blow). The winning line, replayed
  from round 4: the Queen held back a turn out of the Herald's reach, then
  killed the Imp's Summoner and the Summoner on Greyhood's centre while
  three channellers still held the Herald (it stayed bound and still), and
  captured Greyhood in round 7.

### 17.3 Deviations and follow-ups

- **Clocks.** DN4, DN5 and DN6 run 18 rounds (star 14), not the saga's 20
  and 22 (stars 16 and 18): every thoughtful win came by round 9.
- **DN2 handicaps your seat.** It may not research Engineering, Armoury or
  Wallbreaker (section 10.2 says the human seat is never handicapped in the
  built missions; the tar peaks are the mission's lesson: only Acid reaches
  the Major).
- **DN3's Baron learns nothing** and his fleet keeps to the shallows; the
  saga's "fort on a mid-sea islet" is joined to the island by a diagonal
  step. **E6** needed nothing: an escorted unit keeps its ID embarked, and
  the Queen arrived afloat within a tile of Big Top Bay. **E7** was not
  built.
- **DN4's big top** stands under the northern peaks, not in the middle of
  the dunes; the Redcaps' second camp is on the western shore. **E4** (a
  story line on a wave) was not built: a hint announces the freed beasts.
- **DN5's ford** is a gap in a ridge of peaks (a Dry Land board has no
  river); the Unquiet have no Ghouls.
- **DN6's bound Herald idles.** Under `GUARD` with `others: ASSAULT` the
  Herald, once called, stayed on its summoning tile for every round of
  every run, bound, and attacked only after it went Unbound (follow-up:
  the Normal AI's play of a bound Herald under a directive).
- **The Old Queen** is an Alpha from DN5 on (the `kills` of a mission
  unit), as the story has grown her.

## 18. The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`)

The second tier-2 faction campaign, after the Dinosaurs (section 17): six missions, `MARTIAN_1` to
`MARTIAN_6` (`src/engine/v7/missions/martian-*.ts`), in the chapter
`src/campaign/chapter-martians.ts`, which the campaign map's Martian plate
opens once the Humans and the Undead campaigns are done (or with the
testing cheat, section 14.5). The briefings and closings are the saga
bible's ([SAGA.md](SAGA.md) sections 2.6 and 3.6), trimmed to the card.
Each mission was hand played through `play-text` (the thoughtful run,
using the hint) and run by the scripted autopilot of section 15; from
mission 3 on the autopilot must lose or miss the clock, and missions 1 and
2 were meant to fall to a first thoughtful attempt. Every mission seats
you as the Martians with no choice, so the chapter's starting factions are
empty.

### 18.1 The missions

| Mission                        | Board (generator, seed) | Match seed | Seats                                                | Format and clock                                 | Stars                         |
| ------------------------------ | ----------------------- | ---------- | ---------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| M1 Strangers in a Strange Land | Lakes 11, seed 16       | 20261601   | Martians; Goblins                                    | Conquest of the two scrap camps                  | by round 12; Quaxx lives      |
| M2 Abduction at Millford       | Pangea 14, seed 13      | 20261602   | Martians; Humans                                     | Capture Millford by round 18                     | by round 15; no city lost     |
| M3 The Glass Ship              | Archipelago 16, seed 22 | 20261603   | Martians; Dinosaurs                                  | Escort the Core-Walker to Ray Hollow by round 16 | by round 12; no city lost     |
| M4 Red Dust                    | Lakes 16, seed 13       | 20261604   | Martians and Candy (ally); Undead                    | Hold Red Dust for 16 rounds                      | no city lost; Sugarcrest held |
| M5 The Orrery at Candlewick    | Pangea 16, seed 23      | 20261605   | Martians; Cult and Goblins (teamed)                  | Capture Candlewick by round 18                   | by round 14; no city lost     |
| M6 Starfall over Red Dust      | Lakes 16, seed 13       | 20261606   | Martians and Humans (ally); Cult and Undead (teamed) | Kill the three Stargazers by round 16            | by round 12; no city lost     |

### 18.2 Hand play

| Mission | Thoughtful run                                                 | Autopilot                                            |
| ------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| M1      | Win, round 9, 3 stars (second attempt)                         | Unfinished at round 41 (no clock; allowed at step 1) |
| M2      | Win, round 12, 3 stars (first attempt on the final definition) | Defeat, out of time (round 19)                       |
| M3      | Win, round 5, 3 stars (eighth attempt)                         | Defeat, round 3 (the Core-Walker torpedoed)          |
| M4      | Win (held), round 16, 3 stars (third attempt)                  | Defeat, round 11 (Red Dust lost)                     |
| M5      | Win, round 13, 3 stars (third attempt)                         | Defeat, out of time (round 19)                       |
| M6      | Win, round 8, 3 stars (eighth attempt)                         | Defeat, out of time (round 17)                       |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held.

The danger moments, and what each mission's hand play changed:

- **M1.** With the southern village free the goblins took it as a third,
  hidden camp, and a Saucer landed alone on Scrapheap's empty centre died
  to two goblins ganging up: the village is gone. The winning line: the
  Explorer monument in round 1 (level 3, a free Saucer), three villages by
  round 3, then a Grunt beamed from Saucer Field to the eastern strip each
  turn (a beamed Grunt kills a 6-HP goblin outright); Scrapheap fell in
  round 6, Tinhat Camp in round 9. A goblin Kaboom killed a Grunt and hurt
  three more units.
- **M2.** Millford's militia with Drill built Workshops by its Mines, a
  chest by Ploughby gave it a Raider, and five towns trained a unit a turn
  (eleven by round 5): the militia learns nothing, and two villages and
  the chest are gone. The winning line: a Saucer beamed Quaxx beside the
  Fighter on a village the militia had taken, Mind Control, and the
  controlled Fighter captured it; a Shield Projector beamed beside the
  Brain (Shield 4, the field holds); Psychic Command; in round 11 a Saucer
  on the mountain beside Millford beamed Quaxx into the pocket beside the
  centre, he took the Fighter on it, and in round 12 that Fighter captured
  Millford. A controlled Fighter that advanced after a kill into
  Haybridge's ring died; both Saucers were mobbed and one was lost.
- **M3.** Eight attempts. A Saucer beams a unit, Tripods too, from beside
  any town of yours, so with the Crater a Martian town (or a beasts' town
  by the ford, once taken) the core crossed the strait in one Beam Down
  and won in round 4: the Crater is a camp of units, the beasts' southern
  town is gone and Ray Hollow stands at the eastern end of the shallow
  ford. The Triceratops and the Spitter killed the Tripod in round 2, so
  the camp has Force Fields and a Shield Projector with every unit
  starting beside it; with two Plesiosaurs a Tripod afloat in the ford
  (11 HP, Shield 4) died to one torpedo (15), so the second comes as a wave
  in round 7. The winning line: the column kept beside the Projector, the
  Raptor and the Caveman by the ford killed, and in round 4 the Tripod
  waded the ford's two steps out of the Plesiosaur's reach; in round 5 it
  landed and a Saucer beamed it beside Ray Hollow. The clock was then cut
  from 20 to 16.
- **M4.** With growth technologies the Unquiet's camps reached levels 3
  and 4 in two rounds and trained Liches, and three Liches (range 3,
  splash, and Plague that goes through Shields) wiped out the Projector's
  cluster by round 6: the dead learn only Drill and Fortification (and so
  Pestilence). Sent to `ASSAULT` Red Dust they dug in round their camps
  on Field Defenses and never came, so they `RUSH`, and the round-9 wave
  comes at Sugarcrest. The winning line: every Lich killed the turn it came
  in reach by two Grunts beamed beside it (rounds 2, 6, 11 and 14), the
  beamed units brought home by the next Beam Down when they lived. Both
  first Saucers, a replacement, the Tripod, three Grunts and a Ray Gunner
  were lost; a Grunt held Red Dust's centre beside the Projector
  throughout, a Zombie stood beside it in round 14, and the Vampire's
  Breach hit it twice through the walls.
- **M5.** The first run won in round 8 on its first attempt: a Brain beamed
  into the gap beside the centre took the Idol Bearer on it, and the
  controlled idol awestruck every cultist beside it, so they could attack
  only it; the hall's ring is now full and the Redcaps stronger. With a
  Summoner and 10 Favour the Lodge called three Horrors and an Imp by round
  5: there is no Summoner and the Lodge has 6 Favour. The winning line: the
  Redcaps ground down in rounds 2 to 6, Redcap Hollow taken as a forward
  town in round 8, a Hexer beside the centre killed and the Brain beamed
  into its tile; the Lodge killed the controlled Bearer and a second Bearer
  took the centre, the ring was picked off, a fresh Initiate stood on the
  centre, and in round 12 the Brain (just out of a marked star's area: it
  would have died to the 9) took it; it captured in round 13. Hexers frogged
  the Brain twice and the Brain ended at 3 HP.
- **M6.** Eight attempts. With the camps on the villages beside Red Dust two
  shots killed a Stargazer in round 1, and with lone Stargazers on the hills
  beamed Grunts and a charging Saucer won by round 8: each Stargazer stands
  in a full circle (an Idol Bearer, a Hexer, Initiates), the Bearers stand
  off the centres (a level-up reward pushed one off) and with their
  Stargazers hold two tiles each (a wider leash let a Bearer wander), the
  Martians have no Raiding (no Charge), the Lodge learns nothing and the
  clock is 16. The winning line still won in round 8: Grunts beamed beside
  Owl Hill's idol were awestruck and killed it, then the Mothership the
  Stargazer; a Grunt and a Ray Gunner beamed at Cairn Top hit for 4 and 3
  under the idol; Quaxx beamed beside Hob's Knoll's idol and took it, and
  its circle could attack only it while it hit its Stargazer for 5. Hexers
  frogged a Saucer and Quaxx; the Tripod held Red Dust's centre against the
  dead in rounds 7 and 8.

### 18.3 Deviations and follow-ups

- **M3's Crater is a camp of units**, not a Martian town, the bible's
  beasts' town by the ford (Fangwood) is not built (its hunting party is),
  and Ray Hollow stands at the eastern end of the ford. One Plesiosaur
  starts in the strait and a second arrives in round 7; the clock is 16,
  not the bible's 20.
- **M4's dead `RUSH`** instead of assaulting Red Dust, and learn no growth
  technologies; their round-9 wave goes for Sugarcrest.
- **M5's clock is 18** (the bible's 22) and the Lodge has no Summoner;
  **M6's is 16** (the bible's 22), the Martians there have no Raiding, and
  Candlewick is a Martian level-1 town.
- **M6 is still won in round 8 by expert play** (beamed Grunts and a
  mind-controlled idol); the clock and the star hold the autopilot, not a
  thoughtful player. A later pass may want a harder finale.
- **Names.** The text harness deals random names to captured villages; in
  one M6 run an Undead-captured village was dealt "Candlewick", a name a
  mission also uses. A presentation follow-up, not a rules one.
- **No mission-system extensions.** None of the six missions needed
  mission curiosities (E1); the escort tag was checked through embarking
  and Beam Down (E6: the escort is lost when sunk afloat and arrives after
  a Beam Down).

## 19. The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`)

The third tier-2 faction campaign, after the Martians (section 18): six
missions, `GOBLIN_1` to `GOBLIN_6` (`src/engine/v7/missions/goblin-*.ts`),
in the chapter `src/campaign/chapter-goblins.ts`, which the campaign map's
Goblin plate opens once the Humans and the Undead campaigns are done (or
with the testing cheat, section 14.5). The briefings and closings are the
saga bible's ([SAGA.md](SAGA.md) sections 2.3 and 3.3), trimmed to the
card. Each mission was hand played through `play-text` (the thoughtful
run, using the hint) and run by the scripted autopilot of section 15; from
mission 3 on the autopilot must lose or miss the clock, and missions 1 and
2 were meant to fall to a first thoughtful attempt. Every mission seats
you as the Goblins with no choice, so the chapter's starting factions are
empty.

### 19.1 The missions

| Mission                       | Board (generator, seed) | Match seed | Seats                                                | Format and clock                                | Stars                      |
| ----------------------------- | ----------------------- | ---------- | ---------------------------------------------------- | ----------------------------------------------- | -------------------------- |
| G1 Grubnak Gets Bored         | Dry Land 11, seed 1     | 20261501   | Goblins; Humans                                      | Conquest of Fort Bullion and its toll           | by round 12; Snikkit lives |
| G2 Boats for Bones            | Pangea 14, seed 6       | 20261502   | Goblins; Undead                                      | Capture Wreckers' Cove by round 18              | by round 15; no city lost  |
| G3 Here Be Monsters           | Archipelago 16, seed 2  | 20261503   | Goblins; Dinosaurs                                   | Kill Snapjaw by round 16                        | by round 12; no city lost  |
| G4 The Inside Job             | Archipelago 16, seed 74 | 20261504   | Goblins; Humans; Dinosaurs (rivals)                  | Capture Port Kessler by round 20 (the Moon Gun) | by round 16; Snikkit lives |
| G5 Everybody Wants the Tongue | Archipelago 16, seed 10 | 20261505   | Goblins; Humans; Martians (rivals)                   | Hold Smuggler's Rock for 16 rounds              | no city lost; Mogga lives  |
| G6 The Big Getaway            | Pangea 20, seed 5       | 20261506   | Goblins and Dwarves (ally); Cult and Undead (teamed) | Escort the Getaway to the Ironbraid Gate by 20  | by round 16; no city lost  |

### 19.2 Hand play

| Mission | Thoughtful run                                                          | Autopilot                            |
| ------- | ----------------------------------------------------------------------- | ------------------------------------ |
| G1      | Win, round 11, 3 stars (first attempt)                                  | Defeat, round 12                     |
| G2      | Win, round 11, 3 stars (fourth attempt, first on the final board)       | Defeat, round 11                     |
| G3      | Win, round 6, 3 stars (fifth attempt, first on the final definition)    | Defeat, out of time (round 17)       |
| G4      | Win, round 12, 3 stars (seventh attempt, first on the final definition) | Defeat, round 8 (the tribes)         |
| G5      | Win (held), round 16, 2 stars: Mogga died (first attempt)               | Defeat, round 13 (the Rock lost)     |
| G6      | Win, round 14, 3 stars (first attempt)                                  | Defeat, round 3 (the Getaway killed) |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held.

The danger moments, and what each mission's hand play changed:

- **G1.** The winning line: Hunting in round 1, a monument and a Militia,
  the toll taken in round 5 by the Ogre after a Gang Up kill; the fort's
  Marksmen killed a goblin a turn and sniped Grubnak to 6 HP in round 3; a
  goblin's Kaboom at the fort hit the Marksman and the walled Guard for 6
  each, two Bomb Chuckers killed both by splash in round 9, and a gang kill
  and the capture followed in rounds 10 and 11. The crew has Land Grants.
- **G2.** Three boards before the final one. With the camp on the northern
  headland, ten rows of coast road from the cove, the dead made a conga
  line of it; with a second Unquiet town (the bible's wreck camp, the
  Hulks) beside the cove, both towns put a fresh Skeleton on their centres
  every turn and the crew never reached the cove's centre in time. The
  final board: the camp on the western downs six rows from the cove, the
  Unquiet with one town and no Leadership or Land Grants. The winning
  line: Gathering and three fruit in round 1 (level 3, a Wolf Rider), two
  villages by round 4, Orc Brutes; a Bomb Chucker killed two Skeletons from
  two tiles and splashed Mogga for 3 and 1 (the lesson); bomb and Mogga
  killed the Necromancer in round 6; Skeletons killed lone goblins; chucker
  bombs on the cove's Zombie, a three-way gang (+3) kill and the capture in
  round 11.
- **G3.** With the rafts starting on the strait beside Snapjaw and a
  second Plesiosaur, both rafts were eaten in two rounds (a port gives no
  cover) and Snapjaw became an Alpha; a submerged Plesiosaur is seen only
  on explored water, so out of sight it is never found. With three rafts
  and two Diving Barrels Snapjaw came south and died in round 4, and the
  autopilot won in round 3. The final definition: two Fire Rafts and one
  Diving Barrel at Tarry Wharf, Submersibles known, the whole sea revealed,
  and the tribes' Dugouts with Horned Prows sailing with a young
  Plesiosaur. The winning line: Pearls and the Explorer monument in round
  1, a barrel a turn and a raft; a Dugout's ram (10) killed a barrel in
  each of rounds 3 and 4 after one torpedoed the other Dugout; a raft's
  ram (8) and a raft's Kaboom (5 each on the Dugout and the young
  Plesiosaur) cleared the escort; Snapjaw ate the rammed raft (an Alpha,
  20 HP) and two fresh barrels torpedoed it (12 and 8) in round 6.
- **G4.** Seven attempts on two boards. The first board (Archipelago 16,
  seed 9, two seats, one flooded tile to make the neck) won in round 15,
  but the natural-map rule wants a board's capitals to match its seats, so
  the mission moved to seed 74, three seats, whose north-western island
  has a headland on a one-tile neck with no edit. With the tribes' Tarpit
  in the middle of the island and nothing else, the crew took it in round
  2 and the tribes were gone; with Tarpit training Raptors the Ogre died in
  round 3. The tribes now have Fernhollow, their home, on the north-eastern
  island, and their hunters land in two waves of two (rounds 5 and 10):
  waves of three in rounds 4, 8 and 12 retook Tarpit and swamped the crew.
  With free slots Port Kessler put a fresh Fighter on its centre whenever
  it emptied, and with 60 Coins and no free slot the crew could not answer:
  the garrison is six, one over the port's slots, and the crew has Land
  Grants. Snikkit starts on Egg Rock: beside the Bomb Chucker its death
  blast left him at 1 HP in round 1. The winning line: Explosives in round
  1 (the Brutes' Breach); bomb, Goblin, Ogre and Brute killed Tarpit's
  Raptor and Cavemen and Tarpit fell in round 3 (Militia from a blasted
  mountain, Stockpile); bombs killed the neck's Guard and both Fighters;
  the Ogre killed the first wave; bombs splashed the crew's own Chuckers
  twice; the first Brute on the neck died to the Marksman, a Fighter and
  the Guard in round 9; the port trained a Fighter, then a Guard, on its
  emptied centre; in round 10 a bomb and the second Brute (gang +2) killed
  the Guard on the neck, a splash killed the centre's Fighter, and the
  Moon Gun fired the Ogre beside the centre; in round 11 the Brute's Breach
  (10) and the Ogre (Breach, gang +1) killed the centre's new Guard and
  the Ogre advanced onto it; captured in round 12.
- **G5.** The winning line: a Workshop, a farm and Boom made the Rock level
  4 by round 3 and Snagrot fell; the first Brain (round 5) died to Mogga
  and a gang (+2) in round 6; a Chucker's death blast took 5 from two
  goblins; the second Brain (round 9) died to a bomb and Mogga; the Ray
  Gunner (heat ray 8 to 9) and a beamed-down Grunt killed Mogga in the
  open in round 11 and a Brute off its Field Defense; the loyalists'
  landing parties (seven men) never charged the walls but shot the
  centre's Brute for 2 to 3 a turn; the raft crews (round 12) held the
  Rock to the end with Brutes on Field Defenses.
- **G6.** The winning line: the Lodge's others came at the Hall in
  Familiars, Imps and Initiates; the Ogre and the Warboss killed a Familiar
  and an Imp (the Ogre died in round 5); two Scrap Buggies in round 6; in
  round 8 a Buggy's Overrun chain killed two Initiates and a Hexer and
  ended beside Wick Chapel's Idol (frogged that night); its Kaboom hit five
  units for 5 in round 10; a Bomb Chucker shot the pass's Hexer down
  (rounds 11 and 12); the second Buggy's Overrun killed the new Hexer on
  Hood Camp's centre (round 13; Hood Camp captured in round 14); the
  Unquiet's Necromancers and Ghouls raided the Hall's road from round 11;
  the Getaway waited at the Hall, crossed the open middle in round 12,
  stopped once in the forest and ran the pass to two tiles from the Gate
  in round 14. The clock was then cut from the bible's 24 (star 20) to 20
  (star 16).

### 19.3 Deviations and follow-ups

- **G2 has one Unquiet town** (the bible's wreck camp is not built) and the
  camp stands on the western downs, not the headland.
- **G3: Snapjaw does not keep to its strait (E7 is not built).** The crew
  sees the whole sea instead, so it can find a submerged Plesiosaur; the
  tribes have no Submersibles. The crew starts with Fire Rafts and a Diving
  Barrel and knows Submersibles; the clock is 16 and the star 12 (the
  bible's 20 and 16). The tagged sea-beast with kills as the target (E6)
  works: Snapjaw is a Plesiosaur with two kills.
- **G4's tribes** have a home town on another island and two hunters'
  waves; Egg Rock is the crew's camp on the eastern shore of the Baron's
  island, not a separate rock. The Moon Gun (E1) stands four tiles from
  the walls, as the bible has it.
- **G5's waves:** the loyalists land in rounds 3, 7 and 11, the Martians'
  Brains in rounds 5 and 9, the raft crews in round 12; no story line for
  the crews' wave (E4 is optional and not built). The thoughtful run won
  two stars; Mogga's star is the hard one.
- **G6's clock is 20** and its star 16 (the bible's 24 and 20).
- **Extensions.** E1 (the Moon Gun) was already built; E7 was not needed
  (G3's full reveal stands in for it).

## 20. The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`)

The fourth tier-2 faction campaign, after the Goblins (section 19): six
missions, `DWARF_1` to `DWARF_6` (`src/engine/v7/missions/dwarf-*.ts`), in
the chapter `src/campaign/chapter-dwarves.ts`, which the campaign map's
Dwarf plate opens once the Humans and the Undead campaigns are done (or
with the testing cheat, section 14.5). The briefings and closings are the
saga bible's ([SAGA.md](SAGA.md) sections 2.4 and 3.4), trimmed to the
card. Each mission was hand played through `play-text` (the thoughtful
run, using the hints) and run by the scripted autopilot of section 15; from
mission 3 on the autopilot must lose or miss the clock, and missions 1 and
2 were meant to fall to a first thoughtful attempt. Every mission seats
you as the Dwarves with no choice, so the chapter's starting factions are
empty.

### 20.1 The missions

| Mission                  | Board (generator, seats, seed)  | Match seed | Seats                                               | Format and clock                                  | Stars                        |
| ------------------------ | ------------------------------- | ---------- | --------------------------------------------------- | ------------------------------------------------- | ---------------------------- |
| D1 Tremors               | Dry Land 11, 2 seats, seed 7    | 20261501   | Dwarves; Undead                                     | Hold Copperstep for 12 rounds                     | no city lost; Tobbin lives   |
| D2 The Iron Peak         | Dry Land 14, 2 seats, seed 7    | 20261502   | Dwarves; Ice Folk                                   | Capture the clan's three camps by round 20        | by round 16; no city lost    |
| D3 Down the Bottomless   | Dry Land 16, 3 seats, seed 30   | 20261503   | Dwarves; Undead and Cult (teamed)                   | Escort the Thane to the Bell's Rest by round 20   | by round 16; Tobbin lives    |
| D4 Saucers over the Hold | Dry Land 16, 2 seats, seed 1933 | 20261504   | Dwarves; Martians                                   | Kill the Mothership by round 18                   | by round 14; no city lost    |
| D5 Iron on the Water     | Continents 16, 3 seats, seed 6  | 20261505   | Dwarves; Cult and Goblins (teamed)                  | Escort the Anvil to the River Landing by round 22 | by round 18; no city lost    |
| D6 The Great Seal        | Dry Land 16, 4 seats, seed 2208 | 20261506   | Dwarves and Humans (ally); Undead and Cult (teamed) | Capture the Deep Gate by round 20                 | by round 16; the Thane lives |

### 20.2 Hand play

| Mission | Thoughtful run                                                          | Autopilot                          |
| ------- | ----------------------------------------------------------------------- | ---------------------------------- |
| D1      | Win (held), 12 rounds, 3 stars (first attempt on the final definition)  | Defeat, round 9 (Copperstep fell)  |
| D2      | Win, round 13, 3 stars (first attempt on the final definition)          | Defeat, out of time (round 21)     |
| D3      | Win, round 14, 3 stars (second attempt)                                 | Defeat, round 8 (the Thane killed) |
| D4      | Win, round 10, 3 stars (second attempt on the final board)              | Defeat, out of time (round 19)     |
| D5      | Win, round 17, 3 stars (seventh attempt, first on the final definition) | Defeat, round 21 (the Anvil sunk)  |
| D6      | Win, round 8, 3 stars (second attempt on the final board)               | Defeat, out of time (round 21)     |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held.

The danger moments, and what each mission's hand play changed:

- **D1.** The Grey Shift with Drill and Fortification built Field
  Defenses on their mine mouths and never came; with no technologies under
  `RUSH` they stood off out of the Gunners' reach. Under `ASSAULT` on
  Copperstep, mostly Zombies (Bones would shrug off the Gunners), they
  come. The winning line: the Explorer monument (level 4, Boom), a
  Workshop at Slagheap (a Militia Hammerer), Gunners assembled and trained
  and shooting twice standing still, Tobbin repairing every turn and
  curing bites. In rounds 10 to 12 the Necromancer's wave inspired two
  Zombies that killed a dug-in Hammerer and raised it as a Zombie, which
  bit Tobbin on the walls.
- **D2.** With Crafting, Mining and Deep Winter the clan's camps grew to
  level 3 and walled themselves by round 3, a frozen Hammerer was
  shattered and a Steam Mole killed by Cold Blood after meleeing a Musk Ox.
  The clan now learns nothing: Yetis on the peaks, Snow Hunters on the
  grass, Gnash a Mammoth. The winning line: the Explorer monument and
  fruit (level 4, Boom), Mining in round 1; a Mole and its rider
  tunnelled under the peaks onto Tusk Camp, the Hammerer killed the Musk
  Ox but was frozen and shattered by a Yeti and the Mole killed by a Snow
  Hunter; a second Mole took Tusk Camp in round 5; the Gunners shot
  Gnash's Mammoth from range (it had swept a Mole) and the Musk Oxen (no
  frostbite from range); both other camps fell in round 13.
- **D3.** With every unit homed to a full Gate no Gunner could be
  assembled, and with 4 Favour the Lodge's Horror stood over the gallery
  from round 1: abandoned in round 6. The Gate is now level 4 with a free
  slot, Lanternhall holds the Moles, and the Lodge has the usual 2 Favour.
  The winning line: eight Gunners by round 11, Moles and riders tunnelled
  to the gallery's mouth, Engineers cured bites (two Hammerers and a Mole
  still died bitten and rose); the Imp went Unbound and killed its own
  Summoner and Bearer; a Gyrocopter bombed the Bearer; a Mole took the
  diggers' cave in round 9 (the Lodge eliminated); the last Mole tunnelled
  out of the gallery's final tile so the Thane could step in beside the
  Bell's Rest in round 14. The clock was then cut from 24 (star 20) to 20
  (star 16).
- **D4.** On the first board the Mothership flew ahead of its escort and
  was shot down at the walls in round 4; at the far side of the board
  nothing could reach it; with Ray Gunners and Force Fields the landing
  party shot every dwarf in the open. It now hangs over its landing field
  with a garrison (`GUARD`), the rest go for the Hold, and waves beam down
  in rounds 5 and 9. On the final board no Martian on foot can cross the
  peaks and the Rift into the dwarves' valley, so the fight is all at the
  field: with four Grunts there a Brass Titan beside the field was shot
  from 29 HP to nothing in one enemy phase, and two Gyrocopters staged two
  tiles from the Mothership were shot down; the field now keeps two. The
  winning line: the Explorer monument and two Game made the Hold level 5
  in round 1 (a Brass Titan), a Forge made Copperstep level 5 in round 3
  (the second); the Titans' Siege Hammer killed the wave's Grunts and
  Saucers one blow each; in round 7 a Titan stood beside the field and was
  shot from 32 to 12, but the Mothership spent its Shield striking it; in
  round 8 the Siege Hammer took the Mothership from 15 to 3 and the Titan
  died; three Gyrocopters bombed the Grunts and the Projector and landed
  round the Mothership, which moved two tiles and shot one down; in round
  10 a Bomb Run (7: the Shield's 4, then 3) brought it down.
- **D5.** With Anvil Bay beside the Redcaps' reed camp the Anvil sank the
  camp's Goblin and both rafts in round 1. With the Lodge's fleet at sea
  south of the marsh it either wandered off or camped at the Landing and
  sank the Anvil in one enemy phase; with Leadership and Harbours Greyhood
  grew to level 3 and summoned; with five ships it earned the Sea Dog
  monument; with a Shipyard it launched a second Galleon. The Lodge now
  has four ships stationed in the strait off Greyhood and nothing else to
  learn; the dwarves have Diving Bells and Anvil Bay keeps a free berth.
  The winning line: pearls and the Sea Dog monument (Anvil Bay level 5);
  a Diving Bell a turn; the Anvil held out of the Galleon's reach and shot
  whatever came within 3; the Kraken was rammed and finished; the Galleon
  (promoted to 30 HP) shot the Anvil to 2 HP in round 9 and died to
  torpedoes in round 10; the Anvil sailed east inside a ring of five ships
  (no water tile beside it free, so nothing could ram it) and arrived in
  round 17.
- **D6.** Six layouts on the first board. With 17 Coins in hand on round 1
  Copperstep made a Brass Titan at once; with three Liches and 8 Favour
  the Lodge summoned an Imp a turn and a Horror, and the Titan beside the
  Gate was shot to pieces in round 9; with two Liches a 33 HP Titan beside
  the Gate died in one enemy phase (two Liches, the Wight, two Imps) and
  the plague's splash killed the Engineer beside it. The winning line on
  the final board: the Explorer monument (one Gyrocopter flight) made
  Copperstep level 5 in round 2 (a Titan), a treasure chest paid 5,
  Blasting Charges in round 2, a Steam Mole for the Muster monument; a Tank
  and a blast took the Lodge's Horror apart; a Gyrocopter bombed an Imp and
  landed out of reach; in round 6 a Tank took back Vesperine (the village
  the Lodge had settled), the Gyrocopter flew beside the Lich and two Blast
  Mountains (6 Coins) killed it and wore the Gate's Wight, two Zombies, a
  Skeleton and the Necromancer, and two more killed a Skeleton; a Tank and the Titan killed the Wight outside and the Titan
  stood beside the Gate; in round 7 it killed the Gate's Wight and walked
  in (28 HP); the second Lich shot it for 8 and a Zombie for 5; captured in
  round 8. Both Steam Tanks and the Gyrocopter died (a Tank rose as a
  Zombie). The clock was then cut from 24 (star 20) to 20 (star 16).

### 20.3 Deviations and follow-ups

- **The natural-map seat rule.** D4 and D6 were first built and played on
  boards generated for three seats (Dry Land 16, seeds 17 and 25); the
  natural-maps test wants a board generated for the mission's own seat
  count, so both moved to new boards found by searching for the same
  geometry (D4: seed 1933, two seats; D6: seed 2208, four seats), were
  retuned and hand played again.
- **D1's Grey Shift assaults Copperstep** (the bible's `RUSH` left them
  standing off) and knows nothing; the three mine mouths are small
  Unquiet towns.
- **D2's clan learns nothing**; Gnash's Camp is level 1.
- **D3: the Thane walks.** A Steam Mole's rider is a Hammerer, so the
  Thane goes down the gallery on foot behind Moles and riders that tunnel
  past the dead; Mining and Steam Tanks are forbidden to every seat so
  nobody climbs the peaks. The diggers' cave is the one Terrain edit. The
  clock is 20 and the star 16 (the bible's 24 and 20).
- **D4's Mothership guards its field** with two Grunts and a Shield
  Projector instead of assaulting the Hold; its clock is 18 and its star
  14 (the bible's 20 and 16). The Martians' ground troops cannot reach the
  dwarves' cities on this board.
- **D5: E6 and E7.** The escort of a tagged ship needs nothing new (the
  `ESCORT` objective takes the tagged Ironclad). E7 (a navy that keeps to
  its reach) is not built: the Lodge's four ships start on station in the
  strait off Greyhood, out of the Landing's reach, and the AI's ships
  ignore directives.
- **D6** has two Liches (one beside the Gate, one behind it), a Lodge with
  4 Favour, and the clock 20 and star 16 (the bible's 24 and 20). The
  hint names the key tool, Blasting Charges.
- **Extensions.** None was needed; E1 was already built and unused here.
- **Observations for balance work (not changed here).** Blast Mountain (3
  Coins, 5 to every unit round a mountain) decides D6 and is strong
  wherever an enemy garrison stands among mountains; a `GUARD` garrison
  never leaves its zone, so it can be worn down from outside its reach;
  Martian Grunts cannot climb, so a Martian assault on a mountain hold
  stalls at the foot.

## 21. The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`)

The first tier-3 faction campaign: six missions, `CANDY_1` to `CANDY_6`
(`src/engine/v7/missions/candy-*.ts`), in the chapter
`src/campaign/chapter-candy.ts`, which the campaign map's Candy plate
opens once the four middle campaigns are done (or with the testing cheat,
section 14.5). The briefings and closings are the saga bible's
([SAGA.md](SAGA.md) sections 2.8 and 3.8), trimmed to the card. Each
mission was hand played through `play-text` (the thoughtful run, using the
hints) and run by the scripted autopilot of section 15; from mission 3 on
the autopilot must lose or miss the clock, and missions 1 and 2 were meant
to fall to a first thoughtful attempt. Every mission seats you as the
Candy with no choice, so the chapter's starting factions are empty.

### 21.1 The missions

| Mission                  | Board (generator, seats, seed) | Match seed | Seats                                                  | Format and clock                                  | Stars                            |
| ------------------------ | ------------------------------ | ---------- | ------------------------------------------------------ | ------------------------------------------------- | -------------------------------- |
| C1 Sweet Tooth           | Lakes 11, 2 seats, seed 1      | 20261801   | Candy; Goblins                                         | Conquest of Muncher's Camp and Spoon Hill         | by round 12; Praline lives       |
| C2 The Royal Recipe Book | Lakes 14, 2 seats, seed 1      | 20261802   | Candy; Dinosaurs                                       | Capture Riftwatch by round 20                     | by round 16; Madame Nougat lives |
| C3 The Commissioner      | Lakes 16, 2 seats, seed 8      | 20261803   | Candy; Humans                                          | Sink the Sovereign by round 18                    | by round 12; no city lost        |
| C4 Sour Notes            | Dry Land 14, 2 seats, seed 6   | 20261804   | Candy; Cult                                            | Capture the Wick Chapel by round 16               | by round 12; Praline lives       |
| C5 The Dream Door        | Continents 16, 2 seats, seed 4 | 20261805   | Candy; Undead                                          | Escort Praline to the Dreaming Palace by round 20 | by round 16; Madame Nougat lives |
| C6 Sweet Dreams          | Lakes 16, 4 seats, seed 13     | 20261806   | Candy and Martians (ally); Undead and Goblins (teamed) | Hold Sugarcrest for 18 rounds                     | Praline lives; no city lost      |

### 21.2 Hand play

| Mission | Thoughtful run                                                         | Autopilot                          |
| ------- | ---------------------------------------------------------------------- | ---------------------------------- |
| C1      | Win, round 14, 2 stars (first attempt on the final definition)         | Victory, round 23, 1 star          |
| C2      | Win, round 19, 2 stars (first attempt on the final definition)         | Defeat, round 16                   |
| C3      | Win, round 8, 3 stars (first attempt on the final definition)          | Defeat, out of time (round 23)     |
| C4      | Win, round 10, 3 stars (first attempt)                                 | Defeat, out of time (round 21)     |
| C5      | Win, round 14, 2 stars (second attempt on the final definition)        | Defeat, out of time (round 25)     |
| C6      | Win (held), 18 rounds, 2 stars (first attempt on the final definition) | Defeat, round 18 (Sugarcrest fell) |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held. The clocks of C3, C4 and C5 were then cut (the
saga's 22, 20 and 24 rounds); each replay still wins inside the new clock.

The danger moments, and what each mission's hand play changed:

- **C1.** With the raiders' camp across the lake in the north-east hills
  and three free villages, the march through the forests took until round
  13, the gang took the north-shore village and the hunt ran past round
  14; the gang under `RUSH` stood off the walls. With the second camp on
  the open north-west plain the kingdom fought two fronts and lone
  Troopers died to Gang Up (two goblins deal 9 each to a Marshmallow).
  Now the gang's two camps stand one above the other east of Gumdrop, the
  villages are gone, the gang storms Gumdrop (`ASSAULT`), a Marshmallow
  holds Gumdrop and Land Grants give each city a slot. The winning line: a
  Rushed Giant killed a goblin on round 3 (+1 Attack), a Gunner's
  Ricochet killed the Brute and wore the next, the Confectioner re-baked a
  Donut Racer and a Trooper from Crumbs (twice from under a goblin); the
  Giant took Muncher's Camp in round 7 and Spoon Hill in round 14, down to
  15 of 40 after one gang-up. Step 1 may fall to plain play; the
  autopilot won in round 23 with one star.
- **C2.** With the library at the far end of a one-tile pass behind the
  Rift, the column reached it in round 17, single file behind an
  Ankylosaurus. Riftwatch now stands at the pass's mouth under the crack.
  The winning line: round 2 a Rushed Trooper killed the wounded Raptor
  that had bounced off the Marshmallow, round 4 another killed the T-Rex
  Egg the turn before it hatched; the Nest fell in round 9 (Pie Splat, then
  a Racer and a Trooper with no strike-back); a Raptor fed the Marshmallow
  and a Racer grew to 16 HP; at Riftwatch the cavemen trained on the
  centre every turn and the Pies Splatted each; in round 19 the Rushed
  Confectioner Topped Up the Crashed Trooper on the centre so that it
  could capture. Two Marshmallows were re-baked.
- **C3.** Eight layouts. With three Tugs and Sugar Sails the Sovereign was
  rammed to 3 HP in round 2 and sunk; with one Tug and no Sugar Sails
  every boat the kingdom launched was shot on the AI's turn and a Patrol
  Boat Boarded the last; with a Pie Galleon to start it Splatted the
  Sovereign (15) and a Tug finished it in round 2; with Sugarcrest three
  tiles from the anchorage nothing could leave port alive. The Normal AI
  sails its flagship out at once, so the squadron is now leashed to the
  water off the fort (E7, section 2.5); with three Patrol Boats and two
  Submarines and a Port at the fort the Sovereign was promoted and healed
  whole on its third kill and the fort launched a Submarine every few
  rounds. Now the Crown has the Sovereign, one Patrol Boat and one
  Submarine, no Coins and no Port; Sugarcrest is on the northern shore,
  out of reach, Gumdrop under the guns. The winning line: Choco Subs and a
  Tug built at Sugarcrest, staged four tiles from the anchorage; when the
  Sovereign swung to the west end of it in round 8, two Rushed rams (10
  and 12), a torpedo through the screening Patrol Boat (10) and a third
  Rushed ram through the gap (3). A Trooper on Gumdrop's walls and a Tug
  launched at Gumdrop's port were shelled in earlier rounds.
- **C4.** First attempt. The Lodge summoned a Horror in round 1 (4 Favour)
  and a second in round 4, Imps every round or two; a Hexer frogged a
  Trooper. The winning line: the Rushed Giant (16) and a Gunner killed the
  first Horror in round 5; a Pie's Splat (8), a Gunner (6, Ricochet) and a
  Trooper (4, no strike-back) the second in round 6; the Marshmallow was
  Sacrificed beside the chapel; in round 8 the Rushed Giant killed the
  Idol Bearer on the chapel's centre (11) and stood there Crashed, and
  captured in round 10. No Boo! landed in the run; the hint stays for the
  player who stands in line. The clock was then cut from 20 (star 16) to
  16 (star 12).
- **C5.** With the far gate in the woods beside the Palace the Queen
  crossed in round 3 and stood two tiles from it in round 4. The far gate
  is now at the dream's northern end, six rows from the Palace, which the
  dead hold with a Zombie, a Lich, a Necromancer among old graves and a
  Skeleton (`GUARD`); a second Lich roams, and three waves rise round the
  dream. The first attempt on it was lost: the Queen crossed in round 3
  and walked south alone; Madame Nougat crossed to cure her bite and was
  killed in round 6; two Liches (9 each) and an inspired Zombie took the
  Queen from 40 to 10 in one enemy phase (round 7). The winning line: the
  Marshmallow, then the Rushed Giant through the gate in round 2 (the
  Giant killed the gate's watch and held the north); a Pie Launcher at
  Riftwatch shot across the strait and killed the roaming Lich (round 4);
  Nougat crossed in round 4 and Topped Up the Queen's bite (and was killed
  in round 7); the Giant took Grey Gumdrop in round 6, a place to train on
  the far side; Troopers and the Giant killed the dead that came north (a
  kill draws no bite); in rounds 12 to 14 two Pies came through, Splatted
  the Palace's Zombie (6) and the Rushed Giant killed it (12) and
  advanced beside the Palace. The clock was then cut from 24 (star 20) to
  20 (star 16).
- **C6.** With the waves at the Rift north of the lake the dead took Red
  Dust (the Martians fell in round 6) and Riftwatch and never came round
  the lake: a passive player and the autopilot held. The seam now splits
  along the western shore (waves beside Sugarcrest in rounds 5, 9, 13, 16
  and 17) and the horde brings goblins down the eastern road (rounds 7, 11
  and 15) and turns from Gumdrop on Sugarcrest itself in round 10; the
  autopilot still held until the kingdom started with no Coins (it trains
  a unit on the centre every turn). The winning line: the Explorer
  monument made Gumdrop level 3 (Walls) in round 1; a Workshop, a Mine, a
  Boom and two hunts made Sugarcrest level 5 by round 9 (a second
  Gingerbread Giant); Pie Launchers on both walls Splatted and killed
  whatever came within 3; Jawbreakers held the west flank (Toothache on
  every Skeleton that hit them) and were re-baked; in rounds 14 and 17 a
  Wolf Rider and an Orc Brute stood on Gumdrop's centre and were shot off
  it. Riftwatch fell in round 5, and the second Giant, the Jawbreakers, the
  Confectioner, both Pies, the Marshmallow and the Gunners died; Praline
  ended on 18 of 40.

### 21.3 Deviations and follow-ups

- **E7, directives for ships, is built** (section 2.5): `ships: true` on a
  `HOLD` or `GUARD`, AI only, used by C3. The other naval missions (H5,
  G3, D5) stationed their fleets instead and are unchanged.
- **Boards.** C3's island fort is one Terrain edit; C2's crack is three
  Rift tiles beside Riftwatch. C5 is a Continents board (the saga's Lakes
  20): two continents and a strait, the naval branch forbidden, so the
  Dimensional Gates (E1, section 10.9) are the only way across. C3 and C6
  remove more villages than ten (the natural-maps test now names them).
- **C1's gang storms Gumdrop** (the bible's `RUSH` stood off) from two
  camps east of it; the raiders' camp is Spoon Hill.
- **C3's kingdom** has Sugarcrest on the northern shore and Gumdrop under
  the guns (the bible puts both on the shore); its clock is 18 and its
  star 12 (the bible's 22 and 18).
- **C4's chapel** has no Walls (a level-2 town in the woods); the clock is
  16 and the star 12.
- **C5's dream** has Liches, graves and a `GUARD` on the Palace (the
  bible's `NORMAL`), and its clock is 20 and its star 16.
- **C6** adds goblin waves and a late turn of the horde on Sugarcrest, and
  moves the nightmares' waves from the Rift to the western shore beside
  Sugarcrest; the Martians' Red Dust falls early in every run (an ally
  that holds only its own land against the whole of the dead).
- **The campaign graph test** keeps Candy unbuilt in its fixture
  (`tests/fixtures/v7-campaign-graph.ts`), so it still tests a campaign
  that is "Coming soon".
- **Observations for balance work (not changed here).** Candy capacity
  is tight (a level-3 city holds four, a Giant two): Land Grants or a
  monument decide what can be trained. The Normal AI sails its flagship
  straight at the enemy's ports; a Battleship that kills three times is
  promoted and healed whole. An `ASSAULT` seat whose army starts behind a
  lake masses where it is and never comes round. Two Liches focus-fire a
  Giant from 40 to 10 in one turn.

## 22. The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`)

The second tier-3 faction campaign, after Candy (section 21): six
missions, `ICE_FOLK_1` to `ICE_FOLK_6` (`src/engine/v7/missions/ice-folk-*.ts`),
in the chapter `src/campaign/chapter-ice-folk.ts`, which the campaign
map's Ice Folk plate opens once the four middle campaigns are done (or with
the testing cheat, section 14.5). The briefings and closings are the saga
bible's ([SAGA.md](SAGA.md) sections 2.7 and 3.7), trimmed to the card.
Each mission was hand played through `play-text` (the thoughtful run,
using the hints) and run by the scripted autopilot of section 15; from
mission 3 on the autopilot must lose or miss the clock, and missions 1 and
2 were meant to fall to a first thoughtful attempt. Every mission seats
you as the Ice Folk with no choice, so the chapter's starting factions are
empty. Mother Rime (`RIME`) is the Ice Witch in every mission, and the
faction's signature, ice, carries the campaign: freezing first and
striking second (I1), a Frost Giant's smash (I2, I5), a road frozen across
a strait (I3), Musk Oxen whose Frostbite freezes their attackers (I4, I6).

### 22.1 The missions

| Mission                  | Board (generator, seats, seed)  | Match seed | Seats                                                 | Format and clock                            | Stars                     |
| ------------------------ | ------------------------------- | ---------- | ----------------------------------------------------- | ------------------------------------------- | ------------------------- |
| I1 The Warm Mountain     | Dry Land 11, 2 seats, seed 2    | 20261601   | Ice Folk; Goblins                                     | Conquest of the Stovepipe and Boiler Hole   | by round 12; Rime lives   |
| I2 Waking the Giants     | Dry Land 14, 2 seats, seed 12   | 20261602   | Ice Folk; Undead                                      | Kill the Frozen Abbot by round 20           | by round 15; no city lost |
| I3 The Frozen Strait     | Continents 16, 2 seats, seed 15 | 20261603   | Ice Folk; Dwarves                                     | Capture Anvil Bay by round 22               | by round 18; no city lost |
| I4 A Year Without Summer | Lakes 16, 3 seats, seed 3       | 20261604   | Ice Folk; Humans and Candy (teamed)                   | Hold Whitewater and Frostford for 16 rounds | no city lost; Rime lives  |
| I5 The Ember Lodge       | Dry Land 16, 3 seats, seed 5    | 20261605   | Ice Folk; Cult and Goblins (teamed)                   | Capture the Ember Lodge by round 22         | by round 18; no city lost |
| I6 The Winter Crown      | Dry Land 20, 4 seats, seed 1    | 20261606   | Ice Folk and Dwarves (ally); Cult and Undead (teamed) | Escort Rime to the Summit by round 20       | by round 16; no city lost |

### 22.2 Hand play

| Mission | Thoughtful run                                                                                    | Autopilot                      |
| ------- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| I1      | Win, round 10, 3 stars (second attempt on the final definition; the first won in round 14 with 2) | Defeat, round 14               |
| I2      | Win, round 12, 3 stars (first attempt)                                                            | Victory, round 14, 3 stars     |
| I3      | Win, round 11, 3 stars (fourth attempt, first on the final definition)                            | Defeat, out of time (round 23) |
| I4      | Win (held), 16 rounds, 1 star (third attempt, first on the final definition)                      | Defeat, round 6 (a town lost)  |
| I5      | Win, round 11, 3 stars (fifth attempt, first on the final definition)                             | Defeat, out of time (round 23) |
| I6      | Win, round 11, 3 stars (second attempt on the final definition)                                   | Defeat, out of time (round 21) |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held. I2's autopilot wins, which step 2 of 6 allows:
the Frost Giant arrives beside the tomb and walks to the Abbot by itself.

The danger moments, and what each mission's hand play changed:

- **I1.** With three villages in the valley and 3 Coins the gang settled
  each and trained a Goblin a turn; a Wolf Rider (Gang Up) killed both
  Sleds one hit each, and lone Yetis that advanced after a kill died to
  two Goblins or a Kaboom (6 to everything round the Goblin); a frozen
  Brute heals while idle. The villages are gone, the gang starts broke,
  and Rime has Deep Winter and a Musk Ox. The winning line: the Explorer
  monument (Scouts: a second Sled), Sled and Witch Frost Bolts froze
  Boiler Hole's centre Goblin and its neighbour, the Ox shattered the
  frozen one and stood on the centre (round 6); the Sleds froze the Wolf
  Rider, the Ox and a Hunter killed it; the Stovepipe's centre was frozen
  twice and killed (round 10).
- **I2.** The first definition held: Sled Frost Bolts froze the Abbot from
  two tiles; a bitten Sled died and rose as a Zombie, Cold Snap froze it
  and two Yetis shattered it; the Giant came in round 10, its Cold Aura
  froze the door Zombie and then the Abbot and two beside him, and it
  killed the Abbot in round 12.
- **I3.** With the Ironclad on the strait from round 1 it shot a Yeti a
  turn off the shore; with it as a wave in round 6 and every unoccupied
  tile cracked each turn the road became a tug of war and the shore
  Gunner killed the Witch; with Naval Engineering Anvil Bay's Shipyard
  launched its own Ironclad, which shot the road from its dock (a hostile
  dock never freezes). Now Icebound is known, the dwarves build no
  Ironclads or Diving Bells, keep one Gunner, and their Ironclad comes
  home in round 12. The winning line: the Yetis froze the shallows and
  icebound the Bell, the Witch walked onto the ice (her ring freezes every
  tile round her), Glacier (thick ice) in round 5, Yetis held the road and
  killed the embarked Hammerer and Engineer (embarked units don't strike
  back); Brittle in round 7, the Sled froze the gate's Hammerer each turn
  and a Yeti shattered it with Breach (round 10); captured in round 11.
- **I4.** With Chivalry and the southern villages the Wardens trained a
  Knight a turn; Oxen on Frostford's centre froze every Knight that struck
  them, but a Knight's Overrun chain killed a Sled, the Witch and two
  Hunters in the open. Without Chivalry and with a wall of Musk Oxen both
  enemies stood off for six rounds. Now the southern villages stay gone,
  Chivalry is back, the Wardens `ASSAULT` Whitewater round the west shore
  and the sweets Frostford, and each sends two waves. The winning line:
  the Explorer monument at Frostford, Land Grants and Musk Oxen on every
  front; everything that struck an Ox was frozen, then Hunters (Cold
  Blood) and Rockfall killed or Oxen shattered it; a Knight's Overrun
  killed a Yeti and both Sleds in round 11; Icemoor (not protected) fell
  in round 15, and Rime died to a last Overrun in the final enemy phase:
  held, 1 star.
- **I5.** With a level-4 Lodge and four Mines it reached level 5 in round 2
  and raised two Things in the Cellar; capped at level 3 but with Crafting
  and the game round it, it still grew a level a round; with 6 Favour the
  two Summoners called a Horror nearly every round and the Giant could not
  advance onto the Lodge's centre before the clock. Now the Lodge knows no
  Crafting or Engineering, its game is removed, it has 2 Favour, and the
  camp is level 4 with Boom so a Workshop and two harvests make it level 5
  in round 1 (the Giant). The winning line: three villages by round 4; the
  Giant stepped onto a peak beside three Imps (Cold Aura froze five) and
  killed one while an Ox, a Yeti and a Hunter finished the rest; the Giant
  killed a Summoner, smashed the door Bearer (shards froze three more);
  the Lodge trained an Initiate on its centre each turn, the Giant's Aura
  froze it and a Yeti shattered it and stood on the centre; Behold and a
  Hexer's Ribbit blocked the capture once; captured in round 11.
- **I6.** An Initiate beside the summit settled the village there as a
  cult town in round 1; it now starts outside the summit's reach. With
  Engineering and a village on the road Rime walked over the peaks and won
  in round 9: too easy for a finale. Now Engineering is not known at the
  start, the road's village is gone, the Lodge has 4 Favour and an ambush
  (an Initiate and a Hexer) by the summit, the Unquiet climb out in rounds
  4, 8 and 12, and the clock is 20 (star 16). Rime then died in round 6 to
  an Imp that strode over the peak beside her road. The winning line: the
  Sled threw its bolas at the Horror every round (frozen, it never acted);
  an Ox set the charge that blasted the peak on the road flat (Blast
  Mountain); Yetis on the peaks beside her blocked the Imps and killed
  them; Engineering bought in round 6; a second Sled froze the second
  Horror; Rime walked inside a box of Mammoth, Oxen and Yetis, a Yeti's
  Rockfall from a peak killed the summit's Initiate, and she stepped onto
  the summit in round 11. Two Yetis died.

### 22.3 Deviations and follow-ups

- **I1's gang starts broke** (0 Coins) with no valley villages; Rime has
  Deep Winter and a Musk Ox from the start.
- **I2's Abbot guards the tomb** (`GUARD`, garrison 4, the rest `RUSH`).
  The Frost Giant is a player wave in round 10 (`JUGGERNAUT`); E4 (a story
  line on the wave) is not built, and the first hint announces the giant.
- **I3's board is turned**: the strait runs north and south, Coldharbour
  on the western shore facing Anvil Bay. Icebound is known from the start
  (the bible's Rime and Pack Ice); the dwarves may not research Naval
  Engineering or Submersibles, keep one Steam Launch and one Diving Bell,
  and their Ironclad is a wave in round 12.
- **I4 has a third town**, Icemoor, which is not protected (losing it
  costs the star); the Wardens `ASSAULT` Whitewater (the bible's `RUSH`)
  and both enemies send waves (Candy in rounds 4 and 8, the Wardens in 5
  and 10). Seven villages south of the line are gone.
- **I5's Lodge is level 3** (the bible's 4) without a Gibbering Mass on the
  doorstep (daemons cannot be starting units; its Summoners call Imps and
  Horrors), knows no Crafting or Engineering, and its tile's game is
  removed (two Resource edits). The camp is level 4 with Boom, so the
  Frost Giant comes in round 1 to a player who builds a Workshop.
- **I6** keeps Engineering out of the starting technologies (it can be
  researched), has a clock of 20 and a star of 16 (the bible's 24 and
  20), and Unquiet waves in rounds 4, 8 and 12 (the bible's 6, 10 and 14);
  sixteen village edits (the natural-maps test names it).
- **Extensions.** None was needed or built.
- **Observations for balance work (not changed here).** A Sled's bolas
  each turn takes a Horror (or any one unit) out of the fight indefinitely;
  a wall of Musk Oxen makes the Normal AI stand off entirely (I4's second
  attempt); a Yeti's Rockfall from a peak hits two tiles away with no
  answer; a city at level 5 gives a Frost Giant that decides any fight it
  reaches, which is why I5's camp starts one level short.

## 23. The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`)

The last tier-3 faction campaign and the saga's finale: six missions,
`CULT_1` to `CULT_6` (`src/engine/v7/missions/cult-*.ts`), in the chapter
`src/campaign/chapter-cult.ts` (chapter 9), which the campaign map's Cult
plate ("The Long Night", subtitle "The finale") opens once the four middle
campaigns are done (or with the testing cheat, section 14.5). The
briefings are the minutes of the Lodge's meetings and, with the closings,
the saga bible's ([SAGA.md](SAGA.md) sections 2.9 and 3.9), trimmed to the
card; the last closing is the saga's ending and the chapter's outro its
epilogue. Each mission was hand played through `play-text` (the
thoughtful run, using the hints) and run by the scripted autopilot of
section 15; from mission 3 on the autopilot must lose, and missions 1 and
2 were meant to fall to a first thoughtful attempt. Every mission seats
you as the Cult with no choice, so the chapter's starting factions are
empty. Mr. Pettigrew (`PETTIGREW`) is an Initiate taking the minutes in
CU1 and a Summoner from CU2 on; the faction's signature, daemons that are
only as strong as the robed men channelling them, carries the campaign:
an Imp and a Familiar's swap (CU1), Horrors and a Hexer's frog against
walls (CU2), the Kraken and Tentacles round an escorted Galleon (CU3),
Gibbering Masses on the doorstep (CU4), a Stargazer's star (CU5), and the
Great Summoning of the Herald (CU6).

The prologue's outro (`src/campaign/chapter-1.ts`) no longer says "To be
continued": it points at the saga's campaigns, the Humans and the Undead
open, and the Long Night at the end.

### 23.1 The missions

| Mission                         | Board (generator, seats, seed)  | Match seed | Seats                                                | Format and clock                                 | Stars                         |
| ------------------------------- | ------------------------------- | ---------- | ---------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| CU1 Minutes of the Last Meeting | Dry Land 11, 2 seats, seed 3    | 20261901   | Cult; Humans                                         | Kill Sergeant Hobb by round 10                   | by round 8; Pettigrew lives   |
| CU2 One Wrong Note              | Dry Land 14, 2 seats, seed 16   | 20261902   | Cult; Undead                                         | Capture Cinderfield by round 18                  | by round 15; no city lost     |
| CU3 Old Blood                   | Archipelago 16, 3 seats, seed 2 | 20261903   | Cult; Dinosaurs and Martians (teamed)                | Escort the Galleon to Lamplight Cove by round 16 | by round 12; no city lost     |
| CU4 The Inspector Calls         | Dry Land 16, 3 seats, seed 3    | 20261904   | Cult; Dwarves and Goblins (teamed)                   | Hold the Seal-works for 14 rounds                | no city lost; Pettigrew lives |
| CU5 Thaw                        | Dry Land 16, 4 seats, seed 8    | 20261905   | Cult and Goblins (ally); Ice Folk and Candy (teamed) | Kill Mother Rime by round 20                     | by round 16; Vole lives       |
| CU6 The Long Night              | Dry Land 20, 4 seats, seed 1    | 20261906   | Cult; Dwarves, Humans and Undead (teamed)            | Capture the Deep Gate by round 20                | by round 14; Pettigrew lives  |

### 23.2 Hand play

| Mission | Thoughtful run                                                          | Autopilot                          |
| ------- | ----------------------------------------------------------------------- | ---------------------------------- |
| CU1     | Win, round 2, 3 stars (first attempt on the final definition)           | Victory, round 7, 3 stars          |
| CU2     | Win, round 13, 3 stars (first attempt)                                  | Defeat, round 7                    |
| CU3     | Win, round 15, 2 stars (fourth attempt, first on the final definition)  | Defeat, round 4 (the Galleon sunk) |
| CU4     | Win (held), 14 rounds, 2 stars (fourth attempt, first on the final one) | Defeat, round 7                    |
| CU5     | Win, round 11, 3 stars (seventh attempt, first on the final definition) | Defeat, round 14                   |
| CU6     | Win, round 8, 3 stars (fifth attempt, first on the final definition)    | Defeat, round 8                    |

On the final definitions each winning run was replayed from its command
log (your moves, the Normal AI replying) and ended exactly as above, and
each autopilot result held. CU1's autopilot wins, which step 1 of 6
allows: its Imp and Familiar find Hobb by themselves.

The danger moments, and what each mission's hand play changed:

- **CU1.** With 4 Favour a Horror summoned in round 1 one-shot Hobb in
  round 3, too quick even for the first step; the Lodge now has 2 Favour
  and Hobb rides further off. A Ranger that walked into Hobb's zone took
  his place as its garrison of one and Hobb left the road; the extra
  Ranger now stands outside the zone. The winning line: the Explorer
  monument (Scouts: a second Familiar) and an Imp in round 1; in round 2
  a Familiar swapped Hobb into the middle of the Lodge, and the Hexer, the
  Familiar and the Imp killed him.
- **CU2.** The first definition held. A fortified Zombie killed the first
  Horror; Horrors and an Imp's Swarm took Barrow Camp in rounds 4 to 6; a
  Horror whose channeller was out of range broke loose and killed an
  Initiate; the Hexer's Ribbit frogged the walled Zombie on Cinderfield
  (Defense 0.5, no walls) and two Horrors killed it; the Horror that
  advanced onto the centre broke loose too (no channeller within 3), and
  the next Horror stood on the empty centre: captured in round 13.
- **CU3.** With a War Raft in the lane from round 1 its splash killed the
  Gondola; with two Krakens their torpedoes cleared the sea by round 3;
  with Seamanship a Dugout rammed the Galleon to a third of its hull and
  boarded it, and a captured escort does not end the mission (a
  follow-up). Now one Kraken, three Plesiosaurs, the War Raft as a wave in
  round 4, and the tribes without Seamanship or Submersibles (no Board, no
  ram, no new Plesiosaurs). The winning line: the Galleon sank a Dugout,
  the Kraken a Plesiosaur; a Kraken torpedo and Pettigrew's Tentacle at
  the Cove killed two more; the Kraken died to a Skimmer's ram (and a
  Tentacle slapped the Kraken, the weakest unit beside it); the Galleon
  shot a boat a turn, shot the War Raft first when it came into range,
  and sailed the last rounds (it cannot move and shoot in one turn):
  beside the Cove in round 15, one round past the star.
- **CU4.** With Steam Moles the dwarves tunnelled under the channellers
  and erupted every other round; with Clockwork Gunners on the shelf they
  shot a channeller a turn; both times strands broke, Horrors went loose
  and Pettigrew died in round 8. Now the dwarves know no Fortification or
  Marksmanship and start broke, and the goblins' camp is level 1 with no
  Coins. The winning line: Gibbering Masses on the doorstep (no strand),
  Idol Bearers on the centre, Mines and Offerings for Favour, Horrors and
  Masses killing Steam Tanks; Pettigrew died in round 8 to a Horror whose
  channeller a Hammerer had hit (one round's channels were lost to a
  scripting slip): held, 2 stars.
- **CU5.** With the sweets' camp beside Hood Hollow a Donut Racer killed
  Vole in round 1; with Favour 12, Engineering and no Sled the circle won
  in round 6, too easy; with Rime's whole ring as her zone she stepped out
  from under a marked star; Candy grew three towns from the road's
  villages. Now Rime guards her own tile alone, the road's villages are
  gone, the sweets' camp is level 1 with no Coins and storms Hood Hollow
  from round 5, and the summit keeps its Sled. The winning line: Horrors
  killed the Yeti, the Snow Hunter, the Sled and a Gunner on the slope;
  Vole took a village to heal; a Star-fall from the slope with the Idol
  Bearer and an Initiate chanting (12) left Rime on 10, and the next star
  killed her in round 11.
- **CU6.** With the Seal-works on the shelf and Gunners at the Gate,
  Gunner shots and a Knight's Overrun broke the strands and the Herald
  went loose in the Lodge's own ranks (round 8); with the Seal-works four
  tiles from the Gate, six at the Gate and a Steam Tank on its centre, an
  enemy stepped on the Great Summoning's mark (18 Favour lost), and on a
  replay the Herald took the Gate in round 6, too easy for the finale.
  With the Seal-works seven tiles away, the Brass Titan on the centre,
  nine at the Gate, the Rangers rushing from round 3 and the dead from
  round 4, a Knight's Overrun and two Vampires killed both Summoners, the
  Stargazer and the anchored Idol Bearers twice, the dwarves grew a town
  (and a second Titan) on the village between, and the attempt was lost.
  Now that village is gone, the Lodge has 8 Favour, one of the dead's
  Vampires is a Ghoul, the Rangers rush from round 4 and the dead storm
  the Seal-works from round 6, and the clock is 20 (star 14). The winning
  line: the Muster and Explorer monuments and two Offerings in round 1
  (20 Favour), and Pettigrew led the Great Summoning with the mark under
  the Familiar (consumed on arrival; no enemy can stand on an occupied
  mark); Star-falls of 18, 15, 12 and 12 killed four Hammerers, two
  Engineers and a Vampire and took the Titan from 36 to 9; the Herald
  walked west with five to seven strands, a Thing in the Cellar's Anchor
  on the safest channeller, while a Knight killed a Summoner and took the
  Idol off Hood Hollow's centre (an Initiate took it back); the Herald
  killed the Titan, advanced onto the Gate in round 7 and took it in
  round 8.

### 23.3 Deviations and follow-ups

- **Hood Hollow** is the Lodge's camp in CU4 to CU6 (the bible's "hidden
  camp"); CU4's starts level 1 in the corner behind the peaks.
- **CU1's Pettigrew is an Initiate** (the bible's Initiate), the Lodge has
  a Captain-Summoner, a Familiar, a Hexer and 2 Favour, and the patrol's
  `GUARD` hands over to `others` `ASSAULT` from round 5.
- **CU3's clock is 16 and its star 12** (the bible's 20 and 16), and the
  Dinosaurs may not research Seamanship or Submersibles; the War Raft is a
  wave in round 4. E7 (a navy that hunts a lane) is the
  built `GUARD` with `ships: true`.
- **CU4's dwarves** keep two at the Gate for three rounds and then storm
  the Seal-works (`GUARD` with `others: ASSAULT`, the bible's `NORMAL`
  then `ASSAULT`); the goblins rush from round 5 (the bible's 4); three
  waves (goblins in rounds 6 and 10, dwarves in round 8).
- **CU5's Rime** is a `GUARD` of her own tile with a garrison of one, the
  E2 fallback the bible names; E2 (a unit that never moves) is not built.
  The sweets play their own game until round 4 and then `ASSAULT` Hood
  Hollow.
- **CU6** has a clock of 20 and a star of 14 (the bible's 24 and 20), the
  Deep Gate at level 3 (the bible's 4), the Rangers' `RUSH` from round 4
  (the bible's 3) and the dead's `ASSAULT` on the Seal-works (the bible's
  Hood Hollow) from round 6; eighteen village edits (the natural-maps test
  names it). The dwarves know neither Marksmanship nor Fortification (no
  Gunners, no Steam Moles). E3 (a star for summoning the Herald) and E4
  (story lines on the waves) are not built; the stars are the clock and
  Pettigrew.
- **The Herald's AI (`pulp_wars-mch9.56`)** is not touched: no Cult
  mission needs an enemy or allied Herald (the Cult is the player in all
  six), so the bound-Herald idling under `GUARD` stays open.
- **Follow-up: a captured escort.** An `ESCORT` unit taken by the enemy
  (a Dinosaur Dugout's Board in CU3's third version) neither loses nor
  ends the mission: the objective's unit check ignores who owns it. CU3
  avoids it by forbidding the tribes Seamanship.
- **Observations for balance work (not changed here).** Steam Mole
  eruptions and Clockwork Gunner shots break a channel every turn, which
  is why CU4 and CU6 forbid them; a Knight's Overrun chain or a Vampire's
  feast through a line of 7-HP robed men is the Cult's worst enemy; a
  Tentacle slaps the weakest unit beside it even when that is the Cult's
  own; a city at level 5 gives the Cult a Thing in the Cellar whose Anchor
  makes one strand count three; Star-falls with four chanters (18) clear
  a garrison ring in a turn, and Plated Steam Tanks take at most 4 from
  each, Herald hits included.

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
