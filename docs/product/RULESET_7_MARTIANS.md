# Ruleset 7: Martian faction

**Status:** **folded into [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(kept as history)** by `pulp_wars-t6s.7` at `pulp-wars-poc-7r25`: the current
rules describe the running five-faction game, with the Martians in their
[section 20](RULESET_7_CURRENT.md#20-martian-faction-rules), and win wherever
this document differs; the fold's corrections of this text are listed in the
current rules' revision history. Contract (`pulp_wars-t6s.1`); **the engine is implemented**
(`pulp_wars-t6s.2`, identity `pulp-wars-poc-7r22`: every rule, command, event,
query, and state shape of this document). **The UI
([section 13](#13-ui-requirements), `pulp_wars-t6s.4`) is implemented**, with
the production art of
[MARTIAN.md](../art/factions/MARTIAN.md) in place of the placeholder sprites
of section 13.4 (the setup screen offers the faction; see
[the Screen Flow Martian overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-martian-overlay)).
**The Normal AI is implemented**
([section 12](#12-normal-ai-requirements), `pulp_wars-t6s.3`,
`src/ai/v7-martian.ts`; summary and measurements in the
[Normal AI notes](../architecture/NORMAL_AI.md#martian-play-pulp_wars-t6s3)).
**The coarse balance pass is done** (`pulp_wars-t6s.5`, identity
`pulp-wars-poc-7r25`: Colossus Defense 2.5; the
[tuning record](#165-tuning-record) and the
[Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md)).
**Mind Control and the Thrall (sections 8.2, 8.3, 9.6, 9.7) are superseded**
by the [Mind Control overlay](RULESET_7_MIND_CONTROL.md): a mind-controlled
unit keeps its type and abilities, one per Brain, and returns to its owner
when the Brain is lost; its engine, Normal AI, and UI are implemented
(`pulp_wars-b5f.3`, `pulp-wars-poc-7r33`, folded into
[current rules sections 20.8 and 20.9](RULESET_7_CURRENT.md#208-mind-control);
the Thrall art is retired). The Thrall text below is history.
What the implementation changed or made precise is in
[section 19](#19-implementation-notes-pulp_wars-t6s2). It is an
overlay over the rules in force when `pulp_wars-t6s.2` starts: today that is
[revision 20](RULESET_7_REVISION_20.md), which amends
[revision 19](RULESET_7_REVISION_19_DINOSAURS.md), which is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) (`pulp-wars-poc-7r18`, three
factions), plus the revisions queued before the Martian engine (achievements,
then a map revision with the Pangea coast ring and the Rift). Revision 20 is
being implemented while this document is written; its rules are treated as in
force. (When this was written no bead of the Martian epic was to fold this
overlay into the current rules; `pulp_wars-t6s.7` did.)

**Ruleset ID:** the next free `pulp-wars-poc-7rNN` at the time
`pulp_wars-t6s.2` starts. Other beads take identities first, so this document
names no number: **`7rNN` and `v7rNN` stand for that identity everywhere
below, and "the previous identity" for the one current just before it.** The
root's brief called this work revision 21; the number is not reserved.

**Map-generation revision:** unchanged by this revision: the one current when
`pulp_wars-t6s.2` lands (`REGIONAL_BIOMES_NAVAL_V2` today; the Rift bead
`pulp_wars-9s0.5` is queued before it). Faction choice never affects
generation.

**Scope:** a fifth playable faction, `MARTIAN`. The overlay changes only
identity, faction registration, setup, the Martian roster, the Martian rules
(Shields, heat rays and Cooling, Stride, Flying, Beam Down, Mind Control and
Thralls, Tractor Beam, Pierce, Force Field), two Martian technology effects,
the Martian substitutions for the starting unit, rewards, and treasure, and
the commands, events, queries, UI, and Normal AI needed to play them. Every
unmentioned revision-20 rule stays in force for every faction. Rulesets 5 and
6 and historical Ruleset 7 fixtures remain frozen.

**Identity of the faction:** Humans are sustain, Undead are attrition, Goblins
are a reckless horde, Dinosaurs are few and growing, and Martians are a
**small high-tech invasion force**: frail bodies behind energy Shields that
recharge every turn, heat rays that hit hard and then run hot, machines that
walk or fly over any terrain, troops beamed down from Saucers, and enslaved
locals to hold the front line. They are weak when rushed and focus-fired, and
weak in a sustained brawl. Economy, the technology graph, map rules, and boats
are the Human ones. Every Martian rule is visible on the board and fits in one
sentence ([section 13.3](#133-help-text)).

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. Sources and decided direction

The user's direction of 2026-10-02 (epic `pulp_wars-t6s`): "go with the
martians. design the faction and implement. Do everything except sprite
generation. Use programmatically drawn sprites as placeholders for now. Before
you start implementing make sure they have a bunch of unique mechanics, some
cool useful abilities and not just slightly different stats from everyone
else. And think a bit about each unit: how would it work in a battle, would it
be useful, would it be too strong. E.g. the T-Rex with Rampage turned out too
powerful in a way that could have been predicted and the Triceratops the
opposite."

| #   | User decision                                                             | Where                                                                               |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| U1  | A bunch of unique mechanics and useful abilities, not only other numbers. | [sections 5](#5-shields) to [8](#8-abilities)                                       |
| U2  | Each unit is thought through in battle **before** implementation.         | [section 9](#9-per-unit-battle-analysis)                                            |
| U3  | Everything except sprite generation; programmatic placeholder sprites.    | [section 13.4](#134-placeholder-art)                                                |
| U4  | Balance: every unit useful, none dominant.                                | [section 16](#16-headless-support-measurement-tuning-bounds-and-balance-acceptance) |

The root design brief (the notes of `pulp_wars-t6s.1`) is authoritative for
intent. Its nine pillars map to this document as follows: Shields and Force
Field ([section 5](#5-shields)); heat rays, Cooling, and Pierce
([section 6](#6-heat-rays)); Stride and Flying
([section 7](#7-movement-stride-flying-and-crossing-water)); Beam Down, Mind
Control, and Tractor Beam ([section 8](#8-abilities)). The brief's numbers
were starting points to be tested with the engine formula. Every number and
rule this document changed is listed with its reason in
[section 17.1](#171-changes-to-the-brief); every other decision is in
[section 17.2](#172-other-decisions); the root's rulings on the open
questions are in [section 17.3](#173-root-rulings).

## 2. Identity, factions, and compatibility

### 2.1 Identity

| Boundary                                   | Martian revision                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Ruleset                                    | `pulp-wars-poc-7rNN`                                                                                               |
| Game-state schema                          | `7`                                                                                                                |
| Command/event/save/replay numeric versions | `7`                                                                                                                |
| Browser autosave                           | `pulpWars.save.v7rNN.current`                                                                                      |
| Map revision                               | unchanged by this revision                                                                                         |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`                                                              |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`, `GOBLIN_BASELINE_V1`, `DINOSAUR_BASELINE_V1`, `MARTIAN_BASELINE_V1`  |
| Faction to tree binding                    | the four existing bindings, plus `MARTIAN` → `MARTIAN_BASELINE_V1`                                                 |
| Display names                              | the four existing names, plus `MARTIAN` is "Martian"                                                               |
| `COMMAND_KIND_ORDER_V7`                    | 48 kinds: `BEAM_DOWN`, `MIND_CONTROL`, `TRACTOR_BEAM` inserted in that order immediately after `HATCH`             |
| `DOMAIN_EVENT_KIND_ORDER_V7`               | 76 kinds: the four events of [section 11](#11-commands-events-errors-and-queries) inserted at the positions stated |

- The previous identity is appended to `PRIOR_RULESET_7_IDS` (the list stays
  gap-free). A reader of this revision rejects it and every earlier Ruleset 7
  identity in setups, states, saves, replays, and release artifacts; there is
  no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through the previous identity's key, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-t6s.2`, which also fixes every
  serialized **shape** of this revision (below) and implements every rule.
  `pulp_wars-t6s.3` (AI), `t6s.4` (UI and placeholders), and `t6s.5` (tuning)
  change behaviour and numbers under the same identity (the revision-14, 16,
  17, 19, and 20 precedent).
- **Shape changes** (all with neutral values in a match without a Martian
  seat):
  - `GameStateV7` and `PlayerViewV7` each gain four lists, `shields`,
    `cooling`, `thralls`, and `mindControlCooldowns`
    ([sections 5.1](#51-state), [6.2](#62-cooling),
    [8.3](#83-thralls), and [8.2](#82-mind-control-brain));
  - three commands, four events, one `UNIT_DIED` cause (`BRAIN_LOST`), three
    error codes, one `DISBAND_NOT_LEGAL` reason, one movement failure reason,
    four combat-preview fields, a `shieldDamage` field on splash, Wail, and
    explosion result entries, and the `martian` block of the public unit
    stats ([section 11](#11-commands-events-errors-and-queries));
  - three technology unlock kinds (`BRAIN_SUPPORT`, `FORCE_FIELDS`,
    `DISINTEGRATOR`) and eight ability literals
    ([section 11](#11-commands-events-errors-and-queries)).
- No unit key is added. A unit's Shield, Cooling, Thrall status, and Mind
  Control cooldown live in side lists, like `plagued`, `bitten`, and `eggs`;
  capacity slots, the movement mode, and Pierce are registration values.

### 2.2 Setup

- `MatchSetupV7.factions` stays a dense per-seat array; each entry is
  `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, or `MARTIAN`, and every
  combination is legal.
- Faction choice still never affects map generation, capital placement, turn
  order, treasure placement, or any PRNG draw: setups that differ only in
  `factions` generate byte-identical boards, turn orders, and treasures.
- **Starting units.** A Martian seat starts with one Grunt (the `FIGHTER`
  role) on its capital at full HP and full Shield, 5 Coins, and no
  technology, exactly like every other seat (`STARTING_FIGHTERS_V7` is 1).
- The headless tools accept `martian` in `--factions` (seat-ordered, next to
  `original`/`human`, `undead`, `goblin`, and `dinosaur`).

### 2.3 Faction model

This revision follows the revision-13 model: the frozen mechanical role order
is unchanged, state and events serialize the mechanical role, and every rule,
view, preview, UI surface, and AI decision resolves a unit through its
**owner's** registration with no cross-faction fallback.

- **Living.** Martian-faction units are living (their owner's faction is not
  `UNDEAD`), so Wail, Plague, and Bitten affect them, with the Shield rules of
  [section 5.3](#53-damage).
- **Shielded units** are the eight Martian land roles in any form (land or
  embarked). Martian boats and Thralls have no Shield.
- **Machines** are the Saucer, the Tripod, the Mothership, and the Colossus.
  The Saucer and the Mothership are **flyers**; the Tripod and the Colossus
  are **walkers**. Machines never get cover or fortification and cross water
  without a Port ([section 7](#7-movement-stride-flying-and-crossing-water)).
- **Foot units** are the Grunt, the Ray Gunner, the Shield Projector, the
  Brain, and the Thrall: ordinary land units for movement.
- **Ray units** are the Ray Gunner, the Tripod, and the Colossus
  ([section 6](#6-heat-rays)).
- **A Thrall** is a unit of the `FIGHTER` role owned by a Martian seat and
  listed in `thralls` ([section 8.3](#83-thralls)). It is the only unit a
  Martian seat owns that is not produced by a city, a reward, or a chest.

| Mechanical role | Human (`ORIGINAL`) | Undead (`UNDEAD`) | Goblin (`GOBLIN`) | Dinosaur (`DINOSAUR`) | Martian (`MARTIAN`) |
| --------------- | ------------------ | ----------------- | ----------------- | --------------------- | ------------------- |
| `FIGHTER`       | Fighter            | Skeleton          | Goblin            | Caveman               | Grunt (and Thrall)  |
| `RAIDER`        | Raider             | Ghoul             | Wolf Rider        | Raptor                | Saucer              |
| `MARKSMAN`      | Marksman           | Banshee           | Bomb Chucker      | Spitter               | Ray Gunner          |
| `GUARD`         | Guard              | Zombie            | Orc Brute         | Ankylosaurus          | Shield Projector    |
| `CAPTAIN`       | Captain            | Necromancer       | Orc Warboss       | Shaman                | Brain               |
| `CATAPULT`      | Catapult           | Lich              | Rocket Cart       | Triceratops           | Tripod              |
| `KNIGHT`        | Knight             | Vampire           | Scrap Buggy       | T-Rex                 | Mothership          |
| `JUGGERNAUT`    | Juggernaut         | Abomination       | Troll             | Brontosaurus          | Colossus            |
| `PATROL_BOAT`   | Patrol Boat        | Patrol Boat       | Patrol Boat       | Patrol Boat           | Patrol Boat         |
| `BATTLESHIP`    | Battleship         | Battleship        | Battleship        | Battleship            | Battleship          |

Tactical-role metadata equals that of the same mechanical role
(`assertRuleset7Registry` requires it): the Tripod is `SIEGE` and the Brain is
`SUPPORT`, so neither is ever a target of Psychic Command, Rally, or Frenzy
(WAAAGH! reaches them, but no Martian seat has it).

### 2.4 Showcase

A `SHOWCASE` setup ([current rules section 2.5](RULESET_7_CURRENT.md#25-showcase-setup))
accepts a Martian seat with no board change: the same strips, cities, ledger,
unit tiles, forms, homes, and entity IDs as any other faction.

- The ten units are the Martian roster's, one per role, at full HP and full
  Shield with zero kills. There is no Thrall, no Cooling unit, and no Mind
  Control cooldown at setup. The first seat's Start Turn then recharges its
  Shields under the Force Field rule like any Start Turn.
- All 23 technologies are researched, so Force Fields and the Disintegrator
  apply from the first turn.
- First income is the Human one (16 Coins; land trade applies).
- **Capacity.** The homes are unchanged. With a two-slot Mothership and
  Colossus the capital starts at 7 of 7 slots (Grunt 1, Brain 1, Tripod 1,
  Mothership 2, Colossus 2), North at 3 of 6, and Coast at 2 of 5, so no city
  is over capacity; the capital cannot train until a slot frees.
- The Showcase puts a Saucer, a Ray Gunner, and a Shield Projector in a row
  north of the capital and a Brain, a Tripod, and a Mothership south of it, so
  the Force Field, a full-power ray, Beam Down (the Grunt on the capital
  center is a legal passenger), and the Tractor Beam can all be tried on the
  first turn against a neighbouring strip.

## 3. Martian roster

"Slots" is the city capacity the unit uses
([revision 19 section 5.1](RULESET_7_REVISION_19_DINOSAURS.md#51-big-bodies-capacity-slots)).
"Shield" is the unit's Shield maximum ([section 5](#5-shields)).

| Unit             | Role          | Tech              | Cost | Slots |  HP | Shield | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Abilities                                                    |
| ---------------- | ------------- | ----------------- | ---: | ----: | --: | -----: | -----------------: | -------------------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------------------------------------------ |
| Grunt            | `FIGHTER`     | start             |   3³ |     1 |  10 |      2 |           1.5 (3)³ |              1.5 (3) |    1 |  1–2³ |     1 | yes               | yes     | ray pistol (plain shot); no Field Defense                    |
| Saucer           | `RAIDER`      | Scouting          |    4 |     1 |   8 |      2 |            1.5 (3) |                1 (2) |    3 |     1 |     2 | yes               | no      | flies; Beam Down; Strafe (Raiding)                           |
| Ray Gunner       | `MARKSMAN`    | Marksmanship      |    4 |     1 |   8 |      2 |              3 (6) |                1 (2) |    1 |   1–2 |    1¹ | yes               | yes     | heat ray                                                     |
| Shield Projector | `GUARD`       | Drill             |    4 |     1 |  12 |      3 |            1.5 (3) |              2.5 (5) |    1 |     1 |     1 | no                | yes     | Force Field; no Field Defense                                |
| Brain            | `CAPTAIN`     | Administration    |    5 |     1 |   8 |      2 |              1 (2) |                1 (2) |    1 |     1 |     1 | yes               | no      | Psychic Command; Mind Control; no Tend Wounded               |
| Tripod           | `CATAPULT`    | Sawmilling        |    9 |     1 |  12 |      2 |              4 (8) |                1 (2) |    2 |    2³ |    2³ | yes               | no      | strides; heat ray; Pierce; destroys Field Defense            |
| Mothership       | `KNIGHT`      | Chivalry          |   10 |     2 |  16 |      4 |            2.5 (5) |                2 (4) |    2 |     1 |     1 | yes               | no      | flies; Tractor Beam; no Overrun                              |
| Colossus         | `JUGGERNAUT`  | reward only       |    — |     2 |  32 |      3 |              4 (8) |             2.5 (5)² |    1 |   1–2 |     1 | yes               | yes     | strides; heat ray; Push                                      |
| Thrall           | `FIGHTER`     | Mind Control only |    — |     0 | ≤10 |      0 |            1.5 (3) |              1.5 (3) |    1 |   1–2 |     1 | yes               | yes     | no Shield; no Promotion; no Disband; collapses without Brain |
| Patrol Boat      | `PATROL_BOAT` | Shorecraft        |    5 |     1 |  10 |      0 |              2 (4) |                2 (4) |    2 |     1 |     2 | yes               | no      | naval                                                        |
| Battleship       | `BATTLESHIP`  | Naval Engineering |   16 |     1 |  25 |      0 |             6 (12) |                4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                                                |

¹ Ray Gunner Sight becomes 2 with Fieldcraft.

² Colossus Defense 2.5 since `pulp_wars-t6s.5` (contract value 3; see the
[tuning record](#165-tuning-record)).

³ Since `pulp_wars-b5f.2` (`pulp-wars-poc-7r32`, the user's playtest round
5): the Grunt has a ray pistol, range 1–2 (was 1), and costs 3 Coins with
Attack 1.5 (was 2 Coins and Attack 2); the Tripod fires at range 2 only
(minimum range 2, was range 1–2 with minimum range 1) and has Sight 2 (was
1). The battle analysis of [section 9](#9-per-unit-battle-analysis) predates
it ([tuning record](#165-tuning-record)).

These are starting values for `pulp_wars-t6s.5`, computed against the
registry of commit `f1c17bd` with the revision-20 Triceratops and T-Rex.
Revision 20 may raise Human HP by up to 3
([revision 20 section 6](RULESET_7_REVISION_20.md#6-human-sturdiness)); the
analysis states where that matters.

- **Grunt** has Fighter parity (capture, Pillage with Raiding, Disband,
  ordinary Promotion) except its numbers, its Shield, its range, and that it
  cannot build Field Defense. It is trained on the city center from the
  first turn. Since `pulp_wars-b5f.2` its attack is a **ray pistol**: an
  ordinary attack at range 1 or 2 (minimum range 1), not a heat ray (full
  Attack after moving, no Cooling).
- **Saucer** flies ([section 7.2](#72-flying)). It has Raider parity for
  Sight 2 and for Charge (Raiding), labelled **Strafe**: +1 Attack on its
  first attack after a Move of at least two tiles. It has no Escape, no
  capture, no Pillage, and never advances after a kill. Its primary actions
  are Attack and Beam Down ([section 8.1](#81-beam-down-saucer)).
- **Ray Gunner** has Marksman parity (range 1–2, minimum range 1, capture,
  Pillage, Disband, Fieldcraft Forest freedom and Sight, the advance after an
  adjacent kill) and a heat ray ([section 6](#6-heat-rays)).
- **Shield Projector** has Guard parity for "cannot attack after moving" and
  capture. It cannot build Field Defense and projects the Force Field
  ([section 5.4](#54-force-field-shield-projector)).
- **Brain** has Captain parity for no capture and for Rally, labelled
  **Psychic Command** (same command, flag, and event). It has no Tend
  Wounded (`TEND_WOUNDED` is never offered and is rejected with
  `UNIT_ROLE_INVALID`). Its primary actions are Attack, Psychic Command, and
  Mind Control ([section 8.2](#82-mind-control-brain)).
- **Tripod** is a walker ([section 7.1](#71-stride)) with a heat ray and
  Pierce ([section 6.4](#64-pierce-tripod)). Since `pulp_wars-b5f.2` it fires
  like the Catapult from a distance: range 2 with minimum range 2 (never at
  an adjacent unit), and it sees two tiles. Unlike the Catapult it may
  attack after moving (at half power). Like the Catapult it cannot capture,
  never advances, and every attack it makes destroys Field Defense on the
  primary target's tile (reason `CATAPULT`).
- **Mothership** flies. It has Knight parity for no capture and nothing else:
  no Overrun, Move 2, and it never advances. Its primary actions are Attack
  and Tractor Beam ([section 8.4](#84-tractor-beam-mothership)). A Mothership
  is never a treasure unit.
- **Colossus** is a walker with a heat ray and Juggernaut parity for the rest:
  reward only, capture, Push on an adjacent surviving target, the advance
  after an adjacent kill, no Pillage, no Disband.
- **Thrall**: [section 8.3](#83-thralls).
- **Patrol Boat and Battleship** are identical to the Human units: names,
  stats, abilities, and art. Martian faction rules do not apply to them: no
  Shield, one slot, the ordinary Promotion.
- **Disband refunds** are `floor(cost / 2)` as usual: Grunt 1 (cost 3 since
  `pulp_wars-b5f.2`), Saucer, Ray
  Gunner, and Shield Projector 2, Brain 2, Tripod 4, Mothership 5. A Colossus
  and a Thrall cannot Disband.
- **Arms Industry** applies as to every faction: −1 Coin for a land unit
  trained in a city with a working Forge.
- An **embarked** Martian land unit follows the ordinary embarked rules (Move
  2, Defense 1, Sight 1, no Attack, no retaliation, no ZOC, no Beam Down, Mind
  Control, Tractor Beam, or Psychic Command, and it projects no Force Field).
  It keeps its Shield, which still absorbs damage and recharges, and its
  slots.
- **Public abilities** (the role rule's `abilities` list): Grunt `ATTACK`,
  `CAPTURE`; Saucer `ATTACK`, `CHARGE`, `FLY`, `BEAM_DOWN`; Ray Gunner
  `ATTACK`, `CAPTURE`, `HEAT_RAY`; Shield Projector `ATTACK`, `CAPTURE`,
  `FORCE_FIELD`; Brain `ATTACK`, `RALLY`, `MIND_CONTROL`; Tripod `ATTACK`,
  `STRIDE`, `HEAT_RAY`, `PIERCE`; Mothership `ATTACK`, `FLY`, `TRACTOR_BEAM`;
  Colossus `ATTACK`, `CAPTURE`, `PUSH`, `STRIDE`, `HEAT_RAY`; boats `ATTACK`.
  The Shield maximum, the slots, and the movement mode are role mechanics
  exposed through public unit stats
  ([section 11](#11-commands-events-errors-and-queries)).

## 4. Technology

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rule, and technology IDs of `MARTIAN_BASELINE_V1` are identical to
`ORIGINAL_BASELINE_V5` ([current rules section 6](RULESET_7_CURRENT.md#6-technology)).
The Martian registration differs in four unlock entries and two display
names:

- `ADMINISTRATION` grants `BRAIN_SUPPORT` (Psychic Command and Mind Control)
  instead of `CAPTAIN_SUPPORT`.
- `CHIVALRY` grants no `OVERRUN` (the Undead precedent).
- `FORTIFICATION` is displayed as **Force Fields** and replaces
  `COMMAND BUILD_FIELD_DEFENSE` with `FORCE_FIELDS`
  ([section 5.5](#55-force-fields-technology)).
- `EXPLOSIVES` is displayed as **Disintegrator**, keeps both of its unlocks
  (Blast Mountain and melee Field Defense demolition), and adds
  `DISINTEGRATOR` ([section 6.5](#65-disintegrator-technology)).

`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains
`MARTIAN: { FORTIFICATION: "Force Fields", EXPLOSIVES: "Disintegrator" }`.
The two effects are read through the technology capabilities
`shieldsRechargeAtEndTurn` and `raysIgnoreFortification`, never through a raw
technology test.

**Audit.** Every technology, and what it gives a Martian seat. "Same" means
the Human unlock applies unchanged and is useful to a Martian seat as it is to
a Human one.

| Technology        | Tier | What a Martian seat gets                                                                                         | Dead part for Martians                           |
| ----------------- | ---: | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Gathering         |    1 | same: reveal Fertile Ground; Harvest Fruit                                                                       | —                                                |
| Farming           |    2 | same: Farm                                                                                                       | —                                                |
| Milling           |    3 | same: Windmill and its Start Turn healing (HP only; a Shield recharges by itself)                                | —                                                |
| Administration    |    2 | **Brain** (Psychic Command, Mind Control); Market; Disband                                                       | —                                                |
| Planning          |    3 | same: +1 capacity in every city; Land Grant                                                                      | —                                                |
| Hunting           |    1 | same: Hunt Game                                                                                                  | —                                                |
| Forestry          |    2 | same: Lumber Camp; Clear Forest                                                                                  | —                                                |
| Sawmilling        |    3 | Sawmill; **Tripod**                                                                                              | —                                                |
| Marksmanship      |    2 | **Ray Gunner**                                                                                                   | —                                                |
| Fieldcraft        |    3 | Replant Forest; the Ray Gunner ignores Forest movement stops and has Sight 2                                     | Forest freedom of the Saucer, which flies anyway |
| Scouting          |    1 | **Saucer** (Beam Down); Saucer Sight 2                                                                           | —                                                |
| Roads             |    2 | same: Build Road; half-cost Road movement for every Martian land unit, machines included; Road population        | —                                                |
| Commerce          |    3 | same: land trade                                                                                                 | —                                                |
| Raiding           |    2 | Pillage for the Grunt, Ray Gunner, Shield Projector, Brain, Tripod, and Thrall; Saucer **Strafe**                | Pillage for the two flyers                       |
| Chivalry          |    3 | **Mothership** (Tractor Beam); Cultivate Forest                                                                  | Overrun (not granted)                            |
| Drill             |    1 | reveal Ore; **Shield Projector**; first-hostile-capture Spoils                                                   | —                                                |
| Engineering       |    2 | foot units enter Mountain; +1 Sight on a Mountain for every unit; Mine; Workshop; Redevelop                      | Mountain entry for the four machines             |
| Metallurgy        |    3 | same: Forge; Arms Industry                                                                                       | —                                                |
| Fortification     |    2 | **Force Fields:** Shields also recharge at the end of the owner's turn                                           | Field Defense (no Martian unit builds it)        |
| Explosives        |    3 | **Disintegrator:** Blast Mountain; melee Field Defense demolition; heat rays ignore the defender's fortification | —                                                |
| Shorecraft        |    1 | same: Harvest Fish; Build Port; embarkation for foot units; Patrol Boat                                          | embarkation for machines, which need no Port     |
| Navigation        |    2 | same: Deep Water for boats, transports, and machines; Gather Pearls; sea trade                                   | —                                                |
| Naval Engineering |    3 | same: Battleship; Shipyard; naval discount                                                                       | —                                                |

No technology is a dead purchase: each row has at least one live unlock, and
the two renamed technologies have a faction effect of their own. The tree,
research offers, and Help render names and unlock text from the **viewer's**
faction:

| Technology     | Martian name  | Martian unlock text                                                                           |
| -------------- | ------------- | --------------------------------------------------------------------------------------------- |
| Administration | same          | Brain (Psychic Command, Mind Control); Market; Disband                                        |
| Sawmilling     | same          | Sawmill; Tripod (heat ray, Pierce)                                                            |
| Marksmanship   | same          | Ray Gunner (heat ray)                                                                         |
| Fieldcraft     | same          | Replant Forest; Ray Gunner ignores Forest movement stops; Ray Gunner Sight 2                  |
| Scouting       | same          | Saucer (flies, Beam Down); Saucer Sight 2                                                     |
| Raiding        | same          | Pillage for land units that do not fly; Saucer Strafe                                         |
| Chivalry       | same          | Mothership (flies, Tractor Beam); Cultivate Forest                                            |
| Drill          | same          | reveal Ore; Shield Projector (Force Field); first-hostile-capture Spoils (2 Coins)            |
| Engineering    | same          | foot units enter Mountain; +1 Sight on Mountain; Mine; Workshop; Redevelop                    |
| Fortification  | Force Fields  | Shields also recharge at the end of your turn                                                 |
| Explosives     | Disintegrator | Blast Mountain; melee attacks destroy Field Defense; heat rays ignore Walls and Field Defense |

The other technologies read the same for every faction.

## 5. Shields

Every rule in sections 5 to 8 applies only to units owned by a `MARTIAN` seat,
except where a rule names its target.

### 5.1 State

Each Martian land role has a **Shield maximum** in its owner's registration
(role mechanic `shield`): Grunt, Saucer, Ray Gunner, Brain, and Tripod 2,
Shield Projector and Colossus 3, Mothership 4. It is 0 for the boats of every
faction, for every role of every other faction, and for a Thrall whatever its
role says.

A unit's current Shield lives in one new state list:

```text
GameStateV7.shields: readonly { unitId, shield }[]   // sorted by unitId
```

with one entry for each unit on the board whose current Shield is at least 1;
a unit without an entry has Shield 0. A newly created Martian unit (trained,
reward, treasure, Showcase) starts with its Shield maximum.

**State parsing** rejects: an entry without a living unit; a duplicate or
unsorted entry; a `shield` that is not an integer from 1 to
`max(shield maximum, FORCE_FIELD_SHIELD_V7)`; an entry for a unit whose Shield
maximum is 0 (so any entry in a match without a `MARTIAN` seat, and any entry
for a Thrall or a boat).

**View.** `PlayerViewV7.shields` lists `{ unitId, shield }` for every visible
unit with Shield at least 1. A visible unit's current Shield and Shield
maximum are public, like its HP.

### 5.2 Recharge

At its owner's **Start Turn**, after activations, capture eligibility, and
city actions are reset and **before Plague**, every shielded unit of that
player on the board, in land or embarked form, has its Shield **set** to:

```text
covered ? max(shield maximum, FORCE_FIELD_SHIELD_V7) : shield maximum
```

where `covered` is the Force Field test of
[section 5.4](#54-force-field-shield-projector) and `FORCE_FIELD_SHIELD_V7` is 4. One `SHIELDS_RECHARGED` event lists the units whose Shield changed (none
when nothing changed). The recharge is not healing: HP is untouched.

The Start Turn order becomes:

```text
reset activations and capture eligibility → city actions available →
Mind Control cooldowns → SHIELD RECHARGE → Plague → Plague-started chain and
its Plunder → hatch step → Windmill healing → regeneration → income →
rewards → achievements
```

A Shield never recharges at any other time, except through Force Fields
([section 5.5](#55-force-fields-technology)).

### 5.3 Damage

Every instance of damage to a unit is taken from its Shield first:

```text
shieldDamage = min(shield, damage)
hpDamage     = min(hp, damage − shieldDamage)
```

- It applies to each of: the hit of an attack, the retaliation the unit takes
  as an attacker, a splash or Pierce hit, a Wail hit, and a Kaboom or
  death-blast hit. Armoured (no Martian unit has it) would apply before the
  Shield.
- **Plague bypasses the Shield:** the 2 damage of each plagued Start Turn is
  taken from HP. (The recharge runs before Plague, so the order does not
  matter.)
- **The damage formula is unchanged.** Both forces use HP and maximum HP as
  today; a full Shield does not raise them. The hit on a unit is capped at
  its Shield plus its HP. A unit dies when its HP reaches 0.
- **Derived effects use HP damage, except collateral damage:**
  - **Lifesteal** heals a Vampire by the HP damage it dealt.
  - **Bite:** a Zombie bites only a unit that lost HP to its hit.
  - **Plague application:** a Lich plagues the primary target and the splash
    targets that **lost HP** to that attack. Plague **spread** at Start Turn
    is not damage and ignores Shields.
  - **Infect** needs a kill, as always.
  - **Splash and Pierce** are computed from the **whole hit** on the primary
    target (`shieldDamage + hpDamage`), then each victim's own Shield absorbs
    its share. A Shield protects only its owner.
  - Kill credit, growth, Plunder, Graves, and death blasts follow deaths as
    today.
- **Not damage, so never absorbed:** Push, the Charge! push and follow, the
  Tractor Beam, Mind Control, Field Defense destruction, and removal by
  displacement or elimination.
- Recovery, Windmill healing, Tend Wounded, Troll regeneration, Promotion,
  and growth change HP only.

Examples (full HP, open Grass):

| Hit                                             | Hit | Shield absorbs | HP lost | Note                                              |
| ----------------------------------------------- | --: | -------------: | ------: | ------------------------------------------------- |
| Fighter attacks a Grunt (10 HP, Shield 2)       |   5 |              2 |       3 | the Fighter takes 3 back                          |
| A second Fighter attacks the same Grunt         |   6 |              0 |       6 | the Grunt is at 1 HP; a third hit kills it        |
| Guard attacks a Grunt                           |   3 |              2 |       1 |                                                   |
| Banshee Wail on a Grunt                         |   2 |              2 |       0 | the Wail strips every Shield in its radius        |
| Goblin Kaboom (5) on a Grunt                    |   5 |              2 |       3 | a second Kaboom deals 5, a third kills            |
| Zombie attacks a Grunt                          |   5 |              2 |       3 | HP was lost, so the Grunt is Bitten               |
| Zombie attacks a Grunt in a Force Field         |   5 |              4 |       1 | still Bitten                                      |
| Fighter attacks a Mothership (16 HP, Shield 4)  |   5 |              4 |       1 |                                                   |
| Grunt attacks a Fighter; the Fighter retaliates |   5 |              2 |       3 | the Grunt meets the enemy turn with Shield 0      |
| Vampire at 4 of 10 HP attacks a Grunt           |   6 |              2 |       4 | the Vampire heals 4 (to 8), not 6                 |
| Lich attacks a Grunt next to another Grunt      |   9 |              2 |       7 | splash 5 on the neighbour: Shield 2, HP 3, Plague |

### 5.4 Force Field (Shield Projector)

A shielded unit is **covered** when, at the moment of a recharge, one of its
owner's Shield Projectors **in land form, other than itself**, stands on one
of the eight tiles around it. A covered unit recharges to
`max(shield maximum, 4)`: the Grunt, Saucer, Ray Gunner, Brain, and Tripod to
4 instead of 2, the Shield Projector and the Colossus to 4 instead of 3, and
the Mothership to its own 4.

- **Not cumulative.** Two Projectors next to one unit still give 4.
- **Read at the recharge only.** A unit that walks away keeps the Shield it
  has until its next recharge; a unit that walks next to a Projector gains
  nothing until then; killing the Projector removes nothing already granted
  and stops the next recharge.
- A covered unit's form does not matter (an embarked unit next to a Projector
  on the shore is covered); the Projector must be in land form.
- Thralls and boats have no Shield and gain nothing.
- No Shield in the game exceeds 4, so one hit of 5 (a Kaboom, a Fighter, a
  Marksman) always costs at least 1 HP.

### 5.5 Force Fields (technology)

Force Fields is the Martian `FORTIFICATION` (Industry, tier 2, requires
Drill, ordinary tier-2 cost). While its owner has it, the recharge of
[section 5.2](#52-recharge) also runs at that owner's **End Turn**, after
idle recovery and the Cooling step ([section 6.2](#62-cooling)) and before
the income preview, with the Force Field test made on the positions at that
moment. So Shield spent on retaliation during the owner's own attacks is back
before the enemy moves, and a unit that **ends** its turn next to a Projector
is covered during the enemy turn. It emits `SHIELDS_RECHARGED` like the Start
Turn step. City Walls are unchanged: a Martian city may choose the Walls
reward, and Walls fortify a Martian foot unit on the center.

## 6. Heat rays

### 6.1 Full and half power

Every `ATTACK` made by a land-form unit with `HEAT_RAY` (Ray Gunner, Tripod,
Colossus), at range 1 or 2, is a ray. A ray fires at **full power** when the
unit **has not moved this turn** (`activation.moved` is false) **and is not
Cooling**; otherwise it fires at **half power**:

```text
ray attack2 = full power: role attack2
              half power: floor(role attack2 / 2)
attack      = ray Attack + 1 (Psychic Command)
```

| Unit       | Full Attack (`attack2`) | Half Attack (`attack2`) |
| ---------- | ----------------------: | ----------------------: |
| Ray Gunner |                   3 (6) |                 1.5 (3) |
| Tripod     |                   4 (8) |                   2 (4) |
| Colossus   |                   4 (8) |                   2 (4) |

- The halving applies to the role's base Attack only; Psychic Command's +1 is
  added afterwards.
- Everything else is the ordinary attack: range, visibility, the damage
  formula, retaliation from a defender that reaches the shooter, the advance
  of a Ray Gunner or Colossus after an adjacent kill, Push for the Colossus at
  range 1.
- A ray unit's **retaliation** is not a ray: retaliation damage depends on
  Defense, so it is never halved and never causes Cooling.

### 6.2 Cooling

A **full-power** ray leaves the unit **Cooling until the end of its owner's
next turn**. A half-power ray changes nothing. So a ray unit that stands
still fires full, half, full, half; on its Cooling turn it loses nothing by
moving, because it would fire at half power anyway.

```text
GameStateV7.cooling: readonly { unitId, firedThisTurn }[]   // sorted by unitId
```

- A full-power ray adds `{ unitId, firedThisTurn: true }`.
- A unit **is Cooling** exactly while it has an entry with `firedThisTurn`
  false.
- **Cooling step** at the owner's End Turn (after idle recovery and the
  expiry of Inspired and Overrun): every entry of that player's units with
  `firedThisTurn` false is removed, then every remaining entry of that player
  gets `firedThisTurn: false`.
- Cooling changes nothing but the ray's power: not Defense, the Shield, Move,
  retaliation, or any other ability. It persists through embarking and
  landing and ends when the entry is removed or the unit leaves the board.
- **State parsing** rejects an entry without a living unit whose role has
  `HEAT_RAY` under its owner's registration, a duplicate or unsorted entry, a
  non-boolean flag, and `firedThisTurn: true` for a unit of a player other
  than the active one.
- **View.** `PlayerViewV7.cooling` lists the visible units' entries. Cooling
  is public: opponents see which shooters are weak next turn.

### 6.3 Worked examples

Full HP, open Grass, range 2 (no retaliation from a melee target).

| Target (HP, Defense)             | Ray Gunner full / half | Tripod or Colossus full / half | Marksman | Catapult |
| -------------------------------- | ---------------------: | -----------------------------: | -------: | -------: |
| Fighter (10, 2)                  |                  8 / 3 |                         12 / 5 |        5 |       10 |
| Guard (15, 3)                    |                  7 / 2 |                         10 / 4 |        4 |        8 |
| Guard on Field Defense           |                  6 / 2 |                          9 / 3 |        3 |        7 |
| Guard on a Walled center         |                  5 / 2 |                          8 / 3 |        3 |        6 |
| Raider, Knight, Marksman (10, 1) |                 10 / 4 |                         14 / 6 |        6 |       12 |
| Zombie (18, 2)                   |                  8 / 3 |                         12 / 5 |        5 |       10 |
| Fighter, with Psychic Command    |                 12 / 6 |             — (never Inspired) |        — |        — |

Two turns of a shooter that stands still, against fresh targets: Ray Gunner
8 + 3 = 11 on Fighters (Marksman 5 + 5 = 10); Tripod 12 + 5 = 17 (Catapult
10 + 10 = 20).

### 6.4 Pierce (Tripod)

When a Tripod's ray hits a primary target that stands **in one of the eight
directions** from the Tripod (the offset `(dx, dy)` has `|dx|` and `|dy|` each
0 or equal to the distance, at distance 1 or 2), the unit on the tile
**directly behind** the target (the target's tile plus one step in that
direction) is also hit:

```text
pierce damage = max(1, ceil(whole hit on the primary target / 2))
```

- It hits **any** unit on that tile: own, allied, or hostile, hidden or
  visible, of any form, Eggs included. It uses the splash rules with one
  target tile and target mode `ALL`: no retaliation, no modifiers, Armoured
  and the victim's Shield apply, the death cause is `SPLASH`, hostile kills
  count for the Tripod, and own or allied kills do not.
- A target at a knight's-move offset (distance 2 with offsets 2 and 1) has no
  tile behind it and nothing is pierced.
- Since `pulp_wars-b5f.2` the Tripod fires at distance 2 only (minimum
  range 2), so in play its primary target is two tiles away and the pierced
  tile three; the rule itself is unchanged.
- Pierce applies at full and at half power. It does not destroy Field
  Defense on the pierced tile.
- Examples: a full-power ray on a Fighter (12) pierces a Marksman behind it
  for 6; at half power 5 and 3; a full-power ray on a Guard (10) pierces for 5.

### 6.5 Disintegrator (technology)

The Disintegrator is the Martian `EXPLOSIVES` (Industry, tier 3, requires
Fortification, ordinary tier-3 cost). It keeps Blast Mountain and melee Field
Defense demolition and adds: when a ray (full or half power) is fired by a
unit whose owner has it, the defender's **fortification level is 0** for the
whole exchange, for the damage it takes and for its retaliation (the Charge!
convention of
[revision 20 section 2.2](RULESET_7_REVISION_20.md#22-charge)). Cover stays.
Walls and Field Defense are not destroyed by this rule (a Tripod still
destroys Field Defense as a `CATAPULT`-role attacker). The combat preview
reports `fortificationLevel: 0` and the removed levels in
`fortificationIgnored`. Example: a Ray Gunner's full ray on a Guard on a
Walled center with Field Defense deals 7 instead of 5; a Tripod's deals 10
instead of 7.

## 7. Movement: Stride, Flying, and crossing water

Each role has a **movement mode** in its owner's registration (role mechanic
`movementMode`): `STRIDE` for the Tripod and the Colossus, `FLY` for the
Saucer and the Mothership, and `GROUND` for every other role of every
faction. The public abilities `STRIDE` and `FLY` mirror it.

### 7.1 Stride

A walker in land form:

- enters a **Mountain without Engineering**, in every rule that asks whether
  a unit can enter a tile: `MOVE`, `DISEMBARK`, the advance, Push and Tractor
  Beam destinations, Beam Down, and reward displacement;
- is **never stopped by terrain**: entering a Forest or a Mountain does not
  end its Move. Unexplored cells and hostile ZOC still end it;
- **never gets cover or fortification**: its cover is 1 on every terrain and
  its fortification level is 0 on every tile, Walls and Field Defense
  included;
- may **cross Shallow Water** inside a Move and may end a Move on water
  ([section 7.3](#73-crossing-water));
- **cannot enter a Rift** ([section 7.4](#74-rift)): Stride is Forest,
  Mountain, and Shallow Water, nothing else;
- exerts and suffers ZOC, uses Roads, passes its owner's units, and is
  blocked by other units like any land unit.

### 7.2 Flying

A flyer in land form has every walker rule above, and:

- **passes over any unit.** A step onto a tile that holds a unit of any owner
  is entered as if it were empty, at any point of the path except the last:
  a flyer never ends a Move on an occupied tile;
- **ignores hostile ZOC** (entering it never ends its Move) and **exerts no
  ZOC**;
- may cross Shallow Water, and Deep Water with Navigation, inside a Move;
- may enter, cross, and end a Move on a **Rift** ([section 7.4](#74-rift));
- **cannot end a Move, or land from the water, on a neutral village center or
  on the center of a city it does not own.** A `MOVE` or `DISEMBARK` that
  would is rejected with `MOVEMENT_ILLEGAL` (reason `SETTLEMENT_FORBIDDEN`)
  and is never offered. It may stand on its owner's own center, where it
  blocks training like any unit;
- **never advances** after a kill (`advancesAfterKill` false), never
  captures, and cannot Pillage.

Consequences: a flyer can never stand on a hostile or neutral center, because
no rule can put it there (Push, Tractor Beam, and Beam Down never choose a
settlement site, and a flyer never rises there as itself). So a flyer never
besieges, never blocks a capture of a foreign city, and never takes a village.

What stays ordinary for a flyer:

- A Move still **ends on entering an unexplored cell**, and reveals sight
  from every tile entered, water included.
- It occupies its tile: no unit of any owner ends a Move, lands, is pushed,
  pulled, or placed on it, and other players' units cannot pass it.
- Anyone in range attacks it under the ordinary rules; it retaliates at range 1. It can be pushed and pulled like a land unit.
- It takes a treasure chest by ending a Move on it. It recovers, is healed,
  is plagued, bitten, and infected, and leaves a Grave like any land unit.
- It never destroys Field Defense by entering a tile (it is not on the
  ground): the `OCCUPATION` reason never applies to a flyer.
- Roads apply to it as to any land unit (no exception is made).

**Hidden units.** A unit is hidden only on an unexplored tile, and a Move ends
on entering one, so a flyer can meet a hidden unit only on the last tile of
its Move. The ordinary interruption applies: the Move is accepted, the flyer
stays on the last tile it entered on which it may end a Move (free of units,
and not a forbidden center), or on its starting tile, and
`UNIT_MOVE_INTERRUPTED` reports the tile.

### 7.3 Crossing water

Machines need no Port.

- **Inside a Move.** A flyer may step onto Shallow Water, and onto Deep Water
  if its owner has Navigation; a walker may step onto Shallow Water only. A
  water step costs what a land step costs, and the step that leaves a water
  tile costs a full point (the existing rule). The unit keeps its land form
  while the Move is being validated; only the tile where the Move ends
  matters.
- **Ending on water: self-launch.** A machine whose Move ends on a water tile
  it may enter (Shallow Water always, without Shorecraft; Deep Water with
  Navigation; no unit on the tile) **embarks there**, with the ordinary
  result of embarking: form `EMBARKED`, the exhausted activation, and
  `UNIT_EMBARKED`. The tile needs no Port. A Move that is stopped on a water
  tile (an unexplored cell, naval ZOC for a walker, an interruption) ends the
  same way.
- **Afloat, a machine is an ordinary embarked unit:** Move 2, Defense 1,
  Sight 1, no Attack, no retaliation, no ZOC, no ability, Deep Water with
  Navigation (walkers too), landing with `DISEMBARK` on an adjacent land cell
  it can enter (a Mountain included), and landing ends its activation. It
  keeps its Shield and its Cooling entry. An embarked unit on a hostile dock
  blockades it, as today. It is **drawn as the machine itself over the
  water**, never as a boat ([section 13.1](#131-surfaces)).
- **Foot units** embark at an own active, empty Port or Shipyard with
  Shorecraft, exactly like Human land units.

This is the cheapest faithful form of "walkers wade, flyers cross the sea":
the engine keeps its invariant that only an afloat form stands on a water
tile ([decision 9](#171-changes-to-the-brief)).

### 7.4 Rift

A **Rift** is a terrain that `pulp_wars-9s0.5` adds before the Martian engine
bead: a rare one-by-three crack in the ground on which nothing can be built
and "no unit can stand ... except flying ones" (the user's words). That bead
owns the terrain; this section fixes only what it means for Martians.
**Implemented** by `pulp_wars-9s0.5` (`pulp-wars-poc-7r28`) exactly as
written here; the [Rift overlay](RULESET_7_RIFT.md) rules the rest (no
Grave lies on a Rift) and records the tests.

- **Flyers** (Saucer, Mothership) in land form may enter a Rift tile, pass
  over it, and **end a Move on it**, at the ordinary cost. It never stops
  their Move. They may land on it from the water with `DISEMBARK` and may be
  pushed or pulled onto it.
- **Walkers do not stride over a Rift.** Stride covers Forest, Mountain, and
  Shallow Water only: a Tripod or Colossus can neither enter nor cross a Rift
  tile. Foot units and Thralls cannot either.
- **No rule puts a non-flyer on a Rift.** A Rift tile is never a legal Beam
  Down destination (every passenger is a non-flyer). A Tractor Beam or a Push
  whose destination is a Rift tile is legal only for a target that flies;
  for any other target it is `BLOCKED`. A unit standing on a Rift is immune
  to Mind Control (`TARGET_IMMUNE`), because the Thrall could not stand
  there. A flyer killed on a Rift by a Zombie, or while Bitten, **does not
  rise**: the Zombie could not stand there; it dies as an ordinary death.
- **Attacks.** Range and adjacency are plain distances, and a Rift blocks
  nothing: units attack across it, rays and Pierce continue over it, and a
  flyer on a Rift is attacked by adjacent units and by ranged units exactly
  as on any tile, retaliates as usual, and has no cover there (it never has
  any). An attacker that kills a flyer on a Rift does not advance, because
  it cannot enter the tile. Blasts and splash hit a flyer on a Rift like any
  unit.
- A flyer on a Rift cannot be dislodged by a unit taking its tile, but a
  Rift is three tiles with open ground all around it, so it is a perch, not a
  shelter. Whether a Grave may lie on a Rift, and every other Rift rule, is
  the Rift bead's decision.

## 8. Abilities

### 8.1 Beam Down (Saucer)

`BEAM_DOWN { kind, unitId, passengerUnitId, to }` is a primary action of the
Saucer: it moves one own unit from a city to a tile next to the Saucer. It is
not an Attack, costs no Coins, and needs no technology beyond the Saucer.

Legality, checked in this order (all rejections are atomic):

| #   | Requirement                                                                                                                                                                                                                                                                    | Rejection                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | `unitId` is the actor's own living unit.                                                                                                                                                                                                                                       | the ordinary unit errors                         |
| 2   | Its role has `BEAM_DOWN`.                                                                                                                                                                                                                                                      | `UNIT_ROLE_INVALID { role }`                     |
| 3   | It has not used a primary action and has not landed this turn.                                                                                                                                                                                                                 | `UNIT_ALREADY_ACTED`                             |
| 4   | It is in land form.                                                                                                                                                                                                                                                            | `BEAM_DOWN_NOT_LEGAL { reason: "EMBARKED" }`     |
| 5   | It **has not moved this turn**.                                                                                                                                                                                                                                                | `BEAM_DOWN_NOT_LEGAL { reason: "MOVED" }`        |
| 6   | `passengerUnitId` is another own living unit in land form, whose role uses one slot and whose movement mode is not `FLY`, standing **on or next to the center of a city its owner owns** (Chebyshev distance at most 1). A Thrall is fine.                                     | `BEAM_DOWN_NOT_LEGAL { reason: "NO_PASSENGER" }` |
| 7   | `to` is on the board, one of the eight tiles around the Saucer, land, with no unit and no treasure chest, not a settlement site, not a Rift, not in territory allied to the actor, and enterable by the passenger (a Mountain needs Engineering unless the passenger strides). | `INVALID_TILE { action: "BEAM_DOWN" }`           |

- **Result.** The passenger stands on `to` with the **exhausted activation**
  (it cannot move or act until its owner's next Start Turn) and
  `captureEligible` false, whatever it had done this turn. It keeps its HP,
  Shield, kills, home city, Cooling, and statuses. Field Defense on `to` is
  destroyed when the tile's territory belongs to a player hostile to the
  actor (reason `OCCUPATION`, the disembarkation rule). The passenger reveals
  its sight. The Saucer has used its primary action and is handled.
- **Events:** `UNIT_BEAMED`, `FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then
  the ordinary economy, reward, and achievement tail (the passenger may have
  left a city center).
- Every tile around a Saucer is explored by its owner, so no hidden unit can
  stand on `to` and the command is exact: accepted completely or rejected.
- Beam Down is not a Move: no path, no ZOC, no terrain stop, no Road, no
  treasure, no embarking. The passenger may be exhausted, plagued, or bitten,
  and may have acted this turn.
- **Typical use:** a city trains a Grunt on its center, and a Saucer that
  waited near the front beams it there in the same turn; it fights from the
  next turn.

### 8.2 Mind Control (Brain)

`MIND_CONTROL { kind, unitId, targetUnitId }` is a primary action of the
Brain: a weakened enemy becomes a Thrall. It is not an Attack and costs no
Coins.

Legality, in this order (all rejections are atomic):

| #   | Requirement                                                                                                                                                                                             | Rejection                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `unitId` is the actor's own living unit.                                                                                                                                                                | the ordinary unit errors                              |
| 2   | Its role has `MIND_CONTROL`.                                                                                                                                                                            | `UNIT_ROLE_INVALID { role }`                          |
| 3   | It has not used a primary action and has not landed this turn (it may have moved).                                                                                                                      | `UNIT_ALREADY_ACTED`                                  |
| 4   | It is in land form.                                                                                                                                                                                     | `MIND_CONTROL_NOT_LEGAL { reason: "EMBARKED" }`       |
| 5   | It has no entry in `mindControlCooldowns`.                                                                                                                                                              | `MIND_CONTROL_NOT_LEGAL { reason: "COOLDOWN" }`       |
| 6   | It controls fewer than `MIND_CONTROL_THRALL_LIMIT_V7` (2) Thralls.                                                                                                                                      | `MIND_CONTROL_NOT_LEGAL { reason: "THRALL_LIMIT" }`   |
| 7   | `targetUnitId` is a living unit the actor can see.                                                                                                                                                      | `TARGET_NOT_FOUND`                                    |
| 8   | It is hostile to the actor.                                                                                                                                                                             | `TARGET_ALLIED`                                       |
| 9   | It is in land form (not embarked, naval, or an Egg), its role is not `JUGGERNAUT`, it uses one slot, and it stands neither **on a settlement site** (a city, capital, or village center) nor on a Rift. | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_IMMUNE" }`  |
| 10  | It is within Chebyshev distance 2 of the Brain.                                                                                                                                                         | `MIND_CONTROL_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
| 11  | Its current HP is at most `MIND_CONTROL_HP_V7` (6). A Shield does not count.                                                                                                                            | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_HEALTHY" }` |

- **Result.**
  1. The target **leaves the board as a removal, not a death**: no
     `UNIT_DIED`, no Grave, no rising, no death blast, no kill credit, no
     growth, no Plunder. Its Plague, Bitten, Shield, Cooling, Egg-free slot,
     and capacity all end with it, and everything that depends on it ends as
     if it had left the board (a Lich's Plagues are cleared with
     `PLAGUE_CLEARED`; a Brain's Thralls collapse,
     [section 8.3](#83-thralls)).
  2. A **Thrall** appears on the same tile with the next entity ID
     ([section 8.3](#83-thralls)), with `hp` equal to the target's HP at that
     moment.
  3. The Brain has used its primary action, is handled, and gets the
     cooldown entry `{ unitId, turnsRemaining: 2 }`.
  4. The Thrall reveals its sight; then the economy, reward, and achievement
     tail.
- **Cooldown.**
  `GameStateV7.mindControlCooldowns: readonly { unitId, turnsRemaining }[]`
  (sorted by unit ID, `turnsRemaining` 0 to 2). At the Brain's owner's Start
  Turn, each of that player's entries with `turnsRemaining` 0 is removed and
  every other one loses 1. So after a Mind Control on turn `N` the Brain
  cannot use it on turns `N + 1` and `N + 2` and can again on `N + 3`. The
  cooldown is public on a visible Brain. State parsing rejects an entry
  without a living unit that has `MIND_CONTROL`, a duplicate or unsorted
  entry, and a value outside 0 to 2.
- **Events:** `UNIT_MIND_CONTROLLED`; `UNIT_DIED` (cause `BRAIN_LOST`) for
  each Thrall that collapses when the target was a Brain; `TILES_REVEALED`;
  the tail; the naval blockade and sea-network events (`MIND_CONTROL` joins
  the recompute list, because a collapsing embarked Thrall can lift a
  blockade); `PLAGUE_CLEARED`.
- Only visible units are targets and the tile does not change, so the
  preview equals the result.
- A Plagued or Bitten Brain may use Mind Control. A Thrall of another Martian
  seat is a legal target.

### 8.3 Thralls

**A Thrall is a unit of the `FIGHTER` role owned by a Martian seat, with an
entry in one new list:**

```text
GameStateV7.thralls: readonly { unitId, brainUnitId }[]   // sorted by unitId
```

It resolves through the Martian registration like every unit of that seat, so
it fights with the **Grunt's Attack, Defense, Move, range, Sight, and maximum
HP** and the Grunt's abilities (`ATTACK`, `CAPTURE`). The `thralls` entry
changes exactly these things:

| Rule              | Thrall                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Label and art     | "Thrall"; its own sprite subject                                                                                                      |
| HP when created   | the victim's HP at the Mind Control (1 to 6); maximum HP is the Grunt's (10), so it recovers and is healed toward 10                  |
| Shield            | none: its Shield maximum is 0 and it is never covered by a Force Field                                                                |
| Home and capacity | `homeCityId` is always null: it uses no slot in any city, is never re-homed (not even by a capture it makes), and counts as an orphan |
| Activation        | created exhausted, `kills` 0, `veteran` false, `captureEligible` false; ordinary from its owner's next Start Turn                     |
| Promotion         | never: `PROMOTE` is not offered and is rejected with `PROMOTION_NOT_ELIGIBLE`                                                         |
| Disband           | never: not offered, rejected with `DISBAND_NOT_LEGAL { reason: "THRALL" }` (no Coins from enslaving)                                  |
| Capture, Pillage  | yes, as a Grunt                                                                                                                       |
| Statuses          | living: plagued, bitten, and infected like any unit                                                                                   |
| Psychic Command   | a target (its tactical role is `LINE`)                                                                                                |
| Beam Down         | a legal passenger                                                                                                                     |
| Muster            | counts as the `FIGHTER` role                                                                                                          |
| **Collapse**      | when its Brain leaves the board for any reason, the Thrall is removed                                                                 |

- **Limit.** A Brain controls at most 2 Thralls at a time; a seat's Thralls
  therefore never exceed twice its Brains, and each Brain uses a slot.
- **Collapse.** When a Brain leaves the board (killed, infected, disbanded,
  mind-controlled, removed by displacement or elimination), every Thrall
  whose `brainUnitId` names it is removed at once, in unit-ID order, each
  with `UNIT_DIED { cause: "BRAIN_LOST" }`. These are removals: no kill
  credit, no Plunder, no Grave, no rising even if Bitten, no growth. They
  happen right after the Brain's own death events (its `UNIT_DIED`, Grave or
  rising) and before the advance, Push, and any chain of the same command. A
  Thrall whose Brain embarks keeps its link.
- **State parsing** rejects: an entry without a living unit, or with a
  `brainUnitId` that is not a living unit of the same owner whose role has
  `MIND_CONTROL`; a duplicate or unsorted entry; more than 2 entries for one
  Brain; a Thrall whose owner is not a Martian seat, whose role is not
  `FIGHTER`, whose form is not `LAND` or `EMBARKED`, whose `homeCityId` is
  not null, whose `veteran` is true, or whose `maxHp` is not the `FIGHTER`
  role's; a Thrall with a `shields` entry; and any entry in a match without a
  `MARTIAN` seat.
- **View.** `PlayerViewV7.thralls` lists `{ unitId, brainUnitId }` for every
  visible Thrall; `brainUnitId` is null when the viewer cannot see the Brain
  (the Plague-source precedent). `PlayerViewV7.mindControlCooldowns` lists
  the visible Brains' entries.

Why a `FIGHTER`-role unit with a list entry and not a new role or a new form:
the role order is frozen and every faction's registration, the Showcase,
Muster, the art manifests, and the AI role tables are keyed on its ten roles,
so an eleventh role would touch every faction; and a new unit form would fail
every `form === "LAND"` gate that a Thrall must pass (attack, retaliation,
ZOC, capture, cover). The brief's Thrall already has the Grunt's Attack,
Defense, Move, and range, so one statline serves both and no combat code path
changes. The price is that a change to the Grunt's Attack, Defense, or maximum
HP moves the Thrall too.

### 8.4 Tractor Beam (Mothership)

`TRACTOR_BEAM { kind, unitId, targetUnitId }` is a primary action of the
Mothership: it pulls a unit two tiles away **one tile toward itself**. It is
the mirror of Push. It deals no damage, is not an Attack, and costs no Coins.

- **Actor.** The actor's own living unit with `TRACTOR_BEAM`, in land form,
  that has not used a primary action and has not landed this turn (it may
  have moved).
- **Target.** A living unit the actor can see, **own or hostile** (never
  allied), at Chebyshev distance **exactly 2**, in any form, that is not an
  Egg, whose role is not `JUGGERNAUT`, and that uses one slot.
- **Destination.** With `dx`, `dy` the offset from the target to the
  Mothership, the destination is the target's tile plus
  `(sign(dx), sign(dy))`; it is always next to the Mothership. The pull
  happens only when the destination passes the **existing Push conditions**
  ([current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat)):
  empty, not a settlement site, the same land or water kind as the target's
  tile, enterable by the target (a Mountain needs its owner's Engineering
  unless it strides or flies; a Rift only if it flies; Deep Water needs its
  owner's Navigation), and not in territory allied to the target; and when
  the destination holds **no treasure chest**. The destination is next to the Mothership, so the actor
  has always explored it.
- **Result.** The target stands on the destination. It keeps its HP, Shield,
  statuses, and activation (an own unit that has not acted may still act, and
  an own ray unit that has not moved still fires at full power). Its
  `captureEligible` becomes false. Nothing on either tile changes: no Field
  Defense is destroyed, no treasure is taken. An own target reveals its
  sight. The Mothership has used its primary action and is handled.
- **Rejections (atomic).** The ordinary unit errors; a role without
  `TRACTOR_BEAM` → `UNIT_ROLE_INVALID { role }`; primary action used or
  landed → `UNIT_ALREADY_ACTED`; embarked →
  `TRACTOR_BEAM_NOT_LEGAL { reason: "EMBARKED" }`; unknown, dead, or unseen
  target → `TARGET_NOT_FOUND`; allied target → `TARGET_ALLIED`; an Egg, a
  `JUGGERNAUT`-role unit, or a two-slot unit →
  `TRACTOR_BEAM_NOT_LEGAL { reason: "TARGET_IMMUNE" }`; a distance other than
  2 → `TRACTOR_BEAM_NOT_LEGAL { reason: "OUT_OF_RANGE" }`; an illegal
  destination → `TRACTOR_BEAM_NOT_LEGAL { reason: "BLOCKED" }`. Such a target
  is never offered.
- **Events:** `UNIT_PULLED`, `TILES_REVEALED`, the tail, and the naval
  blockade and sea-network events (`TRACTOR_BEAM` joins the recompute list:
  it can pull a blockader off a dock).
- **What it is for.** A defender pulled off a city center leaves its Walls
  and the center empty; a defender pulled off Field Defense loses it; a unit
  pulled next to the Mothership is in reach of the Martian line; a besieger
  pulled off an own center lifts the siege; an own wounded unit is pulled out
  of contact.
- **No capture in the same turn.** A capture needs a unit that **began its
  owner's turn** on the center. A Martian unit that walks onto the emptied
  center besieges the city, and its owner gets a whole turn, with the pulled
  defender standing next to the center, before any capture
  ([section 9.9](#99-mothership)).

### 8.5 Psychic Command, Strafe, and Push

- **Psychic Command** is Rally under a Martian label for the Brain (command
  `RALLY`, flag `inspired`, event `UNITS_RALLIED`): every adjacent own
  land-form unit with `ATTACK` that is not `SUPPORT` or `SIEGE` and not
  already Inspired gains +1 Attack on its next attack this turn. Grunts,
  Thralls, Saucers, Ray Gunners, Shield Projectors, Motherships, and the
  Colossus are targets; other Brains and Tripods never are.
- **Strafe** is Charge under a Martian label for the Saucer: with Raiding,
  +1 Attack at range 1 on its first attack after a Move of at least two
  tiles.
- **Push** is the Juggernaut's, unchanged, for the Colossus, on an adjacent
  surviving target only (a ray at range 2 never pushes).

## 9. Per-unit battle analysis

This section is the reason the numbers of [section 3](#3-martian-roster)
differ from the brief's. The T-Rex was dominant and the Triceratops useless
in ways the damage formula could have shown beforehand; each Martian unit is
therefore put through the same exchanges before any code exists.

### 9.1 Method

- **Formula.** A scratch script reproduces the damage formula of
  [current rules section 13.2](RULESET_7_CURRENT.md#132-damage) with the
  engine's exact rounding. It was checked against the engine itself: 8,640
  exchanges between the existing units of four factions (every attacking and
  defending land role, three HP levels, Grass and Forest, with and without
  Field Defense) through `calculateCombatPreviewV7` on a hand-built state,
  with no mismatch. The Martian rules of sections 5 and 6 are modelled on top
  of it.
- **Opponents.** Fighter; Guard on Field Defense and on a Walled center;
  Marksman at range 2; Raider with Charge; Knight; Catapult; a Goblin with
  Gang Up +2 and a Goblin Kaboom; Wolf Rider with Charge and Gang Up +1;
  Skeleton; Zombie; Raptor with Pounce; the revision-20 T-Rex (cost 14); and
  the revision-20 Triceratops after a two-tile run-up (Attack 5, fortification
  ignored). Existing units have the values of commit `f1c17bd`.
- **Reading the tables.** "It attacks" is the opponent attacking the Martian
  unit at full HP and full Shield: the whole hit, then what the Shield
  absorbs and the HP lost, then the retaliation the opponent takes. "Such
  attacks to kill" is how many identical fresh attackers kill the unit in
  one turn (the Shield does not recharge in between). "Unit attacks it" is
  the Martian unit attacking: the damage, the target's HP left, and the
  retaliation with the HP it costs after the Shield.
- **Skirmishes** ([section 9.11](#911-skirmishes)) use a simple line model:
  each side has a front row and a back row; melee units attack the enemy
  front row, ranged units attack anything and are not retaliated against by
  melee targets; at most two melee attacks reach one unit per turn (three
  against Goblins); attackers focus fire greedily and skip an attack that
  would kill them without a kill; Shields recharge at the owner's turn; a ray
  unit of the side that advances fires at half power on the first turn; a
  Goblin gets Gang Up +2 when two other Goblins are bound to its target, and
  may Kaboom two front units. It has no terrain and no manoeuvre. It ranks
  options; it does not predict win rates.
- **Opponents are assumed aggressive.** `pulp_wars-9s0.1` makes the Normal AI
  keep constant pressure on known enemy territory before the Martian work
  lands. The early-game check ([section 9.12](#912-early-pressure)) therefore
  uses waves that keep coming and always strike first, not a single raid, and
  assumes earlier and more persistent attacks than the current balance report
  shows.
- **Timing** uses the measurements of the
  [Dinosaur balance report](../validation/RULESET_7_DINOSAUR_BALANCE.md): the
  median decided match ends at round 32; the Normal AI never saves for
  research; it researched Sawmilling in 36–46% of seat-games at a median
  round of 26–30 and Chivalry in 22–36% at round 30–38; a two-slot unit
  waited about nine rounds for two free slots. No measurement exists for
  tier-1 and tier-2 technologies; those rounds are estimates and
  `pulp_wars-t6s.5` reports them.
- **Where the scripts are.** The scratch analysis lives outside the
  repository, in
  `/private/tmp/claude-501/-Users-nadbor-projects-pulp-wars/1d080a8d-9f97-4ca4-af61-87f1be442688/scratchpad/t6s1/`:
  `lib.ts` (the formula, the unit tables, the Shield and ray rules),
  `validate.ts` (the check against the engine), `doc-tables.ts` (the per-unit
  tables), `skirmish.ts`, `pressure.ts`, and `pressure2.ts` (the line and
  wave models), `misc.ts` and `refs.ts` (the single numbers quoted in the
  text), and `run-all.sh`, which regenerates every output. The directory is
  temporary: `pulp_wars-t6s.2` copies what it re-runs into its own scratch
  space, or rewrites it from [section 9.1](#91-method) if the directory is
  gone. The numbers must be re-run on the revision-20 registry and the more
  aggressive AI before any number is coded
  ([section 15](#15-implementation-split-and-test-expectations)).

### 9.2 Grunt

Cost 2, 10 HP, Shield 2, Attack 2, Defense 1.5, Move 1. Human peer: Fighter
(2 Coins, 10 HP, Attack 2, Defense 2).

- **Job.** The cheap body: it holds tiles next to a Shield Projector, screens
  the ray units, and captures.
- **Typical turn.** Stand in the line. Attack only what it can finish, or a
  target whose retaliation the Shield absorbs (a Raider, Knight, Marksman, or
  Goblin retaliates for 2): the Shield it spends on a Fighter's retaliation
  is gone when the enemy moves. Step onto empty centers.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Unit attacks it: damage; HP lost to retaliation |
| ------------------------------ | -------------------------------------------- | -------------------: | ----------------------------------------------- |
| Fighter                        | 5 → 2 / 3; 3                                 |                    3 | 5 (5 left); 5 → 3 HP                            |
| Guard on Field Defense         | 3 → 2 / 1; 3                                 |                    3 | 3 (12 left); 12 → 10 HP                         |
| Guard on a Walled center       | 3 → 2 / 1; 3                                 |                    3 | 3 (12 left); 16 → 10 HP                         |
| Marksman (range 2)             | 5 → 2 / 3; 0                                 |                    3 | 6 (4 left); 2 → 0 HP                            |
| Raider with Charge             | 9 → 2 / 7; 2                                 |                    2 | 6 (4 left); 2 → 0 HP                            |
| Knight                         | 9 → 2 / 7; 2                                 |                    2 | 6 (4 left); 2 → 0 HP                            |
| Catapult (range 2)             | 11 → 2 / 9; 0                                |                    2 | 7 (3 left); 0                                   |
| Goblin, Gang Up +2             | 11 → 2 / 9; 2                                |                    2 | 7 (kills); 0                                    |
| Goblin Kaboom (5)              | 5 → 2 / 3; —                                 |                    3 | —                                               |
| Wolf Rider, Charge, Gang Up +1 | 13 → 2 / 10 (dies); 0                        |                    1 | 6 (4 left); 2 → 0 HP                            |
| Skeleton                       | 5 → 2 / 3; 3                                 |                    3 | 5 (5 left); 5 → 3 HP                            |
| Zombie                         | 5 → 2 / 3; 3                                 |                    3 | 5 (13 left); 5 → 3 HP                           |
| Raptor with Pounce             | 11 → 2 / 9; 2                                |                    2 | 6 (6 left); 2 → 0 HP                            |
| T-Rex                          | 13 → 2 / 10 (dies); 0                        |                    1 | 5 (23 left); 5 → 3 HP                           |
| Triceratops, run-up 2          | 17 → 2 / 10 (dies); 0                        |                    1 | 5 (15 left); 5 → 3 HP                           |

- **Counters.** Three hits in one turn from units with Attack 2 (3, 6, then
  1 HP); two from a Knight, a charging Raider, a Catapult, a Goblin with two
  helpers, or a Raptor after a Pounce; one from a T-Rex, a run-up
  Triceratops, or a charging Wolf Rider with a helper. A Guard or a lone
  Goblin deals 1 HP a turn.
- **Against the Fighter.** A Fighter that attacks a Grunt deals 3 HP and
  takes 3; a Grunt that attacks a Fighter deals 5 and loses 3 HP and its
  Shield. Ten Coins against ten in the line model: 5 Grunts lose 4 Coins and
  kill 10 when they attack first, and lose 10 and kill 8 when attacked first;
  the Fighter mirror gives 10 and 8, and 8 and 10. So a Grunt line is better
  than Fighters when it strikes first and worse when struck first. Against
  12-HP Fighters and against Cavemen it is level (6 and 10, 10 and 6).
  Against chip damage it is better: one Fighter attack per round kills a
  passive Grunt in round 3 and a passive Fighter in round 2.
- **Timing.** Round 1; it is the starting unit.
- **Brief (8 HP).** The same fights gave 10 lost and 8 killed, and 10 lost
  and 2 killed, and under constant pressure the opening fell in round 4 where
  a Fighter opening holds ([section 9.12](#912-early-pressure)): not
  "slightly worse" than a Fighter but clearly worse. At 9 HP the set-piece
  results are close (8 and 10, 10 and 4), but two basic hits still kill it
  (3, then 6), and under pressure the opening falls in round 8. At 10 HP it
  survives two such hits at 1 HP, and that threshold decides the opening.
  **Changed to 10 HP.**
- **Verdict: useful.** It is the first lever of `pulp_wars-t6s.5`. It is
  level with a Caveman and with a 12-HP Fighter; if revision 20 leaves the
  Fighter at 10 HP, the Grunt is ahead of it when it strikes first, and 9 HP
  is the first value to try.

### 9.3 Saucer

Cost 4, 8 HP, Shield 2, Attack 1.5, Defense 1, Move 3, flies. Human peer:
Raider (4 Coins, 10 HP, Attack 2, Defense 1, Move 2, captures, Escape).

- **Job.** Scout, then a landing pad: it delivers what the cities train to
  the front. It is not a fighter.
- **Typical turn.** Early: fly three tiles a turn over Forest, Mountain, and
  units, taking chests. Later: wait, unmoved, two or three tiles behind the
  line; each turn Beam Down the unit a city just trained.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Unit attacks it: damage; HP lost to retaliation |
| ------------------------------ | -------------------------------------------- | -------------------: | ----------------------------------------------- |
| Fighter                        | 6 → 2 / 4; 2                                 |                    2 | 3 (7 left); 5 → 3 HP                            |
| Guard on Field Defense         | 4 → 2 / 2; 2                                 |                    3 | 2 (13 left); 13 → 8 HP                          |
| Guard on a Walled center       | 4 → 2 / 2; 2                                 |                    3 | 2 (13 left); 17 → 8 HP                          |
| Marksman (range 2)             | 6 → 2 / 4; 0                                 |                    2 | 4 (6 left); 2 → 0 HP                            |
| Raider with Charge             | 10 → 2 / 8 (dies); 0                         |                    1 | 4 (6 left); 2 → 0 HP                            |
| Knight                         | 10 → 2 / 8 (dies); 0                         |                    1 | 4 (6 left); 2 → 0 HP                            |
| Catapult (range 2)             | 12 → 2 / 8 (dies); 0                         |                    1 | 5 (5 left); 0                                   |
| Goblin, Gang Up +2             | 12 → 2 / 8 (dies); 0                         |                    1 | 5 (1 left); 1 → 0 HP                            |
| Goblin Kaboom (5)              | 5 → 2 / 3; —                                 |                    2 | —                                               |
| Wolf Rider, Charge, Gang Up +1 | 14 → 2 / 8 (dies); 0                         |                    1 | 4 (6 left); 2 → 0 HP                            |
| Skeleton                       | 6 → 2 / 4; 2                                 |                    2 | 3 (7 left); 5 → 3 HP                            |
| Zombie                         | 6 → 2 / 4; 2                                 |                    2 | 3 (15 left); 5 → 3 HP                           |
| Raptor with Pounce             | 12 → 2 / 8 (dies); 0                         |                    1 | 4 (8 left); 2 → 0 HP                            |
| T-Rex                          | 14 → 2 / 8 (dies); 0                         |                    1 | 3 (25 left); 5 → 3 HP                           |
| Triceratops, run-up 2          | 19 → 2 / 8 (dies); 0                         |                    1 | 3 (17 left); 5 → 3 HP                           |

- **Counters.** Anything that reaches it: a Knight, a Raider with Charge, a
  Catapult, or a Goblin pack kills it in one hit; two Fighters or two
  Marksmen do. It cannot hide in cover. Killing it cuts the supply line.
- **Its own attack** is 3 on a Fighter for 3 HP lost. With Strafe (Raiding)
  it deals 6 to a Fighter, 8 to a Marksman or Captain, and 9 to a Catapult
  (of 10), losing at most 2 HP: a finisher of backline units, not a killer.
- **Against the Raider, as an expander.** A village at distance `d` from the
  capital, both units starting there; "captured" is the turn the capture
  happens.

  | Distance | Raider (4 Coins) | Saucer and Grunt (6 Coins), may Beam Down after moving | Saucer and Grunt, Beam Down only unmoved |
  | -------: | ---------------: | -----------------------------------------------------: | ---------------------------------------: |
  |        4 |           turn 3 |                                                 turn 3 |                                   turn 4 |
  |        6 |           turn 4 |                                                 turn 4 |                                   turn 5 |
  |        8 |           turn 5 |                                                 turn 4 |                                   turn 5 |
  |       10 |           turn 6 |                                                 turn 5 |                                   turn 6 |
  |       12 |           turn 7 |                                                 turn 6 |                                   turn 7 |

  A Raider arrives after `ceil(d / 2)` turns and captures on the next. A
  Saucer needs `ceil((d − 2) / 3)` turns to hover two tiles from the village,
  beams a Grunt next to it, the Grunt steps on the center a turn later and
  captures the turn after. If the Saucer may move and beam in one turn it is
  a turn faster than a Raider from distance 8, and it can then fly on and
  seed the next village. **Changed: Beam Down needs a Saucer that has not
  moved this turn** (one of the brief's two brakes). The pair is then a turn
  slower than a Raider at short range and equal at long range, for 6 Coins
  against 4; it keeps an edge only over Forest and Mountain.

- **Backdoor captures.** A Grunt beamed next to an empty hostile center
  besieges it one turn later and captures two turns later. The owner sees the
  Saucer hover for a turn first and blocks the center by training any unit
  on it. Not a concern; the brief's lever (no destination in hostile
  territory) stays available ([section 16.3](#163-tuning-bounds)).
- **Timing.** Scouting is tier 1: round 1 when it is the free opener, which
  the Normal opener picks only on resource-poor capitals; otherwise when a
  second tier-1 technology is bought (5–6 Coins), an estimated round 5–12.
- **Verdict: useful as logistics, weak as a body.** Beam Down removes the
  walk to the front for every Move-1 Martian unit, which no other faction
  has. The risk is the opposite of dominance: the Normal production value
  (HP minus twice the cost) rates it at zero, as it rated the Spitter that
  was never laid, so `pulp_wars-t6s.3` must give it a bias and a use
  ([section 12](#12-normal-ai-requirements)). Under early pressure it is 4
  Coins that do not defend ([section 9.12](#912-early-pressure)).

### 9.4 Ray Gunner

Cost 4, 8 HP, Shield 2, Attack 3, Defense 1, Move 1, range 1–2, heat ray.
Human peer: Marksman (3 Coins, 10 HP, Attack 2, Defense 1, range 1–2).

- **Job.** The alpha strike: one heavy shot from behind the line, then a
  weak turn.
- **Typical turn.** Ready and unmoved: fire at full power. Cooling: step
  back or sideways, fire at half power. A Brain next to it adds 1.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Full ray on it: damage; taken back | Half ray on it       |
| ------------------------------ | -------------------------------------------- | -------------------: | ---------------------------------- | -------------------- |
| Fighter                        | 6 → 2 / 4; 2                                 |                    2 | 8 (2 left); 0                      | 3 (7 left); 0        |
| Guard on Field Defense         | 4 → 2 / 2; 2                                 |                    3 | 6 (9 left); 0                      | 2 (13 left); 0       |
| Guard on a Walled center       | 4 → 2 / 2; 2                                 |                    3 | 5 (10 left); 0                     | 2 (13 left); 0       |
| Marksman (range 2)             | 6 → 2 / 4; 2                                 |                    2 | 10 (kills); 0                      | 4 (6 left); 2 → 0 HP |
| Raider with Charge             | 10 → 2 / 8 (dies); 0                         |                    1 | 10 (kills); 0                      | 4 (6 left); 0        |
| Knight                         | 10 → 2 / 8 (dies); 0                         |                    1 | 10 (kills); 0                      | 4 (6 left); 0        |
| Catapult (range 2)             | 12 → 2 / 8 (dies); 0                         |                    1 | 12 (kills); 0                      | 5 (5 left); 1 → 0 HP |
| Goblin, Gang Up +2             | 12 → 2 / 8 (dies); 0                         |                    1 | 12 (kills); 0                      | 5 (1 left); 0        |
| Goblin Kaboom (5)              | 5 → 2 / 3; —                                 |                    2 | —                                  | —                    |
| Wolf Rider, Charge, Gang Up +1 | 14 → 2 / 8 (dies); 0                         |                    1 | 10 (kills); 0                      | 4 (6 left); 0        |
| Skeleton                       | 6 → 2 / 4; 2                                 |                    2 | 8 (2 left); 0                      | 3 (7 left); 0        |
| Zombie                         | 6 → 2 / 4; 2                                 |                    2 | 8 (10 left); 0                     | 3 (15 left); 0       |
| Raptor with Pounce             | 12 → 2 / 8 (dies); 0                         |                    1 | 10 (2 left); 0                     | 4 (8 left); 0        |
| T-Rex                          | 14 → 2 / 8 (dies); 0                         |                    1 | 8 (20 left); 0                     | 3 (25 left); 0       |
| Triceratops, run-up 2          | 19 → 2 / 8 (dies); 0                         |                    1 | 8 (12 left); 0                     | 3 (17 left); 0       |

- **Counters.** As for the Saucer: one hit from a Knight or a charging
  Raider, two from Fighters or Marksmen. It out-ranges nothing: a Marksman or
  Bomb Chucker shoots back at range 2, and a Catapult out-ranges it.
- **Against the Marksman.** Standing still against fresh Fighters it deals
  8 + 3 = 11 in two turns, a Marksman 5 + 5 = 10; against Guards 7 + 2 = 9
  and 4 + 4 = 8. Per Coin it is behind (4 against 3). While advancing it
  always fires at half power (3 on a Fighter; a Marksman 5). What it buys is
  the burst: a full ray kills a Raider, Knight, Marksman, or Wolf Rider
  outright and leaves a Fighter at 2 HP, in reach of Mind Control.
- **Timing.** Marksmanship is tier 2 (Hunting first): an estimated round
  8–18.
- **Brief (Attack 3.5, full power even after moving).** A full ray kills a
  Fighter, Skeleton, Raider, Knight, Marksman, Wolf Rider, Vampire, or Lich
  outright from two tiles away, for 4 Coins; two turns give 10 + 3 = 13
  against the Marksman's 10 (30% more). **Changed to Attack 3, and a ray
  fires at full power only from a unit that has not moved.** The two-turn
  output is 11 against 10, and the one-shot is limited to units with 10 HP
  and Defense 1.
- **Verdict: useful.** Against a 12-HP Fighter the full ray leaves 4 HP,
  which changes nothing. It is the faction's best defender against a walking
  attacker: waves of three Fighters every two rounds break a Human opening
  with a Marksman in round 7 and do not break 3 Grunts with a Ray Gunner
  ([section 9.12](#912-early-pressure)).

### 9.5 Shield Projector

Cost 4, 12 HP, Shield 3, Attack 1.5, Defense 2.5, Move 1, no attack after
moving. Human peer: Guard (3 Coins, 15 HP, Attack 1.5, Defense 3, Field
Defense).

- **Job.** The Force Field: units that recharge next to it have Shield 4. It
  is also the nearest thing the roster has to a sturdy body.
- **Typical turn.** Stay in the second row, touching as many front units as
  possible; with Force Fields, end the turn there.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Unit attacks it: damage; HP lost to retaliation |
| ------------------------------ | -------------------------------------------- | -------------------: | ----------------------------------------------- |
| Fighter                        | 4 → 3 / 1; 6                                 |                    4 | 3 (7 left); 5 → 2 HP                            |
| Guard on Field Defense         | 3 → 3 / 0; 7                                 |                    5 | 2 (13 left); 13 → 10 HP                         |
| Guard on a Walled center       | 3 → 3 / 0; 7                                 |                    5 | 2 (13 left); 17 → 12 HP                         |
| Marksman (range 2)             | 4 → 3 / 1; 0                                 |                    4 | 4 (6 left); 2 → 0 HP                            |
| Raider with Charge             | 7 → 3 / 4; 5                                 |                    2 | 4 (6 left); 2 → 0 HP                            |
| Knight                         | 7 → 3 / 4; 5                                 |                    2 | 4 (6 left); 2 → 0 HP                            |
| Catapult (range 2)             | 9 → 3 / 6; 0                                 |                    2 | 5 (5 left); 0                                   |
| Goblin, Gang Up +2             | 9 → 3 / 6; 5                                 |                    2 | 5 (1 left); 1 → 0 HP                            |
| Goblin Kaboom (5)              | 5 → 3 / 2; —                                 |                    3 | —                                               |
| Wolf Rider, Charge, Gang Up +1 | 11 → 3 / 8; 4                                |                    2 | 4 (6 left); 2 → 0 HP                            |
| Skeleton                       | 4 → 3 / 1; 6                                 |                    4 | 3 (7 left); 5 → 2 HP                            |
| Zombie                         | 4 → 3 / 1; 6                                 |                    4 | 3 (15 left); 5 → 2 HP                           |
| Raptor with Pounce             | 9 → 3 / 6; 5                                 |                    2 | 4 (8 left); 2 → 0 HP                            |
| T-Rex                          | 11 → 3 / 8; 4                                |                    2 | 3 (25 left); 5 → 2 HP                           |
| Triceratops, run-up 2          | 15 → 3 / 12 (dies); 0                        |                    1 | 3 (17 left); 5 → 2 HP                           |

- **What the field does.** A Grunt in the field loses 1 HP to a Fighter,
  Marksman, Caveman, or Kaboom instead of 3; after two such hits it has 4 HP
  left instead of 1; a Goblin with Gang Up +2 leaves it at 3 HP instead
  of 1. A Ray Gunner, Saucer, or Brain loses 2 HP to a Fighter in the field
  instead of 4, and still dies to a second hit. Nothing absorbs a hit of 5
  completely.
- **Counters.** Kill it: four Fighter hits (1, 4, 5, 2), two from a Knight or
  a charging Raider, and its retaliation of 6 is milder than a Guard's 8.
  Spread out so that it covers little. Use ranged units, which take no
  retaliation while they strip Shields.
- **Against the Guard.** A Guard also needs four Fighter hits (4, 4, 5, 2)
  and punishes each with 8. The Projector is a worse wall for one Coin more;
  the Coin buys the field. In the line model a Projector and 3 Grunts
  (10 Coins) against 4 Fighters and a Guard (11) lose 8 and kill 11, and lose
  4 and kill 11. Over twelve fights (six equal-cost enemy groups, both
  orders) the group kills 19 Coins more than it loses with the field and
  loses 34 more than it kills without it. A Marksman in the enemy group or a
  Goblin pack still beats it (10 lost against 11 Goblins in both orders).
- **Timing.** Drill is tier 1: as early as round 1. Under heavy early
  pressure it must not be the first purchase: two Grunts and a Projector fall
  in round 2 to waves that two Grunts and a third Grunt hold
  ([section 9.12](#912-early-pressure)).
- **Brief (Shield 4, Defense 3, cost 5, "+2 Shield", and a Force Fields
  technology of +1 on every unit).** A Grunt would recharge to 2 + 2 + 1 = 5:
  one Kaboom, one Fighter, or one Marksman hit a turn would do nothing to any
  unit in the clump, which is the immunity the brief asked to rule out; in
  the line model that clump lost 4 Coins and killed 11 in both orders.
  **Changed:** the field recharges units **to 4** (so no Shield exceeds 4),
  the technology gives a second recharge instead of +1
  ([section 5.5](#55-force-fields-technology)), and the Projector is cheaper
  and softer (cost 4, Shield 3, Defense 2.5) so that attacking it is a real
  option.
- **Verdict: useful, and the piece a Martian line depends on.** Watch item:
  with Force Fields a Projector and 3 Grunts that strike first lose nothing
  against 4 Fighters and a Guard; the bounds allow a field of 3.

### 9.6 Brain

Cost 5, 8 HP, Shield 2, Attack 1, Defense 1, Move 1. Human peer: Captain
(5 Coins, 10 HP, Rally, Tend Wounded).

- **Job.** Psychic Command for the shooters, and Mind Control: turn a
  weakened enemy into a blocker.
- **Typical turn.** Stand behind a Ray Gunner. Either give Psychic Command
  (its full ray then deals 12 to a Fighter instead of 8), or take a unit at
  6 HP or less within two tiles.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Unit attacks it: damage; HP lost to retaliation |
| ------------------------------ | -------------------------------------------- | -------------------: | ----------------------------------------------- |
| Fighter                        | 6 → 2 / 4; 2                                 |                    2 | 2 (8 left); 6 → 4 HP                            |
| Guard on Field Defense         | 4 → 2 / 2; 2                                 |                    3 | 1 (14 left); 14 → 8 HP                          |
| Guard on a Walled center       | 4 → 2 / 2; 2                                 |                    3 | 1 (14 left); 19 → 8 HP                          |
| Marksman (range 2)             | 6 → 2 / 4; 0                                 |                    2 | 2 (8 left); 2 → 0 HP                            |
| Raider with Charge             | 10 → 2 / 8 (dies); 0                         |                    1 | 2 (8 left); 2 → 0 HP                            |
| Knight                         | 10 → 2 / 8 (dies); 0                         |                    1 | 2 (8 left); 2 → 0 HP                            |
| Catapult (range 2)             | 12 → 2 / 8 (dies); 0                         |                    1 | 3 (7 left); 0                                   |
| Goblin, Gang Up +2             | 12 → 2 / 8 (dies); 0                         |                    1 | 3 (3 left); 1 → 0 HP                            |
| Goblin Kaboom (5)              | 5 → 2 / 3; —                                 |                    2 | —                                               |
| Wolf Rider, Charge, Gang Up +1 | 14 → 2 / 8 (dies); 0                         |                    1 | 2 (8 left); 2 → 0 HP                            |
| Skeleton                       | 6 → 2 / 4; 2                                 |                    2 | 2 (8 left); 6 → 4 HP                            |
| Zombie                         | 6 → 2 / 4; 2                                 |                    2 | 2 (16 left); 6 → 4 HP                           |
| Raptor with Pounce             | 12 → 2 / 8 (dies); 0                         |                    1 | 2 (10 left); 2 → 0 HP                           |
| T-Rex                          | 14 → 2 / 8 (dies); 0                         |                    1 | 2 (26 left); 6 → 4 HP                           |
| Triceratops, run-up 2          | 19 → 2 / 8 (dies); 0                         |                    1 | 2 (18 left); 6 → 4 HP                           |

- **What is convertible.** Any full-HP Goblin (6 HP). After one Grunt hit: a
  Fighter (5 left), Raider, Knight, Marksman, Wolf Rider, Skeleton (4–5), a
  Catapult (3), a Raptor (6). After one full ray: also a Caveman (4) and a
  12-HP Fighter (4). A Guard, Orc Brute, Zombie, or Ankylosaurus needs two
  hits. A unit on a city or village center is never a target.
- **Counters.** Kill the Brain: every Thrall it controls collapses. It dies
  to the same hits as a Saucer. Keep wounded units three tiles away (its
  Move 1 plus range 2), or on a center.
- **Against the Captain.** Same cost and the same +1 Attack. The Captain
  heals 2 and cures; the Brain removes one weakened unit every third turn
  without retaliation, wherever it stands except on a center, and gains a
  body of 1 to 6 HP.
- **Snowball check.** One conversion per three turns, at most two Thralls per
  Brain, and both collapse with it. Against Goblins a Brain trades one of its
  three turns for a 1-Coin Goblin and a 6-HP Thrall that the next ganged-up
  Goblin kills. With rays, Mind Control replaces the second shot on a target
  the first shot already crippled. Neither compounds.
- **Timing.** Administration is tier 2 (Gathering first): an estimated round
  8–18.
- **Brief.** Capacity "like Zombies" in the Brain's city would make Mind
  Control illegal whenever that city is full, which the Dinosaur report
  measured on half of all city-turns. **Changed:** Thralls use no city slot;
  the limit is 2 per Brain, and Thralls collapse when the Brain is lost.
- **Verdict: useful, not dominant.**

### 9.7 Thrall

No cost, 1–6 HP when created (maximum 10), no Shield, Attack 2, Defense 1.5,
Move 1, captures. The table shows a Thrall at 6 of 10 HP.

- **Job.** The meat shield: a body in front of the rays that the enemy must
  spend an attack on, and a spare capturer.
- **Typical turn.** Step in front of a Ray Gunner or onto a center. Attack
  only to finish something.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Unit attacks it: damage; HP lost to retaliation |
| ------------------------------ | -------------------------------------------- | -------------------: | ----------------------------------------------- |
| Fighter                        | 6 → 0 / 6 (dies); 0                          |                    1 | 3 (7 left); 6 → 6 HP                            |
| Guard on Field Defense         | 4 → 0 / 4; 3                                 |                    2 | 2 (13 left); 14 → 6 HP                          |
| Guard on a Walled center       | 4 → 0 / 4; 3                                 |                    2 | 2 (13 left); 18 → 6 HP                          |
| Marksman (range 2)             | 6 → 0 / 6 (dies); 0                          |                    1 | 5 (5 left); 2 → 2 HP                            |
| Raider with Charge             | 10 → 0 / 6 (dies); 0                         |                    1 | 5 (5 left); 2 → 2 HP                            |
| Knight                         | 10 → 0 / 6 (dies); 0                         |                    1 | 5 (5 left); 2 → 2 HP                            |
| Catapult (range 2)             | 13 → 0 / 6 (dies); 0                         |                    1 | 6 (4 left); 0                                   |
| Goblin, Gang Up +2             | 13 → 0 / 6 (dies); 0                         |                    1 | 6 (kills); 0                                    |
| Goblin Kaboom (5)              | 5 → 0 / 5; —                                 |                    2 | —                                               |
| Wolf Rider, Charge, Gang Up +1 | 15 → 0 / 6 (dies); 0                         |                    1 | 5 (5 left); 2 → 2 HP                            |
| Skeleton                       | 6 → 0 / 6 (dies); 0                          |                    1 | 3 (7 left); 6 → 6 HP                            |
| Zombie                         | 6 → 0 / 6 (dies); 0                          |                    1 | 3 (15 left); 6 → 6 HP                           |
| Raptor with Pounce             | 13 → 0 / 6 (dies); 0                         |                    1 | 5 (7 left); 2 → 2 HP                            |
| T-Rex                          | 15 → 0 / 6 (dies); 0                         |                    1 | 3 (25 left); 6 → 6 HP                           |
| Triceratops, run-up 2          | 19 → 0 / 6 (dies); 0                         |                    1 | 3 (17 left); 6 → 6 HP                           |

- **Counters.** Any one hit kills it. Killing its Brain removes it for
  nothing.
- **Cost-efficiency.** It is free, and worth about half a Grunt: one enemy
  attack absorbed, one tile blocked, zone of control exerted.
- **Massing.** At most two per Brain, and a Brain costs 5 Coins and a slot.
  A seat with three Brains has at most six Thralls with 36 HP between them,
  for the price of 15 Coins of Brains that all have to stay alive.
- **Timing.** With the first Brain.
- **Verdict: useful as a blocker, never a threat.**

### 9.8 Tripod

Cost 9, one slot, 12 HP, Shield 2, Attack 4, Defense 1, Move 2, range 1–2,
strides, heat ray, Pierce. Human peer: Catapult (8 Coins, 10 HP, Attack 3.5,
Defense 0.5, Move 1, range 2–3, cannot attack after moving).

- **Job.** The heavy ray: it kills a 10-HP unit with one full shot, hits the
  unit behind it, and removes Field Defense.
- **Typical turn.** Ready: stand and fire at full power along a line of two
  enemies. Cooling: stride two tiles over any terrain to the next firing
  position and fire at half power.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Full ray on it: damage; taken back | Half ray on it       |
| ------------------------------ | -------------------------------------------- | -------------------: | ---------------------------------- | -------------------- |
| Fighter                        | 6 → 2 / 4; 2                                 |                    3 | 12 (kills); 0                      | 5 (5 left); 0        |
| Guard on Field Defense         | 4 → 2 / 2; 2                                 |                    4 | 9 (6 left); 0                      | 3 (12 left); 0       |
| Guard on a Walled center       | 4 → 2 / 2; 2                                 |                    4 | 8 (7 left); 0                      | 3 (12 left); 0       |
| Marksman (range 2)             | 6 → 2 / 4; 2                                 |                    3 | 14 (kills); 0                      | 6 (4 left); 2 → 0 HP |
| Raider with Charge             | 10 → 2 / 8; 1                                |                    2 | 14 (kills); 0                      | 6 (4 left); 0        |
| Knight                         | 10 → 2 / 8; 1                                |                    2 | 14 (kills); 0                      | 6 (4 left); 0        |
| Catapult (range 2)             | 12 → 2 / 10; 1                               |                    2 | 16 (kills); 0                      | 7 (3 left); 0        |
| Goblin, Gang Up +2             | 12 → 2 / 10; 1                               |                    2 | 16 (kills); 0                      | 7 (kills); 0         |
| Goblin Kaboom (5)              | 5 → 2 / 3; —                                 |                    3 | —                                  | —                    |
| Wolf Rider, Charge, Gang Up +1 | 14 → 2 / 12 (dies); 0                        |                    1 | 14 (kills); 0                      | 6 (4 left); 0        |
| Skeleton                       | 6 → 2 / 4; 2                                 |                    3 | 12 (kills); 0                      | 5 (5 left); 0        |
| Zombie                         | 6 → 2 / 4; 2                                 |                    3 | 12 (6 left); 0                     | 5 (13 left); 0       |
| Raptor with Pounce             | 12 → 2 / 10; 1                               |                    2 | 14 (kills); 0                      | 6 (6 left); 0        |
| T-Rex                          | 14 → 2 / 12 (dies); 0                        |                    1 | 12 (16 left); 0                    | 5 (23 left); 0       |
| Triceratops, run-up 2          | 19 → 2 / 12 (dies); 0                        |                    1 | 12 (8 left); 0                     | 5 (15 left); 0       |

- **Counters.** Three Fighter hits (4, 7, 1); a Knight leaves it at 4 HP and
  anything finishes it; a charging Raider and a Fighter kill it; a Catapult
  leaves it at 2. It never has cover. Rush it on its Cooling turn, when it
  deals 5 to a Fighter instead of 12.
- **Against the Catapult.** Standing still against fresh Fighters: Tripod
  12 + 5 = 17 in two turns, Catapult 10 + 10 = 20; against Guards 14 and 16.
  The Tripod's sustained fire is lower. It is ahead in everything else: it
  shoots at half power after moving two tiles (the Catapult cannot shoot
  after moving at all), survives three Fighter hits (the Catapult two), and
  pierces for half the hit (6 behind a Fighter at full power).
- **Threat radius.** A full-power ray needs a Tripod that has not moved: two
  tiles. After a two-tile Move it reaches four tiles at half power, a 5 on a
  Fighter, which is a Marksman's shot.
- **Timing.** Sawmilling is tier 3: by the Dinosaur measurements a Normal
  seat reaches it in under half of its games, at a median round of 26–30,
  with the median match ending at round 32. A human player who heads for it
  has it by about round 12–15.
- **Brief (16 HP, Shield 3, Defense 1.5, two slots, full power after
  moving).** This is the T-Rex again. A Fighter hit cost it 2 HP; it took
  four Fighters, or a charging Raider and two Fighters, or two Knights, to
  kill it in a turn; and it could stride two tiles over anything and delete a
  Fighter, Raider, Knight, or Marksman from two more tiles away, taking
  nothing back. **Changed:** 12 HP, Shield 2, Defense 1; full power only when
  it has not moved (the brief's second option; Move 2 and firing after
  moving are kept, because a unit that trails the army is never used); and
  **one slot**, because a two-slot unit behind a tier-3 technology waited
  nine rounds for slots and came after the match was decided.
- **Verdict: useful and punishable.** The remaining risk is that it is rare,
  not that it is strong: [section 12](#12-normal-ai-requirements) asks for a
  research priority, and moving its unlock to a tier-2 technology is a
  pre-approved fallback ([section 16.3](#163-tuning-bounds)).

### 9.9 Mothership

Cost 10, two slots, 16 HP, Shield 4, Attack 2.5, Defense 2, Move 2, flies,
Tractor Beam. Human peer: Knight (9 Coins, 10 HP, Attack 3, Defense 1,
Move 3, Overrun).

- **Job.** Position: it pulls defenders out of Walls and Field Defense,
  empties city centers, and drags targets into the line. It finishes wounded
  units; it does not kill healthy ones.
- **Typical turn.** Fly over the line to a tile two away from a fortified
  defender, pull it out, and let the rays shoot it in the open and a Grunt
  walk onto the center.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Unit attacks it: damage; HP lost to retaliation |
| ------------------------------ | -------------------------------------------- | -------------------: | ----------------------------------------------- |
| Fighter                        | 5 → 4 / 1; 5                                 |                    4 | 6 (4 left); 4 → 0 HP                            |
| Guard on Field Defense         | 3 → 3 / 0; 5                                 |                    6 | 4 (11 left); 11 → 7 HP                          |
| Guard on a Walled center       | 3 → 3 / 0; 5                                 |                    6 | 4 (11 left); 15 → 11 HP                         |
| Marksman (range 2)             | 5 → 4 / 1; 0                                 |                    4 | 8 (2 left); 1 → 0 HP                            |
| Raider with Charge             | 8 → 4 / 4; 4                                 |                    3 | 8 (2 left); 1 → 0 HP                            |
| Knight                         | 8 → 4 / 4; 4                                 |                    3 | 8 (2 left); 1 → 0 HP                            |
| Catapult (range 2)             | 10 → 4 / 6; 0                                |                    2 | 9 (1 left); 0                                   |
| Goblin, Gang Up +2             | 10 → 4 / 6; 3                                |                    2 | 9 (kills); 0                                    |
| Goblin Kaboom (5)              | 5 → 4 / 1; —                                 |                    4 | —                                               |
| Wolf Rider, Charge, Gang Up +1 | 12 → 4 / 8; 3                                |                    2 | 8 (2 left); 1 → 0 HP                            |
| Skeleton                       | 5 → 4 / 1; 5                                 |                    4 | 6 (4 left); 4 → 0 HP                            |
| Zombie                         | 5 → 4 / 1; 5                                 |                    4 | 6 (12 left); 4 → 0 HP                           |
| Raptor with Pounce             | 10 → 4 / 6; 3                                |                    2 | 8 (4 left); 1 → 0 HP                            |
| T-Rex                          | 12 → 4 / 8; 3                                |                    2 | 6 (22 left); 4 → 0 HP                           |
| Triceratops, run-up 2          | 16 → 4 / 12; 3                               |                    2 | 6 (14 left); 4 → 0 HP                           |

- **Counters.** Four Fighter or Marksman hits in a turn (1, 5, 6, 4); two
  Knights and a Fighter; two hits from a T-Rex or a run-up Triceratops. It
  never has cover or Walls. Keep two units at a city it can reach.
- **Against the Knight.** A Knight kills a Marksman, Raider, or Catapult with
  each attack and chains kills, and dies to two Fighter hits. The Mothership
  never one-shots a 10-HP unit (8 to a Marksman, 6 to a Fighter, taking no HP
  damage from either) and takes four Fighter hits.
- **The city test.** A Guard on a Walled center with Field Defense takes 5
  from a full Ray Gunner ray, 7 from a Tripod, and kills a Grunt that attacks
  it. Pulled one tile out, it takes 7 and 10: a Tripod and a Ray Gunner kill
  it in that turn (10, then 10 on the remaining 5 HP). **Can the city then be
  captured at once? No:** capture needs a unit that began its owner's turn on
  the center, so the earliest capture is the Martian player's next turn. A
  Grunt that walks onto the emptied center (10 HP, Shield 2, no fortification
  on a foreign center) must first survive the owner's whole turn: the pulled
  Guard and two Fighters kill it (1, 5, 4), and so do a Knight and the Guard
  (7, 3); one unit alone does not. So **a city with a single defender and no
  relief in reach is lost a turn later.** That is the same opening a
  Juggernaut's Push or a Triceratops's Charge! makes today, one turn faster
  than Charge!, from two tiles away, without damage. It is the strongest
  anti-city ability in the game and it is kept by root ruling, Walled
  centers included, as a watch item for balance
  ([section 16.4](#164-balance-acceptance)).
- **Timing.** Chivalry is tier 3 behind Scouting and Raiding: the measured
  equivalent, the T-Rex, appeared in 17% of seat-games at a median round
  of 38. With two slots it will be rarer than the Tripod.
- **Brief (20 HP, Attack 3).** Attack 3 kills a Marksman, Raider, Knight, or
  Catapult each turn and deals 8 to a Fighter, and the Shield absorbs the
  Fighter's whole retaliation of 4; it took five Fighter hits to kill. A
  flyer that ignores ZOC and terrain and removes one backline unit a turn for
  nothing is a killer, which the brief says it must not be. **Changed:**
  Attack 2.5 and 16 HP.
- **Verdict: useful in a siege, modest in the field, rare.** Watch item: the
  Tractor Beam against cities.

### 9.10 Colossus

Reward only, two slots, 32 HP, Shield 3, Attack 4, Defense 3, Move 1, range
1–2, strides, heat ray, Push. Human peer: Juggernaut (40 HP, Attack 4,
Defense 4, melee, Push).

- **Job.** A walking battery for the late game: it reaches a position over
  any terrain, then fires 12, 5, 12, 5.
- **Typical turn.** Arrive, stand, fire at full power every other turn; push
  whatever reaches it.

| Opponent                       | It attacks: hit → Shield / HP lost; it takes | Such attacks to kill | Full ray on it: damage; taken back | Half ray on it       |
| ------------------------------ | -------------------------------------------- | -------------------: | ---------------------------------- | -------------------- |
| Fighter                        | 4 → 3 / 1; 8                                 |                    8 | 12 (kills); 0                      | 5 (5 left); 0        |
| Guard on Field Defense         | 2 → 2 / 0; 9                                 |                   12 | 9 (6 left); 0                      | 3 (12 left); 0       |
| Guard on a Walled center       | 2 → 2 / 0; 9                                 |                   12 | 8 (7 left); 0                      | 3 (12 left); 0       |
| Marksman (range 2)             | 4 → 3 / 1; 8                                 |                    8 | 14 (kills); 0                      | 6 (4 left); 2 → 0 HP |
| Raider with Charge             | 7 → 3 / 4; 7                                 |                    5 | 14 (kills); 0                      | 6 (4 left); 0        |
| Knight                         | 7 → 3 / 4; 7                                 |                    5 | 14 (kills); 0                      | 6 (4 left); 0        |
| Catapult (range 2)             | 8 → 3 / 5; 6                                 |                    4 | 16 (kills); 0                      | 7 (3 left); 0        |
| Goblin, Gang Up +2             | 8 → 3 / 5; 6                                 |                    4 | 16 (kills); 0                      | 7 (kills); 0         |
| Goblin Kaboom (5)              | 5 → 3 / 2; —                                 |                    7 | —                                  | —                    |
| Wolf Rider, Charge, Gang Up +1 | 10 → 3 / 7; 6                                |                    3 | 14 (kills); 0                      | 6 (4 left); 0        |
| Skeleton                       | 4 → 3 / 1; 8                                 |                    8 | 12 (kills); 0                      | 5 (5 left); 0        |
| Zombie                         | 4 → 3 / 1; 8                                 |                    8 | 12 (6 left); 0                     | 5 (13 left); 0       |
| Raptor with Pounce             | 8 → 3 / 5; 6                                 |                    4 | 14 (kills); 0                      | 6 (6 left); 0        |
| T-Rex                          | 10 → 3 / 7; 6                                |                    3 | 12 (16 left); 0                    | 5 (23 left); 0       |
| Triceratops, run-up 2          | 14 → 3 / 11; 5                               |                    3 | 12 (8 left); 0                     | 5 (15 left); 0       |

- **Counters.** Eight Fighter hits in a turn (1, 4, 4, 4, 5, 5, 6, 3); three
  from a T-Rex or a run-up Triceratops. It never has cover. Each Fighter that
  hits it takes 8.
- **Against the Juggernaut.** A Juggernaut takes ten Fighter hits and deals
  12 to a Fighter every turn in melee. The Colossus takes eight, deals 12
  only on alternate turns (5 on the others and whenever it moved), and does
  it from two tiles away without retaliation. A Juggernaut that attacks a
  Colossus deals 7 HP and takes 6; a full ray on a Juggernaut deals 9.
- **Timing.** A level-5 city reward: late, like every giant.
- **Brief (36 HP, Shield 5, Attack 3.5).** A Fighter, Skeleton, Zombie,
  Caveman, Raider, Marksman, or Orc Brute hit for 4 did **no HP damage at
  all**, and a Guard or Goblin for 2 neither; nine Fighter hits were needed in
  one turn and each cost the Fighter 8. A high Defense makes every hit small,
  and a Shield of 5 then erases it: the unit would be immune to every basic
  unit that came alone. **Changed:** Shield 3 and 32 HP, so every Fighter hit
  costs at least 1 HP, and Attack 4 so that its half-power ray while walking
  (5 on a Fighter) is worth firing.
- **Verdict: reward-tier parity.** It is sturdier than it looks against small
  hits and weaker than a Juggernaut against big ones.
- **Measured (`pulp_wars-t6s.5`).** In Normal matches it was not: it traded
  17.8 kills per loss (peers 2.9–6.5) and almost never died. Defense is now
  2.5 ([tuning record](#165-tuning-record)); the analysis above uses the
  contract's Defense 3.

### 9.11 Skirmishes

Coins lost by the Martians / Coins lost by the enemy, in the line model of
[section 9.1](#91-method). The reference Fighter mirror gives 10 / 8 for the
side that attacks first.

| Fight (Coins)                                                                         | Martians attack first | Enemy attacks first |
| ------------------------------------------------------------------------------------- | --------------------: | ------------------: |
| 5 Grunts (10) against 5 Fighters (10), open ground                                    |                4 / 10 |              10 / 8 |
| 5 Grunts against 5 Fighters with 12 HP                                                |                6 / 10 |              10 / 6 |
| 3 Grunts and a Ray Gunner (10) against 2 Fighters and 2 Marksmen (10)                 |                4 / 10 |              4 / 10 |
| Shield Projector and 3 Grunts (10) against 4 Fighters and a Guard (11)                |                8 / 11 |              4 / 11 |
| the same against 4 Fighters with 12 HP and a Guard                                    |                4 / 11 |               6 / 8 |
| Shield Projector and 2 Grunts (8) against 4 Fighters (8)                              |                 8 / 4 |               4 / 8 |
| 3 Grunts and a Ray Gunner (10) against 2 Fighters and 2 Guards on Field Defense (10)  |                6 / 10 |              6 / 10 |
| 2 Grunts and 2 Ray Gunners (12) against 3 Fighters and 2 Guards on Field Defense (12) |                8 / 12 |              12 / 6 |
| 5 Grunts (10) against 10 Goblins (10); 5 Fighters give 4 / 10 and 10 / 4              |                6 / 10 |              10 / 2 |
| Shield Projector and 3 Grunts (10) against 11 Goblins (11)                            |                10 / 4 |              10 / 1 |
| 5 Grunts against 5 Skeletons                                                          |                4 / 10 |              10 / 8 |
| 6 Grunts (12) against 4 Zombies (12)                                                  |                8 / 12 |              8 / 12 |
| 5 Grunts against 5 Cavemen                                                            |                6 / 10 |              10 / 6 |
| 6 Grunts (12) against 3 Raptors (12)                                                  |                0 / 12 |              4 / 12 |
| 3 Grunts and 2 Ray Gunners (14) against a T-Rex (14)                                  |                0 / 14 |              2 / 14 |
| Tripod and 3 Grunts (15) against a Knight and 3 Fighters (15)                         |                2 / 15 |              6 / 15 |
| Tripod and 3 Grunts (15) against a Catapult, 2 Fighters, and a Guard (15)             |                4 / 15 |             15 / 13 |

What the skirmishes say:

- **Who strikes first matters more than for other factions.** The side that
  fires its full-power rays first, with Shields up, wins heavily; struck
  first by ranged units, or caught Cooling, the same force loses. That is the
  intended glass cannon, and it is what a human opponent can exploit.
- The Grunt line is level with 12-HP Fighters and Cavemen, ahead of today's
  Fighters and Skeletons when it strikes first and behind them when struck
  first, and behind a Goblin pack.
- The Force Field makes a line that beats melee groups of equal cost; it
  does not save it from a Goblin pack, and a small group that pays 4 of its
  8 Coins for a Projector loses to 4 Fighters when it attacks.
- Rays answer the big units: two Ray Gunners and three Grunts kill a T-Rex of
  the same cost.
- With Force Fields the 5 Grunts that are attacked first by 5 Fighters lose
  8 and kill 10 instead of losing 10 and killing 8.

### 9.12 Early pressure

The Normal AI is being made aggressive and expansionist
(`pulp_wars-9s0.1`), so a Martian opening must stand **constant** pressure,
not one raid. Two models.

**One raid**, the attackers moving first:

| Attackers (Coins) | Defenders (Coins)              | Attackers lose | Defenders lose | The same against Fighters |
| ----------------- | ------------------------------ | -------------: | -------------: | ------------------------- |
| 2 Raiders (8)     | 1 Grunt (2)                    |              0 |              2 | 0 and 2                   |
| 2 Raiders (8)     | 2 Grunts (4)                   |              8 |              2 | 8 and 2                   |
| 2 Raiders (8)     | Grunt and Saucer (6)           |              8 |              4 | —                         |
| 3 Raiders (12)    | Grunt and Shield Projector (6) |             12 |              0 | —                         |
| 2 Wolf Riders (6) | 2 Grunts (4)                   |              3 |              4 | 6 and 2                   |
| 2 Raptors (8)     | 3 Grunts (6)                   |              8 |              2 | 8 and 4                   |

**Waves that keep coming.** The defender starts with two base units and
trains one more each round (2 Coins a round); a wave arrives every round or
every second round, **always strikes first**, and stays until it is dead.
"Holds" means the defender still has a unit after 12 rounds; otherwise the
round in which the last defender dies. In brackets: Coins the defender lost /
Coins the attacker lost.

| Waves                                | 2 Fighters, then Fighters | 2 Grunts, then Grunts | 2 Grunts, a Shield Projector, then Grunts | 9-HP Grunts    | 8-HP Grunts (brief) |
| ------------------------------------ | ------------------------- | --------------------- | ----------------------------------------- | -------------- | ------------------- |
| 2 Fighters every 2 rounds            | holds (22 / 24)           | holds (18 / 24)       | holds (20 / 24)                           | falls, round 8 | falls, round 4      |
| 2 Skeletons every 2 rounds           | holds (22 / 24)           | holds (18 / 24)       | holds (20 / 24)                           | falls, round 8 | falls, round 4      |
| Raider and Fighter every 2 rounds    | holds (14 / 36)           | holds (12 / 36)       | holds (18 / 36)                           | holds          | holds               |
| 2 Raiders every 2 rounds             | holds (14 / 48)           | holds (10 / 48)       | holds (12 / 48)                           | —              | holds               |
| 2 Wolf Riders every 2 rounds         | holds (12 / 36)           | holds (12 / 36)       | falls, round 7                            | holds          | falls, round 7      |
| 2 Cavemen every 2 rounds             | falls, round 6            | holds (22 / 22)       | holds (24 / 16)                           | falls, round 5 | falls, round 4      |
| Raptor and Caveman every 2 rounds    | falls, round 6            | holds (22 / 34)       | falls, round 11                           | —              | falls, round 7      |
| 3 Fighters every 2 rounds            | falls, round 3            | holds (24 / 8)        | falls, round 2                            | falls, round 4 | falls, round 2      |
| 3 Fighters with 12 HP every 2 rounds | falls, round 2            | holds (24 / 16)       | falls, round 2                            | —              | —                   |
| 2 Goblins every round                | falls, round 4            | falls, round 5        | falls, round 2                            | falls, round 4 | falls, round 4      |
| 3 Goblins every round                | falls, round 2            | falls, round 2        | falls, round 2                            | —              | falls, round 2      |

Later, with one ranged unit, against 3 Fighters every 2 rounds: 3 Fighters
and a Marksman fall in round 7; 3 Grunts and a Ray Gunner hold (22 / 36),
because an attacker with Move 1 walks into a full-power ray.

What this says:

- **The 10-HP Grunt opening is not helpless.** It holds wherever a Fighter
  opening holds, and holds against Cavemen and against three Fighters every
  two rounds, where Fighters fall. The reason is one threshold: two basic
  hits deal 3 and 6 HP, which kills a 9-HP Grunt and leaves a 10-HP Grunt at
  1 HP with a recharged Shield next turn. The brief's 8-HP Grunt fails this
  test in round 4 against the weakest wave.
- **Bodies first.** Spending round 1 and 2 on a Shield Projector instead of
  two Grunts loses the opening to heavy pressure. The Normal AI must train
  Grunts while a hostile unit is in reach of the city and add the Projector
  after ([section 12](#12-normal-ai-requirements)). The same holds for the
  Saucer, which does not defend.
- **Goblin packs are the hard matchup,** for Martians as for Humans: nothing
  at 2 Coins a round holds three Goblins a round.
- The model lets every wave strike first and never lets the defender retreat
  or recover, which is the pessimistic case the aggressive AI calls for.

### 9.13 The faction as a whole

- **Is it helpless against an early rush?** No, at 10 HP
  ([section 9.12](#912-early-pressure)); yes at the brief's 8.
- **Is it untouchable for factions with little range?** No. A Shield is at
  most 4 and every basic hit is at least 5, so every such hit costs HP; two
  hits in a turn kill a small Martian unit, three a Grunt. HP damage stays:
  the faction has no healer and no cure. Flyers end every Move on land or on
  a Rift, where any adjacent unit attacks them, and over water they are
  transports that cannot fight. Walkers never have cover. The faction's own
  problem is the reverse: a Goblin with two helpers hits for 11 or 12, which
  kills every 8-HP Martian unit through its Shield and leaves a Grunt at
  1 HP.
- **Plague.** Plague bypasses Shields and Martians cannot cure it: a plagued
  Grunt loses 6 of its 10 HP over three turns. Goblins live under the same
  rule today. The Lich is a tier-3 unit, so this is a late-game counter, not
  an early one.
- **Wail** deals 2 to every small Martian unit: nothing to a full Shield,
  but it strips the Shield of everything within two tiles before the
  Skeletons and Ghouls attack. That is a use the Banshee did not have before.
- **Sieges.** A flyer cannot stand on a foreign or neutral center, so it can
  neither besiege nor block a capture there. On its own center it is an
  ordinary, unfortified defender. A Mothership can pull a besieger off an own
  center, which lifts the siege, and a defender off an enemy center
  ([section 9.9](#99-mothership)).
- **Captures.** No flyer captures; Beam Down and Tractor Beam never put a
  unit on a center and clear `captureEligible`; a Thrall is never created on
  a center.
- **Zone of control.** Flyers ignore it and exert none: they cannot screen
  and cannot be pinned. A Saucer behind the line threatens only weak
  finishing hits; a Mothership behind the line is two tiles from a pull.
  Walkers and foot units follow the ordinary rule.
- **Naval blockades.** A machine afloat is an embarked unit, and an embarked
  unit on a hostile dock already blockades it. New is only that a machine
  needs no Port and no Shorecraft to get there. It is defenceless there
  (Defense 1, no attack).
- **Fog.** A flyer reveals sight along its path and stops on entering an
  unexplored cell, like every unit. With Move 3 it explores half again as
  fast as a Raider. It never passes a hidden unit, because hidden units stand
  only on unexplored cells.
- **Rifts.** Only flyers stand on a Rift. A flyer there is attacked like any
  unit and no one can take its tile; a Rift is three tiles in open ground,
  so this is a perch for a Saucer, not a fortress.
- **Timing.** Six of the nine pillars are in play by the middle of an
  ordinary Normal match: Shields (round 1), Flying and Beam Down (Scouting),
  Force Field (Drill), Cooling (Marksmanship), Mind Control
  (Administration). Stride, Pierce, and the Tractor Beam sit on tier-3 units
  and will be seen in a minority of Normal matches
  ([concern 2](#181-concerns)).

### 9.14 The root's predictions

| Prediction in the brief                                                         | Result                                                                                                                                                                             | Change                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Grunt: slightly worse than a Fighter in a brawl, better against chip damage     | At 8 HP it is clearly worse (10 lost / 2 killed when attacked first) and its opening falls in round 4 under constant pressure; at 9 HP it still dies to two hits. Chip: confirmed. | 10 HP                                                              |
| Saucer: if a Saucer and Grunt expand faster than a Raider, slow it              | Faster by one turn from distance 8 if it may move and beam.                                                                                                                        | Beam Down only from an unmoved Saucer                              |
| Ray Gunner: two shots kill most 1-slot units; two-turn output near a Marksman's | At 3.5 one shot kills every 10-HP unit and the output is 13 against 10.                                                                                                            | Attack 3; full power only when unmoved                             |
| Shield Projector: a clump must not be immune to Goblins or Marksmen             | With the brief's technology a Grunt reaches Shield 5 and one Kaboom or Marksman hit does nothing.                                                                                  | Field recharges to 4; the technology is a second recharge          |
| Brain: worth 5 Coins, no snowball; check Goblins and ray combinations           | Confirmed with the cooldown. City capacity as the brake would disable it half of the time.                                                                                         | Limit of 2 Thralls per Brain; collapse; no slots                   |
| Tripod: its frailty must let a Raider, a Knight, or two Fighters punish it      | It did not: four Fighters, or two Knights, were needed, and it deleted a unit from four tiles away.                                                                                | 12 HP, Shield 2, Defense 1; full power only when unmoved; one slot |
| Mothership: positional, not a killer; no unanswerable capture                   | At Attack 3 it killed a backline unit a turn for free. A same-turn capture is impossible; a next-turn capture of a city with one defender is likely.                               | Attack 2.5, 16 HP; watch item for balance                          |
| Colossus: parity with the Giant and the Brontosaurus                            | Shield 5 with Defense 3 took no HP damage from any basic unit.                                                                                                                     | Shield 3, 32 HP, Attack 4                                          |
| Thrall: cannot be massed beyond capacity                                        | Confirmed under the new limit: at most 2 per Brain.                                                                                                                                | —                                                                  |
| Faction: not helpless against a rush, not untouchable for melee factions        | Confirmed at 10 HP, against constant pressure as well ([sections 9.12](#912-early-pressure) and [9.13](#913-the-faction-as-a-whole)).                                              | —                                                                  |

## 10. Interactions with existing rules

### 10.1 Undead rules

| Rule        | Interaction                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves      | Martian land-form units, flyers and Thralls included, leave Graves like any unit. A mind-controlled victim and a collapsed Thrall leave none (removals). An embarked machine leaves none.                            |
| Raise Dead  | Unchanged.                                                                                                                                                                                                           |
| Infect      | A Martian unit killed by a Zombie rises as an **ordinary Zombie** of the Zombie's owner (10 of 18 HP, no Shield, one slot), except a flyer on a Rift. A Brain that rises has left the board: its Thralls collapse.   |
| Bitten      | A Zombie bites a Martian unit only when its hit cost the unit HP ([section 5.3](#53-damage)). A Bitten Martian unit rises like any unit. No Martian unit cures a bite. A Bitten Thrall that collapses does not rise. |
| Plague      | A Lich plagues the primary and splash targets that lost HP. Plague damage bypasses the Shield; spread ignores Shields. No Martian unit cures it. A mind-controlled Lich has left the board: its Plagues are cleared. |
| Wail        | Hits Martian units in its radius with the ordinary formula; the Shield absorbs first.                                                                                                                                |
| Lifesteal   | A Vampire heals by the HP damage it dealt, not by what a Shield absorbed.                                                                                                                                            |
| Unanswered  | Unchanged: a Martian unit never retaliates against a Vampire.                                                                                                                                                        |
| Devour      | Unchanged.                                                                                                                                                                                                           |
| Frenzy      | Unchanged. A Zombie, Ghoul, or Skeleton that becomes a Thrall is a Thrall: it loses every Undead ability.                                                                                                            |
| Lich splash | Computed from the whole hit on the primary target; each Martian victim's Shield absorbs its own share.                                                                                                               |
| Restless    | Not a Martian rule: Martian units recover 4 in own territory and 2 elsewhere.                                                                                                                                        |

### 10.2 Goblin rules

| Rule                 | Interaction                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gang Up              | A Goblin attacker counts its helpers around a Martian target as usual. No Martian attack has Gang Up.                                                                                                                                                                        |
| Kaboom, death blasts | Fixed blast damage is absorbed by the Shield first: a Kaboom of 5 costs a Grunt 3 HP, a Grunt in a Force Field 1, a Mothership 1. A death blast of 2 (Bomb Chucker) is absorbed by any full Shield; one of 4 by a Shield of 4.                                               |
| Chains               | A Martian melee attacker that kills an exploding unit advances onto its tile and is hit by the blast; a flyer does not advance but is still in the blast area when adjacent. A ray at range 2 is outside it. A pierced exploding unit that dies explodes like a splash kill. |
| Bomb splash          | Computed from the whole hit on the primary target; each victim's Shield absorbs its share.                                                                                                                                                                                   |
| Plunder              | A Goblin seat earns 1 Coin for each Martian unit its units or blasts kill. A collapsed Thrall and a mind-controlled unit earn nobody anything.                                                                                                                               |
| Mind Control         | A mind-controlled Bomb Chucker, Rocket Cart, or Scrap Buggy does **not** explode: it is removed, not killed.                                                                                                                                                                 |
| Tractor Beam         | A pulled exploding unit keeps everything; pulling it next to the Mothership puts the Mothership in its blast area.                                                                                                                                                           |
| WAAAGH!, Ram, Troll  | Unchanged. A Troll is a `JUGGERNAUT`-role unit: immune to Mind Control and the Tractor Beam.                                                                                                                                                                                 |
| Warrens              | Follow the city's current owner, as before.                                                                                                                                                                                                                                  |

### 10.3 Dinosaur rules

| Rule               | Interaction                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eggs               | A hostile Egg is an ordinary target of Martian attacks, rays, and Pierce (Defense 1, no retaliation). An Egg is never a target of Mind Control or the Tractor Beam, and its tile is never a Beam Down or Tractor Beam destination.          |
| Growth             | A dinosaur grows from killing Martian units as from any kill. A collapsed Thrall and a mind-controlled unit are not kills. A grown dinosaur at 6 HP or less with one slot can be mind-controlled; the Thrall has no growth.                 |
| Charge!            | A Triceratops attack on a Martian unit ignores Walls (the only fortification a Martian unit can have), is absorbed by the Shield first, and **pushes and follows whatever the Shield absorbed**. Flyers and walkers are pushed like others. |
| Acid               | A Spitter ignores the cover and Walls of a Martian foot unit; machines have neither anyway.                                                                                                                                                 |
| Armoured           | An Ankylosaurus takes 1 less from every Martian hit, a half-power ray and a Pierce hit included.                                                                                                                                            |
| Wallbreaker        | Applies to a Martian foot unit on its Walled center.                                                                                                                                                                                        |
| Two-slot dinosaurs | The Triceratops, T-Rex, and Brontosaurus are immune to Mind Control and the Tractor Beam (two slots, or the `JUGGERNAUT` role). The Raptor, Spitter, and Ankylosaurus are not.                                                              |
| Rampage            | A T-Rex that kills a Brain keeps rampaging; the Thralls next to it are already gone.                                                                                                                                                        |

### 10.4 Human abilities

| Ability              | Interaction                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Field Defense, Walls | Give a Human, Undead, or Goblin defender the ordinary bonus against every Martian attack, except rays fired with the Disintegrator. A Tripod attack destroys Field Defense on the target tile (reason `CATAPULT`). |
| Explosives           | The melee Field Defense demolition applies to Martian melee attackers whose owner has the Disintegrator, as to any owner with Explosives.                                                                          |
| Overrun              | A Knight that kills a Martian unit advances and may attack again.                                                                                                                                                  |
| Push                 | A Juggernaut-role unit pushes a Martian unit under the ordinary conditions; a flyer is pushed onto land or a Rift only.                                                                                            |
| Charge, Escape       | Unchanged.                                                                                                                                                                                                         |
| Rally                | Unchanged. Psychic Command is the same rule for a Martian seat.                                                                                                                                                    |
| Tend Wounded         | Unchanged for Human and Dinosaur seats. It heals HP, never a Shield.                                                                                                                                               |
| Catapult             | Unchanged. It out-ranges every ray.                                                                                                                                                                                |

### 10.5 Cities, siege, capture, and capacity

- **Capture-capable Martian units:** Grunt, Ray Gunner, Shield Projector,
  Colossus, and Thrall. The Saucer, Brain, Tripod, and Mothership cannot
  capture.
- **Siege.** A Martian foot unit or walker on a hostile center besieges it
  like any unit. A flyer can never be there ([section 7.2](#72-flying)).
- **Fortification.** A Martian foot unit on its owner's Walled center has the
  ordinary +2. No Martian unit builds Field Defense
  (`buildsFieldDefense` false for the Grunt and the Shield Projector, and the
  Martian tree has no `BUILD_FIELD_DEFENSE` unlock); Field Defense that
  stands in territory a Martian seat captures fortifies its foot units under
  the ordinary rule. Machines never have fortification.
- **Capacity** is the slot sum of revision 19. The Mothership and the
  Colossus use 2 slots and every other Martian role 1. A Thrall has no home
  and uses none. Martian cities have no capacity bonus. A reward Colossus may
  exceed capacity like every reward unit.
- **Captured cities.** The capturing unit is re-homed with its slots, except
  a Thrall, which stays homeless.
- **Training.** Every Martian land unit except the Colossus is trained on the
  city center with `TRAIN`, with the ordinary gates. A flyer on its own
  center blocks training like any unit.
- **Spoils, Land Grant, rewards, city action:** unchanged. Beam Down, Mind
  Control, and the Tractor Beam are unit actions and spend no city action.

### 10.6 Zone of control, pass-through, and Roads

- **ZOC.** Flyers neither suffer nor exert it. Every other Martian unit
  follows the ordinary rule, Thralls included.
- **Pass-through.** Foot units and walkers pass only their owner's units
  (revision 18). Flyers pass every unit. No unit ever ends a Move on an
  occupied tile. Other players' units cannot pass a Martian unit.
- **Roads.** The half cost by origin applies to every Martian land unit,
  flyers included. The Road-edge exemption from terrain stops is moot for
  machines, which have no terrain stop.

### 10.7 Boats, embarking, and water

- Martian boats are the Human boats ([section 3](#3-martian-roster)).
- Foot units embark at Ports with Shorecraft. Machines embark on any water
  tile they may enter ([section 7.3](#73-crossing-water)). Reward and
  treasure units are land units, as today.
- An embarked Martian unit keeps its Shield; its Defense is 1; it cannot
  attack, retaliate, or use an ability. It can be pulled by a Tractor Beam
  from water to water and pushed like any afloat unit.
- A ray unit on the shore attacks afloat units like any ranged land unit; a
  Pierce hit continues over water.
- **Blockade.** Unchanged rule. `MIND_CONTROL` and `TRACTOR_BEAM` join the
  commands after which `PORT_BLOCKADE_CHANGED` and `SEA_NETWORK_CHANGED` are
  recomputed, and so does `DISBAND` (a disbanded Brain's embarked Thrall may
  have been a blockader).

### 10.8 Fog and observation

- A Martian unit is visible exactly when its tile is explored by the viewer.
  Its Shield, Shield maximum, Cooling, Thrall status, and (for a Brain) the
  Mind Control cooldown and the number of its Thralls are public on a visible
  unit. A Thrall's Brain is named only when the viewer sees it.
- `SHIELDS_RECHARGED` is projected like `WINDMILL_HEALING_RESOLVED`, with the
  entries of units the viewer can see. `UNIT_BEAMED`, `UNIT_MIND_CONTROLLED`,
  and `UNIT_PULLED` are projected to the actor and to every viewer that can
  see a unit or tile involved before or after the command, with the ordinary
  reveal and conceal events for units that enter or leave explored tiles.
- Beam Down, Mind Control, and Tractor Beam previews are exact: every tile
  and unit they read is explored and visible to the actor. Pierce follows
  the splash rule: the canonical resolution hits a hidden unit behind the
  target, the public preview lists only a visible one and flags
  `touchesUnexplored` when the tile behind is unexplored.
- Capacity, city actions, and Coins stay owner-private.

### 10.9 Promotion, Disband, achievements

- **Promotion** is the revision-20 rule for every Martian unit except the
  Thrall: 3 kills, +5 maximum HP, and a full heal of HP. It does not change
  or recharge the Shield. Ray kills, Pierce kills of hostile units, and
  retaliation kills are credited; Mind Control is not a kill.
- **Disband** (Administration): Grunt, Saucer, Ray Gunner, Shield Projector,
  Brain, Tripod, and Mothership, for the refunds of
  [section 3](#3-martian-roster). Never a Colossus or a Thrall. Disbanding a
  Brain collapses its Thralls.
- **Muster** counts the Martian trainable roles on the board: Grunt (a Thrall
  counts as this role), Saucer, Ray Gunner, Shield Projector, Brain, Tripod,
  Mothership, Patrol Boat, and Battleship (the Colossus is excluded like the
  Juggernaut). Explorer and Engineer are unchanged.

### 10.10 Starting units, rewards, and treasure

| Source                             | Human      | Undead      | Goblin      | Dinosaur     | Martian                    |
| ---------------------------------- | ---------- | ----------- | ----------- | ------------ | -------------------------- |
| Starting units                     | Fighter    | Skeleton    | one Goblin  | one Caveman  | one Grunt                  |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    | two Goblins | one Caveman  | one Grunt                  |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination | Troll       | Brontosaurus | Colossus                   |
| Treasure chest unit                | Knight     | Vampire     | Scrap Buggy | Raptor       | **Saucer** (role `RAIDER`) |

Reward and treasure units arrive at full HP and full Shield, exhausted until
their owner's next Start Turn. `treasureUnitRole` is `RAIDER` for the Martian
registration (the Dinosaur precedent); the `TREASURE_CAPTURED` literal stays
`KNIGHT`. A treasure Saucer needs a city with one free slot, otherwise the
chest gives 5 Coins. A flyer takes a chest by ending a Move on it.

## 11. Commands, events, errors, and queries

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `BEAM_DOWN`, `MIND_CONTROL`,
and `TRACTOR_BEAM`, in that order, immediately after `HATCH` (48 kinds):

- `BEAM_DOWN { kind, unitId, passengerUnitId, to }`;
- `MIND_CONTROL { kind, unitId, targetUnitId }`;
- `TRACTOR_BEAM { kind, unitId, targetUnitId }`.

`MOVE` accepts a machine's path over and onto water and a flyer's path over
units ([section 7](#7-movement-stride-flying-and-crossing-water)); its shape
is unchanged. A pending city reward blocks the three new commands like every
command.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts (76 kinds):

- `SHIELDS_RECHARGED` immediately after `UNITS_REGENERATED`:
  `{ playerId, results: [{ unitId, shield }] }`, in unit-ID order, for units
  whose Shield changed;
- `UNIT_BEAMED` immediately after `UNIT_DISEMBARKED`:
  `{ playerId, unitId, passengerUnitId, from, to }`;
- `UNIT_MIND_CONTROLLED` immediately after `UNIT_INFECTED`:
  `{ playerId, unitId, targetUnitId, targetOwnerId, targetRole, thrallUnitId, at, hp }`;
- `UNIT_PULLED` immediately after `UNIT_PUSHED`:
  `{ sourceUnitId, targetUnitId, from, to }`.

`UNIT_DIED.cause` gains `BRAIN_LOST`. There is no event for the start or end
of Cooling or for a Mind Control cooldown: the view lists are the source. The
player event order inherits these positions.

**Combat preview.** `CombatPreviewV7` (and therefore `COMBAT_RESOLVED`) gains
four fields, neutral for every attack that involves no Martian unit:

| Field                  | Meaning                                                                            | Neutral  |
| ---------------------- | ---------------------------------------------------------------------------------- | -------- |
| `rayPower`             | `"FULL"` or `"HALF"` for a ray, otherwise `"NONE"`; `attack2` includes the halving | `"NONE"` |
| `coolingApplied`       | the attack is a full-power ray and leaves the attacker Cooling                     | false    |
| `defenderShieldDamage` | what the defender's Shield absorbs of the hit                                      | 0        |
| `attackerShieldDamage` | what the attacker's Shield absorbs of the retaliation                              | 0        |

- `damageToDefender` and `damageToAttacker` stay **HP damage**, so every
  existing reader of kills and HP stays correct. The whole hit is the sum of
  the two.
- Splash entries, including the Pierce entry, gain `shieldDamage` (0 when
  none); their `damage` stays HP damage. Wail and explosion result entries
  gain the same field. A Pierce victim is listed in `splash`.
- The Disintegrator reports `fortificationLevel: 0` and the removed levels in
  the revision-20 field `fortificationIgnored`.
- `defenderBitten` and `plagued` follow [section 5.3](#53-damage): no bite
  and no Plague without HP damage.

**Errors.** `RuleErrorCodeV7` gains `BEAM_DOWN_NOT_LEGAL` (reasons
`EMBARKED`, `MOVED`, `NO_PASSENGER`), `MIND_CONTROL_NOT_LEGAL` (reasons
`EMBARKED`, `COOLDOWN`, `THRALL_LIMIT`, `TARGET_IMMUNE`, `OUT_OF_RANGE`,
`TARGET_HEALTHY`), and `TRACTOR_BEAM_NOT_LEGAL` (reasons `EMBARKED`,
`TARGET_IMMUNE`, `OUT_OF_RANGE`, `BLOCKED`). `DISBAND_NOT_LEGAL` gains the
reason `THRALL`. The movement failure reasons gain `SETTLEMENT_FORBIDDEN`.
`INVALID_TILE` gains the action `BEAM_DOWN`.

**Registration.** Faction `MARTIAN`, tree `MARTIAN_BASELINE_V1`, display name
"Martian"; unlock kinds `BRAIN_SUPPORT`, `FORCE_FIELDS`, and `DISINTEGRATOR`;
capabilities `shieldsRechargeAtEndTurn` and `raysIgnoreFortification`;
abilities `HEAT_RAY`, `PIERCE`, `FORCE_FIELD`, `BEAM_DOWN`, `MIND_CONTROL`,
`TRACTOR_BEAM`, `FLY`, and `STRIDE`; role mechanics `shield` (0 to 4) and
`movementMode` (`GROUND`, `STRIDE`, `FLY`), with `capacitySlots`,
`buildsFieldDefense`, and `advancesAfterKill` set as
[section 3](#3-martian-roster) says; faction rule `treasureUnitRole`
`RAIDER`; and the constants `FORCE_FIELD_SHIELD_V7` 4, `MIND_CONTROL_HP_V7` 6,
`MIND_CONTROL_RANGE_V7` 2, `MIND_CONTROL_COOLDOWN_TURNS_V7` 2,
`MIND_CONTROL_THRALL_LIMIT_V7` 2, and `TRACTOR_BEAM_RANGE_V7` 2. Internal
field names are the implementer's choice; the serialized literals of this
section are normative. `assertRuleset7Registry` must accept the fifth tree
unchanged (same node IDs, tiers, branches, prerequisites, and tactical-role
labels).

**Public queries.**

- `queryPlayerCommandsV7` offers, for a Martian seat: `MOVE` commands that
  follow the Stride, Flying, and water rules; `BEAM_DOWN` for every legal
  `(Saucer, passenger, destination)` in unit-ID, passenger-ID, then `(y, x)`
  order; `MIND_CONTROL` and `TRACTOR_BEAM` for every legal target. It never
  offers Field Defense, Tend Wounded, `PROMOTE` or `DISBAND` for a Thrall, a
  flyer's Move onto a forbidden center, or Pillage for a flyer. Every offered
  command is accepted.
- `previewBeamDownV7(view, unitId, passengerUnitId)` returns null unless a
  `BEAM_DOWN` with that pair is offered, otherwise
  `{ unitId, passengerUnitId, from, destinations, fieldDefenseDestroyed }`
  with the legal tiles in `(y, x)` order and those that would lose Field
  Defense.
- `previewMindControlV7(view, unitId, targetUnitId)` returns null unless that
  command is offered, otherwise
  `{ unitId, targetUnitId, at, thrallHp, thrallMaxHp, thrallsAfter, thrallLimit, cooldownTurns, collapsingUnitIds, plagueCleared }`.
- `previewTractorBeamV7(view, unitId, targetUnitId)` returns null unless that
  command is offered, otherwise
  `{ unitId, targetUnitId, from, to, fortificationLost, emptiesCenterOfCityId, liftsSiegeOfCityId }`.
- `queryCombatPreviewV7` and `estimateCombatV7` include Shields, ray power
  (from the unit's current `moved` flag and Cooling; an estimate for an attack
  after a planned Move uses half power), Pierce, and the Disintegrator.
  `previewAttackExplosionsV7`, `previewKaboomV7`, and `previewWailV7` apply
  Shields to every listed hit.
- `queryThreatenedTilesV7` gives a visible flyer its flying reach, a walker
  its striding reach, and a ray unit range 2 from every tile it can reach. It
  adds no tile for Mind Control or the Tractor Beam, which deal no damage.
  When a viewer estimates the reach of a visible unit of another seat, a
  flyer passes every visible unit.
- `publicUnitStatsV7` carries, exactly for units owned by a Martian seat, a
  `martian` block: `shield`, `shieldMaximum`, `capacitySlots`,
  `movementMode`, `rayPower` (what an attack made now would be, or null),
  `cooling`, `pierce`, `forceField`, `thrall` (null, or `{ brainUnitId }`),
  and `mindControl` (null, or `{ cooldown, thralls, thrallLimit }`). The
  Attack row lists the modifier source `HALF_POWER`; a Shield row follows
  the HP row.
- `previewCityCapacityV7` counts Martian slots and no Thrall.
  `previewDisbandV7` never covers a Thrall. `PublicPlayerV7` and the
  leaderboard carry `MARTIAN` and `MARTIAN_BASELINE_V1`; the leaderboard unit
  count includes Thralls.
- Every preview equals the resolution, except a chain or a Pierce flagged
  `touchesUnexplored`.

## 12. Normal AI requirements

**Status: implemented** (`pulp_wars-t6s.3`). The rules, their values, and
the measurements (a head-to-head against the generic policy, ability
telemetry, a coarse look at each faction, and parity of matches without a
Martian seat) are in the
[Normal AI notes](../architecture/NORMAL_AI.md#martian-play-pulp_wars-t6s3).
Readings of this section: the Martian research priorities stay below the
best economic plan (1150; the Dinosaur signature priority 1170 measured
worse); "keep units at 6 HP or less out of three tiles of a Brain" moves a
unit out of the Brain's range (two tiles) when it cannot get farther, and
"end a machine's Move on water only to cross toward an objective" is read as
never ending a routine Move on water while the unit has a land route to its
job. The tactical benchmark scenarios are unit tests
(`tests/unit/ruleset-v7-martian-ai.test.ts`), as for the Goblin and
Dinosaur policies.

Normal AI plays as and against Martians (`pulp_wars-t6s.3`) with every
existing guarantee: deterministic and PRNG-free, only the public view, public
commands, and public previews, at most 128 accepted commands per owner turn
through bounded resumable work, and no change to decisions in matches without
a Martian seat (every Martian heuristic is gated on a match with a Martian
seat, in a new `src/ai/v7-martian.ts`). It builds on the aggressive policy of
`pulp_wars-9s0.1`.

From `pulp_wars-t6s.2` on, a Martian seat must already play complete headless
matches without a policy error or stall, using the ordinary policy on the
Martian registration.

As Martians it must at least:

- **value its units by what they are, not by raw HP.** The production value
  "HP minus twice the cost" rates every Martian unit below its Human peer and
  left the Spitter unbuilt. Start from `HP + 2 × Shield` and add a
  first-of-role bias for the Shield Projector, Saucer, Ray Gunner, Brain,
  Tripod, and Mothership (the Dinosaur first-Triceratops bias), so that each
  role is produced;
- **train bodies first under threat:** while a visible hostile unit can reach
  a city within two turns, train Grunts there, not a Projector, Saucer, or
  Brain ([section 9.12](#912-early-pressure));
- **research toward its roles:** Drill and Scouting early; Marksmanship and
  Administration at the priority the Dinosaur seats use for their signature
  technologies (above the economic plan, once the seat owns two cities), then
  Sawmilling and Chivalry; Force Fields once it owns a Projector; the
  Disintegrator when a visible hostile unit stands on Walls or Field Defense;
- **use Shields:** prefer attacks whose retaliation the Shield absorbs; count
  Shield spent on retaliation as exposure in the enemy turn (not with Force
  Fields); pull a unit with HP damage and no Shield out of reach to recover;
  end units' Moves next to an own land-form Projector when it costs no better
  action, and keep the Projector with the main group, not in a garrison;
- **use rays:** fire at full power from where the unit stands before
  considering a Move; a ready ray unit with a target in reach next turn holds
  its tile; on a Cooling turn reposition away from visible melee reach, then
  fire at half power; prefer Tripod targets with a hostile unit behind them
  and refuse a shot whose Pierce would kill an own unit unless it kills the
  target;
- **use range 2** (`pulp_wars-b5f.2`): a Grunt (ray pistol) or other
  shooter next to a hostile unit that cannot answer at range 2, and a
  Tripod next to any hostile unit (it cannot fire at an adjacent one), steps
  back to a tile two tiles from a target, outside lethal reach, before it
  shoots;
- **use the Saucer:** explore early; afterwards keep one Saucer unmoved
  within three tiles of the front and Beam Down every turn the best eligible
  passenger (a unit trained this turn first) onto the legal tile with the
  least visible hostile reach; keep it out of visible lethal reach; attack
  only to finish a unit;
- **use the Brain:** Psychic Command like Rally; Mind Control whenever it is
  offered, on the target with the highest value (unit cost, then HP), unless
  Psychic Command enables a kill worth more; stay two tiles behind the line;
  count the value of its Thralls in the Brain's own value when retreating;
- **use Thralls** as the front row and for captures, ahead of shielded
  units;
- **use the Mothership:** Tractor Beam scored by the previewed gain: a
  defender pulled off a center that an own capture-capable unit can enter
  this turn; a besieger pulled off an own center; a fortified unit pulled
  into the reach of at least two own attackers; an own unit pulled out of
  lethal reach; otherwise attack wounded units;
- **use machines' movement:** route walkers and flyers with their own reach;
  end a machine's Move on water only to cross toward an objective, never
  within visible reach of a hostile naval unit; never rely on cover for a
  machine.

Against Martians it must at least:

- **focus fire.** Score an attack by HP damage plus a fraction of the Shield
  it strips, so that a hit the Shield absorbs still has value when another
  attacker follows; among targets prefer one that this turn's available
  attacks can kill through its Shield; strip Shields with ranged units and
  Wail first, which take no retaliation; do not spread single hits over
  shielded units;
- **read Cooling:** estimate a visible ray unit's threat at half power when
  it is Cooling or must move to reach, and at full power otherwise; approach
  ray units in the turn they are Cooling when the choice exists;
- **kill the enablers:** value a Shield Projector by the units it covers, a
  Saucer above its cost while Martian cities exist behind it, and a Brain by
  its Thralls, which die with it;
- **deny Mind Control:** keep units at 6 HP or less out of three tiles of a
  visible Brain without a cooldown when an equally good tile exists, or on a
  center;
- **not rely on fortification** against rays of an owner with the
  Disintegrator, and treat a sole city defender within four tiles of a
  visible Mothership as pullable: keep a second unit next to the center when
  one is available;
- **Goblin seats:** count stripped Shields in Kaboom scoring, so that a
  Kaboom that opens a clump for Gang Up attacks is taken;
- include flying and striding reach in every threat estimate, and never
  count ZOC against a flyer.

Opening research keeps the existing scorer unless `pulp_wars-t6s.3` records
and tests a Martian-specific change. Headless matches of Martians against
each faction and against themselves must finish without stalls or policy
errors, and the tactical benchmark
([tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)) gains
Martian scenarios: a full-power ray taken before moving; a ready ray unit
that holds its tile; a Pierce shot refused for friendly fire; a Beam Down of
a freshly trained Grunt; a Mind Control taken; a Tractor Beam that empties a
center for a capturer; Grunts trained before a Projector under threat; an
opponent finishing a shielded unit with two attackers instead of wounding
two; and an opponent keeping a wounded unit out of a Brain's reach.

## 13. UI requirements

### 13.1 Surfaces

The browser UI (`pulp_wars-t6s.4`) must, at requirement level:

- offer "Martian" in every seat's faction select (default all Human);
- label every unit by its owner's faction, and render the technology tree
  (with the names Force Fields and Disintegrator), research offers, action
  chips, and Help in the viewer's faction text ([section 4](#4-technology));
- **Shield marker:** for every visible unit with a Shield maximum above 0,
  draw a segmented Shield bar above the HP bar (one segment per point of the
  current maximum, filled for the current Shield), and show "Shield 2 / 4"
  in unit info with the Force Field named when it raised the value;
- **Cooling marker:** a heat glyph on a Cooling ray unit of any owner; unit
  info shows the ray's power now ("Full power" or "Half power: moved" /
  "Half power: Cooling");
- **Thrall marker:** a collar glyph and the Thrall sprite; selecting a Thrall
  highlights its Brain and selecting a Brain highlights its Thralls and shows
  "Thralls 1 / 2" and the cooldown;
- **flying:** draw a flyer raised above its tile with a ground shadow;
- **movement:** show a machine's water tiles as "Launch" destinations
  (embarks, ends the turn), and never offer a flyer a forbidden center;
- **machines afloat:** a self-launched machine on water is drawn **as the
  machine itself over the water** (a hovering Saucer or Mothership, a wading
  Tripod or Colossus), with its own sprite, Shield bar, and markers, never
  as a boat or transport sprite. Embarked foot units keep the transport
  sprite. Unit info still says it is afloat and cannot fight;
- **attack preview**, for own and enemy attacks: the Shield absorbed and the
  HP lost as separate numbers on both sides; the ray power line; "Leaves it
  Cooling"; the Pierce victim with its damage, marked as friendly fire when
  it is an own or allied unit; the Disintegrator line;
- **Beam Down:** a Saucer command; choosing it highlights eligible
  passengers (on or next to own city centers); choosing a passenger
  highlights the legal tiles around the Saucer; a click on one confirms. The
  disabled command names its reason (moved, no passenger, no free tile);
- **Mind Control:** a Brain command; it highlights legal targets within two
  tiles; choosing one shows the Thrall's HP, the Thrall count after it, the
  cooldown, and any Thralls or Plagues the target takes with it; confirm
  like an attack. An illegal target in range shows why (too healthy, immune,
  on a center);
- **Tractor Beam:** a Mothership command; it highlights legal targets at
  distance 2 and, on hover, the tile each is pulled to; choosing one shows
  the fortification the target loses and whether a center is emptied or a
  siege lifted; confirm like an attack;
- **Psychic Command, Strafe** as the labels of Inspired and Charge for
  Martian units;
- **city panel:** Martian production rows with cost and slots; "Thralls use
  no slot" where a Thrall is selected;
- **log lines** for a recharge that restored Shields, a Beam Down, a Mind
  Control, a Thrall collapse, and a pull;
- look identical to the previous revision in matches without a Martian seat, apart
  from the extra faction option.

### 13.2 Labels and text

| Surface                         | Text                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Faction option                  | Martian                                                                                      |
| Shield row (unit info)          | Shield {n} / {max}                                                                           |
| Shield row (in a field)         | Shield {n} / 4 (Force Field)                                                                 |
| Attack preview (Shield)         | Shield absorbs {n}                                                                           |
| Ray power (unit info, preview)  | Full power; Half power: moved; Half power: Cooling                                           |
| Attack preview (Cooling)        | Leaves it Cooling next turn                                                                  |
| Cooling tooltip                 | Cooling: its ray fires at half power until the end of its owner's next turn                  |
| Attack preview (Pierce)         | Pierces {unit}: {n} damage                                                                   |
| Attack preview (Pierce, own)    | Pierce hits your {unit}: {n} damage                                                          |
| Attack preview (Disintegrator)  | Disintegrator: ignores fortification                                                         |
| Launch destination              | Launch: crosses water as a transport                                                         |
| Beam Down command               | Beam Down                                                                                    |
| Beam Down tooltip               | Bring a unit from one of your cities to a tile next to this Saucer. It cannot act this turn. |
| Beam Down unavailable (moved)   | A Saucer that moved this turn cannot Beam Down                                               |
| Beam Down unavailable (no unit) | No unit on or next to one of your city centers                                               |
| Mind Control command            | Mind Control                                                                                 |
| Mind Control tooltip            | Take a hostile unit with 6 HP or less within 2 tiles. It becomes a Thrall.                   |
| Mind Control unavailable        | Recovering: {n} turn(s); Controls 2 Thralls already                                          |
| Mind Control target reasons     | Too healthy ({hp} HP); Immune; Protected on a city or village center                         |
| Thrall name and info            | Thrall; "Controlled by a Brain. No Shield. Collapses if the Brain is lost."                  |
| Brain info                      | Thralls {n} / 2                                                                              |
| Tractor Beam command            | Tractor Beam                                                                                 |
| Tractor Beam tooltip            | Pull a unit 2 tiles away one tile toward this Mothership.                                    |
| Tractor Beam preview            | Pulled out of Walls; Pulled off Field Defense; Empties {city}; Lifts the siege of {city}     |
| Psychic Command command, status | Psychic Command; "Psychic Command: +1 Attack on the next attack"                             |
| Strafe status                   | Strafe +1 Attack                                                                             |
| Field Defense unavailable       | Martians cannot build Field Defense                                                          |
| Log (recharge)                  | {owner} Shields recharged                                                                    |
| Log (Beam Down)                 | {owner} Saucer beamed down a {unit}                                                          |
| Log (Mind Control)              | {owner} Brain took control of a {unit}                                                       |
| Log (collapse)                  | {n} Thrall(s) collapsed                                                                      |
| Log (pull)                      | {owner} Mothership pulled {unit}                                                             |

### 13.3 Help text

One sentence per rule, shown in Help for every viewer:

- **Shields:** every Martian unit has a Shield that takes damage before its
  HP and recharges fully at the start of its owner's turn, so hit one unit
  several times in a turn instead of several units once.
- **Force Field:** a unit that recharges next to a Shield Projector
  recharges to Shield 4.
- **Force Fields:** with Force Fields, Shields also recharge at the end of
  the owner's turn.
- **Heat rays:** a Ray Gunner, Tripod, or Colossus fires at full power only
  if it has not moved this turn and is not Cooling; a full-power shot leaves
  it Cooling, at half Attack, until the end of its next turn.
- **Pierce:** a Tripod's ray also hits the unit directly behind its target
  for half the damage, friend or foe.
- **Ranges** (`pulp_wars-b5f.2`): a Grunt's ray pistol shoots up to two
  tiles away at full Attack, even after moving; a Tripod fires only at units
  two tiles away, never at one next to it.
- **Disintegrator:** with the Disintegrator, heat rays ignore Walls and Field
  Defense.
- **Walkers:** a Tripod or Colossus crosses Forest, Mountain, and Shallow
  Water without stopping and never gets cover or fortification.
- **Flyers:** a Saucer or Mothership flies over any terrain, any unit, and
  Rifts, ignores zones of control, and never captures or stands on a foreign
  city.
- **Launch:** Martian machines need no Port: they enter water from any shore
  and cross it as transports that cannot fight.
- **Beam Down:** a Saucer that has not moved brings a unit from one of its
  owner's cities to a tile next to itself; the unit cannot act that turn.
- **Mind Control:** a Brain takes a hostile unit with 6 HP or less within 2
  tiles, not on a city or village; it becomes a Thrall, and the Brain needs
  two turns before the next.
- **Thralls:** a Thrall fights like a Grunt without a Shield; a Brain
  controls at most two, and they collapse when the Brain is lost.
- **Tractor Beam:** a Mothership pulls a unit two tiles away one tile toward
  itself, out of Walls, Field Defense, or a city center.
- **Psychic Command, Strafe:** a Brain gives adjacent units +1 Attack on
  their next attack, and a Saucer gets +1 Attack after moving two tiles.

### 13.4 Placeholder art

**Superseded** (`pulp_wars-t6s.4`): the user asked for real Martian sprites,
so the production art of bead `pulp_wars-t6s.6`
([MARTIAN.md](../art/factions/MARTIAN.md)) is wired in instead and no
placeholder generator is built. The rules below that do not depend on the
generator stand: the Classic look and LEGACY draw the Human sprite of the
role with a Martian badge, and every marker, glyph and beam is code-drawn.
The text is kept as the record of the original plan.

No PixelLab work belongs to this epic. Martian units use **programmatic
placeholder sprites made the way the Goblin placeholders were** (bead
`pulp_wars-0ao.4`, commit `dece90d`): a deterministic generator with no
PixelLab call, whose output is committed and registered as ordinary faction
subjects. That generator was deleted when the PixelLab art replaced it
(`pulp_wars-0ao.8`, commit `64841f1`); `pulp_wars-t6s.4` restores the
mechanism from that history for Martians:

- a generator `scripts/art/martian-placeholders.ts` with its drawing module
  `scripts/art/chibi/martian-placeholders.ts`, run as
  `npm run art:martian-placeholders` (write the PNGs, owner masks, and
  records), `-- check` (re-render and compare), and `-- sheet` (contact
  sheets at native and enlarged scale);
- sprites and owner masks in `public/assets/chibi/placeholders/`
  (`chibi-martian-placeholder-<unit>.png` and `.mask.png`), a record file
  `scripts/art/chibi/placeholders/martian-placeholders.json` with sizes,
  anchors, palette, and hashes, and review evidence in
  `art/pixellab/reviews/chibi-martian-placeholders/`;
- nine subjects in the runtime manifest, marked `placeholder`:
  `UNIT:MARTIAN:<ROLE>` for the eight land roles, with the canvas, class, and
  mask conventions of the Human role, and `UNIT:MARTIAN:THRALL`;
- in the Classic look, and wherever a raster is missing, a Martian unit draws
  the Human sprite of its role with a Martian badge (the rule the Goblin and
  Dinosaur factions used before their art);
- portraits reuse the placeholder sprite; Martian cities, boats, and embarked
  foot units use the Human subjects with the badge; a machine afloat uses its
  own placeholder sprite;
- Shield bars, the Cooling glyph, the Thrall collar, the flyer's lift and
  shadow, and the Beam Down, Mind Control, and Tractor Beam command glyphs
  are **code-drawn** (the precedent of the code-drawn Kaboom! glyph and the
  Dinosaur Egg and growth markers), with a short beam effect for the three
  abilities and a ray line for heat rays;
- the asset inventory ([CHIBI_ASSET_INVENTORY.md](../art/CHIBI_ASSET_INVENTORY.md))
  gains a Martian paragraph that marks the subjects as placeholders. No art
  direction fragment is written in this epic.

Each placeholder must read as its unit at native size: a small trooper with a
pistol; a disc with a dome; a trooper with a long ray gun; a walker with a
dish; a brain in a jar on legs; a three-legged machine; a large disc; a
towering machine; a hunched figure with a collar.

## 14. Unchanged behaviour of the other factions

A match without a Martian seat behaves identically to the previous identity
apart from identity. For equal setups, seeds, and command sequences it produces the same
maps, legal commands, previews, accepted and rejected commands, events, and
views. The only differences are the ruleset ID, the autosave key, the
obsolete-key list, the command ordinals after `HATCH`, the four empty lists
of the state and the view, and the neutral preview fields `rayPower: "NONE"`,
`coolingApplied: false`, `defenderShieldDamage: 0`, `attackerShieldDamage: 0`,
and `shieldDamage: 0`. No Shield, Cooling, Thrall, or cooldown exists, none of
the three commands is offered or accepted, every role has movement mode
`GROUND`, and every rule the code keys on a mechanical role must resolve
through the owner's registration with the same Human, Undead, Goblin, and
Dinosaur results.

In mixed matches each unit applies its own registration: every other
faction's units keep every ability against Martians, with the Shield rules of
[section 5.3](#53-damage) applied to the damage they deal.

## 15. Implementation split and test expectations

Each bead proves its part with deterministic tests (new tests live in
`tests/unit/ruleset-v7-martian-*.test.ts` unless noted).

| Bead              | Scope                                                               | Required evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulp_wars-t6s.2` | identity; registration; every shape and every rule of this document | **First step, before any number is coded:** re-run the scratch analysis of [section 9](#9-per-unit-battle-analysis) on the revision-20 registry (final Human, Undead, and Goblin HP, the Triceratops and T-Rex) and with the more aggressive Normal AI of `pulp_wars-9s0.1` in mind (the wave model of section 9.12 with earlier and heavier waves), and report to the root every per-unit verdict, counter count, or pressure result that flips, with the number proposed instead. **Identity:** the exact 7rNN identity (the next free one); the previous identity's setup, state, save, and replay rejected; gap-free prior list ending in the previous identity; save key and obsolete-key cleanup through the previous key; faction and tree orders, binding, display name; registry assertion with five trees; faction-independent maps with Martian seats; 48 command kinds and 76 event kinds at the stated positions. **Roster:** every value of the [section 3](#3-martian-roster) table as registry values; one starting Grunt; Militia one Grunt; reward Colossus (2 slots, may exceed capacity); treasure Saucer with a free slot and the 5-Coin fallback; Disband refunds; Muster roles; no Field Defense, Tend Wounded, Overrun, Escape; per-viewer technology names and unlock text; every row of the [section 4](#4-technology) audit that names a Martian effect. **Shields:** creation at the maximum; recharge at Start Turn before Plague, for land and embarked units, with `SHIELDS_RECHARGED`; every row of the [section 5.3](#53-damage) table; absorption of attack, retaliation, splash, Pierce, Wail, Kaboom, and death-blast hits; Plague bypassing; no bite and no Plague without HP damage, Infect on a kill, Lifesteal by HP damage, splash from the whole hit; Push and Charge! push with a fully absorbed hit; the Force Field for each unit, not cumulative, land-form Projector only, read at the recharge only, never above 4; Force Fields at End Turn; state parsing rejections; view list. **Rays:** full and half power from `moved` and Cooling for each ray unit; Psychic Command added after the halving; Cooling set by a full shot only, lasting through the owner's next turn, removed at that End Turn, kept across embarking; retaliation never halved; every row of the [section 6.3](#63-worked-examples) table; Pierce in all eight directions at distance 1 and 2, none at knight offsets, on own, allied, hostile, hidden, embarked, and Egg victims, with credit and causes; Tripod Field Defense destruction and no advance; the Disintegrator on damage and retaliation with cover kept. **Movement:** Stride over Forest and Mountain without Engineering and without stops, ZOC still stopping; no cover and no fortification for machines on Forest, Mountain, Walls, and Field Defense; flyers over own, allied, and hostile units, never ending on one; flyers ignoring and not exerting ZOC; forbidden centers for `MOVE` and `DISEMBARK`; no advance, capture, or Pillage for flyers; crossing Shallow and (flyers, Navigation) Deep Water inside a Move; self-launch on Shallow and Deep Water with and without Navigation, with the exhausted activation; a stop on water; interrupted Moves; foot units still needing a Port; Rift: flyers enter and end on it, walkers and foot units never, no advance onto it, no rising on it, no Mind Control of a unit on it. **Beam Down:** every row of the [section 8.1](#81-beam-down-saucer) table accepted and rejected in order; exhausted passenger; Field Defense on a hostile tile; an acted, plagued, or Thrall passenger; no chest, center, Rift, or allied tile. **Mind Control and Thralls:** every row of the [section 8.2](#82-mind-control-brain) table; removal with no death, Grave, blast, credit, or Plunder; a mind-controlled Lich, Brain, exploding unit, and grown dinosaur; Thrall values, no Shield in a field, no Promotion, no Disband, capture without re-homing, no slot; the limit of 2; the cooldown over three turns; collapse on each way a Brain leaves the board, with order and cause; state parsing rejections. **Tractor Beam:** all sixteen offsets at distance 2 with the destination each gives; each Push condition and the chest condition blocking; own and hostile targets; immune targets; a unit pulled off Walls, Field Defense, a center, a dock (blockade events), and onto a Rift (flyer only); kept activation and cleared capture eligibility; an unmoved own ray unit still at full power after a pull. **Interactions:** each row of [sections 10.1](#101-undead-rules) to [10.4](#104-human-abilities). **Previews and queries:** each preview equal to its resolution; offered commands equal to accepted ones; the `martian` stats block; threatened tiles. **Showcase** with a Martian seat (the stated slots, homes, and IDs). **Persistence:** save, replay, and hash round-trip with every list non-empty; projection of the four events. **Parity** of matches without a Martian seat with the previous identity apart from identity and neutral fields; headless Normal matches with Martian seats finishing without policy errors; refreshed release corpus with reviewed diff. |
| `pulp_wars-t6s.3` | Normal AI                                                           | [Section 12](#12-normal-ai-requirements) behaviours with `tests/unit/ruleset-v7-martian-ai*.test.ts` scenarios (the benchmark list of section 12, plus: role value with Shield, research order, a Saucer kept unmoved near the front, a machine not ending on water in naval reach, an opponent's Kaboom that strips a clump taken, an opponent keeping two units by a city in Mothership reach); determinism and command bounds; headless matches of Martians against all five factions in both seat orders without stalls or policy errors; pinned decision hashes of matches without a Martian seat unchanged; sample metrics of every ability; the public-planning benchmarks with the larger `BEAM_DOWN` command lists.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pulp_wars-t6s.4` | UI and placeholders                                                 | [Section 13](#13-ui-requirements) surfaces, labels, and Help; Shield bars, Cooling, Thrall, and flyer markers for own and enemy units; the three ability flows with their previews and disabled reasons; Launch destinations; the Shield and ray lines of the attack preview; Force Fields and Disintegrator in the tree; the placeholder generator with `-- check` in the asset tests, the nine subjects marked `placeholder`, the Classic-look badge fallback, and the contact sheets reviewed at native and enlarged scale; start and finish a match as and against Martians in the browser; screens of matches without a Martian seat unchanged; a browser smoke probe that sees a Shield absorb a hit, fires a full-power ray, and performs a Beam Down, a Mind Control, and a Tractor Beam (the Showcase makes all of them reachable on the first turns).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pulp_wars-t6s.5` | balance                                                             | The matrix and telemetry of [section 16.2](#162-measurement), the targets of [section 16.4](#164-balance-acceptance), any tuning inside [section 16.3](#163-tuning-bounds) with this contract, the code, and the tests changed together, a tuning record added to this document, and a written report (`docs/validation/RULESET_7_MARTIAN_BALANCE.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

`pulp_wars-t6s.2` changes the identity and therefore refreshes the release
corpus (`npm run validate:ruleset7-release` with its reviewed refresh). No UI
offers the faction until `pulp_wars-t6s.4`.

## 16. Headless support, measurement, tuning bounds, and balance acceptance

### 16.1 Headless support

- The headless CLI and the balance matrix accept `martian` in `--factions`
  and the pairing letter `M`, on every map type including `showcase`.
- Headless metrics count the three new commands in `commandsByKind` and the
  four new events like any other kind.

### 16.2 Measurement

Extend the headless balance matrix
([Goblin balance report, reproduction](../validation/RULESET_7_GOBLIN_BALANCE.md#2-reproduction))
to five factions, on the same maps (the five generated types), sizes (11 and
14), seeds (0–29 per cell), and caps (150 rounds, 30,000 commands, 128
commands per turn), with the Normal AI of `pulp_wars-9s0.1`.

- **1v1 pairings:** the sixteen existing ones re-run as the baseline, plus
  `MH`, `HM`, `MU`, `UM`, `MG`, `GM`, `MD`, `DM`, and `MM`.
- **Four-seat mixes** on 16 × 16 with a Martian seat in each seat position
  (`MHUG`, `DMHU`, `GDMH`, `UGDM`), seeds 0–3 per map, 120 rounds, next to
  the existing mixes.
- **Martian telemetry** per game and seat, from a replay of the accepted
  command log:
  - units trained by role, the round of the first unit of each role, the
    round each technology was researched, units owned at each End Turn, used
    slots and capacity;
  - kills and losses by role and cause; the share of the seat's kills made
    by each role;
  - **Shields:** damage absorbed, by source kind (attack, retaliation,
    splash, Wail, blast) and by role; absorbed thanks to the Force Field
    (the part above the unit's own maximum); recharges at End Turn; hits
    fully absorbed; units killed at full HP in one enemy turn;
  - **rays:** shots at full and at half power by role, with damage and kills;
    half-power shots by reason (moved, Cooling); Pierce hits on hostile and
    on own units, with damage and kills; attacks that ignored fortification;
    Field Defense destroyed by Tripods;
  - **Saucers:** Beam Downs, the passenger's role, the distance from its
    city, passengers killed before they acted; Saucers lost; chests taken;
  - **Brains:** Psychic Commands and units inspired; Mind Controls by the
    victim's faction, role, and HP; Thralls alive at each End Turn; Thralls
    killed, collapsed, and captures made by Thralls; turns a Mind Control was
    blocked by the cooldown or the limit;
  - **Motherships:** Tractor Beams by target kind (own, hostile); targets
    pulled off a center, off Walls, off Field Defense, off an own center; the
    city captured within two turns of a pull; Motherships lost;
  - **movement:** self-launches by role, machines killed while embarked,
    flyer Moves that passed a hostile unit, flyer turns ended on a Rift;
  - turns at the 128-command cap.
- **Against Martians**, per opposing seat: Martian units killed by one, two,
  and three or more attackers in a turn; hits fully absorbed; Kabooms that
  dealt no HP damage.

### 16.3 Tuning bounds

`pulp_wars-t6s.5` may move these numbers within the listed bounds without
root approval, changing this contract, the code, and the tests together and
justifying each change in its report. Anything outside the bounds, any
number of another faction, and any mechanic change needs root approval.

| Parameter                                      | Contract value        | Bounds                               |
| ---------------------------------------------- | --------------------- | ------------------------------------ |
| Grunt HP / Shield / cost                       | 10 / 2 / 2            | 8–11 / 2–3 / 2–3                     |
| Saucer HP / cost / Move                        | 8 / 4 / 3             | 6–10 / 3–5 / fixed                   |
| Ray Gunner HP / Attack / cost                  | 8 / 3 / 4             | 6–10 / 2.5–3.5 / 3–5                 |
| Shield Projector HP / Shield / Defense / cost  | 12 / 3 / 2.5 / 4      | 10–15 / 2–4 / 2–3 / 3–5              |
| Brain HP / cost                                | 8 / 5                 | 6–10 / 4–6                           |
| Tripod HP / Shield / Attack / Defense / cost   | 12 / 2 / 4 / 1 / 9    | 10–16 / 2–3 / 3.5–4.5 / 1–1.5 / 7–10 |
| Tripod slots                                   | 1                     | 1 or 2                               |
| Mothership HP / Shield / Attack / cost / slots | 16 / 4 / 2.5 / 10 / 2 | 14–20 / 3–4 / 2–3 / 8–12 / 1 or 2    |
| Colossus HP / Shield / Attack / Defense        | 32 / 3 / 4 / 3        | 28–36 / 2–4 / 3.5–4 / 2.5–3.5        |
| Shield of the Saucer, Ray Gunner, Brain        | 2                     | 1–3 each                             |
| Other Attack and Defense values of the roster  | section 3             | ±0.5 each                            |
| Force Field value                              | 4                     | 3 or 4                               |
| Mind Control HP threshold / range              | 6 / 2                 | 5–8 / fixed                          |
| Mind Control cooldown / Thralls per Brain      | 2 turns / 2           | 1–3 / 1–3                            |
| Militia Grunts                                 | 1                     | 1 or 2                               |
| Half-power factor                              | half, rounded down    | fixed                                |
| Tractor Beam range; Pierce share               | exactly 2; half       | fixed                                |

Two constraints on every combination: **no unit may have a Shield above 4**
(a hit of 5 must always cost HP), and the Grunt must not cost less than 2.

Named fallbacks. `pulp_wars-t6s.5` may propose them with evidence; each needs
root approval before it is applied, except the tier-3 row, which the root
**pre-approved**: `pulp_wars-t6s.5` may apply it when the Tripod or
Mothership thresholds of [section 16.4](#164-balance-acceptance) fail.

| Lever                   | Contract                                                          | Fallback                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tractor Beam and cities | a unit on any center may be pulled, Walled included (root ruling) | (a) not a unit on a Walled center; (b) not a unit on any center                                                                                                                                        |
| Beam Down destinations  | any legal tile next to the Saucer                                 | not inside hostile city territory                                                                                                                                                                      |
| Beam Down and movement  | only an unmoved Saucer                                            | a Saucer may move first (if Beam Down proves unused)                                                                                                                                                   |
| Ray power after moving  | half                                                              | the Ray Gunner alone fires at full power after moving (if it proves unused)                                                                                                                            |
| Tier-3 units            | Tripod on Sawmilling, Mothership on Chivalry                      | **pre-approved:** Tripod unlocked by Forestry, Mothership by Raiding, if their usefulness thresholds fail; Sawmilling and Chivalry then get a small Martian effect each, recorded in the tuning record |
| Plague                  | bypasses Shields                                                  | the Shield absorbs it (if Undead win above the band)                                                                                                                                                   |

### 16.4 Balance acceptance

From the brief:

- Martian win rate in decided mixed games within 40–60% against each faction
  separately: `MH` + `HM`, `MU` + `UM`, `MG` + `GM`, and `MD` + `DM`.
- The round-cap rate of each Martian pairing no more than 3 percentage
  points above the same run's cap rate of the pairings without a Martian
  seat.
- No stalls, policy errors, or exceptions.
- The pairings without a Martian seat have byte-identical final state hashes
  to a pre-tuning run of the same seeds under the same identity, so Martian
  tuning changes no other faction.
- **Every roster unit is produced and every ability is used.** This document
  sets the thresholds (decision 26); the report states each number:

  | Unit or ability  | Threshold                                                                                                                             |
  | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
  | Saucer           | trained in at least half of Martian seat-games                                                                                        |
  | Beam Down        | used in at least half of the seat-games with a Saucer                                                                                 |
  | Shield Projector | trained in at least half of seat-games; Force Field absorption above 0 in at least half of those                                      |
  | Ray Gunner       | trained in at least half of the seat-games with Marksmanship; at least a quarter of its shots at full power                           |
  | Brain            | trained in at least half of the seat-games with Administration; Mind Control in at least half of those                                |
  | Tripod           | trained in at least half of the seat-games with Sawmilling; a Pierce hit in at least half of those                                    |
  | Mothership       | trained in at least 15% of the seat-games of matches of 35 rounds or more; a Tractor Beam in at least half of the seat-games with one |
  | Colossus         | reported (reward only)                                                                                                                |

- **No unit is dominant.** Watch bands; outside one the report explains and
  proposes: no role other than the Grunt makes more than 40% of the seat's
  kills; the Martian decided win rate with and without a Tripod, and with
  and without a Mothership, differs by at most 15 percentage points; at most
  half of the Tractor Beams that empty a center are followed by the capture
  of that city within two turns; Martian units killed at full HP in one
  enemy turn exist in at least half of the opposing seat-games (focus fire
  works).

If the gameplay fails these, `pulp_wars-t6s.5` iterates within
[section 16.3](#163-tuning-bounds) and the Martian-only Normal AI, and asks
the root before going outside the bounds.

### 16.5 Tuning record

`pulp_wars-t6s.5` (identity `pulp-wars-poc-7r25`; a coarse Dry Land pass by
the user's balance-testing policy, evidence in the
[Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md)):

| Parameter        | Contract |    Chosen | Reason                                                                                                              |
| ---------------- | -------: | --------: | ------------------------------------------------------------------------------------------------------------------- |
| Colossus Defense |  3 (`6`) | 2.5 (`5`) | it traded 17.8 kills per loss (the other factions' Juggernaut-role units 2.9–6.5) and almost never died; 8.6 at 2.5 |

Every other number keeps its contract value. Martians win 53–57% of decided
Dry Land games against each faction after the change (55–57% before), no
pairing reaches the round cap, and no match without a Martian seat changes.
The pre-approved tier-2 fallback was not applied: the Tripod and Mothership
training thresholds pass. Two ability thresholds of
[section 16.4](#164-balance-acceptance) are missed on the AI side (Mind
Control 39%, the Tractor Beam 37%; proposals in the report), and the win-rate
gaps with and without a Tripod or Mothership exceed the watch band through
the length of the games that reach tier 3, not dominance. Fine tuning is
deferred by the user.

`pulp_wars-b5f.2` (identity `pulp-wars-poc-7r32`; the user's playtest round
5: "grunts should probably have ranged attack. they are weak anyway" and
"martian tripod should have range 2 attack like catapults"):

| Parameter              | Before (`7r30`)   | Chosen                  | Reason                                                                                   |
| ---------------------- | ----------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Grunt range            | 1                 | 1–2 (ray pistol, plain) | the user's direction; a plain shot keeps the basic unit simple (no Cooling)              |
| Grunt Attack / cost    | 2 (`4`) / 2 Coins | 1.5 (`3`) / 3 Coins     | at Attack 2 and 2 Coins Martians won 82–93% of decided games against every faction       |
| Tripod range / minimum | 1–2 / 1           | 2 / 2                   | "like catapults": it fires from two tiles, never at an adjacent unit, and needs a screen |
| Tripod Sight           | 1                 | 2                       | a tall walker that fires at two tiles sees two tiles                                     |
| Grunt threatened bias  | 12                | 14 (Normal AI)          | cancels the third Coin in the production value, so threatened cities still train Grunts  |

**Why the Tripod played as a melee unit.** In 208 Dry Land games at `7r30`
(Martians against each faction, seeds 0–13 in both orders, and a 40-game
mirror) Normal AI Tripods fired 262 times: 228 (87%) from two tiles and 34
(13%) from an adjacent tile; 78 of the range-2 shots came after a Move at
half power, and 48 shots (18%) drew retaliation. At the start of every
Martian turn each hostile unit two tiles from a Tripod was visible to its
owner (88 of 88 in a 54-game sample): the army's sight covers it, so Sight
1 did not stop the AI. What made it play as melee was the rule itself: range
1–2 with minimum range 1 let a Tripod (and a player whose lone Tripod sees
one tile) walk up and shoot from the next tile, and the half power after a
Move made walking up cost little. Range 2 with minimum range 2 removes the
adjacent shot (after the change all of its 307 shots in 168 games came from
two tiles and none drew retaliation), and Sight 2 lets a lone Tripod see its
targets. Pierce is unchanged: at distance 2 the pierced tile is three tiles
away, at half the hit.

**The Grunt's numbers.** Coarse screens (Martians against the Humans,
Undead, Goblins, and Dwarves, 28 games each, the Normal AI under
development): Attack 2 at 2 Coins 89–93% (82–93% against all six, with the
`7r30` AI); Attack 1.5 at 2 Coins 64–82%;
Attack 1.5 and Defense 1 at 2 Coins 61–71%; Attack 1.5 and 8 HP at 2 Coins
67–71%; Attack 1.5, Defense 1, and 9 HP at 2 Coins 54–71%; Attack 1.5 at 3
Coins 50–64%. The third Coin is the lever: the Grunt now does a Marksman's
job (a shot from two tiles that a melee unit cannot answer), so it pays a
Marksman's price, and it stays below the Ray Gunner (4 Coins, Attack 3 at
full power), which is still trained (155 Ray Gunners against 1,095 Grunts
in the 168 games below). Its 10 HP, Shield 2, and Defense 1.5 are
unchanged; the Thrall (a Grunt statline) shares the range.

**Coarse matchups** (Dry Land 11 x 11, Rival, round cap 120, seeds 0–13 in
both orders, Martian wins of decided games; no game hit the cap):

| Opponent | Before (`7r30` rules and AI) | After (rules and AI) | After, `7r30` Martian AI |
| -------- | ---------------------------: | -------------------: | -----------------------: |
| Human    |                  18–10 (64%) |          17–11 (61%) |              16–12 (57%) |
| Undead   |                  15–13 (54%) |          19–9 (68%)¹ |              17–11 (61%) |
| Goblin   |                  17–11 (61%) |          15–13 (54%) |              14–14 (50%) |
| Dinosaur |                  15–13 (54%) |          18–10 (64%) |              15–13 (54%) |
| Ice Folk |                  11–17 (39%) |          14–14 (50%) |              15–13 (54%) |
| Dwarf    |                  13–15 (46%) |          15–13 (54%) |               19–9 (68%) |
| Total    |                  89–79 (53%) |          98–70 (58%) |              96–72 (57%) |

¹ Seeds 14–27 added 17–11, so 36–20 (64%) over 56 games.

The `7r31` Dwarf balance (Bomb Run 5, Dive 6) landed after these runs; the
Dwarf pairing rerun at `7r32` is again 15–13.
Grunt shots: before, 3,627 attacks, all adjacent, 67% drawing retaliation;
after, 7,172, of which 6,313 (88%) from two tiles and 7% drawing
retaliation. The Normal AI changes are in the
[Normal AI notes](../architecture/NORMAL_AI.md#martian-ranged-play-pulp_wars-b5f2).

## 17. Decisions made in this spec

### 17.1 Changes to the brief

Each change is argued with its numbers in
[section 9](#9-per-unit-battle-analysis). The root may reverse any of them.

1. **Grunt: 10 HP** (brief 8). At 8 it lost 10 Coins and killed 2 when
   attacked first by equal Fighters and its opening fell in round 4 under
   constant pressure; at 9 two basic hits still kill it; at 10 it survives
   them at 1 HP.
2. **Ray Gunner: Attack 3** (brief 3.5). At 3.5 one ray killed every 10-HP
   unit and two turns gave 13 damage against the Marksman's 10.
3. **A ray fires at full power only from a unit that has not moved this
   turn** (brief: its option for the Tripod; here for all three ray units).
   One rule for the three units, and no dash-and-delete.
4. **Only a full-power shot causes Cooling.** A half-power shot does not
   prolong it, so a ray unit simply alternates and the AI has nothing to
   plan.
5. **Shield Projector: cost 4, Shield 3, Defense 2.5** (brief 5, 4, 3), and
   the **Force Field recharges units to Shield 4** instead of adding 2.
6. **Force Fields (technology): a second recharge at End Turn** (brief: +1
   Shield on every unit). With changes 5 and 6 no Shield exceeds 4, so a
   Kaboom, a Fighter, or a Marksman always costs HP.
7. **Tripod: 12 HP, Shield 2, Defense 1, one slot, range 1–2** (brief 16, 3,
   1.5, two slots).
8. **Mothership: 16 HP, Attack 2.5** (brief 20, 3).
9. **Flying and wading over water: machines embark on any water tile and
   are ordinary embarked units there** (brief: flyers stand over Deep Water
   and never embark; walkers stand in Shallow Water). The engine requires
   that only an afloat form stands on a water tile, in state parsing and in
   several hundred `form` and water tests across the engine, queries, AI,
   and renderer; a land-form unit hovering over water would have to be
   audited through all of them, and it would be untouchable for melee
   factions two tiles off shore. Crossing water inside one Move keeps the
   land form and needs no audit. Consequences that differ from the brief:
   flyers and walkers need Navigation for Deep Water, and a walker afloat
   may enter Deep Water with it.
10. **Flyers never advance and cannot Pillage,** so that no rule puts one on
    a foreign center or lets a Move-3 unit that ignores ZOC strip an economy.
11. **Beam Down needs an unmoved Saucer;** the passenger uses one slot and
    does not fly; the destination holds no chest.
12. **Thralls use no city capacity; a Brain controls at most 2; they
    collapse when the Brain is lost** (brief: a free slot in the Brain's
    city).
13. **A Thrall is a `FIGHTER`-role unit with a list entry.** Its stats are
    the Grunt's, as in the brief's table, without the Shield; its maximum HP
    is the Grunt's.
14. **Mind Control never targets a unit on a city or village center** (or on
    a Rift), so it cannot place a capturer on a center.
15. **The Tractor Beam pulls a unit exactly two tiles away one tile toward
    the Mothership** (brief: to a chosen empty tile next to it). It is the
    mirror of Push, reuses its conditions, needs no destination picking, and
    has an exact preview.
16. **Colossus: 32 HP, Shield 3, Attack 4** (brief 36, 5, 3.5).
17. **Militia is one Grunt** (brief: "Grunt(s)").

### 17.2 Other decisions

Each fills a gap in the brief with the simplest rule consistent with the
engine; the root may change any of them.

18. **Shields live in a side list** and recharge by being set, at Start Turn
    before Plague.
19. **`damageToDefender` stays HP damage;** the absorbed part is reported
    separately.
20. **Collateral damage (splash, Pierce) is computed from the whole hit;**
    Lifesteal, bites, and Plague application from HP damage. Plague spread
    ignores Shields.
21. **The Force Field is read at the recharge only,** from a land-form
    Projector other than the unit itself.
22. **Embarked Martian units keep and recharge their Shield.** Martian boats
    have none.
23. **Half power is `floor(attack2 / 2)`**, applied before Psychic Command.
    A ray unit's retaliation is never a ray.
24. **Pierce exists only along the eight directions,** uses the splash rules
    with one target tile and friendly fire, and destroys nothing.
25. **The Disintegrator removes the fortification level for damage and for
    retaliation** (the Charge! convention) and keeps cover.
26. **The usefulness thresholds and watch bands of
    [section 16.4](#164-balance-acceptance).**
27. **Stride and Flying are a role mechanic `movementMode`;** both make a
    unit tall (no cover, no fortification). Roads apply to machines.
28. **A flyer may stand on its own city center** and blocks training there.
29. **A flyer takes a chest by ending a Move on it.**
30. **Mind Control removes the victim without a death** (no Grave, blast,
    credit, or Plunder) and creates the Thrall with a new entity ID, like a
    rising.
31. **The Mind Control cooldown and the Thrall count are public** on a
    visible Brain.
32. **A Thrall cannot Disband, is never promoted, and is never re-homed.**
33. **A Thrall of another Martian seat can be mind-controlled.**
34. **The Tractor Beam works on own units** and on afloat units (water to
    water), never on Eggs, `JUGGERNAUT`-role units, or two-slot units; a
    pulled unit keeps its activation.
35. **The Saucer has Charge as Strafe** (so Raiding gives Martians more than
    Pillage) and Sight 2; the treasure unit is a Saucer.
36. **The Brain's Rally is Psychic Command;** the Brain has no Tend Wounded,
    so Martians cannot cure Plague or bites.
37. **Chivalry grants no Overrun** to a Martian seat.
38. **The Tripod has minimum range 1 and may attack after moving,** unlike
    the Catapult; it keeps the Catapult's Field Defense destruction and
    never advances.
39. **Rift:** flyers enter and end on it; walkers do not; no rule puts a
    non-flyer there; a flyer that dies there does not rise.
40. **Names:** commands `BEAM_DOWN`, `MIND_CONTROL`, `TRACTOR_BEAM`; events
    `SHIELDS_RECHARGED`, `UNIT_BEAMED`, `UNIT_MIND_CONTROLLED`,
    `UNIT_PULLED`; cause `BRAIN_LOST`; lists `shields`, `cooling`, `thralls`,
    `mindControlCooldowns`; technology names Force Fields and Disintegrator.
41. **All shapes and all rules land in `pulp_wars-t6s.2`** with the identity.
42. **Placeholders restore the deleted Goblin generator mechanism**
    ([section 13.4](#134-placeholder-art)).

### 17.3 Root rulings

The root accepted this contract on 2026-10-02 with these rulings on the
questions it raised.

1. **Identity.** Other beads take identities first (achievements, then a map
   revision with the Pangea coast ring and the Rift). This revision takes
   **the next free `pulp-wars-poc-7rNN` at the time `pulp_wars-t6s.2`
   starts**; the document names no number.
2. **Tier-3 timing.** The Tripod stays on Sawmilling and the Mothership on
   Chivalry: human players do reach tier 3. Moving them to tier-2
   technologies is a **pre-approved** fallback for `pulp_wars-t6s.5` if the
   usefulness thresholds fail ([section 16.3](#163-tuning-bounds)).
3. **Tractor Beam.** It may pull a defender off any city center, Walled
   centers included: a same-turn capture is impossible, and it is on a par
   with the Triceratops's push. Watch item for balance.
4. **Water.** Self-launch is accepted (decision 9). A self-launched machine
   afloat is drawn as the machine itself over the water (a hovering saucer, a
   wading tripod), never as a boat sprite ([section 13.1](#131-surfaces)).
5. **The Grunt starts at 10 HP.**
6. **Thralls:** 2 per Brain, no slots, collapse with the Brain: accepted.
7. **Force Field** "recharge to 4" and **Force Fields** "a second recharge
   at End Turn": accepted.
8. **Plague** bypasses Shields and Martians have no cure: accepted. Watch the
   Undead pairing.
9. **Rift:** no rising for a flyer killed on a Rift: accepted.
10. **Usefulness thresholds** of [section 16.4](#164-balance-acceptance):
    accepted.
11. **Re-run first.** The per-unit numbers are re-run on the revision-20
    registry and the more aggressive AI (`pulp_wars-9s0.1`) at the start of
    `pulp_wars-t6s.2`, and any verdict that flips is reported before numbers
    are coded ([section 15](#15-implementation-split-and-test-expectations)).

## 18. Concerns

### 18.1 Concerns

1. **The numbers were computed against a registry that is about to change.**
   Revision 20 may add up to 3 HP to Human units and remove up to 2 from
   Undead and Goblin units, and `pulp_wars-9s0.1` changes how early and how
   hard the AI attacks. The Grunt is level with a 12-HP Fighter and ahead of
   a 10-HP one when it strikes first. **The per-unit numbers must be re-run
   on the revision-20 registry and against the more aggressive AI at the
   start of `pulp_wars-t6s.2`,** before any number is coded; it is the first
   step of that bead's test expectations
   ([section 15](#15-implementation-split-and-test-expectations)), and the
   scripts' location is in [section 9.1](#91-method).
2. **Tier-3 units will be rare in Normal matches.** The Tripod and the
   Mothership carry three of the nine pillars (Stride, Pierce, Tractor
   Beam). By the Dinosaur measurements a Normal seat reaches a tier-3
   technology in a third to a half of its games, around round 26–38, when
   the median match ends at round 32. One slot for the Tripod and a research
   priority help; moving the unlocks is the pre-approved fallback
   ([section 16.3](#163-tuning-bounds)).
3. **The faction leans on its AI.** A Martian line without a Projector, a
   Saucer that never beams, or ray units that walk and shoot at half power
   make the faction play like weak Humans. The Normal AI must hold a ray
   unit still, keep a Saucer unmoved, and keep units next to a Projector;
   none of these is how it plays other factions.
4. **First strike decides Martian fights** more than others. A human player
   who times an attack for the Cooling turn will beat an AI that does not
   time anything; the reverse also holds.
5. **The Tractor Beam against cities.** A city with one defender and no
   relief in reach of a Mothership falls a turn later
   ([section 9.9](#99-mothership)). It is tier 3, 10 Coins, and two slots.
   The root accepted it, Walled centers included; it is a watch item.
6. **Goblin packs.** A Goblin with two helpers kills every small Martian unit
   in one hit and leaves a Grunt at 1 HP, and no 2-Coin opening holds three
   Goblins a round. The Goblin pairing is the most likely to leave the band
   downward.
7. **Plague without a cure** takes 6 of a small unit's 8 HP. It is a tier-3
   Undead tool. The root accepted it; the Undead pairing is a watch item and
   the fallback is named.
8. **Beam Down is strong logistics that the telemetry may not show as
   kills.** Every city's production arrives at the front the turn it is
   trained. The report should compare rounds-to-first-contact and units in
   enemy territory with and without a Saucer.
9. **Thrall stats are tied to the Grunt's.** Tuning the Grunt moves the
   Thrall; separating them needs a second statline and a second code path.
10. **Self-launch is new reach.** A Saucer can scout across Shallow Water on
    turn one and can blockade a dock without Shorecraft, as a defenceless
    transport. On water maps this is a small edge in exploration only.
11. **Movement code.** Flying and Stride change the engine's movement
    validator, its public twin, the route estimates of the AI, and every
    "can this unit enter this tile" test (advance, Push, landing,
    displacement). They must go through one shared helper, with a test per
    caller.
12. **Planning cost.** `BEAM_DOWN` offers passengers × destinations per
    Saucer; `pulp_wars-t6s.3` checks the public-planning benchmarks.
13. **Fixture churn.** The identity, three command kinds, four event kinds,
    and the preview fields change nearly every pinned hash and the release
    corpus.
14. **The line model is crude.** It has no terrain, no manoeuvre, and a
    fixed engagement width; several of its results flip with one HP. It
    ranks designs; it cannot stand in for the matrix.

## 19. Implementation notes (`pulp_wars-t6s.2`)

### 19.1 The re-run before coding (section 15, first step)

The scratch analysis of [section 9](#9-per-unit-battle-analysis) was re-run
against the registry of commit `1ee8c52` (revision 20 and 21 in force, the
Normal AI of `pulp_wars-9s0.1`), before any Martian number was coded.

- **Registry.** The 24 existing units the analysis uses have the same HP,
  Attack, Defense, Move, range, and cost as at `f1c17bd` (0 differences).
  Revision 20 left the Human units at 10 HP; the revision-20 Triceratops and
  T-Rex were already in the tables.
- **Formula check.** 8,640 exchanges between existing units against
  `calculateCombatPreviewV7`: 0 mismatches, once the model gave a Triceratops
  attack its Charge! rule (fortification ignored).
- **Per-unit tables, skirmishes, and pressure results.** The regenerated
  outputs are byte-identical to the ones this document was written from. **No
  verdict, counter count, or pressure result flips, and no Martian number
  was changed.**
- **Heavier and earlier waves** (new: waves of three from round 1, every
  round or every second round, against a two-unit opening that adds one unit
  a round). A two-Grunt opening holds every wave a two-Fighter opening holds
  and several it does not (three Fighters, three Skeletons, three Cavemen,
  and a Raider with two Fighters every second round all break two 10-HP
  Fighters by round 3 and do not break two Grunts in 12 rounds). It falls to
  two Fighters and a Marksman (round 4), a Raptor with two Cavemen
  (round 8), three Goblins every round (round 2) or every second round
  (round 12), and three Wolf Riders (round 3). A two-Fighter opening falls
  to each of these no later. A two-Caveman opening (12 HP) lasts one round
  longer against two Fighters and a Marksman and holds three Goblins every
  second round; it falls to the other three no later.
- **The 9-HP Grunt is not advisable.** [Section 9.2](#92-grunt) names 9 HP
  as "the first value to try" if the Fighter stays at 10 HP, which it did.
  Under the heavier waves a 9-HP Grunt opening falls in every scenario
  tried, so 10 HP stays, and the Grunt remains the first lever of
  `pulp_wars-t6s.5` in the other direction only with the matrix as evidence.
- **Bodies first.** A Shield Projector or a Saucer as the third unit falls in
  round 2 to every wave of three; a third Grunt holds
  ([section 9.12](#912-early-pressure) confirmed). Developed five-unit groups
  (Grunts with a Projector and a Ray Gunner; with a Tripod) hold every wave
  tried; the group with a Brain loses once (a Raptor with two Cavemen,
  round 9).

The scripts and outputs are in the session scratch space under `t6s2/step0/`
(the directory named in [section 9.1](#91-method) with `t6s1` replaced).

### 19.2 Deviations and precise readings

1. **Whole hit for Pierce and splash.** It is `shieldDamage + hpDamage`, as
   [section 5.3](#53-damage) defines it, so it is capped at the target's
   Shield plus HP like every splash before this revision. The examples of
   [section 6.4](#64-pierce-tripod) quote the uncapped formula damage: a
   full-power ray on a 10-HP Fighter is a whole hit of 10 and pierces for 5,
   not 6 (a Guard: 10 and 5, as written; a half-power ray on a Fighter: 5
   and 3, as written).
2. **Plague without HP damage.** A hit that a Shield absorbs completely
   plagues nobody. A hit of 0 on a unit without a Shield still plagues, as
   before this revision (needed for parity).
3. **Tractor Beam and another player's technology.** Whether a pulled unit
   may enter a Mountain or Deep Water depends on its owner's Engineering or
   Navigation, which the actor cannot see, and the command must be exact
   from the actor's view. For a unit of another player the rule therefore
   reads the board: it is pulled onto a Mountain only if it stands on one
   (or strides or flies), and onto Deep Water only if it stands on Deep
   Water. An own unit uses the actor's technologies, as
   [section 8.4](#84-tractor-beam-mothership) says.
4. **Interrupted flyer Moves.** `UNIT_MOVE_INTERRUPTED` gains the reason
   `SETTLEMENT_FORBIDDEN` for a flyer that enters an unexplored center it
   cannot stand on (a rejection would reveal the site). As for every
   interruption, the event's `at` is the tile that stopped the Move; the unit
   stays on the last tile it entered on which it may end a Move.
5. **Unexplored cells.** Sight is revealed from every tile entered, so the
   tile after it is explored before the unit steps on: a Move enters an
   unexplored cell only on its first step. The rule is unchanged.
6. **Elimination.** The Thralls of an eliminated seat are removed with the
   rest of its units (cause `ELIMINATION`), not with `BRAIN_LOST`.
7. **Plague damage entries** (`PLAGUE_DAMAGED`) carry no `shieldDamage`:
   Plague bypasses the Shield.
8. **Blockade recompute after `DISBAND`** runs only when the Disband
   collapsed a Thrall, so matches without a Martian seat emit exactly the
   events they did.
9. **Mind Control of a grown unit.** The Thrall's HP is the victim's HP,
   which the legality rule already limits to 6.
10. **Rift.** The terrain of `pulp_wars-9s0.5` was not in the game when
    this engine landed; the hook was the shared terrain rule
    `canEnterTerrainV7`. **Implemented** at `pulp-wars-poc-7r28`: the
    `RIFT` case of `canEnterTerrainV7` (land-form flyers only), Beam Down,
    Mind Control (`TARGET_IMMUNE`), Tractor Beam and Push (`BLOCKED` for a
    non-flyer), no rising and no Grave on a Rift, and no advance onto it,
    tested in `tests/unit/ruleset-v7-rift.test.ts`
    ([Rift overlay](RULESET_7_RIFT.md)).
11. **One terrain rule.** Every "can this unit enter this tile" test (Move,
    landing, advance, Push, Charge! push, Tractor Beam, Beam Down, treasure
    unit placement, reward displacement, and their public twins) goes
    through `canEnterTerrainV7`; `canCrossWaterV7` and
    `flyerMayStandOnSiteV7` hold the two Martian additions. A source audit
    in `tests/unit/ruleset-v7-martian-movement.test.ts` pins the call sites.
12. **Setup screen.** The faction list of the setup screen leaves `MARTIAN`
    out until `pulp_wars-t6s.4`, which adds it.

### 19.3 Left to the following beads

- **`pulp_wars-t6s.3` (AI).** Done: see
  [section 12](#12-normal-ai-requirements). Before it the generic policy
  played a Martian seat without errors or stalls and never used Beam Down,
  Mind Control, or the Tractor Beam.
- **`pulp_wars-t6s.4` (UI).** Done: the setup offers the faction, the
  production art of `pulp_wars-t6s.6` is wired in (the placeholder
  generator of section 13.4 is not built), and every surface of section
  13.1 reads the public views, stats, previews, and events listed in the
  [client architecture](../architecture/CLIENT_ARCHITECTURE.md#martian-presentation-pulp_wars-t6s4).
  The decisions it made (the Classic and LEGACY stand-in, the always-shown
  Shield bar, the marker slots) are recorded in
  [MARTIAN.md](../art/factions/MARTIAN.md#decisions-of-the-ui-bead). The
  client has no threat display, so the flying and striding reach of
  `queryThreatenedTilesV7` is read only by the AI.
- **`pulp_wars-t6s.5` (balance).** Done: the balance matrix has the Martian
  pairings and the per-seat `martian` telemetry
  ([Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md));
  one number changed ([tuning record](#165-tuning-record)).
- **Release corpus.** The identity change invalidates the checked release
  corpus; its reviewed refresh is the root's gate.
