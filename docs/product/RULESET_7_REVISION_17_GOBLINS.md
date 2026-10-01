# Ruleset 7 revision 17: Goblin faction

**Status:** contract (`pulp_wars-0ao.1`), not yet implemented. It is
implemented by the child beads of `pulp_wars-0ao` in the order of
[section 13](#13-implementation-split-and-test-expectations). The running game
is described by [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(`pulp-wars-poc-7r16`) until `pulp_wars-0ao.9` folds this overlay into it.

**Ruleset ID:** `pulp-wars-poc-7r17`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (unchanged; faction
choice never affects generation)

**Scope:** an overlay over the revision-16 contract in
[Ruleset 7: current rules](RULESET_7_CURRENT.md). It adds a third playable
faction, `GOBLIN`, and changes only identity, faction registration, setup, the
Goblin roster, the Goblin faction rules (Warrens, Gang Up, the Field Defense
restriction), explosions (Kaboom, death blasts, chain reactions, Bomb Chucker
bombs), Plunder, WAAAGH!, Troll regeneration, the Goblin substitutions for the
starting unit, rewards, and treasure, and the commands, events, queries, UI,
and Normal AI needed to play them. Every unmentioned revision-16 rule stays in
force for every faction. Rulesets 5 and 6 and historical Ruleset 7 fixtures
remain frozen.

**Identity of the faction:** Humans are sustain; Undead are attrition; Goblins
are a reckless horde. Goblins win by numbers and by explosions: cheap weak
units, bonuses for ganging up on one target, units that blow themselves up
(and their friends), and Coins for every kill. Economy, the technology graph,
map rules, and naval units are the Human ones. Every Goblin rule is visible on
the board and fits in one sentence ([section 11.3](#113-help-text)).

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. Sources and decided direction

The user's direction of 2026-09-30 (epic `pulp_wars-0ao`): a Goblin faction as
iconic as the Undead, with mechanically different tactics and easy for players
to understand: hordes of weak aggressive goblins, rickety vehicles, a love of
explosions, plus orc and troll units. The root holds full judgement authority;
the user reviews the finished three-faction game.

These user decisions are rules of this contract and are not reopened here:

| #   | User decision                                                                            | Where                                                                  |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| U1  | Every goblin-crewed unit (not orcs, not trolls) can blow itself up.                      | [section 6.2](#62-kaboom)                                              |
| U2  | Bomb Chuckers explode on death.                                                          | [section 6.3](#63-death-blasts)                                        |
| U3  | Friendly fire is on.                                                                     | [sections 6.4](#64-blast-resolution) and [6.6](#66-bomb-chucker-bombs) |
| U4  | Loot Coins per kill, unlocked by a technology that replaces another economic technology. | [section 7.4](#74-plunder)                                             |
| U5  | Naval units are the same as the Human ones.                                              | [section 3](#3-goblin-roster)                                          |

The root design brief (the notes of `pulp_wars-0ao.1`) is authoritative for
intent. Its eight pillars map to this document as follows: Horde and Warrens
([5.1](#51-horde-and-warrens)), Gang Up ([5.2](#52-gang-up)), Kaboom
([6.2](#62-kaboom)), death explosions and chain reactions
([6.3](#63-death-blasts), [6.5](#65-chain-reactions)), Plunder
([7.4](#74-plunder)), no healers and WAAAGH! ([5.4](#54-recovery-no-healers),
[7.1](#71-waaagh)), Troll regeneration ([7.2](#72-troll-regeneration)), and the
discipline weakness ([5.3](#53-discipline-field-defense)). Where the brief left
a choice this document decides it; every such decision is listed in
[section 15](#15-decisions-made-in-this-spec). Conflicts with the engine are in
[section 16](#16-concerns-and-root-decisions).

## 2. Identity, factions, and compatibility

### 2.1 Identity

| Boundary                                   | Revision-17 value                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r17`                                                                                  |
| Game-state schema                          | `7`                                                                                                   |
| Command/event/save/replay numeric versions | `7`                                                                                                   |
| Browser autosave                           | `pulpWars.save.v7r17.current`                                                                         |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                                                            |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`                                                                        |
| Frozen `FactionTreeId` order               | `ORIGINAL_BASELINE_V5`, `UNDEAD_BASELINE_V1`, `GOBLIN_BASELINE_V1`                                    |
| Faction to tree binding                    | `ORIGINAL` → `ORIGINAL_BASELINE_V5`; `UNDEAD` → `UNDEAD_BASELINE_V1`; `GOBLIN` → `GOBLIN_BASELINE_V1` |
| Display names                              | `ORIGINAL` is "Human"; `UNDEAD` is "Undead"; `GOBLIN` is "Goblin"                                     |

- `pulp-wars-poc-7r16` is appended to `PRIOR_RULESET_7_IDS` (the list stays
  gap-free). A revision-17 reader rejects it and every earlier Ruleset 7
  identity in setups, states, saves, replays, and release artifacts; there is
  no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r16.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-0ao.2`. Later beads (`0ao.3`
  explosions, `0ao.5` UI, `0ao.6` AI, `0ao.7` tuning) change rules and
  behaviour under the same identity; revision 17 is complete when
  `pulp_wars-0ao.9` lands (the revision-14 and revision-16 precedent).
- `GameStateV7` gains no field. Explosions resolve inside one command and
  leave no persistent state; Plunder changes Coins; Troll regeneration changes
  HP. The shape changes are the new faction and tree literals, one command,
  new events, new `UNIT_DIED` causes, a new Field Defense destruction reason,
  one error code, and the combat preview field `gangUp`
  ([section 9](#9-commands-events-errors-and-queries)).

### 2.2 Setup

- `MatchSetupV7.factions` stays a dense per-seat array; each entry is
  `ORIGINAL`, `UNDEAD`, or `GOBLIN`, and every combination is legal.
- Faction choice still never affects map generation, capital placement, turn
  order, treasure placement, or any PRNG draw: setups that differ only in
  `factions` generate byte-identical boards, turn orders, and treasures.
- **Starting units.** A Goblin seat starts with **one** Goblin (the `FIGHTER`
  role), 5 Coins, and no technology; the Goblin stands on the capital exactly
  like every faction's start unit, full-HP, homed to the capital, with a fresh
  activation. (`pulp_wars-0ao.7` tuned the contract's two starting Goblins to
  one, within the [section 14.1](#141-tuning-bounds) bounds of 1–2; see
  [section 14.4](#144-tuning-record-pulp_wars-0ao7).) At the bound's upper
  value of two, the second Goblin is created after every seat's first start
  unit has been created (in seat order), so the capital, city, and first-unit
  IDs of every seat are those of an all-Human setup; it stands on the first
  cell of the capital's eight-cell ring in `(y, x)` order that is land, not
  Mountain, and has no unit and no treasure chest, and if no such cell exists
  the seat starts with one Goblin, with no compensation (deterministic, no
  PRNG).
- The headless tools accept `goblin` in `--factions` (seat-ordered, as
  `original`/`human`/`undead` today).

### 2.3 Faction model

Revision 17 follows the revision-13 model: the frozen mechanical role order
is unchanged, state and events serialize the mechanical role, and every rule,
view, preview, UI surface, and AI decision resolves a unit through its
**owner's** registration with no cross-faction fallback.

- **Living.** Goblin units are living (their owner's faction is not
  `UNDEAD`), so Wail, Plague, and Bitten affect them exactly as they affect
  Human units.
- **Goblin-crewed** units are the Goblin registration's `FIGHTER`, `RAIDER`,
  `MARKSMAN`, `CATAPULT`, and `KNIGHT` roles (Goblin, Wolf Rider, Bomb
  Chucker, Rocket Cart, Scrap Buggy). Orc Brute, Orc Warboss, Troll, and the
  two boats are not goblin-crewed.
- **Exploding units** are the Goblin `MARKSMAN`, `CATAPULT`, and `KNIGHT`
  roles (Bomb Chucker, Rocket Cart, Scrap Buggy).

| Mechanical role | Human (`ORIGINAL`) | Undead (`UNDEAD`) | Goblin (`GOBLIN`) |
| --------------- | ------------------ | ----------------- | ----------------- |
| `FIGHTER`       | Fighter            | Skeleton          | Goblin            |
| `RAIDER`        | Raider             | Ghoul             | Wolf Rider        |
| `MARKSMAN`      | Marksman           | Banshee           | Bomb Chucker      |
| `GUARD`         | Guard              | Zombie            | Orc Brute         |
| `CAPTAIN`       | Captain            | Necromancer       | Orc Warboss       |
| `CATAPULT`      | Catapult           | Lich              | Rocket Cart       |
| `KNIGHT`        | Knight             | Vampire           | Scrap Buggy       |
| `JUGGERNAUT`    | Juggernaut         | Abomination       | Troll             |
| `PATROL_BOAT`   | Patrol Boat        | Patrol Boat       | Patrol Boat       |
| `BATTLESHIP`    | Battleship         | Battleship        | Battleship        |

## 3. Goblin roster

Tactical-role metadata equals that of the same mechanical role. "Kaboom" and
"Death blast" are the fixed blast damages of [section 6.1](#61-terms).

| Unit         | Role          | Tech              | Cost |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Kaboom | Death blast | Abilities                            |
| ------------ | ------------- | ----------------- | ---: | --: | -----------------: | -------------------: | ---: | ----: | ----: | ----------------- | ------- | -----: | ----------: | ------------------------------------ |
| Goblin       | `FIGHTER`     | start             |    1 |   6 |            1.5 (3) |              0.5 (1) |    1 |     1 |     1 | yes               | yes     |      5 |           — | Kaboom; no Field Defense             |
| Wolf Rider   | `RAIDER`      | Scouting          |    3 |  10 |              2 (4) |                1 (2) |    2 |     1 |     2 | yes               | yes     |      4 |           — | Charge (Raiding); Kaboom; no Escape  |
| Bomb Chucker | `MARKSMAN`    | Marksmanship      |    3 |   8 |              2 (4) |                1 (2) |    1 |     2 |    1¹ | yes               | yes     |      4 |           2 | bombs (friendly-fire splash); Kaboom |
| Orc Brute    | `GUARD`       | Drill             |    3 |  15 |              2 (4) |              2.5 (5) |    1 |     1 |     1 | no                | yes     |      — |           — | Field Defense                        |
| Orc Warboss  | `CAPTAIN`     | Administration    |    5 |  12 |              2 (4) |                1 (2) |    1 |     1 |     1 | yes               | no      |      — |           — | WAAAGH!; no Tend Wounded             |
| Rocket Cart  | `CATAPULT`    | Sawmilling        |    7 |   8 |            3.5 (7) |              0.5 (1) |    1 |   2–3 |     1 | no                | no      |      5 |           4 | Kaboom; never advances               |
| Scrap Buggy  | `KNIGHT`      | Chivalry          |    8 |  10 |              3 (6) |                1 (2) |    3 |     1 |     1 | yes               | no      |      5 |           4 | Ram; Kaboom                          |
| Troll        | `JUGGERNAUT`  | reward only       |    — |  40 |              4 (8) |                3 (6) |    1 |     1 |     1 | yes               | yes     |      — |           — | Push; Regenerate 4                   |
| Patrol Boat  | `PATROL_BOAT` | Shorecraft        |    5 |  10 |              2 (4) |                2 (4) |    2 |     1 |     2 | yes               | no      |      — |           — | naval                                |
| Battleship   | `BATTLESHIP`  | Naval Engineering |   16 |  25 |             6 (12) |                4 (8) |    2 |   1–3 |     3 | no                | no      |      — |           — | naval; splash                        |

¹ Bomb Chucker Sight becomes 2 with Fieldcraft.

The Goblin's Attack, Defense, and Kaboom and the three death blasts are the
`pulp_wars-0ao.7` tuned values (contract: Goblin Attack 2, Defense 1, Kaboom
4; death blasts 3, 5, and 5;
[section 14.4](#144-tuning-record-pulp_wars-0ao7)).

- **Goblin** has Fighter parity (capture, Pillage with Raiding, Disband)
  except that it cannot build Field Defense
  ([section 5.3](#53-discipline-field-defense)). It is the horde unit: cost 1
  (Arms Industry cannot lower it below 1).
- **Wolf Rider** has Raider parity for Move 2, Sight 2 (Scouting), Charge
  (Raiding), Pillage, capture, and Fieldcraft Forest freedom. It has no Escape.
- **Bomb Chucker** has range 2 and **minimum range 2**: it cannot target an
  adjacent unit and retaliates only against an attacker exactly 2 cells away.
  Its attack is a bomb ([section 6.6](#66-bomb-chucker-bombs)). It keeps
  capture, Pillage, Disband, and Fieldcraft Forest freedom and Sight.
- **Orc Brute** has Guard parity: cannot attack after moving, capture, Field
  Defense (Fortification). It is the only Goblin unit that builds Field
  Defense.
- **Orc Warboss** cannot capture. Its primary actions are Attack and WAAAGH!
  ([section 7.1](#71-waaagh)); it has no Tend Wounded.
- **Rocket Cart** has Catapult parity: range 2–3, minimum range 2, cannot
  attack after moving, no capture, never advances, and destroys Field Defense
  on the primary target tile (reason `CATAPULT`). It has no splash.
- **Scrap Buggy** has Knight parity: Move 3, no capture, and Overrun, labelled
  **Ram** for Goblins (same rule and events). A treasure Scrap Buggy has Ram
  like a treasure Knight has Overrun.
- **Troll** has Juggernaut parity (reward only, Push, capture, no Pillage or
  Disband) with Defense 3 instead of 4, and regenerates
  ([section 7.2](#72-troll-regeneration)).
- **Patrol Boat and Battleship** are identical to the Human units: names,
  stats, abilities (the Battleship's hostile-only splash), and art. Goblin
  faction rules do not apply to them: they get no Gang Up, cannot Kaboom, and
  never explode.
- **Disband refunds** are `floor(cost / 2)` as usual: Goblin 0, Wolf Rider 1,
  Bomb Chucker 1, Orc Brute 1, Orc Warboss 2, Rocket Cart 3, Scrap Buggy 4.
  Disband is offered for a Goblin even though it refunds 0. Arms Industry
  (−1, minimum 1) and the Shipyard discount apply as for every faction.
- An **embarked** Goblin land unit follows the ordinary embarked rules (Move
  2, Defense 1, Sight 1, no Attack, no retaliation, no ZOC, and no Kaboom).
- **Public abilities** (the role rule's `abilities` list): Goblin `ATTACK`,
  `CAPTURE`, `KABOOM`; Wolf Rider `ATTACK`, `CAPTURE`, `CHARGE`, `KABOOM`; Bomb
  Chucker `ATTACK`, `CAPTURE`, `KABOOM`; Orc Brute `ATTACK`, `CAPTURE`; Orc
  Warboss `ATTACK`, `RALLY`; Rocket Cart `ATTACK`, `KABOOM`; Scrap Buggy
  `ATTACK`, `OVERRUN`, `KABOOM`; Troll `ATTACK`, `CAPTURE`, `PUSH`,
  `REGENERATE`; boats `ATTACK`. Blast damages, friendly-fire bombs, the WAAAGH!
  radius, the Field Defense restriction, and the regeneration amount are
  engine role mechanics of the Goblin registration (the revision-13 `splash`
  precedent) and are exposed through public unit stats.

## 4. Technology

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rule, and every other unlock of `GOBLIN_BASELINE_V1` are identical to
`ORIGINAL_BASELINE_V5` ([current rules section 6](RULESET_7_CURRENT.md#6-technology)).
The technology IDs are unchanged (`COMMERCE` stays `COMMERCE` in state,
commands, and events). The Goblin registration differs in two unlock entries
and one display name:

- `ADMINISTRATION` replaces `CAPTAIN_SUPPORT` with `WAAAGH_SUPPORT` (the Orc
  Warboss's WAAAGH!).
- `COMMERCE` is displayed as **Plunder** to a Goblin viewer and replaces
  `LAND_TRADE_INCOME { coins: 1 }` with `PLUNDER { coins: 1 }`
  ([section 7.4](#74-plunder)). Goblins therefore never earn land trade; Roads
  movement and Road population are unchanged.
- `CHIVALRY` keeps its `OVERRUN` unlock (displayed as Ram).

Every other unlock object is the same mechanical value. The technology tree,
research offers, and Help render names and unlock text from the **viewer's**
faction:

| Technology     | Goblin name | Goblin unlock text                                                                             |
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

The other thirteen technologies read the same for every faction. Every engine,
query, and AI check that today reads `researchedTechs.includes("COMMERCE")` to
mean land trade (`economy.ts`, `query.ts`, `ai/v7.ts`) must instead read the
technology capabilities (`landTradeIncomeCoins`), and Plunder is the new
capability `plunderCoins: 0 | 1`.

## 5. Faction-wide rules

Every rule in this section applies only to units and cities owned by a
`GOBLIN` seat.

### 5.1 Horde and Warrens

- The Goblin costs 1 Coin ([section 3](#3-goblin-roster)).
- **Warrens:** every city owned by a Goblin seat has +1 unit capacity:
  `capacity = level + 1 + (Planning ? 1 : 0) + (owner is GOBLIN ? 1 : 0)`.
  The bonus follows the current owner: a city a Goblin seat captures gains it,
  and a Goblin city captured by another faction loses it (capacity loss never
  removes units). Every capacity surface (training, treasure placement,
  `previewCityCapacityV7`, the city panel) uses the same formula.

### 5.2 Gang Up

- When a Goblin unit in land form makes an `ATTACK` (any accepted attack,
  including Ram continuations), it gets **+1 Attack (+2 `attack2`) for each
  other unit its owner has on the eight cells around the target, up to +2**.
- Helpers are units on the board owned by the attacker's owner, of any role
  and form (land, embarked, naval), other than the attacker itself. Allied
  units never count.
- Gang Up applies to melee and ranged attacks alike (a Rocket Cart 3 cells
  away counts the Goblins next to its target). It never applies to
  retaliation, Kaboom, death blasts, bomb splash damage directly (the bomb's
  splash derives from its boosted primary damage), Wail, or Goblin naval
  units.
- Gang Up adds to Charge (+1) and Inspired/WAAAGH! (+1); nothing else changes
  in the damage formula.
- The attacker's own units are always visible to it, so the public preview is
  exact. `CombatPreviewV7` gains `gangUp` (0, 1, or 2, whole Attack), and
  `attack2` includes it. The field is 0 for every non-Goblin attacker.

### 5.3 Discipline: Field Defense

`BUILD_FIELD_DEFENSE` is legal for a Goblin seat only with an Orc Brute
(`GUARD`). A Goblin (`FIGHTER`) is never offered it and is rejected exactly
like any other role that cannot build it (today `INVALID_TILE` with
`action: "BUILD_FIELD_DEFENSE"`). Human Fighters and Undead Skeletons keep the
ability.

### 5.4 Recovery: no healers

Goblin recovery is the Human rule (4 in own territory, 2 elsewhere; naval and
embarked rules unchanged; Windmill healing unchanged). Goblins are not
Restless. The Orc Warboss has no Tend Wounded, so a Goblin seat has no way to
cure Plague or Bitten; the only Goblin healing beyond recovery and Windmills
is the Troll's own regeneration.

## 6. Explosions

### 6.1 Terms

- The **blast area** of an explosion is the 3 × 3 square centred on the
  exploding unit's tile (the tile where it died), clipped to the board.
- An explosion **hits every unit on the board in its blast area other than the
  exploding unit itself**: any owner (own, allied, hostile), any faction, any
  form (land, embarked, naval), visible or hidden. This is friendly fire.
- **Blast damage** is fixed per role and explosion kind:

| Unit         | Kaboom (`cause: KABOOM`) | Death blast (`cause: DEATH`) |
| ------------ | -----------------------: | ---------------------------: |
| Goblin       |                        5 |                            — |
| Wolf Rider   |                        4 |                            — |
| Bomb Chucker |                        4 |                            2 |
| Rocket Cart  |                        5 |                            4 |
| Scrap Buggy  |                        5 |                            4 |

- Blast damage ignores Attack, Defense, HP ratio, cover, fortification, Walls,
  Field Defense, the embarked Defense, Charge, Gang Up, and Inspired. Each hit
  deals `min(blast damage, target's current HP)`.
- A unit **explodes at most once**. A Kaboom is that unit's explosion; it does
  not also produce a death blast.

### 6.2 Kaboom

`KABOOM { kind, unitId }`, a primary action of every goblin-crewed unit. It is
not an Attack and needs no technology.

- **Legality:** the unit is the actor's own, on the board, in land form, has
  the `KABOOM` ability under its owner's registration, and has not used a
  primary action this turn. It may have moved (including a Rocket Cart, whose
  "cannot attack after moving" limits only Attack). No target is required: a
  Kaboom that hits nobody is legal (for example to destroy Field Defense or
  lift a blockade of one's own units).
- **Result:** the unit dies (`UNIT_DIED` cause `KABOOM`, then its Grave or
  Bitten rising, [section 8.1](#81-undead-rules)), then its explosion resolves
  as wave 1 of a chain ([sections 6.4](#64-blast-resolution) and
  [6.5](#65-chain-reactions)). Kaboom never moves, captures, or advances any
  unit and never damages cities, buildings, improvements, Roads, resources,
  Ports, Walls, or terrain.
- **Rejections (atomic):** unknown or dead unit, not owned →
  existing unit errors; role without `KABOOM` (Orc Brute, Orc Warboss, Troll,
  boats, every Human and Undead role) → `UNIT_ROLE_INVALID { role }`; primary
  action already used → `UNIT_ALREADY_ACTED`; embarked →
  `KABOOM_NOT_LEGAL { reason: "EMBARKED" }`. A pending city reward blocks it
  like every command.
- A Plagued or Bitten unit may Kaboom (only Disband is barred for them).

### 6.3 Death blasts

A Bomb Chucker, Rocket Cart, or Scrap Buggy **explodes when it is killed**,
whatever killed it and wherever it stands (land, a city or village center,
embarked on water), with its death-blast damage:

| Cause of death                                            | Death blast                        |
| --------------------------------------------------------- | ---------------------------------- |
| `ATTACK` (killed as a defender)                           | yes                                |
| `RETALIATION` (killed while attacking)                    | yes                                |
| `SPLASH` (Battleship, Lich, or Bomb Chucker splash)       | yes                                |
| `WAIL`                                                    | yes                                |
| `PLAGUE` (at its owner's Start Turn)                      | yes                                |
| `EXPLOSION` (hit by another explosion)                    | yes                                |
| `KABOOM` (its own Kaboom)                                 | no: the Kaboom is its explosion    |
| Disband, reward displacement removal, elimination removal | no: these are removals, not deaths |

Goblins and Wolf Riders never explode on death; they only Kaboom.

### 6.4 Blast resolution

One explosion resolves in this order:

1. Collect every unit in the blast area other than the exploding unit that is
   still on the board at this moment (a unit killed earlier in the same
   command is gone and is not hit).
2. Each takes `min(blast damage, hp)`; all hits of this explosion apply
   together. Results are sorted by `(y, x, unitId)`.
3. Every tile of the blast area with Field Defense loses it (any owner,
   including the exploder's own tile and the Goblin player's own territory),
   emitting `FIELD_DEFENSE_DESTROYED { at, reason: "EXPLOSION" }` in `(y, x)`
   order.
4. Each unit reduced to 0 HP dies with `UNIT_DIED` cause `EXPLOSION`, in
   results order, each followed by its Grave or Bitten rising under the
   ordinary rules ([section 8.1](#81-undead-rules)). Kill credit and Plunder
   follow [section 6.8](#68-kill-credit-plunder-attribution-and-friendly-fire).

"Death first, then the bang": an exploding unit's own death (and its Grave or
rising) is always recorded before its explosion resolves. Consequently a unit
that stands on the exploder's tile when the blast resolves is hit: a melee
attacker that killed the exploder and advanced onto its tile, or an Infect or
Bitten rising that appeared there.

### 6.5 Chain reactions

An explosion that kills an exploding unit sets that unit off. The chain is
breadth-first by **wave**:

- **Wave 1** is the set of explosions that start the chain, in ascending unit
  ID: the Kaboom unit alone for `KABOOM`; otherwise every exploding unit killed
  by the command's (or Start Turn's) ordinary effects.
- Explosions of one wave resolve **one at a time in ascending unit ID**, each
  against current HP ([section 6.4](#64-blast-resolution)). A unit killed by an
  earlier explosion of the wave is not hit by later ones.
- Every exploding unit killed during wave `n` explodes in wave `n + 1`, in
  ascending unit ID. The chain ends after the first wave that kills no
  exploding unit.
- **Termination and safety bound:** every unit explodes at most once and a
  chain never creates an exploding unit (risings are Zombies), so a chain has
  at most as many explosions as there were units on the board when it started.
  The engine asserts this bound (`EXPLOSION_CHAIN_MAX_EXPLOSIONS_V7` = the
  unit count at chain start); a violation is an internal error that rejects
  the command atomically with `INVALID_STATE` and is unreachable by
  construction.
- The chain is PRNG-free and depends only on canonical state, so replays and
  checkpoint hashes are deterministic.

### 6.6 Bomb Chucker bombs

A Bomb Chucker `ATTACK` is an ordinary targeted attack (damage formula,
Gang Up, Inspired, retaliation only from a defender that can reach 2 cells)
plus a bomb splash:

- **Every other unit on the eight cells around the primary target**, of any
  owner including the Bomb Chucker's own and its allies' units, hidden or
  visible, of any form, takes `max(1, ceil(primary damage / 2))` capped at its
  HP, where primary damage is the applied damage to the primary target (the
  existing splash formula). There is no retaliation from splash targets and no
  modifier.
- Splash applies only when the Bomb Chucker attacks, never when it
  retaliates. Splash deaths have cause `SPLASH` (so exploding units killed by
  it explode).
- Splash kills of hostile units count for the Bomb Chucker's promotion and
  for Plunder; splash kills of own or allied units count for neither.
- Fog and projection follow the Battleship splash rules unchanged: canonical
  resolution includes hidden units; the public combat preview lists only
  visible units; a viewer that cannot see the attacker or target but owns a
  splashed unit receives `COMBAT_SPLASH_DAMAGE`.
- The Human and Undead Battleship and the Undead Lich keep hostile-only
  splash. Implementation: the role mechanics `splash` gains a target mode
  (`HOSTILE` for Battleship and Lich, `ALL` for the Goblin Bomb Chucker).

### 6.7 Where chains run, and event order

A chain runs after the effect that caused the deaths has fully resolved,
including its deaths, Graves, and risings:

- **`KABOOM`:** `UNIT_DIED` (cause `KABOOM`) and the exploder's
  `GRAVE_CREATED` or `BITTEN_UNIT_RISEN`; the chain; `PLUNDER_AWARDED`;
  reveals of risings; the ordinary economy, reward-settlement, and achievement
  tail; then (as for every command) `PLAGUE_CLEARED` and naval blockade and
  network events.
- **`ATTACK`:** the existing revision-13/14 steps through Push (damage,
  splash, Lifesteal, kill credit, removals, primary Field Defense destruction,
  deaths with Graves, Infect, and Bitten risings, advance, Push); then the
  chain of the exploding units among the defender, splash victims, and
  attacker; then Ram/Overrun continuation, **evaluated on the board after the
  chain** (no continuation if the attacker died or no visible hostile unit is
  adjacent any more; the `COMBAT_RESOLVED` preview's `overrunContinues` and
  `attacksRemaining` state the final value); then `PLUNDER_AWARDED`, reveals,
  and the tail. Event order: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`;
  the existing death events; `UNIT_MOVED` (advance); `UNIT_PUSHED`; the chain
  events; `PLUNDER_AWARDED`; `TILES_REVEALED`; the tail.
- **`WAIL`:** after the Wail deaths and their Graves or risings, the chain of
  exploding victims; then `PLUNDER_AWARDED` (never for the Banshee's owner,
  which is Undead, but possibly for Goblin exploders' kills) and the tail.
- **Start Turn Plague:** after Plague steps 1–5
  ([current rules section 17.8](RULESET_7_CURRENT.md#178-plague)), the chain
  of the player's exploding units that Plague killed; then `PLUNDER_AWARDED`;
  then Windmill healing, Troll regeneration
  ([section 7.2](#72-troll-regeneration)), income, rewards, and achievements.
  The chain may damage and kill other players' units during this Start Turn.

Chain events: for each explosion in chain order, `EXPLOSION_RESOLVED`, then
its `FIELD_DEFENSE_DESTROYED` events, then for each death in its results
order `UNIT_DIED` (cause `EXPLOSION`) followed by that death's
`GRAVE_CREATED` or `BITTEN_UNIT_RISEN`.

`KABOOM` and `END_TURN` join `ATTACK` and `WAIL` in the list of commands after
which naval blockade and sea-network events are recomputed (an exploding
blockader lifts a blockade). Adding `END_TURN` (root decision, concern 8) also
reports blockades lifted by Plague deaths at Start Turn, which revision 16
lifted silently.

### 6.8 Kill credit, Plunder attribution, and friendly fire

Every death is **credited** to at most one player:

| Death cause                    | Credited player                  | Unit kill credit (promotion)       |
| ------------------------------ | -------------------------------- | ---------------------------------- |
| `ATTACK`                       | the attacker's owner             | the attacker (unchanged)           |
| `RETALIATION`                  | the retaliating defender's owner | the defender (unchanged)           |
| `SPLASH`                       | the attacker's owner             | the attacker, hostile victims only |
| `WAIL`                         | the Banshee's owner              | the Banshee (unchanged)            |
| `EXPLOSION`                    | the exploding unit's owner       | none (the exploding unit is dead)  |
| `KABOOM` (the exploder itself) | none                             | none                               |
| `PLAGUE`                       | none                             | none (unchanged)                   |

- A victim that rises (Infect or Bitten) still counts as killed.
- **Plunder:** when a death is credited to a player that has Plunder and the
  victim's owner is hostile to that player at the moment of death, that player
  gains 1 Coin ([section 7.4](#74-plunder)).
- **Friendly fire** is a hit by an explosion or a Bomb Chucker splash on a
  unit owned by the credited player or its ally (the exploding unit itself
  never counts). A friendly-fire death earns no Plunder and no promotion
  credit. Previews and telemetry report friendly-fire damage and deaths
  separately from hostile ones.

## 7. Other Goblin abilities

### 7.1 WAAAGH!

WAAAGH! is the Goblin name of Rally, with a wider reach. It reuses the command
`RALLY`, the activation flag `inspired` (labelled "WAAAGH!" for Goblin units),
and the event `UNITS_RALLIED`.

- An Orc Warboss in land form that has not used a primary action (it may have
  moved) makes every **other own land-form unit within Chebyshev distance 2**
  that has the `ATTACK` ability and is not already Inspired gain +1 Attack
  (+2 `attack2`) on its first accepted attack this turn. Unlike Rally, there
  is no `SUPPORT` or `SIEGE` exclusion: Rocket Carts, other Warbosses, and
  Trolls qualify.
- Everything else is the Inspired rule: it expires at End Turn, does not
  stack, never affects Kaboom, blasts, or Wail, and destroys Field Defense
  under the existing `INSPIRED` reason on a surviving range-1 attack.
- With no eligible target the command rejects with the existing
  `HEAL_TARGET_NOT_FOUND`. It uses the Warboss's primary action.
- The Warboss has no Tend Wounded (`TEND_WOUNDED` is rejected with
  `UNIT_ROLE_INVALID` and never offered).

### 7.2 Troll regeneration

At its owner's Start Turn, after Windmill healing and before income, every
Troll of that player on the board heals `min(4, maxHp − hp)`, in any form and
on any tile (own, neutral, or hostile territory). Troll regeneration is
separate from Windmill healing and idle recovery, which still apply. It cures
nothing. Event `UNITS_REGENERATED { playerId, results }`, with
`results: [{ unitId, amount, hpAfter }]` in unit-ID order listing Trolls with
`amount > 0`; no event when no Troll healed.

### 7.3 Ram

Ram is Overrun under a Goblin label: the Scrap Buggy advances after a kill and
may attack again while a visible hostile unit is adjacent. Its continuation is
evaluated after any chain its attack triggered
([section 6.7](#67-where-chains-run-and-event-order)).

### 7.4 Plunder

Plunder is the Goblin `COMMERCE` technology (Mobility, tier 3, requires Roads,
ordinary tier-3 cost). With it, the player gains **1 Coin for each hostile
unit killed by one of its units or its explosions** under the attribution of
[section 6.8](#68-kill-credit-plunder-attribution-and-friendly-fire): its
attacks (primary kills and bomb or Battleship splash), its units'
retaliation, and blasts of its own exploding units, including blasts of its
units that an enemy killed. It earns nothing for Plague deaths or for killing
own or allied units.

- Plunder Coins are added at the end of the command's (or Start Turn's)
  deaths, before the economy tail, with one
  `PLUNDER_AWARDED { playerId, kills, coins }` per credited player with at
  least one plundered kill, in player-ID order. Coins may arrive during
  another player's turn (retaliation, a blast of one's unit killed by an
  enemy).
- Coins and research are owner-private, so `PLUNDER_AWARDED` is projected
  only to its player and carries no victim IDs.

## 8. Interactions with existing rules

### 8.1 Undead rules

| Rule        | Interaction                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graves      | `KABOOM` and `EXPLOSION` deaths are qualifying combat deaths (land form, land tile, not a settlement site, no rising, no Grave yet), like `ATTACK`, `SPLASH`, `WAIL`, and `PLAGUE`. Graves still exist only in matches with an Undead seat.                                                                        |
| Raise Dead  | Graves left by explosions are ordinary Graves.                                                                                                                                                                                                                                                                     |
| Devour      | Unchanged.                                                                                                                                                                                                                                                                                                         |
| Infect      | Only a Zombie's attack or retaliation infects. Explosion and Kaboom deaths never infect. A Zombie that kills a Bomb Chucker infects it (the rising appears) and the Chucker's death blast then hits the Zombie and the rising.                                                                                     |
| Bitten      | Explosions are not Zombie damage and never bite. A Bitten land-form unit that dies from `KABOOM` or `EXPLOSION` rises as its biter's Zombie like any other qualifying death (so a Bitten Goblin that Kabooms leaves an enemy Zombie; the UI warns).                                                                |
| Plague      | A plagued exploding unit killed by Plague explodes at its owner's Start Turn ([section 6.7](#67-where-chains-run-and-event-order)). An explosion that kills a Lich ends every Plague that Lich caused (`PLAGUE_CLEARED`). Goblin units are living: Plague and bites affect them, and no Goblin unit can cure them. |
| Lifesteal   | Explosions are not combat exchanges: no heal from blasts. A Vampire hit by a blast loses HP normally.                                                                                                                                                                                                              |
| Wail        | Goblins are living Wail targets. Wail kills of exploding units set off death blasts.                                                                                                                                                                                                                               |
| Restless    | Not a Goblin rule.                                                                                                                                                                                                                                                                                                 |
| Frenzy      | Unchanged; Frenzy never affects blasts.                                                                                                                                                                                                                                                                            |
| Unanswered  | A Vampire's attack draws no retaliation, but a Bomb Chucker it kills still explodes and hits it.                                                                                                                                                                                                                   |
| Lich splash | Hostile-only as before; its kills of Goblin exploding units set off death blasts.                                                                                                                                                                                                                                  |

### 8.2 Human abilities

| Ability      | Interaction                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overrun, Ram | A Knight or Scrap Buggy that kills an exploding unit advances onto its tile and is then hit by its blast. Continuation is evaluated after the chain. |
| Push         | Push resolves before the chain; the pushed unit is hit or not according to its new position. Push never kills.                                       |
| Charge       | Unchanged; adds to Gang Up for Wolf Riders.                                                                                                          |
| Escape       | A Raider that survives the attack and the chain keeps its Escape Move. One that dies in the chain is gone.                                           |
| Rally        | Unchanged; Inspired never affects blasts.                                                                                                            |
| Tend Wounded | Unchanged (Human only). A Captain can heal blast damage on its own units.                                                                            |

### 8.3 Cities, villages, capture, and advance

- Blasts hit units on city and village centers, including hostile, own, and
  neutral-village occupants; Walls and fortification give no protection.
  Deaths on a center leave no Grave (existing rule).
- Blasts never capture, never move or advance a unit, and never change a
  city, territory, level, Walls, improvement, Road, resource, or Monument.
- A Kaboom by a unit besieging a city ends that siege (the occupant is gone).
  A blast that kills a city's besieger or a village's only occupant simply
  empties the center.
- Surviving blast victims keep their capture eligibility (damage alone never
  removes it, as today).
- Spoils, Land Grant, training, and city actions are unaffected.

### 8.4 Field Defense and Walls

- Every explosion destroys Field Defense on every tile of its blast area,
  whoever owns the tile (reason `EXPLOSION`). Bomb splash does not destroy
  Field Defense; the primary-target rules (`CATAPULT` for the Rocket Cart,
  `INSPIRED`, `EXPLOSIVES`, `OCCUPATION`) are unchanged.
- Walls are never damaged. Blast damage ignores the fortification they give.

### 8.5 Boats, embarked units, and water

- Blasts hit naval and embarked units in the blast area like any unit (the
  embarked Defense 1 is irrelevant to fixed damage).
- An exploding unit killed while embarked explodes on its water tile. Kaboom
  requires land form.
- Water, embarked, and naval deaths leave no Grave (existing rule). A killed
  blockader lifts its blockade (naval events after `KABOOM`, `ATTACK`,
  `WAIL`, and `END_TURN`).
- Goblin boats are Human boats ([section 3](#3-goblin-roster)).

### 8.6 Fog and observation

- Blasts reveal no tiles. Risings reveal their sight as usual.
- `EXPLOSION_RESOLVED` follows the Wail precedent: it is projected to a viewer
  that can see the exploding unit before or after the command (for an exploder
  that died, before), with `results` filtered to units the viewer owns or
  could see before the command. A viewer that cannot see the exploder but owns
  a victim receives `COMBAT_SPLASH_DAMAGE { splash }` with its own entries.
  `FIELD_DEFENSE_DESTROYED`, `UNIT_DIED`, `GRAVE_CREATED`, and
  `BITTEN_UNIT_RISEN` keep their ordinary projection rules.
- A chain can pass through cells the viewer has not explored. Public previews
  compute chains from the viewer's visible units only and report
  `touchesUnexplored: true` when any blast area of the previewed chain
  includes a cell the viewer has not explored (the viewer's own exploration,
  so the flag leaks nothing). A preview with `touchesUnexplored: false` equals
  the resolution exactly. The first blast of a Kaboom is always exact: every
  unit reveals at least radius 1 around itself, so its owner has explored the
  whole blast area.
- `PLUNDER_AWARDED` is owner-only; `UNITS_REGENERATED` is projected like
  `WINDMILL_HEALING_RESOLVED`.

### 8.7 Achievements, Monuments, and promotion

- No achievement counts kills (Explorer, Engineer, and Muster), so explosion
  kills affect achievements only by removing units. Muster counts the Goblin
  trainable roles (Goblin, Wolf Rider, Bomb Chucker, Orc Brute, Orc Warboss,
  Rocket Cart, Scrap Buggy, Patrol Boat, Battleship; the Troll is excluded
  like the Juggernaut).
- Monuments are never damaged by blasts.
- Promotion kill credit follows [section 6.8](#68-kill-credit-plunder-attribution-and-friendly-fire):
  explosions credit no unit, and friendly bomb-splash kills do not count.

### 8.8 Disband and capacity

- Disband never explodes, leaves no Grave, and refunds as listed in
  [section 3](#3-goblin-roster).
- A Kaboom or a blast death frees its home city's capacity slot immediately;
  the city can train again only with its city action still available.
- Warrens ([section 5.1](#51-horde-and-warrens)) apply to training, treasure
  placement, and the capacity preview; reward units may exceed capacity as
  today.

### 8.9 Starting units, rewards, and treasure

| Source                             | Human      | Undead      | Goblin                                |
| ---------------------------------- | ---------- | ----------- | ------------------------------------- |
| Starting units                     | Fighter    | Skeleton    | one Goblin ([section 2.2](#22-setup)) |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    | two Goblins                           |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination | Troll                                 |
| Treasure chest unit (`KNIGHT`)     | Knight     | Vampire     | Scrap Buggy                           |

- **Militia for Goblins:** the first Goblin appears on the city center with
  the ordinary reward-unit displacement of an existing occupant. The second
  then appears on the first adjacent land cell in `(y, x)` order that the
  ordinary displacement rule allows (enterable by the owner, no unit, no
  treasure, not allied territory); if none exists, it is not created (no
  substitute). Both are full-HP, exhausted, homed to the city, and may exceed
  capacity; each emits `UNIT_REWARD_GRANTED`. Reward IDs are unchanged.
- The treasure Scrap Buggy follows the treasure Knight rules (free capacity
  slot needed, 5-Coin fallback).

## 9. Commands, events, errors, and queries

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `KABOOM` immediately after
`WAIL`; it takes exactly `{ kind, unitId }`.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts:

- `UNITS_REGENERATED` immediately after `WINDMILL_HEALING_RESOLVED`:
  `{ playerId, results: [{ unitId, amount, hpAfter }] }`;
- `EXPLOSION_RESOLVED` immediately after `WAIL_RESOLVED`:
  `{ playerId, unitId, role, at, cause: "KABOOM" | "DEATH", wave, damage, results }`,
  where `playerId` owns the exploding unit, `at` is its death tile, `wave` is
  1-based, `damage` is the blast damage, and `results` uses the splash-entry
  shape `{ unitId, at, damage, dies }` sorted by `(y, x, unitId)` (possibly
  empty);
- `PLUNDER_AWARDED` immediately after `SPOILS_AWARDED`:
  `{ playerId, kills, coins }`.

`UNIT_DIED.cause` gains `KABOOM` and `EXPLOSION`. `FIELD_DEFENSE_DESTROYED.reason`
gains `EXPLOSION`. The Grave and Bitten-rising cause lists gain `KABOOM` and
`EXPLOSION`. The player event order inherits these positions.

**Combat preview.** `CombatPreviewV7` gains `gangUp` (0–2; 0 for every
non-Goblin or naval attacker). Bomb Chucker `splash` entries may name own and
allied units.

**Errors.** `RuleErrorCodeV7` gains `KABOOM_NOT_LEGAL` (reason `EMBARKED`).
Other Kaboom rejections reuse existing codes
([section 6.2](#62-kaboom)).

**Registration.** Faction `GOBLIN`, tree `GOBLIN_BASELINE_V1`, display name
"Goblin"; unlock kinds `WAAAGH_SUPPORT` and `PLUNDER { coins: 1 }`;
capability `plunderCoins`; abilities `KABOOM` and `REGENERATE`; faction rules
`cityCapacityBonus` (Warrens, 1) and `gangUpMaximum` (2); role mechanics for
blast damages, splash target mode, WAAAGH! radius, Field Defense building,
and regeneration amount. The internal field names are the implementer's
choice; the serialized literals of this section are normative.
`assertRuleset7Registry` must accept the third tree unchanged (same node IDs,
tiers, branches, and prerequisites).

**Public queries.**

- `queryPlayerCommandsV7` offers `KABOOM` exactly when legal (including with
  no unit in the blast area), never offers Goblin Field Defense or Warboss
  Tend Wounded, and offers WAAAGH! (`RALLY`) only with an eligible target.
- `previewKaboomV7(view, unitId)` returns null unless `KABOOM` is offered,
  otherwise `{ unitId, at, explosions, totals, friendlyFire, touchesUnexplored }`
  where `explosions` lists the previewed chain in resolution order, each
  `{ unitId, ownerId, role, at, cause, wave, damage, results, fieldDefenseDestroyed }`
  with `results` entries `{ unitId, ownerId, at, damage, dies, friendly }`;
  `totals` is `{ hostileDamage, hostileKills, friendlyDamage, friendlyKills, plunderCoins }`
  (friendly means own or allied, exploder excluded; `plunderCoins` is 0
  without Plunder); `friendlyFire` is `friendlyDamage > 0`.
- `previewAttackExplosionsV7(view, attackerId, targetUnitId)` returns the same
  chain shape (without the Kaboom unit) for the death blasts an attack would
  set off, or an empty chain; the UI and AI use it next to
  `queryCombatPreviewV7`.
- `queryCombatPreviewV7` and `estimateCombatV7` include Gang Up and friendly
  bomb splash. `queryThreatenedTilesV7` adds, for each visible hostile
  goblin-crewed unit, its Kaboom damage on every tile within Chebyshev 1 of a
  tile it can reach this turn, and includes Gang Up in melee estimates.
- `publicUnitStatsV7` exposes Kaboom and death-blast damage, the WAAAGH!
  radius, regeneration, and the Field Defense restriction from the owner's
  registration. `previewCityCapacityV7` includes Warrens. The technology tree
  query returns the viewer's technology names (Plunder for a Goblin viewer).
- `PublicPlayerV7` and the leaderboard carry `GOBLIN` and
  `GOBLIN_BASELINE_V1` for Goblin seats.

## 10. Normal AI requirements

Normal AI plays as and against Goblins (`pulp_wars-0ao.6`) with every
existing guarantee: deterministic and PRNG-free, only the public view, public
commands, and public previews (never hidden state), at most 128 accepted
commands per owner turn through bounded resumable work, and no change to
decisions in matches without a Goblin seat.

As Goblins it must at least:

- train from its own registration and value roles by their Goblin stats: the
  cheap Goblin horde early, Warrens capacity, Orc Brutes for city defense and
  Field Defense (Goblins cannot build it), Bomb Chuckers and Rocket Carts for
  ranged damage;
- **Gang Up:** order its attacks so helpers move next to a target before the
  attack, and prefer targets with more own units adjacent;
- **Kaboom** only when its previewed net value is positive: value of hostile
  damage and kills (by unit cost and remaining HP) plus Plunder, minus the
  value of friendly damage and kills and of the exploding unit itself, with
  an extra bonus for Kabooms that save a threatened city or enable a capture;
  prefer Kabooming units that are about to die anyway (visible lethal threat)
  and never Kaboom a Bitten unit next to its biter's units unless the value
  still wins;
- **spacing:** keep its exploding units (Bomb Chucker, Rocket Cart, Scrap
  Buggy) from ending turns next to each other or next to valuable own units
  when a visible enemy can kill them, and aim Bomb Chucker bombs by net value
  including friendly splash;
- value Plunder in research by its visible combat (hostile units near its
  cities and units) and count Plunder Coins in attack scoring;
- use WAAAGH! like Rally, when at least two units in radius 2 can attack this
  turn;
- let damaged Trolls keep fighting (regeneration) rather than retreat as early
  as a Juggernaut.

Against Goblins it must at least:

- avoid clumping next to visible Goblin exploding units and inside the Kaboom
  reach of visible goblin-crewed units (the threatened-tiles extension);
- account for death blasts when killing an exploding unit (prefer ranged
  kills or kills whose blast hits no own unit, using
  `previewAttackExplosionsV7`), and for Gang Up in threat evaluation;
- keep Normal's existing city-defense and capture priorities.

Opening research keeps the revision-16 scorer for every faction unless
`pulp_wars-0ao.6` records and tests a Goblin-specific change. Headless
Goblin-vs-Human, Goblin-vs-Undead, and Goblin-vs-Goblin matches must finish
without stalls or policy errors, and the tactical benchmark
([tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)) gains
Goblin scenarios (a net-positive Kaboom taken, a friendly-fire Kaboom
declined, a Gang Up ordering, an exploder not parked in a clump, an opponent
declining a melee kill whose blast would kill its own units).

## 11. UI requirements

### 11.1 Surfaces

The browser UI (`pulp_wars-0ao.5`) must, at requirement level:

- offer "Goblin" in every seat's faction select (default all Human);
- label every unit by its owner's faction, and render the technology tree
  (including the name Plunder), research offers, action chips, and Help in the
  viewer's faction text ([section 4](#4-technology));
- offer **Kaboom!** as a unit command for goblin-crewed land units, with a
  blast preview: the 3 × 3 area highlighted, per-unit damage and deaths,
  chained explosions with their areas and wave numbers, Field Defense lost, a
  friendly-fire warning when any own or allied unit is hit, the Plunder
  Coins, a warning when the unit is Bitten (it will rise for the enemy), and a
  fog note when `touchesUnexplored` is true;
- show Gang Up in the attack preview, the bomb splash area including own
  units in a warning style, and a death-blast warning when the target (or the
  attacker, if it may die) is an exploding unit;
- show explosion and Plunder feedback: an explosion animation hook on every
  projected `EXPLOSION_RESOLVED`, chain steps in wave order, log lines, and a
  Plunder toast for the owner;
- show WAAAGH! as the Warboss command and "WAAAGH!" as the status of Inspired
  Goblin units, Troll regeneration in unit info and the turn log, Warrens in
  the city capacity breakdown, and the Field Defense restriction as the
  unavailable reason on a Goblin; and
- look identical to revision 16 in matches without a Goblin seat, apart from
  the extra faction option.

### 11.2 Labels and text

| Surface                      | Text                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Faction option               | Goblin                                                                                                                   |
| Kaboom command               | Kaboom!                                                                                                                  |
| Kaboom tooltip               | Blow up: {damage} damage to every other unit in the 3×3 square, yours too. This unit dies.                               |
| Kaboom preview summary       | Hits {n} units: {h} enemy, {f} yours. Kills {k}.                                                                         |
| Chain line                   | Chain reaction: {unit} explodes ({damage} damage)                                                                        |
| Friendly-fire warning        | Friendly fire: {f} of your units hit, {x} killed                                                                         |
| Plunder preview and toast    | Plunder: +{coins} Coins                                                                                                  |
| Fog note                     | The blast may reach unexplored tiles                                                                                     |
| Bitten warning               | Bitten: this unit will rise as an enemy Zombie                                                                           |
| Unit info                    | Kaboom {n}; Explodes on death ({n}); Regenerates 4 HP each turn; Gang Up: +1 Attack per ally next to the target (max +2) |
| Attack preview (Gang Up)     | Gang Up +{n}                                                                                                             |
| Attack preview (death blast) | {unit} explodes on death: {damage} damage around it                                                                      |
| Bomb splash                  | Bomb splash hits your {unit}                                                                                             |
| WAAAGH! command and status   | WAAAGH!; "WAAAGH!: +1 Attack on the next attack"                                                                         |
| Log (Kaboom)                 | {owner} {unit} blew up: {n} hit, {k} killed                                                                              |
| Log (death blast)            | {owner} {unit} exploded: {n} hit, {k} killed                                                                             |
| Log (regeneration)           | {owner} Troll regenerated {amount} HP                                                                                    |
| City capacity                | +1 Warrens                                                                                                               |
| Field Defense unavailable    | Goblins cannot build Field Defense; use an Orc Brute                                                                     |
| Ram                          | Ram (the Overrun label for Scrap Buggies)                                                                                |

### 11.3 Help text

One sentence per rule, shown in Help for every viewer:

- **Horde:** Goblins cost 1 Coin, and every Goblin city holds one extra unit
  (Warrens).
- **Gang Up:** a Goblin unit gets +1 Attack for each other unit of yours next
  to its target, up to +2.
- **Kaboom:** any goblin-crewed unit can blow itself up, dealing its blast
  damage to every other unit in the 3×3 square around it, yours included.
- **Death blasts:** Bomb Chuckers, Rocket Carts, and Scrap Buggies explode
  when they die, however they die.
- **Chain reactions:** a blast that kills an exploding unit sets it off too.
- **Bombs:** a Bomb Chucker's bomb also hits every unit next to its target,
  yours included.
- **Plunder:** with Plunder you get 1 Coin for each enemy unit your units or
  blasts kill.
- **WAAAGH!:** the Orc Warboss gives every other unit of yours on land within
  2 tiles +1 Attack on its next attack this turn.
- **Trolls** heal 4 HP at the start of your turn, wherever they are.
- **Discipline:** only Orc Brutes can build Field Defense, and no Goblin unit
  can heal others.

### 11.4 Placeholder and final art

`pulp_wars-0ao.4` provides programmatic placeholder sprites for the eight
Goblin land units (Goblin, Wolf Rider, Bomb Chucker, Orc Brute, Orc Warboss,
Rocket Cart, Scrap Buggy, Troll) at the chibi unit-contract dimensions with
the owner mask, wired as the Goblin faction art in both art sets, plus a city
tint, following the Undead faction-art wiring. Goblin boats use the Human
boat art. `pulp_wars-0ao.8` replaces the placeholders with reviewed PixelLab
sprites after the roster is stable. The explosion animation hook of
[section 11.1](#111-surfaces) may be a code-native effect.

## 12. Unchanged Human and Undead behaviour

A match without a Goblin seat behaves identically to revision 16 apart from
identity. For equal setups, seeds, and command sequences it produces the same
maps, legal commands, previews, accepted and rejected commands, events, and
views. The only differences are the ruleset ID, the autosave key, the
obsolete-key list, the neutral combat-preview field `gangUp: 0`, and (from
`pulp_wars-0ao.3`) the `PORT_BLOCKADE_CHANGED` and `SEA_NETWORK_CHANGED`
events an `END_TURN` now emits when a Start Turn Plague death lifts a
blockade (events only; states and hashes are unchanged). No Kaboom
is offered, no explosion occurs, no Plunder is awarded, no Troll exists, and
Warrens never apply. Every rule the code keys on a mechanical role (for
example Field Defense on `FIGHTER`/`GUARD`, Rally targets, splash on
`BATTLESHIP` and the Lich) must resolve through the owner's registration with
the same Human and Undead results.

In mixed matches each unit applies its own registration: Human and Undead
units keep every ability against Goblins, and blasts hit them like any unit.

## 13. Implementation split and test expectations

Each bead proves its part with deterministic tests (new tests live in
`tests/unit/ruleset-v7-goblin-*.test.ts` unless noted).

| Bead              | Scope                                                                                                                                                              | Required evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulp_wars-0ao.2` | identity; registration; roster; starting units; substitutions; Warrens; Gang Up; Plunder (non-blast kills); WAAAGH!; Troll regeneration; Field Defense restriction | exact 7r17 identity, gap-free `PRIOR_RULESET_7_IDS` ending in 7r16, save key and obsolete-key cleanup through `v7r16`; faction and tree orders, binding, display name, mismatch rejection; registry assertion with three trees; faction-independent maps with Goblin seats (byte-identical boards, turn orders, treasures); every value of the section 3 table (cost, HP, `attack2`, `defense2`, Move, range, minimum range, Sight, attack after move, capture, abilities, tactical role, blast damages as registry values); two starting Goblins, the second's ring placement, IDs after every seat's first unit, and the no-cell case (one Goblin, no compensation); Militia two Goblins (placement, displacement, no-cell case), Troll reward, treasure Scrap Buggy; Warrens in own and captured cities and loss on capture; Gang Up 0/1/2/3 helpers → +0/+1/+2/+2, embarked and naval helpers count, allies and the attacker do not, no Gang Up on retaliation or for Goblin boats, stacking with Charge and WAAAGH!, `gangUp` and `attack2` in preview and event; Bomb Chucker minimum range and distance-2-only retaliation; Plunder only with Goblin `COMMERCE`, from attack, retaliation, and hostile splash kills, never for own or allied victims or Plague, `PLUNDER_AWARDED` owner-only projection; no Goblin land trade and unchanged Human Commerce; WAAAGH! radius-2 targets including `SIEGE`/`SUPPORT`, exclusions, no-target rejection, no Tend; Troll regeneration amount, cap, any tile and form, order after Windmill, event; Goblin Field Defense rejection and non-offer, Orc Brute allowed; Disband refunds including Goblin 0; Muster roles; per-viewer technology names and unlock text; save/replay/hash round-trip with Goblin seats; all-Human and Human/Undead parity with 7r16 apart from identity; refreshed release corpus with reviewed diff                                                                                                                                                                                                                                                   |
| `pulp_wars-0ao.3` | Kaboom; death blasts; chains; bomb friendly-fire splash; blast Plunder; Undead interactions; events; previews                                                      | Kaboom legality (land form, ability, unused primary, after a Move including the Rocket Cart, no target needed) and each atomic rejection (`UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`, `KABOOM_NOT_LEGAL` `EMBARKED`); blast area and clipping at board edges; fixed damage ignoring Defense, cover, fortification, Walls, and embarked Defense; hits own, allied, hostile, hidden, naval, and embarked units, never the exploder; death blasts for each cause of section 6.3 and none for Disband, displacement, elimination, or a Kaboom exploder; Goblins and Wolf Riders never death-blast; wave order, ID order within a wave, sequential current-HP resolution, a unit killed earlier in a wave not hit again, a long constructed chain (for example ten Rocket Carts in a row) resolving fully, the explosion-count assertion; Field Defense destruction on all nine tiles with reason `EXPLOSION`; melee kill of an exploding unit with advance (attacker hit on the center), Overrun/Ram continuation after the chain, Push before the chain, an Infect rising on the center hit; Graves for `KABOOM` and `EXPLOSION` deaths (none on sites, water, or without an Undead seat), Bitten risings from both causes, no Infect or bite from blasts, `PLAGUE_CLEARED` when a blast kills a Lich, Plague-killed exploders exploding at Start Turn before Windmill healing; bomb splash hitting own and allied units, friendly kills without promotion or Plunder; blast Plunder credited to the exploder's owner, including blasts of units an enemy killed; event order of section 6.7; naval blockade events after `KABOOM`; `END_TURN` added to the naval blockade recompute list, with a regression test that a blockader killed at the next seat's Start Turn (by Plague, and by a Plague-started chain) emits `PORT_BLOCKADE_CHANGED` in that `END_TURN`; `previewKaboomV7` and `previewAttackExplosionsV7` equal resolution when `touchesUnexplored` is false, never list hidden units, and set the flag correctly; `EXPLOSION_RESOLVED` projection and hidden-source `COMBAT_SPLASH_DAMAGE`; determinism across replays |
| `pulp_wars-0ao.4` | placeholder art                                                                                                                                                    | section 11.4; generator reproducible; every Goblin unit renders in both art sets; root visual review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pulp_wars-0ao.5` | UI                                                                                                                                                                 | section 11 surfaces and text; Kaboom preview including friendly fire, chains, Plunder, Bitten warning, and fog note; Gang Up and death-blast lines in the attack preview; explosion and Plunder feedback; start and finish a match as and against Goblins in the browser; screens of matches without a Goblin seat unchanged; smoke probe for a Goblin match                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pulp_wars-0ao.6` | Normal AI                                                                                                                                                          | section 10 behaviours with `tests/unit/ruleset-v7-goblin-ai*.test.ts` scenarios (net-positive Kaboom taken, friendly-fire Kaboom declined, Gang Up ordering, exploder spacing, opponent avoiding a self-damaging kill and clumps near exploders); determinism and command bounds; headless GH, HG, GU, UG, and GG matches complete without stalls or policy errors; pinned decision hashes of matches without a Goblin seat unchanged; tactical benchmark Goblin scenarios                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pulp_wars-0ao.7` | balance                                                                                                                                                            | the matrix and telemetry of section 14.2, the targets of section 14.3, any tuning inside section 14.1 with the contract, code, and tests changed together, and a written report                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pulp_wars-0ao.8` | final art                                                                                                                                                          | Goblin faction art fragment, PixelLab sprites for the eight units after a reviewed sample of three, an art review command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pulp_wars-0ao.9` | release fold                                                                                                                                                       | this overlay folded into [current rules](RULESET_7_CURRENT.md) for three factions (including a Goblin faction-rules section and revision-history row), release documents updated, browser smoke covers a Goblin match, full release gates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

`pulp_wars-0ao.2` changes the identity and therefore refreshes the release
corpus (`npm run validate:ruleset7-release` with its reviewed refresh). Between
`0ao.2` and `0ao.3`, Goblin seats are playable headlessly without Kaboom,
death blasts, or bomb friendly fire (the Bomb Chucker attacks without splash);
no UI offers the faction until `0ao.5`.

## 14. Tuning bounds and balance acceptance

### 14.1 Tuning bounds

`pulp_wars-0ao.7` may move these numbers within the listed bounds without root
approval, changing this contract, the code, and the tests together and
justifying each change in its report. Anything outside them, any Human or
Undead number, and any mechanic change (which units can Kaboom or explode,
friendly fire, blast area, chain rules, Plunder attribution, Gang Up helper
definition) needs root approval.

| Parameter                                  | Contract value | Bounds                            |
| ------------------------------------------ | -------------- | --------------------------------- |
| Goblin cost                                | 1              | fixed                             |
| Goblin HP / Attack / Defense               | 6 / 2 / 1      | 5–8 / 1.5–2.5 / 0.5–1.5           |
| Other trainable Goblin roles: cost         | section 3      | ±1 each                           |
| Other Goblin roles: HP                     | section 3      | ±2 each                           |
| Other Goblin roles: Attack, Defense        | section 3      | ±0.5 each                         |
| Troll Defense / regeneration               | 3 / 4          | 2.5–4 / 2–6                       |
| Kaboom damage: Goblin, Wolf Rider          | 4, 4           | 3–5 each                          |
| Kaboom damage: Bomb Chucker                | 4              | 3–5                               |
| Death blast: Bomb Chucker                  | 3              | 2–4                               |
| Kaboom and death blast: Rocket Cart, Buggy | 5, 5           | 4–6 each                          |
| Gang Up maximum                            | +2             | +1 or +2 (+1 per helper is fixed) |
| Warrens                                    | +1             | +1 or +2                          |
| WAAAGH! radius                             | 2              | 1 or 2                            |
| Starting Goblins / Militia Goblins         | 2 / 2          | 1–2 / 1–3                         |
| Plunder Coins per kill                     | 1              | fixed                             |

### 14.2 Measurement

Extend the headless balance matrix
([Undead balance report](../validation/RULESET_7_UNDEAD_BALANCE.md#2-reproduction))
with Goblin pairings: 1v1 `GH`, `HG`, `GU`, `UG`, and `GG` on the same maps,
sizes (11 and 14), seeds (0–29 per cell), and caps (150 rounds, 30,000
commands, 128 commands per turn) as `HU`, `UH`, `UU`, and `HH`, which are
re-run in the same matrix as the baseline; plus four-seat mixes on 16 × 16
containing all three factions. Goblin telemetry per game and seat: Kabooms,
explosions by cause and wave, the longest chain, blast damage and kills by
victim side (hostile, own, allied), bomb-splash friendly damage and kills,
Plunder Coins, Gang Up bonus distribution, WAAAGH! uses, Troll regeneration,
over-capacity, and turns that hit the 128-command cap.

### 14.3 Balance acceptance (from the brief)

- Goblin win rate in decided mixed games (`GH` + `HG`, and separately `GU` +
  `UG`) within 40–60%.
- The round-cap rate of each Goblin pairing no more than 3 percentage points
  above the same run's cap rate of the non-Goblin 1v1 pairings.
- Kaboom is used by Normal AI in natural play (at least one Kaboom in at least
  half of Goblin seat-games) and is net-positive in aggregate: hostile damage
  from Kaboom-started chains exceeds friendly damage from them (exploders
  excluded).
- Friendly-fire deaths are under 35% of all deaths caused by Goblin
  explosions (cause `EXPLOSION` credited to a Goblin seat). Bomb-splash
  friendly deaths are reported separately against the same threshold as a
  watch item.
- No stalls, policy errors, or exceptions, and the non-Goblin pairings have
  byte-identical final state hashes to a pre-Goblin run of the same seeds
  (apart from identity-derived hashes, which the report explains).

If the gameplay fails these, `0ao.7` iterates within section 14.1 and asks the
root before going outside it.

### 14.4 Tuning record (`pulp_wars-0ao.7`)

The contract values above failed section 14.3: Goblins won 72% of decided
games against Humans and 66% against Undead. `0ao.7` moved these numbers,
all inside the section 14.1 bounds, and changed the Goblin-only Normal AI
(below); every other number keeps its contract value. Evidence, the
iterations, and every target are in the
[Goblin balance report](../validation/RULESET_7_GOBLIN_BALANCE.md).

| Parameter                   | Contract |   Tuned | Why                                                                           |
| --------------------------- | -------: | ------: | ----------------------------------------------------------------------------- |
| Starting Goblins            |        2 |       1 | the largest single win-rate lever (about −10 points against each faction)     |
| Militia Goblins             |        2 |       2 | kept: the horde reward (now a separate constant, `MILITIA_FIGHTERS_V7`)       |
| Goblin Attack (`attack2`)   |    2 (4) | 1.5 (3) | weaker horde attacks; Gang Up still makes ganged attacks count                |
| Goblin Defense (`defense2`) |    1 (2) | 0.5 (1) | offsets the Kaboom rise; the horde is fragile                                 |
| Goblin Kaboom               |        4 |       5 | Kabooms kill: hostile blast kills more than double, friendly-fire share drops |
| Bomb Chucker death blast    |        3 |       2 | fewer own units killed when enemies kill the exploder                         |
| Rocket Cart death blast     |        5 |       4 | as above                                                                      |
| Scrap Buggy death blast     |        5 |       4 | as above                                                                      |

The Normal AI changes are Goblin-seat only and leave every match without a
Goblin seat byte-identical: a Bomb Chucker training bias (the policy never
trained one), Kabooms weigh own and allied losses at the bomb friendly-fire
trade factor (2), and exploder spacing applies whenever a visible enemy can
damage the exploding unit (it applied only when one could kill it); see
[Normal AI](../architecture/NORMAL_AI.md#revision-17-goblin-play-pulp_wars-0ao6).

Measured on the full section 14.2 matrix after tuning: Goblin win 56.9%
against Humans and 49.7% against Undead; worst Goblin cap rate 0 points
above the non-Goblin reference; Kaboom used in 67.7% of Goblin seat-games
with hostile chain damage 12 times the friendly; 25.2% of Goblin explosion
deaths were friendly fire; no errors, stalls, or exceptions; and the 1,200
non-Goblin games have byte-identical final hashes to the untuned tree.
Concerns 4–6 of [section 16](#16-concerns-and-root-decisions) are answered
there.

## 15. Decisions made in this spec

1. **Two starting Goblins,** second on the first open ring cell, allocated
   after every seat's first unit, one Goblin with no compensation when no
   ring cell is open (root decision): the horde is visible from
   turn 1 and costs about the same as one Fighter; ID allocation keeps
   `originalCapitalCityId` and all other seats' IDs unchanged.
2. **Militia gives two Goblins:** the same value as one Fighter (2 Coins) with
   horde flavour; the second uses the existing displacement predicate.
3. **Faction display name "Goblin"** (singular, matching "Human").
4. **Plunder keeps the `COMMERCE` ID** with a Goblin display name: the
   registry requires identical technology IDs per tree, and serialized IDs
   stay faction-neutral (the revision-13 precedent).
5. **Plunder attribution** by the credited player of each death (attacker,
   retaliating defender, splash attacker, Banshee owner, or exploder owner);
   none for Plague or the Kaboom exploder: "whoever's unit or blast killed it
   gets paid" is one sentence, and it rewards blasts of Goblin units an enemy
   killed.
6. **`PLUNDER_AWARDED` is owner-only and has no victim IDs,** because Coins
   and research are owner-private and hidden victims must not leak.
7. **Blast area is the 3 × 3 square including the center tile:** "death
   first, then the bang" lets the ordinary attack resolve unchanged and the
   chain run afterwards, while a melee attacker that advances onto the
   exploder's tile is still hit; the cost is that a rising on that tile is hit
   too (concern 3).
8. **Waves resolve explosion by explosion in unit-ID order against current
   HP** (not summed): each event entry has an exact damage and death, and a
   unit killed once is not hit again.
9. **Kaboom needs no target** and is allowed after any Move (including the
   Rocket Cart): destroying Field Defense or lifting a blockade is a real use,
   and "Kaboom any time you have not acted" is simpler.
10. **Kaboom only in land form;** an embarked exploding unit still death-blasts
    when killed at sea ("any cause, anywhere").
11. **Kaboom and blast deaths leave Graves and Bitten risings** like every
    other violent death, so Undead benefit from Goblin blasts next to them.
12. **Explosions give no unit kill credit** (the exploder is dead); bomb
    splash kills of own or allied units never count for promotion.
13. **Gang Up counts own units only** (not allies), of any form, and applies
    to every Goblin land attack including ranged ones and Ram continuations,
    never to retaliation or Goblin boats (boats are Human-identical, U5).
14. **WAAAGH! reaches radius 2 and includes `SUPPORT` and `SIEGE` roles**
    (Rocket Carts, other Warbosses, Trolls) but keeps the `ATTACK` and
    not-already-Inspired requirements and excludes the Warboss itself: "every
    other unit of yours on land within 2 tiles".
15. **Troll regeneration** runs after Windmill healing at Start Turn, in any
    form and any territory, with its own `UNITS_REGENERATED` event.
16. **Warrens follow the current owner** of the city (captured cities gain or
    lose it), like the capital income bonus follows the city.
17. **Blasts destroy Field Defense on all nine tiles** whoever owns them;
    bomb splash does not destroy Field Defense.
18. **Plague-killed exploding units explode after the Plague step** of their
    owner's Start Turn, before Windmill healing and income, so Plunder Coins
    from that chain count in the same turn.
19. **Names:** command `KABOOM`; events `EXPLOSION_RESOLVED`,
    `PLUNDER_AWARDED`, `UNITS_REGENERATED`; causes `KABOOM`, `EXPLOSION`;
    reason `EXPLOSION`; error `KABOOM_NOT_LEGAL`; previews `previewKaboomV7`,
    `previewAttackExplosionsV7`; unlock kinds `WAAAGH_SUPPORT`, `PLUNDER`;
    abilities `KABOOM`, `REGENERATE`; insertion positions in section 9.
20. **Previews are fog-honest:** chains are computed from visible units with a
    `touchesUnexplored` flag instead of a guarantee, following the splash
    precedent.
21. **Goblin units are "living"** (Wail, Plague, Bitten apply), which follows
    from the revision-13 definition.

## 16. Concerns and root decisions

1. **Kill-based achievements do not exist.** The brief asks for
   "achievements/Monuments counting explosion kills as kills", but Explorer,
   Engineer, and Muster count no kills; only Promotion does, and an explosion
   has no surviving unit to credit. **Decided (root):** explosion kills count
   only for Plunder (the player); there is no new kill-based effect.
2. **Plunder is a label and unlock swap, not a new technology ID**
   ([decision 4](#15-decisions-made-in-this-spec)). Technology names are today
   derived from the ID in the UI, so per-faction technology names are new UI
   work in `0ao.5`, and three raw `"COMMERCE"` checks must move to
   capabilities in `0ao.2`.
3. **Risings on the exploder's tile are hit by its blast** (decision 7): a
   Zombie that Infects a Bomb Chucker, or a Bitten exploder's own rising,
   takes the blast. The faithful alternative (blasts hit only the eight
   neighbours, and the chain resolves before advance, Graves, and risings)
   needs `applyAttack` restructured and makes melee kills of exploders dodge
   the blast by advancing unless the advance is also moved after the chain.
   The 3 × 3 rule is simpler to implement and explain; the edge case is rare.
   **Watch item (root):** the 3 × 3 rule is kept.
4. **Kaboom may be too efficient.** A 1-Coin Goblin deals 4 fixed damage to up
   to eight units, ignoring Walls and Defense; a steady stream of Goblins
   from every city is a cheap siege weapon. Friendly fire and the unit's
   death are the costs. `0ao.7` should watch Kabooms per game and Coins per
   kill; the bounds allow Goblin Kaboom 3 and Gang Up +1. **Watch item
   (root)** for `0ao.7`.
5. **Gang Up +2 on cheap units is strong** (a Goblin with two helpers attacks
   at 4, Juggernaut level, and kills a full-HP Fighter), and Gang Up and bomb
   splash deliberately work against each other (helpers next to the target
   are splashed). Both are intended tensions; `0ao.7` should measure.
   **Watch item (root).**
6. **Two starting Goblins** give an early exploration and village-capture
   edge. The bounds allow 1. **Watch item (root)** for `0ao.7`.
7. **AI command cap.** Warrens and 1-Coin units raise unit counts; late Goblin
   turns may reach the 128-command cap. `0ao.6` and `0ao.7` should report cap
   hits; the cap itself is not changed by this spec. **Watch item (root).**
8. **Start Turn blast side effects:** a Plague-killed exploding unit damages
   other players' units during its owner's Start Turn, before that player
   acts. This is faithful to "explodes on death by any cause" and is shown in
   the turn log. Pre-existing: naval blockade events are not recomputed after
   `END_TURN`, so a blockader killed at Start Turn (by Plague today, or by a
   chain) lifts its blockade silently until the next recomputing command.
   **Decided (root):** approved. `0ao.3` adds `END_TURN` to the naval
   blockade recompute list, which also fixes the existing Plague case, and
   covers it with a regression test
   ([section 13](#13-implementation-split-and-test-expectations)).
9. **Bitten Kaboom gifts the enemy a Zombie** (decision 11). Consistent and
   warned in the UI, but it may surprise players; the alternative (Kaboom
   deaths never rise) adds an exception. **Watch item (root):** the
   Bitten-Kaboom rising is kept.

**Root decisions (2026-09-30):** (1) a Goblin seat with no open ring cell
starts with one Goblin and no compensation
([section 2.2](#22-setup)); (2) explosion kills count only for Plunder, with
no new kill-based effect (concern 1); (3) `0ao.3` adds `END_TURN` to the naval
blockade recompute list with a regression test (concern 8); (4) concerns 3–7
and 9 are accepted as watch items, keeping the 3 × 3 blast rule and the
Bitten-Kaboom rising.
