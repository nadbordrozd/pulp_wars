# Ruleset 7 revision 13: Undead faction

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

**Status:** implemented and folded into
[Ruleset 7: current rules](RULESET_7_CURRENT.md) by `pulp_wars-vkq.16`; that
document is the authoritative description of the running game
(`pulp-wars-poc-7r16`). This overlay remains as design history and exact
schema detail. Revisions [14](RULESET_7_REVISION_14_BALANCE.md),
[15](RULESET_7_REVISION_15_BALANCE.md), and [16](RULESET_7_REVISION_16.md)
changed some of its values, and the development flag of
[section 10.2](#102-development-flag-and-placeholder-art) has been removed:
faction choice is always offered in setup.

**Ruleset ID:** `pulp-wars-poc-7r13`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (unchanged)

**Scope:** this document is an overlay over the revision-12 contract in
[Ruleset 7: current rules](RULESET_7_CURRENT.md). It adds a second playable
faction, `UNDEAD`, and changes only identity, faction registration, setup,
the unit roster of Undead seats, the Undead faction rules (Graves, Restless,
risings), six Undead abilities, the Undead substitutions for rewards and
treasure, and the commands, events, views, UI, and Normal AI needed to play
them. Every unmentioned revision-12 rule stays in force for both factions.
Rulesets 5 and 6 and historical Ruleset 7 fixtures remain frozen.

**Identity of the faction:** Humans are sustain; Undead are attrition. Death
feeds the Undead through Graves, raising, infection, and lifesteal. Economy,
the technology graph, and every non-unit mechanic are identical to the Human
(`ORIGINAL`) faction, even where that fits the theme poorly. The design
direction follows
[the faction design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#4-a-transferable-role-is-not-a-reskin):
the Necromancer is the Undead support role, not a reskinned Captain.

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. User decisions

The user approved these defaults on 2026-09-29. They are rules of this
contract, not open questions.

| #   | Question                                   | Decided rule                                                                                                                                                                                                                         |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Who chooses factions                       | The human and each AI seat each have a faction chosen at setup ([section 2.2](#22-setup-and-per-seat-faction)).                                                                                                                      |
| 2   | Grave lifetime                             | Graves are permanent until raised or devoured ([section 5.1](#51-graves)).                                                                                                                                                           |
| 3   | Raise Dead cap                             | None: Raise Dead raises every eligible adjacent Grave ([section 6.2](#62-raise-dead)).                                                                                                                                               |
| 4   | Restless                                   | Kept: Undead land units recover 4 in own territory and 0 elsewhere ([section 5.3](#53-restless)).                                                                                                                                    |
| 5   | Lifesteal on retaliation                   | Yes: Lifesteal heals on attack and on retaliation ([section 6.5](#65-lifesteal)).                                                                                                                                                    |
| 6   | Wail and Lich splash against hidden units  | Follow the existing Battleship splash fog rules: Lich splash resolves canonically against hidden units and projects fog-safely; Wail targets only visible units by definition ([sections 6.6](#66-wail) and [6.7](#67-lich-splash)). |
| 7   | Undead appearance before the chibi cutover | Undead are playable behind a development flag with placeholder art: Human sprites plus a faction badge or tint, and a simple Grave marker ([section 10.2](#102-development-flag-and-placeholder-art)).                               |

## 2. Identity, factions, and compatibility

### 2.1 Identity

| Boundary                                   | Revision-13 value                                                    |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r13`                                                 |
| Game-state schema                          | `7`                                                                  |
| Command/event/save/replay numeric versions | `7`                                                                  |
| Browser autosave                           | `pulpWars.save.v7r13.current`                                        |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                           |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`                                                 |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`                         |
| Faction to tree binding                    | `ORIGINAL` → `ORIGINAL_BASELINE_V5`; `UNDEAD` → `UNDEAD_BASELINE_V1` |
| Display names                              | `ORIGINAL` is "Human"; `UNDEAD` is "Undead"                          |

- The exact ruleset ID dispatches every state, setup, save, replay, and
  release artifact. A revision-13 reader rejects `pulp-wars-poc-7r12` and
  every earlier Ruleset 7 identity; there is no migration.
- Current-route startup deletes only the known obsolete Ruleset 7 autosave
  keys, now through `pulpWars.save.v7r12.current` (the existing list plus that
  key). It preserves the Ruleset 6 save, settings, the art-set preference,
  historical fixtures, and unrelated storage.
- Numeric version 7 stays sufficient because the exact ruleset identity also
  dispatches every envelope.

### 2.2 Setup and per-seat faction

- `MatchSetupV7` keeps its exact key set. `factions` stays a dense array of
  length `aiCount + 1`; index `i` is the faction of seat `i`, and seat 0 is
  the human. Each entry is `ORIGINAL` or `UNDEAD`; factions may repeat, and
  every combination is legal (all-Human, all-Undead, or mixed).
- Each `PlayerStateV7` stores `faction = setup.factions[seat]` and the bound
  `factionTreeId`. State parsing rejects a player whose faction differs from
  its setup entry or whose tree ID does not match its faction. A faction is
  immutable for the match.
- Faction choice does not affect map generation, capital placement, turn
  order, treasure placement, or any PRNG draw: two setups that differ only in
  `factions` generate byte-identical boards, turn orders, and treasures.
- Each seat starts with its faction's start unit (the `FIGHTER` role: Fighter
  for Human, Skeleton for Undead), 5 Coins, and no technology, as in revision 12.
- Saves and replays carry the setup and players unchanged in shape, so the
  per-seat faction round-trips through save, resume, replay, and checkpoint
  hashes.

### 2.3 Faction model

Revision 13 follows the Ruleset 6 Candy precedent
([Ruleset 6 section 10](RULESET_6.md#10-faction-role-mapping-and-candy-reconciliation)):

- The frozen mechanical `UnitRoleIdV7` order is unchanged: `FIGHTER`,
  `RAIDER`, `MARKSMAN`, `GUARD`, `CAPTAIN`, `CATAPULT`, `KNIGHT`,
  `JUGGERNAUT`, `PATROL_BOAT`, `BATTLESHIP`. State, commands, and events
  serialize the mechanical role, never a faction label.
- Each faction registers its own tree with its own role table (label, cost,
  stats, abilities) and unlock list. Rules, public views, previews, UI, and AI
  resolve a unit's rule through its **owner's** faction registration. No code
  may fall back from a missing Undead entry to the Human entry.
- A unit's faction is its owner's faction. Units never change owner; Infect
  removes the victim and creates a new unit ([section 6.4](#64-infect)).
- **Living** means any unit whose owner's faction is not `UNDEAD`. The term
  matters only for Wail. Elsewhere in the Ruleset 7 documents, "living unit"
  still means a unit currently on the board (for example capacity and the
  Muster count); the current-rules fold (`pulp_wars-vkq.16`) should reword
  those uses to avoid the clash.

| Mechanical role | Human (`ORIGINAL`) | Undead (`UNDEAD`) |
| --------------- | ------------------ | ----------------- |
| `FIGHTER`       | Fighter            | Skeleton          |
| `RAIDER`        | Raider             | Ghoul             |
| `MARKSMAN`      | Marksman           | Banshee           |
| `GUARD`         | Guard              | Zombie            |
| `CAPTAIN`       | Captain            | Necromancer       |
| `CATAPULT`      | Catapult           | Lich              |
| `KNIGHT`        | Knight             | Vampire           |
| `JUGGERNAUT`    | Juggernaut         | Abomination       |
| `PATROL_BOAT`   | Patrol Boat        | Patrol Boat       |
| `BATTLESHIP`    | Battleship         | Battleship        |

## 3. Undead roster

Tactical-role metadata equals that of the same mechanical role (`LINE`,
`SKIRMISHER`, `RANGED`, `DEFENDER`, `SUPPORT`, `SIEGE`, `BREAKTHROUGH`,
`MYTHIC`, `NAVAL_SCREEN`, `NAVAL_CAPITAL`).

| Unit        | Role          | Tech              | Cost |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Abilities                                         |
| ----------- | ------------- | ----------------- | ---: | --: | -----------------: | -------------------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------------------------------- |
| Skeleton    | `FIGHTER`     | start             |    2 |  10 |              2 (4) |                2 (4) |    1 |     1 |     1 | yes               | yes     | Field Defense                                     |
| Ghoul       | `RAIDER`      | Scouting          |    3 |  10 |              2 (4) |                1 (2) |    2 |     1 |     2 | yes               | yes     | Charge (Raiding); Devour                          |
| Banshee     | `MARKSMAN`    | Marksmanship      |    3 |   8 |              1 (2) |                1 (2) |    1 |     — |    1¹ | Wail: yes         | yes     | Wail; no targeted Attack                          |
| Zombie      | `GUARD`       | Drill             |    3 |  20 |              2 (4) |                2 (4) |    1 |     1 |     1 | no                | yes     | Field Defense; Infect; never advances             |
| Necromancer | `CAPTAIN`     | Administration    |    5 |  10 |              1 (2) |                1 (2) |    1 |     1 |     1 | yes               | no      | Frenzy; Raise Dead                                |
| Lich        | `CATAPULT`    | Sawmilling        |    8 |  10 |            2.5 (5) |                1 (2) |    1 |   2–3 |     1 | no                | no      | splash; Field Defense destruction; never advances |
| Vampire     | `KNIGHT`      | Chivalry          |    9 |  10 |              3 (6) |                1 (2) |    3 |     1 |     1 | yes               | no      | Lifesteal                                         |
| Abomination | `JUGGERNAUT`  | reward only       |    — |  40 |              4 (8) |                4 (8) |    1 |     1 |     1 | yes               | yes     | Push                                              |
| Patrol Boat | `PATROL_BOAT` | Shorecraft        |    5 |  10 |              2 (4) |                2 (4) |    3 |     1 |     2 | yes               | no      | naval                                             |
| Battleship  | `BATTLESHIP`  | Naval Engineering |   16 |  25 |             6 (12) |                4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                                     |

¹ Banshee Sight becomes 2 with Fieldcraft.

- **Skeleton** has exact Fighter parity: Field Defense (Fortification),
  capture, Pillage (Raiding), Disband. Raise Dead also creates Skeletons.
- **Ghoul** keeps Raider Charge (Raiding), Pillage, and Fieldcraft Forest
  freedom. It has no Escape; Devour replaces it.
- **Banshee** is deliberately weak. It has no `ATTACK` ability: it cannot
  issue `ATTACK`, never retaliates, and its role rule stores `range: 0` and
  `minimumRange: 0`. Its Attack value exists only for Wail. It keeps capture,
  Pillage, Disband, Fieldcraft Forest freedom, and ordinary land ZOC (it
  projects no ZOC onto water, because it cannot attack an afloat unit).
- **Zombie** has Guard parity for movement, capture, Field Defense, and
  "cannot attack after moving", and it never advances after a kill.
- **Necromancer** cannot capture. Its primary actions are Attack, Frenzy, and
  Raise Dead. It has no Tend Wounded.
- **Lich** has Catapult parity for minimum range, "cannot attack after
  moving", no capture, no advance, and Field Defense destruction on the
  primary target tile. It adds splash ([section 6.7](#67-lich-splash)).
- **Vampire** cannot capture and has no Overrun.
- **Abomination** has exact Juggernaut parity: reward only, Push, capture,
  cannot Pillage or Disband.
- **Patrol Boat and Battleship** are identical to the Human units: same
  names, stats, abilities, and art.
- Disband refunds `floor(cost / 2)` as usual: Skeleton 1, Ghoul 1, Banshee 1,
  Zombie 1, Necromancer 2, Lich 4, Vampire 4. Arms Industry and the Shipyard
  discount apply to Undead roles exactly as to Human roles.
- An embarked Undead land unit follows the ordinary embarked rules (Move 3 on
  water, Defense 1, no Attack, no retaliation, no ZOC, no recovery).

## 4. Technology

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rules, and every economic and movement unlock of
`UNDEAD_BASELINE_V1` are identical to `ORIGINAL_BASELINE_V5`
([current rules section 6](RULESET_7_CURRENT.md#6-technology)). The Undead
registration differs only in two unlock entries:

- `ADMINISTRATION` replaces the `CAPTAIN_SUPPORT` unlock with
  `NECROMANCER_SUPPORT` (Frenzy and Raise Dead).
- `CHIVALRY` has no `OVERRUN` unlock.

All other unlock objects, including `UNIT_ROLE` entries, the Fieldcraft
Forest freedom for `RAIDER` and `MARKSMAN`, and the `ROLE_SIGHT` entries, are
the same mechanical values. The technology tree, research offers, and Help
render unlock text from the **viewer's** faction:

| Technology        | Human text (unchanged)                                                             | Undead text                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Administration    | Captain (Rally, Tend Wounded); Market; Disband                                     | Necromancer (Frenzy, Raise Dead); Market; Disband                               |
| Sawmilling        | Sawmill; Catapult                                                                  | Sawmill; Lich                                                                   |
| Marksmanship      | Marksman                                                                           | Banshee                                                                         |
| Fieldcraft        | Replant Forest; Raider and Marksman ignore Forest movement stops; Marksman Sight 2 | Replant Forest; Ghoul and Banshee ignore Forest movement stops; Banshee Sight 2 |
| Scouting          | Raider; Raider Sight 2                                                             | Ghoul; Ghoul Sight 2                                                            |
| Raiding           | Pillage for all trainable land roles; Raider Charge                                | Pillage for all trainable land roles; Ghoul Charge                              |
| Chivalry          | Knight; Overrun; Cultivate Forest                                                  | Vampire; Cultivate Forest                                                       |
| Drill             | reveal Ore; Guard; first-hostile-capture Spoils (2 Coins)                          | reveal Ore; Zombie; first-hostile-capture Spoils (2 Coins)                      |
| Fortification     | Fighter/Guard Build Field Defense                                                  | Skeleton/Zombie Build Field Defense                                             |
| Shorecraft        | Harvest Fish; Build Port; embarkation and Shallow Water transport; Patrol Boat     | same as Human                                                                   |
| Naval Engineering | Battleship; Shipyard; −2 Coin naval training at a Shipyard                         | same as Human                                                                   |

The other twelve technologies have identical text for both factions.

## 5. Faction-wide rules

### 5.1 Graves

A Grave is a tile marker. It exists only in a match whose setup includes at
least one `UNDEAD` seat; that property is fixed at setup and does not change
when Undead seats are eliminated. In a match without an Undead seat no Grave
is ever created.

**Creation.** When a unit dies and all of the following hold, one Grave is
created on the tile where it died:

- the unit was in `LAND` form (not `EMBARKED`, not `NAVAL`), of any owner and
  either faction;
- it died in combat, with death cause `ATTACK`, `RETALIATION`, `SPLASH`
  (Battleship or Lich), or `WAIL`;
- the tile is land and is not a settlement site (`CAPITAL`, `CITY`, or
  `VILLAGE` center);
- the death was not converted by Infect; and
- the tile has no Grave yet (at most one Grave per tile; a death on a Grave
  tile creates nothing and emits no event).

No Grave is created by a water death, an embarked death, Disband, reward
displacement removal, elimination removal (`UNIT_DIED` cause `ELIMINATION`),
or Infect.

**Properties.** A Grave blocks nothing: it does not stop, cost, or block
movement, occupancy, ZOC, training, placement of reward units, treasure
Knights, displaced units, buildings, Monuments, Roads, Field Defense, or any
economic action, and it is unaffected by them. It persists through terrain
transforms, Redevelop, Pillage, capture, and territory changes. It is removed
only by Raise Dead or Devour. A Grave and a unit may share a tile.

**State and hashing.** `GameStateV7` gains `graves: readonly CoordV7[]`,
sorted by `(y, x)` with no duplicates, following the `treasureChests`
precedent. It is part of the canonical state, so saves, replay checkpoints,
and state hashes cover it. State parsing rejects a Grave that is off the
board, on water, on a settlement site, or on a treasure-chest coordinate, and
rejects any non-empty `graves` when the setup has no `UNDEAD` seat.

**Public view.** `PlayerViewV7` gains `graves`, the viewer-explored subset of
`state.graves` in the same order, exactly like `treasureChests`. Because
exploration never shrinks and there is no live re-fog, every explored tile
shows its current Grave state; unexplored tiles show none.

**Event.** Each created Grave emits `GRAVE_CREATED { at }` immediately after
the `UNIT_DIED` event of the unit that created it. It is projected to a viewer
exactly when that viewer has explored `at` before or after the command, so a
hidden kill on a tile the viewer has not explored reveals nothing.

### 5.2 Grave interactions

| Situation                                   | Rule                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Melee kill with advance                     | The Grave is created on the death tile first; the attacker then advances onto it and stands on the Grave. Field Defense `OCCUPATION` destruction is unchanged.                                                       |
| Human Knight Overrun                        | Each kill in the chain leaves a Grave on its death tile, which the Knight occupies on advance. An Overrun that ends in the Knight's death leaves a Grave for the Knight (or an Infect rising if a Zombie killed it). |
| City or village center                      | No Grave. Graves therefore never sit on centers and Raise Dead can never place a unit on a center.                                                                                                                   |
| Water, Port or Shipyard tile, embarked unit | No Grave. Naval units and embarked units never leave Graves.                                                                                                                                                         |
| Disband, displacement removal, elimination  | No Grave (not combat deaths).                                                                                                                                                                                        |
| Infect                                      | No Grave for the infected victim; an existing Grave on that tile stays under the risen Zombie.                                                                                                                       |
| Juggernaut or Abomination                   | Push never kills. A kill by either leaves a Grave on the victim's tile before the killer advances. A unit pushed onto a Grave stands on it; the Grave is unchanged.                                                  |
| Battleship or Lich splash kills             | Each qualifying splash death leaves a Grave, including the death of a unit hidden from the attacker. The Grave is visible only to viewers who have explored the tile.                                                |
| Wail kills                                  | Each qualifying death leaves a Grave.                                                                                                                                                                                |
| Capture                                     | Capture never creates or removes a Grave.                                                                                                                                                                            |
| Field Defense, Road, improvement, resource  | All coexist with a Grave; none of them affects Grave creation or removal.                                                                                                                                            |
| Treasure chest                              | A unit consumes a chest when it enters the tile, so no unit can die on a chest tile and a Grave never shares a tile with a chest.                                                                                    |

### 5.3 Restless

Restless changes only land-form recovery of units owned by an Undead seat
([current rules section 10](RULESET_7_CURRENT.md#10-recovery-and-support)):

| Recovery source               | Undead amount                                             |
| ----------------------------- | --------------------------------------------------------- |
| Explicit `RECOVER`, land form | 4 in own territory; illegal elsewhere                     |
| Idle recovery, land form      | 4 in own territory; 0 elsewhere (no event)                |
| Naval units                   | unchanged naval rule (4 on or next to an own active dock) |
| Embarked units                | none (unchanged)                                          |
| Windmill Start Turn healing   | unchanged (up to 6)                                       |

- An explicit `RECOVER` by an Undead land unit outside its owner's territory
  rejects atomically with `RECOVER_NOT_LEGAL { reason: "RESTLESS" }`, and the
  public command query does not offer it.
- End Turn idle recovery skips such a unit entirely: no HP change and no
  `UNIT_RECOVERED` event.
- Own territory is the existing test: the tile's territory city is owned by
  the unit's owner.

### 5.4 Risings and capacity

Raise Dead and Infect create **risings**. A rising:

- is owned by the creating unit's owner and is homed to the creating unit's
  home city (`homeCityId`, which is `null` when the creator is orphaned, and
  the rising is then orphaned too);
- may exceed that city's capacity, exactly like a reward unit; an
  over-capacity city cannot train until it has a free slot again, and
  capacity loss never removes units;
- appears in place on its tile regardless of the movement-entry rules
  (Mountain without Engineering, allied territory), because it does not move;
  it never destroys Field Defense on arrival;
- has 0 kills, is not veteran, has `captureEligible: false`, and is exhausted
  (the existing exhausted activation) until its owner's next Start Turn, where
  capture eligibility is computed normally; and
- reveals its ordinary sight radius for its owner at creation, emitting
  `TILES_REVEALED` for newly explored cells.

## 6. Undead abilities

### 6.1 Frenzy

Frenzy is Rally under an Undead label; its mechanics, command, flag, and
event are the existing ones: command `RALLY`, activation flag `inspired`
(labelled "Frenzied"), and event `UNITS_RALLIED`.

- A Necromancer in land form that has not used a primary action (it may have
  moved) makes every adjacent own land-form unit Frenzied when that unit is
  not already Frenzied, is not `SUPPORT` or `SIEGE` (not a Necromancer or
  Lich), and has the `ATTACK` ability (so not a Banshee).
- Frenzied is Inspired: +1 Attack (+2 `attack2`) on the unit's first accepted
  `ATTACK` this turn, expiring at End Turn, not stacking, and destroying Field
  Defense under the existing `INSPIRED` rule. It never affects Wail.
- With no eligible target the command rejects with the existing
  `HEAL_TARGET_NOT_FOUND`. Frenzy uses the Necromancer's primary action.

### 6.2 Raise Dead

`RAISE_DEAD { unitId }`, a Necromancer primary action costing 0 Coins and no
technology beyond the Necromancer's own.

- **Legality:** the unit is the actor's own, alive, in land form, has the
  `RAISE_DEAD` ability (Undead `CAPTAIN`), and has not used a primary action
  (it may have moved). At least one **eligible Grave** must exist.
- **Eligible Graves:** every Grave on the eight cells adjacent to the
  Necromancer with no unit of any owner on it. There is no cap and no terrain
  or territory filter ([section 5.4](#54-risings-and-capacity)).
- **Result:** in `(y, x)` order, each eligible Grave is removed and replaced by
  a Skeleton rising (`FIGHTER` role) at 5 HP out of 10, taking consecutive new
  unit IDs in that order. The Necromancer's primary action is spent and it is
  handled (`specialActed` and `handled` set), as for Frenzy.
- **Rejections (atomic):** wrong owner or role or form →
  existing unit errors (`UNIT_NOT_OWNED`, `UNIT_ROLE_INVALID`); primary action
  used → `UNIT_ALREADY_ACTED`; no eligible Grave →
  `RAISE_DEAD_NOT_LEGAL { reason: "NO_GRAVE" }`.
- **Events:** `DEAD_RAISED { playerId, unitId, results: [{ unitId, at }] }`
  (the raising Necromancer and each new Skeleton with its former Grave
  coordinate, in `(y, x)` order), then `TILES_REVEALED` for the owner, then
  the ordinary economy, reward-settlement, and achievement tail.
- **Preview and fog:** `previewRaiseDeadV7` returns the eligible Grave
  coordinates. Every unit reveals at least radius 1 wherever it arrives, so a
  Necromancer's eight neighbours are always explored by its owner, and the
  public preview equals the resolution exactly.
- **Projection:** `DEAD_RAISED` is projected to a viewer who can see the
  Necromancer before or after the command, with `results` filtered to Skeletons
  visible to that viewer afterwards. Skeletons listed in a projected
  `DEAD_RAISED` count as visibly created (no duplicate `UNIT_REVEALED`). A
  viewer who cannot see the Necromancer receives no `DEAD_RAISED`, but receives
  the ordinary `UNIT_REVEALED` for each Skeleton on a tile it has explored; the
  removed Graves disappear from its next view.

### 6.3 Devour

`DEVOUR { unitId }`, a Ghoul terminal action.

- **Legality:** the unit is the actor's own, alive, in land form, has the
  `DEVOUR` ability (Undead `RAIDER`), has not used a primary action (it may
  have moved, including a Charge-length move), and stands on a Grave. Devour
  is legal at full HP (to deny the Grave to a Necromancer).
- **Result:** the Grave is removed, the Ghoul's HP becomes its maximum HP, and
  the Ghoul's primary action is spent and it is handled. It cannot Attack,
  Move, Capture, or Pillage afterwards this turn.
- **Rejections (atomic):** unit errors as for Raise Dead; no Grave under the
  Ghoul → `DEVOUR_NOT_LEGAL { reason: "NO_GRAVE" }`.
- **Events:** `GRAVE_DEVOURED { playerId, unitId, at, amount, hpAfter }`
  (`amount` may be 0), then the ordinary tail. The event is projected under the
  ordinary unit-visibility rule (a viewer who sees the Ghoul).
- **Preview:** `previewDevourV7` returns `{ at, amount, hpAfter }`; the Ghoul
  and its tile are its owner's, so the preview is exact.

### 6.4 Infect

Infect is an innate Zombie combat effect (`INFECT` ability of Undead `GUARD`).

- **Trigger:** a unit in `LAND` form is killed by a Zombie, either by the
  Zombie's `ATTACK` (the victim is the defender) or by the Zombie's
  retaliation (the victim is the attacker). Naval and embarked victims are
  never infected and follow the ordinary death rules (they leave no Grave).
  Splash and Wail never infect.
- **Result:** the victim dies normally (it is removed, `UNIT_DIED` with cause
  `ATTACK` or `RETALIATION`, and the Zombie gains the kill for promotion as
  usual). Then a Zombie rising (`GUARD` role) owned by the Zombie's owner
  appears on the victim's tile at 10 HP out of 20, homed to the Zombie's home
  city ([section 5.4](#54-risings-and-capacity)). No Grave is created for the
  victim.
- The victim may be of either faction and any land role, including a
  Juggernaut or Abomination. Infect applies on every land tile, including a
  city or village center: a victim killed on a hostile center rises as a
  Zombie that immediately besieges that city and may capture it from its
  owner's next turn.
- The killing Zombie never advances; the victim's tile is now occupied by the
  rising.
- **Events:** `UNIT_INFECTED { playerId, sourceUnitId, victimUnitId, unitId, at, homeCityId }`
  immediately after the victim's `UNIT_DIED`. Its projection uses the ordinary
  unit-visibility rule on `sourceUnitId` and `unitId`; a risen Zombie in a
  projected `UNIT_INFECTED` counts as visibly created. A viewer who cannot see
  the source Zombie still receives `UNIT_DIED` for a visible victim and the
  ordinary `UNIT_REVEALED` for the risen Zombie on an explored tile.
- **Preview:** `CombatPreviewV7` gains `defenderInfected` and
  `attackerInfected` booleans (true exactly when the corresponding death will
  be converted). Public previews compute them from the visible attacker and
  target, so they are exact.

### 6.5 Lifesteal

Lifesteal is an innate Vampire combat effect (`LIFESTEAL` ability of Undead
`KNIGHT`).

- After the Vampire deals damage, as attacker (damage to defender) or as
  retaliating defender (damage to attacker), and survives the exchange, it
  heals by the damage it dealt, capped at its maximum HP. "Damage dealt" is the
  applied amount, which is already capped at the target's current HP.
- Healing is applied after both damages of the exchange, so a Vampire that is
  killed does not heal and a surviving Vampire heals from its post-retaliation
  HP: `hpAfter = min(maxHp, hp − damageTaken + damageDealt)`.
- Frenzied bonuses increase the damage dealt and therefore the heal.
- **Preview and event:** `CombatPreviewV7` gains `attackerHeal` and
  `defenderHeal` (the exact HP healed, 0 when not applicable). They travel in
  `COMBAT_RESOLVED`; there is no separate event. Public previews compute them
  exactly from visible HP.
- Promotion (+5 max HP) raises the cap as usual. Lifesteal does not change
  kill credit.

### 6.6 Wail

`WAIL { unitId }`, a Banshee primary action. Wail is not an Attack.

- **Legality:** the unit is the actor's own, alive, in land form, has the
  `WAIL` ability (Undead `MARKSMAN`), and has not used a primary action (it may
  have moved). At least one target must exist.
- **Targets:** every unit that is alive, hostile to the actor, living (its
  owner's faction is not `UNDEAD`), visible to the actor (on a tile the actor
  has explored), and within Chebyshev distance 2 of the Banshee. Land, naval,
  and embarked units are all eligible. Allied units are never targets.
- **Damage:** for each target, the ordinary damage formula
  ([current rules section 13.2](RULESET_7_CURRENT.md#132-damage)) with the
  Banshee as attacker at `attack2 = 2` (Attack 1; no Charge and no
  Frenzied/Inspired bonus) at its current HP, and the target's own defense:
  base Defense plus fortification level for a land-form target in its owner's
  territory, Defense 1 when embarked, and Forest/Mountain cover for a
  land-form target. `damage = min(target.hp, roundHalfUp(...))`. The result
  may be 0; such a target is still listed and still satisfies legality.
- **Resolution:** all targets are computed from the pre-Wail state and applied
  together (the Banshee's HP does not change). There is no retaliation, advance,
  Push, Infect, or Field Defense destruction. Each killed target counts as a
  kill for the Banshee's promotion and leaves a Grave when
  [section 5.1](#51-graves) allows. The Banshee's primary action is spent and
  it is handled (`specialActed` and `handled` set; `attacked` stays false).
- **Rejections (atomic):** unit errors as for Raise Dead; no target →
  `WAIL_NOT_LEGAL { reason: "NO_TARGET" }`.
- **Events:** `WAIL_RESOLVED { playerId, unitId, at, results }`, where
  `results` uses the splash-entry shape `{ unitId, at, damage, dies }` sorted by
  `(y, x, unitId)`. Then, in that order, each death emits `UNIT_DIED` with the
  new cause `WAIL`, followed by its `GRAVE_CREATED` when applicable. Then the
  ordinary economy (for example a lifted blockade), reward-settlement, and
  achievement tail.
- **Preview and fog:** `previewWailV7` returns the Banshee, its `attack2`, and
  per target `{ unitId, at, defense2, defenseBonusNumerator, defenseBonusDenominator, fortificationLevel, damage, dies, leavesGrave }`.
  Because only visible units are targets, the public preview equals the
  resolution exactly and cannot reveal a hidden unit.
- **Projection:** following the Battleship splash precedent, `WAIL_RESOLVED`
  is projected to a viewer who can see the Banshee before or after, with
  `results` filtered to units the viewer owns or could see before the command.
  A viewer who cannot see the Banshee but owns a target receives only
  `COMBAT_SPLASH_DAMAGE { splash }` with its own entries, plus `UNIT_DIED` and
  `GRAVE_CREATED` for its own dead units.

### 6.7 Lich splash

The Lich attack is an ordinary targeted `ATTACK` at range 2–3 with the
existing Battleship splash rule (a `SPLASH` ability held by the Human and
Undead Battleship and the Undead Lich):

- Every other unit hostile to the Lich on the eight cells around the primary
  target takes `max(1, ceil(primary damage / 2))`, capped at its HP, where
  primary damage is the applied damage to the primary target. There is no
  retaliation from splash targets and no modifier. Splash targets include
  undead-faction units of a hostile seat (splash is not limited to living
  units).
- Splash applies only when the Lich attacks, never when it retaliates.
- Splash kills count for the Lich's promotion and leave Graves under
  [section 5.1](#51-graves).
- The Lich destroys Field Defense on the primary target tile exactly as a
  Catapult does: `FIELD_DEFENSE_DESTROYED` with the existing reason
  `CATAPULT`. Splash targets' Field Defense is unaffected.
- **Fog:** exactly the Battleship rules. Canonical resolution includes hidden
  hostile units around the target. The public combat preview lists only units
  visible to the viewer. `COMBAT_RESOLVED` is projected with `splash` filtered
  to units the viewer owns or could see before; a viewer who cannot see the
  attacker or target but owns a splashed unit receives only
  `COMBAT_SPLASH_DAMAGE` with its own entries. `UNIT_DIED` and
  `GRAVE_CREATED` follow their ordinary projection rules.

### 6.8 Combat resolution order

Revision 13 inserts the Undead steps into the existing attack transaction
([current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat)). The
whole attack still resolves from one immutable preview and is atomic.

1. Legality, unchanged (Banshee has no `ATTACK`).
2. Preview: damage both ways (Charge, Frenzied/Inspired), deaths, retaliation,
   splash (attacker with `SPLASH` only), Lifesteal heals, Infect flags, advance
   (never for a Zombie, Lich, or Catapult attacker), and Push.
3. HP: apply damage to the defender, retaliation damage to the attacker, and
   splash damage; then apply Lifesteal to a surviving Vampire.
4. Kill credit: the attacker gains the defender's death and every splash
   death; the defender gains the attacker's death.
5. Remove dead units.
6. Field Defense destruction on the primary target tile for the first
   applicable existing reason (`CATAPULT` also for a Lich; `INSPIRED` also for
   Frenzied).
7. For each death in order (defender, then splash entries in `(y, x, id)`
   order, then attacker): an Infect rising if the killer was a Zombie and the
   victim was in land form, otherwise a Grave if
   [section 5.1](#51-graves) allows.
8. Advance onto the defender's tile (over any new Grave).
9. Push.
10. Overrun continuation for a Human Knight.
11. Reveals: advance, then Push, then Infect rising.
12. Economy, reward settlement, and achievements.

The event order is: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; the
defender's `UNIT_DIED` and its `GRAVE_CREATED` or `UNIT_INFECTED`; each splash
`UNIT_DIED` and its `GRAVE_CREATED`; the attacker's `UNIT_DIED` and its
`GRAVE_CREATED` or `UNIT_INFECTED`; `UNIT_MOVED` (advance); `UNIT_PUSHED`;
`TILES_REVEALED` (advance, Push, rising); then the ordinary tail.

## 7. Rewards, treasure, and achievements

Rewards and treasure use the owner's faction registration for the same
mechanical role, so reward IDs and event literals are unchanged:

| Source                             | Human      | Undead      |
| ---------------------------------- | ---------- | ----------- |
| Starting unit                      | Fighter    | Skeleton    |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination |
| Treasure chest unit (`KNIGHT`)     | Knight     | Vampire     |

- Reward units are full HP, exhausted, and may exceed capacity; treasure
  units still need a free slot and fall back to 5 Coins, all as in revision 12.
- Muster counts distinct trainable roles owned at once under the owner's
  registration (Undead: Skeleton, Ghoul, Banshee, Zombie, Necromancer, Lich,
  Vampire, Patrol Boat, Battleship; Abomination excluded). Risings count.
- Explorer and Engineer are unchanged. Spoils are unchanged.

## 8. Commands, events, errors, and queries

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `RAISE_DEAD`, `DEVOUR`, `WAIL`
immediately after `TEND_WOUNDED`. Each takes exactly `{ kind, unitId }`.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts `DEAD_RAISED` and
`GRAVE_DEVOURED` immediately after `WOUNDED_TENDED`; `WAIL_RESOLVED`
immediately after `COMBAT_RESOLVED`; and `UNIT_INFECTED` and `GRAVE_CREATED`
immediately after `UNIT_DIED`. `UNIT_DIED.cause` gains `WAIL`. The player
event order inherits these positions.

**Combat preview.** `CombatPreviewV7` gains `attackerHeal`, `defenderHeal`
(non-negative integers) and `attackerInfected`, `defenderInfected`
(booleans). For Human-only exchanges they are always 0 and false.

**Errors.** `RuleErrorCodeV7` gains `RAISE_DEAD_NOT_LEGAL`,
`DEVOUR_NOT_LEGAL`, and `WAIL_NOT_LEGAL`. `RECOVER_NOT_LEGAL` gains the
reason `RESTLESS`.

**Public queries.** `queryPlayerCommandsV7` offers `RAISE_DEAD`, `DEVOUR`, and
`WAIL` exactly when they are legal and never offers an illegal Restless
`RECOVER`. The new previews are `previewRaiseDeadV7`, `previewDevourV7`, and
`previewWailV7`; `queryCombatPreviewV7` and `estimateCombatV7` include
Lifesteal, Infect, Lich splash, and the Zombie and Lich no-advance rules.
`queryThreatenedTilesV7` accounts for Wail (radius 2 from each tile a visible
hostile Banshee can reach) and Lich range. `publicUnitStatsV7`, the technology
tree query, and technology capabilities resolve the owning or viewing
player's registration. `PublicPlayerV7` and the leaderboard carry `UNDEAD` and
`UNDEAD_BASELINE_V1` for Undead seats.

**Visibility of owner-private facts** is unchanged. Frenzied follows the
Inspired rule (owner always; an opponent only on a visible unit).

## 9. Normal AI requirements

Normal AI must play as and against Undead (`pulp_wars-vkq.9`) while keeping
every existing guarantee: deterministic and PRNG-free, only the public view,
public commands, and public previews, never hidden state, at most 128
accepted commands per owner turn through bounded resumable work, and no
change to Human-vs-Human decisions.

As Undead it must at least:

- train from its own registration and value roles by their Undead stats and
  abilities (Banshee is not a ranged attacker; Vampire has no Overrun; Ghoul
  has no Escape);
- use Raise Dead when eligible Graves exist, weighing Skeletons gained against
  Necromancer exposure, and move Necromancers toward Grave clusters behind the
  front;
- use Devour to heal damaged Ghouls and to deny Graves near hostile
  Necromancers;
- choose Wail positions and Lich targets by summed visible damage, kills, and
  Graves created, and value Lich splash from the public preview only;
- value Vampire trades including the Lifesteal heal, and Zombie kills
  including the Infect rising;
- respect Restless by returning damaged Undead land units to own territory to
  recover; and
- use Frenzy like Rally.

Against Undead it must at least:

- avoid low-HP attacks into Zombies whose retaliation would kill and infect
  the attacker;
- prioritize Necromancers and value Graves near them as enemy potential;
- include Wail radius and Lich splash in threat evaluation; and
- keep Normal's existing city-defense and capture priorities.

Opening research keeps the revision-12 scorer
([current rules section 16](RULESET_7_CURRENT.md#16-normal-ai-summary)) for
both factions unless `pulp_wars-vkq.9` records and tests an Undead-specific
change. Headless Undead-vs-Human and Undead-vs-Undead matches must finish
without stalls, and the tactical benchmark
([tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)) gains
Undead scenarios.

## 10. UI requirements

### 10.1 Surfaces

The browser UI (`pulp_wars-vkq.8`) must, at requirement level:

- let the human choose a faction for its own seat and for each AI seat in
  setup (only while the development flag is on; default all Human);
- label every unit by its owner's faction (Undead names for Undead units,
  including opponents' units), and render the technology tree, research
  offers, action chips, and Help in the viewer's faction text
  ([section 4](#4-technology));
- show faction identity for every player (setup, leaderboard, turn banner);
- offer Raise Dead, Devour, and Wail as unit commands with previews: the
  Graves to be raised, the Devour heal, and the Wail area (radius 2) with
  per-target damage and deaths;
- show the Lich splash area and per-unit splash damage from the public preview
  (the Battleship presentation), and show Lifesteal heal and Infect rising in
  the combat preview text;
- show "Frenzy" and "Frenzied" for Undead support, and explain Restless in
  the unit status and on the unavailable Recover action;
- render a Grave marker on every explored Grave tile: a small indicator in
  the tile's bottom-right corner, drawn above units so a Grave under a unit
  stays visible (changed from "below units" by `pulp_wars-6gd.4`); and
- look identical to revision 12 in matches without an Undead seat.

### 10.2 Development flag and placeholder art

- Before the approved Undead art ships (`pulp_wars-vkq.14`), Undead faction
  choice is behind a development flag: the URL parameter `undead=1` (exactly
  one `undead` value, equal to `1`), honoured in every build and not
  persisted. Without it, setup offers no faction choice and every seat is
  Human.
- The flag gates only the setup UI. The engine, headless tools, and AI accept
  Undead seats regardless, and a save or replay with Undead seats loads and
  plays without the flag.
- Placeholder art, in both the legacy and chibi art sets: an Undead unit uses
  the Human sprite of the same mechanical role plus a faction badge or tint
  that is readable at every zoom and distinct from owner colour; the Grave is
  a simple code-native marker. Human units and Human-only matches are
  unaffected.
- `pulp_wars-vkq.16` removes the flag once the approved art is registered.
  (Done: setup now always offers a faction per seat, with no flag.)

## 11. Unchanged Human behaviour

An all-Human match (every `factions` entry `ORIGINAL`) behaves identically
to revision 12 apart from identity. For equal setups, seeds, and command
sequences it produces the same maps, legal commands, previews, accepted and
rejected commands, events, and views. The only differences are the ruleset
ID, autosave key, obsolete-key list, and new schema fields holding their
neutral values (`graves: []`, heal 0, infected false). No Grave is ever
created, no Undead command is ever offered, and every Human rule that the
code keys on a mechanical role ID (for example Overrun on `KNIGHT`, Escape on
`RAIDER`, splash on `BATTLESHIP`, advance exclusion on `CATAPULT`) must
resolve through the owner's registration with the same Human result.

Mixed matches apply each unit's own registration; Human units keep every
Human ability (Rally, Tend Wounded, Escape, Overrun) against Undead opponents.

## 12. Implementation traceability and tests

Each implementation bead proves its part with deterministic tests.

| Bead              | Scope                                                 | Required evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulp_wars-vkq.3` | identity, faction registration, roster, substitutions | exact 7r13 identity and faction/tree orders; 7r12 state/save/replay rejection; obsolete-key cleanup through `v7r12`; setup, state, save, and replay round-trip per-seat factions; faction/tree binding and mismatch rejection; faction-independent map generation; all-Human replay parity with 7r12 apart from identity; every Undead role value in section 3; Frenzy targets; no Escape, no Overrun, Banshee no Attack/retaliation; reward and treasure substitutions; Muster; per-faction unlock text; refreshed release corpus with reviewed diff |
| `pulp_wars-vkq.4` | Graves layer, Restless                                | Grave on each qualifying cause; no Grave for each exclusion in sections 5.1–5.2 (center, water, embarked, Disband, displacement, elimination, duplicate tile); none without an Undead seat; state validation; save/replay/hash coverage; explored-only public view and `GRAVE_CREATED` projection; Restless 4/0, `RESTLESS` rejection, no idle event; Windmill, naval, and Human recovery unchanged                                                                                                                                                   |
| `pulp_wars-vkq.5` | Raise Dead, Devour                                    | eligible Graves, occupied-Grave exclusion, `(y, x)` ID order, 5-HP exhausted Skeletons, home and null home, over-capacity, no cap, Mountain/allied placement, no Field Defense destruction, Move-then-act, terminal state, atomic rejections, previews equal resolution, projections                                                                                                                                                                                                                                                                  |
| `pulp_wars-vkq.6` | Infect, Lifesteal                                     | Infect on attack and retaliation, center siege case, naval/embarked exclusion, no Grave, no advance, 10-HP exhausted Zombie homing; Lifesteal on attack and retaliation, cap, killed Vampire, Frenzied bonus; preview fields; unchanged kill credit and promotion; event order in section 6.8                                                                                                                                                                                                                                                         |
| `pulp_wars-vkq.7` | Wail, Lich splash                                     | Wail target set (radius, hostility, living, visibility, naval/embarked), zero-damage targets, no retaliation/advance/Field Defense destruction, kills, Graves, promotion credit; Lich range, no attack after move, splash on attack only, hidden splash victims, `CATAPULT` Field Defense destruction; previews never reveal hidden units; hidden-source projection as `COMBAT_SPLASH_DAMAGE`                                                                                                                                                         |
| `pulp_wars-vkq.8` | UI                                                    | section 10 surfaces; flag gating; placeholder art; start and finish a match as and against Undead in the browser; Human-only screens unchanged                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pulp_wars-vkq.9` | Normal AI                                             | section 9 behaviours; determinism and bounds; headless Undead-vs-Human and Undead-vs-Undead completion; tactical benchmark scenarios                                                                                                                                                                                                                                                                                                                                                                                                                  |

`pulp_wars-vkq.10` may change numbers (costs, HP, Raise Dead cap, Grave
lifetime, Restless) only as its balance report justifies, and must change this
contract, the code, and the tests together. `pulp_wars-vkq.16` folds this
overlay into the current-rules document and removes the flag.

## 13. Decisions made in this spec

These implementation-level choices fill gaps in the design baseline. Each is
the simplest rule consistent with existing engine conventions; the user may
change any of them at the review gate.

1. **Shared mechanical roles.** Undead units reuse the ten mechanical role
   IDs, resolved through the owner's faction registration (the Ruleset 6 Candy
   precedent). Consequences: reward IDs (`MILITIA`, `JUGGERNAUT`), treasure
   literal `KNIGHT`, and Field Defense reason `CATAPULT` keep their values;
   Frenzy reuses `RALLY`, `inspired`, and `UNITS_RALLIED`.
2. **IDs and names.** Faction `UNDEAD`, tree `UNDEAD_BASELINE_V1`, unlock kind
   `NECROMANCER_SUPPORT`; abilities `DEVOUR`, `INFECT`, `LIFESTEAL`,
   `RAISE_DEAD`, `WAIL`, `SPLASH`; commands `RAISE_DEAD`, `DEVOUR`, `WAIL`;
   events `DEAD_RAISED`, `GRAVE_DEVOURED`, `WAIL_RESOLVED`, `UNIT_INFECTED`,
   `GRAVE_CREATED`; death cause `WAIL`; errors `RAISE_DEAD_NOT_LEGAL`,
   `DEVOUR_NOT_LEGAL`, `WAIL_NOT_LEGAL`, reason `RESTLESS`; insertion positions
   in section 8.
3. **Setup shape.** `factions[seat]` with seat 0 human; any combination;
   faction choice never affects map generation or PRNG.
4. **Grave storage.** A top-level sorted `graves` coordinate list, public
   view filtered by exploration (the treasure precedent). Grave creation is
   enabled by the setup and stays enabled after Undead seats are eliminated.
5. **Grave causes.** `ATTACK`, `RETALIATION`, `SPLASH`, and `WAIL` deaths
   qualify; elimination removal does not.
6. **Rising placement.** Raise Dead and Infect place units in place, ignoring
   Mountain/Engineering and allied-territory entry rules, and never destroy
   Field Defense. Risings of an orphaned creator are orphaned.
7. **Raise Dead ordering.** Graves raise in `(y, x)` order and take
   consecutive new unit IDs in that order.
8. **Devour at full HP** is legal (Grave denial); `amount` may be 0.
9. **Restless shape.** Explicit Recover outside own territory is rejected
   (the naval precedent) rather than accepted for 0; idle recovery emits no
   event. Restless affects only land form; Undead naval units keep the naval
   rule.
10. **Frenzy targets** exclude units without `ATTACK` (the Banshee) as well as
    `SUPPORT` and `SIEGE`; Frenzied never boosts Wail. Human Rally is
    unaffected because every Human non-support, non-siege role has `ATTACK`.
11. **Banshee** has no `ATTACK` ability, so it never retaliates; its role rule
    stores range 0 and minimum range 0.
12. **Wail details.** Wail is not an Attack (it sets `specialActed`, not
    `attacked`); damage may be 0 and zero-damage targets still count;
    naval and embarked living units are targets; no Field Defense
    destruction; no Charge or Frenzied bonus.
13. **Lich splash** applies only on attack, not on retaliation (the Battleship
    code precedent).
14. **Lifesteal timing.** Heal equals applied damage, applied after both
    damages and before advance, capped at max HP.
15. **Infect on centers.** A victim killed on a city or village center rises
    there and besieges the city; no special case.
16. **Hidden-source Wail damage** is projected as the existing
    `COMBAT_SPLASH_DAMAGE` player event.
17. **Development flag** is `?undead=1`, UI-only, honoured in every build, and
    not persisted; saves with Undead seats load without it.
18. **Neutral fields** (`graves`, heal, infected) are present in all matches;
    Human-only parity is defined apart from identity and these neutral values.

## 14. Concerns for the review gate

- **Raise Dead then Disband.** Raised Skeletons are free and Disband for 1
  Coin on a later turn, so each Grave can become 1 Coin. This follows the
  existing Militia rule; `pulp_wars-vkq.10` should watch it.
- **Infect on centers** (decision 15) makes a Zombie kill on a defended city
  center an immediate siege. It follows the baseline literally but may be
  strong; `pulp_wars-vkq.10` should watch it.
- **"Living" wording** clashes with existing uses of "living unit" meaning a
  unit on the board ([section 2.3](#23-faction-model)); the current-rules fold
  should reword those uses.
