# Ruleset 7: Mind Control keeps the unit

**Status:** contract (`pulp_wars-b5f.3`, spec step). Engine, Normal AI, and
UI are not implemented. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r30`
(and the pending [Dwarf overlay](RULESET_7_DWARVES.md)); it amends the
Martian Mind Control and **replaces the Thrall**
([current rules sections 20.8 and 20.9](RULESET_7_CURRENT.md#208-mind-control);
history and analysis in the
[Martian overlay sections 8.2, 8.3, 9.6, 9.7](RULESET_7_MARTIANS.md#82-mind-control-brain)).
Every rule this document does not mention stays in force.

**Ruleset ID:** the next free `pulp-wars-poc-7rNN` when the engine step
starts (`7rNN` below). The previous identity is appended to
`PRIOR_RULESET_7_IDS`; earlier identities are rejected, never migrated; the
autosave key becomes `pulpWars.save.v7rNN.current` and current-route startup
deletes the previous key. Map generation is unchanged.

## 1. Direction

The user, 2026-10-03: "it looks like the martian mind control ability turns
an enemy unit into a generic thrall. it should take control of the unit but
the unit stays whatever it was with all the same abilities. you will have to
indicate that the unit is being controlled using some sort of visual with
martian color."

So: a Mind Controlled Knight is still a Knight (stats, HP, kills, abilities,
sprite), now fighting for the Martian seat, marked by a control visual in the Martian faction colour (magenta).
The Thrall (a Grunt statline with its own sprite) is retired.

## 2. The engine question, answered from the code

**Today a unit's kind is its owner's faction.** `UnitStateV7` has no faction
field. `unitRoleRuleV7(roster, unit)` and `unitRoleMechanicsV7(roster, unit)`
(`src/engine/rules/ruleset-v7.ts`) resolve `{ ownerId, role }` through
`playerFactionV7(roster, unit.ownerId)`; about 275 call sites in 40 files use
them, and `publicUnitStatsV7` (`src/engine/v7/unit-stats.ts`), the art lookup
(`unitArtSubjectV7` takes a `faction` the board plan fills from the owner),
the AI, and the presentation read `owner.faction` directly. The current rules
say so: "Units never change owner; Infect, Bitten, and Mind Control remove
the victim and create a new unit"
([section 1](RULESET_7_CURRENT.md#1-identity-and-compatibility)). A Goblin
owned by a Martian seat would therefore resolve as a Martian `FIGHTER`, a
Grunt, which is exactly the Thrall. Technology is read as
`technologyCapabilitiesV7(owner.researchedTechs, owner.faction)`.

**The new model separates three things:**

| Concept        | Definition                                                                                                                  | Reads                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Controller** | `unit.ownerId`. Mind Control sets it to the Brain's owner; Release sets it back.                                            | who commands it and when, hostility and alliances, "own" territory, cities, centers and Ports, sight and fog, kill credit, Coins, achievements |
| **Kind**       | `unitFactionV7(roster, unit)`: the faction of the entry's `originalOwnerId` while the unit is controlled, else its owner's. | label, art, cost, stats, maximum HP, abilities, role mechanics, the body rules of its faction                                                  |
| **Technology** | `unitCapabilitiesV7(roster, unit)`: `technologyCapabilitiesV7(controller.researchedTechs, kind)`.                           | every **unit-level** technology effect (section 5.2)                                                                                           |

The technology graph, tiers, and IDs are the same in every faction tree
([section 6.2](RULESET_7_CURRENT.md#62-technology-tree)); only the unlocks
differ, so "the controller's research read through the kind's tree" is always
defined, needs no hidden information (a seat's research is not public, but
the controller knows its own), and needs no snapshot. In words: **the unit
uses its own abilities with its controller's technology.**

### 2.1 State

`GameStateV7.thralls` is replaced by one side list (the Plague, Bitten, and
Chill precedent: no unit key is added):

```text
GameStateV7.mindControlled: readonly {
  unitId, brainUnitId, originalOwnerId
}[]   // sorted by unitId; empty in a match without a MARTIAN seat
```

`unitId` keeps its ID through control and release (no new entity is
created). State parsing rejects: a duplicate or unsorted entry; a `unitId`
that is not a unit on the board or burrowed (`allOwnedUnitsV7`), or whose
form is not `LAND` or `EMBARKED`, or whose `homeCityId` is not null; an
`originalOwnerId` equal to the unit's owner or not a player of the match
(an eliminated player is allowed); a `brainUnitId` that is not a unit on the
board of the same owner whose role, under its kind, has `MIND_CONTROL`, or
that is itself in the list; more than `MIND_CONTROL_LIMIT_V7` entries for one
Brain; a unit whose kind role is `JUGGERNAUT`, uses two slots, or is a
construct; an owner that is not a `MARTIAN` seat; and any entry in a match
without a `MARTIAN` seat. The Thrall checks on `maxHp`, `veteran`, and the
`FIGHTER` role are dropped.

### 2.2 Resolution and its audit

- `FactionRosterV7` gains a **required** `mindControlled` (state and view
  both carry it), and the unit argument of `unitRoleRuleV7`,
  `unitRoleMechanicsV7`, `unitMovementModeV7`, and every helper built on them
  gains a required `id`. Both are compile-time audits: every synthesized
  `{ ownerId, role }` or `{ players }` stops compiling and is resolved
  explicitly. A role-level read with no unit (training, production rows,
  previews of a unit not yet built) uses a new
  `seatRoleRuleV7(roster, ownerId, role)` (the seat's faction).
- One resolver, `unitFactionV7(roster, unit)`, returns the kind; one helper,
  `unitCapabilitiesV7(roster, unit)`, the unit-level technology. With an
  empty list both equal today's owner reads, so a match without a Martian
  seat is unchanged.
- **Source audit** `tests/unit/ruleset-v7-mind-control-kind-readers.test.ts`
  (the `ruleset-v7-dwarf-unit-readers` precedent) classifies every call of
  `playerFactionV7`, `effectiveRoleRuleV7`, `roleMechanicsV7`, and
  `technologyCapabilitiesV7`, and every `.faction` read of a player found by
  a unit's `ownerId`, in `src/engine`, `src/ai`, `src/render`, and
  `src/headless`, as `KIND` (must go through the two helpers) or `SEAT` (the
  seat's own faction is right: production, research, city and economy
  rules, labels of seat-level things). Example: the `frenzied`, `goblin`,
  `dinosaur`, `martian` and `DWARF` branches of `publicUnitStatsV7` are
  `KIND`.

## 3. Mind Control, amended

`MIND_CONTROL { kind, unitId, targetUnitId }` keeps its shape. Legality, in
this order, changes in rows 1, 6, and 9, plus a new row 12:

| #   | Requirement (changes in bold)                                                                                                                                         | Rejection                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board **and is not itself mind-controlled**.                                                                                  | ordinary unit errors; **`UNIT_ROLE_INVALID { role }`** |
| 2–5 | unchanged: role has `MIND_CONTROL`; primary action unused and not landed; land form; no cooldown entry.                                                               | unchanged                                              |
| 6   | It controls fewer than **`MIND_CONTROL_LIMIT_V7` (1)** units.                                                                                                         | `MIND_CONTROL_NOT_LEGAL { reason: "CONTROL_LIMIT" }`   |
| 7–8 | unchanged: a visible unit on the board; hostile.                                                                                                                      | unchanged                                              |
| 9   | Land form, kind role not `JUGGERNAUT`, one slot, not a construct, not on a settlement site or a Rift (unchanged), **and not already mind-controlled** (by any Brain). | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_IMMUNE" }`   |
| 10  | Chebyshev distance at most 2 (unchanged).                                                                                                                             | `MIND_CONTROL_NOT_LEGAL { reason: "OUT_OF_RANGE" }`    |
| 11  | HP at most `MIND_CONTROL_HP_V7` (6), Shield not counted (unchanged).                                                                                                  | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_HEALTHY" }`  |
| 12  | **New: it is wounded, `hp < maxHp`.**                                                                                                                                 | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_HEALTHY" }`  |

Row 1's new failure (a controlled Brain, only possible with duplicate Martian
seats) is reported as `UNIT_ROLE_INVALID`, and such a Brain is never offered
`MIND_CONTROL`.

**Result (replaces the removal and the Thrall).** In one step:

1. An entry `{ unitId: target, brainUnitId, originalOwnerId: target's owner }`
   is added; the target's `ownerId` becomes the actor; `homeCityId` becomes
   null (its old city's slot frees at once); `captureEligible` false; the
   exhausted activation (`exhaustedMartianActivationV7`).
2. It keeps everything else: ID, role, kind, HP, maximum HP, kills,
   `veteran`, form, tile, and every status entry (Plague, Bitten, Chill,
   Shield, Cooling, Dwarf lists, cooldown). Nothing that depends on it ends:
   a Lich's Plagues and a Witch's Blizzard stay (they move to the new side,
   section 5.3).
3. If the target is a Brain (duplicate Martian seats only), its own
   controlled units are released (section 4.2).
4. The Brain has used its primary action, is handled, and gets
   `{ unitId, turnsRemaining: 2 }`.
5. The unit reveals its sight for the actor; then the tail and the naval
   blockade and sea-network events (an embarked unit is never a target, but a
   release can lift a blockade).

No `UNIT_DIED`, Grave, rising, death blast, kill credit, growth, or Plunder.

## 4. Controlled units and their lifecycle

### 4.1 What a controlled unit is

| Rule                              | Controlled unit                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Label, art, stats, abilities      | its kind's, as before control (a Knight is a Knight: Human registration)                                                                                                  |
| Turn and commands                 | its controller's; activations reset at the controller's Start Turn                                                                                                        |
| Home and capacity                 | `homeCityId` null: no slot anywhere, never re-homed (not even by a capture it makes), an orphan                                                                           |
| Healing                           | ordinary, under the controller: "own territory" is the controller's; its kind's body rules apply (Restless for an Undead kind, Deep Winter recovery for an Ice Folk kind) |
| Promotion, growth                 | yes, by its kind's rules (`PROMOTE` offered to the controller; a dinosaur grows)                                                                                          |
| Disband                           | never: not offered, rejected with `DISBAND_NOT_LEGAL { reason: "MIND_CONTROLLED" }` (no Coins from enslaving)                                                             |
| Capture, siege, Pillage, treasure | yes, if its kind can, for the controller                                                                                                                                  |
| Psychic Command, Beam Down        | a target and a passenger like an own unit of its role (Psychic Command skips `SUPPORT` and `SIEGE` as always)                                                             |
| Abilities it loses                | **never** (sections 5.1 and 5.3): Raise Dead, Infect, Bite, Hatch, Assemble, Mind Control, tunnel riding                                                                  |
| Kill credit, Slayer               | its `kills` keep counting and belong to the controller; Slayer reads it as the controller's unit                                                                          |
| Muster                            | counts its mechanical role for the controller                                                                                                                             |
| Sight and fog                     | reveals for the controller; the original owner sees it as a hostile unit                                                                                                  |
| Upkeep                            | none (Ruleset 7 has no upkeep)                                                                                                                                            |

### 4.2 Release: the unit goes home

**A controlled unit is released when its Brain leaves the board** (killed,
infected, shattered, disbanded, removed by displacement or elimination) **or
changes owner** (mind-controlled itself). Its Brain embarking keeps the link.
Release, for each of the Brain's entries in unit-ID order:

- if `originalOwnerId` is not eliminated: the entry is removed, `ownerId`
  becomes `originalOwnerId`, `homeCityId` stays null (an orphan of its
  original owner), `captureEligible` false, the exhausted activation; it keeps
  HP, kills, statuses, form, and tile, standing where it is whatever the
  movement-entry rules (the rising precedent); event `UNIT_RELEASED`; it
  reveals its sight for its owner. A burrowed unit is released in the
  `burrowed` list and surfaces at its new owner's next Start Turn.
- if the original owner is eliminated: it is removed with
  `UNIT_DIED { cause: "BRAIN_LOST" }` (a removal: no kill credit, Plunder,
  Grave, rising, or growth), the old collapse rule.

Releases happen exactly where Thrall collapses happen today: right after the
Brain's own death events (its `UNIT_DIED`, Grave, or rising) and before the
advance, Push, and any chain of the same command (`collapseThrallsV7`
becomes `releaseControlledV7`, called at its nine existing call sites in
`reducer.ts`, `explosions.ts`, `plague.ts`, and `dwarf-reducer.ts`).

**Why release and not death.** It is the theme (the Brain's grip breaks; the
soldier comes to its senses), it is the counterplay the faction needs (kill
the Brain, get your Knight back: a two-sided swing that makes the fragile
8-HP Brain the priority target), and the one-faction-per-seat rule
([section 1](RULESET_7_CURRENT.md#1-identity-and-compatibility)) guarantees
the original owner exists unless eliminated. The Martian side loses the unit
either way, so release punishes the Martians as much as a collapse did, and
rewards the victim.

### 4.3 Seats leaving the game

- **The controller is eliminated:** before its units are removed, each of
  its controlled units is released (4.2; to a living original owner, else
  removed). Then the ordinary removal, with cause `ELIMINATION`.
- **The original owner is eliminated:** its controlled units stay controlled
  (they are the controller's units); the entry keeps `originalOwnerId`, so
  the kind still resolves; a later release removes them (`BRAIN_LOST`).
  Bitten entries whose biter is eliminated end as today.

### 4.4 Limit and cooldown

`MIND_CONTROL_LIMIT_V7` (renamed from `MIND_CONTROL_THRALL_LIMIT_V7`) is
**1**; `MIND_CONTROL_COOLDOWN_TURNS_V7` stays 2 and starts at the Mind
Control, not at a loss. Section 7 justifies the 1.

## 5. Faction rules under control

### 5.1 The three rulings

1. **Body rules follow the kind.** Everything the unit is and does by itself
   (stats, attacks and their modifiers, movement modes, statuses it causes,
   blasts, healing restrictions) reads its kind.
2. **Seat rules follow the controller.** Coins, cities, capacity, territory,
   Snow from territory, research, achievements, and "own"/"hostile" read the
   controller.
3. **No spawning under control.** An ability whose result is a **new unit**
   (or a controlled unit) is unavailable: never offered, rejected with
   `UNIT_ROLE_INVALID { role }` for commands, and not triggered for passive
   rules. Otherwise the controller would own permanent units of another
   faction, outside the Brain's limit, with no link to release (a Zombie
   rising for a Martian seat resolves as a Martian `GUARD`, a Shield
   Projector), which the one-faction-per-seat model cannot hold and which
   would snowball.

### 5.2 Technology: unit-level and seat-level

Unit-level unlocks read `unitCapabilitiesV7` (the controller's research
through the kind's tree): command unlocks (Rally and its labels, Tend
Wounded, Cold Snap, Dig In, the Brain's own `BRAIN_SUPPORT`), Charge,
Overrun, Escape, Fieldcraft Forest freedom and Sight, Mountain movement,
Roads, Wallbreaker, Disintegrator, Brittle's Shatter threshold, Deep Winter
recovery, bomb and eruption damage, Blasting Charges, and Force Fields.
Seat-level unlocks read the controller's own capabilities as today: resource
reveal, economic formulas, trade, Market, Arms Industry, capture spoils,
**Plunder**, city capacity (Planning, Warrens, Nesting), Egg bonuses,
trainable roles, and Deep Winter Snow. So a Martian without Raiding commands
a Wolf Rider with no Charge, and a Martian with Chivalry commands a Knight
with Overrun.

### 5.3 Per faction

| Kind     | Keeps under control                                                                                                                                                                                                | Does not                                                                                                | Why                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Human    | Field Defense (Fighter, Guard, with Fortification), Rally, Tend Wounded (heals and cures the controller's units), Charge, Escape, Overrun                                                                          | —                                                                                                       | a stolen Captain giving Martians a healer is a good story and capped at one per Brain                                                                                                                                                                                                      |
| Undead   | Frenzy, Wail, Devour, Lifesteal, Unanswered, Plague (its Plagues stay and keep their source), Restless, the Lich splash                                                                                            | Raise Dead; Infect (a Zombie kill is an ordinary death, with a Grave where the Grave rules allow); Bite | spawning (ruling 3); the Zombie still fights as an 18-HP Zombie                                                                                                                                                                                                                            |
| Goblin   | Kaboom (beside its old friends), death blasts, bombs and friendly-fire splash, Ram, WAAAGH!, Gang Up (helpers are the controller's units)                                                                          | Plunder (a seat rule)                                                                                   | the walking-bomb turned against its horde is the most fun case; Coins stay with the Goblin economy                                                                                                                                                                                         |
| Dinosaur | Pounce, Acid, Armoured, Charge! (two-slot units are immune anyway), War Drums, Tend Wounded, growth                                                                                                                | Hatch                                                                                                   | the controller has no Eggs; ruling 3                                                                                                                                                                                                                                                       |
| Martian  | (duplicate Martian seats only) Shield and its recharge, rays and Cooling, Pierce, Force Field, Beam Down, Tractor Beam, Psychic Command                                                                            | Mind Control                                                                                            | no chains of control; ruling 3                                                                                                                                                                                                                                                             |
| Ice Folk | Chill, Bolas, Cold Blood, Shatter (threshold from the controller's research), Sweep, Trample, Glide, Snow cover, Rockfall, Boulders, Prowl, Cold Snap (her targets read the controller as her owner), the Blizzard | —                                                                                                       | the Blizzard is a body rule: it still makes Snow around her (stopping the controller's own ground units too) and halves ranged hits only for Ice Folk units **of her controller** ([section 21.6](RULESET_7_CURRENT.md#216-the-blizzard-and-cold-snap)); she stops protecting her old side |
| Dwarf    | Bomb Run, Tunnel (alone), eruption, Dig In (within 1 of a center of the controller, with its Dig In unlock), Repair, Knockback, Plated                                                                             | Assemble; carrying or being a tunnel rider                                                              | Assemble spawns; a rider pairs two units that may be released to different owners mid-tunnel                                                                                                                                                                                               |

Constructs and Juggernaut-role units remain immune; Eggs, boats, embarked,
and burrowed units are never targets.

### 5.4 Interactions

| Rule                              | Interaction                                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Death of a controlled unit        | an ordinary death of a unit of its kind: Graves, Infect and Bitten risings (for the killer or biter as today), death blasts, Plunder for the killer's seat, kill credit; its entry ends; the Brain's limit frees |
| Undead raising                    | a Grave it leaves is raised by any Necromancer as an ordinary Grave                                                                                                                                              |
| Bitten                            | persists through control and release; if it dies it rises for the biter                                                                                                                                          |
| Chill, Shatter                    | Chill persists and counts down at the controller's End Turn; a controlled unit is Chilled and shattered like any unit, and a shattered Brain releases its unit                                                   |
| Mind Control of a controlled unit | immune (row 9); the original owner wins it back only by removing the Brain                                                                                                                                       |
| Tractor Beam, Push, Knockback     | unchanged; a pulled controlled unit is the controller's "own" target                                                                                                                                             |
| Embark, Ports, blockades          | it embarks at the controller's Ports; a release of an embarked blockader recomputes blockades (every command that emits `UNIT_RELEASED` joins the blockade and sea-network recompute list)                       |
| Showcase, starting units, rewards | no controlled unit is ever created by setup, a reward, or treasure                                                                                                                                               |
| Saves, replays                    | the list is canonical state, in saves, replays, and hashes; a save mid-control resumes exactly                                                                                                                   |

## 6. Commands, events, errors, views, and queries

- **Commands:** unchanged shapes.
- **Events:** `UNIT_MIND_CONTROLLED { playerId, unitId, targetUnitId, targetOwnerId, targetRole, at, hp }`
  (drops `thrallUnitId`: the unit keeps its ID). **New**
  `UNIT_RELEASED { unitId, brainUnitId, fromPlayerId, toPlayerId, at }`,
  right after `UNIT_MIND_CONTROLLED` in `DOMAIN_EVENT_KIND_ORDER_V7`, then
  its `TILES_REVEALED`. `UNIT_DIED` cause `BRAIN_LOST` remains for a release
  to an eliminated owner. Event projection shows `UNIT_RELEASED` to every
  player who sees the tile, like `UNIT_DIED`.
- **Errors:** `MIND_CONTROL_NOT_LEGAL` reason `THRALL_LIMIT` becomes
  `CONTROL_LIMIT`; `DISBAND_NOT_LEGAL` reason `THRALL` becomes
  `MIND_CONTROLLED`.
- **View:** `PlayerViewV7.thralls` becomes
  `mindControlled: { unitId, brainUnitId, originalOwnerId }[]` for every
  visible controlled unit, `brainUnitId` null when the viewer cannot see the
  Brain. `originalOwnerId` is public (the sprite shows the faction, and each
  seat has one faction).
- **Public unit stats:** the `martian` block of a Brain replaces `thralls`
  and `thrallLimit` with `controlled` and `controlLimit`; a controlled unit
  gains `mindControl: { brainUnitId, originalOwnerId }` (null otherwise; the
  field is present only in matches with a Martian seat, like the `martian`
  block). Its faction blocks (`goblin`, `dinosaur`, `iceFolk`, `dwarf`,
  `martian`) follow its kind.
- **Constants:** `MIND_CONTROL_LIMIT_V7` 1 replaces
  `MIND_CONTROL_THRALL_LIMIT_V7`; `isThrallV7`, `thrallsOfBrainV7`, and
  `collapseThrallsV7` become `isMindControlledV7`, `controlledByBrainV7`, and
  `releaseControlledV7`.
- **`queryPlayerCommandsV7`** offers a controlled unit's commands under its
  kind (minus the abilities it loses, section 4.1, and Disband); every offered command is
  accepted. The Mind Control preview shows the target's kind, HP, and the
  release rule.

## 7. Balance: numbers check

The old Thrall was worth "about half a Grunt" (one free body of 1 to 6 HP,
healing toward 10, dying to any hit). The new conversion hands the Martians
the real unit, which heals to full in one or two turns at home. Per
conversion of a unit worth `V` Coins, the swing was `V` (removed) plus about
1 (the Thrall); it is now `2V`, less the risk that the Brain dies and the
unit goes back (`-V` for the Martians, `+V` for the victim).

| Target (cost, max HP)                  | Damage needed (6 HP) | Old gain    | New gain                              |
| -------------------------------------- | -------------------: | ----------- | ------------------------------------- |
| Goblin (1, 6)                          |            1 (was 0) | 6-HP Thrall | a Goblin that can Kaboom              |
| Fighter, Hammerer (2, 12)              |                    6 | Thrall      | a 12-HP Fighter                       |
| Zombie, Guard, Orc Brute (3, 15–18)    |                 9–12 | Thrall      | the Guard-role unit                   |
| Knight, Vampire, Scrap Buggy (8–9, 10) |                    4 | Thrall      | an 8–9-Coin unit, healed in 1–2 turns |
| Catapult, Lich, Steam Cannon (8, 10)   |                    4 | Thrall      | a siege unit                          |
| Sabretooth (9, 14), Steam Tank (9, 16) |                8, 10 | Thrall      | a 9-Coin unit                         |
| Mammoth (6, 20), Ankylosaurus (5, 20)  |                   14 | Thrall      | the unit                              |

- **The HP threshold is not the brake.** It is flat, so the most valuable
  targets are the expensive 10-HP units, which one hit brings below 6: a
  Grunt's hit on a full-HP Knight deals 6 (a full ray kills it). A relative
  threshold (half the maximum) would cost one more point of damage on those
  and would also exclude 6-HP Skeletons and Cavemen and 4- to 5-HP Goblins,
  the targets the AI actually converts. It stays 6, with only the new
  "wounded" row (no free full-HP Goblin, the theme's "weakened enemy").
- **The brakes are the limit and the release.** With 2 per Brain a human
  could hold 18 Coins of Knights behind a 5-Coin Brain; with **1** a Brain
  holds at most one unit, which the victim gets back by killing an 8-HP,
  Defense-1 unit. In AI play the measured victims (63 conversions in 240
  seat-games, 32 `FIGHTER`-role and 26 `GUARD`-role, mean 4.0 HP,
  [Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md)) are
  worth about 2.5 Coins: one such unit is about the old two Thralls. So
  limit 1 keeps the AI-measured strength about level while capping the
  human-play ceiling. Both 1 and the unchanged cooldown 2 are inside the
  Martian tuning bounds (1–3 each,
  [Martian overlay section 16.3](RULESET_7_MARTIANS.md#163-tuning-bounds)).
- **Coarse balance pass** (Dry Land, the Martian report's method, the
  Martian pairings with every faction and a no-Martian control): Martian
  decided win rate 40–60% against each faction; pairings without a Martian
  seat replay with identical outcomes; Mind Control used in at least the
  `7r25` 39% of Brain seat-games. Fallbacks, in order, without further
  approval: above 60% against any faction, cooldown 3; Mind Control below
  30% of Brain seat-games and Martians below 50% overall, limit 2.

## 8. Normal AI

- **Martian targeting** values a target by **what it becomes**:
  `value = kind cost of its role (2 if it has none) + kills`, with ties by
  unit ID; Mind Control keeps priority over an ordinary kill of the same
  target, and the setup hit (`MIND_CONTROL_SETUP_PRIORITY_V7`) and Brain
  approach prefer the highest value. A Brain at its limit does not set up.
- **Playing controlled units:** they are own units of their kind; every
  per-unit policy that is gated on `view.viewer.faction` (Kaboom, Bolas,
  Cold Snap, Tunnel, Bomb Run, Repair, Lifesteal targeting, the Undead and
  Goblin chip rules) is re-gated on the unit's kind; seat plans (research,
  production, economy) stay the viewer's. Retained value of a controlled
  unit is its kind cost scaled by HP (was "HP only"); a Brain carries the
  value of its controlled unit. The Thrall chip priority is removed.
- **Against Martians:** a hostile Brain's target bonus becomes the value of
  its controlled unit, **doubled when that unit was the viewer's own** (it
  comes back); "Mind Control denial" adds the wounded test and steps the
  most valuable exposed units out of reach first.
- **Test:** a modest head-to-head on Dry Land, Martian new policy against
  the Martian policy with value-blind targeting, 1v1 against Human and
  Undead, seeds 0–9 each side: the new policy's decided win share is not
  below the old's minus 5 points.

## 9. Presentation

- **Sprite:** its kind's sprite for its role (`unitArtSubjectV7` receives
  the kind, not the owner's faction), embarked transport included; the seat
  badge and border ring take the **controller's faction colour**.
- **Colour source:** every colour of the control visual is the **Martian
  faction colour** (magenta), read from the single per-faction colour source
  of the faction-colour work (`pulp_wars-b5f.4`), with its lighter and darker
  shades derived from it there; the spec names no separate palette constant.
- **Control visual (code-drawn):** a psychic halo in the Martian faction
  colour, a thin ellipse just above the sprite's head with two short wavy
  tendrils curling down to it, pulsing between the colour and its glow shade
  (1.2 s); static when reduced motion is set; white in high contrast. In the
  status chip slot, a **brain glyph chip** (a brain in the Martian faction
  colour on a dark chip) replaces the Thrall collar. Both are drawn at every
  zoom and stay readable at the smallest tile size.
- **Link:** selecting a controlled unit draws the dashed link, in the Martian
  faction colour, to its
  Brain with a ring on the Brain (`drawThrallLinkV7` renamed
  `drawControlLinkV7`); selecting a Brain draws it to its controlled unit.
- **Dock and info:** its own name and portrait, then "Mind-controlled by
  {controller} Brain" and "Returns to {original owner} if the Brain is lost"
  (or "Lost with the Brain" when the original owner is eliminated); a Brain
  shows "Controls {n} / 1". The disabled reasons: "Recovering: {n} turn(s)";
  "Controls a unit already"; target reasons "Too healthy ({hp} HP)",
  "Unhurt", "Immune", "Already controlled", "Protected on a city or village
  center".
- **Mind Control preview:** the target's portrait, "Becomes yours: {unit}
  ({hp} / {maxHp} HP)", the cooldown, and "Returns if this Brain is lost".
- **Texts:** tooltip "Take a wounded hostile unit with 6 HP or less within 2
  tiles. It fights for you as itself until this Brain is lost." Help:
  "**Mind Control:** a Brain takes control of one wounded hostile unit with 6
  HP or less within 2 tiles, not on a city or village. It keeps its type and
  abilities but cannot be disbanded or create units. When the Brain is lost,
  the unit returns to its owner." Log: "{owner} Brain took control of
  {original owner}'s {unit}"; "{unit} returned to {owner}"; "{unit} was lost
  with its Brain".
- **Thrall art retired:** the `UNIT:MARTIAN:THRALL` and
  `PORTRAIT:MARTIAN:THRALL` subjects, their two runtime manifest entries in
  `chibi-direction-martian-art-manifest.ts`, the `thrall` flag of the art
  lookup, and the two PNGs under `public/assets/chibi/` are removed. The raw
  PixelLab outputs, submissions, review evidence, and the subject recipe
  stay as history, marked retired in `docs/art/factions/MARTIAN.md` and
  `docs/art/CHIBI_ASSET_INVENTORY.md`; the Martian art review and asset
  tests drop the two subjects. No new raster art is needed.
- A match without a Martian seat renders exactly as before.

## 10. Implementation split and test expectations

Three worker passes on `pulp_wars-b5f.3`, in order; each keeps its focused
tests.

- **Ordering:** the engine step lands **after** `pulp_wars-78i.7` (Dwarf
  balance) and `pulp_wars-b5f.2` (Grunt and Tripod) and is rebased onto
  them, because the kind-resolver refactor (section 2.2) touches the same
  role and mechanics lookups.
- **Fold:** updating [Ruleset 7: current rules](RULESET_7_CURRENT.md)
  (sections 1, 3, 4.4, 5, 17.1, 17.7, 20, and 21.14) is part of the
  implementation steps' documentation, not of this spec step: the engine
  step folds the rules and shapes, the UI step the texts.

**Engine (identity `7rNN`, every shape of section 6):**

- resolution: a Goblin, Knight, Zombie, Witch, and Mole owned by a Martian
  seat with an entry resolve label, stats, abilities, mechanics, public
  stats blocks, and movement mode through their kind; without an entry,
  through the owner; the kind-reader source audit passes;
- Mind Control legality per row, including `CONTROL_LIMIT`, the wounded
  row, already-controlled and controlled-Brain cases; the result keeps ID,
  HP, maxHp, kills, veteran, statuses and Plague sources, nulls the home,
  frees the slot, exhausts, reveals; the preview equals the result;
- each ruling of section 5: a controlled Goblin Kabooms and its death blast
  fires; a controlled Necromancer Frenzies but has no Raise Dead; a
  controlled Zombie neither infects nor bites; a controlled Witch's Blizzard
  halves ranged hits only for Ice Folk units of her controller and stops the
  controller's ground units; a controlled Mole tunnels alone and a
  controlled Hammerer cannot ride; a controlled Engineer repairs but cannot
  Assemble; Overrun and Charge follow the controller's research; Plunder is
  not paid to a Martian seat; no Disband;
- release: Brain killed, shattered, infected, disbanded, displaced, and
  mind-controlled; burrowed and embarked released units; release to an
  eliminated owner removes with `BRAIN_LOST`; controller elimination
  releases before removal; event order matches the old collapse order;
- parsing rejects every case of section 2.1; save, load, and replay
  round-trip mid-control; matches without a Martian seat replay the existing
  command logs with identical outcomes (apart from the identity).

**Normal AI:** target value ordering (a 9-Coin Knight over a 2-Coin Fighter
at equal HP); no setup hit at the limit; a controlled Goblin Kabooms when
the Goblin policy would; no Disband of a controlled unit; the hostile Brain
bonus doubles for the viewer's own unit; the denial test steps a wounded
valuable unit out of reach; the head-to-head of section 8; the coarse
balance pass of section 7.

**UI:** board plan: a controlled unit draws its kind's sprite with the
controller's faction-colour badge, the halo and brain chip in the Martian
faction colour (read from the faction-colour source), and the link when selected or
its Brain is selected; reduced motion and high contrast variants; dock,
Brain info, preview, tooltip, disabled reasons, Help, and log texts as in
section 9; no Thrall subject in the manifests or the art lookup; the
Martian browser smoke probe performs a Mind Control and checks the
controlled unit's own sprite and control visual; matches without a Martian
seat produce identical presentation plans.

## 11. Root rulings

The root's rulings on this spec (2026-10-03):

1. **Limit 1 per Brain:** confirmed (section 4.4, section 7).
2. **Release** to the original owner when the Brain is lost, removal
   (`BRAIN_LOST`) only if that owner was eliminated: confirmed
   (section 4.2).
3. **Colour:** the control visual uses the **Martian faction colour** from
   the single per-faction colour source of `pulp_wars-b5f.4` (Martian is
   magenta); the controlled unit's badge and border use the controller's
   faction colour (section 9).
4. **Identity:** the next free `7rNN`, as written.
5. **Fold** into the current rules belongs to the implementation steps'
   documentation (section 10), and the engine step lands after
   `pulp_wars-78i.7` and `pulp_wars-b5f.2`, rebased onto them (section 10).
