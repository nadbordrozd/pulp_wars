# Ruleset 7: Ice Folk faction

**Status:** contract (`pulp_wars-7g3.2`); **the engine is implemented**
(`pulp_wars-7g3.3`, identity `pulp-wars-poc-7r24`: every rule, command, event,
query, and state shape of this document). **The UI is implemented**
([section 13](#13-ui-requirements), `pulp_wars-7g3.6`): setup offers the
faction, and the production art, Snow, the Blizzard, the Chill markers, the
abilities, previews, cues and Help are wired in
([section 20](#20-ui-implementation-notes-pulp_wars-7g36)). **The Normal AI
is implemented** (`pulp_wars-7g3.4`,
[section 12.1](#121-implementation-status-pulp_wars-7g34)). **Coarse balance
(`pulp_wars-7g3.7`) is pending.** What the engine implementation changed or
made precise is in [section 19](#19-implementation-notes-pulp_wars-7g33). It is an
overlay over the rules in force when `pulp_wars-7g3.3` starts: the
[Martian faction](RULESET_7_MARTIANS.md) (epic `pulp_wars-t6s`, whose engine
landed on `main` in commit `d88503c`, `pulp-wars-poc-7r22`, after this
analysis was run),
over [revision 21](RULESET_7_REVISION_21_ACHIEVEMENTS.md),
[revision 20](RULESET_7_REVISION_20.md), the
[revision-19 Dinosaur overlay](RULESET_7_REVISION_19_DINOSAURS.md), and
[Ruleset 7: current rules](RULESET_7_CURRENT.md). No bead of the Ice Folk epic
folds this overlay into the current rules.

**Ruleset ID:** the next free `pulp-wars-poc-7rNN` when `pulp_wars-7g3.3`
starts. It comes after the Martian identity. This document names no number:
**`7rNN` and `v7rNN` stand for that identity everywhere below, and "the
previous identity" for the one current just before it.**

**Map-generation revision:** unchanged by this revision. Faction choice never
affects generation.

**Scope:** a sixth playable faction, `ICE_FOLK`. The overlay changes only
identity, faction registration, setup, the Ice Folk roster, the Ice Folk rules
(Chill and Shatter, derived Snow, the Blizzard and Cold Snap, Mountain-born
and Rockfall, Bolas, Cold Blood, Sweep and Trample, Boulders, Prowl, the Cold
Aura), two Ice Folk technology effects, the substitutions for the starting
unit, rewards, and treasure, and the commands, events, queries, UI, and Normal
AI needed to play them. Every unmentioned rule stays in force for every
faction. Rulesets 5 and 6 and historical Ruleset 7 fixtures remain frozen.

**Identity of the faction:** Humans are sustain, Undead are attrition, Goblins
are a reckless horde, Dinosaurs are few and growing, Martians are a small
high-tech invasion force, and the Ice Folk are **the things from the peaks**:
Yetis that walk over Mountains nobody else can cross, hunters who wrap an
enemy in frost so that the next blow breaks it into pieces, an Ice Witch under
whom the ground is winter, and a mammoth that swings at three units at once.
They are strong on their own Snow and around the Witch, they usually strike
first, and they finish frozen units without a blow in return. They are weak
against cheap packs, against fresh bodies that are never left wounded in
reach, and wherever the Witch is not. Economy, the technology graph, map
rules, and boats are the Human ones. Every Ice Folk rule is visible on the
board and fits in one sentence ([section 13.3](#133-help-text)).

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. Sources and decided direction

The user's direction of 2026-10-02 (epic `pulp_wars-7g3`): "let's try the ice
folk. iterate on the units, abilities and mechanics first. draft, critique,
redraft, critique using subagents. then write a spec and implement the engine
and test for balance (roughly). then pick art direction and implement." The
theme given earlier: "Yeti and Ice Folk: snow apes, mammoths, ice witches.
Hint: they freeze water into walkable ice and slow enemies. White and ice-blue
is a free colour space."

| #   | User decision                                                                                             | Where                                                                               |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| U1  | A fitting pulp theme first; mechanics serve it.                                                           | [sections 5](#5-chill-and-shatter) to [7](#7-unit-rules)                            |
| U2  | A bunch of unique mechanics and useful abilities, each explainable in one sentence and seen on board.     | [section 13.3](#133-help-text)                                                      |
| U3  | Each unit is thought through in battle **before** implementation.                                         | [section 9](#9-per-unit-battle-analysis)                                            |
| U4  | Balance is tested roughly, on Dry Land only: no gross imbalance, no blind spot, no dead or dominant unit. | [section 16](#16-headless-support-measurement-tuning-bounds-and-balance-acceptance) |
| U5  | A change to Normal AI strategy comes with a modest head-to-head or win-tendency test.                     | [section 12](#12-normal-ai-requirements)                                            |
| U6  | No "attack from hiding" mechanics.                                                                        | none is used                                                                        |

The design went through two drafts and two critiques (`pulp_wars-7g3.1`). The
root's final decisions (the notes of `pulp_wars-7g3.2`) are authoritative.
This document turns them into exact rules, checks each unit with the engine
formula, and lists every place where it had to decide something the decisions
left open ([section 17](#17-decisions-made-in-this-spec)). The freezing of
water (the floe) is **deferred** ([section 17.3](#173-deferred-the-floe)): the
faction is complete on a map with no water.

## 2. Identity, factions, and compatibility

### 2.1 Identity

| Boundary                                   | Ice Folk revision                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Ruleset                                    | `pulp-wars-poc-7rNN`                                                                                                           |
| Game-state schema                          | `7`                                                                                                                            |
| Command/event/save/replay numeric versions | `7`                                                                                                                            |
| Browser autosave                           | `pulpWars.save.v7rNN.current`                                                                                                  |
| Map revision                               | unchanged by this revision                                                                                                     |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`                                                              |
| Frozen `FactionTreeId` order               | the five existing trees, then `ICE_FOLK_BASELINE_V1`                                                                           |
| Faction to tree binding                    | the five existing bindings, plus `ICE_FOLK` → `ICE_FOLK_BASELINE_V1`                                                           |
| Display names                              | the five existing names, plus `ICE_FOLK` is "Ice Folk"                                                                         |
| `COMMAND_KIND_ORDER_V7`                    | two more kinds than the previous identity: `THROW_BOLAS`, `COLD_SNAP`, inserted in that order immediately after `TRACTOR_BEAM` |
| `DOMAIN_EVENT_KIND_ORDER_V7`               | one more kind than the previous identity: `UNITS_CHILLED`, inserted immediately after `UNITS_RALLIED`                          |

- The previous identity is appended to `PRIOR_RULESET_7_IDS` (the list stays
  gap-free). A reader of this revision rejects it and every earlier Ruleset 7
  identity in setups, states, saves, replays, and release artifacts; there is
  no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through the previous identity's key, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-7g3.3`, which also fixes every
  serialized **shape** of this revision (below) and implements every rule.
  `pulp_wars-7g3.4` (AI), `7g3.6` (UI), and `7g3.7` (coarse balance) change
  behaviour and numbers under the same identity.
- **Shape changes** (all with neutral values in a match without an Ice Folk
  seat):
  - `GameStateV7` and `PlayerViewV7` each gain one list, `chilled`
    ([section 5.1](#51-state)). **It is the only new stored state.** Snow and
    the Blizzard are derived on every read and never stored
    ([section 6](#6-snow-and-the-blizzard));
  - every explored tile of a `PlayerViewV7` gains two derived flags, `snow`
    and `blizzard` ([section 6.5](#65-fog-and-projection));
  - two commands, one event, one `UNIT_DIED` cause (`SHATTER`), one
    `FIELD_DEFENSE_DESTROYED` reason (`TRAMPLE`), one
    `UNIT_MOVE_INTERRUPTED` reason (`SNOW`), one movement failure reason
    (`SNOW_STOPS_MOVE`), a `curedChill` field on `WOUNDED_TENDED` results, two
    error codes, eight combat-preview fields, a `chill` field and the
    `iceFolk` block of the public unit stats
    ([section 11](#11-commands-events-errors-and-queries));
  - three technology unlock kinds (`WITCH_SUPPORT`, `DEEP_WINTER`,
    `BRITTLE`) and eleven ability literals
    ([section 11](#11-commands-events-errors-and-queries)).
- No unit key is added. Chill lives in a side list, like `plagued`, `bitten`,
  and `eggs`; everything else is a registration value.

### 2.2 Setup

- `MatchSetupV7.factions` stays a dense per-seat array; each entry is one of
  the six factions, and every combination is legal.
- Faction choice still never affects map generation, capital placement, turn
  order, treasure placement, or any PRNG draw: setups that differ only in
  `factions` generate byte-identical boards, turn orders, and treasures.
- **Starting units.** An Ice Folk seat starts with one Yeti (the `FIGHTER`
  role) on its capital at full HP, 5 Coins, and no technology, exactly like
  every other seat (`STARTING_FIGHTERS_V7` is 1). Its capital's territory is
  Snow from the first turn ([section 6.1](#61-which-tiles-are-snow)).
- The headless tools accept `ice` in `--factions` (seat-ordered, next to
  `original`/`human`, `undead`, `goblin`, `dinosaur`, and `martian`).

### 2.3 Faction model

This revision follows the revision-13 model: the frozen mechanical role order
is unchanged, state and events serialize the mechanical role, and every rule,
view, preview, UI surface, and AI decision resolves a unit through its
**owner's** registration with no cross-faction fallback.

- **Living.** Ice Folk units are living (their owner's faction is not
  `UNDEAD`), so Wail, Plague, and Bitten affect them.
- **An Ice Folk unit** is a unit owned by a seat whose faction is `ICE_FOLK`.
  The Snow rules, Shatter, and the Blizzard's protection apply to the **land
  roles in land form** only: never to an Ice Folk boat, and never to an
  embarked unit. Snow works **per faction** and the Blizzard's protection
  **per seat** ([section 6.3](#63-the-blizzard) states the rule once).
- **Mountain-born** roles are the Yeti, the Boulder Yeti, and the Frost Giant
  ([section 7.1](#71-mountain-born)).
- **Chill sources** are the Sled (Bolas), the Ice Witch (Cold Snap), and the
  Frost Giant (Cold Aura). No attack applies Chill.

| Mechanical role | Human (`ORIGINAL`) | Undead (`UNDEAD`) | Goblin (`GOBLIN`) | Dinosaur (`DINOSAUR`) | Martian (`MARTIAN`) | Ice Folk (`ICE_FOLK`) |
| --------------- | ------------------ | ----------------- | ----------------- | --------------------- | ------------------- | --------------------- |
| `FIGHTER`       | Fighter            | Skeleton          | Goblin            | Caveman               | Grunt (and Thrall)  | Yeti                  |
| `RAIDER`        | Raider             | Ghoul             | Wolf Rider        | Raptor                | Saucer              | Sled                  |
| `MARKSMAN`      | Marksman           | Banshee           | Bomb Chucker      | Spitter               | Ray Gunner          | Snow Hunter           |
| `GUARD`         | Guard              | Zombie            | Orc Brute         | Ankylosaurus          | Shield Projector    | Mammoth               |
| `CAPTAIN`       | Captain            | Necromancer       | Orc Warboss       | Shaman                | Brain               | Ice Witch             |
| `CATAPULT`      | Catapult           | Lich              | Rocket Cart       | Triceratops           | Tripod              | Boulder Yeti          |
| `KNIGHT`        | Knight             | Vampire           | Scrap Buggy       | T-Rex                 | Mothership          | Sabretooth            |
| `JUGGERNAUT`    | Juggernaut         | Abomination       | Troll             | Brontosaurus          | Colossus            | Frost Giant           |
| `PATROL_BOAT`   | Patrol Boat        | Patrol Boat       | Patrol Boat       | Patrol Boat           | Patrol Boat         | Patrol Boat           |
| `BATTLESHIP`    | Battleship         | Battleship        | Battleship        | Battleship            | Battleship          | Battleship            |

Tactical-role metadata equals that of the same mechanical role
(`assertRuleset7Registry` requires it): the Mammoth is `DEFENDER`, the Ice
Witch `SUPPORT`, and the Boulder Yeti `SIEGE`. The Normal AI must judge the
Mammoth, the Witch, and the Boulder Yeti by their abilities, not by these
labels ([section 12](#12-normal-ai-requirements)).

### 2.4 Showcase

A `SHOWCASE` setup ([current rules section 2.5](RULESET_7_CURRENT.md#25-showcase-setup))
accepts an Ice Folk seat with no board change: the same strips, cities,
ledger, unit tiles, forms, homes, and entity IDs as any other faction.

- The ten units are the Ice Folk roster's, one per role, at full HP with zero
  kills. No unit is Chilled at setup.
- All 23 technologies are researched, so Deep Winter and Brittle apply from
  the first turn: Snow is the three cities' footprints plus every neutral
  land tile within two tiles of a center, which covers the whole strip from
  `y = 1` to `y = 11`, the neutral columns beside it, and the Road tiles
  between the cities.
- Capacity is unchanged: every Ice Folk role uses one slot (Capital 5 of 7,
  North 3 of 6, Coast 2 of 5).
- Every Showcase city has Walls, so the Yeti on the capital center has
  fortification 2 and no Snow cover, while the units on the neutral rows
  `y = 5` and `y = 9` stand on Snow with cover: both cases of
  [section 6.2](#62-what-snow-does) are on the board at once.
- First income is the Human one (16 Coins; land trade applies).
- Against a neighbouring strip the first turns allow a Cold Snap, a Bolas, a
  Shatter, a Sweep, a planted and a moved Boulder throw, and a Prowl through
  zones of control. The Mountains of row `y = 0` allow a Rockfall once a Yeti
  has walked there.

## 3. Ice Folk roster

"Slots" is the city capacity the unit uses
([revision 19 section 5.1](RULESET_7_REVISION_19_DINOSAURS.md#51-big-bodies-capacity-slots)).
Every Ice Folk role uses one slot.

| Unit         | Role          | Tech              | Cost | Slots |  HP | Attack (`attack2`)   | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Its own thing                                              |
| ------------ | ------------- | ----------------- | ---: | ----: | --: | -------------------- | -------------------: | ---: | ----: | ----: | ----------------- | ------- | ---------------------------------------------------------- |
| Yeti         | `FIGHTER`     | start             |    2 |     1 |  10 | 2 (4)                |                2 (4) |    1 |    1² |     1 | yes               | yes     | Mountain-born; Rockfall; no Field Defense                  |
| Sled         | `RAIDER`      | Scouting          |    3 |     1 |  10 | 2 (4)                |                1 (2) |    2 |     1 |     2 | yes               | yes     | Bolas; Charge (Raiding); no Escape                         |
| Snow Hunter  | `MARKSMAN`    | Marksmanship      |    3 |     1 |   8 | 2 (4)                |                1 (2) |    1 |   1–2 |    1¹ | yes               | yes     | Cold Blood                                                 |
| Mammoth      | `GUARD`       | Drill             |    6 |     1 |  20 | 2.5 (5)              |                2 (4) |    1 |     1 |     1 | yes               | yes     | Sweep; Trample; no Field Defense                           |
| Ice Witch    | `CAPTAIN`     | Administration    |    5 |     1 |  12 | 1 (2)                |                1 (2) |    1 |     1 |     1 | yes               | no      | Blizzard; Cold Snap; no Rally; no Tend Wounded             |
| Boulder Yeti | `CATAPULT`    | Sawmilling        |    8 |     1 |  12 | 2 (4); 3 (6) unmoved |              1.5 (3) |    2 |   1–2 |     1 | yes               | no      | Boulders ignore fortification; Planted; Mountain-born      |
| Sabretooth   | `KNIGHT`      | Chivalry          |    9 |     1 |  14 | 3 (6)                |                1 (2) |    3 |     1 |     1 | yes               | no      | Prowl; no Glide; never on a foreign settlement; no Overrun |
| Frost Giant  | `JUGGERNAUT`  | reward only       |    — |     1 |  40 | 4 (8)                |                4 (8) |    1 |     1 |     1 | yes               | yes     | Push; Cold Aura; Mountain-born                             |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 |     1 |  10 | 2 (4)                |                2 (4) |    2 |     1 |     2 | yes               | no      | naval                                                      |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 |     1 |  25 | 6 (12)               |                4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                                              |

¹ Snow Hunter Sight becomes 2 with Fieldcraft.
² A Yeti standing on a Mountain may also attack at distance 2, at Attack 1.5
(`attack2` 3): [section 7.2](#72-rockfall-yeti).

These are the root's decided numbers, unchanged
([section 17.1](#171-deviations-from-the-root-decisions)). They are starting
values for `pulp_wars-7g3.7`, checked against the registry of commit
`daceb4f` (`pulp-wars-poc-7r21`) and the Martian contract values.

- **Yeti** has Fighter parity (capture, Pillage with Raiding, Disband,
  ordinary Promotion, the advance after a melee kill) and the Fighter's
  numbers. It cannot build Field Defense. It is Mountain-born and has
  Rockfall.
- **Sled** (a dog sled and its driver) has Raider parity for Sight 2,
  capture, Pillage, the advance, Fieldcraft Forest freedom, and Charge with
  Raiding (+1 Attack on its first attack after a Move of at least two tiles).
  It has no Escape. Its primary actions are Attack and Bolas
  ([section 7.3](#73-bolas-sled)).
- **Snow Hunter** has Marksman parity (range 1–2, minimum range 1, capture,
  Pillage, Disband, Fieldcraft Forest freedom and Sight, the advance after an
  adjacent kill) and Cold Blood ([section 7.4](#74-cold-blood-snow-hunter)).
- **Mammoth** has Guard parity for capture only. Unlike the Guard it **may
  attack after moving** and cannot build Field Defense. Every attack it makes
  is a Sweep and a Trample
  ([section 7.5](#75-sweep-and-trample-mammoth)).
- **Ice Witch** has Captain parity for no capture and nothing else: no Rally
  and no Tend Wounded (`RALLY` and `TEND_WOUNDED` are never offered and are
  rejected with `UNIT_ROLE_INVALID`). She carries the Blizzard
  ([section 6.3](#63-the-blizzard)). Her primary actions are Attack and Cold
  Snap ([section 6.4](#64-cold-snap)).
- **Boulder Yeti** has range 1–2 with minimum range 1 and may attack after
  moving, unlike the Catapult. Like the Catapult it cannot capture, never
  advances, and every attack it makes destroys Field Defense on the target's
  tile (reason `CATAPULT`). Its attacks ignore fortification, and it has +1
  Attack on a turn in which it has not moved
  ([section 7.6](#76-boulders-and-planted-boulder-yeti)). It is Mountain-born.
- **Sabretooth** has Knight parity for no capture and for the advance after a
  melee kill. It has no Overrun. It has Prowl, never Glides, and never ends
  on a settlement it does not own
  ([section 7.7](#77-prowl-sabretooth)).
- **Frost Giant** has Juggernaut parity (reward only, capture, Push on an
  adjacent surviving target, the advance, no Pillage, no Disband) and the
  Juggernaut's numbers, plus the Cold Aura
  ([section 7.8](#78-cold-aura-frost-giant)). It is Mountain-born.
- **Patrol Boat and Battleship** are identical to the Human units: names,
  stats, abilities, and art. No Ice Folk rule applies to them.
- **No unit builds Field Defense** (`buildsFieldDefense` false for the Yeti
  and the Mammoth, and the tree has no `BUILD_FIELD_DEFENSE` unlock). **No
  unit heals or cures**: the faction heals by Recover, Windmills, and
  Promotion only.
- **Disband refunds** are `floor(cost / 2)`: Yeti, Sled, and Snow Hunter 1,
  Witch 2, Mammoth 3, Boulder Yeti and Sabretooth 4. A Frost Giant cannot
  Disband.
- **Arms Industry** applies as to every faction.
- An **embarked** Ice Folk land unit follows the ordinary embarked rules
  (Move 2, Defense 1, Sight 1, no Attack, no retaliation, no ZOC, no Bolas or
  Cold Snap). An embarked Witch has no Blizzard, and an embarked Giant no
  Cold Aura.
- **Public abilities** (the role rule's `abilities` list): Yeti `ATTACK`,
  `CAPTURE`, `MOUNTAIN_BORN`, `ROCKFALL`; Sled `ATTACK`, `CAPTURE`, `CHARGE`,
  `BOLAS`; Snow Hunter `ATTACK`, `CAPTURE`, `COLD_BLOOD`; Mammoth `ATTACK`,
  `CAPTURE`, `SWEEP`, `TRAMPLE`; Ice Witch `ATTACK`, `BLIZZARD`, `COLD_SNAP`;
  Boulder Yeti `ATTACK`, `BOULDERS`, `MOUNTAIN_BORN`; Sabretooth `ATTACK`,
  `PROWL`; Frost Giant `ATTACK`, `CAPTURE`, `PUSH`, `COLD_AURA`,
  `MOUNTAIN_BORN`; boats `ATTACK`.

## 4. Technology

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rule, and technology IDs of `ICE_FOLK_BASELINE_V1` are identical to
`ORIGINAL_BASELINE_V5` ([current rules section 6](RULESET_7_CURRENT.md#6-technology)).
The Ice Folk registration differs in four unlock entries and two display
names:

- `ADMINISTRATION` grants `WITCH_SUPPORT` (Cold Snap; the Blizzard needs no
  unlock, it comes with the unit) instead of `CAPTAIN_SUPPORT`.
- `CHIVALRY` grants no `OVERRUN` (the Undead precedent).
- `FORTIFICATION` is displayed as **Deep Winter** and replaces
  `COMMAND BUILD_FIELD_DEFENSE` with `DEEP_WINTER`
  ([section 6.6](#66-deep-winter-technology)).
- `EXPLOSIVES` is displayed as **Brittle**, keeps both of its unlocks (Blast
  Mountain and melee Field Defense demolition), and adds `BRITTLE`: the
  Shatter threshold is 4 instead of 3 ([section 5.5](#55-shatter)).

`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains
`ICE_FOLK: { FORTIFICATION: "Deep Winter", EXPLOSIVES: "Brittle" }`. The two
effects are read through the technology capabilities `deepWinter` and
`shatterThreshold`, never through a raw technology test.

**Audit.** Every technology, and what it gives an Ice Folk seat. "Same" means
the Human unlock applies unchanged and is useful to an Ice Folk seat as it is
to a Human one.

| Technology        | Tier | What an Ice Folk seat gets                                                                                                                 | Dead part for the Ice Folk                             |
| ----------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Gathering         |    1 | same: reveal Fertile Ground; Harvest Fruit                                                                                                 | —                                                      |
| Farming           |    2 | same: Farm                                                                                                                                 | —                                                      |
| Milling           |    3 | same: Windmill and its Start Turn healing, the faction's only healing beyond Recover and Promotion                                         | —                                                      |
| Administration    |    2 | **Ice Witch** (Blizzard, Cold Snap); Market; Disband                                                                                       | —                                                      |
| Planning          |    3 | same: +1 capacity in every city; Land Grant, which also widens the city's Snow                                                             | —                                                      |
| Hunting           |    1 | same: Hunt Game                                                                                                                            | —                                                      |
| Forestry          |    2 | same: Lumber Camp; Clear Forest                                                                                                            | —                                                      |
| Sawmilling        |    3 | Sawmill; **Boulder Yeti**                                                                                                                  | —                                                      |
| Marksmanship      |    2 | **Snow Hunter**                                                                                                                            | —                                                      |
| Fieldcraft        |    3 | Replant Forest; the Sled and the Snow Hunter ignore Forest movement stops; Snow Hunter Sight 2                                             | —                                                      |
| Scouting          |    1 | **Sled** (Bolas); Sled Sight 2                                                                                                             | —                                                      |
| Roads             |    2 | same: Build Road; Road population; half-cost Road movement outside Snow, and for the Sabretooth everywhere                                 | half-cost movement on a Road tile that is already Snow |
| Commerce          |    3 | same: land trade                                                                                                                           | —                                                      |
| Raiding           |    2 | Pillage for every land unit but the Frost Giant; Sled Charge                                                                               | —                                                      |
| Chivalry          |    3 | **Sabretooth**; Cultivate Forest                                                                                                           | Overrun (not granted)                                  |
| Drill             |    1 | reveal Ore; **Mammoth**; first-hostile-capture Spoils                                                                                      | —                                                      |
| Engineering       |    2 | Mountain entry for the Sled, Snow Hunter, Mammoth, Witch, and Sabretooth; +1 Sight on a Mountain for every unit; Mine; Workshop; Redevelop | Mountain entry for the three Mountain-born roles       |
| Metallurgy        |    3 | same: Forge; Arms Industry                                                                                                                 | —                                                      |
| Fortification     |    2 | **Deep Winter:** neutral land within two tiles of each own city center is Snow; Recover heals 6 in own territory                           | Field Defense (no Ice Folk unit builds it)             |
| Explosives        |    3 | **Brittle:** Blast Mountain; melee Field Defense demolition; the Shatter threshold is 4                                                    | —                                                      |
| Shorecraft        |    1 | same: Harvest Fish; Build Port; embarkation; Patrol Boat                                                                                   | —                                                      |
| Navigation        |    2 | same: Deep Water; Gather Pearls; sea trade                                                                                                 | —                                                      |
| Naval Engineering |    3 | same: Battleship; Shipyard; naval discount                                                                                                 | —                                                      |

No technology is a dead purchase: each row has at least one live unlock, and
the two renamed technologies have a faction effect of their own. Deep Winter
is useful to a seat with one city (the ring of neutral tiles, and Recover 6)
and to one with five (after a Land Grant the ring is already territory, and
Recover 6 remains). Brittle at 4 changes which hits finish a unit
([section 9.10](#910-how-often-shatter-fires)); at 5 every Yeti hit near a
Witch would kill a 10-HP unit without reply, so 4 is also the upper bound
([section 16.3](#163-tuning-bounds)).

The tree, research offers, and Help render names and unlock text from the
**viewer's** faction:

| Technology     | Ice Folk name | Ice Folk unlock text                                                                   |
| -------------- | ------------- | -------------------------------------------------------------------------------------- |
| Administration | same          | Ice Witch (Blizzard, Cold Snap); Market; Disband                                       |
| Sawmilling     | same          | Sawmill; Boulder Yeti (ignores Walls and Field Defense)                                |
| Marksmanship   | same          | Snow Hunter (Cold Blood)                                                               |
| Fieldcraft     | same          | Replant Forest; Sled and Snow Hunter ignore Forest movement stops; Snow Hunter Sight 2 |
| Scouting       | same          | Sled (Bolas); Sled Sight 2                                                             |
| Raiding        | same          | Pillage; Sled Charge                                                                   |
| Chivalry       | same          | Sabretooth (Prowl); Cultivate Forest                                                   |
| Drill          | same          | reveal Ore; Mammoth (Sweep, Trample); first-hostile-capture Spoils (2 Coins)           |
| Engineering    | same          | every unit enters Mountain; +1 Sight on Mountain; Mine; Workshop; Redevelop            |
| Fortification  | Deep Winter   | Snow spreads two tiles from your city centers; Recover heals 6 in your territory       |
| Explosives     | Brittle       | Blast Mountain; melee attacks destroy Field Defense; Shatter at 4 HP or less           |

The other technologies read the same for every faction.

## 5. Chill and Shatter

**One sentence:** a frosted unit is slow on its first frozen turn (it may move
or act, not both), and an Ice Folk blow struck from an adjacent tile that
leaves it at 3 HP or less shatters it.

Every rule in sections 5 to 8 names its subject. Chill can be applied to a
unit of any faction, including another Ice Folk seat's.

### 5.1 State

```text
GameStateV7.chilled: readonly { unitId, sluggish, turnsLeft }[]   // sorted by unitId
```

- `sluggish` is a boolean and `turnsLeft` is 0, 1, or 2. The legal
  combinations are `{ sluggish: true, turnsLeft: 2 }`, `{ false, 2 }`,
  `{ false, 1 }`, and `{ false, 0 }`.
- A unit is **Chilled** exactly when it has an entry with `turnsLeft` of at
  least 1. An entry with `turnsLeft` 0 is **thawing**: the unit is not
  Chilled and nothing applies to it, except that a Chill applied now is not a
  new freeze ([section 5.2](#52-applying-chill)).
- **State parsing** rejects: an entry without a living unit; a duplicate or
  unsorted entry; a `turnsLeft` other than 0, 1, or 2; `sluggish: true` with
  a `turnsLeft` other than 2; an entry for a unit whose form is `NAVAL` or
  `EGG`; and any entry in a match without an `ICE_FOLK` seat.
- **View.** `PlayerViewV7.chilled` lists the entries of every visible unit,
  with both fields. Chill is public on a visible unit, like Plague and
  Bitten.

### 5.2 Applying Chill

**Applying Chill** to a unit means:

```text
no entry                       → add { sluggish: true, turnsLeft: 2 }   (a new freeze)
has an entry (thawing or not)  → set turnsLeft to 2; sluggish is not changed
```

- **Who can be Chilled:** a unit in **land form** that is hostile to the
  source's owner. Never a unit that is embarked, naval, or an Egg; never an
  own or allied unit. Nothing else is immune: any role of any faction,
  `JUGGERNAUT` roles, two-slot units, flyers, walkers, and Thralls included.
- **Sources,** all of them without damage, retaliation, or an attack:
  - the Sled's **Bolas** ([section 7.3](#73-bolas-sled)): one target;
  - the Witch's **Cold Snap** ([section 6.4](#64-cold-snap)): every target
    within 2;
  - the Frost Giant's **Cold Aura** ([section 7.8](#78-cold-aura-frost-giant)):
    every target next to it at its owner's Start Turn.
- Chill is **not damage**. A Martian Shield does not absorb or block it
  ([section 10.4](#104-martian-rules)); cover, fortification, Armoured, and
  Walls do not matter.
- Each source emits one `UNITS_CHILLED` event
  ([section 11](#11-commands-events-errors-and-queries)).

### 5.3 Sluggish: move or act, not both

A unit whose entry has `sluggish: true` is **sluggish**. One definition
covers every action kind:

> **A sluggish unit that has moved this turn cannot use a primary action, and
> a sluggish unit is never granted Escape.**

Everything else follows from the existing rule that no unit moves after a
primary action ([current rules section 12.2](RULESET_7_CURRENT.md#122-activation)).
So on its sluggish turn a unit either makes its Move and nothing else, or
stays where it is and acts.

| Action                                                                                         | Sluggish unit that has **not** moved | Sluggish unit that has moved            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `MOVE` (including a Move that embarks at a Port, and a machine's launch)                       | legal, once                          | already used                            |
| `ATTACK`                                                                                       | legal                                | `UNIT_ALREADY_ACTED`                    |
| `RALLY` (Frenzy, WAAAGH!, War Drums, Psychic Command), `TEND_WOUNDED`, `HATCH`                 | legal                                | `UNIT_ALREADY_ACTED`                    |
| `RAISE_DEAD`, `DEVOUR`, `WAIL`                                                                 | legal                                | `UNIT_ALREADY_ACTED`                    |
| `KABOOM`                                                                                       | legal                                | `UNIT_ALREADY_ACTED`                    |
| `PILLAGE`                                                                                      | legal                                | `UNIT_ALREADY_ACTED`                    |
| `MIND_CONTROL`, `TRACTOR_BEAM`, `THROW_BOLAS`, `COLD_SNAP`                                     | legal                                | `UNIT_ALREADY_ACTED`                    |
| `BEAM_DOWN` (needs an unmoved Saucer anyway)                                                   | legal                                | rejected as today                       |
| `RECOVER`, `CAPTURE`, `BUILD_FIELD_DEFENSE` (each needs an unmoved unit anyway)                | legal                                | rejected as today                       |
| `DISEMBARK` (a landing, which ends the activation anyway)                                      | legal                                | legal under the ordinary landing budget |
| `PROMOTE`, `DISBAND`, `WAIT` (not primary actions)                                             | legal                                | legal                                   |
| Escape (Human Raider) after an Attack                                                          | not granted                          | —                                       |
| The advance after a kill; an Overrun, Ram, or Rampage continuation; a Push or a Charge! follow | happen as usual: they are not Moves  | —                                       |
| Retaliation, zones of control, capture eligibility, idle recovery                              | unchanged                            | unchanged                               |

- "Has moved" is the activation flag `moved`, exactly as the Guard rule reads
  it: an interrupted Move counts, even one that left the unit on its starting
  tile.
- A sluggish Knight, Scrap Buggy, or T-Rex that attacks without moving and
  kills still advances and may continue its chain.
- A sluggish Triceratops attacks without a run-up, or moves.
- A sluggish Raider, Ghoul, Wolf Rider, Raptor, Saucer, or Sled cannot Charge
  (Pounce, Strafe), because Charge needs a Move before the attack.
- A unit that already cannot act after moving (Guard, Zombie, Orc Brute,
  Ankylosaurus, Shield Projector, Catapult, Lich, Rocket Cart) loses only
  what the role flag did not cover: Kaboom and Pillage after a Move.
- A ray unit that stands still fires at full power as usual: frost does
  nothing to a unit that does not need to walk.

**Implementation: one helper.** The engine exposes

```text
unitIsSluggishV7(state | view, unit): boolean
unitMayActAfterMoveV7(state | view, unit): boolean
    = role rule mayUsePrimaryActionAfterMove && !unitIsSluggishV7(...)
```

and **every** place that reads `mayUsePrimaryActionAfterMove` for a concrete
unit (the reducer's gates, the public command query, the combat estimate for
an attack after a planned Move, the threatened-tiles query, the Normal AI,
and the DOM; about 64 reads today) reads `unitMayActAfterMoveV7` instead.
The three gates that do not read the role flag today add the plain sluggish
test: `KABOOM`, `PILLAGE`, and the grant of Escape. No other code path
changes. A role-level read (production values, role tables) keeps the role
flag.

### 5.4 Duration and re-application

At the **end of a player's turn**, after idle recovery (and after the Martian
Cooling step and the Force Fields recharge) and before the income preview,
every entry of that player's units is updated:

```text
sluggish := false
turnsLeft 0  → the entry is removed
otherwise    → turnsLeft := turnsLeft − 1
```

There is no event: the view list is the source (the Cooling precedent).

So, for Chill applied during an Ice Folk turn `N`:

| When                                | Not re-applied                                              | Re-applied every Ice Folk turn               |
| ----------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| Ice Folk turn `N` (after the Chill) | Chilled: Shatter-eligible                                   | Chilled                                      |
| The unit's owner's next turn        | **sluggish**                                                | **sluggish**                                 |
| Ice Folk turn `N + 1`               | still Chilled: Shatter-eligible                             | Chilled (`turnsLeft` back to 2)              |
| The owner's following turn          | not sluggish; the Chill ends at its end                     | not sluggish                                 |
| Ice Folk turn `N + 2`               | thawing: not Chilled; a Chill now would not be a new freeze | Chilled, and so on: **never sluggish again** |
| The owner's turn after that         | the entry is removed at its end                             | not sluggish                                 |
| Ice Folk turn `N + 3`               | no entry: a Chill is a new freeze                           | Chilled                                      |

- **One application gives two Ice Folk turns of Shatter eligibility and one
  sluggish turn.** A unit that is Chilled again while it is still Chilled
  stays Shatter-eligible and is not made sluggish again. This is the root's
  "no kite lock" rule: a Witch that casts Cold Snap every turn slows each
  enemy once, on arrival.
- **Frost that lapses resets.** Once the entry is gone, the next Chill is a
  new freeze with a new sluggish turn. A unit can therefore be made sluggish
  at most on every third turn of its owner, and only by leaving it unfrosted,
  and so safe from Shatter, for a whole Ice Folk turn in between (Chill on
  turn `N`, nothing on turns `N + 1` and `N + 2`, Chill on turn `N + 3`).
  Casting Cold Snap on alternate turns gains nothing: the thawing turn makes
  the second cast an ordinary re-application.
- **Removal.** The entry is removed when the unit leaves the board for any
  reason (death, rising, disband, Mind Control, displacement, elimination).
  A Tend Wounded sets it to thawing ([section 10.5](#105-human-abilities)).
  Embarking, landing, Promotion, growth, a Push, a Tractor Beam, and a change
  of home do not remove it. While the unit is embarked the entry has no
  effect ([section 10.8](#108-boats-embarking-and-water)) and still counts
  down.

### 5.5 Shatter

When **a land-form unit of an Ice Folk seat attacks at distance 1** and all
of the following hold, the defender **shatters**:

1. the defender is Chilled and in land form;
2. the defender's role is not `JUGGERNAUT`;
3. after the hit (the ordinary damage, after the Blizzard, Armoured, and a
   Martian Shield), the defender's HP would be at least 1 and at most the
   attacker's owner's **Shatter threshold**: `SHATTER_HP_V7` 3, or
   `BRITTLE_SHATTER_HP_V7` 4 with Brittle.

A shattered defender **dies in that exchange**: it does not retaliate, the
attacker is credited with the kill, and:

- it **leaves no Grave**;
- it has **no death blast** (a shattered Bomb Chucker, Rocket Cart, or Scrap
  Buggy does not explode);
- everything else about its death is ordinary: kill credit, Promotion, the
  attacker's advance, and the risings. A **Bitten** unit that is shattered
  still rises as its biter's Zombie (the root's decision: no rule about
  risings), and then the attacker does not advance.

Exact points:

- **Melee only.** Distance 1 is the test, not the role: a Snow Hunter or a
  Boulder Yeti that attacks an adjacent unit can shatter it; a Rockfall, a
  shot, or a throw at distance 2 never does.
- **Only attacks.** A retaliation by an Ice Folk unit never shatters. A Sweep
  flank hit never shatters ([section 7.5](#75-sweep-and-trample-mammoth)).
- **Only the HP after the hit matters.** A hit that deals no HP damage
  (a weak hit, or one a Shield absorbs entirely) still shatters a Chilled
  unit that stands at 1 to 3 HP. A hit that kills by itself is an ordinary
  kill (an ordinary Grave and an ordinary death blast).
- **The preview is exact.** `shatters` is a field of the combat preview
  ([section 11](#11-commands-events-errors-and-queries)); on a Shatter,
  `damageToDefender` is the defender's whole remaining HP, `defenderDies` is
  true, `retaliation` is false with `noRetaliationReason: "DEFENDER_DIED"`,
  and every existing reader of kills and HP stays correct.
- **Not Shatter:** Eggs (never Chilled), embarked units, naval units, and
  `JUGGERNAUT`-role units (Juggernaut, Abomination, Troll, Brontosaurus,
  Colossus, Frost Giant). Two-slot units are not exempt: a Chilled T-Rex or
  Triceratops at 3 HP after the hit shatters.

### 5.6 Worked examples

Engine formula ([current rules section 13.2](RULESET_7_CURRENT.md#132-damage)),
open Grass, threshold 3, the target Chilled and at full HP unless stated.

| Target                           | Hits, in order                                   | Result                                                                                       |
| -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Caveman, 12 HP                   | Yeti 5 (takes 5); Yeti                           | the second hit would leave 1: **shatters**. Unchilled it survives two hits and deals 3 more. |
| Fighter, 10 HP                   | Yeti 5 (takes 5); Yeti 5                         | dead by plain damage; no Shatter is needed or happens                                        |
| Fighter, 10 HP                   | Sled with Charge                                 | 8 would leave 2: **shatters** at full HP, no retaliation                                     |
| Fighter on Field Defense         | Yeti 4 (takes 8); Yeti                           | the second hit would leave 1: **shatters**. Unchilled: 1 HP left and 6 more retaliation.     |
| Fighter, 8 HP (a Sweep flank)    | Yeti                                             | 5 would leave 3: **shatters**                                                                |
| Guard on a Walled center         | Mammoth 4 (takes 15); Mammoth 5 (takes 13); Yeti | the Yeti's 5 would leave 1: **shatters**. Unchilled the Yeti takes 10 and dies.              |
| Zombie, 18 HP                    | Yeti 5; Yeti 5; Yeti                             | the third hit would leave 2: **shatters**, and leaves no Grave                               |
| Triceratops, 20 HP               | Mammoth 6; Yeti 5; Yeti                          | the third hit would leave 3: **shatters**. Unchilled it needs a fourth hit.                  |
| T-Rex, 28 HP                     | Mammoth 6; Yeti 5; Yeti 6; Yeti 6; Yeti 5        | dead on the fifth hit by plain damage; the window was never hit                              |
| Goblin, 6 HP                     | any Ice Folk hit                                 | dead by plain damage; Shatter never happens against Goblins                                  |
| Grunt, 10 HP, Shield 2           | Yeti 5 (Shield 2, HP 3; takes 3); Yeti           | the second hit would leave 1: **shatters**. Unchilled it takes three hits.                   |
| Marksman, Knight, Wolf Rider     | Mammoth                                          | 8 would leave 2: **shatters** at full HP                                                     |
| Bomb Chucker, 8 HP               | Yeti                                             | 6 would leave 2: **shatters** at full HP, and no bomb goes off                               |
| Rocket Cart, 8 HP                | Yeti                                             | 7 would leave 1: **shatters**; the Yeti advances and takes no blast                          |
| Guard at 3 HP on a Walled center | Witch                                            | 2 would leave 1: **shatters**. Unchilled the Witch takes 11.                                 |
| Juggernaut at 3 HP               | Yeti                                             | never shatters; the hit and the retaliation are ordinary                                     |

## 6. Snow and the Blizzard

**One sentence:** Ice Folk land is Snow, where Ice Folk units slide and hide
and everyone else wades; and the eight tiles around an Ice Witch are a
Blizzard, which is Snow on any ground and halves ranged damage on the Ice
Folk units in it.

### 6.1 Which tiles are Snow

Snow is a **derived** property of a land tile. It is never stored, and it is
the same for every viewer and every seat:

```text
snow(tile) =
     tile is land (biome is not null) and not a Rift, and
     (  tile's territory belongs to a city owned by an ICE_FOLK seat        (territory)
     or tile is within Chebyshev 1 of a land-form Ice Witch                 (Blizzard)
     or tile has no territory and is within Chebyshev DEEP_WINTER_RADIUS_V7 (2)
        of the center of a city whose ICE_FOLK owner has Deep Winter )      (Deep Winter)
```

- It is computed from the current state at every read. Nothing caches it
  across commands. **Within one `MOVE`** it is read once, from the state
  before the command, for every step of the path, so a path's cost and stops
  never depend on the Move itself (this matters only for a Witch's own Move).
- A captured Ice Folk city stops being Snow at once, and a city an Ice Folk
  seat captures becomes Snow at once. A besieged Ice Folk city is still Snow.
- A Land Grant widens the Snow with the territory.
- Snow lies on Grass, Forest, and Mountain alike, on Roads, improvements,
  resources, Field Defense, city and village centers, Graves, and chests. It
  changes none of them. Water and Rift tiles are never Snow.
- Several sources do not add up: a tile is Snow or it is not.
- Snow is the same for every seat; who it helps is decided by faction
  ([section 6.3](#63-the-blizzard)).

### 6.2 What Snow does

**For a land-form unit of an Ice Folk seat:**

1. **Glide.** A step that **leaves** a Snow tile costs one half-point instead
   of two, the cost-by-origin rule of Roads
   ([current rules section 12.1](RULESET_7_CURRENT.md#121-movement)). A step
   costs one half-point when the tile being left is Snow or a usable Road
   node; the two do not add up. So a Move-1 unit that starts on Snow moves two
   tiles if the first tile it enters is also Snow, and a Sled up to four. The
   **Sabretooth never Glides**: for it only the Road rule applies. Every
   other Move rule is unchanged: Forest and unexplored cells still end an Ice
   Folk unit's Move, zones of control too, and a Mountain stops the units
   that are not Mountain-born.
2. **Snow cover.** A defender standing on Snow whose **fortification level is
   0** has cover `× 1.5`. It is the Forest and Mountain cover, not added to
   it: on a Snow tile that is a Forest or a Mountain the cover is still
   `× 1.5`. A unit with any fortification (its owner's Walled center, or
   Field Defense in its owner's territory) has no Snow cover; on a Forest or
   Mountain tile it keeps the ordinary terrain cover, as today. Acid ignores
   Snow cover like any cover. The level is the unit's own
   (`fortificationLevelForUnitV7`), whatever the attack ignores.

**For a land-form ground unit of any other faction** (movement mode
`GROUND`):

3. **Deep snow.** A Move **ends on entering a Snow tile**, exactly as on
   entering a Forest: a path that continues past it is illegal
   (`SNOW_STOPS_MOVE`), a step along a **Road edge** (both ends usable Road
   nodes for the mover) is exempt, and **Fieldcraft waives it** for the
   `RAIDER` and `MARKSMAN` roles. A unit with Move 1 off a Road is not
   affected at all. Martian walkers and flyers are never stopped by terrain
   and ignore deep snow.

Snow does nothing else: no damage, no healing, no sight change, no effect on
attacks, and none on the advance, a Push, a Charge! follow, an Overrun
continuation, or a Tractor Beam, which are not Moves. Recover is unchanged
except through Deep Winter ([section 6.6](#66-deep-winter-technology)).

### 6.3 The Blizzard

The **Blizzard** of an Ice Witch in land form is her own tile and the eight
tiles around it (`BLIZZARD_RADIUS_V7` 1), clipped to the board.

- Its land tiles are Snow ([section 6.1](#61-which-tiles-are-snow)).
- **Half ranged damage.** When a unit attacks **at distance 2 or more** a
  land-form Ice Folk unit that stands in a Blizzard, the hit is
  `ceil(damage / 2)`, applied to the formula's damage before the cap at the
  defender's HP. Nothing is ever illegal: every attack that is legal without
  the Blizzard is legal with it.
- It applies to the primary hit of an `ATTACK` only. It does **not** apply
  to: an attack from distance 1; retaliation; a splash, bomb, or Pierce hit
  on a unit that was not the primary target (those are computed from the
  primary hit as usual, so they shrink only when the primary target was in
  the Blizzard); Wail; Kaboom and death blasts; Plague.
- The Witch herself is in her Blizzard. Blizzards do not stack.

**Who gets what (the one statement of the rule, root ruling 4).** Snow and
its effects are **per faction**: every land-form Ice Folk unit, of any seat,
gets Glide and Snow cover on every Snow tile, whichever seat's territory,
Deep Winter, or Witch made it; and every land-form ground unit of another
faction is stopped by every Snow tile. The Blizzard's **ranged-damage
halving is per seat**: it protects only the land-form units owned by the
**same seat as the Witch** whose Blizzard they stand in. It never protects a
unit of another seat (an enemy Ice Folk unit included), an embarked unit, or
a boat. So in a mirror, a Yeti of seat B standing in seat A's Blizzard has
cover and Glide there but is shot at full damage, and seat A's units in that
Blizzard are halved against everyone, seat B's Ice Folk shooters included. A
unit standing in Blizzards of two Witches of its own seat is halved once.

- It moves with her and ends when she dies, embarks, or leaves the board.

### 6.4 Cold Snap

`COLD_SNAP { kind, unitId }` is a primary action of the Ice Witch (it needs
Administration, which is also what unlocks her). It is not an Attack and
costs no Coins.

- **Legality.** An own land-form Witch that has not used a primary action
  and has not landed this turn (she may have moved), with at least one
  target. Rejections, atomic, in this order: the ordinary unit errors; a role
  without `COLD_SNAP` → `UNIT_ROLE_INVALID { role }`; primary action used, or
  a sluggish Witch that moved → `UNIT_ALREADY_ACTED`; embarked →
  `COLD_SNAP_NOT_LEGAL { reason: "EMBARKED" }`; no target →
  `COLD_SNAP_NOT_LEGAL { reason: "NO_TARGET" }`.
- **Targets.** Every unit that can be Chilled
  ([section 5.2](#52-applying-chill)), is **visible to the Witch's owner**,
  and stands within Chebyshev `COLD_SNAP_RANGE_V7` (2) of her. A unit that is
  already Chilled is a target (its `turnsLeft` goes back to 2).
- **Result.** Chill is applied to every target at once. The Witch has used
  her primary action and is handled. No damage, no retaliation, no Field
  Defense destruction, no reveal. Event `UNITS_CHILLED` (source
  `COLD_SNAP`).
- Only visible units are targets, so the preview equals the result (the Wail
  rule).
- It may be cast every turn. Under [section 5.4](#54-duration-and-re-application)
  that keeps every enemy near her Shatter-eligible and slows each of them
  once.

### 6.5 Fog and projection

What an opponent can see of the winter:

- **Territory Snow** is public on every explored tile: the territory owner of
  an explored tile and every player's faction are already public.
- **Deep Winter Snow** is public on every explored tile, like territory Snow.
  It tells an opponent that the seat has researched Deep Winter, as a Field
  Defense tells that its builder has Fortification.
- **A Blizzard** is known to a viewer exactly when the viewer can see the
  Witch (her tile is explored). A Witch on an unexplored tile is hidden, and
  so is her Blizzard, even on the explored tiles next to her.
- `PlayerTileViewV7` gains `snow: boolean` and `blizzard: boolean` on explored
  tiles: `snow` is the canonical value from territory and Deep Winter, or
  from a Blizzard whose Witch the viewer sees; `blizzard` is true when the
  tile is within 1 of a visible Witch (water tiles included, for drawing).
  Unexplored tiles carry neither.
- **A Move that meets Snow the mover could not know about** (a tile in the
  Blizzard of a Witch that was hidden before the command) is accepted and
  **interrupted** there, like a Move that meets hostile zone of control first
  seen during the Move: the unit stands on that Snow tile (or on the last
  free tile it entered), `UNIT_MOVE_INTERRUPTED` reports the tile with reason
  `SNOW`, and everything revealed stays explored. A path that continues past
  a Snow tile the mover knew about is illegal and never offered.
- For an Ice Folk mover, hidden Snow can only make a step cheaper than the
  public query assumed, so every offered `MOVE` is accepted.
- `UNITS_CHILLED` is projected like `UNITS_RALLIED` with its results filtered
  to units the viewer can see; a viewer that cannot see the source but owns a
  target receives its own entries with `sourceUnitId` null.
- A unit's Chill entry, its Shatter threshold (3 or 4, in the unit stats of a
  visible Ice Folk unit), and the Blizzard of a visible Witch are public.
  Showing the threshold tells an opponent whether the seat has Brittle; it
  must be public for the opponent's attack previews to be exact.

### 6.6 Deep Winter (technology)

Deep Winter is the Ice Folk `FORTIFICATION` (Industry, tier 2, requires
Drill, ordinary tier-2 cost). While its owner has it:

- every land tile **without territory** within Chebyshev 2 of the center of
  one of the owner's cities is Snow
  ([section 6.1](#61-which-tiles-are-snow)). Tiles of another player's
  territory are never Snow through Deep Winter;
- Recover and idle recovery heal an Ice Folk land unit **6** in its owner's
  territory (`DEEP_WINTER_RECOVER_V7`), instead of 4. Elsewhere they heal 2,
  as for everyone, Snow or not.

It stores nothing: the ring is derived like all Snow and follows the cities
the seat owns. City Walls are unchanged: an Ice Folk city may choose the
Walls reward, and Walls fortify an Ice Folk unit on the center, which then
has no Snow cover.

## 7. Unit rules

### 7.1 Mountain-born

A Mountain-born unit (Yeti, Boulder Yeti, Frost Giant; role mechanic
`mountainBorn`) in land form:

- **enters a Mountain without Engineering**, in every rule that asks whether
  a unit can enter a tile: `MOVE`, `DISEMBARK`, the advance after a kill, the
  Push destination when it is the unit being pushed (also for a Charge! push
  and a Tractor Beam pull), and reward displacement;
- **is not stopped by a Mountain:** entering one does not end its Move.
  Forest, unexplored cells, and hostile zones of control still end it;
- keeps the ordinary Mountain cover `× 1.5`, and gets the +1 Sight on a
  Mountain only with Engineering, like every unit.

**Implementation: one helper.** "Can this unit enter this Mountain" is asked
in about 53 places today (the engine's Move validation and its public twin,
the advance, landing, Push, displacement, treasure and reward placement, and
the AI's route search and estimates). All of them go through one per-unit
helper. The Martian engine (commit `d88503c`, `pulp-wars-poc-7r22`, on
`main`) already routes every terrain-entry question through
`canEnterTerrainV7` in `src/engine/rules/ruleset-v7.ts`, whose Mountain case
reads Engineering and the movement mode. **Mountain-born is added to that
helper, not written beside it:** its Mountain case becomes "Engineering, or
a walker or flyer, or a Mountain-born role", and the "not stopped by
terrain" test the Martian machines use gains the Mountain-born case for
Mountains only. `unitMayEnterMountainV7(state | view, unit)` in this
document names that call for a unit. Any Engineering test for a unit
entering a Mountain that does not yet go through `canEnterTerrainV7` (in the
AI's route search and estimates, for example) is moved onto it. A test per
caller is required
([section 15](#15-implementation-split-and-test-expectations)).

### 7.2 Rockfall (Yeti)

A Yeti in land form **standing on a Mountain** may attack a visible hostile
unit at Chebyshev distance 2 as well as 1.

- An attack at distance 2 uses `ROCKFALL_ATTACK2_V7` 3 (Attack 1.5) instead
  of its Attack 2. An attack at distance 1 is ordinary.
- A unit that cannot reach distance 2 does not retaliate (the ordinary range
  rule); a ranged defender does.
- **The Yeti's own retaliation range stays 1.** A Yeti on a Mountain that is
  shot from distance 2 does not throw back.
- A Rockfall never shatters, never advances, and destroys Field Defense only
  through the ordinary rules (it is not a melee attack, so Brittle's
  demolition does not apply).
- The combat preview reports `rockfallApplied`; the public command query and
  the threatened-tiles query include the distance-2 tiles of a Yeti that
  stands on a Mountain, and of one that can reach a Mountain and then attack.
- Only the Yeti has Rockfall. The Boulder Yeti's range is 1–2 on every tile.

### 7.3 Bolas (Sled)

`THROW_BOLAS { kind, unitId, targetUnitId }` is a primary action of the Sled.
It needs no technology beyond Scouting, which unlocks the Sled. It is not an
Attack and costs no Coins.

Legality, in this order (all rejections are atomic):

| #   | Requirement                                                                                   | Rejection                                     |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `unitId` is the actor's own living unit.                                                      | the ordinary unit errors                      |
| 2   | Its role has `BOLAS`.                                                                         | `UNIT_ROLE_INVALID { role }`                  |
| 3   | It has not used a primary action and has not landed this turn; a sluggish Sled has not moved. | `UNIT_ALREADY_ACTED`                          |
| 4   | It is in land form.                                                                           | `BOLAS_NOT_LEGAL { reason: "EMBARKED" }`      |
| 5   | `targetUnitId` is a living unit the actor can see.                                            | `TARGET_NOT_FOUND`                            |
| 6   | It is hostile to the actor.                                                                   | `TARGET_ALLIED`                               |
| 7   | It can be Chilled: land form (not embarked, naval, or an Egg).                                | `BOLAS_NOT_LEGAL { reason: "TARGET_IMMUNE" }` |
| 8   | It is within Chebyshev distance `BOLAS_RANGE_V7` (2) of the Sled; distance 1 is legal.        | `BOLAS_NOT_LEGAL { reason: "OUT_OF_RANGE" }`  |

- **Result.** Chill is applied to the target ([section 5.2](#52-applying-chill)).
  The Sled has used its primary action and is handled. No damage, no
  retaliation, no Field Defense destruction, no advance. Event
  `UNITS_CHILLED` (source `BOLAS`).
- It may follow a Move. There is no line of sight and no cover against it.
- A target that is already Chilled is legal (its `turnsLeft` goes back to 2).

### 7.4 Cold Blood (Snow Hunter)

A Snow Hunter's attack on a **Chilled** defender has +0.5 Attack
(`COLD_BLOOD_BONUS2_V7` 1), at any distance. It applies to attacks only, not
to retaliation. The preview reports `coldBloodApplied`.

### 7.5 Sweep and Trample (Mammoth)

Every `ATTACK` a land-form Mammoth makes:

- **Sweep.** The **flank tiles** are the two tiles next to the target's tile
  on the ring of eight tiles around the Mammoth (one step clockwise and one
  step counter-clockwise): for a target straight ahead, the two tiles beside
  it; for a diagonal target, the two tiles between it and the Mammoth's row
  and column. Every **hostile** unit on a flank tile, in any form, takes
  `SWEEP_DAMAGE_V7` **2**, with no retaliation and no modifiers. Armoured
  reduces it to 1; a Martian Shield absorbs it first; it is capped at the
  victim's HP.
  - Flank hits are resolved together with the exchange, from the pre-attack
    state, whether or not the Mammoth survives the retaliation.
  - A flank victim that dies is credited to the Mammoth like a hostile splash
    kill, leaves an ordinary Grave or rising, and explodes if it is an
    exploding unit (the Mammoth is then in its blast). **A flank hit never
    shatters.**
  - Own and allied units are never hit. An Egg takes 2 like any unit.
  - The Mammoth's neighbours are always explored by its owner, so the
    preview is exact. The victims are listed in the preview's `splash`
    entries and the preview has `sweep: true`.
- **Trample.** Field Defense on the **target's** tile is destroyed, whoever
  owns the tile and whether or not either unit survives (reason `TRAMPLE`).
  The Field Defense still counts for that exchange. Flank tiles keep theirs.

### 7.6 Boulders and Planted (Boulder Yeti)

Every `ATTACK` a land-form Boulder Yeti makes, at distance 1 or 2:

- **ignores fortification:** the defender's fortification level is 0 for the
  whole exchange, for the damage and for the retaliation (the Charge!
  convention of [revision 20 section 2.2](RULESET_7_REVISION_20.md#22-charge)).
  Cover stays. Walls are not destroyed. The preview reports
  `fortificationLevel: 0` and the removed levels in `fortificationIgnored`;
- **destroys Field Defense** on the target's tile (reason `CATAPULT`, as for
  every `CATAPULT`-role attack);
- is **Planted** when the unit has not moved and has not landed this turn:
  +1 Attack (`PLANTED_BONUS2_V7` 2), so Attack 3 planted and 2 after a Move.
  The preview reports `plantedApplied`; an estimate for an attack after a
  planned Move uses Attack 2.

It retaliates at distance 1 and 2 like any ranged unit, with its ordinary
Defense. It never advances after a kill and cannot capture. An attack at
distance 1 can shatter ([section 5.5](#55-shatter)).

### 7.7 Prowl (Sabretooth)

- **Prowl.** Entering a cell in hostile zone of control does **not** end a
  Sabretooth's Move. It exerts zone of control like any land unit. Forest,
  Mountain (which it needs Engineering to enter), unexplored cells, and
  occupied tiles are ordinary: it does not pass other players' units.
- **No Glide.** Snow never halves its step cost. Deep snow does not apply to
  it either (it is an Ice Folk unit), and it has Snow cover like the others.
- **Never on a foreign settlement.** It cannot end a Move, or land from the
  water, on a neutral village center or on the center of a city it does not
  own: `MOVEMENT_ILLEGAL` (reason `SETTLEMENT_FORBIDDEN`, the reason the
  Martian flyers introduce), never offered. It **does not advance** onto such
  a center after a kill either (the kill is ordinary, the Sabretooth stays).
  No Push destination is ever a settlement, so nothing puts it there. It
  therefore never besieges, never blocks a capture, and never takes a
  village. It may stand on its owner's own centers.
- It has no Overrun, no capture, and no Charge.

### 7.8 Cold Aura (Frost Giant)

At its owner's **Start Turn**, each land-form Frost Giant applies Chill
([section 5.2](#52-applying-chill)) to every unit that can be Chilled on the
eight tiles around it. Giants are resolved in unit-ID order; each emits one
`UNITS_CHILLED` event (source `COLD_AURA`) when it has at least one target.
The step runs after the Martian Shield recharge and before Plague:

```text
reset activations and capture eligibility → city actions available →
Mind Control cooldowns → Shield recharge → COLD AURA → Plague → … (unchanged)
```

A unit that stays next to a Giant is sluggish once and Shatter-eligible on
every Ice Folk turn after that. The Giant never shatters another
`JUGGERNAUT`-role unit, and cannot itself be shattered.

## 8. Attack resolution order

An Ice Folk attack is an ordinary `ATTACK` resolved by the ordinary attack
resolution; there is no second code path. The order of
[revision 20 section 2.3](RULESET_7_REVISION_20.md#23-resolution-and-event-order)
becomes, with the new steps in bold:

1. Attack value: base Attack, Charge, Alpha, run-up, Gang Up, Inspired,
   **Rockfall** (the distance-2 Attack), **Planted**, **Cold Blood**.
   Defense: fortification (0 for Acid, Charge!, **Boulders**), cover
   (**Snow cover** for an unfortified Ice Folk defender on Snow).
2. Damage both ways from pre-combat HP. **Blizzard:** a hit from distance 2
   or more on an Ice Folk unit in a Blizzard is halved, rounded up. Armoured.
   Martian Shields absorb.
3. **Shatter test** on the primary defender
   ([section 5.5](#55-shatter)). A shattered defender dies: no retaliation.
4. Lifesteal (never for an Ice Folk attacker). **Sweep** flank hits (Armoured
   and Shields apply to each).
5. Kill credit (the defender, hostile flank and splash kills), then growth
   and the full heal of a grown unit.
6. Field Defense on the target tile destroyed (`CATAPULT` for a Boulder Yeti,
   **`TRAMPLE`** for a Mammoth, otherwise the ordinary reasons).
7. Deaths in order: the defender, flank and splash victims in `(y, x, id)`
   order, the attacker. Each is an Infect rising, a Bitten rising, or an
   ordinary death with its Grave; **a shattered defender has cause `SHATTER`
   and leaves no Grave** (a Bitten one still rises). Then bites and Plague on
   the survivors.
8. Push of a surviving target (Frost Giant), then the advance (never for a
   Boulder Yeti, never onto a foreign settlement for a Sabretooth).
9. Death-blast chain of the exploding units among the dead, **except a
   shattered defender**; Plunder; reveals; and the ordinary economy, reward,
   and achievement tail.

Events: `COMBAT_RESOLVED` (with the fields of
[section 11](#11-commands-events-errors-and-queries)); `FIELD_DEFENSE_DESTROYED`;
`UNIT_DIED` (cause `SHATTER`, `ATTACK`, `SPLASH`, or `RETALIATION`), each
followed by `GRAVE_CREATED` or a rising where one applies; `UNIT_GREW`;
`UNIT_PUSHED`; `UNIT_MOVED`; chain events; `PLUNDER_AWARDED`;
`TILES_REVEALED`; the tail. No existing order changes.

## 9. Per-unit battle analysis

The T-Rex was dominant and the first Triceratops useless in ways the damage
formula could have shown beforehand. Each Ice Folk unit is therefore put
through the same exchanges before any code exists, with the root's decided
numbers. Where the arithmetic had shown a unit to be dead or dominant, this
document would have changed the number; it found no such case
([section 17.1](#171-deviations-from-the-root-decisions)), and it names the
units closest to either edge.

### 9.1 Method

- **Formula.** A scratch script ports the damage formula of
  [current rules section 13.2](RULESET_7_CURRENT.md#132-damage) line for line
  from `calculateCombatPreviewV7`, with the engine's exact rounding. It was
  checked against the engine itself: 8,352 exchanges between the existing
  units of four factions (every attacking and defending land role, three HP
  levels, Grass and Forest, with and without Field Defense) on a hand-built
  state, with no mismatch. The Ice Folk rules of sections 5 to 7 are modelled
  on top of it.
- **Existing units** are read from the engine registry of commit `daceb4f`
  (`pulp-wars-poc-7r21`): the revision-20 Triceratops (20 HP, Attack 3,
  Move 2, +1 Attack per run-up tile, fortification ignored) and T-Rex
  (28 HP, Attack 4, cost 14), and Human units at their revision-19 HP.
- **Martian units are on paper.** The Martian engine was not on `main` when this analysis was run. The
  Grunt (10 HP, Shield 2, Attack 2, Defense 1.5) and the Ray Gunner (8 HP,
  Shield 2, Attack 3 at full power, range 2) use the contract values of the
  [Martian roster](RULESET_7_MARTIANS.md#3-martian-roster); every Martian
  number below must be re-run when that engine lands.
- **Opponents.** Fighter; Guard on Field Defense and on a Walled center;
  Marksman at range 2; Knight; Catapult; a Goblin with Gang Up +2 and a
  Goblin Kaboom; Caveman; Raptor with Pounce; T-Rex; Triceratops after a
  two-tile run-up; Zombie; Grunt; Ray Gunner at full power.
- **Reading the tables.** "It attacks" is the opponent attacking the Ice Folk
  unit at full HP: the HP it loses and the retaliation the opponent takes,
  in the open and on Snow (cover, no fortification). "Such attacks to kill"
  is how many identical fresh attackers kill it: in the open, on Snow, and
  beside a Witch (Snow, and ranged hits halved). The last two columns are the
  unit attacking a full-HP opponent: the damage, the HP left, and what the
  unit takes back; then the same against a Chilled opponent at threshold 3,
  where **shatters** means the opponent dies with no retaliation. "+ 2
  Shield" is what a Martian Shield absorbed.
- **The line model** ([sections 9.11](#911-skirmishes) and
  [9.12](#912-early-pressure)): each side has a front row and a back row;
  melee units attack the enemy front row, ranged units attack anything and
  are not retaliated against by melee targets; at most three melee attacks
  reach one unit per turn; attackers focus fire greedily and skip an attack
  that would kill them without a kill. Ice Folk on Snow have cover; with a
  living Witch every enemy is Chilled on each Ice Folk turn, ranged hits on
  Ice Folk units are halved, and she never attacks; without a Witch each Sled
  throws one Bolas instead of attacking. Sweep hits two other front units.
  It has **no map, no movement, no sluggish turn, no Glide, no deep snow, no
  Prowl, no Rampage, and no AI**. It ranks options and shows thresholds; it
  does not predict win rates, and several of its results flip with one HP.
- **Opponents are assumed aggressive.** The Normal AI of `pulp_wars-9s0.1`
  keeps constant pressure on known enemy territory, so the early-game check
  uses waves that keep coming and always strike first.
- **Timing** uses the measurements of the
  [Dinosaur balance report](../validation/RULESET_7_DINOSAUR_BALANCE.md) and
  of the [campaign plan](../architecture/NORMAL_AI.md#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01):
  the median decided 1v1 match ends at round 29 to 32; the Normal AI never
  saves for research or for an expensive unit; it researched Sawmilling in
  36–46% of seat-games at a median round of 26–30 and Chivalry in 22–36% at
  round 30–38; armies are five to seven units at rounds 10 to 20. No
  measurement exists for tier-1 and tier-2 technologies; those rounds are
  estimates and `pulp_wars-7g3.7` reports them.
- **Where the scripts are.** Outside the repository, in
  `/private/tmp/claude-501/-Users-nadbor-projects-pulp-wars/1d080a8d-9f97-4ca4-af61-87f1be442688/scratchpad/ice/spec/`:
  `lib.ts` (the formula, the unit tables, Shields, the Blizzard, Shatter),
  `validate.ts` (the check against the engine), `doc-tables.ts` (the per-unit
  tables), `shatter.ts` ([section 9.10](#910-how-often-shatter-fires)),
  `model.ts` (the line and wave models), `variants.ts` (the alternatives
  weighed below), and `misc.ts` and `examples.ts` (the single numbers quoted
  in the text). The directory is temporary: `pulp_wars-7g3.3` copies what it
  re-runs, or rewrites it from this section.

### 9.2 Yeti

Cost 2, 10 HP, Attack 2, Defense 2, Move 1. Human peer: Fighter (the same
numbers, with Field Defense).

- **Job.** The line, the hand that shatters, and the unit that goes where
  others cannot.
- **Typical turn.** At home: slide two tiles and hit the frosted unit, or
  hold a Snow tile in cover. Abroad: stand next to the Witch; hit what a
  Bolas, a Hunter, or a Sweep has prepared. On Highlands: cross the ridge, or
  throw rocks from it.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit attacks it: damage (HP left); unit takes | The same on a Chilled target |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| Fighter                                      | 5; 5                          | 4; 5             | 2 / 3 / 3                                          | 5 (5 left); 5                                 | 5 (5 left); 5                |
| Guard on Field Defense                       | 3; 5                          | 2; 6             | 3 / 4 / 4                                          | 3 (12 left); 10 (dies)                        | 3 (12 left); 10 (dies)       |
| Guard on a Walled center                     | 3; 5                          | 2; 6             | 3 / 4 / 4                                          | 3 (12 left); 10 (dies)                        | 3 (12 left); 10 (dies)       |
| Marksman (shoots at range 2)                 | 5; 0                          | 4; 0             | 2 / 3 / 4                                          | 6 (4 left); 2                                 | 6 (4 left); 2                |
| Knight                                       | 8; 4                          | 7; 5             | 2 / 2 / 2                                          | 6 (4 left); 2                                 | 6 (4 left); 2                |
| Catapult (range 2)                           | 10 (dies); —                  | 8; 0             | 1 / 2 / 3                                          | 7 (3 left); 0                                 | **shatters**; 0              |
| Goblin, Gang Up +2                           | 10 (dies); —                  | 8; 4             | 1 / 2 / 2                                          | 6 (kills); 0                                  | 6 (kills); 0                 |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 2 / 2 / 2                                          | —                                             | —                            |
| Caveman                                      | 5; 5                          | 4; 5             | 2 / 3 / 3                                          | 5 (7 left); 5                                 | 5 (7 left); 5                |
| Raptor with Pounce                           | 10 (dies); —                  | 8; 4             | 1 / 2 / 2                                          | 6 (6 left); 2                                 | 6 (6 left); 2                |
| T-Rex                                        | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 1                                          | 5 (23 left); 5                                | 5 (23 left); 5               |
| Triceratops, run-up 2                        | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 1                                          | 5 (15 left); 5                                | 5 (15 left); 5               |
| Zombie                                       | 5; 5                          | 4; 5             | 2 / 3 / 3                                          | 5 (13 left); 5                                | 5 (13 left); 5               |
| Grunt (Shield 2)                             | 5; 5                          | 4; 5             | 2 / 3 / 3                                          | 3 + 2 Shield (7 left); 3                      | 3 + 2 Shield (7 left); 3     |
| Ray Gunner (Shield 2), full power at range 2 | 8; 0                          | 7; 0             | 2 / 2 / 3                                          | 4 + 2 Shield (4 left); 2                      | 4 + 2 Shield (4 left); 2     |

- **Rockfall** (from a Mountain, distance 2, Attack 1.5): 3 on a Fighter,
  Caveman, Zombie, T-Rex, or Triceratops; 2 on a Guard; 4 on a Knight or a
  Raptor; 5 on a Goblin (1 HP left); 1 HP and the Shield of a Grunt. No melee
  unit retaliates; a Marksman or a Ray Gunner does, for 2. On the Mountain
  the Yeti has cover: a Fighter that climbs up to it deals 4 and takes 5. At
  the first draft's Attack 2 the shot was a Marksman's 5; at 1.5 it is a
  harassing shot that finishes wounded units and never shatters.
- **Goblin pack.** One Goblin with two helpers kills it in the open (10) and
  leaves it at 2 HP on Snow; a Kaboom (5) and one such hit kill it on any
  ground. A Yeti kills a Goblin with every hit and takes nothing back.
- **Caveman and Raptor rush.** A Raptor's Pounce kills it in the open; on
  Snow it deals 8 (the Raptor takes 4) and a Caveman finishes it. A Caveman
  trades evenly (5 and 5) and has 2 more HP. The answer is Chill: two Yetis
  kill a Chilled Caveman (5, then a Shatter at 7 HP) where three are needed
  otherwise, and take 5 back instead of 8.
- **T-Rex and Triceratops.** Either kills a Yeti in one hit on any ground. A
  Yeti deals each of them 5 and takes 5.
- **Martians.** A Grunt is a Fighter with a Shield: the Yeti's 5 costs it 3
  HP, and the Grunt's hit on a Yeti is a Fighter's. Chilled, the Grunt dies
  to two Yetis instead of three. A Ray Gunner at full power deals a Yeti 8,
  7 on Snow, and 4 beside a Witch.
- **Against the Fighter.** On warm ground five Yetis against five Fighters
  is the Fighter mirror (10 Coins lost and 8 killed when attacking first, 8
  and 10 when attacked). On Snow the same fight is 6 and 10, and 4 and 10.
  Against five Cavemen: 10 and 6, and 10 and 4 on warm ground (exactly what
  Fighters do), 10 and 8, and 8 and 10 on Snow.
- **Timing.** Round 1; it is the starting unit.
- **Counters.** Everything that beats a Fighter; Gang Up; a T-Rex; any
  fortified defender (a Yeti that attacks a Guard on Field Defense or Walls
  dies to the retaliation); no Field Defense of its own abroad.
- **Verdict: useful, not dominant.** It is a Fighter that trades Field
  Defense for Snow at home and Mountains everywhere. Watch items: the cover
  on the home ring against Humans, and Rockfall on Highlands.

### 9.3 Sled

Cost 3, 10 HP, Attack 2, Defense 1, Move 2, Sight 2. Human peer: Raider
(4 Coins, the same numbers, Escape).

- **Job.** Before the Witch it is the only way the faction's loop exists: it
  chooses who is frosted. It also scouts and captures like any Raider.
- **Typical turn.** Move up to two tiles (four on Snow) and throw the Bolas
  at the unit that is about to arrive, so that it cannot strike on arrival,
  or at the unit two Yetis are about to hit. With Raiding and a Witch near,
  it leaves the throwing to her and charges frosted units itself.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit attacks it with Charge: damage (HP left); unit takes | The same on a Chilled target |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Fighter                                      | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 8 (2 left); 4                                             | **shatters**; 0              |
| Guard on Field Defense                       | 4; 2                          | 3; 2             | 3 / 3 / 3                                          | 6 (9 left); 10 (dies)                                     | 6 (9 left); 10 (dies)        |
| Guard on a Walled center                     | 4; 2                          | 3; 2             | 3 / 3 / 3                                          | 5 (10 left); 10 (dies)                                    | 5 (10 left); 10 (dies)       |
| Marksman (shoots at range 2)                 | 6; 0                          | 5; 0             | 2 / 2 / 3                                          | 10 (kills); 0                                             | 10 (kills); 0                |
| Knight                                       | 10 (dies); —                  | 9; 2             | 1 / 2 / 2                                          | 10 (kills); 0                                             | 10 (kills); 0                |
| Catapult (range 2)                           | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 2                                          | 10 (kills); 0                                             | 10 (kills); 0                |
| Goblin, Gang Up +2                           | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 1                                          | 6 (kills); 0                                              | 6 (kills); 0                 |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 2 / 2 / 2                                          | —                                                         | —                            |
| Caveman                                      | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 8 (4 left); 4                                             | 8 (4 left); 4                |
| Raptor with Pounce                           | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 1                                          | 10 (2 left); 1                                            | **shatters**; 0              |
| T-Rex                                        | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 1                                          | 8 (20 left); 4                                            | 8 (20 left); 4               |
| Triceratops, run-up 2                        | 10 (dies); —                  | 10 (dies); —     | 1 / 1 / 1                                          | 8 (12 left); 4                                            | 8 (12 left); 4               |
| Zombie                                       | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 8 (10 left); 4                                            | 8 (10 left); 4               |
| Grunt (Shield 2)                             | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 7 + 2 Shield (3 left); 2                                  | **shatters** (2 Shield); 0   |
| Ray Gunner (Shield 2), full power at range 2 | 10 (dies); —                  | 9; 0             | 1 / 2 / 2                                          | 8 + 2 Shield (kills); 0                                   | 8 + 2 Shield (kills); 0      |

- **Charge and Shatter.** With Raiding a charging Sled deals a Fighter 8,
  which leaves 2: a **Chilled Fighter, Skeleton, or Grunt at full HP
  shatters**, on Field Defense too (3 left), and so does a Raptor. It kills a
  Marksman, Knight, Catapult, or Ray Gunner outright. This is the faction's
  way to make Shatter count against 10-HP Defense-2 bodies, which a Yeti
  cannot shatter from full HP. It is in line with what exists: a Raider next
  to a Captain's Rally, a Frenzied Ghoul, and a Wolf Rider with one helper
  all charge at Attack 4 and kill a Fighter outright (10), and a Caveman too
  (12), which the Sled does not (8, 4 left). It is a watch item because it
  needs no adjacency, only a Witch within two tiles of the victim.
- **Without Charge** it is a 3-Coin Ghoul or Wolf Rider: 5 on a Fighter,
  taking 5.
- **Struck.** A Fighter deals it 6 (two hits kill); a Knight, a Goblin with
  two helpers, a Raptor's Pounce, a T-Rex, a Triceratops, a Catapult, or a
  full-power ray kills it in one.
- **Against the Raider.** Three Sleds (9 Coins) against two Raiders (8): 0
  lost and 8 killed when attacking first, 6 and 8 when attacked. It is a
  cheaper Raider without Escape; the Bolas is what the Coin buys.
- **Timing.** Scouting is tier 1 and a candidate for the free opening
  technology: rounds 2 to 6. Charge needs Raiding (tier 2).
- **Counters.** Any hit. It is worth killing first.
- **Verdict: useful.** At 4 Coins it was overpriced for one Chill a turn; at
  3 it is cheap enough to be seen. The Charge-and-Shatter kill is the thing
  to watch.

### 9.4 Snow Hunter

Cost 3, 8 HP, Attack 2, Defense 1, Move 1, range 1–2. Human peer: Marksman
(the same with 10 HP).

- **Job.** Ranged damage that brings a frosted unit into the Shatter window
  without taking a blow.
- **Typical turn.** Shoot the frosted unit a Yeti is about to hit. On Snow,
  slide two tiles first to get the angle.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit shoots it at range 2: damage (HP left); unit takes | The same on a Chilled target (Cold Blood) |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| Fighter                                      | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 5 (5 left); 0                                           | 6 (4 left); 0                             |
| Guard on Field Defense                       | 4; 2                          | 3; 2             | 2 / 3 / 3                                          | 3 (12 left); 0                                          | 4 (11 left); 0                            |
| Guard on a Walled center                     | 4; 2                          | 3; 2             | 2 / 3 / 3                                          | 3 (12 left); 0                                          | 4 (11 left); 0                            |
| Marksman (shoots at range 2)                 | 6; 2                          | 5; 2             | 2 / 2 / 3                                          | 6 (4 left); 2                                           | 8 (2 left); 1                             |
| Knight                                       | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 1                                          | 6 (4 left); 0                                           | 8 (2 left); 0                             |
| Catapult (range 2)                           | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 2                                          | 7 (3 left); 0                                           | 9 (1 left); 0                             |
| Goblin, Gang Up +2                           | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 1                                          | 6 (kills); 0                                            | 6 (kills); 0                              |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 2 / 2 / 2                                          | —                                                       | —                                         |
| Caveman                                      | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 5 (7 left); 0                                           | 6 (6 left); 0                             |
| Raptor with Pounce                           | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 1                                          | 6 (6 left); 0                                           | 8 (4 left); 0                             |
| T-Rex                                        | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 1                                          | 5 (23 left); 0                                          | 6 (22 left); 0                            |
| Triceratops, run-up 2                        | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 1                                          | 5 (15 left); 0                                          | 6 (14 left); 0                            |
| Zombie                                       | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 5 (13 left); 0                                          | 6 (12 left); 0                            |
| Grunt (Shield 2)                             | 6; 2                          | 5; 2             | 2 / 2 / 2                                          | 3 + 2 Shield (7 left); 0                                | 5 + 2 Shield (5 left); 0                  |
| Ray Gunner (Shield 2), full power at range 2 | 8 (dies); —                   | 8 (dies); —      | 1 / 1 / 2                                          | 4 + 2 Shield (4 left); 2                                | 6 + 2 Shield (2 left); 1                  |

- **Cold Blood** is one more point on most targets (6 on a Fighter, Caveman,
  Zombie, T-Rex), two on the thin ones (8 on a Knight, Marksman, or Raptor),
  and one on a fortified Guard (4). At +1 Attack it was 8 on a Fighter and a
  60% bonus, which made a 3-Coin unit a permanent Attack-3 shooter next to a
  Witch; +0.5 is the root's value and the table's.
- **What it sets up.** A Hunter and two Yetis kill a Chilled Fighter on Walls
  with two hits and no retaliation (three hits and 10 back without Shatter),
  a Chilled Guard on Field Defense in three hits (2 HP left without), a
  Chilled Zombie and a Chilled Triceratops in three.
- **Struck.** 8 HP: a Fighter's 6 leaves 2, and a Knight, a charging Raider,
  a Raptor, a Goblin with helpers, a Catapult, or a full-power ray kills it.
  A Marksman duel goes to whoever shoots first (6 each way). Beside a Witch
  a Marksman deals it 3.
- **Against the Marksman.** Three Yetis and two Hunters (12 Coins) against
  three Fighters and two Marksmen (12): 7 lost and 12 killed when attacking
  first, 12 and 6 on Snow and 12 and 4 on warm ground when attacked; the
  Marksman mirror gives 4 and 12, and 12 and 4. With 10 HP the Hunter gives
  4 and 12, and 12 and 9 on Snow: better than the Marksman it copies. 8 HP is
  kept.
- **Timing.** Marksmanship is tier 2: about rounds 10 to 18.
- **Counters.** Reach it; keep units unfrosted; shoot it from outside the
  Blizzard.
- **Verdict: useful.** A Marksman with 2 HP less, a small bonus that needs a
  Sled or a Witch, and Snow under its feet at home. It is the least special
  unit of the roster and is neither dead nor strong.

### 9.5 Mammoth

Cost 6, 20 HP, Attack 2.5, Defense 2, Move 1, one slot, attacks after
moving. Human peer: Guard (3 Coins, 15 HP, Attack 1.5, Defense 3).

- **Job.** The big beast: one attack that hurts three units, flattens the
  Field Defense under the middle one, and leaves the flanks in the Yetis'
  Shatter window. At home it anchors a center.
- **Typical turn.** Walk into the line and swing at the unit with neighbours
  on both sides. The Yetis then hit the flanks.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit attacks it: damage (HP left); unit takes | The same on a Chilled target |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| Fighter                                      | 5; 5                          | 4; 5             | 4 / 5 / 5                                          | 6 (4 left); 4                                 | 6 (4 left); 4                |
| Guard on Field Defense                       | 3; 5                          | 2; 6             | 6 / 7 / 7                                          | 4 (11 left); 11                               | 4 (11 left); 11              |
| Guard on a Walled center                     | 3; 5                          | 2; 6             | 6 / 7 / 7                                          | 4 (11 left); 15                               | 4 (11 left); 15              |
| Marksman (shoots at range 2)                 | 5; 0                          | 4; 0             | 4 / 5 / 8                                          | 8 (2 left); 1                                 | **shatters**; 0              |
| Knight                                       | 8; 4                          | 7; 5             | 3 / 3 / 3                                          | 8 (2 left); 1                                 | **shatters**; 0              |
| Catapult (range 2)                           | 10; 0                         | 8; 0             | 2 / 3 / 4                                          | 9 (1 left); 0                                 | **shatters**; 0              |
| Goblin, Gang Up +2                           | 10; 3                         | 8; 4             | 2 / 3 / 3                                          | 6 (kills); 0                                  | 6 (kills); 0                 |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 4 / 4 / 4                                          | —                                             | —                            |
| Caveman                                      | 5; 5                          | 4; 5             | 4 / 5 / 5                                          | 6 (6 left); 4                                 | 6 (6 left); 4                |
| Raptor with Pounce                           | 10; 3                         | 8; 4             | 2 / 3 / 3                                          | 8 (4 left); 1                                 | 8 (4 left); 1                |
| T-Rex                                        | 12; 3                         | 10; 4            | 2 / 2 / 2                                          | 6 (22 left); 4                                | 6 (22 left); 4               |
| Triceratops, run-up 2                        | 16; 3                         | 14; 3            | 2 / 2 / 2                                          | 6 (14 left); 4                                | 6 (14 left); 4               |
| Zombie                                       | 5; 5                          | 4; 5             | 4 / 5 / 5                                          | 6 (12 left); 4                                | 6 (12 left); 4               |
| Grunt (Shield 2)                             | 5; 5                          | 4; 5             | 4 / 5 / 5                                          | 5 + 2 Shield (5 left); 3                      | 5 + 2 Shield (5 left); 3     |
| Ray Gunner (Shield 2), full power at range 2 | 8; 0                          | 7; 0             | 3 / 3 / 5                                          | 6 + 2 Shield (2 left); 1                      | **shatters** (2 Shield); 0   |

- **Sweep.** Against a line of Fighters one attack deals 6 + 2 + 2. A flank
  Fighter at 8 HP is exactly what a Yeti shatters (5 would leave 3), so a
  Mammoth and two Yetis kill two Chilled Fighters in a turn where three
  Yetis kill one. In the line model a Mammoth, two Yetis, and a Witch
  (15 Coins) against seven Fighters (14) lose 6 and kill 14 attacking first
  and lose 8 and kill 14 attacked, with 14 Shatters in 18 Ice Folk fight
  turns: the Mammoth is what makes the loop work against Humans.
- **Alone it shatters** a Chilled Marksman, Knight, Raider, Wolf Rider,
  Spitter, Scrap Buggy, Catapult, or Ray Gunner at full HP (8 or 9 would
  leave 1 or 2). It does not shatter a full Fighter (6 leaves 4) until
  Brittle.
- **Fortified targets.** It deals a Guard on a Walled center 4 and takes 15,
  and survives; two Mammoths and a Yeti kill that Guard when it is Chilled
  ([section 5.6](#56-worked-examples)). Trample removes the Field Defense
  for everyone who attacks after it.
- **Struck.** A Fighter needs four hits (five on Snow, five on its own Walled
  center). A Goblin with two helpers deals 10, a Raptor's Pounce 10, a
  T-Rex 12, a Triceratops after a run-up 16: two such hits kill it. A Kaboom
  and two Goblins with helpers kill it. A Catapult needs two shots, three on
  Walls, and five on Walls beside a Witch.
- **Per Coin it is weak.** Two Mammoths (12 Coins) against six Fighters (12)
  lose 6 and kill 12 only when they attack first on Snow; attacked on Snow
  they lose 12 and kill 10, on warm ground 12 and 8 attacking and 12 and 0
  attacked. Four Guards for the same Coins lose 9 and kill 12, and 6 and 12;
  two Ankylosauruses (10) lose nothing against five Fighters. Against six
  Cavemen the two Mammoths lose every case but one, and against two
  Ankylosauruses all four.
- **Per slot it is strong.** Two Mammoths against two Guards (two slots
  each): 0 lost, 6 killed either way. Against four Fighters (twice the
  slots, 8 Coins): 6 and 8 either way. Normal AI armies are slot-limited
  (five to seven units), and it fills a free slot at once.
- **In a mixed group it is fine.** A Mammoth and two Yetis (10 Coins)
  against five Fighters (10): 6 and 10, and 2 and 10 on Snow; 2 and 10
  attacking on warm ground; 10 and 2 attacked there.
- **Alternatives weighed.** 22 HP, and 24 HP (the second draft's value,
  priced there at two slots), each win three of the four cases against
  Fighters instead of one; Defense 2.5 at 20 HP flips almost every case, Goblins on Snow
  included, which is too much for half a point. None is needed to make the
  unit useful, so the root's 20 HP stands; 22 HP is the first lever if the
  telemetry shows Mammoths dying without effect
  ([section 16.3](#163-tuning-bounds)).
- **Timing.** Drill is tier 1: rounds 3 to 8. One slot, so a level-1 capital
  can train it as soon as it has 6 Coins.
- **Counters.** Goblin packs (twelve Goblins beat two Mammoths 12 to 2); a
  T-Rex or a run-up Triceratops; a force of equal Coins that strikes first on
  warm ground; a Catapult.
- **Verdict: useful per slot, weak per Coin; the unit nearest the "dead"
  edge on warm ground and the "dominant" edge per slot at home.** Both are
  watch items for `pulp_wars-7g3.7`. It is kept at one slot because a
  two-slot unit is nearly absent under this AI, and it is half of the Shatter
  set-up.

### 9.6 Ice Witch

Cost 5, 12 HP, Attack 1, Defense 1, Move 1. Human peer: Captain (5 Coins,
10 HP, Rally, Tend Wounded).

- **Job.** The army's weather: Snow under the wave, half ranged damage on
  it, and every enemy within two tiles frosted.
- **Typical turn.** First in the turn: step to the tile with the most own
  units around it, cast Cold Snap. The rest of the army then acts with cover,
  Glide, Cold Blood, and Shatter in its previews.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit attacks it: damage (HP left); unit takes | The same on a Chilled target |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| Fighter                                      | 6; 2                          | 5; 2             | 2 / 3 / 3                                          | 2 (8 left); 6                                 | 2 (8 left); 6                |
| Guard on Field Defense                       | 4; 2                          | 3; 2             | 3 / 3 / 3                                          | 1 (14 left); 12 (dies)                        | 1 (14 left); 12 (dies)       |
| Guard on a Walled center                     | 4; 2                          | 3; 2             | 3 / 3 / 3                                          | 1 (14 left); 12 (dies)                        | 1 (14 left); 12 (dies)       |
| Marksman (shoots at range 2)                 | 6; 0                          | 5; 0             | 2 / 3 / 4                                          | 2 (8 left); 2                                 | 2 (8 left); 2                |
| Knight                                       | 10; 1                         | 9; 2             | 2 / 2 / 2                                          | 2 (8 left); 2                                 | 2 (8 left); 2                |
| Catapult (range 2)                           | 12 (dies); —                  | 11; 0            | 1 / 2 / 2                                          | 3 (7 left); 0                                 | 3 (7 left); 0                |
| Goblin, Gang Up +2                           | 12 (dies); —                  | 11; 1            | 1 / 2 / 2                                          | 3 (3 left); 1                                 | **shatters**; 0              |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 3 / 3 / 3                                          | —                                             | —                            |
| Caveman                                      | 6; 2                          | 5; 2             | 2 / 3 / 3                                          | 2 (10 left); 6                                | 2 (10 left); 6               |
| Raptor with Pounce                           | 12 (dies); —                  | 11; 1            | 1 / 2 / 2                                          | 2 (10 left); 2                                | 2 (10 left); 2               |
| T-Rex                                        | 12 (dies); —                  | 12 (dies); —     | 1 / 1 / 1                                          | 2 (26 left); 6                                | 2 (26 left); 6               |
| Triceratops, run-up 2                        | 12 (dies); —                  | 12 (dies); —     | 1 / 1 / 1                                          | 2 (18 left); 6                                | 2 (18 left); 6               |
| Zombie                                       | 6; 2                          | 5; 2             | 2 / 3 / 3                                          | 2 (16 left); 6                                | 2 (16 left); 6               |
| Grunt (Shield 2)                             | 6; 2                          | 5; 2             | 2 / 3 / 3                                          | 0 + 2 Shield (10 left); 4                     | 0 + 2 Shield (10 left); 4    |
| Ray Gunner (Shield 2), full power at range 2 | 10; 0                         | 9; 0             | 2 / 2 / 3                                          | 0 + 2 Shield (8 left); 2                      | 0 + 2 Shield (8 left); 2     |

- **What she adds** (line model; Coins lost and killed, attacking first and
  attacked first; a group with a Witch has Snow on warm ground too):

  | Fight (Coins)                                                    | Attacking first | Attacked first | Shatters in Ice Folk fight turns |
  | ---------------------------------------------------------------- | --------------: | -------------: | -------------------------------- |
  | 7 Yetis (14) against 7 Fighters (14), warm ground                |         12 / 14 |        14 / 12 | 0 in 7                           |
  | 5 Yetis and a Witch (15) against 7 Fighters (14)                 |         15 / 10 |         6 / 14 | 3 in 8                           |
  | 7 Yetis (14) against 7 Cavemen (14), warm ground                 |          14 / 8 |         14 / 4 | 0 in 5                           |
  | 5 Yetis and a Witch (15) against 7 Cavemen (14)                  |         15 / 10 |         8 / 14 | 9 in 10                          |
  | 7 Yetis (14) against 4 Fighters and 2 Marksmen (14), warm ground |          8 / 14 |         14 / 8 | 0 in 6                           |
  | 5 Yetis and a Witch (15) against 4 Fighters and 2 Marksmen (14)  |          6 / 14 |         9 / 14 | 1 in 7                           |
  | 5 Yetis and a Witch (15) against 5 Grunts and a Ray Gunner (14)  |          6 / 14 |         6 / 14 | 8 in 7                           |
  | 5 Yetis and a Witch (15) against 5 Zombies (15)                  |          15 / 9 |         15 / 9 | 3 in 9                           |
  | 5 Yetis and a Witch (15) against 15 Goblins with Gang Up +2 (15) |          15 / 5 |         15 / 0 | 0 in 2                           |
  | 3 Yetis and a Witch (11) against 5 Fighters (10)                 |          11 / 4 |         4 / 10 | 2 in 14                          |

  She is worth her 5 Coins from about five units up, against tough bodies
  (Cavemen), ranged support, and Shields, and when the wave **receives** the
  charge in her cover and then shatters. She is not worth them in a group of
  three, against Goblins, or when her wave walks into fresh Fighters: a Yeti
  that attacks gives up nothing, but takes the retaliation, and the model's
  Fighters then pick off the wounded. On a board the first strike is usually
  hers anyway, because a unit that walks into her two-tile Cold Snap is
  sluggish on arrival.

- **Struck.** She always stands on her own Snow: a Fighter deals her 5 and
  three hits kill her; a Knight 9, a Goblin with two helpers 11, a Raptor's
  Pounce 11 (two hits); a T-Rex or a run-up Triceratops kills her; a Marksman
  deals her 3 and a Catapult 6 (halved). A Kaboom deals 5. On a Walled center
  she has no cover and is fortified instead.
- **At home.** A Witch beside a Walled center halves siege fire on the
  defender: a Catapult deals a Yeti or a Mammoth on Walls 4 instead of 7, so
  a Mammoth there takes five shots, where a Guard on Walls takes three. This
  is the strongest turtle position the faction has; she stands on an
  unfortified ring tile and dies to three Fighter hits, or to two Rallied
  ones (9, then dead).
- **Against the Captain.** No Rally and no healing. A Captain makes a group
  hit harder for a turn and heals it; the Witch makes it harder to hit and
  lets it finish kills for free.
- **Timing.** Administration is tier 2: about rounds 10 to 20. Waves leave
  with or without her.
- **Counters.** Melee reach (12 HP, Defense 1); a Catapult from three tiles;
  an army wider than her nine tiles; fights where she is not.
- **Verdict: useful and strong, the unit to watch.** Nothing in the faction
  requires her, and three of its rules (Blizzard, the wide Chill, most
  Shatters) come from her. First levers: Cold Snap radius 1; 10 HP; cost 6.

### 9.7 Boulder Yeti

Cost 8, 12 HP, Attack 2 (3 unmoved), Defense 1.5, Move 2, range 1–2. Human
peer: Catapult (8 Coins, 10 HP, Attack 3.5, range 2–3, cannot attack after
moving).

- **Job.** The breacher that keeps up with the wave: it answers Walls and
  Field Defense, which Yetis cannot.
- **Typical turn.** Walk with the wave and throw for a Marksman's damage; the
  turn after, stay planted and throw for 8 on anything, Walls or not.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit throws unmoved at range 2: damage (HP left); unit takes | The same after a Move    |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | ------------------------------------------------------------ | ------------------------ |
| Fighter                                      | 5; 3                          | 4; 4             | 3 / 3 / 3                                          | 8 (2 left); 0                                                | 5 (5 left); 0            |
| Guard on Field Defense                       | 3; 3                          | 3; 4             | 3 / 4 / 4                                          | 7 (8 left); 0                                                | 4 (11 left); 0           |
| Guard on a Walled center                     | 3; 3                          | 3; 4             | 3 / 4 / 4                                          | 7 (8 left); 0                                                | 4 (11 left); 0           |
| Marksman (shoots at range 2)                 | 5; 3                          | 4; 4             | 3 / 3 / 4                                          | 10 (kills); 0                                                | 6 (4 left); 2            |
| Knight                                       | 9; 2                          | 8; 3             | 2 / 2 / 2                                          | 10 (kills); 0                                                | 6 (4 left); 0            |
| Catapult (range 2)                           | 11; 2                         | 10; 3            | 2 / 2 / 3                                          | 10 (kills); 0                                                | 7 (3 left); 0            |
| Goblin, Gang Up +2                           | 11; 2                         | 10; 3            | 2 / 2 / 2                                          | 6 (kills); 0                                                 | 6 (kills); 0             |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 3 / 3 / 3                                          | —                                                            | —                        |
| Caveman                                      | 5; 3                          | 4; 4             | 3 / 3 / 3                                          | 8 (4 left); 0                                                | 5 (7 left); 0            |
| Raptor with Pounce                           | 11; 2                         | 10; 3            | 2 / 2 / 2                                          | 10 (2 left); 0                                               | 6 (6 left); 0            |
| T-Rex                                        | 12 (dies); —                  | 12 (dies); —     | 1 / 1 / 1                                          | 8 (20 left); 0                                               | 5 (23 left); 0           |
| Triceratops, run-up 2                        | 12 (dies); —                  | 12 (dies); —     | 1 / 1 / 1                                          | 8 (12 left); 0                                               | 5 (15 left); 0           |
| Zombie                                       | 5; 3                          | 4; 4             | 3 / 3 / 3                                          | 8 (10 left); 0                                               | 5 (13 left); 0           |
| Grunt (Shield 2)                             | 5; 3                          | 4; 4             | 3 / 3 / 3                                          | 7 + 2 Shield (3 left); 0                                     | 3 + 2 Shield (7 left); 0 |
| Ray Gunner (Shield 2), full power at range 2 | 9; 2                          | 8; 3             | 2 / 2 / 3                                          | 8 + 2 Shield (kills); 0                                      | 4 + 2 Shield (4 left); 2 |

- **Against fortification** (damage per throw; the peers pay the full
  fortification, the Triceratops takes the retaliation shown):

  | Target                           | Boulder Yeti, moved | Boulder Yeti, planted | Catapult | Tripod, full / half power | Triceratops, run-up 2 | Marksman |
  | -------------------------------- | ------------------: | --------------------: | -------: | ------------------------- | --------------------- | -------: |
  | Fighter                          |                   5 |                     8 |       10 | 10 / 5                    | 10 (takes 0)          |        5 |
  | Fighter on a Walled center       |                   5 |                     8 |        7 | 9 / 3                     | 10 (takes 0)          |        3 |
  | Guard on Field Defense           |                   4 |                     7 |        7 | 9 / 3                     | 14 (takes 5)          |        3 |
  | Guard on a Walled center         |                   4 |                     7 |        6 | 8 / 3                     | 14 (takes 5)          |        3 |
  | Guard on Walls and Field Defense |                   4 |                     7 |        6 | 7 / 2                     | 14 (takes 5)          |        2 |
  | Caveman, Zombie, T-Rex           |                   5 |                     8 |       10 | 12 / 5                    | 12 to 16              |        5 |
  | Ankylosaurus                     |                   3 |                     6 |        7 | 9 / 3                     | 13 (takes 5)          |        3 |

  Planted, it is a Catapult that is one point better against Walls and two
  worse in the open, at range 2 instead of 3; after a Move it is a Marksman
  that ignores Walls. Two planted throws kill a Guard on Walls and Field
  Defense. It never does what the second draft's version did (8 on a Walled
  Fighter from four tiles away after a Move): the reach of the full throw is
  two tiles, and the reach of the weak one four.

- **Struck.** 12 HP and Defense 1.5: a Fighter deals 5 (three hits), a Knight
  9, a Goblin with helpers 11, a Raptor's Pounce 11; a T-Rex or a run-up
  Triceratops kills it. It retaliates against shooters at range 2 (3 on a
  Marksman).
- **Timing.** Sawmilling is tier 3: a third to a half of Normal seat-games,
  around round 26 to 30, when the median match ends at round 29 to 32. A
  human player reaches it.
- **Counters.** Three basic hits; it has to stand within two tiles; a
  Catapult out-ranges it; a planted one has told the opponent where it will
  throw.
- **Verdict: useful, not dominant.** Planted is the heat-ray rule again (full
  power only from a unit that has not moved) and it does the same work here.
  It will be rare in Normal matches; that is the tier, not the unit.

### 9.8 Sabretooth

Cost 9, 14 HP, Attack 3, Defense 1, Move 3. Human peer: Knight (9 Coins,
10 HP, the same Attack, Defense, and Move, Overrun).

- **Job.** One bite on the unit behind the line: zones of control do not
  stop it.
- **Typical turn.** Run three tiles through the gaps of the enemy line and
  kill the Marksman, the Captain, the Catapult, or the frosted Fighter.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit attacks it: damage (HP left); unit takes | The same on a Chilled target |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| Fighter                                      | 6; 2                          | 5; 2             | 3 / 3 / 3                                          | 8 (2 left); 4                                 | **shatters**; 0              |
| Guard on Field Defense                       | 4; 2                          | 3; 2             | 3 / 4 / 4                                          | 6 (9 left); 10                                | 6 (9 left); 10               |
| Guard on a Walled center                     | 4; 2                          | 3; 2             | 3 / 4 / 4                                          | 5 (10 left); 14 (dies)                        | 5 (10 left); 14 (dies)       |
| Marksman (shoots at range 2)                 | 6; 0                          | 5; 0             | 3 / 3 / 5                                          | 10 (kills); 0                                 | 10 (kills); 0                |
| Knight                                       | 10; 1                         | 9; 2             | 2 / 2 / 2                                          | 10 (kills); 0                                 | 10 (kills); 0                |
| Catapult (range 2)                           | 12; 0                         | 11; 0            | 2 / 2 / 3                                          | 10 (kills); 0                                 | 10 (kills); 0                |
| Goblin, Gang Up +2                           | 12; 1                         | 11; 1            | 2 / 2 / 2                                          | 6 (kills); 0                                  | 6 (kills); 0                 |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 3 / 3 / 3                                          | —                                             | —                            |
| Caveman                                      | 6; 2                          | 5; 2             | 3 / 3 / 3                                          | 8 (4 left); 4                                 | 8 (4 left); 4                |
| Raptor with Pounce                           | 12; 1                         | 11; 1            | 2 / 2 / 2                                          | 10 (2 left); 1                                | **shatters**; 0              |
| T-Rex                                        | 14 (dies); —                  | 13; 1            | 1 / 2 / 2                                          | 8 (20 left); 4                                | 8 (20 left); 4               |
| Triceratops, run-up 2                        | 14 (dies); —                  | 14 (dies); —     | 1 / 1 / 1                                          | 8 (12 left); 4                                | 8 (12 left); 4               |
| Zombie                                       | 6; 2                          | 5; 2             | 3 / 3 / 3                                          | 8 (10 left); 4                                | 8 (10 left); 4               |
| Grunt (Shield 2)                             | 6; 2                          | 5; 2             | 3 / 3 / 3                                          | 7 + 2 Shield (3 left); 2                      | **shatters** (2 Shield); 0   |
| Ray Gunner (Shield 2), full power at range 2 | 10; 0                         | 9; 0             | 2 / 2 / 3                                          | 8 + 2 Shield (kills); 0                       | 8 + 2 Shield (kills); 0      |

- **Bite.** It kills a Marksman, Knight, Raider, Catapult, Captain, Lich, or
  Ray Gunner outright (10). A Chilled Fighter, Skeleton, Grunt, or Raptor at
  full HP shatters (8 or 10 would leave 2 or 3). A Caveman is left at 4, a
  Guard on Field Defense at 9 (and the Sabretooth takes 10), a T-Rex at 20.
- **Struck.** 14 HP: a Fighter deals 6 (three hits), a Knight 10, a Goblin
  with helpers 12, a Raptor's Pounce 12; a T-Rex or a run-up Triceratops
  kills it. It is alone after the bite, off Snow more often than not, and
  usually dead the turn after.
- **Against the Knight.** In a duel whoever attacks first wins. The Knight
  kills again after each kill (Overrun) and, next to a Captain, kills a
  Fighter outright; the Sabretooth kills once, survives one more hit, goes
  through a line instead of round it, and can never stand on a center, so it
  never besieges or blocks a capture.
- **Reach.** Three tiles plus the attack, the same on every ground: it does
  not Glide. A Sabretooth with Glide and Prowl reached six tiles through any
  screen in the first draft.
- **Timing.** Chivalry is tier 3: 22–36% of Normal seat-games, around round
  30 to 38.
- **Counters.** Two ranks; a second unit next to the target; it dies to two
  or three hits where it lands.
- **Verdict: useful, not dominant.** One kill a turn for 9 Coins and a
  countable reach.

### 9.9 Frost Giant

Reward only. 40 HP, Attack 4, Defense 4, Move 1, Push. Human peer: Juggernaut
(the same numbers).

- **Job.** The level-5 reward: a wall that walks, frosts what stands next to
  it, and crosses Mountains.

| Opponent                                     | It attacks: HP lost; it takes | The same on Snow | Such attacks to kill: open / Snow / beside a Witch | Unit attacks it: damage (HP left); unit takes | The same on a Chilled target |
| -------------------------------------------- | ----------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| Fighter                                      | 3; 12                         | 2; 14            | 10 / 12 / 12                                       | 10 (kills); 0                                 | 10 (kills); 0                |
| Guard on Field Defense                       | 2; 13                         | 1; 14            | 15 / 19 / 19                                       | 9 (6 left); 9                                 | 9 (6 left); 9                |
| Guard on a Walled center                     | 2; 13                         | 1; 14            | 15 / 19 / 19                                       | 8 (7 left); 13                                | 8 (7 left); 13               |
| Marksman (shoots at range 2)                 | 3; 0                          | 2; 0             | 10 / 12 / 21                                       | 10 (kills); 0                                 | 10 (kills); 0                |
| Knight                                       | 6; 10                         | 5; 12            | 6 / 7 / 7                                          | 10 (kills); 0                                 | 10 (kills); 0                |
| Catapult (range 2)                           | 7; 0                          | 6; 0             | 5 / 6 / 10                                         | 10 (kills); 0                                 | 10 (kills); 0                |
| Goblin, Gang Up +2                           | 7; 10                         | 6; 11            | 5 / 6 / 6                                          | 6 (kills); 0                                  | 6 (kills); 0                 |
| Goblin Kaboom (5)                            | 5; —                          | 5; —             | 8 / 8 / 8                                          | —                                             | —                            |
| Caveman                                      | 3; 12                         | 2; 14            | 10 / 12 / 12                                       | 12 (kills); 0                                 | 12 (kills); 0                |
| Raptor with Pounce                           | 7; 10                         | 6; 11            | 5 / 6 / 6                                          | 12 (kills); 0                                 | 12 (kills); 0                |
| T-Rex                                        | 9; 9                          | 7; 11            | 4 / 5 / 5                                          | 12 (16 left); 3                               | 12 (16 left); 3              |
| Triceratops, run-up 2                        | 13; 8                         | 10; 10           | 3 / 4 / 4                                          | 12 (8 left); 3                                | 12 (8 left); 3               |
| Zombie                                       | 3; 12                         | 2; 14            | 10 / 12 / 12                                       | 12 (6 left); 3                                | 12 (6 left); 3               |
| Grunt (Shield 2)                             | 3; 12                         | 2; 14            | 10 / 12 / 12                                       | 10 + 2 Shield (kills); 0                      | 10 + 2 Shield (kills); 0     |
| Ray Gunner (Shield 2), full power at range 2 | 6; 0                          | 5; 0             | 6 / 7 / 12                                         | 8 + 2 Shield (kills); 0                       | 8 + 2 Shield (kills); 0      |

- It kills a Fighter, Caveman, Raptor, Knight, or Grunt in one hit and deals
  a T-Rex 12 (taking 3). A Fighter deals it 3 and takes 12. It deals a
  Juggernaut or a Brontosaurus 9 and takes 9; a Brontosaurus deals it 7 and
  takes 10.
- **Cold Aura.** Units next to it at its owner's Start Turn are Chilled:
  sluggish once, so they cannot step away and strike elsewhere that turn, and
  Shatter-eligible for the Giant and for every Yeti around it. The Giant's
  own hits are so large that the window rarely matters to it (a Fighter on
  Walls at full HP, 8 would leave 2).
- **Verdict: useful, not dominant.** Juggernaut parity plus a first-strike
  tool. Reward only.

### 9.10 How often Shatter fires

Shatter is the faction's event. It needs a Chilled target that a hit from an
adjacent tile leaves at 1 to 3 HP.

**The window.** HP states of a Chilled target in which one fresh hit shatters
it, at threshold 3:

| Target (max HP)                 | Yeti     | Mammoth      | Sled with Charge, Sabretooth |
| ------------------------------- | -------- | ------------ | ---------------------------- |
| Fighter, Skeleton (10)          | 7, 8     | 8, 9         | 9, 10 (full HP)              |
| Fighter on Field Defense (10)   | 6, 7     | 7, 8         | 9, 10 (full HP)              |
| Fighter on a Walled center (10) | 6, 7     | 7, 8         | 8, 9                         |
| Guard (15)                      | 7, 8     | 8, 9         | 9, 10, 11                    |
| Guard on a Walled center (15)   | 6, 7     | 7, 8         | 8, 9                         |
| Marksman, Knight, Raider (10)   | 8, 9     | 9, 10 (full) | none: the hit kills          |
| Zombie (18)                     | 7, 8, 9  | 9, 10, 11    | 11, 12                       |
| Goblin (6)                      | none     | none         | none                         |
| Caveman (12)                    | 7, 8     | 8, 9, 10     | 10, 11                       |
| Raptor (12)                     | 8, 9     | 10, 11       | 11, 12 (full HP)             |
| Ankylosaurus (20)               | 6, 7, 8  | 8, 9         | 9, 10, 11                    |
| Triceratops (20)                | 8, 9     | 9, 10, 11    | 11, 12                       |
| T-Rex (28)                      | 8, 9, 10 | 10, 11       | 12, 13                       |
| Grunt, Shield 2 (10)            | 7, 8     | 9            | 10 (full HP)                 |

Two or three HP states out of ten to twenty-eight: by itself a hit lands in
the window about one time in five. What matters is whether the player can
**steer** a unit into it with the hits available in one turn.

**One turn against a full-HP Chilled target.** For each attacker set, the
best order of hits without the Shatter rule and with it:

| Target                     | 2 Yetis                         | 3 Yetis                         | Hunter, 2 Yetis                 | Mammoth, 2 Yetis                | Sweep flank hit, 2 Yetis      | Sled with Charge or Sabretooth  |
| -------------------------- | ------------------------------- | ------------------------------- | ------------------------------- | ------------------------------- | ----------------------------- | ------------------------------- |
| Fighter, Skeleton          | —                               | —                               | —                               | —                               | one hit, 0 back (two, 4 back) | **kills alone** (2 left)        |
| Fighter on Field Defense   | **kills**, 8 back (1 left, 14)  | two hits, 8 back (three, 14)    | —                               | —                               | —                             | **kills alone** (3 left)        |
| Fighter on a Walled center | **kills**, 10 back (3 left, 20) | two hits, 10 back (three, 20)   | two hits, 0 back (three, 10)    | two hits, 10 back (three, 20)   | —                             | — (Brittle: kills alone)        |
| Guard                      | —                               | **kills**, 15 back (2 left, 21) | —                               | —                               | —                             | with a Yeti: **kills** (3 left) |
| Guard on Field Defense     | —                               | —                               | **kills**, 10 back (2 left, 19) | **kills**, 20 back (2 left, 29) | —                             | —                               |
| Guard on a Walled center   | —                               | —                               | — (Brittle: kills)              | — (Brittle: kills)              | —                             | —                               |
| Marksman, Knight, Raider   | — (Brittle: one hit)            | —                               | —                               | one hit, 0 back (two, 1 back)   | one hit                       | — (the hit kills)               |
| Zombie                     | —                               | **kills**, 9 back (2 left, 12)  | saves 1 retaliation             | Shatter replaces the last hit   | —                             | — (Brittle, with a Yeti: kills) |
| Goblin                     | —                               | —                               | —                               | —                               | —                             | —                               |
| Caveman                    | **kills**, 5 back (1 left, 8)   | two hits, 5 back (three, 8)     | —                               | —                               | —                             | — (Brittle: kills alone)        |
| Raptor                     | —                               | —                               | —                               | — (Brittle: one hit)            | —                             | **kills alone** (2 left)        |
| Ankylosaurus, T-Rex        | —                               | —                               | —                               | —                               | —                             | —                               |
| Triceratops                | —                               | — (Brittle: kills)              | **kills**, 4 back (3 left, 7)   | **kills**, 8 back (2 left, 11)  | —                             | —                               |
| Grunt, Shield 2            | **kills**, 3 back (1 left, 5)   | two hits, 3 back (three, 5)     | —                               | —                               | —                             | **kills alone** (3 left)        |
| Shield Projector, Shield 3 | —                               | **kills**, 12 back (2 left, 17) | —                               | —                               | —                             | with a Yeti: **kills** (3 left) |

"—" means Shatter changes nothing; in brackets is the result without it.
Over 19 targets and 11 attacker sets (209 cells), Shatter fires in 58 (28%)
and changes the outcome in 57 of them: a kill instead of a wounded survivor,
or one hit and its retaliation saved. With Brittle it fires in 100 (48%).

**A target that is already wounded** (every HP state equally likely, two
Yetis at hand): a Shatter saves something in 2 of 10 states for a Fighter, 4
of 10 for a Fighter on Walls, 4 of 15 for a Guard, 6 of 18 for a Zombie, 3 of
12 for a Caveman, 6 of 20 for an Ankylosaurus, 6 of 28 for a T-Rex, and never
for a Goblin.

**In the line model** (Shatters per Ice Folk fight turn, over the four fights
of each row of [section 9.11](#911-skirmishes)): none without a Chill source;
2 in 13 with one Sled and no Witch; with a Witch 2 in 14 against Fighters, 6
in 12 against Cavemen, 4 in 12 against Zombies, 6 in 12 against Grunts, 10 in
20 against Grunts with a Ray Gunner; with a Witch and a Mammoth 14 in 18
against Fighters and 6 in 12 against Cavemen; 2 in 10 against a T-Rex; none
against Goblins.

**Estimate, with the final numbers:**

- **Before the Witch** (one Sled, one Chill a turn): about one Shatter every
  six or seven fight turns, so one or two in a match, and mostly against
  Cavemen, Grunts, and fortified Fighters. With Raiding the Sled's own Charge
  adds a Shatter on a full-HP Fighter whenever a second Chill source exists.
- **With a Witch:** about one Shatter every two fight turns against Cavemen,
  Zombies, Guards, and Martians; about one every seven against plain Fighters
  and Skeletons with Yetis alone; about three every four turns against them
  once a Mammoth's Sweep or a charging Sled sets the window. Over the ten to
  fifteen fight turns of a Normal match that is two to six Shatters.
- **Against Goblins: none.** Every hit kills a Goblin. The faction's event is
  invisible in that matchup except on Orc Brutes, Wolf Riders, and the
  exploding units (a Chilled Bomb Chucker or Rocket Cart at full HP shatters
  to one Yeti hit, 6 or 7 would leave 2 or 1, and then does not explode).
- **Against a T-Rex or an Ankylosaurus: rarely,** and only as the last hit
  of a long chain.
- Shatter is the faction's tool against **tough bodies, Shields, and
  fortification**, not a general damage bonus. Its target in telemetry
  ([section 16.4](#164-balance-acceptance)): at least one Shatter in half of
  the Ice Folk seat-games against Humans, Undead, Dinosaurs, and Martians.

### 9.11 Skirmishes

Coins lost by the Ice Folk / Coins lost by the enemy, in the line model of
[section 9.1](#91-method). "On Snow" is a fight on Ice Folk territory;
"warm ground" has no Snow unless the group has a Witch, in which case the two
pairs are the same. The Fighter mirror gives 10 / 8 for the side that attacks
first.

| Fight (Coins)                                                                                  | On Snow, Ice Folk first | On Snow, attacked | Warm ground, Ice Folk first | Warm ground, attacked |
| ---------------------------------------------------------------------------------------------- | ----------------------: | ----------------: | --------------------------: | --------------------: |
| 5 Yetis (10) against 5 Fighters (10)                                                           |                  6 / 10 |            4 / 10 |                      10 / 8 |                8 / 10 |
| 5 Yetis (10) against 5 Cavemen (10)                                                            |                  10 / 8 |            8 / 10 |                      10 / 6 |                10 / 4 |
| 4 Yetis and a Sled (11) against 5 Cavemen (10)                                                 |                  11 / 6 |            11 / 8 |                      11 / 6 |                11 / 4 |
| 4 Yetis and a Sled (11) against 5 Fighters (10)                                                |                  9 / 10 |            7 / 10 |                      9 / 10 |                11 / 6 |
| 3 Yetis and a Witch (11) against 5 Cavemen (10)                                                |                  11 / 4 |            11 / 2 |                      11 / 4 |                11 / 2 |
| 5 Yetis (10) against 10 Goblins with Gang Up +2 (10)                                           |                  6 / 10 |            10 / 0 |                      10 / 5 |                10 / 0 |
| 2 Mammoths (12) against 6 Fighters (12)                                                        |                  6 / 12 |           12 / 10 |                      12 / 8 |                12 / 0 |
| 2 Mammoths (12) against 6 Cavemen (12)                                                         |                  6 / 12 |            12 / 4 |                      12 / 4 |                12 / 0 |
| 2 Mammoths (12) against 12 Goblins (12)                                                        |                  12 / 2 |            12 / 0 |                      12 / 2 |                12 / 0 |
| 2 Mammoths (12) against 2 Ankylosauruses (10)                                                  |                  12 / 5 |            12 / 0 |                      12 / 5 |                12 / 0 |
| Mammoth and 2 Yetis (10) against 5 Fighters (10)                                               |                  6 / 10 |            2 / 10 |                      2 / 10 |                10 / 2 |
| Mammoth, 2 Yetis, and a Witch (15) against 7 Fighters (14)                                     |                  6 / 14 |            8 / 14 |                      6 / 14 |                8 / 14 |
| Mammoth, 2 Yetis, and a Witch (15) against 7 Cavemen (14)                                      |                  15 / 4 |            15 / 4 |                      15 / 4 |                15 / 4 |
| Mammoth, 2 Yetis, and a Witch (15) against a T-Rex (14), no Rampage                            |                  2 / 14 |            4 / 14 |                      2 / 14 |                4 / 14 |
| 3 Yetis and 2 Hunters (12) against 3 Fighters and 2 Marksmen (12)                              |                  7 / 12 |            12 / 6 |                      7 / 12 |                12 / 4 |
| 3 Yetis and 2 Hunters (12) against 4 Zombies (12)                                              |                  6 / 12 |            6 / 12 |                      9 / 12 |                12 / 3 |
| 5 Yetis (10) against 5 Grunts (10)                                                             |                  6 / 10 |            10 / 6 |                      10 / 8 |                10 / 4 |
| 3 Yetis and a Witch (11) against 3 Grunts and a Ray Gunner (10)                                |                  11 / 6 |            7 / 10 |                      11 / 6 |                7 / 10 |
| Boulder Yeti and 3 Yetis (14) against 3 Guards and a Fighter on Walls-level fortification (11) |                  2 / 11 |            4 / 11 |                      2 / 11 |                6 / 11 |
| Mammoth and 3 Yetis (12) against 3 Guards and a Fighter on Field Defense (11)                  |                  12 / 5 |            2 / 11 |                      12 / 5 |                8 / 11 |
| Sabretooth and 3 Yetis (15) against a Knight and 3 Fighters (15)                               |                  2 / 15 |           11 / 15 |                      6 / 15 |               15 / 13 |

What the skirmishes say:

- **On warm ground without a Witch the faction is Humans without Field
  Defense.** Yetis mirror Fighters and lose to Cavemen exactly as Fighters
  do.
- **Home Snow is worth about one hit per unit.** Five Yetis on Snow beat five
  Fighters either way and draw level with Cavemen.
- **Cavemen are the hard body.** Small Ice Folk groups lose to equal Coins of
  Cavemen even with a Sled or a Witch; a Witch needs five units around her to
  turn that fight ([section 9.6](#96-ice-witch)), and a Mammoth, two
  Yetis, and a Witch still lose to seven Cavemen.
- **Goblin packs beat everything in the roster per Coin** when they strike
  first, as they beat Humans. The model gives every Goblin +2 and no walk-up,
  which is generous to them: on a board a pack that walks into a Cold Snap
  cannot Gang Up or Kaboom on arrival.
- **Fortification** is answered by the Boulder Yeti (the only row where the
  attacker wins cheaply against Walls-level fortification) and, more slowly,
  by a Mammoth's Trample and Shatter.
- **Who strikes first matters, in an unusual direction.** A group in cover
  with a Witch does better receiving the charge than charging fresh units.

### 9.12 Early pressure

The Normal AI presses constantly, so the opening must stand waves, not one
raid. The defender starts with two base units and trains one more each round
(2 Coins a round); a wave arrives every round or every second or third round,
**always strikes first**, and stays until it is dead. "Holds" means the
defender still has a unit after 12 rounds (in brackets: Coins the defender
lost / Coins the attacker lost); otherwise the round in which the last
defender dies.

| Waves                                            | 2 Fighters, then Fighters | 2 Yetis on home Snow, then Yetis            | The same with a Sled from the start | Yetis on warm ground |
| ------------------------------------------------ | ------------------------- | ------------------------------------------- | ----------------------------------- | -------------------- |
| 2 Fighters every 2 rounds                        | holds (22 / 24)           | holds (14 / 24)                             | holds (19 / 24)                     | holds (22 / 24)      |
| 3 Fighters every 2 rounds                        | falls, round 3            | holds (20 / 36)                             | holds (21 / 36)                     | falls, round 3       |
| 3 Skeletons every 2 rounds                       | falls, round 3            | holds (20 / 36)                             | holds (21 / 36)                     | falls, round 3       |
| 2 Cavemen every 2 rounds                         | falls, round 6            | holds (22 / 22)                             | holds (25 / 22)                     | falls, round 6       |
| 3 Cavemen every 3 rounds                         | falls, round 2            | holds (22 / 22)                             | holds (25 / 24)                     | falls, round 2       |
| 3 Cavemen every 2 rounds                         | falls, round 2            | falls, round 5                              | falls, round 5                      | falls, round 2       |
| Raptor with Pounce and 2 Cavemen, every 2 rounds | falls, round 1            | falls, round 3                              | falls, round 3                      | falls, round 1       |
| 2 Grunts every 2 rounds                          | falls, round 6            | holds (20 / 24)                             | holds (23 / 24)                     | falls, round 6       |
| 3 Grunts every 2 rounds                          | falls, round 2            | falls, round 5                              | falls, round 5                      | falls, round 2       |
| 2 Goblins every round                            | falls, round 1            | overrun (2 Yetis alive, 12 Goblins outside) | holds (25 / 24)                     | falls, round 1       |
| 3 Goblins every round                            | falls, round 1            | falls, round 2                              | falls, round 2                      | falls, round 1       |

- **The home opening is sturdier than a Human one.** On its nine Snow tiles
  it holds three Fighters or Skeletons every two rounds and slower Caveman
  waves, where a Fighter opening falls. This is the first watch item against
  Humans, the weakest faction today.
- **It falls to 12-HP bodies at three times its income, to a Raptor with
  Cavemen, to three Grunts, and to Goblins,** as every 2-Coin opening does.
  The Raptor rush takes it in round 3: Dinosaurs are the pairing to watch.
- **On warm ground it is the Fighter opening.** A captured village that is
  not yet a city has no Snow.
- The model lets every wave strike first and cannot see Glide, a Bolas pin,
  Mountains, or a Mammoth.

### 9.13 The faction as a whole

- **Is it helpless against an early rush?** No more than Humans, and less at
  home ([section 9.12](#912-early-pressure)). Its problem rushes are the
  Raptor with Cavemen (rounds 3 to 5) and Goblin packs.
- **Is it untouchable at home?** No. Snow cover exists only without
  fortification: a Yeti on a Walled center is exactly a Fighter on a Walled
  center (a Fighter deals it 3 and takes 12, a Catapult 7), and a Triceratops
  or a Boulder ignores those Walls. A Witch beside the center raises the
  siege cost by up to five thirds (a Catapult's 7 becomes 4) until she is
  killed on her unfortified tile. Deep snow slows only units with Move 2 or
  more off Roads, and Fieldcraft waives it for Raiders.
- **Does frost lock anything?** No. A unit is sluggish for one turn per
  freeze and at most every third turn
  ([section 5.4](#54-duration-and-re-application)). A Sled and a Hunter
  (6 Coins) get two free shots at a lone Fighter (6, then the kill) before
  it can strike; two Marksmen kill the same Fighter on its way in today. In a
  standing brawl frost does nothing but make Shatter possible.
- **Chill against Shields** ([section 10.4](#104-martian-rules)). Chill is
  not damage, so a Shield does not stop it. With numbers: two Yetis kill a
  Chilled Grunt (the first hit costs 3 HP, the second would leave 1) where
  three are needed otherwise, and five Yetis with a Witch (15 Coins) beat
  five Grunts and a Ray Gunner (14) 6 to 14 either way, where five Yetis
  alone lose to five Grunts on warm ground (10 to 8, 10 to 4). If a full
  Shield blocked Chill, a Cold Snap would do nothing to a Martian line, whose
  Shields are full at the start of every Ice Folk turn, and the Witch, the
  Giant's aura, and every Shatter set-up would be dead against one faction.
  That is a blind spot, so the rule is: **Chill ignores Shields.** The
  Martians are not short of answers: rays out-damage the Blizzard's halving
  (a full-power Tripod still deals a Yeti beside a Witch 5), a stationary ray
  unit loses nothing to frost, and Saucers reach the Witch.
- **Dry Land.** The whole faction is on the board with no water: frost and
  Shatter, the Witch's winter, Snow on territory, Mountain-born units, Sweep
  and Trample, Boulders, Prowl. Mountains vary by biome (9% of Plains tiles,
  12% of Woodland, 45% of Highlands), so Mountain-born and Rockfall are
  strong on Highlands and faint on Plains; the other pillars do not depend
  on the map.
- **Timing.** In an ordinary Normal match the Snow is there from round 1,
  the Bolas and Shatter from Scouting (rounds 2 to 6), Sweep from Drill, the
  Blizzard and Cold Snap from Administration (rounds 10 to 20). Boulders,
  Prowl, and Brittle sit on tier 3 and will be seen in a minority of Normal
  matches.

**Matchups on Dry Land (expectation, not measurement):**

| Opponent | Expectation                                       | Why                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | Ice Folk ahead, about 55–65%                      | Yetis are Fighters with free cover on the home ring and on Mountains; a charging Sled or a Mammoth's flank makes Shatter work on Fighters. Humans keep Field Defense, Rally, Tend Wounded (which cures Chill), and a Catapult that out-ranges everything.                                                                                                       |
| Undead   | about even                                        | Skeletons mirror Yetis; Zombies are Shatter food (four hits become three, and no Grave); Wail deals a Yeti on Snow 1; Vampires and Liches work as usual, and Plague has no cure.                                                                                                                                                                                |
| Goblin   | swingy by phase                                   | Before the Witch the pack wins: Gang Up kills a Yeti in one hit off Snow, three Goblins a round take the opening in round 2, and Shatter never fires. After her, a pack that walks up cannot Gang Up or Kaboom on arrival and each Yeti kills a Goblin without reply.                                                                                           |
| Dinosaur | the worst pairing: Dinosaurs possibly 65% or more | Dinosaurs win 66% overall under the campaign AI. Cavemen beat Yetis abroad and are level at home; a Raptor with two Cavemen takes the opening in round 3; a T-Rex kills a Yeti in one hit and is nearly never shattered. The answers (Chill and Shatter on Cavemen, Sweep, Rampage denied by a sluggish turn) need the Sled early and the Mammoth on the board. |
| Martian  | not lopsided, on paper                            | Chill ignores Shields and Shatter removes the Grunt's third hit; rays into a Blizzard are halved but still hurt; ray units that stand still ignore frost; flyers ignore deep snow and zones of control and reach the Witch.                                                                                                                                     |

No pairing looks worse than 70 to 30 on paper. The two that could get there
are Dinosaurs against the Ice Folk, and the Ice Folk against Humans on
Highlands.

### 9.14 The root's decisions, checked

| Decision                                             | Result with the engine formula                                                                                                                                                  | Change                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Chill is sluggish only on the first turn of a freeze | A kite buys one free turn: a Sled and a Hunter get two shots at a lone Fighter, as two Marksmen do today. Alternating casts gains nothing with the thawing turn of section 5.4. | none                    |
| Shatter at 3, melee only                             | Fires in 28% of the one-turn cases, never on a full-HP line unit for a Yeti; a charging Sled, a Sabretooth, and a Mammoth's flank reach the window on 10-HP bodies.             | none                    |
| Brittle at 4                                         | 48% of the cases; a Yeti then shatters a full Chilled Marksman, Knight, or Wolf Rider, a Mammoth a full Fighter. At 5 a Yeti would shatter a full Fighter.                      | none                    |
| Yeti 2 Coins, 10 HP, Attack 2, Defense 2             | The Fighter mirror abroad; holds the home opening where Fighters fall.                                                                                                          | none                    |
| Rockfall at Attack 1.5                               | 3 on a Fighter, 2 on a Guard: a harassing shot.                                                                                                                                 | none                    |
| Sled 3 Coins                                         | A cheap Ghoul with a Bolas; its Charge shatters a full Chilled Fighter.                                                                                                         | none                    |
| Snow Hunter 8 HP, Cold Blood +0.5                    | One point more on most Chilled targets; a little below the Marksman off Snow. At 10 HP it would be above it.                                                                    | none                    |
| Mammoth one slot, 6 Coins, 20 HP                     | Strong per slot (beats two Guards, and four Fighters), weak per Coin (loses to six Fighters in three cases of four).                                                            | none; first lever 22 HP |
| Ice Witch 5 Coins, 12 HP                             | Three Fighter hits; worth her cost from five units up, most when her wave receives the charge.                                                                                  | none                    |
| Boulder Yeti 8 Coins, Attack 2 and +1 unmoved        | 5 after a Move, 8 planted, 7 on a Guard on Walls: between a Marksman and a Catapult.                                                                                            | none                    |
| Sabretooth 9 Coins, 14 HP                            | One kill a turn; survives one Knight hit.                                                                                                                                       | none                    |
| Frost Giant at Juggernaut numbers                    | Trades evenly with a Juggernaut and a Brontosaurus.                                                                                                                             | none                    |

## 10. Interactions with existing rules

One ruling each. "Chilled like anyone" means: by a Bolas, a Cold Snap, or a
Cold Aura, when in land form.

### 10.1 Undead rules

| Rule       | Interaction                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves     | Ice Folk land-form units leave Graves like any unit. **A shattered unit of any faction leaves none.** A unit killed by plain damage, a Sweep flank hit, a Rockfall, a shot, or a throw leaves an ordinary Grave.          |
| Raise Dead | Unchanged, on Snow too. A Skeleton that rises is a new unit and is not Chilled.                                                                                                                                           |
| Infect     | An Ice Folk unit killed by a Zombie rises as an ordinary Zombie of the Zombie's owner. A Witch that rises has left the board: her Blizzard ends. A Zombie's kill is never a Shatter.                                      |
| Bitten     | A Zombie bites Ice Folk units as usual; no Ice Folk unit cures a bite. A **Bitten unit that is shattered still rises** as its biter's Zombie, in place, and the attacker does not advance. The rising has no Chill entry. |
| Plague     | Applies to Ice Folk units; no Ice Folk unit cures it. The Start Turn damage and the spread are not attacks: the Blizzard does not halve them.                                                                             |
| Lich       | Its attack is always from distance 2 or 3: the primary hit on an Ice Folk unit in a Blizzard is halved (7 on a Yeti on Snow becomes 4), the splash is computed from the halved hit, and Plague is applied as usual.       |
| Wail       | Not an attack: never halved. It uses the target's cover as today, so Snow cover counts: 2 on a Yeti in the open, 1 on Snow; 2 on a Witch, a Sled, or a Hunter. A sluggish Banshee that moved cannot Wail.                 |
| Lifesteal  | Unchanged: a Vampire is a melee attacker and is never halved. It deals a Witch 10 and a Yeti on Snow 7, unanswered.                                                                                                       |
| Unanswered | Unchanged: an Ice Folk unit never retaliates against a Vampire.                                                                                                                                                           |
| Frenzy     | A primary action: a sluggish Necromancer that moved cannot use it, nor Raise Dead. Frenzied units are otherwise unaffected by frost.                                                                                      |
| Chill      | Undead units are Chilled like anyone. A Zombie or a Lich already cannot act after moving, so frost only makes it Shatter-eligible: three Yeti hits kill a Chilled Zombie instead of four.                                 |
| Restless   | Not an Ice Folk rule: Ice Folk units recover 4 in own territory (6 with Deep Winter) and 2 elsewhere.                                                                                                                     |

### 10.2 Goblin rules

| Rule         | Interaction                                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gang Up      | Unchanged. It beats cover: a Goblin with two helpers deals a Yeti 10 in the open and 8 on Snow. No Ice Folk attack has Gang Up.                                                                                                                              |
| Kaboom       | Fixed damage: it ignores Snow cover and the Blizzard. **A sluggish Goblin-crewed unit that has moved cannot Kaboom**; one that has not moved can. So a pack that walks into a Cold Snap cannot blow up on arrival.                                           |
| Death blasts | **A shattered exploding unit does not explode.** A Chilled Bomb Chucker or Rocket Cart at full HP is shattered by one Yeti hit. An exploding unit killed any other way (plain damage, a flank hit, a Rockfall, a shot, a throw) explodes as today.           |
| Chains       | An Ice Folk melee attacker that kills an exploding unit by plain damage advances onto its tile and is hit by the blast; a Boulder Yeti and a Rockfall at distance 2 are outside it. A Mammoth is in the blast of a flank victim. Blasts ignore the Blizzard. |
| Bomb splash  | A Bomb Chucker attacks from distance 2: the primary hit on an Ice Folk unit in a Blizzard is halved and the splash is computed from the halved hit. A Rocket Cart's shot is halved the same way.                                                             |
| Plunder      | A Goblin seat earns 1 Coin for each Ice Folk unit its units or blasts kill. Shatter kills are Ice Folk kills and earn nobody Plunder.                                                                                                                        |
| WAAAGH!, Ram | WAAAGH! is a primary action (a sluggish Warboss that moved cannot use it). A sluggish Scrap Buggy that attacks without moving and kills still advances and may Ram on.                                                                                       |
| Troll        | A `JUGGERNAUT`-role unit: Chilled like anyone, never shattered. Regeneration is unchanged.                                                                                                                                                                   |
| Deep snow    | Wolf Riders and Scrap Buggies end a Move on entering Snow, so a Wolf Rider's Charge needs its first tile off Snow. Fieldcraft waives it for the Wolf Rider and the Bomb Chucker.                                                                             |
| Warrens      | Follow the city's current owner, as before.                                                                                                                                                                                                                  |

### 10.3 Dinosaur rules

| Rule               | Interaction                                                                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eggs               | **An Egg cannot be Chilled and is never shattered** (a Bolas on it is `TARGET_IMMUNE`; Cold Snap and the Cold Aura skip it). It is an ordinary target of Ice Folk attacks, Rockfall, and Boulders (Defense 1, no retaliation), and a Sweep flank hit deals it 2 of its 6 HP.        |
| Growth             | A dinosaur grows from killing Ice Folk units as from any kill, and the full heal takes it out of the Shatter window. Growth does not remove Chill. Big and Alpha units are shattered like any unit; a Brontosaurus (`JUGGERNAUT`) never.                                            |
| Charge!            | A Triceratops attack ignores the fortification of an Ice Folk unit, not its cover: a Yeti on Snow keeps `× 1.5`, a Yeti on a Walled center has neither. The push and follow apply; a Mountain-born unit may be pushed onto a Mountain. A pushed unit keeps its Chill.               |
| Run-up             | A Triceratops's Move ends on the first Snow tile it enters, so inside Snow its run-up is at most the tiles up to and including that one. A sluggish Triceratops attacks with no run-up, or moves.                                                                                   |
| Acid               | A Spitter ignores Snow cover and Walls, like any cover and fortification. Its shot from distance 2 at an Ice Folk unit in a Blizzard is halved (5 on a Yeti becomes 3).                                                                                                             |
| Armoured           | An Ankylosaurus takes 1 from a Sweep flank hit. Armoured is applied before the Shatter test.                                                                                                                                                                                        |
| Wallbreaker        | Removes the City Walls levels from the exchange. The Ice Folk defender on that center still has no Snow cover: the cover test reads the unit's own fortification, not what the attack ignores.                                                                                      |
| Pounce, Rampage    | A Raptor's Pounce needs a two-tile Move, which deep snow cuts short when the first tile is Snow (Fieldcraft waives it). A sluggish Raptor cannot Pounce. A sluggish T-Rex that attacks without moving still Rampages; one that moved cannot attack. Its Move ends on entering Snow. |
| War Drums, Hatch   | Primary actions: a sluggish Shaman that moved cannot use them. A Shaman's Tend Wounded cures Chill ([section 10.5](#105-human-abilities)).                                                                                                                                          |
| Two-slot dinosaurs | Chilled and shattered like one-slot units. A Chilled T-Rex is shattered only by the hit that leaves it at 1 to 3 of its 28 HP.                                                                                                                                                      |

### 10.4 Martian rules

The Martian faction is specified in [its own contract](RULESET_7_MARTIANS.md)
and its engine is on `main` (commit `d88503c`). These rulings are part of the
Ice Folk engine bead, which checks them against that engine.

| Rule                | Interaction                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shields and Chill   | **Chill is not damage and ignores Shields:** a Bolas, a Cold Snap, or a Cold Aura chills a shielded unit whatever its Shield ([section 9.13](#913-the-faction-as-a-whole) gives the numbers). It joins the list of things a Shield never absorbs (Push, Tractor Beam, Mind Control).                                                         |
| Shields and Shatter | **Shatter looks at HP after the hit:** the Shield absorbs first, then the test of [section 5.5](#55-shatter) reads the HP that is left. A Chilled Grunt at 3 HP with a full Shield is shattered by a hit the Shield absorbs entirely.                                                                                                        |
| Shields, other hits | A Shield absorbs a Sweep flank hit (2), a Rockfall, and a Boulder like any damage. In a Force Field (Shield 4) a Chilled Grunt takes three Yeti hits, not two.                                                                                                                                                                               |
| Heat rays           | A ray fired from distance 2 at an Ice Folk unit in a Blizzard is halved after its full or half power is applied (a full-power Ray Gunner deals a Yeti beside a Witch 4, a Tripod 5). From distance 1 it is not halved. Cooling is independent of Chill.                                                                                      |
| Pierce              | The Pierce hit is computed from the whole primary hit, which is the halved one when the primary target was in a Blizzard. A Pierce victim is not halved a second time.                                                                                                                                                                       |
| Disintegrator       | Rays ignore fortification. An Ice Folk unit on its Walled center then has neither fortification nor Snow cover.                                                                                                                                                                                                                              |
| Sluggish Martians   | A ray unit that stands still fires at full power as usual; frost costs it nothing. A sluggish Saucer cannot Strafe (it may still Beam Down, which needs an unmoved Saucer anyway). A sluggish Brain or Mothership that moved cannot use Mind Control, Psychic Command, or the Tractor Beam.                                                  |
| Flyers and walkers  | **They ignore deep snow** (they are never stopped by terrain), and flyers ignore zones of control. They are Chilled like anyone and shattered like anyone, the two-slot Mothership included; the Colossus (`JUGGERNAUT`) is never shattered.                                                                                                 |
| Mind Control        | A Chilled unit may be mind-controlled. The victim leaves the board, so its Chill entry ends; the Thrall is a new unit and is not Chilled. An Ice Folk unit that becomes a Thrall is a Martian unit: no Ice Folk rule applies to it. A mind-controlled Witch has left the board: her Blizzard ends. The Frost Giant is immune (`JUGGERNAUT`). |
| Thralls             | Chilled and shattered like any unit. A Brain that is shattered has left the board: its Thralls collapse right after its death events.                                                                                                                                                                                                        |
| Tractor Beam        | Pulls an Ice Folk unit under its own rules: off Snow, out of a Blizzard, off Walls. The unit keeps its Chill. A Mountain-born unit may be pulled onto a Mountain.                                                                                                                                                                            |
| Beam Down           | Unchanged. A Chilled passenger keeps its entry.                                                                                                                                                                                                                                                                                              |
| Machines afloat     | A self-launched machine is embarked: it cannot be Chilled or shattered while afloat.                                                                                                                                                                                                                                                         |

### 10.5 Human abilities

| Ability              | Interaction                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field Defense, Walls | Give a defender the ordinary bonus against every Ice Folk attack except a Boulder Yeti's. A Mammoth's attack destroys the Field Defense on the target tile after the exchange. With Brittle, Ice Folk melee attackers destroy it like any owner of Explosives.                                                                                                          |
| Rally                | A primary action: a sluggish Captain that moved cannot Rally. Inspired units are otherwise unaffected by frost.                                                                                                                                                                                                                                                         |
| Tend Wounded         | **Cures Chill.** A Chilled unit is a target even at full HP. The unit's entry becomes thawing (`sluggish: false`, `turnsLeft: 0`): it is no longer Chilled, it may move and act this turn, and a Chill applied before its owner's next End Turn does not slow it. `WOUNDED_TENDED` results carry `curedChill`. It applies to the Human Captain and the Dinosaur Shaman. |
| Overrun              | A sluggish Knight that attacks without moving and kills advances and may attack again. One that moved cannot attack.                                                                                                                                                                                                                                                    |
| Charge, Escape       | A sluggish Raider cannot Charge and is not granted Escape. An escape Move obeys deep snow.                                                                                                                                                                                                                                                                              |
| Push                 | A Juggernaut-role unit pushes an Ice Folk unit under the ordinary conditions; a Mountain-born unit may be pushed onto a Mountain.                                                                                                                                                                                                                                       |
| Catapult             | Always shoots from distance 2 or 3: halved against a unit in a Blizzard. It out-ranges every Ice Folk unit.                                                                                                                                                                                                                                                             |
| Marksman             | Halved from distance 2, not from distance 1.                                                                                                                                                                                                                                                                                                                            |

### 10.6 Cities, siege, capture, and capacity

- **Capture-capable Ice Folk units:** Yeti, Sled, Snow Hunter, Mammoth, and
  Frost Giant. The Witch, the Boulder Yeti, and the Sabretooth cannot
  capture.
- **Siege.** An Ice Folk unit on a hostile center besieges it like any unit.
  A Sabretooth can never be there ([section 7.7](#77-prowl-sabretooth)).
- **Capture and frost.** Capture needs no Move, so a sluggish unit that began
  its turn on a center captures as usual.
- **Fortification.** An Ice Folk unit on its owner's Walled center has the
  ordinary +2 and no Snow cover. No Ice Folk unit builds Field Defense; Field
  Defense that stands in territory an Ice Folk seat captures fortifies its
  units under the ordinary rule, and they then have no Snow cover on that
  tile.
- **Snow follows the owner.** A captured Ice Folk city's territory stops
  being Snow in the capture command, and a city an Ice Folk seat captures
  becomes Snow in it. A besieged Ice Folk city is still Snow; the besieger
  gets nothing from it.
- **Capacity.** Every Ice Folk role uses one slot. Ice Folk cities have no
  capacity bonus. A reward Frost Giant may exceed capacity.
- **Training.** Every Ice Folk land unit except the Frost Giant is trained
  on the city center with `TRAIN`, with the ordinary gates.
- **Land Grant, Spoils, rewards, city action:** unchanged. Bolas and Cold
  Snap are unit actions and spend no city action.

### 10.7 Zone of control, pass-through, and Roads

- **ZOC.** Every Ice Folk unit exerts and suffers the ordinary zone of
  control, except that entering it does not end a Sabretooth's Move. A
  Chilled unit exerts it as usual.
- **Pass-through.** Unchanged. A unit of another faction cannot pass one of
  its own units that stands on a Snow tile where its Move has to end.
- **Roads on Snow.** For an Ice Folk unit a step costs one half-point when it
  leaves Snow or a usable Road node; a Road on Snow gains it nothing, except
  that a Road edge still waives a Forest or Mountain stop. For another
  faction's unit a **Road edge waives deep snow** as it waives a Forest
  stop. Roads inside Ice Folk territory are not usable by other players (the
  existing rule), so the waiver applies under a Blizzard on the mover's own
  or neutral Roads, not inside an Ice Folk city's land.

### 10.8 Boats, embarking, and water

- Ice Folk boats are the Human boats. No Ice Folk rule applies to them: no
  Shatter, no Snow cover, no Blizzard protection.
- Ice Folk land units embark at Ports with Shorecraft, like Human units.
- **An embarked unit cannot be Chilled** (no faction's). A Chilled unit that
  embarks keeps its entry; afloat the entry has no effect (an embarked unit
  has no primary action, and it is never shattered) and it still counts
  down.
- An embarked Ice Folk unit has no Snow cover, no Blizzard protection, and
  no Glide. An embarked Witch has no Blizzard and no Cold Snap.
- An attack from the shore on an embarked unit never shatters it.
- A naval unit that attacks an Ice Folk land unit in a Blizzard from distance
  2 or more is halved; a Battleship's splash is computed from the halved hit.
- A Blizzard's `blizzard` flag covers water tiles for drawing only. Nothing
  freezes: [section 17.3](#173-deferred-the-floe).
- Blockade and the sea network are unchanged; neither new command moves a
  unit.

### 10.9 Rift

A Rift tile (`pulp_wars-9s0.5`; only flyers stand on it) is never Snow, and
Mountain-born does not cover it: no Ice Folk unit enters a Rift. A flyer on a
Rift is in land form: it can be Chilled, attacked from an adjacent tile, and
shattered; the attacker does not advance, because it cannot enter the tile.

### 10.10 Fog and observation

- An Ice Folk unit is visible exactly when its tile is explored by the
  viewer. Chill entries, the Shatter threshold of a visible Ice Folk unit,
  territory and Deep Winter Snow on explored tiles, and the Blizzard of a
  visible Witch are public ([section 6.5](#65-fog-and-projection)).
- Bolas and Cold Snap previews are exact: every target is visible. A Sweep
  preview is exact: the Mammoth's neighbours are explored.
- **A hidden Witch** next to a visible Ice Folk defender changes that
  defender's cover and halves a ranged hit, and the attacker cannot know. The
  canonical resolution applies both; the public combat preview is computed
  from what the viewer sees and sets `hiddenBlizzardPossible` when the
  defender is an Ice Folk land unit and a tile within 1 of it is unexplored
  by the viewer (the `touchesUnexplored` precedent). Every other preview
  equals its resolution.
- `UNITS_CHILLED` and the death of a shattered unit are projected like their
  existing counterparts (`UNITS_RALLIED`, `UNIT_DIED`). No event reveals a
  hidden Witch; the interruption of a Move in her Blizzard reveals her only
  through the mover's own sight.
- Capacity, city actions, research, and Coins stay owner-private.

### 10.11 Promotion, Disband, achievements

- **Promotion** is the revision-20 rule for every Ice Folk unit: 3 kills, +5
  maximum HP, and a full heal. The heal takes a unit out of the Shatter
  window; it does not remove Chill. Shatter kills, hostile Sweep kills,
  Rockfall and Boulder kills, and retaliation kills are credited. A Bolas and
  a Cold Snap are not kills.
- **Disband** (Administration): Yeti, Sled, Snow Hunter, Mammoth, Witch,
  Boulder Yeti, and Sabretooth. Never a Frost Giant. A Chilled unit may
  Disband.
- **Achievements** ([revision 21](RULESET_7_REVISION_21_ACHIEVEMENTS.md)) are
  unchanged, and no condition names a faction rule. Muster counts the Ice
  Folk trainable roles (the Frost Giant is excluded like the Juggernaut).
  Slayer counts Shatter and Sweep kills like any kill credit. A Monument on a
  Mountain still needs Engineering. Explorer, Engineer, Conqueror, Land
  Baron, and Sea Dog need nothing from this revision.

### 10.12 Starting units, rewards, and treasure

| Source                             | Human      | Undead      | Goblin      | Dinosaur     | Martian   | Ice Folk                 |
| ---------------------------------- | ---------- | ----------- | ----------- | ------------ | --------- | ------------------------ |
| Starting units                     | Fighter    | Skeleton    | one Goblin  | one Caveman  | one Grunt | one Yeti                 |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    | two Goblins | one Caveman  | one Grunt | one Yeti                 |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination | Troll       | Brontosaurus | Colossus  | Frost Giant              |
| Treasure chest unit                | Knight     | Vampire     | Scrap Buggy | Raptor       | Saucer    | **Sled** (role `RAIDER`) |

Reward and treasure units arrive at full HP, exhausted until their owner's
next Start Turn. `treasureUnitRole` is `RAIDER` for the Ice Folk
registration (the Dinosaur and Martian precedent); the `TREASURE_CAPTURED`
literal stays `KNIGHT`. A treasure Sled needs a city with a free
slot, otherwise the chest gives 5 Coins.

## 11. Commands, events, errors, and queries

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `THROW_BOLAS` and `COLD_SNAP`,
in that order, immediately after `TRACTOR_BEAM`:

- `THROW_BOLAS { kind, unitId, targetUnitId }` ([section 7.3](#73-bolas-sled));
- `COLD_SNAP { kind, unitId }` ([section 6.4](#64-cold-snap)).

`MOVE` accepts the Glide costs, the Mountain-born paths, and the Sabretooth's
paths through zones of control, and applies deep snow; its shape is
unchanged. `ATTACK` accepts a Yeti's distance-2 target from a Mountain. A
pending city reward blocks the two new commands like every command.

**State.** `GameStateV7.chilled` ([section 5.1](#51-state)) is the only new
stored state. It is hashed, saved, and replayed like `plagued` and `bitten`.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts one kind,
`UNITS_CHILLED`, immediately after `UNITS_RALLIED`:

```text
UNITS_CHILLED { playerId, sourceUnitId, source: "BOLAS" | "COLD_SNAP" | "COLD_AURA",
                results: [{ unitId, sluggish, turnsLeft }] }   // unit-ID order
```

`results` lists every target with its entry after the application.

- `UNIT_DIED.cause` gains `SHATTER`. A `SHATTER` death is never followed by
  `GRAVE_CREATED`; it may be followed by `BITTEN_UNIT_RISEN`.
- `FIELD_DEFENSE_DESTROYED.reason` gains `TRAMPLE`.
- `UNIT_MOVE_INTERRUPTED.reason` gains `SNOW`.
- `WOUNDED_TENDED` result entries gain `curedChill` (false when none).
- There is no event for the countdown or the end of a Chill, or for Snow
  appearing or disappearing: the view is the source.

**Combat preview.** `CombatPreviewV7` (and therefore `COMBAT_RESOLVED`) gains
eight fields, neutral for every attack that involves no Ice Folk unit:

| Field                    | Meaning                                                                              | Neutral |
| ------------------------ | ------------------------------------------------------------------------------------ | ------- |
| `shatters`               | the defender is shattered ([section 5.5](#55-shatter))                               | false   |
| `coldBloodApplied`       | the Snow Hunter's +0.5 Attack is in `attack2`                                        | false   |
| `rockfallApplied`        | the attack is a Yeti's from distance 2; `attack2` is the Rockfall value              | false   |
| `plantedApplied`         | the Boulder Yeti's +1 Attack is in `attack2`                                         | false   |
| `blizzardHalved`         | the hit on the defender was halved; `damageToDefender` is the halved value           | false   |
| `snowCover`              | the defender's `× 1.5` comes from Snow (the cover fields carry the numbers as today) | false   |
| `sweep`                  | the attack is a Mammoth's; its flank victims are the `splash` entries                | false   |
| `hiddenBlizzardPossible` | only in a public preview: an unexplored tile lies within 1 of an Ice Folk defender   | false   |

- On a Shatter, `damageToDefender` is the defender's remaining HP and
  `defenderDies` is true, so every existing reader of kills and HP stays
  correct. `retaliation` is false and `noRetaliationReason` is
  `DEFENDER_DIED`.
- Boulders report `fortificationLevel: 0` and the removed levels in the
  revision-20 field `fortificationIgnored`.
- A Trample is read from the `sweep` flag and the target tile's Field
  Defense; the UI needs no extra field.
- Sweep entries have the existing splash shape (`unitId`, `at`, `damage`,
  `dies`, and the Martian `shieldDamage`).

**Errors.** `RuleErrorCodeV7` gains `BOLAS_NOT_LEGAL` (reasons `EMBARKED`,
`TARGET_IMMUNE`, `OUT_OF_RANGE`) and `COLD_SNAP_NOT_LEGAL` (reasons
`EMBARKED`, `NO_TARGET`). The movement failure reasons gain
`SNOW_STOPS_MOVE`, and `SETTLEMENT_FORBIDDEN` (from the Martian revision)
also covers the Sabretooth. A sluggish unit's refused action is the existing
`UNIT_ALREADY_ACTED`.

**Registration.** Faction `ICE_FOLK`, tree `ICE_FOLK_BASELINE_V1`, display
name "Ice Folk"; unlock kinds `WITCH_SUPPORT`, `DEEP_WINTER`, and `BRITTLE`;
capabilities `deepWinter` and `shatterThreshold`; abilities `MOUNTAIN_BORN`,
`ROCKFALL`, `BOLAS`, `COLD_BLOOD`, `SWEEP`, `TRAMPLE`, `BLIZZARD`,
`COLD_SNAP`, `BOULDERS`, `PROWL`, and `COLD_AURA`; role mechanics
`mountainBorn`, `glides` (false for the Sabretooth), `ignoresZocStops`,
`sweepDamage`, `tramplesFieldDefense`, `ignoresFortification`,
`plantedBonus2`, `rockfallAttack2`, and `coldBloodBonus2`, with
`capacitySlots` 1, `buildsFieldDefense` false, and `advancesAfterKill` false
for the Boulder Yeti; faction rule `snow` true and `treasureUnitRole`
`RAIDER`; and the constants `SHATTER_HP_V7` 3, `BRITTLE_SHATTER_HP_V7` 4,
`CHILL_TURNS_V7` 2, `BOLAS_RANGE_V7` 2, `COLD_SNAP_RANGE_V7` 2,
`BLIZZARD_RADIUS_V7` 1, `DEEP_WINTER_RADIUS_V7` 2, `DEEP_WINTER_RECOVER_V7` 6, `SWEEP_DAMAGE_V7` 2, `ROCKFALL_ATTACK2_V7` 3, `PLANTED_BONUS2_V7` 2, and
`COLD_BLOOD_BONUS2_V7` 1. Internal field names are the implementer's choice;
the serialized literals of this section are normative.
`assertRuleset7Registry` must accept the sixth tree unchanged (same node IDs,
tiers, branches, prerequisites, and tactical-role labels).

**Derived queries.** The engine exposes, for canonical state and for a view:

- `isSnowV7(state | view, at)` and `isBlizzardV7(state | view, at)`
  ([sections 6.1](#61-which-tiles-are-snow) and [6.3](#63-the-blizzard));
  the view variants are the `snow` and `blizzard` tile flags. **Snow is a
  public derived query for rendering:** the UI draws the overlay from the
  flags and never recomputes the rule;
- `unitIsSluggishV7`, `unitMayActAfterMoveV7`
  ([section 5.3](#53-sluggish-move-or-act-not-both)), and
  `unitMayEnterMountainV7` ([section 7.1](#71-mountain-born)).

**Public queries.**

- `queryPlayerCommandsV7` offers, for an Ice Folk seat: `MOVE` commands that
  follow Glide, Mountain-born, and Prowl; `ATTACK` at distance 2 for a Yeti
  on a Mountain; `THROW_BOLAS` for every legal `(Sled, target)` in unit-ID
  then target-ID order; `COLD_SNAP` for every Witch with a target. For every
  seat it withholds the actions a sluggish unit cannot take, and offers no
  `MOVE` path through a known Snow stop. It never offers an Ice Folk seat
  Field Defense, Rally, or Tend Wounded, or a Sabretooth a foreign center.
  Every offered command is accepted.
- `previewBolasV7(view, unitId, targetUnitId)` returns null unless that
  command is offered, otherwise
  `{ unitId, targetUnitId, becomesSluggish, turnsLeft, shatterSetups }`,
  where `shatterSetups` lists the viewer's own units whose currently offered
  attack on the target would shatter it once it is Chilled.
- `previewColdSnapV7(view, unitId)` returns null unless the command is
  offered, otherwise `{ unitId, targets: [{ unitId, becomesSluggish }] }` in
  unit-ID order.
- `queryCombatPreviewV7` and `estimateCombatV7` include Snow cover, the
  Blizzard, Rockfall, Planted (from the unit's current `moved` flag; an
  estimate for an attack after a planned Move uses Attack 2), Cold Blood,
  Sweep, and Shatter. They accept an option `assumeTargetChilled`, which
  evaluates the attack as if the target had a Chill entry; the Normal AI uses
  it for the Bolas rule ([section 12](#12-normal-ai-requirements)).
  `previewAttackExplosionsV7` leaves out the blast of a shattered defender.
- `queryThreatenedTilesV7` gives a visible Ice Folk unit its Glide reach on
  known Snow, a Mountain-born unit its Mountain paths, a Sabretooth its reach
  through zones of control, a Yeti the distance-2 tiles from every Mountain
  it can reach, and a Boulder Yeti range 2 from every tile it can reach. It
  adds no tile for a Bolas or a Cold Snap, which deal no damage. For a
  sluggish unit of any seat it gives the adjacent tiles (or its range) from
  where it stands, and no reach after a Move.
- `publicUnitStatsV7` carries, for a unit of any seat, `chill`: null, or
  `{ sluggish, turnsLeft }`. For units owned by an Ice Folk seat it carries
  an `iceFolk` block: `onSnow`, `inBlizzard`, `snowCover`, `glides`,
  `mountainBorn`, `shatterThreshold`, `rockfall` (true while it stands on a
  Mountain), `planted` (what an attack made now would be, or null),
  `sweepDamage`, and `blizzard` (true for a land-form Witch). The Attack row
  lists the modifier sources `ROCKFALL`, `PLANTED`, and `COLD_BLOOD`.
- `PublicPlayerV7` and the leaderboard carry `ICE_FOLK` and
  `ICE_FOLK_BASELINE_V1`.
- Every preview equals the resolution, except one flagged
  `hiddenBlizzardPossible` or `touchesUnexplored`.

## 12. Normal AI requirements

Normal AI plays as and against the Ice Folk (`pulp_wars-7g3.4`) with every
existing guarantee: deterministic and PRNG-free, only the public view, public
commands, and public previews, at most 128 accepted commands per owner turn
through bounded resumable work, and no change to decisions in matches without
an Ice Folk seat (every Ice Folk heuristic is gated on a match with an Ice
Folk seat, in a new `src/ai/v7-ice-folk.ts`, or reads a fact only such a
match has: a Chill entry, a Snow flag). It builds on the campaign plan of
[`pulp_wars-9s0.1`](../architecture/NORMAL_AI.md#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01).

From `pulp_wars-7g3.3` on, an Ice Folk seat must already play complete
headless matches without a policy error or stall, using the ordinary policy
on the Ice Folk registration.

**The user's rule for AI changes.** A change to a strategy heuristic comes
with a modest head-to-head or win-tendency test, not only behaviour
telemetry: the same seeds, mirrored seats, a few dozen decided games. For
this bead that means: the Ice Folk policy against the ordinary policy playing
the Ice Folk registration (the `7g3.3` baseline), both against the same
opponents and in the mirror; and each "against the Ice Folk" rule below
against the policy without it. A rule that does not tend to win is dropped,
however sensible it reads.

As the Ice Folk it must at least:

- **keep the Witch with the wave (three rules):**
  1. the Witch takes the Pressure job like any unit, so she is one of the
     units of a wave, and a wave that has her as a member does not leave home
     without her (the existing count of units at home);
  2. **her Move:** among her legal destinations she takes the one with the
     most own land units other than Witches within 1, then one not adjacent
     to a visible hostile unit, then the shortest route to the wave's target;
  3. **her action:** Cold Snap whenever it is offered. She acts first in the
     turn;
- **keep the wave with the Witch (the critic's additions):**
  - a Mountain-born unit that marches in a wave with a unit that is not
    Mountain-born uses the ordinary enterable test for its route, so that the
    Yetis do not go over the ridge while the Witch goes round. Alone, or in a
    wave of Mountain-born units, it routes with its own test;
  - at equal route progress, a unit ends its Move within 1 of an own Witch,
    then on a Snow tile;
- **act in a fixed order,** so that the ordinary attack choice sees Chill,
  Cold Blood, Sweep flanks, and Shatter in its previews: Witches (Cold Snap),
  Sleds that throw, Snow Hunters, Mammoths, then the other melee units, then
  Sleds that attack;
- **choose the Bolas target** by this rule: the visible hostile unit that
  some own unit's offered attack would shatter if it were Chilled
  (`previewBolasV7.shatterSetups`), the most valuable first; else the hostile
  unit not yet Chilled that can reach and attack an own unit next turn, the
  one with the highest projected damage first; else none, and the Sled
  attacks or moves. A Sled does not throw at a unit that a living Witch's
  Cold Snap already covers this turn;
- **set up Shatters:** a non-lethal attack on a Chilled unit gains value when
  it leaves the unit inside the Shatter window of another offered own attack
  this turn, and loses it when a different order kills the same unit with
  fewer hits. A Shatter is scored as a kill with no retaliation (it is one
  in the preview);
- **judge units by their abilities, not their labels:** the Boulder Yeti is
  not fragile siege that cannot attack after moving (the Triceratops
  precedent, `policyTacticalRoleV7`): it marches with the wave, throws from
  where it stands before considering a Move when a target is in range (the
  planted throw), and prefers fortified targets; the Witch has no Rally and
  no Tend Wounded, and those `CAPTAIN` paths are gated off; the Mammoth is a
  front-line attacker that may attack after moving, not a garrison;
- **use Sweep:** among Mammoth targets, add the previewed flank damage and
  flank kills, and the Field Defense trampled;
- **use the Sabretooth:** plan its reach through zones of control, never onto
  a foreign center; prefer a kill on a backline unit, then a Chilled unit it
  shatters; do not send it where the visible enemies kill it unless it kills
  first;
- **use Mountains as a tie-break only:** a Yeti with a visible hostile unit
  within Rockfall range of a Mountain it can reach ends its Move there when
  nothing better is offered; it does not leave an objective for a peak;
- **produce every role:** start from the ordinary production value and add a
  first-of-role bias for the Sled, the Mammoth, the Witch, the Snow Hunter,
  the Boulder Yeti, and the Sabretooth (the Dinosaur first-Triceratops
  bias); **train bodies first under threat:** while a visible hostile unit
  can reach a city within two turns, train Yetis or a Mammoth there, not a
  Sled or a Witch;
- **research toward its roles:** Scouting as the free opening technology
  unless a hostile unit is in sight, then Drill; Administration and
  Marksmanship at the priority the Dinosaur seats use for their signature
  technologies (above the economic plan, once the seat owns two cities);
  Deep Winter once it owns two cities or has a wounded unit at home; Brittle
  when it owns a Chill source and Deep Winter; then Sawmilling and Chivalry;
- **never rely on Field Defense,** which it cannot build, and count Snow
  cover only for units with no fortification.

Against the Ice Folk it must at least:

- **focus the Witch and the Sled:** a visible Witch is worth her cost plus a
  share of every own unit within two tiles of her that is Chilled or could
  be, and a Sled its cost plus the same for one unit (the Necromancer
  precedent); a kill on either outranks an equal kill elsewhere;
- **plan a sluggish unit as a unit that cannot act after moving,** through
  the shared helper: it attacks from where it stands when it has a target;
  otherwise it does **not walk into the melee reach of visible Ice Folk
  units for nothing**: it moves only when the Move ends outside that reach,
  makes route progress with no visible hostile unit within three tiles, or
  takes it out of a visible Witch's two tiles; else it recovers or waits;
- **finish wounded enemies before the Ice Folk finish its own:** count
  Shatter in every lethal-reach estimate: a Chilled own unit, or one within a
  visible Witch's Cold Snap or a visible Sled's Bolas reach next turn, is in
  lethal reach of a visible Ice Folk melee unit whose projected hit leaves it
  at the threshold or below. Such a unit is pulled back, recovers, is
  promoted when it can be, or is tended first by a Captain or a Shaman
  (Tend Wounded cures Chill);
- **not leave units in the window:** prefer an attack whose retaliation does
  not leave the attacker Chilled at 1 to 4 HP above a visible Ice Folk melee
  unit's projected hit, when an equal attack exists;
- **read Snow:** movement estimates for its own units with Move 2 or more
  count the deep-snow stop (the public Move query does); threat estimates of
  visible Ice Folk units include Glide on known Snow, Mountain paths,
  Rockfall, and Prowl;
- **shoot outside the Blizzard:** a ranged unit prefers a target whose
  preview is not `blizzardHalved` when the value is equal, and a siege unit
  shoots the Witch first when two shots kill her;
- **Goblin seats:** a goblin-crewed unit that will be sluggish next turn and
  is adjacent to a target now takes its Kaboom now when the existing scorer
  values it; the scorer leaves out blasts of units a visible Ice Folk attack
  would shatter;
- **Martian seats:** hold ray units still (already their rule), and do not
  count on a Shield against Chill.

Opening research keeps the existing scorer unless `pulp_wars-7g3.4` records
and tests an Ice Folk change. Headless matches of the Ice Folk against each
faction and against themselves must finish without stalls or policy errors,
and the tactical benchmark
([tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)) gains Ice
Folk scenarios: a Cold Snap taken before the melee attacks; a Witch that
steps to the densest group; a Bolas on the unit a Yeti then shatters; two
Yetis ordered so that the second hit shatters; a Mammoth choosing the target
with two flank units; a Boulder Yeti that throws planted instead of moving;
a Yeti that keeps to the wave's route beside a Witch; bodies trained before a
Witch under threat; an opponent's sluggish unit that holds its tile instead
of walking into reach; an opponent pulling a Chilled unit at 7 HP out of a
Yeti's reach; an opponent killing the Witch first.

### 12.1 Implementation status (`pulp_wars-7g3.4`)

The Ice Folk policy is in `src/ai/v7-ice-folk.ts` and its calls in
`src/ai/v7.ts`; the rules, values, and measurements are in the
[Normal AI document](../architecture/NORMAL_AI.md#ice-folk-play-pulp_wars-7g34).
Every rule above is implemented as written, with these readings and
measured deviations:

- **Threat estimates.** Glide, deep snow, and Prowl are in the reach of a
  visible unit. Two parts were dropped because they lost the head-to-head
  (the user's rule): Glide in the test of whether an own city is threatened
  (every city near hostile Snow became threatened, and the policy held its
  units at home), and Rockfall from a Mountain a Yeti could walk to (a Yeti
  on a Mountain keeps its published range 2). Glide stays in each unit's
  danger.
- **The Witch's Move key** has one more key after "not adjacent to a
  visible hostile unit": the most hostile units within Cold Snap range, so
  that she does not step back out of range for a tie on route and danger.
- **The Bolas set-ups** are computed from the offered attacks' previews with
  `assumeTargetChilled`, which is what `previewBolasV7.shatterSetups`
  computes, without querying the commands again for each throw.
- **The order of the turn** is by priority: the Witch's Move, Cold Snap,
  the Bolas that sets up a Shatter, then the attacks (a hit that leaves a
  Chilled unit in the window goes before every chip; the chips go Snow
  Hunters, Mammoths, other units, Sleds).
- **Route tie-breaks** are integers: an Ice Folk Move's route progress is
  scaled by 8 and the tie-breaks add 4, 2, or 1.
- **Not implemented:** the Goblin Kaboom rule; the Martian note needs no
  code (Chill is not damage, so the Shield-aware danger never counted on a
  Shield against it). The tactical benchmark is unchanged; its Ice Folk
  scenarios are unit tests in `tests/unit/ruleset-v7-ice-folk-ai.test.ts`.
- **Measured.** Against the generic policy on the Ice Folk registration
  (mirrored seats, the same seeds, Dry Land) the Ice Folk policy won 107 of
  180 decided games. The counterplay rules gave the other factions 73 of
  247 decided games against 67 of 249 without them. Against each faction
  the Ice Folk win 64% (Undead) to 76% (Goblins): Goblins and Dinosaurs,
  and Martians on 11 x 11, are beyond 70/30, as under the generic policy
  (`pulp_wars-7g3.7`).

## 13. UI requirements

### 13.1 Surfaces

The browser UI (`pulp_wars-7g3.6`) must, at requirement level:

- offer "Ice Folk" in every seat's faction select (default all Human);
- label every unit by its owner's faction, and render the technology tree
  (with the names Deep Winter and Brittle), research offers, action chips,
  and Help in the viewer's faction text ([section 4](#4-technology));
- **Snow overlay (derived):** draw Snow on every explored tile whose view
  flag `snow` is true, over the terrain and under Roads, improvements,
  resources, and units, so that Grass, Forest, and Mountain stay readable
  beneath it. It follows the flag: it appears and disappears with captures,
  Land Grants, Deep Winter, and a Witch's steps, with no stored state on the
  client either;
- **Blizzard:** on every explored tile whose flag `blizzard` is true, a
  falling-snow effect over the Snow overlay, water tiles included; the
  selected or hovered Witch shows the outline of her nine tiles;
- **Chill markers,** on units of any owner, two states that must not be
  confused:
  - **Frozen** (`sluggish` true): a heavy marker, the unit cased in ice to
    the waist, with the status line "Frozen: move or act, not both";
  - **Frosted** (Chilled, not sluggish): a light rime on the unit and a
    small frost glyph, with the status line "Frosted: an Ice Folk blow that
    leaves it at {n} HP or less shatters it";
  - a thawing entry draws no marker; unit info says "Thawing: frost will not
    slow it again this turn";
- **Shatter window on HP bars:** while an Ice Folk seat is in the match, the
  HP bar of a Chilled unit marks its lowest {threshold} HP;
- **sluggish actions:** a Frozen unit's action chips are disabled once it has
  moved, with the reason "Frozen: it moved, so it cannot act this turn", and
  after it acted the Move overlay is empty as usual;
- **movement:** show a non-Ice-Folk unit's reachable tiles with the deep-snow
  stop, and an Ice Folk unit's with Glide; a tooltip on a Snow tile says what
  it does for the viewer's faction; never offer a Sabretooth a foreign
  center;
- **attack preview,** for own and enemy attacks: "Shatters" in place of the
  damage and retaliation lines; "Chilled" on the defender; the Sweep flank
  victims with their damage; "Tramples Field Defense"; "Ignores
  fortification"; "Rockfall"; "Planted"; "Cold Blood"; "Snow cover";
  "Blizzard: half damage"; and "A hidden Blizzard may change this" when
  `hiddenBlizzardPossible` is set;
- **Bolas:** a Sled command; choosing it highlights legal targets within two
  tiles; hovering one shows whether it will be Frozen or only Frosted and
  which own units could then shatter it; a click confirms. The disabled
  command names its reason;
- **Cold Snap:** a Witch command; choosing it highlights every target within
  two tiles with the same Frozen or Frosted hint; one confirm casts it. There
  is no target to pick. The disabled command says "No enemy within 2 tiles";
- **Shatter effect:** the unit bursts into shards, no Grave appears, and no
  bomb goes off; distinct from an ordinary death;
- **Rockfall and Boulders:** a Yeti on a Mountain shows its distance-2
  targets; a Boulder Yeti's unit info shows the throw it would make now
  ("Planted: Attack 3" or "Moved: Attack 2");
- **Cold Aura:** the Giant's eight tiles pulse at its owner's Start Turn when
  it chills something;
- **city panel:** Ice Folk production rows with cost and slots; no Field
  Defense action;
- **log lines** for a Bolas, a Cold Snap, a Cold Aura, a Shatter, and a
  Trample;
- look identical to the previous revision in matches without an Ice Folk
  seat, apart from the extra faction option.

### 13.2 Labels and text

| Surface                       | Text                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Faction option                | Ice Folk                                                                             |
| Frozen status                 | Frozen: move or act, not both                                                        |
| Frosted status                | Frosted: an Ice Folk blow that leaves it at {n} HP or less shatters it               |
| Thawing (unit info only)      | Thawing: frost will not slow it again this turn                                      |
| Frozen unit, action disabled  | Frozen: it moved, so it cannot act this turn                                         |
| Attack preview (Shatter)      | Shatters                                                                             |
| Attack preview (Sweep)        | Sweep: {unit} {n} damage                                                             |
| Attack preview (Trample)      | Tramples Field Defense                                                               |
| Attack preview (Boulders)     | Ignores fortification                                                                |
| Attack preview (Rockfall)     | Rockfall: Attack 1.5 from the Mountain                                               |
| Attack preview (Planted)      | Planted: +1 Attack                                                                   |
| Attack preview (Cold Blood)   | Cold Blood: +0.5 Attack                                                              |
| Attack preview (cover)        | Snow cover                                                                           |
| Attack preview (Blizzard)     | Blizzard: half damage                                                                |
| Attack preview (hidden Witch) | A hidden Blizzard may change this                                                    |
| Snow tile tooltip (Ice Folk)  | Snow: your units move at half cost and have cover here unless fortified              |
| Snow tile tooltip (others)    | Snow: your units stop on entering, as in a Forest. Ice Folk units have cover         |
| Blizzard tooltip              | Blizzard: Snow, and Ice Folk units here take half damage from ranged attacks         |
| Bolas command                 | Bolas                                                                                |
| Bolas tooltip                 | Chill a hostile unit within 2 tiles. No damage.                                      |
| Bolas target hint             | Will be Frozen; Will be Frosted; {unit} can then shatter it                          |
| Bolas unavailable             | No enemy within 2 tiles; Frozen: it moved                                            |
| Cold Snap command             | Cold Snap                                                                            |
| Cold Snap tooltip             | Chill every hostile unit within 2 tiles.                                             |
| Cold Snap unavailable         | No enemy within 2 tiles                                                              |
| Boulder Yeti info             | Planted: Attack 3; Moved: Attack 2                                                   |
| Sabretooth info               | Prowl: zones of control do not stop it. It cannot stand on a foreign city or village |
| Mountain-born info            | Mountain-born: crosses Mountains without Engineering                                 |
| Shatter threshold (unit info) | Shatters at {n} HP or less                                                           |
| Field Defense unavailable     | Ice Folk cannot build Field Defense                                                  |
| Log (Bolas)                   | {owner} Sled chilled a {unit}                                                        |
| Log (Cold Snap)               | {owner} Ice Witch chilled {n} unit(s)                                                |
| Log (Cold Aura)               | {owner} Frost Giant chilled {n} unit(s)                                              |
| Log (Shatter)                 | {owner} {unit} shattered a {unit}                                                    |
| Log (Trample)                 | {owner} Mammoth trampled Field Defense                                               |

### 13.3 Help text

One sentence per rule, shown in Help for every viewer:

- **Chill:** a Bolas, a Cold Snap, or a Frost Giant's aura frosts a unit; on
  its first frozen turn it may move or act, not both, and frost that is kept
  up does not slow it again.
- **Shatter:** an Ice Folk blow from an adjacent tile that leaves a frosted
  unit at 3 HP or less kills it, with no blow back, no Grave, and no
  explosion.
- **Brittle:** with Brittle, Shatter happens at 4 HP or less.
- **Snow:** Ice Folk land is Snow: Ice Folk units move at half cost on it and
  have cover unless they are fortified, and other units stop on entering it,
  as in a Forest.
- **Blizzard:** the tiles around an Ice Witch are Snow on any ground, and Ice
  Folk units there take half damage from ranged attacks.
- **Cold Snap:** an Ice Witch chills every hostile unit within 2 tiles.
- **Bolas:** a Sled chills one hostile unit within 2 tiles, without damage.
- **Cold Blood:** a Snow Hunter has +0.5 Attack against a frosted unit.
- **Sweep and Trample:** a Mammoth's attack also deals 2 to the units on both
  sides of its target and flattens the Field Defense under it.
- **Mountain-born:** Yetis, Boulder Yetis, and Frost Giants cross Mountains
  without Engineering and without stopping.
- **Rockfall:** a Yeti on a Mountain can attack two tiles away at
  Attack 1.5.
- **Boulders:** a Boulder Yeti's throw ignores Walls and Field Defense, and
  has +1 Attack on a turn it has not moved.
- **Prowl:** zones of control do not stop a Sabretooth; it cannot stand on a
  city or village it does not own.
- **Cold Aura:** a Frost Giant frosts every hostile unit next to it at the
  start of its owner's turn.
- **Deep Winter:** with Deep Winter, Snow spreads two tiles from Ice Folk
  city centers, and Ice Folk units recover 6 in their own territory.

### 13.4 What the art bead needs

`pulp_wars-7g3.5` picks the art direction and makes the production art; this
contract only lists what must exist and what each piece has to say. The
faction fragment is written from
[the faction template](../art/factions/FACTION_TEMPLATE.md) under the shared
[art direction](../art/ART_DIRECTION.md); the user's hint is that white and
ice-blue is a free colour space. Until the art exists, an Ice Folk unit draws
the Human sprite of its role with an Ice Folk badge (the rule every faction
used before its art), and the markers and overlays below are code-drawn.

| Piece                                                   | Design intent in one line                                                                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yeti (unit, portrait)                                   | A white snow ape with a club: the faction's plain soldier, broad and upright, clearly not a human in furs.                                                                                                 |
| Sled (unit, portrait)                                   | A small dog sled with a driver whirling a bolas: fast, low, and readable as "the one that throws the frost".                                                                                               |
| Snow Hunter (unit, portrait)                            | A fur-clad hunter with a harpoon or a bone bow: lean, the only human-sized figure of the roster.                                                                                                           |
| Mammoth (unit, portrait)                                | A woolly mammoth with tusks raised for the swing: the biggest one-slot body in the game, wide rather than tall.                                                                                            |
| Ice Witch (unit, portrait)                              | A robed witch with a staff and snow swirling round her: she must be findable at a glance, because she is the target.                                                                                       |
| Boulder Yeti (unit, portrait)                           | A larger, darker Yeti holding a boulder overhead: the thrower, not to be confused with the Yeti at tile size.                                                                                              |
| Sabretooth (unit, portrait)                             | A sabre-toothed cat in mid-prowl, riderless: long, low, and fast.                                                                                                                                          |
| Frost Giant (unit, portrait)                            | A giant of ice and rock, taller than the Mammoth: the reward unit, with cold coming off it.                                                                                                                |
| Boats and embarked units                                | The shared Human subjects with the Ice Folk badge.                                                                                                                                                         |
| Cities (village, city, capital, with and without Walls) | Ice and hide dwellings on snow, growing by level like the other factions' cities; Walls of packed ice.                                                                                                     |
| Faction emblem and badge                                | One mark for the faction select, the leaderboard, and the fallback badge.                                                                                                                                  |
| Technology icons                                        | Deep Winter (snow spreading from a house) and Brittle (a cracked ice block).                                                                                                                               |
| Command icons                                           | Bolas (two weighted cords) and Cold Snap (a burst of frost).                                                                                                                                               |
| Frozen marker                                           | The unit cased in ice to the waist: "this unit is slow this turn". Must read on every faction's sprites.                                                                                                   |
| Frosted marker                                          | Light rime and a small frost glyph: "this unit can be shattered". Clearly lighter than Frozen.                                                                                                             |
| Shatter window on the HP bar                            | A tinted end segment of the bar for the lowest 3 (or 4) HP.                                                                                                                                                |
| Snow overlay                                            | A tile overlay that whitens Grass, Forest, and Mountain without hiding which is which, and keeps Roads, resources, and improvements readable; it must tile across a territory and end cleanly at its edge. |
| Blizzard effect                                         | Falling, drifting snow over the Witch's nine tiles, water included; it moves with her.                                                                                                                     |
| Shatter effect                                          | The unit turns to ice and bursts into shards that melt away: no body, no Grave.                                                                                                                            |
| Bolas effect                                            | A thrown bolas that wraps the target in frost.                                                                                                                                                             |
| Cold Snap effect                                        | A ring of frost that expands two tiles from the Witch.                                                                                                                                                     |
| Sweep effect                                            | An arc across the three tiles in front of the Mammoth, and Field Defense flattened under the middle one.                                                                                                   |
| Rockfall and Boulder effects                            | A small rock lobbed from a peak; a boulder with a heavier arc and impact, larger when planted.                                                                                                             |
| Cold Aura effect                                        | A pulse of cold over the Giant's eight neighbours at Start Turn.                                                                                                                                           |

## 14. Unchanged behaviour of the other factions

A match without an Ice Folk seat behaves identically to the previous identity
apart from identity. For equal setups, seeds, and command sequences it
produces the same maps, legal commands, previews, accepted and rejected
commands, events, and views. The only differences are the ruleset ID, the
autosave key, the obsolete-key list, the command ordinals after
`TRACTOR_BEAM` and the event ordinals after `UNITS_RALLIED`, the empty
`chilled` list of the state and the view, the tile flags `snow: false` and
`blizzard: false`, the `curedChill: false` field, the `chill: null` unit
stat, and the eight neutral preview fields. No unit is ever Chilled, no tile
is Snow, neither command is offered or accepted, every role has
`mountainBorn` false, and the helpers of
[sections 5.3](#53-sluggish-move-or-act-not-both) and
[7.1](#71-mountain-born) return exactly what the role flag and Engineering
returned before.

In mixed matches each unit applies its own registration: every other
faction's units keep every ability against the Ice Folk, with the rulings of
[section 10](#10-interactions-with-existing-rules).

## 15. Implementation split and test expectations

Each bead proves its part with deterministic tests (new tests live in
`tests/unit/ruleset-v7-ice-folk-*.test.ts` unless noted).

**`pulp_wars-7g3.3`: identity, registration, every shape and every rule.**

- **First step, before any number is coded:** re-run the scratch analysis of
  [section 9](#9-per-unit-battle-analysis) on the registry current at that
  time (the Martian units from the engine instead of from paper, and any
  Human, Undead, or Goblin HP that revision 20's tuning moved), and report to
  the root every per-unit verdict or Shatter figure that flips.
- **Two helper refactors first, each alone and behaviour-neutral:**
  `unitMayActAfterMoveV7` with every read of the role flag for a concrete
  unit routed through it; and Mountain-born added to the Martian
  `canEnterTerrainV7` (on `main` since commit `d88503c`) and to its
  not-stopped-by-terrain test, **merged with that helper, not written in
  parallel**, with every remaining Engineering test for a unit entering a
  Mountain moved onto it ([section 7.1](#71-mountain-born)); pinned decision
  and state hashes of existing matches unchanged after each.
- **Identity:** the exact `7rNN`; the previous identity's setup, state,
  save, and replay rejected; gap-free prior list; save key and obsolete-key
  cleanup; faction and tree orders, binding, display name; registry assertion
  with six trees; faction-independent maps with Ice Folk seats; the two
  command kinds and the event kind at the stated positions.
- **Roster:** every value of the [section 3](#3-ice-folk-roster) table as
  registry values; one starting Yeti; Militia one Yeti; reward Frost Giant;
  treasure Sled with a free slot and the 5-Coin fallback; Disband
  refunds; Muster roles; no Field Defense, Rally, Tend Wounded, Overrun,
  Escape; per-viewer technology names and unlock text; every row of the
  [section 4](#4-technology) audit that names an Ice Folk effect.
- **Chill:** each source; each legal entry and each transition of
  [section 5.4](#54-duration-and-re-application), turn by turn, including the
  thawing turn and a new freeze after a lapse; no sluggish turn on
  re-application; every row of the [section 5.3](#53-sluggish-move-or-act-not-both)
  table for a unit of each faction that has the action (a Goblin's Kaboom, a
  Raider's Escape and Pillage, a Banshee's Wail, a Shaman's Hatch, a Brain's
  Mind Control, a Sled's Bolas); the advance, Overrun, Rampage, and Push of a
  sluggish unit; who cannot be Chilled (embarked, naval, Egg, own, allied);
  a Shield not blocking it; removal on each way a unit leaves the board; the
  countdown while embarked; state parsing rejections; the view list.
- **Shatter:** thresholds 3 and 4; every row of
  [section 5.6](#56-worked-examples); distance 1 only (a Hunter and a Boulder
  Yeti at distance 1 do, at distance 2 do not; a Rockfall does not); attacks
  only (no Shatter on retaliation or a flank hit); no retaliation; no Grave;
  no death blast, with the chain preview agreeing; a Bitten victim rising;
  `JUGGERNAUT` roles, Eggs, embarked units exempt; a two-slot unit not
  exempt; a hit fully absorbed by a Shield that still shatters; kill credit
  and Promotion; the event order of [section 8](#8-attack-resolution-order).
- **Snow:** each of the three sources and their union; no Snow on water or a
  Rift; Snow following capture, Land Grant, the Witch's Move, her death, and
  her embarking; Glide costs for one, two, and four tiles, with Roads, and
  none for the Sabretooth; a Witch's own Move reading the pre-command Snow;
  cover at fortification 0 only, not cumulative with Forest or Mountain,
  ignored by Acid; deep snow for a Raider, a Knight, a Raptor, a T-Rex, and a
  Road mover, waived by a Road edge and by Fieldcraft, ignored by flyers and
  walkers; `SNOW_STOPS_MOVE`; the interruption by a hidden Witch's Blizzard;
  the tile flags of a view with a visible and with a hidden Witch; two Ice
  Folk seats sharing Snow.
- **Blizzard and Cold Snap:** halving, rounded up, at distance 2 and 3 and
  not at 1; per seat in a mirror (a unit of the Witch's seat halved against
  every shooter, enemy Ice Folk included; an enemy Ice Folk unit in her
  Blizzard not halved but with Snow cover and Glide); not for retaliation, splash on other units, Wail, Kaboom, blasts,
  or Plague; splash and Pierce from the halved hit; every legality row of
  Cold Snap; visible targets only; re-application.
- **Unit rules:** Mountain-born in `MOVE`, `DISEMBARK`, the advance, a Push,
  a Charge! push, and displacement, and no stop on a Mountain; Rockfall
  range, Attack, no retaliation from melee units, the Yeti's own retaliation
  range; every row of the Bolas table; Cold Blood; Sweep on each of the eight
  target directions, with hostile, own, allied, Egg, Armoured, shielded, and
  exploding flank units, and with the Mammoth dying; Trample with its reason;
  Boulders against Walls and Field Defense for damage and retaliation, cover
  kept, Planted from `moved` and from landing, no advance; Prowl through
  zones of control, the forbidden centers for `MOVE`, `DISEMBARK`, and the
  advance; the Cold Aura's place in the Start Turn order.
- **Technologies:** Deep Winter's ring and Recover 6 in own territory only;
  Brittle's threshold with Blast Mountain and melee demolition kept.
- **Interactions:** each row of
  [sections 10.1](#101-undead-rules) to [10.5](#105-human-abilities), and
  [10.6](#106-cities-siege-capture-and-capacity) to
  [10.11](#1011-promotion-disband-achievements).
- **Previews and queries:** each preview equal to its resolution; offered
  commands equal to accepted ones; `hiddenBlizzardPossible`;
  `assumeTargetChilled`; the `chill` stat and the `iceFolk` block;
  threatened tiles.
- **Showcase** with an Ice Folk seat. **Persistence:** save, replay, and hash
  round-trip with a non-empty `chilled` list in each legal combination;
  projection of `UNITS_CHILLED`.
- **Parity** of matches without an Ice Folk seat with the previous identity
  apart from identity and neutral fields; headless Normal matches with Ice
  Folk seats finishing without policy errors; refreshed release corpus with
  reviewed diff.

**`pulp_wars-7g3.4`: Normal AI.** [Section 12](#12-normal-ai-requirements)
behaviours with `tests/unit/ruleset-v7-ice-folk-ai*.test.ts` scenarios (the
benchmark list of section 12, plus: the fixed unit order; a Sled that does
not throw under a living Witch's Cold Snap; research order; a Sabretooth
never planned onto a foreign center; an opponent's ranged unit preferring a
target outside the Blizzard); determinism and command bounds; headless
matches of the Ice Folk against all six factions in both seat orders without
stalls or policy errors; pinned decision hashes of matches without an Ice
Folk seat unchanged; the **head-to-head or win-tendency test** of
[section 12](#12-normal-ai-requirements) for the Ice Folk policy as a whole
and for each "against" rule, with its seeds and results in the bead; sample
metrics of every ability; the public-planning benchmarks with the
`THROW_BOLAS` command lists.

**`pulp_wars-7g3.5`: art direction and production art.** The pieces of
[section 13.4](#134-what-the-art-bead-needs), under the PixelLab workflow of
the project instructions: an approved direction first, a small sample per
class, every result reviewed at native and enlarged size, then the batch.
The Frozen and Frosted markers and the Snow overlay are reviewed on the
sprites and tiles of **every** faction and terrain, because they are drawn
over all of them.

**`pulp_wars-7g3.6`: UI.** [Section 13](#13-ui-requirements) surfaces,
labels, and Help; the Snow overlay and the Blizzard from the view flags,
changing with a capture and with a Witch's Move; Frozen and Frosted markers
for own and enemy units, and the thawing line; disabled actions of a Frozen
unit with their reason; the Bolas and Cold Snap flows with their hints and
disabled reasons; every line of the attack preview; the Shatter effect
without a Grave; Deep Winter and Brittle in the tree; the wired art and the
badge fallback; start and finish a match as and against the Ice Folk in the
browser; screens of matches without an Ice Folk seat unchanged; a browser
smoke probe that sees a Snow tile, casts a Cold Snap, throws a Bolas, sees a
Frozen unit refused an attack after moving, and performs a Shatter and a
Sweep (the Showcase makes all of them reachable on the first turns).

**`pulp_wars-7g3.7`: coarse balance.** The matrix and telemetry of
[section 16.2](#162-measurement), the acceptance of
[section 16.4](#164-balance-acceptance), any tuning inside
[section 16.3](#163-tuning-bounds) with this contract, the code, and the
tests changed together, a tuning record added to this document, and a short
written report (`docs/validation/RULESET_7_ICE_FOLK_BALANCE.md`).

`pulp_wars-7g3.3` changes the identity and therefore refreshes the release
corpus (`npm run validate:ruleset7-release` with its reviewed refresh). No UI
offers the faction until `pulp_wars-7g3.6`.

## 16. Headless support, measurement, tuning bounds, and balance acceptance

### 16.1 Headless support

- The headless CLI and the balance matrix accept `ice` in `--factions` and
  the pairing letter `I`, on every map type including `showcase`.
- Headless metrics count the two new commands in `commandsByKind` and the new
  event like any other kind.

### 16.2 Measurement

The project's current balance policy (the user, 2026-10-02): until the user
says it is time to fine-tune, balance work uses **Dry Land maps only, small
samples, no high-powered win-rate statistics, and no per-matchup band
chasing**. The goal is to remove gross imbalances (worse than about 70 to 30)
and blind spots (a faction powerless against one mechanic, a dead or a
dominant unit).

- **Pairings,** Normal against Normal, Rival, Dry Land, sizes 11 and 14,
  both seat orders, enough seeds for **about 20 to 40 decided games per
  opponent** (root ruling 8), 150 rounds: `IH`, `HI`, `IU`, `UI`, `IG`,
  `GI`, `ID`, `DI`, `IM`, `MI`, and `II`. One four-seat mix on
  16 × 16 as a smoke check, not a measurement.
- **Biome split.** Because Mountain-born and Rockfall depend on the map,
  the report splits the Ice Folk results by the share of Mountain tiles
  within four tiles of the Ice Folk capital (below 15%, above 30%).
- **Ice Folk telemetry** per game and seat, from a replay of the accepted
  command log:
  - units trained by role, the round of the first unit of each role, the
    round each technology was researched, units owned at each End Turn, used
    slots and capacity;
  - kills and losses by role and cause; the share of the seat's kills made
    by each role;
  - **Chill:** applications by source (Bolas, Cold Snap, Cold Aura) and by
    the target's faction and role; new freezes against re-applications;
    **sluggish turns caused**, and of those the turns on which the unit
    neither attacked nor used another primary action (the turns frost
    actually cost); Tend Wounded cures;
  - **Shatter:** kills by the attacker's role, by the victim's faction and
    role, and **by set-up**: which source chilled the victim (Bolas, Cold
    Snap, Cold Aura) and what brought it into the window (a Yeti hit, a Sweep
    flank, a Hunter, a Boulder, a Charge at full HP, earlier damage);
    retaliation avoided (the preview's retaliation without the rule); Graves
    and death blasts denied; Shatters per Ice Folk seat-game and per fight
    turn;
  - **Sweep:** flank hits, flank damage, flank kills, attacks with zero, one,
    and two flank victims; Field Defense trampled;
  - **Rockfall:** shots, damage, and kills, by the biome split; **Mountain
    crossings:** Moves of Mountain-born units that entered a Mountain their
    owner could not enter by Engineering, and Moves that passed through one;
  - **Cold Snap:** casts, targets per cast, turns a Witch could not cast (no
    target), turns she ended within 1 of at least two own land units, the
    round she died and what killed her;
  - **Bolas:** throws, targets by role, throws followed by a Shatter of the
    same target within the next Ice Folk turn;
  - **Blizzard:** ranged attacks halved, **damage prevented by the halving**,
    by the attacker's role; attacks on Ice Folk units with Snow cover and
    the damage it prevented;
  - **Snow:** Glide Moves (Moves longer than the unit's Move), enemy Moves
    stopped by deep snow, Snow tiles owned at each End Turn;
  - **Boulders:** throws planted and moved, damage, fortification levels
    ignored, Field Defense destroyed; **Prowl:** Sabretooth Moves that
    entered a zone of control and continued, its kills by victim role, turns
    survived after its first attack; Cold Aura applications;
  - turns at the 128-command cap.
- **Against the Ice Folk,** per opposing seat: its units shattered; its
  sluggish turns; Witches and Sleds it killed and in which round; units it
  lost at full HP in one enemy turn.

### 16.3 Tuning bounds

`pulp_wars-7g3.7` may move these numbers within the listed bounds without
root approval, changing this contract, the code, and the tests together and
justifying each change in its report. Anything outside the bounds, any number
of another faction, and any mechanic change needs root approval.

| Parameter                                                    | Contract value         | Bounds                                      |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------- |
| Yeti HP / Defense / cost                                     | 10 / 2 / 2             | 9–11 / 1.5–2 / fixed                        |
| Rockfall Attack                                              | 1.5                    | 1–2                                         |
| Sled HP / cost / Bolas range                                 | 10 / 3 / 2             | 8–10 / 3–4 / 1–2                            |
| Snow Hunter HP / cost / Cold Blood                           | 8 / 3 / +0.5           | 7–10 / 3–4 / 0 to +1                        |
| Mammoth HP / Attack / Defense / cost                         | 20 / 2.5 / 2 / 6       | 18–24 / 2–3 / 2–2.5 / 5–7                   |
| Sweep damage                                                 | 2                      | 1–3                                         |
| Ice Witch HP / cost                                          | 12 / 5                 | 10–14 / 4–6                                 |
| Cold Snap radius                                             | 2                      | 1 or 2                                      |
| Blizzard ranged damage                                       | half, rounded up       | half or two thirds, rounded up              |
| Boulder Yeti HP / Attack / Planted / Defense / cost          | 12 / 2 / +1 / 1.5 / 8  | 10–14 / 1.5–2.5 / +0.5 to +1.5 / 1–2 / 7–10 |
| Sabretooth HP / Attack / cost                                | 14 / 3 / 9             | 12–16 / 2.5–3 / 8–10                        |
| Frost Giant HP / Attack / Defense                            | 40 / 4 / 4             | 36–44 / 3.5–4 / 3.5–4                       |
| Shatter threshold / with Brittle                             | 3 / 4                  | 2–3 / 3–4                                   |
| Deep Winter Recover                                          | 6                      | 4–6                                         |
| Militia Yetis                                                | 1                      | 1 or 2                                      |
| Other Attack and Defense values of the roster                | section 3              | ±0.5 each                                   |
| Snow cover; Blizzard radius; Deep Winter radius; Move values | × 1.5; 1; 2; section 3 | fixed                                       |

Two constraints on every combination: **the Brittle threshold is never above
4 and never below the base threshold**, and the Yeti does not cost less
than 2.

Named levers. `pulp_wars-7g3.7` may propose them with evidence; each needs
root approval before it is applied.

| Lever                   | Contract                                                       | Alternative                                                                                 |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Charge and Shatter      | a charging Sled shatters a full-HP Chilled Fighter             | no Shatter on an attack with Charge; or the Sled has no Charge                              |
| Mammoth slots           | one slot                                                       | two slots with 24 HP, only if Mammoths prove dominant per slot                              |
| Home cover              | Snow cover on every unfortified Snow tile                      | cover only in a Blizzard and on the eight tiles around a center                             |
| Sluggish again          | at most every third turn of the unit's owner                   | a thawing period of two of the owner's turns (at most every fourth)                         |
| Frost that does nothing | a Chilled unit exerts zone of control                          | a Chilled unit exerts none (if frost reads as doing nothing in a brawl)                     |
| Chill and Shields       | Chill ignores Shields                                          | a unit with a full Shield cannot be Chilled (only if the Martians lose worse than 70 to 30) |
| Boulder Yeti range      | 1–2 on every tile                                              | 1–3 from a Mountain when planted                                                            |
| Rockfall                | the Yeti's retaliation range stays 1                           | none planned; a Yeti that retaliates at 2 deals a Marksman 5 a shot                         |
| Witch value             | Snow (Glide and cover) for every Ice Folk unit in her Blizzard | Cold Snap radius 1 (inside the bounds), or no Glide in a Blizzard outside own territory     |
| The floe                | deferred                                                       | [section 17.3](#173-deferred-the-floe)                                                      |

### 16.4 Balance acceptance

Coarse, on Dry Land:

- **No gross imbalance:** in decided games the Ice Folk win between about
  30% and 70% against each faction separately (`IH` + `HI`, `IU` + `UI`,
  `IG` + `GI`, `ID` + `DI`, and `IM` + `MI` once measured). With about 20 to 40
  decided games per opponent the report states the counts and does not chase a band
  inside that range.
- **No stalls, policy errors, or exceptions,** and the round-cap rate of the
  Ice Folk pairings is not clearly above that of the others in the same run.
- **No blind spot.** The report answers each of these with a number: does
  every opposing faction kill Witches (in at least half of the seat-games in
  which one was fielded)? Does every opposing faction take an Ice Folk city
  in some games? Do Goblin packs, Cavemen, a T-Rex, Walls, Shields, and
  ranged armies each lose some fights to the Ice Folk and win some? Is there
  a pairing in which Shatter never fires other than against Goblins?
- **Every roster unit is produced and every ability is used:**

  | Unit or ability             | Threshold                                                                                               |
  | --------------------------- | ------------------------------------------------------------------------------------------------------- |
  | Sled                        | trained in at least half of Ice Folk seat-games; a Bolas thrown in at least half of those               |
  | Mammoth                     | trained in at least half of seat-games; a flank hit in at least half of those                           |
  | Snow Hunter                 | trained in at least half of the seat-games with Marksmanship                                            |
  | Ice Witch                   | trained in at least half of the seat-games with Administration; a Cold Snap in at least half of those   |
  | Shatter                     | at least one in half of the seat-games against Humans, Undead, Dinosaurs, and Martians (Goblins exempt) |
  | Glide, deep snow            | each seen in at least half of seat-games                                                                |
  | Mountain crossing, Rockfall | reported by the biome split; seen in at least half of the seat-games of the high-Mountain half          |
  | Boulder Yeti, Sabretooth    | trained in at least half of the seat-games with their technology; otherwise reported (tier 3)           |
  | Frost Giant                 | reported (reward only)                                                                                  |

- **No unit is dominant.** Watch bands; outside one the report explains and
  proposes: no role other than the Yeti makes more than 40% of the seat's
  kills; the Ice Folk decided win rate with and without a Witch fielded
  differs by less than about 25 percentage points; Shatters by a charging
  Sled are less than half of all Shatters; no more than about one enemy
  unit-turn in five is a sluggish turn that cost its action.
- **The root's watch items** are reported one by one: Dinosaurs against the
  Ice Folk (Cavemen, the Raptor rush, the T-Rex); Goblins by phase (before
  and after the first Witch); Rockfall by the biome split; how often Shatter
  fires and by which set-up; the Witch's value for 5 Coins; the Boulder Yeti;
  and, from this document, the Mammoth per Coin and per slot, the home
  opening against Humans, and the Sled's Charge.
- **The pairings without an Ice Folk seat** have byte-identical final state
  hashes to a pre-tuning run of the same seeds under the same identity.

If the gameplay fails these, `pulp_wars-7g3.7` iterates within
[section 16.3](#163-tuning-bounds) and the Ice-Folk-only Normal AI, and asks
the root before going outside the bounds. Fine tuning, the other map types,
and the water layer wait for the user.

### 16.5 Tuning record

Empty until `pulp_wars-7g3.7` records the chosen numbers here.

## 17. Decisions made in this spec

### 17.1 Deviations from the root decisions

**No decided number is changed.** Every roster value, the threshold 3, the
Brittle threshold 4, Rockfall at Attack 1.5, Cold Blood at +0.5, and the
one-slot Mammoth are the root's. The arithmetic found no unit dead or
dominant with them ([section 9.14](#914-the-roots-decisions-checked)); the
two nearest the edges are the Mammoth (weak per Coin, strong per slot) and
the Sled's Charge on a Chilled Fighter.

These readings **narrow or extend** a decision; the root confirmed them
([section 17.5](#175-root-rulings)):

1. **The thawing turn** (decision 1). The decision says a unit is sluggish
   only on the first turn of a freeze and that re-application on consecutive
   turns does not slow it again. Read literally, with the critic's "frost
   that lapses for a turn resets it", a Witch that casts on alternate turns
   would keep every enemy Shatter-eligible on all of her turns and sluggish
   on every second of theirs. The entry therefore keeps a third state,
   thawing, for one more of the owner's turns: a new sluggish turn is
   possible at most every third turn, and only after a whole Ice Folk turn
   without Shatter eligibility.
2. **One Chill lasts two Ice Folk turns** of Shatter eligibility (the
   critic's rule; the second draft's lasted one). It makes a lone Sled worth
   more before the Witch: throw this turn, charge the same unit next turn.
3. **Shards and risings** (decision 1: "no rule about risings"). A Bitten
   unit that is shattered rises as its biter's Zombie; the missing Grave was
   never going to exist there.
4. **Rockfall and retaliation** (decision 4). The Yeti's retaliation range
   stays 1; otherwise a Marksman that shoots a Yeti on a peak takes 5 back.
5. **The Boulder Yeti has no Rockfall.** The decisions give it range 1–2;
   the critic's range 1–3 from a Mountain when planted is a named lever.
6. **Sluggish is slightly stricter than the Guard's restriction:** it also
   stops Kaboom and Pillage after a Move, which the role flag does not, so
   that "a Chilled Goblin may not walk up and Kaboom" (the second draft's
   ruling) is true.
7. **The Sabretooth's ability is named Prowl,** because Pounce is already the
   Raptor's Charge. It also does not advance onto a foreign center after a
   kill, so that "cannot end on a settlement it does not own" has no hole.

### 17.2 Other decisions

Each fills a gap with the simplest rule consistent with the engine; the root
may change any of them.

8. **Chill lives in a side list** with `sluggish` and `turnsLeft`; the
   countdown runs at the owner's End Turn and has no event.
9. **Chill ignores Shields; Shatter reads the HP after the Shield.** A hit
   that deals no HP damage can shatter. Numbers in
   [section 9.13](#913-the-faction-as-a-whole).
10. **Eggs, embarked units, and naval units cannot be Chilled** (the root's
    default for Eggs; the same reason for the others: they do not act). A
    Chilled unit that embarks keeps a dormant entry.
11. **Snow is per faction, the Blizzard's halving per seat** (root ruling
    4, [section 6.3](#63-the-blizzard)). One Snow predicate serves movement,
    cover, and drawing; the halving also reads the Witch's owner.
12. **Snow is read once per `MOVE`,** from the state before the command.
13. **Snow cover needs fortification 0 of the unit itself,** whatever the
    attack ignores; it is not added to Forest or Mountain cover.
14. **Deep snow is a terrain stop:** a Road edge and Fieldcraft waive it;
    Martian flyers **and walkers** ignore it (the root's default named the
    flyers; walkers are never stopped by terrain either).
15. **Deep Winter Snow and the Shatter threshold are public,** although they
    reveal one researched technology each: they are on the board, and the
    opponent's previews need them.
16. **A hidden Witch's Blizzard interrupts a Move** like unseen zone of
    control, and a combat preview near unexplored tiles carries
    `hiddenBlizzardPossible`.
17. **Cold Snap targets only visible units** (the Wail rule), so its preview
    is exact. It and the Bolas may re-apply to a unit that is already
    Chilled.
18. **The Blizzard halves only the primary hit of an attack from distance 2
    or more:** not retaliation, splash on other units, Wail, blasts, or
    Plague.
19. **Sweep hits the two ring neighbours of the target,** hostile units
    only, is listed in the preview's splash entries, and never shatters.
20. **Trample has its own reason** (`TRAMPLE`), and the Field Defense still
    counts for the exchange that tramples it.
21. **The Mammoth may attack after moving** (the second draft's table), and
    neither it nor the Yeti builds Field Defense.
22. **Boulders use the Charge! convention:** fortification 0 for the damage
    and the retaliation, cover kept, Walls not destroyed.
23. **Tend Wounded sets a Chill entry to thawing** instead of removing it,
    so that being cured never makes the next Chill slower.
24. **Substitutions:** one starting Yeti, a Militia of one Yeti, the Frost
    Giant as the level-5 reward, and the Sled as the treasure unit (root
    ruling 6).
25. **The Cold Aura runs after the Shield recharge and before Plague.**
26. **The Witch's unlock is `WITCH_SUPPORT`;** she has no Rally and no Tend
    Wounded.
27. **Coarse balance uses about 20 to 40 decided games per opponent on Dry
    Land** (root ruling 8) and
    the thresholds of [section 16.4](#164-balance-acceptance).

### 17.3 Deferred: the floe

The user's hint was that the Ice Folk "freeze water into walkable ice". The
root deferred it: **it is not in the first implementation,** and the Ice Folk
use the ordinary boats. Nothing in this contract depends on it, and the
faction is complete on Dry Land, where balance is measured.

The design on file, for a later revision: Shallow Water within 1 of a
land-form Ice Witch is ice that any land-form unit of any player may enter
and stand on; boats may not enter it; at the end of every player's turn each
land-form unit on Shallow Water that is not within 1 of a Witch becomes
embarked there. It is derived from the same aura and stores nothing. It
breaks the engine's rule that only afloat forms stand on water tiles, which
is why it waits. The `blizzard` tile flag already covers water tiles, so the
UI will not need a new shape for it.

### 17.4 Questions for the root

The eight questions raised by this contract were answered by the root; the
answers are in [section 17.5](#175-root-rulings).

### 17.5 Root rulings

The root ruled on the questions of section 17.4 on 2026-10-02. The rules
text above already follows these rulings.

1. **The thawing turn** (deviation 1) is accepted as specified in
   [section 5.4](#54-duration-and-re-application).
2. **Charge and Shatter is kept:** a charging Sled or a Sabretooth shatters
   a full-HP Chilled Fighter, Skeleton, or Grunt. It is a watch item for
   `pulp_wars-7g3.7`, with the lever of [section 16.3](#163-tuning-bounds)
   listed.
3. **The Mammoth stays at 20 HP;** 22 HP is the first balance lever.
4. **Mirror matches: Snow is per faction, the Blizzard's halving per seat.**
   Any Ice Folk unit gets the Ice Folk benefits on any Snow, whoever's
   territory or Witch made it, and any other faction's unit gets the
   penalties; a Witch's ranged-damage halving protects only units of her own
   seat, so enemy Ice Folk shooting into her Blizzard are still halved and her
   aura never protects an enemy. The rule is stated once, in
   [section 6.3](#63-the-blizzard).
5. **Deep Winter and Brittle becoming visible to opponents is accepted:**
   their effects are on the board anyway.
6. **The treasure unit is the Sled** (the `RAIDER` role, like the Raptor and
   the Saucer), not the Sabretooth ([section 10.12](#1012-starting-units-rewards-and-treasure)).
7. **A shattered Bitten unit still rises:** accepted.
8. **Balance sample:** about 20 to 40 decided games per opponent on Dry
   Land, coarse, as the balance policy says.

In addition, the Mountain-entry helper is the Martian `canEnterTerrainV7`
(on `main` since commit `d88503c`) extended with Mountain-born, not a
parallel helper ([sections 7.1](#71-mountain-born) and
[15](#15-implementation-split-and-test-expectations)).

## 18. Concerns

1. **The numbers were computed against a registry that will change.** The
   Martian units are on paper, and revision 20's Human tuning record is
   still empty. The per-unit numbers must be re-run at the start of
   `pulp_wars-7g3.3` ([section 15](#15-implementation-split-and-test-expectations)).
2. **Dinosaurs.** They win 66% overall under the campaign AI. Cavemen beat
   Yetis abroad, a Raptor with two Cavemen takes the home opening in round 3
   in the model, and a T-Rex is nearly never shattered. This is the pairing
   most likely to leave 70 to 30.
3. **Humans.** The home opening holds waves a Human opening does not, with
   no technology, and Humans are the weakest faction today. On Highlands,
   Rockfall and ridge routes add to it. The named lever is the home cover.
4. **Shatter may be rare without the right units.** Against plain Fighters
   and Skeletons it needs a Mammoth's flank, a charging Sled, or a
   Sabretooth; with Yetis and a Witch alone it fires about once in seven
   fight turns. If the AI does not field Mammoths and Sleds, the faction is
   Fighters with Snow.
5. **The faction leans on its AI.** A Witch left behind, a Sled that never
   throws, Yetis that hit in the wrong order, or a wave that splits at a
   ridge make it play like Humans without Field Defense. None of the rules
   it needs is how the policy plays other factions.
6. **Two engine-wide refactors.** The sluggish helper touches about 64 reads
   and the Mountain helper about 53, in the reducer, the queries, the AI,
   and the DOM. They must land first, alone, and behaviour-neutral, with a
   test per caller. The Mountain helper is the Martian `canEnterTerrainV7`
   (now on `main`, commit `d88503c`) extended, not a parallel one
   ([section 7.1](#71-mountain-born)).
7. **Derived Snow is read everywhere.** Movement cost, the stop test, cover,
   previews, threat maps, and the renderer all ask for it, and it changes
   when a Witch moves or dies in the middle of a turn. It must never be
   cached across commands, and its cost on large boards (a predicate over
   cities and Witches per tile) is checked by the public-planning
   benchmarks.
8. **A hidden Witch makes one preview inexact.** The flag
   `hiddenBlizzardPossible` is honest but new for combat previews; the AI
   must not treat a flagged preview as exact.
9. **Public Snow and thresholds leak research** (Deep Winter, Brittle). It
   is small and deliberate.
10. **Range that depends on the tile** (Rockfall) is new: legality, the
    threatened-tiles query, and the AI's reach estimates read a role
    constant today. Only the Yeti has it.
11. **Chill is a second per-unit status next to Plague, Bitten, Shields,
    Cooling, and growth.** The unit info panel and the markers are getting
    crowded; the UI bead must check a Frozen, Plagued, Bitten, Big unit.
12. **Frost may read as doing nothing** in a standing brawl, where it only
    enables Shatter. The lever is named (a Chilled unit exerts no zone of
    control).
13. **Tier-3 units will be rare in Normal matches** (the Boulder Yeti, the
    Sabretooth, Brittle), as for every faction. The only job that waits for
    tier 3 is ignoring Walls; before it, Walls are answered by Trample and
    by Shatter on the last 3 HP.
14. **The mirror** has both sides in cover on each other's Snow and both
    shattering. It may be slow; it is not measured.
15. **Fixture churn.** The identity, two command kinds, one event kind, and
    the preview fields change nearly every pinned hash and the release
    corpus, right after the Martian revision did the same.
16. **The line model is crude.** It has no map, no movement, and no sluggish
    turn, so it cannot see the first strike, which is half of what frost is
    for. It ranks designs; it cannot stand in for the matrix.

## 19. Implementation notes (`pulp_wars-7g3.3`)

### 19.1 The re-run before coding (section 15, first step)

The scratch analysis of [section 9](#9-per-unit-battle-analysis) was re-run
twice: against the registry of commit `643c618` (the Martian engine of
`d88503c` in force, identity 7r22) before any Ice Folk number was coded, and
against `d65079c` (revision 20's sturdiness numbers of `pulp_wars-0hi.3`,
identity 7r23) after the work was rebased onto it.

- **Martian units from the engine.** The 24 existing units the analysis
  uses are unchanged, and the engine's Martian roster equals the paper
  values the tables used. Every regenerated output (per-unit tables, the
  document tables, the Shatter counts, the line model, the variants, the
  waves, and the worked examples) is byte-identical: **no verdict, counter
  count, Shatter figure, or pressure result flips, and no Ice Folk number
  was changed.**
- **Formula check.** 14,208 exchanges between units of all five existing
  factions (Martians with full Shields and full-power rays) against
  `calculateCombatPreviewV7`: 0 mismatches, at 7r22 and again at 7r23.
- **Martian units the tables left out** (Saucer, Brain, Mothership,
  Colossus, and half-power rays). A full-power Tripod or Colossus shot kills
  a Yeti, Sled, Snow Hunter, Witch, or Boulder Yeti in one hit (two beside a
  Witch, whose Blizzard halves it). A Mammoth shatters a Chilled Saucer, Ray
  Gunner, or Brain at full HP; a charging Sled or a Sabretooth shatters a
  Chilled Grunt at full HP.
- **Revision 20's sturdiness numbers (7r23) move the Human rows.** The
  model sees only HP, Attack, and Defense, so the rows of the 12-HP Human
  Fighter now read as the 12-HP Caveman's did, and the 10-HP Caveman's as
  the old Fighter's. Five Yetis on Snow no longer beat five Fighters
  either way (10 / 8 when the Yetis strike first, 8 / 10 when they are
  attacked; [section 9.11](#911-skirmishes)). Two Yetis on home Snow now
  fall to three Fighters every second round (round 5), as a two-Fighter
  opening does; they still hold two Fighters every second round, and now
  also hold three Cavemen every second round
  ([section 9.12](#912-early-pressure); a Raptor with two Cavemen still
  breaks them in round 3). Shatter at full HP of a Chilled target changes
  too: a Yeti with Brittle no longer shatters a Marksman; a Mammoth
  (threshold 3) no longer shatters a Marksman, and with Brittle it
  shatters a Caveman and no longer a Fighter; a charging Sled or a
  Sabretooth (threshold 3) shatters a Marksman, a Caveman, a Raptor, or a
  Grunt, and no longer a Fighter (in the open or on Field Defense); a Frost
  Giant also shatters a Fighter on Field Defense. **No Ice Folk number
  was changed for this:** the Human numbers are a separate revision, and
  the matrix of `pulp_wars-7g3.7` decides. [Concern 3](#18-concerns)
  (the Human matchup) is weaker than written.

The scripts and outputs are in the same session scratch space as the
directory named in [section 9.1](#91-method), under `7g33/step0/` (`eng/out`
at 7r23, `eng/out-7r22` at 7r22).

### 19.2 Order of the work

The two engine-wide refactors landed first and alone
([section 15](#15-implementation-split-and-test-expectations)):
`unitMayActAfterMoveV7` (with `primaryActionBlockedAfterMoveV7` and
`sluggishUnitMovedV7`) replaces every read of the role flag for a concrete
unit in the reducer, the queries, and the Normal AI; and Mountain-born is
an input of `canEnterTerrainV7` and of the new `terrainStopsMoveV7`, with
`unitMayEnterMountainV7` for the remaining unit-entry tests. Before any Ice
Folk rule, 44 matches (every faction, including Martian Showcase and mirror
matches) were compared step by step against `643c618`: 29,429 steps with
identical commands, events, states, views, and offered commands. Source
audits in `tests/unit/ruleset-v7-ice-folk-helpers.test.ts` pin the
remaining reads.

### 19.3 Deviations and precise readings

1. **Tile flags in the type.** `snow` and `blizzard` are optional in
   `PlayerTileViewV7` so that hand-built art-review scenes need not spell
   them out. `viewForV7` always sets both on an explored tile, and readers
   test `=== true`.
2. **Interruption reason.** When a Move steps into a Blizzard the viewer did
   not know of and the step is also a zone-of-control stop, the
   interruption reports `SNOW`.
3. **`inBlizzard`** in the `iceFolk` stat block is the Blizzard the reader
   knows of (the view's flag), like the other position-dependent stats.
4. **Attack modifier rows.** `PLANTED` is an Attack modifier source.
   Rockfall and Cold Blood depend on the target (its distance, its Chill),
   so they are not stat rows: they are the combat-preview flags
   `rockfallApplied` and `coldBloodApplied`. The source literals `ROCKFALL`
   and `COLD_BLOOD` are declared but not emitted.
5. **Snow cover as a source.** On a snowy Forest or Mountain the cover row
   reads `SNOW` (the multiplier is the same and not cumulative).
6. **A public Wail preview** reads Snow cover from the view's flags; a
   hidden Witch's Blizzard can make it inexact, and it carries no flag.
7. **Sluggish units.** Besides the [section 5.3](#53-sluggish-move-or-act-not-both)
   table, a sluggish Goblin that moved cannot Kaboom and a sluggish Raider
   that moved cannot Pillage (both are primary actions).
8. **The Sabretooth's foreign centers** are also refused when a city reward
   displaces it, not only for `MOVE`, `DISEMBARK`, and the advance.
9. **Headless telemetry** recomputes Snow cover and Blizzard savings with
   internal combat options that leave out one rule (`ignoreSnowCover`,
   `ignoreBlizzard`, `ignoreShatter`); the public option is only
   `assumeTargetChilled`.
10. **Worked examples at 7r23 HP.** The tests of
    [section 5.6](#56-worked-examples) keep each example's numbers by
    substituting a unit with the HP the example assumed: the 12-HP Human
    Fighter for the 12-HP Caveman, the 10-HP Caveman for the 10-HP Fighter,
    the 10-HP Spitter for the Marksman, and a 17-HP Guard at 15 HP for the
    15-HP Guard; a Fighter on Field Defense now has 12 HP and is shattered
    by the second Yeti hit from 8 HP (would leave 3).
11. **Rift.** There is no Rift terrain yet; "no Snow on a Rift" has no
    test and goes to the Rift bead.

### 19.4 Left to the following beads

- **`pulp_wars-7g3.4` (AI).** The generic policy plays an Ice Folk seat
  without errors or stalls on Dry Land, Pangea, Continents, Lakes, and
  Archipelago against every faction and in the mirror, and never issues
  `THROW_BOLAS` or `COLD_SNAP` (so Chill comes only from the Frost Giant).
  Its threat and route estimates know Mountain-born (through the shared
  terrain rules) but not Glide, deep snow, or Prowl, and it infers another
  seat's Engineering from units standing on Mountains, which a
  Mountain-born Yeti makes wrong. **Done** in `pulp_wars-7g3.4`
  ([section 12.1](#121-implementation-status-pulp_wars-7g34)).
- **`pulp_wars-7g3.6` (UI).** Nothing Ice Folk is drawn or offered; the art
  of `pulp_wars-7g3.5` is checked in but not wired. (Done since:
  [section 20](#20-ui-implementation-notes-pulp_wars-7g36).)
- **`pulp_wars-7g3.7` (balance).** The balance matrix has no Ice Folk
  pairing yet; the headless result carries the `iceFolk` telemetry block
  ([headless simulation](../architecture/HEADLESS_SIMULATION.md#ice-folk-seats-pulp_wars-7g33)).
- **Release corpus.** The identity change invalidates the checked release
  corpus; its reviewed refresh is the root's gate.

## 20. UI implementation notes (`pulp_wars-7g3.6`)

The UI implements section 13 as the
[Screen Flow Ice Folk overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-ice-folk-overlay)
describes, with the production art of
[the Ice Folk fragment](../art/factions/ICE_FOLK.md) (whose
[decisions of the UI bead](../art/factions/ICE_FOLK.md#decisions-of-the-ui-bead)
record the presentation choices). It reads only the public view, the
public unit stats, the public previews and projected events (the
[client architecture](../architecture/CLIENT_ARCHITECTURE.md#ice-folk-presentation-pulp_wars-7g36)
lists them); no rule is recomputed. Precise readings of this section:

1. **Texts.** The table of section 13.2 is followed as written: the attack
   preview says "Shatters" (in place of the damage line) and "Chilled" on
   the defender; "Sweep: {unit} {n} damage" counts the HP and Shield damage
   of the flank hit, like Pierce, and adds "(Shield absorbs N)" and
   ", lethal" where they apply.
2. **The Frosted threshold** shown to a viewer is that of the Ice Folk seats
   hostile to the unit's owner, as far as the viewer knows it: its own
   technologies, or the public `shatterThreshold` of their visible units,
   else `SHATTER_HP_V7`.
3. **Sluggish actions.** The engine withholds every primary action of a
   Frozen unit that moved; the dock shows one disabled "Act" with "Frozen:
   it moved, so it cannot act this turn" (and a Sled's Bolas reads
   "Frozen: it moved").
4. **The faction badge** of the Classic look and LEGACY is a snow-capped
   peak rather than a snowflake, so that it is never read as the Frosted
   glyph (section 13.1 asks that the markers not be confused).
5. **Cold Aura** pulses from the `UNITS_CHILLED` event of source
   `COLD_AURA` (the Giant's eight tiles flash, frost forms on each target);
   a Shatter is presented from the `COMBAT_RESOLVED` preview's `shatters`.
