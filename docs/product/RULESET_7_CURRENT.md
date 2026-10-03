# Pulp Wars Ruleset 7: current rules

**Status:** authoritative description of the current Ruleset 7 runtime,
`pulp-wars-poc-7r31`, for all seven playable factions, Human (`ORIGINAL`),
Undead (`UNDEAD`), Goblin (`GOBLIN`), Dinosaur (`DINOSAUR`), Martian
(`MARTIAN`), Ice Folk (`ICE_FOLK`), and Dwarf (`DWARF`). It folds in
revision 12 (free opening technology, Fruit visible from the start, Fertile
Ground revealed by Gathering, resources kept under improvements, Normal AI
opening research, and Raider Escape; no separate overlay document) and the
overlays of revisions [13](RULESET_7_REVISION_13_UNDEAD.md) (the Undead
faction), [14](RULESET_7_REVISION_14_BALANCE.md) (Plague, Bitten, the
unanswered Vampire, villages, and income caps),
[15](RULESET_7_REVISION_15_BALANCE.md) (three-turn Plague, 18-HP Zombie),
[16](RULESET_7_REVISION_16.md) (16a: orthogonal Shallow Water and the capital
growth guarantee; 16b: 2-tile boats and landing; 16c: economy deflation),
[17](RULESET_7_REVISION_17_GOBLINS.md) (the Goblin faction, with the
`pulp_wars-0ao.7` tuned numbers), [18](RULESET_7_REVISION_18.md) (friendly
pass-through, the Road half cost by origin, and the fixed Showcase setup),
[19](RULESET_7_REVISION_19_DINOSAURS.md) (the Dinosaur faction) as amended by
[20](RULESET_7_REVISION_20.md) (the Triceratops's Charge! replacing
Stampede, the T-Rex cost and hatch time, Nesting's city slot, Wallbreaker,
and the full heal of a Promotion or growth stage),
[21](RULESET_7_REVISION_21_ACHIEVEMENTS.md) (the Conqueror, Land Baron, Sea
Dog, and Slayer achievements), the `pulp_wars-0hi.3` coarse balance
numbers of `pulp-wars-poc-7r23`
([revision 20 section 6.3](RULESET_7_REVISION_20.md#63-tuning-record): Human
Fighter, Raider, and Marksman 12 HP, Guard 17, Caveman 10), the
[Martian overlay](RULESET_7_MARTIANS.md) (the Martian faction: engine
`pulp_wars-t6s.2` at `pulp-wars-poc-7r22`, Normal AI `pulp_wars-t6s.3`, UI
`pulp_wars-t6s.4` with the production art of `pulp_wars-t6s.6`, and the
`pulp_wars-t6s.5` coarse balance number of `pulp-wars-poc-7r25`, Colossus
Defense 2.5, from its
[tuning record](RULESET_7_MARTIANS.md#165-tuning-record) and its
implementation notes in
[section 19](RULESET_7_MARTIANS.md#19-implementation-notes-pulp_wars-t6s2)),
the [Ice Folk overlay](RULESET_7_ICE_FOLK.md) (the Ice Folk faction:
engine `pulp_wars-7g3.3` at `pulp-wars-poc-7r24`, Normal AI
`pulp_wars-7g3.4`, UI `pulp_wars-7g3.6` with the production art of
`pulp_wars-7g3.5`, the root rulings of its
[section 17.5](RULESET_7_ICE_FOLK.md#175-root-rulings), and the
`pulp_wars-7g3.7` coarse balance numbers of `pulp-wars-poc-7r27`, Yeti 9 HP
and Defense 1.5, from its
[tuning record](RULESET_7_ICE_FOLK.md#165-tuning-record), with its engine
notes in
[section 19](RULESET_7_ICE_FOLK.md#19-implementation-notes-pulp_wars-7g33)
and its UI notes in
[section 20](RULESET_7_ICE_FOLK.md#20-ui-implementation-notes-pulp_wars-7g36)),
and the [Dwarf overlay](RULESET_7_DWARVES.md) (the Steampunk Dwarf faction:
engine `pulp_wars-78i.3` at `pulp-wars-poc-7r30`, Normal AI
`pulp_wars-78i.4`, UI `pulp_wars-78i.6` with the production art of
`pulp_wars-78i.5`, the root rulings of its
[section 20.5](RULESET_7_DWARVES.md#205-root-rulings), and the
`pulp_wars-78i.7` coarse balance numbers of `pulp-wars-poc-7r31`, the bomb 5
and 6 with Dive, from its
[tuning record](RULESET_7_DWARVES.md#195-tuning-record), with its Normal AI
notes in
[section 15.1](RULESET_7_DWARVES.md#151-implementation-status-pulp_wars-78i4),
its engine notes in
[section 22](RULESET_7_DWARVES.md#22-implementation-notes-pulp_wars-78i3),
and its UI notes in
[section 23](RULESET_7_DWARVES.md#23-ui-implementation-notes-pulp_wars-78i6)).
The Undead, the Goblins, the Dinosaurs, the Martians, the Ice Folk, and the
Dwarves are part of the ordinary game: faction choice is offered in every
match setup, with no development flag. The numbers of the first five
factions were checked against the engine code at `pulp-wars-poc-7r25`, those
of the Ice Folk at `pulp-wars-poc-7r30` (`pulp_wars-7g3.8`), and those of
the Dwarves at `pulp-wars-poc-7r31` (`pulp_wars-78i.8`); `pulp-wars-poc-7r24`
(`pulp_wars-7g3.3`) registers the Ice Folk and changes no rule of the other
factions, `pulp-wars-poc-7r26` (`pulp_wars-9s0.2`) changes only Pangea map
generation (the coast ring, [section 2.3](#23-map-types)),
`pulp-wars-poc-7r27` (`pulp_wars-7g3.7`) changes only the Ice Folk Yeti (9
HP, Defense 1.5), `pulp-wars-poc-7r28` (`pulp_wars-9s0.5`) adds the **Rift**
terrain, folded in directly here (sections [2.3](#23-map-types),
[2.4](#24-biomes-terrain-and-resources), [8.1](#81-common-placement-gates),
[12.1](#121-movement), and [13.4](#134-after-combat)); its full ruling of
every interaction is the [Rift overlay](RULESET_7_RIFT.md),
`pulp-wars-poc-7r29` (`pulp_wars-w5j.1`) makes every player play a
different faction, folded in directly in [section 2.1](#21-match-setup)
from the [unique-factions overlay](RULESET_7_UNIQUE_FACTIONS.md), and
`pulp-wars-poc-7r30` (`pulp_wars-78i.3`) registers the Dwarves and changes
no rule of the other factions (the per-unit living test, the one occupancy
predicate, and the board-or-all-units accessors it introduced return what
the former rules returned in a match without a Dwarf seat), and
`pulp-wars-poc-7r31` (`pulp_wars-78i.7`) changes only the Dwarf
Gyrocopter's bomb (5, and 6 with Dive).

**No pending faction overlay.** Every faction the engine registers is
described here. The [Dwarf overlay](RULESET_7_DWARVES.md) was the last
pending one; `pulp_wars-78i.8` folded it in as
[section 22](#22-dwarf-faction-rules). (The
[Mind Control overlay](RULESET_7_MIND_CONTROL.md) is a contract whose
engine is not implemented, so this document does not describe it.) The Dwarf additions (the `burrowed`,
`surfacedThisTurn`, and `bombedThisTurn` lists, the two per-unit flags and
the `dwarf` block of the unit stats, and three combat-preview fields) are
neutral in a match without a Dwarf seat
([section 22.14](#2214-commands-events-errors-and-queries)).

**Supersedes for current play:** [Ruleset 7 baseline](RULESET_7.md) and its
overlays, revisions [4](RULESET_7_REVISION_4_BIOME_ECONOMY.md),
[5](RULESET_7_REVISION_5_ACHIEVEMENTS.md),
[6](RULESET_7_REVISION_6_WATER_NAVAL.md),
[7](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md),
[8](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md),
[9](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md),
[10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md),
[11](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md),
[13](RULESET_7_REVISION_13_UNDEAD.md),
[14](RULESET_7_REVISION_14_BALANCE.md),
[15](RULESET_7_REVISION_15_BALANCE.md),
[16](RULESET_7_REVISION_16.md),
[17](RULESET_7_REVISION_17_GOBLINS.md),
[18](RULESET_7_REVISION_18.md),
[19](RULESET_7_REVISION_19_DINOSAURS.md),
[20](RULESET_7_REVISION_20.md), and
[21](RULESET_7_REVISION_21_ACHIEVEMENTS.md), with the
[Martian overlay](RULESET_7_MARTIANS.md), the
[Ice Folk overlay](RULESET_7_ICE_FOLK.md), and the
[Dwarf overlay](RULESET_7_DWARVES.md). Those documents remain as design
history, exact schema/ordering detail, measurements, and acceptance
provenance. When one of them disagrees with this document, this document
describes the current rules. In particular, the [baseline](RULESET_7.md)
still states revision-3 values and roles that later overlays replaced without
editing it (for example Walls, Mine, and Market numbers, Medic, Scout, Heavy,
Horse Archer, Breacher, Saboteur, and Grand Works), the revision 13–15
overlays state values that later revisions replaced (for example the Lich's
Attack 2.5, the 20-HP Zombie, unlimited Plague, the Move-3 embarked unit, the
level-5 income cap, and the 4-Coin Market), the revision-17 overlay's
tuning bounds and decisions keep the pre-tuning contract values (two starting
Goblins, Goblin Attack 2 and Defense 1, Kaboom 4, death blasts 3/5/5), the
revision-19 overlay keeps the Stampede command, its 18-HP, Move-1
Triceratops and its T-Rex costing 10 and hatching in 3, and the
`pulp_wars-c87.8` interim values (Caveman 12 HP, a one-slot Triceratops
hatching in one turn), revision 20 keeps the Human HP
before `pulp_wars-0hi.3` (Fighter, Raider, and Marksman 10, Guard 15) in its
bounds, and the Martian overlay keeps the contract's Colossus Defense 3 in
its tuning bounds, examples computed against 10-HP Human units, its
placeholder-art plan, and Rift rules written before the terrain existed
(the [Rift overlay](RULESET_7_RIFT.md) implements and completes them), and
the Ice Folk overlay keeps the contract's 10-HP, Defense-2 Yeti in its
tuning bounds, worked examples and per-unit analysis computed with that
Yeti and with 10-HP Human Fighters, Raiders, and Marksmen and 15-HP Guards,
a setup in which every combination of factions is legal, and its
placeholder-art plan, and the Dwarf overlay keeps the root's decided bomb of
4 (5 with Dive) in its decisions, tuning bounds, per-unit analysis, and
some Help text, an identity written as `7rNN`, and a fallback-art plan; the
values here are current. Where a document and the code disagreed, the
code's behavior is the rule and is stated below;
[Known discrepancies](#24-known-discrepancies) lists the open items as of
`pulp-wars-poc-7r31`.

**Terms.** "On the board" means a unit that currently exists (HP above 0).
**Living** has the narrower revision-13 meaning used by Wail, Plague,
Bitten, and Infect, read per unit (`isLivingUnitV7`): a unit whose owner's
faction is not `UNDEAD` and whose role is not a **construct** under its
owner's registration. Undead units are therefore never living, whatever
their HP, and neither are the Dwarf Clockwork Gunner and Brass Titan;
Human, Goblin, Dinosaur, Martian, and Ice Folk units and every other Dwarf
unit are living (an Egg is living but takes no status,
[section 19.3](#193-eggs)).
**Goblin-crewed** units are the Goblin seat's Goblin, Wolf Rider, Bomb
Chucker, Rocket Cart, and Scrap Buggy (they can Kaboom); **exploding units**
are its Bomb Chucker, Rocket Cart, and Scrap Buggy (they also explode when
killed) ([section 18](#18-goblin-faction-rules)). **Dinosaur units** (or
**dinosaurs**) are the Dinosaur seat's growing roles: Raptor, Spitter,
Ankylosaurus, Triceratops, T-Rex, and Brontosaurus; never the Caveman, the
Shaman, a boat, or an Egg. **Egg-laid roles** are the five trainable
dinosaurs (all but the Brontosaurus), which a Dinosaur seat lays as
**Eggs**: units of the form `EGG` ([section 19](#19-dinosaur-faction-rules)).
**Shielded units** are the Martian seat's eight land roles in land or
embarked form (never a boat or a Thrall); **machines** are its Saucer and
Mothership (**flyers**) and its Tripod and Colossus (**walkers**); **foot
units** are its Grunt, Ray Gunner, Shield Projector, Brain, and Thrall;
**ray units** are its Ray Gunner, Tripod, and Colossus; a **Thrall** is a
`FIGHTER`-role unit of a Martian seat listed in `thralls`
([section 20](#20-martian-faction-rules)). **Ice Folk units** are the land
roles of an Ice Folk seat in land form (never a boat or an embarked unit);
**Mountain-born** units are its Yeti, Boulder Yeti, and Frost Giant; a unit
of any faction is **Chilled** while its `chilled` entry has `turnsLeft` of
at least 1 and **sluggish** (Frozen) on the turn of a new freeze; **Snow**
is a derived property of land tiles
([section 21](#21-ice-folk-faction-rules)). **Dwarf units** are the land
roles of a Dwarf seat in land form (never a boat or an embarked unit);
**constructs** are its Clockwork Gunner and Brass Titan; **Dwarf machines**
(for Repair only) are its Gyrocopter, Clockwork Gunner, Steam Mole, Steam
Cannon, Steam Tank, and Brass Titan, which is not the Martian meaning of
"machine" (a movement mode); a **burrowed** unit is one in the `burrowed`
list, off the board, shown as a **mound** on its tile
([section 22](#22-dwarf-faction-rules)).

**Source of truth in code:** `src/engine/rules/ruleset-v7.ts` (technology,
faction registrations, roles and role mechanics, faction rules, action
costs, the shared "may act after moving" rule `unitMayActAfterMoveV7`, and
the shared terrain rules `canEnterTerrainV7`, `terrainStopsMoveV7`, and
`canCrossWaterV7`), `src/engine/v7/` (reducer, economy, spatial economy,
combat, Graves, Infect, Wail, Plague and Bitten afflictions, explosions,
Eggs, growth, Shields, Cooling, Thralls, and Mind Control cooldowns
(`martian.ts`), Chill, Snow, the Blizzard, and the Cold Aura
(`ice-folk.ts`), Dig In, clockwork, Knockback, and the rider brake
(`dwarf.ts`), Tunnel, surfacing, Bomb Run, and Assemble
(`dwarf-reducer.ts`), the board and owned-unit accessors and the occupancy
predicate (`units.ts`), achievements, movement, map generation, queries,
views), and `src/ai/v7.ts` with its `src/ai/v7-*.ts` helpers (Normal AI,
including `src/ai/v7-goblin.ts`, `src/ai/v7-dinosaur.ts`,
`src/ai/v7-martian.ts`, `src/ai/v7-ice-folk.ts`, and `src/ai/v7-dwarf.ts`).

**Not covered here:** production art specifications
([Art Direction](../art/ART_DIRECTION.md) and
[asset classes](../art/classes/naval.md)), UI layout
([screen flow](../ui/SCREEN_FLOW.md) and
[client architecture](../architecture/CLIENT_ARCHITECTURE.md)), validation
evidence ([release validation](../validation/RULESET_7_RELEASE.md),
[tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)), and
performance work ([public planning](../architecture/PUBLIC_PLANNING_V7.md)).

Ruleset 7 does not change Ruleset 6, which remains playable through the
separate [Ruleset 6](RULESET_6.md) route.

## 1. Identity and compatibility

| Boundary                                   | Current value                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r31`                                                                                                                                                                                                                                                                                                                                                                              |
| Game-state schema                          | `7`                                                                                                                                                                                                                                                                                                                                                                                               |
| Command/event/save/replay numeric versions | `7`                                                                                                                                                                                                                                                                                                                                                                                               |
| Browser autosave                           | `pulpWars.save.v7r31.current`                                                                                                                                                                                                                                                                                                                                                                     |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                                                                                                                                                                                                                                                                                                                                                        |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`, `DWARF`                                                                                                                                                                                                                                                                                                                        |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`, `GOBLIN_BASELINE_V1`, `DINOSAUR_BASELINE_V1`, `MARTIAN_BASELINE_V1`, `ICE_FOLK_BASELINE_V1`, `DWARF_BASELINE_V1`                                                                                                                                                                                                                                    |
| Faction to tree binding                    | `ORIGINAL` → `ORIGINAL_BASELINE_V5`; `UNDEAD` → `UNDEAD_BASELINE_V1`; `GOBLIN` → `GOBLIN_BASELINE_V1`; `DINOSAUR` → `DINOSAUR_BASELINE_V1`; `MARTIAN` → `MARTIAN_BASELINE_V1`; `ICE_FOLK` → `ICE_FOLK_BASELINE_V1`; `DWARF` → `DWARF_BASELINE_V1`                                                                                                                                                 |
| Display names                              | `ORIGINAL` is "Human"; `UNDEAD` is "Undead"; `GOBLIN` is "Goblin"; `DINOSAUR` is "Dinosaur"; `MARTIAN` is "Martian"; `ICE_FOLK` is "Ice Folk"; `DWARF` is "Dwarf"                                                                                                                                                                                                                                 |
| Achievements (`ACHIEVEMENT_IDS_V7`)        | `EXPLORER`, `ENGINEER`, `MUSTER`, `CONQUEROR`, `LAND_BARON`, `SEA_DOG`, `SLAYER` ([section 5](#5-achievements-and-monuments))                                                                                                                                                                                                                                                                     |
| Playable factions                          | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`, `DWARF`, all described here and offered by the browser setup, the engine, and the headless tools                                                                                                                                                                                                                               |
| Folded overlays                            | Martian ([section 20](#20-martian-faction-rules), `pulp_wars-t6s.7`); Ice Folk ([section 21](#21-ice-folk-faction-rules), `pulp_wars-7g3.8`); Dwarf ([section 22](#22-dwarf-faction-rules), `pulp_wars-78i.8`); the Rift (`7r28`, [Rift overlay](RULESET_7_RIFT.md)) and one faction per seat (`7r29`, [unique-factions overlay](RULESET_7_UNIQUE_FACTIONS.md)), folded directly when they landed |

- The exact ruleset ID dispatches every state, setup, save, and replay; earlier
  Ruleset 7 identities (`PRIOR_RULESET_7_IDS`, gap-free through
  `pulp-wars-poc-7r30`) are rejected, never migrated. Revision 18 changed no
  setup, state, command, event, or view shape, only Move legality and cost,
  and added the `SHOWCASE` map type ([section 2.5](#25-showcase-setup)).
  Revision 19 (`7r19`) added the Dinosaur faction with the `EGG` unit form,
  the `eggs` state and view lists, the `LAY_EGG` and `HATCH` commands, the
  `EGG_LAID`, `EGG_HATCHED`, and `UNIT_GREW` events, and the `dinosaur`
  public unit stats block. Revision 20 (`7r20`) removed the revision-19
  `STAMPEDE` command, its error, preview field, and retaliation reason, and
  added the combat-preview fields `runUp` and `fortificationIgnored`.
  Revision 21 (`7r21`) widened every player's achievement entitlements and
  progress to seven entries. The Martian overlay (`7r22`) registered the
  fifth faction with the `shields`, `cooling`, `thralls`, and
  `mindControlCooldowns` state and view lists, the `BEAM_DOWN`,
  `MIND_CONTROL`, and `TRACTOR_BEAM` commands, the `SHIELDS_RECHARGED`,
  `UNIT_BEAMED`, `UNIT_MIND_CONTROLLED`, and `UNIT_PULLED` events, the
  `UNIT_DIED` cause `BRAIN_LOST`, four combat-preview fields, and the
  `martian` public unit stats block
  ([section 20.12](#2012-commands-events-errors-and-queries)); its Normal AI
  and UI (`pulp_wars-t6s.3` and `t6s.4`, landed at `7r23`) changed no
  shape.
  `pulp_wars-0hi.3` (`7r23`) changed only numbers (Human and Caveman HP)
  and no shape. The Ice Folk overlay (`7r24`) registered the sixth faction
  with the `chilled` state and view list, the `snow` and `blizzard` view
  tile flags, the `THROW_BOLAS` and `COLD_SNAP` commands, the
  `UNITS_CHILLED` event, the `UNIT_DIED` cause `SHATTER`, the
  `FIELD_DEFENSE_DESTROYED` reason `TRAMPLE`, the `UNIT_MOVE_INTERRUPTED`
  reason `SNOW`, `curedChill` in Tend results, eight combat-preview fields,
  the `chill` unit stat, and the `iceFolk` public unit stats block
  ([section 21.15](#2115-commands-events-errors-and-queries)); its Normal
  AI and UI (`pulp_wars-7g3.4` and `7g3.6`, landed at `7r25`) changed no
  shape. `pulp_wars-t6s.5` (`7r25`) changed only the Colossus Defense.
  `pulp_wars-9s0.2` (`7r26`) changed only Pangea map
  generation (the coast ring) and no shape; a stored state keeps its board.
  `pulp_wars-7g3.7` (`7r27`) changed only the Ice Folk Yeti's HP and
  Defense. `pulp_wars-9s0.5` (`7r28`) appended the terrain `RIFT` to the
  frozen terrain order and changed map generation (the Rift); no field was
  added, and a stored state keeps its board. `pulp_wars-w5j.1` (`7r29`)
  refuses a setup in which two seats play the same faction
  (`DUPLICATE_FACTION`) and added the optional headless and test only setup
  field `allowDuplicateFactions: true`; no state, command, event, or view
  shape changed. The Dwarf overlay (`pulp_wars-78i.3`, `7r30`) registered
  the seventh faction with the `burrowed`, `surfacedThisTurn`, and
  `bombedThisTurn` state and view lists, the `TUNNEL`, `BOMB_RUN`, and
  `ASSEMBLE` commands, the `UNIT_ASSEMBLED`, `UNIT_TUNNELLED`,
  `UNIT_SURFACED`, and `UNIT_BOMBED` events, the `UNIT_DIED` causes `BOMB`
  and `ERUPTION`, the `FIELD_DEFENSE_DESTROYED` reason `UNDERMINED`, the
  movement failure and `UNIT_MOVE_INTERRUPTED` reason `MOUND`, the errors
  `TUNNEL_NOT_LEGAL`, `BOMB_RUN_NOT_LEGAL`, and `ASSEMBLE_NOT_LEGAL` and
  the `RECOVER_NOT_LEGAL` reason `CONSTRUCT`, three combat-preview fields,
  the `bombedThisTurn` and `surfacedThisTurn` unit stat flags, and the
  `dwarf` public unit stats block
  ([section 22.14](#2214-commands-events-errors-and-queries)); its Normal
  AI and UI (`pulp_wars-78i.4` and `78i.6`) changed no shape.
  `pulp_wars-78i.7` (`7r31`) changed only the Dwarf bomb's damage.
- The current browser route deletes only the known obsolete Ruleset 7 autosave
  keys (through `pulpWars.save.v7r30.current`) and preserves the Ruleset 6
  save, settings, the art-set preference, and unrelated storage.
- The normal browser entry and `?ruleset=7` launch Ruleset 7; exact
  `?ruleset=6` launches Ruleset 6; any other value is an unsupported-ruleset
  error. There is no other rules parameter: the former `?undead=1`
  development flag is gone, and a save or replay with Undead, Goblin,
  Dinosaur, Martian, Ice Folk, or Dwarf seats loads like any other.
- All arithmetic is safe-integer and atomic: a rejected command changes no
  state and consumes no Coins, city action, or PRNG draw.
- **Factions.** Each seat has one faction, fixed for the match. A player
  stores `faction` and the bound `factionTreeId`; state parsing rejects a
  player whose faction differs from its setup entry or whose tree does not
  match its faction.
- **Faction model** (the Ruleset 6 Candy precedent). Every faction shares
  the frozen mechanical role order `FIGHTER`, `RAIDER`, `MARKSMAN`, `GUARD`,
  `CAPTAIN`, `CATAPULT`, `KNIGHT`, `JUGGERNAUT`, `PATROL_BOAT`, `BATTLESHIP`.
  State, commands, events, reward IDs, and event literals serialize the
  mechanical role, never a faction label. Rules, public views, previews, UI,
  and the AI resolve every unit through its **owner's** faction registration
  (label, cost, stats, abilities, role mechanics, faction rules) with no
  cross-faction fallback. Units never change owner; Infect, Bitten, and Mind
  Control remove the victim and create a new unit. An Egg hatches in place
  into its unit with the same ID ([section 19.5](#195-hatching)).
- The Undead, Goblin, Dinosaur, Martian, Ice Folk, and Dwarf technology
  graphs, economy, and every non-unit rule are identical to the Human ones;
  the differences are the unit rosters ([section 11](#11-unit-roster)), the
  technology unlocks of [section 6.2](#62-technology-tree) (two for the
  Undead and the Goblins, plus the Goblin name Plunder for Commerce; Nesting
  and Wallbreaker for the Dinosaurs; Brain support, no Overrun, Force
  Fields, and the Disintegrator for the Martians; Witch support, no Overrun,
  Deep Winter, and Brittle for the Ice Folk; Engineer support, Assemble,
  Dive, no Overrun, Dig In, and Blasting Charges for the Dwarves), and the
  faction rules of
  [section 17](#17-undead-faction-rules) (Undead),
  [section 18](#18-goblin-faction-rules) (Goblin),
  [section 19](#19-dinosaur-faction-rules) (Dinosaur),
  [section 20](#20-martian-faction-rules) (Martian),
  [section 21](#21-ice-folk-faction-rules) (Ice Folk), and
  [section 22](#22-dwarf-faction-rules) (Dwarf).
- `GameStateV7` has no Goblin field: explosions resolve inside one command or
  Start Turn and leave no persistent state; Plunder changes Coins and Troll
  regeneration changes HP. Its only Dinosaur field is `eggs`, the Egg
  countdowns ([section 19.3](#193-eggs)); growth is derived from the
  existing `kills` and `maxHp` unit fields, and capacity slots are
  registration values. Its Martian fields are four side lists sorted by unit
  ID, `shields`, `cooling`, `thralls`, and `mindControlCooldowns`
  ([section 20](#20-martian-faction-rules)); no unit key was added, and the
  Shield maximum, movement mode, and Pierce are registration values. Its
  only Ice Folk field is `chilled`, the Chill entries sorted by unit ID
  ([section 21.2](#212-chill)); Snow and the Blizzard are derived on every
  read and never stored, and Mountain-born, Glide, Prowl, and the other unit
  rules are registration values. Its Dwarf fields are three lists:
  `burrowed`, the off-board records `{ unit, moleUnitId }` sorted by unit ID
  ([section 22.2](#222-the-tunnel-and-burrowed-units)), and
  `surfacedThisTurn` and `bombedThisTurn`, sorted unit IDs of the active
  seat's turn ([sections 22.3](#223-the-mound-surfacing-and-the-eruption)
  and [22.5](#225-gyrocopters-and-the-bombing-run)); Dig In is derived from
  the existing `moved` flag and stores nothing, and no unit or activation
  key was added.

## 2. Setup and map generation

### 2.1 Match setup

A match is one human against 1–3 equal-rules Normal AI seats, in `RIVAL` or
`COOPERATIVE` mode, on a square board.

| Setup field | Legal values                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board width | 11, 14, 16, 20, or 25 (height equals width); minimum 11/14/16 for 1/2/3 AI                                                                           |
| Auto size   | 11, 14, or 16 for 1, 2, or 3 AI                                                                                                                      |
| Map type    | `DRY_LAND`, `PANGEA`, `CONTINENTS` (default), `ARCHIPELAGO`, `LAKES`, `SHOWCASE` (width 16 only)                                                     |
| AI          | `aiCount` 1–3, difficulty `NORMAL`, mode `RIVAL` or `COOPERATIVE`                                                                                    |
| Human color | `CORAL`, `TEAL`, `GOLD`, `VIOLET`                                                                                                                    |
| Factions    | one per seat (`aiCount + 1`, seat 0 is the human): `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`, or `DWARF`; no two seats alike |
| Seed        | uint32; equal setups and seeds generate byte-identical maps, turn order, and treasures                                                               |

- **Faction choice.** `factions` is a dense array; index `i` is seat `i`'s
  faction. **Every seat plays a different faction**
  ([unique-factions overlay](RULESET_7_UNIQUE_FACTIONS.md), `pulp_wars-w5j.1`,
  folded here): a setup that repeats a faction, on any map type including the
  Showcase, is refused with `DUPLICATE_FACTION` (params `faction`, the first
  repeated faction, and `seats`); any mix of distinct factions is legal.
  Only headless and test setups may lift the rule, with
  `allowDuplicateFactions: true`, which the browser never builds and
  refuses to launch or resume. The browser setup always offers one
  Human/Undead/Goblin/Dinosaur/Martian/Ice Folk/Dwarf select per seat
  ("Your faction", "Player N faction"), with the factions other seats play
  disabled in the opponents' selects (the human's pick moves an opponent who
  played it to a free faction), and defaults to Human, Undead, Goblin, and
  Dinosaur for seats 0–3. The
  headless tools default to the same distinct factions and accept
  `original` (alias `human`), `undead`, `goblin`, `dinosaur`, `martian`,
  `ice` (alias `ice_folk`), and `dwarf` in `--factions` (the balance tools'
  pairing letter for the Dwarves is `W`; `D` is the Dinosaur's). Faction
  choice never
  affects map generation, capital placement, turn order, treasure placement,
  or any PRNG draw: setups that differ only in `factions` generate
  byte-identical boards, turn orders, and treasures.
- **Showcase.** `SHOWCASE` is a fixed demonstration board, not a generated
  map: sections 2.2–2.4 and the opening of [section 3](#3-players-turns-and-victory)
  do not apply to it. [Section 2.5](#25-showcase-setup) is its complete
  description.

### 2.2 Settlements and treasures

| Board width | Legal AI counts | Neutral villages for 1/2/3 AI  | Total settlements for 1/2/3 AI | Treasure chests |
| ----------: | --------------- | ------------------------------ | ------------------------------ | --------------: |
|          11 | 1               | 4 (3 on `ARCHIPELAGO`) / — / — | 6 (5) / — / —                  |               2 |
|          14 | 1–2             | 4 / 5 / —                      | 6 / 8 / —                      |               2 |
|          16 | 1–3             | 4 / 5 / 7 (6 on `ARCHIPELAGO`) | 6 / 8 / 11 (10)                |               2 |
|          20 | 1–3             | 14 / 13 / 12                   | 16 / 16 / 16                   |               4 |
|          25 | 1–3             | 21 / 20 / 19                   | 23 / 23 / 23                   |               5 |

- Every seat has one capital; total settlements are capitals plus villages.
- On widths 11, 14, and 16 the village count follows the AI count, not the
  width: an explicit 16 x 16 board with one AI has 6 settlements, and an
  explicit 14 x 14 board with one AI also has 6. Auto size (11/14/16 for
  1/2/3 AI) therefore gives 6, 8, or 11 settlements (5 and 10 on the two
  Archipelago exceptions). On widths 20 and 25 the total is fixed at 16 and 23.
- The two Archipelago exceptions (11 x 11 with one AI, 16 x 16 with three AI)
  keep the revision-13 count because one more village fails map acceptance on
  some seeds ([revision 14 §8](RULESET_7_REVISION_14_BALANCE.md#8-villages)).
- The chest count is a maximum: if fewer candidate cells exist, fewer chests
  are placed.
- Settlements are Grass land cells at least two cells from an edge and at least
  Chebyshev distance 3 apart; capitals are at least `floor(width / 2)` apart.
- Every settlement's eight-cell ring has at least three economic opportunities
  from at least two families (Agriculture, Timber, Metal).
- **Capital growth guarantee.** Every capital's eight-cell ring (its starting
  territory) holds at least two **growth resources** of one kind: Fruit on
  Grass, Game on Forest, or (on non-Dry-Land maps) Fish on Shallow Water. So
  every capital can reach level 2 on its owner's first turn: free research, two
  harvests at 2 Coins each out of the first turn's 7 Coins. A deterministic,
  PRNG-free growth floor runs on each candidate after the settlement ring
  floors and water draws: for each capital in `(y, x)` order that lacks two of
  one kind, it adds the missing Fruit (on empty ring Grass) or Game (on empty
  ring Forest), choosing the feasible kind that needs fewer additions (ties:
  Game for a Woodland capital, otherwise Fruit), on eligible cells in the
  settlement floors' rank order. It never changes terrain, never removes or
  replaces a resource, and never places Fish, Pearls, Fertile Ground, or Ore.
  A candidate it cannot fix fails the `CAPITAL_GROWTH` map invariant.
  Villages get no guarantee. Details:
  [revision 16 §3](RULESET_7_REVISION_16.md#3-capital-growth-guarantee).
- Capital fairness: every capital's development score is 6–17 and scores on
  one map differ by at most 5. It is evaluated after the growth floor and
  never relaxed.
- Chests sit on empty Grass/Forest land reachable from a capital (no site,
  resource, or improvement). Moving onto a chest makes one PRNG draw: 5 Coins,
  or a full-HP exhausted unit of the mover's faction's **treasure role**
  (faction rule `treasureUnitRole`: the `KNIGHT` role for Human, Undead, and
  Goblin, so a Knight, Vampire, or Scrap Buggy; the `RAIDER` role for
  Dinosaur, Martian, Ice Folk, and Dwarf, so a Raptor, a Saucer, a Sled, or
  a Gyrocopter) on the first legal adjacent
  land cell (entered under the treasure unit's own movement mode, so a
  Saucer or a Gyrocopter needs no Engineering for a Mountain; never a mound
  tile), homed to the
  mover's home city first and then by city ID among cities with enough free
  capacity slots for it ([section 4.4](#44-unit-capacity)); if no placement
  exists the chest gives 5 Coins. A Martian treasure unit arrives at full
  Shield. The serialized `TREASURE_CAPTURED` reward literal stays `KNIGHT`
  for every faction.
- Generation uses one Mulberry32 stream and at most 256 candidates; a rejected
  candidate continues the stream and constraints never relax.

### 2.3 Map types

| Map type      | Land share | Structure                                                                                       |
| ------------- | ---------: | ----------------------------------------------------------------------------------------------- |
| `DRY_LAND`    |       100% | No water; all capitals share one land component.                                                |
| `PANGEA`      |   59.5–72% | One major landmass holds every settlement and at least 90% of land; a coast ring surrounds it.  |
| `CONTINENTS`  |     50–62% | Two major landmasses for two players, otherwise three; capitals on at least two of them.        |
| `ARCHIPELAGO` |     34–46% | Between `playerCount` and `2 * playerCount + 2` major islands; each capital on a different one. |
| `LAKES`       |     72–84% | At least two enclosed lakes of four or more cells; at least 75% of water is not edge-connected. |

- **Pangea coast ring** (`pulp_wars-9s0.2`). Pangea land never lies on the
  board's edge ring (row 0, column 0, the last row, and the last column),
  so water surrounds the island and the island can be circumnavigated. The
  land is 72% of the board capped at 90% of the interior (the board without
  its edge ring), taken as the first interior cells in the same seeded,
  jittered radial order as before: 72 of 121 cells (59.5%) on 11 x 11, 129
  of 196 (65.8%) on 14 x 14, 176 of 256 (68.75%) on 16 x 16, and 72% on
  20 x 20 and 25 x 25 (288 and 450 cells). The ring is one cell wide where
  the island comes closest to the edge and wider toward the corners. It is
  navigable with Shorecraft alone: the Shallow Water next to the island
  (water orthogonally adjacent to land) forms one connected Shallow loop
  all the way around it, while the ring's corners, away from land, are Deep
  Water (Navigation). A candidate fails the `COAST_RING`
  invariant unless (a) no edge cell is land and (b) the Shallow Water cells
  orthogonally adjacent to the main landmass lie in one eight-connected
  Shallow Water body that encloses the landmass. Every other map type is
  byte-identical to the generator before the ring.
- **Rifts** (`pulp_wars-9s0.5`, [Rift overlay](RULESET_7_RIFT.md)
  section 5). After a generated board is accepted (and after its treasure
  chests), Rift placement turns one or two straight 1 x 3 runs of land,
  horizontal or vertical, into `RIFT` tiles. It draws from its own
  Mulberry32 stream, seeded with `seedFromText("pulp-wars-rift:" + seed)`,
  never from the match stream, and never rejects a board, so a board
  without a Rift is byte-identical to the board before the Rift. The target
  count is 0 on 11 x 11 and 14 x 14; on 16 x 16 one with probability 1/2;
  on 20 x 20 one; on 25 x 25 two with probability 1/3, otherwise one; the
  Showcase has none. A Rift's tiles are resource-free Grass, Forest, or
  Mountain off the edge ring (they keep their biome); every tile around
  them is land (a Rift never touches water) and no other Rift; no capital
  is within Chebyshev 2 and no village within 1 of a Rift tile; two Rifts
  are at least 4 apart; and removing the tiles splits no land component,
  with or without Mountains. Each Rift is drawn uniformly from the legal
  runs; with none left, fewer are placed (mostly on Archipelago, where
  islands rarely hold a run with land all round it).
- A water cell is `SHALLOW_WATER` if and only if at least one of its four
  orthogonal neighbours on the board is land; every other water cell,
  including water that touches land only diagonally, is `DEEP_WATER`.
  Classification happens once, at generation; no command turns land into
  water or water into land.
- On non-dry maps Shallow Water must be at least 25% of the map's water, and
  Deep Water at least `max(4, floor(water / 10))` cells.
- On non-dry maps every inhabited landmass has a settlement adjacent to a legal
  Shallow Water Port site, and all inhabited landmasses are mutually reachable
  by sea once the required technology is researched.
- A capital without useful land expansion receives an affordable sea escape.
- The exact topology algorithm and acceptance bands are in
  [revision 6 §3](RULESET_7_REVISION_6_WATER_NAVAL.md#3-deterministic-map-generation)
  and [revision 7 §2](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md#2-map-acceptance);
  the Pangea coast ring above replaces their Pangea land mask and its
  68–76% band.

### 2.4 Biomes, terrain, and resources

Land is divided into contiguous `PLAINS`, `WOODLAND`, and `HIGHLANDS` regions
(`max(3, roundHalfUp(width * height / 64))` regions), then each land cell draws
terrain and resource from these exact tables.

| Biome     | Grass | Forest | Mountain |
| --------- | ----: | -----: | -------: |
| Plains    |   68% |    23% |       9% |
| Woodland  |   32% |    56% |      12% |
| Highlands |   32% |    23% |      45% |

| Biome     | Grass: Fruit / Fertile Ground / none | Forest: Game / none | Mountain: Ore / none |
| --------- | -----------------------------------: | ------------------: | -------------------: |
| Plains    |                      26% / 24% / 50% |           28% / 72% |            30% / 70% |
| Woodland  |                      17% / 13% / 70% |           48% / 52% |            38% / 62% |
| Highlands |                      12% / 10% / 78% |           30% / 70% |            68% / 32% |

| Water terrain | Fish | Pearls | None |
| ------------- | ---: | -----: | ---: |
| Shallow Water |  28% |    10% |  62% |
| Deep Water    |   0% |    16% |  84% |

- **Rift** (`RIFT`, the sixth terrain): land that keeps its biome, with
  no resource, improvement, Road, Field Defense, site, treasure chest, or
  Grave, ever. Only a flyer in land form (the Martian Saucer and
  Mothership) may enter, cross, or stand on it; nothing can be built on it.
  It is never Snow, and Mountain-born does not cover it
  ([section 21.5](#215-snow)). It is made only by generation, and nothing
  changes it.
- A settlement-ring floor then guarantees family minimums by the settlement's
  biome: Plains 2 Agriculture + 1 Timber; Woodland 1 Agriculture + 2 Timber;
  Highlands 1 Timber + 2 Metal (Ore).
- The complete draw order, cohesion pass, and floor algorithm are in
  [revision 4 §5](RULESET_7_REVISION_4_BIOME_ECONOMY.md#5-exact-map-algorithm).

### 2.5 Showcase setup

`SHOWCASE` (revision 18) is a sixth map type for looking at every unit and
building: each seat starts with three developed cities, every technology,
one unit of every role, and the whole board explored. It is an ordinary
match from its first Start Turn on.

| Setup field       | `SHOWCASE` rule                                                                     |
| ----------------- | ----------------------------------------------------------------------------------- |
| `width`, `height` | exactly 16; any other size is `INVALID_SETUP`                                       |
| `aiCount`         | 1–3, as in a normal setup                                                           |
| `aiMode`          | `RIVAL` or `COOPERATIVE`, unchanged meaning                                         |
| `factions`        | any faction per seat, no two seats alike (`DUPLICATE_FACTION`)                      |
| `seed`            | any uint32; it affects nothing but `setup.seed` and `random`                        |
| Turn order        | seat order, seat 0 (the human) first                                                |
| `random`          | the Mulberry32 initial state of the seed, no draw consumed; `mapAttempt` is 1       |
| Invariants        | no generation invariant applies (spacing, fairness, growth, port reach, land share) |

Setups that differ only in `seed` give the same state except `setup.seed`
and `random`. Setups that differ only in `factions` give the same board,
cities, ledger records, unit positions, and IDs.

**Board.** Coordinates are `(x, y)`. Rows `y = 0–11` are land (192 tiles),
all of biome `PLAINS`; rows `y = 12–15` are water (64 tiles): `y = 12` is
Shallow Water and `y = 13–15` Deep Water. Land is Grass with no resource,
except:

- `y = 0`: even `x` is Mountain and odd `x` is Forest; Ore on the Mountains
  with `x % 4 = 0`, Game on the Forests with `x % 4 = 1`;
- `y = 1`: Fruit where `x % 4 = 2`, Fertile Ground where `x % 4 = 3`;
- Fish on `(x, 12)` and Pearls on `(x, 14)` for `x` in 0, 4, 8, 12;
- the city tiles below.

There is no village, treasure chest, Grave, Field Defense, or Monument.

**Strips.** Strip `k` (0–3) has center column `cx = 4k + 2` and holds one
seat's cities in columns `cx − 1 … cx + 1`; columns 0, 4, 8, and 12 stay
neutral. Seat 0 uses strip 0 and AI seat `i` uses strip `3 − aiCount + i`
(the AI seats fill the strips farthest from the human). A strip without a
seat keeps the plain land and water above.

**Cities.** Each city owns exactly its centered 3 x 3 footprint; none has
used its Land Grant; every city has Walls; no reward choice is pending.
Reward records are history only: setup pays no Coins, exploration, or unit
for them.

| City    | Center     | Level | Rewards recorded                        | Permanent | Live | Population | First income |
| ------- | ---------- | ----: | --------------------------------------- | --------: | ---: | ---------: | -----------: |
| North   | `(cx, 3)`  |     4 | `SURVEY`, `WALLS`, `TREASURY_8`         |         0 |   11 |          2 |            5 |
| Capital | `(cx, 7)`  |     5 | `SURVEY`, `WALLS`, `BOOM`, `JUGGERNAUT` |         4 |   10 |          0 |            7 |
| Coast   | `(cx, 11)` |     3 | `SURVEY`, `WALLS`                       |         0 |    8 |          3 |            4 |

| City    | Tile           | Content                               | Live population |
| ------- | -------------- | ------------------------------------- | --------------: |
| North   | `(cx − 1, 2)`  | Forest, Lumber Camp                   |               1 |
| North   | `(cx + 1, 2)`  | Mountain, Ore, Mine                   |               2 |
| North   | `(cx − 1, 3)`  | Sawmill (two adjacent Lumber Camps)   |               2 |
| North   | `(cx + 1, 3)`  | Forge (two adjacent Mines)            |               2 |
| North   | `(cx − 1, 4)`  | Forest, Lumber Camp                   |               1 |
| North   | `(cx, 4)`      | Road                                  |               — |
| North   | `(cx + 1, 4)`  | Mountain, Ore, Mine                   |               2 |
| Capital | `(cx − 1, 6)`  | Fertile Ground, Farm                  |               2 |
| Capital | `(cx, 6)`      | Road                                  |               — |
| Capital | `(cx + 1, 6)`  | Fertile Ground, Farm                  |               2 |
| Capital | `(cx − 1, 7)`  | Windmill (two adjacent Farms)         |               2 |
| Capital | `(cx + 1, 7)`  | Market (one adjacent family: 2 Coins) |               — |
| Capital | `(cx − 1, 8)`  | Fertile Ground, Farm                  |               2 |
| Capital | `(cx, 8)`      | Road                                  |               — |
| Coast   | `(cx − 1, 10)` | Fertile Ground, Farm                  |               2 |
| Coast   | `(cx, 10)`     | Road                                  |               — |
| Coast   | `(cx + 1, 10)` | Forest, Game                          |               — |
| Coast   | `(cx − 1, 11)` | Workshop (one adjacent basic type)    |               2 |
| Coast   | `(cx + 1, 11)` | Fruit                                 |               — |
| Coast   | `(cx − 1, 12)` | Port                                  |               1 |
| Coast   | `(cx + 1, 12)` | Shipyard                              |               2 |

- Roads also lie on the neutral tiles `(cx, 5)` and `(cx, 9)`, so the Road
  line `(cx, 4) … (cx, 10)` joins the three centers: Road population is +2
  for the capital and +1 for each other city, included in the Live column
  (North 10 + 1, Capital 8 + 2, Coast 7 + 1).
- The capital's permanent population is its `BOOM` record (3, at the center)
  plus one `HARVEST_FRUIT` record (1) at `(cx + 1, 8)`, a Grass tile whose
  Fruit is gone.
- The ledger is the ordinary one ([section 4.2](#42-population-growth-and-levels)):
  every improvement except the Market has its live record with the value the
  spatial rules compute, and
  `population = permanent + live − growthSpent(level)`.
- First income ([section 4.3](#43-income)): the capital pays 4 + 1 + 2
  (Market); North 4 + 1 land trade; Coast 3 + 1 land trade: 16 Coins for a
  Human, Undead, Dinosaur, Martian, Ice Folk, or Dwarf seat and 14 for a
  Goblin seat (Plunder
  replaces land trade). No city has sea trade: the Port and Shipyard belong
  to one city.

**Players.** Every seat has all 23 technologies (nothing is left to
research and the free opening technology does not apply), 5 Coins before its
first Start Turn (so the first seat shows 21 Coins, or 19 for a Goblin seat),
all 256 cells explored, and seven locked achievement entitlements. Explorer
and Muster unlock at each seat's first evaluation; no other achievement does
(no processor reaches output 6, three cities and two ships are below the
Land Baron and Sea Dog thresholds, and no unit has a kill).

**Units.** One unit of each of the ten roles, in the seat's faction, at full
HP with zero kills and a fresh activation. A Dinosaur seat's units are all
hatched (no Egg exists at setup) and at growth stage 0. A Martian seat's
units are at full Shield, with no Thrall, no Cooling entry, and no Mind
Control cooldown; the first seat's first Start Turn recharges its Shields
under the Force Field rule like any Start Turn, and with every technology
known, Force Fields and the Disintegrator apply from the first turn. An Ice
Folk seat's units start with no Chill entry; with every technology known,
Deep Winter and Brittle apply from the first turn, so its Snow is the three
cities' footprints plus every neutral land tile within two tiles of a
center (its whole strip from `y = 1` to `y = 11`, the neutral columns
beside it, and the Road tiles between the cities). The Yeti on its Walled
capital center has fortification 2 and no Snow cover, while its units on
the neutral rows `y = 5` and `y = 9` stand on Snow with cover
([section 21.5](#215-snow)). A Dwarf seat's units are on the board (nothing
is burrowed, and `surfacedThisTurn` and `bombedThisTurn` are empty); with
every technology known, Dig In, Blasting Charges (eruption 3, the Steam
Cannon ignores fortification), Dive (bomb 6), and Assemble apply from the
first turn. Its Hammerer on the Walled capital center has not moved, so it
is dug in with fortification 3 (Walls 2, Dig In 1) from the first enemy
turn if it stays, while its Steam Mole on `(cx + 1, 5)`, two tiles from the
North and Capital centers, is not dug in
([section 22.7](#227-dig-in)).

| Role          | Tile          | Form  | Home city |
| ------------- | ------------- | ----- | --------- |
| `FIGHTER`     | `(cx, 7)`     | land  | Capital   |
| `RAIDER`      | `(cx − 1, 5)` | land  | North     |
| `MARKSMAN`    | `(cx, 5)`     | land  | North     |
| `GUARD`       | `(cx + 1, 5)` | land  | North     |
| `CAPTAIN`     | `(cx − 1, 9)` | land  | Capital   |
| `CATAPULT`    | `(cx, 9)`     | land  | Capital   |
| `KNIGHT`      | `(cx + 1, 9)` | land  | Capital   |
| `JUGGERNAUT`  | `(cx + 1, 8)` | land  | Capital   |
| `PATROL_BOAT` | `(cx, 12)`    | naval | Coast     |
| `BATTLESHIP`  | `(cx, 13)`    | naval | Coast     |

- Creation performs no capacity check, but the homes fit: Capital 5 of 7,
  North 3 of 6, Coast 2 of 5 (each capacity one higher for a Goblin seat,
  Warrens), so every trainable role is offered from the first turn. A
  Dinosaur seat counts slots and has Nesting's city slot
  ([section 4.4](#44-unit-capacity)): its capital is exactly full at 8 of 8
  (Caveman and Shaman 1 each, Triceratops, T-Rex, and Brontosaurus 2 each),
  so it cannot train or lay until a slot frees, while North (3 of 7) and
  Coast (2 of 6) can lay every Egg from the first turn. A Martian seat's
  capital is exactly full at 7 of 7 (Grunt, Brain, and Tripod 1 each,
  Mothership and Colossus 2 each), so it cannot train until a slot frees;
  North (3 of 6) and Coast (2 of 5) can train. An Ice Folk or Dwarf seat's
  units all use one slot (Capital 5 of 7, North 3 of 6, Coast 2 of 5), so
  the Dwarf Engineer, homed to the Capital, can Assemble from the first
  turn. Both docks start empty.
- **Entity IDs.** Seat `s` has capital ID `2s + 1` and `FIGHTER` ID `2s + 2`.
  Then, each pass in seat order: every seat's North and Coast cities; then
  every seat's ledger records (per city in the order capital, North, Coast:
  permanent records, then live records, each in `(y, x)` tile order); then
  every seat's nine remaining units in the role order of the table.
- The Normal AI plays its ordinary policy with no Showcase logic. Seats in
  neighbouring strips start one neutral column apart with every unit ready,
  so a four-seat Showcase is a fight from the first turn.
- **Setup screen.** "Showcase" is the last Map option, described as "A fixed
  demo map: three developed cities, every unit, all technology, map
  revealed." While it is selected the Size select shows only 16 × 16 and is
  disabled and the "Map seed" control is hidden; the launched setup carries
  seed 0. The headless tools accept `showcase` for `--map-type` and
  `--map-types`.

## 3. Players, turns, and victory

- Every seat starts with 5 Coins, no technology, a level-1 capital, one
  full-HP unit of its faction's `FIGHTER` role (Fighter for Human, Skeleton
  for Undead, Goblin for Goblin, Caveman for Dinosaur, Grunt at full Shield
  for Martian, Yeti for Ice Folk, Hammerer for Dwarf) on the capital and
  homed there, seven locked achievement entitlements, and every cell within
  radius 2 of its capital explored. A Dinosaur seat starts with no Egg. A
  Goblin seat, too, starts with a single Goblin: `pulp_wars-0ao.7`
  tuned the revision-17 contract's two starting Goblins to one
  (`STARTING_FIGHTERS_V7` is 1 for every faction). The engine keeps the
  contract's second-Goblin placement for a value of 2 (created after every
  seat's first unit, on the first land, non-Mountain, empty, chest-free cell
  of the capital ring in `(y, x)` order, or not at all), but it is unused.
- Turn order is a seeded shuffle; `round` starts at 1 and increments after the
  last seat in turn order.
- A `SHOWCASE` match starts differently: three developed cities, every
  technology, ten units, the whole board explored, and seat-order turns
  ([section 2.5](#25-showcase-setup)). Everything after its first Start Turn
  is the ordinary rules.
- **Relationships:** in Rival mode every pair of players is hostile. In
  Cooperative mode all AI seats are formal allies of each other and hostile to
  the human. Allies cannot attack each other, capture each other's cities, or
  enter each other's territory; they share nothing else.
- **Start Turn** (in order): set the active seat and reset its units'
  activations and capture eligibility (an Egg keeps its exhausted
  activation); set every owned city's city action available; count down the
  seat's Mind Control cooldowns ([section 20.8](#208-mind-control)); recharge
  the seat's Shields ([section 20.2](#202-shields)); apply the Cold Aura of
  the seat's Frost Giants ([section 21.12](#2112-prowl-and-the-cold-aura));
  surface the seat's burrowed Steam Moles and their riders, with each
  eruption, its deaths, and its chain
  ([section 22.3](#223-the-mound-surfacing-and-the-eruption)); resolve the
  seat's Plague ([section 17.8](#178-plague)); explode the seat's exploding
  units that Plague killed, with any chain reaction and its Plunder
  ([section 18.7](#187-where-chains-run-and-event-order)); count down and
  hatch the seat's Eggs ([section 19.5](#195-hatching)); resolve Windmill
  healing; regenerate Trolls
  ([section 18.10](#1810-waaagh-ram-and-troll-regeneration)); award income;
  settle pending city rewards; evaluate achievements. Events:
  `TURN_STARTED`, then `SHIELDS_RECHARGED`, then one `UNITS_CHILLED` per
  Frost Giant that chilled a unit, then one block per surfacing Mole
  (`UNIT_SURFACED`, `FIELD_DEFENSE_DESTROYED` reason `UNDERMINED`, the
  eruption's deaths, risings, and collapses, its chain, `PLUNDER_AWARDED`,
  and `TILES_REVEALED`) and the economy changes of the surfacing, then
  `PLAGUE_DAMAGED`, deaths,
  risings, and Thrall collapses (`BRAIN_LOST`), `PLAGUE_SPREAD`,
  `PLAGUE_EXPIRED`, rising reveals and economy changes, then the chain
  events, `PLUNDER_AWARDED`, and the chain's rising reveals and economy
  changes, then one `EGG_HATCHED` per hatch and one `TILES_REVEALED` for the
  hatch step, then `WINDMILL_HEALING_RESOLVED`, `UNITS_REGENERATED`,
  `INCOME_AWARDED`, and the reward and achievement events. Plague resolves
  before income, so a rising that besieges its victim's city center cuts
  that city's income this turn, and Plunder from a Start Turn chain is added
  before income. A unit that hatched this Start Turn counts for that turn's
  Muster evaluation. The cooldown and Shield steps do nothing in a match
  without a Martian seat, the Cold Aura step nothing in a match without an
  Ice Folk seat, and the surfacing step nothing in a match without a Dwarf
  seat (a seat has one faction, so the Cold Aura and the surfacing never
  both run in one Start Turn).
- **End Turn** (in order): auto-recover idle damaged units (never a Dwarf
  construct); expire Inspired and
  Overrun; run the player's Cooling step
  ([section 20.4](#204-heat-rays-and-cooling)); with Force Fields, recharge
  the player's Shields again ([section 20.3](#203-force-field-and-force-fields));
  count down the Chill entries of the player's units, burrowed ones
  included ([section 21.2](#212-chill), no event); empty
  `surfacedThisTurn` and `bombedThisTurn`
  ([section 22](#22-dwarf-faction-rules), no event); preview next income;
  advance to
  the next active seat and run its Start Turn. Events: the recovery events,
  `SHIELDS_RECHARGED` (Force Fields), `INCOME_PREVIEWED`, `TURN_ENDED`, then
  the next Start Turn's.
  End Turn is unavailable while a city reward choice is pending.
  Since revision 17, `END_TURN` is one of the commands after which naval
  blockade and sea-network changes are reported
  ([section 14](#14-naval-rules)), so a blockader killed during the next
  seat's Start Turn (by Plague or a chain) emits `PORT_BLOCKADE_CHANGED` and
  `SEA_NETWORK_CHANGED` in that `END_TURN`.
- The first seat's first Start Turn runs when the match is created, so every
  seat's first turn includes ordinary income.
- **Elimination:** a player owning zero cities is eliminated immediately; its
  units, Eggs, Thralls, and burrowed units included, are removed (with
  their Chill entries; `UNIT_DIED` cause
  `ELIMINATION`, never `BRAIN_LOST`, leaving no Graves and setting off no
  death blasts) and its future turns skipped. Plague
  from its removed Liches and the bites it inflicted end
  ([section 17](#17-undead-faction-rules)).
- **Outcome:** the human wins when every other player is eliminated and loses
  immediately when eliminated. There is no draw, score, or turn-limit victory.

## 4. Cities

### 4.1 Territory

- A city starts with the neutral cells of its centered 3 x 3 footprint; a tile
  belongs to at most one city.
- Capturing a neutral village founds a level-1 non-capital city that claims its
  neutral 3 x 3 cells.
- **Land Grant** (Planning, city action, 6 Coins) assigns every currently
  neutral cell of the centered, board-clipped 5 x 5 footprint to a level-3+
  city and reveals those cells. It requires no siege, no pending reward for the
  city, and at least one claimable cell. Each city ID may be granted once ever,
  even across ownership changes. The rule is canonical: unexplored neutral
  cells count and are claimed. The public command query offers Land Grant
  only when an explored footprint cell has no public territory owner (the
  view hides the city of territory whose center is unexplored, but not its
  owner), so every offer is accepted and no offer depends on hidden cells.
- Capture transfers the city's exact current footprint with everything on it.

### 4.2 Population, growth, and levels

```text
growthSpent(L) = L * (L + 1) / 2 - 1
population     = permanentPopulation + livePopulation - growthSpent(level)
level rises while population >= level + 1
```

- Levels are reached at total population 2 (level 2), 5 (level 3), 9 (level
  4), 14 (level 5), and so on.
- **Permanent** population comes from harvests and the Boom reward and never
  goes away. **Live** population comes from standing improvements, active
  Ports, and connected Roads and is recomputed after every change.
- Live population loss can make displayed population negative but never lowers
  level or repeats a reward.

### 4.3 Income

At Start Turn each owned city pays:

```text
if besieged: 0
else max(1, min(level, 4) + capital + seaTrade + landTrade + market + min(0, population))
```

- The **level term** is capped at 4 (`CITY_LEVEL_INCOME_CAP_V7`). Levels 5 and
  higher still grant rewards, capacity, and reward units; only their income
  stops growing. Every income surface (Start Turn income,
  `INCOME_PREVIEWED`, the city panel and HUD projection, public previews)
  uses the same capped term.
- `capital` is 1 for a city founded as a capital, under any owner. The bonus
  travels with the city: a captured capital pays its +1 to its new owner (and
  to every later owner), and the former owner loses it. This is separate from
  the _original capital_ that roots Road population and trade
  ([section 9](#9-roads-trade-and-market)).
- `seaTrade` and `landTrade` are each 0 or 1 ([section 9](#9-roads-trade-and-market)).
- `market` is the city's Market income ([section 9.4](#94-market)).

### 4.4 Unit capacity

- Capacity is `level + 1`, plus 1 if the owner has Planning, plus 1
  (**Warrens**) if the city's current owner is a Goblin seat, plus 1
  (**Nesting**) if the city's current owner has the Dinosaur Nesting
  technology (capability `nestingCityCapacityBonus`;
  `cityUnitCapacityForV7`). Every term is read live from the city's current
  owner: a city a Goblin seat captures gains the Warrens slot, a city a
  Dinosaur seat with Nesting captures gains the Nesting slot, and a city
  captured from them by another faction loses it. Only the Dinosaur tree has
  the Nesting unlock, so the two bonuses never combine. Training, laying,
  treasure placement, `previewCityCapacityV7`, `previewLayEggV7`, the city
  panel, and the Normal AI use the same formula.
- **Used slots** of a city are the sum of the **capacity slots** of every
  unit on the board homed to it, Eggs included (an Egg uses the slots of the
  unit inside). Every role uses 1 slot except the Dinosaur Triceratops,
  T-Rex, and Brontosaurus and the Martian Mothership and Colossus, which use
  2 (role mechanic `capacitySlots`), so for a Human, Undead, or Goblin city
  the used slots equal the unit count. Land and naval units share capacity;
  orphaned units (no home city) use no slots anywhere, and a Thrall never
  has a home city ([section 20.9](#209-thralls)). A burrowed Dwarf unit
  keeps its home and its slot while it is off the board
  ([section 22.2](#222-the-tunnel-and-burrowed-units)). Martian, Ice Folk,
  and Dwarf cities have no capacity bonus, and every Ice Folk and Dwarf role
  uses 1 slot.
- `TRAIN`, `TRAIN_NAVAL`, `LAY_EGG`, `ASSEMBLE` (in the Engineer's home
  city, [section 22.8](#228-engineer-repair-and-assemble)), and a treasure
  unit need `used + slots(role) <= capacity`, otherwise
  `CITY_CAPACITY_FULL` (or the 5-Coin chest). Reward units (a two-slot Brontosaurus or Colossus too) and
  Undead risings ([section 17.3](#173-risings)) may exceed capacity; a
  capturing unit is re-homed with its own slots (a Thrall stays homeless) and
  may put its new city over capacity; capacity loss never removes a unit or
  an Egg. A death, Disband, removal, or Egg destruction frees its slots at
  once.

### 4.5 City action

- Each city has one city action per owner turn, spent by exactly one of: land
  `TRAIN`, `TRAIN_NAVAL` from any of its Ports or its Shipyard, `LAY_EGG`
  (Dinosaur, [section 19.4](#194-laying-an-egg)), or `LAND_GRANT`.
- The action becomes available at the owner's Start Turn. A captured city's
  action is unavailable until its new owner's next Start Turn.
- Research, construction, harvesting, unit commands (Beam Down, Mind
  Control, the Tractor Beam, Bolas, Cold Snap, Tunnel, Bomb Run, and
  Assemble included), and reward choices never
  spend it; reward units still appear after the action is spent.
- The flag is visible only to the city's owner.

### 4.6 Training and city-center spawning

- **Land training** requires the role's technology, an available city action,
  enough free capacity slots, enough Coins, no siege, no pending reward for
  the city, and an **empty city center**. Any unit on the center (own or
  allied) blocks land training with `CITY_SPAWN_OCCUPIED`; a hostile
  occupant besieges the city instead.
- **Dinosaur production.** A Dinosaur seat trains only its Caveman and
  Shaman with `TRAIN` (and its boats with `TRAIN_NAVAL`); its five egg-laid
  roles are produced only
  with `LAY_EGG` on a free tile next to the city, which does not need an
  empty center ([section 19.4](#194-laying-an-egg)). `TRAIN` of an egg-laid
  role is rejected with `UNIT_ROLE_INVALID { role }` and never offered.
- **Arms Industry:** while a Forge in the training city has positive output,
  every land role trains (and every Egg is laid) for 1 Coin less (minimum 1,
  so the 1-Coin Goblin stays at 1); an Assemble costs 1 less when the
  Engineer's home city has such a Forge.
- **Naval training** happens on a selected active, empty Port or Shipyard
  assigned to the city ([section 14](#14-naval-rules)).
- **Reward units** (the Militia `FIGHTER` and the level-5+ `JUGGERNAUT`, in
  the owner's faction: Fighter, Skeleton, Goblin, Caveman, Grunt, Yeti, or
  Hammerer; Juggernaut, Abomination, Troll, Brontosaurus, Colossus, Frost
  Giant, or Brass Titan) always appear
  on the city center, hatched (no reward ever creates an Egg) and at full
  Shield. An existing occupant moves to
  the first free adjacent land cell in `(y, x)` order that it can legally
  enter (Engineering for Mountain unless it strides, flies, or is
  Mountain-born, no unit, Egg, or mound, no treasure, not allied
  territory); an Egg is never displaced. If
  none exists, the occupant is removed with no refund or kill credit (and
  no Grave or death blast; a removed Brain's Thralls collapse).
- **Goblin Militia** is two Goblins (`MILITIA_FIGHTERS_V7`): the first
  appears on the center as above; the second then appears on the first
  adjacent cell in `(y, x)` order that the same displacement rule allows, or
  is not created (no substitute). Each is full-HP, exhausted, homed to the
  city, may exceed capacity, and emits `UNIT_REWARD_GRANTED`; the reward ID
  stays `MILITIA`.
- New units are full-HP and exhausted until their owner's next Start Turn.

### 4.7 Siege and capture

- A city is **besieged** while a hostile unit stands on its center: zero income
  and no training, Egg laying, Land Grant, or tile economy for that city.
  Pending rewards can still be chosen, and the city's Eggs still count down
  and hatch. A Martian flyer never stands on a hostile or neutral center
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)), so it
  never besieges, and neither does a Sabretooth
  ([section 21.12](#2112-prowl-and-the-cold-aura)) or a Dwarf Gyrocopter (a
  flyer). A mound never stands on a center, so a burrowed unit never
  besieges, and a siege its Mole or rider made ends when it tunnels. A
  besieged Ice Folk city is still Snow.
- **Capture** requires a capture-capable land unit (Human Fighter, Raider,
  Marksman, Guard, or Juggernaut; Undead Skeleton, Ghoul, Banshee, Zombie, or
  Abomination; Goblin Goblin, Wolf Rider, Bomb Chucker, Orc Brute, or Troll;
  Dinosaur Caveman, Raptor, Spitter, Ankylosaurus, or Brontosaurus; Martian
  Grunt, Ray Gunner, Shield Projector, Colossus, or Thrall; Ice Folk Yeti,
  Sled, Snow Hunter, Mammoth, or Frost Giant; Dwarf Hammerer, Clockwork
  Gunner, Steam Mole, or Brass Titan)
  that began its owner's turn on a neutral
  village or hostile city center, stands there alone, and has not moved or used
  a primary action this turn. Capture is terminal.
- Capture transfers level, footprint, improvements, Roads, Walls, and reward
  history; re-homes the capturing unit (with its capacity slots; a Thrall
  stays homeless); destroys
  every Egg homed to the city (`UNIT_DIED` cause `CITY_CAPTURED`, in unit-ID
  order right after `CITY_CAPTURED`, with no kill credit, Plunder, or Grave);
  orphans the other units homed there by the former owner; and spends the
  city action.
- **Spoils:** with Drill, a player's first capture of each hostile city grants
  2 Coins (never for villages or recaptures).

### 4.8 City rewards

Each reached level grants exactly one reward, chosen by the owner:

| Reached level | Option A                                 | Option B              |
| ------------: | ---------------------------------------- | --------------------- |
|             2 | Survey: explore radius 3 around the city | Stockpile: +4 Coins   |
|             3 | Walls: +2 fortification at the center    | Militia: free Fighter |
|             4 | Boom: +3 permanent population            | Treasury: +8 Coins    |
|         5, 6… | Juggernaut reward unit                   | Treasury: +12 Coins   |

- Reward units come from the owner's registration: an Undead Militia is a
  Skeleton and an Undead Juggernaut reward is an Abomination; a Goblin Militia
  is two Goblins ([section 4.6](#46-training-and-city-center-spawning)) and a
  Goblin Juggernaut reward is a Troll; a Dinosaur Militia is one Caveman and
  a Dinosaur Juggernaut reward is a Brontosaurus (2 slots, hatched); a
  Martian Militia is one Grunt and a Martian Juggernaut reward is a Colossus
  (2 slots, full Shield); an Ice Folk Militia is one Yeti and an Ice Folk
  Juggernaut reward is a Frost Giant; a Dwarf Militia is one Hammerer and a
  Dwarf Juggernaut reward is a Brass Titan. Reward
  IDs (`MILITIA`, `JUGGERNAUT`) are the same for every faction.
- Rewards settle only for the active player's cities, by city ID then level;
  the first unrewarded level becomes the single pending choice, which blocks
  every other command until chosen.
- A level reached during another player's turn waits for its owner's next
  turn.
- Walls are stored on the city and transfer on capture.

## 5. Achievements and Monuments

Seven achievements, in canonical order (`ACHIEVEMENT_IDS_V7`; revision 21
added the last four, constants in `src/engine/v7/achievements.ts`):

| Achievement | ID           | Requires    | Condition                                                                                          | Goal shown to the player   |
| ----------- | ------------ | ----------- | -------------------------------------------------------------------------------------------------- | -------------------------- |
| Explorer    | `EXPLORER`   | Scouting    | at least 100 explored tiles                                                                        | —                          |
| Engineer    | `ENGINEER`   | Engineering | one owned Windmill, Sawmill, Forge, or Workshop with live output of at least 6 (Workshop max is 4) | —                          |
| Muster      | `MUSTER`     | Drill       | at least four distinct trainable roles owned on the board at once (Juggernaut excluded)            | —                          |
| Conqueror   | `CONQUEROR`  | —           | the player captures a city owned by another player (`CONQUEROR_CAPTURES_V7` 1)                     | Capture an enemy city.     |
| Land Baron  | `LAND_BARON` | —           | the player owns at least 5 cities at once (`LAND_BARON_CITIES_V7`)                                 | Own 5 cities at once.      |
| Sea Dog     | `SEA_DOG`    | —           | at least 3 of the player's units in `NAVAL` form on the board at once (`SEA_DOG_SHIPS_V7`)         | Own 3 warships at once.    |
| Slayer      | `SLAYER`     | —           | one of the player's units on the board has at least 5 kills (`SLAYER_KILLS_V7`)                    | Get 5 kills with one unit. |

- Every seat has seven entitlements (`PlayerStateV7.achievementEntitlements`)
  and seven progress entries (`PlayerViewV7.achievementProgress`, owner-only)
  in this order. The four revision-21 achievements have no enabling
  technology (`ACHIEVEMENT_REQUIRED_TECH_V7` is null); for the three older
  ones, progress made before the enabling research counts. Unlocking is
  personal and permanent: an entitlement stays unlocked when the count later
  drops (a city lost, a ship sunk, the veteran dead), and each achievement
  unlocks at most once per player per match.
- **Evaluation.** Achievements are evaluated for the acting player at the
  end of every accepted command that evaluates them, and for the incoming
  player at the end of its Start Turn; only that player is evaluated, so a
  unit that earns its fifth kill by retaliation in another player's turn
  completes Slayer at its owner's next Start Turn (if it is still on the
  board). Locked entitlements are checked in canonical order, and each that
  qualifies emits one owner-only `ACHIEVEMENT_UNLOCKED`, after the economy
  and reward-settlement events (in a `CAPTURE`, before `PLAYER_ELIMINATED`
  and `MATCH_ENDED`).
- **Conqueror** has no stored counter: it unlocks only in the accepted
  `CAPTURE` of a city whose owner was another player (`CITY_CAPTURED.from`
  not null); a neutral village never counts, a recaptured city does, and the
  capture that eliminates a player or ends the match does. Its progress is 1
  once unlocked and 0 before. A hostile capture that brings the player to 5
  cities emits Conqueror, then Land Baron.
- **Land Baron** counts the cities the player owns, the capital included,
  however gained. **Sea Dog** counts the player's Patrol Boats and
  Battleships on the board (an embarked land unit, a self-launched Martian
  machine or Dwarf Gyrocopter included, is `EMBARKED` and does not count; it
  cannot be completed
  on `DRY_LAND`). **Slayer** reads the largest
  `kills` of one unit on the board, with the ordinary kill credit
  ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)): explosions
  credit no unit, a Shatter and a hostile Sweep kill credit the attacker,
  an eruption kill credits the Mole and a bomb kill the Gyrocopter,
  a rising or a Thrall starts at 0, an Egg has 0, a Mind
  Control or a Thrall collapse is a removal and no kill, kills of different
  units never add up, and a Promotion or growth stage does not reset the
  count.
- Muster counts mechanical roles under the owner's registration (for Undead:
  Skeleton, Ghoul, Banshee, Zombie, Necromancer, Lich, Vampire, Patrol Boat,
  Battleship; the Abomination is excluded like the Juggernaut; for Goblins:
  Goblin, Wolf Rider, Bomb Chucker, Orc Brute, Orc Warboss, Rocket Cart,
  Scrap Buggy, Patrol Boat, Battleship, with the Troll excluded; for
  Dinosaurs: Caveman, Raptor, Spitter, Ankylosaurus, Shaman, Triceratops,
  T-Rex, Patrol Boat, Battleship, with the Brontosaurus excluded; for
  Martians: Grunt, Saucer, Ray Gunner, Shield Projector, Brain, Tripod,
  Mothership, Patrol Boat, Battleship, with the Colossus excluded; for the
  Ice Folk: Yeti, Sled, Snow Hunter, Mammoth, Ice Witch, Boulder Yeti,
  Sabretooth, Patrol Boat, Battleship, with the Frost Giant excluded; for
  the Dwarves: Hammerer, Gyrocopter, Clockwork Gunner, Steam Mole, Engineer,
  Steam Cannon, Steam Tank, Patrol Boat, Battleship, with the Brass Titan
  excluded). Risings, Thralls (as the `FIGHTER` role), hatched units, and
  assembled Gunners count; an Egg does not count until it hatches, and a
  burrowed unit, which is off the board, not until it surfaces.
- Each unlocked, unspent entitlement funds one `BUILD_MONUMENT`: 0 Coins, +3
  live population, on an explored owned land tile with no site, resource,
  improvement, or treasure (Mountain needs Engineering), at most one Monument
  per city, no siege or pending reward. A player can therefore place at most
  seven Monuments in a match, never more than one per owned city.
- Spent entitlements stay spent if the Monument is removed or captured;
  captured Monuments keep their +3 for the captor.
- The Normal AI does not plan for any achievement; it builds a Monument
  whenever the public command query offers one.

## 6. Technology

### 6.1 Research cost

```text
tier 1 = 5  + 1 * (C - 1)
tier 2 = 7  + 3 * (C - 1)
tier 3 = 12 + 5 * (C - 1)
```

| Cities `C` | Tier 1 | Tier 2 | Tier 3 |
| ---------: | -----: | -----: | -----: |
|          1 |      5 |      7 |     12 |
|          2 |      6 |     10 |     17 |
|          3 |      7 |     13 |     22 |
|          4 |      8 |     16 |     27 |
|          5 |      9 |     19 |     32 |
|          6 |     10 |     22 |     37 |

`C` is the researcher's currently owned city count
(`TECHNOLOGY_RESEARCH_COST_V7`). Research is permanent,
costs Coins only, and needs the one listed prerequisite. No technology starts
known. On `DRY_LAND` the three Naval technologies are visible but cannot be
researched, so Shorecraft is never offered there.

**Free opening technology:** while a player has researched zero
technologies, researching any offered tier-1 technology (Gathering, Hunting,
Scouting, Drill, or Shorecraft where offered) costs 0 Coins. It is not forced
or modal and can be used on any turn; the `TECH_RESEARCHED` event records the
actual cost (0), and the public technology tree and research offers show the
cost as 0 ("Free") while the player is eligible. After the first research the
ordinary formula applies to every technology.

### 6.2 Technology tree

| Branch     | Tier | ID                  | Requires       | Exact unlocks                                                                      |
| ---------- | ---: | ------------------- | -------------- | ---------------------------------------------------------------------------------- |
| Settlement |    1 | `GATHERING`         | —              | reveal Fertile Ground; Harvest Fruit                                               |
| Settlement |    2 | `FARMING`           | Gathering      | Farm; connected-Farm visuals                                                       |
| Settlement |    3 | `MILLING`           | Farming        | Windmill; Windmill Start Turn healing (6 HP)                                       |
| Settlement |    2 | `ADMINISTRATION`    | Gathering      | Captain (Rally, Tend Wounded); Market; Disband                                     |
| Settlement |    3 | `PLANNING`          | Administration | +1 capacity in every owned city; Land Grant                                        |
| Wilds      |    1 | `HUNTING`           | —              | Hunt Game                                                                          |
| Wilds      |    2 | `FORESTRY`          | Hunting        | Lumber Camp; Clear Forest                                                          |
| Wilds      |    3 | `SAWMILLING`        | Forestry       | Sawmill; Catapult                                                                  |
| Wilds      |    2 | `MARKSMANSHIP`      | Hunting        | Marksman                                                                           |
| Wilds      |    3 | `FIELDCRAFT`        | Marksmanship   | Replant Forest; Raider and Marksman ignore Forest movement stops; Marksman Sight 2 |
| Mobility   |    1 | `SCOUTING`          | —              | Raider; Raider Sight 2                                                             |
| Mobility   |    2 | `ROADS`             | Scouting       | Build Road; half-cost Road movement; connected-city Road population                |
| Mobility   |    3 | `COMMERCE`          | Roads          | +1 Coin land trade per connected city                                              |
| Mobility   |    2 | `RAIDING`           | Scouting       | Pillage for all trainable land roles; Raider Charge                                |
| Mobility   |    3 | `CHIVALRY`          | Raiding        | Knight; Overrun; Cultivate Forest                                                  |
| Industry   |    1 | `DRILL`             | —              | reveal Ore; Guard; first-hostile-capture Spoils (2 Coins)                          |
| Industry   |    2 | `ENGINEERING`       | Drill          | land units enter Mountain; +1 Sight on Mountain; Mine; Workshop; Redevelop         |
| Industry   |    3 | `METALLURGY`        | Engineering    | Forge; Arms Industry (−1 land training cost)                                       |
| Industry   |    2 | `FORTIFICATION`     | Drill          | Fighter/Guard Build Field Defense                                                  |
| Industry   |    3 | `EXPLOSIVES`        | Fortification  | Blast Mountain; melee Field Defense demolition                                     |
| Naval      |    1 | `SHORECRAFT`        | —              | Harvest Fish; Build Port; embarkation and Shallow Water transport; Patrol Boat     |
| Naval      |    2 | `NAVIGATION`        | Shorecraft     | Deep Water movement; Gather Pearls; sea trade                                      |
| Naval      |    3 | `NAVAL_ENGINEERING` | Navigation     | Battleship; Shipyard; −2 Coin naval training at a Shipyard                         |

The table uses Human (`ORIGINAL_BASELINE_V5`) names. The Undead tree
(`UNDEAD_BASELINE_V1`) has the same graph, tiers, prerequisites, costs, free
opener, Dry Land Naval rule, and every economic and movement unlock, with two
unlock differences: Administration grants Necromancer support (Frenzy and
Raise Dead) instead of Captain support, and Chivalry grants no Overrun. Every
other unlock is the same mechanical value, so role unlocks, the Fieldcraft
Forest freedom, and the Sight entries apply to the Undead role of the same
mechanical role. The tree, research offers, and Help describe each unlock
with the **viewer's** faction labels, so the Undead unlocks that differ from
the table above are:

| Technology     | Undead unlocks                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| Administration | Necromancer (Frenzy, Raise Dead); Market; Disband                               |
| Sawmilling     | Sawmill; Lich                                                                   |
| Marksmanship   | Banshee                                                                         |
| Fieldcraft     | Replant Forest; Ghoul and Banshee ignore Forest movement stops; Banshee Sight 2 |
| Scouting       | Ghoul; Ghoul Sight 2                                                            |
| Raiding        | Pillage for all trainable land roles; Ghoul Charge                              |
| Chivalry       | Vampire; Cultivate Forest                                                       |
| Drill          | reveal Ore; Zombie; first-hostile-capture Spoils (2 Coins)                      |
| Fortification  | Skeleton/Zombie Build Field Defense                                             |

The Goblin tree (`GOBLIN_BASELINE_V1`) has the same graph, tiers,
prerequisites, costs, free opener, Dry Land Naval rule, and technology IDs as
the Human one, with two unlock differences: Administration grants WAAAGH!
support (`WAAAGH_SUPPORT`) instead of Captain support, and Commerce grants
**Plunder** (`PLUNDER { coins: 1 }`, [section 18.9](#189-kill-credit-plunder-and-friendly-fire))
instead of land trade, so Goblins never earn land trade (Roads movement and
Road population are unchanged). Chivalry keeps Overrun, labelled Ram.
Commerce keeps its ID `COMMERCE` in state, commands, and events and is
displayed as **Plunder** to a Goblin viewer
(`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`); the public technology tree query
returns IDs only, and the browser resolves names with the UI helper
`technologyNameV7` (`src/render/goblin-presentation-v7.ts`), which keeps the
sentence-case names of every other technology. The Goblin unlocks that read
differently from the Human table are:

| Technology     | Goblin name | Goblin unlocks                                                                                 |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| Administration | same        | Orc Warboss (WAAAGH!); Market; Disband                                                         |
| Sawmilling     | same        | Sawmill; Rocket Cart                                                                           |
| Marksmanship   | same        | Bomb Chucker                                                                                   |
| Fieldcraft     | same        | Replant Forest; Wolf Rider and Bomb Chucker ignore Forest movement stops; Bomb Chucker Sight 2 |
| Scouting       | same        | Wolf Rider; Wolf Rider Sight 2                                                                 |
| Commerce       | Plunder     | +1 Coin for each enemy unit your units or blasts kill                                          |
| Raiding        | same        | Pillage for all trainable land roles; Wolf Rider Charge                                        |
| Chivalry       | same        | Scrap Buggy; Ram; Cultivate Forest                                                             |
| Drill          | same        | reveal Ore; Orc Brute; first-hostile-capture Spoils (2 Coins)                                  |
| Fortification  | same        | Orc Brute Build Field Defense                                                                  |

The Dinosaur tree (`DINOSAUR_BASELINE_V1`) has the same graph, tiers,
prerequisites, costs, free opener, Dry Land Naval rule, and technology IDs as
the Human one, with two unlock differences, both in the Industry branch.
**Fortification**, displayed as **Nesting**, grants
`NESTING { eggHp: 4, hatchTurns: 1, citySlots: 1 }` instead of the Field
Defense command: every Egg the player lays has +4 HP and hatches one turn
sooner (minimum 1), and every city the player owns has one more unit slot
([section 19.2](#192-capacity-slots-and-nesting)). **Explosives**,
displayed as **Wallbreaker**, keeps Blast Mountain and the melee Field
Defense demolition and adds `WALLBREAKER`: the player's dinosaurs ignore
City Walls when they attack ([section 19.10](#1910-wallbreaker)).
Administration keeps Captain support (the Shaman's War Drums and Tend
Wounded), Chivalry keeps Overrun (labelled Rampage), and Raiding keeps the
Charge bonus (labelled Pounce). `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`
holds `DINOSAUR: { FORTIFICATION: "Nesting", EXPLOSIVES: "Wallbreaker" }`,
resolved by `technologyNameV7` as for Plunder. The Dinosaur unlocks that
read differently from the Human table are:

| Technology     | Dinosaur name | Dinosaur unlocks                                                                 |
| -------------- | ------------- | -------------------------------------------------------------------------------- |
| Administration | same          | Shaman (War Drums, Tend Wounded, Hatch); Market; Disband                         |
| Sawmilling     | same          | Sawmill; Triceratops Egg (Charge!)                                               |
| Marksmanship   | same          | Spitter Egg                                                                      |
| Fieldcraft     | same          | Replant Forest; Raptor and Spitter ignore Forest movement stops; Spitter Sight 2 |
| Scouting       | same          | Raptor Egg; Raptor Sight 2                                                       |
| Raiding        | same          | Pillage for all trainable land roles; Raptor Pounce                              |
| Chivalry       | same          | T-Rex Egg; Rampage; Cultivate Forest                                             |
| Drill          | same          | reveal Ore; Ankylosaurus Egg; first-hostile-capture Spoils (2 Coins)             |
| Metallurgy     | same          | Forge; Arms Industry (−1 Coin for trained land units and Eggs)                   |
| Fortification  | Nesting       | Eggs have +4 HP and hatch one turn sooner; +1 unit slot in every city            |
| Explosives     | Wallbreaker   | Blast Mountain; melee attacks destroy Field Defense; dinosaurs ignore City Walls |

The Martian tree (`MARTIAN_BASELINE_V1`) has the same graph, tiers,
prerequisites, costs, free opener, Dry Land Naval rule, and technology IDs as
the Human one, with four unlock differences. **Administration** grants
`BRAIN_SUPPORT` (the Brain's Psychic Command and Mind Control) instead of
Captain support. **Chivalry** grants no Overrun (the Undead precedent).
**Fortification**, displayed as **Force Fields**, grants `FORCE_FIELDS`
instead of the Field Defense command: the player's Shields also recharge at
the end of its turn ([section 20.3](#203-force-field-and-force-fields)).
**Explosives**, displayed as **Disintegrator**, keeps Blast Mountain and the
melee Field Defense demolition and adds `DISINTEGRATOR`: the player's heat
rays ignore the defender's fortification
([section 20.5](#205-pierce-and-the-disintegrator)).
`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` holds
`MARTIAN: { FORTIFICATION: "Force Fields", EXPLOSIVES: "Disintegrator" }`,
resolved by `technologyNameV7`. Raiding's Pillage reaches every Martian
land role except the two flyers, and Engineering's Mountain entry matters
only to foot units (walkers and flyers need none); every technology still
has a live unlock for a Martian seat. The Martian unlocks that read
differently from the Human table are:

| Technology     | Martian name  | Martian unlocks                                                                               |
| -------------- | ------------- | --------------------------------------------------------------------------------------------- |
| Administration | same          | Brain (Psychic Command, Mind Control); Market; Disband                                        |
| Sawmilling     | same          | Sawmill; Tripod (heat ray, Pierce)                                                            |
| Marksmanship   | same          | Ray Gunner (heat ray)                                                                         |
| Fieldcraft     | same          | Replant Forest; Ray Gunner ignores Forest movement stops; Ray Gunner Sight 2                  |
| Scouting       | same          | Saucer (flies, Beam Down); Saucer Sight 2                                                     |
| Raiding        | same          | Pillage for land units that do not fly; Saucer Strafe                                         |
| Chivalry       | same          | Mothership (flies, Tractor Beam); Cultivate Forest                                            |
| Drill          | same          | reveal Ore; Shield Projector (Force Field); first-hostile-capture Spoils (2 Coins)            |
| Fortification  | Force Fields  | Shields also recharge at the end of your turn                                                 |
| Explosives     | Disintegrator | Blast Mountain; melee attacks destroy Field Defense; heat rays ignore Walls and Field Defense |

The Ice Folk tree (`ICE_FOLK_BASELINE_V1`) has the same graph, tiers,
prerequisites, costs, free opener, Dry Land Naval rule, and technology IDs as
the Human one, with four unlock differences. **Administration** grants
`WITCH_SUPPORT` (the Ice Witch's Cold Snap; her Blizzard needs no unlock)
instead of Captain support. **Chivalry** grants no Overrun (the Undead
precedent). **Fortification**, displayed as **Deep Winter**, grants
`DEEP_WINTER` instead of the Field Defense command: neutral land within two
tiles of each own city center is Snow, and Recover heals 6 in own territory
([section 21.7](#217-deep-winter-and-brittle)). **Explosives**, displayed as
**Brittle**, keeps Blast Mountain and the melee Field Defense demolition and
adds `BRITTLE`: the player's Shatter threshold is 4 instead of 3
([section 21.4](#214-shatter)). `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`
holds `ICE_FOLK: { FORTIFICATION: "Deep Winter", EXPLOSIVES: "Brittle" }`,
resolved by `technologyNameV7`. Engineering's Mountain entry matters only
to the Sled, Snow Hunter, Mammoth, Ice Witch, and Sabretooth (the three
Mountain-born roles need none), Raiding's Pillage reaches every Ice Folk
land role but the Frost Giant, and every technology still has a live unlock
for an Ice Folk seat. The Ice Folk unlocks that read differently from the
Human table are:

| Technology     | Ice Folk name | Ice Folk unlocks                                                                       |
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

The Dwarf tree (`DWARF_BASELINE_V1`) has the same graph, tiers,
prerequisites, costs, free opener, Dry Land Naval rule, and technology IDs as
the Human one, with six unlock differences. **Administration** grants
`ENGINEER_SUPPORT` (the Engineer's Repair) instead of Captain support (no
Rally). **Marksmanship** also grants `ASSEMBLE`: the player's Engineers may
Assemble Clockwork Gunners
([section 22.8](#228-engineer-repair-and-assemble)). **Raiding** grants
`DIVE` instead of the Charge bonus and keeps Pillage: the player's bombs
deal 6 instead of 5 ([section 22.5](#225-gyrocopters-and-the-bombing-run)).
**Chivalry** grants no Overrun (the Undead, Martian, and Ice Folk
precedent). **Fortification**, displayed as **Dig In**, grants `DIG_IN`
instead of the Field Defense command: an unmoved Hammerer or Steam Mole on
or next to an own city center has one fortification level
([section 22.7](#227-dig-in)). **Explosives**, displayed as **Blasting
Charges**, keeps Blast Mountain and the melee Field Defense demolition and
adds `BLASTING_CHARGES`: the player's eruptions deal 3 instead of 2, and its
Steam Cannon shots ignore the defender's fortification
([sections 22.3](#223-the-mound-surfacing-and-the-eruption) and
[22.9](#229-steam-cannon-knockback)). `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`
holds `DWARF: { FORTIFICATION: "Dig In", EXPLOSIVES: "Blasting Charges" }`,
resolved by `technologyNameV7`. Fieldcraft's Forest freedom matters only to
the Clockwork Gunner (the Gyrocopter flies), Engineering's Mountain entry
to every Dwarf ground unit (a Mole and a rider tunnel to a Mountain only
with it; the Gyrocopter needs none), Raiding's Pillage reaches every Dwarf
land role but the Gyrocopter (a flyer) and the Brass Titan, Arms Industry
also lowers the Assemble cost, and every technology still has a live
unlock for a Dwarf seat. The Dwarf unlocks that read differently from the
Human table are:

| Technology     | Dwarf name       | Dwarf unlocks                                                                               |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Administration | same             | Engineer (Repair); Market; Disband                                                          |
| Sawmilling     | same             | Sawmill; Steam Cannon (Knockback)                                                           |
| Marksmanship   | same             | Clockwork Gunner (two shots standing still); Engineers Assemble Gunners                     |
| Fieldcraft     | same             | Replant Forest; Gunners ignore Forest movement stops; Gunner Sight 2                        |
| Scouting       | same             | Gyrocopter (Bomb Run); Gyrocopter Sight 2                                                   |
| Raiding        | same             | Pillage; Dive: bombs deal 6                                                                 |
| Chivalry       | same             | Steam Tank (Plated); Cultivate Forest                                                       |
| Drill          | same             | reveal Ore; Steam Mole (Tunnel); first-hostile-capture Spoils (2 Coins)                     |
| Fortification  | Dig In           | Hammerers and Moles that stand still on or next to your city centers are dug in             |
| Explosives     | Blasting Charges | Blast Mountain; melee attacks destroy Field Defense; eruptions deal 3; Cannons ignore Walls |

The other technologies read the same for every faction. The engine, query,
and AI checks of land trade read the technology capability
`landTradeIncomeCoins` (never a raw `COMMERCE` test), and Plunder is the
capability `plunderCoins`. Nesting and Wallbreaker are likewise read through
the capabilities `eggHpBonus` (0 or 4), `eggHatchTurnReduction` (0 or 1),
`nestingCityCapacityBonus` (0 or 1), and `ignoresCityWalls`, and Force
Fields and the Disintegrator through `shieldsRechargeAtEndTurn` and
`raysIgnoreFortification`, Deep Winter and Brittle through `deepWinter`
and `shatterThreshold` (3 or 4), and the Dwarf unlocks through `digIn`,
`assemble`, `bombDamage` (5 or 6), `eruptionDamage` (2 or 3), and
`cannonIgnoresFortification`, never through a raw `FORTIFICATION`,
`EXPLOSIVES`, `RAIDING`, or `MARKSMANSHIP` test.

## 7. Resources and visibility

| Resource       | Terrain       | Visible on explored tiles | Used by                     |
| -------------- | ------------- | ------------------------- | --------------------------- |
| Fruit          | Grass         | always                    | Harvest Fruit (Gathering)   |
| Fertile Ground | Grass         | only with Gathering       | Farm                        |
| Game           | Forest        | always                    | Hunt Game                   |
| Ore            | Mountain      | only with Drill           | Mine; blocks Blast Mountain |
| Fish           | Shallow Water | always                    | Harvest Fish                |
| Pearls         | any water     | always                    | Gather Pearls               |

- A tile has at most one resource. Harvested Fruit, Game, Fish, and Pearls
  never regenerate.
- **Resources stay under improvements.** Placing an improvement never
  removes the resource beneath it: the resource stays on the tile, hidden in
  every public view, preview, and Normal AI input while the improvement
  stands, and it is visible and usable again once the improvement is removed
  (Redevelop or Pillage). A Farm always stands on Fertile Ground and a Mine on
  Ore. Ports and Shipyards are the exception: their Fish or Pearls stay visible
  and harvestable. Harvests (Fruit, Game, Fish, Pearls) are not improvements
  and consume their resource. An improved tile never offers a resource action
  for the resource it hides.
- Without Drill, an explored Mountain shows no resource marker, so hidden Ore
  is indistinguishable from an empty Mountain. Likewise, without Gathering an
  explored Grass tile shows no Fertile Ground marker; the mask applies to the
  public view, previews, projected events (a cultivated tile reports no
  resource), and Normal AI input.
- Placement gates for buildings, Monuments, and Replant Forest consider only
  resources the actor can observe, so a player without Gathering may place a
  Sawmill, Workshop, Forge, or Monument on Grass that hides Fertile Ground. The
  Fertile Ground stays under it and is exposed (to viewers with Gathering)
  when the improvement is removed; the removal event reports it as restored.
- **Terrain-transform exception:** terrain transforms are not improvements.
  Replant Forest on Grass that hides Fertile Ground turns the tile into Forest
  and removes the Fertile Ground, which cannot exist on Forest. Clear Forest,
  Cultivate Forest, and Blast Mountain cannot meet a hidden resource (Forest
  resources are always visible and Blast requires Explosives, hence Drill).

## 8. Economic actions and buildings

### 8.1 Common placement gates

Tile economy targets an explored tile assigned to one of the actor's cities
that is not besieged and has no pending reward. No unit is needed. Resource
actions, buildings, and Monuments never target a site (city center or village)
or a treasure tile. Mountain targets for buildings, Monuments, and Roads
require Engineering. Roads always coexist. **No tile command targets a
Rift**: buildings, Monuments, and Roads are rejected with `INVALID_TILE`
(the Forest actions with `FOREST_ACTION_INVALID_TILE`), and the query
offers none. A Rift may lie in territory (a Land Grant claims it) and adds
nothing to its city. Snow ([section 21.5](#215-snow)) lies on Roads,
improvements, resources, Field Defense, and centers alike and changes no
tile command, and so does a Dwarf mound
([section 22.3](#223-the-mound-surfacing-and-the-eruption)): its tile keeps
its terrain, Road, improvement, resource, Field Defense, Grave, and Snow,
and no tile command changes a tile into water, a Rift, or a site.

### 8.2 Resource and basic actions

| Action            | Tech        | Target                                     | Cost | Result                                  |
| ----------------- | ----------- | ------------------------------------------ | ---: | --------------------------------------- |
| Harvest Fruit     | Gathering   | Grass + Fruit                              |    2 | remove Fruit; +1 permanent population   |
| Hunt Game         | Hunting     | Forest + Game                              |    2 | remove Game; +1 permanent population    |
| Harvest Fish      | Shorecraft  | Shallow Water + Fish (Port tile if active) |    2 | remove Fish; +1 permanent population    |
| Gather Pearls     | Navigation  | any water + Pearls (Port tile if active)   |    2 | remove Pearls; receive 4 Coins (net +2) |
| Build Farm        | Farming     | Grass + Fertile Ground                     |    5 | Farm; +2 live population                |
| Build Lumber Camp | Forestry    | Forest, no resource or improvement         |    3 | Lumber Camp; +1 live population         |
| Build Mine        | Engineering | Mountain + Ore                             |    5 | Mine; +2 live population                |

### 8.3 Processors and mixed buildings

"Adjacent" always means the eight surrounding cells.

| Building | Tech           | Cost | Limit    | Placement needs                                                   | Live output                                                               |
| -------- | -------------- | ---: | -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Windmill | Milling        |    5 | one/city | at least one adjacent same-owner Farm                             | +1 per adjacent same-owner Farm, cap 8                                    |
| Sawmill  | Sawmilling     |    5 | one/city | at least one adjacent same-owner Lumber Camp                      | +1 per adjacent same-owner Lumber Camp, cap 8                             |
| Forge    | Metallurgy     |    6 | one/city | at least one adjacent same-owner Mine                             | +1 per adjacent same-owner Mine, cap 6                                    |
| Workshop | Engineering    |    4 | one/city | at least one adjacent Farm, Lumber Camp, or Mine of the same city | 0 without support; else 1 + number of distinct adjacent basic types (2–4) |
| Market   | Administration |    6 | one/city | at least one adjacent economic family                             | Coins, not population ([section 9.4](#94-market))                         |
| Monument | achievement    |    0 | one/city | an unspent achievement entitlement                                | +3                                                                        |

- Buildings target a land tile with no site, visible resource, improvement, or
  treasure.
- Processor contributors may belong to any city of the same owner, and one
  contributor may support several processors. Workshop counts only its own
  city's improvements.
- A building that loses all support stays in place with zero output and
  recovers when support returns.

### 8.4 Terrain and infrastructure actions

| Action              | Tech          | Target                                                                               | Cost | Result                                             |
| ------------------- | ------------- | ------------------------------------------------------------------------------------ | ---: | -------------------------------------------------- |
| Clear Forest        | Forestry      | owned Forest with no site, resource, or improvement                                  |    0 | becomes Grass; +1 Coin                             |
| Replant Forest      | Fieldcraft    | owned Grass with no site, resource, or improvement                                   |    4 | becomes Forest                                     |
| Cultivate Forest    | Chivalry      | owned Forest with no site, resource, or improvement                                  |    4 | becomes Grass + Fertile Ground                     |
| Blast Mountain      | Explosives    | owned Mountain with no site, resource (including Ore), improvement, or Field Defense |    3 | becomes Grass                                      |
| Build Road          | Roads         | owned or neutral land without site or Road                                           |    2 | adds Road ([section 9](#9-roads-trade-and-market)) |
| Redevelop           | Engineering   | any owned improvement                                                                |    0 | removes it with no refund; re-exposes its resource |
| Build Field Defense | Fortification | see [section 12.3](#123-field-defense)                                               |    3 | adds Field Defense                                 |

- Terrain changes preserve Road, Field Defense, and territory.
- Redevelop can remove Monuments, Ports, and Shipyards (Port or Shipyard only
  when unoccupied); it never removes Roads, Field Defense, terrain, city
  centers, or Walls. A Fish or Pearls marker under a removed Port stays.
- Neutral Road construction skips the siege and pending-reward gates.

## 9. Roads, trade, and Market

### 9.1 Road usability

- A Road stores no builder. While its tile is neutral, every player with Roads
  may use it; once the tile is owned, only the owner may.
- A usable Road node is a Road on a neutral or own-territory tile, or the
  center of a city the player owns.

### 9.2 Road movement

- **Cost by origin** (revision 18). With Roads, a step (orthogonal or
  diagonal) costs half a movement point when the tile being **left** is a
  usable Road node for the mover's owner, and a full point otherwise. The
  tile being entered does not matter: it needs no Road, and it may be
  unexplored, a Forest, a Mountain, or a dock the unit embarks on. Entering a
  Road tile from a roadless tile costs a full point. So a Move-1 unit that
  stands on a Road tile with a Road tile next to it reaches the tile beyond
  them, Road or not; a single Road tile under the unit adds no reach.
- A step that leaves a water tile always costs a full point (water has no
  Roads), so naval and embarked movement has no Road discount.
- **Road edge.** A step whose two ends are both usable Road nodes also
  ignores the Forest and Mountain movement stop. A half-cost step onto a
  roadless Forest or Mountain still ends the Move there. Mountain entry still
  needs Engineering.
- A unit on a Road tile or its own city center next to an own active, empty
  Port or Shipyard embarks at half cost: a Move-1 unit one Road tile from its
  city center reaches a dock beside that center and embarks in one Move.
- Movement edges need no connection to the capital.
- The half cost applies to every land-form unit, Martian walkers and flyers
  and the Dwarf Gyrocopter included; the Road-edge exemption is moot for
  them, since terrain never stops them
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)). A Dwarf
  Tunnel and a bombing run are not Moves and ignore Roads
  ([section 22](#22-dwarf-faction-rules)).
- **Glide** ([section 21.5](#215-snow)): for a land-form Ice Folk unit
  other than the Sabretooth, a step also costs half when the tile being
  left is Snow; Snow and a Road do not add up, so a Road on Snow gains it
  nothing except the Road-edge waiver of a Forest or Mountain stop. For
  another faction's ground unit a Road edge also waives the deep-snow stop.
- The engine's Road-movement capability field is named
  `connectedOrthogonalStepCost2` for historical reasons; the half cost applies
  to orthogonal and diagonal steps and needs no capital connection, as stated
  above. The engine and the public step-cost rule are the same, so previews,
  offered paths, and reach estimates agree with the engine.

### 9.3 Road population and land trade

- The population graph contains usable Road nodes joined in eight directions
  and is rooted only at the player's **original capital** while the player
  still owns it.
- With Roads, each other owned city in that component gets +1 live
  population, and the original capital gets +1 per such connected city.
- With Commerce, each such connected non-original-capital city also earns +1
  Coin land trade at Start Turn. Goblin Commerce is Plunder and grants no land
  trade ([section 6.2](#62-technology-tree)).
- A captured foreign capital counts as an ordinary city. Losing the original
  capital drops all Road population and land trade to zero until recaptured.
- Ports, sea routes, and allies never join this graph. Disconnection removes
  the population without lowering level or repeating rewards.

### 9.4 Market

```text
market income = min(3, 1 + distinct adjacent families)
```

- Families: Agriculture (Farm, Windmill), Timber (Lumber Camp, Sawmill), Metal
  (Mine, Forge). Workshops do not count.
- Contributors may belong to any city of the same owner; a Market with no
  remaining family still pays its 1 base Coin.
- A Market pays 1–3 Coins (`MARKET_INCOME_CAP_V7`): 2 with one family, 3 with
  two or more. Commerce does not change Market income.

### 9.5 Sea trade

- With Navigation, each owned city other than the player's own original
  capital earns +1 Coin at Start Turn when one of its active Ports or
  Shipyards connects to an active Port or Shipyard of a different owned city.
  A captured foreign capital counts as an ordinary city and can earn sea
  trade. The original capital earns none itself but can be the partner city,
  and, unlike land trade, sea trade does not require the player to still own
  its original capital.
- Two docks connect when a path of at most five eight-way steps through water
  the owner has explored (Deep Water included) joins them.
- Mid-route units do not break a connection; a blockaded endpoint does.
- A city earns at most one sea-trade Coin and may also earn land trade.
  Allies never share trade.

## 10. Recovery and support

| Healing source                                    | Amount                                                                                                                           | When                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Recover or idle recovery, land                    | 4 in own territory (6 for an Ice Folk unit with Deep Winter); 2 elsewhere (Undead: Restless, see below); never a Dwarf construct | explicit terminal `RECOVER`, or End Turn for a unit that did not move or act |
| Recover or idle recovery, naval                   | 4 on or adjacent to an own active Port/Shipyard; otherwise illegal / 0                                                           | same                                                                         |
| Embarked unit                                     | none                                                                                                                             | —                                                                            |
| Windmill (Milling)                                | up to 6; never a Dwarf construct                                                                                                 | Start Turn, once per unit                                                    |
| Troll regeneration (Goblin)                       | up to 4, any tile and form; cures nothing                                                                                        | Start Turn, after Windmill healing                                           |
| Tend Wounded (Captain, Shaman, Engineer's Repair) | up to 2 (the Engineer: 4 on a Dwarf machine), and cures Plague, Bitten, and Chill                                                | Captain, Shaman, or Engineer action, once per unit per owner turn            |
| Promotion, growth stage                           | full heal to the new maximum HP; cures nothing (a Dwarf construct's only full heal)                                              | `PROMOTE` (non-growing units); a kill that reaches Big or Alpha (dinosaurs)  |
| Egg                                               | none: no healing source ever heals an Egg                                                                                        | —                                                                            |

- **Windmill healing:** at the owner's Start Turn, each Windmill in the
  owner's territory heals damaged own units (any form) on its eight
  neighbors. A unit next to several Windmills heals once, assigned to the first
  Windmill in `(y, x)` order. Output does not matter, and healing needs no
  technology, so a captured Windmill heals its new owner's units even without
  Milling. It skips Dwarf constructs.
- **Restless (Undead):** a land-form unit of an Undead seat recovers only in
  its owner's territory. An explicit `RECOVER` elsewhere is rejected
  atomically with `RECOVER_NOT_LEGAL { reason: "RESTLESS" }` and is never
  offered; End Turn idle recovery skips it (no HP change, no event). Undead
  naval units keep the naval rule; Windmill healing is unchanged.
- **Wait** does not prevent idle recovery; moving or any primary action does.
- **Goblin recovery** is the Human rule: Goblins are not Restless. A Goblin
  seat has no healer and no cure for Plague or Bitten
  ([section 18.3](#183-discipline-field-defense-and-no-healers)); beyond
  recovery and Windmills it heals only by Troll regeneration.
- **Dinosaur recovery** is the Human rule (Dinosaurs are not Restless), and
  the Shaman's Tend Wounded heals and cures exactly like the Captain's. A
  grown dinosaur heals toward its grown maximum HP. Eggs never heal: idle
  recovery, Windmill healing, and Tend Wounded skip them.
- **Martian recovery** is the Human rule (Martians are not Restless). A
  Martian seat has no healer and no cure for Plague or Bitten (the Brain has
  no Tend Wounded). Every healing source changes HP only; a Shield is never
  healed, it recharges ([section 20.2](#202-shields)), and the recharge is
  not healing.
- **Ice Folk recovery** is the Human rule (the Ice Folk are not Restless),
  except that with Deep Winter Recover and idle recovery heal a land-form
  Ice Folk unit 6 in its owner's territory (`DEEP_WINTER_RECOVER_V7`);
  elsewhere 2, Snow or not. An Ice Folk seat has no healer and no cure for
  Plague, Bitten, or Chill (the Ice Witch has no Tend Wounded).
- **Dwarf recovery** is the Human rule (the Dwarves are not Restless), except
  that the two **constructs**, the Clockwork Gunner and the Brass Titan,
  never mend themselves: an explicit `RECOVER` is rejected with
  `RECOVER_NOT_LEGAL { reason: "CONSTRUCT" }` and never offered, and idle
  recovery and Windmill healing skip them. They heal only by an Engineer's
  Repair and by a Promotion ([section 22.6](#226-clockwork)). A burrowed
  unit is off the board and has moved, so it never recovers idle.
- **Captain** (Human `CAPTAIN`): may Move, then use one primary action:
  Attack, Rally, or Tend Wounded. The Dinosaur Shaman has the same three
  (Rally labelled **War Drums**) plus Hatch
  ([section 19.6](#196-shaman-hatch)). The Undead Necromancer instead has
  Attack, Frenzy, and Raise Dead ([section 17](#17-undead-faction-rules)),
  the Goblin Orc Warboss has Attack and WAAAGH!
  ([section 18.10](#1810-waaagh-ram-and-troll-regeneration)), and the
  Martian Brain has Attack, Psychic Command, and Mind Control
  ([section 20.8](#208-mind-control)), and the Ice Folk Ice Witch has
  Attack and Cold Snap and no Rally
  ([section 21.6](#216-the-blizzard-and-cold-snap)); none of these four has
  Tend Wounded (`TEND_WOUNDED` is never offered and is rejected with
  `UNIT_ROLE_INVALID`). The Dwarf Engineer has Attack, **Repair** (its
  Tend Wounded), and Assemble, and no Rally (`RALLY` is never offered and
  is rejected with `UNIT_ROLE_INVALID`;
  [section 22.8](#228-engineer-repair-and-assemble)).
- **Rally** (Undead: **Frenzy**, labelled "Frenzied"; Goblin: **WAAAGH!**;
  Dinosaur: **War Drums**; Martian: **Psychic Command**; all with the same
  command `RALLY`, flag `inspired`, and event `UNITS_RALLIED`): every
  adjacent own land-form unit that is not `SUPPORT` or `SIEGE` (not a
  Captain, Necromancer, Shaman, Brain, Catapult, Lich, Triceratops, or
  Tripod), has the `ATTACK` ability (so not a
  Banshee), and is not already Inspired becomes Inspired: +1 Attack on its
  next attack this turn. An Egg is never a target (it is not in land form).
  WAAAGH! reaches every
  other own land-form unit within Chebyshev distance 2 and includes `SUPPORT`
  and `SIEGE` roles (Rocket Carts, other Warbosses); it keeps the `ATTACK`
  and not-already-Inspired requirements. Inspired expires at End Turn, does
  not stack, and never affects Wail, Kaboom, or blasts. With no eligible
  target the command rejects with `HEAL_TARGET_NOT_FOUND`.
- **Tend Wounded** (Human Captain, Dinosaur Shaman, Dwarf Engineer as
  **Repair**): targets every adjacent
  own land-form unit (other than the tender, not yet tended this turn) that
  is damaged, plagued, bitten, or Chilled; such a unit is a target even at
  full HP. Each target heals `min(2, maxHp - hp)` (possibly 0), loses both
  Plague and Bitten, and a Chilled target's entry becomes thawing
  (`{ sluggish: false, turnsLeft: 0 }`, [section 21.2](#212-chill)): it is
  no longer Chilled, may move and act this turn, and a Chill applied before
  its owner's next End Turn does not slow it (`WOUNDED_TENDED` results carry
  `curedPlague`, `curedBitten`, and `curedChill`). It does not use the
  target's action. The tender cannot
  tend itself, and an Egg is never a target. An Engineer's Repair heals a
  Dwarf machine `min(4, maxHp - hp)` instead (role mechanic
  `repairMachineHeal`, `REPAIR_MACHINE_V7`); `WOUNDED_TENDED` keeps its
  shape.
- **Disband** (Administration): an own land-form trainable unit that has not
  used a primary action (it may have moved) removes itself for
  `floor(printed cost / 2)` Coins (a Goblin refunds 0 and is still offered
  Disband; a Chilled unit may Disband). Juggernaut, Abomination, Troll,
  Brontosaurus, Colossus, Frost Giant, Brass Titan, naval,
  and embarked units cannot Disband, nor can a Thrall
  (`DISBAND_NOT_LEGAL` reason `THRALL`, never offered) or a burrowed unit
  (every command naming it is `UNIT_ALREADY_HANDLED`). Disband never
  explodes, and disbanding a Brain collapses its Thralls. A plagued or bitten unit
  cannot Disband: it is not offered and is rejected with `DISBAND_NOT_LEGAL`
  (reason `PLAGUED`, reported first, or `BITTEN`). An own Egg may also be
  disbanded ("Abandon Egg", [section 19.7](#197-egg-destruction-capture-and-abandon-egg)).
- **Promotion:** a unit with at least 3 kills may Promote once for free:
  +5 maximum HP and a **full heal** (its HP becomes the new maximum;
  revision 20). Plague, Bitten, and Chill stay, and a Martian unit's Shield
  is neither raised nor recharged; for a Dwarf construct it is the only full
  heal. It is an explicit command,
  independent of the activation; embarked units cannot Promote, and neither
  a growing unit (a dinosaur), which grows instead
  ([section 19.8](#198-grow)), nor a Thrall ever can: `PROMOTE` for them is
  never offered and is rejected with `PROMOTION_NOT_ELIGIBLE`. `UNIT_PROMOTED { unitId, maxHp }`
  implies `hp = maxHp`. Explosions credit no unit kill, and Bomb Chucker
  splash kills of own or allied units do not count
  ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)).

## 11. Unit roster

Attack and Defense are shown in whole units (the code stores half-units).

| Unit        | Tech              | Cost |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                |
| ----------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------ |
| Fighter     | start             |    2 | 12² |      2 |       2 |    1 |     1 |     1 | yes               | yes     | Field Defense            |
| Raider      | Scouting          |    4 | 12² |      2 |       1 |    2 |     1 |     2 | yes               | yes     | Charge (Raiding); Escape |
| Marksman    | Marksmanship      |    3 | 12² |      2 |       1 |    1 |   1–2 |    1¹ | yes               | yes     | —                        |
| Guard       | Drill             |    3 | 17² |    1.5 |       3 |    1 |     1 |     1 | no                | yes     | Field Defense            |
| Captain     | Administration    |    5 |  10 |      1 |       1 |    1 |     1 |     1 | yes               | no      | Rally; Tend Wounded      |
| Catapult    | Sawmilling        |    8 |  10 |    3.5 |     0.5 |    1 |   2–3 |     1 | no                | no      | —                        |
| Knight      | Chivalry          |    9 |  10 |      3 |       1 |    3 |     1 |     1 | yes               | no      | Overrun                  |
| Juggernaut  | reward only       |    — |  40 |      4 |       4 |    1 |     1 |     1 | yes               | yes     | Push                     |
| Patrol Boat | Shorecraft        |    5 |  10 |      2 |       2 |    2 |     1 |     2 | yes               | no      | naval                    |
| Battleship  | Naval Engineering |   16 |  25 |      6 |       4 |    2 |   1–3 |     3 | no                | no      | naval; splash            |

¹ Marksman Sight becomes 2 with Fieldcraft.
² [Revision 20 section 6.3](RULESET_7_REVISION_20.md#63-tuning-record)
(`pulp_wars-0hi.3`, `pulp-wars-poc-7r23`): Fighter, Raider, and Marksman 12
(were 10), Guard 17 (was 15); promoted 17 and 22. The Skeleton, Caveman,
Ghoul, Goblin, Wolf Rider, and Orc Brute state their own values and do not
copy these. The Knight keeps 10.

The table above is the Human (`ORIGINAL`) roster. The Undead (`UNDEAD`)
roster, by mechanical role (half-unit values `attack2`/`defense2` in
parentheses):

| Unit        | Role          | Tech              | Cost |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                                   |
| ----------- | ------------- | ----------------- | ---: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------------------------- |
| Skeleton    | `FIGHTER`     | start             |    2 |  10 |  2 (4) |   2 (4) |    1 |     1 |     1 | yes               | yes     | Field Defense                               |
| Ghoul       | `RAIDER`      | Scouting          |    3 |  10 |  2 (4) |   1 (2) |    2 |     1 |     2 | yes               | yes     | Charge (Raiding); Devour                    |
| Banshee     | `MARKSMAN`    | Marksmanship      |    3 |   8 |  1 (2) |   1 (2) |    1 |     — |    1² | Wail: yes         | yes     | Wail; no targeted Attack                    |
| Zombie      | `GUARD`       | Drill             |    3 |  18 |  2 (4) |   2 (4) |    1 |     1 |     1 | no                | yes     | Field Defense; Infect; Bite; never advances |
| Necromancer | `CAPTAIN`     | Administration    |    5 |  10 |  1 (2) |   1 (2) |    1 |     1 |     1 | yes               | no      | Frenzy; Raise Dead                          |
| Lich        | `CATAPULT`    | Sawmilling        |    8 |  10 |  3 (6) |   1 (2) |    1 |   2–3 |     1 | no                | no      | splash; Plague; never advances              |
| Vampire     | `KNIGHT`      | Chivalry          |    9 |  10 |  3 (6) |   1 (2) |    3 |     1 |     1 | yes               | no      | Lifesteal; Unanswered                       |
| Abomination | `JUGGERNAUT`  | reward only       |    — |  40 |  4 (8) |   4 (8) |    1 |     1 |     1 | yes               | yes     | Push                                        |
| Patrol Boat | `PATROL_BOAT` | Shorecraft        |    5 |  10 |  2 (4) |   2 (4) |    2 |     1 |     2 | yes               | no      | naval                                       |
| Battleship  | `BATTLESHIP`  | Naval Engineering |   16 |  25 | 6 (12) |   4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                               |

² Banshee Sight becomes 2 with Fieldcraft.

- **Skeleton** has exact Fighter parity (Field Defense with Fortification,
  capture, Pillage, Disband); Raise Dead also creates Skeletons.
- **Ghoul** keeps Raider Charge (Raiding), Pillage, and Fieldcraft Forest
  freedom; it has no Escape (Devour replaces it) and costs 3, not 4.
- **Banshee** has no `ATTACK` ability: it cannot issue `ATTACK`, never
  retaliates, and its role stores range 0 and minimum range 0. Its Attack
  exists only for Wail. It keeps capture, Pillage, Disband, Fieldcraft Forest
  freedom, and ordinary land ZOC (none onto water).
- **Zombie** has Guard parity for movement, capture, Field Defense, and "cannot
  attack after moving"; it never advances after a kill.
- **Necromancer** cannot capture; its primary actions are Attack, Frenzy, and
  Raise Dead.
- **Lich** has Catapult parity for range 2–3, minimum range, "cannot attack
  after moving", no capture, no advance, and Field Defense destruction on the
  primary target tile, and adds splash and Plague.
- **Vampire** cannot capture and has no Overrun; the defender of its attacks
  never retaliates (`UNANSWERED`).
- **Abomination** has exact Juggernaut parity (reward only, Push, capture, no
  Pillage or Disband). Patrol Boat and Battleship are the Human units.
- Undead Disband refunds: Skeleton, Ghoul, Banshee, and Zombie 1,
  Necromancer 2, Lich and Vampire 4. Arms Industry and the Shipyard discount
  apply to every faction.

The Goblin (`GOBLIN`) roster, by mechanical role, with the
`pulp_wars-0ao.7` tuned values (`GOBLIN_ROLE_RULES_V7` and
`GOBLIN_ROLE_MECHANICS_V7`). "Kaboom" and "Death blast" are the fixed blast
damages of [section 18.4](#184-kaboom) and [18.5](#185-death-blasts):

| Unit         | Role          | Tech              | Cost |  HP |  Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Kaboom | Death blast | Abilities                            |
| ------------ | ------------- | ----------------- | ---: | --: | ------: | ------: | ---: | ----: | ----: | ----------------- | ------- | -----: | ----------: | ------------------------------------ |
| Goblin       | `FIGHTER`     | start             |    1 |   6 | 1.5 (3) | 0.5 (1) |    1 |     1 |     1 | yes               | yes     |      5 |           — | Kaboom; no Field Defense             |
| Wolf Rider   | `RAIDER`      | Scouting          |    3 |  10 |   2 (4) |   1 (2) |    2 |     1 |     2 | yes               | yes     |      4 |           — | Charge (Raiding); Kaboom; no Escape  |
| Bomb Chucker | `MARKSMAN`    | Marksmanship      |    3 |   8 |   2 (4) |   1 (2) |    1 |     2 |    1³ | yes               | yes     |      4 |           2 | bombs (friendly-fire splash); Kaboom |
| Orc Brute    | `GUARD`       | Drill             |    3 |  15 |   2 (4) | 2.5 (5) |    1 |     1 |     1 | no                | yes     |      — |           — | Field Defense                        |
| Orc Warboss  | `CAPTAIN`     | Administration    |    5 |  12 |   2 (4) |   1 (2) |    1 |     1 |     1 | yes               | no      |      — |           — | WAAAGH!; no Tend Wounded             |
| Rocket Cart  | `CATAPULT`    | Sawmilling        |    7 |   8 | 3.5 (7) | 0.5 (1) |    1 |   2–3 |     1 | no                | no      |      5 |           4 | Kaboom; never advances               |
| Scrap Buggy  | `KNIGHT`      | Chivalry          |    8 |  10 |   3 (6) |   1 (2) |    3 |     1 |     1 | yes               | no      |      5 |           4 | Ram; Kaboom                          |
| Troll        | `JUGGERNAUT`  | reward only       |    — |  40 |   4 (8) |   3 (6) |    1 |     1 |     1 | yes               | yes     |      — |           — | Push; Regenerate 4                   |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 |  10 |   2 (4) |   2 (4) |    2 |     1 |     2 | yes               | no      |      — |           — | naval                                |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 |  25 |  6 (12) |   4 (8) |    2 |   1–3 |     3 | no                | no      |      — |           — | naval; splash                        |

³ Bomb Chucker Sight becomes 2 with Fieldcraft.

- **Goblin** has Fighter parity (capture, Pillage with Raiding, Disband)
  except that it cannot build Field Defense; it is the 1-Coin horde unit.
- **Wolf Rider** has Raider parity for Move 2, Sight 2 (Scouting), Charge
  (Raiding), Pillage, capture, and Fieldcraft Forest freedom; it has no
  Escape.
- **Bomb Chucker** has range 2 and minimum range 2: it cannot target an
  adjacent unit and retaliates only against an attacker exactly 2 cells away.
  Its attack is a bomb ([section 18.8](#188-bomb-chucker-bombs)). It keeps
  capture, Pillage, Disband, and Fieldcraft Forest freedom and Sight.
- **Orc Brute** has Guard parity (cannot attack after moving, capture, Field
  Defense with Fortification) and is the only Goblin unit that builds Field
  Defense.
- **Orc Warboss** cannot capture; its primary actions are Attack and WAAAGH!
  (no Tend Wounded).
- **Rocket Cart** has Catapult parity: range 2–3, minimum range 2, cannot
  attack after moving (Kaboom is still allowed after a Move), no capture,
  never advances, Field Defense destruction on the primary target tile
  (reason `CATAPULT`), and no splash.
- **Scrap Buggy** has Knight parity: Move 3, no capture, and Overrun,
  labelled **Ram** for Goblins (same rule and events).
- **Troll** has Juggernaut parity (reward only, Push, capture, no Pillage or
  Disband) with Defense 3 instead of 4, and regenerates 4 HP at its owner's
  Start Turn.
- **Patrol Boat and Battleship** are the Human units (names, stats,
  hostile-only Battleship splash, and art). Goblin faction rules do not apply
  to them: no Gang Up, no Kaboom, no death blast.
- Goblin Disband refunds: Goblin 0, Wolf Rider, Bomb Chucker, and Orc Brute
  1, Orc Warboss 2, Rocket Cart 3, Scrap Buggy 4.
- **Public abilities** (the role rule's `abilities`): Goblin `ATTACK`,
  `CAPTURE`, `KABOOM`; Wolf Rider `ATTACK`, `CAPTURE`, `CHARGE`, `KABOOM`;
  Bomb Chucker `ATTACK`, `CAPTURE`, `KABOOM`; Orc Brute `ATTACK`, `CAPTURE`;
  Orc Warboss `ATTACK`, `RALLY`; Rocket Cart `ATTACK`, `KABOOM`; Scrap Buggy
  `ATTACK`, `OVERRUN`, `KABOOM`; Troll `ATTACK`, `CAPTURE`, `PUSH`,
  `REGENERATE`. Blast damages, the bomb's splash target mode, the WAAAGH!
  radius, the Field Defense restriction, and the regeneration amount are role
  mechanics, exposed to every viewer of a Goblin unit through the `goblin`
  block of its public unit stats (`kaboomDamage`, `deathBlastDamage`,
  `rallyRadius`, `regeneration`, `buildsFieldDefense`).

The Dinosaur (`DINOSAUR`) roster, by mechanical role, with the
`pulp-wars-poc-7r23` values (`DINOSAUR_ROLE_RULES_V7` and
`DINOSAUR_ROLE_MECHANICS_V7`). "Hatch" is an Egg's hatch time in owner
Start Turns without Nesting ([section 19.5](#195-hatching)); "Slots" is the
capacity the unit, or its Egg, uses
([section 19.2](#192-capacity-slots-and-nesting)):

| Unit         | Role          | Tech              | Cost | Hatch   | Slots |  HP |  Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Grows | Abilities                      |
| ------------ | ------------- | ----------------- | ---: | ------- | ----: | --: | ------: | ------: | ---: | ----: | ----: | ----------------- | ------- | ----- | ------------------------------ |
| Caveman      | `FIGHTER`     | start             |    2 | trained |     1 |  10 |   2 (4) |   2 (4) |    1 |     1 |     1 | yes               | yes     | no    | no Field Defense               |
| Raptor       | `RAIDER`      | Scouting          |    4 | 1       |     1 |  12 | 2.5 (5) |   1 (2) |    2 |     1 |     2 | yes               | yes     | yes   | Pounce (Raiding); no Escape    |
| Spitter      | `MARKSMAN`    | Marksmanship      |    4 | 1       |     1 |  10 |   2 (4) |   1 (2) |    1 |   1–2 |    1⁴ | yes               | yes     | yes   | Acid                           |
| Ankylosaurus | `GUARD`       | Drill             |    5 | 2       |     1 |  20 |   2 (4) |   3 (6) |    1 |     1 |     1 | no                | yes     | yes   | Armoured; no Field Defense     |
| Shaman       | `CAPTAIN`     | Administration    |    5 | trained |     1 |  10 |   1 (2) |   1 (2) |    1 |     1 |     1 | yes               | no      | no    | War Drums; Tend Wounded; Hatch |
| Triceratops  | `CATAPULT`    | Sawmilling        |    8 | 2       |     2 |  20 |   3 (6) |   2 (4) |    2 |     1 |     1 | yes               | no      | yes   | Charge!                        |
| T-Rex        | `KNIGHT`      | Chivalry          |   14 | 4       |     2 |  28 |   4 (8) |   2 (4) |    2 |     1 |     1 | yes               | no      | yes   | Rampage                        |
| Brontosaurus | `JUGGERNAUT`  | reward only       |    — | —       |     2 |  45 | 3.5 (7) |   4 (8) |    1 |     1 |     1 | yes               | yes     | yes   | Push                           |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 | trained |     1 |  10 |   2 (4) |   2 (4) |    2 |     1 |     2 | yes               | no      | no    | naval                          |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 | trained |     1 |  25 |  6 (12) |   4 (8) |    2 |   1–3 |     3 | no                | no      | no    | naval; splash                  |

⁴ Spitter Sight becomes 2 with Fieldcraft.

- **Caveman** has Fighter parity (capture, Pillage with Raiding, Disband,
  ordinary Promotion: 15 HP promoted) except that it cannot build Field
  Defense; it is trained on the city center with `TRAIN`.
- **Raptor** has Raider parity for Move 2, Sight 2 (Scouting), Charge with
  Raiding (labelled **Pounce**), Pillage, capture, and Fieldcraft Forest
  freedom; it has no Escape.
- **Spitter** has Marksman parity (range 1–2, minimum range 1, capture,
  Pillage, Disband, Fieldcraft Forest freedom and Sight) and Acid
  ([section 19.9](#199-acid-and-armoured)).
- **Ankylosaurus** has Guard parity for "cannot attack after moving" and
  capture, cannot build Field Defense, and is Armoured
  ([section 19.9](#199-acid-and-armoured)).
- **Shaman** has exact Captain parity (no capture; Attack, War Drums, and
  Tend Wounded, which cures Plague and Bitten) and adds Hatch
  ([section 19.6](#196-shaman-hatch)).
- **Triceratops** is a melee line-breaker: range 1, Move 2, it may attack
  after moving, it cannot capture, it advances after a melee kill (unlike
  the Catapult), and every attack it makes is a **Charge!**
  ([section 19.11](#1911-charge)). It keeps the `SIEGE` tactical label of
  the `CATAPULT` role, so War Drums never Inspires it, and its attacks
  destroy Field Defense with reason `CATAPULT`.
- **T-Rex** has Knight parity (no capture, Overrun, labelled **Rampage**)
  with Move 2 instead of 3. It is never a treasure unit.
- **Brontosaurus** has Juggernaut parity (reward only, Push, capture, no
  Pillage or Disband) with 45 HP and Attack 3.5, and uses 2 slots.
- **Patrol Boat and Battleship** are the Human units. Dinosaur faction rules
  do not apply to them: they are trained with `TRAIN_NAVAL`, use 1 slot, do
  not grow, and keep the ordinary Promotion.
- Dinosaur Disband refunds: Caveman 1; Raptor, Spitter, Ankylosaurus, and
  Shaman 2; Triceratops 4; T-Rex 7. An Egg refunds the same as the unit
  inside. With Arms Industry the T-Rex Egg costs 13.
- **Growth** ([section 19.8](#198-grow)): every dinosaur gains +4 maximum HP
  at Big (1 kill) and again at Alpha (3 kills), each with a full heal, and
  +1 Attack at Alpha:

  | Unit         | Stage 0 HP / Attack | Big HP / Attack | Alpha HP / Attack |
  | ------------ | ------------------- | --------------- | ----------------- |
  | Raptor       | 12 / 2.5            | 16 / 2.5        | 20 / 3.5          |
  | Spitter      | 10 / 2              | 14 / 2          | 18 / 3            |
  | Ankylosaurus | 20 / 2              | 24 / 2          | 28 / 3            |
  | Triceratops  | 20 / 3              | 24 / 3          | 28 / 4            |
  | T-Rex        | 28 / 4              | 32 / 4          | 36 / 5            |
  | Brontosaurus | 45 / 3.5            | 49 / 3.5        | 53 / 4.5          |

- **Public abilities** (the role rule's `abilities`): Caveman `ATTACK`,
  `CAPTURE`; Raptor `ATTACK`, `CAPTURE`, `CHARGE`, `GROW`; Spitter `ATTACK`,
  `CAPTURE`, `ACID`, `GROW`; Ankylosaurus `ATTACK`, `CAPTURE`, `ARMOURED`,
  `GROW`; Shaman `ATTACK`, `RALLY`, `TEND_WOUNDED`, `HATCH`; Triceratops
  `ATTACK`, `LINEBREAKER`, `GROW`; T-Rex `ATTACK`, `OVERRUN`, `GROW`;
  Brontosaurus `ATTACK`, `CAPTURE`, `PUSH`, `GROW`; boats `ATTACK`. Slots,
  hatch times, the run-up bonus, and the Armoured reduction are role
  mechanics (`capacitySlots`, `hatchTurns`, `runUpBonus2`,
  `armourReduction`), exposed through the `dinosaur` block of the public
  unit stats ([section 19.13](#1913-commands-events-errors-and-queries)).

The Martian (`MARTIAN`) roster, by mechanical role, with the
`pulp-wars-poc-7r25` values (`MARTIAN_ROLE_RULES_V7` and
`MARTIAN_ROLE_MECHANICS_V7`). "Shield" is the Shield maximum
([section 20.2](#202-shields)); "Slots" is the capacity the unit uses; "Mode"
is its movement mode ([section 20.6](#206-movement-stride-flying-and-crossing-water)):

| Unit             | Role          | Tech              | Cost | Slots |  HP | Shield |  Attack |  Defense | Move | Range | Sight | Mode   | Attack after Move | Capture | Abilities                                                    |
| ---------------- | ------------- | ----------------- | ---: | ----: | --: | -----: | ------: | -------: | ---: | ----: | ----: | ------ | ----------------- | ------- | ------------------------------------------------------------ |
| Grunt            | `FIGHTER`     | start             |    2 |     1 |  10 |      2 |   2 (4) |  1.5 (3) |    1 |     1 |     1 | ground | yes               | yes     | no Field Defense                                             |
| Saucer           | `RAIDER`      | Scouting          |    4 |     1 |   8 |      2 | 1.5 (3) |    1 (2) |    3 |     1 |     2 | fly    | yes               | no      | Beam Down; Strafe (Raiding); no Escape, Pillage, or advance  |
| Ray Gunner       | `MARKSMAN`    | Marksmanship      |    4 |     1 |   8 |      2 |   3 (6) |    1 (2) |    1 |   1–2 |    1⁵ | ground | yes               | yes     | heat ray                                                     |
| Shield Projector | `GUARD`       | Drill             |    4 |     1 |  12 |      3 | 1.5 (3) |  2.5 (5) |    1 |     1 |     1 | ground | no                | yes     | Force Field; no Field Defense                                |
| Brain            | `CAPTAIN`     | Administration    |    5 |     1 |   8 |      2 |   1 (2) |    1 (2) |    1 |     1 |     1 | ground | yes               | no      | Psychic Command; Mind Control; no Tend Wounded               |
| Tripod           | `CATAPULT`    | Sawmilling        |    9 |     1 |  12 |      2 |   4 (8) |    1 (2) |    2 |   1–2 |     1 | stride | yes               | no      | heat ray; Pierce; never advances                             |
| Mothership       | `KNIGHT`      | Chivalry          |   10 |     2 |  16 |      4 | 2.5 (5) |    2 (4) |    2 |     1 |     1 | fly    | yes               | no      | Tractor Beam; no Overrun, Pillage, or advance                |
| Colossus         | `JUGGERNAUT`  | reward only       |    — |     2 |  32 |      3 |   4 (8) | 2.5 (5)⁶ |    1 |   1–2 |     1 | stride | yes               | yes     | heat ray; Push                                               |
| Thrall           | `FIGHTER`     | Mind Control only |    — |     0 | ≤10 |      0 |   2 (4) |  1.5 (3) |    1 |     1 |     1 | ground | yes               | yes     | no Shield; no Promotion; no Disband; collapses without Brain |
| Patrol Boat      | `PATROL_BOAT` | Shorecraft        |    5 |     1 |  10 |      0 |   2 (4) |    2 (4) |    2 |     1 |     2 | —      | yes               | no      | naval                                                        |
| Battleship       | `BATTLESHIP`  | Naval Engineering |   16 |     1 |  25 |      0 |  6 (12) |    4 (8) |    2 |   1–3 |     3 | —      | no                | no      | naval; splash                                                |

⁵ Ray Gunner Sight becomes 2 with Fieldcraft.
⁶ [Martian tuning record](RULESET_7_MARTIANS.md#165-tuning-record)
(`pulp_wars-t6s.5`, `pulp-wars-poc-7r25`): Colossus Defense 2.5 (contract
value 3).

- **Grunt** has Fighter parity (capture, Pillage with Raiding, Disband,
  ordinary Promotion: 15 HP promoted) except its numbers, its Shield, and
  that it cannot build Field Defense; it is trained on the city center.
- **Saucer** flies. It has Raider parity for Sight 2 and for Charge with
  Raiding, labelled **Strafe** (+1 Attack at range 1 on its first attack
  after a Move of at least two tiles); it has no Escape, no capture, no
  Pillage, and never advances. Its primary actions are Attack and Beam Down
  ([section 20.7](#207-beam-down)).
- **Ray Gunner** has Marksman parity (range 1–2, minimum range 1, capture,
  Pillage, Disband, Fieldcraft Forest freedom and Sight, the advance after an
  adjacent kill) and a heat ray ([section 20.4](#204-heat-rays-and-cooling)).
- **Shield Projector** has Guard parity for "cannot attack after moving" and
  capture, cannot build Field Defense, and projects the Force Field
  ([section 20.3](#203-force-field-and-force-fields)).
- **Brain** has Captain parity for no capture and for Rally, labelled
  **Psychic Command**; it has no Tend Wounded. Its primary actions are
  Attack, Psychic Command, and Mind Control.
- **Tripod** is a walker with a heat ray and Pierce
  ([section 20.5](#205-pierce-and-the-disintegrator)). Unlike the Catapult it
  has range 1–2 with minimum range 1 and may attack after moving (at half
  power); like it, it cannot capture, never advances, keeps the `SIEGE`
  label, and every attack it makes destroys Field Defense on the target's
  tile (reason `CATAPULT`).
- **Mothership** flies. It has Knight parity for no capture only: no
  Overrun, Move 2, and it never advances. Its primary actions are Attack and
  Tractor Beam ([section 20.10](#2010-tractor-beam)). It is never a treasure
  unit.
- **Colossus** is a walker with a heat ray and Juggernaut parity otherwise:
  reward only, capture, Push on an adjacent surviving target (never at
  range 2), the advance after an adjacent kill, no Pillage, no Disband.
- **Thrall:** the Grunt's statline with a `thralls` entry
  ([section 20.9](#209-thralls)); its HP when created is the victim's.
- **Patrol Boat and Battleship** are the Human units. Martian faction rules
  do not apply to them: no Shield, one slot, the ordinary Promotion.
- Martian Disband refunds: Grunt 1; Saucer, Ray Gunner, Shield Projector,
  and Brain 2; Tripod 4; Mothership 5. The Colossus and a Thrall cannot
  Disband.
- **Public abilities** (the role rule's `abilities`): Grunt `ATTACK`,
  `CAPTURE`; Saucer `ATTACK`, `CHARGE`, `FLY`, `BEAM_DOWN`; Ray Gunner
  `ATTACK`, `CAPTURE`, `HEAT_RAY`; Shield Projector `ATTACK`, `CAPTURE`,
  `FORCE_FIELD`; Brain `ATTACK`, `RALLY`, `MIND_CONTROL`; Tripod `ATTACK`,
  `STRIDE`, `HEAT_RAY`, `PIERCE`; Mothership `ATTACK`, `FLY`,
  `TRACTOR_BEAM`; Colossus `ATTACK`, `CAPTURE`, `PUSH`, `STRIDE`,
  `HEAT_RAY`; boats `ATTACK`. The Shield maximum, the slots, the movement
  mode, and the advance are role mechanics (`shield`, `capacitySlots`,
  `movementMode`, `advancesAfterKill`), the first three exposed through the
  `martian` block of
  the public unit stats
  ([section 20.12](#2012-commands-events-errors-and-queries)).

The Ice Folk (`ICE_FOLK`) roster, by mechanical role, with the
`pulp-wars-poc-7r27` values (`ICE_FOLK_ROLE_RULES_V7` and
`ICE_FOLK_ROLE_MECHANICS_V7`). Every role uses one slot; "Mountain-born"
units cross Mountains without Engineering and without stopping
([section 21.8](#218-mountain-born-and-rockfall)):

| Unit         | Role          | Tech              | Cost |  HP |               Attack |  Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                                                               |
| ------------ | ------------- | ----------------- | ---: | --: | -------------------: | -------: | ---: | ----: | ----: | ----------------- | ------- | ----------------------------------------------------------------------- |
| Yeti         | `FIGHTER`     | start             |    2 |  9⁸ |                2 (4) | 1.5 (3)⁸ |    1 |    1⁹ |     1 | yes               | yes     | Mountain-born; Rockfall; no Field Defense                               |
| Sled         | `RAIDER`      | Scouting          |    3 |  10 |                2 (4) |    1 (2) |    2 |     1 |     2 | yes               | yes     | Bolas; Charge (Raiding); no Escape                                      |
| Snow Hunter  | `MARKSMAN`    | Marksmanship      |    3 |   8 |                2 (4) |    1 (2) |    1 |   1–2 |    1⁷ | yes               | yes     | Cold Blood                                                              |
| Mammoth      | `GUARD`       | Drill             |    6 |  20 |              2.5 (5) |    2 (4) |    1 |     1 |     1 | yes               | yes     | Sweep; Trample; no Field Defense                                        |
| Ice Witch    | `CAPTAIN`     | Administration    |    5 |  12 |                1 (2) |    1 (2) |    1 |     1 |     1 | yes               | no      | Blizzard; Cold Snap; no Rally; no Tend Wounded                          |
| Boulder Yeti | `CATAPULT`    | Sawmilling        |    8 |  12 | 2 (4); 3 (6) planted |  1.5 (3) |    2 |   1–2 |     1 | yes               | no      | Boulders (ignore fortification); Planted; Mountain-born; never advances |
| Sabretooth   | `KNIGHT`      | Chivalry          |    9 |  14 |                3 (6) |    1 (2) |    3 |     1 |     1 | yes               | no      | Prowl; no Glide; never on a foreign center; no Overrun                  |
| Frost Giant  | `JUGGERNAUT`  | reward only       |    — |  40 |                4 (8) |    4 (8) |    1 |     1 |     1 | yes               | yes     | Push; Cold Aura; Mountain-born                                          |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 |  10 |                2 (4) |    2 (4) |    2 |     1 |     2 | yes               | no      | naval                                                                   |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 |  25 |               6 (12) |    4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                                                           |

⁷ Snow Hunter Sight becomes 2 with Fieldcraft.
⁸ [Ice Folk tuning record](RULESET_7_ICE_FOLK.md#165-tuning-record)
(`pulp_wars-7g3.7`, `pulp-wars-poc-7r27`): Yeti 9 HP and Defense 1.5
(contract values 10 and 2); promoted 14.
⁹ A Yeti standing on a Mountain may also attack at distance 2, at Attack
1.5 (`attack2` 3): Rockfall
([section 21.8](#218-mountain-born-and-rockfall)).

- **Yeti** has Fighter parity (capture, Pillage with Raiding, Disband,
  ordinary Promotion, the advance after a melee kill) and the Fighter's
  cost, Attack, and Move, with 9 HP and Defense 1.5. It cannot build Field
  Defense. It is Mountain-born and has Rockfall.
- **Sled** (a dog sled and its driver) has Raider parity for Sight 2,
  capture, Pillage, the advance, Fieldcraft Forest freedom, and Charge with
  Raiding; it has no Escape. Its primary actions are Attack and Bolas
  ([section 21.9](#219-bolas-and-cold-blood)).
- **Snow Hunter** has Marksman parity (range 1–2, minimum range 1, capture,
  Pillage, Disband, Fieldcraft Forest freedom and Sight, the advance after
  an adjacent kill) and Cold Blood
  ([section 21.9](#219-bolas-and-cold-blood)).
- **Mammoth** has Guard parity for capture only: unlike the Guard it may
  attack after moving, and it cannot build Field Defense. Every attack it
  makes is a Sweep and a Trample ([section 21.10](#2110-sweep-and-trample)).
- **Ice Witch** has Captain parity for no capture and nothing else: no
  Rally and no Tend Wounded (`RALLY` and `TEND_WOUNDED` are never offered
  and are rejected with `UNIT_ROLE_INVALID`). She carries the Blizzard; her
  primary actions are Attack and Cold Snap
  ([section 21.6](#216-the-blizzard-and-cold-snap)).
- **Boulder Yeti** has range 1–2 with minimum range 1 and may attack after
  moving, unlike the Catapult; like it, it cannot capture, never advances,
  keeps the `SIEGE` label, and every attack it makes destroys Field Defense
  on the target's tile (reason `CATAPULT`). Its attacks ignore fortification,
  and it has +1 Attack on a turn in which it has not moved
  ([section 21.11](#2111-boulders-and-planted)). It is Mountain-born.
- **Sabretooth** has Knight parity for no capture and for the advance after
  a melee kill. It has no Overrun and no Charge; it Prowls, never Glides,
  and never ends on a settlement center it does not own
  ([section 21.12](#2112-prowl-and-the-cold-aura)).
- **Frost Giant** has Juggernaut parity (reward only, capture, Push on an
  adjacent surviving target, the advance, no Pillage, no Disband) and the
  Juggernaut's numbers, plus the Cold Aura
  ([section 21.12](#2112-prowl-and-the-cold-aura)). It is Mountain-born.
- **Patrol Boat and Battleship** are the Human units. Ice Folk faction rules
  do not apply to them: no Snow cover, no Glide, no Blizzard protection, no
  Shatter, one slot, the ordinary Promotion.
- Ice Folk Disband refunds: Yeti, Sled, and Snow Hunter 1; Ice Witch 2;
  Mammoth 3; Boulder Yeti and Sabretooth 4. The Frost Giant cannot Disband.
- **Public abilities** (the role rule's `abilities`): Yeti `ATTACK`,
  `CAPTURE`, `MOUNTAIN_BORN`, `ROCKFALL`; Sled `ATTACK`, `CAPTURE`, `CHARGE`,
  `BOLAS`; Snow Hunter `ATTACK`, `CAPTURE`, `COLD_BLOOD`; Mammoth `ATTACK`,
  `CAPTURE`, `SWEEP`, `TRAMPLE`; Ice Witch `ATTACK`, `BLIZZARD`,
  `COLD_SNAP`; Boulder Yeti `ATTACK`, `BOULDERS`, `MOUNTAIN_BORN`;
  Sabretooth `ATTACK`, `PROWL`; Frost Giant `ATTACK`, `CAPTURE`, `PUSH`,
  `COLD_AURA`, `MOUNTAIN_BORN`; boats `ATTACK`. Mountain-born, Glide, Prowl,
  the Sweep damage, Trample, ignoring fortification, the Planted bonus, the
  Rockfall Attack, Cold Blood, and the advance are role mechanics
  (`mountainBorn`, `glides`, `ignoresZocStops`, `sweepDamage`,
  `tramplesFieldDefense`, `ignoresFortification`, `plantedBonus2`,
  `rockfallAttack2`, `coldBloodBonus2`, `advancesAfterKill`), exposed
  through the `iceFolk` block of the public unit stats
  ([section 21.15](#2115-commands-events-errors-and-queries)).

The Dwarf (`DWARF`) roster, by mechanical role, with the
`pulp-wars-poc-7r31` values (`DWARF_ROLE_RULES_V7` and
`DWARF_ROLE_MECHANICS_V7`). Every role uses one slot; "Kind" marks the two
**constructs** and the **machines** Repair heals by 4
([section 22.1](#221-roles-constructs-machines-and-labels)):

| Unit             | Role          | Tech              | Cost |  HP |    Attack | Defense | Move | Range | Sight | Kind               | Attack after Move    | Capture | Abilities                                                        |
| ---------------- | ------------- | ----------------- | ---: | --: | --------: | ------: | ---: | ----: | ----: | ------------------ | -------------------- | ------- | ---------------------------------------------------------------- |
| Hammerer         | `FIGHTER`     | start             |    2 |  12 |     2 (4) |   2 (4) |    1 |     1 |     1 | living             | yes                  | yes     | rides the tunnel; Dig In; no Field Defense                       |
| Gyrocopter       | `RAIDER`      | Scouting          |    4 |   8 | 1.5 (3)¹¹ |   1 (2) |    3 |  bomb |     2 | living; machine    | the bomb is its Move | no      | flies; Bomb Run (5, Dive 6¹²), once per target per turn          |
| Clockwork Gunner | `MARKSMAN`    | Marksmanship      |    3 |  10 |   1.5 (3) |   1 (2) |    1 |   1–2 |   1¹⁰ | construct; machine | yes, one shot        | yes     | two shots if it has not moved; never moves after firing          |
| Steam Mole       | `GUARD`       | Drill             |    5 |  16 |     2 (4) | 2.5 (5) |    1 |     1 |     1 | living; machine    | yes                  | yes     | Tunnel 3 with a rider; Eruption 2 (3); Dig In; no Field Defense  |
| Engineer         | `CAPTAIN`     | Administration    |    5 |  10 |     1 (2) |   1 (2) |    1 |     1 |     1 | living             | yes                  | no      | Repair; Assemble; no Rally                                       |
| Steam Cannon     | `CATAPULT`    | Sawmilling        |    8 |  10 |   3.5 (7) | 0.5 (1) |    1 |   2–3 |     1 | living; machine    | no                   | no      | Knockback; with Blasting Charges ignores Walls and Field Defense |
| Steam Tank       | `KNIGHT`      | Chivalry          |    9 |  16 |     3 (6) |   2 (4) |    2 |     1 |     1 | living; machine    | yes                  | no      | Plated 4; no Overrun                                             |
| Brass Titan      | `JUGGERNAUT`  | reward only       |    — |  36 |     4 (8) |   3 (6) |    1 |     1 |     1 | construct; machine | yes                  | yes     | Push                                                             |
| Patrol Boat      | `PATROL_BOAT` | Shorecraft        |    5 |  10 |     2 (4) |   2 (4) |    2 |     1 |     2 | —                  | yes                  | no      | naval                                                            |
| Battleship       | `BATTLESHIP`  | Naval Engineering |   16 |  25 |    6 (12) |   4 (8) |    2 |   1–3 |     3 | —                  | no                   | no      | naval; splash                                                    |

¹⁰ Clockwork Gunner Sight becomes 2 with Fieldcraft.
¹¹ The Gyrocopter has no `ATTACK` ability: its Attack is used only when it
retaliates, at distance 1 ([section 22.5](#225-gyrocopters-and-the-bombing-run)).
¹² [Dwarf tuning record](RULESET_7_DWARVES.md#195-tuning-record)
(`pulp_wars-78i.7`, `pulp-wars-poc-7r31`): the bomb deals 5 and 6 with Dive
(`BOMB_DAMAGE_V7`, `DIVE_BOMB_DAMAGE_V7`; decided values 4 and 5).

- **Hammerer** has Fighter parity (cost, HP, Attack, Defense, Move; capture,
  Pillage with Raiding, Disband, ordinary Promotion, the advance after a
  melee kill). It cannot build Field Defense. It rides a Mole's tunnel
  ([section 22.4](#224-the-rider)) and digs in ([section 22.7](#227-dig-in)).
- **Gyrocopter** (a goggled dwarf under a rotor) flies like a Martian flyer
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)), with
  Sight 2 and no capture, Pillage, Escape, or advance. It has no `ATTACK`:
  `ATTACK` is never offered for it and is rejected with `UNIT_ROLE_INVALID`.
  Its one primary action is the bombing run
  ([section 22.5](#225-gyrocopters-and-the-bombing-run)).
- **Clockwork Gunner** is a construct with Marksman parity for range 1–2
  (minimum range 1), capture, Pillage, Disband, and Fieldcraft Forest
  freedom and Sight. It shoots twice on a turn on which it has not moved,
  once after moving, never moves after firing, and never advances after a
  kill ([section 22.6](#226-clockwork)).
- **Steam Mole** (a squat riveted tub on tracks with a drill nose) has Guard
  parity for capture only: unlike the Guard it may attack after moving and
  advances after a melee kill. It cannot build Field Defense. It may move
  underground with `TUNNEL` instead of a Move
  ([section 22.2](#222-the-tunnel-and-burrowed-units)), erupts when it
  surfaces, and digs in.
- **Engineer** has Captain parity for no capture and the Captain's body. It
  has no Rally (`RALLY` is never offered and is rejected with
  `UNIT_ROLE_INVALID`); its Tend Wounded is **Repair**, and it has
  **Assemble** ([section 22.8](#228-engineer-repair-and-assemble)).
- **Steam Cannon** has Catapult parity (range 2–3, minimum range 2, cannot
  attack after moving, no capture, never advances, Field Defense
  destruction on the target tile with reason `CATAPULT`) plus **Knockback**
  ([section 22.9](#229-steam-cannon-knockback)).
- **Steam Tank** has Knight parity for no capture and the advance after a
  melee kill, with 16 HP, Defense 2, and Move 2. It has no Overrun and is
  **Plated** ([section 22.10](#2210-steam-tank-plated-and-the-brass-titan)).
- **Brass Titan** has Juggernaut parity (reward only, capture, Push on an
  adjacent surviving target, the advance, no Pillage, no Disband) with
  36 HP, Attack 4, and Defense 3, and the construct rules.
- **Patrol Boat and Battleship** are the Human units (drawn in the Dwarf
  style). Dwarf faction rules do not apply to them: no Dig In, no Repair
  (it targets land-form units only), one slot, the ordinary Promotion.
- **No Dwarf unit builds Field Defense** (`buildsFieldDefense` false for
  every role, and the tree has no `BUILD_FIELD_DEFENSE` unlock).
- Dwarf Disband refunds: Hammerer and Clockwork Gunner 1; Gyrocopter, Steam
  Mole, and Engineer 2; Steam Cannon and Steam Tank 4. The Brass Titan and
  a burrowed unit cannot Disband.
- **Public abilities** (the role rule's `abilities`): Hammerer `ATTACK`,
  `CAPTURE`, `RIDES_TUNNEL`, `DIG_IN`; Gyrocopter `FLY`, `BOMB_RUN`;
  Clockwork Gunner `ATTACK`, `CAPTURE`, `CLOCKWORK`, `TWIN_SHOT`; Steam Mole
  `ATTACK`, `CAPTURE`, `TUNNEL`, `ERUPTION`, `DIG_IN`; Engineer `ATTACK`,
  `TEND_WOUNDED` (labelled Repair), `ASSEMBLE`; Steam Cannon `ATTACK`,
  `KNOCKBACK`; Steam Tank `ATTACK`, `PLATED`; Brass Titan `ATTACK`,
  `CAPTURE`, `PUSH`, `CLOCKWORK`; boats `ATTACK`. Constructs, Unflinching,
  machines, the Repair amount, Dig In, the tunnel range, the ride, the
  bombing run, the Gunner's shots, Knockback, Plated, and the advance are
  role mechanics (`construct`, `unflinchingAttack`, `repairsAsMachine`,
  `repairMachineHeal`, `digsIn`, `tunnelRange`, `ridesTunnel`, `bombs`,
  `unmovedShots`, `knockback`, `plated`, `advancesAfterKill`, with
  `movementMode` `FLY` for the Gyrocopter), exposed through the `dwarf`
  block of the public unit stats
  ([section 22.14](#2214-commands-events-errors-and-queries)).

General roster rules:

- An **embarked** land unit of any faction has Move 2 on water (landing
  uses one point, [section 14](#14-naval-rules)), Defense 1, Sight 1, no
  Attack, no retaliation, no ZOC, no Kaboom, no Charge!, no Martian
  ability (no Beam Down, Mind Control, Tractor Beam, Psychic Command, or
  Force Field), and no Ice Folk ability (no Bolas, Cold Snap, Blizzard,
  Cold Aura, Snow cover, or Glide); an embarked dinosaur keeps its slots and
  growth, an embarked Martian unit keeps its slots, its Cooling, and its
  Shield, which still absorbs damage and recharges, and an embarked unit
  cannot be Chilled, while a Chilled unit that embarks keeps a dormant
  entry that still counts down ([section 21.2](#212-chill)). It has no
  Dwarf ability either (no Tunnel, ride, Bomb Run, Assemble, Repair, Dig
  In, or eruption); a self-launched Gyrocopter is an ordinary embarked unit.
- Base Sight gains +1 while standing on a Mountain with Engineering.
- Minimum range limits only the chosen target: a Catapult, Lich, Rocket Cart,
  Steam Cannon, or Bomb Chucker cannot target an adjacent unit but may still
  fire at another target in range.
- Tactical-role labels (`LINE`, `SKIRMISHER`, and so on) are display metadata
  with no combat effect, except that Rally (Frenzy, War Drums, Psychic
  Command) skips the `SUPPORT` and `SIEGE` labels
  ([section 10](#10-recovery-and-support)). The registry requires every
  faction's role to carry the Human label of the same mechanical role, so
  the Triceratops, the Tripod, the Boulder Yeti, and the Steam Cannon are
  `SIEGE`, the Brain, the Ice Witch, and the Engineer `SUPPORT`, the
  Mammoth and the Steam Mole `DEFENDER`, and the Gyrocopter `SKIRMISHER`.

## 12. Movement and unit actions

### 12.1 Movement

- Movement is eight-way; Chebyshev distance defines adjacency, range, sight,
  and ZOC. A Move has `2 * Move` half-points; a step costs 1 when the tile
  being left is a usable Road node and 2 otherwise
  ([section 9.2](#92-road-movement)), or, for a land-form Ice Folk unit
  other than the Sabretooth, Snow (Glide, [section 21.5](#215-snow)).
- A Move ends on entering an unexplored cell, a Forest (unless a Road edge or
  Fieldcraft freedom for the `RAIDER` and `MARKSMAN` roles: Raider and
  Marksman, Ghoul and Banshee, Wolf Rider and Bomb Chucker, Raptor and
  Spitter, Saucer and Ray Gunner, Sled and Snow Hunter), a Mountain (unless
  a Road edge or a Mountain-born unit), a Snow tile for a land-form ground
  unit of any faction but the Ice Folk (**deep snow**, unless a Road edge or
  the same Fieldcraft freedom; `SNOW_STOPS_MOVE`), or a cell in hostile ZOC
  (never for a Sabretooth, which Prowls). A path that continues past such a
  stop is illegal. A Martian walker or flyer and a Dwarf Gyrocopter (a
  flyer) are never stopped by terrain, Snow included, and a flyer not by ZOC
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)). Snow is
  read once per `MOVE`, from the state before the command. Deep snow ends
  the Move of a Dwarf ground unit like any other faction's; it matters to
  the Move-2 Steam Tank, since the others have Move 1.
- Land units need Engineering to enter Mountain (Martian walkers and flyers,
  the Dwarf Gyrocopter, and Ice Folk Mountain-born units do not) and cannot
  enter water except by embarking (Martian machines and the Gyrocopter also
  cross water inside a Move and self-launch). Every "can this unit stand on
  this tile" test (`MOVE`, `DISEMBARK`, the advance, Push and the Charge!
  push, the Tractor Beam, Knockback, Beam Down, a tunnel or rider
  destination, an Assemble tile, treasure-unit placement, reward
  displacement, and their public twins) goes through the one shared terrain
  rule `canEnterTerrainV7` (terrain, movement mode, afloat, Engineering,
  Navigation, and Mountain-born, true only for a land-form Yeti, Boulder
  Yeti, or Frost Giant), and "does entering this tile end the Move" through
  `terrainStopsMoveV7`.
- **Rift.** `canEnterTerrainV7` admits a Rift for a land-form flyer only
  (the Martian Saucer and Mothership and the Dwarf Gyrocopter):
  a flyer enters, crosses, and ends a Move on it at the ordinary cost
  (never stopped, never a Road node); every other unit (foot units,
  walkers, afloat units, Eggs) neither enters nor paths through it, the
  rejection and interruption reason being the impassable-terrain reason
  `ENGINEERING_REQUIRED`; Mountain-born does not cover a Rift, and a Rift
  is never Snow. A Rift exerts no ZOC and blocks no sight or
  range. Push, the Charge! push, Knockback, the Tractor Beam, and treasure
  or reward placement put only a flyer on it; Beam Down, a tunnel or rider
  destination, and an Assemble tile never target it (a tunnel may pass
  under it, [section 22.2](#222-the-tunnel-and-burrowed-units)).
- **Occupancy and friendly pass-through** (revision 18). A unit never ends a
  Move on an occupied tile. A step that holds a visible unit of another
  player, allied or hostile, is illegal (`OCCUPIED`) anywhere in the path. An
  intermediate step that holds one of the mover's **own** units (land,
  embarked, or naval) is entered as if it were empty: same cost, same entry
  requirements, same sight reveal, and the same stop rules, so an own unit
  standing where the Move would have to stop (a roadless Forest or Mountain
  without the exceptions above, hostile ZOC, or an unexplored cell) cannot be
  passed, and own units never cancel hostile ZOC. A passed tile counts in the
  path length (Charge, the Charge! run-up, the embarked landing budget). An
  Egg occupies its tile like any unit: its owner's units pass through it
  and never stop on it, and every other unit is blocked by it. This holds
  on land, on
  water, and for embarked units, including a boat passing a dock that holds
  an own unit and a land unit passing its own garrisoned city center, and for
  the Raider's escape Move. It applies to `MOVE` only: Push, the advance,
  Overrun and Ram, reward-unit displacement, embarking (the dock must be
  empty), and `DISEMBARK` still need an empty cell, and passing a tile never
  captures, besieges, blockades, blocks training, takes treasure, destroys
  Field Defense, or raises or devours a Grave. Allied units are not own
  units: allies share no exploration, so only the mover's own units, which
  its owner always sees, can be passed. The one exception is a Martian
  flyer, which passes over a unit of any owner and still never ends on one
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)); no other
  player's unit passes a Martian unit. A Dwarf Gyrocopter is such a flyer
  too. An own unit standing on a Snow tile where a non-Ice-Folk mover would
  have to stop cannot be passed either.
- **Mounds** ([section 22.3](#223-the-mound-surfacing-and-the-eruption)). A
  burrowed Dwarf unit stands on no tile, but its mound reserves one: the one
  occupancy predicate `tileOccupiedV7` is true for a tile with a unit or a
  mound, and every placement rule asks it. No `MOVE` ends on a mound tile
  (`MOVEMENT_ILLEGAL` reason `MOUND`, never offered); a Move may pass over
  one, since nothing stands there. No advance, Push, Charge! push or
  follow, Knockback, Tractor Beam, Beam Down, landing, reward unit or
  displacement, treasure unit, rising, Raise Dead, Egg, hatching, Assemble,
  tunnel destination, or bombing-run landing ends on one.
- **The rider brake.** A Hammerer that surfaced this turn as a Mole's rider
  never ends a Move, or advances, on a settlement center its owner does not
  own (a neutral village, or a center of a city its owner does not own):
  `MOVEMENT_ILLEGAL` reason `SETTLEMENT_FORBIDDEN`, never offered
  ([section 22.4](#224-the-rider)).
- **Interrupted Moves.** A hidden occupant on the next step (`OCCUPIED`),
  impassable terrain that was unexplored before the command
  (`ENGINEERING_REQUIRED`), hostile ZOC first seen during the Move (`ZOC`),
  or, for a mover that deep snow stops, a Snow tile it could not know about
  (the Blizzard of an Ice Witch hidden before the command: `SNOW`, reported
  also when the step is a ZOC stop too), or a mound on a tile the mover had
  not explored, met on the last tile of the Move (`MOUND`, naming the
  mound tile), interrupts the Move, which is still accepted. The mover stands on the last
  tile it entered; if that tile holds an own unit, it ends on the last tile
  of the entered path that holds no unit, or on its starting tile if there
  is none. `UNIT_MOVED.path` is the entered path cut to that tile (omitted
  when the mover stays on its starting tile), `movedPathLength` is its
  length, `activation.moved` is true, and `UNIT_MOVE_INTERRUPTED.at` (the
  tile that could not be entered, or where the new ZOC was met) may be more
  than one cell from the final tile. Every tile revealed up to the
  interruption stays explored.
- Allied AI units cannot enter each other's territory.
- The public movement query offers exactly the legal destinations it can
  know: it expands through the viewer's own units, never returns an occupied
  tile, keeps the cheapest path to each destination, and every offered `MOVE`
  is accepted. When a viewer estimates the reach of a visible unit of another
  seat, that unit passes through the visible units of its own owner only (a
  flyer through every visible unit). It reads Snow from the view's public
  `snow` flags: for an Ice Folk mover hidden Snow can only make a step
  cheaper, so every offered `MOVE` is still accepted.
- **ZOC:** a hostile land unit projects ZOC onto adjacent land cells. A naval
  unit projects it onto adjacent water it could enter. A land unit projects
  onto adjacent water only against an afloat unit it could attack at range 1.
  Embarked units, Eggs, Martian flyers, the Dwarf Gyrocopter, and mounds
  project none, and a flyer ignores hostile ZOC; a Sabretooth projects it
  but is never stopped by it, and a Chilled unit projects it as usual. A
  tunnel ignores ZOC. Leaving ZOC is free.

### 12.2 Activation

- Each unit may Move once per turn, and cannot Move after a primary action
  (so a Clockwork Gunner that has fired cannot move). A Dwarf Steam Mole's
  `TUNNEL` is its Move made underground, and a Gyrocopter's `BOMB_RUN` is
  its Move and its primary action at once
  ([section 22](#22-dwarf-faction-rules)).
- Primary actions are Attack, Recover, Capture, and specials
  (Rally/Frenzy/WAAAGH!/War Drums/Psychic Command, Tend and Repair, Field
  Defense, Pillage, Raise Dead, Devour, Wail, Kaboom, Hatch, Beam Down, Mind
  Control, Tractor Beam, Bolas, Cold Snap, Bomb Run, Assemble). Guard,
  Zombie, Orc Brute, Ankylosaurus, Shield Projector, Catapult, Lich, Rocket
  Cart, Steam Cannon, and Battleship cannot attack after moving; the
  Triceratops (revision 20), the Tripod, the Mammoth, the Boulder Yeti, and
  the Steam Mole can. Every read of this role flag for a unit
  goes through the single rule `unitMayActAfterMoveV7`: the role's
  `mayUsePrimaryActionAfterMove`, and not sluggish.
- **Sluggish** ([section 21.3](#213-sluggish-move-or-act-not-both)): a
  sluggish unit of any faction that has moved this turn (an interrupted
  Move counts) cannot use a primary action (`UNIT_ALREADY_ACTED`), Kaboom
  and Pillage included, and a sluggish unit is never granted Escape. So on
  its sluggish turn it either moves or acts. Landing, Promote, Disband, and
  Wait are unaffected, and the advance, an Overrun continuation, a Push, and
  a Charge! follow are not Moves. A sluggish Gyrocopter cannot make a
  bombing run (`BOMB_RUN_NOT_LEGAL` reason `SLUGGISH`); a sluggish Steam Mole
  may tunnel and a sluggish Hammerer may ride (the tunnel is a Move); a
  sluggish Clockwork Gunner that has not moved fires twice, one that moved
  cannot fire; a sluggish Engineer that moved can neither Repair nor
  Assemble.
- **Burrowed units** have no activation on the board: every command naming
  one is rejected with `UNIT_ALREADY_HANDLED` and never offered
  ([section 22.2](#222-the-tunnel-and-burrowed-units)).
- **Eggs** have no activation of their own: an Egg carries an exhausted
  activation at all times and never needs handling. Every unit command
  naming an own Egg as `unitId` is rejected with `UNIT_IS_EGG { unitId }`
  and never offered, except `DISBAND` (Abandon Egg,
  [section 19.7](#197-egg-destruction-capture-and-abandon-egg)).
- `WAIT` only marks the unit handled (it also declines an available Escape).
- **Escape** (Human Raider, innate; the Ghoul, Wolf Rider, Raptor, Saucer,
  Sled, and Gyrocopter have none; never granted to a sluggish Raider):
  after an accepted
  Attack that the Raider survives, including after a melee kill with its
  ordinary advance, the Raider may make exactly one more ordinary `MOVE` this
  turn with a fresh full Move 2 budget, whether or not it moved before
  attacking. Terrain, Forest/Mountain stops, Road half-steps, ZOC, occupancy,
  fog reveal, treasure, and automatic embarkation apply as for any Move. After
  the escape Move the Raider is handled: no further Attack, Capture, Pillage,
  Recover, Disband, Fortify, or other primary action. The player may decline
  (Wait, End Turn, or simply select another unit). Escape is never granted after
  a non-Attack action and never grants or refreshes Charge or Inspired. The
  canonical activation flag `escapeAvailable` is hashed, saved, and replayed;
  the combat preview and `COMBAT_RESOLVED` event carry `escapeAvailable`, every
  observer of the visible Raider sees the activation flag, the owner's unit
  status reads "Escape: may move again", and the public command query offers the
  escape Moves.
- **Pillage** (Raiding): an own land-form unit other than a Juggernaut,
  Abomination, Troll, Brontosaurus, Colossus, Frost Giant, or Brass Titan,
  or a flyer (a Martian Saucer or Mothership, a Dwarf Gyrocopter; rejected
  with `PILLAGE_INVALID_TARGET` and never offered), standing on an
  improvement in hostile territory
  destroys it for +1
  Coin, re-exposing any resource it hid. It may follow a Move but no primary
  action and is terminal. Roads, Field Defense, terrain, resources, city
  centers, and Walls cannot be pillaged.

### 12.3 Field Defense

- `BUILD_FIELD_DEFENSE` (Fortification, 3 Coins) needs a unit whose role
  mechanics allow it (`buildsFieldDefense`: Fighter, Guard, Skeleton, Zombie,
  or Orc Brute; never the Goblin, and no Dinosaur, Martian, Ice Folk, or
  Dwarf unit) in land
  form that has neither moved nor acted this turn, standing on an explored
  land tile of its owner's territory without Field Defense. It uses the
  unit's whole turn. A Goblin, a Caveman, an Ankylosaurus, a Grunt, a
  Shield Projector, a Yeti, a Mammoth, a Hammerer, or a Steam Mole is never
  offered it and is rejected like any other role that cannot build it
  (`INVALID_TILE` with `action: "BUILD_FIELD_DEFENSE"`); the Dinosaur,
  Martian, Ice Folk, and Dwarf trees also have no Field Defense unlock
  (their Fortification is Nesting, Force Fields, Deep Winter, and Dig In).
  Field Defense that already stands in territory a Dinosaur, Martian, Ice
  Folk, or Dwarf seat captures fortifies its units as usual (never a
  Martian walker or flyer or a Gyrocopter, which is never fortified; an Ice
  Folk unit fortified there has no Snow cover; a dug-in Dwarf unit there
  gets one level from the two, never two,
  [section 22.7](#227-dig-in)).
- Every explosion destroys Field Defense on every tile of its blast area,
  whoever owns the tile (reason `EXPLOSION`,
  [section 18.6](#186-blast-resolution)), every Triceratops, Tripod, or
  Boulder Yeti attack destroys it on the target tile (reason `CATAPULT`,
  [sections 19.11](#1911-charge), [20.5](#205-pierce-and-the-disintegrator),
  and [21.11](#2111-boulders-and-planted)), and every Mammoth attack
  destroys it there too (reason `TRAMPLE`,
  [section 21.10](#2110-sweep-and-trample)). A Steam Cannon attack destroys
  it on the target tile (reason `CATAPULT`), a surfacing Steam Mole on its
  own tile and the eight around it, whoever owns them (reason `UNDERMINED`,
  [section 22.3](#223-the-mound-surfacing-and-the-eruption)), and an
  Assembled Gunner on its tile in territory hostile to its owner (reason
  `OCCUPATION`, [section 22.8](#228-engineer-repair-and-assemble)). A bomb
  destroys none.
- Field Defense is a tile layer, not an improvement: it coexists with Roads,
  resources, improvements, and cities, transfers with the tile, and cannot be
  stacked, pillaged, redeveloped, or removed voluntarily.

## 13. Combat and fortification

### 13.1 Legality

- The attacker needs the `ATTACK` ability (the Banshee and the Dwarf
  Gyrocopter have none; the Gyrocopter's `ATTACK` is rejected with
  `UNIT_ROLE_INVALID`). The target must be a visible, non-allied unit on the
  board within the attacker's minimum–maximum range; a burrowed unit is off
  the board and never a target. An unmoved Clockwork Gunner may attack
  twice in a turn ([section 22.6](#226-clockwork)). Embarked units and Eggs cannot attack. An Egg is a
  legal target like any unit. A land-form Yeti standing on a Mountain also
  reaches distance 2 (Rockfall, [section 21.8](#218-mountain-born-and-rockfall));
  its own retaliation range stays 1.
- Land units may attack afloat units from shore and naval units may attack
  coastal land units.

### 13.2 Damage

```text
attack  = base Attack (a half-power heat ray: half, rounded down;
                       a Rockfall: 1.5)
        + 1 (Charge/Pounce/Strafe) + 1 (Inspired/Frenzied/WAAAGH!/War Drums/Psychic Command)
        + Gang Up (0–2) + 1 (Alpha) + run-up (Charge!: 0–2)
        + 1 (Planted) + 0.5 (Cold Blood)
defense = base Defense + fortification level          (embarked or Egg: 1)
cover   = 1.5 on Forest or Mountain for land-form ground defenders
          (never a Martian walker or flyer), or on Snow for an Ice Folk
          defender with no fortification of its own, else 1

attackForce  = attack  * attacker.hp / attacker.maxHp   (a Dwarf construct: attack)
defenseForce = defense * defender.hp / defender.maxHp * cover
total        = attackForce + defenseForce

damageToDefender = roundHalfUp(attackForce  / total * attack  * 4.5)
damageToAttacker = roundHalfUp(defenseForce / total * defense * 4.5)
```

- Both results use pre-combat HP and are capped at current HP. A killed
  defender does not retaliate. A hit from distance 2 or more on an Ice Folk
  unit in a Blizzard of its own seat's Ice Witch is first halved, rounded up
  ([section 21.6](#216-the-blizzard-and-cold-snap)). An Ice Folk attack from
  distance 1 that leaves a Chilled non-`JUGGERNAUT` defender at 1 HP up to
  its owner's Shatter threshold kills it instead (**Shatter**, no
  retaliation, [section 21.4](#214-shatter)). An Armoured unit (the
  Ankylosaurus) takes
  `d − 1` (minimum 1) of every hit `d` of 2 or more, before the cap
  ([section 19.9](#199-acid-and-armoured)). A Plated unit (the Dwarf Steam
  Tank, in land form) then takes at most 4 of any one hit
  ([section 22.10](#2210-steam-tank-plated-and-the-brass-titan)). A Martian
  unit's Shield then
  absorbs the hit first, so its cap is Shield plus HP; `damageToDefender`
  and `damageToAttacker` are HP damage, and the absorbed parts are
  `defenderShieldDamage` and `attackerShieldDamage`
  ([section 20.2](#202-shields)).
- A surviving defender retaliates only if it has the `ATTACK` ability (or
  `BOMB_RUN`: a Dwarf Gyrocopter strikes back at distance 1 with Attack
  1.5) and an Attack above 0, is not embarked or an Egg, the attacker is
  within its own range, and the attacker is not `UNANSWERED` (a Vampire). The preview then
  reports `noRetaliationReason` `DEFENDER_DIED`, `UNANSWERED`, or
  `OUT_OF_RANGE` (the last also for an embarked defender, an Egg, or a
  defender without Attack).
- **Charge:** with Raiding, a Raider, Ghoul, Wolf Rider, Raptor (where it
  is labelled **Pounce**), or Saucer (**Strafe**) that moved at least two
  cells this turn gets +1 Attack on its first attack, at range 1.
- **Inspired** (Frenzied for Undead, WAAAGH! for Goblins, War Drums for
  Dinosaurs, Psychic Command for Martians): +1 Attack on the unit's first
  accepted attack after Rally, Frenzy, WAAAGH!, War Drums, or Psychic
  Command.
- **Heat ray** (a land-form Ray Gunner, Tripod, or Colossus,
  [section 20.4](#204-heat-rays-and-cooling)): full power only from a unit
  that has not moved this turn and is not Cooling, otherwise the role's
  Attack is halved (rounded down in half-units) before every bonus; a
  full-power ray leaves the unit Cooling. The preview carries `rayPower` and
  `coolingApplied`. A ray unit's retaliation is never a ray.
- **Alpha** (a dinosaur with 3 or more kills): +1 Attack on every attack it
  makes, included in `attack2` ([section 19.8](#198-grow)).
- **Charge!** (the Triceratops, [section 19.11](#1911-charge)): +1 Attack
  per tile moved this turn before its first attack, up to +2 (`runUp`), and
  the defender's fortification is ignored.
- **Gang Up** (Goblin attackers in land form,
  [section 18.2](#182-gang-up)): +1 Attack for each other unit the attacker's
  owner has on the eight cells around the target, at most +2. It never
  applies to retaliation. The combat preview and `COMBAT_RESOLVED` carry
  `gangUp` (0 for every non-Goblin, naval, or embarked attacker), and
  `attack2` includes it.
- **Rockfall, Planted, Cold Blood** (Ice Folk,
  [sections 21.8](#218-mountain-born-and-rockfall),
  [21.11](#2111-boulders-and-planted), and
  [21.9](#219-bolas-and-cold-blood)): a Yeti attacking from a Mountain at
  distance 2 uses Attack 1.5; an unmoved Boulder Yeti has +1 Attack; a Snow
  Hunter has +0.5 Attack against a Chilled defender, at any distance. The
  preview carries `rockfallApplied`, `plantedApplied`, and
  `coldBloodApplied`, and `attack2` includes them. None applies to
  retaliation.
- **Unflinching** (a Dwarf construct in land form,
  [section 22.6](#226-clockwork)): when a Clockwork Gunner or Brass Titan
  makes an `ATTACK`, its own force uses its maximum HP instead of its
  current HP; as a defender and when it retaliates it is an ordinary unit.
  The preview carries `unflinchingApplied` (true for every such attack, at
  full HP too).
- **Lifesteal** (Vampire): after the exchange, a surviving Vampire heals by
  the HP damage it dealt (as attacker or retaliating defender; never what a
  Shield absorbed), capped at its
  maximum HP: `hpAfter = min(maxHp, hp - damageTaken + damageDealt)`. The
  preview and `COMBAT_RESOLVED` carry `attackerHeal` and `defenderHeal`.

### 13.3 Fortification

For a land-form defender standing in its owner's territory:

```text
fortification level = 2 (own city center with Walls)
                    + max(1 if the tile has Field Defense, 1 if the unit is dug in)
```

Each level adds 1 flat Defense before cover. Naval, embarked, and foreign
units, Eggs, and Martian walkers and flyers and the Dwarf Gyrocopter on the
tile receive none. A Dwarf Hammerer or Steam Mole that is **dug in** has the
Field Defense level wherever it stands within 1 of an own city center,
whatever the tile's territory, and never a second one from Field Defense
([section 22.7](#227-dig-in)); the preview carries `dugIn`. There is no
other city-center defense bonus. Three Dinosaur attacks, a Martian heat ray
fired with the Disintegrator, every Boulder Yeti attack, and a Steam Cannon
shot fired with Blasting Charges remove levels (Dig In included) for the
whole exchange (the reduced Defense applies to the damage taken **and** to
the retaliation), without destroying Walls
([sections 19](#19-dinosaur-faction-rules),
[20.5](#205-pierce-and-the-disintegrator),
[21.11](#2111-boulders-and-planted), and
[22.9](#229-steam-cannon-knockback)):

| Attack                                                    | Fortification applied                     | Cover      | Preview fields                                   |
| --------------------------------------------------------- | ----------------------------------------- | ---------- | ------------------------------------------------ |
| Spitter (Acid)                                            | none                                      | none (× 1) | `acid: true`, `fortificationIgnored: 0`          |
| Triceratops (Charge!)                                     | none                                      | kept       | `fortificationIgnored`: the levels removed (0–3) |
| heat ray (full or half) whose owner has the Disintegrator | none                                      | kept       | `fortificationIgnored`: the levels removed (0–3) |
| Boulder Yeti (Boulders)                                   | none                                      | kept       | `fortificationIgnored`: the levels removed (0–3) |
| Steam Cannon whose owner has Blasting Charges             | none                                      | kept       | `fortificationIgnored`: the levels removed (0–3) |
| any other dinosaur whose owner has Wallbreaker            | Field Defense or Dig In only (Walls gone) | kept       | `fortificationIgnored`: 2 on a Walled center     |
| every other attack                                        | full                                      | kept       | `acid: false`, `fortificationIgnored: 0`         |

`fortificationLevel` in the combat preview is always the level actually
applied. An Ice Folk defender's Snow cover is read from its own
fortification, not from what the attack ignores: on its Walled center it
has no Snow cover even against a Boulder, a Charge!, Wallbreaker, or the
Disintegrator ([section 21.5](#215-snow)).

### 13.4 After combat

- **Advance:** a surviving adjacent land attacker (not a Catapult, Lich,
  Rocket Cart, Zombie, Tripod, Saucer, Mothership, Boulder Yeti, Clockwork
  Gunner, or Steam Cannon; the Triceratops, the Ray Gunner, the Colossus,
  and the Steam Mole do advance; role mechanic `advancesAfterKill`) that
  kills a land defender or an Egg moves into its cell if explored and
  enterable (Mountain needs Engineering unless the attacker strides or is
  Mountain-born), then reveals sight. It does not
  advance when the defender rises in place (an Infect or Bitten rising, a
  shattered Bitten unit too), a Sabretooth or a rider on its surfacing turn
  never advances onto a settlement center its owner does not own, and the
  attacker stands on any Grave the death left. A Hammerer's or a Steam
  Mole's advance sets its `moved` flag (Dig In,
  [section 22.7](#227-dig-in)); no other unit's advance does. Nothing advances onto a **Rift** (only a flyer
  stands there, and flyers never advance), so a kill there continues no
  Overrun and a Charge! does not follow a target pushed off a Rift.
- **Push:** a Juggernaut, Abomination, Troll, Brontosaurus, Colossus, Frost
  Giant, or Brass Titan pushes a surviving adjacent target one cell directly
  away (never at range 2) if the cell is on the board, explored by the
  attacker, empty (no unit, no mound), not a settlement, the same land/water
  kind as the target,
  enterable by the target's owner (a walker, flyer, or Mountain-born unit
  needs no Engineering for a Mountain), and not in territory allied to the
  target. It never pushes an Egg, and the pusher stays where it is. A pushed
  unit keeps its Chill and its `moved` flag (a Dwarf unit's Dig In is read
  on its new tile).
- **Knockback** (the Dwarf Steam Cannon,
  [section 22.9](#229-steam-cannon-knockback)): a target that survives a
  land-form Steam Cannon's attack is pushed one tile directly away from the
  Cannon under the Push conditions and the Tractor Beam's chest condition;
  a `JUGGERNAUT`-role unit, a two-slot unit, and an Egg are never knocked
  back. It is the Push step (the same place, `UNIT_PUSHED`, and the preview
  field `push`).
- **Charge! Push and follow** (the Triceratops): a surviving target is
  pushed under the same conditions, and the Triceratops, if it survived,
  follows into the vacated tile under the advance conditions
  ([section 19.11](#1911-charge)).
- **Escape:** a surviving Human Raider may make one more ordinary Move
  ([section 12.2](#122-activation)).
- **Overrun** (Human Knight; **Ram** for the Goblin Scrap Buggy; **Rampage**
  for the Dinosaur T-Rex; same rule and events; the Ice Folk Sabretooth has
  none): after the unit kills (an
  Egg counts) and advances, if a visible hostile unit is adjacent to its new
  cell it may Attack again, with no other action allowed. This repeats
  without a cap until a non-kill, death, or no target. The continuation is
  evaluated after growth and after any death-blast chain the attack set off
  ([section 18.7](#187-where-chains-run-and-event-order)).
- **Splash** (Battleship of any faction, the Undead Lich, and the Goblin Bomb
  Chucker): when the unit attacks (never when it retaliates), every other
  unit on the eight cells around the primary target, hidden or visible and of
  any faction or form, takes `max(1, ceil(primary damage / 2))` (capped at its
  HP), with no retaliation or modifiers. The primary damage is the whole hit
  on the primary target (Shield plus HP damage), and each victim's own Shield
  absorbs its share first ([section 20.2](#202-shields)). Battleship and Lich
  splash hits only
  units hostile to the attacker (splash target mode `HOSTILE`); the Bomb
  Chucker's bomb also hits own and allied units (mode `ALL`, friendly fire,
  [section 18.8](#188-bomb-chucker-bombs)). Splash kills of hostile units
  count for the attacker; splash kills of own or allied units do not.
- **Pierce** (the Martian Tripod): its ray also hits the unit directly
  behind the target in one of the eight directions, own or not, with the
  splash rules ([section 20.5](#205-pierce-and-the-disintegrator)).
- **Sweep** (the Ice Folk Mammoth): every hostile unit on the two flank
  tiles of its target takes a fixed 2, under the splash rules for kills and
  deaths but never a Shatter ([section 21.10](#2110-sweep-and-trample)).
- **Plague** (Lich): when a Lich attacks and survives the exchange, the
  primary target and every surviving living splash target that lost HP to
  the attack become plagued (a hit a Martian Shield absorbs completely
  plagues nobody; [section 17.8](#178-plague)).
- **Infect and Bite** (Zombie): a land-form unit a Zombie kills (by its attack
  or retaliation) rises as the Zombie's owner's Zombie; a living land-form
  unit that loses HP to its hit and is not killed becomes Bitten
  ([sections 17.6](#176-infect) and [17.7](#177-bitten)).
- **Field Defense destruction:** after an attack against a unit on a Field
  Defense tile, it is destroyed for the first applicable reason: a unit of
  the `CATAPULT` role (Catapult, Lich, Rocket Cart, Triceratops, Tripod,
  Boulder Yeti, or Steam Cannon) attacked
  (reason `CATAPULT`, whether or not either unit survives); a land-form
  Mammoth attacked (reason `TRAMPLE`, whether or not either unit survives;
  the Field Defense still counted for the exchange); a surviving Inspired
  (Frenzied, WAAAGH!) unit
  attacked at range 1; a surviving land attacker whose owner has Explosives
  attacked at range 1; or the attacker advanced into the cell. These attack reasons apply whoever owns the tile:
  neutral, the defender's, a third player's, or the attacker's own territory
  (for example, killing an enemy that stands on your own Field Defense and
  advancing onto it destroys that Field Defense). Separately, a land unit
  entering the empty tile by Move, disembarkation, or Beam Down destroys it
  only when the tile's territory belongs to a player hostile to the mover; a
  Martian flyer never does (it is not on the ground).
- Kills are counted for promotion, growth, and Slayer, including retaliation
  and hostile splash, Pierce, and Sweep kills, Shatters, Dwarf eruption
  kills (credited to the Mole) and bomb kills (credited to the Gyrocopter),
  kills whose victim rises, and destroyed Eggs (not friendly bomb-splash or
  Pierce kills, explosion kills,
  or the removals of Mind Control and a Thrall collapse). A dinosaur that reaches
  Big or Alpha grows at once, after the exchange's damage, Lifesteal, and
  kill credit and before the advance, Push, follow, and any chain
  ([section 19.8](#198-grow)).
- **Deaths.** A combat death leaves a Grave, an Infect rising, or a Bitten
  rising as [section 17](#17-undead-faction-rules) describes; a destroyed Egg
  leaves none of them, and neither does a death on a **Rift** (any cause:
  no Grave, no Infect or Bitten rising). A shattered unit (`UNIT_DIED`
  cause `SHATTER`) leaves no Grave and has no death blast; a shattered
  Bitten unit still rises. A Dwarf construct leaves no Grave on any death
  and never rises ([section 22.6](#226-clockwork)). A unit on a Rift is
  also immune to
  Mind Control. A Brain's death collapses its Thralls (`UNIT_DIED`
  cause `BRAIN_LOST`) right after the death events and before the advance,
  Push, and any chain ([section 20.9](#209-thralls)). An exploding
  Goblin unit (the defender, a splash victim, or the attacker) then explodes,
  after the attack's deaths, risings, advance, and Push
  ([section 18.7](#187-where-chains-run-and-event-order)). The exact
  resolution and event order of an attack are in
  [revision 13 §6.8](RULESET_7_REVISION_13_UNDEAD.md#68-combat-resolution-order)
  as extended by
  [revision 14 §10](RULESET_7_REVISION_14_BALANCE.md#10-combat-resolution-order),
  [revision 17 §6.7](RULESET_7_REVISION_17_GOBLINS.md#67-where-chains-run-and-event-order),
  and [section 19.11](#1911-charge) here (growth, Push, and follow); a
  Martian attack then spends the Shields the exchange absorbed and records
  the Cooling of a full-power ray; the Ice Folk steps are in
  [section 21.13](#2113-attack-resolution-order) and the Dwarf steps in
  [section 22.11](#2211-resolution-order).

## 14. Naval rules

- **Water movement:** only naval and embarked units stand on water. Shallow
  Water needs Shorecraft (via embarking or training), Deep Water needs
  Navigation. A Martian machine or a Dwarf Gyrocopter is the exception for
  entering: it crosses water inside a Move in land form and
  **self-launches** (embarks) where a Move (or, for the Gyrocopter, a
  bombing run) ends on water, with no Port and without Shorecraft
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)).
  Every step that leaves a water tile costs a full movement point. Patrol
  Boats, Battleships, and embarked units all have Move 2. A naval or embarked
  unit passes through its owner's boats and transports and cannot end on one
  ([section 12.1](#121-movement)); pass-through adds no landing cell, it only
  widens where a two-cell water Move can end.
- **Embarking:** a land unit embarks by ending a Move on an own active, empty
  Port or Shipyard (Shorecraft); a dock that holds any unit, own or not,
  cannot be embarked on (`OCCUPIED`). The embark step costs half when the
  tile left is a usable Road node ([section 9.2](#92-road-movement)). The
  unit keeps its identity, HP, kills, and home city and is exhausted for the
  turn.
- **Disembarking:** on a later turn an embarked unit may move through water,
  then `DISEMBARK` onto an adjacent (Chebyshev 1) empty land cell it can enter
  (Mountain needs Engineering unless the unit strides, flies, or is
  Mountain-born; no allied territory; no mound; a Martian flyer, a Dwarf
  Gyrocopter, or an Ice Folk Sabretooth never lands on a neutral village
  center or a center it does not own: `MOVEMENT_ILLEGAL` with reason
  `SETTLEMENT_FORBIDDEN`, never offered). Landing costs one of the
  unit's two movement points: `DISEMBARK` is legal only while
  `spent = moved ? movedPathLength : 0` is at most 1, and is otherwise rejected
  atomically with `MOVEMENT_ILLEGAL` and not offered. So from its start-of-turn
  cell an embarked unit lands either directly on an adjacent cell, or after a
  one-cell Move on a cell adjacent to that water cell; after a two-cell Move it
  cannot land that turn. ZOC does not block landing, and a Move interrupted
  after one cell may still land. Landing ends the unit's activation for every
  faction: for the rest of that turn the landed unit cannot Move, Attack,
  Kaboom, Recover, Capture, Pillage, Fortify, use any special action, Wait, or
  Disband (Promote, which never depends on the activation, stays available).
  The public command query offers none of these, and the engine rejects them
  atomically with the existing codes for a unit that already acted (Attack,
  Kaboom, Move, Recover, Disband: `UNIT_ALREADY_ACTED`; Wait:
  `UNIT_ALREADY_HANDLED`; Capture: `CAPTURE_NOT_ELIGIBLE`). It may capture
  from a later turn. The browser marks direct landing cells ("Land
  now") and cells reachable by one water step then landing ("Move 1, then
  land"), sending the Move and then `DISEMBARK` for the latter.
- **Port** (Shorecraft, 4 Coins): on owned Shallow Water with a land cell of
  the same city among its eight neighbours, and with no improvement, site, or
  Road. It may share its tile with Fish or Pearls, has no per-city limit, and
  gives +1 live population while active.
- **Shipyard** (Naval Engineering, 5 Coins, one per city): upgrades an active
  Port in place. It keeps all Port functions, gives +2 live population in
  total, and makes naval training 2 Coins cheaper (minimum 1): Patrol Boat 3,
  Battleship 14.
- **Active and blockaded docks:** a Port or Shipyard is active while its city's
  owner owns it and no hostile naval or embarked unit stands on it. A
  blockaded dock gives 0 population and cannot train, embark, harvest its
  resource, recover ships, or join sea trade until the blockader leaves.
- **Naval training:** `TRAIN_NAVAL` selects an active, empty dock assigned to
  the city and spends the city action, capacity, and Coins.
- Naval units cannot capture, embark, pillage, disband, push, or advance, and
  they receive no terrain cover or fortification.
- Reward units and treasure units are always land units.
- **Goblin boats** are the Human Patrol Boat and Battleship: no Gang Up, no
  Kaboom, and no death blast. Blasts hit naval and embarked units in the
  blast area like any unit (the embarked Defense 1 is irrelevant to fixed
  damage), and an exploding unit killed while embarked explodes on its water
  tile. A blast that kills a blockader lifts the blockade.
- **Dinosaur boats** are the Human Patrol Boat and Battleship too: trained
  with `TRAIN_NAVAL`, one slot each, no growth, ordinary Promotion. Dinosaur
  land units embark, sail, and land under the ordinary rules (a two-slot
  unit embarks like any other, keeping its slots and growth; landing ends
  the activation, so a landed Triceratops cannot Charge! that turn). An Egg
  is never on water or a dock, never embarks, and never blockades.
- **Martian boats** are the Human Patrol Boat and Battleship too: no Shield,
  one slot, ordinary Promotion. Martian foot units embark at an own active,
  empty Port or Shipyard with Shorecraft like Human units; machines also
  self-launch. Afloat, a Martian unit is an ordinary embarked unit (Move 2,
  Defense 1, Sight 1, no Attack, retaliation, ZOC, or ability) that keeps its
  Shield and Cooling; a walker afloat may enter Deep Water with Navigation.
  An embarked Martian unit on a hostile dock blockades it, a Thrall too.
- **Ice Folk boats** are the Human Patrol Boat and Battleship too: no Snow
  cover, Glide, Blizzard protection, or Shatter, one slot, ordinary
  Promotion. Ice Folk land units embark at an own active, empty Port or
  Shipyard with Shorecraft like Human units; afloat they have no Ice Folk
  rule (an embarked Ice Witch has no Blizzard or Cold Snap, an embarked
  Frost Giant no Cold Aura). No embarked or naval unit of any faction can be
  Chilled or shattered; a Chilled unit that embarks keeps a dormant entry
  that still counts down. Nothing freezes water: the overlay's floe is
  deferred ([Ice Folk overlay section 17.3](RULESET_7_ICE_FOLK.md#173-deferred-the-floe)).
  `THROW_BOLAS` and `COLD_SNAP` move no unit, so they are not on the
  blockade-event list below.
- **Dwarf boats** are the Human Patrol Boat and Battleship too (drawn in the
  Dwarf style): one slot, ordinary Promotion, no Dwarf rule. Dwarf foot
  units and machines other than the Gyrocopter embark at an own active,
  empty Port or Shipyard with Shorecraft like Human units; the Gyrocopter
  flies over Shallow Water (Deep Water with Navigation) and self-launches
  where a Move or a bombing run ends on water. Afloat, a Dwarf unit is an
  ordinary embarked unit (Move 2, no bomb, Tunnel, Repair, or Assemble,
  never dug in) and lands with `DISEMBARK`. A tunnel never passes under
  water; an eruption never hits a naval or embarked unit; a bomb may target
  one. `TUNNEL` and `ASSEMBLE` never touch water, so they are not on the
  blockade-event list below; `BOMB_RUN` is.
- **Blockade events.** `PORT_BLOCKADE_CHANGED` and `SEA_NETWORK_CHANGED` are
  recomputed after `ATTACK`, `BUILD_PORT`, `BUILD_ROAD`, `CAPTURE`,
  `DISEMBARK`, `MOVE`, `REDEVELOP`, `WAIL`, `KABOOM`, `MIND_CONTROL`,
  `TRACTOR_BEAM`, `BOMB_RUN`, `END_TURN`, `LAND_GRANT`, research of Roads,
  Shorecraft, or Navigation, and `DISBAND` while the state has a Thrall (a
  disbanded Brain's embarked Thrall may have been a blockader). `KABOOM` and
  `END_TURN` joined the list in revision 17, the three Martian entries
  with the Martian overlay, and `BOMB_RUN` with the Dwarf overlay (a bomb
  can kill an embarked blockader, and a self-launch can start a blockade); with `END_TURN`, a blockade lifted by a
  death at the next seat's Start Turn (Plague or a Plague-started chain) is
  reported in that command instead of silently. The events are emitted only
  when a dock or network changed.

## 15. Fog and observation

- Each player's explored set only grows: from unit and city sight, Survey,
  Land Grant, and capture. There is no live re-fog.
- A unit is visible to another player exactly when it stands on a cell that
  player has explored. Allies do not share exploration.
- Unexplored cells expose only their coordinates. Ore stays hidden without
  Drill and Fertile Ground stays hidden without Gathering; Fruit, Game, Fish,
  and Pearls are visible on every explored tile.
- Graves are shown on every explored tile (the treasure-chest rule); Plague
  (with remaining turns) and Bitten (with the biter player) are public on
  every visible unit, but a Plague's source Lich is named only when the viewer
  can see it. Faction and tree of every player are public.
- Owner-private facts (city action flags, trade graphs, research, Coins, and
  achievement progress) are never shown to opponents.
- The browser UI and Normal AI read only the player's public view, public
  command queries, and public previews. Viewer-projected events never reveal
  hidden units, sources, or HP.
- **Explosions** reveal no tiles (risings reveal their sight as usual).
  `EXPLOSION_RESOLVED` follows the Wail rule: it is projected to a viewer
  that can see the exploding unit before or after the command, with
  `results` filtered to units the viewer owns or could see before the
  command; a viewer that cannot see the exploder but owns a victim receives
  `COMBAT_SPLASH_DAMAGE` with its own entries. `PLUNDER_AWARDED` is
  owner-only and names no victims; `UNITS_REGENERATED` is projected like
  `WINDMILL_HEALING_RESOLVED`. Explosion previews are computed from the
  viewer's visible units and flag `touchesUnexplored`
  ([section 18.12](#1812-commands-events-errors-and-queries)).
- **Eggs and growth** are public: an Egg is visible exactly when its tile is
  explored, like any unit, and its role, HP, and countdown (`turnsRemaining`)
  are public on a visible Egg (`PlayerViewV7.eggs`); a dinosaur's growth
  stage follows from its public `kills` and `maxHp`. `EGG_LAID` and
  `EGG_HATCHED` are projected to the owner and to every viewer that has
  explored the Egg's tile, with `EGG_LAID.cost` hidden from other viewers;
  `UNIT_GREW` is projected like `UNIT_PROMOTED`. Laying reveals nothing; a
  hatched unit reveals its sight. A city's capacity and used slots stay
  owner-private; each unit's own slot value is public in its unit stats.
- **Martian statuses** are public on a visible unit: its Shield and Shield
  maximum (`PlayerViewV7.shields`), Cooling (`cooling`), Thrall status
  (`thralls`, naming the Brain only when the viewer sees it), and a Brain's
  Mind Control cooldown (`mindControlCooldowns`) and Thrall count.
  `SHIELDS_RECHARGED` is projected like `WINDMILL_HEALING_RESOLVED`, with
  the entries of units the viewer can see; `UNIT_BEAMED`,
  `UNIT_MIND_CONTROLLED`, and `UNIT_PULLED` go to the actor and to every
  viewer that can see a unit or tile involved before or after the command.
  Beam Down, Mind Control, and Tractor Beam previews are exact (every tile
  and unit they read is visible to the actor); Pierce follows the splash
  rule (hidden units are hit, previews list visible ones). A Martian flyer
  meets a hidden unit only on the last tile of its Move, which is then
  interrupted like any Move.
- **Ice Folk statuses and Snow.** A visible unit's Chill entry
  (`PlayerViewV7.chilled`, both fields) is public, like Plague and Bitten,
  and so is a visible Ice Folk unit's Shatter threshold (3 or 4, in its
  unit stats, which tells an opponent whether the seat has Brittle).
  Territory and Deep Winter Snow are public on every explored tile (Deep
  Winter Snow tells that the seat has researched it); a Blizzard is known
  exactly when the viewer can see its Ice Witch (her tile is explored, or
  she is the viewer's own). Each explored tile of the view carries `snow`
  (territory or Deep Winter Snow, or the Snow of a Blizzard the viewer
  knows of) and `blizzard` (within 1 of such a Witch, water tiles included,
  for drawing); unexplored tiles carry neither. `UNITS_CHILLED` is projected
  with the results of units the viewer owns or can see before or after the
  command, and with `sourceUnitId` null when the viewer cannot see the
  source and is not its owner; with no result left it is dropped. A
  shattered unit's death is projected like any `UNIT_DIED`. Bolas, Cold
  Snap, and Sweep previews are exact; a combat preview whose defender is a
  land-form Ice Folk unit with an unexplored tile within 1 sets
  `hiddenBlizzardPossible`, because a hidden Witch could change its cover
  and halve a ranged hit. No event reveals a hidden Witch; a Move that
  meets her Blizzard is interrupted (`SNOW`) and reveals her only through
  the mover's own sight.
- **Dwarf mounds and per-turn lists.** A mound is public on every explored
  tile, like a unit there: `PlayerViewV7.burrowed` lists each burrowed
  record whose mound tile the viewer has explored (the ordinary public unit
  fields: owner, role, HP, maximum HP, kills, statuses, and `moleUnitId`),
  so the tile and turn of every eruption are known in advance. The
  `surfacedThisTurn` and `bombedThisTurn` entries of visible units are
  public, and so are a visible Dwarf unit's `eruptionDamage` and
  `bombDamage` (they tell an opponent whether the seat has Blasting Charges
  and Dive) and whether it is dug in. `UNIT_TUNNELLED` reaches the actor and
  every viewer that has explored one of its four tiles (`from`, `to`,
  `riderFrom`, `riderTo`), with the tiles that viewer has not explored
  null. `UNIT_SURFACED` reaches the owner in full, a viewer that has
  explored the Mole's tile with the results of units it owns or can see
  (the rider null unless its tile is explored too), and a viewer that owns
  a victim but has not explored the Mole's tile with its own entries only
  and the Mole, its tile, and the rider null. `UNIT_BOMBED` reaches the
  actor and every viewer that sees both the Gyrocopter and the target
  before or after the command; the target's owner who does not receives
  the hit as a `COMBAT_SPLASH_DAMAGE` entry. `UNIT_ASSEMBLED` is
  owner-private like `UNIT_TRAINED` (the Gunner is revealed to other
  viewers as an ordinary unit). A Move that meets a mound on a tile the
  mover had not explored is interrupted (`MOUND`). Every Dwarf preview is
  exact except the tunnel preview's eruption, a forecast on the current
  board (`projected: true`), and a Knockback onto a Mountain or Deep Water
  behind another player's unit (`UNKNOWN_BEHIND_FOG`,
  [section 22.9](#229-steam-cannon-knockback)); see
  [section 22.14](#2214-commands-events-errors-and-queries).
- Exact projection rules are in
  [baseline §9](RULESET_7.md#9-observation-safe-views-events-queries-and-artifacts)
  and the relevant overlay sections.

## 16. Normal AI summary

- Normal is deterministic and PRNG-free and uses only the public view, public
  commands, and public previews, never hidden state.
- It ranks work as: save threatened cities; take or set up captures; make
  favorable attacks and protect formations; use support, recovery, economy, and
  movement toward objectives; end the turn.
- It avoids attacks predicted to lose the unit without a city-saving or
  capture-enabling reason, keeps a sole city defender unless replaced, and
  spreads units across objectives.
- **Campaign** (`pulp_wars-9s0.1`): every land unit has one job and walks
  the land route to it: the nearest unclaimed village, an invader next to an
  own city, the unexplored frontier (two scouts and the group behind the
  first while no enemy city is known, one scout afterwards), or the nearest
  known enemy city. A known enemy city stays a target for as long as it is
  hostile, whatever was lost there; with several hostile seats in reach each
  gets at least a pair of units. Units set out from home in waves of three
  (fewer when the cities cannot hold that many; at once next door or while a
  wave is out), and while an enemy city is known and fewer than two thirds
  of the unit slots are filled, land production comes before the economy.
  Details and measurements:
  [Normal AI campaign](../architecture/NORMAL_AI.md#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01).
- **Second pass** (`pulp_wars-9s0.8`): at war, with no own city threatened
  and at least three attack-capable land units, Normal saves for its
  Chivalry-tier unit (fewer than two of them) or for Chivalry itself when the
  goal is at most two turns of income away, buys it before the economy, and
  meanwhile holds other training and any spending that would cut into the
  goal; a Dinosaur seat at war lays Spitters until it has two. Units move in
  for a kill this turn on a visible Witch, Brain, Necromancer, or Projector,
  and on the defender of a city center under attack while a capturer can
  take the city; the Tractor Beam also pulls a unit into the army's reach
  or away from an own city, and a Mammoth steps where its Sweep hits a
  flank. Details and measurements:
  [Normal AI second pass](../architecture/NORMAL_AI.md#second-pass-savings-hunts-and-sieges-pulp_wars-9s08).
- **Opening research:** on its first turn Normal researches its free tier-1
  technology before other work, chosen deterministically from its own public
  view of explored tiles within Chebyshev 2 of its original capital: Gathering
  scores 4 per Fruit plus one per three open Grass; Hunting 4 per Game plus one
  per three Forest; Drill 2 per Mountain plus 3 per visible hostile unit within
  4 and 2 per visible hostile city within 5; Shorecraft (only when offered and
  the capital's territory has Shallow Water) 4 per Fish plus one per two
  Shallow Water; Scouting `max(0, 10 - 2 * (Fruit + Game + counted Fish))`.
  The highest score wins; ties follow technology order
  (`src/ai/v7-opening.ts`). Every faction uses the same opener.
- **Growth first** (revision 16): before those scores, if offered tier-1
  technologies among Gathering, Hunting, and Shorecraft unlock at least two
  visible growth resources of their kind on explored tiles of the original
  capital's own territory, the free opener is the one with the most such
  resources (ties by technology order). While the original capital is level 1
  and a harvest of a growth resource in its territory is legal and affordable,
  that harvest outranks research, training, and construction. In the
  revision-16 test matrix every Normal capital reaches level 2 on its owner's
  first turn; the test pins the second-turn requirement.
- **Transports** plan with Move 2 and land only through offered `DISEMBARK`
  commands; an embarked Move of one cell that ends next to a planned landing
  cell is preferred, so a transport one cell from the coast moves and lands
  the same turn.
- **Undead play.** In a match with an Undead seat (and only there, so
  decisions elsewhere are unchanged), Normal plays as and against the Undead
  from public information: Raise Dead on Graves whose Skeletons would survive,
  Necromancers approaching Graves, Frenzy, Devour to heal or deny a Grave,
  Wail and Lich targets by exact previewed damage, kills, Graves, and Plague,
  Lifesteal and Infect/Bitten valuation, Restless units returning home to
  recover, Liches and Vampires kept out of visible lethal reach and off
  transports, Vampires attacking only when they survive, and against the
  Undead: avoiding infecting retaliation and costly bites, prioritizing
  Necromancers and plaguing Liches, Tend Wounded cures, spread discipline
  around spreading Plague, and Wail and splash in threat evaluation. Details
  and priorities:
  [Normal AI revision 13](../architecture/NORMAL_AI.md#revision-13-undead-play-pulp_wars-vkq9),
  [14](../architecture/NORMAL_AI.md#revision-14-plague-bitten-and-vampire-play-pulp_wars-vkq18),
  [15](../architecture/NORMAL_AI.md#revision-15-plague-duration-pulp_wars-vkq20),
  and
  [Lich safety](../architecture/NORMAL_AI.md#lich-safety-vampire-survival-and-lich-hunts-pulp_wars-vkq21).
- **Goblin play** (revision 17, `pulp_wars-0ao.6`, `0ao.7`, `0ao.13`). Every
  Goblin heuristic is gated on a match with a Goblin seat
  (`src/ai/v7-goblin.ts`), so Human and Undead decisions and pinned hashes in
  matches without one are unchanged. As Goblins, Normal scores Kaboom from
  the exact `previewKaboomV7` chain (hostile damage and kills plus Plunder,
  minus own and allied losses at a friendly-fire factor of 2 and the
  exploder's own value) and takes only net-positive Kabooms; moves helpers
  next to targets for Gang Up and ranks targets by Gang Up; values bomb and
  death-blast friendly fire as a cost and throws a bomb that would kill an
  own or allied unit only when it kills the target and kills more hostile
  than own and allied units (unless it saves a city or is the endgame
  combined kill), ranks a friend-splashing bomb below a clean one, moves a
  Bomb Chucker to a clean throw, and keeps other own units from ending a
  routine Move where an own bomb thrown now would kill them; keeps its exploding units away from own units
  while any visible enemy can damage them; trains a cheap Goblin horde into
  Warrens capacity plus Bomb Chuckers; researches Plunder when hostile units
  are near; uses WAAAGH! like Rally; and lets Trolls keep fighting. Against
  Goblins, threat evaluation includes Gang Up, Bomb Chucker splash, and the
  Kaboom reach of visible goblin-crewed land units (an embarked one cannot
  land and Kaboom in the same turn), units avoid ending in a clump a visible
  goblin-crewed land unit could Kaboom at a profit, and a kill of an
  exploding unit is valued with `previewAttackExplosionsV7`. Details:
  [Normal AI revision 17](../architecture/NORMAL_AI.md#revision-17-goblin-play-pulp_wars-0ao6)
  and the [Goblin balance report](../validation/RULESET_7_GOBLIN_BALANCE.md).
- **Dinosaur play** (revisions 19 and 20, `pulp_wars-c87.5`, `c87.8`,
  `0hi.2`). Every Dinosaur heuristic is gated on a match with a Dinosaur seat
  or on a fact only a Dinosaur-faction unit has (an Egg, `GROW`,
  `LINEBREAKER`, `ACID`, an armour reduction, a slot value above 1;
  `src/ai/v7-dinosaur.ts`), so it never runs elsewhere. Shared estimates
  apply Acid, Armoured, and the Alpha bonus, value grown units and visible
  Eggs, and give a visible hostile Triceratops its move-then-melee reach with
  the run-up, no Walls or Field Defense on its target, and (because research
  is private) Wallbreaker for every hostile dinosaur. As Dinosaurs, Normal
  lays Eggs as land production valued per slot and per Coin with the hatch
  delay as a cost (never on a nest tile the visible enemies can destroy
  before it hatches), picks the safest offered nest tile, guards and hatches
  threatened or long Eggs with an adjacent attacker and the Shaman, abandons
  an Egg only to free a threatened city's slot, values a kill by the HP its
  growth restores, retreats grown units earlier, plays the Triceratops as a
  front-line attacker (a run-up Move before its Charge!, extra value for
  Field Defense destroyed and for pushing a defender off a hostile center
  next to an own capturer), researches toward the Triceratops or the T-Rex
  once it owns two cities, researches Nesting for its slot and Wallbreaker
  against visible Walled cities, and uses War Drums, Tend Wounded, Rampage,
  and Pounce like Rally, Tend, Overrun, and Charge. Against Dinosaurs, Normal
  smashes reachable Eggs (valued by the unit inside and its remaining
  turns), avoids feeding a kill to a dinosaur one kill from Big or Alpha,
  prefers killing grown units, and skips a hit of at most 1 on an Armoured
  unit. Details:
  [Normal AI revision 19](../architecture/NORMAL_AI.md#revision-19-dinosaur-play-pulp_wars-c875).
- **Martian play** (`pulp_wars-t6s.3`). Every Martian heuristic is gated on
  a match with a Martian seat or on a fact only a Martian unit has (a Shield,
  a heat ray, a walker's or flyer's movement, the Force Field, Beam Down,
  Mind Control, a Thrall, the Tractor Beam; `src/ai/v7-martian.ts`), so
  matches without one are byte-identical. Shared estimates reduce the
  projected damage to a unit by the Shield it will have in the enemy turn,
  give a visible hostile ray unit full power only where it need not move and
  is not Cooling, and give walkers and flyers their own reach (no terrain
  stop; a flyer passes every unit and ignores ZOC) and no cover. As
  Martians, Normal values a role by its HP plus twice its Shield, trains
  Grunts first in a threatened city, researches Drill and Scouting first,
  then (with two cities) Marksmanship and Administration, Force Fields once
  it owns a Projector, the Tripod's and the Mothership's technologies, and
  the Disintegrator against visible fortified units; fires rays at full power
  from where the unit stands (a ready ray unit holds its tile) and steps a
  Cooling ray unit out of melee reach; ends Moves next to its Projectors;
  refuses a Pierce that kills an own unit without killing the target; beams
  passengers down when that gains at least three route steps and keeps a
  Saucer unmoved for it; takes Mind Control above every kill on the most
  valuable convertible target; uses Thralls as the front row; scores a
  Tractor Beam by its effect (a defender pulled off a center next to an own
  capturer, a besieger off an own center, a target pulled into own reach, a
  fortified unit off its fortification, an own unit out of lethal reach);
  and never ends a routine machine Move on water while it has a land route.
  Against Martians, Normal focus-fires a shielded unit that this turn's
  attacks can kill through its Shield (ranged hits first), values hits on
  Cooling ray units, keeps units at 6 HP or less out of a ready visible
  Brain's reach, keeps a second unit by a city center in a visible
  Mothership's reach, and (Goblin seats) values the Shield a Kaboom strips.
  Details and measurements:
  [Normal AI Martian play](../architecture/NORMAL_AI.md#martian-play-pulp_wars-t6s3).
- **Ice Folk play** (`pulp_wars-7g3.4`). Every Ice Folk heuristic is gated
  on a match with an Ice Folk seat or on a fact only such a match has (a
  Chill entry, a Snow or Blizzard tile flag, an Ice Folk ability;
  `src/ai/v7-ice-folk.ts`), so matches without one are byte-identical.
  Shared estimates give a visible Ice Folk unit Glide on known Snow (never
  the Sabretooth), Mountain paths, and Prowl, stop another faction's ground
  unit on known Snow, give a Yeti on a Mountain its published range 2, read
  Snow cover and the Blizzard's halving from the public flags, count Shatter
  in every lethal-reach estimate (a unit left at a visible Ice Folk melee
  unit's public threshold is in lethal reach when it is, or can be,
  Chilled by then), and judge the Mammoth and the Boulder Yeti as line units
  and the Witch as no healer. As the Ice Folk, Normal trains a first unit of
  each role and bodies first in a threatened city, researches Drill and
  Scouting, then (with two cities) Administration and Marksmanship, Deep
  Winter and Brittle, then Sawmilling and Chivalry (the free opener keeps
  the ordinary scorer); moves the Ice Witch first to the densest own group
  out of melee and casts Cold Snap whenever it is offered; throws the Bolas
  at the unit an offered attack would then shatter (else at the most
  dangerous unchilled unit, never at one already Chilled or under a Cold
  Snap); orders its attacks so that a hit that leaves a Chilled unit in the
  Shatter window comes before the finishing blow; values Sweep flanks and
  Trample, the planted throw, and the Sabretooth's backline kills; and
  prefers to end Moves next to its Witch, then on Snow. Against the Ice
  Folk, Normal kills a Witch first (combining hits that reach her HP), holds
  a sluggish unit that has a target and keeps it out of Ice Folk melee
  reach otherwise, steps a unit out of a Shatter-only lethal reach, avoids
  attacks whose retaliation leaves the attacker in the window, keeps
  fragile units off hostile Snow, and stays out of four tiles of a visible
  Witch without route progress. The overlay's Goblin Kaboom rule is not
  implemented. Details and measurements:
  [Normal AI Ice Folk play](../architecture/NORMAL_AI.md#ice-folk-play-pulp_wars-7g34).
- **Dwarf play** (`pulp_wars-78i.4`). Every Dwarf heuristic is gated on a
  match with a Dwarf seat or on a fact only such a match has (a mound in
  `view.burrowed`, a `dwarf` stat block, a `bombedThisTurn` entry;
  `src/ai/v7-dwarf.ts`), so matches without one are byte-identical. Shared
  estimates count each hostile mound's eruption on the eight tiles around
  it and its surfacing reach (the tiles within 2), one bomb of a visible,
  non-sluggish Gyrocopter on every unit within 2 of it (once per unit,
  whatever the number of Gyrocopters), the Steam Tank's Plated cap, a
  construct's Unflinching attack, and Dig In from the public `dugIn` (never
  after a planned Move). As the Dwarves, Normal plans one `TUNNEL` per Mole
  (defence: it walks to an invader within 2 and tunnels toward one 3 or 4
  tiles away; offence: on a Pressure job with a route of 4 or more steps or
  one blocked by terrain, to the destination with the best eruption score
  plus route progress, never next to three or more hostile melee units
  unless next to the target's center), takes an adjacent fresh Hammerer
  along on the rider tile next to the most hostile units, and never tunnels
  off an own center it garrisons alone; it never tunnels for expansion
  (the optional rule lost its head-to-head test and is off). It scores each
  offered bombing run by the damage, a kill bonus, and a `CATAPULT`,
  `MARKSMAN`, or `CAPTAIN` bonus minus half the preview's `landingThreat`,
  and never lands where that threat is 8 or more unless the bomb kills a
  `CATAPULT` or `CAPTAIN`-role unit; holds an unmoved Gunner that has a
  target so that it fires twice; Assembles at the front (on a Pressure job
  or within 3 of a visible hostile unit, on the offered tile nearest the
  target that is not next to a hostile melee unit) at the land-production
  priority; Repairs, valuing construct HP double; holds a dug-in Hammerer or
  Mole that has a visible hostile unit within 3; prefers Steam Cannon shots
  whose Knockback empties a hostile center, clears Field Defense, or pushes
  the target next to its melee units; trains a first unit of each role
  (Gyrocopters and Engineers only once at war with four front units); and
  researches Drill first after the ordinary free opener, Dig In once an own
  city is threatened, Marksmanship and (with a Gyrocopter) Raiding with two
  cities, Administration once it owns a Gunner or two Moles, and Blasting
  Charges against a visible Walled city or a Martian seat. Against the
  Dwarves, Normal never ends a routine Move with a ground unit next to a
  hostile mound whose eruption kills it, steps such a unit out of the ring,
  and values a visible Engineer (plus the constructs near it) and a
  Gyrocopter that landed next to an own unit as targets; the exact previews
  already show that a surfaced unit abroad is not dug in. The Brass Titan
  and the Steam Tank use the generic Juggernaut and Knight play. Details
  and measurements:
  [Normal AI Dwarf play](../architecture/NORMAL_AI.md#dwarf-play-pulp_wars-78i4).
- **Promotion** (revision 20, every faction and match): a wounded unit that
  can be promoted is promoted before any attack, capture, or End Turn, so the
  full heal is not wasted; the policy never holds a Promotion back. This is
  the only decision change of revision 20 in matches without a Dinosaur
  seat.
- **Raider Escape:** a Raider attack earns a small bonus for its retreat
  option. After the attack, if visible enemies can reach the Raider, Normal
  only uses an escape Move to a strictly safer visible tile (less projected
  visible damage), preferring own territory and Forest/Mountain cover;
  otherwise ordinary Move scoring applies.
- **Endgame siege:** once expansion is over (no reachable empty neutral
  village), a seat with at least three cities that faces a hostile seat on one
  or two cities (half or fewer of its own, with no more units on the board)
  closes
  on that seat's last cities along land routes, clears non-capturing units off
  their centers and approach tiles for its capturers, and commits a combined
  attack when this turn's offered attacks kill the center's defender next to a
  ready capturer (`src/ai/v7-endgame.ts`).
- **Movement estimates** (revision 18). Normal moves only through offered
  commands, so it uses pass-through and the Road half cost by origin as they
  are offered. Its private route estimates follow the same rules from public
  information: the replacement-defender search passes own units and never
  ends on one; the threat reach of a visible unit of another seat passes that
  seat's own visible units, stops at every other unit, and pays half for a
  step that leaves a Road node usable by that seat; the endgame route field
  of a land unit with Move 2 or more crosses the viewer's own units, while a
  Move-1 unit, which cannot pay for a second step, keeps the field in which
  every unit is a wall.
- One city action is compared across land training, every dock, and Land
  Grant. Roads are built only along one corridor of at most eight missing tiles
  from the original capital to a chosen city; the corridor still includes the
  city's last tile, which Road population needs although movement does not.
- Each owner turn is capped at 128 accepted commands and scheduled through
  bounded, resumable work units; elapsed time never affects decisions.
- Details: [Greedy Normal AI](../architecture/NORMAL_AI.md),
  [revision 11 §7](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md#7-bounded-normal-ai-policy),
  [tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md), and
  [public planning work](../architecture/PUBLIC_PLANNING_V7.md).

## 17. Undead faction rules

Humans are sustain; Undead are attrition: death feeds the Undead through
Graves, raising, infection, and lifesteal, and Liches and Zombies afflict
living units with Plague and bites. Every rule in this section needs an
`UNDEAD` seat in the setup; in a match without one no Grave, Plague, or bite
ever exists, no Undead command is offered, and the Undead schema fields hold
their neutral values (`graves: []`, `plagued: []`, `bitten: []`, heals 0,
infected and bitten flags false). Human units keep every Human ability
(Rally, Tend Wounded, Escape, Overrun) and Goblin units every Goblin rule
against Undead opponents; Goblin units are living. Goblin explosions
interact with these rules as listed in
[section 18.11](#1811-interactions-with-other-rules). Dinosaur-faction units
keep every Dinosaur rule against Undead opponents and are living: they leave
Graves, are plagued, bitten, infected, and wailed like Human units, and the
Shaman's Tend Wounded cures them. An Egg is the exception: it is wailed
(defending with 1) and hit by splash, but never plagued, bitten, infected,
or raised from, and it leaves no Grave
([section 19.12](#1912-interactions-with-other-rules)). Martian-faction
units keep every Martian rule against Undead opponents and are living, with
the Shield absorbing every hit except Plague damage: a Zombie bites and a
Lich plagues only a unit that lost HP, a Vampire heals only by HP damage,
Martians have no cure for Plague or Bitten, and a mind-controlled Lich has
left the board, so its Plagues are cleared
([section 20.11](#2011-interactions-with-other-rules)). Ice Folk units keep
every Ice Folk rule against Undead opponents and are living: they leave
Graves, are plagued, bitten, infected, and wailed, and have no cure; Undead
units are Chilled and shattered like any unit, and a shattered unit leaves
no Grave (a shattered Bitten unit still rises)
([section 21.14](#2114-interactions-with-other-rules)). Dwarf units keep
every Dwarf rule against Undead opponents; every Dwarf unit but the two
constructs is living and leaves Graves, is plagued, bitten, infected, and
wailed, and the Engineer's Repair cures Plague and bites, while the
Clockwork Gunner and Brass Titan are not living: never wailed, plagued,
bitten, or infected, and they leave no Grave
([section 22.13](#2213-interactions-with-other-rules)).
Specifications and exact event shapes:
[revision 13](RULESET_7_REVISION_13_UNDEAD.md),
[revision 14](RULESET_7_REVISION_14_BALANCE.md), and
[revision 15](RULESET_7_REVISION_15_BALANCE.md).

### 17.1 Graves

A Grave is a tile marker. Grave creation is enabled by the setup (at least
one `UNDEAD` seat) and stays enabled after the Undead seats are eliminated.

- **Creation.** When a unit dies, one Grave is created on its death tile when
  all of these hold: the unit was in land form (not embarked or naval), of
  any owner and faction but not a Dwarf construct; it died with cause
  `ATTACK`, `RETALIATION`, `SPLASH` (Battleship, Lich, or Bomb Chucker),
  `WAIL`, `PLAGUE`, `KABOOM` (its own Kaboom), `EXPLOSION` (hit by a blast),
  `BOMB`, or `ERUPTION` (a Dwarf bomb or eruption); the tile is land and is
  not a settlement site (capital, city, or village center); the death did not
  rise (Infect or Bitten); and the tile has no Grave yet.
- **No Grave** comes from a water, embarked, or naval death, an Egg's death
  (form `EGG`), Disband, reward displacement removal, elimination removal,
  the destruction of Eggs with a captured city, a Mind Control, a Thrall
  collapse (`BRAIN_LOST`), a Shatter (`SHATTER`), the death of a Dwarf
  construct, or a death that rises. A
  chest
  is consumed by the unit that enters its tile, so no Grave shares a tile
  with a chest.
- **Properties.** A Grave blocks and costs nothing: movement, occupancy, ZOC,
  training, reward and treasure placement, buildings, Monuments, Roads, Field
  Defense, and every economic action ignore it, and it survives terrain
  transforms, Redevelop, Pillage, capture, and territory changes. A unit may
  stand on a Grave (a melee attacker advances onto the Grave its kill left).
  Only Raise Dead and Devour remove Graves; they never expire.
- **State and view.** `GameStateV7.graves` is a `(y, x)`-sorted,
  duplicate-free coordinate list covered by saves, replays, and hashes; state
  parsing rejects a Grave off the board, on water, on a settlement site, or on
  a chest, and any Grave in a match without an Undead seat.
  `PlayerViewV7.graves` is its explored subset, and `GRAVE_CREATED { at }`
  follows the `UNIT_DIED` of the unit that left it.

### 17.2 Raise Dead and Devour

- **Raise Dead** (`RAISE_DEAD { unitId }`, Necromancer primary action, 0
  Coins). Legal for an own land-form Necromancer that has not used its
  primary action (it may have moved) when at least one **eligible Grave**
  exists: a Grave on one of its eight neighbours with no unit of any owner
  and no Dwarf mound on it (no cap, no terrain or territory filter). In `(y, x)` order each
  eligible Grave is removed and replaced by a Skeleton rising at 5 of 10 HP,
  taking consecutive new unit IDs. The Necromancer is then handled. With no
  eligible Grave the command is rejected with `RAISE_DEAD_NOT_LEGAL`
  (`NO_GRAVE`). Event `DEAD_RAISED`; the public preview `previewRaiseDeadV7`
  equals the result.
- **Devour** (`DEVOUR { unitId }`, Ghoul terminal action). Legal for an own
  land-form Ghoul that has not used its primary action (it may have moved)
  and stands on a Grave, also at full HP (to deny the Grave). The Grave is
  removed, the Ghoul's HP becomes its maximum, and the Ghoul is handled.
  Otherwise `DEVOUR_NOT_LEGAL` (`NO_GRAVE`). Event `GRAVE_DEVOURED` (its
  `amount` may be 0); preview `previewDevourV7`.

### 17.3 Risings

Raise Dead Skeletons, Infect Zombies, and Bitten Zombies are **risings**. A
rising:

- is homed to the creating unit's home city (for a Bitten rising, the biting
  Zombie's home city while that Zombie is on the board), or orphaned when
  that unit is orphaned or gone;
- may exceed its home city's capacity, like a reward unit; an over-capacity
  city cannot train until a slot frees;
- appears in place regardless of movement-entry rules (Mountain without
  Engineering, allied territory) and never destroys Field Defense;
- has 0 kills, is not veteran, is not capture-eligible, and is exhausted
  until its owner's next Start Turn; and
- reveals its sight for its owner when it appears.

On a city or village center a rising besieges that city at once and may
capture it from its owner's next turn. An existing Grave stays under a
rising.

### 17.4 Frenzy

Frenzy is the Undead name of Rally ([section 10](#10-recovery-and-support)):
same command, flag, event, and +1 Attack; its targets exclude Necromancers,
Liches, and Banshees.

### 17.5 Restless

Undead land-form units recover only in their owner's territory
([section 10](#10-recovery-and-support)).

### 17.6 Infect

A land-form unit killed by a Zombie, by the Zombie's attack or by its
retaliation, dies normally (the Zombie keeps the kill) and then rises as a
Zombie of the Zombie's owner at 10 of 18 HP on its tile, with no Grave. The
victim may be of any faction and any land role, on any land tile,
including a city or village center. The killing Zombie never advances.
Naval and embarked victims, splash, Wail, Kaboom, and explosions never
infect, and a Dwarf construct never rises. Event
`UNIT_INFECTED`; the combat preview carries `attackerInfected` and
`defenderInfected`.

### 17.7 Bitten

- **Bite.** When a Zombie deals more than 0 HP damage (a hit a Martian
  Shield absorbs completely is not), by attack or
  retaliation, to a **living land-form** unit that survives, that unit
  becomes Bitten, recording the biter player and Zombie; the last biter wins.
  Embarked and naval units are never bitten; splash, Wail, and explosions are
  not Zombie damage.
- **Rising.** When a Bitten unit dies in land form from `ATTACK`,
  `RETALIATION`, `SPLASH`, `WAIL`, `PLAGUE`, `KABOOM`, `EXPLOSION`,
  `SHATTER`, `BOMB`, or `ERUPTION`,
  whoever killed it, it rises
  on its tile as a Zombie owned by the biter player at 10 of 18 HP
  ([section 17.3](#173-risings)), with no Grave; the killer keeps the kill.
  Infect takes precedence when a Zombie is the killer. A melee attacker whose
  defender rises does not advance (so an Overrun ends there). A Bitten unit
  that dies afloat or embarked, or is removed by displacement, elimination,
  Mind Control, or a Thrall collapse, does not rise. Event
  `BITTEN_UNIT_RISEN`.
- **End.** Bitten persists through embarking and disembarking and ends when
  the unit leaves the board, its biter player is eliminated, or a Human
  Captain's or Dinosaur Shaman's Tend Wounded or a Dwarf Engineer's Repair
  cures it. A burrowed unit keeps its entry. A Bitten unit cannot Disband (it may
  Kaboom, and then rises as its biter's Zombie).
- **Previews and state.** The combat preview carries `attackerBitten`,
  `defenderBitten`, `attackerBittenRises`, and `defenderBittenRises`; the
  Wail preview carries `bittenRises`. `GameStateV7.bitten` lists
  `{ unitId, biterPlayerId, biterUnitId }`; the view lists
  `{ unitId, biterPlayerId }`.

### 17.8 Plague

- **Application.** When a Lich attacks and survives the exchange, the
  primary target and every surviving splash target that is living become
  plagued unless already plagued; units of any form qualify, except a target
  whose hit a Martian Shield absorbed completely (an unshielded target of a
  0 hit is still plagued). A plagued unit
  records its source Lich and `turnsRemaining` 3. Plague never stacks and a
  second hit resets nothing; a dying Lich applies none. The combat preview's
  `plagued` lists the units an attack newly plagues.
- **Start Turn** (the plagued unit's owner's turn, after the reset and
  before Windmill healing, [section 3](#3-players-turns-and-victory)):
  1. every plagued unit of that player takes `min(2, hp)` damage, all at once
     and straight from HP (a Martian Shield never absorbs it;
     `PLAGUE_DAMAGED`);
  2. deaths (cause `PLAGUE`, no kill credit) leave a Bitten rising or a
     Grave, and a dead Brain's Thralls collapse;
  3. surviving units on their **first** plagued Start Turn (3 turns left)
     spread their source, in unit-ID order, to every adjacent unit of any
     owner that is on the board, living, and not plagued (the lowest-ID
     spreader wins; new victims start at 3 and do not spread this step;
     `PLAGUE_SPREAD`);
  4. every surviving damaged entry loses one turn, and an entry that had 1
     turn left expires instead (`PLAGUE_EXPIRED`);
  5. risings reveal their sight and the live economy is recomputed.

  So a Plague deals at most 6 damage over its victim's owner's next three
  Start Turns and spreads once. Plague damage is not an attack: no
  retaliation, Lifesteal, Infect, Field Defense destruction, advance, or
  Push. A Goblin exploding unit that Plague kills explodes after step 5,
  before Windmill healing, and its chain may damage and kill other players'
  units during this Start Turn
  ([section 18.7](#187-where-chains-run-and-event-order)).

- **End.** Plague ends when the unit leaves the board, when it expires, when
  its source Lich leaves the board for any reason, a Mind Control included
  (every unit it plagued is
  cured, `PLAGUE_CLEARED` at the end of the command's events), or when a
  Human Captain's or Dinosaur Shaman's Tend Wounded or a Dwarf Engineer's
  Repair cures it. A burrowed unit keeps its entry and, surfacing before
  Plague resolves, takes its damage on the board; Plague never spreads to or
  from a mound. A unit whose
  Plague ended can be
  plagued again with a fresh 3 turns. A plagued unit cannot Disband.
- **State and view.** `GameStateV7.plagued` lists
  `{ unitId, sourceUnitId, turnsRemaining }` (1–3); the view lists every
  visible plagued unit with its `turnsRemaining` and names the source only
  when the viewer sees it.

### 17.9 Wail

`WAIL { unitId }`, a Banshee primary action and not an Attack.

- **Legality.** An own land-form Banshee that has not used its primary
  action (it may have moved), with at least one target; otherwise
  `WAIL_NOT_LEGAL` (`NO_TARGET`).
- **Targets.** Every unit that is on the board, hostile, living, visible to
  the Banshee's owner, and within Chebyshev 2 of the Banshee, in any form;
  allies never (nor a Dwarf construct, which is not living, nor a mound,
  which is off the board).
- **Damage.** Per target, the ordinary damage formula
  ([section 13.2](#132-damage)) with the Banshee attacking at Attack 1 at its
  current HP (no Charge or Inspired/Frenzied bonus) against the target's own
  Defense, fortification (a dug-in Dwarf unit's Dig In level included),
  embarked Defense 1, and cover (an Ice Folk unit's Snow cover included).
  Damage may be 0; such
  a target still counts. A Martian target's Shield absorbs the hit first
  (each result carries `shieldDamage`). All targets resolve together from
  the pre-Wail state.
- **Result.** No retaliation, advance, Push, Infect, or Field Defense
  destruction. Kills count for the Banshee's promotion and leave Graves or
  Bitten risings, Goblin exploding units it kills explode, and a Brain it
  kills takes its Thralls with it; the Banshee
  is handled. Event `WAIL_RESOLVED` (then
  `UNIT_DIED` with cause `WAIL` per death). The preview `previewWailV7`
  lists exactly the resolved targets (only visible units are targets), but
  it reads cover only from Forest and Mountain and fortification only from
  the tile (Walls and Field Defense in the target's own territory): it
  leaves out an Ice Folk target's Snow cover and a Dwarf target's Dig In, so
  for such a target it can show more damage than the Wail deals, with no
  flag ([section 24](#24-known-discrepancies)).

### 17.10 Commands, events, and queries

- Commands `RAISE_DEAD`, `DEVOUR`, and `WAIL` (each `{ kind, unitId }`).
- Events `DEAD_RAISED`, `GRAVE_DEVOURED`, `WAIL_RESOLVED`, `UNIT_INFECTED`,
  `GRAVE_CREATED`, `BITTEN_UNIT_RISEN`, `PLAGUE_DAMAGED`, `PLAGUE_SPREAD`,
  `PLAGUE_EXPIRED`, and `PLAGUE_CLEARED`; `UNIT_DIED.cause` includes `WAIL`
  and `PLAGUE`; `WOUNDED_TENDED` results carry `curedPlague` and
  `curedBitten`.
- Errors `RAISE_DEAD_NOT_LEGAL`, `DEVOUR_NOT_LEGAL`, `WAIL_NOT_LEGAL`, and
  `DISBAND_NOT_LEGAL`; `RECOVER_NOT_LEGAL` has the reason `RESTLESS`.
- The public command query offers each Undead command, Tend Wounded, and
  Disband exactly when legal. Public previews (`previewRaiseDeadV7`,
  `previewDevourV7`, `previewWailV7`, `previewTendWoundedV7`,
  `queryCombatPreviewV7`) include every Undead effect computed from visible
  units and public statuses only, and projected events filter entries per
  viewer (a viewer who cannot see a splash or Wail source but owns a victim
  receives `COMBAT_SPLASH_DAMAGE`).

## 18. Goblin faction rules

Humans are sustain, Undead are attrition, and Goblins are a reckless horde:
cheap weak units, a bonus for ganging up on one target, units that blow
themselves up (and their friends), and Coins for every kill. Every rule in
this section applies only to units and cities of a `GOBLIN` seat; in a match
without one no Kaboom is offered, no explosion occurs, no Plunder is
awarded, no Troll exists, Warrens never apply, and every combat preview's
`gangUp` is 0. Each rule resolves through the owner's registration
(`FACTION_RULES_V7`, `GOBLIN_ROLE_RULES_V7`, `GOBLIN_ROLE_MECHANICS_V7`).
Human, Undead, Dinosaur, Martian, Ice Folk, and Dwarf units keep every
ability against Goblins, and blasts hit them like any unit (Eggs included;
an Ankylosaurus takes 1 less, [section 19.12](#1912-interactions-with-other-rules);
a Martian Shield absorbs first,
[section 20.11](#2011-interactions-with-other-rules); a blast ignores Snow
cover and the Blizzard,
[section 21.14](#2114-interactions-with-other-rules); a Steam Tank takes at
most 4, and a blast never finds a mound,
[section 22.13](#2213-interactions-with-other-rules)). Specification,
decisions, and the tuning record:
[revision 17](RULESET_7_REVISION_17_GOBLINS.md) and the
[Goblin balance report](../validation/RULESET_7_GOBLIN_BALANCE.md).

### 18.1 Horde and Warrens

- The Goblin costs 1 Coin, has 6 HP, Attack 1.5, and Defense 0.5
  ([section 11](#11-unit-roster)).
- **Warrens:** every city owned by a Goblin seat has +1 unit capacity
  (`cityCapacityBonus` 1, [section 4.4](#44-unit-capacity)).

### 18.2 Gang Up

- When a Goblin unit in land form makes an `ATTACK` (any accepted attack,
  melee or ranged, including Ram continuations), it gets **+1 Attack for each
  other unit its owner has on the eight cells around the target, up to +2**
  (`gangUpMaximum` 2).
- Helpers are units on the board owned by the attacker's owner, of any role
  and form (land, embarked, naval), other than the attacker. Allied units
  never count. Own units are always visible to their owner, so the public
  preview is exact.
- Gang Up never applies to retaliation, Kaboom, blasts, Wail, or Goblin
  boats, and adds to Charge and Inspired/WAAAGH!. Bomb splash derives from
  the boosted primary damage.

### 18.3 Discipline: Field Defense and no healers

- Only the Orc Brute builds Field Defense; the Goblin never does
  ([section 12.3](#123-field-defense)).
- Goblin recovery is the Human rule (Goblins are not Restless). The Orc
  Warboss has no Tend Wounded, so a Goblin seat cannot cure Plague or Bitten;
  its only healing beyond recovery and Windmills is Troll regeneration.

### 18.4 Kaboom

`KABOOM { kind, unitId }` is a primary action of every goblin-crewed unit. It
is not an Attack and needs no technology.

- **Blast area and damage.** An explosion's blast area is the 3 × 3 square
  centred on the exploding unit's tile (where it died), clipped to the
  board. It hits **every other unit on the board in that area**: any owner
  (own, allied, hostile), any faction, any form (land, embarked, naval),
  visible or hidden. Each hit deals `min(blast damage, current HP)` (a
  Martian unit's Shield absorbs it first, so its cap is Shield plus HP); blast
  damage is fixed per role (Kaboom: Goblin 5, Wolf Rider 4, Bomb Chucker 4,
  Rocket Cart 5, Scrap Buggy 5) and ignores Attack, Defense, HP ratio, cover,
  fortification, Walls, Field Defense, the embarked Defense, Charge, Gang Up,
  and Inspired.
- **Legality.** The unit is the actor's own, on the board, in land form, has
  the `KABOOM` ability under its owner's registration, and has not used a
  primary action this turn. It may have moved (a Rocket Cart too, whose
  "cannot attack after moving" limits only Attack) or been marked handled by
  Wait. It may not Kaboom in the turn it landed: landing ends the activation
  for every faction ([section 14](#14-naval-rules)), so a landed unit can
  Kaboom from its owner's next turn. No target is needed: a Kaboom that hits
  nobody is legal. A Plagued or Bitten unit may Kaboom.
- **Result.** The unit dies (`UNIT_DIED` cause `KABOOM`, then its Grave or
  Bitten rising), then its explosion resolves as wave 1 of a chain. Kaboom
  never moves, captures, or advances a unit and never damages cities,
  buildings, improvements, Roads, resources, Ports, Walls, Monuments, or
  terrain; it destroys only Field Defense.
- **Rejections (atomic).** Unknown, dead, or foreign unit → the ordinary
  unit errors; a role without `KABOOM` (Orc Brute, Orc Warboss, Troll, boats,
  every role of another faction) → `UNIT_ROLE_INVALID { role }`; primary action
  already used, the unit landed this turn, or a Ram continuation pending →
  `UNIT_ALREADY_ACTED`;
  embarked → `KABOOM_NOT_LEGAL { reason: "EMBARKED" }`. A pending city
  reward blocks it like every command.

### 18.5 Death blasts

A Bomb Chucker, Rocket Cart, or Scrap Buggy **explodes when it is killed**,
whatever killed it and wherever it stands (land, a city or village center,
embarked on water), with its death-blast damage (Bomb Chucker 2, Rocket Cart
4, Scrap Buggy 4): killed as a defender (`ATTACK`), while attacking
(`RETALIATION`), by splash (`SPLASH`), by Wail (`WAIL`), by Plague (`PLAGUE`,
at its owner's Start Turn), by another blast (`EXPLOSION`), or by a Dwarf
bomb (`BOMB`) or eruption (`ERUPTION`). A unit
explodes at most once: a Kaboom is that unit's explosion. Disband, reward
displacement removal, and elimination removal are removals, not deaths, and
never explode. Goblins and Wolf Riders never explode on death, and neither
does a shattered exploding unit (`SHATTER`,
[section 21.4](#214-shatter)).

### 18.6 Blast resolution

One explosion resolves in this order:

1. collect every unit still on the board in the blast area other than the
   exploder (a unit killed earlier in the same command is gone);
2. each takes `min(blast damage, hp)`, all together (a Martian Shield
   absorbs first; each result carries `shieldDamage`); results are sorted by
   `(y, x, unitId)`;
3. every blast-area tile with Field Defense loses it, whoever owns it
   (`FIELD_DEFENSE_DESTROYED { at, reason: "EXPLOSION" }` in `(y, x)` order;
   a tile already cleared by an earlier explosion of the chain is not
   reported again);
4. each unit reduced to 0 HP dies (`UNIT_DIED` cause `EXPLOSION`), in results
   order, each followed by its Grave or Bitten rising (and a dead Brain by
   its Thralls' collapse).

"Death first, then the bang": an exploding unit's death, Grave, or rising is
recorded before its explosion, so a unit on the exploder's own tile when the
blast resolves is hit: a melee attacker that killed it and advanced, or an
Infect or Bitten rising that appeared there.

### 18.7 Where chains run, and event order

An explosion that kills an exploding unit sets it off. A chain is
breadth-first by **wave**: wave 1 is the Kaboom unit, or every exploding unit
killed by the command's (or Start Turn's) ordinary effects, in ascending unit
ID; the explosions of a wave resolve one at a time in ascending unit ID
against current HP; every exploding unit killed during wave `n` explodes in
wave `n + 1`. The chain ends after a wave that kills no exploding unit.
Every unit explodes at most once and risings are Zombies, so a chain is
finite; the engine asserts at most as many explosions as there were units on
the board at chain start, counting the wave-1 exploders that just died
(`explosionChainMaxExplosionsV7`; a violation is an internal `INVALID_STATE`
rejection, unreachable by construction). Chains are PRNG-free.

A chain runs after the effect that caused the deaths has fully resolved:

- **`KABOOM`:** `UNIT_DIED` (cause `KABOOM`) and the exploder's
  `GRAVE_CREATED` or `BITTEN_UNIT_RISEN`; the chain; `PLUNDER_AWARDED`;
  reveals of risings; the economy, reward-settlement, and achievement tail.
- **`ATTACK`:** the ordinary steps through Push (damage, splash, Lifesteal,
  kill credit, removals, primary Field Defense destruction, deaths with
  Graves, Infect, and Bitten risings, advance, Push); then the chain of the
  exploding units among the defender, splash victims, and attacker; then the
  Ram/Overrun continuation, evaluated on the board after the chain (none if
  the attacker died or no visible hostile unit is adjacent any more; the
  `COMBAT_RESOLVED` preview's `overrunContinues` and `attacksRemaining` state
  the final value); then `PLUNDER_AWARDED`, reveals, and the tail. Event
  order: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; the death events;
  `UNIT_MOVED` (advance); `UNIT_PUSHED`; the chain events;
  `PLUNDER_AWARDED`; `TILES_REVEALED`; the tail.
- **`WAIL`:** after the Wail deaths and their Graves or risings, the chain of
  exploding victims, then `PLUNDER_AWARDED` and the tail.
- **Start Turn Plague:** after Plague steps 1–5, the chain of the player's
  exploding units that Plague killed, then `PLUNDER_AWARDED`, rising
  reveals, and the economy; then Windmill healing, Troll regeneration,
  income, rewards, and achievements
  ([section 3](#3-players-turns-and-victory)).
- **`BOMB_RUN`** (Dwarf): after the bomb's death and its Grave, rising, or
  collapse, the chain of a killed exploding target (the Gyrocopter on its
  landing tile beside it is in the blast), then `PLUNDER_AWARDED`, reveals,
  the self-launch, and the tail
  ([section 22.5](#225-gyrocopters-and-the-bombing-run)).
- **Start Turn surfacing** (Dwarf): for each surfacing Mole, after the
  eruption's deaths and their Graves, risings, and collapses, the chain of
  the exploding victims (the surfaced Mole and rider are in its blasts),
  then `PLUNDER_AWARDED` and reveals, before Plague and its own chain
  ([section 22.3](#223-the-mound-surfacing-and-the-eruption)).

Chain events: for each explosion in chain order `EXPLOSION_RESOLVED`, then
its `FIELD_DEFENSE_DESTROYED` events, then for each death in its results
order `UNIT_DIED` (cause `EXPLOSION`) followed by that death's
`GRAVE_CREATED` or `BITTEN_UNIT_RISEN`. Every command then appends the naval
blockade and sea-network events ([section 14](#14-naval-rules); `KABOOM` and
`END_TURN` are on that list), followed by `PLAGUE_CLEARED` when a blast
killed a Lich.

### 18.8 Bomb Chucker bombs

A Bomb Chucker `ATTACK` is an ordinary targeted attack (damage formula, Gang
Up, Inspired, retaliation only from a defender that reaches 2 cells) plus a
bomb splash: **every other unit on the eight cells around the primary
target**, of any owner including the Bomb Chucker's own and its allies',
hidden or visible, of any form, takes `max(1, ceil(primary damage / 2))`
capped at its HP. There is no retaliation from splash targets and no
modifier, splash applies only when the Bomb Chucker attacks (never when it
retaliates), splash deaths have cause `SPLASH` (so exploding units killed by
it explode), and bomb splash does not destroy Field Defense. Fog and
projection follow the Battleship splash rules: canonical resolution includes
hidden units, the public combat preview lists only visible ones, and a
viewer that cannot see the attacker or target but owns a splashed unit
receives `COMBAT_SPLASH_DAMAGE`.

### 18.9 Kill credit, Plunder, and friendly fire

Every death is credited to at most one player:

| Death cause                    | Credited player                  | Unit kill credit (promotion)       |
| ------------------------------ | -------------------------------- | ---------------------------------- |
| `ATTACK`                       | the attacker's owner             | the attacker                       |
| `SHATTER`                      | the attacker's owner             | the attacker                       |
| `BOMB`                         | the Gyrocopter's owner           | the Gyrocopter                     |
| `ERUPTION`                     | the Mole's owner                 | the Mole                           |
| `RETALIATION`                  | the retaliating defender's owner | the defender                       |
| `SPLASH`                       | the attacker's owner             | the attacker, hostile victims only |
| `WAIL`                         | the Banshee's owner              | the Banshee                        |
| `EXPLOSION`                    | the exploding unit's owner       | none (the exploding unit is dead)  |
| `KABOOM` (the exploder itself) | none                             | none                               |
| `PLAGUE`                       | none                             | none                               |
| `BRAIN_LOST` (Thrall collapse) | none                             | none                               |

- A victim that rises (Infect or Bitten) still counts as killed. A Mind
  Control is a removal, not a death: nobody is credited.
- **Plunder** (the Goblin `COMMERCE`, displayed as Plunder; Mobility, tier 3,
  requires Roads, ordinary tier-3 cost): when a death is credited to a
  player that has Plunder and the victim's owner is hostile to that player,
  that player gains 1 Coin. This covers its attacks (primary and splash
  kills), its units' retaliation, and the blasts of its exploding units,
  including blasts of its units that an enemy killed. It earns nothing for
  Plague deaths or own or allied victims.
- Plunder Coins are added after the command's (or Start Turn's) deaths and
  chain, before the economy tail, with one
  `PLUNDER_AWARDED { playerId, kills, coins }` per credited player with at
  least one plundered kill, in player-ID order. Coins may arrive during
  another player's turn. The event is owner-only and carries no victim IDs.
- **Friendly fire** is a hit by an explosion or a Bomb Chucker splash on a
  unit owned by the credited player or its ally (the exploder itself never
  counts). A friendly-fire death earns no Plunder and no promotion credit.
  Previews report friendly damage and deaths separately.

### 18.10 WAAAGH!, Ram, and Troll regeneration

- **WAAAGH!** is the Goblin Rally (command `RALLY`, flag `inspired` labelled
  "WAAAGH!", event `UNITS_RALLIED`; unlock `WAAAGH_SUPPORT`). An Orc Warboss
  in land form that has not used a primary action (it may have moved) makes
  every other own land-form unit within Chebyshev distance 2 that has the
  `ATTACK` ability and is not already Inspired gain +1 Attack on its first
  accepted attack this turn; `SUPPORT` and `SIEGE` roles qualify. Everything
  else is the Inspired rule ([section 10](#10-recovery-and-support)),
  including `INSPIRED` Field Defense destruction. With no eligible target it
  rejects with `HEAL_TARGET_NOT_FOUND`.
- **Ram** is Overrun under a Goblin label for the Scrap Buggy
  ([section 13.4](#134-after-combat)); its continuation is evaluated after
  any chain its attack set off.
- **Troll regeneration:** at its owner's Start Turn, after Windmill healing
  and before income, every Troll of that player on the board heals
  `min(4, maxHp − hp)`, in any form and on any tile (own, neutral, or hostile
  territory). It is separate from Windmill healing and idle recovery and
  cures nothing. Event `UNITS_REGENERATED { playerId, results }` with
  `results: [{ unitId, amount, hpAfter }]` in unit-ID order for Trolls with
  `amount > 0`; no event when no Troll healed.

### 18.11 Interactions with other rules

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graves                  | `KABOOM` and `EXPLOSION` deaths are qualifying combat deaths (land form, land tile, not a settlement site, no rising, no Grave yet); Graves exist only in matches with an Undead seat.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Infect, Bitten          | Explosions are not Zombie damage: they never infect or bite. A Bitten land-form unit that dies from `KABOOM` or `EXPLOSION` rises as its biter's Zombie. A Zombie that kills a Bomb Chucker infects it, and the Chucker's death blast then hits the Zombie and the rising.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Plague, Wail            | Plague and Wail kills of exploding units set off death blasts. A blast that kills a Lich ends every Plague it caused (`PLAGUE_CLEARED`). Goblin units are living: Wail, Plague, and bites affect them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Lifesteal, Unanswered   | Blasts are not combat exchanges: no Lifesteal heal. A Vampire's attack draws no retaliation, but a Bomb Chucker it kills still explodes and hits it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Push, Charge, Escape    | Push resolves before the chain. A Raider that survives the attack and the chain keeps its Escape Move.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Cities, villages        | Blasts hit units on centers (Walls and fortification give no protection), never capture, move, or advance a unit, and never change a city, territory, level, Walls, improvement, Road, resource, or Monument. Surviving victims keep their capture eligibility.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Capacity                | A Kaboom or blast death frees its home city's slot at once; the city trains again only with its city action still available.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Achievements, Promotion | Explosions credit no unit kill ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)), so they never advance Promotion, growth, or Slayer; Plunder counts them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Dinosaurs               | Blasts hit Dinosaur units and Eggs with fixed damage (an Ankylosaurus takes 1 less; an Egg killed by a blast dies with cause `EXPLOSION`); a destroyed Egg is a credited hostile kill for Plunder. Eggs never help Gang Up. No Dinosaur attack has Gang Up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Martians                | A Martian Shield absorbs blast and bomb-splash damage first (a Kaboom of 5 costs a Grunt 3 HP and a Grunt in a Force Field or a Mothership 1; a death blast of 2 costs a unit with a full Shield nothing). A Brain killed by a blast takes its Thralls with it, which earns no Plunder. A mind-controlled Bomb Chucker, Rocket Cart, or Scrap Buggy is removed, not killed, and does not explode. No Martian attack has Gang Up.                                                                                                                                                                                                                                                                                               |
| Ice Folk                | Blasts and bomb splash ignore Snow cover and the Blizzard (fixed damage); a Bomb Chucker or Rocket Cart shot from distance 2 on an Ice Folk unit in its own Witch's Blizzard is halved, and the bomb splash derives from the halved hit. A shattered exploding unit does not explode (one Yeti hit shatters a Chilled full-HP Bomb Chucker or Rocket Cart); killed any other way it explodes as usual. A sluggish goblin-crewed unit that moved cannot Kaboom. Wolf Riders and Scrap Buggies end a Move on entering Snow (Fieldcraft waives it for the Wolf Rider and the Bomb Chucker). A Troll is Chilled but never shattered. Plunder counts Ice Folk kills; a Shatter is an Ice Folk kill. No Ice Folk attack has Gang Up. |
| Dwarves                 | A blast and a Kaboom are fixed damage: they ignore Dig In and Walls, and a Steam Tank takes at most 4 of one (Plated). No Kaboom or blast ever finds a mound, but a blast destroys Field Defense on a mound tile like on any tile. An exploding unit killed by a bomb or an eruption explodes as usual: its blast hits the Gyrocopter on its landing tile, or the surfaced Mole and its rider. A Goblin seat earns Plunder for every Dwarf unit its units or blasts kill, constructs included. Gang Up does not ignore Dig In. A Dwarf construct leaves no Grave when a blast kills it. No Dwarf attack has Gang Up.                                                                                                           |

### 18.12 Commands, events, errors, and queries

- **Command** `KABOOM { kind, unitId }`, inserted in `COMMAND_KIND_ORDER_V7`
  immediately after `WAIL`.
- **Events:** `UNITS_REGENERATED { playerId, results }` (after
  `WINDMILL_HEALING_RESOLVED`); `EXPLOSION_RESOLVED` (after `WAIL_RESOLVED`)
  with `playerId` (the exploding unit's owner), `unitId`, `role`, `at` (its
  death tile), `cause` (`KABOOM` or `DEATH`), `wave` (1-based), `damage`, and
  `results` in the splash-entry shape
  `{ unitId, at, damage, dies, shieldDamage }` (`damage` is HP damage;
  `shieldDamage` is 0 without a Martian Shield), sorted by `(y, x, unitId)`
  and possibly empty; and
  `PLUNDER_AWARDED { playerId, kills, coins }` (after `SPOILS_AWARDED`).
  `UNIT_DIED.cause` and the Grave and Bitten-rising causes gain `KABOOM` and
  `EXPLOSION`; `FIELD_DEFENSE_DESTROYED.reason` gains `EXPLOSION`.
  `CombatPreviewV7` gains `gangUp`; Bomb Chucker `splash` entries may name
  own and allied units.
- **Error:** `KABOOM_NOT_LEGAL` (reason `EMBARKED`); other Kaboom rejections
  reuse existing codes ([section 18.4](#184-kaboom)).
- **Registration:** faction `GOBLIN`, tree `GOBLIN_BASELINE_V1`, display name
  "Goblin"; unlock kinds `WAAAGH_SUPPORT` and `PLUNDER { coins: 1 }`;
  capability `plunderCoins`; abilities `KABOOM` and `REGENERATE`; faction
  rules `cityCapacityBonus` and `gangUpMaximum`; role mechanics
  `kaboomDamage`, `deathBlastDamage`, `splashTargets`, `buildsFieldDefense`,
  `rallyRadius`, `rallyReachesSupportAndSiege`, and `regeneration`.
- **`queryPlayerCommandsV7`** offers `KABOOM` exactly when legal (also with
  no unit in the blast area), never offers Goblin Field Defense or Warboss
  Tend Wounded, and offers WAAAGH! (`RALLY`) only with an eligible target.
- **`previewKaboomV7(view, unitId)`** returns null unless `KABOOM` is
  offered; otherwise `unitId`, `at`, `explosions`, `totals`, `friendlyFire`,
  and `touchesUnexplored`. `explosions` lists the previewed chain in
  resolution order, each with `unitId`, `ownerId`, `role`, `at`, `cause`,
  `wave`, `damage`, `results`, and `fieldDefenseDestroyed`; each result has
  `unitId` (null for a Zombie that would rise during the previewed command),
  `ownerId`, `at`, `damage`, `dies`, and `friendly` (own or allied). `totals`
  holds `hostileDamage`, `hostileKills`, `friendlyDamage`, `friendlyKills`,
  and `plunderCoins` (the exploder excluded; 0 without Plunder), and
  `friendlyFire` is `friendlyDamage > 0`.
- **`previewAttackExplosionsV7(view, attackerId, targetUnitId)`** returns
  null when the attack is not offered, otherwise the same chain shape (with
  `attackerId` and `targetUnitId`) for the death blasts the attack would set
  off, after its deaths, risings, advance, and Push (an empty chain when
  none).
- Chain previews use the viewer's visible units only. `touchesUnexplored` is
  true when a previewed blast area (or, for an attack, the splash ring or an
  unknown Push destination the chain depends on) includes a cell the viewer
  has not explored; with `touchesUnexplored: false` the preview equals the
  resolution. A Kaboom's first blast is always exact.
- `queryCombatPreviewV7` and `estimateCombatV7` include Gang Up and friendly
  bomb splash. `queryThreatenedTilesV7` (which returns tiles, not damage)
  adds, for a visible goblin-crewed land unit, every tile within Chebyshev 1
  of a tile it can reach this turn (it may Kaboom after moving). An embarked
  goblin-crewed unit adds no Kaboom reach: landing ends its activation, so it
  cannot land and Kaboom in the same turn (`pulp_wars-0ao.15` removed the
  landing reach that `pulp_wars-0ao.11` had added).
- Public unit stats carry the `goblin` mechanics block for Goblin-owned
  units, and `previewCityCapacityV7` includes Warrens. `PublicPlayerV7` and
  the leaderboard carry `GOBLIN` and `GOBLIN_BASELINE_V1` for Goblin seats.

## 19. Dinosaur faction rules

Humans are sustain, Undead are attrition, Goblins are a reckless horde, and
Dinosaurs are **few, big, and growing**: cavemen lead a small number of
strong beasts that are laid as Eggs next to a city, take up more room, grow
when they kill, and break lines with the Triceratops's Charge!. Their
weaknesses are the Egg (a fragile, immobile target for one or more turns),
low unit counts, and no Field Defense. Every rule in this section applies
only to units and cities of a `DINOSAUR` seat; in a match without one no Egg
exists (`eggs` is empty), no `LAY_EGG` or `HATCH` is offered or accepted,
every role uses one slot, no unit grows, the treasure unit is the `KNIGHT`
role, no Nesting slot or Wallbreaker applies, and every combat preview has
`runUp: 0`, `fortificationIgnored: 0`, `acid: false`, and both Armoured
flags false. Each rule resolves through the owner's registration
(`FACTION_RULES_V7`, `DINOSAUR_ROLE_RULES_V7`, `DINOSAUR_ROLE_MECHANICS_V7`).
Human, Undead, Goblin, Martian, Ice Folk, and Dwarf units keep every
ability against Dinosaurs, and Eggs are targets like any unit (never Chilled
or shattered; hit by an eruption and a bomb). Specification, decisions, and tuning
records: [revision 19](RULESET_7_REVISION_19_DINOSAURS.md),
[revision 20](RULESET_7_REVISION_20.md), the
[Dinosaur balance report](../validation/RULESET_7_DINOSAUR_BALANCE.md) (the
`pulp_wars-c87.8` interim baseline), and the
[revision-20 balance report](../validation/RULESET_7_REVISION_20_BALANCE.md)
(the `7r23` coarse pass).

### 19.1 Roles, Wild, and labels

| Mechanical role | Human      | Undead      | Goblin       | Dinosaur     | Martian            | Ice Folk     | Dwarf            |
| --------------- | ---------- | ----------- | ------------ | ------------ | ------------------ | ------------ | ---------------- |
| `FIGHTER`       | Fighter    | Skeleton    | Goblin       | Caveman      | Grunt (and Thrall) | Yeti         | Hammerer         |
| `RAIDER`        | Raider     | Ghoul       | Wolf Rider   | Raptor       | Saucer             | Sled         | Gyrocopter       |
| `MARKSMAN`      | Marksman   | Banshee     | Bomb Chucker | Spitter      | Ray Gunner         | Snow Hunter  | Clockwork Gunner |
| `GUARD`         | Guard      | Zombie      | Orc Brute    | Ankylosaurus | Shield Projector   | Mammoth      | Steam Mole       |
| `CAPTAIN`       | Captain    | Necromancer | Orc Warboss  | Shaman       | Brain              | Ice Witch    | Engineer         |
| `CATAPULT`      | Catapult   | Lich        | Rocket Cart  | Triceratops  | Tripod             | Boulder Yeti | Steam Cannon     |
| `KNIGHT`        | Knight     | Vampire     | Scrap Buggy  | T-Rex        | Mothership         | Sabretooth   | Steam Tank       |
| `JUGGERNAUT`    | Juggernaut | Abomination | Troll        | Brontosaurus | Colossus           | Frost Giant  | Brass Titan      |

- **Cavemen** (Caveman and Shaman) are trained on the city center with
  `TRAIN` and keep the ordinary Promotion. **Dinosaurs** (the six growing
  roles) grow instead of promoting ([section 19.8](#198-grow)); the five
  trainable ones are laid as Eggs ([section 19.4](#194-laying-an-egg)), and
  the Brontosaurus is a reward unit only. The boats are the Human boats.
- **Wild:** no Dinosaur unit builds Field Defense
  ([section 12.3](#123-field-defense)). Walls are unchanged: a Dinosaur city
  may choose the Walls reward.
- **Labels:** Rally is **War Drums**, Overrun is **Rampage** (T-Rex), the
  Raider Charge is **Pounce** (Raptor), and the Triceratops's `LINEBREAKER`
  ability is **Charge!**. The commands, flags, and events are the shared
  ones (`RALLY`, `inspired`, `UNITS_RALLIED`; Overrun's continuation;
  `chargeApplied`).
- **Treasure unit:** a Raptor (`treasureUnitRole` `RAIDER`,
  [section 2.2](#22-settlements-and-treasures)). **Starting unit:** one
  Caveman. **Militia:** one Caveman. **Level-5+ reward:** a Brontosaurus.
  Reward and treasure units arrive hatched; no reward or chest ever creates
  an Egg.

### 19.2 Capacity slots and Nesting

- **Slots.** The Triceratops, T-Rex, and Brontosaurus use 2 capacity slots
  (like the Martian Mothership and Colossus), every other role of every
  faction 1 (`capacitySlots`). A city's used
  slots are the sum over the units on the board homed to it, Eggs included
  (an Egg uses the slots of the unit inside); training, laying, and the
  treasure unit need `used + slots <= capacity`
  ([section 4.4](#44-unit-capacity)). So a level-1 capital (capacity 2)
  that holds the starting Caveman can lay a Raptor, Spitter, or Ankylosaurus
  Egg, but not a Triceratops or T-Rex Egg. Hatching never changes used
  slots.
- Dinosaur cities have no Warrens-like faction bonus
  (`cityCapacityBonus` 0).
- **Nesting** (the Dinosaur Fortification, Industry tier 2, requires Drill,
  ordinary tier-2 cost) gives every city its owner owns one more slot, read
  live like Planning (researching it raises every owned city at once; a
  city captured by a Dinosaur seat with Nesting gains the slot, and a city
  captured from it loses the slot). It also changes every Egg the player
  **lays** from then on: +4 HP (10 instead of 6) and one turn less to hatch,
  minimum 1. Eggs already on the board keep their values.

| Unit         | Hatch time | With Nesting |
| ------------ | ---------: | -----------: |
| Raptor       |          1 |            1 |
| Spitter      |          1 |            1 |
| Ankylosaurus |          2 |            1 |
| Triceratops  |          2 |            1 |
| T-Rex        |          4 |            3 |

### 19.3 Eggs

**An Egg is a unit with the form `EGG`.** It is an ordinary entry of
`GameStateV7.units` with its own unit ID, `ownerId`, `homeCityId` (the laying
city), `role` (the role of the unit inside), `at`, `hp`, and `maxHp`, with
`kills` 0, `veteran` false, `captureEligible` false, and the exhausted
activation at all times. Its countdown is in
`GameStateV7.eggs: { unitId, turnsRemaining, laidThisTurn }[]`, sorted by
unit ID; `turnsRemaining` is the number of its owner's Start Turns still to
come before it hatches (1 to the role's hatch time), and `laidThisTurn` is
true from `LAY_EGG` until its owner's next Start Turn. `PlayerViewV7.eggs`
lists the same entries for every Egg in the view.

| Property       | Value                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| HP             | 6, or 10 when laid with Nesting (`EGG_HP_V7` plus `eggHpBonus`)                                                            |
| Attack         | none: no `ATTACK`, never retaliates                                                                                        |
| Defense        | 1 (`EGG_DEFENSE2_V7` 2), fixed, like an embarked unit: no cover, no fortification                                          |
| Move, range    | 0; it never moves and is never pushed or displaced                                                                         |
| Sight, ZOC     | none: an Egg reveals nothing and projects no ZOC                                                                           |
| Capture, siege | none; an Egg never stands on a center                                                                                      |
| Slots          | the slots of the unit inside                                                                                               |
| Occupancy      | it occupies its tile: no unit ends a Move, lands, is pushed, placed, or displaced there; its owner's units pass through it |
| Healing        | none                                                                                                                       |
| Statuses       | never plagued (application or spread), never bitten, never Inspired; no growth and no kills                                |
| Damage         | everything that damages a unit on its tile: attacks, splash, Wail, Kaboom, and death blasts                                |
| Label          | "{Unit} Egg", for example "Raptor Egg"; its role, HP, and countdown are public on a visible Egg                            |

An Egg accepts no unit command except Disband
([section 19.7](#197-egg-destruction-capture-and-abandon-egg)): every other
command naming an own Egg as `unitId` is rejected with `UNIT_IS_EGG` and
never offered. It never needs handling (it is never among the units waiting
for orders, and idle recovery skips it). It does not count for Muster until
it hatches, and it counts as a unit in the leaderboard unit count. State
parsing rejects any Egg in a match without a Dinosaur seat, an `EGG` unit
without an `eggs` entry or the reverse, an Egg whose owner is not a Dinosaur
seat, whose role is not egg-laid, whose home city is missing or not owned by
its owner, or whose tile is not a land tile of that city's territory next to
its center, an Egg `maxHp` other than 6 or 10, and an Egg listed in
`plagued` or `bitten`.

### 19.4 Laying an Egg

`LAY_EGG { kind, cityId, role, at }` is a city action and the only way a
Dinosaur seat produces an egg-laid role. Legality is checked in this order,
the first failure being the (atomic) rejection:

| #   | Requirement                                                                                                                                                                                                                | Rejection                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | The city exists and the actor owns it.                                                                                                                                                                                     | `CITY_NOT_FOUND`, `CITY_NOT_OWNED`     |
| 2   | Its city action is available.                                                                                                                                                                                              | `CITY_ACTION_SPENT`                    |
| 3   | It is not besieged and has no pending reward.                                                                                                                                                                              | `CITY_BESIEGED`, `CITY_REWARD_PENDING` |
| 4   | `role` is an egg-laid role of the actor's registration (so the actor is a Dinosaur seat).                                                                                                                                  | `UNIT_ROLE_INVALID { role }`           |
| 5   | The actor has researched the role's technology.                                                                                                                                                                            | `TECH_REQUIRED { tech }`               |
| 6   | `at` is on the board.                                                                                                                                                                                                      | `TILE_NOT_FOUND`                       |
| 7   | `at` is a **nest tile** of the city: one of the eight tiles around its center; land; in that city's territory; not a settlement site; holding no unit and no treasure chest; a Mountain only if the actor has Engineering. | `INVALID_TILE { action: "LAY_EGG" }`   |
| 8   | `used + slots(role) <= capacity`.                                                                                                                                                                                          | `CITY_CAPACITY_FULL`                   |
| 9   | The actor has the cost in Coins.                                                                                                                                                                                           | `INSUFFICIENT_COINS { cost }`          |

- **Cost:** the role's printed cost, minus 1 (minimum 1) while a Forge in
  the laying city has positive output (Arms Industry); never the Shipyard
  discount.
- **The center may be occupied:** laying does not use the city center, so a
  garrisoned Dinosaur city can still produce (`CITY_SPAWN_OCCUPIED` never
  applies to `LAY_EGG`; training a Caveman or Shaman still needs an empty
  center).
- A nest tile may be Grass, Forest, or (with Engineering) Mountain, with or
  without a resource, improvement, Road, Field Defense, or Grave. An Egg
  changes nothing on its tile and blocks no economic action there. A city
  with no free nest tile cannot lay.
- **Result:** the actor pays, the city action is spent, and an Egg takes the
  next entity ID on `at`, homed to the city, with
  `hp = maxHp = 6 + eggHpBonus`,
  `turnsRemaining = max(1, hatchTurns(role) − eggHatchTurnReduction)`, and
  `laidThisTurn: true`. Event `EGG_LAID { playerId, cityId, unitId, role, cost, at, hp, turnsRemaining }`;
  achievements are then evaluated. Laying reveals nothing, draws no PRNG
  value, and emits no naval event.

### 19.5 Hatching

At its owner's Start Turn, after the Plague step and any chain it started and
before Windmill healing ([section 3](#3-players-turns-and-victory)), every
Egg of that player, in ascending unit ID, has `laidThisTurn` cleared and
loses one from `turnsRemaining`; at 0 it **hatches**: the form becomes
`LAND`, `hp` and `maxHp` become the role's maximum HP, `kills` stays 0, the
`eggs` entry is removed, and the unit gets a **fresh activation** (it can
move and act this turn) and reveals its sight. One `EGG_HATCHED` (`cause`
`TIME`, `sourceUnitId` null) per hatch, then one `TILES_REVEALED` for the
step when anything was revealed.

- An Egg laid on its owner's turn `N` with hatch time 1 hatches at the start
  of turn `N + 1`, ready to act (the tempo of a trained unit, which is
  exhausted until then); hatch time 2 at `N + 2`; a T-Rex (4) at `N + 4`.
- Siege, pending rewards, capacity, and Coins do not matter. The hatched unit
  appears in place, homed to the laying city, with the same unit ID and the
  same slots.
- The hatch tile is always free (an Egg is alone on its tile by
  construction); a violation is an internal `INVALID_STATE`.
- Muster and every other achievement are evaluated after the step.

### 19.6 Shaman Hatch

`HATCH { kind, unitId, eggUnitId }` is a primary action of the Shaman: no
Coins and no technology beyond the Shaman itself.

- **Legal** for an own land-form Shaman (the `HATCH` ability) that has not
  used its primary action (it may have moved), with `eggUnitId` an own Egg
  on one of its eight neighbours that was **not laid this turn**.
- **Result:** the Egg hatches at once as in
  [section 19.5](#195-hatching), but the hatchling is **exhausted** for the
  rest of the turn; the Shaman is handled. `EGG_HATCHED` with `cause`
  `SHAMAN` and `sourceUnitId` the Shaman, then `TILES_REVEALED`, then the
  achievement evaluation.
- Every Egg therefore spends at least one round of enemy turns on the
  board. From its owner's next turn a Hatch saves its whole remaining
  countdown, so it matters only for Eggs with hatch time 2 or more: a T-Rex
  Egg laid on turn `N` can be hatched on `N + 1` and act on `N + 2`.
- **Rejections (atomic):** unknown, dead, or foreign Shaman → the ordinary
  unit errors; a role without `HATCH` → `UNIT_ROLE_INVALID { role }`; primary
  action already used (or the Shaman landed this turn) →
  `UNIT_ALREADY_ACTED`; embarked → `HATCH_NOT_LEGAL { reason: "EMBARKED" }`;
  `eggUnitId` unknown, dead, not the actor's, not an Egg, or not adjacent →
  `HATCH_NOT_LEGAL { reason: "NO_EGG" }`; an adjacent own Egg laid this turn
  → `HATCH_NOT_LEGAL { reason: "LAID_THIS_TURN" }` (never offered). A
  plagued or bitten Shaman may Hatch.

### 19.7 Egg destruction, capture, and Abandon Egg

- **Destroyed.** An Egg reduced to 0 HP dies like any unit (`UNIT_DIED` with
  the ordinary cause: `ATTACK`, `SPLASH`, `WAIL`, or `EXPLOSION`); its slots
  free at once. It leaves no Grave and never rises. The killer gets the
  ordinary kill credit (Promotion, growth, Slayer), the credited player the
  ordinary Plunder, and a melee attacker advances onto its tile (an Overrun,
  Ram, or Rampage continues from there).
- **City capture** destroys every Egg homed to the captured city:
  `UNIT_DIED` with cause `CITY_CAPTURED`, in unit-ID order, right after
  `CITY_CAPTURED` and before the elimination events. These are removals:
  no kill credit, no Plunder, no Grave.
- **Elimination** removes Eggs with the player's other units (cause
  `ELIMINATION`).
- **Abandon Egg.** With Administration, `DISBAND` is legal for an own Egg,
  on any turn including the one it was laid and with no city action: it is
  removed for `floor(printed cost / 2)` Coins of the role inside (Raptor,
  Spitter, and Ankylosaurus 2, Triceratops 4, T-Rex 7), with the ordinary
  `UNIT_DISBANDED` event.

### 19.8 Grow

- **Stages** are derived from `kills` (`GROWTH_KILLS_V7` `[1, 3]`): stage 0
  with no kill, **Big** (stage 1) from 1 kill, **Alpha** (stage 2) from 3
  kills. There is no stage beyond Alpha. Only the six dinosaurs grow (the
  `GROW` ability); Eggs never do.
- **Kill credit** is the ordinary one
  ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)): the unit's
  attack kills (each Rampage kill too), retaliation kills, and hostile
  splash kills count; a victim that rises still counts; destroying an Egg
  counts; explosions, Plague, and kills of own or allied units do not. A
  dinosaur is credited only in land form.
- **Effect.** Each stage reached adds 4 maximum HP (`GROWTH_HP_V7`) and
  **fully heals** the unit (`hp` becomes the new maximum; revision 20).
  Alpha also adds +1 Attack (`ALPHA_ATTACK2_V7` 2) to every attack the unit
  makes from then on. A unit that crosses both thresholds in one command
  gains both stages in order. The heal removes damage only: Plague and
  Bitten stay.
- **Timing.** Growth applies after the exchange's damage, Lifesteal, and
  kill credit, to a unit that survived it, and before the Push, the advance
  or follow, and any chain, so a T-Rex that reaches Big with its first kill
  is fully healed before it advances and Rampages. The exchange's damage is
  never recomputed; Alpha's Attack applies from the next attack.
- **Persistence.** Growth is permanent (embarking, landing, capture of its
  home city, saves) and ends only when the unit leaves the board. A dinosaur
  that dies and rises (Infect or Bitten) becomes an ordinary Zombie of the
  biter's owner with no growth.
- **No Promotion** for a growing unit: it is never `veteran`, and `PROMOTE`
  is never offered for it (`PROMOTION_NOT_ELIGIBLE`). State parsing requires
  `veteran` false and `maxHp = role maxHp + 4 × stage(kills)` for it.
  Healing (recovery, Windmills, Tend Wounded) heals toward the grown
  maximum, and combat uses `hp / maxHp` as for a promoted unit.
- **Events and public view.** One `UNIT_GREW { unitId, stage, maxHp, hp }`
  per stage reached (`hp = maxHp`), after the death events of the attack.
  `kills` and `maxHp` are public, so the stage is public; the public unit
  stats carry `growthStage` and `killsToNextStage`, the HP breakdown lists
  the source `GROWTH`, and the Attack breakdown the source `ALPHA`.

### 19.9 Acid and Armoured

- **Acid** (Spitter): when a land-form Spitter makes an `ATTACK` (range 1
  or 2), the defender gets **no cover and no fortification** for the whole
  exchange: its base Defense only (embarked or an Egg: 1), `cover = 1`, and
  fortification level 0, whatever the terrain, Walls, or Field Defense.
  Acid destroys nothing and never applies to the Spitter's retaliation. The
  combat preview and `COMBAT_RESOLVED` carry `acid: true` and
  `fortificationLevel: 0`. Example: a full-HP Spitter deals 4 (not 2) to a
  full-HP Guard on a Walled center with Field Defense, and 5 (not 4) to a
  Fighter in a Forest.
- **Armoured** (Ankylosaurus, `armourReduction` 1): every instance of damage
  `d` it takes is `d − 1` for `d >= 2` and `d` for 0 or 1, before the cap at
  its HP: an attack, a retaliation it takes as attacker, a splash hit, a
  Wail hit, a Kaboom or death-blast hit, and each Start Turn of Plague (2
  becomes 1); in land form and embarked, never as an Egg. Everything derived
  from the damage uses the reduced value (splash around it, Lifesteal from
  it, death); a Zombie that deals 1 still bites it. The combat preview and
  `COMBAT_RESOLVED` carry `defenderArmoured` and `attackerArmoured` (true
  when the reduction lowered that side's damage); splash, Wail, explosion,
  and Plague entries report the reduced damage. Example: a full-HP Fighter
  deals 3 (not 4) to a full-HP Ankylosaurus; a Goblin's Kaboom deals 4.

### 19.10 Wallbreaker

Wallbreaker is the Dinosaur Explosives (Industry tier 3, requires
Fortification): it keeps Blast Mountain and the melee Field Defense
demolition of every faction's Explosives and adds the capability
`ignoresCityWalls`. When a dinosaur in land form whose owner has
Wallbreaker makes an `ATTACK`, the defender's City Walls levels (2) are
removed from its fortification for the whole exchange (damage and
retaliation); the Field Defense level and cover stay, and the Walls are not
destroyed. It applies at any range and on every attack of the turn (each
Rampage attack too), never to the Caveman, the Shaman, a boat, or an Egg,
and never to a retaliation the dinosaur makes. It is read from the
attacker's owner at the moment of the attack, and it is moot for the
Triceratops and the Spitter, which already remove more. The preview reports
`fortificationIgnored: 2` on a Walled center.

| Attack (full HP)                                       | Without Wallbreaker (damage / retaliation) | With Wallbreaker |
| ------------------------------------------------------ | -----------------------------------------: | ---------------: |
| T-Rex on a Guard on a Walled center                    |                                     8 / 13 |           10 / 6 |
| T-Rex on a Guard on a Walled center with Field Defense |                                     7 / 16 |            9 / 9 |
| Raptor on a Fighter on a Walled center                 |                                     4 / 11 |            6 / 4 |
| Ankylosaurus on a Fighter on a Walled center           |                                     3 / 11 |            5 / 4 |

### 19.11 Charge!

The Triceratops (`LINEBREAKER`, displayed "Charge!") is the faction's
line-breaker: it walks up, hits a fortified defender as if it stood in the
open, shoves it back, and takes its tile. **Every `ATTACK` a land-form
Triceratops makes** (always at range 1) is a Charge! with four parts:

1. **Run-up.** `runUp = min(2, movedPathLength)` when `activation.moved` is
   true and `attacksUsed` is 0, otherwise 0; the attack gains +1 Attack per
   run-up tile (`runUpBonus2` 2, `RUN_UP_MAXIMUM_TILES_V7` 2):
   `attack = 3 + 1 (Alpha) + runUp`. Every tile the unit entered with its
   `MOVE` this turn counts, in any direction: tiles passed over own units,
   Road half-steps (three or four Road tiles still give +2), and an
   interrupted Move's truncated length. An unmoved or landed Triceratops
   has 0. The preview's `runUp` carries it, and `attack2` includes it.
2. **Ignores fortification.** The defender's Walls and Field Defense levels
   are removed for the whole exchange (damage and retaliation); cover stays.
   Walls are not destroyed. The preview sets `fortificationLevel: 0` and
   `fortificationIgnored` to the levels removed.
3. **Destroys Field Defense** on the target's tile, whoever owns it and
   whether or not either unit survives (reason `CATAPULT`).
4. **Push and follow.** A surviving defender is pushed one tile directly
   away from the Triceratops under the ordinary Push conditions
   ([section 13.4](#134-after-combat)); an Egg is never pushed. If the
   target was pushed and the Triceratops survived, it **follows** into the
   vacated tile under the advance conditions (land-form or Egg target, tile
   enterable by it: a Mountain needs Engineering). A blocked Push has no
   other effect. The defender is pushed even when the Triceratops dies in
   the exchange.

Parts 2–4 need no Move. Retaliation is ordinary (with the reduced Defense of
part 2) and comes before the Push, so the Triceratops may be bitten,
infected, or killed. It never captures: one that follows a defender onto a
hostile city or village center besieges it like any unit standing there. It
attacks once per turn, has no Raider Charge (`chargeApplied` false), and is
never Inspired. An embarked Triceratops cannot attack, and landing ends its
activation.

- **Order:** damage both ways (Armoured, Lifesteal); kill credit and growth;
  Field Defense destroyed; deaths, Graves, and risings; the Push of a
  surviving target, then the advance (after a kill) or the follow (after a
  Push); the death-blast chain, Plunder, reveals, and the tail. Events:
  `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; the death events;
  `UNIT_GREW`; `UNIT_PUSHED`; `UNIT_MOVED` (the one-tile advance or follow);
  the chain events; `PLUNDER_AWARDED`; `TILES_REVEALED`; the tail.
- **Cases.** A killed target that leaves a Grave or nothing: the Triceratops
  advances onto its tile. A target that rises in place, or dies on a
  Mountain the actor cannot enter: the Triceratops stays. A survivor with a
  free, legal tile behind it: pushed, and the Triceratops follows (off a
  center too, without capturing). A survivor whose tile behind is off the
  board, water (for a land target), occupied by any unit or Egg, a
  settlement site, a Mountain its owner cannot enter, allied to it, or
  unexplored by the actor: it stays, and so does the Triceratops. An afloat
  target attacked from shore is pushed over free legal water, and the
  Triceratops stays on land.
- **Preview.** `queryCombatPreviewV7` reports `push` (`WILL_PUSH`,
  `BLOCKED`, or `UNKNOWN_BEHIND_FOG`) and `advances` (a kill, or a Push it
  will follow). For a Charge! the preview reads the explored tile behind
  the target as resolution does, so `WILL_PUSH` and `BLOCKED` are exact;
  only a Mountain or Deep Water behind another player's unit stays
  `UNKNOWN_BEHIND_FOG`, because that owner's Engineering or Navigation is
  private (a Mountain behind a walker, flyer, or Mountain-born unit is
  exact: it needs no Engineering), and the attack may then push and follow. An unexplored tile
  behind never pushes.

Worked examples (engine formula, full HP, Grass, stage-0 Triceratops: 20 HP,
Attack 3, Defense 2):

| Target (HP, Defense)                        | Tiles moved | Attack | Defense used | Damage to target | Retaliation | Outcome                                       |
| ------------------------------------------- | ----------: | -----: | -----------: | ---------------: | ----------: | --------------------------------------------- |
| Fighter (12, 2)                             |           0 |      3 |            2 |                8 |           4 | pushed; the Triceratops follows               |
| Fighter (12, 2)                             |           1 |      4 |            2 |               12 |           — | dies; the Triceratops advances                |
| Guard (17, 3)                               |           2 |      5 |            3 |               14 |           5 | Guard at 3 HP, pushed                         |
| Guard on a Walled center with Field Defense |           2 |      5 |    3 (not 6) |               14 |           5 | Field Defense gone; Guard pushed off          |
| Guard in a Forest with Field Defense        |           2 |      5 |      3 × 1.5 |               12 |           6 | cover stays                                   |
| Zombie (18, 2) on Field Defense             |           2 |      5 |    2 (not 3) |               16 |           3 | the Zombie bites the Triceratops, then pushed |
| Ankylosaurus (20, 3)                        |           2 |      5 |            3 |      13 (14 − 1) |           5 | Armoured; pushed                              |
| Guard (17, 3), Alpha Triceratops (28 HP)    |           2 |      6 |            3 |               17 |           — | dies                                          |

### 19.12 Interactions with other rules

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, Raise Dead      | Dinosaur-faction land units leave Graves like any unit (in matches with an Undead seat); Eggs never do. A Grave may lie under an Egg, but Raise Dead needs a Grave with no unit on it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Infect, Bitten          | A Dinosaur-faction land unit killed by a Zombie rises as an ordinary Zombie (10 of 18 HP, 1 slot, no growth, may exceed capacity); dinosaurs are bitten and rise like Human units, and the Shaman cures them. An Egg is never bitten and, killed by a Zombie, is destroyed without rising.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Plague                  | Dinosaur-faction units are plagued, take 2 per Start Turn (an Ankylosaurus 1), spread it, and are cured by Tend Wounded. Eggs are never plagued, never receive or pass a spread, and a hatched unit starts unplagued. A Lich attack on an Egg damages it and plagues nothing there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Wail, Lich splash       | Wail hits dinosaurs and Eggs (a living faction) within its radius; an Egg defends with 1. Lich and Battleship splash hit hostile Eggs like any hostile unit, and the kills count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Lifesteal, Unanswered   | A Vampire heals by the damage it deals to a dinosaur or an Egg (after Armoured). A Vampire's attack draws no retaliation from a dinosaur. A Vampire attacked by a Triceratops retaliates, heals, and is then pushed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Goblin rules            | Gang Up counts the Goblin attacker's own helpers around a dinosaur or an Egg as usual; no Dinosaur attack has Gang Up. Blasts and bomb splash hit dinosaurs and Eggs with their fixed or splash damage (an Ankylosaurus takes 1 less). A Triceratops that kills an exploding unit advances and is then hit by its blast; a pushed survivor is pushed before the chain. An Egg destroyed by a Goblin attack, splash, or blast earns Plunder; Eggs lost with a city do not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Push, Overrun, Charge   | No Push (Juggernaut role or Charge!) ever moves an Egg or ends on an Egg's tile. A Knight, Scrap Buggy, or T-Rex that destroys an Egg advances and may attack again. Only Charge! follows a pushed target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Field Defense, Walls    | They give Human, Undead, and Goblin defenders their ordinary bonus against every Dinosaur attack except the Spitter's (none), the Triceratops's (none), and, with Wallbreaker, the Walls levels against any dinosaur. A Catapult may target an Egg at range 2–3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Cities, siege           | A besieged Dinosaur city cannot lay or train; its Eggs stay, count down, and hatch. An enemy that wants the city may ignore its Eggs: capture destroys them all. A Triceratops on a hostile center besieges it and never captures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Boats, water            | Eggs never embark or stand on water or a dock; a two-slot unit embarks like any other. Dinosaur boats are the Human boats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Achievements, Promotion | Muster counts hatched Dinosaur roles, never an Egg; Slayer counts a dinosaur's kills (growth does not reset them); a destroyed Egg is a kill for its killer. Promotion stays for the Caveman, the Shaman, and the boats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Martians                | Martian attacks, rays, and Pierce hit an Egg like any unit (Defense 1, no retaliation); an Egg is never a Mind Control or Tractor Beam target, and its tile never a Beam Down or pull destination. A Charge! on a Martian unit is absorbed by the Shield first and pushes and follows whatever it absorbed; Acid and Wallbreaker reach only a Martian foot unit's cover and Walls (machines have neither). An Ankylosaurus takes 1 less from every Martian hit. The two-slot Triceratops, T-Rex, and Brontosaurus are immune to Mind Control and the Tractor Beam; a Raptor, Spitter, or Ankylosaurus at 6 HP or less is not, and its Thrall has no growth. A collapsed Thrall and a mind-controlled unit are no kill for growth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Ice Folk                | An Egg cannot be Chilled (a Bolas on it is `TARGET_IMMUNE`; Cold Snap and the Cold Aura skip it) and is never shattered; it is an ordinary target of Ice Folk attacks (Defense 1, no retaliation), and a Sweep flank hit deals it 2. Dinosaurs are Chilled and shattered like any unit, the two-slot ones included (a Chilled T-Rex only by the hit that leaves it at 1 to 3 of its HP); a Brontosaurus (`JUGGERNAUT`) never. Growth from killing Ice Folk units is ordinary; its full heal takes a unit out of the Shatter window but removes no Chill. A Triceratops's Move ends on its first Snow tile, so its run-up inside Snow is at most the tiles up to that one; its Charge! ignores an Ice Folk defender's fortification, not its Snow cover, and a pushed unit keeps its Chill (a Mountain-born one may be pushed onto a Mountain). A Raptor's Pounce needs its first tile off Snow (Fieldcraft waives deep snow); a sluggish Raptor cannot Pounce, and a sluggish T-Rex that attacks without moving still Rampages. Acid ignores Snow cover; a Spitter's shot from distance 2 at an Ice Folk unit in its own Witch's Blizzard is halved. An Ankylosaurus takes 1 from a Sweep flank hit, Armoured applying before the Shatter test. Wallbreaker removes Walls levels, and the Ice Folk defender on that center still has no Snow cover. The Shaman's Tend Wounded cures Chill; War Drums and Hatch are primary actions a sluggish Shaman that moved cannot use. |
| Dwarves                 | Dinosaur-faction units and Eggs on the eight tiles around a surfacing Steam Mole take its eruption (2, 3 with Blasting Charges): an Ankylosaurus 1 (2), a 6-HP Egg is left at 4 (3), a 10-HP Egg with Nesting at 8 (7). A bomb hits any form: it leaves a 6-HP Egg at 1 (a Dive bomb destroys it) and takes 4 (Dive 5) from an Ankylosaurus. A destroyed Egg is the Mole's or the Gyrocopter's kill; a dinosaur grows from killing Dwarf units as from any kill. No Egg is laid, and no hatching, Push, Charge! push or follow, or Rampage ends, on a mound tile. The Triceratops's Charge! and Acid ignore Dig In with the rest of the fortification; Wallbreaker removes only the Walls levels, so Dig In stays. A two-slot dinosaur and an Egg are never knocked back by the Steam Cannon.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### 19.13 Commands, events, errors, and queries

- **Commands:** `LAY_EGG { kind, cityId, role, at }` (in
  `COMMAND_KIND_ORDER_V7` right after `TRAIN_NAVAL`) and
  `HATCH { kind, unitId, eggUnitId }` (right after `KABOOM`). `DISBAND`
  also accepts an own Egg. There is no `STAMPEDE` command: revision 20
  removed it, and a command object with that kind fails parsing like any
  unknown kind.
- **Events:** `EGG_LAID` and `EGG_HATCHED`
  (`{ playerId, unitId, role, at, cause: "TIME" | "SHAMAN", sourceUnitId }`)
  right after `NAVAL_UNIT_TRAINED`, and `UNIT_GREW` right after
  `UNIT_PROMOTED`, in `DOMAIN_EVENT_KIND_ORDER_V7`. `UNIT_DIED.cause` gains
  `CITY_CAPTURED`. There is no separate "Egg destroyed" event.
- **Combat preview** (`CombatPreviewV7`, so also `COMBAT_RESOLVED`):
  `runUp` (0–2, in `attack2`), `fortificationIgnored` (levels removed by
  Charge! or Wallbreaker), `acid`, `defenderArmoured`, and
  `attackerArmoured`; `push` and `advances` cover the Charge! Push and
  follow. Alpha needs no field (it is in `attack2`).
- **Errors:** `HATCH_NOT_LEGAL` (reasons `EMBARKED`, `NO_EGG`,
  `LAID_THIS_TURN`) and `UNIT_IS_EGG`; `LAY_EGG` reuses existing codes
  ([section 19.4](#194-laying-an-egg)).
- **Registration:** faction `DINOSAUR`, tree `DINOSAUR_BASELINE_V1`, display
  name "Dinosaur"; unlock kinds `NESTING { eggHp: 4, hatchTurns: 1, citySlots: 1 }`
  and `WALLBREAKER`; capabilities `eggHpBonus`, `eggHatchTurnReduction`,
  `nestingCityCapacityBonus`, and `ignoresCityWalls`; abilities `HATCH`,
  `ACID`, `ARMOURED`, `GROW`, and `LINEBREAKER`; faction rule
  `treasureUnitRole`; role mechanics `capacitySlots` (1 or 2), `hatchTurns`
  (null, or 1–4), `runUpBonus2` (0 or 2), and `armourReduction` (0 or 1);
  constants `EGG_HP_V7` 6, `EGG_DEFENSE2_V7` 2, `GROWTH_KILLS_V7` `[1, 3]`,
  `GROWTH_HP_V7` 4, `ALPHA_ATTACK2_V7` 2, and `RUN_UP_MAXIMUM_TILES_V7` 2.
- **`queryPlayerCommandsV7`** offers, for a Dinosaur seat, one `LAY_EGG` per
  legal `(city, role, nest tile)` in city-ID, role, then `(y, x)` order;
  `HATCH` for every Shaman and adjacent own Egg not laid this turn;
  `DISBAND` for own Eggs with Administration; and the Triceratops's ordinary
  `ATTACK` before and after its Move. It never offers `TRAIN` of an egg-laid
  role, Field Defense, `PROMOTE` for a dinosaur, or any other command for an
  Egg. Every offered command is accepted.
- **`previewLayEggV7(view, cityId, role)`** returns null unless the city is
  the viewer's and the role is egg-laid in its registration; otherwise
  `{ cityId, role, cost, slots, usedSlots, capacity, hp, turnsToHatch, nestTiles, unavailableReason }`,
  with `nestTiles` in `(y, x)` order and `unavailableReason` null or the
  rejection that applies whatever the tile (`CITY_ACTION_SPENT`,
  `CITY_BESIEGED`, `CITY_REWARD_PENDING`, `TECH_REQUIRED`, `INVALID_TILE`
  when no nest tile is free, `CITY_CAPACITY_FULL`, `INSUFFICIENT_COINS`).
- **`previewHatchV7(view, unitId, eggUnitId)`** returns null unless that
  `HATCH` is offered, otherwise `{ unitId, eggUnitId, role, at, hp, turnsSaved }`.
- `queryCombatPreviewV7` and `estimateCombatV7` include Alpha, Acid,
  Armoured, Charge! (the run-up from the unit's current `movedPathLength`,
  or a planned Move's length for an estimate), and Wallbreaker, and accept
  an Egg as the target. `previewAttackExplosionsV7` and every other public
  simulation apply the follow after a Push and the full-heal growth.
  `queryThreatenedTilesV7` gives a hostile Triceratops its ordinary
  move-then-melee reach.
- **Public unit stats** carry, for every unit of a Dinosaur seat, the
  `dinosaur` block: `capacitySlots`, `growthStage` (0–2, or null for a role
  that does not grow), `killsToNextStage` (or null), `armourReduction`,
  `acid`, `runUpBonus`, `runUpMaximum`, and `egg` (null, or
  `{ turnsRemaining, hatchesAs }`). An Egg's stat rows are HP, Attack 0,
  Defense 1, Move 0, Range 0, and Sight 0. The Attack row lists the source
  `RUN_UP` while the Triceratops can still attack this turn, and `ALPHA`
  for an Alpha; the HP row lists `GROWTH`.
- `previewCityCapacityV7` reports used slots (the sum), capacity (with
  Nesting), and each producible role's slots; `previewDisbandV7` covers
  Eggs. `PublicPlayerV7` and the leaderboard carry `DINOSAUR` and
  `DINOSAUR_BASELINE_V1`; the leaderboard unit count includes Eggs.

## 20. Martian faction rules

Humans are sustain, Undead are attrition, Goblins are a reckless horde,
Dinosaurs are few, big, and growing, and Martians are a **small high-tech
invasion force**: frail bodies behind energy Shields that recharge every
turn, heat rays that hit hard and then run hot, machines that walk or fly
over any terrain, troops beamed down from Saucers, and enslaved locals to
hold the front line. They are weak when rushed and focus-fired, and weak in a
sustained brawl. Every rule in this section applies only to units of a
`MARTIAN` seat, except where a rule names its target (Mind Control, the
Tractor Beam, and Pierce act on other players' units); in a match without
one the lists `shields`, `cooling`, `thralls`, and `mindControlCooldowns` are
empty, no `BEAM_DOWN`, `MIND_CONTROL`, or `TRACTOR_BEAM` is offered or
accepted, every role has movement mode `GROUND`, and every combat preview
has `rayPower: "NONE"`, `coolingApplied: false`, and both Shield damages 0.
Each rule resolves through the owner's registration (`FACTION_RULES_V7`,
`MARTIAN_ROLE_RULES_V7`, `MARTIAN_ROLE_MECHANICS_V7`) and the helpers of
`src/engine/v7/martian.ts`. Human, Undead, Goblin, Dinosaur, Ice Folk, and
Dwarf units keep every ability against Martians, with the Shield rules of
[section 20.2](#202-shields) applied to the damage they deal (Chill is not
damage and ignores Shields,
[section 21.14](#2114-interactions-with-other-rules); a Shield absorbs an
eruption and a bomb first,
[section 22.13](#2213-interactions-with-other-rules)).
Specification, per-unit battle analysis, decisions, and the tuning record:
the [Martian overlay](RULESET_7_MARTIANS.md) and the
[Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md) (the
`7r25` coarse pass on Dry Land).

### 20.1 Roles, machines, and labels

| Mechanical role | Martian unit       | Kind                 |
| --------------- | ------------------ | -------------------- |
| `FIGHTER`       | Grunt (and Thrall) | foot                 |
| `RAIDER`        | Saucer             | machine, flyer       |
| `MARKSMAN`      | Ray Gunner         | foot, ray unit       |
| `GUARD`         | Shield Projector   | foot                 |
| `CAPTAIN`       | Brain              | foot                 |
| `CATAPULT`      | Tripod             | machine, walker, ray |
| `KNIGHT`        | Mothership         | machine, flyer       |
| `JUGGERNAUT`    | Colossus           | machine, walker, ray |

- **Shielded units** are the eight Martian land roles in land or embarked
  form. Martian boats (the Human boats) and Thralls have no Shield.
- **Machines** have the movement mode `STRIDE` (walkers: Tripod, Colossus)
  or `FLY` (flyers: Saucer, Mothership); every other role of every faction
  is `GROUND`. The public abilities `STRIDE` and `FLY` mirror it. Machines
  never get cover or fortification, need no Engineering for a Mountain, and
  cross water without a Port
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)). **Foot
  units** move like any land unit.
- **Labels:** Rally is **Psychic Command** (the Brain) and the Raider Charge
  is **Strafe** (the Saucer); the commands, flags, and events are the shared
  ones (`RALLY`, `inspired`, `UNITS_RALLIED`; `chargeApplied`). The Tripod
  keeps the `SIEGE` and the Brain the `SUPPORT` label, so neither is ever
  Inspired; the Grunt, Thrall, Saucer, Ray Gunner, Shield Projector,
  Mothership, and Colossus are Psychic Command targets.
- **No Field Defense, no healer:** no Martian unit builds Field Defense, and
  the Brain has no Tend Wounded, so a Martian seat cures neither Plague nor
  Bitten. City Walls are unchanged: a Martian city may choose the Walls
  reward, and Walls fortify a Martian foot unit on its own center.
- **Treasure unit:** a Saucer (`treasureUnitRole` `RAIDER`). **Starting
  unit:** one Grunt. **Militia:** one Grunt. **Level-5+ reward:** a Colossus.
  Every new Martian unit (starting, trained, reward, treasure, Showcase)
  starts at its Shield maximum; a Thrall is created by Mind Control only.

### 20.2 Shields

- **Maximum** (role mechanic `shield`): Grunt, Saucer, Ray Gunner, Brain,
  and Tripod 2; Shield Projector and Colossus 3; Mothership 4. It is 0 for
  the boats, for a Thrall whatever its role says, and for every role of
  every other faction. No Shield in the game exceeds 4 (`SHIELD_CAP_V7`), so
  a hit of 5 always costs HP.
- **State.** `GameStateV7.shields: { unitId, shield }[]`, sorted by unit ID,
  has one entry for each unit on the board whose current Shield is at least
  1; a unit without an entry has Shield 0. State parsing rejects an entry
  without a unit on the board, a duplicate or unsorted entry, a `shield`
  that is not an integer from 1 to `max(maximum, FORCE_FIELD_SHIELD_V7)`,
  and an entry for a unit whose Shield maximum is 0 (so any entry in a match
  without a Martian seat, and any entry for a Thrall or a boat).
  `PlayerViewV7.shields` lists the visible units' entries: a visible unit's
  Shield and Shield maximum are public, like its HP.
- **Recharge** at its owner's Start Turn, after the reset, the city actions,
  and the Mind Control cooldown step and **before Plague**
  ([section 3](#3-players-turns-and-victory)): every shielded unit of that
  player on the board, land or embarked, has its Shield **set** to its
  maximum, or to `max(maximum, 4)` when the Force Field covers it
  ([section 20.3](#203-force-field-and-force-fields)). One
  `SHIELDS_RECHARGED { playerId, results: [{ unitId, shield }] }` lists the
  units whose Shield changed, in unit-ID order (none when nothing changed).
  The recharge is not healing: HP is untouched. A Shield recharges at no
  other time, except at End Turn with Force Fields.
- **Damage.** Every instance of damage to a unit is taken from its Shield
  first: `shieldDamage = min(shield, damage)` and
  `hpDamage = min(hp, damage − shieldDamage)`; the unit dies when its HP
  reaches 0. This applies to an attack's hit, the retaliation a unit takes
  as attacker, a splash or Pierce hit, a Wail hit, and a Kaboom or
  death-blast hit; Armoured (no Martian unit has it) applies before the
  Shield. **Plague damage bypasses the Shield.** The damage formula is
  unchanged: both forces use HP and maximum HP, a full Shield raises
  neither, and a hit is capped at Shield plus HP.
- **Derived effects use HP damage:** Lifesteal heals a Vampire by the HP
  damage it dealt; a Zombie bites only a unit that lost HP to its hit; a
  Lich plagues the primary and splash targets that lost HP (a hit a Shield
  absorbed completely plagues nobody, while an unshielded target of a hit of
  0 is still plagued, as before); Infect needs a kill. **Collateral damage
  uses the whole hit:** splash and Pierce are computed from
  `shieldDamage + hpDamage` on the primary target, then each victim's own
  Shield absorbs its share. Plague spread is not damage and ignores Shields.
  Kill credit, growth, Plunder, Graves, and death blasts follow deaths as
  usual.
- **Not damage, so never absorbed:** Push, the Charge! push and follow,
  Knockback, the Tractor Beam, Mind Control, Chill (a Bolas, a Cold Snap, or
  a Cold Aura), Field Defense destruction, and removals. A Shield absorbs a
  Sweep flank hit, a Dwarf eruption, and a Dwarf bomb like any damage, and
  Shatter reads the HP left after the Shield.
  Recovery, Windmill healing, Tend Wounded, Troll regeneration, Promotion,
  and growth change HP only.

Examples (engine formula, full HP, open Grass):

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

### 20.3 Force Field and Force Fields

- **Force Field** (the Shield Projector's `FORCE_FIELD`). A shielded unit is
  **covered** when, at the moment of a recharge, one of its owner's Shield
  Projectors in land form, other than itself, stands on one of the eight
  tiles around it. A covered unit recharges to `max(maximum, 4)`
  (`FORCE_FIELD_SHIELD_V7`): the Grunt, Saucer, Ray Gunner, Brain, and Tripod
  to 4 instead of 2, the Shield Projector and Colossus to 4 instead of 3,
  and the Mothership to its own 4. It is not cumulative (two Projectors still
  give 4) and is read at the recharge only: a unit that walks away keeps the
  Shield it has until its next recharge, a unit that walks next to a
  Projector gains nothing until then, and killing the Projector removes
  nothing already granted. The covered unit's form does not matter (an
  embarked unit next to a Projector on the shore is covered); the Projector
  must be in land form. Thralls and boats gain nothing.
- **Force Fields** (the Martian `FORTIFICATION`, Industry tier 2, requires
  Drill, ordinary tier-2 cost; capability `shieldsRechargeAtEndTurn`). While
  its owner has it, the recharge also runs at that owner's End Turn, after
  idle recovery, the expiry of Inspired and Overrun, and the Cooling step,
  and before the income preview, with the Force Field test made on the
  positions at that moment, emitting `SHIELDS_RECHARGED` like the Start Turn
  step. So Shield spent on retaliation during the owner's own attacks is back
  before the enemy moves, and a unit that ends its turn next to a Projector
  is covered during the enemy turn.

### 20.4 Heat rays and Cooling

Every `ATTACK` made by a land-form unit with `HEAT_RAY` (Ray Gunner, Tripod,
Colossus), at range 1 or 2, is a ray. It fires at **full power** when the
unit has not moved this turn (`activation.moved` false, an interrupted Move
counting as moved) and is not Cooling; otherwise at **half power**:

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

- The halving applies to the role's base Attack only; Psychic Command's +1
  comes after it. Everything else is the ordinary attack: range,
  visibility, the damage formula, retaliation from a defender that reaches
  the shooter, the advance of a Ray Gunner or Colossus after an adjacent
  kill, and Push for the Colossus at range 1.
- A ray unit's **retaliation** is not a ray: it depends on Defense, is never
  halved, and never causes Cooling.
- **Cooling.** A full-power ray (one that the attacker survives) leaves the
  unit Cooling until the end of its owner's next turn; a half-power ray
  changes nothing. So a ray unit that stands still fires full, half, full,
  half, and on its Cooling turn it loses nothing by moving.
  `GameStateV7.cooling: { unitId, firedThisTurn }[]` (sorted by unit ID): a
  full-power ray adds `{ unitId, firedThisTurn: true }`; a unit **is
  Cooling** exactly while its entry has `firedThisTurn` false. The **Cooling
  step** at the owner's End Turn removes every entry of that player's units
  with `firedThisTurn` false, then sets `firedThisTurn: false` on the
  others. Cooling changes nothing but the ray's power (not Defense, the
  Shield, Move, retaliation, or another ability), persists through embarking
  and landing, and ends when its entry is removed or the unit leaves the
  board. State parsing rejects an entry without a unit on the board whose
  role has `HEAT_RAY` under its owner's registration, a duplicate or unsorted
  entry, a non-boolean flag, and `firedThisTurn: true` for a unit of a
  player other than the active one. `PlayerViewV7.cooling` lists the visible
  units' entries: Cooling is public.
- The combat preview and `COMBAT_RESOLVED` carry `rayPower` (`"FULL"`,
  `"HALF"`, or `"NONE"`; `attack2` includes the halving) and
  `coolingApplied`. An estimate for an attack after a planned Move uses half
  power.

Worked examples (engine formula, full HP, open Grass, range 2; the damage
to the target, before the cap at its HP):

| Target (HP, Defense)                       | Ray Gunner full / half | Tripod or Colossus full / half | Marksman | Catapult |
| ------------------------------------------ | ---------------------: | -----------------------------: | -------: | -------: |
| Fighter (12, 2)                            |                  8 / 3 |                         12 / 5 |        5 |       10 |
| Guard (17, 3)                              |                  7 / 2 |                         10 / 4 |        4 |        8 |
| Guard on Field Defense                     |                  6 / 2 |                          9 / 3 |        3 |        7 |
| Guard on a Walled center                   |                  5 / 2 |                          8 / 3 |        3 |        6 |
| Raider or Marksman (12, 1), Knight (10, 1) |                 10 / 4 |                         14 / 6 |        6 |       12 |
| Zombie (18, 2)                             |                  8 / 3 |                         12 / 5 |        5 |       10 |
| Fighter, with Psychic Command              |                 12 / 6 |             — (never Inspired) |        — |        — |

Two turns of a shooter that stands still, against fresh targets: Ray Gunner
8 + 3 = 11 on Fighters (Marksman 5 + 5 = 10); Tripod 12 + 5 = 17 (Catapult
10 + 10 = 20).

### 20.5 Pierce and the Disintegrator

- **Pierce** (the Tripod's `PIERCE`, on every `ATTACK` it makes in land form,
  at full and half power). When the primary target stands in one of the
  eight directions from the Tripod (the offset's `|dx|` and `|dy|` are each 0
  or equal to the distance, at distance 1 or 2), the unit on the tile
  directly behind it (the target's tile plus one step in that direction) is
  also hit for `max(1, ceil(whole hit on the primary target / 2))`, where the
  whole hit is the Shield plus HP damage the target took (so it is capped at
  the target's Shield plus HP). A target at a knight's-move offset has no
  tile behind it. Pierce hits **any** unit on that tile, own, allied, or
  hostile, hidden or visible, of any form, Eggs included, under the splash
  rules with target mode `ALL`: no retaliation, no modifiers, Armoured and
  the victim's Shield apply, the death cause is `SPLASH`, hostile kills count
  for the Tripod, own or allied kills do not, and the Pierce entry is listed
  in the preview's `splash`. Pierce destroys no Field Defense on the pierced
  tile (the Tripod destroys it on the target tile as a `CATAPULT`-role
  attacker). Examples: a full-power ray on a Fighter (a whole hit of 12, a
  kill) pierces the Marksman behind it for 6; at half power 5 and 3; a
  full-power ray on a Guard 10 and 5.
- **Disintegrator** (the Martian `EXPLOSIVES`, Industry tier 3, requires
  Fortification, ordinary tier-3 cost; capability `raysIgnoreFortification`).
  It keeps Blast Mountain and the melee Field Defense demolition and adds:
  when a ray (full or half power) is fired by a unit whose owner has it, the
  defender's fortification level is 0 for the whole exchange, for the damage
  it takes and for its retaliation (the Charge! convention); cover stays,
  and Walls and Field Defense are not destroyed by this rule. The preview
  reports `fortificationLevel: 0` and the removed levels in
  `fortificationIgnored`. Example: a Ray Gunner's full ray on a Guard on a
  Walled center with Field Defense deals 7 instead of 5; a Tripod's 10
  instead of 7.

### 20.6 Movement: Stride, Flying, and crossing water

A **walker** (Tripod, Colossus) in land form:

- enters a Mountain without Engineering, in every rule that asks whether a
  unit may stand on a tile (`canEnterTerrainV7`: `MOVE`, `DISEMBARK`, the
  advance, Push and Tractor Beam destinations, Beam Down, treasure-unit
  placement, reward displacement, and their public twins);
- is never stopped by terrain (`terrainStopsMoveV7`): entering a Forest or a
  Mountain does not end its Move, while an unexplored cell and hostile ZOC
  still do;
- never gets cover or fortification (cover 1 on every terrain, fortification
  level 0 on every tile, Walls and Field Defense included);
- may cross Shallow Water inside a Move and end a Move on it (self-launch,
  below);
- exerts and suffers ZOC, uses Roads, passes only its owner's units, and is
  blocked by other units like any land unit.

A **flyer** (Saucer, Mothership, and the Dwarf Gyrocopter, which has the
same `FLY` movement mode,
[section 22.5](#225-gyrocopters-and-the-bombing-run)) in land form has every
walker rule, and:

- **passes over any unit:** a step onto a tile that holds a unit of any
  owner is entered as if it were empty, at any point of the path except the
  last; a flyer never ends a Move on an occupied tile, and no other player's
  unit passes it;
- **ignores hostile ZOC** (entering it never ends its Move) and **exerts no
  ZOC**;
- may cross Shallow Water, and Deep Water with Navigation, inside a Move;
- **cannot end a Move, or land from the water, on a neutral village center
  or on the center of a city it does not own** (`flyerMayStandOnSiteV7`): a
  `MOVE` or `DISEMBARK` that would is rejected with `MOVEMENT_ILLEGAL`
  (reason `SETTLEMENT_FORBIDDEN`) and never offered; a Move that enters such
  a center that was unexplored before the command is accepted and
  interrupted there (`UNIT_MOVE_INTERRUPTED` reason `SETTLEMENT_FORBIDDEN`),
  the flyer staying on the last tile it entered on which it may end a Move.
  It may stand on its owner's own center, where it blocks training like any
  unit. No other rule can put a flyer on a foreign or neutral center (Push,
  the Tractor Beam, and Beam Down never choose a settlement site), so a flyer
  never besieges, never blocks the capture of a foreign city, and never
  takes a village;
- **never advances** after a kill (`advancesAfterKill` false), never
  captures, and cannot Pillage;
- never destroys Field Defense by entering a tile (it is not on the
  ground); it still destroys it by attack under the ordinary reasons.

What stays ordinary for a flyer: a Move still ends on entering an
unexplored cell and reveals sight from every tile entered, water included;
it occupies its tile; anyone in range attacks it, and it retaliates at range
1; it can be pushed and pulled; it takes a treasure chest by ending a Move
on it; it recovers, is healed, plagued, bitten, and infected, and leaves a
Grave like any land unit. A unit is hidden only on an unexplored tile, so a
flyer meets a hidden unit only on the last tile of its Move, which is then
interrupted as usual.

**Crossing water.** Machines need no Port.

- **Inside a Move,** a flyer may step onto Shallow Water, and onto Deep Water
  if its owner has Navigation; a walker onto Shallow Water only
  (`canCrossWaterV7`). A water step costs what a land step costs, and the
  step that leaves a water tile costs a full point. The unit keeps its land
  form while the Move is validated; only the tile where the Move ends
  matters.
- **Self-launch.** A machine whose Move ends on a water tile, by choice or
  because the Move was stopped or interrupted there, **embarks** there with
  the ordinary result of embarking: form `EMBARKED`, the exhausted
  activation, and `UNIT_EMBARKED`. The tile needs no Port, and the owner
  needs no Shorecraft.
- **Afloat,** a machine is an ordinary embarked unit: Move 2, Defense 1,
  Sight 1, no Attack, no retaliation, no ZOC, no ability, Deep Water with
  Navigation (walkers too), and landing with `DISEMBARK` on an adjacent land
  cell it can enter (a Mountain included, under its movement mode), which
  ends its activation. It keeps its Shield and its Cooling entry, and on a
  hostile dock it blockades. It is drawn as the machine itself over the
  water, never as a boat.
- **Foot units** embark at an own active, empty Port or Shipyard with
  Shorecraft, exactly like Human land units.

**Rifts** (`pulp_wars-9s0.5`): a flyer may enter, cross, and end a Move on
a Rift, and land on it or be pushed, pulled, or placed there; a walker or
foot unit never; a unit on a Rift is immune to Mind Control, a flyer
killed there does not rise, and Beam Down never targets a Rift
([Rift overlay](RULESET_7_RIFT.md), implementing
[Martian overlay section 7.4](RULESET_7_MARTIANS.md#74-rift)).

### 20.7 Beam Down

`BEAM_DOWN { kind, unitId, passengerUnitId, to }` is a primary action of the
Saucer: it moves one own unit from a city to a tile next to the Saucer. It is
not an Attack, costs no Coins, needs no technology beyond the Saucer, and
spends no city action. Legality is checked in this order, the first failure
being the (atomic) rejection:

| #   | Requirement                                                                                                                                                                                                                           | Rejection                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                        | the ordinary unit errors                         |
| 2   | Its role has `BEAM_DOWN`.                                                                                                                                                                                                             | `UNIT_ROLE_INVALID { role }`                     |
| 3   | It has not used a primary action and has not landed this turn.                                                                                                                                                                        | `UNIT_ALREADY_ACTED`                             |
| 4   | It is in land form.                                                                                                                                                                                                                   | `BEAM_DOWN_NOT_LEGAL { reason: "EMBARKED" }`     |
| 5   | It has not moved this turn.                                                                                                                                                                                                           | `BEAM_DOWN_NOT_LEGAL { reason: "MOVED" }`        |
| 6   | `passengerUnitId` is another own unit on the board in land form, whose role uses one slot and whose movement mode is not `FLY`, standing on or next to the center of a city the actor owns. A Thrall or a Tripod qualifies.           | `BEAM_DOWN_NOT_LEGAL { reason: "NO_PASSENGER" }` |
| 7   | `to` is one of the eight tiles around the Saucer, land the passenger can enter (a Mountain needs Engineering unless it strides), with no unit and no treasure chest, not a settlement site, and not in territory allied to the actor. | `INVALID_TILE { action: "BEAM_DOWN" }`           |

- **Result.** The passenger stands on `to` with the exhausted activation (it
  cannot move or act until its owner's next Start Turn) and
  `captureEligible` false, whatever it had done this turn. It keeps its HP,
  Shield, kills, home city, Cooling, and statuses (it may be plagued or
  bitten). Field Defense on `to` is destroyed when the tile's territory
  belongs to a player hostile to the actor (reason `OCCUPATION`). The
  passenger reveals its sight; the Saucer has used its primary action.
- **Events:** `UNIT_BEAMED { playerId, unitId, passengerUnitId, from, to }`,
  `FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then the economy, reward, and
  achievement tail.
- Beam Down is not a Move: no path, ZOC, terrain stop, Road, treasure, or
  embarking. Every tile around a Saucer is explored by its owner, so the
  command is exact.

### 20.8 Mind Control

`MIND_CONTROL { kind, unitId, targetUnitId }` is a primary action of the
Brain: a weakened enemy becomes a Thrall. It is not an Attack and costs no
Coins. Legality, in this order (all rejections atomic):

| #   | Requirement                                                                                                                                                                     | Rejection                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                  | the ordinary unit errors                              |
| 2   | Its role has `MIND_CONTROL`.                                                                                                                                                    | `UNIT_ROLE_INVALID { role }`                          |
| 3   | It has not used a primary action and has not landed this turn (it may have moved).                                                                                              | `UNIT_ALREADY_ACTED`                                  |
| 4   | It is in land form.                                                                                                                                                             | `MIND_CONTROL_NOT_LEGAL { reason: "EMBARKED" }`       |
| 5   | It has no entry in `mindControlCooldowns`.                                                                                                                                      | `MIND_CONTROL_NOT_LEGAL { reason: "COOLDOWN" }`       |
| 6   | It controls fewer than `MIND_CONTROL_THRALL_LIMIT_V7` (2) Thralls.                                                                                                              | `MIND_CONTROL_NOT_LEGAL { reason: "THRALL_LIMIT" }`   |
| 7   | `targetUnitId` is a unit on the board that the actor can see.                                                                                                                   | `TARGET_NOT_FOUND`                                    |
| 8   | It is hostile to the actor.                                                                                                                                                     | `TARGET_ALLIED`                                       |
| 9   | It is in land form (not embarked, naval, or an Egg), its role is not `JUGGERNAUT`, it uses one slot, it is not on a settlement site or a Rift, and it is not a Dwarf construct. | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_IMMUNE" }`  |
| 10  | It is within Chebyshev distance 2 of the Brain (`MIND_CONTROL_RANGE_V7`).                                                                                                       | `MIND_CONTROL_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
| 11  | Its HP is at most `MIND_CONTROL_HP_V7` (6); a Shield does not count.                                                                                                            | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_HEALTHY" }` |

- **Result.** The target leaves the board as a **removal, not a death**: no
  `UNIT_DIED`, Grave, rising, death blast, kill credit, growth, or Plunder.
  Its Plague, Bitten, Shield, Cooling, and slot end with it, and everything
  that depends on it ends as if it had left the board (a Lich's Plagues are
  cleared with `PLAGUE_CLEARED`; a Brain's Thralls collapse). A **Thrall**
  appears on the same tile with the next entity ID, with `hp` equal to the
  target's HP ([section 20.9](#209-thralls)); it reveals its sight. The
  Brain has used its primary action and gets the cooldown entry
  `{ unitId, turnsRemaining: 2 }` (`MIND_CONTROL_COOLDOWN_TURNS_V7`).
- **Cooldown.** `GameStateV7.mindControlCooldowns: { unitId, turnsRemaining }[]`
  (sorted by unit ID, 0 to 2): at the Brain's owner's Start Turn, before the
  Shield recharge, each of that player's entries at 0 is removed and every
  other loses 1. So a Brain that used Mind Control on turn `N` cannot on
  `N + 1` and `N + 2` and can again on `N + 3`. The cooldown is public on a
  visible Brain (`PlayerViewV7.mindControlCooldowns`). State parsing rejects
  an entry without a unit on the board that has `MIND_CONTROL`, a duplicate
  or unsorted entry, and a value outside 0 to 2.
- **Events:** `UNIT_MIND_CONTROLLED { playerId, unitId, targetUnitId, targetOwnerId, targetRole, thrallUnitId, at, hp }`;
  `UNIT_DIED` (cause `BRAIN_LOST`) for each Thrall that collapses when the
  target was a Brain; `TILES_REVEALED`; the tail; the naval blockade and
  sea-network events; `PLAGUE_CLEARED`.
- Only visible units are targets and no tile changes, so the preview equals
  the result. A plagued or bitten Brain may use Mind Control, and a Thrall of
  another Martian seat is a legal target.

### 20.9 Thralls

A **Thrall** is a unit of the `FIGHTER` role owned by a Martian seat with an
entry in `GameStateV7.thralls: { unitId, brainUnitId }[]` (sorted by unit
ID). It resolves through the Martian registration, so it fights with the
**Grunt's** Attack, Defense, Move, range, Sight, maximum HP (10), and
abilities (`ATTACK`, `CAPTURE`); the entry changes exactly this:

| Rule              | Thrall                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Label and art     | "Thrall"; its own sprite                                                                                                              |
| HP when created   | the victim's HP at the Mind Control (1 to 6); it recovers and is healed toward 10                                                     |
| Shield            | none: its Shield maximum is 0 and a Force Field never covers it                                                                       |
| Home and capacity | `homeCityId` is always null: it uses no slot in any city, is never re-homed (not even by a capture it makes), and counts as an orphan |
| Activation        | created exhausted, with 0 kills, `veteran` false, and `captureEligible` false; ordinary from its owner's next Start Turn              |
| Promotion         | never: `PROMOTE` is not offered and is rejected with `PROMOTION_NOT_ELIGIBLE`                                                         |
| Disband           | never: not offered, rejected with `DISBAND_NOT_LEGAL { reason: "THRALL" }`                                                            |
| Capture, Pillage  | yes, as a Grunt                                                                                                                       |
| Statuses          | living: plagued, bitten, and infected like any unit                                                                                   |
| Psychic Command   | a target (its tactical label is `LINE`)                                                                                               |
| Beam Down         | a legal passenger                                                                                                                     |
| Muster            | counts as the `FIGHTER` role                                                                                                          |

- **Limit.** A Brain controls at most 2 Thralls at a time.
- **Collapse.** When a Brain leaves the board (killed, infected,
  disbanded, mind-controlled, or removed by reward displacement), every
  Thrall whose `brainUnitId` names it is removed at once, in unit-ID order,
  each with `UNIT_DIED { cause: "BRAIN_LOST" }`: a removal, with no kill
  credit, Plunder, Grave, rising (even if Bitten), or growth. It happens
  right after the Brain's own death events (its `UNIT_DIED`, Grave, or
  rising) and before the advance, Push, and any chain of the same command.
  The Thralls of an eliminated seat are removed with its other units (cause
  `ELIMINATION`). A Thrall whose Brain embarks keeps its link.
- **State parsing** rejects an entry without a unit on the board, or with a
  `brainUnitId` that is not a unit of the same owner on the board whose role
  has `MIND_CONTROL`; a duplicate or unsorted entry; more than 2 entries for
  one Brain; a Thrall whose owner is not a Martian seat, whose role is not
  `FIGHTER`, whose form is not `LAND` or `EMBARKED`, whose `homeCityId` is
  not null, whose `veteran` is true, or whose `maxHp` is not the `FIGHTER`
  role's; a Thrall with a `shields` entry; and any entry in a match without
  a Martian seat.
- **View.** `PlayerViewV7.thralls` lists `{ unitId, brainUnitId }` for every
  visible Thrall, with `brainUnitId` null when the viewer cannot see the
  Brain.

### 20.10 Tractor Beam

`TRACTOR_BEAM { kind, unitId, targetUnitId }` is a primary action of the
Mothership: it pulls a unit two tiles away **one tile toward itself**, the
mirror of Push. It deals no damage, is not an Attack, and costs no Coins.

- **Actor.** The actor's own Mothership (`TRACTOR_BEAM`) in land form that
  has not used a primary action and has not landed this turn (it may have
  moved).
- **Target.** A unit on the board the actor can see, **own or hostile**
  (never allied), at Chebyshev distance **exactly 2**
  (`TRACTOR_BEAM_RANGE_V7`), in any form, that is not an Egg, whose role is
  not `JUGGERNAUT`, and that uses one slot.
- **Destination.** The target's tile plus `(sign(dx), sign(dy))` of the
  offset toward the Mothership, always next to it. The pull happens only
  when the destination passes the Push conditions of
  [section 13.4](#134-after-combat) (no unit, not a settlement site, the
  same land or water kind as the target's tile, enterable by the target, not
  in territory allied to the target) and holds no treasure chest. For an own
  target, Mountain and Deep Water entry use the actor's Engineering and
  Navigation (a walker, flyer, or Mountain-born unit needs no Engineering);
  for another player's unit, whose technologies the actor cannot see, the
  rule reads the board: it is pulled onto a Mountain only if it strides,
  flies, is Mountain-born, or stands on a Mountain, and onto Deep Water only
  if it stands on Deep Water.
- **Result.** The target stands on the destination and keeps its HP,
  Shield, statuses, and activation (an own unit that has not acted may still
  act, and an own ray unit that has not moved still fires at full power);
  its `captureEligible` becomes false. Nothing on either tile changes (no
  Field Defense destroyed, no treasure taken). An own target reveals its
  sight. The Mothership has used its primary action.
- **Rejections (atomic):** the ordinary unit errors; a role without
  `TRACTOR_BEAM` → `UNIT_ROLE_INVALID { role }`; primary action used or
  landed → `UNIT_ALREADY_ACTED`; embarked →
  `TRACTOR_BEAM_NOT_LEGAL { reason: "EMBARKED" }`; unknown, dead, or unseen
  target → `TARGET_NOT_FOUND`; allied target → `TARGET_ALLIED`; an Egg, a
  `JUGGERNAUT`-role unit, or a two-slot unit →
  `TRACTOR_BEAM_NOT_LEGAL { reason: "TARGET_IMMUNE" }`; another distance →
  `TRACTOR_BEAM_NOT_LEGAL { reason: "OUT_OF_RANGE" }`; an illegal destination
  → `TRACTOR_BEAM_NOT_LEGAL { reason: "BLOCKED" }`. Such a target is never
  offered.
- **Events:** `UNIT_PULLED { sourceUnitId, targetUnitId, from, to }`,
  `TILES_REVEALED`, the tail, and the naval blockade and sea-network events
  (a pull can take a blockader off a dock).
- A defender pulled off a city center leaves the Walls and the center
  empty, a defender pulled off Field Defense loses it, and a besieger pulled
  off an own center lifts the siege. There is no capture in the same turn: a
  capture needs a unit that began its owner's turn on the center.

### 20.11 Interactions with other rules

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, Raise Dead      | Martian land-form units, flyers and Thralls included, leave Graves like any unit (in matches with an Undead seat). A mind-controlled victim and a collapsed Thrall leave none; neither does an embarked machine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Infect, Bitten          | A Martian unit killed by a Zombie rises as an ordinary Zombie (10 of 18 HP, no Shield, one slot); a Brain that rises has left the board, so its Thralls collapse. A Zombie bites a Martian unit only when its hit cost HP. A collapsed Bitten Thrall does not rise. No Martian unit cures a bite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Plague                  | A Lich plagues only the targets that lost HP; Plague damage bypasses the Shield and spread ignores Shields. A mind-controlled Lich has left the board: its Plagues are cleared. No Martian unit cures Plague.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Wail, Lifesteal         | Wail hits Martian units with the ordinary formula, the Shield absorbing first. A Vampire heals by the HP damage it dealt, not what a Shield absorbed; a Martian unit never retaliates against it. A Zombie, Ghoul, or Skeleton that becomes a Thrall loses every Undead ability.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Goblin rules            | Gang Up counts the Goblin attacker's helpers around a Martian target; no Martian attack has Gang Up. Blasts and bomb splash are absorbed by the Shield first. A mind-controlled exploding unit is removed and does not explode; a pulled one keeps everything. Plunder counts Martian kills, never a collapse or a Mind Control.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Dinosaur rules          | Martian attacks, rays, and Pierce hit Eggs; Eggs are never Mind Control or Tractor Beam targets. A Charge! is absorbed by the Shield first and pushes and follows whatever it absorbed. Acid and Wallbreaker matter only for a Martian foot unit. An Ankylosaurus takes 1 less from every Martian hit. The two-slot dinosaurs are immune to Mind Control and the Tractor Beam.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Human abilities         | Field Defense and Walls give a non-Martian defender their bonus against every Martian attack except a ray fired with the Disintegrator; a Tripod attack destroys Field Defense on the target tile. A Knight that kills a Martian unit advances and may attack again. A Juggernaut-role unit pushes a Martian unit under the ordinary conditions. The Catapult out-ranges every ray.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Cities, siege, capacity | Capture-capable: Grunt, Ray Gunner, Shield Projector, Colossus, Thrall. A foot unit or walker on a hostile center besieges it; a flyer is never there. Machines are never fortified. Slots: Mothership and Colossus 2, Thralls none; Martian cities have no capacity bonus. Beam Down, Mind Control, and the Tractor Beam spend no city action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Boats, water            | Martian boats are the Human boats. Foot units embark at Ports; machines self-launch on any water they may enter. An embarked Martian unit keeps its Shield, cannot attack, retaliate, or use an ability, and can be pulled from water to water.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Achievements, Promotion | Muster counts a Thrall as the `FIGHTER` role and excludes the Colossus; Sea Dog never counts an afloat machine. Promotion (3 kills, +5 maximum HP, full heal of HP, Shield unchanged) applies to every Martian unit except the Thrall; ray, hostile Pierce, and retaliation kills count; Mind Control is not a kill.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Ice Folk                | Chill is not damage and ignores Shields: a shielded unit is Chilled whatever its Shield. Shatter reads the HP after the Shield, so a Chilled unit at 1 to 3 HP is shattered by a hit its full Shield absorbs entirely; a Shield absorbs a Sweep flank hit, a Rockfall, and a Boulder like any damage (in a Force Field a Chilled Grunt takes three Yeti hits, not two). A ray fired from distance 2 at an Ice Folk unit in its own Witch's Blizzard is halved after its full or half power, and a Pierce hit derives from the halved hit; the Disintegrator leaves an Ice Folk unit on its Walled center with neither fortification nor Snow cover. Martian walkers and flyers ignore deep snow, and flyers ZOC; they are Chilled and shattered like any unit (the Mothership too), never the Colossus. A ray unit that stands still loses nothing to frost; a sluggish Saucer cannot Strafe, and a sluggish Brain or Mothership that moved cannot use Mind Control, Psychic Command, or the Tractor Beam. A Chilled unit may be mind-controlled (its entry ends; the Thrall is a new, unchilled Martian unit), a mind-controlled or shattered Witch takes her Blizzard with her, a shattered Brain's Thralls collapse, and the Frost Giant is immune to Mind Control and the Tractor Beam (`JUGGERNAUT`). The Tractor Beam pulls an Ice Folk unit off Snow, out of a Blizzard, or off Walls, and a Mountain-born unit onto a Mountain; a pulled or beamed unit keeps its Chill. A self-launched machine cannot be Chilled or shattered while afloat. |
| Dwarves                 | A Shield absorbs an eruption and a bomb first: an eruption of 2 does nothing to a full Shield of 2 (3 puts 1 through); a bomb of 5 puts 3 through a Shield of 2 (Dive 6: 4) and 1 through a Force Field's 4 (Dive: 2); an eruption at the Dwarves' Start Turn strips a Shield for the rest of their turn. Eruptions never hit flyers (Saucer, Mothership) but hit walkers (Tripod, Colossus), foot units, and Thralls; bombs hit any form. The two constructs are immune to Mind Control (`TARGET_IMMUNE`); every other Dwarf land role is a target under the ordinary conditions (the Gyrocopter not on a Rift), and a Thrall made from a Dwarf unit has no Dwarf rule. A mound is never a Mind Control, Tractor Beam, or Pierce target, and no pull or Beam Down ends on one; a pulled Dwarf unit keeps its `moved` flag, and its Dig In is read on its new tile. The Disintegrator ignores Dig In like all fortification. The Saucer and the Gyrocopter share the flight rule; a Saucer with Strafe kills a landed Gyrocopter (8 of 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### 20.12 Commands, events, errors, and queries

- **Commands:** `BEAM_DOWN { kind, unitId, passengerUnitId, to }`,
  `MIND_CONTROL { kind, unitId, targetUnitId }`, and
  `TRACTOR_BEAM { kind, unitId, targetUnitId }`, in that order right after
  `HATCH` in `COMMAND_KIND_ORDER_V7` (the Ice Folk `THROW_BOLAS` and
  `COLD_SNAP`, then the Dwarf `TUNNEL`, `BOMB_RUN`, and `ASSEMBLE` follow
  them). `MOVE` accepts a machine's path over and onto
  water and a flyer's path over units, with an unchanged shape. A pending
  city reward blocks the three commands like every command.
- **Events** (`DOMAIN_EVENT_KIND_ORDER_V7`): `SHIELDS_RECHARGED` right after
  `UNITS_REGENERATED`, `UNIT_BEAMED` right after `UNIT_DISEMBARKED`,
  `UNIT_PULLED` right after `UNIT_PUSHED`, and `UNIT_MIND_CONTROLLED` right
  after `UNIT_INFECTED`. `UNIT_DIED.cause` gains `BRAIN_LOST`. There is no
  event for the start or end of Cooling or for a cooldown: the view lists
  are the source. `PLAGUE_DAMAGED` entries carry no `shieldDamage`.
- **Combat preview** (`CombatPreviewV7`, so also `COMBAT_RESOLVED`):
  `rayPower` (`"FULL"`, `"HALF"`, or `"NONE"`), `coolingApplied`,
  `defenderShieldDamage`, and `attackerShieldDamage`; `damageToDefender` and
  `damageToAttacker` stay HP damage, and the whole hit is the sum. Splash
  entries (a Pierce victim among them), Wail results, and explosion results
  carry `shieldDamage` next to their HP `damage`. The Disintegrator reports
  `fortificationLevel: 0` and `fortificationIgnored`.
- **Errors:** `BEAM_DOWN_NOT_LEGAL` (reasons `EMBARKED`, `MOVED`,
  `NO_PASSENGER`), `MIND_CONTROL_NOT_LEGAL` (`EMBARKED`, `COOLDOWN`,
  `THRALL_LIMIT`, `TARGET_IMMUNE`, `OUT_OF_RANGE`, `TARGET_HEALTHY`), and
  `TRACTOR_BEAM_NOT_LEGAL` (`EMBARKED`, `TARGET_IMMUNE`, `OUT_OF_RANGE`,
  `BLOCKED`); `DISBAND_NOT_LEGAL` gains the reason `THRALL`; the movement
  failure reasons and `UNIT_MOVE_INTERRUPTED` gain `SETTLEMENT_FORBIDDEN`;
  `INVALID_TILE` gains the action `BEAM_DOWN`. A flyer's Pillage is rejected
  with `PILLAGE_INVALID_TARGET`.
- **Registration:** faction `MARTIAN`, tree `MARTIAN_BASELINE_V1`, display
  name "Martian"; unlock kinds `BRAIN_SUPPORT`, `FORCE_FIELDS`, and
  `DISINTEGRATOR`; capabilities `shieldsRechargeAtEndTurn` and
  `raysIgnoreFortification`; abilities `HEAT_RAY`, `PIERCE`, `FORCE_FIELD`,
  `BEAM_DOWN`, `MIND_CONTROL`, `TRACTOR_BEAM`, `FLY`, and `STRIDE`; role
  mechanics `shield` (0 to 4) and `movementMode` (`GROUND`, `STRIDE`,
  `FLY`), with `capacitySlots`, `buildsFieldDefense`, and
  `advancesAfterKill` as [section 11](#11-unit-roster) states; faction rule
  `treasureUnitRole` `RAIDER`; constants `FORCE_FIELD_SHIELD_V7` 4,
  `SHIELD_CAP_V7` 4, `MIND_CONTROL_HP_V7` 6, `MIND_CONTROL_RANGE_V7` 2,
  `MIND_CONTROL_COOLDOWN_TURNS_V7` 2, `MIND_CONTROL_THRALL_LIMIT_V7` 2, and
  `TRACTOR_BEAM_RANGE_V7` 2.
- **`queryPlayerCommandsV7`** offers, for a Martian seat, `MOVE` commands
  under the Stride, Flying, and water rules; `BEAM_DOWN` for every legal
  `(Saucer, passenger, destination)` in unit-ID, passenger-ID, then `(y, x)`
  order; and `MIND_CONTROL` and `TRACTOR_BEAM` for every legal target. It
  never offers Field Defense, Tend Wounded, `PROMOTE` or `DISBAND` for a
  Thrall, a flyer's Move or landing onto a forbidden center, or Pillage for a
  flyer. Every offered command is accepted.
- **`previewBeamDownV7(view, unitId, passengerUnitId)`** returns null unless
  a `BEAM_DOWN` with that pair is offered, otherwise
  `{ unitId, passengerUnitId, from, destinations, fieldDefenseDestroyed }`
  with the legal tiles in `(y, x)` order and those that would lose Field
  Defense.
- **`previewMindControlV7(view, unitId, targetUnitId)`** returns null unless
  that command is offered, otherwise
  `{ unitId, targetUnitId, at, thrallHp, thrallMaxHp, thrallsAfter, thrallLimit, cooldownTurns, collapsingUnitIds, plagueCleared }`.
- **`previewTractorBeamV7(view, unitId, targetUnitId)`** returns null unless
  that command is offered, otherwise
  `{ unitId, targetUnitId, from, to, fortificationLost, emptiesCenterOfCityId, liftsSiegeOfCityId }`.
- `queryCombatPreviewV7` and `estimateCombatV7` include Shields, ray power
  (from the unit's `moved` flag and Cooling; half power for an attack after
  a planned Move), Pierce on a visible unit, and the Disintegrator;
  `previewAttackExplosionsV7`, `previewKaboomV7`, and `previewWailV7` apply
  Shields to every listed hit, and `previewAttackExplosionsV7` flags
  `touchesUnexplored` when the tile behind a Pierce target is unexplored.
  `queryThreatenedTilesV7` gives a visible flyer its flying reach, a walker
  its striding reach, and a ray unit range 2 from every tile it can reach;
  it adds nothing for Mind Control or the Tractor Beam, which deal no
  damage.
- **Public unit stats** carry, exactly for units of a Martian seat, the
  `martian` block: `shield`, `shieldMaximum`, `capacitySlots` (0 for a
  Thrall), `movementMode`, `rayPower` (what an attack made now would be, or
  null), `cooling`, `pierce`, `forceField`, `thrall` (null, or
  `{ brainUnitId }`), and `mindControl` (null, or
  `{ cooldown, thralls, thrallLimit }`). A Shield row follows the HP row
  (with the `FORCE_FIELD` source above the maximum), and the Attack row lists
  the source `HALF_POWER`.
- `previewCityCapacityV7` counts Martian slots and no Thrall;
  `previewDisbandV7` never covers a Thrall. `PublicPlayerV7` and the
  leaderboard carry `MARTIAN` and `MARTIAN_BASELINE_V1`; the leaderboard unit
  count includes Thralls.

## 21. Ice Folk faction rules

Humans are sustain, Undead are attrition, Goblins are a reckless horde,
Dinosaurs are few, big, and growing, Martians are a small high-tech
invasion force, and the Ice Folk are **the things from the peaks**: Yetis
that walk over Mountains nobody else can cross, hunters who wrap an enemy in
frost so that the next blow breaks it into pieces, an Ice Witch under whom
the ground is winter, and a mammoth that swings at three units at once. They
are strong on their own Snow and around the Witch, they usually strike
first, and they finish frozen units without a blow in return; they are weak
against cheap packs, against fresh bodies that are never left wounded in
reach, and wherever the Witch is not. Every rule in this section applies
only to units of an `ICE_FOLK` seat, except where a rule names its target
(Chill and Shatter act on other players' units, and deep snow stops them);
in a match without one the list `chilled` is empty, no tile is Snow or
Blizzard (the view flags are false), no `THROW_BOLAS` or `COLD_SNAP` is
offered or accepted, every role has `mountainBorn` false, the shared rules
`unitMayActAfterMoveV7` and `canEnterTerrainV7` return what the role flag
and Engineering returned before, every `curedChill` is false, every unit's
`chill` stat is null, and the eight Ice Folk combat-preview fields are
false. Each rule resolves through the owner's registration
(`FACTION_RULES_V7`, whose `snow` rule is true only for the Ice Folk,
`ICE_FOLK_ROLE_RULES_V7`, `ICE_FOLK_ROLE_MECHANICS_V7`) and the helpers of
`src/engine/v7/ice-folk.ts`. Human, Undead, Goblin, Dinosaur, Martian, and
Dwarf units keep every ability against the Ice Folk, with the rulings of
[section 21.14](#2114-interactions-with-other-rules). Specification,
per-unit battle analysis, decisions, root rulings, and the tuning record:
the [Ice Folk overlay](RULESET_7_ICE_FOLK.md) and the
[Ice Folk balance report](../validation/RULESET_7_ICE_FOLK_BALANCE.md) (the
`7r27` coarse pass on Dry Land).

### 21.1 Roles, Mountain-born, and labels

| Mechanical role | Ice Folk unit | Kind                                    |
| --------------- | ------------- | --------------------------------------- |
| `FIGHTER`       | Yeti          | Mountain-born; Rockfall                 |
| `RAIDER`        | Sled          | Chill source (Bolas); Charge            |
| `MARKSMAN`      | Snow Hunter   | Cold Blood                              |
| `GUARD`         | Mammoth       | Sweep and Trample                       |
| `CAPTAIN`       | Ice Witch     | Blizzard; Chill source (Cold Snap)      |
| `CATAPULT`      | Boulder Yeti  | Boulders; Planted; Mountain-born        |
| `KNIGHT`        | Sabretooth    | Prowl; no Glide                         |
| `JUGGERNAUT`    | Frost Giant   | Chill source (Cold Aura); Mountain-born |

- **Ice Folk units** are the eight land roles in land form. The Snow rules,
  Shatter, and the Blizzard's protection never apply to an Ice Folk boat (the
  Human boats) or to an embarked unit. Snow works **per faction** and the
  Blizzard's protection **per seat** ([section 21.6](#216-the-blizzard-and-cold-snap)).
- **Chill sources** are the Sled (Bolas), the Ice Witch (Cold Snap), and the
  Frost Giant (Cold Aura). No attack applies Chill.
- **Tactical labels** are the Human ones of the same mechanical role: the
  Mammoth is `DEFENDER`, the Ice Witch `SUPPORT`, and the Boulder Yeti
  `SIEGE`. They have no rule effect for the Ice Folk (the faction has no
  Rally).
- **No Field Defense, no healer:** no Ice Folk unit builds Field Defense,
  and the Witch has no Tend Wounded, so an Ice Folk seat cures neither
  Plague, Bitten, nor Chill; it heals by Recover, Windmills, and Promotion
  only. City Walls are unchanged: an Ice Folk city may choose the Walls
  reward, and Walls fortify an Ice Folk unit on its own center, which then
  has no Snow cover.
- **Treasure unit:** a Sled (`treasureUnitRole` `RAIDER`). **Starting
  unit:** one Yeti. **Militia:** one Yeti. **Level-5+ reward:** a Frost
  Giant. Capture-capable: Yeti, Sled, Snow Hunter, Mammoth, Frost Giant.
  Every Ice Folk land unit except the Frost Giant is trained on the city
  center with `TRAIN`.

### 21.2 Chill

**State.** `GameStateV7.chilled: { unitId, sluggish, turnsLeft }[]`, sorted
by unit ID, is the only stored Ice Folk state (hashed, saved, and replayed
like `plagued` and `bitten`). The legal entries are
`{ sluggish: true, turnsLeft: 2 }`, `{ false, 2 }`, `{ false, 1 }`, and
`{ false, 0 }`. A unit is **Chilled** exactly while its entry has
`turnsLeft` of at least 1; an entry with `turnsLeft` 0 is **thawing**: the
unit is not Chilled and nothing applies to it, except that a Chill applied
now is not a new freeze. State parsing rejects an entry without a unit on
the board, a duplicate or unsorted entry, a `turnsLeft` other than 0, 1, or
2, `sluggish: true` with a `turnsLeft` other than 2, an entry for a unit
whose form is `NAVAL` or `EGG`, and any entry in a match without an Ice
Folk seat. `PlayerViewV7.chilled` lists the entries of every visible unit,
with both fields: Chill is public, like Plague and Bitten.

**Applying Chill** to a unit (`CHILL_TURNS_V7` 2):

```text
no entry                       → add { sluggish: true, turnsLeft: 2 }   (a new freeze)
has an entry (thawing or not)  → set turnsLeft to 2; sluggish is not changed
```

- **Who can be Chilled:** a unit on the board in **land form** that is
  hostile to the source's owner, of any role and faction (`JUGGERNAUT`
  roles, two-slot units, flyers, walkers, Thralls, and another Ice Folk
  seat's units included). Never an embarked unit, a naval unit, an Egg, or
  an own or allied unit.
- Chill is **not damage**: a Martian Shield does not absorb or block it, and
  cover, fortification, Armoured, and Walls do not matter. No source deals
  damage, draws retaliation, or is an attack; each emits one
  `UNITS_CHILLED { playerId, sourceUnitId, source, results }` (`source`
  `BOLAS`, `COLD_SNAP`, or `COLD_AURA`; `results` the targets' entries after
  the application, in unit-ID order).

**Duration.** At the end of a player's turn, after idle recovery, the
expiry of Inspired and Overrun, the Cooling step, and the Force Fields
recharge, and before the income preview, every entry of that player's units
is updated, with no event (the view list is the source):

```text
sluggish := false
turnsLeft 0  → the entry is removed
otherwise    → turnsLeft := turnsLeft − 1
```

So one application gives **two Ice Folk turns of Shatter eligibility and
one sluggish turn**:

| When                                | Chilled once on Ice Folk turn `N`                         | Chilled again on every Ice Folk turn         |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| Ice Folk turn `N` (after the Chill) | Chilled: Shatter-eligible                                 | Chilled                                      |
| The unit's owner's next turn        | **sluggish**                                              | **sluggish**                                 |
| Ice Folk turn `N + 1`               | still Chilled                                             | Chilled (`turnsLeft` back to 2)              |
| The owner's following turn          | not sluggish; the Chill ends at its end                   | not sluggish                                 |
| Ice Folk turn `N + 2`               | thawing: not Chilled, and a Chill now is not a new freeze | Chilled, and so on: **never sluggish again** |
| The owner's turn after that         | the entry is removed at its end                           | not sluggish                                 |
| Ice Folk turn `N + 3`               | no entry: a Chill is a new freeze                         | Chilled                                      |

- A unit Chilled again while Chilled stays Shatter-eligible and is not made
  sluggish again (no kite lock). Frost that lapses resets: a unit can be
  made sluggish at most on every third turn of its owner, and only after a
  whole Ice Folk turn without Shatter eligibility.
- **Removal.** The entry is removed when the unit leaves the board for any
  reason (death, rising, Disband, Mind Control, displacement, elimination).
  Tend Wounded sets it to thawing ([section 10](#10-recovery-and-support)).
  Embarking, landing, Promotion, growth, a Push, a Tractor Beam pull, Beam
  Down, and a change of home do not remove it; while the unit is embarked
  the entry has no effect and still counts down.

### 21.3 Sluggish: move or act, not both

A unit whose entry has `sluggish: true` is **sluggish** (Frozen). **A
sluggish unit that has moved this turn cannot use a primary action, and a
sluggish unit is never granted Escape.** Since no unit moves after a primary
action, on its sluggish turn a unit either makes its Move and nothing else,
or stays where it is and acts.

| Action                                                                                                                                                      | Sluggish, not moved | Sluggish, moved                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------- |
| `MOVE` (a Move that embarks or self-launches included)                                                                                                      | legal, once         | already used                            |
| `ATTACK`, `RALLY`, `TEND_WOUNDED`, `HATCH`, `RAISE_DEAD`, `DEVOUR`, `WAIL`, `KABOOM`, `PILLAGE`, `MIND_CONTROL`, `TRACTOR_BEAM`, `THROW_BOLAS`, `COLD_SNAP` | legal               | `UNIT_ALREADY_ACTED`                    |
| `BEAM_DOWN`, `RECOVER`, `CAPTURE`, `BUILD_FIELD_DEFENSE` (each needs an unmoved unit anyway)                                                                | legal               | rejected as for any moved unit          |
| `DISEMBARK` (landing ends the activation anyway)                                                                                                            | legal               | legal under the ordinary landing budget |
| `PROMOTE`, `DISBAND`, `WAIT` (not primary actions)                                                                                                          | legal               | legal                                   |
| Escape after an Attack                                                                                                                                      | not granted         | —                                       |

- "Has moved" is the activation flag `moved`, as the Guard rule reads it:
  an interrupted Move counts, even one that left the unit where it was.
- The advance after a kill, an Overrun, Ram, or Rampage continuation, a
  Push, and a Charge! follow are not Moves: a sluggish Knight, Scrap Buggy,
  or T-Rex that attacks without moving and kills still advances and may
  continue. A sluggish Triceratops attacks with no run-up, or moves; a
  sluggish Raider, Ghoul, Wolf Rider, Raptor, Saucer, or Sled cannot Charge
  (Pounce, Strafe). A unit that already cannot act after moving loses only
  Kaboom and Pillage after a Move. A ray unit that stands still fires at
  full power as usual. Retaliation, zones of control, capture eligibility,
  and idle recovery are unchanged.
- Every read of `mayUsePrimaryActionAfterMove` for a concrete unit goes
  through `unitMayActAfterMoveV7` (the role flag and not sluggish), with
  `primaryActionBlockedAfterMoveV7` for the reducer gates; `KABOOM`,
  `PILLAGE`, and the grant of Escape add the plain sluggish test
  (`sluggishUnitMovedV7`, `unitIsSluggishV7`).

### 21.4 Shatter

When **a land-form Ice Folk unit attacks at distance 1** and all of these
hold, the defender **shatters**:

1. the defender is Chilled and in land form;
2. its role is not `JUGGERNAUT`;
3. after the hit (the ordinary damage after the Blizzard, Armoured, and a
   Martian Shield) its HP would be at least 1 and at most the attacker's
   owner's **Shatter threshold**: `SHATTER_HP_V7` 3, or
   `BRITTLE_SHATTER_HP_V7` 4 with Brittle.

A shattered defender **dies in that exchange** (`UNIT_DIED` cause
`SHATTER`): it does not retaliate, the attacker is credited with the kill
(Promotion, Slayer, Plunder rules as for any kill), and the attacker
advances as after any kill. It **leaves no Grave** and has **no death
blast** (a shattered Bomb Chucker, Rocket Cart, or Scrap Buggy does not
explode). A shattered **Bitten** unit still rises as its biter's Zombie
(`BITTEN_UNIT_RISEN` follows the `SHATTER` death), and the attacker then
does not advance.

- **Distance 1 only**, whatever the role: a Snow Hunter or a Boulder Yeti
  shatters an adjacent unit; a Rockfall, a shot, or a throw at distance 2
  never does. A retaliation and a Sweep flank hit never shatter.
- **Only the HP after the hit matters:** a hit that deals no HP damage (a
  weak hit, or one a Shield absorbs entirely) still shatters a Chilled unit
  at 1 to 3 HP. A hit that kills by itself is an ordinary kill, with its
  ordinary Grave and death blast.
- **Never shattered:** Eggs (never Chilled), embarked and naval units, and
  the `JUGGERNAUT`-role units (Juggernaut, Abomination, Troll, Brontosaurus,
  Colossus, Frost Giant). Two-slot units are not exempt.
- **The preview is exact:** on a Shatter `shatters` is true,
  `damageToDefender` is the defender's whole remaining HP, `defenderDies` is
  true, and `noRetaliationReason` is `DEFENDER_DIED`, so every reader of
  kills and HP stays correct. `previewAttackExplosionsV7` leaves out the
  blast of a shattered defender.

Worked examples (engine formula, open Grass, threshold 3, the target
Chilled and at full HP unless stated; a Yeti has 9 HP, Attack 2, and
Defense 1.5):

| Target                           | Hits, in order                          | Result                                                                 |
| -------------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Fighter (12 HP)                  | Yeti 5 (takes 5); Yeti                  | the second hit, 6, would leave 1: **shatters**                         |
| Fighter on Field Defense         | Yeti 4 (takes 8); Yeti                  | the second hit, 5, would leave 3: **shatters**                         |
| Caveman or Skeleton (10 HP)      | Sled with Charge, or Sabretooth         | 8 would leave 2: **shatters** at full HP, no retaliation               |
| Fighter (12 HP)                  | Sled with Charge, or Sabretooth         | 8 would leave 4: shatters only with Brittle                            |
| Grunt (10 HP, Shield 2)          | Yeti 5 (Shield 2, HP 3; takes 3); Yeti  | the second hit, 6, would leave 1: **shatters**                         |
| Zombie (18 HP)                   | Yeti 5; Yeti 5; Yeti                    | the third hit, 6, would leave 2: **shatters**, no Grave                |
| Triceratops (20 HP)              | Mammoth 6; Yeti 5; Yeti                 | the third hit, 6, would leave 3: **shatters**                          |
| T-Rex (28 HP)                    | Mammoth 6; Yeti 5; Yeti 6; Yeti 6; Yeti | dead on the fifth hit (8) by plain damage; no hit landed in the window |
| Knight or Spitter (10 HP)        | Mammoth                                 | 8 would leave 2: **shatters** at full HP                               |
| Bomb Chucker (8 HP)              | Yeti                                    | 6 would leave 2: **shatters**, and no bomb goes off                    |
| Rocket Cart (8 HP)               | Yeti                                    | 7 would leave 1: **shatters**; the Yeti advances and takes no blast    |
| Guard at 3 HP on a Walled center | Ice Witch                               | 2 would leave 1: **shatters** (unchilled, the Witch takes 11)          |
| Goblin (6 HP)                    | any Ice Folk hit                        | dead by plain damage; Shatter never happens against Goblins at full HP |
| a `JUGGERNAUT`-role unit at 3 HP | Yeti                                    | never shatters; the hit and the retaliation are ordinary               |

### 21.5 Snow

**Which tiles are Snow.** Snow is a derived property of a land tile, the
same for every viewer and seat, never stored, and computed from the current
state at every read (`winterV7`, memoised per immutable state only):

```text
snow(tile) =
     tile is land and not a Rift, and
     (  tile's territory belongs to a city owned by an ICE_FOLK seat        (territory)
     or tile is within Chebyshev 1 of a land-form Ice Witch                 (Blizzard)
     or tile has no territory and is within Chebyshev 2 (DEEP_WINTER_RADIUS_V7)
        of the center of a city whose Ice Folk owner has Deep Winter )      (Deep Winter)
```

- Within one `MOVE` it is read once, from the state before the command, for
  every step (this matters only for a Witch's own Move).
- A captured Ice Folk city stops being Snow in the capture command, a city
  an Ice Folk seat captures becomes Snow in it, and a besieged Ice Folk city
  is still Snow (the besieger gets nothing from it). A Land Grant widens the
  Snow with the territory, and every Ice Folk capital's territory is Snow
  from the first turn.
- Snow lies on Grass, Forest, and Mountain alike, on Roads, improvements,
  resources, Field Defense, centers, Graves, and chests, and changes none of
  them. Water and Rift tiles are never Snow. Several sources do not add up.

**What Snow does.** For a land-form Ice Folk unit:

1. **Glide.** A step that **leaves** a Snow tile costs one half-point
   instead of two (the cost-by-origin rule of Roads); Snow and a Road node do
   not add up. So a Move-1 unit that starts on Snow moves two tiles if the
   first tile it enters is also Snow, and a Sled up to four. The
   **Sabretooth never Glides** (role mechanic `glides`). Every other Move
   rule is unchanged: Forest and unexplored cells still end an Ice Folk
   unit's Move, zones of control too, and a Mountain stops the units that
   are not Mountain-born.
2. **Snow cover.** A defender on Snow whose **own fortification level is 0**
   has cover × 1.5: the Forest and Mountain cover, not added to it (a snowy
   Forest or Mountain still gives × 1.5). A unit with any fortification of
   its own (its owner's Walled center, or Field Defense in its owner's
   territory) has no Snow cover, whatever the attack ignores; on a Forest or
   Mountain it keeps the terrain cover. Acid ignores Snow cover like any
   cover. Wail uses it (the target's cover).

For a land-form ground unit of any other faction (movement mode `GROUND`):

3. **Deep snow.** A Move **ends on entering a Snow tile**, as on entering a
   Forest: a path that continues past it is illegal (`SNOW_STOPS_MOVE`); a
   step along a **Road edge** (both ends usable Road nodes for the mover) is
   exempt, and **Fieldcraft waives it** for the `RAIDER` and `MARKSMAN`
   roles. A Move-1 unit off a Road is not affected. Martian walkers and
   flyers are never stopped by terrain and ignore it. Roads inside Ice Folk
   territory are not usable by other players, so the Road-edge waiver
   applies on the mover's own or neutral Roads.

Snow does nothing else: no damage, healing, or sight change, and no effect
on attacks (beyond cover), on the advance, a Push, a Charge! follow, an
Overrun continuation, or a Tractor Beam, which are not Moves.

Examples (engine formula, full HP; a Yeti has 9 HP and Defense 1.5):

| Attack on a Yeti                                    | In the open | On Snow | On Snow in its Witch's Blizzard |
| --------------------------------------------------- | ----------: | ------: | ------------------------------: |
| Fighter (melee; the Yeti retaliates 3, on Snow 4)   |           5 |       4 |                               4 |
| Marksman from distance 2                            |           5 |       4 |                               2 |
| Catapult                                            |          11 |      10 |                               5 |
| Lich (splash on the Yeti's neighbours from the hit) |           9 |       8 |                               4 |
| Spitter from distance 2 (Acid: no cover)            |           5 |       5 |                               3 |
| full-power Ray Gunner from distance 2               |           9 |       8 |                               4 |

### 21.6 The Blizzard and Cold Snap

**The Blizzard** of an Ice Witch in land form is her tile and the eight
tiles around it (`BLIZZARD_RADIUS_V7` 1), clipped to the board. It moves
with her and ends when she dies, embarks, or otherwise leaves the board.

- Its land tiles are Snow ([section 21.5](#215-snow)).
- **Half ranged damage.** When a unit attacks **from distance 2 or more** a
  land-form Ice Folk unit that stands in the Blizzard of an Ice Witch of
  **its own seat**, the hit is `ceil(damage / 2)` (`blizzardHalved`),
  applied to the formula's damage before Armoured, a Shield, and the cap.
  Nothing becomes illegal. It applies to the primary hit of an `ATTACK`
  only: never to an attack from distance 1, a retaliation, a splash, bomb,
  Pierce, or Sweep hit on another unit (computed from the halved primary
  hit when the primary target was in the Blizzard), Wail, Kaboom, death
  blasts, or Plague. Blizzards do not stack, and the Witch is in her own.
- **Per faction and per seat** (root ruling 4). Snow and its effects are
  per faction: every land-form Ice Folk unit, of any seat, gets Glide and
  Snow cover on every Snow tile, whichever seat's territory, Deep Winter, or
  Witch made it, and every other faction's ground unit is stopped by every
  Snow tile. The halving is per seat: it protects only the land-form units
  owned by the same seat as the Witch, never a unit of another seat (an
  enemy Ice Folk unit included), an embarked unit, or a boat.

`COLD_SNAP { kind, unitId }` is a primary action of the Ice Witch (it needs
Administration, which unlocks her as `WITCH_SUPPORT`). It is not an Attack
and costs no Coins.

- **Legality.** An own land-form Witch that has not used a primary action
  and has not landed this turn (she may have moved), with at least one
  target. Rejections, atomic, in this order: the ordinary unit errors; a
  role without `COLD_SNAP` → `UNIT_ROLE_INVALID { role }`; a primary action
  used, a pending continuation, or a sluggish Witch that moved →
  `UNIT_ALREADY_ACTED`; embarked → `COLD_SNAP_NOT_LEGAL { reason: "EMBARKED" }`;
  no target → `COLD_SNAP_NOT_LEGAL { reason: "NO_TARGET" }`.
- **Targets.** Every unit that can be Chilled, is visible to the Witch's
  owner, and stands within Chebyshev `COLD_SNAP_RANGE_V7` (2) of her,
  already Chilled units included.
- **Result.** Chill is applied to every target at once; the Witch has used
  her primary action and is handled. No damage, retaliation, Field Defense
  destruction, or reveal. Event `UNITS_CHILLED` (source `COLD_SNAP`). Only
  visible units are targets, so the preview equals the result. Cast every
  turn, it keeps every enemy near her Shatter-eligible and slows each once.

### 21.7 Deep Winter and Brittle

- **Deep Winter** (the Ice Folk `FORTIFICATION`, Industry tier 2, requires
  Drill, ordinary tier-2 cost; capability `deepWinter`). While its owner has
  it, every land tile **without territory** within Chebyshev 2 of the center
  of one of its cities is Snow (another player's territory never is), and
  Recover and idle recovery heal a land-form Ice Folk unit **6** in its
  owner's territory (`DEEP_WINTER_RECOVER_V7`) instead of 4; elsewhere 2, as
  for everyone, Snow or not. It stores nothing: the ring follows the cities
  the seat owns.
- **Brittle** (the Ice Folk `EXPLOSIVES`, Industry tier 3, requires
  Fortification, ordinary tier-3 cost; capability `shatterThreshold`). It
  keeps Blast Mountain and the melee Field Defense demolition and raises
  the player's Shatter threshold from 3 to 4
  ([section 21.4](#214-shatter)). A Rockfall is not a melee attack, so its
  demolition does not apply to it.

### 21.8 Mountain-born and Rockfall

A **Mountain-born** unit (Yeti, Boulder Yeti, Frost Giant; role mechanic
`mountainBorn`) in land form enters a Mountain without Engineering in every
rule that asks whether it may stand on a tile (`canEnterTerrainV7`: `MOVE`,
`DISEMBARK`, the advance, a Push, Charge! push, or Tractor Beam pull of the
unit, reward displacement, and their public twins), and is not stopped by a
Mountain (`terrainStopsMoveV7`); Forest, unexplored cells, and hostile ZOC
still end its Move. It keeps the ordinary Mountain cover, gets the +1 Sight
on a Mountain only with Engineering, and never enters a Rift. A unit that
does not go through `canEnterTerrainV7` uses `unitMayEnterMountainV7`.

**Rockfall** (the Yeti). A land-form Yeti **standing on a Mountain** may
attack a visible hostile unit at Chebyshev distance 2 as well as 1. An
attack at distance 2 uses `ROCKFALL_ATTACK2_V7` 3 (Attack 1.5) instead of
its Attack 2 (`rockfallApplied`); one at distance 1 is ordinary. A defender
that cannot reach distance 2 does not retaliate; a ranged one does. The
Yeti's own retaliation range stays 1, so a Yeti on a Mountain shot from
distance 2 does not throw back. A Rockfall never shatters and never
advances. The public command query and `queryThreatenedTilesV7` include the
distance-2 tiles of a Yeti on a Mountain and from every Mountain it can
reach. Example: a Rockfall deals a full-HP Fighter 3 and a Marksman 4.

### 21.9 Bolas and Cold Blood

`THROW_BOLAS { kind, unitId, targetUnitId }` is a primary action of the
Sled (it needs no technology beyond Scouting, which unlocks the Sled). It is
not an Attack and costs no Coins. Legality, in this order (all rejections
atomic):

| #   | Requirement                                                                                   | Rejection                                     |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                | the ordinary unit errors                      |
| 2   | Its role has `BOLAS`.                                                                         | `UNIT_ROLE_INVALID { role }`                  |
| 3   | It has not used a primary action and has not landed this turn; a sluggish Sled has not moved. | `UNIT_ALREADY_ACTED`                          |
| 4   | It is in land form.                                                                           | `BOLAS_NOT_LEGAL { reason: "EMBARKED" }`      |
| 5   | `targetUnitId` is a unit on the board the actor can see.                                      | `TARGET_NOT_FOUND`                            |
| 6   | It is hostile to the actor.                                                                   | `TARGET_ALLIED`                               |
| 7   | It can be Chilled: land form (not embarked, naval, or an Egg).                                | `BOLAS_NOT_LEGAL { reason: "TARGET_IMMUNE" }` |
| 8   | It is within Chebyshev distance `BOLAS_RANGE_V7` (2) of the Sled; distance 1 is legal.        | `BOLAS_NOT_LEGAL { reason: "OUT_OF_RANGE" }`  |

- **Result.** Chill is applied to the target (an already Chilled target is
  legal: `turnsLeft` goes back to 2). The Sled has used its primary action
  and is handled. No damage, retaliation, Field Defense destruction, or
  advance; event `UNITS_CHILLED` (source `BOLAS`). It may follow a Move;
  there is no line of sight and no cover against it.

**Cold Blood** (the Snow Hunter): its attack on a **Chilled** defender has
+0.5 Attack (`COLD_BLOOD_BONUS2_V7` 1), at any distance
(`coldBloodApplied`); never on retaliation. Example: 6 instead of 5 on a
full-HP Fighter.

### 21.10 Sweep and Trample

Every `ATTACK` a land-form Mammoth makes:

- **Sweep.** The **flank tiles** are the two tiles next to the target's
  tile on the ring of eight around the Mammoth (one step clockwise and one
  counter-clockwise): beside a target straight ahead, and between a
  diagonal target and the Mammoth's row and column. Every **hostile** unit
  on a flank tile, in any form (an Egg too), takes `SWEEP_DAMAGE_V7` **2**,
  with no retaliation or modifiers; Armoured reduces it to 1, a Shield
  absorbs it first, and it is capped at the victim's HP. Flank hits resolve
  with the exchange, from the pre-attack state, whether or not the Mammoth
  survives. A flank victim that dies is credited to the Mammoth like a
  hostile splash kill (cause `SPLASH`), leaves an ordinary Grave or rising,
  and explodes if it is an exploding unit (the Mammoth is then in its
  blast). A flank hit never shatters. Own and allied units are never hit.
  The victims are the preview's `splash` entries (with `shieldDamage`), the
  preview has `sweep: true`, and it is exact (the Mammoth's neighbours are
  explored by its owner).
- **Trample.** Field Defense on the **target's** tile is destroyed, whoever
  owns the tile and whether or not either unit survives (reason
  `TRAMPLE`); it still counts for that exchange. Flank tiles keep theirs.

### 21.11 Boulders and Planted

Every `ATTACK` a land-form Boulder Yeti makes, at distance 1 or 2:

- **ignores fortification** (role mechanic `ignoresFortification`): the
  defender's fortification level is 0 for the whole exchange, for the damage
  and the retaliation (the Charge! convention); cover stays and Walls are
  not destroyed. The preview reports `fortificationLevel: 0` and the
  removed levels in `fortificationIgnored`;
- **destroys Field Defense** on the target's tile (reason `CATAPULT`, as for
  every `CATAPULT`-role attack);
- is **Planted** when the unit has not moved this turn: +1 Attack
  (`PLANTED_BONUS2_V7` 2), so Attack 3 planted and 2 after a Move
  (`plantedApplied`; an estimate for an attack after a planned Move uses
  Attack 2).

It retaliates at distance 1 and 2 with its ordinary Defense, never advances
after a kill (`advancesAfterKill` false), and cannot capture; at distance 1
it can shatter. Examples (full HP): planted, it deals a Guard on a Walled
center with Field Defense 7 (a Yeti deals that Guard 2 and dies to its
retaliation), and a Fighter 8; after a Move, a Guard 4.

### 21.12 Prowl and the Cold Aura

**Prowl** (the Sabretooth, role mechanic `ignoresZocStops`). Entering a
cell in hostile ZOC does not end its Move; it exerts ZOC like any land unit.
Forest, Mountain (which it needs Engineering to enter), unexplored cells,
and occupied tiles are ordinary: it does not pass other players' units. It
never Glides, deep snow does not apply to it (it is an Ice Folk unit), and
it has Snow cover like the others. It **never ends a Move, lands, advances
after a kill, or is displaced onto a neutral village center or the center
of a city its owner does not own** (`MOVEMENT_ILLEGAL` with reason
`SETTLEMENT_FORBIDDEN`, never offered; the kill is ordinary and the
Sabretooth stays), so it never besieges, never blocks a capture, and never
takes a village; it may stand on its owner's centers. It has no Overrun, no
capture, and no Charge.

**Cold Aura** (the Frost Giant). At its owner's Start Turn, after the
Shield recharge and before Plague ([section 3](#3-players-turns-and-victory)),
each land-form Frost Giant, in unit-ID order, applies Chill to every unit
that can be Chilled on the eight tiles around it, with one `UNITS_CHILLED`
(source `COLD_AURA`) per Giant that has at least one target. A unit that
stays next to a Giant is sluggish once and Shatter-eligible on every Ice
Folk turn after that. The Giant never shatters a `JUGGERNAUT`-role unit and
cannot itself be shattered.

### 21.13 Attack resolution order

An Ice Folk attack is an ordinary `ATTACK` resolved by the ordinary attack
resolution, with these steps (new ones in bold):

1. Attack: base Attack, Charge, Alpha, run-up, Gang Up, Inspired,
   **Rockfall**, **Planted**, **Cold Blood**. Defense: fortification (0 for
   Acid, Charge!, a Disintegrator ray, **Boulders**), cover (**Snow cover**
   for an unfortified Ice Folk defender on Snow).
2. Damage both ways from pre-combat HP; the **Blizzard** halves a hit from
   distance 2 or more on a protected Ice Folk defender; Armoured; Martian
   Shields absorb.
3. **Shatter test** on the primary defender: a shattered defender dies and
   does not retaliate.
4. Lifesteal; **Sweep** flank hits (Armoured and Shields apply to each).
5. Kill credit (the defender, hostile flank and splash kills), then growth.
6. Field Defense on the target tile destroyed (`CATAPULT` for a Boulder
   Yeti, **`TRAMPLE`** for a Mammoth, otherwise the ordinary reasons).
7. Deaths in order: the defender, flank and splash victims in `(y, x, id)`
   order, the attacker, each an Infect rising, a Bitten rising, or an
   ordinary death with its Grave; **a shattered defender has cause
   `SHATTER` and leaves no Grave** (a Bitten one still rises). Thralls of a
   dead Brain collapse; bites and Plague land on the survivors.
8. Push of a surviving target (Frost Giant), then the advance (never for a
   Boulder Yeti, never onto a foreign center for a Sabretooth).
9. The death-blast chain of the exploding units among the dead, **except a
   shattered defender**; Plunder; reveals; the economy, reward, and
   achievement tail.

Events: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; `UNIT_DIED` (cause
`SHATTER`, `ATTACK`, `SPLASH`, or `RETALIATION`), each followed by
`GRAVE_CREATED` or a rising where one applies; `UNIT_GREW`; `UNIT_PUSHED`;
`UNIT_MOVED`; the chain events; `PLUNDER_AWARDED`; `TILES_REVEALED`; the
tail.

### 21.14 Interactions with other rules

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, Raise Dead      | Ice Folk land-form units leave Graves like any unit; a shattered unit of any faction leaves none; a unit killed by plain damage, a Sweep flank hit, a Rockfall, a shot, or a throw leaves an ordinary Grave. Raise Dead is unchanged on Snow; a risen Skeleton is not Chilled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Infect, Bitten          | An Ice Folk unit killed by a Zombie rises as an ordinary Zombie; a Witch that rises has left the board, so her Blizzard ends. A Zombie's kill is never a Shatter. A Bitten unit that is shattered still rises as its biter's Zombie in place (no Chill entry), and the attacker does not advance. No Ice Folk unit cures a bite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Plague, Wail            | Plague applies to Ice Folk units; its damage and spread are not attacks, so the Blizzard does not halve them. Wail is not an attack (never halved) and uses the target's cover, so Snow cover counts: 2 on a Yeti in the open, 1 on Snow. A Lich's hit on an Ice Folk unit in its Witch's Blizzard is halved (8 on a Yeti on Snow becomes 4) and its splash derives from the halved hit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Lifesteal, Unanswered   | A Vampire is a melee attacker, never halved; an Ice Folk unit never retaliates against it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Undead actions          | Frenzy, Raise Dead, Devour, and Wail are primary actions a sluggish Necromancer, Ghoul, or Banshee that moved cannot use. Undead units are Chilled like anyone; a Chilled Zombie or Lich, which already cannot act after moving, only becomes Shatter-eligible. Restless is not an Ice Folk rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Goblin rules            | [Section 18.11](#1811-interactions-with-other-rules): blasts ignore Snow cover and the Blizzard, a shattered exploding unit does not explode, a sluggish goblin-crewed unit that moved cannot Kaboom, and Gang Up beats cover (a Goblin with two helpers deals a Yeti 11 in the open and 10 on Snow, either way more than its 9 HP).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Dinosaur rules          | [Section 19.12](#1912-interactions-with-other-rules): Eggs are never Chilled or shattered; deep snow cuts a run-up and a Pounce short; Charge! and Wallbreaker ignore fortification but not Snow cover, which is read from the defender's own fortification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Martian rules           | [Section 20.11](#2011-interactions-with-other-rules): Chill ignores Shields; Shatter reads the HP after the Shield; walkers and flyers ignore deep snow; the Frost Giant is immune to Mind Control and the Tractor Beam.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Human abilities         | Field Defense and Walls give a defender their bonus against every Ice Folk attack except a Boulder Yeti's; a Mammoth's attack tramples the Field Defense on the target tile after the exchange; with Brittle, Ice Folk melee attackers demolish Field Defense like any owner of Explosives. A sluggish Captain that moved cannot Rally; a sluggish Knight that attacks without moving still Overruns. A Catapult always shoots from distance 2 or 3 and a Marksman from 2 is halved against a protected unit.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cities, siege, capacity | An Ice Folk unit on a hostile center besieges it (never a Sabretooth). Capture needs no Move, so a sluggish unit that began its turn on a center captures as usual. Every Ice Folk role uses one slot; a reward Frost Giant may exceed capacity. Land Grant, Spoils, rewards, and the city action are unchanged; Bolas and Cold Snap spend no city action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Boats, water            | Ice Folk boats are the Human boats. Land units embark at Ports with Shorecraft. No embarked or naval unit is Chilled or shattered; an attack from the shore on an embarked unit never shatters it, and a naval attack from distance 2 or more on a protected unit is halved (a Battleship's splash from the halved hit). The `blizzard` flag covers water tiles for drawing only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Rift                    | A Rift is never Snow and Mountain-born does not cover it, so no Ice Folk unit enters one. A flyer on a Rift is in land form: it can be Chilled, attacked from an adjacent tile, and shattered; the attacker does not advance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Achievements, Promotion | Promotion is the ordinary rule for every Ice Folk unit (3 kills, +5 maximum HP, a full heal that takes a unit out of the Shatter window but removes no Chill). Shatter, hostile Sweep, Rockfall, Boulder, and retaliation kills are credited; a Bolas and a Cold Snap are not kills. Muster counts the Ice Folk trainable roles and excludes the Frost Giant; Slayer counts Shatter and Sweep kills.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Dwarf rules             | [Section 22.13](#2213-interactions-with-other-rules): tunnels ignore Snow, and a surfaced unit stands on Snow like any ground unit; deep snow ends a Dwarf ground unit's Move (only the Move-2 Steam Tank notices), and the Gyrocopter flies over it. Every Dwarf land unit can be Chilled, constructs and the Brass Titan included, and shattered, except the Brass Titan (`JUGGERNAUT`); a mound is neither; a burrowed unit's Chill entry keeps counting down at its owner's End Turn, and the Engineer's Repair cures Chill. A sluggish Gyrocopter cannot bomb; a sluggish Mole may tunnel and a sluggish Hammerer ride; a sluggish unmoved Gunner fires twice; a sluggish Engineer that moved can neither Repair nor Assemble. The Shatter test reads a Steam Tank's HP after the Plated cap. The Blizzard halves a Gunner's or a Steam Cannon's shot from distance 2 or more, never a bomb or an eruption (not attacks); bombs and eruptions also ignore Snow cover. |

### 21.15 Commands, events, errors, and queries

- **Commands:** `THROW_BOLAS { kind, unitId, targetUnitId }` and
  `COLD_SNAP { kind, unitId }`, in that order right after `TRACTOR_BEAM` in
  `COMMAND_KIND_ORDER_V7`. `MOVE` accepts the Glide costs, the Mountain-born
  paths, and the Sabretooth's paths through ZOC, and applies deep snow;
  `ATTACK` accepts a Yeti's distance-2 target from a Mountain. A pending city
  reward blocks the two commands like every command.
- **Events** (`DOMAIN_EVENT_KIND_ORDER_V7`): `UNITS_CHILLED` right after
  `UNITS_RALLIED`, with `results: [{ unitId, sluggish, turnsLeft }]`.
  `UNIT_DIED.cause` gains `SHATTER` (never followed by `GRAVE_CREATED`; it
  may be followed by `BITTEN_UNIT_RISEN`); `FIELD_DEFENSE_DESTROYED.reason`
  gains `TRAMPLE`; `UNIT_MOVE_INTERRUPTED.reason` gains `SNOW`;
  `WOUNDED_TENDED` results gain `curedChill`. There is no event for the
  countdown or the end of a Chill, or for Snow appearing or disappearing.
- **Combat preview** (`CombatPreviewV7`, so also `COMBAT_RESOLVED`), eight
  fields, all false for an attack that involves no Ice Folk unit:
  `shatters`, `coldBloodApplied`, `rockfallApplied`, `plantedApplied`,
  `blizzardHalved` (`damageToDefender` is the halved value), `snowCover`
  (the defender's × 1.5 comes from Snow), `sweep` (the flank victims are the
  `splash` entries), and `hiddenBlizzardPossible` (public previews only).
  Boulders report `fortificationLevel: 0` and `fortificationIgnored`; a
  Trample is read from `sweep` and the target tile's Field Defense.
- **Errors:** `BOLAS_NOT_LEGAL` (reasons `EMBARKED`, `TARGET_IMMUNE`,
  `OUT_OF_RANGE`) and `COLD_SNAP_NOT_LEGAL` (`EMBARKED`, `NO_TARGET`); the
  movement failure reasons gain `SNOW_STOPS_MOVE`, and
  `SETTLEMENT_FORBIDDEN` also covers the Sabretooth. A sluggish unit's
  refused action is `UNIT_ALREADY_ACTED`.
- **Registration:** faction `ICE_FOLK`, tree `ICE_FOLK_BASELINE_V1`,
  display name "Ice Folk"; unlock kinds `WITCH_SUPPORT`, `DEEP_WINTER`, and
  `BRITTLE`; capabilities `deepWinter` and `shatterThreshold`; abilities
  `MOUNTAIN_BORN`, `ROCKFALL`, `BOLAS`, `COLD_BLOOD`, `SWEEP`, `TRAMPLE`,
  `BLIZZARD`, `COLD_SNAP`, `BOULDERS`, `PROWL`, and `COLD_AURA`; role
  mechanics `mountainBorn`, `glides`, `ignoresZocStops`, `sweepDamage`,
  `tramplesFieldDefense`, `ignoresFortification`, `plantedBonus2`,
  `rockfallAttack2`, and `coldBloodBonus2`, with `buildsFieldDefense` false
  for the Yeti and the Mammoth and `advancesAfterKill` false for the Boulder
  Yeti; faction rules `snow` true and `treasureUnitRole` `RAIDER`; constants
  `SHATTER_HP_V7` 3, `BRITTLE_SHATTER_HP_V7` 4, `CHILL_TURNS_V7` 2,
  `BOLAS_RANGE_V7` 2, `COLD_SNAP_RANGE_V7` 2, `BLIZZARD_RADIUS_V7` 1,
  `DEEP_WINTER_RADIUS_V7` 2, `DEEP_WINTER_RECOVER_V7` 6, `SWEEP_DAMAGE_V7`
  2, `ROCKFALL_ATTACK2_V7` 3, `PLANTED_BONUS2_V7` 2, and
  `COLD_BLOOD_BONUS2_V7` 1.
- **Derived queries** for a state and a view: `isSnowV7` and `isBlizzardV7`
  (on a view, the public `snow` and `blizzard` tile flags, which the UI
  draws from and never recomputes), `unitIsSluggishV7`,
  `unitMayActAfterMoveV7`, and `unitMayEnterMountainV7`.
- **`queryPlayerCommandsV7`** offers, for an Ice Folk seat, `MOVE` commands
  that follow Glide, Mountain-born, and Prowl; `ATTACK` at distance 2 for a
  Yeti on a Mountain; `THROW_BOLAS` for every legal `(Sled, target)` in
  unit-ID then target-ID order; and `COLD_SNAP` for every Witch with a
  target. For every seat it withholds the actions a sluggish unit cannot
  take and offers no `MOVE` through a known Snow stop. It never offers an
  Ice Folk seat Field Defense, Rally, or Tend Wounded, or a Sabretooth a
  foreign center. Every offered command is accepted.
- **`previewBolasV7(view, unitId, targetUnitId)`** returns null unless that
  command is offered, otherwise
  `{ unitId, targetUnitId, becomesSluggish, turnsLeft, shatterSetups }`,
  where `shatterSetups` lists the viewer's own units whose offered attack on
  the target would shatter it once it is Chilled.
  **`previewColdSnapV7(view, unitId)`** returns null unless the command is
  offered, otherwise `{ unitId, targets: [{ unitId, becomesSluggish }] }` in
  unit-ID order.
- `queryCombatPreviewV7` and `estimateCombatV7` include Snow cover, the
  Blizzard of visible Witches, Rockfall, Planted (from the unit's `moved`
  flag; Attack 2 for an attack after a planned Move), Cold Blood, Sweep, and
  Shatter, and accept the option `assumeTargetChilled`. Every preview
  equals the resolution, except one flagged `hiddenBlizzardPossible` or
  `touchesUnexplored`. `queryThreatenedTilesV7` gives a visible Ice Folk
  unit its Glide reach on known Snow, a Mountain-born unit its Mountain
  paths, a Sabretooth its reach through ZOC, a Yeti the distance-2 tiles
  from every Mountain origin, and a Boulder Yeti range 2 from every tile it
  can reach; it adds nothing for a Bolas or a Cold Snap, and a sluggish unit
  of any seat threatens only from where it stands.
- **Public unit stats** carry, for every unit, `chill` (null, or
  `{ sluggish, turnsLeft }`), and for units of an Ice Folk seat the
  `iceFolk` block: `onSnow`, `inBlizzard`, `snowCover`, `glides`,
  `mountainBorn`, `shatterThreshold`, `rockfall` (true while it stands on a
  Mountain), `planted` (what an attack made now would be, or null),
  `sweepDamage`, and `blizzard` (true for a land-form Witch). The position
  facts are the Snow and Blizzard the reader knows of. The Attack row lists
  the source `PLANTED`; a snowy cover row reads `SNOW`.
- `PublicPlayerV7` and the leaderboard carry `ICE_FOLK` and
  `ICE_FOLK_BASELINE_V1`.

## 22. Dwarf faction rules

Humans are sustain, Undead are attrition, Goblins are a reckless horde,
Dinosaurs are few, big, and growing, Martians are a small high-tech
invasion force, the Ice Folk are the things from the peaks, and the
Steampunk Dwarves are **heavy, slow, and built to last; they come from above
and below**: Hammerers hold their cities dug in, Gyrocopters fly over the
enemy line and drop a bomb on whoever stands behind it, Steam Moles drill
under the line carrying a Hammerer and burst out of the ground next to the
back line, Engineers wind up clockwork Gunners at the front and keep the
machines patched, and a clockwork Brass Titan hits as hard at the end of a
fight as at the start. They are strong at home, against a soft back line,
and wherever a visible two-turn blow lands; they are slow to expand, weak
against Shields and units that step away from a mound, exposed on the turn
after every surfacing, and they lose their clockwork for good if the
Engineers die. Every rule in this section applies only to units of a
`DWARF` seat, except where a rule names its target (an eruption and a bomb
hit other players' units, and a mound reserves its tile for everyone); in a
match without one the lists `burrowed`, `surfacedThisTurn`, and
`bombedThisTurn` are empty, no tile holds a mound, no `TUNNEL`, `BOMB_RUN`,
or `ASSEMBLE` is offered or accepted, every role has `construct` false, the
per-unit living test returns what the per-owner test returned, the two
per-unit stat flags and the `dwarf` stat block are absent, and the three
Dwarf combat-preview fields are false. Each rule resolves through the
owner's registration (`FACTION_RULES_V7`, `DWARF_ROLE_RULES_V7`,
`DWARF_ROLE_MECHANICS_V7`) and the helpers of `src/engine/v7/dwarf.ts`,
`src/engine/v7/dwarf-reducer.ts`, and `src/engine/v7/units.ts`. Human,
Undead, Goblin, Dinosaur, Martian, and Ice Folk units keep every ability
against the Dwarves, with the rulings of
[section 22.13](#2213-interactions-with-other-rules). Specification,
per-unit battle analysis, decisions, root rulings, and the tuning record:
the [Dwarf overlay](RULESET_7_DWARVES.md) and the
[Dwarf balance report](../validation/RULESET_7_DWARF_BALANCE.md) (the `7r31`
coarse pass on Dry Land).

### 22.1 Roles, constructs, machines, and labels

| Mechanical role | Dwarf unit       | Kind                                                            |
| --------------- | ---------------- | --------------------------------------------------------------- |
| `FIGHTER`       | Hammerer         | rides the tunnel; Dig In                                        |
| `RAIDER`        | Gyrocopter       | machine; flies; Bomb Run; no `ATTACK`                           |
| `MARKSMAN`      | Clockwork Gunner | construct; machine; two shots standing still                    |
| `GUARD`         | Steam Mole       | machine; Tunnel and eruption; Dig In                            |
| `CAPTAIN`       | Engineer         | Repair; Assemble; no Rally                                      |
| `CATAPULT`      | Steam Cannon     | machine; Knockback; with Blasting Charges ignores fortification |
| `KNIGHT`        | Steam Tank       | machine; Plated 4; no Overrun                                   |
| `JUGGERNAUT`    | Brass Titan      | construct; machine; Push                                        |

- **Dwarf units** are the eight land roles in land form. The Dwarf rules
  never apply to a Dwarf boat (the Human Patrol Boat and Battleship) or to
  an embarked unit, except where a rule says so.
- **Constructs** (role mechanic `construct`) are the Clockwork Gunner and
  the Brass Titan: fully mechanical, no dwarf inside
  ([section 22.6](#226-clockwork)). Every other Dwarf unit is living.
  **Living** is read per unit (`isLivingUnitV7`): the owner's faction is not
  `UNDEAD` **and** the role is not a construct under the owner's
  registration. Plague, Bitten, Infect, Wail, and their previews read it;
  in a match without a Dwarf seat it equals the per-owner test.
- **Machines** (role mechanic `repairsAsMachine`, for Repair only,
  [section 22.8](#228-engineer-repair-and-assemble)) are every Dwarf land
  role but the Hammerer and the Engineer. This is not the Martian meaning
  of "machine" ([section 20.1](#201-roles-machines-and-labels)), which is a
  movement mode: of the Dwarf units only the Gyrocopter has a non-ground
  movement mode (`FLY`), and only it gets the flyer rules (no cover or
  fortification, no Port needed, self-launch on water).
- **Diggers** (role mechanic `digsIn`) are the Hammerer and the Steam Mole
  ([section 22.7](#227-dig-in)).
- Tactical labels are those of the same mechanical role (the registry
  requires it): the Gyrocopter is `SKIRMISHER`, the Clockwork Gunner
  `RANGED`, the Steam Mole `DEFENDER`, the Engineer `SUPPORT`, and the
  Steam Cannon `SIEGE`. The Normal AI judges them by their abilities, not
  by these labels.

### 22.2 The Tunnel and burrowed units

`TUNNEL { kind, unitId, to, rider }` is the Steam Mole's Move, made
underground; `rider` is `null` or `{ unitId, to }`. It is not an Attack and
costs no Coins.

A **tunnel tile for a unit `u`** is a tile on the board, explored by the
actor, land and not a Rift (Grass, Forest, or Mountain), enterable by `u`
under `canEnterTerrainV7` (a Mountain needs its owner's Engineering), with
no unit of any owner, no mound, and no treasure chest, that is not a
settlement site (a village, city, or capital center of any owner) and not
in territory allied to the actor (a cooperative partner's; own territory is
allowed).

Legality, in this order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                                                                                        | Rejection                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                                                     | the ordinary unit errors; a burrowed unit `UNIT_ALREADY_HANDLED` |
| 2   | Its role has `TUNNEL`.                                                                                                                                                                                                                                             | `UNIT_ROLE_INVALID { role }`                                     |
| 3   | It has not moved, has not used a primary action, and has not landed this turn.                                                                                                                                                                                     | `UNIT_ALREADY_ACTED`                                             |
| 4   | It is in land form.                                                                                                                                                                                                                                                | `TUNNEL_NOT_LEGAL { reason: "EMBARKED" }`                        |
| 5   | It is not in `surfacedThisTurn`.                                                                                                                                                                                                                                   | `TUNNEL_NOT_LEGAL { reason: "SURFACED" }`                        |
| 6   | `to` is a tunnel tile for the Mole, and a sequence of at most `TUNNEL_RANGE_V7` (3) steps between Chebyshev neighbours leads from the Mole's tile to `to` with every tile after the first explored by the actor and land (Grass, Forest, Mountain, or Rift).       | `TUNNEL_NOT_LEGAL { reason: "DESTINATION" }`                     |
| 7   | If `rider` is not null: `rider.unitId` is another own unit on the board whose role has `RIDES_TUNNEL` (a Hammerer), in land form, Chebyshev-adjacent to the Mole, that has not moved, used a primary action, or landed this turn and is not in `surfacedThisTurn`. | `TUNNEL_NOT_LEGAL { reason: "RIDER" }`                           |
| 8   | If `rider` is not null: `rider.to` is a tunnel tile for the Hammerer, Chebyshev-adjacent to `to`, and not `to`.                                                                                                                                                    | `TUNNEL_NOT_LEGAL { reason: "RIDER_DESTINATION" }`               |

- **Underground** units, zones of control, terrain stops, Snow, Roads, and
  territory do not matter along the way; each step costs one; passing under
  a Mountain needs no Engineering and passing under a Rift is allowed; water
  is never part of a tunnel; nothing is revealed along the way. The command
  carries no path, so the command query offers one entry per destination
  and rider tile (and the rider-less entry).
- **A sluggish Mole may tunnel** and a sluggish Hammerer may ride: the
  tunnel is a Move, not a primary action.
- **Result.** The Mole leaves `units` and enters `burrowed` as
  `{ unit: { …mole, at: to }, moleUnitId: null }`; the rider, if any,
  enters as `{ unit: { …hammerer, at: rider.to }, moleUnitId: mole.id }`.
  Both records keep their HP, kills, home city, and every status entry
  (Plague, Bitten, Chill) and get the exhausted activation and
  `captureEligible` false. The actor explores every tile within 1 of each
  mound. Nothing else changes on the board: Field Defense on a mound tile
  stays until the surfacing, and a siege the Mole or the rider was making
  ends because nobody stands on that center any more. Events:
  `UNIT_TUNNELLED` (the rider fields null without a rider), then
  `TILES_REVEALED`, then the ordinary economy, reward, and achievement tail.
  A tunnel never touches water, so `TUNNEL` is not on the blockade-event
  list. Every tile it reads is explored, so the command is exact.
- **State.** `GameStateV7.burrowed` is
  `readonly { unit: UnitStateV7, moleUnitId: UnitId | null }[]`, sorted by
  `unit.id`; `unit.at` is the **mound tile**. A Mole entry has `moleUnitId`
  null; a rider entry names a burrowed Mole of the same owner next to it.
  Entries exist only between a `TUNNEL` and the owner's next Start Turn.
  State parsing rejects a duplicate or unsorted entry, a unit ID that is
  also in `units`, an owner that is not a Dwarf seat, a Mole entry whose role
  lacks `TUNNEL` or whose `moleUnitId` is not null, a rider entry whose role
  lacks `RIDES_TUNNEL`, whose `moleUnitId` is not a burrowed Mole of the
  same owner, or whose tile is not next to that Mole's, two riders for one
  Mole, a form other than `LAND`, a mound tile that is off the board, water,
  a Rift, or a settlement site, that holds a unit or a chest, or that
  another entry shares, and any entry in a match without a Dwarf seat. Unit
  IDs are unique across `units` and `burrowed`, and the next entity ID is
  above all of them.
- **The two accessors.** `state.units` keeps its meaning (the board), and
  every reader of a unit list chooses between `boardUnitsV7` (what stands on
  the board) and `allOwnedUnitsV7` (the board plus the burrowed records): a
  checked-in classification of every reader, enforced by a test, fails when
  a reader appears without a class. Combat, targeting, adjacency abilities,
  splash, Pierce, Wail, blasts, Plague spread, movement, ZOC, siege,
  training spawn, capture, the activation reset and every other Start Turn
  step, idle recovery, Muster, the player view's `units`, the command
  query, and selection are board-only. Capacity and used slots, orphaning
  on a capture, the treasure unit's slot check, elimination, the status
  lists and the Chill countdown, the leaderboard and headless metrics, and
  state parsing, hashing, saves, replays, and entity-ID uniqueness read all
  owned units. Victory and defeat still read cities only, so a seat with
  only burrowed units and a city is alive.

### 22.3 The mound, surfacing, and the eruption

- **Visible.** Each burrowed unit is a **mound** on its tile, public to
  every viewer who has explored that tile: owner, unit, HP, statuses, and
  whether it is the Mole or its rider
  ([section 15](#15-fog-and-observation)). The mound announces the exact
  tile and turn of the eruption.
- **Untouchable.** A burrowed unit is not in `units`, so no attack, bomb,
  splash, Pierce, Sweep, Kaboom or death blast, Wail, Plague spread, Bolas,
  Cold Snap, Cold Aura, Mind Control, Tractor Beam, Push, Charge! push,
  Knockback, or Overrun finds it. It exerts no ZOC, never besieges, and
  never blocks training, capture, or Land Grant. Every command naming it is
  rejected with `UNIT_ALREADY_HANDLED` and never offered.
- **Reserved.** The one occupancy predicate `tileOccupiedV7(state | view,
at)` is true when a unit stands on the tile **or a mound is on it**, and
  every rule that places a unit or ends a unit's step asks it
  ([section 12.1](#121-movement)). A Move may pass over a mound tile. A
  mound on a tile the mover has not explored can be met only on the last
  tile of a Move; the Move is accepted and interrupted there
  (`UNIT_MOVE_INTERRUPTED` reason `MOUND`, naming the mound tile), the
  mover staying on the last tile it entered on which it may end.
- **The tile** keeps its terrain, Road, improvement, resource, Field Defense,
  Grave, and Snow; tile actions on it are unaffected, and none changes a
  tile into water, a Rift, or a site. So a mound tile is never occupied when
  it surfaces (the surfacing asserts it).

**Surfacing.** At its owner's **Start Turn**, after the activation reset,
the city actions, the Mind Control cooldowns, the Shield recharge, and the
Cold Aura (which never runs in the same Start Turn: a seat has one faction)
and before Plague, each burrowed Mole of that seat surfaces, in unit-ID
order:

1. **Return.** The Mole, then its rider, leave `burrowed` and enter `units`
   on their mound tiles with the Start Turn activation (nothing moved or
   used) and `captureEligible` false; both join `surfacedThisTurn`.
2. **Eruption.** Every unit on the eight tiles around the Mole that is
   hostile to the Mole's owner and **on the ground** takes the owner's
   `eruptionDamage`: **2** (`ERUPTION_DAMAGE_V7`), **3** with Blasting
   Charges (`BLASTING_ERUPTION_DAMAGE_V7`). On the ground means a land-form
   unit whose movement mode is not `FLY` (foot units, walkers, Thralls) or
   an Egg; never a flyer, a naval unit, or an embarked unit. The damage is
   fixed: no retaliation, Attack, Defense, cover, fortification, Walls,
   Snow, or Blizzard; Armoured takes 1 off, then Plated caps it, then a
   Shield absorbs first; it is capped at the victim's HP. Every victim is
   hit at once. The rider never erupts, and own and allied units are never
   hit.
3. **Undermining.** Field Defense on the Mole's tile and on the eight tiles
   around it is destroyed, whoever owns it and whether or not anything was
   hit (`FIELD_DEFENSE_DESTROYED` reason `UNDERMINED`).
4. **Deaths,** in `(y, x, id)` order: cause `ERUPTION`, kill credit to the
   Mole (Promotion and Slayer count it, a destroyed Egg too), then each
   death's Grave or Bitten rising under the ordinary rules (none on a Rift,
   none for a construct), and a Brain's Thralls collapse.
5. **Death blasts.** Exploding victims explode as a chain
   ([section 18.7](#187-where-chains-run-and-event-order)); the blasts hit
   everyone in their areas, the surfaced Mole and rider included, and a
   Goblin seat earns Plunder for its blasts' kills.
6. **Reveals.** Each surfaced unit (and rising) reveals its sight.

Events, one block per Mole, after `SHIELDS_RECHARGED` and the Cold Aura's
`UNITS_CHILLED` and before `PLAGUE_DAMAGED`: `UNIT_SURFACED` (its `results`
in `(y, x, id)` order, `damage` being HP damage), `FIELD_DEFENSE_DESTROYED`
(`UNDERMINED`) per tile in `(y, x)` order, `UNIT_DIED` (cause `ERUPTION`)
with `GRAVE_CREATED`, `BITTEN_UNIT_RISEN`, and `BRAIN_LOST` collapses as
they apply, the chain events, `PLUNDER_AWARDED`, and `TILES_REVEALED`; then
the economy changes of the surfacing.

**On the surfacing turn** the Mole and the rider may Move overland and
attack as usual, but neither can capture (`captureEligible` false: they
began the turn underground), the Mole cannot tunnel
(`TUNNEL_NOT_LEGAL` reason `SURFACED`), and the rider is braked
([section 22.4](#224-the-rider)). `surfacedThisTurn` is emptied at its
owner's End Turn, and an entry leaves it when its unit leaves the board.
If the owner is eliminated, its burrowed units are removed with the rest of
its units (`UNIT_DIED` cause `ELIMINATION`, no Grave, no blast).

### 22.4 The rider

- The rider uses its own slot and keeps its home city; a capture of that
  city orphans it while it is underground, like any unit.
- It travels with the Mole: it needs no path of its own and ignores
  Mountains, Forests, units, and ZOC on the way; its destination must be a
  tile it could stand on (a Mountain needs Engineering). With no free rider
  tile next to the destination, the Mole tunnels alone.
- It surfaces right after its Mole, never erupts, and is in the blast of an
  exploding unit the eruption killed.
- **The rider brake** (root ruling 1). On its surfacing turn it never ends a
  Move, or advances, on a settlement center its owner does not own (a
  neutral village, or a center of a city its owner does not own):
  `MOVEMENT_ILLEGAL` reason `SETTLEMENT_FORBIDDEN`, never offered. Its own
  centers are allowed, and the Mole is not braked. It cannot ride again
  that turn. Abroad it is never dug in; at home it is dug in if it then
  stands still within 1 of an own center.
- A ride moves a Hammerer up to 5 tiles in one turn (one to the Mole, three
  under, one beside the destination); with the brake, a rider captures a
  village at the Raider's pace from 5 or 6 tiles out and a turn earlier from
  7 (the [Dwarf overlay's](RULESET_7_DWARVES.md#55-the-rider) village race).

### 22.5 Gyrocopters and the bombing run

- **Flight.** The Gyrocopter has the Martian `FLY` movement mode, unchanged
  ([section 20.6](#206-movement-stride-flying-and-crossing-water)): it
  passes over units, ignores terrain stops and hostile ZOC, exerts no ZOC,
  has no cover or fortification, enters Mountains without Engineering, may
  stand on a Rift, never ends a Move on a neutral village center or a
  center of a city its owner does not own (so it never besieges or
  captures), never advances, cannot Pillage, crosses Shallow Water (Deep
  Water with Navigation), and self-launches where a Move ends on water. It
  takes a treasure chest by ending a Move on it.
- **No ordinary attack.** Its abilities are `FLY` and `BOMB_RUN`, with no
  `ATTACK`: `ATTACK` is never offered for it and is rejected with
  `UNIT_ROLE_INVALID`, and no reader that asks "can this unit attack" sees
  an attack.
- **It retaliates.** The retaliation test accepts `ATTACK` **or
  `BOMB_RUN`** (`roleRetaliatesV7`): a Gyrocopter attacked at distance 1
  strikes back with Attack 1.5 under the ordinary formula.

`BOMB_RUN { kind, unitId, targetUnitId, to }` is the Gyrocopter's Move and
its primary action at once. It is not an `ATTACK` and costs no Coins.
Legality, in this order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                                                                                                                                                                       | Rejection                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                                                                                                                                    | the ordinary unit errors                          |
| 2   | Its role has `BOMB_RUN`.                                                                                                                                                                                                                                                                                                                          | `UNIT_ROLE_INVALID { role }`                      |
| 3   | It has not moved, has not used a primary action, and has not landed this turn.                                                                                                                                                                                                                                                                    | `UNIT_ALREADY_ACTED`                              |
| 4   | It is in land form.                                                                                                                                                                                                                                                                                                                               | `BOMB_RUN_NOT_LEGAL { reason: "EMBARKED" }`       |
| 5   | It is not sluggish.                                                                                                                                                                                                                                                                                                                               | `BOMB_RUN_NOT_LEGAL { reason: "SLUGGISH" }`       |
| 6   | `targetUnitId` is a unit on the board the actor can see.                                                                                                                                                                                                                                                                                          | `TARGET_NOT_FOUND`                                |
| 7   | It is hostile to the actor.                                                                                                                                                                                                                                                                                                                       | `TARGET_ALLIED`                                   |
| 8   | It is within Chebyshev distance `BOMB_RANGE_V7` (2) of the Gyrocopter; distance 1 is legal.                                                                                                                                                                                                                                                       | `BOMB_RUN_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
| 9   | It is not in `bombedThisTurn`.                                                                                                                                                                                                                                                                                                                    | `BOMB_RUN_NOT_LEGAL { reason: "ALREADY_BOMBED" }` |
| 10  | `to` is Chebyshev-adjacent to the target, strictly farther (Chebyshev) from the Gyrocopter's tile than the target is, explored, holds no treasure chest, and is a tile on which an ordinary `MOVE` of this Gyrocopter could end this turn (within Move 3 under the flyer rules: no unit, no mound, not a forbidden center, not allied territory). | `BOMB_RUN_NOT_LEGAL { reason: "LANDING" }`        |

The target may be in any form (a land unit, a flyer, an Egg, an embarked
unit, or a boat). "Beyond the target" is the whole geometry rule: the
landing is next to the target and farther from the start; no flight path is
fixed. **Result,** in order:

1. **The flight.** The Gyrocopter stands on `to`. It is not a `MOVE`: the
   event carries `from` and `to` and no path, nothing about the way
   matters, it takes no chest, and it reveals its sight from `to`.
2. **The bomb** hits the target for the owner's `bombDamage`: **5**
   (`BOMB_DAMAGE_V7`), **6** with Dive (`DIVE_BOMB_DAMAGE_V7`, Raiding; the
   `pulp_wars-78i.7` values). Nothing else changes it: no Inspired, Gang Up,
   Charge, cover, fortification, Walls, Field Defense, Dig In, Snow,
   Blizzard, Defense, or HP ratio. Armoured takes 1 off, then Plated caps
   it, then a Shield absorbs first; it is capped at the target's HP. **It is
   never answered:** no retaliation.
3. The target joins `bombedThisTurn`.
4. **A kill** has cause `BOMB` and credits the Gyrocopter (Promotion,
   Slayer; a destroyed Egg counts), then the death's Grave or Bitten rising
   under the ordinary rules, and a Brain's Thralls collapse. There is no
   advance.
5. **A death blast** of an exploding target resolves as a chain: the
   Gyrocopter, standing next to it, is in the blast.
6. **Water.** If `to` is water and the Gyrocopter survived, it self-launches
   there (form `EMBARKED`, `UNIT_EMBARKED`).
7. The Gyrocopter has used its Move and its primary action and is handled.

A bomb destroys no Field Defense, inflicts no Plague, bite, or Infect, never
shatters, and is never halved by a Blizzard (it is not an `ATTACK`).
Events: `UNIT_BOMBED`, then `UNIT_DIED` (cause `BOMB`) with its Grave,
rising, or `BRAIN_LOST` events, the chain events, `PLUNDER_AWARDED`,
`TILES_REVEALED`, `UNIT_EMBARKED`, the naval blockade and sea-network
events (`BOMB_RUN` is on the recompute list), and the economy, reward, and
achievement tail. The preview is exact: every tile of a landing is
explored, the target is visible, and the damage is fixed.

`GameStateV7.bombedThisTurn` (sorted unit IDs) is emptied at the active
player's End Turn, and an entry leaves it when its unit leaves the board;
state parsing rejects a duplicate or unsorted entry, an ID that is not a
unit on the board, and any entry while the active player is not a Dwarf
seat. The limit is **per target and per turn across all of the seat's
Gyrocopters**: a unit loses at most 5 HP a turn to bombs (6 with Dive),
however many Gyrocopters there are, so no swarm of bombs kills a fresh unit
of 7 HP or more.

HP left after one bomb on a fresh target (Shield absorbed in brackets):

| Target (HP)                                                                                                                          | Bomb 5 | Dive 6 |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| Fighter, Marksman, Raptor (12)                                                                                                       | 7      | 6      |
| Guard (17)                                                                                                                           | 12     | 11     |
| Captain, Catapult, Knight, Skeleton, Ghoul, Necromancer, Lich, Vampire, Wolf Rider, Scrap Buggy, Caveman, Spitter, Shaman, Sled (10) | 5      | 4      |
| Banshee, Bomb Chucker, Rocket Cart, Snow Hunter (8)                                                                                  | 3      | 2      |
| Goblin (6), Egg (6)                                                                                                                  | 1      | killed |
| Ankylosaurus (20, Armoured)                                                                                                          | 16     | 15     |
| Grunt (10, Shield 2)                                                                                                                 | 7 (2)  | 6 (2)  |
| Ray Gunner, Brain, Saucer (8, Shield 2)                                                                                              | 5 (2)  | 4 (2)  |
| Grunt in a Force Field (10, Shield 4)                                                                                                | 9 (4)  | 8 (4)  |
| Yeti (9)                                                                                                                             | 4      | 3      |

### 22.6 Clockwork

- **Unflinching, on attack only.** When a construct (Clockwork Gunner,
  Brass Titan) in land form makes an `ATTACK`, its own force uses its
  maximum HP instead of its current HP (the attacker term
  `attack × hp / maxHp` of [section 13.2](#132-damage) becomes `attack`).
  As a defender and when it retaliates it is an ordinary unit, so wounded
  clockwork is finished like any wounded unit. The combat preview reports
  `unflinchingApplied`.
- **Not living:** Wail never targets a construct, Plague is never applied
  to or spread onto it, it is never Bitten, it never rises (a Zombie that
  kills it gets no Zombie), and it leaves no Grave on any death.
- **Mind Control** rejects it with `MIND_CONTROL_NOT_LEGAL` reason
  `TARGET_IMMUNE` (the Titan is immune anyway as a `JUGGERNAUT`).
- **What still applies:** Chill (the Titan too) and Shatter (never the
  Titan), Push, the Tractor Beam, Knockback, Kaboom and blasts, splash,
  Pierce, Sweep, Acid, and Lifesteal.
- **Never mends itself:** no explicit Recover
  (`RECOVER_NOT_LEGAL { reason: "CONSTRUCT" }`, never offered), no idle
  recovery, no Windmill healing. It heals only by an Engineer's Repair (+4,
  it is a machine) and by a Promotion (a full heal to the new maximum). A
  Gunner can be disbanded like any trainable unit (refund 1).
- **The Clockwork Gunner's two shots.** When the Gunner fires its first
  shot its allowance is 2 (`GUNNER_UNMOVED_SHOTS_V7`, role mechanic
  `unmovedShots`) if its `moved` flag is false and 1 otherwise. Each shot is
  an ordinary `ATTACK` (range 1–2, retaliation, Unflinching, kill credit,
  the Field Defense rules) at any legal target. A Gunner that has fired
  cannot move (`MOVE` is rejected with `UNIT_ALREADY_ACTED` and never
  offered), and it never advances after a kill, so both shots come from the
  tile where it stood. A Gunner that landed this turn cannot fire; a
  sluggish Gunner that has not moved fires twice, one that moved cannot
  fire. An assembled or trained Gunner is exhausted until its owner's next
  Start Turn. The combat preview's `attacksRemaining` is 1 after the first
  shot of an unmoved Gunner and 0 otherwise; the unit stats carry
  `shotsLeft`.

### 22.7 Dig In

A land-form unit whose role has `digsIn` (Hammerer, Steam Mole), owned by a
seat with the `digIn` capability (Dig In, the Dwarf Fortification), **is dug
in** (`unitIsDugInV7`) when both hold:

1. its activation's `moved` is false: during its owner's turn it has not
   moved this turn; during any other player's turn it did not move on its
   owner's last turn (the flag is reset only at its owner's Start Turn).
   Activations are public, so every preview equals its result;
2. it stands within Chebyshev 1 (`DIG_IN_RADIUS_V7`) of the center of a city
   its owner owns, whatever the tile's territory.

A dug-in unit has **one fortification level in the Field Defense part** of
its fortification (`fortificationPartsForUnitV7`):
`fieldDefense = max(Field Defense on its own-territory tile ? 1 : 0, dug in ? 1 : 0)`.
So Dig In and Field Defense never stack, and Walls add to it as they add to
Field Defense: a dug-in Hammerer on its Walled center has fortification 3.
Dig In is computed before the territory checks that gate Walls and Field
Defense, so a dug-in unit on a ring tile in another city's footprint keeps
its level. It is exactly Field Defense for free, but only while standing
still and only on the nine tiles around each own center: a Fighter deals a
dug-in Hammerer 4 and takes 8 (in the open 5 and 5).

- **What counts as moving:** a `MOVE` (an interrupted one too), a `TUNNEL`,
  a ride, a landing, and **an advance after a kill: a Hammerer's or a
  Mole's advance sets its `moved` flag** (no other unit's advance does). An
  attack without an advance, Recover, Wait, Pillage, and a capture are not
  moves. A Push, a pull, a Knockback, and a displacement are not Moves
  either: the unit keeps its `moved` flag, and Dig In is read on the tile
  where it now stands.
- **Units that arrive this turn are not dug in:** a trained, rewarded,
  treasure, or assembled unit has the exhausted activation (`moved` true)
  until its owner's next Start Turn. A unit that surfaced this turn has the
  fresh activation, so it is dug in if it then stands still within 1 of an
  own center.
- **Ignored by everything that ignores fortification:** Charge!, Acid, the
  Disintegrator, Boulders, and a Steam Cannon with Blasting Charges remove
  it with the rest of the fortification. Wallbreaker removes only the Walls
  levels, so Dig In stays. Dig In is not a tile layer: no attack destroys
  it. The combat preview carries `dugIn`, and its level is in
  `fortificationLevel`. Fixed damage (eruptions, bombs, blasts, Kaboom,
  Sweep, Plague) ignores it; Wail, which uses the ordinary formula, reads
  it.

### 22.8 Engineer: Repair and Assemble

The Engineer has the Captain's body (5 Coins, 10 HP, Attack 1, Defense 1,
Move 1, no capture), no Rally, and two support actions. A sluggish
Engineer that moved can use neither.

- **Repair** is `TEND_WOUNDED` under the Dwarf label, with the Tend Wounded
  rules of [section 10](#10-recovery-and-support) (every adjacent own
  land-form unit other than the Engineer, not yet tended this turn, that is
  damaged, plagued, bitten, or Chilled; it cures Plague and bites and sets
  a Chill entry to thawing), except that a **machine** heals
  `min(REPAIR_MACHINE_V7 (4), maxHp − hp)` instead of 2 (role mechanic
  `repairMachineHeal` on the Engineer). `WOUNDED_TENDED` keeps its shape,
  and `previewTendWoundedV7` previews the 4.

`ASSEMBLE { kind, unitId, to }` is a primary action of the Engineer: it
builds a Clockwork Gunner on a free tile next to itself. Legality, in this
order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                                                                    | Rejection                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                                 | the ordinary unit errors                    |
| 2   | Its role has `ASSEMBLE`.                                                                                                                                                                                                                       | `UNIT_ROLE_INVALID { role }`                |
| 3   | The actor has the `assemble` capability (Marksmanship).                                                                                                                                                                                        | `TECH_REQUIRED { tech: "MARKSMANSHIP" }`    |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Engineer has not moved.                                                                                                                                              | `UNIT_ALREADY_ACTED`                        |
| 5   | It is in land form.                                                                                                                                                                                                                            | `ASSEMBLE_NOT_LEGAL { reason: "EMBARKED" }` |
| 6   | It has a home city owned by the actor (an orphaned Engineer cannot Assemble).                                                                                                                                                                  | `ASSEMBLE_NOT_LEGAL { reason: "NO_HOME" }`  |
| 7   | That city has a free slot for a Gunner (`used + 1 <= capacity`, [section 4.4](#44-unit-capacity)).                                                                                                                                             | `CITY_CAPACITY_FULL`                        |
| 8   | The actor has at least the cost in Coins.                                                                                                                                                                                                      | `INSUFFICIENT_COINS`                        |
| 9   | `to` is one of the eight tiles around the Engineer, land and not a Rift, enterable by a Gunner (a Mountain needs Engineering), with no unit, no mound, and no treasure chest, not a settlement site, and not in territory allied to the actor. | `INVALID_TILE { action: "ASSEMBLE" }`       |

- **Cost:** `ASSEMBLE_COST_V7` **4** Coins (1 more than training a Gunner),
  1 less when the Engineer's home city has a Forge with positive output (the
  Arms Industry rule of [section 4.6](#46-training-and-city-center-spawning)).
- **Result.** The Coins are spent. A new Clockwork Gunner with the next
  entity ID stands on `to`: owned by the actor, homed to the Engineer's
  home city, at full HP, with zero kills, the exhausted activation, and
  `captureEligible` false. Field Defense on `to` is destroyed when the
  tile's territory belongs to a player hostile to the actor (reason
  `OCCUPATION`, the Beam Down precedent). The Gunner reveals its sight. The
  Engineer has used its primary action and is handled. Events:
  `UNIT_ASSEMBLED`, `FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then the
  economy, reward, and achievement tail.
- It spends **no city action**, and a siege of the home city does not block
  it; a pending city reward blocks it like every command. It may follow a
  Move. Every tile around the Engineer is explored by its owner, so the
  command is exact.

### 22.9 Steam Cannon: Knockback

- **Knockback** (role mechanic `knockback`). After an `ATTACK` by a
  land-form Steam Cannon (always at distance 2 or 3), a target that survives
  is pushed one tile **directly away**: to its tile plus
  `(sign(dx), sign(dy))`, where `(dx, dy)` is the target's offset from the
  Cannon. The push happens only under the Push conditions of
  [section 13.4](#134-after-combat) (on the board, explored by the attacker,
  no unit and no mound, not a settlement site, the same land or water kind,
  enterable by the target, not in territory allied to the target) and with
  no treasure chest there. A `JUGGERNAUT`-role unit, a two-slot unit, and an
  Egg are never knocked back. It is the Push step: the same place in the
  resolution order, the same `UNIT_PUSHED` event, and the preview field
  `push`. As for the Charge! push, an unexplored tile reads
  `UNKNOWN_BEHIND_FOG` and never pushes, and a Mountain or Deep Water behind
  another player's unit reads `UNKNOWN_BEHIND_FOG` in the public preview
  (that owner's Engineering and Navigation are private; a Mountain behind a
  walker, flyer, or Mountain-born unit is exact), while the resolution
  reads the owner's technologies. The target keeps its HP, statuses,
  activation, and Chill and gets
  `captureEligible` false; Dig In is read on its new tile. A Knockback can
  empty a center; a capture still needs a unit that begins its turn there.
- **Otherwise a Catapult:** 8 Coins, 10 HP, Attack 3.5, Defense 0.5, range
  2–3, no attack after moving, no capture, no advance, and every attack
  destroys Field Defense on the target tile (reason `CATAPULT`).
- **Blasting Charges** (capability `cannonIgnoresFortification`): its
  attacks ignore fortification (Walls, Field Defense, and Dig In) for the
  damage and the retaliation, with the Boulders convention: cover stays,
  Walls are not destroyed, and the preview reports the removed levels in
  `fortificationIgnored` ([section 13.3](#133-fortification)).

### 22.10 Steam Tank: Plated, and the Brass Titan

- **Plated** (role mechanic `plated: 4`, `PLATED_CAP_V7`): every single
  instance of damage to a land-form Steam Tank is capped at 4 HP: an attack
  hit, retaliation, splash, Pierce, a Sweep flank hit, Wail, Kaboom, a death
  blast, a bomb, an eruption, and Plague. The cap applies after Armoured and
  before a Shield (the Tank has neither). The combat preview's damage is the
  capped value, with `platedApplied`; the Shatter test reads the HP after the
  cap. Every unit in the game needs at least four hits to kill a fresh Tank.
- The **Steam Tank** otherwise has Knight parity for no capture: 9 Coins,
  16 HP, Attack 3, Defense 2, **Move 2**, the advance after a melee kill,
  and **no Overrun**.
- The **Brass Titan** is the level-5 reward unit: 36 HP, Attack 4, Defense
  3, Move 1, Push on an adjacent surviving target, capture, the advance, no
  Pillage, no Disband, and the construct rules (Unflinching on attack only,
  no self-repair, no Grave, not living, Mind Control-immune). It arrives on
  the city center at full HP and exhausted, like every reward unit.

### 22.11 Resolution order

**An attack** is the ordinary resolution of
[section 13](#13-combat-and-fortification) with the Ice Folk steps of
[section 21.13](#2113-attack-resolution-order), and these Dwarf steps:

1. Attack: **Unflinching** (a construct attacker's force uses its maximum
   HP). Defense: fortification with **Dig In** in the Field Defense part (0
   for Acid, Charge!, Boulders, the Disintegrator, and a Steam Cannon with
   Blasting Charges), then cover.
2. Damage both ways from pre-combat HP; the Blizzard; Armoured; **Plated**;
   Martian Shields absorb.
3. The Shatter test; Lifesteal; Sweep; kill credit; growth.
4. Field Defense destroyed on the target tile under the ordinary reasons
   (`CATAPULT` for a Steam Cannon).
5. Deaths in order, each with its Grave or rising (none for a construct).
6. The Push and **Knockback**, then the advance (never for a Clockwork
   Gunner; a Hammerer's or a Mole's advance sets its `moved` flag).
7. Death-blast chains, Plunder, reveals, and the ordinary tail.

**Start Turn** for the active seat:

```text
reset activations and capture eligibility → city actions available →
Mind Control cooldowns → Shield recharge → Cold Aura → SURFACING →
Plague and its chain → hatching → Windmill healing (constructs skipped) →
Troll regeneration → income → rewards → achievements
```

**End Turn** for the active seat:

```text
idle recovery (constructs skipped) → Inspired and Overrun expire → Cooling →
Force Fields → Chill countdown (burrowed units included) →
empty surfacedThisTurn and bombedThisTurn → income preview → next seat's Start Turn
```

### 22.12 Starting units, rewards, and treasure

| Source                             | Dwarf                          |
| ---------------------------------- | ------------------------------ |
| Starting unit                      | one Hammerer                   |
| Level-3 Militia reward (`MILITIA`) | one Hammerer                   |
| Level-5+ reward (`JUGGERNAUT`)     | Brass Titan                    |
| Treasure chest unit                | **Gyrocopter** (role `RAIDER`) |

- A Dwarf seat starts with one Hammerer on its capital at full HP, 5 Coins,
  and no technology (`STARTING_FIGHTERS_V7` and `MILITIA_FIGHTERS_V7` are 1).
  The starting Hammerer has the fresh setup activation, so once the seat has
  Dig In it is dug in on its capital center if it does not move.
- Reward and treasure units arrive at full HP and exhausted until their
  owner's next Start Turn (so a Militia Hammerer is not dug in on its first
  enemy turn). `treasureUnitRole` is `RAIDER`; a treasure Gyrocopter needs a
  city with a free slot, otherwise the chest gives 5 Coins.
- There is no Dwarf mirror in the browser or the balance matrix (one
  faction per player, [section 2.1](#21-match-setup)); every Dwarf rule is
  written per seat (`bombedThisTurn` and `surfacedThisTurn` belong to the
  active seat, Dig In reads its own owner's cities), so a headless or test
  mirror with `allowDuplicateFactions` stays correct.

### 22.13 Interactions with other rules

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, Raise Dead      | A Dwarf land unit leaves a Grave like any unit, except a construct (never); eruption and bomb kills of other factions' units leave ordinary Graves (none on a Rift). Raise Dead never raises onto a mound tile: a Grave under a mound cannot be raised until the mound surfaces.                                                                                                                                                                                                                                                                                                                               |
| Infect, Bitten          | A living Dwarf unit killed by a Zombie rises as the Zombie's owner's Zombie; a construct never rises and is never bitten. A Bitten victim of an eruption or a bomb rises as its biter's Zombie. A burrowed unit cannot be infected, and its Bitten entry stays. Repair cures bites.                                                                                                                                                                                                                                                                                                                            |
| Plague, Wail            | Plague applies to living Dwarf units, never to constructs; a burrowed plagued unit keeps its entry and, surfacing before Plague resolves, takes its damage on the board; Plague never spreads to or from a mound; Repair cures it. Wail targets living Dwarf units only, never a construct or a mound; it is not an attack, so it reads Dig In with the rest of the fortification (1 on a dug-in Hammerer, 2 in the open).                                                                                                                                                                                     |
| Lifesteal, Undead       | A Vampire heals by the damage it deals any Dwarf unit, constructs included, and draws no retaliation. Restless is an Undead rule only: Dwarf units recover under the Human rule, except constructs, which never recover. Frenzy is ordinary.                                                                                                                                                                                                                                                                                                                                                                   |
| Goblin rules            | [Section 18.11](#1811-interactions-with-other-rules): blasts and Kaboom are fixed damage (they ignore Dig In and Walls; a Steam Tank takes at most 4), never find a mound, and hit the Gyrocopter beside a bombed exploding unit or the surfaced pair beside an erupted one; Gang Up does not ignore Dig In; Plunder counts Dwarf kills, constructs included.                                                                                                                                                                                                                                                  |
| Dinosaur rules          | [Section 19.12](#1912-interactions-with-other-rules): eruptions hit Eggs; a bomb leaves a 6-HP Egg at 1 (a Dive bomb destroys it); Armoured takes 1 off an eruption and a bomb; Charge! and Acid ignore Dig In, Wallbreaker keeps it; two-slot dinosaurs and Eggs are never knocked back; nothing ends on a mound.                                                                                                                                                                                                                                                                                             |
| Martian rules           | [Section 20.11](#2011-interactions-with-other-rules): Shields absorb eruptions and bombs first; eruptions never hit flyers but hit walkers; constructs are immune to Mind Control; a mound is never a Mind Control, Tractor Beam, or Pierce target; the Disintegrator ignores Dig In; the Saucer and the Gyrocopter share the flight rule.                                                                                                                                                                                                                                                                     |
| Ice Folk rules          | [Section 21.14](#2114-interactions-with-other-rules): tunnels ignore Snow; deep snow stops only the Move-2 Steam Tank; every Dwarf unit can be Chilled (the Titan too) and shattered (never the Titan); a sluggish Gyrocopter cannot bomb, a sluggish Mole may tunnel; the Shatter test reads a Tank's HP after the cap; the Blizzard halves a Gunner's or Cannon's shot from distance 2 or more, never a bomb or eruption.                                                                                                                                                                                    |
| Human abilities         | An eruption undermines Field Defense on nine tiles, whoever owns it; Walls are untouched; bombs and eruptions ignore both; Dig In and Field Defense never stack. A Catapult destroys Field Defense, never Dig In, and out-ranges every Dwarf unit but the Steam Cannon. A Juggernaut pushes a Dwarf unit under the ordinary conditions (Dig In read on the new tile), never onto a mound. A Knight's kill of a surfaced Mole may continue its Overrun; the Steam Tank has none. An Escape Move never ends on a mound. Human and Dinosaur healers tend only their own units.                                    |
| Cities, siege, capacity | Capture-capable: Hammerer, Clockwork Gunner, Steam Mole, Brass Titan. A Dwarf unit on a hostile center besieges it; a mound and a Gyrocopter never do. The Mole may step onto a center on its surfacing turn and capture on the next; the rider may not. Every Dwarf role uses one slot; a burrowed unit keeps its slot and home; Assemble uses the Engineer's home city's slot; Dwarf cities have no capacity bonus. Dig In counts around the seat's own centers only: a captured city's ring stops counting at once, and a captured one starts at once. Tunnel, Bomb Run, and Assemble spend no city action. |
| Boats, water            | Dwarf boats are the Human boats. Foot units and machines but the Gyrocopter embark at Ports with Shorecraft; the Gyrocopter flies over water and self-launches. A tunnel never passes under water; eruptions skip naval and embarked units; bombs may target them. An embarked unit is never dug in.                                                                                                                                                                                                                                                                                                           |
| Rift                    | Tunnels pass under a Rift but never end there, and a rider's tile is never one. A Gyrocopter may stand on a Rift as a flyer (it lands there from a bombing run as from a Move); there it is attacked, bombed, and Chilled like any unit, leaves no Grave, and is immune to Mind Control. No eruption case arises (a unit on a Rift flies). Assemble and Knockback never put a ground unit on a Rift.                                                                                                                                                                                                           |
| ZOC, Roads              | Tunnels and bombing runs ignore ZOC and Roads; a mound exerts no ZOC; surfaced units exert and suffer it; a Gyrocopter ignores hostile ZOC and exerts none. A Move may pass over a mound tile.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Achievements, Promotion | Promotion is the ordinary rule for every Dwarf unit (3 kills, +5 maximum HP, a full heal), constructs included: it is a construct's only full heal. Eruption, bomb, and retaliation kills are credited. Muster counts the Dwarf trainable roles on the board (a burrowed unit when it surfaces; an assembled Gunner at once); Slayer counts eruption and bomb kills.                                                                                                                                                                                                                                           |

### 22.14 Commands, events, errors, and queries

- **Commands:** `TUNNEL { kind, unitId, to, rider: null | { unitId, to } }`,
  `BOMB_RUN { kind, unitId, targetUnitId, to }`, and
  `ASSEMBLE { kind, unitId, to }`, in that order right after `COLD_SNAP` in
  `COMMAND_KIND_ORDER_V7`. `MOVE` refuses mound tiles, the rider's foreign
  centers on its surfacing turn, and a Gunner after a shot; `ATTACK` allows
  the Gunner's second shot and is refused for a Gyrocopter; `TEND_WOUNDED`
  heals machines 4 for an Engineer; `RECOVER` is refused for constructs. A
  pending city reward blocks the three commands like every command.
- **State:** `burrowed`, `surfacedThisTurn`, and `bombedThisTurn`, hashed,
  saved, and replayed like `chilled`; `PlayerViewV7` carries the same three,
  filtered by visibility ([section 15](#15-fog-and-observation)). Dig In
  stores nothing.
- **Events** (`DOMAIN_EVENT_KIND_ORDER_V7`):

  ```text
  UNIT_ASSEMBLED { playerId, unitId, assembledUnitId, at, cityId, cost }          // after UNIT_TRAINED
  UNIT_TUNNELLED { playerId, unitId, from, to, riderUnitId, riderFrom, riderTo }  // after UNIT_PULLED
  UNIT_SURFACED  { playerId, unitId, at, riderUnitId, riderAt, eruptionDamage,
                   results: [{ unitId, at, damage, dies, shieldDamage }] }        // after UNIT_TUNNELLED
  UNIT_BOMBED    { playerId, unitId, from, to, targetUnitId, at, damage,
                   shieldDamage, killed }                                         // after COMBAT_RESOLVED
  ```

  `UNIT_DIED.cause` gains `BOMB` and `ERUPTION`;
  `FIELD_DEFENSE_DESTROYED.reason` gains `UNDERMINED`;
  `UNIT_MOVE_INTERRUPTED.reason` and the movement failure reasons gain
  `MOUND`. Knockback reuses `UNIT_PUSHED` and Repair `WOUNDED_TENDED`. There
  is no event for Dig In, which is derived.

- **Combat preview** (`CombatPreviewV7`, so also `COMBAT_RESOLVED`), three
  fields, all false for an attack that involves no Dwarf unit: `dugIn` (the
  defender is dug in; its level is in `fortificationLevel`),
  `unflinchingApplied` (the attacker is a land-form construct), and
  `platedApplied` (a hit on a Plated unit was capped; the damages are the
  capped values). Blasting Charges reports its removed levels in
  `fortificationIgnored`, Knockback uses `push`, and `attacksRemaining`
  reports the Gunner's second shot.
- **Errors:** `TUNNEL_NOT_LEGAL` (reasons `EMBARKED`, `SURFACED`,
  `DESTINATION`, `RIDER`, `RIDER_DESTINATION`), `BOMB_RUN_NOT_LEGAL`
  (`EMBARKED`, `SLUGGISH`, `OUT_OF_RANGE`, `ALREADY_BOMBED`, `LANDING`), and
  `ASSEMBLE_NOT_LEGAL` (`EMBARKED`, `NO_HOME`); `RECOVER_NOT_LEGAL` gains
  `CONSTRUCT`. A command naming a burrowed unit is `UNIT_ALREADY_HANDLED`;
  the rider's forbidden center is `MOVEMENT_ILLEGAL` reason
  `SETTLEMENT_FORBIDDEN`.
- **Registration:** faction `DWARF`, tree `DWARF_BASELINE_V1`, display name
  "Dwarf"; unlock kinds `ENGINEER_SUPPORT`, `ASSEMBLE`, `DIVE`, `DIG_IN`, and
  `BLASTING_CHARGES`; capabilities `digIn`, `assemble`, `bombDamage`,
  `eruptionDamage`, and `cannonIgnoresFortification`; abilities
  `RIDES_TUNNEL`, `DIG_IN`, `BOMB_RUN`, `CLOCKWORK`, `TWIN_SHOT`, `TUNNEL`,
  `ERUPTION`, `ASSEMBLE`, `KNOCKBACK`, and `PLATED` (Repair keeps the
  `TEND_WOUNDED` literal); role mechanics `construct`, `unflinchingAttack`,
  `repairsAsMachine`, `repairMachineHeal`, `digsIn`, `tunnelRange`,
  `ridesTunnel`, `bombs`, `unmovedShots`, `knockback`, and `plated`, with
  `buildsFieldDefense` false for the Hammerer and the Mole and
  `advancesAfterKill` false for the Gyrocopter, the Gunner, and the Cannon;
  faction rules `snow` false and `treasureUnitRole` `RAIDER`; constants
  `TUNNEL_RANGE_V7` 3, `ERUPTION_DAMAGE_V7` 2, `BLASTING_ERUPTION_DAMAGE_V7`
  3, `BOMB_RANGE_V7` 2, `BOMB_DAMAGE_V7` 5, `DIVE_BOMB_DAMAGE_V7` 6,
  `GUNNER_UNMOVED_SHOTS_V7` 2, `DIG_IN_RADIUS_V7` 1, `REPAIR_MACHINE_V7` 4,
  `ASSEMBLE_COST_V7` 4, and `PLATED_CAP_V7` 4.
- **Derived queries** for a state and a view: `boardUnitsV7`,
  `allOwnedUnitsV7`, and `tileOccupiedV7`; `isLivingUnitV7`;
  `unitIsDugInV7` (canonical) and `publicUnitIsDugInV7` (from the public
  stats).
- **`queryPlayerCommandsV7`** offers, for a Dwarf seat, `TUNNEL` for every
  legal `(Mole, to, rider)` (one entry per destination and per rider tile,
  plus the rider-less entry), `BOMB_RUN` for every legal
  `(Gyrocopter, target, to)`, `ASSEMBLE` for every legal `(Engineer, to)`,
  the Gunner's second shot, and Repair. It never offers `ATTACK` for a
  Gyrocopter, `RECOVER` for a construct, `MOVE` for a Gunner that fired, a
  Move onto a mound, a rider's foreign center on its surfacing turn, any
  command for a burrowed unit, or Field Defense or Rally to a Dwarf seat.
  Every offered command is accepted.
- **Previews,** each null unless the command is offered:
  `previewTunnelV7(view, command)` →
  `{ unitId, to, riderUnitId, riderTo, eruptionDamage, projected: true, eruptionTargets, undermines }`,
  the eruption **as if it happened on the current board** (the targets may
  move first; `eruptionTargets` are the visible hostile ground units around
  `to`, `undermines` the explored Field Defense tiles);
  `previewBombRunV7(view, command)` →
  `{ unitId, targetUnitId, to, damage, shieldDamage, kills, blast, landingThreat }`,
  the exact bomb, the blasts of a killed exploding target, and
  `landingThreat`, the sum over every visible hostile unit whose threatened
  tiles include `to` of one full-strength hit on the Gyrocopter there (a
  hostile Gyrocopter's public bomb), capped at its HP; and
  `previewAssembleV7(view, unitId)` →
  `{ unitId, cost, cityId, usedSlots, capacity, tiles }`.
  `queryAssembleUnavailableReasonV7` tells the UI why an own Engineer cannot
  Assemble.
- `queryCombatPreviewV7` and `estimateCombatV7` include Dig In (from the
  defender's current `moved` flag and the public `dugIn`), Unflinching,
  Plated, Blasting Charges, the Gunner's allowance, and Knockback.
  `queryThreatenedTilesV7` gives a visible, non-sluggish Gyrocopter its
  bombing reach (every tile within 2) and no ordinary attack reach, each
  mound its eruption ring and surfacing reach (the tiles within 2 of the
  mound), and a Gunner range 2 from every tile it can reach.
- **Public unit stats** carry, for every unit when the match has a Dwarf
  seat, `bombedThisTurn` and `surfacedThisTurn` (booleans), and for units
  of a Dwarf seat the `dwarf` block: `construct`, `machine`, `dugIn`,
  `digsIn`, `shotsLeft` (a Gunner's shots left this turn on its owner's
  turn, otherwise on its owner's next turn if it does not move; null for
  every other role), `plated` (4 or null), `tunnelRange` (3 for the Mole, 0
  otherwise), the owner's `eruptionDamage` and `bombDamage`, and `burrowed`
  (true for a mound's record).
- `PublicPlayerV7` and the leaderboard carry `DWARF` and `DWARF_BASELINE_V1`;
  the leaderboard counts all owned units, burrowed ones included.

## 23. Revision history

| Revision | Ruleset ID           | Main changes                                                                                                                                                                                                                                                                                                             | Source                                                          |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 3        | `pulp-wars-poc-7r3`  | Original-faction baseline: four land branches, growth rewards, achievements, combat kernel                                                                                                                                                                                                                               | [RULESET_7.md](RULESET_7.md)                                    |
| 4        | `pulp-wars-poc-7r4`  | Regional biomes; Ore returns; Mine 5/+2; Forge +1 per Mine                                                                                                                                                                                                                                                               | [revision 4](RULESET_7_REVISION_4_BIOME_ECONOMY.md)             |
| 5        | `pulp-wars-poc-7r5`  | Explorer achievement; Monument placement flow                                                                                                                                                                                                                                                                            | [revision 5](RULESET_7_REVISION_5_ACHIEVEMENTS.md)              |
| 6        | `pulp-wars-poc-7r6`  | Map types, water, Fish, Pearls, Ports, Naval branch, transport, Patrol Boat, Battleship                                                                                                                                                                                                                                  | [revision 6](RULESET_7_REVISION_6_WATER_NAVAL.md)               |
| 7        | `pulp-wars-poc-7r7`  | Neutral Roads, automatic embark, Battleship splash, flat fortification levels, Field Defense; removed Saboteur                                                                                                                                                                                                           | [revision 7](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md)   |
| 8        | `pulp-wars-poc-7r8`  | Adjacent shared processor contributors                                                                                                                                                                                                                                                                                   | [revision 8](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md)        |
| 9        | `pulp-wars-poc-7r9`  | 23-node Human tree, Captain, Knight, Overrun, Land Grant, Shipyard, Market move, separate land/sea trade                                                                                                                                                                                                                 | [revision 9](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md)          |
| 10       | `pulp-wars-poc-7r10` | Road movement without capital connection; city-center spawning; full-turn Fortify                                                                                                                                                                                                                                        | [revision 10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)    |
| 10 (fix) | `pulp-wars-poc-7r11` | An occupied center blocks land training; displacement applies only to reward units                                                                                                                                                                                                                                       | [revision 10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)    |
| 11       | `pulp-wars-poc-7r11` | One city action per turn; Windmill healing; Road population; Commerce ×2 Market; Ore on Drill; Pillage on Raiding; tactical AI                                                                                                                                                                                           | [revision 11](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md)       |
| 12       | `pulp-wars-poc-7r12` | No starting technology; free first tier-1 research; Fruit always visible, Fertile Ground on Gathering; resources kept under improvements; AI opener; Raider Escape                                                                                                                                                       | this document                                                   |
| 13       | `pulp-wars-poc-7r13` | Undead faction (per-seat factions, roster, Graves, Restless, Frenzy, Raise Dead, Devour, Infect, Lifesteal, Wail, Lich splash)                                                                                                                                                                                           | [revision 13](RULESET_7_REVISION_13_UNDEAD.md)                  |
| 14       | `pulp-wars-poc-7r14` | Plague (Lich) and Bitten (Zombie); Tend cures; unanswered Vampire; Lich Attack 3; +1 village; level income cap 5; Commerce no longer doubles Markets                                                                                                                                                                     | [revision 14](RULESET_7_REVISION_14_BALANCE.md)                 |
| 15       | `pulp-wars-poc-7r15` | Plague lasts three owner turns and spreads only on the first; Zombie 18 HP                                                                                                                                                                                                                                               | [revision 15](RULESET_7_REVISION_15_BALANCE.md)                 |
| 16a      | `pulp-wars-poc-7r16` | Orthogonal Shallow Water (25% minimum); capital growth guarantee and `CAPITAL_GROWTH`; Normal AI growth-first opening                                                                                                                                                                                                    | [revision 16](RULESET_7_REVISION_16.md)                         |
| 16b      | `pulp-wars-poc-7r16` | Patrol Boat and embarked Move 2; landing costs one movement point; landing preview                                                                                                                                                                                                                                       | [revision 16](RULESET_7_REVISION_16.md)                         |
| 16c      | `pulp-wars-poc-7r16` | Research tiers 5+1/7+3/12+5 per extra city; level income cap 4; Market cap 3                                                                                                                                                                                                                                             | [revision 16](RULESET_7_REVISION_16.md)                         |
| 17       | `pulp-wars-poc-7r17` | Goblin faction: roster, Warrens, Gang Up, Kaboom, death blasts and chains, friendly-fire bombs, Plunder, WAAAGH!, Troll regeneration; `END_TURN` blockade events                                                                                                                                                         | [revision 17](RULESET_7_REVISION_17_GOBLINS.md)                 |
| 17       | `pulp-wars-poc-7r17` | `pulp_wars-0ao.7` tuning: one starting Goblin; Goblin Attack 1.5, Defense 0.5, Kaboom 5; death blasts 2/4/4; Goblin-only Normal AI changes                                                                                                                                                                               | [revision 17](RULESET_7_REVISION_17_GOBLINS.md)                 |
| 17 (fix) | `pulp-wars-poc-7r17` | `pulp_wars-0ao.15`: landing ends the activation for every faction (no Attack, Kaboom, Move, or Disband after landing)                                                                                                                                                                                                    | [revision 16](RULESET_7_REVISION_16.md)                         |
| 18       | `pulp-wars-poc-7r18` | Movement (`pulp_wars-6gd.2`): a Move passes through the mover's own units and never ends on one; the Road half cost depends only on the tile being left                                                                                                                                                                  | [revision 18](RULESET_7_REVISION_18.md)                         |
| 18       | `pulp-wars-poc-7r18` | Showcase (`pulp_wars-6gd.3`): the fixed 16 x 16 `SHOWCASE` map type with three developed cities, every technology, and one unit of every role per seat                                                                                                                                                                   | [revision 18](RULESET_7_REVISION_18.md)                         |
| 19       | `pulp-wars-poc-7r19` | Dinosaur faction (`pulp_wars-c87.2`–`c87.7`): roster, slots, Eggs, Shaman Hatch, Nesting, Grow, Wild, Acid, Armoured, Stampede, treasure Raptor                                                                                                                                                                          | [revision 19](RULESET_7_REVISION_19_DINOSAURS.md)               |
| 19       | `pulp-wars-poc-7r19` | `pulp_wars-c87.8` interim tuning: Caveman 12 HP; one-slot Triceratops hatching in one turn; Forest Stampede lanes; Dinosaur-only AI changes                                                                                                                                                                              | [revision 19](RULESET_7_REVISION_19_DINOSAURS.md)               |
| 20       | `pulp-wars-poc-7r20` | `pulp_wars-0hi.2`: Charge! replaces Stampede (Triceratops Move 2, 20 HP, 2 slots, hatch 2); T-Rex 14, hatch 4; Nesting slot; Wallbreaker; full heal                                                                                                                                                                      | [revision 20](RULESET_7_REVISION_20.md)                         |
| 21       | `pulp-wars-poc-7r21` | `pulp_wars-9s0.4`: Conqueror, Land Baron, Sea Dog, and Slayer achievements (seven entitlements per seat)                                                                                                                                                                                                                 | [revision 21](RULESET_7_REVISION_21_ACHIEVEMENTS.md)            |
| Martian  | `pulp-wars-poc-7r22` | Martian faction (`pulp_wars-t6s.2` engine): roster, Shields, Force Field(s), heat rays, Cooling, Pierce, Disintegrator, Stride, Flying, self-launch, Beam Down, Mind Control, Thralls, Tractor Beam                                                                                                                      | [Martian overlay](RULESET_7_MARTIANS.md)                        |
| 20 (bal) | `pulp-wars-poc-7r23` | `pulp_wars-0hi.3` coarse Dry Land balance: Human Fighter, Raider, and Marksman 12 HP, Guard 17; Caveman 10                                                                                                                                                                                                               | [revision 20](RULESET_7_REVISION_20.md#63-tuning-record)        |
| Martian  | `pulp-wars-poc-7r23` | `pulp_wars-t6s.4` Martian UI (setup offers Martians; `t6s.6` production art) and `t6s.3` Martian Normal AI, no identity change                                                                                                                                                                                           | [Martian overlay](RULESET_7_MARTIANS.md)                        |
| Ice Folk | `pulp-wars-poc-7r24` | Ice Folk faction (`pulp_wars-7g3.3` engine): roster, Chill and Shatter, Snow, Glide, the Blizzard, Cold Snap, Bolas, Mountain-born, Rockfall, Cold Blood, Sweep, Trample, Boulders, Prowl, Cold Aura, Deep Winter, Brittle                                                                                               | [Ice Folk overlay](RULESET_7_ICE_FOLK.md)                       |
| Martian  | `pulp-wars-poc-7r25` | `pulp_wars-t6s.5` coarse Dry Land Martian balance: Colossus Defense 2.5                                                                                                                                                                                                                                                  | [Martian balance](../validation/RULESET_7_MARTIAN_BALANCE.md)   |
| Ice Folk | `pulp-wars-poc-7r25` | `pulp_wars-7g3.6` Ice Folk UI (setup offers the Ice Folk; `7g3.5` production art) and `7g3.4` Ice Folk Normal AI, no identity change                                                                                                                                                                                     | [Ice Folk overlay](RULESET_7_ICE_FOLK.md)                       |
| —        | `pulp-wars-poc-7r26` | `pulp_wars-9s0.2`: the Pangea coast ring (no land on the edge ring; Shallow circumnavigation; 59.5–72% land); other map types unchanged                                                                                                                                                                                  | [section 2.3](#23-map-types)                                    |
| Ice Folk | `pulp-wars-poc-7r27` | `pulp_wars-7g3.7` coarse Dry Land Ice Folk balance: Yeti 9 HP, Defense 1.5                                                                                                                                                                                                                                               | [Ice Folk balance](../validation/RULESET_7_ICE_FOLK_BALANCE.md) |
| —        | `pulp-wars-poc-7r28` | `pulp_wars-9s0.5`: the Rift (a 1 x 3 crack only flyers stand on; nothing built on it; 0-2 per generated board by width); other rules unchanged                                                                                                                                                                           | [Rift overlay](RULESET_7_RIFT.md)                               |
| —        | `pulp-wars-poc-7r29` | `pulp_wars-w5j.1`: every player plays a different faction (`DUPLICATE_FACTION`; the headless and test only `allowDuplicateFactions`)                                                                                                                                                                                     | [unique factions](RULESET_7_UNIQUE_FACTIONS.md)                 |
| Dwarf    | `pulp-wars-poc-7r30` | Dwarf faction (`pulp_wars-78i.3` engine): roster, Tunnel, mounds, surfacing and the eruption, the rider and its brake, Bomb Run, constructs and Unflinching, the Gunner's two shots, Dig In, Repair, Assemble, Knockback, Plated, Dive, Blasting Charges; the board and owned-unit accessors and the occupancy predicate | [Dwarf overlay](RULESET_7_DWARVES.md)                           |
| Dwarf    | `pulp-wars-poc-7r30` | `pulp_wars-78i.6` Dwarf UI (setup offers the Dwarves; `78i.5` production art) and `78i.4` Dwarf Normal AI, no identity change                                                                                                                                                                                            | [Dwarf overlay](RULESET_7_DWARVES.md)                           |
| Dwarf    | `pulp-wars-poc-7r31` | `pulp_wars-78i.7` coarse Dry Land Dwarf balance: the bomb deals 5, 6 with Dive                                                                                                                                                                                                                                           | [Dwarf balance](../validation/RULESET_7_DWARF_BALANCE.md)       |

**Documentation parity (2026-09-28, no ruleset or identity change):** where
older documents disagreed with the code, the code's behavior was adopted as
the rule and is now stated in the ordinary sections: Field Defense
destruction by attack regardless of tile owner
([section 13.4](#134-after-combat)); sea trade for a captured foreign capital
([section 9.5](#95-sea-trade)); the capital +1 income following a captured
capital to its new owner ([section 4.3](#43-income)); settlement counts on
widths 11–16 following the AI count ([section 2.2](#22-settlements-and-treasures));
and Windmill healing without Milling ([section 10](#10-recovery-and-support)).

**Undead release fold (2026-09-30, `pulp_wars-vkq.16`, no ruleset or identity
change):** revisions 13–16 were folded into this document for both factions,
and the `?undead=1` development flag was removed, so faction choice is part of
every match setup. Where the older text of this document or an overlay
disagreed with the code, the code's behavior is stated:

- retaliation needs the `ATTACK` ability and an Attack above 0, not merely an
  Attack stat (the Banshee has Attack 1 for Wail but never retaliates), and
  the attacker must not be `UNANSWERED` ([section 13.2](#132-damage));
- Rally and Frenzy targets are own land-form units that are not `SUPPORT` or
  `SIEGE`, have the `ATTACK` ability, and are not already Inspired (for Human
  units this equals the former "not a Captain or Catapult";
  [section 10](#10-recovery-and-support));
- Charge applies only at range 1 (no Human or Undead Charge unit has a longer
  range; [section 13.2](#132-damage));
- stale revision-12 values replaced by later revisions: the 7r12 identity and
  obsolete-key list, the eight-neighbour Shallow rule, the village table,
  research tiers `7 + 2(C - 1)` and `9 + 3(C - 1)`, the uncapped level term,
  the Commerce-doubled Market paying up to 4 (8), Patrol Boat and embarked
  Move 3, and "Only the `ORIGINAL` faction exists";
- "living unit" meaning a unit on the board was reworded to "on the board"
  (Muster, capacity, occupancy, legality, endgame siege), because "living"
  now means non-Undead.

**Goblin release fold (2026-10-01, `pulp_wars-0ao.9`, no ruleset or identity
change):** revision 17 (`pulp-wars-poc-7r17`, implemented by
`pulp_wars-0ao.2`–`0ao.8` and `0ao.11`–`0ao.17`) was folded into this document
for three factions, with a Goblin roster table, the Goblin technology
differences, [section 18](#18-goblin-faction-rules), and the Goblin
interactions in the shared sections; the former sections 18 (revision
history) and 19 (known discrepancies) became 19 and 20. Every Goblin value
was checked against `GOBLIN_ROLE_RULES_V7`, `GOBLIN_ROLE_MECHANICS_V7`,
`FACTION_RULES_V7`, `STARTING_FIGHTERS_V7`, `MILITIA_FIGHTERS_V7`, and
`explosions.ts`. Where the revision-17 overlay and the code differed, the
code's behavior is stated:

- the `pulp_wars-0ao.7` tuned values replace the contract's (one starting
  Goblin; Goblin Attack 1.5, Defense 0.5, Kaboom 5; death blasts 2, 4, and
  4); Militia stays two Goblins;
- the chain bound counts the units on the board at chain start plus the
  wave-1 exploders that just died;
- `previewAttackExplosionsV7` returns null (not an empty chain) for an attack
  that is not offered; explosion preview results may carry a null `unitId`
  for a would-be rising; `touchesUnexplored` also covers the splash ring and
  an unknown Push destination;
- the naval events of a command precede its `PLAGUE_CLEARED`;
- technology display names are resolved in the UI helper `technologyNameV7`,
  not by the technology tree query, which returns IDs only (root decision;
  `pulp_wars-0ao.16` removed the engine's duplicate Title Case helper, so
  `technologyNameV7` is the single name helper);
- Goblin cities use the shared settlement art with no Goblin city tint (root
  decision on `pulp_wars-0ao.4`; presentation, not a rule).

The fold also records two code changes made while it was prepared. Landing
ends the unit's activation for every faction (`pulp_wars-0ao.15`, root
decision, as revisions 6 and 16 specify; [section 14](#14-naval-rules)):
before it, `DISEMBARK` set only `moved` and `handled`, so a landed unit was
still offered and allowed Attack, Kaboom, Disband, and other primary actions,
and the public threatened-tiles query and the Normal AI counted an embarked
goblin-crewed unit's landing-then-Kaboom reach (`pulp_wars-0ao.11`); that
reach is gone. Cure text is faction-aware (`pulp_wars-0ao.16`): Goblins have
no cure for Plague or Bitten, and their Help and status sentences say so.

**Dinosaur release fold (2026-10-03, `pulp_wars-c87.9`, no ruleset or identity
change):** revision 19 as amended by revision 20, revision 21, and the
`pulp_wars-0hi.3` numbers (`pulp-wars-poc-7r23`) were folded into this
document for four factions, with a Dinosaur roster table, the Dinosaur
technology differences, the seven achievements of
[section 5](#5-achievements-and-monuments), the slot sum and the Nesting
term of [section 4.4](#44-unit-capacity), the hatch step of Start Turn, the
full-heal Promotion, [section 19](#19-dinosaur-faction-rules), and the
Dinosaur interactions in the shared sections; the former sections 19
(revision history) and 20 (known discrepancies) became 20 and 21. Every
value was checked against `ORIGINAL_ROLE_RULES_V7`,
`DINOSAUR_ROLE_RULES_V7`, `DINOSAUR_ROLE_MECHANICS_V7`, the Dinosaur tree
and `technologyCapabilitiesV7`, `cityUnitCapacityForV7`,
`FACTION_RULES_V7`, `STARTING_FIGHTERS_V7`, `MILITIA_FIGHTERS_V7`, the
constants of `ruleset-v7.ts` and `achievements.ts`, `eggs.ts`, `growth.ts`,
`combat.ts`, and the reducer. Where an overlay and the code differed, the
code's behavior is stated:

- revision 19's text that revision 20 did not mark as superseded but that no
  longer holds: the "2 slots for the T-Rex and Brontosaurus" of its section
  5.1 (the Triceratops uses 2 again since revision 20), its section 2.4
  Showcase capital at 7 of 7 (8 of 8 with the Nesting slot,
  [section 2.5](#25-showcase-setup)), and its hatch times of at most 3 (the
  T-Rex hatches in 4);
- the Caveman has 10 HP (`pulp_wars-0hi.3`); revision 20's implementation
  note keeping it at 12 describes `7r20`–`7r22`;
- revision 20 section 4.2's Ankylosaurus row: the engine applies the
  Ankylosaurus's own Armoured reduction to the retaliation it takes, 3 / 11
  without Wallbreaker and 5 / 4 with it (revision 20 implementation note 2;
  [section 19.10](#1910-wallbreaker));
- revision 20 section 2.2's Push for a Charge!: the preview reads the
  explored tile behind the target as resolution does, and only a Mountain or
  Deep Water behind another player's unit stays `UNKNOWN_BEHIND_FOG`
  (revision 20 implementation note 3; [section 19.11](#1911-charge));
- revision 19 section 10's "existing reason" for an attack on an Egg is
  `noRetaliationReason: "OUT_OF_RANGE"`, the reason the engine reports for
  every surviving defender that cannot retaliate other than an `UNANSWERED`
  attack ([section 13.2](#132-damage));
- revision 21's "No achievement counts kills" was removed from this document
  (Slayer counts them), as its decision 8 asked;
- the Normal AI document's "lane blocking" bullet (an own unit stepping into
  a hostile Triceratops's Stampede lane) described a heuristic that
  `pulp_wars-0hi.2` deleted with Stampede; it was removed from
  [Normal AI](../architecture/NORMAL_AI.md#revision-19-dinosaur-play-pulp_wars-c875).

**Martian release fold (2026-10-03, `pulp_wars-t6s.7`, no ruleset or
identity change):** the [Martian overlay](RULESET_7_MARTIANS.md)
(`pulp-wars-poc-7r22`, implemented by `pulp_wars-t6s.2`, with the Normal AI
of `pulp_wars-t6s.3`, the UI of `pulp_wars-t6s.4`, and the production art of
`pulp_wars-t6s.6`), including its implementation notes (section 19) and the
`pulp_wars-t6s.5` tuning record (`pulp-wars-poc-7r25`: Colossus Defense 2.5),
was folded into this document for five factions, with a Martian roster
table, the Martian technology differences,
[section 20](#20-martian-faction-rules), the Shield, Cooling, and Mind
Control cooldown steps of Start Turn and End Turn, and the Martian
interactions in the shared sections; the former sections 20 (revision
history) and 21 (known discrepancies) became 21 and 22. Every value was
checked against `MARTIAN_ROLE_RULES_V7`, `MARTIAN_ROLE_MECHANICS_V7`, the
Martian tree and `technologyCapabilitiesV7`, `FACTION_RULES_V7`, the
Martian constants of `ruleset-v7.ts`, the shared terrain rules
(`canEnterTerrainV7`, `terrainStopsMoveV7`, `canCrossWaterV7`,
`flyerMayStandOnSiteV7`), `martian.ts`, `combat.ts`, `movement.ts`, the
reducer, and the public queries. Where the overlay and the code differed,
the code's behavior is stated:

- the overlay's own precise readings of section 19.2 are the rule: the
  whole hit for Pierce and splash is capped at the target's Shield plus HP;
  a hit a Shield absorbs completely plagues nobody, while an unshielded hit
  of 0 still plagues; a Tractor Beam on another player's unit reads the
  board, not that player's Engineering or Navigation
  ([section 20.10](#2010-tractor-beam)); an unexplored foreign center
  interrupts a flyer's Move with `SETTLEMENT_FORBIDDEN`; an eliminated
  seat's Thralls are removed with cause `ELIMINATION`; `PLAGUE_DAMAGED`
  carries no `shieldDamage`; the Thrall's HP is the victim's;
- the overlay's Rift rules (sections 7.4, 8.1 row 7, 8.2 row 9, 10.1, and
  the Rift parts of 7.2 and 8.4) are implemented by `pulp_wars-9s0.5`
  (`7r28`) as written, with the rest of the Rift's rules in the
  [Rift overlay](RULESET_7_RIFT.md); the map revision stays
  `REGIONAL_BIOMES_NAVAL_V2`;
- the blockade recompute after `DISBAND` (overlay 10.7 and 19.2 note 8)
  runs after every `DISBAND` while the state has any Thrall, not only after
  one that collapsed a Thrall; the events are emitted only on a change, and
  no other Disband can change a dock, so the reported events are the same;
- overlay 10.8 says the public preview flags `touchesUnexplored` for a
  Pierce tile that is unexplored: `queryCombatPreviewV7` has no such flag
  (it lists only a visible Pierce victim); `previewAttackExplosionsV7` sets
  its `touchesUnexplored` for that tile;
- details the overlay leaves open: a flyer's Pillage is rejected with
  `PILLAGE_INVALID_TARGET`; a Thrall's public `martian.capacitySlots` is 0;
  a full-power ray leaves no Cooling when the shooter dies in the exchange;
  the treasure unit's placement and reward displacement use the unit's own
  movement mode (a Saucer is placed on a Mountain without Engineering); the
  End Turn order is recovery, the expiry of Inspired and Overrun, Cooling,
  then the Force Fields recharge;
- the overlay's examples were computed with 10-HP Human Fighters, Raiders,
  and Marksmen and 15-HP Guards; the damage values are unchanged at full HP,
  and the examples here state the current HP (a full-power Tripod ray on a
  12-HP Fighter is a whole hit of 12 and pierces for 6, the value overlay
  6.4 gives, which its note 19.2.1 corrected for a 10-HP Fighter);
- the overlay's identity numbers predate the Ice Folk engine: its 48
  command kinds and 76 event kinds are 50 and 77 at `7r25`, with the Ice
  Folk kinds after the Martian ones; its status text ("No bead of the
  Martian epic folds this overlay") and placeholder-art plan (section 13.4)
  are superseded;
- this document's own stale values were corrected: the prior-identity list
  and the obsolete autosave keys run through `7r24` (not `7r23`), and the
  Tend Wounded cure of Plague and Bitten names the Dinosaur Shaman beside the
  Human Captain.

**Ice Folk release fold (2026-10-03, `pulp_wars-7g3.8`, no ruleset or
identity change):** the [Ice Folk overlay](RULESET_7_ICE_FOLK.md)
(`pulp-wars-poc-7r24`, implemented by `pulp_wars-7g3.3`, with the Normal AI
of `pulp_wars-7g3.4`, the UI of `pulp_wars-7g3.6`, and the production art
of `pulp_wars-7g3.5`), including its root rulings (section 17.5), its
engine notes (section 19), its UI notes (section 20), and the
`pulp_wars-7g3.7` tuning record (`pulp-wars-poc-7r27`: Yeti 9 HP and
Defense 1.5), was folded into this document for six factions, with an Ice
Folk roster table, the Ice Folk technology differences,
[section 21](#21-ice-folk-faction-rules), the Cold Aura step of Start
Turn, the Chill countdown of End Turn, the sluggish rule of
[section 12.2](#122-activation), Glide, deep snow, Mountain-born, and Prowl
in [section 12.1](#121-movement), and the Ice Folk interactions in the
shared sections; the former sections 21 (revision history) and 22 (known
discrepancies) became 22 and 23. The Ice Folk values were checked at
`pulp-wars-poc-7r30` against `ICE_FOLK_ROLE_RULES_V7`,
`ICE_FOLK_ROLE_MECHANICS_V7`, the Ice Folk tree and
`technologyCapabilitiesV7`, `FACTION_RULES_V7`, the Ice Folk constants of
`ruleset-v7.ts`, the shared rules `unitMayActAfterMoveV7`,
`primaryActionBlockedAfterMoveV7`, `canEnterTerrainV7`, and
`terrainStopsMoveV7`, `ice-folk.ts`, `combat.ts`, `movement.ts`, the
reducer, the state schema, event projection, unit stats, and the public
queries; the worked examples were recomputed with the engine formula at the
current HP. Where the overlay and the code differ, the code's behavior is
stated here, and each difference is listed in
[section 24](#24-known-discrepancies). The fold also corrected this
document's own stale values: the prior-identity list runs through `7r29`
(not `7r25`), the obsolete autosave keys through `v7r29` (not `v7r28`), the
revision history gains its missing `7r29` and `7r30` rows, the browser
setup offers seven factions (the Ice Folk since `pulp_wars-7g3.6` and the
Dwarves since `pulp_wars-78i.6`), and the Dwarf overlay's Normal AI and UI
are live, not pending.

**Dwarf release fold (2026-10-03, `pulp_wars-78i.8`, no ruleset or identity
change):** the [Dwarf overlay](RULESET_7_DWARVES.md) (`pulp-wars-poc-7r30`,
implemented by `pulp_wars-78i.3`, with the Normal AI of `pulp_wars-78i.4`,
the UI of `pulp_wars-78i.6`, and the production art of `pulp_wars-78i.5`),
including its root rulings (section 20.5), its Normal AI notes (section
15.1), its engine notes (section 22), its UI notes (section 23), and the
`pulp_wars-78i.7` tuning record (`pulp-wars-poc-7r31`: the bomb 5, and 6
with Dive), was folded into this document for all seven factions, with a
Dwarf roster table, the Dwarf technology differences,
[section 22](#22-dwarf-faction-rules), the surfacing step of Start Turn, the
emptying of the per-turn lists at End Turn, the per-unit living test, the
mound and the rider brake in [section 12.1](#121-movement), Dig In in
[section 13.3](#133-fortification), Knockback, Unflinching, and Plated in
[section 13](#13-combat-and-fortification), and the Dwarf interactions in
the shared sections; the former sections 22 (revision history) and 23
(known discrepancies) became 23 and 24. The Dwarf values were checked at
`pulp-wars-poc-7r31` against `DWARF_ROLE_RULES_V7`,
`DWARF_ROLE_MECHANICS_V7`, the Dwarf tree and `technologyCapabilitiesV7`,
`FACTION_RULES_V7`, `STARTING_FIGHTERS_V7`, `MILITIA_FIGHTERS_V7`, the Dwarf
constants of `ruleset-v7.ts` (with `armouredDamageV7` and
`platedCapAppliesV7`), `dwarf.ts`, `dwarf-reducer.ts`, `units.ts`,
`combat.ts` (Dig In, Unflinching, Knockback, Blasting Charges), the reducer
(Start Turn and End Turn, Recover, Repair, Mind Control, Pillage, the
blockade list), `graves.ts`, `wail.ts`, event projection, unit stats, the
view, and the public queries. Where the overlay and the code differ, the
code's behavior is stated here, and each difference is listed in
[section 24](#24-known-discrepancies). The fold also corrected this
document's own stale values: the prior-identity list runs through `7r30`
(not `7r29`), the obsolete autosave keys through `v7r30` (not `v7r29`), the
revision history gains its missing `7r31` row and the Dwarf rows replace
the "not folded" `7r30` row, and the public Wail preview reads no Snow
cover at all (not the viewer's `snow` flags, as the Ice Folk fold wrote).

## 24. Known discrepancies

As of `pulp-wars-poc-7r31` the rules in this document match the code for
the seven factions it describes, including the Dinosaur faction of revisions
19 and 20, the achievements of revision 21, the Martian faction of the
Martian overlay, the Ice Folk faction of the Ice Folk overlay, and the
Dwarf faction of the Dwarf overlay, with one open item: the public Wail
preview below.

**Open.**

- **An inexact Wail preview without a flag.** The Ice Folk overlay's section
  11 says every preview equals its resolution except one flagged
  `hiddenBlizzardPossible` or `touchesUnexplored`, and the Dwarf overlay's
  section 14 says every Dwarf-related preview is exact (a Wail reads Dig In,
  its section 13.2). The canonical Wail (`wailTargetsV7`) reads each
  target's cover and fortification with the combat helpers, Snow cover and
  Dig In included, but the public `previewWailV7` (`publicWailTargetsV7`)
  reads cover only from Forest and Mountain and fortification only from the
  view tile's `fortificationLevel` (Walls and Field Defense in the target's
  own territory). So for an Ice Folk target with Snow cover, and for a
  dug-in Dwarf Hammerer or Steam Mole, the preview shows more damage than
  the Wail deals (a fresh Banshee on a fresh dug-in Hammerer, or on a fresh
  Yeti on its Snow: preview 2, Wail 1), with no flag. The Ice Folk engine bead recorded
  a narrower form of this (overlay section 19.3 note 6: a hidden Witch's
  Blizzard), and the Ice Folk fold stated it as a reading of the viewer's
  `snow` flags, which the code does not do; this fold measured both cases
  against the code ([section 17.9](#179-wail) states the code's behavior).
  It is not resolved here (a code change).

**Ice Folk overlay against the code** (`pulp_wars-7g3.8`; resolved by
stating the code's behavior):

- **Numbers.** The `7r27` Yeti (9 HP, Defense 1.5) replaces the contract's
  10 and 2, which the overlay keeps in its tuning bounds. The overlay's
  worked examples (section 5.6), per-unit analysis (section 9), and
  interaction examples (section 10) were computed with that Yeti and with
  10-HP Human Fighters, Raiders, and Marksmen, 15-HP Guards, and a 12-HP
  Caveman; the examples here are recomputed at current HP. The overlay's
  values that change are: a Caveman (10 HP) is no longer shattered by a
  second Yeti hit (it dies by plain damage), a charging Sled or a
  Sabretooth no longer shatters a full-HP Fighter (12 HP) without Brittle,
  the overlay's Walled-Guard example ends without a Shatter (two Mammoth
  hits leave the 17-HP Guard at 9, a Yeti's 4 leaves it at 5, and its
  retaliation of 13 kills the Yeti), a
  Lich on a Yeti on Snow deals 8 (halved 4; the overlay has 7), a Goblin
  with two helpers deals a Yeti 11 in the open and 10 on Snow (the overlay
  has 10 and 8), a Vampire deals a Yeti on Snow 8 (the overlay has 7), and
  a full-power Tripod deals a Yeti in its Witch's Blizzard 6 (the overlay
  has 5). Overlay section 19.1 and its tests (19.3 note 10) already record
  the HP substitution.
- **The Ice Witch always has Snow cover** unless she is fortified: her own
  tile is in her Blizzard, so it is Snow. The overlay's section 10.1 example
  "a Vampire deals a Witch 10" is the open-ground value; she takes 9.
- **Setup.** The overlay's section 2.2 ("every combination is legal") and
  section 13.1 ("default all Human") are superseded by the one faction per
  seat rule of `7r29` (`DUPLICATE_FACTION`, distinct defaults Human, Undead,
  Goblin, Dinosaur; [section 2.1](#21-match-setup)); a mirror match, such as
  the overlay's `II` balance pairing, is legal only in headless and test
  setups with `allowDuplicateFactions`. The setup offers seven factions,
  the Dwarves included.
- **Normal AI.** The overlay's section 12 asks for Scouting as the free
  opening technology (Drill with a hostile unit in sight); the policy keeps
  the ordinary opener scorer, as the same section's last paragraph allows,
  and puts Drill and Scouting first in its research plan. Its Goblin Kaboom rule is not
  implemented, and Glide in the city-threat test and Rockfall from a
  Mountain a Yeti could walk to are left out of the AI's estimates
  (overlay section 12.1), while the public `queryThreatenedTilesV7` keeps
  both.
- **Projection.** `UNITS_CHILLED` gives `sourceUnitId` null to every viewer
  that cannot see the source and does not own it, not only to a viewer that
  owns a target (overlay section 6.5); its results are the units the viewer
  owns or can see before or after the command.
- **Readings of the engine bead** (overlay section 19.3), stated in this
  document: the `snow` and `blizzard` tile flags are optional in the
  `PlayerTileViewV7` type and always set on an explored tile; a Move that
  meets a hidden Blizzard on a tile that is also a ZOC stop reports `SNOW`;
  `iceFolk.inBlizzard` is the Blizzard the reader knows of; only `PLANTED`
  is an emitted Attack modifier source (`ROCKFALL` and `COLD_BLOOD` are
  declared but never emitted; the preview flags carry them), and a snowy
  cover row reads `SNOW`; a sluggish Goblin or Raider that moved cannot
  Kaboom or Pillage; the Sabretooth's foreign centers are also refused for
  reward displacement (which, with settlements at least 3 apart, never
  reaches one).
- **Superseded overlay text:** its status line and section 15 ("no bead of
  the Ice Folk epic folds this overlay", "no UI offers the faction until
  `pulp_wars-7g3.6`"), the placeholder-art plan of section 13.4 (the
  production art of `pulp_wars-7g3.5` is wired in), the `7rNN` identity
  (`7r24`), and the Rift notes written before the terrain existed (sections
  10.9 and 19.3 note 11, implemented by `pulp_wars-9s0.5`).

**Dwarf overlay against the code** (`pulp_wars-78i.8`; resolved by stating
the code's behavior):

- **Numbers.** The `7r31` bomb (5, and 6 with Dive) replaces the root's
  decided 4 and 5, which the overlay keeps in its decision D1, its
  section 20.1, its tuning-bounds row (with "tuned: 5 / 6" beside it), its
  per-unit analysis and its check of the root's decisions (sections 12 and
  12.12, which its section 3 says were not re-run), its concern 4, and its
  Help text (section 16.3: "bombs it for 4 (5 with Dive)"). The live Help,
  tooltips, and unlock text are built from the constants and say 5 and 6.
  The overlay's bomb tables (sections 6.4 and 13) were already recomputed
  for 5 and 6.
- **The Knockback preview.** The overlay's sections 13.11 and 14 call every
  Dwarf preview exact but the tunnel forecast. The public Knockback
  (`push`) reads `UNKNOWN_BEHIND_FOG` for an unexplored tile (which never
  pushes, as in the canonical rule) and for a Mountain or Deep Water behind
  another player's unit, whose Engineering or Navigation is private (a
  Mountain is exact for a unit that strides, flies, or is Mountain-born);
  the resolution then reads the owner's technologies and may push. This is the
  Charge! precedent ([section 19.11](#1911-charge)), stated in
  [section 22.9](#229-steam-cannon-knockback).
- **The Brass Titan and Chill.** The overlay's sections 7.2 and 13.6 say
  "Chill and Shatter (never for the Titan, a `JUGGERNAUT`)". The code Chills
  any hostile land-form unit (`canBeChilledV7`), the Titan included, and
  only Shatter excludes the `JUGGERNAUT` role; this document states the
  code's reading ([sections 22.6](#226-clockwork) and
  [21.14](#2114-interactions-with-other-rules)).
- **Projection.** The overlay's section 13.11 projects `UNIT_BOMBED` like
  `COMBAT_RESOLVED` (each viewer the fields about what it can see). The
  code projects it whole to the actor and to every viewer that sees both
  the Gyrocopter and the target before or after the command, as a
  `COMBAT_SPLASH_DAMAGE` entry to the target's owner otherwise, and not at
  all to anyone else ([section 15](#15-fog-and-observation)).
- **Normal AI.** The overlay's section 15 asks for Scouting as the free
  opening technology (Drill with a hostile unit in sight), Raiding and
  Marksmanship with two cities, and the whole landing threat in the
  Gyrocopter's score. The policy keeps the ordinary opener scorer and puts
  Drill first in its plan, waits with Raiding for a Gyrocopter, trains the
  first Gyrocopter and Engineer only at war with four front units, and
  subtracts half the landing threat; the optional expansion tunnel lost its
  head-to-head test and is off; the "against the Dwarves" rules are kept
  although neutral on wins; the Brass Titan and the Steam Tank have no play
  of their own; and the section 15 scenarios are unit tests, not tactical
  benchmark cases (overlay section 15.1;
  [section 16](#16-normal-ai-summary)).
- **Readings of the engine bead** (overlay section 22.3), stated in this
  document: allied territory for a tunnel, rider, or Assemble tile is a
  cooperative partner's (a Mole may tunnel into its own territory); a hidden
  mound's `UNIT_MOVE_INTERRUPTED` names the mound tile; `unflinchingApplied`
  is true for every land-form construct's attack, at full HP too; the
  `dwarf` stat block carries the owner's `eruptionDamage` and `bombDamage`
  for every Dwarf unit, `tunnelRange` 0 for every role but the Mole, and the
  Gunner's `shotsLeft` as defined in
  [section 22.14](#2214-commands-events-errors-and-queries); `landingThreat`
  sums one full-strength hit of each visible hostile unit that threatens the
  landing, capped at the Gyrocopter's HP. The UI bead's Repair preview
  correction (`previewTendWoundedV7` previews 4 on a machine) is stated in
  [section 22.8](#228-engineer-repair-and-assemble).
- **Superseded overlay text:** its status line ("over the Ice Folk overlay
  (`7r24` to `7r27`, not yet folded), over current rules (five factions)"),
  the `7rNN` identity (`7r30`, then `7r31` for the balance), its section
  22.3 note 8 ("except the browser setup select, which offers it from the UI
  bead: until then no browser match has a Dwarf seat"), section 18's "No UI
  offers the faction until `pulp_wars-78i.6`", and the fallback-art plan of
  section 16.4 (the production art of `pulp_wars-78i.5` is wired in; the
  Human sprite with a badge remains only the Classic and legacy look).

The revision 13–21 overlays and the Martian, Ice Folk, and Dwarf overlays keep
superseded values (for example the Lich's Attack 2.5 and 20-HP Zombie in
revision 13, unlimited Plague in revision 14, "Move 3" for embarked units in
revision 13, the pre-tuning Goblin contract values in the revision-17 bounds
and decisions, the Stampede and the interim Dinosaur numbers in revision
19, the pre-`0hi.3` Human HP in revision 20's bounds, the contract's
Colossus Defense 3, the Rift rules, and the placeholder-art plan in the
Martian overlay, the contract's Yeti and the examples above in the Ice
Folk overlay, and the decided bomb of 4 and 5 in the Dwarf overlay) as
design history; this document states the current values.
