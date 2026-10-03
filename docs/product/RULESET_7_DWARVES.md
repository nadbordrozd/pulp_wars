# Ruleset 7: Steampunk Dwarf faction

**Status:** **folded into [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(kept as history)** by `pulp_wars-78i.8` at `pulp-wars-poc-7r31`: the
current rules describe the running seven-faction game, with the Dwarves in
their [section 22](RULESET_7_CURRENT.md#22-dwarf-faction-rules), and win
wherever this document differs; the fold's corrections of this text are
listed in their
[known discrepancies](RULESET_7_CURRENT.md#24-known-discrepancies).
Contract (`pulp_wars-78i.2`); **the engine is implemented**
(`pulp_wars-78i.3`, identity `pulp-wars-poc-7r30`: every rule, command, event,
query, and state shape of this document) and **the UI is implemented**
(`pulp_wars-78i.6`: the browser setup offers the faction, with the production
art wired in). What the engine implementation changed or made precise is
in [section 22](#22-implementation-notes-pulp_wars-78i3), the UI's in
[section 23](#23-ui-implementation-notes-pulp_wars-78i6). **The Normal AI is
implemented** (`pulp_wars-78i.4`,
[section 15.1](#151-implementation-status-pulp_wars-78i4)). **Coarse
balance is done** (`pulp_wars-78i.7`, identity `pulp-wars-poc-7r31`: the
bomb deals 5, 6 with Dive; [section 19.5](#195-tuning-record) and the
[Dwarf balance report](../validation/RULESET_7_DWARF_BALANCE.md)). The
engine (`pulp_wars-78i.3`), the Normal AI (`pulp_wars-78i.4`), the art
(`pulp_wars-78i.5`), the UI (`pulp_wars-78i.6`), and the coarse balance
(`pulp_wars-78i.7`) follow it; `pulp_wars-78i.8` folds it into
[Ruleset 7: current rules](RULESET_7_CURRENT.md). It is an overlay over the
rules in force when `pulp_wars-78i.3` starts: today that is the
[Rift overlay](RULESET_7_RIFT.md) (`pulp-wars-poc-7r28`, folded), over the
[Ice Folk overlay](RULESET_7_ICE_FOLK.md) (`pulp-wars-poc-7r24` to `7r27`, not
yet folded), over [Ruleset 7: current rules](RULESET_7_CURRENT.md) (five
factions, with the Martians in its section 20), plus the one-faction-per-player
rule of `pulp_wars-w5j.1` (`pulp-wars-poc-7r29`), which lands before the
Dwarf engine ([section 13.14](#1314-one-faction-per-player)).

**Ruleset ID:** the next free `pulp-wars-poc-7rNN` when `pulp_wars-78i.3`
starts (after `7r29`, the one-faction-per-player identity). Other beads may
take identities first, so this document names no number: **`7rNN` and `v7rNN` stand
for that identity everywhere below, and "the previous identity" for the one
current just before it.** The engine bead took `pulp-wars-poc-7r30`
(autosave `pulpWars.save.v7r30.current`; the previous identity is `7r29`);
the coarse balance (`pulp_wars-78i.7`) took `pulp-wars-poc-7r31` (autosave
`pulpWars.save.v7r31.current`).

**Map-generation revision:** unchanged by this revision. Faction choice never
affects generation.

**Scope:** a seventh playable faction, `DWARF` (displayed "Dwarf"; the
faction is the Steampunk Dwarves). The overlay changes only identity, faction
registration, setup, the Dwarf roster, the Dwarf rules (Tunnel, the mound,
the ride and the eruption; Gyrocopter flight and the bombing run; clockwork
constructs; Dig In; the Engineer's Repair and Assemble; Knockback; Plated),
two Dwarf technology effects, the substitutions for the starting unit,
rewards, and treasure, and the commands, events, queries, UI, and Normal AI
needed to play them. Every unmentioned rule stays in force for every faction.
Rulesets 5 and 6 and historical Ruleset 7 fixtures remain frozen.

**Identity of the faction:** Humans are sustain, Undead are attrition,
Goblins are a reckless horde, Dinosaurs are few and growing, Martians are a
small high-tech invasion force, the Ice Folk are the things from the peaks,
and the Dwarves are **heavy, slow, and built to last; they come from above
and below**. Hammer dwarves hold their cities dug in; Gyrocopters fly over the
enemy line and drop a bomb on whoever stands behind it; Steam Moles drill
under the line, carrying a hammer dwarf, and burst out of the ground next to
the soft back line; Engineers wind up clockwork Gunners at the front and keep
the machines patched; and a clockwork Titan hits just as hard at the end of a
fight as at the start. They are strong at home, against a soft back line, and
wherever a visible two-turn blow lands. They are slow to expand, weak against
Shields and units that step away from a mound, exposed on the turn after
every surfacing, and they lose their clockwork for good if the Engineers die.
Economy, the technology graph, map rules, and the boats' rules are the Human
ones (the boats look Dwarf). Every Dwarf rule is visible on the board and
fits in one sentence ([section 16.3](#163-help-text)).

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. Sources and decided direction

The user's direction of 2026-10-03 (epic `pulp_wars-78i`): "now execute one
more faction - steampunk dwarves. they have a dwarf with an axe or hammer but
they also have flying gyrocopters and machines that can tunnel under the
terrain and they can have 1 or two fully mechanical units. figure out the
esthetics, the units, the mechanics. iterate on it and execute up to and
including generating assets and merging into main."

| #   | User requirement or standing lesson                                                                                               | Where                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| U1  | A dwarf warrior with an axe or hammer.                                                                                            | the Hammerer ([section 3](#3-dwarf-roster))                                                          |
| U2  | Flying gyrocopters.                                                                                                               | [section 6](#6-gyrocopters-and-the-bombing-run)                                                      |
| U3  | Machines that tunnel under the terrain.                                                                                           | the Steam Mole ([section 5](#5-tunnels-the-mound-and-the-eruption))                                  |
| U4  | One or two fully mechanical units (no dwarf inside).                                                                              | the Clockwork Gunner and the Brass Titan ([section 7](#7-clockwork))                                 |
| U5  | Unique mechanics and useful abilities, each readable on the board in one sentence, and a memorable "wow" event.                   | [sections 5](#5-tunnels-the-mound-and-the-eruption) to [10](#10-steam-cannon-steam-tank-brass-titan) |
| U6  | Each unit is thought through in battle **before** implementation.                                                                 | [section 12](#12-per-unit-battle-analysis)                                                           |
| U7  | No "attack from hiding": a burrowed machine is visible to everyone.                                                               | [section 5.3](#53-the-mound-visible-and-untouchable)                                                 |
| U8  | No hard locks; every penalty can be played through.                                                                               | [sections 5.3](#53-the-mound-visible-and-untouchable), [8](#8-dig-in)                                |
| U9  | Balance is tested coarsely on Dry Land only; the identity is complete without water.                                              | [section 19](#19-headless-support-measurement-tuning-bounds-and-balance-acceptance)                  |
| U10 | The same eight roles and the same technology graph; no dead technology.                                                           | [section 4](#4-technology)                                                                           |
| U11 | The Normal AI plays it with simple rules, and a change to AI strategy comes with a modest head-to-head test.                      | [section 15](#15-normal-ai-requirements)                                                             |
| U12 | Every player plays a different faction, and faction looks identify the owner without coloured base plates (epic `pulp_wars-w5j`). | [sections 13.14](#1314-one-faction-per-player) and [16.4](#164-what-the-art-bead-must-draw)          |

The design went through two drafts and two critiques (`pulp_wars-78i.1`).
**The root's final decisions** (the notes of `pulp_wars-78i.2`, 2026-10-03)
are authoritative; they adopt the second draft amended by all eight
paste-ready changes of the second critique. This document turns them into
exact rules, checks every unit with the engine formula, and lists every place
where it had to decide something the decisions left open
([section 20](#20-decisions-made-in-this-spec)).

| #   | Root decision (summary)                                                                                                                                                                                                                                                    | Where                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D1  | Gyrocopter: a flat bomb of 4 (5 with Raiding's Dive); nothing else changes it; never answered; at most one bomb per enemy unit per turn; it lands beyond the target. Distinct from the Martian Saucer.                                                                     | [section 6](#6-gyrocopters-and-the-bombing-run)                                     |
| D2  | Clockwork (Gunner, Titan): full strength on attack only. Design-v2 immunities. Gunner cost 3; one shot after moving, two if it stood still; a Gunner that has fired cannot move.                                                                                           | [section 7](#7-clockwork)                                                           |
| D3  | No Grudge. The Hammerer rides the tunnel with an adjacent Mole, and Digs In. Dig In only on an own city center and the eight tiles around it, computed from the `moved` flag.                                                                                              | [sections 5.5](#55-the-rider) and [8](#8-dig-in)                                    |
| D4  | The burrowed Mole and rider leave the board for a `burrowed` list behind one accessor, with a reader-classification test. Surfacing after the activation reset. `TUNNEL` takes `to` only. Eruption 2 (3). A rider may not enter a settlement center on its surfacing turn. | [section 5](#5-tunnels-the-mound-and-the-eruption)                                  |
| D5  | Engineer: Repair (machines 4, others 2); Assemble a Gunner next to it for 4 Coins with a home-city slot (5 is the lever); no Rally.                                                                                                                                        | [section 9](#9-engineer-repair-and-assemble)                                        |
| D6  | Steam Cannon (Knockback), Steam Tank (no hit takes more than 4 HP; no Overrun), Brass Titan as in the second draft.                                                                                                                                                        | [section 10](#10-steam-cannon-steam-tank-brass-titan)                               |
| D7  | Technologies as in the second draft: Fortification is Dig In, Explosives is Blasting Charges; no dead purchase.                                                                                                                                                            | [section 4](#4-technology)                                                          |
| D8  | The look: soot-black iron with a light rim, copper, dark leather, white steam, ginger-copper beards (about `#c8642a`); no other accent unless the 32 px lineup fails a pair (then the signal-green lamp).                                                                  | [section 16.4](#164-what-the-art-bead-must-draw)                                    |
| D9  | Watch items: Martians (likely worst pairing), Dinosaurs (likely best), Dig In round caps, the rider village race (scripted probe), Assemble at the front.                                                                                                                  | [section 19](#19-headless-support-measurement-tuning-bounds-and-balance-acceptance) |

## 2. Identity, factions, and compatibility

### 2.1 Identity

| Boundary                                   | Dwarf revision                                                                                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7rNN`                                                                                                                                                                                        |
| Game-state schema                          | `7`                                                                                                                                                                                                         |
| Command/event/save/replay numeric versions | `7`                                                                                                                                                                                                         |
| Browser autosave                           | `pulpWars.save.v7rNN.current`                                                                                                                                                                               |
| Map revision                               | unchanged by this revision                                                                                                                                                                                  |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`, `DWARF`                                                                                                                                  |
| Frozen `FactionTreeId` order               | the six existing trees, then `DWARF_BASELINE_V1`                                                                                                                                                            |
| Faction to tree binding                    | the six existing bindings, plus `DWARF` → `DWARF_BASELINE_V1`                                                                                                                                               |
| Display names                              | the six existing names, plus `DWARF` is "Dwarf"                                                                                                                                                             |
| `COMMAND_KIND_ORDER_V7`                    | three more kinds than the previous identity: `TUNNEL`, `BOMB_RUN`, `ASSEMBLE`, inserted in that order immediately after `COLD_SNAP`                                                                         |
| `DOMAIN_EVENT_KIND_ORDER_V7`               | four more kinds: `UNIT_ASSEMBLED` immediately after `UNIT_TRAINED`; `UNIT_TUNNELLED` and `UNIT_SURFACED`, in that order, immediately after `UNIT_PULLED`; `UNIT_BOMBED` immediately after `COMBAT_RESOLVED` |

- The previous identity is appended to `PRIOR_RULESET_7_IDS` (the list stays
  gap-free). A reader of this revision rejects it and every earlier Ruleset 7
  identity in setups, states, saves, replays, and release artifacts; there is
  no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through the previous identity's key, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-78i.3`, which also fixes every
  serialized **shape** of this revision and implements every rule.
  `pulp_wars-78i.4` (AI), `78i.6` (UI), and `78i.7` (coarse balance) change
  behaviour and numbers under the same identity.
- **Shape changes** (all with neutral values in a match without a Dwarf
  seat):
  - `GameStateV7` gains three lists: `burrowed`
    ([section 5.2](#52-burrowed-units-state-and-the-one-accessor)),
    `surfacedThisTurn` ([section 5.4](#54-surfacing-and-the-eruption)), and
    `bombedThisTurn` ([section 6.3](#63-the-bomb)). **They are the only new
    stored state.** Dig In is derived from the existing `moved` flag
    ([section 8](#8-dig-in));
  - `PlayerViewV7` gains `burrowed` (the mounds on explored tiles),
    `surfacedThisTurn`, and `bombedThisTurn` (visible units only);
  - three commands, four events, two `UNIT_DIED` causes (`BOMB`,
    `ERUPTION`), one `FIELD_DEFENSE_DESTROYED` reason (`UNDERMINED`), one
    movement failure and interruption reason (`MOUND`), three error codes,
    three combat-preview fields, and the `dwarf` block of the public unit
    stats ([section 14](#14-commands-events-errors-state-and-queries));
  - five technology unlock kinds (`ENGINEER_SUPPORT`, `ASSEMBLE`, `DIVE`,
    `DIG_IN`, `BLASTING_CHARGES`) and ten ability literals
    ([section 14](#14-commands-events-errors-state-and-queries)).
- No unit key and no activation key is added. A burrowed unit keeps its
  ordinary `UnitStateV7` record inside the `burrowed` list.

### 2.2 Setup

- `MatchSetupV7.factions` is a dense per-seat array; each entry is one of the
  seven factions. Under the one-faction-per-player rule of `pulp_wars-w5j.1`
  no two seats share a faction (`DUPLICATE_FACTION`, except with the
  test-only `allowDuplicateFactions` option;
  [section 13.14](#1314-one-faction-per-player)).
- Faction choice still never affects map generation, capital placement, turn
  order, treasure placement, or any PRNG draw: setups that differ only in
  `factions` generate byte-identical boards, turn orders, and treasures.
- **Starting units.** A Dwarf seat starts with one Hammerer (the `FIGHTER`
  role) on its capital at full HP, 5 Coins, and no technology, exactly like
  every other seat (`STARTING_FIGHTERS_V7` is 1). The starting Hammerer has
  the fresh setup activation, so it is dug in on its capital center from the
  first enemy turn if it does not move ([section 8](#8-dig-in)); Dig In needs
  Fortification, so in practice from the turn the seat researches it.
- The headless tools accept `dwarf` in `--factions` (seat-ordered, next to
  `original`/`human`, `undead`, `goblin`, `dinosaur`, `martian`, and `ice`)
  and the pairing letter **`W`** (`D` is the Dinosaur's).

### 2.3 Faction model

This revision follows the revision-13 model: the frozen mechanical role order
is unchanged, state and events serialize the mechanical role, and every rule,
view, preview, UI surface, and AI decision resolves a unit through its
**owner's** registration with no cross-faction fallback.

- **A Dwarf unit** is a unit owned by a seat whose faction is `DWARF`. The
  Dwarf rules apply to the **land roles in land form** only: never to a Dwarf
  boat, and never to an embarked unit, except where a rule says so.
- **Constructs** (role mechanic `construct`) are the **Clockwork Gunner** and
  the **Brass Titan**: fully mechanical, no dwarf inside
  ([section 7](#7-clockwork)). Every other Dwarf unit is **living**.
- **The "living" test becomes per unit.** Today it is per owner
  (`isLivingOwnerV7`: the owner's faction is not `UNDEAD`). It becomes
  `isLivingUnitV7(roster, unit)`: the owner's faction is not `UNDEAD` **and**
  the unit's role is not a construct under its owner's registration. Every
  caller of the per-owner test (13 today: Plague, Bitten, Infect, Wail, and
  their previews) reads the per-unit test instead; with no Dwarf seat the two
  are identical.
- **Machines** (for Repair only, [section 9.1](#91-repair)) are every Dwarf
  land role except the Hammerer and the Engineer: Gyrocopter, Clockwork
  Gunner, Steam Mole, Steam Cannon, Steam Tank, and Brass Titan (role
  mechanic `repairsAsMachine`). **This is not the Martian "machine"** of
  [current rules section 20.1](RULESET_7_CURRENT.md#201-roles-machines-and-labels),
  which means a movement mode (`STRIDE` or `FLY`). Of the Dwarf units only
  the Gyrocopter has a non-ground movement mode (`FLY`), and only it gets the
  flyer rules (no cover, no Port needed, self-launch on water).
- **Diggers** (role mechanic `digsIn`) are the Hammerer and the Steam Mole
  ([section 8](#8-dig-in)).

| Mechanical role | Human       | Undead      | Goblin       | Dinosaur     | Martian            | Ice Folk     | Dwarf (`DWARF`)  |
| --------------- | ----------- | ----------- | ------------ | ------------ | ------------------ | ------------ | ---------------- |
| `FIGHTER`       | Fighter     | Skeleton    | Goblin       | Caveman      | Grunt (and Thrall) | Yeti         | Hammerer         |
| `RAIDER`        | Raider      | Ghoul       | Wolf Rider   | Raptor       | Saucer             | Sled         | Gyrocopter       |
| `MARKSMAN`      | Marksman    | Banshee     | Bomb Chucker | Spitter      | Ray Gunner         | Snow Hunter  | Clockwork Gunner |
| `GUARD`         | Guard       | Zombie      | Orc Brute    | Ankylosaurus | Shield Projector   | Mammoth      | Steam Mole       |
| `CAPTAIN`       | Captain     | Necromancer | Orc Warboss  | Shaman       | Brain              | Ice Witch    | Engineer         |
| `CATAPULT`      | Catapult    | Lich        | Rocket Cart  | Triceratops  | Tripod             | Boulder Yeti | Steam Cannon     |
| `KNIGHT`        | Knight      | Vampire     | Scrap Buggy  | T-Rex        | Mothership         | Sabretooth   | Steam Tank       |
| `JUGGERNAUT`    | Juggernaut  | Abomination | Troll        | Brontosaurus | Colossus           | Frost Giant  | Brass Titan      |
| `PATROL_BOAT`   | Patrol Boat | Patrol Boat | Patrol Boat  | Patrol Boat  | Patrol Boat        | Patrol Boat  | Patrol Boat      |
| `BATTLESHIP`    | Battleship  | Battleship  | Battleship   | Battleship   | Battleship         | Battleship   | Battleship       |

Tactical-role metadata equals that of the same mechanical role
(`assertRuleset7Registry` requires it): the Gyrocopter is `SKIRMISHER`, the Clockwork Gunner `RANGED`, the
Steam Mole `DEFENDER`, the Engineer `SUPPORT`, and the Steam Cannon `SIEGE`.
The Normal AI must judge the Gyrocopter, the Mole, and the Engineer by their
abilities, not by these labels ([section 15](#15-normal-ai-requirements)).

### 2.4 Showcase

A `SHOWCASE` setup ([current rules section 2.5](RULESET_7_CURRENT.md#25-showcase-setup))
accepts a Dwarf seat with no board change: the same strips, cities, ledger,
unit tiles, forms, homes, and entity IDs as any other faction.

- The ten units are the Dwarf roster's, one per role, at full HP with zero
  kills and the fresh setup activation. Nothing is burrowed;
  `surfacedThisTurn` and `bombedThisTurn` are empty.
- All 23 technologies are researched, so Dig In, Blasting Charges (eruption
  3, the Cannon ignores fortification), Dive (bomb 6), and Assemble apply
  from the first turn.
- Capacity is unchanged: every Dwarf role uses one slot (Capital 5 of 7,
  North 3 of 6, Coast 2 of 5), so the Engineer, homed to the Capital, can
  Assemble from the first turn.
- **Dig In on the board at once:** the Hammerer stands on the Walled capital
  center `(cx, 7)` and has not moved, so it has fortification 3 (Walls 2,
  Dig In 1) from the first enemy turn if it stays. The Steam Mole stands on
  the neutral row at `(cx + 1, 5)`, two tiles from both the North and the
  Capital centers, so it is not dug in: both cases are visible.
- First income is the Human one (16 Coins; land trade applies).
- Against a neighbouring strip the first turns allow a Tunnel (on turn 1
  alone, or on turn 2 with a rider once the Hammerer has stepped next to the
  Mole on turn 1), an eruption at the next Start Turn, a bombing run (turn 2,
  once the Gyrocopter has flown within 2 of an enemy), an Assemble (turn 1,
  Engineer at `(cx − 1, 9)`), a Repair once something is damaged, two Gunner
  shots once an enemy is within 2, and a Steam Cannon shot with Knockback
  (turn 1, against the strip to the east: that neighbour's `CAPTAIN` at
  `(cx + 3, 9)` is at distance 3; its push tile `(cx + 4, 9)` holds the
  neighbour's `CATAPULT`, so that push is blocked, which the preview shows).
  The Showcase has no Rift.

## 3. Dwarf roster

"Slots" is the city capacity the unit uses
([revision 19 section 5.1](RULESET_7_REVISION_19_DINOSAURS.md#51-big-bodies-capacity-slots)).
Every Dwarf role uses one slot.

| Unit             | Role          | Tech              | Cost | Slots |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move    | Capture | Its own thing                                                      |
| ---------------- | ------------- | ----------------- | ---: | ----: | --: | ------------------ | -------------------: | ---: | ----: | ----: | -------------------- | ------- | ------------------------------------------------------------------ |
| Hammerer         | `FIGHTER`     | start             |    2 |     1 |  12 | 2 (4)              |                2 (4) |    1 |     1 |     1 | yes                  | yes     | Rides the tunnel; Dig In; no Field Defense                         |
| Gyrocopter       | `RAIDER`      | Scouting          |    4 |     1 |   8 | 1.5 (3)²           |                1 (2) |    3 |  bomb |     2 | the bomb is its Move | no      | flies; Bomb Run (5, Dive 6), once per target per turn              |
| Clockwork Gunner | `MARKSMAN`    | Marksmanship      |    3 |     1 |  10 | 1.5 (3)            |                1 (2) |    1 |   1–2 |    1¹ | yes, one shot        | yes     | construct; two shots if it has not moved; never moves after firing |
| Steam Mole       | `GUARD`       | Drill             |    5 |     1 |  16 | 2 (4)              |              2.5 (5) |    1 |     1 |     1 | yes                  | yes     | Tunnel 3 with a rider; Eruption 2 (3); Dig In                      |
| Engineer         | `CAPTAIN`     | Administration    |    5 |     1 |  10 | 1 (2)              |                1 (2) |    1 |     1 |     1 | yes                  | no      | Repair; Assemble; no Rally                                         |
| Steam Cannon     | `CATAPULT`    | Sawmilling        |    8 |     1 |  10 | 3.5 (7)            |              0.5 (1) |    1 |   2–3 |     1 | no                   | no      | Knockback; with Blasting Charges ignores Walls and Field Defense   |
| Steam Tank       | `KNIGHT`      | Chivalry          |    9 |     1 |  16 | 3 (6)              |                2 (4) |    2 |     1 |     1 | yes                  | no      | Plated 4; no Overrun                                               |
| Brass Titan      | `JUGGERNAUT`  | reward only       |    — |     1 |  36 | 4 (8)              |                3 (6) |    1 |     1 |     1 | yes                  | yes     | construct; Push                                                    |
| Patrol Boat      | `PATROL_BOAT` | Shorecraft        |    5 |     1 |  10 | 2 (4)              |                2 (4) |    2 |     1 |     2 | yes                  | no      | naval                                                              |
| Battleship       | `BATTLESHIP`  | Naval Engineering |   16 |     1 |  25 | 6 (12)             |                4 (8) |    2 |   1–3 |     3 | no                   | no      | naval; splash                                                      |

¹ Clockwork Gunner Sight becomes 2 with Fieldcraft.
² The Gyrocopter has no `ATTACK` command; its Attack is used only when it
retaliates ([section 6.1](#61-flight-and-no-ordinary-attack)).

These are the root's decided numbers, checked against the registry of commit
`d8ed16d` (`pulp-wars-poc-7r28`); [section 12](#12-per-unit-battle-analysis)
found no unit dead or dominant with them, so **no number is changed**
([section 20.1](#201-deviations-from-the-root-decisions)), except **the
bomb: 5, and 6 with Dive** (decided 4 and 5): the coarse balance of
`pulp_wars-78i.7` (`pulp-wars-poc-7r31`) moved it inside the bounds
([section 19.5](#195-tuning-record)). The analysis of
[section 12](#12-per-unit-battle-analysis) and the interaction tables of
[section 13](#13-interactions-with-existing-rules) other than the bomb's
own numbers were computed with the decided bomb and were not re-run.

- **Hammerer** has Fighter parity (cost, HP, Attack, Defense, Move; capture,
  Pillage with Raiding, Disband, ordinary Promotion, the advance after a melee
  kill). It cannot build Field Defense. It rides a Mole's tunnel
  ([section 5.5](#55-the-rider)) and digs in ([section 8](#8-dig-in)).
- **Gyrocopter** (a goggled dwarf under a rotor) has the Martian flyer
  movement ([section 6.1](#61-flight-and-no-ordinary-attack)), Sight 2, no
  capture, no Pillage, no advance, and no `ATTACK` command. Its one primary
  action is the bombing run ([section 6.2](#62-the-bomb-run-command)).
- **Clockwork Gunner** is a construct with Marksman parity for range 1–2
  (minimum range 1), capture, Pillage, Disband, and Fieldcraft Forest freedom
  and Sight. It shoots twice on a turn it has not moved, once after moving,
  never moves after firing, and **never advances** after a kill
  ([section 7.3](#73-clockwork-gunner-two-shots)).
- **Steam Mole** (a squat riveted tub on tracks with a drill nose) has Guard
  parity for capture only. Unlike the Guard it **may attack after moving**
  and advances after a melee kill. It cannot build Field Defense. Its Move
  may be made underground ([section 5](#5-tunnels-the-mound-and-the-eruption)),
  and it digs in.
- **Engineer** has Captain parity for no capture and the Captain's body. It
  has **no Rally** (`RALLY` is never offered and is rejected with
  `UNIT_ROLE_INVALID`). Its Tend Wounded is **Repair**, and it has
  **Assemble** ([section 9](#9-engineer-repair-and-assemble)).
- **Steam Cannon** has Catapult parity (range 2–3, cannot attack after
  moving, no capture, never advances, destroys Field Defense on the target
  tile with reason `CATAPULT`) plus **Knockback**
  ([section 10.1](#101-steam-cannon-knockback)).
- **Steam Tank** has Knight parity for no capture and the advance after a
  melee kill. It has **no Overrun** and is **Plated**
  ([section 10.2](#102-steam-tank-plated)).
- **Brass Titan** has Juggernaut parity (reward only, capture, Push on an
  adjacent surviving target, the advance, no Pillage, no Disband) with its
  own numbers and the construct rules ([section 10.3](#103-brass-titan)).
- **Patrol Boat and Battleship** have the Human units' rules and numbers; no
  Dwarf rule applies to them. They are drawn in the Dwarf style
  ([section 16.4](#164-what-the-art-bead-must-draw)).
- **No unit builds Field Defense** (`buildsFieldDefense` false for every
  Dwarf role, and the tree has no `BUILD_FIELD_DEFENSE` unlock).
- **Disband refunds** are `floor(cost / 2)`: Hammerer and Gunner 1,
  Gyrocopter, Mole, and Engineer 2, Steam Cannon and Steam Tank 4. A Brass
  Titan cannot Disband. A burrowed unit cannot be commanded at all
  ([section 5.3](#53-the-mound-visible-and-untouchable)).
- **Arms Industry** applies as to every faction, and to Assemble
  ([section 9.2](#92-assemble)).
- An **embarked** Dwarf land unit follows the ordinary embarked rules (Move
  2, Defense 1, Sight 1, no Attack, no retaliation, no ZOC, no ability). A
  Gyrocopter afloat (self-launched, [section 13.10](#1310-boats-embarking-and-water))
  is an ordinary embarked unit.
- **Public abilities** (the role rule's `abilities` list): Hammerer `ATTACK`,
  `CAPTURE`, `RIDES_TUNNEL`, `DIG_IN`; Gyrocopter `FLY`, `BOMB_RUN`;
  Clockwork Gunner `ATTACK`, `CAPTURE`, `CLOCKWORK`, `TWIN_SHOT`; Steam Mole
  `ATTACK`, `CAPTURE`, `TUNNEL`, `ERUPTION`, `DIG_IN`; Engineer `ATTACK`,
  `TEND_WOUNDED` (labelled Repair), `ASSEMBLE`; Steam Cannon `ATTACK`,
  `KNOCKBACK`; Steam Tank `ATTACK`, `PLATED`; Brass Titan `ATTACK`, `CAPTURE`,
  `PUSH`, `CLOCKWORK`; boats `ATTACK`.

## 4. Technology

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rule, and technology IDs of `DWARF_BASELINE_V1` are identical to
`ORIGINAL_BASELINE_V5` ([current rules section 6](RULESET_7_CURRENT.md#6-technology)).
The Dwarf registration differs in six unlock entries and two display names:

- `ADMINISTRATION` grants `ENGINEER_SUPPORT` (Repair) instead of
  `CAPTAIN_SUPPORT` (no Rally).
- `MARKSMANSHIP` also grants `ASSEMBLE` (the Engineer may Assemble Gunners).
- `RAIDING` grants `DIVE` (the bomb deals 6) instead of `CHARGE_BONUS`; it
  keeps Pillage.
- `CHIVALRY` grants no `OVERRUN` (the Undead and Ice Folk precedent).
- `FORTIFICATION` is displayed as **Dig In** and replaces
  `COMMAND BUILD_FIELD_DEFENSE` with `DIG_IN` ([section 8](#8-dig-in)).
- `EXPLOSIVES` is displayed as **Blasting Charges**, keeps both of its
  unlocks (Blast Mountain and melee Field Defense demolition), and adds
  `BLASTING_CHARGES`: eruptions deal 3, and Steam Cannon shots ignore Walls
  and Field Defense ([sections 5.4](#54-surfacing-and-the-eruption) and
  [10.1](#101-steam-cannon-knockback)).

`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains
`DWARF: { FORTIFICATION: "Dig In", EXPLOSIVES: "Blasting Charges" }`. The
effects are read through the technology capabilities `digIn`, `assemble`,
`bombDamage`, `eruptionDamage`, and `cannonIgnoresFortification`, never
through a raw technology test.

**Audit.** Every technology, and what it gives a Dwarf seat. "Same" means the
Human unlock applies unchanged and is useful to a Dwarf seat as it is to a
Human one.

| Technology        | Tier | What a Dwarf seat gets                                                                                                                    | Dead part for the Dwarves                                   |
| ----------------- | ---: | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Gathering         |    1 | same: reveal Fertile Ground; Harvest Fruit                                                                                                | —                                                           |
| Farming           |    2 | same: Farm                                                                                                                                | —                                                           |
| Milling           |    3 | same: Windmill; its Start Turn healing heals every unit but constructs                                                                    | —                                                           |
| Administration    |    2 | **Engineer** (Repair); Market; Disband                                                                                                    | —                                                           |
| Planning          |    3 | same: +1 capacity in every city (also for Assemble); Land Grant                                                                           | —                                                           |
| Hunting           |    1 | same: Hunt Game                                                                                                                           | —                                                           |
| Forestry          |    2 | same: Lumber Camp; Clear Forest                                                                                                           | —                                                           |
| Sawmilling        |    3 | Sawmill; **Steam Cannon**                                                                                                                 | —                                                           |
| Marksmanship      |    2 | **Clockwork Gunner**; the Engineer's **Assemble**                                                                                         | —                                                           |
| Fieldcraft        |    3 | Replant Forest; the Gunner ignores Forest movement stops; Gunner Sight 2                                                                  | Forest freedom for the `RAIDER` role (the Gyrocopter flies) |
| Scouting          |    1 | **Gyrocopter**; Gyrocopter Sight 2                                                                                                        | —                                                           |
| Roads             |    2 | same: Build Road; Road population; half-cost Road movement                                                                                | —                                                           |
| Commerce          |    3 | same: land trade                                                                                                                          | —                                                           |
| Raiding           |    2 | Pillage for every land unit that does not fly (not the Titan); **Dive:** a bomb deals 6                                                   | —                                                           |
| Chivalry          |    3 | **Steam Tank**; Cultivate Forest                                                                                                          | Overrun (not granted)                                       |
| Drill             |    1 | reveal Ore; **Steam Mole**; first-hostile-capture Spoils                                                                                  | —                                                           |
| Engineering       |    2 | Mountain entry for every ground unit (a Mole and a rider may tunnel to a Mountain); +1 Sight on a Mountain; Mine; Workshop; Redevelop     | Mountain entry for the Gyrocopter (it flies)                |
| Metallurgy        |    3 | same: Forge; Arms Industry (also on Assemble)                                                                                             | —                                                           |
| Fortification     |    2 | **Dig In:** an unmoved Hammerer or Mole on or next to an own city center has +1 fortification                                             | Field Defense (no Dwarf unit builds it)                     |
| Explosives        |    3 | **Blasting Charges:** Blast Mountain; melee Field Defense demolition; eruptions deal 3; Steam Cannon shots ignore Walls and Field Defense | —                                                           |
| Shorecraft        |    1 | same: Harvest Fish; Build Port; embarkation; Patrol Boat                                                                                  | —                                                           |
| Navigation        |    2 | same: Deep Water (for a Gyrocopter's flight too); Gather Pearls; sea trade                                                                | —                                                           |
| Naval Engineering |    3 | same: Battleship; Shipyard; naval discount                                                                                                | —                                                           |

No technology is a dead purchase: each row has at least one live unlock, and
the two renamed technologies have a faction effect of their own. Dig In works
from the first Hammerer in the capital; Blasting Charges matters as soon as
one Mole or Cannon exists, and its prerequisite chain (Drill, then
Fortification) brings the Mole. Dive is the only bonus that changes a bomb.

The tree, research offers, and Help render names and unlock text from the
**viewer's** faction:

| Technology     | Dwarf name       | Dwarf unlock text                                                                           |
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

The other technologies read the same for every faction.

## 5. Tunnels, the mound, and the eruption

**One sentence:** a Mole tunnels up to 3 tiles under anything, taking an
adjacent Hammerer with it; both wait as mounds that everyone sees and nobody
can touch, and at the start of your next turn they burst up: every enemy on
the ground next to the Mole takes 2.

### 5.1 The Tunnel command

`TUNNEL { kind, unitId, to, rider }` is the Steam Mole's Move, made
underground. `rider` is `null` or `{ unitId, to }`. It is not an Attack and
costs no Coins.

A **tunnel tile for a unit `u`** is a tile that is on the board, explored by
the actor, land and not a Rift (Grass, Forest, or Mountain), enterable by `u`
under `canEnterTerrainV7` (a Mountain needs its owner's Engineering), with no
unit of any owner on it, no mound ([section 5.3](#53-the-mound-visible-and-untouchable)),
and no treasure chest, that is not a settlement site (a village, city, or
capital center of any owner) and not in territory allied to the actor.

Legality, in this order (all rejections are atomic):

| #   | Requirement                                                                                                                                                                                                                                                                      | Rejection                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `unitId` is the actor's own living unit on the board.                                                                                                                                                                                                                            | the ordinary unit errors; a burrowed unit `UNIT_ALREADY_HANDLED` |
| 2   | Its role has `TUNNEL`.                                                                                                                                                                                                                                                           | `UNIT_ROLE_INVALID { role }`                                     |
| 3   | It has not moved, has not used a primary action, and has not landed this turn.                                                                                                                                                                                                   | `UNIT_ALREADY_ACTED`                                             |
| 4   | It is in land form.                                                                                                                                                                                                                                                              | `TUNNEL_NOT_LEGAL { reason: "EMBARKED" }`                        |
| 5   | It is not in `surfacedThisTurn`.                                                                                                                                                                                                                                                 | `TUNNEL_NOT_LEGAL { reason: "SURFACED" }`                        |
| 6   | `to` is a tunnel tile for the Mole, and a sequence of at most `TUNNEL_RANGE_V7` (3) steps between Chebyshev neighbours leads from the Mole's tile to `to` with every tile after the first explored by the actor and land (Grass, Forest, Mountain, or Rift).                     | `TUNNEL_NOT_LEGAL { reason: "DESTINATION" }`                     |
| 7   | If `rider` is not null: `rider.unitId` is another own living unit on the board whose role has `RIDES_TUNNEL` (a Hammerer), in land form, Chebyshev-adjacent to the Mole's tile, that has not moved, used a primary action, or landed this turn and is not in `surfacedThisTurn`. | `TUNNEL_NOT_LEGAL { reason: "RIDER" }`                           |
| 8   | If `rider` is not null: `rider.to` is a tunnel tile for the Hammerer, Chebyshev-adjacent to `to`, and not `to`.                                                                                                                                                                  | `TUNNEL_NOT_LEGAL { reason: "RIDER_DESTINATION" }`               |

- **Underground** means: units, zones of control, terrain stops, Snow, Roads,
  and water ownership do not matter along the way; each step costs one;
  passing under a Mountain needs no Engineering and passing under a Rift is
  allowed; water is never part of a tunnel (step 6); nothing is revealed
  along the way. The command carries no path: any qualifying sequence will
  do, so the command query offers one entry per destination and rider tile
  (the Beam Down precedent).
- **A sluggish Mole may tunnel:** the tunnel is its Move, not a primary
  action. A sluggish Hammerer may ride for the same reason.
- **Result.**
  1. The Mole leaves `units` and enters `burrowed` as
     `{ unit: { …mole, at: to }, moleUnitId: null }`; the rider, if any,
     enters as `{ unit: { …hammerer, at: rider.to }, moleUnitId: mole.id }`.
     Both records keep their HP, kills, home city, and every status entry
     (Plague, Bitten, Chill), get the exhausted activation, and get
     `captureEligible` false.
  2. The actor explores every tile within Chebyshev 1 of each mound (the
     Sight of a Sight-1 unit standing there).
  3. Nothing else changes on the board: Field Defense on a mound tile stays
     until the surfacing ([section 5.4](#54-surfacing-and-the-eruption)); a
     siege the Mole or the rider was making ends because nobody stands on that
     center any more.
- **Events:** `UNIT_TUNNELLED` (its shape is in
  [section 14](#14-commands-events-errors-state-and-queries); the rider
  fields are null without a rider), `TILES_REVEALED`, then the ordinary economy, reward, and achievement tail
  (a unit may have left a center). A tunnel never involves water, so it is
  not on the naval blockade recompute list.
- Every tile it reads is explored by the actor, and no unit can hide on an
  explored tile, so the command is exact: accepted completely or rejected.

### 5.2 Burrowed units: state and the one accessor

```text
GameStateV7.burrowed: readonly { unit: UnitStateV7, moleUnitId: UnitId | null }[]   // sorted by unit.id
GameStateV7.surfacedThisTurn: readonly UnitId[]                                    // sorted
```

- `unit.at` is the **mound tile**. A Mole entry has `moleUnitId` null; a
  rider entry names a burrowed Mole of the same owner on a tile next to its
  own. Entries exist only between a `TUNNEL` and its owner's next Start Turn.
- **State parsing** rejects: a duplicate or unsorted entry; a unit ID that
  is also in `units`; an owner that is not a Dwarf seat; a Mole entry whose
  role lacks `TUNNEL` or whose `moleUnitId` is not null; a rider entry whose
  role lacks `RIDES_TUNNEL`, whose `moleUnitId` is not a burrowed Mole of the
  same owner, or whose tile is not next to that Mole's; two riders for one
  Mole; a form other than `LAND`; a mound tile that is off the board, water,
  a Rift, or a settlement site, that holds a unit or a treasure chest, or
  that another entry shares; and any entry in a match without a `DWARF`
  seat. `surfacedThisTurn` may list only units on the board owned by the
  active player, sorted and unique. Unit IDs are unique across `units` and
  `burrowed`, and the next entity ID is above all of them.
- **View.** `PlayerViewV7.burrowed` lists every entry whose mound tile the
  viewer has explored, with the ordinary public unit fields of the record
  (owner, role, HP, maximum HP, kills, statuses) and `moleUnitId`. A mound is
  public exactly as a unit on that tile would be.

**One accessor.** Every reader of the unit list chooses explicitly between
two functions:

```text
boardUnitsV7(state)            = state.units                                 // what stands on the board
allOwnedUnitsV7(state, owner?) = state.units ∪ state.burrowed[].unit         // everything a player owns
```

`state.units` keeps its meaning (the board); no reader silently starts
including burrowed units. About 227 reads of `state.units` and 367 of
`view.units` exist in `src` today. **A test classifies every one of them** as
board-only or all-units (a checked-in table keyed by file and function, which
fails when a reader appears without a class), with a behavioural check per
class. The classification this contract decides:

| Reader                                                                                                                                                                                                                                 | Class                                                                     | Why                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Combat, targeting, retaliation, adjacency abilities (Rally, Tend Wounded and Repair, Gang Up, Push, Tractor Beam, Mind Control, Beam Down, Bolas, Cold Snap, Cold Aura, Sweep), splash, Pierce, Wail, Kaboom and blasts, Plague spread | board-only                                                                | a mound is off the board                                                                         |
| Movement, pass-through, zone of control, siege, training spawn, capture, Field Defense building                                                                                                                                        | board-only                                                                | a mound exerts nothing                                                                           |
| **Occupancy:** the end of a Move, an advance, Push, pull, Knockback, Beam Down, landing, rewards and displacement, treasure units, risings, Raise Dead, Eggs, Assemble, tunnel and bombing-run destinations                            | board units **and mound tiles** (the occupancy predicate)                 | [section 5.3](#53-the-mound-visible-and-untouchable)                                             |
| Capacity and used slots; orphaning on a capture; the treasure unit's slot check                                                                                                                                                        | all-units                                                                 | a burrowed unit keeps its slot and its home                                                      |
| Elimination (units removed with cause `ELIMINATION`)                                                                                                                                                                                   | all-units                                                                 | a burrowed unit dies with its seat                                                               |
| Victory and defeat                                                                                                                                                                                                                     | unchanged (cities only)                                                   | a seat with only burrowed units and a city is alive                                              |
| Status lists (`plagued`, `bitten`, `chilled`) and their parsing; the owner's End Turn Chill countdown                                                                                                                                  | all-units                                                                 | entries stay keyed by unit ID and keep counting                                                  |
| Start Turn activation reset; Shield recharge, Cold Aura, Plague, hatching, Windmill healing, regeneration; End Turn idle recovery                                                                                                      | board-only                                                                | surfacing runs before them; a burrowed unit has moved, so it never recovers idle                 |
| Achievement Muster ("owned on the board at once")                                                                                                                                                                                      | board-only                                                                | the Egg precedent                                                                                |
| Leaderboard, match statistics, headless metrics (units owned, army value)                                                                                                                                                              | all-units                                                                 | the player owns them                                                                             |
| Accepted-state certificate (`accepted-state-certificate.ts`), state schema and parsing (`state-schema.ts`), hashing, save, replay, entity-ID uniqueness                                                                                | all-units, with `burrowed` as its own list                                | nothing may be lost or duplicated                                                                |
| Player view `units`; event projection and fog (`event-projection.ts`, `observation.ts`)                                                                                                                                                | board-only, plus the view's `burrowed` list and the mound visibility rule | [section 14](#14-commands-events-errors-state-and-queries)                                       |
| Public command query                                                                                                                                                                                                                   | board-only                                                                | no command is offered for a burrowed unit                                                        |
| Threatened tiles; the Normal AI threat map                                                                                                                                                                                             | board units, plus mound rings and surfacing reach                         | [sections 14](#14-commands-events-errors-state-and-queries) and [15](#15-normal-ai-requirements) |
| The Normal AI's own army (wave membership, garrison counts)                                                                                                                                                                            | board-only, plus "a burrowed unit will stand at its mound next turn"      | [section 15](#15-normal-ai-requirements)                                                         |
| UI: units awaiting orders, unit cycling, selection                                                                                                                                                                                     | board-only; a mound is selectable for information only                    | [section 16](#16-ui-requirements)                                                                |

### 5.3 The mound: visible and untouchable

- **Visible (U7).** Each burrowed unit is a **mound** on its tile, public to
  every viewer who has explored that tile: owner, unit, HP, and whether it is
  the Mole or its rider. The tunnel's start and end tiles are in the
  projected `UNIT_TUNNELLED` event for viewers who have explored them. The
  mound announces the exact tile and the exact turn of the eruption: nothing
  attacks from hiding.
- **Untouchable by construction.** A burrowed unit is not in `units`, so no
  attack, bomb, splash, Pierce, Sweep flank hit, Kaboom or death blast, Wail,
  Plague spread, Bolas, Cold Snap, Cold Aura, Mind Control, Tractor Beam,
  Push, Charge! push, Knockback, or Overrun can find it. It exerts no zone of
  control, never besieges, and never blocks training, capture, or Land Grant.
- **The occupancy predicate.** `tileOccupiedV7(state | view, at)` is true
  when a unit stands on the tile **or a mound is on it**. Every rule that
  places a unit on a tile, or ends a unit's step there, asks it: no `MOVE`
  ends on a mound tile (`MOVEMENT_ILLEGAL` reason `MOUND`); no advance,
  Push, Charge! push or follow, Tractor Beam, Knockback, Beam Down, landing
  (`DISEMBARK`), reward unit or displacement, treasure unit, rising, Raise
  Dead, Egg, hatching, Assemble, tunnel destination, or bombing-run landing
  ends on one. A Move may **pass over** a mound tile: no unit stands there.
- **Hidden mounds.** A mound on a tile the mover has not explored can be met
  only on the last tile of a Move (a Move ends on entering an unexplored
  cell). The Move is accepted and interrupted there like a Move that meets a
  hidden unit: the mover stays on the last tile it entered on which it may
  end, `UNIT_MOVE_INTERRUPTED` reports reason `MOUND`, and everything
  revealed stays explored.
- **The tile itself** keeps its terrain, Road, improvement, resource, Field
  Defense, Grave, and Snow. Tile actions on it (Build Road, Clear Forest, and
  the rest) are unaffected; no tile action changes a tile into water, a Rift,
  or a settlement site.
- **Commands.** Every command naming a burrowed unit is rejected with
  `UNIT_ALREADY_HANDLED` (it spent its turn underground) and is never
  offered.
- **The price, stated honestly.** A Mole that tunnels every second turn is
  out of reach on half of the enemy turns. That is fair only because the
  tunnel is its whole turn, the mound announces tile and turn, it cannot
  tunnel again on the surfacing turn, the eruption is small, and the
  surfaced pair stands in the open (abroad it is never dug in).

### 5.4 Surfacing and the eruption

At its owner's **Start Turn**, after the activation reset and the Shield
recharge and before Plague, each burrowed Mole of that seat surfaces, in
unit-ID order:

```text
reset activations and capture eligibility → city actions available →
Mind Control cooldowns → Shield recharge → (Cold Aura) → SURFACING →
Plague → … (unchanged)
```

(The Cold Aura and surfacing never run in the same Start Turn: a seat has one
faction.) For each Mole:

1. **Return.** The Mole, then its rider, leave `burrowed` and enter `units`
   on their mound tiles with the **Start Turn activation** (the one
   `resetTurnUnits` gives: nothing moved or used) and `captureEligible`
   false. Both IDs join `surfacedThisTurn`.
2. **Eruption.** Every unit on the eight tiles around the Mole that is
   **hostile** to the Mole's owner and **on the ground** takes
   `eruptionDamage`: **2** (`ERUPTION_DAMAGE_V7`), **3** with Blasting
   Charges (`BLASTING_ERUPTION_DAMAGE_V7`). "On the ground" is a unit in land
   form whose movement mode is not `FLY` (foot units, walkers, Thralls), or an
   Egg; never a flyer, a naval unit, or an embarked unit. The damage is fixed:
   no retaliation, no Attack, Defense, cover, fortification, Walls, Snow, or
   Blizzard; Armoured takes 1 off, then Plated caps it, then a Shield absorbs
   first; it is capped at the victim's HP. Every victim is hit at once, from
   the board after step 1. The rider never erupts, and own and allied units
   are never hit.
3. **Undermining.** Field Defense on the Mole's tile and on the eight tiles
   around it is destroyed, whoever owns it and whether or not anything was
   hit (reason `UNDERMINED`). The rider's tile is one of the eight.
4. **Deaths,** in `(y, x, id)` order: cause `ERUPTION`, kill credit to the
   Mole (Promotion and Slayer count it, and a destroyed Egg counts as a kill
   as in combat), then each death's Grave or rising under the ordinary rules
   (a Bitten victim rises as its biter's Zombie; no Grave on a Rift, where no
   ground unit stands anyway), and a Brain's Thralls collapse.
5. **Death blasts.** Exploding victims explode as a chain with the Start
   Turn chain machinery of Plague
   ([current rules section 18.7](RULESET_7_CURRENT.md#187-where-chains-run-and-event-order)):
   the blast hits everyone in its area, **the surfaced Mole and rider
   included**, and a Goblin seat earns Plunder for its blasts' kills.
6. **Reveals.** Each surfaced unit reveals its sight.

**Events,** one block per Mole: `UNIT_SURFACED` (shape in
[section 14](#14-commands-events-errors-state-and-queries); its `results` in
`(y, x, id)` order, `damage` being HP damage), then `FIELD_DEFENSE_DESTROYED`
(reason `UNDERMINED`) per tile in `(y, x)` order, `UNIT_DIED` (cause
`ERUPTION`) with `GRAVE_CREATED`, `BITTEN_UNIT_RISEN`, and `BRAIN_LOST`
collapses as they apply, the chain events, `PLUNDER_AWARDED`, and
`TILES_REVEALED`. They come after `SHIELDS_RECHARGED` and before
`PLAGUE_DAMAGED` in the Start Turn events.

**On the surfacing turn** (the units in `surfacedThisTurn`):

- both may Move overland and attack as usual (they have a fresh activation);
- neither can capture this turn (`captureEligible` false: they began the
  turn underground);
- **the Mole cannot tunnel** (`TUNNEL_NOT_LEGAL` reason `SURFACED`);
- **the rider cannot end a Move, or advance, on a settlement center it does
  not own** (a neutral village, or the center of a city its owner does not
  own): `MOVEMENT_ILLEGAL` reason `SETTLEMENT_FORBIDDEN` (the flyer rule's
  reason), never offered, and no advance there (root decision 4);
- **the rider cannot ride again** this turn.

`surfacedThisTurn` is emptied at its owner's End Turn. A surfacing has no
other cost: the Mole is next to whatever it erupted on, and the enemy turn
follows.

**Can a mound tile be occupied when it surfaces?** No. The occupancy
predicate reserves it, no command or rule changes it into water, a Rift, or a
settlement site, and state parsing rejects a mound tile with a unit on it;
the surfacing code asserts it. If its owner is eliminated, its burrowed units
are removed with the rest of its units (`UNIT_DIED` cause `ELIMINATION`, no
Grave, no blast).

### 5.5 The rider

- The rider uses its own slot and keeps its home city; a capture of that
  city orphans it while it is underground, like any unit.
- It travels with the Mole: it needs no path of its own and ignores
  Mountains, Forests, units, and zones of control on the way. Its destination
  must be a tile it could stand on (a Mountain needs Engineering).
- It surfaces right after its Mole, never erupts, and is in the blast of an
  exploding unit the eruption killed.
- On its surfacing turn it may move and attack; it cannot capture, cannot
  step onto a settlement center it does not own, and cannot ride again.
  Abroad it is never dug in. At home it is dug in if it then stands still
  within 1 of an own center ([section 8](#8-dig-in)).
- With no free rider tile next to the destination, the Mole tunnels alone.
- On Snow it surfaces normally; Move 1 is not affected by deep snow.

**The village race.** A ride moves the Hammerer up to 5 tiles in one turn
(one to the Mole, three under, one beside the destination). Capture turn for
a village at Chebyshev distance `d` from the starting tile, on open ground,
counting the turn the unit starts moving as turn 1 and capture on the turn
after arrival:

| `d` | Hammerer walking | Raider (Move 2) | Mole alone | Hammerer riding, with the brake | Riding, without the brake |
| --: | ---------------: | --------------: | ---------: | ------------------------------: | ------------------------: |
|   3 |                4 |               3 |          3 |                               4 |                         3 |
|   4 |                5 |               3 |          3 |                               4 |                         3 |
|   5 |                6 |               4 |          4 |                               4 |                         3 |
|   6 |                7 |               4 |          5 |                               4 |                         3 |
|   7 |                8 |               5 |          6 |                               4 |                         4 |
|   8 |                9 |               5 |          7 |                               5 |                         5 |

With the brake (root decision 4: no settlement center on the surfacing turn),
a rider captures at the Raider's turn from 5 or 6 tiles out and one turn
earlier from 7; without it, a turn earlier than the Raider from 4 to 6. A
ride costs the Mole its next turn (it cannot tunnel on the surfacing turn),
needs a fresh Hammerer next to the Mole, and delivers one Hammerer; tunnels
ignore Forest stops, so on wooded maps the gain is larger. The Normal AI
does not tunnel for expansion unless the optional rule of
[section 15](#15-normal-ai-requirements) wins its head-to-head test, so this
is mainly a human's tool; the balance bead probes it with a scripted
human-style opening ([section 19.2](#192-measurement)).

### 5.6 Worked examples

Engine formula ([section 12.1](#121-method)), open Grass, eruption 2 (3 with
Blasting Charges), then the Mole's attack, then the rider's. "Mole" and
"Hammerer" give the damage dealt / taken back and the HP left.

| Target (HP)                                        | After the eruption 2 (3)                           | Mole attacks               | Hammerer attacks             | Result                                                                                                      |
| -------------------------------------------------- | -------------------------------------------------- | -------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Catapult (10)                                      | 8 (7)                                              | 8 / 0: dead (7 / 0)        | —                            | the Hammerer is free for a second target                                                                    |
| Captain (10)                                       | 8 (7)                                              | 6 / 1: 2 left (7: dead)    | 2 / 0: dead                  | a Catapult and a Captain side by side both die                                                              |
| Lich, Necromancer, Knight (10)                     | 8 (7)                                              | 6 / 0–1: 2 left (dead)     | 2 / 0: dead                  | the soft back line dies                                                                                     |
| Marksman (12)                                      | 10 (9)                                             | 6 / 1: 4 left (2)          | 4 / 0: dead                  |                                                                                                             |
| Fighter (12)                                       | 10 (9)                                             | 5 / 4: 5 left (4)          | 5 / 0: dead                  | without an eruption: Mole 5 / 5, Hammerer 6 / 3, 1 HP left                                                  |
| Caveman (10)                                       | 8 (7)                                              | 5 / 4: 3 left (2)          | 3 / 0: dead                  |                                                                                                             |
| Goblin (6), Egg (6)                                | 4 (3)                                              | 4 / 0: dead                | —                            | an eruption alone never kills a fresh Goblin or Egg                                                         |
| Rocket Cart (8)                                    | 6 (5)                                              | 6 / 0: dead                | —                            | the Mole advances onto its tile and takes its death blast (4), as does the rider if it is next to the wreck |
| Grunt (10, Shield 2)                               | 10, the Shield ate 2 (9)                           | 5 / 3: 5 left (4)          | 5 / 0: dead                  | the Shield is gone for the rest of the Dwarf turn                                                           |
| Ray Gunner (8, Shield 2)                           | 8, the Shield ate 2 (7)                            | 6 / 2: 2 left (1)          | 2 / 0: dead                  |                                                                                                             |
| Yeti on Snow (9)                                   | 7 (6)                                              | 5 / 3: 2 left (1)          | 2 / 0: dead                  |                                                                                                             |
| Guard on Field Defense (17)                        | 15 (14), Field Defense undermined                  | 4 / 8: 11 left             | 5 / 7: 6 left                | not a wall-breaker                                                                                          |
| Fighter on a Walled center with Field Defense (12) | 10 (9), Field Defense undermined (fortification 2) | 3 / 11: 7 left (4 / 11: 5) | 4 / 10: 3 left (5 / 0: dead) | the Walls stay; the pair is badly hurt                                                                      |

**Exposed after.** Abroad neither surfaced unit is dug in. A Mole at 11 HP
(after an exchange or two) dies to two Fighters (5, then 6), to a Knight and
any second hit (9, then 2), and to one Raptor with Pounce, one Goblin with
Gang Up +2, one Catapult shot, or one Juggernaut (11 each). A fresh Mole
takes three Fighter hits to reach 1 HP. The Hammerer at 7 dies to two
Fighters. The cycle trades about one back-line unit per ride for a likely
Mole loss next turn unless the Dwarf line follows up.

## 6. Gyrocopters and the bombing run

**One sentence:** a Gyrocopter flies over an enemy and drops a bomb on it,
5 damage (6 with Dive), landing beyond it; nothing can hit back at the bomb,
and no unit is bombed twice in a turn.

### 6.1 Flight and no ordinary attack

- **Flight** is the Martian `FLY` movement mode, unchanged
  ([current rules section 20.6](RULESET_7_CURRENT.md#206-movement-stride-flying-and-crossing-water)):
  the Gyrocopter passes over units, ignores terrain stops and hostile zones of
  control, exerts no zone of control, has no cover or fortification, enters
  Mountains without Engineering, may stand on a Rift, never ends a Move on a
  neutral village center or the center of a city its owner does not own (so
  it never besieges or captures), never advances, cannot Pillage, crosses
  Shallow Water (Deep Water with Navigation), and self-launches where its
  Move ends on water. It takes a treasure chest by ending a Move on it.
- **No ordinary attack.** Its abilities are `FLY` and `BOMB_RUN`; it has no
  `ATTACK`, so `ATTACK` is never offered for it and is rejected with
  `UNIT_ROLE_INVALID`. Every reader that asks "can this unit attack" (the
  attack command, the threatened-tiles query, the AI) sees no attack.
- **It retaliates.** The retaliation test (today: the defender's role has
  `ATTACK`, Attack above 0, and the distance in its range) accepts `ATTACK`
  **or `BOMB_RUN`**: a Gyrocopter attacked at distance 1 strikes back with
  Attack 1.5 under the ordinary formula. That is the only reader widened.

### 6.2 The Bomb Run command

`BOMB_RUN { kind, unitId, targetUnitId, to }` is the Gyrocopter's Move and
its primary action at once. It is not an `ATTACK` and costs no Coins.

Legality, in this order (all rejections are atomic):

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                  | Rejection                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1   | `unitId` is the actor's own living unit on the board.                                                                                                                                                                                                                                                                                                        | the ordinary unit errors                          |
| 2   | Its role has `BOMB_RUN`.                                                                                                                                                                                                                                                                                                                                     | `UNIT_ROLE_INVALID { role }`                      |
| 3   | It has not moved, has not used a primary action, and has not landed this turn.                                                                                                                                                                                                                                                                               | `UNIT_ALREADY_ACTED`                              |
| 4   | It is in land form.                                                                                                                                                                                                                                                                                                                                          | `BOMB_RUN_NOT_LEGAL { reason: "EMBARKED" }`       |
| 5   | It is not sluggish (a bombing run is a Move and an action).                                                                                                                                                                                                                                                                                                  | `BOMB_RUN_NOT_LEGAL { reason: "SLUGGISH" }`       |
| 6   | `targetUnitId` is a living unit on the board the actor can see.                                                                                                                                                                                                                                                                                              | `TARGET_NOT_FOUND`                                |
| 7   | It is hostile to the actor.                                                                                                                                                                                                                                                                                                                                  | `TARGET_ALLIED`                                   |
| 8   | It is within Chebyshev distance `BOMB_RANGE_V7` (2) of the Gyrocopter; distance 1 is legal.                                                                                                                                                                                                                                                                  | `BOMB_RUN_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
| 9   | It is not in `bombedThisTurn`.                                                                                                                                                                                                                                                                                                                               | `BOMB_RUN_NOT_LEGAL { reason: "ALREADY_BOMBED" }` |
| 10  | `to` is Chebyshev-adjacent to the target, strictly farther (Chebyshev) from the Gyrocopter's tile than the target is, holds no treasure chest, and is a tile on which an ordinary `MOVE` of this Gyrocopter could end this turn (within Move 3 under the flyer rules, over explored tiles, no unit, no mound, not a forbidden center, not allied territory). | `BOMB_RUN_NOT_LEGAL { reason: "LANDING" }`        |

- The **target** may be in any form: a land unit, a flyer, an Egg, an
  embarked unit, or a boat.
- **Beyond the target** is the whole geometry rule: the landing is next to
  the target and farther from the start. It does not fix the flight path.

### 6.3 The bomb

**Result,** in order:

1. **The flight.** The Gyrocopter stands on `to`. It is not a `MOVE`: the
   event carries `from` and `to` and no path; nothing about the way matters
   beyond step 10 of the table; it takes no chest; it reveals its sight from
   `to`.
2. **The bomb** hits the target for `bombDamage`: **5** (`BOMB_DAMAGE_V7`),
   **6** with Dive (`DIVE_BOMB_DAMAGE_V7`, Raiding; decided 4 and 5, tuned
   by `pulp_wars-78i.7`). **Nothing else changes
   it**: no Inspired, Gang Up, Charge, cover, fortification, Walls, Field
   Defense, Dig In, Snow, Blizzard, Defense, or HP ratio. Armoured takes 1
   off, then Plated caps it, then a Shield absorbs first; it is capped at the
   target's HP. **It is never answered:** no retaliation.
3. The target joins `bombedThisTurn`.
4. **A kill** has cause `BOMB` and credits the Gyrocopter (Promotion,
   Slayer; a destroyed Egg counts), then the death's Grave or rising under
   the ordinary rules, and a Brain's Thralls collapse. There is no advance.
5. **A death blast** of an exploding target resolves as a chain: the
   Gyrocopter, standing next to it, is in the blast.
6. **Water.** If `to` is water and the Gyrocopter survived, it self-launches
   there (form `EMBARKED`, `UNIT_EMBARKED`).
7. The Gyrocopter has used its Move and its primary action and is handled.

A bomb destroys **no Field Defense** (it is not an attack, and a flyer is not
on the ground), inflicts no Plague, Bite, or Infect, never shatters, and is
not halved by a Blizzard (it is not an `ATTACK`).

**Events:** `UNIT_BOMBED` (shape in
[section 14](#14-commands-events-errors-state-and-queries)), then `UNIT_DIED` (cause `BOMB`) with its
Grave, rising, or `BRAIN_LOST` events, the chain events, `PLUNDER_AWARDED`,
`TILES_REVEALED`, `UNIT_EMBARKED`, the naval blockade and sea-network events
(`BOMB_RUN` joins the recompute list: a bomb can kill an embarked blockader,
and a self-launch can start a blockade), and the economy, reward, and
achievement tail.

**State.**

```text
GameStateV7.bombedThisTurn: readonly UnitId[]   // sorted
```

Emptied at the End Turn of the active player. An entry is removed when its
unit leaves the board. State parsing rejects a duplicate or unsorted entry,
an ID that is not a unit on the board, and any entry while the active player
is not a Dwarf seat. The view lists the visible units' entries: who has been
bombed this turn is public. The limit is **per target and per turn across
all of the seat's Gyrocopters**.

**Swarm arithmetic.** A unit loses at most 5 HP a turn to bombs (6 with
Dive), however many Gyrocopters there are, so no swarm of bombs kills a fresh
unit with 7 HP or more: a Goblin or an Egg (6 HP) is left at 1, and a Dive
bomb kills it.

**Distinct from the Saucer.** The Saucer is a shielded dropship: it Beams
Down a passenger, strafes at range 1 with an ordinary attack, and takes the
reply. The Gyrocopter carries nothing, has no Shield and no ordinary attack,
drops a fixed charge on the way past, and ends beside what it bombed. Same
flight rule, different verb and job: a scout and a finisher.

The preview is exact: every tile of a landing is explored, the target is
visible, and the damage is fixed.

### 6.4 Worked examples

HP left after one bomb, fresh target (Shield absorbed in brackets):

| Target (HP)                                                                                                                          | Bomb 5 | Dive 6 |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| Fighter, Marksman, Raptor (12)                                                                                                       | 7      | 6      |
| Guard (17)                                                                                                                           | 12     | 11     |
| Captain, Catapult, Knight, Skeleton, Ghoul, Necromancer, Lich, Vampire, Wolf Rider, Scrap Buggy, Caveman, Spitter, Shaman, Sled (10) | 5      | 4      |
| Banshee, Bomb Chucker, Rocket Cart, Snow Hunter (8)                                                                                  | 3      | 2      |
| Goblin (6), Egg (6)                                                                                                                  | 1      | killed |
| Egg with Nesting (10)                                                                                                                | 5      | 4      |
| Zombie (18)                                                                                                                          | 13     | 12     |
| Orc Brute (15)                                                                                                                       | 10     | 9      |
| Ankylosaurus (20, Armoured)                                                                                                          | 16     | 15     |
| Grunt (10, Shield 2)                                                                                                                 | 7 (2)  | 6 (2)  |
| Ray Gunner, Brain, Saucer (8, Shield 2)                                                                                              | 5 (2)  | 4 (2)  |
| Shield Projector (12, Shield 3)                                                                                                      | 10 (3) | 9 (3)  |
| Grunt in a Force Field (10, Shield 4)                                                                                                | 9 (4)  | 8 (4)  |
| Yeti (9)                                                                                                                             | 4      | 3      |
| Ice Witch (12)                                                                                                                       | 7      | 6      |
| Mammoth (20)                                                                                                                         | 15     | 14     |

**A bomb and one more hit kill every 10-HP back-liner.** After a bomb, a
Hammerer kills a Catapult, Captain, Lich, Knight, or Caveman with no reply;
after a Dive bomb, one moved Gunner shot kills a Catapult, Captain, Lich, or
Knight. A fresh Fighter needs a bomb and two more hits. (The bomb was 4, 5
with Dive, until `pulp_wars-78i.7`; this table is re-computed for 5 and 6.)

## 7. Clockwork

**One sentence:** clockwork hits at full strength until it breaks, and only
an Engineer can mend it.

### 7.1 Unflinching, on attack only

When a construct (Clockwork Gunner, Brass Titan) makes an `ATTACK`, its own
force uses its **maximum HP** instead of its current HP (in
[current rules section 13.2](RULESET_7_CURRENT.md#132-damage), the attacker
term `attack × hp / maxHp` becomes `attack`). As a **defender and when it
retaliates** it is an ordinary unit: its force falls with its HP, so wounded
clockwork is finished like any wounded unit (root decision 2). The combat
preview reports `unflinchingApplied`.

### 7.2 Immunities and healing

- **Not living** ([section 2.3](#23-faction-model)): Wail never targets a
  construct, Plague is never applied to or spread onto it, it is never
  Bitten, it never rises (a Zombie that kills it gets no Zombie), and it
  **leaves no Grave** on any death.
- **Mind Control** rejects it with `MIND_CONTROL_NOT_LEGAL`, reason
  `TARGET_IMMUNE` (the Titan is already immune as a `JUGGERNAUT`).
- **What still applies:** Chill and Shatter (never for the Titan, a
  `JUGGERNAUT`), Push, the Tractor Beam, Knockback, Kaboom and blasts,
  splash, Pierce, Sweep, Acid, and Lifesteal (a Vampire heals by the damage
  it deals a construct).
- **Never mends itself:** no explicit Recover (`RECOVER_NOT_LEGAL`, reason
  `CONSTRUCT`, never offered), no idle recovery, no Windmill healing.
  **Healed only by an Engineer's Repair (+4) and by a Promotion** (a full
  heal to the new maximum).
- A Gunner can be disbanded like any trainable unit (refund 1).

**Why the immunities are fair** (numbers in
[section 12](#12-per-unit-battle-analysis)): the Banshee, which only Wails,
deals nothing to two Dwarf roles, one of them reward-only; the Lich kills a
fresh Gunner with one shot (10 of 10), a Skeleton deals it 6, a Vampire kills
it with no reply, and the Titan is beaten like any Juggernaut-class unit. The
Brain can still take six of the eight Dwarf roles.

### 7.3 Clockwork Gunner: two shots

- **Two shots if it has not moved this turn, one after moving.** When the
  Gunner fires its first shot, its allowance is 2 (`GUNNER_UNMOVED_SHOTS_V7`)
  if its `moved` flag is false and 1 otherwise. Each shot is an ordinary
  `ATTACK` (range 1–2, retaliation, Unflinching, kill credit, the Field
  Defense rules) at any legal target, the same one or another.
- **A Gunner that has fired cannot move** (root decision 2): after its first
  shot `MOVE` is rejected with `UNIT_ALREADY_ACTED` and never offered, so it
  can never shoot, walk, and still claim to be unmoved.
- **It never advances** after a kill (`advancesAfterKill` false), so both
  shots come from the tile where it stood.
- A Gunner that landed this turn cannot fire (landing ends the activation).
  A sluggish Gunner that has not moved may fire twice; one that moved
  cannot fire.
- An assembled or trained Gunner has the exhausted activation until its
  owner's next Start Turn.
- The combat preview's existing `attacksRemaining` is 1 after the first shot
  of an unmoved Gunner and 0 otherwise; the unit stats carry `shotsLeft`.

## 8. Dig In

**One sentence:** a Hammerer or Mole that has not moved this turn, standing
on or next to its own city center, is dug in: it fights as if on Field
Defense.

A land-form unit whose role has `digsIn` (Hammerer, Steam Mole), owned by a
seat with the `digIn` capability (Dig In, the Dwarf Fortification), **is dug
in** when both hold:

1. **its activation's `moved` is false.** During its owner's turn that means
   it has not moved this turn; during any other player's turn it means it did
   not move on its owner's last turn, because `resetTurnUnits` resets the
   flag only at its owner's Start Turn. Activations are public in the view, so
   every preview equals its result;
2. **it stands within Chebyshev 1 (`DIG_IN_RADIUS_V7`) of the center of a
   city its owner owns**: on the center or on one of the eight tiles around
   it, whatever the tile's territory.

A dug-in unit has **+1 fortification level, in the Field Defense part** of
its fortification (`fortificationPartsForUnitV7`):
`fieldDefense = max(Field Defense on its own-territory tile ? 1 : 0, dug in ? 1 : 0)`.
So Dig In and Field Defense never stack (at most one level from the two), and
Walls add to it as they add to Field Defense: a dug-in Hammerer on its Walled
center has fortification 3. The helper's early returns (no territory, or
another owner's territory) gate Walls and Field Defense only; Dig In is
computed before them, so a dug-in unit on a ring tile in another city's
footprint still has its level.

**What counts as moving.** A `MOVE` (an interrupted one too, as for every
`moved` rule), a `TUNNEL`, a ride, a landing, and **an advance after a kill:
when a Hammerer or a Mole advances, its `moved` flag is set** (the only
engine change Dig In needs; every other unit's advance is unchanged). An
attack without an advance, Recover, Wait, Pillage, and a capture are not
moves. A Push, a pull, a Knockback, and a displacement are not Moves either:
the unit keeps its `moved` flag, and Dig In is read on the tile where it now
stands.

**Units that arrive this turn are not dug in.** A trained, rewarded, or
treasure unit has the exhausted activation (`moved` true) until its owner's
next Start Turn: it digs in only after standing through one of its owner's
turns. A unit that **surfaced** this turn has the fresh activation, so it is
dug in if it then stands still within 1 of an own center.

**Ignored by everything that ignores fortification:** the Triceratops's
Charge!, Acid, the Disintegrator, Boulders, and a Steam Cannon with Blasting
Charges remove it with the rest of the fortification. Wallbreaker removes only
the Walls levels, so Dig In stays (as Field Defense does). Dig In is not a
tile layer: no attack destroys it.

**What it is.** Exactly Field Defense, for free and without a turn of
building, but only while standing still and only around the seat's own city
centers: nine tiles per city, never in the field. The numbers are in
[section 12](#12-per-unit-battle-analysis): a Fighter deals a dug-in Hammerer
4 and takes 8 (in the open 5 and 5), the same as against a Human Fighter on
Field Defense.

## 9. Engineer: Repair and Assemble

The Engineer has the Captain's body (5 Coins, 10 HP, Attack 1, Defense 1,
Move 1, no capture), **no Rally**, and two support actions. A sluggish
Engineer that moved can use neither.

### 9.1 Repair

**Repair** is `TEND_WOUNDED` under the Dwarf label, with the Tend Wounded
rules of [current rules section 10](RULESET_7_CURRENT.md#10-recovery-and-support)
and the Ice Folk Chill cure, and one change: each target heals
`min(REPAIR_MACHINE_V7 (4), maxHp − hp)` if it is a **machine**
([section 2.3](#23-faction-model)) and `min(2, maxHp − hp)` otherwise.

- Targets: every adjacent own land-form unit other than the Engineer, not yet
  tended this turn, that is damaged, Plagued, Bitten, or Chilled.
- It cures Plague and Bitten and sets a Chill entry to thawing, as Tend
  Wounded does.
- It is a construct's only healing besides Promotion.
- `WOUNDED_TENDED` keeps its shape.

### 9.2 Assemble

`ASSEMBLE { kind, unitId, to }` is a primary action of the Engineer: it
builds a Clockwork Gunner on a free tile next to itself.

Legality, in this order (all rejections are atomic):

| #   | Requirement                                                                                                                                                                                                                                    | Rejection                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | `unitId` is the actor's own living unit on the board.                                                                                                                                                                                          | the ordinary unit errors                    |
| 2   | Its role has `ASSEMBLE`.                                                                                                                                                                                                                       | `UNIT_ROLE_INVALID { role }`                |
| 3   | The actor has the `assemble` capability (Marksmanship).                                                                                                                                                                                        | `TECH_REQUIRED { tech: "MARKSMANSHIP" }`    |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Engineer has not moved.                                                                                                                                              | `UNIT_ALREADY_ACTED`                        |
| 5   | It is in land form.                                                                                                                                                                                                                            | `ASSEMBLE_NOT_LEGAL { reason: "EMBARKED" }` |
| 6   | It has a home city, owned by the actor (an orphaned Engineer cannot Assemble).                                                                                                                                                                 | `ASSEMBLE_NOT_LEGAL { reason: "NO_HOME" }`  |
| 7   | That city has a free slot for a Gunner (`used + 1 <= capacity`, [current rules section 4.4](RULESET_7_CURRENT.md#44-unit-capacity)).                                                                                                           | `CITY_CAPACITY_FULL`                        |
| 8   | The actor has at least the cost in Coins.                                                                                                                                                                                                      | `INSUFFICIENT_COINS`                        |
| 9   | `to` is one of the eight tiles around the Engineer, land and not a Rift, enterable by a Gunner (a Mountain needs Engineering), with no unit, no mound, and no treasure chest, not a settlement site, and not in territory allied to the actor. | `INVALID_TILE { action: "ASSEMBLE" }`       |

- **Cost:** `ASSEMBLE_COST_V7` **4** Coins (1 more than training a Gunner),
  less 1 under Arms Industry when the Engineer's home city has a Forge with
  positive output (3).
- **Result.** The Coins are spent. A new Clockwork Gunner with the next
  entity ID stands on `to`: owned by the actor, homed to the Engineer's home
  city, at full HP, with zero kills, the exhausted activation, and
  `captureEligible` false. Field Defense on `to` is destroyed when the tile's
  territory belongs to a player hostile to the actor (reason `OCCUPATION`,
  the Beam Down precedent). The Gunner reveals its sight. The Engineer has
  used its primary action and is handled.
- **Events:** `UNIT_ASSEMBLED` (shape in
  [section 14](#14-commands-events-errors-state-and-queries)),
  `FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then the
  economy, reward, and achievement tail.
- It spends **no city action**, and a siege of the home city does not block
  it (nothing appears in that city); a pending city reward blocks it like
  every command. It may follow a Move. Once per Engineer per turn (it is the
  primary action).
- Every tile around the Engineer is explored by its owner, so the command is
  exact.

**What it buys:** placement, not volume. Volume is bounded by the home city's
slots and by Coins, the same pool training uses. A Move-1 Gunner trained at
home walks 4 to 8 turns to a front at rounds 15 to 25; an assembled one is
born there for 1 Coin more, exhausted, and fires next turn. The counterplay is
the Engineer itself: it must be at the front, with 10 HP and Defense 1
([section 12.6](#126-engineer)).

## 10. Steam Cannon, Steam Tank, Brass Titan

### 10.1 Steam Cannon: Knockback

**One sentence:** a Steam Cannon's shot knocks a surviving target one tile
straight back.

- **Knockback.** After an `ATTACK` by a land-form Steam Cannon (always at
  distance 2 or 3), a target that survives is pushed one tile **directly
  away**: to its tile plus `(sign(dx), sign(dy))`, where `(dx, dy)` is the
  target's offset from the Cannon. The push happens only under the **Push
  conditions** ([current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat)):
  the destination is on the board, explored by the attacker, empty (no unit,
  no mound), not a settlement site, the same land or water kind as the
  target's tile, enterable by the target (a Mountain needs its owner's
  Engineering unless it strides or flies; a Rift only if it flies; Deep Water
  needs its owner's Navigation), not in territory allied to the target, and
  holds no treasure chest (the Tractor Beam condition). A `JUGGERNAUT`-role
  unit, a two-slot unit, and an Egg are never knocked back.
- It is the existing Push step (the same place in the resolution order, the
  same `UNIT_PUSHED` event, and the existing preview field `push` with its
  blocked case). The target keeps its HP, statuses, activation, and Chill,
  and gets `captureEligible` false; Dig In is read on its new tile.
- **What it is for:** knocking a garrison off its center (it loses its Walls
  and the center is empty; a capture still needs a unit that begins its turn
  there), knocking a unit off Field Defense, into the Hammerers' reach, or out
  of a Witch's Blizzard.
- **Otherwise a Catapult:** 8 Coins, 10 HP, Attack 3.5, Defense 0.5, range
  2–3, no attack after moving, no capture, no advance, and every attack
  destroys Field Defense on the target tile (reason `CATAPULT`).
- **Blasting Charges:** its attacks **ignore fortification** (Walls, Field
  Defense, and Dig In) for the damage and the retaliation, with the Boulders
  convention (cover stays, Walls are not destroyed, the preview reports the
  removed levels in `fortificationIgnored`).

### 10.2 Steam Tank: Plated

**One sentence:** no single hit takes more than 4 HP from a Steam Tank.

- **Plated** (role mechanic `plated: 4`, `PLATED_CAP_V7`): every single
  instance of damage to the unit is capped at 4 HP: an attack hit,
  retaliation, splash, Pierce, a Sweep flank hit, Wail, Kaboom, a death
  blast, a bomb, an eruption, and Plague. The cap applies after Armoured and
  before a Shield (the Tank has neither). The combat preview's damage is the
  capped value, with `platedApplied`. The Shatter test reads the HP after the
  cap.
- Otherwise Knight parity for no capture: 9 Coins, 16 HP, Attack 3,
  Defense 2, **Move 2**, the advance after a melee kill, and **no Overrun**.
  So every unit in the game needs at least four hits to kill a fresh Tank.

### 10.3 Brass Titan

The level-5 reward unit: 36 HP, Attack 4, Defense 3, Move 1, Push on an
adjacent surviving target, capture, the advance, no Pillage, no Disband, and
the construct rules (Unflinching on attack only; no self-repair; no Grave; not
living; Mind Control-immune). It arrives on the city center at full HP and
exhausted, like every reward unit.

## 11. Resolution order

**An attack** is the ordinary resolution of
[current rules section 13](RULESET_7_CURRENT.md#13-combat-and-fortification)
as extended by the Ice Folk overlay
([section 8 there](RULESET_7_ICE_FOLK.md#8-attack-resolution-order)), with the
Dwarf steps in bold:

1. Attack value: base Attack and the existing bonuses; **Unflinching**: a
   construct attacker's force uses its maximum HP. Defense: fortification
   with **Dig In** in the Field Defense part (0 for Acid, Charge!, Boulders,
   the Disintegrator, and **a Steam Cannon with Blasting Charges**), cover.
2. Damage both ways from pre-combat HP; the Blizzard; Armoured; **Plated**;
   Martian Shields absorb.
3. The Shatter test; Lifesteal; Sweep; kill credit; growth.
4. Field Defense destroyed on the target tile under the ordinary reasons
   (`CATAPULT` for a Steam Cannon).
5. Deaths in order, each with its Grave or rising — **none for a construct**.
6. The Push, **Knockback** (Steam Cannon), then the advance (**never for a
   Clockwork Gunner**; **a Hammerer's or a Mole's advance sets its `moved`
   flag**).
7. Death-blast chains, Plunder, reveals, and the ordinary tail.

**Start Turn,** for the active seat:

```text
reset activations and capture eligibility → city actions available →
Mind Control cooldowns → Shield recharge → Cold Aura → SURFACING (section 5.4) →
Plague and its chain → hatching → Windmill healing (constructs skipped) →
Troll regeneration → income → rewards → achievements
```

**End Turn,** for the active seat:

```text
idle recovery (constructs skipped) → Inspired and Overrun expire → Cooling →
Force Fields → Chill countdown (burrowed units included) →
EMPTY surfacedThisTurn AND bombedThisTurn → income preview → next seat's Start Turn
```

## 12. Per-unit battle analysis

The T-Rex was dominant and the first Triceratops useless in ways the damage
formula could have shown beforehand. Each Dwarf unit is therefore put through
the same exchanges before any code exists, with the root's decided numbers.
Where the arithmetic had shown a unit to be dead or dominant, this document
would have changed the number within reason; it found no such case
([section 20.1](#201-deviations-from-the-root-decisions)) and names the units
closest to either edge (the Gyrocopter, the Steam Tank). It uses the decided
bomb of 4 (5 with Dive); the coarse balance later raised it to 5 (6)
([section 19.5](#195-tuning-record)), and this analysis was not re-run.

### 12.1 Method

- **Formula.** The design's scratch library (`lib.ts`) ports the damage
  formula of [current rules section 13.2](RULESET_7_CURRENT.md#132-damage)
  line for line from `calculateCombatPreviewV7`, with the engine's BigInt
  rounding, Armoured, Shields, cover, fortification, and the Blizzard. For
  this contract it was **re-validated against the engine on `main` at commit
  `d8ed16d` (`pulp-wars-poc-7r28`)**: 12,480 exchanges between the existing
  land roles of the six factions (every attacking and defending role, full and
  half HP, Grass and Forest, with and without Field Defense, Martian Shields,
  Ice Folk Snow cover) on a hand-built state. The 274 mismatches are all
  Vampire attacks, which the script answers unless it is told the attack is
  unanswered (the tables below pass that flag); there is no other mismatch.
  Attackers with Acid, Wallbreaker, heat rays, Boulders, Sweep, Pierce, or
  Cold Blood are outside the check; the Ray Gunner is used only at full power,
  where its Attack is its role value.
- **Existing units** are read from that registry: Human Fighter, Raider, and
  Marksman at 12 HP and the Guard at 17; the Yeti at 9 HP and Defense 1.5
  (`pulp-wars-poc-7r27`); the Colossus at Defense 2.5; every Martian unit from
  the engine, not from paper.
- **Dwarf rules modelled:** Unflinching on attack only, Dig In as one
  fortification level, Plated 4, the flat bomb and eruption (Armoured, Plated,
  and Shields applied), two Gunner shots, Blasting Charges as fortification
  ignored, Shatter at 3 for Ice Folk melee hits on a Chilled dwarf.
- **Reading the tables.** "It attacks" is the opponent attacking the fresh
  Dwarf unit on open Grass: the HP the Dwarf unit loses; what the opponent
  takes back. "Dug in" is the same against a dug-in Hammerer or Mole
  (fortification 1, a ring tile). "To kill" is how many identical fresh
  attackers kill it (with the HP they lose in all). The last column is the
  Dwarf unit attacking the fresh opponent: damage (HP left); what it takes
  back. "+ 2 Shield" is what a Martian Shield absorbed.
- **The opponents** are those the root named: the Fighter (12 HP), the Guard
  on Field Defense and on Walls with Field Defense, the Knight, a Goblin pack
  (Gang Up +2, and a Kaboom of 5), the Caveman, the Raptor with Pounce, the
  Grunt and the Ray Gunner (Shield 2), the Yeti on Snow with an Ice Witch near
  (Chill, Shatter, the Blizzard), and the Lich.
- **Where the scripts are.** Outside the repository, in
  `/private/tmp/claude-501/-Users-nadbor-projects-pulp-wars/1d080a8d-9f97-4ca4-af61-87f1be442688/scratchpad/dwarf/spec/`:
  `lib.ts` (the formula, pointed at the worktree engine), `validate.ts` (the
  check against the engine), `roster.ts` (the decided Dwarf roster),
  `tables.ts` (the per-unit tables), `scenarios.ts` (the ride, Dig In under
  siege, the Witch, Shields, the Lich, Goblins, the gyro per Coin), `duels.ts`
  (one-on-one duels), and `colour.mjs` (the palette distances of
  [section 16.4](#164-what-the-art-bead-must-draw)). The directory is
  temporary: `pulp_wars-78i.3` copies what it re-runs, or rewrites it from
  this section.

### 12.2 Hammerer

Cost 2, 12 HP, Attack 2, Defense 2, Move 1. Human peer: the Fighter (the same
numbers, with Field Defense instead of Dig In).

- **Job.** The line and the captures; at home a dug-in wall (tier 2); abroad
  the Mole's passenger.
- **Typical turn.** At home: stand still on a ring tile or the center. On the
  attack: step next to a Mole; ride; burst out next to a Catapult or a Captain
  and hit it.

| Opponent                                                    | It attacks: open | Dug in     | To kill: open / dug in    | Hammerer attacks it                             |
| ----------------------------------------------------------- | ---------------- | ---------- | ------------------------- | ----------------------------------------------- |
| Fighter                                                     | 5; 5             | 4; 8       | 3 (8 back) / 3 (15 back)  | 5 (7 left); 5                                   |
| Guard (attacked on Field Defense; on Walls + Field Defense) | 3; 5             | 2; 9       | 4 (14 back) / 4 (24 back) | 3 (14 left); 12, dies / 2 (15 left); 12, dies   |
| Knight                                                      | 8; 4             | 7; 7       | 2 / 2                     | 6 (4 left); 2                                   |
| Goblin, Gang Up +2                                          | 10; 3            | 8; 6, dies | 2 / 2                     | 6 (kills); 0                                    |
| Caveman                                                     | 5; 5             | 4; 8       | 3 / 3                     | 5 (5 left); 5                                   |
| Raptor with Pounce                                          | 10; 3            | 8; 6       | 2 / 2                     | 6 (6 left); 2                                   |
| Grunt (Shield 2)                                            | 5; 3 + 2 Shield  | 4; 6       | 3 / 3                     | 3 + 2 Shield (7 left); 3                        |
| Ray Gunner (Shield 2), full power, range 2                  | 8; 0             | 7; 0       | 2 / 2                     | 4 + 2 Shield (4 left); 2                        |
| Yeti (the Hammerer attacks it on Snow)                      | 5; 5             | 4; 8       | 3 / 3                     | 4 (5 left); 4                                   |
| Lich, range 2                                               | 8; 0             | 7; 0       | 2 / 2                     | 6 (4 left); 0 (adjacent: the Lich cannot reply) |

- **Dug in on a Walled center** (fortification 3): fresh Fighters need 4 hits
  (3, 3, 4, 2) and lose 36 HP, exactly a Human Fighter on Walls with Field
  Defense; a Knight needs 2 (5, 7, losing 10); a Catapult 2 (6, 6), the same
  as against the Human garrison.
- **The Goblin pack.** In the open two Goblins with Gang Up kill it (10, then
  2). Dug in, the first takes 8 and **dies to the retaliation** (6 of its 6
  HP); a Kaboom (5) then finishes the Hammerer at 4.
- **The Witch.** A Chilled Hammerer dies to two Yeti hits instead of three
  (5, then a Shatter at 1 HP); dug in, to two as well (4, then 5 would leave
  3: a Shatter).
- **Counters.** Bonus attackers abroad (Gang Up, Pounce, Knight: 8 to 10);
  every fortified defender (it dies attacking a Guard on Field Defense); the
  Lich and the Ray Gunner from range.
- **Verdict: useful, not strong.** Its numbers are the Fighter's (no race
  edge: the Ice Folk lesson); its identity is the ride (offence) and Dig In
  (defence), each one sentence.

### 12.3 Gyrocopter

Cost 4, 8 HP, Attack 1.5 (retaliation only), Defense 1, Move 3, Sight 2,
flies. Peers: the Raider (4 Coins) and the Saucer (4 Coins).

- **Job.** The tier-1 scout (Move 3, Sight 2, flies, cannot capture) and the
  finisher: the only Dwarf damage before tier 3 that ignores Walls, cover,
  and fortification.
- **Typical turn.** Fly within 2 of the enemy line; next turn bomb the
  wounded back-liner or the unit the Hammerers will hit, and land on the side
  with the fewest enemies.

The bomb, per 4 Coins, against the Raider with Charge and the Saucer with
Strafe (one attack on a fresh target: dealt / taken):

| Target (HP)                         | Raider with Charge     | Saucer with Strafe | Gyrocopter bomb  | Gyrocopter Dive  |
| ----------------------------------- | ---------------------- | ------------------ | ---------------- | ---------------- |
| Fighter (12)                        | 8 / 4                  | 6 / 2              | 4 / 0            | 5 / 0            |
| Catapult (10)                       | 10, dead / 0           | 9 / 0              | 4 / 0            | 5 / 0            |
| Captain, Lich (10)                  | 10, dead / 0           | 8 / 0              | 4 / 0            | 5 / 0            |
| Marksman (12)                       | 10 / 1                 | 8 / 0              | 4 / 0            | 5 / 0            |
| Guard on Walls + Field Defense (17) | 5 / 12                 | 3 / 8              | 4 / 0            | 5 / 0            |
| Grunt (10, Shield 2)                | 7 + 2 Shield / 2       | 5 + 2 Shield / 1   | 2 + 2 Shield / 0 | 3 + 2 Shield / 0 |
| Ray Gunner (8, Shield 2)            | 8 + 2 Shield, dead / 0 | 6 + 2 Shield / 0   | 2 + 2 Shield / 0 | 3 + 2 Shield / 0 |
| Ankylosaurus (20, Armoured)         | 6 / 7                  | 4 / 5              | 3 / 0            | 4 / 0            |
| Yeti on Snow (9)                    | 8 / 3                  | 6 / 1              | 4 / 0            | 5 / 0            |

What hits a landed Gyrocopter (8 HP, Defense 1, no cover), HP lost; the
attacker takes:

| Attacker                                                                                               | Result                        |
| ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Fighter, Skeleton, Caveman, Yeti, Sled                                                                 | 6; 2                          |
| the Fighter it just bombed (8 HP)                                                                      | 5; 2                          |
| Grunt                                                                                                  | 6; 0 (its Shield takes the 2) |
| Guard; a lone Goblin                                                                                   | 4; 2                          |
| Marksman at range 2                                                                                    | 6; 0                          |
| Captain                                                                                                | 2; 2                          |
| Knight, Raptor with Pounce, Goblin with Gang Up +2, Saucer with Strafe, Ray Gunner at full power, Lich | 8, dead                       |

- **The trade.** A bomb on a Fighter leaves it at 8; if the Gyrocopter lands
  next to that Fighter and one more, the two kill it next turn (5, then 3).
  So it lands where only the target can reach it, or it dies: the AI's score
  subtracts the projected damage at the landing tile
  ([section 15](#15-normal-ai-requirements)).
- **Finishing.** A bomb and one more hit kill every 10-HP back-liner
  ([section 6.4](#64-worked-examples)): a Hammerer after a bomb, or a moved
  Gunner shot after a Dive bomb, kills a Catapult, a Captain, a Lich, or a
  Knight with no reply.
- **Against Shields** it is weak: 2 HP through a Grunt's Shield of 2 (3 with
  Dive), nothing through a Force Field's 4 (1 with Dive). After an eruption
  has stripped the Shield in the same Dwarf turn, a bomb deals 4.
- **Against the Witch** it is the loser: a Gyrocopter within 2 of her is
  Chilled by Cold Snap, so it is sluggish on its next turn and cannot bomb,
  and one Yeti hit on a Chilled Gyrocopter (6 of 8) shatters it.
- **Timing.** Scouting is tier 1 and a free-opener candidate: rounds 2 to 6.
  Dive needs Raiding (tier 2).
- **Verdict: the weakest unit per Coin, not dead.** Net per Coin on a Fighter
  it equals the Raider (4 or 5 for nothing back against 8 for 4 back), but the
  Raider kills a 10-HP back-liner outright and the Gyrocopter never kills
  anything fresh above 5 HP. It is the scout every seat buys first
  (the AI's first-of-role bias for `RAIDER`), and it is what finishes a
  Catapult behind Walls. Watch: kills per loss against the Saucer's 0.64, and
  bombing runs per seat-game ([section 19](#19-headless-support-measurement-tuning-bounds-and-balance-acceptance)).

### 12.4 Clockwork Gunner

Cost 3, 10 HP, Attack 1.5, Defense 1, Move 1, range 1–2, construct. Human
peer: the Marksman (3 Coins, 12 HP, Attack 2, Defense 1).

- **Job.** Steady fire behind the Hammerers; born at the front by Assemble.
- **Typical turn.** Stand still and fire twice; move only when nothing is in
  range, then fire once.

| Target at range 2                  | It attacks the Gunner | To kill |  Gunner moved (1 shot) |   Gunner unmoved (2 shots) |               Marksman |
| ---------------------------------- | --------------------- | ------: | ---------------------: | -------------------------: | ---------------------: |
| Fighter                            | 6; 2                  |       2 |                      3 |                      3 + 3 |                      5 |
| Guard on Field Defense             | 4; 2                  |       3 |                      2 |                      2 + 2 |                      3 |
| Guard on Walls + Field Defense     | —                     |       — |                      1 |                      1 + 1 |                      2 |
| Knight                             | 10, dies; 0           |       1 |                      4 |                      4 + 5 |                      6 |
| Goblin (Gang Up +2 when attacking) | 10, dies; 0           |       1 |                      5 |               5 + 1, kills |               6, kills |
| Caveman                            | 6; 2                  |       2 |                      3 |                      3 + 3 |                      5 |
| Raptor (Pounce when attacking)     | 10, dies; 0           |       1 |                      4 |                      4 + 5 |                      6 |
| Grunt (Shield 2)                   | 6; 0                  |       2 |           1 + 2 Shield |           1 + 2 Shield + 4 |           3 + 2 Shield |
| Ray Gunner (Shield 2), full power  | 10, dies; 0           |       1 | 2 + 2 Shield (takes 2) | 2 + 2 Shield + 5 (takes 4) | 4 + 2 Shield (takes 2) |
| Yeti on Snow                       | 6; 2                  |       2 |                      3 |                      3 + 3 |                      4 |
| Yeti on Snow in a Witch's Blizzard | —                     |       — |                      2 |                      2 + 2 |                      2 |
| Lich                               | 10, dies; 0           |       1 |            4 (takes 2) |            4 + 5 (takes 3) |            6 (takes 2) |

- **Unflinching.** At 3 of 10 HP a Gunner still shoots a Fighter for 3; a
  Marksman at 4 of 12 deals 2.
- **Decided by the numbers.** At 3 Coins, moved it is worse than a Marksman
  (3 against 5 on a Fighter), unmoved better (6 against 5), with 2 HP less,
  no self-healing, and Unflinching: a real choice each turn, and about a
  Marksman on average.
- **Struck.** 10 HP and Defense 1: a Knight, a Raptor's Pounce, a Goblin with
  helpers, a full-power ray, a Lich shot, and a Vampire each kill it in one
  hit; a Fighter, Skeleton, Caveman, or Yeti deals 6; a Saucer with Strafe 8.
- **Counters.** Reach it; make it move; kill the Engineer.
- **Verdict: useful.** A Marksman that rewards standing still, frail in
  contact.

### 12.5 Steam Mole

Cost 5, 16 HP, Attack 2, Defense 2.5, Move 1, attacks after moving. Peers:
the Human Guard (3 Coins, 17 HP, Attack 1.5, Defense 3), the Orc Brute (3
Coins), the Ankylosaurus (5 Coins), the Mammoth (6 Coins).

- **Job.** The home Guard (dug in) and the way under the enemy line.
- **Typical turn.** At home: stand dug in on a ring tile. On the attack: tunnel
  next to the enemy's back line with a Hammerer; next turn, erupt, then hit the
  softest neighbour.

| Opponent                                                    | It attacks: open | Dug in      | To kill: open / dug in    | Mole attacks it                         |
| ----------------------------------------------------------- | ---------------- | ----------- | ------------------------- | --------------------------------------- |
| Fighter                                                     | 4; 6             | 3; 10       | 4 (15 back) / 4 (27 back) | 5 (7 left); 5                           |
| Guard (attacked on Field Defense; on Walls + Field Defense) | 3; 7             | 2; 11       | 5 / 6                     | 3 (14 left); 12 / 2 (15 left); 16, dies |
| Knight                                                      | 7; 5             | 6; 8        | 2 / 3                     | 6 (4 left); 2                           |
| Goblin, Gang Up +2                                          | 9; 5             | 8; 6, dies  | 2 / 2                     | 6 (kills); 0                            |
| Caveman                                                     | 4; 6             | 3; 10, dies | 4 / 4                     | 5 (5 left); 5                           |
| Raptor with Pounce                                          | 9; 5             | 8; 8        | 2 / 2                     | 6 (6 left); 2                           |
| Grunt (Shield 2)                                            | 4; 4             | 3; 8        | 4 / 4                     | 3 + 2 Shield (7 left); 3                |
| Ray Gunner (Shield 2), full power, range 2                  | 7; 0             | 6; 0        | 2 / 3                     | 4 + 2 Shield (4 left); 2                |
| Yeti (the Mole attacks it on Snow)                          | 4; 6             | 3; 9, dies  | 4 / 4                     | 4 (5 left); 4                           |
| Lich, range 2                                               | 7; 0             | 6; 0        | 2 / 3                     | 6 (4 left); 0                           |

- **Dug in** it is a Guard on Field Defense in all but the price: a Fighter
  deals it 3 and takes 10; a Caveman or a Yeti that attacks it **dies to the
  retaliation**. On a Walled center fresh Fighters need 5 hits and lose 48
  HP (a Human Guard on Walls with Field Defense: 6 hits, 60 HP).
- **The ride** ([section 5.6](#56-worked-examples)) kills a Catapult with the
  Mole's hit alone and a Captain-class unit with the Mole and the rider
  together; with Blasting Charges the Mole alone kills either.
- **Exposed after.** Abroad a surfaced Mole is never dug in; at 11 HP two
  Fighters, a Knight and one more hit, or one Raptor, Gang-Up Goblin,
  Catapult shot, or Juggernaut kill it.
- **In a straight fight** it is a Brute-class body: it beats a Fighter one on
  one (7 HP left) and loses to a Guard, an Orc Brute, an Ankylosaurus, a
  Zombie, and a Mammoth. Its value is where it fights, not how hard.
- **Counters.** Shields (an eruption of 2 does nothing to a full Shield of
  2); stepping off the eight tiles; Walls (it is not a wall-breaker); striking
  on the surfaced turn.
- **Verdict: useful; the star of the roster, not dominant.** A 5-Coin unit
  that is a good garrison, a fair fighter, and a two-turn threat everyone can
  see.

### 12.6 Engineer

Cost 5, 10 HP, Attack 1, Defense 1, Move 1, no capture. Human peer: the
Captain (the same body).

| Opponent                        | It attacks the Engineer | To kill | Engineer attacks it         |
| ------------------------------- | ----------------------- | ------: | --------------------------- |
| Fighter                         | 6; 2                    |       2 | 2 (10 left); 6              |
| Guard                           | 4; 2                    |       3 | 1; 10, dies (Field Defense) |
| Knight                          | 10, dies; 0             |       1 | 2 (8 left); 2               |
| Goblin, Gang Up +2              | 10, dies; 0             |       1 | 3 (3 left); 1               |
| Caveman                         | 6; 2                    |       2 | 2 (8 left); 6               |
| Raptor with Pounce              | 10, dies; 0             |       1 | 2 (10 left); 2              |
| Grunt                           | 6; 0                    |       2 | 0 + 2 Shield; 4             |
| Ray Gunner, full power, range 2 | 10, dies; 0             |       1 | 0 + 2 Shield; 2             |
| Yeti (on Snow when attacked)    | 6; 2                    |       2 | 1 (8 left); 5               |
| Lich, range 2                   | 10, dies; 0             |       1 | 2 (8 left); 0               |

- **Repair** gives 4 HP to a machine and 2 to anything else: a Gunner at 4
  is back at 8, and a Titan at 9 needs seven Repairs to be full. It cures
  Plague, Bitten, and Chill.
- **Assemble** puts a Gunner at the front for 4 Coins
  ([section 9.2](#92-assemble)); the Engineer must stand there to do it.
- **Counters.** Anything that reaches it: a Knight, a Raptor, a Gang-Up
  Goblin, a ray, or a Lich kills it in one hit. Killing it ends the clockwork's
  only healing and the forward production.
- **Verdict: useful support, and the target.**

### 12.7 Steam Cannon

Catapult numbers (8 Coins, 10 HP, Attack 3.5, Defense 0.5, range 2–3), so
every exchange is the Catapult's:

| Target at range 2                   | Steam Cannon (and Catapult)                       |
| ----------------------------------- | ------------------------------------------------- |
| Fighter                             | 10 (2 left), then knocked back                    |
| Guard on Field Defense              | 7 (10 left)                                       |
| Guard on Walls + Field Defense      | 6 (11 left); **8 (9 left) with Blasting Charges** |
| Knight, Caveman, Lich               | 10, kills                                         |
| Grunt (Shield 2)                    | 9 + 2 Shield (1 left)                             |
| Ray Gunner (Shield 2)               | 8 + 2 Shield, kills                               |
| Yeti on Snow; in a Witch's Blizzard | 9, kills; 5 (4 left)                              |
| Ankylosaurus                        | 7 (13 left)                                       |

- **Knockback** is the difference: a survivor is pushed one tile straight
  back, off its center, off Field Defense, or out of a Blizzard.
- **Verdict: fine, rare** (tier 3, as every Catapult-role unit in Normal AI
  play).

### 12.8 Steam Tank

Cost 9, 16 HP, Attack 3, Defense 2, Move 2, Plated 4. Human peer: the Knight
(9 Coins, 10 HP, Attack 3, Defense 1, Move 3, Overrun).

- It deals exactly the Knight's damage (Fighter 8 with 4 back, Knight 10 and a
  kill, Catapult and Lich killed, a T-Rex 8 with 4 back).
- **Struck,** every hit is capped at 4: a Fighter deals 4 and takes 5, a
  Knight 4 and takes 4, a T-Rex, a Juggernaut, or a Troll 4 and takes 3, a
  Catapult or a Colossus 4; so every unit needs **four hits** for a fresh
  Tank, and four fresh Fighters kill it while losing 12 HP.
- **Duels** (alternating attacks): it beats a Knight, a Scrap Buggy, a
  Vampire, a Sabretooth, and a Mothership whoever strikes first; it loses to a
  T-Rex (which keeps 8 to 10 of 28 HP) and to a Juggernaut (27 of 40 left).
- **Counters.** Many cheap hits (four Fighters), Shatter on a Chilled Tank at
  5 to 7 HP, Mind Control at 6 HP or less, and the slow Move 2 (deep snow
  stops it).
- **Verdict: strong defensively, not dominant.** Without Overrun and capture
  it is a durable Knight that never chains kills. It is tier 3 and rare in
  Normal AI play. Watch: losses per Tank and the damage Plated prevented;
  the lever is Plated 5 or 6.

### 12.9 Brass Titan

36 HP, Attack 4, Defense 3, construct, reward only.

| Titan HP | A Fighter hits it | A Knight hits it | A Juggernaut hits it | It hits a Fighter |
| -------: | ----------------: | ---------------: | -------------------: | ----------------: |
|       36 |              4; 8 |             7; 7 |                10; 6 |         12, kills |
|       18 |              5; 6 |             9; 5 |                13; 4 |         12, kills |
|        9 |              7; 4 |      9, kills it |          9, kills it |         12, kills |

- Fresh Fighters kill it in **8 hits, losing 44 HP** (Juggernaut 10 hits,
  88; Troll 9, 50; Colossus 7, 32; Brontosaurus 11, 98).
- Duels: it loses to a Juggernaut and a Frost Giant whoever strikes first,
  and beats a Colossus and a Troll.
- Unflinching keeps its blow at 12 on a Fighter at any HP; wounded, it is
  finished like any unit, and it never heals except by Repair or Promotion.
- **Verdict: fixed** (the second draft's Unflinching defence is gone): a
  Juggernaut-class reward slightly below the Juggernaut.

### 12.10 Against the named opponents

- **Fighter (12 HP).** Hammerer and Fighter trade 5 and 5; dug in 4 and 8.
  A Fighter that attacks a dug-in Mole takes 10. Bomb plus Hammerer plus
  Hammerer kills one.
- **Guard on Field Defense and on Walls.** No Dwarf unit but the Steam Cannon
  breaks it: a Hammerer that attacks it dies (12 back), a Mole deals 2 or 3,
  a bomb a sure 4 (5). An eruption destroys its Field Defense; Blasting
  Charges lets the Cannon deal 8 through Walls and Field Defense.
- **Knight.** It deals a Hammerer 8 (7 dug in) and a Mole 7 (6), and kills a
  Gunner or an Engineer outright; the Steam Tank kills it, and a bomb plus
  any hit does.
- **Goblin pack.** Gang Up kills an open Hammerer in two hits; a dug-in one
  kills the first attacker with its retaliation. An eruption and a bomb kill
  a fresh Goblin together; blasts punish the surfaced pair.
- **Caveman and Raptor.** The Caveman is a Hammerer's even trade and dies
  attacking a dug-in Mole; the Raptor's Pounce deals 10 to an open Hammerer
  (8 dug in) and kills a Gunner, an Engineer, or a landed Gyrocopter.
- **Grunt and Ray Gunner.** Shields eat a full eruption of 2 and half a
  bomb; the Grunt is a Fighter with a Shield to the Hammerer (3 + 2 Shield,
  3 back); a full-power ray deals a Mole 7 and kills a Gunner, an Engineer,
  or a Gyrocopter.
- **Yeti with a Witch.** Cold Snap makes the Hammerer fall to two Yeti hits
  and a Gyrocopter to one; the Blizzard halves Gunner and Cannon shots on the
  Yetis around her (a Gunner deals 2 instead of 3); bombs and eruptions are
  not halved (a Yeti 9 → 5, 4 with Dive). A Yeti that attacks a dug-in Mole
  dies to the retaliation.
- **Lich.** It kills a fresh Gunner with one shot and deals a Hammerer 8;
  Plague never touches a construct. A Hammerer next to it deals 6 with no
  reply; two unmoved Gunner shots leave it at 1; a Dive bomb and one moved
  Gunner shot kill it.

### 12.11 The faction as a whole

- **Is it helpless against an early rush?** No more than Humans. At equal
  Coins with no technology a Dwarf home is slightly weaker than a Human one
  (the design's wave model: three Fighters and a Guard are four bodies for 9
  Coins); with each side's Fortification (Dig In against one Field Defense)
  the Dwarf home holds better, because every unmoved Hammerer and Mole on the
  nine tiles of each city is dug in for free.
- **Is it untouchable at home?** No. Dig In is one level, only around
  centers, only while standing still; Knights, Catapults, Charge!, Acid, the
  Disintegrator, and Boulders answer it, and a dug-in Hammerer on Walls is
  exactly a Human Fighter on Walls with Field Defense.
- **Does anything lock?** No. The mound is untouchable for one enemy turn and
  then stands in the open; Knockback is one tile; nothing roots or forbids an
  attack.
- **Dry Land.** Every pillar works without water: tunnels, eruptions, bombs,
  clockwork, Dig In, Assemble, Knockback, Plated.
- **Timing.** Gyrocopter and Mole from tier 1 (rounds 2 to 10), Dive, Dig In,
  the Gunner, and the Engineer from tier 2 (rounds 10 to 20); Cannon, Tank,
  and Blasting Charges at tier 3 (a minority of Normal matches); the Titan with
  level-5 cities.
- **Expansion is the weak spot.** No Dwarf unit captures faster than Move 1
  except the 5-Coin Mole; the Gyrocopter scouts but cannot capture, and the
  AI tunnels for expansion only if its optional rule passes the head-to-head
  test ([section 15](#15-normal-ai-requirements)). Expect cities at round 15 at or below the
  Humans' (the Martian profile), the opposite of the Ice Folk's problem.

**Matchups on Dry Land (expectation, not measurement):**

| Opponent | Expectation                                          | Why                                                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | Humans ahead, about 52–58%                           | Dig In equals Field Defense at home for free; eruptions destroy Field Defense; but the Raider out-races the Dwarves to villages in AI play, and Knights and Catapults break dug-in Hammerers.                                                                                           |
| Undead   | about even                                           | Constructs ignore the Banshee and Plague; the Lich kills Gunners in one shot; Restless Undead cannot heal abroad, where the Gyrocopter chips them; Skeletons mirror Hammerers.                                                                                                          |
| Goblin   | about even, swingy                                   | Gang Up into a dug-in Hammerer costs the Goblin its life, and an eruption plus a bomb kills a Goblin; in the open field packs overrun Hammerers, and blasts punish the surfaced pair.                                                                                                   |
| Dinosaur | Dwarves favoured: the likeliest best Dwarf pairing   | Eggs next to a surfacing Mole take 2 (3) and cannot step away; Cavemen and Yetis die attacking dug-in Moles; but Charge! ignores Dig In, a T-Rex beats the Tank, and Raptors kill Gunners, Engineers, and landed Gyrocopters. Watch Egg losses.                                         |
| Martian  | Martians favoured: the likeliest worst Dwarf pairing | Shields absorb a whole eruption of 2 and half of every bomb, and recharge every turn; Saucers and full-power rays kill landed Gyrocopters; the Brain takes six of eight roles. Blasting Charges (1 through) and an eruption before a bomb in the same turn (4 through) are the answers. |
| Ice Folk | Ice Folk ahead, about 52–58%                         | Cold Snap grounds Gyrocopters and Chilled ones shatter; the Blizzard halves Gunner and Cannon shots; tunnels and flight ignore Snow, a Yeti that attacks a dug-in Mole dies, and the Ice Folk's fast expansion is the problem.                                                          |

No pairing looks worse than 70 to 30 on paper. The two that could get there
are the Martians against the Dwarves and the Dwarves against the Dinosaurs
(root decision 9).

### 12.12 The root's decisions, checked

| Decision                                                      | Result with the engine formula                                                                                                                | Change                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Bomb 4 (Dive 5), flat, once per target per turn               | Never kills a fresh unit above 5 HP; with one more hit kills every 10-HP back-liner; 2 (3) through a Shield of 2. Weakest per Coin, not dead. | none; lever: the formula with Dive only |
| Unflinching on attack only                                    | The Titan takes 8 Fighter hits (44 back), between the Colossus and the Troll; a wounded Gunner is finished normally and still shoots full.    | none                                    |
| Gunner 3 Coins; 1 shot moved, 2 unmoved; no Move after firing | 3 / 6 on a Fighter against the Marksman's 5.                                                                                                  | none                                    |
| Hammerer at Fighter numbers; ride; Dig In                     | The Fighter's exchanges; dug in exactly a Fighter on Field Defense.                                                                           | none                                    |
| Dig In: center and its eight tiles, from `moved`              | Equal to Field Defense per fight; a dug-in Mole kills Cavemen and Yetis that attack it.                                                       | none; lever: Moles only                 |
| Mole 5 Coins, 16 HP, Tunnel 3, eruption 2 (3)                 | The ride kills one back-liner per cycle; the surfaced Mole usually dies next turn unless supported.                                           | none                                    |
| Rider: no settlement center on the surfacing turn             | The rider captures at the Raider's pace from 5–6 tiles, one turn earlier from 7.                                                              | none                                    |
| Engineer: Repair 4 / 2; Assemble 4 Coins                      | A Captain body that dies to one Knight hit at the front.                                                                                      | none; lever: Assemble 5                 |
| Steam Cannon: Catapult with Knockback                         | Catapult numbers.                                                                                                                             | none                                    |
| Steam Tank: Plated 4, no Overrun                              | Four hits from anything; beats Knights, loses to a T-Rex and a Juggernaut.                                                                    | none; lever: Plated 5–6                 |
| Brass Titan: 36 / 4 / 3                                       | Slightly below the Juggernaut.                                                                                                                | none                                    |

## 13. Interactions with existing rules

One ruling each. "Off the board" means burrowed
([section 5.3](#53-the-mound-visible-and-untouchable)).

### 13.1 Human abilities

| Rule                 | Interaction                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field Defense, Walls | An eruption destroys Field Defense on the Mole's tile and the eight around it, whoever owns it (`UNDERMINED`); Walls are untouched. Bombs and eruptions ignore both (fixed damage). Dig In and Field Defense never stack on a Dwarf unit. |
| Catapult             | Destroys Field Defense, never Dig In (not a tile layer). It out-ranges every Dwarf unit but the Steam Cannon and deals a dug-in Hammerer on Walls 6.                                                                                      |
| Juggernaut, Push     | A Juggernaut pushes a surfaced Mole or a dug-in Hammerer under the ordinary conditions; the unit keeps its `moved` flag, and Dig In is read on its new tile. Never onto a mound.                                                          |
| Knight, Overrun      | Ordinary. A Knight's kill of a surfaced Mole may continue its Overrun. The Steam Tank has no Overrun.                                                                                                                                     |
| Raider               | Charge and Escape are ordinary; an Escape Move never ends on a mound.                                                                                                                                                                     |
| Rally                | Ordinary for Humans; the Engineer has no Rally.                                                                                                                                                                                           |
| Tend Wounded         | Human and Dinosaur healers cannot tend Dwarf units (own units only). The Engineer's Repair is Tend Wounded with machine healing 4.                                                                                                        |

### 13.2 Undead rules

| Rule       | Interaction                                                                                                                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves     | A Dwarf unit that dies leaves a Grave like any land unit, **except a construct** (never). Eruption and bomb kills of other factions' units leave ordinary Graves. No Grave lies on a Rift.                                                   |
| Raise Dead | Unchanged; never onto a mound tile (the occupancy predicate). A Grave under a mound cannot be raised until the mound surfaces.                                                                                                               |
| Infect     | A living Dwarf unit killed by a Zombie rises as the Zombie's owner's Zombie. A construct does not rise. A burrowed unit cannot be infected.                                                                                                  |
| Bitten     | Living Dwarf units are bitten as usual; Repair cures it. A Bitten victim of an eruption or a bomb rises as its biter's Zombie. Constructs are never Bitten.                                                                                  |
| Plague     | Applies to living Dwarf units, never to constructs. A burrowed Plagued unit keeps its entry; it surfaces before Plague resolves, so it takes its damage on the board. Plague never spreads to or from a mound. Repair cures it.              |
| Wail       | Targets living Dwarf units only: never a construct, never a mound. A Wail is not an attack, so Dig In counts for its cover-and-fortification reading as today (1 on a dug-in Hammerer, 2 in the open).                                       |
| Lich       | Its shot is ordinary: 10 on a fresh Gunner (a kill), 8 on a Hammerer (7 dug in), 7 on a Titan from range 3. Its Plague skips constructs. A Gyrocopter that bombs a Lich lands next to it, where the Lich (minimum range 2) cannot strike it. |
| Lifesteal  | Works on every Dwarf unit, constructs included. A Vampire deals a Hammerer 8 and a Gunner 10, unanswered.                                                                                                                                    |
| Restless   | An Undead rule only. Dwarf units recover under the Human rule, except constructs, which never recover.                                                                                                                                       |
| Frenzy     | Ordinary.                                                                                                                                                                                                                                    |

### 13.3 Goblin rules

| Rule         | Interaction                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gang Up      | Unchanged; it does not ignore Dig In: a Goblin with two helpers deals a dug-in Hammerer 8 and dies to its retaliation (6).                                                                                                                 |
| Kaboom       | Fixed damage: ignores Dig In and Walls; Plated caps it at 4 on a Steam Tank. A Kaboom never finds a mound; it destroys Field Defense on a mound tile like on any tile.                                                                     |
| Death blasts | An exploding unit killed by an eruption or a bomb explodes as usual: the blast hits the surfaced Mole and rider, or the Gyrocopter on its landing tile (a bomb that kills a Rocket Cart or a Scrap Buggy blasts the Gyrocopter beside it). |
| Plunder      | A Goblin seat earns 1 Coin for each Dwarf unit its units or blasts kill, constructs included. Bomb and eruption kills are Dwarf kills and earn nobody Plunder.                                                                             |
| WAAAGH!, Ram | Ordinary.                                                                                                                                                                                                                                  |
| Troll        | A `JUGGERNAUT`: ordinary against the Dwarves; the Titan beats it one on one.                                                                                                                                                               |

### 13.4 Dinosaur rules

| Rule            | Interaction                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eggs            | An Egg on the eight tiles around a surfacing Mole takes 2 (3); a 6-HP Egg survives at 4 (3), a 10-HP Egg with Nesting at 8 (7). A bomb on an Egg leaves 1 (a Dive bomb destroys it). No Egg is laid on a mound tile. A destroyed Egg counts as the Mole's or the Gyrocopter's kill. |
| Growth          | A dinosaur grows from killing Dwarf units as from any kill; eruption and bomb kills of dinosaurs count for the Mole and the Gyrocopter, not for growth.                                                                                                                             |
| Charge!         | The Triceratops ignores the fortification of a dwarf, Dig In included; its push and follow never end on a mound.                                                                                                                                                                    |
| Acid            | Ignores Dig In like all fortification.                                                                                                                                                                                                                                              |
| Armoured        | Takes 1 off an eruption and a bomb (an Ankylosaurus loses 1 and 4).                                                                                                                                                                                                                 |
| Wallbreaker     | Removes the Walls levels; Dig In stays, like Field Defense.                                                                                                                                                                                                                         |
| Pounce, Rampage | Ordinary; a T-Rex's Rampage never ends on a mound.                                                                                                                                                                                                                                  |
| Two-slot units  | Never knocked back by the Steam Cannon (the Push rule).                                                                                                                                                                                                                             |

### 13.5 Martian rules

| Rule               | Interaction                                                                                                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shields            | A Shield absorbs an eruption and a bomb first: an eruption of 2 does nothing to a full Shield of 2 (3 puts 1 through); a bomb puts 3 through (Dive 4); a Force Field's 4 lets 1 of a bomb through (2 with Dive). An eruption at Start Turn strips the Shield for the rest of the Dwarf turn, so a later bomb deals 5. |
| Mind Control       | Constructs are immune (`TARGET_IMMUNE`); the Hammerer, Gyrocopter, Mole, Engineer, Cannon, and Tank are targets under the ordinary conditions. A mound is never a target. A Gyrocopter on a Rift is immune (the Rift rule).                                                                                           |
| Thralls            | A Thrall made from a Dwarf unit is a Martian Grunt-statted unit: no Dwarf rule applies to it.                                                                                                                                                                                                                         |
| Tractor Beam       | Pulls Dwarf units under its rules (a dug-in unit keeps its `moved` flag; Dig In is read on its new tile); never targets a mound, never pulls onto one.                                                                                                                                                                |
| Beam Down          | Never onto a mound tile.                                                                                                                                                                                                                                                                                              |
| Pierce             | Hits the unit directly behind the target; a mound there is not a unit and is not hit.                                                                                                                                                                                                                                 |
| Flyers and walkers | **Eruptions never hit flyers** (Saucer, Mothership); they hit walkers (Tripod, Colossus), which stand on the ground. Bombs hit any form, flyers included.                                                                                                                                                             |
| Disintegrator      | Ignores Dig In like all fortification.                                                                                                                                                                                                                                                                                |
| Saucer             | Same flight rule as the Gyrocopter; a Saucer with Strafe kills a landed Gyrocopter (8 of 8).                                                                                                                                                                                                                          |

### 13.6 Ice Folk rules

| Rule               | Interaction                                                                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Snow               | Tunnels ignore Snow; a surfaced unit stands on Snow like any ground unit. Deep snow stops only Moves of 2 or more: the Steam Tank (Move 2) stops on entering Snow; the Gyrocopter flies and ignores it; the other Dwarf units have Move 1.   |
| Chill and Shatter  | Every Dwarf unit can be Chilled in land form and shattered (constructs too; never the Titan, a `JUGGERNAUT`). A mound cannot be Chilled. A Chill entry stays on a burrowed unit and counts down at its owner's End Turn. Repair cures Chill. |
| Sluggish           | A sluggish Gyrocopter cannot bomb (it may Move); a sluggish Mole may tunnel (a Move) and a sluggish Hammerer may ride; a sluggish Gunner that has not moved fires twice; a sluggish Engineer that moved can neither Repair nor Assemble.     |
| Cold Snap          | A Gyrocopter within 2 of a Witch is Chilled and cannot bomb on its next turn; a Chilled Gyrocopter is shattered by one Yeti hit (6 of 8).                                                                                                    |
| Blizzard           | Halves a Gunner's or a Cannon's shot from distance 2 or more on an Ice Folk unit of the Witch's seat in her Blizzard (a Gunner 3 → 2). It never halves a bomb or an eruption (not attacks), nor a Gunner shot from distance 1.               |
| Snow cover         | An Ice Folk defender on Snow has cover against Dwarf attacks; bombs and eruptions ignore cover.                                                                                                                                              |
| Plated and Shatter | The Shatter test reads the Tank's HP after the 4-cap: a Chilled Tank at 5 to 7 HP is shattered by a Yeti hit.                                                                                                                                |
| Cold Aura          | Chills Dwarf units next to a Frost Giant; never a mound.                                                                                                                                                                                     |

### 13.7 Rift

- **Tunnels pass under a Rift:** a Rift tile may lie on the tunnel's
  sequence of steps ([section 5.1](#51-the-tunnel-command), step 6).
- **A tunnel never ends on a Rift,** and a rider's tile is never a Rift:
  only flyers stand there, so a surfacing Mole could not.
- **Gyrocopters may stand on a Rift** as flyers (the Martian rule): they
  land there from a bombing run as from a Move. A Gyrocopter on a Rift is
  attacked, bombed, and Chilled like any unit; it leaves no Grave there and
  is immune to Mind Control there.
- **No eruption case:** a unit on a Rift is a flyer, and flyers are never hit
  by an eruption. A Rift is never a mound tile.
- **Assemble and Knockback** never put a ground unit on a Rift.

### 13.8 Cities, siege, capture, and capacity

- **Capture-capable Dwarf units:** Hammerer, Clockwork Gunner, Steam Mole,
  and Brass Titan. The Gyrocopter, the Engineer, the Steam Cannon, and the
  Steam Tank cannot capture.
- **Siege.** A Dwarf unit on a hostile center besieges it like any unit; a
  mound is never on a center and never besieges; a Gyrocopter never stands on
  a foreign or neutral center. The Mole may step onto a center on its
  surfacing turn (and capture on the next); the rider may not.
- **Knockback** can empty a center; a capture still needs a unit that begins
  its turn there.
- **Capacity.** Every Dwarf role uses one slot; burrowed units keep theirs;
  Assemble uses the Engineer's home city's; Dwarf cities have no capacity
  bonus; a reward Titan may exceed capacity.
- **Training.** Every Dwarf land unit except the Titan is trained on the city
  center with `TRAIN`, with the ordinary gates; the Gunner can also be
  Assembled.
- **Dig In** is around the seat's own centers only; a captured city's ring
  stops counting at once, and a city the Dwarves capture starts counting at
  once (for units that have not moved).
- **Land Grant, Spoils, rewards, the city action:** unchanged. Tunnel, Bomb
  Run, and Assemble spend no city action.

### 13.9 Zone of control, pass-through, and Roads

- Tunnels ignore zones of control; a mound exerts none; surfaced units exert
  and suffer it. A Gyrocopter ignores hostile zones of control and exerts
  none (the flyer rule).
- A Move may pass over a mound tile; nothing stands there to block or
  pass-through.
- Roads: ordinary for every Dwarf unit; a tunnel and a bombing run ignore
  them.

### 13.10 Boats, embarking, and water

- **Do the Dwarves need boats?** Yes, like the Humans: their foot and machine
  units (all but the Gyrocopter) embark at an own Port or Shipyard with
  Shorecraft, and they train the Patrol Boat and the Battleship. The boats
  have the Human rules and numbers and are drawn in the Dwarf style
  ([section 16.4](#164-what-the-art-bead-must-draw)).
- **Gyrocopters fly over water:** Shallow Water always, Deep Water with
  Navigation, and self-launch where a Move or a bombing run ends on water
  (the Martian flyer rule): afloat a Gyrocopter is an ordinary embarked unit
  (Move 2, no bomb), drawn as itself over the water, and lands with
  `DISEMBARK`.
- **A Mole never tunnels under water:** every tile of a tunnel is land.
- Eruptions skip naval and embarked units. Bombs may target them. Repair
  targets own land-form units only.
- A Dwarf land unit embarks and lands under the ordinary rules; an embarked
  unit is never dug in (it is not in land form).

### 13.11 Fog and observation

- A mound is public on every explored tile, like a unit; the tunnel's start
  and end are projected to viewers who have explored them; a Move that meets
  a mound first seen during the Move is interrupted (`MOUND`).
- `UNIT_TUNNELLED`, `UNIT_SURFACED`, `UNIT_BOMBED`, and `UNIT_ASSEMBLED` are
  projected like `UNIT_MOVED`, `UNITS_RALLIED` (results filtered to visible
  units), `COMBAT_RESOLVED`, and `UNIT_TRAINED`: a viewer sees the fields
  about tiles and units it can see; a viewer that owns an eruption victim
  receives its own entry even when it cannot see the Mole (with `unitId`
  null).
- `eruptionDamage` and `bombDamage` of a visible Dwarf unit are public (they
  reveal Blasting Charges and Raiding), so previews of eruptions and bombs on
  one's own units are exact (the Ice Folk precedent for the Shatter
  threshold). `bombedThisTurn` and `surfacedThisTurn` are public for visible
  units.
- Every Dwarf preview is exact: tunnels and Assemble read only explored
  tiles, bombs a visible target and an explored landing.
- Capacity, city actions, research, and Coins stay owner-private.

### 13.12 Promotion, Disband, achievements

- **Promotion** is the ordinary rule for every Dwarf unit (3 kills, +5
  maximum HP, a full heal), constructs included: it is a construct's only full
  heal. Eruption, bomb, and retaliation kills are credited.
- **Disband:** Hammerer, Gyrocopter, Gunner, Mole, Engineer, Cannon, Tank;
  never the Titan; never a burrowed unit.
- **Achievements** ([revision 21](RULESET_7_REVISION_21_ACHIEVEMENTS.md)) are
  unchanged and name no faction rule. Muster counts the Dwarf trainable roles
  owned **on the board** (a burrowed unit counts again when it surfaces; an
  assembled Gunner counts); Slayer counts eruption and bomb kills.

### 13.13 Starting units, rewards, and treasure

| Source                             | Human      | Undead      | Goblin      | Dinosaur     | Martian   | Ice Folk    | Dwarf                          |
| ---------------------------------- | ---------- | ----------- | ----------- | ------------ | --------- | ----------- | ------------------------------ |
| Starting units                     | Fighter    | Skeleton    | one Goblin  | one Caveman  | one Grunt | one Yeti    | one Hammerer                   |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    | two Goblins | one Caveman  | one Grunt | one Yeti    | one Hammerer                   |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination | Troll       | Brontosaurus | Colossus  | Frost Giant | Brass Titan                    |
| Treasure chest unit                | Knight     | Vampire     | Scrap Buggy | Raptor       | Saucer    | Sled        | **Gyrocopter** (role `RAIDER`) |

Reward and treasure units arrive at full HP, exhausted until their owner's
next Start Turn (so a Militia Hammerer is not dug in on its first enemy
turn). `treasureUnitRole` is `RAIDER` for the Dwarf registration (the
Dinosaur, Martian, and Ice Folk precedent); a treasure Gyrocopter needs a
city with a free slot, otherwise the chest gives 5 Coins.

### 13.14 One faction per player

The rule of `pulp_wars-w5j.1` (every player plays a different faction,
identity `pulp-wars-poc-7r29`) and `pulp_wars-w5j.3` (faction looks replace
the coloured base plates):

- **`pulp_wars-w5j.1` lands first; the Dwarf engine bead lands after it.**
  A setup with two seats of one faction is rejected with
  `DUPLICATE_FACTION`, except under the test-only `allowDuplicateFactions`
  option. `pulp_wars-78i.3` must add `DWARF` to every list that rule keeps:
  the distinct-faction defaults (the default faction assignment of setups,
  AI seats, the headless tools, and the Showcase) and the faction option
  lists (the setup UI select, the headless `--factions` values, and any
  validation that enumerates the factions), with a test that a setup with a
  Dwarf seat and six others' seats is legal and a duplicate Dwarf seat is
  `DUPLICATE_FACTION`.
- With seven factions and at most four seats the rule is always satisfiable;
  setup legality, the setup UI, the headless tools, the AI setups, and the
  Showcase treat `DWARF` like the other six.
- **There is no Dwarf mirror.** Two Dwarf seats never meet, but every rule
  here is written per seat anyway (`bombedThisTurn` and `surfacedThisTurn`
  belong to the active seat; Dig In reads its own owner's cities), so the
  engine stays correct if a test builds a mirror with
  `allowDuplicateFactions`. The balance matrix has no `WW` pairing.
- **Ownership is shown by the Dwarf look alone** (plus borders and pennants):
  the art must not be confused with another faction at 32 px, which is what
  the lineup of [section 16.4](#164-what-the-art-bead-must-draw) checks. Dwarf
  boats are Dwarf-styled like every faction's.
- Every Dwarf test setup obeys the distinct-faction rule, or names
  `allowDuplicateFactions` explicitly.

## 14. Commands, events, errors, state, and queries

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `TUNNEL`, `BOMB_RUN`, and
`ASSEMBLE`, in that order, immediately after `COLD_SNAP`:

- `TUNNEL { kind, unitId, to, rider: null | { unitId, to } }`
  ([section 5.1](#51-the-tunnel-command));
- `BOMB_RUN { kind, unitId, targetUnitId, to }`
  ([section 6.2](#62-the-bomb-run-command));
- `ASSEMBLE { kind, unitId, to }` ([section 9.2](#92-assemble)).

`MOVE` refuses mound tiles, the rider's foreign centers on its surfacing turn,
and a Gunner after a shot; `ATTACK` allows the Gunner's second shot and is
never offered to a Gyrocopter; `TEND_WOUNDED` heals machines 4; `RECOVER` is
refused for constructs. A pending city reward blocks the new commands like
every command.

**State.** Three new lists, hashed, saved, and replayed like `chilled`:
`burrowed` ([section 5.2](#52-burrowed-units-state-and-the-one-accessor)),
`surfacedThisTurn` ([section 5.4](#54-surfacing-and-the-eruption)), and
`bombedThisTurn` ([section 6.3](#63-the-bomb)). `PlayerViewV7` gains the
same three, filtered by visibility. Dig In stores nothing.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts four kinds:

```text
UNIT_ASSEMBLED { playerId, unitId, assembledUnitId, at, cityId, cost }          // after UNIT_TRAINED
UNIT_TUNNELLED { playerId, unitId, from, to, riderUnitId, riderFrom, riderTo }  // after UNIT_PULLED
UNIT_SURFACED  { playerId, unitId, at, riderUnitId, riderAt, eruptionDamage,
                 results: [{ unitId, at, damage, shieldDamage, dies }] }        // after UNIT_TUNNELLED
UNIT_BOMBED    { playerId, unitId, from, to, targetUnitId, at, damage,
                 shieldDamage, killed }                                         // after COMBAT_RESOLVED
```

- `UNIT_DIED.cause` gains `BOMB` and `ERUPTION`.
- `FIELD_DEFENSE_DESTROYED.reason` gains `UNDERMINED`.
- `UNIT_MOVE_INTERRUPTED.reason` and the movement failure reasons gain
  `MOUND`.
- Knockback reuses `UNIT_PUSHED`; Repair reuses `WOUNDED_TENDED`.
- There is no event for Dig In, which is derived.

**Combat preview.** `CombatPreviewV7` (and therefore `COMBAT_RESOLVED`)
gains three fields, neutral for every attack with no Dwarf unit:

| Field                | Meaning                                                                                          | Neutral |
| -------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| `dugIn`              | the defender is dug in; its level is in `fortificationLevel`                                     | false   |
| `unflinchingApplied` | the attacker is a construct and its force used its maximum HP                                    | false   |
| `platedApplied`      | a hit on a Plated unit was capped; `damageToDefender` / `damageToAttacker` are the capped values | false   |

Blasting Charges reports its removed levels in the existing
`fortificationIgnored`; Knockback uses the existing `push` field;
`attacksRemaining` reports the Gunner's second shot.

**Errors.** `RuleErrorCodeV7` gains `TUNNEL_NOT_LEGAL` (reasons `EMBARKED`,
`SURFACED`, `DESTINATION`, `RIDER`, `RIDER_DESTINATION`), `BOMB_RUN_NOT_LEGAL`
(reasons `EMBARKED`, `SLUGGISH`, `OUT_OF_RANGE`, `ALREADY_BOMBED`,
`LANDING`), and `ASSEMBLE_NOT_LEGAL` (reasons `EMBARKED`, `NO_HOME`).
`RECOVER_NOT_LEGAL` gains the reason `CONSTRUCT`. A command naming a burrowed
unit is `UNIT_ALREADY_HANDLED`; the rider's forbidden center is
`MOVEMENT_ILLEGAL` with reason `SETTLEMENT_FORBIDDEN`.

**Registration.** Faction `DWARF`, tree `DWARF_BASELINE_V1`, display name
"Dwarf"; unlock kinds `ENGINEER_SUPPORT`, `ASSEMBLE`, `DIVE`, `DIG_IN`, and
`BLASTING_CHARGES`; capabilities `digIn`, `assemble`, `bombDamage`,
`eruptionDamage`, and `cannonIgnoresFortification`; abilities
`RIDES_TUNNEL`, `DIG_IN`, `BOMB_RUN`, `CLOCKWORK`, `TWIN_SHOT`, `TUNNEL`,
`ERUPTION`, `ASSEMBLE`, `KNOCKBACK`, and `PLATED` (Repair keeps the
`TEND_WOUNDED` literal); role mechanics `construct`, `unflinchingAttack`,
`repairsAsMachine` (on the targets), `repairMachineHeal` (4, on the
Engineer), `digsIn`, `tunnelRange`, `ridesTunnel`, `bombs`, `unmovedShots`,
`knockback`, and `plated`, with `capacitySlots` 1, `buildsFieldDefense` false, and
`advancesAfterKill` false for the Gyrocopter, the Gunner, and the Cannon;
faction rule `treasureUnitRole` `RAIDER`; and the constants
`TUNNEL_RANGE_V7` 3, `ERUPTION_DAMAGE_V7` 2, `BLASTING_ERUPTION_DAMAGE_V7` 3,
`BOMB_RANGE_V7` 2, `BOMB_DAMAGE_V7` 5, `DIVE_BOMB_DAMAGE_V7` 6,
`GUNNER_UNMOVED_SHOTS_V7` 2, `DIG_IN_RADIUS_V7` 1, `REPAIR_MACHINE_V7` 4,
`ASSEMBLE_COST_V7` 4, and `PLATED_CAP_V7` 4. Internal field names are the
implementer's choice; the serialized literals of this section are normative.
`assertRuleset7Registry` must accept the seventh tree unchanged (same node
IDs, tiers, branches, prerequisites, and tactical-role labels).

**Derived queries.** For canonical state and for a view:

- `boardUnitsV7`, `allOwnedUnitsV7`, and `tileOccupiedV7`
  ([sections 5.2](#52-burrowed-units-state-and-the-one-accessor) and
  [5.3](#53-the-mound-visible-and-untouchable));
- `isLivingUnitV7` ([section 2.3](#23-faction-model));
- `unitIsDugInV7(state | view, unit)` ([section 8](#8-dig-in)), used by the
  fortification helper and by the UI.

**Public queries.**

```text
previewTunnelV7(view, command)  → null | { unitId, to, riderUnitId, riderTo, eruptionDamage, projected: true,
                                           eruptionTargets: [{ unitId, at, damage, shieldDamage, dies }],
                                           undermines: CoordV7[] }
previewBombRunV7(view, command) → null | { unitId, targetUnitId, to, damage, shieldDamage, kills,
                                           blast: [...], landingThreat }
previewAssembleV7(view, unitId) → null | { unitId, cost, cityId, usedSlots, capacity, tiles: CoordV7[] }
```

- `queryPlayerCommandsV7` offers, for a Dwarf seat: `TUNNEL` for every legal
  `(Mole, to, rider)` (one entry per destination and per rider tile, plus the
  rider-less entry), `BOMB_RUN` for every legal `(Gyrocopter, target, to)`,
  `ASSEMBLE` for every legal `(Engineer, to)`, the Gunner's second shot, and
  Repair. It never offers `ATTACK` for a Gyrocopter, `RECOVER` for a
  construct, `MOVE` for a Gunner that fired, a Move onto a mound, a rider's
  foreign center on its surfacing turn, any command for a burrowed unit, or
  Field Defense or Rally to a Dwarf seat. Every offered command is accepted.
- Three new previews, each null unless the command is offered (shapes
  below): `previewTunnelV7` gives the eruption **as if it happened on the
  current board** (the targets may move before it does; the UI says so, and
  the result carries `projected: true`); `previewBombRunV7` gives the exact
  bomb, the blast of a killed exploding target (entries shaped like
  `previewAttackExplosionsV7`'s), and `landingThreat`, the damage the visible
  enemies could deal the Gyrocopter at `to` next turn (from
  `queryThreatenedTilesV7`); `previewAssembleV7` gives the cost, the slot,
  and the free tiles.
- `queryCombatPreviewV7` and `estimateCombatV7` include Dig In (from the
  defender's current `moved` flag; an estimate for an attack on a unit that
  will move first is the caller's choice), Unflinching, Plated, Blasting
  Charges, the Gunner's allowance, and Knockback.
- `queryThreatenedTilesV7` gives a visible Gyrocopter its bombing reach
  (every tile within Chebyshev 2 of its tile, for one bomb of its
  `bombDamage` with no reply) and no ordinary attack reach; each mound its
  eruption ring (the eight tiles, for `eruptionDamage`) and its surfacing
  reach (Move 1 and an attack: the tiles within 2 of the mound, for the Mole
  and for a rider); and a Gunner range 2 from every tile it can reach (one
  shot after a Move, two from where it stands).
- `publicUnitStatsV7` carries, for every unit when a Dwarf seat is in the
  match, `bombedThisTurn` and `surfacedThisTurn` (booleans), and for units of
  a Dwarf seat a `dwarf` block: `construct`, `machine`, `dugIn`,
  `digsIn`, `shotsLeft` (Gunner), `plated` (4 or null), `tunnelRange`,
  `eruptionDamage`, `bombDamage`, and `burrowed` (for a mound's record).
- `PublicPlayerV7` and the leaderboard carry `DWARF` and `DWARF_BASELINE_V1`.
- Every preview equals the resolution, except the tunnel preview's eruption
  (a forecast, flagged `projected: true`).

## 15. Normal AI requirements

Normal AI plays as and against the Dwarves (`pulp_wars-78i.4`) with every
existing guarantee: deterministic and PRNG-free, only the public view, public
commands, and public previews, at most 128 accepted commands per owner turn
through bounded resumable work, and no change to decisions in matches without
a Dwarf seat (every Dwarf heuristic is gated on a match with a Dwarf seat, in
a new `src/ai/v7-dwarf.ts`, or reads a fact only such a match has: a mound, a
`dwarf` stat block, a `bombedThisTurn` entry). It builds on the campaign plan
of [`pulp_wars-9s0.1`](../architecture/NORMAL_AI.md#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01).

From `pulp_wars-78i.3` on, a Dwarf seat must already play complete headless
matches without a policy error or stall, using the ordinary policy on the
Dwarf registration (it never tunnels, bombs, or assembles there).

**The user's rule for AI changes.** A change to a strategy heuristic comes
with a modest head-to-head or win-tendency test, not only behaviour
telemetry: the same seeds, mirrored seats, a few dozen decided games. For
this bead: the Dwarf policy against the ordinary policy playing the Dwarf
registration (the `78i.3` baseline), against the same opponents; and each
"against the Dwarves" rule against the policy without it. A rule that does
not tend to win is dropped, however sensible it reads.

As the Dwarves it must at least:

- **use the Mole (the Mole AI rule):**
  1. _defence:_ an invader the Mole can reach by walking (Move 1 and an
     attack) is walked to and hit; it tunnels only toward an invader 3 or 4
     tiles away, to an offered destination next to it; it never tunnels off a
     city center it garrisons alone;
  2. _offence:_ on a Pressure job only (**never on an Expansion job**), it
     tunnels when the route to its target is 4 or more steps or blocked by
     terrain or zone of control, to the offered destination with the highest
     score (2 for each hostile ground unit adjacent, 3 more for each of them
     with the `CATAPULT`, `MARKSMAN`, or `CAPTAIN` role, plus the route
     progress), skipping destinations
     next to three or more hostile melee units unless next to the target's
     center;
  3. _rider:_ when it tunnels, it takes an adjacent fresh Hammerer if a rider
     tile is offered, choosing the tile next to the most attackable hostile
     units; as a tie-break, a Hammerer on the same job ends a routine Move
     next to a Mole;
  4. _after surfacing:_ the Mole and the rider attack through the ordinary
     attack choice, softest neighbour first (the previews know the eruption
     has happened);
  5. _optional, expansion (root ruling 4):_ the AI bead may add a rule that
     tunnels on an Expansion job, with a rider when one is offered, toward a
     neutral village 5 to 8 tiles away when no own unit can reach it sooner
     by walking. It is **kept only if a head-to-head test shows it tends to
     win** against the same policy without it; otherwise rule 2's "never on
     an Expansion job" stands. The bead records the test either way;
- **choose the Gyrocopter's targets:** score each offered `BOMB_RUN` by
  `min(bombDamage, target HP)`, plus the kill bonus when it kills, plus the
  role bonus of a `CATAPULT`, `MARKSMAN`, or `CAPTAIN`-role target, minus
  `previewBombRunV7.landingThreat`; take the best above zero; bomb before the
  melee attacks when the bomb sets up a kill this turn (a target at most the
  bomb plus one previewed hit), after them when it finishes a wounded unit;
  otherwise the Saucer's scout and picket jobs. Never land where the landing
  threat is 8 or more unless the bomb kills a `CATAPULT` or `CAPTAIN`-role
  unit;
- **hold the Gunner:** with a target in range from where it stands, fire
  twice without moving; otherwise move toward the wave's target and fire once
  only if the shot kills or nothing better is offered; act after the bombs
  and before the melee units;
- **Assemble at the front:** an Engineer on a Pressure job, or within 3 of a
  visible hostile unit, with a free slot at home, the Coins, and
  Marksmanship, Assembles on the offered tile nearest the target that is not
  adjacent to a visible hostile melee unit; this is land production, at the
  same priority as `TRAIN` and before it when the home city is more than 4
  tiles from the target;
- **Repair:** an Engineer Repairs when an adjacent own unit is damaged,
  valuing HP on a construct double; it ends its Moves next to the most
  wounded construct of its wave and not next to a visible hostile melee unit
  when it can;
- **hold Dig In:** a Hammerer or Mole within 1 of an own center, with a
  visible hostile unit within 3 and no attack worth taking (the existing
  "harmful attack" test with the dug-in preview), holds its tile instead of
  stepping out; previews carry the level, so the AI never counts a unit as
  dug in after a planned Move;
- **use the Steam Cannon** like a Catapult, preferring a shot whose
  Knockback empties a hostile center, removes a unit from Field Defense, or
  pushes it next to own melee units;
- **judge units by their abilities, not their labels:** the Gyrocopter has
  no attack and never captures; the Mole is a front-line unit that may attack
  after moving, not a garrison only; the Engineer has no Rally;
- **produce every role:** the ordinary production value plus a
  first-of-role bias for the Mole, the Gunner, the Engineer, the Cannon, and
  the Tank (the Gyrocopter already gets the `RAIDER` bias); train Hammerers or
  a Mole first under threat;
- **research toward its roles:** Scouting as the free opening technology
  unless a hostile unit is in sight, then Drill; Raiding and Marksmanship once
  the seat owns two cities; Administration once it owns a Gunner or two Moles;
  Dig In once an own city has been threatened (a visible hostile unit within
  3 of a center); Blasting Charges against a visible Walled city or a Martian
  seat; then Sawmilling and Chivalry.

Against the Dwarves it must at least:

- **read the mounds:** each mound's eight tiles take its `eruptionDamage` at
  the Dwarves' next Start Turn; do not end a routine Move there with a ground
  unit whose HP (plus Shield) is at most that damage, with an Egg-laying
  tile, or with a ranged unit that has another tile; add each mound's
  surfacing reach to the next-turn threat map;
- **read the Gyrocopters:** a visible Gyrocopter threatens `bombDamage` on
  each unit within 2 that has a free landing tile beyond it, once per unit;
  count it in lethal-reach estimates; attack a Gyrocopter that landed next to
  an own unit (8 HP, Defense 1) before an equal target;
- **focus the Engineer:** a visible Engineer is worth its cost plus a share
  of every own-wave construct within 2 of it (the Necromancer precedent);
- **punish the surfaced pair:** a surfaced Mole or rider abroad is not dug
  in: the ordinary attack choice already sees that in the previews; no extra
  rule unless the head-to-head test asks for one;
- **not attack dug-in units for nothing:** the existing harmful-attack test
  with exact previews; bring siege or units that ignore fortification;
- **Martian seats:** nothing new (Shields already absorb in the previews).

Headless matches of the Dwarves against each faction must finish without
stalls or policy errors, and the tactical benchmark
([tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md)) or unit
tests gain Dwarf scenarios: a Mole that walks to a near invader instead of
tunnelling; a Mole that tunnels with a rider next to an enemy Catapult; a
Mole that does not tunnel off a center it garrisons alone; a Gyrocopter that
bombs the wounded Catapult and lands on the safe side; a Gyrocopter that does
not land between two Fighters; a Gunner that fires twice instead of moving;
an Engineer that Assembles at the front and Repairs a construct; a dug-in
Hammerer that holds; an opponent that moves a 2-HP unit off a mound's ring;
an opponent that kills the Engineer first.

### 15.1 Implementation status (`pulp_wars-78i.4`)

The Dwarf policy is in `src/ai/v7-dwarf.ts` and its calls in
`src/ai/v7.ts`; the rules, values, and measurements are in the
[Normal AI document](../architecture/NORMAL_AI.md#dwarf-play-pulp_wars-78i4).
Every rule above is implemented, with these readings and measured
deviations:

- **The switch.** `DwarfPolicyOptionsV7` turns the Dwarf seat's rules, the
  "against the Dwarves" group, and the optional expansion tunnel on and off
  for the head-to-head tests; the shipped policy plays the first two. With
  both off it decides as the `78i.3` baseline did, byte for byte.
- **The Mole.** One `TUNNEL` per Mole is planned and the other offers are
  pruned before scoring (each destination is scored once from the visible
  units, and only the chosen destination's rider tiles are compared). The
  tunnel preview's eruption is a forecast, so it is used to choose a tile
  and never counted as damage. Two readings: "garrisons alone" is an own
  center with no other own land unit next to it; and a Pressure tunnel
  that erupts on nobody must gain two route steps and land within 3 of
  another own land unit (the Mole surfaces next to its wave).
- **The Gyrocopter** subtracts **half** the landing threat in its score
  (the hard limit of 8 stands): with the whole threat it refused most runs
  (14 bombs in 64 head-to-head seat-games) and won no more games. It
  previews exactly only its three best runs by the policy's own danger
  estimate.
- **Production and research** were cut back from the first draft, which
  lost its head-to-head by training Gyrocopters and Engineers early: the
  first Gyrocopter comes at war with four front units (then one per five),
  the Engineer once it has work (Marksmanship, or two machines to mend) at
  war with four front units, and Scouting only with four front units;
  Raiding waits for a Gyrocopter.
- **Optional rule 5 (expansion tunnel)** is implemented behind the switch and
  **dropped**: 31 of 60 decided games against the policy without it, and no
  city gained by round 15.
- **Against the Dwarves** is kept although it is neutral on wins (72 of 144
  coarse-matchup games for the other factions with it and without it): it
  moves a balance-acceptance number (Engineers killed: 50 against 37). The
  "punish the surfaced pair" and "dug-in units" items need no code (the exact
  previews carry both).
- **Measured.** Against the generic policy on the Dwarf registration
  (mirrored seats, the same seeds, Dry Land) the Dwarf policy won 50 of 90
  decided games (35 of 60 on 11 x 11, 15 of 30 on 14 x 14). Against each
  faction the Dwarves win 10 to 14 of 24 (Humans 13, Undead 14, Goblins 10,
  Dinosaurs 14, Martians 11, Ice Folk 10): nothing beyond 70/30. The
  coarse balance (`pulp_wars-78i.7`, 40 games per faction) measured 45% to
  60% against every faction, before and after its bomb change
  ([section 19.5](#195-tuning-record)).
- **Not implemented:** a Brass Titan or Steam Tank play of their own (the
  generic Juggernaut and Knight play). The tactical benchmark is unchanged;
  the section 15 scenarios are unit tests in
  `tests/unit/ruleset-v7-dwarf-ai.test.ts`.

## 16. UI requirements

### 16.1 Surfaces

The browser UI (`pulp_wars-78i.6`) must, at requirement level:

- offer "Dwarf" in every seat's faction select, under the one-faction-per-player
  rule once it exists;
- label every unit by its owner's faction, and render the technology tree
  (with the names Dig In and Blasting Charges), research offers, action chips,
  and Help in the viewer's faction text ([section 4](#4-technology));
- **the mound marker:** on every explored tile with a mound, a heaped-earth
  mound with a drill tip; a rider's mound shows a hammer head. It is drawn
  where a unit would be, in the owner's faction look, with the unit's HP
  bar; it is selectable for information ("Burrowed: surfaces at the start of
  {owner}'s next turn; it cannot be attacked") but has no actions and is
  never in the "awaiting orders" cycle. The **eruption ring** (the eight
  tiles) is outlined when the mound is selected or hovered, with "Eruption:
  {n} damage to enemies on the ground here";
- **Tunnel flow:** a Mole command; choosing it highlights every offered
  destination (within 3, never water, a Rift, a unit, a mound, or a center);
  hovering one shows the eruption forecast from `previewTunnelV7` ("If they
  stay: {unit} −{n}") and the Field Defense it will undermine. **The
  passenger comes first** (bead `pulp_wars-78i.9`, replacing the original
  "Take a Hammerer along?" prompt after the destination): when fresh
  Hammerers stand next to the Mole, the best one is seated when Tunnel is
  chosen (tied to the Mole on the board, with a passenger control in the
  dock: each Hammerer and "None"); tapping a Hammerer seats or unseats it.
  Hovering a destination also shows the Mole's ghost there and the seated
  Hammerer's ghost on a default landing next to it ("Hammerer stays behind"
  when none is free); a click chooses the destination, the other landings
  show as dots that move the Hammerer, and a second click (or the dock's
  Tunnel) confirms. With no fresh Hammerer next to the Mole, a click on a
  destination tunnels at once. The tunnel animates as a drill diving into the
  ground and a dirt trail;
- **the surfacing** at the owner's Start Turn: the ground bursts at each
  mound, a dirt ring over the eight tiles, damage numbers on the victims,
  Field Defense collapsing, and log lines;
- **the bombing-run preview:** a Gyrocopter command "Bomb Run"; choosing it
  highlights legal targets within 2 (never one already bombed this turn,
  which shows a small "bombed" mark); choosing a target highlights its legal
  landing tiles beyond it, each with the landing threat ("Lands next to: up to
  {n} damage next turn"); the preview shows "Bomb: {n} damage, no reply" and
  "Kills" when it does, and the blast of an exploding target; a click on a
  landing confirms. The animation is a flight over the target, a falling bomb,
  and the landing;
- **Dig In:** a dug-in unit shows a small earthwork marker at its base (piled
  earth and sandbags; since bead `pulp_wars-78i.9` a low sandbag wall in
  front of its feet rather than a ring, which read as a second ready ring);
  unit info says "Dug in: +1 fortification (it
  has not moved; next to your city)"; a Hammerer or Mole within 1 of an own
  center that has moved shows "Not dug in: it moved this turn" (or "arrived
  this turn"); the attack preview shows "Dug in" next to the fortification;
- **clockwork status:** the Gunner's and the Titan's unit info show a gear
  glyph with "Clockwork: full strength when attacking; only an Engineer can
  repair it"; the Recover action is absent with the reason "Clockwork never
  recovers by itself"; the Gunner shows its shots ("2 shots if it stands
  still", then "1 shot left", "Fired: cannot move");
- **Assemble:** an Engineer command; choosing it highlights the free tiles
  around the Engineer and shows "Assemble a Clockwork Gunner: {cost} Coins,
  slot {used}/{capacity} in {city}"; disabled with the reason (no
  Marksmanship, no slot, not enough Coins, no free tile, no home city). The
  animation is a Gunner wound up with a key and a puff of steam;
- **Repair:** the Engineer's Tend Wounded chip is labelled Repair, with
  "+4 machines, +2 others" and the targets highlighted;
- **Knockback:** the attack preview shows "Knocks back" or "Knockback
  blocked" (no text names a tile; the board's arrow shows where), and the
  animation slides the target back;
- **Plated:** the attack preview shows "Plated: at most 4";
- **Help** in the viewer's faction text ([section 16.3](#163-help-text));
- **city panel:** Dwarf production rows with cost and slots; no Field
  Defense action;
- **log lines** for a tunnel, a surfacing and each eruption victim, a bomb, an
  Assemble, a Repair, a Knockback, and Undermined Field Defense;
- look identical to the previous revision in matches without a Dwarf seat,
  apart from the extra faction option.

### 16.2 Labels and text

| Surface                         | Text                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Faction option                  | Dwarf                                                                                  |
| Mound (unit info)               | Burrowed: surfaces at the start of {owner}'s next turn. It cannot be attacked          |
| Eruption ring                   | Eruption: {n} damage to enemies on the ground here                                     |
| Tunnel command                  | Tunnel                                                                                 |
| Tunnel tooltip                  | Dig up to 3 tiles under anything. Enemies next to the Mole take {n} when it surfaces   |
| Tunnel destination (name)       | Surface next to {units}, erupts for {n}, undermines Field Defense; Surface in the open |
| Tunnel passenger                | {unit}, {hp} of {max} HP, riding; Alone (Tunnel alone); Hammerer stays behind          |
| Tunnel `?` info                 | Damage is a forecast: enemies may move before the Mole surfaces                        |
| Tunnel unavailable              | It surfaced this turn; It moved this turn                                              |
| Rider on its surfacing turn     | Just surfaced: cannot enter a city or village this turn                                |
| Bomb Run command                | Bomb Run                                                                               |
| Bomb Run tooltip                | Fly over an enemy within 2 tiles, bomb it for {n}, and land beyond it. No reply        |
| Bomb preview                    | Bomb: {n} damage, no reply; Kills                                                      |
| Landing hint                    | Lands next to: up to {n} damage next turn                                              |
| Already bombed (target mark)    | Bombed this turn                                                                       |
| Bomb Run unavailable            | No enemy within 2 tiles; Frozen: it cannot bomb this turn                              |
| Dig In (unit info)              | Dug in: +1 fortification (it has not moved; next to your city)                         |
| Not dug in (unit info)          | Not dug in: it moved this turn; Not dug in: arrived this turn                          |
| Attack preview (Dig In)         | Dug in                                                                                 |
| Clockwork (unit info)           | Clockwork: full strength when attacking; only an Engineer can repair it                |
| Recover unavailable (construct) | Clockwork never recovers by itself                                                     |
| Gunner shots                    | 2 shots if it stands still; 1 shot left; Fired: cannot move                            |
| Assemble command                | Assemble                                                                               |
| Assemble tooltip                | Build a Clockwork Gunner next to the Engineer: {cost} Coins, uses a slot in {city}     |
| Assemble unavailable            | Needs Marksmanship; {city} is full; Not enough Coins; No free tile; No home city       |
| Repair command                  | Repair                                                                                 |
| Repair tooltip                  | Heal adjacent units: +4 machines, +2 others. Cures Plague, bites, and frost            |
| Attack preview (Knockback)      | Knocks back; Knockback blocked                                                         |
| Attack preview (Plated)         | Plated: at most 4                                                                      |
| Attack preview (Blasting)       | Ignores fortification                                                                  |
| Field Defense unavailable       | Dwarves dig in instead of building Field Defense                                       |
| Log (tunnel)                    | {owner} Steam Mole tunnelled (with a Hammerer)                                         |
| Log (surfacing)                 | {owner} Steam Mole erupted: {n} unit(s) hit                                            |
| Log (bomb)                      | {owner} Gyrocopter bombed a {unit} for {n}                                             |
| Log (Assemble)                  | {owner} Engineer assembled a Clockwork Gunner                                          |
| Log (Undermined)                | Field Defense undermined                                                               |

### 16.3 Help text

One sentence per rule, shown in Help for every viewer:

- **Tunnel:** a Steam Mole digs up to 3 tiles under anything, taking an
  adjacent Hammerer with it; both wait as mounds everyone can see and nobody
  can touch.
- **Eruption:** at the start of the Dwarves' next turn the Mole bursts up and
  every enemy on the ground next to it takes 2 (3 with Blasting Charges), and
  Field Defense around it collapses.
- **Surfacing:** a Hammerer that rode the tunnel cannot step into a city or
  village on the turn it surfaces, and the Mole cannot tunnel again that turn.
- **Bomb Run:** a Gyrocopter flies over an enemy within 2 tiles, bombs it for
  4 (5 with Dive), and lands beyond it; nothing hits back, and no unit is
  bombed twice in a turn.
- **Clockwork:** Clockwork Gunners and Brass Titans hit at full strength until
  they break, never recover by themselves, and are immune to Plague, bites,
  Wail, and Mind Control.
- **Twin shot:** a Clockwork Gunner that has not moved shoots twice; after it
  fires it cannot move.
- **Dig In:** a Hammerer or Steam Mole that has not moved this turn, on or
  next to its own city center, fights as if on Field Defense.
- **Repair:** an Engineer heals adjacent machines by 4 and other units by 2.
- **Assemble:** an Engineer builds a Clockwork Gunner next to itself for 4
  Coins, using a slot in its home city.
- **Knockback:** a Steam Cannon's shot knocks a surviving target one tile
  straight back.
- **Plated:** no single hit takes more than 4 HP from a Steam Tank.
- **Blasting Charges:** eruptions deal 3, and Steam Cannon shots ignore Walls
  and Field Defense.

### 16.4 What the art bead must draw

`pulp_wars-78i.5` makes the art direction fragment and the production art
under the PixelLab workflow of the project instructions; this contract lists
what must exist and the binding colour rules of root decision 8. The fragment
is written from [the faction template](../art/factions/FACTION_TEMPLATE.md)
under the shared [art direction](../art/ART_DIRECTION.md) and the
[chibi direction](../art/CHIBI_ART_DIRECTION.md). **Faction looks replace the
coloured base plates** (epic `pulp_wars-w5j`): every Dwarf piece is
registered with fixed colours, no owner area and no mask, and the look alone
must say "Dwarf" at 32 px. Until the art exists, a Dwarf unit draws the Human
sprite of its role with a Dwarf badge, and the markers below are code-drawn.

**Look (binding, root decision 8).**

- **Materials, not a hue:** short, broad dwarves with **beards wider than
  their shoulders**, round goggles, and dark leather aprons; machines of
  **soot-black iron**, riveted plates, exposed gears, white-faced gauges, and
  **copper** pipes and boilers; every machine has a smokestack with a
  **white steam** puff.
- **A light rim on every iron mass:** a 1-px copper or warm-grey highlight on
  the lit edge, so iron separates from the black outline (bare soot iron
  `#2b2a28` is only 1.46 : 1 against the outline). The darkest iron is lifted
  to L\* 22–25 (for example `#3a3835`, L\* 23.6), not to the gunmetal
  mid-tone (3 from the Goblin `#47545b`).
- **Copper stays bright:** at least ΔE 15 (CIE76) from the Goblin leather
  `#955627` and never rust-dark (`#8c4a2a` is 4 from the Goblin rust and is
  banned). The second draft's reference copper `#b87333` is **14** from that
  leather and fails the rule; use about `#c27c3a` (17 from the leather, 22
  from the rust, 38 from the Dinosaur orange, 35 from the Coral plate) or
  brighter ([section 20.2](#202-precise-readings-of-the-decisions)).
- **Ginger-copper beards** (about `#c8642a`: 27 from the Coral plate, 29 from
  the Dinosaur orange, 21 from the Goblin leather), the faction's de facto
  hue. Never white beards (the Undead bone and the Ice fur).
- **Dark leather** about `#4a3426`; **steam white** about `#f2f2ee` only for
  puffs and gauge faces, never a body colour (11 from the Martian chrome).
- **No brass** (6 from the Gold plate) and **no other accent**, unless the
  lineup below fails a pair.
- **The 32 px lineup, before any batch:** in colour **and in greyscale**,
  side by side at native size: the Hammerer against the Necromancer, the
  Lich, and the Vampire (the Undead casters); the Steam Tank against the
  Goblin Scrap Buggy; the Steam Cannon against the Goblin Rocket Cart; the
  Gyrocopter against the Martian Saucer. **If any pair is confused,** add the
  reserve **signal-green gauge lamp** (`#2bd94a`, 2 to 4 px, on every Dwarf
  machine), measured again against all four player colours and every faction
  accent (it was at least ΔE 54 from each). The lineup sheet and its verdict
  are review evidence of the bead.

**Pieces.**

| Piece                                                   | Design intent in one line                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hammerer (unit, portrait)                               | A broad dwarf, beard wider than the shoulders, horned iron helm, a two-handed piston hammer: the plain soldier, never a black blob.                                                                                                                                 |
| Gyrocopter (unit, portrait)                             | A goggled dwarf under a two-blade rotor, bomb rack under the seat, tail stack; open frame, nothing like the Saucer's disc.                                                                                                                                          |
| Clockwork Gunner (unit, portrait)                       | A round black-iron automaton with a copper boiler belly, a gatling arm, and a big **wind-up key** on its back: no dwarf inside.                                                                                                                                     |
| Steam Mole (unit, portrait)                             | A squat riveted tub on tracks with a huge drill nose and a stack.                                                                                                                                                                                                   |
| Engineer (unit, portrait)                               | Beard, goggles pushed up, a wrench longer than the dwarf, a tool apron, a cog under one arm: the unit to find and kill.                                                                                                                                             |
| Steam Cannon (unit, portrait)                           | A short fat barrel on an iron carriage with two dwarf gunners and a stack; closed iron, not the Rocket Cart's open frame.                                                                                                                                           |
| Steam Tank (unit, portrait)                             | A black riveted dome on wheels, cannon snout, big stack; closed and domed, not the Scrap Buggy's open rusty frame.                                                                                                                                                  |
| Brass Titan (unit, portrait)                            | A tall copper-and-iron golem with a furnace chest and a **wind-up key**; the name stays, the art has no brass.                                                                                                                                                      |
| Mound (two variants)                                    | Heaped dark earth with a drill tip breaking through; the rider's variant shows a hammer head beside it. Drawn on every terrain and on Snow.                                                                                                                         |
| Patrol Boat, Battleship, transport, two portraits       | Dwarf naval units: a riveted iron steam launch with a copper boiler and stack; an ironclad with turrets; a steam barge with cargo under tarps. The same canvases, classes, anchors, and waterline as the shared hulls ([naval factions](../art/NAVAL_FACTIONS.md)). |
| Cities (village, city, capital, with and without Walls) | Stone halls cut into a hillside with iron doors, chimneys with steam, and copper roofs, growing by level; Walls of riveted iron and stone.                                                                                                                          |
| Faction emblem and badge                                | A hammer crossed with a cog, for the faction select, the leaderboard, and the fallback badge.                                                                                                                                                                       |
| Technology icons                                        | Dig In (a shovel in a ring of earth) and Blasting Charges (a copper-cased drill charge, not a Goblin firework).                                                                                                                                                     |
| Command icons                                           | Tunnel (a drill), Bomb Run (a bomb under a rotor), Assemble (a wind-up key and a cog), Repair (a wrench).                                                                                                                                                           |
| Dig In marker                                           | A low wall of piled earth and sandbags at the unit's base: "this unit is dug in". Must read on Grass, Forest, Mountain, Snow, and a center.                                                                                                                         |
| Clockwork glyph                                         | A small gear on the unit info and the HP bar end: "this unit is clockwork".                                                                                                                                                                                         |
| Effects                                                 | Tunnel (drill diving in, dirt trail); eruption (ground bursting, dirt ring over eight tiles); bomb (a falling bomb and a puff); Assemble (a key turning, steam); Repair (wrench sparks); Knockback (a slide and a puff); Undermined Field Defense (collapsing).     |

The art bead generates a small sample per class, inspects every result at
native and enlarged size, runs the 32 px lineup before batching, and only then
batches. The mound and the Dig In marker are reviewed on every terrain and on
Snow, because they are drawn over all of them.

## 17. Unchanged behaviour of the other factions

A match without a Dwarf seat behaves identically to the previous identity
apart from identity. For equal setups, seeds, and command sequences it
produces the same maps, legal commands, previews, accepted and rejected
commands, events, and views. The only differences are the ruleset ID, the
autosave key, the obsolete-key list, the command ordinals after `COLD_SNAP`
and the event ordinals after the inserted kinds, the empty `burrowed`,
`surfacedThisTurn`, and `bombedThisTurn` lists of the state and the view, the
three neutral preview fields, and the absent `dwarf` stat block. No unit is
burrowed, no tile is a mound, no new command is offered or accepted, every
role has `construct` false, and the per-unit living test returns exactly what
the per-owner test returned.

In mixed matches each unit applies its own registration: every other
faction's units keep every ability against the Dwarves, with the rulings of
[section 13](#13-interactions-with-existing-rules).

## 18. Implementation split and test expectations

Each bead proves its part with deterministic tests (new tests live in
`tests/unit/ruleset-v7-dwarf-*.test.ts` unless noted).

**`pulp_wars-78i.3`: identity, registration, every shape and every rule.**

- **First step, before any number is coded:** re-run the scratch analysis of
  [section 12](#12-per-unit-battle-analysis) on the registry current at that
  time, and report to the root every per-unit verdict that flips.
- **Three helper refactors first, each alone and behaviour-neutral,** with
  pinned decision and state hashes of existing matches unchanged after each:
  1. `isLivingUnitV7` with every caller of `isLivingOwnerV7` moved onto it;
  2. `boardUnitsV7` / `allOwnedUnitsV7` with **the reader-classification
     test** of [section 5.2](#52-burrowed-units-state-and-the-one-accessor)
     (a checked-in table of every `state.units` and `view.units` reader and
     its class, failing on an unclassified reader), before `burrowed` exists;
  3. `tileOccupiedV7`, the one occupancy predicate, with every placement rule
     (Move end, advance, Push, Charge!, Tractor Beam, Beam Down, landing,
     rewards and displacement, treasure units, risings, Raise Dead, Eggs) moved
     onto it.
- **Identity:** the exact `7rNN`; the previous identity rejected in setups,
  states, saves, and replays; gap-free prior list; save key and obsolete-key
  cleanup; faction and tree orders, binding, display name; registry assertion
  with seven trees; faction-independent maps with Dwarf seats; the three
  command kinds and four event kinds at the stated positions.
- **Roster:** every value of the [section 3](#3-dwarf-roster) table as
  registry values; one starting Hammerer; Militia one Hammerer; reward Titan;
  treasure Gyrocopter with a free slot and the 5-Coin fallback; Disband
  refunds; Muster roles; no Field Defense, Rally, Overrun; per-viewer
  technology names and unlock text; every row of the
  [section 4](#4-technology) audit that names a Dwarf effect.
- **Tunnel:** every legality row of [section 5.1](#51-the-tunnel-command)
  (path length, water and unexplored tiles on the way, under a Mountain
  without Engineering, under a Rift, never ending on a Rift, a center, a unit,
  a mound, a chest, allied territory, or a Mountain without Engineering; the
  rider's adjacency, freshness, and tile; a sluggish Mole and rider allowed; a
  Mole or a rider that surfaced this turn refused); the result records,
  reveals, and events; the siege ending.
- **The mound:** untouchable by each listed ability (an attack, a bomb,
  splash, Pierce, Sweep, Kaboom, a blast, Wail, Plague spread, Bolas, Cold
  Snap, Cold Aura, Mind Control, Tractor Beam, Push, Knockback); each
  placement kind refused on a mound tile; passing over it in a Move; the
  interruption by a hidden mound (`MOUND`); every command naming a burrowed
  unit refused (`UNIT_ALREADY_HANDLED`); capacity, orphaning on capture, and
  elimination with burrowed units; status entries kept and the Chill countdown
  at End Turn; state parsing rejections; the view list for a viewer that has
  and has not explored the tile.
- **Surfacing:** its place in the Start Turn order (after the Shield recharge,
  before Plague); the Start Turn activation and `captureEligible` false;
  `surfacedThisTurn` set and emptied at End Turn; the eruption on each kind of
  neighbour (hostile foot, walker, Thrall, Egg; never a flyer, a boat, an
  embarked unit, an own or allied unit); 2 and 3 with Blasting Charges;
  Armoured, Plated, and Shields; simultaneity; kill credit, Graves, a Bitten
  rising, a Brain's collapse, a destroyed Egg; a death-blast chain hitting the
  Mole and the rider, with Plunder; Field Defense undermined on the nine tiles
  whoever owns it; the rider's refused center (Move and advance) and the
  Mole's allowed one; the Mole's refused tunnel; two Moles surfacing in
  unit-ID order; Plague damage on a surfaced Plagued unit.
- **Bomb Run:** every legality row of
  [section 6.2](#62-the-bomb-run-command) (range 1 and 2, the "beyond" landing
  in each direction, a landing on water with self-launch, on a Rift, on a
  chest refused, `ALREADY_BOMBED` across two Gyrocopters, a sluggish
  Gyrocopter, targets in every form); the fixed damage with Dive, Armoured,
  Plated, and a Shield; no retaliation; no Field Defense destruction; kill
  credit; the blast of a killed exploding target hitting the Gyrocopter;
  `bombedThisTurn` cleared at End Turn and on death; `ATTACK` refused for a
  Gyrocopter and its retaliation at range 1.
- **Clockwork:** Unflinching on attack only (and not in retaliation); the
  living test for Wail, Plague, Bitten, Infect, Graves; Mind Control
  `TARGET_IMMUNE`; no Recover, idle recovery, or Windmill healing; Repair and
  Promotion heal; the Gunner's two shots unmoved, one moved, no Move after a
  shot, no advance, a sluggish Gunner, a landed Gunner.
- **Dig In:** from `moved` on its owner's and on enemy turns; the center and
  the eight tiles only, whatever the territory; never with Field Defense
  (max, not sum); with Walls (3); not for units created this turn; for a
  surfaced unit that stands still; the advance setting `moved` for a Hammerer
  and a Mole (and for no other unit); Push, pull, and Knockback keeping the
  flag on a new tile; ignored by Charge!, Acid, the Disintegrator, Boulders,
  and a Blasting Cannon; kept by Wallbreaker; the preview's `dugIn`.
- **Engineer:** Repair 4 and 2 with every Tend Wounded target rule and the
  cures; every legality row of [section 9.2](#92-assemble) (Marksmanship, a
  full home city, an orphaned Engineer, Coins, Arms Industry at 3, each tile
  condition, a sluggish Engineer, once per turn); the Gunner's record, home,
  exhausted activation, and reveal; no city action spent; a besieged home city
  allowed.
- **Cannon, Tank, Titan:** Knockback in each of the eight directions, each
  blocked case (edge, unit, mound, center, terrain, water kind, allied
  territory, chest, `JUGGERNAUT`, two-slot, Egg), off a Walled center, and
  the target's Dig In on its new tile; Blasting Charges ignoring Walls, Field
  Defense, and Dig In for damage and retaliation; Plated capping each damage
  source in the list of [section 10.2](#102-steam-tank-plated) and the Shatter
  test after it; no Overrun; the Titan's Push and construct rules.
- **Interactions:** each row of [section 13](#13-interactions-with-existing-rules).
- **Previews and queries:** each preview equal to its resolution (the tunnel
  forecast equal to the eruption when nothing moves); offered commands equal
  to accepted ones; the `dwarf` stat block; threatened tiles with mound rings
  and bombing reach.
- **Showcase** with a Dwarf seat (the turn-1 Tunnel, Assemble, and Cannon
  shot with its blocked Knockback; the dug-in Hammerer). **Persistence:**
  save, replay, and hash round-trip with a non-empty `burrowed` list (a Mole
  alone, and a Mole with its rider), `surfacedThisTurn`, and `bombedThisTurn`;
  projection of the four new events to a viewer that sees both ends, one end,
  and neither.
- **Parity** of matches without a Dwarf seat with the previous identity apart
  from identity and neutral fields; headless Normal matches with Dwarf seats
  finishing without policy errors; refreshed release corpus with reviewed
  diff (`npm run validate:ruleset7-release` and its reviewed refresh).

**`pulp_wars-78i.4`: Normal AI.** The behaviours of
[section 15](#15-normal-ai-requirements) with
`tests/unit/ruleset-v7-dwarf-ai*.test.ts` scenarios (its benchmark list, plus
the research order and the gated first-of-role biases); determinism and
command bounds; headless matches of the Dwarves against all six factions in
both seat orders without stalls or policy errors; pinned decision hashes of
matches without a Dwarf seat unchanged; the **head-to-head or win-tendency
test** for the Dwarf policy as a whole and for each "against" rule, with its
seeds and results in the bead; the **optional expansion-tunnel rule** of
[section 15](#15-normal-ai-requirements) (Mole rule 5) implemented behind a
switch and head-to-head tested against the policy without it (same seeds,
mirrored seats, a few dozen decided games), kept only if it tends to win,
with the result and the decision recorded in the bead either way; sample
metrics of every ability; the
public-planning benchmarks with the `TUNNEL` and `BOMB_RUN` command lists (the
tunnel's destination-times-rider offers are the largest new command list).

**`pulp_wars-78i.5`: art direction and production art.** The pieces of
[section 16.4](#164-what-the-art-bead-must-draw), under the PixelLab workflow
of the project instructions: the faction fragment first, the colour rules of
root decision 8, a small sample per class, every result reviewed at native and
enlarged size, **the 32 px colour and greyscale lineup before batching** (and
the signal-green lamp only if a pair fails), then the batch, including the
Dwarf naval units. Validation profile `asset-only` with the matching
`art:*review` command.

**`pulp_wars-78i.6`: UI.** [Section 16](#16-ui-requirements) surfaces,
labels, and Help; the mound marker and the eruption ring; the tunnel flow with
the rider prompt; the surfacing effect; the bombing-run preview with landing
threat; Dig In, clockwork, and shot status; Assemble and Repair; Knockback and
Plated in the attack preview; Dig In and Blasting Charges in the tree; the
wired art and the badge fallback; start and finish a match as and against the
Dwarves in the browser; screens of matches without a Dwarf seat unchanged; a
browser smoke probe that sees a mound, tunnels with a rider, sees an eruption,
bombs, assembles, repairs, sees a dug-in unit, and knocks a unit back (the
Showcase makes all of them reachable in the first turns).

**`pulp_wars-78i.7`: coarse balance.** The matrix and telemetry of
[section 19.2](#192-measurement), the acceptance of
[section 19.4](#194-balance-acceptance), any tuning inside
[section 19.3](#193-tuning-bounds) with this contract, the code, and the
tests changed together, a tuning record added to this document, and a short
written report (`docs/validation/RULESET_7_DWARF_BALANCE.md`).

`pulp_wars-78i.3` changes the identity and therefore refreshes the release
corpus. No UI offers the faction until `pulp_wars-78i.6`. `pulp_wars-78i.8`
folds this overlay into the current rules with the full release gates.

## 19. Headless support, measurement, tuning bounds, and balance acceptance

### 19.1 Headless support

- The headless CLI and the balance matrix accept `dwarf` in `--factions` and
  the pairing letter `W`, on every map type including `showcase`.
- Headless metrics count the three new commands in `commandsByKind` and the
  four new events like any other kind.

### 19.2 Measurement

The project's balance policy (the user, 2026-10-02): until the user says it
is time to fine-tune, balance work uses **Dry Land maps only, small samples,
no high-powered win-rate statistics, and no per-matchup band chasing**. The
goal is to remove gross imbalances (worse than about 70 to 30) and blind
spots (a faction powerless against one mechanic, a dead or a dominant unit).

- **Pairings,** Normal against Normal, Rival, Dry Land, sizes 11 and 14,
  both seat orders, about 20 to 40 decided games per opponent, 150 rounds:
  `WH`, `HW`, `WU`, `UW`, `WG`, `GW`, `WD`, `DW`, `WM`, `MW`, `WI`, `IW`. No
  `WW` (one faction per player). One four-seat mix on 16 × 16 as a smoke
  check, not a measurement.
- **Dwarf telemetry** per game and seat, from a replay of the accepted command
  log:
  - units trained (and assembled) by role, the round of the first unit of each
    role, the round each technology was researched, units owned at each End
    Turn (all-units), used slots and capacity; cities owned at rounds 10, 15,
    and 20;
  - kills and losses by role and cause; the share of the seat's kills by role;
  - **tunnels:** count, by job (defence, offence), with and without a rider,
    destination distance; turns burrowed; **eruptions:** victims per
    eruption, damage, kills, Field Defense undermined, **Shield HP absorbed**,
    **Egg damage and Eggs destroyed**; surfaced Moles and riders lost in the
    following enemy turn;
  - **bombing runs:** count, per Gyrocopter and per seat-game, damage, kills,
    targets by role, **Shield HP absorbed**, Gyrocopters lost in the following
    enemy turn (kills per loss, against the Saucer's 0.64), runs refused by
    the AI for landing threat;
  - **Gunner:** shots per Gunner-turn (0, 1, 2), moved and unmoved; Gunners
    assembled against trained;
  - **Assemble:** count per seat-game, the round, the Engineer's distance to
    the nearest visible hostile unit (**Assemble at the front**), Engineers
    lost within two turns of an Assemble;
  - **Repair:** HP repaired on constructs, on other machines, and on others;
  - **Dig In:** attacks on dug-in units, **damage prevented by Dig In** (the
    preview without the level minus the actual), dug-in units killed;
  - **Knockback:** pushes, blocked pushes, centers emptied; **Plated:**
    damage prevented;
  - turns at the 128-command cap; **the round-cap rate** of the Dwarf
    pairings against the others in the same run.
- **Against the Dwarves,** per opposing seat: Engineers killed and in which
  round; units it lost to eruptions and bombs; mounds it stood next to with a
  unit at or below the eruption damage.
- **The scripted rider probe (root decision 9).** The AI tunnels for
  expansion at most through an optional rule, so the matrix may not see the
  rider village race as a human plays it. A headless
  probe plays a Dwarf seat whose policy is the Dwarf policy plus one scripted
  human-style rule for rounds 1 to 15: research Drill first; train a Mole at
  the first chance; whenever a Mole and an adjacent fresh Hammerer exist and a
  neutral village lies 4 to 8 tiles from the Hammerer, tunnel with the rider
  to the offered destination whose rider tile is nearest that village, then
  walk the rider in and capture. Same seeds against a Human seat, compared
  with the plain Dwarf policy and with the Human seat's own Raider captures:
  villages captured by riders in rounds 1 to 15, the capture rounds, cities at
  round 15, and the decided result. A gain of more than about one city at
  round 15 over the plain policy, or of a turn over the Raider's capture
  round, is reported to the root with the next lever.

### 19.3 Tuning bounds

`pulp_wars-78i.7` may move these numbers within the listed bounds without
root approval, changing this contract, the code, and the tests together and
justifying each change in its report. Anything outside the bounds, any number
of another faction, and any mechanic change needs root approval.

| Parameter                                       | Contract value     | Bounds                      |
| ----------------------------------------------- | ------------------ | --------------------------- |
| Hammerer HP / Defense / cost                    | 12 / 2 / 2         | 11–13 / 1.5–2 / fixed       |
| Gyrocopter HP / cost                            | 8 / 4              | 7–10 / 3–5                  |
| Bomb / with Dive (tuned: 5 / 6)                 | 4 / 5              | 3–5 / bomb + 1              |
| Clockwork Gunner HP / cost                      | 10 / 3             | 9–12 / 3–4                  |
| Steam Mole HP / Attack / Defense / cost         | 16 / 2 / 2.5 / 5   | 14–18 / 2–2.5 / 2–2.5 / 4–6 |
| Eruption / with Blasting Charges                | 2 / 3              | 1–2 / eruption + 1          |
| Tunnel range                                    | 3                  | 2–3                         |
| Engineer HP / cost                              | 10 / 5             | 10–12 / 4–6                 |
| Repair on machines                              | 4                  | 3–4                         |
| Assemble cost                                   | 4                  | 4–5                         |
| Steam Tank HP / Plated cap / cost               | 16 / 4 / 9         | 14–18 / 4–6 / 8–10          |
| Brass Titan HP / Attack / Defense               | 36 / 4 / 3         | 32–40 / 3.5–4 / 2.5–3.5     |
| Militia Hammerers                               | 1                  | 1 or 2                      |
| Other Attack and Defense values of the roster   | section 3          | ±0.5 each                   |
| Dig In level; Dig In radius; Move values; slots | 1; 1; section 3; 1 | fixed                       |

Two constraints on every combination: **a Dive bomb is the bomb plus 1**, and
**the eruption with Blasting Charges never exceeds 3** (the second draft's
reason for a small eruption: at 3 everywhere it already leaves a Goblin or an
Egg at 3, so that any hit kills it; above 3 a mound would deny its eight tiles
to every cheap unit before the eruption happens).

Named levers. `pulp_wars-78i.7` may propose them with evidence; each needs
root approval before it is applied. In the order the decisions name them:

| Lever               | Contract                                                                 | Alternative                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rider brake         | a rider cannot enter a settlement center on its surfacing turn (adopted) | extend it to the Mole; or a rider cannot capture on the turn after it surfaces either                                                                                                             |
| Assemble cost       | 4 Coins                                                                  | 5 Coins (inside the bounds, but named by the decisions as the lever for Assemble at the front)                                                                                                    |
| Dig In              | Hammerers and Moles                                                      | Moles only (if the round-cap rate is high)                                                                                                                                                        |
| Plated              | 4                                                                        | 5 or 6 (inside the bounds; named if the Tank proves dominant)                                                                                                                                     |
| The bomb            | flat 4 / 5                                                               | the damage formula with Dive only, still once per target (stronger on soft targets: Catapult 9, Captain 8)                                                                                        |
| Slow expansion      | Mole 5 Coins, Hammerer 2 Coins                                           | numbers only (root ruling 4): Mole cost 4 (inside the bounds), a Hammerer cost change (outside the bounds, needs approval); AI behaviour is the AI bead's, and Gyrocopter capture is out of scope |
| Eruption and flyers | flyers are never hit                                                     | none planned                                                                                                                                                                                      |

### 19.4 Balance acceptance

Coarse, on Dry Land:

- **No gross imbalance:** in decided games the Dwarves win between about 30%
  and 70% against each faction separately (`WH` + `HW`, `WU` + `UW`, `WG` +
  `GW`, `WD` + `DW`, `WM` + `MW`, `WI` + `IW`). With about 20 to 40 decided
  games per opponent the report states the counts and does not chase a band
  inside that range.
- **No stalls, policy errors, or exceptions,** and the round-cap rate of the
  Dwarf pairings is not clearly above that of the others in the same run
  (**Dig In round caps**, root decision 9).
- **No blind spot.** The report answers each with a number: does every
  opposing faction kill Engineers (in at least half of the seat-games in which
  one was fielded) and take a Dwarf city in some games? Do Shields, Snow and
  the Witch, Goblin packs, Cavemen and Raptors, Walls, and ranged armies each
  lose some fights to the Dwarves and win some? Is there a pairing in which
  eruptions or bombs never kill anything?
- **Every roster unit is produced and every ability is used:**

  | Unit or ability          | Threshold                                                                                                          |
  | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
  | Gyrocopter               | trained in at least half of Dwarf seat-games; a bombing run in at least half of those                              |
  | Steam Mole               | trained in at least half of seat-games; a tunnel in at least half of those; an eruption that hits in half of those |
  | Clockwork Gunner         | trained or assembled in at least half of the seat-games with Marksmanship; two shots in a turn seen                |
  | Engineer                 | trained in at least half of the seat-games with Administration; a Repair or an Assemble in at least half of those  |
  | Ride                     | a tunnel with a rider in at least a quarter of the seat-games with a Mole                                          |
  | Dig In                   | damage prevented in at least half of the seat-games in which a Dwarf city was attacked                             |
  | Steam Cannon, Steam Tank | trained in at least half of the seat-games with their technology; otherwise reported (tier 3)                      |
  | Brass Titan              | reported (reward only)                                                                                             |

- **No unit is dominant.** Watch bands; outside one the report explains and
  proposes: no role other than the Hammerer makes more than 40% of the
  seat's kills; the decided win rate with and without a Steam Tank fielded
  differs by less than about 25 percentage points; Gyrocopter kills per loss
  stay above about 0.3 (below it the unit is dead, not just weak).
- **The root's watch items** (decision 9) are reported one by one:
  **Martians** (Shield HP absorbed from eruptions and bombs, Gyrocopter kills
  per loss against Martians) as the likely worst pairing; **Dinosaurs** (Egg
  damage and losses, cities at round 15) as the likely best; **Dig In round
  caps**; **the rider village race** (the scripted probe of
  [section 19.2](#192-measurement)); and **Assemble at the front** (Assembles
  per seat-game, the share of Gunners assembled, Engineers lost after an
  Assemble). From this document also: cities at round 15 (the expansion weak
  spot) and the Steam Tank.
- **The pairings without a Dwarf seat** have byte-identical final state
  hashes to a pre-tuning run of the same seeds under the same identity.

If the gameplay fails these, `pulp_wars-78i.7` iterates within
[section 19.3](#193-tuning-bounds) and the Dwarf-only Normal AI, and asks the
root before going outside the bounds. Fine tuning, the other map types, and
the water layer wait for the user.

### 19.5 Tuning record

`pulp_wars-78i.7` (identity `pulp-wars-poc-7r31`; a coarse Dry Land pass by
the balance-testing policy, 40 games per opponent, 20 per seat order; fine
tuning is deferred by the user). Evidence:
[Dwarf balance report](../validation/RULESET_7_DWARF_BALANCE.md).

| Parameter      | Contract | Chosen    | Why                                                                                                                                                                                                                                                                                              |
| -------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bomb           | 4        | **5**     | No pairing was grossly off (the Dwarves won 45-57% against every faction), but the Gyrocopter was below the "dead" watch band: 23 kills for 94 losses (0.24 kills per loss, band 0.3), 1% of the Dwarf kills. At 5 it scores 0.32 (31 kills, 39 lost after a bomb); win rates do not move (52%). |
| Bomb with Dive | 5        | **6**     | The bounds' constraint: the Dive bomb is the bomb plus 1.                                                                                                                                                                                                                                        |
| Every other    | —        | unchanged | Screened without a reason to change: Gyrocopter HP 10 (more Gyrocopters, 0.27 kills per loss, 52%). The eruption is already at its upper bound (2, 3 with Blasting Charges).                                                                                                                     |

The eruption that almost never kills, the Engineers that are killed in fewer
than half of the seat-games, and the Mind Control query defect found on the
way are proposals to the root in section 7 of the report (a rule, an AI, and
an engine change: none is a number inside the bounds).

## 20. Decisions made in this spec

### 20.1 Deviations from the root decisions

**No decided number is changed** by this contract (the coarse balance later
raised the bomb to 5 and 6: [section 19.5](#195-tuning-record)). Every roster value, the bomb of 4 and 5,
the eruption of 2 and 3, the tunnel range of 3, the Gunner at 3 Coins with
its shots, Repair 4 and 2, Assemble at 4 Coins, Plated 4, and the Titan's 36,
4, and 3 are the root's. The engine formula, re-validated on `main` at
`d8ed16d`, found no unit dead or dominant with them
([section 12.12](#1212-the-roots-decisions-checked)); the two nearest the
edges are the Gyrocopter (weakest per Coin, kept as the scout and finisher the
decision describes) and the Steam Tank (four hits from anything, kept at tier
3 with the Plated lever).

### 20.2 Precise readings of the decisions

These narrow, extend, or correct an input; the root may overrule any of them.

1. **Dig In and newly arrived units** (decision 3, "computed from the moved
   flag"). The second critique said a freshly trained Hammerer is dug in at
   once. Under the decided rule it is not: trained, reward, and treasure
   units have the exhausted activation, whose `moved` is true, until their
   owner's next Start Turn. Emergency training under threat therefore does
   not dig in on the enemy turn that follows; a surfaced unit, which gets the
   fresh activation, does.
2. **The advance counts as moving** (the critique's open ruling). The engine
   does not set `moved` on an advance today; for a Hammerer or a Mole it now
   does. No other unit's advance changes, so no other rule (Overrun, a
   sluggish unit's chain) is affected.
3. **Dig In is "within 1 of an own city center", whatever the tile's
   territory** (decision 3, "an own city center and the 8 tiles around it").
   A ring tile that belongs to another city's footprint still counts; it
   lives in the Field Defense part of the fortification, so it never stacks
   with Field Defense and Wallbreaker keeps it.
4. **A third list, `surfacedThisTurn`** (decision 4 names `burrowed` and
   `bombedThisTurn` only). The two surfacing-turn rules (no tunnel for the
   Mole, no settlement center for the rider) need to know who surfaced this
   turn; nothing in the existing state records it.
5. **The rider brake covers only foreign and neutral centers and the advance
   too** (decision 4, "may not enter a settlement center"). Its own center
   gives nothing to capture, so it is allowed; an advance onto a foreign
   center after a kill is refused like a Move (the Sabretooth precedent).
   The Mole is not braked: alone it captures at the Raider's pace
   ([section 5.5](#55-the-rider)); extending the brake to it is a named
   lever.
6. **The Gunner never advances** (not in the decisions). An advance after a
   first shot would let it fire its second shot from a new tile, reopening
   the gap that "a Gunner that has fired cannot move" closes.
7. **The Gyrocopter has no `ATTACK` ability; retaliation reads `BOMB_RUN`
   too** (the decisions say "no ordinary attack" and "it retaliates"). One
   reader is widened instead of gating every reader of `ATTACK`.
8. **Copper is lifted to about `#c27c3a`** (decision 8 and critique change 7:
   copper at least 15 from the Goblin leather). The second draft's `#b87333`
   is 14 from `#955627`, so the decided rule rejects the decided swatch; the
   rule wins. The darkest iron is lifted to about `#3a3835` (L\* 23.6) by the
   same change.
9. **Earlier exchange numbers used a "Knight with Charge"** (+1 Attack). The
   Knight has no Charge in the registry; every Knight number here is the plain
   Knight's (it deals a Hammerer 8, 7 dug in).

### 20.3 Other decisions

Each fills a gap with the simplest rule consistent with the engine; the root
may change any of them.

10. **Faction ID `DWARF`, display name "Dwarf"** (singular like Goblin,
    Dinosaur, and Martian), tree `DWARF_BASELINE_V1`, headless `dwarf`,
    pairing letter **`W`** (`D` is the Dinosaur's).
11. **Command and event positions:** the three commands after `COLD_SNAP`;
    `UNIT_ASSEMBLED` after `UNIT_TRAINED`, `UNIT_TUNNELLED` and
    `UNIT_SURFACED` after `UNIT_PULLED`, `UNIT_BOMBED` after `COMBAT_RESOLVED`.
12. **The bombing run is not a `MOVE`:** one event with `from` and `to`, sight
    revealed from the landing only, no chest taken, so no flight path is
    chosen or validated beyond reachability.
13. **Bombs target any form** (land, flyer, Egg, embarked, naval); eruptions
    hit only units on the ground (decision 4).
14. **The Gyrocopter lands first, then the bomb falls,** so it is in the
    blast of an exploding target it kills (the design's Goblin ruling).
15. **A bomb destroys no Field Defense** and inflicts no Plague, Bite, Infect,
    or Shatter; the Blizzard never halves it.
16. **Field Defense undermining covers the Mole's own tile and the eight
    around it** (the design said "the eight tiles"; the Mole's own tile would
    otherwise keep an enemy's Field Defense under the Mole).
17. **Plated caps every instance of damage,** Plague included, after Armoured
    and before a Shield.
18. **Repair keeps the `TEND_WOUNDED` command and ability** with a role
    mechanic for the machine amount, and cures Chill like Tend Wounded.
19. **Assemble is not blocked by a siege of the home city** (nothing appears
    there) and destroys hostile Field Defense on its tile (the Beam Down
    precedent).
20. **Muster counts units on the board** (a burrowed unit is not), the Egg
    precedent; the leaderboard counts all owned units.
21. **`eruptionDamage` and `bombDamage` are public** on visible Dwarf units,
    revealing Blasting Charges and Raiding (the Ice Folk precedent for the
    Shatter threshold), so opponents' previews are exact.
22. **Substitutions:** one starting Hammerer, a Militia of one Hammerer, the
    Brass Titan as the level-5 reward, and the Gyrocopter as the treasure unit
    (the `RAIDER` role, like the Raptor, the Saucer, and the Sled).
23. **Coarse balance uses about 20 to 40 decided games per opponent on Dry
    Land,** with no mirror pairing.

### 20.4 Questions for the root

The four questions raised by this contract (rider brake scope,
`surfacedThisTurn`, the copper lift, and expansion under the AI) were
answered by the root; the answers are in
[section 20.5](#205-root-rulings).

### 20.5 Root rulings

The root ruled on the questions of section 20.4 on 2026-10-03. The rules text
above already follows these rulings.

1. **Rider brake scope** (reading 5) is confirmed as written: the rider may
   not end a Move or advance on a neutral village or a city center its owner
   does not own on its surfacing turn; its own centers are allowed; the Mole
   is not braked.
2. **`surfacedThisTurn`** (reading 4) is accepted as a third stored list.
3. **Copper is lifted to about `#c27c3a`** (reading 8); the rule "copper at
   least ΔE 15 from the Goblin leather `#955627`" is kept.
4. **"The AI tunnels for expansion" is not a balance lever.** The balance
   bead (`pulp_wars-78i.7`) changes numbers only; its levers for slow
   expansion are numbers (Mole cost 4, a Hammerer cost change), and
   Gyrocopter capture is out of scope. The rule **is allowed in the Dwarf AI
   bead** (`pulp_wars-78i.4`) as an optional rule, kept only if a
   head-to-head test shows it tends to win
   ([section 15](#15-normal-ai-requirements), Mole rule 5, and
   [section 18](#18-implementation-split-and-test-expectations)).

In addition, the one-faction-per-player rule of `pulp_wars-w5j.1` lands on
`main` as `pulp-wars-poc-7r29` (`DUPLICATE_FACTION`, with the test-only
`allowDuplicateFactions` option) before the Dwarf engine bead, which adds
`DWARF` to its distinct-faction defaults and option lists
([section 13.14](#1314-one-faction-per-player)).

## 21. Concerns

1. **The off-board list is fragile, not expensive.** About 227 reads of
   `state.units` and 367 of `view.units`: a reader that should include
   burrowed units and does not is a desync or a wrong count (capacity,
   elimination, the certificate). The classification test is the guard; it
   must land before `burrowed` does.
2. **The occupancy predicate must be the only one.** Every placement rule
   asks "is the tile free" in its own words today; one that forgets mounds
   puts a unit on a mound, which the state parser then rejects as a crash.
3. **Expansion.** No Dwarf unit captures faster than Move 1 except the 5-Coin
   Mole, the Gyrocopter cannot capture, and the AI tunnels for expansion
   only if its optional rule wins its head-to-head test. The Ice Folk lost balance by expanding too fast; the Dwarves
   may by expanding too slowly. Cities at round 15 are the first number to
   read.
4. **Martians.** Shields absorb a whole eruption of 2 and half of every bomb,
   and recharge every turn; Saucers and rays kill landed Gyrocopters. The
   answers (Blasting Charges at tier 3, an eruption before a bomb in the same
   turn) are narrow. This is the pairing most likely to leave 70 to 30.
5. **The Gyrocopter is the weakest unit per Coin.** If the AI's landing-threat
   rule makes it refuse most runs, it becomes a 4-Coin scout. Watch kills per
   loss and runs per seat-game; the named lever is the formula bomb with Dive.
6. **The faction leans on its AI.** A Mole that never tunnels, Gyrocopters that
   land between two Fighters, Gunners that walk instead of firing twice, or
   Engineers that stay home make it play like Humans without Field Defense.
   None of those rules is how the policy plays another faction.
7. **Dig In may turtle.** It is Field Defense for free on nine tiles per city;
   an AI attacker rejects harmful attacks, so a dug-in line may stall Normal
   matches. The round-cap rate is the watch; the lever is Moles only.
8. **The tunnel's command list is large.** About 48 destinations times (1 + up
   to 8 rider tiles per adjacent Hammerer) per Mole: the public-planning
   benchmarks must cover it, and the AI should evaluate destinations before
   enumerating rider tiles.
9. **The eruption forecast is not exact.** The tunnel preview shows the
   eruption on the current board; the targets move before it happens. The UI
   must say so, and the AI must not count it as damage dealt.
10. **Two Start Turn chains.** An eruption that kills an exploding unit starts
    a chain before Plague can start another; both use the same machinery, and
    the event order of [section 5.4](#54-surfacing-and-the-eruption) must be
    pinned by a test.
11. **Fixture churn.** The identity, three command kinds, four event kinds,
    three state lists, and the preview fields change nearly every pinned hash
    and the release corpus, right after the Ice Folk, the Rift, and the
    one-faction-per-player rule did the same.
12. **The art carries ownership.** Without base plates, a Steam Tank that
    reads as a Scrap Buggy or a Hammerer that reads as a Necromancer at 32 px
    is a rules problem (whose unit is it?), not only a look problem. The
    lineup is mandatory before batching.
13. **The numbers were computed against a registry that will move.** The
    one-faction-per-player bead and any tuning before `pulp_wars-78i.3` may
    change other factions' numbers; the analysis must be re-run first
    ([section 18](#18-implementation-split-and-test-expectations)).

## 22. Implementation notes (`pulp_wars-78i.3`)

### 22.1 The re-run before coding (section 18, first step)

The scratch analysis of [section 12](#12-per-unit-battle-analysis) was re-run
on the registry of commit `c6478ac` (`pulp-wars-poc-7r29`, the
one-faction-per-player identity) before any Dwarf number was coded. Every
regenerated output (the duel tables, the scenario and worked-example tables,
and the per-unit tables) is byte-identical to the one this document was
written from: **no per-unit verdict flips, and no Dwarf number was
changed.** The formula check against `calculateCombatPreviewV7` again
compares 12,480 exchanges; its 274 mismatches are the Vampire attacks of
[section 12.1](#121-method) (the script lets a defender answer unless told
otherwise), as before.

### 22.2 Order of the work and parity

The three helper refactors of [section 18](#18-implementation-split-and-test-expectations)
landed first, each behaviour-neutral: `isLivingUnitV7` (every caller of the
per-owner test moved onto it), `boardUnitsV7` and `allOwnedUnitsV7` in
`src/engine/v7/units.ts` with the reader-classification test (the table
`tests/fixtures/v7-unit-reader-classes.ts`, generated from a TypeScript
syntax scan of every `<expression>.units` reader in `src` and enforced by
`tests/unit/ruleset-v7-dwarf-unit-readers.test.ts`, before `burrowed`
existed), and `tileOccupiedV7` with every placement rule moved onto it.

Parity is proved step by step: 48 Normal-vs-Normal matches (24 setups over
every other faction, with mirrors through `allowDuplicateFactions`, the
Showcase, and two to four seats, two seeds each; 31,706 accepted commands at `c6478ac`, 31,277 at `e3bca91`)
hash, after every step, the command with its events and state, every
player's view, and the commands offered to the next active player. With the
identity, the three empty Dwarf lists, and the three `false` combat-preview
fields normalised away, every hash equals the base's: before the Dwarf
rules (base `c6478ac`), after them, and again after the final rebase (base
`e3bca91`).

### 22.3 Deviations and precise readings

1. **"Territory allied to the actor"** (a tunnel tile, a rider tile, an
   Assemble tile) reads as the Beam Down rule does: territory of a
   cooperative partner. A Mole may tunnel into its own territory, and an
   Engineer may Assemble there.
2. **The hidden mound.** `UNIT_MOVE_INTERRUPTED` with reason `MOUND` names
   the mound tile where the Move met it (the `SNOW`, `ZOC`, and
   `SETTLEMENT_FORBIDDEN` precedent); the mover stays on the last tile it
   entered on which it may end.
3. **`unflinchingApplied`** is true for every `ATTACK` by a land-form
   construct, at full HP too (its force reads its maximum HP).
4. **Projection.** `UNIT_TUNNELLED` reaches every viewer that has explored
   one of its four tiles, the others null (`ProjectedUnitTunnelledV7`); a
   viewer that owns an eruption victim but cannot see the mound receives
   `UNIT_SURFACED` with its own entries and `unitId`, `at`, and the rider
   null (`ProjectedUnitSurfacedV7`); the owner of a bombed unit who sees
   neither the Gyrocopter's start nor its landing receives the hit as a
   `COMBAT_SPLASH_DAMAGE` entry; `UNIT_ASSEMBLED` is owner-private, like
   `UNIT_TRAINED`.
5. **The `dwarf` stat block** carries the owner's `eruptionDamage` and
   `bombDamage` for every Dwarf unit (public: they tell Blasting Charges and
   Dive), `tunnelRange` 0 for every role but the Mole, and `shotsLeft` (a
   Gunner only) as the shots it may still fire this turn on its owner's
   turn and, on another player's turn, on its owner's next turn if it does
   not move.
6. **`landingThreat`** of a bombing-run preview is the sum, over every
   visible hostile unit whose threatened tiles (`queryThreatenedTilesV7`)
   include the landing, of one full-strength hit on the Gyrocopter there (a
   hostile Gyrocopter's public bomb), capped at the Gyrocopter's HP.
7. **Infect** (a Zombie's kill rising) gains only the construct exclusion;
   its existing victim rule is otherwise unchanged.
8. **Setup.** `DWARF` joins every list the one-faction-per-player rule keeps
   (registration order, so the distinct defaults reach it only as a
   seventh seat; the headless `--factions` value `dwarf`; setup validation)
   **except the browser setup select**, which offers it from the UI bead
   (`pulp_wars-78i.6`): until then no browser match has a Dwarf seat.
9. **Telemetry windows.** "Surfaced units lost" and "Gyrocopters lost after
   a bomb" count deaths before their owner's next Start Turn.
10. **Not done here:** the release corpus refresh
    (`npm run validate:ruleset7-release` and its reviewed refresh) is left to
    the root's release gate.

## 23. UI implementation notes (`pulp_wars-78i.6`)

The surfaces, labels, and Help of [section 16](#16-ui-requirements) are
implemented as the
[Screen Flow Dwarf overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-dwarf-overlay)
describes, with the production art of `pulp_wars-78i.5` wired in
([DWARF.md](../art/factions/DWARF.md#wired-in-bead-pulp_wars-78i6)).
Precise readings:

1. **A mound is selectable for information** by selecting its tile: the
   tile's dock and the cursor describe it (owner, unit, HP, "Burrowed: ...",
   and a Mole's "Eruption: ..."), and the Mole's eruption ring is outlined.
   No command, target, or orders-cycle entry ever names it.
2. **The rider prompt** opens when the chosen destination has an offered
   ride; with more than one fresh Hammerer next to the Mole, the dock offers
   a choice of rider. "Tunnel alone" sends the rider-less command. (Since
   bead `pulp_wars-b5f.8` no text names a tile: the riders are portrait
   buttons, "Hammerer, 12 of 12 HP, riding", and "Alone"; see
   [SCREEN_FLOW](../ui/SCREEN_FLOW.md#no-coordinates-minimal-text-bead-pulp_wars-b5f8).)
3. **Unavailable texts** beyond section 16.2: a Mole with no destination
   says "No free tile within 3"; a Gyrocopter that moved (not Frozen) says
   "It moved this turn"; the Assemble reasons name the home city ("Your
   Capital is full").
4. **Repair's preview** needed one engine correction: `previewTendWoundedV7`
   previewed 2 for every target, while the reducer heals a machine by the
   Engineer's `repairMachineHeal` (4); the preview now equals the
   resolution (section 14, "every preview equals the resolution").
5. **Calm board cues:** the eruption leaves out its timeline's 1 px shakes;
   Tunnel destinations are labelled only where they would erupt; rider and
   Assemble tiles carry no labels; the shooter's attack lines show on the
   focused target only.
6. **The smoke probe** launches a Showcase as Dwarves (the keyboard's "D"
   typeahead passes Dinosaur, so that seat moves to the freed Human),
   tunnels the Steam Mole from the dock with its forecast, and resumes with
   the mound. The rest of the section 18 list (an eruption, a bomb, an
   Assemble, a Repair, a dug-in unit, a Knockback) is exercised by the DOM
   tests and the UI review (`npm run review:ruleset7-dwarf-ui`).
