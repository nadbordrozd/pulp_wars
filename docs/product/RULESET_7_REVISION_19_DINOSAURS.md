# Ruleset 7 revision 19: Dinosaur faction

**Any unit can capture** (`pulp_wars-ke95`, user direction 2026-10-09):
every land unit of every faction now has `CAPTURE`, so wherever this
document says a unit has no capture, cannot capture, or lists the
capture-capable units, read that every land unit captures under the
ordinary capture rule. Flyers (Saucer, Mothership, Gyrocopter) and the
Prowling Sabretooth included: wherever this document says a flyer or a
Sabretooth never ends a Move, lands, or advances on a village or a foreign
center, read that it may, and then besieges and captures like any land
unit (only a Dwarf rider on its surfacing turn still avoids foreign
centers). Boats, Eggs, embarked and burrowed units, and neutral
curiosities still never capture. See
[current rules section 4.7](RULESET_7_CURRENT.md#47-siege-and-capture).

**The Dinosaur pass** (`pulp_wars-w49.15`, `pulp-wars-poc-7r53`,
[its record](RULESET_7_TUNING_DINOSAUR.md)) changed rules of this
document; the current rules win where this text differs. **The Caveman
has Pack Hunt**: +1 Attack on its own attack against a unit next to one
of its owner's hatched dinosaurs (this document gives it Fighter parity
in attack). **A Dinosaur city's Survey is Scouts**, with a free Raptor,
hatched. **A Dinosaur Market hires a dinosaur, hatched**, with Commerce.
A Dinosaur seat of the Normal AI plays the army rules in a match of
Humans, Goblins, Undead, Martians, and Dinosaurs. **Its correction:**
Nesting takes no turn off the hatch; a Shaman's Tend Wounded heals a
hatched dinosaur 4; Pack Hunt also applies against a unit one of the
player's dinosaurs attacked this turn (the state list `huntedThisTurn`);
Sawmilling is displayed as Timber.

**Status:** implemented (`pulp_wars-c87.2`–`c87.8`), amended by
[revision 20](RULESET_7_REVISION_20.md), and **folded into
[Ruleset 7: current rules](RULESET_7_CURRENT.md) (kept as history)** by
`pulp_wars-c87.9` at `pulp-wars-poc-7r23`. The current rules describe the
running four-faction game, with the Dinosaurs in their section 19, and win
wherever this document differs. This contract (`pulp_wars-c87.1`) remains as
design history, decision provenance, and exact schema detail. The fold's
corrections of this text are listed in the current rules' revision history.

> **Amended by revision 20.** [Ruleset 7 revision 20](RULESET_7_REVISION_20.md)
> (`pulp_wars-0hi.2`) removes the Stampede command (the Triceratops has a
> passive Charge! instead), changes the Triceratops and T-Rex numbers, adds a
> city slot to Nesting and the Wallbreaker technology, and makes a Promotion
> or a growth stage fully heal. The sections it replaces are marked
> "Superseded by revision 20" below; their text is kept as the record of
> revision 19. `pulp_wars-0hi.3` (`pulp-wars-poc-7r23`) set the Caveman back
> to 10 HP.

**Ruleset ID:** `pulp-wars-poc-7r19`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (unchanged; faction
choice never affects generation)

**Scope:** a fourth playable faction, `DINOSAUR`. The overlay changes only
identity, faction registration, setup, the Dinosaur roster, the Dinosaur
faction rules (Eggs, capacity slots, Grow, the Field Defense restriction and
Nesting), the Triceratops Stampede, the small abilities Acid, Armoured, and
Hatch, the Dinosaur substitutions for the starting unit, rewards, and
treasure, and the commands, events, queries, UI, and Normal AI needed to play
them. Every unmentioned revision-18 rule stays in force for every faction.
Rulesets 5 and 6 and historical Ruleset 7 fixtures remain frozen.

**Identity of the faction:** Humans are sustain, Undead are attrition,
Goblins are a reckless horde, and Dinosaurs are **few, big, and growing**:
cavemen lead a small number of strong beasts that are laid as Eggs next to a
city, take up more room, grow when they kill, and break lines by stampeding.
Their weaknesses are the Egg (a fragile, immobile target for one or more
turns), low unit counts, and no Field Defense. Economy, the technology graph,
map rules, and naval units are the Human ones. Every Dinosaur rule is visible
on the board and fits in one sentence ([section 12.3](#123-help-text)).

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. Sources and decided direction

The user's direction of 2026-10-01 (epic `pulp_wars-c87`): a Dinosaur faction
of cavemen and dinosaurs, planned and implemented end to end, tuned until the
balance is roughly right, with PixelLab sprites in the style of the other
factions. The root holds full judgement authority.

These user decisions are rules of this contract and are not reopened here:

| #   | User decision                                                                                                                                                     | Where                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| U1  | "fewer stronger units and laying eggs"                                                                                                                            | [sections 5.1](#51-big-bodies-capacity-slots) and [6](#6-eggs)                    |
| U2  | The faction must have something producible from early on.                                                                                                         | Caveman at the start, Raptor Eggs with Scouting ([section 3](#3-dinosaur-roster)) |
| U3  | "consider giving some unit a trample ability where it runs over 1 or 2 tiles and attacks whoever is on the destination tile, filling the same role catapult does" | [section 7](#7-stampede)                                                          |
| U4  | "1 or 2 more small abilities for individual units"                                                                                                                | [section 8](#8-small-abilities)                                                   |
| U5  | Balance must be roughly right: not too strong, not too weak.                                                                                                      | [section 15](#15-tuning-bounds-measurement-and-balance-acceptance)                |
| U6  | The same art style as the previous factions ([art fragment](../art/factions/DINOSAUR.md)).                                                                        | [section 12.4](#124-placeholder-and-final-art)                                    |

The root design brief (the notes of `pulp_wars-c87.1`) is authoritative for
intent. Its six pillars map to this document as follows: Eggs
([section 6](#6-eggs)), big bodies ([5.1](#51-big-bodies-capacity-slots)),
Grow ([5.2](#52-grow)), Wild and Nesting ([5.3](#53-wild-no-field-defense)
and [6.6](#66-nesting)), Stampede ([section 7](#7-stampede)), and the small
abilities ([section 8](#8-small-abilities)). Where the brief left a choice
this document decides it; every such decision is listed in
[section 16](#16-decisions-made-in-this-spec). Conflicts with the engine and
the root decisions on them are in
[section 17](#17-concerns-and-root-decisions).

## 2. Identity, factions, and compatibility

### 2.1 Identity

| Boundary                                   | Revision-19 value                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r19`                                                                        |
| Game-state schema                          | `7`                                                                                         |
| Command/event/save/replay numeric versions | `7`                                                                                         |
| Browser autosave                           | `pulpWars.save.v7r19.current`                                                               |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                                                  |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`                                                  |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`, `GOBLIN_BASELINE_V1`, `DINOSAUR_BASELINE_V1`  |
| Faction to tree binding                    | the three existing bindings, plus `DINOSAUR` → `DINOSAUR_BASELINE_V1`                       |
| Display names                              | `ORIGINAL` is "Human"; `UNDEAD` is "Undead"; `GOBLIN` is "Goblin"; `DINOSAUR` is "Dinosaur" |

- `pulp-wars-poc-7r18` is appended to `PRIOR_RULESET_7_IDS` (the list stays
  gap-free). A revision-19 reader rejects it and every earlier Ruleset 7
  identity in setups, states, saves, replays, and release artifacts; there is
  no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r18.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-c87.2`, which also fixes every
  serialized **shape** of this revision (below). Later beads (`c87.3` Eggs
  and Stampede, `c87.4` UI, `c87.5` AI, `c87.8` tuning) change rules and
  behaviour under the same identity; revision 19 is complete when
  `pulp_wars-c87.9` lands (the revision-14, 16, and 17 precedent).
- **Shape changes** (all with neutral values in a match without a Dinosaur
  seat):
  - `UnitStateV7.form` and the public unit form gain the literal `EGG`;
  - `GameStateV7` gains `eggs`, and `PlayerViewV7` gains `eggs`
    ([section 6.1](#61-representation));
  - three commands, three events, one `UNIT_DIED` cause, one
    `noRetaliationReason`, three error codes, four combat-preview fields, and
    the `dinosaur` block of the public unit stats
    ([section 10](#10-commands-events-errors-and-queries)).
- No other state key is added. Growth is derived from the existing `kills`
  and `maxHp` unit fields ([section 5.2](#52-grow)); capacity slots, Acid,
  and Armoured are registration values.

### 2.2 Setup

- `MatchSetupV7.factions` stays a dense per-seat array; each entry is
  `ORIGINAL`, `UNDEAD`, `GOBLIN`, or `DINOSAUR`, and every combination is
  legal.
- Faction choice still never affects map generation, capital placement, turn
  order, treasure placement, or any PRNG draw: setups that differ only in
  `factions` generate byte-identical boards, turn orders, and treasures.
- **Starting units.** A Dinosaur seat starts with one Caveman (the `FIGHTER`
  role) on its capital, 5 Coins, and no technology, exactly like every other
  seat (`STARTING_FIGHTERS_V7` is 1). It starts with no Egg.
- The headless tools accept `dinosaur` in `--factions` (seat-ordered, next to
  `original`/`human`, `undead`, and `goblin`).

### 2.3 Faction model

Revision 19 follows the revision-13 model: the frozen mechanical role order
is unchanged, state and events serialize the mechanical role, and every rule,
view, preview, UI surface, and AI decision resolves a unit through its
**owner's** registration with no cross-faction fallback.

- **Living.** Dinosaur-faction units are living (their owner's faction is not
  `UNDEAD`), so Wail, Plague, and Bitten affect them exactly as they affect
  Human units. Eggs are the exception stated in
  [section 6.2](#62-what-an-egg-is).
- **Dinosaur units** are the Dinosaur registration's `RAIDER`, `MARKSMAN`,
  `GUARD`, `CATAPULT`, `KNIGHT`, and `JUGGERNAUT` roles: Raptor, Spitter,
  Ankylosaurus, Triceratops, T-Rex, and Brontosaurus. They grow
  ([section 5.2](#52-grow)). The term never includes the Caveman, the
  Shaman, or the boats; "Dinosaur-faction units" means every unit of a
  Dinosaur seat.
- **Egg-laid roles** are the five trainable Dinosaur units: `RAIDER`,
  `MARKSMAN`, `GUARD`, `CATAPULT`, and `KNIGHT`. They are laid as Eggs, never
  trained ([section 6.3](#63-laying-an-egg)).
- **Cavemen** are the `FIGHTER` and `CAPTAIN` roles (Caveman and Shaman).
  They are trained on the city center like Human units and keep the ordinary
  Promotion.

| Mechanical role | Human (`ORIGINAL`) | Undead (`UNDEAD`) | Goblin (`GOBLIN`) | Dinosaur (`DINOSAUR`) |
| --------------- | ------------------ | ----------------- | ----------------- | --------------------- |
| `FIGHTER`       | Fighter            | Skeleton          | Goblin            | Caveman               |
| `RAIDER`        | Raider             | Ghoul             | Wolf Rider        | Raptor                |
| `MARKSMAN`      | Marksman           | Banshee           | Bomb Chucker      | Spitter               |
| `GUARD`         | Guard              | Zombie            | Orc Brute         | Ankylosaurus          |
| `CAPTAIN`       | Captain            | Necromancer       | Orc Warboss       | Shaman                |
| `CATAPULT`      | Catapult           | Lich              | Rocket Cart       | Triceratops           |
| `KNIGHT`        | Knight             | Vampire           | Scrap Buggy       | T-Rex                 |
| `JUGGERNAUT`    | Juggernaut         | Abomination       | Troll             | Brontosaurus          |
| `PATROL_BOAT`   | Patrol Boat        | Patrol Boat       | Patrol Boat       | Patrol Boat           |
| `BATTLESHIP`    | Battleship         | Battleship        | Battleship        | Battleship            |

### 2.4 Showcase

A `SHOWCASE` setup ([current rules section 2.5](RULESET_7_CURRENT.md#25-showcase-setup))
accepts a Dinosaur seat with no board change: the same strips, cities,
ledger, unit tiles, forms, homes, and entity IDs as any other faction.

- The ten units are the Dinosaur roster's, one per role, all **hatched** (no
  Egg exists at setup), at full HP with zero kills, so every Dinosaur unit
  starts at growth stage 0 ([section 5.2](#52-grow)).
- All 23 technologies are researched, so `FORTIFICATION` (Nesting) applies to
  every Egg the seat lays.
- First income is the Human one (16 Coins; land trade applies).
- **Capacity.** The homes are unchanged, so with 2-slot units the Dinosaur
  capital starts at 7 of 7 slots (Caveman 1, Shaman 1, Triceratops 1, T-Rex
  2, Brontosaurus 2), North at 3 of 6, and Coast at 2 of 5. Showcase creation
  performs no capacity check; the capital simply cannot train or lay until a
  slot frees, and North and Coast can lay every Egg from the first turn.
  (With the contract's two-slot Triceratops the capital started at 8 of 7;
  [section 15.4](#154-tuning-record-pulp_wars-c878).)

## 3. Dinosaur roster

> **Superseded by revision 20.** The Triceratops and T-Rex rows, the Triceratops
> bullet, and the ability list are replaced by
> [revision 20 sections 2.1 and 3](RULESET_7_REVISION_20.md#21-stats): the
> Triceratops moves 2, attacks after moving, and has `LINEBREAKER` (Charge!)
> instead of `STAMPEDE`; the T-Rex costs 14 and hatches in 4 turns.

Tactical-role metadata equals that of the same mechanical role. "Hatch" is
the Egg's hatch time in owner Start Turns ([section 6.4](#64-hatching));
"Slots" is the capacity the unit, or its Egg, uses
([section 5.1](#51-big-bodies-capacity-slots)).

| Unit         | Role          | Tech              | Cost | Hatch   | Slots |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Grows | Abilities                      |
| ------------ | ------------- | ----------------- | ---: | ------- | ----: | --: | -----------------: | -------------------: | ---: | ----: | ----: | ----------------- | ------- | ----- | ------------------------------ |
| Caveman      | `FIGHTER`     | start             |    2 | trained |     1 |  10 |              2 (4) |                2 (4) |    1 |     1 |     1 | yes               | yes     | no    | no Field Defense               |
| Raptor       | `RAIDER`      | Scouting          |    4 | 1       |     1 |  12 |            2.5 (5) |                1 (2) |    2 |     1 |     2 | yes               | yes     | yes   | Pounce (Raiding); no Escape    |
| Spitter      | `MARKSMAN`    | Marksmanship      |    4 | 1       |     1 |  10 |              2 (4) |                1 (2) |    1 |   1–2 |    1¹ | yes               | yes     | yes   | Acid                           |
| Ankylosaurus | `GUARD`       | Drill             |    5 | 2       |     1 |  20 |              2 (4) |                3 (6) |    1 |     1 |     1 | no                | yes     | yes   | Armoured; no Field Defense     |
| Shaman       | `CAPTAIN`     | Administration    |    5 | trained |     1 |  10 |              1 (2) |                1 (2) |    1 |     1 |     1 | yes               | no      | no    | War Drums; Tend Wounded; Hatch |
| Triceratops  | `CATAPULT`    | Sawmilling        |    8 | 1       |     1 |  18 |              3 (6) |                2 (4) |    1 |     1 |     1 | no                | no      | yes   | Stampede                       |
| T-Rex        | `KNIGHT`      | Chivalry          |   10 | 3       |     2 |  28 |              4 (8) |                2 (4) |    2 |     1 |     1 | yes               | no      | yes   | Rampage                        |
| Brontosaurus | `JUGGERNAUT`  | reward only       |    — | —       |     2 |  45 |            3.5 (7) |                4 (8) |    1 |     1 |     1 | yes               | yes     | yes   | Push                           |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 | trained |     1 |  10 |              2 (4) |                2 (4) |    2 |     1 |     2 | yes               | no      | no    | naval                          |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 | trained |     1 |  25 |             6 (12) |                4 (8) |    2 |   1–3 |     3 | no                | no      | no    | naval; splash                  |

¹ Spitter Sight becomes 2 with Fieldcraft.

The table holds the tuned values of `pulp_wars-c87.8`
([section 15.4](#154-tuning-record-pulp_wars-c878)): the contract had the
Caveman at 10 HP and the Triceratops at hatch time 2 and 2 slots. The
Caveman is at 10 HP again since `pulp_wars-0hi.3`
([revision 20 section 6.3](RULESET_7_REVISION_20.md#63-tuning-record); c87.8
had it at 12).

- **Caveman** has Fighter parity (capture, Pillage with Raiding, Disband,
  ordinary Promotion) except for its own HP (10; 15 when promoted) and that it
  cannot build Field Defense ([section 5.3](#53-wild-no-field-defense)). It is
  trained on the city center with `TRAIN`, so a Dinosaur seat can always
  produce a unit from the first turn.
- **Raptor** has Raider parity for Move 2, Sight 2 (Scouting), Charge
  (Raiding), labelled **Pounce**, Pillage, capture, and Fieldcraft Forest
  freedom. It has no Escape.
- **Spitter** has Marksman parity (range 1–2, minimum range 1, capture,
  Pillage, Disband, Fieldcraft Forest freedom and Sight) and Acid
  ([section 8.1](#81-acid-spitter)).
- **Ankylosaurus** has Guard parity for "cannot attack after moving" and
  capture. It cannot build Field Defense and is Armoured
  ([section 8.2](#82-armoured-ankylosaurus)).
- **Shaman** has exact Captain parity: it cannot capture, and its primary
  actions are Attack, Rally (labelled **War Drums**; same command, flag, and
  event), and Tend Wounded. It adds Hatch ([section 6.5](#65-shaman-hatch)).
- **Triceratops** is a melee unit (range 1, minimum range 1) that cannot
  attack after moving and cannot capture. Its primary actions are an ordinary
  adjacent Attack and Stampede ([section 7](#7-stampede)). Unlike the
  Catapult it advances after an ordinary melee kill. Every Triceratops attack
  destroys Field Defense on the target tile (reason `CATAPULT`).
- **T-Rex** has Knight parity (no capture, Overrun) with Move 2 instead of 3.
  Overrun is labelled **Rampage** for Dinosaurs (same rule and events). A
  T-Rex is never a treasure unit ([section 9.8](#98-starting-units-rewards-and-treasure)).
- **Brontosaurus** has Juggernaut parity (reward only, Push, capture, no
  Pillage or Disband) with 45 HP and Attack 3.5.
- **Patrol Boat and Battleship** are identical to the Human units: names,
  stats, abilities, and art. Dinosaur faction rules do not apply to them:
  they are trained with `TRAIN_NAVAL`, use 1 slot, do not grow, and keep the
  ordinary Promotion.
- **Disband refunds** are `floor(cost / 2)` as usual: Caveman 1, Raptor,
  Spitter, Ankylosaurus, and Shaman 2, Triceratops 4, T-Rex 5. An Egg refunds
  the same amount as the unit inside
  ([section 6.7](#67-destruction-capture-and-disband)).
- An **embarked** Dinosaur-faction land unit follows the ordinary embarked
  rules (Move 2, Defense 1, Sight 1, no Attack, no retaliation, no ZOC, no
  Stampede, no Hatch). It keeps its slots and its growth.
- **Public abilities** (the role rule's `abilities` list): Caveman `ATTACK`,
  `CAPTURE`; Raptor `ATTACK`, `CAPTURE`, `CHARGE`, `GROW`; Spitter `ATTACK`,
  `CAPTURE`, `ACID`, `GROW`; Ankylosaurus `ATTACK`, `CAPTURE`, `ARMOURED`,
  `GROW`; Shaman `ATTACK`, `RALLY`, `TEND_WOUNDED`, `HATCH`; Triceratops
  `ATTACK`, `STAMPEDE`, `GROW`; T-Rex `ATTACK`, `OVERRUN`, `GROW`;
  Brontosaurus `ATTACK`, `CAPTURE`, `PUSH`, `GROW`; boats `ATTACK`. Slots,
  hatch times, the Stampede run bonus, and the Armoured reduction are role
  mechanics exposed through public unit stats
  ([section 10](#10-commands-events-errors-and-queries)).

## 4. Technology

> **Superseded by revision 20.** The Sawmilling, Fortification (Nesting), and
> Explosives (Wallbreaker) rows and the display-name overrides are replaced
> by [revision 20 section 4](RULESET_7_REVISION_20.md#4-dinosaur-industry-branch).

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rule, and every other unlock of `DINOSAUR_BASELINE_V1` are identical to
`ORIGINAL_BASELINE_V5` ([current rules section 6](RULESET_7_CURRENT.md#6-technology)).
The technology IDs are unchanged. The Dinosaur registration differs in one
unlock entry and one display name:

- `FORTIFICATION` is displayed as **Nesting** to a Dinosaur viewer and
  replaces `COMMAND BUILD_FIELD_DEFENSE` with
  `NESTING { eggHp: 4, hatchTurns: 1 }` ([section 6.6](#66-nesting)). It keeps
  its ID, branch (Industry), tier (2), prerequisite (Drill), and cost, and
  still leads to Explosives.
- `ADMINISTRATION` keeps `CAPTAIN_SUPPORT` (the Shaman's War Drums and Tend
  Wounded). Hatch needs no technology beyond the Shaman itself.
- `CHIVALRY` keeps its `OVERRUN` unlock (displayed as Rampage), and `RAIDING`
  keeps `CHARGE_BONUS` (displayed as Pounce).

Every other unlock object is the same mechanical value. The technology tree,
research offers, and Help render names and unlock text from the **viewer's**
faction:

| Technology     | Dinosaur name | Dinosaur unlock text                                                             |
| -------------- | ------------- | -------------------------------------------------------------------------------- |
| Administration | same          | Shaman (War Drums, Tend Wounded, Hatch); Market; Disband                         |
| Sawmilling     | same          | Sawmill; Triceratops Egg (Stampede)                                              |
| Marksmanship   | same          | Spitter Egg                                                                      |
| Fieldcraft     | same          | Replant Forest; Raptor and Spitter ignore Forest movement stops; Spitter Sight 2 |
| Scouting       | same          | Raptor Egg; Raptor Sight 2                                                       |
| Raiding        | same          | Pillage for all trainable land roles; Raptor Pounce                              |
| Chivalry       | same          | T-Rex Egg; Rampage; Cultivate Forest                                             |
| Drill          | same          | reveal Ore; Ankylosaurus Egg; first-hostile-capture Spoils (2 Coins)             |
| Metallurgy     | same          | Forge; Arms Industry (−1 Coin for trained land units and Eggs)                   |
| Fortification  | Nesting       | Eggs have +4 HP and hatch one turn sooner                                        |
| Explosives     | same          | Blast Mountain; melee Field Defense demolition (unchanged)                       |

The other technologies read the same for every faction.
`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains `DINOSAUR: { FORTIFICATION: "Nesting" }`,
resolved by the UI helper `technologyNameV7` as for the Goblin Plunder.
Nesting is read through two technology capabilities, `eggHpBonus` (0 or 4)
and `eggHatchTurnReduction` (0 or 1), never through a raw `FORTIFICATION`
test.

## 5. Faction-wide rules

Every rule in this section applies only to units and cities owned by a
`DINOSAUR` seat.

### 5.1 Big bodies: capacity slots

Every role has a **slot** value in its owner's registration (role mechanic
`capacitySlots`): 2 for the T-Rex and Brontosaurus, and 1 for
every other role of every faction.

- **Used slots** of a city are the sum of the slots of every unit on the
  board homed to it, Eggs included (an Egg uses the slots of the unit
  inside). This replaces the unit count in `assignedUnitCountV7`; for Human,
  Undead, and Goblin seats the sum equals the count.
- **Capacity** is unchanged: `level + 1`, plus 1 with Planning
  ([current rules section 4.4](RULESET_7_CURRENT.md#44-unit-capacity)).
  Dinosaur cities have no Warrens-like bonus (`cityCapacityBonus` 0), and the
  Goblin Warrens follow the city's current owner as before.
- **Gate.** `TRAIN`, `TRAIN_NAVAL`, and `LAY_EGG` need
  `used + slots(role) <= capacity`, otherwise `CITY_CAPACITY_FULL`. So a
  level-1 capital (capacity 2) holding the starting Caveman can lay a Raptor
  or a Triceratops Egg but not a T-Rex Egg.
- **Treasure.** The treasure unit ([section 9.8](#98-starting-units-rewards-and-treasure))
  needs a city with `used + slots <= capacity` under the existing city order;
  otherwise the chest gives 5 Coins.
- **Over capacity.** Reward units (a Militia Caveman, a Brontosaurus) and
  Undead risings may exceed capacity as today. A reward Brontosaurus adds 2
  used slots. Capacity loss never removes a unit or an Egg; an over-capacity
  city simply cannot train or lay until enough slots free.
- **Captured cities.** A city a Dinosaur seat captures has the ordinary
  capacity for its level. The capturing unit is re-homed to it with its own
  slots (a Brontosaurus uses 2) and may put it over capacity. A Dinosaur city
  captured by another faction has the ordinary capacity for its new owner.
- **Orphans.** Units homed to a city their owner lost are orphaned
  (`homeCityId` null) as today and use no slots anywhere. Eggs homed to a
  captured city are destroyed ([section 6.7](#67-destruction-capture-and-disband)).
- A death, Disband, or Egg destruction frees its slots at once.
- Every capacity surface (training, laying, treasure placement,
  `previewCityCapacityV7`, the city panel, the Normal AI) uses the same sum.

### 5.2 Grow

> **Superseded by revision 20.** A growth stage and a Promotion fully heal the
> unit ([revision 20 section 5](RULESET_7_REVISION_20.md#5-promotion-and-growth-fully-heal));
> Stampede kills no longer exist.

Dinosaur units grow from kills instead of the ordinary Promotion.

- **Stages.** A Dinosaur unit's growth stage is derived from its `kills`:
  stage 0 with no kill, **Big** (stage 1) from 1 kill, **Alpha** (stage 2)
  from 3 kills. There is no stage beyond Alpha.
- **Kill credit** is the existing Promotion credit, unchanged
  ([current rules section 18.9](RULESET_7_CURRENT.md#189-kill-credit-plunder-and-friendly-fire)):
  the unit's own attack kills (including Stampede kills and each Rampage
  kill), its retaliation kills, and hostile splash kills are credited; a
  victim that rises (Infect or Bitten) still counts; destroying an Egg counts;
  explosions, Plague, and kills of own or allied units credit no unit. A
  Dinosaur unit is credited only in land form, because an embarked unit
  neither attacks nor retaliates.
- **Effect.** Each stage reached adds **4 maximum HP and 4 current HP**
  (`maxHp + 4`, `hp + 4`), at the moment the kill is credited, to a unit that
  survived the exchange. Alpha also adds **+1 Attack** (+2 `attack2`) to
  every attack the unit makes from then on (ordinary attacks, Stampede, and
  Rampage continuations). A unit that crosses two thresholds in one command
  gains both stages in order.
- **Timing.** Growth is applied after the exchange's damage, Lifesteal, and
  kill credit and before the advance, Push, and any chain reaction, so a
  T-Rex that reaches Big with its first kill heals 4 and then Rampages with
  its new HP. Damage of the exchange that caused the growth is not
  recomputed.
- **Persistence.** Growth is permanent: it survives embarking, landing,
  capture of its home city, and saves, and it ends only when the unit leaves
  the board. A Dinosaur that is killed and rises (Infect or Bitten) becomes
  an ordinary Zombie of the biter's owner with no growth
  ([section 9.1](#91-undead-rules)).
- **No Promotion.** A Dinosaur unit is never `veteran`; `PROMOTE` is never
  offered for it and is rejected with `PROMOTION_NOT_ELIGIBLE`. The Caveman,
  the Shaman, and the two boats keep the ordinary Promotion (3 kills, +5 HP,
  explicit command).
- **Healing and maximum HP.** Recovery, Windmill healing, and Tend Wounded
  heal toward the unit's current `maxHp`, so a grown unit heals to its grown
  maximum. Combat uses the HP ratio `hp / maxHp` as for a promoted unit.
- **State.** No field is added. For a unit whose role has `GROW` under its
  owner's registration, state parsing requires `veteran` false and
  `maxHp = role maxHp + 4 * stage(kills)`. For every other unit the existing
  rule (`role maxHp + 5` when veteran) is unchanged.
- **Public.** `kills` and `maxHp` are already public on every visible unit,
  so the stage is public. The public unit stats carry the stage and the
  kills still needed ([section 10](#10-commands-events-errors-and-queries)),
  the HP breakdown lists "Growth" (+4 or +8), and the Attack breakdown lists
  "Alpha" (+1). The board shows a Big or Alpha unit at a larger sprite scale
  with a marker ([section 12.1](#121-surfaces)).

| Unit         | Stage 0 HP / Attack | Big HP / Attack | Alpha HP / Attack |
| ------------ | ------------------- | --------------- | ----------------- |
| Raptor       | 12 / 2.5            | 16 / 2.5        | 20 / 3.5          |
| Spitter      | 10 / 2              | 14 / 2          | 18 / 3            |
| Ankylosaurus | 20 / 2              | 24 / 2          | 28 / 3            |
| Triceratops  | 18 / 3              | 22 / 3          | 26 / 4            |
| T-Rex        | 28 / 4              | 32 / 4          | 36 / 5            |
| Brontosaurus | 45 / 3.5            | 49 / 3.5        | 53 / 4.5          |

### 5.3 Wild: no Field Defense

No unit of a Dinosaur seat builds Field Defense: `buildsFieldDefense` is
false for the Caveman and the Ankylosaurus, and the Dinosaur tree has no
`BUILD_FIELD_DEFENSE` unlock. The command is never offered to a Dinosaur seat
and is rejected like any other role that cannot build it (`INVALID_TILE` with
`action: "BUILD_FIELD_DEFENSE"`).

Field Defense that already stands in territory a Dinosaur seat captures keeps
working under the ordinary fortification rule for the Dinosaur-faction units
standing on it. Walls are unchanged: a Dinosaur city may choose the Walls
reward.

### 5.4 Recovery

Dinosaur recovery is the Human rule (4 in own territory, 2 elsewhere; naval
and embarked rules and Windmill healing unchanged). Dinosaurs are not
Restless. The Shaman's Tend Wounded heals 2 and cures Plague and Bitten
exactly like the Captain's. Eggs never heal
([section 6.2](#62-what-an-egg-is)).

## 6. Eggs

### 6.1 Representation

**An Egg is a unit with the new form `EGG`.** It is an ordinary entry of
`GameStateV7.units` with its own unit ID, `ownerId`, `homeCityId` (the laying
city), `role` (the role of the unit inside), `at`, `hp`, and `maxHp`, with
`kills` 0, `veteran` false, `captureEligible` false, and the exhausted
activation at all times. Its countdown lives in one new state list:

```text
GameStateV7.eggs: readonly { unitId, turnsRemaining, laidThisTurn }[]   // sorted by unitId
```

`laidThisTurn` is a boolean: true from `LAY_EGG` until its owner's next Start
Turn clears it ([section 6.4](#64-hatching)). It is the only fact the Shaman's
Hatch needs about when an Egg was laid ([section 6.5](#65-shaman-hatch)); a
flag cleared at Start Turn is bounded, needs no turn or round number, and
follows the activation flags, which reset the same way.

`turnsRemaining` is a positive integer: the number of its owner's Start Turns
still to come before it hatches. Hatching keeps the unit ID and changes the
form to `LAND`.

Why a unit, and why a form:

- **Schema.** Occupancy, visibility, attack targeting (`targetUnitId`),
  splash, blasts, kill credit, Plunder, home-city capacity, saves, replays,
  and hashes already work on units. A separate entity type would need a
  second copy of each of those rules and a second ID space in commands and
  events.
- **Safe defaults.** Every active ability in the engine is gated on
  `form === "LAND"` (attack, retaliation, ZOC, capture, cover, fortification,
  Rally, Tend, Kaboom, Graves, Infect, Bitten). A new form fails those gates
  by default, which is the wanted behaviour, whereas a `LAND` unit with an
  "is an Egg" flag would have to be excluded from each of them one by one.
- **Fog.** An Egg is visible exactly when a unit on its tile would be
  ([section 9.6](#96-fog-and-observation)), with no new projection rule.
- **AI.** The Normal AI already reads units, their HP, owner, and position;
  an Egg is one more target with public stats.
- **Hatching** needs no ID remap: capacity, home city, and any reference in
  the same command stay valid.
- The countdown is a side list, like `plagued` and `bitten`, so the unit
  shape itself gains no key.

The cost is that the `form` union widens. Every test of `form` in the engine,
queries, AI, and renderer must be audited, because several of them read
"not `LAND`" as "afloat" (concern 1 of
[section 17](#17-concerns-and-root-decisions)).

**State parsing** rejects: an `eggs` entry without a matching unit of form
`EGG`, or an `EGG` unit without an entry; a duplicate or unsorted entry; a
`turnsRemaining` below 1 or above the role's hatch time; a `laidThisTurn`
that is not a boolean; any Egg in a match
without a `DINOSAUR` seat; an Egg whose owner is not a Dinosaur seat, whose
role is not an egg-laid role, whose home city is missing or not owned by its
owner, or whose tile is not a land tile of its home city's territory
adjacent to that city's center; an Egg with `maxHp` other than 6 or 10,
`kills` above 0, `veteran` true, `captureEligible` true, or a non-exhausted
activation; and an Egg listed in `plagued` or `bitten`.

**View.** `PublicUnitV7.form` may be `EGG`, and `PlayerViewV7.eggs` lists
`{ unitId, turnsRemaining, laidThisTurn }` for every Egg in `units`, sorted by
unit ID.

### 6.2 What an Egg is

| Property       | Value                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| HP             | 6 (10 when laid with Nesting); `hp` and `maxHp` are stored on the unit                                                                            |
| Attack         | none: no `ATTACK`, never retaliates                                                                                                               |
| Defense        | 1 (`defense2` 2), fixed, like an embarked unit: no cover, no fortification, no Walls or Field Defense bonus                                       |
| Move, range    | 0; it never moves and cannot be pushed or displaced                                                                                               |
| Sight          | 0: an Egg reveals nothing                                                                                                                         |
| ZOC            | none                                                                                                                                              |
| Capture, siege | none; it never stands on a center                                                                                                                 |
| Slots          | the slots of the unit inside                                                                                                                      |
| Occupancy      | it occupies its tile: no other unit ends a Move, lands, is pushed, placed, or displaced onto it. Its owner's units pass through it (revision 18). |
| Healing        | none: recovery, Windmill healing, and Tend Wounded never heal an Egg                                                                              |
| Statuses       | immune to Plague (application and spread) and to Bitten; never Inspired                                                                           |
| Growth, kills  | none                                                                                                                                              |
| Label          | "{Unit} Egg", for example "Raptor Egg"                                                                                                            |

An Egg is damaged by everything that damages a unit on its tile: attacks,
Stampede, splash, Wail (an Egg belongs to a living faction), Kaboom, and
death blasts. Fixed blast damage applies as to any unit.

No unit command is legal for an Egg except Disband
([section 6.7](#67-destruction-capture-and-disband)). `MOVE`, `ATTACK`,
`RALLY`, `TEND_WOUNDED`, `HATCH` (as the actor), `STAMPEDE`, `RECOVER`,
`CAPTURE`, `PROMOTE`, `PILLAGE`, `WAIT`, `BUILD_FIELD_DEFENSE`, `DISEMBARK`,
`KABOOM`, `RAISE_DEAD`, `DEVOUR`, and `WAIL` naming an Egg as `unitId` are
rejected with `UNIT_IS_EGG { unitId }` and never offered. An Egg never needs
handling: it does not appear among units waiting for orders, End Turn's idle
recovery skips it, and Start Turn leaves its activation exhausted.

### 6.3 Laying an Egg

`LAY_EGG { kind, cityId, role, at }` is a city action. It is the only way a
Dinosaur seat produces an egg-laid role: `TRAIN` with an egg-laid role is
rejected for a Dinosaur seat with `UNIT_ROLE_INVALID { role }` and never
offered.

Legality, checked in this order (the first failure is the rejection; all
rejections are atomic):

| #   | Requirement                                                                                                                                                                                                                           | Rejection                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | The city exists and the actor owns it.                                                                                                                                                                                                | `CITY_NOT_FOUND`, `CITY_NOT_OWNED`     |
| 2   | Its city action is available.                                                                                                                                                                                                         | `CITY_ACTION_SPENT`                    |
| 3   | It is not besieged and has no pending reward.                                                                                                                                                                                         | `CITY_BESIEGED`, `CITY_REWARD_PENDING` |
| 4   | `role` is an egg-laid role of the actor's registration (so the actor is a Dinosaur seat).                                                                                                                                             | `UNIT_ROLE_INVALID { role }`           |
| 5   | The actor has researched the role's technology.                                                                                                                                                                                       | `TECH_REQUIRED { tech }`               |
| 6   | `at` is on the board.                                                                                                                                                                                                                 | `TILE_NOT_FOUND`                       |
| 7   | `at` is a **nest tile** of the city: one of the eight tiles around the center; land; in **that city's** territory; not a settlement site; holding no unit and no treasure chest; and, if it is a Mountain, the actor has Engineering. | `INVALID_TILE { action: "LAY_EGG" }`   |
| 8   | `used + slots(role) <= capacity` ([section 5.1](#51-big-bodies-capacity-slots)).                                                                                                                                                      | `CITY_CAPACITY_FULL`                   |
| 9   | The actor has the cost in Coins.                                                                                                                                                                                                      | `INSUFFICIENT_COINS { cost }`          |

- **Cost** is the role's printed cost, minus 1 (minimum 1) while a Forge in
  the laying city has positive output (Arms Industry, exactly as for land
  training). The Shipyard discount never applies.
- **The center may be occupied.** Laying does not use the city center, so an
  own unit garrisoning the center does not block it
  (`CITY_SPAWN_OCCUPIED` never applies to `LAY_EGG`). `TRAIN` of a Caveman or
  Shaman still needs an empty center.
- **Terrain.** A nest tile may be Grass, Forest, or (with Engineering)
  Mountain, with or without a resource, improvement, Road, Field Defense, or
  Grave. An Egg changes nothing on its tile and blocks no economic action
  there.
- **No free nest tile** means no `LAY_EGG` is legal or offered for that city;
  the player frees a tile by moving a unit.
- **Result.** The actor pays the cost, the city action is spent, and an Egg
  unit takes the next entity ID on `at`: form `EGG`, role `role`, homed to
  the city, `hp = maxHp = 6 + eggHpBonus`, exhausted. Its `eggs` entry has
  `turnsRemaining = max(1, hatch(role) − eggHatchTurnReduction)` and
  `laidThisTurn: true`. Event
  `EGG_LAID`; achievements are then evaluated as after `TRAIN`.
- Laying reveals nothing, draws no PRNG value, and emits no naval event.

### 6.4 Hatching

At its owner's Start Turn every Egg of that player counts down, and an Egg
whose countdown reaches 0 hatches.

- **Order in Start Turn.** The hatch step runs after the seat's Plague and
  any chain reaction that Plague started, and **before** Windmill healing,
  Troll regeneration, income, reward settlement, and the achievement
  evaluation:

  ```text
  reset activations and capture eligibility → city actions available →
  Plague → Plague-started chain and its Plunder → HATCH STEP →
  Windmill healing → regeneration → income → rewards → achievements
  ```

  A Dinosaur seat has no exploding unit, so its own Start Turn never runs a
  chain; the position matters only for stating one total order.

- **The step.** In ascending unit ID, each of the player's Eggs has
  `laidThisTurn` set to false and loses one from `turnsRemaining`; if the
  result is 0 it hatches. Hatching: the form
  becomes `LAND`, `maxHp` and `hp` become the role's maximum HP, `kills`
  stays 0, the `eggs` entry is removed, and the unit gets a **fresh
  activation** (it can move and act this turn). It then reveals its sight.
  One `EGG_HATCHED` per hatch, then one `TILES_REVEALED` for the step when
  anything was revealed.
- **Timing examples.** An Egg laid on the owner's turn `N` with hatch time 1
  hatches at the start of turn `N + 1`, ready to act: the same tempo as a
  trained unit, which is exhausted until then. Hatch time 2 hatches at turn
  `N + 2`, and 3 at `N + 3`.
- **Siege, pending rewards, capacity, and Coins do not matter** to hatching.
  An Egg next to a besieged center still hatches.
- **Occupied hatch tile.** It cannot happen: the Egg itself occupies its
  tile, and no rule puts a second unit on an occupied tile (a Move never ends
  on one, the revision-18 interruption fallback skips occupied tiles, and
  Push, advance, landing, reward placement, displacement, and risings all
  need an empty tile or the dying unit's own tile). State parsing already
  rejects two units on one tile. The hatch step asserts it; a violation is an
  internal `INVALID_STATE`, unreachable by construction.
- **Terrain.** The hatched unit appears in place. Its tile was enterable when
  the Egg was laid and no rule makes it unenterable later.
- A hatched unit is homed to the laying city and uses the same slots as its
  Egg did, so hatching never changes used capacity.
- Muster and every other achievement are evaluated after the step, so a
  freshly hatched role counts in that Start Turn.

### 6.5 Shaman Hatch

`HATCH { kind, unitId, eggUnitId }` is a primary action of the Shaman. It is
not an Attack, costs no Coins, and needs no technology.

- **Legality.** `unitId` is the actor's own unit in land form with the
  `HATCH` ability, that has not used a primary action this turn (it may have
  moved). `eggUnitId` is an own Egg on one of the eight tiles around the
  Shaman that was **not laid this turn** (`laidThisTurn` is false).
- **Result.** The Egg hatches at once as in [section 6.4](#64-hatching),
  except that the hatched unit is **exhausted** for the rest of this turn
  (the activation of a newly trained unit). The Shaman is handled. Event
  `EGG_HATCHED` with `cause: "SHAMAN"`, then `TILES_REVEALED`, then the
  achievement evaluation.
- **Not on the laying turn** (root decision). An Egg laid this turn cannot
  be hatched this turn, so every Egg spends at least one round of enemy turns
  on the board as an Egg. From its owner's next turn on, Hatch works on it at
  once, whatever its countdown: an Egg with hatch time 1 has already hatched
  by then, so Hatch only ever applies to Eggs with a longer countdown and
  saves `turnsRemaining` turns.
- **Rejections (atomic).** Unknown, dead, or foreign `unitId` → the ordinary
  unit errors; a role without `HATCH` → `UNIT_ROLE_INVALID { role }`; primary
  action already used, or the Shaman landed this turn →
  `UNIT_ALREADY_ACTED`; embarked Shaman →
  `HATCH_NOT_LEGAL { reason: "EMBARKED" }`; `eggUnitId` unknown, dead, not
  the actor's, not an Egg, or not adjacent →
  `HATCH_NOT_LEGAL { reason: "NO_EGG" }`; an adjacent own Egg with
  `laidThisTurn` true → `HATCH_NOT_LEGAL { reason: "LAID_THIS_TURN" }`. Such
  an Egg is never offered as a Hatch target.
- A Plagued or Bitten Shaman may Hatch.

### 6.6 Nesting

> **Superseded by revision 20.** Nesting also gives every city of its owner one
> more unit slot, and the T-Rex hatch time is 4 (3 with Nesting):
> [revision 20 section 4.1](RULESET_7_REVISION_20.md#41-nesting).

Nesting is the Dinosaur `FORTIFICATION` technology (Industry, tier 2,
requires Drill, ordinary tier-2 cost). While its owner has it, every Egg that
player **lays** has +4 HP (10 instead of 6) and hatches one turn sooner, with
a minimum of 1:

| Unit         | Hatch time | With Nesting |
| ------------ | ---------: | -----------: |
| Raptor       |          1 |            1 |
| Spitter      |          1 |            1 |
| Ankylosaurus |          2 |            1 |
| Triceratops  |          1 |            1 |
| T-Rex        |          3 |            2 |

Nesting is read when the Egg is laid. Researching it changes no Egg already
on the board, so `RESEARCH` keeps having no effect on units.

### 6.7 Destruction, capture, and Disband

- **Damage.** An Egg reduced to 0 HP dies like any unit: `UNIT_DIED` with the
  ordinary cause (`ATTACK`, `SPLASH`, `WAIL`, or `EXPLOSION`), its `eggs`
  entry is removed, and its slots free. It leaves **no Grave** and
  **never rises**: Graves, Infect, and Bitten need a land-form victim. The
  killer gets the ordinary kill credit (Promotion or Grow) and the credited
  player the ordinary Plunder
  ([section 9.2](#92-goblin-rules)).
- **After the kill.** A melee attacker that destroys an Egg advances onto its
  tile under the ordinary advance rule, exactly as after killing a land unit,
  and an Overrun, Ram, or Rampage continues from there. Every attack reason
  that destroys Field Defense applies to an Egg's tile as to any target tile.
- **City capture.** When a city is captured, every Egg homed to it is
  destroyed at once: `UNIT_DIED` with the new cause `CITY_CAPTURED`, in
  unit-ID order, after `CITY_CAPTURED` and before the elimination events.
  These are removals: no kill credit, no Plunder, no Grave. (Every such Egg
  stands in the captured territory, next to the captured center.)
- **Elimination** removes Eggs with the player's other units
  (`UNIT_DIED` cause `ELIMINATION`).
- **Disband.** With Administration, `DISBAND` is legal for an own Egg: it is
  removed for `floor(printed cost / 2)` Coins of the role inside, with the
  ordinary `UNIT_DISBANDED` event. It needs no city action and is legal on
  the turn the Egg was laid (an Egg has no primary action to have used). It
  is the only unit command an Egg accepts. The command label is "Abandon
  Egg".
- **Reward-unit displacement** never moves an Egg and never chooses an Egg's
  tile; the displaced occupant looks for another free tile as today.

## 7. Stampede

> **Superseded by revision 20.** This whole section is removed. The `STAMPEDE`
> command, its lanes, errors, preview, and events do not exist in
> `pulp-wars-poc-7r20`; the Triceratops attacks with the ordinary `ATTACK`
> and the passive Charge!
> ([revision 20 section 2](RULESET_7_REVISION_20.md#2-triceratops-rework),
> removal table in [section 2.7](RULESET_7_REVISION_20.md#27-removal-of-stampede)).

`STAMPEDE { kind, unitId, targetUnitId }` is a primary action of the
Triceratops: it runs one or two tiles in a straight line and hits the unit at
the end of the run, harder the longer it ran. It fills the Catapult's role
(breaking a fortified line from two or three tiles away) with a body instead
of a projectile.

### 7.1 Legality and the lane

- **Actor.** `unitId` is the actor's own unit in land form with the
  `STAMPEDE` ability, that has **not moved** and has not used a primary
  action this turn.
- **Target.** `targetUnitId` is a unit on the board that the actor can see,
  owned by a hostile player (never the actor's own or an allied unit), in
  land form or an Egg, standing on a land tile.
- **Geometry.** With `dx`, `dy` the offset from the Triceratops to the target
  and `n = max(|dx|, |dy|)`: `n` is 2 or 3, and `|dx|` and `|dy|` are each 0
  or `n`. So the target is exactly 2 or 3 tiles away in one of the eight
  directions (four orthogonal, four diagonal). An adjacent target (`n = 1`)
  is never a Stampede target; the Triceratops attacks it with an ordinary
  `ATTACK`.
- **Lane.** The lane is the `n − 1` tiles strictly between the Triceratops
  and the target, in order from the Triceratops: one tile at distance 2, two
  at distance 3. The last lane tile is the **stand tile**, next to the
  target.
- **Open lane.** Every lane tile must be **open**:
  1. explored by the actor;
  2. land of terrain Grass or Forest: a Mountain and water close the lane
     (`pulp_wars-c87.8` applied the Forest fallback of
     [section 15.1](#151-tuning-bounds); the contract value was Grass only);
  3. not in territory of a player allied to the actor;
  4. free of a treasure chest;
  5. free of units, except that a lane tile **other than the stand tile**
     may hold the actor's own units or Eggs, which the Triceratops passes
     (revision 18). The stand tile must hold no unit at all.
- **What does not matter.** Hostile zone of control never stops or blocks a
  Stampede (it is not a Move). Roads give nothing and are not needed.
  Territory other than allied territory, Graves, improvements, resources,
  Field Defense, and settlement sites on lane tiles do not close the lane; a
  lane may cross or end on a city or village center that holds no unit.
- **No hidden units.** A unit is visible to a player exactly when it stands
  on a tile that player has explored, and every lane tile and the target tile
  are explored. Therefore no hidden unit can stand in the lane, the public
  validator and the engine read the same facts, and a Stampede is never
  interrupted: it is accepted and resolves completely, or it is rejected
  atomically.
- **Rejections (atomic).** Unknown, dead, or foreign `unitId` → the ordinary
  unit errors; a role without `STAMPEDE` → `UNIT_ROLE_INVALID { role }`;
  primary action already used → `UNIT_ALREADY_ACTED`; the unit has moved or
  landed this turn → `STAMPEDE_NOT_LEGAL { reason: "MOVED" }`; embarked →
  `STAMPEDE_NOT_LEGAL { reason: "EMBARKED" }`; unknown, dead, or unseen
  target → `TARGET_NOT_FOUND`; own or allied target → `TARGET_ALLIED`; a
  target that is afloat, adjacent, farther than 3, or off the eight
  directions → `STAMPEDE_NOT_LEGAL { reason: "NOT_IN_LANE" }`; a lane tile
  that is not open → `STAMPEDE_NOT_LEGAL { reason: "LANE_BLOCKED" }`. A
  pending city reward blocks it like every command.
- A Plagued or Bitten Triceratops may Stampede. An Inspired Triceratops does
  not exist: War Drums excludes `SIEGE` roles
  ([section 8.4](#84-rampage-pounce-war-drums-tend-wounded-and-push)).

### 7.2 Resolution

A Stampede resolves in this order:

1. **Run.** The Triceratops moves along the lane to the stand tile, passing
   own units on the way, and reveals its sight from every lane tile (as a
   Move does). Field Defense on the stand tile is destroyed when the tile's
   territory belongs to a player hostile to the actor (reason `OCCUPATION`,
   the existing Move rule). Nothing else happens on lane tiles.
2. **Hit.** The Triceratops attacks the target from the stand tile with the
   ordinary damage formula
   ([current rules section 13.2](RULESET_7_CURRENT.md#132-damage)) and

   ```text
   attack = base Attack (3) + 1 (Alpha) + run bonus
   run bonus = +1 per lane tile run: +1 at distance 2, +2 at distance 3
   ```

   The defender uses its ordinary Defense, fortification (Walls, Field
   Defense), and cover (Forest, Mountain): Stampede has no Acid. Armoured
   reduces the hit by 1 as usual. The damage uses pre-combat HP and is capped
   at the target's HP.

3. **No retaliation.** The target never retaliates, whatever its range
   (`noRetaliationReason` is `DEFENDER_DIED` or `STAMPEDE`). Consequently a
   Zombie target cannot bite or infect the Triceratops, and a Vampire target
   steals no life.
4. **Field Defense** on the target tile is destroyed, whoever owns the tile
   and whether or not the target survives (reason `CATAPULT`).
5. **Kill.** If the target dies: `UNIT_DIED` (cause `ATTACK`), its Grave or
   Bitten rising under the ordinary rules, kill credit, and growth
   ([section 5.2](#52-grow)). The Triceratops then **advances** onto the
   target's tile under the ordinary advance conditions
   ([current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat)): not
   when the target rose in place, and only onto a tile it can enter (a
   Mountain needs Engineering).
6. **Push.** If the target survives, it is pushed one tile directly away
   from the Triceratops (the lane direction) under the existing Push
   conditions: the destination is on the board, explored by the actor, empty,
   not a settlement site, land, enterable by the target's owner (a Mountain
   needs that owner's Engineering), and not in territory allied to the
   target. An Egg is never pushed. A pushed target keeps its HP, statuses,
   activation, and capture eligibility, as with the Juggernaut's Push.
7. **Follow.** If the target was pushed, the Triceratops advances into the
   tile it vacated, under the same advance conditions as step 5.
8. **Blocked push.** If the target survives and is not pushed, nothing moves:
   the Triceratops stays on the stand tile, next to the target. There is no
   extra damage.
9. **Chain.** Death blasts set off by the kill run now, after the advance
   and Push ([section 9.2](#92-goblin-rules)), followed by Plunder, reveals
   from the Triceratops's final tile, and the ordinary economy, reward, and
   achievement tail.

Afterwards the Triceratops has used its Move and its primary action
(`moved` true, `movedPathLength` the number of lane tiles, `attacked` true,
`attacksUsed` 1). Stampede never captures, besieges by itself, or changes a
city: a Triceratops that ends on a hostile center besieges it like any unit
standing there and can never capture it.

### 7.3 Push and advance cases

| Situation after the hit                                                                           | Target           | Triceratops ends on                  |
| ------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------ |
| Target dies and leaves a Grave or nothing                                                         | gone             | the target's tile (advance)          |
| Target dies and rises in place (it was Bitten)                                                    | a hostile Zombie | the stand tile                       |
| Target dies on a Mountain and the actor has no Engineering                                        | gone             | the stand tile                       |
| Target survives; the tile behind it is free and legal                                             | pushed one tile  | the target's former tile (follow)    |
| Target survives on a city or village center; the tile behind is free and legal                    | pushed off       | the center (it besieges, no capture) |
| Target survives; the tile behind is off the board                                                 | stays            | the stand tile                       |
| Target survives; the tile behind is water                                                         | stays            | the stand tile                       |
| Target survives; the tile behind holds any unit or Egg                                            | stays            | the stand tile                       |
| Target survives; the tile behind is a city, capital, or village center                            | stays            | the stand tile                       |
| Target survives; the tile behind is a Mountain and the target's owner has no Engineering          | stays            | the stand tile                       |
| Target survives; the tile behind is unexplored by the actor, or in territory allied to the target | stays            | the stand tile                       |
| Target is an Egg and survives                                                                     | stays            | the stand tile                       |
| Target survives and is pushed off a Mountain; the actor has no Engineering                        | pushed one tile  | the stand tile                       |

### 7.4 Event order

`UNIT_MOVED` (the run; `path` is the lane); `FIELD_DEFENSE_DESTROYED` for the
stand tile (`OCCUPATION`), if any; `COMBAT_RESOLVED` (its preview carries
`stampede`, [section 10](#10-commands-events-errors-and-queries));
`FIELD_DEFENSE_DESTROYED` for the target tile (`CATAPULT`), if any; the death
events (`UNIT_DIED`, then `GRAVE_CREATED` or `BITTEN_UNIT_RISEN`);
`UNIT_GREW`; `UNIT_PUSHED`; `UNIT_MOVED` (the one-tile advance or follow);
the chain events; `PLUNDER_AWARDED`; `TILES_REVEALED`; the tail; then the
naval blockade and sea-network events (`STAMPEDE` joins the recompute list
next to `ATTACK`, because a death-blast chain it sets off can kill a
blockader) and `PLAGUE_CLEARED` when the kill was a Lich.

### 7.5 Worked examples

All units at full HP on open Grass, Triceratops at stage 0 (Attack 3).

| Attack                                           | Attack used | Damage to the target | Outcome                                      |
| ------------------------------------------------ | ----------: | -------------------: | -------------------------------------------- |
| Ordinary adjacent Attack on a Fighter (10 HP)    |           3 |                    8 | Fighter survives and retaliates for 4        |
| Stampede from distance 2 on a Fighter            |           4 |                   10 | Fighter dies; the Triceratops advances       |
| Stampede from distance 3 on a Guard (15 HP)      |           5 |                   14 | Guard survives at 1 HP, is pushed; no retort |
| Stampede from distance 2 on a Guard              |           4 |                   10 | Guard survives at 5 HP, is pushed            |
| Stampede from distance 3 on a Guard behind Walls |           5 |                   11 | Guard survives at 4 HP, is pushed off        |
| Stampede from distance 3 on a Juggernaut (40 HP) |           5 |                   13 | Juggernaut survives, is pushed               |
| For comparison: Catapult (3.5) on a Guard, Walls |         3.5 |                    6 | Guard survives; nothing moves                |

## 8. Small abilities

### 8.1 Acid (Spitter)

When a Spitter in land form makes an `ATTACK`, the defender gets **no cover
and no fortification**: the damage formula uses the defender's base Defense
only (embarked 1, an Egg 1), with `cover = 1` and fortification level 0,
whatever the terrain, Walls, or Field Defense.

- Acid applies to every Spitter attack at range 1 or 2. It never applies to
  the Spitter's retaliation (retaliation damage depends on the Spitter's own
  Defense) and never to the defender's retaliation against the Spitter, which
  uses the ordinary formula with those reduced forces.
- Acid destroys nothing: Walls and Field Defense stay. The ordinary Field
  Defense destruction reasons still apply to a Spitter attack (Inspired at
  range 1, Explosives at range 1, advance).
- The combat preview and `COMBAT_RESOLVED` carry `acid: true`,
  `fortificationLevel: 0`, and a defense bonus of 1/1.
- Example: a full-HP Spitter against a full-HP Guard on a Walled center with
  Field Defense deals 4 (2 without Acid); against a Fighter in a Forest it
  deals 5 (4 without Acid).

### 8.2 Armoured (Ankylosaurus)

Every instance of damage an Ankylosaurus takes is **reduced by 1, to a
minimum of 1**: `armoured(d) = d − 1` for `d >= 2`, and `d` for `d` of 0
or 1. The reduction applies before the cap at current HP.

- It applies to each of: the hit of an attack or Stampede on it, the
  retaliation it takes as an attacker, a splash hit (Battleship, Lich, Bomb
  Chucker), a Wail hit, a Kaboom or death-blast hit, and each Start Turn of
  Plague (2 becomes 1).
- It applies in land form and while embarked, never to an Ankylosaurus Egg.
- Everything derived from damage uses the reduced value: splash around an
  Ankylosaurus that is the primary target, Lifesteal healing from hitting
  one, and death. A Zombie that deals 1 still bites it.
- The combat preview and `COMBAT_RESOLVED` carry `defenderArmoured` and
  `attackerArmoured` (true when the reduction lowered that side's damage);
  `damageToDefender` and `damageToAttacker` are the reduced values. Splash,
  Wail, explosion, and Plague entries simply report the reduced damage.
- Example: a full-HP Fighter attacking a full-HP Ankylosaurus deals 3 instead
  of 4; a Goblin Kaboom deals 4 instead of 5.

### 8.3 Hatch (Shaman)

See [section 6.5](#65-shaman-hatch).

### 8.4 Rampage, Pounce, War Drums, Tend Wounded, and Push

- **Rampage** is Overrun under a Dinosaur label for the T-Rex: after it kills
  and advances it may Attack again while a visible hostile unit (or Egg) is
  adjacent, without a cap. The continuation is evaluated after any chain its
  attack set off, and after growth.
- **Pounce** is Charge under a Dinosaur label for the Raptor: with Raiding,
  +1 Attack at range 1 on its first attack after a Move of at least two
  cells.
- **War Drums** is Rally under a Dinosaur label for the Shaman (command
  `RALLY`, flag `inspired`, event `UNITS_RALLIED`): every adjacent own
  land-form unit with `ATTACK` that is not `SUPPORT` or `SIEGE` and not
  already Inspired gains +1 Attack on its next attack this turn. Other
  Shamans and Triceratopses are therefore never targets, and Eggs never are.
- **Tend Wounded** is the Captain's, unchanged; Eggs are not targets.
- **Push** is the Juggernaut's, unchanged, for the Brontosaurus.

## 9. Interactions with existing rules

### 9.1 Undead rules

| Rule        | Interaction                                                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves      | Dinosaur-faction land units leave Graves like any unit (in matches with an Undead seat). Eggs never do.                                                                                                                                                                                      |
| Raise Dead  | Unchanged. A Grave may lie under an Egg; Raise Dead needs a Grave with no unit on it, so that Grave is not eligible while the Egg stands.                                                                                                                                                    |
| Infect      | A Dinosaur-faction land unit killed by a Zombie rises as an **ordinary Zombie** of the Zombie's owner (10 of 18 HP, 1 slot, no growth, may exceed capacity). An Egg killed by a Zombie is destroyed and does not rise.                                                                       |
| Bitten      | Dinosaur-faction land units are bitten and rise like Human units; Tend Wounded by a Shaman cures it. Eggs are never Bitten. A Stampede draws no retaliation, so a Zombie target never bites the Triceratops. A Bitten target killed by a Stampede rises in place and blocks the advance.     |
| Plague      | Dinosaur-faction units are plagued, take 2 per Start Turn (an Ankylosaurus 1), spread it, and are cured by Tend Wounded. Eggs are never plagued, never receive a spread, and never spread. A unit that hatches is not plagued. A Lich attack on an Egg damages it and plagues nothing there. |
| Wail        | Hits Dinosaur-faction units and Eggs (living faction) within its radius with the ordinary formula; an Egg defends with 1.                                                                                                                                                                    |
| Lifesteal   | A Vampire heals by the damage it deals to a Dinosaur unit or an Egg (after Armoured). A Vampire hit by a Stampede does not retaliate and heals nothing.                                                                                                                                      |
| Unanswered  | Unchanged.                                                                                                                                                                                                                                                                                   |
| Devour      | Unchanged.                                                                                                                                                                                                                                                                                   |
| Restless    | Not a Dinosaur rule.                                                                                                                                                                                                                                                                         |
| Frenzy      | Unchanged.                                                                                                                                                                                                                                                                                   |
| Lich splash | Hits hostile Eggs like any hostile unit; kills count for the Lich.                                                                                                                                                                                                                           |

### 9.2 Goblin rules

| Rule                  | Interaction                                                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gang Up               | A Goblin attacker counts its own units around a Dinosaur target or an Egg as usual. Eggs are never helpers for anyone (Gang Up is a Goblin rule and Eggs are Dinosaur units). No Dinosaur attack, Stampede included, has Gang Up (`gangUp` 0).                                     |
| Kaboom, death blasts  | Blasts hit Dinosaur-faction units and Eggs in the blast area with fixed damage (an Ankylosaurus takes 1 less). An Egg killed by a blast dies with cause `EXPLOSION`. Blasts never push, hatch, or move anything.                                                                   |
| Chains after Stampede | A Stampede that kills an exploding unit advances onto its tile and is then hit by the death blast, like a melee kill. A target that survives is pushed before any chain. The chain preview is part of the Stampede preview ([section 10](#10-commands-events-errors-and-queries)). |
| Bomb splash           | Hits Eggs and Dinosaur-faction units next to the primary target like any unit.                                                                                                                                                                                                     |
| Plunder               | An Egg destroyed by a Goblin attack, splash, or blast is a credited hostile kill: +1 Coin with Plunder. Eggs destroyed by a city capture earn nothing.                                                                                                                             |
| WAAAGH!, Ram, Troll   | Unchanged. A Scrap Buggy may Ram through Eggs.                                                                                                                                                                                                                                     |
| Warrens               | Follow the city's current owner as before; slots are summed against the Goblin capacity.                                                                                                                                                                                           |

### 9.3 Human abilities

| Ability              | Interaction                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overrun              | A Knight that destroys an Egg advances and may attack again.                                                                                                                                         |
| Push                 | A Juggernaut, Abomination, Troll, or Brontosaurus never pushes an Egg, and never pushes a unit onto an Egg's tile.                                                                                   |
| Charge               | Unchanged.                                                                                                                                                                                           |
| Escape               | Unchanged.                                                                                                                                                                                           |
| Rally                | Unchanged; never targets an Egg.                                                                                                                                                                     |
| Tend Wounded         | Unchanged; never targets an Egg.                                                                                                                                                                     |
| Catapult             | Unchanged; it may target an Egg at range 2–3.                                                                                                                                                        |
| Field Defense, Walls | Give a Human, Undead, or Goblin defender their ordinary bonus against every Dinosaur attack except the Spitter's ([section 8.1](#81-acid-spitter)). A Triceratops attack destroys the Field Defense. |

### 9.4 Cities, siege, capture, and training

- **Siege.** A besieged Dinosaur city cannot lay Eggs or train. Its Eggs
  stay, count down, and hatch.
- **Eggs next to a besieged or attacked city** are ordinary targets. An enemy
  that wants the city may ignore them: capture destroys them all.
- **Capture** destroys the Eggs homed to the city
  ([section 6.7](#67-destruction-capture-and-disband)), orphans the former
  owner's other units homed there, and re-homes the capturing unit with its
  slots ([section 5.1](#51-big-bodies-capacity-slots)).
- **Capture-capable Dinosaur units:** every Dinosaur unit (not an Egg)
  since `pulp_wars-ke95` (before it: Caveman, Raptor, Spitter,
  Ankylosaurus, and Brontosaurus).
- **City action.** `LAY_EGG` joins `TRAIN`, `TRAIN_NAVAL`, and `LAND_GRANT`
  as the one city action per turn.
- **Tile economy.** An Egg does not block harvesting, building, Roads,
  Monuments, or terrain actions on its tile, like any unit.
- **Spoils, Land Grant, rewards** are unchanged.

### 9.5 Boats, embarking, and water

- Dinosaur-faction land units embark, sail, and land under the ordinary
  rules; a 2-slot unit embarks like any other. Eggs never embark, and no Egg
  is ever on water or on a dock.
- A Stampede never targets an afloat unit and never crosses water. A
  Triceratops that landed this turn cannot Stampede (landing ends the
  activation).
- Dinosaur boats are the Human boats ([section 3](#3-dinosaur-roster)).
- Blockade rules are unchanged; an Egg never blockades.

### 9.6 Fog and observation

- An Egg is visible to a player exactly when its tile is explored by that
  player, like any unit. Its role, HP, and `turnsRemaining` are public on a
  visible Egg (the Plague-duration precedent), so opponents and the AI can
  see what is about to hatch and when.
- `EGG_LAID` and `EGG_HATCHED` are projected to the owner and to every viewer
  that has explored the Egg's tile; `EGG_LAID` hides `cost` from other
  viewers (Coins are owner-private). `UNIT_GREW` is projected like
  `UNIT_PROMOTED`. `UNIT_DIED` keeps its projection rule for Eggs.
- Laying reveals nothing. A hatched unit reveals its sight.
- Stampede previews are exact for the run, the hit, the Push, and the advance
  ([section 7.1](#71-legality-and-the-lane)). Only the death-blast chain of a
  killed exploding target can touch unexplored tiles, reported with the
  existing `touchesUnexplored` flag.
- Capacity, city actions, and Coins stay owner-private.

### 9.7 Achievements, Monuments, and Promotion

> **Superseded by revision 20.** A Promotion fully heals the unit, for every
> faction ([revision 20 section 5](RULESET_7_REVISION_20.md#5-promotion-and-growth-fully-heal)).

- **Muster** counts the Dinosaur trainable roles on the board: Caveman,
  Raptor, Spitter, Ankylosaurus, Shaman, Triceratops, T-Rex, Patrol Boat, and
  Battleship (the Brontosaurus is excluded like the Juggernaut). **An Egg
  does not count** until it hatches.
- Explorer and Engineer are unchanged. No achievement counts kills.
- Monuments are unchanged.
- Promotion is replaced by Grow for Dinosaur units only
  ([section 5.2](#52-grow)).

### 9.8 Starting units, rewards, and treasure

| Source                             | Human      | Undead      | Goblin      | Dinosaur                   |
| ---------------------------------- | ---------- | ----------- | ----------- | -------------------------- |
| Starting units                     | Fighter    | Skeleton    | one Goblin  | one Caveman                |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    | two Goblins | one Caveman                |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination | Troll       | Brontosaurus               |
| Treasure chest unit                | Knight     | Vampire     | Scrap Buggy | **Raptor** (role `RAIDER`) |

- Reward and treasure units arrive **hatched**: full HP, land form,
  exhausted until their owner's next Start Turn, exactly like the other
  factions' reward and treasure units. No reward or chest ever creates an
  Egg.
- The reward Brontosaurus appears on the city center with the ordinary
  displacement, may exceed capacity, and uses 2 slots.
- **Treasure role.** The treasure unit's role becomes a faction rule
  (`treasureUnitRole`: `KNIGHT` for Human, Undead, and Goblin, `RAIDER` for
  Dinosaur). The serialized reward literal of `TREASURE_CAPTURED` stays
  `KNIGHT` for every faction (like the `MILITIA` and `JUGGERNAUT` reward
  IDs); the spawned unit has the faction's treasure role. A treasure Raptor
  needs a city with one free slot, otherwise the chest gives 5 Coins.

## 10. Commands, events, errors, and queries

> **Superseded by revision 20.** Every `STAMPEDE` command, error, query,
> preview field, and mechanic named below is removed, and the Charge! and
> Wallbreaker shapes are added:
> [revision 20 section 7.1](RULESET_7_REVISION_20.md#71-commands-events-errors-and-queries).

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `STAMPEDE` and `HATCH`
immediately after `KABOOM` (in that order), and `LAY_EGG` immediately after
`TRAIN_NAVAL`:

- `LAY_EGG { kind, cityId, role, at }`;
- `HATCH { kind, unitId, eggUnitId }`;
- `STAMPEDE { kind, unitId, targetUnitId }`.

`DISBAND { kind, unitId }` additionally accepts an own Egg.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts:

- `EGG_LAID` immediately after `NAVAL_UNIT_TRAINED`:
  `{ playerId, cityId, unitId, role, cost, at, hp, turnsRemaining }`;
- `EGG_HATCHED` immediately after `EGG_LAID`:
  `{ playerId, unitId, role, at, cause: "TIME" | "SHAMAN", sourceUnitId }`,
  where `sourceUnitId` is the Shaman or null;
- `UNIT_GREW` immediately after `UNIT_PROMOTED`:
  `{ unitId, stage: 1 | 2, maxHp, hp }`, one event per stage reached.

`UNIT_DIED.cause` gains `CITY_CAPTURED` (Eggs of a captured city).
`CombatPreviewV7.noRetaliationReason` gains `STAMPEDE`. There is no separate
"Egg destroyed" event: an Egg is a unit and dies with `UNIT_DIED`. The player
event order inherits these positions.

**Combat preview.** `CombatPreviewV7` (and therefore `COMBAT_RESOLVED`)
gains four fields with neutral values for every other attack:

| Field              | Meaning                                                                                  | Neutral |
| ------------------ | ---------------------------------------------------------------------------------------- | ------- |
| `stampede`         | whole Attack from the run (0, 1, or 2); included in `attack2`; above 0 only for Stampede | 0       |
| `acid`             | the attacker's Acid removed the defender's cover and fortification                       | false   |
| `defenderArmoured` | Armoured lowered `damageToDefender`                                                      | false   |
| `attackerArmoured` | Armoured lowered `damageToAttacker`                                                      | false   |

The Alpha bonus is part of `attack2` and needs no field (it is a stat of the
unit). For a Stampede, `advances` covers both the advance after a kill and
the follow after a Push, and `push` keeps its three values. An attack on an
Egg reports `retaliation: false` with the existing reason for a defender
that has no Attack.

**Errors.** `RuleErrorCodeV7` gains `STAMPEDE_NOT_LEGAL` (reasons `MOVED`,
`EMBARKED`, `NOT_IN_LANE`, `LANE_BLOCKED`), `HATCH_NOT_LEGAL` (reasons
`EMBARKED`, `NO_EGG`, `LAID_THIS_TURN`), and `UNIT_IS_EGG`. `LAY_EGG` reuses existing codes
([section 6.3](#63-laying-an-egg)).

**Registration.** Faction `DINOSAUR`, tree `DINOSAUR_BASELINE_V1`, display
name "Dinosaur"; unlock kind `NESTING { eggHp: 4, hatchTurns: 1 }`;
capabilities `eggHpBonus` and `eggHatchTurnReduction`; abilities `STAMPEDE`,
`HATCH`, `ACID`, `ARMOURED`, and `GROW`; faction rule `treasureUnitRole`;
role mechanics `capacitySlots` (1 or 2), `hatchTurns` (null for a role that
is not egg-laid, otherwise 1–3), `stampedeRunBonus2` (0, or 2 per lane
tile), and `armourReduction` (0 or 1); and the constants `EGG_HP_V7` 6,
`EGG_DEFENSE2_V7` 2, `GROWTH_KILLS_V7` `[1, 3]`, `GROWTH_HP_V7` 4, and
`ALPHA_ATTACK2_V7` 2. The internal field names are the implementer's choice;
the serialized literals of this section are normative.
`assertRuleset7Registry` must accept the fourth tree unchanged (same node
IDs, tiers, branches, and prerequisites).

**Public queries.**

- `queryPlayerCommandsV7` offers, for a Dinosaur seat: one `LAY_EGG` for
  every legal `(city, role, nest tile)` in city-ID, role, then `(y, x)`
  order; `HATCH` for every Shaman and adjacent own Egg not laid this turn; `STAMPEDE` for every
  legal target; `DISBAND` for own Eggs with Administration. It never offers
  `TRAIN` for an egg-laid role, Field Defense, `PROMOTE` for a Dinosaur unit,
  or any other command for an Egg. Every offered command is accepted.
- `previewLayEggV7(view, cityId, role)` returns
  `{ cityId, role, cost, slots, usedSlots, capacity, hp, turnsToHatch, nestTiles, unavailableReason }`,
  where `nestTiles` is the legal tile list in `(y, x)` order and
  `unavailableReason` is null or the rejection code that applies with any
  tile (`CITY_ACTION_SPENT`, `CITY_BESIEGED`, `CITY_REWARD_PENDING`,
  `TECH_REQUIRED`, `INVALID_TILE` when no nest tile is free,
  `CITY_CAPACITY_FULL`, `INSUFFICIENT_COINS`). It is the hatch-timing
  preview for a new Egg.
- `previewHatchV7(view, unitId, eggUnitId)` returns null unless `HATCH` is
  offered, otherwise `{ unitId, eggUnitId, role, at, hp, turnsSaved }`
  (`turnsSaved` is the Egg's `turnsRemaining`).
- `previewStampedeV7(view, unitId, targetUnitId)` returns null unless that
  `STAMPEDE` is offered, otherwise
  `{ unitId, targetUnitId, from, lane, standAt, runTiles, combat, pushTo, endsAt, fieldDefenseDestroyed, explosions }`:
  `lane` is the lane in order; `runTiles` is 1 or 2; `combat` is the
  `CombatPreviewV7` of the hit; `pushTo` is the target's destination or null;
  `endsAt` is the Triceratops's final tile; `fieldDefenseDestroyed` lists the
  tiles (stand tile, target tile) that lose Field Defense; `explosions` is
  the chain shape of `previewAttackExplosionsV7` (an empty chain when the
  target is not an exploding unit). The preview equals the resolution, except
  for a chain flagged `touchesUnexplored`.
- `queryStampedeLanesV7(view, unitId)` returns, for a Triceratops that may
  Stampede, every lane to a legal target (`targetUnitId`, `lane`, `standAt`),
  for the UI highlight; it is the set of offered `STAMPEDE` commands.
- `queryCombatPreviewV7` and `estimateCombatV7` include Alpha, Acid, and
  Armoured and accept an Egg as the target. `queryThreatenedTilesV7` adds,
  for a visible hostile Triceratops that has not been seen to move this turn,
  every tile at distance 2 or 3 along an open lane (open as far as the viewer
  can see) in addition to its ordinary melee reach.
- `publicUnitStatsV7` carries, exactly for units owned by a Dinosaur seat, a
  `dinosaur` block: `capacitySlots`, `growthStage` (0–2, or null for a role
  that does not grow), `killsToNextStage` (or null), `armourReduction`,
  `acid`, `stampedeRunBonus`, and `egg` (null, or
  `{ turnsRemaining, hatchesAs }` for an Egg). An Egg's stat rows are HP,
  Attack 0, Defense 1, Move 0, Range 0, and Sight 0, with no terrain or
  fortification modifier. The HP row lists the modifier source `GROWTH` and
  the Attack row the source `ALPHA`.
- `previewCityCapacityV7` reports used slots (the sum), capacity, and, for
  each role the seat can produce, its slots. `previewDisbandV7` covers Eggs.
- `PublicPlayerV7` and the leaderboard carry `DINOSAUR` and
  `DINOSAUR_BASELINE_V1` for Dinosaur seats. The leaderboard unit count
  includes Eggs, which are units.

## 11. Normal AI requirements

> **Superseded by revision 20.** The Stampede and lane requirements are
> replaced by [revision 20 section 7.3](RULESET_7_REVISION_20.md#73-normal-ai).

Normal AI plays as and against Dinosaurs (`pulp_wars-c87.5`) with every
existing guarantee: deterministic and PRNG-free, only the public view, public
commands, and public previews (never hidden state), at most 128 accepted
commands per owner turn through bounded resumable work, and no change to
decisions in matches without a Dinosaur seat (every Dinosaur heuristic is
gated on a match with a Dinosaur seat, in a new `src/ai/v7-dinosaur.ts`).

From `pulp_wars-c87.2` on, a Dinosaur seat must already play complete
headless matches without a policy error or stall, using the ordinary policy
on the Dinosaur registration.

As Dinosaurs it must at least:

- **produce** from its own registration: Cavemen early, then Eggs chosen by
  role value **per slot** and per Coin, counting the hatch delay as a cost and
  never queuing an Egg that leaves a threatened city without a ready
  defender;
- **place Eggs** on the legal nest tile with the least visible hostile reach
  this turn and next (using `queryThreatenedTilesV7` and visible hostile
  ranges), preferring tiles behind the city and next to own units, and skip
  laying when every nest tile can be destroyed before hatching and a Caveman
  is affordable instead;
- **protect Eggs:** count an Egg at the value of the unit inside, scaled by
  how soon it hatches, in its defend-the-city scoring, and keep a unit
  between visible attackers and a valuable Egg when it costs no better
  attack;
- **Hatch** with a Shaman when an adjacent own Egg (laid on an earlier turn)
  has more than one turn left or is threatened by a visible unit, and keep a
  Shaman near the capital while Eggs are pending;
- **respect slots** in every capacity estimate (training, laying, treasure,
  city choice for production);
- **Grow:** add the growth value to a kill by a Dinosaur unit that is one
  kill from Big or Alpha, prefer giving finishing blows to units that grow,
  and retreat a grown unit earlier than an ungrown one of the same role
  (its replacement cost is higher);
- **Stampede:** take the offered `STAMPEDE` with the best previewed value
  (damage and kill, the Field Defense destroyed, a defender pushed off a
  center next to a ready capturer, minus the exposure of the Triceratops on
  its final tile from visible threats), keep a Triceratops unmoved when a
  lane exists or can be opened next turn, and position it two or three tiles
  from a target with an open lane;
- **Acid:** prefer Spitter attacks on targets whose cover or fortification
  the Spitter ignores;
- use War Drums like Rally, Tend Wounded like the Captain, Rampage like
  Overrun, and Pounce like Charge.

Against Dinosaurs it must at least:

- **smash Eggs:** value a visible hostile Egg at the unit inside (scaled by
  the turns left) and attack it when it can be destroyed or its destruction
  completed this turn, without abandoning a city defence or a capture;
- **block lanes and avoid them:** include Stampede reach in threat
  evaluation, avoid ending a unit at distance 2–3 from a visible unmoved
  Triceratops along an open lane when an equally good tile exists, and
  prefer Forest and Mountain tiles next to it;
- **avoid feeding kills:** discount an attack whose predicted retaliation or
  exposure hands a kill to a Dinosaur unit one kill from Big or Alpha, and
  prioritise killing grown units;
- account for Armoured in every damage estimate and for Acid when relying on
  cover, Walls, or Field Defense;
- keep Normal's existing city-defense and capture priorities.

Opening research keeps the existing scorer for every faction unless
`pulp_wars-c87.5` records and tests a Dinosaur-specific change. Headless
matches of Dinosaurs against each faction and against themselves must finish
without stalls or policy errors, and the tactical benchmark
([tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)) gains
Dinosaur scenarios: a Stampede taken when it kills, a Stampede declined when
the Triceratops would die next turn for no gain, an Egg laid on the safe
tile, a Shaman Hatch under threat, an opponent destroying a reachable Egg,
and an opponent stepping out of a lane.

## 12. UI requirements

### 12.1 Surfaces

The browser UI (`pulp_wars-c87.4`) must, at requirement level:

- offer "Dinosaur" in every seat's faction select (default all Human);
- label every unit by its owner's faction, and render the technology tree
  (including the name Nesting), research offers, action chips, and Help in
  the viewer's faction text ([section 4](#4-technology));
- **Lay Egg:** in the city panel of a Dinosaur city, list each egg-laid role
  with its cost, slots, and hatch time, next to the trainable Caveman and
  Shaman; choosing a role highlights the legal nest tiles and a click on one
  lays the Egg (one confirmation step, consistent with naval dock picking);
  show the unavailable reason from `previewLayEggV7` otherwise;
- **Egg marker:** draw an Egg on its tile in the owner's colour with its HP
  bar and its countdown number, for every visible Egg of any owner; the unit
  info names the unit inside, its slots, and the turns left;
- **Hatch:** offer Hatch as a Shaman command, highlight the adjacent own
  Eggs it may hatch, preview the unit that appears and that it will be
  exhausted, and show the unavailable reason on an adjacent Egg laid this
  turn;
- **Abandon Egg:** offer Disband on a selected own Egg with its refund;
- **Stampede:** offer Stampede as a Triceratops command; highlight every
  lane from `queryStampedeLanesV7`; on choosing a target show the run tiles,
  the "+N Attack" of the run, the damage, the kill or the Push destination,
  the tile the Triceratops ends on, the Field Defense lost, a death-blast
  warning with its chain when the target explodes, and a Bitten warning when
  the target would rise; confirm like an attack;
- **Growth:** draw a Big unit at 1.12× and an Alpha at 1.25× of the role's
  sprite scale (anchored at the feet, clipped to the tile's draw area), with
  a one-pip (Big) or two-pip (Alpha) marker beside the HP bar; show the
  stage, its bonuses, and the kills to the next stage in unit info; announce
  growth in the log with a short pulse on the unit;
- show **Acid** and **Armoured** in the attack preview (the cover and
  fortification struck out; "Armoured −1") and in unit info;
- show slots in the city capacity breakdown ("5 of 6 slots") and on each
  production row, and "War Drums", "Rampage", and "Pounce" as the labels of
  Inspired, Overrun, and Charge for Dinosaur units;
- show the unavailable reason "Dinosaurs cannot build Field Defense" where a
  Human Fighter would offer it;
- use code-drawn Egg, growth, and lane markers until `pulp_wars-c87.7` lands
  ([section 12.4](#124-placeholder-and-final-art)); and
- look identical to revision 18 in matches without a Dinosaur seat, apart
  from the extra faction option.

### 12.2 Labels and text

> **Superseded by revision 20.** Every Stampede row is removed; the Charge!,
> Wallbreaker, Promote, and growth texts are in
> [revision 20 section 7.2](RULESET_7_REVISION_20.md#72-ui-text-and-surfaces).

| Surface                        | Text                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Faction option                 | Dinosaur                                                                          |
| Lay Egg command                | Lay Egg                                                                           |
| Lay Egg row                    | {unit} Egg: {cost} Coins, {slots} slot(s), hatches in {n} turn(s)                 |
| Lay Egg tile prompt            | Choose a tile next to the city for the Egg                                        |
| Lay Egg unavailable (no tile)  | No free tile next to the city                                                     |
| Lay Egg unavailable (capacity) | Needs {slots} free slots                                                          |
| Egg name                       | {unit} Egg                                                                        |
| Egg info                       | Hatches into a {unit} in {n} turn(s). Cannot move or fight.                       |
| Egg countdown tooltip          | Hatches in {n} turn(s)                                                            |
| Hatch command                  | Hatch                                                                             |
| Hatch tooltip                  | Hatch an adjacent Egg laid on an earlier turn. The new unit cannot act this turn. |
| Hatch unavailable (new Egg)    | This Egg was laid this turn; it can be hatched from your next turn                |
| Abandon Egg command            | Abandon Egg                                                                       |
| Abandon Egg tooltip            | Remove this Egg for {coins} Coins                                                 |
| Stampede command               | Stampede                                                                          |
| Stampede tooltip               | Charge a unit 2 or 3 tiles away in a straight line: +1 Attack per tile run.       |
| Stampede preview (run)         | Runs {n} tile(s): +{n} Attack                                                     |
| Stampede preview (kill)        | Kills {unit}; Triceratops advances                                                |
| Stampede preview (push)        | Pushes {unit} back; Triceratops follows                                           |
| Stampede preview (blocked)     | {unit} cannot be pushed; Triceratops stops next to it                             |
| Stampede preview (no retort)   | No retaliation                                                                    |
| Stampede unavailable (moved)   | A Triceratops cannot Stampede after moving                                        |
| Stampede unavailable (lane)    | No clear lane: needs open ground in a straight line                               |
| Growth stages                  | Big; Alpha                                                                        |
| Growth unit info               | Big: +4 HP. Alpha: +8 HP, +1 Attack. Next stage in {k} kill(s).                   |
| Attack preview (Acid)          | Acid: ignores cover and fortification                                             |
| Attack preview (Armoured)      | Armoured −1                                                                       |
| Unit info (abilities)          | Acid; Armoured; Stampede; Rampage; Pounce; War Drums; Hatch; Grows                |
| War Drums command and status   | War Drums; "War Drums: +1 Attack on the next attack"                              |
| Rampage status                 | Rampage: attack again                                                             |
| City capacity                  | {used} of {capacity} slots                                                        |
| Field Defense unavailable      | Dinosaurs cannot build Field Defense                                              |
| Log (laid)                     | {owner} laid a {unit} Egg                                                         |
| Log (hatched)                  | {owner} {unit} hatched                                                            |
| Log (Egg destroyed)            | {owner} {unit} Egg was destroyed                                                  |
| Log (Eggs lost with a city)    | {n} Egg(s) were lost with {city}                                                  |
| Log (growth)                   | {owner} {unit} grew: {stage}                                                      |
| Log (Stampede)                 | {owner} Triceratops stampeded {unit}: {damage} damage                             |

### 12.3 Help text

> **Superseded by revision 20.** The Stampede, Nesting, and Grow lines are
> replaced, and Charge!, Wallbreaker, and Promotion lines added, by
> [revision 20 section 7.2](RULESET_7_REVISION_20.md#72-ui-text-and-surfaces).

One sentence per rule, shown in Help for every viewer:

- **Eggs:** Dinosaurs are not trained: the city lays an Egg on a tile next to
  it, and the Egg hatches into a full-strength unit after its hatch time.
- **Egg weakness:** an Egg cannot move or fight and has only 6 HP, so enemies
  can smash it before it hatches, and all Eggs of a captured city are lost.
- **Big bodies:** a T-Rex or a Brontosaurus takes two unit slots in its
  city.
- **Grow:** a Dinosaur grows when it kills: Big after 1 kill (+4 HP) and
  Alpha after 3 kills (+4 more HP and +1 Attack), for good.
- **Stampede:** a Triceratops that has not moved charges a unit 2 or 3 tiles
  away in a straight line over Grass or Forest, with +1 Attack per tile run
  and no retaliation, and pushes the survivor back.
- **Acid:** a Spitter's attack ignores Forest and Mountain cover, Walls, and
  Field Defense.
- **Armoured:** an Ankylosaurus takes 1 less damage from every hit, to a
  minimum of 1.
- **Hatch:** a Shaman can hatch an adjacent Egg at once, but not on the turn
  the Egg was laid; the new unit cannot act that turn.
- **Nesting:** with Nesting, Eggs have +4 HP and hatch one turn sooner.
- **Wild:** Dinosaurs cannot build Field Defense.
- **Rampage, Pounce, War Drums:** a T-Rex attacks again after a kill, a
  Raptor gets +1 Attack after moving two tiles, and a Shaman gives adjacent
  units +1 Attack on their next attack.

### 12.4 Placeholder and final art

Until `pulp_wars-c87.7` lands, `pulp_wars-c87.4` draws Dinosaur units with
the existing fallback (the Human art with a Dinosaur badge, the LEGACY rule
for a faction subject without a raster) and draws the Egg, the countdown,
the growth pips, and the Stampede lane as code-native markers. `c87.7` adds
PixelLab chibi sprites and portraits for the eight land units
(`PORTRAIT:DINOSAUR:<ROLE>`), one Egg sprite shared by all roles (subject
key `UNIT:DINOSAUR:EGG`, root decision), City 1–3, and command icons for Lay
Egg, Hatch, and Stampede, under the
[Dinosaur faction art fragment](../art/factions/DINOSAUR.md)
(`pulp_wars-c87.6`). Growth is a scale and a marker on the same
sprite; no per-stage sprite is required. Dinosaur boats use the Human boat
art.

## 13. Unchanged Human, Undead, and Goblin behaviour

A match without a Dinosaur seat behaves identically to revision 18 apart from
identity. For equal setups, seeds, and command sequences it produces the same
maps, legal commands, previews, accepted and rejected commands, events, and
views. The only differences are the ruleset ID, the autosave key, the
obsolete-key list, the empty `eggs` lists of the state and the view, and the
neutral combat-preview fields `stampede: 0`, `acid: false`,
`defenderArmoured: false`, and `attackerArmoured: false`. No Egg exists, no
`LAY_EGG`, `HATCH`, or `STAMPEDE` is offered or accepted, every role uses one
slot (so used slots equal the unit count), no unit grows, the treasure unit
is the `KNIGHT` role, and Field Defense, Promotion, cover, and fortification
work as before. Every rule the code keys on a mechanical role (advance of the
`CATAPULT`, Field Defense on `FIGHTER`/`GUARD`, the treasure `KNIGHT`,
Overrun) must resolve through the owner's registration with the same Human,
Undead, and Goblin results.

In mixed matches each unit applies its own registration: Human, Undead, and
Goblin units keep every ability against Dinosaurs, and Eggs are targets like
any unit.

## 14. Implementation split and test expectations

Each bead proves its part with deterministic tests (new tests live in
`tests/unit/ruleset-v7-dinosaur-*.test.ts` unless noted).

| Bead              | Scope                                                                                                                                                                                                                      | Required evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulp_wars-c87.2` | identity; registration; every serialized shape of [section 2.1](#21-identity) (with `eggs` always empty and no Egg accepted yet); roster; slots; Grow; Wild; Acid; Armoured; labels; substitutions; Showcase; headless CLI | exact 7r19 identity, gap-free `PRIOR_RULESET_7_IDS` ending in 7r18, save key and obsolete-key cleanup through `v7r18`; faction and tree orders, binding, display name, mismatch rejection; registry assertion with four trees; faction-independent maps with Dinosaur seats; every value of the [section 3](#3-dinosaur-roster) table (cost, HP, `attack2`, `defense2`, Move, range, minimum range, Sight, attack after move, capture, abilities, tactical role, slots, hatch time as registry values); one starting Caveman; Militia one Caveman, reward Brontosaurus (2 slots, may exceed capacity), treasure Raptor with a free slot and the 5-Coin fallback without, `TREASURE_CAPTURED` literal unchanged; **slots:** used slots as a sum, `CITY_CAPACITY_FULL` for a 2-slot role with one free slot and acceptance with two, level-1 capital case, Planning, a Goblin-captured Dinosaur city and a Dinosaur-captured Goblin city (Warrens), capturing Brontosaurus re-homed over capacity, orphans using no slots, `previewCityCapacityV7`; **Grow:** Big at 1 kill and Alpha at 3 with +4/+4 HP and +1 Attack, growth from attack, retaliation, and Rampage kills, none from explosions, Plague, or friendly kills, timing before advance and Rampage continuation, `UNIT_GREW` payload and projection, no `PROMOTE` for Dinosaur units (offer and rejection), Caveman and Shaman ordinary Promotion, state parsing of `maxHp` against `kills` for growing and non-growing roles, healing to the grown maximum, an infected Alpha rising as an ordinary Zombie, growth kept across embark and landing; **Wild:** no Field Defense offer or acceptance for Caveman and Ankylosaurus, existing Field Defense still fortifies them; **Acid:** cover and each fortification source ignored, range 1 and 2, not on retaliation, nothing destroyed, preview fields, the two [section 8.1](#81-acid-spitter) examples; **Armoured:** attack, retaliation, splash, Wail, Kaboom, death blast, and Plague each reduced by 1 with minimum 1 and 0 unchanged, embarked, derived splash and Lifesteal, bite at 1 damage, preview flags; Rampage, Pounce, and War Drums parity with Overrun, Charge, and Rally (War Drums excluding Shaman and Triceratops); Triceratops ordinary attack: no attack after moving, advance after a melee kill, Field Defense destroyed with reason `CATAPULT`; Disband refunds; Muster roles; per-viewer technology names and unlock text (Nesting); the Showcase with a Dinosaur seat (ten hatched units, stage 0, the stated used slots, homes and IDs equal to other factions); egg-laid roles trained with `TRAIN` in this bead only; save/replay/hash round-trip with Dinosaur seats; headless Normal matches with Dinosaur seats finishing without policy errors; parity of matches without a Dinosaur seat with 7r18 apart from identity and the neutral fields; refreshed release corpus with reviewed diff                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pulp_wars-c87.3` | `LAY_EGG`; Egg units; hatching; Shaman `HATCH`; Nesting; Egg destruction, capture, Disband; `STAMPEDE`; previews and public stats; interactions                                                                            | **Eggs:** each row of the [section 6.3](#63-laying-an-egg) legality table accepted and rejected in the stated order; nest-tile rules (ring, land, this city's territory, no site, unit, or chest, Mountain with and without Engineering, Forest and improved tiles allowed); laying with an occupied center; `TRAIN` of an egg-laid role rejected and not offered; cost with Arms Industry and its minimum; slots of the role inside counted from laying, unchanged by hatching; state parsing rejections of [section 6.1](#61-representation); every unit command against an Egg rejected with `UNIT_IS_EGG`; an Egg never retaliates, projects no ZOC, reveals nothing, never recovers, is not healed by a Windmill or Tend Wounded, is not Rallied, and blocks enemy and allied movement while own units pass through it and cannot stop on it; Defense 1 with no cover or fortification on Forest, Mountain, and Field Defense tiles; hatch at Start Turn for hatch times 1, 2, and 3 with the countdown, the fresh activation, sight reveal, `EGG_HATCHED`, the order after Plague and before Windmill healing and income, and Muster counting the hatchling but never an Egg; hatching while besieged; Shaman `HATCH` (legality, exhausted hatchling, an Egg laid this turn rejected with `LAID_THIS_TURN` and not offered, the same Egg hatchable on the owner's next turn, `laidThisTurn` set by `LAY_EGG`, cleared at the owner's Start Turn only, kept across other players' turns and across save and replay, each other rejection); Nesting HP and hatch times per role, the minimum of 1, and no effect on Eggs already laid; Eggs destroyed by attack, splash, Wail, Kaboom, and death blast with kill credit (Promotion and Grow) and Plunder, no Grave, no Infect or Bitten rising, no Plague or bite on an Egg, no Plague spread to or from one, melee advance and Overrun/Ram/Rampage through an Egg, an Egg never pushed and never a Push destination; capture destroying exactly the Eggs homed to the city with cause `CITY_CAPTURED`, in ID order, with no credit or Plunder; elimination; Egg Disband with refund, without a city action, on the laying turn, and rejected without Administration; reward displacement around Eggs. **Stampede:** all eight directions at distance 2 and 3; rejection of distance 1 and 4, knight-move offsets, afloat, own, allied, and unseen targets, a moved, landed, embarked, or already-acted Triceratops, and each way a lane tile is not open (unexplored, Forest, Mountain, water, allied territory, chest, a hostile or allied unit, any unit on the stand tile); passing own units and Eggs on the first lane tile; ZOC ignored; lanes across and ending on empty centers; the run bonus +1 and +2 with Alpha stacking; every row of the [section 7.5](#75-worked-examples) table; no retaliation from melee, ranged, Zombie, and Vampire targets; Walls, Field Defense, and cover applied to the hit; Field Defense destroyed on the target tile (`CATAPULT`) and on a hostile stand tile (`OCCUPATION`); every row of the [section 7.3](#73-push-and-advance-cases) table; activation after a Stampede; never a capture; the event order of [section 7.4](#74-event-order); a killed exploding target hitting the advanced Triceratops, and a pushed survivor before the chain; a Bitten target rising and blocking the advance; growth from a Stampede kill; Stampede on an Egg (damage, no Push, advance on a kill); `previewStampedeV7` equal to the resolution in every case above, `queryStampedeLanesV7` equal to the offered commands, the threatened-tiles extension; `previewLayEggV7`, `previewHatchV7`, the `dinosaur` stats block, and view `eggs`; projection of `EGG_LAID` (cost hidden), `EGG_HATCHED`, and Egg deaths; an audit test that every `form` branch treats `EGG` as intended (an Egg on a land tile passes state parsing; it is never treated as afloat for Push, ZOC, blockade, Graves, or attack legality); determinism across replays; parity of matches without a Dinosaur seat |
| `pulp_wars-c87.4` | UI                                                                                                                                                                                                                         | [section 12](#12-ui-requirements) surfaces and text; Lay Egg with tile picking, slots, and hatch time; Egg marker with countdown and HP for own and enemy Eggs; Hatch and Abandon Egg; Stampede lane highlight, preview lines, and confirmation; growth scale, pips, unit info, and log; Acid and Armoured in previews; Nesting in the tree; start and finish a match as and against Dinosaurs in the browser; screens of matches without a Dinosaur seat unchanged; a smoke probe that lays an Egg, sees it hatch, and performs a Stampede                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pulp_wars-c87.5` | Normal AI                                                                                                                                                                                                                  | [section 11](#11-normal-ai-requirements) behaviours with `tests/unit/ruleset-v7-dinosaur-ai*.test.ts` scenarios (safe nest tile chosen, laying skipped under certain loss, Shaman Hatch under threat, slots respected, a Stampede taken and one declined, a growth-finishing blow preferred, an opponent smashing a reachable Egg, an opponent leaving a lane, an opponent denying a growth kill); determinism and command bounds; headless matches of Dinosaurs against Human, Undead, Goblin, and Dinosaur seats in both seat orders complete without stalls or policy errors; pinned decision hashes of matches without a Dinosaur seat unchanged; tactical benchmark Dinosaur scenarios; sample metrics of Eggs laid, hatched, and destroyed and of Stampedes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pulp_wars-c87.8` | balance                                                                                                                                                                                                                    | the matrix and telemetry of [section 15.2](#152-measurement), the targets of [section 15.3](#153-balance-acceptance-from-the-brief), any tuning inside [section 15.1](#151-tuning-bounds) with the contract, code, and tests changed together, a tuning record added to this document, and a written report (`docs/validation/RULESET_7_DINOSAUR_BALANCE.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pulp_wars-c87.9` | release fold                                                                                                                                                                                                               | this overlay folded into [current rules](RULESET_7_CURRENT.md) for four factions (a Dinosaur roster table, the technology difference, a Dinosaur faction-rules section, the slot rule in the capacity section, the Start Turn order, and a revision-history row), the Normal AI and release documents updated, browser smoke covering a Dinosaur match, prettier and link checks on changed documents, and the full release gates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

`pulp_wars-c87.6` (art direction) and `pulp_wars-c87.7` (art) follow the art
workflow of the project instructions; their rule-facing requirements are in
[section 12.4](#124-placeholder-and-final-art).

`pulp_wars-c87.2` changes the identity and therefore refreshes the release
corpus (`npm run validate:ruleset7-release` with its reviewed refresh).
Between `c87.2` and `c87.3`, Dinosaur seats are playable headlessly with
every Dinosaur unit trained on the city center by `TRAIN` (ready at the next
Start Turn, no Egg, no Nesting effect) and with the Triceratops limited to
its ordinary Attack; no UI offers the faction until `c87.4`. `c87.3` makes
`TRAIN` reject the egg-laid roles for a Dinosaur seat.

## 15. Tuning bounds, measurement, and balance acceptance

### 15.1 Tuning bounds

> **Superseded by revision 20.** The Triceratops, T-Rex, and Stampede rows are
> replaced by the fixed values and bounds of
> [revision 20](RULESET_7_REVISION_20.md); the other tuned numbers stand.

`pulp_wars-c87.8` may move these numbers within the listed bounds without
root approval, changing this contract, the code, and the tests together and
justifying each change in its report. The first levers are hatch times,
slots, and costs; stats come after. Anything outside the bounds, any Human,
Undead, or Goblin number, and any mechanic change (what an Egg is, which
roles are laid, lane rules, Push and advance rules, kill credit, what Acid
and Armoured ignore) needs root approval. Two mechanic fallbacks are named
in advance; `c87.8` may propose them with evidence, and each still needs root
approval before it is applied.

| Parameter                                           | Contract value                           | Bounds                                                           |
| --------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Hatch time: Raptor, Spitter                         | 1, 1                                     | 1–2 each                                                         |
| Hatch time: Ankylosaurus, Triceratops               | 2, 2                                     | 1–3 each                                                         |
| Hatch time: T-Rex                                   | 3                                        | 2–4                                                              |
| Slots: Ankylosaurus                                 | 1                                        | 1 or 2                                                           |
| Slots: Triceratops, T-Rex, Brontosaurus             | 2, 2, 2                                  | 1 or 2 each                                                      |
| Cost: Caveman                                       | 2                                        | 2–3                                                              |
| Cost: Raptor, Spitter, Ankylosaurus, Shaman         | 4, 4, 5, 5                               | ±1 each                                                          |
| Cost: Triceratops, T-Rex                            | 8, 10                                    | 7–10, 8–12                                                       |
| HP: Caveman, Raptor, Spitter, Shaman                | 10, 12, 10, 10                           | ±2 each                                                          |
| HP: Ankylosaurus, Triceratops, T-Rex                | 20, 18, 28                               | ±4 each                                                          |
| HP: Brontosaurus                                    | 45                                       | 40–50                                                            |
| Attack, Defense of every Dinosaur-faction land role | section 3                                | ±0.5 each                                                        |
| Move: T-Rex                                         | 2                                        | 2 or 3                                                           |
| Egg HP / Egg Defense                                | 6 / 1                                    | 4–8 / 0.5–2                                                      |
| Nesting: Egg HP bonus / hatch reduction             | +4 / 1 turn                              | +2 to +6 / fixed                                                 |
| Growth thresholds (Big, Alpha)                      | 1, 3 kills                               | 1–2, 3–4                                                         |
| Growth HP per stage / Alpha Attack                  | +4 / +1                                  | +3 to +5 / +0.5 or +1                                            |
| Stampede run bonus per tile                         | +1                                       | +0.5 or +1                                                       |
| Stampede distance                                   | 2–3                                      | fixed                                                            |
| Armoured reduction                                  | 1                                        | fixed                                                            |
| Dinosaur city capacity bonus                        | 0                                        | fixed                                                            |
| Starting Cavemen / Militia Cavemen                  | 1 / 1                                    | fixed / 1–2                                                      |
| Shaman Hatch                                        | hatches at once (not on the laying turn) | fallback: "reduces the countdown by 1" (root approval)           |
| Stampede lane terrain                               | Grass only                               | fallback: a Forest lane tile also counts as open (root approval) |

### 15.2 Measurement

Extend the headless balance matrix
([Goblin balance report, reproduction](../validation/RULESET_7_GOBLIN_BALANCE.md#2-reproduction))
to four factions. `D` is Dinosaur, in seat order with `H`, `U`, and `G`.

- **1v1 pairings:** the nine existing ones (`HU`, `UH`, `UU`, `HH`, `GH`,
  `HG`, `GU`, `UG`, `GG`) re-run as the baseline, plus `DH`, `HD`, `DU`,
  `UD`, `DG`, `GD`, and `DD`: sixteen pairings on the same maps (the five
  generated types), sizes (11 and 14), seeds (0–29 per cell), and caps (150
  rounds, 30,000 commands, 128 commands per turn).
- **Four-seat mixes** on 16 × 16 with all four factions in rotated seat
  order (`HUGD`, `DHUG`, `GDHU`, `UGDH`), seeds 0–3 per map, 120 rounds, next
  to the existing mixes.
- **Dinosaur telemetry** per game and seat: Eggs laid, hatched (by Start
  Turn and by Shaman), destroyed by enemies (by cause and by the attacker's
  role), lost to city capture, and abandoned, each by role; turns Eggs spent
  on the board; Coins lost in destroyed Eggs; units grown to Big and to Alpha
  by role, and grown units lost; Stampedes by distance, with kills, pushes,
  blocked pushes, damage dealt, Field Defense destroyed, and the Triceratops
  lost within one round of a Stampede; ordinary Triceratops attacks; Acid
  attacks that ignored cover or fortification; damage prevented by Armoured;
  Shaman Hatches, War Drums, and Tend uses; used slots and capacity at each
  End Turn (mean and maximum), turns over capacity, and turns a city could
  not lay for lack of slots or of a nest tile; units owned at each End Turn;
  kills and losses by role; technologies researched (Sawmilling in
  particular); and turns that hit the 128-command cap.

### 15.3 Balance acceptance (from the brief)

- Dinosaur win rate in decided mixed games within 40–60% against each
  faction separately: `DH` + `HD`, `DU` + `UD`, and `DG` + `GD`.
- The round-cap rate of each Dinosaur pairing no more than 3 percentage
  points above the same run's cap rate of the non-Dinosaur 1v1 pairings.
- Stampede is used by Normal AI in natural play: at least one Stampede in at
  least half of the Dinosaur seat-games in which the seat researched
  Sawmilling.
- Eggs are destroyed by enemies in a meaningful minority of games: the
  report states the share of Dinosaur seat-games with at least one Egg
  destroyed by an enemy and the share of all laid Eggs destroyed. Watch
  band: 15–60% of seat-games; outside it the report explains why (Eggs
  irrelevant as targets, or impossible to keep alive).
- Growth happens: the report states Big and Alpha counts per seat-game;
  at least one unit reaches Big in at least half of Dinosaur seat-games.
- No stalls, policy errors, or exceptions.
- The non-Dinosaur pairings have byte-identical final state hashes to a
  pre-tuning run of the same seeds under the same identity (the Goblin
  report's parity method), so Dinosaur tuning changes no other faction.

If the gameplay fails these, `c87.8` iterates within
[section 15.1](#151-tuning-bounds) and the Dinosaur-only Normal AI, and asks
the root before going outside the bounds.

### 15.4 Tuning record (`pulp_wars-c87.8`)

**Interim.** The user play-tested the faction while this bead ran and asked
for a rework (revision 20: a different Triceratops, a costlier T-Rex with a
longer hatch, a changed Nesting branch, and stronger Humans) with its own
balance pass. `c87.8` therefore stopped early. The values below are the ones
it had measured; they are the baseline that revision 20 starts from, not a
final tuning.

The contract values met the win-rate band only barely (Dinosaurs won 40.8%
of decided games against Undead and 41.8% against Goblins) and failed the
Stampede target (28.7% of the seat-games with Sawmilling). `c87.8` changed
these numbers, all inside [section 15.1](#151-tuning-bounds), applied the
pre-approved Forest fallback, and changed the Dinosaur-only Normal AI; every
other number keeps its contract value. The evidence and the iterations are
in the [Dinosaur balance report](../validation/RULESET_7_DINOSAUR_BALANCE.md).

| Parameter              |   Contract |           Tuned | Why                                                                                                             |
| ---------------------- | ---------: | --------------: | --------------------------------------------------------------------------------------------------------------- |
| Caveman HP             |         10 |              12 | the only win-rate lever that worked (about +7 points against Humans, +5 against Undead, +3 against Goblins)     |
| Triceratops slots      |          2 |               1 | the Egg no longer waits for a second free slot: two thirds more Triceratops, Stampede use from 50% to 55%       |
| Triceratops hatch time |          2 |               1 | on the board one round sooner (measured together with the AI bias below)                                        |
| Stampede lane terrain  | Grass only | Grass or Forest | the named fallback: a lane was open on 8% of Triceratops-turns, Stampede use rose from 28% to 42% with it alone |

Hatch times, slots, and costs were tried first, as section 15.1 asks: a
cheaper and faster-hatching T-Rex and Triceratops, a cheaper Ankylosaurus and
Raptor, and an Ankylosaurus that hatches in one turn did not move the win
rates. Tougher beasts (Raptor 14 HP, Ankylosaurus 24 HP, Triceratops 22 HP)
did not either.

The Normal AI changes are Dinosaur-seat only and leave every match without a
Dinosaur seat byte-identical: the first-Triceratops production bias is 20
(was 4); the next technology toward the Triceratops or the T-Rex is
researched at priority 1170 once the seat owns two cities; and an unmoved
Triceratops with no lane tile in reach walks toward the nearest launch tile.
See [Normal AI](../architecture/NORMAL_AI.md#revision-19-dinosaur-play-pulp_wars-c875).

Measured after tuning on the seven Dinosaur pairings of the section 15.2
matrix (2,100 games; the nine earlier pairings and the four-seat mixes were
not re-run after tuning, see the report): Dinosaurs win 55.8% of decided
games against Humans, 47.4% against Undead, and 45.3% against Goblins; the
worst Dinosaur cap rate is 0.7 points above the non-Dinosaur reference;
Stampede is used in 52.6% of the seat-games with Sawmilling; an Egg is
destroyed by an enemy in 25.7% of seat-games (3.6% of Eggs laid); a unit
reaches Big in 80.0% of seat-games; a T-Rex Egg is laid in 39.0% of the
seat-games of matches that last 35 rounds or more; no errors, stalls, or
exceptions; and a 24-match parity run without a Dinosaur seat is identical
to the untuned tree in every command, event, and state.

Not changed, and left for revision 20: the named fallbacks for the Shaman
Hatch and the hatch time 2 for the Raptor and Spitter (no evidence called
for them), the T-Rex, and every other value of section 15.1.

## 16. Decisions made in this spec

Each fills a gap in the brief with the simplest rule consistent with the
engine; the root may change any of them.

1. **An Egg is a unit with the form `EGG`** plus a countdown list
   (`GameStateV7.eggs`), not a separate entity: every existing unit rule
   (occupancy, fog, targeting, splash, blasts, credit, capacity, saves)
   applies with no second code path, and the `LAND` gates exclude it from
   every active ability by default.
2. **Growth is derived from `kills`;** no state field. `maxHp` is validated
   against `kills` for growing roles.
3. **Both growth stages add 4 maximum and 4 current HP.** The brief words
   the heal only for Big; one rule for both stages matches Promotion ("+5
   maximum and current HP") and is easier to state.
4. **Growth is automatic,** at the moment of kill credit, with no command:
   "grows when it kills" needs no button, and the AI cannot forget it.
5. **Alpha's +1 Attack applies to attacks only.** Retaliation damage in this
   engine depends on Defense, so there is nothing else for it to apply to.
6. **Egg Defense is 1 with no cover and no fortification** (the embarked
   rule): a Fighter destroys a fresh Egg in one hit, a Goblin needs two, and
   Nesting's +4 HP lets an Egg survive one Fighter hit.
7. **Eggs take damage from every source and take no status:** immune to
   Plague and Bitten as the brief says, and also never healed, Inspired, or
   pushed. Wail hits them.
8. **Nest tiles** are the ring tiles of the laying city's own territory that
   a unit could be placed on (the reward-displacement predicate): land, no
   site, no unit, no chest, Mountain only with Engineering. Forest and
   improved tiles are allowed.
9. **Laying does not need an empty center,** so a garrisoned Dinosaur city
   can still produce; this is a real difference from training and costs no
   rule.
10. **`TRAIN` never produces an egg-laid role** for a Dinosaur seat; the
    Caveman and Shaman are the only trained land units.
11. **Hatch countdown in owner Start Turns,** hatching into a ready unit:
    hatch time 1 has the tempo of training, with the Egg's fragility as the
    price.
12. **The hatch step runs after Plague and before Windmill healing and
    income,** so an Egg stays immune through the Plague step and a hatchling
    counts for that turn's Muster.
13. **Nesting is read when the Egg is laid** and never changes an Egg on the
    board.
14. **Eggs of a captured city are destroyed** (the root default), as
    uncredited removals with the new `UNIT_DIED` cause `CITY_CAPTURED`.
15. **Eggs can be abandoned with `DISBAND`** for half the printed cost (the
    root default), at any time, without a city action.
16. **No separate "Egg destroyed" event:** an Egg dies with `UNIT_DIED`; the
    UI and telemetry know it was an Egg from its form before the command.
17. **An Egg's role, HP, and countdown are public** on a visible Egg.
18. **An Egg does not count for Muster** until it hatches, and counts as a
    unit in the leaderboard unit count.
19. **Shaman Hatch needs no technology** and hatches at once into an
    exhausted unit, but never an Egg laid this turn (root decision), known
    from the boolean `laidThisTurn` on the `eggs` entry, which the owner's
    Start Turn clears: the simplest bounded state, with no turn counter.
20. **Capacity is a slot sum,** resolved through each unit's owner; reward
    units and risings may exceed it, and the capturing unit keeps its slots.
21. **No Dinosaur capacity bonus:** "fewer" comes from the slots, and
    "stronger" from the stats and growth.
22. **Stampede lanes are open ground:** every lane tile is explored Grass
    land with no chest; Forest, Mountain, and water close a lane. It gives
    opponents a counter (stand in cover, block the lane) and Dinosaurs a use
    for Clear Forest, which their Sawmilling path already unlocks.
    **Changed by `pulp_wars-c87.8`:** a Forest lane tile is open too
    ([section 15.4](#154-tuning-record-pulp_wars-c878)); a Mountain, water,
    a chest, and a blocking unit still close a lane, and a target standing in
    a Forest keeps its cover.
23. **Hostile ZOC never affects a Stampede,** and Roads are irrelevant.
24. **Every lane tile must be explored,** which makes hidden units in the
    lane impossible and the Stampede preview exact; the brief's "deterministic
    stop" is therefore not needed (concern 2).
25. **A chest closes a lane,** keeping Stampede free of PRNG draws.
26. **Stampede uses the ordinary damage formula** with the run bonus as
    Attack; the defender keeps cover and fortification.
27. **Push reuses the existing Push conditions exactly,** and a blocked push
    has no further effect.
28. **The Triceratops follows a pushed target and advances after a kill,**
    including onto a city or village center, and never captures.
29. **Stampede destroys Field Defense on the target tile** (reason
    `CATAPULT`) whether or not the target survives, and so does the
    Triceratops's ordinary Attack (role parity with the Catapult).
30. **The Triceratops advances after an ordinary melee kill,** unlike the
    Catapult: it is a melee body.
31. **Stampede is resolved as a run (`UNIT_MOVED`) plus an ordinary
    `COMBAT_RESOLVED`** with a `stampede` field, not a new resolution event:
    existing projection, animation, log, and telemetry code applies.
32. **War Drums keeps the Rally exclusion of `SIEGE` roles,** so a
    Triceratops is never Inspired and the Stampede formula has no Inspired
    term.
33. **Acid applies to the Spitter's attacks only** and destroys nothing.
34. **Armoured applies before the HP cap,** leaves 0 and 1 unchanged, and
    works while embarked.
35. **The T-Rex has Move 2** (the brief's table), one less than the Knight.
36. **The treasure unit's role is a faction rule;** the event literal stays
    `KNIGHT`.
37. **Showcase:** Dinosaur units start hatched at stage 0 with unchanged
    homes, so the capital starts one slot over capacity. (Exactly full since
    `pulp_wars-c87.8` made the Triceratops a one-slot unit.)
38. **Names:** commands `LAY_EGG`, `HATCH`, `STAMPEDE`; parameters
    `targetUnitId` and `eggUnitId` (the engine's unit-ID naming, where the
    brief wrote `targetId` and `eggId`); events `EGG_LAID`, `EGG_HATCHED`,
    `UNIT_GREW`; cause `CITY_CAPTURED`; errors `STAMPEDE_NOT_LEGAL`,
    `HATCH_NOT_LEGAL`, `UNIT_IS_EGG`; previews `previewLayEggV7`,
    `previewHatchV7`, `previewStampedeV7`, `queryStampedeLanesV7`; unlock
    kind `NESTING`; abilities `STAMPEDE`, `HATCH`, `ACID`, `ARMOURED`,
    `GROW`; the stage names Big and Alpha.
39. **All schema shapes land in `c87.2`** with the identity; `c87.3` adds
    behaviour only.

## 17. Concerns and root decisions

1. **Widening `form`.** The engine, queries, AI, and renderer test `form`
   in roughly two hundred places, and several read "not `LAND`" as "afloat"
   (state parsing requires a non-`LAND` unit to stand on water; Push compares
   land and water kind; ZOC, blockade, and attack-from-shore rules branch on
   it). Each must be audited in `c87.3`, with the audit test of
   [section 14](#14-implementation-split-and-test-expectations). The
   alternative (a `LAND` unit flagged as an Egg) fails the other way: a
   missed site lets an Egg attack, retaliate, capture, or project ZOC. The
   chosen form fails safe, but the audit is real work.
2. **"Hidden units discovered in the lane (deterministic stop)"** from the
   brief cannot occur: visibility is "the tile is explored", and the lane
   must be explored. This spec therefore has no interruption rule. If the
   root wants Stampedes into unexplored ground, an interruption rule (stop on
   the last free tile, no attack) would be needed, and the preview would no
   longer be exact.
3. **Open-ground lanes may make Stampede rare** on Woodland and Highlands
   maps (56% Forest, 45% Mountain). The acceptance target (Stampede in half
   of the Sawmilling seat-games) will show it. The fallback within the
   mechanic is to let a Forest lane tile count as open, listed in
   [section 15.1](#151-tuning-bounds). **Decided (root):** Grass only, with
   that fallback. **Outcome (`pulp_wars-c87.8`):** the fallback was applied;
   with Grass-only lanes a lane was open on 7% of Triceratops-turns and
   Stampede was used in 28% of the seat-games with Sawmilling
   ([section 15.4](#154-tuning-record-pulp_wars-c878)).
4. **Stampede evicts city defenders.** A push off a center followed by the
   Triceratops standing on it besieges the city and opens it for a capturer
   on a later turn (the Triceratops itself blocks the center until it moves).
   This is the siege role the brief asks for, and Walls still count in the
   hit, but it is stronger against cities than a Catapult. **Decided
   (root):** kept; watch item for `c87.8`.
5. **Stampede damage is high:** from distance 3 it kills a full-HP Fighter
   and leaves a Guard at 1 HP, with no retaliation. The costs are the
   unmoved requirement, the lane, the two slots, and the exposed final tile.
   The bounds allow +0.5 per tile.
6. **Shaman Hatch shortens the hatch delay** for the price of a Shaman's
   action. **Decided (root):** Hatch stays immediate but is not legal on an
   Egg laid this turn, so a T-Rex Egg laid on turn `N` can be hatched on turn
   `N + 1` and act on `N + 2` (instead of `N + 3`), and every Egg is exposed
   for at least one round. If this is still too strong, the fallback is
   "Hatch reduces the countdown by 1"
   ([section 15.1](#151-tuning-bounds)).
7. **Both growth stages heal** ([decision 3](#16-decisions-made-in-this-spec))
   differs from the brief's wording. **Decided (root):** both stages heal.
8. **Snowballing.** Grown units are worth protecting and killing; a
   Rampaging T-Rex heals 4 on its first kill of a turn. Against that, Eggs
   and low unit counts make early losses expensive. `c87.8` reports grown
   units per game and their survival.
9. **Hatch time 1 Eggs are close to ordinary training** with a 6-HP window
   of one enemy turn and a spawn tile next to the city instead of on it. If
   Eggs turn out irrelevant as targets, the bounds allow hatch time 2 for
   the Raptor and Spitter.
10. **Level-1 capitals hold two slots,** so a Dinosaur seat cannot lay a
    Triceratops or T-Rex Egg until its city grows or its Caveman leaves the
    roster. Intended ("fewer"), but it delays the faction's signature units;
    slots are a first tuning lever. **Outcome (`pulp_wars-c87.8`):** the
    Triceratops uses one slot; the T-Rex keeps two
    ([section 15.4](#154-tuning-record-pulp_wars-c878)).
11. **Showcase capital over capacity** ([decision 37](#16-decisions-made-in-this-spec)):
    the existing Showcase test "no capacity exceeded" must exclude Dinosaur
    seats, and the Showcase shows no Egg and no grown unit unless the player
    makes them. The alternative is faction-specific homes (the T-Rex homed to
    North), which breaks "same homes for every faction". **Decided (root):**
    the capital may start over capacity.
12. **AI command cap and planning cost.** `LAY_EGG` offers up to five roles
    times eight tiles per city, which enlarges the public command list;
    `c87.5` should check the public-planning benchmarks.
13. **Egg art and readability.** One Egg sprite for every role keeps the art
    small, but the role inside is then visible only through unit info and
    the countdown marker. **Decided (root):** one Egg sprite, subject key
    `UNIT:DINOSAUR:EGG`.
14. **Public Egg information** ([decision 17](#16-decisions-made-in-this-spec))
    tells opponents exactly what hatches when. It follows the Plague
    precedent and keeps the AI honest, but a hidden role would be a valid
    alternative. **Decided (root):** Egg contents are public.

**Root decisions (2026-10-01):** the root approved this contract with one
amendment. (1) Both growth stages heal 4 (decision 3). (2) Stampede lanes
are open Grass only (decision 22); "a Forest lane tile counts as open" is a
named fallback for `pulp_wars-c87.8`. (3) A Stampede may push a defender off
a city or village center, and the Triceratops that follows besieges but
never captures (decision 28). (4) **Amendment:** Shaman Hatch stays
immediate but is not legal on an Egg laid during the current turn
(`HATCH_NOT_LEGAL` with reason `LAID_THIS_TURN`, never offered), tracked by
`laidThisTurn` on the `eggs` entry; "Hatch reduces the countdown by 1" stays
a named fallback. (5) The Showcase Dinosaur capital may start over capacity
(decision 37). (6) An Egg's role, HP, and countdown are public
(decision 17). (7) One Egg sprite for every role, with the subject key
`UNIT:DINOSAUR:EGG` ([art fragment](../art/factions/DINOSAUR.md)). (8) The
command parameters are `targetUnitId` and `eggUnitId` (decision 38). Every
other decision and concern is accepted as written; concerns 5, 8, 9, 10,
and 12 are watch items for `pulp_wars-c87.5` and `pulp_wars-c87.8`.
