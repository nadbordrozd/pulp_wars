# Pulp Wars Ruleset 7: current rules

**Status:** authoritative description of the current Ruleset 7 runtime,
`pulp-wars-poc-7r26`, for all five playable factions, Human (`ORIGINAL`),
Undead (`UNDEAD`), Goblin (`GOBLIN`), Dinosaur (`DINOSAUR`), and Martian
(`MARTIAN`). It folds in
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
Fighter, Raider, and Marksman 12 HP, Guard 17, Caveman 10), and the
[Martian overlay](RULESET_7_MARTIANS.md) (the Martian faction: engine
`pulp_wars-t6s.2` at `pulp-wars-poc-7r22`, Normal AI `pulp_wars-t6s.3`, UI
`pulp_wars-t6s.4` with the production art of `pulp_wars-t6s.6`, and the
`pulp_wars-t6s.5` coarse balance number of `pulp-wars-poc-7r25`, Colossus
Defense 2.5, from its
[tuning record](RULESET_7_MARTIANS.md#165-tuning-record) and its
implementation notes in
[section 19](RULESET_7_MARTIANS.md#19-implementation-notes-pulp_wars-t6s2)).
The Undead, the Goblins, the Dinosaurs, and the Martians are part of the
ordinary game: faction choice is offered in every match setup, with no
development flag. Every number below was checked against the engine code at
`pulp-wars-poc-7r25`; `pulp-wars-poc-7r24` (`pulp_wars-7g3.3`) registers the
Ice Folk overlay and changes no rule of the five factions, and
`pulp-wars-poc-7r26` (`pulp_wars-9s0.2`) changes only Pangea map generation
(the coast ring, [section 2.3](#23-map-types)).

**Pending overlay, not folded.** The engine at `pulp-wars-poc-7r26` also
registers a sixth faction, `ICE_FOLK`, whose rules are in the
[Ice Folk overlay](RULESET_7_ICE_FOLK.md) (engine implemented by
`pulp_wars-7g3.3` at `pulp-wars-poc-7r24`; its Normal AI and UI are in
progress, so the browser setup does not offer it). This document does not
describe that faction: wherever it lists "every faction", it means the five
playable ones, and the Ice Folk additions (the `chilled` list, the `snow` and
`blizzard` tile flags, the `chill` unit stat, `curedChill`, and eight
combat-preview fields) are neutral in a match without an Ice Folk seat
([section 22](#22-known-discrepancies)). The shared helpers that the Ice
Folk engine added are named only where they word a shared rule: the single
"may act after moving" rule `unitMayActAfterMoveV7`
([section 12.2](#122-activation)) and the Mountain-born input of the shared
terrain rule `canEnterTerrainV7` ([section 12.1](#121-movement)).

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
[Martian overlay](RULESET_7_MARTIANS.md). Those documents remain as design
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
placeholder-art plan, and Rift rules for a terrain that is not in the game;
the values here are current. Where a document and the code
disagreed, the code's behavior is the rule and is stated below;
[Known discrepancies](#22-known-discrepancies) lists the open items as of
`pulp-wars-poc-7r26`.

**Terms.** "On the board" means a unit that currently exists (HP above 0).
**Living** has the narrower revision-13 meaning used by Wail, Plague, and
Bitten: a unit whose owner's faction is not `UNDEAD`. Undead units are
therefore never living, whatever their HP; Human, Goblin, Dinosaur, and
Martian units are living (an Egg is living but takes no status,
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
([section 20](#20-martian-faction-rules)).

**Source of truth in code:** `src/engine/rules/ruleset-v7.ts` (technology,
faction registrations, roles and role mechanics, faction rules, action
costs, and the shared terrain rules `canEnterTerrainV7`,
`terrainStopsMoveV7`, and `canCrossWaterV7`), `src/engine/v7/` (reducer,
economy, spatial economy, combat, Graves, Infect, Wail, Plague and Bitten
afflictions, explosions, Eggs, growth, Shields, Cooling, Thralls, and Mind
Control cooldowns (`martian.ts`), achievements, movement, map generation,
queries, views), and `src/ai/v7.ts` with its `src/ai/v7-*.ts` helpers
(Normal AI, including `src/ai/v7-goblin.ts`, `src/ai/v7-dinosaur.ts`, and
`src/ai/v7-martian.ts`).

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

| Boundary                                   | Current value                                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ruleset                                    | `pulp-wars-poc-7r26`                                                                                                                                                                                               |
| Game-state schema                          | `7`                                                                                                                                                                                                                |
| Command/event/save/replay numeric versions | `7`                                                                                                                                                                                                                |
| Browser autosave                           | `pulpWars.save.v7r26.current`                                                                                                                                                                                      |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                                                                                                                                                                         |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK` (the last is the pending Ice Folk overlay)                                                                                                       |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`, `GOBLIN_BASELINE_V1`, `DINOSAUR_BASELINE_V1`, `MARTIAN_BASELINE_V1`, `ICE_FOLK_BASELINE_V1`                                                                          |
| Faction to tree binding                    | `ORIGINAL` → `ORIGINAL_BASELINE_V5`; `UNDEAD` → `UNDEAD_BASELINE_V1`; `GOBLIN` → `GOBLIN_BASELINE_V1`; `DINOSAUR` → `DINOSAUR_BASELINE_V1`; `MARTIAN` → `MARTIAN_BASELINE_V1`; `ICE_FOLK` → `ICE_FOLK_BASELINE_V1` |
| Display names                              | `ORIGINAL` is "Human"; `UNDEAD` is "Undead"; `GOBLIN` is "Goblin"; `DINOSAUR` is "Dinosaur"; `MARTIAN` is "Martian"; `ICE_FOLK` is "Ice Folk"                                                                      |
| Achievements (`ACHIEVEMENT_IDS_V7`)        | `EXPLORER`, `ENGINEER`, `MUSTER`, `CONQUEROR`, `LAND_BARON`, `SEA_DOG`, `SLAYER` ([section 5](#5-achievements-and-monuments))                                                                                      |
| Playable factions                          | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`: the browser setup offers these five; the engine and the headless tools also accept `ICE_FOLK` ([Ice Folk overlay](RULESET_7_ICE_FOLK.md), not folded here)  |

- The exact ruleset ID dispatches every state, setup, save, and replay; earlier
  Ruleset 7 identities (`PRIOR_RULESET_7_IDS`, gap-free through
  `pulp-wars-poc-7r25`) are rejected, never migrated. Revision 18 changed no
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
  with the `chilled` list, the `THROW_BOLAS` and `COLD_SNAP` commands, and
  the `UNITS_CHILLED` event. `pulp_wars-t6s.5` (`7r25`) changed only the
  Colossus Defense. `pulp_wars-9s0.2` (`7r26`) changed only Pangea map
  generation (the coast ring) and no shape; a stored state keeps its board.
- The current browser route deletes only the known obsolete Ruleset 7 autosave
  keys (through `pulpWars.save.v7r25.current`) and preserves the Ruleset 6
  save, settings, the art-set preference, and unrelated storage.
- The normal browser entry and `?ruleset=7` launch Ruleset 7; exact
  `?ruleset=6` launches Ruleset 6; any other value is an unsupported-ruleset
  error. There is no other rules parameter: the former `?undead=1`
  development flag is gone, and a save or replay with Undead, Goblin,
  Dinosaur, or Martian seats loads like any other.
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
- The Undead, Goblin, Dinosaur, and Martian technology graphs, economy, and
  every non-unit rule are identical to the Human ones; the differences are
  the unit rosters ([section 11](#11-unit-roster)), the technology unlocks
  of [section 6.2](#62-technology-tree) (two for the Undead and the Goblins,
  plus the Goblin name Plunder for Commerce; Nesting and Wallbreaker for the
  Dinosaurs; Brain support, no Overrun, Force Fields, and the Disintegrator
  for the Martians), and the faction rules of
  [section 17](#17-undead-faction-rules) (Undead),
  [section 18](#18-goblin-faction-rules) (Goblin),
  [section 19](#19-dinosaur-faction-rules) (Dinosaur), and
  [section 20](#20-martian-faction-rules) (Martian).
- `GameStateV7` has no Goblin field: explosions resolve inside one command or
  Start Turn and leave no persistent state; Plunder changes Coins and Troll
  regeneration changes HP. Its only Dinosaur field is `eggs`, the Egg
  countdowns ([section 19.3](#193-eggs)); growth is derived from the
  existing `kills` and `maxHp` unit fields, and capacity slots are
  registration values. Its Martian fields are four side lists sorted by unit
  ID, `shields`, `cooling`, `thralls`, and `mindControlCooldowns`
  ([section 20](#20-martian-faction-rules)); no unit key was added, and the
  Shield maximum, movement mode, and Pierce are registration values.

## 2. Setup and map generation

### 2.1 Match setup

A match is one human against 1–3 equal-rules Normal AI seats, in `RIVAL` or
`COOPERATIVE` mode, on a square board.

| Setup field | Legal values                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Board width | 11, 14, 16, 20, or 25 (height equals width); minimum 11/14/16 for 1/2/3 AI                                  |
| Auto size   | 11, 14, or 16 for 1, 2, or 3 AI                                                                             |
| Map type    | `DRY_LAND`, `PANGEA`, `CONTINENTS` (default), `ARCHIPELAGO`, `LAKES`, `SHOWCASE` (width 16 only)            |
| AI          | `aiCount` 1–3, difficulty `NORMAL`, mode `RIVAL` or `COOPERATIVE`                                           |
| Human color | `CORAL`, `TEAL`, `GOLD`, `VIOLET`                                                                           |
| Factions    | one per seat (`aiCount + 1`, seat 0 is the human): `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, or `MARTIAN` |
| Seed        | uint32; equal setups and seeds generate byte-identical maps, turn order, and treasures                      |

- **Faction choice.** `factions` is a dense array; index `i` is seat `i`'s
  faction, and every combination is legal (single-faction or any mix of the
  five). The browser setup always offers one
  Human/Undead/Goblin/Dinosaur/Martian select per seat ("Your faction",
  "Player N faction"), all Human by default. The headless tools accept
  `original` (alias `human`), `undead`, `goblin`, `dinosaur`, and `martian`
  in `--factions`. The engine and the headless tools also accept `ICE_FOLK`
  (`ice` or `ice_folk`), which the browser does not offer
  ([Ice Folk overlay](RULESET_7_ICE_FOLK.md)). Faction choice never
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
  Dinosaur and Martian, so a Raptor or a Saucer) on the first legal adjacent
  land cell (entered under the treasure unit's own movement mode, so a
  Saucer needs no Engineering for a Mountain), homed to the
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
| `factions`        | any faction per seat                                                                |
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
  Human, Undead, Dinosaur, or Martian seat and 14 for a Goblin seat (Plunder
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
known, Force Fields and the Disintegrator apply from the first turn.

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
  North (3 of 6) and Coast (2 of 5) can train. Both docks start empty.
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
  for Martian) on the capital and
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
  the seat's Shields ([section 20.2](#202-shields)); resolve the
  seat's Plague ([section 17.8](#178-plague)); explode the seat's exploding
  units that Plague killed, with any chain reaction and its Plunder
  ([section 18.7](#187-where-chains-run-and-event-order)); count down and
  hatch the seat's Eggs ([section 19.5](#195-hatching)); resolve Windmill
  healing; regenerate Trolls
  ([section 18.10](#1810-waaagh-ram-and-troll-regeneration)); award income;
  settle pending city rewards; evaluate achievements. Events:
  `TURN_STARTED`, then `SHIELDS_RECHARGED`, then `PLAGUE_DAMAGED`, deaths,
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
  without a Martian seat. (The Ice Folk overlay adds its Cold Aura step
  after the Shield recharge and its Chill countdown at End Turn after the
  Force Fields recharge; they do nothing in a match without an Ice Folk
  seat.)
- **End Turn** (in order): auto-recover idle damaged units; expire Inspired and
  Overrun; run the player's Cooling step
  ([section 20.4](#204-heat-rays-and-cooling)); with Force Fields, recharge
  the player's Shields again ([section 20.3](#203-force-field-and-force-fields));
  preview next income; advance to the next active seat and run its
  Start Turn. Events: the recovery events, `SHIELDS_RECHARGED` (Force
  Fields), `INCOME_PREVIEWED`, `TURN_ENDED`, then the next Start Turn's.
  End Turn is unavailable while a city reward choice is pending.
  Since revision 17, `END_TURN` is one of the commands after which naval
  blockade and sea-network changes are reported
  ([section 14](#14-naval-rules)), so a blockader killed during the next
  seat's Start Turn (by Plague or a chain) emits `PORT_BLOCKADE_CHANGED` and
  `SEA_NETWORK_CHANGED` in that `END_TURN`.
- The first seat's first Start Turn runs when the match is created, so every
  seat's first turn includes ordinary income.
- **Elimination:** a player owning zero cities is eliminated immediately; its
  units, Eggs and Thralls included, are removed (`UNIT_DIED` cause
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
  has a home city ([section 20.9](#209-thralls)). Martian cities have no
  capacity bonus.
- `TRAIN`, `TRAIN_NAVAL`, `LAY_EGG`, and a treasure unit need
  `used + slots(role) <= capacity`, otherwise `CITY_CAPACITY_FULL` (or the
  5-Coin chest). Reward units (a two-slot Brontosaurus or Colossus too) and
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
  Control, and the Tractor Beam included), and reward choices never
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
  so the 1-Coin Goblin stays at 1).
- **Naval training** happens on a selected active, empty Port or Shipyard
  assigned to the city ([section 14](#14-naval-rules)).
- **Reward units** (the Militia `FIGHTER` and the level-5+ `JUGGERNAUT`, in
  the owner's faction: Fighter, Skeleton, Goblin, Caveman, or Grunt;
  Juggernaut, Abomination, Troll, Brontosaurus, or Colossus) always appear
  on the city center, hatched (no reward ever creates an Egg) and at full
  Shield. An existing occupant moves to
  the first free adjacent land cell in `(y, x)` order that it can legally
  enter (Engineering for Mountain unless it strides or flies, no unit or
  Egg, no treasure, not allied territory); an Egg is never displaced. If
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
  never besieges.
- **Capture** requires a capture-capable land unit (Human Fighter, Raider,
  Marksman, Guard, or Juggernaut; Undead Skeleton, Ghoul, Banshee, Zombie, or
  Abomination; Goblin Goblin, Wolf Rider, Bomb Chucker, Orc Brute, or Troll;
  Dinosaur Caveman, Raptor, Spitter, Ankylosaurus, or Brontosaurus; Martian
  Grunt, Ray Gunner, Shield Projector, Colossus, or Thrall)
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
  (2 slots, full Shield). Reward
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
  machine included, is `EMBARKED` and does not count; it cannot be completed
  on `DRY_LAND`). **Slayer** reads the largest
  `kills` of one unit on the board, with the ordinary kill credit
  ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)): explosions
  credit no unit, a rising or a Thrall starts at 0, an Egg has 0, a Mind
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
  Mothership, Patrol Boat, Battleship, with the Colossus excluded). Risings,
  Thralls (as the `FIGHTER` role), and hatched units count; an Egg does not
  count until it hatches.
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

The other technologies read the same for every faction. The engine, query,
and AI checks of land trade read the technology capability
`landTradeIncomeCoins` (never a raw `COMMERCE` test), and Plunder is the
capability `plunderCoins`. Nesting and Wallbreaker are likewise read through
the capabilities `eggHpBonus` (0 or 4), `eggHatchTurnReduction` (0 or 1),
`nestingCityCapacityBonus` (0 or 1), and `ignoresCityWalls`, and Force
Fields and the Disintegrator through `shieldsRechargeAtEndTurn` and
`raysIgnoreFortification`, never through a raw `FORTIFICATION` or
`EXPLOSIVES` test.

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
require Engineering. Roads always coexist.

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
  included; the Road-edge exemption is moot for them, since terrain never
  stops them ([section 20.6](#206-movement-stride-flying-and-crossing-water)).
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

| Healing source                  | Amount                                                                 | When                                                                         |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Recover or idle recovery, land  | 4 in own territory; 2 elsewhere (Undead: Restless, see below)          | explicit terminal `RECOVER`, or End Turn for a unit that did not move or act |
| Recover or idle recovery, naval | 4 on or adjacent to an own active Port/Shipyard; otherwise illegal / 0 | same                                                                         |
| Embarked unit                   | none                                                                   | —                                                                            |
| Windmill (Milling)              | up to 6                                                                | Start Turn, once per unit                                                    |
| Troll regeneration (Goblin)     | up to 4, any tile and form; cures nothing                              | Start Turn, after Windmill healing                                           |
| Tend Wounded (Captain, Shaman)  | up to 2, and cures Plague and Bitten                                   | Captain or Shaman action, once per unit per owner turn                       |
| Promotion, growth stage         | full heal to the new maximum HP; cures nothing                         | `PROMOTE` (non-growing units); a kill that reaches Big or Alpha (dinosaurs)  |
| Egg                             | none: no healing source ever heals an Egg                              | —                                                                            |

- **Windmill healing:** at the owner's Start Turn, each Windmill in the
  owner's territory heals damaged own units (any form) on its eight
  neighbors. A unit next to several Windmills heals once, assigned to the first
  Windmill in `(y, x)` order. Output does not matter, and healing needs no
  technology, so a captured Windmill heals its new owner's units even without
  Milling.
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
- **Captain** (Human `CAPTAIN`): may Move, then use one primary action:
  Attack, Rally, or Tend Wounded. The Dinosaur Shaman has the same three
  (Rally labelled **War Drums**) plus Hatch
  ([section 19.6](#196-shaman-hatch)). The Undead Necromancer instead has
  Attack, Frenzy, and Raise Dead ([section 17](#17-undead-faction-rules)),
  the Goblin Orc Warboss has Attack and WAAAGH!
  ([section 18.10](#1810-waaagh-ram-and-troll-regeneration)), and the
  Martian Brain has Attack, Psychic Command, and Mind Control
  ([section 20.8](#208-mind-control)); none of them has
  Tend Wounded (`TEND_WOUNDED` is never offered and is rejected with
  `UNIT_ROLE_INVALID`).
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
- **Tend Wounded** (Human Captain, Dinosaur Shaman): targets every adjacent
  own land-form unit (other than the tender, not yet tended this turn) that
  is damaged, plagued, or bitten; a plagued or bitten unit is a target even
  at full HP. Each target heals `min(2, maxHp - hp)` (possibly 0) and loses
  both Plague and Bitten (`WOUNDED_TENDED` results carry `curedPlague` and
  `curedBitten`). It does not use the target's action. The tender cannot
  tend itself, and an Egg is never a target.
- **Disband** (Administration): an own land-form trainable unit that has not
  used a primary action (it may have moved) removes itself for
  `floor(printed cost / 2)` Coins (a Goblin refunds 0 and is still offered
  Disband). Juggernaut, Abomination, Troll, Brontosaurus, Colossus, naval,
  and embarked units cannot Disband, nor can a Thrall
  (`DISBAND_NOT_LEGAL` reason `THRALL`, never offered). Disband never
  explodes, and disbanding a Brain collapses its Thralls. A plagued or bitten unit
  cannot Disband: it is not offered and is rejected with `DISBAND_NOT_LEGAL`
  (reason `PLAGUED`, reported first, or `BITTEN`). An own Egg may also be
  disbanded ("Abandon Egg", [section 19.7](#197-egg-destruction-capture-and-abandon-egg)).
- **Promotion:** a unit with at least 3 kills may Promote once for free:
  +5 maximum HP and a **full heal** (its HP becomes the new maximum;
  revision 20). Plague and Bitten stay, and a Martian unit's Shield is
  neither raised nor recharged. It is an explicit command,
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

General roster rules:

- An **embarked** land unit of any faction has Move 2 on water (landing
  uses one point, [section 14](#14-naval-rules)), Defense 1, Sight 1, no
  Attack, no retaliation, no ZOC, no Kaboom, no Charge!, and no Martian
  ability (no Beam Down, Mind Control, Tractor Beam, Psychic Command, or
  Force Field); an embarked dinosaur keeps its slots and growth, and an
  embarked Martian unit keeps its slots, its Cooling, and its Shield, which
  still absorbs damage and recharges.
- Base Sight gains +1 while standing on a Mountain with Engineering.
- Minimum range limits only the chosen target: a Catapult, Lich, Rocket Cart,
  or Bomb Chucker cannot target an adjacent unit but may still fire at
  another target in range.
- Tactical-role labels (`LINE`, `SKIRMISHER`, and so on) are display metadata
  with no combat effect, except that Rally (Frenzy, War Drums, Psychic
  Command) skips the `SUPPORT` and `SIEGE` labels
  ([section 10](#10-recovery-and-support)). The registry requires every
  faction's role to carry the Human label of the same mechanical role, so
  the Triceratops and the Tripod are `SIEGE` and the Brain is `SUPPORT`.

## 12. Movement and unit actions

### 12.1 Movement

- Movement is eight-way; Chebyshev distance defines adjacency, range, sight,
  and ZOC. A Move has `2 * Move` half-points; a step costs 1 when the tile
  being left is a usable Road node and 2 otherwise
  ([section 9.2](#92-road-movement)).
- A Move ends on entering an unexplored cell, a Forest (unless a Road edge or
  Fieldcraft freedom for the `RAIDER` and `MARKSMAN` roles: Raider and
  Marksman, Ghoul and Banshee, Wolf Rider and Bomb Chucker, Raptor and
  Spitter, Saucer and Ray Gunner), a Mountain (unless a Road edge),
  or a cell in hostile ZOC. A path that continues past such a stop is illegal.
  A Martian walker or flyer is never stopped by terrain, and a flyer not by
  ZOC ([section 20.6](#206-movement-stride-flying-and-crossing-water)).
- Land units need Engineering to enter Mountain (Martian walkers and flyers
  do not) and cannot enter water except by embarking (Martian machines also
  cross water inside a Move and self-launch). Every "can this unit stand on
  this tile" test (`MOVE`, `DISEMBARK`, the advance, Push and the Charge!
  push, the Tractor Beam, Beam Down, treasure-unit placement, reward
  displacement, and their public twins) goes through the one shared terrain
  rule `canEnterTerrainV7` (terrain, movement mode, afloat, Engineering,
  Navigation, and Mountain-born, an input of the Ice Folk overlay that is
  false for every role of the five factions), and "does entering this tile
  end the Move" through `terrainStopsMoveV7`.
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
  player's unit passes a Martian unit.
- **Interrupted Moves.** A hidden occupant on the next step (`OCCUPIED`),
  impassable terrain that was unexplored before the command
  (`ENGINEERING_REQUIRED`), or hostile ZOC first seen during the Move (`ZOC`)
  interrupts the Move, which is still accepted. The mover stands on the last
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
  flyer through every visible unit).
- **ZOC:** a hostile land unit projects ZOC onto adjacent land cells. A naval
  unit projects it onto adjacent water it could enter. A land unit projects
  onto adjacent water only against an afloat unit it could attack at range 1.
  Embarked units, Eggs, and Martian flyers project none, and a flyer ignores
  hostile ZOC. Leaving ZOC is free.

### 12.2 Activation

- Each unit may Move once per turn, and cannot Move after a primary action.
- Primary actions are Attack, Recover, Capture, and specials
  (Rally/Frenzy/WAAAGH!/War Drums/Psychic Command, Tend, Field Defense,
  Pillage, Raise Dead, Devour, Wail, Kaboom, Hatch, Beam Down, Mind Control,
  Tractor Beam). Guard, Zombie, Orc Brute, Ankylosaurus, Shield Projector,
  Catapult, Lich, Rocket Cart, and Battleship cannot attack after moving;
  the Triceratops (revision 20) and the Tripod can. Every read of this role
  flag for a unit goes through the single rule `unitMayActAfterMoveV7` (the
  role's `mayUsePrimaryActionAfterMove`; the Ice Folk overlay's sluggish
  Chill also clears it, which never happens without an Ice Folk seat).
- **Eggs** have no activation of their own: an Egg carries an exhausted
  activation at all times and never needs handling. Every unit command
  naming an own Egg as `unitId` is rejected with `UNIT_IS_EGG { unitId }`
  and never offered, except `DISBAND` (Abandon Egg,
  [section 19.7](#197-egg-destruction-capture-and-abandon-egg)).
- `WAIT` only marks the unit handled (it also declines an available Escape).
- **Escape** (Human Raider, innate; the Ghoul, Wolf Rider, Raptor, and
  Saucer have none):
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
  Abomination, Troll, Brontosaurus, or Colossus, or a Martian flyer (rejected
  with `PILLAGE_INVALID_TARGET` and never offered), standing on an
  improvement in hostile territory
  destroys it for +1
  Coin, re-exposing any resource it hid. It may follow a Move but no primary
  action and is terminal. Roads, Field Defense, terrain, resources, city
  centers, and Walls cannot be pillaged.

### 12.3 Field Defense

- `BUILD_FIELD_DEFENSE` (Fortification, 3 Coins) needs a unit whose role
  mechanics allow it (`buildsFieldDefense`: Fighter, Guard, Skeleton, Zombie,
  or Orc Brute; never the Goblin, and no Dinosaur or Martian unit) in land
  form that has neither moved nor acted this turn, standing on an explored
  land tile of its owner's territory without Field Defense. It uses the
  unit's whole turn. A Goblin, a Caveman, an Ankylosaurus, a Grunt, or a
  Shield Projector is never offered it and is
  rejected like any other role that cannot build it (`INVALID_TILE` with
  `action: "BUILD_FIELD_DEFENSE"`); the Dinosaur and Martian trees also have
  no Field Defense unlock (their Fortification is Nesting and Force Fields).
  Field Defense that already stands in territory a Dinosaur or Martian seat
  captures fortifies its units as usual (never a Martian walker or flyer,
  which is never fortified).
- Every explosion destroys Field Defense on every tile of its blast area,
  whoever owns the tile (reason `EXPLOSION`,
  [section 18.6](#186-blast-resolution)), and every Triceratops or Tripod
  attack destroys it on the target tile (reason `CATAPULT`,
  [sections 19.11](#1911-charge) and [20.5](#205-pierce-and-the-disintegrator)).
- Field Defense is a tile layer, not an improvement: it coexists with Roads,
  resources, improvements, and cities, transfers with the tile, and cannot be
  stacked, pillaged, redeveloped, or removed voluntarily.

## 13. Combat and fortification

### 13.1 Legality

- The attacker needs the `ATTACK` ability (the Banshee has none). The target
  must be a visible, non-allied unit on the board within the attacker's
  minimum–maximum range. Embarked units and Eggs cannot attack. An Egg is a
  legal target like any unit.
- Land units may attack afloat units from shore and naval units may attack
  coastal land units.

### 13.2 Damage

```text
attack  = base Attack (a half-power heat ray: half, rounded down)
        + 1 (Charge/Pounce/Strafe) + 1 (Inspired/Frenzied/WAAAGH!/War Drums/Psychic Command)
        + Gang Up (0–2) + 1 (Alpha) + run-up (Charge!: 0–2)
defense = base Defense + fortification level          (embarked or Egg: 1)
cover   = 1.5 on Forest or Mountain for land-form ground defenders
          (never a Martian walker or flyer), else 1

attackForce  = attack  * attacker.hp / attacker.maxHp
defenseForce = defense * defender.hp / defender.maxHp * cover
total        = attackForce + defenseForce

damageToDefender = roundHalfUp(attackForce  / total * attack  * 4.5)
damageToAttacker = roundHalfUp(defenseForce / total * defense * 4.5)
```

- Both results use pre-combat HP and are capped at current HP. A killed
  defender does not retaliate. An Armoured unit (the Ankylosaurus) takes
  `d − 1` (minimum 1) of every hit `d` of 2 or more, before the cap
  ([section 19.9](#199-acid-and-armoured)). A Martian unit's Shield then
  absorbs the hit first, so its cap is Shield plus HP; `damageToDefender`
  and `damageToAttacker` are HP damage, and the absorbed parts are
  `defenderShieldDamage` and `attackerShieldDamage`
  ([section 20.2](#202-shields)).
- A surviving defender retaliates only if it has the `ATTACK` ability and an
  Attack above 0, is not embarked or an Egg, the attacker is within its own
  range, and the attacker is not `UNANSWERED` (a Vampire). The preview then
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
- **Lifesteal** (Vampire): after the exchange, a surviving Vampire heals by
  the HP damage it dealt (as attacker or retaliating defender; never what a
  Shield absorbed), capped at its
  maximum HP: `hpAfter = min(maxHp, hp - damageTaken + damageDealt)`. The
  preview and `COMBAT_RESOLVED` carry `attackerHeal` and `defenderHeal`.

### 13.3 Fortification

For a land-form defender standing in its owner's territory:

```text
fortification level = 2 (own city center with Walls) + 1 (tile has Field Defense)
```

Each level adds 1 flat Defense before cover. Naval, embarked, and foreign
units, Eggs, and Martian walkers and flyers on the tile receive none. There
is no other city-center defense bonus. Three Dinosaur attacks and a Martian
heat ray fired with the Disintegrator remove levels for the whole exchange
(the reduced Defense applies to the damage taken **and** to the
retaliation), without destroying Walls
([sections 19](#19-dinosaur-faction-rules) and
[20.5](#205-pierce-and-the-disintegrator)):

| Attack                                                    | Fortification applied           | Cover      | Preview fields                                   |
| --------------------------------------------------------- | ------------------------------- | ---------- | ------------------------------------------------ |
| Spitter (Acid)                                            | none                            | none (× 1) | `acid: true`, `fortificationIgnored: 0`          |
| Triceratops (Charge!)                                     | none                            | kept       | `fortificationIgnored`: the levels removed (0–3) |
| heat ray (full or half) whose owner has the Disintegrator | none                            | kept       | `fortificationIgnored`: the levels removed (0–3) |
| any other dinosaur whose owner has Wallbreaker            | Field Defense only (Walls gone) | kept       | `fortificationIgnored`: 2 on a Walled center     |
| every other attack                                        | full                            | kept       | `acid: false`, `fortificationIgnored: 0`         |

`fortificationLevel` in the combat preview is always the level actually
applied.

### 13.4 After combat

- **Advance:** a surviving adjacent land attacker (not a Catapult, Lich,
  Rocket Cart, Zombie, Tripod, Saucer, or Mothership; the Triceratops, the
  Ray Gunner, and the Colossus do advance; role mechanic
  `advancesAfterKill`) that kills a land defender or an Egg moves into its
  cell if explored and enterable (Mountain needs Engineering unless the
  attacker strides), then reveals sight. It does not advance when the
  defender rises in place (an Infect or Bitten rising), and it stands on any
  Grave the death left.
- **Push:** a Juggernaut, Abomination, Troll, Brontosaurus, or Colossus
  pushes a surviving adjacent target one cell directly away (never at range 2) if the cell is on the
  board, explored by the attacker, empty, not a settlement, the same
  land/water kind as the target, enterable by the target's owner (a walker
  or flyer needs no Engineering), and not in territory allied to the
  target. It never pushes an Egg, and the pusher stays where it is.
- **Charge! Push and follow** (the Triceratops): a surviving target is
  pushed under the same conditions, and the Triceratops, if it survived,
  follows into the vacated tile under the advance conditions
  ([section 19.11](#1911-charge)).
- **Escape:** a surviving Human Raider may make one more ordinary Move
  ([section 12.2](#122-activation)).
- **Overrun** (Human Knight; **Ram** for the Goblin Scrap Buggy; **Rampage**
  for the Dinosaur T-Rex; same rule and events): after the unit kills (an
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
  the `CATAPULT` role (Catapult, Lich, Rocket Cart, Triceratops, or Tripod)
  attacked
  (reason `CATAPULT`, whether or not either unit survives); a surviving Inspired
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
  and hostile splash and Pierce kills, kills whose victim rises, and
  destroyed Eggs (not friendly bomb-splash or Pierce kills, explosion kills,
  or the removals of Mind Control and a Thrall collapse). A dinosaur that reaches
  Big or Alpha grows at once, after the exchange's damage, Lifesteal, and
  kill credit and before the advance, Push, follow, and any chain
  ([section 19.8](#198-grow)).
- **Deaths.** A combat death leaves a Grave, an Infect rising, or a Bitten
  rising as [section 17](#17-undead-faction-rules) describes; a destroyed Egg
  leaves none of them. A Brain's death collapses its Thralls (`UNIT_DIED`
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
  the Cooling of a full-power ray.

## 14. Naval rules

- **Water movement:** only naval and embarked units stand on water. Shallow
  Water needs Shorecraft (via embarking or training), Deep Water needs
  Navigation. A Martian machine is the exception for entering: it crosses
  water inside a Move in land form and **self-launches** (embarks) where a
  Move ends on water, with no Port and without Shorecraft
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
  (Mountain needs Engineering unless the unit strides or flies; no allied
  territory; a Martian flyer never lands on a neutral village center or a
  center it does not own: `MOVEMENT_ILLEGAL` with reason
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
- **Blockade events.** `PORT_BLOCKADE_CHANGED` and `SEA_NETWORK_CHANGED` are
  recomputed after `ATTACK`, `BUILD_PORT`, `BUILD_ROAD`, `CAPTURE`,
  `DISEMBARK`, `MOVE`, `REDEVELOP`, `WAIL`, `KABOOM`, `MIND_CONTROL`,
  `TRACTOR_BEAM`, `END_TURN`, `LAND_GRANT`, research of Roads, Shorecraft,
  or Navigation, and `DISBAND` while the state has a Thrall (a disbanded
  Brain's embarked Thrall may have been a blockader). `KABOOM` and
  `END_TURN` joined the list in revision 17 and the three Martian entries
  with the Martian overlay; with `END_TURN`, a blockade lifted by a
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
([section 20.11](#2011-interactions-with-other-rules)).
Specifications and exact event shapes:
[revision 13](RULESET_7_REVISION_13_UNDEAD.md),
[revision 14](RULESET_7_REVISION_14_BALANCE.md), and
[revision 15](RULESET_7_REVISION_15_BALANCE.md).

### 17.1 Graves

A Grave is a tile marker. Grave creation is enabled by the setup (at least
one `UNDEAD` seat) and stays enabled after the Undead seats are eliminated.

- **Creation.** When a unit dies, one Grave is created on its death tile when
  all of these hold: the unit was in land form (not embarked or naval), of
  any owner and faction; it died with cause `ATTACK`, `RETALIATION`,
  `SPLASH` (Battleship, Lich, or Bomb Chucker), `WAIL`, `PLAGUE`, `KABOOM`
  (its own Kaboom), or `EXPLOSION` (hit by a blast); the tile is land and is
  not a settlement site (capital, city, or village center); the death did not
  rise (Infect or Bitten); and the tile has no Grave yet.
- **No Grave** comes from a water, embarked, or naval death, an Egg's death
  (form `EGG`), Disband, reward displacement removal, elimination removal,
  the destruction of Eggs with a captured city, a Mind Control, a Thrall
  collapse (`BRAIN_LOST`), or a death that rises. A
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
  exists: a Grave on one of its eight neighbours with no unit of any owner on
  it (no cap, no terrain or territory filter). In `(y, x)` order each
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
infect. Event
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
  `RETALIATION`, `SPLASH`, `WAIL`, `PLAGUE`, `KABOOM`, or `EXPLOSION`,
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
  Captain's or Dinosaur Shaman's Tend Wounded cures it. A Bitten unit cannot Disband (it may
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
  Human Captain's or Dinosaur Shaman's Tend Wounded cures it. A unit whose
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
  allies never.
- **Damage.** Per target, the ordinary damage formula
  ([section 13.2](#132-damage)) with the Banshee attacking at Attack 1 at its
  current HP (no Charge or Inspired/Frenzied bonus) against the target's own
  Defense, fortification, embarked Defense 1, and cover. Damage may be 0; such
  a target still counts. A Martian target's Shield absorbs the hit first
  (each result carries `shieldDamage`). All targets resolve together from
  the pre-Wail state.
- **Result.** No retaliation, advance, Push, Infect, or Field Defense
  destruction. Kills count for the Banshee's promotion and leave Graves or
  Bitten risings, Goblin exploding units it kills explode, and a Brain it
  kills takes its Thralls with it; the Banshee
  is handled. Event `WAIL_RESOLVED` (then
  `UNIT_DIED` with cause `WAIL` per death); the preview `previewWailV7`
  equals the result because only visible units are targets.

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
Human, Undead, Dinosaur, and Martian units keep every ability against
Goblins, and blasts hit them like any unit (Eggs included; an Ankylosaurus
takes 1 less, [section 19.12](#1912-interactions-with-other-rules); a
Martian Shield absorbs first,
[section 20.11](#2011-interactions-with-other-rules)). Specification,
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
at its owner's Start Turn), or by another blast (`EXPLOSION`). A unit
explodes at most once: a Kaboom is that unit's explosion. Disband, reward
displacement removal, and elimination removal are removals, not deaths, and
never explode. Goblins and Wolf Riders never explode on death.

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

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves                  | `KABOOM` and `EXPLOSION` deaths are qualifying combat deaths (land form, land tile, not a settlement site, no rising, no Grave yet); Graves exist only in matches with an Undead seat.                                                                                                                                                                                                                                           |
| Infect, Bitten          | Explosions are not Zombie damage: they never infect or bite. A Bitten land-form unit that dies from `KABOOM` or `EXPLOSION` rises as its biter's Zombie. A Zombie that kills a Bomb Chucker infects it, and the Chucker's death blast then hits the Zombie and the rising.                                                                                                                                                       |
| Plague, Wail            | Plague and Wail kills of exploding units set off death blasts. A blast that kills a Lich ends every Plague it caused (`PLAGUE_CLEARED`). Goblin units are living: Wail, Plague, and bites affect them.                                                                                                                                                                                                                           |
| Lifesteal, Unanswered   | Blasts are not combat exchanges: no Lifesteal heal. A Vampire's attack draws no retaliation, but a Bomb Chucker it kills still explodes and hits it.                                                                                                                                                                                                                                                                             |
| Push, Charge, Escape    | Push resolves before the chain. A Raider that survives the attack and the chain keeps its Escape Move.                                                                                                                                                                                                                                                                                                                           |
| Cities, villages        | Blasts hit units on centers (Walls and fortification give no protection), never capture, move, or advance a unit, and never change a city, territory, level, Walls, improvement, Road, resource, or Monument. Surviving victims keep their capture eligibility.                                                                                                                                                                  |
| Capacity                | A Kaboom or blast death frees its home city's slot at once; the city trains again only with its city action still available.                                                                                                                                                                                                                                                                                                     |
| Achievements, Promotion | Explosions credit no unit kill ([section 18.9](#189-kill-credit-plunder-and-friendly-fire)), so they never advance Promotion, growth, or Slayer; Plunder counts them.                                                                                                                                                                                                                                                            |
| Dinosaurs               | Blasts hit Dinosaur units and Eggs with fixed damage (an Ankylosaurus takes 1 less; an Egg killed by a blast dies with cause `EXPLOSION`); a destroyed Egg is a credited hostile kill for Plunder. Eggs never help Gang Up. No Dinosaur attack has Gang Up.                                                                                                                                                                      |
| Martians                | A Martian Shield absorbs blast and bomb-splash damage first (a Kaboom of 5 costs a Grunt 3 HP and a Grunt in a Force Field or a Mothership 1; a death blast of 2 costs a unit with a full Shield nothing). A Brain killed by a blast takes its Thralls with it, which earns no Plunder. A mind-controlled Bomb Chucker, Rocket Cart, or Scrap Buggy is removed, not killed, and does not explode. No Martian attack has Gang Up. |

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
Human, Undead, Goblin, and Martian units keep every ability against
Dinosaurs, and Eggs are targets like any unit. Specification, decisions, and tuning
records: [revision 19](RULESET_7_REVISION_19_DINOSAURS.md),
[revision 20](RULESET_7_REVISION_20.md), the
[Dinosaur balance report](../validation/RULESET_7_DINOSAUR_BALANCE.md) (the
`pulp_wars-c87.8` interim baseline), and the
[revision-20 balance report](../validation/RULESET_7_REVISION_20_BALANCE.md)
(the `7r23` coarse pass).

### 19.1 Roles, Wild, and labels

| Mechanical role | Human      | Undead      | Goblin       | Dinosaur     | Martian            |
| --------------- | ---------- | ----------- | ------------ | ------------ | ------------------ |
| `FIGHTER`       | Fighter    | Skeleton    | Goblin       | Caveman      | Grunt (and Thrall) |
| `RAIDER`        | Raider     | Ghoul       | Wolf Rider   | Raptor       | Saucer             |
| `MARKSMAN`      | Marksman   | Banshee     | Bomb Chucker | Spitter      | Ray Gunner         |
| `GUARD`         | Guard      | Zombie      | Orc Brute    | Ankylosaurus | Shield Projector   |
| `CAPTAIN`       | Captain    | Necromancer | Orc Warboss  | Shaman       | Brain              |
| `CATAPULT`      | Catapult   | Lich        | Rocket Cart  | Triceratops  | Tripod             |
| `KNIGHT`        | Knight     | Vampire     | Scrap Buggy  | T-Rex        | Mothership         |
| `JUGGERNAUT`    | Juggernaut | Abomination | Troll        | Brontosaurus | Colossus           |

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
  private, and the attack may then push and follow. An unexplored tile
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

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, Raise Dead      | Dinosaur-faction land units leave Graves like any unit (in matches with an Undead seat); Eggs never do. A Grave may lie under an Egg, but Raise Dead needs a Grave with no unit on it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Infect, Bitten          | A Dinosaur-faction land unit killed by a Zombie rises as an ordinary Zombie (10 of 18 HP, 1 slot, no growth, may exceed capacity); dinosaurs are bitten and rise like Human units, and the Shaman cures them. An Egg is never bitten and, killed by a Zombie, is destroyed without rising.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Plague                  | Dinosaur-faction units are plagued, take 2 per Start Turn (an Ankylosaurus 1), spread it, and are cured by Tend Wounded. Eggs are never plagued, never receive or pass a spread, and a hatched unit starts unplagued. A Lich attack on an Egg damages it and plagues nothing there.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Wail, Lich splash       | Wail hits dinosaurs and Eggs (a living faction) within its radius; an Egg defends with 1. Lich and Battleship splash hit hostile Eggs like any hostile unit, and the kills count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Lifesteal, Unanswered   | A Vampire heals by the damage it deals to a dinosaur or an Egg (after Armoured). A Vampire's attack draws no retaliation from a dinosaur. A Vampire attacked by a Triceratops retaliates, heals, and is then pushed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Goblin rules            | Gang Up counts the Goblin attacker's own helpers around a dinosaur or an Egg as usual; no Dinosaur attack has Gang Up. Blasts and bomb splash hit dinosaurs and Eggs with their fixed or splash damage (an Ankylosaurus takes 1 less). A Triceratops that kills an exploding unit advances and is then hit by its blast; a pushed survivor is pushed before the chain. An Egg destroyed by a Goblin attack, splash, or blast earns Plunder; Eggs lost with a city do not.                                                                                                                                                                                                                                                         |
| Push, Overrun, Charge   | No Push (Juggernaut role or Charge!) ever moves an Egg or ends on an Egg's tile. A Knight, Scrap Buggy, or T-Rex that destroys an Egg advances and may attack again. Only Charge! follows a pushed target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Field Defense, Walls    | They give Human, Undead, and Goblin defenders their ordinary bonus against every Dinosaur attack except the Spitter's (none), the Triceratops's (none), and, with Wallbreaker, the Walls levels against any dinosaur. A Catapult may target an Egg at range 2–3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Cities, siege           | A besieged Dinosaur city cannot lay or train; its Eggs stay, count down, and hatch. An enemy that wants the city may ignore its Eggs: capture destroys them all. A Triceratops on a hostile center besieges it and never captures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Boats, water            | Eggs never embark or stand on water or a dock; a two-slot unit embarks like any other. Dinosaur boats are the Human boats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Achievements, Promotion | Muster counts hatched Dinosaur roles, never an Egg; Slayer counts a dinosaur's kills (growth does not reset them); a destroyed Egg is a kill for its killer. Promotion stays for the Caveman, the Shaman, and the boats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Martians                | Martian attacks, rays, and Pierce hit an Egg like any unit (Defense 1, no retaliation); an Egg is never a Mind Control or Tractor Beam target, and its tile never a Beam Down or pull destination. A Charge! on a Martian unit is absorbed by the Shield first and pushes and follows whatever it absorbed; Acid and Wallbreaker reach only a Martian foot unit's cover and Walls (machines have neither). An Ankylosaurus takes 1 less from every Martian hit. The two-slot Triceratops, T-Rex, and Brontosaurus are immune to Mind Control and the Tractor Beam; a Raptor, Spitter, or Ankylosaurus at 6 HP or less is not, and its Thrall has no growth. A collapsed Thrall and a mind-controlled unit are no kill for growth. |

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
`src/engine/v7/martian.ts`. Human, Undead, Goblin, and Dinosaur units keep
every ability against Martians, with the Shield rules of
[section 20.2](#202-shields) applied to the damage they deal.
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
- **Not damage, so never absorbed:** Push, the Charge! push and follow, the
  Tractor Beam, Mind Control, Field Defense destruction, and removals.
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

A **flyer** (Saucer, Mothership) in land form has every walker rule, and:

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

There is no Rift terrain in the game: the overlay's Rift rules
([Martian overlay section 7.4](RULESET_7_MARTIANS.md#74-rift)) wait for the
Rift bead (`pulp_wars-9s0.5`), and `canEnterTerrainV7` documents where they
will go.

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

| #   | Requirement                                                                                                                              | Rejection                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                           | the ordinary unit errors                              |
| 2   | Its role has `MIND_CONTROL`.                                                                                                             | `UNIT_ROLE_INVALID { role }`                          |
| 3   | It has not used a primary action and has not landed this turn (it may have moved).                                                       | `UNIT_ALREADY_ACTED`                                  |
| 4   | It is in land form.                                                                                                                      | `MIND_CONTROL_NOT_LEGAL { reason: "EMBARKED" }`       |
| 5   | It has no entry in `mindControlCooldowns`.                                                                                               | `MIND_CONTROL_NOT_LEGAL { reason: "COOLDOWN" }`       |
| 6   | It controls fewer than `MIND_CONTROL_THRALL_LIMIT_V7` (2) Thralls.                                                                       | `MIND_CONTROL_NOT_LEGAL { reason: "THRALL_LIMIT" }`   |
| 7   | `targetUnitId` is a unit on the board that the actor can see.                                                                            | `TARGET_NOT_FOUND`                                    |
| 8   | It is hostile to the actor.                                                                                                              | `TARGET_ALLIED`                                       |
| 9   | It is in land form (not embarked, naval, or an Egg), its role is not `JUGGERNAUT`, it uses one slot, and it is not on a settlement site. | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_IMMUNE" }`  |
| 10  | It is within Chebyshev distance 2 of the Brain (`MIND_CONTROL_RANGE_V7`).                                                                | `MIND_CONTROL_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
| 11  | Its HP is at most `MIND_CONTROL_HP_V7` (6); a Shield does not count.                                                                     | `MIND_CONTROL_NOT_LEGAL { reason: "TARGET_HEALTHY" }` |

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
  Navigation (a walker or flyer needs no Engineering); for another player's
  unit, whose technologies the actor cannot see, the rule reads the board:
  it is pulled onto a Mountain only if it strides, flies, or stands on a
  Mountain, and onto Deep Water only if it stands on Deep Water.
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

| Rule                    | Interaction                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, Raise Dead      | Martian land-form units, flyers and Thralls included, leave Graves like any unit (in matches with an Undead seat). A mind-controlled victim and a collapsed Thrall leave none; neither does an embarked machine.                                                                                                                                                                    |
| Infect, Bitten          | A Martian unit killed by a Zombie rises as an ordinary Zombie (10 of 18 HP, no Shield, one slot); a Brain that rises has left the board, so its Thralls collapse. A Zombie bites a Martian unit only when its hit cost HP. A collapsed Bitten Thrall does not rise. No Martian unit cures a bite.                                                                                   |
| Plague                  | A Lich plagues only the targets that lost HP; Plague damage bypasses the Shield and spread ignores Shields. A mind-controlled Lich has left the board: its Plagues are cleared. No Martian unit cures Plague.                                                                                                                                                                       |
| Wail, Lifesteal         | Wail hits Martian units with the ordinary formula, the Shield absorbing first. A Vampire heals by the HP damage it dealt, not what a Shield absorbed; a Martian unit never retaliates against it. A Zombie, Ghoul, or Skeleton that becomes a Thrall loses every Undead ability.                                                                                                    |
| Goblin rules            | Gang Up counts the Goblin attacker's helpers around a Martian target; no Martian attack has Gang Up. Blasts and bomb splash are absorbed by the Shield first. A mind-controlled exploding unit is removed and does not explode; a pulled one keeps everything. Plunder counts Martian kills, never a collapse or a Mind Control.                                                    |
| Dinosaur rules          | Martian attacks, rays, and Pierce hit Eggs; Eggs are never Mind Control or Tractor Beam targets. A Charge! is absorbed by the Shield first and pushes and follows whatever it absorbed. Acid and Wallbreaker matter only for a Martian foot unit. An Ankylosaurus takes 1 less from every Martian hit. The two-slot dinosaurs are immune to Mind Control and the Tractor Beam.      |
| Human abilities         | Field Defense and Walls give a non-Martian defender their bonus against every Martian attack except a ray fired with the Disintegrator; a Tripod attack destroys Field Defense on the target tile. A Knight that kills a Martian unit advances and may attack again. A Juggernaut-role unit pushes a Martian unit under the ordinary conditions. The Catapult out-ranges every ray. |
| Cities, siege, capacity | Capture-capable: Grunt, Ray Gunner, Shield Projector, Colossus, Thrall. A foot unit or walker on a hostile center besieges it; a flyer is never there. Machines are never fortified. Slots: Mothership and Colossus 2, Thralls none; Martian cities have no capacity bonus. Beam Down, Mind Control, and the Tractor Beam spend no city action.                                     |
| Boats, water            | Martian boats are the Human boats. Foot units embark at Ports; machines self-launch on any water they may enter. An embarked Martian unit keeps its Shield, cannot attack, retaliate, or use an ability, and can be pulled from water to water.                                                                                                                                     |
| Achievements, Promotion | Muster counts a Thrall as the `FIGHTER` role and excludes the Colossus; Sea Dog never counts an afloat machine. Promotion (3 kills, +5 maximum HP, full heal of HP, Shield unchanged) applies to every Martian unit except the Thrall; ray, hostile Pierce, and retaliation kills count; Mind Control is not a kill.                                                                |

### 20.12 Commands, events, errors, and queries

- **Commands:** `BEAM_DOWN { kind, unitId, passengerUnitId, to }`,
  `MIND_CONTROL { kind, unitId, targetUnitId }`, and
  `TRACTOR_BEAM { kind, unitId, targetUnitId }`, in that order right after
  `HATCH` in `COMMAND_KIND_ORDER_V7` (the Ice Folk overlay's `THROW_BOLAS`
  and `COLD_SNAP` follow them). `MOVE` accepts a machine's path over and onto
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

## 21. Revision history

| Revision | Ruleset ID           | Main changes                                                                                                                                                                                        | Source                                                        |
| -------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 3        | `pulp-wars-poc-7r3`  | Original-faction baseline: four land branches, growth rewards, achievements, combat kernel                                                                                                          | [RULESET_7.md](RULESET_7.md)                                  |
| 4        | `pulp-wars-poc-7r4`  | Regional biomes; Ore returns; Mine 5/+2; Forge +1 per Mine                                                                                                                                          | [revision 4](RULESET_7_REVISION_4_BIOME_ECONOMY.md)           |
| 5        | `pulp-wars-poc-7r5`  | Explorer achievement; Monument placement flow                                                                                                                                                       | [revision 5](RULESET_7_REVISION_5_ACHIEVEMENTS.md)            |
| 6        | `pulp-wars-poc-7r6`  | Map types, water, Fish, Pearls, Ports, Naval branch, transport, Patrol Boat, Battleship                                                                                                             | [revision 6](RULESET_7_REVISION_6_WATER_NAVAL.md)             |
| 7        | `pulp-wars-poc-7r7`  | Neutral Roads, automatic embark, Battleship splash, flat fortification levels, Field Defense; removed Saboteur                                                                                      | [revision 7](RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md) |
| 8        | `pulp-wars-poc-7r8`  | Adjacent shared processor contributors                                                                                                                                                              | [revision 8](RULESET_7_REVISION_8_INDUSTRY_ADJACENCY.md)      |
| 9        | `pulp-wars-poc-7r9`  | 23-node Human tree, Captain, Knight, Overrun, Land Grant, Shipyard, Market move, separate land/sea trade                                                                                            | [revision 9](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md)        |
| 10       | `pulp-wars-poc-7r10` | Road movement without capital connection; city-center spawning; full-turn Fortify                                                                                                                   | [revision 10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)  |
| 10 (fix) | `pulp-wars-poc-7r11` | An occupied center blocks land training; displacement applies only to reward units                                                                                                                  | [revision 10](RULESET_7_REVISION_10_PLAYTEST_CORRECTIONS.md)  |
| 11       | `pulp-wars-poc-7r11` | One city action per turn; Windmill healing; Road population; Commerce ×2 Market; Ore on Drill; Pillage on Raiding; tactical AI                                                                      | [revision 11](RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md)     |
| 12       | `pulp-wars-poc-7r12` | No starting technology; free first tier-1 research; Fruit always visible, Fertile Ground on Gathering; resources kept under improvements; AI opener; Raider Escape                                  | this document                                                 |
| 13       | `pulp-wars-poc-7r13` | Undead faction (per-seat factions, roster, Graves, Restless, Frenzy, Raise Dead, Devour, Infect, Lifesteal, Wail, Lich splash)                                                                      | [revision 13](RULESET_7_REVISION_13_UNDEAD.md)                |
| 14       | `pulp-wars-poc-7r14` | Plague (Lich) and Bitten (Zombie); Tend cures; unanswered Vampire; Lich Attack 3; +1 village; level income cap 5; Commerce no longer doubles Markets                                                | [revision 14](RULESET_7_REVISION_14_BALANCE.md)               |
| 15       | `pulp-wars-poc-7r15` | Plague lasts three owner turns and spreads only on the first; Zombie 18 HP                                                                                                                          | [revision 15](RULESET_7_REVISION_15_BALANCE.md)               |
| 16a      | `pulp-wars-poc-7r16` | Orthogonal Shallow Water (25% minimum); capital growth guarantee and `CAPITAL_GROWTH`; Normal AI growth-first opening                                                                               | [revision 16](RULESET_7_REVISION_16.md)                       |
| 16b      | `pulp-wars-poc-7r16` | Patrol Boat and embarked Move 2; landing costs one movement point; landing preview                                                                                                                  | [revision 16](RULESET_7_REVISION_16.md)                       |
| 16c      | `pulp-wars-poc-7r16` | Research tiers 5+1/7+3/12+5 per extra city; level income cap 4; Market cap 3                                                                                                                        | [revision 16](RULESET_7_REVISION_16.md)                       |
| 17       | `pulp-wars-poc-7r17` | Goblin faction: roster, Warrens, Gang Up, Kaboom, death blasts and chains, friendly-fire bombs, Plunder, WAAAGH!, Troll regeneration; `END_TURN` blockade events                                    | [revision 17](RULESET_7_REVISION_17_GOBLINS.md)               |
| 17       | `pulp-wars-poc-7r17` | `pulp_wars-0ao.7` tuning: one starting Goblin; Goblin Attack 1.5, Defense 0.5, Kaboom 5; death blasts 2/4/4; Goblin-only Normal AI changes                                                          | [revision 17](RULESET_7_REVISION_17_GOBLINS.md)               |
| 17 (fix) | `pulp-wars-poc-7r17` | `pulp_wars-0ao.15`: landing ends the activation for every faction (no Attack, Kaboom, Move, or Disband after landing)                                                                               | [revision 16](RULESET_7_REVISION_16.md)                       |
| 18       | `pulp-wars-poc-7r18` | Movement (`pulp_wars-6gd.2`): a Move passes through the mover's own units and never ends on one; the Road half cost depends only on the tile being left                                             | [revision 18](RULESET_7_REVISION_18.md)                       |
| 18       | `pulp-wars-poc-7r18` | Showcase (`pulp_wars-6gd.3`): the fixed 16 x 16 `SHOWCASE` map type with three developed cities, every technology, and one unit of every role per seat                                              | [revision 18](RULESET_7_REVISION_18.md)                       |
| 19       | `pulp-wars-poc-7r19` | Dinosaur faction (`pulp_wars-c87.2`–`c87.7`): roster, slots, Eggs, Shaman Hatch, Nesting, Grow, Wild, Acid, Armoured, Stampede, treasure Raptor                                                     | [revision 19](RULESET_7_REVISION_19_DINOSAURS.md)             |
| 19       | `pulp-wars-poc-7r19` | `pulp_wars-c87.8` interim tuning: Caveman 12 HP; one-slot Triceratops hatching in one turn; Forest Stampede lanes; Dinosaur-only AI changes                                                         | [revision 19](RULESET_7_REVISION_19_DINOSAURS.md)             |
| 20       | `pulp-wars-poc-7r20` | `pulp_wars-0hi.2`: Charge! replaces Stampede (Triceratops Move 2, 20 HP, 2 slots, hatch 2); T-Rex 14, hatch 4; Nesting slot; Wallbreaker; full heal                                                 | [revision 20](RULESET_7_REVISION_20.md)                       |
| 21       | `pulp-wars-poc-7r21` | `pulp_wars-9s0.4`: Conqueror, Land Baron, Sea Dog, and Slayer achievements (seven entitlements per seat)                                                                                            | [revision 21](RULESET_7_REVISION_21_ACHIEVEMENTS.md)          |
| Martian  | `pulp-wars-poc-7r22` | Martian faction (`pulp_wars-t6s.2` engine): roster, Shields, Force Field(s), heat rays, Cooling, Pierce, Disintegrator, Stride, Flying, self-launch, Beam Down, Mind Control, Thralls, Tractor Beam | [Martian overlay](RULESET_7_MARTIANS.md)                      |
| 20 (bal) | `pulp-wars-poc-7r23` | `pulp_wars-0hi.3` coarse Dry Land balance: Human Fighter, Raider, and Marksman 12 HP, Guard 17; Caveman 10                                                                                          | [revision 20](RULESET_7_REVISION_20.md#63-tuning-record)      |
| Martian  | `pulp-wars-poc-7r23` | `pulp_wars-t6s.4` Martian UI (setup offers Martians; `t6s.6` production art) and `t6s.3` Martian Normal AI, no identity change                                                                      | [Martian overlay](RULESET_7_MARTIANS.md)                      |
| —        | `pulp-wars-poc-7r24` | `pulp_wars-7g3.3`: Ice Folk faction engine, not offered in setup (AI and UI pending); **not folded** into this document                                                                             | [Ice Folk overlay](RULESET_7_ICE_FOLK.md)                     |
| Martian  | `pulp-wars-poc-7r25` | `pulp_wars-t6s.5` coarse Dry Land Martian balance: Colossus Defense 2.5                                                                                                                             | [Martian balance](../validation/RULESET_7_MARTIAN_BALANCE.md) |
| —        | `pulp-wars-poc-7r26` | `pulp_wars-9s0.2`: the Pangea coast ring (no land on the edge ring; Shallow circumnavigation; 59.5–72% land); other map types unchanged                                                             | [section 2.3](#23-map-types)                                  |

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
  the Rift parts of 7.2 and 8.4) describe a terrain that is not in the game
  (`pulp_wars-9s0.5` has not landed; the map revision is still
  `REGIONAL_BIOMES_NAVAL_V2`), so they are not stated here;
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

## 22. Known discrepancies

No rule discrepancy is open: as of `pulp-wars-poc-7r26` the rules in this
document match the code for the five playable factions, including the
Dinosaur faction of revisions 19 and 20, the achievements of revision 21,
and the Martian faction of the Martian overlay.

**Pending overlay in the code.** The engine at `pulp-wars-poc-7r26` also
contains the [Ice Folk overlay](RULESET_7_ICE_FOLK.md) (`pulp_wars-7g3.3`,
`7r24`), which this document does not describe: the `ICE_FOLK`
faction and `ICE_FOLK_BASELINE_V1` tree, the commands `THROW_BOLAS` and
`COLD_SNAP` (after `TRACTOR_BEAM`), the event `UNITS_CHILLED` (after
`UNITS_RALLIED`), the `UNIT_DIED` cause `SHATTER`, the
`FIELD_DEFENSE_DESTROYED` reason `TRAMPLE`, the `UNIT_MOVE_INTERRUPTED`
reason `SNOW`, `curedChill` in Tend results, the state and view list
`chilled`, the view tile flags `snow` and `blizzard`, eight combat-preview
fields, the `chill` unit stat and `iceFolk` block, and the Witch support,
Deep Winter, and Brittle unlocks. In a match without an Ice Folk seat every
one of them is empty, false, or never offered, and the overlay's parity
requirement is that such a match is identical to the previous identity apart
from identity and those neutral fields. Its shared helpers
(`unitMayActAfterMoveV7`, the Mountain-born input of `canEnterTerrainV7`,
and the Sabretooth's use of the flyer's settlement rule) change nothing for
the five factions. The browser setup does not offer the faction, and its
Normal AI and UI are in progress. It is not folded.

The revision 13–21 overlays and the Martian overlay keep superseded values
(for example the Lich's Attack 2.5 and 20-HP Zombie in revision 13,
unlimited Plague in revision 14, "Move 3" for embarked units in revision 13,
the pre-tuning Goblin contract values in the revision-17 bounds and
decisions, the Stampede and the interim Dinosaur numbers in revision 19,
the pre-`0hi.3` Human HP in revision 20's bounds, and the contract's
Colossus Defense 3, the Rift rules, and the placeholder-art plan in the
Martian overlay) as design history; this document states the current
values.
