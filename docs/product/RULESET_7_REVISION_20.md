# Ruleset 7 revision 20: Triceratops Charge, T-Rex cost, Nesting and Wallbreaker, full-heal promotion, sturdier Humans

**Status:** contract (`pulp_wars-0hi.1`), implemented in the engine, the
Normal AI, and the UI by `pulp_wars-0hi.2`
([section 11](#11-implementation-notes-pulp_wars-0hi2) lists where the
implementation differs from or adds to this text). `pulp_wars-0hi.3` chose
the sturdiness numbers of [section 6](#6-human-sturdiness) in a coarse,
Dry-Land-only pass ([tuning record](#63-tuning-record)). It amends
[revision 19](RULESET_7_REVISION_19_DINOSAURS.md) (`pulp-wars-poc-7r19`), which
is itself an overlay over [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(`pulp-wars-poc-7r18`, three factions). `pulp_wars-c87.9` folds revision 19
**as amended by this document** into the current rules
([section 8.3](#83-fold-targets)).

**Ruleset ID:** `pulp-wars-poc-7r20` (the running game is
`pulp-wars-poc-7r23`:
[revision 21](RULESET_7_REVISION_21_ACHIEVEMENTS.md) (`7r21`) adds four
achievements and the [Martian overlay](RULESET_7_MARTIANS.md) (`7r22`) a
fifth faction, and neither changes anything in this document;
`pulp_wars-0hi.3` (`7r23`) sets the numbers of
[section 6.3](#63-tuning-record))

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (unchanged)

**Scope:** five changes from the user's play-test of 2026-10-02 (epic
`pulp_wars-0hi`): the Triceratops becomes a line-breaker with a passive
**Charge!** and the `STAMPEDE` command is removed; the T-Rex costs more and
hatches later; the Dinosaur Industry branch (Nesting, and Wallbreaker in the
Explosives slot) gains real effects; a promotion or a growth stage fully
heals; and Humans become numerically sturdier than Undead and Goblins, by
numbers the balance bead chooses inside [section 6](#6-human-sturdiness).
Every unmentioned revision-19 rule stays in force. Numbers that
`pulp_wars-c87.8` tunes and this document does not name keep their tuned
values; numbers named here replace them.

Attack and Defense are in whole units; the code stores half-units (`attack2`,
`defense2`).

## 1. Identity and compatibility

| Boundary                                   | Revision-20 value                                   |
| ------------------------------------------ | --------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r20`                                |
| Game-state schema                          | `7`                                                 |
| Command/event/save/replay numeric versions | `7`                                                 |
| Browser autosave                           | `pulpWars.save.v7r20.current`                       |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                          |
| Factions, trees, bindings, display names   | unchanged from revision 19 (four factions)          |
| `GameStateV7`, `PlayerViewV7`, setup       | unchanged (no key added, removed, or re-typed)      |
| `COMMAND_KIND_ORDER_V7`                    | `STAMPEDE` removed: 45 kinds, `KABOOM` then `HATCH` |
| `DOMAIN_EVENT_KIND_ORDER_V7`               | unchanged (72 kinds, same payload shapes)           |

- `pulp-wars-poc-7r19` is appended to `PRIOR_RULESET_7_IDS` (gap-free). A
  revision-20 reader rejects it and every earlier Ruleset 7 identity in
  setups, states, saves, replays, and release artifacts; there is no
  migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r19.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-0hi.2`, which also makes every
  shape change below. `pulp_wars-0hi.3` was to change numbers under the same
  identity (the revision-14, 16, 17, and 19 precedent); because revision 21
  and the Martian overlay had already moved the running identity on, the
  root had it bump the identity once more instead, to `pulp-wars-poc-7r23`
  (save key `pulpWars.save.v7r23.current`, `7r22` appended to
  `PRIOR_RULESET_7_IDS`, obsolete keys through `v7r22`). No shape changes.
- **Shape changes** (all listed again in
  [section 7.1](#71-commands-events-errors-and-queries)): the `STAMPEDE`
  command kind, the `STAMPEDE_NOT_LEGAL` error code, the `STAMPEDE`
  `noRetaliationReason`, and the combat-preview field `stampede` are removed;
  the combat preview gains `runUp` and `fortificationIgnored`; the ability
  `STAMPEDE` is replaced by `LINEBREAKER`; the `NESTING` unlock gains
  `citySlots`; the unlock kind `WALLBREAKER` is added; `hatchTurns` may be 4.
- **Unchanged for other factions.** For equal setups and command sequences, a
  match without a Dinosaur seat is identical to revision 19 (apart from
  identity and the renamed preview fields, which are neutral) **until its
  first accepted `PROMOTE` of a wounded unit**, and, after `pulp_wars-0hi.3`,
  except for the retuned HP of [section 6](#6-human-sturdiness). Command
  ordinals after `KABOOM` shift by one; relative order is unchanged.

## 2. Triceratops rework

The Triceratops is the Dinosaur faction's straightforward line-breaker: it
walks up, hits a fortified defender as if it stood in the open, shoves it
back, and takes its tile. It is a brawler, not artillery: it is retaliated
against like any melee unit.

### 2.1 Stats

| Unit        | Role       | Tech       | Cost | Hatch | Slots |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Grows | Abilities |
| ----------- | ---------- | ---------- | ---: | ----: | ----: | --: | -----------------: | -------------------: | ---: | ----: | ----: | ----------------- | ------- | ----- | --------- |
| Triceratops | `CATAPULT` | Sawmilling |    8 |     2 |     2 |  20 |              3 (6) |                2 (4) |    2 |     1 |     1 | yes               | no      | yes   | Charge!   |

Changes from revision 19: HP 18 → 20, Move 1 → 2, it **may attack after
moving** (`mayUsePrimaryActionAfterMove` true), and `STAMPEDE` is replaced by
`LINEBREAKER` (public abilities `ATTACK`, `LINEBREAKER`, `GROW`). Growth is
20 / 24 / 28 HP and Attack 3 / 3 / 4 at stage 0 / Big / Alpha. Disband refund 4. It keeps: the name and art, melee range 1, no capture, the advance after a
melee kill, 2 slots, hatch time 2, the `SIEGE` tactical-role label (the
registry requires the `CATAPULT` role's label to match the Human one), and
therefore its exclusion from War Drums: a Triceratops is never Inspired.

### 2.2 Charge!

Charge! is passive. It applies to **every `ATTACK` a land-form unit with
`LINEBREAKER` makes** (always at range 1), and has four parts. Parts 2–4 do
not depend on having moved.

1. **Run-up.** `runUp = min(2, movedPathLength)` when `activation.moved` is
   true and `activation.attacksUsed` is 0, otherwise 0. The attack gains
   `+1 Attack` per run-up tile (role mechanic `runUpBonus2` 2, constant
   `RUN_UP_MAXIMUM_TILES_V7` 2):

   ```text
   attack = base Attack (3) + 1 (Alpha) + runUp (0, 1, or 2)
   ```

   `movedPathLength` is the existing activation field that Raider Charge
   reads (`calculateCombatPreviewV7`: `moved && movedPathLength >= 2`): the
   number of tiles the unit entered with its `MOVE` this turn. So every tile
   entered counts, in any direction (no lane, no straight line); tiles
   passed over own units count (revision 18); Road half-steps count as tiles
   (three or four Road tiles still give +2); an interrupted Move counts its
   truncated length; a unit that has not moved, or landed this turn, has 0.

2. **Ignores fortification.** The defender's fortification level is 0 for
   the whole exchange: both the City Walls levels (2) and the Field Defense
   level (1) are removed from its Defense, for the damage it takes **and**
   for its retaliation (the Acid convention: one reduced Defense for both
   forces). **Cover stays:** a Forest or Mountain defender keeps `× 1.5`.
   Walls are not destroyed.
3. **Destroys Field Defense** on the target's tile, whoever owns the tile and
   whether or not either unit survives (reason `CATAPULT`, the existing
   reason of every `CATAPULT`-role attack; unchanged from revision 19).
4. **Push and follow.** A defender that survives is pushed one tile directly
   away from the Triceratops under the **existing Push conditions**
   ([current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat)): the
   destination is on the board, explored by the attacker, empty, not a
   settlement site, the same land or water kind as the target, enterable by
   the target's owner (Mountain needs that owner's Engineering, Deep Water
   its Navigation), and not in territory allied to the target. An Egg is
   never pushed. If the target was pushed and the Triceratops survived, it
   **advances into the vacated tile** under the ordinary advance conditions
   (land-form target, tile enterable by the attacker: a Mountain needs
   Engineering). A blocked push has no other effect.

**Retaliation is ordinary.** A surviving defender retaliates under the
ordinary rule (in range, has `ATTACK`, not embarked, not an Egg), with the
reduced Defense of part 2, **before** it is pushed. The Triceratops takes
that damage, may be bitten, and may die.

**Never captures.** The Triceratops has no `CAPTURE`. One that follows a
pushed defender onto a hostile city or village center besieges it like any
unit standing there.

**Embarked and landed.** As for any unit: an embarked Triceratops cannot
attack, landing ends its activation, and it keeps slots and growth.

### 2.3 Resolution and event order

A Triceratops attack is an ordinary `ATTACK` resolved by the ordinary attack
resolution; there is no second code path. Order:

1. Damage both ways from pre-combat HP (part 2 Defense); Armoured; Lifesteal.
2. Kill credit, then growth ([section 5](#5-promotion-and-growth-fully-heal)).
3. Field Defense on the target tile destroyed.
4. Deaths, Graves, Infect and Bitten risings, bites, Plague (ordinary rules).
5. Push of a surviving target, then the advance (after a kill) or the follow
   (after a Push).
6. Death-blast chain, Plunder, reveals, and the ordinary economy, reward, and
   achievement tail.

Events: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; death events
(`UNIT_DIED`, then `GRAVE_CREATED` or a rising); `UNIT_GREW`; `UNIT_PUSHED`;
`UNIT_MOVED` (advance or follow, `path` the one tile); chain events;
`PLUNDER_AWARDED`; `TILES_REVEALED`; the tail. No other attack ever emits both
`UNIT_PUSHED` and `UNIT_MOVED`, so no existing order changes.

### 2.4 Cases

| Situation after the exchange                                                                                                                                                   | Target          | Triceratops ends on     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ----------------------- |
| Target dies and leaves a Grave or nothing                                                                                                                                      | gone            | the target's tile       |
| Target dies and rises in place (it was Bitten)                                                                                                                                 | hostile Zombie  | its own tile            |
| Target dies on a Mountain and the actor has no Engineering                                                                                                                     | gone            | its own tile            |
| Target survives; the tile behind is free and legal                                                                                                                             | pushed one tile | the target's old tile   |
| Target survives on a city or village center; the tile behind is free and legal                                                                                                 | pushed off      | the center (no capture) |
| Target survives; the tile behind is off the board, water, occupied (any unit or Egg), a settlement site, a Mountain the target's owner cannot enter, or territory allied to it | stays           | its own tile            |
| Target survives; the tile behind is unexplored by the actor (preview `push` is `UNKNOWN_BEHIND_FOG`)                                                                           | stays           | its own tile            |
| Target is pushed off a Mountain and the actor has no Engineering                                                                                                               | pushed one tile | its own tile            |
| Target is an Egg and survives                                                                                                                                                  | stays           | its own tile            |
| Target is afloat (attacked from shore) and survives; the water tile behind is free and legal                                                                                   | pushed one tile | its own tile            |
| Target is afloat and dies                                                                                                                                                      | gone            | its own tile            |
| The Triceratops dies from the retaliation (or rises as a Zombie)                                                                                                               | pushed if legal | gone                    |

### 2.5 Worked examples

Engine formula ([current rules section 13.2](RULESET_7_CURRENT.md#132-damage)),
all units at full HP on Grass unless stated; Triceratops 20 HP, Attack 3,
Defense 2, stage 0. "Ordinary" is what the same attack would do if the
fortification counted. The Human Fighter and Guard have the
[section 6.3](#63-tuning-record) HP (12 and 17; with 10 and 15 the damage
and retaliation of every row are the same, a one-tile Charge kills the
Fighter with 10, and the Alpha kills the Guard with 15).

| Target (HP, Defense)                        | Tiles moved | Attack | Defense used | Damage to target | Retaliation | Outcome                                                   |
| ------------------------------------------- | ----------: | -----: | -----------: | ---------------: | ----------: | --------------------------------------------------------- |
| Fighter (12, 2)                             |           0 |      3 |            2 |                8 |           4 | Fighter at 4 HP, pushed; Triceratops follows              |
| Fighter (12, 2)                             |           1 |      4 |            2 |               12 |           — | Fighter dies; Triceratops advances                        |
| Guard (17, 3)                               |           0 |      3 |            3 |                7 |           7 | pushed                                                    |
| Guard (17, 3)                               |           1 |      4 |            3 |               10 |           6 | pushed                                                    |
| Guard (17, 3)                               |           2 |      5 |            3 |               14 |           5 | Guard at 3 HP, pushed                                     |
| Guard on a Walled center with Field Defense |           2 |      5 |    3 (not 6) |               14 |           5 | ordinary: 10 and 15. Field Defense gone; Guard pushed off |
| Guard on a Walled center with Field Defense |           0 |      3 |    3 (not 6) |                7 |           7 | ordinary: 5 and 18                                        |
| Guard in a Forest with Field Defense        |           2 |      5 |      3 × 1.5 |               12 |           6 | cover stays; ordinary: 10 and 10                          |
| Zombie (18, 2) on Field Defense             |           2 |      5 |    2 (not 3) |               16 |           3 | Zombie at 2 HP bites the Triceratops, then is pushed      |
| Orc Brute (15, 2.5)                         |           2 |      5 |          2.5 |               15 |           — | dies                                                      |
| Juggernaut (40, 4)                          |           2 |      5 |            4 |               13 |           8 | pushed                                                    |
| Ankylosaurus (20, 3)                        |           2 |      5 |            3 |      13 (14 − 1) |           5 | Armoured; pushed                                          |
| Guard (17, 3), Triceratops at 10 of 20 HP   |           2 |      5 |            3 |               10 |           7 | pushed                                                    |
| Guard (17, 3), Alpha Triceratops (28 HP)    |           2 |      6 |            3 |               17 |           — | dies                                                      |

### 2.6 Interactions

| Rule                 | Interaction                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Armoured             | Ordinary: an Ankylosaurus target takes 1 less (`defenderArmoured`); the Triceratops has no armour.                                                                                                                                            |
| Acid, preview flags  | Charge! reports like Acid for fortification only: `fortificationLevel: 0` and `fortificationIgnored` set to the levels removed; the cover fields keep the real cover and `acid` stays false.                                                  |
| Raider Charge        | The Triceratops has no `CHARGE`: `chargeApplied` is false and Raiding gives it nothing.                                                                                                                                                       |
| War Drums            | Never Inspired (`SIEGE` label), so the formula has no Inspired term.                                                                                                                                                                          |
| Gang Up              | No Dinosaur attack has Gang Up (`gangUp` 0). A Goblin attacking a Triceratops counts its helpers as usual; a pushed unit is counted at its new tile by later attacks.                                                                         |
| Death blasts         | A Triceratops that kills an exploding unit advances onto its tile and is then hit by the blast, like any melee kill. A surviving exploding target is pushed before any chain. The attack preview's existing chain preview covers it.          |
| Graves, risings      | A killed target leaves a Grave under the ordinary rules. A Bitten target that dies rises in place and blocks the advance. A Zombie target's retaliation bites the Triceratops; a Zombie retaliation kill makes it rise as an ordinary Zombie. |
| Lifesteal            | A Vampire target retaliates and heals by its retaliation damage, then is pushed.                                                                                                                                                              |
| Unanswered, Wail     | Unchanged; a Triceratops is an ordinary target.                                                                                                                                                                                               |
| Eggs                 | A hostile Egg is an ordinary target (Defense 1, no retaliation, never pushed). Destroying it advances the Triceratops and counts as a kill.                                                                                                   |
| Juggernaut-role Push | Unchanged. Only Charge! follows a pushed target; a Juggernaut, Abomination, Troll, or Brontosaurus stays where it is.                                                                                                                         |
| Siege                | A Triceratops on a hostile center besieges and never captures; it blocks its own capturers until it moves.                                                                                                                                    |
| Rampage, Escape      | None: it attacks once per turn.                                                                                                                                                                                                               |

**Growth.** Kill credit is unchanged (attack kills, retaliation kills, Egg
kills). A Triceratops that reaches Big or Alpha is fully healed
([section 5](#5-promotion-and-growth-fully-heal)) before the Push, the
advance, and any chain. Alpha's +1 Attack applies from its next attack.

### 2.7 Removal of Stampede

**Decision: the `STAMPEDE` command kind is removed from
`COMMAND_KIND_ORDER_V7`,** not kept parsed-but-rejected. Reasons: the
identity bump rejects every save and replay that could contain one; a dead
kind would keep a parser branch, an error code, a union member, and a
`commandsByKind` metric key that nothing can ever produce; and the ordinal
pins survive removal. Those pins are the foundation test (length 46 → 45, and
the slice after `KABOOM` becomes `KABOOM`, `HATCH`, `RECOVER`), the same
slice in the Dinosaur faction test, and
`tests/fixtures/v7-revision12-command-ordinals.ts`, which maps ordinals **by
kind name** (its `STAMPEDE` entry is deleted and its proofs keep working).
The AI tie-break `-ordinal` of every kind after `KABOOM` moves by one with
unchanged relative order, so no decision changes. A command object with
`kind: "STAMPEDE"` is then an unknown kind and fails command parsing like any
other unknown kind.

Artefacts to delete or change in `pulp_wars-0hi.2`:

| Area          | Delete                                                                                                                                                                                                                                                                                | Change                                                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine rules  | `src/engine/v7/stampede.ts` and its export in `src/engine/index.ts`; ability `STAMPEDE`; mechanic `stampedeRunBonus2`                                                                                                                                                                 | `src/engine/rules/ruleset-v7.ts`: Triceratops and T-Rex role rules and mechanics, ability `LINEBREAKER`, mechanic `runUpBonus2`, `hatchTurns` 4, `NESTING.citySlots`, unlock `WALLBREAKER`, two capabilities, `cityUnitCapacityForV7`, display-name override                                  |
| Commands      | `STAMPEDE` in `COMMAND_KIND_ORDER_V7` (`types.ts`), the command type, parser branch, and target ordering in `commands.ts`                                                                                                                                                             | —                                                                                                                                                                                                                                                                                             |
| Reducer       | `applyStampede`, its dispatch, `STAMPEDE_NOT_LEGAL`, `STAMPEDE` in the naval-recompute list (`ATTACK` is already there) and in the `UNIT_IS_EGG` command list                                                                                                                         | `applyAttack` (Push and follow for `LINEBREAKER`), `applyPromote`, `growth.ts`                                                                                                                                                                                                                |
| Combat        | the `stampede` parameter and `StampedeHitV7` of `calculateCombatPreviewV7`; preview field `stampede`; `noRetaliationReason` `STAMPEDE`                                                                                                                                                | run-up, fortification ignoring (Charge! and Wallbreaker), `runUp`, `fortificationIgnored`; `events.ts` and `event-schema.ts` follow                                                                                                                                                           |
| Queries       | `previewStampedeV7`, `queryStampedeLanesV7`, `StampedePreviewV7`, `StampedeLanePreviewV7`, the offered `STAMPEDE` commands, the lane extension of `queryThreatenedTilesV7`, the `stampede` parameters of the public combat and chain previews                                         | `queryCombatPreviewV7`, `estimateCombatV7`, `previewAttackExplosionsV7` (follow after Push, full-heal growth), `previewCityCapacityV7`, `publicUnitStatsV7` (`dinosaur.runUpBonus`, `dinosaur.runUpMaximum` replace `stampedeRunBonus`; Attack modifier source `RUN_UP`)                      |
| Normal AI     | lane helpers and `STAMPEDE_*` constants in `src/ai/v7-dinosaur.ts`; Stampede scoring, holds, lane moves, and lane threat in `src/ai/v7.ts`                                                                                                                                            | [section 7.3](#73-normal-ai)                                                                                                                                                                                                                                                                  |
| UI            | Stampede command button, lane highlight and legend, armed confirmation, lane target family, `STAMPEDE_RUN` hold and effect, Stampede texts and CSS (`app-view-v7.ts`, `dinosaur-presentation-v7.ts`, `presentation-plan-v7.ts`, `board-host-v7.ts`, `board-renderer-v7.ts`, `v7.css`) | [section 7.2](#72-ui-text-and-surfaces)                                                                                                                                                                                                                                                       |
| Tests, tools  | `tests/unit/ruleset-v7-dinosaur-stampede.test.ts`; Stampede cases in the Dinosaur AI, presentation, DOM, canvas, and query-performance tests and fixtures                                                                                                                             | ordinal pins above; `scripts/validate-ruleset7-current-release.ts` (test list and message); `scripts/browser-smoke-v7.ts` and `scripts/browser-dinosaur-review-v7.ts` (Stampede steps become a move-then-attack Charge); `c87.8` Stampede telemetry becomes [section 8.2](#82-pulp_wars-0hi3) |
| Documentation | —                                                                                                                                                                                                                                                                                     | revision 19 marked as in [section 8.3](#83-fold-targets); `docs/architecture/NORMAL_AI.md`, `CLIENT_ARCHITECTURE.md`, `HEADLESS_SIMULATION.md`, `docs/ui/SCREEN_FLOW.md`, `docs/validation/RULESET_7_RELEASE.md`                                                                              |

The Stampede command icon (`ICON:ACTION:STAMPEDE`) keeps its manifest entry
and file and is shown beside the Charge! line of the attack preview and unit
info; no art is regenerated ([decision 12](#9-decisions-made-in-this-spec)).

## 3. T-Rex

| Value      | Revision 19 | Revision 20 |
| ---------- | ----------: | ----------: |
| Cost       |          10 |      **14** |
| Hatch time |           3 |       **4** |

Nothing else changes: 28 HP, Attack 4, Defense 2, Move 2, 2 slots, Rampage,
growth, no capture, never a treasure unit. Consequences of the two numbers
only: Disband refund 7 (the Egg's too); Arms Industry cost 13; hatch time 3
with Nesting; `hatchTurns` and an Egg's `turnsRemaining` may be 4; a T-Rex
Egg laid on turn `N` hatches at `N + 4`, or acts on `N + 2` with a Shaman's
Hatch on `N + 1` (unchanged rule).

## 4. Dinosaur Industry branch

Graph, tiers, prerequisites, and costs are unchanged: Drill → Fortification
(tier 2) → Explosives (tier 3). Only Dinosaur unlocks and display names
change.

### 4.1 Nesting

Nesting (the Dinosaur `FORTIFICATION`) keeps its two Egg effects (+4 Egg HP,
hatch one turn sooner, minimum 1; read when the Egg is laid) and adds:

**+1 unit slot in every city its owner owns.**

- **Formula.** `capacity = level + 1 + 1 (Planning) + 1 (Warrens) + 1 (Nesting)`,
  each term read from the city's **current owner**: Planning and Nesting from
  that owner's researched technology under its own tree, Warrens from its
  faction. Only the Dinosaur tree has the Nesting unlock, so only a Dinosaur
  owner can have the term, and it never combines with Warrens.
- **When it is read.** Live, like Planning: every capacity surface
  (`TRAIN`, `TRAIN_NAVAL`, `LAY_EGG`, treasure placement,
  `previewCityCapacityV7`, `previewLayEggV7`, the city panel, the Normal AI)
  calls `cityUnitCapacityForV7`. Researching Nesting raises the capacity of
  every owned city at once.
- **Ownership changes.** A city a Dinosaur seat with Nesting captures has the
  slot at once; a Dinosaur city another faction captures loses it (as with
  Warrens). Capacity loss never removes a unit or an Egg.
- **Slots unchanged.** Used slots are still the slot sum; the Triceratops,
  T-Rex, and Brontosaurus still use 2.
- **Registration.** The unlock becomes
  `NESTING { eggHp: 4, hatchTurns: 1, citySlots: 1 }`, read through the new
  capability `nestingCityCapacityBonus` (0 or 1), never a raw
  `FORTIFICATION` test. The faction rule `cityCapacityBonus` stays 0 for
  Dinosaurs.
- **Showcase.** A Dinosaur seat has every technology, so its capital is 8 of
  8 slots (was 8 of 7), North 3 of 7, Coast 2 of 6.

### 4.2 Wallbreaker

**What Explosives gives today,** identically to Human, Undead, Goblin, and
(in revision 19) Dinosaur seats: the `BLAST_MOUNTAIN` command, and melee
Field Defense demolition (a surviving land-form attacker whose owner has
Explosives destroys Field Defense on its target's tile at range 1, reason
`EXPLOSIVES`).

**Revision 20, Dinosaurs only:** `EXPLOSIVES` is displayed as
**Wallbreaker**, keeps both unlocks above, and adds the unlock
`WALLBREAKER` (capability `ignoresCityWalls`):

- When a **dinosaur unit** in land form whose owner has Wallbreaker makes an
  `ATTACK`, the defender's **City Walls levels (2) are removed** from its
  fortification for the whole exchange (damage and retaliation, as in
  [section 2.2](#22-charge) part 2). The Field Defense level and cover stay.
  Walls are not destroyed.
- **Dinosaur units** are exactly the growing roles of the Dinosaur
  registration (`GROW`): Raptor, Spitter, Ankylosaurus, Triceratops, T-Rex,
  and Brontosaurus. Never the Caveman, the Shaman, a boat, or an Egg.
- It applies at any range, on every attack of the turn (each Rampage attack
  included), and never to a retaliation the dinosaur makes as a defender. It
  is read from the attacker's owner at the moment of the attack.
- It is moot for the Triceratops (Charge! already removes every level) and
  the Spitter (Acid already removes cover and fortification).
- Humans, Undead, and Goblins keep Explosives unchanged.

| Attack (full HP)                                       | Without Wallbreaker (damage / retaliation) | With Wallbreaker |
| ------------------------------------------------------ | -----------------------------------------: | ---------------: |
| T-Rex on a Guard on a Walled center                    |                                     8 / 13 |           10 / 6 |
| T-Rex on a Guard on a Walled center with Field Defense |                                     7 / 16 |            9 / 9 |
| Raptor on a Fighter on a Walled center                 |                                     4 / 11 |            6 / 4 |
| Ankylosaurus on a Fighter on a Walled center           |                                     3 / 12 |            5 / 5 |

### 4.3 Names and unlock text

`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.DINOSAUR` becomes
`{ FORTIFICATION: "Nesting", EXPLOSIVES: "Wallbreaker" }`.

| Technology    | Dinosaur name | Dinosaur unlock text                                                             |
| ------------- | ------------- | -------------------------------------------------------------------------------- |
| Sawmilling    | same          | Sawmill; Triceratops Egg (Charge!)                                               |
| Fortification | Nesting       | Eggs have +4 HP and hatch one turn sooner; +1 unit slot in every city            |
| Explosives    | Wallbreaker   | Blast Mountain; melee attacks destroy Field Defense; dinosaurs ignore City Walls |

## 5. Promotion and growth fully heal

| Rule                               | Today                 | Revision 20                       |
| ---------------------------------- | --------------------- | --------------------------------- |
| `PROMOTE` (every faction, 3 kills) | `maxHp + 5`, `hp + 5` | `maxHp + 5`, **`hp = new maxHp`** |
| Growth, each stage (Big, Alpha)    | `maxHp + 4`, `hp + 4` | `maxHp + 4`, **`hp = new maxHp`** |

- Everything else about Promotion is unchanged: explicit command, once per
  unit, free, never embarked, independent of the activation, not for a
  growing unit (`PROMOTION_NOT_ELIGIBLE`), kill credit rules, `veteran`, and
  the state-parsing rule `maxHp = role maxHp + 5`.
- Everything else about growth is unchanged: thresholds 1 and 3 kills, the
  timing (after the exchange's damage, Lifesteal, and kill credit; before
  the Push, the advance, and any chain), a unit that died in the exchange
  does not grow, two stages in one command resolve in order, Alpha's +1
  Attack, and the state-parsing rule `maxHp = role maxHp + 4 × stage`.
- The heal removes damage only. Plague and Bitten stay.
- Examples: a Fighter at 3 of 12 HP promotes to 17 of 17 (was 8 of 17; 3
  of 10 to 15 of 15 before [section 6.3](#63-tuning-record)). A
  T-Rex at 10 of 28 HP whose attack makes its first kill is at 32 of 32 (was
  14 of 32) before it advances and Rampages. An Ankylosaurus at 2 HP whose
  retaliation makes its third kill is at 28 of 28.
- **Events.** No shape changes. `UNIT_PROMOTED { unitId, maxHp }` now implies
  `hp = maxHp`. `UNIT_GREW { unitId, stage, maxHp, hp }` always has
  `hp = maxHp`. Projection is unchanged.
- **Previews.** `previewAttackExplosionsV7` and every other public
  simulation that applies growth must set the grown unit's HP to its new
  maximum (today they add `growthHpGainV7`). Combat previews are otherwise
  unaffected: the exchange's damage is never recomputed.

## 6. Human sturdiness

Humans play straight; Undead and Goblins have tricks. Humans must therefore
be numerically sturdier. This document fixes **no number**:
`pulp_wars-0hi.3` chooses the smallest readable change by measurement, inside
these bounds, changing this document's [tuning record](#63-tuning-record),
the code, and the tests together.

### 6.1 Bounds

| Lever (maximum HP only)                    | Today          | Allowed without root approval |
| ------------------------------------------ | -------------- | ----------------------------- |
| Human Fighter, Raider, Marksman, Guard     | 10, 10, 10, 15 | +0 to +3 each                 |
| Human Knight                               | 10             | +0 to +2                      |
| Undead Skeleton, Ghoul, Banshee, Zombie    | 10, 10, 8, 18  | −0 to −2 each                 |
| Goblin Wolf Rider, Bomb Chucker, Orc Brute | 10, 8, 15      | −0 to −2 each                 |
| Goblin Goblin                              | 6              | −0 or −1                      |
| Triceratops HP / Attack / Defense          | 20 / 3 / 2     | 16–24 / ±0.5 / ±0.5           |
| Triceratops cost / hatch time / slots      | 8 / 2 / 2      | 6–9 / 1–3 / 1 or 2            |
| Charge! run-up per tile / maximum tiles    | +1 / 2         | +0.5 or +1 / fixed            |
| T-Rex cost / hatch time                    | 14 / 4         | 12–16 / 4 or 5                |
| Nesting city slots; Wallbreaker            | 1; Walls only  | fixed                         |
| Every other revision-19 Dinosaur number    | as tuned       | the revision-19 bounds        |

- **Order of preference:** first one uniform Human bonus (for example +2 on
  the four core roles); then per-role Human differences; only then Undead or
  Goblin reductions.
- **Not allowed without root approval:** any Attack, Defense, cost, Move,
  range, or ability change outside the table; any change to a Captain,
  Catapult, or Juggernaut-role unit of Humans, Undead, or Goblins; the boats
  (shared by all four factions); T-Rex stats or Rampage; what Charge!
  ignores, destroys, or pushes; Promotion and growth amounts.
  The "Today" column is the value before `pulp_wars-0hi.3`; the chosen values
  are in the [tuning record](#63-tuning-record).

- **Derived values follow the registry:** starting and Militia units,
  Raise Dead Skeletons, the Showcase, and risings (an Infect or Bitten
  rising keeps `min(10, Zombie maxHp)`). The Skeleton and the Caveman copy
  the Human Fighter's rule in code today; each must state its own HP so a
  Human Fighter change does not move them (the Caveman stays 10, inside its
  revision-19 bounds).

### 6.2 Targets (from the brief)

Measured with the revision-19 matrix
([measurement](RULESET_7_REVISION_19_DINOSAURS.md#152-measurement); the
[Goblin report's conventions](../validation/RULESET_7_GOBLIN_BALANCE.md#2-reproduction):
Normal against Normal, Rival, sixteen 1v1 pairings, five map types, sizes 11
and 14, seeds 0–29, 150 rounds, both seat orders pooled, decided games, 95%
Wilson intervals).

| Target                                                          | Band                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Human decided win rate against Undead (`HU` + `UH`)             | 50–58% (about 40–43% today)                                                          |
| Human decided win rate against Goblins (`HG` + `GH`)            | 50–58% (about 40–43% today)                                                          |
| Dinosaur decided win rate against each of Human, Undead, Goblin | 45–55% each (replaces revision 19's 40–60%)                                          |
| Undead against Goblins (`UG` + `GU`)                            | 40–60%                                                                               |
| Round-cap rate of every pairing                                 | at most 3 percentage points above the same pairing in the pre-tuning run, same seeds |
| Stalls, policy errors, exceptions                               | none                                                                                 |

If the bands cannot all be met inside [section 6.1](#61-bounds),
`pulp_wars-0hi.3` reports the best in-bounds result and asks the root.

**Superseded for `pulp_wars-0hi.3` by the user (2026-10-02):** balance is
tested on Dry Land only, with small samples, and the goal of this pass is no
gross imbalance (no faction pairing more lopsided than about 70/30) and no
blind spot (no faction helpless against a specific enemy tool, no unit
dominant or dead). The bands above are left for a later fine-tuning pass,
which the user will call for.

### 6.3 Tuning record

`pulp_wars-0hi.3`, identity `pulp-wars-poc-7r23`. A coarse pass by the
user's decision of 2026-10-02 (see the note under
[section 6.2](#62-targets-from-the-brief)): Dry Land only, 11 x 11 and
14 x 14, seeds 0-14, both seat orders (about 60 games per faction pairing),
Normal against Normal, Rival. Water maps were not tested. Evidence and the
blind-spot review are in the
[balance report](../validation/RULESET_7_REVISION_20_BALANCE.md).

| Number                    | Before | After | Bound used            |
| ------------------------- | -----: | ----: | --------------------- |
| Human Fighter maximum HP  |     10 |    12 | section 6.1, +0 to +3 |
| Human Raider maximum HP   |     10 |    12 | section 6.1, +0 to +3 |
| Human Marksman maximum HP |     10 |    12 | section 6.1, +0 to +3 |
| Human Guard maximum HP    |     15 |    17 | section 6.1, +0 to +3 |
| Caveman maximum HP        |     12 |    10 | revision 19, 10 ± 2   |

Nothing else changed: no Undead or Goblin number, no Triceratops or T-Rex
number, and no AI code. The Human Knight keeps 10 HP. Promoted values follow
(Fighter, Raider, Marksman 17; Guard 22; Caveman 15).

Win rates of decided games on Dry Land (95% Wilson intervals; coarse, about
60 games each):

| Pairing (first named wins) | Before            | After             |
| -------------------------- | ----------------- | ----------------- |
| Human over Undead          | 45.0% [33-58]     | 46.7% [35-59]     |
| Human over Goblin          | 45.0% [33-58]     | 46.7% [35-59]     |
| Dinosaur over Human        | **79.7%** [68-88] | 44.1% [32-57]     |
| Dinosaur over Undead       | 59.6% [47-71]     | 46.7% [35-59]     |
| Dinosaur over Goblin       | 60.0% [47-71]     | 50.8% [38-63]     |
| Undead over Goblin         | 60.0% [47-71]     | 60.0% (unchanged) |

The only gross imbalance, Dinosaurs over Humans (90% when the Dinosaur
moved first), is gone; every pairing is now inside 40-60%. Screening: Human
+2 alone brought it to 62%, Human +2 with the Caveman at 10 to 44%, and
Human +3 with the Caveman at 10 to 38% (Humans then won 55-57% against
Undead and Goblins). The +2 set was chosen as the smallest change that
removes the imbalance and keeps Humans the sturdier faction by number.

## 7. Commands, events, errors, queries, UI, and AI

### 7.1 Commands, events, errors, and queries

- **Commands.** `STAMPEDE` removed ([section 2.7](#27-removal-of-stampede)).
  `ATTACK` by a Triceratops is legal after its Move. `PROMOTE`, `LAY_EGG`,
  `TRAIN`, and `TRAIN_NAVAL` keep their shapes.
- **Events.** No kind added or removed. `COMBAT_RESOLVED` carries the new
  preview shape; `UNIT_PROMOTED` and `UNIT_GREW` as in
  [section 5](#5-promotion-and-growth-fully-heal).
- **Combat preview** (`CombatPreviewV7`):

  | Field                  | Change                                                                                                                                                  | Neutral |
  | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
  | `stampede`             | removed                                                                                                                                                 | —       |
  | `runUp`                | new: whole Attack from the Charge! run-up (0, 1, or 2), included in `attack2`                                                                           | 0       |
  | `fortificationIgnored` | new: fortification levels removed by Charge! (0–3) or Wallbreaker (0 or 2); 0 for Acid, which keeps `acid`                                              | 0       |
  | `fortificationLevel`   | unchanged meaning: the level applied (0 for a Triceratops attack; 0 or 1 under Wallbreaker)                                                             | —       |
  | `noRetaliationReason`  | loses `STAMPEDE`                                                                                                                                        | —       |
  | `push`, `advances`     | `push` is evaluated for a `LINEBREAKER` attacker as for `PUSH`; `advances` is true after a kill or when a `LINEBREAKER` attack will push and can follow | —       |

- **Errors.** `STAMPEDE_NOT_LEGAL` removed. No new code. A Triceratops that
  already attacked gets `UNIT_ALREADY_ACTED` as any unit.
- **Registration.** Ability `LINEBREAKER` (displayed "Charge!"); mechanic
  `runUpBonus2` (0, or 2 per tile); constant `RUN_UP_MAXIMUM_TILES_V7` 2;
  `hatchTurns` 1–4; unlock `NESTING { eggHp, hatchTurns, citySlots }`; unlock
  `WALLBREAKER`; capabilities `nestingCityCapacityBonus` and
  `ignoresCityWalls`. Serialized literals are normative; internal field names
  are the implementer's choice.
- **Queries.** `queryPlayerCommandsV7` offers a Triceratops the ordinary
  `ATTACK` commands before and after its Move and never `STAMPEDE`.
  `queryCombatPreviewV7` and `estimateCombatV7` include the run-up (from the
  unit's current `movedPathLength`), Charge!, and Wallbreaker; an estimate
  for an attack after a planned Move takes that Move's path length.
  `queryThreatenedTilesV7` gives a hostile Triceratops its ordinary
  move-then-melee reach and no lane tiles. `publicUnitStatsV7.dinosaur`
  carries `runUpBonus` and `runUpMaximum`; the Attack row lists the source
  `RUN_UP` when the unit has moved this turn. `previewCityCapacityV7` and
  `previewLayEggV7` include the Nesting slot and the T-Rex numbers. Every
  offered command is accepted, and every preview equals the resolution
  (except a chain flagged `touchesUnexplored`).

### 7.2 UI text and surfaces

Stampede's button, lanes, legend, and confirmation are replaced by the
ordinary attack flow: select the Triceratops, move, attack. The attack
preview, for own and enemy attacks alike, adds these lines when they apply:

| Surface                                 | Text                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Attack preview (run-up above 0)         | Charge +{n}                                                                                                                       |
| Attack preview (levels removed above 0) | Ignores fortification                                                                                                             |
| Attack preview (Wallbreaker)            | Wallbreaker: ignores City Walls                                                                                                   |
| Attack preview (push)                   | Pushes back; Triceratops follows                                                                                                  |
| Attack preview (blocked push)           | {unit} cannot be pushed                                                                                                           |
| Attack preview (Field Defense)          | Destroys Field Defense                                                                                                            |
| Unit status after moving                | Charge! +{n} Attack                                                                                                               |
| Ability name (unit info, Sawmilling)    | Charge!                                                                                                                           |
| Unit info (Triceratops)                 | Charge!: +1 Attack per tile moved this turn (up to +2). Ignores Walls and Field Defense, destroys Field Defense, and pushes back. |
| Promote command                         | Promote: +5 maximum HP and a full heal                                                                                            |
| Growth unit info                        | Big: +4 HP. Alpha: +8 HP, +1 Attack. Growing fully heals. Next stage in {k} kill(s).                                              |
| Log (promotion, growth)                 | unchanged wording; the HP shown is the new maximum                                                                                |

The retaliation line, death-blast warning, Bitten warning, and Armoured line
are the ordinary attack preview's. The Push and the follow animate as the
existing Push and advance. Removed texts: every Stampede row of revision 19
section 12.2. Technology names and unlock text:
[section 4.3](#43-names-and-unlock-text). Lay Egg rows, the city capacity
line, and Disband refunds read the registry.

Help lines (replace the Stampede, Nesting, and Grow lines; add the others):

- **Charge!:** a Triceratops hits harder the farther it moved this turn (+1
  Attack per tile, up to +2); its attack ignores Walls and Field Defense,
  destroys Field Defense, and pushes a surviving defender back, taking its
  place.
- **Nesting:** with Nesting, Eggs have +4 HP and hatch one turn sooner, and
  every city has one more unit slot.
- **Wallbreaker:** with Wallbreaker, dinosaurs ignore City Walls when they
  attack.
- **Grow:** a Dinosaur grows when it kills: Big after 1 kill (+4 HP) and
  Alpha after 3 kills (+4 more HP and +1 Attack), for good; each growth
  fully heals it.
- **Promotion:** a unit with 3 kills can be promoted once: +5 maximum HP and
  a full heal.

### 7.3 Normal AI

Existing guarantees hold (deterministic, PRNG-free, public view and public
previews only, 128 commands per owner turn, Dinosaur heuristics gated on a
match with a Dinosaur seat). `pulp_wars-0hi.2` must, at least:

- **Remove** every lane heuristic: Stampede scoring, "hold unmoved", lane
  moves, and lane threat ([section 2.7](#27-removal-of-stampede)).
- **Triceratops as a front-line attacker,** judged by its abilities, never by
  the `SIEGE` label: it advances with the line; among Moves that end next to
  an attackable target it prefers those with the higher previewed run-up
  when exposure is equal; it attacks through the ordinary attack scoring with
  the public preview (so ignored fortification is already in the damage),
  plus value for Field Defense destroyed and for pushing a defender off a
  hostile center while an own capturer can reach it (the values the Stampede
  scoring used), minus its exposure on the tile it ends on. It never waits
  for a lane.
- **Production:** value a Triceratops Egg as a line unit per slot and per
  Coin; price the T-Rex at 14 and hatch time 4; count the Nesting slot in
  every capacity estimate.
- **Research:** value Nesting for the slot as well as the Egg effects, and
  Wallbreaker when a visible hostile city has Walls.
- **Promotion (all factions):** an eligible unit is promoted before it
  attacks or ends its turn, so the heal is not wasted.
- **Growth:** value a growth kill by the HP it restores (the unit's missing
  HP plus 4), not a flat 4.
- **Against Dinosaurs:** include the run-up in threat estimates of a visible
  Triceratops (reach by Move, then melee with `min(2, path length)`); do not
  count Walls or Field Defense against a Triceratops, or Walls against a
  dinosaur whose owner has Wallbreaker; value killing a wounded dinosaur
  before it can grow.
- Headless matches of every pairing finish without stalls or policy errors;
  pinned decision hashes are re-pinned with the diffs explained; the
  tactical benchmark replaces its two Stampede scenarios with a Charge taken
  after a run-up and a Charge declined when the Triceratops would die for no
  gain.

## 8. Test expectations and fold targets

### 8.1 `pulp_wars-0hi.2`

New tests live in `tests/unit/ruleset-v7-revision20-*.test.ts`.

| Area              | Required evidence                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity          | exact 7r20 identity; 7r19 setup, state, save, and replay rejected; gap-free prior list ending in 7r19; save key and obsolete-key cleanup through `v7r19`; release contract and smoke scripts updated                                                                                                                                                                                                             |
| Stampede removal  | 45 command kinds with `KABOOM`, `HATCH`, `RECOVER` adjacent; a `STAMPEDE` command fails parsing; no `STAMPEDE_NOT_LEGAL`, `previewStampedeV7`, `queryStampedeLanesV7`, `stampede` field, or `STAMPEDE` reason exists; never offered; the revision-12 ordinal proofs still pass                                                                                                                                   |
| Triceratops stats | every value of [section 2.1](#21-stats); attack after a Move accepted; one attack per turn; no capture                                                                                                                                                                                                                                                                                                           |
| Run-up            | 0, 1, and 2 tiles moved; a 3- or 4-tile Road Move still +2; tiles passed over own units count; an interrupted Move counts its truncated length; no bonus when unmoved or after landing; Alpha stacking; no bonus for other roles; `runUp` in the preview and in `attack2`                                                                                                                                        |
| Fortification     | Walls, Field Defense, and both removed for damage and for retaliation; Forest and Mountain cover kept; Walls still standing afterwards; `fortificationLevel` 0 and `fortificationIgnored` 1, 2, 3; every row of [section 2.5](#25-worked-examples)                                                                                                                                                               |
| Field Defense     | destroyed on the target tile with reason `CATAPULT` on a kill, a push, a blocked push, and when the Triceratops dies                                                                                                                                                                                                                                                                                             |
| Push and follow   | every row of [section 2.4](#24-cases); retaliation before the Push; pushed unit keeps HP and statuses and loses capture eligibility; the event order of [section 2.3](#23-resolution-and-event-order); Juggernaut-role Push still does not follow                                                                                                                                                                |
| Interactions      | each row of [section 2.6](#26-interactions): Armoured target, Zombie bite and Infect of the Triceratops, Bitten target rising, Vampire target Lifesteal, exploding target killed (blast hits the advanced Triceratops) and pushed (before the chain), Egg target, never Inspired, growth from a Charge kill                                                                                                      |
| T-Rex             | cost 14, hatch 4 (3 with Nesting), refund 7, Arms Industry 13, `turnsRemaining` 4 accepted and 5 rejected; every other T-Rex value unchanged                                                                                                                                                                                                                                                                     |
| Nesting           | capacity with and without Nesting, with Planning, at each level; `CITY_CAPACITY_FULL` before and acceptance after researching it; a city captured by and from a Dinosaur seat with Nesting; a Goblin-captured Dinosaur city has Warrens and no Nesting slot; `previewCityCapacityV7`, `previewLayEggV7`; Egg effects unchanged; Showcase capital 8 of 8                                                          |
| Wallbreaker       | each of the six dinosaur units ignores Walls with it and not without it; Caveman, Shaman, and boats never; Field Defense and cover kept; Walls not destroyed; Rampage continuation attacks; not on the dinosaur's retaliation; the [section 4.2](#42-wallbreaker) table; Blast Mountain and melee Field Defense demolition kept; Human, Undead, and Goblin Explosives unchanged; per-viewer name and unlock text |
| Promotion, growth | `PROMOTE` at full, wounded, and 1 HP sets `hp` to the new maximum for a unit of each faction; Big and Alpha each set `hp` to the new maximum from attack, retaliation, and Rampage kills; two stages in one command; a dying unit does not grow; Plague and Bitten kept; event payloads; the chain preview uses the healed HP                                                                                    |
| Parity            | matches without a Dinosaur seat equal revision 19 apart from identity and preview field names up to the first `PROMOTE` of a wounded unit; fixture and corpus diffs explained                                                                                                                                                                                                                                    |
| AI                | [section 7.3](#73-normal-ai) scenarios (run-up Move preferred, Charge on a fortified target, push off a center for a capturer, Charge declined, promote before attacking, opponent not relying on Walls); determinism and command bounds; headless matches of all sixteen pairings without stalls or policy errors                                                                                               |
| UI                | [section 7.2](#72-ui-text-and-surfaces) lines and Help; no Stampede control, lane, or legend; technology names and text; the browser smoke moves a Triceratops, sees "Charge +{n}", and attacks                                                                                                                                                                                                                  |

Profile: `ai/map/persistence` with the `ui/presentation` gates, as set in the
bead.

### 8.2 `pulp_wars-0hi.3`

- The matrix and targets of [section 6.2](#62-targets-from-the-brief), a
  pre-tuning and a post-tuning run on the same seeds, and every tuned number
  inside [section 6.1](#61-bounds) recorded in
  [section 6.3](#63-tuning-record) with code and tests changed together.
- Registry tests for every changed HP and for the Skeleton and Caveman
  staying independent of the Human Fighter; risings capped at the Zombie's
  maximum.
- Telemetry per Dinosaur seat-game (replacing the Stampede counters):
  Triceratops Eggs laid and hatched; Triceratops attacks by tiles moved (0,
  1, 2), with damage, kills, pushes, blocked pushes, follows onto centers,
  fortification levels ignored, Field Defense destroyed, and Triceratops
  lost within one round of attacking; T-Rex Eggs laid and hatched, round of
  the first T-Rex, kills, Rampage chain lengths, and losses; kills by role;
  HP restored by growth, by role; attacks that ignored Walls through
  Wallbreaker; research of Nesting and Wallbreaker and the round reached;
  used slots and capacity; and, for every faction, promotions and HP
  restored by them.
- **Usefulness targets:** a Triceratops Egg is laid in at least half of the
  Dinosaur seat-games that researched Sawmilling; in at least half of the
  seat-games with a hatched Triceratops it attacks with a run-up of 1 or 2;
  the report states its kill and push counts.
- **T-Rex watch metrics** ([concern 1](#10-concerns)): T-Rex share of all
  kills credited to Dinosaur units (watch band: at most 40%); Dinosaur
  decided win rate with and without a hatched T-Rex (watch: a gap above 15
  percentage points); share of T-Rex units that die; HP restored to T-Rex
  units by growth per game; share of Dinosaur seat-games that hatch one.
  Outside a watch band the report explains and proposes; it does not change
  T-Rex stats.
- **Branch watch:** share of Dinosaur seat-games that research Nesting and
  Wallbreaker; below 25% and 10% the report explains why and proposes.
- A written report, `docs/validation/RULESET_7_REVISION_20_BALANCE.md`.

Profile: `ai/map/persistence`, as set in the bead.

### 8.3 Fold targets

The current rules still describe three factions; the Dinosaur fold is
`pulp_wars-c87.9`, which `pulp_wars-0hi.3` blocks.

| Bead              | Document work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulp_wars-0hi.2` | **Mark revision 19:** add to its status line "amended by [revision 20](RULESET_7_REVISION_20.md); where they differ, revision 20 wins", and a one-line "Superseded by revision 20" note under its section 7 heading (Stampede, whole section) and at the Triceratops and T-Rex rows of section 3, the Fortification and Explosives rows of section 4, the capacity bullet of 5.1, the Effect bullet of 5.2, the T-Rex row of 6.6, the Stampede items of sections 9–15, decisions 22–32, and concerns 2–5. Its text is not rewritten. Update this document's status, and the architecture, screen-flow, and release documents of [section 2.7](#27-removal-of-stampede). |
| `pulp_wars-0hi.3` | This document's tuning record; the balance report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pulp_wars-c87.9` | Folds revision 19 as amended into the current rules with identity `pulp-wars-poc-7r20`: section 1 (identity, four factions); 4.4 (slot sum, Nesting term); 6.2 (Nesting and Wallbreaker unlocks); section 10 Promotion bullet (full heal); section 11 (Dinosaur roster with the section 2.1 and 3 rows, and the section 6.3 HP of Human, Undead, and Goblin units); 12.2 (the Triceratops is not in the "cannot attack after moving" list); 13.2–13.4 (run-up, Charge! and Wallbreaker fortification, Push and follow); 16 (AI); a Dinosaur faction-rules section with no Stampede; the revision-history rows for 19 and 20.                                            |

## 9. Decisions made in this spec

Each fills a gap in the brief with the simplest rule consistent with the
engine; the root may change any of them.

1. **`STAMPEDE` is removed from the command order,** not kept
   parsed-but-rejected ([section 2.7](#27-removal-of-stampede)).
2. **Charge! is an ordinary `ATTACK`** with no second resolution path; its
   ability literal is `LINEBREAKER`, because `CHARGE` is the Raider's.
3. **Run-up counts tiles entered, in any direction** (`movedPathLength`), not
   distance toward the target and not a straight line.
4. **Ignoring fortification, destroying Field Defense, and the Push need no
   Move.** Only the Attack bonus depends on moving.
5. **The reduced Defense also lowers the retaliation,** as with Acid: one
   Defense value per exchange.
6. **The defender is pushed even if the Triceratops dies** in the exchange
   (the existing Push behaviour); Field Defense is destroyed either way.
7. **The follow uses the advance conditions** and may end on a center; the
   Juggernaut-role Push still does not follow.
8. **The Triceratops keeps the `SIEGE` label** and so is never Inspired by
   War Drums (the registry assertion ties the label to the role).
9. **Triceratops HP 20 and Move 2** are the brief's starting stats; the other
   values are revision 19's.
10. **Nesting's slot is a technology capability of the current owner,** added
    to Planning; the Dinosaur faction rule stays 0.
11. **Wallbreaker keeps both Explosives unlocks** and applies to the six
    growing roles, at any range, on the attack only, live from the attacker's
    owner.
12. **The Stampede icon is reused** for Charge! under its existing subject
    key; no art work.
13. **Event shapes are unchanged** for Promotion and growth.
14. **Preview fields:** `runUp` replaces `stampede`; `fortificationIgnored`
    reports removed levels for Charge! and Wallbreaker; Acid is unchanged.
15. **Bounds of [section 6.1](#61-bounds),** including the Triceratops and
    T-Rex cost and hatch bounds and the order of preference.
16. **Dinosaur band 45–55%** replaces revision 19's 40–60%, and the cap
    target compares each pairing with its own pre-tuning run.
17. **The usefulness and watch thresholds of [section 8.2](#82-pulp_wars-0hi3)**
    (half of seat-games; 40%; 15 points; 25% and 10%).
18. **The fold is split** as in [section 8.3](#83-fold-targets): the current
    rules change only in `pulp_wars-c87.9`.
19. **Out of scope, recorded as follow-up ideas:** a straightforward attacker
    for Humans, Undead, and Goblins; any T-Rex stat or Rampage change.

## 10. Concerns

1. **The T-Rex may stay dominant, and full-heal growth makes it stronger.**
   Its first kill now restores all its HP in the middle of a Rampage (10 of
   28 becomes 32 of 32), and the third again. Cost 14 and hatch 4 delay it
   and thin it out but do not weaken one that is on the board. The
   [section 8.2](#82-pulp_wars-0hi3) watch metrics exist to show this; the
   named next steps, each needing root approval, are a T-Rex stat change, a
   cap on Rampage attacks, or growth that heals less for the T-Rex.
2. **Full-heal growth favours every growing unit** that fights weak units
   first, and feeds the Dinosaur win rate that
   [section 6.2](#62-targets-from-the-brief) now holds to 45–55%.
3. **Promote becomes a held heal.** It is free, explicit, and independent of
   the activation, so a player can save it for the moment a veteran-to-be is
   almost dead. The Normal AI promotes at once and gets less from it than a
   human will.
4. **Charge! every turn, without moving, still ignores fortification and
   pushes.** A Triceratops next to a Walled city empties its center turn
   after turn; Walls and Field Defense are worth nothing against it. This is
   the role the user asked for, but it is the strongest anti-fortification
   unit in the game and Humans are the faction that fortifies.
5. **Run-up is easy to get:** any two tiles, including sideways along a
   line. Zone of control is the only limit (a Move that enters it stops).
6. **The Triceratops cannot be drummed** (decision 8), unlike every other
   Dinosaur melee unit. Changing it means relaxing the registry assertion or
   adding a mechanic.
7. **Wallbreaker plus Charge! plus Acid** leave Walls useless against a
   late-game Dinosaur army. Walls are a city reward other factions choose;
   the report should state how often Wallbreaker attacks hit Walled centers.
8. **Human HP changes move every pairing,** including `HH` and the four-seat
   mixes, and lengthen Human mirror fights; the cap target guards this.
9. **Lower Undead and Goblin HP interacts with fixed damage:** Kaboom and
   death blasts are fixed numbers, so each HP removed from a Goblin unit
   makes friendly fire deadlier, and a 5-HP Goblin dies to its own Kaboom
   splash. Prefer Human increases.
10. **Fixture churn:** the identity, the removed command kind, the preview
    fields, and Promotion change nearly every pinned hash and the release
    corpus.
11. **Sequencing with `pulp_wars-c87.8`:** it is still tuning revision-19
    numbers, including the Stampede this document deletes. Its Triceratops,
    T-Rex, and Stampede tuning is superseded; its other numbers stand.

## 11. Implementation notes (`pulp_wars-0hi.2`)

Where the implementation differs from, or had to add to, the text above.
None of them changes a rule the user asked for; each is the smallest
behaviour consistent with the rest of the contract.

1. **The Caveman keeps 12 HP, not 10.** [Section 6.1](#61-bounds) says the
   Caveman "stays 10"; `pulp_wars-c87.8` had already tuned it to 12 (17
   when promoted), and the root confirmed that the c87.8 numbers this
   document does not name stand. The Caveman and the Skeleton now state
   their own HP in the registry (12 and 10), so a Human Fighter change does
   not move them. No Human, Undead, or Goblin number changed in this bead.
2. **The [section 4.2](#42-wallbreaker) table's Ankylosaurus row** gives the
   retaliation without the Ankylosaurus's own Armoured reduction. The
   engine applies it as before: 3 / 11 without Wallbreaker and 5 / 4 with
   it. The other rows match.
3. **Push preview of a Charge!.** The public preview of a Charge! Push reads
   the explored tile behind the target as resolution does and does not need
   the viewer's detection of that tile (the Juggernaut-role Push keeps its
   older rule), so `WILL_PUSH` and `BLOCKED` are exact. Two cases stay
   `UNKNOWN_BEHIND_FOG` although the tile is explored, because they depend
   on the target owner's research, which is not public: a Mountain
   (Engineering) or Deep Water (Navigation) behind another player's unit.
   The UI then says "{unit} may be pushed back", and the attack may push
   and follow. An unexplored tile behind never pushes
   ([section 2.4](#24-cases)).
4. **Run-up in unit stats.** The `RUN_UP` Attack modifier and the status
   "Charge! +{n} Attack" are published only during the owner's turn and
   while the Triceratops can still attack, so a spent or waiting
   Triceratops does not show a bonus it cannot use. `publicUnitStats`
   always carries `dinosaur.runUpBonus` and `runUpMaximum`.
5. **Hit cue.** A Charge! with a run-up above 0 keeps the Stampede hit flash
   (now `CHARGE_HIT`); a Charge! without a run-up is presented as an
   ordinary melee attack. The Push and the follow use the existing Push and
   advance animation, and `UNIT_PUSHED` is emitted before the follower's
   `UNIT_MOVED`.
6. **Help.** The Promotion line is shown in "How to play" in every match
   (a Promotion is a rule of every faction), not in the "Dinosaurs" list,
   which is shown only in matches with a Dinosaur seat.
7. **Unlock list of Wallbreaker.** The technology detail lists the existing
   Explosives lines ("Blast mountain", "Surviving melee attacks destroy
   Field Defense", and the Drill line) and adds "Dinosaurs ignore City
   Walls".
8. **Normal AI.**
   - A wounded unit that can be promoted is promoted before any attack,
     capture, or End Turn, in every match and for every faction. This is
     the only decision change in matches without a Dinosaur seat: in a
     28-match parity run against the revision-19 policy, 12 matches are
     identical command for command and the other 16 first differ at such a
     `PROMOTE`.
   - A hostile dinosaur's projected hit assumes Wallbreaker, because other
     players' research is not public. An own dinosaur's uses the seat's
     research.
   - A Triceratops that already stands next to its target steps around it
     for the run-up when that makes the Charge better (a kill instead of a
     hit, or more damage) and the destination is not lethal.
   - Kills, hits, and captures by a Triceratops otherwise use the ordinary
     attack priorities; the Stampede lane, launch-tile, and lane-blocking
     heuristics are deleted, not adapted.
9. **Telemetry.** The balance matrix reports a `charge` block in place of
   the Stampede block: Triceratops attacks by run-up (0, 1, 2), kills,
   Pushes, follows, blocked Pushes, Field Defense destroyed, attacks that
   ignored fortification, and Wallbreaker attacks.
10. **Observed, for `pulp_wars-0hi.3`.** Full-heal Promotion lengthens some
    matches without a Dinosaur seat: Undead against Undead on Pangea, seed
    0, now ends in round 142 instead of 47 (an outcome, no stall); eight
    other seeds of that pairing moved by at most five rounds. The
    [section 6.2](#62-targets-from-the-brief) round-cap target should be
    measured against a pre-tuning run made with this implementation.
